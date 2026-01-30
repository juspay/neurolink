# Type System Implementation Guide

This comprehensive guide documents NeuroLink's TypeScript type system architecture, patterns, and best practices derived from its evolution over 8+ months (June 2025 - January 2026). Use this guide when implementing new features, refactoring existing code, or understanding the type system's design decisions.

## Table of Contents

1. [Type Organization Principles](#1-type-organization-principles)
2. [Naming Conventions](#2-naming-conventions)
3. [Generic Patterns](#3-generic-patterns)
4. [Zod Integration](#4-zod-integration)
5. [Type Guards](#5-type-guards)
6. [Breaking Change Management](#6-breaking-change-management)
7. [Type Templates](#7-type-templates)
8. [Common Pitfalls](#8-common-pitfalls)
9. [Circular Dependency Prevention](#9-circular-dependency-prevention)
10. [Migration Strategies](#10-migration-strategies)

---

## 1. Type Organization Principles

### 1.1 Domain-Driven Architecture

Types are organized by functional domain to maintain clear separation of concerns and prevent circular dependencies:

```
src/lib/types/
├── index.ts                    # Central barrel file - all exports
├── common.ts                   # Base utility types (Unknown, ErrorInfo, Result)
├── typeAliases.ts              # Reusable type aliases (StandardRecord, ZodUnknownSchema)
│
├── providers.ts                # Provider types (AIProvider, ProviderStatus)
├── generateTypes.ts            # Generation API types (GenerateOptions, GenerateResult)
├── streamTypes.ts              # Streaming types (StreamOptions, StreamResult)
│
├── tools.ts                    # Tool system types (ToolDefinition, ToolResult)
├── mcpTypes.ts                 # MCP integration types (MCPServerInfo, MCPToolInfo)
├── externalMcp.ts              # External MCP server types
│
├── conversation.ts             # Conversation memory types (ChatMessage, SessionMemory)
├── multimodal.ts               # Multimodal content types (Content, ImageContent)
├── content.ts                  # Content types (re-exports from multimodal.ts)
│
├── configTypes.ts              # Configuration types (NeuroLinkConfig)
├── middlewareTypes.ts          # Middleware types (NeuroLinkMiddleware)
├── guardrails.ts               # Guardrails types (PrecallEvaluationResult)
│
├── ttsTypes.ts                 # Text-to-speech types
├── pptTypes.ts                 # PowerPoint generation types
├── fileTypes.ts                # File detection types
│
└── sdkTypes.ts                 # SDK core types for external developers
```

### 1.2 Layered Architecture

The type system follows a strict layered architecture:

```
Layer 3: Domain Types
├── providers.ts, generateTypes.ts, streamTypes.ts
├── tools.ts, mcpTypes.ts
├── conversation.ts, multimodal.ts
└── Depend on: Layer 1 & 2

Layer 2: Common Aliases
├── typeAliases.ts
└── Depends on: Layer 1

Layer 1: Foundation Types
├── common.ts
└── No internal dependencies
```

**Key Rule:** Never import from a higher layer into a lower layer.

### 1.3 Single Responsibility Per File

Each type file should focus on a specific domain:

| Domain         | File               | Responsibility                           |
| -------------- | ------------------ | ---------------------------------------- |
| Core Utilities | `common.ts`        | JSON types, Error types, Result types    |
| Validation     | `typeAliases.ts`   | Zod schemas, record types, utility types |
| Providers      | `providers.ts`     | Provider interfaces, configurations      |
| Generation     | `generateTypes.ts` | Generate API options and results         |
| Streaming      | `streamTypes.ts`   | Stream options, chunks, progress         |
| Tools          | `tools.ts`         | Tool definitions, execution              |
| MCP            | `mcpTypes.ts`      | MCP protocol types                       |
| Conversation   | `conversation.ts`  | Chat messages, memory                    |
| Multimodal     | `multimodal.ts`    | Image, audio, video content              |

### 1.4 Enum Centralization

**Critical Pattern:** All enums are centralized in `src/lib/constants/enums.ts`, NOT in type files.

```typescript
// src/lib/constants/enums.ts
export enum AIProviderName {
  BEDROCK = "bedrock",
  OPENAI = "openai",
  VERTEX = "vertex",
  // ...
}

export enum BedrockModels {
  CLAUDE_3_7_SONNET = "anthropic.claude-3-7-sonnet-20250219-v1:0",
  // ...
}
```

**Why centralize enums?**

- Prevents circular dependencies between type files
- Enables tree-shaking for unused enums
- Simplifies import paths
- Allows runtime access without importing all types

---

## 2. Naming Conventions

### 2.1 Type Naming Patterns

| Suffix      | Purpose                            | Examples                                                   |
| ----------- | ---------------------------------- | ---------------------------------------------------------- |
| `*Options`  | Input/configuration for operations | `GenerateOptions`, `StreamOptions`, `ToolExecutionOptions` |
| `*Result`   | Output from operations             | `GenerateResult`, `ToolResult`, `StreamResult`             |
| `*Config`   | Configuration objects              | `NeuroLinkConfig`, `RetryConfig`, `CacheConfig`            |
| `*Status`   | State/status information           | `ProviderStatus`, `MCPServerStatus`                        |
| `*Info`     | Descriptive information            | `MCPToolInfo`, `ExternalMCPToolInfo`                       |
| `*Context`  | Contextual data                    | `ToolContext`, `ExecutionContext`                          |
| `*Metadata` | Additional metadata                | `MCPServerMetadata`, `ToolResultMetadata`                  |
| `*Data`     | Data structures                    | `AnalyticsData`, `EvaluationData`                          |
| `*Event`    | Event payloads                     | `StreamEvent`, `ToolExecutionEvent`                        |
| `*Callback` | Callback functions                 | `ProgressCallback`, `EventCallback`                        |

### 2.2 Union Type Naming

Union types use descriptive names:

```typescript
// Status unions end with "Status"
export type ProviderHealthStatus =
  | "healthy"
  | "degraded"
  | "unhealthy"
  | "unknown";

// Type unions end with "Type"
export type MCPTransportType = "stdio" | "sse" | "websocket" | "http";

// Level unions end with "Level"
export type LogLevel = "debug" | "info" | "warn" | "error";

// Mode unions end with "Mode"
export type ExecutionMode = "sync" | "async" | "streaming";
```

### 2.3 Enum Naming

Enums use PascalCase with descriptive names:

```typescript
// Provider name enum
export enum AIProviderName {
  BEDROCK = "bedrock", // SCREAMING_SNAKE for keys
  OPENAI = "openai", // lowercase for values
}

// Model enums follow Provider + Models pattern
export enum BedrockModels {
  CLAUDE_3_7_SONNET = "anthropic.claude-3-7-sonnet-20250219-v1:0",
}

// Error enums
export enum ErrorCategory {
  VALIDATION = "validation",
  AUTHENTICATION = "authentication",
  NETWORK = "network",
}
```

### 2.4 File Naming

Type files use camelCase with descriptive domain names:

```
generateTypes.ts      # NOT generate-types.ts or GenerateTypes.ts
streamTypes.ts        # NOT stream-types.ts
mcpTypes.ts           # NOT mcp-types.ts or MCPTypes.ts
typeAliases.ts        # NOT type-aliases.ts
```

> **⚠️ Future Cleanup Task: Type File Naming Standardization**
>
> The current naming is inconsistent in `src/lib/types/`:
>
> | Pattern                 | Files    | Example                                                             |
> | ----------------------- | -------- | ------------------------------------------------------------------- |
> | **With `Types` suffix** | 18 files | `generateTypes.ts`, `streamTypes.ts`, `mcpTypes.ts`, `hitlTypes.ts` |
> | **Without suffix**      | 17 files | `common.ts`, `conversation.ts`, `providers.ts`, `tools.ts`          |
>
> **Recommendation:** Since files are in `types/` folder, the `Types` suffix is redundant. Standardize by removing suffix:
>
> - `generateTypes.ts` → `generate.ts`
> - `streamTypes.ts` → `stream.ts`
> - `mcpTypes.ts` → `mcp.ts`
>
> **Impact:** Breaking change requiring import updates across the codebase. Plan as a major version milestone.

### 2.5 Type Aliases vs Interfaces

**Decision: Always use type aliases, not interfaces.**

```typescript
// PREFERRED: Type alias
export type ProviderConfig = {
  name: AIProviderName;
  model: string;
  options?: ProviderOptions;
};

// AVOID: Interface declaration (legacy example)
export type ProviderConfig = {
  name: AIProviderName;
  model: string;
  options?: ProviderOptions;
};
```

**Rationale:**

- Type aliases support unions, intersections, and mapped types
- Consistent pattern across the entire codebase
- Better TypeScript error messages
- Easier composition with utility types
- Declaration merging (interfaces) is rarely needed

---

## 3. Generic Patterns

### 3.1 Generic Result Types

The `Result<T, E>` pattern provides consistent error handling:

```typescript
// Base result type in common.ts
export type Result<T = unknown, E = ErrorInfo> = {
  success: boolean;
  data?: T;
  error?: E;
};

// Discriminated union variant in typeAliases.ts
export type Result<TData = unknown, TError = StandardError> =
  | { success: true; data: TData }
  | { success: false; error: TError };

// Domain-specific extension
export type ExternalMCPOperationResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  serverId?: string;
  duration?: number;
  metadata?: {
    timestamp: number;
    operation: string;
    [key: string]: JsonValue;
  };
};
```

### 3.2 Generic Tool Types

```typescript
// Generic tool result
export type ToolResult<T = JsonValue | unknown> = Result<
  T,
  ErrorInfo | string
> & {
  success: boolean;
  data?: T | null;
  error?: ErrorInfo | string;
  usage?: ToolResultUsage;
  metadata?: ToolResultMetadata;
};

// Generic tool definition
export type ToolDefinition<TArgs = ToolArgs, TResult = JsonValue> = {
  description: string;
  parameters?: ToolParameterSchema;
  metadata?: ToolMetadata;
  execute: (
    params: TArgs,
    context?: ToolContext,
  ) => Promise<ToolResult<TResult>> | ToolResult<TResult>;
};
```

### 3.3 Generic Function Types

```typescript
// Async function with configurable params and result
export type AsyncFunction<TParams = FunctionParameters, TResult = unknown> = (
  params: TParams,
) => Promise<TResult>;

// Tool execution function with context
export type ToolExecutionFunction<TParams = unknown, TResult = unknown> = (
  params: TParams,
  context?: StandardRecord,
) => Promise<TResult>;

// Transformation function
export type TransformFunction<TInput = unknown, TOutput = unknown> = (
  input: TInput,
) => TOutput;
```

### 3.4 Generic Event Emitter

```typescript
export type TypedEventEmitter<TEvents extends Record<string, unknown>> = {
  on<K extends keyof TEvents>(
    event: K,
    listener: (...args: unknown[]) => void,
  ): TypedEventEmitter<TEvents>;
  emit<K extends keyof TEvents>(event: K, ...args: unknown[]): boolean;
  off<K extends keyof TEvents>(
    event: K,
    listener: (...args: unknown[]) => void,
  ): TypedEventEmitter<TEvents>;
  removeAllListeners<K extends keyof TEvents>(
    event?: K,
  ): TypedEventEmitter<TEvents>;
};
```

### 3.5 Generic Execution Context

```typescript
export type ExecutionContext<T = StandardRecord> = {
  sessionId?: string;
  userId?: string;
  config?: T;
  metadata?: StandardRecord;
  cacheOptions?: CacheOptions;
  fallbackOptions?: FallbackOptions;
  timeoutMs?: number;
  startTime?: number;
};
```

### 3.6 Generic API Response

```typescript
export type ApiResponse<TData = unknown> = {
  success: boolean;
  data?: TData;
  error?: string;
  metadata?: StandardRecord;
};

export type PaginatedResponse<TData = unknown> = ApiResponse<TData> & {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
  };
};
```

### 3.7 Generic Constraints Best Practices

```typescript
// Good: Constrained generic with meaningful bound
export type ToolDef<TArgs extends Record<string, unknown>> = {
  execute: (args: TArgs) => Promise<unknown>;
};

// Good: Generic with sensible default
export type Result<T = unknown, E = ErrorInfo> = {
  success: boolean;
  data?: T;
  error?: E;
};

// Avoid: Over-generic types that lose meaning
// Bad: export type Something<A, B, C, D, E> = { /* ... */ };

// Avoid: Unconstrained generics when constraint is known
// Bad: export type Handler<T> = (data: T) => void;
// Good: export type Handler<T extends JsonValue> = (data: T) => void;
```

---

## 4. Zod Integration

### 4.0 Zod Usage Locations

Zod is used for runtime validation at system boundaries across 25 files:

| Category             | Files                                                                                                                                                                                                                                       | Purpose                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| **Type Definitions** | `types/tools.ts`, `types/typeAliases.ts`, `types/modelTypes.ts`                                                                                                                                                                             | Schema types and aliases                        |
| **SDK Core**         | `neurolink.ts`, `sdk/toolRegistration.ts`                                                                                                                                                                                                   | Initialization and tool registration validation |
| **Providers**        | `providers/googleVertex.ts`, `providers/openRouter.ts`, `providers/litellm.ts`, `providers/huggingFace.ts`, `providers/amazonSagemaker.ts`, `providers/anthropicBaseProvider.ts`, `providers/sagemaker/config.ts`                           | Provider input validation                       |
| **MCP Servers**      | `mcp/factory.ts`, `mcp/servers/agent/directToolsServer.ts`, `mcp/servers/utilities/utilityServer.ts`, `mcp/servers/aiProviders/aiCoreServer.ts`, `mcp/servers/aiProviders/aiWorkflowTools.ts`, `mcp/servers/aiProviders/aiAnalysisTools.ts` | Tool parameter schemas                          |
| **Core Modules**     | `core/modules/ToolsManager.ts`, `core/modules/Utilities.ts`, `core/evaluation.ts`, `core/dynamicModels.ts`                                                                                                                                  | Runtime validation                              |
| **Utilities**        | `utils/schemaConversion.ts`, `agent/directTools.ts`                                                                                                                                                                                         | Schema conversion                               |
| **CLI**              | `cli/commands/config.ts`                                                                                                                                                                                                                    | Configuration validation                        |

### 4.1 Zod Schema Type Aliases

```typescript
// In typeAliases.ts
import type { ZodTypeAny } from "zod";
import type { Schema } from "ai";

// Type alias for Zod schema - prevents infinite type recursion
export type ZodUnknownSchema = ZodTypeAny;

// Union type for schema validation (Zod or AI SDK schema)
export type ValidationSchema = ZodUnknownSchema | Schema<unknown>;

// Optional validation schema
export type OptionalValidationSchema = ValidationSchema | undefined;
```

### 4.2 Schema Inference Pattern

```typescript
import { z } from "zod";

// Define the schema
const ToolArgsSchema = z.object({
  input: z.unknown().optional(),
  data: z.unknown().optional(),
  options: z.unknown().optional(),
});

// Infer the type from schema
export type ToolArgs = z.infer<typeof ToolArgsSchema>;

// Export both for runtime validation and compile-time typing
export { ToolArgsSchema };
```

### 4.3 Tool Parameter Schema Pattern

```typescript
// Support both Zod and JSON Schema for flexibility
export type ToolParameterSchema = ZodUnknownSchema | Record<string, JsonValue>;

// Usage in tool definitions
export type ToolDefinition<TArgs = ToolArgs, TResult = JsonValue> = {
  description: string;
  parameters?: ToolParameterSchema; // Can be Zod schema or JSON Schema
  execute: (
    params: TArgs,
    context?: ToolContext,
  ) => Promise<ToolResult<TResult>>;
};
```

### 4.4 Schema in Generation Options

```typescript
export type GenerateOptions = {
  prompt: string;
  // Zod schema for structured output validation
  schema?: ValidationSchema;
  // OR explicit structured output configuration
  structuredOutput?: {
    schema: ZodUnknownSchema | JSONSchema;
    mode?: "strict" | "flexible";
  };
};
```

### 4.5 Schema Conversion Utilities

```typescript
import { zodToJsonSchema } from "zod-to-json-schema";

// Convert Zod to JSON Schema with OpenAPI 3 target
function convertSchema(schema: ZodUnknownSchema): JSONSchema {
  return zodToJsonSchema(schema, {
    target: "openApi3", // Use openApi3 for better provider compatibility
    $refStrategy: "none", // Inline all references
  });
}
```

### 4.6 Runtime Validation Pattern

```typescript
import { z, ZodError } from "zod";

export function validateToolArgs<T>(schema: z.ZodSchema<T>, args: unknown): T {
  try {
    return schema.parse(args);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error(
        `Validation failed: ${error.errors.map((e) => e.message).join(", ")}`,
      );
    }
    throw error;
  }
}

// Safe validation that returns Result
export function safeValidateToolArgs<T>(
  schema: z.ZodSchema<T>,
  args: unknown,
): Result<T, ZodError> {
  const result = schema.safeParse(args);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
```

---

## 5. Type Guards

### 5.1 Basic Type Guards

```typescript
// In common.ts
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

export function isErrorInfo(value: unknown): value is ErrorInfo {
  return (
    typeof value === "object" &&
    value !== null &&
    "message" in value &&
    typeof (value as ErrorInfo).message === "string"
  );
}
```

### 5.2 Record Type Guards

```typescript
// In typeAliases.ts
export function isStandardRecord(value: unknown): value is StandardRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isJsonRecord(value: unknown): value is JsonRecord {
  return (
    isStandardRecord(value) &&
    Object.values(value).every(
      (val) =>
        val === null ||
        typeof val === "string" ||
        typeof val === "number" ||
        typeof val === "boolean" ||
        Array.isArray(val) ||
        isJsonRecord(val),
    )
  );
}

export function isStringArray(value: unknown): value is StringArray {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}
```

### 5.3 Tool System Type Guards

```typescript
// In tools.ts
export function isToolResult(value: unknown): value is ToolResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    typeof (value as ToolResult).success === "boolean"
  );
}

export function isToolDefinition(value: unknown): value is ToolDefinition {
  return (
    typeof value === "object" &&
    value !== null &&
    "description" in value &&
    "execute" in value &&
    typeof (value as ToolDefinition).description === "string" &&
    typeof (value as ToolDefinition).execute === "function"
  );
}
```

### 5.4 Content Type Guards (Discriminated Unions)

```typescript
// In multimodal.ts
export function isTextContent(content: Content): content is TextContent {
  return content.type === "text";
}

export function isImageContent(content: Content): content is ImageContent {
  return content.type === "image";
}

export function isAudioContent(content: Content): content is AudioContent {
  return content.type === "audio";
}

export function isMultimodalInput(input: unknown): input is MultimodalInput {
  const maybeInput = input as MultimodalInput;
  return !!(
    maybeInput?.images?.length ||
    maybeInput?.csvFiles?.length ||
    maybeInput?.pdfFiles?.length ||
    maybeInput?.files?.length ||
    maybeInput?.content?.length ||
    maybeInput?.audioFiles?.length ||
    maybeInput?.videoFiles?.length
  );
}
```

### 5.5 Safe Error Utilities

```typescript
// In common.ts
export function getErrorMessage(error: unknown): string {
  if (isError(error)) return error.message;
  if (isErrorInfo(error)) return error.message;
  if (typeof error === "string") return error;
  return String(error);
}

export function toErrorInfo(error: unknown): ErrorInfo {
  if (isError(error)) {
    return {
      message: error.message,
      stack: error.stack,
      code: (error as Error & { code?: string }).code,
    };
  }
  if (isErrorInfo(error)) return error;
  return { message: getErrorMessage(error) };
}
```

### 5.6 Type Guard Template

```typescript
/**
 * Type guard to check if value is a [TypeName]
 */
export function is[TypeName](value: unknown): value is [TypeName] {
  return (
    typeof value === "object" &&
    value !== null &&
    // Check required properties
    "requiredProp" in value &&
    typeof (value as [TypeName]).requiredProp === "expectedType" &&
    // Check optional discriminator
    (value as [TypeName]).type === "expectedValue"
  );
}
```

---

## 6. Breaking Change Management

### 6.1 Semantic Versioning for Types

| Change Type             | Version Bump | Example                          |
| ----------------------- | ------------ | -------------------------------- |
| New optional property   | Patch        | `timeout?: number` added         |
| New type export         | Minor        | Export new `ToolMetadata` type   |
| Required property added | **Major**    | `sessionId: string` now required |
| Property type changed   | **Major**    | `id: number` to `id: string`     |
| Property removed        | **Major**    | `legacyField` removed            |
| Type renamed            | **Major**    | `ToolArgs` to `ToolParameters`   |

### 6.2 Deprecation Strategy

````typescript
/**
 * @deprecated Use NewTypeName instead. Will be removed in v9.0.0.
 *
 * Migration guide:
 * - Replace `OldTypeName` with `NewTypeName`
 * - Update property `oldProp` to `newProp`
 *
 * @see NewTypeName
 */
export type OldTypeName = NewTypeName;

// For complex migrations, provide a type alias during transition
/**
 * @deprecated Use ProviderConfig instead.
 *
 * Migration:
 * ```typescript
 * // Before
 * const config: ProviderMultimodalPayload = { ... };
 *
 * // After
 * const config: ProviderConfig = { ... };
 * ```
 */
export type ProviderMultimodalPayload = Omit<ProviderConfig, "newField">;
````

### 6.3 Backward Compatibility Re-exports

```typescript
// content.ts - Re-exports for backward compatibility
/**
 * @deprecated Import from './multimodal.js' instead
 */
export type { TextContent, ImageContent, Content } from "./multimodal.js";

// Runtime function re-exports (not type-only)
export { isTextContent, isImageContent } from "./multimodal.js";
```

### 6.4 Migration Examples from History

**Breaking Change: Input Format (July 2025)**

```typescript
// Before v4.0.0
type GenerateOptions = {
  prompt: string;
};

// After v4.0.0
type GenerateOptions = {
  input: { text: string; images?: Buffer[] };
};

// Migration wrapper for backward compatibility
function migrateOptions(old: { prompt: string }): GenerateOptions {
  return { input: { text: old.prompt } };
}
```

**Breaking Change: Result Access (July 2025)**

```typescript
// Before: result.text
// After: result.content

// Provide getter for backward compatibility
type LegacyResult = GenerateResult & {
  /** @deprecated Use content instead */
  get text(): string;
};
```

### 6.5 Property Simplification

```typescript
// Before: 7 fields (verbose)
type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  promptTokens?: number;
  completionTokens?: number;
  cachedTokens?: number;
  estimatedCost?: number;
};

// After: 3 essential fields (simplified)
type TokenUsage = {
  input: number;
  output: number;
  total: number;
};

// Migration type for consumers that need extended data
type ExtendedTokenUsage = TokenUsage & {
  cached?: number;
  estimatedCost?: number;
};
```

---

## 7. Type Templates

### 7.1 New Feature Type Module Template

````typescript
/**
 * [Feature Name] Types for NeuroLink
 *
 * [Brief description of what this module covers]
 *
 * @module types/[featureName]Types
 *
 * @example Basic usage
 * ```typescript
 * import type { FeatureOptions, FeatureResult } from './types/[featureName]Types.js';
 *
 * const options: FeatureOptions = {
 *   enabled: true,
 *   timeout: 5000,
 * };
 * ```
 */

import type { JsonValue } from "./common.js";
import type { StandardRecord } from "./typeAliases.js";

// ============================================================================
// CONSTANTS AND STATUS TYPES
// ============================================================================

/**
 * [Feature] status states
 */
export type FeatureStatus = "active" | "inactive" | "pending" | "error";

/**
 * [Feature] mode types
 */
export type FeatureMode = "basic" | "advanced" | "custom";

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

/**
 * Configuration options for [Feature]
 */
export type FeatureConfig = {
  /** Whether the feature is enabled */
  enabled?: boolean;

  /** Feature mode */
  mode?: FeatureMode;

  /** Timeout in milliseconds */
  timeout?: number;

  /** Additional metadata */
  metadata?: StandardRecord;
};

// ============================================================================
// INPUT/OPTIONS TYPES
// ============================================================================

/**
 * Options for [Feature] operations
 */
export type FeatureOptions = {
  /** Primary input */
  input: string;

  /** Configuration */
  config?: FeatureConfig;

  /** Custom context */
  context?: Record<string, JsonValue>;
};

// ============================================================================
// OUTPUT/RESULT TYPES
// ============================================================================

/**
 * Result from [Feature] operations
 */
export type FeatureResult = {
  /** Whether operation was successful */
  success: boolean;

  /** Result data */
  data?: unknown;

  /** Error message if failed */
  error?: string;

  /** Feature status */
  status: FeatureStatus;

  /** Operation duration in milliseconds */
  duration?: number;

  /** Additional metadata */
  metadata?: {
    timestamp: number;
    operation: string;
    [key: string]: JsonValue;
  };
};

// ============================================================================
// CONTEXT TYPES
// ============================================================================

/**
 * Execution context for [Feature]
 */
export type FeatureContext = {
  /** Session identifier */
  sessionId?: string;

  /** User identifier */
  userId?: string;

  /** Request identifier */
  requestId?: string;

  /** Additional context data */
  metadata?: StandardRecord;
};

// ============================================================================
// EVENT TYPES
// ============================================================================

/**
 * Events emitted by [Feature]
 */
export type FeatureEvents = {
  /** Emitted when operation starts */
  "feature:start": {
    featureId: string;
    timestamp: number;
  };

  /** Emitted when operation completes */
  "feature:complete": {
    featureId: string;
    result: FeatureResult;
    timestamp: number;
  };

  /** Emitted on error */
  "feature:error": {
    featureId: string;
    error: string;
    timestamp: number;
  };
};

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard to check if value is a FeatureResult
 */
export function isFeatureResult(value: unknown): value is FeatureResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    "status" in value &&
    typeof (value as FeatureResult).success === "boolean"
  );
}

/**
 * Type guard to check if status is valid FeatureStatus
 */
export function isFeatureStatus(value: unknown): value is FeatureStatus {
  return (
    typeof value === "string" &&
    ["active", "inactive", "pending", "error"].includes(value)
  );
}
````

### 7.2 Provider-Specific Types Template

```typescript
/**
 * [Provider Name] Provider Types
 *
 * Provider-specific types for [Provider Name] integration
 */

import type { StandardRecord } from "./typeAliases.js";

// Use namespace for provider-specific types to avoid pollution
export namespace [Provider]Types {
  /**
   * [Provider] client interface
   */
  export type Client = {
    send(command: unknown): Promise<unknown>;
    config: {
      region?: string;
      credentials?: unknown;
    };
  };

  /**
   * [Provider] request options
   */
  export type RequestOptions = {
    modelId: string;
    body: string;
    contentType?: string;
  };

  /**
   * [Provider] response format
   */
  export type Response = {
    body: unknown;
    metadata?: StandardRecord;
  };
}
```

### 7.3 API Options/Result Pair Template

```typescript
/**
 * Options for [Operation] API
 */
export type [Operation]Options = {
  // Required inputs
  input: string;

  // Provider selection
  provider?: AIProviderName;
  model?: string;

  // Behavior configuration
  timeout?: number;
  maxRetries?: number;

  // Feature flags
  enableAnalytics?: boolean;
  enableCaching?: boolean;

  // Advanced options
  metadata?: StandardRecord;
};

/**
 * Result from [Operation] API
 */
export type [Operation]Result = {
  // Core result
  success: boolean;
  data?: unknown;
  error?: string;

  // Performance metrics
  duration?: number;
  tokenUsage?: TokenUsage;

  // Context
  provider: string;
  model: string;
  requestId?: string;

  // Metadata
  metadata?: {
    timestamp: number;
    cached?: boolean;
    [key: string]: JsonValue;
  };
};
```

### 7.4 Event System Template

```typescript
/**
 * Events for [System] lifecycle
 */
export type [System]Events = {
  // Lifecycle events
  "[system]:init": { systemId: string; timestamp: number };
  "[system]:ready": { systemId: string; timestamp: number };
  "[system]:shutdown": { systemId: string; reason?: string; timestamp: number };

  // Operation events
  "[system]:start": { operationId: string; input: unknown; timestamp: number };
  "[system]:progress": { operationId: string; progress: number; timestamp: number };
  "[system]:complete": { operationId: string; result: unknown; timestamp: number };
  "[system]:error": { operationId: string; error: string; timestamp: number };

  // Allow extension
  [key: string]: unknown;
};
```

---

## 8. Common Pitfalls

### 8.1 The `any` Elimination Journey

**Problem:** Heavy `any` usage led to runtime errors and poor tooling.

**Solution (Commit `777c3cd`):** Systematic replacement across 140+ files.

```typescript
// BAD: Loses all type safety
function processData(data: any): any {
  return data.transform();
}

// GOOD: Use unknown for truly unknown data
function processData(data: unknown): unknown {
  if (isTransformable(data)) {
    return data.transform();
  }
  throw new Error("Data is not transformable");
}

// BETTER: Use generics when type is variable but known at call site
function processData<T extends Transformable>(data: T): TransformResult<T> {
  return data.transform();
}
```

**Common Replacements:**

| `any` Usage           | Replacement                        |
| --------------------- | ---------------------------------- |
| `any` parameter       | `unknown` with type guard          |
| `any` return          | Generic `<T>` or specific type     |
| `any[]`               | `unknown[]` or `JsonValue[]`       |
| `Record<string, any>` | `StandardRecord` or `JsonRecord`   |
| `Promise<any>`        | `Promise<unknown>` or `Promise<T>` |

### 8.2 Circular Import Prevention

**Problem:** Type files importing from each other cause circular dependencies.

**Solution:** Layer architecture and enum centralization.

```typescript
// BAD: mcpTypes.ts imports from providers.ts which imports from mcpTypes.ts
// mcpTypes.ts
import { AIProviderName } from "./providers.js"; // Circular!

// GOOD: Both import from constants
// mcpTypes.ts
import { AIProviderName } from "../constants/enums.js";

// providers.ts
import { AIProviderName } from "../constants/enums.js";
```

### 8.3 Index Barrel File Conflicts

**Problem:** Wildcard exports cause name conflicts.

**Solution:** Selective exports with renaming.

```typescript
// BAD: Wildcard exports cause conflicts
export * from "./generateTypes.js"; // exports GenerateResult
export * from "./cli.js"; // also exports GenerateResult - conflict!

// GOOD: Selective exports with renaming
export type {
  GenerateResult as GenerateApiResult, // Renamed to avoid conflict
} from "./generateTypes.js";

export type {
  GenerateResult as CliGenerateResult, // Or rename this one
} from "./cli.js";
```

### 8.4 Optional vs Required Properties

**Problem:** Changing optional to required is a breaking change.

```typescript
// v1.0.0
type Options = {
  timeout?: number; // Optional
};

// v2.0.0 - BREAKING CHANGE!
type Options = {
  timeout: number; // Now required
};

// SOLUTION: Keep optional, provide default in implementation
type Options = {
  /** Timeout in ms. Defaults to 30000 if not provided. */
  timeout?: number;
};

function execute(options: Options) {
  const timeout = options.timeout ?? 30000; // Default value
}
```

### 8.5 Overly Permissive Index Signatures

**Problem:** Index signatures allow any property, losing type safety.

```typescript
// BAD: Completely open
type Metadata = {
  [key: string]: unknown;
};

// BETTER: Known properties with extension
type Metadata = {
  timestamp: number; // Required known property
  operation: string; // Required known property
  [key: string]: JsonValue; // Additional properties
};

// BEST: Intersection pattern
type MCPServerMetadata = {
  [key: string]: JsonValue;
} & {
  provider?: string;
  version?: string;
  author?: string;
  category?: string;
};
```

### 8.6 Generic Default Pitfalls

```typescript
// BAD: Default hides important constraint
type Container<T = any> = { value: T }; // any hides issues

// GOOD: Unknown default preserves safety
type Container<T = unknown> = { value: T };

// BEST: Meaningful constraint with default
type Container<T extends JsonValue = JsonValue> = { value: T };
```

### 8.7 Type Guard False Positives

```typescript
// BAD: Incomplete check
function isToolResult(value: unknown): value is ToolResult {
  return value !== null && typeof value === "object";
}

// GOOD: Complete check
function isToolResult(value: unknown): value is ToolResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    typeof (value as ToolResult).success === "boolean"
  );
}
```

---

## 9. Circular Dependency Prevention

### 9.1 The Root Cause

Circular dependencies in type systems typically occur when:

1. Type A imports Type B
2. Type B imports Type A
3. Both types are needed at module load time

### 9.2 Prevention Strategies

**Strategy 1: Enum Centralization**

Move all enums to a central constants file:

```typescript
// src/lib/constants/enums.ts - No imports from types/
export enum AIProviderName {
  BEDROCK = "bedrock",
  OPENAI = "openai",
}

// src/lib/types/providers.ts
import { AIProviderName } from "../constants/enums.js";

// src/lib/types/mcpTypes.ts
import { AIProviderName } from "../constants/enums.js";
```

**Strategy 2: Layer Architecture**

```
Layer 3 (Domain Types) ──────────────────┐
    ├── providers.ts                      │
    ├── mcpTypes.ts                       │
    └── generateTypes.ts                  │
                                         │
Layer 2 (Common Aliases) ───────┐        │
    └── typeAliases.ts         │        │
                               │        │
Layer 1 (Foundation) ─────────┐│        │
    └── common.ts             ││        │
                              ││        │
Constants (No deps) ──────────┼┼────────┘
    └── enums.ts              ││
                              ││
        ▲                      ││
        │ Import direction     ▼▼
```

**Strategy 3: Interface Segregation**

Split large type files when they become circular:

```typescript
// Before: mcpTypes.ts needs ToolResult from tools.ts
//         tools.ts needs MCPServerInfo from mcpTypes.ts

// After: Extract shared types
// src/lib/types/mcpBaseTypes.ts - Basic MCP types
export type MCPServerInfo = {
  /* ... */
};

// src/lib/types/tools.ts
import type { MCPServerInfo } from "./mcpBaseTypes.js";

// src/lib/types/mcpTypes.ts
export * from "./mcpBaseTypes.js";
// Additional MCP types...
```

**Strategy 4: Dynamic Imports for Runtime**

For runtime circular dependencies (not type-only):

```typescript
// ProviderRegistry uses dynamic imports
ProviderFactory.registerProvider(
  AIProviderName.GOOGLE_AI,
  async (modelName?, _providerName?, sdk?) => {
    // Dynamic import breaks circular dependency
    const { GoogleAIStudioProvider } = await import(
      "../providers/googleAiStudio.js"
    );
    return new GoogleAIStudioProvider(modelName, sdk);
  },
  GoogleAIModels.GEMINI_2_5_FLASH,
);
```

### 9.3 Detection and Debugging

**Use TypeScript's `--traceResolution`:**

```bash
tsc --traceResolution 2>&1 | grep -A 5 "Resolving"
```

**Check for import cycles:**

```bash
# Using madge
npx madge --circular src/lib/types/
```

### 9.4 Dependency Graph Example

```
common.ts
    ↑
typeAliases.ts ──────────────────────┐
    ↑                                │
├───┴───────────────┐               │
│                   │               │
tools.ts      providers.ts    mcpTypes.ts
    ↑               ↑               ↑
    └───────┬───────┴───────────────┘
            │
      generateTypes.ts
            │
      streamTypes.ts
            │
       index.ts (barrel)
```

---

## 10. Migration Strategies

### 10.1 Incremental Type Centralization

The NeuroLink project demonstrates successful incremental migration:

**Phase 1: Foundation (July 2025)**

- Created `common.ts` with base types
- Established naming conventions
- No breaking changes

**Phase 2: Extraction (August-September 2025)**

- Extracted types from implementation files
- Created domain-specific type files
- Maintained backward compatibility exports

**Phase 3: Consolidation (October-November 2025)**

- Centralized enums to constants
- Converted interfaces to type aliases
- Removed duplicate type definitions

**Phase 4: Optimization (December 2025-January 2026)**

- Added Zod integration
- Created sdkTypes.ts for external consumers
- Added deprecation notices

### 10.2 Checklist for Type Migration

```markdown
## Pre-Migration

- [ ] Document current type locations
- [ ] Identify circular dependencies
- [ ] Plan new directory structure
- [ ] Create migration timeline

## During Migration

- [ ] Create new type files with JSDoc
- [ ] Add backward compatibility re-exports
- [ ] Update imports incrementally
- [ ] Run type checking after each change
- [ ] Test affected functionality

## Post-Migration

- [ ] Remove old type locations
- [ ] Update documentation
- [ ] Add deprecation notices
- [ ] Announce breaking changes
- [ ] Update changelog
```

### 10.3 Automated Migration Tools

**Type Location Finder:**

```bash
# Find all type definitions in non-types directories
grep -r "export type\|export interface" src/lib --include="*.ts" \
  | grep -v "src/lib/types/"
```

**Import Update Script:**

```bash
# Update imports from old to new location
find src -name "*.ts" -exec sed -i '' \
  's|from "./oldTypes.js"|from "./types/index.js"|g' {} \;
```

### 10.4 Versioning Type Changes

````typescript
// package.json
{
  "name": "@juspay/neurolink",
  "version": "8.37.0",
  "exports": {
    ".": "./dist/index.js",
    "./types": "./dist/types/index.d.ts" // Dedicated types export
  }
}

// Changelog entry
/**
 * ## [8.37.0] - 2026-01-23
 *
 * ### Changed
 * - Moved `ToolResult` type to `tools.ts`
 * - Renamed `GenerateResult` to `GenerateApiResult` in exports
 *
 * ### Deprecated
 * - `ProviderMultimodalPayload` - use `ProviderConfig` instead
 *
 * ### Migration
 * ```typescript
 * // Before
 * import { GenerateResult } from '@juspay/neurolink/types';
 *
 * // After
 * import { GenerateApiResult } from '@juspay/neurolink/types';
 * ```
 */
````

---

## Summary

NeuroLink's type system follows these key principles:

1. **Domain-Driven Organization**: Types organized by functional domain
2. **Consistent Naming**: Predictable patterns (`*Options`, `*Result`, `*Config`)
3. **Type Aliases Over Interfaces**: Consistent use of type aliases
4. **Generic Flexibility**: Strategic use of generics for reusable types
5. **Zod Integration**: Clean integration for runtime validation
6. **Type Guards**: Comprehensive guards for runtime safety
7. **Enum Centralization**: All enums in `constants/enums.ts`
8. **Layered Architecture**: Strict import direction to prevent cycles
9. **Backward Compatibility**: Re-exports and deprecation notices
10. **Documentation**: JSDoc comments with examples

When implementing new features, follow the templates provided and adhere to the established patterns to maintain consistency across the codebase.

---

_Document created: January 2026_
_Based on analysis of NeuroLink type system evolution (June 2025 - January 2026)_
_Total type files documented: 36_
