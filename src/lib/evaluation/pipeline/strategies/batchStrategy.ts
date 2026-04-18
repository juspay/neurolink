/**
 * @file Batch Strategy
 * Batch processing for evaluation pipelines
 */

import type {
  ScorerInput,
  PipelineExecutionOptions,
  PipelineResult,
  BatchEvaluationConfig,
  BatchEvaluationResult,
  BatchItemResult,
} from "../../../types/index.js";
import type { EvaluationPipeline } from "../evaluationPipeline.js";

function hasPipelineResult(
  result: BatchItemResult,
): result is BatchItemResult & { result: PipelineResult } {
  return !result.error && result.result !== undefined;
}

/**
 * Default batch configuration
 */
const DEFAULT_BATCH_CONFIG: Required<
  Pick<
    BatchEvaluationConfig,
    "concurrency" | "batchDelay" | "continueOnError" | "onProgress" | "onResult"
  >
> = {
  concurrency: 5,
  batchDelay: 0,
  continueOnError: true,
  onProgress: () => {},
  onResult: () => {},
};

/**
 * Batch evaluation strategy
 */
export class BatchStrategy {
  private _pipeline: EvaluationPipeline;
  private _config: Required<
    Pick<
      BatchEvaluationConfig,
      | "concurrency"
      | "batchDelay"
      | "continueOnError"
      | "onProgress"
      | "onResult"
    >
  >;

  constructor(pipeline: EvaluationPipeline, config?: BatchEvaluationConfig) {
    this._pipeline = pipeline;
    this._config = { ...DEFAULT_BATCH_CONFIG, ...config };
  }

  /**
   * Evaluate a batch of inputs
   */
  async evaluate(
    inputs: ScorerInput[],
    options?: PipelineExecutionOptions,
  ): Promise<BatchEvaluationResult> {
    const startTime = Date.now();
    const results: BatchItemResult[] = [];
    const durations: number[] = [];

    // Process in batches based on concurrency
    for (let i = 0; i < inputs.length; i += this._config.concurrency) {
      const batch = inputs.slice(i, i + this._config.concurrency);

      // Execute batch in parallel
      const batchPromises = batch.map((input, batchIndex) => {
        const globalIndex = i + batchIndex;
        return this._evaluateItem(input, globalIndex, options);
      });

      const batchResults = await Promise.all(batchPromises);

      // Record results
      for (const result of batchResults) {
        results.push(result);
        durations.push(result.duration);

        // Notify of individual result
        this._config.onResult(result);

        // Check for fatal error
        if (result.error && !this._config.continueOnError) {
          throw new Error(
            `Batch evaluation failed at index ${result.index}: ${result.error}`,
          );
        }
      }

      // Report progress
      this._config.onProgress({
        total: inputs.length,
        completed: results.length,
        failed: results.filter((r) => r.error).length,
        pending: inputs.length - results.length,
        percentComplete: (results.length / inputs.length) * 100,
        estimatedTimeRemaining: this._estimateRemainingTime(
          durations,
          inputs.length - results.length,
        ),
      });

      // Apply batch delay if configured
      if (
        this._config.batchDelay > 0 &&
        i + this._config.concurrency < inputs.length
      ) {
        await this._delay(this._config.batchDelay);
      }
    }

    // Calculate summary
    const totalDuration = Date.now() - startTime;
    const successfulResults = results.filter(hasPipelineResult);
    const scores = successfulResults.map((r) => r.result.overallScore);
    const passed = successfulResults.filter((r) => r.result.passed);

    return {
      results,
      summary: {
        total: inputs.length,
        succeeded: successfulResults.length,
        failed: results.length - successfulResults.length,
        averageScore:
          scores.length > 0
            ? scores.reduce((a, b) => a + b, 0) / scores.length
            : 0,
        passingRate:
          successfulResults.length > 0
            ? passed.length / successfulResults.length
            : 0,
        totalDuration,
        averageDuration:
          durations.length > 0
            ? durations.reduce((a, b) => a + b, 0) / durations.length
            : 0,
      },
    };
  }

