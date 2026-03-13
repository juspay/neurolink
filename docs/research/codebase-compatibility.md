# Codebase Compatibility Analysis for Dependency Upgrades

This document maps every outdated dependency to its usage within the NeuroLink codebase, identifying specific APIs consumed, files affected, and potential compatibility risks.

---

## 1. AI SDK Core (`ai` 6.0.101 -> latest)

### Files that import from `ai`

| File                                            | Imports Used                                                                                                           |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `src/lib/core/baseProvider.ts`                  | `ModelMessage`, `generateText` (type only), `LanguageModel`, `Tool`                                                    |
| `src/lib/core/modules/GenerationHandler.ts`     | `LanguageModel`, `ModelMessage`, `Tool`, `stepCountIs`, `generateText`, `Output`, `NoObjectGeneratedError`             |
| `src/lib/core/modules/ToolsManager.ts`          | `Tool`, `tool` (as `createAISDKTool`), `jsonSchema`                                                                    |
| `src/lib/core/modules/MessageBuilder.ts`        | `ModelMessage`                                                                                                         |
| `src/lib/middleware/factory.ts`                 | `wrapLanguageModel`, `LanguageModel`                                                                                   |
| `src/lib/middleware/registry.ts`                | `LanguageModelMiddleware`                                                                                              |
| `src/lib/middleware/builtin/guardrails.ts`      | `generateText`, `LanguageModelMiddleware`                                                                              |
| `src/lib/middleware/builtin/analytics.ts`       | `LanguageModelMiddleware`                                                                                              |
| `src/lib/middleware/builtin/autoEvaluation.ts`  | Multiple AI SDK types                                                                                                  |
| `src/lib/providers/anthropic.ts`                | `LanguageModel`, `stepCountIs`, `streamText`, `Tool`                                                                   |
| `src/lib/providers/anthropicBaseProvider.ts`    | `streamText`, `Schema`, `LanguageModel`, `Tool`                                                                        |
| `src/lib/providers/openAI.ts`                   | `LanguageModel`, `stepCountIs`, `streamText`, `Tool`                                                                   |
| `src/lib/providers/googleAiStudio.ts`           | `LanguageModel`, `Schema`, `stepCountIs`, `streamText`, `Tool`                                                         |
| `src/lib/providers/googleVertex.ts`             | `LanguageModel`, `Output`, `Schema`, `streamText`, `Tool`                                                              |
| `src/lib/providers/mistral.ts`                  | `LanguageModel`, `stepCountIs`, `streamText`, `Tool`                                                                   |
| `src/lib/providers/azureOpenai.ts`              | `streamText`, `LanguageModel`, `Tool`                                                                                  |
| `src/lib/providers/litellm.ts`                  | Multiple AI SDK types                                                                                                  |
| `src/lib/providers/openaiCompatible.ts`         | `streamText`, `Schema`, `LanguageModel`, `Tool`                                                                        |
| `src/lib/providers/openRouter.ts`               | Multiple AI SDK types                                                                                                  |
| `src/lib/providers/ollama.ts`                   | Multiple AI SDK types                                                                                                  |
| `src/lib/providers/huggingFace.ts`              | Multiple AI SDK types                                                                                                  |
| `src/lib/providers/amazonSagemaker.ts`          | `Schema`, `LanguageModel`                                                                                              |
| `src/lib/providers/sagemaker/language-model.ts` | Multiple AI SDK types                                                                                                  |
| `src/lib/providers/googleNativeGemini3.ts`      | `Tool`                                                                                                                 |
| `src/lib/utils/messageBuilder.ts`               | `AssistantModelMessage`, `ModelMessage`, `SystemModelMessage`, `UserModelMessage`, `FilePart`, `ImagePart`, `TextPart` |
| `src/lib/utils/videoAnalysisProcessor.ts`       | `ModelMessage`                                                                                                         |
| `src/lib/memory/memoryRetrievalTools.ts`        | `tool`                                                                                                                 |
| `src/lib/agent/directTools.ts`                  | `tool`                                                                                                                 |
| `src/lib/files/fileTools.ts`                    | `tool`                                                                                                                 |
| `src/lib/rag/ragIntegration.ts`                 | `Tool`                                                                                                                 |
| `src/lib/adapters/video/videoAnalyzer.ts`       | `ModelMessage`                                                                                                         |
| `src/lib/types/generateTypes.ts`                | `Schema`, `Tool`, `ToolChoice`, `StepResult`, `LanguageModel`                                                          |
| `src/lib/types/typeAliases.ts`                  | `Schema`                                                                                                               |
| `src/lib/types/guardrails.ts`                   | `LanguageModel`                                                                                                        |
| `src/lib/types/middlewareTypes.ts`              | `LanguageModelMiddleware`                                                                                              |
| `src/lib/types/providers.ts`                    | `Tool`                                                                                                                 |
| `src/lib/types/streamTypes.ts`                  | `Tool`                                                                                                                 |

