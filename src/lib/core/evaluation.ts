/**
 * NeuroLink Unified Evaluation System
 *
 * Combines Universal Evaluation with Lighthouse-Enhanced capabilities
 * - Domain-aware evaluation with sophisticated context handling
 * - Multi-provider support with fallback strategies
 * - Structured output with Zod schema validation
 * - Tool usage and conversation history analysis
 * - Enterprise-grade reliability and performance
 */

import { logger } from "../utils/logger.js";
import { AIProviderFactory } from "./factory.js";
import type { EvaluationData } from "./types.js";
import { z } from "zod";

// Enhanced evaluation result interface
export interface UnifiedEvaluationResult extends EvaluationData {
  // Domain-specific insights (Lighthouse-enhanced)
  domainAlignment?: number; // How well response aligns with domain (0-10)
  terminologyAccuracy?: number; // Accuracy of domain terminology (0-10)
  toolEffectiveness?: number; // How well tools were used (0-10)

  // Context analysis
  contextUtilization?: {
    conversationUsed: boolean;
    toolsUsed: boolean;
    domainKnowledgeUsed: boolean;
  };

  // Enhanced metadata
  evaluationContext?: {
    domain: string;
    toolsEvaluated: string[];
    conversationTurns: number;
  };
}

// Enhanced evaluation context
export interface UnifiedEvaluationContext {
  // Core context
  userQuery: string;
  aiResponse: string;

  // Basic context (backward compatibility)
  context?: Record<string, any>;

  // Domain awareness (Lighthouse pattern)
  primaryDomain?: string; // e.g., "AI development platform", "E-commerce analytics"
  assistantRole?: string; // e.g., "AI SDK developer assistant", "Data analyst"

  // Tool usage context (Lighthouse pattern)
  toolsUsed?: string[]; // MCP tools used in generating response
  toolContext?: string; // Description of tool usage

  // Conversation context (Lighthouse pattern)
  conversationHistory?: Array<{
    // Recent conversation turns
    role: "user" | "assistant";
    content: string;
    timestamp?: string;
  }>;

  // Enhanced metadata
  sessionId?: string;
  userId?: string;
  requestId?: string;

  // Evaluation mode
  mode?: "simple" | "enhanced" | "lighthouse";
}

/**
 * Unified Evaluation Schema (Lighthouse-compatible with extensions)
 */
export const unifiedEvaluationSchema = z.object({
  // Core evaluation scores
  relevance: z
    .number()
    .min(0)
    .max(10)
    .describe(
      "Score (0-10) for how well the response addresses query intent and aligns with domain/role. 10 is most relevant.",
    ),
  accuracy: z
    .number()
    .min(0)
    .max(10)
    .describe(
      "Score (0-10) for factual correctness against data, tool outputs, and domain knowledge. 10 is most accurate.",
    ),
  completeness: z
    .number()
    .min(0)
    .max(10)
    .describe(
      "Score (0-10) for how completely the response addresses the query. 10 is most complete.",
    ),

  // Enhanced domain scores (optional)
  domainAlignment: z
    .number()
    .min(0)
    .max(10)
    .optional()
    .describe(
      "Score (0-10) for how well response aligns with specified domain expertise.",
    ),
  terminologyAccuracy: z
    .number()
    .min(0)
    .max(10)
    .optional()
    .describe("Score (0-10) for correct usage of domain-specific terminology."),
  toolEffectiveness: z
    .number()
    .min(0)
    .max(10)
    .optional()
    .describe(
      "Score (0-10) for how effectively available tools/MCPs were utilized.",
    ),

  // Qualitative assessment
  isOffTopic: z
    .boolean()
    .describe("True if the response significantly deviates from query/domain."),
  reasoning: z
    .string()
    .describe(
      "Brief justification for scores, especially if low or off-topic. Max 150 words.",
    ),
  suggestedImprovements: z
    .string()
    .optional()
    .describe(
      "Optional: Suggestions for improving the original response. Max 100 words.",
    ),
  alertSeverity: z
    .enum(["low", "medium", "high", "none"])
    .describe(
      "Suggested alert severity considering all scores and domain context.",
    ),
});

