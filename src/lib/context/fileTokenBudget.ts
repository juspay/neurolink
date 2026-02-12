/**
 * File Token Budget System
 *
 * Calculates how much of the remaining context window budget
 * can be used for file reads. Implements fast-path for small files
 * and preview mode for very large files.
 */

import type { BudgetFileInput } from "../types/contextTypes.js";

export type { BudgetFileInput } from "../types/contextTypes.js";

/** Percentage of remaining context to allocate for file reads */
export const FILE_READ_BUDGET_PERCENT = 0.6;

/** Files below this size skip budget validation (100KB) */
export const FILE_FAST_PATH_SIZE = 100 * 1024;

/** Files above this size get preview-only mode (5MB) */
export const FILE_PREVIEW_MODE_SIZE = 5 * 1024 * 1024;

/** Default preview size in characters */
export const FILE_PREVIEW_CHARS = 2000;

/**
 * Calculate available token budget for file reads.
 *
 * @param contextWindow - Total context window for the model
 * @param currentTokens - Tokens already used (conversation + system prompt)
 * @param maxOutputTokens - Reserved output tokens
 * @returns Available tokens for file content
 */
export function calculateFileTokenBudget(
  contextWindow: number,
  currentTokens: number,
  maxOutputTokens: number,
): number {
  const remainingTokens = contextWindow - currentTokens - maxOutputTokens;
  if (remainingTokens <= 0) {
    return 0;
  }

  return Math.floor(remainingTokens * FILE_READ_BUDGET_PERCENT);
}

/**
 * Determine how a file should be handled based on its size and the budget.
 */
export function shouldTruncateFile(
  fileSize: number,
  budget: number,
): {
  shouldTruncate: boolean;
  maxChars?: number;
  previewMode?: boolean;
} {
  // Very large files: preview mode
  if (fileSize > FILE_PREVIEW_MODE_SIZE) {
    return {
      shouldTruncate: true,
      maxChars: FILE_PREVIEW_CHARS,
      previewMode: true,
    };
  }

  // Small files: skip validation
  if (fileSize < FILE_FAST_PATH_SIZE) {
    return { shouldTruncate: false };
  }

  // Estimate tokens (4 chars per token, rough)
  const estimatedTokens = Math.ceil(fileSize / 4);

  if (estimatedTokens <= budget) {
    return { shouldTruncate: false };
  }

  // Truncate to fit budget
  const maxChars = budget * 4; // Convert back to chars
  return {
    shouldTruncate: true,
    maxChars: Math.max(FILE_PREVIEW_CHARS, maxChars),
    previewMode: false,
  };
}

/**
 * Estimate post-processing token count based on file type.
 *
 * Different file types produce vastly different amounts of text after
 * processing.  A 50 MB video file yields ~200-500 tokens of metadata,
 * while a 50 MB text file yields ~12.5 M tokens.  Using the raw byte
 * size for all types causes media files to be wrongly excluded by the
 * aggregate budget check.
 *
 * @param sizeBytes  Raw file size in bytes
 * @param fileType   Detected file type (e.g. "video", "audio", "image")
 * @returns Estimated token count after processing
 */
export function estimatePostProcessingTokens(
  sizeBytes: number,
  fileType?: string,
): number {
  switch (fileType) {
    // Media files produce only metadata text (~100-500 tokens)
    case "video":
      return 500;
    case "audio":
      return 300;
    // Images are sent as base64 — provider counts them as ~1500 tokens each
    case "image":
      return 1500;
    // Archives produce a file listing (~500-2000 tokens)
    case "archive":
      return 1000;
    // Unknown binary files produce metadata + extracted strings (~200-1000 tokens)
    case "unknown":
      return 500;
    // PDFs are sent natively on some providers; estimate ~1 token per 100 bytes, capped
    case "pdf":
      return Math.min(Math.ceil(sizeBytes / 100), 50_000);
    // Structured documents (Excel, Word, PPTX) extract text — roughly 15% of raw size
    case "xlsx":
    case "docx":
    case "pptx":
      return Math.ceil((sizeBytes * 0.15) / 4);
    // SVG is sanitized markup — usually small
    case "svg":
      return Math.ceil(sizeBytes / 4);
    // CSV, text, code — raw text roughly 1 token per 4 bytes
    case "csv":
    case "text":
    default:
      // Original formula: base64-inflate then divide by 4
      return Math.ceil((sizeBytes * 1.33) / 4);
  }
}

export function enforceAggregateFileBudget(
  files: BudgetFileInput[],
  availableTokens: number,
): {
  included: BudgetFileInput[];
  excluded: BudgetFileInput[];
  notices: string[];
} {
  const TOKEN_BUDGET_FOR_FILES = Math.floor(
    availableTokens * FILE_READ_BUDGET_PERCENT,
  );
  let usedTokens = 0;
  const included: BudgetFileInput[] = [];
  const excluded: BudgetFileInput[] = [];
  const notices: string[] = [];

  const sorted = [...files].sort((a, b) => a.sizeBytes - b.sizeBytes);

  for (const file of sorted) {
    const estimatedTokens = estimatePostProcessingTokens(
      file.sizeBytes,
      file.fileType,
    );
    if (usedTokens + estimatedTokens <= TOKEN_BUDGET_FOR_FILES) {
      usedTokens += estimatedTokens;
      included.push(file);
    } else {
      excluded.push(file);
      notices.push(
        `Skipped "${file.name}" (${(file.sizeBytes / 1024).toFixed(0)} KB) — exceeds context budget`,
      );
    }
  }

  return { included, excluded, notices };
}
