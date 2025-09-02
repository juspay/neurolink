/**
 * NeuroLink Evaluation System
 */

import { logger } from "../utils/logger.js";
import { AIProviderFactory } from "./factory.js";
import { z } from "zod";
import { ProviderRegistry } from "../factories/providerRegistry.js";
import { modelConfig } from "./modelConfiguration.js";
import { normalizeEvaluationData } from "../utils/evaluationUtils.js";
import type {
  EnhancedEvaluationResult as EvaluationResult,
  EvaluationContext,
} from "../types/index.js";

// Zod schema for validation
const EvaluationSchema = z.object({
  relevance: z.number().min(1).max(10),
  accuracy: z.number().min(1).max(10),
  completeness: z.number().min(1).max(10),
  overall: z.number().min(1).max(10),
  domainAlignment: z.number().min(1).max(10).optional(),
  terminologyAccuracy: z.number().min(1).max(10).optional(),
  toolEffectiveness: z.number().min(1).max(10).optional(),
});

/**
 * Get default evaluation when evaluation fails
 */
function getDefaultEvaluation(
  reason: string,
  evaluationTime: number,
  context: EvaluationContext,
): EvaluationResult {
  const functionTag = "getDefaultEvaluation";

  logger.debug(`[${functionTag}] Creating default evaluation`, {
    reason,
    evaluationTime,
    hasContext: !!context,
  });

  return {
    relevance: 1,
    accuracy: 1,
    completeness: 1,
    overall: 1,
    domainAlignment: 1,
    terminologyAccuracy: 1,
    toolEffectiveness: 1,
    isOffTopic: false,
    alertSeverity: "low",
    reasoning: `Default evaluation used due to: ${reason}`,
    contextUtilization: {
      conversationUsed: false,
      toolsUsed: false,
      domainKnowledgeUsed: false,
    },
    evaluationContext: {
      domain: context.primaryDomain || "general",
      toolsEvaluated: [],
      conversationTurns: 0,
    },
    evaluationModel: "default",
    evaluationTime,
    evaluationProvider: "default",
    evaluationAttempt: 1,
    evaluationConfig: {
      mode: "fallback",
      fallbackUsed: true,
      costEstimate: 0,
    },
  };
}

/**
 * Parse unified evaluation result from text response
 */
