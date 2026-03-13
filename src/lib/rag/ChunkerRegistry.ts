/**
 * Chunker Registry
 *
 * Centralized registry for all chunking strategies with metadata
 * and discovery capabilities. Follows the BaseRegistry pattern.
 */

import { BaseRegistry } from "../core/infrastructure/index.js";
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
    defaultConfig: {
      maxSize: 1000,
      overlap: 100,
    },
    supportedOptions: ["maxSize", "overlap", "minSize"],
    useCases: [
      "Simple text processing",
      "Fixed-size chunks needed",
      "Language-agnostic splitting",
    ],
    aliases: ["char", "fixed-size", "fixed"],
  },
  recursive: {
    description:
      "Recursively splits text using ordered separators (paragraphs, sentences, etc.)",
    defaultConfig: {
      maxSize: 1000,
      overlap: 100,
      separators: ["\n\n", "\n", ". ", " ", ""],
    },
    supportedOptions: [
      "maxSize",
      "overlap",
      "separators",
      "keepSeparators",
      "minSize",
    ],
    useCases: [
      "General text documents",
      "Preserving semantic boundaries",
      "Default choice for most use cases",
    ],
    aliases: ["recursive-character", "langchain-default"],
  },
  sentence: {
    description:
      "Splits text by sentence boundaries for semantically meaningful chunks",
    defaultConfig: {
      maxSize: 1000,
      overlap: 1,
    },
    supportedOptions: [
      "maxSize",
      "overlap",
      "boundaryDetection",
      "maxSentences",
    ],
    useCases: [
      "Q&A applications",
      "Sentence-level analysis",
      "Preserving complete thoughts",
    ],
    aliases: ["sent", "sentence-based"],
  },
  token: {
    description:
      "Splits text by token count using a specific tokenizer (GPT, Claude, etc.)",
    defaultConfig: {
      maxSize: 512,
      overlap: 50,
    },
    supportedOptions: ["maxSize", "overlap", "tokenizer", "maxTokens"],
    useCases: [
      "Token-aware splitting",
      "Optimal for specific models",
      "Precise token budget management",
    ],
    aliases: ["tok", "tokenized"],
  },
  markdown: {
    description: "Splits markdown content by headers and structural elements",
    defaultConfig: {
      maxSize: 1000,
      overlap: 0,
    },
    supportedOptions: [
      "maxSize",
      "overlap",
      "headerLevels",
      "splitCodeBlocks",
      "preserveMetadata",
    ],
    useCases: [
      "Documentation processing",
      "README files",
      "Technical documentation",
    ],
    aliases: ["md", "markdown-header"],
  },
  html: {
    description:
      "Splits HTML content by semantic tags while optionally stripping markup",
    defaultConfig: {
      maxSize: 1000,
      overlap: 0,
    },
    supportedOptions: [
      "maxSize",
      "overlap",
      "splitTags",
      "stripTags",
      "preserveAttributes",
    ],
    useCases: ["Web content processing", "HTML documents", "Web scraping"],
    aliases: ["html-tag", "web"],
  },
  json: {
    description:
      "Splits JSON documents by object boundaries and nested structures",
    defaultConfig: {
      maxSize: 1000,
      overlap: 0,
    },
    supportedOptions: ["maxSize", "overlap", "maxDepth", "chunkKeys"],
    useCases: [
      "API response processing",
      "Structured data",
      "Configuration files",
    ],
    aliases: ["json-object", "structured"],
  },
  latex: {
    description:
      "Splits LaTeX documents by sections, environments, and math blocks",
    defaultConfig: {
      maxSize: 1000,
      overlap: 0,
    },
    supportedOptions: [
      "maxSize",
      "overlap",
      "environments",
      "splitMathBlocks",
      "preserveMetadata",
    ],
    useCases: [
      "Academic papers",
      "Scientific documents",
      "Mathematical content",
    ],
    aliases: ["tex", "latex-section"],
  },
  semantic: {
    description: "Uses LLM to identify semantically meaningful split points",
    defaultConfig: {
      maxSize: 1000,
      overlap: 100,
    },
    supportedOptions: [
      "maxSize",
      "overlap",
      "modelName",
      "provider",
      "similarityThreshold",
    ],
    useCases: [
      "Advanced semantic understanding",
      "Context-aware splitting",
      "AI-enhanced chunking",
    ],
    aliases: ["llm", "ai-semantic"],
  },
  "semantic-markdown": {
    description:
      "Combines markdown splitting with semantic similarity for intelligent merging",
    defaultConfig: {
      maxSize: 1000,
      overlap: 100,
    },
    supportedOptions: [
      "maxSize",
      "overlap",
      "similarityThreshold",
      "maxMergeSize",
      "preserveMetadata",
    ],
    useCases: [
      "Context-aware documentation",
      "Knowledge base creation",
      "Semantic search preparation",
    ],
    aliases: ["semantic-md", "smart-markdown"],
  },
};

