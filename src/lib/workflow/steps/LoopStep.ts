/**
 * Loop Step
 *
 * Step type for iteration patterns including forEach, doWhile, doUntil, and repeat.
 * Provides controlled iteration with safety limits and state management.
 *
 * @module workflow/steps/LoopStep
 */

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
 * Loop body function type
 */
export type LoopBodyFunction<TItem = unknown, TOutput = unknown> = (
  item: TItem,
  index: number,
  context: WorkflowContext,
) => TOutput | Promise<TOutput>;

/**
 * Loop condition function type
 */
export type LoopConditionFunction = (
  iteration: number,
  context: WorkflowContext,
) => boolean | Promise<boolean>;

/**
 * Items provider function type
 */
export type ItemsProviderFunction<TItem = unknown> = (
  context: WorkflowContext,
) => TItem[] | Promise<TItem[]>;

/**
 * Loop result
 */
export interface LoopResult<T = unknown> {
  /** Results from each iteration */
  iterations: Array<{
    index: number;
    success: boolean;
    data?: T;
    error?: string;
  }>;
  /** Total iterations executed */
  iterationCount: number;
  /** Number of successful iterations */
  successCount: number;
  /** Number of failed iterations */
  failureCount: number;
  /** Whether loop completed normally (vs max iterations) */
  completedNormally: boolean;
}

/**
 * ForEach loop step configuration
 */
export interface ForEachLoopStepConfig<TItem = unknown, TOutput = unknown>
  extends Omit<StepConfig<unknown, LoopResult<TOutput>>, "execute"> {
  /** Function to get items to iterate over */
  items: ItemsProviderFunction<TItem>;
  /** Loop body function */
  body: LoopBodyFunction<TItem, TOutput>;
  /** Maximum iterations (safety limit) */
  maxIterations?: number;
  /** Continue on error (default: true) */
  continueOnError?: boolean;
}

/**
 * DoWhile loop step configuration
 */
export interface DoWhileLoopStepConfig<TOutput = unknown>
  extends Omit<StepConfig<unknown, LoopResult<TOutput>>, "execute"> {
  /** Condition function - continue while true */
  condition: LoopConditionFunction;
  /** Loop body function */
  body: (iteration: number, context: WorkflowContext) => TOutput | Promise<TOutput>;
  /** Maximum iterations (safety limit) */
  maxIterations?: number;
  /** Continue on error (default: false) */
  continueOnError?: boolean;
}

/**
 * Repeat loop step configuration
 */
export interface RepeatLoopStepConfig<TOutput = unknown>
  extends Omit<StepConfig<unknown, LoopResult<TOutput>>, "execute"> {
  /** Number of times to repeat */
  times: number;
  /** Loop body function */
  body: (iteration: number, context: WorkflowContext) => TOutput | Promise<TOutput>;
  /** Continue on error (default: true) */
  continueOnError?: boolean;
}

// =============================================================================
// Loop Step Factory
// =============================================================================

const DEFAULT_MAX_ITERATIONS = 1000;

/**
 * Create a forEach loop step factory
 */
export function createLoopStepFactory<TItem = unknown, TOutput = unknown>() {
  return createForEachLoopStepFactory<TItem, TOutput>();
}

/**
 * Create a forEach loop step factory
 */
