/**
 * NeuroLink OAuth Token Store
 *
 * Secure storage for OAuth tokens with encoding support and multi-provider capability.
 * Stores tokens in the user's home directory with restrictive permissions.
 *
 * Features:
 * - Multi-provider token storage in a single tokens.json file
 * - Secure file storage with 0o600 permissions
 * - Token expiration checking with configurable buffer
 * - Simple XOR-based obfuscation (not encryption, but not plaintext)
 * - Automatic token refresh via configurable refresher functions
 * - Cross-platform support (Unix/macOS/Windows)
 */

import { promises as fs } from "fs";
import { join } from "path";
import { homedir } from "os";
import { createHash } from "crypto";
import { logger } from "../utils/logger.js";
import { TokenStoreError } from "../types/errors.js";

// Re-export for backward compatibility
export { TokenStoreError } from "../types/errors.js";

const { readFile, writeFile, mkdir, unlink, access, chmod, rename } = fs;

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

/**
 * OAuth tokens structure for storage.
 * Stricter version of OAuthTokens from subscriptionTypes with required fields.
 */
export interface StoredOAuthTokens {
  /** The access token for API authentication */
  accessToken: string;
  /** The refresh token for obtaining new access tokens (optional for some OAuth flows) */
  refreshToken?: string;
  /** Unix timestamp (ms) when the access token expires */
  expiresAt: number;
  /** Token type, typically "Bearer" */
  tokenType: string;
  /** Optional OAuth scopes granted */
  scope?: string;
}

/**
 * @deprecated Use StoredOAuthTokens instead
 */
export type OAuthTokens = StoredOAuthTokens;

/**
 * Token refresher function type
 * Takes a refresh token and returns new tokens
 */
export type TokenRefresher = (
  refreshToken: string,
) => Promise<StoredOAuthTokens>;

/**
 * Internal storage format for multi-provider tokens
 */
interface TokenStorageData {
  /** Version of the storage format */
  version: string;
  /** Last modified timestamp */
  lastModified: number;
  /** Tokens indexed by provider name */
  providers: Record<string, StoredProviderTokens>;
}

/**
 * Per-provider token storage structure
 */
interface StoredProviderTokens {
  /** The stored tokens */
  tokens: StoredOAuthTokens;
  /** When the tokens were stored */
  createdAt: number;
  /** When the tokens were last accessed */
  lastAccessed: number;
}

// =============================================================================
// TOKEN STORE CLASS
// =============================================================================

/**
 * Secure token storage for OAuth tokens with multi-provider support
 *
 * Provides persistent storage for OAuth tokens with:
 * - Multi-provider support in a single file
 * - Secure file permissions (0o600)
 * - Optional obfuscation/encoding
 * - Token expiration checking with buffer
 * - Automatic token refresh via configurable refreshers
 *
 * @example
 * ```typescript
 * const store = new TokenStore();
 *
 * // Save tokens for a provider
 * await store.saveTokens("anthropic", {
 *   accessToken: "sk-...",
 *   refreshToken: "rt-...",
 *   expiresAt: Date.now() + 3600000,
 *   tokenType: "Bearer",
 * });
 *
 * // Set up automatic refresh
 * store.setTokenRefresher("anthropic", async (refreshToken) => {
 *   // Call OAuth refresh endpoint
 *   return newTokens;
 * });
 *
 * // Get a valid token (auto-refreshes if needed)
 * const token = await store.getValidToken("anthropic");
 * ```
 */
export class TokenStore {
  private static readonly STORAGE_VERSION = "2.0";
  private static readonly NEUROLINK_DIR = ".neurolink";
  private static readonly TOKEN_FILE = "tokens.json";
  private static readonly FILE_PERMISSIONS = 0o600;
  private static readonly DIR_PERMISSIONS = 0o700;
  /** Default expiration buffer: 5 minutes */
  private static readonly DEFAULT_EXPIRY_BUFFER_MS = 5 * 60 * 1000;

  private readonly storagePath: string;
  private readonly encryptionEnabled: boolean;
  private readonly encryptionKey: string;
  private readonly tokenRefreshers: Map<string, TokenRefresher> = new Map();

  /**
   * Creates a new TokenStore instance
   *
   * @param options - Configuration options
   * @param options.encryptionEnabled - Whether to enable token obfuscation (default: true)
   * @param options.customStoragePath - Override the default storage path
   */
  constructor(
    options: {
      encryptionEnabled?: boolean;
      customStoragePath?: string;
    } = {},
  ) {
    const { encryptionEnabled = true, customStoragePath } = options;

    this.encryptionEnabled = encryptionEnabled;
    this.encryptionKey = this.deriveEncryptionKey();

    if (customStoragePath) {
      this.storagePath = customStoragePath;
    } else {
      this.storagePath = join(
        homedir(),
        TokenStore.NEUROLINK_DIR,
        TokenStore.TOKEN_FILE,
      );
    }
  }