/**
 * Chunker Registry
 *
 * Manages registration and discovery of all chunking strategies.
 * Extends BaseRegistry for consistent lifecycle management.
 */
export class ChunkerRegistry extends BaseRegistry<Chunker, ChunkerMetadata> {
  private static instance: ChunkerRegistry | null = null;
  private aliasMap = new Map<string, ChunkingStrategy>();

  private constructor() {
    super();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ChunkerRegistry {
    if (!ChunkerRegistry.instance) {
      ChunkerRegistry.instance = new ChunkerRegistry();
    }
    return ChunkerRegistry.instance;
  }

  /**
   * Reset singleton (for testing)
   */
  static resetInstance(): void {
    if (ChunkerRegistry.instance) {
      ChunkerRegistry.instance.clear();
      ChunkerRegistry.instance = null;
    }
  }

  /**
   * Register all default chunkers
   */
  protected async registerAll(): Promise<void> {
    // Register character chunker
    this.registerChunker(
      "character",
      async () => {
        const { CharacterChunker } =
          await import("./chunkers/CharacterChunker.js");
        return new CharacterChunker();
      },
      DEFAULT_CHUNKER_METADATA.character,
    );

    // Register recursive chunker
    this.registerChunker(
      "recursive",
      async () => {
        const { RecursiveChunker } =
          await import("./chunkers/RecursiveChunker.js");
        return new RecursiveChunker();
      },
      DEFAULT_CHUNKER_METADATA.recursive,
    );

    // Register sentence chunker
    this.registerChunker(
      "sentence",
      async () => {
        const { SentenceChunker } =
          await import("./chunkers/SentenceChunker.js");
        return new SentenceChunker();
      },
      DEFAULT_CHUNKER_METADATA.sentence,
    );

    // Register token chunker
    this.registerChunker(
      "token",
      async () => {
        const { TokenChunker } = await import("./chunkers/TokenChunker.js");
        return new TokenChunker();
      },
      DEFAULT_CHUNKER_METADATA.token,
    );

    // Register markdown chunker
    this.registerChunker(
      "markdown",
      async () => {
        const { MarkdownChunker } =
          await import("./chunkers/MarkdownChunker.js");
        return new MarkdownChunker();
      },
      DEFAULT_CHUNKER_METADATA.markdown,
    );

    // Register HTML chunker
    this.registerChunker(
      "html",
      async () => {
        const { HTMLChunker } = await import("./chunkers/HTMLChunker.js");
        return new HTMLChunker();
      },
      DEFAULT_CHUNKER_METADATA.html,
    );

    // Register JSON chunker
    this.registerChunker(
      "json",
      async () => {
        const { JSONChunker } = await import("./chunkers/JSONChunker.js");
        return new JSONChunker();
      },
      DEFAULT_CHUNKER_METADATA.json,
    );

    // Register LaTeX chunker
    this.registerChunker(
      "latex",
      async () => {
        const { LaTeXChunker } = await import("./chunkers/LaTeXChunker.js");
        return new LaTeXChunker();
      },
      DEFAULT_CHUNKER_METADATA.latex,
    );

    // Register semantic chunker
    this.registerChunker(
      "semantic",
      async () => {
        const { SemanticChunker } =
          await import("./chunking/semanticChunker.js");
        return new SemanticChunker();
      },
      DEFAULT_CHUNKER_METADATA.semantic,
    );

    // Register semantic-markdown chunker
    this.registerChunker(
      "semantic-markdown",
      async () => {
        const { SemanticMarkdownChunker } =
          await import("./chunkers/SemanticMarkdownChunker.js");
        return new SemanticMarkdownChunker();
      },
      DEFAULT_CHUNKER_METADATA["semantic-markdown"],
    );

    logger.debug(
      `[ChunkerRegistry] Registered ${this.items.size} chunking strategies`,
    );
  }

  /**
   * Register a chunker with aliases
   */
  registerChunker(
    strategy: ChunkingStrategy | string,
    factory: () => Promise<Chunker>,
    metadata: ChunkerMetadata,
  ): void {
    this.register(strategy, factory, metadata);

    // Register aliases
    if (metadata.aliases) {
      for (const alias of metadata.aliases) {
        this.aliasMap.set(alias.toLowerCase(), strategy as ChunkingStrategy);
        logger.debug(
          `[ChunkerRegistry] Registered alias '${alias}' -> '${strategy}'`,
        );
      }
    }
  }

  /**
   * Resolve strategy name from alias
   */
  resolveStrategy(nameOrAlias: string): ChunkingStrategy {
    const lower = nameOrAlias.toLowerCase();

    // Check if it's a direct strategy name
    if (this.items.has(lower)) {
      return lower as ChunkingStrategy;
    }

    // Check aliases
    const resolved = this.aliasMap.get(lower);
    if (resolved) {
      return resolved;
    }

    throw new ChunkingError(
      `Unknown chunking strategy: '${nameOrAlias}'. Available strategies: ${this.list()
        .map((item) => item.id)
        .join(", ")}`,
      {
        code: RAGErrorCodes.CHUNKING_STRATEGY_NOT_FOUND,
        details: {
          requestedStrategy: nameOrAlias,
          availableStrategies: this.list().map((item) => item.id),
        },
      },
    );
  }

  /**
   * Get a chunker by strategy name or alias
   */
  async getChunker(strategyOrAlias: string): Promise<Chunker> {
    await this.ensureInitialized();
    const strategy = this.resolveStrategy(strategyOrAlias);
    const chunker = await this.get(strategy);

    if (!chunker) {
      throw new ChunkingError(`Chunker not found: ${strategy}`, {
        code: RAGErrorCodes.CHUNKING_STRATEGY_NOT_FOUND,
        details: { strategy },
      });
    }

    return chunker;
  }

  /**
   * Get list of available chunker strategies
   */
  async getAvailableChunkers(): Promise<ChunkingStrategy[]> {
    await this.ensureInitialized();
    return this.list().map((item) => item.id as ChunkingStrategy);
  }

  /**
   * Get metadata for a specific chunker
   */
  getChunkerMetadata(strategyOrAlias: string): ChunkerMetadata | undefined {
    const strategy = this.resolveStrategy(strategyOrAlias);
    const entry = this.list().find((item) => item.id === strategy);
    return entry?.metadata;
  }

  /**
   * Get all aliases for a strategy
   */
  getAliasesForStrategy(strategy: ChunkingStrategy): string[] {
    const metadata = DEFAULT_CHUNKER_METADATA[strategy];
    return metadata?.aliases ?? [];
  }

  /**
   * Get all registered aliases
   */
  getAllAliases(): Map<string, ChunkingStrategy> {
    return new Map(this.aliasMap);
  }

  /**
   * Check if a strategy or alias exists
   */
  hasChunker(strategyOrAlias: string): boolean {
    try {
      this.resolveStrategy(strategyOrAlias);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get chunkers by use case
   */
  getChunkersByUseCase(useCase: string): ChunkingStrategy[] {
    const matches: ChunkingStrategy[] = [];
    const useCaseLower = useCase.toLowerCase();

    for (const [strategy, metadata] of Object.entries(
      DEFAULT_CHUNKER_METADATA,
    )) {
      const hasMatchingUseCase =
        metadata.useCases?.some((uc) =>
          uc.toLowerCase().includes(useCaseLower),
        ) ?? false;
      if (hasMatchingUseCase) {
        matches.push(strategy as ChunkingStrategy);
      }
    }

    return matches;
  }

  /**
   * Get default configuration for a chunker
   */
  getDefaultConfig(strategyOrAlias: string): ChunkerConfig | undefined {
    const metadata = this.getChunkerMetadata(strategyOrAlias);
    return metadata?.defaultConfig;
  }

  /**
   * Clear the registry (also clears aliases)
   */
  override clear(): void {
    super.clear();
    this.aliasMap.clear();
  }
}

/**
 * Global chunker registry singleton
 */
export const chunkerRegistry = ChunkerRegistry.getInstance();

/**
 * Convenience function to get available chunkers
 */
export async function getAvailableChunkers(): Promise<ChunkingStrategy[]> {
  return chunkerRegistry.getAvailableChunkers();
}

/**
 * Convenience function to get chunker by strategy
 */
export async function getChunker(strategyOrAlias: string): Promise<Chunker> {
  return chunkerRegistry.getChunker(strategyOrAlias);
}

/**
 * Convenience function to get chunker metadata
 */
export function getChunkerMetadata(
  strategyOrAlias: string,
): ChunkerMetadata | undefined {
  return chunkerRegistry.getChunkerMetadata(strategyOrAlias);
}
