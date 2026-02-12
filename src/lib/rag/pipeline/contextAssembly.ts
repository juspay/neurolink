/**
 * Context Assembly Utilities
 *
 * Provides utilities for assembling, formatting, and optimizing context
 * from retrieved chunks for LLM consumption.
 *
 * Features:
 * - Context window management (token-aware truncation)
 * - Citation formatting
 * - Context deduplication
 * - Relevance-based ordering
 * - Context summarization
 */

import type { Chunk, VectorQueryResult } from "../types.js";
import type {
  ContextAssemblyOptions,
  ContextWindow,
} from "../../types/ragTypes.js";
import { logger } from "../../utils/logger.js";

/**
 * Citation format options
 */
export type CitationFormat = "inline" | "footnote" | "numbered" | "none";

export type { ContextAssemblyOptions } from "../../types/ragTypes.js";
export type { ContextWindow } from "../../types/ragTypes.js";

/**
 * Assemble context from retrieved results
 *
 * Combines multiple chunks into a coherent context string
 * suitable for LLM consumption.
 *
 * @param results - Retrieved chunks or query results
 * @param options - Assembly options
 * @returns Assembled context string
 *
 * @example
 * ```typescript
 * const context = assembleContext(results, {
 *   maxTokens: 4000,
 *   citationFormat: 'numbered',
 *   deduplicate: true
 * });
 * ```
 */
export function assembleContext(
  results: Array<Chunk | VectorQueryResult>,
  options?: ContextAssemblyOptions,
): string {
  const {
    maxChars,
    maxTokens = 4000,
    citationFormat = "none",
    separator = "\n\n---\n\n",
    includeMetadata = false,
    deduplicate = false,
    dedupeThreshold = 0.8,
    orderByRelevance = true,
    includeSectionHeaders = false,
    headerTemplate = "[{index}] Source: {source}",
  } = options || {};

  if (results.length === 0) {
    return "";
  }

  // Convert to unified format
  let items = results.map((r, index) => ({
    id: "id" in r ? r.id : `chunk-${index}`,
    text: "text" in r ? r.text || "" : "",
    score: "score" in r ? r.score || 0 : 0,
    metadata: "metadata" in r ? r.metadata : {},
    index,
  }));

  // Get text from metadata if not directly available
  items = items.map((item) => ({
    ...item,
    text:
      item.text ||
      ((item.metadata as Record<string, unknown>)?.text as string) ||
      "",
  }));

  // Order by relevance if requested
  if (orderByRelevance) {
    items.sort((a, b) => b.score - a.score);
  }

  // Deduplicate if requested
  if (deduplicate) {
    // Ensure metadata is defined for deduplication
    const itemsWithMetadata = items.map((item) => ({
      ...item,
      metadata: (item.metadata as Record<string, unknown>) || {},
    }));
    items = deduplicateChunks(itemsWithMetadata, dedupeThreshold);
  }

  // Calculate max characters
  const effectiveMaxChars = maxChars || maxTokens * 4;

  // Assemble context with token awareness
  const parts: string[] = [];
  let totalChars = 0;

  for (const item of items) {
    const header = includeSectionHeaders
      ? formatHeader(headerTemplate, {
          index: parts.length + 1,
          source: (item.metadata?.source as string) || item.id,
          score: item.score,
        })
      : "";

    const metadata = includeMetadata ? formatMetadata(item.metadata) : "";

    const citation = formatCitation(
      citationFormat,
      parts.length + 1,
      item.metadata,
    );

    const chunkText = [
      header,
      citation ? `${citation}\n` : "",
      item.text,
      metadata,
    ]
      .filter(Boolean)
      .join("\n");

    // Check if adding this chunk would exceed limit
    const newTotalChars = totalChars + chunkText.length + separator.length;

    if (newTotalChars > effectiveMaxChars) {
      // Try to include partial chunk
      const remainingChars =
        effectiveMaxChars - totalChars - separator.length - 50; // Buffer
      if (remainingChars > 200) {
        const truncatedText = truncateText(item.text, remainingChars);
        parts.push(
          [
            header,
            citation ? `${citation}\n` : "",
            truncatedText,
            "[truncated]",
          ]
            .filter(Boolean)
            .join("\n"),
        );
      }
      break;
    }

    parts.push(chunkText);
    totalChars = newTotalChars;
  }

  return parts.join(separator);
}

