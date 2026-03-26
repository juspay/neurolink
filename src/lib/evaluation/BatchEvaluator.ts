/**
 * @file BatchEvaluator - Supports batch evaluation of multiple responses.
 * Enables parallel evaluation with configurable concurrency and error handling.
 */

import type { LanguageModelV3CallOptions } from "@ai-sdk/provider";
import type { GenerateResult } from "../types/generateTypes.js";
import type { EvaluationConfig } from "../types/evaluationTypes.js";
import type { EvaluationData } from "../types/evaluation.js";
import type { AutoEvaluationConfig } from "../types/middlewareTypes.js";
import { Evaluator } from "./index.js";
import {
  createBatchEvaluationError,
  isRetryableEvaluationError,
} from "./errors/EvaluationError.js";
import { logger } from "../utils/logger.js";
import { NeuroLinkFeatureError } from "../core/infrastructure/index.js";

/**
 * Configuration for batch evaluation.
 */
export interface BatchEvaluationConfig extends EvaluationConfig {
  /** Maximum number of concurrent evaluations (default: 5) */
  concurrency?: number;
  /** Whether to continue on individual failures (default: true) */
  continueOnError?: boolean;
  /** Maximum retries for retryable errors (default: 2) */
  maxRetries?: number;
  /** Delay between retries in milliseconds (default: 1000) */
  retryDelay?: number;
  /** Callback for progress updates */
  onProgress?: (progress: BatchProgress) => void;
  /** Callback for individual evaluation completion */
  onItemComplete?: (result: BatchEvaluationItemResult) => void;
}

/**
 * Progress information for batch evaluation.
 */
export interface BatchProgress {
  /** Total items to evaluate */
  total: number;
  /** Items completed (success + failed) */
  completed: number;
  /** Items that succeeded */
  succeeded: number;
  /** Items that failed */
  failed: number;
  /** Items still pending */
  pending: number;
  /** Percentage complete */
  percentComplete: number;
}

/**
 * Input item for batch evaluation.
 */
export interface BatchEvaluationItem {
  /** Unique identifier for this item */
  id: string;
  /** The generation options */
  options: LanguageModelV3CallOptions;
  /** The generation result to evaluate */
  result: GenerateResult;
  /** Optional item-specific threshold override */
  threshold?: number;
}

/**
 * Result for a single item in batch evaluation.
 */
export interface BatchEvaluationItemResult {
  /** The item ID */
  id: string;
  /** Whether the evaluation succeeded */
  success: boolean;
  /** The evaluation data (if successful) */
  data?: EvaluationData;
  /** Error information (if failed) */
  error?: {
    message: string;
    code?: string;
    retryable?: boolean;
  };
  /** Time taken for this evaluation in milliseconds */
  duration: number;
  /** Number of retry attempts (if any) */
  retryCount: number;
}

/**
 * Result of a batch evaluation operation.
 */
export interface BatchEvaluationResult {
  /** All item results */
  results: BatchEvaluationItemResult[];
  /** Summary statistics */
  summary: {
    /** Total items evaluated */
    total: number;
    /** Number of successful evaluations */
    succeeded: number;
    /** Number of failed evaluations */
    failed: number;
    /** Average evaluation score (for successful items) */
    averageScore: number;
    /** Average evaluation time in milliseconds */
    averageDuration: number;
    /** Total time for batch evaluation */
    totalDuration: number;
    /** Passing rate (percentage of items meeting threshold) */
    passingRate: number;
  };
  /** Whether all evaluations succeeded */
  allSucceeded: boolean;
}

/**
 * BatchEvaluator - Performs evaluation on multiple items in parallel.
 * Supports configurable concurrency, retry logic, and progress tracking.
 *
 * @example
 * ```typescript
 * const batchEvaluator = new BatchEvaluator({
 *   concurrency: 3,
 *   continueOnError: true,
 *   onProgress: (progress) => console.log(`${progress.percentComplete}% complete`)
 * });
 *
 * const items = [
 *   { id: '1', options: opts1, result: result1 },
 *   { id: '2', options: opts2, result: result2 },
 * ];
 *
 * const batchResult = await batchEvaluator.evaluateBatch(items);
 * console.log(`Passing rate: ${batchResult.summary.passingRate}%`);
 * ```
 */
