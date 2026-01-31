/**
 * Step Helpers - Specialized factory functions for common step types
 *
 * Provides convenience functions for creating:
 * - AI steps (text generation, structured output)
 * - Tool steps (MCP tool execution)
 * - Human steps (HITL suspension points)
 * - Condition steps (control flow evaluation)
 *
 * @module workflow/stepHelpers
 */

import type { z } from "zod";
import type { JsonObject } from "../types/common.js";
import type {
  StepDefinition,
  StepResult,
  SuspensionRequest,
  WorkflowContext,
} from "../types/workflowTypes.js";

// ==========================================
// Types for Step Helpers
// ==========================================

/**
 * AI step configuration
 */
export type AIStepConfig<TInput = unknown, TOutput = unknown> = {
  /** Step ID */
  id: string;
  /** Human-readable name */
  name?: string;
  /** Step description */
  description?: string;
  /** Build the prompt from input */
  prompt: (input: TInput, context: WorkflowContext) => string | Promise<string>;
  /** AI provider to use (defaults to context.neurolink default) */
  provider?: string;
  /** Model to use (optional, uses provider default) */
  model?: string;
  /** Temperature for generation (0-2) */
  temperature?: number;
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** System prompt (optional) */
  systemPrompt?: string;
  /** Zod schema for structured output (optional) */
  outputSchema?: z.ZodSchema<TOutput>;
  /** Transform the AI response before returning (optional) */
  transform?: (
    response: string | TOutput,
    input: TInput,
    context: WorkflowContext,
  ) => TOutput | Promise<TOutput>;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Retry configuration */
  retry?: {
    maxAttempts?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffMultiplier?: number;
  };
  /** Tags for categorization */
  tags?: string[];
};

/**
 * Tool step configuration
 */
export type ToolStepConfig<TInput = unknown, TOutput = unknown> = {
  /** Step ID */
  id: string;
  /** Human-readable name */
  name?: string;
  /** Step description */
  description?: string;
  /** Tool name to execute */
  toolName: string;
  /** Build tool arguments from input */
  args: (
    input: TInput,
    context: WorkflowContext,
  ) => Record<string, unknown> | Promise<Record<string, unknown>>;
  /** Transform the tool result before returning (optional) */
  transform?: (
    result: unknown,
    input: TInput,
    context: WorkflowContext,
  ) => TOutput | Promise<TOutput>;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Retry configuration */
  retry?: {
    maxAttempts?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffMultiplier?: number;
  };
  /** Tags for categorization */
  tags?: string[];
};

/**
 * Human step configuration
 */
export type HumanStepConfig<TInput = unknown, TOutput = unknown> = {
  /** Step ID */
  id: string;
  /** Human-readable name */
  name?: string;
  /** Step description */
  description?: string;
  /** Suspension reason to display */
  reason:
    | string
    | ((input: TInput, context: WorkflowContext) => string | Promise<string>);
  /** Data to include in suspension for human review */
  suspendData?: (
    input: TInput,
    context: WorkflowContext,
  ) => Record<string, unknown> | Promise<Record<string, unknown>>;
  /** Expiration timestamp for the suspension */
  expiresAt?: number | ((context: WorkflowContext) => number | Promise<number>);
  /** Callback ID for external systems */
  callbackId?: string;
  /** Transform the resume data before returning (optional) */
  transform?: (
    resumeData: Record<string, unknown>,
    input: TInput,
    context: WorkflowContext,
  ) => TOutput | Promise<TOutput>;
  /** Tags for categorization */
  tags?: string[];
};

/**
 * Condition step configuration
 */
export type ConditionStepConfig<TInput = unknown> = {
  /** Step ID */
  id: string;
  /** Human-readable name */
  name?: string;
  /** Step description */
  description?: string;
  /** Condition to evaluate */
  condition: (
    input: TInput,
    context: WorkflowContext,
  ) => boolean | Promise<boolean>;
  /** Tags for categorization */
  tags?: string[];
};

// ==========================================
// AI Step Helper
// ==========================================