  /**
   * Evaluate a single item
   */
  private async _evaluateItem(
    input: ScorerInput,
    index: number,
    options?: PipelineExecutionOptions,
  ): Promise<BatchItemResult> {
    const startTime = Date.now();

    try {
      const result = await this._pipeline.execute(input, {
        ...options,
        correlationId: options?.correlationId
          ? `${options.correlationId}-${index}`
          : `batch-${index}`,
      });

      return {
        index,
        input,
        result,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        index,
        input,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Estimate remaining time based on average duration
   */
  private _estimateRemainingTime(
    durations: number[],
    remaining: number,
  ): number {
    if (durations.length === 0 || remaining === 0) {
      return 0;
    }

    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const batches = Math.ceil(remaining / this._config.concurrency);

    return avgDuration * batches + this._config.batchDelay * (batches - 1);
  }

  /**
   * Delay helper
   */
  private _delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Update configuration
   */
  configure(config: Partial<BatchEvaluationConfig>): void {
    this._config = { ...this._config, ...config };
  }
}

/**
 * Create a batch strategy for a pipeline
 */
export function createBatchStrategy(
  pipeline: EvaluationPipeline,
  config?: BatchEvaluationConfig,
): BatchStrategy {
  return new BatchStrategy(pipeline, config);
}

/**
 * Evaluate a batch of inputs using a pipeline
 */
export async function evaluateBatch(
  pipeline: EvaluationPipeline,
  inputs: ScorerInput[],
  config?: BatchEvaluationConfig,
): Promise<BatchEvaluationResult> {
  const strategy = new BatchStrategy(pipeline, config);
  return strategy.evaluate(inputs);
}

/**
 * Stream batch evaluation results
 */
export async function* streamBatchEvaluation(
  pipeline: EvaluationPipeline,
  inputs: ScorerInput[],
  config?: Omit<BatchEvaluationConfig, "onResult" | "onProgress">,
): AsyncGenerator<BatchItemResult, BatchEvaluationResult["summary"], void> {
  const results: BatchItemResult[] = [];
  const durations: number[] = [];
  const startTime = Date.now();
  const batchConfig = { ...DEFAULT_BATCH_CONFIG, ...config };

  for (let i = 0; i < inputs.length; i += batchConfig.concurrency) {
    const batch = inputs.slice(i, i + batchConfig.concurrency);

    const batchPromises = batch.map(async (input, batchIndex) => {
      const globalIndex = i + batchIndex;
      const itemStart = Date.now();

      try {
        const result = await pipeline.execute(input, {
          correlationId: `stream-batch-${globalIndex}`,
        });

        return {
          index: globalIndex,
          input,
          result,
          duration: Date.now() - itemStart,
        } as BatchItemResult;
      } catch (error) {
        return {
          index: globalIndex,
          input,
          error: error instanceof Error ? error.message : String(error),
          duration: Date.now() - itemStart,
        } as BatchItemResult;
      }
    });

    const batchResults = await Promise.all(batchPromises);

    for (const result of batchResults) {
      results.push(result);
      durations.push(result.duration);

      // If continueOnError is false and this result has an error, abort and return summary
      if (result.error && batchConfig.continueOnError === false) {
        const successfulResults = results.filter(hasPipelineResult);
        const earlyScores = successfulResults.map((r) => r.result.overallScore);
        const earlyPassed = successfulResults.filter((r) => r.result.passed);
        return {
          total: inputs.length,
          succeeded: successfulResults.length,
          failed: results.length - successfulResults.length,
          averageScore:
            earlyScores.length > 0
              ? earlyScores.reduce((a, b) => a + b, 0) / earlyScores.length
              : 0,
          passingRate:
            successfulResults.length > 0
              ? earlyPassed.length / successfulResults.length
              : 0,
          totalDuration: Date.now() - startTime,
          averageDuration:
            durations.length > 0
              ? durations.reduce((a, b) => a + b, 0) / durations.length
              : 0,
        };
      }

      yield result;
    }

    if (
      batchConfig.batchDelay > 0 &&
      i + batchConfig.concurrency < inputs.length
    ) {
      await new Promise((resolve) =>
        setTimeout(resolve, batchConfig.batchDelay),
      );
    }
  }

  // Return summary
  const successfulResults = results.filter(hasPipelineResult);
  const scores = successfulResults.map((r) => r.result.overallScore);
  const passed = successfulResults.filter((r) => r.result.passed);

  return {
    total: inputs.length,
    succeeded: successfulResults.length,
    failed: results.length - successfulResults.length,
    averageScore:
      scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
    passingRate:
      successfulResults.length > 0
        ? passed.length / successfulResults.length
        : 0,
    totalDuration: Date.now() - startTime,
    averageDuration:
      durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : 0,
  };
}