### Specific APIs Used

- **`generateText()`** - Core generation in `GenerationHandler.ts`, guardrails middleware
- **`streamText()`** - All streaming providers (anthropic, openAI, mistral, azure, google, vertex, litellm, openaiCompatible)
- **`Output`** - Structured output support in `GenerationHandler.ts`, `googleVertex.ts`
- **`NoObjectGeneratedError`** - Error handling in `GenerationHandler.ts`
- **`stepCountIs()`** - Multi-step agent loop control in anthropic, openAI, mistral, google providers
- **`tool()` / `jsonSchema()`** - Tool creation in `ToolsManager.ts`, `memoryRetrievalTools.ts`, `directTools.ts`, `fileTools.ts`
- **`wrapLanguageModel()`** - Middleware composition in `middleware/factory.ts`
- **Message types** (`ModelMessage`, `UserModelMessage`, `SystemModelMessage`, `AssistantModelMessage`, `FilePart`, `ImagePart`, `TextPart`) - Message building throughout

### Compatibility Risk: **MEDIUM**

The `ai` package follows semantic versioning within major versions. Since we're staying within v6.x, APIs should be stable. Key risk areas:

- `stepCountIs()` behavior changes could affect multi-step tool calling
- `Output` structured output API changes
- Message type shapes (FilePart, ImagePart, TextPart) could evolve
- `wrapLanguageModel` middleware API

### Files needing changes if upgrade breaks:

Primary: `GenerationHandler.ts`, `ToolsManager.ts`, `middleware/factory.ts`, all provider `stream()` implementations.

---

## 2. `@ai-sdk/anthropic` (3.0.47 -> latest)

### Files

- `src/lib/providers/anthropic.ts` - `import { createAnthropic }`
- `src/lib/providers/anthropicBaseProvider.ts` - `import { createAnthropic }`

### APIs Used

- `createAnthropic({ apiKey, fetch })` - Provider factory with custom fetch for proxy support
- `anthropic(modelName)` - Model instance creation (returns `LanguageModel`)

### Compatibility Risk: **LOW**

Simple factory pattern usage. The `createAnthropic` factory API has been stable. Only risk is if `fetch` option signature changes.

---

## 3. `@ai-sdk/openai` (3.0.34 -> latest)

### Files

- `src/lib/providers/openAI.ts` - `import { createOpenAI }`
- `src/lib/providers/huggingFace.ts` - `import { createOpenAI }` (OpenAI-compatible endpoint)
- `src/lib/providers/litellm.ts` - `import { createOpenAI }` (OpenAI-compatible endpoint)
- `src/lib/providers/openaiCompatible.ts` - `import { createOpenAI }` (generic compatible)

### APIs Used

- `createOpenAI({ apiKey, fetch, baseURL, compatibility })` - Provider factory
- `openai(modelName)` - Model instance creation

### Compatibility Risk: **LOW**

Same factory pattern. 4 files use it but all follow the same pattern. The `compatibility: "compatible"` option used in litellm/huggingface is important to preserve.

---

## 4. `@ai-sdk/azure` (3.0.35 -> latest)

### Files

- `src/lib/providers/azureOpenai.ts` - `import { createAzure }`

### APIs Used

- `createAzure({ resourceName, apiKey, apiVersion, fetch })` - Azure-specific factory
- `azureProvider(deployment)` - Model instance creation

### Compatibility Risk: **LOW**

Standard factory pattern. Azure-specific options (`resourceName`, `apiVersion`) are Azure SDK conventions.

---

## 5. `@ai-sdk/google` (3.0.31 -> latest)

### Files

- `src/lib/providers/googleAiStudio.ts` - `import { createGoogleGenerativeAI }`

