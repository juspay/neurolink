---
title: Workflow Engine Guide
description: Multi-model orchestration with ensemble execution, judge-based scoring, and adaptive fallback workflows
keywords:
  [
    workflow,
    ensemble,
    multi-model,
    orchestration,
    judge,
    scoring,
    consensus,
    fallback,
    adaptive,
  ]
---

# Workflow Engine Guide

> **Since**: v9.20.0 | **Status**: Stable (Testing Phase) | **Availability**: SDK + CLI
>
> **Provider Defaults:** When `--provider` (CLI) or `provider` (SDK) is not specified, NeuroLink defaults to **Vertex AI** with **gemini-2.5-flash**. Set the `NEUROLINK_PROVIDER` or `AI_PROVIDER` environment variable to change the default provider.

## Overview

The NeuroLink Workflow Engine enables multi-model orchestration patterns where multiple AI models collaborate to produce higher-quality outputs. Instead of relying on a single model, the engine:

- **Executes multiple models** in parallel or sequential layers
- **Evaluates responses** using independent judge models that score on a 0-100 scale
- **Selects the best response** based on judge scores, or synthesizes an improved response from all outputs
- **Provides detailed metrics** including per-model response times, token usage, confidence, and consensus levels

The engine ships with 9 pre-built workflows and supports fully custom configurations.

**Current Phase:** Testing and Evaluation. Workflows return the best original response alongside evaluation scores for AB testing. Response conditioning (post-processing) is available but optional.

## Quick Start

### Using a Pre-built Workflow (SDK)

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Use a pre-built workflow by ID
// The `consensus-3` workflow is one of 9 pre-built workflows included with
// NeuroLink — no registration required.
const result = await neurolink.generate({
  input: { text: "Explain the CAP theorem in distributed systems" },
  workflow: "consensus-3",
});

console.log(result.content); // Best response selected by the judge
console.log(result.workflow?.judgeScores); // Scores for each model
console.log(result.workflow?.selectedModel); // Which model won
console.log(result.workflow?.metrics); // Timing breakdown
```

### Using a Pre-built Workflow (CLI)

```bash
# Execute a workflow
neurolink workflow execute consensus-3 "Explain the CAP theorem"

# List all available workflows
neurolink workflow list

# Inspect a workflow's configuration
neurolink workflow info consensus-3
```

## Pre-built Workflows

NeuroLink ships with 9 pre-built workflows covering common orchestration patterns.

| Workflow ID           | Type       | Models | Judges | Use Case                                     | Avg Cost | Avg Latency |
| --------------------- | ---------- | ------ | ------ | -------------------------------------------- | -------- | ----------- |
| `consensus-3`         | `ensemble` | 3      | 1      | Balanced quality across providers            | ~$0.02   | ~2s         |
| `consensus-3-fast`    | `ensemble` | 3      | 1      | Fast consensus for simple queries            | ~$0.01   | ~1.5s       |
| `balanced-adaptive`   | `adaptive` | 4      | 1      | Balanced speed/quality/cost tradeoff         | ~$0.04   | ~2.5s       |
| `quality-max`         | `adaptive` | 5      | 1      | Maximum quality with 3-tier escalation       | ~$0.08   | ~4.5s       |
| `speed-first`         | `adaptive` | 3      | 1      | Speed-optimized with quality fallback        | ~$0.01   | ~1.5s       |
| `aggressive-fallback` | `chain`    | 3      | 1      | Fast first, then parallel premium fallback   | ~$0.03   | ~2.5s       |
| `fast-fallback`       | `chain`    | 3      | 1      | Sequential fast-to-premium fallback          | ~$0.01   | ~2s         |
| `multi-judge-3`       | `ensemble` | 3      | 2      | Balanced multi-judge evaluation              | ~$0.04   | ~3.5s       |
| `multi-judge-5`       | `ensemble` | 5      | 3      | Critical decisions requiring high confidence | ~$0.10   | ~5s         |

### Workflow Details

**`consensus-3`** runs GPT-4o, Claude 3.5 Sonnet, and Gemini 2.0 Flash in parallel. GPT-4o acts as judge, scoring on accuracy, clarity, and completeness.

**`consensus-3-fast`** uses cheaper models (GPT-4o-mini, Claude 3 Haiku, Gemini 2.0 Flash) with GPT-4o-mini as judge. Same consensus pattern at lower cost.

**`balanced-adaptive`** uses a 2-tier approach: first runs GPT-4o-mini and Gemini Flash in parallel (standard tier), then escalates to GPT-4o and Claude 3.5 Sonnet (premium tier).

**`quality-max`** runs a 3-tier pipeline: validation tier (2 fast models) -> premium tier (GPT-4o + Claude 3.5 Sonnet) -> expert tier (Claude 3.5 Sonnet with specialized prompt). All responses are judged for maximum quality.

**`speed-first`** tries GPT-4o-mini first (5s timeout), falls back to Gemini 2.0 Flash, then GPT-4o. Optimized for latency-sensitive applications.

**`aggressive-fallback`** tries GPT-4o-mini first; if it fails, runs both GPT-4o and Claude 3.5 Sonnet in parallel for guaranteed quality.

**`fast-fallback`** is a 3-tier sequential chain: GPT-4o-mini -> Gemini 2.0 Flash -> GPT-4o. Each tier only executes if the previous one fails.

**`multi-judge-3`** runs 3 models and uses 2 independent judges (GPT-4o and Claude 3.5 Sonnet) with averaged scores.

**`multi-judge-5`** runs 5 models across OpenAI, Anthropic, and Google, with 3 independent judges each evaluating different criteria (accuracy, reasoning, completeness). Scores are averaged and consensus level is reported.

## Workflow Types

### Ensemble (`type: "ensemble"`)

All models execute in parallel. A judge (or multiple judges) evaluates every response and selects the best one.

```
User Prompt
    │
    ├──▶ Model A ──▶ Response A ─┐
    ├──▶ Model B ──▶ Response B ──┼──▶ Judge ──▶ Best Response
    └──▶ Model C ──▶ Response C ─┘