/**
 * Format context with inline citations
 *
 * @param results - Retrieved results
 * @param options - Formatting options
 * @returns Context with citations and citation list
 */
export function formatContextWithCitations(
  results: Array<Chunk | VectorQueryResult>,
  options?: ContextAssemblyOptions & { returnCitations?: boolean },
): { context: string; citations: string[] } {
  const citations: string[] = [];

  const items = results.map((r, index) => {
    const id = "id" in r ? r.id : `chunk-${index}`;
    const metadata = "metadata" in r ? r.metadata : {};
    const source = (metadata?.source as string) || id;

    citations.push(`[${index + 1}] ${source}`);

    return {
      ...r,
      citationMarker: `[${index + 1}]`,
    };
  });

  const context = assembleContext(items, {
    ...options,
    citationFormat: "numbered",
    includeSectionHeaders: true,
    headerTemplate: "[{index}]",
  });

  return { context, citations };
}

/**
 * Create a context window with detailed tracking
 *
 * @param results - Retrieved results
 * @param options - Assembly options
 * @returns Context window with metadata
 */
export function createContextWindow(
  results: Array<Chunk | VectorQueryResult>,
  options?: ContextAssemblyOptions,
): ContextWindow {
  const maxTokens = options?.maxTokens || 4000;
  const maxChars = options?.maxChars || maxTokens * 4;

  let text = "";
  let chunkCount = 0;
  let truncatedChunks = 0;
  const citations = new Map<string, string>();

  const items = results.map((r, index) => ({
    id: "id" in r ? r.id : `chunk-${index}`,
    text:
      ("text" in r ? r.text : "") ||
      ((r.metadata as Record<string, unknown>)?.text as string) ||
      "",
    metadata: "metadata" in r ? r.metadata : {},
  }));

  for (const item of items) {
    const chunkText = item.text;
    const newLength = text.length + chunkText.length + 10; // Buffer for separators

    if (newLength > maxChars) {
      // Try partial inclusion
      const remaining = maxChars - text.length - 20;
      if (remaining > 100) {
        const truncated = truncateText(chunkText, remaining);
        text += (text ? "\n\n" : "") + truncated + "...";
        truncatedChunks++;
        citations.set(
          item.id,
          `[${chunkCount + 1}] ${item.metadata?.source || item.id} (truncated)`,
        );
        chunkCount++;
      } else {
        truncatedChunks++;
      }
      continue;
    }

    text += (text ? "\n\n" : "") + chunkText;
    citations.set(
      item.id,
      `[${chunkCount + 1}] ${item.metadata?.source || item.id}`,
    );
    chunkCount++;
  }

  return {
    text,
    chunkCount,
    charCount: text.length,
    tokenCount: Math.ceil(text.length / 4),
    truncatedChunks,
    citations,
  };
}

/**
 * Summarize context using LLM
 *
 * @param context - Context to summarize
 * @param maxLength - Maximum summary length
 * @param provider - LLM provider instance
 * @returns Summarized context
 */