/**
 * Main unified evaluation function
 */
export async function performUnifiedEvaluation(
  context: UnifiedEvaluationContext,
): Promise<UnifiedEvaluationResult> {
  const functionTag = "performUnifiedEvaluation";
  const startTime = Date.now();

  // Determine evaluation mode
  const mode = context.mode || detectEvaluationMode(context);

  logger.debug(`[${functionTag}] Starting unified evaluation`, {
    mode,
    domain: context.primaryDomain,
    toolsUsed: context.toolsUsed?.length || 0,
    conversationTurns: context.conversationHistory?.length || 0,
    queryLength: context.userQuery.length,
    responseLength: context.aiResponse.length,
  });

  const { parseEvaluationConfig } = await import("./evaluation-config.js");
  const config = parseEvaluationConfig();

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= config.retryAttempts; attempt++) {
    try {
      // Get evaluation model
      const evaluationModelResult = await getEvaluationModel();

      if (!evaluationModelResult) {
        logger.debug(
          `[${functionTag}] No evaluation model available, returning defaults`,
        );
        return getDefaultUnifiedEvaluation(
          "unavailable",
          Date.now() - startTime,
          context,
        );
      }

      const { provider: evaluationModel, config: modelConfig } =
        evaluationModelResult;

      // Create evaluation prompt based on mode
      const evaluationPrompt = createUnifiedEvaluationPrompt(context, mode);

      logger.debug(`[${functionTag}] Using ${mode} evaluation mode`, {
        provider: modelConfig.providerName,
        model: modelConfig.modelName,
        attempt: attempt + 1,
      });

      // Try structured evaluation first (preferred)
      try {
        const structuredResult = await evaluationModel.generateObject({
          schema: unifiedEvaluationSchema,
          prompt: evaluationPrompt,
          temperature: 0.1,
          maxTokens: 1000,
          system: createUnifiedSystemPrompt(mode),
        });

        return processStructuredEvaluationResult(
          structuredResult.object,
          modelConfig,
          Date.now() - startTime,
          context,
          attempt + 1,
        );
      } catch (structuredError) {
        logger.warn(
          `[${functionTag}] Structured evaluation failed, using fallback`,
          { structuredError },
        );

        // Fallback to legacy generate
        const result = await evaluationModel.generate({
          prompt: evaluationPrompt + "\n\nRespond with valid JSON only.",
          temperature: 0.1,
          maxTokens: 1000,
          systemPrompt: createUnifiedSystemPrompt(mode),
        });

        const responseText = result?.text || result?.content;
        if (!responseText) {
          throw new Error("No evaluation text received from fallback");
        }

        return parseUnifiedEvaluationResult(
          responseText,
          modelConfig,
          Date.now() - startTime,
          context,
          attempt + 1,
        );
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      logger.warn(
        `[${functionTag}] Evaluation attempt ${attempt + 1} failed:`,
        lastError.message,
      );

      if (attempt === config.retryAttempts) {
        break;
      }

      // Exponential backoff
      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, attempt) * 1000),
      );
    }
  }

  // All attempts failed
  logger.error(
    `[${functionTag}] All evaluation attempts failed:`,
    lastError?.message,
  );
  return getDefaultUnifiedEvaluation(
    lastError?.message || "unknown-error",
    Date.now() - startTime,
    context,
  );
}

/**
 * Detect appropriate evaluation mode based on context
 */
function detectEvaluationMode(
  context: UnifiedEvaluationContext,
): "simple" | "enhanced" | "lighthouse" {
  // Lighthouse mode: Has domain awareness, tool context, or conversation history
  if (
    context.primaryDomain ||
    context.toolsUsed?.length ||
    context.conversationHistory?.length
  ) {
    return "lighthouse";
  }

  // Enhanced mode: Has rich context
  if (context.context && Object.keys(context.context).length > 0) {
    return "enhanced";
  }

  // Simple mode: Basic evaluation
  return "simple";
}

