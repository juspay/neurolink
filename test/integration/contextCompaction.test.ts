/**
 * Context Compaction Integration Tests
 *
 * Tests the full compaction pipeline including:
 * - Budget checking
 * - Multi-stage compaction (prune -> dedup -> summarize -> truncate)
 * - Error detection
 * - Tool pair repair
 * - Effective history filtering
 */

import { describe, expect, it } from "vitest";
import { checkContextBudget } from "../../src/lib/context/budgetChecker.js";
import { ContextCompactor } from "../../src/lib/context/contextCompactor.js";
import { getEffectiveHistory } from "../../src/lib/context/effectiveHistory.js";
import { isContextOverflowError } from "../../src/lib/context/errorDetection.js";
import { repairToolPairs } from "../../src/lib/context/toolPairRepair.js";
import type { ChatMessage } from "../../src/lib/types/conversation.js";

function makeConversation(turnCount: number, contentSize = 500): ChatMessage[] {
  const messages: ChatMessage[] = [];
  for (let i = 0; i < turnCount; i++) {
    messages.push({
      id: `user-${i}`,
      role: "user",
      content: `User message ${i}: ${"x".repeat(contentSize)}`,
      timestamp: new Date(Date.now() - (turnCount - i) * 60000).toISOString(),
    });
    messages.push({
      id: `assistant-${i}`,
      role: "assistant",
      content: `Assistant response ${i}: ${"y".repeat(contentSize)}`,
      timestamp: new Date(
        Date.now() - (turnCount - i) * 60000 + 30000,
      ).toISOString(),
    });
  }
  return messages;
}

function makeToolHeavyConversation(turnCount: number): ChatMessage[] {
  const messages: ChatMessage[] = [];
  for (let i = 0; i < turnCount; i++) {
    messages.push({
      id: `user-${i}`,
      role: "user",
      content: `User request ${i}`,
      timestamp: new Date().toISOString(),
    });
    messages.push({
      id: `tool-call-${i}`,
      role: "tool_call",
      content: `Calling read_file for src/file${i}.ts`,
      tool: "read_file",
      timestamp: new Date().toISOString(),
    });
    messages.push({
      id: `tool-result-${i}`,
      role: "tool_result",
      content: `read_file 'src/file${i % 3}.ts'\n${"z".repeat(5000)}`, // Some files repeat
      tool: "read_file",
      timestamp: new Date().toISOString(),
    });
    messages.push({
      id: `assistant-${i}`,
      role: "assistant",
      content: `Here's what I found in the file: ${"w".repeat(200)}`,
      timestamp: new Date().toISOString(),
    });
  }
  return messages;
}

