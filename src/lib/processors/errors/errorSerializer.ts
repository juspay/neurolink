/**
 * Error Serializer Utility
 *
 * Safe error serialization with full context preservation.
 * Features:
 * - Handles circular references
 * - Filters sensitive data (PII, credentials)
 * - Generates error fingerprints for deduplication
 * - Preserves custom error properties
 * - Filters stack traces in production
 *
 * @module processors/errors
 */

import { createHash } from "crypto";

/**
 * Fields that should be redacted for security/privacy.
 */
const SENSITIVE_FIELDS = [
  "password",
  "token",
  "secret",
  "apiKey",
  "api_key",
  "authorization",
  "cookie",
  "session",
  "credentials",
  "privateKey",
  "private_key",
  "accessToken",
  "access_token",
  "refreshToken",
  "refresh_token",
  "apiSecret",
  "api_secret",
  "clientSecret",
  "client_secret",
  "bearer",
  "auth",
  "ssn",
  "socialSecurity",
  "creditCard",
  "credit_card",
  "cvv",
  "pin",
  "jwt",
  "x-api-key",
  "passphrase",
  "connectionString",
  "connection_string",
] as const;

/**
 * Maximum size limits for serialization.
 */
const MAX_METADATA_SIZE = 2000;
const MAX_STACK_FRAMES = 20;
const MAX_DEPTH = 5;

/**
 * Serialized error representation with full context.
 */
export type SerializedError = {
  /** Unique error instance ID */
  errorId: string;
  /** Deterministic fingerprint for error aggregation */
  errorFingerprint: string;
  /** Error type/class name */
  errorType: string;
  /** Error message */
  message: string;
  /** Full stack trace */
  stack?: string;
  /** Parsed stack frames */
  stackFrames?: string[];
  /** HTTP status code if applicable */
  statusCode?: number;
  /** Whether the error is operational (expected) vs programmer error */
  isOperational?: boolean;
  /** Whether the error is retryable */
  isRetryable?: boolean;
  /** Error code */
  code?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Serialized cause error (for error chaining) */
  cause?: SerializedError;
  /** ISO timestamp of when the error was serialized */
  timestamp: string;
};

/**
 * Options for error serialization.
 */
export type SerializeOptions = {
  /** Include stack trace in output (default: true) */
  includeStack?: boolean;
  /** Max depth for nested object serialization (default: 5) */
  maxDepth?: number;
  /** Filter stack traces to application frames only (default: true in production) */
  filterStacks?: boolean;
  /** Additional context to include */
  context?: Record<string, unknown>;
};

/**
 * Safely serialize an error with full context preservation.
 * Handles circular references, redacts sensitive data, and preserves error metadata.
 *
 * @param error - Error instance or unknown value to serialize
 * @param options - Serialization options
 * @returns Serialized error with full context
 *
 * @example
 * ```typescript
 * try {
 *   await riskyOperation();
 * } catch (error) {
 *   const serialized = serializeError(error);
 *   logger.error("Operation failed", serialized);
 * }
 * ```
 */
