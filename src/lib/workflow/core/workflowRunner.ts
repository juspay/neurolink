/**
 * Workflow Runner - Main Orchestrator
 * ===================================
 *
 * Coordinates the complete workflow execution pipeline:
 * 1. Model execution (layer-based or flat)
 * 2. Judge scoring with hierarchical prompts
 * 3. Response conditioning (stub)
 * 4. Metrics collection
 * 5. Result assembly
 *
 * @module workflow/core/workflowRunner
 */

import { logger } from "../../utils/logger.js";
import type { JsonValue } from "../../types/common.js";
import {
  getModelGroups,
  PLACEHOLDER_MODEL,
  PLACEHOLDER_PROVIDER,
  usesModelGroups,
} from "../config.js";
import type {
  EnsembleResponse,
  ExecutionConfig,
  JudgeScores,
  MultiJudgeScores,
  WorkflowConfig,
  WorkflowResult,
} from "../types.js";
import { validateWorkflow } from "../utils/workflowValidation.js";
import { executeEnsemble, executeModelGroups } from "./ensembleExecutor.js";
import { scoreEnsemble } from "./judgeScorer.js";
import { conditionResponse } from "./responseConditioner.js";
import type { EnsembleExecutionResult } from "./types/ensembleTypes.js";
import type { ScoreResult } from "./types/judgeTypes.js";

/**
 * Progressive workflow response for streaming
 */
export type WorkflowStreamChunk = {
  /**
   * Type of response chunk
   */
  type: "preliminary" | "final";

  /**
   * Response content
   */
  content: string;

  /**
   * Partial workflow result (only ensemble data for preliminary)
   */
  partialResult?: Partial<WorkflowResult>;
};

/**
 * Options for workflow execution
 */
export type RunWorkflowOptions = {
  /**
   * The user's prompt/query to send to models
   */
  prompt: string;

  /**
   * Optional conversation history for context
   */
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;

  /**
   * Override default timeout (ms) for this execution
   */
  timeout?: number;

  /**
   * Override default parallelism for this execution
   */
  parallelism?: number;

  /**
   * Enable verbose logging for debugging
   */
  verbose?: boolean;

  /**
   * Optional context/metadata to pass through
   */
  metadata?: Record<string, JsonValue>;

  /**
   * Enable progressive streaming (yield preliminary response)
   */
  streaming?: boolean;
};

/**
 * Execute a complete workflow
 *
 * This is the main entry point that orchestrates:
 * - Model execution (respects modelGroups or flat models)
 * - Judge scoring (with hierarchical prompt resolution)
 * - Response conditioning (currently stub)
 * - Metrics calculation
 * - Result assembly
 *
 * @param config - Validated workflow configuration
 * @param options - Execution options including prompt
 * @returns Complete workflow result with scores and metrics
 *
 * @example
 * ```typescript
 * const result = await runWorkflow(config, {
 *   prompt: 'Explain quantum entanglement',
 *   timeout: 30000,
 *   verbose: true,
 * });
 *
 * console.log('Best response:', result.content);
 * console.log('Score:', result.score);
 * ```
 */
