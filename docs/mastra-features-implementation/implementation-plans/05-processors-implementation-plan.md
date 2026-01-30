# Input/Output Processors Implementation Plan

> **Status: COMPLETED** (January 2026)
>
> All phases of this implementation plan have been completed. The processor system is fully implemented in the `feat/io-processors` branch.
>
> ## Implementation Summary
>
> | Phase                               | Status    | Commit    |
> | ----------------------------------- | --------- | --------- |
> | Phase 1: Processor Interface Design | Completed | `b6b4354` |
> | Phase 2: Input Processor Pipeline   | Completed | `b6b4354` |
> | Phase 3: Output Processor Pipeline  | Completed | `b6b4354` |
> | Phase 4: Built-in Processors        | Completed | `b6b4354` |
> | Phase 5: Custom Processor API       | Completed | `b6b4354` |
> | Phase 6: Abort/Retry Mechanism      | Completed | `b6b4354` |
> | Phase 7: Testing and Documentation  | Completed | `b6b4354` |
>
> ### Files Created
>
> **Type Definitions:**
>
> - `src/lib/types/processorTypes.ts` - Complete type definitions (630 lines)
>
> **Core Pipeline Infrastructure:**
>
> - `src/lib/processors/pipeline.ts` - ProcessorPipeline class (501 lines)
> - `src/lib/processors/registry.ts` - ProcessorRegistry class (330 lines)
> - `src/lib/processors/tripwire.ts` - TripwireEvaluator with 7 common tripwires (351 lines)
>
> **Input Processors:**
>
> - `src/lib/processors/input/piiDetectionProcessor.ts` - PII detection/redaction
> - `src/lib/processors/input/messageValidationProcessor.ts` - Input validation
> - `src/lib/processors/input/contentModerationProcessor.ts` - Content moderation
>
> **Output Processors:**
>
> - `src/lib/processors/output/lengthValidationProcessor.ts` - Response length validation
> - `src/lib/processors/output/contentFilteringProcessor.ts` - Content filtering
> - `src/lib/processors/output/responseValidationProcessor.ts` - Response validation
> - `src/lib/processors/output/toxicityCheckProcessor.ts` - Toxicity detection
>
> **Presets and Utilities:**
>
> - `src/lib/processors/presets.ts` - 5 pre-configured presets (default, security, strict, quality, minimal)
> - `src/lib/processors/utils/` - Factory functions and metadata utilities
>
> **Tests:**
>
> - 132 unit tests covering all core functionality
> - `test/unit/processors/pipeline.test.ts` - 24 tests
> - `test/unit/processors/registry.test.ts` - 25 tests
> - `test/unit/processors/tripwire.test.ts` - 41 tests
> - `test/unit/processors/input/piiDetection.test.ts` - 23 tests
> - `test/unit/processors/output/toxicityCheck.test.ts` - 19 tests
>
> ### Verification
>
> - Type checking passes (`pnpm run check`)
> - Linting passes (only warnings, no errors)
> - Build succeeds (`pnpm run build`)
> - All 132 processor tests pass

---

This document provides a detailed phased implementation plan for adding Mastra-style input/output processors to NeuroLink. The processor system will complement the existing middleware architecture by providing focused data transformation and validation capabilities.

---

## Table of Contents

