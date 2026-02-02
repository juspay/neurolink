---
title: Workflow Engine - Low-Level Design
description: Low-level design documentation for NeuroLink's workflow engine implementation with code examples and API details
slug: /workflow-engine-lld
keywords:
  - workflow
  - implementation
  - api
  - ensemble
  - judge-scoring
sidebar_position: 99
---

# Neurolink Workflow Engine - Low-Level Design (LLD)

**Version**: 1.0  
**Date**: November 28, 2025  
**Status**: Implementation Complete  
**Author**: Neurolink Team

---

## 📋 Document Overview

This document provides detailed implementation specifications for the Neurolink Workflow Engine, including:

- Detailed module interfaces and method signatures
- Data structures and type definitions
- Algorithm implementations
- Integration patterns with existing codebase
- Error handling strategies
- Testing approach

---

## 🗂️ File Structure

```text
src/
├── lib/
│   ├── workflow/
│   │   ├── index.ts                        # Public API exports (60 lines)
│   │   ├── types.ts                        # Type definitions (250 lines)
│   │   ├── config.ts                       # Configuration schemas (150 lines)
│   │   │
│   │   ├── core/
│   │   │   ├── workflowRunner.ts          # Main orchestrator (400 lines)
│   │   │   ├── workflowRegistry.ts        # Workflow management (200 lines)
│   │   │   ├── ensembleExecutor.ts        # Parallel execution (300 lines)
│   │   │   ├── judgeScorer.ts             # Judge scoring logic (350 lines)
│   │   │   └── responseConditioner.ts     # Response conditioning (200 lines)
│   │   │
│   │   ├── workflows/                      # Built-in workflows (800 lines total)
│   │   │   ├── consensusWorkflow.ts       # Consensus pattern (200 lines)
│   │   │   ├── fallbackWorkflow.ts        # Fallback chain (150 lines)
│   │   │   ├── multiJudgeWorkflow.ts      # Multi-judge voting (250 lines)
│   │   │   └── adaptiveWorkflow.ts        # Adaptive selection (200 lines)
│   │   │
│   │   └── utils/
│   │       ├── workflowValidation.ts      # Validation utilities (250 lines)
│   │       └── workflowMetrics.ts         # Metrics tracking (150 lines)
│   │
│   ├── neurolink.ts                        # MODIFY: Add workflow methods (20 lines)
│   └── index.ts                            # MODIFY: Export workflow types (10 lines)
```

**Total Estimated Lines**: ~3,000 lines

---

## 📦 Module Specifications

---

## 1. Types Module (`workflow/types.ts`)

### Core Type Definitions

```typescript
/**
 * workflow/types.ts
 * Core type definitions for the Workflow Engine
 */

import type {
  AIProviderName,
  AnalyticsData,
  EvaluationData,
} from "../lib/core/types.js";
import type { JsonValue } from "../lib/types/common.js";

// ============================================================================
// WORKFLOW CONFIGURATION TYPES
// ============================================================================

/**
 * Workflow type enumeration
 */
export type WorkflowType = "ensemble" | "chain" | "adaptive" | "custom";

/**
 * Judge output format
 */
export type JudgeOutputFormat = "scores" | "ranking" | "best" | "detailed";

/**
 * Tone adjustment strategy
 */
export type ToneAdjustment = "soften" | "strengthen" | "neutral";

/**
 * Complete workflow configuration
 */
export type WorkflowConfig = {
  // Identification
  id: string;
  name: string;
  description?: string;
  version?: string;

  // Workflow definition
  type: WorkflowType;
  models: ModelConfig[];

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
 */
export type ModelConfig = {
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
 */
export type JudgeConfig = {
  // Required fields
  provider: AIProviderName;
  model: string;
  criteria: string[]; // Evaluation criteria
  outputFormat: JudgeOutputFormat;

  // Optional configuration
  systemPrompt?: string; // Custom judge prompt
  temperature?: number; // Judge temperature (usually low)
  maxTokens?: number; // Max judge output
  timeout?: number; // Judge timeout (ms)

  // Advanced options
  blindEvaluation?: boolean; // Hide provider names
  includeReasoning: boolean; // REQUIRED: Always include short explanation
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
 */
export type ConditioningConfig = {
  // Confidence-based conditioning
  useConfidence: boolean;
  confidenceThresholds?: {
    high: number; // Default: 0.8
    medium: number; // Default: 0.5
    low: number; // Default: 0.3
  };

  // Tone adjustment
  toneAdjustment?: ToneAdjustment;

  // Metadata injection
  includeMetadata?: boolean;
  metadataFields?: string[]; // Which fields to include

  // Response formatting
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
  timeout?: number | string;

  // Additional options
  enableAnalytics?: boolean;
  enableEvaluation?: boolean;
  context?: Record<string, JsonValue>;
};

/**
 * Complete workflow execution result
 * NOTE: For testing phase - returns original content unchanged with evaluation metrics
 */
export type WorkflowResult = {
  // Primary output (ORIGINAL, UNMODIFIED)
  content: string;

  // Evaluation metrics (for AB testing)
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
  evaluation?: EvaluationData;

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
  reasoning?: string;
  confidenceInJudgment?: number;

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
 * Workflow execution error
 */
export type WorkflowError = Error & {
  code: string;
  workflowId: string;
  phase: "ensemble" | "judge" | "conditioning" | "validation";
  details?: Record<string, unknown>;
  retryable: boolean;
};
```

