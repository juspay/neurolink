/**
 * workflow/core/ensembleExecutor.ts
 * Parallel execution engine for ensemble workflows
 */

import pLimit from "p-limit";
import { AIProviderFactory } from "../../core/factory.js";
import type { AIProvider } from "../../types/providers.js";
import { logger } from "../../utils/logger.js";
import type {
  EnsembleResponse,
  ExecutionConfig,
  ModelConfig,
  ModelGroup,
} from "../types.js";
import { WorkflowError } from "../types.js";
import type {
  EnsembleExecutionResult,
  ExecuteEnsembleOptions,
  ExecuteLayerOptions,
  ExecuteModelOptions,
  LayerExecutionResult,
} from "./types/index.js";

const functionTag = "EnsembleExecutor";

// ============================================================================
// EXECUTION FUNCTIONS
// ============================================================================

/**
 * Execute ensemble of models in parallel
 * @param options - Execution options including prompt and models
 * @returns Ensemble execution result with all responses and metrics
 */
export async function executeEnsemble(
  options: ExecuteEnsembleOptions,
): Promise<EnsembleExecutionResult> {
  const startTime = Date.now();
  const { prompt, models, executionConfig, systemPrompt, workflowDefaults } =
    options;

  logger.info(`[${functionTag}] Starting ensemble execution`, {
    modelCount: models.length,
    parallelism: executionConfig?.parallelism || 10,
  });

  // Set up concurrency limiter
  const limit = pLimit(executionConfig?.parallelism || 10);

  // Create execution promises
  const executionPromises = models.map((model) =>
    limit(() =>
      executeModel(
        {
          model,
          prompt,
          systemPrompt,
          timeout: model.timeout || executionConfig?.modelTimeout || 15000,
        },
        workflowDefaults?.systemPrompt,
      ),
    ),
  );

  // Execute all models
  const responses = await Promise.all(executionPromises);

  const totalTime = Date.now() - startTime;
  const successCount = responses.filter((r) => r.status === "success").length;
  const failureCount = responses.filter((r) => r.status === "failure").length;

  // Collect errors
  const errors: WorkflowError[] = responses
    .filter((r) => r.status === "failure" && r.error)
    .map((r) => {
      const errorMsg = typeof r.error === "string" ? r.error : "Unknown error";
      return new WorkflowError(errorMsg, {
        code: "MODEL_EXECUTION_ERROR",
        workflowId: "ensemble",
        phase: "ensemble",
        retryable: true,
      });
    });

  // Check if we met minimum response threshold
  const minResponses = executionConfig?.minResponses || 1;
  if (successCount < minResponses) {
    const error = new WorkflowError(
      `Insufficient successful responses: ${successCount}/${minResponses} required`,
      {
        code: "INSUFFICIENT_RESPONSES",
        workflowId: "ensemble",
        phase: "ensemble",
        retryable: false,
      },
    );
    errors.push(error);
  }

  logger.info(`[${functionTag}] Ensemble execution completed`, {
    totalTime,
    successCount,
    failureCount,
    totalResponses: responses.length,
  });

  return {
    responses,
    totalTime,
    successCount,
    failureCount,
    errors,
  };
}

/**
 * Execute a single model with timeout and error handling
 * @param options - Model execution options
 * @returns Ensemble response with result or error
 */
