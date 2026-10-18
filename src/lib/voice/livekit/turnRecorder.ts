/**
 * Turns a live voice call's event stream into stored conversation turns.
 *
 * A realtime voice model reports a call as separate, loosely ordered events:
 * final user transcripts, assistant text deltas, tool calls, and the added
 * assistant message that closes a reply. This recorder groups them into
 * exchanges and hands each finished exchange to a `write` function (normally
 * `NeuroLink.recordConversationTurn`).
 *
 * It knows nothing about LiveKit, so it can be driven by a synthetic event
 * stream in tests. The rules it applies:
 *
 *  - An exchange is the user's final transcript(s) plus the assistant message
 *    that answers them. The assistant message's id is the exchange's `turnId`,
 *    which makes a retried write idempotent.
 *  - Settle rule. A user's final transcript can arrive after the assistant has
 *    started, or even finished, replying. A closed reply with no user text is
 *    held for `settleMs`; a transcript arriving in that window completes it.
 *    A reply still without user text after the window (the opening greeting,
 *    typically) is dropped, because a stored turn needs both sides.
 *  - A new user transcript arriving while the previous reply is still being
 *    spoken, and after that exchange already had user text, closes the
 *    previous exchange as interrupted (barge-in) and starts a new one.
 *  - `flush` is for shutdown. It closes the open exchange with what was said
 *    so far, marks it interrupted and call-ended, and appends a short note so
 *    a later reader knows the reply is incomplete. A user turn with no reply
 *    gets the note alone. The flush waits for pending writes only up to a
 *    budget, because the worker process is reaped about a second after the
 *    shutdown callbacks start.
 *  - Writes run strictly one at a time, in order. A failed write is retried;
 *    after the last retry it is reported through `onPermanentFailure` and the
 *    recorder carries on — a storage problem never stops a call.
 *
 * See docs/features/livekit-voice-agent.md.
 */

import { randomUUID } from "node:crypto";
import { logger } from "../../utils/logger.js";
import type {
  StreamEventSequence,
  VoiceTurnClosedExchange,
  VoiceTurnOpenExchange,
  VoiceTurnRecord,
  VoiceTurnRecorder,
  VoiceTurnRecorderOptions,
  VoiceTurnRecorderStats,
} from "../../types/index.js";

const DEFAULT_SETTLE_MS = 1500;
const DEFAULT_RETRIES = 2;
const DEFAULT_RETRY_DELAY_MS = 250;
const DEFAULT_CALL_ENDED_NOTE = "[The call ended before this reply finished.]";
const DEFAULT_NO_REPLY_NOTE = "[The call ended before a reply.]";
/** Tool arguments and results are stored with the turn; keep one entry's text bounded. */
const MAX_TOOL_TEXT_CHARS = 4000;

function boundedText(value: string): string {
  return value.length > MAX_TOOL_TEXT_CHARS
    ? `${value.slice(0, MAX_TOOL_TEXT_CHARS)}…[truncated]`
    : value;
}

function boundedPayload(value: unknown): unknown {
  if (typeof value === "string") {
    return boundedText(value);
  }
  try {
    const text = JSON.stringify(value);
    return text !== undefined && text.length > MAX_TOOL_TEXT_CHARS
      ? boundedText(text)
      : value;
  } catch {
    return "[unserializable]";
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Store one exchange, retrying with a growing delay. After the last attempt (or
 * once shutdown has run out of time) the failure is counted, logged and handed
 * to `onPermanentFailure`; nothing here throws, so a storage problem never
 * stops a call.
 */
async function writeWithRetry(
  record: VoiceTurnRecord,
  context: {
    options: VoiceTurnRecorderOptions;
    stats: VoiceTurnRecorderStats;
    retries: number;
    retryDelayMs: number;
    isOutOfTime: () => boolean;
  },
): Promise<void> {
  const { options, stats, retries, retryDelayMs, isOutOfTime } = context;
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      await options.write(record);
      stats.written += 1;
      options.onRecorded?.(record);
      return;
    } catch (error) {
      lastError = error;
      if (attempt === retries || isOutOfTime()) {
        break;
      }
      await wait(retryDelayMs * (attempt + 1));
    }
  }
  stats.failed += 1;
  logger.error("voice.turnRecorder.writeFailed", {
    turnId: record.turnId,
    error: lastError instanceof Error ? lastError.message : String(lastError),
  });
  try {
    options.onPermanentFailure?.(record, lastError);
  } catch {
    /* a failure sink must never break the call */
  }
}

