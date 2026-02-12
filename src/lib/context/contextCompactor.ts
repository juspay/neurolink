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
import { estimateMessagesTokens } from "../utils/tokenEstimation.js";
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
  ): Promise<CompactionResult> {
    const provider = this.config.provider || undefined;
    const tokensBefore = estimateMessagesTokens(messages, provider);
    const stagesUsed: CompactionStage[] = [];
    let currentMessages = [...messages];

    // Stage 1: Tool Output Pruning
    if (
      this.config.enablePrune &&
      estimateMessagesTokens(currentMessages, provider) > targetTokens
    ) {
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
    }

    // Stage 2: File Read Deduplication
    if (
      this.config.enableDeduplicate &&
      estimateMessagesTokens(currentMessages, provider) > targetTokens
    ) {
      const dedupResult = deduplicateFileReads(currentMessages);
      if (dedupResult.deduplicated) {
        currentMessages = dedupResult.messages;
        stagesUsed.push("deduplicate");
      }
    }

    // Stage 3: LLM Summarization
    if (
      this.config.enableSummarize &&
      estimateMessagesTokens(currentMessages, provider) > targetTokens
    ) {
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
      } catch {
        // Summarization failed, fall through to truncation
      }
    }

    // Stage 4: Sliding Window Truncation (fallback)
    if (
      this.config.enableTruncate &&
      estimateMessagesTokens(currentMessages, provider) > targetTokens
    ) {
      const truncResult = truncateWithSlidingWindow(currentMessages, {
        fraction: this.config.truncationFraction,
      });
      if (truncResult.truncated) {
        currentMessages = truncResult.messages;
        stagesUsed.push("truncate");
      }
    }

    const tokensAfter = estimateMessagesTokens(currentMessages, provider);

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
