/**
 * Workflow Engine - Public API
 * ============================
 *
 * Central exports for the Neurolink Workflow Engine
 *
 * @module workflow
 */

// ============================================================================
// CORE TYPES
// ============================================================================

export type {
  AggregatedUsage,
  ConditioningConfig,
  // Response types
  EnsembleResponse,
  ExecutionConfig,
  ExecutionStrategy,
  JudgeConfig,
  JudgeOutputFormat,
  JudgeScores,
  ModelConfig,
  ModelGroup,
  MultiJudgeScores,
  ToneAdjustment,
  // Analytics and metrics
  WorkflowAnalytics,
  // Workflow configuration
  WorkflowConfig,
  // Errors
  WorkflowError,
  WorkflowErrorDetails,
  WorkflowGenerateOptions,
  // Input/Output
  WorkflowInput,
  WorkflowResult,
  // Workflow types
  WorkflowType,
  WorkflowValidationError,
  // Validation
  WorkflowValidationResult,
  WorkflowValidationWarning,
} from "./types.js";

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

// Configuration and validation
export {
  createWorkflowConfig,
  DEFAULT_EXECUTION_CONFIG,
  DEFAULT_JUDGE_CONFIG,
  getAllModels,
  getModelGroups,
  usesModelGroups,
  WorkflowConfigSchema,
} from "./config.js";
// Workflow registry
export {
  clearRegistry,
  getRegistryStats,
  getWorkflow,
  listWorkflows,
  registerWorkflow,
  unregisterWorkflow,
} from "./core/workflowRegistry.js";
export type { RunWorkflowOptions } from "./core/workflowRunner.js";
// Workflow execution
export { runWorkflow } from "./core/workflowRunner.js";
// Metrics and analytics
export {
  calculateConfidence,
  calculateConsensus,
  calculateModelMetrics,
  compareWorkflows,
  formatMetricsForLogging,
  generateSummaryStats,
} from "./utils/workflowMetrics.js";
export {
  validateForExecution,
  validateWorkflow,
} from "./utils/workflowValidation.js";

// ============================================================================
// PRE-BUILT WORKFLOWS
// ============================================================================

// Adaptive workflows
export {
  BALANCED_ADAPTIVE_WORKFLOW,
  createAdaptiveWorkflow,
  QUALITY_MAX_WORKFLOW,
  SPEED_FIRST_WORKFLOW,
} from "./workflows/adaptiveWorkflow.js";
// Consensus workflows
export {
  CONSENSUS_3_FAST_WORKFLOW,
  CONSENSUS_3_WORKFLOW,
  createConsensus3WithPrompt,
} from "./workflows/consensusWorkflow.js";
// Fallback workflows
export {
  AGGRESSIVE_FALLBACK_WORKFLOW,
  FAST_FALLBACK_WORKFLOW,
} from "./workflows/fallbackWorkflow.js";
// Multi-judge workflows
export {
  createMultiJudgeWorkflow,
  MULTI_JUDGE_3_WORKFLOW,
  MULTI_JUDGE_5_WORKFLOW,
} from "./workflows/multiJudgeWorkflow.js";

// ============================================================================
// LOW-LEVEL COMPONENTS (Advanced usage)
// ============================================================================

export {
  executeEnsemble,
  executeModelGroups,
} from "./core/ensembleExecutor.js";

export { scoreEnsemble } from "./core/judgeScorer.js";

export {
  conditionResponse,
  isConditioningEnabled,
} from "./core/responseConditioner.js";

// ============================================================================
// TYPE EXPORTS (for advanced users)
// ============================================================================

export type {
  ConditionOptions,
  ConditionResult,
} from "./core/types/conditionerTypes.js";
export type {
  EnsembleExecutionResult,
  ExecuteEnsembleOptions,
} from "./core/types/ensembleTypes.js";
export type { ScoreOptions, ScoreResult } from "./core/types/judgeTypes.js";
export type {
  ExecuteLayerOptions,
  LayerExecutionResult,
} from "./core/types/layerTypes.js";
export type {
  RegisterOptions,
  RegisterResult,
  RegistryStats,
} from "./core/types/registryTypes.js";

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Workflow Engine version
 */
export const WORKFLOW_ENGINE_VERSION = "1.0.0";

// Re-export from config to avoid duplication
export { DEFAULT_SCORE_SCALE } from "./config.js";

/**
 * Testing phase flag (returns original output unchanged)
 */
export const IS_TESTING_PHASE = true;