/**
 * Create an AI generation step
 *
 * This helper simplifies creating steps that use NeuroLink's AI capabilities
 * for text generation, structured output, or any AI-powered transformation.
 *
 * @example
 * ```typescript
 * // Simple text generation
 * const summarizeStep = aiStep({
 *   id: 'summarize',
 *   name: 'Summarize Text',
 *   prompt: (input) => `Summarize the following text:\n\n${input.text}`,
 *   provider: 'openai',
 * });
 *
 * // With structured output
 * const extractStep = aiStep({
 *   id: 'extract-entities',
 *   name: 'Extract Entities',
 *   prompt: (input) => `Extract all named entities from: ${input.text}`,
 *   outputSchema: z.object({
 *     people: z.array(z.string()),
 *     places: z.array(z.string()),
 *     organizations: z.array(z.string()),
 *   }),
 * });
 *
 * // Use in workflow
 * const workflow = createWorkflow('analysis')
 *   .step('summarize', summarizeStep)
 *   .then('extract', extractStep)
 *   .build();
 * ```
 */
export function aiStep<TInput = unknown, TOutput = unknown>(
  config: AIStepConfig<TInput, TOutput>,
): Omit<StepDefinition<TInput, TOutput>, "id" | "name"> & { name?: string } {
  return {
    name: config.name,
    description: config.description ?? `AI generation step: ${config.id}`,
    timeout: config.timeout ?? 60000, // Default 60s for AI operations
    retry: config.retry
      ? {
          maxAttempts: config.retry.maxAttempts ?? 3,
          initialDelayMs: config.retry.initialDelayMs ?? 1000,
          maxDelayMs: config.retry.maxDelayMs ?? 30000,
          backoffMultiplier: config.retry.backoffMultiplier ?? 2,
        }
      : undefined,
    tags: config.tags ?? ["ai", "generation"],
    execute: async (
      input: TInput,
      context: WorkflowContext,
    ): Promise<StepResult<TOutput>> => {
      try {
        // Build the prompt
        const prompt = await config.prompt(input, context);

        // Prepare generate options
        const generateOptions: Parameters<
          typeof context.neurolink.generate
        >[0] = {
          input: { text: prompt },
          provider: config.provider,
          model: config.model,
          temperature: config.temperature,
          maxTokens: config.maxTokens,
          systemPrompt: config.systemPrompt,
        };

        // Add structured output schema if provided
        if (config.outputSchema) {
          generateOptions.schema = config.outputSchema;
          // For Google providers, disable tools when using schema
          generateOptions.disableTools = true;
        }

        // Execute generation
        const result = await context.neurolink.generate(generateOptions);

        // Get the response (parse JSON for structured output, or text)
        let response: string | TOutput;
        if (config.outputSchema) {
          // For structured output, parse the JSON content
          try {
            response = JSON.parse(result.content) as TOutput;
          } catch {
            // If parsing fails, try to use content as-is
            response = result.content ?? "";
          }
        } else {
          response = result.content ?? "";
        }

        // Apply transform if provided
        const output = config.transform
          ? await config.transform(response, input, context)
          : (response as unknown as TOutput);

        return {
          success: true,
          data: output,
          metadata: {
            startTime: Date.now(),
            provider: config.provider,
            model: config.model,
            tokensUsed: result.usage?.total,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: "AI_GENERATION_ERROR",
            message:
              error instanceof Error ? error.message : "AI generation failed",
            retryable: true,
            cause: error instanceof Error ? error : undefined,
          },
        };
      }
    },
  };
}

// ==========================================
// Tool Step Helper
// ==========================================

/**
 * Create a tool execution step
 *
 * This helper simplifies creating steps that execute MCP tools
 * or built-in NeuroLink tools.
 *
 * @example
 * ```typescript
 * // Execute a file read tool
 * const readFileStep = toolStep({
 *   id: 'read-config',
 *   name: 'Read Configuration',
 *   toolName: 'readFile',
 *   args: (input) => ({ path: input.configPath }),
 * });
 *
 * // Execute an external MCP tool with transformation
 * const searchStep = toolStep({
 *   id: 'search-database',
 *   name: 'Search Database',
 *   toolName: 'postgres_query',
 *   args: (input) => ({
 *     query: `SELECT * FROM users WHERE name LIKE '%${input.searchTerm}%'`
 *   }),
 *   transform: (result) => result.rows,
 * });
 *
 * // Use in workflow
 * const workflow = createWorkflow('data-processing')
 *   .step('read', readFileStep)
 *   .then('search', searchStep)
 *   .build();
 * ```
 */
