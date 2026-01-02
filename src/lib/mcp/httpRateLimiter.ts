/**
 * HTTP Rate Limiter for MCP HTTP Transport
 * Implements token bucket algorithm for rate limiting
 * Provides fault tolerance and prevents server overload
 */

import { mcpLogger } from "../utils/logger.js";
import type { RateLimitConfig, RateLimiterStats } from "../types/mcpTypes.js";

/**
 * Default rate limit configuration
 * Provides sensible defaults for most MCP HTTP transport use cases
 */
export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  requestsPerWindow: 60,
  windowMs: 60000,
  useTokenBucket: true,
  refillRate: 1,
  maxBurst: 10,
};

/**
 * HTTPRateLimiter
 * Implements token bucket algorithm for rate limiting HTTP requests
 *
 * The token bucket algorithm works as follows:
 * - Tokens are added to the bucket at a fixed rate (refillRate per second)
 * - Each request consumes one token
 * - If no tokens are available, the request must wait
 * - Maximum tokens are capped at maxBurst to allow controlled bursting
 */
export class HTTPRateLimiter {
  private tokens: number;
  private lastRefill: number;
  private config: RateLimitConfig;
  private waitQueue: Array<{
    resolve: () => void;
    reject: (error: Error) => void;
  }> = [];
  private processingQueue = false;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = { ...DEFAULT_RATE_LIMIT_CONFIG, ...config };
    this.tokens = this.config.maxBurst;
    this.lastRefill = Date.now();