### APIs Used

- `createGoogleGenerativeAI({ apiKey })` - Google AI Studio factory (no custom fetch passed)
- `google(modelName, { structuredOutputs })` - Model instance with structured output flag

### Compatibility Risk: **LOW**

Standard factory pattern. Note: Google AI Studio provider doesn't pass `fetch` option (unlike other providers).

---

## 6. `@ai-sdk/google-vertex` (4.0.63 -> latest)

### Files

- `src/lib/providers/googleVertex.ts`

### APIs Used

```typescript
import {
  createVertex,
  type GoogleVertexProviderSettings,
} from "@ai-sdk/google-vertex";
import {
  createVertexAnthropic,
  type GoogleVertexAnthropicProviderSettings,
} from "@ai-sdk/google-vertex/anthropic";
```

- `createVertex({ project, location, googleAuthOptions, fetch })` - Vertex AI factory
- `createVertexAnthropic({ project, location, googleAuthOptions })` - Vertex Anthropic sub-provider
- `vertex(modelName, { structuredOutputs })` - Model instance creation

### Compatibility Risk: **MEDIUM**

Uses both Vertex AI and Vertex Anthropic sub-providers. The `@ai-sdk/google-vertex/anthropic` sub-path import is a less common pattern that could change. Also uses `GoogleVertexProviderSettings` and `GoogleVertexAnthropicProviderSettings` types.

---

## 7. `@ai-sdk/mistral` (3.0.12 -> latest)

### Files

- `src/lib/providers/mistral.ts` - `import { createMistral }`
- `src/lib/factories/providerRegistry.ts` - `import type { MistralProvider as MistralProviderType }` (type-only import)

### APIs Used

- `createMistral({ apiKey, fetch })` - Mistral factory with custom fetch
- `mistral(modelName)` - Model instance creation

### Compatibility Risk: **LOW**

Standard factory pattern. The type-only import in `providerRegistry.ts` is only used for typing purposes.

---

## 8. `@ai-sdk/provider` (3.0.8 -> latest)

### Files

- `src/lib/types/evaluationTypes.ts` - `import type { LanguageModelV3CallOptions }`

### APIs Used

- `LanguageModelV3CallOptions` type - Used in evaluation/scoring type definitions

### Compatibility Risk: **LOW-MEDIUM**

Type-only import. Risk is that `LanguageModelV3CallOptions` could be renamed or restructured in newer versions of the provider package (e.g., V4 introduction).

---

## 9. `@aws-sdk/client-bedrock` (3.998.0 -> latest)

### Files

- `src/lib/providers/amazonBedrock.ts`

### APIs Used

```typescript
import {
  BedrockClient,
  ListFoundationModelsCommand,
} from "@aws-sdk/client-bedrock";
```

- `BedrockClient` - For listing available foundation models
- `ListFoundationModelsCommand` - Discovery command

### Compatibility Risk: **LOW**

These are stable, high-level AWS SDK v3 commands. AWS maintains backward compatibility within v3.

---

## 10. `@aws-sdk/client-bedrock-runtime` (3.998.0 -> latest)

### Files

- `src/lib/providers/amazonBedrock.ts`

### APIs Used

```typescript
import type {
  Tool as BedrockTool,
  ContentBlock,
  ConverseCommandInput,
  ConverseCommandOutput,
  ConverseStreamCommandInput,
  Message,
  ToolConfiguration,
  ToolSpecification,
} from "@aws-sdk/client-bedrock-runtime";
import {
  BedrockRuntimeClient,
  ConverseCommand,
  ConverseStreamCommand,
  ImageFormat,
} from "@aws-sdk/client-bedrock-runtime";
```

- `BedrockRuntimeClient` - Main runtime client
- `ConverseCommand` / `ConverseStreamCommand` - The Converse API (newer, unified API)
- `ImageFormat` enum - For multimodal image handling
- Various types for tool calling: `Tool`, `ContentBlock`, `ToolConfiguration`, `ToolSpecification`

### Compatibility Risk: **LOW**

Uses the Converse API which is AWS's modern, unified interface. Stable within AWS SDK v3. Types are well-established.

---

## 11. `@aws-sdk/client-sagemaker` (3.998.0 -> latest)

### Files

- `src/cli/factories/sagemakerCommandFactory.ts`

