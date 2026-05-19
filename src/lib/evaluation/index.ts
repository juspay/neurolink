import type {
  EvaluationData,
  GenerateResult,
  AutoEvaluationConfig,
  EnhancedEvaluationContext,
  EvaluationConfig,
  EvaluationResult,
} from "../types/index.js";
import { ContextBuilder } from "./contextBuilder.js";
import { RAGASEvaluator } from "./ragasEvaluator.js";
import { mapToEvaluationData } from "./scoring.js";
import type { LanguageModelV3CallOptions } from "../types/index.js";

// Re-export errors
export * from "./errors/index.js";

// Re-export hooks
export * from "./hooks/index.js";

// Re-export pipeline
export * from "./pipeline/index.js";
// Re-export reporting
export * from "./reporting/index.js";
// Re-export scorers
export * from "./scorers/index.js";

// Re-export Factory and Registry
export { BatchEvaluator } from "./BatchEvaluator.js";

export { EvaluationAggregator } from "./EvaluationAggregator.js";

export { EvaluatorFactory, getEvaluatorFactory } from "./EvaluatorFactory.js";

export {
  EvaluatorRegistry,
  getEvaluatorRegistry,
} from "./EvaluatorRegistry.js";

// Re-export internal RAGAS classes so callers (and the evaluation test
// suite) can instantiate them directly from the public surface.
export { RAGASEvaluator } from "./ragasEvaluator.js";
export { RetryManager } from "./retryManager.js";

/**
 * A centralized class for performing response evaluations. It supports different
 * evaluation strategies, with RAGAS-style model-based evaluation as the default.
 * This class orchestrates the context building and evaluation process.
 */
export class Evaluator {
  private contextBuilder: ContextBuilder;
  private config: EvaluationConfig;
  private ragasEvaluator: RAGASEvaluator;

  constructor(config: EvaluationConfig = {}) {
    this.config = config;
    this.contextBuilder = new ContextBuilder();
    this.ragasEvaluator = new RAGASEvaluator(
      this.config.evaluationModel,
      this.config.provider,
      this.config.threshold,
      this.config.promptGenerator,
    );
  }

  /**
   * The main entry point for performing an evaluation. It selects the evaluation
   * strategy based on the configuration and executes it.
   *
   * @param options The original `TextGenerationOptions` from the user request.
   * @param result The `GenerateResult` from the provider.
   * @returns A promise that resolves to the `EvaluationResult`.
   */
  public async evaluate(
    options: LanguageModelV3CallOptions,
    result: GenerateResult,
    threshold: number,
    config: AutoEvaluationConfig,
  ): Promise<EvaluationData> {
    const evaluationStrategy = this.config.evaluationStrategy || "ragas";
    const customEvaluator = this.config.customEvaluator;
    switch (evaluationStrategy) {
      case "ragas": {
        const { evaluationResult, evalContext } = await this.evaluateWithRAGAS(
          options,
          result,
        );

        const evaluationData = mapToEvaluationData(
          evalContext,
          evaluationResult,
          threshold,
          config.offTopicThreshold,
          config.highSeverityThreshold,
        );

        return evaluationData;
      }
      case "custom": {
        if (customEvaluator) {
          const { evaluationResult, evalContext } = await customEvaluator(
            options,
            result,
          );
          return mapToEvaluationData(
            evalContext,
            evaluationResult,
            threshold,
            config.offTopicThreshold,
            config.highSeverityThreshold,
          );
        }
        throw new Error("Custom evaluator function not provided in config.");
      }
      default:
        throw new Error(
          `Unsupported evaluation strategy: ${evaluationStrategy} `,
        );
    }
  }

  /**
   * Performs evaluation using the RAGAS-style model-based evaluator.
   *
   * @param options The original `TextGenerationOptions`.
   * @param result The `GenerateResult` to be evaluated.
   * @returns A promise that resolves to the `EvaluationResult`.
   */
  private async evaluateWithRAGAS(
    options: LanguageModelV3CallOptions,
    result: GenerateResult,
  ): Promise<{
    evaluationResult: EvaluationResult;
    evalContext: EnhancedEvaluationContext;
  }> {
    const evalContext = this.contextBuilder.buildContext(options, result);
    const evaluationResult = await this.ragasEvaluator.evaluate(evalContext);
    return { evaluationResult, evalContext };
  }
}
