/**
 * Deterministic pre-dispatch history truncation.
 *
 * Runs inside the shared context preflight, so one implementation bounds input
 * cost on every dispatch path: native Anthropic, the translated/SDK fallback
 * that serves Vertex, and native or bridged Codex.
 *
 * Deliberately provider-free. Summarizing history would add an outbound model
 * call to the very requests this exists to make cheaper, so reduction is pure
 * removal of the oldest complete units.
 */

import type {
  ProxyHistoryEstimate,
  ProxyHistoryField,
  ProxyHistoryTruncationResult,
} from "../types/index.js";

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * A turn that cannot legally open a history.
 *
 * The Messages API rejects a conversation whose first message is not from the
 * user, so truncation that stops on an assistant turn would trade a local
 * refusal for an upstream 400. Items with no role (Codex `function_call` and
 * `function_call_output`) are not turns and are left alone.
 */
function isNonUserTurn(item: unknown): boolean {
  return record(item) && typeof item.role === "string" && item.role !== "user";
}

function blocksOf(item: Record<string, unknown>): unknown[] {
  return Array.isArray(item.content) ? item.content : [item];
}

/** Tool-call ids this item opens. */
function definedCallIds(item: unknown): string[] {
  if (!record(item)) {
    return [];
  }
  const ids: string[] = [];
  if (item.type === "function_call" && typeof item.call_id === "string") {
    ids.push(item.call_id);
  }
  for (const block of blocksOf(item)) {
    if (
      record(block) &&
      block.type === "tool_use" &&
      typeof block.id === "string"
    ) {
      ids.push(block.id);
    }
  }
  return ids;
}

/** Tool-call ids this item answers. */
function referencedCallIds(item: unknown): string[] {
  if (!record(item)) {
    return [];
  }
  const ids: string[] = [];
  if (
    item.type === "function_call_output" &&
    typeof item.call_id === "string"
  ) {
    ids.push(item.call_id);
  }
  for (const block of blocksOf(item)) {
    if (
      record(block) &&
      block.type === "tool_result" &&
      typeof block.tool_use_id === "string"
    ) {
      ids.push(block.tool_use_id);
    }
  }
  return ids;
}

/**
 * Group items so a tool call and every answer to it stay in one unit.
 *
 * A unit stays open while any call it opened is still unanswered, so removing
 * whole units can never strand a `tool_result` or a `function_call_output`.
 */
function groupIntoUnits(items: readonly unknown[]): number[][] {
  const units: number[][] = [];
  let current: number[] = [];
  const awaiting = new Set<string>();
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    current.push(index);
    for (const id of referencedCallIds(item)) {
      awaiting.delete(id);
    }
    for (const id of definedCallIds(item)) {
      awaiting.add(id);
    }
    if (awaiting.size === 0) {
      units.push(current);
      current = [];
    }
  }
  if (current.length > 0) {
    // An unanswered trailing call still belongs with the turn that opened it.
    units.push(current);
  }
  return units;
}

/**
 * Pick the history container.
 *
 * `input` is overloaded across paths: the translated/SDK shape carries the
 * current turn there as an object, while Codex carries the item array. Only an
 * array is history, so the object form is never touched.
 */
function historyFieldOf(
  wire: Record<string, unknown>,
): ProxyHistoryField | undefined {
  if (Array.isArray(wire.messages)) {
    return "messages";
  }
  if (Array.isArray(wire.conversationMessages)) {
    return "conversationMessages";
  }
  if (Array.isArray(wire.input)) {
    return "input";
  }
  return undefined;
}

/**
 * Remove the oldest complete units until the estimate reaches `targetTokens`.
 *
 * Returns the body unchanged when there is nothing safe to remove. The newest
 * unit is always retained: it carries the turn being answered.
 */
export function truncateHistoryForBudget<T extends object>(args: {
  body: T;
  inputTokensEstimate: number;
  targetTokens: number;
  estimate: ProxyHistoryEstimate;
}): ProxyHistoryTruncationResult<T> {
  const unchanged: ProxyHistoryTruncationResult<T> = {
    body: args.body,
    historyModified: false,
    unitsRemoved: 0,
    itemsRemoved: 0,
  };
  const wire = args.body as Record<string, unknown>;
  const field = historyFieldOf(wire);
  if (field === undefined) {
    return unchanged;
  }
  const items = wire[field] as readonly unknown[];
  const units = groupIntoUnits(items);
  if (units.length <= 1) {
    return unchanged;
  }

  // Everything outside the history container — tools, instructions, schema —
  // is fixed cost that truncation must never touch, so only unit costs are
  // subtracted from the running projection.
  const unitTokens = units.map((unit) =>
    args.estimate(unit.map((index) => items[index])),
  );

  // The translated shape keeps the current turn in object-valued `input`, so
  // every `conversationMessages` unit is prior history and all of them may go.
  // The other shapes carry the current turn in the array itself, so the newest
  // unit there is the turn being answered and must survive.
  const removable =
    field === "conversationMessages" ? units.length : units.length - 1;

  let removedUnits = 0;
  let projected = args.inputTokensEstimate;
  while (removedUnits < removable && projected > args.targetTokens) {
    projected -= unitTokens[removedUnits];
    removedUnits += 1;
  }
  if (removedUnits === 0) {
    return unchanged;
  }
  // Advance by whole units so the kept history opens on a user turn without
  // stranding a tool call from its answer.
  while (
    removedUnits < removable &&
    isNonUserTurn(items[units[removedUnits][0]])
  ) {
    removedUnits += 1;
  }

  const keptIndices = units.slice(removedUnits).flat();
  const kept = keptIndices.map((index) => items[index]);
  const itemsRemoved = items.length - kept.length;
  return {
    body: { ...args.body, [field]: kept },
    historyModified: true,
    unitsRemoved: removedUnits,
    itemsRemoved,
  };
}
