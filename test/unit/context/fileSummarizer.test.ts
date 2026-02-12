/**
 * Unit tests for fileSummarizer.ts
 *
 * Tests the pure-computation functions that decide whether files need
 * summarization, build prompts, and plan per-file token budgets.
 */

import { describe, expect, it } from "vitest";
import {
  buildFileSummarizationPrompt,
  FILE_SUMMARIZATION_THRESHOLD,
  type FileForSummarization,
  type FileSummarizationCheckParams,
  MAX_PER_FILE_TOKENS,
  MIN_PER_FILE_TOKENS,
  NON_FILE_RESERVE,
  planFileSummarization,
  shouldSummarizeFiles,
} from "../../../src/lib/context/fileSummarizer.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCheckParams(
  overrides: Partial<FileSummarizationCheckParams> = {},
): FileSummarizationCheckParams {
  return {
    provider: "anthropic",
    model: "claude-sonnet-4-20250514",
    systemPromptTokens: 500,
    conversationHistoryTokens: 1000,
    currentPromptTokens: 200,
    toolDefinitionTokens: 400,
    fileTokens: 5000,
    fileCount: 2,
    ...overrides,
  };
}

function makeFile(
  name: string,
  tokens: number,
  type = "Text File",
): FileForSummarization {
  return {
    fileName: name,
    fileType: type,
    content: "x".repeat(tokens * 4), // rough approximation
    estimatedTokens: tokens,
  };
}

// ---------------------------------------------------------------------------
// shouldSummarizeFiles
// ---------------------------------------------------------------------------

