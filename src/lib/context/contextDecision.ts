/**
 * Relevance-driven context compaction.
 *
 * Every stage of the existing compactor is *positional*: prune protects the
 * most recent 40K tokens, truncation drops the oldest half, summarization
 * keeps a trailing ratio. None of them has any notion of what the current
 * request is about, so a fifty-turn conversation that ends with "now rename
 * that variable" keeps the forty turns about database migrations and drops
 * nothing that matters less.
 *
 * A decision model changes the economics of asking. Latency is flat in
 * question count — one question and four hundred questions cost the same
 * round trip — so "is this message needed to answer the current request?" can
 * be asked about *every* message at once, for about $0.00002.
 *
 * What it must never do is lose something the turn needed. The guards below
 * are therefore deliberately conservative, and every one of them is a veto:
 *
 * - only plain user/assistant text is ever eligible; tool calls, tool
 *   results, summaries, pinned skills and system messages are untouchable,
 *   because dropping half of a tool-call pair produces a malformed request
 *   rather than a smaller one
 * - the most recent messages are never eligible, whatever the model says
 * - a message is dropped only on a CONFIDENT no, never on silence or a
 *   near-coin-flip
 * - at most a bounded fraction of eligible messages may go in one pass
 *
 * @module context/contextDecision
 */

import { decisionKey, gateDecisionBoolean } from "../utils/decisionAnswers.js";
import { logger } from "../utils/logger.js";
import type {
  ChatMessage,
  ContextRelevanceOptions,
  ContextRelevanceResult,
  DecisionCallerFn,
  DecisionQuestion,
} from "../types/index.js";

const MESSAGE_NAMESPACE = "msg";

/** Messages at the tail that are never eligible, whatever the model says. */
const DEFAULT_PROTECT_RECENT = 6;

/** Ceiling on the share of eligible messages one pass may drop. */
const DEFAULT_MAX_DROP_RATIO = 0.5;

/**
 * How sure the model must be that a message is irrelevant. High, for the same
 * reason the tool router's bar is high: keeping a useless message costs
 * tokens, losing a needed one costs the answer.
 */
const DEFAULT_MIN_DROP_CONFIDENCE = 0.6;

/** Never ask about more than this many messages in one request. */
const MAX_QUESTIONS = 300;

/** Per-message text sent as state. Enough to judge, bounded enough to batch. */
const MAX_MESSAGE_CHARS = 1200;

const RELEVANCE_INSTRUCTIONS =
  "This earlier message contains information the assistant still needs in order to answer the current request correctly. Treat it as needed if it states a requirement, a decision, a constraint, a correction, a name, a number, or a preference that the current request builds on. Treat it as not needed if the current request is about something else entirely, or if the message is small talk, an acknowledgement, or superseded by a later message.";

/**
 * A message is eligible for relevance-based dropping only if losing it cannot
 * corrupt the request. That rules out far more than it keeps, on purpose.
 */
function isEligible(message: ChatMessage): boolean {
  if (message.role !== "user" && message.role !== "assistant") {
    return false;
  }
  if (typeof message.content !== "string" || message.content.trim() === "") {
    return false;
  }
  // A summary already represents messages that were dropped; dropping it
  // discards all of them at once.
  if (message.metadata?.isSummary) {
    return false;
  }
  // Pinned skill instructions are replayed verbatim by design and are already
  // protected from truncation.
  if (message.metadata?.isSkill) {
    return false;
  }
  // Assistant turns that carry tool calls pair with a tool_result elsewhere.
  if (message.tool || message.toolCallId || message.events?.length) {
    return false;
  }
  if (message.isTruncationMarker || message.condenseParent) {
    return false;
  }
  return true;
}

/**
 * Ask which earlier messages the current request still needs, and return the
 * ones to drop.
 *
 * Returns `null` when nothing should change — no decision provider, a failed
 * call, nothing eligible, or no confident drop. A null return is the signal
 * to carry on with positional compaction exactly as before.
 */
