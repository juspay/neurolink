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
import { createHash, randomUUID } from "crypto";
import { logger } from "../utils/logger.js";
import { TokenStoreError } from "../types/index.js";
import { AsyncMutex } from "../utils/asyncMutex.js";
import { withSpan } from "../telemetry/withSpan.js";
import { tracers } from "../telemetry/tracers.js";
import type {
  TokenStorageData,
  TokenStoreLockOwner,
  StoredOAuthTokens,
  TokenRefresher,
} from "../types/index.js";
import {
  ensurePrivateDirectory,
  writePrivateFileAtomically,
} from "./secureFiles.js";

const { readFile, unlink, access, rename, open, rm, stat } = fs;

/** Marks a store written with the UTF-8-safe codec; older files carry no prefix. */
const OBFUSCATION_V2_PREFIX = "nlts2:";
/** Cross-process lock: how long a writer waits for another process's turn. */
const FILE_LOCK_TIMEOUT_MS = 5_000;
/** A lock older than this whose owner is gone is abandoned and removed. */
const FILE_LOCK_STALE_MS = 30_000;
const FILE_LOCK_RETRY_MS = 25;

function processIsRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
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
  /** Default expiration buffer: 1 hour (proactive refresh before actual expiry) */
  private static readonly DEFAULT_EXPIRY_BUFFER_MS = 60 * 60 * 1000;

  private readonly storagePath: string;
  private readonly encryptionEnabled: boolean;
  private readonly encryptionKey: string;
  private readonly encryptionKeyBytes: Buffer;
  private readonly tokenRefreshers: Map<string, TokenRefresher> = new Map();
  private readonly inFlightRefreshes = new Map<
    string,
    Promise<StoredOAuthTokens>
  >();
  private readonly _mutex = new AsyncMutex();
  private snapshotRead: Promise<TokenStorageData["providers"]> | undefined;

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
    this.encryptionKeyBytes = this.deriveEncryptionKeyBytes();

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
    return withSpan(
      {
        name: "auth.token.save",
        tracer: tracers.auth,
        attributes: {
          "auth.provider": provider,
          "auth.has_refresh_token": Boolean(tokens.refreshToken),
          "auth.token_type": tokens.tokenType,
        },
      },
      async () =>
        this.runExclusiveLocked(async () => {
          await this._saveTokensInternal(provider, tokens);
        }),
    );
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

    await this.ensureDirectory(join(this.storagePath, ".."));

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

    const existingProvider = storageData.providers[provider];
    const now = Date.now();
    // Token rotation must not silently clear an operator-disabled account.
    // Explicit login calls markEnabled() after saving fresh credentials.
    storageData.providers[provider] = {
      tokens,
      createdAt: existingProvider?.createdAt ?? now,
      lastAccessed: now,
      ...(existingProvider?.disabled === true
        ? {
            disabled: true,
            disabledAt: existingProvider.disabledAt,
            disabledReason: existingProvider.disabledReason,
          }
        : {}),
    };
    storageData.lastModified = now;

    try {
      await this.writeStorageFile(storageData);

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
    return withSpan(
      {
        name: "auth.token.load",
        tracer: tracers.auth,
        attributes: { "auth.provider": provider },
      },
      async (span) => {
        const result = await this._mutex.runExclusive(async () => {
          return this._loadTokensInternal(provider);
        });
        span.setAttribute("auth.found", result !== null);
        if (result) {
          span.setAttribute("auth.expired", this.isTokenExpired(result, 0));
        }
        return result;
      },
    );
  }

  /** Reads tokens without updating access metadata or rewriting the store. */
  async peekTokens(provider: string): Promise<StoredOAuthTokens | null> {
    return this._mutex.runExclusive(async () => {
      try {
        const storageData = await this.loadStorageData();
        const tokens = storageData.providers[provider]?.tokens;
        return tokens ? { ...tokens } : null;
      } catch (error) {
        if (error instanceof TokenStoreError && error.code === "NOT_FOUND") {
          return null;
        }
        throw error;
      }
    });
  }

  /**
   * Read one coherent account inventory without updating access timestamps.
   * Concurrent readers share only the in-flight read, never a TTL cache, so
   * the next request observes account edits made by another process. Each
   * caller receives its own copy, including disabled state and credentials.
   */
  async getProviderSnapshot(): Promise<TokenStorageData["providers"]> {
    this.snapshotRead ??= this._mutex
      .runExclusive(async () => {
        try {
          return (await this.loadStorageData()).providers;
        } catch (error) {
          if (error instanceof TokenStoreError && error.code === "NOT_FOUND") {
            return {};
          }
          throw error;
        }
      })
      .finally(() => {
        this.snapshotRead = undefined;
      });
    const providers = await this.snapshotRead;
    return Object.fromEntries(
      Object.entries(providers).map(([key, value]) => [
        key,
        { ...value, tokens: { ...value.tokens } },
      ]),
    );
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

      // Access time is bookkeeping, not state: rewriting the whole store on
      // every read raced other processes' writes (a stale snapshot written late
      // reverted a rotated refresh token or a disable flag).
      providerData.lastAccessed = Date.now();

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
    return withSpan(
      {
        name: "auth.token.clear",
        tracer: tracers.auth,
        attributes: { "auth.provider": provider },
      },
      async () => this._clearTokensImpl(provider),
    );
  }

  private async _clearTokensImpl(provider: string): Promise<void> {
    return this.runExclusiveLocked(async () => {
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
    return withSpan(
      {
        name: "auth.token.get_valid",
        tracer: tracers.auth,
        attributes: { "auth.provider": provider },
      },
      async (span) => this._getValidTokenImpl(provider, span),
    );
  }

  private async _getValidTokenImpl(
    provider: string,
    span: import("@opentelemetry/api").Span,
  ): Promise<string | null> {
    // Phase 1: Read token under mutex (fast)
    const snapshot = await this._mutex.runExclusive(async () => {
      const tokens = await this._loadTokensInternal(provider);
      if (!tokens) {
        return null;
      }
      return { ...tokens };
    });

    if (!snapshot) {
      span.setAttribute("auth.found", false);
      logger.debug("No tokens found for provider", { provider });
      return null;
    }

    span.setAttribute("auth.found", true);

    // Token is still valid — return immediately
    if (!this.isTokenExpired(snapshot)) {
      span.setAttribute("auth.refreshed", false);
      span.setAttribute("auth.expired", false);
      return snapshot.accessToken;
    }

    span.setAttribute("auth.expired", true);

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
      const persistedTokens = await this.runExclusiveLocked(async () => {
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
      span.setAttribute("auth.refreshed", true);
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
   * This operation and saveTokens() share the instance mutex. A concurrent
   * save cannot erase a disable: a later disable wins, while a later save
   * preserves the existing disabled metadata.
   *
   * @param provider - The provider key (e.g., "anthropic:user@example.com")
   * @param reason - Optional human-readable reason (e.g., "refresh_failed")
   */
  async markDisabled(provider: string, reason?: string): Promise<void> {
    return this.runExclusiveLocked(async () => {
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
   * Disables an account only when the persisted credentials still match the
   * request that observed the authentication failure.
   */
  async markDisabledIfCurrent(
    provider: string,
    expectedTokens: Pick<
      StoredOAuthTokens,
      "accessToken" | "refreshToken" | "expiresAt"
    >,
    reason?: string,
  ): Promise<boolean> {
    return this.runExclusiveLocked(async () => {
      let storageData: TokenStorageData;
      try {
        storageData = await this.loadStorageData();
      } catch (error) {
        if (error instanceof TokenStoreError && error.code === "NOT_FOUND") {
          return false;
        }
        throw error;
      }

      const providerData = storageData.providers[provider];
      if (!providerData) {
        return false;
      }
      const current = providerData.tokens;
      if (
        current.accessToken !== expectedTokens.accessToken ||
        current.refreshToken !== expectedTokens.refreshToken ||
        current.expiresAt !== expectedTokens.expiresAt
      ) {
        return false;
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
      return true;
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
    return this.runExclusiveLocked(async () => {
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

  /** Return the persisted disable reason, if the provider is disabled. */
  async getDisabledReason(provider: string): Promise<string | undefined> {
    return this._mutex.runExclusive(async () => {
      try {
        const storageData = await this.loadStorageData();
        const providerData = storageData.providers[provider];
        return providerData?.disabled === true
          ? providerData.disabledReason
          : undefined;
      } catch (error) {
        if (error instanceof TokenStoreError && error.code === "NOT_FOUND") {
          return undefined;
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
    return this.runExclusiveLocked(async () => {
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
    return this.runExclusiveLocked(async () => {
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

    let content: string;
    try {
      content = await readFile(this.storagePath, "utf-8");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error("Failed to read token storage", { error: errorMessage });
      throw new TokenStoreError(
        `Failed to read token storage: ${errorMessage}`,
        "STORAGE_ERROR",
      );
    }

    const storageData = this.encryptionEnabled
      ? this.parseObfuscatedStorage(content)
      : this.parseStorageJson(content);
    if (storageData) {
      return storageData;
    }

    // An unreadable store used to throw from every caller, which took the whole
    // pool offline with no repair path short of deleting the file by hand. Set
    // it aside under a dated name instead: the proxy starts with an empty pool,
    // `auth login` can repopulate it, and the bytes are still there to inspect.
    await this.quarantineStorageFile();
    throw new TokenStoreError("Token storage file not found", "NOT_FOUND");
  }

  /** Parse plain-JSON storage; null when it is not a usable store. */
  private parseStorageJson(content: string): TokenStorageData | null {
    try {
      const parsed = JSON.parse(content) as TokenStorageData;
      if (
        !parsed ||
        typeof parsed !== "object" ||
        !parsed.providers ||
        typeof parsed.providers !== "object" ||
        !parsed.version
      ) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  /**
   * Decode a store written by either codec.
   *
   * The current codec is prefixed and XORs UTF-8 bytes. The older one XORed
   * UTF-16 code units and then truncated each to a byte, so a store holding a
   * single non-Latin-1 character (an emoji in a label, a smart quote in a
   * disable reason) could never be read back. Older files carry no prefix and
   * are read the old way; the next save rewrites them with the new codec.
   */
  private parseObfuscatedStorage(content: string): TokenStorageData | null {
    const trimmed = content.trim();
    if (trimmed.startsWith(OBFUSCATION_V2_PREFIX)) {
      try {
        return this.parseStorageJson(this.deobfuscateV2(trimmed));
      } catch {
        return null;
      }
    }
    try {
      const legacy = this.parseStorageJson(this.deobfuscateLegacy(trimmed));
      if (legacy) {
        return legacy;
      }
    } catch {
      // Fall through to the other codec and the plain-JSON reading.
    }
    try {
      const current = this.parseStorageJson(this.deobfuscateV2(trimmed));
      if (current) {
        return current;
      }
    } catch {
      // Not the current codec either.
    }
    return this.parseStorageJson(trimmed);
  }

  private async quarantineStorageFile(): Promise<void> {
    const quarantinePath = `${this.storagePath}.corrupt-${Date.now()}`;
    try {
      await rename(this.storagePath, quarantinePath);
      logger.error(
        "Token storage could not be parsed and was quarantined; the pool starts empty",
        { path: this.storagePath, quarantinedTo: quarantinePath },
      );
    } catch (error) {
      logger.error("Token storage could not be parsed or quarantined", {
        path: this.storagePath,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Saves storage data to file
   */
  private async saveStorageData(data: TokenStorageData): Promise<void> {
    try {
      await this.writeStorageFile(data);
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
   * Serialize and write the store: owner-only from creation, under an
   * unpredictable temp name, renamed into place. See `secureFiles`.
   */
  private async writeStorageFile(data: TokenStorageData): Promise<void> {
    const content = this.encryptionEnabled
      ? this.obfuscate(JSON.stringify(data))
      : JSON.stringify(data, null, 2);
    await writePrivateFileAtomically(this.storagePath, content);
  }

  /**
   * Take the in-process mutex, then the cross-process file lock, around a
   * read-modify-write. The CLI and a running proxy share one file; without
   * the second lock a stale snapshot written late reverted the other's
   * rotated refresh token or disable flag.
   */
  private runExclusiveLocked<T>(fn: () => Promise<T>): Promise<T> {
    return this._mutex.runExclusive(async () => {
      const release = await this.acquireFileLock();
      try {
        return await fn();
      } finally {
        await release();
      }
    });
  }

  private get lockPath(): string {
    return `${this.storagePath}.lock`;
  }

  private async readLockOwner(): Promise<TokenStoreLockOwner | null> {
    try {
      const parsed = JSON.parse(
        await readFile(this.lockPath, "utf8"),
      ) as Partial<TokenStoreLockOwner>;
      if (
        typeof parsed.pid !== "number" ||
        typeof parsed.token !== "string" ||
        typeof parsed.acquiredAt !== "number"
      ) {
        return null;
      }
      return {
        pid: parsed.pid,
        token: parsed.token,
        acquiredAt: parsed.acquiredAt,
      };
    } catch {
      return null;
    }
  }

  private async removeAbandonedLock(): Promise<boolean> {
    const owner = await this.readLockOwner();
    try {
      const lockStat = await stat(this.lockPath);
      const oldEnough = Date.now() - lockStat.mtimeMs >= FILE_LOCK_STALE_MS;
      const ownerRunning = owner ? processIsRunning(owner.pid) : false;
      if ((owner && !ownerRunning) || oldEnough) {
        await rm(this.lockPath, { force: true });
        return true;
      }
      return false;
    } catch (error) {
      return (error as NodeJS.ErrnoException).code === "ENOENT";
    }
  }

  /**
   * Best-effort cross-process lock. When another process holds it past the
   * timeout the write proceeds anyway with a warning: a stuck lock must not
   * take the pool offline, which is worse than the race it guards against.
   */
  private async acquireFileLock(): Promise<() => Promise<void>> {
    await ensurePrivateDirectory(join(this.storagePath, ".."));
    const deadline = Date.now() + FILE_LOCK_TIMEOUT_MS;
    for (;;) {
      const owner: TokenStoreLockOwner = {
        pid: process.pid,
        token: randomUUID(),
        acquiredAt: Date.now(),
      };
      let handle: Awaited<ReturnType<typeof open>> | undefined;
      try {
        handle = await open(this.lockPath, "wx", TokenStore.FILE_PERMISSIONS);
        await handle.writeFile(JSON.stringify(owner));
        const acquired = handle;
        return async () => {
          await acquired.close().catch(() => undefined);
          const current = await this.readLockOwner();
          if (current?.token === owner.token) {
            await rm(this.lockPath, { force: true }).catch(() => undefined);
          }
        };
      } catch (error) {
        if (handle) {
          await handle.close().catch(() => undefined);
          await rm(this.lockPath, { force: true }).catch(() => undefined);
        }
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
          logger.debug("Token store lock unavailable; proceeding unlocked", {
            error: error instanceof Error ? error.message : String(error),
          });
          return async () => undefined;
        }
      }
      if (await this.removeAbandonedLock()) {
        continue;
      }
      if (Date.now() >= deadline) {
        logger.warn(
          "Token store lock held by another process past the timeout; proceeding unlocked",
          { lockPath: this.lockPath },
        );
        return async () => undefined;
      }
      await sleep(FILE_LOCK_RETRY_MS);
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
    // `mkdir({recursive})` never throws for an existing directory, so the mode
    // must be re-asserted every time rather than only on first creation.
    await ensurePrivateDirectory(dirPath);
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

  private deriveEncryptionKeyBytes(): Buffer {
    const machineInfo = `${homedir()}-neurolink-token-store`;
    return createHash("sha256").update(machineInfo).digest();
  }

  /**
   * XOR obfuscation over the UTF-8 bytes of the document, base64-encoded and
   * prefixed so a reader can tell it from the older code-unit codec.
   * Note: this is NOT cryptographically secure, just basic obfuscation.
   */
  private obfuscate(data: string): string {
    const key = this.encryptionKeyBytes;
    const bytes = Buffer.from(data, "utf8");
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] ^= key[i % key.length];
    }
    return `${OBFUSCATION_V2_PREFIX}${bytes.toString("base64")}`;
  }

  private deobfuscateV2(data: string): string {
    const key = this.encryptionKeyBytes;
    const bytes = Buffer.from(
      data.slice(OBFUSCATION_V2_PREFIX.length),
      "base64",
    );
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] ^= key[i % key.length];
    }
    return bytes.toString("utf8");
  }

  /**
   * The pre-UTF-8 codec, kept only to read stores written before it existed.
   * It cannot round-trip any character above U+00FF.
   */
  private deobfuscateLegacy(data: string): string {
    const key = this.encryptionKey;
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