async function executeModel(
  options: ExecuteModelOptions,
  workflowDefaultSystemPrompt?: string,
): Promise<EnsembleResponse> {
  const { model, prompt, systemPrompt, timeout } = options;
  const startTime = Date.now();

  logger.debug(`[${functionTag}] Executing model`, {
    provider: model.provider,
    model: model.model,
    timeout,
  });

  try {
    // Create provider instance
    const provider = await createProvider(model);

    // Resolve system prompt with hierarchical fallback:
    // 1. Direct parameter (highest priority)
    // 2. Model-specific systemPrompt
    // 3. Workflow-level default
    // 4. undefined (provider default)
    const resolvedSystemPrompt =
      systemPrompt || model.systemPrompt || workflowDefaultSystemPrompt;

    // Execute with timeout
    const result = await executeWithTimeout(
      async () => {
        return await provider.generate({
          prompt,
          systemPrompt: resolvedSystemPrompt,
          temperature: model.temperature,
          maxTokens: model.maxTokens,
        });
      },
      timeout,
      `Model ${model.provider}/${model.model} timed out after ${timeout}ms`,
    );

    const responseTime = Date.now() - startTime;

    logger.debug(`[${functionTag}] Model execution successful`, {
      provider: model.provider,
      model: model.model,
      responseTime,
      contentLength: result?.content?.length || 0,
    });

    return {
      provider: model.provider,
      model: model.model,
      modelLabel: model.label,
      content: result?.content || "",
      status: "success" as const,
      responseTime,
      usage: result?.usage
        ? {
            inputTokens: result.usage.input,
            outputTokens: result.usage.output,
            totalTokens: result.usage.total,
          }
        : undefined,
      metadata: model.metadata,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const err = error as Error;

    logger.warn(`[${functionTag}] Model execution failed`, {
      provider: model.provider,
      model: model.model,
      error: err.message,
      responseTime,
    });

    return {
      provider: model.provider,
      model: model.model,
      modelLabel: model.label,
      content: "",
      status: "failure" as const,
      responseTime,
      error: err.message,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Create provider instance from model config
 * @param model - Model configuration
 * @returns Provider instance
 */
async function createProvider(model: ModelConfig): Promise<AIProvider> {
  return await AIProviderFactory.createProvider(model.provider, model.model);
}

/**
 * Execute function with timeout
 * @param fn - Async function to execute
 * @param timeoutMs - Timeout in milliseconds
 * @param timeoutMessage - Error message for timeout
 * @returns Result of function execution
 */
async function executeWithTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  timeoutMessage: string,
): Promise<T> {
  let timeoutHandle!: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      const error = new WorkflowError(timeoutMessage, {
        code: "TIMEOUT",
        workflowId: "ensemble",
        phase: "ensemble",
        retryable: true,
      });
      reject(error);
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([fn(), timeoutPromise]);
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
    return result;
  } catch (error) {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
    throw error;
  }
}

/**
 * Filter successful responses from ensemble result
 * @param responses - Array of ensemble responses
 * @returns Array of successful responses
 */
export function getSuccessfulResponses(
  responses: EnsembleResponse[],
): EnsembleResponse[] {
  return responses.filter((r) => r.status === "success");
}

/**
 * Get response by model identifier
 * @param responses - Array of ensemble responses
 * @param provider - Provider name
 * @param model - Model name
 * @returns Response for specified model or undefined
 */
export function getResponseByModel(
  responses: EnsembleResponse[],
  provider: string,
  model: string,
): EnsembleResponse | undefined {
  return responses.find((r) => r.provider === provider && r.model === model);
}

/**
 * Calculate total tokens used across all responses
 * @param responses - Array of ensemble responses
 * @returns Total token count
 */
export function calculateTotalTokens(responses: EnsembleResponse[]): number {
  return responses.reduce((total, response) => {
    if (response.usage?.totalTokens) {
      return total + response.usage.totalTokens;
    }
    return total;
  }, 0);
}

/**
 * Sort responses by response time
 * @param responses - Array of ensemble responses
 * @param ascending - Sort in ascending order (default: true)
 * @returns Sorted array of responses
 */
export function sortByResponseTime(
  responses: EnsembleResponse[],
  ascending = true,
): EnsembleResponse[] {
  return [...responses].sort((a, b) => {
    return ascending
      ? a.responseTime - b.responseTime
      : b.responseTime - a.responseTime;
  });
}

/**
 * Get fastest successful response
 * @param responses - Array of ensemble responses
 * @returns Fastest successful response or undefined
 */
export function getFastestResponse(
  responses: EnsembleResponse[],
): EnsembleResponse | undefined {
  const successful = getSuccessfulResponses(responses);
  if (successful.length === 0) {
    return undefined;
  }
  return sortByResponseTime(successful, true)[0];
}

// ============================================================================
// LAYER-BASED EXECUTION (for ModelGroups)
// ============================================================================

/**
 * Execute model groups sequentially (layers)
 * Each group executes according to its executionStrategy
 * @param groups - Array of model groups to execute
 * @param prompt - User prompt
 * @param executionConfig - Execution configuration
 * @param systemPrompt - Direct system prompt override
 * @param workflowDefaultSystemPrompt - Workflow-level default system prompt
 * @returns Ensemble execution result with all responses
 */
export async function executeModelGroups(
  groups: ModelGroup[],
  prompt: string,
  _executionConfig?: ExecutionConfig,
  systemPrompt?: string,
  workflowDefaultSystemPrompt?: string,
): Promise<EnsembleExecutionResult> {
  const startTime = Date.now();
  const allResponses: EnsembleResponse[] = [];
  const allErrors: WorkflowError[] = [];
  let totalSuccessCount = 0;
  let totalFailureCount = 0;

  logger.info(
    `[${functionTag}] Executing ${groups.length} model groups sequentially`,
  );

  // Execute groups sequentially
  for (const group of groups) {
    logger.info(`[${functionTag}] Executing group: ${group.id}`, {
      groupName: group.name,
      modelCount: group.models.length,
      strategy: group.executionStrategy,
    });

    const layerResult = await executeLayer({
      group,
      prompt,
      systemPrompt,
      workflowDefaultSystemPrompt,
    });

    // Collect results
    allResponses.push(...layerResult.responses);
    totalSuccessCount += layerResult.successCount;
    totalFailureCount += layerResult.failureCount;

    // Check if we should continue to next group
    if (!layerResult.shouldContinue) {
      logger.warn(
        `[${functionTag}] Stopping execution after group: ${group.id}`,
        {
          reason: `Failed to meet minSuccessful threshold (${group.minSuccessful || 1})`,
        },
      );

      // Add error for incomplete execution
      if (group.continueOnFailure === false) {
        const error = new WorkflowError(
          `Group ${group.id} failed to meet minSuccessful threshold`,
          {
            code: "GROUP_EXECUTION_FAILED",
            workflowId: "ensemble",
            phase: "ensemble",
            retryable: false,
            details: {
              groupId: group.id,
              successCount: layerResult.successCount,
              minRequired: group.minSuccessful || 1,
            },
          },
        );
        allErrors.push(error);
      }
      break;
    }
  }

  const totalTime = Date.now() - startTime;

  logger.info(`[${functionTag}] Model groups execution completed`, {
    totalTime,
    totalResponses: allResponses.length,
    successCount: totalSuccessCount,
    failureCount: totalFailureCount,
  });

  return {
    responses: allResponses,
    totalTime,
    successCount: totalSuccessCount,
    failureCount: totalFailureCount,
    errors: allErrors,
  };
}

/**
 * Execute a single layer/group of models
 * @param options - Layer execution options
 * @returns Layer execution result
 */
async function executeLayer(
  options: ExecuteLayerOptions,
): Promise<LayerExecutionResult> {
  const startTime = Date.now();
  const { group, prompt, systemPrompt, workflowDefaultSystemPrompt } = options;

  if (group.executionStrategy === "parallel") {
    // Execute all models in parallel
    const result = await executeEnsemble({
      prompt,
      models: group.models,
      executionConfig: {
        parallelism: group.parallelism || 10,
        modelTimeout: group.timeout,
      },
      systemPrompt,
      workflowDefaults: {
        systemPrompt: workflowDefaultSystemPrompt,
      },
    });

    const shouldContinue =
      result.successCount >= (group.minSuccessful || 1) ||
      group.continueOnFailure !== false;

    return {
      groupId: group.id,
      responses: result.responses,
      successCount: result.successCount,
      failureCount: result.failureCount,
      executionTime: Date.now() - startTime,
      shouldContinue,
    };
  } else {
    // Execute models sequentially (one after another)
    const responses: EnsembleResponse[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (const model of group.models) {
      const response = await executeModel(
        {
          model,
          prompt,
          systemPrompt,
          timeout: model.timeout || group.timeout || 15000,
        },
        workflowDefaultSystemPrompt,
      );

      responses.push(response);

      if (response.status === "success") {
        successCount++;
      } else {
        failureCount++;
      }

      logger.debug(`[${functionTag}] Sequential execution progress`, {
        groupId: group.id,
        model: `${model.provider}/${model.model}`,
        status: response.status,
        successCount,
        failureCount,
      });
    }

    const shouldContinue =
      successCount >= (group.minSuccessful || 1) ||
      group.continueOnFailure !== false;

    return {
      groupId: group.id,
      responses,
      successCount,
      failureCount,
      executionTime: Date.now() - startTime,
      shouldContinue,
    };
  }
}