export async function selectIrrelevantMessages(
  messages: ChatMessage[],
  currentRequest: string,
  decide: DecisionCallerFn,
  options?: ContextRelevanceOptions,
): Promise<ContextRelevanceResult | null> {
  const protectRecent = options?.protectRecent ?? DEFAULT_PROTECT_RECENT;
  const minConfidence =
    options?.minDropConfidence ?? DEFAULT_MIN_DROP_CONFIDENCE;
  const maxDropRatio = options?.maxDropRatio ?? DEFAULT_MAX_DROP_RATIO;

  const cutoff = Math.max(0, messages.length - protectRecent);
  const eligible = messages
    .map((message, index) => ({ message, index }))
    .filter(({ message, index }) => index < cutoff && isEligible(message))
    .slice(0, MAX_QUESTIONS);

  if (eligible.length === 0 || !currentRequest.trim()) {
    return null;
  }

  const questions: Record<string, DecisionQuestion> = {};
  eligible.forEach((entry, position) => {
    questions[decisionKey(MESSAGE_NAMESPACE, position)] = {
      type: "boolean",
      instructions: RELEVANCE_INSTRUCTIONS,
      criteria: {
        true: `The current request depends on this message: "${preview(entry.message)}"`,
        false: "The current request does not depend on this message.",
      },
    };
  });

  const result = await decide({
    state: {
      current_request: currentRequest.slice(0, 4000),
      conversation: eligible.map((entry, position) => ({
        index: position,
        role: entry.message.role,
        text: preview(entry.message),
      })),
    },
    questions,
    timeoutMs: options?.timeoutMs,
  });

  if (!result) {
    return null;
  }

  const dropCandidates: number[] = [];
  let answered = 0;
  eligible.forEach((entry, position) => {
    const verdict = gateDecisionBoolean(
      result.answers,
      decisionKey(MESSAGE_NAMESPACE, position),
      { minConfidence },
    );
    if (verdict !== undefined) {
      answered += 1;
    }
    if (verdict === false) {
      dropCandidates.push(entry.index);
    }
  });

  if (answered === 0 || dropCandidates.length === 0) {
    return null;
  }

  // Cap how much one pass may remove. Beyond this the model is more likely to
  // have misread the request than to be right about most of the conversation,
  // and positional compaction is the safer tool for a wholesale reduction.
  //
  // `dropCandidates` is built by walking `eligible` oldest-first, so slicing
  // from the front drops the OLDEST candidates and spares the newest when the
  // cap binds — the same recency assumption every other stage makes.
  const maxDrops = Math.floor(eligible.length * maxDropRatio);
  const droppedIndices = dropCandidates.slice(0, Math.max(0, maxDrops));

  if (droppedIndices.length === 0) {
    return null;
  }

  const dropSet = new Set(droppedIndices);
  const kept = messages.filter((_, index) => !dropSet.has(index));

  logger.info("[Compaction] Stage 0 (relevance)", {
    model: result.model,
    latencyMs: result.latencyMs,
    askedCount: eligible.length,
    answeredCount: answered,
    droppedCount: droppedIndices.length,
    cappedFrom: dropCandidates.length,
  });

  return {
    messages: kept,
    droppedIndices,
    askedCount: eligible.length,
    answeredCount: answered,
    model: result.model,
    latencyMs: result.latencyMs,
  };
}

/**
 * Gate a generated summary before it replaces the messages it covers.
 *
 * Stage 3 accepts any non-empty string today, so a summarizer that returned
 * an apology, a refusal, or a truncated fragment silently destroys the
 * conversation it was meant to preserve — and the messages are gone by the
 * time anyone reads the summary.
 *
 * Returns `true` when the summary may be used and `false` only on a confident
 * rejection. Anything else — no decision provider, a failed call, an
 * unanswered or uncertain verdict — returns `true`, because refusing a
 * summary means falling through to truncation, which loses strictly more.
 */
export async function summaryPreservesContext(
  summary: string,
  replacedMessages: ChatMessage[],
  decide: DecisionCallerFn,
  options?: { timeoutMs?: number; minConfidence?: number },
): Promise<boolean> {
  if (!summary.trim() || replacedMessages.length === 0) {
    return true;
  }

  const result = await decide({
    state: {
      summary: summary.slice(0, 12000),
      original_messages: replacedMessages.slice(-60).map((message) => ({
        role: message.role,
        text: preview(message),
      })),
    },
    questions: {
      preserves: {
        type: "boolean",
        instructions:
          "The summary preserves every decision, requirement, constraint, correction and open question from the original messages. Nothing that a later turn could need has been dropped.",
      },
      is_refusal: {
        type: "boolean",
        instructions:
          "The summary is not a summary at all — it is an apology, a refusal, an error message, or a request for clarification.",
      },
    },
    timeoutMs: options?.timeoutMs,
  });

  if (!result) {
    return true;
  }

  const minConfidence = options?.minConfidence ?? 0.6;
  const refusal = gateDecisionBoolean(result.answers, "is_refusal", {
    minConfidence,
  });
  if (refusal === true) {
    logger.warn("[Compaction] Summary rejected — not a summary", {
      model: result.model,
    });
    return false;
  }

  const preserves = gateDecisionBoolean(result.answers, "preserves", {
    minConfidence,
  });
  if (preserves === false) {
    logger.warn("[Compaction] Summary rejected — loses required context", {
      model: result.model,
      messageCount: replacedMessages.length,
    });
    return false;
  }
  return true;
}

/** Bounded text for one message, used in both state and criteria. */
function preview(message: ChatMessage): string {
  return message.content.slice(0, MAX_MESSAGE_CHARS);
}
