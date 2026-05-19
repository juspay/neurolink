import { SpanStatusCode } from "@opentelemetry/api";
import { z } from "zod";
import type { RedisConversationMemoryManager } from "../core/redisConversationMemoryManager.js";
import type { ArtifactStore, Tool } from "../types/index.js";
import { logger } from "../utils/logger.js";
import { withTimeout } from "../utils/errorHandling.js";
import {
  SpanSerializer,
  SpanType,
  SpanStatus,
  getMetricsAggregator,
} from "../observability/index.js";
import { withSpan } from "../telemetry/withSpan.js";
import { tracers } from "../telemetry/tracers.js";
import { tool } from "../utils/tool.js";

/** Maximum characters returned per retrieval request */
const DEFAULT_RETRIEVAL_LIMIT = 50_000;

/** Hard maximum for user/LLM-supplied limit to prevent massive tool outputs */
const MAX_RETRIEVAL_LIMIT = 200_000;

/** Maximum number of search matches returned */
const MAX_SEARCH_MATCHES = 50;

/**
 * Factory function that creates memory retrieval tools bound to a memory manager.
 *
 * @param memoryManager  Redis conversation memory manager instance.
 * @param artifactStore  Optional artifact store for externalized MCP outputs.
 *                       When provided, retrieve_context gains an `artifactId`
 *                       parameter that fetches the full payload written by
 *                       McpOutputNormalizer under strategy="externalize".
 * @returns Record of tool name to Vercel AI SDK tool definition
 */
