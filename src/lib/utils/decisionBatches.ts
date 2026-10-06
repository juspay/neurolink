import type { DecisionOptions, DecisionResult } from "../types/index.js";

/**
 * How many batches of one split request are in flight at once. A request that
 * splits into many must not meet the vendor's rate limit first: Perplexity, for
 * one, allows ten requests a second.
 */
export const MAX_PARALLEL_DECISION_BATCHES = 4;

/**
 * Cut a request whose question map is longer than a provider's cap into
 * requests the provider takes, keeping the questions in the order they were
 * given. A request that fits, or a provider with no cap, comes back as the one
 * request it was.
 *
 * `state` and any images or video travel with every batch, since each batch is
 * a decision of its own.
 */
export function splitDecisionRequest(
  options: DecisionOptions,
  maxQuestions: number | undefined,
): DecisionOptions[] {
  const entries = Object.entries(options.questions);
  if (
    maxQuestions === undefined ||
    maxQuestions < 1 ||
    entries.length <= maxQuestions
  ) {
    return [options];
  }
  const batches: DecisionOptions[] = [];
  for (let from = 0; from < entries.length; from += maxQuestions) {
    batches.push({
      ...options,
      questions: Object.fromEntries(entries.slice(from, from + maxQuestions)),
    });
  }
  return batches;
}

/**
 * One result from the batches of a split request, or `undefined` when no batch
 * answered. `groups` holds the answered batches of each group that ran, in
 * order: the batches inside a group ran side by side, and the groups ran one
 * after another.
 *
 * Answers are joined and usage and media summed. `latencyMs` is the caller's
 * measured wall-clock time for the whole split request — not the slowest
 * batch, which under-reports as soon as more than one group has to run.
 * `upstreamMs` follows the same shape: the slowest batch of each group, summed
 * over the groups. Request ids are listed; model and provider are the first
 * batch's, which is the same for all of them.
 */
export function mergeDecisionResults(
  groups: readonly (readonly DecisionResult[])[],
  wallClockMs: number,
): DecisionResult | undefined {
  const results = groups.flat();
  const [first] = results;
  if (first === undefined) {
    return undefined;
  }
  const upstreamByGroup = groups.flatMap((group) => {
    const upstream = group.flatMap((r) =>
      r.upstreamMs === undefined ? [] : [r.upstreamMs],
    );
    return upstream.length > 0 ? [Math.max(...upstream)] : [];
  });
  const media = results.flatMap((r) =>
    r.mediaBytes === undefined ? [] : [r.mediaBytes],
  );
  const requestIds = results.flatMap((r) => (r.requestId ? [r.requestId] : []));
  return {
    model: first.model,
    provider: first.provider,
    answers: Object.assign({}, ...results.map((r) => r.answers)),
    usage: {
      inputTokens: results.reduce((sum, r) => sum + r.usage.inputTokens, 0),
      outputTokens: results.reduce((sum, r) => sum + r.usage.outputTokens, 0),
    },
    latencyMs: wallClockMs,
    ...(requestIds.length > 0 ? { requestId: requestIds.join(",") } : {}),
    ...(upstreamByGroup.length > 0
      ? { upstreamMs: upstreamByGroup.reduce((sum, ms) => sum + ms, 0) }
      : {}),
    ...(media.length > 0
      ? { mediaBytes: media.reduce((sum, bytes) => sum + bytes, 0) }
      : {}),
  };
}
