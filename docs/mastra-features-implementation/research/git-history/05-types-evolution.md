# NeuroLink Type System Evolution Analysis

## Executive Summary

This document analyzes the evolution of NeuroLink's TypeScript type system from June 2025 to January 2026. The type system underwent a major transformation from scattered, ad-hoc type definitions embedded in implementation files to a sophisticated, centralized modular architecture with 36+ dedicated type files. Key milestones include the elimination of all `any` types, adoption of Zod for runtime validation, extraction of enums to constants, and comprehensive type consolidation following enterprise patterns.

---

## Phase 1: Initial Type Definitions (June 2025)

### Commit: `616f79e` - June 4, 2025

**"Complete visual ecosystem + automated NPM publishing workflow"**

The earliest commit in the type history established basic SDK infrastructure. At this stage:

- Types were embedded directly in implementation files
- No centralized type directory existed
- Basic provider and configuration types were inlined
- Type safety was minimal with heavy `any` usage

### Commit: `e1f552f` - June 8, 2025

**"Feat/cli implementation (#5)"**

CLI implementation introduced command-specific types:

- Yargs command module types
- CLI argument interfaces
- Provider selection types
- Basic output formatting types

### Commit: `55eb81a` - June 14, 2025

**"Enhanced multi-provider support with production infrastructure (#16)"**

Expanded provider ecosystem from 6 to 9 providers:

- Hugging Face provider types
- Ollama provider types (local execution)
- Mistral AI provider types
- Provider-specific configuration interfaces
- Early standardization of provider interfaces

**Pattern Established:** Provider-specific types alongside core implementation files.

---

## Phase 2: Type Safety Foundation (July 2025)

### Commit: `74c88d6` - July 6, 2025

**"BREAKING CHANGE: transform NeuroLink into enterprise AI analytics platform"**

Major architectural transformation:

```
Files Changed: 127 files (+20,542 additions, -6,142 deletions)
```

Key type additions:

- Analytics system types (`AnalyticsData`, `TokenUsage`, `PerformanceMetrics`)
- Evaluation framework types (`EvaluationData`, `QualityScore`)
- Enterprise configuration types
- Real-time service types
- Telemetry types (OpenTelemetry integration)

**Breaking Changes:**

- Provider interfaces changed from `{ prompt: string }` to `{ input: { text: string } }`
- Result access changed from `result.text` to `result.content`
- Evaluation properties use Score suffix (`overallScore` vs `overall`)

### Commit: `846e409` - July 13, 2025

**"Complete unified multimodal AI platform architecture with generate/stream unification"**

Unified interface architecture:

```typescript
// Before: Separate generate and streamText interfaces
type GenerateOptions = { prompt: string };
type StreamOptions = { prompt: string; stream: true };

// After: Unified multimodal-ready patterns
type GenerateOptions = {
  input: { text: string; images?: Buffer[] };
  // ... shared options
};
type StreamOptions = GenerateOptions & { streaming?: true };
```

**Key Patterns:**

- Identical parameter structures for generate() and stream()
- Input interface designed for text+image+audio+video expansion
- Unified timeout, analytics, and evaluation support
- Consistent error handling and provider selection logic

### Commit: `b13963a` - July 22, 2025

**"Comprehensive factory pattern architecture with full MCP integration"**

**Breaking Changes:**

- Provider interfaces now use `{ input: { text: string } }` instead of `{ prompt: string }`
- Result access changed from `result.text` to `result.content`

New type files:

- `src/lib/types/common.ts` - Unknown, UnknownRecord, JsonValue utility types
- `src/lib/types/tools.ts` - Tool system types (ToolArgs, ToolResult, ToolDefinition)
- `src/lib/types/providers.ts` - Provider-specific types (ProviderConfig, AnalyticsData)
- `src/lib/types/cli.ts` - CLI command types and interfaces
- `src/lib/types/index.ts` - Centralized type exports

