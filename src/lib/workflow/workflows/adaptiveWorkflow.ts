/**
 * Adaptive Quality Workflow
 * =========================
 *
 * Layer-based execution optimizing for maximum quality:
 * - Start with fast validation tier
 * - Escalate to premium tier if needed
 * - Final expert tier for complex cases
 *
 * Ideal for: Quality-critical tasks with cost awareness
 *
 * @module workflow/workflows/adaptiveWorkflow
 */

import { AIProviderName } from "../../constants/enums.js";
import { WORKFLOW_CREATION_DATE } from "../config.js";
import type { WorkflowConfig } from "../types.js";
import { logger } from "../../utils/logger.js";

/**
 * Quality-Max Adaptive Workflow
 *
 * Uses 3-tier layer-based execution:
 * 1. Validation tier (parallel): 2 fast models check complexity
 * 2. Premium tier (parallel): 2 high-quality models if validation uncertain
 * 3. Expert tier (sequential): Best model for final polish
 *
 * Each tier evaluates if next tier is needed based on confidence
 *
 * @example
 * ```typescript
 * import { runWorkflow } from '../core/workflowRunner.js';
 * import { QUALITY_MAX_WORKFLOW } from './adaptiveWorkflow.js';
 *
 * const result = await runWorkflow(QUALITY_MAX_WORKFLOW, {
 *   prompt: 'Design a scalable microservices architecture',
 *   verbose: true,
 * });
 *
 * console.log('Quality score:', result.score);
 * console.log('Tiers executed:', result.ensembleResponses.length);
 * ```
 */
export const QUALITY_MAX_WORKFLOW: WorkflowConfig = {
  id: "quality-max",
  name: "Quality-Max Adaptive",
  description: "Adaptive 3-tier execution optimizing for maximum quality",
  version: "1.0.0",
  type: "adaptive",

  // Placeholder (required, but modelGroups takes precedence)
  models: [
    {
      provider: AIProviderName.OPENAI,
      model: "gpt-4o",
    },
  ],

  // Layer-based execution with quality escalation
  modelGroups: [
    {
      id: "validation-tier",
      name: "Validation Tier",
      description: "Fast models to assess complexity and confidence",
      models: [
        {
          provider: AIProviderName.OPENAI,
          model: "gpt-4o-mini",
          label: "GPT-4o-mini",
          temperature: 0.7,
          timeout: 10000,
        },
        {
          provider: AIProviderName.GOOGLE_AI,
          model: "gemini-2.0-flash",
          label: "Gemini Flash",
          temperature: 0.7,
          timeout: 10000,
        },
      ],
      executionStrategy: "parallel",
      continueOnFailure: true, // Always try premium tier
      minSuccessful: 1,
      parallelism: 2,
    },
    {
      id: "premium-tier",
      name: "Premium Tier",
      description: "High-quality models for thorough analysis",
      models: [
        {
          provider: AIProviderName.OPENAI,
          model: "gpt-4o",
          label: "GPT-4o",
          temperature: 0.7,
          systemPrompt:
            "Provide comprehensive, high-quality responses with deep analysis.",
          timeout: 20000,
        },
        {
          provider: AIProviderName.ANTHROPIC,
          model: "claude-3-5-sonnet-20241022",
          label: "Claude 3.5 Sonnet",
          temperature: 0.7,
          systemPrompt:
            "Think deeply and provide nuanced, well-reasoned responses.",
          timeout: 20000,
        },
      ],
      executionStrategy: "parallel",
      continueOnFailure: true,
      minSuccessful: 1,
      parallelism: 2,
    },
    {
      id: "expert-tier",
      name: "Expert Tier",
      description: "Top-tier model for final quality assurance",
      models: [
        {
          provider: AIProviderName.ANTHROPIC,
          model: "claude-3-5-sonnet-20241022",
          label: "Claude 3.5 Sonnet Expert",
          temperature: 0.6, // Lower temp for consistency
          systemPrompt:
            "You are an expert. Provide the highest quality, most accurate response possible. Be thorough, precise, and authoritative.",
          timeout: 30000,
        },
      ],
      executionStrategy: "sequential",
      continueOnFailure: false,
      minSuccessful: 1,
    },
  ],

  // Judge evaluates all responses and selects best
  judge: {
    provider: AIProviderName.OPENAI,
    model: "gpt-4o",
    criteria: ["quality", "depth", "accuracy", "completeness"],
    outputFormat: "detailed",
    includeReasoning: true,
    temperature: 0.1,
    scoreScale: { min: 0, max: 100 },
    customPrompt:
      "Evaluate responses for maximum quality. Prioritize depth, accuracy, and completeness. Be rigorous in assessment.",
  },

  // Execution configuration
  execution: {
    timeout: 70000, // 70 seconds for all tiers
    minResponses: 2,
    costThreshold: 0.12,
  },

  // Metadata
  tags: ["adaptive", "quality", "tiered", "escalation"],
  metadata: {
    useCase: "Quality-critical tasks with adaptive execution",
    recommendedFor: [
      "complex analysis",
      "expert consultation",
      "high-stakes decisions",
      "technical documentation",
    ],
    averageCost: 0.08, // Cost depends on how many tiers execute
    averageLatency: 4500,
  },
  createdAt: WORKFLOW_CREATION_DATE,
};