---

## 2. Configuration Module (`workflow/config.ts`)

### Configuration Schemas & Defaults

```typescript
/**
 * workflow/config.ts
 * Configuration schemas, validation, and defaults
 */

import { z } from "zod";
import type {
  WorkflowConfig,
  ModelConfig,
  JudgeConfig,
  ConditioningConfig,
  ExecutionConfig,
} from "./types.js";

// ============================================================================
// ZOD VALIDATION SCHEMAS
// ============================================================================

/**
 * Model configuration schema
 */
export const ModelConfigSchema = z.object({
  provider: z.string().min(1),
  model: z.string().min(1),
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
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Judge configuration schema
 */
export const JudgeConfigSchema = z.object({
  provider: z.string().min(1),
  model: z.string().min(1),
  criteria: z.array(z.string()).min(1),
  outputFormat: z.enum(["scores", "ranking", "best", "detailed"]),
  systemPrompt: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().optional(),
  timeout: z.number().int().positive().optional(),
  blindEvaluation: z.boolean().optional(),
  includeReasoning: z.boolean().optional(),
  scoreScale: z
    .object({
      min: z.number(),
      max: z.number(),
    })
    .optional(),
  label: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
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
  metadata: z.record(z.unknown()).optional(),
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
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Complete workflow configuration schema
 */
export const WorkflowConfigSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string().optional(),
    version: z.string().optional(),
    type: z.enum(["ensemble", "chain", "adaptive", "custom"]),
    models: z.array(ModelConfigSchema).min(1),
    judge: JudgeConfigSchema.optional(),
    judges: z.array(JudgeConfigSchema).optional(),
    conditioning: ConditioningConfigSchema.optional(),
    execution: ExecutionConfigSchema.optional(),
    tags: z.array(z.string()).optional(),
    metadata: z.record(z.unknown()).optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .refine(
    (data) => {
      // Cannot have both judge and judges
      if (data.judge && data.judges) {
        return false;
      }
      // Ensemble and adaptive need at least 2 models
      if (
        (data.type === "ensemble" || data.type === "adaptive") &&
        data.models.length < 2
      ) {
        return false;
      }
      return true;
    },
    {
      message:
        "Invalid workflow configuration: check judge/judges and model count",
    },
  );

// ============================================================================
// DEFAULT CONFIGURATIONS
// ============================================================================

/**
 * Default conditioning configuration
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
  addConfidenceStatement: true,
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
  parallelism: 10,
  earlyTermination: false,
  minResponses: 1,
  enableMetrics: true,
  enableTracing: false,
};

/**
 * Default judge score scale (0-100 for testing phase)
 */
export const DEFAULT_SCORE_SCALE = {
  min: 0,
  max: 100,
};

// ============================================================================
// CONFIGURATION HELPERS
// ============================================================================

/**
 * Merge configuration with defaults
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
 * Validate workflow configuration
 */
export function validateWorkflowConfig(config: unknown): {
  success: boolean;
  data?: WorkflowConfig;
  error?: z.ZodError;
} {
  const result = WorkflowConfigSchema.safeParse(config);

  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, error: result.error };
  }
}

/**
 * Create configuration from partial
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
    ...partial,
  };

  return mergeWithDefaults(base);
}
```

---

## 3. Workflow Runner (`workflow/core/workflowRunner.ts`)

### Main Orchestrator Implementation

