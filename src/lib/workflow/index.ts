// Imported on its own, this entry starts tracing at its first span, as the
// main entry does. The import sits here rather than in the shared tracers so
// that the client entry stays free of the OpenTelemetry Node SDK.
import "../services/server/ai/observability/instrumentation.js";

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
