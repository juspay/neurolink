import type { TokenUsage } from "./analytics.js";
import type { GenerateResult } from "./generate.js";
import type { ToolExecution } from "./tools.js";
import type { JsonObject } from "./common.js";
import type {
  AggregatedScores,
  EvaluationTraceContext,
  PipelineConfig,
  ReportConfig,
  ReportFormat,
  ScoreResult,
  ScorerInput,
} from "./scorer.js";
import type { LanguageModelV3CallOptions } from "./middleware.js";

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

  // Raw Response
  responseContent?: string; // Full text of the AI response
  queryContent?: string; // Full text of the user query

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

// =============================================================================
// RAGAS Evaluation Types (merged from evaluationTypes.ts)
// =============================================================================

/**
 * Represents the analysis of the user's query intent.
 * This provides a basic understanding of what the user is trying to achieve.
 */
export type QueryIntentAnalysis = {
  /** The type of query, e.g., asking a question or giving a command. */
  type: "question" | "command" | "greeting" | "unknown";
  /** The estimated complexity of the query. */
  complexity: "low" | "medium" | "high";
  /** Whether the query likely required the use of tools to be answered correctly. */
  shouldHaveUsedTools: boolean;
};

/**
 * Represents a single turn in an enhanced conversation history,
 * including tool executions and evaluations for richer context.
 */
export type EnhancedConversationTurn = {
  /** The role of the speaker, either 'user' or 'assistant'. */
  role: "user" | "assistant";
  /** The content of the message. */
  content: string;
  /** The timestamp of the message. */
  timestamp: string;
  /** Any tools that were executed as part of this turn. */
  toolExecutions?: ToolExecution[];
  /** The evaluation result for this turn, if applicable. */
  evaluation?: EvaluationResult;
};

/**
 * Contains all the rich context needed for a thorough, RAGAS-style evaluation.
 * This object is constructed by the `ContextBuilder` and used by the `RAGASEvaluator`.
 */
export type EnhancedEvaluationContext = {
  /** The original user query. */
  userQuery: string;
  /** An analysis of the user's query intent. */
  queryAnalysis: QueryIntentAnalysis;

  /** The AI's response that is being evaluated. */
  aiResponse: string;
  /** The AI provider that generated the response. */
  provider: string;
  /** The specific model that generated the response. */
  model: string;

  /** The parameters used for the generation call. */
  generationParams: {
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
  };

  /** A list of tools that were executed. */
  toolExecutions: ToolExecution[];

  /** The history of the conversation leading up to this turn. */
  conversationHistory: EnhancedConversationTurn[];

  /** The response time of the AI in milliseconds. */
  responseTime: number;
  /** The token usage for the generation. */
  tokenUsage: TokenUsage;

  /** The results of any previous evaluation attempts for this response. */
  previousEvaluations?: EvaluationResult[];
  /** The current attempt number for this evaluation (1-based). */
  attemptNumber: number;
};

/**
 * Represents the result of a single evaluation attempt, based on RAGAS principles.
 */
export type EvaluationResult = {
  /** The final, overall score for the response, typically from 1 to 10. */
  finalScore: number;

  /** How well the response addresses the user's query. */
  relevanceScore: number;
  /** The factual accuracy of the information in the response. */
  accuracyScore: number;
  /** How completely the response answers the user's query. */
  completenessScore: number;

  /** Whether the final score meets the passing threshold. */
  isPassing: boolean;
  /** Constructive response from the judge LLM on how to improve the response. */
  reasoning: string;
  /** Specific suggestions for improving the response. */
  suggestedImprovements: string;
  /** The raw, unparsed response from the judge LLM. */
  rawEvaluationResponse: string;

  /** The model used to perform the evaluation. */
  evaluationModel: string;
  /** The time taken for the evaluation in milliseconds. */
  evaluationTime: number;
  /** The attempt number for this evaluation. */
  attemptNumber: number;
};

/**
 * Provides detailed information when a response fails quality assurance checks.
 */
export type QualityErrorDetails = {
  /** The history of all evaluation attempts for this response. */
  evaluationHistory: EvaluationResult[];
  /** The final score of the last attempt. */
  finalScore: number;
  /** The total number of evaluation attempts made. */
  attempts: number;
  /** A summary message of the failure. */
  message: string;
};

/**
 * Configuration for the main `Evaluator` class.
 */
