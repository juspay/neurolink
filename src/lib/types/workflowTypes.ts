/**
 * types/workflowTypes.ts
 * Core type definitions for the Workflow Engine
 *
 * Testing Phase: Focuses on original output + evaluation metrics for AB testing
 */

import type { AnalyticsData } from "./analytics.js";
import { AIProviderName } from "../constants/enums.js";
import type { JsonValue } from "./common.js";

// ============================================================================
// WORKFLOW CONFIGURATION TYPES
// ============================================================================

/**
 * Workflow type enumeration
 */
export type WorkflowType = "ensemble" | "chain" | "adaptive" | "custom";

/**
 * Judge output format options
 */
export type JudgeOutputFormat = "scores" | "ranking" | "best" | "detailed";

/**
 * Tone adjustment strategy (for future conditioning phase)
 */
export type ToneAdjustment = "soften" | "strengthen" | "neutral";

/**
 * Execution strategy for model groups
 */
export type ExecutionStrategy = "parallel" | "sequential";

/**
 * Model group for layer-based execution
 * Enables sequential vs parallel control at group level
 */
export type ModelGroup = {
  // Identification
  id: string;
  name?: string;
  description?: string;

  // Models in this group
  models: WorkflowModelConfig[];

  // Execution behavior
  executionStrategy: ExecutionStrategy; // How models within group execute
  continueOnFailure?: boolean; // Continue to next group if this fails (default: true)
  minSuccessful?: number; // Minimum successful models to proceed (default: 1)

  // Advanced options
  parallelism?: number; // Override global parallelism for this group
  timeout?: number; // Group-level timeout (ms)

  // Metadata
  metadata?: Record<string, JsonValue>;
};

/**
 * Workflow configuration
 */
export type WorkflowConfig = {
  // Identification
  id: string;
  name: string;
  description?: string;
  version?: string;

  // Workflow definition
  type: WorkflowType;
  models: WorkflowModelConfig[]; // Flat array (backward compatible, used if modelGroups not provided)
  modelGroups?: ModelGroup[]; // Layer-based execution (takes precedence over models if provided)

  // Workflow-level prompt defaults (fallback if model-specific not provided)
  defaultSystemPrompt?: string; // Default system prompt for all models
  defaultJudgePrompt?: string; // Default evaluation prompt for judges

  // Optional components
  judge?: JudgeConfig;
  judges?: JudgeConfig[]; // For multi-judge workflows
  conditioning?: ConditioningConfig;
  execution?: ExecutionConfig;

  // Metadata
  tags?: string[];
  metadata?: Record<string, JsonValue>;
  createdAt?: string;
  updatedAt?: string;
};

/**
 * Model configuration for ensemble
 * Named WorkflowModelConfig to avoid conflict with modelTypes.ModelConfig
 */
export type WorkflowModelConfig = {
  // Required fields
  provider: AIProviderName;
  model: string;

  // Optional tuning
  weight?: number; // For weighted voting (0-1)
  temperature?: number; // Model temperature (0-2)
  maxTokens?: number; // Max output tokens
  systemPrompt?: string; // Custom system prompt
  timeout?: number; // Per-model timeout (ms)

  // Advanced options
  topP?: number;
  topK?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;

  // Metadata
  label?: string; // Human-readable label
  metadata?: Record<string, JsonValue>;
};

/**
 * Judge model configuration
 * NOTE: Testing phase uses fixed 0-100 scoring scale
 */
export type JudgeConfig = {
  // Required fields
  provider: AIProviderName;
  model: string;
  criteria: string[]; // Evaluation criteria
  outputFormat: JudgeOutputFormat;

  // Optional configuration
  customPrompt?: string; // Custom evaluation prompt body (overrides workflow default)
  systemPrompt?: string; // System instructions for judge personality
  temperature?: number; // Judge temperature (usually low, e.g., 0.1)
  maxTokens?: number; // Max judge output
  timeout?: number; // Judge timeout (ms)

  // Advanced options
  blindEvaluation?: boolean; // Hide provider names from judge
  includeReasoning: boolean; // REQUIRED: Always include short explanation
  synthesizeImprovedResponse?: boolean; // Judge synthesizes improved response instead of just selecting
  scoreScale: {
    // Fixed 0-100 scale for testing phase
    min: 0;
    max: 100;
  };

  // Metadata
  label?: string;
  metadata?: Record<string, JsonValue>;
};

/**
 * Response conditioning configuration
 * NOTE: Testing phase - stub only, no actual conditioning
 */
