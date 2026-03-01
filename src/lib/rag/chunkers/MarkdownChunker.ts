/**
 * Markdown Chunker
 *
 * Splits markdown content by headers and structural elements.
 * Preserves markdown tables by detecting table boundaries and splitting
 * on row boundaries when a table exceeds the max chunk size.
 */

import type { Chunk, ChunkerConfig, ChunkingStrategy } from "../types.js";
import { BaseChunker, DEFAULT_CHUNKER_CONFIG } from "./BaseChunker.js";

/** Matches a markdown table separator row like |---|---| or |:--:|---:| */
const TABLE_SEPARATOR_RE = /^\|[\s:]*-+[\s:]*(\|[\s:]*-+[\s:]*)*\|?\s*$/;

/** Matches a line that looks like a table row (starts with |) */
const TABLE_ROW_RE = /^\|.+\|?\s*$/;

/**
 * Detect contiguous table blocks in text.
 * Returns an array of { start, end } line index ranges (inclusive).
 * A table is a sequence of lines where the second line is a separator.
 */
function detectTableRanges(
  lines: string[],
): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = [];
  let i = 0;

  while (i < lines.length) {
    // A table needs at least a header row + separator
    if (
      i + 1 < lines.length &&
      TABLE_ROW_RE.test(lines[i]!) &&
      TABLE_SEPARATOR_RE.test(lines[i + 1]!)
    ) {
      const start = i;
      // Advance past header + separator
      i += 2;
      // Consume remaining data rows
      while (i < lines.length && TABLE_ROW_RE.test(lines[i]!)) {
        i++;
      }
      ranges.push({ start, end: i - 1 });
    } else {
      i++;
    }
  }

  return ranges;
}

/**
 * Markdown Chunker
 */
export class MarkdownChunker extends BaseChunker {
  readonly strategy: ChunkingStrategy = "markdown";

  getDefaultConfig(): ChunkerConfig {
    return {
      ...DEFAULT_CHUNKER_CONFIG,
      maxSize: 1000,
      overlap: 50,
    };
  }

  protected async doChunk(
    content: string,
    config: ChunkerConfig,
  ): Promise<Chunk[]> {
    const maxSize = config.maxSize ?? 1000;

    // Split by headers
    const headerPattern = /^(#{1,6})\s+(.+)$/gm;
    const sections: Array<{ header: string; content: string; level: number }> =
      [];
    let lastIndex = 0;
    let match: RegExpExecArray | null = headerPattern.exec(content);

    while (match !== null) {
      // Add content before this header
      if (match.index > lastIndex) {
        const prevContent = content.slice(lastIndex, match.index).trim();
        if (prevContent && sections.length > 0) {
          const lastSection = sections[sections.length - 1];
          if (lastSection) {
            lastSection.content += "\n\n" + prevContent;
          }
        } else if (prevContent) {
          sections.push({ header: "", content: prevContent, level: 0 });
        }
      }

      sections.push({
        header: match[0],
        content: "",
        level: match[1]?.length ?? 1,
      });
      lastIndex = match.index + match[0].length;
      match = headerPattern.exec(content);
    }

    // Add remaining content
    if (lastIndex < content.length) {
      const remaining = content.slice(lastIndex).trim();
      if (remaining) {
        if (sections.length > 0) {
          const lastSection = sections[sections.length - 1];
          if (lastSection) {
            lastSection.content += remaining;
          }
        } else {
          sections.push({ header: "", content: remaining, level: 0 });
        }
      }
    }

    // Convert sections to chunks
    const chunks: Chunk[] = [];
    let offset = 0;

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      if (!section) {
        continue;
      }
      const fullContent = section.header
        ? section.header + "\n\n" + section.content.trim()
        : section.content.trim();

      if (!fullContent) {
        continue;
      }

      // Split if too large — use table-aware splitting
      if (fullContent.length > maxSize) {
        const subChunks = this.splitContentTableAware(fullContent, maxSize);
        for (const sub of subChunks) {
          const startOffset = content.indexOf(sub, offset);
          chunks.push(
            this.createChunk(
              sub,
              chunks.length,
              startOffset >= 0 ? startOffset : offset,
              startOffset >= 0 ? startOffset + sub.length : offset + sub.length,
              "unknown",
              { sectionContext: section.header },
            ),
          );
          if (startOffset >= 0) {
            offset = startOffset + sub.length;
          }
        }
      } else {
        const startOffset = content.indexOf(fullContent, offset);
        chunks.push(
          this.createChunk(
            fullContent,
            chunks.length,
            startOffset >= 0 ? startOffset : offset,
            startOffset >= 0
              ? startOffset + fullContent.length
              : offset + fullContent.length,
            "unknown",
            { sectionContext: section.header },
          ),
        );
        if (startOffset >= 0) {
          offset = startOffset + fullContent.length;
        }
      }
    }

    return chunks;
  }

