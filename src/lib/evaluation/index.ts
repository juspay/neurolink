/**
 * @file This file exports the main Evaluator class, which serves as the central entry point for the evaluation system.
 */

import type { GenerateResult } from "../types/generateTypes.js";
import type {
  EvaluationResult,
  EvaluationConfig,
  EnhancedEvaluationContext,
} from "../types/evaluationTypes.js";
import { ContextBuilder } from "./contextBuilder.js";
import { RAGASEvaluator } from "./ragasEvaluator.js";
import type { LanguageModelV1CallOptions } from "ai";
import { mapToEvaluationData } from "./scoring.js";
import type { AutoEvaluationConfig } from "../types/middlewareTypes.js";
import type { EvaluationData } from "../types/evaluation.js";

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
    options: LanguageModelV1CallOptions,
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
    options: LanguageModelV1CallOptions,
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
