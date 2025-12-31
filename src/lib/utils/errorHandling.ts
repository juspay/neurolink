/**
 * Robust Error Handling Utilities for NeuroLink
 * Provides structured error management for tool execution and system operations
 */

import { ErrorCategory, ErrorSeverity } from "../constants/enums.js";
import type { StructuredError } from "../types/utilities.js";
import { logger } from "./logger.js";

// Error codes for different scenarios
export const ERROR_CODES = {
  // Tool errors
  TOOL_NOT_FOUND: "TOOL_NOT_FOUND",
  TOOL_EXECUTION_FAILED: "TOOL_EXECUTION_FAILED",
  TOOL_TIMEOUT: "TOOL_TIMEOUT",
  TOOL_VALIDATION_FAILED: "TOOL_VALIDATION_FAILED",

  // Parameter errors
  INVALID_PARAMETERS: "INVALID_PARAMETERS",
  MISSING_REQUIRED_PARAM: "MISSING_REQUIRED_PARAM",

  // System errors
  MEMORY_EXHAUSTED: "MEMORY_EXHAUSTED",
  NETWORK_ERROR: "NETWORK_ERROR",
  PERMISSION_DENIED: "PERMISSION_DENIED",

  // Provider errors
  PROVIDER_NOT_AVAILABLE: "PROVIDER_NOT_AVAILABLE",
  PROVIDER_AUTH_FAILED: "PROVIDER_AUTH_FAILED",
  PROVIDER_QUOTA_EXCEEDED: "PROVIDER_QUOTA_EXCEEDED",

  // Configuration errors
  INVALID_CONFIGURATION: "INVALID_CONFIGURATION",
  MISSING_CONFIGURATION: "MISSING_CONFIGURATION",

  // Video validation errors
  INVALID_VIDEO_RESOLUTION: "INVALID_VIDEO_RESOLUTION",
  INVALID_VIDEO_LENGTH: "INVALID_VIDEO_LENGTH",
  INVALID_VIDEO_ASPECT_RATIO: "INVALID_VIDEO_ASPECT_RATIO",
  INVALID_VIDEO_AUDIO: "INVALID_VIDEO_AUDIO",
  INVALID_VIDEO_MODE: "INVALID_VIDEO_MODE",
  MISSING_VIDEO_IMAGE: "MISSING_VIDEO_IMAGE",
  EMPTY_VIDEO_PROMPT: "EMPTY_VIDEO_PROMPT",
  VIDEO_PROMPT_TOO_LONG: "VIDEO_PROMPT_TOO_LONG",

  // Image validation errors
  EMPTY_IMAGE_PATH: "EMPTY_IMAGE_PATH",
  INVALID_IMAGE_TYPE: "INVALID_IMAGE_TYPE",
  IMAGE_TOO_LARGE: "IMAGE_TOO_LARGE",
  IMAGE_TOO_SMALL: "IMAGE_TOO_SMALL",
  INVALID_IMAGE_FORMAT: "INVALID_IMAGE_FORMAT",
} as const;

/**
 * Enhanced error class with structured information
 */
export class NeuroLinkError extends Error {
  public readonly code: string;
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly retriable: boolean;
  public readonly context: Record<string, unknown>;
  public readonly timestamp: Date;
  public readonly toolName?: string;
  public readonly serverId?: string;

  constructor(options: {
    code: string;
    message: string;
    category: ErrorCategory;
    severity: ErrorSeverity;
    retriable: boolean;
    context?: Record<string, unknown>;
    originalError?: Error;
    toolName?: string;
    serverId?: string;
  }) {
    super(options.message);
    this.name = "NeuroLinkError";
    this.code = options.code;
    this.category = options.category;
    this.severity = options.severity;
    this.retriable = options.retriable;
    this.context = options.context || {};
    this.timestamp = new Date();
    this.toolName = options.toolName;
    this.serverId = options.serverId;

    // Preserve original error stack if provided
    if (options.originalError) {
      this.stack = options.originalError.stack;
      this.context.originalMessage = options.originalError.message;
    }
  }

  /**
   * Convert to JSON for logging and serialization
   */
  toJSON(): StructuredError {
    return {
      code: this.code,
      message: this.message,
      category: this.category,
      severity: this.severity,
      retriable: this.retriable,
      context: this.context,
      timestamp: this.timestamp,
      toolName: this.toolName,
      serverId: this.serverId,
    };
  }
}

