/**
 * Message threads for the native Anthropic loop (beta, `message-threads-2026-08-12`).
 *
 * Without a thread every step of a turn resends the whole conversation. With
 * one, the first step sends it with `thread: {type: "create"}` and each later
 * step sends only the messages since the last response, plus the previous
 * response id. The API keeps the conversation in memory for a few minutes and
 * is best-effort about it, so the caller stays the source of truth: this
 * module only decides, per step, whether the thread can be continued, and
 * otherwise plans a `create` that sends everything again.
 *
 * A thread can be continued only when nothing the API fixed at creation has
 * changed (model, tools, system, tool choice, thinking, output config and the
 * beta set) and the messages already sent are untouched. Anything that
 * rewrites history, such as a context reclaim, therefore starts a new thread
 * by itself.
 */

import { createHash } from "node:crypto";
import type {
  AnthropicThreadPlan,
  AnthropicThreadSession,
} from "../../types/index.js";

export const MESSAGE_THREADS_BETA = "message-threads-2026-08-12";

/** Stop reasons after which the API has stored the response as a continuable turn. */
const STORABLE_STOP_REASONS = new Set([
  "end_turn",
  "tool_use",
  "stop_sequence",
]);

/**
 * Record how a step's response ended. The API stores a thread turn only when
 * the response ended normally; a refusal, a cut-off or an early end is resent
 * in full by the next step.
 */
export function settleThread(
  session: AnthropicThreadSession,
  response: {
    sawTerminalEvent: boolean;
    messageId: string | undefined;
    stopReason: string | undefined;
  },
): void {
  if (!session.enabled) {
    return;
  }
  if (
    response.sawTerminalEvent &&
    response.messageId !== undefined &&
    response.stopReason !== undefined &&
    STORABLE_STOP_REASONS.has(response.stopReason)
  ) {
    session.accept(response.messageId);
  } else {
    session.reset();
  }
}

const sha = (value: unknown): string =>
  createHash("sha256")
    .update(JSON.stringify(value) ?? "")
    .digest("hex");

// A cache breakpoint is a request for caching, not content: the same message
// carries a different one on the request that first sends it and the one that
// replays it, so it must not decide whether a prefix is unchanged.
const withoutCacheControl = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(withoutCacheControl);
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (key !== "cache_control") {
        out[key] = withoutCacheControl(entry);
      }
    }
    return out;
  }
  return value;
};

const FIXED_FIELDS = [
  "model",
  "system",
  "tools",
  "tool_choice",
  "thinking",
  "output_config",
  "mcp_servers",
  "context_management",
  "container",
  "cache_control",
] as const;

const mergeBetas = (existing: string | undefined): string =>
  [
    ...new Set(
      [...(existing ?? "").split(","), MESSAGE_THREADS_BETA]
        .map((beta) => beta.trim())
        .filter(Boolean),
    ),
  ].join(",");

/**
 * Start the thread state for one turn.
 *
 * @param betaHeader the `anthropic-beta` value the client already sends; the
 *   thread beta is added to it, identically on every request of the thread.
 */
export function createAnthropicThreadSession(
  betaHeader: string | undefined,
): AnthropicThreadSession {
  const headers = { "anthropic-beta": mergeBetas(betaHeader) };
  let enabled = true;
  let previousMessageId: string | undefined;
  // What the thread holds after the last accepted response: the fingerprint of
  // the fixed fields and one hash per message the request carried. The reply
  // the API stored after them is not hashed; it is the API's own copy.
  let stored: { fingerprint: string; hashes: string[] } | undefined;
  let pending: { fingerprint: string; hashes: string[] } | undefined;

  return {
    get enabled() {
      return enabled;
    },

    plan(params) {
      const bag: Record<string, unknown> = { ...params };
      const fixed: Record<string, unknown> = {
        betas: headers["anthropic-beta"],
      };
      for (const field of FIXED_FIELDS) {
        fixed[field] = bag[field];
      }
      const fingerprint = sha(fixed);
      const hashes = params.messages.map((message) =>
        sha(withoutCacheControl(message)),
      );
      pending = { fingerprint, hashes };

      // The stored reply sits between the messages already sent and the new ones.
      const held = stored ? stored.hashes.length + 1 : 0;
      const canContinue =
        previousMessageId !== undefined &&
        stored !== undefined &&
        stored.fingerprint === fingerprint &&
        params.messages.length > held &&
        stored.hashes.every((hash, index) => hashes[index] === hash);

      if (canContinue && previousMessageId !== undefined) {
        // system and tools belong to the create request; sending either on a
        // continue, even empty, is rejected.
        const { system: _system, tools: _tools, ...rest } = params;
        return {
          mode: "continue",
          params: {
            ...rest,
            messages: params.messages.slice(held),
            thread: {
              type: "continue",
              previous_message_id: previousMessageId,
            },
          },
          headers,
        } satisfies AnthropicThreadPlan;
      }
      return {
        mode: "create",
        params: { ...params, thread: { type: "create" } },
        headers,
      } satisfies AnthropicThreadPlan;
    },

    accept(messageId) {
      if (pending === undefined) {
        previousMessageId = undefined;
        stored = undefined;
        return;
      }
      previousMessageId = messageId;
      stored = pending;
      pending = undefined;
    },

    reset() {
      previousMessageId = undefined;
      stored = undefined;
      pending = undefined;
    },

    disable() {
      enabled = false;
      previousMessageId = undefined;
      stored = undefined;
      pending = undefined;
    },
  };
}

/** The API's `error.details.error_code` for a thread request that was refused, if there is one. */
export function threadErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }
  const body = (error as { error?: unknown }).error;
  const inner =
    typeof body === "object" && body !== null
      ? (body as { error?: unknown }).error
      : undefined;
  const details =
    typeof inner === "object" && inner !== null
      ? (inner as { details?: unknown }).details
      : undefined;
  const code =
    typeof details === "object" && details !== null
      ? (details as { error_code?: unknown }).error_code
      : undefined;
  return typeof code === "string" ? code : undefined;
}

/**
 * What to do after a thread request fails: send everything again as a new
 * thread, send it without a thread at all, or neither (an ordinary error).
 */
export function threadRecovery(
  error: unknown,
): "recreate" | "unthreaded" | undefined {
  const code = threadErrorCode(error);
  switch (code) {
    case "thread_not_found":
    case "thread_already_continued":
    case "thread_continue_in_flight":
    case "thread_fingerprint_mismatch":
      return "recreate";
    case "thread_unsupported_request":
      return "unthreaded";
    default:
      return undefined;
  }
}