export type ConditioningConfig = {
  // Core conditioning
  enabled?: boolean; // Enable/disable conditioning
  useConfidence: boolean;
  confidenceThresholds?: {
    high: number; // Default: 0.8
    medium: number; // Default: 0.5
    low: number; // Default: 0.3
  };

  // Synthesis model for improving responses
  synthesisModel?: {
    provider: string;
    model: string;
    temperature?: number;
  };

  // Tone adjustment (future phase)
  toneAdjustment?: ToneAdjustment;

  // Metadata injection
  includeMetadata?: boolean;
  metadataFields?: string[]; // Which fields to include

  // Response formatting (only used if synthesisModel not configured)
  addConfidenceStatement?: boolean;
  addModelAttribution?: boolean;
  addExecutionTime?: boolean;

  // Custom metadata
  metadata?: Record<string, JsonValue>;
};

/**
 * Workflow execution configuration
 */
export type ExecutionConfig = {
  // Timeout settings
  timeout?: number; // Total workflow timeout (ms)
  modelTimeout?: number; // Per-model timeout (ms)
  judgeTimeout?: number; // Judge timeout (ms)

  // Retry settings
  retries?: number; // Max retries on failure
  retryDelay?: number; // Delay between retries (ms)
  retryableErrors?: string[]; // Error codes to retry

  // Optimization
  parallelism?: number; // Max parallel models
  earlyTermination?: boolean; // Stop after N responses
  minResponses?: number; // Minimum required responses

  // Cost controls
  maxCost?: number; // Max cost per execution
  costThreshold?: number; // Warn at cost threshold

  // Monitoring
  enableMetrics?: boolean;
  enableTracing?: boolean;

  // Metadata
  metadata?: Record<string, JsonValue>;
};

// ============================================================================
// WORKFLOW INPUT/OUTPUT TYPES
// ============================================================================

/**
 * Input for workflow execution
 */
export type WorkflowInput = {
  text: string;
  context?: Record<string, JsonValue>;
  metadata?: Record<string, JsonValue>;
};

/**
 * Options for workflow execution
 */
export type WorkflowGenerateOptions = {
  // Required
  workflowId: string;
  input: WorkflowInput;

  // Optional overrides
  overrides?: Partial<WorkflowConfig>;
  timeout?: number;

  // Additional options
  enableAnalytics?: boolean;
  enableEvaluation?: boolean;
  context?: Record<string, JsonValue>;
};

/**
 * Complete workflow execution result
 * Returns both original and conditioned responses for comparison
 */
export type WorkflowResult = {
  // Primary output (PROCESSED/CONDITIONED)
  content: string;

  // Original unmodified response (NEW)
  originalContent?: string;

  // Evaluation metrics (for AB testing) - REQUIRED
  score: number; // Judge score (0-100)
  reasoning: string; // Short summary of why this score

  // Ensemble data
  ensembleResponses: EnsembleResponse[];

  // Judge data (if used)
  judgeScores?: JudgeScores;
  selectedResponse?: EnsembleResponse;

  // Quality metrics
  confidence: number; // Overall confidence (0-1)
  consensus?: number; // Agreement level (0-1)

  // Performance metrics
  totalTime: number; // Total execution time (ms)
  ensembleTime: number; // Ensemble phase time (ms)
  judgeTime?: number; // Judge phase time (ms)
  conditioningTime?: number; // Conditioning time (ms)

  // Workflow metadata
  workflow: string; // Workflow ID
  workflowName: string; // Workflow name
  workflowVersion?: string; // Workflow version

  // Resource usage
  usage?: AggregatedUsage;
  cost?: number; // Total estimated cost

  // Analytics and evaluation
  analytics?: WorkflowAnalytics;
  evaluation?: WorkflowEvaluationData;

  // Additional metadata
  metadata?: Record<string, JsonValue>;
  timestamp: string;
};

/**
 * Single ensemble model response
 */
export type EnsembleResponse = {
  // Model identification
  provider: string;
  model: string;
  modelLabel?: string;

  // Response content
  content: string;

  // Performance metrics
  responseTime: number; // Response time (ms)

  // Resource usage
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };

  // Status
  status: "success" | "failure" | "timeout" | "partial";
  error?: string;

  // Metadata
  metadata?: Record<string, JsonValue>;
  timestamp: string;
};

/**
 * Judge scoring results
 * NOTE: Scores are 0-100 for standardized evaluation
 */
export type JudgeScores = {
  // Judge identification
  judgeProvider: string;
  judgeModel: string;

  // Scoring results (0-100 scale)
  scores: Record<string, number>; // { "response-0": 85, "response-1": 92 }
  ranking?: string[]; // Ordered list of response IDs
  bestResponse?: string; // ID of best response

  // Evaluation details
  criteria: string[];
  reasoning?: string; // Short summary (max 200 chars in testing phase)
  synthesizedResponse?: string; // Judge-synthesized improved response (if enabled)
  confidenceInJudgment?: number; // Judge's own confidence (0-1)

  // Performance
  judgeTime: number; // Judge execution time (ms)

  // Metadata
  metadata?: Record<string, JsonValue>;
  timestamp: string;
};

