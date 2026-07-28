import type { RedactionConfig, DataStreamEvent } from "../../types/index.js";

/**
 * Default fields to redact from stream chunks
 */
const DEFAULT_REDACTED_FIELDS = [
  "request",
  "args",
  "result",
  "apiKey",
  "token",
  "authorization",
  "credentials",
  "password",
  "secret",
] as const;

/**
 * Default redaction placeholder
 */
const DEFAULT_PLACEHOLDER = "[REDACTED]";

/**
 * Maximum recursion depth for redactObject
 */
const MAX_REDACTION_DEPTH = 10;

/**
 * Redact sensitive data from a stream chunk.
 *
 * IMPORTANT: Redaction is DISABLED by default. You must set `config.enabled = true`
 * to enable redaction. This is a security feature that requires explicit opt-in.
 *
 * @param chunk - The stream chunk to redact
 * @param config - Redaction configuration (enabled: false by default)
 * @returns The redacted chunk with sensitive data removed, or original if disabled
 *
 * @example
 * ```typescript
 * // Redaction disabled by default - returns chunk unchanged
 * const unchanged = redactStreamChunk(chunk);
 *
 * // Enable redaction explicitly
 * const redacted = redactStreamChunk(chunk, { enabled: true });
 * // Sensitive fields replaced with "[REDACTED]"
 * ```
 *
 * @example
 * ```typescript
 * // With custom configuration (must enable first)
 * const redacted = redactStreamChunk(chunk, {
 *   enabled: true,
 *   additionalFields: ["customSecret"],
 *   preserveFields: ["result"], // Don't redact result
 * });
 * ```
 */
export function redactStreamChunk(
  chunk: DataStreamEvent,
  config?: RedactionConfig,
): DataStreamEvent {
  // CRITICAL: Redaction is DISABLED by default
  // Must explicitly enable with config.enabled = true
  if (!config?.enabled) {
    return chunk;
  }

  if (!chunk || typeof chunk !== "object") {
    return chunk;
  }

  const placeholder = config?.placeholder ?? DEFAULT_PLACEHOLDER;

  const redactedFields = new Set([
    ...DEFAULT_REDACTED_FIELDS,
    ...(config?.additionalFields ?? []),
  ]);

  // Remove preserved fields from redaction set
  if (config?.preserveFields) {
    for (const field of config.preserveFields) {
      redactedFields.delete(field);
    }
  }

  return redactChunkByType(chunk, redactedFields, placeholder, config);
}

/**
 * Redact chunk based on its type
 */
function redactChunkByType(
  chunk: DataStreamEvent,
  redactedFields: Set<string>,
  placeholder: string,
  config?: RedactionConfig,
): DataStreamEvent {
  const typedChunk: Record<string, unknown> = chunk;
  const chunkType = typedChunk.type as string;

  switch (chunkType) {
    case "step-start":
      return redactStepStart(chunk, redactedFields, placeholder);

    case "tool-call":
      return redactToolCall(chunk, redactedFields, placeholder, config);

    case "tool-result":
      return redactToolResult(chunk, redactedFields, placeholder, config);

    case "error":
      return redactError(chunk, redactedFields, placeholder);

    default:
      return redactGenericChunk(
        typedChunk,
        redactedFields,
        placeholder,
      ) as DataStreamEvent;
  }
}

/**
 * Redact step-start chunks
 */
function redactStepStart(
  chunk: DataStreamEvent,
  redactedFields: Set<string>,
  placeholder: string,
): DataStreamEvent {
  if (!hasPayload(chunk)) {
    return chunk;
  }

  const { payload, ...rest } = chunk;
  const redactedPayload = redactObject(payload, redactedFields, placeholder, 0);

  const redacted = {
    ...rest,
    payload: redactedPayload,
  };
  return redacted;
}

/**
 * Redact tool-call chunks
 */
function redactToolCall(
  chunk: DataStreamEvent,
  redactedFields: Set<string>,
  placeholder: string,
  config?: RedactionConfig,
): DataStreamEvent {
  // Handle chunks with payload structure
  if (hasPayload(chunk)) {
    const { payload, ...rest } = chunk;

    // Redact tool arguments if configured
    if (payload.toolCall && typeof payload.toolCall === "object") {
      const toolCall = payload.toolCall as Record<string, unknown>;
      const redactArgs =
        config?.redactToolArgs !== false && redactedFields.has("args");

      const redacted = {
        ...rest,
        payload: {
          ...payload,
          toolCall: {
            ...toolCall,
            args: redactArgs ? placeholder : toolCall.args,
          },
        },
      };
      return redacted;
    }

    const redacted = {
      ...rest,
      payload: redactObject(payload, redactedFields, placeholder, 0),
    };
    return redacted;
  }

  // Handle chunks with data structure (DataStreamEvent format)
  if (hasData(chunk)) {
    const { data, ...rest } = chunk;
    const redactArgs =
      config?.redactToolArgs !== false && redactedFields.has("args");

    // Check for arguments field in data
    if ("arguments" in data && redactArgs) {
      return {
        ...rest,
        data: {
          ...data,
          arguments: placeholder,
        },
      };
    }

    return {
      ...rest,
      data: redactObject(data, redactedFields, placeholder, 0),
    };
  }

  return chunk;
}

/**
 * Redact tool-result chunks
 */