export async function summarizeContext(
  context: string,
  maxLength: number = 500,
  provider?: {
    generate: (params: {
      prompt: string;
      maxTokens: number;
      temperature: number;
    }) => Promise<{ content?: string } | null>;
  },
): Promise<string> {
  if (!provider) {
    // Simple truncation fallback
    return truncateText(context, maxLength * 4);
  }

  try {
    const result = await provider.generate({
      prompt: `Summarize the following context in no more than ${maxLength} words, preserving the key information:\n\n${context}\n\nSummary:`,
      maxTokens: Math.ceil(maxLength * 1.5),
      temperature: 0.3,
    });

    return result?.content?.trim() || truncateText(context, maxLength * 4);
  } catch (error) {
    logger.warn("[ContextAssembly] Summarization failed, using truncation", {
      error: error instanceof Error ? error.message : String(error),
    });
    return truncateText(context, maxLength * 4);
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format section header using template
 */
function formatHeader(
  template: string,
  vars: { index: number; source: string; score: number },
): string {
  return template
    .replace("{index}", String(vars.index))
    .replace("{source}", vars.source)
    .replace("{score}", vars.score.toFixed(4));
}

/**
 * Format citation based on style
 */
function formatCitation(
  format: CitationFormat,
  index: number,
  metadata?: Record<string, unknown>,
): string {
  switch (format) {
    case "inline":
      return `(Source: ${metadata?.source || `#${index}`})`;
    case "footnote":
      return `[^${index}]`;
    case "numbered":
      return `[${index}]`;
    case "none":
    default:
      return "";
  }
}

/**
 * Format metadata for display
 */
function formatMetadata(metadata?: Record<string, unknown>): string {
  if (!metadata) {
    return "";
  }

  const relevant = ["source", "title", "author", "date", "page"];
  const parts: string[] = [];

  for (const key of relevant) {
    if (metadata[key]) {
      parts.push(`${key}: ${metadata[key]}`);
    }
  }

  return parts.length > 0 ? `\n[${parts.join(" | ")}]` : "";
}

/**
 * Truncate text at word boundary
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  // Find last space before maxLength
  let truncateAt = text.lastIndexOf(" ", maxLength);
  if (truncateAt === -1 || truncateAt < maxLength * 0.7) {
    truncateAt = maxLength;
  }

  return text.slice(0, truncateAt).trim();
}

/**
 * Deduplicate chunks based on text similarity
 */
function deduplicateChunks(
  items: Array<{
    id: string;
    text: string;
    score: number;
    metadata: Record<string, unknown>;
    index: number;
  }>,
  threshold: number,
): typeof items {
  const unique: typeof items = [];

  for (const item of items) {
    // Check if this item is too similar to any already included
    const isDuplicate = unique.some(
      (existing) => textSimilarity(item.text, existing.text) > threshold,
    );

    if (!isDuplicate) {
      unique.push(item);
    }
  }

  return unique;
}

/**
 * Simple text similarity using Jaccard index
 */
function textSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/));
  const wordsB = new Set(b.toLowerCase().split(/\s+/));

  const intersection = new Set([...wordsA].filter((x) => wordsB.has(x)));
  const union = new Set([...wordsA, ...wordsB]);

  return intersection.size / union.size;
}

/**
 * Order chunks by document structure (if available)
 */
export function orderByDocumentStructure(chunks: Chunk[]): Chunk[] {
  // Group by document
  const byDocument = new Map<string, Chunk[]>();

  for (const chunk of chunks) {
    const docId = chunk.metadata.documentId;
    const group = byDocument.get(docId);
    if (group) {
      group.push(chunk);
    } else {
      byDocument.set(docId, [chunk]);
    }
  }

  // Sort each document's chunks by position
  for (const docChunks of byDocument.values()) {
    docChunks.sort(
      (a, b) => (a.metadata.chunkIndex || 0) - (b.metadata.chunkIndex || 0),
    );
  }

  // Flatten, keeping documents together
  return [...byDocument.values()].flat();
}

/**
 * Extract key sentences from chunks for summary
 */
export function extractKeySentences(text: string, count: number = 3): string[] {
  const sentences = text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);

  // Simple scoring: longer sentences with more unique words
  const scored = sentences.map((s) => ({
    text: s,
    score: s.length * new Set(s.toLowerCase().split(/\s+/)).size,
  }));

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, count).map((s) => s.text);
}
