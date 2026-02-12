/**
 * Token Bucket Rate Limiter for URL Downloads
 *
 * Implements a token bucket algorithm to limit concurrent URL downloads.
 * This prevents DoS attacks from rapid URL download requests.
 *
 * Default configuration: 10 downloads per second
 */

import { logger } from "./logger.js";
import { ErrorFactory } from "./errorHandling.js";

/**
 * Configuration options for the rate limiter
 */
export type RateLimiterConfig = {
  /** Maximum tokens (downloads) allowed per interval */
  maxTokens: number;
  /** Refill interval in milliseconds */
  refillIntervalMs: number;
  /** Number of tokens to add per refill interval */
  tokensPerRefill: number;
  /** Maximum queue size for pending requests */
  maxQueueSize: number;
  /** Timeout for queued requests in milliseconds */
  queueTimeoutMs: number;
};

/**
 * Default configuration: 10 downloads per second
 */
const DEFAULT_CONFIG: RateLimiterConfig = {
  maxTokens: 10,
  refillIntervalMs: 1000,
  tokensPerRefill: 10,
  maxQueueSize: 100,
  queueTimeoutMs: 30000,
};

/**
 * Pending request in the queue
 */
type PendingRequest = {
  resolve: () => void;
  reject: (error: Error) => void;
  timestamp: number;
  timeoutTimer?: ReturnType<typeof setTimeout>;
};

/**
 * Token Bucket Rate Limiter
 *
 * Uses a token bucket algorithm where:
 * - Tokens are consumed when a download is requested
 * - Tokens are refilled at a fixed rate
 * - Requests that exceed the limit are queued
 */
export class TokenBucketRateLimiter {
  private tokens: number;
  private config: RateLimiterConfig;
  private queue: PendingRequest[] = [];
  private refillTimer: ReturnType<typeof setInterval> | null = null;
  private lastRefillTime: number;

  constructor(config: Partial<RateLimiterConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.tokens = this.config.maxTokens;
    this.lastRefillTime = Date.now();
    this.startRefillTimer();
  }

  /**
   * Start the token refill timer
   */
  private startRefillTimer(): void {
    if (this.refillTimer) {
      return;
    }

    this.refillTimer = setInterval(() => {
      this.refillTokens();
      this.processQueue();
    }, this.config.refillIntervalMs);

    // Unref to prevent keeping the process alive
    this.refillTimer.unref();
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refillTokens(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefillTime;
    const intervalsElapsed = Math.floor(elapsed / this.config.refillIntervalMs);

    if (intervalsElapsed > 0) {
      const tokensToAdd = intervalsElapsed * this.config.tokensPerRefill;
      this.tokens = Math.min(this.config.maxTokens, this.tokens + tokensToAdd);
      this.lastRefillTime = now;
    }
  }

  /**
   * Process queued requests when tokens become available
   */
  private processQueue(): void {
    const now = Date.now();

    // Remove timed out requests
    while (this.queue.length > 0) {
      const request = this.queue[0];
      if (now - request.timestamp > this.config.queueTimeoutMs) {
        this.queue.shift();
        if (request.timeoutTimer) {
          clearTimeout(request.timeoutTimer);
        }
        request.reject(
          ErrorFactory.rateLimiterQueueTimeout(this.config.queueTimeoutMs),
        );
      } else {
        break;
      }
    }

    // Process requests while we have tokens
    while (this.tokens > 0 && this.queue.length > 0) {
      const request = this.queue.shift();
      if (request) {
        if (request.timeoutTimer) {
          clearTimeout(request.timeoutTimer);
        }
        this.tokens--;
        request.resolve();
      }
    }
  }

  /**
   * Acquire a token for a download
   * Returns immediately if token is available, otherwise queues the request
   *
   * @throws NeuroLinkError if queue is full or request times out
   */
  async acquire(): Promise<void> {
    // Refill tokens based on elapsed time
    this.refillTokens();

    // If token available, consume it immediately
    if (this.tokens > 0) {
      this.tokens--;
      return;
    }

    // Check queue size limit
    if (this.queue.length >= this.config.maxQueueSize) {
      logger.warn(
        `Rate limiter queue full (${this.config.maxQueueSize} requests pending)`,
      );
      throw ErrorFactory.rateLimiterQueueFull(this.config.maxQueueSize);
    }

    // Queue the request with per-request timeout handling
    return new Promise<void>((resolve, reject) => {
      // Create per-request timeout timer for robust timeout handling
      const timeoutTimer = setTimeout(() => {
        // Remove from queue if still present
        const index = this.queue.findIndex(
          (req) => req.timeoutTimer === timeoutTimer,
        );
        if (index !== -1) {
          this.queue.splice(index, 1);
          reject(
            ErrorFactory.rateLimiterQueueTimeout(this.config.queueTimeoutMs),
          );
        }
      }, this.config.queueTimeoutMs);

      this.queue.push({
        resolve,
        reject,
        timestamp: Date.now(),
        timeoutTimer,
      });
    });
  }

  /**
   * Get current rate limiter statistics
   */
  getStats(): {
    availableTokens: number;
    queueLength: number;
    maxTokens: number;
    maxQueueSize: number;
  } {
    return {
      availableTokens: this.tokens,
      queueLength: this.queue.length,
      maxTokens: this.config.maxTokens,
      maxQueueSize: this.config.maxQueueSize,
    };
  }

  /**
   * Reset the rate limiter to initial state
   */
  reset(): void {
    this.tokens = this.config.maxTokens;
    this.lastRefillTime = Date.now();

    // Reject all queued requests and clear timeout timers
    while (this.queue.length > 0) {
      const request = this.queue.shift();
      if (request) {
        if (request.timeoutTimer) {
          clearTimeout(request.timeoutTimer);
        }
        request.reject(ErrorFactory.rateLimiterReset());
      }
    }
  }

  /**
   * Stop the rate limiter and clean up resources
   */
  stop(): void {
    if (this.refillTimer) {
      clearInterval(this.refillTimer);
      this.refillTimer = null;
    }
    this.reset();
  }
}

/**
 * Global rate limiter instance for URL downloads
 * Default: 10 downloads per second
 */
export const urlDownloadRateLimiter = new TokenBucketRateLimiter({
  maxTokens: 10,
  refillIntervalMs: 1000,
  tokensPerRefill: 10,
  maxQueueSize: 100,
  queueTimeoutMs: 30000,
});

/**
 * Rate-limited wrapper for async functions
 * Ensures the function is rate-limited using the provided rate limiter
 *
 * @param fn - The async function to wrap
 * @param rateLimiter - The rate limiter to use (defaults to urlDownloadRateLimiter)
 * @returns A rate-limited version of the function
 */
export function withRateLimit<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  rateLimiter: TokenBucketRateLimiter = urlDownloadRateLimiter,
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    await rateLimiter.acquire();
    return fn(...args);
  };
}
