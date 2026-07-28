/**
 * Semantic Chunker
 *
 * LLM-powered semantic chunking that groups related content together.
 * Uses embedding similarity to determine natural breakpoints.
 * Best for complex documents where meaning should drive segmentation.
 */

import { randomUUID } from "crypto";
import { ProviderFactory } from "../../factories/providerFactory.js";
import { logger } from "../../utils/logger.js";
import type {
  BaseChunkerConfig,
  Chunk,
  Chunker,
  ChunkerValidationResult,
  SemanticChunkerConfig,
} from "../../types/index.js";

/**
 * Semantic chunker implementation
 * Uses embedding similarity to find natural content boundaries
 */
export class SemanticChunker implements Chunker {
  readonly strategy = "semantic" as const;

  async chunk(text: string, config?: SemanticChunkerConfig): Promise<Chunk[]> {
    const {
      maxSize = 1000,
      overlap = 0,
      joinThreshold = 100,
      modelName = "text-embedding-3-small",
      provider = "openai",
      similarityThreshold = 0.7,
      trimWhitespace = true,
      metadata = {},
    } = config || {};

    const documentId = randomUUID();
    const chunks: Chunk[] = [];

    if (!text || text.length === 0) {
      return chunks;
    }

    // First, split into initial segments (paragraphs or sentences)
    const segments = this.splitIntoSegments(text, joinThreshold);

    if (segments.length <= 1) {
      // Single segment, no need for semantic analysis
      chunks.push({
        id: randomUUID(),
        text: trimWhitespace ? text.trim() : text,
        metadata: {
          documentId,
          chunkIndex: 0,
          totalChunks: 1,
          startPosition: 0,
          endPosition: text.length,
          documentType: "text",
          custom: metadata,
        },
      });
      return chunks;
    }

    try {
      // Get embeddings for each segment
      const embeddings = await this.getEmbeddings(
        segments,
        provider,
        modelName,
      );

      // Find semantic breakpoints
      const breakpoints = this.findSemanticBreakpoints(
        embeddings,
        similarityThreshold,
      );

      // Group segments by semantic similarity
      const groups = this.groupSegments(segments, breakpoints, maxSize);

      // Create chunks from groups
      let chunkIndex = 0;
      let currentPosition = 0;

      for (const group of groups) {
        const chunkText = group.join("\n\n");
        const finalText = trimWhitespace ? chunkText.trim() : chunkText;

        if (finalText.length > 0) {
          chunks.push({
            id: randomUUID(),
            text: finalText,
            metadata: {
              documentId,
              chunkIndex,
              startPosition: currentPosition,
              endPosition: currentPosition + chunkText.length,
              documentType: "text",
              custom: {
                ...metadata,
                segmentCount: group.length,
              },
            },
          });
          chunkIndex++;
        }

        currentPosition += chunkText.length + 2; // +2 for separator
      }

      // Handle overlap if configured
      if (overlap > 0) {
        chunks.forEach((chunk, i) => {
          if (i > 0) {
            // Add overlap from previous chunk
            const prevText = chunks[i - 1].text;
            const overlapText = prevText.slice(-overlap);
            chunk.text = overlapText + "\n" + chunk.text;
          }
        });
      }
    } catch (error) {
      // Fallback to simple chunking if embeddings fail
      logger.warn(
        "[SemanticChunker] Embedding failed, falling back to simple chunking",
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );

      return this.fallbackChunk(
        text,
        maxSize,
        overlap,
        documentId,
        metadata,
        trimWhitespace,
      );
    }

    // Update total chunks count
    chunks.forEach((chunk) => {
      chunk.metadata.totalChunks = chunks.length;
    });

    return chunks;
  }

  /**
   * Split text into initial segments for embedding
   */
  private splitIntoSegments(text: string, minSize: number): string[] {
    const segments: string[] = [];

    // Split by double newlines (paragraphs)
    const paragraphs = text.split(/\n\n+/);

    let currentSegment = "";

    for (const paragraph of paragraphs) {
      const trimmed = paragraph.trim();
      if (trimmed.length === 0) {
        continue;
      }

      if (currentSegment.length === 0) {
        currentSegment = trimmed;
      } else if (currentSegment.length + trimmed.length < minSize) {
        // Join small paragraphs
        currentSegment += "\n\n" + trimmed;
      } else {
        // Save current and start new
        if (currentSegment.length > 0) {
          segments.push(currentSegment);
        }
        currentSegment = trimmed;
      }
    }

    // Don't forget the last segment
    if (currentSegment.length > 0) {
      segments.push(currentSegment);
    }

    return segments;
  }

