/**
 * Memory retrieval tools for LLM access to conversation history.
 * Enables the AI to retrieve full tool outputs, review previous messages,
 * and search conversation memory.
 *
 * Follows the createFileTools() factory pattern from files/fileTools.ts.
 * @module
 */

import { tool } from "ai";
import { z } from "zod";
import type { RedisConversationMemoryManager } from "../core/redisConversationMemoryManager.js";
import { logger } from "../utils/logger.js";
import {
  SpanSerializer,
  SpanType,
  SpanStatus,
} from "../observability/index.js";
import { getMetricsAggregator } from "../observability/index.js";

/** Maximum characters returned per retrieval request */
const DEFAULT_RETRIEVAL_LIMIT = 50_000;

/** Hard maximum for user/LLM-supplied limit to prevent massive tool outputs */
const MAX_RETRIEVAL_LIMIT = 200_000;

/** Maximum number of search matches returned */
const MAX_SEARCH_MATCHES = 50;

/**
 * Factory function that creates memory retrieval tools bound to a memory manager.
 * @param memoryManager - The Redis conversation memory manager instance
 * @returns Record of tool name to Vercel AI SDK tool definition
 */
export function createMemoryRetrievalTools(
  memoryManager: RedisConversationMemoryManager,
) {
  return {
    retrieve_context: tool({
      description:
        "Retrieve messages from conversation memory. Use this to access full tool " +
        "outputs when a result was truncated, review previous assistant responses, " +
        "or search through conversation history. Supports filtering by role, " +
        "pagination for large content, and regex search within messages.",
      parameters: z.object({
        sessionId: z.string().describe("Session ID for the conversation"),
        messageId: z
          .string()
          .optional()
          .describe("Specific message ID to retrieve"),
        role: z
          .enum(["user", "assistant", "system", "tool_call", "tool_result"])
          .optional()
          .describe("Filter messages by role"),
        lastN: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Retrieve the last N messages matching the filter"),
        offset: z
          .number()
          .int()
          .nonnegative()
          .optional()
          .describe(
            "Character offset for paginated reading of large content (default: 0)",
          ),
        limit: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Max characters to return per message (default: 50000)"),
        search: z
          .string()
          .optional()
          .describe(
            "Regex pattern to search within message content. " +
              "Returns matching lines with line numbers.",
          ),
      }),
      execute: async (args) => {
        const span = SpanSerializer.createSpan(
          SpanType.MEMORY,
          "memory.retrieve",
          {
            "memory.operation": "retrieve",
            "memory.store": "redis",
            "memory.query":
              args.search || args.messageId || `lastN:${args.lastN ?? "all"}`,
          },
        );
        const startTime = Date.now();
        try {
          const conversation = await memoryManager.getSessionRaw(
            args.sessionId,
          );
          if (!conversation) {
            span.durationMs = Date.now() - startTime;
            const endedSpan = SpanSerializer.endSpan(span, SpanStatus.OK);
            getMetricsAggregator().recordSpan(endedSpan);
            return { error: "Session not found", sessionId: args.sessionId };
          }

          let messages = conversation.messages;

          // Filter by specific messageId
          if (args.messageId) {
            const msg = messages.find((m) => m.id === args.messageId);
            if (!msg) {
              span.durationMs = Date.now() - startTime;
              const endedSpan = SpanSerializer.endSpan(span, SpanStatus.OK);
              getMetricsAggregator().recordSpan(endedSpan);
              return { error: "Message not found", messageId: args.messageId };
            }
            messages = [msg];
          }

          // Filter by role
          if (args.role) {
            messages = messages.filter((m) => m.role === args.role);
          }

          // Take last N
          if (args.lastN) {
            messages = messages.slice(-args.lastN);
          }

          const charLimit = Math.min(
            args.limit ?? DEFAULT_RETRIEVAL_LIMIT,
            MAX_RETRIEVAL_LIMIT,
          );

          const results = messages.map((msg) => {
            const content = msg.content ?? "";

            // Search mode: return matching lines with line numbers
            if (args.search) {
              try {
                const pattern = args.search;
                // Validate regex length to mitigate ReDoS from LLM-provided input
                if (pattern.length > 200) {
                  return {
                    id: msg.id,
                    error: "Search pattern too long (max 200 chars)",
                  };
                }
                const regex = new RegExp(pattern, "i"); // no 'g' flag — avoids stateful .test() bug
                const lines = content.split("\n");
                const matches = lines
                  .map((line, i) => ({ line: i + 1, text: line }))
                  .filter((l) => regex.test(l.text))
                  .slice(0, MAX_SEARCH_MATCHES);
                return {
                  id: msg.id,
                  role: msg.role,
                  tool: msg.tool,
                  matchCount: matches.length,
                  matches,
                  totalSize: content.length,
                };
              } catch {
                return { id: msg.id, error: "Invalid regex pattern" };
              }
            }

            // Paginated read mode
            const start = args.offset ?? 0;
            const end = start + charLimit;
            const slice = content.slice(start, end);

            return {
              id: msg.id,
              role: msg.role,
              tool: msg.tool,
              content: slice,
              totalSize: content.length,
              hasMore: end < content.length,
            };
          });

          span.durationMs = Date.now() - startTime;
          const endedSpan = SpanSerializer.endSpan(span, SpanStatus.OK);
          getMetricsAggregator().recordSpan(endedSpan);

          return { messages: results, totalMessages: results.length };
        } catch (error) {
          span.durationMs = Date.now() - startTime;
          const endedSpan = SpanSerializer.endSpan(span, SpanStatus.ERROR);
          endedSpan.statusMessage =
            error instanceof Error ? error.message : String(error);
          getMetricsAggregator().recordSpan(endedSpan);

          logger.error("[MemoryRetrievalTools] Error retrieving context", {
            error: error instanceof Error ? error.message : String(error),
          });
          return { error: "Failed to retrieve context" };
        }
      },
    }),
  };
}
