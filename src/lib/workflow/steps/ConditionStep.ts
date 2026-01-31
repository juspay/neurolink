/**
 * Condition Step
 *
 * Step type for conditional branching in workflows.
 * Evaluates conditions and returns branch decisions.
 *
 * @module workflow/steps/ConditionStep
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
 * Condition function type
 */
export type ConditionFunction<TInput = unknown> = (
  input: TInput,
  context: WorkflowContext,
) => boolean | Promise<boolean>;

/**
 * Condition result
 */
export interface ConditionResult {
  /** Whether the condition was true */
  conditionMet: boolean;
  /** Optional branch name to take */
  branch?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Condition step configuration
 */
export interface ConditionStepConfig<TInput = unknown>
  extends Omit<StepConfig<TInput, ConditionResult>, "execute"> {
  /** Condition function to evaluate */
  condition: ConditionFunction<TInput>;
  /** Branch name to take if condition is true */
  trueBranch?: string;
  /** Branch name to take if condition is false */
  falseBranch?: string;
}

/**
 * Multi-condition step configuration
 */
export interface MultiConditionStepConfig<TInput = unknown>
  extends Omit<StepConfig<TInput, ConditionResult>, "execute"> {
  /** Array of conditions with their branch names */
  conditions: Array<{
    condition: ConditionFunction<TInput>;
    branch: string;
  }>;
  /** Default branch if no conditions match */
  defaultBranch?: string;
}

// =============================================================================
// Condition Step Factory
// =============================================================================

/**
 * Create a condition step factory
 */
export function createConditionStepFactory<TInput = unknown>() {
  return (config: ConditionStepConfig<TInput>): StepDefinition<TInput, ConditionResult> => {
    return {
      id: config.name ?? "condition",
      name: config.name ?? "Condition",
      description: config.description ?? "Evaluate condition",
      inputSchema: config.inputSchema,
      retry: config.retry,
      timeout: config.timeout ?? 5000,
      suspendable: false,
      tags: config.tags ?? ["condition"],
      execute: async (
        input: TInput,
        context: WorkflowContext,
      ): Promise<StepResult<ConditionResult>> => {
        try {
          const conditionMet = await config.condition(input, context);
          const branch = conditionMet ? config.trueBranch : config.falseBranch;

          return {
            success: true,
            data: {
              conditionMet,
              branch,
              metadata: {
                evaluatedAt: Date.now(),
              },
            },
          };
        } catch (error) {
          return {
            success: false,
            error: {
              code: "CONDITION_ERROR",
              message: error instanceof Error ? error.message : String(error),
              retryable: false,
              cause: error instanceof Error ? error : undefined,
            },
          };
        }
      },
    };
  };
}

/**
 * Create a multi-condition step factory
 */
export function createMultiConditionStepFactory<TInput = unknown>() {
  return (config: MultiConditionStepConfig<TInput>): StepDefinition<TInput, ConditionResult> => {
    return {
      id: config.name ?? "multi-condition",
      name: config.name ?? "Multi Condition",
      description: config.description ?? "Evaluate multiple conditions",
      inputSchema: config.inputSchema,
      retry: config.retry,
      timeout: config.timeout ?? 5000,
      suspendable: false,
      tags: config.tags ?? ["condition", "multi"],
      execute: async (
        input: TInput,
        context: WorkflowContext,
      ): Promise<StepResult<ConditionResult>> => {
        try {
          // Evaluate conditions in order
          for (const { condition, branch } of config.conditions) {
            const conditionMet = await condition(input, context);
            if (conditionMet) {
              return {
                success: true,
                data: {
                  conditionMet: true,
                  branch,
                  metadata: {
                    evaluatedAt: Date.now(),
                    matchedCondition: branch,
                  },
                },
              };
            }
          }

          // No conditions matched - use default
          return {
            success: true,
            data: {
              conditionMet: false,
              branch: config.defaultBranch,
              metadata: {
                evaluatedAt: Date.now(),
                usedDefault: true,
              },
            },
          };
        } catch (error) {
          return {
            success: false,
            error: {
              code: "CONDITION_ERROR",
              message: error instanceof Error ? error.message : String(error),
              retryable: false,
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
 * Create a simple if/else step
 */
export function createIfElseStep<TInput>(
  name: string,
  condition: ConditionFunction<TInput>,
  trueBranch: string,
  falseBranch?: string,
): StepDefinition<TInput, ConditionResult> {
  const factory = createConditionStepFactory<TInput>();
  return factory({
    name,
    condition,
    trueBranch,
    falseBranch,
  });
}

/**
 * Create a switch step (multiple conditions)
 */
export function createSwitchStep<TInput>(
  name: string,
  cases: Array<{
    condition: ConditionFunction<TInput>;
    branch: string;
  }>,
  defaultBranch?: string,
): StepDefinition<TInput, ConditionResult> {
  const factory = createMultiConditionStepFactory<TInput>();
  return factory({
    name,
    conditions: cases,
    defaultBranch,
  });
}

/**
 * Create a comparison condition step
 */
export function createComparisonStep<TInput extends Record<string, unknown>>(
  name: string,
  field: keyof TInput,
  operator: "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "in" | "contains",
  value: unknown,
  trueBranch: string,
  falseBranch?: string,
): StepDefinition<TInput, ConditionResult> {
  const factory = createConditionStepFactory<TInput>();

  return factory({
    name,
    condition: (input) => {
      const fieldValue = input[field];

      switch (operator) {
        case "eq":
          return fieldValue === value;
        case "ne":
          return fieldValue !== value;
        case "gt":
          return (fieldValue as number) > (value as number);
        case "gte":
          return (fieldValue as number) >= (value as number);
        case "lt":
          return (fieldValue as number) < (value as number);
        case "lte":
          return (fieldValue as number) <= (value as number);
        case "in":
          return (value as unknown[]).includes(fieldValue);
        case "contains":
          if (Array.isArray(fieldValue)) {
            return fieldValue.includes(value);
          }
          if (typeof fieldValue === "string") {
            return fieldValue.includes(value as string);
          }
          return false;
        default:
          return false;
      }
    },
    trueBranch,
    falseBranch,
  });
}

/**
 * Create a null check step
 */
export function createNullCheckStep<TInput extends Record<string, unknown>>(
  name: string,
  field: keyof TInput,
  trueBranch: string,
  falseBranch?: string,
): StepDefinition<TInput, ConditionResult> {
  const factory = createConditionStepFactory<TInput>();

  return factory({
    name,
    condition: (input) => {
      const value = input[field];
      return value !== null && value !== undefined;
    },
    trueBranch,
    falseBranch,
  });
}
