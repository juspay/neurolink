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
} from "../types/conversation.js";
import type {
  CompactionResult,
  CompactionConfig,
  CompactionStage,
} from "../types/contextTypes.js";
import { estimateMessagesTokens } from "../utils/tokenEstimation.js";
import { logger } from "../utils/logger.js";
import { withTimeout } from "../utils/async/withTimeout.js";
import {
  SpanSerializer,
  SpanType,
  SpanStatus,
} from "../observability/index.js";
import { getMetricsAggregator } from "../observability/index.js";
import { pruneToolOutputs } from "./stages/toolOutputPruner.js";
import { deduplicateFileReads } from "./stages/fileReadDeduplicator.js";
import { truncateWithSlidingWindow } from "./stages/slidingWindowTruncator.js";
import { summarizeMessages } from "./stages/structuredSummarizer.js";

export type {
  CompactionConfig,
  CompactionResult,
  CompactionStage,
} from "../types/contextTypes.js";

const DEFAULT_CONFIG: Required<CompactionConfig> = {
  enablePrune: true,
  enableDeduplicate: true,
  enableSummarize: true,
  enableTruncate: true,
  pruneProtectTokens: 40_000,
  pruneMinimumSavings: 20_000,
  pruneProtectedTools: ["skill"],
  summarizationProvider: "vertex",
  summarizationModel: "gemini-2.5-flash",
  keepRecentRatio: 0.3,
  truncationFraction: 0.5,
  provider: "",
};

export class ContextCompactor {
  private config: Required<CompactionConfig>;

  constructor(config?: CompactionConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Run the multi-stage compaction pipeline until messages fit within budget.
   */
  async compact(
    messages: ChatMessage[],
    targetTokens: number,
    memoryConfig?: Partial<ConversationMemoryConfig>,
    requestId?: string,
  ): Promise<CompactionResult> {
    const span = SpanSerializer.createSpan(
      SpanType.CONTEXT_COMPACTION,
      "context.compact",
      {
        "context.operation": "compact",
        "context.targetTokens": targetTokens,
      },
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

      // Stage 1: Tool Output Pruning
      if (
        this.config.enablePrune &&
        estimateMessagesTokens(currentMessages, provider) > targetTokens
      ) {
        const stageTokensBefore = estimateMessagesTokens(
          currentMessages,
          provider,
        );
        const pruneResult = pruneToolOutputs(currentMessages, {
          protectTokens: this.config.pruneProtectTokens,
          minimumSavings: this.config.pruneMinimumSavings,
          protectedTools: this.config.pruneProtectedTools,
          provider,
        });
        if (pruneResult.pruned) {
          currentMessages = pruneResult.messages;
          stagesUsed.push("prune");
        }
        const stageTokensAfter = estimateMessagesTokens(
          currentMessages,
          provider,
        );
        logger.info("[Compaction] Stage 1 (prune)", {
          requestId,
          ran: pruneResult.pruned,
          tokensBefore: stageTokensBefore,
          tokensAfter: stageTokensAfter,
          saved: stageTokensBefore - stageTokensAfter,
        });
      }

      // Stage 2: File Read Deduplication
      if (
        this.config.enableDeduplicate &&
        estimateMessagesTokens(currentMessages, provider) > targetTokens
      ) {
        const stageTokensBefore = estimateMessagesTokens(
          currentMessages,
          provider,
        );
        const dedupResult = deduplicateFileReads(currentMessages);
        if (dedupResult.deduplicated) {
          currentMessages = dedupResult.messages;
          stagesUsed.push("deduplicate");
        }
        const stageTokensAfter = estimateMessagesTokens(
          currentMessages,
          provider,
        );
        logger.info("[Compaction] Stage 2 (deduplicate)", {
          requestId,
          ran: dedupResult.deduplicated,
          tokensBefore: stageTokensBefore,
          tokensAfter: stageTokensAfter,
          saved: stageTokensBefore - stageTokensAfter,
        });
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
          if (summarizeResult.summarized) {
            currentMessages = summarizeResult.messages;
            stagesUsed.push("summarize");
          }
          const stageTokensAfter = estimateMessagesTokens(
            currentMessages,
            provider,
          );
          logger.info("[Compaction] Stage 3 (summarize)", {
            requestId,
            ran: summarizeResult.summarized,
            tokensBefore: stageTokensBefore,
            tokensAfter: stageTokensAfter,
            saved: stageTokensBefore - stageTokensAfter,
          });
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));

          logger.warn("[Compaction] Stage 3 (summarize) FAILED", {
            requestId,
            error: err.message,
            errorName: err.name,
            tokensBefore: stageTokensBefore,
            tokensAfter: stageTokensBefore,
            saved: 0,
          });

          // Record failure on the compaction span for trace visibility
          SpanSerializer.updateAttributes(span, {
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
          maxIterations: 3,
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

      const result: CompactionResult = {
        compacted: stagesUsed.length > 0,
        stagesUsed,
        tokensBefore,
        tokensAfter,
        tokensSaved: tokensBefore - tokensAfter,
        messages: currentMessages,
      };

      span.durationMs = Date.now() - spanStartTime;
      const endedSpan = SpanSerializer.endSpan(
        SpanSerializer.updateAttributes(span, {
          "context.stage": stagesUsed.join(",") || "none",
          "context.tokensBefore": tokensBefore,
          "context.tokensAfter": tokensAfter,
          "context.tokensSaved": tokensBefore - tokensAfter,
        }),
        SpanStatus.OK,
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
  }
}
