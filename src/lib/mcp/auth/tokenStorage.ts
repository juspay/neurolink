/**
 * Token Storage for OAuth 2.1 authentication
 * Provides implementations for storing OAuth tokens
 */

import { logger } from "../../utils/logger.js";
import type { OAuthTokens, TokenStorage } from "../../types/index.js";

/**
 * In-memory token storage implementation
 * Suitable for development and single-session use
 * Tokens are lost when the process terminates
 */
export class InMemoryTokenStorage implements TokenStorage {
  private tokens: Map<string, OAuthTokens> = new Map();

  async getTokens(serverId: string): Promise<OAuthTokens | null> {
    return this.tokens.get(serverId) ?? null;
  }

  async saveTokens(serverId: string, tokens: OAuthTokens): Promise<void> {
    this.tokens.set(serverId, tokens);
  }

  async deleteTokens(serverId: string): Promise<void> {
    this.tokens.delete(serverId);
  }

  async hasTokens(serverId: string): Promise<boolean> {
    return this.tokens.has(serverId);
  }

  async clearAll(): Promise<void> {
    this.tokens.clear();
  }

  /**
   * Get the number of stored token sets
   */
  get size(): number {
    return this.tokens.size;
  }

  /**
   * Get all server IDs with stored tokens
   */
  getServerIds(): string[] {
    return Array.from(this.tokens.keys());
  }
}

/**
 * File-based token storage implementation
 * Persists tokens to disk for cross-session use
 */
export class FileTokenStorage implements TokenStorage {
  private filePath: string;
  private tokens: Map<string, OAuthTokens> = new Map();
  private loaded: boolean = false;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  private async loadTokens(): Promise<void> {
    if (this.loaded) {
      return;
    }

    try {
      const fs = await import("fs/promises");
      const data = await fs.readFile(this.filePath, "utf-8");
      const parsed = JSON.parse(data) as Record<string, OAuthTokens>;
      this.tokens = new Map(Object.entries(parsed));
      this.loaded = true;
    } catch (error) {
      // File doesn't exist or is invalid, start with empty tokens
      if (
        error instanceof Error &&
        "code" in error &&
        (error as NodeJS.ErrnoException).code !== "ENOENT"
      ) {
        logger.warn(
          `[FileTokenStorage] Error loading tokens: ${error.message}`,
        );
      }
      this.tokens = new Map();
      this.loaded = true;
    }
  }

  /**
   * Persist the token map. These are bearer credentials, so the directory is
   * created `0700` and the file lands `0600`: written to a uniquely named
   * temporary file opened with `wx` (a pre-planted file or symlink at that
   * name fails instead of being followed), then renamed into place so a
   * reader never sees a torn file.
   */
  private async saveToFile(): Promise<void> {
    try {
      const fs = await import("fs/promises");
      const path = await import("path");
      const { randomBytes } = await import("crypto");

      const dir = path.dirname(this.filePath);
      await fs.mkdir(dir, { recursive: true, mode: 0o700 });

      const data = Object.fromEntries(this.tokens.entries());
      const tmp = `${this.filePath}.${process.pid}.${randomBytes(6).toString("hex")}.tmp`;
      try {
        await fs.writeFile(tmp, JSON.stringify(data, null, 2), {
          encoding: "utf-8",
          mode: 0o600,
          flag: "wx",
        });
        await fs.rename(tmp, this.filePath);
        await fs.chmod(this.filePath, 0o600);
      } catch (writeError) {
        await fs.rm(tmp, { force: true });
        throw writeError;
      }
    } catch (error) {
      logger.error(
        `[FileTokenStorage] Error saving tokens: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async getTokens(serverId: string): Promise<OAuthTokens | null> {
    await this.loadTokens();
    return this.tokens.get(serverId) ?? null;
  }

  async saveTokens(serverId: string, tokens: OAuthTokens): Promise<void> {
    await this.loadTokens();
    this.tokens.set(serverId, tokens);
    await this.saveToFile();
  }

  async deleteTokens(serverId: string): Promise<void> {
    await this.loadTokens();
    this.tokens.delete(serverId);
    await this.saveToFile();
  }

  async hasTokens(serverId: string): Promise<boolean> {
    await this.loadTokens();
    return this.tokens.has(serverId);
  }

  async clearAll(): Promise<void> {
    this.tokens.clear();
    await this.saveToFile();
  }
}

/**
 * Check if tokens are expired or about to expire
 * @param tokens - OAuth tokens to check
 * @param bufferSeconds - Buffer time in seconds before expiration (default: 60)
 * @returns True if tokens are expired or will expire within buffer time
 */
export function isTokenExpired(
  tokens: OAuthTokens,
  bufferSeconds: number = 60,
): boolean {
  if (!tokens.expiresAt) {
    return false; // No expiration set, assume valid
  }

  const bufferMs = bufferSeconds * 1000;
  const now = Date.now();

  return tokens.expiresAt - bufferMs <= now;
}

/**
 * Calculate token expiration timestamp from expires_in value
 * @param expiresIn - Token lifetime in seconds
 * @returns Expiration timestamp (Unix epoch in milliseconds)
 */
export function calculateExpiresAt(expiresIn: number): number {
  return Date.now() + expiresIn * 1000;
}
