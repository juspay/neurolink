/**
 * Chunker Factory
 *
 * Factory for creating chunker instances with configuration.
 * Follows the BaseFactory pattern for consistent lifecycle management.
 */

import { BaseFactory } from "../core/infrastructure/index.js";
import { logger } from "../utils/logger.js";
import { ChunkingError, RAGErrorCodes } from "./errors/RAGError.js";
import type {
  Chunker,
  ChunkerConfig,
  ChunkerMetadata,
  ChunkingStrategy,
} from "./types.js";

/**
 * Default chunker metadata entries
 */
const DEFAULT_CHUNKER_METADATA: Record<ChunkingStrategy, ChunkerMetadata> = {
  character: {
    description:
      "Splits text into fixed-size character chunks with optional overlap",
    defaultConfig: { maxSize: 1000, overlap: 100 },
    supportedOptions: ["maxSize", "overlap", "minSize"],
    useCases: ["Simple text processing", "Fixed-size chunks needed"],
    aliases: ["char", "fixed-size", "fixed"],
  },
  recursive: {
    description: "Recursively splits text using ordered separators",
    defaultConfig: {
      maxSize: 1000,
      overlap: 100,
      separators: ["\n\n", "\n", ". ", " ", ""],
    },
    supportedOptions: ["maxSize", "overlap", "separators", "keepSeparators"],
    useCases: ["General text documents", "Default choice"],
    aliases: ["recursive-character", "langchain-default"],
  },
  sentence: {
    description: "Splits text by sentence boundaries",
    defaultConfig: { maxSize: 1000, overlap: 1 },
    supportedOptions: [
      "maxSize",
      "overlap",
      "boundaryDetection",
      "maxSentences",
    ],
    useCases: ["Q&A applications", "Sentence-level analysis"],
    aliases: ["sent", "sentence-based"],
  },
  token: {
    description: "Splits text by token count using a specific tokenizer",
    defaultConfig: { maxSize: 512, overlap: 50 },
    supportedOptions: ["maxSize", "overlap", "tokenizer", "maxTokens"],
    useCases: ["Token-aware splitting", "Model-specific chunks"],
    aliases: ["tok", "tokenized"],
  },
  markdown: {
    description: "Splits markdown content by headers and structural elements",
    defaultConfig: { maxSize: 1000, overlap: 50 },
    supportedOptions: ["maxSize", "headerLevels", "splitCodeBlocks"],
    useCases: ["Documentation processing", "README files"],
    aliases: ["md", "markdown-header"],
  },
  html: {
    description: "Splits HTML content by semantic tags",
    defaultConfig: { maxSize: 1000, overlap: 0 },
    supportedOptions: [
      "maxSize",
      "splitTags",
      "stripTags",
      "preserveAttributes",
    ],
    useCases: ["Web content processing", "HTML documents"],
    aliases: ["html-tag", "web"],
  },
  json: {
    description: "Splits JSON documents by object boundaries",
    defaultConfig: { maxSize: 1000, overlap: 0 },
    supportedOptions: ["maxSize", "maxDepth", "chunkKeys"],
    useCases: ["API response processing", "Structured data"],
    aliases: ["json-object", "structured"],
  },
  latex: {
    description: "Splits LaTeX documents by sections and environments",
    defaultConfig: { maxSize: 1000, overlap: 0 },
    supportedOptions: ["maxSize", "environments", "splitMathBlocks"],
    useCases: ["Academic papers", "Scientific documents"],
    aliases: ["tex", "latex-section"],
  },
  semantic: {
    description: "Uses LLM to identify semantically meaningful split points",
    defaultConfig: { maxSize: 1000, overlap: 100 },
    supportedOptions: [
      "maxSize",
      "modelName",
      "provider",
      "similarityThreshold",
    ],
    useCases: ["Advanced semantic understanding", "AI-enhanced chunking"],
    aliases: ["llm", "ai-semantic"],
  },
  "semantic-markdown": {
    description: "Combines markdown splitting with semantic similarity",
    defaultConfig: { maxSize: 1000, overlap: 100 },
    supportedOptions: ["maxSize", "similarityThreshold", "maxMergeSize"],
    useCases: ["Context-aware documentation", "Knowledge bases"],
    aliases: ["semantic-md", "smart-markdown"],
  },
};

/**
 * Chunker Factory
 *
 * Creates chunker instances based on strategy with configuration support.
 * Uses lazy loading via dynamic imports to avoid circular dependencies.
 */
