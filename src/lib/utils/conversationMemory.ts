/**
 * Conversation Memory Utilities
 * Handles configuration merging and conversation memory operations
 */

import { SpanKind, SpanStatusCode } from "@opentelemetry/api";
import { tracers } from "../telemetry/tracers.js";
import { withTimeout } from "./errorHandling.js";
import {
  DEFAULT_FALLBACK_THRESHOLD,
  getConversationMemoryDefaults,
  MEMORY_THRESHOLD_PERCENTAGE,
} from "../config/conversationMemory.js";
import { getAvailableInputTokens } from "../constants/contextWindows.js";
import { buildSummarizationPrompt } from "../context/prompts/summarizationPrompt.js";
import type { ConversationMemoryManager } from "../core/conversationMemoryManager.js";
import type { RedisConversationMemoryManager } from "../core/redisConversationMemoryManager.js";
import type { NeuroLink } from "../neurolink.js";
import type {
  ChatMessage,
  ConversationMemoryConfig,
  ProviderDetails,
  SessionMemory,
  StreamEventSequence,
  TextGenerationOptions,
  TextGenerationResult,
} from "../types/index.js";
import { logger } from "./logger.js";

const memoryTracer = tracers.memory;

/**
 * Legacy sentinel string formerly written by the abort branch of
 * handleGenerateTextInternalFailure (Curator SI-069 / SI-071). The producer is
 * removed in this fix, but historical Redis sessions may still contain entries
 * with this content. Filtered at the prompt-builder boundary so they never
 * reach the provider — sessions self-heal on the next read without any
 * migration. Keep in sync with any future renames; do not remove without a
 * cross-repo grep.
 */
export const ABORT_LEGACY_SENTINEL = "[generation was interrupted]";

/**
 * Tracks session IDs that have already emitted the
 * "Dropped polluted assistant turns" warn log so we log once per session
 * (not on every retrieval). The span attribute
 * `neurolink.memory.polluted_turns_dropped` is still set every call, so
 * Langfuse traces show the cleanup happening continuously even after the
 * log is suppressed. Bounded to avoid unbounded growth on busy services —
 * when capacity is reached the set is cleared (cheap) and warning resumes
 * as if those sessions are new, which is acceptable behaviour.
 */
const POLLUTED_WARN_DEDUP_MAX = 1024;
const pollutedWarnedSessions = new Set<string>();

/**
 * True if a stored assistant turn looks like it was carrying tool activity
 * (and is therefore safe to keep even with empty text content). storeTurn
 * paths historically populate one of several fields depending on which
 * provider/codepath wrote it, so this checks all of them. Mirrored across
 * read filter + storage guard for symmetry.
 *
 *   - `msg.events` — stream-path event sequence (`tool:start`, `tool:end`)
 *   - `msg.tool` / `msg.args` — assistant turn that invoked a tool by name
 *   - `msg.result` — tool result attached to the assistant turn
 *
 * If none of these are set, the assistant turn is text-only.
 *
 * Named with the `message` prefix to avoid shadowing the local
 * `hasToolActivity` boolean inside `storeConversationTurn` below — the two
 * answer different questions (one inspects a stored message, the other
 * inspects a live result object).
 */
function messageHasToolActivity(msg: ChatMessage): boolean {
  if (msg.tool || msg.args || msg.result) {
    return true;
  }
  const events = msg.events;
  if (!Array.isArray(events)) {
    return false;
  }
  return events.some((e) => {
    const type = (e as { type?: unknown })?.type;
    return type === "tool:start" || type === "tool:end";
  });
}

/**
 * Decides whether an assistant turn loaded from conversation memory is safe to
 * include in the prompt sent to the provider. Drops:
 *   - empty / whitespace-only text content with no tool activity
 *   - the legacy abort sentinel — but only when the turn carries no tool
 *     activity, mirroring the storeConversationTurn upper-layer guard so a
 *     hypothetical tool-call-then-aborted turn doesn't lose its tool half
 * tool_call and tool_result role messages are always preserved — they
 * legitimately carry empty `content` (see redisConversationMemoryManager.ts:1870
 * "Can be empty for tool calls"). Filtering them would break tool-pair
 * semantics that downstream `repairToolPairs` relies on.
 */