```

Best for: General-purpose quality improvement, cross-validation, critical decisions.

### Chain (`type: "chain"`)

Model groups execute sequentially. Each group is a "tier" that runs only if previous tiers failed or the workflow configuration requires it. Uses `modelGroups` for layer-based execution.

```
User Prompt
    │
    ▼
 Fast Tier (GPT-4o-mini)
    │
    ├── Success? ──▶ Judge ──▶ Best Response
    │
    ▼ (on failure)
 Mid Tier (Gemini Flash)
    │
    ├── Success? ──▶ Judge ──▶ Best Response
    │
    ▼ (on failure)
 Premium Tier (GPT-4o)
    │
    └──▶ Judge ──▶ Best Response
```

Best for: Cost optimization with quality guarantee, variable-complexity queries.

### Adaptive (`type: "adaptive"`)

Similar to chain but designed for quality escalation. All tiers execute and their responses are collected, then the judge selects the best from all tiers.

```
User Prompt
    │
    ▼
 Standard Tier (parallel: GPT-4o-mini + Gemini Flash)
    │
    ▼
 Premium Tier (parallel: GPT-4o + Claude 3.5 Sonnet)
    │
    ▼
 All Responses ──▶ Judge ──▶ Best Response
```

Best for: Quality-critical tasks, complex analysis, production applications.

### Custom (`type: "custom"`)

Define your own execution pattern using any combination of flat models, model groups, single or multiple judges, and conditioning.

## SDK Usage

### Using Pre-built Workflows by ID

Pass the `workflow` option to `generate()` with a pre-built workflow ID. The workflow must first be registered in the workflow registry.

```typescript
import {
  NeuroLink,
  registerWorkflow,
  CONSENSUS_3_WORKFLOW,
} from "@juspay/neurolink";

// Register the workflow (typically done at app startup)
registerWorkflow(CONSENSUS_3_WORKFLOW);

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "What are the tradeoffs of microservices vs monoliths?" },
  workflow: "consensus-3",
});

// The result includes standard fields plus workflow data
console.log(result.content); // Best response
console.log(result.provider); // Provider of the selected response
console.log(result.model); // Model of the selected response
console.log(result.responseTime); // Total workflow time

// Workflow-specific data
console.log(result.workflow?.originalResponse); // Unmodified best response
console.log(result.workflow?.processedResponse); // After any conditioning
console.log(result.workflow?.ensembleResponses); // All model responses
console.log(result.workflow?.judgeScores); // Judge evaluation
console.log(result.workflow?.selectedModel); // "openai-gpt-4o"
console.log(result.workflow?.metrics); // Timing breakdown
```

### Using Inline Workflow Configuration

Pass `workflowConfig` directly for full control without pre-registration.

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Design a caching strategy for a high-traffic API" },
  workflowConfig: {
    id: "my-custom-workflow",
    name: "Custom 2-Model Ensemble",
    type: "ensemble",
    models: [
      {
        provider: "openai",
        model: "gpt-4o",
        temperature: 0.7,
      },
      {
        provider: "anthropic",
        model: "claude-3-5-sonnet-20241022",
        temperature: 0.7,
      },
    ],
    judge: {
      provider: "openai",
      model: "gpt-4o",
      criteria: ["technical_accuracy", "completeness", "clarity"],
      outputFormat: "detailed",
      includeReasoning: true,
      temperature: 0.1,
      scoreScale: { min: 0, max: 100 },
    },
    execution: {
      parallelism: 2,
      timeout: 30000,
      modelTimeout: 25000,
      minResponses: 1,
    },
  },
});
```