  /**
   * Get embeddings for segments
   */
  private async getEmbeddings(
    segments: string[],
    provider: string,
    modelName: string,
  ): Promise<number[][]> {
    const embeddingProvider = await ProviderFactory.createProvider(
      provider,
      modelName,
    );

    // Check if provider has embed method
    if (typeof embeddingProvider.embed !== "function") {
      throw new Error(`Provider ${provider} does not support embeddings`);
    }

    const embeddings: number[][] = [];

    // Process in batches to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < segments.length; i += batchSize) {
      const batch = segments.slice(i, i + batchSize);

      for (const segment of batch) {
        try {
          const embedding = await embeddingProvider.embed(segment);
          embeddings.push(embedding);
        } catch (error) {
          logger.warn("[SemanticChunker] Failed to embed segment", {
            error: error instanceof Error ? error.message : String(error),
          });
          // Use zero vector as fallback
          embeddings.push(new Array(1536).fill(0));
        }
      }
    }

    return embeddings;
  }

  /**
   * Find semantic breakpoints using cosine similarity
   */
  private findSemanticBreakpoints(
    embeddings: number[][],
    threshold: number,
  ): number[] {
    const breakpoints: number[] = [];

    for (let i = 1; i < embeddings.length; i++) {
      const similarity = this.cosineSimilarity(
        embeddings[i - 1],
        embeddings[i],
      );

      // If similarity is below threshold, it's a breakpoint
      if (similarity < threshold) {
        breakpoints.push(i);
      }
    }

    return breakpoints;
  }

  /**
   * Group segments based on breakpoints and size limits
   */
  private groupSegments(
    segments: string[],
    breakpoints: number[],
    maxSize: number,
  ): string[][] {
    const groups: string[][] = [];
    let currentGroup: string[] = [];
    let currentSize = 0;
    let breakpointIndex = 0;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const segmentSize = segment.length;

      // Check if we're at a breakpoint or exceeding size
      const isBreakpoint =
        breakpointIndex < breakpoints.length &&
        breakpoints[breakpointIndex] === i;

      if (
        (currentSize + segmentSize > maxSize && currentGroup.length > 0) ||
        (isBreakpoint && currentGroup.length > 0)
      ) {
        // Save current group
        groups.push(currentGroup);
        currentGroup = [];
        currentSize = 0;
      }

      if (isBreakpoint) {
        breakpointIndex++;
      }

      currentGroup.push(segment);
      currentSize += segmentSize;
    }

    // Don't forget the last group
    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }

    return groups;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  /**
   * Fallback to simple chunking when embeddings fail
   */
  private fallbackChunk(
    text: string,
    maxSize: number,
    overlap: number,
    documentId: string,
    metadata: Record<string, unknown>,
    trimWhitespace: boolean,
  ): Chunk[] {
    const effectiveMaxSize = Math.max(maxSize, 1);
    const effectiveOverlap = Math.min(
      Math.max(overlap, 0),
      effectiveMaxSize - 1,
    );

    const chunks: Chunk[] = [];
    let start = 0;
    let chunkIndex = 0;

    while (start < text.length) {
      let end = Math.min(start + effectiveMaxSize, text.length);

      // Try to break at paragraph boundary
      if (end < text.length) {
        const searchStart = Math.max(start, end - 200);
        const searchText = text.slice(searchStart, end);
        const paragraphBreak = searchText.lastIndexOf("\n\n");

        if (paragraphBreak > 0) {
          end = searchStart + paragraphBreak;
        }
      }

      const chunkText = text.slice(start, end);
      const finalText = trimWhitespace ? chunkText.trim() : chunkText;

      if (finalText.length > 0) {
        chunks.push({
          id: randomUUID(),
          text: finalText,
          metadata: {
            documentId,
            chunkIndex,
            startPosition: start,
            endPosition: end,
            documentType: "text",
            custom: {
              ...metadata,
              fallbackChunking: true,
            },
          },
        });
        chunkIndex++;
      }

      start = Math.max(start + 1, end - effectiveOverlap);
    }

    return chunks;
  }

  validateConfig(config: BaseChunkerConfig): ChunkerValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const semConfig = config as SemanticChunkerConfig;

    if (semConfig.maxSize !== undefined && semConfig.maxSize <= 0) {
      errors.push("maxSize must be greater than 0");
    }

    if (semConfig.overlap !== undefined && semConfig.overlap < 0) {
      errors.push("overlap must be non-negative");
    }

    if (
      semConfig.overlap !== undefined &&
      semConfig.maxSize !== undefined &&
      semConfig.overlap >= semConfig.maxSize
    ) {
      errors.push("overlap must be less than maxSize");
    }

    if (semConfig.similarityThreshold !== undefined) {
      if (
        semConfig.similarityThreshold < 0 ||
        semConfig.similarityThreshold > 1
      ) {
        errors.push("similarityThreshold must be between 0 and 1");
      }
    }

    if (semConfig.joinThreshold !== undefined && semConfig.joinThreshold < 0) {
      errors.push("joinThreshold must be non-negative");
    }

    warnings.push(
      "Semantic chunking requires an embedding provider. Ensure API credentials are configured.",
    );

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