### APIs Used

```typescript
import {
  SageMakerClient,
  ListEndpointsCommand,
  type EndpointSummary,
} from "@aws-sdk/client-sagemaker";
```

- `SageMakerClient` - For endpoint discovery in CLI
- `ListEndpointsCommand` - List SageMaker endpoints
- `EndpointSummary` type

### Compatibility Risk: **LOW**

Standard AWS SDK v3 usage. Only used in CLI for endpoint discovery.

---

## 12. `@aws-sdk/client-sagemaker-runtime` (3.998.0 -> latest)

### Files

- `src/lib/providers/sagemaker/client.ts`

### APIs Used

```typescript
import {
  SageMakerRuntimeClient as AWSClient,
  InvokeEndpointCommand,
  InvokeEndpointWithResponseStreamCommand,
  type InvokeEndpointCommandInput,
  type InvokeEndpointWithResponseStreamCommandInput,
  type InvokeEndpointCommandOutput,
  type InvokeEndpointWithResponseStreamCommandOutput,
} from "@aws-sdk/client-sagemaker-runtime";
```

- `SageMakerRuntimeClient` - Runtime inference client
- `InvokeEndpointCommand` - Synchronous inference
- `InvokeEndpointWithResponseStreamCommand` - Streaming inference

### Compatibility Risk: **LOW**

Standard AWS SDK v3 usage. These are stable, well-established commands. Custom `requestHandler` configuration used (keepAlive, maxSockets, requestTimeout).

---

## 13. `@google/genai` (1.42.0 -> 1.43.x)

### Files

- `src/lib/providers/googleAiStudio.ts` - Dynamic import: `await import("@google/genai")`
- `src/lib/providers/googleVertex.ts` - Dynamic import: `await import("@google/genai")`
- `src/lib/adapters/video/videoAnalyzer.ts` - Named import: `const { GoogleGenAI } = await import("@google/genai")`
- `src/lib/providers/googleNativeGemini3.ts` - Type definitions for native genai SDK types (no direct import)
- `src/lib/types/providers.ts` - Type definition: `GoogleGenAIClass`

### APIs Used

- `new GoogleGenAI({ apiKey })` - Client creation (AI Studio)
- `new GoogleGenAI({ vertexai: true, project, location })` - Client creation (Vertex AI)
- `client.models.generateContent({ model, config, contents })` - Non-streaming generation
- `client.models.generateContentStream({ model, config, contents })` - Streaming generation
- `client.live.connect({ model, config })` - Live/real-time API (Gemini Live)
- `response.text` - Response text extraction

### Compatibility Risk: **LOW-MEDIUM**

Minor version bump (1.42 -> 1.43). All usage goes through dynamic import. Key concern:

- The `client.live.connect()` API for Gemini Live is relatively new and may evolve
- The `vertexai: true` constructor option for Vertex AI configuration
- `thought_signature` handling in multi-turn tool calling (Gemini 3 specific)

### Files needing changes if upgrade breaks:

`googleAiStudio.ts`, `googleVertex.ts`, `videoAnalyzer.ts`

---

## 14. `undici` (>=7.18.2 -> 7.22.x)

### Files

- `src/lib/utils/messageBuilder.ts` - `import { getGlobalDispatcher, interceptors, request } from "undici"`
- `src/lib/utils/fileDetector.ts` - `import { getGlobalDispatcher, interceptors, request } from "undici"`
- `src/lib/proxy/proxyFetch.ts` - `import type { ProxyAgent } from "undici"` + dynamic `import("undici")`

### APIs Used

- `request(url, { dispatcher, headers })` - HTTP requests for URL file fetching
- `getGlobalDispatcher()` - Get global dispatcher for composing interceptors
- `interceptors.redirect({ maxRedirections: 5 })` - Follow redirects
- `getGlobalDispatcher().compose(interceptors.redirect(...))` - Compose dispatcher with redirect support
- `ProxyAgent` - Proxy support for HTTP/HTTPS proxies (dynamically imported)
- `new ProxyAgent(proxyUrl)` - Create proxy agent

### Compatibility Risk: **LOW-MEDIUM**

The `interceptors` API and `compose()` method on dispatchers are relatively newer undici APIs. The `getGlobalDispatcher().compose()` pattern could potentially change. However, within v7.x this should be stable.