```typescript
/**
 * workflow/core/workflowRunner.ts
 * Main workflow orchestrator - coordinates ensemble, judge, and conditioning
 */

import type {
  WorkflowConfig,
  WorkflowInput,
  WorkflowResult,
  WorkflowGenerateOptions,
  EnsembleResponse,
  JudgeScores,
  MultiJudgeScores,
  AggregatedUsage,
  WorkflowAnalytics,
} from "../types.js";
import { EnsembleExecutor } from "./ensembleExecutor.js";
import { JudgeScorer } from "./judgeScorer.js";
import { ResponseConditioner } from "./responseConditioner.js";
import { logger } from "../../lib/utils/logger.js";
import { WorkflowError } from "../utils/workflowValidation.js";
import { WorkflowMetrics } from "../utils/workflowMetrics.js";

/**
 * Main workflow execution orchestrator
 */
export class WorkflowRunner {
  private ensembleExecutor: EnsembleExecutor;
  private judgeScorer: JudgeScorer;
  private responseConditioner: ResponseConditioner;
  private metrics: WorkflowMetrics;

  constructor() {
    this.ensembleExecutor = new EnsembleExecutor();
    this.judgeScorer = new JudgeScorer();
    this.responseConditioner = new ResponseConditioner();
    this.metrics = new WorkflowMetrics();
  }

  /**
   * Execute workflow end-to-end
   */
  async execute(
    config: WorkflowConfig,
    options: WorkflowGenerateOptions,
  ): Promise<WorkflowResult> {
    const functionTag = "WorkflowRunner.execute";
    const startTime = Date.now();

    logger.info(`[${functionTag}] Starting workflow execution`, {
      workflowId: config.id,
      workflowType: config.type,
      models: config.models.length,
    });

    try {
      // Phase 1: Execute ensemble
      const ensembleStart = Date.now();
      const ensembleResponses = await this.executeEnsemblePhase(
        config,
        options.input,
      );
      const ensembleTime = Date.now() - ensembleStart;

      logger.debug(`[${functionTag}] Ensemble phase complete`, {
        responses: ensembleResponses.length,
        successful: ensembleResponses.filter((r) => r.status === "success")
          .length,
        time: ensembleTime,
      });

      // Phase 2: Judge scoring (optional)
      let judgeScores: JudgeScores | MultiJudgeScores | undefined;
      let judgeTime = 0;

      if (config.judge || config.judges) {
        const judgeStart = Date.now();
        judgeScores = await this.executeJudgePhase(config, ensembleResponses);
        judgeTime = Date.now() - judgeStart;

        logger.debug(`[${functionTag}] Judge phase complete`, {
          judgeTime,
          bestResponse: judgeScores.bestResponse,
        });
      }

      // Phase 3: Extract score and reasoning (NO CONDITIONING in testing phase)
      const { score, reasoning } = this.extractScoreAndReasoning(judgeScores);

      // Use original best response content (UNCHANGED)
      const selectedResponse = this.selectBestResponse(
        ensembleResponses,
        judgeScores,
      );
      const finalContent = selectedResponse.content;

      // Calculate final metrics
      const totalTime = Date.now() - startTime;
      const usage = this.aggregateUsage(ensembleResponses, judgeScores);
      const analytics = this.createAnalytics(
        config,
        ensembleResponses,
        judgeScores,
        totalTime,
      );

      // Build complete result (TESTING PHASE: original content + evaluation)
      const result: WorkflowResult = {
        content: finalContent, // ORIGINAL, UNMODIFIED
        score, // 0-100
        reasoning, // Short summary
        ensembleResponses,
        judgeScores,
        selectedResponse,
        confidence: this.calculateConfidence(ensembleResponses, judgeScores),
        consensus: this.calculateConsensus(ensembleResponses),
        totalTime,
        ensembleTime,
        judgeTime: judgeTime > 0 ? judgeTime : undefined,
        workflow: config.id,
        workflowName: config.name,
        workflowVersion: config.version,
        usage,
        cost: this.calculateTotalCost(usage),
        analytics,
        metadata: {
          ...config.metadata,
        },
        timestamp: new Date().toISOString(),
      };

      // Comprehensive logging for AB testing evaluation
      logger.info(`[${functionTag}] Workflow execution complete`, {
        workflowId: config.id,
        workflowType: config.type,
        totalTime,
        ensembleTime,
        judgeTime,
        score: result.score,
        reasoning: result.reasoning,
        confidence: result.confidence,
        consensus: result.consensus,
        modelsExecuted: ensembleResponses.length,
        modelsSuccessful: ensembleResponses.filter(
          (r) => r.status === "success",
        ).length,
        selectedModel: `${selectedResponse.provider}/${selectedResponse.model}`,
        allScores: judgeScores?.scores,
        timestamp: result.timestamp,
      });

      // Record metrics
      this.metrics.recordExecution(config.id, result);

      return result;
    } catch (error) {
      logger.error(`[${functionTag}] Workflow execution failed`, {
        workflowId: config.id,
        error: error instanceof Error ? error.message : String(error),
      });

      throw new WorkflowError(
        `Workflow execution failed: ${error instanceof Error ? error.message : String(error)}`,
        {
          code: "WORKFLOW_EXECUTION_FAILED",
          workflowId: config.id,
          phase: "execution",
          retryable: true,
        },
      );
    }
  }

  /**
   * Execute ensemble phase
   */
  private async executeEnsemblePhase(
    config: WorkflowConfig,
    input: WorkflowInput,
  ): Promise<EnsembleResponse[]> {
    const functionTag = "WorkflowRunner.executeEnsemblePhase";

    try {
      const responses = await this.ensembleExecutor.execute(
        config.models,
        input,
        config.execution,
      );

      // Validate minimum responses
      const successfulResponses = responses.filter(
        (r) => r.status === "success",
      );
      const minResponses = config.execution?.minResponses || 1;

      if (successfulResponses.length < minResponses) {
        throw new Error(
          `Insufficient successful responses: ${successfulResponses.length} < ${minResponses}`,
        );
      }

      return responses;
    } catch (error) {
      logger.error(`[${functionTag}] Ensemble execution failed`, { error });
      throw error;
    }
  }

  /**
   * Execute judge phase
   */
  private async executeJudgePhase(
    config: WorkflowConfig,
    responses: EnsembleResponse[],
  ): Promise<JudgeScores | MultiJudgeScores> {
    const functionTag = "WorkflowRunner.executeJudgePhase";

    try {
      // Filter successful responses only
      const validResponses = responses.filter((r) => r.status === "success");

      if (validResponses.length === 0) {
        throw new Error("No valid responses to judge");
      }

      // Multi-judge workflow
      if (config.judges && config.judges.length > 0) {
        return await this.judgeScorer.scoreMultiJudge(
          validResponses,
          config.judges,
          config.execution,
        );
      }

      // Single judge workflow
      if (config.judge) {
        return await this.judgeScorer.score(
          validResponses,
          config.judge,
          config.execution,
        );
      }

      throw new Error("No judge configuration provided");
    } catch (error) {
      logger.error(`[${functionTag}] Judge scoring failed`, { error });
      throw error;
    }
  }

  /**
   * Extract score and reasoning from judge results
   * NOTE: Testing phase - no response modification
   */
  private extractScoreAndReasoning(
    judgeScores?: JudgeScores | MultiJudgeScores,
  ): { score: number; reasoning: string } {
    if (!judgeScores) {
      return { score: 0, reasoning: "No judge scoring performed" };
    }

    // Get best response score (0-100)
    const bestResponseId = judgeScores.bestResponse || "response-0";
    const score = judgeScores.scores[bestResponseId] || 0;

    // Get reasoning (keep it short)
    const reasoning = judgeScores.reasoning
      ? judgeScores.reasoning.slice(0, 200) // Max 200 chars for summary
      : "Score assigned by judge";

    return { score, reasoning };
  }

  /**
   * Select best response based on judge scores or fallback
   */
  private selectBestResponse(
    responses: EnsembleResponse[],
    judgeScores?: JudgeScores | MultiJudgeScores,
  ): EnsembleResponse {
    // Use judge selection if available
    if (judgeScores?.bestResponse) {
      const index = parseInt(judgeScores.bestResponse.replace("response-", ""));
      return responses[index];
    }

    // Fallback: first successful response
    const successful = responses.find((r) => r.status === "success");
    if (successful) {
      return successful;
    }

    // Fallback: first response (even if failed)
    return responses[0];
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(
    responses: EnsembleResponse[],
    judgeScores?: JudgeScores | MultiJudgeScores,
  ): number {
    // If judge provided confidence
    if (
      judgeScores &&
      "confidenceInJudgment" in judgeScores &&
      judgeScores.confidenceInJudgment
    ) {
      return judgeScores.confidenceInJudgment;
    }

    // Calculate from judge scores
    if (judgeScores && "scores" in judgeScores) {
      const scores = Object.values(judgeScores.scores);
      const maxScore = Math.max(...scores);
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

      // Normalize to 0-1
      const scoreRange = 10; // Assuming 0-10 scale
      return (maxScore / scoreRange + avgScore / scoreRange) / 2;
    }

    // Fallback: based on success rate
    const successCount = responses.filter((r) => r.status === "success").length;
    return successCount / responses.length;
  }

  /**
   * Calculate consensus level
   */
  private calculateConsensus(responses: EnsembleResponse[]): number {
    const successful = responses.filter((r) => r.status === "success");
    if (successful.length < 2) {
      return 1.0; // Perfect consensus with single response
    }

    // Simple consensus: similarity in response lengths (placeholder)
    // TODO: Implement semantic similarity comparison
    const lengths = successful.map((r) => r.content.length);
    const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance =
      lengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) /
      lengths.length;
    const stdDev = Math.sqrt(variance);

    // Normalize to 0-1 (lower std dev = higher consensus)
    return Math.max(0, 1 - stdDev / avgLength);
  }

  /**
   * Aggregate token usage
   */
  private aggregateUsage(
    responses: EnsembleResponse[],
    judgeScores?: JudgeScores | MultiJudgeScores,
  ): AggregatedUsage {
    const byModel = responses
      .filter((r) => r.usage)
      .map((r) => ({
        provider: r.provider,
        model: r.model,
        inputTokens: r.usage!.inputTokens,
        outputTokens: r.usage!.outputTokens,
        totalTokens: r.usage!.totalTokens,
      }));

    const totalInputTokens = byModel.reduce((sum, m) => sum + m.inputTokens, 0);
    const totalOutputTokens = byModel.reduce(
      (sum, m) => sum + m.outputTokens,
      0,
    );

    return {
      totalInputTokens,
      totalOutputTokens,
      totalTokens: totalInputTokens + totalOutputTokens,
      byModel,
    };
  }

  /**
   * Create workflow analytics
   */
  private createAnalytics(
    config: WorkflowConfig,
    responses: EnsembleResponse[],
    judgeScores: JudgeScores | MultiJudgeScores | undefined,
    totalTime: number,
  ): WorkflowAnalytics {
    const successful = responses.filter((r) => r.status === "success");
    const failed = responses.filter((r) => r.status !== "success");

    const modelResponseTimes: Record<string, number> = {};
    responses.forEach((r) => {
      modelResponseTimes[`${r.provider}/${r.model}`] = r.responseTime;
    });

    const sortedByTime = [...responses].sort(
      (a, b) => a.responseTime - b.responseTime,
    );

    return {
      workflowId: config.id,
      workflowType: config.type,
      modelsExecuted: responses.length,
      modelsSuccessful: successful.length,
      modelsFailed: failed.length,
      averageConfidence: this.calculateConfidence(responses, judgeScores),
      consensusLevel: this.calculateConsensus(responses),
      modelResponseTimes,
      fastestModel: sortedByTime[0]
        ? `${sortedByTime[0].provider}/${sortedByTime[0].model}`
        : undefined,
      slowestModel: sortedByTime[sortedByTime.length - 1]
        ? `${sortedByTime[sortedByTime.length - 1].provider}/${sortedByTime[sortedByTime.length - 1].model}`
        : undefined,
      totalCost: 0, // Calculated separately
      costByModel: {},
      provider: config.models[0].provider,
      model: config.models[0].model,
      tokens: {
        input: 0,
        output: 0,
        total: 0,
      },
      responseTime: totalTime,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Calculate total cost
   */
  private calculateTotalCost(usage: AggregatedUsage): number {
    // TODO: Implement actual cost calculation based on provider pricing
    return usage.totalTokens * 0.00001; // Placeholder
  }
}
```