export function toolStep<TInput = unknown, TOutput = unknown>(
  config: ToolStepConfig<TInput, TOutput>,
): Omit<StepDefinition<TInput, TOutput>, "id" | "name"> & { name?: string } {
  return {
    name: config.name,
    description: config.description ?? `Tool execution step: ${config.toolName}`,
    timeout: config.timeout ?? 30000, // Default 30s for tool execution
    retry: config.retry
      ? {
          maxAttempts: config.retry.maxAttempts ?? 3,
          initialDelayMs: config.retry.initialDelayMs ?? 1000,
          maxDelayMs: config.retry.maxDelayMs ?? 30000,
          backoffMultiplier: config.retry.backoffMultiplier ?? 2,
        }
      : undefined,
    tags: config.tags ?? ["tool", "execution"],
    execute: async (
      input: TInput,
      context: WorkflowContext,
    ): Promise<StepResult<TOutput>> => {
      try {
        // Build tool arguments
        const toolArgs = await config.args(input, context);

        // Execute the tool via NeuroLink's executeTool method
        const result = await context.neurolink.executeTool(
          config.toolName,
          toolArgs,
        );

        // Apply transform if provided
        const output = config.transform
          ? await config.transform(result, input, context)
          : (result as unknown as TOutput);

        return {
          success: true,
          data: output,
          metadata: {
            startTime: Date.now(),
          },
        };
      } catch (error) {
        // Check for tool not found error
        if (
          error instanceof Error &&
          error.message.includes("not found")
        ) {
          return {
            success: false,
            error: {
              code: "TOOL_NOT_FOUND",
              message: `Tool '${config.toolName}' not found in registry`,
              retryable: false,
              cause: error,
            },
          };
        }

        return {
          success: false,
          error: {
            code: "TOOL_EXECUTION_ERROR",
            message:
              error instanceof Error ? error.message : "Tool execution failed",
            retryable: true,
            cause: error instanceof Error ? error : undefined,
          },
        };
      }
    },
  };
}

// ==========================================
// Human Step Helper
// ==========================================

/**
 * Create a human-in-the-loop step
 *
 * This helper simplifies creating suspension points where human
 * approval, review, or input is required before continuing.
 *
 * @example
 * ```typescript
 * // Simple approval gate
 * const approvalStep = humanStep({
 *   id: 'approve-deployment',
 *   name: 'Deployment Approval',
 *   reason: 'Deployment requires manual approval before proceeding',
 *   suspendData: (input) => ({
 *     environment: input.environment,
 *     changes: input.changes,
 *   }),
 * });
 *
 * // Review with expiration
 * const reviewStep = humanStep({
 *   id: 'review-content',
 *   name: 'Content Review',
 *   reason: (input) => `Please review the generated content for: ${input.topic}`,
 *   expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
 *   transform: (resumeData) => ({
 *     approved: resumeData.approved,
 *     feedback: resumeData.feedback,
 *   }),
 * });
 *
 * // Use in workflow
 * const workflow = createWorkflow('content-pipeline')
 *   .step('generate', generateStep)
 *   .then('review', reviewStep)
 *   .then('publish', publishStep)
 *   .build();
 * ```
 */
