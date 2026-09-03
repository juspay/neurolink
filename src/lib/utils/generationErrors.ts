/**
 * Error classes surfaced by the generation pipeline.
 *
 * These used to be re-exported from the `ai` package. They are now declared
 * here, because every path that threw them upstream is gone: generation is
 * native end to end, and the only one this repo still constructs is
 * NoOutputGeneratedError.
 *
 * The marker symbols are deliberately identical to the upstream ones
 * (`Symbol.for("vercel.ai.error.<name>")`). `isInstance` is a marker check, not
 * an `instanceof`, precisely so it survives across duplicate module copies —
 * and keeping the same symbol means an error raised by any remaining upstream
 * code is still recognised by these classes, and vice versa. Switching to a
 * private symbol would have silently broken that recognition at exactly the
 * points that matter: retry classification and the no-output sentinel.
 */

const markerSymbolFor = (name: string): symbol =>
  Symbol.for(`vercel.ai.error.${name}`);

const hasMarker = (error: unknown, name: string): boolean => {
  const marker = markerSymbolFor(name);
  return (
    error !== null &&
    typeof error === "object" &&
    marker in error &&
    (error as Record<symbol, unknown>)[marker] === true
  );
};

/** Base for the generation errors; stamps the upstream-compatible marker. */
class GenerationError extends Error {
  readonly cause?: unknown;

  constructor(markerName: string, message: string, cause?: unknown) {
    super(message);
    this.name = markerName;
    if (cause !== undefined) {
      this.cause = cause;
    }
    Object.defineProperty(this, markerSymbolFor(markerName), {
      value: true,
      enumerable: false,
      writable: false,
    });
  }
}

export class NoOutputGeneratedError extends GenerationError {
  constructor(options: { message?: string; cause?: unknown } = {}) {
    super(
      "AI_NoOutputGeneratedError",
      options.message ?? "No output generated.",
      options.cause,
    );
  }
  static isInstance(error: unknown): error is NoOutputGeneratedError {
    return hasMarker(error, "AI_NoOutputGeneratedError");
  }
}

export class NoObjectGeneratedError extends GenerationError {
  readonly text?: string;
  readonly finishReason?: string;

  constructor(
    options: {
      message?: string;
      cause?: unknown;
      text?: string;
      finishReason?: string;
    } = {},
  ) {
    super(
      "AI_NoObjectGeneratedError",
      options.message ?? "No object generated.",
      options.cause,
    );
    this.text = options.text;
    this.finishReason = options.finishReason;
  }
  static isInstance(error: unknown): error is NoObjectGeneratedError {
    return hasMarker(error, "AI_NoObjectGeneratedError");
  }
}

export class NoSuchToolError extends GenerationError {
  readonly toolName?: string;

  constructor(options: { message?: string; toolName?: string } = {}) {
    super(
      "AI_NoSuchToolError",
      options.message ??
        `Model tried to call unavailable tool '${options.toolName ?? "unknown"}'.`,
    );
    this.toolName = options.toolName;
  }
  static isInstance(error: unknown): error is NoSuchToolError {
    return hasMarker(error, "AI_NoSuchToolError");
  }
}

export class InvalidToolInputError extends GenerationError {
  readonly toolName?: string;

  constructor(
    options: { message?: string; toolName?: string; cause?: unknown } = {},
  ) {
    super(
      "AI_InvalidToolInputError",
      options.message ??
        `Invalid input for tool '${options.toolName ?? "unknown"}'.`,
      options.cause,
    );
    this.toolName = options.toolName;
  }
  static isInstance(error: unknown): error is InvalidToolInputError {
    return hasMarker(error, "AI_InvalidToolInputError");
  }
}

/**
 * Transport-level failure. This repo only ever CATCHES and classifies these —
 * `providerRetry` and the error classifier duck-type `.statusCode` — so the
 * class exists to keep those `isInstance` checks working for errors raised by
 * the provider clients, which stamp the same marker.
 */
export class APICallError extends GenerationError {
  readonly url?: string;
  readonly statusCode?: number;
  readonly responseBody?: string;
  readonly responseHeaders?: Record<string, string>;
  readonly isRetryable: boolean;
  readonly requestBodyValues?: unknown;

  constructor(
    options: {
      message?: string;
      url?: string;
      statusCode?: number;
      responseBody?: string;
      responseHeaders?: Record<string, string>;
      isRetryable?: boolean;
      requestBodyValues?: unknown;
      cause?: unknown;
    } = {},
  ) {
    super(
      "AI_APICallError",
      options.message ?? "API call error.",
      options.cause,
    );
    this.url = options.url;
    this.statusCode = options.statusCode;
    this.responseBody = options.responseBody;
    this.responseHeaders = options.responseHeaders;
    // Upstream derives this from the status code when the caller does not say,
    // and `providerRetry` reads it as a plain boolean — leaving it undefined
    // would make every classified APICallError non-retryable by accident.
    this.isRetryable =
      options.isRetryable ??
      (options.statusCode !== null &&
        options.statusCode !== undefined &&
        (options.statusCode === 408 ||
          options.statusCode === 409 ||
          options.statusCode === 429 ||
          options.statusCode >= 500));
    this.requestBodyValues = options.requestBodyValues;
  }
  static isInstance(error: unknown): error is APICallError {
    return hasMarker(error, "AI_APICallError");
  }
}