  /**
   * Split content while preserving markdown tables.
   *
   * Strategy:
   * 1. Identify table blocks in the content.
   * 2. Split content into segments: non-table text and table blocks.
   * 3. Non-table text is split using paragraph/sentence boundaries (existing logic).
   * 4. Tables that fit in a chunk are kept intact.
   * 5. Oversized tables are split on row boundaries, repeating the header row.
   */
  private splitContentTableAware(content: string, maxSize: number): string[] {
    const lines = content.split("\n");
    const tableRanges = detectTableRanges(lines);

    // If no tables, fall back to existing splitting logic
    if (tableRanges.length === 0) {
      return this.splitPlainContent(content, maxSize, this.config.overlap ?? 0);
    }

    // Build segments: alternating non-table and table blocks
    const segments: Array<{ text: string; isTable: boolean }> = [];
    let lineIdx = 0;

    for (const range of tableRanges) {
      // Non-table text before this table
      if (lineIdx < range.start) {
        const text = lines.slice(lineIdx, range.start).join("\n").trim();
        if (text) {
          segments.push({ text, isTable: false });
        }
      }
      // The table itself
      const tableText = lines.slice(range.start, range.end + 1).join("\n");
      segments.push({ text: tableText, isTable: true });
      lineIdx = range.end + 1;
    }

    // Trailing non-table text
    if (lineIdx < lines.length) {
      const text = lines.slice(lineIdx).join("\n").trim();
      if (text) {
        segments.push({ text, isTable: false });
      }
    }

    // Now produce chunks, trying to pack segments together up to maxSize
    const result: string[] = [];
    let current = "";

    for (const seg of segments) {
      if (!seg.isTable) {
        // Non-table text: try to append, split if needed
        const pieces = this.splitPlainContent(
          seg.text,
          maxSize,
          this.config.overlap ?? 0,
        );
        for (const piece of pieces) {
          if (current.length === 0) {
            current = piece;
          } else if (current.length + 1 + piece.length <= maxSize) {
            current += "\n" + piece;
          } else {
            result.push(current);
            current = piece;
          }
        }
      } else {
        // Table block
        if (seg.text.length <= maxSize) {
          // Table fits — try to append to current chunk
          if (current.length === 0) {
            current = seg.text;
          } else if (current.length + 2 + seg.text.length <= maxSize) {
            current += "\n\n" + seg.text;
          } else {
            result.push(current);
            current = seg.text;
          }
        } else {
          // Oversized table — flush current, then split table on row boundaries
          if (current) {
            result.push(current);
            current = "";
          }
          const tableChunks = this.splitTableByRows(seg.text, maxSize);
          result.push(...tableChunks);
        }
      }
    }

    if (current) {
      result.push(current);
    }

    return result.length > 0 ? result : [content];
  }

  /**
   * Split a table on row boundaries, repeating header + separator in each chunk.
   */
  private splitTableByRows(tableText: string, maxSize: number): string[] {
    const rows = tableText.split("\n");
    if (rows.length < 3) {
      // Not a proper table (need header + separator + at least 1 data row)
      return [tableText];
    }

    const headerRow = rows[0]!;
    const separatorRow = rows[1]!;
    const headerBlock = headerRow + "\n" + separatorRow;
    const dataRows = rows.slice(2);

    // If even the header doesn't fit, fall back to size-based split
    if (headerBlock.length > maxSize) {
      return this.splitPlainContent(
        tableText,
        maxSize,
        this.config.overlap ?? 0,
      );
    }

    const chunks: string[] = [];
    let currentChunk = headerBlock;

    for (const row of dataRows) {
      // Guard: single row exceeds budget — flush and emit as standalone chunk
      const singleRowChunk = `${headerBlock}\n${row}`;
      if (singleRowChunk.length > maxSize) {
        if (currentChunk.length > headerBlock.length) {
          chunks.push(currentChunk);
        }
        chunks.push(singleRowChunk);
        currentChunk = headerBlock;
        continue;
      }

      const candidate = currentChunk + "\n" + row;
      if (candidate.length <= maxSize) {
        currentChunk = candidate;
      } else {
        // Flush current chunk (skip if it only contains the header)
        if (currentChunk.length > headerBlock.length) {
          chunks.push(currentChunk);
        }
        // Start new chunk with header repeated
        currentChunk = headerBlock + "\n" + row;
      }
    }

    if (currentChunk.length > headerBlock.length) {
      chunks.push(currentChunk);
    }

    return chunks.length > 0 ? chunks : [tableText];
  }

  /**
   * Split non-table text using paragraph and sentence boundaries.
   * This is the original splitContent logic extracted for reuse.
   */
  private splitPlainContent(
    content: string,
    maxSize: number,
    overlap: number = 0,
  ): string[] {
    if (content.length <= maxSize) {
      return [content];
    }

    const chunks: string[] = [];
    let start = 0;

    while (start < content.length) {
      let end = Math.min(start + maxSize, content.length);

      if (end < content.length) {
        const searchStart = Math.max(start, end - 200);
        const searchText = content.slice(searchStart, end);

        // Look for paragraph break first
        const paragraphBreak = searchText.lastIndexOf("\n\n");
        if (paragraphBreak > 0) {
          end = searchStart + paragraphBreak;
        } else {
          // Look for sentence break
          const sentenceBreak = searchText.search(/[.!?]\s+[A-Z]/);
          if (sentenceBreak > 0) {
            end = searchStart + sentenceBreak + 1;
          }
        }
      }

      chunks.push(content.slice(start, end));
      start = Math.max(start + 1, end - overlap);
    }

    return chunks;
  }
}
