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
 * One result from the results of several batches: the answers joined, usage and
 * media summed, the latency of the slowest (the batches ran side by side), and
 * the request ids listed. Model and provider are the first batch's, which is
 * the same for all of them.
 */
export function mergeDecisionResults(
  results: readonly [DecisionResult, ...DecisionResult[]],
): DecisionResult {
  const [first] = results;
  const upstream = results.flatMap((r) =>
    r.upstreamMs === undefined ? [] : [r.upstreamMs],
  );
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
    latencyMs: Math.max(...results.map((r) => r.latencyMs)),
    ...(requestIds.length > 0 ? { requestId: requestIds.join(",") } : {}),
    ...(upstream.length > 0 ? { upstreamMs: Math.max(...upstream) } : {}),
    ...(media.length > 0
      ? { mediaBytes: media.reduce((sum, bytes) => sum + bytes, 0) }
      : {}),
  };
}
