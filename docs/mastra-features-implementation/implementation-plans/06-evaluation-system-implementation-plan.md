# Evaluation and Scoring System - Phased Implementation Plan

## Document Information

| Property           | Value                                                                 |
| ------------------ | --------------------------------------------------------------------- |
| Feature            | Mastra-Style Evaluation and Scoring System                            |
| Reference Document | `docs/mastra-features-implementation/06-evaluation-scoring-system.md` |
| Status             | Planning                                                              |
| Version            | 1.0.0                                                                 |
| Created            | 2026-01-22                                                            |

---

## Executive Summary

This document outlines a phased implementation plan for building a Mastra-style evaluation and scoring system within NeuroLink. The system extends the existing RAGAS-based evaluation infrastructure with modular scorers, custom evaluation pipelines, sampling strategies, and deep observability integration.

**Key Deliverables:**

- Modular scorer architecture with plug-and-play evaluation metrics
- 14+ built-in scorers (LLM-based and rule-based)
- Custom scorer API for domain-specific evaluations
- Evaluation pipeline with configurable aggregation
- Sampling strategies for cost-efficient evaluation
- Full observability integration (Langfuse, OpenTelemetry)
- CLI commands for evaluation workflows
- Comprehensive test coverage

**Total Estimated Effort:** 8-10 weeks (1-2 engineers)

---

## Table of Contents

