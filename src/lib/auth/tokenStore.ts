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
import { TokenStoreError } from "../types/index.js";
import { AsyncMutex } from "../utils/asyncMutex.js";
import type {
  TokenStorageData,
  StoredOAuthTokens,
  TokenRefresher,
} from "../types/index.js";

const { readFile, writeFile, mkdir, unlink, access, chmod, rename } = fs;

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
  /** Default expiration buffer: 1 hour (proactive refresh before actual expiry) */
  private static readonly DEFAULT_EXPIRY_BUFFER_MS = 60 * 60 * 1000;

  private readonly storagePath: string;
  private readonly encryptionEnabled: boolean;
  private readonly encryptionKey: string;
  private readonly tokenRefreshers: Map<string, TokenRefresher> = new Map();
  private readonly inFlightRefreshes = new Map<
    string,
    Promise<StoredOAuthTokens>
  >();
  private readonly _mutex = new AsyncMutex();

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
    return this._mutex.runExclusive(async () => {
      await this._saveTokensInternal(provider, tokens);
    });
  }

  /**
   * Internal save without mutex — callers must already hold the mutex.
   */
  private async _saveTokensInternal(
    provider: string,
    tokens: StoredOAuthTokens,
  ): Promise<void> {
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
      // Use PID-scoped temp file to avoid cross-process race conditions
      const tempPath = `${this.storagePath}.tmp.${process.pid}`;
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
    return this._mutex.runExclusive(async () => {
      return this._loadTokensInternal(provider);
    });
  }

  /**
   * Internal load without mutex — callers must already hold the mutex.
   */
  private async _loadTokensInternal(
    provider: string,
  ): Promise<StoredOAuthTokens | null> {
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
    return this._mutex.runExclusive(async () => {
      // Clear in-memory refresh state so re-adding an account starts fresh
      this.inFlightRefreshes.delete(provider);
      this.tokenRefreshers.delete(provider);
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
    });
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
    // Phase 1: Read token under mutex (fast)
    const snapshot = await this._mutex.runExclusive(async () => {
      const tokens = await this._loadTokensInternal(provider);
      if (!tokens) {
        return null;
      }
      return { ...tokens };
    });

    if (!snapshot) {
      logger.debug("No tokens found for provider", { provider });
      return null;
    }

    // Token is still valid — return immediately
    if (!this.isTokenExpired(snapshot)) {
      return snapshot.accessToken;
    }

    logger.debug("Token expired or expiring soon", {
      provider,
      expiresAt: new Date(snapshot.expiresAt).toISOString(),
    });

    // Phase 2: Refresh OUTSIDE the mutex so other reads are not blocked
    const refresher = this.tokenRefreshers.get(provider);
    if (!refresher || !snapshot.refreshToken) {
      logger.debug("No refresher configured or no refresh token available", {
        provider,
        hasRefresher: !!refresher,
        hasRefreshToken: !!snapshot.refreshToken,
      });
      // No refresher/refresh-token available — fall back to hard expiry check.
      // The proactive buffer only applies when a refresh is possible.
      return this.isTokenExpired(snapshot, 0) ? null : snapshot.accessToken;
    }

    // Deduplicate concurrent refresh calls for the same provider:
    // If a refresh is already in-flight, await it instead of starting another.
    const existing = this.inFlightRefreshes.get(provider);
    if (existing) {
      logger.debug("Awaiting in-flight refresh for provider", { provider });
      const result = await existing;
      return result.accessToken;
    }

    const refreshTokenValue = snapshot.refreshToken;
    const refreshPromise = (async (): Promise<StoredOAuthTokens> => {
      let newTokens: StoredOAuthTokens;
      try {
        logger.info("Refreshing expired token", { provider });
        newTokens = await refresher(refreshTokenValue);
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

      // Phase 3: Write refreshed token under mutex (fast).
      // Re-check that the token is still expired before overwriting —
      // another caller may have already persisted a fresh token.
      // Also guard against resurrecting cleared/disabled entries:
      // if the entry was removed or disabled during the in-flight refresh,
      // skip the save to avoid re-creating a dead entry.
      const persistedTokens = await this._mutex.runExclusive(async () => {
        // Guard: do not resurrect cleared entries
        const current = await this._loadTokensInternal(provider);
        if (!current) {
          logger.debug(
            "Skipping token persist — provider entry was cleared during refresh",
            { provider },
          );
          return newTokens; // return refreshed tokens to caller but don't persist
        }

        // Guard: do not resurrect disabled entries
        try {
          const storageData = await this.loadStorageData();
          const providerData = storageData.providers[provider];
          if (providerData?.disabled) {
            logger.debug(
              "Skipping token persist — provider was disabled during refresh",
              { provider },
            );
            return newTokens;
          }
        } catch {
          // Storage read failure — proceed cautiously
        }

        if (!this.isTokenExpired(current)) {
          // Another caller already persisted a fresh token — use theirs.
          logger.debug(
            "Skipping token persist — another refresh already wrote a valid token",
            { provider },
          );
          return current;
        }
        await this._saveTokensInternal(provider, newTokens);
        return newTokens;
      });

      logger.info("Token refreshed successfully", { provider });
      return persistedTokens;
    })();

    this.inFlightRefreshes.set(provider, refreshPromise);
    try {
      const newTokens = await refreshPromise;
      return newTokens.accessToken;
    } finally {
      this.inFlightRefreshes.delete(provider);
    }
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
   * Lists all provider keys that start with the given prefix
   *
   * @param prefix - The prefix to filter by (e.g., "anthropic:")
   * @returns Array of matching provider keys
   */
  async listByPrefix(prefix: string): Promise<string[]> {
    const allProviders = await this.listProviders();
    return allProviders.filter((key) => key.startsWith(prefix));
  }

  // ===========================================================================
  // DISABLED STATE METHODS
  // ===========================================================================

  /**
   * Marks a provider's tokens as permanently disabled (persisted to disk).
   *
   * Disabled accounts are skipped immediately by consumers — no wasted
   * round-trips. The state survives proxy restarts because it is stored
   * alongside the tokens in the JSON file.
   *
   * @param provider - The provider key (e.g., "anthropic:user@example.com")
   * @param reason - Optional human-readable reason (e.g., "refresh_failed")
   */
  async markDisabled(provider: string, reason?: string): Promise<void> {
    return this._mutex.runExclusive(async () => {
      let storageData: TokenStorageData;
      try {
        storageData = await this.loadStorageData();
      } catch (error) {
        if (error instanceof TokenStoreError && error.code === "NOT_FOUND") {
          logger.debug("No token storage found — nothing to disable", {
            provider,
          });
          return;
        }
        throw error;
      }

      const providerData = storageData.providers[provider];
      if (!providerData) {
        logger.debug("No tokens found for provider — nothing to disable", {
          provider,
        });
        return;
      }

      providerData.disabled = true;
      providerData.disabledAt = Date.now();
      providerData.disabledReason = reason;
      storageData.lastModified = Date.now();

      await this.saveStorageData(storageData);

      logger.info("Provider marked as disabled", {
        provider,
        reason: reason ?? "unspecified",
      });
    });
  }

  /**
   * Re-enables a previously disabled provider (persisted to disk).
   *
   * Clears the disabled flag, timestamp, and reason so the account can
   * be used again by the proxy pool.
   *
   * @param provider - The provider key (e.g., "anthropic:user@example.com")
   */
  async markEnabled(provider: string): Promise<void> {
    return this._mutex.runExclusive(async () => {
      let storageData: TokenStorageData;
      try {
        storageData = await this.loadStorageData();
      } catch (error) {
        if (error instanceof TokenStoreError && error.code === "NOT_FOUND") {
          logger.debug("No token storage found — nothing to enable", {
            provider,
          });
          return;
        }
        throw error;
      }

      const providerData = storageData.providers[provider];
      if (!providerData) {
        logger.debug("No tokens found for provider — nothing to enable", {
          provider,
        });
        return;
      }

      providerData.disabled = false;
      delete providerData.disabledAt;
      delete providerData.disabledReason;
      storageData.lastModified = Date.now();

      await this.saveStorageData(storageData);

      logger.info("Provider re-enabled", { provider });
    });
  }

  /**
   * Checks whether a provider's tokens are currently disabled.
   *
   * Returns false for providers that don't exist in the store (no tokens
   * at all) and for entries that predate the disabled field (backward compat).
   *
   * @param provider - The provider key
   * @returns true if the provider entry exists and is disabled
   */
  async isDisabled(provider: string): Promise<boolean> {
    return this._mutex.runExclusive(async () => {
      try {
        const storageData = await this.loadStorageData();
        const providerData = storageData.providers[provider];
        return providerData?.disabled === true;
      } catch (error) {
        if (error instanceof TokenStoreError && error.code === "NOT_FOUND") {
          return false;
        }
        throw error;
      }
    });
  }

  /**
   * Lists all provider keys that are currently disabled.
   *
   * @returns Array of disabled provider keys (empty if none or no storage file)
   */
  async listDisabled(): Promise<string[]> {
    return this._mutex.runExclusive(async () => {
      try {
        const storageData = await this.loadStorageData();
        return Object.entries(storageData.providers)
          .filter(([, data]) => data.disabled === true)
          .map(([key]) => key);
      } catch (error) {
        if (error instanceof TokenStoreError && error.code === "NOT_FOUND") {
          return [];
        }
        throw error;
      }
    });
  }

  /**
   * Removes expired and unrefreshable token entries from disk.
   *
   * An entry is pruned when:
   *   - Its access token is expired (with optional buffer) AND it has no
   *     refresh token, AND it is NOT manually disabled.
   *
   * Manually disabled entries are preserved so that `auth enable` can
   * re-enable them later. They are only removed via explicit `clearTokens`.
   *
   * @param bufferMs - Extra buffer in milliseconds to subtract from expiresAt
   *                   when checking expiry (default: 0 — strict expiry check)
   * @returns Array of provider keys that were removed
   */
  async pruneExpired(bufferMs: number = 0): Promise<string[]> {
    return this._mutex.runExclusive(async () => {
      let storageData: TokenStorageData;
      try {
        storageData = await this.loadStorageData();
      } catch (error) {
        if (error instanceof TokenStoreError && error.code === "NOT_FOUND") {
          return [];
        }
        throw error;
      }

      const now = Date.now();
      const pruned: string[] = [];

      for (const [key, providerData] of Object.entries(storageData.providers)) {
        const isExpired = providerData.tokens.expiresAt - bufferMs <= now;
        const hasNoRefreshToken = !providerData.tokens.refreshToken;
        const isManuallyDisabled = providerData.disabled === true;

        // Only prune expired+unrefreshable entries that are NOT manually disabled
        if (isExpired && hasNoRefreshToken && !isManuallyDisabled) {
          delete storageData.providers[key];
          pruned.push(key);
        }
      }

      if (pruned.length > 0) {
        storageData.lastModified = Date.now();

        if (Object.keys(storageData.providers).length === 0) {
          await this.deleteStorageFile();
        } else {
          await this.saveStorageData(storageData);
        }

        logger.info("Pruned expired token entries", {
          removed: pruned,
          count: pruned.length,
        });
      }

      return pruned;
    });
  }

  /**
   * Clears all stored tokens for all providers
   *
   * @throws TokenStoreError if deletion fails
   */
  async clearAllTokens(): Promise<void> {
    return this._mutex.runExclusive(async () => {
      // Clear all in-memory refresh state so re-adding accounts starts fresh
      this.inFlightRefreshes.clear();
      this.tokenRefreshers.clear();
      await this.deleteStorageFile();
      logger.info("All OAuth tokens cleared");
    });
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

      // Use PID-scoped temp file to avoid cross-process race conditions
      const tmpPath = `${this.storagePath}.tmp.${process.pid}`;
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
