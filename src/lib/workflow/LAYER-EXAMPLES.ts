/**
 * LAYER-BASED EXECUTION - USAGE EXAMPLES
 * ======================================
 *
 * Demonstrates ModelGroup-based execution with sequential and parallel strategies
 */

import { AIProviderName } from "../constants/enums.js";
import type { WorkflowConfig } from "./types.js";

// ============================================================================
// EXAMPLE 1: Simple Parallel (Backward Compatible - Flat Models Array)
// ============================================================================

const simpleParallelWorkflow: WorkflowConfig = {
  id: "simple-parallel",
  name: "Simple Parallel Workflow",
  type: "ensemble",

  // Traditional flat array - all execute in parallel
  models: [
    { provider: AIProviderName.OPENAI, model: "gpt-4o" },
    { provider: AIProviderName.ANTHROPIC, model: "claude-3-5-sonnet-20241022" },
    { provider: AIProviderName.GOOGLE_AI, model: "gemini-2.0-flash" },
  ],

  judge: {
    provider: AIProviderName.OPENAI,
    model: "gpt-4o",
    criteria: ["accuracy", "clarity"],
    outputFormat: "detailed",
    includeReasoning: true,
    scoreScale: { min: 0, max: 100 },
  },
};

// ============================================================================
// EXAMPLE 2: Fast-then-Premium (Sequential Groups)
// ============================================================================

const fastThenPremiumWorkflow: WorkflowConfig = {
  id: "fast-then-premium",
  name: "Fast Models First, Premium If Needed",
  type: "adaptive",

  // Define execution layers
  modelGroups: [
    {
      id: "fast-tier",
      name: "Fast Models",
      description: "Quick, cost-effective models",
      models: [
        { provider: AIProviderName.OPENAI, model: "gpt-4o-mini" },
        { provider: AIProviderName.GOOGLE_AI, model: "gemini-2.0-flash" },
      ],
      executionStrategy: "parallel", // Both run simultaneously
      continueOnFailure: true, // Always proceed to next group
      minSuccessful: 1, // Need at least 1 success
    },
    {
      id: "premium-tier",
      name: "Premium Models",
      description: "High-quality, more expensive models",
      models: [
        { provider: AIProviderName.OPENAI, model: "gpt-4o" },
        {
          provider: AIProviderName.ANTHROPIC,
          model: "claude-3-5-sonnet-20241022",
        },
      ],
      executionStrategy: "parallel", // Both run simultaneously
      continueOnFailure: true,
      minSuccessful: 1,
    },
  ],

  // When using modelGroups, flat models array is ignored
  models: [{ provider: AIProviderName.OPENAI, model: "gpt-4o-mini" }], // Placeholder for backward compat

  judge: {
    provider: AIProviderName.OPENAI,
    model: "gpt-4o",
    criteria: ["quality", "cost-effectiveness"],
    outputFormat: "detailed",
    includeReasoning: true,
    scoreScale: { min: 0, max: 100 },
  },
};

// ============================================================================
// EXAMPLE 3: Fallback Chain (Sequential Models, Sequential Groups)
// ============================================================================

const fallbackChainWorkflow: WorkflowConfig = {
  id: "fallback-chain",
  name: "Sequential Fallback Chain",
  type: "chain",

  modelGroups: [
    {
      id: "primary",
      name: "Primary Model",
      models: [
        { provider: AIProviderName.OPENAI, model: "gpt-4o", timeout: 5000 },
      ],
      executionStrategy: "sequential", // Only one model
      continueOnFailure: true, // Continue to fallback if fails
      minSuccessful: 1,
    },
    {
      id: "fallback-1",
      name: "First Fallback",
      models: [
        {
          provider: AIProviderName.ANTHROPIC,
          model: "claude-3-5-sonnet-20241022",
          timeout: 8000,
        },
      ],
      executionStrategy: "sequential",
      continueOnFailure: true,
      minSuccessful: 1,
    },
    {
      id: "fallback-2",
      name: "Second Fallback",
      models: [
        {
          provider: AIProviderName.GOOGLE_AI,
          model: "gemini-2.0-flash",
          timeout: 10000,
        },
      ],
      executionStrategy: "sequential",
      continueOnFailure: false, // Stop here if this fails
      minSuccessful: 1,
    },
  ],

  models: [{ provider: AIProviderName.OPENAI, model: "gpt-4o" }], // Placeholder

  judge: {
    provider: AIProviderName.OPENAI,
    model: "gpt-4o-mini",
    criteria: ["availability", "response_time"],
    outputFormat: "best",
    includeReasoning: true,
    scoreScale: { min: 0, max: 100 },
  },
};

// ============================================================================
// EXAMPLE 4: Mixed Strategy (Parallel within groups, Sequential between)
// ============================================================================