1. [Prerequisites and Dependencies](#1-prerequisites-and-dependencies)
2. [Phase 1: Evaluation Framework Core](#2-phase-1-evaluation-framework-core)
3. [Phase 2: Scorer Interface and Registry](#3-phase-2-scorer-interface-and-registry)
4. [Phase 3: Built-in Scorers](#4-phase-3-built-in-scorers)
5. [Phase 4: Custom Scorer API](#5-phase-4-custom-scorer-api)
6. [Phase 5: Evaluation Runner](#6-phase-5-evaluation-runner)
7. [Phase 6: Reporting and Metrics](#7-phase-6-reporting-and-metrics)
8. [Phase 7: CLI Commands and Testing](#8-phase-7-cli-commands-and-testing)
9. [CI/CD Integration](#9-cicd-integration)
10. [Risk Assessment and Mitigation](#10-risk-assessment-and-mitigation)
11. [Success Metrics](#11-success-metrics)

---

## 1. Prerequisites and Dependencies

### 1.1 Existing Infrastructure Dependencies

The evaluation system builds upon these existing NeuroLink components:

| Component                 | Location                                       | Purpose                                           |
| ------------------------- | ---------------------------------------------- | ------------------------------------------------- |
| Evaluator Class           | `src/lib/evaluation/index.ts`                  | Current RAGAS-based evaluation orchestrator       |
| ContextBuilder            | `src/lib/evaluation/contextBuilder.ts`         | Builds evaluation context from requests/responses |
| RAGASEvaluator            | `src/lib/evaluation/ragasEvaluator.ts`         | LLM-as-judge implementation                       |
| PromptBuilder             | `src/lib/evaluation/prompts.ts`                | Constructs LLM judge prompts                      |
| Scoring Utils             | `src/lib/evaluation/scoring.ts`                | Score transformation utilities                    |
| RetryManager              | `src/lib/evaluation/retryManager.ts`           | Retry logic for failed evaluations                |
| AutoEvaluation Middleware | `src/lib/middleware/builtin/autoEvaluation.ts` | Auto-evaluation middleware                        |
| EvaluationTypes           | `src/lib/types/evaluationTypes.ts`             | Type definitions                                  |
| ProviderFactory           | `src/lib/factories/providerFactory.ts`         | Provider creation for LLM-based scorers           |
| Logger                    | `src/lib/utils/logger.ts`                      | Logging utilities                                 |
| Observability             | `src/lib/services/server/ai/observability/`    | Telemetry infrastructure                          |

### 1.2 External Dependencies

| Dependency           | Version | Purpose                     | Installation                     |
| -------------------- | ------- | --------------------------- | -------------------------------- |
| `ai` (Vercel AI SDK) | ^4.x    | LLM integration for scorers | Existing                         |
| `@opentelemetry/api` | ^1.x    | Telemetry API               | Existing                         |
| `langfuse`           | ^3.x    | Observability integration   | Optional, add as peer dependency |
| `zod`                | ^3.x    | Schema validation           | Existing                         |

### 1.3 Environment Requirements

```bash
# Required environment variables for LLM-based scorers
NEUROLINK_EVALUATION_PROVIDER=vertex      # Default provider for scorer LLM calls
NEUROLINK_EVALUATION_MODEL=gemini-2.5-flash  # Default model for evaluation
LANGFUSE_PUBLIC_KEY=pk-...                # Optional: Langfuse integration
LANGFUSE_SECRET_KEY=sk-...                # Optional: Langfuse integration
```

### 1.4 Pre-Implementation Checklist

- [ ] Review and understand current `Evaluator` class implementation
- [ ] Understand `ProviderFactory` pattern for dynamic provider loading
- [ ] Review middleware system architecture
- [ ] Review existing type definitions in `src/lib/types/`
- [ ] Ensure observability infrastructure is functional
- [ ] Set up test environment with evaluation provider access

---

## 2. Phase 1: Evaluation Framework Core

### 2.1 Objectives

Establish the foundational type system and base classes for the scorer architecture.

### 2.2 Deliverables

| Deliverable  | File Path                                  | Description                                 |
| ------------ | ------------------------------------------ | ------------------------------------------- |
| Scorer Types | `src/lib/types/scorerTypes.ts`             | Complete type definitions for scorer system |
| Base Scorer  | `src/lib/evaluation/scorers/baseScorer.ts` | Abstract base class for all scorers         |
| Exports      | `src/lib/evaluation/scorers/index.ts`      | Public API exports                          |

### 2.3 Implementation Tasks

#### Task 1.1: Create Scorer Type Definitions (2 days)

**File:** `src/lib/types/scorerTypes.ts`

```typescript
// Key types to implement:
export type ScorerType = "llm" | "rule" | "hybrid";
export type ScorerCategory =
  | "accuracy"
  | "relevancy"
  | "safety"
  | "quality"
  | "faithfulness"
  | "custom";

export type ScoreResult = {
  scorerId: string;
  scorerName: string;
  score: number;
  normalizedScore: number;
  scale: ScoreScale;
  reasoning: string;
  passed: boolean;
  threshold: number;
  confidence?: number;
  metadata?: JsonObject;
  computeTime: number;
  error?: string;
};

export type Scorer = {
  readonly metadata: ScorerMetadata;
  readonly config: ScorerConfig;
  score(input: ScorerInput): Promise<ScoreResult>;
  validateInput(input: ScorerInput): { valid: boolean; errors: string[] };
  configure(config: Partial<ScorerConfig>): void;
};

// Additional types: ScorerMetadata, ScorerConfig, ScorerInput,
// AggregatedScores, ScorerEvent, etc.
```

**Acceptance Criteria:**

- All types are fully documented with JSDoc comments
- Types follow NeuroLink naming conventions
- Exported from `src/lib/types/index.ts`
- No circular dependencies

#### Task 1.2: Implement BaseScorer Class (1 day)

**File:** `src/lib/evaluation/scorers/baseScorer.ts`

```typescript
export abstract class BaseScorer implements Scorer {
  protected _config: ScorerConfig;
  protected _metadata: ScorerMetadata;

  constructor(metadata: ScorerMetadata, config?: ScorerConfig);

  abstract score(input: ScorerInput): Promise<ScoreResult>;

  validateInput(input: ScorerInput): { valid: boolean; errors: string[] };
  configure(config: Partial<ScorerConfig>): void;

  protected normalizeScore(score: number, scale?: ScoreScale): number;
  protected checkThreshold(normalizedScore: number): boolean;
  protected createScoreResult(score: number, reasoning: string, options?: object): ScoreResult;
  protected executeWithTiming(fn: () => Promise<...>): Promise<ScoreResult>;
}
```

**Acceptance Criteria:**

- Implements common functionality for all scorers
- Provides helper methods for score normalization and threshold checking
- Includes timing wrapper for performance measurement
- Has comprehensive error handling

#### Task 1.3: Create Scorer Directory Structure (0.5 days)

```
src/lib/evaluation/scorers/
├── index.ts                    # Public exports
├── types.ts                    # Re-exports from scorerTypes
├── baseScorer.ts               # Abstract base class
├── scorerRegistry.ts           # Registry (Phase 2)
├── llm/                        # LLM-based scorers
│   ├── index.ts
│   ├── baseLLMScorer.ts
│   └── ... (individual scorers)
├── rule/                       # Rule-based scorers
│   ├── index.ts
│   ├── baseRuleScorer.ts
│   └── ... (individual scorers)
└── hybrid/                     # Hybrid scorers (future)
    └── index.ts
```

### 2.4 Estimated Effort

| Task                          | Effort       | Dependencies |
| ----------------------------- | ------------ | ------------ |
| Task 1.1: Scorer Types        | 2 days       | None         |
| Task 1.2: BaseScorer          | 1 day        | Task 1.1     |
| Task 1.3: Directory Structure | 0.5 days     | None         |
| **Phase 1 Total**             | **3.5 days** |              |

### 2.5 Testing Requirements

```typescript
// test/unit/evaluation/scorers/baseScorer.test.ts
describe("BaseScorer", () => {
  describe("validateInput", () => {
    it("should validate required inputs correctly");
    it("should return errors for missing required fields");
    it("should handle empty string validation");
  });

  describe("normalizeScore", () => {
    it("should normalize scores to 0-1 scale");
    it("should clamp values outside range");
    it("should handle custom scales");
  });

  describe("createScoreResult", () => {
    it("should create properly structured result");
    it("should include all required fields");
  });

  describe("executeWithTiming", () => {
    it("should measure execution time accurately");
    it("should handle errors gracefully");
  });
});
```

---

## 3. Phase 2: Scorer Interface and Registry

### 3.1 Objectives

Implement the scorer registry for dynamic registration and discovery, following NeuroLink's factory + registry pattern.

### 3.2 Deliverables

| Deliverable      | File Path                                           | Description                            |
| ---------------- | --------------------------------------------------- | -------------------------------------- |
| Scorer Registry  | `src/lib/evaluation/scorers/scorerRegistry.ts`      | Central registry for scorer management |
| LLM Base Scorer  | `src/lib/evaluation/scorers/llm/baseLLMScorer.ts`   | Base class for LLM-based scorers       |
| Rule Base Scorer | `src/lib/evaluation/scorers/rule/baseRuleScorer.ts` | Base class for rule-based scorers      |

### 3.3 Implementation Tasks

#### Task 2.1: Implement ScorerRegistry (2 days)

**File:** `src/lib/evaluation/scorers/scorerRegistry.ts`

```typescript
export class ScorerRegistry {
  private static scorers = new Map<string, ScorerRegistryEntry>();
  private static initialized = false;

  static register(entry: ScorerRegistryEntry): void;
  static async registerBuiltInScorers(): Promise<void>;
  static async getScorer(
    scorerId: string,
    config?: ScorerConfig,
  ): Promise<Scorer | undefined>;
  static getScorersByCategory(category: ScorerCategory): ScorerRegistryEntry[];
  static getScorersByType(type: ScorerType): ScorerRegistryEntry[];
  static list(): ScorerMetadata[];
  static has(scorerId: string): boolean;
  static unregister(scorerId: string): boolean;
  static clear(): void;
}
```

**Key Implementation Details:**

- Use dynamic imports for all built-in scorers (pattern from `ProviderRegistry`)
- Implement lazy loading to avoid circular dependencies
- Include debug logging for registration events
- Support scorer aliases (e.g., "hallucination" and "hallucination-detection")

#### Task 2.2: Implement BaseLLMScorer (2 days)

**File:** `src/lib/evaluation/scorers/llm/baseLLMScorer.ts`

```typescript
export abstract class BaseLLMScorer extends BaseScorer implements LLMScorer {
  protected _llmConfig: LLMScorerConfig;
  protected provider?: AIProvider;

  constructor(metadata: ScorerMetadata, config?: LLMScorerConfig);

  abstract generatePrompt(input: ScorerInput): string;
  abstract parseResponse(
    response: string,
    input: ScorerInput,
  ): Partial<ScoreResult>;

  async score(input: ScorerInput): Promise<ScoreResult>;

  protected async initializeProvider(): Promise<void>;
  protected async callLLM(prompt: string): Promise<string>;
  protected extractJSON(response: string): JsonObject | null;
}
```

**Key Implementation Details:**

- Use `ProviderFactory` for dynamic provider creation
- Support configurable model and provider
- Include JSON extraction utilities
- Handle provider errors gracefully
- Support prompt template substitution

#### Task 2.3: Implement BaseRuleScorer (1 day)

**File:** `src/lib/evaluation/scorers/rule/baseRuleScorer.ts`

```typescript
export abstract class BaseRuleScorer extends BaseScorer implements RuleScorer {
  protected _ruleConfig: RuleScorerConfig;

  constructor(metadata: ScorerMetadata, config?: RuleScorerConfig);

  abstract getRules(): ScorerRule[];
  abstract evaluateRule(
    rule: ScorerRule,
    input: ScorerInput,
  ): { passed: boolean; score: number };

  protected combineRuleResults(results: RuleResult[]): number;
}
```

### 3.4 Estimated Effort

| Task                     | Effort     | Dependencies |
| ------------------------ | ---------- | ------------ |
| Task 2.1: ScorerRegistry | 2 days     | Phase 1      |
| Task 2.2: BaseLLMScorer  | 2 days     | Phase 1      |
| Task 2.3: BaseRuleScorer | 1 day      | Phase 1      |
| **Phase 2 Total**        | **5 days** |              |

### 3.5 Testing Requirements

```typescript
// test/unit/evaluation/scorers/scorerRegistry.test.ts
describe("ScorerRegistry", () => {
  beforeEach(() => ScorerRegistry.clear());

  describe("register", () => {
    it("should register a scorer with valid entry");
    it("should warn and overwrite on duplicate registration");
    it("should validate registry entry structure");
  });

  describe("getScorer", () => {
    it("should return scorer instance with merged config");
    it("should return undefined for unknown scorer");
    it("should support scorer aliases");
  });

  describe("registerBuiltInScorers", () => {
    it("should only initialize once");
    it("should register all built-in scorers");
    it("should use dynamic imports");
  });
});

// test/unit/evaluation/scorers/llm/baseLLMScorer.test.ts
describe("BaseLLMScorer", () => {
  describe("callLLM", () => {
    it("should call provider with correct prompt");
    it("should handle provider errors");
    it("should respect timeout configuration");
  });

  describe("extractJSON", () => {
    it("should extract JSON from markdown code blocks");
    it("should extract JSON from plain text");
    it("should return null on invalid JSON");
  });
});
```

---

## 4. Phase 3: Built-in Scorers

### 4.1 Objectives

Implement the 14 built-in scorers: 10 LLM-based and 4 rule-based.

### 4.2 Deliverables - LLM-Based Scorers

| Scorer                 | Category     | Priority | Description                    |
| ---------------------- | ------------ | -------- | ------------------------------ |
| HallucinationScorer    | accuracy     | High     | Detects fabricated information |
| ToxicityScorer         | safety       | High     | Identifies harmful content     |
| FaithfulnessScorer     | faithfulness | High     | Checks grounding in context    |
| ContextRelevancyScorer | relevancy    | Medium   | Evaluates context relevance    |
| AnswerRelevancyScorer  | relevancy    | Medium   | Evaluates response relevance   |
| ContextPrecisionScorer | relevancy    | Medium   | Measures precision of context  |
| ToneConsistencyScorer  | quality      | Low      | Checks tone consistency        |
| BiasDetectionScorer    | safety       | Low      | Identifies potential biases    |
| PromptAlignmentScorer  | quality      | Low      | Measures prompt adherence      |
| SummarizationScorer    | quality      | Low      | Evaluates summary quality      |

### 4.3 Deliverables - Rule-Based Scorers

| Scorer                  | Category | Priority | Description                    |
| ----------------------- | -------- | -------- | ------------------------------ |
| KeywordCoverageScorer   | quality  | Medium   | Checks keyword coverage        |
| ContentSimilarityScorer | accuracy | Medium   | Measures text similarity       |
| LengthScorer            | quality  | Low      | Validates response length      |
| FormatScorer            | quality  | Low      | Checks formatting requirements |

### 4.4 Implementation Tasks

#### Task 3.1: High-Priority LLM Scorers (6 days)

**Files:**

- `src/lib/evaluation/scorers/llm/hallucinationScorer.ts` (2 days)
- `src/lib/evaluation/scorers/llm/toxicityScorer.ts` (2 days)
- `src/lib/evaluation/scorers/llm/faithfulnessScorer.ts` (2 days)

Each scorer implementation includes:

1. Metadata definition (id, name, description, type, category, version)
2. Default configuration (threshold, weight, timeout, retries)
3. Prompt template with template variable placeholders
4. `generatePrompt()` implementation with template substitution
5. `parseResponse()` implementation with JSON extraction
6. Factory function for registry

**Example Implementation Pattern:**

```typescript
const HALLUCINATION_METADATA: ScorerMetadata = {
  id: "hallucination",
  name: "Hallucination Detection",
  description: "Detects factual errors, fabrications, and unsupported claims",
  type: "llm",
  category: "accuracy",
  version: "1.0.0",
  defaultConfig: {
    enabled: true,
    threshold: 0.8,
    weight: 1.5,
    timeout: 30000,
    retries: 2,
  },
  requiredInputs: ["query", "response"],
  optionalInputs: ["context", "groundTruth"],
};

export class HallucinationScorer extends BaseLLMScorer {
  constructor(config?: Partial<LLMScorerConfig>) {
    super(HALLUCINATION_METADATA, { ...config });
  }

  generatePrompt(input: ScorerInput): string {
    /* ... */
  }
  parseResponse(response: string, input: ScorerInput): Partial<ScoreResult> {
    /* ... */
  }
}

export async function createHallucinationScorer(
  config?,
): Promise<HallucinationScorer> {
  return new HallucinationScorer(config);
}
```

#### Task 3.2: Medium-Priority Scorers (4 days)

**Files:**

- `src/lib/evaluation/scorers/llm/contextRelevancyScorer.ts` (1 day)
- `src/lib/evaluation/scorers/llm/answerRelevancyScorer.ts` (1 day)
- `src/lib/evaluation/scorers/rule/keywordCoverageScorer.ts` (1 day)
- `src/lib/evaluation/scorers/rule/contentSimilarityScorer.ts` (1 day)

#### Task 3.3: Low-Priority Scorers (3 days)

**Files:**

- `src/lib/evaluation/scorers/llm/toneConsistencyScorer.ts`
- `src/lib/evaluation/scorers/llm/biasDetectionScorer.ts`
- `src/lib/evaluation/scorers/llm/promptAlignmentScorer.ts`
- `src/lib/evaluation/scorers/llm/summarizationScorer.ts`
- `src/lib/evaluation/scorers/llm/contextPrecisionScorer.ts`
- `src/lib/evaluation/scorers/rule/lengthScorer.ts`
- `src/lib/evaluation/scorers/rule/formatScorer.ts`

### 4.5 Estimated Effort

| Task                                | Effort      | Dependencies |
| ----------------------------------- | ----------- | ------------ |
| Task 3.1: High-Priority LLM Scorers | 6 days      | Phase 2      |
| Task 3.2: Medium-Priority Scorers   | 4 days      | Phase 2      |
| Task 3.3: Low-Priority Scorers      | 3 days      | Phase 2      |
| **Phase 3 Total**                   | **13 days** |              |

**Note:** Can be parallelized with 2 engineers working on different scorers.

### 4.6 Testing Requirements

Each scorer requires:

1. Unit tests with mocked LLM responses
2. Integration tests with real LLM calls (marked as slow)
3. Edge case tests (empty input, malformed JSON, timeouts)

```typescript
// test/unit/evaluation/scorers/llm/hallucinationScorer.test.ts
describe("HallucinationScorer", () => {
  describe("generatePrompt", () => {
    it("should include query and response");
    it("should include context when provided");
    it("should include ground truth when provided");
    it("should handle missing optional fields");
  });

  describe("parseResponse", () => {
    it("should extract score from valid JSON");
    it("should extract hallucination details");
    it("should handle malformed JSON gracefully");
  });

  describe("score", () => {
    it("should return valid ScoreResult");
    it("should include hallucination metadata");
    it("should measure compute time");
  });
});
```

---

## 5. Phase 4: Custom Scorer API

### 5.1 Objectives

Provide a clean API for users to create and register domain-specific custom scorers.

### 5.2 Deliverables

| Deliverable         | File Path                                         | Description                         |
| ------------------- | ------------------------------------------------- | ----------------------------------- |
| Custom Scorer Utils | `src/lib/evaluation/scorers/customScorerUtils.ts` | Helper utilities for custom scorers |
| Scorer Builder      | `src/lib/evaluation/scorers/scorerBuilder.ts`     | Fluent builder for creating scorers |
| Documentation       | `docs/features/custom-scorers.md`                 | User documentation                  |

### 5.3 Implementation Tasks

#### Task 4.1: Implement Custom Scorer Utilities (2 days)

**File:** `src/lib/evaluation/scorers/customScorerUtils.ts`

```typescript
/**
 * Create a custom LLM-based scorer with minimal boilerplate
 */
export function createCustomLLMScorer(options: {
  id: string;
  name: string;
  description: string;
  category?: ScorerCategory;
  promptTemplate: string;
  parseResponse: (response: string) => { score: number; reasoning: string };
  config?: Partial<LLMScorerConfig>;
}): Promise<Scorer>;

/**
 * Create a custom rule-based scorer
 */
export function createCustomRuleScorer(options: {
  id: string;
  name: string;
  description: string;
  evaluator: (input: ScorerInput) => { score: number; reasoning: string };
  config?: Partial<RuleScorerConfig>;
}): Promise<Scorer>;

/**
 * Validate custom scorer configuration
 */
export function validateScorerMetadata(
  metadata: Partial<ScorerMetadata>,
): ValidationResult;
```

#### Task 4.2: Implement Scorer Builder (1 day)

**File:** `src/lib/evaluation/scorers/scorerBuilder.ts`

```typescript
export class ScorerBuilder {
  private metadata: Partial<ScorerMetadata> = {};
  private config: Partial<ScorerConfig> = {};

  id(id: string): this;
  name(name: string): this;
  description(desc: string): this;
  category(cat: ScorerCategory): this;
  type(type: ScorerType): this;
  threshold(threshold: number): this;
  weight(weight: number): this;
  requiredInputs(...inputs: (keyof ScorerInput)[]): this;

  withLLM(options: {
    promptTemplate: string;
    parseResponse: Function;
  }): LLMScorerBuilder;
  withRules(rules: ScorerRule[]): RuleScorerBuilder;

  build(): Promise<Scorer>;
}

// Usage:
const scorer = await new ScorerBuilder()
  .id("medical-accuracy")
  .name("Medical Accuracy")
  .category("custom")
  .threshold(0.9)
  .withLLM({
    promptTemplate: "Evaluate this medical response...",
    parseResponse: (r) => JSON.parse(r),
  })
  .build();
```

#### Task 4.3: Create Documentation (1 day)

**File:** `docs/features/custom-scorers.md`

Contents:

- Introduction to custom scorers
- Creating LLM-based custom scorers
- Creating rule-based custom scorers
- Using the ScorerBuilder
- Registering custom scorers
- Best practices and examples
- Domain-specific scorer examples (healthcare, legal, financial)

### 5.4 Estimated Effort

| Task                          | Effort     | Dependencies |
| ----------------------------- | ---------- | ------------ |
| Task 4.1: Custom Scorer Utils | 2 days     | Phase 3      |
| Task 4.2: Scorer Builder      | 1 day      | Task 4.1     |
| Task 4.3: Documentation       | 1 day      | Task 4.2     |
| **Phase 4 Total**             | **4 days** |              |

### 5.5 Testing Requirements

```typescript
describe("createCustomLLMScorer", () => {
  it("should create scorer with minimal config");
  it("should validate required options");
  it("should use default values for optional config");
  it("should integrate with ScorerRegistry");
});

describe("ScorerBuilder", () => {
  it("should build valid LLM scorer");
  it("should build valid rule scorer");
  it("should validate metadata");
  it("should throw on missing required fields");
});
```

---

## 6. Phase 5: Evaluation Runner

### 6.1 Objectives

Implement the evaluation pipeline for orchestrating multiple scorers with aggregation, sampling, and execution strategies.

### 6.2 Deliverables

| Deliverable              | File Path                                                    | Description                   |
| ------------------------ | ------------------------------------------------------------ | ----------------------------- |
| EvaluationPipeline       | `src/lib/evaluation/pipeline/evaluationPipeline.ts`          | Multi-scorer orchestration    |
| Pipeline Builder         | `src/lib/evaluation/pipeline/pipelineBuilder.ts`             | Fluent pipeline configuration |
| Sampling Strategies      | `src/lib/evaluation/pipeline/strategies/samplingStrategy.ts` | Cost-efficient sampling       |
| Batch Strategy           | `src/lib/evaluation/pipeline/strategies/batchStrategy.ts`    | Batch evaluation support      |
| Pre-configured Pipelines | `src/lib/evaluation/pipeline/presets.ts`                     | Safety, RAG, Quality presets  |

### 6.3 Implementation Tasks

#### Task 5.1: Implement EvaluationPipeline (3 days)

**File:** `src/lib/evaluation/pipeline/evaluationPipeline.ts`

```typescript
export class EvaluationPipeline {
  private config: PipelineConfig;
  private scorers: Scorer[] = [];
  private initialized = false;

  constructor(config?: Partial<PipelineConfig>);

  async initialize(): Promise<void>;
  async evaluate(input: ScorerInput): Promise<AggregatedScores>;

  private async runParallel(input: ScorerInput): Promise<ScoreResult[]>;
  private async runSequential(input: ScorerInput): Promise<ScoreResult[]>;
  private aggregate(scores: ScoreResult[]): number;
  private checkOverallPass(
    scores: ScoreResult[],
    overallScore: number,
  ): boolean;

  addScorer(scorerId: string, config?: ScorerConfig): void;
  removeScorer(scorerId: string): void;
  getConfig(): PipelineConfig;
}
```

**Key Features:**

- Parallel or sequential execution modes
- Configurable aggregation (average, weighted, minimum, custom)
- Stop-on-failure option
- Timeout management
- Correlation ID tracking

#### Task 5.2: Implement Sampling Strategies (2 days)

**File:** `src/lib/evaluation/pipeline/strategies/samplingStrategy.ts`

```typescript
export type SamplingStrategy = {
  shouldSample(
    result: GenerateResult,
    context?: SamplingContext,
  ): SamplingDecision;
  getSamplingRate(): number;
  configure(config: Partial<SamplingConfig>): void;
};

export class RandomSamplingStrategy implements SamplingStrategy {
  /* ... */
}
export class AdaptiveSamplingStrategy implements SamplingStrategy {
  /* ... */
}
export class TimeBasedSamplingStrategy implements SamplingStrategy {
  /* ... */
}
```

**Sampling Features:**

- Random sampling with configurable rate
- Adaptive sampling based on quality metrics
- Time-based sampling with window limits
- Always-evaluate lists (users, tags, errors)

#### Task 5.3: Implement Pre-configured Pipelines (1 day)

**File:** `src/lib/evaluation/pipeline/presets.ts`

```typescript
export const Pipelines = {
  safety: () =>
    createPipeline({
      scorers: [
        { id: "toxicity", config: { threshold: 0.95 } },
        { id: "hallucination", config: { threshold: 0.8 } },
      ],
      aggregation: { method: "minimum" },
      passThreshold: 0.85,
    }),

  rag: () =>
    createPipeline({
      scorers: [
        { id: "context-relevancy" },
        { id: "faithfulness" },
        { id: "hallucination" },
      ],
      aggregation: { method: "weighted" },
      passThreshold: 0.7,
    }),

  quality: () =>
    createPipeline({
      /* ... */
    }),
  comprehensive: () =>
    createPipeline({
      /* ... */
    }),
};
```

### 6.4 Estimated Effort

| Task                               | Effort     | Dependencies |
| ---------------------------------- | ---------- | ------------ |
| Task 5.1: EvaluationPipeline       | 3 days     | Phase 3      |
| Task 5.2: Sampling Strategies      | 2 days     | Task 5.1     |
| Task 5.3: Pre-configured Pipelines | 1 day      | Task 5.1     |
| **Phase 5 Total**                  | **6 days** |              |

### 6.5 Testing Requirements

```typescript
describe("EvaluationPipeline", () => {
  describe("evaluate", () => {
    it("should run all configured scorers");
    it("should aggregate scores correctly");
    it("should measure total compute time");
    it("should handle scorer errors gracefully");
  });

  describe("parallel execution", () => {
    it("should run scorers in parallel");
    it("should respect timeout");
  });

  describe("sequential execution", () => {
    it("should run scorers in order");
    it("should stop on failure when configured");
  });
});

describe("SamplingStrategies", () => {
  describe("RandomSamplingStrategy", () => {
    it("should sample at configured rate");
    it("should always evaluate errors");
    it("should always evaluate specified users");
  });

  describe("AdaptiveSamplingStrategy", () => {
    it("should adjust rate based on quality");
    it("should increase rate when quality drops");
  });
});
```

---

## 7. Phase 6: Reporting and Metrics

### 7.1 Objectives

Integrate evaluation results with observability systems (Langfuse, OpenTelemetry) and provide reporting utilities.

### 7.2 Deliverables

| Deliverable         | File Path                                          | Description                   |
| ------------------- | -------------------------------------------------- | ----------------------------- |
| Observability Hooks | `src/lib/evaluation/hooks/observabilityHooks.ts`   | Telemetry integration         |
| Langfuse Adapter    | `src/lib/evaluation/hooks/langfuseAdapter.ts`      | Langfuse-specific integration |
| Report Generator    | `src/lib/evaluation/reporting/reportGenerator.ts`  | Report generation utilities   |
| Metrics Collector   | `src/lib/evaluation/reporting/metricsCollector.ts` | Aggregated metrics            |

### 7.3 Implementation Tasks

#### Task 6.1: Implement Observability Hooks (2 days)

**File:** `src/lib/evaluation/hooks/observabilityHooks.ts`

```typescript
export async function reportScorerEvent(
  event: ScorerEvent,
  context?: EvaluationTraceContext,
): Promise<void>;

export async function reportAggregatedScores(
  scores: AggregatedScores,
  context?: EvaluationTraceContext,
): Promise<void>;

export function createLangfuseScorePayload(
  score: ScoreResult,
  context?: EvaluationTraceContext,
): Record<string, unknown>;
```

**Integration Points:**

- OpenTelemetry span creation for each scorer
- Langfuse score payload formatting
- Custom event emission for external handlers
- Debug logging

#### Task 6.2: Implement Langfuse Adapter (1 day)

**File:** `src/lib/evaluation/hooks/langfuseAdapter.ts`

```typescript
export class LangfuseAdapter {
  constructor(config?: LangfuseConfig);

  async reportScores(scores: AggregatedScores, traceId: string): Promise<void>;
  async reportScore(score: ScoreResult, traceId: string): Promise<void>;
  async createEvaluationTrace(
    input: ScorerInput,
    scores: AggregatedScores,
  ): Promise<string>;
}
```

#### Task 6.3: Implement Report Generator (1 day)

**File:** `src/lib/evaluation/reporting/reportGenerator.ts`

```typescript
export class ReportGenerator {
  generateTextReport(scores: AggregatedScores): string;
  generateJSONReport(scores: AggregatedScores): JsonObject;
  generateMarkdownReport(scores: AggregatedScores): string;
  generateHTMLReport(scores: AggregatedScores): string;
}
```

#### Task 6.4: Enhance Middleware Integration (2 days)

**File:** `src/lib/middleware/builtin/autoEvaluation.ts` (enhancement)

```typescript
export type ScorerEvaluationConfig = AutoEvaluationConfig & {
  useScorerPipeline?: boolean;
  pipelinePreset?: "safety" | "rag" | "quality" | "comprehensive";
  scorers?: Array<{ id: string; config?: ScorerConfig }>;
  sampling?: { strategy: string; config: Partial<SamplingConfig> };
  reportToObservability?: boolean;
  onScorerComplete?: (scores: AggregatedScores) => void | Promise<void>;
};

export function createScorerEvaluationMiddleware(
  config: ScorerEvaluationConfig,
): NeuroLinkMiddleware;
```

### 7.4 Estimated Effort

| Task                             | Effort     | Dependencies |
| -------------------------------- | ---------- | ------------ |
| Task 6.1: Observability Hooks    | 2 days     | Phase 5      |
| Task 6.2: Langfuse Adapter       | 1 day      | Task 6.1     |
| Task 6.3: Report Generator       | 1 day      | Phase 5      |
| Task 6.4: Middleware Enhancement | 2 days     | Phase 5      |
| **Phase 6 Total**                | **6 days** |              |

### 7.5 Testing Requirements

```typescript
describe("ObservabilityHooks", () => {
  describe("reportScorerEvent", () => {
    it("should create OpenTelemetry span");
    it("should include all required attributes");
    it("should handle missing tracer gracefully");
  });
});

describe("LangfuseAdapter", () => {
  it("should format scores for Langfuse API");
  it("should handle connection errors");
  it("should batch scores efficiently");
});

describe("ReportGenerator", () => {
  it("should generate valid text report");
  it("should generate valid JSON report");
  it("should include all score details");
});
```

---

## 8. Phase 7: CLI Commands and Testing

### 8.1 Objectives

Add CLI commands for evaluation workflows and comprehensive test coverage.

### 8.2 Deliverables

| Deliverable          | File Path                                | Description                   |
| -------------------- | ---------------------------------------- | ----------------------------- |
| Evaluation Command   | `src/cli/commands/evaluate.ts`           | Standalone evaluation command |
| CLI Flag Enhancement | `src/cli/factories/commandFactory.ts`    | Scorer flags for generate     |
| Test Suite           | `test/suites/evaluation-scorers.test.ts` | Comprehensive test suite      |
| Integration Tests    | `test/integration/evaluation.test.ts`    | E2E evaluation tests          |

### 8.3 Implementation Tasks

#### Task 7.1: Implement Evaluation CLI Command (2 days)

**File:** `src/cli/commands/evaluate.ts`

```bash
# Command examples:

# Evaluate with comprehensive pipeline
npx @juspay/neurolink evaluate --input "response text" --query "original query" \
  --pipeline comprehensive

# Evaluate with custom scorers
npx @juspay/neurolink evaluate --input "response text" --query "query" \
  --scorers hallucination,toxicity,faithfulness

# Evaluate with context (RAG)
npx @juspay/neurolink evaluate --input "response" --query "query" \
  --context "context1" --context "context2" \
  --pipeline rag

# Output as JSON
npx @juspay/neurolink evaluate --input "response" --query "query" \
  --format json

# List available scorers
npx @juspay/neurolink evaluate --list-scorers
```

**Command Options:**

- `--input`: Response text to evaluate
- `--query`: Original query
- `--context`: Context strings (multiple allowed)
- `--ground-truth`: Expected answer
- `--pipeline`: Pre-configured pipeline name
- `--scorers`: Comma-separated scorer IDs
- `--threshold`: Overall pass threshold
- `--format`: Output format (text, json, markdown)
- `--list-scorers`: List available scorers
- `--verbose`: Include detailed reasoning

#### Task 7.2: Enhance Generate Command (1 day)

**File:** `src/cli/factories/commandFactory.ts` (enhancement)

Add scorer flags to generate command:

```bash
npx @juspay/neurolink generate "prompt" \
  --enable-scorer \
  --scorer-pipeline comprehensive \
  --sampling-rate 0.1
```

**New Options:**

- `--enable-scorer`: Enable scorer evaluation
- `--scorer-pipeline`: Pipeline preset
- `--scorer-config`: JSON scorer configuration
- `--sampling-rate`: Evaluation sampling rate
- `--sampling-strategy`: Sampling strategy

#### Task 7.3: Comprehensive Test Suite (3 days)

**File:** `test/suites/evaluation-scorers.test.ts`

```typescript
describe("Evaluation Scoring System", () => {
  describe("Scorer Registry", () => {
    // Registry tests
  });

  describe("Built-in Scorers", () => {
    describe("HallucinationScorer", () => {
      /* ... */
    });
    describe("ToxicityScorer", () => {
      /* ... */
    });
    describe("FaithfulnessScorer", () => {
      /* ... */
    });
    // ... more scorers
  });

  describe("Custom Scorers", () => {
    // Custom scorer creation tests
  });

  describe("Evaluation Pipeline", () => {
    // Pipeline tests
  });

  describe("Sampling Strategies", () => {
    // Sampling tests
  });

  describe("Observability Integration", () => {
    // Observability tests
  });
});
```

#### Task 7.4: Integration Tests (2 days)

**File:** `test/integration/evaluation.test.ts`

```typescript
describe("Evaluation Integration", () => {
  describe("end-to-end evaluation", () => {
    it("should evaluate response with real LLM");
    it("should integrate with observability");
    it("should handle RAG context");
  });

  describe("CLI integration", () => {
    it("should run evaluate command");
    it("should run generate with scorer enabled");
  });
});
```

### 8.4 Estimated Effort

| Task                               | Effort     | Dependencies |
| ---------------------------------- | ---------- | ------------ |
| Task 7.1: Evaluation CLI Command   | 2 days     | Phase 6      |
| Task 7.2: Enhance Generate Command | 1 day      | Phase 6      |
| Task 7.3: Comprehensive Test Suite | 3 days     | All Phases   |
| Task 7.4: Integration Tests        | 2 days     | Task 7.3     |
| **Phase 7 Total**                  | **8 days** |              |

---

## 9. CI/CD Integration

### 9.1 GitHub Actions Workflow

**File:** `.github/workflows/evaluation-tests.yml`

```yaml
name: Evaluation Tests

on:
  push:
    paths:
      - "src/lib/evaluation/**"
      - "src/lib/types/scorerTypes.ts"
      - "test/**/evaluation*.test.ts"
  pull_request:
    paths:
      - "src/lib/evaluation/**"

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "pnpm"

      - run: pnpm install
      - run: pnpm run test:run -- --reporter=github-actions test/unit/evaluation

  integration-tests:
    runs-on: ubuntu-latest
    needs: unit-tests
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    env:
      GOOGLE_APPLICATION_CREDENTIALS: ${{ secrets.GCP_CREDENTIALS }}
      NEUROLINK_EVALUATION_PROVIDER: vertex
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "pnpm"

      - run: pnpm install
      - run: pnpm run test:run -- test/integration/evaluation.test.ts
```

### 9.2 Pre-commit Hooks

```bash
# .husky/pre-commit (addition)

# Run evaluation type checks
pnpm exec tsc --noEmit --project tsconfig.json src/lib/types/scorerTypes.ts

# Run evaluation unit tests
pnpm run test:run -- test/unit/evaluation --passWithNoTests
```

### 9.3 Quality Gates

| Gate               | Threshold | Action           |
| ------------------ | --------- | ---------------- |
| Unit Test Coverage | 90%       | Block PR merge   |
| Integration Tests  | Pass      | Block deployment |
| Type Check         | No errors | Block PR merge   |
| Lint               | No errors | Block PR merge   |

### 9.4 Deployment Checklist

- [ ] All unit tests passing
- [ ] Integration tests passing (with real LLM calls)
- [ ] Type check passing
- [ ] Documentation updated
- [ ] CHANGELOG updated
- [ ] Version bumped appropriately
- [ ] Migration guide created (if breaking changes)

---

## 10. Risk Assessment and Mitigation

### 10.1 Technical Risks

| Risk                     | Likelihood | Impact | Mitigation                                                |
| ------------------------ | ---------- | ------ | --------------------------------------------------------- |
| LLM scorer inconsistency | Medium     | High   | Add confidence scores, retry logic, prompt engineering    |
| Circular dependencies    | Medium     | Medium | Use dynamic imports exclusively, follow existing patterns |
| Performance degradation  | Low        | Medium | Parallel execution, sampling strategies, caching          |
| Provider rate limits     | Medium     | Medium | Implement backoff, use sampling, queue evaluations        |
| JSON parsing failures    | Medium     | Low    | Robust extraction, fallback parsing, error handling       |

### 10.2 Schedule Risks

| Risk                         | Likelihood | Impact | Mitigation                                              |
| ---------------------------- | ---------- | ------ | ------------------------------------------------------- |
| Prompt engineering iteration | High       | Medium | Allocate buffer time, iterative improvement post-launch |
| Integration complexity       | Medium     | Medium | Early integration testing, incremental rollout          |
| Testing coverage gaps        | Low        | Medium | Comprehensive test plan, code review focus              |

### 10.3 Dependency Risks

| Risk                  | Likelihood | Impact | Mitigation                          |
| --------------------- | ---------- | ------ | ----------------------------------- |
| Vercel AI SDK changes | Low        | Medium | Pin version, monitor releases       |
| Provider API changes  | Low        | Medium | Abstract provider interactions      |
| Langfuse API changes  | Low        | Low    | Make Langfuse optional, version pin |

---

## 11. Success Metrics

### 11.1 Technical Metrics

| Metric                              | Target       | Measurement            |
| ----------------------------------- | ------------ | ---------------------- |
| Unit Test Coverage                  | >= 90%       | CI coverage report     |
| Integration Test Pass Rate          | 100%         | CI test results        |
| API Response Time (single scorer)   | < 5s p95     | Performance tests      |
| Pipeline Execution Time (3 scorers) | < 10s p95    | Performance tests      |
| Type Safety                         | No any types | TypeScript strict mode |

### 11.2 Adoption Metrics

| Metric                      | Target               | Measurement     |
| --------------------------- | -------------------- | --------------- |
| SDK Usage                   | 100 evaluations/week | Telemetry       |
| CLI Usage                   | 50 commands/week     | Usage analytics |
| Custom Scorer Registrations | 5 in first month     | Telemetry       |
| Documentation Page Views    | 500/month            | Analytics       |

### 11.3 Quality Metrics

| Metric                         | Target            | Measurement             |
| ------------------------------ | ----------------- | ----------------------- |
| Scorer Accuracy (vs human)     | > 85% correlation | Manual evaluation study |
| False Positive Rate (toxicity) | < 5%              | Quality analysis        |
| API Breaking Changes           | 0                 | Semantic versioning     |

---

## Appendix A: File Listing

### New Files to Create

```
src/lib/types/
└── scorerTypes.ts                           # Phase 1

src/lib/evaluation/scorers/
├── index.ts                                 # Phase 1
├── baseScorer.ts                            # Phase 1
├── scorerRegistry.ts                        # Phase 2
├── customScorerUtils.ts                     # Phase 4
├── scorerBuilder.ts                         # Phase 4
├── llm/
│   ├── index.ts                             # Phase 2
│   ├── baseLLMScorer.ts                     # Phase 2
│   ├── hallucinationScorer.ts               # Phase 3
│   ├── toxicityScorer.ts                    # Phase 3
│   ├── faithfulnessScorer.ts                # Phase 3
│   ├── contextRelevancyScorer.ts            # Phase 3
│   ├── answerRelevancyScorer.ts             # Phase 3
│   ├── contextPrecisionScorer.ts            # Phase 3
│   ├── toneConsistencyScorer.ts             # Phase 3
│   ├── biasDetectionScorer.ts               # Phase 3
│   ├── promptAlignmentScorer.ts             # Phase 3
│   └── summarizationScorer.ts               # Phase 3
└── rule/
    ├── index.ts                             # Phase 2
    ├── baseRuleScorer.ts                    # Phase 2
    ├── keywordCoverageScorer.ts             # Phase 3
    ├── contentSimilarityScorer.ts           # Phase 3
    ├── lengthScorer.ts                      # Phase 3
    └── formatScorer.ts                      # Phase 3

src/lib/evaluation/pipeline/
├── index.ts                                 # Phase 5
├── evaluationPipeline.ts                    # Phase 5
├── pipelineBuilder.ts                       # Phase 5
├── presets.ts                               # Phase 5
└── strategies/
    ├── samplingStrategy.ts                  # Phase 5
    └── batchStrategy.ts                     # Phase 5

src/lib/evaluation/hooks/
├── index.ts                                 # Phase 6
├── observabilityHooks.ts                    # Phase 6
├── langfuseAdapter.ts                       # Phase 6
└── evaluationHooks.ts                       # Phase 6

src/lib/evaluation/reporting/
├── index.ts                                 # Phase 6
├── reportGenerator.ts                       # Phase 6
└── metricsCollector.ts                      # Phase 6

src/cli/commands/
└── evaluate.ts                              # Phase 7

test/unit/evaluation/scorers/
├── baseScorer.test.ts                       # Phase 1
├── scorerRegistry.test.ts                   # Phase 2
├── llm/
│   ├── baseLLMScorer.test.ts                # Phase 2
│   ├── hallucinationScorer.test.ts          # Phase 3
│   ├── toxicityScorer.test.ts               # Phase 3
│   └── faithfulnessScorer.test.ts           # Phase 3
└── rule/
    ├── keywordCoverageScorer.test.ts        # Phase 3
    └── contentSimilarityScorer.test.ts      # Phase 3

test/unit/evaluation/pipeline/
├── evaluationPipeline.test.ts               # Phase 5
└── samplingStrategy.test.ts                 # Phase 5

test/suites/
└── evaluation-scorers.test.ts               # Phase 7

test/integration/
└── evaluation.test.ts                       # Phase 7

docs/features/
└── custom-scorers.md                        # Phase 4
```

### Files to Modify

```
src/lib/types/index.ts                       # Add scorerTypes exports
src/lib/middleware/builtin/autoEvaluation.ts # Phase 6 enhancement
src/cli/factories/commandFactory.ts          # Phase 7 enhancement
```

---

## Appendix B: Total Effort Summary

| Phase                                  | Duration      | Key Deliverables                               |
| -------------------------------------- | ------------- | ---------------------------------------------- |
| Phase 1: Evaluation Framework Core     | 3.5 days      | Types, BaseScorer, Directory Structure         |
| Phase 2: Scorer Interface and Registry | 5 days        | ScorerRegistry, BaseLLMScorer, BaseRuleScorer  |
| Phase 3: Built-in Scorers              | 13 days       | 14 scorers (10 LLM, 4 rule-based)              |
| Phase 4: Custom Scorer API             | 4 days        | Custom utilities, ScorerBuilder, Documentation |
| Phase 5: Evaluation Runner             | 6 days        | EvaluationPipeline, Sampling, Presets          |
| Phase 6: Reporting and Metrics         | 6 days        | Observability, Langfuse, Middleware            |
| Phase 7: CLI and Testing               | 8 days        | CLI commands, Test suites                      |
| **Total**                              | **45.5 days** | **~9 weeks with single engineer**              |

**Parallelization Opportunities:**

- Phase 3 scorers can be parallelized (6-7 days with 2 engineers)
- Phase 7 testing can overlap with Phase 6

**Recommended Team Size:** 1-2 engineers

**Recommended Duration:** 8-10 weeks

---

## Appendix C: Dependencies Graph

```
Phase 1 (Core Types & BaseScorer)
    │
    ├──> Phase 2 (Registry & Base Classes)
    │         │
    │         ├──> Phase 3 (Built-in Scorers)
    │         │         │
    │         │         └──> Phase 4 (Custom Scorer API)
    │         │
    │         └──> Phase 5 (Evaluation Pipeline)
    │                   │
    │                   └──> Phase 6 (Reporting & Observability)
    │                             │
    │                             └──> Phase 7 (CLI & Testing)
    │
    └────────────────────────────────> Phase 7 (CLI & Testing - partial)
```

---

---

## Appendix D: RAGAS Framework Integration

### Overview

RAGAS (Retrieval Augmented Generation Assessment) is a reference-free evaluation framework for RAG pipelines, published at EACL 2024. This section details how to integrate RAGAS metrics and patterns into NeuroLink's evaluation system.

**Reference:** [RAGAS Documentation](https://docs.ragas.io/en/stable/) | [ArXiv Paper](https://arxiv.org/abs/2309.15217)

### Core RAGAS Metrics for NeuroLink

| Metric                  | Description                                             | Implementation Priority | Required Inputs             |
| ----------------------- | ------------------------------------------------------- | ----------------------- | --------------------------- |
| **Faithfulness**        | Measures if the answer is grounded in retrieved context | High                    | response, context           |
| **Answer Relevancy**    | Evaluates how relevant the answer is to the question    | High                    | query, response             |
| **Context Precision**   | Assesses if relevant chunks are ranked higher           | Medium                  | query, context, groundTruth |
| **Context Recall**      | Measures if all relevant information is retrieved       | Medium                  | context, groundTruth        |
| **Factual Correctness** | Overall correctness of the answer                       | Medium                  | response, groundTruth       |

### Faithfulness Metric Implementation

**QAG (Question Answer Generation) Approach:**

```typescript
// src/lib/evaluation/scorers/llm/faithfulnessScorer.ts

const FAITHFULNESS_PROMPT = `
You are evaluating the faithfulness of an AI response to its provided context.

**Context:**
{{context}}

**Response:**
{{response}}

**Task:**
1. Extract all factual claims from the response
2. For each claim, determine if it is supported by the context
3. Calculate the faithfulness score

**Output Format (JSON):**
{
  "claims": [
    {
      "claim": "string",
      "supported": true/false,
      "evidence": "quote from context or null"
    }
  ],
  "score": 0.0-1.0,
  "reasoning": "explanation"
}
`;

export class FaithfulnessScorer extends BaseLLMScorer {
  parseResponse(response: string): Partial<ScoreResult> {
    const json = this.extractJSON(response);
    const supportedClaims = json.claims.filter((c) => c.supported).length;
    const totalClaims = json.claims.length;

    return {
      score: totalClaims > 0 ? supportedClaims / totalClaims : 1.0,
      reasoning: json.reasoning,
      metadata: {
        claims: json.claims,
        supportedCount: supportedClaims,
        totalCount: totalClaims,
      },
    };
  }
}
```

### Answer Relevancy Metric Implementation

```typescript
// src/lib/evaluation/scorers/llm/answerRelevancyScorer.ts

const ANSWER_RELEVANCY_PROMPT = `
You are evaluating if an AI response directly addresses the user's question.

**Question:**
{{query}}

**Response:**
{{response}}

**Evaluation Criteria:**
1. Does the response address the main intent of the question?
2. Is the response complete and sufficient?
3. Does it avoid unnecessary tangents?

**Output Format (JSON):**
{
  "addressesIntent": true/false,
  "isComplete": true/false,
  "isOnTopic": true/false,
  "score": 0.0-1.0,
  "reasoning": "explanation"
}
`;
```

### Context Precision Implementation

```typescript
// src/lib/evaluation/scorers/llm/contextPrecisionScorer.ts

const CONTEXT_PRECISION_PROMPT = `
Given a question and retrieved context chunks, evaluate if the relevant
information appears earlier in the context.

**Question:** {{query}}
**Context Chunks:** {{context}}
**Expected Answer:** {{groundTruth}}

For each chunk, rate its relevance (0-1) to answering the question.
Calculate precision@k where relevant chunks should appear first.

**Output Format (JSON):**
{
  "chunkRelevance": [0.9, 0.3, 0.8, 0.1],
  "precisionAtK": { "1": 0.9, "3": 0.67, "5": 0.52 },
  "score": 0.0-1.0,
  "reasoning": "explanation"
}
`;
```

### RAGAS Integration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 RAGAS-Inspired Scorer Suite                  │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Faithfulness │  │   Answer     │  │    Context       │  │
│  │   Scorer     │  │  Relevancy   │  │   Precision      │  │
│  │              │  │   Scorer     │  │    Scorer        │  │
│  │  QAG-based   │  │              │  │                  │  │
│  │  claim       │  │  Intent      │  │  Ranking-aware   │  │
│  │  extraction  │  │  matching    │  │  evaluation      │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │   Context    │  │   Factual    │                        │
│  │   Recall     │  │ Correctness  │                        │
│  │   Scorer     │  │   Scorer     │                        │
│  │              │  │              │                        │
│  │  Coverage    │  │  Ground      │                        │
│  │  analysis    │  │  truth comp. │                        │
│  └──────────────┘  └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

### RAG Pipeline Evaluation Preset

```typescript
// src/lib/evaluation/pipeline/presets.ts

export const Pipelines = {
  rag: () =>
    createPipeline({
      name: "RAGAS-Inspired RAG Evaluation",
      scorers: [
        {
          id: "faithfulness",
          config: { threshold: 0.7, weight: 1.5 },
        },
        {
          id: "answer-relevancy",
          config: { threshold: 0.7, weight: 1.0 },
        },
        {
          id: "context-precision",
          config: { threshold: 0.6, weight: 0.8 },
        },
        {
          id: "context-recall",
          config: { threshold: 0.6, weight: 0.8 },
        },
      ],
      aggregation: {
        method: "weighted",
        weights: {
          faithfulness: 1.5,
          "answer-relevancy": 1.0,
          "context-precision": 0.8,
          "context-recall": 0.8,
        },
      },
      passThreshold: 0.7,
      requiredScorers: ["faithfulness", "answer-relevancy"],
    }),
};
```

---

## Appendix E: DeepEval Patterns

### Overview

DeepEval provides 50+ metrics with research-backed implementations. This section details key patterns, particularly G-Eval for custom metrics.

**Reference:** [DeepEval Documentation](https://deepeval.com/docs/getting-started)

### G-Eval Custom Metrics

G-Eval is the most versatile metric pattern, using LLM-as-judge with chain-of-thought (CoT) reasoning.

**Three Components:**

1. **Prompt**: Task definition and evaluation criteria
2. **Chain-of-Thought**: Step-by-step reasoning generation
3. **Scoring Function**: Probability-weighted scoring

```typescript
// src/lib/evaluation/scorers/geval/gevalScorer.ts

export type GEvalConfig = {
  name: string;
  criteria: string;
  evaluationSteps?: string[];
  evaluationParams: ("query" | "response" | "context" | "groundTruth")[];
  scale?: { min: number; max: number };
  threshold?: number;
};

export class GEvalScorer extends BaseLLMScorer {
  private gevalConfig: GEvalConfig;

  constructor(config: GEvalConfig, llmConfig?: LLMScorerConfig) {
    super(
      {
        id: `geval-${config.name.toLowerCase().replace(/\s+/g, "-")}`,
        name: config.name,
        description: `G-Eval metric: ${config.criteria}`,
        type: "llm",
        category: "custom",
        version: "1.0.0",
        requiredInputs: config.evaluationParams,
      },
      llmConfig,
    );

    this.gevalConfig = config;
  }

  generatePrompt(input: ScorerInput): string {
    const stepsText = this.gevalConfig.evaluationSteps
      ? this.gevalConfig.evaluationSteps
          .map((s, i) => `${i + 1}. ${s}`)
          .join("\n")
      : this.generateDefaultSteps();

    return `
You are evaluating: ${this.gevalConfig.criteria}

**Evaluation Steps:**
${stepsText}

**Input Data:**
${this.formatInputs(input)}

**Instructions:**
1. Follow the evaluation steps above
2. Think through each step carefully
3. Provide your reasoning
4. Assign a score from ${this.gevalConfig.scale?.min || 0} to ${this.gevalConfig.scale?.max || 10}

**Output Format (JSON):**
{
  "reasoning": "step-by-step analysis",
  "score": <number>,
  "confidence": 0.0-1.0
}
`;
  }
}
```

### G-Eval Usage Examples

```typescript
// Creating a custom coherence scorer
const coherenceScorer = new GEvalScorer({
  name: "Coherence",
  criteria:
    "The collective quality of all sentences - well-structured and logically connected",
  evaluationSteps: [
    "Read the response carefully",
    "Check if ideas flow logically from one to the next",
    "Verify there are no contradictions",
    "Assess overall readability and structure",
  ],
  evaluationParams: ["response"],
  scale: { min: 1, max: 5 },
  threshold: 3.5,
});

// Creating a domain-specific scorer for medical accuracy
const medicalAccuracyScorer = new GEvalScorer({
  name: "Medical Accuracy",
  criteria: "Accuracy of medical information provided in the response",
  evaluationSteps: [
    "Identify all medical claims in the response",
    "Verify each claim against established medical knowledge",
    "Check for dangerous misinformation",
    "Assess appropriate caveats and disclaimers",
  ],
  evaluationParams: ["query", "response", "context"],
  scale: { min: 0, max: 10 },
  threshold: 8.0,
});
```

### DeepEval Metric Categories Integration

| Category | NeuroLink Scorer       | DeepEval Equivalent  |
| -------- | ---------------------- | -------------------- |
| RAG      | FaithfulnessScorer     | Faithfulness         |
| RAG      | AnswerRelevancyScorer  | Answer Relevancy     |
| RAG      | ContextPrecisionScorer | Contextual Precision |
| RAG      | ContextRecallScorer    | Contextual Recall    |
| Safety   | ToxicityScorer         | Toxicity             |
| Safety   | BiasDetectionScorer    | Bias                 |
| Quality  | HallucinationScorer    | Hallucination        |
| Custom   | GEvalScorer            | G-Eval               |

### Multi-turn Conversation Evaluation

```typescript
// src/lib/evaluation/scorers/llm/conversationScorer.ts

export class ConversationCoherenceScorer extends BaseLLMScorer {
  generatePrompt(input: ScorerInput): string {
    return `
Evaluate the coherence of this multi-turn conversation:

**Conversation History:**
${input.conversationHistory
  ?.map((m, i) => `[Turn ${i + 1}] ${m.role}: ${m.content}`)
  .join("\n")}

**Latest Response:**
${input.response}

**Evaluate:**
1. Does the response maintain context from previous turns?
2. Are there contradictions with earlier statements?
3. Is the conversation flow natural?

**Output (JSON):**
{
  "maintainsContext": true/false,
  "hasContradictions": true/false,
  "naturalFlow": true/false,
  "score": 0.0-1.0,
  "reasoning": "explanation"
}
`;
  }
}
```

---

## Appendix F: LLM-as-Judge Best Practices

### Overview

LLM-as-judge achieves up to 85% alignment with human judgment when implemented correctly. This section provides research-backed best practices.

**Reference:** [Evidently AI Guide](https://www.evidentlyai.com/llm-guide/llm-as-a-judge) | [ArXiv Survey](https://arxiv.org/abs/2411.15594)

### Scoring Scale Recommendations

| Scale               | Reliability | Use Case                      | Implementation             |
| ------------------- | ----------- | ----------------------------- | -------------------------- |
| Binary (Pass/Fail)  | **Best**    | Clear criteria, safety checks | `threshold: 0.5`           |
| 3-point             | **Good**    | Quick assessments             | Map to 0, 0.5, 1           |
| 5-point with rubric | Acceptable  | Nuanced evaluation            | Detailed criteria required |
| 10-100 point        | **Avoid**   | Too granular, inconsistent    | Not recommended            |

### Prompt Design Best Practices

```typescript
// src/lib/evaluation/scorers/prompts/bestPractices.ts

export const JUDGE_PROMPT_GUIDELINES = {
  // Use yes/no questions for reliability
  binaryExample: `
**Question:** Does the response contain any factual errors?
**Answer:** Yes or No
**Evidence:** Quote the specific error if Yes, or "No errors found" if No
`,

  // Break complex criteria into separate evaluators
  decompositionExample: `
// Instead of one complex evaluator:
// "Evaluate quality, accuracy, and safety"

// Use three focused evaluators:
const qualityScorer = createScorer("quality");
const accuracyScorer = createScorer("accuracy");
const safetyScorer = createScorer("safety");
`,

  // Always request reasoning
  reasoningExample: `
**Instructions:**
1. Analyze the response step by step
2. Explain your evaluation process
3. Provide specific evidence for your score
4. Output your final score

**Output Format:**
{
  "reasoning": "Your step-by-step analysis here",
  "evidence": ["specific quote 1", "specific quote 2"],
  "score": <number>,
  "confidence": 0.0-1.0
}
`,

  // Provide clear rubrics
  rubricExample: `
**Scoring Rubric:**
- Score 5: Excellent - Fully accurate, well-structured, comprehensive
- Score 4: Good - Minor issues, mostly accurate
- Score 3: Acceptable - Some issues but usable
- Score 2: Poor - Significant issues
- Score 1: Unacceptable - Major errors or harmful content
`,
};
```

### Bias Mitigation Strategies

```typescript
// src/lib/evaluation/scorers/utils/biasMitigation.ts

export type BiasAwareConfig = {
  // Position bias mitigation
  shuffleOptions?: boolean;

  // Verbosity bias mitigation
  normalizeLength?: boolean;

  // Self-enhancement bias mitigation
  anonymizeSource?: boolean;
};

export class BiasAwareJudge {
  // Mitigate position bias in pairwise comparison
  async evaluatePairwise(
    responseA: string,
    responseB: string,
    config: BiasAwareConfig,
  ): Promise<{ winner: "A" | "B" | "tie"; confidence: number }> {
    // Run evaluation twice with swapped positions
    const result1 = await this.judge(responseA, responseB);
    const result2 = await this.judge(responseB, responseA);

    // Check for consistency
    if (result1.winner === "A" && result2.winner === "B") {
      return {
        winner: "A",
        confidence: (result1.confidence + result2.confidence) / 2,
      };
    }
    if (result1.winner === "B" && result2.winner === "A") {
      return {
        winner: "B",
        confidence: (result1.confidence + result2.confidence) / 2,
      };
    }

    // Inconsistent results indicate low confidence
    return { winner: "tie", confidence: 0.5 };
  }
}
```

### Multi-LLM Ensemble Evaluation

```typescript
// src/lib/evaluation/scorers/ensemble/multiJudge.ts

export type EnsembleConfig = {
  judges: {
    provider: string;
    model: string;
    weight: number;
  }[];
  aggregation: "majority" | "weighted_average" | "unanimous";
  minAgreement?: number;
};

export class EnsembleJudge {
  async evaluate(
    input: ScorerInput,
    config: EnsembleConfig,
  ): Promise<ScoreResult> {
    const results = await Promise.all(
      config.judges.map((judge) => this.evaluateWithJudge(input, judge)),
    );

    switch (config.aggregation) {
      case "majority":
        return this.majorityVote(results);
      case "weighted_average":
        return this.weightedAverage(results, config.judges);
      case "unanimous":
        return this.unanimousDecision(results);
    }
  }

  private majorityVote(results: ScoreResult[]): ScoreResult {
    const passed = results.filter((r) => r.passed).length;
    const total = results.length;

    return {
      score: passed / total,
      passed: passed > total / 2,
      reasoning: `${passed}/${total} judges passed`,
      confidence: Math.abs(passed / total - 0.5) * 2, // Higher confidence when unanimous
      metadata: { individualResults: results },
    };
  }
}
```

### Self-Refinement Loop Pattern

```typescript
// src/lib/evaluation/scorers/patterns/selfRefinement.ts

export async function evaluateWithRefinement(
  input: ScorerInput,
  scorer: Scorer,
  maxAttempts: number = 3,
): Promise<{ result: ScoreResult; attempts: number; refinements: string[] }> {
  const refinements: string[] = [];
  let result = await scorer.score(input);
  let attempts = 1;

  while (!result.passed && attempts < maxAttempts) {
    // Generate feedback for improvement
    const feedback = await generateFeedback(input, result);
    refinements.push(feedback);

    // Attempt to refine the response
    const refinedResponse = await refineResponse(input.response, feedback);

    // Re-evaluate
    result = await scorer.score({
      ...input,
      response: refinedResponse,
    });

    attempts++;
  }

  return { result, attempts, refinements };
}
```

---

## Appendix G: Hallucination Detection Techniques

### Overview

Hallucination detection is critical for LLM reliability. This section details specific approaches based on research.

**Reference:** [Nature Paper: Semantic Entropy](https://www.nature.com/articles/s41586-024-07421-0) | [HaluGate - vLLM Blog](https://blog.vllm.ai/2025/12/14/halugate.html)

### Detection Method Categories

```
┌────────────────────────────────────────────────────────────────────┐
│                  Hallucination Detection Methods                    │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐    │
│  │  Uncertainty    │  │   Consistency   │  │  Fact-Checking  │    │
│  │    Based        │  │     Based       │  │     Based       │    │
│  │                 │  │                 │  │                 │    │
│  │ - Semantic      │  │ - Self-         │  │ - Claim         │    │
│  │   Entropy       │  │   consistency   │  │   extraction    │    │
│  │ - Token         │  │ - Multi-sample  │  │ - Knowledge     │    │
│  │   Probability   │  │   comparison    │  │   base verify   │    │
│  │ - Confidence    │  │ - Cross-ref     │  │ - NLI-based     │    │
│  │   Calibration   │  │   validation    │  │   entailment    │    │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘    │
│                                                                     │
│  ┌─────────────────┐  ┌─────────────────┐                         │
│  │   Internal      │  │   LLM-as-Judge  │                         │
│  │ Representation  │  │     Based       │                         │
│  │                 │  │                 │                         │
│  │ - Attention     │  │ - Direct        │                         │
│  │   analysis      │  │   assessment    │                         │
│  │ - Hidden        │  │ - Chain-of-     │                         │
│  │   activations   │  │   thought       │                         │
│  │ - EigenScore    │  │ - G-Eval        │                         │
│  └─────────────────┘  └─────────────────┘                         │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Semantic Entropy Approach

**Best for:** Detecting confabulations where the model generates plausible-sounding but incorrect information.

```typescript
// src/lib/evaluation/scorers/llm/semanticEntropyScorer.ts

export class SemanticEntropyScorer extends BaseLLMScorer {
  private numSamples: number = 5;

  async score(input: ScorerInput): Promise<ScoreResult> {
    // Generate multiple responses with temperature > 0
    const samples = await this.generateMultipleSamples(
      input.query,
      this.numSamples,
    );

    // Cluster responses by semantic meaning
    const clusters = await this.clusterBySemantic(samples);

    // Calculate entropy across clusters
    const entropy = this.calculateClusterEntropy(clusters);

    // High entropy = inconsistent answers = likely hallucination
    const score = 1 - this.normalizeEntropy(entropy);

    return this.createScoreResult(
      score,
      `Semantic entropy: ${entropy.toFixed(3)}. ${clusters.length} distinct answer clusters found.`,
      { clusters, entropy, samples },
    );
  }

  private async clusterBySemantic(samples: string[]): Promise<string[][]> {
    // Use embeddings or LLM to group semantically equivalent answers
    const embeddings = await this.getEmbeddings(samples);
    return this.hierarchicalCluster(embeddings, samples);
  }
}
```

### Fact-Checking Pipeline

**Two-step process for grounded hallucination detection:**

```typescript
// src/lib/evaluation/scorers/llm/factCheckScorer.ts

export class FactCheckScorer extends BaseLLMScorer {
  async score(input: ScorerInput): Promise<ScoreResult> {
    // Step 1: Extract factual claims
    const claims = await this.extractClaims(input.response);

    // Step 2: Verify each claim
    const verifiedClaims = await Promise.all(
      claims.map((claim) => this.verifyClaim(claim, input.context)),
    );

    const supportedCount = verifiedClaims.filter((c) => c.verified).length;
    const score = claims.length > 0 ? supportedCount / claims.length : 1.0;

    return this.createScoreResult(
      score,
      `${supportedCount}/${claims.length} claims verified`,
      { claims: verifiedClaims },
    );
  }

  private async extractClaims(response: string): Promise<Claim[]> {
    const result = await this.callLLM(`
Extract all factual claims from this text. Each claim should be:
- Independent (verifiable on its own)
- Specific (not vague or subjective)
- Factual (not opinions)

Text: ${response}

Output JSON array: [{"claim": "...", "type": "factual|numerical|temporal"}]
`);
    return this.extractJSON(result);
  }

  private async verifyClaim(
    claim: Claim,
    context: string,
  ): Promise<VerifiedClaim> {
    const result = await this.callLLM(`
Verify if this claim is supported by the context:

Claim: ${claim.claim}
Context: ${context}

Output JSON: {
  "verified": true/false,
  "evidence": "quote from context or null",
  "confidence": 0.0-1.0
}
`);
    return { ...claim, ...this.extractJSON(result) };
  }
}
```

### NLI-Based Entailment Scoring

```typescript
// src/lib/evaluation/scorers/nli/entailmentScorer.ts

export class EntailmentScorer extends BaseScorer {
  async score(input: ScorerInput): Promise<ScoreResult> {
    // Use NLI model to check if context entails response
    const entailmentResults = await this.checkEntailment(
      input.context, // premise
      input.response, // hypothesis
    );

    // Score based on entailment probability
    const score =
      entailmentResults.entailment /
      (entailmentResults.entailment + entailmentResults.contradiction);

    return this.createScoreResult(
      score,
      `Entailment: ${(entailmentResults.entailment * 100).toFixed(1)}%, ` +
        `Contradiction: ${(entailmentResults.contradiction * 100).toFixed(1)}%`,
      { entailmentResults },
    );
  }
}
```

### Vectara HHEM Integration

```typescript
// src/lib/evaluation/scorers/external/vectaraHHEM.ts

export class VectaraHHEMScorer extends BaseScorer {
  // Vectara's HHEM-2.1-Open model for hallucination detection
  // Lightweight T5-based classifier, runs locally

  async score(input: ScorerInput): Promise<ScoreResult> {
    // Format input for HHEM
    const hheInput = {
      premise: input.context,
      hypothesis: input.response,
    };

    // Call HHEM model (via Hugging Face or local)
    const result = await this.callHHEM(hheInput);

    // HHEM outputs probability of hallucination
    const hallucinationProb = result.hallucination_probability;
    const score = 1 - hallucinationProb; // Invert for "non-hallucination" score

    return this.createScoreResult(
      score,
      `Hallucination probability: ${(hallucinationProb * 100).toFixed(1)}%`,
      { hallucinationProb, modelVersion: "HHEM-2.1-Open" },
    );
  }
}
```

### Hybrid Hallucination Detection Pipeline

```typescript
// src/lib/evaluation/pipeline/hallucinationPipeline.ts

export const HallucinationDetectionPipeline = createPipeline({
  name: "Comprehensive Hallucination Detection",
  description: "Multi-method approach for robust hallucination detection",
  scorers: [
    // Primary: LLM-based fact checking
    { id: "fact-check", config: { threshold: 0.8, weight: 2.0 } },

    // Secondary: Faithfulness to context
    { id: "faithfulness", config: { threshold: 0.7, weight: 1.5 } },

    // Tertiary: Semantic entropy (if multiple samples available)
    {
      id: "semantic-entropy",
      config: { threshold: 0.7, weight: 1.0, optional: true },
    },

    // External: Vectara HHEM (fast, lightweight)
    {
      id: "vectara-hhem",
      config: { threshold: 0.8, weight: 1.0, optional: true },
    },
  ],
  aggregation: {
    method: "weighted",
    requireAll: ["fact-check", "faithfulness"],
  },
  passThreshold: 0.75,
  failFast: true, // Stop on first critical failure
});
```

---

## Appendix H: Production Evaluation Pipeline

### Overview

Production LLM evaluation requires continuous monitoring, systematic testing, and CI/CD integration.

**Reference:** [Datadog LLM Evaluation](https://www.datadoghq.com/blog/llm-evaluation-framework-best-practices/) | NeuroLink Testing Evolution

### CI/CD Integration Patterns

#### GitHub Actions Workflow

```yaml
# .github/workflows/llm-evaluation.yml
name: LLM Evaluation Pipeline

on:
  push:
    paths:
      - "src/lib/evaluation/**"
      - "prompts/**"
      - "test/evaluation/**"
  pull_request:
    paths:
      - "src/lib/evaluation/**"
  schedule:
    - cron: "0 6 * * *" # Daily regression

env:
  NEUROLINK_EVALUATION_PROVIDER: vertex
  NEUROLINK_EVALUATION_MODEL: gemini-2.5-flash

jobs:
  # Stage 1: Unit tests (fast, no LLM calls)
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "pnpm"

      - run: pnpm install
      - run: pnpm run test:run -- test/unit/evaluation
        env:
          CI: true

  # Stage 2: Integration tests (with mocked LLM)
  integration-tests:
    needs: unit-tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4

      - run: pnpm install
      - run: pnpm run test:run -- test/integration/evaluation
        env:
          MOCK_LLM_CALLS: true

  # Stage 3: LLM evaluation tests (real calls, expensive)
  llm-evaluation:
    needs: integration-tests
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4

      - name: Setup GCP credentials
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_CREDENTIALS }}

      - run: pnpm install
      - run: pnpm run test:evaluation:live
        env:
          EVALUATION_SAMPLE_SIZE: 50
          EVALUATION_TIMEOUT: 60000

      - name: Upload evaluation results
        uses: actions/upload-artifact@v4
        with:
          name: evaluation-results
          path: ./evaluation-reports/

  # Stage 4: Quality gates
  quality-gate:
    needs: llm-evaluation
    runs-on: ubuntu-latest
    steps:
      - name: Download results
        uses: actions/download-artifact@v4
        with:
          name: evaluation-results

      - name: Check quality thresholds
        run: |
          FAITHFULNESS=$(jq '.metrics.faithfulness.mean' results.json)
          if (( $(echo "$FAITHFULNESS < 0.8" | bc -l) )); then
            echo "Faithfulness below threshold: $FAITHFULNESS < 0.8"
            exit 1
          fi

          TOXICITY=$(jq '.metrics.toxicity.mean' results.json)
          if (( $(echo "$TOXICITY < 0.95" | bc -l) )); then
            echo "Toxicity score below threshold: $TOXICITY < 0.95"
            exit 1
          fi
```

### Evaluation Dataset Management

```typescript
// src/lib/evaluation/datasets/datasetManager.ts

export type EvaluationDataset = {
  id: string;
  name: string;
  version: string;
  items: EvaluationItem[];
  metadata: {
    domain: string;
    createdAt: string;
    lastUpdated: string;
    itemCount: number;
  };
};

export type EvaluationItem = {
  id: string;
  input: {
    query: string;
    context?: string[];
  };
  expectedOutput?: string;
  metadata?: {
    category: string;
    difficulty: "easy" | "medium" | "hard";
    tags: string[];
  };
};

export class DatasetManager {
  async loadDataset(datasetId: string): Promise<EvaluationDataset> {
    // Load from file, database, or remote storage
  }

  async saveResults(
    datasetId: string,
    results: EvaluationResult[],
  ): Promise<void> {
    // Save to evaluation store with timestamp
  }

  async compareResults(
    datasetId: string,
    runA: string,
    runB: string,
  ): Promise<ComparisonReport> {
    // Compare two evaluation runs
  }
}
```

### Continuous Monitoring Integration

```typescript
// src/lib/evaluation/monitoring/continuousMonitor.ts

export type MonitoringConfig = {
  samplingRate: number; // 0.01 = 1% of requests
  alertThresholds: {
    faithfulness: { warning: number; critical: number };
    toxicity: { warning: number; critical: number };
    latency: { p95: number; p99: number };
  };
  aggregationWindow: number; // milliseconds
  reportingInterval: number; // milliseconds
};

export class ContinuousEvaluationMonitor {
  private buffer: EvaluationResult[] = [];
  private metrics: MetricsAggregator;

  async processRequest(
    request: GenerateRequest,
    response: GenerateResponse,
  ): Promise<void> {
    // Sampling decision
    if (Math.random() > this.config.samplingRate) {
      return;
    }

    // Run lightweight evaluation
    const scores = await this.evaluationPipeline.evaluate({
      query: request.prompt,
      response: response.text,
      context: request.context,
    });

    // Buffer for aggregation
    this.buffer.push(scores);

    // Check for alerts
    this.checkAlerts(scores);
  }

  private checkAlerts(scores: AggregatedScores): void {
    const thresholds = this.config.alertThresholds;

    if (
      scores.individual.find(
        (s) =>
          s.scorerId === "faithfulness" &&
          s.normalizedScore < thresholds.faithfulness.critical,
      )
    ) {
      this.sendAlert("critical", "Faithfulness score below critical threshold");
    }
  }

  async flushMetrics(): Promise<MetricsReport> {
    const report = this.metrics.aggregate(this.buffer);
    this.buffer = [];

    // Send to observability platform
    await this.reportToLangfuse(report);
    await this.reportToOpenTelemetry(report);

    return report;
  }
}
```

### Regression Testing Framework

```typescript
// src/lib/evaluation/regression/regressionTester.ts

export type RegressionTestConfig = {
  baselineRun: string; // ID of baseline evaluation run
  thresholds: {
    maxRegression: number; // e.g., 0.05 = 5% max regression allowed
    minImprovement: number; // e.g., 0.02 = must improve by 2% to pass
  };
  metrics: string[]; // Which metrics to compare
};

export class RegressionTester {
  async runRegressionTest(
    dataset: EvaluationDataset,
    config: RegressionTestConfig,
  ): Promise<RegressionReport> {
    // Load baseline results
    const baseline = await this.loadBaseline(config.baselineRun);

    // Run current evaluation
    const current = await this.runEvaluation(dataset);

    // Compare metrics
    const comparison: MetricComparison[] = config.metrics.map((metric) => {
      const baselineValue = baseline.metrics[metric];
      const currentValue = current.metrics[metric];
      const delta = currentValue - baselineValue;
      const percentChange = delta / baselineValue;

      return {
        metric,
        baseline: baselineValue,
        current: currentValue,
        delta,
        percentChange,
        status: this.determineStatus(percentChange, config.thresholds),
      };
    });

    return {
      passed: comparison.every((c) => c.status !== "regression"),
      comparison,
      recommendations: this.generateRecommendations(comparison),
    };
  }
}
```

### Observability Dashboard Integration

```typescript
// src/lib/evaluation/reporting/dashboardReporter.ts

export class DashboardReporter {
  async reportToLangfuse(results: AggregatedScores): Promise<void> {
    const langfuse = new Langfuse({
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      secretKey: process.env.LANGFUSE_SECRET_KEY,
    });

    // Report individual scores
    for (const score of results.individual) {
      await langfuse.score({
        traceId: results.correlationId,
        name: score.scorerId,
        value: score.normalizedScore,
        comment: score.reasoning,
        dataType: "NUMERIC",
      });
    }

    // Report overall score
    await langfuse.score({
      traceId: results.correlationId,
      name: "overall",
      value: results.overallScore,
      comment: `Pass: ${results.passed}`,
      dataType: "NUMERIC",
    });
  }

  async reportToOpenTelemetry(results: AggregatedScores): Promise<void> {
    const meter = opentelemetry.metrics.getMeter("neurolink-evaluation");

    // Create gauges for each metric
    const faithfulnessGauge = meter.createObservableGauge(
      "evaluation.faithfulness",
    );
    const toxicityGauge = meter.createObservableGauge("evaluation.toxicity");
    const overallGauge = meter.createObservableGauge("evaluation.overall");

    // Record values
    faithfulnessGauge.addCallback((obs) => {
      const score = results.individual.find(
        (s) => s.scorerId === "faithfulness",
      );
      if (score) obs.observe(score.normalizedScore);
    });
  }
}
```

### Cost-Efficient Evaluation Strategies

```typescript
// src/lib/evaluation/strategies/costOptimization.ts

export type CostOptimizationConfig = {
  budget: {
    dailyLimit: number; // USD
    perRequestLimit: number;
  };
  strategies: {
    sampling: SamplingConfig;
    caching: CachingConfig;
    modelTiering: ModelTieringConfig;
  };
};

export class CostOptimizedEvaluator {
  private todaySpend: number = 0;

  async evaluate(input: ScorerInput): Promise<AggregatedScores | null> {
    // Check budget
    if (this.todaySpend >= this.config.budget.dailyLimit) {
      this.logger.warn("Daily evaluation budget exceeded");
      return null;
    }

    // Check cache first
    const cached = await this.cache.get(this.hashInput(input));
    if (cached && !this.shouldRefresh(cached)) {
      return cached;
    }

    // Select model tier based on complexity
    const modelTier = this.selectModelTier(input);

    // Run evaluation with selected tier
    const pipeline = this.getPipelineForTier(modelTier);
    const results = await pipeline.evaluate(input);

    // Track costs
    this.todaySpend += this.calculateCost(results);

    // Cache results
    await this.cache.set(this.hashInput(input), results, this.config.cacheTTL);

    return results;
  }

  private selectModelTier(input: ScorerInput): "fast" | "standard" | "premium" {
    const complexity = this.estimateComplexity(input);

    if (complexity < 0.3) return "fast"; // gemini-2.5-flash
    if (complexity < 0.7) return "standard"; // gemini-2.5-pro
    return "premium"; // claude-3-opus
  }
}
```

---

## Appendix I: Benchmark References

### Key Benchmarks for Evaluation System Validation

| Benchmark           | Focus                  | Use in NeuroLink                 |
| ------------------- | ---------------------- | -------------------------------- |
| **MMLU**            | General knowledge      | Validate accuracy scorers        |
| **TruthfulQA**      | Truthfulness           | Validate hallucination detection |
| **HellaSwag**       | Common-sense reasoning | Test reasoning evaluation        |
| **LMSYS Arena**     | User preference        | Calibrate LLM-as-judge           |
| **RAGAS Synthetic** | RAG evaluation         | Test RAG metrics                 |

### Validation Approach

```typescript
// test/benchmarks/scorerValidation.test.ts

describe("Scorer Benchmark Validation", () => {
  describe("Hallucination Scorer vs TruthfulQA", () => {
    it("should correlate with TruthfulQA ground truth", async () => {
      const dataset = await loadTruthfulQA("validation");
      const results = await evaluateDataset(hallucinationScorer, dataset);

      // Calculate correlation with ground truth
      const correlation = calculateSpearmanCorrelation(
        results.map((r) => r.score),
        dataset.map((d) => d.truthfulnessScore),
      );

      expect(correlation).toBeGreaterThan(0.7);
    });
  });

  describe("LLM-as-Judge vs Human Labels", () => {
    it("should achieve 80%+ agreement with human judgment", async () => {
      const dataset = await loadHumanLabeledDataset();
      const results = await evaluateDataset(llmJudge, dataset);

      const agreement = calculateCohenKappa(
        results.map((r) => r.passed),
        dataset.map((d) => d.humanLabel),
      );

      expect(agreement).toBeGreaterThan(0.6); // Substantial agreement
    });
  });
});
```

---

_Document Version: 2.0.0_
_Last Updated: 2026-01-23_
_Author: NeuroLink Team_
