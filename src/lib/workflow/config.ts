/**
 * workflow/config.ts
 * Configuration schemas, validation, and defaults
 *
 * Uses Zod for runtime validation and type safety
 */

import { z } from "zod";
import { AIProviderName } from "../constants/enums.js";
import type { JsonValue } from "../types/common.js";
import type {
  ConditioningConfig,
  ExecutionConfig,
  JudgeConfig,
  ModelConfig,
  ModelGroup,
  WorkflowConfig,
} from "./types.js";

// ============================================================================
// CONSTANTS
// ============================================================================

// Score scale constants for testing phase
export const MIN_SCORE = 0;
export const MAX_SCORE = 100;

// Reasoning length constraint for testing phase
export const MAX_REASONING_LENGTH = 200;

// Placeholder values for error cases
export const PLACEHOLDER_PROVIDER = "none";
export const PLACEHOLDER_MODEL = "none";

// Fixed creation timestamp for predefined workflows
export const WORKFLOW_CREATION_DATE = "2025-11-29T00:00:00.000Z";

// ============================================================================
// ZOD VALIDATION SCHEMAS
// ============================================================================

/**
 * JSON-safe metadata validation
 */
const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(JsonValueSchema),
    z.record(z.string(), JsonValueSchema),
  ]),
);

/**
 * Provider name validation - accepts any AIProviderName enum value or string
 */
const ProviderNameSchema = z
  .union([z.nativeEnum(AIProviderName), z.string().min(1)])
  .transform((val) => val as AIProviderName);

/**
 * Model configuration schema
 */
export const ModelConfigSchema = z.object({
  provider: ProviderNameSchema,
  model: z.string().min(1, "Model name is required"),
  weight: z.number().min(0).max(1).optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().optional(),
  systemPrompt: z.string().optional(),
  timeout: z.number().int().positive().optional(),
  topP: z.number().min(0).max(1).optional(),
  topK: z.number().int().positive().optional(),
  presencePenalty: z.number().min(-2).max(2).optional(),
  frequencyPenalty: z.number().min(-2).max(2).optional(),
  label: z.string().optional(),
  metadata: z.record(z.string(), JsonValueSchema).optional(),
});

/**
 * Judge configuration schema
 * NOTE: Testing phase enforces 0-100 score scale
 */
export const JudgeConfigSchema = z.object({
  provider: ProviderNameSchema,
  model: z.string().min(1, "Judge model is required"),
  criteria: z.array(z.string()).min(1, "At least one criterion required"),
  outputFormat: z.enum(["scores", "ranking", "best", "detailed"]),
  customPrompt: z.string().optional(),
  systemPrompt: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().optional(),
  timeout: z.number().int().positive().optional(),
  blindEvaluation: z.boolean().optional(),
  includeReasoning: z.boolean(),
  scoreScale: z.object({
    min: z.literal(0),
    max: z.literal(100),
  }),
  label: z.string().optional(),
  metadata: z.record(z.string(), JsonValueSchema).optional(),
});

/**
 * Conditioning configuration schema
 */
export const ConditioningConfigSchema = z.object({
  useConfidence: z.boolean(),
  confidenceThresholds: z
    .object({
      high: z.number().min(0).max(1),
      medium: z.number().min(0).max(1),
      low: z.number().min(0).max(1),
    })
    .optional(),
  toneAdjustment: z.enum(["soften", "strengthen", "neutral"]).optional(),
  includeMetadata: z.boolean().optional(),
  metadataFields: z.array(z.string()).optional(),
  addConfidenceStatement: z.boolean().optional(),
  addModelAttribution: z.boolean().optional(),
  addExecutionTime: z.boolean().optional(),
  metadata: z.record(z.string(), JsonValueSchema).optional(),
});

/**
 * Model group schema for layer-based execution
 */
export const ModelGroupSchema = z.object({
  id: z.string().min(1, "Group ID is required"),
  name: z.string().optional(),
  description: z.string().optional(),
  models: z
    .array(ModelConfigSchema)
    .min(1, "Group must have at least one model"),
  executionStrategy: z.enum(["parallel", "sequential"]),
  continueOnFailure: z.boolean().optional().default(true),
  minSuccessful: z.number().int().positive().optional().default(1),
  parallelism: z.number().int().positive().optional(),
  timeout: z.number().int().positive().optional(),
  metadata: z.record(z.string(), JsonValueSchema).optional(),
});

/**
 * Execution configuration schema
 */
export const ExecutionConfigSchema = z.object({
  timeout: z.number().int().positive().optional(),
  modelTimeout: z.number().int().positive().optional(),
  judgeTimeout: z.number().int().positive().optional(),
  retries: z.number().int().min(0).max(5).optional(),
  retryDelay: z.number().int().positive().optional(),
  retryableErrors: z.array(z.string()).optional(),
  parallelism: z.number().int().positive().optional(),
  earlyTermination: z.boolean().optional(),
  minResponses: z.number().int().positive().optional(),
  maxCost: z.number().positive().optional(),
  costThreshold: z.number().positive().optional(),
  enableMetrics: z.boolean().optional(),
  enableTracing: z.boolean().optional(),
  metadata: z.record(z.string(), JsonValueSchema).optional(),
});

