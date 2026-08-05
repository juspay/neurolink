/**
 * Tool Use/Result Pair Repair
 *
 * After compaction (or a pointer-based history slice) the message array can
 * contain a `tool_call` whose `tool_result` was dropped, or a `tool_result`
 * whose `tool_call` was dropped. Providers reject both, so orphans are filled
 * with synthetic placeholders.
 *
 * Pairing is BATCH- and ID-aware, not adjacency-based. A single agent step
 * with parallel tool calls is persisted as every `tool_call` followed by every
 * `tool_result` (see flushPendingToolData), so `tool_call` is routinely
 * followed by another `tool_call` in perfectly healthy history. Matching on
 * adjacency treats that as an orphan and injects a bogus "result unavailable"
 * over a result that is present a few entries later.
 *
 * Two modes, chosen per batch:
 *   - ID mode      — `toolCallId` present: pair by id, order-independent.
 *   - legacy mode  — sessions written before `toolCallId` existed: pair
 *                    positionally WITHIN the batch (call[i] ↔ result[i]).
 */

import type {
  ChatMessage,
  RepairResult,
  RepairToolBatch,
} from "../types/index.js";

import { randomUUID } from "crypto";

const MISSING_RESULT_CONTENT =
  "[Tool result unavailable - conversation was compacted]";

/**
 * Collect the tool batch starting at `start` (which must index a tool-role
 * message). Consumes the maximal run of calls followed by the maximal run of
 * results. A leading run of results with no calls (head-cut orphan) yields a
 * batch with an empty `calls` array.
 */
function collectBatch(messages: ChatMessage[], start: number): RepairToolBatch {
  let i = start;
  const calls: ChatMessage[] = [];
  const results: ChatMessage[] = [];

  while (i < messages.length && messages[i].role === "tool_call") {
    calls.push(messages[i]);
    i++;
  }
  while (i < messages.length && messages[i].role === "tool_result") {
    results.push(messages[i]);
    i++;
  }

  return { calls, results, endIndex: i };
}

/** Synthetic `tool_result` standing in for a call whose result was dropped. */
function syntheticResult(call: ChatMessage): ChatMessage {
  return {
    id: `repair-result-${randomUUID()}`,
    role: "tool_result",
    content: MISSING_RESULT_CONTENT,
    tool: call.tool,
    ...(call.toolCallId ? { toolCallId: call.toolCallId } : {}),
    timestamp: call.timestamp,
    metadata: { truncated: true },
  };
}

/** Synthetic `tool_call` standing in for a result whose call was dropped. */
function syntheticCall(result: ChatMessage): ChatMessage {
  return {
    id: `repair-call-${randomUUID()}`,
    role: "tool_call",
    content: `[Tool call for ${result.tool || "unknown"} - conversation was compacted]`,
    tool: result.tool,
    ...(result.toolCallId ? { toolCallId: result.toolCallId } : {}),
    timestamp: result.timestamp,
    metadata: { truncated: true },
  };
}

/**
 * Repair one batch, emitting calls then results with every call matched to
 * exactly one result. Returns the rebuilt run plus how many placeholders of
 * each kind were needed.
 */
function repairBatch(batch: RepairToolBatch): {
  messages: ChatMessage[];
  orphanedCallsFixed: number;
  orphanedResultsFixed: number;
  /**
   * True when the rebuilt batch differs from the input for a reason other than
   * a synthetic placeholder — currently only a dropped duplicate result. The
   * orphan counters alone are not enough: dropping a duplicate leaves both at
   * zero, and the caller would then hand back the ORIGINAL array, re-admitting
   * the duplicate it just removed.
   */
  changed: boolean;
} {
  const { calls, results } = batch;

  // ID mode requires ids on BOTH sides; a partially-migrated batch (some
  // entries written before toolCallId existed) falls back to legacy pairing
  // rather than treating the id-less half as universally orphaned.
  const useIds =
    calls.length > 0 &&
    results.length > 0 &&
    calls.every((m) => !!m.toolCallId) &&
    results.every((m) => !!m.toolCallId);

  const outCalls: ChatMessage[] = [...calls];
  const outResults: ChatMessage[] = [];
  let orphanedCallsFixed = 0;
  let orphanedResultsFixed = 0;
  let changed = false;

  if (useIds) {
    // Duplicate ids (a retry that re-emitted a result) keep the FIRST result;
    // later duplicates are dropped so a call never gains a second result.
    const resultById = new Map<string, ChatMessage>();
    for (const result of results) {
      const key = result.toolCallId as string;
      if (!resultById.has(key)) {
        resultById.set(key, result);
      } else {
        changed = true;
      }
    }

    for (const call of calls) {
      const key = call.toolCallId as string;
      const match = resultById.get(key);
      if (match) {
        outResults.push(match);
        resultById.delete(key);
      } else {
        outResults.push(syntheticResult(call));
        orphanedCallsFixed++;
      }
    }

    // Results with no surviving call — the compactor cut the head of the batch.
    for (const leftover of resultById.values()) {
      outCalls.push(syntheticCall(leftover));
      outResults.push(leftover);
      orphanedResultsFixed++;
    }
  } else {
    // Legacy positional pairing, scoped to the batch.
    const paired = Math.min(calls.length, results.length);
    for (let i = 0; i < paired; i++) {
      outResults.push(results[i]);
    }
    for (let i = paired; i < calls.length; i++) {
      outResults.push(syntheticResult(calls[i]));
      orphanedCallsFixed++;
    }
    for (let i = paired; i < results.length; i++) {
      outCalls.push(syntheticCall(results[i]));
      outResults.push(results[i]);
      orphanedResultsFixed++;
    }
  }

  return {
    messages: [...outCalls, ...outResults],
    orphanedCallsFixed,
    orphanedResultsFixed,
    changed,
  };
}