/**
 * Speed-First Adaptive Workflow
 *
 * Optimizes for speed with quality fallback:
 * 1. Fast tier: Single fast model (GPT-4o-mini)
 * 2. Balanced tier: If fast fails, use Gemini 2.0
 * 3. Quality tier: If both fail, use GPT-4o
 */
export const SPEED_FIRST_WORKFLOW: WorkflowConfig = {
  id: "speed-first",
  name: "Speed-First Adaptive",
  description: "Fast execution with quality fallback",
  version: "1.0.0",
  type: "adaptive",

  models: [
    {
      provider: AIProviderName.OPENAI,
      model: "gpt-4o-mini",
    },
  ],

  modelGroups: [
    {
      id: "fast-tier",
      name: "Fast Tier",
      models: [
        {
          provider: AIProviderName.OPENAI,
          model: "gpt-4o-mini",
          temperature: 0.7,
          timeout: 5000, // 5 second timeout
        },
      ],
      executionStrategy: "sequential",
      continueOnFailure: true,
      minSuccessful: 1,
    },
    {
      id: "balanced-tier",
      name: "Balanced Tier",
      models: [
        {
          provider: AIProviderName.GOOGLE_AI,
          model: "gemini-2.0-flash",
          temperature: 0.7,
          timeout: 10000,
        },
      ],
      executionStrategy: "sequential",
      continueOnFailure: true,
      minSuccessful: 1,
    },
    {
      id: "quality-tier",
      name: "Quality Tier",
      models: [
        {
          provider: AIProviderName.OPENAI,
          model: "gpt-4o",
          temperature: 0.7,
          timeout: 15000,
        },
      ],
      executionStrategy: "sequential",
      continueOnFailure: false,
      minSuccessful: 1,
    },
  ],

  judge: {
    provider: AIProviderName.OPENAI,
    model: "gpt-4o-mini", // Fast judge
    criteria: ["speed", "quality"],
    outputFormat: "best",
    includeReasoning: true,
    temperature: 0.1,
    scoreScale: { min: 0, max: 100 },
  },

  execution: {
    timeout: 35000,
    minResponses: 1,
    costThreshold: 0.05,
  },

  tags: ["adaptive", "speed", "fallback"],
  metadata: {
    useCase: "Speed-optimized with quality guarantee",
    recommendedFor: ["real-time applications", "quick queries"],
    averageCost: 0.01,
    averageLatency: 1500,
  },
  createdAt: WORKFLOW_CREATION_DATE,
};