---

## 4. Ensemble Executor (`workflow/core/ensembleExecutor.ts`)

### Parallel Model Execution

```typescript
/**
 * workflow/core/ensembleExecutor.ts
 * Executes multiple models in parallel for ensemble workflows
 */

import type {
  ModelConfig,
  WorkflowInput,
  EnsembleResponse,
  ExecutionConfig,
} from "../types.js";
import { AIProviderFactory } from "../../lib/core/factory.js";
import type { AIProvider } from "../../lib/core/types.js";
import { logger } from "../../lib/utils/logger.js";
import pLimit from "p-limit";

/**
 * Executes ensemble of models in parallel
 */
export class EnsembleExecutor {
  /**
   * Execute all models in parallel
   */
  async execute(
    models: ModelConfig[],
    input: WorkflowInput,
    execution?: ExecutionConfig,
  ): Promise<EnsembleResponse[]> {
    const functionTag = "EnsembleExecutor.execute";

    logger.debug(`[${functionTag}] Starting ensemble execution`, {
      models: models.length,
      parallelism: execution?.parallelism,
    });

    // Set up concurrency limit
    const limit = pLimit(execution?.parallelism || 10);

    // Execute all models in parallel
    const promises = models.map((modelConfig, index) =>
      limit(() => this.executeModel(modelConfig, input, index, execution)),
    );

    const responses = await Promise.all(promises);

    logger.debug(`[${functionTag}] Ensemble execution complete`, {
      total: responses.length,
      successful: responses.filter((r) => r.status === "success").length,
    });

    return responses;
  }

  /**
   * Execute single model
   */
  private async executeModel(
    modelConfig: ModelConfig,
    input: WorkflowInput,
    index: number,
    execution?: ExecutionConfig,
  ): Promise<EnsembleResponse> {
    const functionTag = "EnsembleExecutor.executeModel";
    const startTime = Date.now();

    try {
      logger.debug(`[${functionTag}] Executing model`, {
        provider: modelConfig.provider,
        model: modelConfig.model,
        index,
      });

      // Create provider instance
      const provider = await AIProviderFactory.createProvider(
        modelConfig.provider,
        modelConfig.model,
      );

      // Execute with timeout
      const timeout = modelConfig.timeout || execution?.modelTimeout || 15000;
      const result = await this.executeWithTimeout(
        provider,
        modelConfig,
        input,
        timeout,
      );

      const responseTime = Date.now() - startTime;

      // Build successful response
      const response: EnsembleResponse = {
        provider: modelConfig.provider,
        model: modelConfig.model,
        modelLabel: modelConfig.label,
        content: result.content,
        responseTime,
        usage: result.usage
          ? {
              inputTokens: result.usage.promptTokens || 0,
              outputTokens: result.usage.completionTokens || 0,
              totalTokens: result.usage.totalTokens || 0,
            }
          : undefined,
        status: "success",
        metadata: modelConfig.metadata,
        timestamp: new Date().toISOString(),
      };

      logger.debug(`[${functionTag}] Model execution successful`, {
        provider: modelConfig.provider,
        model: modelConfig.model,
        responseTime,
      });

      return response;
    } catch (error) {
      const responseTime = Date.now() - startTime;

      logger.warn(`[${functionTag}] Model execution failed`, {
        provider: modelConfig.provider,
        model: modelConfig.model,
        error: error instanceof Error ? error.message : String(error),
      });

      // Build error response
      return {
        provider: modelConfig.provider,
        model: modelConfig.model,
        modelLabel: modelConfig.label,
        content: "",
        responseTime,
        status:
          error instanceof Error && error.name === "TimeoutError"
            ? "timeout"
            : "failure",
        error: error instanceof Error ? error.message : String(error),
        metadata: modelConfig.metadata,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Execute provider with timeout
   */
  private async executeWithTimeout(
    provider: AIProvider,
    modelConfig: ModelConfig,
    input: WorkflowInput,
    timeout: number,
  ): Promise<{ content: string; usage?: any }> {
    return Promise.race([
      provider.generate({
        input: { text: input.text },
        systemPrompt: modelConfig.systemPrompt,
        temperature: modelConfig.temperature,
        maxTokens: modelConfig.maxTokens,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), timeout),
      ),
    ]);
  }
}
```

