/**
 * Evaluation provider type definitions for NeuroLink
 * Provider performance tracking, evaluation configurations, and provider optimization types
 */

/**
 * Evaluation provider type as specified in core module refactoring
 */
export type EvaluationProvider =
  | "openai"
  | "anthropic"
  | "vertex"
  | "google-ai"
  | "local";

/**
 * Evaluation modes
 */
export type EvaluationMode = "basic" | "detailed" | "domain-aware" | "disabled";

/**
 * Alert severity levels
 */
export type AlertSeverity = "low" | "medium" | "high" | "none";

/**
 * Response quality evaluation scores - Comprehensive evaluation type
 */
export type EvaluationData = {
  // Core scores (1-10 scale) - Compatible with GenerateResult format
  relevance: number; // How well response addresses query intent and domain alignment
  accuracy: number; // Factual correctness and terminological accuracy
  completeness: number; // How completely the response addresses the query
  overall: number; // Overall quality (derived from above scores)
  domainAlignment?: number;
  terminologyAccuracy?: number;
  toolEffectiveness?: number;

  // Advanced insights
  isOffTopic: boolean; // True if response significantly deviates from query/domain
  alertSeverity: AlertSeverity; // Quality alert level
  reasoning: string; // Brief justification for scores (max 150 words)
  suggestedImprovements?: string; // How to improve the response (max 100 words)

  // Metadata
  evaluationModel: string; // Model used for evaluation
  evaluationTime: number; // Time taken for evaluation (ms)
  evaluationDomain?: string; // Domain for evaluation (e.g., "healthcare", "analytics")

  // Enhanced metadata
  evaluationProvider?: string; // Provider used for evaluation
  evaluationAttempt?: number; // Attempt number (for retry logic)
  evaluationConfig?: {
    mode: string;
    fallbackUsed: boolean;
    costEstimate: number;
  };

  // Domain configuration support
  domainConfig?: {
    domainName: string;
    domainDescription: string;
    keyTerms: string[];
    failurePatterns: string[];
    successPatterns: string[];
    evaluationCriteria?: Record<string, unknown>;
  };

  // Domain-specific evaluation metadata
  domainEvaluation?: {
    domainRelevance: number;
    terminologyAccuracy: number;
    domainExpertise: number;
    domainSpecificInsights: string[];
  };
};

/**
 * Enhanced evaluation context for comprehensive response assessment
 */
export type EvaluationContext = {
  userQuery: string;
  aiResponse: string;
  context?: Record<string, unknown>;
  primaryDomain?: string;
  assistantRole?: string;
  conversationHistory?: Array<{
    role: "user" | "assistant";
    content: string;
    timestamp?: string;
  }>;
  toolUsage?: Array<{
    toolName: string;
    input: unknown;
    output: unknown;
    executionTime: number;
  }>;
  expectedOutcome?: string;
  evaluationCriteria?: string[];
};

/**
 * Evaluation result type
 * Extends EvaluationData with additional fields
 */
export type EnhancedEvaluationResult = EvaluationData & {
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
  alertSeverity: AlertSeverity;
  reasoning: string;
};

/**
 * Evaluation request type as specified in core module refactoring
 */
export type EvaluationRequest = {
  content: string;
  context?: string;
  domain?: string;
  criteria: EvaluationCriteria;
};

/**
 * Evaluation criteria type as specified in core module refactoring
 */
export type EvaluationCriteria = {
  relevance: boolean;
  accuracy: boolean;
  completeness: boolean;
  domainSpecific?: boolean;
};