function isPollutedAssistantTurn(msg: ChatMessage): boolean {
  if (msg.role !== "assistant") {
    return false;
  }
  const content = typeof msg.content === "string" ? msg.content : "";
  const trimmed = content.trim();
  if (trimmed === ABORT_LEGACY_SENTINEL) {
    return !messageHasToolActivity(msg);
  }
  if (trimmed === "") {
    return !messageHasToolActivity(msg);
  }
  return false;
}

// Cached NeuroLink instance for summarization to avoid creating a new instance per call
let cachedSummarizer: NeuroLink | null = null;

/**
 * Apply conversation memory defaults to user configuration
 * Merges user config with environment variables and default values
 */
export function applyConversationMemoryDefaults(
  userConfig?: Partial<ConversationMemoryConfig>,
): ConversationMemoryConfig {
  const defaults = getConversationMemoryDefaults();

  return {
    ...defaults,
    ...userConfig,
  };
}

/**
 * Get conversation history as message array, summarizing if needed.
 */
export async function getConversationMessages(
  conversationMemory:
    | ConversationMemoryManager
    | RedisConversationMemoryManager
    | null
    | undefined,
  options: TextGenerationOptions,
): Promise<ChatMessage[]> {
  logger.debug("[conversationMemoryUtils] getConversationMessages called", {
    hasMemory: !!conversationMemory,
    memoryType: conversationMemory?.constructor?.name || "NONE",
    hasContext: !!options.context,
    enableSummarization: options.enableSummarization ?? false,
    options: JSON.stringify(options, null, 2),
  });
  if (!conversationMemory || !options.context) {
    logger.warn(
      "[conversationMemoryUtils] No memory or context, returning empty messages",
      {
        hasMemory: !!conversationMemory,
        memoryType: conversationMemory?.constructor?.name || "NONE",
        hasContext: !!options.context,
        enableSummarization: options.enableSummarization ?? false,
        options: JSON.stringify(options, null, 2),
      },
    );
    return [];
  }

  const sessionId = (options.context as Record<string, unknown>)?.sessionId;
  if (typeof sessionId !== "string" || !sessionId) {
    logger.warn(
      "[conversationMemoryUtils] Invalid or missing sessionId in context",
      {
        sessionIdType: typeof sessionId,
        sessionIdValue: sessionId,
      },
    );
    return [];
  }

  return memoryTracer.startActiveSpan(
    "neurolink.conversation.getMessages",
    {
      kind: SpanKind.INTERNAL,
      attributes: {
        "session.id": sessionId,
        "memory.type": conversationMemory.constructor.name,
      },
    },
    async (span) => {
      try {
        // Extract userId from context
        const userId = (options.context as Record<string, unknown>)?.userId as
          | string
          | undefined;
        if (userId) {
          span.setAttribute("user.id", userId);
        }

        const enableSummarization = options.enableSummarization ?? undefined;
        const rawMessages = await conversationMemory.buildContextMessages(
          sessionId,
          userId,
          enableSummarization,
        );

        // Read-time filter: drop assistant turns that are empty/whitespace or
        // carry the legacy abort sentinel before they reach the provider.
        // Self-heals historical Redis sessions polluted by the now-removed
        // abort-path memory write (Curator SI-069 / SI-071) and defends
        // against any future "fabricate-on-error" regression. Telemetry
        // attributes record how many turns were dropped so polluted sessions
        // are visible in Langfuse traces.
        const messages = rawMessages.filter(
          (msg) => !isPollutedAssistantTurn(msg),
        );
        const droppedCount = rawMessages.length - messages.length;
        if (droppedCount > 0) {
          // Span attribute is always set so polluted sessions stay visible in
          // Langfuse traces on every read — that's the persistent debugging
          // signal. The warn log is deduped per session so a long-lived
          // polluted conversation only generates one log line, not one per
          // turn (would otherwise be noisy at scale).
          span.setAttribute(
            "neurolink.memory.polluted_turns_dropped",
            droppedCount,
          );
          const alreadyWarned = pollutedWarnedSessions.has(sessionId);
          if (!alreadyWarned) {
            if (pollutedWarnedSessions.size >= POLLUTED_WARN_DEDUP_MAX) {
              pollutedWarnedSessions.clear();
            }
            pollutedWarnedSessions.add(sessionId);
            logger.warn(
              "[conversationMemoryUtils] Dropped polluted assistant turns from prompt context (logged once per session — span attribute records every read)",
              {
                sessionId,
                droppedCount,
                remainingCount: messages.length,
              },
            );
          } else {
            logger.debug(
              "[conversationMemoryUtils] Dropped polluted assistant turns (warn already logged for this session)",
              {
                sessionId,
                droppedCount,
                remainingCount: messages.length,
              },
            );
          }
        }

        span.setAttribute("message.count", messages.length);

        if (logger.shouldLog("debug")) {
          logger.debug(
            "[conversationMemoryUtils] Conversation messages retrieved successfully",
            {
              sessionId,
              messageCount: messages.length,
              droppedPollutedCount: droppedCount,
              messageTypes: messages.map((m) => m.role),
            },
          );
        }

        return messages;
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : String(error),
        });
        span.recordException(
          error instanceof Error ? error : new Error(String(error)),
        );
        logger.warn(
          "[conversationMemoryUtils] Failed to get conversation messages",
          {
            sessionId,
            memoryType: conversationMemory.constructor.name,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          },
        );
        return [];
      } finally {
        span.end();
      }
    },
  );
}