/**
 * Multi-judge voting results
 */
export type MultiJudgeScores = {
  // Individual judge results
  judges: JudgeScores[];

  // Aggregated results
  averageScores: Record<string, number>;
  aggregatedRanking: string[];
  consensusLevel: number; // Agreement between judges (0-1)

  // Final selection
  bestResponse: string;
  confidence: number;

  // Metadata
  votingStrategy: "average" | "median" | "majority";
  metadata?: Record<string, JsonValue>;

  // Expose fields for unified interface
  judgeProvider?: string;
  judgeModel?: string;
  scores: Record<string, number>; // Points to averageScores
  ranking?: string[]; // Points to aggregatedRanking
  reasoning?: string;
  confidenceInJudgment?: number;
  criteria: string[];
  judgeTime: number;
  timestamp: string;
};

/**
 * Aggregated token usage across all models
 */
export type AggregatedUsage = {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;

  // Per-model breakdown
  byModel: Array<{
    provider: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    cost?: number;
  }>;

  // Judge usage (if applicable)
  judgeUsage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    cost?: number;
  };
};

/**
 * Workflow-specific analytics
 */
export type WorkflowAnalytics = AnalyticsData & {
  // Workflow-specific metrics
  workflowId: string;
  workflowType: WorkflowType;

  // Ensemble metrics
  modelsExecuted: number;
  modelsSuccessful: number;
  modelsFailed: number;

  // Quality metrics
  averageConfidence: number;
  consensusLevel?: number;

  // Performance distribution
  modelResponseTimes: Record<string, number>;
  fastestModel?: string;
  slowestModel?: string;

  // Cost breakdown
  totalCost: number;
  costByModel: Record<string, number>;
  costEfficiency?: number; // Quality per dollar
};

/**
 * Evaluation data type for workflows
 * Named WorkflowEvaluationData to avoid conflict with evaluation.EvaluationData
 */
export type WorkflowEvaluationData = {
  relevance: number;
  accuracy: number;
  completeness: number;
  overall: number;
  reasoning?: string;
};

// ============================================================================
// VALIDATION & ERROR TYPES
// ============================================================================

/**
 * Workflow validation result
 */
export type WorkflowValidationResult = {
  valid: boolean;
  errors: WorkflowValidationError[];
  warnings: WorkflowValidationWarning[];
};

/**
 * Validation error
 */
export type WorkflowValidationError = {
  field: string;
  message: string;
  code: string;
  severity: "error" | "critical";
};

/**
 * Validation warning
 */
export type WorkflowValidationWarning = {
  field: string;
  message: string;
  code: string;
  recommendation?: string;
};

/**
 * Workflow execution error details
 */
export type WorkflowErrorDetails = {
  code: string;
  workflowId: string;
  phase: "ensemble" | "judge" | "conditioning" | "validation";
  details?: Record<string, JsonValue>;
  retryable: boolean;
  originalError?: Error;
};

/**
 * Workflow execution error class
 */
export class WorkflowError extends Error {
  public readonly details: WorkflowErrorDetails;

  constructor(message: string, details: WorkflowErrorDetails) {
    super(message);
    this.name = "WorkflowError";
    this.details = details;

    // Maintain proper stack trace for V8 engines
    if (
      "captureStackTrace" in Error &&
      typeof Error.captureStackTrace === "function"
    ) {
      Error.captureStackTrace(this, WorkflowError);
    }
  }
}

// ============================================================================
// CORE EXECUTION TYPES (from workflow/core/types/)
// ============================================================================

/**
 * Options for ensemble execution
 */
export type ExecuteEnsembleOptions = {
  prompt: string;
  models: WorkflowModelConfig[];
  executionConfig?: ExecutionConfig;
  systemPrompt?: string; // Legacy: direct system prompt override
  workflowDefaults?: {
    systemPrompt?: string; // Workflow-level default system prompt
  };
};

/**
 * Result of ensemble execution
 */
export type EnsembleExecutionResult = {
  responses: EnsembleResponse[];
  totalTime: number;
  successCount: number;
  failureCount: number;
  errors: WorkflowError[];
};

/**
 * Options for single model execution (internal)
 */
export type ExecuteModelOptions = {
  model: WorkflowModelConfig;
  prompt: string;
  systemPrompt?: string;
  timeout: number;
};

/**
 * Options for judge scoring
 */