    mcpLogger.debug(`[HTTPRateLimiter] Initialized with config:`, {
      requestsPerWindow: this.config.requestsPerWindow,
      windowMs: this.config.windowMs,
      useTokenBucket: this.config.useTokenBucket,
      refillRate: this.config.refillRate,
      maxBurst: this.config.maxBurst,
    });
  }

  /**
   * Refill tokens based on elapsed time since last refill
   * Tokens are added at the configured refillRate (tokens per second)
   */
  private refillTokens(): void {
    const now = Date.now();
    const elapsedMs = now - this.lastRefill;
    const elapsedSeconds = elapsedMs / 1000;

    // Calculate tokens to add based on elapsed time and refill rate
    const tokensToAdd = elapsedSeconds * this.config.refillRate;

    if (tokensToAdd >= 1) {
      // Only refill if at least one token should be added
      const previousTokens = this.tokens;
      this.tokens = Math.min(this.config.maxBurst, this.tokens + tokensToAdd);
      this.lastRefill = now;

      if (this.tokens > previousTokens) {
        mcpLogger.debug(
          `[HTTPRateLimiter] Refilled tokens: ${previousTokens.toFixed(2)} -> ${this.tokens.toFixed(2)} (+${tokensToAdd.toFixed(2)})`,
        );
      }
    }
  }

  /**
   * Acquire a token, waiting if necessary
   * This is the primary method for rate-limited operations
   *
   * @returns Promise that resolves when a token is acquired
   * @throws Error if the wait queue is too long
   */
  async acquire(): Promise<void> {
    // First, try to acquire without waiting
    if (this.tryAcquire()) {
      return;
    }

    // Add to wait queue
    return new Promise<void>((resolve, reject) => {
      this.waitQueue.push({ resolve, reject });
      mcpLogger.debug(
        `[HTTPRateLimiter] Request queued, queue length: ${this.waitQueue.length}`,
      );

      // Start processing the queue if not already processing
      if (!this.processingQueue) {
        this.processQueue();
      }
    });
  }

  /**
   * Process the wait queue, granting tokens as they become available
   */
  private async processQueue(): Promise<void> {
    if (this.processingQueue) {
      return;
    }

    this.processingQueue = true;

    while (this.waitQueue.length > 0) {
      // Refill tokens
      this.refillTokens();

      // If we have tokens, grant to next waiter
      if (this.tokens >= 1) {
        const waiter = this.waitQueue.shift();
        if (waiter) {
          this.tokens -= 1;
          mcpLogger.debug(
            `[HTTPRateLimiter] Token granted from queue, remaining: ${this.tokens.toFixed(2)}, queue: ${this.waitQueue.length}`,
          );
          waiter.resolve();
        }
      } else {
        // Calculate wait time until next token is available
        const tokensNeeded = 1 - this.tokens;
        const waitTimeMs = (tokensNeeded / this.config.refillRate) * 1000;
        const actualWait = Math.max(10, Math.ceil(waitTimeMs));

        mcpLogger.debug(
          `[HTTPRateLimiter] Waiting ${actualWait}ms for token refill`,
        );

        // Wait for the calculated time
        await this.sleep(actualWait);
      }
    }

    this.processingQueue = false;
  }

  /**
   * Sleep helper function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Try to acquire a token without waiting
   *
   * @returns true if a token was acquired, false otherwise
   */
  tryAcquire(): boolean {
    // Refill tokens based on elapsed time
    this.refillTokens();

    // Check if we have tokens available
    if (this.tokens >= 1) {
      this.tokens -= 1;
      mcpLogger.debug(
        `[HTTPRateLimiter] Token acquired, remaining: ${this.tokens.toFixed(2)}`,
      );
      return true;
    }

    mcpLogger.debug(
      `[HTTPRateLimiter] No tokens available, current: ${this.tokens.toFixed(2)}`,
    );
    return false;
  }

  /**
   * Handle rate limit response headers from server
   * Parses Retry-After header and returns wait time in milliseconds
   *
   * @param headers - Response headers from the server
   * @returns Wait time in milliseconds, or 0 if no rate limit headers found
   */
  handleRateLimitResponse(headers: Headers): number {
    // Check for Retry-After header (standard HTTP 429 response)
    const retryAfter = headers.get("Retry-After");

    if (retryAfter) {
      // Retry-After can be either a number of seconds or an HTTP-date
      const seconds = parseInt(retryAfter, 10);

      if (!isNaN(seconds)) {
        // It's a number of seconds
        const waitTimeMs = seconds * 1000;
        mcpLogger.info(
          `[HTTPRateLimiter] Server requested retry after ${seconds} seconds`,
        );
        return waitTimeMs;
      } else {
        // Try to parse as HTTP-date
        const retryDate = new Date(retryAfter);
        if (!isNaN(retryDate.getTime())) {
          const waitTimeMs = Math.max(0, retryDate.getTime() - Date.now());
          mcpLogger.info(
            `[HTTPRateLimiter] Server requested retry at ${retryDate.toISOString()} (${waitTimeMs}ms)`,
          );
          return waitTimeMs;
        }
      }
    }

    // Check for X-RateLimit-Reset header (common non-standard header)
    const rateLimitReset = headers.get("X-RateLimit-Reset");
    if (rateLimitReset) {
      const resetTimestamp = parseInt(rateLimitReset, 10);
      if (!isNaN(resetTimestamp)) {
        // Could be Unix timestamp (seconds) or milliseconds
        const resetTime =
          resetTimestamp > 1e12 ? resetTimestamp : resetTimestamp * 1000;
        const waitTimeMs = Math.max(0, resetTime - Date.now());
        mcpLogger.info(
          `[HTTPRateLimiter] Rate limit resets at ${new Date(resetTime).toISOString()} (${waitTimeMs}ms)`,
        );
        return waitTimeMs;
      }
    }

    // Check for X-RateLimit-Remaining header
    const remaining = headers.get("X-RateLimit-Remaining");
    if (remaining === "0") {
      // No remaining requests, use default backoff
      const defaultBackoffMs = 1000;
      mcpLogger.info(
        `[HTTPRateLimiter] Rate limit exhausted, using default backoff: ${defaultBackoffMs}ms`,
      );
      return defaultBackoffMs;
    }

    return 0;
  }

  /**
   * Get the number of remaining tokens
   *
   * @returns Current number of available tokens
   */
  getRemainingTokens(): number {
    this.refillTokens();
    return this.tokens;
  }

  /**
   * Reset the rate limiter to initial state
   * Useful for testing or when server indicates rate limits have been reset
   */
  reset(): void {
    this.tokens = this.config.maxBurst;
    this.lastRefill = Date.now();

    // Reject all pending waiters
    while (this.waitQueue.length > 0) {
      const waiter = this.waitQueue.shift();
      if (waiter) {
        waiter.reject(new Error("Rate limiter was reset"));
      }
    }

    mcpLogger.info(
      `[HTTPRateLimiter] Reset to initial state, tokens: ${this.tokens}`,
    );
  }

  /**
   * Get current rate limiter statistics
   */
  getStats(): RateLimiterStats {
    this.refillTokens();
    return {
      tokens: this.tokens,
      maxBurst: this.config.maxBurst,
      refillRate: this.config.refillRate,
      queueLength: this.waitQueue.length,
      lastRefill: new Date(this.lastRefill),
    };
  }

  /**
   * Update configuration dynamically
   * Useful when server provides rate limit information
   */
  updateConfig(config: Partial<RateLimitConfig>): void {
    Object.assign(this.config, config);
    mcpLogger.info(`[HTTPRateLimiter] Configuration updated:`, config);
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<RateLimitConfig> {
    return { ...this.config };
  }
}