describe("shouldSummarizeFiles", () => {
  it("returns false when total tokens are within budget", () => {
    // Anthropic claude-sonnet has 200K context, ~136K available input.
    // With small fileTokens the total is well under budget.
    const result = shouldSummarizeFiles(
      makeCheckParams({
        fileTokens: 5000,
        fileCount: 2,
      }),
    );

    expect(result.needsSummarization).toBe(false);
    expect(result.perFileBudget).toBeUndefined();
  });

  it("returns true when total tokens exceed budget", () => {
    // Push file tokens way beyond available budget
    const result = shouldSummarizeFiles(
      makeCheckParams({
        systemPromptTokens: 10_000,
        conversationHistoryTokens: 50_000,
        currentPromptTokens: 5_000,
        toolDefinitionTokens: 5_000,
        fileTokens: 100_000,
        fileCount: 5,
      }),
    );

    expect(result.needsSummarization).toBe(true);
    expect(result.perFileBudget).toBeDefined();
    expect(result.perFileBudget).toBeGreaterThanOrEqual(MIN_PER_FILE_TOKENS);
    expect(result.perFileBudget).toBeLessThanOrEqual(MAX_PER_FILE_TOKENS);
  });

  it("calculates correct per-file budget", () => {
    // Use a small model (GPT-4 with 8192 context)
    // available input: 8192 - 2867 (output reserve 35%) = 5325
    const result = shouldSummarizeFiles(
      makeCheckParams({
        provider: "openai",
        model: "gpt-4",
        systemPromptTokens: 200,
        conversationHistoryTokens: 500,
        currentPromptTokens: 100,
        toolDefinitionTokens: 0,
        fileTokens: 10_000,
        fileCount: 3,
      }),
    );

    expect(result.needsSummarization).toBe(true);
    expect(result.perFileBudget).toBeDefined();

    // availableBudgetForFiles = availableInput - nonFile - reserve
    // The per-file budget should be the available budget divided by fileCount,
    // clamped to [MIN_PER_FILE_TOKENS, MAX_PER_FILE_TOKENS]
    const availableBudget = result.availableBudgetForFiles;
    const rawPerFile = Math.floor(availableBudget / 3);
    const expectedPerFile = Math.max(
      MIN_PER_FILE_TOKENS,
      Math.min(MAX_PER_FILE_TOKENS, rawPerFile),
    );
    expect(result.perFileBudget).toBe(expectedPerFile);
  });

  it("respects custom threshold", () => {
    // With a low threshold (0.1), even small usage triggers summarization
    const result = shouldSummarizeFiles(
      makeCheckParams({
        fileTokens: 5000,
        threshold: 0.01,
      }),
    );

    expect(result.needsSummarization).toBe(true);
  });

  it("handles zero file count gracefully", () => {
    const result = shouldSummarizeFiles(
      makeCheckParams({
        fileTokens: 100_000,
        fileCount: 0,
      }),
    );

    // needsSummarization may be true but perFileBudget should be undefined
    // (can't divide by zero files)
    expect(result.perFileBudget).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// buildFileSummarizationPrompt
// ---------------------------------------------------------------------------

describe("buildFileSummarizationPrompt", () => {
  it("includes user prompt and file name in the output", () => {
    const prompt = buildFileSummarizationPrompt({
      fileName: "report.pdf",
      fileType: "PDF Document",
      fileContent: "Quarterly earnings were $1.2M...",
      userPrompt: "What were the Q3 earnings?",
      targetTokens: 500,
    });

    expect(prompt).toContain("report.pdf");
    expect(prompt).toContain("PDF Document");
    expect(prompt).toContain("What were the Q3 earnings?");
    expect(prompt).toContain("Quarterly earnings were $1.2M");
    expect(prompt).toContain("500");
  });

  it("includes structured data preservation instruction", () => {
    const prompt = buildFileSummarizationPrompt({
      fileName: "data.csv",
      fileType: "CSV File",
      fileContent: "col1,col2\na,b",
      userPrompt: "Summarize",
      targetTokens: 300,
    });

    expect(prompt).toContain("structured data");
  });
});

// ---------------------------------------------------------------------------
// planFileSummarization
// ---------------------------------------------------------------------------

describe("planFileSummarization", () => {
  it("marks largest files for summarization first", () => {
    const files = [
      makeFile("small.txt", 800),
      makeFile("large.pdf", 50_000, "PDF Document"),
      makeFile("medium.csv", 5_000, "CSV File"),
      makeFile("huge.xlsx", 80_000, "Excel Spreadsheet"),
    ];

    // Use a small model so summarization is definitely needed
    const params = makeCheckParams({
      provider: "openai",
      model: "gpt-4", // 8192 context → ~5325 available input
      systemPromptTokens: 200,
      conversationHistoryTokens: 500,
      currentPromptTokens: 100,
      toolDefinitionTokens: 0,
      fileTokens: 135_800,
      fileCount: 4,
    });

    const plan = planFileSummarization(files, params);

    // Find entries by file name
    const findEntry = (name: string) =>
      plan.find((e) => e.file.fileName === name)!;

    // The two largest files should be summarized
    expect(findEntry("huge.xlsx").action).toBe("summarize");
    expect(findEntry("large.pdf").action).toBe("summarize");

    // The small file (< FILE_SUMMARIZATION_THRESHOLD) should be kept
    expect(findEntry("small.txt").action).toBe("keep");
  });

  it("keeps all files when within budget", () => {
    const files = [makeFile("a.txt", 1000), makeFile("b.txt", 2000)];

    // Anthropic with 200K context — 3K of files is tiny
    const params = makeCheckParams({
      fileTokens: 3000,
      fileCount: 2,
    });

    const plan = planFileSummarization(files, params);
    expect(plan.every((e) => e.action === "keep")).toBe(true);
  });

  it("never summarizes files below threshold", () => {
    const files = [
      makeFile("tiny.txt", 200),
      makeFile("large.pdf", 50_000, "PDF Document"),
    ];

    const params = makeCheckParams({
      provider: "openai",
      model: "gpt-4",
      systemPromptTokens: 200,
      conversationHistoryTokens: 500,
      currentPromptTokens: 100,
      toolDefinitionTokens: 0,
      fileTokens: 50_200,
      fileCount: 2,
    });

    const plan = planFileSummarization(files, params);
    const tinyEntry = plan.find((e) => e.file.fileName === "tiny.txt")!;
    expect(tinyEntry.action).toBe("keep");
  });

  it("assigns targetTokens to summarized files", () => {
    const files = [makeFile("big.pdf", 60_000, "PDF Document")];

    const params = makeCheckParams({
      provider: "openai",
      model: "gpt-4",
      systemPromptTokens: 200,
      conversationHistoryTokens: 500,
      currentPromptTokens: 100,
      toolDefinitionTokens: 0,
      fileTokens: 60_000,
      fileCount: 1,
    });

    const plan = planFileSummarization(files, params);
    const entry = plan[0];
    expect(entry.action).toBe("summarize");
    expect(entry.targetTokens).toBeDefined();
    expect(entry.targetTokens).toBeGreaterThanOrEqual(MIN_PER_FILE_TOKENS);
    expect(entry.targetTokens).toBeLessThanOrEqual(MAX_PER_FILE_TOKENS);
  });
});

// ---------------------------------------------------------------------------
// Constants sanity checks
// ---------------------------------------------------------------------------

describe("constants", () => {
  it("has sensible default values", () => {
    expect(NON_FILE_RESERVE).toBe(0.15);
    expect(MIN_PER_FILE_TOKENS).toBe(500);
    expect(MAX_PER_FILE_TOKENS).toBe(4000);
    expect(FILE_SUMMARIZATION_THRESHOLD).toBe(1000);
  });
});
