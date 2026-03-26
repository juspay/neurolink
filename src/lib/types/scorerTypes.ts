/**
 * @file Scorer type definitions for NeuroLink evaluation system
 * Mastra-style modular scorer interfaces and types
 */

import type { JsonObject } from "./common.js";
import type { EnhancedEvaluationContext } from "./evaluationTypes.js";
import type { GenerateResult } from "./generateTypes.js";

/**
 * Scorer type classification
 */
export type ScorerType = "llm" | "rule" | "hybrid";

/**
 * Scorer categories for organization
 */
export type ScorerCategory =
  | "accuracy" // Factual correctness
  | "relevancy" // Query/context relevance
  | "safety" // Toxicity, bias, harmful content
  | "quality" // Writing quality, tone, format
  | "faithfulness" // Grounding in provided context
  | "custom"; // User-defined scorers

/**
 * Score scale configuration
 */
export type ScoreScale = {
  /** Minimum score value */
  min: number;
  /** Maximum score value */
  max: number;
  /** Decimal precision for scores */
  precision: number;
};

/**
 * Individual score result from a scorer
 */
export type ScoreResult = {
  /** Unique identifier for the scorer */
  scorerId: string;
  /** Display name of the scorer */
  scorerName: string;
  /** Numeric score value */
  score: number;
  /** Normalized score (0-1 scale) */
  normalizedScore: number;
  /** Score scale used */
  scale: ScoreScale;
  /** Human-readable reasoning for the score */
  reasoning: string;
  /** Whether the score passes the threshold */
  passed: boolean;
  /** Threshold used for pass/fail determination */
  threshold: number;
  /** Confidence level (0-1) for LLM-based scores */
  confidence?: number;
  /** Additional metadata from the scorer */
  metadata?: JsonObject;
  /** Time taken to compute the score (ms) */
  computeTime: number;
  /** Error if scoring failed */
  error?: string;
};

/**
 * Aggregated scores from multiple scorers
 */
export type AggregatedScores = {
  /** Individual score results */
  scores: ScoreResult[];
  /** Overall aggregated score */
  overallScore: number;
  /** Aggregation method used */
  aggregationMethod: AggregationMethod;
  /** Whether overall evaluation passed */
  passed: boolean;
  /** Total computation time (ms) */
  totalComputeTime: number;
  /** Timestamp of evaluation */
  timestamp: number;
  /** Session/request ID for correlation */
  correlationId?: string;
};

/**
 * Aggregation method for combining scores
 */
export type AggregationMethod =
  | "average"
  | "weighted"
  | "minimum"
  | "maximum"
  | "custom";

/**
 * Scorer configuration options
 */
export type ScorerConfig = {
  /** Whether the scorer is enabled */
  enabled?: boolean;
  /** Pass/fail threshold (0-1 normalized) */
  threshold?: number;
  /** Weight for weighted aggregation */
  weight?: number;
  /** Custom scorer-specific configuration */
  options?: JsonObject;
  /** Timeout for scorer execution (ms) */
  timeout?: number;
  /** Number of retry attempts */
  retries?: number;
};

/**
 * Input context for scorer execution
 */
export type ScorerInput = {
  /** The user's original query/prompt */
  query: string;
  /** The AI-generated response to evaluate */
  response: string;
  /** Retrieved context (for RAG evaluations) */
  context?: string[];
  /** Ground truth/expected answer (for accuracy checks) */
  groundTruth?: string;
  /** Full generation result with metadata */
  generationResult?: GenerateResult;
  /** Enhanced evaluation context */
  evaluationContext?: EnhancedEvaluationContext;
  /** Conversation history for multi-turn evaluation */
  conversationHistory?: Array<{ role: string; content: string }>;
  /** Custom input data for specific scorers */
  custom?: JsonObject;
};

/**
 * Scorer metadata for registration
 */
