/**
 * ContextCompactor
 *
 * Orchestrates multi-stage context reduction:
 *
 * Stage 1: Tool Output Pruning (cheapest -- no LLM call)
 * Stage 2: File Read Deduplication (cheap -- no LLM call)
 * Stage 3: LLM Summarization (expensive -- requires LLM call)
 * Stage 4: Sliding Window Truncation (fallback -- no LLM call)
 */

import type {
  ChatMessage,
  ConversationMemoryConfig,
  CompactionResult,
  CompactionConfig,
  CompactionStage,
  ContextCompactorDeps,
  ContextCompactRequest,
} from "../types/index.js";
import { estimateMessagesTokens } from "../utils/tokenEstimation.js";
import { logger } from "../utils/logger.js";
import { withTimeout } from "../utils/async/withTimeout.js";
import {
  SpanSerializer,
  SpanType,
  SpanStatus,
  getMetricsAggregator,
} from "../observability/index.js";
import { getActiveTraceContext } from "../telemetry/traceContext.js";
import { withSpan } from "../telemetry/withSpan.js";
import { tracers } from "../telemetry/tracers.js";
import { pruneToolOutputs } from "./stages/toolOutputPruner.js";
import { deduplicateFileReads } from "./stages/fileReadDeduplicator.js";
import { truncateWithSlidingWindow } from "./stages/slidingWindowTruncator.js";
import { summarizeMessages } from "./stages/structuredSummarizer.js";
import {
  selectIrrelevantMessages,
  summaryPreservesContext,
} from "./contextDecision.js";

const DEFAULT_CONFIG: Required<CompactionConfig> = {
  enablePrune: true,
  enableDeduplicate: true,
  enableSummarize: true,
  enableTruncate: true,
  pruneProtectTokens: 40_000,
  pruneMinimumSavings: 500,
  pruneProtectedTools: ["skill", "use_skill", "read_skill_resource"],
  summarizationProvider: "vertex",
  summarizationModel: "gemini-2.5-flash",
  keepRecentRatio: 0.3,
  truncationFraction: 0.5,
  provider: "",
};

export class ContextCompactor {
  private config: Required<CompactionConfig>;

  /**
   * Injected decision caller and its tuning. Kept OUT of `CompactionConfig`
   * deliberately: that type is `Required<>`-ed into `DEFAULT_CONFIG`, so a
   * function member would need a default implementation, and the compactor
   * must stay usable with no decision provider at all.
   */
  private readonly deps: ContextCompactorDeps;