/** The stored form of a closed exchange. */
function turnRecord(exchange: {
  turnId: string;
  user: string;
  assistant: string;
  interrupted: boolean;
  callEnded: boolean;
  events: StreamEventSequence[];
  startedAt: number;
}): VoiceTurnRecord {
  return {
    turnId: exchange.turnId,
    userMessage: exchange.user,
    aiResponse: exchange.assistant,
    interrupted: exchange.interrupted,
    callEnded: exchange.callEnded,
    startTime: new Date(exchange.startedAt),
    ...(exchange.events.length > 0 ? { events: exchange.events } : {}),
  };
}

/** Create a recorder for one call. */
export function createVoiceTurnRecorder(
  options: VoiceTurnRecorderOptions,
): VoiceTurnRecorder {
  const settleMs = options.settleMs ?? DEFAULT_SETTLE_MS;
  const retries = options.retries ?? DEFAULT_RETRIES;
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  const callEndedNote = options.callEndedNote ?? DEFAULT_CALL_ENDED_NOTE;
  const noReplyNote = options.noReplyNote ?? DEFAULT_NO_REPLY_NOTE;
  const now = options.now ?? Date.now;
  const callId = options.callId ?? randomUUID();

  const stats: VoiceTurnRecorderStats = {
    written: 0,
    failed: 0,
    dropped: 0,
    pending: 0,
  };

  let open = newExchange();
  // Every reply id that has been written or queued, so a reply delivered a
  // second time can never be paired with the next question.
  const seenReplyIds = new Set<string>();
  let greetingPending = false;
  const awaitingUser: VoiceTurnClosedExchange[] = [];
  let queue: Promise<void> = Promise.resolve();
  let eventSeq = 0;
  let syntheticTurns = 0;
  let closing = false;
  let deadline: number | undefined;

  function newExchange(): VoiceTurnOpenExchange {
    return {
      userSegments: [],
      assistantPartial: "",
      assistantStarted: false,
      events: [],
      startedAt: now(),
    };
  }

  function nextEvent(
    type: string,
    fields: Record<string, unknown>,
  ): StreamEventSequence {
    const event: StreamEventSequence = {
      type,
      seq: eventSeq,
      timestamp: now(),
      ...fields,
    };
    eventSeq += 1;
    return event;
  }

  function enqueue(record: VoiceTurnRecord): void {
    stats.pending += 1;
    queue = queue.then(async () => {
      try {
        await writeWithRetry(record, {
          options,
          stats,
          retries,
          retryDelayMs,
          isOutOfTime: () =>
            closing && deadline !== undefined && now() >= deadline,
        });
      } finally {
        stats.pending -= 1;
      }
    });
  }

  function finishExchange(exchange: Parameters<typeof turnRecord>[0]): void {
    const record = turnRecord(exchange);
    try {
      options.onClosed?.(record);
    } catch {
      /* an observer of closed exchanges must never break the call */
    }
    enqueue(record);
  }

  function syntheticTurnId(): string {
    syntheticTurns += 1;
    return `call-${callId}-${syntheticTurns}`;
  }

  function dropClosed(exchange: VoiceTurnClosedExchange): void {
    clearTimeout(exchange.timer);
    stats.dropped += 1;
    logger.debug("voice.turnRecorder.assistantOnlyDropped", {
      turnId: exchange.turnId,
    });
  }

  return {
    userTranscript(segment: { text: string; final: boolean }): void {
      const text = segment.text.trim();
      if (closing || !segment.final || !text) {
        return;
      }
      const waiting = awaitingUser.shift();
      if (waiting) {
        clearTimeout(waiting.timer);
        finishExchange({
          turnId: waiting.turnId,
          user: text,
          assistant: waiting.assistantText,
          interrupted: waiting.interrupted,
          callEnded: false,
          events: waiting.events,
          startedAt: waiting.startedAt,
        });
        return;
      }
      if (open.assistantStarted && open.userSegments.length > 0) {
        // The user spoke again while the previous reply was still going: close
        // that exchange as cut off, and start a new one with this transcript.
        finishExchange({
          turnId: syntheticTurnId(),
          user: open.userSegments.join(" "),
          assistant: open.assistantPartial.trim() || noReplyNote,
          interrupted: true,
          callEnded: false,
          events: open.events,
          startedAt: open.startedAt,
        });
        open = newExchange();
      }
      open.userSegments.push(text);
    },

    assistantDelta(delta: string): void {
      if (closing || !delta) {
        return;
      }
      open.assistantStarted = true;
      open.assistantPartial += delta;
    },

    assistantMessage(message: {
      id: string;
      text: string;
      interrupted?: boolean;
    }): void {
      if (closing) {
        return;
      }
      const text = message.text.trim() || open.assistantPartial.trim();
      if (!text) {
        // An item with no spoken text (a tool-only message) closes nothing.
        return;
      }
      if (seenReplyIds.has(message.id)) {
        // The same reply delivered again, whether it is still waiting for its
        // user text or was already written.
        return;
      }
      seenReplyIds.add(message.id);
      if (greetingPending) {
        // The agent's opening line is an instruction, not an answer: it is not
        // a turn, and it must never be paired with the user's first question
        // (they may speak over it).
        greetingPending = false;
        // Whatever the user has already said stays: it belongs to the reply
        // that follows, not to the greeting.
        open.assistantPartial = "";
        open.assistantStarted = false;
        return;
      }
      const exchange = open;
      open = newExchange();
      const interrupted = message.interrupted === true;
      if (exchange.userSegments.length > 0) {
        finishExchange({
          turnId: message.id,
          user: exchange.userSegments.join(" "),
          assistant: text,
          interrupted,
          callEnded: false,
          events: exchange.events,
          startedAt: exchange.startedAt,
        });
        return;
      }
      const closed: VoiceTurnClosedExchange = {
        turnId: message.id,
        assistantText: text,
        interrupted,
        events: exchange.events,
        startedAt: exchange.startedAt,
        timer: setTimeout(() => {
          const index = awaitingUser.indexOf(closed);
          if (index >= 0) {
            awaitingUser.splice(index, 1);
            dropClosed(closed);
          }
        }, settleMs),
      };
      closed.timer.unref?.();
      awaitingUser.push(closed);
    },

    expectGreeting(): void {
      greetingPending = true;
    },

    toolStart(call: { name: string; args?: unknown; callId?: string }): void {
      if (closing) {
        return;
      }
      open.events.push(
        nextEvent("tool:start", {
          tool: call.name,
          toolName: call.name,
          ...(call.callId !== undefined ? { callId: call.callId } : {}),
          ...(call.args !== undefined
            ? { args: boundedPayload(call.args) }
            : {}),
        }),
      );
    },

    toolEnd(call: {
      name: string;
      result?: unknown;
      error?: string;
      callId?: string;
    }): void {
      if (closing) {
        return;
      }
      open.events.push(
        nextEvent("tool:end", {
          tool: call.name,
          toolName: call.name,
          ...(call.callId !== undefined ? { callId: call.callId } : {}),
          success: call.error === undefined,
          ...(call.error !== undefined
            ? { error: boundedText(call.error) }
            : { result: boundedPayload(call.result) }),
        }),
      );
    },

    async flush(budgetMs: number): Promise<VoiceTurnRecorderStats> {
      if (!closing) {
        closing = true;
        deadline = now() + budgetMs;
        for (const waiting of awaitingUser.splice(0)) {
          dropClosed(waiting);
        }
        const user = open.userSegments.join(" ");
        if (user) {
          const partial = open.assistantPartial.trim();
          finishExchange({
            turnId: syntheticTurnId(),
            user,
            assistant: partial ? `${partial} ${callEndedNote}` : noReplyNote,
            interrupted: partial.length > 0,
            callEnded: true,
            events: open.events,
            startedAt: open.startedAt,
          });
        } else if (open.assistantPartial.trim()) {
          stats.dropped += 1;
        }
        open = newExchange();
      }
      let timedOut = false;
      await Promise.race([
        queue,
        wait(Math.max(0, (deadline ?? now()) - now())).then(() => {
          timedOut = true;
        }),
      ]);
      if (timedOut && stats.pending > 0) {
        logger.warn("voice.turnRecorder.flushBudgetExceeded", {
          pending: stats.pending,
          budgetMs,
        });
      }
      return { ...stats };
    },

    stats(): VoiceTurnRecorderStats {
      return { ...stats };
    },
  };
}
