/**
 * Shared provider-error classification. Every provider's
 * `formatProviderError(error)` delegates here instead of hand-rolling its
 * own TimeoutError-check → .includes()-chain → `new XError(...)` ladder.
 *
 * `classifyProviderError` picks the Error subclass + message; it does NOT
 * stamp statusCode/isRetryable/retryAfterMs onto the result — that
 * passthrough already happens generically in
 * `BaseProvider.handleProviderError()` (src/lib/core/baseProvider.ts) for
 * every provider's returned error, migrated or not, so duplicating it here
 * would risk the two copies disagreeing.
 */

import {
  ProviderError,
  AuthenticationError,
  RateLimitError,
  InvalidModelError,
  NetworkError,
  type ProviderErrorContext,
  type ProviderErrorRule,
} from "../types/index.js";
import { TimeoutError } from "./timeout.js";
import { duckTypedStatusCode } from "./providerRetry.js";
import { TRANSIENT_NETWORK_CODES } from "../constants/networkErrorCodes.js";
import { redactUrlsInText } from "./logSanitize.js";

/** Bounded walk depth for `.cause` chains — matches the precedent in
 * `proxy/proxyFetch.ts`'s `isTransientNetworkError`. Guards against
 * pathological/cyclic `.cause` chains hanging classification. */
const MAX_CAUSE_DEPTH = 5;

/**
 * Walk `error.cause` up to `MAX_CAUSE_DEPTH` links, guarded by a seen-set so
 * a cyclic chain (`a.cause === a`, or a longer cycle) terminates instead of
 * looping. Node's native `fetch` (undici) throws `TypeError: fetch failed`
 * with the real transport error nested under `.cause` — sometimes another
 * level deep (e.g. a SocketError inside a ConnectTimeoutError) — so a
 * classifier that only reads the outer error's `.message`/`.code` never
 * sees it.
 */
function collectCauseChain(error: unknown): Record<string, unknown>[] {
  const chain: Record<string, unknown>[] = [];
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (
    current &&
    typeof current === "object" &&
    !seen.has(current) &&
    chain.length < MAX_CAUSE_DEPTH
  ) {
    seen.add(current);
    const record = current as Record<string, unknown>;
    chain.push(record);
    current = record.cause;
  }
  return chain;
}

function firstString(
  chain: Record<string, unknown>[],
  key: "name" | "code",
): string | undefined {
  for (const record of chain) {
    if (typeof record[key] === "string") {
      return record[key] as string;
    }
  }
  return undefined;
}

function buildErrorContext(
  error: unknown,
  provider: string,
  modelName?: string,
): ProviderErrorContext {
  const chain = collectCauseChain(error);
  const top = chain[0];
  const topMessage =
    typeof top?.message === "string"
      ? top.message
      : error instanceof Error
        ? error.message
        : "Unknown error";

  // Compose (never replace) the message: append the deepest cause's message
  // when it differs from the top, so existing rules matching the outer text
  // (e.g. "rate limit", "model not found") keep matching, while the real
  // transport failure buried in .cause becomes visible to rules that need
  // it (e.g. a nested "ECONNREFUSED").
  // The nested message is redacted before it is composed in: an undici cause
  // carries the full request URL, so a presigned token would otherwise reach
  // a client-facing error message through this path. Only the nested text is
  // scrubbed — the provider's own top-level message is left alone, since
  // several providers deliberately name their base URL in it.
  const deepest = chain[chain.length - 1];
  const deepestMessage =
    typeof deepest?.message === "string"
      ? redactUrlsInText(deepest.message)
      : undefined;
  const message =
    deepestMessage && deepestMessage !== topMessage
      ? `${topMessage}: ${deepestMessage}`
      : topMessage;

  // errorCode/errorName/statusCode: prefer the outer error's own value,
  // falling back to the first cause in the chain that has one.
  let statusCode: number | undefined;
  for (const record of chain) {
    statusCode = duckTypedStatusCode(record);
    if (statusCode !== undefined) {
      break;
    }
  }

  return {
    error,
    message,
    statusCode,
    errorName: firstString(chain, "name"),
    errorCode: firstString(chain, "code"),
    provider,
    modelName,
  };
}

/**
 * Classify a raw provider error into a NeuroLink `ProviderError` subclass.
 * `rules` are tried in order; the first match wins. `TimeoutError` is
 * always handled first, ahead of any rule table — every provider treated
 * it identically before this change, so it is not made overridable.
 */