/**
 * Store conversation turn for future context
 * Saves user messages and AI responses for conversation memory
 */
export async function storeConversationTurn(
  conversationMemory:
    | ConversationMemoryManager
    | RedisConversationMemoryManager
    | null
    | undefined,
  originalOptions: TextGenerationOptions,
  result: TextGenerationResult,
  startTimeStamp?: Date | undefined,
  requestId?: string,
): Promise<void> {
  logger.debug("[conversationMemoryUtils] storeConversationTurn called", {
    requestId,
    hasMemory: !!conversationMemory,
    memoryType: conversationMemory?.constructor?.name || "NONE",
    hasContext: !!originalOptions.context,
    hasResult: !!result,
    resultContentLength: result?.content?.length || 0,
  });

  if (!conversationMemory || !originalOptions.context) {
    logger.debug(
      "[conversationMemoryUtils] No memory or context, skipping conversation storage",
    );
    return;
  }

  const context = originalOptions.context as Record<string, unknown>;
  const sessionId = context.sessionId;
  const userId =
    typeof context.userId === "string" ? context.userId : undefined;

  logger.debug(
    "[conversationMemoryUtils] Extracted session details from context",
    {
      requestId,
      sessionId,
      userId,
      contextKeys: Object.keys(context),
      hasValidSessionId: typeof sessionId === "string" && !!sessionId,
    },
  );

  if (typeof sessionId !== "string" || !sessionId) {
    logger.warn(
      "[conversationMemoryUtils] Invalid or missing sessionId in context",
      {
        sessionIdType: typeof sessionId,
        sessionIdValue: sessionId,
      },
    );
    return;
  }

  const userMessage =
    originalOptions.originalPrompt || originalOptions.prompt || "";

  const aiResponse = result.content ?? "";

  // Guard: skip storing conversation turn if AI response is empty AND no tools were used.
  // Empty assistant messages cause "text content blocks must be non-empty" errors
  // when loaded as conversation history on the next interaction.
  // However, tool-only turns (empty text but tools were invoked) must still be stored
  // to preserve tool-calling conversation history.
  const hasToolActivity =
    (result.toolsUsed && result.toolsUsed.length > 0) ||
    (result.toolExecutions && result.toolExecutions.length > 0);

  if (!aiResponse.trim() && !hasToolActivity) {
    logger.warn(
      "[conversationMemoryUtils] Skipping conversation turn storage — AI response is empty and no tool activity",
      {
        sessionId,
        userId,
        userMessageLength: userMessage.length,
      },
    );
    return;
  }

  // Belt-and-braces guard against the abort sentinel (Curator SI-069 / SI-071).
  // The abort path itself was fixed in handleGenerateTextInternalFailure to
  // never call this function, but we reject the legacy sentinel here too so a
  // future regression cannot re-introduce the same pollution. Tool-bearing
  // turns are explicitly preserved (the model may call a tool then abort).
  if (aiResponse.trim() === ABORT_LEGACY_SENTINEL && !hasToolActivity) {
    logger.warn(
      "[conversationMemoryUtils] Refusing to store legacy abort sentinel — see Curator SI-069 / SI-071",
      {
        sessionId,
        userId,
        userMessageLength: userMessage.length,
      },
    );
    return;
  }

  let providerDetails: ProviderDetails | undefined;
  if (result.provider && result.model) {
    providerDetails = {
      provider: result.provider,
      model: result.model,
    };
  }

  // Persist a minimal `events` marker only on tool-bearing assistant turns
  // whose surface text would otherwise trigger the read-time filter (empty /
  // whitespace-only content). Turns that already have substantive text are
  // never dropped by isPollutedAssistantTurn, so attaching synthesised events
  // to them would change the stored shape and token estimation for no
  // benefit. Sentinel-content turns never reach this point — the upper-layer
  // guard at line 340 short-circuits them.
  let toolActivityEvents: StreamEventSequence[] | undefined;
  if (hasToolActivity && !aiResponse.trim()) {
    const now = Date.now();
    const usedNames = new Set<string>();
    if (Array.isArray(result.toolsUsed)) {
      for (const t of result.toolsUsed) {
        if (typeof t === "string" && t) {
          usedNames.add(t);
        }
      }
    }
    if (Array.isArray(result.toolExecutions)) {
      for (const exec of result.toolExecutions) {
        const name = (exec as { toolName?: unknown })?.toolName;
        if (typeof name === "string" && name) {
          usedNames.add(name);
        }
      }
    }
    toolActivityEvents = [];
    let seq = 0;
    for (const name of usedNames) {
      // Match the canonical ToolExecutionEvent shape (src/lib/types/tools.ts):
      // `tool` is the required field, `toolName` is the documented compat
      // alias. Populate both so downstream consumers reading either name
      // work uniformly.
      toolActivityEvents.push({
        type: "tool:start",
        seq: seq++,
        timestamp: now,
        tool: name,
        toolName: name,
      });
    }
    if (toolActivityEvents.length === 0) {
      // Tool activity reported but no names extractable — still leave a
      // marker so retrieval doesn't drop the turn. Both `tool` and
      // `toolName` are populated for the same compat reason.
      toolActivityEvents.push({
        type: "tool:start",
        seq: 0,
        timestamp: now,
        tool: "unknown",
        toolName: "unknown",
      });
    }
  }

  await memoryTracer.startActiveSpan(
    "neurolink.conversation.storeTurn",
    {
      kind: SpanKind.INTERNAL,
      attributes: {
        "session.id": sessionId,
        "content.length": userMessage.length + aiResponse.length,
      },
    },
    async (span) => {
      if (userId) {
        span.setAttribute("user.id", userId);
      }
      try {
        await conversationMemory.storeConversationTurn({
          sessionId,
          userId,
          userMessage,
          aiResponse,
          startTimeStamp,
          providerDetails,
          enableSummarization: originalOptions.enableSummarization,
          requestId,
          events: toolActivityEvents,
          tokenUsage: result.usage
            ? {
                inputTokens: result.usage.input,
                outputTokens: result.usage.output,
                totalTokens: result.usage.total,
                cacheReadTokens: result.usage.cacheReadTokens,
                cacheWriteTokens: result.usage.cacheCreationTokens,
              }
            : undefined,
          thoughtSignature: result.thoughtSignature,
        });

        logger.debug(
          "[conversationMemoryUtils] Conversation turn stored successfully",
          {
            requestId,
            sessionId,
            userId,
            memoryType: conversationMemory.constructor.name,
            userMessageLength: userMessage.length,
            aiResponseLength: aiResponse.length,
          },
        );
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : String(error),
        });
        span.recordException(
          error instanceof Error ? error : new Error(String(error)),
        );
        const details = (error as { details?: { error?: string } })?.details;
        logger.warn(
          "[conversationMemoryUtils] Failed to store conversation turn",
          {
            sessionId,
            userId,
            memoryType: conversationMemory.constructor.name,
            error: error instanceof Error ? error.message : String(error),
            innerError: details?.error || "none",
            errorCode: (error as { code?: string })?.code || "unknown",
            stack: error instanceof Error ? error.stack : undefined,
          },
        );
      } finally {
        span.end();
      }
    },
  );
}

