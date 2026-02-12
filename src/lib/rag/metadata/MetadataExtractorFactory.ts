/**
 * Metadata Extractor Factory
 *
 * Factory for creating metadata extractor instances with configuration.
 * Follows the BaseFactory pattern for consistent lifecycle management.
 */

import { BaseFactory } from "../../core/infrastructure/index.js";
import { logger } from "../../utils/logger.js";
import { MetadataExtractionError, RAGErrorCodes } from "../errors/RAGError.js";
import type { Chunk, ExtractionResult, ExtractParams } from "../types.js";
import type {
  MetadataExtractor,
  MetadataExtractorConfig,
  MetadataExtractorMetadata,
  MetadataExtractorType,
} from "../../types/ragTypes.js";

export type { MetadataExtractorType } from "../../types/ragTypes.js";
export type { MetadataExtractor } from "../../types/ragTypes.js";
export type { MetadataExtractorConfig } from "../../types/ragTypes.js";
export type { MetadataExtractorMetadata } from "../../types/ragTypes.js";

/**
 * Default metadata extractor metadata entries
 */
const DEFAULT_EXTRACTOR_METADATA: Record<
  MetadataExtractorType,
  MetadataExtractorMetadata
> = {
  llm: {
    description:
      "Full LLM-powered metadata extraction supporting all extraction types",
    defaultConfig: {
      provider: "openai",
      modelName: "gpt-4o-mini",
      temperature: 0.3,
    },
    supportedOptions: [
      "provider",
      "modelName",
      "promptTemplate",
      "maxTokens",
      "temperature",
    ],
    useCases: [
      "Comprehensive metadata extraction",
      "Multi-type extraction in single pass",
      "Custom schema extraction",
    ],
    aliases: ["full", "comprehensive", "all"],
    requiresModel: true,
    extractionTypes: ["title", "summary", "keywords", "questions", "custom"],
  },
  title: {
    description: "Extracts concise, descriptive titles from document content",
    defaultConfig: {
      provider: "openai",
      modelName: "gpt-4o-mini",
      maxTokens: 100,
    },
    supportedOptions: ["provider", "modelName", "promptTemplate", "maxTokens"],
    useCases: [
      "Document indexing",
      "Content organization",
      "Navigation systems",
    ],
    aliases: ["header", "heading"],
    requiresModel: true,
    extractionTypes: ["title"],
  },
  summary: {
    description: "Generates concise summaries of document chunks",
    defaultConfig: {
      provider: "openai",
      modelName: "gpt-4o-mini",
      maxTokens: 200,
    },
    supportedOptions: [
      "provider",
      "modelName",
      "promptTemplate",
      "maxTokens",
      "maxWords",
    ],
    useCases: [
      "Document previews",
      "Search result snippets",
      "Content condensation",
    ],
    aliases: ["summarize", "abstract"],
    requiresModel: true,
    extractionTypes: ["summary"],
  },
  keywords: {
    description: "Extracts key terms and phrases from content",
    defaultConfig: {
      provider: "openai",
      modelName: "gpt-4o-mini",
      maxTokens: 100,
    },
    supportedOptions: [
      "provider",
      "modelName",
      "promptTemplate",
      "maxKeywords",
    ],
    useCases: ["Tag generation", "Topic modeling", "Search optimization"],
    aliases: ["tags", "terms", "keyphrase"],
    requiresModel: true,
    extractionTypes: ["keywords"],
  },
  questions: {
    description: "Generates Q&A pairs from content for training or FAQs",
    defaultConfig: {
      provider: "openai",
      modelName: "gpt-4o-mini",
      maxTokens: 500,
    },
    supportedOptions: [
      "provider",
      "modelName",
      "promptTemplate",
      "numQuestions",
      "includeAnswers",
    ],
    useCases: [
      "FAQ generation",
      "Training data creation",
      "Knowledge base building",
    ],
    aliases: ["qa", "faq", "questions-answers"],
    requiresModel: true,
    extractionTypes: ["questions"],
  },
  custom: {
    description: "Extracts structured data according to custom schema",
    defaultConfig: {
      provider: "openai",
      modelName: "gpt-4o-mini",
      maxTokens: 500,
    },
    supportedOptions: [
      "provider",
      "modelName",
      "promptTemplate",
      "schema",
      "description",
    ],
    useCases: [
      "Structured data extraction",
      "Entity extraction",
      "Custom field extraction",
    ],
    aliases: ["schema", "structured", "entity"],
    requiresModel: true,
    extractionTypes: ["custom"],
  },
  composite: {
    description: "Combines multiple extraction types in a single pass",
    defaultConfig: {
      provider: "openai",
      modelName: "gpt-4o-mini",
    },
    supportedOptions: ["provider", "modelName", "extractors"],
    useCases: [
      "Multi-field extraction",
      "Complete document processing",
      "Pipeline integration",
    ],
    aliases: ["multi", "combined", "batch"],
    requiresModel: true,
    extractionTypes: ["title", "summary", "keywords", "questions", "custom"],
  },
};