export function humanStep<TInput = unknown, TOutput = unknown>(
  config: HumanStepConfig<TInput, TOutput>,
): Omit<StepDefinition<TInput, TOutput>, "id" | "name"> & { name?: string } {
  return {
    name: config.name,
    description: config.description ?? `Human-in-the-loop step: ${config.id}`,
    suspendable: true,
    tags: config.tags ?? ["human", "hitl", "approval"],
    execute: async (
      input: TInput,
      context: WorkflowContext,
    ): Promise<StepResult<TOutput>> => {
      // Build suspension reason
      const reason =
        typeof config.reason === "function"
          ? await config.reason(input, context)
          : config.reason;

      // Build suspend data
      const suspendData = config.suspendData
        ? await config.suspendData(input, context)
        : {};

      // Calculate expiration
      const expiresAt =
        typeof config.expiresAt === "function"
          ? await config.expiresAt(context)
          : config.expiresAt;

      // Create suspension request
      const suspension: SuspensionRequest = {
        reason,
        type: "hitl",
        resumeData: suspendData as JsonObject,
        expiresAt,
        callbackId: config.callbackId,
      };

      // This triggers workflow suspension
      // The workflow will resume with the human's response data
      return {
        success: false,
        suspend: suspension,
      };
    },
  };
}

/**
 * Create a human step that can process resume data
 *
 * This is an advanced variant that allows processing resume data
 * when the workflow is resumed. Use this when you need to validate
 * or transform the human input before proceeding.
 *
 * @example
 * ```typescript
 * const approvalWithValidation = humanStepWithResume({
 *   id: 'validated-approval',
 *   name: 'Validated Approval',
 *   reason: 'Please approve or reject',
 *   onResume: async (resumeData, input, context) => {
 *     if (!resumeData.approved && !resumeData.rejectionReason) {
 *       throw new Error('Rejection reason is required');
 *     }
 *     return {
 *       approved: resumeData.approved,
 *       reason: resumeData.rejectionReason,
 *       approver: resumeData.approverEmail,
 *     };
 *   },
 * });
 * ```
 */
export function humanStepWithResume<
  TInput = unknown,
  TResumeData extends Record<string, unknown> = Record<string, unknown>,
  TOutput = TResumeData,
>(
  config: Omit<HumanStepConfig<TInput, TOutput>, "transform"> & {
    /** Process resume data when workflow resumes */
    onResume: (
      resumeData: TResumeData,
      input: TInput,
      context: WorkflowContext,
    ) => TOutput | Promise<TOutput>;
  },
): Omit<StepDefinition<TInput, TOutput>, "id" | "name"> & { name?: string } {
  // The basic human step triggers suspension
  // When resumed, the executor will call the step again with the resume data
  // merged into the context state
  return {
    ...humanStep(config),
    execute: async (
      input: TInput,
      context: WorkflowContext,
    ): Promise<StepResult<TOutput>> => {
      // Check if we have resume data (workflow was resumed)
      const resumeData = (context.state as Record<string, unknown>)
        .__resumeData as TResumeData | undefined;

      if (resumeData) {
        // Process resume data
        try {
          const output = await config.onResume(resumeData, input, context);
          return {
            success: true,
            data: output,
          };
        } catch (error) {
          return {
            success: false,
            error: {
              code: "RESUME_PROCESSING_ERROR",
              message:
                error instanceof Error
                  ? error.message
                  : "Failed to process resume data",
              retryable: false,
              cause: error instanceof Error ? error : undefined,
            },
          };
        }
      }

      // No resume data, trigger suspension
      const reason =
        typeof config.reason === "function"
          ? await config.reason(input, context)
          : config.reason;

      const suspendData = config.suspendData
        ? await config.suspendData(input, context)
        : {};

      const expiresAt =
        typeof config.expiresAt === "function"
          ? await config.expiresAt(context)
          : config.expiresAt;

      return {
        success: false,
        suspend: {
          reason,
          type: "hitl",
          resumeData: suspendData as JsonObject,
          expiresAt,
          callbackId: config.callbackId,
        },
      };
    },
  };
}

// ==========================================
// Condition Step Helper
// ==========================================

