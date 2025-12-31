import { describe, it, expect } from "vitest";
import { createAnalytics } from "../../../src/lib/core/analytics.js";

describe("Prompt Caching", () => {
  describe("Token Usage Extraction via createAnalytics", () => {
    it("should extract cache creation tokens from usage", () => {
      const result = {
        usage: {
          promptTokens: 100,
          completionTokens: 50,
          cacheCreationInputTokens: 20,
          cacheReadInputTokens: 0,
        },
      };

      const analytics = createAnalytics(
        "anthropic",
        "claude-3-5-sonnet",
        result,
        150,
      );

      expect(analytics.tokenUsage.cacheCreationTokens).toBe(20);
      expect(analytics.tokenUsage.input).toBe(100);
      expect(analytics.tokenUsage.output).toBe(50);
    });

    it("should extract cache read tokens from usage", () => {
      const result = {
        usage: {
          promptTokens: 100,
          completionTokens: 50,
          cacheCreationInputTokens: 0,
          cacheReadInputTokens: 80,
        },
      };

      const analytics = createAnalytics(
        "anthropic",
        "claude-3-5-sonnet",
        result,
        150,
      );

      expect(analytics.tokenUsage.cacheReadTokens).toBe(80);
    });

    it("should handle missing cache tokens gracefully", () => {
      const result = {
        usage: {
          promptTokens: 100,
          completionTokens: 50,
        },
      };

      const analytics = createAnalytics(
        "anthropic",
        "claude-3-5-sonnet",
        result,
        150,
      );

      expect(analytics.tokenUsage.cacheCreationTokens).toBeUndefined();
      expect(analytics.tokenUsage.cacheReadTokens).toBeUndefined();
    });

    it("should calculate cache savings percentage", () => {
      // When cacheReadTokens is 80 and input is 20, total input with cache = 100
      // cacheSavingsPercent = (80 / 100) * 100 = 80%
      const result = {
        usage: {
          promptTokens: 20,
          completionTokens: 50,
          cacheCreationInputTokens: 0,
          cacheReadInputTokens: 80,
        },
      };

      const analytics = createAnalytics(
        "anthropic",
        "claude-3-5-sonnet",
        result,
        150,
      );

      expect(analytics.tokenUsage.cacheSavingsPercent).toBe(80);
    });

    it("should not have cacheSavingsPercent when no cache read tokens", () => {
      const result = {
        usage: {
          promptTokens: 100,
          completionTokens: 50,
          cacheCreationInputTokens: 20,
          cacheReadInputTokens: 0,
        },
      };

      const analytics = createAnalytics(
        "anthropic",
        "claude-3-5-sonnet",
        result,
        150,
      );

      expect(analytics.tokenUsage.cacheSavingsPercent).toBeUndefined();
    });
  });

  describe("Different Token Format Support", () => {
    it("should extract tokens from AI SDK format (inputTokens/outputTokens)", () => {
      const result = {
        usage: {
          inputTokens: 200,
          outputTokens: 100,
          totalTokens: 300,
          cacheCreationInputTokens: 50,
          cacheReadInputTokens: 30,
        },
      };

      const analytics = createAnalytics("openai", "gpt-4o", result, 200);

      expect(analytics.tokenUsage.input).toBe(200);
      expect(analytics.tokenUsage.output).toBe(100);
      expect(analytics.tokenUsage.total).toBe(300);
      expect(analytics.tokenUsage.cacheCreationTokens).toBe(50);
      expect(analytics.tokenUsage.cacheReadTokens).toBe(30);
    });

    it("should extract tokens from BaseProvider format (input/output/total)", () => {
      const result = {
        usage: {
          input: 150,
          output: 75,
          total: 225,
          cacheCreationInputTokens: 25,
          cacheReadInputTokens: 15,
        },
      };

      const analytics = createAnalytics(
        "anthropic",
        "claude-3-5-sonnet",
        result,
        180,
      );

      expect(analytics.tokenUsage.input).toBe(150);
      expect(analytics.tokenUsage.output).toBe(75);
      expect(analytics.tokenUsage.total).toBe(225);
      expect(analytics.tokenUsage.cacheCreationTokens).toBe(25);
      expect(analytics.tokenUsage.cacheReadTokens).toBe(15);
    });
  });

  describe("Analytics Metadata", () => {
    it("should include provider and model in analytics", () => {
      const result = {
        usage: {
          promptTokens: 100,
          completionTokens: 50,
        },
      };

      const analytics = createAnalytics(
        "anthropic",
        "claude-3-5-sonnet",
        result,
        150,
      );

      expect(analytics.provider).toBe("anthropic");
      expect(analytics.model).toBe("claude-3-5-sonnet");
    });

    it("should include request duration in analytics", () => {
      const result = {
        usage: {
          promptTokens: 100,
          completionTokens: 50,
        },
      };

      const analytics = createAnalytics(
        "anthropic",
        "claude-3-5-sonnet",
        result,
        250,
      );

      expect(analytics.requestDuration).toBe(250);
    });

    it("should include timestamp in analytics", () => {
      const result = {
        usage: {
          promptTokens: 100,
          completionTokens: 50,
        },
      };

      const analytics = createAnalytics(
        "anthropic",
        "claude-3-5-sonnet",
        result,
        150,
      );

      expect(analytics.timestamp).toBeDefined();
      expect(typeof analytics.timestamp).toBe("string");
      // Verify it's a valid ISO date
      expect(() => new Date(analytics.timestamp)).not.toThrow();
    });

    it("should include custom context if provided", () => {
      const result = {
        usage: {
          promptTokens: 100,
          completionTokens: 50,
        },
      };

      const context = { sessionId: "test-session", requestType: "chat" };
      const analytics = createAnalytics(
        "anthropic",
        "claude-3-5-sonnet",
        result,
        150,
        context,
      );

      expect(analytics.context).toEqual(context);
    });
  });

  describe("Error Handling", () => {
    it("should return minimal analytics on error", () => {
      // Pass null as result to simulate error
      const analytics = createAnalytics(
        "anthropic",
        "claude-3-5-sonnet",
        null,
        150,
      );

      expect(analytics.tokenUsage.input).toBe(0);
      expect(analytics.tokenUsage.output).toBe(0);
      expect(analytics.tokenUsage.total).toBe(0);
      expect(analytics.provider).toBe("anthropic");
      expect(analytics.model).toBe("claude-3-5-sonnet");
    });

    it("should handle missing usage object", () => {
      const result = {};

      const analytics = createAnalytics("openai", "gpt-4o", result, 150);

      expect(analytics.tokenUsage.input).toBe(0);
      expect(analytics.tokenUsage.output).toBe(0);
      expect(analytics.tokenUsage.total).toBe(0);
    });
  });

  describe("Reasoning Token Extraction", () => {
    it("should extract reasoning tokens (reasoningTokens format)", () => {
      const result = {
        usage: {
          promptTokens: 100,
          completionTokens: 150,
          reasoningTokens: 50,
        },
      };

      const analytics = createAnalytics("openai", "o1-mini", result, 200);

      expect(analytics.tokenUsage.reasoning).toBe(50);
    });

    it("should extract thinking tokens (thinkingTokens format)", () => {
      const result = {
        usage: {
          promptTokens: 100,
          completionTokens: 200,
          thinkingTokens: 80,
        },
      };

      const analytics = createAnalytics(
        "anthropic",
        "claude-3-7-sonnet",
        result,
        200,
      );

      expect(analytics.tokenUsage.reasoning).toBe(80);
    });

    it("should extract reasoning tokens (reasoning_tokens format)", () => {
      const result = {
        usage: {
          promptTokens: 100,
          completionTokens: 180,
          reasoning_tokens: 60,
        },
      };

      const analytics = createAnalytics(
        "google-ai",
        "gemini-2.5-pro",
        result,
        200,
      );

      expect(analytics.tokenUsage.reasoning).toBe(60);
    });
  });
});
