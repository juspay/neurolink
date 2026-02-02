/**
 * workflow/core/judgeScorer.ts
 * Judge-based scoring system for ensemble response evaluation
 */

import { AIProviderFactory } from "../../core/factory.js";
import { logger } from "../../utils/logger.js";
import { MAX_REASONING_LENGTH } from "../config.js";
import type {
  EnsembleResponse,
  JudgeConfig,
  JudgeScores,
  MultiJudgeScores,
} from "../types.js";
import { WorkflowError } from "../types.js";
import type {
  ParsedJudgeResponse,
  ScoreOptions,
  ScoreResult,
} from "./types/index.js";

const functionTag = "JudgeScorer";

// ============================================================================
// SCORING FUNCTIONS
// ============================================================================

/**
 * Execute judge scoring on ensemble responses
 * @param options - Scoring options including judges and responses
 * @returns Score result with judge evaluation
 */
export async function scoreEnsemble(
  options: ScoreOptions,
): Promise<ScoreResult> {
  const startTime = Date.now();
  const {
    judges,
    responses,
    originalPrompt,
    systemPrompt,
    timeout,
    workflowDefaults,
  } = options;

  logger.info(`[${functionTag}] Starting judge scoring`, {
    judgeCount: judges.length,
    responseCount: responses.length,
  });

  try {
    // Filter successful responses for evaluation
    const successfulResponses = responses.filter(
      (r) => r.status === "success" && r.content.trim() !== "",
    );

    if (successfulResponses.length === 0) {
      throw new WorkflowError("No successful responses to evaluate", {
        code: "NO_RESPONSES_TO_EVALUATE",
        workflowId: "judge",
        phase: "judge",
        retryable: false,
      });
    }

    if (judges.length === 1) {
      // Single judge scoring
      const judgeResult = await executeSingleJudge(
        judges[0],
        successfulResponses,
        originalPrompt,
        systemPrompt,
        timeout,
        workflowDefaults?.judgePrompt,
      );

      return {
        scores: judgeResult,
        judgeTime: Date.now() - startTime,
      };
    } else {
      // Multi-judge voting
      const multiJudgeResult = await executeMultiJudge(
        judges,
        successfulResponses,
        originalPrompt,
        systemPrompt,
        timeout,
        workflowDefaults?.judgePrompt,
      );

      return {
        scores: multiJudgeResult,
        judgeTime: Date.now() - startTime,
      };
    }
  } catch (error) {
    const err = error as Error;
    logger.error(`[${functionTag}] Judge scoring failed`, {
      error: err.message,
    });

    const workflowError =
      error instanceof WorkflowError
        ? error
        : new WorkflowError(err.message, {
            code: "JUDGE_SCORING_ERROR",
            workflowId: "judge",
            phase: "judge",
            retryable: true,
          });

    return {
      scores: createEmptyScores(judges[0], responses),
      judgeTime: Date.now() - startTime,
      error: workflowError,
    };
  }
}

/**
 * Execute single judge evaluation
 * @param judge - Judge configuration
 * @param responses - Successful ensemble responses
 * @param originalPrompt - Original user prompt
 * @param systemPrompt - Optional system prompt
 * @param timeout - Judge timeout in milliseconds
 * @returns Judge scores with evaluation
 */
