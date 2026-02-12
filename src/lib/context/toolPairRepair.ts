/**
 * Tool Use/Result Pair Repair
 *
 * After compaction, validates that every tool_use (tool_call) has a
 * corresponding tool_result and vice versa. Inserts synthetic
 * placeholders for orphaned entries.
 */

import type { ChatMessage } from "../types/conversation.js";
import type { RepairResult } from "../types/contextTypes.js";
import { randomUUID } from "crypto";

export type { RepairResult } from "../types/contextTypes.js";

/**
 * Repair orphaned tool_use/tool_result pairs in a message array.
 *
 * Ensures every tool_call has a following tool_result and vice versa.
 */
export function repairToolPairs(messages: ChatMessage[]): RepairResult {
  const result: ChatMessage[] = [];
  let orphanedCallsFixed = 0;
  let orphanedResultsFixed = 0;

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const nextMsg = i + 1 < messages.length ? messages[i + 1] : undefined;

    if (msg.role === "tool_call") {
      result.push(msg);

      // Check if next message is the corresponding tool_result
      if (!nextMsg || nextMsg.role !== "tool_result") {
        // Insert synthetic tool_result
        result.push({
          id: `repair-result-${randomUUID()}`,
          role: "tool_result",
          content: "[Tool result unavailable - conversation was compacted]",
          tool: msg.tool,
          timestamp: msg.timestamp,
          metadata: { truncated: true },
        });
        orphanedCallsFixed++;
      }
    } else if (msg.role === "tool_result") {
      // Check if previous message was the corresponding tool_call
      const prevMsg = result.length > 0 ? result[result.length - 1] : undefined;
      if (
        !prevMsg ||
        (prevMsg.role !== "tool_call" && prevMsg.role !== "tool_result")
      ) {
        // Insert synthetic tool_call before this result
        result.push({
          id: `repair-call-${randomUUID()}`,
          role: "tool_call",
          content: `[Tool call for ${msg.tool || "unknown"} - conversation was compacted]`,
          tool: msg.tool,
          timestamp: msg.timestamp,
          metadata: { truncated: true },
        });
        orphanedResultsFixed++;
      }
      result.push(msg);
    } else {
      result.push(msg);
    }
  }

  const repaired = orphanedCallsFixed > 0 || orphanedResultsFixed > 0;

  return {
    repaired,
    messages: repaired ? result : messages,
    orphanedCallsFixed,
    orphanedResultsFixed,
  };
}