/**
 * Create unified evaluation prompt based on mode
 */
function createUnifiedEvaluationPrompt(
  context: UnifiedEvaluationContext,
  mode: "simple" | "enhanced" | "lighthouse",
): string {
  switch (mode) {
    case "lighthouse":
      return createLighthouseEvaluationPrompt(context);
    case "enhanced":
      return createEnhancedEvaluationPrompt(context);
    case "simple":
    default:
      return createSimpleEvaluationPrompt(context);
  }
}

/**
 * Create Lighthouse-style domain-aware evaluation prompt
 */
function createLighthouseEvaluationPrompt(
  context: UnifiedEvaluationContext,
): string {
  const {
    userQuery,
    aiResponse,
    primaryDomain = "general AI assistant",
    assistantRole = "AI assistant",
    toolContext = "No specific tools used in this interaction",
    conversationHistory = [],
  } = context;

  const formattedHistory = formatConversationHistory(conversationHistory);

  return `You are an AI Response Evaluator with advanced domain awareness.

**EVALUATION CONTEXT**:

1. **Primary Assistant Domain**: "${primaryDomain}"
   - This defines the AI assistant's core expertise area
   - Responses should demonstrate competency within this domain
   - Domain-specific terminology should be used accurately

2. **Assistant Role**: "${assistantRole}"
   - This defines the specific role the assistant should fulfill
   - Responses should align with this role's responsibilities

3. **Tool Usage Context**: "${toolContext}"
   - Tools/MCPs are capabilities the assistant used to generate the response
   - Evaluate how effectively these tools were utilized
   - Consider if additional tools should have been used

4. **Conversation History**:
\`\`\`
${formattedHistory}
\`\`\`

**CRITICAL DOMAIN FAILURE ASSESSMENT**:
Pay special attention to domain alignment. If the query is within the assistant's domain and sufficient context is available:
- Inability to answer ("I can't help", generic errors, evasions) = HIGH ALERT
- Incorrect domain-specific information = HIGH ALERT  
- Misuse of domain terminology = MEDIUM-HIGH ALERT

**EVALUATION CRITERIA**:
- **relevanceScore** (0-10): Direct query addressing + domain alignment
- **accuracyScore** (0-10): Factual correctness + terminology accuracy
- **completenessScore** (0-10): Full query addressing + appropriate depth
- **domainAlignment** (0-10): How well response fits the domain expertise
- **terminologyAccuracy** (0-10): Correct use of domain-specific terms
- **toolEffectiveness** (0-10): How well available tools were utilized
- **isOffTopic** (boolean): True if significantly deviates from domain/query
- **reasoning** (string): Brief explanation (max 150 words)
- **suggestedImprovements** (string): How to improve (max 100 words)
- **alertSeverity** ('low'|'medium'|'high'|'none'): Based on domain failure assessment

**Current User Query**:
"${userQuery}"

**AI Assistant Response**:
"${aiResponse}"

Provide your assessment in the specified format.`;
}

/**
 * Create enhanced evaluation prompt
 */
function createEnhancedEvaluationPrompt(
  context: UnifiedEvaluationContext,
): string {
  const { userQuery, aiResponse, context: additionalContext } = context;
  const contextInfo = additionalContext
    ? `\nContext: ${JSON.stringify(additionalContext, null, 2)}`
    : "";

  return `Evaluate this AI response with enhanced criteria:

Query: "${userQuery}"
Response: "${aiResponse}"${contextInfo}

Provide scores for:
- relevanceScore (0-10): How well the response addresses the query
- accuracyScore (0-10): Factual correctness and reliability
- completenessScore (0-10): Whether the response fully answers the question
- isOffTopic (boolean): Whether response deviates from query
- reasoning (string): Brief explanation of scores
- alertSeverity ('low'|'medium'|'high'|'none'): Overall quality assessment

Respond in the specified format.`;
}

