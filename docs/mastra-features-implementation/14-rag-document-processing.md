# RAG Document Processing Implementation Guide

> Implementation guide for Mastra-style RAG document processing in NeuroLink, including 9 chunking strategies, LLM-powered metadata extraction, vector query tools, and Graph RAG support.

## Table of Contents

1. [Overview](#overview)
2. [Current NeuroLink Document Processing](#current-neurolink-document-processing)
3. [Architecture Design](#architecture-design)
4. [Document Chunking System](#document-chunking-system)
5. [Metadata Extraction System](#metadata-extraction-system)
6. [Vector Query Tool](#vector-query-tool)
7. [Graph RAG System](#graph-rag-system)
8. [TypeScript Types and Interfaces](#typescript-types-and-interfaces)
9. [File Structure](#file-structure)
10. [Step-by-Step Implementation Plan](#step-by-step-implementation-plan)
11. [Testing Strategy](#testing-strategy)
12. [References](#references)
13. [Advanced RAG Techniques 2024-2025](#advanced-rag-techniques-2024-2025) _(New)_
14. [Chunking Strategy Benchmarks](#chunking-strategy-benchmarks) _(New)_
15. [Hybrid Search Implementation](#hybrid-search-implementation) _(New)_
16. [Graph RAG Patterns](#graph-rag-patterns) _(New)_
17. [Reranking Strategies](#reranking-strategies) _(New)_
18. [Updated Architecture](#updated-architecture) _(New)_
19. [Research References](#research-references) _(New)_

---

## Overview

RAG (Retrieval-Augmented Generation) is essential for building AI applications that can access and reason over large document collections. This guide outlines the implementation of a comprehensive RAG document processing system inspired by Mastra's architecture, adapted to NeuroLink's established patterns.

### Key Features

| Feature                     | Description                                                                           |
| --------------------------- | ------------------------------------------------------------------------------------- |
| **9 Chunking Strategies**   | Character, Recursive, Sentence, Token, Markdown, HTML, JSON, LaTeX, Semantic Markdown |
| **LLM Metadata Extraction** | Title, Summary, Keywords, Q&A pairs, Custom Schema                                    |
| **Vector Query Tool**       | Semantic search with metadata filtering and reranking                                 |
| **Graph RAG**               | Knowledge graph construction and traversal for context-aware retrieval                |

### Design Principles

Following NeuroLink's established patterns:

1. **Factory Pattern**: Chunker and extractor creation via factory functions
2. **Registry Pattern**: Centralized management of chunking strategies
3. **Composition over Inheritance**: Modular, composable components
4. **Type Safety**: Comprehensive TypeScript types
5. **Provider Abstraction**: Unified interface across different backends

---

## Current NeuroLink Document Processing

### Existing Capabilities

NeuroLink already has robust document processing for multimodal AI inputs:

#### PDFProcessor (`/src/lib/utils/pdfProcessor.ts`)

```typescript
// Current capabilities:
- PDF validation and magic byte detection
- Provider-specific configuration (Anthropic, Bedrock, Vertex, OpenAI, etc.)
- PDF to image conversion for non-native PDF providers
- Page count estimation and token usage calculation
- Size limit enforcement per provider
```

**Key Features:**

- Native PDF support detection per provider
- Automatic fallback to image conversion
- Memory usage estimation
- Provider configuration registry

#### FileDetector (`/src/lib/utils/fileDetector.ts`)

```typescript
// Current capabilities:
- Multi-strategy file type detection (magic bytes, MIME, extension, heuristics)
- Support for CSV, Image, PDF, Audio, Text, Office documents
- URL and file path loading with retry logic
- Confidence scoring for detection results
```

**Detection Strategies:**

1. **MagicBytesStrategy** (95% confidence) - Binary file headers
2. **MimeTypeStrategy** (85% confidence) - HTTP Content-Type
3. **ExtensionStrategy** (70% confidence) - File extension
4. **ContentHeuristicStrategy** (75% confidence) - Content analysis

#### CSVProcessor (`/src/lib/utils/csvProcessor.ts`)

```typescript
// Current capabilities:
- Streaming CSV parsing for large files
- Multiple output formats (raw, JSON, markdown)
- Metadata extraction (row count, columns, sample data)
- Excel metadata line detection and skipping
```

#### MessageBuilder (`/src/lib/utils/messageBuilder.ts`)

```typescript
// Current capabilities:
- Multimodal message construction (text, images, PDFs, CSV)
- Provider-specific content adaptation
- Conversation history integration
- File content injection into prompts
```

### Gap Analysis

| Capability          | Current Status                | RAG Requirement         |
| ------------------- | ----------------------------- | ----------------------- |
| Text chunking       | Not implemented               | 9 strategies needed     |
| Semantic chunking   | Not implemented               | LLM-based splitting     |
| Metadata extraction | Basic file metadata only      | LLM-powered extraction  |
| Vector embeddings   | Model enums exist             | Full embedding pipeline |
| Vector storage      | Documented in 04-vector-store | Integration needed      |
| Semantic search     | Not implemented               | Vector query tool       |
| Reranking           | Not implemented               | Multi-factor scoring    |
| Graph RAG           | Not implemented               | Knowledge graph support |

---

## Architecture Design

### High-Level Architecture

```
                                    +-------------------+
                                    |    NeuroLink      |
                                    |  (Main SDK Class) |
                                    +--------+----------+
                                             |
              +------------------------------+------------------------------+
              |                              |                              |
    +---------v----------+       +-----------v-----------+       +----------v-----------+
    |   DocumentProcessor |       |    VectorQueryTool    |       |      GraphRAG        |
    |   (MDocument class) |       | (Semantic Search Tool)|       | (Knowledge Graph)    |
    +----------+----------+       +-----------+-----------+       +----------+-----------+
               |                              |                              |
    +----------v----------+       +-----------v-----------+       +----------v-----------+
    |  ChunkerRegistry    |       |   MetadataFilter      |       |   GraphBuilder       |
    |  (9 strategies)     |       |   (MongoDB-style)     |       |   (Node/Edge mgmt)   |
    +----------+----------+       +-----------+-----------+       +----------+-----------+
               |                              |                              |
    +----------v----------+       +-----------v-----------+       +----------v-----------+
    | MetadataExtractor   |       |     Reranker          |       |   GraphTraversal     |
    | (LLM-powered)       |       | (Multi-factor scoring)|       |   (Random walk)      |
    +---------------------+       +-----------------------+       +----------------------+
```

### Integration with Existing Systems

```typescript
// Integration points with existing NeuroLink architecture:

// 1. Provider System - Use existing embedding models
import { ProviderFactory } from "../factories/providerFactory.js";

// 2. MCP Tool System - Register vector query as MCP tool
import { MCPToolRegistry } from "../mcp/toolRegistry.js";

// 3. File Processing - Extend existing processors
import { FileDetector } from "../utils/fileDetector.js";
import { PDFProcessor } from "../utils/pdfProcessor.js";

// 4. Vector Stores - From 04-vector-store-integrations
import { VectorStoreFactory } from "../vector/vectorStoreFactory.js";
```

---

## Document Chunking System

### Chunker Interface

```typescript
// src/lib/rag/chunkers/types.ts

/**
 * Base chunk result with text and metadata
 */
export type Chunk = {
  /** Unique identifier for the chunk */
  id: string;
  /** The text content of the chunk */
  text: string;
  /** Metadata associated with the chunk */
  metadata: ChunkMetadata;
  /** Optional embedding vector (populated after embedding) */
  embedding?: number[];
};

/**
 * Chunk metadata for tracking source and position
 */
export type ChunkMetadata = {
  /** Source document identifier */
  documentId: string;
  /** Original document filename or URL */
  source?: string;
  /** Position in the original document (0-indexed) */
  chunkIndex: number;
  /** Total number of chunks from the document */
  totalChunks?: number;
  /** Start character position in original text */
  startPosition?: number;
  /** End character position in original text */
  endPosition?: number;
  /** Document type (markdown, html, json, etc.) */
  documentType?: DocumentType;
  /** Custom metadata from extraction */
  custom?: Record<string, unknown>;
  /** Extracted title (from metadata extraction) */
  title?: string;
  /** Extracted summary (from metadata extraction) */
  summary?: string;
  /** Extracted keywords (from metadata extraction) */
  keywords?: string[];
};

/**
 * Supported document types for chunking
 */
export type DocumentType =
  | "text"
  | "markdown"
  | "html"
  | "json"
  | "latex"
  | "csv"
  | "pdf";

/**
 * Chunking strategy types
 */
export type ChunkingStrategy =
  | "character"
  | "recursive"
  | "sentence"
  | "token"
  | "markdown"
  | "html"
  | "json"
  | "latex"
  | "semantic-markdown";

/**
 * Base configuration for all chunkers
 */
export type BaseChunkerConfig = {
  /** Maximum chunk size (interpretation varies by strategy) */
  maxSize?: number;
  /** Minimum chunk size */
  minSize?: number;
  /** Overlap between consecutive chunks */
  overlap?: number;
  /** Whether to trim whitespace from chunks */
  trimWhitespace?: boolean;
  /** Custom metadata to add to all chunks */
  metadata?: Record<string, unknown>;
};

/**
 * Chunker interface - all chunking strategies implement this
 */
export type Chunker = {
  /** Strategy name for identification */
  readonly strategy: ChunkingStrategy;

  /**
   * Split text into chunks
   * @param text - The text to chunk
   * @param config - Strategy-specific configuration
   * @returns Array of chunks
   */
  chunk(text: string, config?: BaseChunkerConfig): Promise<Chunk[]>;

  /**
   * Validate configuration for this chunker
   * @param config - Configuration to validate
   * @returns Validation result
   */
  validateConfig(config: BaseChunkerConfig): ChunkerValidationResult;
};

/**
 * Validation result for chunker configuration
 */
export type ChunkerValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};
```

### Strategy-Specific Configurations

```typescript
// src/lib/rag/chunkers/configs.ts

/**
 * Character chunker configuration
 * Simple character-based splitting
 */
export type CharacterChunkerConfig = BaseChunkerConfig & {
  /** Character separator (default: "") */
  separator?: string;
  /** Keep separator in chunks */
  keepSeparator?: boolean;
};

/**
 * Recursive chunker configuration
 * Smart splitting based on content structure
 */
export type RecursiveChunkerConfig = BaseChunkerConfig & {
  /** Ordered list of separators to try (default: ["\n\n", "\n", " ", ""]) */
  separators?: string[];
  /** Whether separators are regex patterns */
  isSeparatorRegex?: boolean;
};

/**
 * Sentence chunker configuration
 * Sentence-aware splitting
 */
export type SentenceChunkerConfig = BaseChunkerConfig & {
  /** Sentence ending characters (default: [".", "!", "?", "\n"]) */
  sentenceEnders?: string[];
  /** Minimum sentences per chunk */
  minSentences?: number;
  /** Maximum sentences per chunk */
  maxSentences?: number;
};

/**
 * Token chunker configuration
 * Token-aware splitting using tokenizer
 */
export type TokenChunkerConfig = BaseChunkerConfig & {
  /** Tokenizer to use (default: "cl100k_base" for GPT models) */
  tokenizer?: string;
  /** Model name for token counting (alternative to tokenizer) */
  modelName?: string;
  /** Maximum tokens per chunk */
  maxTokens?: number;
  /** Token overlap between chunks */
  tokenOverlap?: number;
};

/**
 * Markdown chunker configuration
 * Structure-aware markdown splitting
 */
export type MarkdownChunkerConfig = BaseChunkerConfig & {
  /** Header levels to split on (default: [1, 2, 3]) */
  headerLevels?: number[];
  /** Include code blocks as single chunks */
  preserveCodeBlocks?: boolean;
  /** Include the header in the chunk content */
  includeHeader?: boolean;
  /** Strip markdown formatting from output */
  stripFormatting?: boolean;
};

/**
 * HTML chunker configuration
 * HTML structure-aware splitting
 */
export type HTMLChunkerConfig = BaseChunkerConfig & {
  /** Tags to split on (default: ["div", "p", "section", "article"]) */
  splitTags?: string[];
  /** Tags to preserve as single chunks */
  preserveTags?: string[];
  /** Extract text only (strip HTML tags) */
  extractTextOnly?: boolean;
  /** Include tag metadata in chunks */
  includeTagMetadata?: boolean;
};

/**
 * JSON chunker configuration
 * JSON structure-aware splitting
 */
export type JSONChunkerConfig = BaseChunkerConfig & {
  /** Maximum depth to traverse */
  maxDepth?: number;
  /** Keys to split on (arrays/objects at these keys become chunks) */
  splitKeys?: string[];
  /** Keys to preserve as single units */
  preserveKeys?: string[];
  /** Include JSON path in metadata */
  includeJsonPath?: boolean;
};

/**
 * LaTeX chunker configuration
 * LaTeX structure-aware splitting
 */
export type LaTeXChunkerConfig = BaseChunkerConfig & {
  /** Environments to split on (default: ["section", "subsection", "chapter"]) */
  splitEnvironments?: string[];
  /** Preserve math environments as single chunks */
  preserveMath?: boolean;
  /** Include preamble as separate chunk */
  includePreamble?: boolean;
};

/**
 * Semantic Markdown chunker configuration
 * Markdown splitting based on related header families (requires LLM)
 */
export type SemanticMarkdownChunkerConfig = BaseChunkerConfig & {
  /** Minimum tokens before considering a split */
  joinThreshold?: number;
  /** Model for semantic analysis */
  modelName?: string;
  /** Provider for the model */
  provider?: string;
  /** Custom prompt for semantic grouping */
  semanticPrompt?: string;
  /** Maximum header depth to consider for grouping */
  maxHeaderDepth?: number;
};

/**
 * Union type for all chunker configurations
 */
export type ChunkerConfig =
  | CharacterChunkerConfig
  | RecursiveChunkerConfig
  | SentenceChunkerConfig
  | TokenChunkerConfig
  | MarkdownChunkerConfig
  | HTMLChunkerConfig
  | JSONChunkerConfig
  | LaTeXChunkerConfig
  | SemanticMarkdownChunkerConfig;
```

### Chunker Implementations

#### Character Chunker

```typescript
// src/lib/rag/chunkers/characterChunker.ts

import { v4 as uuidv4 } from "uuid";
import type { Chunker, Chunk, ChunkerValidationResult } from "./types.js";
import type { CharacterChunkerConfig } from "./configs.js";

/**
 * Character-based chunker
 * Splits text by character count with optional separator
 */
export class CharacterChunker implements Chunker {
  readonly strategy = "character" as const;

  async chunk(text: string, config?: CharacterChunkerConfig): Promise<Chunk[]> {
    const {
      maxSize = 1000,
      overlap = 0,
      separator = "",
      keepSeparator = false,
      trimWhitespace = true,
      metadata = {},
    } = config || {};

    const chunks: Chunk[] = [];
    const documentId = uuidv4();

    if (!text || text.length === 0) {
      return chunks;
    }

    // Split by separator if provided
    let segments: string[];
    if (separator) {
      segments = text.split(separator);
      if (keepSeparator && separator) {
        segments = segments.map((s, i) =>
          i < segments.length - 1 ? s + separator : s,
        );
      }
    } else {
      segments = [text];
    }

    let currentChunk = "";
    let chunkIndex = 0;
    let startPosition = 0;

    for (const segment of segments) {
      if (currentChunk.length + segment.length <= maxSize) {
        currentChunk += segment;
      } else {
        // Save current chunk if it has content
        if (currentChunk.length > 0) {
          const chunkText = trimWhitespace ? currentChunk.trim() : currentChunk;
          if (chunkText.length > 0) {
            chunks.push({
              id: uuidv4(),
              text: chunkText,
              metadata: {
                documentId,
                chunkIndex,
                startPosition,
                endPosition: startPosition + currentChunk.length,
                documentType: "text",
                custom: metadata,
              },
            });
            chunkIndex++;
          }
        }

        // Handle overlap
        if (overlap > 0 && currentChunk.length > overlap) {
          currentChunk = currentChunk.slice(-overlap) + segment;
          startPosition = startPosition + currentChunk.length - overlap;
        } else {
          startPosition += currentChunk.length;
          currentChunk = segment;
        }

        // If segment is larger than maxSize, split it further
        while (currentChunk.length > maxSize) {
          const chunkText = trimWhitespace
            ? currentChunk.slice(0, maxSize).trim()
            : currentChunk.slice(0, maxSize);

          chunks.push({
            id: uuidv4(),
            text: chunkText,
            metadata: {
              documentId,
              chunkIndex,
              startPosition,
              endPosition: startPosition + maxSize,
              documentType: "text",
              custom: metadata,
            },
          });
          chunkIndex++;

          const overlapStart = Math.max(0, maxSize - overlap);
          currentChunk = currentChunk.slice(overlapStart);
          startPosition += overlapStart;
        }
      }
    }

    // Don't forget the last chunk
    if (currentChunk.length > 0) {
      const chunkText = trimWhitespace ? currentChunk.trim() : currentChunk;
      if (chunkText.length > 0) {
        chunks.push({
          id: uuidv4(),
          text: chunkText,
          metadata: {
            documentId,
            chunkIndex,
            startPosition,
            endPosition: startPosition + currentChunk.length,
            documentType: "text",
            custom: metadata,
          },
        });
      }
    }

    // Update total chunks count
    chunks.forEach((chunk) => {
      chunk.metadata.totalChunks = chunks.length;
    });

    return chunks;
  }

  validateConfig(config: CharacterChunkerConfig): ChunkerValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (config.maxSize !== undefined && config.maxSize <= 0) {
      errors.push("maxSize must be greater than 0");
    }

    if (config.overlap !== undefined && config.overlap < 0) {
      errors.push("overlap must be non-negative");
    }

    if (config.overlap !== undefined && config.maxSize !== undefined) {
      if (config.overlap >= config.maxSize) {
        errors.push("overlap must be less than maxSize");
      }
    }

    if (config.minSize !== undefined && config.maxSize !== undefined) {
      if (config.minSize > config.maxSize) {
        warnings.push(
          "minSize is greater than maxSize, some chunks may be smaller than minSize",
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
```

#### Recursive Chunker

```typescript
// src/lib/rag/chunkers/recursiveChunker.ts

import { v4 as uuidv4 } from "uuid";
import type { Chunker, Chunk, ChunkerValidationResult } from "./types.js";
import type { RecursiveChunkerConfig } from "./configs.js";

/**
 * Recursive chunker
 * Smart splitting based on content structure using hierarchical separators
 */
export class RecursiveChunker implements Chunker {
  readonly strategy = "recursive" as const;

  private readonly defaultSeparators = ["\n\n", "\n", ". ", " ", ""];

  async chunk(text: string, config?: RecursiveChunkerConfig): Promise<Chunk[]> {
    const {
      maxSize = 1000,
      overlap = 200,
      separators = this.defaultSeparators,
      isSeparatorRegex = false,
      trimWhitespace = true,
      metadata = {},
    } = config || {};

    const documentId = uuidv4();
    const chunks: Chunk[] = [];

    if (!text || text.length === 0) {
      return chunks;
    }

    const splitTexts = this.recursiveSplit(
      text,
      separators,
      maxSize,
      overlap,
      isSeparatorRegex,
    );

    let chunkIndex = 0;
    let currentPosition = 0;

    for (const splitText of splitTexts) {
      const chunkText = trimWhitespace ? splitText.trim() : splitText;

      if (chunkText.length > 0) {
        const startPosition = text.indexOf(splitText, currentPosition);

        chunks.push({
          id: uuidv4(),
          text: chunkText,
          metadata: {
            documentId,
            chunkIndex,
            startPosition: startPosition >= 0 ? startPosition : currentPosition,
            endPosition:
              startPosition >= 0
                ? startPosition + splitText.length
                : currentPosition + splitText.length,
            documentType: "text",
            custom: metadata,
          },
        });

        chunkIndex++;
        if (startPosition >= 0) {
          currentPosition = startPosition + splitText.length - overlap;
        }
      }
    }

    // Update total chunks count
    chunks.forEach((chunk) => {
      chunk.metadata.totalChunks = chunks.length;
    });

    return chunks;
  }

  private recursiveSplit(
    text: string,
    separators: string[],
    maxSize: number,
    overlap: number,
    isRegex: boolean,
  ): string[] {
    const results: string[] = [];

    if (text.length <= maxSize) {
      return [text];
    }

    // Find the best separator to use
    let separator = separators[separators.length - 1]; // Default to last (usually "")
    let newSeparators = separators;

    for (let i = 0; i < separators.length; i++) {
      const sep = separators[i];
      const hasMatch = isRegex
        ? new RegExp(sep).test(text)
        : text.includes(sep);

      if (sep === "" || hasMatch) {
        separator = sep;
        newSeparators = separators.slice(i + 1);
        break;
      }
    }

    // Split the text
    const splits = isRegex
      ? text.split(new RegExp(separator))
      : text.split(separator);

    // Merge splits into chunks
    let currentChunk = "";

    for (const split of splits) {
      const potentialChunk = currentChunk
        ? currentChunk + separator + split
        : split;

      if (potentialChunk.length <= maxSize) {
        currentChunk = potentialChunk;
      } else {
        // Current chunk is ready
        if (currentChunk.length > 0) {
          results.push(currentChunk);
        }

        // Handle split that's still too large
        if (split.length > maxSize) {
          const subSplits = this.recursiveSplit(
            split,
            newSeparators,
            maxSize,
            overlap,
            isRegex,
          );
          results.push(...subSplits.slice(0, -1));
          currentChunk = subSplits[subSplits.length - 1] || "";
        } else {
          // Add overlap from previous chunk
          if (results.length > 0 && overlap > 0) {
            const lastChunk = results[results.length - 1];
            const overlapText = lastChunk.slice(-overlap);
            currentChunk = overlapText + separator + split;
          } else {
            currentChunk = split;
          }
        }
      }
    }

    // Don't forget the last chunk
    if (currentChunk.length > 0) {
      results.push(currentChunk);
    }

    return results;
  }

  validateConfig(config: RecursiveChunkerConfig): ChunkerValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (config.maxSize !== undefined && config.maxSize <= 0) {
      errors.push("maxSize must be greater than 0");
    }

    if (config.overlap !== undefined && config.overlap < 0) {
      errors.push("overlap must be non-negative");
    }

    if (config.separators !== undefined && config.separators.length === 0) {
      errors.push("separators array must not be empty");
    }

    if (config.isSeparatorRegex && config.separators) {
      for (const sep of config.separators) {
        try {
          new RegExp(sep);
        } catch {
          errors.push(`Invalid regex separator: ${sep}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
```

#### Markdown Chunker

````typescript
// src/lib/rag/chunkers/markdownChunker.ts

import { v4 as uuidv4 } from "uuid";
import type { Chunker, Chunk, ChunkerValidationResult } from "./types.js";
import type { MarkdownChunkerConfig } from "./configs.js";

/**
 * Markdown-aware chunker
 * Splits based on markdown structure (headers, code blocks, etc.)
 */
export class MarkdownChunker implements Chunker {
  readonly strategy = "markdown" as const;

  async chunk(text: string, config?: MarkdownChunkerConfig): Promise<Chunk[]> {
    const {
      maxSize = 1000,
      overlap = 0,
      headerLevels = [1, 2, 3],
      preserveCodeBlocks = true,
      includeHeader = true,
      stripFormatting = false,
      trimWhitespace = true,
      metadata = {},
    } = config || {};

    const documentId = uuidv4();
    const chunks: Chunk[] = [];

    if (!text || text.length === 0) {
      return chunks;
    }

    // Build header regex pattern
    const headerPattern = new RegExp(
      `^(#{${Math.min(...headerLevels)},${Math.max(...headerLevels)}})\\s+(.+)$`,
      "gm",
    );

    // Split by headers while preserving them
    const sections = this.splitByHeaders(text, headerPattern, includeHeader);

    let chunkIndex = 0;
    let currentPosition = 0;

    for (const section of sections) {
      const { header, content, level } = section;

      // Handle code blocks
      let processedContent = content;
      const codeBlocks: { placeholder: string; code: string }[] = [];

      if (preserveCodeBlocks) {
        processedContent = content.replace(
          /```[\s\S]*?```|`[^`]+`/g,
          (match) => {
            const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
            codeBlocks.push({ placeholder, code: match });
            return placeholder;
          },
        );
      }

      // Split content if too large
      const contentChunks = this.splitContent(
        processedContent,
        maxSize - (header?.length || 0),
        overlap,
      );

      for (const contentChunk of contentChunks) {
        let chunkText =
          header && includeHeader
            ? `${header}\n\n${contentChunk}`
            : contentChunk;

        // Restore code blocks
        for (const { placeholder, code } of codeBlocks) {
          chunkText = chunkText.replace(placeholder, code);
        }

        // Strip formatting if requested
        if (stripFormatting) {
          chunkText = this.stripMarkdown(chunkText);
        }

        const finalText = trimWhitespace ? chunkText.trim() : chunkText;

        if (finalText.length > 0) {
          chunks.push({
            id: uuidv4(),
            text: finalText,
            metadata: {
              documentId,
              chunkIndex,
              startPosition: currentPosition,
              endPosition: currentPosition + chunkText.length,
              documentType: "markdown",
              custom: {
                ...metadata,
                headerLevel: level,
                header: header?.replace(/^#+\s*/, ""),
              },
            },
          });
          chunkIndex++;
        }

        currentPosition += chunkText.length;
      }
    }

    // Update total chunks count
    chunks.forEach((chunk) => {
      chunk.metadata.totalChunks = chunks.length;
    });

    return chunks;
  }

  private splitByHeaders(
    text: string,
    headerPattern: RegExp,
    includeHeader: boolean,
  ): Array<{ header: string | null; content: string; level: number | null }> {
    const sections: Array<{
      header: string | null;
      content: string;
      level: number | null;
    }> = [];

    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let currentHeader: string | null = null;
    let currentLevel: number | null = null;

    // Reset regex
    headerPattern.lastIndex = 0;

    while ((match = headerPattern.exec(text)) !== null) {
      // Content before this header
      if (match.index > lastIndex) {
        const content = text.slice(lastIndex, match.index);
        if (content.trim()) {
          sections.push({
            header: currentHeader,
            content: content.trim(),
            level: currentLevel,
          });
        }
      }

      currentHeader = match[0];
      currentLevel = match[1].length; // Number of # characters
      lastIndex = match.index + match[0].length;
    }

    // Don't forget content after the last header
    if (lastIndex < text.length) {
      const content = text.slice(lastIndex);
      if (content.trim()) {
        sections.push({
          header: currentHeader,
          content: content.trim(),
          level: currentLevel,
        });
      }
    }

    // If no headers found, return entire text as one section
    if (sections.length === 0 && text.trim()) {
      sections.push({
        header: null,
        content: text.trim(),
        level: null,
      });
    }

    return sections;
  }

  private splitContent(
    content: string,
    maxSize: number,
    overlap: number,
  ): string[] {
    if (content.length <= maxSize) {
      return [content];
    }

    const chunks: string[] = [];
    let start = 0;

    while (start < content.length) {
      let end = Math.min(start + maxSize, content.length);

      // Try to break at a paragraph or sentence boundary
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
      start = end - overlap;
    }

    return chunks;
  }

  private stripMarkdown(text: string): string {
    return text
      .replace(/^#+\s+/gm, "") // Headers
      .replace(/\*\*(.+?)\*\*/g, "$1") // Bold
      .replace(/\*(.+?)\*/g, "$1") // Italic
      .replace(/__(.+?)__/g, "$1") // Bold (underscore)
      .replace(/_(.+?)_/g, "$1") // Italic (underscore)
      .replace(/`(.+?)`/g, "$1") // Inline code
      .replace(/```[\s\S]*?```/g, "") // Code blocks
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Links
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1"); // Images
  }

  validateConfig(config: MarkdownChunkerConfig): ChunkerValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (config.maxSize !== undefined && config.maxSize <= 0) {
      errors.push("maxSize must be greater than 0");
    }

    if (config.headerLevels !== undefined) {
      if (config.headerLevels.length === 0) {
        errors.push("headerLevels must not be empty");
      }
      for (const level of config.headerLevels) {
        if (level < 1 || level > 6) {
          errors.push(
            `Invalid header level: ${level}. Must be between 1 and 6`,
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
````

### Chunker Registry

```typescript
// src/lib/rag/chunkers/chunkerRegistry.ts

import type { Chunker, ChunkingStrategy, ChunkerConfig } from "./types.js";
import { CharacterChunker } from "./characterChunker.js";
import { RecursiveChunker } from "./recursiveChunker.js";
import { SentenceChunker } from "./sentenceChunker.js";
import { TokenChunker } from "./tokenChunker.js";
import { MarkdownChunker } from "./markdownChunker.js";
import { HTMLChunker } from "./htmlChunker.js";
import { JSONChunker } from "./jsonChunker.js";
import { LaTeXChunker } from "./latexChunker.js";
import { SemanticMarkdownChunker } from "./semanticMarkdownChunker.js";

/**
 * Registry for chunking strategies
 * Follows NeuroLink's registry pattern
 */
export class ChunkerRegistry {
  private static chunkers = new Map<ChunkingStrategy, () => Chunker>();
  private static initialized = false;

  /**
   * Initialize all built-in chunkers
   */
  static initialize(): void {
    if (this.initialized) return;

    this.register("character", () => new CharacterChunker());
    this.register("recursive", () => new RecursiveChunker());
    this.register("sentence", () => new SentenceChunker());
    this.register("token", () => new TokenChunker());
    this.register("markdown", () => new MarkdownChunker());
    this.register("html", () => new HTMLChunker());
    this.register("json", () => new JSONChunker());
    this.register("latex", () => new LaTeXChunker());
    this.register("semantic-markdown", () => new SemanticMarkdownChunker());

    this.initialized = true;
  }

  /**
   * Register a custom chunker
   */
  static register(strategy: ChunkingStrategy, factory: () => Chunker): void {
    this.chunkers.set(strategy, factory);
  }

  /**
   * Get a chunker by strategy name
   */
  static get(strategy: ChunkingStrategy): Chunker {
    this.initialize();

    const factory = this.chunkers.get(strategy);
    if (!factory) {
      throw new Error(
        `Unknown chunking strategy: ${strategy}. Available: ${this.getAvailableStrategies().join(", ")}`,
      );
    }

    return factory();
  }

  /**
   * Get all available chunking strategies
   */
  static getAvailableStrategies(): ChunkingStrategy[] {
    this.initialize();
    return Array.from(this.chunkers.keys());
  }

  /**
   * Check if a strategy is registered
   */
  static has(strategy: ChunkingStrategy): boolean {
    this.initialize();
    return this.chunkers.has(strategy);
  }
}
```

---

## Metadata Extraction System

### Extractor Interface

```typescript
// src/lib/rag/extractors/types.ts

import type { Chunk } from "../chunkers/types.js";

/**
 * Metadata extraction types
 */
export type ExtractorType =
  | "title"
  | "summary"
  | "keywords"
  | "questions"
  | "custom";

/**
 * Base configuration for metadata extractors
 */
export type BaseExtractorConfig = {
  /** Language model to use for extraction */
  modelName?: string;
  /** Provider for the model */
  provider?: string;
  /** Custom prompt template */
  promptTemplate?: string;
  /** Maximum tokens for LLM response */
  maxTokens?: number;
  /** Temperature for LLM generation */
  temperature?: number;
};

/**
 * Title extractor configuration
 */
export type TitleExtractorConfig = BaseExtractorConfig & {
  /** Number of nodes to use for title extraction */
  nodes?: number;
  /** Template for processing individual nodes */
  nodeTemplate?: string;
  /** Template for combining node results */
  combineTemplate?: string;
};

/**
 * Summary extractor configuration
 */
export type SummaryExtractorConfig = BaseExtractorConfig & {
  /** Summary types to generate */
  summaryTypes?: ("current" | "previous" | "next")[];
  /** Maximum summary length in words */
  maxWords?: number;
};

/**
 * Keyword extractor configuration
 */
export type KeywordExtractorConfig = BaseExtractorConfig & {
  /** Maximum number of keywords to extract */
  maxKeywords?: number;
  /** Minimum keyword relevance score (0-1) */
  minRelevance?: number;
};

/**
 * Question-Answer extractor configuration
 */
export type QuestionExtractorConfig = BaseExtractorConfig & {
  /** Number of Q&A pairs to generate */
  numQuestions?: number;
  /** Include answers in output */
  includeAnswers?: boolean;
  /** Generate embedding-only questions (shorter, more focused) */
  embeddingOnly?: boolean;
};

/**
 * Custom schema extractor configuration
 */
export type CustomSchemaExtractorConfig = BaseExtractorConfig & {
  /** Zod schema for structured extraction */
  schema: unknown; // ZodType
  /** Description of what to extract */
  description?: string;
};

/**
 * Combined extraction parameters
 */
export type ExtractParams = {
  /** Extract document title */
  title?: boolean | TitleExtractorConfig;
  /** Extract document summary */
  summary?: boolean | SummaryExtractorConfig;
  /** Extract keywords */
  keywords?: boolean | KeywordExtractorConfig;
  /** Generate Q&A pairs */
  questions?: boolean | QuestionExtractorConfig;
  /** Custom schema extraction */
  custom?: CustomSchemaExtractorConfig;
};

/**
 * Extraction result for a single chunk
 */
export type ExtractionResult = {
  /** Extracted title */
  title?: string;
  /** Extracted summary */
  summary?: string;
  /** Extracted keywords */
  keywords?: string[];
  /** Generated Q&A pairs */
  questions?: Array<{ question: string; answer?: string }>;
  /** Custom schema extraction result */
  custom?: Record<string, unknown>;
};

/**
 * Metadata extractor interface
 */
export type MetadataExtractor = {
  readonly type: ExtractorType;

  /**
   * Extract metadata from chunks
   */
  extract(
    chunks: Chunk[],
    config?: BaseExtractorConfig,
  ): Promise<ExtractionResult[]>;
};
```

### Metadata Extractor Implementation

```typescript
// src/lib/rag/extractors/metadataExtractor.ts

import type { Chunk } from "../chunkers/types.js";
import type {
  ExtractParams,
  ExtractionResult,
  TitleExtractorConfig,
  SummaryExtractorConfig,
  KeywordExtractorConfig,
  QuestionExtractorConfig,
  CustomSchemaExtractorConfig,
} from "./types.js";
import { ProviderFactory } from "../../factories/providerFactory.js";
import { logger } from "../../utils/logger.js";

/**
 * Default prompts for metadata extraction
 */
const DEFAULT_PROMPTS = {
  title: `Extract a concise, descriptive title for the following content.
Return only the title, nothing else.

Content:
{context}

Title:`,

  summary: `Summarize the following content in {maxWords} words or less.
Focus on the key points and main ideas.

Content:
{context}

Summary:`,

  keywords: `Extract the {maxKeywords} most important keywords or key phrases from the following content.
Return them as a comma-separated list.

Content:
{context}

Keywords:`,

  questions: `Generate {numQuestions} questions that can be answered using the following content.
{answerInstruction}

Content:
{context}

Questions:`,
};

/**
 * LLM-powered metadata extractor
 * Extracts title, summary, keywords, Q&A pairs, and custom schema data
 */
export class LLMMetadataExtractor {
  private provider: string;
  private modelName: string;

  constructor(options?: { provider?: string; modelName?: string }) {
    this.provider = options?.provider || "openai";
    this.modelName = options?.modelName || "gpt-4o-mini";
  }

  /**
   * Extract metadata from chunks based on configuration
   */
  async extract(
    chunks: Chunk[],
    params: ExtractParams,
  ): Promise<ExtractionResult[]> {
    const results: ExtractionResult[] = [];

    // Group chunks by documentId for title extraction
    const chunksByDocument = this.groupByDocument(chunks);

    for (const chunk of chunks) {
      const result: ExtractionResult = {};

      try {
        // Extract title (shared across chunks with same documentId)
        if (params.title) {
          const titleConfig =
            typeof params.title === "boolean" ? {} : params.title;
          result.title = await this.extractTitle(
            chunksByDocument.get(chunk.metadata.documentId) || [chunk],
            titleConfig,
          );
        }

        // Extract summary
        if (params.summary) {
          const summaryConfig =
            typeof params.summary === "boolean" ? {} : params.summary;
          result.summary = await this.extractSummary(chunk, summaryConfig);
        }

        // Extract keywords
        if (params.keywords) {
          const keywordConfig =
            typeof params.keywords === "boolean" ? {} : params.keywords;
          result.keywords = await this.extractKeywords(chunk, keywordConfig);
        }

        // Generate Q&A pairs
        if (params.questions) {
          const questionConfig =
            typeof params.questions === "boolean" ? {} : params.questions;
          result.questions = await this.extractQuestions(chunk, questionConfig);
        }

        // Custom schema extraction
        if (params.custom) {
          result.custom = await this.extractCustom(chunk, params.custom);
        }

        results.push(result);
      } catch (error) {
        logger.error("[MetadataExtractor] Extraction failed for chunk", {
          chunkId: chunk.id,
          error: error instanceof Error ? error.message : String(error),
        });
        results.push(result);
      }
    }

    return results;
  }

  private groupByDocument(chunks: Chunk[]): Map<string, Chunk[]> {
    const groups = new Map<string, Chunk[]>();

    for (const chunk of chunks) {
      const docId = chunk.metadata.documentId;
      if (!groups.has(docId)) {
        groups.set(docId, []);
      }
      groups.get(docId)!.push(chunk);
    }

    return groups;
  }

  private async extractTitle(
    chunks: Chunk[],
    config: TitleExtractorConfig,
  ): Promise<string> {
    const { nodes = 3, promptTemplate = DEFAULT_PROMPTS.title } = config;

    // Use first N chunks for title extraction
    const relevantChunks = chunks.slice(0, nodes);
    const context = relevantChunks.map((c) => c.text).join("\n\n");

    const prompt = promptTemplate.replace("{context}", context);
    const response = await this.callLLM(prompt, config);

    return response.trim();
  }

  private async extractSummary(
    chunk: Chunk,
    config: SummaryExtractorConfig,
  ): Promise<string> {
    const { maxWords = 100, promptTemplate = DEFAULT_PROMPTS.summary } = config;

    const prompt = promptTemplate
      .replace("{context}", chunk.text)
      .replace("{maxWords}", String(maxWords));

    const response = await this.callLLM(prompt, config);

    return response.trim();
  }

  private async extractKeywords(
    chunk: Chunk,
    config: KeywordExtractorConfig,
  ): Promise<string[]> {
    const { maxKeywords = 10, promptTemplate = DEFAULT_PROMPTS.keywords } =
      config;

    const prompt = promptTemplate
      .replace("{context}", chunk.text)
      .replace("{maxKeywords}", String(maxKeywords));

    const response = await this.callLLM(prompt, config);

    // Parse comma-separated keywords
    return response
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0)
      .slice(0, maxKeywords);
  }

  private async extractQuestions(
    chunk: Chunk,
    config: QuestionExtractorConfig,
  ): Promise<Array<{ question: string; answer?: string }>> {
    const {
      numQuestions = 3,
      includeAnswers = true,
      promptTemplate = DEFAULT_PROMPTS.questions,
    } = config;

    const answerInstruction = includeAnswers
      ? "For each question, also provide a brief answer based on the content."
      : "Return only the questions.";

    const prompt = promptTemplate
      .replace("{context}", chunk.text)
      .replace("{numQuestions}", String(numQuestions))
      .replace("{answerInstruction}", answerInstruction);

    const response = await this.callLLM(prompt, config);

    // Parse Q&A pairs from response
    return this.parseQAPairs(response, includeAnswers);
  }

  private async extractCustom(
    chunk: Chunk,
    config: CustomSchemaExtractorConfig,
  ): Promise<Record<string, unknown>> {
    const { schema, description, promptTemplate } = config;

    // Use structured output with schema
    const prompt =
      promptTemplate ||
      `Extract the following information from the content:
${description || "Extract structured data according to the schema."}

Content:
${chunk.text}

Return the extracted data as JSON.`;

    const response = await this.callLLM(prompt, config);

    try {
      return JSON.parse(response);
    } catch {
      logger.warn(
        "[MetadataExtractor] Failed to parse custom extraction as JSON",
      );
      return { raw: response };
    }
  }

  private parseQAPairs(
    response: string,
    includeAnswers: boolean,
  ): Array<{ question: string; answer?: string }> {
    const pairs: Array<{ question: string; answer?: string }> = [];

    // Try to parse numbered questions
    const lines = response.split("\n").filter((l) => l.trim());

    let currentQuestion: string | null = null;
    let currentAnswer: string | null = null;

    for (const line of lines) {
      const trimmed = line.trim();

      // Check if line is a question (starts with number or Q:)
      if (/^\d+[.):]\s*/.test(trimmed) || /^Q[.:]?\s*/i.test(trimmed)) {
        // Save previous Q&A pair
        if (currentQuestion) {
          pairs.push({
            question: currentQuestion,
            ...(includeAnswers && currentAnswer
              ? { answer: currentAnswer }
              : {}),
          });
        }

        currentQuestion = trimmed
          .replace(/^\d+[.):]\s*/, "")
          .replace(/^Q[.:]?\s*/i, "");
        currentAnswer = null;
      } else if (/^A[.:]?\s*/i.test(trimmed) && currentQuestion) {
        currentAnswer = trimmed.replace(/^A[.:]?\s*/i, "");
      } else if (currentQuestion && !currentAnswer) {
        // Continuation of question
        currentQuestion += " " + trimmed;
      } else if (currentAnswer) {
        // Continuation of answer
        currentAnswer += " " + trimmed;
      }
    }

    // Don't forget the last pair
    if (currentQuestion) {
      pairs.push({
        question: currentQuestion,
        ...(includeAnswers && currentAnswer ? { answer: currentAnswer } : {}),
      });
    }

    return pairs;
  }

  private async callLLM(
    prompt: string,
    config: {
      modelName?: string;
      provider?: string;
      maxTokens?: number;
      temperature?: number;
    },
  ): Promise<string> {
    const provider = await ProviderFactory.createProvider(
      config.provider || this.provider,
      config.modelName || this.modelName,
    );

    const result = await provider.generate({
      prompt,
      maxTokens: config.maxTokens || 500,
      temperature: config.temperature || 0.3,
    });

    return result.text || "";
  }
}
```

---

## Vector Query Tool

### Vector Query Tool Interface

```typescript
// src/lib/rag/tools/vectorQueryTool.ts

import type { Chunk } from "../chunkers/types.js";
import type { VectorStore, QueryResult } from "../../vector/types.js";

/**
 * Vector query tool configuration
 */
export type VectorQueryToolConfig = {
  /** Tool identifier */
  id?: string;
  /** Tool description for AI agents */
  description?: string;
  /** Vector store instance or resolver function */
  vectorStore: VectorStore | ((context: RequestContext) => VectorStore);
  /** Index name within the vector store */
  indexName: string;
  /** Embedding model specification */
  embeddingModel: {
    provider: string;
    modelName: string;
  };
  /** Enable metadata filtering */
  enableFilter?: boolean;
  /** Include embedding vectors in results */
  includeVectors?: boolean;
  /** Include full source objects in results */
  includeSources?: boolean;
  /** Number of results to return */
  topK?: number;
  /** Reranker configuration */
  reranker?: RerankerConfig;
  /** Provider-specific options */
  providerOptions?: VectorProviderOptions;
};

/**
 * Request context for dynamic configuration
 */
export type RequestContext = {
  userId?: string;
  tenantId?: string;
  environment?: string;
  custom?: Record<string, unknown>;
};

/**
 * Reranker configuration
 */
export type RerankerConfig = {
  /** Language model for reranking */
  model: {
    provider: string;
    modelName: string;
  };
  /** Scoring weights */
  weights?: {
    semantic?: number;
    vector?: number;
    position?: number;
  };
  /** Number of results after reranking */
  topK?: number;
};

/**
 * Provider-specific query options
 */
export type VectorProviderOptions = {
  /** Pinecone options */
  pinecone?: {
    namespace?: string;
    sparseVector?: number[];
  };
  /** pgVector options */
  pgVector?: {
    minScore?: number;
    ef?: number;
    probes?: number;
  };
  /** Chroma options */
  chroma?: {
    where?: Record<string, unknown>;
    whereDocument?: Record<string, unknown>;
  };
};

/**
 * Vector query result
 */
export type VectorQueryResult = {
  /** Formatted relevant context string */
  relevantContext: string;
  /** Source query results */
  sources: QueryResult[];
  /** Total results found */
  totalResults: number;
  /** Query metadata */
  metadata: {
    queryTime: number;
    reranked: boolean;
    filtered: boolean;
  };
};

/**
 * Metadata filter using MongoDB/Sift query syntax
 */
export type MetadataFilter = {
  // Comparison operators
  $eq?: unknown;
  $ne?: unknown;
  $gt?: number;
  $gte?: number;
  $lt?: number;
  $lte?: number;
  $in?: unknown[];
  $nin?: unknown[];

  // Logical operators
  $and?: MetadataFilter[];
  $or?: MetadataFilter[];
  $not?: MetadataFilter;
  $nor?: MetadataFilter[];

  // Special operators
  $exists?: boolean;
  $contains?: string;
  $regex?: string;
  $size?: number;

  // Field-level filters
  [field: string]: unknown;
};
```

### Vector Query Tool Implementation

```typescript
// src/lib/rag/tools/vectorQueryToolImpl.ts

import { v4 as uuidv4 } from "uuid";
import type {
  VectorQueryToolConfig,
  VectorQueryResult,
  MetadataFilter,
  RequestContext,
} from "./vectorQueryTool.js";
import type { VectorStore, QueryResult } from "../../vector/types.js";
import { ProviderFactory } from "../../factories/providerFactory.js";
import { logger } from "../../utils/logger.js";
import { rerank } from "../reranker/reranker.js";

/**
 * Creates a vector query tool for semantic search
 * Follows NeuroLink's factory pattern
 */
export function createVectorQueryTool(config: VectorQueryToolConfig) {
  const {
    id = `vector-query-${uuidv4().slice(0, 8)}`,
    description = "Access the knowledge base to find information needed to answer user questions",
    vectorStore,
    indexName,
    embeddingModel,
    enableFilter = false,
    includeVectors = false,
    includeSources = true,
    topK = 10,
    reranker,
    providerOptions,
  } = config;

  return {
    name: id,
    description,

    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query to find relevant information",
        },
        filter: enableFilter
          ? {
              type: "object",
              description: "Metadata filters to narrow down results",
            }
          : undefined,
        topK: {
          type: "number",
          description: `Number of results to return (default: ${topK})`,
        },
      },
      required: ["query"],
    },

    execute: async (
      params: { query: string; filter?: MetadataFilter; topK?: number },
      context?: RequestContext,
    ): Promise<VectorQueryResult> => {
      const startTime = Date.now();

      try {
        // Resolve vector store if it's a function
        const store: VectorStore =
          typeof vectorStore === "function"
            ? vectorStore(context || {})
            : vectorStore;

        // Generate query embedding
        const embeddingProvider = await ProviderFactory.createProvider(
          embeddingModel.provider,
          embeddingModel.modelName,
        );

        const queryEmbedding = await embeddingProvider.embed(params.query);

        // Query the vector store
        let results = await store.query({
          indexName,
          queryVector: queryEmbedding,
          topK: params.topK || topK,
          filter: params.filter,
          includeVectors,
          ...providerOptions,
        });

        let reranked = false;

        // Apply reranking if configured
        if (reranker && results.length > 0) {
          const rerankerModel = await ProviderFactory.createProvider(
            reranker.model.provider,
            reranker.model.modelName,
          );

          const rerankedResults = await rerank(
            results,
            params.query,
            rerankerModel,
            {
              weights: reranker.weights,
              topK: reranker.topK,
              queryEmbedding,
            },
          );

          results = rerankedResults.map((r) => r.result);
          reranked = true;
        }

        // Format results
        const relevantContext = results
          .map((r, i) => `[${i + 1}] ${r.metadata?.text || r.text || ""}`)
          .join("\n\n");

        const queryTime = Date.now() - startTime;

        logger.info("[VectorQueryTool] Query completed", {
          query: params.query.slice(0, 50),
          resultsCount: results.length,
          queryTime,
          reranked,
          filtered: !!params.filter,
        });

        return {
          relevantContext,
          sources: includeSources ? results : [],
          totalResults: results.length,
          metadata: {
            queryTime,
            reranked,
            filtered: !!params.filter,
          },
        };
      } catch (error) {
        logger.error("[VectorQueryTool] Query failed", {
          query: params.query.slice(0, 50),
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
  };
}
```

### Reranker Implementation

```typescript
// src/lib/rag/reranker/reranker.ts

import type { QueryResult } from "../../vector/types.js";
import type { AIProvider } from "../../types/providers.js";
import { logger } from "../../utils/logger.js";

/**
 * Reranker options
 */
export type RerankerOptions = {
  /** Pre-computed query embedding */
  queryEmbedding?: number[];
  /** Number of results to return after reranking */
  topK?: number;
  /** Scoring weights (must sum to 1.0) */
  weights?: {
    semantic?: number;
    vector?: number;
    position?: number;
  };
};

/**
 * Reranked result with detailed scoring
 */
export type RerankResult = {
  /** Original query result */
  result: QueryResult;
  /** Combined reranking score (0-1) */
  score: number;
  /** Detailed score breakdown */
  details: {
    semantic: number;
    vector: number;
    position: number;
    queryAnalysis?: string;
  };
};

/**
 * Default scoring weights
 */
const DEFAULT_WEIGHTS = {
  semantic: 0.4,
  vector: 0.4,
  position: 0.2,
};

/**
 * Rerank vector search results using multi-factor scoring
 *
 * @param results - Vector search results to rerank
 * @param query - Original search query
 * @param model - Language model for semantic scoring
 * @param options - Reranking options
 * @returns Reranked results with scores
 */
export async function rerank(
  results: QueryResult[],
  query: string,
  model: AIProvider,
  options?: RerankerOptions,
): Promise<RerankResult[]> {
  const { queryEmbedding, topK = 3, weights = DEFAULT_WEIGHTS } = options || {};

  // Validate weights sum to 1.0
  const totalWeight =
    (weights.semantic || DEFAULT_WEIGHTS.semantic) +
    (weights.vector || DEFAULT_WEIGHTS.vector) +
    (weights.position || DEFAULT_WEIGHTS.position);

  if (Math.abs(totalWeight - 1.0) > 0.01) {
    logger.warn("[Reranker] Weights do not sum to 1.0, normalizing", {
      original: weights,
      total: totalWeight,
    });
  }

  const normalizedWeights = {
    semantic: (weights.semantic || DEFAULT_WEIGHTS.semantic) / totalWeight,
    vector: (weights.vector || DEFAULT_WEIGHTS.vector) / totalWeight,
    position: (weights.position || DEFAULT_WEIGHTS.position) / totalWeight,
  };

  const rerankedResults: RerankResult[] = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];

    // Calculate vector score (use existing score or cosine similarity)
    const vectorScore = result.score ?? 0;

    // Calculate position score (inverse of position)
    const positionScore = 1 - i / results.length;

    // Calculate semantic score using LLM
    const semanticResult = await calculateSemanticScore(
      query,
      result.metadata?.text || result.text || "",
      model,
    );

    // Combine scores
    const combinedScore =
      normalizedWeights.semantic * semanticResult.score +
      normalizedWeights.vector * vectorScore +
      normalizedWeights.position * positionScore;

    rerankedResults.push({
      result,
      score: combinedScore,
      details: {
        semantic: semanticResult.score,
        vector: vectorScore,
        position: positionScore,
        queryAnalysis: semanticResult.analysis,
      },
    });
  }

  // Sort by combined score descending
  rerankedResults.sort((a, b) => b.score - a.score);

  // Return top K results
  return rerankedResults.slice(0, topK);
}

/**
 * Calculate semantic relevance score using LLM
 */
async function calculateSemanticScore(
  query: string,
  text: string,
  model: AIProvider,
): Promise<{ score: number; analysis?: string }> {
  const prompt = `Rate the relevance of the following text to the query on a scale of 0 to 1.

Query: ${query}

Text: ${text.slice(0, 1000)}

Respond with only a number between 0 and 1, where:
- 0 means completely irrelevant
- 0.5 means somewhat relevant
- 1 means highly relevant

Score:`;

  try {
    const result = await model.generate({
      prompt,
      maxTokens: 10,
      temperature: 0,
    });

    const scoreText = result.text?.trim() || "0";
    const score = parseFloat(scoreText);

    if (isNaN(score) || score < 0 || score > 1) {
      return { score: 0.5 };
    }

    return { score };
  } catch (error) {
    logger.warn("[Reranker] Semantic scoring failed, using default", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { score: 0.5 };
  }
}

/**
 * Cohere relevance scorer (uses native reranking API)
 */
export class CohereRelevanceScorer {
  constructor(private modelName: string = "rerank-v3.5") {}

  async score(
    query: string,
    documents: string[],
  ): Promise<Array<{ index: number; score: number }>> {
    // Implementation would use Cohere's rerank API
    // This is a placeholder for the structure
    throw new Error("CohereRelevanceScorer requires Cohere API integration");
  }
}

/**
 * ZeroEntropy relevance scorer
 */
export class ZeroEntropyRelevanceScorer {
  constructor(private modelName: string = "zerank-1") {}

  async score(
    query: string,
    documents: string[],
  ): Promise<Array<{ index: number; score: number }>> {
    // Implementation would use ZeroEntropy's API
    throw new Error(
      "ZeroEntropyRelevanceScorer requires ZeroEntropy API integration",
    );
  }
}
```

---

## Graph RAG System

### Graph RAG Types

```typescript
// src/lib/rag/graph/types.ts

/**
 * Graph node representing a document chunk
 */
export type GraphNode = {
  /** Unique node identifier */
  id: string;
  /** Text content of the node */
  content: string;
  /** Node metadata */
  metadata: Record<string, unknown>;
  /** Embedding vector */
  embedding?: number[];
};

/**
 * Graph edge representing semantic relationship
 */
export type GraphEdge = {
  /** Source node ID */
  source: string;
  /** Target node ID */
  target: string;
  /** Edge weight (similarity score) */
  weight: number;
  /** Edge type */
  type?: string;
};

/**
 * Chunk input for graph creation
 */
export type GraphChunk = {
  /** Chunk text content */
  text: string;
  /** Chunk metadata */
  metadata?: Record<string, unknown>;
};

/**
 * Embedding input for graph creation
 */
export type GraphEmbedding = {
  /** Embedding vector */
  vector: number[];
};

/**
 * Ranked node result from graph query
 */
export type RankedNode = {
  /** Node ID */
  id: string;
  /** Node content */
  content: string;
  /** Node metadata */
  metadata: Record<string, unknown>;
  /** Relevance score */
  score: number;
};

/**
 * Graph RAG configuration
 */
export type GraphRAGConfig = {
  /** Embedding vector dimension (default: 1536) */
  dimension?: number;
  /** Similarity threshold for edge creation (default: 0.7) */
  threshold?: number;
};

/**
 * Graph query parameters
 */
export type GraphQueryParams = {
  /** Query embedding vector */
  query: number[];
  /** Number of results to return (default: 10) */
  topK?: number;
  /** Random walk steps (default: 100) */
  randomWalkSteps?: number;
  /** Restart probability for random walk (default: 0.15) */
  restartProb?: number;
};
```

### Graph RAG Implementation

```typescript
// src/lib/rag/graph/graphRAG.ts

import { v4 as uuidv4 } from "uuid";
import type {
  GraphNode,
  GraphEdge,
  GraphChunk,
  GraphEmbedding,
  RankedNode,
  GraphRAGConfig,
  GraphQueryParams,
} from "./types.js";
import { logger } from "../../utils/logger.js";

/**
 * Graph-based Retrieval Augmented Generation
 * Creates a knowledge graph from document chunks where nodes represent
 * documents and edges represent semantic relationships
 */
export class GraphRAG {
  private nodes: Map<string, GraphNode> = new Map();
  private edges: Map<string, GraphEdge[]> = new Map();
  private dimension: number;
  private threshold: number;

  constructor(config?: GraphRAGConfig) {
    this.dimension = config?.dimension ?? 1536;
    this.threshold = config?.threshold ?? 0.7;
  }

  /**
   * Create a knowledge graph from document chunks and embeddings
   */
  createGraph(chunks: GraphChunk[], embeddings: GraphEmbedding[]): void {
    if (chunks.length !== embeddings.length) {
      throw new Error("Chunks and embeddings arrays must have the same length");
    }

    // Clear existing graph
    this.nodes.clear();
    this.edges.clear();

    // Create nodes
    const nodeIds: string[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const id = uuidv4();
      nodeIds.push(id);

      this.nodes.set(id, {
        id,
        content: chunks[i].text,
        metadata: chunks[i].metadata || {},
        embedding: embeddings[i].vector,
      });
    }

    // Create edges based on semantic similarity
    for (let i = 0; i < nodeIds.length; i++) {
      const edges: GraphEdge[] = [];
      const nodeA = this.nodes.get(nodeIds[i])!;

      for (let j = 0; j < nodeIds.length; j++) {
        if (i === j) continue;

        const nodeB = this.nodes.get(nodeIds[j])!;
        const similarity = this.cosineSimilarity(
          nodeA.embedding!,
          nodeB.embedding!,
        );

        if (similarity >= this.threshold) {
          edges.push({
            source: nodeIds[i],
            target: nodeIds[j],
            weight: similarity,
            type: "semantic",
          });
        }
      }

      // Sort edges by weight descending
      edges.sort((a, b) => b.weight - a.weight);
      this.edges.set(nodeIds[i], edges);
    }

    logger.info("[GraphRAG] Graph created", {
      nodes: this.nodes.size,
      totalEdges: Array.from(this.edges.values()).reduce(
        (sum, e) => sum + e.length,
        0,
      ),
      threshold: this.threshold,
    });
  }

  /**
   * Query the graph using random walk with restart
   */
  query(params: GraphQueryParams): RankedNode[] {
    const {
      query,
      topK = 10,
      randomWalkSteps = 100,
      restartProb = 0.15,
    } = params;

    if (this.nodes.size === 0) {
      return [];
    }

    // Calculate initial similarities to query
    const similarities = new Map<string, number>();
    for (const [id, node] of this.nodes) {
      if (node.embedding) {
        similarities.set(id, this.cosineSimilarity(query, node.embedding));
      }
    }

    // Find starting nodes (most similar to query)
    const sortedNodes = Array.from(similarities.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, Math.min(5, this.nodes.size));

    if (sortedNodes.length === 0) {
      return [];
    }

    // Random walk with restart
    const visitCounts = new Map<string, number>();
    const startNodeIds = sortedNodes.map(([id]) => id);
    const startProbs = this.normalizeProbs(sortedNodes.map(([, sim]) => sim));

    for (let step = 0; step < randomWalkSteps; step++) {
      // Choose starting node based on query similarity
      const startIdx = this.weightedRandomChoice(startProbs);
      let currentNode = startNodeIds[startIdx];

      // Walk with restart probability
      if (Math.random() >= restartProb) {
        const edges = this.edges.get(currentNode) || [];
        if (edges.length > 0) {
          // Choose next node based on edge weights
          const edgeWeights = edges.map((e) => e.weight);
          const normalizedWeights = this.normalizeProbs(edgeWeights);
          const nextIdx = this.weightedRandomChoice(normalizedWeights);
          currentNode = edges[nextIdx].target;
        }
      }

      // Update visit count
      visitCounts.set(currentNode, (visitCounts.get(currentNode) || 0) + 1);
    }

    // Combine visit frequency with query similarity for final ranking
    const scores = new Map<string, number>();
    const maxVisits = Math.max(...visitCounts.values());

    for (const [id] of this.nodes) {
      const visitScore = (visitCounts.get(id) || 0) / maxVisits;
      const similarityScore = similarities.get(id) || 0;

      // Weighted combination
      scores.set(id, 0.6 * similarityScore + 0.4 * visitScore);
    }

    // Sort and return top K
    const rankedNodes = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, topK)
      .map(([id, score]): RankedNode => {
        const node = this.nodes.get(id)!;
        return {
          id,
          content: node.content,
          metadata: node.metadata,
          score,
        };
      });

    logger.debug("[GraphRAG] Query completed", {
      topK,
      resultsCount: rankedNodes.length,
      topScore: rankedNodes[0]?.score,
    });

    return rankedNodes;
  }

  /**
   * Add a single node to the graph
   */
  addNode(chunk: GraphChunk, embedding: GraphEmbedding): string {
    const id = uuidv4();

    this.nodes.set(id, {
      id,
      content: chunk.text,
      metadata: chunk.metadata || {},
      embedding: embedding.vector,
    });

    // Create edges to existing nodes
    const edges: GraphEdge[] = [];
    for (const [existingId, existingNode] of this.nodes) {
      if (existingId === id) continue;

      const similarity = this.cosineSimilarity(
        embedding.vector,
        existingNode.embedding!,
      );

      if (similarity >= this.threshold) {
        edges.push({
          source: id,
          target: existingId,
          weight: similarity,
          type: "semantic",
        });

        // Add reverse edge
        const existingEdges = this.edges.get(existingId) || [];
        existingEdges.push({
          source: existingId,
          target: id,
          weight: similarity,
          type: "semantic",
        });
        this.edges.set(existingId, existingEdges);
      }
    }

    this.edges.set(id, edges);

    return id;
  }

  /**
   * Remove a node and its edges from the graph
   */
  removeNode(id: string): boolean {
    if (!this.nodes.has(id)) {
      return false;
    }

    // Remove node
    this.nodes.delete(id);
    this.edges.delete(id);

    // Remove edges pointing to this node
    for (const [nodeId, edges] of this.edges) {
      this.edges.set(
        nodeId,
        edges.filter((e) => e.target !== id),
      );
    }

    return true;
  }

  /**
   * Get graph statistics
   */
  getStats(): {
    nodeCount: number;
    edgeCount: number;
    avgDegree: number;
    threshold: number;
  } {
    const edgeCount = Array.from(this.edges.values()).reduce(
      (sum, e) => sum + e.length,
      0,
    );

    return {
      nodeCount: this.nodes.size,
      edgeCount,
      avgDegree: this.nodes.size > 0 ? edgeCount / this.nodes.size : 0,
      threshold: this.threshold,
    };
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error("Vectors must have the same dimension");
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
   * Normalize probabilities to sum to 1
   */
  private normalizeProbs(probs: number[]): number[] {
    const sum = probs.reduce((a, b) => a + b, 0);
    return sum === 0
      ? probs.map(() => 1 / probs.length)
      : probs.map((p) => p / sum);
  }

  /**
   * Weighted random choice
   */
  private weightedRandomChoice(weights: number[]): number {
    const random = Math.random();
    let cumulative = 0;

    for (let i = 0; i < weights.length; i++) {
      cumulative += weights[i];
      if (random <= cumulative) {
        return i;
      }
    }

    return weights.length - 1;
  }
}
```

### Graph RAG Tool

```typescript
// src/lib/rag/tools/graphRAGTool.ts

import { v4 as uuidv4 } from "uuid";
import { GraphRAG } from "../graph/graphRAG.js";
import type { VectorStore } from "../../vector/types.js";
import { ProviderFactory } from "../../factories/providerFactory.js";
import { logger } from "../../utils/logger.js";

/**
 * Graph RAG tool configuration
 */
export type GraphRAGToolConfig = {
  /** Tool identifier */
  id?: string;
  /** Tool description */
  description?: string;
  /** Vector store for chunk storage */
  vectorStore: VectorStore;
  /** Index name */
  indexName: string;
  /** Embedding model */
  embeddingModel: {
    provider: string;
    modelName: string;
  };
  /** Graph similarity threshold (0-1) */
  threshold?: number;
  /** Random walk steps */
  randomWalkSteps?: number;
  /** Restart probability */
  restartProb?: number;
  /** Number of results */
  topK?: number;
};

/**
 * Creates a Graph RAG tool for knowledge graph-based retrieval
 */
export function createGraphRAGTool(config: GraphRAGToolConfig) {
  const {
    id = `graph-rag-${uuidv4().slice(0, 8)}`,
    description = "Query the knowledge graph to find contextually related information",
    vectorStore,
    indexName,
    embeddingModel,
    threshold = 0.7,
    randomWalkSteps = 100,
    restartProb = 0.15,
    topK = 10,
  } = config;

  // Initialize GraphRAG instance
  const graphRAG = new GraphRAG({ threshold });
  let graphInitialized = false;

  return {
    name: id,
    description,

    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The query to search the knowledge graph",
        },
        topK: {
          type: "number",
          description: `Number of results to return (default: ${topK})`,
        },
        threshold: {
          type: "number",
          description: "Similarity threshold for graph edges (0-1)",
        },
      },
      required: ["query"],
    },

    /**
     * Initialize the graph from vector store contents
     */
    async initializeGraph(): Promise<void> {
      const results = await vectorStore.query({
        indexName,
        queryVector: new Array(1536).fill(0), // Dummy vector to get all
        topK: 10000, // Get all chunks
        includeVectors: true,
      });

      const chunks = results.map((r) => ({
        text: r.metadata?.text || r.text || "",
        metadata: r.metadata,
      }));

      const embeddings = results.map((r) => ({
        vector: r.vector || [],
      }));

      graphRAG.createGraph(chunks, embeddings);
      graphInitialized = true;

      logger.info("[GraphRAGTool] Graph initialized", graphRAG.getStats());
    },

    async execute(params: {
      query: string;
      topK?: number;
      threshold?: number;
    }): Promise<{
      relevantContext: string;
      nodes: Array<{ id: string; content: string; score: number }>;
      graphStats: { nodeCount: number; edgeCount: number };
    }> {
      // Initialize graph if not already done
      if (!graphInitialized) {
        await this.initializeGraph();
      }

      // Generate query embedding
      const embeddingProvider = await ProviderFactory.createProvider(
        embeddingModel.provider,
        embeddingModel.modelName,
      );

      const queryEmbedding = await embeddingProvider.embed(params.query);

      // Query the graph
      const results = graphRAG.query({
        query: queryEmbedding,
        topK: params.topK || topK,
        randomWalkSteps,
        restartProb,
      });

      // Format results
      const relevantContext = results
        .map((r, i) => `[${i + 1}] ${r.content}`)
        .join("\n\n");

      return {
        relevantContext,
        nodes: results.map((r) => ({
          id: r.id,
          content: r.content,
          score: r.score,
        })),
        graphStats: graphRAG.getStats(),
      };
    },
  };
}
```

---

## TypeScript Types and Interfaces

### Complete Type Definitions

```typescript
// src/lib/rag/types/index.ts

// Re-export all RAG types
export * from "../chunkers/types.js";
export * from "../chunkers/configs.js";
export * from "../extractors/types.js";
export * from "../tools/vectorQueryTool.js";
export * from "../graph/types.js";
export * from "../reranker/reranker.js";

// Main Document class types
export type MDocumentConfig = {
  /** Document type */
  type: DocumentType;
  /** Custom metadata */
  metadata?: Record<string, unknown>;
};

export type ChunkParams = {
  /** Chunking strategy to use */
  strategy?: ChunkingStrategy;
  /** Strategy-specific configuration */
  config?: ChunkerConfig;
  /** Metadata extraction options */
  extract?: ExtractParams;
};

export type MDocumentMethods = {
  /** Split document into chunks */
  chunk(params?: ChunkParams): Promise<Chunk[]>;
  /** Get all document chunks */
  getDocs(): Chunk[];
  /** Get text content from all chunks */
  getText(): string[];
  /** Get metadata from all chunks */
  getMetadata(): ChunkMetadata[];
  /** Extract metadata from chunks */
  extractMetadata(params: ExtractParams): Promise<ExtractionResult[]>;
};
```

---

## File Structure

```
src/lib/rag/
├── index.ts                          # Main exports
├── MDocument.ts                      # Main document class
├── chunkers/
│   ├── index.ts                      # Chunker exports
│   ├── types.ts                      # Chunker types
│   ├── configs.ts                    # Strategy configurations
│   ├── chunkerRegistry.ts            # Strategy registry
│   ├── characterChunker.ts           # Character-based chunking
│   ├── recursiveChunker.ts           # Recursive chunking
│   ├── sentenceChunker.ts            # Sentence-aware chunking
│   ├── tokenChunker.ts               # Token-based chunking
│   ├── markdownChunker.ts            # Markdown structure chunking
│   ├── htmlChunker.ts                # HTML structure chunking
│   ├── jsonChunker.ts                # JSON structure chunking
│   ├── latexChunker.ts               # LaTeX structure chunking
│   └── semanticMarkdownChunker.ts    # LLM-based semantic chunking
├── extractors/
│   ├── index.ts                      # Extractor exports
│   ├── types.ts                      # Extractor types
│   └── metadataExtractor.ts          # LLM metadata extraction
├── tools/
│   ├── index.ts                      # Tool exports
│   ├── vectorQueryTool.ts            # Vector query tool types
│   ├── vectorQueryToolImpl.ts        # Vector query implementation
│   └── graphRAGTool.ts               # Graph RAG tool
├── graph/
│   ├── index.ts                      # Graph exports
│   ├── types.ts                      # Graph types
│   └── graphRAG.ts                   # Graph RAG implementation
├── reranker/
│   ├── index.ts                      # Reranker exports
│   └── reranker.ts                   # Reranking implementation
├── filters/
│   ├── index.ts                      # Filter exports
│   ├── types.ts                      # Filter types
│   └── metadataFilter.ts             # Metadata filter translator
└── types/
    └── index.ts                      # Consolidated type exports
```

---

## Step-by-Step Implementation Plan

### Phase 1: Core Chunking System (Week 1-2)

1. **Create base types and interfaces**
   - Define `Chunk`, `ChunkMetadata`, `ChunkingStrategy` types
   - Define `Chunker` interface and configuration types
   - Create validation utilities

2. **Implement basic chunkers**
   - Character chunker
   - Recursive chunker
   - Sentence chunker
   - Token chunker (integrate with tiktoken)

3. **Implement structure-aware chunkers**
   - Markdown chunker
   - HTML chunker (use cheerio or similar)
   - JSON chunker
   - LaTeX chunker

4. **Create ChunkerRegistry**
   - Factory pattern for chunker creation
   - Strategy registration system
   - Validation and error handling

### Phase 2: Metadata Extraction (Week 3)

1. **Create extraction types**
   - Define `ExtractParams` and result types
   - Define configuration for each extractor

2. **Implement LLMMetadataExtractor**
   - Title extraction
   - Summary generation
   - Keyword extraction
   - Q&A pair generation
   - Custom schema extraction (Zod integration)

3. **Integrate with NeuroLink providers**
   - Use existing `ProviderFactory`
   - Support multiple LLM providers
   - Handle rate limiting and errors

### Phase 3: MDocument Class (Week 4)

1. **Create MDocument class**
   - Factory methods (`fromText`, `fromMarkdown`, `fromHTML`, `fromJSON`)
   - Integrate with existing `FileDetector`
   - Chunk method with strategy selection
   - Metadata extraction integration

2. **Integration with existing processors**
   - Extend `PDFProcessor` for text extraction
   - Extend `CSVProcessor` for structured chunking
   - Support for Office documents

### Phase 4: Vector Query Tool (Week 5)

1. **Create vector query tool**
   - Integrate with vector store implementations (from 04-vector-store)
   - Implement metadata filtering
   - Support provider-specific options

2. **Implement reranker**
   - Multi-factor scoring
   - LLM-based semantic scoring
   - Cohere/ZeroEntropy scorer integration

3. **Register as MCP tool**
   - Add to `MCPToolRegistry`
   - Define tool schema for AI agents
   - Support dynamic configuration

### Phase 5: Graph RAG (Week 6)

1. **Implement GraphRAG class**
   - Node and edge management
   - Graph construction from chunks
   - Random walk with restart

2. **Create Graph RAG tool**
   - Integration with vector stores
   - Knowledge graph queries
   - Combined retrieval results

3. **Testing and optimization**
   - Performance benchmarks
   - Memory optimization for large graphs
   - Threshold tuning guidelines

### Phase 6: Integration and Testing (Week 7-8)

1. **NeuroLink SDK integration**
   - Add RAG methods to main `NeuroLink` class
   - Update type exports
   - Documentation

2. **CLI commands**
   - Add `neurolink chunk` command
   - Add `neurolink extract-metadata` command
   - Add `neurolink query` command

3. **Comprehensive testing**
   - Unit tests for each chunker
   - Integration tests with providers
   - End-to-end RAG pipeline tests

---

## Testing Strategy

### Unit Tests

```typescript
// test/rag/chunkers/characterChunker.test.ts

import { describe, it, expect } from "vitest";
import { CharacterChunker } from "../../../src/lib/rag/chunkers/characterChunker.js";

describe("CharacterChunker", () => {
  const chunker = new CharacterChunker();

  it("should split text by character count", async () => {
    const text = "Hello world. This is a test.";
    const chunks = await chunker.chunk(text, { maxSize: 10 });

    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((chunk) => {
      expect(chunk.text.length).toBeLessThanOrEqual(10);
    });
  });

  it("should handle overlap correctly", async () => {
    const text = "ABCDEFGHIJ";
    const chunks = await chunker.chunk(text, { maxSize: 5, overlap: 2 });

    expect(chunks[0].text).toBe("ABCDE");
    expect(chunks[1].text.startsWith("DE")).toBe(true);
  });

  it("should validate configuration", () => {
    const result = chunker.validateConfig({ maxSize: -1 });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("maxSize must be greater than 0");
  });
});
```

### Integration Tests

```typescript
// test/rag/integration/ragPipeline.test.ts

import { describe, it, expect } from "vitest";
import { MDocument } from "../../../src/lib/rag/MDocument.js";
import { createVectorQueryTool } from "../../../src/lib/rag/tools/vectorQueryToolImpl.js";

describe("RAG Pipeline Integration", () => {
  it("should process document through full pipeline", async () => {
    // Create document
    const doc = MDocument.fromMarkdown(`
# Introduction
This is a test document.

## Section 1
Some content here.
    `);

    // Chunk with metadata extraction
    const chunks = await doc.chunk({
      strategy: "markdown",
      extract: {
        summary: true,
        keywords: true,
      },
    });

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].metadata.summary).toBeDefined();
  });
});
```

---

## References

### Mastra Documentation

- [RAG Overview](https://mastra.ai/docs/rag/overview)
- [Chunking and Embedding](https://mastra.ai/docs/rag/chunking-and-embedding)
- [MDocument Reference](https://mastra.ai/reference/rag/document)
- [ExtractParams Reference](https://mastra.ai/reference/rag/extract-params)
- [Metadata Filters Reference](https://mastra.ai/en/reference/rag/metadata-filters)
- [Vector Query Tool Reference](https://mastra.ai/en/reference/tools/vector-query-tool)
- [Rerank Reference](https://mastra.ai/reference/rag/rerank)
- [GraphRAG Reference](https://mastra.ai/reference/rag/graph-rag)

### NeuroLink Files

- **PDFProcessor**: `/src/lib/utils/pdfProcessor.ts`
- **FileDetector**: `/src/lib/utils/fileDetector.ts`
- **CSVProcessor**: `/src/lib/utils/csvProcessor.ts`
- **MessageBuilder**: `/src/lib/utils/messageBuilder.ts`
- **ProviderFactory**: `/src/lib/factories/providerFactory.ts`
- **MCPToolRegistry**: `/src/lib/mcp/toolRegistry.ts`
- **Vector Store Guide**: `/docs/mastra-features-implementation/04-vector-store-integrations.md`
- **Architecture Patterns**: `/docs/mastra-features-implementation/00-neurolink-architecture-patterns.md`

### Related Implementation Guides

- **04-vector-store-integrations.md** - Vector store implementations required for RAG
- **00-neurolink-architecture-patterns.md** - Core patterns to follow

---

## Advanced RAG Techniques 2024-2025

> Research-based insights from the latest RAG developments, drawn from production systems and academic research.

### Key Market Insights

| Metric                            | Value           |
| --------------------------------- | --------------- |
| **RAG Market Size (2024)**        | $1.85 billion   |
| **Growth Rate (CAGR)**            | 49%             |
| **Framework Adoption Growth**     | 400% since 2024 |
| **Production LLM Apps Using RAG** | 60%             |

### Modern RAG Architecture Evolution

| Year | State                 | Success Rate |
| ---- | --------------------- | ------------ |
| 2023 | Naive RAG             | 10-40%       |
| 2024 | Advanced pipelines    | 70-80%       |
| 2025 | Multi-stage + agentic | 85-95%       |

**Key insight**: Simple RAG rarely survives production. By mid-2024, production systems evolved into sophisticated retrieval pipelines.

### Advanced RAG Patterns

#### 1. Adaptive Retrieval & Self-Reflection

Building on Self-RAG, systems now dynamically decide when and how much to retrieve:

- **SAM-RAG**: Dynamically filters documents and verifies evidence
- Improves accuracy without unnecessary retrieval calls
- Shows **15% improvement** in retrieval precision for complex documents

#### 2. Multi-Stage Retrieval Pipelines

```
Query -> Query Transformation -> Hybrid Retrieval -> Reranking -> Context Selection -> Generation
              (HyDE, Multi-Query)   (Vector + BM25)   (Cross-encoder)  (Token budget)
```

#### 3. Granularity-Aware Retrieval

- **LongRAG**: Retrieves compressed long-context chunks through document grouping
- **FILCO (Filter Context)**: Filters irrelevant spans from retrieved passages before generation
- Optimizes retrieval unit from full documents to fine-grained segments

#### 4. Query Reformulation Techniques

| Technique               | How It Works                             | Improvement         | Best For              |
| ----------------------- | ---------------------------------------- | ------------------- | --------------------- |
| **Multi-Query RAG**     | Generate multiple query variations       | +Intent coverage    | Ambiguous queries     |
| **HyDE**                | Generate hypothetical answer, embed that | +Semantic alignment | Vocabulary mismatch   |
| **Step-Back Prompting** | Abstract to higher-level concepts        | +Answer quality     | Reasoning tasks       |
| **Query Decomposition** | Break into sub-questions                 | +Complex queries    | Multi-part questions  |
| **RAG-Fusion**          | Multiple queries + RRF fusion            | +Recall             | Comprehensive results |

#### 5. Agentic RAG

Systems that blend autonomous agents with RAG:

```typescript
class AgenticRAG {
  async process(query: string) {
    // Agent decides retrieval strategy
    const strategy = await this.planner.plan(query);

    // Dynamic retrieval
    if (strategy.needsRetrieval) {
      let docs = await this.retrieve(query, strategy.params);

      // Self-reflection
      if (!(await this.verifier.isSufficient(docs, query))) {
        docs = await this.correctiveRetrieval(query);
      }
    }

    // Generate with grounding
    return this.generate(query, docs);
  }
}
```

Core patterns: reflection, planning, tool use, multi-agent collaboration.

### Late Chunking (Jina AI, 2024)

A novel technique that preserves cross-chunk context:

```
Traditional: Chunk -> Embed (each chunk independently)
Late Chunking: Embed full document -> Extract chunk embeddings
```

**Benefits**:

- Maintains contextual dependencies across chunks
- Effectiveness increases with document length
- Available in jina-embeddings-v3 API

### Implementation Recommendation

```typescript
// Recommended baseline architecture for NeuroLink
const ragPipeline = {
  chunking: {
    strategy: "recursive",
    size: 512,
    overlap: 50,
  },
  embedding: {
    model: "text-embedding-3-large", // or BGE-M3 for open source
    dimensions: 1536,
  },
  retrieval: {
    type: "hybrid",
    dense: { k: 50 },
    sparse: { bm25: true, k: 50 },
    fusion: "rrf",
  },
  reranking: {
    model: "ms-marco-MiniLM-L-6-v2",
    topK: 10,
  },
  generation: {
    model: "gpt-4-turbo", // or claude-3-opus
    maxTokens: 2000,
  },
};
```

---

## Chunking Strategy Benchmarks

> Performance data from NVIDIA 2024 benchmarks and production RAG systems.

### Strategy Comparison

| Strategy       | Pros                        | Cons                            | Best For             | Recall        |
| -------------- | --------------------------- | ------------------------------- | -------------------- | ------------- |
| **Fixed-Size** | Simple, fast, cheap         | Ignores semantic boundaries     | Quick prototyping    | ~75%          |
| **Recursive**  | Preserves natural structure | Some overhead                   | General-purpose RAG  | **85-90%**    |
| **Semantic**   | Best retrieval accuracy     | Slow, computationally expensive | High-value docs      | +9% vs simple |
| **Page-Level** | Highest consistency         | May include irrelevant content  | Multi-document types | **64.8%**     |

### NVIDIA Benchmark Results (2024)

Tested 7 chunking strategies across 5 datasets:

- **Winner**: Page-level chunking (0.648 accuracy, 0.107 std dev)
- Query type affects optimal chunk size:
  - Factoid queries: **256-512 tokens** optimal
  - Analytical queries: **1024+ tokens** needed

### Recursive Chunking Performance

```python
# RecursiveCharacterTextSplitter with 400-512 tokens
# Achieves 85-90% recall (Chroma tests)
# Up to 45% higher precision vs fixed-span methods

separators = ["\n\n", "\n", ". ", " ", ""]
chunk_size = 512
overlap = 50
```

### Best Practices by Content Type

| Content Type                        | Recommended Strategy          | Chunk Size      |
| ----------------------------------- | ----------------------------- | --------------- |
| Structured text (reports, articles) | Semantic/Recursive            | 400-512 tokens  |
| Code or technical docs              | Recursive, language-specific  | 256-512 tokens  |
| Mixed/unstructured content          | AI-driven or context-enriched | Variable        |
| Short, single-purpose docs (FAQs)   | No chunking or document-level | Full document   |
| Long, multi-topic docs              | Chunking essential            | 512-1024 tokens |

### Token Size Recommendations

| Use Case              | Recommended Size     | Rationale                        |
| --------------------- | -------------------- | -------------------------------- |
| **General RAG**       | 400-512 tokens       | Balance of context and precision |
| **Factoid Q&A**       | 256-512 tokens       | Short, focused answers           |
| **Complex reasoning** | 1024+ tokens         | More context for synthesis       |
| **Code analysis**     | Function/class level | Natural boundaries               |

### Chunk Overlap Guidelines

| Overlap    | Best For                                      |
| ---------- | --------------------------------------------- |
| **0-10%**  | Well-structured documents                     |
| **10-20%** | General text (recommended default: 50 tokens) |
| **20-30%** | Conversational or streaming content           |

---

## Hybrid Search Implementation

> BM25 + Vector search fusion for improved retrieval accuracy.

### Why Hybrid Search Works

| Method             | Strengths                                   | Weaknesses                                |
| ------------------ | ------------------------------------------- | ----------------------------------------- |
| **Sparse (BM25)**  | Exact keyword matching, fast, interpretable | Fails on semantic similarity              |
| **Dense (Vector)** | Captures semantic meaning                   | Misses exact phrases, codes, domain terms |
| **Hybrid**         | Best of both worlds                         | Requires fusion strategy                  |

**Real-world improvement**: **15-30% better recall** than either method alone.

### BM25 (Sparse Retrieval)

Scores documents by:

- Term frequency (TF)
- Inverse document frequency (IDF)
- Document length normalization

**Excellent for**: keyword-heavy queries, anchor text, structured identifiers (e.g., "1099-MISC", SKU numbers, error codes)

### Fusion Methods

#### Reciprocal Rank Fusion (RRF)

```typescript
// RRF Formula: score = sum(1 / (k + rank_i) for each ranking list)
// k is typically 60

function reciprocalRankFusion(
  rankings: Array<Array<{ id: string; rank: number }>>,
  k: number = 60,
): Map<string, number> {
  const scores = new Map<string, number>();

  for (const ranking of rankings) {
    for (const { id, rank } of ranking) {
      const currentScore = scores.get(id) || 0;
      scores.set(id, currentScore + 1 / (k + rank));
    }
  }

  return scores;
}
```

**Advantages**:

- Ignores raw scores, focuses on rank position
- Simplifies combining incompatible score scales
- Built into Elasticsearch

#### Linear Combination

```typescript
// Weighted sum of normalized scores
function linearCombination(
  vectorScores: Map<string, number>,
  bm25Scores: Map<string, number>,
  alpha: number = 0.5, // 0 = pure BM25, 1 = pure vector
): Map<string, number> {
  const combined = new Map<string, number>();

  for (const [id, vectorScore] of vectorScores) {
    const bm25Score = bm25Scores.get(id) || 0;
    combined.set(id, alpha * vectorScore + (1 - alpha) * bm25Score);
  }

  return combined;
}
```

### Three-Way Hybrid Search (Blended RAG)

Combines:

1. Full-text search (BM25)
2. Dense vector search
3. Sparse vector search (learned sparse, e.g., SPLADE)

**Result**: Outperforms both pure vector and two-way hybrid searches.

### Implementation Example for NeuroLink

```typescript
// src/lib/rag/retrieval/hybridSearch.ts

export type HybridSearchConfig = {
  /** Weight for vector search (0-1) */
  vectorWeight?: number;
  /** Weight for BM25 search (0-1) */
  bm25Weight?: number;
  /** Fusion method */
  fusionMethod?: "rrf" | "linear";
  /** RRF k parameter */
  rrfK?: number;
};

export async function hybridSearch(
  query: string,
  config: HybridSearchConfig = {},
): Promise<SearchResult[]> {
  const {
    vectorWeight = 0.5,
    bm25Weight = 0.5,
    fusionMethod = "rrf",
    rrfK = 60,
  } = config;

  // Parallel retrieval
  const [denseResults, sparseResults] = await Promise.all([
    vectorStore.search(await embed(query), 50),
    bm25Index.search(query, 50),
  ]);

  // Fusion
  let fused: SearchResult[];
  if (fusionMethod === "rrf") {
    fused = applyRRF([denseResults, sparseResults], rrfK);
  } else {
    fused = applyLinearCombination(denseResults, sparseResults, vectorWeight);
  }

  // Rerank top results
  return reranker.rerank(query, fused.slice(0, 20));
}
```

### Performance Benchmarks

| Configuration              | Recall Improvement |
| -------------------------- | ------------------ |
| Vector-only                | Baseline           |
| BM25-only                  | Variable           |
| Hybrid (RRF)               | **+15-30%**        |
| Hybrid + Reranking         | **+35-50%**        |
| Three-way hybrid + ColBERT | **+50-60%**        |

---

## Graph RAG Patterns

> Microsoft GraphRAG insights and implementation patterns.

### What is Graph RAG?

Graph RAG incorporates graph-structured data (knowledge graphs) into retrieval. Unlike baseline RAG that relies on vector search for semantically similar text, Graph RAG leverages relational structure.

**Introduced by**: Microsoft Research (2024)

### Microsoft's GraphRAG Pipeline

```
Documents -> Entity/Relationship Extraction -> Knowledge Graph
                                                    |
                                            Community Detection
                                                    |
                                            Community Summaries
                                                    |
Query -> Graph-Augmented Retrieval -> LLM Generation
```

**Key Features**:

1. LLM-automated extraction of rich knowledge graphs
2. Graph machine learning for prompt augmentation at query time
3. Hierarchical community structure with summaries
4. Reports on semantic structure before any user queries

### Why Graph RAG Outperforms Baseline RAG

| Scenario                               | Baseline RAG | Graph RAG               |
| -------------------------------------- | ------------ | ----------------------- |
| Connecting disparate information       | Struggles    | Traverses relationships |
| Schema-bound queries (KPIs, forecasts) | ~0% accuracy | **90%+ accuracy**       |
| Multi-hop reasoning                    | Often fails  | Excels                  |
| Synthesizing insights                  | Limited      | Strong                  |

### Graph RAG Use Cases

- **Regulated industries**: Financial analysis, legal research
- **Complex reasoning**: Multi-document synthesis
- **Enterprise knowledge**: Connecting siloed information
- **E-commerce support**: Product and policy relationships

### Enhanced GraphRAG Implementation

```typescript
// src/lib/rag/graph/enhancedGraphRAG.ts

import type { GraphNode, GraphEdge } from "./types.js";

/**
 * Enhanced Graph RAG with community detection
 * Based on Microsoft's GraphRAG architecture
 */
export class EnhancedGraphRAG {
  private nodes: Map<string, GraphNode> = new Map();
  private edges: Map<string, GraphEdge[]> = new Map();
  private communities: Map<string, Set<string>> = new Map();
  private communitySummaries: Map<string, string> = new Map();

  /**
   * Extract entities and relationships using LLM
   */
  async extractEntitiesAndRelations(
    text: string,
    model: AIProvider,
  ): Promise<{
    entities: Array<{ name: string; type: string; description: string }>;
    relations: Array<{ source: string; target: string; type: string }>;
  }> {
    const prompt = `Extract entities and relationships from the following text.

Text: ${text}

Return JSON with:
- entities: [{name, type, description}]
- relations: [{source, target, type}]`;

    const result = await model.generate({
      prompt,
      structuredOutput: {
        type: "json_schema",
        schema: entityRelationSchema,
      },
    });

    return JSON.parse(result.text || "{}");
  }

  /**
   * Detect communities using Leiden algorithm
   */
  detectCommunities(): void {
    // Simplified community detection
    // Production would use proper graph algorithms
    const visited = new Set<string>();
    let communityId = 0;

    for (const [nodeId] of this.nodes) {
      if (visited.has(nodeId)) continue;

      const community = new Set<string>();
      this.bfsForCommunity(nodeId, visited, community);

      if (community.size > 0) {
        this.communities.set(`community_${communityId}`, community);
        communityId++;
      }
    }
  }

  /**
   * Generate community summaries using LLM
   */
  async generateCommunitySummaries(model: AIProvider): Promise<void> {
    for (const [communityId, nodeIds] of this.communities) {
      const nodes = Array.from(nodeIds)
        .map((id) => this.nodes.get(id))
        .filter(Boolean);

      const content = nodes.map((n) => n!.content).join("\n\n");

      const summary = await model.generate({
        prompt: `Summarize the key themes and relationships in this collection of related content:\n\n${content}`,
        maxTokens: 500,
      });

      this.communitySummaries.set(communityId, summary.text || "");
    }
  }

  /**
   * Query with community-aware retrieval
   */
  async query(
    queryText: string,
    queryEmbedding: number[],
    options: {
      globalSearch?: boolean;
      localSearch?: boolean;
      topK?: number;
    } = {},
  ): Promise<{
    localResults: RankedNode[];
    globalContext: string;
  }> {
    const { globalSearch = true, localSearch = true, topK = 10 } = options;

    let localResults: RankedNode[] = [];
    let globalContext = "";

    // Local search: Traditional graph traversal
    if (localSearch) {
      localResults = this.localQuery({
        query: queryEmbedding,
        topK,
        randomWalkSteps: 100,
        restartProb: 0.15,
      });
    }

    // Global search: Use community summaries
    if (globalSearch) {
      const relevantCommunities = await this.findRelevantCommunities(
        queryText,
        queryEmbedding,
      );

      globalContext = relevantCommunities
        .map((c) => this.communitySummaries.get(c))
        .filter(Boolean)
        .join("\n\n");
    }

    return { localResults, globalContext };
  }
}
```

### Graph RAG vs Vector RAG Decision Matrix

| Factor                      | Use Vector RAG    | Use Graph RAG               |
| --------------------------- | ----------------- | --------------------------- |
| Query type                  | Factoid, simple   | Multi-hop, analytical       |
| Data structure              | Unstructured text | Interconnected entities     |
| Latency requirements        | Real-time         | Can tolerate higher latency |
| Implementation complexity   | Lower             | Higher                      |
| Accuracy on complex queries | Moderate          | High                        |

### Resources

| Resource                   | Link                                                                           |
| -------------------------- | ------------------------------------------------------------------------------ |
| GitHub Repository          | [microsoft/graphrag](https://github.com/microsoft/graphrag)                    |
| Microsoft Research Project | [Project GraphRAG](https://www.microsoft.com/en-us/research/project/graphrag/) |
| Documentation              | [GraphRAG Docs](https://microsoft.github.io/graphrag/)                         |

---

## Reranking Strategies

> Cross-encoder, ColBERT, and production reranking patterns.

### Why Reranking Matters

Rerankers are much more accurate than embedding models because:

- Bi-encoders compress all possible meanings into a single vector (information loss)
- Bi-encoders have no query context at embedding time
- Cross-encoders consider query-document interaction during scoring

**Impact**: Cross-encoder reranking improves RAG accuracy by **20-35%** but adds **200-500ms latency** per query.

### Reranking Approaches Comparison

| Approach          | Accuracy  | Latency          | Cost          | Best For                 |
| ----------------- | --------- | ---------------- | ------------- | ------------------------ |
| **Cross-Encoder** | High      | High (200-500ms) | Medium        | Production systems       |
| **ColBERT**       | High      | Medium           | Medium        | Balance speed/accuracy   |
| **Cohere Rerank** | Very High | Low-Medium       | Medium        | Enterprise, multilingual |
| **LLM-Based**     | Highest   | Very High (1s+)  | High (10-50x) | High-stakes only         |
| **FlashRank**     | Good      | Very Low         | Low           | Resource-constrained     |

### Cross-Encoders

```typescript
// Cross-encoder processes query + document together
// input = `${query} [SEP] ${document}`
// score = crossEncoder(input)  // Single relevance score

type CrossEncoderConfig = {
  modelName: string; // e.g., "ms-marco-MiniLM-L-6-v2"
  maxLength?: number;
  batchSize?: number;
};

async function crossEncoderRerank(
  query: string,
  documents: string[],
  config: CrossEncoderConfig,
): Promise<Array<{ index: number; score: number }>> {
  const inputs = documents.map((doc) => `${query} [SEP] ${doc}`);

  // Process in batches
  const scores: number[] = [];
  for (let i = 0; i < inputs.length; i += config.batchSize || 32) {
    const batch = inputs.slice(i, i + config.batchSize || 32);
    const batchScores = await model.score(batch);
    scores.push(...batchScores);
  }

  return scores
    .map((score, index) => ({ index, score }))
    .sort((a, b) => b.score - a.score);
}
```

**Challenge**: Thousands of queries/second = significant GPU usage

**Popular models**: ms-marco-MiniLM-L-6-v2, BGE-reranker-large

### ColBERT (Late Interaction)

```
Query -> [Q1, Q2, Q3, ...]  (token embeddings)
Doc   -> [D1, D2, D3, ...]  (pre-computed token embeddings)
Score = MaxSim(Q, D)         (late interaction)
```

**Advantages**:

- Balances bi-encoder efficiency with cross-encoder accuracy
- Pre-computes document representations
- Enhances query-document token interaction at search time

```typescript
// ColBERT scoring implementation concept
function colbertScore(
  queryEmbeddings: number[][], // [numQueryTokens, dim]
  docEmbeddings: number[][], // [numDocTokens, dim]
): number {
  let score = 0;

  // MaxSim: for each query token, find max similarity with any doc token
  for (const queryEmb of queryEmbeddings) {
    let maxSim = -Infinity;
    for (const docEmb of docEmbeddings) {
      const sim = cosineSimilarity(queryEmb, docEmb);
      maxSim = Math.max(maxSim, sim);
    }
    score += maxSim;
  }

  return score / queryEmbeddings.length;
}
```

### Cohere Rerank

**Features**:

- Supports **100+ languages**
- Handles complex enterprise formats: emails, tables, JSON, code
- Private deployment options (VPC, on-premises)
- "Rerank 3 Nimble" for faster production performance

```typescript
// Cohere Rerank integration
import { CohereClient } from "cohere-ai";

async function cohereRerank(
  query: string,
  documents: string[],
  topK: number = 10,
): Promise<Array<{ index: number; score: number }>> {
  const cohere = new CohereClient({ apiKey: process.env.COHERE_API_KEY });

  const response = await cohere.rerank({
    model: "rerank-v3.5",
    query,
    documents,
    topN: topK,
  });

  return response.results.map((r) => ({
    index: r.index,
    score: r.relevanceScore,
  }));
}
```

### LLM-Based Reranking

```typescript
// Use only for high-value, low-volume queries
async function llmRerank(
  query: string,
  documents: string[],
  model: AIProvider,
): Promise<Array<{ index: number; score: number }>> {
  const scores: Array<{ index: number; score: number }> = [];

  for (let i = 0; i < documents.length; i++) {
    const prompt = `Rate the relevance of this document to the query on a scale of 0-10.

Query: ${query}

Document: ${documents[i].slice(0, 1000)}

Respond with only a number.`;

    const result = await model.generate({ prompt, maxTokens: 5 });
    const score = parseFloat(result.text || "0") / 10;
    scores.push({ index: i, score });
  }

  return scores.sort((a, b) => b.score - a.score);
}
```

**Use only when**:

- Queries are rare and high-value
- Research/legal deep dives
- Accuracy justifies 10-50x higher costs

### Reranking Models Summary

| Model                  | Parameters | License    | Key Feature                |
| ---------------------- | ---------- | ---------- | -------------------------- |
| ms-marco-MiniLM-L-6-v2 | 22M        | MIT        | Fast, general-purpose      |
| BGE-reranker-large     | 560M       | MIT        | Multilingual               |
| Cohere Rerank 3.5      | -          | Commercial | 100+ languages, enterprise |
| mxbai-rerank-large-v2  | 1.5B       | Apache 2.0 | RL-trained                 |
| FlashRank              | Small      | -          | Ultra-lightweight          |

### Production Recommendations

1. **Rerank top 20-50 documents** down to 5-10 for LLM
2. **Start with**: ms-marco-MiniLM-L-6-v2 (fast, accurate, well-tested)
3. **Upgrade to**: BGE-reranker-large for multilingual
4. **Enterprise**: Cohere Rerank for SLA requirements

### Enhanced Reranker Implementation for NeuroLink

```typescript
// src/lib/rag/reranker/enhancedReranker.ts

export type RerankerType = "cross-encoder" | "colbert" | "cohere" | "llm";

export type EnhancedRerankerConfig = {
  type: RerankerType;
  modelName?: string;
  topK?: number;
  minScore?: number;
  weights?: {
    semantic?: number;
    vector?: number;
    position?: number;
  };
};

export class EnhancedReranker {
  constructor(private config: EnhancedRerankerConfig) {}

  async rerank(
    query: string,
    results: QueryResult[],
    queryEmbedding?: number[],
  ): Promise<RerankResult[]> {
    switch (this.config.type) {
      case "cross-encoder":
        return this.crossEncoderRerank(query, results);
      case "colbert":
        return this.colbertRerank(query, results, queryEmbedding);
      case "cohere":
        return this.cohereRerank(query, results);
      case "llm":
        return this.llmRerank(query, results);
      default:
        throw new Error(`Unknown reranker type: ${this.config.type}`);
    }
  }

  private async crossEncoderRerank(
    query: string,
    results: QueryResult[],
  ): Promise<RerankResult[]> {
    // Implementation using transformers.js or similar
    const documents = results.map((r) => r.metadata?.text || r.text || "");
    const scores = await this.scoreCrossEncoder(query, documents);

    return scores
      .map((score, i) => ({
        result: results[i],
        score,
        details: {
          semantic: score,
          vector: results[i].score || 0,
          position: 1 - i / results.length,
        },
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, this.config.topK || 10);
  }
}
```

---

## Updated Architecture

> Refined architecture based on 2024-2025 research findings.

### State-of-the-Art RAG Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER QUERY                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    QUERY TRANSFORMATION                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │Multi-Query│  │   HyDE   │  │Step-Back │  │Query Decomposition│ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     HYBRID RETRIEVAL                             │
│  ┌─────────────────┐              ┌─────────────────┐           │
│  │  Dense Vector   │              │   Sparse BM25   │           │
│  │    (HNSW)       │              │   (Keywords)    │           │
│  └─────────────────┘              └─────────────────┘           │
│                    \              /                              │
│                     ▼            ▼                               │
│               ┌─────────────────────┐                           │
│               │  Reciprocal Rank    │                           │
│               │     Fusion (RRF)    │                           │
│               └─────────────────────┘                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       RERANKING                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Cross-Encoder / Cohere Rerank / ColBERT                │    │
│  │  Top 50 -> Top 10 documents                             │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  CONTEXT OPTIMIZATION                            │
│  • Token budget management                                       │
│  • Relevance filtering                                           │
│  • Context compression                                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       GENERATION                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  LLM with structured output                             │    │
│  │  + Source attribution                                   │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Updated File Structure

```
src/lib/rag/
├── index.ts                          # Main exports
├── MDocument.ts                      # Main document class
├── chunkers/
│   ├── index.ts                      # Chunker exports
│   ├── types.ts                      # Chunker types
│   ├── configs.ts                    # Strategy configurations
│   ├── chunkerRegistry.ts            # Strategy registry
│   ├── characterChunker.ts           # Character-based chunking
│   ├── recursiveChunker.ts           # Recursive chunking
│   ├── sentenceChunker.ts            # Sentence-aware chunking
│   ├── tokenChunker.ts               # Token-based chunking
│   ├── markdownChunker.ts            # Markdown structure chunking
│   ├── htmlChunker.ts                # HTML structure chunking
│   ├── jsonChunker.ts                # JSON structure chunking
│   ├── latexChunker.ts               # LaTeX structure chunking
│   ├── semanticMarkdownChunker.ts    # LLM-based semantic chunking
│   └── lateChunker.ts                # NEW: Late chunking implementation
├── extractors/
│   ├── index.ts                      # Extractor exports
│   ├── types.ts                      # Extractor types
│   └── metadataExtractor.ts          # LLM metadata extraction
├── retrieval/                        # NEW: Retrieval strategies
│   ├── index.ts                      # Retrieval exports
│   ├── hybridSearch.ts               # BM25 + Vector hybrid
│   ├── bm25Index.ts                  # BM25 sparse retrieval
│   ├── queryTransformer.ts           # HyDE, Multi-Query, Step-Back
│   └── contextOptimizer.ts           # Token budget management
├── tools/
│   ├── index.ts                      # Tool exports
│   ├── vectorQueryTool.ts            # Vector query tool types
│   ├── vectorQueryToolImpl.ts        # Vector query implementation
│   └── graphRAGTool.ts               # Graph RAG tool
├── graph/
│   ├── index.ts                      # Graph exports
│   ├── types.ts                      # Graph types
│   ├── graphRAG.ts                   # Graph RAG implementation
│   └── enhancedGraphRAG.ts           # NEW: Microsoft-style GraphRAG
├── reranker/
│   ├── index.ts                      # Reranker exports
│   ├── reranker.ts                   # Base reranking implementation
│   ├── crossEncoderReranker.ts       # NEW: Cross-encoder reranking
│   ├── colbertReranker.ts            # NEW: ColBERT late interaction
│   └── cohereReranker.ts             # NEW: Cohere Rerank integration
├── filters/
│   ├── index.ts                      # Filter exports
│   ├── types.ts                      # Filter types
│   └── metadataFilter.ts             # Metadata filter translator
├── evaluation/                       # NEW: RAG evaluation
│   ├── index.ts                      # Evaluation exports
│   ├── ragasMetrics.ts               # RAGAS-style metrics
│   └── evaluationPipeline.ts         # End-to-end evaluation
└── types/
    └── index.ts                      # Consolidated type exports
```

### Key Architecture Improvements

#### 1. Query Transformation Layer

```typescript
// src/lib/rag/retrieval/queryTransformer.ts

export type QueryTransformerConfig = {
  strategy: "multi-query" | "hyde" | "step-back" | "decomposition" | "adaptive";
  model?: AIProvider;
  numQueries?: number;
};

export class QueryTransformer {
  async transform(
    query: string,
    config: QueryTransformerConfig,
  ): Promise<string[]> {
    switch (config.strategy) {
      case "multi-query":
        return this.generateMultipleQueries(query, config.numQueries || 3);
      case "hyde":
        return [await this.generateHypotheticalDocument(query)];
      case "step-back":
        return [await this.generateStepBackQuestion(query), query];
      case "decomposition":
        return this.decomposeQuery(query);
      case "adaptive":
        return this.selectAdaptiveStrategy(query);
      default:
        return [query];
    }
  }
}
```

#### 2. Hybrid Retrieval with BM25

```typescript
// src/lib/rag/retrieval/hybridSearch.ts

export class HybridRetriever {
  private vectorStore: VectorStore;
  private bm25Index: BM25Index;
  private reranker: EnhancedReranker;

  async retrieve(
    query: string,
    options: HybridRetrievalOptions,
  ): Promise<RetrievalResult[]> {
    // 1. Query transformation
    const queries = await this.queryTransformer.transform(
      query,
      options.transformConfig,
    );

    // 2. Parallel retrieval
    const allResults = await Promise.all(
      queries.map(async (q) => {
        const [vectorResults, bm25Results] = await Promise.all([
          this.vectorStore.search(await this.embed(q), options.topK),
          this.bm25Index.search(q, options.topK),
        ]);
        return { vectorResults, bm25Results };
      }),
    );

    // 3. Fusion
    const fused = this.reciprocalRankFusion(allResults);

    // 4. Reranking
    const reranked = await this.reranker.rerank(query, fused);

    // 5. Context optimization
    return this.contextOptimizer.optimize(reranked, options.maxTokens);
  }
}
```

#### 3. RAGAS-Style Evaluation

```typescript
// src/lib/rag/evaluation/ragasMetrics.ts

export type RAGASMetrics = {
  faithfulness: number; // Factual accuracy vs retrieved docs
  answerRelevancy: number; // Proportion of response relevant to input
  contextPrecision: number; // Precision of retrieved docs for query
  contextRecall: number; // Coverage of relevant information
  answerCorrectness: number; // Overall answer quality
};

export class RAGEvaluator {
  async evaluate(
    query: string,
    answer: string,
    contexts: string[],
    groundTruth?: string,
  ): Promise<RAGASMetrics> {
    const [faithfulness, relevancy, precision, recall] = await Promise.all([
      this.calculateFaithfulness(answer, contexts),
      this.calculateAnswerRelevancy(query, answer),
      this.calculateContextPrecision(query, contexts),
      this.calculateContextRecall(query, contexts, groundTruth),
    ]);

    return {
      faithfulness,
      answerRelevancy: relevancy,
      contextPrecision: precision,
      contextRecall: recall,
      answerCorrectness: (faithfulness + relevancy) / 2,
    };
  }
}
```

### Performance Targets

| Metric              | Target | Measurement              |
| ------------------- | ------ | ------------------------ |
| Retrieval Precision | >85%   | RAGAS context precision  |
| Faithfulness        | >90%   | RAGAS faithfulness score |
| Answer Relevancy    | >85%   | RAGAS answer relevancy   |
| Latency (P95)       | <3s    | End-to-end response time |
| Cost per query      | <$0.05 | Token + compute costs    |

### Phased Implementation Approach

#### Phase 1: MVP (Week 1-2)

1. Basic vector search with OpenAI embeddings
2. Fixed-size chunking (512 tokens)
3. Simple prompt template
4. Chroma for prototyping

**Expected performance**: 60-70% accuracy

#### Phase 2: Production (Week 3-4)

1. Hybrid search (dense + BM25)
2. Recursive chunking
3. Add reranking (cross-encoder)
4. Move to Qdrant/Weaviate

**Expected performance**: 80-85% accuracy

#### Phase 3: Optimization (Week 5-8)

1. Query expansion (HyDE, multi-query)
2. Semantic chunking for high-value docs
3. Graph RAG for complex reasoning
4. Custom evaluation pipeline

**Expected performance**: 90%+ accuracy

### Technology Selection Guide

| Requirement               | Recommendation                |
| ------------------------- | ----------------------------- |
| **Fastest time-to-value** | LangChain + Chroma + OpenAI   |
| **Best accuracy**         | LlamaIndex + Qdrant + Cohere  |
| **Open source only**      | Haystack + Milvus + BGE-M3    |
| **Enterprise scale**      | LangGraph + Pinecone + OpenAI |
| **Complex reasoning**     | Microsoft GraphRAG            |

---

## Research References

### Research Papers

1. [Enhancing Retrieval-Augmented Generation: A Study of Best Practices (2025)](https://arxiv.org/abs/2501.07391)
2. [Searching for Best Practices in Retrieval-Augmented Generation (2024)](https://arxiv.org/abs/2407.01219)
3. [A Systematic Review of Key RAG Systems](https://arxiv.org/html/2507.18910v1)
4. [Late Chunking: Contextual Chunk Embeddings](https://arxiv.org/abs/2409.04701)
5. [Agentic Retrieval-Augmented Generation: A Survey](https://arxiv.org/html/2501.09136v3)

### Vector Database Resources

- [Qdrant Benchmarks 2024](https://qdrant.tech/benchmarks/)
- [VectorDBBench GitHub](https://github.com/zilliztech/VectorDBBench)
- [pgvector 150x Speedup](https://jkatz05.com/post/postgres/pgvector-performance-150x-speedup/)

### Graph RAG

- [Project GraphRAG - Microsoft Research](https://www.microsoft.com/en-us/research/project/graphrag/)
- [GitHub - microsoft/graphrag](https://github.com/microsoft/graphrag)

### Reranking

- [Rerankers and Two-Stage Retrieval - Pinecone](https://www.pinecone.io/learn/series/rag/rerankers/)
- [Mastering RAG: How to Select A Reranking Model - Galileo](https://galileo.ai/blog/mastering-rag-how-to-select-a-reranking-model)

### Chunking

- [Chunking Strategies for RAG - Weaviate](https://weaviate.io/blog/chunking-strategies-for-rag)
- [Late Chunking in Long-Context Embedding Models - Jina AI](https://jina.ai/news/late-chunking-in-long-context-embedding-models/)
