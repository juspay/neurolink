/**
 * workflow/utils/workflowValidation.ts
 * Validation utilities for workflow configurations and execution
 */

import { logger } from "../../utils/logger.js";
import {
  getAllJudges,
  hasJudge,
  MAX_SCORE,
  MIN_SCORE,
  validateWorkflowConfig,
} from "../config.js";
import type {
  JudgeConfig,
  ModelConfig,
  WorkflowConfig,
  WorkflowValidationError,
  WorkflowValidationResult,
  WorkflowValidationWarning,
} from "../types.js";
import type { ValidationIssues } from "./types/index.js";

const functionTag = "WorkflowValidation";

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Comprehensive workflow validation
 * @param config - Workflow configuration to validate
 * @returns Validation result with errors and warnings
 */
export function validateWorkflow(
  config: WorkflowConfig,
): WorkflowValidationResult {
  const errors: WorkflowValidationError[] = [];
  const warnings: WorkflowValidationWarning[] = [];

  // Schema validation
  const schemaResult = validateWorkflowConfig(config);
  if (!schemaResult.success && schemaResult.error) {
    schemaResult.error.errors.forEach((err) => {
      errors.push({
        field: err.path.join("."),
        message: err.message,
        code: "SCHEMA_VALIDATION_ERROR",
        severity: "error",
      });
    });
  }

  // Validate models
  const modelValidation = validateModels(config.models);
  errors.push(...modelValidation.errors);
  warnings.push(...modelValidation.warnings);

  // Validate judge configuration (if present)
  if (hasJudge(config)) {
    const judgeValidation = validateJudges(getAllJudges(config));
    errors.push(...judgeValidation.errors);
    warnings.push(...judgeValidation.warnings);
  }

  // Validate workflow type-specific requirements
  const typeValidation = validateWorkflowType(config);
  errors.push(...typeValidation.errors);
  warnings.push(...typeValidation.warnings);

  // Validate execution configuration
  const executionValidation = validateExecutionConfig(config);
  errors.push(...executionValidation.errors);
  warnings.push(...executionValidation.warnings);

  // Check for conflicts
  const conflictValidation = validateNoConflicts(config);
  errors.push(...conflictValidation.errors);
  warnings.push(...conflictValidation.warnings);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate model configurations
 * @param models - Array of model configurations to validate
 * @returns Validation issues including errors and warnings
 */
function validateModels(models: ModelConfig[]): ValidationIssues {
  const errors: WorkflowValidationError[] = [];
  const warnings: WorkflowValidationWarning[] = [];

  if (models.length === 0) {
    errors.push({
      field: "models",
      message: "At least one model is required",
      code: "NO_MODELS",
      severity: "critical",
    });
    return { errors, warnings };
  }

  // Validate each model
  models.forEach((model, index) => {
    if (!model.provider || model.provider.trim() === "") {
      errors.push({
        field: `models[${index}].provider`,
        message: "Model provider is required",
        code: "MISSING_PROVIDER",
        severity: "error",
      });
    }

    if (!model.model || model.model.trim() === "") {
      errors.push({
        field: `models[${index}].model`,
        message: "Model name is required",
        code: "MISSING_MODEL_NAME",
        severity: "error",
      });
    }

    // Validate temperature range
    if (model.temperature !== undefined) {
      if (model.temperature < 0 || model.temperature > 2) {
        warnings.push({
          field: `models[${index}].temperature`,
          message: `Temperature ${model.temperature} is outside typical range (0-2)`,
          code: "TEMPERATURE_OUT_OF_RANGE",
          recommendation: "Use temperature between 0 and 1 for most use cases",
        });
      }
    }

    // Validate timeout
    if (model.timeout !== undefined && model.timeout < 1000) {
      warnings.push({
        field: `models[${index}].timeout`,
        message: `Timeout ${model.timeout}ms is very short`,
        code: "SHORT_TIMEOUT",
        recommendation: "Consider using at least 5000ms for model timeout",
      });
    }

    // Validate weight
    if (model.weight !== undefined) {
      if (model.weight < 0 || model.weight > 1) {
        errors.push({
          field: `models[${index}].weight`,
          message: `Weight must be between 0 and 1, got ${model.weight}`,
          code: "INVALID_WEIGHT",
          severity: "error",
        });
      }
    }
  });

  // Check for duplicate models
  const modelKeys = models.map((m) => `${m.provider}/${m.model}`);
  const duplicates = modelKeys.filter(
    (key, index) => modelKeys.indexOf(key) !== index,
  );
  if (duplicates.length > 0) {
    warnings.push({
      field: "models",
      message: `Duplicate models detected: ${duplicates.join(", ")}`,
      code: "DUPLICATE_MODELS",
      recommendation: "Using the same model multiple times may not add value",
    });
  }

  // Warn if too many models (cost concern)
  if (models.length > 5) {
    warnings.push({
      field: "models",
      message: `Using ${models.length} models may result in high costs and latency`,
      code: "MANY_MODELS",
      recommendation:
        "Consider using 2-4 models for optimal cost/quality balance",
    });
  }

  return { errors, warnings };
}

/**
 * Validate judge configurations
 * @param judges - Array of judge configurations to validate
 * @returns Validation issues including errors and warnings
 */
function validateJudges(judges: JudgeConfig[]): ValidationIssues {
  const errors: WorkflowValidationError[] = [];
  const warnings: WorkflowValidationWarning[] = [];

  judges.forEach((judge, index) => {
    const prefix = judges.length > 1 ? `judges[${index}]` : "judge";

    // Validate required fields
    if (!judge.provider || judge.provider.trim() === "") {
      errors.push({
        field: `${prefix}.provider`,
        message: "Judge provider is required",
        code: "MISSING_JUDGE_PROVIDER",
        severity: "error",
      });
    }

    if (!judge.model || judge.model.trim() === "") {
      errors.push({
        field: `${prefix}.model`,
        message: "Judge model is required",
        code: "MISSING_JUDGE_MODEL",
        severity: "error",
      });
    }

    if (!judge.criteria || judge.criteria.length === 0) {
      errors.push({
        field: `${prefix}.criteria`,
        message: "At least one evaluation criterion is required",
        code: "NO_CRITERIA",
        severity: "error",
      });
    }

    // Validate score scale (must be MIN_SCORE-MAX_SCORE for testing phase)
    if (judge.scoreScale) {
      if (
        judge.scoreScale.min !== MIN_SCORE ||
        judge.scoreScale.max !== MAX_SCORE
      ) {
        errors.push({
          field: "judge.scoreScale",
          message: `Score scale must be ${MIN_SCORE}-${MAX_SCORE} for testing phase`,
          code: "INVALID_SCORE_SCALE",
          severity: "error",
        });
      }
    }

    // Check includeReasoning is true
    if (!judge.includeReasoning) {
      errors.push({
        field: `${prefix}.includeReasoning`,
        message: "includeReasoning must be true for testing phase",
        code: "REASONING_REQUIRED",
        severity: "error",
      });
    }

    // Warn if temperature is high
    if (judge.temperature !== undefined && judge.temperature > 0.3) {
      warnings.push({
        field: `${prefix}.temperature`,
        message: `Judge temperature ${judge.temperature} is high`,
        code: "HIGH_JUDGE_TEMPERATURE",
        recommendation:
          "Use low temperature (0.1-0.2) for consistent judge evaluation",
      });
    }
  });

  // Warn if too many judges
  if (judges.length > 3) {
    warnings.push({
      field: "judges",
      message: `Using ${judges.length} judges may result in high costs`,
      code: "MANY_JUDGES",
      recommendation: "Consider using 1-2 judges for cost efficiency",
    });
  }

  return { errors, warnings };
}

/**
 * Validate workflow type-specific requirements
 * @param config - Workflow configuration to validate
 * @returns Validation issues specific to workflow type
 */
function validateWorkflowType(config: WorkflowConfig): ValidationIssues {
  const errors: WorkflowValidationError[] = [];
  const warnings: WorkflowValidationWarning[] = [];

  switch (config.type) {
    case "ensemble":
      if (config.models.length < 2) {
        errors.push({
          field: "models",
          message: "Ensemble workflows require at least 2 models",
          code: "INSUFFICIENT_MODELS",
          severity: "error",
        });
      }
      if (!hasJudge(config)) {
        warnings.push({
          field: "judge",
          message: "Ensemble workflows typically benefit from judge scoring",
          code: "NO_JUDGE",
          recommendation: "Consider adding a judge to evaluate responses",
        });
      }
      break;

    case "chain":
      // Chain workflows can have 1+ models
      if (config.models.length === 1) {
        warnings.push({
          field: "models",
          message: "Chain workflow has only one model",
          code: "SINGLE_MODEL_CHAIN",
          recommendation:
            "Chain workflows are most useful with multiple fallback models",
        });
      }
      break;

    case "adaptive":
      if (config.models.length < 2) {
        errors.push({
          field: "models",
          message: "Adaptive workflows require at least 2 models",
          code: "INSUFFICIENT_MODELS",
          severity: "error",
        });
      }
      break;

    case "custom":
      // Custom workflows have flexible requirements
      break;
  }

  return { errors, warnings };
}

/**
 * Validate execution configuration
 * @param config - Workflow configuration with execution settings
 * @returns Validation issues related to execution configuration
 */
function validateExecutionConfig(config: WorkflowConfig): ValidationIssues {
  const errors: WorkflowValidationError[] = [];
  const warnings: WorkflowValidationWarning[] = [];

  if (!config.execution) {
    return { errors, warnings };
  }

  const exec = config.execution;

  // Validate timeout hierarchy
  if (exec.timeout && exec.modelTimeout && exec.timeout < exec.modelTimeout) {
    errors.push({
      field: "execution.timeout",
      message: "Total timeout cannot be less than model timeout",
      code: "INVALID_TIMEOUT_HIERARCHY",
      severity: "error",
    });
  }

  // Validate minResponses vs model count
  if (exec.minResponses && exec.minResponses > config.models.length) {
    errors.push({
      field: "execution.minResponses",
      message: `minResponses (${exec.minResponses}) cannot exceed model count (${config.models.length})`,
      code: "INVALID_MIN_RESPONSES",
      severity: "error",
    });
  }

  // Warn about aggressive parallelism
  if (exec.parallelism && exec.parallelism > 20) {
    warnings.push({
      field: "execution.parallelism",
      message: `High parallelism (${exec.parallelism}) may strain resources`,
      code: "HIGH_PARALLELISM",
      recommendation: "Consider using parallelism of 10-15 for stability",
    });
  }

  return { errors, warnings };
}

/**
 * Check for configuration conflicts
 * @param config - Workflow configuration to check for conflicts
 * @returns Validation issues related to conflicting settings
 */
function validateNoConflicts(config: WorkflowConfig): ValidationIssues {
  const errors: WorkflowValidationError[] = [];
  const warnings: WorkflowValidationWarning[] = [];

  // Cannot have both judge and judges
  if (config.judge && config.judges && config.judges.length > 0) {
    errors.push({
      field: "judge",
      message: 'Cannot specify both "judge" and "judges"',
      code: "CONFLICTING_JUDGE_CONFIG",
      severity: "error",
    });
  }

  // Early termination requires minResponses
  if (config.execution?.earlyTermination && !config.execution?.minResponses) {
    warnings.push({
      field: "execution.earlyTermination",
      message: "Early termination without minResponses may stop too early",
      code: "EARLY_TERMINATION_WITHOUT_MIN",
      recommendation: "Set minResponses when using early termination",
    });
  }

  return { errors, warnings };
}

/**
 * Log validation results
 * @param workflowId - ID of the workflow being validated
 * @param result - Validation result to log
 */
export function logValidationResults(
  workflowId: string,
  result: WorkflowValidationResult,
): void {
  if (!result.valid) {
    logger.error(`[${functionTag}] Workflow validation failed`, {
      workflowId,
      errorCount: result.errors.length,
      errors: result.errors.map((e) => ({
        field: e.field,
        message: e.message,
        code: e.code,
      })),
    });
  }

  if (result.warnings.length > 0) {
    logger.warn(`[${functionTag}] Workflow validation warnings`, {
      workflowId,
      warningCount: result.warnings.length,
      warnings: result.warnings.map((w) => ({
        field: w.field,
        message: w.message,
        code: w.code,
      })),
    });
  }

  if (result.valid && result.warnings.length === 0) {
    logger.debug(`[${functionTag}] Workflow validation passed`, {
      workflowId,
    });
  }
}

/**
 * Validate workflow at registration time
 * @param config - Workflow configuration to validate for registration
 * @returns Validation result with registration-specific checks
 */
export function validateForRegistration(
  config: WorkflowConfig,
): WorkflowValidationResult {
  const result = validateWorkflow(config);

  // Additional registration-specific checks
  if (!config.id || config.id.trim() === "") {
    result.errors.push({
      field: "id",
      message: "Workflow ID is required for registration",
      code: "MISSING_ID",
      severity: "critical",
    });
    result.valid = false;
  }

  if (!config.name || config.name.trim() === "") {
    result.errors.push({
      field: "name",
      message: "Workflow name is required for registration",
      code: "MISSING_NAME",
      severity: "critical",
    });
    result.valid = false;
  }

  return result;
}

/**
 * Validate workflow at execution time
 * @param config - Workflow configuration to validate for execution
 * @returns Validation result for execution-time checks
 */
export function validateForExecution(
  config: WorkflowConfig,
): WorkflowValidationResult {
  const result = validateWorkflow(config);

  // Execution-time checks are less strict
  // We allow warnings but fail on errors
  return result;
}