function parseEvaluationResult(
  response: string,
  context: EvaluationContext,
): Partial<EvaluationResult> {
  const functionTag = "parseEvaluationResult";

  try {
    logger.debug(`[${functionTag}] Parsing evaluation response`, {
      responseLength: response.length,
      domain: context.primaryDomain,
      hasToolUsage: !!context.toolUsage?.length,
      hasConversationHistory: !!context.conversationHistory?.length,
    });

    // Try JSON parsing first
    const jsonMatch = response.match(/\{[^}]*\}/s);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed;
      } catch (jsonError) {
        logger.debug(`[${functionTag}] JSON parsing failed, trying regex`, {
          error:
            jsonError instanceof Error ? jsonError.message : String(jsonError),
          jsonContent: jsonMatch[0].substring(0, 100), // First 100 chars for debugging
        });
      }
    }

    // Fallback to regex parsing
    const result: Partial<EvaluationResult> = {};

    const patterns = {
      relevance: /relevance[:\s]*([0-9]+(?:\.[0-9]+)?)/i,
      accuracy: /accuracy[:\s]*([0-9]+(?:\.[0-9]+)?)/i,
      completeness: /completeness[:\s]*([0-9]+(?:\.[0-9]+)?)/i,
      overall: /overall[:\s]*([0-9]+(?:\.[0-9]+)?)/i,
      reasoning: /reasoning[:\s]*(.+?)(?=\n\s*\w+:|\n\s*$|$)/is,
    };

    for (const [key, pattern] of Object.entries(patterns)) {
      const match = response.match(pattern);
      if (match) {
        if (key === "reasoning") {
          // Extract reasoning text
          result.reasoning = match[1].trim();
        } else {
          // Extract numerical scores
          const value = parseFloat(match[1]);
          if (value >= 1 && value <= 10) {
            const roundedValue = Math.round(value);
            if (key === "relevance") {
              result.relevance = roundedValue;
            } else if (key === "accuracy") {
              result.accuracy = roundedValue;
            } else if (key === "completeness") {
              result.completeness = roundedValue;
            } else if (key === "overall") {
              result.overall = roundedValue;
            }
          }
        }
      }
    }

    // Ensure minimum valid scores and validate with schema
    // Use context to enhance evaluation data
    const evaluationData = {
      relevance: result.relevance || 1,
      accuracy: result.accuracy || 1,
      completeness: result.completeness || 1,
      overall: result.overall || 1,
      domainAlignment:
        result.domainAlignment || (context.primaryDomain ? 5 : undefined), // Default to 5 if domain-specific
      terminologyAccuracy:
        result.terminologyAccuracy || (context.primaryDomain ? 5 : undefined),
      toolEffectiveness:
        result.toolEffectiveness || (context.toolUsage?.length ? 5 : undefined), // Default to 5 if tools were used
    };

    // Validate against schema
    try {
      const validated = EvaluationSchema.parse(evaluationData);
      // Enhance reasoning with context information
      let enhancedReasoning =
        result.reasoning || "No detailed reasoning provided";
      if (context.primaryDomain) {
        enhancedReasoning += ` (Domain: ${context.primaryDomain})`;
      }
      if (context.toolUsage?.length) {
        enhancedReasoning += ` (Tools used: ${context.toolUsage.map((t) => t.toolName).join(", ")})`;
      }
      if (context.conversationHistory?.length) {
        enhancedReasoning += ` (Conversation turns: ${context.conversationHistory.length})`;
      }

      return {
        ...validated,
        reasoning: enhancedReasoning,
      };
    } catch (validationError) {
      logger.warn(`[${functionTag}] Schema validation failed, using fallback`, {
        validationError,
        originalData: evaluationData,
      });
      return {
        relevance: Math.max(1, Math.min(10, result.relevance || 1)),
        accuracy: Math.max(1, Math.min(10, result.accuracy || 1)),
        completeness: Math.max(1, Math.min(10, result.completeness || 1)),
        overall: Math.max(1, Math.min(10, result.overall || 1)),
        reasoning: result.reasoning || "No detailed reasoning provided",
      };
    }
  } catch (error) {
    logger.error(`[${functionTag}] Failed to parse evaluation result`, {
      error,
    });
    return {
      relevance: 1,
      accuracy: 1,
      completeness: 1,
      overall: 1,
      reasoning: "Error occurred during evaluation parsing",
    };
  }
}

/**
 * Main unified evaluation function
 */