export type EvaluationConfig = {
  /** The minimum score (1-10) for a response to be considered passing. */
  threshold?: number;
  /** The evaluation strategy to use. Currently only 'ragas' is supported. */
  evaluationStrategy?: "ragas" | "custom";
  /** The model to use for the LLM-as-judge evaluation. */
  evaluationModel?: string;
  /** The maximum number of evaluation attempts before failing. */
  maxAttempts?: number;
  /** The provider to use for the evaluation model. */
  provider?: string;
  /** A custom evaluator function to override the default behavior. */
  customEvaluator?: (
    options: LanguageModelV3CallOptions,
    result: GenerateResult,
  ) => Promise<{
    evaluationResult: EvaluationResult;
    evalContext: EnhancedEvaluationContext;
  }>;
  /** The score below which a response is considered off-topic. */
  offTopicThreshold?: number;
  /** The score below which a failing response is considered a high severity alert. */
  highSeverityThreshold?: number;
  /** An optional function to generate custom evaluation prompts. */
  promptGenerator?: GetPromptFunction;
};

/**
 * A function that generates the main body of an evaluation prompt.
 */
export type GetPromptFunction = (context: {
  userQuery: string;
  history: string;
  tools: string;
  retryInfo: string;
  aiResponse: string;
}) => string;

/**
 * Pipeline execution options
 */

export type PipelineExecutionOptions = {
  /** Correlation ID for tracing */
  correlationId?: string;
  /** Custom timeout override */
  timeout?: number;
  /** Skip specific scorers. Mutually exclusive with onlyScorers. */
  skipScorers?: string[];
  /** Only run specific scorers. Mutually exclusive with skipScorers. */
  onlyScorers?: string[];
  /** Additional metadata to attach */
  metadata?: JsonObject;
};

/**
 * Pipeline execution result
 */

export type PipelineResult = AggregatedScores & {
  /** Pipeline configuration used */
  pipelineConfig: PipelineConfig;
  /** Execution options used */
  executionOptions?: PipelineExecutionOptions;
  /** Errors that occurred during execution */
  errors: Array<{ scorerId: string; error: string }>;
  /** Scorers that were skipped */
  skippedScorers: string[];
};

/**
 * Report data structure
 */

export type ReportData = {
  /** Report title */
  title: string;
  /** Timestamp */
  timestamp: number;
  /** Evaluation result */
  result: PipelineResult | AggregatedScores;
  /** Optional custom sections */
  customSections?: Array<{
    title: string;
    content: string | JsonObject;
  }>;
};

/**
 * Function scorer - a simple function-based scorer
 */

export type ScorerFunction = (input: ScorerInput) => Promise<{
  score: number;
  reasoning: string;
  metadata?: JsonObject;
}>;

// ============================================================================
// BATCH EVALUATION TYPES (superset merges — see CLAUDE.md Rule 9)
// ============================================================================

/**
 * Superset batch progress. `pending` is canonical; `remaining` in the
 * pipeline's batchStrategy was renamed during consolidation (same value).
 */
export type BatchProgress = {
  total: number;
  completed: number;
  failed: number;
  pending: number;
  percentComplete: number;
  succeeded?: number;
  estimatedTimeRemaining?: number;
};

/** Input item for BatchEvaluator. */
export type BatchEvaluationItem = {
  id: string;
  options: LanguageModelV3CallOptions;
  result: GenerateResult;
  threshold?: number;
};

/** Result of a single item in BatchEvaluator. */
export type BatchEvaluationItemResult = {
  id: string;
  success: boolean;
  data?: EvaluationData;
  error?: {
    message: string;
    code?: string;
    retryable?: boolean;
  };
  duration: number;
  retryCount: number;
};

/** Result of a single item in the pipeline batchStrategy. */
export type BatchItemResult = {
  index: number;
  input: ScorerInput;
  result?: PipelineResult;
  error?: string;
  duration: number;
};

/**
 * Superset batch evaluation config. Union of pre-consolidation types
 * (BatchEvaluationConfig in BatchEvaluator, BatchConfig in batchStrategy).
 */
export type BatchEvaluationConfig = EvaluationConfig & {
  concurrency?: number;
  continueOnError?: boolean;
  onProgress?: (progress: BatchProgress) => void;
  maxRetries?: number;
  retryDelay?: number;
  onItemComplete?: (result: BatchEvaluationItemResult) => void;
  batchDelay?: number;
  onResult?: (result: BatchItemResult) => void;
};

/**
 * Superset batch-result. `results` is a union of both item-result flavors;
 * summary field names chosen from BatchEvaluator (`succeeded`, `passingRate`).
 */
