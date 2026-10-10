/**
 * HTML-aware Chunker
 *
 * Splits HTML documents based on tag structure while preserving semantics.
 * Best for web pages, email templates, and structured HTML content.
 */

import { randomUUID } from "crypto";
import { decodeHtmlTextEntitiesOnce } from "../../utils/htmlEntities.js";
import { removeHtmlMarkup } from "../../utils/htmlText.js";
import type {
  BaseChunkerConfig,
  Chunk,
  Chunker,
  ChunkerValidationResult,
  HTMLChunkerConfig,
} from "../../types/index.js";

/**
 * HTML-aware chunker implementation
 * Splits based on HTML structure (tags, elements)
 */
export class HTMLChunker implements Chunker {
  readonly strategy = "html" as const;

  private readonly defaultSplitTags = [
    "div",
    "p",
    "section",
    "article",
    "main",
    "aside",
    "header",
    "footer",
    "nav",
    "li",
    "tr",
    "td",
    "th",
  ];

  private readonly defaultPreserveTags = [
    "pre",
    "code",
    "table",
    "ul",
    "ol",
    "blockquote",
  ];

  async chunk(text: string, config?: HTMLChunkerConfig): Promise<Chunk[]> {
    const {
      maxSize = 1000,
      overlap = 0,
      splitTags = this.defaultSplitTags,
      preserveTags = this.defaultPreserveTags,
      extractTextOnly = false,
      includeTagMetadata = true,
      trimWhitespace = true,
      metadata = {},
    } = config || {};

    const documentId = randomUUID();
    const chunks: Chunk[] = [];

    if (!text || text.length === 0) {
      return chunks;
    }

    // Extract and split by structural tags
    const sections = this.splitByTags(text, splitTags, preserveTags);

    let chunkIndex = 0;
    let currentPosition = 0;

    for (const section of sections) {
      const { content, tagName, attributes } = section;

      // Process content
      let processedContent = content;

      if (extractTextOnly) {
        processedContent = this.extractText(content);
      }

      // Split if content is too large
      const contentChunks = this.splitContent(
        processedContent,
        maxSize,
        overlap,
      );

      for (const contentChunk of contentChunks) {
        const finalText = trimWhitespace ? contentChunk.trim() : contentChunk;

        if (finalText.length > 0) {
          const chunkMetadata: Record<string, unknown> = {
            ...metadata,
          };

          if (includeTagMetadata && tagName) {
            chunkMetadata.tagName = tagName;
            if (attributes && Object.keys(attributes).length > 0) {
              chunkMetadata.attributes = attributes;
            }
          }

          chunks.push({
            id: randomUUID(),
            text: finalText,
            metadata: {
              documentId,
              chunkIndex,
              startPosition: currentPosition,
              endPosition: currentPosition + contentChunk.length,
              documentType: "html",
              custom: chunkMetadata,
            },
          });
          chunkIndex++;
        }

        currentPosition += contentChunk.length;
      }
    }

    // Update total chunks count
    chunks.forEach((chunk) => {
      chunk.metadata.totalChunks = chunks.length;
    });

    return chunks;
  }