/**
 * Error factory for common error scenarios
 */
export class ErrorFactory {
  /**
   * Create a tool not found error
   */
  static toolNotFound(
    toolName: string,
    availableTools?: string[],
  ): NeuroLinkError {
    return new NeuroLinkError({
      code: ERROR_CODES.TOOL_NOT_FOUND,
      message: `Tool '${toolName}' not found`,
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.MEDIUM,
      retriable: false,
      context: { toolName, availableTools },
      toolName,
    });
  }

  /**
   * Create a tool execution failed error
   */
  static toolExecutionFailed(
    toolName: string,
    originalError: Error,
    serverId?: string,
  ): NeuroLinkError {
    return new NeuroLinkError({
      code: ERROR_CODES.TOOL_EXECUTION_FAILED,
      message: `Tool '${toolName}' execution failed: ${originalError.message}`,
      category: ErrorCategory.EXECUTION,
      severity: ErrorSeverity.HIGH,
      retriable: true,
      originalError,
      toolName,
      serverId,
    });
  }

  /**
   * Create a tool timeout error
   */
  static toolTimeout(
    toolName: string,
    timeoutMs: number,
    serverId?: string,
  ): NeuroLinkError {
    return new NeuroLinkError({
      code: ERROR_CODES.TOOL_TIMEOUT,
      message: `Tool '${toolName}' timed out after ${timeoutMs}ms`,
      category: ErrorCategory.TIMEOUT,
      severity: ErrorSeverity.HIGH,
      retriable: true,
      context: { timeoutMs },
      toolName,
      serverId,
    });
  }

  /**
   * Create a parameter validation error
   */
  static invalidParameters(
    toolName: string,
    validationError: Error,
    providedParams?: unknown,
  ): NeuroLinkError {
    return new NeuroLinkError({
      code: ERROR_CODES.INVALID_PARAMETERS,
      message: `Invalid parameters for tool '${toolName}': ${validationError.message}`,
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.MEDIUM,
      retriable: false,
      context: { providedParams },
      originalError: validationError,
      toolName,
    });
  }

  /**
   * Create a network error
   */
  static networkError(
    toolName: string,
    originalError: Error,
    serverId?: string,
  ): NeuroLinkError {
    return new NeuroLinkError({
      code: ERROR_CODES.NETWORK_ERROR,
      message: `Network error in tool '${toolName}': ${originalError.message}`,
      category: ErrorCategory.NETWORK,
      severity: ErrorSeverity.HIGH,
      retriable: true,
      originalError,
      toolName,
      serverId,
    });
  }

  /**
   * Create a memory exhaustion error
   */
  static memoryExhausted(
    toolName: string,
    memoryUsageMB: number,
  ): NeuroLinkError {
    return new NeuroLinkError({
      code: ERROR_CODES.MEMORY_EXHAUSTED,
      message: `Memory exhausted during tool '${toolName}' execution (${memoryUsageMB}MB used)`,
      category: ErrorCategory.RESOURCE,
      severity: ErrorSeverity.CRITICAL,
      retriable: false,
      context: { memoryUsageMB },
      toolName,
    });
  }

  // ============================================================================
  // VIDEO VALIDATION ERRORS
  // ============================================================================

  /**
   * Create an invalid video resolution error
   */
  static invalidVideoResolution(resolution: string): NeuroLinkError {
    return new NeuroLinkError({
      code: ERROR_CODES.INVALID_VIDEO_RESOLUTION,
      message: `Invalid resolution '${resolution}'. Use '720p' or '1080p'`,
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.MEDIUM,
      retriable: false,
      context: {
        field: "output.video.resolution",
        providedValue: resolution,
        suggestions: ["Use '720p' for standard HD", "Use '1080p' for full HD"],
      },
    });
  }

  /**
   * Create an invalid video length error
   */
  static invalidVideoLength(length: number): NeuroLinkError {
    return new NeuroLinkError({
      code: ERROR_CODES.INVALID_VIDEO_LENGTH,
      message: `Invalid length '${length}'. Use 4, 6, or 8 seconds`,
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.MEDIUM,
      retriable: false,
      context: {
        field: "output.video.length",
        providedValue: length,
        suggestions: [
          "Use 4 for short clips",
          "Use 6 for balanced duration (recommended)",
          "Use 8 for longer videos",
        ],
      },
    });
  }

