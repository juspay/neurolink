/**
 * Response Validator
 *
 * Standalone utility for validating and optionally mutating LLM response text.
 * Handles length checks (including truncation), phrase checks, JSON schema
 * validation, and custom validators.  Returns a structured result telling the
 * caller whether to continue, abort, or retry — the caller owns the retry loop.
 *
 * No async I/O, no telemetry spans, no processor classes.
 */

import { logger } from "./logger.js";
import type {
  ResponseValidationConfig,
  ValidationIssue,
  ResponseValidationResult,
} from "../types/index.js";

// =============================================================================
// JSON SCHEMA VALIDATION (internal)
// =============================================================================

/**
 * Check that `data` matches the given JSON Schema node.
 * Supports: type, properties, required, items, minimum, maximum,
 * minLength, maxLength, pattern, enum.
 *
 * Bug C5 fix: `typeof null === "object"` — null is never a valid object.
 */
function matchesJsonSchemaNode(
  data: unknown,
  schema: Record<string, unknown>,
  path: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const expectedType = schema["type"] as string | undefined;

  if (expectedType !== undefined) {
    const valid = (() => {
      switch (expectedType) {
        case "string":
          return typeof data === "string";
        case "number":
          return typeof data === "number";
        case "integer":
          return typeof data === "number" && Number.isInteger(data);
        case "boolean":
          return typeof data === "boolean";
        case "null":
          return data === null;
        case "array":
          return Array.isArray(data);
        case "object":
          // Bug C5 fix: null must be explicitly excluded
          return (
            data !== null && typeof data === "object" && !Array.isArray(data)
          );
        default:
          return true;
      }
    })();

    if (!valid) {
      issues.push({
        category: "json_schema",
        severity: "error",
        message: `Expected type "${expectedType}" at "${path}", got ${data === null ? "null" : Array.isArray(data) ? "array" : typeof data}`,
        field: path,
      });
      // Cannot validate sub-constraints if the type is wrong
      return issues;
    }
  }

  // --- string constraints ---
  if (typeof data === "string") {
    const minLen = schema["minLength"] as number | undefined;
    const maxLen = schema["maxLength"] as number | undefined;
    const pattern = schema["pattern"] as string | undefined;

    if (minLen !== undefined && data.length < minLen) {
      issues.push({
        category: "json_schema",
        severity: "error",
        message: `"${path}" length ${data.length} is below minLength ${minLen}`,
        field: path,
      });
    }
    if (maxLen !== undefined && data.length > maxLen) {
      issues.push({
        category: "json_schema",
        severity: "error",
        message: `"${path}" length ${data.length} exceeds maxLength ${maxLen}`,
        field: path,
      });
    }
    if (pattern !== undefined) {
      // JSON schema "pattern" validation is skipped at runtime to avoid
      // dynamic RegExp construction from schema data (CodeQL js/regex-injection).
      // Patterns are validated at schema authoring time, not at response time.
      issues.push({
        category: "json_schema",
        severity: "info",
        message: `"${path}" has a pattern constraint "${pattern}" (not enforced at runtime)`,
        field: path,
      });
    }
  }

  // --- number constraints ---
  if (typeof data === "number") {
    const minimum = schema["minimum"] as number | undefined;
    const maximum = schema["maximum"] as number | undefined;

    if (minimum !== undefined && data < minimum) {
      issues.push({
        category: "json_schema",
        severity: "error",
        message: `"${path}" value ${data} is below minimum ${minimum}`,
        field: path,
      });
    }
    if (maximum !== undefined && data > maximum) {
      issues.push({
        category: "json_schema",
        severity: "error",
        message: `"${path}" value ${data} exceeds maximum ${maximum}`,
        field: path,
      });
    }
  }

  // --- enum ---
  const enumValues = schema["enum"] as unknown[] | undefined;
  if (enumValues !== undefined && !enumValues.includes(data)) {
    issues.push({
      category: "json_schema",
      severity: "error",
      message: `"${path}" must be one of [${enumValues.map(String).join(", ")}], got ${String(data)}`,
      field: path,
    });
  }

  // --- object: properties + required ---
  if (data !== null && typeof data === "object" && !Array.isArray(data)) {
    const obj = data as Record<string, unknown>;
    const properties = schema["properties"] as
      | Record<string, Record<string, unknown>>
      | undefined;
    const required = schema["required"] as string[] | undefined;

    if (required) {
      for (const key of required) {
        if (!(key in obj)) {
          issues.push({
            category: "json_schema",
            severity: "error",
            message: `Required property "${key}" is missing at "${path}"`,
            field: `${path}.${key}`,
          });
        }
      }
    }

    if (properties) {
      for (const [key, propSchema] of Object.entries(properties)) {
        if (key in obj) {
          issues.push(
            ...matchesJsonSchemaNode(
              obj[key],
              propSchema,
              path ? `${path}.${key}` : key,
            ),
          );
        }
      }
    }
  }

  // --- array: items ---
  if (Array.isArray(data)) {
    const itemSchema = schema["items"] as Record<string, unknown> | undefined;
    if (itemSchema) {
      data.forEach((item, idx) => {
        issues.push(
          ...matchesJsonSchemaNode(item, itemSchema, `${path}[${idx}]`),
        );
      });
    }
  }

  return issues;
}

function validateJsonSchema(
  text: string,
  schema: Record<string, unknown>,
): ValidationIssue[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return [
      {
        category: "json_schema",
        severity: "error",
        message: "Response is not valid JSON",
        field: "$",
      },
    ];
  }
  return matchesJsonSchemaNode(parsed, schema, "$");
}

