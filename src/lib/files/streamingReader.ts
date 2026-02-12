/**
 * Streaming File Reader
 *
 * Reads files with token-budget awareness using Node.js streams.
 * Memory usage is proportional to what's returned, not what's on disk.
 *
 * Inspired by Kilocode's token-budget streaming reader pattern:
 * uses createReadStream + readline, counts tokens per line,
 * stops when budget is exhausted.
 *
 * @example
 * ```typescript
 * // Read lines 100-200 of a large file with a 5000 token budget
 * const result = await StreamingReader.readLines('/path/to/file.csv', {
 *   startLine: 100,
 *   endLine: 200,
 *   tokenBudget: 5000,
 *   provider: 'anthropic',
 * });
 * // result.content = "line 100 content\nline 101 content\n..."
 * // result.truncated = true if budget was hit before line 200
 * ```
 */

import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createInterface } from "node:readline";
import { CHARS_PER_TOKEN, estimateTokens } from "../utils/tokenEstimation.js";
import type {
  FileReadResult,
  FileSearchMatch,
  FileSearchResult,
  StreamingReaderOptions,
} from "./types.js";

/** Default token budget if none specified */
const DEFAULT_TOKEN_BUDGET = 50_000;

/** Maximum context lines before/after a search match */
const DEFAULT_SEARCH_CONTEXT = 3;

/** Maximum search matches to return */
const DEFAULT_MAX_MATCHES = 50;

/**
 * Streaming file reader with token-budget-aware line reading.
 *
 * All methods use Node.js streams to avoid loading entire files into memory.
 * A 2GB CSV file: only the requested lines/matches are read from disk.
 */
export class StreamingReader {
  /**
   * Read lines from a file with a token budget.
   *
   * Uses createReadStream + readline for memory-efficient reading.
   * Stops reading when the token budget is exhausted or endLine is reached.
   *
   * @param filePath - Absolute path to the file
   * @param options - Reading options (startLine, endLine, tokenBudget, provider)
   * @returns FileReadResult with content, line info, and truncation status
   */
  static async readLines(
    filePath: string,
    options: StreamingReaderOptions = {},
  ): Promise<FileReadResult> {
    const {
      tokenBudget = DEFAULT_TOKEN_BUDGET,
      startLine = 1,
      endLine,
      encoding = "utf-8",
      provider,
    } = options;

    // Validate file exists
    await stat(filePath);

    const lines: string[] = [];
    let currentLine = 0;
    let totalLines = 0;
    let usedTokens = 0;
    let truncated = false;
    const actualStartLine = startLine;
    let actualEndLine = startLine;

    const readStream = createReadStream(filePath, { encoding });
    const rl = createInterface({
      input: readStream,
      crlfDelay: Infinity,
    });

    try {
      for await (const line of rl) {
        currentLine++;
        totalLines = currentLine;

        // Skip lines before startLine
        if (currentLine < startLine) {
          continue;
        }

        // Stop at endLine if specified
        if (endLine !== undefined && currentLine > endLine) {
          break;
        }

        // Estimate tokens for this line (include newline char)
        const lineTokens = Math.ceil((line.length + 1) / CHARS_PER_TOKEN);

        // Check if adding this line would exceed budget
        if (usedTokens + lineTokens > tokenBudget && lines.length > 0) {
          truncated = true;
          break;
        }

        lines.push(line);
        usedTokens += lineTokens;
        actualEndLine = currentLine;

        // Apply provider multiplier periodically (every 100 lines) for efficiency
        if (lines.length % 100 === 0) {
          const adjustedTokens = estimateTokens(lines.join("\n"), provider);
          if (adjustedTokens > tokenBudget) {
            truncated = true;
            break;
          }
        }
      }
    } finally {
      rl.close();
      readStream.destroy();
    }

    // If we didn't reach EOF, count remaining lines
    if (truncated || (endLine !== undefined && currentLine <= (endLine || 0))) {
      // We need total line count — do a quick count of remaining lines
      if (!truncated && !endLine) {
        // Already counted all lines
      } else {
        totalLines = await StreamingReader.countLines(filePath, encoding);
      }
    }

    const content = lines.join("\n");
    const estimatedTokensFinal = estimateTokens(content, provider);

    return {
      content,
      startLine: actualStartLine,
      endLine: actualEndLine,
      totalLines,
      truncated,
      estimatedTokens: estimatedTokensFinal,
    };
  }

  /**
   * Count total lines in a file without reading entire content into memory.
   *
   * @param filePath - Absolute path to the file
   * @param encoding - File encoding (default: utf-8)
   * @returns Total line count
   */
  static async countLines(
    filePath: string,
    encoding: BufferEncoding = "utf-8",
  ): Promise<number> {
    let count = 0;
    const readStream = createReadStream(filePath, { encoding });
    const rl = createInterface({
      input: readStream,
      crlfDelay: Infinity,
    });

    try {
      for await (const _line of rl) {
        count++;
      }
    } finally {
      rl.close();
      readStream.destroy();
    }

    return count;
  }