### Files needing changes if upgrade breaks:

`messageBuilder.ts`, `fileDetector.ts`, `proxyFetch.ts`

---

## 15. `hono` (4.12.2 -> 4.12.3)

### Files

- `src/lib/server/adapters/honoAdapter.ts`

### APIs Used

```typescript
import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { logger as honoLogger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { streamSSE } from "hono/streaming";
import { timeout } from "hono/timeout";
import type { Context as HonoContext, Next } from "hono";
```

- `new Hono()` - App creation
- `cors()` middleware
- `HTTPException` - Error handling
- `honoLogger()` - Request logging
- `secureHeaders()` - Security headers middleware
- `streamSSE()` - Server-sent events streaming
- `timeout()` - Request timeout middleware

### Compatibility Risk: **VERY LOW**

Patch version bump (4.12.2 -> 4.12.3). All APIs used are well-established Hono middleware. No breaking changes expected.

---

## 16. TypeScript (5.0.0 -> 5.9.x)

### Configuration Files

- `tsconfig.json` - Extends `.svelte-kit/tsconfig.json`, strict mode, ESM
- `tsconfig.cli.json` - Extends `tsconfig.json`, NodeNext module resolution

### Current Compiler Options

```json
{
  "allowJs": true,
  "checkJs": true,
  "esModuleInterop": true,
  "forceConsistentCasingInFileNames": true,
  "resolveJsonModule": true,
  "skipLibCheck": true,
  "sourceMap": true,
  "strict": true,
  "noImplicitReturns": true,
  "allowSyntheticDefaultImports": true,
  "module": "NodeNext", // CLI config
  "moduleResolution": "NodeNext" // CLI config
}
```

### Compatibility Risk: **LOW-MEDIUM**

TypeScript 5.0 -> 5.9 is a significant version jump, but TypeScript generally maintains backward compatibility. Key considerations:

- **New strict checks**: TS 5.9 may flag issues not caught in 5.0 (stricter type narrowing, isolated declarations)
- **`--module NodeNext`**: This is stable and well-supported in TS 5.9
- **No deprecated features used**: The tsconfig uses standard, modern options
- **`skipLibCheck: true`**: This protects against issues in `.d.ts` files from dependencies
- **Potential new features**: TS 5.9 adds support for `--isolatedDeclarations`, new `satisfies` improvements, etc. - none required but available

### Files needing changes if upgrade breaks:

All `.ts` files potentially, but most likely issues would surface in strict type checking. Run `pnpm run check` after upgrade.

---

## 17. `tslib` (2.4.1 -> 2.8.x)

### Usage

- Listed in `devDependencies` only (not a runtime dependency)
- No direct imports found in `src/` - tslib is used as a TypeScript compilation helper
- `importHelpers` is NOT set in tsconfig, so tslib may not actually be used at all

### Compatibility Risk: **VERY LOW**

tslib is a runtime helper library for TypeScript. Since `importHelpers` is not enabled in tsconfig, and it's only a devDependency, upgrading is risk-free. The 2.4 -> 2.8 jump only adds helpers for newer TS features.

---

## 18. OpenTelemetry Packages

### `@opentelemetry/sdk-node` (0.212.0 -> latest)

### `@opentelemetry/resources` (2.5.1 -> latest)

### `@opentelemetry/core` (2.5.1 -> latest)

### `@opentelemetry/semantic-conventions` (1.39.0 -> latest)

### `@opentelemetry/auto-instrumentations-node` (0.70.1 -> latest)

### Files

- `src/lib/telemetry/telemetryService.ts`
- `src/lib/services/server/ai/observability/instrumentation.ts`
- `src/lib/types/observability.ts`

### APIs Used

```typescript
// telemetryService.ts
import { NodeSDK } from "@opentelemetry/sdk-node";
import {
  metrics,
  trace,
  type Meter,
  type Tracer,
  type Counter,
  type Histogram,
} from "@opentelemetry/api";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";

// instrumentation.ts
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import type { Span, SpanProcessor } from "@opentelemetry/sdk-trace-base";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { trace } from "@opentelemetry/api";
import { LangfuseSpanProcessor } from "@langfuse/otel";

// observability.ts
import type { AttributeValue } from "@opentelemetry/api";
```

### Compatibility Risk: **LOW-MEDIUM**