/**
 * Build context messages from pointer onwards (token-based memory)
 * Returns summary message (if exists) + all messages after the summarized pointer
 * @param session - Session memory with pointer
 * @returns Context messages to send to LLM
 */
export function buildContextFromPointer(
  session: SessionMemory,
  requestId?: string,
): ChatMessage[] {
  if (!session.summarizedUpToMessageId || !session.summarizedMessage) {
    // Log context built for LLM (no summary)
    const totalChars = session.messages.reduce(
      (sum, msg) => sum + msg.content.length,
      0,
    );
    logger.info("[ConversationMemory] Context built for LLM", {
      requestId,
      sessionId: session.sessionId,
      contextMessages: session.messages.length,
      summaryPrepended: false,
      estimatedTokens: Math.ceil(totalChars / 4),
    });
    return session.messages;
  }

  // find a better way to wirte this
  const pointerIndex = session.messages.findIndex(
    (msg) => msg.id === session.summarizedUpToMessageId,
  );

  if (pointerIndex === -1) {
    logger.warn("Pointer message not found, returning all messages", {
      sessionId: session.sessionId,
      pointer: session.summarizedUpToMessageId,
      totalMessages: session.messages.length,
    });
    // Log context built for LLM (pointer not found fallback)
    const totalChars = session.messages.reduce(
      (sum, msg) => sum + msg.content.length,
      0,
    );
    logger.info("[ConversationMemory] Context built for LLM", {
      requestId,
      sessionId: session.sessionId,
      contextMessages: session.messages.length,
      summaryPrepended: false,
      estimatedTokens: Math.ceil(totalChars / 4),
    });
    return session.messages;
  }

  const messagesAfterPointer = session.messages.slice(pointerIndex + 1);

  // Construct context: summary message + recent messages
  const summaryMessage: ChatMessage = {
    id: `summary-${session.summarizedUpToMessageId}`,
    role: "user",
    content: `[Previous conversation summary]: ${session.summarizedMessage}`,
    timestamp: new Date().toISOString(),
    metadata: {
      isSummary: true,
      summarizesTo: session.summarizedUpToMessageId,
    },
  };

  logger.debug("Building context with summary", {
    sessionId: session.sessionId,
    pointerIndex,
    messagesAfterPointer: messagesAfterPointer.length,
    totalMessages: session.messages.length,
    summaryLength: session.summarizedMessage.length,
  });

  const contextMessages = [summaryMessage, ...messagesAfterPointer];

  // Log context built for LLM with structural metadata
  const totalChars = contextMessages.reduce(
    (sum, msg) => sum + msg.content.length,
    0,
  );
  logger.info("[ConversationMemory] Context built for LLM", {
    requestId,
    sessionId: session.sessionId,
    contextMessages: contextMessages.length,
    summaryPrepended: true,
    estimatedTokens: Math.ceil(totalChars / 4),
  });

  return contextMessages;
}

