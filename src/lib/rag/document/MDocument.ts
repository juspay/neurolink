/**
 * MDocument - Main Document Processing Class
 *
 * Provides a fluent interface for document processing using the Factory + Registry pattern.
 * Supports various document types, chunking strategies, and metadata extraction.
 *
 * @example
 * ```typescript
 * const doc = await MDocument.fromText(content);
 * const chunks = await doc.chunk({
 *   strategy: 'recursive',
 *   config: { maxSize: 1000, overlap: 200 }
 * });
 * const enriched = await doc.extractMetadata({
 *   title: true,
 *   summary: true,
 *   keywords: true
 * });
 * ```
 */

import { randomUUID } from "crypto";
import { logger } from "../../utils/logger.js";
import { ChunkerRegistry } from "../chunking/chunkerRegistry.js";
import { LLMMetadataExtractor } from "../metadata/metadataExtractor.js";
import type {
  BaseChunkerConfig,
  Chunk,
  ChunkingStrategy,
  ChunkParams,
  DocumentType,
  ExtractParams,
  MDocumentConfig,
} from "../types.js";

/**
 * Document processing state
 */
type DocumentState = {
  /** Raw document content */
  content: string;
  /** Document type */
  type: DocumentType;
  /** Document metadata */
  metadata: Record<string, unknown>;
  /** Generated chunks (after chunking) */
  chunks: Chunk[];
  /** Document embeddings (after embedding) */
  embeddings: number[][];
  /** Processing history */
  history: string[];
};

/**
 * MDocument class for comprehensive document processing
 *
 * Provides a chainable API for:
 * - Loading documents from various sources
 * - Chunking with multiple strategies
 * - Metadata extraction using LLMs
 * - Embedding generation
 */
export class MDocument {
  private state: DocumentState;
  private documentId: string;

  /**
   * Create a new MDocument instance
   * @param content - Document content
   * @param config - Document configuration
   */
  constructor(content: string, config?: MDocumentConfig) {
    this.documentId = randomUUID();
    this.state = {
      content,
      type: config?.type ?? "text",
      metadata: {
        ...config?.metadata,
        documentId: this.documentId,
        createdAt: new Date().toISOString(),
      },
      chunks: [],
      embeddings: [],
      history: ["created"],
    };
  }

  // ============================================================================
  // Static Factory Methods
  // ============================================================================

  /**
   * Create MDocument from plain text
   * @param text - Plain text content
   * @param metadata - Optional metadata
   * @returns MDocument instance
   */
  static fromText(text: string, metadata?: Record<string, unknown>): MDocument {
    return new MDocument(text, { type: "text", metadata });
  }

  /**
   * Create MDocument from markdown content
   * @param markdown - Markdown content
   * @param metadata - Optional metadata
   * @returns MDocument instance
   */
  static fromMarkdown(
    markdown: string,
    metadata?: Record<string, unknown>,
  ): MDocument {
    return new MDocument(markdown, { type: "markdown", metadata });
  }

  /**
   * Create MDocument from HTML content
   * @param html - HTML content
   * @param metadata - Optional metadata
   * @returns MDocument instance
   */
  static fromHTML(html: string, metadata?: Record<string, unknown>): MDocument {
    return new MDocument(html, { type: "html", metadata });
  }

  /**
   * Create MDocument from JSON content
   * @param json - JSON string or object
   * @param metadata - Optional metadata
   * @returns MDocument instance
   */
  static fromJSONContent(
    json: string | object,
    metadata?: Record<string, unknown>,
  ): MDocument {
    const content =
      typeof json === "string" ? json : JSON.stringify(json, null, 2);
    return new MDocument(content, { type: "json", metadata });
  }

  /**
   * Create MDocument from LaTeX content
   * @param latex - LaTeX content
   * @param metadata - Optional metadata
   * @returns MDocument instance
   */
  static fromLaTeX(
    latex: string,
    metadata?: Record<string, unknown>,
  ): MDocument {
    return new MDocument(latex, { type: "latex", metadata });
  }

  /**
   * Create MDocument from CSV content
   * @param csv - CSV content
   * @param metadata - Optional metadata
   * @returns MDocument instance
   */
  static fromCSV(csv: string, metadata?: Record<string, unknown>): MDocument {
    return new MDocument(csv, { type: "csv", metadata });
  }