/**
 * RateLimiterManager
 * Manages multiple rate limiters for different servers
 * Each server can have its own rate limiting configuration
 */
export class RateLimiterManager {
  private limiters: Map<string, HTTPRateLimiter> = new Map();

  /**
   * Get or create a rate limiter for a server
   *
   * @param serverId - Unique identifier for the server
   * @param config - Optional configuration for the rate limiter
   * @returns HTTPRateLimiter instance for the server
   */
  getLimiter(
    serverId: string,
    config?: Partial<RateLimitConfig>,
  ): HTTPRateLimiter {
    let limiter = this.limiters.get(serverId);

    if (!limiter) {
      limiter = new HTTPRateLimiter(config);
      this.limiters.set(serverId, limiter);

      mcpLogger.debug(
        `[RateLimiterManager] Created rate limiter for server: ${serverId}`,
      );
    } else if (config) {
      // Update existing limiter's configuration if provided
      limiter.updateConfig(config);
    }

    return limiter;
  }

  /**
   * Check if a rate limiter exists for a server
   *
   * @param serverId - Unique identifier for the server
   * @returns true if a rate limiter exists for the server
   */
  hasLimiter(serverId: string): boolean {
    return this.limiters.has(serverId);
  }

  /**
   * Remove a rate limiter for a server
   *
   * @param serverId - Unique identifier for the server
   */
  removeLimiter(serverId: string): void {
    const limiter = this.limiters.get(serverId);
    if (limiter) {
      limiter.reset(); // Clean up any pending operations
      this.limiters.delete(serverId);

      mcpLogger.debug(
        `[RateLimiterManager] Removed rate limiter for server: ${serverId}`,
      );
    }
  }

  /**
   * Get all server IDs with active rate limiters
   *
   * @returns Array of server IDs
   */
  getServerIds(): string[] {
    return Array.from(this.limiters.keys());
  }

  /**
   * Get statistics for all rate limiters
   *
   * @returns Record of server IDs to their rate limiter statistics
   */
  getAllStats(): Record<string, RateLimiterStats> {
    const stats: Record<string, RateLimiterStats> = {};

    for (const [serverId, limiter] of this.limiters) {
      stats[serverId] = limiter.getStats();
    }

    return stats;
  }

  /**
   * Reset all rate limiters
   */
  resetAll(): void {
    for (const limiter of this.limiters.values()) {
      limiter.reset();
    }

    mcpLogger.info("[RateLimiterManager] Reset all rate limiters");
  }

  /**
   * Destroy all rate limiters and clean up resources
   * This should be called during application shutdown
   */
  destroyAll(): void {
    for (const limiter of this.limiters.values()) {
      limiter.reset();
    }
    this.limiters.clear();

    mcpLogger.info("[RateLimiterManager] Destroyed all rate limiters");
  }

  /**
   * Get health summary for all rate limiters
   */
  getHealthSummary(): {
    totalLimiters: number;
    serversWithQueuedRequests: string[];
    totalQueuedRequests: number;
    averageTokensAvailable: number;
  } {
    const serversWithQueuedRequests: string[] = [];
    let totalQueuedRequests = 0;
    let totalTokens = 0;

    for (const [serverId, limiter] of this.limiters) {
      const stats = limiter.getStats();

      if (stats.queueLength > 0) {
        serversWithQueuedRequests.push(serverId);
        totalQueuedRequests += stats.queueLength;
      }

      totalTokens += stats.tokens;
    }

    const averageTokensAvailable =
      this.limiters.size > 0 ? totalTokens / this.limiters.size : 0;

    return {
      totalLimiters: this.limiters.size,
      serversWithQueuedRequests,
      totalQueuedRequests,
      averageTokensAvailable,
    };
  }
}

/**
 * Global rate limiter manager instance
 * Use this for application-wide rate limiting management
 */
export const globalRateLimiterManager = new RateLimiterManager();