/**
 * Create simple evaluation prompt
 */
function createSimpleEvaluationPrompt(
  context: UnifiedEvaluationContext,
): string {
  const { userQuery, aiResponse } = context;

  return `Rate this AI response:

Q: "${userQuery}"
A: "${aiResponse}"

Provide:
- relevanceScore (0-10)
- accuracyScore (0-10)
- completenessScore (0-10)
- reasoning (brief explanation)

Respond in the specified format.`;
}

/**
 * Create unified system prompt based on mode
 */
function createUnifiedSystemPrompt(
  mode: "simple" | "enhanced" | "lighthouse",
): string {
  const basePrompt =
    "You are an expert AI Response Evaluator. Respond with valid structured output only.";

  switch (mode) {
    case "lighthouse":
      return `${basePrompt} Use advanced domain awareness and sophisticated context analysis for comprehensive evaluation.`;
    case "enhanced":
      return `${basePrompt} Consider all provided context and metadata for thorough evaluation.`;
    case "simple":
    default:
      return `${basePrompt} Focus on core quality metrics: relevance, accuracy, and completeness.`;
  }
}

/**
 * Process structured evaluation result
 */
function processStructuredEvaluationResult(
  result: any,
  modelConfig: any,
  evaluationTime: number,
  context: UnifiedEvaluationContext,
  attempt: number,
): UnifiedEvaluationResult {
  // Calculate overall score
  const coreScores = [
    result.relevanceScore || 0,
    result.accuracyScore || 0,
    result.completenessScore || 0,
  ];

  const enhancedScores = [
    result.domainAlignment,
    result.terminologyAccuracy,
    result.toolEffectiveness,
  ].filter((score) => typeof score === "number" && score > 0);

  const allScores = [...coreScores, ...enhancedScores];
  const overall = Math.round(
    allScores.reduce((sum, score) => sum + score, 0) / allScores.length,
  );

  return {
    // Core scores
    relevance: Math.max(
      0,
      Math.min(10, Math.round(result.relevanceScore || 0)),
    ),
    accuracy: Math.max(0, Math.min(10, Math.round(result.accuracyScore || 0))),
    completeness: Math.max(
      0,
      Math.min(10, Math.round(result.completenessScore || 0)),
    ),
    overall: Math.max(0, Math.min(10, overall)),

    // Enhanced insights
    isOffTopic: result.isOffTopic || false,
    alertSeverity: result.alertSeverity || "none",
    reasoning: result.reasoning || "Evaluation completed successfully.",
    suggestedImprovements: result.suggestedImprovements,

    // Domain-specific scores (if available)
    domainAlignment: result.domainAlignment
      ? Math.max(0, Math.min(10, Math.round(result.domainAlignment)))
      : undefined,
    terminologyAccuracy: result.terminologyAccuracy
      ? Math.max(0, Math.min(10, Math.round(result.terminologyAccuracy)))
      : undefined,
    toolEffectiveness: result.toolEffectiveness
      ? Math.max(0, Math.min(10, Math.round(result.toolEffectiveness)))
      : undefined,

    // Context analysis
    contextUtilization: {
      conversationUsed: (context.conversationHistory?.length || 0) > 0,
      toolsUsed: (context.toolsUsed?.length || 0) > 0,
      domainKnowledgeUsed: !!context.primaryDomain,
    },

    // Enhanced metadata
    evaluationContext: {
      domain: context.primaryDomain || "general",
      toolsEvaluated: context.toolsUsed || [],
      conversationTurns: context.conversationHistory?.length || 0,
    },

    // Standard metadata
    evaluationModel: `${modelConfig.providerName}/${modelConfig.modelName}`,
    evaluationTime,
    evaluationProvider: modelConfig.providerName,
    evaluationAttempt: attempt,
    evaluationConfig: {
      mode: context.mode || "auto",
      fallbackUsed: attempt > 1,
      costEstimate: 0,
    },
  };
}

