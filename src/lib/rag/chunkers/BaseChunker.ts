/**
 * Base Chunker
 *
 * Abstract base class for all chunker implementations.
 * Provides common functionality and interface contract.
 */

import { randomUUID } from "node:crypto";
import { ChunkingError, RAGErrorCodes } from "../errors/RAGError.js";
import type {
  Chunk,
  Chunker,
  ChunkerConfig,
  ChunkingStrategy,
  ChunkMetadata,
} from "../../types/index.js";
import { withSpan } from "../../telemetry/withSpan.js";
import { tracers } from "../../telemetry/tracers.js";

/**
 * Default chunker configuration
 */
export const DEFAULT_CHUNKER_CONFIG: ChunkerConfig = {
  maxSize: 1000,
  overlap: 100,
  minSize: 10,
  preserveMetadata: true,
};

/**
 * Base Chunker abstract class
 *
 * All chunker implementations should extend this class.
 */
export abstract class BaseChunker implements Chunker {
  abstract readonly strategy: ChunkingStrategy;
  protected config: ChunkerConfig;

  constructor(config?: ChunkerConfig) {
    this.config = { ...this.getDefaultConfig(), ...config };
    this.validateConfig();
  }

  /**
   * Get default configuration for this chunker
   */
  getDefaultConfig(): ChunkerConfig {
    return { ...DEFAULT_CHUNKER_CONFIG };
  }

  /**
   * Validate chunker configuration
   */
  protected validateConfig(): void {
    if (this.config.maxSize !== undefined && this.config.maxSize <= 0) {
      throw new ChunkingError("maxSize must be positive", {
        code: RAGErrorCodes.CHUNKING_INVALID_CONFIG,
        details: { maxSize: this.config.maxSize },
      });
    }

    if (this.config.overlap !== undefined && this.config.overlap < 0) {
      throw new ChunkingError("overlap cannot be negative", {
        code: RAGErrorCodes.CHUNKING_INVALID_CONFIG,
        details: { overlap: this.config.overlap },
      });
    }

    if (
      this.config.maxSize !== undefined &&
      this.config.overlap !== undefined &&
      this.config.overlap >= this.config.maxSize
    ) {
      throw new ChunkingError("overlap must be less than maxSize", {
        code: RAGErrorCodes.CHUNKING_INVALID_CONFIG,
        details: {
          maxSize: this.config.maxSize,
          overlap: this.config.overlap,
        },
      });
    }
  }

  /**
   * Chunk content into smaller pieces
   */
  async chunk(content: string, config?: ChunkerConfig): Promise<Chunk[]> {
    return withSpan(
      {
        name: "neurolink.rag.chunk",
        tracer: tracers.rag,
        attributes: {
          "rag.chunker.strategy": this.strategy,
          "rag.chunker.content_chars": content.length,
          "rag.chunker.content_bytes": Buffer.byteLength(content, "utf8"),
        },
      },
      async (span) => {
        const effectiveConfig = { ...this.config, ...config };

        if (!content || content.trim().length === 0) {
          throw new ChunkingError("Content is empty", {
            code: RAGErrorCodes.CHUNKING_EMPTY_CONTENT,
            strategy: this.strategy,
            contentLength: 0,
          });
        }

        try {
          const chunks = await this.doChunk(content, effectiveConfig);
          const result = this.filterChunks(chunks, effectiveConfig);
          span.setAttribute("rag.chunker.chunk_count", result.length);
          return result;
        } catch (error) {
          if (error instanceof ChunkingError) {
            throw error;
          }
          throw new ChunkingError(
            `Chunking failed: ${error instanceof Error ? error.message : String(error)}`,
            {
              code: RAGErrorCodes.CHUNKING_ERROR,
              cause: error instanceof Error ? error : undefined,
              strategy: this.strategy,
              contentLength: content.length,
            },
          );
        }
      },
    ); // end withSpan
  }

  /**
   * Perform the actual chunking (to be implemented by subclasses)
   */
  protected abstract doChunk(
    content: string,
    config: ChunkerConfig,
  ): Promise<Chunk[]>;

  /**
   * Filter chunks based on minimum size
   */
  protected filterChunks(chunks: Chunk[], config: ChunkerConfig): Chunk[] {
    const minSize = config.minSize ?? 0;
    return chunks.filter((chunk) => chunk.text.length >= minSize);
  }

  /**
   * Create a chunk object
   */
  protected createChunk(
    text: string,
    chunkIndex: number,
    startPosition: number,
    endPosition: number,
    documentId: string = "unknown",
    customMetadata?: Record<string, unknown>,
  ): Chunk {
    const metadata: ChunkMetadata = {
      documentId,
      chunkIndex,
      startPosition,
      endPosition,
      custom: this.config.preserveMetadata ? customMetadata : undefined,
    };

    return {
      id: randomUUID(),
      text,
      metadata,
    };
  }

  /**
   * Split content by size with overlap
   */
  protected splitBySizeWithOverlap(
    content: string,
    maxSize: number,
    overlap: number,
  ): Array<{ text: string; start: number; end: number }> {
    const result: Array<{ text: string; start: number; end: number }> = [];
    let start = 0;

    while (start < content.length) {
      const end = Math.min(start + maxSize, content.length);
      result.push({
        text: content.slice(start, end),
        start,
        end,
      });

      // If we've reached the end of content, stop
      if (end >= content.length) {
        break;
      }

      // Move start position, accounting for overlap
      // Ensure start always moves forward by at least 1 character
      const nextStart = end - overlap;
      start = Math.max(nextStart, start + 1);

      // Prevent infinite loop if overlap >= chunk size
      if (start >= end) {
        break;
      }
    }

    return result;
  }
}
