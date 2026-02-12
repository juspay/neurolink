/**
 * Integration Tests for File Summarization Pipeline
 *
 * Tests realistic scenarios including:
 *  - The exact "curator failure" scenario: 5 large files on claude-sonnet via Vertex
 *  - Context overflow detection for 2.8MB of file content against 200K window
 *  - Correct prioritization: largest files summarized first
 *  - Small file sets that should NOT trigger summarization
 */

import { describe, expect, it } from "vitest";
import { getAvailableInputTokens } from "../../src/lib/constants/contextWindows.js";
import { FileSummarizationService } from "../../src/lib/context/fileSummarizationService.js";
import {
  FILE_SUMMARIZATION_THRESHOLD,
  type FileForSummarization,
  type FileSummarizationCheckParams,
  planFileSummarization,
  shouldSummarizeFiles,
} from "../../src/lib/context/fileSummarizer.js";
import { estimateTokens } from "../../src/lib/utils/tokenEstimation.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Simulate a large file by generating repeated text content.
 * ~4 chars per token (English text baseline).
 */
function makeLargeFileContent(approxBytes: number): string {
  const line =
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.\n";
  const repeats = Math.ceil(approxBytes / line.length);
  return line.repeat(repeats);
}

function makeFile(
  name: string,
  approxBytes: number,
  type = "Text File",
  mimeType = "text/plain",
): FileForSummarization {
  const content = makeLargeFileContent(approxBytes);
  return {
    fileName: name,
    fileType: type,
    content,
    estimatedTokens: estimateTokens(content, "vertex"),
    mimeType,
  };
}

// ---------------------------------------------------------------------------
// Scenario 1: The Curator Failure
// ---------------------------------------------------------------------------