/**
 * Balanced Adaptive Workflow
 *
 * Balances speed, cost, and quality:
 * 1. Standard tier (parallel): GPT-4o-mini + Gemini Flash
 * 2. Premium tier (parallel): GPT-4o + Claude 3.5 if standard uncertain
 */
export const BALANCED_ADAPTIVE_WORKFLOW: WorkflowConfig = {
  id: "balanced-adaptive",
  name: "Balanced Adaptive",
  description: "Balanced 2-tier execution",
  version: "1.0.0",
  type: "adaptive",

  models: [
    {
      provider: AIProviderName.OPENAI,
      model: "gpt-4o-mini",
    },
  ],

  modelGroups: [
    {
      id: "standard-tier",
      name: "Standard Tier",
      description: "Fast, cost-effective models",
      models: [
        {
          provider: AIProviderName.OPENAI,
          model: "gpt-4o-mini",
          temperature: 0.7,
        },
        {
          provider: AIProviderName.GOOGLE_AI,
          model: "gemini-2.0-flash",
          temperature: 0.7,
        },
      ],
      executionStrategy: "parallel",
      continueOnFailure: true,
      minSuccessful: 1,
      parallelism: 2,
    },
    {
      id: "premium-tier",
      name: "Premium Tier",
      description: "High-quality models for complex cases",
      models: [
        {
          provider: AIProviderName.OPENAI,
          model: "gpt-4o",
          temperature: 0.7,
        },
        {
          provider: AIProviderName.ANTHROPIC,
          model: "claude-3-5-sonnet-20241022",
          temperature: 0.7,
        },
      ],
      executionStrategy: "parallel",
      continueOnFailure: false,
      minSuccessful: 1,
      parallelism: 2,
    },
  ],

  judge: {
    provider: AIProviderName.OPENAI,
    model: "gpt-4o",
    criteria: ["quality", "accuracy", "balance"],
    outputFormat: "detailed",
    includeReasoning: true,
    temperature: 0.1,
    scoreScale: { min: 0, max: 100 },
  },

  execution: {
    timeout: 40000,
    minResponses: 2,
    costThreshold: 0.08,
  },

  tags: ["adaptive", "balanced", "tiered"],
  metadata: {
    useCase: "Balanced speed/quality/cost tradeoff",
    recommendedFor: ["general purpose", "production applications"],
    averageCost: 0.04,
    averageLatency: 2500,
  },
  createdAt: WORKFLOW_CREATION_DATE,
};

/**
 * Create custom adaptive workflow
 *
 * @param tiers - Number of quality tiers (2, 3, or 4)
 * @param strategy - 'speed' | 'balanced' | 'quality'
 * @returns Configured adaptive workflow
 *
 * @example
 * ```typescript
 * const workflow = createAdaptiveWorkflow(3, 'quality');
 * const result = await runWorkflow(workflow, {
 *   prompt: 'Complex technical analysis',
 * });
 * ```
 */
export function createAdaptiveWorkflow(
  tiers: 2 | 3,
  strategy: "speed" | "balanced" | "quality",
): WorkflowConfig {
  const workflows = {
    speed: SPEED_FIRST_WORKFLOW,
    balanced: BALANCED_ADAPTIVE_WORKFLOW,
    quality: QUALITY_MAX_WORKFLOW,
  };

  const actualTiers = strategy === "balanced" ? 2 : 3;
  if (tiers !== actualTiers) {
    logger.warn(
      `[AdaptiveWorkflow] Requested ${tiers} tiers but ${strategy} strategy uses ${actualTiers} tiers`,
    );
  }

  return {
    ...workflows[strategy],
    id: `adaptive-${actualTiers}tier-${strategy}`,
    name: `Adaptive ${actualTiers}-Tier (${strategy})`,
    description: `${actualTiers}-tier adaptive execution optimized for ${strategy}`,
  };
}
