/**
 * Parallel Step
 *
 * Step type for executing multiple operations in parallel.
 * Provides concurrency control and result aggregation.
 *
 * @module workflow/steps/ParallelStep
 */

import pLimit from "p-limit";
import type {
  StepDefinition,
  StepConfig,
  StepResult,
  WorkflowContext,
} from "../types/workflowTypes.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Parallel task function type
 */
export type ParallelTaskFunction<TInput = unknown, TOutput = unknown> = (
  input: TInput,
  context: WorkflowContext,
  index: number,
) => TOutput | Promise<TOutput>;

/**
 * Parallel result
 */
export interface ParallelResult<T = unknown> {
  /** Results from all tasks */
  results: Array<{
    index: number;
    success: boolean;
    data?: T;
    error?: string;
  }>;
  /** Number of successful tasks */
  successCount: number;
  /** Number of failed tasks */
  failureCount: number;
  /** Total execution time */
  totalDuration: number;
}

/**
 * Parallel step configuration
 */
export interface ParallelStepConfig<TInput = unknown, TOutput = unknown>
  extends Omit<StepConfig<TInput[], ParallelResult<TOutput>>, "execute"> {
  /** Task function to execute for each input */
  task: ParallelTaskFunction<TInput, TOutput>;
  /** Maximum concurrency (default: 10) */
  concurrency?: number;
  /** Continue on error (default: true) */
  continueOnError?: boolean;
  /** Fail fast - stop on first error (default: false) */
  failFast?: boolean;
}

/**
 * Batch parallel step configuration
 */
export interface BatchParallelStepConfig<TInput = unknown, TOutput = unknown>
  extends Omit<StepConfig<TInput[], ParallelResult<TOutput>>, "execute"> {
  /** Batch processor function */
  processBatch: (
    batch: TInput[],
    context: WorkflowContext,
  ) => TOutput[] | Promise<TOutput[]>;
  /** Batch size (default: 10) */
  batchSize?: number;
  /** Maximum concurrent batches (default: 5) */
  concurrency?: number;
  /** Continue on error (default: true) */
  continueOnError?: boolean;
}

// =============================================================================
// Parallel Step Factory
// =============================================================================

/**
 * Create a parallel step factory
 */
export function createParallelStepFactory<TInput = unknown, TOutput = unknown>() {
  return (config: ParallelStepConfig<TInput, TOutput>): StepDefinition<TInput[], ParallelResult<TOutput>> => {
    return {
      id: config.name ?? "parallel",
      name: config.name ?? "Parallel",
      description: config.description ?? "Execute tasks in parallel",
      inputSchema: config.inputSchema,
      retry: config.retry,
      timeout: config.timeout ?? 60000,
      suspendable: false,
      tags: config.tags ?? ["parallel"],
      execute: async (
        input: TInput[],
        context: WorkflowContext,
      ): Promise<StepResult<ParallelResult<TOutput>>> => {
        const startTime = Date.now();
        const concurrency = config.concurrency ?? 10;
        const continueOnError = config.continueOnError ?? true;
        const failFast = config.failFast ?? false;
        const limit = pLimit(concurrency);

        const results: ParallelResult<TOutput>["results"] = [];
        let aborted = false;

        try {
          const promises = input.map((item, index) =>
            limit(async () => {
              if (aborted) {
                return {
                  index,
                  success: false,
                  error: "Aborted due to previous error",
                };
              }

              try {
                const data = await config.task(item, context, index);
                return {
                  index,
                  success: true,
                  data,
                };
              } catch (error) {
                if (failFast) {
                  aborted = true;
                }

                const errorResult = {
                  index,
                  success: false,
                  error: error instanceof Error ? error.message : String(error),
                };

                if (!continueOnError && !failFast) {
                  throw error;
                }

                return errorResult;
              }
            }),
          );

          const taskResults = await Promise.all(promises);
          results.push(...taskResults);

          const successCount = results.filter((r) => r.success).length;
          const failureCount = results.filter((r) => !r.success).length;

          return {
            success: continueOnError || failureCount === 0,
            data: {
              results,
              successCount,
              failureCount,
              totalDuration: Date.now() - startTime,
            },
          };
        } catch (error) {
          return {
            success: false,
            data: {
              results,
              successCount: results.filter((r) => r.success).length,
              failureCount: results.filter((r) => !r.success).length,
              totalDuration: Date.now() - startTime,
            },
            error: {
              code: "PARALLEL_ERROR",
              message: error instanceof Error ? error.message : String(error),
              retryable: true,
              cause: error instanceof Error ? error : undefined,
            },
          };
        }
      },
    };
  };
}

/**
 * Create a batch parallel step factory
 */
