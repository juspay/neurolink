/**
 * HTTP Rate Limiter Tests
 * Tests for rate limiting in HTTP transport operations using token bucket algorithm
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { RateLimiterConfig, RateLimitResponse } from "../../types/mcp.js";

/**
 * Token Bucket Rate Limiter
 */
class TokenBucketRateLimiter {
  private tokens: number;
  private lastRefillTime: number;
  private readonly config: Required<RateLimiterConfig>;

  constructor(config: RateLimiterConfig) {
    this.config = {
      maxTokens: config.maxTokens,
      refillRate: config.refillRate,
      refillIntervalMs: config.refillIntervalMs,
      initialTokens: config.initialTokens ?? config.maxTokens,
    };
    this.tokens = this.config.initialTokens;
    this.lastRefillTime = Date.now();
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefillTime;
    const refillCount = Math.floor(elapsed / this.config.refillIntervalMs);

    if (refillCount > 0) {
      this.tokens = Math.min(
        this.config.maxTokens,
        this.tokens + refillCount * this.config.refillRate,
      );
      this.lastRefillTime += refillCount * this.config.refillIntervalMs;
    }
  }

  /**
   * Try to acquire a token without waiting
   * @returns true if token was acquired, false otherwise
   */
  tryAcquire(count = 1): boolean {
    this.refill();

    if (this.tokens >= count) {
      this.tokens -= count;
      return true;
    }

    return false;
  }

  /**
   * Acquire tokens, waiting if necessary
   * @returns Promise that resolves when tokens are acquired
   */
  async acquire(count = 1): Promise<void> {
    this.refill();

    if (this.tokens >= count) {
      this.tokens -= count;
      return;
    }

    // Calculate wait time
    const tokensNeeded = count - this.tokens;
    const intervalsNeeded = Math.ceil(tokensNeeded / this.config.refillRate);
    const waitTime = intervalsNeeded * this.config.refillIntervalMs;

    await new Promise((resolve) => setTimeout(resolve, waitTime));

    // Refill and consume after waiting
    this.refill();
    this.tokens -= count;
  }

  /**
   * Get current token count
   */
  getAvailableTokens(): number {
    this.refill();
    return this.tokens;
  }

  /**
   * Get time until next token is available
   */
  getTimeUntilNextToken(): number {
    this.refill();

    if (this.tokens >= 1) {
      return 0;
    }

    const elapsed = Date.now() - this.lastRefillTime;
    return this.config.refillIntervalMs - elapsed;
  }

  /**
   * Handle rate limit response from server
   * Adjusts internal state based on server feedback
   */
  handleRateLimitResponse(response: RateLimitResponse): void {
    if (response.remaining !== undefined) {
      // Server tells us exact remaining tokens
      this.tokens = Math.min(response.remaining, this.config.maxTokens);
    }

    if (response.resetTimestamp !== undefined) {
      // Server tells us when limit resets
      const resetTime = response.resetTimestamp * 1000; // Convert to ms
      const now = Date.now();
      if (resetTime > now) {
        this.lastRefillTime = resetTime;
      }
    }
  }

  /**
   * Reset rate limiter to initial state
   */
  reset(): void {
    this.tokens = this.config.maxTokens;
    this.lastRefillTime = Date.now();
  }
}

