/**
 * Reranker Factory
 *
 * Factory for creating reranker instances with configuration.
 * Follows the BaseFactory pattern for consistent lifecycle management.
 */

import { BaseFactory } from "../../core/infrastructure/index.js";
import type { AIProvider } from "../../types/providers.js";
import { logger } from "../../utils/logger.js";
import { RAGErrorCodes, RerankerError } from "../errors/RAGError.js";
import type {
  RerankerOptions,
  RerankResult,
  VectorQueryResult,
} from "../types.js";
import type {
  Reranker,
  RerankerConfig,
  RerankerMetadata,
  RerankerType,
} from "../../types/ragTypes.js";

export type { RerankerType } from "../../types/ragTypes.js";
export type { Reranker } from "../../types/ragTypes.js";
export type { RerankerConfig } from "../../types/ragTypes.js";
export type { RerankerMetadata } from "../../types/ragTypes.js";

/**
 * Default reranker metadata entries
 */
const DEFAULT_RERANKER_METADATA: Record<RerankerType, RerankerMetadata> = {
  llm: {
    description: "LLM-powered semantic reranking with multi-factor scoring",
    defaultConfig: {
      topK: 3,
      weights: { semantic: 0.4, vector: 0.4, position: 0.2 },
    },
    supportedOptions: ["model", "provider", "topK", "weights"],
    useCases: [
      "High-quality semantic reranking",
      "Complex query understanding",
      "Context-aware scoring",
    ],
    aliases: ["semantic", "ai", "model-based"],
    requiresModel: true,
    requiresExternalAPI: false,
  },
  "cross-encoder": {
    description: "Cross-encoder model for query-document relevance scoring",
    defaultConfig: {
      topK: 3,
      model: "ms-marco-MiniLM-L-6-v2",
    },
    supportedOptions: ["model", "topK"],
    useCases: [
      "High-precision reranking",
      "Search result refinement",
      "Academic/research applications",
    ],
    aliases: ["cross", "encoder", "bi-encoder"],
    requiresModel: true,
    requiresExternalAPI: false,
  },
  cohere: {
    description: "Cohere Rerank API for production-grade relevance scoring",
    defaultConfig: {
      topK: 3,
      model: "rerank-v3.5",
    },
    supportedOptions: ["model", "topK", "apiKey"],
    useCases: [
      "Production search systems",
      "Enterprise applications",
      "High-volume reranking",
    ],
    aliases: ["cohere-rerank", "cohere-api"],
    requiresModel: false,
    requiresExternalAPI: true,
  },
  simple: {
    description: "Position and vector score-based reranking (no LLM required)",
    defaultConfig: {
      topK: 3,
      weights: { vector: 0.8, position: 0.2 },
    },
    supportedOptions: ["topK", "weights"],
    useCases: [
      "Fast reranking",
      "Low-latency requirements",
      "When LLM is unavailable",
    ],
    aliases: ["fast", "basic", "position-based"],
    requiresModel: false,
    requiresExternalAPI: false,
  },
  batch: {
    description: "Batch LLM reranking for efficient multi-document scoring",
    defaultConfig: {
      topK: 3,
      weights: { semantic: 0.4, vector: 0.4, position: 0.2 },
    },
    supportedOptions: ["model", "provider", "topK", "weights"],
    useCases: [
      "Large result sets",
      "Cost-efficient LLM usage",
      "Batch processing pipelines",
    ],
    aliases: ["batch-llm", "efficient", "bulk"],
    requiresModel: true,
    requiresExternalAPI: false,
  },
};

/**
 * Reranker Factory
 *
 * Creates reranker instances based on type with configuration support.
 * Uses lazy loading via dynamic imports to avoid circular dependencies.
 */
export class RerankerFactory extends BaseFactory<Reranker, RerankerConfig> {
  private static instance: RerankerFactory | null = null;
  private metadataMap = new Map<RerankerType, RerankerMetadata>();
  private modelProvider: AIProvider | null = null;

