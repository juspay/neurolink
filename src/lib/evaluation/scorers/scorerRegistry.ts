/**
 * @file Scorer registry for managing scorer registration and discovery
 * Follows NeuroLink's factory + registry pattern with dynamic imports
 */

import type {
  BuiltInScorerDefinition,
  Scorer,
  ScorerCategory,
  ScorerConfig,
  ScorerFactory,
  ScorerMetadata,
  ScorerRegistryEntry,
  ScorerType,
} from "../../types/index.js";
import { logger } from "../../utils/logger.js";

const BUILT_IN_LLM_SCORERS: BuiltInScorerDefinition[] = [
  {
    metadata: {
      id: "hallucination",
      name: "Hallucination Detection",
      description:
        "Detects factual errors, fabrications, and unsupported claims in responses",
      type: "llm",
      category: "accuracy",
      version: "1.0.0",
      defaultConfig: {
        enabled: true,
        threshold: 0.8,
        weight: 1.5,
        timeout: 30000,
        retries: 2,
      },
      requiredInputs: ["query", "response"],
      optionalInputs: ["context", "groundTruth"],
    },
    factory: async (config) => {
      const { HallucinationScorer } =
        await import("./llm/hallucinationScorer.js");
      return new HallucinationScorer(config);
    },
    aliases: ["hallucination-detection", "hallucinations"],
  },
  {
    metadata: {
      id: "toxicity",
      name: "Toxicity Analysis",
      description:
        "Detects harmful, offensive, or inappropriate content in responses",
      type: "llm",
      category: "safety",
      version: "1.0.0",
      defaultConfig: {
        enabled: true,
        threshold: 0.9,
        weight: 2.0,
        timeout: 20000,
        retries: 1,
      },
      requiredInputs: ["response"],
      optionalInputs: ["query"],
    },
    factory: async (config) => {
      const { ToxicityScorer } = await import("./llm/toxicityScorer.js");
      return new ToxicityScorer(config);
    },
    aliases: ["toxic", "safety"],
  },
  {
    metadata: {
      id: "faithfulness",
      name: "Faithfulness",
      description:
        "Evaluates if the response is faithfully grounded in provided context",
      type: "llm",
      category: "faithfulness",
      version: "1.0.0",
      defaultConfig: {
        enabled: true,
        threshold: 0.7,
        weight: 1.2,
        timeout: 30000,
        retries: 2,
      },
      requiredInputs: ["response", "context"],
      optionalInputs: ["query"],
    },
    factory: async (config) => {
      const { FaithfulnessScorer } =
        await import("./llm/faithfulnessScorer.js");
      return new FaithfulnessScorer(config);
    },
    aliases: ["faithful", "grounding"],
  },
  {
    metadata: {
      id: "context-relevancy",
      name: "Context Relevancy",
      description:
        "Evaluates how relevant the retrieved context is to the user query",
      type: "llm",
      category: "relevancy",
      version: "1.0.0",
      defaultConfig: {
        enabled: true,
        threshold: 0.6,
        weight: 1.0,
        timeout: 25000,
        retries: 2,
      },
      requiredInputs: ["query", "context"],
      optionalInputs: ["response"],
    },
    factory: async (config) => {
      const { ContextRelevancyScorer } =
        await import("./llm/contextRelevancyScorer.js");
      return new ContextRelevancyScorer(config);
    },
    aliases: ["context-relevance"],
  },
  {
    metadata: {
      id: "answer-relevancy",
      name: "Answer Relevancy",
      description:
        "Evaluates how relevant the AI response is to the user query",
      type: "llm",
      category: "relevancy",
      version: "1.0.0",
      defaultConfig: {
        enabled: true,
        threshold: 0.7,
        weight: 1.0,
        timeout: 25000,
        retries: 2,
      },
      requiredInputs: ["query", "response"],
      optionalInputs: ["context"],
    },
    factory: async (config) => {
      const { AnswerRelevancyScorer } =
        await import("./llm/answerRelevancyScorer.js");
      return new AnswerRelevancyScorer(config);
    },
    aliases: ["response-relevancy", "relevancy"],
  },
  {
    metadata: {
      id: "context-precision",
      name: "Context Precision",
      description:
        "Measures the precision of retrieved context - whether relevant chunks are ranked higher",
      type: "llm",
      category: "relevancy",
      version: "1.0.0",
      defaultConfig: {
        enabled: true,
        threshold: 0.6,
        weight: 0.8,
        timeout: 25000,
        retries: 2,
      },
      requiredInputs: ["query", "context"],
      optionalInputs: ["groundTruth"],
    },
    factory: async (config) => {
      const { ContextPrecisionScorer } =
        await import("./llm/contextPrecisionScorer.js");
      return new ContextPrecisionScorer(config);
    },
    aliases: ["precision"],
  },
  {
    metadata: {
      id: "bias-detection",
      name: "Bias Detection",
      description: "Identifies potential biases in AI responses",
      type: "llm",
      category: "safety",
      version: "1.0.0",
      defaultConfig: {
        enabled: true,
        threshold: 0.8,
        weight: 1.0,
        timeout: 25000,
        retries: 2,
      },
      requiredInputs: ["response"],
      optionalInputs: ["query", "context"],
    },
    factory: async (config) => {
      const { BiasDetectionScorer } =
        await import("./llm/biasDetectionScorer.js");
      return new BiasDetectionScorer(config);
    },
    aliases: ["bias", "fairness"],
  },
  {
    metadata: {
      id: "tone-consistency",
      name: "Tone Consistency",
      description: "Checks for consistent tone throughout the response",
      type: "llm",
      category: "quality",
      version: "1.0.0",
      defaultConfig: {
        enabled: true,
        threshold: 0.7,
        weight: 0.8,
        timeout: 20000,
        retries: 1,
      },
      requiredInputs: ["response"],
      optionalInputs: ["query"],
    },
    factory: async (config) => {
      const { ToneConsistencyScorer } =
        await import("./llm/toneConsistencyScorer.js");
      return new ToneConsistencyScorer(config);
    },
    aliases: ["tone"],
  },
  {
    metadata: {
      id: "prompt-alignment",
      name: "Prompt Alignment",
      description:
        "Measures how well the response aligns with prompt instructions",
      type: "llm",
      category: "quality",
      version: "1.0.0",
      defaultConfig: {
        enabled: true,
        threshold: 0.7,
        weight: 1.0,
        timeout: 25000,
        retries: 2,
      },
      requiredInputs: ["query", "response"],
      optionalInputs: [],
    },
    factory: async (config) => {
      const { PromptAlignmentScorer } =
        await import("./llm/promptAlignmentScorer.js");
      return new PromptAlignmentScorer(config);
    },
    aliases: ["alignment", "instruction-following"],
  },
  {
    metadata: {
      id: "summarization",
      name: "Summarization Quality",
      description: "Evaluates the quality of AI-generated summaries",
      type: "llm",
      category: "quality",
      version: "1.0.0",
      defaultConfig: {
        enabled: true,
        threshold: 0.7,
        weight: 1.0,
        timeout: 25000,
        retries: 2,
      },
      requiredInputs: ["response", "context"],
      optionalInputs: ["query"],
    },
    factory: async (config) => {
      const { SummarizationScorer } =
        await import("./llm/summarizationScorer.js");
      return new SummarizationScorer(config);
    },
    aliases: ["summary"],
  },
];