1. [Prerequisites and Dependencies](#1-prerequisites-and-dependencies)
2. [Phase 1: Processor Interface Design](#2-phase-1-processor-interface-design)
3. [Phase 2: Input Processor Pipeline](#3-phase-2-input-processor-pipeline)
4. [Phase 3: Output Processor Pipeline](#4-phase-3-output-processor-pipeline)
5. [Phase 4: Built-in Processors](#5-phase-4-built-in-processors)
6. [Phase 5: Custom Processor API](#6-phase-5-custom-processor-api)
7. [Phase 6: Abort/Retry Mechanism](#7-phase-6-abortretry-mechanism)
8. [Phase 7: Testing and Documentation](#8-phase-7-testing-and-documentation)
9. [Estimated Effort Summary](#9-estimated-effort-summary)
10. [Integration with Existing Middleware](#10-integration-with-existing-middleware)

---

## 1. Prerequisites and Dependencies

### 1.1 Required Reading

Before starting implementation, developers should familiarize themselves with:

| Document               | Location                                                            | Purpose                                    |
| ---------------------- | ------------------------------------------------------------------- | ------------------------------------------ |
| Processors Design Doc  | `docs/mastra-features-implementation/05-input-output-processors.md` | Complete architecture and type definitions |
| NeuroLink Architecture | `CLAUDE.md`                                                         | Understanding existing patterns            |
| Middleware System      | `src/lib/middleware/`                                               | Integration points                         |
| Type System            | `src/lib/types/`                                                    | Existing type patterns                     |

### 1.2 Technical Prerequisites

**Existing Components to Leverage:**

| Component                 | File                                          | Usage                              |
| ------------------------- | --------------------------------------------- | ---------------------------------- |
| MiddlewareFactory         | `src/lib/middleware/factory.ts`               | Pattern reference for factory      |
| MiddlewareRegistry        | `src/lib/middleware/registry.ts`              | Pattern reference for registry     |
| GuardrailsMiddleware      | `src/lib/middleware/builtin/guardrails.ts`    | Existing input validation patterns |
| GuardrailsUtils           | `src/lib/middleware/utils/guardrailsUtils.ts` | Content filtering logic to reuse   |
| ConversationMemoryManager | `src/lib/memory/`                             | Memory integration                 |
| Logger                    | `src/lib/utils/logger.js`                     | Consistent logging                 |

**External Dependencies:**

```json
{
  "dependencies": {
    "ai": "^4.0.0"
  },
  "devDependencies": {
    "vitest": "^2.0.0",
    "@types/node": "^20.0.0"
  }
}
```

No new external dependencies are required for the core implementation. Optional integrations may require:

| Feature                  | Package                                  | Purpose                    |
| ------------------------ | ---------------------------------------- | -------------------------- |
| JSON Schema Validation   | `ajv`                                    | Response schema validation |
| Toxicity Detection       | `@google-cloud/language` or external API | AI-based toxicity          |
| PII Detection (Advanced) | `@microsoft/presidio` or similar         | Advanced PII patterns      |

### 1.3 Directory Structure to Create

```
src/lib/processors/
├── index.ts                          # Main exports
├── pipeline.ts                       # ProcessorPipeline class
├── registry.ts                       # ProcessorRegistry class
├── tripwire.ts                       # TripwireEvaluator class
├── utils/
│   ├── index.ts                      # Utility exports
│   ├── metadataUtils.ts              # Metadata handling utilities
│   └── validationUtils.ts            # Schema validation helpers
├── input/
│   ├── index.ts                      # Input processor exports
│   ├── memoryRetrievalProcessor.ts   # Memory context retrieval
│   ├── semanticContextProcessor.ts   # RAG/vector search context
│   ├── messageValidationProcessor.ts # Input validation
│   ├── piiDetectionProcessor.ts      # PII detection/redaction
│   └── contentModerationProcessor.ts # Content moderation
└── output/
    ├── index.ts                      # Output processor exports
    ├── responseValidationProcessor.ts # Response validation
    ├── contentFilteringProcessor.ts  # Content filtering
    ├── memoryPersistenceProcessor.ts # Memory storage
    ├── toxicityCheckProcessor.ts     # Toxicity detection
    └── lengthValidationProcessor.ts  # Length constraints
```

### 1.4 Success Criteria

Before proceeding to implementation, ensure:

- [ ] Read and understood the design document
- [ ] Local development environment set up with `pnpm install`
- [ ] Tests passing with `pnpm test`
- [ ] Type checking passing with `pnpm run check`
- [ ] Understanding of existing middleware pattern

---

## 2. Phase 1: Processor Interface Design

**Duration:** 2-3 days
**Complexity:** Medium
**Dependencies:** None

### 2.1 Objectives

- Define comprehensive TypeScript types for processors
- Establish interfaces that support both input and output processing
- Create type guards and utility types for type safety
- Align with existing NeuroLink type conventions

### 2.2 Tasks

#### Task 1.1: Create Core Type Definitions

**File:** `src/lib/types/processorTypes.ts`

```typescript
// Core processor types to implement

/**
 * Processor execution action - determines what happens next in the pipeline
 */
export type ProcessorAction = "continue" | "abort" | "retry";

/**
 * Severity levels for processor issues
 */
export type ProcessorSeverity = "info" | "warning" | "error" | "critical";

/**
 * Issue detected by a processor
 */
export type ProcessorIssue = {
  category: string;
  severity: ProcessorSeverity;
  message: string;
  context?: JsonObject;
};

/**
 * Metadata that flows through the processor pipeline
 */
export type ProcessorMetadata = {
  requestId: string;
  timestamp: number;
  provider?: string;
  model?: string;
  sessionId?: string;
  userId?: string;
  custom: Record<string, JsonValue>;
  issues: ProcessorIssue[];
  processorTrace: ProcessorTraceEntry[];
};

/**
 * Result returned by any processor
 */
export type ProcessorResult<T = unknown> = {
  action: ProcessorAction;
  data?: T;
  feedback?: string;
  issues?: ProcessorIssue[];
  metadata?: Partial<ProcessorMetadata["custom"]>;
  retryCount?: number;
  maxRetries?: number;
};
```

**Acceptance Criteria:**

- [ ] All types compile without errors
- [ ] Types exported from `src/lib/types/index.ts`
- [ ] Types documented with JSDoc comments
- [ ] Generic types support proper inference

#### Task 1.2: Define Input Processor Interface

**File:** `src/lib/types/processorTypes.ts` (continued)

```typescript
/**
 * Input data passed to input processors
 */
export type InputProcessorData = {
  options: GenerateOptions | StreamOptions;
  messages: ChatMessage[];
  systemPrompt?: string;
  text?: string;
  metadata: ProcessorMetadata;
};

/**
 * Input processor interface
 */
export type InputProcessor<TConfig = JsonObject> = {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly priority?: number;

  process(
    data: InputProcessorData,
    config?: TConfig,
  ): Promise<ProcessorResult<InputProcessorData>>;

  validateConfig?(config: TConfig): { valid: boolean; errors: string[] };
};
```

**Acceptance Criteria:**

- [ ] Interface supports generic configuration types
- [ ] Optional `validateConfig` method for config validation
- [ ] Priority field for ordering in pipeline

#### Task 1.3: Define Output Processor Interface

**File:** `src/lib/types/processorTypes.ts` (continued)

```typescript
/**
 * Output data passed to output processors
 */
export type OutputProcessorData = {
  input: InputProcessorData;
  result: GenerateResult;
  responseText: string;
  toolCalls?: Array<{
    toolName: string;
    args: JsonObject;
    result?: unknown;
  }>;
  metadata: ProcessorMetadata;
};

/**
 * Output processor interface
 */
export type OutputProcessor<TConfig = JsonObject> = {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly priority?: number;

  process(
    data: OutputProcessorData,
    config?: TConfig,
  ): Promise<ProcessorResult<OutputProcessorData>>;

  validateConfig?(config: TConfig): { valid: boolean; errors: string[] };
};
```

**Acceptance Criteria:**

- [ ] Output data includes reference to input for context
- [ ] Tool calls properly typed
- [ ] Consistent interface with input processors

#### Task 1.4: Define Pipeline Configuration Types

**File:** `src/lib/types/processorTypes.ts` (continued)

```typescript
/**
 * Conditions for processor execution
 */
export type ProcessorConditions = {
  providers?: string[];
  models?: string[];
  custom?: (metadata: ProcessorMetadata) => boolean;
};

/**
 * Configuration for a single processor in the pipeline
 */
export type ProcessorConfig = {
  enabled?: boolean;
  config?: JsonObject;
  conditions?: ProcessorConditions;
};

/**
 * Configuration for the processor pipeline
 */
export type ProcessorPipelineConfig = {
  inputProcessors?: Array<{
    processor: InputProcessor;
    config?: ProcessorConfig;
  }>;
  outputProcessors?: Array<{
    processor: OutputProcessor;
    config?: ProcessorConfig;
  }>;
  settings?: {
    stopOnAbort?: boolean;
    maxTotalRetries?: number;
    pipelineTimeout?: number;
    enableTracing?: boolean;
  };
};

/**
 * Result from running the processor pipeline
 */
export type PipelineResult<T> = {
  action: ProcessorAction;
  data?: T;
  feedback: string[];
  issues: ProcessorIssue[];
  metadata: ProcessorMetadata;
  totalTime: number;
};
```

**Acceptance Criteria:**

- [ ] Pipeline config supports both input and output processors
- [ ] Settings allow fine-tuning pipeline behavior
- [ ] Result includes comprehensive execution data

#### Task 1.5: Update Type Exports

**File:** `src/lib/types/index.ts`

Add exports for all processor types:

```typescript
// Processor types
export type {
  ProcessorAction,
  ProcessorSeverity,
  ProcessorIssue,
  ProcessorMetadata,
  ProcessorTraceEntry,
  ProcessorResult,
  InputProcessorData,
  OutputProcessorData,
  InputProcessor,
  OutputProcessor,
  InputProcessorFactory,
  OutputProcessorFactory,
  ProcessorConditions,
  ProcessorConfig,
  ProcessorPipelineConfig,
  PipelineResult,
  TripwireConfig,
  TripwireResult,
} from "./processorTypes.js";
```

### 2.3 Deliverables

| Deliverable                       | Description                              |
| --------------------------------- | ---------------------------------------- |
| `src/lib/types/processorTypes.ts` | Complete type definitions                |
| Updated `src/lib/types/index.ts`  | Exports for processor types              |
| Type tests                        | Ensure types compile and infer correctly |

### 2.4 Estimated Effort

| Task                   | Effort                |
| ---------------------- | --------------------- |
| Core types             | 4 hours               |
| Input processor types  | 2 hours               |
| Output processor types | 2 hours               |
| Pipeline types         | 3 hours               |
| Export updates         | 1 hour                |
| Testing/review         | 4 hours               |
| **Total**              | **16 hours (2 days)** |

---

## 3. Phase 2: Input Processor Pipeline

**Duration:** 3-4 days
**Complexity:** High
**Dependencies:** Phase 1 complete

### 3.1 Objectives

- Implement the core `ProcessorPipeline` class for input processing
- Create metadata initialization and propagation
- Implement processor chaining with priority ordering
- Handle abort flow with feedback

### 3.2 Tasks

#### Task 2.1: Create ProcessorPipeline Class (Input Processing)

**File:** `src/lib/processors/pipeline.ts`

```typescript
import type {
  InputProcessor,
  OutputProcessor,
  InputProcessorData,
  OutputProcessorData,
  ProcessorPipelineConfig,
  PipelineResult,
  ProcessorMetadata,
  ProcessorConditions,
} from "../types/processorTypes.js";
import { logger } from "../utils/logger.js";

export class ProcessorPipeline {
  private inputProcessors: Array<{
    processor: InputProcessor;
    config?: ProcessorConfig;
  }> = [];

  private outputProcessors: Array<{
    processor: OutputProcessor;
    config?: ProcessorConfig;
  }> = [];

  private settings: ProcessorPipelineConfig["settings"];

  constructor(config: ProcessorPipelineConfig = {}) {
    // Sort by priority (higher = earlier)
    if (config.inputProcessors) {
      this.inputProcessors = [...config.inputProcessors].sort(
        (a, b) => (b.processor.priority || 0) - (a.processor.priority || 0),
      );
    }

    if (config.outputProcessors) {
      this.outputProcessors = [...config.outputProcessors].sort(
        (a, b) => (b.processor.priority || 0) - (a.processor.priority || 0),
      );
    }

    this.settings = config.settings || {};
  }

  /**
   * Run input processors
   */
  async processInput(
    data: InputProcessorData,
  ): Promise<PipelineResult<InputProcessorData>> {
    const startTime = Date.now();
    const feedback: string[] = [];
    let currentData = data;

    for (const { processor, config } of this.inputProcessors) {
      // Skip disabled processors
      if (config?.enabled === false) continue;

      // Check conditions
      if (
        config?.conditions &&
        !this.checkConditions(config.conditions, currentData.metadata)
      ) {
        continue;
      }

      const processorStart = Date.now();

      try {
        logger.debug(
          `[ProcessorPipeline] Running input processor: ${processor.id}`,
        );
        const result = await processor.process(currentData, config?.config);

        // Record trace
        currentData.metadata.processorTrace.push({
          processorId: processor.id,
          processorName: processor.name,
          action: result.action,
          executionTime: Date.now() - processorStart,
          feedback: result.feedback,
        });

        // Merge issues
        if (result.issues) {
          currentData.metadata.issues.push(...result.issues);
        }

        // Merge metadata
        if (result.metadata) {
          Object.assign(currentData.metadata.custom, result.metadata);
        }

        // Handle abort
        if (result.action === "abort") {
          if (result.feedback) feedback.push(result.feedback);

          logger.debug(
            `[ProcessorPipeline] Input processor ${processor.id} aborted`,
          );
          return {
            action: "abort",
            feedback,
            issues: currentData.metadata.issues,
            metadata: currentData.metadata,
            totalTime: Date.now() - startTime,
          };
        }

        // Update data for next processor
        if (result.action === "continue" && result.data) {
          currentData = result.data;
        }
      } catch (error) {
        logger.error(
          `[ProcessorPipeline] Processor ${processor.id} threw error:`,
          error,
        );

        currentData.metadata.issues.push({
          category: "processor_error",
          severity: "error",
          message: `Processor ${processor.id} failed: ${error instanceof Error ? error.message : String(error)}`,
        });

        if (this.settings?.stopOnAbort) {
          return {
            action: "abort",
            feedback: [`Processor ${processor.id} threw an error`],
            issues: currentData.metadata.issues,
            metadata: currentData.metadata,
            totalTime: Date.now() - startTime,
          };
        }
      }
    }

    return {
      action: "continue",
      data: currentData,
      feedback,
      issues: currentData.metadata.issues,
      metadata: currentData.metadata,
      totalTime: Date.now() - startTime,
    };
  }

  private checkConditions(
    conditions: ProcessorConditions,
    metadata: ProcessorMetadata,
  ): boolean {
    if (conditions.providers && metadata.provider) {
      if (!conditions.providers.includes(metadata.provider)) {
        return false;
      }
    }

    if (conditions.models && metadata.model) {
      if (!conditions.models.includes(metadata.model)) {
        return false;
      }
    }

    if (conditions.custom && !conditions.custom(metadata)) {
      return false;
    }

    return true;
  }
}
```

**Acceptance Criteria:**

- [ ] Processors execute in priority order
- [ ] Abort stops pipeline and returns feedback
- [ ] Metadata propagates through pipeline
- [ ] Conditions properly filter processor execution
- [ ] Errors are caught and recorded

#### Task 2.2: Create Metadata Utilities

**File:** `src/lib/processors/utils/metadataUtils.ts`

```typescript
import type { ProcessorMetadata } from "../../types/processorTypes.js";

/**
 * Create initial processor metadata
 */
export function createProcessorMetadata(options: {
  provider?: string;
  model?: string;
  sessionId?: string;
  userId?: string;
}): ProcessorMetadata {
  return {
    requestId: generateRequestId(options.provider),
    timestamp: Date.now(),
    provider: options.provider,
    model: options.model,
    sessionId: options.sessionId,
    userId: options.userId,
    custom: {},
    issues: [],
    processorTrace: [],
  };
}

/**
 * Generate a unique request ID
 */
function generateRequestId(provider?: string): string {
  const prefix = provider || "neurolink";
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11);
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Merge metadata from processor result
 */
export function mergeProcessorMetadata(
  base: ProcessorMetadata,
  additions: Partial<ProcessorMetadata["custom"]>,
): ProcessorMetadata {
  return {
    ...base,
    custom: {
      ...base.custom,
      ...additions,
    },
  };
}
```

**Acceptance Criteria:**

- [ ] Unique request IDs generated
- [ ] Metadata properly merged
- [ ] All fields initialized correctly

#### Task 2.3: Create Pipeline Index and Exports

**File:** `src/lib/processors/index.ts`

```typescript
// Core pipeline
export { ProcessorPipeline } from "./pipeline.js";

// Registry (implemented in Phase 5)
export { ProcessorRegistry } from "./registry.js";

// Tripwire system
export { TripwireEvaluator, commonTripwires } from "./tripwire.js";

// Utilities
export * from "./utils/index.js";

// Input processors
export * from "./input/index.js";

// Output processors
export * from "./output/index.js";

// Re-export types for convenience
export type {
  InputProcessor,
  OutputProcessor,
  InputProcessorData,
  OutputProcessorData,
  ProcessorPipelineConfig,
  PipelineResult,
  ProcessorResult,
  ProcessorMetadata,
} from "../types/processorTypes.js";
```

### 3.3 Deliverables

| Deliverable                                 | Description                             |
| ------------------------------------------- | --------------------------------------- |
| `src/lib/processors/pipeline.ts`            | ProcessorPipeline class (input portion) |
| `src/lib/processors/utils/metadataUtils.ts` | Metadata utilities                      |
| `src/lib/processors/index.ts`               | Main exports                            |
| Unit tests                                  | Test input pipeline execution           |

### 3.4 Estimated Effort

| Task                      | Effort                  |
| ------------------------- | ----------------------- |
| ProcessorPipeline (input) | 8 hours                 |
| Metadata utilities        | 3 hours                 |
| Index and exports         | 1 hour                  |
| Unit tests                | 6 hours                 |
| **Total**                 | **18 hours (2.5 days)** |

---

## 4. Phase 3: Output Processor Pipeline

**Duration:** 3-4 days
**Complexity:** High
**Dependencies:** Phase 2 complete

### 4.1 Objectives

- Extend ProcessorPipeline for output processing
- Implement retry mechanism with feedback loop
- Handle streaming response processing
- Create output-specific utilities

### 4.2 Tasks

#### Task 3.1: Add Output Processing to Pipeline

**File:** `src/lib/processors/pipeline.ts` (extend)

```typescript
// Add to ProcessorPipeline class

/**
 * Run output processors
 */
async processOutput(
  data: OutputProcessorData,
): Promise<PipelineResult<OutputProcessorData>> {
  const startTime = Date.now();
  const feedback: string[] = [];
  let currentData = data;
  let totalRetries = 0;
  const maxTotalRetries = this.settings?.maxTotalRetries || 5;

  for (const { processor, config } of this.outputProcessors) {
    // Skip disabled processors
    if (config?.enabled === false) continue;

    // Check conditions
    if (config?.conditions && !this.checkConditions(config.conditions, currentData.metadata)) {
      continue;
    }

    const processorStart = Date.now();

    try {
      logger.debug(`[ProcessorPipeline] Running output processor: ${processor.id}`);
      const result = await processor.process(currentData, config?.config);

      // Record trace
      currentData.metadata.processorTrace.push({
        processorId: processor.id,
        processorName: processor.name,
        action: result.action,
        executionTime: Date.now() - processorStart,
        feedback: result.feedback,
      });

      // Merge issues
      if (result.issues) {
        currentData.metadata.issues.push(...result.issues);
      }

      // Merge metadata
      if (result.metadata) {
        Object.assign(currentData.metadata.custom, result.metadata);
      }

      // Handle abort
      if (result.action === "abort") {
        if (result.feedback) feedback.push(result.feedback);

        return {
          action: "abort",
          feedback,
          issues: currentData.metadata.issues,
          metadata: currentData.metadata,
          totalTime: Date.now() - startTime,
        };
      }

      // Handle retry
      if (result.action === "retry") {
        totalRetries++;

        if (totalRetries <= maxTotalRetries) {
          if (result.feedback) feedback.push(result.feedback);

          // Store retry context in metadata
          currentData.metadata.custom.retryCount = totalRetries;
          currentData.metadata.custom.retryFeedback = result.feedback;

          return {
            action: "retry",
            data: currentData,
            feedback,
            issues: currentData.metadata.issues,
            metadata: currentData.metadata,
            totalTime: Date.now() - startTime,
          };
        }

        // Max retries exceeded
        return {
          action: "abort",
          feedback: [...feedback, "Maximum retries exceeded"],
          issues: currentData.metadata.issues,
          metadata: currentData.metadata,
          totalTime: Date.now() - startTime,
        };
      }

      // Continue with updated data
      if (result.action === "continue" && result.data) {
        currentData = result.data;
      }
    } catch (error) {
      logger.error(`[ProcessorPipeline] Processor ${processor.id} threw error:`, error);

      currentData.metadata.issues.push({
        category: "processor_error",
        severity: "error",
        message: `Processor ${processor.id} failed: ${error instanceof Error ? error.message : String(error)}`,
      });

      if (this.settings?.stopOnAbort) {
        return {
          action: "abort",
          feedback: [`Processor ${processor.id} threw an error`],
          issues: currentData.metadata.issues,
          metadata: currentData.metadata,
          totalTime: Date.now() - startTime,
        };
      }
    }
  }

  return {
    action: "continue",
    data: currentData,
    feedback,
    issues: currentData.metadata.issues,
    metadata: currentData.metadata,
    totalTime: Date.now() - startTime,
  };
}
```

**Acceptance Criteria:**

- [ ] Output processors execute in priority order
- [ ] Retry action returns control for regeneration
- [ ] Retry count tracked in metadata
- [ ] Max retries enforced globally

#### Task 3.2: Create Stream Processing Utilities

**File:** `src/lib/processors/utils/streamUtils.ts`

```typescript
import type {
  OutputProcessorData,
  ProcessorResult,
} from "../../types/processorTypes.js";

/**
 * Process streaming output incrementally
 * Useful for processors that can work on partial data
 */
export async function processStreamChunk(
  processor: {
    processChunk?: (chunk: string) => Promise<string>;
    canProcessStreaming?: boolean;
  },
  chunk: string,
): Promise<string> {
  if (processor.canProcessStreaming && processor.processChunk) {
    return processor.processChunk(chunk);
  }
  return chunk;
}

/**
 * Create OutputProcessorData from streaming result
 */
export function createStreamOutputData(
  input: InputProcessorData,
  accumulatedText: string,
  metadata: ProcessorMetadata,
): OutputProcessorData {
  return {
    input,
    result: {
      content: accumulatedText,
    },
    responseText: accumulatedText,
    metadata,
  };
}

/**
 * Check if a processor supports streaming
 */
export function supportsStreaming(processor: unknown): boolean {
  return (
    typeof processor === "object" &&
    processor !== null &&
    "canProcessStreaming" in processor &&
    (processor as { canProcessStreaming: boolean }).canProcessStreaming === true
  );
}
```

**Acceptance Criteria:**

- [ ] Stream chunks can be processed incrementally
- [ ] Non-streaming processors work on accumulated text
- [ ] Streaming support detection works correctly

#### Task 3.3: Create Pipeline Builder Utility

**File:** `src/lib/processors/utils/pipelineBuilder.ts`

```typescript
import type {
  InputProcessor,
  OutputProcessor,
  ProcessorPipelineConfig,
  ProcessorConfig,
} from "../../types/processorTypes.js";
import { ProcessorPipeline } from "../pipeline.js";

/**
 * Builder pattern for constructing processor pipelines
 */
export class PipelineBuilder {
  private config: ProcessorPipelineConfig = {
    inputProcessors: [],
    outputProcessors: [],
    settings: {},
  };

  /**
   * Add an input processor
   */
  addInputProcessor(processor: InputProcessor, config?: ProcessorConfig): this {
    this.config.inputProcessors!.push({ processor, config });
    return this;
  }

  /**
   * Add an output processor
   */
  addOutputProcessor(
    processor: OutputProcessor,
    config?: ProcessorConfig,
  ): this {
    this.config.outputProcessors!.push({ processor, config });
    return this;
  }

  /**
   * Set pipeline settings
   */
  withSettings(settings: ProcessorPipelineConfig["settings"]): this {
    this.config.settings = { ...this.config.settings, ...settings };
    return this;
  }

  /**
   * Enable detailed tracing
   */
  enableTracing(): this {
    this.config.settings!.enableTracing = true;
    return this;
  }

  /**
   * Set max retries
   */
  maxRetries(count: number): this {
    this.config.settings!.maxTotalRetries = count;
    return this;
  }

  /**
   * Build the pipeline
   */
  build(): ProcessorPipeline {
    return new ProcessorPipeline(this.config);
  }
}

/**
 * Create a new pipeline builder
 */
export function createPipelineBuilder(): PipelineBuilder {
  return new PipelineBuilder();
}
```

**Acceptance Criteria:**

- [ ] Fluent builder API works correctly
- [ ] All pipeline options configurable
- [ ] Built pipeline functions correctly

### 4.3 Deliverables

| Deliverable                | Description                     |
| -------------------------- | ------------------------------- |
| Updated `pipeline.ts`      | Output processing methods       |
| `utils/streamUtils.ts`     | Stream processing utilities     |
| `utils/pipelineBuilder.ts` | Builder pattern utility         |
| Integration tests          | Test output pipeline with retry |

### 4.4 Estimated Effort

| Task              | Effort                |
| ----------------- | --------------------- |
| Output processing | 8 hours               |
| Stream utilities  | 4 hours               |
| Pipeline builder  | 3 hours               |
| Integration tests | 6 hours               |
| **Total**         | **21 hours (3 days)** |

---

## 5. Phase 4: Built-in Processors

**Duration:** 5-6 days
**Complexity:** Medium-High
**Dependencies:** Phases 2-3 complete

### 5.1 Objectives

- Implement essential built-in input processors
- Implement essential built-in output processors
- Create PII detection with configurable sensitivity
- Create toxicity checking with threshold controls
- Create length validation for both input and output

### 5.2 Input Processors

#### Task 4.1: PII Detection Processor

**File:** `src/lib/processors/input/piiDetectionProcessor.ts`

**Features:**

- Email detection and redaction
- Phone number detection (international formats)
- SSN/Tax ID detection
- Credit card number detection
- IP address detection
- Configurable action (abort, redact, warn)
- Custom pattern support

```typescript
export type PIIDetectionConfig = {
  detectTypes?: PIIType[];
  action?: "abort" | "redact" | "warn";
  redactionText?: string;
  customPatterns?: Array<{
    name: string;
    pattern: RegExp;
    replacement?: string;
  }>;
  allowList?: Array<{ type: PIIType; context?: string }>;
};

export type PIIType =
  | "email"
  | "phone"
  | "ssn"
  | "credit_card"
  | "ip_address"
  | "address"
  | "name"
  | "date_of_birth";

export function createPIIDetectionProcessor(
  defaultConfig?: PIIDetectionConfig,
): InputProcessor<PIIDetectionConfig>;
```

**Acceptance Criteria:**

- [ ] All PII types detected accurately
- [ ] Redaction replaces sensitive data
- [ ] Abort returns clear feedback
- [ ] Custom patterns work correctly

#### Task 4.2: Message Validation Processor

**File:** `src/lib/processors/input/messageValidationProcessor.ts`

**Features:**

- Minimum/maximum message length
- Maximum message count
- Required system prompt validation
- Custom validation functions

```typescript
export type MessageValidationConfig = {
  minLength?: number;
  maxLength?: number;
  requiredFields?: string[];
  maxMessages?: number;
  requireSystemPrompt?: boolean;
  customValidator?: (data: InputProcessorData) => ValidationResult;
};

export function createMessageValidationProcessor(
  defaultConfig?: MessageValidationConfig,
): InputProcessor<MessageValidationConfig>;
```

**Acceptance Criteria:**

- [ ] Length constraints enforced
- [ ] Clear error messages
- [ ] Custom validators integrated

#### Task 4.3: Content Moderation Processor

**File:** `src/lib/processors/input/contentModerationProcessor.ts`

**Features:**

- Blocked word list checking
- Regex pattern matching
- Optional AI-based moderation
- Configurable thresholds

```typescript
export type ContentModerationConfig = {
  categories?: ModerationCategory[];
  blockThreshold?: number;
  warnThreshold?: number;
  useAIModeration?: boolean;
  aiProvider?: string;
  blockedWords?: string[];
  blockedPatterns?: string[];
};

export type ModerationCategory =
  | "hate_speech"
  | "violence"
  | "sexual_content"
  | "self_harm"
  | "harassment"
  | "illegal_activity";

export function createContentModerationProcessor(
  defaultConfig?: ContentModerationConfig,
): InputProcessor<ContentModerationConfig>;
```

**Acceptance Criteria:**

- [ ] Blocked words/patterns detected
- [ ] Threshold-based decision making
- [ ] AI moderation optional and configurable

### 5.3 Output Processors

#### Task 4.4: Toxicity Check Processor

**File:** `src/lib/processors/output/toxicityCheckProcessor.ts`

**Features:**

- Multiple toxicity categories
- Configurable block/warn thresholds
- Retry or abort on detection
- Integration point for external APIs

```typescript
export type ToxicityCheckConfig = {
  categories?: ToxicityCategory[];
  blockThreshold?: number;
  warnThreshold?: number;
  action?: "abort" | "retry" | "warn";
  maxRetries?: number;
  provider?: string;
};

export type ToxicityCategory =
  | "toxicity"
  | "severe_toxicity"
  | "identity_attack"
  | "insult"
  | "profanity"
  | "threat";

export function createToxicityCheckProcessor(
  defaultConfig?: ToxicityCheckConfig,
): OutputProcessor<ToxicityCheckConfig>;
```

**Acceptance Criteria:**

- [ ] Toxicity scores calculated
- [ ] Thresholds properly enforced
- [ ] Retry mechanism works correctly

#### Task 4.5: Length Validation Processor

**File:** `src/lib/processors/output/lengthValidationProcessor.ts`

**Features:**

- Minimum response length
- Maximum response length
- Truncation option
- Retry on too short responses

```typescript
export type LengthValidationConfig = {
  minLength?: number;
  maxLength?: number;
  action?: "abort" | "retry" | "truncate" | "warn";
  maxRetries?: number;
  truncationSuffix?: string;
};

export function createLengthValidationProcessor(
  defaultConfig?: LengthValidationConfig,
): OutputProcessor<LengthValidationConfig>;
```

**Acceptance Criteria:**

- [ ] Length limits enforced
- [ ] Truncation works correctly
- [ ] Retry prompts for longer response

#### Task 4.6: Content Filtering Processor

**File:** `src/lib/processors/output/contentFilteringProcessor.ts`

**Features:**

- Word filtering with replacement
- Pattern-based filtering
- Leverages existing guardrails utilities

```typescript
export type ContentFilteringConfig = {
  filterWords?: string[];
  filterPatterns?: string[];
  replacementText?: string;
  action?: "redact" | "abort" | "retry";
  maxRetries?: number;
};

export function createContentFilteringProcessor(
  defaultConfig?: ContentFilteringConfig,
): OutputProcessor<ContentFilteringConfig>;
```

**Acceptance Criteria:**

- [ ] Words/patterns filtered
- [ ] Redaction preserves readability
- [ ] Integrates with existing guardrails

#### Task 4.7: Response Validation Processor

**File:** `src/lib/processors/output/responseValidationProcessor.ts`

**Features:**

- Required/forbidden phrase checking
- JSON schema validation
- Custom validation functions
- Retry on validation failure

```typescript
export type ResponseValidationConfig = {
  minLength?: number;
  maxLength?: number;
  requiredPhrases?: string[];
  forbiddenPhrases?: string[];
  jsonSchema?: JsonObject;
  retryOnFailure?: boolean;
  maxRetries?: number;
  customValidator?: (response: string) => { valid: boolean; errors: string[] };
};

export function createResponseValidationProcessor(
  defaultConfig?: ResponseValidationConfig,
): OutputProcessor<ResponseValidationConfig>;
```

**Acceptance Criteria:**

- [ ] Phrase validation works
- [ ] JSON schema validation optional
- [ ] Retry with feedback supported

### 5.4 Deliverables

| Deliverable                             | Description                   |
| --------------------------------------- | ----------------------------- |
| `input/piiDetectionProcessor.ts`        | PII detection processor       |
| `input/messageValidationProcessor.ts`   | Input validation processor    |
| `input/contentModerationProcessor.ts`   | Content moderation processor  |
| `output/toxicityCheckProcessor.ts`      | Toxicity checking processor   |
| `output/lengthValidationProcessor.ts`   | Length validation processor   |
| `output/contentFilteringProcessor.ts`   | Content filtering processor   |
| `output/responseValidationProcessor.ts` | Response validation processor |
| Unit tests for each processor           | Comprehensive test coverage   |

### 5.5 Estimated Effort

| Task                | Effort                |
| ------------------- | --------------------- |
| PII Detection       | 6 hours               |
| Message Validation  | 3 hours               |
| Content Moderation  | 5 hours               |
| Toxicity Check      | 5 hours               |
| Length Validation   | 3 hours               |
| Content Filtering   | 4 hours               |
| Response Validation | 4 hours               |
| Unit tests          | 10 hours              |
| **Total**           | **40 hours (5 days)** |

---

## 6. Phase 5: Custom Processor API

**Duration:** 3-4 days
**Complexity:** Medium
**Dependencies:** Phase 4 complete

### 6.1 Objectives

- Create a processor registry for dynamic registration
- Provide factory functions for easy processor creation
- Support processor presets and configurations
- Enable runtime processor addition/removal

### 6.2 Tasks

#### Task 5.1: Create Processor Registry

**File:** `src/lib/processors/registry.ts`

```typescript
import type {
  InputProcessor,
  OutputProcessor,
  ProcessorConfig,
} from "../types/processorTypes.js";
import { logger } from "../utils/logger.js";

type ProcessorEntry<T> = {
  processor: T;
  defaultConfig?: ProcessorConfig;
};

export class ProcessorRegistry {
  private inputProcessors = new Map<string, ProcessorEntry<InputProcessor>>();
  private outputProcessors = new Map<string, ProcessorEntry<OutputProcessor>>();
  private presets = new Map<string, ProcessorPreset>();

  /**
   * Register an input processor
   */
  registerInputProcessor(
    processor: InputProcessor,
    options?: { defaultConfig?: ProcessorConfig; replace?: boolean },
  ): void {
    if (this.inputProcessors.has(processor.id) && !options?.replace) {
      throw new Error(`Input processor '${processor.id}' already registered`);
    }

    this.inputProcessors.set(processor.id, {
      processor,
      defaultConfig: options?.defaultConfig,
    });

    logger.debug(`Registered input processor: ${processor.id}`);
  }

  /**
   * Register an output processor
   */
  registerOutputProcessor(
    processor: OutputProcessor,
    options?: { defaultConfig?: ProcessorConfig; replace?: boolean },
  ): void {
    if (this.outputProcessors.has(processor.id) && !options?.replace) {
      throw new Error(`Output processor '${processor.id}' already registered`);
    }

    this.outputProcessors.set(processor.id, {
      processor,
      defaultConfig: options?.defaultConfig,
    });

    logger.debug(`Registered output processor: ${processor.id}`);
  }

  /**
   * Get an input processor by ID
   */
  getInputProcessor(id: string): InputProcessor | undefined {
    return this.inputProcessors.get(id)?.processor;
  }

  /**
   * Get an output processor by ID
   */
  getOutputProcessor(id: string): OutputProcessor | undefined {
    return this.outputProcessors.get(id)?.processor;
  }

  /**
   * Register a preset configuration
   */
  registerPreset(preset: ProcessorPreset): void {
    this.presets.set(preset.name, preset);
  }

  /**
   * Get a preset by name
   */
  getPreset(name: string): ProcessorPreset | undefined {
    return this.presets.get(name);
  }

  /**
   * List all registered processors
   */
  listProcessors(): {
    input: Array<{ id: string; name: string; description?: string }>;
    output: Array<{ id: string; name: string; description?: string }>;
  } {
    return {
      input: Array.from(this.inputProcessors.values()).map(({ processor }) => ({
        id: processor.id,
        name: processor.name,
        description: processor.description,
      })),
      output: Array.from(this.outputProcessors.values()).map(
        ({ processor }) => ({
          id: processor.id,
          name: processor.name,
          description: processor.description,
        }),
      ),
    };
  }
}

export type ProcessorPreset = {
  name: string;
  description: string;
  inputProcessors: Array<{ id: string; config?: ProcessorConfig }>;
  outputProcessors: Array<{ id: string; config?: ProcessorConfig }>;
};
```

**Acceptance Criteria:**

- [ ] Processors can be registered/retrieved
- [ ] Duplicate registration prevented (unless replace)
- [ ] Presets stored and retrieved

#### Task 5.2: Create Processor Factory Utilities

**File:** `src/lib/processors/utils/processorFactory.ts`

```typescript
import type {
  InputProcessor,
  OutputProcessor,
  InputProcessorData,
  OutputProcessorData,
  ProcessorResult,
} from "../../types/processorTypes.js";

/**
 * Create a simple input processor from a function
 */
export function createInputProcessor<TConfig = unknown>(options: {
  id: string;
  name: string;
  description?: string;
  priority?: number;
  process: (
    data: InputProcessorData,
    config?: TConfig,
  ) => Promise<ProcessorResult<InputProcessorData>>;
  validateConfig?: (config: TConfig) => { valid: boolean; errors: string[] };
}): InputProcessor<TConfig> {
  return {
    id: options.id,
    name: options.name,
    description: options.description,
    priority: options.priority,
    process: options.process,
    validateConfig: options.validateConfig,
  };
}

/**
 * Create a simple output processor from a function
 */
export function createOutputProcessor<TConfig = unknown>(options: {
  id: string;
  name: string;
  description?: string;
  priority?: number;
  process: (
    data: OutputProcessorData,
    config?: TConfig,
  ) => Promise<ProcessorResult<OutputProcessorData>>;
  validateConfig?: (config: TConfig) => { valid: boolean; errors: string[] };
}): OutputProcessor<TConfig> {
  return {
    id: options.id,
    name: options.name,
    description: options.description,
    priority: options.priority,
    process: options.process,
    validateConfig: options.validateConfig,
  };
}

/**
 * Compose multiple processors into one
 */
export function composeInputProcessors(
  processors: InputProcessor[],
  options: { id: string; name: string; description?: string },
): InputProcessor {
  return createInputProcessor({
    ...options,
    async process(data, _config) {
      let currentData = data;

      for (const processor of processors) {
        const result = await processor.process(currentData);

        if (result.action !== "continue") {
          return result;
        }

        if (result.data) {
          currentData = result.data;
        }
      }

      return { action: "continue", data: currentData };
    },
  });
}
```

**Acceptance Criteria:**

- [ ] Factory functions create valid processors
- [ ] Composition combines processors correctly
- [ ] Type inference works properly

#### Task 5.3: Create Default Processor Presets

**File:** `src/lib/processors/presets.ts`

```typescript
import type { ProcessorPreset } from "./registry.js";

/**
 * Default preset - basic validation
 */
export const defaultPreset: ProcessorPreset = {
  name: "default",
  description: "Basic input validation and output filtering",
  inputProcessors: [{ id: "message-validation", config: { enabled: true } }],
  outputProcessors: [{ id: "length-validation", config: { enabled: true } }],
};

/**
 * Security preset - PII and content safety
 */
export const securityPreset: ProcessorPreset = {
  name: "security",
  description: "PII detection and content safety",
  inputProcessors: [
    {
      id: "pii-detection",
      config: { enabled: true, config: { action: "redact" } },
    },
    { id: "content-moderation", config: { enabled: true } },
  ],
  outputProcessors: [
    { id: "content-filtering", config: { enabled: true } },
    {
      id: "toxicity-check",
      config: { enabled: true, config: { action: "warn" } },
    },
  ],
};

/**
 * Strict preset - maximum validation
 */
export const strictPreset: ProcessorPreset = {
  name: "strict",
  description: "Maximum validation and filtering",
  inputProcessors: [
    { id: "message-validation", config: { enabled: true } },
    {
      id: "pii-detection",
      config: { enabled: true, config: { action: "abort" } },
    },
    { id: "content-moderation", config: { enabled: true } },
  ],
  outputProcessors: [
    { id: "response-validation", config: { enabled: true } },
    { id: "length-validation", config: { enabled: true } },
    { id: "content-filtering", config: { enabled: true } },
    {
      id: "toxicity-check",
      config: { enabled: true, config: { action: "abort" } },
    },
  ],
};

/**
 * All available presets
 */
export const builtInPresets: ProcessorPreset[] = [
  defaultPreset,
  securityPreset,
  strictPreset,
];
```

**Acceptance Criteria:**

- [ ] Presets cover common use cases
- [ ] Presets properly configure processors
- [ ] Easy to extend with custom presets

### 6.3 Deliverables

| Deliverable                 | Description                              |
| --------------------------- | ---------------------------------------- |
| `registry.ts`               | Processor registry class                 |
| `utils/processorFactory.ts` | Factory utilities                        |
| `presets.ts`                | Built-in presets                         |
| Documentation               | API documentation for custom processors  |
| Examples                    | Example custom processor implementations |

### 6.4 Estimated Effort

| Task               | Effort                  |
| ------------------ | ----------------------- |
| Processor registry | 6 hours                 |
| Factory utilities  | 4 hours                 |
| Presets            | 3 hours                 |
| Documentation      | 4 hours                 |
| Examples           | 3 hours                 |
| Tests              | 5 hours                 |
| **Total**          | **25 hours (3-4 days)** |

---

## 7. Phase 6: Abort/Retry Mechanism

**Duration:** 2-3 days
**Complexity:** Medium-High
**Dependencies:** Phases 2-5 complete

### 7.1 Objectives

- Implement robust abort flow with detailed feedback
- Implement retry mechanism with LLM regeneration
- Create tripwire system for blocking conditions
- Integrate with BaseProvider for retry loop

### 7.2 Tasks

#### Task 6.1: Create Tripwire Evaluator

**File:** `src/lib/processors/tripwire.ts`

```typescript
import type {
  TripwireConfig,
  TripwireResult,
  InputProcessorData,
  OutputProcessorData,
  ProcessorSeverity,
} from "../types/processorTypes.js";

export class TripwireEvaluator {
  private tripwires: TripwireConfig[] = [];

  /**
   * Register a tripwire
   */
  register(tripwire: TripwireConfig): void {
    this.tripwires.push(tripwire);
  }

  /**
   * Unregister a tripwire by ID
   */
  unregister(id: string): boolean {
    const index = this.tripwires.findIndex((t) => t.id === id);
    if (index !== -1) {
      this.tripwires.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Evaluate all tripwires against data
   */
  evaluate(data: InputProcessorData | OutputProcessorData): TripwireResult {
    for (const tripwire of this.tripwires) {
      try {
        if (tripwire.condition(data)) {
          return {
            triggered: true,
            tripwire,
            action: tripwire.action === "abort" ? "abort" : "continue",
            feedback: tripwire.message,
          };
        }
      } catch (error) {
        // Log but don't fail on tripwire evaluation error
        console.error(`Tripwire ${tripwire.id} evaluation failed:`, error);
      }
    }

    return { triggered: false };
  }

  /**
   * Get all registered tripwires
   */
  list(): TripwireConfig[] {
    return [...this.tripwires];
  }
}

/**
 * Common tripwire configurations
 */
export const commonTripwires: TripwireConfig[] = [
  {
    id: "max-tokens",
    name: "Maximum Tokens Exceeded",
    condition: (data) => {
      if ("result" in data && data.result.usage) {
        return (data.result.usage.total || 0) > 100000;
      }
      return false;
    },
    action: "abort",
    message: "Response exceeded maximum token limit",
    severity: "critical" as ProcessorSeverity,
  },
  {
    id: "empty-response",
    name: "Empty Response",
    condition: (data) => {
      if ("responseText" in data) {
        return !data.responseText || data.responseText.trim().length === 0;
      }
      return false;
    },
    action: "abort",
    message: "LLM returned an empty response",
    severity: "error" as ProcessorSeverity,
  },
  {
    id: "repetition-loop",
    name: "Repetition Loop Detection",
    condition: (data) => {
      if ("responseText" in data && data.responseText) {
        const text = data.responseText;
        const words = text.split(/\s+/);
        if (words.length < 20) return false;
        const uniqueWords = new Set(words);
        return uniqueWords.size < words.length * 0.3;
      }
      return false;
    },
    action: "warn",
    message: "Response appears to contain repetitive content",
    severity: "warning" as ProcessorSeverity,
  },
];
```

**Acceptance Criteria:**

- [ ] Tripwires can be registered/unregistered
- [ ] Evaluation handles errors gracefully
- [ ] Common tripwires cover important cases

#### Task 6.2: Integrate Retry with BaseProvider

**File:** Updates to relevant provider code

This task involves modifying the generation flow to support processor retry. The key integration points are:

1. **Before LLM Call:** Run input processors
2. **After LLM Call:** Run output processors
3. **On Retry:** Loop back with feedback appended to messages

```typescript
// Conceptual integration in BaseProvider.generate()

// After building messages, before LLM call
if (pipeline) {
  const inputResult = await pipeline.processInput(inputData);

  if (inputResult.action === "abort") {
    return this.createAbortedResult(inputResult);
  }

  // Use processed messages
  processedMessages = inputResult.data?.messages || messages;
}

// After LLM call
if (pipeline) {
  let outputResult = await pipeline.processOutput(outputData);

  // Handle retry loop
  let retryCount = 0;
  const maxRetries = pipelineConfig.settings?.maxTotalRetries || 3;

  while (outputResult.action === "retry" && retryCount < maxRetries) {
    retryCount++;

    // Append retry feedback to messages
    const retryMessages = [
      ...processedMessages,
      {
        role: "assistant" as const,
        content: result.content,
      },
      {
        role: "user" as const,
        content: `Please try again. Feedback: ${outputResult.feedback.join("; ")}`,
      },
    ];

    // Regenerate
    result = await this.executeGeneration(model, retryMessages, tools, options);

    // Re-run output processors
    outputResult = await pipeline.processOutput({
      ...outputData,
      result,
      responseText: result.content || "",
    });
  }

  if (outputResult.action === "abort") {
    return this.createAbortedResult(outputResult);
  }
}
```

**Acceptance Criteria:**

- [ ] Retry feedback appended to conversation
- [ ] Max retries enforced
- [ ] Abort after max retries exceeded
- [ ] Clean integration with existing flow

#### Task 6.3: Create Abort/Retry Result Types

**File:** `src/lib/types/processorTypes.ts` (additions)

```typescript
/**
 * Result returned when a processor pipeline aborts
 */
export type ProcessorAbortResult = {
  aborted: true;
  reason: string;
  feedback: string[];
  issues: ProcessorIssue[];
  processorId?: string;
  processorName?: string;
};

/**
 * Extended GenerateResult with processor metadata
 */
export type ProcessorEnhancedResult = GenerateResult & {
  processorMetadata?: ProcessorMetadata;
  processorAborted?: ProcessorAbortResult;
};
```

**Acceptance Criteria:**

- [ ] Abort results contain useful debugging info
- [ ] Enhanced result compatible with existing types

### 7.3 Deliverables

| Deliverable          | Description                                  |
| -------------------- | -------------------------------------------- |
| `tripwire.ts`        | TripwireEvaluator class and common tripwires |
| Provider integration | Retry loop in generation flow                |
| Updated types        | Abort/retry result types                     |
| Integration tests    | End-to-end retry flow tests                  |

### 7.4 Estimated Effort

| Task                 | Effort                |
| -------------------- | --------------------- |
| Tripwire evaluator   | 5 hours               |
| Provider integration | 8 hours               |
| Result types         | 2 hours               |
| Integration tests    | 6 hours               |
| **Total**            | **21 hours (3 days)** |

---

## 8. Phase 7: Testing and Documentation

**Duration:** 4-5 days
**Complexity:** Medium
**Dependencies:** All previous phases complete

### 8.1 Objectives

- Comprehensive unit tests for all processors
- Integration tests for pipeline flows
- End-to-end tests with real providers
- Complete documentation and examples
- Update CLAUDE.md with processor information

### 8.2 Testing Tasks

#### Task 7.1: Unit Tests for Processors

**File:** `test/processors/`

Create test files for each processor:

```
test/processors/
├── pipeline.test.ts
├── registry.test.ts
├── tripwire.test.ts
├── input/
│   ├── piiDetection.test.ts
│   ├── messageValidation.test.ts
│   └── contentModeration.test.ts
└── output/
    ├── responseValidation.test.ts
    ├── contentFiltering.test.ts
    ├── toxicityCheck.test.ts
    └── lengthValidation.test.ts
```

**Example Test Structure:**

```typescript
// test/processors/input/piiDetection.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { createPIIDetectionProcessor } from "../../../src/lib/processors/input/piiDetectionProcessor.js";
import { createProcessorMetadata } from "../../../src/lib/processors/utils/metadataUtils.js";

describe("PII Detection Processor", () => {
  const createTestData = (text: string) => ({
    options: { input: { text } },
    messages: [{ role: "user" as const, content: text }],
    text,
    metadata: createProcessorMetadata({}),
  });

  describe("Email Detection", () => {
    it("should detect email addresses", async () => {
      const processor = createPIIDetectionProcessor({
        detectTypes: ["email"],
        action: "abort",
      });

      const result = await processor.process(
        createTestData("Contact me at test@example.com"),
      );

      expect(result.action).toBe("abort");
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          category: "pii_detection",
        }),
      );
    });

    it("should redact email when configured", async () => {
      const processor = createPIIDetectionProcessor({
        detectTypes: ["email"],
        action: "redact",
        redactionText: "[EMAIL]",
      });

      const result = await processor.process(
        createTestData("Contact me at test@example.com"),
      );

      expect(result.action).toBe("continue");
      expect(result.data?.text).toBe("Contact me at [EMAIL]");
    });

    it("should detect multiple emails", async () => {
      const processor = createPIIDetectionProcessor({
        detectTypes: ["email"],
        action: "warn",
      });

      const result = await processor.process(
        createTestData("Email john@test.com or jane@test.com"),
      );

      expect(result.action).toBe("continue");
      expect(result.issues).toHaveLength(1);
      expect(result.metadata?.piiDetected).toBe(true);
    });
  });

  describe("Phone Detection", () => {
    it("should detect US phone numbers", async () => {
      const processor = createPIIDetectionProcessor({
        detectTypes: ["phone"],
        action: "abort",
      });

      const result = await processor.process(
        createTestData("Call me at 555-123-4567"),
      );

      expect(result.action).toBe("abort");
    });

    it("should detect international format", async () => {
      const processor = createPIIDetectionProcessor({
        detectTypes: ["phone"],
        action: "abort",
      });

      const result = await processor.process(
        createTestData("Call me at +1 (555) 123-4567"),
      );

      expect(result.action).toBe("abort");
    });
  });

  // Additional tests for SSN, credit cards, etc.
});
```

**Acceptance Criteria:**

- [ ] 90%+ code coverage for processors
- [ ] All edge cases tested
- [ ] Error handling tested

#### Task 7.2: Integration Tests

**File:** `test/integration/processors.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { ProcessorPipeline } from "../../src/lib/processors/pipeline.js";
import { createPIIDetectionProcessor } from "../../src/lib/processors/input/piiDetectionProcessor.js";
import { createContentFilteringProcessor } from "../../src/lib/processors/output/contentFilteringProcessor.js";

describe("Processor Pipeline Integration", () => {
  describe("Full Pipeline Flow", () => {
    it("should process input and output in sequence", async () => {
      const pipeline = new ProcessorPipeline({
        inputProcessors: [
          {
            processor: createPIIDetectionProcessor({ action: "redact" }),
          },
        ],
        outputProcessors: [
          {
            processor: createContentFilteringProcessor({ action: "redact" }),
          },
        ],
      });

      const inputResult = await pipeline.processInput({
        text: "My email is test@example.com",
        messages: [],
        options: {},
        metadata: createProcessorMetadata({}),
      });

      expect(inputResult.action).toBe("continue");
      expect(inputResult.data?.text).not.toContain("test@example.com");
    });

    it("should stop on abort and return feedback", async () => {
      const pipeline = new ProcessorPipeline({
        inputProcessors: [
          {
            processor: createPIIDetectionProcessor({ action: "abort" }),
          },
        ],
      });

      const result = await pipeline.processInput({
        text: "SSN: 123-45-6789",
        messages: [],
        options: {},
        metadata: createProcessorMetadata({}),
      });

      expect(result.action).toBe("abort");
      expect(result.feedback).toHaveLength(1);
    });
  });
});
```

**Acceptance Criteria:**

- [ ] Pipeline flows tested end-to-end
- [ ] Abort/retry mechanisms verified
- [ ] Metadata propagation confirmed

#### Task 7.3: End-to-End Tests

**File:** `test/e2e/processors.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { NeuroLink } from "../../src/lib/neurolink.js";

describe("Processor E2E Tests", () => {
  it("should apply processors in generate call", async () => {
    const neurolink = new NeuroLink();

    const result = await neurolink.generate({
      input: { text: "Tell me about AI" },
      provider: "openai",
      processors: {
        inputProcessors: [
          {
            processor: createMessageValidationProcessor({
              minLength: 5,
            }),
          },
        ],
        outputProcessors: [
          {
            processor: createLengthValidationProcessor({
              minLength: 10,
            }),
          },
        ],
      },
    });

    expect(result).toBeDefined();
    expect(result.processorMetadata?.processorTrace).toBeDefined();
  });
});
```

### 8.3 Documentation Tasks

#### Task 7.4: Update CLAUDE.md

Add processor system documentation to CLAUDE.md:

````markdown
### Processor System

NeuroLink provides a processor system for input/output transformation:

**Key files:**

- `src/lib/processors/pipeline.ts` - ProcessorPipeline class
- `src/lib/processors/registry.ts` - ProcessorRegistry for dynamic registration
- `src/lib/processors/input/` - Built-in input processors
- `src/lib/processors/output/` - Built-in output processors

**Usage:**

```typescript
const result = await neurolink.generate({
  input: { text: "..." },
  processors: {
    inputProcessors: [{ processor: createPIIDetectionProcessor() }],
    outputProcessors: [{ processor: createContentFilteringProcessor() }],
  },
});
```
````

```

#### Task 7.5: Create User Documentation

**File:** `docs/features/processors.md`

Complete documentation including:
- Overview and concepts
- Built-in processors reference
- Custom processor creation guide
- Presets and configuration
- Best practices
- Troubleshooting

#### Task 7.6: Create Examples

**File:** `examples/processors/`

```

examples/processors/
├── basic-usage.ts # Simple processor usage
├── custom-processor.ts # Creating custom processors
├── security-pipeline.ts # Security-focused configuration
├── retry-handling.ts # Handling retries
└── streaming.ts # Processors with streaming

```

### 8.4 Deliverables

| Deliverable | Description |
|-------------|-------------|
| Unit tests | Complete test coverage |
| Integration tests | Pipeline flow tests |
| E2E tests | Full integration tests |
| Updated CLAUDE.md | Processor documentation |
| User docs | `docs/features/processors.md` |
| Examples | Working example code |

### 8.5 Estimated Effort

| Task | Effort |
|------|--------|
| Unit tests | 12 hours |
| Integration tests | 6 hours |
| E2E tests | 4 hours |
| CLAUDE.md updates | 2 hours |
| User documentation | 6 hours |
| Examples | 4 hours |
| Review/polish | 4 hours |
| **Total** | **38 hours (5 days)** |

---

## 9. Estimated Effort Summary

### Phase-by-Phase Breakdown

| Phase | Description | Duration | Effort |
|-------|-------------|----------|--------|
| 1 | Processor Interface Design | 2-3 days | 16 hours |
| 2 | Input Processor Pipeline | 3-4 days | 18 hours |
| 3 | Output Processor Pipeline | 3-4 days | 21 hours |
| 4 | Built-in Processors | 5-6 days | 40 hours |
| 5 | Custom Processor API | 3-4 days | 25 hours |
| 6 | Abort/Retry Mechanism | 2-3 days | 21 hours |
| 7 | Testing and Documentation | 4-5 days | 38 hours |
| **Total** | | **22-29 days** | **179 hours** |

### Team Recommendations

| Team Size | Estimated Duration | Notes |
|-----------|-------------------|-------|
| 1 developer | 5-6 weeks | Sequential phases |
| 2 developers | 3-4 weeks | Parallel work on processors |
| 3 developers | 2-3 weeks | Full parallelization |

### Risk Factors

| Risk | Impact | Mitigation |
|------|--------|------------|
| Integration complexity | Medium | Early integration testing |
| Provider variations | Low | Abstraction layers |
| Performance overhead | Medium | Benchmarking, optional processors |
| Breaking changes | Low | Additive design, backward compatibility |

---

## 10. Integration with Existing Middleware

### 10.1 Architecture Comparison

| Aspect | Middleware | Processors |
|--------|------------|------------|
| **Integration** | AI SDK wrapLanguageModel | Pre/post LLM hooks |
| **Scope** | Wraps entire call | Transforms specific data |
| **Control Flow** | Error throwing | Explicit abort/retry |
| **Use Case** | Cross-cutting concerns | Data validation/transformation |
| **Chaining** | Priority-based | Sequential pipeline |

### 10.2 Coexistence Strategy

Processors and middleware operate at different layers:

```

┌─────────────────────────────────────────────────────────────┐
│ User Request │
└─────────────────────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────┐
│ INPUT PROCESSORS (New) │
│ - PII Detection │
│ - Message Validation │
│ - Content Moderation │
└─────────────────────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────┐
│ MIDDLEWARE (Existing) │
│ - Analytics Tracking │
│ - Guardrails (can be migrated to processors) │
│ - Auto-Evaluation │
└─────────────────────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────┐
│ LLM EXECUTION │
└─────────────────────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────┐
│ OUTPUT PROCESSORS (New) │
│ - Response Validation │
│ - Toxicity Check │
│ - Content Filtering │
│ - Memory Persistence │
└─────────────────────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────┐
│ Response │
└─────────────────────────────────────────────────────────────┘

````

### 10.3 Migration Path for Guardrails

The existing guardrails middleware can be gradually migrated to processors:

| Guardrails Feature | Target Processor |
|--------------------|------------------|
| Precall evaluation | ContentModerationProcessor |
| Bad word filtering | ContentFilteringProcessor |
| Model-based filter | ToxicityCheckProcessor |
| Blocked response | Abort mechanism |

**Migration Steps:**

1. **Phase 1:** Implement equivalent processors
2. **Phase 2:** Add feature flag to use processors instead of middleware
3. **Phase 3:** Deprecate guardrails middleware
4. **Phase 4:** Remove guardrails middleware (major version)

### 10.4 Configuration Approach

Users can configure both systems independently:

```typescript
const result = await neurolink.generate({
  input: { text: "..." },

  // Processor configuration (new)
  processors: {
    inputProcessors: [
      { processor: createPIIDetectionProcessor() },
    ],
    outputProcessors: [
      { processor: createToxicityCheckProcessor() },
    ],
  },

  // Middleware configuration (existing)
  middleware: {
    preset: "default",
    middlewareConfig: {
      analytics: { enabled: true },
      // Guardrails can be disabled if using processors
      guardrails: { enabled: false },
    },
  },
});
````

### 10.5 Shared Utilities

Processors can leverage existing middleware utilities:

```typescript
// Reuse from guardrails
import { applyContentFiltering } from "../middleware/utils/guardrailsUtils.js";

// In ContentFilteringProcessor
const filterResult = applyContentFiltering(
  data.responseText,
  config.filterWords,
  "generate",
);
```

---

## Appendix A: File Creation Checklist

### Types

- [x] `src/lib/types/processorTypes.ts`
- [x] Update `src/lib/types/index.ts`

### Core

- [x] `src/lib/processors/index.ts`
- [x] `src/lib/processors/pipeline.ts`
- [x] `src/lib/processors/registry.ts`
- [x] `src/lib/processors/tripwire.ts`
- [x] `src/lib/processors/presets.ts`

### Utilities

- [x] `src/lib/processors/utils/index.ts`
- [x] `src/lib/processors/utils/metadataUtils.ts`
- [x] `src/lib/processors/utils/validationUtils.ts`
- [ ] `src/lib/processors/utils/streamUtils.ts` (deferred - not needed for core functionality)
- [ ] `src/lib/processors/utils/pipelineBuilder.ts` (deferred - builder pattern optional)
- [x] `src/lib/processors/utils/processorFactory.ts`

### Input Processors

- [x] `src/lib/processors/input/index.ts`
- [x] `src/lib/processors/input/piiDetectionProcessor.ts`
- [x] `src/lib/processors/input/messageValidationProcessor.ts`
- [x] `src/lib/processors/input/contentModerationProcessor.ts`
- [ ] `src/lib/processors/input/memoryRetrievalProcessor.ts` (future: memory integration)
- [ ] `src/lib/processors/input/semanticContextProcessor.ts` (future: RAG integration)

### Output Processors

- [x] `src/lib/processors/output/index.ts`
- [x] `src/lib/processors/output/responseValidationProcessor.ts`
- [x] `src/lib/processors/output/contentFilteringProcessor.ts`
- [x] `src/lib/processors/output/toxicityCheckProcessor.ts`
- [x] `src/lib/processors/output/lengthValidationProcessor.ts`
- [ ] `src/lib/processors/output/memoryPersistenceProcessor.ts` (future: memory integration)

### Tests

- [x] `test/unit/processors/pipeline.test.ts`
- [x] `test/unit/processors/registry.test.ts`
- [x] `test/unit/processors/tripwire.test.ts`
- [x] `test/unit/processors/input/piiDetection.test.ts`
- [x] `test/unit/processors/output/toxicityCheck.test.ts`
- [ ] `test/integration/processors.test.ts` (future: integration with NeuroLink.generate())

### Documentation

- [ ] Update `CLAUDE.md` (future: when merging to main)
- [ ] `docs/features/processors.md` (future: user documentation)
- [ ] `examples/processors/*.ts` (future: example code)

---

## Appendix B: Key Implementation Decisions

### Decision 1: Separate from Middleware

**Decision:** Implement processors as a separate system from middleware.

**Rationale:**

- Middleware wraps the AI SDK language model
- Processors handle pre/post data transformation
- Different abstraction levels, different purposes
- Allows gradual adoption without breaking changes

### Decision 2: Priority-Based Ordering

**Decision:** Use priority numbers (higher = earlier) for processor ordering.

**Rationale:**

- Consistent with existing middleware pattern
- Allows insertion of new processors without reordering
- Default priority of 0 for unspecified processors

### Decision 3: Explicit Control Flow

**Decision:** Use explicit `continue`, `abort`, `retry` actions instead of exceptions.

**Rationale:**

- Clearer control flow semantics
- Better feedback mechanism for retries
- Easier to trace and debug
- Aligns with Mastra patterns

### Decision 4: Metadata Propagation

**Decision:** Pass metadata through the entire pipeline.

**Rationale:**

- Enables processor communication
- Supports observability and tracing
- Allows accumulation of issues
- Facilitates debugging

### Decision 5: Optional Integration

**Decision:** Processors are opt-in via `processors` config.

**Rationale:**

- Zero breaking changes
- Gradual adoption path
- No overhead when not used
- Backward compatibility

---

---

## 11. Error Handling Patterns from History

Based on the evolution of error handling in NeuroLink (documented in `research/git-history/07-error-handling-evolution.md`), the processor system should incorporate these battle-tested patterns.

### 11.1 Retry Mechanism Patterns

**Exponential Backoff with Jitter**

Processors that support retry should use the proven exponential backoff algorithm:

```typescript
import { calculateBackoffDelay } from "../utils/retryHandler.js";

type ProcessorRetryConfig = {
  maxAttempts: number;
  initialDelay: number; // Default: 1000ms
  maxDelay: number; // Default: 30000ms
  backoffMultiplier: number; // Default: 2
  addJitter: boolean; // Default: true (prevents thundering herd)
};

// In output processor implementation
async function processWithRetry<T>(
  operation: () => Promise<T>,
  config: ProcessorRetryConfig,
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt < config.maxAttempts) {
        const delay = calculateBackoffDelay(
          attempt,
          config.initialDelay,
          config.backoffMultiplier,
          config.maxDelay,
          config.addJitter,
        );
        await sleep(delay);
      }
    }
  }

  throw lastError;
}
```

**Key Lessons from History:**

- Jitter (up to 10% of delay, max 1 second) prevents "thundering herd" problems
- Different error types require different retry strategies
- Rate limiters complement retry logic

### 11.2 Circuit Breaker for Processor Pipelines

For processors that call external services (toxicity APIs, AI-based moderation), implement circuit breakers:

```typescript
type CircuitBreakerConfig = {
  threshold: number; // Failures before opening (default: 5)
  timeout: number; // Reset timeout in ms (default: 60000)
  monitorWindow: number; // Window for counting failures (default: 600000)
};

class ProcessorCircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: "closed" | "open" | "half-open" = "closed";

  async execute<T>(processor: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - this.lastFailureTime > this.config.timeout) {
        this.state = "half-open";
      } else {
        throw new ProcessorCircuitOpenError(
          "Circuit breaker is open - processor skipped",
        );
      }
    }

    try {
      const result = await processor();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }
}
```

**Integration with Pipeline:**

```typescript
const pipeline = new ProcessorPipeline({
  outputProcessors: [
    {
      processor: createToxicityCheckProcessor(),
      config: {
        circuitBreaker: {
          enabled: true,
          threshold: 3,
          timeout: 30000,
        },
      },
    },
  ],
});
```

### 11.3 Retryable Error Classification

Based on NeuroLink's error handling evolution, processors should classify errors:

```typescript
function isRetryableProcessorError(error: unknown): boolean {
  // Network errors are retryable
  if (error instanceof NetworkError || error instanceof TemporaryError) {
    return true;
  }

  // Timeout errors are retryable
  if (error?.name === "TimeoutError" || error?.code === "TIMEOUT") {
    return true;
  }

  // Network-related error codes
  if (
    ["ECONNRESET", "ENOTFOUND", "ECONNREFUSED", "ETIMEDOUT"].includes(
      error?.code,
    )
  ) {
    return true;
  }

  // HTTP status codes
  if (error?.status) {
    const status = Number(error.status);
    // 429 = rate limit, 408 = timeout, 5xx = server errors
    return status >= 500 || status === 429 || status === 408;
  }

  return false;
}
```

### 11.4 Error Factory Pattern for Processors

Following the established ErrorFactory pattern:

```typescript
export class ProcessorErrorFactory {
  static processorFailed(
    processorId: string,
    originalError: Error,
  ): ProcessorError {
    return new ProcessorError({
      code: PROCESSOR_ERROR_CODES.PROCESSOR_FAILED,
      message: `Processor '${processorId}' failed: ${originalError.message}`,
      category: ErrorCategory.EXECUTION,
      severity: ErrorSeverity.HIGH,
      retriable: isRetryableProcessorError(originalError),
      originalError,
      processorId,
    });
  }

  static validationFailed(
    processorId: string,
    validationErrors: string[],
  ): ProcessorError {
    return new ProcessorError({
      code: PROCESSOR_ERROR_CODES.VALIDATION_FAILED,
      message: `Validation failed in '${processorId}': ${validationErrors.join(", ")}`,
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.MEDIUM,
      retriable: false,
      processorId,
      context: { validationErrors },
    });
  }

  static circuitOpen(processorId: string): ProcessorError {
    return new ProcessorError({
      code: PROCESSOR_ERROR_CODES.CIRCUIT_OPEN,
      message: `Circuit breaker open for processor '${processorId}'`,
      category: ErrorCategory.EXECUTION,
      severity: ErrorSeverity.HIGH,
      retriable: false,
      processorId,
    });
  }
}
```

---

## 12. Content Moderation Best Practices

Based on LLM evaluation research (documented in `research/online/08-llm-evaluation-research.md`), incorporate these content moderation and safety patterns.

### 12.1 Multi-Layer Toxicity Detection

**Tiered Detection Approach:**

```typescript
type ToxicityDetectionConfig = {
  // Tier 1: Fast regex/keyword matching
  keywordDetection: {
    enabled: boolean;
    blockedWords: string[];
    blockedPatterns: RegExp[];
  };

  // Tier 2: Model-based detection (Perspective API, etc.)
  modelBasedDetection: {
    enabled: boolean;
    provider: "perspective" | "openai" | "azure" | "custom";
    threshold: number; // 0-1, default 0.7
    categories: ToxicityCategory[];
  };

  // Tier 3: LLM-as-judge (most comprehensive but slowest)
  llmJudgeDetection: {
    enabled: boolean;
    model: string;
    strictness: "low" | "medium" | "high";
  };
};
```

**Implementation Pattern:**

```typescript
export function createAdvancedToxicityProcessor(
  config: ToxicityDetectionConfig,
): OutputProcessor<ToxicityDetectionConfig> {
  return createOutputProcessor({
    id: "advanced-toxicity-check",
    name: "Advanced Toxicity Check",
    description: "Multi-tier toxicity detection with escalating analysis",

    async process(data, cfg) {
      const config = cfg || defaultConfig;
      const issues: ProcessorIssue[] = [];

      // Tier 1: Fast keyword check (always runs)
      if (config.keywordDetection.enabled) {
        const keywordResult = checkKeywords(
          data.responseText,
          config.keywordDetection,
        );
        if (keywordResult.detected) {
          return {
            action: "abort",
            feedback: "Content blocked due to prohibited keywords",
            issues: [
              {
                category: "toxicity",
                severity: "critical",
                message: keywordResult.reason,
              },
            ],
          };
        }
      }

      // Tier 2: Model-based detection
      if (config.modelBasedDetection.enabled) {
        const modelResult = await checkWithModel(
          data.responseText,
          config.modelBasedDetection,
        );
        if (modelResult.score > config.modelBasedDetection.threshold) {
          return {
            action: config.modelBasedDetection.action || "abort",
            feedback: `Toxicity detected: ${modelResult.category} (score: ${modelResult.score})`,
            issues: [
              {
                category: "toxicity",
                severity: modelResult.score > 0.9 ? "critical" : "error",
                message: modelResult.reason,
                context: { scores: modelResult.categoryScores },
              },
            ],
          };
        }
      }

      // Tier 3: LLM judge for edge cases (optional)
      if (config.llmJudgeDetection.enabled) {
        const llmResult = await checkWithLLMJudge(
          data.responseText,
          data.input.text,
          config.llmJudgeDetection,
        );
        if (!llmResult.safe) {
          issues.push({
            category: "toxicity",
            severity: "warning",
            message: llmResult.explanation,
          });
        }
      }

      return { action: "continue", data, issues };
    },
  });
}
```

### 12.2 Hallucination Detection Techniques

Based on research findings, implement multiple hallucination detection strategies:

**Detection Categories:**

| Method                   | Description                  | Best For                 |
| ------------------------ | ---------------------------- | ------------------------ |
| **Faithfulness Scoring** | QAG-based claim verification | RAG responses            |
| **Semantic Entropy**     | Entropy at meaning level     | Confident confabulations |
| **Self-Consistency**     | Multiple sampling comparison | Open-ended generation    |
| **NLI-Based**            | Natural Language Inference   | Context grounding        |

**Implementation:**

```typescript
type HallucinationCheckConfig = {
  method: "faithfulness" | "consistency" | "nli" | "combined";
  threshold: number; // 0-1
  context?: string[]; // Retrieved context for RAG
  action: "abort" | "retry" | "warn";
};

export function createHallucinationCheckProcessor(
  config: HallucinationCheckConfig,
): OutputProcessor<HallucinationCheckConfig> {
  return createOutputProcessor({
    id: "hallucination-check",
    name: "Hallucination Detection",
    description: "Detects potential hallucinations using configured method",

    async process(data, cfg) {
      const config = cfg || defaultConfig;

      switch (config.method) {
        case "faithfulness":
          return checkFaithfulness(data, config);
        case "consistency":
          return checkSelfConsistency(data, config);
        case "nli":
          return checkNLIGrounding(data, config);
        case "combined":
          return checkCombined(data, config);
      }
    },
  });
}

// QAG-based faithfulness scoring
async function checkFaithfulness(
  data: OutputProcessorData,
  config: HallucinationCheckConfig,
): Promise<ProcessorResult<OutputProcessorData>> {
  // Extract claims from response
  const claims = await extractClaims(data.responseText);

  // Verify each claim against context
  const context = config.context || data.metadata.custom.retrievedContext;
  let supportedClaims = 0;

  for (const claim of claims) {
    const isSupported = await verifyClaim(claim, context);
    if (isSupported) supportedClaims++;
  }

  // Calculate faithfulness score
  const score = claims.length > 0 ? supportedClaims / claims.length : 1;

  if (score < config.threshold) {
    return {
      action: config.action,
      feedback: `Faithfulness score ${score.toFixed(2)} below threshold ${config.threshold}`,
      issues: [
        {
          category: "hallucination",
          severity: score < 0.5 ? "error" : "warning",
          message: `${claims.length - supportedClaims} of ${claims.length} claims not supported by context`,
        },
      ],
    };
  }

  return { action: "continue", data, metadata: { faithfulnessScore: score } };
}
```

### 12.3 LLM-as-Judge Integration

Implement flexible LLM-as-judge pattern for custom evaluation:

```typescript
type LLMJudgeConfig = {
  model: string;
  criteria: string;
  scale: "binary" | "3-point" | "5-point";
  threshold?: number;
  includeReasoning: boolean;
};

export function createLLMJudgeProcessor(
  config: LLMJudgeConfig,
): OutputProcessor<LLMJudgeConfig> {
  return createOutputProcessor({
    id: "llm-judge",
    name: "LLM-as-Judge Evaluator",
    description: "Evaluates output quality using LLM-as-judge pattern",

    async process(data, cfg) {
      const config = cfg || defaultConfig;

      const prompt = buildJudgePrompt(
        data.input.text,
        data.responseText,
        config.criteria,
        config.scale,
      );

      const evaluation = await evaluateWithLLM(config.model, prompt);

      // Normalize score to 0-1
      const normalizedScore = normalizeScore(evaluation.score, config.scale);

      const passed = normalizedScore >= (config.threshold || 0.5);

      return {
        action: passed ? "continue" : "retry",
        data,
        feedback: passed ? undefined : evaluation.reasoning,
        issues: passed
          ? []
          : [
              {
                category: "quality",
                severity: "warning",
                message: `LLM judge score ${normalizedScore.toFixed(2)}: ${evaluation.reasoning}`,
              },
            ],
        metadata: {
          llmJudgeScore: normalizedScore,
          llmJudgeReasoning: config.includeReasoning
            ? evaluation.reasoning
            : undefined,
        },
      };
    },
  });
}

function buildJudgePrompt(
  input: string,
  output: string,
  criteria: string,
  scale: string,
): string {
  return `You are evaluating an AI response based on specific criteria.

**User Input:**
${input}

**AI Response:**
${output}

**Evaluation Criteria:**
${criteria}

**Scoring Scale:** ${scale === "binary" ? "Pass (1) or Fail (0)" : scale === "3-point" ? "1-3" : "1-5"}

Evaluate the response and provide:
1. A score based on the scale
2. Brief reasoning for your evaluation

Respond in JSON format:
{"score": <number>, "reasoning": "<brief explanation>"}`;
}
```

### 12.4 Bias and Fairness Detection

```typescript
type BiasDetectionConfig = {
  categories: BiasCategory[];
  threshold: number;
  action: "abort" | "warn" | "log";
};

type BiasCategory =
  | "gender"
  | "race"
  | "age"
  | "religion"
  | "nationality"
  | "disability"
  | "socioeconomic";

export function createBiasDetectionProcessor(
  config: BiasDetectionConfig,
): OutputProcessor<BiasDetectionConfig> {
  return createOutputProcessor({
    id: "bias-detection",
    name: "Bias Detection",
    description: "Detects potential bias in AI responses",

    async process(data, cfg) {
      const config = cfg || defaultConfig;
      const biasResults: Array<{
        category: BiasCategory;
        score: number;
        evidence: string;
      }> = [];

      for (const category of config.categories) {
        const result = await detectBias(data.responseText, category);
        if (result.score > config.threshold) {
          biasResults.push({ category, ...result });
        }
      }

      if (biasResults.length > 0) {
        return {
          action: config.action === "abort" ? "abort" : "continue",
          issues: biasResults.map((r) => ({
            category: "bias",
            severity: config.action === "abort" ? "error" : "warning",
            message: `Potential ${r.category} bias detected (score: ${r.score.toFixed(2)})`,
            context: { evidence: r.evidence },
          })),
          metadata: { biasScores: biasResults },
        };
      }

      return { action: "continue", data };
    },
  });
}
```

---

## 13. Mastra Processor Insights

Based on Mastra architecture research (documented in `research/online/01-mastra-architecture-research.md`), incorporate these patterns.

### 13.1 Tripwire Patterns from Mastra Evaluations

Mastra's evaluation framework provides inspiration for tripwire patterns:

**Evaluation-Based Tripwires:**

```typescript
// Mastra-inspired evaluation tripwires
export const evaluationTripwires: TripwireConfig[] = [
  {
    id: "answer-relevancy",
    name: "Answer Relevancy Check",
    condition: async (data) => {
      if (!("responseText" in data)) return false;
      const score = await evaluateAnswerRelevancy(
        data.input.text,
        data.responseText,
      );
      return score < 0.6; // Trip if below threshold
    },
    action: "retry",
    message: "Response not relevant to the question",
    severity: "warning",
  },
  {
    id: "context-precision",
    name: "Context Precision Check",
    condition: async (data) => {
      if (!data.metadata.custom.retrievedContext) return false;
      const score = await evaluateContextPrecision(
        data.responseText,
        data.metadata.custom.retrievedContext,
      );
      return score < 0.5;
    },
    action: "warn",
    message: "Retrieved context may not be optimally used",
    severity: "info",
  },
  {
    id: "factual-correctness",
    name: "Factual Correctness Check",
    condition: async (data) => {
      if (!("responseText" in data)) return false;
      const score = await evaluateFactualCorrectness(data.responseText);
      return score < 0.7;
    },
    action: "abort",
    message: "Response may contain factual errors",
    severity: "error",
  },
];
```

### 13.2 Abort Mechanism Design

Inspired by Mastra's workflow control flow patterns:

**Abort with Structured Feedback:**

```typescript
type ProcessorAbortContext = {
  processorId: string;
  processorName: string;
  reason: string;
  feedback: string[];
  recoveryHints?: string[];
  alternativeAction?: "retry" | "skip" | "fallback";
};

function createAbortResult(
  context: ProcessorAbortContext,
  data: OutputProcessorData,
): PipelineResult<OutputProcessorData> {
  return {
    action: "abort",
    feedback: [
      ...context.feedback,
      `Aborted by ${context.processorName}: ${context.reason}`,
    ],
    issues: [
      {
        category: "processor_abort",
        severity: "error",
        message: context.reason,
        context: {
          processorId: context.processorId,
          recoveryHints: context.recoveryHints,
          alternativeAction: context.alternativeAction,
        },
      },
    ],
    metadata: data.metadata,
    totalTime: Date.now() - data.metadata.timestamp,
  };
}
```

### 13.3 Workflow-Integrated Processors

Mastra's workflow patterns suggest deep integration between processors and workflows:

```typescript
// Processor that can suspend workflow for human review
export function createHumanReviewProcessor(
  config: HumanReviewConfig,
): OutputProcessor<HumanReviewConfig> {
  return createOutputProcessor({
    id: "human-review",
    name: "Human Review Gate",
    description: "Suspends processing for human review when conditions are met",

    async process(data, cfg) {
      const config = cfg || defaultConfig;

      // Check if human review is required
      const needsReview = await checkReviewConditions(data, config);

      if (needsReview.required) {
        return {
          action: "suspend", // New action type for workflow integration
          data,
          feedback: needsReview.reason,
          metadata: {
            reviewRequired: true,
            reviewType: needsReview.type,
            suspendedAt: Date.now(),
          },
        };
      }

      return { action: "continue", data };
    },
  });
}

type HumanReviewConfig = {
  conditions: Array<{
    check: (data: OutputProcessorData) => Promise<boolean>;
    type: "approval" | "verification" | "correction";
    urgency: "low" | "medium" | "high";
  }>;
  timeout?: number;
  escalation?: {
    enabled: boolean;
    afterMs: number;
    escalateTo: string;
  };
};
```

### 13.4 Agent Network Integration

For multi-agent systems, processors can coordinate across agents:

```typescript
// Processor for agent network coordination
export function createAgentRoutingProcessor(
  config: AgentRoutingConfig,
): InputProcessor<AgentRoutingConfig> {
  return createInputProcessor({
    id: "agent-routing",
    name: "Agent Network Router",
    description: "Routes requests to appropriate agents based on content",

    async process(data, cfg) {
      const config = cfg || defaultConfig;

      // Analyze input to determine best agent
      const analysis = await analyzeInputForRouting(data.text, config.agents);

      // Add routing metadata
      return {
        action: "continue",
        data: {
          ...data,
          metadata: {
            ...data.metadata,
            custom: {
              ...data.metadata.custom,
              targetAgent: analysis.recommendedAgent,
              routingConfidence: analysis.confidence,
              routingReason: analysis.reason,
            },
          },
        },
      };
    },
  });
}
```

### 13.5 Event-Driven Processor Hooks

Adopt Mastra's event-driven architecture for processors:

```typescript
// Event-driven processor pipeline
class EventDrivenProcessorPipeline extends ProcessorPipeline {
  private eventEmitter = new EventEmitter();

  on(event: ProcessorEvent, handler: ProcessorEventHandler): void {
    this.eventEmitter.on(event, handler);
  }

  async processInput(
    data: InputProcessorData,
  ): Promise<PipelineResult<InputProcessorData>> {
    this.eventEmitter.emit("pipeline:input:start", { data });

    for (const { processor, config } of this.inputProcessors) {
      this.eventEmitter.emit("processor:start", { processor, data });

      try {
        const result = await processor.process(data, config?.config);
        this.eventEmitter.emit("processor:complete", { processor, result });

        if (result.action === "abort") {
          this.eventEmitter.emit("pipeline:abort", { processor, result });
          // ... handle abort
        }
      } catch (error) {
        this.eventEmitter.emit("processor:error", { processor, error });
        // ... handle error
      }
    }

    this.eventEmitter.emit("pipeline:input:complete", { data });
    return result;
  }
}

type ProcessorEvent =
  | "pipeline:input:start"
  | "pipeline:input:complete"
  | "pipeline:output:start"
  | "pipeline:output:complete"
  | "pipeline:abort"
  | "processor:start"
  | "processor:complete"
  | "processor:error"
  | "processor:retry";
```

---

## 14. Updated Processor Pipeline

Based on all research findings, here is the refined processor pipeline architecture.

### 14.1 Enhanced Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER REQUEST                                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    INPUT PROCESSOR PIPELINE                               │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐                │
│  │ Message       │  │ PII           │  │ Content       │                │
│  │ Validation    │→ │ Detection     │→ │ Moderation    │                │
│  └───────────────┘  └───────────────┘  └───────────────┘                │
│         ↓                  ↓                  ↓                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │              TRIPWIRE EVALUATION (Input)                           │  │
│  │  - Max input length    - Blocked patterns    - Rate limiting       │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│         │                                                                │
│         └──── ABORT ────▶ Return feedback to user                       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        MIDDLEWARE LAYER                                   │
│  (Existing: Analytics, Auto-Evaluation, etc.)                            │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         LLM EXECUTION                                     │
│  - Provider selection    - Model routing    - Tool execution             │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   OUTPUT PROCESSOR PIPELINE                               │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐                │
│  │ Response      │  │ Length        │  │ Hallucination │                │
│  │ Validation    │→ │ Validation    │→ │ Detection     │                │
│  └───────────────┘  └───────────────┘  └───────────────┘                │
│         │                  │                  │                          │
│         ▼                  ▼                  ▼                          │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐                │
│  │ Toxicity      │  │ Bias          │  │ Content       │                │
│  │ Check         │→ │ Detection     │→ │ Filtering     │                │
│  └───────────────┘  └───────────────┘  └───────────────┘                │
│         ↓                  ↓                  ↓                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │              TRIPWIRE EVALUATION (Output)                          │  │
│  │  - Empty response     - Max tokens      - Repetition loop          │  │
│  │  - Faithfulness score - Quality threshold                          │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│         │                                                                │
│         ├──── ABORT ────▶ Return feedback to user                       │
│         │                                                                │
│         └──── RETRY ────▶ Regenerate with feedback (max N times)        │
│                    │                                                     │
│                    └────▶ Back to LLM Execution with retry context      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        FINAL RESPONSE                                     │
│  - Processor metadata    - Quality scores    - Issue warnings            │
└─────────────────────────────────────────────────────────────────────────┘
```

### 14.2 Refined ProcessorPipeline Class

```typescript
import type {
  InputProcessor,
  OutputProcessor,
  ProcessorPipelineConfig,
  PipelineResult,
  ProcessorMetadata,
  TripwireConfig,
} from "../types/processorTypes.js";
import { TripwireEvaluator } from "./tripwire.js";
import { ProcessorCircuitBreaker } from "./circuitBreaker.js";
import { ProcessorErrorFactory } from "../utils/errorHandling.js";

export class ProcessorPipeline {
  private inputProcessors: ProcessorEntry<InputProcessor>[] = [];
  private outputProcessors: ProcessorEntry<OutputProcessor>[] = [];
  private inputTripwires: TripwireEvaluator;
  private outputTripwires: TripwireEvaluator;
  private circuitBreakers: Map<string, ProcessorCircuitBreaker> = new Map();
  private eventEmitter: EventEmitter;
  private settings: EnhancedPipelineSettings;

  constructor(config: EnhancedProcessorPipelineConfig) {
    this.settings = {
      stopOnAbort: true,
      maxTotalRetries: 3,
      pipelineTimeout: 60000,
      enableTracing: true,
      enableCircuitBreakers: true,
      retryConfig: {
        initialDelay: 1000,
        maxDelay: 30000,
        backoffMultiplier: 2,
        addJitter: true,
      },
      ...config.settings,
    };

    // Initialize processors with priority sorting
    this.inputProcessors = this.sortByPriority(config.inputProcessors || []);
    this.outputProcessors = this.sortByPriority(config.outputProcessors || []);

    // Initialize tripwire evaluators
    this.inputTripwires = new TripwireEvaluator(config.inputTripwires || []);
    this.outputTripwires = new TripwireEvaluator(config.outputTripwires || []);

    // Initialize circuit breakers for processors with external dependencies
    this.initializeCircuitBreakers(config);

    // Event emitter for hooks
    this.eventEmitter = new EventEmitter();
  }

  async processInput(
    data: InputProcessorData,
  ): Promise<PipelineResult<InputProcessorData>> {
    const startTime = Date.now();
    const feedback: string[] = [];
    let currentData = data;

    this.emit("pipeline:input:start", { data });

    // Run input tripwires first
    const tripwireResult = this.inputTripwires.evaluate(currentData);
    if (tripwireResult.triggered && tripwireResult.action === "abort") {
      return this.createAbortResult(
        tripwireResult.tripwire!.id,
        tripwireResult.feedback!,
        currentData.metadata,
        startTime,
      );
    }

    // Process each input processor
    for (const { processor, config } of this.inputProcessors) {
      if (config?.enabled === false) continue;
      if (!this.checkConditions(config?.conditions, currentData.metadata))
        continue;

      const processorStart = Date.now();
      this.emit("processor:start", { processor, phase: "input" });

      try {
        // Check circuit breaker if enabled
        if (
          this.settings.enableCircuitBreakers &&
          this.circuitBreakers.has(processor.id)
        ) {
          const breaker = this.circuitBreakers.get(processor.id)!;
          if (!breaker.canExecute()) {
            this.emit("processor:circuit-open", { processor });
            continue; // Skip processor if circuit is open
          }
        }

        const result = await this.executeProcessorWithTimeout(
          () => processor.process(currentData, config?.config),
          processor.id,
        );

        // Record trace
        this.recordTrace(
          currentData.metadata,
          processor,
          result,
          processorStart,
        );

        // Merge issues and metadata
        this.mergeResult(currentData, result);

        this.emit("processor:complete", { processor, result, phase: "input" });

        // Handle abort
        if (result.action === "abort") {
          if (result.feedback) feedback.push(result.feedback);
          return this.createAbortResult(
            processor.id,
            result.feedback || "Input processor aborted",
            currentData.metadata,
            startTime,
            feedback,
          );
        }

        // Update data for next processor
        if (result.action === "continue" && result.data) {
          currentData = result.data;
        }

        // Record success for circuit breaker
        this.recordCircuitBreakerSuccess(processor.id);
      } catch (error) {
        this.handleProcessorError(
          processor,
          error,
          currentData.metadata,
          "input",
        );
        this.recordCircuitBreakerFailure(processor.id);

        if (this.settings.stopOnAbort) {
          return this.createAbortResult(
            processor.id,
            `Processor ${processor.id} threw an error`,
            currentData.metadata,
            startTime,
          );
        }
      }
    }

    this.emit("pipeline:input:complete", { data: currentData });

    return {
      action: "continue",
      data: currentData,
      feedback,
      issues: currentData.metadata.issues,
      metadata: currentData.metadata,
      totalTime: Date.now() - startTime,
    };
  }

  async processOutput(
    data: OutputProcessorData,
  ): Promise<PipelineResult<OutputProcessorData>> {
    const startTime = Date.now();
    const feedback: string[] = [];
    let currentData = data;
    let totalRetries = 0;

    this.emit("pipeline:output:start", { data });

    // Run output tripwires first
    const tripwireResult = this.outputTripwires.evaluate(currentData);
    if (tripwireResult.triggered) {
      if (tripwireResult.action === "abort") {
        return this.createAbortResult(
          tripwireResult.tripwire!.id,
          tripwireResult.feedback!,
          currentData.metadata,
          startTime,
        );
      }
      // Tripwires can also suggest retry
    }

    // Process each output processor
    for (const { processor, config } of this.outputProcessors) {
      if (config?.enabled === false) continue;
      if (!this.checkConditions(config?.conditions, currentData.metadata))
        continue;

      const processorStart = Date.now();
      this.emit("processor:start", { processor, phase: "output" });

      try {
        // Check circuit breaker
        if (
          this.settings.enableCircuitBreakers &&
          this.circuitBreakers.has(processor.id)
        ) {
          const breaker = this.circuitBreakers.get(processor.id)!;
          if (!breaker.canExecute()) {
            this.emit("processor:circuit-open", { processor });
            continue;
          }
        }

        const result = await this.executeProcessorWithTimeout(
          () => processor.process(currentData, config?.config),
          processor.id,
        );

        this.recordTrace(
          currentData.metadata,
          processor,
          result,
          processorStart,
        );
        this.mergeResult(currentData, result);

        this.emit("processor:complete", { processor, result, phase: "output" });

        // Handle abort
        if (result.action === "abort") {
          if (result.feedback) feedback.push(result.feedback);
          return this.createAbortResult(
            processor.id,
            result.feedback || "Output processor aborted",
            currentData.metadata,
            startTime,
            feedback,
          );
        }

        // Handle retry
        if (result.action === "retry") {
          totalRetries++;
          if (totalRetries <= this.settings.maxTotalRetries) {
            if (result.feedback) feedback.push(result.feedback);
            this.emit("processor:retry", {
              processor,
              retryCount: totalRetries,
            });

            currentData.metadata.custom.retryCount = totalRetries;
            currentData.metadata.custom.retryFeedback = result.feedback;

            return {
              action: "retry",
              data: currentData,
              feedback,
              issues: currentData.metadata.issues,
              metadata: currentData.metadata,
              totalTime: Date.now() - startTime,
            };
          }

          // Max retries exceeded
          return this.createAbortResult(
            processor.id,
            "Maximum retries exceeded",
            currentData.metadata,
            startTime,
            [...feedback, "Maximum retries exceeded"],
          );
        }

        // Continue with updated data
        if (result.action === "continue" && result.data) {
          currentData = result.data;
        }

        this.recordCircuitBreakerSuccess(processor.id);
      } catch (error) {
        this.handleProcessorError(
          processor,
          error,
          currentData.metadata,
          "output",
        );
        this.recordCircuitBreakerFailure(processor.id);

        if (this.settings.stopOnAbort) {
          return this.createAbortResult(
            processor.id,
            `Processor ${processor.id} threw an error`,
            currentData.metadata,
            startTime,
          );
        }
      }
    }

    this.emit("pipeline:output:complete", { data: currentData });

    return {
      action: "continue",
      data: currentData,
      feedback,
      issues: currentData.metadata.issues,
      metadata: currentData.metadata,
      totalTime: Date.now() - startTime,
    };
  }

  // Event hooks
  on(event: ProcessorEvent, handler: ProcessorEventHandler): void {
    this.eventEmitter.on(event, handler);
  }

  // ... helper methods
}
```

### 14.3 Enhanced Configuration Types

```typescript
export type EnhancedProcessorPipelineConfig = ProcessorPipelineConfig & {
  // Tripwire configurations
  inputTripwires?: TripwireConfig[];
  outputTripwires?: TripwireConfig[];

  // Enhanced settings
  settings?: EnhancedPipelineSettings;
};

export type EnhancedPipelineSettings = {
  // Existing settings
  stopOnAbort?: boolean;
  maxTotalRetries?: number;
  pipelineTimeout?: number;
  enableTracing?: boolean;

  // New settings from research
  enableCircuitBreakers?: boolean;
  circuitBreakerConfig?: {
    threshold: number;
    timeout: number;
    monitorWindow: number;
  };

  retryConfig?: {
    initialDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
    addJitter: boolean;
  };

  // Evaluation thresholds
  evaluationThresholds?: {
    faithfulness?: number;
    toxicity?: number;
    relevancy?: number;
    bias?: number;
  };

  // Performance settings
  parallelProcessors?: boolean; // Run independent processors in parallel
  cacheProcessorResults?: boolean;
};
```

### 14.4 New Built-in Processors (Research-Informed)

Based on research findings, add these processors to Phase 4:

| Processor                               | Category | Research Source         |
| --------------------------------------- | -------- | ----------------------- |
| `createHallucinationDetectionProcessor` | Output   | LLM Evaluation Research |
| `createFaithfulnessScoreProcessor`      | Output   | LLM Evaluation Research |
| `createBiasDetectionProcessor`          | Output   | LLM Evaluation Research |
| `createLLMJudgeProcessor`               | Output   | LLM Evaluation Research |
| `createAdvancedToxicityProcessor`       | Output   | LLM Evaluation Research |
| `createAgentRoutingProcessor`           | Input    | Mastra Architecture     |
| `createHumanReviewProcessor`            | Output   | Mastra Architecture     |
| `createContextPrecisionProcessor`       | Output   | RAGAS Metrics           |
| `createAnswerRelevancyProcessor`        | Output   | RAGAS Metrics           |

### 14.5 Updated Effort Estimates

| Phase                          | Original Estimate | Updated Estimate | Reason                              |
| ------------------------------ | ----------------- | ---------------- | ----------------------------------- |
| Phase 4: Built-in Processors   | 40 hours          | 56 hours         | +4 new research-informed processors |
| Phase 6: Abort/Retry Mechanism | 21 hours          | 28 hours         | +Circuit breaker, +Enhanced retry   |
| Phase 7: Testing               | 38 hours          | 45 hours         | +Tests for new processors           |
| **Total**                      | **179 hours**     | **214 hours**    | Additional enterprise features      |

### 14.6 Updated Phase Dependencies

```
Phase 1: Interface Design
    │
    ▼
Phase 2: Input Pipeline ──────────────────┐
    │                                      │
    ▼                                      ▼
Phase 3: Output Pipeline           Phase 4: Built-in Processors
    │                                      │
    └────────────────┬─────────────────────┘
                     │
                     ▼
Phase 5: Custom Processor API
                     │
                     ▼
Phase 6: Abort/Retry Mechanism
    │         (Now includes circuit breaker,
    │          exponential backoff, error factory)
    │
    ▼
Phase 7: Testing & Documentation
    │         (Now includes evaluation metrics tests,
    │          hallucination detection tests)
    │
    ▼
       COMPLETE
```

---

_This implementation plan is version 2.0, updated with research findings from error handling evolution, LLM evaluation techniques, and Mastra architecture patterns._
