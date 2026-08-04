/**
 * Shared provider-error classification utilities used by both neurolink.ts and
 * the ModelPool routing subsystem.
 *
 * Extracted here to avoid duplication and to ensure that typed error classes
 * (AuthenticationError, AuthorizationError, ModelAccessDeniedError) are
 * checked consistently in both code paths.
 */

import {
  AuthenticationError,
  AuthorizationError,
  InvalidModelError,
  ModelAccessDeniedError,
} from "../types/index.js";
import {
  NON_RETRYABLE_HTTP_STATUS_CODES,
  isDeterministicClientErrorMessage,
} from "./retryability.js";

/**
 * Detects whether an error object looks like a model-access-denied condition.
 * Matches LiteLLM "team not allowed" / "team can only access models=[...]"
 * plus typed-error name/code markers when the full typed class is not present.
 */
export function looksLikeModelAccessDenied(error: unknown): boolean {
  if (!error) {
    return false;
  }
  const e = error as { name?: string; code?: string; message?: string };
  if (e.name === "ModelAccessDeniedError") {
    return true;
  }
  if (e.code === "MODEL_ACCESS_DENIED") {
    return true;
  }
  const msg =
    typeof e.message === "string"
      ? e.message
      : error instanceof Error
        ? error.message
        : String(error);
  if (!msg) {
    return false;
  }
  const lower = msg.toLowerCase();
  return (
    (lower.includes("team") && lower.includes("not allowed")) ||
    lower.includes("team can only access") ||
    /not\s+allowed\s+to\s+access\s+(this\s+)?model/i.test(msg)
  );
}

/**
 * Detects "the provider does not have this model": HTTP 404 model lookups,
 * Google's NOT_FOUND, Anthropic's `not_found_error` naming the model, and the
 * typed InvalidModelError providers raise for an unrecognised model id.
 *
 * Deliberately narrow. A 404 alone is not enough — only a 404 that names a
 * model qualifies, so an unrelated missing endpoint stays non-retryable.
 * Auth-flavoured messages are excluded outright: PERMISSION_DENIED means the
 * key is not entitled to the model, which every member sharing that key would
 * hit identically.
 */
export function looksLikeModelNotFound(error: unknown): boolean {
  if (error instanceof InvalidModelError) {
    return true;
  }
  if (!(error instanceof Error)) {
    return false;
  }
  const msg = error.message;
  if (
    msg.includes("PERMISSION_DENIED") ||
    msg.includes("UNAUTHENTICATED") ||
    looksLikeModelAccessDenied(error)
  ) {
    return false;
  }
  const lower = msg.toLowerCase();
  const namesAModel = lower.includes("model");
  return (
    (lower.includes("model not found") ||
      lower.includes("not_found_error") ||
      msg.includes("NOT_FOUND") ||
      lower.includes("does not exist") ||
      lower.includes("unknown model")) &&
    namesAModel
  );
}

/**
 * Returns true when the error is definitively non-retryable: typed error
 * classes (auth, access-denied, invalid-model), non-retryable HTTP status
 * codes, or deterministic 400-class message patterns.
 *
 * NOTE: ContextBudgetExceededError is intentionally NOT non-retryable —
 * each provider has its own context window, so a budget rejection on one
 * provider does not preclude another provider accepting the same payload.
 *
 * NOTE: model-not-found IS non-retryable here, and intentionally so. This is
 * the general contract, used by provider fallback where the same model id
 * typically carries across providers — retrying a typo everywhere would turn
 * one crisp error into a slow fan-out of identical ones. ModelPool is the
 * exception and uses {@link isNonRetryableForPool} instead.
 */
export function isNonRetryableProviderError(error: unknown): boolean {
  if (error instanceof InvalidModelError) {
    return true;
  }
  if (error instanceof AuthenticationError) {
    return true;
  }
  if (error instanceof AuthorizationError) {
    return true;
  }
  if (error instanceof ModelAccessDeniedError) {
    return true;
  }

  if (error && typeof error === "object") {
    const err = error as Record<string, unknown>;
    const status =
      typeof err.status === "number"
        ? err.status
        : typeof err.statusCode === "number"
          ? err.statusCode
          : undefined;

    if (
      status !== undefined &&
      NON_RETRYABLE_HTTP_STATUS_CODES.includes(status)
    ) {
      return true;
    }
  }

  if (error instanceof Error) {
    const msg = error.message;
    if (
      msg.includes("NOT_FOUND") ||
      msg.includes("Model Not Found") ||
      msg.includes("model not found") ||
      msg.includes("PERMISSION_DENIED") ||
      msg.includes("UNAUTHENTICATED")
    ) {
      return true;
    }
    if (isDeterministicClientErrorMessage(msg)) {
      return true;
    }
  }

  return false;
}

/**
 * Non-retryability as ModelPool sees it.
 *
 * A pool member is an explicit {provider, model} pair, and members are chosen
 * precisely because they differ. "This provider has no such model" is therefore
 * a fact about ONE member, not about the request: member#2 runs a different
 * model and may well serve it. Short-circuiting the whole pool on it defeats
 * the point of configuring a pool — the observed case was a member naming a
 * retired model, where Anthropic answered 404 and the pool gave up instead of
 * failing over to the member that was fine.
 *
 * Everything else keeps the general contract. Auth failures, malformed
 * payloads, and access-denied still stop the pool immediately, because those
 * describe the credentials or the request and every member would hit them.
 */
export function isNonRetryableForPool(error: unknown): boolean {
  if (looksLikeModelNotFound(error)) {
    return false;
  }
  return isNonRetryableProviderError(error);
}
