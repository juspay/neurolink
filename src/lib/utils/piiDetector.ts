/**
 * PII Detection Utility
 *
 * Standalone utility for detecting and redacting personally identifiable
 * information (PII) from text. Used by generate() and stream() directly.
 *
 * @module piiDetector
 */

import { logger } from "./logger.js";
import type {
  PiiType,
  PiiDetectionConfig,
  DetectedPII,
  PiiDetectionResult,
} from "../types/index.js";

// ============================================================================
// Built-in patterns
// ============================================================================

const PII_PATTERNS: Record<PiiType, RegExp> = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi,
  phone: /\b(\+?1[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b/g,
  ssn: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,
  creditCard: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
  ipAddress: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  address:
    /\b\d+\s+[\w\s]+(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|court|ct)\b/gi,
  name: /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g,
  dateOfBirth:
    /\b(?:0?[1-9]|1[0-2])[-/](?:0?[1-9]|[12]\d|3[01])[-/](?:19|20)\d{2}\b/g,
  passport: /\b[A-Z]{1,2}\d{6,9}\b/g,
  driversLicense: /\b[A-Z]{1,2}\d{5,8}\b/g,
};

const DEFAULT_PII_TYPES: PiiType[] = ["email", "phone", "ssn", "creditCard"];

// ============================================================================
// Catastrophic backtracking detection (Bug C10)
// ============================================================================

/**
 * Heuristic check for patterns that can cause catastrophic backtracking.
 * Looks for nested quantifiers such as (a+)+ or (a*)* and similar structures.
 */
function hasCatastrophicBacktracking(pattern: RegExp): boolean {
  const src = pattern.source;
  // Simple string-based check for nested quantifiers: (X+)+ (X*)+ etc.
  // Avoids using a regex here (CodeQL flags polynomial regex on untrusted input).
  for (let i = 0; i < src.length - 1; i++) {
    if (src[i] === ")" && (src[i + 1] === "+" || src[i + 1] === "*")) {
      // Found a closing group followed by a quantifier — check if the group
      // itself contains a quantifier.
      const groupEnd = i;
      let depth = 1;
      let j = groupEnd - 1;
      while (j >= 0 && depth > 0) {
        if (src[j] === ")") {
          depth++;
        }
        if (src[j] === "(") {
          depth--;
        }
        j--;
      }
      const groupStart = j + 1;
      const groupBody = src.slice(groupStart + 1, groupEnd);
      if (groupBody.includes("+") || groupBody.includes("*")) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Validate a custom RegExp before use (Bug C10).
 * Returns an error string if invalid, or null if safe.
 */
function validateCustomPattern(pattern: unknown): string | null {
  if (!(pattern instanceof RegExp)) {
    return "Custom pattern is not a RegExp instance";
  }
  if (hasCatastrophicBacktracking(pattern)) {
    return `Custom pattern /${pattern.source}/ contains nested quantifiers that may cause catastrophic backtracking`;
  }
  return null;
}

// ============================================================================
// Per-field detection helpers (Bug C3 fix)
// ============================================================================

/**
 * Scan a single field's text with one regex pattern.
 * Returns DetectedPII entries with field-local offsets.
 */
function scanField(
  fieldText: string,
  fieldName: string,
  type: PiiType | "custom",
  pattern: RegExp,
): DetectedPII[] {
  // Reset lastIndex to avoid cross-call state leaking between scans.
  // We mutate the pattern's lastIndex directly rather than constructing a new
  // RegExp from .source/.flags (which CodeQL flags as regex injection).
  pattern.lastIndex = 0;
  const regex = pattern;
  const results: DetectedPII[] = [];

  let match = regex.exec(fieldText);
  while (match !== null) {
    results.push({
      type,
      value: match[0],
      position: { start: match.index, end: match.index + match[0].length },
      field: fieldName,
    });
    // Guard against zero-width matches causing infinite loops
    if (match[0].length === 0) {
      regex.lastIndex++;
    }
    match = regex.exec(fieldText);
  }

  return results;
}

/**
 * Apply redactions to a single field's text given its DetectedPII entries.
 * Redacts in reverse position order so earlier offsets stay valid.
 */
function redactField(
  fieldText: string,
  hits: DetectedPII[],
  redactionText: string,
): string {
  // Sort descending by start position
  const sorted = [...hits].sort((a, b) => b.position.start - a.position.start);
  let result = fieldText;
  for (const hit of sorted) {
    result =
      result.slice(0, hit.position.start) +
      redactionText +
      result.slice(hit.position.end);
  }
  return result;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Detect and optionally redact PII from a text string.
 *
 * Detection runs per-field (each named segment scanned independently) so that
 * offset positions always refer to the correct field's text — not a concatenated
 * blob (Bug C3 fix).
 *
 * Custom patterns are validated before execution to prevent catastrophic
 * backtracking (Bug C10 fix).
 *
 * @param text - The input text to scan
 * @param config - PII detection configuration
 * @returns Detection result with (optionally) redacted text and found PII
 */
export async function detectAndRedactPII(
  text: string,
  config: PiiDetectionConfig,
): Promise<PiiDetectionResult> {
  const {
    action,
    detectTypes = DEFAULT_PII_TYPES,
    customPatterns = [],
    allowList = [],
    redactionText = "[REDACTED]",
  } = config;

  if (!text) {
    return { text, detectedPII: [], action: "continue" };
  }

  // Validate custom patterns up-front (Bug C10)
  const validatedCustomPatterns: RegExp[] = [];
  for (const pattern of customPatterns) {
    const err = validateCustomPattern(pattern);
    if (err) {
      logger.warn(`piiDetector: skipping invalid custom pattern — ${err}`);
      continue;
    }
    validatedCustomPatterns.push(pattern);
  }

  const allDetected: DetectedPII[] = [];

  // Scan built-in PII types (Bug C3: scan the field in isolation)
  for (const piiType of detectTypes) {
    if (allowList.includes(piiType)) {
      continue;
    }
    const pattern = PII_PATTERNS[piiType];
    if (!pattern) {
      continue;
    }

    const hits = scanField(text, "text", piiType, pattern);
    allDetected.push(...hits);
  }

  // Scan custom patterns
  for (const pattern of validatedCustomPatterns) {
    let hits: DetectedPII[] = [];
    try {
      hits = scanField(text, "text", "custom", pattern);
    } catch (err) {
      logger.warn(
        `piiDetector: custom pattern /${pattern.source}/ threw during execution — skipping`,
        err,
      );
    }
    allDetected.push(...hits);
  }

  if (allDetected.length === 0) {
    if (logger.shouldLog("debug")) {
      logger.debug("piiDetector: no PII detected in input");
    }
    return { text, detectedPII: [], action: "continue" };
  }

  if (logger.shouldLog("debug")) {
    logger.debug(
      `piiDetector: detected ${allDetected.length} PII occurrence(s) — action=${action}`,
    );
  }

  // Summarise findings for feedback
  const typeCounts = allDetected.reduce<Record<string, number>>((acc, d) => {
    acc[d.type] = (acc[d.type] ?? 0) + 1;
    return acc;
  }, {});
  const summary = Object.entries(typeCounts)
    .map(([t, n]) => `${t} (${n})`)
    .join(", ");

  if (action === "abort") {
    return {
      text,
      detectedPII: allDetected,
      action: "abort",
      feedback: `PII detected: ${summary}. Request blocked for security.`,
    };
  }

  if (action === "redact") {
    // Redact per-field (Bug C3: field hits already carry field-local offsets)
    const fieldHits = allDetected.filter((d) => d.field === "text");
    const redactedText = redactField(text, fieldHits, redactionText);

    return {
      text: redactedText,
      detectedPII: allDetected,
      action: "continue",
      feedback: `PII redacted: ${summary}.`,
    };
  }

  // action === "warn"
  return {
    text,
    detectedPII: allDetected,
    action: "continue",
    feedback: `PII detected (not redacted): ${summary}.`,
  };
}
