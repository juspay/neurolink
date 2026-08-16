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

function buildErrorContext(
  error: unknown,
  provider: string,
  modelName?: string,
): ProviderErrorContext {
  const record =
    error && typeof error === "object"
      ? (error as Record<string, unknown>)
      : undefined;
  const message =
    typeof record?.message === "string"
      ? record.message
      : error instanceof Error
        ? error.message
        : "Unknown error";
  return {
    error,
    message,
    statusCode: duckTypedStatusCode(error),
    errorName: typeof record?.name === "string" ? record.name : undefined,
    errorCode: typeof record?.code === "string" ? record.code : undefined,
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
    match: (ctx) =>
      /ECONNRESET|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|network|connection/i.test(
        ctx.message,
      ),
    errorClass: NetworkError,
    message: (ctx) => `Connection error: ${ctx.message}`,
  },
  {
    match: (ctx) =>
      (ctx.statusCode !== undefined && ctx.statusCode >= 500) ||
      /\b5\d\d\b|server error/i.test(ctx.message),
    errorClass: ProviderError,
    message: (ctx) => `${ctx.provider} server error: ${ctx.message}`,
  },
];
