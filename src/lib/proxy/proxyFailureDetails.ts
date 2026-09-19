import { sanitizeForLog } from "../utils/logSanitize.js";

/** Shared provider terminal codes across native and SDK transports. */
export function classifyProxyFailureCode(code: string | undefined) {
  if (
    [
      "cyber_policy",
      "content_policy_violation",
      "content_filter",
      "safety_violation",
    ].includes(code ?? "")
  ) {
    return { status: 403, retryable: false };
  }
  if (
    [
      "max_output_tokens",
      "context_length_exceeded",
      "invalid_request_error",
      "empty_response",
    ].includes(code ?? "")
  ) {
    return { status: undefined, retryable: false };
  }
  return {
    status: code === "rate_limit_exceeded" ? 429 : undefined,
    retryable: undefined,
  };
}

/** Read explicit SDK/API failure evidence without guessing from free-form text.
 * Bounded traversal covers common error/cause/data and JSON response envelopes. */
export function getProxyUpstreamFailure(error: unknown) {
  let status: number | undefined;
  let code: string | undefined;
  let retryable: boolean | undefined;
  let message: string | undefined;
  const queue = [error];
  const seen = new Set<object>();
  for (let index = 0; index < queue.length && index < 16; index++) {
    const item = queue[index];
    if (
      !item ||
      typeof item !== "object" ||
      Array.isArray(item) ||
      seen.has(item)
    ) {
      continue;
    }
    seen.add(item);
    const value = item as Record<string, unknown>;
    const candidateStatus = value.status ?? value.statusCode;
    if (
      typeof candidateStatus === "number" &&
      Number.isInteger(candidateStatus) &&
      candidateStatus >= 400 &&
      candidateStatus <= 599
    ) {
      status ??= candidateStatus;
    }
    if (code === undefined && typeof value.code === "string" && value.code) {
      code = sanitizeForLog(value.code, 200);
      if (typeof value.message === "string") {
        message = sanitizeForLog(value.message, 500);
      }
    }
    const candidateRetry = value.retryable ?? value.isRetryable;
    if (candidateRetry === false) {
      retryable = false;
    } else if (candidateRetry === true) {
      retryable ??= true;
    }
    if (typeof value.message === "string" && message === undefined) {
      message = sanitizeForLog(value.message, 500);
    }
    for (const key of ["error", "cause", "data", "response"]) {
      if (value[key] !== undefined && queue.length < 16) {
        queue.push(value[key]);
      }
    }
    if (
      typeof value.responseBody === "string" &&
      value.responseBody.length <= 65536 &&
      queue.length < 16
    ) {
      try {
        queue.push(JSON.parse(value.responseBody));
      } catch {
        /* Plain text is not structured evidence. */
      }
    }
  }
  if (error instanceof Error && error.name === "TimeoutError") {
    status ??= 504;
  }
  if (status === undefined && code === undefined && retryable === undefined) {
    return undefined;
  }
  const known = classifyProxyFailureCode(code);
  return {
    status: status ?? known.status ?? 502,
    code,
    retryable: known.retryable ?? retryable,
    message,
  };
}