function redactToolResult(
  chunk: DataStreamEvent,
  redactedFields: Set<string>,
  placeholder: string,
  config?: RedactionConfig,
): DataStreamEvent {
  const redactResult =
    config?.redactToolResults !== false && redactedFields.has("result");

  // Handle chunks with payload structure
  if (hasPayload(chunk)) {
    const { payload, ...rest } = chunk;

    const redacted = {
      ...rest,
      payload: {
        ...payload,
        result: redactResult ? placeholder : payload.result,
      },
    };
    return redacted;
  }

  // Handle chunks with data structure (DataStreamEvent format)
  if (hasData(chunk)) {
    const { data, ...rest } = chunk;

    return {
      ...rest,
      data: {
        ...data,
        result: redactResult ? placeholder : data.result,
      },
    };
  }

  return chunk;
}

/**
 * Redact error chunks (remove stack traces in production)
 */
function redactError(
  chunk: DataStreamEvent,
  redactedFields: Set<string>,
  placeholder: string,
): DataStreamEvent {
  const isProduction = process.env.NODE_ENV === "production";

  // Handle chunks with data structure (DataStreamEvent format)
  if (hasData(chunk)) {
    const { data, ...rest } = chunk;
    const { stack, ...dataRest } = data;

    return {
      ...rest,
      data: {
        ...redactObject(dataRest, redactedFields, placeholder, 0),
        ...(isProduction ? {} : { stack }),
      },
    };
  }

  // Handle direct chunk with stack
  const chunkRecord: Record<string, unknown> = chunk;
  const { stack, ...restChunk } = chunkRecord;
  const redactedRest = redactObject(restChunk, redactedFields, placeholder, 0);

  return {
    ...redactedRest,
    type: "error",
    ...(isProduction ? {} : { stack }),
  } as DataStreamEvent;
}

/**
 * Redact generic chunks by scanning all fields
 */
function redactGenericChunk(
  chunk: Record<string, unknown>,
  redactedFields: Set<string>,
  placeholder: string,
): Record<string, unknown> {
  return redactObject(chunk, redactedFields, placeholder, 0);
}

/**
 * Recursively redact sensitive fields from an object.
 *
 * @param obj - Object to redact
 * @param redactedFields - Set of field names to redact (case-insensitive matching)
 * @param placeholder - Replacement value for redacted fields
 * @param depth - Current recursion depth
 * @returns Object with sensitive fields redacted
 */
function redactObject(
  obj: Record<string, unknown>,
  redactedFields: Set<string>,
  placeholder: string,
  depth: number,
): Record<string, unknown> {
  // Prevent infinite recursion
  if (depth > MAX_REDACTION_DEPTH) {
    return obj;
  }

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    // Case-insensitive field name matching
    const shouldRedact = redactedFields.has(key.toLowerCase());

    if (shouldRedact) {
      result[key] = placeholder;
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      result[key] = redactObject(
        value as Record<string, unknown>,
        redactedFields,
        placeholder,
        depth + 1,
      );
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) => {
        if (item && typeof item === "object") {
          return redactObject(
            item as Record<string, unknown>,
            redactedFields,
            placeholder,
            depth + 1,
          );
        }
        return item;
      });
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Type guard for chunks with payload
 */
function hasPayload(
  chunk: DataStreamEvent,
): chunk is DataStreamEvent & { payload: Record<string, unknown> } {
  const record: Record<string, unknown> = chunk;
  return (
    "payload" in record &&
    record.payload !== null &&
    typeof record.payload === "object"
  );
}

/**
 * Type guard for chunks with data (DataStreamEvent format)
 */
function hasData(
  chunk: DataStreamEvent,
): chunk is DataStreamEvent & { data: Record<string, unknown> } {
  return (
    "data" in chunk && chunk.data !== null && typeof chunk.data === "object"
  );
}

/**
 * Create a redaction transform function for streams.
 *
 * IMPORTANT: Redaction is DISABLED by default. You must set `config.enabled = true`
 * to enable redaction. If not enabled, the returned function passes chunks through unchanged.
 *
 * @param config - Redaction configuration
 * @returns A transform function for stream chunks
 *
 * @example
 * ```typescript
 * // Redaction disabled - chunks pass through unchanged
 * const redactor = createStreamRedactor();
 * const unchanged = redactor(chunk); // Returns original chunk
 *
 * // Enable redaction
 * const redactor = createStreamRedactor({ enabled: true });
 * const redactedStream = stream.pipeThrough(new TransformStream({
 *   transform: (chunk, controller) => {
 *     controller.enqueue(redactor(chunk));
 *   }
 * }));
 * ```
 *
 * @example
 * ```typescript
 * // With custom options
 * const redactor = createStreamRedactor({
 *   enabled: true,
 *   redactToolArgs: true,
 *   redactToolResults: true,
 *   additionalFields: ["internalId"],
 * });
 * ```
 */
export function createStreamRedactor(
  config?: RedactionConfig,
): <T>(chunk: T) => T {
  return <T>(chunk: T): T => {
    // When redaction is disabled (default), return chunk unchanged
    // This allows the redactor to be used with any chunk type as a no-op
    if (!config?.enabled) {
      return chunk;
    }
    // When enabled, apply redaction (works with any object-based chunk)
    return redactStreamChunk(chunk as DataStreamEvent, config) as T;
  };
}