  /**
   * Create an invalid video aspect ratio error
   */
  static invalidVideoAspectRatio(aspectRatio: string): NeuroLinkError {
    return new NeuroLinkError({
      code: ERROR_CODES.INVALID_VIDEO_ASPECT_RATIO,
      message: `Invalid aspect ratio '${aspectRatio}'. Use '9:16' or '16:9'`,
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.MEDIUM,
      retriable: false,
      context: {
        field: "output.video.aspectRatio",
        providedValue: aspectRatio,
        suggestions: [
          "Use '9:16' for portrait/vertical video",
          "Use '16:9' for landscape",
        ],
      },
    });
  }

  /**
   * Create an invalid video audio option error
   */
  static invalidVideoAudio(audio: unknown): NeuroLinkError {
    return new NeuroLinkError({
      code: ERROR_CODES.INVALID_VIDEO_AUDIO,
      message: `Invalid audio option '${audio}'. Must be true or false`,
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.MEDIUM,
      retriable: false,
      context: {
        field: "output.video.audio",
        providedValue: audio,
        suggestions: [
          "Set audio: true to enable audio generation",
          "Set audio: false to disable",
        ],
      },
    });
  }

  /**
   * Create an invalid video mode error
   */
  static invalidVideoMode(): NeuroLinkError {
    return new NeuroLinkError({
      code: ERROR_CODES.INVALID_VIDEO_MODE,
      message: "Video generation requires output.mode to be 'video'",
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.MEDIUM,
      retriable: false,
      context: {
        field: "output.mode",
        suggestions: ["Set output: { mode: 'video' } for video generation"],
      },
    });
  }

  /**
   * Create a missing video image error
   */
  static missingVideoImage(): NeuroLinkError {
    return new NeuroLinkError({
      code: ERROR_CODES.MISSING_VIDEO_IMAGE,
      message: "Video generation requires an input image",
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.MEDIUM,
      retriable: false,
      context: {
        field: "input.images",
        suggestions: [
          "Provide an image via input.images array",
          "Example: input: { text: 'prompt', images: [imageBuffer] }",
        ],
      },
    });
  }

  /**
   * Create an empty video prompt error
   */
  static emptyVideoPrompt(): NeuroLinkError {
    return new NeuroLinkError({
      code: ERROR_CODES.EMPTY_VIDEO_PROMPT,
      message: "Video prompt cannot be empty",
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.MEDIUM,
      retriable: false,
      context: {
        field: "input.text",
        suggestions: [
          "Provide a text prompt describing the desired video motion/content",
          "Example: 'Smooth camera pan with dramatic lighting'",
        ],
      },
    });
  }

  /**
   * Create a video prompt too long error
   */
  static videoPromptTooLong(length: number, maxLength: number): NeuroLinkError {
    return new NeuroLinkError({
      code: ERROR_CODES.VIDEO_PROMPT_TOO_LONG,
      message: `Video prompt must be ${maxLength} characters or less (got ${length})`,
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.MEDIUM,
      retriable: false,
      context: {
        field: "input.text",
        providedLength: length,
        maxLength,
        suggestions: [
          `Shorten your prompt to ${maxLength} characters or less`,
          "Focus on key visual elements and camera motion",
        ],
      },
    });
  }

  // ============================================================================
  // IMAGE VALIDATION ERRORS
  // ============================================================================

  /**
   * Create an empty image path error
   */
  static emptyImagePath(): NeuroLinkError {
    return new NeuroLinkError({
      code: ERROR_CODES.EMPTY_IMAGE_PATH,
      message: "Image path or URL cannot be empty",
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.MEDIUM,
      retriable: false,
      context: {
        field: "input.images",
        suggestions: ["Provide a valid file path or URL"],
      },
    });
  }

  /**
   * Create an invalid image type error
   */
  static invalidImageType(): NeuroLinkError {
    return new NeuroLinkError({
      code: ERROR_CODES.INVALID_IMAGE_TYPE,
      message: "Image must be a Buffer, file path string, or URL",
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.MEDIUM,
      retriable: false,
      context: {
        field: "input.images",
        suggestions: [
          "Provide image as Buffer: fs.readFileSync('image.jpg')",
          "Or as file path string: './image.jpg'",
          "Or as URL: 'https://example.com/image.jpg'",
        ],
      },
    });
  }

