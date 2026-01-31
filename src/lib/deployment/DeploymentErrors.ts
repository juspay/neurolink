/**
 * Deployment System Error Definitions
 *
 * Typed error hierarchy for deployment operations following
 * NeuroLink's error handling patterns.
 *
 * @packageDocumentation
 * @module @neurolink/deployment
 */

import {
  createErrorFactory,
  NeuroLinkFeatureError,
} from "../core/infrastructure/index.js";

/**
 * Deployment error codes
 */
export const DeploymentErrorCodes = {
  // Configuration errors
  INVALID_CONFIG: "DEPLOYMENT_INVALID_CONFIG",
  MISSING_CONFIG: "DEPLOYMENT_MISSING_CONFIG",
  INVALID_PLATFORM: "DEPLOYMENT_INVALID_PLATFORM",
  MISSING_CREDENTIALS: "DEPLOYMENT_MISSING_CREDENTIALS",

  // Build errors
  BUILD_FAILED: "DEPLOYMENT_BUILD_FAILED",
  BUNDLER_ERROR: "DEPLOYMENT_BUNDLER_ERROR",
  ENTRY_NOT_FOUND: "DEPLOYMENT_ENTRY_NOT_FOUND",
  DEPENDENCY_ERROR: "DEPLOYMENT_DEPENDENCY_ERROR",
  OUTPUT_ERROR: "DEPLOYMENT_OUTPUT_ERROR",

  // Deployment errors
  DEPLOY_FAILED: "DEPLOYMENT_DEPLOY_FAILED",
  UPLOAD_FAILED: "DEPLOYMENT_UPLOAD_FAILED",
  TIMEOUT: "DEPLOYMENT_TIMEOUT",
  RATE_LIMITED: "DEPLOYMENT_RATE_LIMITED",
  QUOTA_EXCEEDED: "DEPLOYMENT_QUOTA_EXCEEDED",
  UNAUTHORIZED: "DEPLOYMENT_UNAUTHORIZED",
  FORBIDDEN: "DEPLOYMENT_FORBIDDEN",

  // Platform-specific errors
  VERCEL_ERROR: "DEPLOYMENT_VERCEL_ERROR",
  CLOUDFLARE_ERROR: "DEPLOYMENT_CLOUDFLARE_ERROR",
  NETLIFY_ERROR: "DEPLOYMENT_NETLIFY_ERROR",
  LAMBDA_ERROR: "DEPLOYMENT_LAMBDA_ERROR",
  DOCKER_ERROR: "DEPLOYMENT_DOCKER_ERROR",
  FLYIO_ERROR: "DEPLOYMENT_FLYIO_ERROR",

  // Validation errors
  VALIDATION_FAILED: "DEPLOYMENT_VALIDATION_FAILED",
  SCHEMA_ERROR: "DEPLOYMENT_SCHEMA_ERROR",

  // Environment errors
  ENV_VAR_MISSING: "DEPLOYMENT_ENV_VAR_MISSING",
  ENV_VAR_INVALID: "DEPLOYMENT_ENV_VAR_INVALID",

  // Rollback errors
  ROLLBACK_FAILED: "DEPLOYMENT_ROLLBACK_FAILED",
  NO_PREVIOUS_DEPLOYMENT: "DEPLOYMENT_NO_PREVIOUS_DEPLOYMENT",

  // Network errors
  NETWORK_ERROR: "DEPLOYMENT_NETWORK_ERROR",
  CONNECTION_REFUSED: "DEPLOYMENT_CONNECTION_REFUSED",

  // Unknown errors
  UNKNOWN: "DEPLOYMENT_UNKNOWN",
} as const;

export type DeploymentErrorCode =
  (typeof DeploymentErrorCodes)[keyof typeof DeploymentErrorCodes];

/**
 * Deployment error factory
 */
export const DeploymentErrors = createErrorFactory(
  "Deployment",
  DeploymentErrorCodes,
);