export function createBatchParallelStepFactory<TInput = unknown, TOutput = unknown>() {
  return (config: BatchParallelStepConfig<TInput, TOutput>): StepDefinition<TInput[], ParallelResult<TOutput>> => {
    return {
      id: config.name ?? "batch-parallel",
      name: config.name ?? "Batch Parallel",
      description: config.description ?? "Process items in batches in parallel",
      inputSchema: config.inputSchema,
      retry: config.retry,
      timeout: config.timeout ?? 120000,
      suspendable: false,
      tags: config.tags ?? ["parallel", "batch"],
      execute: async (
        input: TInput[],
        context: WorkflowContext,
      ): Promise<StepResult<ParallelResult<TOutput>>> => {
        const startTime = Date.now();
        const batchSize = config.batchSize ?? 10;
        const concurrency = config.concurrency ?? 5;
        const continueOnError = config.continueOnError ?? true;
        const limit = pLimit(concurrency);

        // Split input into batches
        const batches: TInput[][] = [];
        for (let i = 0; i < input.length; i += batchSize) {
          batches.push(input.slice(i, i + batchSize));
        }

        const results: ParallelResult<TOutput>["results"] = [];
        let currentIndex = 0;

        try {
          const batchPromises = batches.map((batch, batchIndex) =>
            limit(async () => {
              try {
                const batchResults = await config.processBatch(batch, context);

                return batch.map((_, itemIndex) => ({
                  index: batchIndex * batchSize + itemIndex,
                  success: true,
                  data: batchResults[itemIndex],
                }));
              } catch (error) {
                if (!continueOnError) {
                  throw error;
                }

                return batch.map((_, itemIndex) => ({
                  index: batchIndex * batchSize + itemIndex,
                  success: false,
                  error: error instanceof Error ? error.message : String(error),
                }));
              }
            }),
          );

          const batchResults = await Promise.all(batchPromises);
          for (const batchResult of batchResults) {
            results.push(...batchResult);
          }

          const successCount = results.filter((r) => r.success).length;
          const failureCount = results.filter((r) => !r.success).length;

          return {
            success: continueOnError || failureCount === 0,
            data: {
              results,
              successCount,
              failureCount,
              totalDuration: Date.now() - startTime,
            },
          };
        } catch (error) {
          return {
            success: false,
            data: {
              results,
              successCount: results.filter((r) => r.success).length,
              failureCount: results.filter((r) => !r.success).length,
              totalDuration: Date.now() - startTime,
            },
            error: {
              code: "BATCH_PARALLEL_ERROR",
              message: error instanceof Error ? error.message : String(error),
              retryable: true,
              cause: error instanceof Error ? error : undefined,
            },
          };
        }
      },
    };
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Create a simple parallel map step
 */
export function createParallelMapStep<TInput, TOutput>(
  name: string,
  mapFn: (item: TInput, context: WorkflowContext) => TOutput | Promise<TOutput>,
  options?: {
    concurrency?: number;
    continueOnError?: boolean;
  },
): StepDefinition<TInput[], ParallelResult<TOutput>> {
  const factory = createParallelStepFactory<TInput, TOutput>();
  return factory({
    name,
    description: `Parallel map: ${name}`,
    task: (item, context) => mapFn(item, context),
    concurrency: options?.concurrency,
    continueOnError: options?.continueOnError,
  });
}

/**
 * Create a parallel API call step
 */
export function createParallelAPIStep<TInput, TOutput>(
  name: string,
  apiCall: (item: TInput, context: WorkflowContext) => Promise<TOutput>,
  options?: {
    concurrency?: number;
    rateLimit?: number; // requests per second
    continueOnError?: boolean;
  },
): StepDefinition<TInput[], ParallelResult<TOutput>> {
  const factory = createParallelStepFactory<TInput, TOutput>();

  // Add rate limiting if specified
  const delayMs = options?.rateLimit
    ? Math.ceil(1000 / options.rateLimit)
    : 0;

  return factory({
    name,
    description: `Parallel API calls: ${name}`,
    task: async (item, context, index) => {
      // Add delay for rate limiting
      if (delayMs > 0 && index > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * index));
      }
      return apiCall(item, context);
    },
    concurrency: options?.concurrency ?? 5,
    continueOnError: options?.continueOnError ?? true,
  });
}

/**
 * Create a scatter-gather step (parallel with aggregation)
 */
export function createScatterGatherStep<TInput, TIntermediate, TOutput>(
  name: string,
  scatter: (item: TInput, context: WorkflowContext) => Promise<TIntermediate>,
  gather: (results: TIntermediate[], context: WorkflowContext) => Promise<TOutput>,
  options?: {
    concurrency?: number;
  },
): StepDefinition<TInput[], TOutput> {
  return {
    id: name,
    name: `Scatter-Gather: ${name}`,
    description: `Parallel scatter-gather: ${name}`,
    timeout: 120000,
    tags: ["parallel", "scatter-gather"],
    execute: async (input: TInput[], context: WorkflowContext): Promise<StepResult<TOutput>> => {
      const concurrency = options?.concurrency ?? 10;
      const limit = pLimit(concurrency);

      try {
        // Scatter phase
        const promises = input.map((item) =>
          limit(() => scatter(item, context)),
        );
        const intermediateResults = await Promise.all(promises);

        // Gather phase
        const finalResult = await gather(intermediateResults, context);

        return {
          success: true,
          data: finalResult,
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: "SCATTER_GATHER_ERROR",
            message: error instanceof Error ? error.message : String(error),
            retryable: true,
            cause: error instanceof Error ? error : undefined,
          },
        };
      }
    },
  };
}
