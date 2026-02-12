/**
 * Stage 1: Tool Output Pruning
 *
 * Walk messages backwards, protect recent tool output tokens,
 * replace older tool results with "[Tool result cleared]".
 */

import type { ChatMessage } from "../../types/conversation.js";
import type { PruneConfig, PruneResult } from "../../types/contextTypes.js";
import { estimateTokens } from "../../utils/tokenEstimation.js";

export type { PruneConfig, PruneResult } from "../../types/contextTypes.js";

const CLEARED_PLACEHOLDER = "[Tool result cleared]";
const DEFAULT_PROTECT_TOKENS = 40_000;
const DEFAULT_MINIMUM_SAVINGS = 20_000;

export function pruneToolOutputs(
  messages: ChatMessage[],
  config?: PruneConfig,
): PruneResult {
  const protectTokens = config?.protectTokens ?? DEFAULT_PROTECT_TOKENS;
  const minimumSavings = config?.minimumSavings ?? DEFAULT_MINIMUM_SAVINGS;
  const protectedTools = new Set(config?.protectedTools ?? ["skill"]);
  const provider = config?.provider;

  const result: ChatMessage[] = [...messages];
  let recentToolTokens = 0;
  let totalSaved = 0;

  // Walk backwards to protect recent tool outputs
  for (let i = result.length - 1; i >= 0; i--) {
    const msg = result[i];
    if (msg.role !== "tool_result") {
      continue;
    }

    // Skip protected tools
    if (msg.tool && protectedTools.has(msg.tool)) {
      continue;
    }

    const contentTokens = estimateTokens(msg.content, provider);

    if (recentToolTokens < protectTokens) {
      // This tool output is within the protection window
      recentToolTokens += contentTokens;
      continue;
    }

    // This tool output is old enough to prune
    if (msg.content !== CLEARED_PLACEHOLDER) {
      totalSaved +=
        contentTokens - estimateTokens(CLEARED_PLACEHOLDER, provider);
      result[i] = {
        ...msg,
        content: CLEARED_PLACEHOLDER,
        metadata: { ...msg.metadata, truncated: true },
      };
    }
  }

  const pruned = totalSaved >= minimumSavings;
  return {
    pruned,
    messages: pruned ? result : messages,
    tokensSaved: pruned ? totalSaved : 0,
  };
}
