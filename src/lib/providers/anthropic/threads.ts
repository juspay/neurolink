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
import { CONVERSATION_INSTRUCTIONS } from "../../config/conversationMemory.js";
import type {
  AnthropicStoredThread,
  AnthropicThreadCarry,
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
    session.accept(response.messageId, response.stopReason);
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

// What conversation memory keeps of a message: its role and its text. Memory
// drops tool_use / tool_result blocks and anything that is not text, so that is
// all a later call can be compared on.
const textOfMessage = (message: unknown): string => {
  const content = (message as { content?: unknown } | null)?.content;
  if (typeof content === "string") {
    return content;
  }
  if (!Array.isArray(content)) {
    return "";
  }
  return content
    .map((block) => {
      const b = block as { type?: unknown; text?: unknown } | null;
      if (b?.type === "text" && typeof b.text === "string") {
        return b.text;
      }
      // An attachment (image, document) is part of what the model was given.
      // It is compared by content, so a replaced one is a different message;
      // an attachment memory does not hand back simply never matches, which
      // costs a new thread and nothing else.
      return b === null || b === undefined
        ? ""
        : `\u0000${String(b.type)}:${sha(withoutCacheControl(b))}\u0000`;
    })
    .join("");
};

// By default conversation memory replays a turn's tool calls as one
// `[called <tool> → ok]` line each, in front of the assistant's own text. Those
// lines describe tool blocks the thread already holds in full, so they are
// left out of the comparison: what is compared is what the model said.
const TOOL_MARKER_LINE = /^\[called [^\n]*? → (?:ok|error|unknown)\](?:\n|$)/;
const withoutToolMarkers = (text: string): string => {
  let rest = text;
  while (TOOL_MARKER_LINE.test(rest)) {
    rest = rest.replace(TOOL_MARKER_LINE, "");
  }
  return rest;
};

const memoryHash = (role: unknown, text: string): string =>
  sha([role, role === "assistant" ? withoutToolMarkers(text) : text]);

const memoryHashOf = (message: unknown): string =>
  memoryHash(
    (message as { role?: unknown } | null)?.role,
    textOfMessage(message),
  );

// NeuroLink appends CONVERSATION_INSTRUCTIONS to the system prompt once a
// conversation has history, so a session's first call and its second carry
// different system prompts for the same conversation. The note is about
// history a continued thread already holds, so it is left out of the
// comparison; a continued call therefore runs without it.
const withoutConversationNote = (system: unknown): unknown => {
  if (typeof system === "string") {
    return system.endsWith(CONVERSATION_INSTRUCTIONS)
      ? system.slice(0, -CONVERSATION_INSTRUCTIONS.length)
      : system;
  }
  if (Array.isArray(system)) {
    return system.map((block) => {
      const text = (block as { text?: unknown } | null)?.text;
      return typeof text === "string" &&
        text.endsWith(CONVERSATION_INSTRUCTIONS)
        ? {
            ...(block as object),
            text: text.slice(0, -CONVERSATION_INSTRUCTIONS.length),
          }
        : block;
    });
  }
  return system;
};

const TURN_ENDING_STOPS = new Set(["end_turn", "stop_sequence"]);

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
  carried?: AnthropicThreadCarry,
): AnthropicThreadSession {
  const headers = { "anthropic-beta": mergeBetas(betaHeader) };
  let enabled = true;
  let previousMessageId: string | undefined;
  // What the thread holds after the last accepted response: the fingerprint of
  // the fixed fields and one hash per message the request carried. The reply
  // the API stored after them is not hashed; it is the API's own copy.
  let stored: { fingerprint: string; hashes: string[] } | undefined;
  let pending: { fingerprint: string; hashes: string[] } | undefined;
  // The call's starting conversation as memory sees it, and how the last
  // stored response ended: together they are what the next call is matched on.
  let startAnchor: string[] | undefined;
  // The call's starting messages, hashed exactly. A thread can be handed to the
  // next call only while it still holds them unchanged: a reclaim that rewrites
  // earlier history leaves a thread the caller's history no longer matches.
  let startHashes: string[] | undefined;
  let extendsStart = true;
  let lastStop: string | undefined;
  // A thread left by the previous call of the session, adopted by the first
  // plan only if everything it was created with is still the same.
  let handedOver = carried;

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
        fixed[field] =
          field === "system" ? withoutConversationNote(bag[field]) : bag[field];
      }
      const fingerprint = sha(fixed);
      const hashes = params.messages.map((message) =>
        sha(withoutCacheControl(message)),
      );
      const memory = params.messages.map(memoryHashOf);
      startAnchor ??= memory;
      startHashes ??= hashes;
      if (
        hashes.length < startHashes.length ||
        !startHashes.every((hash, index) => hashes[index] === hash)
      ) {
        extendsStart = false;
      }
      if (handedOver !== undefined) {
        // The previous call ended on an assistant reply that memory now hands
        // back, and this call adds one user message. The thread also holds the
        // tool blocks memory dropped; that difference is the point of the
        // session scope and is accepted, not detected.
        const prior = handedOver;
        handedOver = undefined;
        const last = params.messages[params.messages.length - 1];
        if (
          params.messages.length >= 3 &&
          (last as { role?: unknown }).role === "user" &&
          prior.fingerprint === fingerprint &&
          prior.anchor.length === memory.length - 1 &&
          prior.anchor.every((hash, index) => hash === memory[index])
        ) {
          previousMessageId = prior.previousMessageId;
          stored = { fingerprint, hashes: hashes.slice(0, -2) };
        }
      }
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

    accept(messageId, stopReason) {
      if (pending === undefined) {
        previousMessageId = undefined;
        stored = undefined;
        lastStop = undefined;
        return;
      }
      previousMessageId = messageId;
      stored = pending;
      pending = undefined;
      lastStop = stopReason;
    },

    reset() {
      previousMessageId = undefined;
      stored = undefined;
      pending = undefined;
      lastStop = undefined;
    },

    disable() {
      enabled = false;
      previousMessageId = undefined;
      stored = undefined;
      pending = undefined;
      lastStop = undefined;
    },

    carry(assistantText) {
      if (
        !enabled ||
        previousMessageId === undefined ||
        stored === undefined ||
        startAnchor === undefined ||
        !extendsStart ||
        lastStop === undefined ||
        !TURN_ENDING_STOPS.has(lastStop)
      ) {
        return undefined;
      }
      return {
        previousMessageId,
        fingerprint: stored.fingerprint,
        anchor: [...startAnchor, memoryHash("assistant", assistantText)],
      };
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

/** How long a thread is kept for the next call of its session. */
const SESSION_THREAD_TTL_MS = 4 * 60 * 1000; // the API drops one after 5 minutes idle
const SESSION_THREAD_MAX = 500;

/**
 * The threads a NeuroLink instance has left behind for its sessions' next
 * calls. In memory and per process only: another process simply creates a new
 * thread, which is always correct. An entry is taken out by the call that
 * continues it, because a response id can be continued once, so two concurrent
 * calls of one session cannot both continue the same thread.
 */
export class AnthropicThreadStore {
  private readonly entries = new Map<string, AnthropicStoredThread>();
  // Bumped when a session (or everything) is cleared. A call records the epoch
  // when it starts and may leave a thread only if it is unchanged, so a stream
  // that finishes after its conversation was cleared cannot bring the thread
  // back. Coarse by design: a missed reuse costs one new thread.
  private globalEpoch = 0;
  private readonly sessionEpochs = new Map<string, number>();
  private sweepTimer: ReturnType<typeof setTimeout> | undefined;

  /**
   * The identity of a thread's owner: who asked, in which session, with which
   * credential and endpoint. A thread belongs to the key that created it, so
   * the credential is part of the key (hashed; the key itself is never kept).
   */
  static keyOf(parts: {
    userId?: string;
    sessionId: string;
    credential: string;
    baseURL?: string;
  }): string {
    return sha([
      parts.userId ?? "",
      parts.sessionId,
      parts.credential,
      parts.baseURL ?? "",
    ]);
  }

  take(key: string, now = Date.now()): AnthropicThreadCarry | undefined {
    const entry = this.entries.get(key);
    if (entry === undefined) {
      return undefined;
    }
    this.entries.delete(key);
    return entry.expiresAt > now ? entry.carry : undefined;
  }

  /** The epoch a call must hand back to `put` for its thread to be kept. */
  epochOf(sessionId: string): string {
    return `${this.globalEpoch}:${this.sessionEpochs.get(sessionId) ?? 0}`;
  }

  put(
    key: string,
    sessionId: string,
    carry: AnthropicThreadCarry,
    epoch: string,
    now = Date.now(),
  ): void {
    if (epoch !== this.epochOf(sessionId)) {
      return;
    }
    this.sweep(now);
    while (this.entries.size >= SESSION_THREAD_MAX) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) {
        break;
      }
      this.entries.delete(oldest);
    }
    this.entries.set(key, {
      sessionId,
      carry,
      expiresAt: now + SESSION_THREAD_TTL_MS,
    });
    this.armSweep();
  }

  /** Drop every entry that has expired. */
  sweep(now = Date.now()): void {
    for (const [key, entry] of this.entries) {
      if (entry.expiresAt <= now) {
        this.entries.delete(key);
      }
    }
  }

  // An idle store still lets go of its entries when they expire. The timer is
  // unref'd, so it never keeps a process alive, and it stops once empty.
  private armSweep(): void {
    if (this.sweepTimer !== undefined) {
      return;
    }
    const timer = setTimeout(() => {
      this.sweepTimer = undefined;
      this.sweep();
      if (this.entries.size > 0) {
        this.armSweep();
      }
    }, SESSION_THREAD_TTL_MS + 1000);
    timer.unref?.();
    this.sweepTimer = timer;
  }

  /**
   * Forget a session's thread, or every thread when no session is named, and
   * fence any call still running from leaving one afterwards.
   */
  forget(sessionId?: string): void {
    if (sessionId === undefined) {
      this.globalEpoch++;
      this.sessionEpochs.clear();
      this.entries.clear();
      if (this.sweepTimer !== undefined) {
        clearTimeout(this.sweepTimer);
        this.sweepTimer = undefined;
      }
      return;
    }
    if (this.sessionEpochs.size >= SESSION_THREAD_MAX) {
      this.globalEpoch++;
      this.sessionEpochs.clear();
    }
    this.sessionEpochs.set(
      sessionId,
      (this.sessionEpochs.get(sessionId) ?? 0) + 1,
    );
    for (const [key, entry] of this.entries) {
      if (entry.sessionId === sessionId) {
        this.entries.delete(key);
      }
    }
  }

  get size(): number {
    return this.entries.size;
  }
}
