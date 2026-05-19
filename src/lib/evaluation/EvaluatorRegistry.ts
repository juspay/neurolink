/**
 * @file EvaluatorRegistry - Registry for evaluation strategies.
 * Extends BaseRegistry to provide dynamic strategy registration and lookup.
 */

import { BaseRegistry } from "../core/infrastructure/index.js";
import type {
  EvaluationStrategyConfig,
  EvaluationStrategyFunction,
  EvaluationStrategyMetadata,
  GenerateResult,
} from "../types/index.js";
import { createStrategyNotFoundError } from "./errors/EvaluationError.js";
import { withTimeout, ErrorFactory } from "../utils/errorHandling.js";
import type { LanguageModelV3CallOptions } from "../types/index.js";

/**
 * Registry for evaluation strategies.
 * Allows dynamic registration and retrieval of evaluation strategies.
 *
 * @example
 * ```typescript
 * // Register a custom strategy
 * EvaluatorRegistry.getInstance().registerStrategy(
 *   'custom-ragas',
 *   async () => ({
 *     evaluate: async (options, result) => { ... }
 *   }),
 *   {
 *     name: 'Custom RAGAS',
 *     description: 'Custom RAGAS implementation',
 *     requiresLLM: true,
 *     defaultModel: 'gpt-4',
 *     defaultProvider: 'openai',
 *     version: '1.0.0',
 *     features: ['custom-metrics']
 *   }
 * );
 *
 * // Get a strategy
 * const strategy = await EvaluatorRegistry.getInstance().getStrategy('ragas');
 * ```
 */
export class EvaluatorRegistry extends BaseRegistry<
  EvaluationStrategyFunction,
  EvaluationStrategyMetadata
> {
  private static instance: EvaluatorRegistry | null = null;

  private constructor() {
    super();
  }

  /**
   * Gets the singleton instance of the EvaluatorRegistry.
   */
  public static getInstance(): EvaluatorRegistry {
    if (!EvaluatorRegistry.instance) {
      EvaluatorRegistry.instance = new EvaluatorRegistry();
    }
    return EvaluatorRegistry.instance;
  }

  /**
   * Resets the singleton instance (useful for testing).
   */
  public static resetInstance(): void {
    EvaluatorRegistry.instance = null;
  }

  /**
   * Registers all built-in evaluation strategies.
   * This is called automatically on first access.
   */
  protected async registerAll(): Promise<void> {
    // Register the built-in RAGAS strategy
    this.registerStrategy(
      "ragas",
      async () => {
        const { RAGASEvaluator } = await import("./ragasEvaluator.js");
        const { ContextBuilder } = await import("./contextBuilder.js");

        return async (
          options: LanguageModelV3CallOptions,
          result: GenerateResult,
          config?: EvaluationStrategyConfig,
        ) => {
          const contextBuilder = new ContextBuilder();
          const ragasEvaluator = new RAGASEvaluator(
            config?.evaluationModel,
            config?.provider,
            config?.threshold,
            config?.promptGenerator,
          );

          const evalContext = contextBuilder.buildContext(options, result);
          const evaluationTimeoutMs =
            (config?.options?.timeout as number) ?? 60000;
          const evaluationResult = await withTimeout(
            ragasEvaluator.evaluate(evalContext),
            evaluationTimeoutMs,
            ErrorFactory.evaluationTimeout(
              "strategy evaluation",
              evaluationTimeoutMs,
            ),
          );

          return { evaluationResult, evalContext };
        };
      },
      {
        name: "RAGAS Evaluator",
        description:
          "RAGAS-style LLM-as-judge evaluation with relevance, accuracy, and completeness metrics",
        requiresLLM: true,
        defaultModel: "gemini-1.5-flash",
        defaultProvider: "vertex",
        version: "1.0.0",
        features: [
          "relevance-scoring",
          "accuracy-scoring",
          "completeness-scoring",
          "reasoning",
          "suggestions",
        ],
      },
    );
  }

  /**
   * Registers an evaluation strategy with the registry.
   *
   * @param id - Unique identifier for the strategy
   * @param factory - Factory function that creates the strategy
   * @param metadata - Metadata about the strategy
   */
  public registerStrategy(
    id: string,
    factory: () => Promise<EvaluationStrategyFunction>,
    metadata: EvaluationStrategyMetadata,
  ): void {
    this.register(id, factory, [], { metadata });
  }

  /**
   * Gets an evaluation strategy by ID.
   *
   * @param id - The strategy identifier
   * @returns The evaluation strategy function
   * @throws {NeuroLinkFeatureError} If the strategy is not found
   */
  public async getStrategy(id: string): Promise<EvaluationStrategyFunction> {
    const strategy = await this.get(id);
    if (!strategy) {
      const strategies = await this.listStrategies();
      const available = strategies.map((s) => s.id);
      throw createStrategyNotFoundError(id, available);
    }
    return strategy;
  }

  /**
   * Checks if a strategy exists in the registry.
   *
   * @param id - The strategy identifier
   * @returns true if the strategy exists
   */
  public async hasStrategy(id: string): Promise<boolean> {
    await this.ensureInitialized();
    return this.has(id);
  }

  /**
   * Lists all registered strategies with their metadata.
   *
   * @returns Array of strategy IDs and their metadata
   */
  public async listStrategies(): Promise<
    Array<{
      id: string;
      metadata: EvaluationStrategyMetadata;
    }>
  > {
    await this.ensureInitialized();
    return this.list();
  }

  /**
   * Gets the metadata for a specific strategy.
   *
   * @param id - The strategy identifier
   * @returns The strategy metadata or undefined if not found
   */
  public async getStrategyMetadata(
    id: string,
  ): Promise<EvaluationStrategyMetadata | undefined> {
    await this.ensureInitialized();
    const entry = this.items.get(id);
    return entry?.metadata;
  }

  /**
   * Unregisters a strategy from the registry.
   *
   * @param id - The strategy identifier
   * @returns true if the strategy was removed, false if it didn't exist
   */
  public async unregisterStrategy(id: string): Promise<boolean> {
    await this.ensureInitialized();
    if (this.items.has(id)) {
      this.items.delete(id);
      return true;
    }
    return false;
  }

  /**
   * Gets strategies that support a specific feature.
   *
   * @param feature - The feature to filter by
   * @returns Array of strategy IDs that support the feature
   */
  public async getStrategiesWithFeature(feature: string): Promise<string[]> {
    await this.ensureInitialized();
    return this.list()
      .filter((item) => item.metadata.features.includes(feature))
      .map((item) => item.id);
  }

  /**
   * Gets strategies that use a specific provider.
   *
   * @param provider - The provider to filter by
   * @returns Array of strategy IDs that use the provider
   */
  public async getStrategiesByProvider(provider: string): Promise<string[]> {
    await this.ensureInitialized();
    return this.list()
      .filter((item) => item.metadata.defaultProvider === provider)
      .map((item) => item.id);
  }
}

// Export singleton instance getter for convenience
export const getEvaluatorRegistry = (): EvaluatorRegistry =>
  EvaluatorRegistry.getInstance();