export class BatchEvaluator {
  private config: BatchEvaluationConfig;

  constructor(config: BatchEvaluationConfig = {}) {
    this.config = {
      concurrency: 5,
      continueOnError: true,
      maxRetries: 2,
      retryDelay: 1000,
      ...config,
    };
  }

  /**
   * Create a fresh Evaluator instance for each evaluation to avoid leaking state.
   */
  private _createEvaluator(): Evaluator {
    return new Evaluator(this.config);
  }

  /**
   * Evaluates a batch of items in parallel with controlled concurrency.
   *
   * @param items - Array of items to evaluate
   * @param autoEvalConfig - Auto-evaluation configuration for thresholds
   * @returns Batch evaluation results with summary statistics
   */
  public async evaluateBatch(
    items: BatchEvaluationItem[],
    autoEvalConfig: AutoEvaluationConfig = {},
  ): Promise<BatchEvaluationResult> {
    const startTime = Date.now();
    const results: BatchEvaluationItemResult[] = [];
    const concurrency = this.config.concurrency || 5;

    // Track progress
    let completed = 0;
    let succeeded = 0;
    let failed = 0;

    const reportProgress = () => {
      if (this.config.onProgress) {
        try {
          this.config.onProgress({
            total: items.length,
            completed,
            succeeded,
            failed,
            pending: items.length - completed,
            percentComplete: Math.round((completed / items.length) * 100),
          });
        } catch (callbackError) {
          logger.warn("[BatchEvaluator] onProgress callback threw an error", {
            error:
              callbackError instanceof Error
                ? callbackError.message
                : String(callbackError),
          });
        }
      }
    };

    // Process items with concurrency limit
    const processItem = async (
      item: BatchEvaluationItem,
    ): Promise<BatchEvaluationItemResult> => {
      const itemStartTime = Date.now();
      let retryCount = 0;
      let lastError: Error | undefined;

      while (retryCount <= (this.config.maxRetries || 2)) {
        try {
          const threshold =
            item.threshold ||
            autoEvalConfig.threshold ||
            this.config.threshold ||
            7;

          // Create fresh evaluator per attempt to avoid leaking state
          const evaluator = this._createEvaluator();
          const data = await evaluator.evaluate(
            item.options,
            item.result,
            threshold,
            {
              ...autoEvalConfig,
              threshold,
            },
          );

          const result: BatchEvaluationItemResult = {
            id: item.id,
            success: true,
            data,
            duration: Date.now() - itemStartTime,
            retryCount,
          };

          succeeded++;
          completed++;
          reportProgress();

          if (this.config.onItemComplete) {
            try {
              this.config.onItemComplete(result);
            } catch (callbackError) {
              logger.warn(
                "[BatchEvaluator] onItemComplete callback threw an error",
                {
                  error:
                    callbackError instanceof Error
                      ? callbackError.message
                      : String(callbackError),
                },
              );
            }
          }

          return result;
        } catch (error) {
          lastError = error as Error;

          // Check if error is retryable
          const isRetryable =
            error instanceof NeuroLinkFeatureError &&
            isRetryableEvaluationError(error);

          if (isRetryable && retryCount < (this.config.maxRetries || 2)) {
            retryCount++;
            logger.debug(
              `[BatchEvaluator.evaluateBatch] Retrying evaluation for item ${item.id}`,
              { attempt: retryCount + 1, itemId: item.id },
            );
            await this.delay(this.config.retryDelay || 1000);
            continue;
          }

          // Not retryable or max retries exceeded
          break;
        }
      }

      // Failed after all retries
      const errorResult: BatchEvaluationItemResult = {
        id: item.id,
        success: false,
        error: {
          message: lastError?.message || "Unknown error",
          code:
            lastError instanceof NeuroLinkFeatureError
              ? lastError.code
              : undefined,
          retryable:
            lastError instanceof NeuroLinkFeatureError
              ? lastError.retryable
              : false,
        },
        duration: Date.now() - itemStartTime,
        retryCount,
      };

      failed++;
      completed++;
      reportProgress();

      if (this.config.onItemComplete) {
        try {
          this.config.onItemComplete(errorResult);
        } catch (callbackError) {
          logger.warn(
            "[BatchEvaluator] onItemComplete callback threw an error",
            {
              error:
                callbackError instanceof Error
                  ? callbackError.message
                  : String(callbackError),
            },
          );
        }
      }

      if (!this.config.continueOnError) {
        throw lastError;
      }

      return errorResult;
    };

    // Process items in batches based on concurrency
    for (let i = 0; i < items.length; i += concurrency) {
      const batch = items.slice(i, i + concurrency);
      const settled = await Promise.allSettled(batch.map(processItem));

      const batchResults: BatchEvaluationItemResult[] = [];
      for (const outcome of settled) {
        if (outcome.status === "fulfilled") {
          batchResults.push(outcome.value);
        }
        // Rejected outcomes are already handled inside processItem
        // (errors are caught and returned as error results when continueOnError is true,
        //  or re-thrown which causes the settled entry to be 'rejected')
      }
      results.push(...batchResults);

      // If continueOnError is false and any item in this batch was rejected, throw aggregate
      if (!this.config.continueOnError) {
        const rejections = settled.filter((s) => s.status === "rejected");
        if (rejections.length > 0) {
          const failedItems = results
            .filter((r) => !r.success)
            .map((r, idx) => ({
              index: idx,
              error: new Error(r.error?.message || "Unknown error"),
            }));
          throw createBatchEvaluationError(
            rejections.length,
            items.length,
            failedItems,
          );
        }
      }
    }

    // Calculate summary statistics
    const successfulResults = results.filter((r) => r.success && r.data);
    const scores = successfulResults.map((r) => r.data!.overall);
    const passingScores = successfulResults.filter(
      (r) =>
        r.data!.overall >=
        (autoEvalConfig.threshold || this.config.threshold || 7),
    );

    const summary = {
      total: items.length,
      succeeded,
      failed,
      averageScore:
        scores.length > 0
          ? scores.reduce((a, b) => a + b, 0) / scores.length
          : 0,
      averageDuration:
        results.length > 0
          ? results.reduce((a, b) => a + b.duration, 0) / results.length
          : 0,
      totalDuration: Date.now() - startTime,
      passingRate:
        successfulResults.length > 0
          ? (passingScores.length / successfulResults.length) * 100
          : 0,
    };

    return {
      results,
      summary,
      allSucceeded: failed === 0,
    };
  }

  /**
   * Evaluates items sequentially (one at a time).
   * Useful for debugging or when order matters.
   *
   * @param items - Array of items to evaluate
   * @param autoEvalConfig - Auto-evaluation configuration
   * @returns Batch evaluation results
   */
  public async evaluateSequential(
    items: BatchEvaluationItem[],
    autoEvalConfig: AutoEvaluationConfig = {},
  ): Promise<BatchEvaluationResult> {
    // Create a temporary evaluator with sequential config to avoid mutating shared state
    const sequentialEvaluator = new BatchEvaluator({
      ...this.config,
      concurrency: 1,
    });
    return sequentialEvaluator.evaluateBatch(items, autoEvalConfig);
  }

  /**
   * Gets the current configuration.
   */
  public getConfig(): BatchEvaluationConfig {
    return { ...this.config };
  }

  /**
   * Updates the configuration.
   *
   * @param config - New configuration values
   */
  public updateConfig(config: Partial<BatchEvaluationConfig>): void {
    this.config = { ...this.config, ...config };
    // Fresh evaluators are created per evaluation via _createEvaluator(),
    // so no shared evaluator needs to be re-created here.
  }

  /**
   * Helper to delay execution.
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