---

_Due to length constraints, I'll continue with the remaining modules in a structured format._

---

## 5. Judge Scorer (`workflow/core/judgeScorer.ts`) - Key Methods

```typescript
export class JudgeScorer {
  async score(
    responses: EnsembleResponse[],
    judgeConfig: JudgeConfig,
    execution?: ExecutionConfig,
  ): Promise<JudgeScores>;

  async scoreMultiJudge(
    responses: EnsembleResponse[],
    judgeConfigs: JudgeConfig[],
    execution?: ExecutionConfig,
  ): Promise<MultiJudgeScores>;

  private async executeJudge(
    responses: EnsembleResponse[],
    judgeConfig: JudgeConfig,
  ): Promise<JudgeScores>;

  private formatPromptForJudge(
    responses: EnsembleResponse[],
    judgeConfig: JudgeConfig,
  ): string;

  private parseJudgeResponse(
    judgeResponse: string,
    outputFormat: JudgeOutputFormat,
  ): JudgeScores;
}
```

**Key Algorithm**: Judge Prompt Generation

```typescript
private formatPromptForJudge(responses, judgeConfig): string {
  const responseTexts = responses.map((r, i) =>
    `Response ${i}: ${judgeConfig.blindEvaluation ? '' : `(${r.provider}/${r.model})`}\n${r.content}`
  ).join('\n\n');

  return `
