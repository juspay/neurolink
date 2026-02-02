/**
 * Fallback Workflow
 * =================
 *
 * Sequential fallback chain using layer-based execution:
 * - Try fast model first
 * - Fall back to mid-tier if needed
 * - Final fallback to premium model
 *
 * Ideal for: Cost-optimization with quality guarantee
 *
 * @module workflow/workflows/fallbackWorkflow
 */

import { AIProviderName } from "../../constants/enums.js";
import { WORKFLOW_CREATION_DATE } from "../config.js";
import type { WorkflowConfig } from "../types.js";

/**
 * Fast-Fallback Workflow Configuration
 *
 * Uses layer-based execution with sequential groups:
 * 1. Fast tier: GPT-4o-mini (try first)
 * 2. Mid tier: Gemini 2.0 Flash (if fast fails)
 * 3. Premium tier: GPT-4o or Claude 3.5 Sonnet (last resort)
 *
 * Each group runs sequentially - only proceeds if previous fails
 *
 * @example
 * ```typescript
 * import { runWorkflow } from '../core/workflowRunner.js';
 * import { FAST_FALLBACK_WORKFLOW } from './fallbackWorkflow.js';
 *
 * const result = await runWorkflow(FAST_FALLBACK_WORKFLOW, {
 *   prompt: 'What is 2+2?',
 *   verbose: true,
 * });
 *
 * // Usually completes with fast tier, saving cost
 * console.log('Executed models:', result.ensembleResponses.length);
 * ```
 */
export const FAST_FALLBACK_WORKFLOW: WorkflowConfig = {
  id: "fast-fallback",
  name: "Fast-Fallback Chain",
  description: "Sequential fallback: fast → mid → premium",
  version: "1.0.0",
  type: "chain",

  // Placeholder (required by schema, but modelGroups takes precedence)
  models: [
    {
      provider: AIProviderName.OPENAI,
      model: "gpt-4o-mini",
    },
  ],

  // Layer-based execution: groups run sequentially
  modelGroups: [
    {
      id: "fast-tier",
      name: "Fast Tier",
      description: "Try fast model first (lowest cost)",
      models: [
        {
          provider: AIProviderName.OPENAI,
          model: "gpt-4o-mini",
          label: "GPT-4o-mini",
          temperature: 0.7,
          timeout: 10000, // 10 second timeout
        },
      ],
      executionStrategy: "sequential", // Only one model
      continueOnFailure: true, // Always try next tier
      minSuccessful: 1,
    },
    {
      id: "mid-tier",
      name: "Mid Tier",
      description: "Mid-tier model (balanced cost/quality)",
      models: [
        {
          provider: AIProviderName.GOOGLE_AI,
          model: "gemini-2.0-flash",
          label: "Gemini 2.0 Flash",
          temperature: 0.7,
          timeout: 15000, // 15 second timeout
        },
      ],
      executionStrategy: "sequential",
      continueOnFailure: true,
      minSuccessful: 1,
    },
    {
      id: "premium-tier",
      name: "Premium Tier",
      description: "Premium models (last resort, highest quality)",
      models: [
        {
          provider: AIProviderName.OPENAI,
          model: "gpt-4o",
          label: "GPT-4o",
          temperature: 0.7,
          timeout: 20000, // 20 second timeout
        },
      ],
      executionStrategy: "sequential",
      continueOnFailure: false, // Stop if this fails
      minSuccessful: 1,
    },
  ],

  // Judge: Select best response if multiple tiers executed
  judge: {
    provider: AIProviderName.OPENAI,
    model: "gpt-4o-mini", // Fast judge is fine for simple selection
    criteria: ["quality", "response_time"],
    outputFormat: "best",
    includeReasoning: true,
    temperature: 0.1,
    scoreScale: {
      min: 0,
      max: 100,
    },
  },

  // Execution configuration
  execution: {
    timeout: 50000, // 50 second total timeout
    minResponses: 1, // Only need 1 successful response
    costThreshold: 0.05,
  },

  // Metadata
  tags: ["chain", "fallback", "cost-optimized", "reliable"],
  metadata: {
    useCase: "Cost-optimized with quality guarantee",
    recommendedFor: [
      "variable complexity queries",
      "cost-sensitive applications",
    ],
    averageCost: 0.01, // Usually completes in fast tier
    averageLatency: 2000,
  },
  createdAt: WORKFLOW_CREATION_DATE,
};

/**
 * Aggressive Fallback Workflow
 *
 * More aggressive fallback with parallel premium tier:
 * 1. Fast tier: GPT-4o-mini (sequential)
 * 2. Premium tier: GPT-4o + Claude 3.5 (parallel, both execute)
 *
 * Guarantees high quality if fast tier fails
 */
export const AGGRESSIVE_FALLBACK_WORKFLOW: WorkflowConfig = {
  id: "aggressive-fallback",
  name: "Aggressive Fallback",
  description: "Fast first, then both premium models in parallel",
  version: "1.0.0",
  type: "chain",

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
          timeout: 8000,
        },
      ],
      executionStrategy: "sequential",
      continueOnFailure: true,
      minSuccessful: 1,
    },
    {
      id: "premium-tier",
      name: "Premium Tier (Both)",
      description: "Run both premium models in parallel for guaranteed quality",
      models: [
        {
          provider: AIProviderName.OPENAI,
          model: "gpt-4o",
          label: "GPT-4o",
          temperature: 0.7,
        },
        {
          provider: AIProviderName.ANTHROPIC,
          model: "claude-3-5-sonnet-20241022",
          label: "Claude 3.5 Sonnet",
          temperature: 0.7,
        },
      ],
      executionStrategy: "parallel", // Both run simultaneously
      continueOnFailure: false,
      minSuccessful: 1,
      parallelism: 2,
    },
  ],

  judge: {
    provider: AIProviderName.OPENAI,
    model: "gpt-4o",
    criteria: ["quality", "completeness"],
    outputFormat: "detailed",
    includeReasoning: true,
    temperature: 0.1,
    scoreScale: {
      min: 0,
      max: 100,
    },
  },

  execution: {
    timeout: 40000,
    minResponses: 1,
    costThreshold: 0.08,
  },

  tags: ["chain", "fallback", "high-quality", "reliable"],
  metadata: {
    useCase: "High quality guarantee with cost optimization attempt",
    recommendedFor: ["important queries", "when quality matters most"],
    averageCost: 0.03,
    averageLatency: 2500,
  },
  createdAt: WORKFLOW_CREATION_DATE,
};
