/**
 * Recursive Chunker
 *
 * Recursively splits text using an ordered list of separators.
 * Tries each separator in order until chunks are small enough.
 */

import type {
  Chunk,
  ChunkerConfig,
  ChunkingStrategy,
  RecursiveChunkerConfig,
} from "../types.js";
import { BaseChunker, DEFAULT_CHUNKER_CONFIG } from "./BaseChunker.js";

/**
 * Default separators for recursive splitting
 */
const DEFAULT_SEPARATORS = ["\n\n", "\n", ". ", " ", ""];

/**
 * Recursive Chunker
 *
 * Splits content using ordered separators, recursively breaking
 * down text until chunks meet size requirements.
 */
export class RecursiveChunker extends BaseChunker {
  readonly strategy: ChunkingStrategy = "recursive";

  getDefaultConfig(): ChunkerConfig {
    return {
      ...DEFAULT_CHUNKER_CONFIG,
      maxSize: 1000,
      overlap: 100,
      separators: DEFAULT_SEPARATORS,
    };
  }

  protected async doChunk(
    content: string,
    config: ChunkerConfig,
  ): Promise<Chunk[]> {
    const recursiveConfig = config as RecursiveChunkerConfig;
    const maxSize = config.maxSize ?? 1000;
    const overlap = config.overlap ?? 100;
    const separators = recursiveConfig.separators ?? DEFAULT_SEPARATORS;
    const keepSeparators = recursiveConfig.keepSeparators ?? true;

    const chunks: Chunk[] = [];
    let offset = 0;

    const textChunks = this.recursiveSplit(
      content,
      separators,
      maxSize,
      overlap,
      keepSeparators,
    );

    for (let i = 0; i < textChunks.length; i++) {
      const text = textChunks[i];
      if (!text) {
        continue;
      }
      const startOffset = content.indexOf(text, offset);
      const endOffset = startOffset + text.length;

      chunks.push(this.createChunk(text, i, startOffset, endOffset));

      offset = Math.max(offset, startOffset + 1);
    }

    return chunks;
  }

  /**
   * Recursively split text using separators
   */
  private recursiveSplit(
    text: string,
    separators: string[],
    maxSize: number,
    overlap: number,
    keepSeparators: boolean,
  ): string[] {
    if (text.length <= maxSize) {
      return [text];
    }

    // Find the first separator that exists in the text
    let separator = "";
    for (const sep of separators) {
      if (sep === "" || text.includes(sep)) {
        separator = sep;
        break;
      }
    }

    // If no separator found or empty separator, split by size
    if (separator === "") {
      const result: string[] = [];
      let start = 0;
      while (start < text.length) {
        const end = Math.min(start + maxSize, text.length);
        result.push(text.slice(start, end));
        const previousStart = start;
        start = end - overlap;
        if (start <= previousStart) {
          start = previousStart + 1;
        }
        if (start >= text.length) {
          break;
        }
      }
      return result;
    }

    // Split by separator
    const parts = text.split(separator);
    const result: string[] = [];
    let currentChunk = "";

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const addSeparator = keepSeparators && i < parts.length - 1;
      const toAdd = part + (addSeparator ? separator : "");

      if (currentChunk.length + toAdd.length <= maxSize) {
        currentChunk += toAdd;
      } else {
        // Current chunk is full
        if (currentChunk.length > 0) {
          result.push(currentChunk);
        }

        // If the part itself is too large, recursively split it
        if (toAdd.length > maxSize) {
          const remainingSeparators = separators.slice(
            separators.indexOf(separator) + 1,
          );
          const subChunks = this.recursiveSplit(
            toAdd,
            remainingSeparators,
            maxSize,
            overlap,
            keepSeparators,
          );
          result.push(...subChunks);
          currentChunk = "";
        } else {
          currentChunk = toAdd;
        }
      }
    }

    if (currentChunk.length > 0) {
      result.push(currentChunk);
    }

    // Apply overlap between chunks
    if (overlap > 0 && result.length > 1) {
      return this.applyOverlap(result, overlap);
    }

    return result;
  }

  /**
   * Apply overlap between chunks
   */
  private applyOverlap(chunks: string[], overlap: number): string[] {
    if (chunks.length <= 1) {
      return chunks;
    }

    const result: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      let chunk = chunks[i] ?? "";

      // Add overlap from previous chunk
      const prevChunk = i > 0 ? chunks[i - 1] : undefined;
      if (prevChunk) {
        const overlapText = prevChunk.slice(
          -Math.min(overlap, prevChunk.length),
        );
        chunk = overlapText + chunk;
      }

      result.push(chunk);
    }

    return result;
  }
}