export function serializeError(
  error: unknown,
  options?: SerializeOptions,
): SerializedError {
  const {
    includeStack = true,
    maxDepth = MAX_DEPTH,
    filterStacks = process.env.NODE_ENV === "production",
  } = options || {};

  const timestamp = new Date().toISOString();

  // Handle non-Error objects
  if (!(error instanceof Error)) {
    return {
      errorId: generateErrorId(),
      errorFingerprint: generateFingerprintFromString(String(error)),
      errorType: "UnknownError",
      message: String(error),
      metadata: { originalValue: safeStringify(error, maxDepth) },
      timestamp,
    };
  }

  // Extract basic error info
  const serialized: SerializedError = {
    errorId: generateErrorId(),
    errorType: error.name,
    message: error.message,
    errorFingerprint: generateErrorFingerprint(error),
    timestamp,
  };

  // Add stack trace
  if (includeStack && error.stack) {
    const frames = error.stack.split("\n");

    if (filterStacks) {
      serialized.stackFrames = filterStackFrames(frames, MAX_STACK_FRAMES);
      serialized.stack = serialized.stackFrames.join("\n");
    } else {
      serialized.stack = error.stack;
      serialized.stackFrames = frames.slice(0, MAX_STACK_FRAMES);
    }
  }

  // Add custom properties from error objects
  if ("statusCode" in error) {
    serialized.statusCode = (error as { statusCode: number }).statusCode;
  }
  if ("isOperational" in error) {
    serialized.isOperational = (
      error as { isOperational: boolean }
    ).isOperational;
  }
  if ("isRetryable" in error) {
    serialized.isRetryable = (error as { isRetryable: boolean }).isRetryable;
  }
  if ("retryable" in error) {
    serialized.isRetryable = (error as { retryable: boolean }).retryable;
  }
  if ("retriable" in error) {
    serialized.isRetryable = (error as { retriable: boolean }).retriable;
  }
  if ("code" in error) {
    serialized.code = String((error as { code: unknown }).code);
  }

  // Extract additional metadata
  const metadata: Record<string, unknown> = {};
  const errorKeys = Object.keys(error);
  const excludedKeys = [
    "name",
    "message",
    "stack",
    "statusCode",
    "isOperational",
    "isRetryable",
    "retryable",
    "retriable",
    "code",
    "cause",
  ];

  for (const key of errorKeys) {
    if (!excludedKeys.includes(key)) {
      const value = (error as unknown as Record<string, unknown>)[key];
      metadata[key] = sanitizeAndTruncate(
        key,
        value,
        MAX_METADATA_SIZE,
        maxDepth,
      );
    }
  }

  // Add context if provided
  if (options?.context) {
    for (const [key, value] of Object.entries(options.context)) {
      metadata[`context.${key}`] = sanitizeAndTruncate(
        key,
        value,
        MAX_METADATA_SIZE,
        maxDepth,
      );
    }
  }

  if (Object.keys(metadata).length > 0) {
    serialized.metadata = metadata;
  }

  // Handle error chaining (cause) - use type assertion for ES2022 cause property
  const errorWithCause = error as Error & { cause?: unknown };
  if (errorWithCause.cause instanceof Error) {
    serialized.cause = serializeError(errorWithCause.cause, {
      ...options,
      maxDepth: Math.max(1, maxDepth - 1),
    });
  }

  return serialized;
}

/**
 * Generate a unique error instance ID.
 *
 * @returns Unique error ID in format "err_<timestamp>_<random>"
 */
function generateErrorId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 11);
  return `err_${timestamp}_${random}`;
}

/**
 * Generate a deterministic fingerprint for error aggregation.
 * Normalizes dynamic values (IDs, timestamps, paths) to group similar errors together.
 *
 * @param error - Error to fingerprint
 * @param context - Optional context with operation name
 * @returns 16-character hex fingerprint hash
 *
 * @example
 * ```typescript
 * const fp1 = generateErrorFingerprint(new Error("User 123 not found"));
 * const fp2 = generateErrorFingerprint(new Error("User 456 not found"));
 * // fp1 === fp2 (same error pattern, different IDs)
 * ```
 */
export function generateErrorFingerprint(
  error: Error,
  context?: { operation?: string },
): string {
  // Normalize message by replacing dynamic values
  const normalizedMessage = normalizeErrorMessage(error.message);

  // Get first relevant stack frame (most relevant location)
  const firstFrame = extractFirstRelevantFrame(error.stack);

  const components = [
    error.name,
    normalizedMessage,
    firstFrame,
    context?.operation || "",
  ];

  return createHash("sha256")
    .update(components.join("|"))
    .digest("hex")
    .substring(0, 16);
}

/**
 * Generate a fingerprint from a plain string (for non-Error values).
 *
 * @param value - String value to fingerprint
 * @returns 16-character hex fingerprint hash
 */
function generateFingerprintFromString(value: string): string {
  const normalized = normalizeErrorMessage(value);
  return createHash("sha256").update(normalized).digest("hex").substring(0, 16);
}

/**
 * Normalize an error message by replacing dynamic values with placeholders.
 * This allows grouping similar errors together regardless of specific IDs, paths, etc.
 *
 * @param message - Original error message
 * @returns Normalized message with placeholders
 */