### Using the Low-Level API

For advanced use cases, call the workflow runner directly.

```typescript
import { runWorkflow, CONSENSUS_3_WORKFLOW } from "@juspay/neurolink";

const result = await runWorkflow(CONSENSUS_3_WORKFLOW, {
  prompt: "Explain quantum entanglement",
  timeout: 30000,
  verbose: true,
  metadata: { userId: "user-123", requestId: "req-456" },
});

console.log("Best response:", result.content);
console.log("Score:", result.score); // 0-100
console.log("Confidence:", result.confidence); // 0-1
console.log("Reasoning:", result.reasoning);
console.log("Ensemble time:", result.ensembleTime, "ms");
console.log("Judge time:", result.judgeTime, "ms");
console.log("Total time:", result.totalTime, "ms");
```

### Progressive Streaming

The workflow engine supports progressive streaming, yielding a preliminary response from the first model that completes, followed by the final judged response.

```typescript
import {
  runWorkflowWithStreaming,
  CONSENSUS_3_WORKFLOW,
} from "@juspay/neurolink";

for await (const chunk of runWorkflowWithStreaming(CONSENSUS_3_WORKFLOW, {
  prompt: "Explain quantum entanglement",
  streaming: true,
})) {
  if (chunk.type === "preliminary") {
    console.log("Fast preliminary response:", chunk.content);
  } else {
    console.log("Final judged response:", chunk.content);
    console.log("Score:", chunk.partialResult?.score);
  }
}
```

### Workflow Registry

Register, list, and manage workflows programmatically.

```typescript
import {
  registerWorkflow,
  unregisterWorkflow,
  getWorkflow,
  listWorkflows,
  getRegistryStats,
  clearRegistry,
  CONSENSUS_3_WORKFLOW,
  MULTI_JUDGE_5_WORKFLOW,
} from "@juspay/neurolink";

// Register workflows
registerWorkflow(CONSENSUS_3_WORKFLOW);
registerWorkflow(MULTI_JUDGE_5_WORKFLOW);

// Register with options
registerWorkflow(myCustomWorkflow, {
  validateBeforeRegister: true, // Validate config (default: true)
  allowOverwrite: false, // Overwrite existing (default: false)
});

// List all registered workflows
const workflows = listWorkflows();
const ensembleOnly = listWorkflows({ type: "ensemble" });
const taggedWorkflows = listWorkflows({ tags: ["high-confidence"] });

// Get a specific workflow
const config = getWorkflow("consensus-3");

// Get registry statistics
const stats = getRegistryStats();
console.log("Total workflows:", stats.totalWorkflows);
console.log("By type:", stats.byType);
console.log("Most used:", stats.mostUsed);

// Unregister
unregisterWorkflow("consensus-3");

// Clear all
clearRegistry();
```

### Factory Functions for Custom Workflows

Use the built-in factory functions to create variations of pre-built workflows.

```typescript
import {
  createConsensus3WithPrompt,
  createAdaptiveWorkflow,
  createMultiJudgeWorkflow,
} from "@juspay/neurolink";

// Consensus-3 with a custom system prompt
const techWorkflow = createConsensus3WithPrompt(
  "You are a technical expert. Provide detailed, accurate responses with code examples.",
);

// Adaptive workflow with strategy
const speedWorkflow = createAdaptiveWorkflow(3, "speed"); // 3-tier, speed-optimized
const qualityWorkflow = createAdaptiveWorkflow(3, "quality"); // 3-tier, quality-optimized
const balancedWorkflow = createAdaptiveWorkflow(2, "balanced"); // 2-tier, balanced

// Custom multi-judge workflow
const customMultiJudge = createMultiJudgeWorkflow(5, 3); // 5 models, 3 judges
const lightMultiJudge = createMultiJudgeWorkflow(3, 2); // 3 models, 2 judges
```

## CLI Usage

### List Workflows

```bash
neurolink workflow list
```

Output:

```
Available Workflows:

  consensus-3              Consensus-3 Ensemble
                           3-model parallel ensemble with judge-based selection
                           Tags: ensemble, consensus, balanced, multi-provider

  consensus-3-fast         Consensus-3 Fast
                           3-model fast ensemble (lower cost)
                           Tags: ensemble, fast, low-cost, consensus

  fast-fallback            Fast-Fallback Chain
                           Sequential fallback: fast -> mid -> premium
                           Tags: chain, fallback, cost-optimized, reliable

  ...

Total: 9 workflows
```

### Inspect a Workflow

```bash
neurolink workflow info consensus-3
```

Output:

```
Workflow: Consensus-3 Ensemble

  ID:          consensus-3
  Type:        ensemble
  Version:     1.0.0
  Description: 3-model parallel ensemble with judge-based selection

  Models:
    - GPT-4o (openai)
    - Claude 3.5 Sonnet (anthropic)
    - Gemini 2.0 Flash (google-ai-studio)

  Judge: gpt-4o (openai)
  Criteria: accuracy, clarity, completeness

  Execution:
    Timeout:     30000ms
    Parallelism: 3
    Min Responses: 2

  Tags: ensemble, consensus, balanced, multi-provider
```

### Execute a Workflow

```bash
# Basic execution
neurolink workflow execute consensus-3 "Explain the CAP theorem"

# With options
neurolink workflow execute multi-judge-5 "Should we use Kubernetes?" \
  --timeout 45000 \
  --verbose

# Override provider/model for all models in the workflow
neurolink workflow execute consensus-3 "Explain REST vs GraphQL" \
  --provider openai \
  --model gpt-4o
```

## Custom Workflow Configuration

### WorkflowConfig Reference

```typescript
type WorkflowConfig = {
  // Required
  id: string; // Unique workflow identifier
  name: string; // Human-readable name
  type: WorkflowType; // "ensemble" | "chain" | "adaptive" | "custom"
  models: ModelConfig[]; // Flat model array (required, used if modelGroups absent)

  // Optional
  description?: string;
  version?: string;
  modelGroups?: ModelGroup[]; // Layer-based execution (overrides models)
  defaultSystemPrompt?: string; // Default system prompt for all models
  defaultJudgePrompt?: string; // Default evaluation prompt for judges
  judge?: JudgeConfig; // Single judge
  judges?: JudgeConfig[]; // Multiple judges (cannot use both judge and judges)
  conditioning?: ConditioningConfig; // Response post-processing
  execution?: ExecutionConfig; // Timeout, parallelism, cost controls
  tags?: string[];
  metadata?: Record<string, JsonValue>;
  createdAt?: string;
  updatedAt?: string;
};
```

### ModelConfig

```typescript
type ModelConfig = {
  provider: AIProviderName; // "openai", "anthropic", "google-ai-studio", etc.
  model: string; // Model identifier (e.g., "gpt-4o")
  weight?: number; // Weighted voting (0-1, default: 1.0)
  temperature?: number; // 0-2 (default: provider default)
  maxTokens?: number; // Max output tokens
  systemPrompt?: string; // Model-specific system prompt
  timeout?: number; // Per-model timeout in ms
  topP?: number;
  topK?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  label?: string; // Human-readable label
  metadata?: Record<string, JsonValue>;
};
```

### ModelGroup (Layer-based Execution)

```typescript
type ModelGroup = {
  id: string; // Group identifier
  name?: string;
  description?: string;
  models: ModelConfig[]; // Models in this group
  executionStrategy: "parallel" | "sequential"; // How models run within group
  continueOnFailure?: boolean; // Continue to next group if this fails (default: true)
  minSuccessful?: number; // Minimum successful models to proceed (default: 1)
  parallelism?: number; // Max parallel models in this group
  timeout?: number; // Group-level timeout (ms)
  metadata?: Record<string, JsonValue>;
};
```

### JudgeConfig

```typescript
type JudgeConfig = {
  provider: AIProviderName; // Judge provider
  model: string; // Judge model
  criteria: string[]; // Evaluation criteria (e.g., ["accuracy", "clarity"])
  outputFormat: "scores" | "ranking" | "best" | "detailed";
  includeReasoning: boolean; // Always include explanation
  scoreScale: { min: 0; max: 100 }; // Fixed 0-100 scale
  temperature?: number; // Low recommended (e.g., 0.1)
  maxTokens?: number; // Max judge output tokens
  timeout?: number; // Judge timeout (ms)
  customPrompt?: string; // Custom evaluation prompt
  systemPrompt?: string; // System instructions for judge
  blindEvaluation?: boolean; // Hide provider names from judge
  synthesizeImprovedResponse?: boolean; // Judge synthesizes improved response
  label?: string;
  metadata?: Record<string, JsonValue>;
};
```