describe("HTTP Rate Limiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("TokenBucketRateLimiter", () => {
    describe("initialization", () => {
      it("should initialize with maxTokens by default", () => {
        const limiter = new TokenBucketRateLimiter({
          maxTokens: 10,
          refillRate: 1,
          refillIntervalMs: 1000,
        });

        expect(limiter.getAvailableTokens()).toBe(10);
      });

      it("should initialize with custom initialTokens", () => {
        const limiter = new TokenBucketRateLimiter({
          maxTokens: 10,
          refillRate: 1,
          refillIntervalMs: 1000,
          initialTokens: 5,
        });

        expect(limiter.getAvailableTokens()).toBe(5);
      });

      it("should initialize with zero tokens when specified", () => {
        const limiter = new TokenBucketRateLimiter({
          maxTokens: 10,
          refillRate: 1,
          refillIntervalMs: 1000,
          initialTokens: 0,
        });

        expect(limiter.getAvailableTokens()).toBe(0);
      });
    });

    describe("tryAcquire", () => {
      it("should return true when tokens are available", () => {
        const limiter = new TokenBucketRateLimiter({
          maxTokens: 10,
          refillRate: 1,
          refillIntervalMs: 1000,
        });

        expect(limiter.tryAcquire()).toBe(true);
        expect(limiter.getAvailableTokens()).toBe(9);
      });

      it("should return false when no tokens are available", () => {
        const limiter = new TokenBucketRateLimiter({
          maxTokens: 1,
          refillRate: 1,
          refillIntervalMs: 1000,
          initialTokens: 0,
        });

        expect(limiter.tryAcquire()).toBe(false);
      });

      it("should consume correct number of tokens", () => {
        const limiter = new TokenBucketRateLimiter({
          maxTokens: 10,
          refillRate: 1,
          refillIntervalMs: 1000,
        });

        expect(limiter.tryAcquire(5)).toBe(true);
        expect(limiter.getAvailableTokens()).toBe(5);
      });

      it("should return false when not enough tokens available", () => {
        const limiter = new TokenBucketRateLimiter({
          maxTokens: 5,
          refillRate: 1,
          refillIntervalMs: 1000,
          initialTokens: 3,
        });

        expect(limiter.tryAcquire(5)).toBe(false);
        expect(limiter.getAvailableTokens()).toBe(3); // Tokens not consumed
      });

      it("should allow consecutive acquisitions until depleted", () => {
        const limiter = new TokenBucketRateLimiter({
          maxTokens: 3,
          refillRate: 1,
          refillIntervalMs: 1000,
        });

        expect(limiter.tryAcquire()).toBe(true);
        expect(limiter.tryAcquire()).toBe(true);
        expect(limiter.tryAcquire()).toBe(true);
        expect(limiter.tryAcquire()).toBe(false);
      });
    });

    describe("acquire", () => {
      it("should resolve immediately when tokens are available", async () => {
        const limiter = new TokenBucketRateLimiter({
          maxTokens: 10,
          refillRate: 1,
          refillIntervalMs: 1000,
        });

        await limiter.acquire();
        expect(limiter.getAvailableTokens()).toBe(9);
      });

      it("should wait for tokens when none available", async () => {
        const limiter = new TokenBucketRateLimiter({
          maxTokens: 1,
          refillRate: 1,
          refillIntervalMs: 1000,
          initialTokens: 0,
        });

        const acquirePromise = limiter.acquire();

        // Should not resolve immediately
        await vi.advanceTimersByTimeAsync(500);
        expect(limiter.getAvailableTokens()).toBe(0);

        // Should resolve after refill interval
        await vi.advanceTimersByTimeAsync(500);
        await acquirePromise;
      });

      it("should acquire multiple tokens at once", async () => {
        const limiter = new TokenBucketRateLimiter({
          maxTokens: 10,
          refillRate: 1,
          refillIntervalMs: 1000,
        });

        await limiter.acquire(5);
        expect(limiter.getAvailableTokens()).toBe(5);
      });
    });

    describe("token refill", () => {
      it("should refill tokens over time", () => {
        const limiter = new TokenBucketRateLimiter({
          maxTokens: 10,
          refillRate: 1,
          refillIntervalMs: 1000,
          initialTokens: 5,
        });

        expect(limiter.getAvailableTokens()).toBe(5);

        vi.advanceTimersByTime(3000);
        expect(limiter.getAvailableTokens()).toBe(8);
      });

      it("should not exceed maxTokens during refill", () => {
        const limiter = new TokenBucketRateLimiter({
          maxTokens: 10,
          refillRate: 5,
          refillIntervalMs: 1000,
          initialTokens: 8,
        });

        vi.advanceTimersByTime(5000); // Would add 25 tokens
        expect(limiter.getAvailableTokens()).toBe(10);
      });

      it("should refill multiple tokens per interval", () => {
        const limiter = new TokenBucketRateLimiter({
          maxTokens: 100,
          refillRate: 10,
          refillIntervalMs: 1000,
          initialTokens: 0,
        });

        vi.advanceTimersByTime(3000);
        expect(limiter.getAvailableTokens()).toBe(30);
      });

      it("should handle partial intervals correctly", () => {
        const limiter = new TokenBucketRateLimiter({
          maxTokens: 10,
          refillRate: 1,
          refillIntervalMs: 1000,
          initialTokens: 5,
        });

        vi.advanceTimersByTime(500); // Half interval - no refill yet
        expect(limiter.getAvailableTokens()).toBe(5);

        vi.advanceTimersByTime(500); // Full interval - one refill
        expect(limiter.getAvailableTokens()).toBe(6);
      });
    });

    describe("getTimeUntilNextToken", () => {
      it("should return 0 when tokens are available", () => {
        const limiter = new TokenBucketRateLimiter({
          maxTokens: 10,
          refillRate: 1,
          refillIntervalMs: 1000,
        });

        expect(limiter.getTimeUntilNextToken()).toBe(0);
      });

      it("should return time until next refill when empty", () => {
        const limiter = new TokenBucketRateLimiter({
          maxTokens: 1,
          refillRate: 1,
          refillIntervalMs: 1000,
          initialTokens: 0,
        });

        const timeUntilNext = limiter.getTimeUntilNextToken();
        expect(timeUntilNext).toBeGreaterThan(0);
        expect(timeUntilNext).toBeLessThanOrEqual(1000);
      });

      it("should decrease over time", () => {
        const limiter = new TokenBucketRateLimiter({
          maxTokens: 1,
          refillRate: 1,
          refillIntervalMs: 1000,
          initialTokens: 0,
        });

        const initialTime = limiter.getTimeUntilNextToken();
        vi.advanceTimersByTime(300);
        const laterTime = limiter.getTimeUntilNextToken();

        expect(laterTime).toBeLessThan(initialTime);
      });
    });

    describe("handleRateLimitResponse", () => {
      it("should update tokens based on remaining header", () => {
        const limiter = new TokenBucketRateLimiter({
          maxTokens: 100,
          refillRate: 10,
          refillIntervalMs: 1000,
        });

        limiter.handleRateLimitResponse({ remaining: 50 });
        expect(limiter.getAvailableTokens()).toBe(50);
      });

      it("should not exceed maxTokens from remaining header", () => {
        const limiter = new TokenBucketRateLimiter({
          maxTokens: 10,
          refillRate: 1,
          refillIntervalMs: 1000,
        });

        limiter.handleRateLimitResponse({ remaining: 100 });
        expect(limiter.getAvailableTokens()).toBe(10);
      });

      it("should handle reset timestamp", () => {
        const now = Date.now();
        vi.setSystemTime(now);

        const limiter = new TokenBucketRateLimiter({
          maxTokens: 10,
          refillRate: 1,
          refillIntervalMs: 1000,
          initialTokens: 0,
        });

        const resetTime = Math.floor(now / 1000) + 60; // 60 seconds from now
        limiter.handleRateLimitResponse({ resetTimestamp: resetTime });

        // Token count should remain at 0 until reset time
        expect(limiter.getAvailableTokens()).toBe(0);
      });

      it("should handle combined response headers", () => {
        const limiter = new TokenBucketRateLimiter({
          maxTokens: 100,
          refillRate: 10,
          refillIntervalMs: 1000,
        });

        const now = Math.floor(Date.now() / 1000);
        limiter.handleRateLimitResponse({
          limit: 100,
          remaining: 25,
          resetTimestamp: now + 30,
        });

        expect(limiter.getAvailableTokens()).toBe(25);
      });
    });

    describe("reset", () => {
      it("should restore tokens to maxTokens", () => {
        const limiter = new TokenBucketRateLimiter({
          maxTokens: 10,
          refillRate: 1,
          refillIntervalMs: 1000,
        });

        limiter.tryAcquire(8);
        expect(limiter.getAvailableTokens()).toBe(2);

        limiter.reset();
        expect(limiter.getAvailableTokens()).toBe(10);
      });

      it("should reset refill timer", () => {
        const limiter = new TokenBucketRateLimiter({
          maxTokens: 10,
          refillRate: 1,
          refillIntervalMs: 1000,
          initialTokens: 0,
        });

        vi.advanceTimersByTime(500);
        limiter.reset();

        // After reset, should have maxTokens
        expect(limiter.getAvailableTokens()).toBe(10);
      });
    });
  });

  describe("Rate Limiting Integration Scenarios", () => {
    it("should handle burst traffic followed by steady state", () => {
      const limiter = new TokenBucketRateLimiter({
        maxTokens: 10,
        refillRate: 2,
        refillIntervalMs: 1000,
      });

      // Burst: consume all tokens quickly
      for (let i = 0; i < 10; i++) {
        expect(limiter.tryAcquire()).toBe(true);
      }
      expect(limiter.tryAcquire()).toBe(false);

      // Wait for partial refill
      vi.advanceTimersByTime(1000);
      expect(limiter.getAvailableTokens()).toBe(2);

      // Consume at refill rate
      expect(limiter.tryAcquire()).toBe(true);
      expect(limiter.tryAcquire()).toBe(true);
      expect(limiter.tryAcquire()).toBe(false);
    });

    it("should handle varying request costs", () => {
      const limiter = new TokenBucketRateLimiter({
        maxTokens: 20,
        refillRate: 5,
        refillIntervalMs: 1000,
      });

      // Small requests (1 token each) = 2 tokens
      expect(limiter.tryAcquire(1)).toBe(true);
      expect(limiter.tryAcquire(1)).toBe(true);

      // Medium request (5 tokens) = 7 tokens total
      expect(limiter.tryAcquire(5)).toBe(true);

      // Large request (10 tokens) = 17 tokens total
      expect(limiter.tryAcquire(10)).toBe(true);

      // 20 - 17 = 3 tokens left
      expect(limiter.getAvailableTokens()).toBe(3);
      expect(limiter.tryAcquire(5)).toBe(false);
    });

    it("should work correctly for API rate limiting scenario", () => {
      // Typical API: 100 requests per minute
      const limiter = new TokenBucketRateLimiter({
        maxTokens: 100,
        refillRate: 100,
        refillIntervalMs: 60000, // 1 minute
      });

      // Simulate 100 requests in first second
      for (let i = 0; i < 100; i++) {
        expect(limiter.tryAcquire()).toBe(true);
      }

      // 101st request should fail
      expect(limiter.tryAcquire()).toBe(false);

      // Wait 30 seconds - half refill
      vi.advanceTimersByTime(30000);
      expect(limiter.tryAcquire()).toBe(false);

      // Wait full minute - full refill
      vi.advanceTimersByTime(30000);
      expect(limiter.getAvailableTokens()).toBe(100);
    });
  });

  describe("Configuration Validation", () => {
    it("should work with minimal configuration", () => {
      const limiter = new TokenBucketRateLimiter({
        maxTokens: 1,
        refillRate: 1,
        refillIntervalMs: 1,
      });

      expect(limiter.getAvailableTokens()).toBe(1);
    });

    it("should handle high throughput configuration", () => {
      const limiter = new TokenBucketRateLimiter({
        maxTokens: 10000,
        refillRate: 1000,
        refillIntervalMs: 100,
      });

      expect(limiter.getAvailableTokens()).toBe(10000);

      // Consume 5000 tokens
      expect(limiter.tryAcquire(5000)).toBe(true);

      // Wait 500ms - 5 refill intervals = 5000 tokens refilled
      vi.advanceTimersByTime(500);
      expect(limiter.getAvailableTokens()).toBe(10000);
    });

    it("should handle slow refill configuration", () => {
      const limiter = new TokenBucketRateLimiter({
        maxTokens: 5,
        refillRate: 1,
        refillIntervalMs: 60000, // 1 minute per token
        initialTokens: 1,
      });

      expect(limiter.tryAcquire()).toBe(true);
      expect(limiter.tryAcquire()).toBe(false);

      // Need to wait full minute for next token
      vi.advanceTimersByTime(30000);
      expect(limiter.tryAcquire()).toBe(false);

      vi.advanceTimersByTime(30000);
      expect(limiter.tryAcquire()).toBe(true);
    });
  });
});