function normalizeErrorMessage(message: string): string {
  return (
    message
      // Numbers (IDs, counts, etc.)
      .replace(/\d+/g, "N")
      // UUIDs (v4)
      .replace(
        /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi,
        "UUID",
      )
      // MongoDB ObjectIDs (24 hex chars)
      .replace(/[a-f0-9]{24}/gi, "OBJID")
      // File paths
      .replace(/\/[\w/.~-]+/g, "PATH")
      // Windows paths
      .replace(/[A-Z]:\\[\w\\.~-]+/gi, "PATH")
      // URLs
      .replace(/https?:\/\/[^\s]+/g, "URL")
      // Single-quoted strings
      .replace(/'[^']*'/g, "STR")
      // Double-quoted strings
      .replace(/"[^"]*"/g, "STR")
      // Timestamps (ISO format)
      .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g, "TIMESTAMP")
      // Email addresses
      .replace(/[\w.-]+@[\w.-]+\.\w+/g, "EMAIL")
      // IP addresses
      .replace(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g, "IP")
  );
}

/**
 * Extract the first relevant stack frame (application code, not node_modules).
 *
 * @param stack - Full stack trace
 * @returns First relevant frame or empty string
 */
function extractFirstRelevantFrame(stack?: string): string {
  if (!stack) {
    return "";
  }

  const frames = stack.split("\n");
  for (const frame of frames) {
    const trimmed = frame.trim();
    if (
      trimmed.startsWith("at ") &&
      !trimmed.includes("node_modules") &&
      !trimmed.includes("node:internal")
    ) {
      return trimmed;
    }
  }

  // Fall back to first "at" frame
  const firstAtFrame = frames.find((f) => f.trim().startsWith("at "));
  return firstAtFrame?.trim() || "";
}

/**
 * Filter stack frames to application code only.
 * Removes node_modules and internal Node.js frames.
 *
 * @param frames - Array of stack frame strings
 * @param maxFrames - Maximum number of frames to include
 * @returns Filtered stack frames
 */
function filterStackFrames(frames: string[], maxFrames: number): string[] {
  const filtered = frames.filter((frame) => {
    // Keep error message line (first line)
    if (!frame.trim().startsWith("at ")) {
      return true;
    }

    // Filter out node internals and dependencies
    return (
      !frame.includes("node_modules") &&
      !frame.includes("node:internal") &&
      !frame.includes("node:async_hooks") &&
      !frame.includes("node:events")
    );
  });

  return filtered.slice(0, maxFrames);
}

/**
 * Safely stringify an object with circular reference handling.
 *
 * @param obj - Object to stringify
 * @param maxDepth - Maximum depth for nested objects
 * @returns JSON string representation
 */
export function safeStringify(
  obj: unknown,
  maxDepth: number = MAX_DEPTH,
): string {
  const seen = new WeakSet<object>();

  const replacer = (
    key: string,
    value: unknown,
    depth: number = 0,
  ): unknown => {
    // Depth limit
    if (depth > maxDepth) {
      return "[max depth reached]";
    }

    // Check for sensitive fields
    if (key && isSensitiveField(key)) {
      return "[REDACTED]";
    }

    // Handle null/undefined
    if (value === null) {
      return null;
    }
    if (value === undefined) {
      return "[undefined]";
    }

    // Handle circular references
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) {
        return "[Circular]";
      }
      seen.add(value);
    }

    // Handle special types
    if (typeof value === "bigint") {
      return value.toString() + "n";
    }
    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message,
        stack: value.stack?.split("\n").slice(0, 5).join("\n"),
      };
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (value instanceof RegExp) {
      return value.toString();
    }
    if (typeof value === "function") {
      return `[Function: ${value.name || "anonymous"}]`;
    }
    if (typeof value === "symbol") {
      return value.toString();
    }
    if (ArrayBuffer.isView(value) || value instanceof ArrayBuffer) {
      const length = value.byteLength;
      return `[Buffer: ${length} bytes]`;
    }
    if (typeof Buffer !== "undefined" && Buffer.isBuffer(value)) {
      return `[Buffer: ${value.length} bytes]`;
    }
    if (value instanceof Map) {
      return {
        __type: "Map",
        entries: Array.from(value.entries()).slice(0, 100),
      };
    }
    if (value instanceof Set) {
      return { __type: "Set", values: Array.from(value).slice(0, 100) };
    }

    return value;
  };

  try {
    // Custom JSON.stringify with depth tracking
    const stringifyWithDepth = (val: unknown, currentDepth: number): string => {
      if (currentDepth > maxDepth) {
        return '"[max depth reached]"';
      }

      if (val === null) {
        return "null";
      }
      if (val === undefined) {
        return '"[undefined]"';
      }

      const processed = replacer("", val, currentDepth);

      if (processed === null) {
        return "null";
      }
      if (typeof processed === "string") {
        return JSON.stringify(processed);
      }
      if (typeof processed === "number" || typeof processed === "boolean") {
        return String(processed);
      }

      if (Array.isArray(processed)) {
        const items = processed.map((item) =>
          stringifyWithDepth(item, currentDepth + 1),
        );
        return `[${items.join(",")}]`;
      }

      if (typeof processed === "object") {
        const entries = Object.entries(processed).map(([k, v]) => {
          const stringifiedValue = stringifyWithDepth(v, currentDepth + 1);
          return `${JSON.stringify(k)}:${stringifiedValue}`;
        });
        return `{${entries.join(",")}}`;
      }

      return JSON.stringify(processed);
    };

    return stringifyWithDepth(obj, 0);
  } catch {
    return String(obj);
  }
}