export function createForEachLoopStepFactory<TItem = unknown, TOutput = unknown>() {
  return (config: ForEachLoopStepConfig<TItem, TOutput>): StepDefinition<unknown, LoopResult<TOutput>> => {
    return {
      id: config.name ?? "foreach-loop",
      name: config.name ?? "ForEach Loop",
      description: config.description ?? "Iterate over items",
      inputSchema: config.inputSchema,
      retry: config.retry,
      timeout: config.timeout ?? 300000, // 5 minutes default
      suspendable: true,
      tags: config.tags ?? ["loop", "foreach"],
      execute: async (
        _input: unknown,
        context: WorkflowContext,
      ): Promise<StepResult<LoopResult<TOutput>>> => {
        const maxIterations = config.maxIterations ?? DEFAULT_MAX_ITERATIONS;
        const continueOnError = config.continueOnError ?? true;
        const iterations: LoopResult<TOutput>["iterations"] = [];

        try {
          // Get items to iterate over
          const items = await config.items(context);

          // Enforce max iterations
          const itemsToProcess = items.slice(0, maxIterations);
          const wasLimited = items.length > maxIterations;

          for (let i = 0; i < itemsToProcess.length; i++) {
            const item = itemsToProcess[i];

            // Update context with loop info
            (context as WorkflowContext & { loopItem: unknown; loopIndex: number }).loopItem = item;
            (context as WorkflowContext & { loopItem: unknown; loopIndex: number }).loopIndex = i;

            try {
              const result = await config.body(item, i, context);
              iterations.push({
                index: i,
                success: true,
                data: result,
              });
            } catch (error) {
              iterations.push({
                index: i,
                success: false,
                error: error instanceof Error ? error.message : String(error),
              });

              if (!continueOnError) {
                break;
              }
            }
          }

          const successCount = iterations.filter((i) => i.success).length;
          const failureCount = iterations.filter((i) => !i.success).length;

          return {
            success: continueOnError || failureCount === 0,
            data: {
              iterations,
              iterationCount: iterations.length,
              successCount,
              failureCount,
              completedNormally: !wasLimited,
            },
          };
        } catch (error) {
          return {
            success: false,
            data: {
              iterations,
              iterationCount: iterations.length,
              successCount: iterations.filter((i) => i.success).length,
              failureCount: iterations.filter((i) => !i.success).length,
              completedNormally: false,
            },
            error: {
              code: "LOOP_ERROR",
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
 * Create a doWhile loop step factory
 */
export function createDoWhileLoopStepFactory<TOutput = unknown>() {
  return (config: DoWhileLoopStepConfig<TOutput>): StepDefinition<unknown, LoopResult<TOutput>> => {
    return {
      id: config.name ?? "dowhile-loop",
      name: config.name ?? "DoWhile Loop",
      description: config.description ?? "Iterate while condition is true",
      inputSchema: config.inputSchema,
      retry: config.retry,
      timeout: config.timeout ?? 300000,
      suspendable: true,
      tags: config.tags ?? ["loop", "dowhile"],
      execute: async (
        _input: unknown,
        context: WorkflowContext,
      ): Promise<StepResult<LoopResult<TOutput>>> => {
        const maxIterations = config.maxIterations ?? DEFAULT_MAX_ITERATIONS;
        const continueOnError = config.continueOnError ?? false;
        const iterations: LoopResult<TOutput>["iterations"] = [];
        let iteration = 0;

        try {
          do {
            // Check max iterations
            if (iteration >= maxIterations) {
              break;
            }

            try {
              const result = await config.body(iteration, context);
              iterations.push({
                index: iteration,
                success: true,
                data: result,
              });
            } catch (error) {
              iterations.push({
                index: iteration,
                success: false,
                error: error instanceof Error ? error.message : String(error),
              });

              if (!continueOnError) {
                break;
              }
            }

            iteration++;

            // Check condition
            const shouldContinue = await config.condition(iteration, context);
            if (!shouldContinue) {
              break;
            }
          } while (true);

          const successCount = iterations.filter((i) => i.success).length;
          const failureCount = iterations.filter((i) => !i.success).length;

          return {
            success: continueOnError || failureCount === 0,
            data: {
              iterations,
              iterationCount: iterations.length,
              successCount,
              failureCount,
              completedNormally: iteration < maxIterations,
            },
          };
        } catch (error) {
          return {
            success: false,
            data: {
              iterations,
              iterationCount: iterations.length,
              successCount: iterations.filter((i) => i.success).length,
              failureCount: iterations.filter((i) => !i.success).length,
              completedNormally: false,
            },
            error: {
              code: "LOOP_ERROR",
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
 * Create a doUntil loop step factory (opposite of doWhile)
 */
export function createDoUntilLoopStepFactory<TOutput = unknown>() {
  return (config: DoWhileLoopStepConfig<TOutput>): StepDefinition<unknown, LoopResult<TOutput>> => {
    // doUntil is doWhile with inverted condition
    const doWhileFactory = createDoWhileLoopStepFactory<TOutput>();
    return doWhileFactory({
      ...config,
      name: config.name ?? "dountil-loop",
      condition: async (iteration, context) => {
        const result = await config.condition(iteration, context);
        return !result; // Invert condition
      },
    });
  };
}

/**
 * Create a repeat loop step factory
 */
export function createRepeatLoopStepFactory<TOutput = unknown>() {
  return (config: RepeatLoopStepConfig<TOutput>): StepDefinition<unknown, LoopResult<TOutput>> => {
    return {
      id: config.name ?? "repeat-loop",
      name: config.name ?? "Repeat Loop",
      description: config.description ?? `Repeat ${config.times} times`,
      inputSchema: config.inputSchema,
      retry: config.retry,
      timeout: config.timeout ?? 300000,
      suspendable: true,
      tags: config.tags ?? ["loop", "repeat"],
      execute: async (
        _input: unknown,
        context: WorkflowContext,
      ): Promise<StepResult<LoopResult<TOutput>>> => {
        const continueOnError = config.continueOnError ?? true;
        const iterations: LoopResult<TOutput>["iterations"] = [];

        try {
          for (let i = 0; i < config.times; i++) {
            try {
              const result = await config.body(i, context);
              iterations.push({
                index: i,
                success: true,
                data: result,
              });
            } catch (error) {
              iterations.push({
                index: i,
                success: false,
                error: error instanceof Error ? error.message : String(error),
              });

              if (!continueOnError) {
                break;
              }
            }
          }

          const successCount = iterations.filter((i) => i.success).length;
          const failureCount = iterations.filter((i) => !i.success).length;

          return {
            success: continueOnError || failureCount === 0,
            data: {
              iterations,
              iterationCount: iterations.length,
              successCount,
              failureCount,
              completedNormally: iterations.length === config.times,
            },
          };
        } catch (error) {
          return {
            success: false,
            data: {
              iterations,
              iterationCount: iterations.length,
              successCount: iterations.filter((i) => i.success).length,
              failureCount: iterations.filter((i) => !i.success).length,
              completedNormally: false,
            },
            error: {
              code: "LOOP_ERROR",
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
 * Create a simple forEach step
 */
export function createForEachStep<TItem, TOutput>(
  name: string,
  items: ItemsProviderFunction<TItem>,
  body: LoopBodyFunction<TItem, TOutput>,
  options?: {
    maxIterations?: number;
    continueOnError?: boolean;
  },
): StepDefinition<unknown, LoopResult<TOutput>> {
  const factory = createForEachLoopStepFactory<TItem, TOutput>();
  return factory({
    name,
    items,
    body,
    maxIterations: options?.maxIterations,
    continueOnError: options?.continueOnError,
  });
}

/**
 * Create a simple repeat step
 */
export function createRepeatStep<TOutput>(
  name: string,
  times: number,
  body: (iteration: number, context: WorkflowContext) => TOutput | Promise<TOutput>,
  options?: {
    continueOnError?: boolean;
  },
): StepDefinition<unknown, LoopResult<TOutput>> {
  const factory = createRepeatLoopStepFactory<TOutput>();
  return factory({
    name,
    times,
    body,
    continueOnError: options?.continueOnError,
  });
}

/**
 * Create a retry loop step (retry until success or max attempts)
 */
export function createRetryLoopStep<TOutput>(
  name: string,
  operation: (attempt: number, context: WorkflowContext) => Promise<TOutput>,
  options?: {
    maxAttempts?: number;
    delayMs?: number;
    backoff?: number;
  },
): StepDefinition<unknown, LoopResult<TOutput>> {
  const maxAttempts = options?.maxAttempts ?? 3;
  const delayMs = options?.delayMs ?? 1000;
  const backoff = options?.backoff ?? 2;

  const factory = createDoWhileLoopStepFactory<TOutput>();
  let lastSuccess = false;

  return factory({
    name,
    description: `Retry up to ${maxAttempts} times`,
    maxIterations: maxAttempts,
    continueOnError: true,
    condition: (iteration) => !lastSuccess && iteration < maxAttempts,
    body: async (iteration, context) => {
      if (iteration > 0) {
        // Add delay with backoff
        const delay = delayMs * Math.pow(backoff, iteration - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      const result = await operation(iteration, context);
      lastSuccess = true;
      return result;
    },
  });
}