  // ============================================================================
  // Core Processing Methods
  // ============================================================================

  /**
   * Chunk the document using specified strategy
   * @param params - Chunking parameters
   * @returns This MDocument instance (for chaining)
   */
  async chunk(params?: ChunkParams): Promise<MDocument> {
    const { strategy = this.getDefaultStrategy(), config = {} } = params || {};

    logger.debug("[MDocument] Chunking document", {
      documentId: this.documentId,
      strategy,
      contentLength: this.state.content.length,
    });

    const chunker = ChunkerRegistry.get(strategy);

    // Merge document metadata into chunk config
    const chunkConfig: BaseChunkerConfig = {
      ...config,
      metadata: {
        ...config.metadata,
        source: this.state.metadata.source,
        documentType: this.state.type,
      },
    };

    this.state.chunks = await chunker.chunk(this.state.content, chunkConfig);
    this.state.history.push(`chunked:${strategy}`);

    logger.info("[MDocument] Document chunked", {
      documentId: this.documentId,
      strategy,
      chunkCount: this.state.chunks.length,
    });

    return this;
  }

  /**
   * Extract metadata from chunks using LLM
   * @param params - Extraction parameters
   * @param options - Extractor options
   * @returns This MDocument instance (for chaining)
   */
  async extractMetadata(
    params: ExtractParams,
    options?: { provider?: string; modelName?: string },
  ): Promise<MDocument> {
    if (this.state.chunks.length === 0) {
      logger.warn(
        "[MDocument] No chunks to extract metadata from. Call chunk() first.",
      );
      return this;
    }

    logger.debug("[MDocument] Extracting metadata", {
      documentId: this.documentId,
      chunkCount: this.state.chunks.length,
      params: Object.keys(params),
    });

    const extractor = new LLMMetadataExtractor(options);
    const results = await extractor.extract(this.state.chunks, params);

    // Merge extraction results into chunk metadata
    for (let i = 0; i < this.state.chunks.length && i < results.length; i++) {
      const result = results[i];
      if (result.title) {
        this.state.chunks[i].metadata.title = result.title;
      }
      if (result.summary) {
        this.state.chunks[i].metadata.summary = result.summary;
      }
      if (result.keywords) {
        this.state.chunks[i].metadata.keywords = result.keywords;
      }
      if (result.custom) {
        this.state.chunks[i].metadata.custom = {
          ...(this.state.chunks[i].metadata.custom || {}),
          ...result.custom,
        };
      }
    }

    this.state.history.push(`metadata:${Object.keys(params).join(",")}`);

    logger.info("[MDocument] Metadata extracted", {
      documentId: this.documentId,
      extractedFields: Object.keys(params),
    });

    return this;
  }

  /**
   * Generate embeddings for all chunks
   * @param provider - Embedding provider name
   * @param modelName - Embedding model name
   * @returns This MDocument instance (for chaining)
   */
  async embed(
    provider: string = "openai",
    modelName: string = "text-embedding-3-small",
  ): Promise<MDocument> {
    if (this.state.chunks.length === 0) {
      logger.warn("[MDocument] No chunks to embed. Call chunk() first.");
      return this;
    }

    // Lazy import to avoid circular dependencies
    const { ProviderFactory } = await import(
      "../../factories/providerFactory.js"
    );

    logger.debug("[MDocument] Generating embeddings", {
      documentId: this.documentId,
      chunkCount: this.state.chunks.length,
      provider,
      model: modelName,
    });

    const embeddingProvider = await ProviderFactory.createProvider(
      provider,
      modelName,
    );

    if (
      typeof (embeddingProvider as unknown as { embed?: unknown }).embed !==
      "function"
    ) {
      throw new Error(`Provider ${provider} does not support embeddings`);
    }

    this.state.embeddings = [];

    for (const chunk of this.state.chunks) {
      const embedding = await (
        embeddingProvider as unknown as {
          embed: (s: string) => Promise<number[]>;
        }
      ).embed(chunk.text);
      this.state.embeddings.push(embedding);
      chunk.embedding = embedding;
    }

    this.state.history.push(`embedded:${provider}:${modelName}`);

    logger.info("[MDocument] Embeddings generated", {
      documentId: this.documentId,
      embeddingCount: this.state.embeddings.length,
      dimension: this.state.embeddings[0]?.length,
    });

    return this;
  }

