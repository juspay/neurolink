/**
 * NeuroLink Unified Evaluation System
 */

import { logger } from "../utils/logger.js";
import { AIProviderFactory } from "./factory.js";
import type { EvaluationData } from "./types.js";
import { z } from "zod";
import { ProviderRegistry } from "../factories/provider-registry.js";

// Enhanced evaluation result interface
export interface UnifiedEvaluationResult extends EvaluationData {
  domainAlignment?: number;
  terminologyAccuracy?: number;
  toolEffectiveness?: number;
  contextUtilization?: {
    conversationUsed: boolean;
    toolsUsed: boolean;
    domainKnowledgeUsed: boolean;
  };
  evaluationContext?: {
    domain: string;
    toolsEvaluated: string[];
    conversationTurns: number;
  };
  // Required for legacy compatibility
  isOffTopic: boolean;
  alertSeverity: "low" | "medium" | "high" | "none";
  reasoning: string;
}

// Enhanced evaluation context
export interface UnifiedEvaluationContext {
  userQuery: string;
  aiResponse: string;
  context?: Record<string, any>;
  primaryDomain?: string;
  assistantRole?: string;
  conversationHistory?: Array<{
    role: "user" | "assistant";
    content: string;
    timestamp?: string;
  }>;
  toolUsage?: Array<{
    toolName: string;
    input: any;
    output: any;
    executionTime: number;
  }>;
  expectedOutcome?: string;
  evaluationCriteria?: string[];
}

// Zod schema for validation
const UnifiedEvaluationSchema = z.object({
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
function getDefaultUnifiedEvaluation(
  reason: string,
  evaluationTime: number,
  context: UnifiedEvaluationContext,
): UnifiedEvaluationResult {
  const functionTag = "getDefaultUnifiedEvaluation";

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
function parseUnifiedEvaluationResult(
  response: string,
  context: UnifiedEvaluationContext,
): Partial<UnifiedEvaluationResult> {
  const functionTag = "parseUnifiedEvaluationResult";

  try {
    logger.debug(`[${functionTag}] Parsing evaluation response`, {
      responseLength: response.length,
    });

    // Try JSON parsing first
    const jsonMatch = response.match(/\{[^}]*\}/s);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed;
      } catch (e) {
        logger.debug(`[${functionTag}] JSON parsing failed, trying regex`);
      }
    }

    // Fallback to regex parsing
    const result: Partial<UnifiedEvaluationResult> = {};

    const patterns = {
      relevance: /relevance[:\s]*([0-9]+(?:\.[0-9]+)?)/i,
      accuracy: /accuracy[:\s]*([0-9]+(?:\.[0-9]+)?)/i,
      completeness: /completeness[:\s]*([0-9]+(?:\.[0-9]+)?)/i,
      overall: /overall[:\s]*([0-9]+(?:\.[0-9]+)?)/i,
    };

    for (const [key, pattern] of Object.entries(patterns)) {
      const match = response.match(pattern);
      if (match) {
        const value = parseFloat(match[1]);
        if (value >= 1 && value <= 10) {
          (result as any)[key] = Math.round(value);
        }
      }
    }

    // Ensure minimum valid scores
    return {
      relevance: result.relevance || 1,
      accuracy: result.accuracy || 1,
      completeness: result.completeness || 1,
      overall: result.overall || 1,
    };
  } catch (error) {
    logger.error(`[${functionTag}] Failed to parse evaluation result`, {
      error,
    });
    return {
      relevance: 1,
      accuracy: 1,
      completeness: 1,
      overall: 1,
    };
  }
}

/**
 * Main unified evaluation function
 */
export async function generateUnifiedEvaluation(
  context: UnifiedEvaluationContext,
): Promise<UnifiedEvaluationResult> {
  const functionTag = "generateUnifiedEvaluation";
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
    const evaluationModel =
      process.env.NEUROLINK_EVALUATION_MODEL || "gemini-2.5-flash";

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
      return getDefaultUnifiedEvaluation(
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
`;

    // Generate evaluation
    const result = await provider.generate(prompt);

    if (!result) {
      logger.debug(`[${functionTag}] No response from provider`);
      return getDefaultUnifiedEvaluation(
        "no-response",
        Date.now() - startTime,
        context,
      );
    }

    // Extract text from result
    const response =
      typeof result === "string"
        ? result
        : (result as any).text || String(result);

    // Parse evaluation result
    const parsed = parseUnifiedEvaluationResult(response, context);

    // Validate and enhance result
    const validatedResult = {
      ...parsed,
      evaluationModel: `${evaluationProvider}/${evaluationModel}`,
      evaluationTime: Date.now() - startTime,
      evaluationProvider,
      evaluationAttempt: 1,
      evaluationConfig: {
        mode: "standard",
        fallbackUsed: false,
        costEstimate: 0.001, // Rough estimate
      },
    };

    logger.debug(`[${functionTag}] Evaluation completed`, {
      relevance: validatedResult.relevance,
      accuracy: validatedResult.accuracy,
      completeness: validatedResult.completeness,
      overall: validatedResult.overall,
      evaluationTime: validatedResult.evaluationTime,
    });

    return validatedResult as UnifiedEvaluationResult;
  } catch (error) {
    logger.error(`[${functionTag}] Evaluation failed`, {
      error: error instanceof Error ? error.message : String(error),
    });

    return getDefaultUnifiedEvaluation(
      error instanceof Error ? error.message : "unknown-error",
      Date.now() - startTime,
      context,
    );
  }
}

// Legacy compatibility function with flexible arguments
export async function evaluateResponse(
  responseOrContext: any,
  contextOrUserQuery?: any,
  userQuery?: any,
  providedContexts?: any,
  options?: any,
  additionalArgs?: any,
): Promise<any> {
  // Handle different call patterns for backward compatibility
  let aiResponse: string;
  let context: any;

  if (typeof responseOrContext === "string") {
    // Normal call: evaluateResponse(response, context, ...)
    aiResponse = responseOrContext;
    context = contextOrUserQuery;
  } else {
    // Provider call pattern: evaluateResponse(contextObject, userQuery, ...)
    context = responseOrContext;
    aiResponse =
      context?.aiResponse ||
      context?.response ||
      String(contextOrUserQuery || "");
  }

  const evalContext: UnifiedEvaluationContext = {
    userQuery:
      userQuery ||
      context?.userQuery ||
      contextOrUserQuery ||
      "Generated response",
    aiResponse,
    context,
  };
  return generateUnifiedEvaluation(evalContext);
}

// Export additional utilities
export { getDefaultUnifiedEvaluation, parseUnifiedEvaluationResult };