export async function generateEvaluation(
  context: EvaluationContext,
): Promise<EvaluationResult> {
  const functionTag = "generateEvaluation";
  const startTime = Date.now();

  logger.debug(`[${functionTag}] Starting evaluation`, {
    hasUserQuery: !!context.userQuery,
    hasAiResponse: !!context.aiResponse,
    domain: context.primaryDomain,
  });

  try {
    // Ensure providers are registered
    await ProviderRegistry.registerAllProviders();

    // Get evaluation provider
    const evaluationProvider =
      process.env.NEUROLINK_EVALUATION_PROVIDER || "google-ai";
    // Use configurable model selection instead of hardcoded default
    const evaluationModel =
      process.env.NEUROLINK_EVALUATION_MODEL ||
      modelConfig.getModelForTier(evaluationProvider, "fast") ||
      "gemini-2.5-flash"; // Ultimate fallback

    logger.debug(
      `[${functionTag}] Using provider: ${evaluationProvider}, model: ${evaluationModel}`,
    );

    const provider = await AIProviderFactory.createProvider(
      evaluationProvider,
      evaluationModel,
    );

    if (!provider) {
      logger.debug(
        `[${functionTag}] No evaluation provider available, returning defaults`,
      );
      return getDefaultEvaluation(
        "no-provider",
        Date.now() - startTime,
        context,
      );
    }

    // Create evaluation prompt
    const prompt = `
Evaluate this AI response on a scale of 1-10 for each criterion:

User Query: ${context.userQuery}
AI Response: ${context.aiResponse}

Rate on these criteria (1-10 scale):
- Relevance: How well does the response address the user's question?
- Accuracy: How factually correct and precise is the information?
- Completeness: How thoroughly does it cover the topic?
- Overall: General quality assessment

Respond in this exact format:
Relevance: [score]
Accuracy: [score]
Completeness: [score]
Overall: [score]
Reasoning: [Provide a detailed explanation of your evaluation, explaining why you gave these scores. Include specific observations about the response's strengths and all possible areas for improvement.]
`;

    // Generate evaluation
    const result = await provider.generate(prompt);

    if (!result) {
      logger.debug(`[${functionTag}] No response from provider`);
      return getDefaultEvaluation(
        "no-response",
        Date.now() - startTime,
        context,
      );
    }

    // Extract text from result
    const response =
      typeof result === "string" ? result : result?.content || String(result);

    // Parse evaluation result
    const parsed = parseEvaluationResult(response, context);

    // Validate and enhance result using schema
    const baseResult = {
      relevance: parsed.relevance || 1,
      accuracy: parsed.accuracy || 1,
      completeness: parsed.completeness || 1,
      overall: parsed.overall || 1,
      domainAlignment: parsed.domainAlignment,
      terminologyAccuracy: parsed.terminologyAccuracy,
      toolEffectiveness: parsed.toolEffectiveness,
    };

    // Validate against schema before finalizing
    try {
      const validatedScores = EvaluationSchema.parse(baseResult);
      const validatedResult = normalizeEvaluationData({
        ...parsed,
        ...validatedScores,
        evaluationModel: `${evaluationProvider}/${evaluationModel}`,
        evaluationTime: Date.now() - startTime,
        evaluationProvider,
        evaluationAttempt: 1,
        evaluationConfig: {
          mode: "standard",
          fallbackUsed: false,
          costEstimate: 0.001, // Rough estimate
        },
      });

      logger.debug(`[${functionTag}] Schema validation passed`, {
        validatedScores,
      });

      return validatedResult as EvaluationResult;
    } catch (validationError) {
      logger.warn(
        `[${functionTag}] Schema validation failed in main evaluation`,
        {
          validationError,
          baseResult,
        },
      );

      // Fallback with clamped values using normalizer
      const validatedResult = normalizeEvaluationData({
        ...parsed,
        relevance: parsed.relevance || 1,
        accuracy: parsed.accuracy || 1,
        completeness: parsed.completeness || 1,
        overall: parsed.overall || 1,
        evaluationModel: `${evaluationProvider}/${evaluationModel}`,
        evaluationTime: Date.now() - startTime,
        evaluationProvider,
        evaluationAttempt: 1,
        evaluationConfig: {
          mode: "standard",
          fallbackUsed: false,
          costEstimate: 0.001, // Rough estimate
        },
      });

      return validatedResult as EvaluationResult;
    }
  } catch (error) {
    logger.error(`[${functionTag}] Evaluation failed`, {
      error: error instanceof Error ? error.message : String(error),
    });

    return getDefaultEvaluation(
      error instanceof Error ? error.message : "unknown-error",
      Date.now() - startTime,
      context,
    );
  }
}

// Simplified evaluation function
export async function evaluateResponse(
  context: EvaluationContext,
): Promise<EvaluationResult> {
  return generateEvaluation(context);
}

// Export additional utilities
export { getDefaultEvaluation, parseEvaluationResult };