export type ScoreOptions = {
  judges: JudgeConfig[];
  responses: EnsembleResponse[];
  originalPrompt: string;
  systemPrompt?: string; // Legacy: direct system prompt override
  timeout?: number;
  workflowDefaults?: {
    judgePrompt?: string; // Workflow-level default judge evaluation prompt
  };
};

/**
 * Result of judge scoring
 */
export type ScoreResult = {
  scores: JudgeScores | MultiJudgeScores;
  judgeTime: number;
  error?: WorkflowError;
};

/**
 * Parsed judge response (internal)
 */
export type ParsedJudgeResponse = {
  scores: Record<string, number>;
  ranking?: string[];
  bestResponse?: string;
  reasoning?: string;
  synthesizedResponse?: string; // Judge-synthesized improved response
  confidenceInJudgment?: number;
};

/**
 * Options for response conditioning
 */
export type ConditionOptions = {
  content: string;
  selectedResponse: EnsembleResponse;
  allResponses: EnsembleResponse[]; // All ensemble responses for synthesis
  judgeScores?: JudgeScores | MultiJudgeScores;
  config?: ConditioningConfig;
  originalPrompt?: string; // Original user prompt for context
};

/**
 * Result of response conditioning
 */
export type ConditionResult = {
  content: string;
  conditioningTime: number;
  metadata?: {
    conditioningApplied: boolean;
    originalLength: number;
    finalLength: number;
    confidenceStatementAdded?: boolean;
    modelAttributionAdded?: boolean;
    executionTimeAdded?: boolean;
    synthesisApplied?: boolean;
  };
};

/**
 * Result of executing a single layer/group
 */
export type LayerExecutionResult = {
  groupId: string;
  responses: EnsembleResponse[];
  successCount: number;
  failureCount: number;
  executionTime: number;
  shouldContinue: boolean; // Whether to proceed to next layer
};

/**
 * Options for layer execution
 */
export type ExecuteLayerOptions = {
  group: ModelGroup;
  prompt: string;
  systemPrompt?: string;
  workflowDefaultSystemPrompt?: string;
};

/**
 * Registry entry with metadata (internal)
 */
export type RegistryEntry = {
  config: WorkflowConfig;
  registeredAt: string;
  lastUsed?: string;
  usageCount: number;
};

/**
 * Options for workflow registration
 */
export type RegisterOptions = {
  validateBeforeRegister?: boolean;
  allowOverwrite?: boolean;
};

/**
 * Result of registration operation
 */
export type RegisterResult = {
  success: boolean;
  workflowId: string;
  validation?: WorkflowValidationResult;
  error?: string;
};

/**
 * Options for workflow listing
 */
export type ListOptions = {
  type?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
};

/**
 * Workflow metadata
 */
export type WorkflowMetadata = {
  registeredAt: string;
  lastUsed?: string;
  usageCount: number;
};

/**
 * Registry statistics
 */
export type RegistryStats = {
  totalWorkflows: number;
  byType: Record<string, number>;
  totalUsage: number;
  mostUsed?: {
    id: string;
    name: string;
    count: number;
  };
};

// ============================================================================
// METRICS TYPES (from workflow/utils/types/)
// ============================================================================

/**
 * Workflow execution metrics (internal)
 */
export type WorkflowExecutionMetrics = {
  workflowId: string;
  executionCount: number;
  successCount: number;
  failureCount: number;
  averageExecutionTime: number;
  averageScore: number;
  averageConfidence: number;
  totalCost: number;
  lastExecutionTime: string;
};

/**
 * Summary statistics for workflow executions
 */
export type SummaryStats = {
  totalExecutions: number;
  averageScore: number;
  averageConfidence: number;
  averageExecutionTime: number;
  successRate: number;
  totalCost: number;
};

/**
 * Result of comparing two workflows
 */
export type WorkflowComparison = {
  workflow1: SummaryStats;
  workflow2: SummaryStats;
  winner: "workflow1" | "workflow2" | "tie";
  reasoning: string;
};

/**
 * Validation result containing errors and warnings
 */
export type ValidationIssues = {
  errors: WorkflowValidationError[];
  warnings: WorkflowValidationWarning[];
};

// ============================================================================
// TYPE ALIASES FOR BACKWARD COMPATIBILITY (internal to workflow module only)
// ============================================================================
// Note: ModelConfig and EvaluationData aliases are NOT exported from this file
// to avoid conflicts with modelTypes.ModelConfig and evaluation.EvaluationData.
// Use WorkflowModelConfig and WorkflowEvaluationData when importing from this file.
// The workflow/types.ts re-exports these aliases for backward compatibility
// within the workflow module only.