You are an expert judge evaluating AI responses.

Criteria: ${judgeConfig.criteria.join(', ')}

Responses to evaluate:
${responseTexts}

Please score each response on a scale of ${scoreScale.min}-${scoreScale.max} for each criterion.
Return your evaluation in JSON format:
{
  "scores": { "response-0": 8.5, "response-1": 9.2 },
  "ranking": ["response-1", "response-0"],
  "bestResponse": "response-1",
  "reasoning": "Response 1 demonstrates..."
}
`;
}
```

---

## 6. Response Conditioner (`workflow/core/responseConditioner.ts`) - Key Methods

```typescript
export class ResponseConditioner {
  async condition(
    content: string,
    confidence: number,
    config: ConditioningConfig,
    context?: ConditioningContext,
  ): Promise<ConditionedResponse>;

  private adjustTone(
    content: string,
    confidence: number,
    adjustment: ToneAdjustment,
  ): string;

  private addMetadata(
    content: string,
    config: ConditioningConfig,
    context: ConditioningContext,
  ): string;

  private getConfidenceStatement(confidence: number): string;
}
```

**Tone Adjustment Algorithm**:

```typescript
private adjustTone(content: string, confidence: number, adjustment: ToneAdjustment): string {
  const thresholds = config.confidenceThresholds;

  if (confidence >= thresholds.high) {
    // High confidence - assertive tone
    return adjustment === 'strengthen'
      ? `Definitively, ${content}`
      : content;
  } else if (confidence >= thresholds.medium) {
    // Medium confidence - balanced tone
    return adjustment === 'soften'
      ? `Based on the analysis, ${content}`
      : content;
  } else {
    // Low confidence - tentative tone
    return adjustment === 'soften'
      ? `It appears that ${content}. However, this conclusion has lower confidence.`
      : `Note: This response has lower confidence. ${content}`;
  }
}
```

---

## 7. Workflow Registry (`workflow/core/workflowRegistry.ts`) - Key Methods

```typescript
export class WorkflowRegistry {
  private workflows: Map<string, WorkflowConfig>;

  register(config: WorkflowConfig): void;
  unregister(id: string): boolean;
  get(id: string): WorkflowConfig | undefined;
  list(filter?: WorkflowFilter): WorkflowConfig[];
  validate(config: WorkflowConfig): WorkflowValidationResult;
  exists(id: string): boolean;
  update(id: string, updates: Partial<WorkflowConfig>): void;
}
```

---

## 8. Integration with NeuroLink Class

### Modifications to `src/lib/neurolink.ts`

```typescript
// Add import at top
import { WorkflowRunner } from "./workflow/core/workflowRunner.js";
import { workflowRegistry } from "./workflow/core/workflowRegistry.js";
import type {
  WorkflowConfig,
  WorkflowGenerateOptions,
  WorkflowResult,
} from "./workflow/types.js";

export class NeuroLink {
  // Add workflow runner instance
  private workflowRunner: WorkflowRunner;

  constructor(options?: NeuroLinkOptions) {
    // ... existing code ...
    this.workflowRunner = new WorkflowRunner();
  }

  /**
   * Execute a workflow with ensemble and judge via generate()
   * Workflows are accessed through the workflowConfig option
   */
  async generate(
    options: GenerateOptions & { workflowConfig?: WorkflowConfig },
  ): Promise<GenerateResult | WorkflowResult> {
    if (options.workflowConfig) {
      // Workflow execution path
      return await this.workflowRunner.execute(options.workflowConfig, options);
    }
    // ... existing generate logic
  }
}

// Standalone registry functions (not class methods)
import {
  registerWorkflow,
  listWorkflows,
  getWorkflow,
} from "@juspay/neurolink/workflow";

// Register custom workflow
registerWorkflow(config);

// List available workflows
const workflows = listWorkflows();

// Get workflow configuration
const workflow = getWorkflow("consensus-3");
```

---

## 9. Testing Strategy

### Unit Tests

```typescript
// test/workflow/ensembleExecutor.test.ts
describe("EnsembleExecutor", () => {
  test("executes multiple models in parallel", async () => {
    const executor = new EnsembleExecutor();
    const responses = await executor.execute([...models], input);

    expect(responses).toHaveLength(3);
    expect(responses.filter((r) => r.status === "success")).toHaveLength(3);
  });

  test("handles individual model failures gracefully", async () => {
    // Mock one model to fail
    const responses = await executor.execute([...models], input);

    expect(responses).toHaveLength(3);
    expect(responses.filter((r) => r.status === "failure")).toHaveLength(1);
  });

  test("respects timeout configuration", async () => {
    const responses = await executor.execute(
      [{ ...model, timeout: 100 }],
      input,
    );

    expect(responses[0].status).toBe("timeout");
  });
});
```