export class ChunkerFactory extends BaseFactory<Chunker, ChunkerConfig> {
  private static instance: ChunkerFactory | null = null;
  private metadataMap = new Map<string, ChunkerMetadata>();

  private constructor() {
    super();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ChunkerFactory {
    if (!ChunkerFactory.instance) {
      ChunkerFactory.instance = new ChunkerFactory();
    }
    return ChunkerFactory.instance;
  }

  /**
   * Reset singleton (for testing)
   */
  static resetInstance(): void {
    if (ChunkerFactory.instance) {
      ChunkerFactory.instance.clear();
      ChunkerFactory.instance = null;
    }
  }

  /**
   * Register all default chunkers
   */
  protected async registerAll(): Promise<void> {
    // Register character chunker
    this.registerChunker(
      "character",
      async (config?: ChunkerConfig) => {
        const { CharacterChunker } = await import(
          "./chunkers/CharacterChunker.js"
        );
        return new CharacterChunker(config);
      },
      DEFAULT_CHUNKER_METADATA.character,
    );

    // Register recursive chunker
    this.registerChunker(
      "recursive",
      async (config?: ChunkerConfig) => {
        const { RecursiveChunker } = await import(
          "./chunkers/RecursiveChunker.js"
        );
        return new RecursiveChunker(config);
      },
      DEFAULT_CHUNKER_METADATA.recursive,
    );

    // Register sentence chunker
    this.registerChunker(
      "sentence",
      async (config?: ChunkerConfig) => {
        const { SentenceChunker } = await import(
          "./chunkers/SentenceChunker.js"
        );
        return new SentenceChunker(config);
      },
      DEFAULT_CHUNKER_METADATA.sentence,
    );

    // Register token chunker
    this.registerChunker(
      "token",
      async (config?: ChunkerConfig) => {
        const { TokenChunker } = await import("./chunkers/TokenChunker.js");
        return new TokenChunker(config);
      },
      DEFAULT_CHUNKER_METADATA.token,
    );

    // Register markdown chunker
    this.registerChunker(
      "markdown",
      async (config?: ChunkerConfig) => {
        const { MarkdownChunker } = await import(
          "./chunkers/MarkdownChunker.js"
        );
        return new MarkdownChunker(config);
      },
      DEFAULT_CHUNKER_METADATA.markdown,
    );

    // Register HTML chunker
    this.registerChunker(
      "html",
      async (config?: ChunkerConfig) => {
        const { HTMLChunker } = await import("./chunkers/HTMLChunker.js");
        return new HTMLChunker(config);
      },
      DEFAULT_CHUNKER_METADATA.html,
    );

    // Register JSON chunker
    this.registerChunker(
      "json",
      async (config?: ChunkerConfig) => {
        const { JSONChunker } = await import("./chunkers/JSONChunker.js");
        return new JSONChunker(config);
      },
      DEFAULT_CHUNKER_METADATA.json,
    );

    // Register LaTeX chunker
    this.registerChunker(
      "latex",
      async (config?: ChunkerConfig) => {
        const { LaTeXChunker } = await import("./chunkers/LaTeXChunker.js");
        return new LaTeXChunker(config);
      },
      DEFAULT_CHUNKER_METADATA.latex,
    );

    // Register semantic chunker (placeholder - uses recursive as fallback)
    this.registerChunker(
      "semantic",
      async (config?: ChunkerConfig) => {
        // TODO: Implement dedicated SemanticChunker with LLM support
        // For now, fall back to RecursiveChunker with semantic defaults
        const { RecursiveChunker } = await import(
          "./chunkers/RecursiveChunker.js"
        );
        return new RecursiveChunker(config);
      },
      DEFAULT_CHUNKER_METADATA.semantic,
    );

    // Register semantic-markdown chunker
    this.registerChunker(
      "semantic-markdown",
      async (config?: ChunkerConfig) => {
        const { SemanticMarkdownChunker } = await import(
          "./chunkers/SemanticMarkdownChunker.js"
        );
        return new SemanticMarkdownChunker(config);
      },
      DEFAULT_CHUNKER_METADATA["semantic-markdown"],
    );

    logger.debug(
      `[ChunkerFactory] Registered ${this.items.size} chunking strategies`,
    );
  }

  /**
   * Register a chunker with metadata and aliases
   */
  registerChunker(
    strategy: ChunkingStrategy | string,
    factory: (config?: ChunkerConfig) => Promise<Chunker>,
    metadata: ChunkerMetadata,
  ): void {
    // Store metadata
    this.metadataMap.set(strategy, metadata);

    // Register with aliases
    this.register(strategy, factory, metadata.aliases, { metadata });

    logger.debug(
      `[ChunkerFactory] Registered chunker '${strategy}' with aliases: ${metadata.aliases?.join(", ") ?? "none"}`,
    );
  }

  /**
   * Create a chunker by strategy name or alias
   */
  async createChunker(
    strategyOrAlias: string,
    config?: ChunkerConfig,
  ): Promise<Chunker> {
    await this.ensureInitialized();

    const resolvedName = this.resolveName(strategyOrAlias);

    if (!this.has(resolvedName)) {
      const available = this.getAvailable();
      throw new ChunkingError(
        `Unknown chunking strategy: '${strategyOrAlias}'. Available strategies: ${available.join(", ")}`,
        {
          code: RAGErrorCodes.CHUNKING_STRATEGY_NOT_FOUND,
          details: {
            requestedStrategy: strategyOrAlias,
            availableStrategies: available,
          },
        },
      );
    }

    try {
      const chunker = await this.create(resolvedName, config);
      logger.debug(
        `[ChunkerFactory] Created chunker '${resolvedName}' with config:`,
        config,
      );
      return chunker;
    } catch (error) {
      throw new ChunkingError(
        `Failed to create chunker '${resolvedName}': ${error instanceof Error ? error.message : String(error)}`,
        {
          code: RAGErrorCodes.CHUNKING_ERROR,
          cause: error instanceof Error ? error : undefined,
          details: { strategy: resolvedName, config },
        },
      );
    }
  }

  /**
   * Get metadata for a chunker
   */
  getChunkerMetadata(strategyOrAlias: string): ChunkerMetadata | undefined {
    const resolvedName = this.resolveName(strategyOrAlias);
    return this.metadataMap.get(resolvedName);
  }

  /**
   * Get default configuration for a chunker
   */
  getDefaultConfig(strategyOrAlias: string): ChunkerConfig | undefined {
    const metadata = this.getChunkerMetadata(strategyOrAlias);
    return metadata?.defaultConfig;
  }

  /**
   * Get available chunking strategies (not including aliases)
   */
  async getAvailableStrategies(): Promise<ChunkingStrategy[]> {
    await this.ensureInitialized();
    return this.getAvailable() as ChunkingStrategy[];
  }

  /**
   * Get all aliases mapped to their strategies
   */
  getStrategyAliases(): Map<string, string> {
    return this.getAliases();
  }

  /**
   * Check if a strategy exists
   */
  hasStrategy(strategyOrAlias: string): boolean {
    const resolved = this.resolveName(strategyOrAlias);
    return this.has(resolved);
  }

  /**
   * Get chunkers suitable for a use case
   */
  getChunkersForUseCase(useCase: string): ChunkingStrategy[] {
    const matches: ChunkingStrategy[] = [];
    const useCaseLower = useCase.toLowerCase();

    for (const [strategy, metadata] of this.metadataMap) {
      const hasMatch =
        metadata.useCases?.some((uc) =>
          uc.toLowerCase().includes(useCaseLower),
        ) ?? false;
      if (hasMatch) {
        matches.push(strategy as ChunkingStrategy);
      }
    }

    return matches;
  }

  /**
   * Get all chunker metadata
   */
  getAllMetadata(): Map<string, ChunkerMetadata> {
    return new Map(this.metadataMap);
  }

  /**
   * Clear factory and metadata
   */
  override clear(): void {
    super.clear();
    this.metadataMap.clear();
  }
}

/**
 * Global chunker factory singleton
 */
export const chunkerFactory = ChunkerFactory.getInstance();

/**
 * Convenience function to create a chunker
 */
export async function createChunker(
  strategyOrAlias: string,
  config?: ChunkerConfig,
): Promise<Chunker> {
  return chunkerFactory.createChunker(strategyOrAlias, config);
}

/**
 * Convenience function to get available strategies
 */
export async function getAvailableStrategies(): Promise<ChunkingStrategy[]> {
  return chunkerFactory.getAvailableStrategies();
}

/**
 * Convenience function to get chunker metadata
 */
export function getChunkerMetadata(
  strategyOrAlias: string,
): ChunkerMetadata | undefined {
  return chunkerFactory.getChunkerMetadata(strategyOrAlias);
}

/**
 * Convenience function to get default config
 */
export function getDefaultConfig(
  strategyOrAlias: string,
): ChunkerConfig | undefined {
  return chunkerFactory.getDefaultConfig(strategyOrAlias);
}