/**
 * Create summarization prompt from message history
 * Used by both in-memory and Redis conversation managers
 * @param history - Messages to summarize
 * @param previousSummary - Optional previous summary to build upon
 */
export function createSummarizationPrompt(
  history: ChatMessage[],
  previousSummary?: string,
): string {
  const formattedHistory = history
    .map((msg) => `${msg.role}: ${msg.content}`)
    .join("\n\n");

  const structuredPrompt = buildSummarizationPrompt({
    isIncremental: !!previousSummary,
    previousSummary,
  });

  return `${structuredPrompt}

Conversation History to Summarize:
---
${formattedHistory}
---`;
}

/**
 * Calculate token threshold based on model's context window and available input tokens
 * Uses context window registry for accurate per-provider, per-model limits
 * @param provider - AI provider name
 * @param model - Model name
 * @param maxTokens - Optional explicit maxTokens for output reserve calculation
 * @returns Token threshold (80% of available input tokens)
 */
export function calculateTokenThreshold(
  provider?: string,
  model?: string,
  maxTokens?: number,
): number {
  if (!provider) {
    return DEFAULT_FALLBACK_THRESHOLD;
  }

  const availableInput = getAvailableInputTokens(provider, model, maxTokens);

  if (availableInput <= 0) {
    return DEFAULT_FALLBACK_THRESHOLD;
  }

  return Math.floor(availableInput * MEMORY_THRESHOLD_PERCENTAGE);
}

/**
 * Get effective token threshold for a session
 * Priority: session override > env var > model-based (80%) > fallback
 * @param provider - AI provider name
 * @param model - Model name
 * @param envOverride - Environment variable override
 * @param sessionOverride - Per-session token threshold override
 * @returns Effective token threshold
 */
