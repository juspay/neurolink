/**
 * Multi-Judge Workflow
 * ====================
 *
 * 5-model ensemble with 3-judge voting for maximum reliability:
 * - 5 diverse models generate responses
 * - 3 judges independently evaluate (voting consensus)
 * - Best response selected by aggregate scoring
 *
 * Ideal for: Critical decisions requiring high confidence
 *
 * @module workflow/workflows/multiJudgeWorkflow
 */

import { AIProviderName } from "../../constants/enums.js";
import type { WorkflowConfig } from "../types.js";
import { WORKFLOW_CREATION_DATE } from "../config.js";

/**
 * Multi-Judge-5 Workflow Configuration
 *
 * Uses 5 models across different providers:
 * - GPT-4o (OpenAI)
 * - GPT-4o-mini (OpenAI)
 * - Claude 3.5 Sonnet (Anthropic)
 * - Claude 3 Haiku (Anthropic)
 * - Gemini 2.0 Flash (Google)
 *
 * 3 independent judges vote:
 * - GPT-4o evaluates accuracy & clarity
 * - Claude 3.5 Sonnet evaluates reasoning & depth
 * - Gemini 2.0 Flash evaluates completeness & coherence
 *
 * Scores are averaged across all judges for final selection
 *
 * @example
 * ```typescript
 * import { runWorkflow } from '../core/workflowRunner.js';
 * import { MULTI_JUDGE_5_WORKFLOW } from './multiJudgeWorkflow.js';
 *
 * const result = await runWorkflow(MULTI_JUDGE_5_WORKFLOW, {
 *   prompt: 'Should we invest in renewable energy?',
 *   verbose: true,
 * });
 *
 * console.log('Consensus score:', result.score);
 * console.log('Agreement level:', result.consensus);
 * ```
 */
export const MULTI_JUDGE_5_WORKFLOW: WorkflowConfig = {
  id: "multi-judge-5",
  name: "Multi-Judge-5 Ensemble",
  description: "5-model ensemble with 3-judge voting for high confidence",
  version: "1.0.0",
  type: "ensemble",

  // 5 diverse models for comprehensive coverage
  models: [
    {
      provider: AIProviderName.OPENAI,
      model: "gpt-4o",
      label: "GPT-4o",
      weight: 1.0,
      temperature: 0.7,
    },
    {
      provider: AIProviderName.OPENAI,
      model: "gpt-4o-mini",
      label: "GPT-4o-mini",
      weight: 0.8, // Slightly lower weight
      temperature: 0.7,
    },
    {
      provider: AIProviderName.ANTHROPIC,
      model: "claude-3-5-sonnet-20241022",
      label: "Claude 3.5 Sonnet",
      weight: 1.0,
      temperature: 0.7,
    },
    {
      provider: AIProviderName.ANTHROPIC,
      model: "claude-3-haiku-20240307",
      label: "Claude 3 Haiku",
      weight: 0.7, // Lower weight for faster model
      temperature: 0.7,
    },
    {
      provider: AIProviderName.GOOGLE_AI,
      model: "gemini-2.0-flash",
      label: "Gemini 2 Flash",
      weight: 0.9,
      temperature: 0.7,
    },
  ],

  // 3 independent judges with different criteria focus
  judges: [
    {
      provider: AIProviderName.OPENAI,
      model: "gpt-4o",
      criteria: ["accuracy", "clarity", "factual_correctness"],
      outputFormat: "detailed",
      includeReasoning: true,
      temperature: 0.1,
      scoreScale: { min: 0, max: 100 },
      label: "Accuracy Judge",
    },
    {
      provider: AIProviderName.ANTHROPIC,
      model: "claude-3-5-sonnet-20241022",
      criteria: ["reasoning_quality", "depth", "nuance"],
      outputFormat: "detailed",
      includeReasoning: true,
      temperature: 0.1,
      scoreScale: { min: 0, max: 100 },
      label: "Reasoning Judge",
    },
    {
      provider: AIProviderName.GOOGLE_AI,
      model: "gemini-2.0-flash",
      criteria: ["completeness", "coherence", "relevance"],
      outputFormat: "detailed",
      includeReasoning: true,
      temperature: 0.1,
      scoreScale: { min: 0, max: 100 },
      label: "Completeness Judge",
    },
  ],

  // Execution configuration
  execution: {
    parallelism: 5, // All 5 models run simultaneously
    timeout: 45000, // 45 second total timeout
    modelTimeout: 30000, // 30 second per-model timeout
    minResponses: 3, // Need at least 3 successful responses
    costThreshold: 0.15, // Warn if cost exceeds $0.15
  },

  // Metadata
  tags: ["ensemble", "multi-judge", "voting", "high-confidence", "critical"],
  metadata: {
    useCase: "Critical decisions requiring high confidence",
    recommendedFor: [
      "important business decisions",
      "technical evaluations",
      "complex analysis",
      "fact-checking",
    ],
    averageCost: 0.1,
    averageLatency: 5000,
    consensusThreshold: 0.7, // Expect 70%+ agreement
  },
  createdAt: WORKFLOW_CREATION_DATE,
};