OpenTelemetry has been stabilizing its API. Key considerations:

- `resourceFromAttributes` is the new API (replaced `Resource` constructor) - already using the modern API
- `ATTR_SERVICE_NAME` / `ATTR_SERVICE_VERSION` are stable semantic conventions
- `NodeSDK` configuration may have minor API changes between minor versions
- `getNodeAutoInstrumentations` configuration options may evolve
- All OTel packages should be upgraded together to maintain version compatibility

### Peer Dependencies (also need version alignment):

```json
"@opentelemetry/api": "^1.9.0",
"@opentelemetry/sdk-trace-base": "^2.5.1",
"@opentelemetry/sdk-trace-node": "^2.5.1"
```

---

## 19. `@langfuse/otel` (4.6.1 -> latest)

### Files

- `src/lib/services/server/ai/observability/instrumentation.ts`

### APIs Used

- `LangfuseSpanProcessor` - OpenTelemetry span processor for Langfuse

### Compatibility Risk: **LOW**

Single-purpose import. Langfuse maintains backward compatibility for their OTel integration.

---

## Summary: Risk Matrix

| Package                             | Risk       | Reason                                            |
| ----------------------------------- | ---------- | ------------------------------------------------- |
| `ai` (core SDK)                     | MEDIUM     | Heavy usage across 30+ files, many APIs           |
| `@ai-sdk/anthropic`                 | LOW        | Simple factory pattern                            |
| `@ai-sdk/openai`                    | LOW        | Simple factory pattern, 4 files                   |
| `@ai-sdk/azure`                     | LOW        | Simple factory pattern                            |
| `@ai-sdk/google`                    | LOW        | Simple factory pattern                            |
| `@ai-sdk/google-vertex`             | MEDIUM     | Dual sub-provider, `/anthropic` sub-path          |
| `@ai-sdk/mistral`                   | LOW        | Simple factory pattern                            |
| `@ai-sdk/provider`                  | LOW-MEDIUM | Type-only import, version-specific type name      |
| `@aws-sdk/client-bedrock`           | LOW        | Stable AWS SDK v3                                 |
| `@aws-sdk/client-bedrock-runtime`   | LOW        | Stable Converse API                               |
| `@aws-sdk/client-sagemaker`         | LOW        | CLI-only, simple operations                       |
| `@aws-sdk/client-sagemaker-runtime` | LOW        | Stable invoke commands                            |
| `@google/genai`                     | LOW-MEDIUM | Minor bump, but uses Live API                     |
| `undici`                            | LOW-MEDIUM | Uses newer `interceptors`/`compose` APIs          |
| `hono`                              | VERY LOW   | Patch version bump                                |
| TypeScript                          | LOW-MEDIUM | Major version jump, may surface new strict errors |
| `tslib`                             | VERY LOW   | Dev dependency, possibly unused                   |
| OpenTelemetry suite                 | LOW-MEDIUM | Multiple packages, need version alignment         |
| `@langfuse/otel`                    | LOW        | Single import                                     |

---

## Recommended Upgrade Order

1. **VERY LOW risk first** (can batch): `hono`, `tslib`
2. **LOW risk** (batch by group):
   - AWS SDK packages (all 4 together)
   - AI SDK provider packages (`@ai-sdk/anthropic`, `@ai-sdk/openai`, `@ai-sdk/azure`, `@ai-sdk/google`, `@ai-sdk/mistral`)
   - `@langfuse/otel`
3. **LOW-MEDIUM risk** (test carefully):
   - `@google/genai` (1.42 -> 1.43)
   - `undici` (7.18 -> 7.22)
   - `@ai-sdk/provider`
   - OpenTelemetry packages (all together)
4. **MEDIUM risk** (test extensively):
   - `ai` core SDK (affects 30+ files)
   - `@ai-sdk/google-vertex` (dual sub-provider)
   - TypeScript (5.0 -> 5.9, run full type check)

## Key Testing Commands After Upgrade

```bash
# Type checking (catches TypeScript upgrade issues)
pnpm run check

# Full test suite
pnpm test

# Provider-specific tests
pnpm run test:providers

# CLI tests (catches SageMaker CLI changes)
pnpm run test:cli

# Integration tests
pnpm run test:integration

# Build validation
pnpm run build:complete
```