const BUILT_IN_RULE_SCORERS: BuiltInScorerDefinition[] = [
  {
    metadata: {
      id: "keyword-coverage",
      name: "Keyword Coverage",
      description: "Checks if response covers expected keywords and concepts",
      type: "rule",
      category: "quality",
      version: "1.0.0",
      defaultConfig: {
        enabled: true,
        threshold: 0.6,
        weight: 0.8,
        timeout: 1000,
        retries: 0,
      },
      requiredInputs: ["response"],
      optionalInputs: ["query", "custom"],
    },
    factory: async (config) => {
      const { KeywordCoverageScorer } =
        await import("./rule/keywordCoverageScorer.js");
      return new KeywordCoverageScorer(config);
    },
    aliases: ["keywords"],
  },
  {
    metadata: {
      id: "content-similarity",
      name: "Content Similarity",
      description: "Measures text similarity between response and reference",
      type: "rule",
      category: "accuracy",
      version: "1.0.0",
      defaultConfig: {
        enabled: true,
        threshold: 0.5,
        weight: 1.0,
        timeout: 2000,
        retries: 0,
      },
      requiredInputs: ["response", "groundTruth"],
      optionalInputs: [],
    },
    factory: async (config) => {
      const { ContentSimilarityScorer } =
        await import("./rule/contentSimilarityScorer.js");
      return new ContentSimilarityScorer(config);
    },
    aliases: ["similarity", "text-similarity"],
  },
  {
    metadata: {
      id: "length",
      name: "Response Length",
      description: "Validates response length against configured bounds",
      type: "rule",
      category: "quality",
      version: "1.0.0",
      defaultConfig: {
        enabled: true,
        threshold: 0.8,
        weight: 0.5,
        timeout: 100,
        retries: 0,
      },
      requiredInputs: ["response"],
      optionalInputs: [],
    },
    factory: async (config) => {
      const { LengthScorer } = await import("./rule/lengthScorer.js");
      return new LengthScorer(config);
    },
    aliases: ["response-length"],
  },
  {
    metadata: {
      id: "format",
      name: "Format Validation",
      description:
        "Checks if response follows expected formatting requirements",
      type: "rule",
      category: "quality",
      version: "1.0.0",
      defaultConfig: {
        enabled: true,
        threshold: 0.8,
        weight: 0.5,
        timeout: 100,
        retries: 0,
      },
      requiredInputs: ["response"],
      optionalInputs: ["custom"],
    },
    factory: async (config) => {
      const { FormatScorer } = await import("./rule/formatScorer.js");
      return new FormatScorer(config);
    },
    aliases: ["formatting"],
  },
];