/**
 * Multi-Judge-3 Workflow (Lighter Version)
 *
 * 3 models with 2 judges (more cost-effective):
 * - GPT-4o, Claude 3.5, Gemini 2.0
 * - Judged by GPT-4o and Claude 3.5
 */
export const MULTI_JUDGE_3_WORKFLOW: WorkflowConfig = {
  id: "multi-judge-3",
  name: "Multi-Judge-3 Ensemble",
  description: "3-model ensemble with 2-judge voting",
  version: "1.0.0",
  type: "ensemble",

  models: [
    {
      provider: AIProviderName.OPENAI,
      model: "gpt-4o",
      label: "GPT-4o",
      weight: 1.0,
      temperature: 0.7,
    },
    {
      provider: AIProviderName.ANTHROPIC,
      model: "claude-3-5-sonnet-20241022",
      label: "Claude 3.5 Sonnet",
      weight: 1.0,
      temperature: 0.7,
    },
    {
      provider: AIProviderName.GOOGLE_AI,
      model: "gemini-2.0-flash",
      label: "Gemini 2.0 Flash",
      weight: 1.0,
      temperature: 0.7,
    },
  ],

  judges: [
    {
      provider: AIProviderName.OPENAI,
      model: "gpt-4o",
      criteria: ["accuracy", "clarity", "completeness"],
      outputFormat: "detailed",
      includeReasoning: true,
      temperature: 0.1,
      scoreScale: { min: 0, max: 100 },
      label: "Primary Judge",
    },
    {
      provider: AIProviderName.ANTHROPIC,
      model: "claude-3-5-sonnet-20241022",
      criteria: ["reasoning", "depth", "coherence"],
      outputFormat: "detailed",
      includeReasoning: true,
      temperature: 0.1,
      scoreScale: { min: 0, max: 100 },
      label: "Secondary Judge",
    },
  ],

  execution: {
    parallelism: 3,
    timeout: 35000,
    modelTimeout: 25000,
    minResponses: 2,
    costThreshold: 0.08,
  },

  tags: ["ensemble", "multi-judge", "voting", "balanced"],
  metadata: {
    useCase: "Balanced multi-judge evaluation",
    recommendedFor: ["important queries", "quality verification"],
    averageCost: 0.04,
    averageLatency: 3500,
  },
  createdAt: WORKFLOW_CREATION_DATE,
};

/**
 * Create custom multi-judge workflow
 *
 * @param modelCount - Number of models (3, 5, or 7)
 * @param judgeCount - Number of judges (2 or 3)
 * @returns Configured workflow
 *
 * @example
 * ```typescript
 * const workflow = createMultiJudgeWorkflow(7, 3);
 * const result = await runWorkflow(workflow, {
 *   prompt: 'Complex analysis task',
 * });
 * ```
 */
