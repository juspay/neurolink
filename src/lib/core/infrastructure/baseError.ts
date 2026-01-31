export type ErrorCode = string;

export class NeuroLinkFeatureError extends Error {
  readonly code: ErrorCode;
  readonly feature: string;
  readonly retryable: boolean;
  readonly details?: Record<string, unknown>;
  readonly cause?: Error;

  constructor(
    message: string,
    code: ErrorCode,
    feature: string,
    options?: {
      retryable?: boolean;
      details?: Record<string, unknown>;
      cause?: Error;
    },
  ) {
    super(message);
    this.name = `${feature}Error`;
    this.code = code;
    this.feature = feature;
    this.retryable = options?.retryable ?? false;
    this.details = options?.details;
    this.cause = options?.cause;
  }
}

export function createErrorFactory<TCodes extends Record<string, string>>(
  feature: string,
  codes: TCodes,
) {
  return {
    codes,
    create: (
      code: keyof TCodes,
      message: string,
      options?: {
        retryable?: boolean;
        details?: Record<string, unknown>;
        cause?: Error;
      },
    ) => new NeuroLinkFeatureError(message, codes[code], feature, options),
  };
}
