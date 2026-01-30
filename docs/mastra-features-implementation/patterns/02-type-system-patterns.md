# NeuroLink TypeScript Type System Patterns

This document provides a comprehensive analysis of NeuroLink's TypeScript type system, including organization patterns, naming conventions, generic patterns, Zod integration, and best practices for extending the type system.

## Table of Contents

1. [Type File Organization](#type-file-organization)
2. [Naming Conventions](#naming-conventions)
3. [Generic Patterns](#generic-patterns)
4. [Zod Integration Patterns](#zod-integration-patterns)
5. [Type Composition Patterns](#type-composition-patterns)
6. [Barrel File and Export Patterns](#barrel-file-and-export-patterns)
7. [Type Guards and Assertions](#type-guards-and-assertions)
8. [Provider Type Definitions](#provider-type-definitions)
9. [Tool Type Definitions](#tool-type-definitions)
10. [Message and Conversation Types](#message-and-conversation-types)
11. [Utility Types and Helpers](#utility-types-and-helpers)
12. [Best Practices for Adding New Types](#best-practices-for-adding-new-types)
13. [Template for New Type Modules](#template-for-new-type-modules)

---

## Type File Organization

### Directory Structure

NeuroLink's type system is organized in `/src/lib/types/` with 36+ type definition files:

```
src/lib/types/
├── index.ts                    # Central barrel file - all exports
├── common.ts                   # Base utility types (Unknown, ErrorInfo, Result)
├── typeAliases.ts              # Reusable type aliases (StandardRecord, ZodUnknownSchema)
├── providers.ts                # Provider-specific types (AIProvider, ProviderStatus)
├── tools.ts                    # Tool system types (ToolDefinition, ToolResult)
├── mcpTypes.ts                 # MCP integration types (MCPServerInfo, MCPToolInfo)
├── externalMcp.ts              # External MCP server types
├── generateTypes.ts            # Generation API types (GenerateOptions, GenerateResult)
├── streamTypes.ts              # Streaming types (StreamOptions, StreamResult)
├── conversation.ts             # Conversation memory types (ChatMessage, SessionMemory)
├── multimodal.ts               # Multimodal content types (Content, ImageContent)
├── content.ts                  # Content types (re-exports from multimodal.ts)
├── analytics.ts                # Analytics types (TokenUsage, AnalyticsData)
├── evaluation.ts               # Evaluation types (EvaluationData, EvaluationContext)
├── configTypes.ts              # Configuration types (NeuroLinkConfig)
├── middlewareTypes.ts          # Middleware types (NeuroLinkMiddleware)
├── guardrails.ts               # Guardrails types (PrecallEvaluationResult)
├── hitlTypes.ts                # Human-in-the-loop types
├── ttsTypes.ts                 # Text-to-speech types
├── pptTypes.ts                 # PowerPoint generation types
├── cli.ts                      # CLI-specific types
├── utilities.ts                # Utility module types (Logger, TimeoutConfig)
├── sdkTypes.ts                 # SDK core types for external developers
├── domainTypes.ts              # Domain configuration types
├── errors.ts                   # Error types
├── serviceTypes.ts             # Service types
├── modelTypes.ts               # Model types
├── contextTypes.ts             # Context types
├── taskClassificationTypes.ts  # Task classification types
├── observability.ts            # Observability types
├── groundingTypes.ts           # Grounding types
├── actionTypes.ts              # Action types
├── fileTypes.ts                # File detection types
├── evaluationTypes.ts          # Extended evaluation types
├── evaluationProviders.ts      # Evaluation provider types
└── universalProviderOptions.ts # Universal provider options
```

### Organization Principles

1. **Domain Separation**: Types are organized by functional domain to avoid circular dependencies
2. **Layered Architecture**: Base types in `common.ts` and `typeAliases.ts`, domain types build on these
3. **Single Responsibility**: Each file focuses on a specific domain or feature area
4. **Re-export Pattern**: `content.ts` re-exports from `multimodal.ts` for backward compatibility

---

## Naming Conventions

### Type Naming Patterns

| Pattern     | Example                                   | Usage                                    |
| ----------- | ----------------------------------------- | ---------------------------------------- |
| `*Options`  | `GenerateOptions`, `StreamOptions`        | Configuration/input types for operations |
| `*Result`   | `GenerateResult`, `ToolResult`            | Output types from operations             |
| `*Config`   | `NeuroLinkConfig`, `RetryConfig`          | Configuration objects                    |
| `*Status`   | `ProviderStatus`, `MCPServerStatus`       | State/status information                 |
| `*Info`     | `MCPToolInfo`, `ExternalMCPToolInfo`      | Descriptive information types            |
| `*Context`  | `ToolContext`, `ExecutionContext`         | Contextual data for operations           |
| `*Metadata` | `MCPServerMetadata`, `ToolResultMetadata` | Additional metadata                      |
| `*Data`     | `AnalyticsData`, `EvaluationData`         | Data structures                          |
| `*Event`    | `StreamEvent`, `ToolExecutionEvent`       | Event payloads                           |
| `*Callback` | `ProgressCallback`                        | Callback function types                  |

### Enum Naming Patterns

```typescript
// Enums use PascalCase with descriptive names
export enum AIProviderName {
  BEDROCK = "bedrock",
  OPENAI = "openai",
  VERTEX = "vertex",
  // ...
}

// Model enums follow Provider + Models pattern
export enum BedrockModels {
  CLAUDE_3_7_SONNET = "anthropic.claude-3-7-sonnet-20250219-v1:0",
  // ...
}
```

### Union Type Naming

```typescript
// Union types use descriptive names ending in "Type" or describing the union
export type MCPTransportType =
  | "stdio"
  | "sse"
  | "websocket"
  | "http"
  | "ws"
  | "tcp"
  | "unix";
export type LogLevel = "debug" | "info" | "warn" | "error";
export type StorageType = "memory" | "redis";
```

---

## Generic Patterns

### 1. Generic Result Types

```typescript
// Base result type with generic data and error
export type Result<T = unknown, E = ErrorInfo> = {
  success: boolean;
  data?: T;
  error?: E;
};

// Operation-specific result extending base
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

### 2. Generic Function Types

```typescript
// Generic async function with configurable params and result
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

### 3. Generic Event Emitter

```typescript
// TypeScript utility for typed EventEmitter
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
  // ...
};
```

### 4. Generic Execution Context

```typescript
// Generic execution context with configurable config type
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

### 5. Generic Tool Definition

```typescript
// Tool definition with generic args and result
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

### 6. Discovered MCP with Generic Tools

```typescript
// Discovered MCP server with generic tools type
export type DiscoveredMcp<TTools = StandardRecord> = {
  metadata: McpMetadata;
  tools?: TTools;
  capabilities?: string[];
  version?: string;
  configuration?: Record<string, string | number | boolean>;
  [key: string]: unknown;
};
```

---

## Zod Integration Patterns

### 1. Zod Schema Type Aliases

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

### 2. Re-exporting Zod Types

```typescript
// In tools.ts
import { z } from "zod";

// Commonly used Zod schema type aliases
export type { ZodUnknownSchema } from "./typeAliases.js";
export type ZodAnySchema = z.ZodSchema<unknown>;
export type ZodObjectSchema = z.ZodObject<z.ZodRawShape>;
export type ZodStringSchema = z.ZodString;
```

### 3. Tool Parameter Schema Pattern

```typescript
// Tool parameter schema supports both Zod and JSON Schema
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

### 4. Schema in Generation Options

```typescript
// In generateTypes.ts
export type GenerateOptions = {
  // ...
  /**
   * Zod schema for structured output validation
   */
  schema?: ValidationSchema;
  // ...
};

export type TextGenerationOptions = {
  // ...
  schema?: ZodUnknownSchema | Schema<unknown>;
  // ...
};
```

---

## Type Composition Patterns

### 1. Intersection Types for Extension

```typescript
// Base type
export type ConversationBase = {
  id: string;
  title: string;
  sessionId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
};

// Extended type using intersection
export type RedisConversationObject = ConversationBase & {
  messages: ChatMessage[];
};

// Further extension
export type ConversationData = RedisConversationObject & {
  metadata?: {
    sessionVariables?: Record<string, string | number | boolean>;
    messageCount?: number;
    [key: string]: unknown;
  };
};
```

### 2. Union Types for Discriminated Content

```typescript
// Content types using discriminated union
export type Content =
  | TextContent
  | ImageContent
  | CSVContent
  | PDFContent
  | AudioContent
  | VideoContent;

// Each content type has a 'type' discriminator
export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image";
  data: Buffer | string;
  altText?: string;
  mediaType?: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
  metadata?: {
    /* ... */
  };
};
```

### 3. Stream Chunk Discriminated Union

```typescript
// Stream chunk using discriminated union for type safety
export type StreamChunk =
  | {
      type: "text";
      content: string;
    }
  | {
      type: "audio";
      audioChunk: TTSChunk;
    };
```

### 4. Index Signatures with Known Properties

```typescript
// Extensible metadata with known properties
export type MCPServerMetadata = {
  [key: string]: JsonValue;
} & {
  provider?: string;
  version?: string;
  author?: string;
  category?: string;
  tags?: string[];
};

// Extensible event types
export type NeuroLinkEvents = {
  "tool:start": unknown;
  "tool:end": unknown;
  "stream:chunk": unknown;
  // ... known events
  [key: string]: unknown; // Allow additional events
};
```

### 5. Pick and Omit Utility Patterns

```typescript
// Runtime MCP server extends MCPServerInfo with additional runtime state
export type RuntimeMCPServerInfo = import("./mcpTypes.js").MCPServerInfo & {
  process: import("child_process").ChildProcess | null;
  client: Client | null;
  transportInstance: Transport | null;
  // ... runtime-specific fields
};
```

### 6. Branded Types for Type Safety

```typescript
// Branded types for validated values
export type NonEmptyString = string & { readonly __brand: unique symbol };
export type PositiveNumber = number & { readonly __brand: unique symbol };
export type Timestamp = number & { readonly __brand: unique symbol };
export type EntityId = string & { readonly __brand: unique symbol };
```

---

## Barrel File and Export Patterns

### Central Index Pattern (`index.ts`)

```typescript
/**
 * Centralized type exports for NeuroLink
 */

// Wildcard exports for complete modules
export * from "./common.js";
export * from "./tools.js";
export * from "./providers.js";

// Selective exports to avoid conflicts
export type {
  GenerateOptions,
  GenerateResult as GenerateApiResult, // Renamed to avoid conflict
  UnifiedGenerationOptions,
} from "./generateTypes.js";

// Named exports from constants
export { AIProviderName } from "../constants/enums.js";

// Explicit type-only exports
export type {
  MCPTransportType,
  MCPServerConnectionStatus,
  // ...
} from "./mcpTypes.js";
```

### Conflict Resolution Patterns

```typescript
// Renaming conflicting types
export type {
  GenerateResult as GenerateApiResult, // Renamed to avoid conflict with cli.js
} from "./generateTypes.js";

export type {
  ToolCall as StreamToolCall, // Renamed to avoid conflict with tools.js
  ToolResult as StreamToolResult,
} from "./streamTypes.js";

export type {
  ErrorInfo as AnalyticsErrorInfo, // Renamed to avoid conflict with common.js
} from "./analytics.js";
```

### SDK Types Barrel (`sdkTypes.ts`)

```typescript
/**
 * NeuroLink SDK Core Types
 * Exposes essential types for external developers
 */

// Priority 1: Core streaming and tool execution
export type {
  StreamResult,
  StreamOptions,
  // ...
} from "./streamTypes.js";

// Priority 2: Event system types
export type { TypedEventEmitter, NeuroLinkEvents } from "./common.js";

// Priority 3: Configuration types
export type { NeuroLinkConfig, ProviderConfig } from "./configTypes.js";
```

### Backward Compatibility Re-exports

```typescript
// content.ts - Re-exports for backward compatibility
/**
 * @deprecated Import from './multimodal.js' instead
 */
export type {
  TextContent,
  ImageContent,
  Content,
  // ...
} from "./multimodal.js";

// Runtime function re-exports (not type-only)
export {
  isTextContent,
  isImageContent,
  // ...
} from "./multimodal.js";
```

---

## Type Guards and Assertions

### 1. Basic Type Guards

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

### 2. Tool System Type Guards

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

### 3. Content Type Guards

```typescript
// In multimodal.ts
export function isTextContent(content: Content): content is TextContent {
  return content.type === "text";
}

export function isImageContent(content: Content): content is ImageContent {
  return content.type === "image";
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

### 4. Record Type Guards

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

### 5. Safe Error Utilities

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

---

## Provider Type Definitions

### Provider Interface Pattern

```typescript
// Core provider interface
export type AIProvider = {
  stream(
    optionsOrPrompt: StreamOptions | string,
    analysisSchema?: ValidationSchema,
  ): Promise<StreamResult>;

  generate(
    optionsOrPrompt: TextGenerationOptions | string,
    analysisSchema?: ValidationSchema,
  ): Promise<EnhancedGenerateResult | null>;

  gen(
    optionsOrPrompt: TextGenerationOptions | string,
    analysisSchema?: ValidationSchema,
  ): Promise<EnhancedGenerateResult | null>;

  setupToolExecutor(
    sdk: {
      customTools: Map<string, unknown>;
      executeTool: (toolName: string, params: unknown) => Promise<unknown>;
    },
    functionTag: string,
  ): void;
};
```

### Provider Status Types

```typescript
export type ProviderStatus = {
  provider: string;
  status: "working" | "failed" | "not-configured";
  configured: boolean;
  authenticated: boolean;
  error?: string;
  responseTime?: number;
  model?: string;
};

export type ProviderHealthStatus =
  | "healthy"
  | "degraded"
  | "unhealthy"
  | "unknown";
```

### Provider-Specific Types (Namespaces)

```typescript
// Amazon Bedrock specific types
export namespace BedrockTypes {
  export type Client = {
    send(command: unknown): Promise<unknown>;
    config: {
      region?: string;
      credentials?: unknown;
    };
  };

  export type InvokeModelCommand = {
    input: {
      modelId: string;
      body: string;
      contentType?: string;
    };
  };
}

// Mistral specific types
export namespace MistralTypes {
  export type Client = {
    chat?: {
      complete?: (options: unknown) => Promise<unknown>;
      stream?: (options: unknown) => AsyncIterable<unknown>;
    };
  };
}
```

### Provider Registration Types

```typescript
export type ProviderFactory = (
  modelName?: string,
  providerName?: string,
  sdk?: unknown,
) => Promise<unknown>;

export type ProviderConstructor = {
  new (modelName?: string, providerName?: string, sdk?: unknown): unknown;
};

export type ProviderRegistration = {
  name: string;
  constructor: ProviderConstructor | ProviderFactory;
  capabilities?: ProviderCapabilities;
  defaultConfig?: IndividualProviderConfig;
};
```

---

## Tool Type Definitions

### Core Tool Types

```typescript
// Base tool arguments
export type BaseToolArgs = {
  [key: string]: JsonValue | undefined;
};

// Extended tool arguments
export type ToolArgs = BaseToolArgs & {
  input?: JsonValue;
  data?: JsonValue;
  options?: JsonValue;
};

// Tool definition with generics
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

### Tool Result Types

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

// Tool execution result with context
export type ToolExecutionResult<T = unknown> = {
  result: T;
  context?: ExecutionContext;
  performance?: {
    duration: number;
    tokensUsed?: number;
    cost?: number;
  };
  validation?: ValidationResult;
  cached?: boolean;
  fallback?: boolean;
};
```

### MCP Tool Types

```typescript
// MCP tool information
export type MCPToolInfo = {
  name: string;
  description: string;
  serverId: string;
  isExternal: boolean;
  isImplemented?: boolean;
  inputSchema?: JsonObject;
  outputSchema?: JsonObject;
  metadata?: MCPToolMetadata;
};

// NeuroLink MCP Tool with execution
export type NeuroLinkMCPTool = {
  name: string;
  description: string;
  category?: string;
  inputSchema?: unknown;
  outputSchema?: unknown;
  isImplemented?: boolean;
  permissions?: string[];
  version?: string;
  metadata?: Record<string, unknown>;
  execute: (
    params: unknown,
    context: NeuroLinkExecutionContext,
  ) => Promise<ToolResult>;
};
```

---

## Message and Conversation Types

### Chat Message Types

```typescript
export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system" | "tool_call" | "tool_result";
  content: string;
  timestamp?: string; // ISO 8601 string
  tool?: string;
  args?: Record<string, unknown>;
  result?: {
    success?: boolean;
    expression?: string;
    result?: unknown;
    type?: string;
    error?: string;
  };
  events?: StreamEventSequence[];
  metadata?: {
    isSummary?: boolean;
    summarizesFrom?: string;
    summarizesTo?: string;
    truncated?: boolean;
    source?: string;
    language?: string;
    confidence?: number;
    timestamp?: number; // Unix epoch milliseconds
    modelUsed?: string;
    thoughtSignature?: string;
    thoughtHash?: string;
    thinkingExpanded?: boolean;
  };
};
```

### Session Memory Types

```typescript
export type SessionMemory = {
  sessionId: string;
  userId?: string;
  title?: string;
  messages: ChatMessage[];
  createdAt: number; // Unix epoch milliseconds
  lastActivity: number;
  summarizedUpToMessageId?: string;
  summarizedMessage?: string;
  tokenThreshold?: number;
  lastTokenCount?: number;
  lastCountedAt?: number;
  metadata?: {
    userRole?: string;
    tags?: string[];
    customData?: Record<string, unknown>;
  };
};
```

### Multimodal Message Types

```typescript
// Content format for multimodal messages
export type MessageContent = {
  type: string;
  text?: string;
  image?: string;
  mimeType?: string;
  [key: string]: unknown;
};

// Extended chat message for multimodal
export type MultimodalChatMessage = {
  role: "user" | "assistant" | "system";
  content: string | MessageContent[];
};
```

---

## Utility Types and Helpers

### Common Utility Types

```typescript
// Type-safe unknown value
export type Unknown = unknown;

// Type-safe records
export type UnknownRecord = Record<string, unknown>;
export type StandardRecord = Record<string, unknown>;
export type StringRecord = Record<string, string>;
export type NumberRecord = Record<string, number>;
export type BooleanRecord = Record<string, boolean>;
export type PrimitiveRecord = Record<string, string | number | boolean>;
export type JsonRecord = Record<string, JsonValue>;

// Arrays
export type UnknownArray = unknown[];
export type StringArray = string[];
export type NumberArray = number[];
export type RecordArray = StandardRecord[];
export type JsonArray = JsonObject[];
```

### Optional Types

```typescript
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type Maybe<T> = T | null | undefined;

export type OptionalStandardRecord = StandardRecord | undefined;
export type OptionalStringRecord = StringRecord | undefined;
export type OptionalJsonRecord = JsonRecord | undefined;
export type OptionalStringArray = StringArray | undefined;
```

### JSON Types

```typescript
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonObject
  | JsonArray;

export type JsonObject = {
  [key: string]: JsonValue;
};

export type JsonArray = JsonValue[];
```

### API Response Types

```typescript
export type ApiResponse<TData = unknown> = {
  success: boolean;
  data?: TData;
  error?: string;
  metadata?: StandardRecord;
};

export type AsyncApiResponse<TData = unknown> = Promise<ApiResponse<TData>>;

export type PaginatedResponse<TData = unknown> = ApiResponse<TData> & {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
  };
};
```

---

## Best Practices for Adding New Types

### 1. Choose the Right File

- **New domain**: Create a new file following naming conventions (`*Types.ts`)
- **Extension of existing domain**: Add to the relevant existing file
- **Cross-cutting utility**: Add to `typeAliases.ts` or `common.ts`

### 2. Follow Naming Conventions

```typescript
// Options for configuration/input
export type NewFeatureOptions = {
  /* ... */
};

// Result for output
export type NewFeatureResult = {
  /* ... */
};

// Config for settings
export type NewFeatureConfig = {
  /* ... */
};

// Status for state
export type NewFeatureStatus = "active" | "inactive" | "pending";
```

### 3. Use Generics Appropriately

```typescript
// Good: Generic where type varies
export type Result<T, E = Error> = { success: boolean; data?: T; error?: E };

// Good: Constrained generic
export type ToolDef<TArgs extends Record<string, unknown>> = {
  execute: (args: TArgs) => Promise<unknown>;
};

// Avoid: Over-generic types that lose meaning
// Bad: export type Something<A, B, C, D, E> = { /* ... */ };
```

### 4. Document with JSDoc

````typescript
/**
 * Configuration for the new feature
 *
 * @example
 * ```typescript
 * const config: NewFeatureConfig = {
 *   enabled: true,
 *   timeout: 5000,
 * };
 * ```
 */
export type NewFeatureConfig = {
  /** Whether the feature is enabled */
  enabled: boolean;
  /** Timeout in milliseconds */
  timeout?: number;
};
````

### 5. Export from Index

```typescript
// In index.ts - add selective exports
export type {
  NewFeatureConfig,
  NewFeatureOptions,
  NewFeatureResult,
} from "./newFeatureTypes.js";

// Or wildcard if no conflicts
export * from "./newFeatureTypes.js";
```

### 6. Add Type Guards

```typescript
// For discriminated unions and runtime checks
export function isNewFeatureResult(value: unknown): value is NewFeatureResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    typeof (value as NewFeatureResult).success === "boolean"
  );
}
```

### 7. Maintain Backward Compatibility

```typescript
// When renaming types
/** @deprecated Use NewTypeName instead */
export type OldTypeName = NewTypeName;

// When moving types to new files
// oldFile.ts
export type { MovedType } from "./newFile.js";
```

---

## Template for New Type Modules

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
 *   // ...
 * };
 * ```
 */

import type { JsonValue, UnknownRecord } from "./common.js";
import type { StandardRecord } from "./typeAliases.js";

// ============================================================================
// CONSTANTS AND ENUMS
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
  metadata?: UnknownRecord;
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

---

## Summary

NeuroLink's type system follows these key principles:

1. **Domain-Driven Organization**: Types are organized by functional domain
2. **Consistent Naming**: Predictable naming patterns (`*Options`, `*Result`, `*Config`)
3. **Generic Flexibility**: Strategic use of generics for reusable types
4. **Zod Integration**: Clean integration with Zod for runtime validation
5. **Type Safety**: Comprehensive type guards and branded types
6. **Extensibility**: Index signatures and intersection types for extension
7. **Documentation**: JSDoc comments with examples
8. **Backward Compatibility**: Re-exports and deprecation warnings

When adding new types, follow the established patterns and use the template provided to ensure consistency across the codebase.