/**
 * Create a condition evaluation step
 *
 * This helper creates a step that evaluates a condition and stores
 * the result in the workflow state. Useful for control flow decisions.
 *
 * @example
 * ```typescript
 * // Simple condition
 * const checkThreshold = conditionStep({
 *   id: 'check-threshold',
 *   name: 'Check Value Threshold',
 *   condition: (input) => input.value > 100,
 * });
 *
 * // Complex condition with context
 * const checkEligibility = conditionStep({
 *   id: 'check-eligibility',
 *   name: 'Check User Eligibility',
 *   condition: async (input, context) => {
 *     const previousResult = context.getStepOutput<{ score: number }>('analyze');
 *     return previousResult?.score >= input.threshold;
 *   },
 * });
 *
 * // Use with branch in workflow
 * const workflow = createWorkflow('conditional-flow')
 *   .step('analyze', analyzeStep)
 *   .step('check', checkThreshold)
 *   .branch([
 *     {
 *       condition: (ctx) => ctx.getStepOutput('check')?.result === true,
 *       stepId: 'high-value',
 *       step: highValueStep,
 *     },
 *     {
 *       condition: (ctx) => ctx.getStepOutput('check')?.result === false,
 *       stepId: 'low-value',
 *       step: lowValueStep,
 *     },
 *   ])
 *   .build();
 * ```
 */
export function conditionStep<TInput = unknown>(
  config: ConditionStepConfig<TInput>,
): Omit<StepDefinition<TInput, { result: boolean }>, "id" | "name"> & {
  name?: string;
} {
  return {
    name: config.name,
    description: config.description ?? `Condition evaluation step: ${config.id}`,
    tags: config.tags ?? ["condition", "control-flow"],
    execute: async (
      input: TInput,
      context: WorkflowContext,
    ): Promise<StepResult<{ result: boolean }>> => {
      try {
        const result = await config.condition(input, context);

        return {
          success: true,
          data: { result },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: "CONDITION_EVALUATION_ERROR",
            message:
              error instanceof Error
                ? error.message
                : "Condition evaluation failed",
            retryable: false,
            cause: error instanceof Error ? error : undefined,
          },
        };
      }
    },
  };
}

// ==========================================
// Additional Utility Step Helpers
// ==========================================

/**
 * Create a transformation step
 *
 * This helper creates a simple synchronous or async transformation step.
 *
 * @example
 * ```typescript
 * const parseJson = transformStep({
 *   id: 'parse',
 *   name: 'Parse JSON',
 *   transform: (input) => JSON.parse(input.rawData),
 * });
 *
 * const enrichData = transformStep({
 *   id: 'enrich',
 *   name: 'Enrich Data',
 *   transform: async (input, context) => {
 *     const extra = context.getStepOutput('lookup');
 *     return { ...input, extra };
 *   },
 * });
 * ```
 */
export function transformStep<TInput = unknown, TOutput = unknown>(config: {
  id: string;
  name?: string;
  description?: string;
  transform: (
    input: TInput,
    context: WorkflowContext,
  ) => TOutput | Promise<TOutput>;
  tags?: string[];
}): Omit<StepDefinition<TInput, TOutput>, "id" | "name"> & { name?: string } {
  return {
    name: config.name,
    description: config.description ?? `Transform step: ${config.id}`,
    tags: config.tags ?? ["transform"],
    execute: async (
      input: TInput,
      context: WorkflowContext,
    ): Promise<StepResult<TOutput>> => {
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
            message:
              error instanceof Error ? error.message : "Transformation failed",
            retryable: false,
            cause: error instanceof Error ? error : undefined,
          },
        };
      }
    },
  };
}

/**
 * Create a validation step
 *
 * This helper creates a step that validates input against a schema
 * and fails if validation fails.
 *
 * @example
 * ```typescript
 * const validateUser = validateStep({
 *   id: 'validate-user',
 *   name: 'Validate User Data',
 *   schema: z.object({
 *     email: z.string().email(),
 *     age: z.number().min(18),
 *   }),
 * });
 * ```
 */