const mixedStrategyWorkflow: WorkflowConfig = {
  id: "mixed-strategy",
  name: "Mixed Parallel and Sequential",
  type: "ensemble",

  modelGroups: [
    {
      id: "quick-validation",
      name: "Quick Validation Layer",
      description: "Fast models to validate prompt feasibility",
      models: [
        { provider: AIProviderName.OPENAI, model: "gpt-4o-mini" },
        { provider: AIProviderName.GOOGLE_AI, model: "gemini-2.0-flash" },
        { provider: AIProviderName.ANTHROPIC, model: "claude-3-haiku" },
      ],
      executionStrategy: "parallel", // All 3 run simultaneously
      continueOnFailure: true,
      minSuccessful: 2, // Need at least 2 successful responses
      parallelism: 3, // Allow all 3 to run at once
    },
    {
      id: "deep-analysis",
      name: "Deep Analysis Layer",
      description: "Sequential premium models for thorough analysis",
      models: [
        {
          provider: AIProviderName.OPENAI,
          model: "gpt-4o",
          systemPrompt:
            "Provide deep, analytical responses with step-by-step reasoning.",
        },
        {
          provider: AIProviderName.ANTHROPIC,
          model: "claude-3-5-sonnet-20241022",
          systemPrompt:
            "Think carefully and provide nuanced, thoughtful analysis.",
        },
      ],
      executionStrategy: "sequential", // Run one after another
      continueOnFailure: false, // Stop if this layer fails
      minSuccessful: 2, // Both must succeed
      timeout: 30000, // 30 second timeout for this group
    },
  ],

  models: [{ provider: AIProviderName.OPENAI, model: "gpt-4o-mini" }], // Placeholder

  judges: [
    {
      provider: AIProviderName.OPENAI,
      model: "gpt-4o",
      criteria: ["depth", "accuracy"],
      outputFormat: "detailed",
      includeReasoning: true,
      scoreScale: { min: 0, max: 100 },
    },
    {
      provider: AIProviderName.ANTHROPIC,
      model: "claude-3-5-sonnet-20241022",
      criteria: ["reasoning_quality", "clarity"],
      outputFormat: "detailed",
      includeReasoning: true,
      scoreScale: { min: 0, max: 100 },
    },
  ],
};

// ============================================================================
// EXAMPLE 5: Cost-Optimized (Try cheap first, escalate if needed)
// ============================================================================

const costOptimizedWorkflow: WorkflowConfig = {
  id: "cost-optimized",
  name: "Cost-Optimized Escalation",
  type: "adaptive",

  modelGroups: [
    {
      id: "budget-tier",
      name: "Budget Models",
      models: [
        { provider: AIProviderName.OPENAI, model: "gpt-4o-mini", weight: 0.3 },
      ],
      executionStrategy: "sequential",
      continueOnFailure: true, // Always try next tier
      minSuccessful: 1,
    },
    {
      id: "standard-tier",
      name: "Standard Models",
      models: [
        {
          provider: AIProviderName.GOOGLE_AI,
          model: "gemini-2.0-flash",
          weight: 0.5,
        },
        {
          provider: AIProviderName.ANTHROPIC,
          model: "claude-3-haiku",
          weight: 0.5,
        },
      ],
      executionStrategy: "parallel",
      continueOnFailure: true,
      minSuccessful: 1,
    },
    {
      id: "premium-tier",
      name: "Premium Models",
      models: [
        { provider: AIProviderName.OPENAI, model: "gpt-4o", weight: 1.0 },
        {
          provider: AIProviderName.ANTHROPIC,
          model: "claude-3-5-sonnet-20241022",
          weight: 1.0,
        },
      ],
      executionStrategy: "parallel",
      continueOnFailure: false,
      minSuccessful: 1,
    },
  ],

  models: [{ provider: AIProviderName.OPENAI, model: "gpt-4o-mini" }], // Placeholder

  execution: {
    maxCost: 0.5, // Stop if cost exceeds $0.50
    costThreshold: 0.25, // Warn at $0.25
  },

  judge: {
    provider: AIProviderName.OPENAI,
    model: "gpt-4o",
    criteria: ["quality", "value_for_cost"],
    outputFormat: "detailed",
    includeReasoning: true,
    scoreScale: { min: 0, max: 100 },
  },
};

// ============================================================================
// EXECUTION BEHAVIOR
// ============================================================================

/*
 * Sequential Groups Execution:
 * ---------------------------
 * Group 1 → Wait for completion → Evaluate success → Group 2 → etc.
 *
 * continueOnFailure=true:  Proceed to next group even if current fails
 * continueOnFailure=false: Stop execution if current group fails minSuccessful check
 * minSuccessful: Number of successful models required to consider group successful
 *
 * Within Group Execution:
 * ----------------------
 * executionStrategy='parallel':   All models run simultaneously (respects parallelism limit)
 * executionStrategy='sequential': Models run one after another
 *
 * Example Timeline (Fast-then-Premium):
 *
 * Time 0s:    Start Group 1 (fast-tier)
 *   0.5s:       gpt-4o-mini executing (parallel)
 *   0.5s:       gemini-flash executing (parallel)
 *   1.2s:     Group 1 complete (both succeed)
 *   1.2s:     Check minSuccessful=1 ✓
 *   1.2s:   Start Group 2 (premium-tier)
 *   1.7s:       gpt-4o executing (parallel)
 *   1.7s:       claude-3.5 executing (parallel)
 *   4.5s:     Group 2 complete
 *   4.5s:   All groups complete
 *   4.5s: Send all 4 responses to judge
 */

// ============================================================================
// BACKWARD COMPATIBILITY
// ============================================================================

/*
 * If workflow has ONLY `models` array (no modelGroups):
 * - Internally converted to single ModelGroup with executionStrategy='parallel'
 * - Behaves exactly like before
 * - No breaking changes
 *
 * If workflow has `modelGroups`:
 * - modelGroups takes precedence
 * - models array is ignored (kept for schema validation only)
 * - Layer-based execution is used
 */

export {
  simpleParallelWorkflow,
  fastThenPremiumWorkflow,
  fallbackChainWorkflow,
  mixedStrategyWorkflow,
  costOptimizedWorkflow,
};
