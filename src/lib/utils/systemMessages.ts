import type { ModelMessage, SystemModelMessage } from "../types/index.js";

/**
 * Partition a built message array into system messages and the rest, so the
 * system prompt can ride `generateText`'s top-level `system` option instead of
 * the `messages` array.
 *
 * The AI SDK deprecates system-role entries inside `messages` (warns by default
 * from ai@6.0.170 via the `allowSystemInMessages` option, rejected by default
 * in v7, flagged as a prompt-injection risk). The `system` option accepts full
 * SystemModelMessage objects, so per-message providerOptions (e.g. the anthropic
 * cacheControl breakpoint set by buildMessagesArray) survive the move. See
 * issue #1024.
 *
 * Order is preserved within both partitions and the input is not mutated.
 *
 * Guard: the partition only runs when it leaves a non-empty `messages` array.
 * If every message is a system message (a system-only priming call) — or there
 * are no system messages at all — the original array is returned untouched with
 * `system: undefined`. The AI SDK rejects an empty `messages` array, and a
 * system-only call has no hoisted form (the SDK also requires a non-system
 * message), so that degenerate case is deliberately left on the old
 * system-in-`messages` path rather than made to throw — it keeps whatever
 * behaviour it had before #1024. The normal system-plus-conversation path is
 * always hoisted.
 */
export function extractSystemMessages(messages: ModelMessage[]): {
  system: SystemModelMessage[] | undefined;
  messages: ModelMessage[];
} {
  const system: SystemModelMessage[] = [];
  const rest: ModelMessage[] = [];
  for (const message of messages) {
    if (message.role === "system") {
      system.push(message);
    } else {
      rest.push(message);
    }
  }
  // Only hoist when a non-empty messages array remains. A system-only call (or
  // a no-system array) passes through unchanged: hoisting would empty
  // `messages`, which the SDK rejects, and a system-only call has no compliant
  // hoisted form.
  if (system.length === 0 || rest.length === 0) {
    return { system: undefined, messages };
  }
  return { system, messages: rest };
}