  constructor(config?: CompactionConfig, deps?: ContextCompactorDeps) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.deps = deps ?? {};
  }

  /**
   * Run the multi-stage compaction pipeline until messages fit within budget.
   */
  async compact(
    messages: ChatMessage[],
    targetTokens: number,
    memoryConfig?: Partial<ConversationMemoryConfig>,
    requestId?: string,
    request?: ContextCompactRequest,
  ): Promise<CompactionResult> {
    return withSpan(
      {
        name: "neurolink.context.compact",
        tracer: tracers.context,
        attributes: {
          "context.target_tokens": targetTokens,
          "context.message_count": messages.length,
        },
      },
      async () => {
        const { traceId, parentSpanId } = getActiveTraceContext();
        let span = SpanSerializer.createSpan(
          SpanType.CONTEXT_COMPACTION,
          "context.compact",
          {
            "context.operation": "compact",
            "context.targetTokens": targetTokens,
          },
          parentSpanId,
          traceId,
        );
        const spanStartTime = Date.now();

        try {
          const provider = this.config.provider || undefined;
          const tokensBefore = estimateMessagesTokens(messages, provider);
          const stagesUsed: CompactionStage[] = [];
          let currentMessages = [...messages];

          logger.info("[Compaction] Starting", {
            requestId,
            estimatedTokens: tokensBefore,
            budgetTokens: targetTokens,
          });

          // Stage 0: Relevance. Runs FIRST, and only when a decision
          // provider is configured and the current request is known — every
          // later stage is positional, so removing what the request provably
          // does not need before they run means they have less to throw away
          // by recency alone. Fails open to exactly the previous pipeline.
          const afterRelevance = await this.runRelevanceStage(
            currentMessages,
            provider,
            targetTokens,
            request,
            requestId,
          );
          if (afterRelevance) {
            currentMessages = afterRelevance;
            stagesUsed.push("relevance");
          }

          // Stage 1: Tool Output Pruning
          const afterPrune = this.runPruneStage(
            currentMessages,
            provider,
            targetTokens,
            requestId,
          );
          if (afterPrune) {
            currentMessages = afterPrune;
            stagesUsed.push("prune");
          }

          // Stage 2: File Read Deduplication
          const afterDedup = this.runDeduplicateStage(
            currentMessages,
            provider,
            targetTokens,
            requestId,
          );
          if (afterDedup) {
            currentMessages = afterDedup;
            stagesUsed.push("deduplicate");
          }

          // Stage 3: LLM Summarization
          if (
            this.config.enableSummarize &&
            estimateMessagesTokens(currentMessages, provider) > targetTokens
          ) {
            const stageTokensBefore = estimateMessagesTokens(
              currentMessages,
              provider,
            );
            try {
              const summarizeResult = await withTimeout(
                summarizeMessages(currentMessages, {
                  provider: this.config.summarizationProvider,
                  model: this.config.summarizationModel,
                  keepRecentRatio: this.config.keepRecentRatio,
                  memoryConfig,
                  targetTokens,
                }),
                120_000,
                "LLM summarization timed out after 120s",
              );
              // Gate the summary before it replaces anything — see
              // acceptSummary for why a rejection is deliberately rare.
              const summaryAccepted =
                summarizeResult.summarized &&
                (await this.acceptSummary(
                  currentMessages,
                  summarizeResult.messages,
                ));
              if (summarizeResult.summarized && !summaryAccepted) {
                span = SpanSerializer.updateAttributes(span, {
                  "compaction.stage3.summaryRejected": true,
                });
              }

              if (summaryAccepted) {
                // Pinned skill instructions must survive summarization:
                // re-seat any that the summarized region swallowed right
                // after the summary message (index 0 of the result).
                const survivorIds = new Set(
                  summarizeResult.messages.map((m) => m.id),
                );
                const swallowedSkills = currentMessages.filter(
                  (m) => m.metadata?.isSkill && !survivorIds.has(m.id),
                );
                currentMessages =
                  swallowedSkills.length > 0
                    ? summarizeResult.messages.length > 0
                      ? [
                          summarizeResult.messages[0],
                          ...swallowedSkills,
                          ...summarizeResult.messages.slice(1),
                        ]
                      : swallowedSkills
                    : summarizeResult.messages;
                stagesUsed.push("summarize");
              }
              const stageTokensAfter = estimateMessagesTokens(
                currentMessages,
                provider,
              );
              logger.info("[Compaction] Stage 3 (summarize)", {
                requestId,
                ran: summaryAccepted,
                tokensBefore: stageTokensBefore,
                tokensAfter: stageTokensAfter,
                saved: stageTokensBefore - stageTokensAfter,
              });
            } catch (error) {
              const err =
                error instanceof Error ? error : new Error(String(error));

              logger.warn("[Compaction] Stage 3 (summarize) FAILED", {
                requestId,
                error: err.message,
                errorName: err.name,
                tokensBefore: stageTokensBefore,
                tokensAfter: stageTokensBefore,
                saved: 0,
              });

              // Record failure on the compaction span for trace visibility
              span = SpanSerializer.updateAttributes(span, {
                "compaction.stage3.error": err.message,
                "compaction.stage3.errorName": err.name,
                "compaction.stage3.tokensBefore": stageTokensBefore,
                "compaction.stage3_failed": true,
              });

              // Fall through to Stage 4 truncation as before
            }
          }

          // Stage 4: Sliding Window Truncation (fallback)
          if (
            this.config.enableTruncate &&
            estimateMessagesTokens(currentMessages, provider) > targetTokens
          ) {
            const stageTokensBefore = estimateMessagesTokens(
              currentMessages,
              provider,
            );
            const truncResult = truncateWithSlidingWindow(currentMessages, {
              fraction: this.config.truncationFraction,
              currentTokens: stageTokensBefore,
              targetTokens: targetTokens,
              provider: provider,
              adaptiveBuffer: 0.15,
              maxIterations: 6,
            });
            if (truncResult.truncated) {
              currentMessages = truncResult.messages;
              stagesUsed.push("truncate");
            }
            const stageTokensAfter = estimateMessagesTokens(
              currentMessages,
              provider,
            );
            logger.info("[Compaction] Stage 4 (truncate)", {
              requestId,
              ran: truncResult.truncated,
              tokensBefore: stageTokensBefore,
              tokensAfter: stageTokensAfter,
              saved: stageTokensBefore - stageTokensAfter,
            });
          }

          const tokensAfter = estimateMessagesTokens(currentMessages, provider);

          logger.info("[Compaction] Complete", {
            requestId,
            tokensBefore,
            tokensAfter,
            totalSaved: tokensBefore - tokensAfter,
            stagesUsed,
            durationMs: Date.now() - spanStartTime,
          });

          // A compaction that was ASKED to reclaim and reclaimed nothing is the
          // signature of a mis-aimed target: the caller decided the request was
          // over budget, but every stage gate compared against a number that
          // said otherwise, so the pipeline no-opped and the request went out
          // oversized anyway. That is exactly how the history-budget defect hid
          // in production — silently, because "Complete" looked healthy. Warn
          // loudly and stamp the span so it is greppable and alertable.
          const reclaimedNothing = stagesUsed.length === 0;
          if (reclaimedNothing) {
            logger.warn("[Compaction] No-op — invoked but reclaimed nothing", {
              requestId,
              tokensBefore,
              targetTokens,
              messageCount: currentMessages.length,
            });
          }
          span = SpanSerializer.updateAttributes(span, {
            "context.noop": reclaimedNothing,
          });

          const result: CompactionResult = {
            compacted: stagesUsed.length > 0,
            stagesUsed,
            tokensBefore,
            tokensAfter,
            tokensSaved: tokensBefore - tokensAfter,
            messages: currentMessages,
          };

          span.durationMs = Date.now() - spanStartTime;
          const compactionSucceeded = tokensAfter <= targetTokens;
          const finalStatus = compactionSucceeded
            ? SpanStatus.OK
            : SpanStatus.WARNING;
          const finalMessage = compactionSucceeded
            ? undefined
            : `Compaction insufficient: ${tokensAfter} tokens remain (target: ${targetTokens})`;
          const endedSpan = SpanSerializer.endSpan(
            SpanSerializer.updateAttributes(span, {
              "context.stage": stagesUsed.join(",") || "none",
              "context.tokensBefore": tokensBefore,
              "context.tokensAfter": tokensAfter,
              "context.tokensSaved": tokensBefore - tokensAfter,
            }),
            finalStatus,
            finalMessage,
          );
          getMetricsAggregator().recordSpan(endedSpan);

          return result;
        } catch (error) {
          span.durationMs = Date.now() - spanStartTime;
          const endedSpan = SpanSerializer.endSpan(span, SpanStatus.ERROR);
          endedSpan.statusMessage =
            error instanceof Error ? error.message : String(error);
          getMetricsAggregator().recordSpan(endedSpan);
          throw error;
        }
      },
    ); // end withSpan
  }

  /**
   * Stage 0 — drop the earlier messages this request provably does not need.
   *
   * Returns the surviving messages, or `null` when nothing changed: no
   * decision provider, no known request, nothing eligible, or no confident
   * drop. Never throws — a failure here must leave the positional stages to
   * run exactly as they did before this stage existed.
   */
  private async runRelevanceStage(
    messages: ChatMessage[],
    provider: string | undefined,
    targetTokens: number,
    request: ContextCompactRequest | undefined,
    requestId: string | undefined,
  ): Promise<ChatMessage[] | null> {
    if (!this.deps.decide || !request?.currentRequest) {
      return null;
    }
    const tokensBefore = estimateMessagesTokens(messages, provider);
    if (tokensBefore <= targetTokens) {
      return null;
    }
    try {
      const relevance = await selectIrrelevantMessages(
        messages,
        request.currentRequest,
        this.deps.decide,
        this.deps.relevance,
      );
      logger.info("[Compaction] Stage 0 (relevance)", {
        requestId,
        ran: !!relevance,
        tokensBefore,
        tokensAfter: relevance
          ? estimateMessagesTokens(relevance.messages, provider)
          : tokensBefore,
        droppedCount: relevance?.droppedIndices.length ?? 0,
      });
      return relevance ? relevance.messages : null;
    } catch (error) {
      logger.warn("[Compaction] Stage 0 (relevance) FAILED", {
        requestId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Whether a generated summary may replace the messages it covers.
   *
   * Stage 3 accepts any non-empty string today, so a refusal, an error
   * message or a truncated fragment silently destroys the conversation it was
   * meant to preserve — and the originals are gone before anyone reads it.
   *
   * Returns true unless a decision model CONFIDENTLY rejects the summary,
   * because rejecting one falls through to truncation, which loses strictly
   * more than an imperfect summary does.
   */
  private async acceptSummary(
    before: ChatMessage[],
    after: ChatMessage[],
  ): Promise<boolean> {
    if (!this.deps.decide) {
      return true;
    }
    const survivingIds = new Set(after.map((m) => m.id));
    const replaced = before.filter((m) => !survivingIds.has(m.id));
    const summaryText = after.find((m) => m.metadata?.isSummary)?.content;
    if (!summaryText || replaced.length === 0) {
      return true;
    }
    return summaryPreservesContext(
      summaryText,
      replaced,
      this.deps.decide,
      this.deps.summaryGate,
    );
  }

  /**
   * Stage 2 — collapse repeated reads of the same file to the last one.
   * Returns the deduplicated messages, or `null` when the stage is disabled,
   * already within budget, or found nothing to collapse.
   */
  private runDeduplicateStage(
    messages: ChatMessage[],
    provider: string | undefined,
    targetTokens: number,
    requestId: string | undefined,
  ): ChatMessage[] | null {
    if (!this.config.enableDeduplicate) {
      return null;
    }
    const tokensBefore = estimateMessagesTokens(messages, provider);
    if (tokensBefore <= targetTokens) {
      return null;
    }
    const dedupResult = deduplicateFileReads(messages);
    const tokensAfter = dedupResult.deduplicated
      ? estimateMessagesTokens(dedupResult.messages, provider)
      : tokensBefore;
    logger.info("[Compaction] Stage 2 (deduplicate)", {
      requestId,
      ran: dedupResult.deduplicated,
      tokensBefore,
      tokensAfter,
      saved: tokensBefore - tokensAfter,
    });
    return dedupResult.deduplicated ? dedupResult.messages : null;
  }

  /**
   * Stage 1 — shrink large tool outputs outside the protected recent window.
   * Returns the pruned messages, or `null` when the stage is disabled,
   * already within budget, or saved nothing worth keeping.
   */
  private runPruneStage(
    messages: ChatMessage[],
    provider: string | undefined,
    targetTokens: number,
    requestId: string | undefined,
  ): ChatMessage[] | null {
    if (!this.config.enablePrune) {
      return null;
    }
    const tokensBefore = estimateMessagesTokens(messages, provider);
    if (tokensBefore <= targetTokens) {
      return null;
    }
    const pruneResult = pruneToolOutputs(messages, {
      protectTokens: this.config.pruneProtectTokens,
      minimumSavings: this.config.pruneMinimumSavings,
      protectedTools: this.config.pruneProtectedTools,
      provider,
    });
    const tokensAfter = pruneResult.pruned
      ? estimateMessagesTokens(pruneResult.messages, provider)
      : tokensBefore;
    logger.info("[Compaction] Stage 1 (prune)", {
      requestId,
      ran: pruneResult.pruned,
      tokensBefore,
      tokensAfter,
      saved: tokensBefore - tokensAfter,
    });
    return pruneResult.pruned ? pruneResult.messages : null;
  }
}