export async function runWorkflow(
  config: WorkflowConfig,
  options: RunWorkflowOptions,
): Promise<WorkflowResult> {
  const startTime = Date.now();

  // Validate configuration
  const validation = validateWorkflow(config);
  if (!validation.valid) {
    throw new Error(
      `Invalid workflow configuration: ${validation.errors.map((err) => err.message).join(", ")}`,
    );
  }

  if (options.verbose) {
    logger.debug(`[WorkflowRunner] Starting workflow: ${config.name}`);
    logger.debug(`[WorkflowRunner] Type: ${config.type}`);
    logger.debug(
      `[WorkflowRunner] Uses layer-based execution: ${usesModelGroups(config)}`,
    );
  }

  try {
    // Step 1: Execute models (layer-based or flat)
    const ensembleResult = await executeModels(config, options);

    if (options.verbose) {
      logger.debug(
        `[WorkflowRunner] Received ${ensembleResult.responses.length} model responses`,
      );
      logger.debug(
        `[WorkflowRunner] Successful: ${ensembleResult.successCount}`,
      );
    }

    // Step 2: Score responses with judge(s)
    const scoreResult = await scoreResponses(
      config,
      ensembleResult.responses,
      options,
    );

    if (options.verbose) {
      logger.debug(`[WorkflowRunner] Scoring complete`);
      logger.debug(`[WorkflowRunner] Scores:`, scoreResult.scores);
    }

    // Step 3: Select best response
    const bestResponse = selectBestResponse(
      ensembleResult.responses,
      scoreResult.scores,
    );

    if (options.verbose) {
      logger.debug(`[WorkflowRunner] Best response: ${bestResponse.model}`);
      const bestScore = extractScore(
        scoreResult.scores,
        bestResponse,
        ensembleResult.responses,
      );
      logger.debug(`[WorkflowRunner] Best score: ${bestScore}`);
    }

    // CRITICAL: Store original content BEFORE any processing
    const originalContent = bestResponse.content;

    // Step 4: Get processed content
    // Priority: Judge-synthesized > Separate conditioning > Original
    let processedContent: string;
    let conditioningTime = 0;

    const judgeScores = isJudgeScores(scoreResult.scores)
      ? scoreResult.scores
      : convertToJudgeScores(scoreResult.scores);

    if (judgeScores.synthesizedResponse) {
      // Judge already synthesized improved response
      processedContent = judgeScores.synthesizedResponse;
      logger.debug(`[WorkflowRunner] Using judge-synthesized response`);
    } else if (config.conditioning) {
      // Fall back to separate conditioning if configured
      const conditionedContent = await conditionFinalResponse(
        bestResponse,
        scoreResult.scores,
        config,
        options,
        ensembleResult.responses,
      );
      processedContent = conditionedContent.content;
      conditioningTime = conditionedContent.conditioningTime;
      logger.debug(`[WorkflowRunner] Using separate conditioning`);
    } else {
      // No processing, use original
      processedContent = originalContent;
      logger.debug(`[WorkflowRunner] No conditioning applied`);
    }

    // Step 5: Calculate execution metrics
    const executionTime = Date.now() - startTime;
    const ensembleTime = ensembleResult.totalTime;
    const judgeTime = scoreResult.judgeTime;

    // Step 6: Assemble complete result
    const result: WorkflowResult = {
      // Primary output (processed version)
      content: processedContent,

      // IMPORTANT: Store original unmodified response separately
      originalContent: originalContent,

      // Evaluation metrics (0-100 scale)
      score: extractScore(
        scoreResult.scores,
        bestResponse,
        ensembleResult.responses,
      ),
      reasoning: extractReasoning(scoreResult.scores),

      // Ensemble data
      ensembleResponses: ensembleResult.responses,

      // Judge data
      judgeScores: judgeScores,
      selectedResponse: bestResponse,

      // Quality metrics
      confidence: extractConfidence(scoreResult.scores),
      consensus: extractConsensus(scoreResult.scores),

      // Performance metrics
      totalTime: executionTime,
      ensembleTime,
      judgeTime,
      conditioningTime: conditioningTime,

      // Workflow metadata
      workflow: config.id,
      workflowName: config.name,
      workflowVersion: config.version,

      // Resource usage
      usage: {
        totalInputTokens: calculateInputTokens(ensembleResult.responses),
        totalOutputTokens: calculateOutputTokens(ensembleResult.responses),
        totalTokens: calculateTotalTokens(ensembleResult.responses),
        byModel: [], // TODO: Populate per-model breakdown
      },

      // Additional metadata
      metadata: options.metadata,
      timestamp: new Date().toISOString(),
    };

    if (options.verbose) {
      logger.debug(`[WorkflowRunner] Workflow complete in ${executionTime}ms`);
      logger.debug(
        `[WorkflowRunner] Total tokens: ${result.usage?.totalTokens || 0}`,
      );
    }

    return result;
  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (options.verbose) {
      logger.error(`[WorkflowRunner] Workflow failed:`, errorMessage);
    }

    // Return error result with dummy data
    const dummyResponse: EnsembleResponse = {
      provider: PLACEHOLDER_PROVIDER,
      model: PLACEHOLDER_MODEL,
      content: "",
      responseTime: 0,
      status: "failure",
      error: errorMessage,
      timestamp: new Date().toISOString(),
    };

    return {
      content: "",
      score: 0,
      reasoning: `Workflow execution failed: ${errorMessage}`,
      ensembleResponses: [dummyResponse],
      confidence: 0,
      totalTime: executionTime,
      ensembleTime: 0,
      workflow: config.id,
      workflowName: config.name,
      workflowVersion: config.version,
      metadata: options.metadata,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Execute models using layer-based or flat execution
 */
async function executeModels(
  config: WorkflowConfig,
  options: RunWorkflowOptions,
): Promise<EnsembleExecutionResult> {
  const executionConfig: ExecutionConfig = {
    timeout: options.timeout || config.execution?.timeout,
    parallelism: options.parallelism || config.execution?.parallelism,
    modelTimeout: config.execution?.modelTimeout,
    minResponses: config.execution?.minResponses,
  };

  // Use layer-based execution if modelGroups defined
  if (usesModelGroups(config)) {
    const modelGroups = getModelGroups(config);

    if (options.verbose) {
      logger.debug(`[WorkflowRunner] Using layer-based execution`);
      logger.debug(`[WorkflowRunner] Groups: ${modelGroups.length}`);
    }

    return executeModelGroups(
      modelGroups,
      options.prompt,
      executionConfig,
      undefined, // systemPrompt override
      config.defaultSystemPrompt, // workflow default
    );
  }

  // Use flat parallel execution (backward compatible)
  if (options.verbose) {
    logger.debug(`[WorkflowRunner] Using flat parallel execution`);
    logger.debug(`[WorkflowRunner] Models: ${config.models.length}`);
  }

  return executeEnsemble({
    prompt: options.prompt,
    models: config.models,
    executionConfig,
    workflowDefaults: {
      systemPrompt: config.defaultSystemPrompt,
    },
  });
}

/**
 * Score responses using judge(s)
 */
async function scoreResponses(
  config: WorkflowConfig,
  responses: EnsembleResponse[],
  options: RunWorkflowOptions,
): Promise<ScoreResult> {
  // Use judges array if defined, otherwise use single judge
  const judges =
    config.judges && config.judges.length > 0
      ? config.judges
      : config.judge
        ? [config.judge]
        : [];

  if (judges.length === 0) {
    // No judges configured - return neutral scores
    if (options.verbose) {
      logger.debug(
        `[WorkflowRunner] No judges configured, using neutral scores`,
      );
    }

    const neutralScores: JudgeScores = {
      judgeProvider: PLACEHOLDER_PROVIDER,
      judgeModel: PLACEHOLDER_MODEL,
      scores: {},
      criteria: [],
      reasoning: "No judge configured",
      judgeTime: 0,
      timestamp: new Date().toISOString(),
    };

    // Assign neutral score (50) to each response
    for (const response of responses) {
      const responseId = `${response.provider}-${response.model}`;
      neutralScores.scores[responseId] = 50;
    }

    return {
      scores: neutralScores,
      judgeTime: 0,
    };
  }

  if (options.verbose) {
    logger.debug(`[WorkflowRunner] Using ${judges.length} judge(s)`);
  }

  return scoreEnsemble({
    judges,
    responses,
    originalPrompt: options.prompt,
    timeout: config.execution?.timeout,
    workflowDefaults: {
      judgePrompt: config.defaultJudgePrompt,
    },
  });
}

/**
 * Select best response based on scores
 */
function selectBestResponse(
  responses: EnsembleResponse[],
  scores: JudgeScores | MultiJudgeScores,
): EnsembleResponse {
  // Filter to successful responses only
  const successful = responses.filter((r) => r.status === "success");

  if (successful.length === 0) {
    // No successful responses - return first response
    return (
      responses[0] || {
        provider: PLACEHOLDER_PROVIDER,
        model: PLACEHOLDER_MODEL,
        content: "",
        responseTime: 0,
        status: "failure",
        error: "No responses received",
        timestamp: new Date().toISOString(),
      }
    );
  }

  // Find response with highest score
  let bestResponse = successful[0];
  let bestScore = getResponseScore(bestResponse, scores, responses);

  for (const response of successful) {
    const score = getResponseScore(response, scores, responses);
    if (score > bestScore) {
      bestScore = score;
      bestResponse = response;
    }
  }

  return bestResponse;
}

/**
 * Get score for a specific response
 */
function getResponseScore(
  response: EnsembleResponse,
  scores: JudgeScores | MultiJudgeScores,
  responses: EnsembleResponse[],
): number {
  // Judge scores only successful responses, so we need to find the index
  // in the filtered successful responses array, not the original array
  const successfulResponses = responses.filter((r) => r.status === "success");
  const successfulIndex = successfulResponses.indexOf(response);

  logger.debug(`[WorkflowRunner] getResponseScore`, {
    responseProvider: response.provider,
    responseModel: response.model,
    responseStatus: response.status,
    originalIndex: responses.indexOf(response),
    successfulIndex,
    totalResponses: responses.length,
    successfulCount: successfulResponses.length,
    lookupKey: `response-${successfulIndex}`,
    availableKeys: Object.keys(scores.scores),
  });

  if (successfulIndex >= 0) {
    const indexKey = `response-${successfulIndex}`;
    if (indexKey in scores.scores) {
      const score = scores.scores[indexKey];
      logger.debug(`[WorkflowRunner] Found score ${score} for ${indexKey}`);
      return score;
    }
  }

  // Fallback to provider-model format
  const responseId = `${response.provider}-${response.model}`;
  logger.debug(
    `[WorkflowRunner] No index-based score found, trying provider-model: ${responseId}`,
  );
  return scores.scores[responseId] || 0;
}

/**
 * Condition the final response - synthesize improved response using judge feedback
 */
async function conditionFinalResponse(
  response: EnsembleResponse,
  scores: JudgeScores | MultiJudgeScores,
  config: WorkflowConfig,
  options: RunWorkflowOptions,
  allResponses: EnsembleResponse[],
) {
  // Use conditioner if configured
  if (config.conditioning) {
    if (options.verbose) {
      logger.debug(
        `[WorkflowRunner] Applying response conditioner with synthesis`,
      );
    }

    return conditionResponse({
      content: response.content,
      selectedResponse: response,
      allResponses,
      judgeScores: scores,
      config: config.conditioning,
      originalPrompt: options.prompt,
    });
  }

  // No conditioning - return original with metadata
  return {
    content: response.content,
    conditioningTime: 0,
    metadata: {
      conditioningApplied: false,
      originalLength: response.content.length,
      finalLength: response.content.length,
    },
  };
}

// ============================================================================
// HELPER FUNCTIONS FOR RESULT ASSEMBLY
// ============================================================================

/**
 * Type guard to check if scores are JudgeScores (not MultiJudgeScores)
 */
function isJudgeScores(
  scores: JudgeScores | MultiJudgeScores,
): scores is JudgeScores {
  return !("judges" in scores);
}

/**
 * Convert MultiJudgeScores to JudgeScores format for WorkflowResult
 */
function convertToJudgeScores(scores: MultiJudgeScores): JudgeScores {
  return {
    judgeProvider: scores.judgeProvider || "multi-judge",
    judgeModel: scores.judgeModel || "consensus",
    scores: scores.scores,
    ranking: scores.ranking,
    bestResponse: scores.bestResponse,
    criteria: scores.criteria,
    reasoning: scores.reasoning,
    confidenceInJudgment: scores.confidenceInJudgment,
    judgeTime: scores.judgeTime,
    timestamp: scores.timestamp,
  };
}

/**
 * Extract best score from judge result
 */
function extractScore(
  scores: JudgeScores | MultiJudgeScores,
  bestResponse: EnsembleResponse,
  responses: EnsembleResponse[],
): number {
  return getResponseScore(bestResponse, scores, responses);
}

/**
 * Extract reasoning from judge result
 */
function extractReasoning(scores: JudgeScores | MultiJudgeScores): string {
  return scores.reasoning || "No reasoning provided";
}

/**
 * Extract confidence from judge result
 */
function extractConfidence(scores: JudgeScores | MultiJudgeScores): number {
  return scores.confidenceInJudgment || 0.5;
}

/**
 * Extract consensus level from scores
 */
function extractConsensus(
  scores: JudgeScores | MultiJudgeScores,
): number | undefined {
  if ("consensusLevel" in scores) {
    return scores.consensusLevel;
  }
  return undefined;
}

/**
 * Calculate total input tokens
 */
function calculateInputTokens(responses: EnsembleResponse[]): number {
  return responses.reduce((sum, r) => sum + (r.usage?.inputTokens || 0), 0);
}

/**
 * Calculate total output tokens
 */
function calculateOutputTokens(responses: EnsembleResponse[]): number {
  return responses.reduce((sum, r) => sum + (r.usage?.outputTokens || 0), 0);
}

/**
 * Calculate total tokens
 */
function calculateTotalTokens(responses: EnsembleResponse[]): number {
  return responses.reduce((sum, r) => sum + (r.usage?.totalTokens || 0), 0);
}

/**
 * Execute workflow with progressive streaming support
 * Yields preliminary response (first completed model) and final synthesized response
 *
 * @param config - Validated workflow configuration
 * @param options - Execution options with streaming enabled
 * @returns AsyncGenerator yielding preliminary and final responses
 *
 * @example
 * ```typescript
 * for await (const chunk of runWorkflowWithStreaming(config, options)) {
 *   if (chunk.type === 'preliminary') {
 *     console.log('Fast response:', chunk.content);
 *   } else {
 *     console.log('Final synthesis:', chunk.content);
 *   }
 * }
 * ```
 */
export async function* runWorkflowWithStreaming(
  config: WorkflowConfig,
  options: RunWorkflowOptions,
): AsyncGenerator<WorkflowStreamChunk, void, undefined> {
  const startTime = Date.now();

  // Validate configuration
  const validation = validateWorkflow(config);
  if (!validation.valid) {
    throw new Error(
      `Invalid workflow configuration: ${validation.errors.map((err) => err.message).join(", ")}`,
    );
  }

  if (options.verbose) {
    logger.debug(
      `[WorkflowRunner] Starting streaming workflow: ${config.name}`,
    );
  }

  try {
    // Step 1: Execute models
    const ensembleResult = await executeModels(config, options);

    if (options.verbose) {
      logger.debug(
        `[WorkflowRunner] Ensemble complete with ${ensembleResult.successCount} successful responses`,
      );
    }

    // Yield preliminary response (first successful model)
    if (ensembleResult.successCount > 0) {
      const firstResponse = ensembleResult.responses.find(
        (r): r is EnsembleResponse & { content: string } =>
          r.status === "success" && Boolean(r.content),
      );

      if (firstResponse) {
        if (options.verbose) {
          logger.debug(
            `[WorkflowRunner] Yielding preliminary response from ${firstResponse.model}`,
          );
        }

        yield {
          type: "preliminary" as const,
          content: firstResponse.content,
          partialResult: {
            ensembleResponses: [firstResponse],
            workflow: config.id,
            workflowName: config.name,
          },
        };
      }
    }

    // Step 2: Continue with full workflow execution (judge + synthesis)
    const scoreResult = await scoreResponses(
      config,
      ensembleResult.responses,
      options,
    );

    const bestResponse = selectBestResponse(
      ensembleResult.responses,
      scoreResult.scores,
    );

    const originalContent = bestResponse.content;

    // Step 3: Get processed content
    let processedContent: string;
    let conditioningTime = 0;

    const judgeScores = isJudgeScores(scoreResult.scores)
      ? scoreResult.scores
      : convertToJudgeScores(scoreResult.scores);

    if (judgeScores.synthesizedResponse) {
      processedContent = judgeScores.synthesizedResponse;
      if (options.verbose) {
        logger.debug(`[WorkflowRunner] Using judge-synthesized response`);
      }
    } else if (config.conditioning) {
      const conditionedContent = await conditionFinalResponse(
        bestResponse,
        scoreResult.scores,
        config,
        options,
        ensembleResult.responses,
      );
      processedContent = conditionedContent.content;
      conditioningTime = conditionedContent.conditioningTime;
      if (options.verbose) {
        logger.debug(`[WorkflowRunner] Using separate conditioning`);
      }
    } else {
      processedContent = originalContent;
      if (options.verbose) {
        logger.debug(`[WorkflowRunner] No conditioning applied`);
      }
    }

    const executionTime = Date.now() - startTime;
    const ensembleTime = ensembleResult.totalTime;
    const judgeTime = scoreResult.judgeTime;

    // Yield final synthesized response
    if (options.verbose) {
      logger.debug(`[WorkflowRunner] Yielding final synthesized response`);
    }

    yield {
      type: "final" as const,
      content: processedContent,
      partialResult: {
        content: processedContent,
        originalContent: originalContent,
        score: extractScore(
          scoreResult.scores,
          bestResponse,
          ensembleResult.responses,
        ),
        reasoning: extractReasoning(scoreResult.scores),
        ensembleResponses: ensembleResult.responses,
        judgeScores: judgeScores,
        selectedResponse: bestResponse,
        confidence: extractConfidence(scoreResult.scores),
        consensus: extractConsensus(scoreResult.scores),
        totalTime: executionTime,
        ensembleTime,
        judgeTime,
        conditioningTime: conditioningTime,
        workflow: config.id,
        workflowName: config.name,
        workflowVersion: config.version,
        usage: {
          totalInputTokens: calculateInputTokens(ensembleResult.responses),
          totalOutputTokens: calculateOutputTokens(ensembleResult.responses),
          totalTokens: calculateTotalTokens(ensembleResult.responses),
          byModel: [],
        },
        metadata: options.metadata,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    logger.error(`[WorkflowRunner] Streaming workflow failed`, {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