### ExecutionConfig

```typescript
type ExecutionConfig = {
  timeout?: number; // Total workflow timeout (ms, default: 30000)
  modelTimeout?: number; // Per-model timeout (ms, default: 15000)
  judgeTimeout?: number; // Judge timeout (ms, default: 10000)
  retries?: number; // Max retries on failure (default: 1)
  retryDelay?: number; // Delay between retries (ms, default: 1000)
  parallelism?: number; // Max parallel models (default: 10)
  minResponses?: number; // Minimum required responses (default: 1)
  maxCost?: number; // Max cost per execution ($)
  costThreshold?: number; // Warn at cost threshold ($)
  enableMetrics?: boolean; // Enable metrics collection (default: true)
  enableTracing?: boolean; // Enable tracing (default: false)
};
```

### Full Custom Example

```typescript
import { NeuroLink, registerWorkflow, runWorkflow } from "@juspay/neurolink";
import type { WorkflowConfig } from "@juspay/neurolink";

const myWorkflow: WorkflowConfig = {
  id: "medical-review",
  name: "Medical Document Review",
  description: "Multi-model review with synthesis for medical accuracy",
  version: "1.0.0",
  type: "ensemble",

  models: [
    {
      provider: "openai",
      model: "gpt-4o",
      label: "GPT-4o",
      temperature: 0.3,
      systemPrompt:
        "You are a medical expert. Provide accurate, evidence-based responses.",
    },
    {
      provider: "anthropic",
      model: "claude-3-5-sonnet-20241022",
      label: "Claude 3.5 Sonnet",
      temperature: 0.3,
      systemPrompt:
        "You are a medical expert. Be thorough and cite relevant guidelines.",
    },
    {
      provider: "google-ai-studio",
      model: "gemini-2.0-flash",
      label: "Gemini 2.0 Flash",
      temperature: 0.3,
    },
  ],

  judge: {
    provider: "openai",
    model: "gpt-4o",
    criteria: [
      "medical_accuracy",
      "evidence_quality",
      "completeness",
      "safety",
    ],
    outputFormat: "detailed",
    includeReasoning: true,
    blindEvaluation: true, // Hide model names from judge
    synthesizeImprovedResponse: true, // Judge creates improved response
    temperature: 0.1,
    scoreScale: { min: 0, max: 100 },
  },

  execution: {
    parallelism: 3,
    timeout: 45000,
    modelTimeout: 30000,
    minResponses: 2,
    costThreshold: 0.1,
  },

  tags: ["medical", "high-accuracy", "synthesis"],
};

// Register and use
registerWorkflow(myWorkflow);

const result = await runWorkflow(myWorkflow, {
  prompt: "What are the current guidelines for managing type 2 diabetes?",
  verbose: true,
});

// When synthesizeImprovedResponse is enabled, result.content contains
// the judge's synthesized response combining the best elements.
console.log("Synthesized response:", result.content);
console.log("Original best:", result.originalContent);
console.log("Score:", result.score);
```

### Layer-based Execution Example

```typescript
const tieredWorkflow: WorkflowConfig = {
  id: "tiered-analysis",
  name: "Tiered Analysis Pipeline",
  type: "adaptive",

  // Placeholder (required by schema)
  models: [{ provider: "openai", model: "gpt-4o-mini" }],

  // Layer-based execution: groups run sequentially
  modelGroups: [
    {
      id: "fast-tier",
      name: "Fast Assessment",
      models: [
        { provider: "openai", model: "gpt-4o-mini", timeout: 8000 },
        {
          provider: "google-ai-studio",
          model: "gemini-2.0-flash",
          timeout: 8000,
        },
      ],
      executionStrategy: "parallel",
      continueOnFailure: true,
      minSuccessful: 1,
      parallelism: 2,
    },
    {
      id: "deep-tier",
      name: "Deep Analysis",
      models: [
        {
          provider: "openai",
          model: "gpt-4o",
          systemPrompt: "Provide deep, thorough analysis.",
          timeout: 20000,
        },
        {
          provider: "anthropic",
          model: "claude-3-5-sonnet-20241022",
          systemPrompt: "Think carefully. Provide nuanced analysis.",
          timeout: 20000,
        },
      ],
      executionStrategy: "parallel",
      continueOnFailure: false,
      minSuccessful: 1,
      parallelism: 2,
    },
  ],

  judge: {
    provider: "openai",
    model: "gpt-4o",
    criteria: ["depth", "accuracy", "completeness"],
    outputFormat: "detailed",
    includeReasoning: true,
    temperature: 0.1,
    scoreScale: { min: 0, max: 100 },
  },

  execution: {
    timeout: 60000,
    minResponses: 2,
  },
};
```