### Integration Tests

```typescript
// test/workflow/integration/workflow.test.ts
describe("Workflow Integration", () => {
  test("executes consensus workflow end-to-end", async () => {
    const neuro = new NeuroLink();
    const workflowConfig = getWorkflow("consensus-3");

    const result = await neuro.generate({
      workflowConfig,
      input: { text: "Test query" },
    });

    expect(result.content).toBeDefined();
    expect(result.workflow?.ensembleResponses).toHaveLength(3);
    expect(result.workflow?.judgeScores).toBeDefined();
  });
});
```

---

## 10. Error Handling Strategy

### Error Hierarchy

```typescript
// workflow/utils/workflowErrors.ts
export class WorkflowError extends Error {
  constructor(
    message: string,
    public details: {
      code: string;
      workflowId: string;
      phase: "ensemble" | "judge" | "conditioning" | "validation";
      retryable: boolean;
      originalError?: Error;
    },
  ) {
    super(message);
    this.name = "WorkflowError";
  }
}

export class EnsembleExecutionError extends WorkflowError {
  constructor(
    workflowId: string,
    modelErrors: Array<{ model: string; error: Error }>,
  ) {
    super("Ensemble execution failed", {
      code: "ENSEMBLE_FAILED",
      workflowId,
      phase: "ensemble",
      retryable: true,
    });
  }
}

export class JudgeScoringError extends WorkflowError {
  constructor(workflowId: string, judgeError: Error) {
    super("Judge scoring failed", {
      code: "JUDGE_FAILED",
      workflowId,
      phase: "judge",
      retryable: true,
      originalError: judgeError,
    });
  }
}
```

### Retry Logic

```typescript
async executeWithRetry(
  config: WorkflowConfig,
  options: WorkflowGenerateOptions
): Promise<WorkflowResult> {
  const maxRetries = config.execution?.retries || 1;
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await this.execute(config, options);
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries && this.isRetriable(error)) {
        const delay = config.execution?.retryDelay || 1000;
        await new Promise(resolve => setTimeout(resolve, delay * (attempt + 1)));
        continue;
      }

      throw error;
    }
  }

  throw lastError!;
}
```

---

## 11. Performance Optimizations

### Parallel Execution Optimization

```typescript
// Use p-limit for controlled parallelism
const limit = pLimit(config.execution?.parallelism || 10);

// Batch model execution
const batches = chunk(models, limit);
const allResponses: EnsembleResponse[] = [];

for (const batch of batches) {
  const batchResponses = await Promise.all(
    batch.map((model) => limit(() => this.executeModel(model, input))),
  );
  allResponses.push(...batchResponses);
}
```

---

## 12. Observability & Monitoring

### Structured Logging

```typescript
logger.info("WorkflowExecution", {
  workflowId: config.id,
  workflowType: config.type,
  phase: "ensemble",
  models: config.models.length,
  duration: Date.now() - startTime,
  success: true,
});
```

### Metrics Collection

```typescript
// workflow/utils/workflowMetrics.ts
export class WorkflowMetrics {
  recordExecution(workflowId: string, result: WorkflowResult): void;
  recordModelLatency(provider: string, model: string, latency: number): void;
  recordJudgeLatency(provider: string, model: string, latency: number): void;
  recordError(workflowId: string, phase: string, error: Error): void;

  getMetrics(workflowId: string): WorkflowMetricsData;
  exportPrometheusMetrics(): string;
}
```

---

## 13. Security Considerations

### Input Validation