/** True for the two roles that make up a tool batch. */
function isToolRole(msg: ChatMessage | undefined): boolean {
  return msg?.role === "tool_call" || msg?.role === "tool_result";
}

/**
 * True when a split at `index` would cut a single batch in half.
 *
 * A batch is calls-then-results, so a `tool_result` FOLLOWED BY a `tool_call`
 * is the boundary BETWEEN two batches — a legal place to split. Treating every
 * adjacent pair of tool messages as "inside a batch" would fuse a whole
 * `call,result,call,result,…` history into one indivisible run, and the walks
 * below would then skip past all of it.
 */
function cutsBatch(messages: ChatMessage[], index: number): boolean {
  const before = messages[index - 1];
  const after = messages[index];
  if (!isToolRole(before) || !isToolRole(after)) {
    return false;
  }
  return !(before?.role === "tool_result" && after?.role === "tool_call");
}

/**
 * Move a summarize/keep split so it never falls INSIDE a tool batch.
 *
 * `splitIndex` means "messages[0..splitIndex) get summarized" — so the summary
 * pointer lands on messages[splitIndex - 1]. Landing mid-batch leaves the
 * recent window starting on an orphaned `tool_result`, which providers reject.
 *
 * Preferred direction is BACKWARD (summarize less, keep the whole batch in the
 * recent window) since that never loses detail. When the batch starts at index
 * 0 there is nothing left to summarize, so the split moves forward past the
 * batch instead — the caller's "at least one message summarized" invariant
 * wins over keeping the batch recent.
 */
export function snapSplitToBatchBoundary(
  messages: ChatMessage[],
  splitIndex: number,
): number {
  if (splitIndex <= 0 || splitIndex >= messages.length) {
    return splitIndex;
  }
  if (!cutsBatch(messages, splitIndex)) {
    return splitIndex;
  }

  let start = splitIndex;
  while (start > 0 && cutsBatch(messages, start)) {
    start--;
  }
  if (start > 0) {
    return start;
  }

  let end = splitIndex;
  while (end < messages.length && cutsBatch(messages, end)) {
    end++;
  }
  return end;
}

/**
 * Repair orphaned tool_call/tool_result pairs in a message array.
 *
 * Guarantees on return: every `tool_call` is followed (within its batch) by
 * exactly one `tool_result`, and no `tool_result` precedes its `tool_call`.
 * A healthy batch — including a parallel one — is returned untouched.
 */
export function repairToolPairs(messages: ChatMessage[]): RepairResult {
  // Fast path: nothing tool-shaped to repair. Keeps the read-path cost at one
  // linear scan for the overwhelmingly common text-only conversation.
  const hasToolMessage = messages.some(
    (msg) => msg.role === "tool_call" || msg.role === "tool_result",
  );
  if (!hasToolMessage) {
    return {
      repaired: false,
      messages,
      orphanedCallsFixed: 0,
      orphanedResultsFixed: 0,
    };
  }

  const result: ChatMessage[] = [];
  let orphanedCallsFixed = 0;
  let orphanedResultsFixed = 0;
  let changed = false;

  let i = 0;
  while (i < messages.length) {
    const msg = messages[i];
    if (msg.role !== "tool_call" && msg.role !== "tool_result") {
      result.push(msg);
      i++;
      continue;
    }

    const batch = collectBatch(messages, i);
    const repaired = repairBatch(batch);
    result.push(...repaired.messages);
    orphanedCallsFixed += repaired.orphanedCallsFixed;
    orphanedResultsFixed += repaired.orphanedResultsFixed;
    changed = changed || repaired.changed;
    i = batch.endIndex;
  }

  const repaired =
    orphanedCallsFixed > 0 || orphanedResultsFixed > 0 || changed;

  return {
    repaired,
    messages: repaired ? result : messages,
    orphanedCallsFixed,
    orphanedResultsFixed,
  };
}