async function executeSingleJudge(
  judge: JudgeConfig,
  responses: EnsembleResponse[],
  originalPrompt: string,
  systemPrompt?: string,
  timeout?: number,
  workflowDefaultJudgePrompt?: string,
): Promise<JudgeScores> {
  const startTime = Date.now();

  logger.debug(`[${functionTag}] Executing single judge`, {
    provider: judge.provider,
    model: judge.model,
  });

  // Resolve judge prompt with hierarchical fallback:
  // 1. Judge-specific customPrompt (highest priority)
  // 2. Workflow-level default judge prompt
  // 3. Built-in default template
  const resolvedJudgePrompt = judge.customPrompt || workflowDefaultJudgePrompt;

  // Create judge prompt (will use resolvedJudgePrompt if provided, otherwise default template)
  const judgePrompt = createJudgePrompt(
    judge,
    responses,
    originalPrompt,
    resolvedJudgePrompt,
  );

  // Execute judge
  const provider = await AIProviderFactory.createProvider(
    judge.provider,
    judge.model,
  );

  const result = await provider.generate({
    prompt: judgePrompt,
    systemPrompt: systemPrompt || judge.systemPrompt,
    temperature: judge.temperature || 0.1,
    maxTokens: judge.maxTokens || 2000,
    timeout: timeout || judge.timeout || 10000,
  });

  // Parse judge response
  const parsed = parseJudgeResponse(result?.content || "", responses, judge);

  // Build JudgeScores
  const judgeScores: JudgeScores = {
    judgeProvider: judge.provider,
    judgeModel: judge.model,
    scores: parsed.scores,
    ranking: parsed.ranking,
    bestResponse: parsed.bestResponse,
    criteria: judge.criteria,
    reasoning: parsed.reasoning,
    synthesizedResponse: parsed.synthesizedResponse, // Include synthesized response if present
    confidenceInJudgment: parsed.confidenceInJudgment,
    judgeTime: Date.now() - startTime,
    timestamp: new Date().toISOString(),
  };

  logger.debug(`[${functionTag}] Single judge completed`, {
    bestResponse: judgeScores.bestResponse,
    hasSynthesizedResponse: !!parsed.synthesizedResponse,
    judgeTime: judgeScores.judgeTime,
  });

  return judgeScores;
}

/**
 * Execute multi-judge voting
 * @param judges - Array of judge configurations
 * @param responses - Successful ensemble responses
 * @param originalPrompt - Original user prompt
 * @param systemPrompt - Optional system prompt
 * @param timeout - Judge timeout in milliseconds
 * @returns Multi-judge scores with aggregated results
 */