export type BatchEvaluationResult = {
  results: BatchEvaluationItemResult[] | BatchItemResult[];
  summary: {
    total: number;
    succeeded: number;
    failed: number;
    averageScore: number;
    averageDuration: number;
    totalDuration: number;
    passingRate: number;
  };
  allSucceeded?: boolean;
};

// =============================================================================
// EVALUATION AGGREGATOR (from evaluation/EvaluationAggregator.ts)
// =============================================================================

/** Statistical summary of evaluation scores. */
export type ScoreStatistics = {
  min: number;
  max: number;
  mean: number;
  median: number;
  stdDev: number;
  variance: number;
  p25: number;
  p75: number;
  p90: number;
  p95: number;
};

/** Score distribution across ranges. */
export type ScoreDistribution = {
  /** Items scoring 1-3 (poor) */
  poor: number;
  /** Items scoring 4-5 (below average) */
  belowAverage: number;
  /** Items scoring 6-7 (average) */
  average: number;
  /** Items scoring 8-9 (good) */
  good: number;
  /** Items scoring 10 (excellent) */
  excellent: number;
};

/** Trend analysis results. */
export type TrendAnalysis = {
  direction: "improving" | "declining" | "stable";
  slope: number;
  rSquared: number;
  percentChange: number;
  movingAverage: number;
};

/** Dimension-specific analysis for RAGAS metrics. */
export type DimensionAnalysis = {
  relevance: ScoreStatistics;
  accuracy: ScoreStatistics;
  completeness: ScoreStatistics;
  overall: ScoreStatistics;
  correlations: {
    relevanceAccuracy: number;
    relevanceCompleteness: number;
    accuracyCompleteness: number;
  };
};

/** Quality alerts summary. */
export type AlertSummary = {
  total: number;
  high: number;
  medium: number;
  offTopic: number;
  alertRate: number;
};

/** Comprehensive aggregation result. */
export type AggregationResult = {
  count: number;
  statistics: ScoreStatistics;
  distribution: ScoreDistribution;
  dimensions: DimensionAnalysis;
  sequenceTrend?: TrendAnalysis;
  alerts: AlertSummary;
  passingRate: number;
  avgEvaluationTime: number;
  metadata: {
    aggregatedAt: string;
    threshold: number;
    evaluationModels: string[];
  };
};

// =============================================================================
// EVALUATOR FACTORY / REGISTRY (from evaluation/EvaluatorFactory.ts, EvaluatorRegistry.ts)
// =============================================================================

/** Configuration preset for common evaluation scenarios. */
export type EvaluatorPreset = {
  name: string;
  description: string;
  config?: EvaluationConfig;
};

/** Configuration for evaluation strategies. */
export type EvaluationStrategyConfig = {
  evaluationModel?: string;
  provider?: string;
  threshold?: number;
  promptGenerator?: (context: {
    userQuery: string;
    history: string;
    tools: string;
    retryInfo: string;
    aiResponse: string;
  }) => string;
  options?: Record<string, unknown>;
};

/** Function that performs evaluation and returns results. */
export type EvaluationStrategyFunction = (
  options: LanguageModelV3CallOptions,
  result: GenerateResult,
  config?: EvaluationStrategyConfig,
) => Promise<{
  evaluationResult: EvaluationResult;
  evalContext: EnhancedEvaluationContext;
}>;

/** Metadata for registered evaluation strategies. */
export type EvaluationStrategyMetadata = {
  name: string;
  description: string;
  requiresLLM: boolean;
  defaultModel?: string;
  defaultProvider?: string;
  version: string;
  features: string[];
};

// =============================================================================
// EVALUATION ERRORS (from evaluation/errors/EvaluationError.ts)
// =============================================================================

/** Canonical evaluation error code. */
export type EvaluationErrorCode =
  | "EVALUATION_FAILED"
  | "PARSE_ERROR"
  | "STRATEGY_NOT_FOUND"
  | "PROVIDER_ERROR"
  | "CONFIGURATION_ERROR"
  | "CUSTOM_EVALUATOR_ERROR"
  | "BATCH_EVALUATION_ERROR"
  | "AGGREGATION_ERROR"
  | "REGISTRY_ERROR"
  | "MAX_RETRIES_EXCEEDED"
  | "TIMEOUT_ERROR"
  | "RATE_LIMIT_ERROR";