export type ScorerMetadata = {
  /** Unique scorer identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of what the scorer evaluates */
  description: string;
  /** Scorer type (llm, rule, hybrid) */
  type: ScorerType;
  /** Category for grouping */
  category: ScorerCategory;
  /** Version string */
  version: string;
  /** Default configuration */
  defaultConfig: ScorerConfig;
  /** Required input fields */
  requiredInputs: (keyof ScorerInput)[];
  /** Optional input fields */
  optionalInputs: (keyof ScorerInput)[];
};

/**
 * LLM-based scorer configuration
 */
export type LLMScorerConfig = ScorerConfig & {
  /** Model to use for scoring */
  model?: string;
  /** Provider for the scoring model */
  provider?: string;
  /** Temperature for LLM scoring */
  temperature?: number;
  /** Custom prompt template */
  promptTemplate?: string;
  /** Output schema for structured scoring */
  outputSchema?: JsonObject;
};

/**
 * Rule-based scorer configuration
 */
export type RuleScorerConfig = ScorerConfig & {
  /** Rules to apply */
  rules?: ScorerRule[];
  /** How to combine rule results */
  ruleCombination?: "all" | "any" | "weighted";
};

/**
 * Individual rule for rule-based scorers
 */
export type ScorerRule = {
  /** Rule identifier */
  id: string;
  /** Rule description */
  description: string;
  /** Rule type */
  type: "regex" | "keyword" | "length" | "custom";
  /** Rule parameters */
  params: JsonObject;
  /** Weight for this rule */
  weight?: number;
};

/**
 * Rule evaluation result
 */
export type RuleResult = {
  /** Rule identifier */
  ruleId: string;
  /** Whether the rule passed */
  passed: boolean;
  /** Score from this rule */
  score: number;
  /** Reasoning for the result */
  reasoning?: string;
};

/**
 * Scorer execution events for observability
 */
export type ScorerEvent = {
  /** Event type */
  type: "scorer:start" | "scorer:end" | "scorer:error";
  /** Scorer identifier */
  scorerId: string;
  /** Event timestamp */
  timestamp: number;
  /** Duration (for end events) */
  duration?: number;
  /** Score result (for end events) */
  score?: number;
  /** Error message (for error events) */
  error?: string;
  /** Additional metadata */
  metadata?: JsonObject;
};

/**
 * Scorer registry entry
 */
export type ScorerRegistryEntry = {
  /** Scorer metadata */
  metadata: ScorerMetadata;
  /** Factory function for creating scorer instances */
  factory: ScorerFactory;
  /** Default configuration */
  defaultConfig: ScorerConfig;
  /** Aliases for this scorer */
  aliases?: string[];
};

/**
 * Factory function for creating scorer instances
 */
export type ScorerFactory = (config?: ScorerConfig) => Promise<Scorer>;

/**
 * Core Scorer interface - all scorers must implement this
 */
export type Scorer = {
  /** Scorer metadata */
  readonly metadata: ScorerMetadata;

  /** Current configuration */
  readonly config: ScorerConfig;

  /**
   * Execute the scorer and return a score result
   * @param input - Input context for scoring
   * @returns Score result
   */
  score(input: ScorerInput): Promise<ScoreResult>;

  /**
   * Validate that required inputs are present
   * @param input - Input to validate
   * @returns Validation result
   */
  validateInput(input: ScorerInput): { valid: boolean; errors: string[] };

  /**
   * Update scorer configuration
   * @param config - New configuration
   */
  configure(config: Partial<ScorerConfig>): void;
};

/**
 * Extended interface for LLM-based scorers
 */
export type LLMScorer = Scorer & {
  /** LLM-specific configuration */
  readonly llmConfig: LLMScorerConfig;

  /**
   * Generate the prompt for LLM scoring
   * @param input - Scorer input
   * @returns Prompt string
   */
  generatePrompt(input: ScorerInput): string;

  /**
   * Parse LLM response into score result
   * @param response - Raw LLM response
   * @param input - Original input
   * @returns Parsed score result
   */
  parseResponse(response: string, input: ScorerInput): Partial<ScoreResult>;
};