export function createMemoryRetrievalTools(
  memoryManager: RedisConversationMemoryManager | undefined,
  artifactStore?: ArtifactStore,
): Record<string, Tool> {
  return {
    retrieve_context: tool({
      description:
        "Retrieve messages from conversation memory, or fetch the full payload of " +
        "an externalized MCP tool output by artifact ID. Use this to:\n" +
        "• Access full tool outputs when a result was truncated or externalized\n" +
        "• Review previous assistant responses\n" +
        "• Search through conversation history\n" +
        "Supports filtering by role, pagination for large content, and regex search.\n" +
        "To fetch an externalized artifact, provide `artifactId` (omit sessionId).",
      inputSchema: z.object({
        sessionId: z
          .string()
          .optional()
          .describe(
            "Session ID for conversation history retrieval. " +
              "Required unless artifactId is provided.",
          ),
        artifactId: z
          .string()
          .optional()
          .describe(
            "Artifact ID from an externalized MCP tool output " +
              "(visible in the tool output as neurolinkArtifactId=<id>). " +
              "When provided, returns the full stored payload directly.",
          ),
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
      execute: async (args) =>
        withSpan(
          {
            name: "neurolink.memory.retrieve_context",
            tracer: tracers.memory,
            attributes: {
              "memory.operation": args.artifactId
                ? "artifact.fetch"
                : "session.retrieve",
              "memory.has_artifact_id": Boolean(args.artifactId),
              "memory.has_session_id": Boolean(args.sessionId),
              "memory.role": args.role ?? "any",
              "memory.search": Boolean(args.search),
            },
          },
          async (otelSpan) =>
            executeRetrieveContext(
              args,
              memoryManager,
              artifactStore,
              otelSpan,
            ),
        ),
    }),
  };
}

async function executeRetrieveContext(
  args: {
    sessionId?: string;
    artifactId?: string;
    messageId?: string;
    role?: "user" | "assistant" | "system" | "tool_call" | "tool_result";
    lastN?: number;
    offset?: number;
    limit?: number;
    search?: string;
  },
  memoryManager: RedisConversationMemoryManager | undefined,
  artifactStore: ArtifactStore | undefined,
  otelSpan: import("@opentelemetry/api").Span,
) {
  // ── Artifact resolution path ────────────────────────────────────────
  // When the caller supplies an artifactId we short-circuit to the
  // artifact store (bypassing Redis) and return the full payload with
  // optional offset/limit pagination.
  if (args.artifactId) {
    if (!artifactStore) {
      logger.warn(
        "[MemoryRetrievalTools] retrieve_context called with artifactId " +
          "but no ArtifactStore is configured",
      );
      otelSpan.setStatus({
        code: SpanStatusCode.ERROR,
        message: "Artifact store not configured",
      });
      return {
        error:
          "Artifact store not configured — " +
          "mcp.outputLimits.strategy must be set to 'externalize' to use artifactId retrieval",
        artifactId: args.artifactId,
      };
    }
    const content = await withTimeout(
      artifactStore.retrieve(args.artifactId),
      10_000,
      new Error(
        `ArtifactStore.retrieve() timed out for artifact "${args.artifactId}"`,
      ),
    );
    if (content === null) {
      otelSpan.setStatus({
        code: SpanStatusCode.ERROR,
        message: "Artifact not found or has expired",
      });
      return {
        error: "Artifact not found or has expired",
        artifactId: args.artifactId,
      };
    }
    const charLimit = Math.min(
      args.limit ?? DEFAULT_RETRIEVAL_LIMIT,
      MAX_RETRIEVAL_LIMIT,
    );
    const start = args.offset ?? 0;
    const slice = content.slice(start, start + charLimit);
    otelSpan.setAttribute("memory.artifact_size", content.length);
    otelSpan.setAttribute("memory.returned_bytes", slice.length);
    return {
      artifactId: args.artifactId,
      content: slice,
      totalSize: content.length,
      hasMore: start + charLimit < content.length,
      offset: start,
      limit: charLimit,
    };
  }
  // ── End artifact resolution ─────────────────────────────────────────

  if (!args.sessionId) {
    otelSpan.setStatus({
      code: SpanStatusCode.ERROR,
      message: "sessionId is required when artifactId is not provided",
    });
    return {
      error: "sessionId is required when artifactId is not provided",
    };
  }

  if (!memoryManager) {
    otelSpan.setStatus({
      code: SpanStatusCode.ERROR,
      message: "Memory manager not configured",
    });
    return {
      error:
        "Session history retrieval requires Redis conversation memory — " +
        "enable mcp.conversationMemory with a Redis backend, or use " +
        "artifactId to retrieve an externalized MCP tool output.",
    };
  }

  const span = SpanSerializer.createSpan(SpanType.MEMORY, "memory.retrieve", {
    "memory.operation": "retrieve",
    "memory.store": "redis",
    "memory.query":
      args.search || args.messageId || `lastN:${args.lastN ?? "all"}`,
  });
  const startTime = Date.now();
  // args.sessionId is guaranteed non-null here — we returned early above
  // when it was missing. Cast via string coercion to satisfy eslint.
  const sessionId = String(args.sessionId);
  try {
    const conversation = await withTimeout(
      memoryManager.getSessionRaw(sessionId),
      10_000,
      new Error(`getSessionRaw() timed out for session "${sessionId}"`),
    );
    if (!conversation) {
      const endedSpan = SpanSerializer.endSpan(
        span,
        SpanStatus.ERROR,
        `Session not found: ${sessionId}`,
      );
      getMetricsAggregator().recordSpan(endedSpan);
      return { error: "Session not found", sessionId };
    }

    let messages = conversation.messages;

    // Filter by specific messageId
    if (args.messageId) {
      const msg = messages.find((m) => m.id === args.messageId);
      if (!msg) {
        const endedSpan = SpanSerializer.endSpan(
          span,
          SpanStatus.ERROR,
          `Message not found: ${args.messageId}`,
        );
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
          // Treat user input as literal search to prevent ReDoS.
          // Regex metacharacters are escaped so patterns like "foo|bar" match literally.
          const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const regex = new RegExp(escaped, "i");
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

    otelSpan.setAttribute("memory.message_count", results.length);

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
    otelSpan.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : String(error),
    });
    otelSpan.recordException(
      error instanceof Error ? error : new Error(String(error)),
    );
    return { error: "Failed to retrieve context" };
  }
}