/** Extended evaluation context for error details. */
export type EvaluationErrorContext = {
  userQueryLength?: number;
  aiResponseLength?: number;
  attemptNumber?: number;
  previousScores?: number[];
  strategy?: string;
  evaluationModel?: string;
  provider?: string;
  rawResponseLength?: number;
  additionalContext?: Record<string, unknown>;
};

// =============================================================================
// LANGFUSE ADAPTER (from evaluation/hooks/langfuseAdapter.ts)
// =============================================================================

/** Minimal Langfuse client interface for evaluation hooks. */
export type LangfuseClient = {
  score: (params: {
    name: string;
    value: number;
    traceId?: string;
    observationId?: string;
    comment?: string;
    metadata?: Record<string, unknown>;
  }) => Promise<unknown>;
  trace?: (params: {
    name: string;
    metadata?: Record<string, unknown>;
    tags?: string[];
  }) => { id: string };
  shutdown?: () => Promise<void>;
};

/** Langfuse adapter configuration. */
export type LangfuseAdapterConfig = {
  client: LangfuseClient;
  scorePrefix?: string;
  includeMetadata?: boolean;
  tags?: string[];
  sendPipelineScores?: boolean;
  sendScorerScores?: boolean;
};

// =============================================================================
// OBSERVABILITY HOOKS (from evaluation/hooks/observabilityHooks.ts)
// =============================================================================

/** Events emitted by the evaluation pipeline. */
export type EvaluationEvents = {
  "scorer:start": {
    scorerId: string;
    scorerName: string;
    timestamp: number;
    traceContext?: EvaluationTraceContext;
  };
  "scorer:end": {
    scorerId: string;
    scorerName: string;
    result: ScoreResult;
    timestamp: number;
    duration: number;
    traceContext?: EvaluationTraceContext;
  };
  "scorer:error": {
    scorerId: string;
    scorerName: string;
    error: string;
    timestamp: number;
    traceContext?: EvaluationTraceContext;
  };
  "pipeline:start": {
    pipelineName: string;
    scorerCount: number;
    timestamp: number;
    correlationId: string;
    traceContext?: EvaluationTraceContext;
  };
  "pipeline:end": {
    pipelineName: string;
    result: PipelineResult;
    timestamp: number;
    duration: number;
    traceContext?: EvaluationTraceContext;
  };
  "pipeline:error": {
    pipelineName: string;
    error: string;
    timestamp: number;
    traceContext?: EvaluationTraceContext;
  };
};

/**
 * Flat span attribute map used by the evaluation observability layer.
 * Named EvaluationSpanAttributes to disambiguate from the richer telemetry
 * SpanAttributes in span.ts (§Rule 9 domain prefix).
 */
export type EvaluationSpanAttributes = Record<
  string,
  string | number | boolean
>;

// =============================================================================
// METRICS COLLECTOR (from evaluation/reporting/metricsCollector.ts)
// =============================================================================

/** Metrics captured per scorer execution. */
export type ScorerMetrics = {
  scorerId: string;
  scorerName: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  passedCount: number;
  failedCount: number;
  totalScore: number;
  minScore: number;
  maxScore: number;
  totalDuration: number;
  averageDuration: number;
  averageScore: number;
  passRate: number;
  lastExecutionTime: number;
};

/** Metrics captured per evaluation pipeline. */
export type PipelineMetrics = {
  pipelineName: string;
  totalExecutions: number;
  passedCount: number;
  failedCount: number;
  totalScore: number;
  minScore: number;
  maxScore: number;
  totalDuration: number;
  averageDuration: number;
  averageScore: number;
  passRate: number;
  lastExecutionTime: number;
  scorerMetrics: Map<string, ScorerMetrics>;
};

/** Aggregated metrics across pipelines and scorers. */
export type AggregatedMetrics = {
  totalEvaluations: number;
  overallPassRate: number;
  averageScore: number;
  averageDuration: number;
  scoreDistribution: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
    failing: number;
  };
  pipelineMetrics: Map<string, PipelineMetrics>;
  scorerMetrics: Map<string, ScorerMetrics>;
  collectionStartTime: number;
  lastUpdateTime: number;
};

// =============================================================================
// REPORT GENERATOR (from evaluation/reporting/reportGenerator.ts)
// =============================================================================

/** Generated evaluation report envelope. */
export type GeneratedReport = {
  format: ReportFormat;
  content: string;
  metadata: {
    generatedAt: number;
    format: ReportFormat;
    config: ReportConfig;
  };
};