/**
 * Complete workflow configuration schema
 */
const WorkflowConfigSchemaBase = z.object({
  id: z.string().min(1, "Workflow ID is required"),
  name: z.string().min(1, "Workflow name is required"),
  description: z.string().optional(),
  version: z.string().optional(),
  type: z.enum(["ensemble", "chain", "adaptive", "custom"]),
  models: z.array(ModelConfigSchema).min(1, "At least one model required"),
  modelGroups: z.array(ModelGroupSchema).optional(),
  defaultSystemPrompt: z.string().optional(),
  defaultJudgePrompt: z.string().optional(),
  judge: JudgeConfigSchema.optional(),
  judges: z.array(JudgeConfigSchema).optional(),
  conditioning: ConditioningConfigSchema.optional(),
  execution: ExecutionConfigSchema.optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.string(), JsonValueSchema).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

type WorkflowConfigSchemaType = z.infer<typeof WorkflowConfigSchemaBase>;

export const WorkflowConfigSchema = WorkflowConfigSchemaBase.refine(
  (data: WorkflowConfigSchemaType) => {
    // Cannot have both judge and judges
    if (data.judge && data.judges) {
      return false;
    }
    return true;
  },
  {
    message: 'Cannot specify both "judge" and "judges" - use one or the other',
  },
).refine(
  (data: WorkflowConfigSchemaType) => {
    // Ensemble and adaptive need at least 2 models
    // Check flat models array if modelGroups not provided
    if (data.type === "ensemble" || data.type === "adaptive") {
      if (data.modelGroups && data.modelGroups.length > 0) {
        // Count total models across all groups
        const totalModels = data.modelGroups.reduce(
          (sum, group) => sum + group.models.length,
          0,
        );
        return totalModels >= 2;
      } else {
        // Check flat models array
        return data.models.length >= 2;
      }
    }
    return true;
  },
  {
    message: "Ensemble and adaptive workflows require at least 2 models",
  },
);

// ============================================================================
// DEFAULT CONFIGURATIONS
// ============================================================================

/**
 * Default conditioning configuration
 * NOTE: Testing phase - stub only, no actual conditioning applied
 */
export const DEFAULT_CONDITIONING_CONFIG: ConditioningConfig = {
  useConfidence: true,
  confidenceThresholds: {
    high: 0.8,
    medium: 0.5,
    low: 0.3,
  },
  toneAdjustment: "neutral",
  includeMetadata: false,
  addConfidenceStatement: false,
  addModelAttribution: false,
  addExecutionTime: false,
};

/**
 * Default execution configuration
 */
export const DEFAULT_EXECUTION_CONFIG: ExecutionConfig = {
  timeout: 30000, // 30 seconds total
  modelTimeout: 15000, // 15 seconds per model
  judgeTimeout: 10000, // 10 seconds for judge
  retries: 1,
  retryDelay: 1000,
  retryableErrors: ["ETIMEDOUT", "ECONNRESET", "ENOTFOUND"],
  parallelism: 10,
  earlyTermination: false,
  minResponses: 1,
  enableMetrics: true,
  enableTracing: false,
};

/**
 * Default score scale (0-100 for testing phase)
 */
export const DEFAULT_SCORE_SCALE = {
  min: 0,
  max: 100,
} as const;

// ============================================================================
// HELPER FUNCTIONS FOR MODEL GROUPS
// ============================================================================

/**
 * Check if workflow uses layer-based execution (modelGroups)
 * @param config - Workflow configuration
 * @returns True if modelGroups is defined and has groups
 */
export function usesModelGroups(config: WorkflowConfig): boolean {
  return !!(config.modelGroups && config.modelGroups.length > 0);
}

/**
 * Get all models from workflow (either from flat array or groups)
 * @param config - Workflow configuration
 * @returns Array of all model configs
 */
export function getAllModels(config: WorkflowConfig): ModelConfig[] {
  if (usesModelGroups(config)) {
    return config.modelGroups?.flatMap((group) => group.models) ?? [];
  }
  return config.models;
}

/**
 * Get model groups (converts flat models to single group if needed)
 * @param config - Workflow configuration
 * @returns Array of model groups
 */
export function getModelGroups(config: WorkflowConfig): ModelGroup[] {
  if (usesModelGroups(config)) {
    return config.modelGroups ?? [];
  }

  // Convert flat models array to single parallel group for backward compatibility
  return [
    {
      id: "default-group",
      name: "All Models",
      models: config.models,
      executionStrategy: "parallel",
      continueOnFailure: true,
      minSuccessful: config.execution?.minResponses || 1,
    },
  ];
}

/**
 * Default judge configuration values
 */
export const DEFAULT_JUDGE_CONFIG = {
  temperature: 0.1, // Low temperature for consistent judging
  outputFormat: "detailed" as const,
  blindEvaluation: false,
  includeReasoning: true,
  scoreScale: DEFAULT_SCORE_SCALE,
};

// ============================================================================
// CONFIGURATION HELPERS
// ============================================================================

/**
 * Merge configuration with defaults
 * @param config - Workflow configuration to merge
 * @returns Complete workflow configuration with defaults applied
 */
export function mergeWithDefaults(config: WorkflowConfig): WorkflowConfig {
  return {
    ...config,
    conditioning: config.conditioning
      ? { ...DEFAULT_CONDITIONING_CONFIG, ...config.conditioning }
      : DEFAULT_CONDITIONING_CONFIG,
    execution: config.execution
      ? { ...DEFAULT_EXECUTION_CONFIG, ...config.execution }
      : DEFAULT_EXECUTION_CONFIG,
    createdAt: config.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Validation result for workflow configuration
 */
export type WorkflowConfigValidationResult = {
  success: boolean;
  data?: WorkflowConfig;
  error?: z.ZodError;
};

/**
 * Validate workflow configuration
 * @param config - Partial workflow configuration to validate
 * @returns Validation result with parsed data or error details
 */
export function validateWorkflowConfig(
  config: Partial<WorkflowConfig>,
): WorkflowConfigValidationResult {
  const result = WorkflowConfigSchema.safeParse(config);

  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Create workflow configuration from partial
 * @param partial - Partial configuration with required fields (id, name, type, models)
 * @returns Complete workflow configuration with defaults applied
 */
export function createWorkflowConfig(
  partial: Partial<WorkflowConfig> &
    Pick<WorkflowConfig, "id" | "name" | "type" | "models">,
): WorkflowConfig {
  const base: WorkflowConfig = {
    id: partial.id,
    name: partial.name,
    type: partial.type,
    models: partial.models,
    description: partial.description,
    version: partial.version,
    judge: partial.judge,
    judges: partial.judges,
    conditioning: partial.conditioning,
    execution: partial.execution,
    tags: partial.tags,
    metadata: partial.metadata,
  };

  return mergeWithDefaults(base);
}

/**
 * Validation result for model configuration
 */
export type ModelConfigValidationResult = {
  success: boolean;
  data?: ModelConfig;
  error?: z.ZodError;
};

/**
 * Validate model configuration
 * @param config - Partial model configuration to validate
 * @returns Validation result with parsed data or error details
 */
export function validateModelConfig(
  config: Partial<ModelConfig>,
): ModelConfigValidationResult {
  const result = ModelConfigSchema.safeParse(config);

  if (result.success) {
    return { success: true, data: result.data as ModelConfig };
  }
  return { success: false, error: result.error };
}

/**
 * Validation result for judge configuration
 */
export type JudgeConfigValidationResult = {
  success: boolean;
  data?: JudgeConfig;
  error?: z.ZodError;
};

/**
 * Validate judge configuration
 * @param config - Partial judge configuration to validate
 * @returns Validation result with parsed data or error details
 */
export function validateJudgeConfig(
  config: Partial<JudgeConfig>,
): JudgeConfigValidationResult {
  const result = JudgeConfigSchema.safeParse(config);

  if (result.success) {
    return { success: true, data: result.data as JudgeConfig };
  }
  return { success: false, error: result.error };
}

/**
 * Check if workflow has judge configuration
 * @param config - Workflow configuration to check
 * @returns True if workflow has at least one judge configured
 */
export function hasJudge(config: WorkflowConfig): boolean {
  return !!(config.judge || (config.judges && config.judges.length > 0));
}

/**
 * Get all judges from workflow configuration
 * @param config - Workflow configuration
 * @returns Array of all judge configurations (empty if none)
 */
export function getAllJudges(config: WorkflowConfig): JudgeConfig[] {
  if (config.judges && config.judges.length > 0) {
    return config.judges;
  }
  if (config.judge) {
    return [config.judge];
  }
  return [];
}

/**
 * Calculate estimated workflow cost (placeholder)
 * TODO: Implement actual provider-specific pricing
 * @param config - Workflow configuration
 * @param estimatedTokens - Estimated number of tokens for the request
 * @returns Estimated cost in USD
 */
export function estimateWorkflowCost(
  config: WorkflowConfig,
  estimatedTokens: number,
): number {
  const modelCount = config.models.length;
  const judgeCount = getAllJudges(config).length;

  // Placeholder cost calculation ($0.00001 per token)
  const modelsCost = modelCount * estimatedTokens * 0.00001;
  const judgesCost = judgeCount * estimatedTokens * 0.5 * 0.00001; // Judges use ~50% tokens

  return modelsCost + judgesCost;
}