export function createMultiJudgeWorkflow(
  modelCount: 3 | 5 | 7,
  judgeCount: 2 | 3,
): WorkflowConfig {
  // Base models (always include these)
  const baseModels = [
    {
      provider: AIProviderName.OPENAI,
      model: "gpt-4o",
      label: "GPT-4o",
      weight: 1.0,
      temperature: 0.7,
    },
    {
      provider: AIProviderName.ANTHROPIC,
      model: "claude-3-5-sonnet-20241022",
      label: "Claude 3.5 Sonnet",
      weight: 1.0,
      temperature: 0.7,
    },
    {
      provider: AIProviderName.GOOGLE_AI,
      model: "gemini-2.0-flash",
      label: "Gemini 2.0 Flash",
      weight: 1.0,
      temperature: 0.7,
    },
  ];

  // Additional models for larger ensembles
  const additionalModels = [
    {
      provider: AIProviderName.OPENAI,
      model: "gpt-4o-mini",
      label: "GPT-4o-mini",
      weight: 0.8,
      temperature: 0.7,
    },
    {
      provider: AIProviderName.ANTHROPIC,
      model: "claude-3-haiku-20240307",
      label: "Claude 3 Haiku",
      weight: 0.7,
      temperature: 0.7,
    },
    {
      provider: AIProviderName.GOOGLE_AI,
      model: "gemini-1.5-flash",
      label: "Gemini 1.5 Flash",
      weight: 0.8,
      temperature: 0.7,
    },
    {
      provider: AIProviderName.OPENAI,
      model: "gpt-3.5-turbo",
      label: "GPT-3.5 Turbo",
      weight: 0.6,
      temperature: 0.7,
    },
  ];

  const models = [...baseModels, ...additionalModels.slice(0, modelCount - 3)];

  // Base judges
  const baseJudges = [
    {
      provider: AIProviderName.OPENAI,
      model: "gpt-4o",
      criteria: ["accuracy", "clarity", "completeness"],
      outputFormat: "detailed" as const,
      includeReasoning: true,
      temperature: 0.1,
      scoreScale: { min: 0 as const, max: 100 as const },
      label: "Primary Judge",
    },
    {
      provider: AIProviderName.ANTHROPIC,
      model: "claude-3-5-sonnet-20241022",
      criteria: ["reasoning", "depth", "coherence"],
      outputFormat: "detailed" as const,
      includeReasoning: true,
      temperature: 0.1,
      scoreScale: { min: 0 as const, max: 100 as const },
      label: "Secondary Judge",
    },
  ];

  const thirdJudge = {
    provider: AIProviderName.GOOGLE_AI,
    model: "gemini-2.0-flash",
    criteria: ["relevance", "factual_accuracy", "structure"],
    outputFormat: "detailed" as const,
    includeReasoning: true,
    temperature: 0.1,
    scoreScale: { min: 0 as const, max: 100 as const },
    label: "Tertiary Judge",
  };

  const judges = judgeCount === 3 ? [...baseJudges, thirdJudge] : baseJudges;

  return {
    id: `multi-judge-${modelCount}-${judgeCount}`,
    name: `Multi-Judge ${modelCount}x${judgeCount}`,
    description: `${modelCount}-model ensemble with ${judgeCount}-judge voting`,
    version: "1.0.0",
    type: "ensemble",
    models,
    judges,
    execution: {
      parallelism: modelCount,
      timeout: 45000,
      modelTimeout: 30000,
      minResponses: Math.ceil(modelCount / 2),
      costThreshold: 0.2,
    },
    tags: ["ensemble", "multi-judge", "custom"],
    metadata: {
      useCase: "Custom multi-judge evaluation",
      modelCount,
      judgeCount,
    },
    createdAt: WORKFLOW_CREATION_DATE,
  };
}