/**
 * Parse evaluation result from text response
 */
function parseUnifiedEvaluationResult(
  evaluationText: string,
  modelConfig: any,
  evaluationTime: number,
  context: UnifiedEvaluationContext,
  attempt: number,
): UnifiedEvaluationResult {
  try {
    // Clean and parse JSON
    const cleanText = evaluationText.trim().replace(/```json\s*|```\s*/g, "");
    const jsonMatch = cleanText.match(/\{[^]*?\}/s);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return processStructuredEvaluationResult(
        parsed,
        modelConfig,
        evaluationTime,
        context,
        attempt,
      );
    }

    // Fallback to regex parsing with improved patterns
    const relevanceMatch = evaluationText.match(
      /(?:relevance[Score"\s]*:?["\s]*(\d+)|Relevance["\s]*:?["\s]*(\d+)|relevance.*?(\d+))/i,
    );
    const accuracyMatch = evaluationText.match(
      /(?:accuracy[Score"\s]*:?["\s]*(\d+)|Accuracy["\s]*:?["\s]*(\d+)|accuracy.*?(\d+))/i,
    );
    const completenessMatch = evaluationText.match(
      /(?:completeness[Score"\s]*:?["\s]*(\d+)|Completeness["\s]*:?["\s]*(\d+)|completeness.*?(\d+))/i,
    );

    // Extract scores with fallback to default values
    const relevance = relevanceMatch
      ? parseInt(
          relevanceMatch[1] || relevanceMatch[2] || relevanceMatch[3],
          10,
        )
      : 8; // Default fallback score
    const accuracy = accuracyMatch
      ? parseInt(accuracyMatch[1] || accuracyMatch[2] || accuracyMatch[3], 10)
      : 8; // Default fallback score
    const completeness = completenessMatch
      ? parseInt(
          completenessMatch[1] || completenessMatch[2] || completenessMatch[3],
          10,
        )
      : 8; // Default fallback score

    return {
      relevance: Math.max(0, Math.min(10, relevance)),
      accuracy: Math.max(0, Math.min(10, accuracy)),
      completeness: Math.max(0, Math.min(10, completeness)),
      overall: Math.round((relevance + accuracy + completeness) / 3),
      isOffTopic: false,
      alertSeverity: "none",
      reasoning:
        "Parsed using regex fallback - response was not in expected JSON format.",
      evaluationModel: `${modelConfig.providerName}/${modelConfig.modelName}`,
      evaluationTime,
      evaluationProvider: modelConfig.providerName,
      evaluationAttempt: attempt,
      evaluationConfig: {
        mode: "fallback",
        fallbackUsed: true,
        costEstimate: 0,
      },
    };
  } catch (error) {
    logger.error("Failed to parse unified evaluation result", { error });
    return getDefaultUnifiedEvaluation("parse-error", evaluationTime, context);
  }
}

/**
 * Get default evaluation when evaluation fails
 */
function getDefaultUnifiedEvaluation(
  reason: string,
  evaluationTime: number,
  context: UnifiedEvaluationContext,
): UnifiedEvaluationResult {
  return {
    relevance: 0,
    accuracy: 0,
    completeness: 0,
    overall: 0,
    isOffTopic: false,
    alertSeverity: "high",
    reasoning: `Evaluation unavailable (${reason}). This may be due to missing API keys, network issues, or service unavailability.`,
    suggestedImprovements:
      "Check evaluation system configuration, API credentials, and network connectivity.",
    evaluationModel: "unavailable",
    evaluationTime,
    evaluationProvider: "none",
    evaluationAttempt: 0,
    evaluationConfig: {
      mode: "default",
      fallbackUsed: true,
      costEstimate: 0,
    },
    contextUtilization: {
      conversationUsed: (context.conversationHistory?.length || 0) > 0,
      toolsUsed: (context.toolsUsed?.length || 0) > 0,
      domainKnowledgeUsed: !!context.primaryDomain,
    },
    evaluationContext: {
      domain: context.primaryDomain || "unknown",
      toolsEvaluated: context.toolsUsed || [],
      conversationTurns: context.conversationHistory?.length || 0,
    },
  };
}