/**
 * Central registry for all scorers
 * Manages registration, discovery, and instantiation
 */
export class ScorerRegistry {
  private static scorers = new Map<string, ScorerRegistryEntry>();
  private static initialized = false;
  private static initPromise: Promise<void> | null = null;

  /**
   * Register a scorer with the registry
   */
  static register(entry: ScorerRegistryEntry): void {
    const { metadata } = entry;
    const normalizedId = metadata.id.toLowerCase();

    if (ScorerRegistry.scorers.has(normalizedId)) {
      logger.warn(`Scorer ${metadata.id} already registered, overwriting`);
    }

    ScorerRegistry.scorers.set(normalizedId, entry);

    // Register aliases
    if (entry.aliases) {
      for (const alias of entry.aliases) {
        ScorerRegistry.scorers.set(alias.toLowerCase(), entry);
      }
    }

    logger.debug(`Scorer registered: ${metadata.id}`, {
      name: metadata.name,
      type: metadata.type,
      category: metadata.category,
    });
  }

  /**
   * Register a scorer using a simple configuration
   */
  static registerScorer(
    metadata: ScorerMetadata,
    factory: ScorerFactory,
    aliases: string[] = [],
  ): void {
    ScorerRegistry.register({
      metadata,
      factory,
      defaultConfig: metadata.defaultConfig,
      aliases,
    });
  }

  private static registerScorerDefinitions(
    definitions: BuiltInScorerDefinition[],
  ): void {
    for (const definition of definitions) {
      ScorerRegistry.registerScorer(
        definition.metadata,
        definition.factory,
        definition.aliases || [],
      );
    }
  }

  private static registerBuiltInLLMScorers(): void {
    ScorerRegistry.registerScorerDefinitions(BUILT_IN_LLM_SCORERS);
  }

  private static registerBuiltInRuleScorers(): void {
    ScorerRegistry.registerScorerDefinitions(BUILT_IN_RULE_SCORERS);
  }