## WorkflowResult

The `WorkflowResult` returned by `runWorkflow()` contains the full execution data.

| Field               | Type                        | Description                                            |
| ------------------- | --------------------------- | ------------------------------------------------------ |
| `content`           | `string`                    | Final output (processed/synthesized if enabled)        |
| `originalContent`   | `string`                    | Original unmodified best response                      |
| `score`             | `number`                    | Judge score for best response (0-100)                  |
| `reasoning`         | `string`                    | Judge's evaluation reasoning (max 200 chars)           |
| `ensembleResponses` | `EnsembleResponse[]`        | All model responses with status and timing             |
| `judgeScores`       | `JudgeScores`               | Full judge evaluation data                             |
| `selectedResponse`  | `EnsembleResponse`          | The response selected as best                          |
| `confidence`        | `number`                    | Judge confidence in the evaluation (0-1)               |
| `consensus`         | `number`                    | Agreement level between judges (0-1, multi-judge only) |
| `totalTime`         | `number`                    | Total workflow execution time (ms)                     |
| `ensembleTime`      | `number`                    | Time spent executing models (ms)                       |
| `judgeTime`         | `number`                    | Time spent on judge evaluation (ms)                    |
| `conditioningTime`  | `number`                    | Time spent on response conditioning (ms)               |
| `workflow`          | `string`                    | Workflow ID                                            |
| `workflowName`      | `string`                    | Workflow name                                          |
| `usage`             | `AggregatedUsage`           | Token usage across all models                          |
| `metadata`          | `Record<string, JsonValue>` | Pass-through metadata                                  |
| `timestamp`         | `string`                    | ISO 8601 execution timestamp                           |

When using `generate()` with a workflow, the result includes a `workflow` field on the `GenerateResult`:

```typescript
result.workflow?.originalResponse; // Raw best response before processing
result.workflow?.processedResponse; // After conditioning
result.workflow?.ensembleResponses; // All model outputs
result.workflow?.judgeScores?.scores; // { "response-0": 85, "response-1": 92 }
result.workflow?.judgeScores?.reasoning; // Judge explanation
result.workflow?.selectedModel; // "openai-gpt-4o"
result.workflow?.metrics?.totalTime; // Total execution time
result.workflow?.metrics?.ensembleTime; // Model execution time
result.workflow?.metrics?.judgeTime; // Judge evaluation time
result.workflow?.workflowId; // Workflow ID
result.workflow?.workflowName; // Workflow name
```

## Architecture

The workflow engine follows a four-phase pipeline:

```
┌──────────────────────────────────────────────────────────┐
│                    Workflow Runner                         │
│                                                           │
│  1. ENSEMBLE EXECUTION                                    │
│     ┌─────────┐  ┌─────────┐  ┌─────────┐               │
│     │ Model A │  │ Model B │  │ Model C │  (parallel)    │
│     └────┬────┘  └────┬────┘  └────┬────┘               │
│          │            │            │                      │
│          ▼            ▼            ▼                      │
│  2. JUDGE SCORING                                         │
│     ┌──────────────────────────────────┐                  │
│     │  Judge evaluates all responses   │                  │
│     │  Scores: 0-100 per response      │                  │
│     │  Ranking + reasoning             │                  │
│     └──────────────┬───────────────────┘                  │
│                    │                                      │
│                    ▼                                      │
│  3. RESPONSE SELECTION / SYNTHESIS                        │
│     Best response selected by score                       │
│     (or synthesized if judge synthesis enabled)           │
│                    │                                      │
│                    ▼                                      │
│  4. RESULT ASSEMBLY                                       │
│     Metrics, usage, confidence, consensus                 │
└──────────────────────────────────────────────────────────┘
```

**Key components:**

| Component               | File                                           | Purpose                                 |
| ----------------------- | ---------------------------------------------- | --------------------------------------- |
| **WorkflowRunner**      | `src/lib/workflow/core/workflowRunner.ts`      | Main orchestrator, drives the pipeline  |
| **EnsembleExecutor**    | `src/lib/workflow/core/ensembleExecutor.ts`    | Parallel/sequential model execution     |
| **JudgeScorer**         | `src/lib/workflow/core/judgeScorer.ts`         | Judge evaluation and multi-judge voting |
| **ResponseConditioner** | `src/lib/workflow/core/responseConditioner.ts` | Optional response post-processing       |
| **WorkflowRegistry**    | `src/lib/workflow/core/workflowRegistry.ts`    | In-memory workflow storage and lookup   |
| **Config/Validation**   | `src/lib/workflow/config.ts`                   | Zod schemas, defaults, validation       |