  // ===========================================================================
  // PUBLIC METHODS
  // ===========================================================================

  /**
   * Gets the path where tokens are stored
   *
   * @returns The absolute path to the token storage file
   */
  getStoragePath(): string {
    return this.storagePath;
  }

  /**
   * Saves OAuth tokens for a specific provider
   *
   * @param provider - The provider name (e.g., "anthropic", "openai")
   * @param tokens - The OAuth tokens to save
   * @throws TokenStoreError if storage fails
   */
  async saveTokens(provider: string, tokens: StoredOAuthTokens): Promise<void> {
    // Validate tokens before saving
    this.validateTokens(tokens);

    const storageDir = join(this.storagePath, "..");
    await this.ensureDirectory(storageDir);

    // Load existing data or create new
    let storageData: TokenStorageData;
    try {
      storageData = await this.loadStorageData();
    } catch (error) {
      if (error instanceof TokenStoreError && error.code === "NOT_FOUND") {
        // Create new storage structure
        storageData = {
          version: TokenStore.STORAGE_VERSION,
          lastModified: Date.now(),
          providers: {},
        };
      } else {
        throw error;
      }
    }

    // Update provider tokens
    storageData.providers[provider] = {
      tokens,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
    };
    storageData.lastModified = Date.now();

    try {
      const content = this.encryptionEnabled
        ? this.obfuscate(JSON.stringify(storageData))
        : JSON.stringify(storageData, null, 2);

      // Write to temporary file first for atomic operation
      const tempPath = `${this.storagePath}.tmp`;
      await writeFile(tempPath, content, "utf-8");

      // Set restrictive permissions before moving to final location
      await chmod(tempPath, TokenStore.FILE_PERMISSIONS);

      // Rename to final location (atomic on most filesystems)
      await fs.rename(tempPath, this.storagePath);

      logger.debug("OAuth tokens saved successfully", {
        provider,
        path: this.storagePath,
        encrypted: this.encryptionEnabled,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error("Failed to save OAuth tokens", {
        provider,
        error: errorMessage,
      });
      throw new TokenStoreError(
        `Failed to save tokens for ${provider}: ${errorMessage}`,
        "STORAGE_ERROR",
      );
    }
  }

  /**
   * Loads stored OAuth tokens for a specific provider
   *
   * @param provider - The provider name (e.g., "anthropic", "openai")
   * @returns The stored tokens, or null if not found
   * @throws TokenStoreError if reading fails (other than file not found)
   */
  async loadTokens(provider: string): Promise<StoredOAuthTokens | null> {
    try {
      const storageData = await this.loadStorageData();
      const providerData = storageData.providers[provider];

      if (!providerData) {
        logger.debug("No stored tokens found for provider", { provider });
        return null;
      }

      // Update last accessed time
      providerData.lastAccessed = Date.now();
      await this.saveStorageData(storageData);

      logger.debug("OAuth tokens retrieved successfully", {
        provider,
        expiresAt: new Date(providerData.tokens.expiresAt).toISOString(),
        isExpired: this.isTokenExpired(providerData.tokens),
      });

      return providerData.tokens;
    } catch (error) {
      if (error instanceof TokenStoreError && error.code === "NOT_FOUND") {
        return null;
      }
      throw error;
    }
  }

  /**
   * Clears stored tokens for a specific provider
   *
   * @param provider - The provider name (e.g., "anthropic", "openai")
   * @throws TokenStoreError if deletion fails
   */
  async clearTokens(provider: string): Promise<void> {
    try {
      const storageData = await this.loadStorageData();

      if (!storageData.providers[provider]) {
        logger.debug("No tokens to clear for provider", { provider });
        return;
      }

      delete storageData.providers[provider];
      storageData.lastModified = Date.now();

      // If no more providers, delete the file entirely
      if (Object.keys(storageData.providers).length === 0) {
        await this.deleteStorageFile();
      } else {
        await this.saveStorageData(storageData);
      }

      logger.info("OAuth tokens cleared successfully", { provider });
    } catch (error) {
      if (error instanceof TokenStoreError && error.code === "NOT_FOUND") {
        logger.debug("No tokens to clear for provider", { provider });
        return;
      }
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error("Failed to clear OAuth tokens", {
        provider,
        error: errorMessage,
      });
      throw new TokenStoreError(
        `Failed to clear tokens for ${provider}: ${errorMessage}`,
        "STORAGE_ERROR",
      );
    }
  }

  /**
   * Checks if the given tokens are expired
   *
   * @param tokens - The OAuth tokens to check
   * @param bufferMs - Buffer time in milliseconds before actual expiration (default: 5 minutes)
   * @returns true if token is expired or will expire within buffer time
   */
  isTokenExpired(
    tokens: StoredOAuthTokens,
    bufferMs: number = TokenStore.DEFAULT_EXPIRY_BUFFER_MS,
  ): boolean {
    const now = Date.now();
    return tokens.expiresAt - bufferMs <= now;
  }

  /**
   * Gets a valid access token for a provider, refreshing if needed
   *
   * If the stored token is expired or about to expire, and a refresher
   * function has been set, it will automatically refresh the token.
   *
   * @param provider - The provider name (e.g., "anthropic", "openai")
   * @returns The valid access token, or null if not available
   * @throws TokenStoreError if refresh fails
   */
  async getValidToken(provider: string): Promise<string | null> {
    const tokens = await this.loadTokens(provider);

    if (!tokens) {
      logger.debug("No tokens found for provider", { provider });
      return null;
    }

    // Check if token is expired or about to expire
    if (this.isTokenExpired(tokens)) {
      logger.debug("Token expired or expiring soon", {
        provider,
        expiresAt: new Date(tokens.expiresAt).toISOString(),
      });

      // Try to refresh if a refresher is configured
      const refresher = this.tokenRefreshers.get(provider);
      if (refresher && tokens.refreshToken) {
        try {
          logger.info("Refreshing expired token", { provider });
          const newTokens = await refresher(tokens.refreshToken);

          // Save the new tokens
          await this.saveTokens(provider, newTokens);

          logger.info("Token refreshed successfully", { provider });
          return newTokens.accessToken;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          logger.error("Failed to refresh token", {
            provider,
            error: errorMessage,
          });
          throw new TokenStoreError(
            `Failed to refresh token for ${provider}: ${errorMessage}`,
            "REFRESH_ERROR",
          );
        }
      } else {
        logger.debug("No refresher configured or no refresh token available", {
          provider,
          hasRefresher: !!refresher,
          hasRefreshToken: !!tokens.refreshToken,
        });
        return null;
      }
    }

    return tokens.accessToken;
  }

  /**
   * Sets the token refresher function for a provider
   *
   * The refresher function will be called automatically when getValidToken
   * detects that the stored token is expired or about to expire.
   *
   * @param provider - The provider name (e.g., "anthropic", "openai")
   * @param refresher - Function that takes a refresh token and returns new tokens
   */
  setTokenRefresher(provider: string, refresher: TokenRefresher): void {
    this.tokenRefreshers.set(provider, refresher);
    logger.debug("Token refresher set for provider", { provider });
  }

  /**
   * Removes the token refresher function for a provider
   *
   * @param provider - The provider name (e.g., "anthropic", "openai")
   */
  clearTokenRefresher(provider: string): void {
    this.tokenRefreshers.delete(provider);
    logger.debug("Token refresher cleared for provider", { provider });
  }

  /**
   * Checks if tokens exist for a specific provider
   *
   * @param provider - The provider name (e.g., "anthropic", "openai")
   * @returns true if tokens are stored for the provider
   */
  async hasTokens(provider: string): Promise<boolean> {
    try {
      const tokens = await this.loadTokens(provider);
      return tokens !== null;
    } catch {
      return false;
    }
  }

  /**
   * Lists all providers that have stored tokens
   *
   * @returns Array of provider names
   */
  async listProviders(): Promise<string[]> {
    try {
      const storageData = await this.loadStorageData();
      return Object.keys(storageData.providers);
    } catch (error) {
      if (error instanceof TokenStoreError && error.code === "NOT_FOUND") {
        return [];
      }
      throw error;
    }
  }

  /**
   * Clears all stored tokens for all providers
   *
   * @throws TokenStoreError if deletion fails
   */
  async clearAllTokens(): Promise<void> {
    await this.deleteStorageFile();
    logger.info("All OAuth tokens cleared");
  }

  // ===========================================================================
  // PRIVATE HELPER METHODS
  // ===========================================================================

  /**
   * Loads the storage data from file
   */
  private async loadStorageData(): Promise<TokenStorageData> {
    try {
      await access(this.storagePath);
    } catch {
      // File doesn't exist, return empty storage
      throw new TokenStoreError("Token storage file not found", "NOT_FOUND");
    }

    try {
      const content = await readFile(this.storagePath, "utf-8");

      let storageData: TokenStorageData;

      if (this.encryptionEnabled) {
        const decrypted = this.deobfuscate(content);
        storageData = JSON.parse(decrypted);
      } else {
        storageData = JSON.parse(content);
      }

      // Validate storage data structure
      if (!storageData.providers || !storageData.version) {
        throw new TokenStoreError(
          "Invalid token storage format",
          "VALIDATION_ERROR",
        );
      }

      return storageData;
    } catch (error) {
      if (error instanceof TokenStoreError) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error("Failed to read token storage", { error: errorMessage });
      throw new TokenStoreError(
        `Failed to read token storage: ${errorMessage}`,
        "STORAGE_ERROR",
      );
    }
  }

  /**
   * Saves storage data to file
   */
  private async saveStorageData(data: TokenStorageData): Promise<void> {
    try {
      const content = this.encryptionEnabled
        ? this.obfuscate(JSON.stringify(data))
        : JSON.stringify(data, null, 2);

      const tmpPath = `${this.storagePath}.tmp`;
      await writeFile(tmpPath, content, "utf-8");
      await chmod(tmpPath, TokenStore.FILE_PERMISSIONS);
      await rename(tmpPath, this.storagePath);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new TokenStoreError(
        `Failed to save token storage: ${errorMessage}`,
        "STORAGE_ERROR",
      );
    }
  }

  /**
   * Deletes the storage file
   */
  private async deleteStorageFile(): Promise<void> {
    try {
      await access(this.storagePath);
      await unlink(this.storagePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        // File doesn't exist, nothing to delete
        return;
      }
      throw error;
    }
  }

  /**
   * Validates token structure
   */
  private validateTokens(tokens: StoredOAuthTokens): void {
    if (!tokens.accessToken || typeof tokens.accessToken !== "string") {
      throw new TokenStoreError(
        "Invalid access token: must be a non-empty string",
        "VALIDATION_ERROR",
      );
    }
    if (
      tokens.refreshToken !== undefined &&
      typeof tokens.refreshToken !== "string"
    ) {
      throw new TokenStoreError(
        "Invalid refresh token: must be a string when provided",
        "VALIDATION_ERROR",
      );
    }
    if (typeof tokens.expiresAt !== "number" || tokens.expiresAt <= 0) {
      throw new TokenStoreError(
        "Invalid expiresAt: must be a positive number",
        "VALIDATION_ERROR",
      );
    }
    if (!tokens.tokenType || typeof tokens.tokenType !== "string") {
      throw new TokenStoreError(
        "Invalid token type: must be a non-empty string",
        "VALIDATION_ERROR",
      );
    }
  }

  /**
   * Ensures the storage directory exists with proper permissions
   */
  private async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await mkdir(dirPath, {
        recursive: true,
        mode: TokenStore.DIR_PERMISSIONS,
      });
    } catch {
      // Directory might already exist, try to set permissions
      try {
        await chmod(dirPath, TokenStore.DIR_PERMISSIONS);
      } catch {
        // Ignore permission errors on existing directories
      }
    }
  }