describe("Context Compaction Integration", () => {
  describe("Full Pipeline", () => {
    it("should compact a long conversation to fit within budget", async () => {
      const messages = makeConversation(200, 1000);
      const compactor = new ContextCompactor({
        enableSummarize: false, // Skip LLM for test
        provider: "openai",
      });

      // Budget for GPT-4 (small context)
      const budget = checkContextBudget({
        provider: "openai",
        model: "gpt-4",
        conversationMessages: messages as Array<{
          role: string;
          content: string;
        }>,
      });

      expect(budget.shouldCompact).toBe(true);
      expect(budget.usageRatio).toBeGreaterThan(1);

      const result = await compactor.compact(
        messages,
        budget.availableInputTokens,
      );
      expect(result.compacted).toBe(true);
      expect(result.tokensSaved).toBeGreaterThan(0);
      expect(result.messages.length).toBeLessThan(messages.length);
    });

    it("should cascade through prune -> dedup -> truncate for tool-heavy conversations", async () => {
      const messages = makeToolHeavyConversation(30);
      const compactor = new ContextCompactor({
        enableSummarize: false,
        pruneProtectTokens: 5_000,
        pruneMinimumSavings: 100,
        truncationFraction: 0.5,
        provider: "openai",
      });

      const result = await compactor.compact(messages, 5_000);
      expect(result.compacted).toBe(true);
      expect(result.stagesUsed.length).toBeGreaterThan(0);
    });

    it("should produce valid message arrays after compaction", async () => {
      const messages = makeToolHeavyConversation(20);
      const compactor = new ContextCompactor({
        enableSummarize: false,
        pruneProtectTokens: 1_000,
        pruneMinimumSavings: 100,
      });

      const result = await compactor.compact(messages, 5_000);

      // Repair tool pairs
      const repaired = repairToolPairs(result.messages);

      // Verify all tool_calls have corresponding tool_results
      for (let i = 0; i < repaired.messages.length; i++) {
        const msg = repaired.messages[i];
        if (msg.role === "tool_call") {
          const next = repaired.messages[i + 1];
          expect(next).toBeDefined();
          expect(next.role).toBe("tool_result");
        }
      }
    });

    it("should not compact when conversation fits within budget", async () => {
      const messages = makeConversation(5, 100);
      const compactor = new ContextCompactor({
        enableSummarize: false,
        provider: "anthropic",
      });

      // Large budget that easily fits small conversation
      const result = await compactor.compact(messages, 100_000);
      expect(result.compacted).toBe(false);
      expect(result.stagesUsed).toHaveLength(0);
      expect(result.messages).toEqual(messages);
    });

    it("should preserve message order after compaction", async () => {
      const messages = makeConversation(50, 500);
      const compactor = new ContextCompactor({
        enableSummarize: false,
        provider: "openai",
      });

      const result = await compactor.compact(messages, 10_000);

      // Verify basic structural integrity
      if (result.compacted && result.messages.length > 1) {
        // After truncation: first pair preserved, then marker, then recent messages
        // The recent messages should be in chronological order relative to each other
        const recentStartIndex = result.messages.findIndex(
          (m) => m.role === "system" && m.metadata?.truncated,
        );

        if (
          recentStartIndex >= 0 &&
          recentStartIndex < result.messages.length - 2
        ) {
          const recentMessages = result.messages.slice(recentStartIndex + 1);
          for (let i = 1; i < recentMessages.length; i++) {
            const prev = recentMessages[i - 1];
            const curr = recentMessages[i];
            if (prev.timestamp && curr.timestamp) {
              const prevTime = new Date(prev.timestamp).getTime();
              const currTime = new Date(curr.timestamp).getTime();
              // Recent messages should maintain order
              expect(currTime).toBeGreaterThanOrEqual(prevTime);
            }
          }
        }
      }
    });
  });

  describe("Budget Checker Integration", () => {
    it("should accurately detect compaction need for Anthropic models", () => {
      const messages = makeConversation(100, 2000);
      const budget = checkContextBudget({
        provider: "anthropic",
        model: "claude-sonnet-4-20250514",
        conversationMessages: messages as Array<{
          role: string;
          content: string;
        }>,
        systemPrompt: "You are a helpful assistant.",
      });

      // 200K context - 35% reserve = 130K available
      // Budget checker returns available input tokens
      expect(budget.availableInputTokens).toBeGreaterThan(100_000);
      expect(typeof budget.usageRatio).toBe("number");
      expect(budget.breakdown.conversationHistory).toBeGreaterThan(0);
    });

    it("should handle Google AI large context window", () => {
      const messages = makeConversation(50, 1000);
      const budget = checkContextBudget({
        provider: "google-ai",
        model: "gemini-2.5-flash",
        conversationMessages: messages as Array<{
          role: string;
          content: string;
        }>,
      });

      // 1M context = lots of headroom
      expect(budget.availableInputTokens).toBeGreaterThan(500_000);
      expect(budget.shouldCompact).toBe(false);
    });

    it("should calculate correct breakdown for complex input", () => {
      const messages = makeConversation(10, 500);
      const budget = checkContextBudget({
        provider: "openai",
        model: "gpt-4o",
        conversationMessages: messages as Array<{
          role: string;
          content: string;
        }>,
        systemPrompt:
          "You are a coding assistant with expertise in TypeScript.",
        currentPrompt: "Explain the factory pattern.",
        toolDefinitions: [
          {
            name: "tool1",
            description: "A test tool with parameters",
            inputSchema: {
              type: "object",
              properties: { query: { type: "string" } },
            },
          },
          {
            name: "tool2",
            description: "Another test tool",
            inputSchema: {
              type: "object",
              properties: { id: { type: "number" } },
            },
          },
          {
            name: "tool3",
            description: "Third test tool for testing",
            inputSchema: {
              type: "object",
              properties: { data: { type: "string" } },
            },
          },
        ],
        fileAttachments: [{ content: "const x = 1;\nconst y = 2;" }],
      });

      expect(budget.breakdown.systemPrompt).toBeGreaterThan(0);
      expect(budget.breakdown.conversationHistory).toBeGreaterThan(0);
      expect(budget.breakdown.currentPrompt).toBeGreaterThan(0);
      // Tool tokens are estimated from JSON.stringify(tool).length / 4 (content-based)
      expect(budget.breakdown.toolDefinitions).toBeGreaterThan(0);
      expect(budget.breakdown.fileAttachments).toBeGreaterThan(0);
    });

    it("should respect custom compaction threshold", () => {
      const messages = makeConversation(20, 1000);

      // Low threshold - should trigger compaction
      const lowThreshold = checkContextBudget({
        provider: "openai",
        model: "gpt-4o",
        conversationMessages: messages as Array<{
          role: string;
          content: string;
        }>,
        compactionThreshold: 0.1,
      });

      // High threshold - should not trigger compaction
      const highThreshold = checkContextBudget({
        provider: "openai",
        model: "gpt-4o",
        conversationMessages: messages as Array<{
          role: string;
          content: string;
        }>,
        compactionThreshold: 0.99,
      });

      expect(lowThreshold.shouldCompact).toBe(true);
      expect(highThreshold.shouldCompact).toBe(false);
    });
  });

  describe("Error Detection Integration", () => {
    it("should detect errors from all major providers", () => {
      const errors = [
        new Error("prompt is too long"),
        new Error("This model's maximum context length is 128000"),
        new Error("exceeds the maximum number of tokens"),
        new Error("content_length_exceeded"),
        new Error("Input is too long"),
        new Error("context length exceeded"),
      ];

      for (const error of errors) {
        expect(isContextOverflowError(error)).toBe(true);
      }
    });

    it("should not false-positive on unrelated errors", () => {
      const errors = [
        new Error("rate limit exceeded"),
        new Error("invalid API key"),
        new Error("model not found"),
        new Error("server error"),
        new Error("network timeout"),
        new Error("authentication failed"),
      ];

      for (const error of errors) {
        expect(isContextOverflowError(error)).toBe(false);
      }
    });

    it("should handle nested error objects", () => {
      // Test object with error.message at top level (matches extractErrorMessage logic)
      const nestedError = {
        error: {
          message: "This model's maximum context length is 128000 tokens",
        },
      };

      expect(isContextOverflowError(nestedError)).toBe(true);

      // Test object with direct message property
      const directError = {
        message: "prompt is too long",
      };

      expect(isContextOverflowError(directError)).toBe(true);
    });

    it("should handle string errors", () => {
      expect(isContextOverflowError("prompt is too long")).toBe(true);
      expect(isContextOverflowError("something else")).toBe(false);
    });
  });

  describe("Tool Pair Repair Integration", () => {
    it("should fix orphaned tool_calls", () => {
      const messages: ChatMessage[] = [
        {
          id: "1",
          role: "user",
          content: "Read the file",
          timestamp: new Date().toISOString(),
        },
        {
          id: "2",
          role: "tool_call",
          content: "read_file src/index.ts",
          tool: "read_file",
          timestamp: new Date().toISOString(),
        },
        // Missing tool_result
        {
          id: "3",
          role: "assistant",
          content: "I read the file",
          timestamp: new Date().toISOString(),
        },
      ];

      const result = repairToolPairs(messages);
      expect(result.repaired).toBe(true);
      expect(result.orphanedCallsFixed).toBe(1);
      expect(result.messages.length).toBe(4); // Original 3 + 1 synthetic result
      expect(result.messages[2].role).toBe("tool_result");
    });

    it("should fix orphaned tool_results", () => {
      const messages: ChatMessage[] = [
        {
          id: "1",
          role: "user",
          content: "Read the file",
          timestamp: new Date().toISOString(),
        },
        // Missing tool_call
        {
          id: "2",
          role: "tool_result",
          content: "File contents here",
          tool: "read_file",
          timestamp: new Date().toISOString(),
        },
        {
          id: "3",
          role: "assistant",
          content: "I read the file",
          timestamp: new Date().toISOString(),
        },
      ];

      const result = repairToolPairs(messages);
      expect(result.repaired).toBe(true);
      expect(result.orphanedResultsFixed).toBe(1);
      expect(result.messages.length).toBe(4); // Original 3 + 1 synthetic call
    });

    it("should not modify valid tool pairs", () => {
      const messages: ChatMessage[] = [
        {
          id: "1",
          role: "user",
          content: "Read the file",
          timestamp: new Date().toISOString(),
        },
        {
          id: "2",
          role: "tool_call",
          content: "read_file src/index.ts",
          tool: "read_file",
          timestamp: new Date().toISOString(),
        },
        {
          id: "3",
          role: "tool_result",
          content: "File contents here",
          tool: "read_file",
          timestamp: new Date().toISOString(),
        },
        {
          id: "4",
          role: "assistant",
          content: "I read the file",
          timestamp: new Date().toISOString(),
        },
      ];

      const result = repairToolPairs(messages);
      expect(result.repaired).toBe(false);
      expect(result.orphanedCallsFixed).toBe(0);
      expect(result.orphanedResultsFixed).toBe(0);
      expect(result.messages).toBe(messages); // Same reference when not repaired
    });
  });

  describe("Effective History Integration", () => {
    it("should filter out condensed messages", () => {
      const messages: ChatMessage[] = [
        {
          id: "summary-1",
          role: "system",
          content: "Summary of first 10 messages",
          condenseId: "summary-1",
          metadata: { isSummary: true },
          timestamp: new Date().toISOString(),
        },
        {
          id: "condensed-1",
          role: "user",
          content: "Old message 1",
          condenseParent: "summary-1",
          timestamp: new Date().toISOString(),
        },
        {
          id: "condensed-2",
          role: "assistant",
          content: "Old response 1",
          condenseParent: "summary-1",
          timestamp: new Date().toISOString(),
        },
        {
          id: "recent-1",
          role: "user",
          content: "Recent message",
          timestamp: new Date().toISOString(),
        },
        {
          id: "recent-2",
          role: "assistant",
          content: "Recent response",
          timestamp: new Date().toISOString(),
        },
      ];

      const effective = getEffectiveHistory(messages);

      // Should have: 1 summary + 2 recent (excluding 2 condensed)
      expect(effective.length).toBe(3);
      expect(effective[0].id).toBe("summary-1");
      expect(effective[1].id).toBe("recent-1");
      expect(effective[2].id).toBe("recent-2");
    });

    it("should filter out truncated messages", () => {
      const messages: ChatMessage[] = [
        {
          id: "marker-1",
          role: "system",
          content: "[Earlier messages truncated]",
          truncationId: "trunc-1",
          isTruncationMarker: true,
          timestamp: new Date().toISOString(),
        },
        {
          id: "truncated-1",
          role: "user",
          content: "Very old message",
          truncationParent: "trunc-1",
          timestamp: new Date().toISOString(),
        },
        {
          id: "recent-1",
          role: "user",
          content: "Recent message",
          timestamp: new Date().toISOString(),
        },
      ];

      const effective = getEffectiveHistory(messages);

      // Should have: 1 marker + 1 recent (excluding 1 truncated)
      expect(effective.length).toBe(2);
      expect(effective[0].isTruncationMarker).toBe(true);
      expect(effective[1].id).toBe("recent-1");
    });

    it("should work with compacted messages containing tags", async () => {
      const messages = makeConversation(20, 500);

      // Simulate condensation tags
      const condensed = messages.map((msg, i) => {
        if (i < 10) {
          return { ...msg, condenseParent: "summary-1" };
        }
        return msg;
      });

      // Add summary message
      const withSummary: ChatMessage[] = [
        {
          id: "summary-1",
          role: "system",
          content: "Summary of first 10 messages",
          condenseId: "summary-1",
          metadata: { isSummary: true },
          timestamp: new Date().toISOString(),
        },
        ...condensed,
      ];

      const effective = getEffectiveHistory(withSummary);

      // Should have: 1 summary + 30 uncondensed (messages 10-39)
      expect(effective.length).toBe(31);
      expect(effective[0].metadata?.isSummary).toBe(true);
    });
  });

  describe("End-to-End Scenario", () => {
    it("should handle a realistic conversation lifecycle", async () => {
      // Phase 1: Small conversation - no compaction needed
      let messages = makeConversation(5, 200);
      let budget = checkContextBudget({
        provider: "anthropic",
        model: "claude-sonnet-4-20250514",
        conversationMessages: messages as Array<{
          role: string;
          content: string;
        }>,
      });
      expect(budget.shouldCompact).toBe(false);

      // Phase 2: Conversation grows - still within budget for large context
      messages = makeConversation(50, 500);
      budget = checkContextBudget({
        provider: "anthropic",
        model: "claude-sonnet-4-20250514",
        conversationMessages: messages as Array<{
          role: string;
          content: string;
        }>,
      });
      // 50 turns * 2 msgs * ~500 chars = ~50K chars = ~15K tokens
      // Claude has 130K available, so should not need compaction
      expect(budget.usageRatio).toBeLessThan(0.8);

      // Phase 3: Very long conversation - definitely needs compaction
      messages = makeConversation(500, 1000);
      budget = checkContextBudget({
        provider: "anthropic",
        model: "claude-sonnet-4-20250514",
        conversationMessages: messages as Array<{
          role: string;
          content: string;
        }>,
      });
      expect(budget.shouldCompact).toBe(true);

      // Phase 4: Compact and verify
      const compactor = new ContextCompactor({
        enableSummarize: false,
        provider: "anthropic",
      });
      const result = await compactor.compact(
        messages,
        budget.availableInputTokens,
      );
      expect(result.compacted).toBe(true);
      expect(result.tokensSaved).toBeGreaterThan(10_000);

      // Phase 5: After compaction, budget should be better
      const postBudget = checkContextBudget({
        provider: "anthropic",
        model: "claude-sonnet-4-20250514",
        conversationMessages: result.messages as Array<{
          role: string;
          content: string;
        }>,
      });
      expect(postBudget.usageRatio).toBeLessThan(budget.usageRatio);
    });

    it("should handle tool-heavy coding session", async () => {
      // Simulate a coding session with lots of file reads
      const messages = makeToolHeavyConversation(50);

      // Use smaller budget model to force compaction
      const budget = checkContextBudget({
        provider: "openai",
        model: "gpt-4", // 8K context - will definitely need compaction
        conversationMessages: messages as Array<{
          role: string;
          content: string;
        }>,
        toolDefinitions: [{}, {}, {}, {}, {}], // 5 tools
      });

      // Compact with aggressive settings
      const compactor = new ContextCompactor({
        enableSummarize: false,
        enablePrune: true,
        enableDeduplicate: true,
        enableTruncate: true,
        pruneProtectTokens: 1_000,
        pruneMinimumSavings: 500,
        truncationFraction: 0.5,
        provider: "openai",
      });

      const result = await compactor.compact(
        messages,
        budget.availableInputTokens,
      );

      // With 50 turns of tool-heavy conversation and 8K context, compaction should happen
      expect(budget.shouldCompact).toBe(true);
      expect(result.compacted).toBe(true);
      expect(result.tokensSaved).toBeGreaterThan(0);

      // Repair any orphaned tool pairs
      const repaired = repairToolPairs(result.messages);

      // Verify structural integrity
      let consecutiveToolResults = 0;
      for (const msg of repaired.messages) {
        if (msg.role === "tool_result") {
          consecutiveToolResults++;
        } else {
          consecutiveToolResults = 0;
        }
        // Should not have more than 1 tool_result in a row without a tool_call
        expect(consecutiveToolResults).toBeLessThanOrEqual(1);
      }
    });

    it("should work across different providers with different context windows", async () => {
      const providers = [
        { provider: "openai", model: "gpt-4" }, // 8K context
        { provider: "openai", model: "gpt-4o" }, // 128K context
        { provider: "anthropic", model: "claude-sonnet-4-20250514" }, // 200K context
        { provider: "google-ai", model: "gemini-2.5-flash" }, // 1M context
      ];

      const messages = makeConversation(100, 500);

      for (const { provider, model } of providers) {
        const budget = checkContextBudget({
          provider,
          model,
          conversationMessages: messages as Array<{
            role: string;
            content: string;
          }>,
        });

        const compactor = new ContextCompactor({
          enableSummarize: false,
          provider,
        });

        const result = await compactor.compact(
          messages,
          budget.availableInputTokens,
        );

        // Small context models should need compaction
        if (model === "gpt-4") {
          expect(budget.shouldCompact).toBe(true);
          expect(result.compacted).toBe(true);
        }

        // Large context models may not need compaction
        if (model === "gemini-2.5-flash") {
          expect(budget.shouldCompact).toBe(false);
          expect(result.compacted).toBe(false);
        }
      }
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty message array", async () => {
      const compactor = new ContextCompactor({ enableSummarize: false });
      const result = await compactor.compact([], 10_000);

      expect(result.compacted).toBe(false);
      expect(result.messages).toHaveLength(0);
    });

    it("should handle single message", async () => {
      const messages: ChatMessage[] = [
        {
          id: "1",
          role: "user",
          content: "Hello",
          timestamp: new Date().toISOString(),
        },
      ];

      const compactor = new ContextCompactor({ enableSummarize: false });
      const result = await compactor.compact(messages, 10_000);

      expect(result.messages).toHaveLength(1);
    });

    it("should handle very small target budget", async () => {
      const messages = makeConversation(10, 500);
      const compactor = new ContextCompactor({
        enableSummarize: false,
        enableTruncate: true,
        truncationFraction: 0.9, // Aggressive truncation
      });

      // Very small budget forces aggressive compaction
      const result = await compactor.compact(messages, 100);

      expect(result.compacted).toBe(true);
      expect(result.messages.length).toBeLessThan(messages.length);
    });

    it("should handle messages with no timestamps", async () => {
      const messages: ChatMessage[] = [
        { id: "1", role: "user", content: "Hello" },
        { id: "2", role: "assistant", content: "Hi there!" },
        { id: "3", role: "user", content: "How are you?" },
        { id: "4", role: "assistant", content: "I am fine, thanks!" },
      ];

      const compactor = new ContextCompactor({ enableSummarize: false });
      const result = await compactor.compact(messages, 50);

      // Should still work without timestamps
      expect(result).toBeDefined();
      expect(result.messages).toBeDefined();
    });

    it("should handle messages with very long content", async () => {
      // Need at least 5 messages for truncation to work (check in slidingWindowTruncator)
      const messages: ChatMessage[] = [
        {
          id: "1",
          role: "user",
          content: "x".repeat(50_000),
          timestamp: new Date().toISOString(),
        },
        {
          id: "2",
          role: "assistant",
          content: "y".repeat(50_000),
          timestamp: new Date().toISOString(),
        },
        {
          id: "3",
          role: "user",
          content: "z".repeat(50_000),
          timestamp: new Date().toISOString(),
        },
        {
          id: "4",
          role: "assistant",
          content: "a".repeat(50_000),
          timestamp: new Date().toISOString(),
        },
        {
          id: "5",
          role: "user",
          content: "b".repeat(50_000),
          timestamp: new Date().toISOString(),
        },
        {
          id: "6",
          role: "assistant",
          content: "c".repeat(50_000),
          timestamp: new Date().toISOString(),
        },
      ];

      const compactor = new ContextCompactor({
        enableSummarize: false,
        enableTruncate: true,
        truncationFraction: 0.5,
        provider: "openai",
      });

      const result = await compactor.compact(messages, 10_000);

      expect(result.compacted).toBe(true);
      expect(result.tokensSaved).toBeGreaterThan(0);
    });
  });
});