````typescript
// Sanitize all user inputs before passing to models
function sanitizeInput(input: string): string {
  // Remove potential prompt injection attempts
  return input
    .replace(/```[^`]*```/g, "") // Remove code blocks
    .replace(/<script[^>]*>.*?<\/script>/gi, "") // Remove scripts
    .trim();
}
````

### Cost Controls

```typescript
// Pre-execution cost estimation
async estimateCost(config: WorkflowConfig, input: WorkflowInput): Promise<number> {
  const estimatedTokens = estimateTokenCount(input.text);
  const modelCosts = config.models.map(m =>
    calculateModelCost(m.provider, m.model, estimatedTokens)
  );
  const totalCost = modelCosts.reduce((a, b) => a + b, 0);

  if (config.execution?.maxCost && totalCost > config.execution.maxCost) {
    throw new Error(`Estimated cost ${totalCost} exceeds limit ${config.execution.maxCost}`);
  }

  return totalCost;
}
```

---

## 14. Built-in Workflow Implementations

### Consensus Workflow

```typescript
// workflow/workflows/consensusWorkflow.ts
export const CONSENSUS_3_WORKFLOW: WorkflowConfig = {
  id: "consensus-3",
  name: "Three Model Consensus",
  description:
    "Cross-validate responses across 3 leading models with judge scoring",
  type: "ensemble",
  models: [
    {
      provider: "openai",
      model: "gpt-4o",
      temperature: 0.3,
      label: "OpenAI GPT-4o",
    },
    {
      provider: "anthropic",
      model: "claude-3-5-sonnet",
      temperature: 0.3,
      label: "Anthropic Claude 3.5 Sonnet",
    },
    {
      provider: "google-ai",
      model: "gemini-2.5-flash",
      temperature: 0.3,
      label: "Google Gemini 2.5 Flash",
    },
  ],
  judge: {
    provider: "openai",
    model: "gpt-4o",
    criteria: ["accuracy", "clarity", "completeness", "depth"],
    outputFormat: "detailed",
    temperature: 0.1,
    includeReasoning: true, // REQUIRED for testing
    scoreScale: {
      min: 0,
      max: 100, // Standard 0-100 scale
    },
  },
  conditioning: {
    useConfidence: true,
    toneAdjustment: "neutral",
    addConfidenceStatement: true,
    includeMetadata: false,
  },
  execution: {
    timeout: 30000,
    modelTimeout: 15000,
    judgeTimeout: 10000,
    minResponses: 2,
    enableMetrics: true,
  },
};
```

---

## 15. API Usage Examples

### Basic Usage

```typescript
import { NeuroLink } from "@juspay/neurolink";
import { getWorkflow, registerWorkflow } from "@juspay/neurolink/workflow";

const neuro = new NeuroLink();

// Use built-in workflow (TESTING PHASE)
const workflowConfig = getWorkflow("consensus-3");
const result = await neuro.generate({
  workflowConfig,
  input: { text: "Explain quantum entanglement" },
});

// Original response (unchanged)
console.log(result.content); // Original AI response

// Workflow metadata (when using workflowConfig)
console.log(result.workflow?.selectedModel); // Selected best model
console.log(result.workflow?.metrics?.totalTime); // Execution time
console.log(result.workflow?.ensembleResponses?.length); // 3
```

### Custom Workflow

```typescript
// Register custom workflow using standalone function
registerWorkflow({
  id: "custom-medical",
  name: "Medical Query Workflow",
  type: "ensemble",
  models: [
    {
      provider: "openai",
      model: "gpt-4o",
      systemPrompt: "You are a medical expert...",
    },
    {
      provider: "anthropic",
      model: "claude-3-5-sonnet",
      systemPrompt: "You are a medical expert...",
    },
  ],
  judge: {
    provider: "openai",
    model: "gpt-4o",
    criteria: ["medical_accuracy", "safety", "clarity"],
    outputFormat: "scores",
  },
});

// Execute custom workflow
const customWorkflow = getWorkflow("custom-medical");
const result = await neuro.generate({
  workflowConfig: customWorkflow,
  input: { text: "What are the symptoms of type 2 diabetes?" },
});
```

---

## 16. Migration Path for Existing Users

### Backward Compatibility

```typescript
// Existing code continues to work
const result = await neuro.generate({
  input: { text: "Hello" },
});

// Workflow feature is enabled via workflowConfig option
const workflowConfig = getWorkflow("consensus-3");
const workflowResult = await neuro.generate({
  workflowConfig,
  input: { text: "Hello" },
});
```

### Gradual Adoption

1. **Phase 1**: Users can try workflows alongside existing methods
2. **Phase 2**: Workflows become recommended for high-stakes queries
3. **Phase 3**: Workflows are default with single-model as fallback

---

## 17. Performance Benchmarks (Expected)

| Workflow      | Models | Judge | Latency (p50) | Latency (p95) | Cost Multiplier |
| ------------- | ------ | ----- | ------------- | ------------- | --------------- |
| consensus-3   | 3      | 1     | 3.2s          | 5.1s          | 4.2x            |
| fast-fallback | 1-2    | 0     | 1.1s          | 2.8s          | 1.3x            |
| quality-max   | 2      | 1     | 3.5s          | 4.9s          | 3.1x            |
| multi-judge-5 | 3      | 2     | 4.8s          | 6.7s          | 5.3x            |

---

## 18. Future Enhancements

### Phase 2: Streaming Support

```typescript
async streamWorkflow(
  options: WorkflowGenerateOptions
): AsyncIterable<WorkflowStreamChunk> {
  // Stream ensemble responses as they arrive
  // Update judge scores progressively
  // Condition final response
}
```

### Phase 3: Workflow Chaining

```typescript
const pipeline = neuro.createWorkflowPipeline([
  "quality-check", // First workflow
  "fact-verification", // Second workflow
  "final-polish", // Third workflow
]);

const result = await pipeline.execute({
  input: { text: "Complex query" },
});
```

---

## 📝 Implementation Checklist

- [ ] Create `src/workflow/` directory structure
- [ ] Implement `types.ts` with all interfaces
- [ ] Implement `config.ts` with Zod schemas
- [ ] Implement `ensembleExecutor.ts`
- [ ] Implement `judgeScorer.ts`
- [ ] Implement `responseConditioner.ts`
- [ ] Implement `workflowRegistry.ts`
- [ ] Implement `workflowRunner.ts`
- [ ] Create built-in workflows (consensus, fallback, quality-max)
- [ ] Add methods to `NeuroLink` class
- [ ] Export types from `src/lib/index.ts`
- [ ] Write unit tests (80% coverage target)
- [ ] Write integration tests
- [ ] Add JSDoc documentation
- [ ] Create user guide with examples
- [ ] Add CLI support (optional Phase 2)

---

**Document Status**: ✅ Ready for Implementation  
**Next Step**: Code generation upon approval
