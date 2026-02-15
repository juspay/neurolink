import { describe, it, expect } from "vitest";
import { calculateCost, hasPricing } from "../../src/lib/utils/pricing.js";
import type { TokenUsage } from "../../src/lib/types/analytics.js";

describe("Pricing", () => {
  describe("calculateCost", () => {
    it("should calculate cost for exact provider/model match (anthropic + claude-sonnet-4-5-20250929)", () => {
      const usage: TokenUsage = {
        input: 1000,
        output: 500,
        total: 1500,
      };

      const cost = calculateCost(
        "anthropic",
        "claude-sonnet-4-5-20250929",
        usage,
      );

      // input: 1000 * 3.0/1M = 0.003
      // output: 500 * 15.0/1M = 0.0075
      // total = 0.0105
      expect(cost).toBe(0.0105);
    });

    it("should calculate cost for claude-opus-4-6", () => {
      const usage: TokenUsage = {
        input: 1000,
        output: 500,
        total: 1500,
      };

      const cost = calculateCost("anthropic", "claude-opus-4-6", usage);

      // input: 1000 * 15.0/1M = 0.015
      // output: 500 * 75.0/1M = 0.0375
      // total = 0.0525
      expect(cost).toBe(0.0525);
    });

    it("should calculate cost for openai gpt-4o", () => {
      const usage: TokenUsage = {
        input: 2000,
        output: 1000,
        total: 3000,
      };

      const cost = calculateCost("openai", "gpt-4o", usage);

      // input: 2000 * 2.5/1M = 0.005
      // output: 1000 * 10.0/1M = 0.01
      // total = 0.015
      expect(cost).toBe(0.015);
    });

    it("should match model by prefix (claude-sonnet-4-5-20250929-extra matches claude-sonnet-4-5-20250929)", () => {
      const usage: TokenUsage = {
        input: 1000,
        output: 500,
        total: 1500,
      };

      // This model name starts with "claude-sonnet-4-5-20250929" so should match
      const cost = calculateCost(
        "anthropic",
        "claude-sonnet-4-5-20250929-extra",
        usage,
      );

      // Same rates as claude-sonnet-4-5-20250929
      // input: 1000 * 3.0/1M = 0.003
      // output: 500 * 15.0/1M = 0.0075
      // total = 0.0105
      expect(cost).toBe(0.0105);
    });

    it("should include cache read tokens in cost calculation", () => {
      const usage: TokenUsage = {
        input: 1000,
        output: 500,
        total: 1500,
        cacheReadTokens: 2000,
      };

      const cost = calculateCost(
        "anthropic",
        "claude-sonnet-4-5-20250929",
        usage,
      );

      // input: 1000 * 3.0/1M = 0.003
      // output: 500 * 15.0/1M = 0.0075
      // cacheRead: 2000 * 0.3/1M = 0.0006
      // total = 0.0111
      expect(cost).toBe(0.0111);
    });

    it("should include cache creation tokens in cost calculation", () => {
      const usage: TokenUsage = {
        input: 1000,
        output: 500,
        total: 1500,
        cacheCreationTokens: 3000,
      };

      const cost = calculateCost(
        "anthropic",
        "claude-sonnet-4-5-20250929",
        usage,
      );

      // input: 1000 * 3.0/1M = 0.003
      // output: 500 * 15.0/1M = 0.0075
      // cacheCreation: 3000 * 3.75/1M = 0.01125
      // total = 0.02175
      expect(cost).toBe(0.02175);
    });

    it("should include both cache read and cache creation tokens", () => {
      const usage: TokenUsage = {
        input: 1000,
        output: 500,
        total: 1500,
        cacheReadTokens: 2000,
        cacheCreationTokens: 3000,
      };

      const cost = calculateCost(
        "anthropic",
        "claude-sonnet-4-5-20250929",
        usage,
      );

      // input: 1000 * 3.0/1M = 0.003
      // output: 500 * 15.0/1M = 0.0075
      // cacheRead: 2000 * 0.3/1M = 0.0006
      // cacheCreation: 3000 * 3.75/1M = 0.01125
      // total = 0.02235
      expect(cost).toBe(0.02235);
    });

    it("should not add cache cost when provider model has no cache rates", () => {
      const usage: TokenUsage = {
        input: 1000,
        output: 500,
        total: 1500,
        cacheReadTokens: 2000,
        cacheCreationTokens: 3000,
      };

      // OpenAI gpt-4o has no cacheRead/cacheCreation rates
      const cost = calculateCost("openai", "gpt-4o", usage);

      // input: 1000 * 2.5/1M = 0.0025
      // output: 500 * 10.0/1M = 0.005
      // cache tokens ignored (no rates)
      // total = 0.0075
      expect(cost).toBe(0.0075);
    });

    it("should return 0 for unknown provider", () => {
      const usage: TokenUsage = { input: 1000, output: 500, total: 1500 };

      const cost = calculateCost("unknownprovider", "some-model", usage);

      expect(cost).toBe(0);
    });

    it("should return 0 for unknown model", () => {
      const usage: TokenUsage = { input: 1000, output: 500, total: 1500 };

      const cost = calculateCost("anthropic", "nonexistent-model", usage);

      expect(cost).toBe(0);
    });

    it("should round to 6 decimal places", () => {
      // Use a usage that would produce more than 6 decimal places
      const usage: TokenUsage = {
        input: 7,
        output: 3,
        total: 10,
      };

      const cost = calculateCost(
        "anthropic",
        "claude-sonnet-4-5-20250929",
        usage,
      );

      // input: 7 * 3.0/1M = 0.000021
      // output: 3 * 15.0/1M = 0.000045
      // total = 0.000066
      expect(cost).toBe(0.000066);

      // Verify the number of decimal places
      const decimalPart = cost.toString().split(".")[1] || "";
      expect(decimalPart.length).toBeLessThanOrEqual(6);
    });

    it("should handle zero token usage", () => {
      const usage: TokenUsage = { input: 0, output: 0, total: 0 };

      const cost = calculateCost(
        "anthropic",
        "claude-sonnet-4-5-20250929",
        usage,
      );

      expect(cost).toBe(0);
    });

    it("should handle usage with only input tokens", () => {
      const usage: TokenUsage = { input: 1000, output: 0, total: 1000 };

      const cost = calculateCost("openai", "gpt-4o", usage);

      // input: 1000 * 2.5/1M = 0.0025
      expect(cost).toBe(0.0025);
    });

    it("should handle usage with only output tokens", () => {
      const usage: TokenUsage = { input: 0, output: 1000, total: 1000 };

      const cost = calculateCost("openai", "gpt-4o", usage);

      // output: 1000 * 10.0/1M = 0.01
      expect(cost).toBe(0.01);
    });
  });

  describe("calculateCost - provider alias normalization", () => {
    it('should resolve "google-ai" alias to google pricing', () => {
      const usage: TokenUsage = { input: 1000, output: 500, total: 1500 };

      const cost = calculateCost("google-ai", "gemini-2.0-flash", usage);

      // input: 1000 * 0.1/1M = 0.0001
      // output: 500 * 0.4/1M = 0.0002
      // total = 0.0003
      expect(cost).toBe(0.0003);
    });

    it('should resolve "googleAiStudio" alias to google pricing', () => {
      const usage: TokenUsage = { input: 1000, output: 500, total: 1500 };

      const cost = calculateCost("googleAiStudio", "gemini-2.0-flash", usage);

      expect(cost).toBe(0.0003);
    });

    it('should resolve "Google-AI" (case insensitive) to google pricing', () => {
      const usage: TokenUsage = { input: 1000, output: 500, total: 1500 };

      const cost = calculateCost("Google-AI", "gemini-2.0-flash", usage);

      expect(cost).toBe(0.0003);
    });

    it("should handle vertex provider directly", () => {
      const usage: TokenUsage = { input: 1000, output: 500, total: 1500 };

      const cost = calculateCost("vertex", "claude-sonnet-4-5@20250929", usage);

      // input: 1000 * 3.0/1M = 0.003
      // output: 500 * 15.0/1M = 0.0075
      // total = 0.0105
      expect(cost).toBe(0.0105);
    });
  });

  describe("calculateCost - gpt-4 vs gpt-4o regression", () => {
    it('should NOT match "gpt-4" to "gpt-4o" rates (longest-prefix match)', () => {
      const usage: TokenUsage = { input: 1000, output: 500, total: 1500 };

      // "gpt-4" does NOT start with "gpt-4o" (it's shorter), so gpt-4o should not match.
      // "gpt-4" DOES start with "gpt-4" but the only key starting with "gpt-4" that
      // matches is "gpt-4-turbo" -- but "gpt-4" doesn't start with "gpt-4-turbo".
      // So there's no key where "gpt-4".startsWith(key) is true, except... let's check.
      // Keys: "gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "o1", "o1-mini"
      // "gpt-4".startsWith("gpt-4o") => false
      // "gpt-4".startsWith("gpt-4o-mini") => false
      // "gpt-4".startsWith("gpt-4-turbo") => false
      // "gpt-4".startsWith("o1") => false
      // "gpt-4".startsWith("o1-mini") => false
      // So no key matches and cost should be 0
      const cost = calculateCost("openai", "gpt-4", usage);

      expect(cost).toBe(0);
    });

    it('should match "gpt-4o-2024-11-20" to "gpt-4o" rates via prefix', () => {
      const usage: TokenUsage = { input: 1000, output: 500, total: 1500 };

      const cost = calculateCost("openai", "gpt-4o-2024-11-20", usage);

      // Should use gpt-4o rates (gpt-4o-mini doesn't match since model doesn't start with "gpt-4o-mini")
      // input: 1000 * 2.5/1M = 0.0025
      // output: 500 * 10.0/1M = 0.005
      // total = 0.0075
      expect(cost).toBe(0.0075);
    });

    it('should match "gpt-4o-mini-2024-07-18" to "gpt-4o-mini" rates (longest prefix wins)', () => {
      const usage: TokenUsage = { input: 1000, output: 500, total: 1500 };

      const cost = calculateCost("openai", "gpt-4o-mini-2024-07-18", usage);

      // "gpt-4o-mini" is longer than "gpt-4o", and the model starts with "gpt-4o-mini"
      // So it should match gpt-4o-mini rates
      // input: 1000 * 0.15/1M = 0.00015
      // output: 500 * 0.6/1M = 0.0003
      // total = 0.00045
      expect(cost).toBe(0.00045);
    });

    it('should match "gpt-4-turbo-2024-04-09" to "gpt-4-turbo" rates', () => {
      const usage: TokenUsage = { input: 1000, output: 500, total: 1500 };

      const cost = calculateCost("openai", "gpt-4-turbo-2024-04-09", usage);

      // input: 1000 * 10.0/1M = 0.01
      // output: 500 * 30.0/1M = 0.015
      // total = 0.025
      expect(cost).toBe(0.025);
    });
  });

  describe("hasPricing", () => {
    it("should return true for known provider/model combination", () => {
      expect(hasPricing("anthropic", "claude-sonnet-4-5-20250929")).toBe(true);
    });

    it("should return true for known provider/model with prefix match", () => {
      expect(hasPricing("openai", "gpt-4o-2024-11-20")).toBe(true);
    });

    it("should return true for provider alias (google-ai)", () => {
      expect(hasPricing("google-ai", "gemini-2.0-flash")).toBe(true);
    });

    it("should return false for unknown provider", () => {
      expect(hasPricing("unknownprovider", "some-model")).toBe(false);
    });

    it("should return false for unknown model with known provider", () => {
      expect(hasPricing("openai", "nonexistent-model")).toBe(false);
    });

    it("should return false for gpt-4 (no exact or prefix match)", () => {
      expect(hasPricing("openai", "gpt-4")).toBe(false);
    });

    it("should return true for cheapest model (gemini-1.5-flash)", () => {
      expect(hasPricing("google-ai", "gemini-1.5-flash")).toBe(true);
    });
  });

  describe("calculateCost - analytics integration", () => {
    it("should work with createAnalytics-style token usage (all fields)", () => {
      const usage: TokenUsage = {
        input: 500,
        output: 200,
        total: 700,
        cacheCreationTokens: 100,
        cacheReadTokens: 300,
        reasoning: 50,
        cacheSavingsPercent: 60,
      };

      // calculateCost should only use input, output, cacheReadTokens, cacheCreationTokens
      const cost = calculateCost("anthropic", "claude-opus-4-6", usage);

      // input: 500 * 15.0/1M = 0.0075
      // output: 200 * 75.0/1M = 0.015
      // cacheRead: 300 * 1.5/1M = 0.00045
      // cacheCreation: 100 * 18.75/1M = 0.001875
      // total = 0.024825
      expect(cost).toBe(0.024825);
    });

    it("should handle google gemini pricing via google alias", () => {
      const usage: TokenUsage = {
        input: 10000,
        output: 5000,
        total: 15000,
      };

      const cost = calculateCost("google", "gemini-2.0-pro", usage);

      // input: 10000 * 1.25/1M = 0.0125
      // output: 5000 * 10.0/1M = 0.05
      // total = 0.0625
      expect(cost).toBe(0.0625);
    });
  });
});