  private constructor() {
    super();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): RerankerFactory {
    if (!RerankerFactory.instance) {
      RerankerFactory.instance = new RerankerFactory();
    }
    return RerankerFactory.instance;
  }

  /**
   * Reset singleton (for testing)
   */
  static resetInstance(): void {
    if (RerankerFactory.instance) {
      RerankerFactory.instance.clear();
      RerankerFactory.instance = null;
    }
  }

  /**
   * Set the AI provider for LLM-based rerankers
   */
  setModelProvider(provider: AIProvider): void {
    this.modelProvider = provider;
  }

  /**
   * Register all default rerankers
   */
  protected async registerAll(): Promise<void> {
    // Register LLM reranker
    this.registerReranker(
      "llm",
      async (config?: RerankerConfig) => {
        const { rerank } = await import("./reranker.js");
        return this.createLLMReranker(rerank, config);
      },
      DEFAULT_RERANKER_METADATA.llm,
    );

    // Register cross-encoder reranker
    this.registerReranker(
      "cross-encoder",
      async (config?: RerankerConfig) => {
        const { CrossEncoderReranker } = await import("./reranker.js");
        return this.createCrossEncoderReranker(CrossEncoderReranker, config);
      },
      DEFAULT_RERANKER_METADATA["cross-encoder"],
    );

    // Register Cohere reranker
    this.registerReranker(
      "cohere",
      async (config?: RerankerConfig) => {
        const { CohereRelevanceScorer } = await import("./reranker.js");
        return this.createCohereReranker(CohereRelevanceScorer, config);
      },
      DEFAULT_RERANKER_METADATA.cohere,
    );

    // Register simple reranker
    this.registerReranker(
      "simple",
      async (config?: RerankerConfig) => {
        const { simpleRerank } = await import("./reranker.js");
        return this.createSimpleReranker(simpleRerank, config);
      },
      DEFAULT_RERANKER_METADATA.simple,
    );

    // Register batch reranker
    this.registerReranker(
      "batch",
      async (config?: RerankerConfig) => {
        const { batchRerank } = await import("./reranker.js");
        return this.createBatchReranker(batchRerank, config);
      },
      DEFAULT_RERANKER_METADATA.batch,
    );

    logger.debug(
      `[RerankerFactory] Registered ${this.items.size} reranker types`,
    );
  }

  /**
   * Create LLM-based reranker wrapper
   */
  private createLLMReranker(
    rerankFn: typeof import("./reranker.js").rerank,
    config?: RerankerConfig,
  ): Reranker {
    const factory = this;
    return {
      type: "llm" as RerankerType,
      async rerank(
        results: VectorQueryResult[],
        query: string,
        options?: RerankerOptions,
      ): Promise<RerankResult[]> {
        if (!factory.modelProvider) {
          throw new RerankerError(
            "LLM reranker requires a model provider. Call setModelProvider() first.",
            {
              rerankerType: "llm",
            },
          );
        }
        return rerankFn(results, query, factory.modelProvider, {
          ...options,
          topK: config?.topK ?? options?.topK,
          weights: config?.weights ?? options?.weights,
        });
      },
    };
  }

