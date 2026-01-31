/**
 * Transform Step
 *
 * Step type for data transformation between workflow steps.
 * Provides mapping, filtering, and data manipulation capabilities.
 *
 * @module workflow/steps/TransformStep
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
 * Transform function type
 */
export type TransformFunction<TInput = unknown, TOutput = unknown> = (
  input: TInput,
  context: WorkflowContext,
) => TOutput | Promise<TOutput>;

/**
 * Transform step configuration
 */
export interface TransformStepConfig<TInput = unknown, TOutput = unknown>
  extends Omit<StepConfig<TInput, TOutput>, "execute"> {
  /** Transform function */
  transform: TransformFunction<TInput, TOutput>;
}

// =============================================================================
// Transform Step Factory
// =============================================================================

/**
 * Create a transform step factory
 */
export function createTransformStepFactory<TInput = unknown, TOutput = unknown>() {
  return (config: TransformStepConfig<TInput, TOutput>): StepDefinition<TInput, TOutput> => {
    return {
      id: config.name ?? "transform",
      name: config.name ?? "Transform",
      description: config.description ?? "Transform data",
      inputSchema: config.inputSchema,
      outputSchema: config.outputSchema,
      retry: config.retry,
      timeout: config.timeout ?? 30000,
      suspendable: false,
      tags: config.tags ?? ["transform"],
      execute: async (input: TInput, context: WorkflowContext): Promise<StepResult<TOutput>> => {
        try {
          const result = await config.transform(input, context);
          return {
            success: true,
            data: result,
          };
        } catch (error) {
          return {
            success: false,
            error: {
              code: "TRANSFORM_ERROR",
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
 * Create a map transform step
 */
export function createMapStep<TInput, TOutput>(
  name: string,
  mapFn: (item: TInput) => TOutput | Promise<TOutput>,
): StepDefinition<TInput[], TOutput[]> {
  const factory = createTransformStepFactory<TInput[], TOutput[]>();
  return factory({
    name,
    description: `Map transform: ${name}`,
    transform: async (input) => {
      const results: TOutput[] = [];
      for (const item of input) {
        results.push(await mapFn(item));
      }
      return results;
    },
  });
}

/**
 * Create a filter transform step
 */
export function createFilterStep<T>(
  name: string,
  predicate: (item: T, context: WorkflowContext) => boolean | Promise<boolean>,
): StepDefinition<T[], T[]> {
  const factory = createTransformStepFactory<T[], T[]>();
  return factory({
    name,
    description: `Filter transform: ${name}`,
    transform: async (input, context) => {
      const results: T[] = [];
      for (const item of input) {
        if (await predicate(item, context)) {
          results.push(item);
        }
      }
      return results;
    },
  });
}

/**
 * Create a reduce transform step
 */
export function createReduceStep<TInput, TOutput>(
  name: string,
  reducer: (
    accumulator: TOutput,
    item: TInput,
    context: WorkflowContext,
  ) => TOutput | Promise<TOutput>,
  initialValue: TOutput,
): StepDefinition<TInput[], TOutput> {
  const factory = createTransformStepFactory<TInput[], TOutput>();
  return factory({
    name,
    description: `Reduce transform: ${name}`,
    transform: async (input, context) => {
      let result = initialValue;
      for (const item of input) {
        result = await reducer(result, item, context);
      }
      return result;
    },
  });
}

/**
 * Create a pick/select transform step
 */
export function createPickStep<T extends Record<string, unknown>>(
  name: string,
  keys: (keyof T)[],
): StepDefinition<T, Partial<T>> {
  const factory = createTransformStepFactory<T, Partial<T>>();
  return factory({
    name,
    description: `Pick keys: ${keys.join(", ")}`,
    transform: (input) => {
      const result: Partial<T> = {};
      for (const key of keys) {
        if (key in input) {
          result[key] = input[key];
        }
      }
      return result;
    },
  });
}

/**
 * Create an omit transform step
 */
export function createOmitStep<T extends Record<string, unknown>>(
  name: string,
  keys: (keyof T)[],
): StepDefinition<T, Partial<T>> {
  const factory = createTransformStepFactory<T, Partial<T>>();
  return factory({
    name,
    description: `Omit keys: ${keys.join(", ")}`,
    transform: (input) => {
      const result: Partial<T> = { ...input };
      for (const key of keys) {
        delete result[key];
      }
      return result;
    },
  });
}