  /**
   * Derives an encoding key from machine-specific information
   * This provides basic obfuscation - for production use, consider
   * using proper encryption with a user-provided key or system keychain
   */
  private deriveEncryptionKey(): string {
    const machineInfo = `${homedir()}-neurolink-token-store`;
    return createHash("sha256").update(machineInfo).digest("hex");
  }

  /**
   * Simple XOR-based obfuscation
   * Note: This is NOT cryptographically secure, just basic obfuscation
   * For production use, consider using node:crypto with proper encryption
   */
  private obfuscate(data: string): string {
    const key = this.encryptionKey;
    let result = "";
    for (let i = 0; i < data.length; i++) {
      const charCode = data.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      result += String.fromCharCode(charCode);
    }
    // Encode as base64 for safe storage
    return Buffer.from(result, "binary").toString("base64");
  }

  /**
   * Reverses the XOR obfuscation
   */
  private deobfuscate(data: string): string {
    const key = this.encryptionKey;
    // Decode from base64
    const decoded = Buffer.from(data, "base64").toString("binary");
    let result = "";
    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      result += String.fromCharCode(charCode);
    }
    return result;
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

/**
 * Default token store singleton instance
 * Uses default configuration with encryption enabled
 */
export const tokenStore = new TokenStore();

/**
 * Alias for backward compatibility
 * @deprecated Use tokenStore instead
 */
export const defaultTokenStore = tokenStore;