// =============================================================================
// HELPERS
// =============================================================================

function buildFeedback(issues: ValidationIssue[]): string {
  const errors = issues.filter((i) => i.severity === "error");
  if (errors.length === 0) {
    return "Validation warnings were raised. Please review your response.";
  }
  return (
    "The response failed validation:\n" +
    errors.map((e) => `  - [${e.category}] ${e.message}`).join("\n")
  );
}

// =============================================================================
// MAIN EXPORT
// =============================================================================

/**
 * Validate (and optionally mutate) an LLM response.
 *
 * @param responseText - The raw text returned by the model.
 * @param config       - Validation rules and action preferences.
 * @param retryCount   - Current retry iteration (passed through to result).
 * @returns A {@link ResponseValidationResult} with the (possibly truncated)
 *          text, a disposition action, all issues found, and optional feedback.
 */
export function validateResponse(
  responseText: string,
  config: ResponseValidationConfig,
  retryCount?: number,
): ResponseValidationResult {
  const issues: ValidationIssue[] = [];
  let text = responseText;

  // -------------------------------------------------------------------------
  // 1. Minimum length
  // -------------------------------------------------------------------------
  if (config.minLength !== undefined && text.length < config.minLength) {
    issues.push({
      category: "length",
      severity: "error",
      message: `Response length ${text.length} is below required minimum of ${config.minLength}`,
    });
  }

  // -------------------------------------------------------------------------
  // 2. Maximum length — applies truncation or records the issue
  // -------------------------------------------------------------------------
  if (config.maxLength !== undefined && text.length > config.maxLength) {
    const action = config.truncationAction ?? "truncate";

    switch (action) {
      case "truncate": {
        // Bug C6 fix: ensure keepLength cannot go negative
        const rawSuffix = config.truncationSuffix ?? "...";
        const suffix = rawSuffix.slice(0, config.maxLength);
        const keepLength = Math.max(config.maxLength - suffix.length, 0);
        text = text.slice(0, keepLength) + suffix;
        issues.push({
          category: "length",
          severity: "info",
          message: `Response was truncated from ${responseText.length} to ${config.maxLength} characters`,
        });
        if (logger.shouldLog("debug")) {
          logger.debug(
            `[responseValidator] truncated response to ${config.maxLength} chars`,
          );
        }
        break;
      }

      case "abort": {
        issues.push({
          category: "length",
          severity: "error",
          message: `Response length ${text.length} exceeds maximum of ${config.maxLength}; aborting`,
        });
        return {
          text,
          action: "abort",
          issues,
          feedback: `Response exceeded maximum length of ${config.maxLength} characters.`,
          retryCount,
        };
      }

      case "retry": {
        issues.push({
          category: "length",
          severity: "error",
          message: `Response length ${text.length} exceeds maximum of ${config.maxLength}; requesting retry`,
        });
        return {
          text,
          action: "retry",
          issues,
          feedback: "Response exceeded max length, please shorten",
          retryCount,
        };
      }

      case "warn":
      default: {
        issues.push({
          category: "length",
          severity: "warning",
          message: `Response length ${text.length} exceeds maximum of ${config.maxLength} (warn-only)`,
        });
        logger.warn(
          `[responseValidator] response length ${text.length} exceeds maxLength ${config.maxLength}`,
        );
        break;
      }
    }
  }

  // -------------------------------------------------------------------------
  // 3. Required phrases
  // -------------------------------------------------------------------------
  if (config.requiredPhrases && config.requiredPhrases.length > 0) {
    const lowerText = text.toLowerCase();
    for (const phrase of config.requiredPhrases) {
      if (!lowerText.includes(phrase.toLowerCase())) {
        issues.push({
          category: "phrase",
          severity: "error",
          message: `Required phrase "${phrase}" was not found in the response`,
        });
      }
    }
  }

  // -------------------------------------------------------------------------
  // 4. Forbidden phrases
  // -------------------------------------------------------------------------
  if (config.forbiddenPhrases && config.forbiddenPhrases.length > 0) {
    const lowerText = text.toLowerCase();
    for (const phrase of config.forbiddenPhrases) {
      if (lowerText.includes(phrase.toLowerCase())) {
        issues.push({
          category: "phrase",
          severity: "error",
          message: `Forbidden phrase "${phrase}" was found in the response`,
        });
      }
    }
  }

  // -------------------------------------------------------------------------
  // 5. JSON schema
  // -------------------------------------------------------------------------
  if (config.jsonSchema) {
    const schemaIssues = validateJsonSchema(text, config.jsonSchema);
    issues.push(...schemaIssues);
  }

  // -------------------------------------------------------------------------
  // 6. Custom validator
  // -------------------------------------------------------------------------
  if (config.customValidator) {
    const customIssue = config.customValidator(text);
    if (customIssue !== null) {
      issues.push(customIssue);
    }
  }

  // -------------------------------------------------------------------------
  // 7. Determine final action
  // -------------------------------------------------------------------------
  const hasErrors = issues.some((i) => i.severity === "error");

  if (hasErrors) {
    if (logger.shouldLog("debug")) {
      logger.debug("[responseValidator] validation failed", {
        issueCount: issues.length,
        retryOnFailure: config.retryOnFailure,
      });
    }

    if (config.retryOnFailure) {
      return {
        text,
        action: "retry",
        issues,
        feedback: buildFeedback(issues),
        retryCount,
      };
    }

    return {
      text,
      action: "abort",
      issues,
      feedback: buildFeedback(issues),
      retryCount,
    };
  }

  return {
    text,
    action: "continue",
    issues,
    retryCount,
  };
}
