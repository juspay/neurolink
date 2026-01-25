/**
 * Gateway Provider System Errors
 *
 * Custom error classes for gateway-specific error scenarios.
 */

/**
 * Base error class for all gateway errors
 */
export class GatewayError extends Error {
  /** Error code for programmatic handling */
  public readonly code: string;
  /** Model string that caused the error */
  public readonly modelString?: string;
  /** Provider that caused the error */
  public readonly provider?: string;
  /** Whether this error is retriable */
  public readonly retriable: boolean;
  /** Additional context */
  public readonly context?: Record<string, unknown>;
  /** Original error if wrapping another error */
  public readonly originalError?: Error;

  constructor(
    message: string,
    options: {
      code?: string;
      modelString?: string;
      provider?: string;
      retriable?: boolean;
      context?: Record<string, unknown>;
      originalError?: Error;
    } = {},
  ) {
    super(message);
    this.name = "GatewayError";
    this.code = options.code || "GATEWAY_ERROR";
    this.modelString = options.modelString;
    this.provider = options.provider;
    this.retriable = options.retriable ?? false;
    this.context = options.context;
    this.originalError = options.originalError;

    // Preserve stack trace
    if (options.originalError?.stack) {
      this.stack = `${this.stack}\nCaused by: ${options.originalError.stack}`;
    }
  }

  /**
   * Convert error to JSON for logging
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      modelString: this.modelString,
      provider: this.provider,
      retriable: this.retriable,
      context: this.context,
    };
  }
}

/**
 * Error fetching model registry from external sources
 */
export class RegistryFetchError extends GatewayError {
  constructor(
    message: string,
    options: {
      source?: string;
      url?: string;
      statusCode?: number;
      originalError?: Error;
    } = {},
  ) {
    super(message, {
      code: "REGISTRY_FETCH_ERROR",
      retriable: true,
      context: {
        source: options.source,
        url: options.url,
        statusCode: options.statusCode,
      },
      originalError: options.originalError,
    });
    this.name = "RegistryFetchError";
  }
}

/**
 * Error when requested model is not found
 */
export class ModelNotFoundError extends GatewayError {
  constructor(
    modelString: string,
    options: {
      availableModels?: string[];
      suggestions?: string[];
    } = {},
  ) {
    const message = `Model not found: "${modelString}"${
      options.suggestions?.length
        ? `. Did you mean: ${options.suggestions.slice(0, 3).join(", ")}?`
        : ""
    }`;

    super(message, {
      code: "MODEL_NOT_FOUND",
      modelString,
      retriable: false,
      context: {
        availableModels: options.availableModels?.length,
        suggestions: options.suggestions,
      },
    });
    this.name = "ModelNotFoundError";
  }
}

/**
 * Error when routing to provider fails
 */
export class RoutingError extends GatewayError {
  constructor(
    message: string,
    options: {
      modelString?: string;
      provider?: string;
      strategy?: string;
      originalError?: Error;
    } = {},
  ) {
    super(message, {
      code: "ROUTING_ERROR",
      modelString: options.modelString,
      provider: options.provider,
      retriable: true,
      context: { strategy: options.strategy },
      originalError: options.originalError,
    });
    this.name = "RoutingError";
  }
}

/**
 * Error when all fallback models have been exhausted
 */
export class FallbackExhaustedError extends GatewayError {
  /** All models that were attempted */
  public readonly attemptedModels: string[];
  /** Errors from each attempt */
  public readonly errors: Error[];

  constructor(
    attemptedModels: string[],
    errors: Error[],
    options: {
      primaryModel?: string;
    } = {},
  ) {
    const message =
      `All fallback models exhausted. Attempted: ${attemptedModels.join(", ")}. ` +
      `Last error: ${errors[errors.length - 1]?.message || "Unknown error"}`;

    super(message, {
      code: "FALLBACK_EXHAUSTED",
      modelString: options.primaryModel,
      retriable: false,
      context: {
        attemptedCount: attemptedModels.length,
        errorCount: errors.length,
      },
    });

    this.name = "FallbackExhaustedError";
    this.attemptedModels = attemptedModels;
    this.errors = errors;
  }
}

/**
 * Error in gateway configuration
 */
export class ConfigurationError extends GatewayError {
  constructor(
    message: string,
    options: {
      field?: string;
      value?: unknown;
      expectedType?: string;
    } = {},
  ) {
    super(message, {
      code: "CONFIGURATION_ERROR",
      retriable: false,
      context: {
        field: options.field,
        value: options.value,
        expectedType: options.expectedType,
      },
    });
    this.name = "ConfigurationError";
  }
}

/**
 * Error when gateway feature is disabled
 */
export class GatewayDisabledError extends GatewayError {
  constructor() {
    super(
      "Gateway provider is currently disabled. " +
        "Set NEUROLINK_GATEWAY_ENABLED=true or use individual providers.",
      {
        code: "GATEWAY_DISABLED",
        retriable: false,
      },
    );
    this.name = "GatewayDisabledError";
  }
}

/**
 * Error when required API key is missing
 */
export class MissingApiKeyError extends GatewayError {
  constructor(
    provider: string,
    envVar: string,
    options: {
      modelString?: string;
    } = {},
  ) {
    const message =
      `API key required for ${provider} routing. ` +
      `Set ${envVar} environment variable.`;

    super(message, {
      code: "MISSING_API_KEY",
      provider,
      modelString: options.modelString,
      retriable: false,
      context: { envVar },
    });
    this.name = "MissingApiKeyError";
  }
}

/**
 * Error codes for programmatic handling
 */
export const GATEWAY_ERROR_CODES = {
  GATEWAY_ERROR: "GATEWAY_ERROR",
  REGISTRY_FETCH_ERROR: "REGISTRY_FETCH_ERROR",
  MODEL_NOT_FOUND: "MODEL_NOT_FOUND",
  ROUTING_ERROR: "ROUTING_ERROR",
  FALLBACK_EXHAUSTED: "FALLBACK_EXHAUSTED",
  CONFIGURATION_ERROR: "CONFIGURATION_ERROR",
  GATEWAY_DISABLED: "GATEWAY_DISABLED",
  MISSING_API_KEY: "MISSING_API_KEY",
} as const;

export type GatewayErrorCode =
  (typeof GATEWAY_ERROR_CODES)[keyof typeof GATEWAY_ERROR_CODES];