### System Prompt Resolution

System prompts follow a hierarchical fallback:

1. **Direct parameter** (highest priority) -- passed in `RunWorkflowOptions`
2. **Model-specific** `systemPrompt` -- set on individual `ModelConfig`
3. **Workflow-level** `defaultSystemPrompt` -- set on `WorkflowConfig`
4. **Provider default** (lowest priority)

Judge prompts follow the same pattern:

1. **Judge-specific** `customPrompt`
2. **Workflow-level** `defaultJudgePrompt`
3. **Built-in default** evaluation template

### Multi-Judge Voting

When multiple judges are configured (`judges` array), each judge evaluates all responses independently in parallel. Scores are aggregated by averaging, and a consensus level (0-1) measures agreement between judges on the best response.

## Configuration Reference

### Execution Defaults

| Setting         | Default | Description                           |
| --------------- | ------- | ------------------------------------- |
| `timeout`       | 30000   | Total workflow timeout (ms)           |
| `modelTimeout`  | 15000   | Per-model timeout (ms)                |
| `judgeTimeout`  | 10000   | Judge timeout (ms)                    |
| `retries`       | 1       | Max retries on failure                |
| `retryDelay`    | 1000    | Delay between retries (ms)            |
| `parallelism`   | 10      | Max parallel model executions         |
| `minResponses`  | 1       | Minimum successful responses required |
| `enableMetrics` | true    | Enable metrics collection             |
| `enableTracing` | false   | Enable OpenTelemetry tracing          |

### Judge Defaults

| Setting            | Default                | Description                    |
| ------------------ | ---------------------- | ------------------------------ |
| `temperature`      | 0.1                    | Low for consistent evaluation  |
| `outputFormat`     | `"detailed"`           | Include full scoring details   |
| `blindEvaluation`  | false                  | Whether to hide provider names |
| `includeReasoning` | true                   | Always required                |
| `scoreScale`       | `{ min: 0, max: 100 }` | Fixed scale for testing phase  |

### Environment Variables

| Variable            | Description                            | Required |
| ------------------- | -------------------------------------- | -------- |
| `OPENAI_API_KEY`    | For OpenAI models and judges           | Yes\*    |
| `ANTHROPIC_API_KEY` | For Anthropic models and judges        | Yes\*    |
| `GOOGLE_AI_API_KEY` | For Google AI Studio models and judges | Yes\*    |

\*Required if using the corresponding provider in your workflow configuration.

## Validation

Workflow configurations are validated using Zod schemas before execution.

```typescript
import { validateWorkflow, validateForExecution } from "@juspay/neurolink";

const validation = validateWorkflow(myConfig);
if (!validation.valid) {
  console.error("Errors:", validation.errors);
  console.warn("Warnings:", validation.warnings);
}
```

**Validation rules include:**

- `id` and `name` are required and non-empty
- At least one model is required
- Ensemble and adaptive workflows require at least 2 models
- Cannot specify both `judge` and `judges` (use one or the other)
- Score scale must be `{ min: 0, max: 100 }`
- Temperature must be between 0 and 2
- Weights must be between 0 and 1

## Metrics and Analytics

```typescript
import {
  calculateModelMetrics,
  calculateConfidence,
  calculateConsensus,
  generateSummaryStats,
  compareWorkflows,
  formatMetricsForLogging,
} from "@juspay/neurolink";

// Calculate metrics from a workflow result
const metrics = calculateModelMetrics(result.ensembleResponses);
const confidence = calculateConfidence(result.judgeScores);
const consensus = calculateConsensus(result.judgeScores);

// Generate summary statistics from multiple results
const stats = generateSummaryStats(results);

// Compare two workflows
const comparison = compareWorkflows(statsA, statsB);
console.log("Winner:", comparison.winner);
console.log("Reason:", comparison.reasoning);

// Format metrics for logging
const formatted = formatMetricsForLogging(result);
```

## Best Practices

1. **Start with `consensus-3-fast`** for development and testing. It is the cheapest pre-built workflow while still providing multi-model validation.

2. **Use `minResponses`** to control fault tolerance. Setting `minResponses: 2` means the workflow requires at least 2 successful model responses before judging.

3. **Keep judge temperature low** (0.1-0.2). Higher temperatures make judge evaluations less consistent.

4. **Enable `blindEvaluation`** when you want unbiased judging. This hides provider and model names from the judge prompt.

