/**
 * workflow/core/responseConditioner.ts
 * Response conditioning and synthesis
 *
 * Uses judge feedback and ensemble responses to synthesize an improved final response.
 * Combines strengths from multiple responses based on evaluation insights.
 */

import { logger } from "../../utils/logger.js";
import { AIProviderFactory } from "../../core/factory.js";
import type { ConditioningConfig } from "../types.js";
import type { ConditionOptions, ConditionResult } from "./types/index.js";
import type {
  EnsembleResponse,
  JudgeScores,
  MultiJudgeScores,
} from "../types.js";

const functionTag = "ResponseConditioner";

// ============================================================================
// CONDITIONING FUNCTIONS
// ============================================================================

/**
 * Condition response by synthesizing improved version using judge feedback
 *
 * @param options - Conditioning options including all responses and judge feedback
 * @returns Conditioned result with synthesized improved content
 */
export async function conditionResponse(
  options: ConditionOptions,
): Promise<ConditionResult> {
  const startTime = Date.now();
  const {
    content,
    selectedResponse,
    allResponses,
    judgeScores,
    config,
    originalPrompt,
  } = options;

  logger.debug(`[${functionTag}] Conditioning response with synthesis`, {
    originalLength: content.length,
    provider: selectedResponse.provider,
    model: selectedResponse.model,
    hasConfig: !!config,
    numResponses: allResponses?.length || 0,
  });

  // Check if conditioning is enabled
  if (!config || !config.useConfidence) {
    logger.debug(`[${functionTag}] Conditioning disabled, returning original`);
    return {
      content,
      conditioningTime: Date.now() - startTime,
      metadata: {
        conditioningApplied: false,
        originalLength: content.length,
        finalLength: content.length,
      },
    };
  }

  // If synthesis model not configured, fall back to original with metadata
  if (!config.synthesisModel) {
    logger.debug(
      `[${functionTag}] No synthesis model configured, returning original with metadata`,
    );
    return addMetadataOnly(
      content,
      selectedResponse,
      judgeScores,
      config,
      startTime,
    );
  }

  try {
    // Synthesize improved response using LLM
    const synthesizedContent = await synthesizeImprovedResponse(
      content,
      allResponses,
      judgeScores,
      originalPrompt,
      config,
    );

    const conditioningTime = Date.now() - startTime;

    logger.debug(`[${functionTag}] Response synthesized successfully`, {
      conditioningTime,
      originalLength: content.length,
      finalLength: synthesizedContent.length,
      improvement: synthesizedContent.length - content.length,
    });

    return {
      content: synthesizedContent,
      conditioningTime,
      metadata: {
        conditioningApplied: true,
        originalLength: content.length,
        finalLength: synthesizedContent.length,
        confidenceStatementAdded: false,
        modelAttributionAdded: false,
        executionTimeAdded: false,
        synthesisApplied: true,
      },
    };
  } catch (error) {
    logger.warn(`[${functionTag}] Synthesis failed, falling back to original`, {
      error: error instanceof Error ? error.message : String(error),
    });

    // Fall back to original with metadata
    return addMetadataOnly(
      content,
      selectedResponse,
      judgeScores,
      config,
      startTime,
    );
  }
}

/**
 * Check if conditioning is enabled
 * @param config - Conditioning configuration
 * @returns True if conditioning should be applied
 */
export function isConditioningEnabled(config?: ConditioningConfig): boolean {
  return config?.useConfidence === true;
}

// ============================================================================
// SYNTHESIS FUNCTIONS
// ============================================================================

/**
 * Synthesize improved response using judge feedback and all ensemble responses
 */