/**
 * Extended interface for rule-based scorers
 */
export type RuleScorer = Scorer & {
  /** Rule-specific configuration */
  readonly ruleConfig: RuleScorerConfig;

  /**
   * Get all rules for this scorer
   * @returns Array of rules
   */
  getRules(): ScorerRule[];

  /**
   * Evaluate a single rule
   * @param rule - Rule to evaluate
   * @param input - Scorer input
   * @returns Rule result
   */
  evaluateRule(
    rule: ScorerRule,
    input: ScorerInput,
  ): { passed: boolean; score: number };
};

/**
 * Pipeline configuration for multi-scorer evaluation
 */
export type PipelineConfig = {
  /** Pipeline name */
  name?: string;
  /** Pipeline description */
  description?: string;
  /** Scorers to run in the pipeline */
  scorers: Array<{ id: string; config?: ScorerConfig }>;
  /** Aggregation configuration */
  aggregation?: AggregationConfig;
  /** Overall pass threshold */
  passThreshold?: number;
  /** Execution mode */
  executionMode?: "parallel" | "sequential";
  /** Stop on first failure */
  stopOnFailure?: boolean;
  /** Timeout for entire pipeline (ms) */
  timeout?: number;
  /** Required scorers that must pass */
  requiredScorers?: string[];
};

/**
 * Aggregation configuration
 */
export type AggregationConfig = {
  /** Aggregation method */
  method: AggregationMethod;
  /** Weights for weighted aggregation */
  weights?: Record<string, number>;
  /** Custom aggregation function */
  customFn?: (scores: ScoreResult[]) => number;
};

/**
 * Sampling configuration for cost-efficient evaluation
 */
export type SamplingConfig = {
  /** Sampling rate (0-1) */
  rate: number;
  /** Always evaluate certain conditions */
  alwaysEvaluate?: {
    /** Always evaluate errors */
    errors?: boolean;
    /** Always evaluate for certain users */
    users?: string[];
    /** Always evaluate certain tags */
    tags?: string[];
  };
  /** Adaptive sampling configuration */
  adaptive?: {
    /** Enable adaptive sampling */
    enabled: boolean;
    /** Adjust rate based on quality */
    qualityThreshold: number;
    /** Minimum sampling rate */
    minRate: number;
    /** Maximum sampling rate */
    maxRate: number;
  };
};

/**
 * Sampling decision result
 */
export type SamplingDecision = {
  /** Whether to sample this request */
  shouldSample: boolean;
  /** Reason for decision */
  reason: string;
  /** Current sampling rate */
  currentRate: number;
};

/**
 * Sampling context for adaptive sampling
 */
export type SamplingContext = {
  /** Recent quality scores */
  recentScores?: number[];
  /** User ID if available */
  userId?: string;
  /** Tags for this request */
  tags?: string[];
  /** Whether this request errored */
  hasError?: boolean;
};

/**
 * Evaluation trace context for observability
 */
export type EvaluationTraceContext = {
  /** Trace ID */
  traceId: string;
  /** Span ID */
  spanId?: string;
  /** Parent span ID */
  parentSpanId?: string;
  /** Session ID */
  sessionId?: string;
  /** User ID */
  userId?: string;
  /** Custom attributes */
  attributes?: Record<string, string | number | boolean>;
};

/**
 * Report format options
 */
export type ReportFormat = "text" | "json" | "markdown" | "html";

/**
 * Report configuration
 */
export type ReportConfig = {
  /** Report format */
  format: ReportFormat;
  /** Include detailed reasoning */
  includeReasoning?: boolean;
  /** Include metadata */
  includeMetadata?: boolean;
  /** Include timing information */
  includeTiming?: boolean;
};
