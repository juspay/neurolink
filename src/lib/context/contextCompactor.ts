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
} from "../types/contextTypes.js";
import { trace, SpanStatusCode } from "@opentelemetry/api";
import { estimateMessagesTokens } from "../utils/tokenEstimation.js";
import { logger } from "../utils/logger.js";
import { pruneToolOutputs } from "./stages/toolOutputPruner.js";
import { deduplicateFileReads } from "./stages/fileReadDeduplicator.js";
import { summarizeMessages } from "./stages/structuredSummarizer.js";
import { truncateWithSlidingWindow } from "./stages/slidingWindowTruncator.js";

export type {
  CompactionResult,
  CompactionConfig,
} from "../types/contextTypes.js";

export type CompactionStage =
  | "prune"
  | "deduplicate"
  | "summarize"
  | "truncate";

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
    const compactionStartTime = Date.now();
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
        const summarizeResult = await summarizeMessages(currentMessages, {
          provider: this.config.summarizationProvider,
          model: this.config.summarizationModel,
          keepRecentRatio: this.config.keepRecentRatio,
          memoryConfig,
        });
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
        // Capture the actual error for debugging
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const errorName = error instanceof Error ? error.name : "UnknownError";

        logger.warn("[Compaction] Stage 3 (summarize) FAILED", {
          requestId,
          error: errorMessage,
          errorName,
          tokensBefore: stageTokensBefore,
          tokensAfter: stageTokensBefore,
          saved: 0,
        });

        // Record on OTel span for trace visibility
        const activeSpan = trace.getActiveSpan();
        if (activeSpan) {
          activeSpan.addEvent("compaction.stage3.failed", {
            "error.message": errorMessage,
            "error.name": errorName,
            "stage.tokens_before": stageTokensBefore,
          });
          if (error instanceof Error) {
            activeSpan.recordException(error);
          }
          // NLK-GAP-005 fix: set error status alongside recordException
          activeSpan.setStatus({
            code: SpanStatusCode.ERROR,
            message: `Compaction stage 3 (summarize) failed: ${errorMessage}`,
          });
        }

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
      durationMs: Date.now() - compactionStartTime,
    });

    return {
      compacted: stagesUsed.length > 0,
      stagesUsed,
      tokensBefore,
      tokensAfter,
      tokensSaved: tokensBefore - tokensAfter,
      messages: currentMessages,
    };
  }
}
