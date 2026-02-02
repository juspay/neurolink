/**
 * Consensus-3 Workflow
 * ====================
 *
 * 3-model ensemble with judge selecting best response based on:
 * - Accuracy
 * - Clarity
 * - Completeness
 *
 * Ideal for: Balanced quality across multiple providers
 *
 * @module workflow/workflows/consensusWorkflow
 */

import { AIProviderName } from "../../constants/enums.js";
import { WORKFLOW_CREATION_DATE } from "../config.js";
import type { WorkflowConfig } from "../types.js";

/**
 * Consensus-3 Workflow Configuration
 *
 * Uses 3 high-quality models in parallel:
 * - GPT-4o (OpenAI) - Strong reasoning
 * - Claude 3.5 Sonnet (Anthropic) - Thoughtful analysis
 * - Gemini 2.0 Flash (Google) - Fast and capable
 *
 * Judge: GPT-4o evaluates on accuracy, clarity, and completeness
 *
 * @example
 * ```typescript
 * import { runWorkflow } from '../core/workflowRunner.js';
 * import { CONSENSUS_3_WORKFLOW } from './consensusWorkflow.js';
 *
 * const result = await runWorkflow(CONSENSUS_3_WORKFLOW, {
 *   prompt: 'Explain the theory of relativity',
 *   verbose: true,
 * });
 *
 * console.log('Best response:', result.content);
 * console.log('Score:', result.score);
 * console.log('Reasoning:', result.reasoning);
 * ```
 */
export const CONSENSUS_3_WORKFLOW: WorkflowConfig = {
  id: "consensus-3",
  name: "Consensus-3 Ensemble",
  description: "3-model parallel ensemble with judge-based selection",
  version: "1.0.0",
  type: "ensemble",

  // 3 high-quality models running in parallel
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

  // Judge configuration - evaluates all 3 responses
  judge: {
    provider: AIProviderName.OPENAI,
    model: "gpt-4o",
    criteria: ["accuracy", "clarity", "completeness"],
    outputFormat: "detailed",
    includeReasoning: true,
    temperature: 0.1, // Low temperature for consistent judging
    scoreScale: {
      min: 0,
      max: 100,
    },
  },

  // Execution configuration
  execution: {
    parallelism: 3, // All 3 models run simultaneously
    timeout: 30000, // 30 second total timeout
    modelTimeout: 25000, // 25 second per-model timeout
    minResponses: 2, // Need at least 2 successful responses
    costThreshold: 0.1, // Warn if cost exceeds $0.10
  },

  // Metadata
  tags: ["ensemble", "consensus", "balanced", "multi-provider"],
  metadata: {
    useCase: "Balanced quality across providers",
    recommendedFor: ["general queries", "explanations", "analysis"],
    averageCost: 0.02,
    averageLatency: 2000,
  },
  createdAt: WORKFLOW_CREATION_DATE,
};

/**
 * Consensus-3 with Custom System Prompt
 *
 * Same as CONSENSUS_3_WORKFLOW but allows custom system prompt
 *
 * @param systemPrompt - Custom system prompt for all models
 * @returns Workflow configuration with custom prompt
 *
 * @example
 * ```typescript
 * const workflow = createConsensus3WithPrompt(
 *   'You are a technical expert. Provide detailed, accurate responses.'
 * );
 *
 * const result = await runWorkflow(workflow, {
 *   prompt: 'Explain async/await in JavaScript',
 * });
 * ```
 */
export function createConsensus3WithPrompt(
  systemPrompt: string,
): WorkflowConfig {
  return {
    ...CONSENSUS_3_WORKFLOW,
    id: `consensus-3-custom-${Date.now()}`,
    defaultSystemPrompt: systemPrompt,
  };
}

/**
 * Consensus-3 Fast (Lower Cost, Faster)
 *
 * Uses faster/cheaper models with same consensus approach:
 * - GPT-4o-mini
 * - Claude 3 Haiku
 * - Gemini 2.0 Flash
 */
export const CONSENSUS_3_FAST_WORKFLOW: WorkflowConfig = {
  id: "consensus-3-fast",
  name: "Consensus-3 Fast",
  description: "3-model fast ensemble (lower cost)",
  version: "1.0.0",
  type: "ensemble",

  models: [
    {
      provider: AIProviderName.OPENAI,
      model: "gpt-4o-mini",
      label: "GPT-4o-mini",
      weight: 1.0,
      temperature: 0.7,
    },
    {
      provider: AIProviderName.ANTHROPIC,
      model: "claude-3-haiku-20240307",
      label: "Claude 3 Haiku",
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

  judge: {
    provider: AIProviderName.OPENAI,
    model: "gpt-4o-mini", // Also use fast judge
    criteria: ["accuracy", "clarity"],
    outputFormat: "best",
    includeReasoning: true,
    temperature: 0.1,
    scoreScale: {
      min: 0,
      max: 100,
    },
  },

  execution: {
    parallelism: 3,
    timeout: 20000, // 20 seconds
    modelTimeout: 15000,
    minResponses: 2,
    costThreshold: 0.02, // Lower cost threshold
  },

  tags: ["ensemble", "fast", "low-cost", "consensus"],
  metadata: {
    useCase: "Fast consensus for simple queries",
    recommendedFor: ["quick questions", "simple explanations"],
    averageCost: 0.01,
    averageLatency: 1500,
  },
  createdAt: WORKFLOW_CREATION_DATE,
};