### Commit: `777c3cd` - July 24, 2025

**"feat(types): eliminate all TypeScript any usage across entire codebase"**

**BREAKING CHANGE:** Complete removal of TypeScript `any` types

Affected: 140+ files with systematic type safety improvements

New type patterns introduced:

```typescript
// common.ts - Type-safe unknown handling
export type Unknown = unknown;
export type UnknownRecord = Record<string, unknown>;
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonObject
  | JsonArray;

// Type guards for runtime safety
export function isError(value: unknown): value is Error;
export function isErrorInfo(value: unknown): value is ErrorInfo;
export function getErrorMessage(error: unknown): string;
```

ESLint configuration updated for enhanced type checking.

### Commit: `656d094` - July 31, 2025

**"refactor(structure): standardize all filenames and directories to camelCase"**

**BREAKING CHANGE:** Naming convention standardization

- Renamed 114+ files from kebab-case to camelCase
- Updated 197+ import references across 62 files
- Type file naming aligned with camelCase convention

```
Before: provider-types.ts, mcp-types.ts
After:  providerTypes.ts, mcpTypes.ts
```

---

## Phase 3: Centralized Type Architecture (August-September 2025)

### Commit: `45043cb` - August 17, 2025

**"fix(typescript): eliminate all TypeScript any types for improved type safety"**

New infrastructure files:

```
src/lib/types/typeAliases.ts   (545 lines) - Comprehensive type aliases
src/lib/utils/parameterValidation.ts (773 lines) - Runtime validation
src/lib/utils/transformationUtils.ts (492 lines) - Type transformations
src/lib/utils/typeUtils.ts     (109 lines) - Type guard utilities
```

Key type aliases introduced:

```typescript
// typeAliases.ts
export type ZodUnknownSchema = z.ZodSchema<unknown>;
export type ValidationSchema = z.ZodSchema | Record<string, unknown>;
export type StandardRecord = Record<string, unknown>;
export type StringArray = string[];
```

### Commit: `5db2231` - August 20, 2025

**"refactor(core): replace fragile string-based errors with a type-safe system"**

New error type system:

```typescript
// errors.ts (67 lines)
export type NeuroLinkError = {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
  provider?: string;
  timestamp: Date;
};

export enum ErrorCode {
  PROVIDER_NOT_FOUND = "PROVIDER_NOT_FOUND",
  INVALID_CONFIGURATION = "INVALID_CONFIGURATION",
  AUTHENTICATION_FAILED = "AUTHENTICATION_FAILED",
  // ... 20+ error codes
}
```

### Commit: `945fb47` - September 3, 2025

**"refactor(core): complete core module type extraction and cleanup"**

Major type extraction:

- Removed all type definitions from `src/lib/core/` modules
- Moved analytics, provider, and model types to dedicated type files
- Core modules now contain only implementation logic

Simplified `TokenUsage`:

```typescript
// Before: 7 fields
type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  promptTokens?: number;
  completionTokens?: number;
  cachedTokens?: number;
  estimatedCost?: number;
};

// After: 3 essential fields
type TokenUsage = {
  input: number;
  output: number;
  total: number;
};
```

### Commit: `8359532` - September 4, 2025

**"refactor(types): complete provider and CLI module type consolidation"**

- Consolidated all provider-specific types from `providerSpecific.ts` to `providers.ts`
- Converted 20+ CLI interfaces to type aliases using modern syntax
- Removed unused type imports
- Deleted redundant `mcp.d.ts` declaration file

### Commit: `eea5981` - September 10, 2025

**"refactor(mcp): consolidate all MCP types to centralized locations"**

Extracted 25+ interfaces from local MCP files to centralized locations:

```
src/lib/types/mcpTypes.ts (763 lines)
src/lib/types/tools.ts (extended with ToolImplementation, ToolExecutionOptions)
```

New MCP type categories:

- Transport types (`MCPTransportType`)
- Connection status types (`MCPServerConnectionStatus`)
- Server category types (`MCPServerCategory`, `MCPServerDomainCategory`)
- Tool types (`MCPToolInfo`, `MCPExecutableTool`)
- Circuit breaker types (`CircuitBreakerState`, `CircuitBreakerConfig`)

### Commit: `a6b6916` - September 12, 2025

**"refactor(types): restore centralized type system architecture"**

Fixed problematic revert that had undone type centralization:

- Removed `/src/lib/core/types.ts` (403 lines of duplicate types)
- Enhanced `/src/lib/types/providers.ts` with missing O1 models
- Added `APIVersions` enum and `DEFAULT_MODEL_ALIASES`
- Updated 12 files to use centralized imports

### Commit: `66199c9` - September 21, 2025

**"fix(types): expose core SDK types for external developer integration"**

Created `src/lib/types/sdkTypes.ts` with 110+ essential types:

```typescript
// sdkTypes.ts - External developer integration
export type {
  StreamResult,
  ToolExecutionEvent,
  NeuroLinkConfig,
  ConversationMemoryConfig,
  // ... 110+ types
} from "./...";
```

Updated `package.json` exports for `@juspay/neurolink/types` path.

### Commit: `b99a7f1` - September 30, 2025

**"feat(middleware): implement guardrails pre-call filtering"**

New guardrails type system:

```typescript
// guardrails.ts (128 lines)
export type GuardrailConfig = {
  enabled: boolean;
  rules: GuardrailRule[];
  onViolation: "block" | "warn" | "log";
};

export type GuardrailRule = {
  id: string;
  type: "content" | "token" | "cost" | "rate";
  condition: GuardrailCondition;
  action: GuardrailAction;
};
```

---

## Phase 4: Modular Type Architecture (October-November 2025)

### Commit: `380e458` - October 7, 2025

**"refactor(types): complete Phase 1 modular type architecture migration"**

Moved all types to `types/` module with clear separation:

| Type File        | Purpose                       | Lines |
| ---------------- | ----------------------------- | ----- |
| common.ts        | Utility types, error handling | 232   |
| content.ts       | Multimodal content types      | ~50   |
| contextTypes.ts  | Context and session types     | ~400  |
| conversation.ts  | Chat and memory types         | ~300  |
| providers.ts     | Provider configuration        | ~800  |
| tools.ts         | Tool system types             | ~500  |
| mcpTypes.ts      | MCP integration types         | ~800  |
| generateTypes.ts | Generation options/results    | ~600  |
| streamTypes.ts   | Streaming types               | ~400  |

### Commit: `0e13ba1` - October 27, 2025

**"refactor(types): Centralize type system and extract enums to constants"**

Major refactoring:

1. **Centralized all enums** to `src/lib/constants/enums.ts`:
   - `AIProviderName`
   - `BedrockModels`, `OpenAIModels`, `VertexModels`, `GoogleAIModels`
   - `AnthropicModels`, `APIVersions`
   - `ErrorCategory`, `ErrorSeverity`

2. **Migrated HITL types** from `src/lib/hitl/types.ts` to `src/lib/types/hitlTypes.ts`

3. **Extracted scattered types** to appropriate modules:
   - Model registry types -> `types/modelTypes.ts`
   - Provider health types -> `types/providers.ts`
   - CLI types -> `types/cli.ts`
   - Guardrails types -> `types/guardrails.ts`
   - Utility types -> `types/utilities.ts`

### Commit: `8a7c9cf` - November 5, 2025

**"refactor(types): Convert all interface declarations to type aliases"**

Standardization decision: Type aliases over interfaces

```typescript
// Before: Mixed interface/type declarations
type LogEntry = {
  timestamp: Date;
  level: string;
  message: string;
};

// After: Consistent type alias pattern
type LogEntry = {
  timestamp: Date;
  level: string;
  message: string;
};
```

Converted 7+ interfaces in `utilities.ts`, plus types in `tools.ts` and `common.ts`.