/**
 * Base deployment error class
 */
export class DeploymentError extends NeuroLinkFeatureError {
  constructor(
    message: string,
    code: DeploymentErrorCode,
    options?: {
      retryable?: boolean;
      details?: Record<string, unknown>;
      cause?: Error;
    },
  ) {
    super(message, code, "Deployment", options);
  }

  /**
   * Check if this error is retryable
   */
  isRetryable(): boolean {
    const retryableCodes: DeploymentErrorCode[] = [
      DeploymentErrorCodes.TIMEOUT,
      DeploymentErrorCodes.RATE_LIMITED,
      DeploymentErrorCodes.NETWORK_ERROR,
      DeploymentErrorCodes.CONNECTION_REFUSED,
    ];
    return retryableCodes.includes(this.code as DeploymentErrorCode);
  }
}

/**
 * Build-specific error
 */
export class BuildError extends DeploymentError {
  constructor(
    message: string,
    options?: {
      phase?: string;
      file?: string;
      line?: number;
      column?: number;
      details?: Record<string, unknown>;
      cause?: Error;
    },
  ) {
    super(message, DeploymentErrorCodes.BUILD_FAILED, {
      retryable: false,
      details: {
        phase: options?.phase,
        file: options?.file,
        line: options?.line,
        column: options?.column,
        ...options?.details,
      },
      cause: options?.cause,
    });
  }
}

/**
 * Bundler-specific error
 */
export class BundlerError extends DeploymentError {
  constructor(
    message: string,
    bundlerType: string,
    options?: {
      details?: Record<string, unknown>;
      cause?: Error;
    },
  ) {
    super(message, DeploymentErrorCodes.BUNDLER_ERROR, {
      retryable: false,
      details: {
        bundlerType,
        ...options?.details,
      },
      cause: options?.cause,
    });
  }
}

/**
 * Platform-specific deployment error
 */
export class PlatformDeploymentError extends DeploymentError {
  readonly platform: string;

  constructor(
    platform: string,
    message: string,
    options?: {
      statusCode?: number;
      apiError?: string;
      details?: Record<string, unknown>;
      cause?: Error;
    },
  ) {
    const codeMap: Record<string, DeploymentErrorCode> = {
      vercel: DeploymentErrorCodes.VERCEL_ERROR,
      cloudflare: DeploymentErrorCodes.CLOUDFLARE_ERROR,
      netlify: DeploymentErrorCodes.NETLIFY_ERROR,
      lambda: DeploymentErrorCodes.LAMBDA_ERROR,
      docker: DeploymentErrorCodes.DOCKER_ERROR,
      flyio: DeploymentErrorCodes.FLYIO_ERROR,
    };

    super(message, codeMap[platform] || DeploymentErrorCodes.DEPLOY_FAILED, {
      retryable:
        options?.statusCode === 429 ||
        options?.statusCode === 503 ||
        options?.statusCode === 504,
      details: {
        platform,
        statusCode: options?.statusCode,
        apiError: options?.apiError,
        ...options?.details,
      },
      cause: options?.cause,
    });

    this.platform = platform;
  }
}

/**
 * Configuration error
 */
export class ConfigurationError extends DeploymentError {
  constructor(
    message: string,
    field?: string,
    options?: {
      suggestion?: string;
      details?: Record<string, unknown>;
      cause?: Error;
    },
  ) {
    super(message, DeploymentErrorCodes.INVALID_CONFIG, {
      retryable: false,
      details: {
        field,
        suggestion: options?.suggestion,
        ...options?.details,
      },
      cause: options?.cause,
    });
  }
}

/**
 * Validation error
 */
export class ValidationError extends DeploymentError {
  readonly validationErrors: Array<{
    field: string;
    message: string;
    code?: string;
  }>;

