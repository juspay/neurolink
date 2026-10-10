/**
 * HTML Chunker
 *
 * Splits HTML content by semantic tags.
 */

import type {
  Chunk,
  ChunkerConfig,
  ChunkingStrategy,
} from "../../types/index.js";
import { removeHtmlMarkup } from "../../utils/htmlText.js";
import { BaseChunker, DEFAULT_CHUNKER_CONFIG } from "./BaseChunker.js";

/**
 * HTML Chunker
 */
export class HTMLChunker extends BaseChunker {
  readonly strategy: ChunkingStrategy = "html";

  getDefaultConfig(): ChunkerConfig {
    return {
      ...DEFAULT_CHUNKER_CONFIG,
      maxSize: 1000,
      overlap: 0,
    };
  }

  protected async doChunk(
    content: string,
    config: ChunkerConfig,
  ): Promise<Chunk[]> {
    const maxSize = config.maxSize ?? 1000;

    // Strip HTML tags for text content
    const textContent = this.stripHtml(content);

    // Use simple character-based splitting for now
    const segments = this.splitBySizeWithOverlap(textContent, maxSize, 0);

    return segments.map((segment, index) =>
      this.createChunk(segment.text, index, segment.start, segment.end),
    );
  }

  /**
   * Strip HTML tags from content
   */
  private stripHtml(html: string): string {
    return removeHtmlMarkup(html, {
      tagReplacement: " ",
      commentReplacement: " ",
      lineBreakEndTags: [],
      lineBreakVoidTags: [],
    })
      .replace(/\s+/g, " ")
      .trim();
  }
}
