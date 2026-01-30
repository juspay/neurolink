# Input/Output Processors Implementation Guide

This document provides a comprehensive implementation guide for Mastra-style input/output processors in NeuroLink. Processors provide a clean abstraction layer for validating, transforming, and enriching data flowing into and out of LLM operations.

## Table of Contents

- [Overview](#overview)
- [Current NeuroLink Middleware Analysis](#current-neurolink-middleware-analysis)
- [Processor Architecture](#processor-architecture)
- [TypeScript Type Definitions](#typescript-type-definitions)
- [Input Processors](#input-processors)
- [Output Processors](#output-processors)
- [Processor Features](#processor-features)
- [Integration with NeuroLink](#integration-with-neurolink)
- [Code Examples](#code-examples)
- [Step-by-Step Implementation Plan](#step-by-step-implementation-plan)

---

## Overview

### What Are Processors?

Processors are specialized middleware components that operate on input data before it reaches the LLM (input processors) or on output data after the LLM responds (output processors). Unlike general middleware which wraps the entire generation flow, processors focus on specific transformation or validation tasks.

### Key Differences from Middleware

| Aspect           | NeuroLink Middleware         | Mastra-Style Processors            |
| ---------------- | ---------------------------- | ---------------------------------- |
| **Scope**        | Wraps entire LLM call        | Transforms specific data           |
| **Control Flow** | Can abort via error throwing | Has explicit abort/retry mechanism |
| **Chaining**     | Priority-based chain         | Sequential pipeline with feedback  |
| **Purpose**      | Cross-cutting concerns       | Data transformation/validation     |
| **Integration**  | AI SDK wrapLanguageModel     | Pre/post processing hooks          |

### Why Add Processors?

1. **Cleaner Separation** - Middleware handles infrastructure concerns; processors handle data concerns
2. **Better Control Flow** - Explicit abort/retry with feedback messages
3. **Composability** - Build complex pipelines from simple, focused processors
4. **Testability** - Each processor is independently testable
5. **Mastra Compatibility** - Align with Mastra's agent patterns

---

## Current NeuroLink Middleware Analysis

### Existing Architecture

NeuroLink's middleware system is built around the AI SDK's `wrapLanguageModel` functionality:

```
src/lib/middleware/
├── index.ts              # Main exports
├── factory.ts            # MiddlewareFactory class
├── registry.ts           # MiddlewareRegistry class
├── builtin/
│   ├── analytics.ts      # Usage tracking middleware
│   ├── autoEvaluation.ts # Response quality evaluation
│   └── guardrails.ts     # Content filtering/safety
└── utils/
    └── guardrailsUtils.ts # Precall evaluation utilities
```

### Key Components

#### MiddlewareFactory (`factory.ts`)

The central class that:

- Registers middleware (built-in and custom)
- Manages presets (default, all, security)
- Builds middleware chains based on configuration
- Applies middleware to language models via `wrapLanguageModel`

```typescript
export class MiddlewareFactory {
  public registry: MiddlewareRegistry;
  public presets = new Map<string, MiddlewarePreset>();

  applyMiddleware(
    model: LanguageModelV1,
    context: MiddlewareContext,
    options: MiddlewareFactoryOptions = {},
  ): LanguageModelV1;
}
```

#### NeuroLinkMiddleware Interface (`middlewareTypes.ts`)

```typescript
export type NeuroLinkMiddleware = LanguageModelV1Middleware & {
  readonly metadata: NeuroLinkMiddlewareMetadata;
};

// Where LanguageModelV1Middleware provides:
// - transformParams?: Transform request parameters
// - wrapGenerate?: Wrap non-streaming generation
// - wrapStream?: Wrap streaming generation
```

### Existing Processor-Like Patterns

The **guardrails middleware** already implements processor-like behavior:

1. **Input Processing (Precall Evaluation)**:
   - Evaluates user input before LLM call
   - Can block requests (`shouldBlock: true`)
   - Can sanitize/transform input (`sanitizedInput`)

2. **Output Processing (Content Filtering)**:
   - Applies bad word filtering to responses
   - Can redact sensitive content
   - Supports regex pattern matching

```typescript
// From guardrailsUtils.ts
export async function handlePrecallGuardrails(
  params: LanguageModelV1CallOptions,
  config: PrecallEvaluationConfig,
): Promise<{
  shouldBlock: boolean;
  transformedParams: LanguageModelV1CallOptions;
}>;
```

### Gaps in Current Implementation

1. **No Explicit Abort/Retry Mechanism** - Blocking throws or returns blocked response
2. **No Feedback Loop** - Can't provide feedback for retry attempts
3. **Limited Chaining** - Processors aren't composable as a pipeline
4. **No Metadata Enrichment** - Can't easily pass context between processors
5. **Tight Coupling** - Input/output processing mixed in single middleware

---

## Processor Architecture

### Design Principles

1. **Single Responsibility** - Each processor does one thing well
2. **Explicit Control Flow** - Clear abort, retry, and continue signals
3. **Pipeline Pattern** - Processors chain with data flowing through
4. **Metadata Propagation** - Context passes through the pipeline
5. **Type Safety** - Full TypeScript support with generics

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          NeuroLink Generate/Stream                       │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         INPUT PROCESSOR PIPELINE                         │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐                │
│  │   Memory     │ → │  Validation  │ → │     PII      │ → ...          │
│  │  Retrieval   │   │              │   │  Detection   │                │
│  └──────────────┘   └──────────────┘   └──────────────┘                │
│         │                  │                  │                         │
│         ▼                  ▼                  ▼                         │
│    ProcessorResult   ProcessorResult   ProcessorResult                  │
│    (continue/abort)  (continue/abort)  (continue/abort)                 │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                         (if all continue)
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              LLM EXECUTION                               │
│                     (via existing middleware chain)                      │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        OUTPUT PROCESSOR PIPELINE                         │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐                │
│  │   Response   │ → │   Content    │ → │   Memory     │ → ...          │
│  │  Validation  │   │   Filtering  │   │  Persistence │                │
│  └──────────────┘   └──────────────┘   └──────────────┘                │
│         │                  │                  │                         │
│         ▼                  ▼                  ▼                         │
│    ProcessorResult   ProcessorResult   ProcessorResult                  │
│    (continue/retry)  (continue/abort)  (continue)                       │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
                              Final Response
```

---

## TypeScript Type Definitions

### Core Types

```typescript
// src/lib/types/processorTypes.ts

import type { JsonValue, JsonObject } from "./common.js";
import type { GenerateOptions, GenerateResult } from "./generateTypes.js";
import type { StreamOptions, StreamResult } from "./streamTypes.js";
import type { ChatMessage } from "./conversation.js";

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
  /** Issue category for classification */
  category: string;
  /** Severity level */
  severity: ProcessorSeverity;
  /** Human-readable description */
  message: string;
  /** Additional context */
  context?: JsonObject;
};

/**
 * Metadata that flows through the processor pipeline
 */
export type ProcessorMetadata = {
  /** Unique request ID */
  requestId: string;
  /** Processing start timestamp */
  timestamp: number;
  /** Provider being used */
  provider?: string;
  /** Model being used */
  model?: string;
  /** Session ID if available */
  sessionId?: string;
  /** User ID if available */
  userId?: string;
  /** Custom metadata added by processors */
  custom: Record<string, JsonValue>;
  /** Issues accumulated during processing */
  issues: ProcessorIssue[];
  /** Trace of processors executed */
  processorTrace: ProcessorTraceEntry[];
};

/**
 * Trace entry for debugging and observability
 */
export type ProcessorTraceEntry = {
  /** Processor ID */
  processorId: string;
  /** Processor name */
  processorName: string;
  /** Action taken */
  action: ProcessorAction;
  /** Execution time in ms */
  executionTime: number;
  /** Any feedback message */
  feedback?: string;
};

/**
 * Result returned by any processor
 */
export type ProcessorResult<T = unknown> = {
  /** Action to take - continue pipeline, abort, or retry */
  action: ProcessorAction;
  /** Transformed data (for continue) */
  data?: T;
  /** Feedback message (for abort/retry) */
  feedback?: string;
  /** Issues detected during processing */
  issues?: ProcessorIssue[];
  /** Metadata to merge into pipeline metadata */
  metadata?: Partial<ProcessorMetadata["custom"]>;
  /** For retry: number of attempts made */
  retryCount?: number;
  /** For retry: maximum retries allowed */
  maxRetries?: number;
};

/**
 * Input data passed to input processors
 */
export type InputProcessorData = {
  /** Original input options */
  options: GenerateOptions | StreamOptions;
  /** Messages being sent to LLM */
  messages: ChatMessage[];
  /** System prompt if any */
  systemPrompt?: string;
  /** Raw text input */
  text?: string;
  /** Pipeline metadata */
  metadata: ProcessorMetadata;
};

/**
 * Output data passed to output processors
 */
export type OutputProcessorData = {
  /** Original input that produced this output */
  input: InputProcessorData;
  /** Generation result */
  result: GenerateResult;
  /** Full response text */
  responseText: string;
  /** Tool calls made */
  toolCalls?: Array<{
    toolName: string;
    args: JsonObject;
    result?: unknown;
  }>;
  /** Pipeline metadata */
  metadata: ProcessorMetadata;
};

/**
 * Configuration for a processor
 */
export type ProcessorConfig = {
  /** Whether processor is enabled */
  enabled?: boolean;
  /** Processor-specific configuration */
  config?: JsonObject;
  /** Conditions for when to run this processor */
  conditions?: ProcessorConditions;
};

/**
 * Conditions for processor execution
 */
export type ProcessorConditions = {
  /** Only run for specific providers */
  providers?: string[];
  /** Only run for specific models */
  models?: string[];
  /** Custom condition function */
  custom?: (metadata: ProcessorMetadata) => boolean;
};
```

### Input Processor Types

```typescript
/**
 * Input processor interface
 */
export type InputProcessor<TConfig = JsonObject> = {
  /** Unique processor ID */
  readonly id: string;
  /** Human-readable name */
  readonly name: string;
  /** Description of what this processor does */
  readonly description?: string;
  /** Priority (higher = runs earlier) */
  readonly priority?: number;

  /**
   * Process input data before LLM execution
   * @param data Input data to process
   * @param config Processor configuration
   * @returns Processing result with action and transformed data
   */
  process(
    data: InputProcessorData,
    config?: TConfig,
  ): Promise<ProcessorResult<InputProcessorData>>;

  /**
   * Optional: Validate configuration
   */
  validateConfig?(config: TConfig): { valid: boolean; errors: string[] };
};

/**
 * Factory function type for creating input processors
 */
export type InputProcessorFactory<TConfig = JsonObject> = (
  config?: TConfig,
) => InputProcessor<TConfig>;
```

### Output Processor Types

```typescript
/**
 * Output processor interface
 */
export type OutputProcessor<TConfig = JsonObject> = {
  /** Unique processor ID */
  readonly id: string;
  /** Human-readable name */
  readonly name: string;
  /** Description of what this processor does */
  readonly description?: string;
  /** Priority (higher = runs earlier) */
  readonly priority?: number;

  /**
   * Process output data after LLM execution
   * @param data Output data to process
   * @param config Processor configuration
   * @returns Processing result with action and transformed data
   */
  process(
    data: OutputProcessorData,
    config?: TConfig,
  ): Promise<ProcessorResult<OutputProcessorData>>;

  /**
   * Optional: Validate configuration
   */
  validateConfig?(config: TConfig): { valid: boolean; errors: string[] };
};

/**
 * Factory function type for creating output processors
 */
export type OutputProcessorFactory<TConfig = JsonObject> = (
  config?: TConfig,
) => OutputProcessor<TConfig>;
```

### Pipeline Types

```typescript
/**
 * Configuration for the processor pipeline
 */
export type ProcessorPipelineConfig = {
  /** Input processors in order */
  inputProcessors?: Array<{
    processor: InputProcessor;
    config?: ProcessorConfig;
  }>;
  /** Output processors in order */
  outputProcessors?: Array<{
    processor: OutputProcessor;
    config?: ProcessorConfig;
  }>;
  /** Global settings */
  settings?: {
    /** Stop on first abort */
    stopOnAbort?: boolean;
    /** Maximum total retries across all processors */
    maxTotalRetries?: number;
    /** Timeout for entire pipeline in ms */
    pipelineTimeout?: number;
    /** Enable detailed tracing */
    enableTracing?: boolean;
  };
};

/**
 * Result from running the processor pipeline
 */
export type PipelineResult<T> = {
  /** Final action (continue if successful) */
  action: ProcessorAction;
  /** Processed data */
  data?: T;
  /** Accumulated feedback messages */
  feedback: string[];
  /** All issues from all processors */
  issues: ProcessorIssue[];
  /** Full metadata including traces */
  metadata: ProcessorMetadata;
  /** Total processing time in ms */
  totalTime: number;
};
```

### Tripwire Pattern Types

```typescript
/**
 * Tripwire configuration for blocking conditions
 */
export type TripwireConfig = {
  /** Unique tripwire ID */
  id: string;
  /** Human-readable name */
  name: string;
  /** Condition that triggers the tripwire */
  condition: (data: InputProcessorData | OutputProcessorData) => boolean;
  /** Action to take when triggered */
  action: "abort" | "warn" | "log";
  /** Message when triggered */
  message: string;
  /** Severity of the tripwire */
  severity: ProcessorSeverity;
};

/**
 * Result from tripwire evaluation
 */
export type TripwireResult = {
  /** Whether tripwire was triggered */
  triggered: boolean;
  /** Tripwire that was triggered */
  tripwire?: TripwireConfig;
  /** Action to take */
  action?: ProcessorAction;
  /** Feedback message */
  feedback?: string;
};
```

---

## Input Processors

### 1. Memory Message Retrieval Processor

Retrieves relevant conversation history from memory stores.

```typescript
// src/lib/processors/input/memoryRetrievalProcessor.ts

import type {
  InputProcessor,
  InputProcessorData,
  ProcessorResult,
} from "../../types/processorTypes.js";
import type { JsonObject } from "../../types/common.js";

export type MemoryRetrievalConfig = {
  /** Maximum messages to retrieve */
  maxMessages?: number;
  /** Include system messages */
  includeSystemMessages?: boolean;
  /** Memory store type */
  storeType?: "redis" | "in-memory"; // Note: "mem0" option removed (deprecated)
  /** Session ID override */
  sessionId?: string;
  /** Enable semantic search for relevant context */
  enableSemanticSearch?: boolean;
  /** Similarity threshold for semantic search */
  similarityThreshold?: number;
};

export function createMemoryRetrievalProcessor(
  defaultConfig?: MemoryRetrievalConfig,
): InputProcessor<MemoryRetrievalConfig> {
  return {
    id: "memory-retrieval",
    name: "Memory Message Retrieval",
    description: "Retrieves relevant conversation history from memory stores",
    priority: 100, // Run early to add context

    async process(
      data: InputProcessorData,
      config?: MemoryRetrievalConfig,
    ): Promise<ProcessorResult<InputProcessorData>> {
      const mergedConfig = { ...defaultConfig, ...config };
      const {
        maxMessages = 10,
        includeSystemMessages = false,
        storeType = "in-memory",
        sessionId,
        enableSemanticSearch = false,
        similarityThreshold = 0.7,
      } = mergedConfig;

      try {
        const effectiveSessionId = sessionId || data.metadata.sessionId;

        if (!effectiveSessionId) {
          // No session, nothing to retrieve
          return {
            action: "continue",
            data,
            metadata: { memoryRetrievalSkipped: true },
          };
        }

        // Retrieve messages from appropriate store
        const retrievedMessages = await retrieveMessages(
          effectiveSessionId,
          storeType,
          {
            maxMessages,
            includeSystemMessages,
            enableSemanticSearch,
            similarityThreshold,
            currentQuery: data.text,
          },
        );

        // Prepend retrieved messages to existing messages
        const enrichedData: InputProcessorData = {
          ...data,
          messages: [...retrievedMessages, ...data.messages],
        };

        return {
          action: "continue",
          data: enrichedData,
          metadata: {
            messagesRetrieved: retrievedMessages.length,
            memoryStoreType: storeType,
          },
        };
      } catch (error) {
        return {
          action: "continue", // Don't block on memory failure
          data,
          issues: [
            {
              category: "memory_retrieval",
              severity: "warning",
              message: `Memory retrieval failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  };
}

// Helper function (implement based on store type)
async function retrieveMessages(
  sessionId: string,
  storeType: string,
  options: {
    maxMessages: number;
    includeSystemMessages: boolean;
    enableSemanticSearch: boolean;
    similarityThreshold: number;
    currentQuery?: string;
  },
): Promise<ChatMessage[]> {
  // Implementation depends on store type
  // This would integrate with ConversationMemoryManager or RedisConversationMemoryManager
  return [];
}
```

### 2. Semantic Context Search Processor

Searches for relevant context using semantic similarity.

```typescript
// src/lib/processors/input/semanticContextProcessor.ts

import type {
  InputProcessor,
  InputProcessorData,
  ProcessorResult,
} from "../../types/processorTypes.js";

export type SemanticContextConfig = {
  /** Vector store to search */
  vectorStore?: "pinecone" | "weaviate" | "chromadb" | "custom";
  /** Number of results to retrieve */
  topK?: number;
  /** Minimum similarity score */
  minScore?: number;
  /** Namespace/collection to search */
  namespace?: string;
  /** Custom embedding function */
  embedFunction?: (text: string) => Promise<number[]>;
  /** Format context as system message or user context */
  contextFormat?: "system" | "user" | "both";
};

export function createSemanticContextProcessor(
  defaultConfig?: SemanticContextConfig,
): InputProcessor<SemanticContextConfig> {
  return {
    id: "semantic-context",
    name: "Semantic Context Search",
    description: "Retrieves relevant context using semantic similarity search",
    priority: 95, // After memory retrieval

    async process(
      data: InputProcessorData,
      config?: SemanticContextConfig,
    ): Promise<ProcessorResult<InputProcessorData>> {
      const mergedConfig = { ...defaultConfig, ...config };
      const {
        topK = 5,
        minScore = 0.7,
        contextFormat = "system",
      } = mergedConfig;

      if (!data.text) {
        return { action: "continue", data };
      }

      try {
        // Search for relevant context
        const results = await searchSemanticContext(data.text, mergedConfig);

        if (results.length === 0) {
          return {
            action: "continue",
            data,
            metadata: { semanticContextFound: false },
          };
        }

        // Filter by minimum score
        const relevantResults = results.filter((r) => r.score >= minScore);

        // Format context based on configuration
        const contextText = formatContextResults(relevantResults);

        let enrichedData = { ...data };

        if (contextFormat === "system" || contextFormat === "both") {
          enrichedData.systemPrompt = data.systemPrompt
            ? `${data.systemPrompt}\n\nRelevant Context:\n${contextText}`
            : `Relevant Context:\n${contextText}`;
        }

        if (contextFormat === "user" || contextFormat === "both") {
          enrichedData.messages = [
            {
              role: "user" as const,
              content: `Context: ${contextText}`,
            },
            ...data.messages,
          ];
        }

        return {
          action: "continue",
          data: enrichedData,
          metadata: {
            semanticContextFound: true,
            contextResultsCount: relevantResults.length,
            avgScore:
              relevantResults.reduce((a, b) => a + b.score, 0) /
              relevantResults.length,
          },
        };
      } catch (error) {
        return {
          action: "continue",
          data,
          issues: [
            {
              category: "semantic_search",
              severity: "warning",
              message: `Semantic search failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  };
}

type SearchResult = {
  text: string;
  score: number;
  metadata?: Record<string, unknown>;
};

async function searchSemanticContext(
  query: string,
  config: SemanticContextConfig,
): Promise<SearchResult[]> {
  // Implementation depends on vector store
  return [];
}

function formatContextResults(results: SearchResult[]): string {
  return results.map((r, i) => `[${i + 1}] ${r.text}`).join("\n\n");
}
```

### 3. Message Validation Processor

Validates message structure and content requirements.

```typescript
// src/lib/processors/input/messageValidationProcessor.ts

import type {
  InputProcessor,
  InputProcessorData,
  ProcessorResult,
  ProcessorIssue,
} from "../../types/processorTypes.js";

export type MessageValidationConfig = {
  /** Minimum message length */
  minLength?: number;
  /** Maximum message length */
  maxLength?: number;
  /** Required fields in options */
  requiredFields?: string[];
  /** Maximum number of messages */
  maxMessages?: number;
  /** Require system prompt */
  requireSystemPrompt?: boolean;
  /** Custom validation function */
  customValidator?: (data: InputProcessorData) => ValidationResult;
};

type ValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

export function createMessageValidationProcessor(
  defaultConfig?: MessageValidationConfig,
): InputProcessor<MessageValidationConfig> {
  return {
    id: "message-validation",
    name: "Message Validation",
    description: "Validates message structure and content requirements",
    priority: 90, // After context enrichment

    async process(
      data: InputProcessorData,
      config?: MessageValidationConfig,
    ): Promise<ProcessorResult<InputProcessorData>> {
      const mergedConfig = { ...defaultConfig, ...config };
      const {
        minLength = 1,
        maxLength = 100000,
        maxMessages = 100,
        requireSystemPrompt = false,
        customValidator,
      } = mergedConfig;

      const issues: ProcessorIssue[] = [];
      const errors: string[] = [];

      // Validate text length
      if (data.text) {
        if (data.text.length < minLength) {
          errors.push(`Message too short: ${data.text.length} < ${minLength}`);
        }
        if (data.text.length > maxLength) {
          errors.push(`Message too long: ${data.text.length} > ${maxLength}`);
        }
      }

      // Validate message count
      if (data.messages.length > maxMessages) {
        errors.push(
          `Too many messages: ${data.messages.length} > ${maxMessages}`,
        );
      }

      // Validate system prompt requirement
      if (requireSystemPrompt && !data.systemPrompt) {
        errors.push("System prompt is required but not provided");
      }

      // Run custom validator if provided
      if (customValidator) {
        const customResult = customValidator(data);
        errors.push(...customResult.errors);
        customResult.warnings.forEach((w) => {
          issues.push({
            category: "validation",
            severity: "warning",
            message: w,
          });
        });
      }

      // Convert errors to issues
      errors.forEach((e) => {
        issues.push({
          category: "validation",
          severity: "error",
          message: e,
        });
      });

      if (errors.length > 0) {
        return {
          action: "abort",
          feedback: `Validation failed: ${errors.join("; ")}`,
          issues,
        };
      }

      return {
        action: "continue",
        data,
        issues: issues.length > 0 ? issues : undefined,
      };
    },
  };
}
```

### 4. PII Detection Processor

Detects and optionally redacts personally identifiable information.

```typescript
// src/lib/processors/input/piiDetectionProcessor.ts

import type {
  InputProcessor,
  InputProcessorData,
  ProcessorResult,
  ProcessorIssue,
} from "../../types/processorTypes.js";

export type PIIDetectionConfig = {
  /** PII types to detect */
  detectTypes?: PIIType[];
  /** Action when PII is found */
  action?: "abort" | "redact" | "warn";
  /** Redaction replacement text */
  redactionText?: string;
  /** Custom patterns to detect */
  customPatterns?: Array<{
    name: string;
    pattern: RegExp;
    replacement?: string;
  }>;
  /** Allow specific PII in certain contexts */
  allowList?: Array<{
    type: PIIType;
    context?: string;
  }>;
};

export type PIIType =
  | "email"
  | "phone"
  | "ssn"
  | "credit_card"
  | "ip_address"
  | "address"
  | "name"
  | "date_of_birth"
  | "passport"
  | "driver_license";

const PII_PATTERNS: Record<PIIType, RegExp> = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi,
  phone: /\b(\+?1[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b/g,
  ssn: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,
  credit_card: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
  ip_address: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  address:
    /\b\d+\s+[\w\s]+(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|court|ct)\b/gi,
  name: /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g, // Simple name pattern
  date_of_birth:
    /\b(?:0?[1-9]|1[0-2])[-\/](?:0?[1-9]|[12]\d|3[01])[-\/](?:19|20)\d{2}\b/g,
  passport: /\b[A-Z]{1,2}\d{6,9}\b/g,
  driver_license: /\b[A-Z]{1,2}\d{5,8}\b/g,
};

export function createPIIDetectionProcessor(
  defaultConfig?: PIIDetectionConfig,
): InputProcessor<PIIDetectionConfig> {
  return {
    id: "pii-detection",
    name: "PII Detection",
    description:
      "Detects and optionally redacts personally identifiable information",
    priority: 85,

    async process(
      data: InputProcessorData,
      config?: PIIDetectionConfig,
    ): Promise<ProcessorResult<InputProcessorData>> {
      const mergedConfig = { ...defaultConfig, ...config };
      const {
        detectTypes = ["email", "phone", "ssn", "credit_card"],
        action = "warn",
        redactionText = "[REDACTED]",
        customPatterns = [],
      } = mergedConfig;

      const detectedPII: Array<{ type: string; matches: string[] }> = [];
      let processedText = data.text || "";

      // Detect standard PII types
      for (const piiType of detectTypes) {
        const pattern = PII_PATTERNS[piiType];
        if (pattern) {
          const matches = processedText.match(pattern);
          if (matches && matches.length > 0) {
            detectedPII.push({ type: piiType, matches });

            if (action === "redact") {
              processedText = processedText.replace(pattern, redactionText);
            }
          }
        }
      }

      // Detect custom patterns
      for (const custom of customPatterns) {
        const matches = processedText.match(custom.pattern);
        if (matches && matches.length > 0) {
          detectedPII.push({ type: custom.name, matches });

          if (action === "redact") {
            processedText = processedText.replace(
              custom.pattern,
              custom.replacement || redactionText,
            );
          }
        }
      }

      // No PII found
      if (detectedPII.length === 0) {
        return {
          action: "continue",
          data,
          metadata: { piiDetected: false },
        };
      }

      // Build issues list
      const issues: ProcessorIssue[] = detectedPII.map((pii) => ({
        category: "pii_detection",
        severity: action === "abort" ? "critical" : "warning",
        message: `Detected ${pii.type}: ${pii.matches.length} occurrence(s)`,
        context: { type: pii.type, count: pii.matches.length },
      }));

      // Handle based on action
      if (action === "abort") {
        return {
          action: "abort",
          feedback: `PII detected: ${detectedPII.map((p) => p.type).join(", ")}`,
          issues,
        };
      }

      // For redact or warn, continue with potentially modified data
      const enrichedData: InputProcessorData =
        action === "redact" ? { ...data, text: processedText } : data;

      return {
        action: "continue",
        data: enrichedData,
        issues,
        metadata: {
          piiDetected: true,
          piiTypes: detectedPII.map((p) => p.type),
          piiRedacted: action === "redact",
        },
      };
    },
  };
}
```

### 5. Content Moderation Processor

Checks input for inappropriate or policy-violating content.

```typescript
// src/lib/processors/input/contentModerationProcessor.ts

import type {
  InputProcessor,
  InputProcessorData,
  ProcessorResult,
  ProcessorIssue,
} from "../../types/processorTypes.js";

export type ContentModerationConfig = {
  /** Categories to check */
  categories?: ModerationCategory[];
  /** Threshold for blocking (0-1) */
  blockThreshold?: number;
  /** Threshold for warning (0-1) */
  warnThreshold?: number;
  /** Use AI-based moderation */
  useAIModeration?: boolean;
  /** AI moderation provider */
  aiProvider?: string;
  /** AI moderation model */
  aiModel?: string;
  /** Custom word list to block */
  blockedWords?: string[];
  /** Custom regex patterns to block */
  blockedPatterns?: string[];
};

export type ModerationCategory =
  | "hate_speech"
  | "violence"
  | "sexual_content"
  | "self_harm"
  | "harassment"
  | "illegal_activity"
  | "spam"
  | "misinformation";

type ModerationResult = {
  flagged: boolean;
  categories: Record<ModerationCategory, { flagged: boolean; score: number }>;
  overallScore: number;
};

export function createContentModerationProcessor(
  defaultConfig?: ContentModerationConfig,
): InputProcessor<ContentModerationConfig> {
  return {
    id: "content-moderation",
    name: "Content Moderation",
    description: "Checks input for inappropriate or policy-violating content",
    priority: 80,

    async process(
      data: InputProcessorData,
      config?: ContentModerationConfig,
    ): Promise<ProcessorResult<InputProcessorData>> {
      const mergedConfig = { ...defaultConfig, ...config };
      const {
        categories = ["hate_speech", "violence", "harassment"],
        blockThreshold = 0.8,
        warnThreshold = 0.5,
        useAIModeration = false,
        blockedWords = [],
        blockedPatterns = [],
      } = mergedConfig;

      if (!data.text) {
        return { action: "continue", data };
      }

      const issues: ProcessorIssue[] = [];
      let shouldBlock = false;

      // Check blocked words
      const lowerText = data.text.toLowerCase();
      for (const word of blockedWords) {
        if (lowerText.includes(word.toLowerCase())) {
          shouldBlock = true;
          issues.push({
            category: "content_moderation",
            severity: "critical",
            message: `Blocked word detected: ${word}`,
          });
        }
      }

      // Check blocked patterns
      for (const pattern of blockedPatterns) {
        try {
          const regex = new RegExp(pattern, "gi");
          if (regex.test(data.text)) {
            shouldBlock = true;
            issues.push({
              category: "content_moderation",
              severity: "critical",
              message: `Blocked pattern matched: ${pattern}`,
            });
          }
        } catch {
          // Invalid regex, skip
        }
      }

      // AI-based moderation if enabled
      if (useAIModeration && !shouldBlock) {
        const moderationResult = await performAIModeration(
          data.text,
          categories,
          mergedConfig,
        );

        if (moderationResult.overallScore >= blockThreshold) {
          shouldBlock = true;
          issues.push({
            category: "content_moderation",
            severity: "critical",
            message: `AI moderation flagged content (score: ${moderationResult.overallScore.toFixed(2)})`,
            context: { categories: moderationResult.categories },
          });
        } else if (moderationResult.overallScore >= warnThreshold) {
          issues.push({
            category: "content_moderation",
            severity: "warning",
            message: `AI moderation warning (score: ${moderationResult.overallScore.toFixed(2)})`,
            context: { categories: moderationResult.categories },
          });
        }
      }

      if (shouldBlock) {
        return {
          action: "abort",
          feedback: "Content violates moderation policies",
          issues,
        };
      }

      return {
        action: "continue",
        data,
        issues: issues.length > 0 ? issues : undefined,
        metadata: {
          moderationPassed: true,
          issueCount: issues.length,
        },
      };
    },
  };
}

async function performAIModeration(
  text: string,
  categories: ModerationCategory[],
  config: ContentModerationConfig,
): Promise<ModerationResult> {
  // Implementation would call moderation API
  // Could use OpenAI Moderation API, Google Cloud NLP, etc.
  return {
    flagged: false,
    categories: {} as Record<
      ModerationCategory,
      { flagged: boolean; score: number }
    >,
    overallScore: 0,
  };
}
```

---

## Output Processors

### 1. Response Validation Processor

Validates LLM response structure and content.

```typescript
// src/lib/processors/output/responseValidationProcessor.ts

import type {
  OutputProcessor,
  OutputProcessorData,
  ProcessorResult,
  ProcessorIssue,
} from "../../types/processorTypes.js";
import type { JsonObject } from "../../types/common.js";

export type ResponseValidationConfig = {
  /** Minimum response length */
  minLength?: number;
  /** Maximum response length */
  maxLength?: number;
  /** Required phrases that must be present */
  requiredPhrases?: string[];
  /** Forbidden phrases that must not be present */
  forbiddenPhrases?: string[];
  /** JSON schema to validate against (if response should be JSON) */
  jsonSchema?: JsonObject;
  /** Retry if validation fails */
  retryOnFailure?: boolean;
  /** Maximum retries */
  maxRetries?: number;
  /** Custom validation function */
  customValidator?: (response: string) => { valid: boolean; errors: string[] };
};

export function createResponseValidationProcessor(
  defaultConfig?: ResponseValidationConfig,
): OutputProcessor<ResponseValidationConfig> {
  return {
    id: "response-validation",
    name: "Response Validation",
    description: "Validates LLM response structure and content",
    priority: 100,

    async process(
      data: OutputProcessorData,
      config?: ResponseValidationConfig,
    ): Promise<ProcessorResult<OutputProcessorData>> {
      const mergedConfig = { ...defaultConfig, ...config };
      const {
        minLength = 0,
        maxLength = Infinity,
        requiredPhrases = [],
        forbiddenPhrases = [],
        jsonSchema,
        retryOnFailure = false,
        maxRetries = 3,
        customValidator,
      } = mergedConfig;

      const response = data.responseText;
      const issues: ProcessorIssue[] = [];
      const errors: string[] = [];

      // Length validation
      if (response.length < minLength) {
        errors.push(`Response too short: ${response.length} < ${minLength}`);
      }
      if (response.length > maxLength) {
        errors.push(`Response too long: ${response.length} > ${maxLength}`);
      }

      // Required phrases
      for (const phrase of requiredPhrases) {
        if (!response.toLowerCase().includes(phrase.toLowerCase())) {
          errors.push(`Required phrase missing: "${phrase}"`);
        }
      }

      // Forbidden phrases
      for (const phrase of forbiddenPhrases) {
        if (response.toLowerCase().includes(phrase.toLowerCase())) {
          errors.push(`Forbidden phrase found: "${phrase}"`);
        }
      }

      // JSON schema validation
      if (jsonSchema) {
        try {
          const parsed = JSON.parse(response);
          const schemaErrors = validateJsonSchema(parsed, jsonSchema);
          errors.push(...schemaErrors);
        } catch {
          errors.push("Response is not valid JSON");
        }
      }

      // Custom validation
      if (customValidator) {
        const customResult = customValidator(response);
        errors.push(...customResult.errors);
      }

      // Convert errors to issues
      errors.forEach((e) => {
        issues.push({
          category: "response_validation",
          severity: "error",
          message: e,
        });
      });

      if (errors.length > 0) {
        const currentRetry = (data.metadata.custom.retryCount as number) || 0;

        if (retryOnFailure && currentRetry < maxRetries) {
          return {
            action: "retry",
            feedback: `Validation failed: ${errors.join("; ")}. Please try again.`,
            issues,
            retryCount: currentRetry + 1,
            maxRetries,
          };
        }

        return {
          action: "abort",
          feedback: `Response validation failed: ${errors.join("; ")}`,
          issues,
        };
      }

      return {
        action: "continue",
        data,
        metadata: { validationPassed: true },
      };
    },
  };
}

function validateJsonSchema(data: unknown, schema: JsonObject): string[] {
  // Simplified schema validation - use ajv or similar in production
  const errors: string[] = [];

  if (schema.type === "object" && typeof data !== "object") {
    errors.push("Expected object type");
  }

  if (schema.required && Array.isArray(schema.required)) {
    for (const field of schema.required) {
      if (!(data as Record<string, unknown>)[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    }
  }

  return errors;
}
```

### 2. Content Filtering Processor

Filters inappropriate content from LLM responses.

```typescript
// src/lib/processors/output/contentFilteringProcessor.ts

import type {
  OutputProcessor,
  OutputProcessorData,
  ProcessorResult,
  ProcessorIssue,
} from "../../types/processorTypes.js";

export type ContentFilteringConfig = {
  /** Words to filter/redact */
  filterWords?: string[];
  /** Regex patterns to filter */
  filterPatterns?: string[];
  /** Replacement text */
  replacementText?: string;
  /** Action when content is filtered */
  action?: "redact" | "abort" | "retry";
  /** Maximum retries for retry action */
  maxRetries?: number;
  /** Categories to filter */
  filterCategories?: Array<"profanity" | "pii" | "sensitive" | "custom">;
};

export function createContentFilteringProcessor(
  defaultConfig?: ContentFilteringConfig,
): OutputProcessor<ContentFilteringConfig> {
  return {
    id: "content-filtering",
    name: "Content Filtering",
    description: "Filters inappropriate content from LLM responses",
    priority: 90,

    async process(
      data: OutputProcessorData,
      config?: ContentFilteringConfig,
    ): Promise<ProcessorResult<OutputProcessorData>> {
      const mergedConfig = { ...defaultConfig, ...config };
      const {
        filterWords = [],
        filterPatterns = [],
        replacementText = "[FILTERED]",
        action = "redact",
        maxRetries = 2,
      } = mergedConfig;

      let filteredText = data.responseText;
      const issues: ProcessorIssue[] = [];
      let hasFilteredContent = false;

      // Filter words
      for (const word of filterWords) {
        const regex = new RegExp(`\\b${escapeRegExp(word)}\\b`, "gi");
        if (regex.test(filteredText)) {
          hasFilteredContent = true;
          issues.push({
            category: "content_filtering",
            severity: "warning",
            message: `Filtered word detected: ${word}`,
          });

          if (action === "redact") {
            filteredText = filteredText.replace(regex, replacementText);
          }
        }
      }

      // Filter patterns
      for (const pattern of filterPatterns) {
        try {
          const regex = new RegExp(pattern, "gi");
          if (regex.test(filteredText)) {
            hasFilteredContent = true;
            issues.push({
              category: "content_filtering",
              severity: "warning",
              message: `Filtered pattern matched`,
            });

            if (action === "redact") {
              filteredText = filteredText.replace(regex, replacementText);
            }
          }
        } catch {
          // Invalid regex, skip
        }
      }

      if (!hasFilteredContent) {
        return {
          action: "continue",
          data,
          metadata: { contentFiltered: false },
        };
      }

      // Handle based on action
      if (action === "abort") {
        return {
          action: "abort",
          feedback: "Response contained inappropriate content",
          issues,
        };
      }

      if (action === "retry") {
        const currentRetry = (data.metadata.custom.retryCount as number) || 0;
        if (currentRetry < maxRetries) {
          return {
            action: "retry",
            feedback:
              "Response contained inappropriate content. Please regenerate without: " +
              issues.map((i) => i.message).join(", "),
            issues,
            retryCount: currentRetry + 1,
            maxRetries,
          };
        }
      }

      // Redact and continue
      const filteredData: OutputProcessorData = {
        ...data,
        responseText: filteredText,
        result: {
          ...data.result,
          content: filteredText,
        },
      };

      return {
        action: "continue",
        data: filteredData,
        issues,
        metadata: {
          contentFiltered: true,
          filterCount: issues.length,
        },
      };
    },
  };
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
```

### 3. Memory Persistence Processor

Stores conversation turns in memory for future retrieval.

```typescript
// src/lib/processors/output/memoryPersistenceProcessor.ts

import type {
  OutputProcessor,
  OutputProcessorData,
  ProcessorResult,
} from "../../types/processorTypes.js";

export type MemoryPersistenceConfig = {
  /** Memory store type */
  storeType?: "redis" | "in-memory"; // Note: "mem0" option removed (deprecated)
  /** Session ID override */
  sessionId?: string;
  /** Maximum messages to retain */
  maxMessages?: number;
  /** TTL for messages in seconds */
  ttlSeconds?: number;
  /** Include tool calls in memory */
  includeToolCalls?: boolean;
  /** Summarize before storing if over limit */
  enableSummarization?: boolean;
  /** Custom metadata to store */
  customMetadata?: Record<string, unknown>;
};

export function createMemoryPersistenceProcessor(
  defaultConfig?: MemoryPersistenceConfig,
): OutputProcessor<MemoryPersistenceConfig> {
  return {
    id: "memory-persistence",
    name: "Memory Persistence",
    description: "Stores conversation turns in memory for future retrieval",
    priority: 50, // Run after other output processors

    async process(
      data: OutputProcessorData,
      config?: MemoryPersistenceConfig,
    ): Promise<ProcessorResult<OutputProcessorData>> {
      const mergedConfig = { ...defaultConfig, ...config };
      const {
        storeType = "in-memory",
        sessionId,
        maxMessages = 100,
        ttlSeconds,
        includeToolCalls = true,
        enableSummarization = false,
        customMetadata = {},
      } = mergedConfig;

      const effectiveSessionId = sessionId || data.metadata.sessionId;

      if (!effectiveSessionId) {
        return {
          action: "continue",
          data,
          metadata: { memoryPersistenceSkipped: true, reason: "no_session" },
        };
      }

      try {
        // Build the conversation turn to store
        const turn = {
          userMessage: data.input.text,
          assistantMessage: data.responseText,
          toolCalls: includeToolCalls ? data.toolCalls : undefined,
          timestamp: Date.now(),
          metadata: {
            ...customMetadata,
            provider: data.metadata.provider,
            model: data.metadata.model,
            requestId: data.metadata.requestId,
          },
        };

        // Store in appropriate memory store
        await storeConversationTurn(effectiveSessionId, turn, storeType, {
          maxMessages,
          ttlSeconds,
          enableSummarization,
        });

        return {
          action: "continue",
          data,
          metadata: {
            memoryPersisted: true,
            storeType,
            sessionId: effectiveSessionId,
          },
        };
      } catch (error) {
        // Don't fail the response if memory persistence fails
        return {
          action: "continue",
          data,
          issues: [
            {
              category: "memory_persistence",
              severity: "warning",
              message: `Memory persistence failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          metadata: { memoryPersisted: false },
        };
      }
    },
  };
}

type ConversationTurn = {
  userMessage?: string;
  assistantMessage: string;
  toolCalls?: Array<{ toolName: string; args: unknown; result?: unknown }>;
  timestamp: number;
  metadata: Record<string, unknown>;
};

async function storeConversationTurn(
  sessionId: string,
  turn: ConversationTurn,
  storeType: string,
  options: {
    maxMessages: number;
    ttlSeconds?: number;
    enableSummarization: boolean;
  },
): Promise<void> {
  // Implementation depends on store type
  // Would integrate with ConversationMemoryManager or RedisConversationMemoryManager
}
```

### 4. Toxicity Checking Processor

Evaluates response for toxic or harmful content.

```typescript
// src/lib/processors/output/toxicityCheckProcessor.ts

import type {
  OutputProcessor,
  OutputProcessorData,
  ProcessorResult,
  ProcessorIssue,
} from "../../types/processorTypes.js";

export type ToxicityCheckConfig = {
  /** Toxicity categories to check */
  categories?: ToxicityCategory[];
  /** Threshold for blocking (0-1) */
  blockThreshold?: number;
  /** Threshold for warning (0-1) */
  warnThreshold?: number;
  /** Action when toxicity is detected */
  action?: "abort" | "retry" | "warn";
  /** Maximum retries for retry action */
  maxRetries?: number;
  /** Provider for toxicity checking */
  provider?: string;
  /** Model for toxicity checking */
  model?: string;
};

export type ToxicityCategory =
  | "toxicity"
  | "severe_toxicity"
  | "identity_attack"
  | "insult"
  | "profanity"
  | "threat"
  | "sexually_explicit";

type ToxicityResult = {
  overallScore: number;
  categories: Record<ToxicityCategory, number>;
  flagged: boolean;
};

export function createToxicityCheckProcessor(
  defaultConfig?: ToxicityCheckConfig,
): OutputProcessor<ToxicityCheckConfig> {
  return {
    id: "toxicity-check",
    name: "Toxicity Check",
    description: "Evaluates response for toxic or harmful content",
    priority: 95,

    async process(
      data: OutputProcessorData,
      config?: ToxicityCheckConfig,
    ): Promise<ProcessorResult<OutputProcessorData>> {
      const mergedConfig = { ...defaultConfig, ...config };
      const {
        categories = ["toxicity", "severe_toxicity", "threat"],
        blockThreshold = 0.8,
        warnThreshold = 0.5,
        action = "warn",
        maxRetries = 2,
      } = mergedConfig;

      try {
        const result = await checkToxicity(
          data.responseText,
          categories,
          mergedConfig,
        );

        const issues: ProcessorIssue[] = [];

        // Build issues for flagged categories
        for (const [category, score] of Object.entries(result.categories)) {
          if (score >= warnThreshold) {
            issues.push({
              category: "toxicity",
              severity: score >= blockThreshold ? "critical" : "warning",
              message: `${category}: ${(score * 100).toFixed(1)}%`,
              context: { category, score },
            });
          }
        }

        // Handle based on threshold and action
        if (result.overallScore >= blockThreshold) {
          if (action === "retry") {
            const currentRetry =
              (data.metadata.custom.retryCount as number) || 0;
            if (currentRetry < maxRetries) {
              return {
                action: "retry",
                feedback:
                  "Response contained toxic content. Please regenerate with a more appropriate tone.",
                issues,
                retryCount: currentRetry + 1,
                maxRetries,
              };
            }
          }

          if (action === "abort" || action === "retry") {
            return {
              action: "abort",
              feedback: "Response failed toxicity check",
              issues,
            };
          }
        }

        return {
          action: "continue",
          data,
          issues: issues.length > 0 ? issues : undefined,
          metadata: {
            toxicityScore: result.overallScore,
            toxicityPassed: result.overallScore < blockThreshold,
          },
        };
      } catch (error) {
        // Don't block on toxicity check failure
        return {
          action: "continue",
          data,
          issues: [
            {
              category: "toxicity",
              severity: "warning",
              message: `Toxicity check failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  };
}

async function checkToxicity(
  text: string,
  categories: ToxicityCategory[],
  config: ToxicityCheckConfig,
): Promise<ToxicityResult> {
  // Implementation would call toxicity API
  // Could use Perspective API, OpenAI Moderation, etc.
  return {
    overallScore: 0,
    categories: {} as Record<ToxicityCategory, number>,
    flagged: false,
  };
}
```

---

## Processor Features

### Abort/Retry Mechanism with Feedback

The processor system provides explicit control flow through the `ProcessorResult` type:

```typescript
// Abort - Stop processing and return error
return {
  action: "abort",
  feedback: "Human-readable reason for the abort",
  issues: [
    /* detailed issues */
  ],
};

// Retry - Request regeneration with feedback
return {
  action: "retry",
  feedback: "Instructions for the retry attempt",
  retryCount: currentRetry + 1,
  maxRetries: 3,
};

// Continue - Proceed to next processor
return {
  action: "continue",
  data: transformedData,
  metadata: {
    /* enrichment */
  },
};
```

### Tripwire Pattern for Blocking

Tripwires are configurable conditions that can block processing:

```typescript
// src/lib/processors/tripwire.ts

import type {
  TripwireConfig,
  TripwireResult,
  InputProcessorData,
  OutputProcessorData,
} from "../types/processorTypes.js";

export class TripwireEvaluator {
  private tripwires: TripwireConfig[] = [];

  register(tripwire: TripwireConfig): void {
    this.tripwires.push(tripwire);
  }

  evaluate(data: InputProcessorData | OutputProcessorData): TripwireResult {
    for (const tripwire of this.tripwires) {
      if (tripwire.condition(data)) {
        return {
          triggered: true,
          tripwire,
          action: tripwire.action === "abort" ? "abort" : "continue",
          feedback: tripwire.message,
        };
      }
    }

    return { triggered: false };
  }
}

// Example tripwires
export const commonTripwires: TripwireConfig[] = [
  {
    id: "max-tokens",
    name: "Maximum Tokens Exceeded",
    condition: (data) => {
      if ("result" in data) {
        return (data.result.usage?.total || 0) > 100000;
      }
      return false;
    },
    action: "abort",
    message: "Response exceeded maximum token limit",
    severity: "critical",
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
    severity: "error",
  },
  {
    id: "repetition-loop",
    name: "Repetition Loop Detection",
    condition: (data) => {
      if ("responseText" in data) {
        // Simple repetition detection
        const text = data.responseText;
        const words = text.split(/\s+/);
        const uniqueWords = new Set(words);
        return uniqueWords.size < words.length * 0.3; // Less than 30% unique
      }
      return false;
    },
    action: "warn",
    message: "Response appears to contain repetitive content",
    severity: "warning",
  },
];
```

### Metadata Enrichment

Processors can add metadata that flows through the pipeline:

```typescript
// Metadata flows through the entire pipeline
return {
  action: "continue",
  data: enrichedData,
  metadata: {
    // These get merged into ProcessorMetadata.custom
    processingLatency: 150,
    contextSourcesUsed: ["memory", "vector-store"],
    confidenceScore: 0.92,
  },
};

// Access metadata in later processors
const previousLatency = data.metadata.custom.processingLatency as number;
```

### Processor Chaining

The `ProcessorPipeline` class manages processor execution:

```typescript
// src/lib/processors/pipeline.ts

import type {
  InputProcessor,
  OutputProcessor,
  InputProcessorData,
  OutputProcessorData,
  ProcessorPipelineConfig,
  PipelineResult,
  ProcessorMetadata,
  ProcessorResult,
} from "../types/processorTypes.js";

export class ProcessorPipeline {
  private inputProcessors: Array<{
    processor: InputProcessor;
    config?: Record<string, unknown>;
  }> = [];

  private outputProcessors: Array<{
    processor: OutputProcessor;
    config?: Record<string, unknown>;
  }> = [];

  private settings: ProcessorPipelineConfig["settings"];

  constructor(config: ProcessorPipelineConfig = {}) {
    if (config.inputProcessors) {
      this.inputProcessors = config.inputProcessors.sort(
        (a, b) => (b.processor.priority || 0) - (a.processor.priority || 0),
      );
    }

    if (config.outputProcessors) {
      this.outputProcessors = config.outputProcessors.sort(
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
      // Check conditions
      if (
        config?.conditions &&
        !this.checkConditions(config.conditions, currentData.metadata)
      ) {
        continue;
      }

      const processorStart = Date.now();

      try {
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

        // Handle action
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

        if (result.action === "continue" && result.data) {
          currentData = result.data;
        }
      } catch (error) {
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
      // Check conditions
      if (
        config?.conditions &&
        !this.checkConditions(config.conditions, currentData.metadata)
      ) {
        continue;
      }

      const processorStart = Date.now();

      try {
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

        // Handle action
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

        if (result.action === "retry") {
          totalRetries++;
          if (totalRetries <= maxTotalRetries) {
            if (result.feedback) feedback.push(result.feedback);
            return {
              action: "retry",
              feedback,
              issues: currentData.metadata.issues,
              metadata: currentData.metadata,
              totalTime: Date.now() - startTime,
            };
          }
          // Max retries exceeded, abort
          return {
            action: "abort",
            feedback: [...feedback, "Maximum retries exceeded"],
            issues: currentData.metadata.issues,
            metadata: currentData.metadata,
            totalTime: Date.now() - startTime,
          };
        }

        if (result.action === "continue" && result.data) {
          currentData = result.data;
        }
      } catch (error) {
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

---

## Integration with NeuroLink

### Integration Points

The processor system integrates at specific points in NeuroLink's flow:

```
User Request
     │
     ▼
┌────────────────────┐
│  Generate Options  │ ← User provides options with processors config
└────────────────────┘
     │
     ▼
┌────────────────────┐
│  INPUT PIPELINE    │ ← ProcessorPipeline.processInput()
│  - Memory          │
│  - Context         │
│  - Validation      │
│  - PII Detection   │
│  - Moderation      │
└────────────────────┘
     │
     ├─── abort ───► Return error response
     │
     ▼
┌────────────────────┐
│  Existing Flow     │
│  - MessageBuilder  │
│  - Middleware      │
│  - LLM Call        │
└────────────────────┘
     │
     ▼
┌────────────────────┐
│  OUTPUT PIPELINE   │ ← ProcessorPipeline.processOutput()
│  - Validation      │
│  - Filtering       │
│  - Toxicity        │
│  - Memory          │
└────────────────────┘
     │
     ├─── retry ────► Back to LLM Call (with feedback)
     │
     ├─── abort ───► Return error response
     │
     ▼
   Response
```

### Extension to GenerateOptions

```typescript
// Add to src/lib/types/generateTypes.ts

import type { ProcessorPipelineConfig } from "./processorTypes.js";

export type GenerateOptions = {
  // ... existing options ...

  /**
   * Processor pipeline configuration
   * Processors run before and after LLM execution
   */
  processors?: ProcessorPipelineConfig;
};
```

### Integration in BaseProvider

```typescript
// Modifications to src/lib/core/baseProvider.ts

import { ProcessorPipeline } from "../processors/pipeline.js";
import type {
  InputProcessorData,
  OutputProcessorData,
  ProcessorMetadata,
} from "../types/processorTypes.js";

// In generate() method:

async generate(
  optionsOrPrompt: TextGenerationOptions | string,
  _analysisSchema?: ValidationSchema,
): Promise<EnhancedGenerateResult | null> {
  const options = this.normalizeTextOptions(optionsOrPrompt);
  this.validateOptions(options);
  const startTime = Date.now();

  // Initialize processor pipeline if configured
  const pipeline = options.processors
    ? new ProcessorPipeline(options.processors)
    : null;

  // Create processor metadata
  const metadata: ProcessorMetadata = {
    requestId: `${this.providerName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    provider: this.providerName,
    model: this.modelName,
    sessionId: this.sessionId,
    userId: this.userId,
    custom: {},
    issues: [],
    processorTrace: [],
  };

  try {
    // Build messages first
    const messages = await this.buildMessages(options);

    // === INPUT PROCESSING ===
    if (pipeline) {
      const inputData: InputProcessorData = {
        options,
        messages,
        systemPrompt: options.systemPrompt,
        text: options.prompt || options.input?.text,
        metadata,
      };

      const inputResult = await pipeline.processInput(inputData);

      if (inputResult.action === "abort") {
        throw new Error(inputResult.feedback.join("; ") || "Input processing aborted");
      }

      // Use processed data
      if (inputResult.data) {
        // Update messages with processed data
        // This would require restructuring to pass processed messages to generation
      }
    }

    // === EXISTING LLM EXECUTION ===
    const { tools, model } = await this.prepareGenerationContext(options);
    const generateResult = await this.executeGeneration(
      model,
      messages, // Use processed messages
      tools,
      options,
    );

    // Build enhanced result
    const { toolsUsed, toolExecutions } = this.extractToolInformation(generateResult);
    let enhancedResult = this.formatEnhancedResult(
      generateResult,
      tools,
      toolsUsed,
      toolExecutions,
      options,
    );

    // === OUTPUT PROCESSING ===
    if (pipeline) {
      const outputData: OutputProcessorData = {
        input: {
          options,
          messages,
          systemPrompt: options.systemPrompt,
          text: options.prompt || options.input?.text,
          metadata,
        },
        result: enhancedResult,
        responseText: enhancedResult.content || "",
        toolCalls: enhancedResult.toolCalls?.map(tc => ({
          toolName: tc.toolName,
          args: tc.args as JsonObject,
          result: tc.result,
        })),
        metadata,
      };

      const outputResult = await pipeline.processOutput(outputData);

      if (outputResult.action === "abort") {
        throw new Error(outputResult.feedback.join("; ") || "Output processing aborted");
      }

      if (outputResult.action === "retry" && outputResult.data) {
        // Handle retry - would need to loop back to LLM call
        // This requires more complex flow control
      }

      // Use processed result
      if (outputResult.data) {
        enhancedResult = outputResult.data.result;
      }

      // Add processor metadata to result
      enhancedResult.processorMetadata = outputResult.metadata;
    }

    return await this.enhanceResult(enhancedResult, options, startTime);
  } catch (error) {
    logger.error(`Generate failed for ${this.providerName}:`, error);
    throw this.handleProviderError(error);
  }
}
```

---

## Code Examples

### Basic Usage

```typescript
import { NeuroLink } from "@juspay/neurolink";
import {
  createPIIDetectionProcessor,
  createContentFilteringProcessor,
  createMemoryPersistenceProcessor,
} from "@juspay/neurolink/processors";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "My email is john@example.com. Tell me about AI." },
  provider: "vertex",
  model: "gemini-2.5-flash",
  processors: {
    inputProcessors: [
      {
        processor: createPIIDetectionProcessor({
          detectTypes: ["email", "phone"],
          action: "redact",
        }),
      },
    ],
    outputProcessors: [
      {
        processor: createContentFilteringProcessor({
          filterWords: ["confidential"],
          action: "redact",
        }),
      },
      {
        processor: createMemoryPersistenceProcessor({
          storeType: "redis",
        }),
      },
    ],
  },
});

// Result will have PII redacted and content filtered
console.log(result.content);
// Access processor metadata
console.log(result.processorMetadata?.processorTrace);
```

### With Tripwires

```typescript
import {
  TripwireEvaluator,
  commonTripwires,
} from "@juspay/neurolink/processors";

const tripwireEvaluator = new TripwireEvaluator();

// Register common tripwires
commonTripwires.forEach((t) => tripwireEvaluator.register(t));

// Register custom tripwire
tripwireEvaluator.register({
  id: "sensitive-topic",
  name: "Sensitive Topic Detection",
  condition: (data) => {
    const text = "text" in data ? data.text : data.responseText;
    return /\b(politics|religion|violence)\b/i.test(text || "");
  },
  action: "warn",
  message: "Content touches on sensitive topics",
  severity: "warning",
});
```

### Custom Processor

```typescript
import type {
  InputProcessor,
  InputProcessorData,
  ProcessorResult,
} from "@juspay/neurolink";

type LanguageDetectionConfig = {
  allowedLanguages: string[];
  action: "abort" | "translate" | "warn";
};

const createLanguageDetectionProcessor = (
  defaultConfig?: LanguageDetectionConfig,
): InputProcessor<LanguageDetectionConfig> => ({
  id: "language-detection",
  name: "Language Detection",
  description: "Detects and validates input language",
  priority: 75,

  async process(
    data: InputProcessorData,
    config?: LanguageDetectionConfig,
  ): Promise<ProcessorResult<InputProcessorData>> {
    const mergedConfig = { ...defaultConfig, ...config };
    const { allowedLanguages = ["en"], action = "warn" } = mergedConfig;

    if (!data.text) {
      return { action: "continue", data };
    }

    const detectedLanguage = await detectLanguage(data.text);

    if (!allowedLanguages.includes(detectedLanguage)) {
      if (action === "abort") {
        return {
          action: "abort",
          feedback: `Language ${detectedLanguage} is not allowed. Allowed: ${allowedLanguages.join(", ")}`,
          issues: [
            {
              category: "language",
              severity: "error",
              message: `Detected language: ${detectedLanguage}`,
            },
          ],
        };
      }

      if (action === "translate") {
        const translated = await translateText(data.text, allowedLanguages[0]);
        return {
          action: "continue",
          data: { ...data, text: translated },
          metadata: {
            originalLanguage: detectedLanguage,
            translated: true,
          },
        };
      }
    }

    return {
      action: "continue",
      data,
      metadata: { detectedLanguage },
    };
  },
});

async function detectLanguage(text: string): Promise<string> {
  // Implementation using language detection API
  return "en";
}

async function translateText(
  text: string,
  targetLang: string,
): Promise<string> {
  // Implementation using translation API
  return text;
}
```

---

## Step-by-Step Implementation Plan

### Phase 1: Foundation (Week 1)

1. **Create Type Definitions**
   - Create `src/lib/types/processorTypes.ts` with all types
   - Export from `src/lib/types/index.ts`
   - Add to main exports in `src/lib/index.ts`

2. **Create Directory Structure**

   ```
   src/lib/processors/
   ├── index.ts           # Main exports
   ├── pipeline.ts        # ProcessorPipeline class
   ├── tripwire.ts        # TripwireEvaluator class
   ├── input/
   │   ├── index.ts
   │   ├── memoryRetrievalProcessor.ts
   │   ├── messageValidationProcessor.ts
   │   └── piiDetectionProcessor.ts
   └── output/
       ├── index.ts
       ├── responseValidationProcessor.ts
       ├── contentFilteringProcessor.ts
       └── memoryPersistenceProcessor.ts
   ```

3. **Implement ProcessorPipeline**
   - Input processing with abort/continue
   - Output processing with abort/retry/continue
   - Metadata propagation
   - Execution tracing

### Phase 2: Core Processors (Week 2)

4. **Implement Input Processors**
   - Memory retrieval (integrate with existing ConversationMemoryManager)
   - Message validation
   - PII detection

5. **Implement Output Processors**
   - Response validation
   - Content filtering (leverage existing guardrails code)
   - Memory persistence

6. **Implement Tripwire System**
   - TripwireEvaluator class
   - Common tripwires
   - Integration points

### Phase 3: Integration (Week 3)

7. **Extend GenerateOptions**
   - Add `processors` field to types
   - Update documentation

8. **Integrate with BaseProvider**
   - Add processor pipeline execution in generate()
   - Handle abort/retry flow
   - Add metadata to results

9. **Integrate with Stream**
   - Adapt for streaming responses
   - Handle partial output processing

### Phase 4: Advanced Processors (Week 4)

10. **Implement Advanced Input Processors**
    - Semantic context search
    - Content moderation (with AI)
    - Rate limiting per user

11. **Implement Advanced Output Processors**
    - Toxicity checking
    - Fact verification
    - Citation extraction

12. **Testing & Documentation**
    - Unit tests for all processors
    - Integration tests
    - Update CLAUDE.md
    - Create examples

### Migration from Existing Guardrails

The existing guardrails middleware can be gradually migrated:

1. **Extract precall evaluation** -> `ContentModerationProcessor`
2. **Extract bad words filtering** -> `ContentFilteringProcessor`
3. **Keep middleware for backward compatibility**
4. **Deprecate guardrails middleware in favor of processors**

### Testing Strategy

```typescript
// test/processors/piiDetection.test.ts

import { describe, it, expect } from "vitest";
import { createPIIDetectionProcessor } from "../../src/lib/processors/input/piiDetectionProcessor.js";

describe("PII Detection Processor", () => {
  it("should detect email addresses", async () => {
    const processor = createPIIDetectionProcessor({
      detectTypes: ["email"],
      action: "abort",
    });

    const result = await processor.process({
      text: "Contact me at test@example.com",
      // ... other required fields
    });

    expect(result.action).toBe("abort");
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        category: "pii_detection",
      }),
    );
  });

  it("should redact PII when configured", async () => {
    const processor = createPIIDetectionProcessor({
      detectTypes: ["email"],
      action: "redact",
      redactionText: "[EMAIL]",
    });

    const result = await processor.process({
      text: "Contact me at test@example.com",
      // ... other required fields
    });

    expect(result.action).toBe("continue");
    expect(result.data?.text).toBe("Contact me at [EMAIL]");
  });
});
```

---

## Summary

This implementation guide provides a comprehensive framework for adding Mastra-style input/output processors to NeuroLink. The key features include:

1. **Clear Type System** - Full TypeScript types for processors, results, and pipelines
2. **Explicit Control Flow** - Abort, retry, and continue actions with feedback
3. **Composable Pipeline** - Chain multiple processors with priority ordering
4. **Metadata Enrichment** - Pass context through the processing pipeline
5. **Tripwire Pattern** - Configurable blocking conditions
6. **Integration Points** - Clean integration with existing NeuroLink architecture
7. **Migration Path** - Gradual migration from existing guardrails middleware

The processor system complements rather than replaces the existing middleware system:

- **Middleware**: Cross-cutting concerns, AI SDK integration
- **Processors**: Data transformation, validation, enrichment

This separation allows for cleaner code, better testability, and alignment with Mastra's agent patterns while maintaining backward compatibility with existing NeuroLink features.