export function validateStep<TInput = unknown>(config: {
  id: string;
  name?: string;
  description?: string;
  schema: z.ZodSchema<TInput>;
  tags?: string[];
}): Omit<StepDefinition<unknown, TInput>, "id" | "name"> & { name?: string } {
  return {
    name: config.name,
    description: config.description ?? `Validation step: ${config.id}`,
    tags: config.tags ?? ["validation"],
    execute: async (input: unknown): Promise<StepResult<TInput>> => {
      const result = config.schema.safeParse(input);

      if (result.success) {
        return {
          success: true,
          data: result.data,
        };
      }

      return {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: result.error.errors
            .map((e) => `${e.path.join(".")}: ${e.message}`)
            .join(", "),
          retryable: false,
          details: {
            errors: result.error.errors.map((e) => ({
              path: e.path.join("."),
              message: e.message,
              code: e.code,
            })),
          },
        },
      };
    },
  };
}

/**
 * Create an HTTP request step
 *
 * This helper creates a step that makes an HTTP request.
 *
 * @example
 * ```typescript
 * const fetchUser = httpStep({
 *   id: 'fetch-user',
 *   name: 'Fetch User',
 *   method: 'GET',
 *   url: (input) => `https://api.example.com/users/${input.userId}`,
 *   headers: { 'Authorization': 'Bearer token' },
 * });
 *
 * const createRecord = httpStep({
 *   id: 'create-record',
 *   name: 'Create Record',
 *   method: 'POST',
 *   url: 'https://api.example.com/records',
 *   body: (input) => JSON.stringify(input.data),
 *   headers: { 'Content-Type': 'application/json' },
 * });
 * ```
 */
export function httpStep<TInput = unknown, TOutput = unknown>(config: {
  id: string;
  name?: string;
  description?: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  url: string | ((input: TInput, context: WorkflowContext) => string);
  headers?:
    | Record<string, string>
    | ((
        input: TInput,
        context: WorkflowContext,
      ) => Record<string, string> | Promise<Record<string, string>>);
  body?:
    | string
    | ((
        input: TInput,
        context: WorkflowContext,
      ) => string | Promise<string> | BodyInit);
  transform?: (
    response: Response,
    input: TInput,
    context: WorkflowContext,
  ) => TOutput | Promise<TOutput>;
  timeout?: number;
  retry?: {
    maxAttempts?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffMultiplier?: number;
  };
  tags?: string[];
}): Omit<StepDefinition<TInput, TOutput>, "id" | "name"> & { name?: string } {
  return {
    name: config.name,
    description: config.description ?? `HTTP ${config.method} step: ${config.id}`,
    timeout: config.timeout ?? 30000,
    retry: config.retry
      ? {
          maxAttempts: config.retry.maxAttempts ?? 3,
          initialDelayMs: config.retry.initialDelayMs ?? 1000,
          maxDelayMs: config.retry.maxDelayMs ?? 30000,
          backoffMultiplier: config.retry.backoffMultiplier ?? 2,
        }
      : undefined,
    tags: config.tags ?? ["http", "request"],
    execute: async (
      input: TInput,
      context: WorkflowContext,
    ): Promise<StepResult<TOutput>> => {
      try {
        // Build URL
        const url =
          typeof config.url === "function"
            ? config.url(input, context)
            : config.url;

        // Build headers
        const headers = config.headers
          ? typeof config.headers === "function"
            ? await config.headers(input, context)
            : config.headers
          : {};

        // Build body
        const body = config.body
          ? typeof config.body === "function"
            ? await config.body(input, context)
            : config.body
          : undefined;

        // Make request
        const response = await fetch(url, {
          method: config.method,
          headers,
          body,
        });

        if (!response.ok) {
          return {
            success: false,
            error: {
              code: "HTTP_ERROR",
              message: `HTTP ${response.status}: ${response.statusText}`,
              retryable: response.status >= 500,
              details: {
                status: response.status,
                statusText: response.statusText,
              },
            },
          };
        }

        // Transform response
        const output = config.transform
          ? await config.transform(response, input, context)
          : ((await response.json()) as unknown as TOutput);

        return {
          success: true,
          data: output,
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: "HTTP_REQUEST_ERROR",
            message:
              error instanceof Error ? error.message : "HTTP request failed",
            retryable: true,
            cause: error instanceof Error ? error : undefined,
          },
        };
      }
    },
  };
}