/**
 * Enhanced evaluation model selection
 */
export async function getEvaluationModel(): Promise<{
  provider: any;
  config: any;
} | null> {
  const { parseEvaluationConfig, getProviderFallbackOrder } = await import(
    "./evaluation-config.js"
  );
  const { getProviderConfig } = await import("./evaluation-providers.js");

  const config = parseEvaluationConfig();
  const fallbackOrder = getProviderFallbackOrder(config);

  for (const providerName of fallbackOrder) {
    try {
      const providerConfig = getProviderConfig(providerName);
      if (!providerConfig) {
        continue;
      }

      let modelName = config.model;
      if (modelName === "auto" || !config.model) {
        modelName =
          providerConfig.models[config.mode] || providerConfig.models.fast;
      }

      const provider = await AIProviderFactory.createProvider(
        providerName,
        modelName,
      );

      if (provider) {
        return {
          provider,
          config: {
            providerName,
            modelName,
            providerConfig,
            evaluationConfig: config,
          },
        };
      }
    } catch (error) {
      if (!config.fallbackEnabled) {
        throw error;
      }
      continue;
    }
  }

  return null;
}

/**
 * Format conversation history for evaluation
 */
function formatConversationHistory(
  history: Array<{ role: string; content: string }>,
): string {
  if (!history?.length) {
    return "No prior conversation context.";
  }

  return history
    .slice(-3) // Last 3 turns
    .map(
      (msg, i) =>
        `${i + 1}. ${msg.role.toUpperCase()}: ${msg.content.substring(0, 200)}${msg.content.length > 200 ? "..." : ""}`,
    )
    .join("\n");
}

/**
 * Create simple evaluation context (backward compatibility)
 */
export function createSimpleEvaluationContext(
  prompt: string,
  response: string,
  context?: Record<string, any>,
): UnifiedEvaluationContext {
  return {
    userQuery: prompt,
    aiResponse: response,
    context,
    mode: "simple",
  };
}

/**
 * Create enhanced evaluation context
 */
export function createEnhancedEvaluationContext(
  userQuery: string,
  aiResponse: string,
  options: {
    domain?: string;
    role?: string;
    toolsUsed?: string[];
    conversationHistory?: Array<{
      role: "user" | "assistant";
      content: string;
    }>;
    sessionId?: string;
    context?: Record<string, any>;
  } = {},
): UnifiedEvaluationContext {
  return {
    userQuery,
    aiResponse,
    primaryDomain: options.domain,
    assistantRole: options.role,
    toolsUsed: options.toolsUsed,
    toolContext: options.toolsUsed?.length
      ? `Tools used: ${options.toolsUsed.join(", ")}`
      : undefined,
    conversationHistory: options.conversationHistory,
    sessionId: options.sessionId,
    context: options.context,
    mode: "lighthouse",
  };
}

// Legacy compatibility wrapper for old function signature
export async function evaluateResponse(
  prompt: string,
  response: string,
  context?: Record<string, any>,
  evaluationDomain?: string,
  toolUsageContext?: string,
  conversationHistory?: Array<{
    role: string;
    content: string;
    timestamp?: string;
  }>,
): Promise<UnifiedEvaluationResult> {
  // Convert old arguments to new context format
  const unifiedContext: UnifiedEvaluationContext = {
    userQuery: prompt,
    aiResponse: response,
    context,
    primaryDomain: evaluationDomain,
    toolContext: toolUsageContext,
    conversationHistory: conversationHistory as Array<{
      role: "user" | "assistant";
      content: string;
      timestamp?: string;
    }>,
    mode: evaluationDomain ? "lighthouse" : "simple",
  };

  return performUnifiedEvaluation(unifiedContext);
}

// Legacy compatibility exports
export type EvaluationResult = UnifiedEvaluationResult;