async function synthesizeImprovedResponse(
  bestContent: string,
  allResponses: EnsembleResponse[],
  judgeScores: JudgeScores | MultiJudgeScores | undefined,
  originalPrompt?: string,
  config?: ConditioningConfig,
): Promise<string> {
  const reasoning = judgeScores?.reasoning || "No specific feedback available";

  // Build synthesis prompt
  const synthesisPrompt = `You are a response synthesis expert. Your task is to create an improved, higher-quality response by combining the best elements from multiple AI-generated responses.

ORIGINAL USER PROMPT:
${originalPrompt || "Not provided"}

JUDGE'S EVALUATION:
${reasoning}

AVAILABLE RESPONSES:
${allResponses
  .filter((r) => r.status === "success" && r.content)
  .map(
    (r, i) => `
Response ${i + 1} (${r.provider}/${r.model}):
${r.content}
`,
  )
  .join("\n---\n")}

BEST RESPONSE (Selected by Judge):
${bestContent}

YOUR TASK:
Synthesize an improved final response that:
1. Incorporates the judge's feedback and addresses any identified weaknesses
2. Combines the strongest elements from all responses
3. Maintains accuracy and technical correctness
4. Improves clarity, completeness, and overall quality
5. Maintains the same tone and format as the original responses
6. Does NOT add meta-commentary, disclaimers, or explanatory notes
7. Provides a direct, polished answer to the user's original question

Output ONLY the synthesized response, nothing else.`;

  logger.debug(`[${functionTag}] Calling synthesis model`, {
    model: config?.synthesisModel?.model || "default",
    provider: config?.synthesisModel?.provider || "default",
  });

  // Create provider for synthesis using AIProviderFactory
  const synthesisProvider = config?.synthesisModel?.provider || "azure";
  const synthesisModel = config?.synthesisModel?.model || "gpt-4o";

  const provider = await AIProviderFactory.createProvider(
    synthesisProvider,
    synthesisModel,
  );

  // Generate improved response
  const result = await provider.generate({
    prompt: synthesisPrompt,
    temperature: config?.synthesisModel?.temperature || 0.3,
    maxTokens: 2000,
    timeout: 30000,
  });

  if (!result || !result.content) {
    throw new Error("Synthesis model returned empty response");
  }

  return result.content.trim();
}

/**
 * Fallback: Add metadata only (original behavior)
 */
function addMetadataOnly(
  content: string,
  selectedResponse: EnsembleResponse,
  judgeScores: JudgeScores | MultiJudgeScores | undefined,
  config: ConditioningConfig,
  startTime: number,
): ConditionResult {
  let conditionedContent = content;

  // Add confidence statement if enabled
  if (config.addConfidenceStatement && judgeScores) {
    const confidenceLevel = getConfidenceLevel(
      judgeScores.confidenceInJudgment || 0.5,
      config,
    );
    conditionedContent = addConfidenceStatement(
      conditionedContent,
      confidenceLevel,
      judgeScores.confidenceInJudgment || 0.5,
    );
  }

  // Add model attribution if enabled
  if (config.addModelAttribution) {
    conditionedContent = addModelAttribution(
      conditionedContent,
      selectedResponse.provider,
      selectedResponse.model,
      judgeScores,
    );
  }

  // Add execution time if enabled
  if (config.addExecutionTime) {
    conditionedContent = addExecutionMetrics(
      conditionedContent,
      selectedResponse.responseTime,
    );
  }

  const conditioningTime = Date.now() - startTime;

  return {
    content: conditionedContent,
    conditioningTime,
    metadata: {
      conditioningApplied: true,
      originalLength: content.length,
      finalLength: conditionedContent.length,
      confidenceStatementAdded: config.addConfidenceStatement,
      modelAttributionAdded: config.addModelAttribution,
      executionTimeAdded: config.addExecutionTime,
    },
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Determine confidence level from score
 */
function getConfidenceLevel(
  confidence: number,
  config: ConditioningConfig,
): "high" | "medium" | "low" {
  const thresholds = config.confidenceThresholds || {
    high: 0.8,
    medium: 0.5,
    low: 0.3,
  };

  if (confidence >= thresholds.high) {
    return "high";
  }
  if (confidence >= thresholds.medium) {
    return "medium";
  }
  return "low";
}

/**
 * Add confidence statement to response
 */
function addConfidenceStatement(
  content: string,
  level: "high" | "medium" | "low",
  score: number,
): string {
  const statements = {
    high: `\n\n---\n**Quality Assurance:** This response achieved a high confidence score (${(score * 100).toFixed(0)}%) through multi-model evaluation. The content has been validated for accuracy and completeness.`,
    medium: `\n\n---\n**Quality Note:** This response received a moderate confidence score (${(score * 100).toFixed(0)}%) from the evaluation system. Consider cross-referencing critical details.`,
    low: `\n\n---\n**Advisory:** This response has a lower confidence score (${(score * 100).toFixed(0)}%). Please verify important information independently.`,
  };

  return content + statements[level];
}

/**
 * Add model attribution
 */
function addModelAttribution(
  content: string,
  provider: string,
  model: string,
  judgeScores: JudgeScores | MultiJudgeScores | undefined,
): string {
  const score = Object.values(judgeScores?.scores || {}).reduce(
    (max: number, curr: unknown) => Math.max(max, curr as number),
    0,
  );

  return (
    content +
    `\n\n---\n**Source:** Generated by ${provider}/${model} | Evaluation Score: ${score}/100`
  );
}

/**
 * Add execution metrics
 */
function addExecutionMetrics(content: string, responseTime: number): string {
  return (
    content +
    `\n\n---\n**Performance:** Response generated in ${responseTime}ms`
  );
}
