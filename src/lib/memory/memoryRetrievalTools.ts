import { SpanStatusCode } from "@opentelemetry/api";
import { z } from "zod";
import type { ConversationMemoryManager } from "../core/conversationMemoryManager.js";
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
import {
  MAX_ARTIFACT_SEARCH_MATCHES,
  readArtifactWindow,
  searchArtifactContent,
  validateSearchPattern,
} from "../artifacts/artifactReader.js";

/** Maximum characters returned per retrieval request */
const DEFAULT_RETRIEVAL_LIMIT = 50_000;

/** Hard maximum for user/LLM-supplied limit to prevent massive tool outputs */
const MAX_RETRIEVAL_LIMIT = 200_000;

/** Maximum number of search matches returned */
const MAX_SEARCH_MATCHES = 50;

/** Bound on one artifact backend round trip, so a stalled store never hangs the tool. */
const ARTIFACT_READ_TIMEOUT_MS = 10_000;

/**
 * Factory function that creates memory retrieval tools bound to a memory manager.
 *
 * @param memoryManager  Conversation memory manager instance. Session history
 *                       retrieval requires the Redis-backed manager; with the
 *                       in-memory manager the tool returns a descriptive error.
 * @param artifactStore  Optional artifact store for externalized MCP outputs.
 *                       When provided, retrieve_context gains an `artifactId`
 *                       parameter that fetches the full payload written by
 *                       McpOutputNormalizer under strategy="externalize".
 * @returns Record of tool name to Vercel AI SDK tool definition
 */
export function createMemoryRetrievalTools(
  memoryManager:
    | ConversationMemoryManager
    | RedisConversationMemoryManager
    | undefined,
  artifactStore?: ArtifactStore,
): Record<string, Tool> {
  return {
    retrieve_context: tool({
      description:
        "Retrieve messages from conversation memory, or read an externalized " +
        "tool output / banked payload by artifact ID. Use this to:\n" +
        "• Access full tool outputs when a result was truncated or externalized\n" +
        "• Review previous assistant responses\n" +
        "• Search a session's history, or an artifact, for literal text\n" +
        "Supports filtering by role, offset/limit pagination for large content, " +
        "and case-insensitive literal search (not regex).\n" +
        "To read an artifact, provide `artifactId` (omit sessionId): pass " +
        "`offset`/`limit` to page, or `search` to get match offsets and jump " +
        "straight to them instead of paging.",
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
              "(visible in the tool output as neurolinkArtifactId=<id>) or a " +
              "banked payload. When provided, reads the stored payload: a " +
              "window at `offset`/`limit`, or with `search`, the matches.",
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
            "Case-insensitive literal text to find (regex metacharacters are " +
              "matched literally). Session history: returns matching lines " +
              "with line numbers. Artifact: returns up to " +
              `${MAX_ARTIFACT_SEARCH_MATCHES} matches, each with the character ` +
              "`offset` of the hit and a short snippet — pass that offset back " +
              "as `offset` to read around it. With `offset`, the artifact " +
              "search starts there; use `nextSearchOffset` to continue.",
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
  memoryManager:
    | ConversationMemoryManager
    | RedisConversationMemoryManager
    | undefined,
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
          "Artifact store not configured — this instance has never banked " +
          "or externalized anything, so there is no artifact to read",
        artifactId: args.artifactId,
      };
    }
    return executeArtifactRetrieval(
      args.artifactId,
      args,
      artifactStore,
      otelSpan,
    );
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

  // getSessionRaw exists only on the Redis-backed manager. A truthy manager
  // can still be the in-memory one (tool registered for an artifact store, or
  // Redis init fell back to in-memory), so guard on capability — not just
  // presence — instead of throwing "getSessionRaw is not a function".
  if (!memoryManager || !("getSessionRaw" in memoryManager)) {
    otelSpan.setStatus({
      code: SpanStatusCode.ERROR,
      message: memoryManager
        ? "Conversation memory backend is not Redis"
        : "Memory manager not configured",
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

/**
 * The artifact branch of `retrieve_context`.
 *
 * Two modes, chosen by `search`:
 *  - Paged read: one window through `readArtifactWindow`, which lets a backend
 *    with range reads move only the window. `hasMore` comes from the window's
 *    `totalLength`, so it never needs the payload either.
 *  - Search: the whole payload is read once and scanned for the literal
 *    pattern; the model gets match offsets and bounded snippets and can jump
 *    straight to the hit with `offset` instead of paging to it. Before this
 *    branch existed `search` was accepted and silently ignored here, and a
 *    model could not tell — an unfiltered window looks like "no matches".
 *
 * Backend failures (a Redis outage, a timeout) are reported as errors, never
 * as "not found": those are different facts and the model acts differently on
 * each.
 */
async function executeArtifactRetrieval(
  artifactId: string,
  args: { offset?: number; limit?: number; search?: string },
  artifactStore: ArtifactStore,
  otelSpan: import("@opentelemetry/api").Span,
) {
  const notFound = () => {
    otelSpan.setStatus({
      code: SpanStatusCode.ERROR,
      message: "Artifact not found or has expired",
    });
    return { error: "Artifact not found or has expired", artifactId };
  };

  try {
    if (args.search !== undefined) {
      const invalid = validateSearchPattern(args.search);
      if (invalid) {
        otelSpan.setStatus({ code: SpanStatusCode.ERROR, message: invalid });
        return { error: invalid, artifactId };
      }
      // A search has to see the whole payload; the window contract is for reads.
      const content = await withTimeout(
        artifactStore.retrieve(artifactId),
        ARTIFACT_READ_TIMEOUT_MS,
        new Error(
          `ArtifactStore.retrieve() timed out for artifact "${artifactId}"`,
        ),
      );
      if (content === null) {
        return notFound();
      }
      const result = searchArtifactContent(content, args.search, {
        from: args.offset,
      });
      otelSpan.setAttribute("memory.artifact_size", content.length);
      otelSpan.setAttribute("memory.search_matches", result.totalMatches);
      return {
        artifactId,
        search: args.search,
        totalSize: content.length,
        ...result,
      };
    }

    const charLimit = Math.min(
      args.limit ?? DEFAULT_RETRIEVAL_LIMIT,
      MAX_RETRIEVAL_LIMIT,
    );
    const start = Math.max(0, args.offset ?? 0);
    const window = await withTimeout(
      readArtifactWindow(artifactStore, artifactId, {
        offset: start,
        limit: charLimit,
      }),
      ARTIFACT_READ_TIMEOUT_MS,
      new Error(`Artifact read timed out for artifact "${artifactId}"`),
    );
    if (window === null) {
      return notFound();
    }
    otelSpan.setAttribute("memory.artifact_size", window.totalLength);
    otelSpan.setAttribute("memory.returned_bytes", window.content.length);
    otelSpan.setAttribute(
      "memory.artifact_range_read",
      typeof artifactStore.retrieveRange === "function",
    );
    return {
      artifactId,
      content: window.content,
      totalSize: window.totalLength,
      hasMore: window.offset + window.content.length < window.totalLength,
      offset: window.offset,
      limit: charLimit,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("[MemoryRetrievalTools] Artifact read failed", {
      artifactId,
      error: message,
    });
    otelSpan.setStatus({ code: SpanStatusCode.ERROR, message });
    return { error: `Artifact read failed: ${message}`, artifactId };
  }
}