/**
 * Check if a field name is sensitive and should be redacted.
 *
 * @param fieldName - Field name to check
 * @returns true if the field is sensitive
 */
function isSensitiveField(fieldName: string): boolean {
  const lowerName = fieldName.toLowerCase();
  return SENSITIVE_FIELDS.some((field) =>
    lowerName.includes(field.toLowerCase()),
  );
}

/**
 * Sanitize and truncate metadata values.
 * Redacts sensitive fields and limits size.
 *
 * @param key - Field key
 * @param value - Field value
 * @param maxSize - Maximum size in characters
 * @param maxDepth - Maximum depth for nested objects
 * @returns Sanitized and truncated value
 */
function sanitizeAndTruncate(
  key: string,
  value: unknown,
  maxSize: number,
  maxDepth: number,
): unknown {
  // Check for sensitive fields
  if (isSensitiveField(key)) {
    return "[REDACTED]";
  }

  // Serialize value
  const serialized =
    typeof value === "string" ? value : safeStringify(value, maxDepth);

  // Truncate if too large
  if (serialized.length > maxSize) {
    return `${serialized.substring(0, maxSize)}... [truncated, total: ${serialized.length} chars]`;
  }

  // Return original value if it's a primitive, for cleaner logs
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  // For objects, try to return parsed version for cleaner logs
  try {
    return JSON.parse(serialized);
  } catch {
    return serialized;
  }
}

/**
 * Extract safe metadata from an object.
 * Sanitizes sensitive fields and handles truncation.
 *
 * @param obj - Object to extract metadata from
 * @param options - Extraction options
 * @returns Sanitized metadata record
 *
 * @example
 * ```typescript
 * const metadata = extractSafeMetadata({
 *   userId: "123",
 *   password: "secret",
 *   data: largeObject,
 * });
 * // Result: { userId: "123", password: "[REDACTED]", data: truncated }
 * ```
 */
export function extractSafeMetadata(
  obj: unknown,
  options?: {
    /** Maximum size per field */
    maxSize?: number;
    /** Maximum depth for nested objects */
    maxDepth?: number;
  },
): Record<string, unknown> {
  const { maxSize = MAX_METADATA_SIZE, maxDepth = MAX_DEPTH } = options || {};
  const metadata: Record<string, unknown> = {};

  if (!obj || typeof obj !== "object") {
    return { value: String(obj) };
  }

  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    metadata[key] = sanitizeAndTruncate(key, value, maxSize, maxDepth);
  }

  return metadata;
}

/**
 * Create a minimal error representation for logging.
 * Useful when you need just the essentials without full serialization.
 *
 * @param error - Error to summarize
 * @returns Minimal error representation
 */
export function summarizeError(error: unknown): {
  type: string;
  message: string;
  code?: string;
  fingerprint: string;
} {
  if (error instanceof Error) {
    return {
      type: error.name,
      message: error.message.substring(0, 200),
      code:
        "code" in error ? String((error as { code: unknown }).code) : undefined,
      fingerprint: generateErrorFingerprint(error),
    };
  }

  const message = String(error).substring(0, 200);
  return {
    type: "UnknownError",
    message,
    fingerprint: generateFingerprintFromString(message),
  };
}
