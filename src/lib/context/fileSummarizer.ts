/**
 * File Content Summarization Pipeline
 *
 * Provides utilities to detect when attached file content exceeds the
 * model's available context budget and to plan / build prompts for
 * LLM-driven summarization of the largest files.
 *
 * Design rationale:
 *  - Files are the #1 cause of context overflow when users attach
 *    multiple large documents (PDFs, spreadsheets, source code).
 *  - Rather than blindly truncating, we ask an LLM to produce a
 *    *context-aware* summary that retains the information most
 *    relevant to the user's actual question.
 *  - The caller (FileSummarizationService) is responsible for the
 *    actual LLM calls; this module is pure computation + types.
 */

import { getAvailableInputTokens } from "../constants/contextWindows.js";
import type {
  FileForSummarization,
  FileSummarizationCheckParams,
  FileSummarizationCheckResult,
  FileSummarizationPromptParams,
  FileSummarizationPlanEntry,
} from "../types/contextTypes.js";

export type {
  FileForSummarization,
  FileSummarizationCheckParams,
  FileSummarizationCheckResult,
  FileSummarizationPromptParams,
  SummarizedFile,
  FileSummarizationPlanEntry,
} from "../types/contextTypes.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Fraction of the context window reserved for non-file content overhead */
export const NON_FILE_RESERVE = 0.15;

/** Minimum tokens a single file can be allocated in the plan */
export const MIN_PER_FILE_TOKENS = 500;

/** Maximum tokens a single file can be allocated in the plan */
export const MAX_PER_FILE_TOKENS = 4000;

/**
 * Files with fewer estimated tokens than this threshold are never
 * summarized — they're already small enough to include verbatim.
 */
export const FILE_SUMMARIZATION_THRESHOLD = 1000;

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/**
 * Check whether the attached files push the total input token count
 * beyond the model's available context window.
 *
 * When the total exceeds the budget, we calculate how many tokens are
 * available for files (after accounting for system prompt, conversation
 * history, current prompt, and tool definitions) and divide that
 * equally across all files to derive a per-file budget.
 */
export function shouldSummarizeFiles(
  params: FileSummarizationCheckParams,
): FileSummarizationCheckResult {
  const {
    provider,
    model,
    systemPromptTokens,
    conversationHistoryTokens,
    currentPromptTokens,
    toolDefinitionTokens,
    fileTokens,
    fileCount = 1,
    maxTokens,
    threshold = 0.8,
    minTokensPerFile = MIN_PER_FILE_TOKENS,
    maxTokensPerFile = MAX_PER_FILE_TOKENS,
  } = params;

  const availableInputTokens = getAvailableInputTokens(
    provider,
    model,
    maxTokens,
  );

  const nonFileTokens =
    systemPromptTokens +
    conversationHistoryTokens +
    currentPromptTokens +
    toolDefinitionTokens;

  const totalEstimatedTokens = nonFileTokens + fileTokens;

  // Budget for files = available input minus non-file content minus a reserve
  const reserveTokens = Math.ceil(availableInputTokens * NON_FILE_RESERVE);
  const availableBudgetForFiles = Math.max(
    0,
    availableInputTokens - nonFileTokens - reserveTokens,
  );

  const usageRatio =
    availableInputTokens > 0 ? totalEstimatedTokens / availableInputTokens : 1;

  const needsSummarization =
    usageRatio >= threshold || fileTokens > availableBudgetForFiles;

  let perFileBudget: number | undefined;
  if (needsSummarization && fileCount > 0) {
    const rawBudget = Math.floor(availableBudgetForFiles / fileCount);
    perFileBudget = Math.max(
      minTokensPerFile,
      Math.min(maxTokensPerFile, rawBudget),
    );
  }

  return {
    needsSummarization,
    totalEstimatedTokens,
    availableInputTokens,
    availableBudgetForFiles,
    perFileBudget,
  };
}

/**
 * Build the LLM prompt used to summarize a single file's content.
 *
 * The prompt is *context-aware*: it includes the user's original question
 * so the LLM can prioritise the most relevant parts of the file.
 */
export function buildFileSummarizationPrompt(
  params: FileSummarizationPromptParams,
): string {
  const { fileName, fileType, fileContent, userPrompt, targetTokens } = params;

  return [
    `You are a document summarization assistant. Your task is to summarize the following ${fileType} file in a way that preserves the most important information relevant to the user's question.`,
    ``,
    `## User's Question`,
    `${userPrompt}`,
    ``,
    `## File: ${fileName} (${fileType})`,
    ``,
    `${fileContent}`,
    ``,
    `## Instructions`,
    `1. Produce a concise summary of the file content above.`,
    `2. Focus on information that is most relevant to the user's question.`,
    `3. Preserve key data points, names, numbers, and relationships.`,
    `4. Target approximately ${targetTokens} tokens in your summary.`,
    `5. If the file contains structured data (tables, lists), preserve the structure in a compact form.`,
    `6. Start your summary directly — do not include preamble like "Here is a summary".`,
  ].join("\n");
}

/**
 * Decide which files need summarization and how much budget each gets.
 *
 * Strategy:
 *  1. Sort files largest-first.
 *  2. Walk through the list, marking the largest files for summarization
 *     until the cumulative saved tokens bring us under budget.
 *  3. Files below `FILE_SUMMARIZATION_THRESHOLD` are never summarized.
 */
export function planFileSummarization(
  files: FileForSummarization[],
  params: FileSummarizationCheckParams,
): FileSummarizationPlanEntry[] {
  const checkResult = shouldSummarizeFiles({
    ...params,
    fileCount: files.length,
  });

  // If no summarization needed, keep everything
  if (!checkResult.needsSummarization) {
    return files.map((file) => ({ file, action: "keep" as const }));
  }

  // Sort largest first (descending by estimatedTokens)
  const sorted = [...files].sort(
    (a, b) => b.estimatedTokens - a.estimatedTokens,
  );

  const perFileBudget = checkResult.perFileBudget ?? MAX_PER_FILE_TOKENS;

  // Calculate how many tokens we need to save
  const totalFileTokens = files.reduce((sum, f) => sum + f.estimatedTokens, 0);
  const tokensToSave = Math.max(
    0,
    totalFileTokens - checkResult.availableBudgetForFiles,
  );

  let savedSoFar = 0;
  const plan: FileSummarizationPlanEntry[] = [];

  for (const file of sorted) {
    // Never summarize tiny files
    if (
      file.estimatedTokens < FILE_SUMMARIZATION_THRESHOLD ||
      savedSoFar >= tokensToSave
    ) {
      plan.push({ file, action: "keep" });
    } else {
      const savingsFromThisFile = file.estimatedTokens - perFileBudget;
      if (savingsFromThisFile > 0) {
        plan.push({
          file,
          action: "summarize",
          targetTokens: perFileBudget,
        });
        savedSoFar += savingsFromThisFile;
      } else {
        plan.push({ file, action: "keep" });
      }
    }
  }

  return plan;
}