export function getEffectiveTokenThreshold(
  provider: string,
  model: string,
  envOverride?: number,
  sessionOverride?: number,
): number {
  // Priority 1: Session-level override
  if (sessionOverride && sessionOverride > 0) {
    return sessionOverride;
  }

  // Priority 2: Environment variable override
  if (envOverride && envOverride > 0) {
    return envOverride;
  }

  // Priority 3: Model-based calculation (80% of context window)
  try {
    return calculateTokenThreshold(provider, model);
  } catch (error) {
    logger.warn("Failed to calculate effective threshold, using fallback", {
      provider,
      model,
      error: error instanceof Error ? error.message : String(error),
    });
    // Priority 4: Fallback for unknown models
    return DEFAULT_FALLBACK_THRESHOLD;
  }
}

/**
 * Generate summary using configured provider and model
 * Centralized summarization logic used by both ConversationMemoryManager and RedisConversationMemoryManager
 * @param messages - Messages to summarize
 * @param config - Conversation memory configuration containing provider/model settings
 * @param previousSummary - Optional previous summary to build upon
 * @param logPrefix - Prefix for log messages (e.g., "[ConversationMemory]" or "[RedisConversationMemoryManager]")
 * @param requestId - Optional request ID for request-scoped tracing
 * @returns Summary text or null if generation fails
 */
export async function generateSummary(
  messages: ChatMessage[],
  config: Partial<ConversationMemoryConfig>,
  logPrefix = "[ConversationMemory]",
  previousSummary?: string,
  requestId?: string,
): Promise<string | null> {
  const summarizationPrompt = createSummarizationPrompt(
    messages,
    previousSummary,
  );

  const SUMMARIZER_INIT_TIMEOUT = 15_000;
  const SUMMARIZER_GENERATE_TIMEOUT = 60_000;

  try {
    if (!cachedSummarizer) {
      cachedSummarizer = await withTimeout(
        (async () => {
          const { NeuroLink: NeuroLinkClass } = await import("../neurolink.js");
          return new NeuroLinkClass({
            conversationMemory: { enabled: false },
          });
        })(),
        SUMMARIZER_INIT_TIMEOUT,
        new Error("Summarizer initialization timed out"),
      );
    }
    if (!config.summarizationProvider || !config.summarizationModel) {
      logger.error(`${logPrefix} Missing summarization provider`, {
        requestId,
      });
      return null;
    }

    const summaryResult = await withTimeout(
      cachedSummarizer.generate({
        input: { text: summarizationPrompt },
        provider: config.summarizationProvider,
        model: config.summarizationModel,
        disableTools: true,
      }),
      SUMMARIZER_GENERATE_TIMEOUT,
      new Error("Summary generation timed out"),
    );

    return summaryResult.content || null;
  } catch (error) {
    logger.error(`${logPrefix} Error generating summary`, { requestId, error });
    return null;
  }
}

/**
 * Check if Redis is available for conversation memory.
 * Migrated from the deprecated conversationMemoryUtils.ts.
 */
export async function checkRedisAvailability(): Promise<boolean> {
  const { createRedisClient, getNormalizedConfig } = await import("./redis.js");
  let testClient = null;
  try {
    const testConfig = getNormalizedConfig({
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : undefined,
      password: process.env.REDIS_PASSWORD,
      db: process.env.REDIS_DB ? Number(process.env.REDIS_DB) : undefined,
      keyPrefix: process.env.REDIS_KEY_PREFIX,
      ttl: process.env.REDIS_TTL ? Number(process.env.REDIS_TTL) : undefined,
      connectionOptions: {
        connectTimeout: 5000,
        maxRetriesPerRequest: 1,
        retryDelayOnFailover: 100,
      },
    });
    testClient = await createRedisClient(testConfig);
    await testClient.ping();
    logger.debug("Redis connection test successful");
    return true;
  } catch (error) {
    logger.debug("Redis connection test failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  } finally {
    if (testClient) {
      try {
        await testClient.quit();
      } catch (quitError) {
        logger.debug("Error during Redis test client disconnect", {
          error:
            quitError instanceof Error ? quitError.message : String(quitError),
        });
      }
    }
  }
}