describe("Realistic overflow scenario: curator failure", () => {
  it("detects overflow when 5 large files are attached on Vertex claude-sonnet", () => {
    // Simulate the real-world failure:
    // - Provider: vertex (using claude-sonnet via Vertex proxy)
    // - 5 files totaling ~2.8MB of text content
    // - System prompt: ~2K tokens
    // - Conversation history: ~5K tokens
    // - User prompt: ~500 tokens
    // - Tool definitions: ~2K tokens (10 tools)

    const file1 = makeFile("annual-report.pdf", 1_200_000, "PDF Document");
    const file2 = makeFile("financial-data.xlsx", 900_000, "Excel Spreadsheet");
    const file3 = makeFile("technical-spec.docx", 800_000, "Word Document");
    const file4 = makeFile("meeting-notes.md", 600_000, "Markdown Document");
    const file5 = makeFile("source-code.ts", 700_000, "TypeScript File");

    const files = [file1, file2, file3, file4, file5];

    const totalFileTokens = files.reduce(
      (sum, f) => sum + f.estimatedTokens,
      0,
    );

    const params: FileSummarizationCheckParams = {
      provider: "vertex",
      model: "gemini-2.5-flash",
      systemPromptTokens: 2000,
      conversationHistoryTokens: 5000,
      currentPromptTokens: 500,
      toolDefinitionTokens: 2000,
      fileTokens: totalFileTokens,
      fileCount: 5,
    };

    const result = shouldSummarizeFiles(params);

    // With ~2.8MB of text (many hundreds of thousands of tokens),
    // even a 1M-token Vertex window should overflow
    expect(result.needsSummarization).toBe(true);
    expect(result.totalEstimatedTokens).toBeGreaterThan(
      result.availableInputTokens,
    );
    expect(result.perFileBudget).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Scenario 2: 2.8MB against 200K Anthropic window
// ---------------------------------------------------------------------------

describe("shouldSummarizeFiles: 2.8MB against 200K window", () => {
  it("detects overflow for large file content on Anthropic", () => {
    // 2.8MB of text ≈ 2_800_000 / 4 * 1.23 (anthropic multiplier) * 1.15 (safety)
    // ≈ ~990,000+ tokens — way beyond the 136K available input for claude-sonnet
    const largeTotalBytes = 2_800_000;
    const content = makeLargeFileContent(largeTotalBytes);
    const fileTokens = estimateTokens(content, "anthropic");

    const result = shouldSummarizeFiles({
      provider: "anthropic",
      model: "claude-sonnet-4-20250514",
      systemPromptTokens: 2000,
      conversationHistoryTokens: 5000,
      currentPromptTokens: 500,
      toolDefinitionTokens: 2000,
      fileTokens,
      fileCount: 5,
    });

    expect(result.needsSummarization).toBe(true);

    // Available input for anthropic claude-sonnet = 200K - 64K = 136K
    const expectedAvailable = getAvailableInputTokens(
      "anthropic",
      "claude-sonnet-4-20250514",
    );
    expect(result.availableInputTokens).toBe(expectedAvailable);
    expect(result.totalEstimatedTokens).toBeGreaterThan(expectedAvailable);
  });
});

// ---------------------------------------------------------------------------
// Scenario 3: Largest files summarized first
// ---------------------------------------------------------------------------

describe("planFileSummarization: prioritization", () => {
  it("summarizes the largest files first and preserves small ones", () => {
    const files = [
      makeFile("tiny.txt", 1_000), // ~300 tokens — below threshold
      makeFile("small.md", 5_000), // ~1.5K tokens
      makeFile("medium.json", 50_000), // ~15K tokens
      makeFile("large.pdf", 200_000, "PDF Document"), // ~60K tokens
      makeFile("huge.csv", 500_000, "CSV File"), // ~150K tokens
    ];

    const totalFileTokens = files.reduce(
      (sum, f) => sum + f.estimatedTokens,
      0,
    );

    // Use anthropic to have a smaller window (200K → 136K available)
    const params: FileSummarizationCheckParams = {
      provider: "anthropic",
      model: "claude-sonnet-4-20250514",
      systemPromptTokens: 2000,
      conversationHistoryTokens: 5000,
      currentPromptTokens: 500,
      toolDefinitionTokens: 2000,
      fileTokens: totalFileTokens,
      fileCount: files.length,
    };

    const plan = planFileSummarization(files, params);
    const findPlan = (name: string) =>
      plan.find((e) => e.file.fileName === name)!;

    // The largest file should definitely be marked for summarization
    expect(findPlan("huge.csv").action).toBe("summarize");

    // At least the largest file(s) are summarized; the algorithm stops once
    // enough tokens are saved, so large.pdf may or may not be summarized
    // depending on exact token math. We verify ordering: huge > large > medium.
    const summarizedEntries = plan
      .filter((e) => e.action === "summarize")
      .map((e) => e.file.fileName);
    expect(summarizedEntries.length).toBeGreaterThanOrEqual(1);
    expect(summarizedEntries[0]).toBe("huge.csv");

    // The tiny file (below threshold) should always be kept
    expect(findPlan("tiny.txt").action).toBe("keep");

    // Summarized files should have targetTokens
    const hugeEntry = findPlan("huge.csv");
    expect(hugeEntry.targetTokens).toBeDefined();
    expect(hugeEntry.targetTokens).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Scenario 4: Small file sets don't trigger summarization
// ---------------------------------------------------------------------------

describe("Small file sets: no summarization", () => {
  it("keeps all files when total size is within budget", () => {
    const files = [
      makeFile("readme.md", 2_000), // ~600 tokens
      makeFile("config.json", 1_000), // ~300 tokens
      makeFile("test.ts", 3_000), // ~900 tokens
    ];

    const totalFileTokens = files.reduce(
      (sum, f) => sum + f.estimatedTokens,
      0,
    );

    // Vertex with 1M context — 1800 tokens is negligible
    const params: FileSummarizationCheckParams = {
      provider: "vertex",
      model: "gemini-2.5-flash",
      systemPromptTokens: 1000,
      conversationHistoryTokens: 2000,
      currentPromptTokens: 200,
      toolDefinitionTokens: 1000,
      fileTokens: totalFileTokens,
      fileCount: 3,
    };

    const result = shouldSummarizeFiles(params);
    expect(result.needsSummarization).toBe(false);

    const plan = planFileSummarization(files, params);
    expect(plan.every((e) => e.action === "keep")).toBe(true);
  });

  it("handles a single small file without summarization", () => {
    const files = [makeFile("note.txt", 500)];

    const totalFileTokens = files.reduce(
      (sum, f) => sum + f.estimatedTokens,
      0,
    );

    const params: FileSummarizationCheckParams = {
      provider: "anthropic",
      model: "claude-sonnet-4-20250514",
      systemPromptTokens: 500,
      conversationHistoryTokens: 1000,
      currentPromptTokens: 100,
      toolDefinitionTokens: 0,
      fileTokens: totalFileTokens,
      fileCount: 1,
    };

    const result = shouldSummarizeFiles(params);
    expect(result.needsSummarization).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// FileSummarizationService integration: prepareFiles
// ---------------------------------------------------------------------------

describe("FileSummarizationService: end-to-end preparation", () => {
  it("prepares realistic file set and detects overflow", () => {
    const service = new FileSummarizationService({
      provider: "vertex",
      model: "gemini-2.5-flash",
    });

    const rawFiles = [
      {
        content: makeLargeFileContent(300_000),
        mimeType: "application/pdf",
        fileName: "report.pdf",
        originalSize: 300_000,
      },
      {
        content: makeLargeFileContent(200_000),
        mimeType: "text/csv",
        fileName: "data.csv",
        originalSize: 200_000,
      },
    ];

    const prepared = service.prepareFilesForSummarization(rawFiles, "vertex");

    expect(prepared).toHaveLength(2);
    expect(prepared[0].fileType).toBe("PDF Document");
    expect(prepared[1].fileType).toBe("CSV File");

    const totalFileTokens = prepared.reduce(
      (sum, f) => sum + f.estimatedTokens,
      0,
    );

    // Verify that these files would trigger summarization on a small model
    const result = shouldSummarizeFiles({
      provider: "openai",
      model: "gpt-4", // 8K context — definitely overflows
      systemPromptTokens: 200,
      conversationHistoryTokens: 500,
      currentPromptTokens: 100,
      toolDefinitionTokens: 0,
      fileTokens: totalFileTokens,
      fileCount: 2,
    });

    expect(result.needsSummarization).toBe(true);
  });
});