  // ============================================================================
  // Accessor Methods
  // ============================================================================

  /**
   * Get document ID
   */
  getId(): string {
    return this.documentId;
  }

  /**
   * Get raw document content
   */
  getContent(): string {
    return this.state.content;
  }

  /**
   * Get document type
   */
  getType(): DocumentType {
    return this.state.type;
  }

  /**
   * Get document metadata
   */
  getMetadata(): Record<string, unknown> {
    return { ...this.state.metadata };
  }

  /**
   * Get processed chunks
   */
  getChunks(): Chunk[] {
    return [...this.state.chunks];
  }

  /**
   * Get chunk embeddings
   */
  getEmbeddings(): number[][] {
    return [...this.state.embeddings];
  }

  /**
   * Get processing history
   */
  getHistory(): string[] {
    return [...this.state.history];
  }

  /**
   * Check if document has been chunked
   */
  isChunked(): boolean {
    return this.state.chunks.length > 0;
  }

  /**
   * Check if document has embeddings
   */
  hasEmbeddings(): boolean {
    return this.state.embeddings.length > 0;
  }

  /**
   * Get chunk count
   */
  getChunkCount(): number {
    return this.state.chunks.length;
  }

  // ============================================================================
  // Transformation Methods
  // ============================================================================

  /**
   * Set document metadata
   * @param key - Metadata key
   * @param value - Metadata value
   * @returns This MDocument instance (for chaining)
   */
  setMetadata(key: string, value: unknown): MDocument {
    this.state.metadata[key] = value;
    return this;
  }

  /**
   * Merge metadata into document
   * @param metadata - Metadata to merge
   * @returns This MDocument instance (for chaining)
   */
  mergeMetadata(metadata: Record<string, unknown>): MDocument {
    this.state.metadata = { ...this.state.metadata, ...metadata };
    return this;
  }

  /**
   * Filter chunks based on predicate
   * @param predicate - Filter function
   * @returns New MDocument with filtered chunks
   */
  filterChunks(predicate: (chunk: Chunk) => boolean): MDocument {
    const doc = new MDocument(this.state.content, {
      type: this.state.type,
      metadata: this.state.metadata,
    });
    doc.state.chunks = this.state.chunks.filter(predicate);
    doc.state.embeddings = this.state.embeddings.filter((_, i) =>
      predicate(this.state.chunks[i]),
    );
    doc.state.history = [...this.state.history, "filtered"];
    return doc;
  }

  /**
   * Map transformation over chunks
   * @param transform - Transform function
   * @returns New MDocument with transformed chunks
   */
  mapChunks(transform: (chunk: Chunk) => Chunk): MDocument {
    const doc = new MDocument(this.state.content, {
      type: this.state.type,
      metadata: this.state.metadata,
    });
    doc.state.chunks = this.state.chunks.map(transform);
    doc.state.embeddings = [...this.state.embeddings];
    doc.state.history = [...this.state.history, "mapped"];
    return doc;
  }

  // ============================================================================
  // Serialization Methods
  // ============================================================================

  /**
   * Convert to plain object for serialization
   */
  toJSON(): {
    id: string;
    content: string;
    type: DocumentType;
    metadata: Record<string, unknown>;
    chunks: Chunk[];
    history: string[];
  } {
    return {
      id: this.documentId,
      content: this.state.content,
      type: this.state.type,
      metadata: this.state.metadata,
      chunks: this.state.chunks,
      history: this.state.history,
    };
  }

  /**
   * Create MDocument from serialized JSON
   * @param json - Serialized document data
   * @returns MDocument instance
   */
  static fromJSON(json: {
    id?: string;
    content: string;
    type: DocumentType;
    metadata?: Record<string, unknown>;
    chunks?: Chunk[];
    history?: string[];
  }): MDocument {
    const doc = new MDocument(json.content, {
      type: json.type,
      metadata: json.metadata,
    });
    if (json.id) {
      doc.documentId = json.id;
    }
    if (json.chunks) {
      doc.state.chunks = json.chunks;
    }
    if (json.history) {
      doc.state.history = json.history;
    }
    return doc;
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Get default chunking strategy based on document type
   */
  private getDefaultStrategy(): ChunkingStrategy {
    return ChunkerRegistry.getRecommendedStrategy(this.state.type);
  }
}