  /**
   * Register built-in scorers using dynamic imports
   */
  static async registerBuiltInScorers(): Promise<void> {
    if (ScorerRegistry.initialized) {
      return;
    }
    if (ScorerRegistry.initPromise) {
      return ScorerRegistry.initPromise;
    }

    ScorerRegistry.initPromise = (async () => {
      try {
        ScorerRegistry.registerBuiltInLLMScorers();
        ScorerRegistry.registerBuiltInRuleScorers();

        ScorerRegistry.initialized = true;
        logger.debug(
          `Registered ${ScorerRegistry.scorers.size} built-in scorers (including aliases)`,
        );
      } catch (err) {
        ScorerRegistry.initPromise = null; // allow retry on next call
        throw err;
      }
    })();

    return ScorerRegistry.initPromise;
  }

  /**
   * Get a scorer instance by ID
   */
  static async getScorer(
    scorerId: string,
    config?: ScorerConfig,
  ): Promise<Scorer | undefined> {
    await ScorerRegistry.ensureInitialized();

    const normalizedId = scorerId.toLowerCase();
    const entry = ScorerRegistry.scorers.get(normalizedId);

    if (!entry) {
      logger.warn(`Scorer not found: ${scorerId}`);
      return undefined;
    }

    // Merge configurations
    const mergedConfig = {
      ...entry.defaultConfig,
      ...config,
    };

    return entry.factory(mergedConfig);
  }

  /**
   * Get scorers by category
   */
  static getScorersByCategory(category: ScorerCategory): ScorerRegistryEntry[] {
    const results: ScorerRegistryEntry[] = [];
    const seen = new Set<string>();

    for (const entry of ScorerRegistry.scorers.values()) {
      if (
        entry.metadata.category === category &&
        !seen.has(entry.metadata.id)
      ) {
        results.push(entry);
        seen.add(entry.metadata.id);
      }
    }

    return results;
  }

  /**
   * Get scorers by type
   */
  static getScorersByType(type: ScorerType): ScorerRegistryEntry[] {
    const results: ScorerRegistryEntry[] = [];
    const seen = new Set<string>();

    for (const entry of ScorerRegistry.scorers.values()) {
      if (entry.metadata.type === type && !seen.has(entry.metadata.id)) {
        results.push(entry);
        seen.add(entry.metadata.id);
      }
    }

    return results;
  }

  /**
   * List all registered scorer metadata
   */
  static list(): ScorerMetadata[] {
    const results: ScorerMetadata[] = [];
    const seen = new Set<string>();

    for (const entry of ScorerRegistry.scorers.values()) {
      if (!seen.has(entry.metadata.id)) {
        results.push(entry.metadata);
        seen.add(entry.metadata.id);
      }
    }

    return results;
  }

  /**
   * Check if a scorer is registered
   */
  static has(scorerId: string): boolean {
    return ScorerRegistry.scorers.has(scorerId.toLowerCase());
  }

  /**
   * Unregister a scorer
   */
  static unregister(scorerId: string): boolean {
    const normalizedId = scorerId.toLowerCase();
    const entry = ScorerRegistry.scorers.get(normalizedId);

    if (!entry) {
      return false;
    }

    // Remove main entry
    ScorerRegistry.scorers.delete(normalizedId);

    // Remove aliases
    if (entry.aliases) {
      for (const alias of entry.aliases) {
        ScorerRegistry.scorers.delete(alias.toLowerCase());
      }
    }

    logger.debug(`Scorer unregistered: ${scorerId}`);
    return true;
  }

  /**
   * Clear all registered scorers
   */
  static clear(): void {
    ScorerRegistry.scorers.clear();
    ScorerRegistry.initialized = false;
    ScorerRegistry.initPromise = null;
    logger.debug("Scorer registry cleared");
  }

  /**
   * Ensure built-in scorers are initialized
   */
  private static async ensureInitialized(): Promise<void> {
    if (!ScorerRegistry.initialized) {
      await ScorerRegistry.registerBuiltInScorers();
    }
    if (ScorerRegistry.initPromise) {
      await ScorerRegistry.initPromise;
    }
  }

  /**
   * Get the number of registered scorers (excluding aliases)
   */
  static get size(): number {
    const seen = new Set<string>();
    for (const entry of ScorerRegistry.scorers.values()) {
      seen.add(entry.metadata.id);
    }
    return seen.size;
  }
}