/**
 * Metadata Extractor Factory
 *
 * Creates metadata extractor instances based on type with configuration support.
 * Uses lazy loading via dynamic imports to avoid circular dependencies.
 */
export class MetadataExtractorFactory extends BaseFactory<
  MetadataExtractor,
  MetadataExtractorConfig
> {
  private static instance: MetadataExtractorFactory | null = null;
  private metadataMap = new Map<
    MetadataExtractorType,
    MetadataExtractorMetadata
  >();

  private constructor() {
    super();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): MetadataExtractorFactory {
    if (!MetadataExtractorFactory.instance) {
      MetadataExtractorFactory.instance = new MetadataExtractorFactory();
    }
    return MetadataExtractorFactory.instance;
  }

  /**
   * Reset singleton (for testing)
   */
  static resetInstance(): void {
    if (MetadataExtractorFactory.instance) {
      MetadataExtractorFactory.instance.clear();
      MetadataExtractorFactory.instance = null;
    }
  }

  /**
   * Register all default extractors
   */
  protected async registerAll(): Promise<void> {
    // Register full LLM extractor
    this.registerExtractor(
      "llm",
      async (config?: MetadataExtractorConfig) => {
        const { LLMMetadataExtractor } = await import("./metadataExtractor.js");
        return this.wrapExtractor(
          new LLMMetadataExtractor({
            provider: config?.provider,
            modelName: config?.modelName,
          }),
          "llm",
        );
      },
      DEFAULT_EXTRACTOR_METADATA.llm,
    );

    // Register title extractor
    this.registerExtractor(
      "title",
      async (config?: MetadataExtractorConfig) => {
        const { LLMMetadataExtractor } = await import("./metadataExtractor.js");
        return this.createSpecializedExtractor(
          new LLMMetadataExtractor({
            provider: config?.provider,
            modelName: config?.modelName,
          }),
          "title",
          { title: true },
        );
      },
      DEFAULT_EXTRACTOR_METADATA.title,
    );

    // Register summary extractor
    this.registerExtractor(
      "summary",
      async (config?: MetadataExtractorConfig) => {
        const { LLMMetadataExtractor } = await import("./metadataExtractor.js");
        return this.createSpecializedExtractor(
          new LLMMetadataExtractor({
            provider: config?.provider,
            modelName: config?.modelName,
          }),
          "summary",
          { summary: true },
        );
      },
      DEFAULT_EXTRACTOR_METADATA.summary,
    );

    // Register keywords extractor
    this.registerExtractor(
      "keywords",
      async (config?: MetadataExtractorConfig) => {
        const { LLMMetadataExtractor } = await import("./metadataExtractor.js");
        return this.createSpecializedExtractor(
          new LLMMetadataExtractor({
            provider: config?.provider,
            modelName: config?.modelName,
          }),
          "keywords",
          { keywords: true },
        );
      },
      DEFAULT_EXTRACTOR_METADATA.keywords,
    );

    // Register questions extractor
    this.registerExtractor(
      "questions",
      async (config?: MetadataExtractorConfig) => {
        const { LLMMetadataExtractor } = await import("./metadataExtractor.js");
        return this.createSpecializedExtractor(
          new LLMMetadataExtractor({
            provider: config?.provider,
            modelName: config?.modelName,
          }),
          "questions",
          { questions: true },
        );
      },
      DEFAULT_EXTRACTOR_METADATA.questions,
    );

    // Register custom extractor
    this.registerExtractor(
      "custom",
      async (config?: MetadataExtractorConfig) => {
        const { LLMMetadataExtractor } = await import("./metadataExtractor.js");
        return this.wrapExtractor(
          new LLMMetadataExtractor({
            provider: config?.provider,
            modelName: config?.modelName,
          }),
          "custom",
        );
      },
      DEFAULT_EXTRACTOR_METADATA.custom,
    );

    // Register composite extractor
    this.registerExtractor(
      "composite",
      async (config?: MetadataExtractorConfig) => {
        const { LLMMetadataExtractor } = await import("./metadataExtractor.js");
        return this.wrapExtractor(
          new LLMMetadataExtractor({
            provider: config?.provider,
            modelName: config?.modelName,
          }),
          "composite",
        );
      },
      DEFAULT_EXTRACTOR_METADATA.composite,
    );

    logger.debug(
      `[MetadataExtractorFactory] Registered ${this.items.size} extractor types`,
    );
  }

  /**
   * Wrap LLMMetadataExtractor to conform to MetadataExtractor interface
   */
  private wrapExtractor(
    extractor: InstanceType<
      typeof import("./metadataExtractor.js").LLMMetadataExtractor
    >,
    type: MetadataExtractorType,
  ): MetadataExtractor {
    return {
      type,
      async extract(
        chunks: Chunk[],
        params?: ExtractParams,
      ): Promise<ExtractionResult[]> {
        return extractor.extract(chunks, params ?? {});
      },
    };
  }

  /**
   * Create specialized extractor that only extracts specific types
   */
  private createSpecializedExtractor(
    extractor: InstanceType<
      typeof import("./metadataExtractor.js").LLMMetadataExtractor
    >,
    type: MetadataExtractorType,
    defaultParams: ExtractParams,
  ): MetadataExtractor {
    return {
      type,
      async extract(
        chunks: Chunk[],
        params?: ExtractParams,
      ): Promise<ExtractionResult[]> {
        // Merge default params with any provided params
        const mergedParams = { ...defaultParams, ...params };
        return extractor.extract(chunks, mergedParams);
      },
    };
  }

  /**
   * Register an extractor with metadata and aliases
   */
  registerExtractor(
    type: MetadataExtractorType,
    factory: (config?: MetadataExtractorConfig) => Promise<MetadataExtractor>,
    metadata: MetadataExtractorMetadata,
  ): void {
    // Store metadata
    this.metadataMap.set(type, metadata);

    // Register with aliases
    this.register(type, factory, metadata.aliases, { metadata });

    logger.debug(
      `[MetadataExtractorFactory] Registered extractor '${type}' with aliases: ${metadata.aliases.join(", ")}`,
    );
  }

  /**
   * Create an extractor by type or alias
   */
  async createExtractor(
    typeOrAlias: string,
    config?: MetadataExtractorConfig,
  ): Promise<MetadataExtractor> {
    await this.ensureInitialized();

    const resolvedName = this.resolveName(typeOrAlias);

    if (!this.has(resolvedName)) {
      const available = this.getAvailable();
      throw new MetadataExtractionError(
        `Unknown metadata extractor type: '${typeOrAlias}'. Available types: ${available.join(", ")}`,
        {
          code: RAGErrorCodes.METADATA_EXTRACTOR_NOT_FOUND,
          extractorType: typeOrAlias,
          details: {
            requestedType: typeOrAlias,
            availableTypes: available,
          },
        },
      );
    }

    try {
      const extractor = await this.create(resolvedName, config);
      logger.debug(
        `[MetadataExtractorFactory] Created extractor '${resolvedName}' with config:`,
        config,
      );
      return extractor;
    } catch (error) {
      // Re-throw if already a MetadataExtractionError
      if (error instanceof MetadataExtractionError) {
        throw error;
      }
      throw new MetadataExtractionError(
        `Failed to create extractor '${resolvedName}': ${error instanceof Error ? error.message : String(error)}`,
        {
          extractorType: resolvedName,
          cause: error instanceof Error ? error : undefined,
          details: { type: resolvedName, config },
        },
      );
    }
  }

  /**
   * Get metadata for an extractor
   */
  getExtractorMetadata(
    typeOrAlias: string,
  ): MetadataExtractorMetadata | undefined {
    const resolvedName = this.resolveName(typeOrAlias) as MetadataExtractorType;
    return this.metadataMap.get(resolvedName);
  }

  /**
   * Get default configuration for an extractor
   */
  getDefaultConfig(
    typeOrAlias: string,
  ): Partial<MetadataExtractorConfig> | undefined {
    const metadata = this.getExtractorMetadata(typeOrAlias);
    return metadata?.defaultConfig;
  }

  /**
   * Get available extractor types (not including aliases)
   */
  getAvailableTypes(): MetadataExtractorType[] {
    return this.getAvailable() as MetadataExtractorType[];
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
   * Get extractors suitable for a use case
   */
  getExtractorsForUseCase(useCase: string): MetadataExtractorType[] {
    const matches: MetadataExtractorType[] = [];
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
   * Get extractors that can produce a specific extraction type
   */
  getExtractorsForExtractionType(
    extractionType: string,
  ): MetadataExtractorType[] {
    const matches: MetadataExtractorType[] = [];

    for (const [type, metadata] of this.metadataMap) {
      if (metadata.extractionTypes.includes(extractionType)) {
        matches.push(type);
      }
    }

    return matches;
  }

  /**
   * Get all extractor metadata
   */
  getAllMetadata(): Map<MetadataExtractorType, MetadataExtractorMetadata> {
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
 * Global metadata extractor factory singleton
 */
export const metadataExtractorFactory = MetadataExtractorFactory.getInstance();

/**
 * Convenience function to create a metadata extractor
 */
export async function createMetadataExtractor(
  typeOrAlias: string,
  config?: MetadataExtractorConfig,
): Promise<MetadataExtractor> {
  return metadataExtractorFactory.createExtractor(typeOrAlias, config);
}

/**
 * Convenience function to get available extractor types
 */
export function getAvailableExtractorTypes(): MetadataExtractorType[] {
  return metadataExtractorFactory.getAvailableTypes();
}

/**
 * Convenience function to get extractor metadata
 */
export function getExtractorMetadata(
  typeOrAlias: string,
): MetadataExtractorMetadata | undefined {
  return metadataExtractorFactory.getExtractorMetadata(typeOrAlias);
}

/**
 * Convenience function to get default config
 */
export function getExtractorDefaultConfig(
  typeOrAlias: string,
): Partial<MetadataExtractorConfig> | undefined {
  return metadataExtractorFactory.getDefaultConfig(typeOrAlias);
}
