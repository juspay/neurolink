/**
 * Shared provider-error classification. Migrated providers'
 * `formatProviderError(error)` delegate here instead of hand-rolling their
 * own TimeoutError-check → .includes()-chain → `new XError(...)` ladder.
 * Not yet migrated (they do not call it): Google AI Studio, SageMaker, the
 * media and embedding providers (Ideogram, Recraft, Stability, Replicate,
 * Jina, Voyage) and the System One decision provider.
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

// A 404 alone is a route answer (a wrong base URL gives the same reply): it only
// means "missing model" when the text names a model or deployment as absent.
// The gap is bounded rather than "no dot" because real model ids contain dots.
// "model" or "deployment" followed by a route noun ("model gateway route") is a
// modifier of that route, not the subject of the 404, in either word order, and
// that holds for the named phrases ("unknown model gateway route") as well.
const NOT_A_ROUTE_MODIFIER =
  "(?![\\s-]+(?:route|gateway|endpoint|url|path|proxy|server|service|api|host)s?(?![\\w-]))";
const MODEL_WORD = `\\bmodel\\b${NOT_A_ROUTE_MODIFIER}`;
const MODEL_OR_DEPLOYMENT = `\\b(?:model|deployment)\\b${NOT_A_ROUTE_MODIFIER}`;
const NAMED_MODEL_ERROR = `(?:unknown|no such|invalid|unsupported) model${NOT_A_ROUTE_MODIFIER}`;
const MODEL_404_TEXT = new RegExp(
  `model[_ ]?not[_ ]?found|${NAMED_MODEL_ERROR}|${MODEL_OR_DEPLOYMENT}.{0,120}\\b(?:does not exist|not found|unavailable|not (?:available|supported))\\b|\\b(?:does not exist|not found)\\b.{0,120}${MODEL_OR_DEPLOYMENT}|unable to access.{0,60}${MODEL_WORD}`,
  "i",
);

/**
 * True when `status` is written in `message` as an HTTP status, as opposed to
 * an unrelated number that happens to have the same digits ("max_tokens (429)
 * exceeds the model limit", a request id, a token count). Provider rules that
 * once tested the bare digits (`/429/`) classified such a 400 as a rate limit.
 *
 * Status-shaped means one of:
 *  - the text starts with it, the way some SDKs format an API error
 *    ("429 {...}", "401 Unauthorized");
 *  - it follows "status", "status code" or "HTTP" ("Request failed with status
 *    code 429", "HTTP/1.1 429");
 *  - it sits next to the word "error" in either order ("error 429", "429 error",
 *    and the nested JSON body `{"error":{"code":429`).
 *
 * The gap between the word and the number is bounded and holds no digit, so
 * unrelated digits further along cannot bridge the match. This is the shape the
 * shared 5xx rule in `DEFAULT_ERROR_RULES` already uses, so the two stay in
 * step. It is a heuristic over text: a rule that can read the structured
 * status should still check `ctx.statusCode` first.
 */
export function messageNamesStatus(message: string, status: number): boolean {
  if (!Number.isInteger(status) || status < 100 || status > 599) {
    return false;
  }
  const code = String(status);
  return new RegExp(
    `^\\s*${code}\\b|\\b(?:error|status(?:\\s*code)?)\\b\\D{0,12}\\b${code}\\b|\\bhttp(?:/\\d(?:\\.\\d)?)?[\\s:-]{0,3}${code}\\b|\\b${code}\\b\\D{0,12}\\berror\\b`,
    "i",
  ).test(message);
}

/**
 * Generic fallback rule table covering the five categories every
 * OpenAI-compatible provider already hand-rolled near-identically:
 * auth (401), rate limit (429), model-not-found, network/connection
 * errors, and 5xx server errors. Model-not-found is a 404 whose text names
 * the model or deployment as missing, or the old "model not found" message
 * text at any status; any other 404 stays a plain `ProviderError` carrying
 * the status and the vendor's message. Providers with a provider-specific
 * auth message (naming the exact env var) prepend one override rule and
 * spread this table after it — see errorClassifier usage in any migrated
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
      /model_not_found|model not found/i.test(ctx.message) ||
      (ctx.statusCode === 404 && MODEL_404_TEXT.test(ctx.message)),
    errorClass: InvalidModelError,
    message: (ctx) =>
      ctx.modelName
        ? `${ctx.provider} model '${ctx.modelName}' not found.`
        : `${ctx.provider} model not found.`,
  },
  {
    match: (ctx) => ctx.statusCode === 404,
    errorClass: ProviderError,
    message: (ctx) => `${ctx.provider} returned HTTP 404: ${ctx.message}`,
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