5. **Use `synthesizeImprovedResponse`** when you want the judge to create a new response that combines the best elements from all models, rather than just selecting one.

6. **Use `modelGroups` for cost optimization.** Chain and adaptive workflows with tiers allow cheaper models to handle simple queries, escalating to premium models only when needed.

7. **Set appropriate timeouts.** Per-model timeouts should be shorter than the total workflow timeout. Account for both ensemble execution and judge evaluation time.

8. **Monitor costs.** Use `costThreshold` to get warnings when workflow execution costs exceed your budget.

## Troubleshooting

| Problem                           | Solution                                                                           |
| --------------------------------- | ---------------------------------------------------------------------------------- |
| Workflow not found in registry    | Register it with `registerWorkflow()` before calling `generate()` with `workflow:` |
| All models failed                 | Check API keys, increase `timeout`, verify provider availability                   |
| Judge returns neutral scores (50) | Judge response parsing failed; check judge model supports JSON output              |
| Slow execution                    | Reduce model count, use faster models, increase `parallelism`                      |
| High costs                        | Use `consensus-3-fast`, chain/adaptive workflows, or set `costThreshold`           |
| Low consensus in multi-judge      | Normal for subjective queries; increase judge count or align criteria              |

## API Reference

### Core Exports

**Execution:**

- `runWorkflow(config, options)` -- Execute a complete workflow
- `runWorkflowWithStreaming(config, options)` -- Execute with progressive streaming
- `executeEnsemble(options)` -- Low-level parallel model execution
- `executeModelGroups(groups, prompt, config)` -- Low-level layer-based execution
- `scoreEnsemble(options)` -- Low-level judge scoring
- `conditionResponse(options)` -- Low-level response conditioning

**Configuration:**

- `createWorkflowConfig(partial)` -- Create config with defaults
- `validateWorkflow(config)` -- Validate workflow configuration
- `validateForExecution(config)` -- Validate for execution readiness

**Registry:**

- `registerWorkflow(config, options)` -- Register a workflow
- `unregisterWorkflow(workflowId)` -- Remove a workflow
- `getWorkflow(workflowId)` -- Retrieve by ID
- `listWorkflows(options)` -- List with filtering
- `getRegistryStats()` -- Registry statistics
- `clearRegistry()` -- Remove all workflows

**Pre-built Workflows:**

- `CONSENSUS_3_WORKFLOW` -- 3-model ensemble with judge
- `CONSENSUS_3_FAST_WORKFLOW` -- Fast/cheap 3-model ensemble
- `BALANCED_ADAPTIVE_WORKFLOW` -- 2-tier balanced adaptive
- `QUALITY_MAX_WORKFLOW` -- 3-tier quality-maximizing adaptive
- `SPEED_FIRST_WORKFLOW` -- Speed-optimized adaptive
- `AGGRESSIVE_FALLBACK_WORKFLOW` -- Fast + parallel premium fallback
- `FAST_FALLBACK_WORKFLOW` -- Sequential 3-tier fallback
- `MULTI_JUDGE_3_WORKFLOW` -- 3 models, 2 judges
- `MULTI_JUDGE_5_WORKFLOW` -- 5 models, 3 judges

**Factory Functions:**

- `createConsensus3WithPrompt(systemPrompt)` -- Consensus-3 with custom prompt
- `createAdaptiveWorkflow(tiers, strategy)` -- Custom adaptive workflow
- `createMultiJudgeWorkflow(modelCount, judgeCount)` -- Custom multi-judge

**Metrics:**

- `calculateModelMetrics(responses)` -- Per-model metrics
- `calculateConfidence(scores)` -- Confidence calculation
- `calculateConsensus(scores)` -- Consensus calculation
- `generateSummaryStats(results)` -- Summary statistics
- `compareWorkflows(stats1, stats2)` -- Workflow comparison
- `formatMetricsForLogging(result)` -- Formatted logging output

**Types:**

- `WorkflowConfig`, `WorkflowType`, `WorkflowResult`
- `ModelConfig`, `ModelGroup`, `ExecutionStrategy`
- `JudgeConfig`, `JudgeScores`, `MultiJudgeScores`
- `EnsembleResponse`, `ExecutionConfig`
- `ConditioningConfig`, `RunWorkflowOptions`
- `WorkflowError`, `WorkflowValidationResult`

## See Also

- [Provider Orchestration Guide](./provider-orchestration.md) -- Multi-provider configuration
- [Observability Guide](./observability.md) -- Tracing workflow executions with Langfuse
- [Structured Output Guide](./structured-output.md) -- JSON schema output (note: incompatible with Gemini tools)
