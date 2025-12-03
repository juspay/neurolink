/**
 * Prompt redaction utilities for safe logging
 * Provides consistent prompt masking across NeuroLink components
 */

import type { PromptRedactionOptions } from "../types/utilities.js";

/**
 * Default redaction options
 */
const DEFAULT_REDACTION_OPTIONS: Required<PromptRedactionOptions> = {
  maxLength: 100,
  showWordCount: true,
  maskChar: "*",
};

/**
 * Redact a prompt for safe logging
 * Truncates to maxLength and optionally shows word count
 */
export function redactPrompt(
  prompt: string,
  options: PromptRedactionOptions = {},
): string {
  const opts = { ...DEFAULT_REDACTION_OPTIONS, ...options };

  if (!prompt || typeof prompt !== "string") {
    return "[INVALID_PROMPT]";
  }

  const wordCount = prompt.trim().split(/\s+/).length;
  let redacted = prompt.substring(0, opts.maxLength);

  // Add ellipsis if truncated
  if (prompt.length > opts.maxLength) {
    redacted = redacted.substring(0, opts.maxLength - 3) + "...";
  }

  // Optionally append word count
  if (opts.showWordCount) {
    redacted += ` [${wordCount} words]`;
  }

  return redacted;
}

/**
 * Create a short safe mask for highly sensitive contexts
 */
export function createSafeMask(
  prompt: string,
  _maskLength: number = 20,
): string {
  if (!prompt || typeof prompt !== "string") {
    return "[INVALID_PROMPT]";
  }

  const wordCount = prompt.trim().split(/\s+/).length;
  const charCount = prompt.length;

  return `[REDACTED: ${charCount} chars, ${wordCount} words]`;
}

/**
 * Redact for classification context (matches classifier behavior)
 */
export function redactForClassification(prompt: string): string {
  return redactPrompt(prompt, {
    maxLength: 100,
    showWordCount: false,
  });
}

/**
 * Redact for routing context (matches router behavior)
 */
export function redactForRouting(prompt: string): string {
  return redactPrompt(prompt, {
    maxLength: 100,
    showWordCount: true,
  });
}