  constructor(
    message: string,
    validationErrors: Array<{ field: string; message: string; code?: string }>,
    options?: {
      details?: Record<string, unknown>;
      cause?: Error;
    },
  ) {
    super(message, DeploymentErrorCodes.VALIDATION_FAILED, {
      retryable: false,
      details: {
        validationErrors,
        ...options?.details,
      },
      cause: options?.cause,
    });

    this.validationErrors = validationErrors;
  }
}

/**
 * Environment variable error
 */
export class EnvironmentError extends DeploymentError {
  constructor(
    message: string,
    variableName: string,
    options?: {
      required?: boolean;
      details?: Record<string, unknown>;
      cause?: Error;
    },
  ) {
    super(
      message,
      options?.required
        ? DeploymentErrorCodes.ENV_VAR_MISSING
        : DeploymentErrorCodes.ENV_VAR_INVALID,
      {
        retryable: false,
        details: {
          variableName,
          ...options?.details,
        },
        cause: options?.cause,
      },
    );
  }
}

/**
 * Network error for deployment operations
 */
export class DeploymentNetworkError extends DeploymentError {
  constructor(
    message: string,
    options?: {
      url?: string;
      statusCode?: number;
      details?: Record<string, unknown>;
      cause?: Error;
    },
  ) {
    super(message, DeploymentErrorCodes.NETWORK_ERROR, {
      retryable: true,
      details: {
        url: options?.url,
        statusCode: options?.statusCode,
        ...options?.details,
      },
      cause: options?.cause,
    });
  }
}

/**
 * Timeout error
 */
export class DeploymentTimeoutError extends DeploymentError {
  constructor(
    message: string,
    timeoutMs: number,
    options?: {
      operation?: string;
      details?: Record<string, unknown>;
      cause?: Error;
    },
  ) {
    super(message, DeploymentErrorCodes.TIMEOUT, {
      retryable: true,
      details: {
        timeoutMs,
        operation: options?.operation,
        ...options?.details,
      },
      cause: options?.cause,
    });
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends DeploymentError {
  readonly retryAfter?: number;

  constructor(
    message: string,
    options?: {
      retryAfter?: number;
      details?: Record<string, unknown>;
      cause?: Error;
    },
  ) {
    super(message, DeploymentErrorCodes.RATE_LIMITED, {
      retryable: true,
      details: {
        retryAfter: options?.retryAfter,
        ...options?.details,
      },
      cause: options?.cause,
    });

    this.retryAfter = options?.retryAfter;
  }
}

/**
 * Authorization error
 */
export class AuthorizationError extends DeploymentError {
  constructor(
    message: string,
    options?: {
      platform?: string;
      requiredScopes?: string[];
      details?: Record<string, unknown>;
      cause?: Error;
    },
  ) {
    super(message, DeploymentErrorCodes.UNAUTHORIZED, {
      retryable: false,
      details: {
        platform: options?.platform,
        requiredScopes: options?.requiredScopes,
        ...options?.details,
      },
      cause: options?.cause,
    });
  }
}

/**
 * Check if an error is a deployment error
 */
export function isDeploymentError(error: unknown): error is DeploymentError {
  return error instanceof DeploymentError;
}

/**
 * Check if an error is retryable
 */
export function isRetryableDeploymentError(error: unknown): boolean {
  if (isDeploymentError(error)) {
    return error.isRetryable();
  }
  return false;
}

/**
 * Create appropriate deployment error from platform API response
 */
export function createPlatformError(
  platform: string,
  response: {
    status?: number;
    statusText?: string;
    data?: unknown;
    message?: string;
  },
): PlatformDeploymentError {
  const statusCode = response.status || 500;
  const message =
    response.message ||
    response.statusText ||
    `${platform} API error: ${statusCode}`;

  return new PlatformDeploymentError(platform, message, {
    statusCode,
    apiError: typeof response.data === "string" ? response.data : undefined,
    details: {
      response: response.data,
    },
  });
}
