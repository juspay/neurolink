/**
 * workflow/types.ts
 * Re-exports workflow types from the central types folder
 *
 * All workflow types are now defined in src/lib/types/workflowTypes.ts
 * This file maintains backward compatibility for existing imports.
 */

// Re-export all workflow types from the central types folder
export type {
  // Configuration types
  WorkflowType,
  JudgeOutputFormat,
  ToneAdjustment,
  ExecutionStrategy,
  ModelGroup,
  WorkflowConfig,
  WorkflowModelConfig,
  JudgeConfig,
  ConditioningConfig,
  ExecutionConfig,
  // Input/Output types
  WorkflowInput,
  WorkflowGenerateOptions,
  WorkflowResult,
  EnsembleResponse,
  JudgeScores,
  MultiJudgeScores,
  AggregatedUsage,
  WorkflowAnalytics,
  WorkflowEvaluationData,
  // Validation types
  WorkflowValidationResult,
  WorkflowValidationError,
  WorkflowValidationWarning,
  WorkflowErrorDetails,
  // Execution types
  ExecuteEnsembleOptions,
  EnsembleExecutionResult,
  ExecuteModelOptions,
  ScoreOptions,
  ScoreResult,
  ParsedJudgeResponse,
  ConditionOptions,
  ConditionResult,
  LayerExecutionResult,
  ExecuteLayerOptions,
  // Registry types
  RegistryEntry,
  RegisterOptions,
  RegisterResult,
  ListOptions,
  WorkflowMetadata,
  RegistryStats,
  // Metrics types
  WorkflowExecutionMetrics,
  SummaryStats,
  WorkflowComparison,
  ValidationIssues,
} from "../types/workflowTypes.js";

// Re-export the error class
export { WorkflowError } from "../types/workflowTypes.js";

// ============================================================================
// TYPE ALIASES FOR BACKWARD COMPATIBILITY (workflow module internal use)
// ============================================================================

import type {
  WorkflowModelConfig,
  WorkflowEvaluationData,
} from "../types/workflowTypes.js";

/**
 * Alias for ModelConfig to maintain backward compatibility with code
 * that imports ModelConfig from workflow types
 */
export type ModelConfig = WorkflowModelConfig;

/**
 * Alias for EvaluationData to maintain backward compatibility
 */
export type EvaluationData = WorkflowEvaluationData;