  /**
   * Create an image too large error
   */
  static imageTooLarge(sizeMB: string, maxMB: string): NeuroLinkError {
    return new NeuroLinkError({
      code: ERROR_CODES.IMAGE_TOO_LARGE,
      message: `Image size (${sizeMB}MB) exceeds maximum (${maxMB}MB)`,
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.MEDIUM,
      retriable: false,
      context: {
        field: "input.images",
        sizeMB,
        maxMB,
        suggestions: [
          `Compress or resize the image to under ${maxMB}MB`,
          "Use a lower quality JPEG compression",
          "Reduce image dimensions",
        ],
      },
    });
  }

  /**
   * Create an image too small error
   */
  static imageTooSmall(): NeuroLinkError {
    return new NeuroLinkError({
      code: ERROR_CODES.IMAGE_TOO_SMALL,
      message: "Image data is too small to be a valid image file",
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.MEDIUM,
      retriable: false,
      context: {
        field: "input.images",
        suggestions: ["Provide a valid JPEG, PNG, or WebP image file"],
      },
    });
  }

  /**
   * Create an invalid image format error
   */
  static invalidImageFormat(): NeuroLinkError {
    return new NeuroLinkError({
      code: ERROR_CODES.INVALID_IMAGE_FORMAT,
      message: "Unsupported image format. Use JPEG, PNG, or WebP",
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.MEDIUM,
      retriable: false,
      context: {
        field: "input.images",
        suggestions: [
          "Convert your image to JPEG, PNG, or WebP format",
          "Ensure the file is not corrupted",
          "Check that the file extension matches the actual format",
        ],
      },
    });
  }
}

/**
 * Timeout wrapper for async operations
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutError?: Error,
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(
        timeoutError || new Error(`Operation timed out after ${timeoutMs}ms`),
      );
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
}

/**
 * Retry mechanism for retriable operations
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxAttempts: number;
    delayMs: number;
    isRetriable?: (error: Error) => boolean;
    onRetry?: (attempt: number, error: Error) => void;
  },
): Promise<T> {
  const { maxAttempts, delayMs, isRetriable = () => true, onRetry } = options;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on the last attempt or if error is not retriable
      if (attempt === maxAttempts || !isRetriable(lastError)) {
        throw lastError;
      }

      if (onRetry) {
        onRetry(attempt, lastError);
      }

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  if (lastError) {
    throw lastError;
  }
  throw new Error("Retry operation failed with no error information");
}

/**
 * Circuit breaker for preventing cascading failures
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: "closed" | "open" | "half-open" = "closed";

  constructor(
    private readonly failureThreshold: number = 5,
    private readonly resetTimeoutMs: number = 60000,
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - this.lastFailureTime > this.resetTimeoutMs) {
        this.state = "half-open";
      } else {
        throw new Error("Circuit breaker is open - operation not executed");
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = "closed";
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.state = "open";
    }
  }

  getState(): "closed" | "open" | "half-open" {
    return this.state;
  }

  getFailureCount(): number {
    return this.failures;
  }
}

/**
 * Error handler that decides whether to retry based on error type
 */
export function isRetriableError(error: Error): boolean {
  if (error instanceof NeuroLinkError) {
    return error.retriable;
  }

  // Check for common retriable error patterns
  const retriablePatterns = [
    /timeout/i,
    /network/i,
    /connection/i,
    /temporary/i,
    /rate limit/i,
    /quota/i,
    /503/i, // Service unavailable
    /502/i, // Bad gateway
    /504/i, // Gateway timeout
  ];

  return retriablePatterns.some((pattern) => pattern.test(error.message));
}

/**
 * Enhanced error logger that provides structured logging
 */
export function logStructuredError(
  error: NeuroLinkError,
  context?: Record<string, unknown>,
): void {
  const logData = {
    ...error.toJSON(),
    ...context,
  };

  switch (error.severity) {
    case ErrorSeverity.CRITICAL:
      logger.error(`[CRITICAL] ${error.message}`, logData);
      break;
    case ErrorSeverity.HIGH:
      logger.error(`[HIGH] ${error.message}`, logData);
      break;
    case ErrorSeverity.MEDIUM:
      logger.warn(`[MEDIUM] ${error.message}`, logData);
      break;
    case ErrorSeverity.LOW:
      logger.info(`[LOW] ${error.message}`, logData);
      break;
  }
}
