/**
 * What a failed request may tell the client.
 *
 * An exception's text names environment variables, provider wiring, file
 * paths and upstream response bodies; none of that belongs in a response to
 * an unknown caller. A route therefore answers with one of a few fixed
 * messages plus the request id, and the detail goes to the server log under
 * that id, where the operator can find it. The pattern is the one the OpenAI
 * proxy route already followed.
 *
 * What is passed through: a `ServerAdapterError` below 500, whose message
 * this server composed (a validation failure, a missing route), and the
 * category of a provider that is missing credentials, without saying which
 * credential.
 *
 * @module server/utils/clientError
 */

import type { ServerClientFacingError } from "../../types/index.js";
import {
  AuthenticationError as ProviderAuthenticationError,
  RateLimitError as ProviderRateLimitError,
} from "../../types/index.js";
import { logger } from "../../utils/logger.js";
import { ServerAdapterError } from "../errors.js";

export const GENERIC_ERROR_MESSAGE = "An internal error occurred";
export const PROVIDER_NOT_CONFIGURED_MESSAGE =
  "The requested provider is not configured on this server";
export const UPSTREAM_RATE_LIMITED_MESSAGE =
  "The upstream provider is rate limiting this server; retry later";
export const REQUEST_TIMEOUT_MESSAGE = "The request timed out";

/** Signs that a provider refused the server's own credentials, or has none. */
const PROVIDER_CONFIGURATION_PATTERN =
  /api[ _-]?key|credential|not configured|no (?:ai )?provider|authenticat|unauthori[sz]ed|forbidden|permission denied|invalid[ _-]?(?:key|token)|missing (?:required )?(?:environment|env|key|token)|environment variable/i;

/** Names the SDK's own error classes and codes use for the same thing. */
const PROVIDER_CONFIGURATION_CODES = new Set([
  "AUTHENTICATION_ERROR",
  "AUTHENTICATION_FAILED",
  "AUTH_ERROR",
  "INVALID_API_KEY",
  "MISSING_API_KEY",
  "PROVIDER_NOT_CONFIGURED",
  "CONFIGURATION_ERROR",
  "NO_PROVIDER",
  "STT_PROVIDER_NOT_CONFIGURED",
]);

function codeOf(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

function isAbortError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "AbortError" || error.name === "TimeoutError")
  );
}

/**
 * The response for `error`. Never the exception's own text unless this
 * server wrote it (a `ServerAdapterError` below 500).
 */
export function clientFacingError(error: unknown): ServerClientFacingError {
  if (error instanceof ServerAdapterError) {
    // The request timeout is the server's deadline, not the client's slowness
    // (the TIMEOUT code maps to 408 for the latter), so it answers 504.
    if (error.name === "ServerTimeoutError") {
      return {
        code: "REQUEST_TIMEOUT",
        message: REQUEST_TIMEOUT_MESSAGE,
        status: 504,
      };
    }
    const status = error.getHttpStatus();
    if (status < 500) {
      return { code: error.code, message: error.message, status };
    }
    return { code: "INTERNAL_ERROR", message: GENERIC_ERROR_MESSAGE, status };
  }
  if (isAbortError(error)) {
    return {
      code: "REQUEST_TIMEOUT",
      message: REQUEST_TIMEOUT_MESSAGE,
      status: 504,
    };
  }
  if (error instanceof ProviderRateLimitError) {
    return {
      code: "UPSTREAM_RATE_LIMITED",
      message: UPSTREAM_RATE_LIMITED_MESSAGE,
      status: 503,
    };
  }
  const code = codeOf(error);
  const message = error instanceof Error ? error.message : String(error);
  if (
    error instanceof ProviderAuthenticationError ||
    (code !== undefined && PROVIDER_CONFIGURATION_CODES.has(code)) ||
    PROVIDER_CONFIGURATION_PATTERN.test(message)
  ) {
    return {
      code: "PROVIDER_NOT_CONFIGURED",
      message: PROVIDER_NOT_CONFIGURED_MESSAGE,
      status: 503,
    };
  }
  return {
    code: "INTERNAL_ERROR",
    message: GENERIC_ERROR_MESSAGE,
    status: 500,
  };
}

/**
 * Log the detail the client does not get, under the request id the client
 * does get. A client error is routine traffic and logs as one line; anything
 * else keeps its stack.
 */
export function logClientFacingError(
  source: string,
  requestId: string | undefined,
  error: unknown,
  shaped: ServerClientFacingError,
): void {
  const detail = error instanceof Error ? error.message : String(error);
  if (shaped.status < 500) {
    logger.warn(`[${source}] Request rejected`, {
      requestId,
      code: shaped.code,
      error: detail,
    });
    return;
  }
  logger.error(`[${source}] Request failed`, {
    requestId,
    code: shaped.code,
    error: detail,
    stack: error instanceof Error ? error.stack : undefined,
  });
}

/** {@link clientFacingError} and {@link logClientFacingError} in one step. */
export function shapeRouteError(
  source: string,
  requestId: string | undefined,
  error: unknown,
): ServerClientFacingError {
  const shaped = clientFacingError(error);
  logClientFacingError(source, requestId, error, shaped);
  return shaped;
}
