/**
 * Step - Represents a single unit of work in a workflow
 *
 * Features:
 * - Input/output schema validation with Zod
 * - Configurable retry with exponential backoff
 * - Timeout support
 * - Suspension capability for HITL
 *
 * @module workflow/step
 */

import type {
  RetryConfig,
  StepDefinition,
  StepError,
  StepMetadata,
  StepResult,
  WorkflowContext,
} from "../types/workflowTypes.js";
import { logger } from "../utils/logger.js";

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

/**
 * Default step timeout (30 seconds)
 */
const DEFAULT_TIMEOUT_MS = 30000;

/**
 * Step - Represents a single unit of work in a workflow
 *
 * @typeParam TInput - The type of input this step accepts
 * @typeParam TOutput - The type of output this step produces
 *
 * @example
 * ```typescript
 * const step = new Step({
 *   id: 'generate-summary',
 *   name: 'Generate Summary',
 *   inputSchema: z.object({ text: z.string() }),
 *   outputSchema: z.object({ summary: z.string() }),
 *   execute: async (input, ctx) => {
 *     const result = await ctx.neurolink.generate({
 *       input: { text: `Summarize: ${input.text}` },
 *       provider: 'openai'
 *     });
 *     return { success: true, data: { summary: result.content } };
 *   }
 * });
 * ```
 */
export class Step<TInput = unknown, TOutput = unknown> {
  private definition: StepDefinition<TInput, TOutput>;

  constructor(definition: StepDefinition<TInput, TOutput>) {
    this.definition = {
      ...definition,
      retry: definition.retry ?? DEFAULT_RETRY_CONFIG,
      timeout: definition.timeout ?? DEFAULT_TIMEOUT_MS,
      suspendable: definition.suspendable ?? false,
    };
  }

  /**
   * Get step ID
   */
  get id(): string {
    return this.definition.id;
  }

  /**
   * Get step name
   */
  get name(): string {
    return this.definition.name;
  }

  /**
   * Get step description
   */
  get description(): string | undefined {
    return this.definition.description;
  }

  /**
   * Check if step is suspendable
   */
  get suspendable(): boolean {
    return this.definition.suspendable ?? false;
  }

  /**
   * Get step definition
   */
  getDefinition(): StepDefinition<TInput, TOutput> {
    return { ...this.definition };
  }

  /**
   * Validate input against schema
   */
  validateInput(input: unknown): {
    valid: boolean;
    error?: string;
    data?: TInput;
  } {
    if (!this.definition.inputSchema) {
      return { valid: true, data: input as TInput };
    }

    const result = this.definition.inputSchema.safeParse(input);
    if (result.success) {
      return { valid: true, data: result.data };
    }

    return {
      valid: false,
      error: result.error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", "),
    };
  }

  /**
   * Validate output against schema
   */
  validateOutput(output: unknown): {
    valid: boolean;
    error?: string;
    data?: TOutput;
  } {
    if (!this.definition.outputSchema) {
      return { valid: true, data: output as TOutput };
    }

    const result = this.definition.outputSchema.safeParse(output);
    if (result.success) {
      return { valid: true, data: result.data };
    }

    return {
      valid: false,
      error: result.error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", "),
    };
  }

  /**
   * Execute the step with retry logic
   */
  async execute(
    input: TInput,
    context: WorkflowContext,
  ): Promise<StepResult<TOutput>> {
    const startTime = Date.now();
    const retryConfig = this.definition.retry!;
    let lastError: StepError | undefined;
    let attempt = 0;

    // Validate input
    const inputValidation = this.validateInput(input);
    if (!inputValidation.valid) {
      return {
        success: false,
        error: {
          code: "INPUT_VALIDATION_FAILED",
          message: `Input validation failed: ${inputValidation.error}`,
          retryable: false,
        },
        metadata: this.createMetadata(startTime, attempt),
      };
    }

    while (attempt < retryConfig.maxAttempts) {
      attempt++;

      try {
        // Execute with timeout
        const result = await this.executeWithTimeout(
          inputValidation.data!,
          context,
        );

        // Validate output if successful
        if (result.success && result.data !== undefined) {
          const outputValidation = this.validateOutput(result.data);
          if (!outputValidation.valid) {
            return {
              success: false,
              error: {
                code: "OUTPUT_VALIDATION_FAILED",
                message: `Output validation failed: ${outputValidation.error}`,
                retryable: false,
              },
              metadata: this.createMetadata(startTime, attempt),
            };
          }
        }

        return {
          ...result,
          metadata: {
            ...result.metadata,
            ...this.createMetadata(startTime, attempt),
          },
        };
      } catch (error) {
        lastError = this.createStepError(error);

        // Check if retryable
        if (!this.isRetryable(lastError, retryConfig)) {
          break;
        }

        // Check if more attempts available
        if (attempt >= retryConfig.maxAttempts) {
          break;
        }

        // Calculate backoff delay
        const delay = Math.min(
          retryConfig.initialDelayMs *
            retryConfig.backoffMultiplier ** (attempt - 1),
          retryConfig.maxDelayMs,
        );

        logger.warn(
          `Step ${this.id} failed, retrying in ${delay}ms (attempt ${attempt}/${retryConfig.maxAttempts})`,
          {
            error: lastError.message,
            stepId: this.id,
            attempt,
            maxAttempts: retryConfig.maxAttempts,
            delayMs: delay,
          },
        );

        await this.sleep(delay);
      }
    }

    return {
      success: false,
      error: lastError ?? {
        code: "UNKNOWN_ERROR",
        message: "Step execution failed",
        retryable: false,
      },
      metadata: this.createMetadata(startTime, attempt),
    };
  }

  /**
   * Execute with timeout wrapper
   */
  private async executeWithTimeout(
    input: TInput,
    context: WorkflowContext,
  ): Promise<StepResult<TOutput>> {
    const timeout = this.definition.timeout!;

    return new Promise<StepResult<TOutput>>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Step ${this.id} timed out after ${timeout}ms`));
      }, timeout);

      this.definition
        .execute(input, context)
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Create step error from unknown error
   */
  private createStepError(error: unknown): StepError {
    if (error instanceof Error) {
      return {
        code: (error as Error & { code?: string }).code ?? "EXECUTION_ERROR",
        message: error.message,
        retryable: true,
        cause: error,
      };
    }

    return {
      code: "EXECUTION_ERROR",
      message: String(error),
      retryable: true,
    };
  }

  /**
   * Check if error is retryable
   */
  private isRetryable(error: StepError, config: RetryConfig): boolean {
    if (!error.retryable) {
      return false;
    }

    if (config.retryableErrors && config.retryableErrors.length > 0) {
      return config.retryableErrors.includes(error.code);
    }

    return true;
  }

  /**
   * Create step metadata
   */
  private createMetadata(startTime: number, retryCount: number): StepMetadata {
    const endTime = Date.now();
    return {
      startTime,
      endTime,
      duration: endTime - startTime,
      retryCount,
    };
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Factory function for creating steps
 *
 * @example
 * ```typescript
 * const step = createStep({
 *   id: 'fetch-data',
 *   name: 'Fetch Data',
 *   execute: async (input) => {
 *     const data = await fetchData(input.url);
 *     return { success: true, data };
 *   }
 * });
 * ```
 */
export function createStep<TInput, TOutput>(
  definition: StepDefinition<TInput, TOutput>,
): Step<TInput, TOutput> {
  return new Step(definition);
}
