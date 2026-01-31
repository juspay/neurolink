/**
 * Wait Step
 *
 * Step type for introducing delays and waiting for conditions.
 * Supports timer-based waits, condition-based waits, and external event waits.
 *
 * @module workflow/steps/WaitStep
 */

import type {
  StepDefinition,
  StepConfig,
  StepResult,
  WorkflowContext,
  SuspensionRequest,
} from "../types/workflowTypes.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Wait condition function type
 */
export type WaitConditionFunction = (
  context: WorkflowContext,
) => boolean | Promise<boolean>;

/**
 * Wait result
 */
export interface WaitResult {
  /** Whether the wait completed */
  completed: boolean;
  /** Actual wait duration in milliseconds */
  actualDuration: number;
  /** Reason for completion */
  reason: "timer" | "condition" | "timeout" | "cancelled";
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Timer wait step configuration
 */
export interface TimerWaitStepConfig
  extends Omit<StepConfig<unknown, WaitResult>, "execute"> {
  /** Duration to wait in milliseconds */
  durationMs: number;
}

/**
 * Condition wait step configuration
 */
export interface ConditionWaitStepConfig
  extends Omit<StepConfig<unknown, WaitResult>, "execute"> {
  /** Condition to wait for */
  condition: WaitConditionFunction;
  /** Polling interval in milliseconds (default: 1000) */
  pollIntervalMs?: number;
  /** Maximum wait time in milliseconds (default: 300000 = 5 minutes) */
  timeoutMs?: number;
}

/**
 * External event wait step configuration
 */
export interface ExternalWaitStepConfig
  extends Omit<StepConfig<unknown, WaitResult>, "execute"> {
  /** Reason for waiting */
  reason: string;
  /** Callback ID for external systems */
  callbackId?: string;
  /** Maximum wait time in milliseconds (default: 86400000 = 24 hours) */
  timeoutMs?: number;
}

// =============================================================================
// Wait Step Factory
// =============================================================================

/**
 * Create a wait step factory
 */
export function createWaitStepFactory() {
  return createTimerWaitStepFactory();
}

/**
 * Create a timer wait step factory
 */
export function createTimerWaitStepFactory() {
  return (config: TimerWaitStepConfig): StepDefinition<unknown, WaitResult> => {
    return {
      id: config.name ?? "timer-wait",
      name: config.name ?? "Timer Wait",
      description: config.description ?? `Wait for ${config.durationMs}ms`,
      inputSchema: config.inputSchema,
      retry: config.retry,
      timeout: (config.timeout ?? config.durationMs) + 5000, // Add buffer
      suspendable: true,
      tags: config.tags ?? ["wait", "timer"],
      execute: async (
        _input: unknown,
        _context: WorkflowContext,
      ): Promise<StepResult<WaitResult>> => {
        const startTime = Date.now();

        try {
          await new Promise((resolve) => setTimeout(resolve, config.durationMs));

          return {
            success: true,
            data: {
              completed: true,
              actualDuration: Date.now() - startTime,
              reason: "timer",
            },
          };
        } catch (error) {
          return {
            success: false,
            data: {
              completed: false,
              actualDuration: Date.now() - startTime,
              reason: "cancelled",
            },
            error: {
              code: "WAIT_ERROR",
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
 * Create a condition wait step factory
 */
export function createConditionWaitStepFactory() {
  return (config: ConditionWaitStepConfig): StepDefinition<unknown, WaitResult> => {
    const pollIntervalMs = config.pollIntervalMs ?? 1000;
    const timeoutMs = config.timeoutMs ?? 300000;

    return {
      id: config.name ?? "condition-wait",
      name: config.name ?? "Condition Wait",
      description: config.description ?? "Wait for condition",
      inputSchema: config.inputSchema,
      retry: config.retry,
      timeout: (config.timeout ?? timeoutMs) + 5000,
      suspendable: true,
      tags: config.tags ?? ["wait", "condition"],
      execute: async (
        _input: unknown,
        context: WorkflowContext,
      ): Promise<StepResult<WaitResult>> => {
        const startTime = Date.now();
        const deadline = startTime + timeoutMs;

        try {
          while (Date.now() < deadline) {
            // Check condition
            const conditionMet = await config.condition(context);
            if (conditionMet) {
              return {
                success: true,
                data: {
                  completed: true,
                  actualDuration: Date.now() - startTime,
                  reason: "condition",
                },
              };
            }

            // Wait for poll interval
            await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
          }

          // Timeout reached
          return {
            success: false,
            data: {
              completed: false,
              actualDuration: Date.now() - startTime,
              reason: "timeout",
            },
            error: {
              code: "WAIT_TIMEOUT",
              message: `Condition not met within ${timeoutMs}ms`,
              retryable: false,
            },
          };
        } catch (error) {
          return {
            success: false,
            data: {
              completed: false,
              actualDuration: Date.now() - startTime,
              reason: "cancelled",
            },
            error: {
              code: "WAIT_ERROR",
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
 * Create an external event wait step factory (uses suspension)
 */
export function createExternalWaitStepFactory() {
  return (config: ExternalWaitStepConfig): StepDefinition<unknown, WaitResult> => {
    const timeoutMs = config.timeoutMs ?? 86400000; // 24 hours default

    return {
      id: config.name ?? "external-wait",
      name: config.name ?? "External Wait",
      description: config.description ?? `Wait for external event: ${config.reason}`,
      inputSchema: config.inputSchema,
      retry: config.retry,
      timeout: config.timeout ?? timeoutMs,
      suspendable: true,
      tags: config.tags ?? ["wait", "external"],
      execute: async (
        _input: unknown,
        context: WorkflowContext,
      ): Promise<StepResult<WaitResult>> => {
        const startTime = Date.now();

        // Request suspension for external event
        const suspensionRequest: SuspensionRequest = {
          reason: config.reason,
          type: "external",
          callbackId: config.callbackId,
          expiresAt: Date.now() + timeoutMs,
        };

        // This will cause the workflow to suspend
        context.suspend(suspensionRequest);

        return {
          success: true,
          data: {
            completed: true,
            actualDuration: Date.now() - startTime,
            reason: "condition", // Will be updated when resumed
          },
          suspend: suspensionRequest,
        };
      },
    };
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Create a simple delay step
 */
export function createDelayStep(
  name: string,
  durationMs: number,
): StepDefinition<unknown, WaitResult> {
  const factory = createTimerWaitStepFactory();
  return factory({
    name,
    durationMs,
  });
}

/**
 * Create a wait until step (wait for condition)
 */
export function createWaitUntilStep(
  name: string,
  condition: WaitConditionFunction,
  options?: {
    pollIntervalMs?: number;
    timeoutMs?: number;
  },
): StepDefinition<unknown, WaitResult> {
  const factory = createConditionWaitStepFactory();
  return factory({
    name,
    condition,
    pollIntervalMs: options?.pollIntervalMs,
    timeoutMs: options?.timeoutMs,
  });
}

/**
 * Create an exponential backoff wait step
 */
export function createBackoffWaitStep(
  name: string,
  baseDelayMs: number,
  attempt: number,
  maxDelayMs: number = 60000,
): StepDefinition<unknown, WaitResult> {
  const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
  return createDelayStep(name, delay);
}

/**
 * Create a rate limit wait step
 */
export function createRateLimitWaitStep(
  name: string,
  requestsPerSecond: number,
): StepDefinition<unknown, WaitResult> {
  const delayMs = Math.ceil(1000 / requestsPerSecond);
  return createDelayStep(name, delayMs);
}

/**
 * Create a wait for state step
 */
export function createWaitForStateStep<TState extends Record<string, unknown>>(
  name: string,
  stateKey: keyof TState,
  expectedValue: unknown,
  options?: {
    pollIntervalMs?: number;
    timeoutMs?: number;
  },
): StepDefinition<unknown, WaitResult> {
  const factory = createConditionWaitStepFactory();
  return factory({
    name,
    condition: (context) => {
      const state = context.state as TState;
      return state[stateKey] === expectedValue;
    },
    pollIntervalMs: options?.pollIntervalMs,
    timeoutMs: options?.timeoutMs,
  });
}

/**
 * Create a scheduled wait step (wait until specific time)
 */
export function createScheduledWaitStep(
  name: string,
  targetTime: Date | number,
): StepDefinition<unknown, WaitResult> {
  const targetTimestamp = typeof targetTime === "number" ? targetTime : targetTime.getTime();
  const now = Date.now();
  const durationMs = Math.max(0, targetTimestamp - now);

  return createDelayStep(name, durationMs);
}