  /**
   * Create cross-encoder reranker wrapper
   */
  private createCrossEncoderReranker(
    CrossEncoderClass: typeof import("./reranker.js").CrossEncoderReranker,
    config?: RerankerConfig,
  ): Reranker {
    const encoder = new CrossEncoderClass(config?.model);
    return {
      type: "cross-encoder" as RerankerType,
      async rerank(
        results: VectorQueryResult[],
        query: string,
        options?: RerankerOptions,
      ): Promise<RerankResult[]> {
        const documents = results.map(
          (r) => r.text || (r.metadata?.text as string) || "",
        );
        const scores = await encoder.rerank(query, documents);
        const topK = config?.topK ?? options?.topK ?? 3;

        return scores
          .map((s) => ({
            result: results[s.index],
            score: s.score,
            details: {
              semantic: s.score,
              vector: results[s.index].score ?? 0,
              position: 1 - s.index / results.length,
            },
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, topK);
      },
    };
  }

  /**
   * Create Cohere reranker wrapper
   */
  private createCohereReranker(
    CohereClass: typeof import("./reranker.js").CohereRelevanceScorer,
    config?: RerankerConfig,
  ): Reranker {
    const scorer = new CohereClass(config?.model);
    return {
      type: "cohere" as RerankerType,
      async rerank(
        results: VectorQueryResult[],
        query: string,
        options?: RerankerOptions,
      ): Promise<RerankResult[]> {
        const documents = results.map(
          (r) => r.text || (r.metadata?.text as string) || "",
        );
        const scores = await scorer.score(query, documents);
        const topK = config?.topK ?? options?.topK ?? 3;

        return scores
          .map((s) => ({
            result: results[s.index],
            score: s.score,
            details: {
              semantic: s.score,
              vector: results[s.index].score ?? 0,
              position: 1 - s.index / results.length,
            },
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, topK);
      },
    };
  }

  /**
   * Create simple reranker wrapper
   */
  private createSimpleReranker(
    simpleRerankFn: typeof import("./reranker.js").simpleRerank,
    config?: RerankerConfig,
  ): Reranker {
    return {
      type: "simple" as RerankerType,
      async rerank(
        results: VectorQueryResult[],
        _query: string,
        options?: RerankerOptions,
      ): Promise<RerankResult[]> {
        return simpleRerankFn(results, {
          topK: config?.topK ?? options?.topK,
          vectorWeight: config?.weights?.vector,
          positionWeight: config?.weights?.position,
        });
      },
    };
  }

  /**
   * Create batch reranker wrapper
   */
  private createBatchReranker(
    batchRerankFn: typeof import("./reranker.js").batchRerank,
    config?: RerankerConfig,
  ): Reranker {
    const factory = this;
    return {
      type: "batch" as RerankerType,
      async rerank(
        results: VectorQueryResult[],
        query: string,
        options?: RerankerOptions,
      ): Promise<RerankResult[]> {
        if (!factory.modelProvider) {
          throw new RerankerError(
            "Batch reranker requires a model provider. Call setModelProvider() first.",
            {
              rerankerType: "batch",
            },
          );
        }
        return batchRerankFn(results, query, factory.modelProvider, {
          ...options,
          topK: config?.topK ?? options?.topK,
          weights: config?.weights ?? options?.weights,
        });
      },
    };
  }

  /**
   * Register a reranker with metadata and aliases
   */
  registerReranker(
    type: RerankerType,
    factory: (config?: RerankerConfig) => Promise<Reranker>,
    metadata: RerankerMetadata,
  ): void {
    // Store metadata
    this.metadataMap.set(type, metadata);

    // Register with aliases
    this.register(type, factory, metadata.aliases, { metadata });

    logger.debug(
      `[RerankerFactory] Registered reranker '${type}' with aliases: ${metadata.aliases.join(", ")}`,
    );
  }

  /**
   * Create a reranker by type or alias
   */
  async createReranker(
    typeOrAlias: string,
    config?: RerankerConfig,
  ): Promise<Reranker> {
    await this.ensureInitialized();

    const resolvedName = this.resolveName(typeOrAlias);

    if (!this.has(resolvedName)) {
      const available = this.getAvailable();
      throw new RerankerError(
        `Unknown reranker type: '${typeOrAlias}'. Available types: ${available.join(", ")}`,
        {
          code: RAGErrorCodes.RERANKER_NOT_FOUND,
          rerankerType: typeOrAlias,
          details: {
            requestedType: typeOrAlias,
            availableTypes: available,
          },
        },
      );
    }

    try {
      const reranker = await this.create(resolvedName, config);
      logger.debug(
        `[RerankerFactory] Created reranker '${resolvedName}' with config:`,
        config,
      );
      return reranker;
    } catch (error) {
      // Re-throw if already a RerankerError
      if (error instanceof RerankerError) {
        throw error;
      }
      throw new RerankerError(
        `Failed to create reranker '${resolvedName}': ${error instanceof Error ? error.message : String(error)}`,
        {
          rerankerType: resolvedName,
          cause: error instanceof Error ? error : undefined,
          details: { type: resolvedName, config },
        },
      );
    }
  }

  /**
   * Get metadata for a reranker
   */
  getRerankerMetadata(typeOrAlias: string): RerankerMetadata | undefined {
    const resolvedName = this.resolveName(typeOrAlias) as RerankerType;
    return this.metadataMap.get(resolvedName);
  }

  /**
   * Get default configuration for a reranker
   */
  getDefaultConfig(typeOrAlias: string): Partial<RerankerConfig> | undefined {
    const metadata = this.getRerankerMetadata(typeOrAlias);
    return metadata?.defaultConfig;
  }

  /**
   * Get available reranker types (not including aliases)
   */
  async getAvailableTypes(): Promise<RerankerType[]> {
    await this.ensureInitialized();
    return this.getAvailable() as RerankerType[];
  }

  /**
   * Get all aliases mapped to their types
   */
  getTypeAliases(): Map<string, string> {
    return this.getAliases();
  }

  /**
   * Check if a type exists
   */
  hasType(typeOrAlias: string): boolean {
    const resolved = this.resolveName(typeOrAlias);
    return this.has(resolved);
  }

  /**
   * Get rerankers suitable for a use case
   */
  getRerankersForUseCase(useCase: string): RerankerType[] {
    const matches: RerankerType[] = [];
    const useCaseLower = useCase.toLowerCase();

    for (const [type, metadata] of this.metadataMap) {
      const hasMatch = metadata.useCases.some((uc) =>
        uc.toLowerCase().includes(useCaseLower),
      );
      if (hasMatch) {
        matches.push(type);
      }
    }

    return matches;
  }

  /**
   * Get rerankers that don't require external APIs
   */
  getLocalRerankers(): RerankerType[] {
    const matches: RerankerType[] = [];

    for (const [type, metadata] of this.metadataMap) {
      if (!metadata.requiresExternalAPI) {
        matches.push(type);
      }
    }

    return matches;
  }

  /**
   * Get rerankers that don't require AI models
   */
  getModelFreeRerankers(): RerankerType[] {
    const matches: RerankerType[] = [];

    for (const [type, metadata] of this.metadataMap) {
      if (!metadata.requiresModel) {
        matches.push(type);
      }
    }

    return matches;
  }

  /**
   * Get all reranker metadata
   */
  getAllMetadata(): Map<RerankerType, RerankerMetadata> {
    return new Map(this.metadataMap);
  }

  /**
   * Clear factory and metadata
   */
  override clear(): void {
    super.clear();
    this.metadataMap.clear();
    this.modelProvider = null;
  }
}

/**
 * Global reranker factory singleton
 */
export const rerankerFactory = RerankerFactory.getInstance();

/**
 * Convenience function to create a reranker
 */
export async function createReranker(
  typeOrAlias: string,
  config?: RerankerConfig,
): Promise<Reranker> {
  return rerankerFactory.createReranker(typeOrAlias, config);
}

/**
 * Convenience function to get available reranker types
 */
export async function getAvailableRerankerTypes(): Promise<RerankerType[]> {
  return rerankerFactory.getAvailableTypes();
}

/**
 * Convenience function to get reranker metadata
 */
export function getRerankerMetadata(
  typeOrAlias: string,
): RerankerMetadata | undefined {
  return rerankerFactory.getRerankerMetadata(typeOrAlias);
}

/**
 * Convenience function to get default config
 */
export function getRerankerDefaultConfig(
  typeOrAlias: string,
): Partial<RerankerConfig> | undefined {
  return rerankerFactory.getDefaultConfig(typeOrAlias);
}