async function executeMultiJudge(
  judges: JudgeConfig[],
  responses: EnsembleResponse[],
  originalPrompt: string,
  systemPrompt?: string,
  timeout?: number,
  workflowDefaultJudgePrompt?: string,
): Promise<MultiJudgeScores> {
  const startTime = Date.now();

  logger.debug(`[${functionTag}] Executing multi-judge voting`, {
    judgeCount: judges.length,
  });

  // Execute all judges in parallel
  const judgePromises = judges.map((judge) =>
    executeSingleJudge(
      judge,
      responses,
      originalPrompt,
      systemPrompt,
      timeout,
      workflowDefaultJudgePrompt,
    ).catch((error) => {
      logger.warn(`[${functionTag}] Judge failed`, {
        provider: judge.provider,
        model: judge.model,
        error: error.message,
      });
      return createEmptyJudgeScores(judge, responses);
    }),
  );

  const judgeResults = await Promise.all(judgePromises);

  // Aggregate scores using average (can be configurable in future)
  const aggregated = aggregateJudgeScores(judgeResults, "average");

  const multiJudgeScores: MultiJudgeScores = {
    judges: judgeResults,
    averageScores: aggregated.averageScores,
    aggregatedRanking: aggregated.ranking,
    consensusLevel: calculateConsensusLevel(judgeResults),
    bestResponse: aggregated.bestResponse,
    confidence: aggregated.confidence,
    votingStrategy: "average",

    // Expose unified interface fields
    judgeProvider: judgeResults[0]?.judgeProvider,
    judgeModel: `multi-judge-${judges.length}`,
    scores: aggregated.averageScores,
    ranking: aggregated.ranking,
    reasoning: aggregated.reasoning,
    confidenceInJudgment: aggregated.confidence,
    criteria: judges[0]?.criteria || [],
    judgeTime: Date.now() - startTime,
    timestamp: new Date().toISOString(),
  };

  logger.debug(`[${functionTag}] Multi-judge completed`, {
    bestResponse: multiJudgeScores.bestResponse,
    consensusLevel: multiJudgeScores.consensusLevel,
    judgeTime: multiJudgeScores.judgeTime,
  });

  return multiJudgeScores;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create judge evaluation prompt
 * @param judge - Judge configuration
 * @param responses - Ensemble responses to evaluate
 * @param originalPrompt - Original user prompt
 * @param customPrompt - Custom evaluation prompt (overrides default)
 * @returns Formatted judge prompt
 */
function createJudgePrompt(
  judge: JudgeConfig,
  responses: EnsembleResponse[],
  originalPrompt: string,
  customPrompt?: string,
): string {
  // If custom prompt provided, use it
  if (customPrompt) {
    logger.debug(`[${functionTag}] Using custom judge prompt`);
    return customPrompt;
  }

  // Build response blocks
  const responseBlocks = responses
    .map((r, index) => {
      const identifier = `response-${index}`;
      const modelInfo = judge.blindEvaluation
        ? `Response ${index + 1}`
        : `${r.provider}/${r.model}`;

      return `
<response id="${identifier}">
<model>${modelInfo}</model>
<content>
${r.content}
</content>
</response>`;
    })
    .join("\n");

  const criteriaList = judge.criteria
    .map((c, i) => `${i + 1}. ${c}`)
    .join("\n");

  // If synthesis is enabled, judge creates improved response
  if (judge.synthesizeImprovedResponse) {
    return `You are an expert AI evaluator and synthesizer. Your task is to:
1. Evaluate all responses
2. Synthesize an IMPROVED final response that combines their strengths

USER QUESTION:
${originalPrompt}

RESPONSES TO EVALUATE:
${responseBlocks}

EVALUATION CRITERIA:
${criteriaList}

INSTRUCTIONS:
1. Score each response on a scale of 0-100 (0 = poor, 100 = excellent)
2. Consider all evaluation criteria listed above
3. Provide a ranking of responses from best to worst
4. Identify the single best response
5. Provide brief reasoning for your evaluation (max 200 characters)
6. **SYNTHESIZE an improved response** that:
   - Combines the best elements from all responses
   - Addresses any weaknesses identified in the evaluation
   - Maintains accuracy and technical correctness
   - Is more complete and higher quality than any single response
   - Directly answers the user's question (no meta-commentary)
7. Rate your confidence in this judgment (0.0 to 1.0)

Respond in JSON format:
{
  "scores": {
    "response-0": 85,
    "response-1": 92
  },
  "ranking": ["response-1", "response-0"],
  "bestResponse": "response-1",
  "reasoning": "Brief explanation of evaluation",
  "synthesizedResponse": "Your improved, synthesized response here",
  "confidenceInJudgment": 0.9
}`;
  }

  // Standard evaluation (no synthesis)
  return `You are an expert AI evaluator. Evaluate the following responses to the user's question.

USER QUESTION:
${originalPrompt}

RESPONSES TO EVALUATE:
${responseBlocks}

EVALUATION CRITERIA:
${criteriaList}

INSTRUCTIONS:
1. Score each response on a scale of 0-100 (0 = poor, 100 = excellent)
2. Consider all evaluation criteria listed above
3. Provide a ranking of responses from best to worst
4. Identify the single best response
5. Provide brief reasoning for your evaluation (max 200 characters)
6. Rate your confidence in this judgment (0.0 to 1.0)

Respond in JSON format:
{
  "scores": {
    "response-0": 85,
    "response-1": 92
  },
  "ranking": ["response-1", "response-0"],
  "bestResponse": "response-1",
  "reasoning": "Brief explanation of evaluation",
  "confidenceInJudgment": 0.9
}`;
}

/**
 * Parse judge response to extract scores
 * @param content - Raw judge response content
 * @param responses - Original ensemble responses
 * @param _judge - Judge configuration (unused)
 * @returns Parsed judge response with scores
 */
function parseJudgeResponse(
  content: string,
  responses: EnsembleResponse[],
  _judge: JudgeConfig,
): ParsedJudgeResponse {
  try {
    // Try to extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.warn(`[${functionTag}] No JSON found in judge response`);
      return createFallbackScores(responses);
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate and normalize scores to 0-100 range
    const scores: Record<string, number> = {};
    Object.keys(parsed.scores || {}).forEach((key) => {
      const score = Number(parsed.scores[key]);
      scores[key] = Math.max(0, Math.min(100, score));
    });

    // Ensure all responses have scores
    responses.forEach((_, index) => {
      const key = `response-${index}`;
      if (!(key in scores)) {
        scores[key] = 50; // Default neutral score
      }
    });

    return {
      scores,
      ranking: parsed.ranking || generateRankingFromScores(scores),
      bestResponse: parsed.bestResponse || findBestResponse(scores),
      reasoning: truncateReasoning(parsed.reasoning || "No reasoning provided"),
      synthesizedResponse: parsed.synthesizedResponse, // Extract synthesized response if present
      confidenceInJudgment: normalizeConfidence(parsed.confidenceInJudgment),
    };
  } catch (error) {
    logger.warn(`[${functionTag}] Failed to parse judge response`, {
      error: (error as Error).message,
    });
    return createFallbackScores(responses);
  }
}

/**
 * Create fallback scores when parsing fails
 * @param responses - Ensemble responses
 * @returns Default scores with equal values
 */
function createFallbackScores(
  responses: EnsembleResponse[],
): ParsedJudgeResponse {
  const scores: Record<string, number> = {};
  const ranking: string[] = [];

  responses.forEach((_, index) => {
    const key = `response-${index}`;
    scores[key] = 50; // Neutral score
    ranking.push(key);
  });

  return {
    scores,
    ranking,
    bestResponse: ranking[0],
    reasoning: "Unable to parse judge evaluation",
    confidenceInJudgment: 0.5,
  };
}

/**
 * Generate ranking from scores
 * @param scores - Score record
 * @returns Array of response IDs sorted by score descending
 */
function generateRankingFromScores(scores: Record<string, number>): string[] {
  return Object.keys(scores).sort((a, b) => scores[b] - scores[a]);
}

/**
 * Find best response from scores
 * @param scores - Score record
 * @returns Response ID with highest score
 */
function findBestResponse(scores: Record<string, number>): string {
  let bestId = "";
  let bestScore = -1;

  Object.keys(scores).forEach((key) => {
    if (scores[key] > bestScore) {
      bestScore = scores[key];
      bestId = key;
    }
  });

  return bestId || Object.keys(scores)[0];
}

/**
 * Truncate reasoning to max 200 characters
 * @param reasoning - Reasoning text
 * @returns Truncated reasoning
 */
function truncateReasoning(reasoning: string): string {
  if (reasoning.length <= MAX_REASONING_LENGTH) {
    return reasoning;
  }
  return reasoning.substring(0, MAX_REASONING_LENGTH - 3) + "...";
}

/**
 * Normalize confidence to 0-1 range
 * @param confidence - Confidence value
 * @returns Normalized confidence between 0 and 1
 */
function normalizeConfidence(confidence: unknown): number {
  if (typeof confidence !== "number") {
    return 0.5;
  }
  return Math.max(0, Math.min(1, confidence));
}

/**
 * Aggregate multiple judge scores
 * @param judgeResults - Array of judge score results
 * @param _strategy - Aggregation strategy (currently only 'average')
 * @returns Aggregated scores and ranking
 */
function aggregateJudgeScores(
  judgeResults: JudgeScores[],
  _strategy: "average" | "median" | "majority",
): {
  averageScores: Record<string, number>;
  ranking: string[];
  bestResponse: string;
  confidence: number;
  reasoning: string;
} {
  // Collect all response IDs
  const responseIds = new Set<string>();
  judgeResults.forEach((result) => {
    Object.keys(result.scores).forEach((id) => responseIds.add(id));
  });

  // Calculate average scores
  const averageScores: Record<string, number> = {};
  responseIds.forEach((id) => {
    const scores = judgeResults
      .map((result) => result.scores[id])
      .filter((score) => score !== undefined);

    if (scores.length > 0) {
      averageScores[id] =
        scores.reduce((sum, score) => sum + score, 0) / scores.length;
    } else {
      averageScores[id] = 50; // Default
    }
  });

  // Generate ranking from average scores
  const ranking = generateRankingFromScores(averageScores);
  const bestResponse = ranking[0];

  // Calculate aggregate confidence
  const confidences = judgeResults
    .map((r) => r.confidenceInJudgment || 0.5)
    .filter((c) => c > 0);
  const confidence =
    confidences.length > 0
      ? confidences.reduce((sum, c) => sum + c, 0) / confidences.length
      : 0.5;

  // Aggregate reasoning
  const reasoning = `Aggregated from ${judgeResults.length} judges`;

  return {
    averageScores,
    ranking,
    bestResponse,
    confidence,
    reasoning,
  };
}

/**
 * Calculate consensus level between judges
 * @param judgeResults - Array of judge score results
 * @returns Consensus level between 0 and 1
 */
function calculateConsensusLevel(judgeResults: JudgeScores[]): number {
  if (judgeResults.length < 2) {
    return 1.0; // Perfect consensus with single judge
  }

  // Calculate agreement on best response
  const bestResponses = judgeResults.map((r) => r.bestResponse);
  const modeCounts = new Map<string, number>();

  bestResponses.forEach((response) => {
    if (response) {
      modeCounts.set(response, (modeCounts.get(response) || 0) + 1);
    }
  });

  const maxCount = Math.max(...Array.from(modeCounts.values()));
  return maxCount / judgeResults.length;
}

/**
 * Create empty judge scores for error cases
 * @param judge - Judge configuration
 * @param responses - Ensemble responses
 * @returns Empty judge scores
 */
function createEmptyJudgeScores(
  judge: JudgeConfig,
  responses: EnsembleResponse[],
): JudgeScores {
  const scores: Record<string, number> = {};
  responses.forEach((_, index) => {
    scores[`response-${index}`] = 50;
  });

  return {
    judgeProvider: judge.provider,
    judgeModel: judge.model,
    scores,
    criteria: judge.criteria,
    judgeTime: 0,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create empty scores for error cases
 * @param judge - Judge configuration
 * @param responses - Ensemble responses
 * @returns Empty judge scores
 */
function createEmptyScores(
  judge: JudgeConfig,
  responses: EnsembleResponse[],
): JudgeScores {
  return createEmptyJudgeScores(judge, responses);
}

/**
 * Get best response from judge scores
 * @param scores - Judge scores or multi-judge scores
 * @param responses - Original ensemble responses
 * @returns Best ensemble response
 */
export function getBestResponse(
  scores: JudgeScores | MultiJudgeScores,
  responses: EnsembleResponse[],
): EnsembleResponse | undefined {
  const bestId = scores.bestResponse;
  if (!bestId) {
    return undefined;
  }

  const index = parseInt(bestId.replace("response-", ""), 10);
  return responses[index];
}

/**
 * Get ranked responses
 * @param scores - Judge scores or multi-judge scores
 * @param responses - Original ensemble responses
 * @returns Responses sorted by ranking
 */
export function getRankedResponses(
  scores: JudgeScores | MultiJudgeScores,
  responses: EnsembleResponse[],
): EnsembleResponse[] {
  if (!scores.ranking || scores.ranking.length === 0) {
    return responses;
  }

  return scores.ranking
    .map((id) => {
      const index = parseInt(id.replace("response-", ""), 10);
      return responses[index];
    })
    .filter((r) => r !== undefined);
}