  /**
   * Split HTML by structural tags
   */
  private splitByTags(
    html: string,
    splitTags: string[],
    preserveTags: string[],
  ): Array<{
    content: string;
    tagName?: string;
    attributes?: Record<string, string>;
  }> {
    const sections: Array<{
      content: string;
      tagName?: string;
      attributes?: Record<string, string>;
    }> = [];

    // Create regex pattern for split tags
    const tagPattern = new RegExp(
      `<(${splitTags.join("|")})([^>]*)>([\\s\\S]*?)</\\1>`,
      "gi",
    );

    let lastIndex = 0;
    let match: RegExpExecArray | null;

    // Reset regex
    tagPattern.lastIndex = 0;

    while ((match = tagPattern.exec(html)) !== null) {
      // Content before this tag
      if (match.index > lastIndex) {
        const beforeContent = html.slice(lastIndex, match.index).trim();
        if (beforeContent.length > 0) {
          sections.push({
            content: beforeContent,
          });
        }
      }

      const tagName = match[1].toLowerCase();
      const attributeString = match[2];
      const innerContent = match[3];

      // Parse attributes
      const attributes = this.parseAttributes(attributeString);

      // Check if this tag should be preserved as a unit
      const shouldPreserve = preserveTags.some((pt) =>
        innerContent.toLowerCase().includes(`<${pt}`),
      );

      if (shouldPreserve) {
        // Keep the full tag content
        sections.push({
          content: match[0],
          tagName,
          attributes,
        });
      } else {
        // Just the inner content
        sections.push({
          content: innerContent,
          tagName,
          attributes,
        });
      }

      lastIndex = match.index + match[0].length;
    }

    // Don't forget content after the last tag
    if (lastIndex < html.length) {
      const remaining = html.slice(lastIndex).trim();
      if (remaining.length > 0) {
        sections.push({
          content: remaining,
        });
      }
    }

    // If no tags found, return entire text as one section
    if (sections.length === 0 && html.trim()) {
      sections.push({
        content: html.trim(),
      });
    }

    return sections;
  }

  /**
   * Parse HTML attributes from string
   */
  private parseAttributes(attributeString: string): Record<string, string> {
    const attributes: Record<string, string> = {};
    const attrPattern = /(\w+)(?:=["']([^"']*?)["'])?/g;

    let match: RegExpExecArray | null;
    while ((match = attrPattern.exec(attributeString)) !== null) {
      const name = match[1];
      const value = match[2] || "";
      attributes[name] = value;
    }

    return attributes;
  }

  /**
   * Extract plain text from HTML
   */
  private extractText(html: string): string {
    return decodeHtmlTextEntitiesOnce(
      removeHtmlMarkup(html, {
        tagReplacement: "",
        commentReplacement: "",
        lineBreakEndTags: [
          "p",
          "div",
          "br",
          "h1",
          "h2",
          "h3",
          "h4",
          "h5",
          "h6",
          "li",
          "tr",
        ],
        lineBreakVoidTags: [],
      }),
      { nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', "#039": "'" },
    )
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Split content that exceeds max size
   */
  private splitContent(
    content: string,
    maxSize: number,
    overlap: number,
  ): string[] {
    const effectiveMaxSize = Math.max(maxSize, 1);
    const effectiveOverlap = Math.min(
      Math.max(overlap, 0),
      effectiveMaxSize - 1,
    );

    if (content.length <= effectiveMaxSize) {
      return [content];
    }

    const chunks: string[] = [];
    let start = 0;

    while (start < content.length) {
      let end = Math.min(start + effectiveMaxSize, content.length);

      // Try to break at a natural boundary
      if (end < content.length) {
        const searchStart = Math.max(start, end - 100);
        const searchText = content.slice(searchStart, end);

        // Look for paragraph/sentence break
        const breakMatch = searchText.match(/[.!?\n]\s+/);
        if (breakMatch && breakMatch.index !== undefined) {
          end = searchStart + breakMatch.index + 1;
        }
      }

      chunks.push(content.slice(start, end));
      start = Math.max(start + 1, end - effectiveOverlap);
    }

    return chunks;
  }

  validateConfig(config: BaseChunkerConfig): ChunkerValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const htmlConfig = config as HTMLChunkerConfig;

    if (htmlConfig.maxSize !== undefined && htmlConfig.maxSize <= 0) {
      errors.push("maxSize must be greater than 0");
    }

    if (htmlConfig.overlap !== undefined && htmlConfig.overlap < 0) {
      errors.push("overlap must be non-negative");
    }

    if (
      htmlConfig.overlap !== undefined &&
      htmlConfig.maxSize !== undefined &&
      htmlConfig.overlap >= htmlConfig.maxSize
    ) {
      errors.push("overlap must be less than maxSize");
    }

    if (
      htmlConfig.splitTags !== undefined &&
      htmlConfig.splitTags.length === 0
    ) {
      warnings.push("No split tags specified, using defaults");
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
