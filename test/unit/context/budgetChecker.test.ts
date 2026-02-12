import { describe, expect, it } from "vitest";
import {
  type BudgetCheckResult,
  checkContextBudget,
} from "../../../src/lib/context/budgetChecker.js";

describe("Context Budget Checker", () => {
  describe("checkContextBudget", () => {
    it("should report within budget for small requests", () => {
      const result = checkContextBudget({
        provider: "anthropic",
        model: "claude-sonnet-4-20250514",
        currentPrompt: "Hello, world!",
      });

      expect(result.withinBudget).toBe(true);
      expect(result.shouldCompact).toBe(false);
      expect(result.usageRatio).toBeLessThan(0.01);
      expect(result.availableInputTokens).toBe(136_000);
    });

    it("should detect when compaction is needed", () => {
      // Create a conversation that's large enough to exceed 80% of available input
      const largeMessages = Array.from({ length: 500 }, (_, i) => ({
        role: i % 2 === 0 ? "user" : "assistant",
        content: "x".repeat(1000), // ~250 tokens each
      }));

      const result = checkContextBudget({
        provider: "anthropic",
        model: "claude-sonnet-4-20250514",
        conversationMessages: largeMessages,
      });

      expect(result.shouldCompact).toBe(true);
      expect(result.usageRatio).toBeGreaterThanOrEqual(0.8);
    });

    it("should include system prompt in budget", () => {
      const withSystem = checkContextBudget({
        provider: "openai",
        model: "gpt-4o",
        systemPrompt: "You are a helpful assistant. ".repeat(100),
        currentPrompt: "Hello",
      });

      const withoutSystem = checkContextBudget({
        provider: "openai",
        model: "gpt-4o",
        currentPrompt: "Hello",
      });

      expect(withSystem.estimatedInputTokens).toBeGreaterThan(
        withoutSystem.estimatedInputTokens,
      );
      expect(withSystem.breakdown.systemPrompt).toBeGreaterThan(0);
      expect(withoutSystem.breakdown.systemPrompt).toBe(0);
    });

    it("should include tool definitions in budget", () => {
      const tools = Array.from({ length: 20 }, (_, i) => ({
        name: `tool_${i}`,
        description: "A test tool",
      }));

      const result = checkContextBudget({
        provider: "anthropic",
        model: "claude-sonnet-4-20250514",
        toolDefinitions: tools,
        currentPrompt: "Use a tool",
      });

      expect(result.breakdown.toolDefinitions).toBeGreaterThan(0);
      // Content-based estimation: each tool serialized to JSON, tokens = ceil(length / 4)
      const expectedTokens = tools.reduce((sum, tool) => {
        return sum + Math.ceil(JSON.stringify(tool).length / 4);
      }, 0);
      expect(result.breakdown.toolDefinitions).toBe(expectedTokens);
    });

    it("should include file attachments in budget", () => {
      const files = [
        { content: "x".repeat(10_000) },
        { content: "y".repeat(5_000) },
      ];

      const result = checkContextBudget({
        provider: "anthropic",
        model: "claude-sonnet-4-20250514",
        fileAttachments: files,
        currentPrompt: "Analyze these files",
      });

      expect(result.breakdown.fileAttachments).toBeGreaterThan(0);
    });

    it("should provide accurate breakdown", () => {
      const result = checkContextBudget({
        provider: "openai",
        model: "gpt-4o",
        systemPrompt: "System prompt",
        conversationMessages: [
          { role: "user", content: "Previous message" },
          { role: "assistant", content: "Previous response" },
        ],
        currentPrompt: "New question",
        toolDefinitions: [{ name: "tool1" }],
        fileAttachments: [{ content: "file content" }],
      });

      const totalFromBreakdown =
        result.breakdown.systemPrompt +
        result.breakdown.conversationHistory +
        result.breakdown.currentPrompt +
        result.breakdown.toolDefinitions +
        result.breakdown.fileAttachments;

      expect(result.estimatedInputTokens).toBe(totalFromBreakdown);
    });

    it("should handle custom compaction threshold", () => {
      const messages = Array.from({ length: 100 }, (_, i) => ({
        role: i % 2 === 0 ? "user" : "assistant",
        content: "x".repeat(500),
      }));

      const strict = checkContextBudget({
        provider: "openai",
        model: "gpt-4", // 8192 context, small window
        conversationMessages: messages,
        compactionThreshold: 0.5,
      });

      const lenient = checkContextBudget({
        provider: "openai",
        model: "gpt-4",
        conversationMessages: messages,
        compactionThreshold: 0.99,
      });

      // With same data, strict threshold triggers compaction sooner
      if (strict.usageRatio >= 0.5) {
        expect(strict.shouldCompact).toBe(true);
      }
    });

    it("should handle empty inputs gracefully", () => {
      const result = checkContextBudget({
        provider: "anthropic",
        model: "claude-sonnet-4-20250514",
      });

      expect(result.withinBudget).toBe(true);
      expect(result.estimatedInputTokens).toBe(0);
      expect(result.usageRatio).toBe(0);
      expect(result.shouldCompact).toBe(false);
    });

    it("should use global default for unknown providers", () => {
      const result = checkContextBudget({
        provider: "unknown-provider",
        model: "unknown-model",
        currentPrompt: "Hello",
      });

      // DEFAULT_CONTEXT_WINDOW = 128000, 128000 - 44800 reserve = 83200
      expect(result.availableInputTokens).toBe(83_200);
    });
  });
});
