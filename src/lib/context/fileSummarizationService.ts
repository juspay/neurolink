/**
 * File Summarization Service
 *
 * Orchestrates the end-to-end file summarization pipeline:
 *  1. Accept raw file inputs (strings or Buffers)
 *  2. Extract readable text and estimate tokens
 *  3. Use `planFileSummarization()` to decide which files to summarize
 *  4. Call an LLM to produce context-aware summaries of the largest files
 *  5. Fall back to truncation when the LLM call fails
 *
 * The LLM is instantiated via a *dynamic import* of NeuroLink to avoid
 * circular dependency issues (NeuroLink → fileSummarizationService → NeuroLink).
 */

import { estimateTokens } from "../utils/tokenEstimation.js";
import {
  buildFileSummarizationPrompt,
  type FileForSummarization,
  type FileSummarizationCheckParams,
  planFileSummarization,
  type SummarizedFile,
} from "./fileSummarizer.js";
import type { RawFileInput } from "../types/contextTypes.js";

export type { RawFileInput } from "../types/contextTypes.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Constructor options. */
type FileSummarizationServiceOptions = {
  /** Provider used for the summarization LLM call (default: "vertex") */
  provider?: string;
  /** Model used for the summarization LLM call (default: "gemini-2.5-flash") */
  model?: string;
};

// ---------------------------------------------------------------------------
// MIME → human label mapping
// ---------------------------------------------------------------------------

const MIME_LABEL_MAP: Record<string, string> = {
  "application/pdf": "PDF Document",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "Word Document",
  "application/msword": "Word Document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
    "Excel Spreadsheet",
  "application/vnd.ms-excel": "Excel Spreadsheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "PowerPoint Presentation",
  "application/vnd.ms-powerpoint": "PowerPoint Presentation",
  "application/json": "JSON File",
  "application/xml": "XML File",
  "text/xml": "XML File",
  "text/html": "HTML Document",
  "text/css": "CSS Stylesheet",
  "text/csv": "CSV File",
  "text/plain": "Text File",
  "text/markdown": "Markdown Document",
  "application/javascript": "JavaScript File",
  "text/javascript": "JavaScript File",
  "application/typescript": "TypeScript File",
  "text/typescript": "TypeScript File",
  "application/yaml": "YAML File",
  "text/yaml": "YAML File",
  "image/svg+xml": "SVG Image",
  "application/rtf": "RTF Document",
  "text/rtf": "RTF Document",
  "application/zip": "ZIP Archive",
  "application/gzip": "GZip Archive",
};