  /**
   * Search for a pattern within a file, returning matching lines with context.
   *
   * Uses streaming to avoid loading the entire file into memory.
   * Returns up to maxMatches results, each with contextBefore/contextAfter lines.
   *
   * @param filePath - Absolute path to the file
   * @param pattern - Regex pattern or string to search for
   * @param options - Search options
   * @returns FileSearchResult with matches, total count, and truncation status
   */
  static async searchInFile(
    filePath: string,
    pattern: string | RegExp,
    options: {
      maxMatches?: number;
      contextLines?: number;
      encoding?: BufferEncoding;
    } = {},
  ): Promise<FileSearchResult> {
    const {
      maxMatches = DEFAULT_MAX_MATCHES,
      contextLines = DEFAULT_SEARCH_CONTEXT,
      encoding = "utf-8",
    } = options;

    // Validate file exists
    await stat(filePath);

    const regex =
      pattern instanceof RegExp
        ? pattern
        : new RegExp(StreamingReader.escapeRegex(pattern), "i");

    const matches: FileSearchMatch[] = [];
    let totalMatches = 0;
    let truncated = false;

    // Ring buffer for context-before lines
    const contextBuffer: string[] = [];
    let currentLine = 0;

    // Track lines already captured as context-after for previous matches
    // to avoid re-processing
    let pendingContextAfter: {
      match: FileSearchMatch;
      remaining: number;
    } | null = null;

    const readStream = createReadStream(filePath, { encoding });
    const rl = createInterface({
      input: readStream,
      crlfDelay: Infinity,
    });

    try {
      for await (const line of rl) {
        currentLine++;

        // Fill context-after for previous match
        if (pendingContextAfter && pendingContextAfter.remaining > 0) {
          pendingContextAfter.match.contextAfter.push(line);
          pendingContextAfter.remaining--;
          if (pendingContextAfter.remaining === 0) {
            pendingContextAfter = null;
          }
        }

        // Test for match
        if (regex.test(line)) {
          totalMatches++;

          if (matches.length < maxMatches) {
            const match: FileSearchMatch = {
              lineNumber: currentLine,
              line,
              contextBefore: [...contextBuffer],
              contextAfter: [],
            };
            matches.push(match);

            // Set up context-after collection
            if (contextLines > 0) {
              pendingContextAfter = {
                match,
                remaining: contextLines,
              };
            }
          } else {
            truncated = true;
            // Continue counting total matches but don't store details
          }
        }

        // Update context buffer (ring buffer for before-context)
        contextBuffer.push(line);
        if (contextBuffer.length > contextLines) {
          contextBuffer.shift();
        }
      }
    } finally {
      rl.close();
      readStream.destroy();
    }

    return {
      matches,
      totalMatches,
      truncated,
    };
  }

  /**
   * Read a preview of a file (first N characters / lines).
   *
   * Optimized for speed: reads only the first chunk of the file.
   *
   * @param filePath - Absolute path to the file
   * @param maxChars - Maximum characters to return (default: 2000)
   * @param encoding - File encoding (default: utf-8)
   * @returns Preview string
   */
  static async readPreview(
    filePath: string,
    maxChars: number = 2000,
    encoding: BufferEncoding = "utf-8",
  ): Promise<string> {
    // For preview, read a small chunk directly — no need for line-by-line
    const readStream = createReadStream(filePath, {
      encoding,
      start: 0,
      end: maxChars + 100, // Read a bit extra to avoid cutting mid-line
    });

    let content = "";

    try {
      for await (const chunk of readStream) {
        content += chunk;
        if (content.length >= maxChars) {
          break;
        }
      }
    } finally {
      readStream.destroy();
    }

    // Truncate to maxChars, preferring to break at line boundary
    if (content.length > maxChars) {
      const lastNewline = content.lastIndexOf("\n", maxChars);
      if (lastNewline > maxChars * 0.8) {
        content = content.substring(0, lastNewline);
      } else {
        content = content.substring(0, maxChars);
      }
    }

    return content;
  }

  /**
   * Read a file from a Buffer with line range and token budget.
   *
   * For files already in memory (e.g., from URL download or Buffer input).
   * Does NOT use streams — the buffer is already in memory.
   *
   * @param buffer - File content as Buffer
   * @param options - Reading options
   * @returns FileReadResult
   */
  static readFromBuffer(
    buffer: Buffer,
    options: StreamingReaderOptions = {},
  ): FileReadResult {
    const {
      tokenBudget = DEFAULT_TOKEN_BUDGET,
      startLine = 1,
      endLine,
      encoding = "utf-8",
      provider,
    } = options;

    const text = buffer.toString(encoding);
    const allLines = text.split("\n");
    const totalLines = allLines.length;

    const start = Math.max(0, startLine - 1); // Convert to 0-indexed
    const end =
      endLine !== undefined ? Math.min(endLine, totalLines) : totalLines;

    let usedTokens = 0;
    let truncated = false;
    const lines: string[] = [];

    for (let i = start; i < end; i++) {
      const line = allLines[i];
      const lineTokens = Math.ceil((line.length + 1) / CHARS_PER_TOKEN);

      if (usedTokens + lineTokens > tokenBudget && lines.length > 0) {
        truncated = true;
        break;
      }

      lines.push(line);
      usedTokens += lineTokens;
    }

    const content = lines.join("\n");
    const estimatedTokensFinal = estimateTokens(content, provider);

    return {
      content,
      startLine,
      endLine: start + lines.length,
      totalLines,
      truncated,
      estimatedTokens: estimatedTokensFinal,
    };
  }

  /**
   * Escape a string for use in a regular expression.
   */
  private static escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}