**Rationale:**

- Type aliases are more flexible (unions, intersections, mapped types)
- Consistent pattern across codebase
- Better TypeScript error messages
- Easier to compose with utility types

### Commit: `951159f` - November 27, 2025

**"feat(token-counting): implement comprehensive token counting infrastructure"**

Extended `conversation.ts` with token counting types (112 new lines):

```typescript
type TokenCounter = {
  provider: AIProviderName;
  count: (text: string) => Promise<number>;
  countMessages: (messages: ChatMessage[]) => Promise<number>;
};

type TokenCountResult = {
  input: number;
  output: number;
  total: number;
  cached?: number;
  breakdown?: Record<string, number>;
};
```

### Commit: `fd8d207` - November 27, 2025

**"feat(core): comprehensive multimodal architecture with modular refactoring"**

Added multimodal content types:

```typescript
// content.ts
type AudioContent = {
  type: "audio";
  data: Buffer | string;
  mimeType: string;
  duration?: number;
  transcript?: string;
};

type VideoContent = {
  type: "video";
  data: Buffer | string;
  mimeType: string;
  duration?: number;
  frames?: ImageContent[];
};
```

Added 53 new vision models (GPT-5, Claude 4.x, Llama 4, Gemini 2.0, DeepSeek R1).

---

## Phase 5: TTS and Advanced Features (December 2025)

### Commit: `9204906` - December 3, 2025

**"feat(tts): Add comprehensive TTS type definitions"**

New file `src/lib/types/tts.ts` (773 lines):

```typescript
type TTSOptions = {
  enabled: boolean;
  voice?: string;
  speed?: number;
  pitch?: number;
  format?: "mp3" | "wav" | "ogg" | "flac";
  quality?: "standard" | "premium";
  provider?: "google" | "openai" | "azure";
};

type TTSResult = {
  buffer: Buffer;
  format: string;
  duration: number;
  metadata: TTSMetadata;
};

type TTSVoice = {
  id: string;
  name: string;
  language: string;
  gender?: "male" | "female" | "neutral";
  provider: string;
};
```

### Commit: `90b7595` - December 2, 2025

**"feat(types): deprecate ProviderMultimodalPayload with comprehensive migration guide"**

Deprecation pattern established:

```typescript
// multimodal.ts
/**
 * @deprecated Use provider-specific types instead.
 * Will be removed in v9.0.0
 *
 * Migration examples for 9+ providers provided in docs/MIGRATION.md
 */
export type ProviderMultimodalPayload = {
  // ...
};
```

---

## Phase 6: Latest Developments (January 2026)

### Commit: `7eaa827` - January 6, 2026

**"feat(providers): replace @ai-sdk/google-vertex with native SDKs, fix tools + schema support"**

Zod schema enhancements:

```typescript
// generateTypes.ts
type GenerateOptions = {
  // ... existing fields
  structuredOutput?: {
    schema: z.ZodSchema | JSONSchema;
    mode?: "strict" | "flexible";
  };
};
```

Schema conversion improvements:

- Switch zodToJsonSchema target from `jsonSchema7` to `openApi3`
- Added `ensureNestedSchemaTypes()` for Vertex AI schema validation
- Added `resolveDeepRef()` for complex JSON pointer paths

### Commit: `27b970c` - January 2026

**"feat(ppt): Add Types and Validation for PPT generation"**

New file `src/lib/types/pptTypes.ts`:

```typescript
type PPTOutputOptions = {
  slideCount?: number;
  theme?: "professional" | "creative" | "minimal";
  format?: "pptx" | "pdf";
  includeNotes?: boolean;
};

type PPTGenerationResult = {
  slides: PPTSlide[];
  buffer: Buffer;
  format: string;
  metadata: PPTMetadata;
};
```

---

## Current Type System Architecture (January 2026)

### Type File Inventory

The current type system consists of **36 type files** in `src/lib/types/`:

| File                        | Size   | Purpose                                       |
| --------------------------- | ------ | --------------------------------------------- |
| providers.ts                | 32.7KB | Provider configurations, models, capabilities |
| mcpTypes.ts                 | 25.8KB | MCP integration, servers, tools, OAuth        |
| generateTypes.ts            | 22.6KB | Generation options, results, multimodal       |
| cli.ts                      | 18.9KB | CLI commands, arguments, options              |
| contextTypes.ts             | 16.1KB | Context, sessions, state management           |
| streamTypes.ts              | 15.5KB | Streaming options, chunks, progress           |
| typeAliases.ts              | 13.9KB | Zod schemas, validation, common aliases       |
| conversation.ts             | 13.7KB | Chat messages, memory, history                |
| multimodal.ts               | 12.9KB | Images, video, audio content                  |
| tools.ts                    | 10.6KB | Tool definitions, execution, results          |
| externalMcp.ts              | 10.6KB | External MCP servers, health, events          |
| hitlTypes.ts                | 8.1KB  | Human-in-the-loop workflows                   |
| groundingTypes.ts           | 8.2KB  | Web search grounding types                    |
| fileTypes.ts                | 7.3KB  | File detection, processing, metadata          |
| middlewareTypes.ts          | 6.9KB  | Middleware system types                       |
| modelTypes.ts               | 6.5KB  | Model registry, resolution                    |
| ttsTypes.ts                 | 5.9KB  | Text-to-speech types                          |
| utilities.ts                | 5.8KB  | Logging, retry, enhancement                   |
| actionTypes.ts              | 5.7KB  | GitHub Actions integration                    |
| evaluationTypes.ts          | 5.6KB  | Evaluation, scoring types                     |
| index.ts                    | 5.2KB  | Centralized exports                           |
| configTypes.ts              | 4.9KB  | Configuration options                         |
| common.ts                   | 4.9KB  | Utility types, error handling                 |
| sdkTypes.ts                 | 4.4KB  | External SDK integration                      |
| guardrails.ts               | 3.4KB  | Content filtering types                       |
| pptTypes.ts                 | 2.4KB  | PowerPoint generation                         |
| evaluationProviders.ts      | 2.3KB  | Evaluation provider types                     |
| serviceTypes.ts             | 1.8KB  | Service registration                          |
| domainTypes.ts              | 1.6KB  | Domain configuration                          |
| errors.ts                   | 1.6KB  | Error codes and types                         |
| taskClassificationTypes.ts  | 1.5KB  | Task classification                           |
| observability.ts            | 1.5KB  | Observability types                           |
| evaluation.ts               | 4.0KB  | Evaluation data types                         |
| analytics.ts                | 1.7KB  | Analytics data types                          |
| content.ts                  | 1.2KB  | Content type definitions                      |
| universalProviderOptions.ts | 4.5KB  | Universal provider config                     |

### Type Organization Patterns

```
src/lib/types/
├── index.ts              # Central export hub
├── common.ts             # Base utility types (Unknown, JsonValue, Result)
├── typeAliases.ts        # Zod schemas, validation aliases
│
├── providers.ts          # Provider types (models, capabilities)
├── generateTypes.ts      # Generate API types
├── streamTypes.ts        # Streaming API types
│
├── tools.ts              # Tool system types
├── mcpTypes.ts           # MCP protocol types
├── externalMcp.ts        # External MCP server types
│
├── conversation.ts       # Chat/memory types
├── content.ts            # Multimodal content
├── multimodal.ts         # Multimodal processing
│
├── cli.ts                # CLI-specific types
├── sdkTypes.ts           # External SDK integration
│
├── middleware*.ts        # Middleware system
├── guardrails.ts         # Content filtering
│
├── evaluation*.ts        # Evaluation system
├── analytics.ts          # Analytics system
│
├── ttsTypes.ts           # Text-to-speech
├── pptTypes.ts           # Presentation generation
├── fileTypes.ts          # File processing
│
└── ...                   # Domain-specific types
```