/** Binary MIME type prefixes that cannot be meaningfully extracted as text. */
const BINARY_MIME_PREFIXES = ["image/", "audio/", "video/"];

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class FileSummarizationService {
  private readonly provider: string;
  private readonly model: string;

  constructor(options?: FileSummarizationServiceOptions) {
    this.provider = options?.provider ?? "vertex";
    this.model = options?.model ?? "gemini-2.5-flash";
  }

  // -------------------------------------------------------------------------
  // Text extraction
  // -------------------------------------------------------------------------

  /**
   * Extract readable text from a file's content.
   *
   * - Strings are returned as-is.
   * - Buffers are decoded as UTF-8 when the MIME type is textual.
   * - Known-binary types (image/*, audio/*, video/*) return a placeholder.
   */
  extractFileText(
    content: string | Buffer,
    mimeType: string,
    fileName: string,
  ): string {
    // String content — already text
    if (typeof content === "string") {
      return content;
    }

    // Binary MIME types → placeholder
    const isBinary = BINARY_MIME_PREFIXES.some((prefix) =>
      mimeType.startsWith(prefix),
    );
    if (isBinary) {
      return `[Binary file: ${fileName} (${mimeType}, ${content.length} bytes)]`;
    }

    // Buffer with text-like MIME → decode as UTF-8
    try {
      return content.toString("utf-8");
    } catch {
      return `[Binary file: ${fileName} (${mimeType}, ${content.length} bytes)]`;
    }
  }

  // -------------------------------------------------------------------------
  // MIME → label
  // -------------------------------------------------------------------------

  /**
   * Map a MIME type (and filename for fallback) to a human-readable label.
   */
  getFileTypeLabel(mimeType: string, fileName: string): string {
    // Direct lookup
    if (MIME_LABEL_MAP[mimeType]) {
      return MIME_LABEL_MAP[mimeType];
    }

    // Extension-based fallback
    const ext = fileName.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "ts":
      case "tsx":
        return "TypeScript File";
      case "js":
      case "jsx":
        return "JavaScript File";
      case "py":
        return "Python File";
      case "java":
        return "Java File";
      case "go":
        return "Go File";
      case "rs":
        return "Rust File";
      case "rb":
        return "Ruby File";
      case "php":
        return "PHP File";
      case "c":
      case "h":
        return "C File";
      case "cpp":
      case "hpp":
      case "cc":
        return "C++ File";
      case "cs":
        return "C# File";
      case "swift":
        return "Swift File";
      case "kt":
        return "Kotlin File";
      case "md":
        return "Markdown Document";
      case "yaml":
      case "yml":
        return "YAML File";
      case "toml":
        return "TOML File";
      case "ini":
      case "cfg":
        return "Config File";
      case "sh":
      case "bash":
        return "Shell Script";
      case "sql":
        return "SQL File";
      case "csv":
        return "CSV File";
      case "json":
        return "JSON File";
      case "xml":
        return "XML File";
      case "html":
      case "htm":
        return "HTML Document";
      default:
        return "File";
    }
  }

  // -------------------------------------------------------------------------
  // Preparation
  // -------------------------------------------------------------------------

  /**
   * Convert an array of raw file inputs into `FileForSummarization` objects.
   *
   * Extracts text and estimates token count for each file.
   */
  prepareFilesForSummarization(
    files: RawFileInput[],
    provider?: string,
  ): FileForSummarization[] {
    const effectiveProvider = provider ?? this.provider;

    return files.map((file) => {
      const text = this.extractFileText(
        file.content,
        file.mimeType,
        file.fileName,
      );
      const estimatedTokens = estimateTokens(text, effectiveProvider);
      const fileType = this.getFileTypeLabel(file.mimeType, file.fileName);

      return {
        fileName: file.fileName,
        fileType,
        content: text,
        estimatedTokens,
        mimeType: file.mimeType,
        originalSize: file.originalSize,
      };
    });
  }

  // -------------------------------------------------------------------------
  // Summarization
  // -------------------------------------------------------------------------

  /**
   * Summarize files that exceed the context budget.
   *
   * For each file marked "summarize" by `planFileSummarization()`, we call
   * the configured LLM to produce a context-aware summary. If the LLM call
   * fails, we fall back to naive truncation so the request can still proceed.
   */
  async summarizeFiles(
    files: FileForSummarization[],
    userPrompt: string,
    budgetParams: FileSummarizationCheckParams,
  ): Promise<SummarizedFile[]> {
    const plan = planFileSummarization(files, budgetParams);
    const results: SummarizedFile[] = [];

    for (const entry of plan) {
      if (entry.action === "keep") {
        results.push({
          fileName: entry.file.fileName,
          fileType: entry.file.fileType,
          summary: entry.file.content,
          originalTokens: entry.file.estimatedTokens,
          summaryTokens: entry.file.estimatedTokens,
          wasSummarized: false,
        });
        continue;
      }

      // Action is "summarize"
      const targetTokens = entry.targetTokens ?? 2000;

      try {
        // Dynamic import to avoid circular dependency
        const { NeuroLink } = await import("../neurolink.js");
        const summarizer = new NeuroLink();

        const prompt = buildFileSummarizationPrompt({
          fileName: entry.file.fileName,
          fileType: entry.file.fileType,
          fileContent: entry.file.content,
          userPrompt,
          targetTokens,
        });
        const result = await summarizer.generate({
          input: { text: prompt },
          provider: this.provider,
          model: this.model,
        });

        const summaryText =
          typeof result === "string" ? result : (result?.content ?? "");

        const summaryTokens = estimateTokens(
          summaryText,
          budgetParams.provider,
        );

        results.push({
          fileName: entry.file.fileName,
          fileType: entry.file.fileType,
          summary: summaryText,
          originalTokens: entry.file.estimatedTokens,
          summaryTokens,
          wasSummarized: true,
        });
      } catch {
        // Fallback: naive truncation
        const { truncateToTokenBudget } = await import(
          "../utils/tokenEstimation.js"
        );
        const { text: truncated } = truncateToTokenBudget(
          entry.file.content,
          targetTokens,
          budgetParams.provider,
        );
        const summaryTokens = estimateTokens(truncated, budgetParams.provider);

        results.push({
          fileName: entry.file.fileName,
          fileType: entry.file.fileType,
          summary: truncated,
          originalTokens: entry.file.estimatedTokens,
          summaryTokens,
          wasSummarized: true,
        });
      }
    }

    return results;
  }
}