export function classifyProviderError(
  error: unknown,
  rules: ProviderErrorRule[],
  provider: string,
  modelName?: string,
): Error {
  if (error instanceof TimeoutError) {
    return new NetworkError(`Request timed out: ${error.message}`, provider);
  }
  const ctx = buildErrorContext(error, provider, modelName);
  const rule = rules.find((r) => r.match(ctx));
  if (!rule) {
    return new ProviderError(`${provider} error: ${ctx.message}`, provider);
  }
  const message =
    typeof rule.message === "function" ? rule.message(ctx) : rule.message;
  return new rule.errorClass(message, provider);
}

/**
 * Generic fallback rule table covering the five categories every
 * OpenAI-compatible provider already hand-rolled near-identically:
 * auth (401), rate limit (429), model-not-found (404), network/connection
 * errors, and 5xx server errors. Providers with a provider-specific auth
 * message (naming the exact env var) prepend one override rule and spread
 * this table after it — see errorClassifier usage in any migrated
 * provider's formatProviderError for the pattern.
 */
export const DEFAULT_ERROR_RULES: ProviderErrorRule[] = [
  {
    match: (ctx) =>
      ctx.statusCode === 401 ||
      /API_KEY_INVALID|Invalid API key|Unauthorized|invalid_api_key/i.test(
        ctx.message,
      ),
    errorClass: AuthenticationError,
    message: (ctx) =>
      `Invalid ${ctx.provider} API key. Please check your credentials.`,
  },
  {
    match: (ctx) => ctx.statusCode === 429 || /rate limit/i.test(ctx.message),
    errorClass: RateLimitError,
    message: (ctx) =>
      `${ctx.provider} rate limit exceeded. Please try again later.`,
  },
  {
    match: (ctx) =>
      ctx.statusCode === 404 ||
      /model_not_found|model not found/i.test(ctx.message),
    errorClass: InvalidModelError,
    message: (ctx) =>
      ctx.modelName
        ? `${ctx.provider} model '${ctx.modelName}' not found.`
        : `${ctx.provider} model not found.`,
  },
  {
    // Message regex covers providers/SDKs that surface a code as text
    // (e.g. AWS SDK wrapping "ECONNRESET" into its own message). errorCode
    // covers undici's native fetch(), which wraps transport failures as
    // `TypeError: fetch failed` and puts the *structured* code
    // (ECONNREFUSED, UND_ERR_SOCKET, ...) on a nested `.cause` rather than
    // in any message text — buildErrorContext's cause walk surfaces it here.
    match: (ctx) =>
      /ECONNRESET|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|network|connection/i.test(
        ctx.message,
      ) ||
      (ctx.errorCode !== undefined &&
        TRANSIENT_NETWORK_CODES.has(ctx.errorCode)),
    errorClass: NetworkError,
    message: (ctx) => `Connection error: ${ctx.message}`,
  },
  {
    // Batch J Task 3: the old `/\b5\d\d\b/` matched ANY bare 3-digit number
    // in [500,599) anywhere in the message — e.g. "max_tokens (500) exceeds
    // model limit" — with no relation to an actual HTTP status. Tightened to
    // require the number sit in a status-shaped context: immediately next
    // to "error" (either order) or "status"/"status code" (a common HTTP
    // client wrapper phrase, e.g. axios's "Request failed with status code
    // 500"), with a bounded gap so unrelated digits nearby can't bridge the
    // match — or a named 5xx phrase that needs no digit at all ("bad
    // gateway", "service unavailable", "gateway timeout", "server error",
    // which already covers "... Internal Server Error"). This changes the
    // MATCHED MESSAGE TEXT only, never the classified class: when no rule
    // matches, `classifyProviderError`'s fallback also returns
    // `ProviderError` (see above) — the same class this rule assigns — so
    // narrowing this regex can only move a message between "${provider}
    // server error: ..." and "${provider} error: ...", never between error
    // classes.
    match: (ctx) =>
      (ctx.statusCode !== undefined &&
        ctx.statusCode >= 500 &&
        ctx.statusCode <= 599) ||
      /server error|bad gateway|service unavailable|gateway timeout|\berror\b\D{0,12}\b5\d\d\b|\b5\d\d\b\D{0,12}\berror\b|\bstatus(?:\s*code)?\b\D{0,12}\b5\d\d\b/i.test(
        ctx.message,
      ),
    errorClass: ProviderError,
    message: (ctx) => `${ctx.provider} server error: ${ctx.message}`,
  },
];