### Constants and Enums

Enums are centralized in `src/lib/constants/enums.ts`:

```typescript
// Provider enumeration
export enum AIProviderName {
  BEDROCK,
  OPENAI,
  OPENAI_COMPATIBLE,
  OPENROUTER,
  VERTEX,
  ANTHROPIC,
  AZURE,
  GOOGLE_AI,
  HUGGINGFACE,
  OLLAMA,
  MISTRAL,
  LITELLM,
  SAGEMAKER,
  AUTO,
}

// Model enumerations (500+ models across providers)
export enum BedrockModels {
  /* 50+ models */
}
export enum OpenAIModels {
  /* 20+ models */
}
export enum VertexModels {
  /* 30+ models */
}
export enum GoogleAIModels {
  /* 20+ models */
}
export enum AnthropicModels {
  /* 15+ models */
}
export enum OpenRouterModels {
  /* Popular models */
}
```

---

## Key Patterns and Decisions

### 1. Type Aliases over Interfaces

**Decision:** Consistently use type aliases instead of interfaces.

**Rationale:**

- Type aliases support unions, intersections, and mapped types
- More consistent pattern across codebase
- Better TypeScript error messages
- Easier composition with utility types

```typescript
// Preferred pattern
type ProviderConfig = {
  name: AIProviderName;
  model: string;
  options?: ProviderOptions;
};

// Instead of
type ProviderConfig = {
  name: AIProviderName;
  model: string;
  options?: ProviderOptions;
};
```

### 2. Zod for Runtime Validation

**Pattern:** Zod schemas for both compile-time types and runtime validation.

```typescript
import { z } from "zod";

// Schema definition
const ToolArgsSchema = z.object({
  input: z.unknown().optional(),
  data: z.unknown().optional(),
  options: z.unknown().optional(),
});

// Type extraction
export type ToolArgs = z.infer<typeof ToolArgsSchema>;

// Runtime validation
export function validateToolArgs(args: unknown): ToolArgs {
  return ToolArgsSchema.parse(args);
}
```

### 3. Generic Result Types

**Pattern:** Generic `Result<T, E>` pattern for consistent error handling.

```typescript
type Result<T = unknown, E = ErrorInfo> = {
  success: boolean;
  data?: T;
  error?: E;
};

type ToolResult<T = JsonValue | unknown> = Result<T, ErrorInfo | string> & {
  success: boolean;
  data?: T | null;
  error?: ErrorInfo | string;
  usage?: ToolResultUsage;
  metadata?: ToolResultMetadata;
};
```

### 4. Type Guards for Runtime Safety

**Pattern:** Type guards alongside type definitions.

```typescript
// Type definition
type ToolResult = {
  success: boolean;
  data?: unknown;
  error?: string;
};

// Type guard
export function isToolResult(value: unknown): value is ToolResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    typeof (value as ToolResult).success === "boolean"
  );
}
```

### 5. Selective Re-exports to Avoid Conflicts

**Pattern:** Named exports to resolve type name conflicts.

```typescript
// index.ts
export type {
  GenerateResult as GenerateApiResult, // Renamed to avoid conflict with cli.js
} from "./generateTypes.js";

export type {
  ToolCall as StreamToolCall, // Renamed for clarity
  ToolResult as StreamToolResult, // Renamed to avoid conflict with tools.js
} from "./streamTypes.js";
```

---

## Breaking Changes Summary

### Version 4.0.0 (July 2025)

- Provider interface: `{ prompt: string }` -> `{ input: { text: string } }`
- Result access: `result.text` -> `result.content`
- Evaluation properties use Score suffix

### Version 5.0.0 (July 2025)

- CLI command unification (removed `agent-generate`)

### Version 6.0.0 (July 2025)

- Complete `any` type elimination
- MCP type consolidation

