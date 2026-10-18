import {
  CONTENT_KEYS,
  FULLY_MASKED,
  METADATA_PREFIXES,
} from "../constants/langfuse.js";
import type {
  JsonValue,
  LangfuseAttributePolicy,
  SpanAttributeValue,
  SpanAttributes,
} from "../types/index.js";

function parseContent(value: SpanAttributeValue): JsonValue {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  try {
    return JSON.parse(text);
  } catch {
    return text ?? null;
  }
}

function maskValue(
  value: SpanAttributeValue,
  mask: LangfuseAttributePolicy["mask"],
): string {
  try {
    const masked = mask?.({ data: parseContent(value) });
    return typeof masked === "string" ? masked : JSON.stringify(masked);
  } catch {
    return FULLY_MASKED;
  }
}

/**
 * @description Applies the Langfuse exporter's policy to a span's attributes as they are sent to Langfuse: fills environment and release when the span has none, removes input and output when `redactIO` is set, and masks input, output and metadata when a mask is configured. Nothing else is touched: other attributes, events and the status message go to Langfuse as they are, and no other exporter sees the policy.
 * @param attributes {SpanAttributes} - Attributes of the span being exported.
 * @param policy {LangfuseAttributePolicy} - Environment, release, redaction and mask settings.
 * @returns {SpanAttributes} A new attribute record; the input is not modified.
 */
export function protectAttributes(
  attributes: SpanAttributes,
  policy: LangfuseAttributePolicy,
): SpanAttributes {
  const result: SpanAttributes = {
    ...(policy.environment && { "langfuse.environment": policy.environment }),
    ...(policy.release && { "langfuse.release": policy.release }),
    ...attributes,
  };
  for (const key of Object.keys(result)) {
    if (CONTENT_KEYS.has(key)) {
      if (policy.redactIO) {
        delete result[key];
      } else if (policy.mask) {
        result[key] = maskValue(result[key], policy.mask);
      }
    } else if (
      policy.mask &&
      METADATA_PREFIXES.some((prefix) => key.startsWith(prefix))
    ) {
      result[key] = maskValue(result[key], policy.mask);
    }
  }
  return result;
}