### Version 7.0.0 (July 2025)

- Filename standardization to camelCase
- Import path updates

### Version 8.0.0 (November 2025)

- Node.js 20+ requirement
- undici v7 API changes

---

## Lessons Learned

### 1. Incremental Type Centralization

The project demonstrates the value of incremental refactoring. Rather than a big-bang rewrite, types were gradually extracted and consolidated over 6+ months, maintaining backward compatibility throughout.

### 2. Type Safety Investment Pays Off

The commitment to eliminating all `any` types (commit `777c3cd`) required significant effort across 140+ files but established a foundation for reliable type inference and tooling support.

### 3. Enum Centralization Benefits

Extracting enums to `constants/enums.ts` (commit `0e13ba1`) simplified imports and prevented circular dependencies between type files.

### 4. Deprecation Strategy

The `ProviderMultimodalPayload` deprecation (commit `90b7595`) shows a mature approach: add @deprecated JSDoc, provide migration guide, maintain functionality until next major version.

### 5. Documentation Alongside Types

Type files consistently include JSDoc comments with examples, making the types self-documenting and improving IDE experience.

---

## Recommendations for Future Development

1. **Continue Type Documentation**: Each type should have JSDoc with usage examples
2. **Maintain Type Guards**: Every discriminated union should have corresponding type guards
3. **Version Type Changes**: Major type changes should align with semantic versioning
4. **Test Types**: Consider using `tsd` or similar for compile-time type testing
5. **Export Strategy**: Continue selective re-exports to manage namespace conflicts

---

## Appendix: Key Commit Timeline

| Date         | Commit    | Description                                        |
| ------------ | --------- | -------------------------------------------------- |
| Jun 4, 2025  | `616f79e` | Initial SDK with embedded types                    |
| Jun 8, 2025  | `e1f552f` | CLI implementation with command types              |
| Jun 14, 2025 | `55eb81a` | Multi-provider expansion (9 providers)             |
| Jul 6, 2025  | `74c88d6` | **BREAKING:** Enterprise platform transformation   |
| Jul 13, 2025 | `846e409` | Unified multimodal architecture                    |
| Jul 22, 2025 | `b13963a` | **BREAKING:** Factory pattern, input format change |
| Jul 24, 2025 | `777c3cd` | **BREAKING:** Eliminate all any types              |
| Jul 31, 2025 | `656d094` | Filename standardization to camelCase              |
| Aug 17, 2025 | `45043cb` | Parameter validation infrastructure                |
| Aug 20, 2025 | `5db2231` | Type-safe error system                             |
| Sep 3, 2025  | `945fb47` | Core module type extraction                        |
| Sep 4, 2025  | `8359532` | Provider and CLI type consolidation                |
| Sep 10, 2025 | `eea5981` | MCP type centralization                            |
| Sep 12, 2025 | `a6b6916` | Restore centralized type architecture              |
| Sep 21, 2025 | `66199c9` | SDK types for external developers                  |
| Sep 30, 2025 | `b99a7f1` | Guardrails type system                             |
| Oct 7, 2025  | `380e458` | Phase 1 modular type architecture                  |
| Oct 27, 2025 | `0e13ba1` | Enum extraction to constants                       |
| Nov 5, 2025  | `8a7c9cf` | Interface to type alias conversion                 |
| Nov 27, 2025 | `951159f` | Token counting types                               |
| Nov 27, 2025 | `fd8d207` | Comprehensive multimodal types                     |
| Dec 2, 2025  | `90b7595` | ProviderMultimodalPayload deprecation              |
| Dec 3, 2025  | `9204906` | TTS type definitions (773 lines)                   |
| Jan 6, 2026  | `7eaa827` | Zod schema enhancements                            |
| Jan 2026     | `27b970c` | PPT generation types                               |

---

_Document generated: January 2026_
_Analysis covers: June 2025 - January 2026_
_Total commits analyzed: 50+_
_Type files documented: 36_
