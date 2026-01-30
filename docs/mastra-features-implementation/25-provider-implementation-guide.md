# Comprehensive Provider Implementation Guide

> **Document Type:** Implementation Guide
> **Last Updated:** 2026-01-23
> **Scope:** Complete guide for implementing new AI providers in NeuroLink

This guide synthesizes lessons from NeuroLink's provider evolution, current architecture patterns, and Vercel AI SDK best practices to provide a definitive reference for provider implementation.

---

## Table of Contents

1. [Provider Evolution Lessons](#1-provider-evolution-lessons)
2. [Factory + Registry Pattern](#2-factory--registry-pattern)
3. [BaseProvider Consolidation](#3-baseprovider-consolidation)
4. [Streaming Implementation](#4-streaming-implementation)
5. [Tool Support Patterns](#5-tool-support-patterns)
6. [Multimodal Support](#6-multimodal-support)
7. [Native SDK Migration](#7-native-sdk-migration)
8. [Provider Templates](#8-provider-templates)
9. [Complete Provider Addition Checklist](#9-complete-provider-addition-checklist)
10. [Testing Requirements](#10-testing-requirements)
11. [Common Pitfalls and Solutions](#11-common-pitfalls-and-solutions)

---

## 1. Provider Evolution Lessons

NeuroLink's provider system evolved through **four distinct phases** over approximately 8 months (June 2025 - January 2026), each providing valuable lessons for future implementations.

### Phase 1: Foundation (June 2025)

**Initial State:**

- 3 core providers: OpenAI, Bedrock, Vertex
- Direct `@ai-sdk/*` package integration
- No shared base class
- Individual streaming implementations per provider

**Key Lessons:**

- Start with `@ai-sdk/*` packages for rapid prototyping
- Direct implementations are acceptable for initial development
- Focus on getting the core interface right before optimization

```typescript
// Phase 1 Pattern: Direct @ai-sdk integration
import { createGoogleAI } from "@ai-sdk/google";

export class GoogleAIStudioProvider {
  private client;

  constructor(modelName?: string) {
    this.client = createGoogleAI({ apiKey: process.env.GOOGLE_API_KEY });
    this.model = this.client(modelName || "gemini-2.0-flash");
  }
}
```

### Phase 2: Rapid Expansion (June 2025)

**Growth:**

- Expanded from 3 to 9 providers in a single PR
- Added: Hugging Face, Ollama, Mistral, Anthropic, Azure

**Key Lessons:**

- Once patterns are established, multiple providers can be added simultaneously
- All providers should follow identical structure:
  1. Import from `@ai-sdk/*` package
  2. Implement `AIProvider` interface
  3. Expose `generate()` and `stream()` methods

**Pattern Recognition:**

```
Adding 5 providers in single PR = mature patterns established
├── Each follows same import pattern
├── Each implements same interface
└── Each exposes same methods
```

### Phase 3: Factory Pattern Architecture (July 2025)

**Major Refactoring:**

- 245 files changed (+20,244/-14,992 lines)
- Introduced `BaseProvider` inheritance model
- Implemented `ProviderFactory` with registration pattern
- Added dynamic imports to break circular dependencies

**Key Lessons:**

- Factory pattern eliminates switch statements
- Dynamic imports are **critical** for circular dependency prevention
- Registration-based patterns improve extensibility

**Before (Anti-pattern):**

```typescript
// AVOID: Switch statement pattern
function getProvider(name: string) {
  switch (name) {
    case "openai":
      return new OpenAIProvider();
    case "anthropic":
      return new AnthropicProvider();
    // Growing switch statement = maintenance burden
  }
}
```

**After (Factory pattern):**

```typescript
// CORRECT: Factory registration pattern
ProviderFactory.registerProvider(
  AIProviderName.OPENAI,
  async (modelName?, _providerName?, sdk?) => {
    const { OpenAIProvider } = await import("../providers/openAI.js");
    return new OpenAIProvider(modelName, sdk);
  },
  OpenAIModels.GPT_4O,
  ["gpt", "chatgpt"],
);
```

### Phase 4: BaseProvider Consolidation (August 2025)

**Optimization:**

- 21 files changed (+689/-410 lines)
- 55-65% code reduction across all providers
- 6 consolidated methods replacing ~1,500 lines of duplicated code

**Key Lessons:**

- Consolidate common logic to base class
- Remove hardcoded restrictions
- Standardize defaults (e.g., `maxSteps=10`)
- Use composition for modules (MessageBuilder, StreamHandler, etc.)

**Composition Modules:**

```typescript
// BaseProvider uses composition for specialized concerns
this.messageBuilder = new MessageBuilder(this.providerName, this.modelName);
this.streamHandler = new StreamHandler(this.providerName, this.modelName);
this.generationHandler = new GenerationHandler(...);
this.telemetryHandler = new TelemetryHandler(...);
this.utilities = new Utilities(...);
this.toolsManager = new ToolsManager(...);
```

---

## 2. Factory + Registry Pattern

The Factory + Registry pattern is the **foundation** of NeuroLink's provider architecture. Understanding it is essential for adding new providers.

### Architecture Overview

```
src/lib/
├── core/
│   └── baseProvider.ts          # Abstract base class for all providers
├── factories/
│   ├── providerFactory.ts       # Central factory for creating providers
│   └── providerRegistry.ts      # Registers all providers with factory functions
└── providers/                   # Individual provider implementations
```

### ProviderFactory (`src/lib/factories/providerFactory.ts`)

The factory maintains three maps:

```typescript
export class ProviderFactory {
  // Map of provider names to factory functions
  private static providers: Map<
    AIProviderName,
    (
      modelName?: string,
      providerName?: string,
      sdk?: NeuroLink,
    ) => Promise<AIProvider>
  > = new Map();

  // Map of aliases to canonical provider names
  private static providerAliases: Map<string, AIProviderName> = new Map();

  // Map of provider names to default models
  private static defaultModels: Map<AIProviderName, string> = new Map();

  // Registration method
  static registerProvider(
    name: AIProviderName,
    factory: (
      modelName?: string,
      providerName?: string,
      sdk?: NeuroLink,
    ) => Promise<AIProvider>,
    defaultModel: string,
    aliases?: string[],
  ): void {
    /* ... */
  }

  // Creation method (uses registered factory)
  static async createProvider(
    nameOrAlias: string,
    modelName?: string,
    sdk?: NeuroLink,
  ): Promise<AIProvider> {
    /* ... */
  }
}
```

### ProviderRegistry (`src/lib/factories/providerRegistry.ts`)

Registers all providers at startup:

```typescript
export class ProviderRegistry {
  static registerAllProviders(): void {
    // OpenAI
    ProviderFactory.registerProvider(
      AIProviderName.OPENAI,
      async (modelName?, _providerName?, sdk?) => {
        const { OpenAIProvider } = await import("../providers/openAI.js");
        return new OpenAIProvider(modelName, sdk);
      },
      OpenAIModels.GPT_4O,
      ["openai", "gpt", "chatgpt"],
    );

    // Anthropic
    ProviderFactory.registerProvider(
      AIProviderName.ANTHROPIC,
      async (modelName?, _providerName?, sdk?) => {
        const { AnthropicProvider } = await import("../providers/anthropic.js");
        return new AnthropicProvider(modelName, sdk);
      },
      AnthropicModels.CLAUDE_3_5_SONNET,
      ["anthropic", "claude"],
    );

    // ... more providers
  }
}
```

### Critical: Dynamic Imports

**Dynamic imports are MANDATORY** to prevent circular dependencies:

```typescript
// CORRECT - Dynamic import (async)
async (modelName?, _providerName?, sdk?) => {
  const { MyProvider } = await import("../providers/myProvider.js");
  return new MyProvider(modelName, sdk);
};

// INCORRECT - Static import (causes circular dependencies)
import { MyProvider } from "../providers/myProvider.js";
async (modelName?) => new MyProvider(modelName);
```

**Why this matters:**

- NeuroLink SDK imports ProviderRegistry
- ProviderRegistry imports all providers statically
- Providers import NeuroLink types/utilities
- Result: Circular dependency chain
- Solution: Dynamic imports break the chain by deferring provider loading

### Provider Lifecycle

```
1. Registration (startup)
   └── ProviderRegistry.registerAllProviders()
       └── Registers factory functions (NOT provider instances)

2. Creation (on-demand)
   └── ProviderFactory.createProvider("openai")
       └── Looks up factory function
           └── Dynamic import loads provider module
               └── Provider constructor initializes SDK client

3. Execution (per-request)
   └── neurolink.generate() or neurolink.stream()
       └── BaseProvider.generate() or stream()
           └── Provider-specific executeStream() or generate()

4. Cleanup (implicit)
   └── Garbage collection when no longer referenced
```

---

## 3. BaseProvider Consolidation

The `BaseProvider` abstract class (`src/lib/core/baseProvider.ts`) provides the foundation for all providers, achieving 55-65% code reduction.

### Protected Properties

```typescript
protected readonly modelName: string;           // Current model name
protected readonly providerName: AIProviderName; // Provider identifier
protected readonly defaultTimeout: number;       // Default timeout (30s)
protected readonly directTools;                  // Built-in tools
protected mcpTools?: Record<string, Tool>;       // MCP tools
protected customTools?: Map<string, unknown>;    // Custom registered tools
protected neurolink?: NeuroLink;                 // SDK reference
```

### Abstract Methods (MUST Implement)

Every provider MUST implement these methods:

```typescript
// 1. Provider identification
protected abstract getProviderName(): AIProviderName;
protected abstract getDefaultModel(): string;

// 2. Model access
protected abstract getAISDKModel(): LanguageModelV1 | Promise<LanguageModelV1>;

// 3. Streaming implementation
protected abstract executeStream(
  options: StreamOptions,
  analysisSchema?: ValidationSchema,
): Promise<StreamResult>;

// 4. Error handling
protected abstract handleProviderError(error: unknown): Error;
```

### Template Methods (Inherited - DO NOT Override)

These methods are provided by BaseProvider and handle common logic:

```typescript
// Primary API methods
async generate(options: TextGenerationOptions | string): Promise<EnhancedGenerateResult | null>
async stream(options: StreamOptions | string): Promise<StreamResult>
async generateText(options: TextGenerationOptions): Promise<TextGenerationResult>

// Helper methods
protected normalizeTextOptions(optionsOrPrompt): TextGenerationOptions
protected normalizeStreamOptions(optionsOrPrompt): StreamOptions
protected validateStreamOptions(options: StreamOptions): void
protected async buildMessagesForStream(options): Promise<CoreMessage[]>
protected async getAllTools(): Promise<Record<string, Tool>>
protected createTextStream(result): AsyncGenerator<{ content: string }>
protected createStreamResult(stream, additionalProps): StreamResult
protected async executeWithTimeout<T>(operation, options): Promise<T>
protected handleCommonErrors(error: unknown): Error | null
```

### Virtual Methods (Optional Override)

```typescript
// Tool support (default: true)
supportsTools(): boolean { return true; }

// Image generation (default: throws error)
protected async executeImageGeneration(options): Promise<EnhancedGenerateResult>

// Session context
public setSessionContext(sessionId?: string, userId?: string): void
```

### Code Reduction Achieved

| Before BaseProvider         | After BaseProvider                |
| --------------------------- | --------------------------------- |
| ~300 lines per provider     | ~100-150 lines per provider       |
| Duplicate streaming logic   | Single streaming implementation   |
| Duplicate tool handling     | Centralized tool management       |
| Inconsistent error handling | Standardized error transformation |

---

## 4. Streaming Implementation

### Standard Streaming Pattern

All providers should follow this pattern in `executeStream()`:

```typescript
protected async executeStream(
  options: StreamOptions,
  analysisSchema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>,
): Promise<StreamResult> {
  // 1. Validate options
  this.validateStreamOptions(options);

  // 2. Setup timeout
  const timeout = this.getTimeout(options);
  const timeoutController = createTimeoutController(
    timeout,
    this.providerName,
    "stream",
  );

  try {
    // 3. Build messages using BaseProvider helper
    const messages = await this.buildMessagesForStream(options);

    // 4. Get model with middleware
    const model = await this.getAISDKModelWithMiddleware(options);

    // 5. Get tools if enabled
    const shouldUseTools = !options.disableTools && this.supportsTools();
    const tools = shouldUseTools ? await this.getAllTools() : {};

    logger.debug("Provider stream configuration", {
      shouldUseTools,
      toolCount: Object.keys(tools).length,
      messageCount: messages.length,
    });

    // 6. Execute stream with AI SDK
    const result = await streamText({
      model,
      messages,
      temperature: options.temperature,
      ...(options.maxTokens && { maxTokens: options.maxTokens }),
      ...(shouldUseTools && Object.keys(tools).length > 0 && {
        tools,
        toolChoice: "auto",
        maxSteps: options.maxSteps || DEFAULT_MAX_STEPS,
      }),
      abortSignal: timeoutController?.controller.signal,
      onStepFinish: ({ toolCalls, toolResults }) => {
        this.handleToolExecutionStorage(
          toolCalls,
          toolResults,
          options,
          new Date(),
        ).catch((error: unknown) => {
          logger.warn("Failed to store tool executions", {
            error: error instanceof Error ? error.message : String(error),
          });
        });
      },
    });

    // 7. Cleanup timeout
    timeoutController?.cleanup();

    // 8. Transform and return
    const transformedStream = this.createTextStream(result);

    return {
      stream: transformedStream,
      provider: this.providerName,
      model: this.modelName,
      metadata: {
        streamId: `${this.providerName}-${Date.now()}`,
        startTime: Date.now(),
      },
    };
  } catch (error) {
    timeoutController?.cleanup();
    throw this.handleProviderError(error);
  }
}
```

### Fake Streaming Fallback

For providers that don't support native streaming, implement fake streaming:

```typescript
protected async executeStream(options: StreamOptions): Promise<StreamResult> {
  // Check if provider supports native streaming
  if (!this.supportsNativeStreaming()) {
    return this.executeFakeStreaming(options);
  }

  // Normal streaming implementation...
}

private async executeFakeStreaming(options: StreamOptions): Promise<StreamResult> {
  // Generate complete response
  const result = await this.generateComplete(options);

  // Create fake stream that yields response character by character
  const fakeStream = (async function* () {
    const content = result.content;
    const chunkSize = 10; // Characters per chunk

    for (let i = 0; i < content.length; i += chunkSize) {
      yield { content: content.slice(i, i + chunkSize) };
      // Optional: Add small delay for more natural streaming feel
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  })();

  return {
    stream: fakeStream,
    provider: this.providerName,
    model: this.modelName,
    metadata: {
      streamId: `${this.providerName}-fake-${Date.now()}`,
      startTime: Date.now(),
      isFakeStream: true,
    },
  };
}
```

### Advanced Stream Transformation

For providers requiring custom stream handling:

```typescript
const transformedStream = (async function* () {
  const streamToUse = result.fullStream || result.textStream;

  for await (const chunk of streamToUse) {
    if (chunk && typeof chunk === "object") {
      // Handle error chunks
      if ("type" in chunk && chunk.type === "error") {
        throw new Error(`Streaming error: ${chunk.error?.message}`);
      }

      // Handle text delta
      if ("textDelta" in chunk) {
        const textDelta = (chunk as { textDelta: string }).textDelta;
        if (textDelta) {
          yield { content: textDelta };
        }
      }

      // Handle tool call events
      if (chunk.type === "tool-call-streaming-start") {
        logger.debug("Tool call started", { toolName: chunk.toolName });
      }
    } else if (typeof chunk === "string") {
      yield { content: chunk };
    }
  }
})();
```

---

## 5. Tool Support Patterns

### Basic Tool Support

```typescript
supportsTools(): boolean {
  return true;  // All models support tools
}
```

### Model-Specific Tool Support

```typescript
supportsTools(): boolean {
  const modelName = this.modelName.toLowerCase();

  // Known tool-capable models
  const toolCapableModels = [
    "gpt-4",
    "gpt-3.5-turbo",
    "claude-3",
    "gemini-1.5",
    "gemini-2",
  ];

  const isCapable = toolCapableModels.some(m => modelName.includes(m));

  if (!isCapable) {
    logger.debug("Tool calling disabled for model", {
      model: this.modelName,
      reason: "Model not in tool-capable list",
    });
  }

  return isCapable;
}
```

### Tool Validation and Filtering

```typescript
// Filter tools based on provider capabilities
protected async getFilteredTools(): Promise<Record<string, Tool>> {
  const allTools = await this.getAllTools();

  // Some providers have tool limitations
  if (this.hasToolLimitations()) {
    return this.filterToolsForProvider(allTools);
  }

  return allTools;
}

private filterToolsForProvider(tools: Record<string, Tool>): Record<string, Tool> {
  const filtered: Record<string, Tool> = {};
  const maxTools = this.getMaxToolCount();

  let count = 0;
  for (const [name, tool] of Object.entries(tools)) {
    if (count >= maxTools) {
      logger.warn(`Tool limit reached for ${this.providerName}`, {
        maxTools,
        totalTools: Object.keys(tools).length,
      });
      break;
    }

    // Validate tool schema compatibility
    if (this.isToolSchemaCompatible(tool)) {
      filtered[name] = tool;
      count++;
    }
  }

  return filtered;
}
```

### Dynamic Tool Capability Detection

```typescript
// Cache for tool capabilities
private static toolCapableModels: Set<string> = new Set();
private static capabilitiesCached = false;

supportsTools(): boolean {
  if (MyProvider.capabilitiesCached) {
    return MyProvider.toolCapableModels.has(this.modelName);
  }

  // Fallback to pattern matching
  return this.matchesToolCapablePattern(this.modelName);
}

async cacheModelCapabilities(): Promise<void> {
  // Fetch from API and cache
  const response = await fetch("https://api.myprovider.com/models");
  const models = await response.json();

  for (const model of models.data) {
    if (model.capabilities?.includes("tools")) {
      MyProvider.toolCapableModels.add(model.id);
    }
  }

  MyProvider.capabilitiesCached = true;
}
```

---

## 6. Multimodal Support

### Vision Capability Registration

**File:** `src/lib/adapters/providerImageAdapter.ts`

```typescript
private static readonly VISION_CAPABILITIES: Record<string, boolean | string[]> = {
  // Provider supports vision for ALL models
  [AIProviderName.ANTHROPIC]: true,

  // Provider supports vision for SPECIFIC models only
  [AIProviderName.OPENAI]: [
    "gpt-4o",
    "gpt-4-turbo",
    "gpt-4-vision-preview",
  ],

  // Add your provider
  [AIProviderName.MY_PROVIDER]: [
    "my-vision-model",
    "my-multimodal-model",
  ],
};
```

### Image Adapter Pattern

```typescript
export class ProviderImageAdapter {
  static supportsVision(provider: AIProviderName, model: string): boolean {
    const capability = this.VISION_CAPABILITIES[provider];

    if (capability === true) return true;
    if (Array.isArray(capability)) {
      return capability.some((m) =>
        model.toLowerCase().includes(m.toLowerCase()),
      );
    }
    return false;
  }

  static adaptImageForProvider(
    provider: AIProviderName,
    image: ImageInput,
  ): ProviderImageFormat {
    switch (provider) {
      case AIProviderName.OPENAI:
        return this.formatForOpenAI(image);
      case AIProviderName.ANTHROPIC:
        return this.formatForAnthropic(image);
      case AIProviderName.MY_PROVIDER:
        return this.formatForMyProvider(image);
      default:
        return this.formatDefault(image);
    }
  }

  private static formatForMyProvider(image: ImageInput): MyProviderImageFormat {
    if (typeof image === "string" && image.startsWith("http")) {
      return { type: "url", url: image };
    }

    const base64 = Buffer.isBuffer(image) ? image.toString("base64") : image;

    return {
      type: "base64",
      media_type: this.detectMimeType(base64),
      data: base64,
    };
  }
}
```

### PDF Support by Provider

| Provider         | Max Size | Max Pages | Native Support |
| ---------------- | -------- | --------- | -------------- |
| Vertex AI        | 5MB      | 100       | Yes            |
| Anthropic        | 5MB      | 100       | Yes            |
| AWS Bedrock      | 5MB      | 100       | Yes            |
| Google AI Studio | 2000MB   | 100       | Yes            |
| OpenAI           | 10MB     | 100       | Yes            |

### Multimodal Message Building

```typescript
// Messages are built automatically by BaseProvider.buildMessagesForStream()
// For custom handling, override in your provider:

protected async buildMessagesForStream(options: StreamOptions): Promise<CoreMessage[]> {
  const messages = await super.buildMessagesForStream(options);

  // Provider-specific transformations if needed
  for (const message of messages) {
    if (Array.isArray(message.content)) {
      message.content = message.content.map(part => {
        if (part.type === "image") {
          return this.formatImageForMyProvider(part);
        }
        return part;
      });
    }
  }

  return messages;
}
```

---

## 7. Native SDK Migration

### When to Migrate from @ai-sdk to Native SDK

Migrate to native SDK when:

1. **Better authentication control** - Complex credential handling (AWS, GCP)
2. **Provider-specific features** - Features not exposed by @ai-sdk wrapper
3. **Performance optimization** - Reduce abstraction overhead
4. **Bug fixes** - Work around @ai-sdk wrapper issues

### Migration Pattern: AWS Bedrock Example

**Before (using @ai-sdk/amazon-bedrock):**

```typescript
import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";

const client = createAmazonBedrock({
  region: "us-east-1",
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});
```

**After (native AWS SDK):**

```typescript
import {
  BedrockRuntimeClient,
  ConverseStreamCommand,
} from "@aws-sdk/client-bedrock-runtime";

const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1",
  // AWS SDK handles credentials automatically via:
  // - Environment variables
  // - Shared credentials file
  // - IAM roles (EC2/ECS/Lambda)
});

// Implement ConverseStream API directly
const response = await client.send(
  new ConverseStreamCommand({
    modelId: this.modelName,
    messages: this.formatMessagesForBedrock(messages),
    inferenceConfig: {
      maxTokens: options.maxTokens,
      temperature: options.temperature,
    },
  }),
);
```

### Migration Pattern: Google Vertex Example

**Before (using @ai-sdk/google-vertex):**

```typescript
import { createVertex } from "@ai-sdk/google-vertex";

const vertex = createVertex({
  project: process.env.GOOGLE_PROJECT_ID,
  location: "us-central1",
});
```

**After (native Google SDK):**

```typescript
import { VertexAI } from "@google-cloud/vertexai";

const vertexAI = new VertexAI({
  project: process.env.GOOGLE_PROJECT_ID,
  location: process.env.GOOGLE_LOCATION || "us-central1",
});

const generativeModel = vertexAI.getGenerativeModel({
  model: this.modelName,
});

// Use native streaming
const result = await generativeModel.generateContentStream({
  contents: this.formatMessagesForVertex(messages),
  generationConfig: {
    maxOutputTokens: options.maxTokens,
    temperature: options.temperature,
  },
});
```

### Migration Checklist

1. **Identify gaps** - What features are missing from @ai-sdk wrapper?
2. **Evaluate complexity** - Is native implementation worth the effort?
3. **Implement adapter** - Create wrapper that matches BaseProvider interface
4. **Test thoroughly** - Ensure all existing functionality works
5. **Document differences** - Note any behavior changes
6. **Update dependencies** - Add native SDK packages

---

## 8. Provider Templates

### Complete Provider Implementation Template

```typescript
/**
 * [Provider Name] Provider for NeuroLink
 *
 * @module providers/myProvider
 * @description Implements [Provider Name] integration using Vercel AI SDK
 *
 * Features:
 * - Text generation with streaming
 * - Tool calling support: [yes/no/conditional]
 * - Vision support: [yes/no/model-specific]
 * - PDF support: [yes/no]
 *
 * Required Environment Variables:
 * - MY_PROVIDER_API_KEY: API key from [Provider URL]
 * - MY_PROVIDER_MODEL (optional): Default model to use
 *
 * @see https://docs.myprovider.com/api
 */

import { createMyProviderSDK } from "@my-provider/ai-sdk";
import type { ZodType, ZodTypeDef } from "zod";
import { streamText, type Schema, type LanguageModelV1 } from "ai";
import { AIProviderName } from "../constants/enums.js";
import type { StreamOptions, StreamResult } from "../types/streamTypes.js";
import type { UnknownRecord } from "../types/common.js";
import type { NeuroLink } from "../neurolink.js";
import { BaseProvider } from "../core/baseProvider.js";
import { logger } from "../utils/logger.js";
import { createTimeoutController, TimeoutError } from "../utils/timeout.js";
import { getProviderModel } from "../utils/providerConfig.js";
import { DEFAULT_MAX_STEPS } from "../core/constants.js";
import { createProxyFetch } from "../proxy/proxyFetch.js";

// ============================================================================
// Configuration
// ============================================================================

const getConfig = () => {
  const apiKey = process.env.MY_PROVIDER_API_KEY;

  if (!apiKey) {
    throw new Error(
      "MY_PROVIDER_API_KEY environment variable is required. " +
        "Get your API key at https://myprovider.com/keys",
    );
  }

  return {
    apiKey,
    baseURL: process.env.MY_PROVIDER_BASE_URL,
  };
};

const getDefaultModel = (): string => {
  return getProviderModel("MY_PROVIDER_MODEL", "my-default-model");
};

// ============================================================================
// Provider Implementation
// ============================================================================

export class MyProvider extends BaseProvider {
  private model: LanguageModelV1;

  constructor(modelName?: string, sdk?: unknown) {
    super(modelName, AIProviderName.MY_PROVIDER, sdk as NeuroLink | undefined);

    const config = getConfig();

    // Initialize SDK client with proxy support
    const client = createMyProviderSDK({
      apiKey: config.apiKey,
      ...(config.baseURL && { baseURL: config.baseURL }),
      fetch: createProxyFetch(), // Important for corporate networks
    });

    this.model = client(this.modelName || getDefaultModel());

    logger.debug("MyProvider initialized", {
      model: this.modelName,
      provider: this.providerName,
    });
  }

  // ==========================================================================
  // Abstract Method Implementations (REQUIRED)
  // ==========================================================================

  protected getProviderName(): AIProviderName {
    return AIProviderName.MY_PROVIDER;
  }

  protected getDefaultModel(): string {
    return getDefaultModel();
  }

  protected getAISDKModel(): LanguageModelV1 {
    return this.model;
  }

  public handleProviderError(error: unknown): Error {
    // 1. Handle timeout errors
    if (error instanceof TimeoutError) {
      return new Error(`MyProvider request timed out: ${error.message}`);
    }

    const errorObj = error as UnknownRecord;
    const message =
      typeof errorObj?.message === "string"
        ? errorObj.message
        : "Unknown error";

    // 2. Authentication errors
    if (message.includes("Unauthorized") || message.includes("API_KEY")) {
      return new Error(
        "Invalid MyProvider API key. Please check MY_PROVIDER_API_KEY. " +
          "Get your key at https://myprovider.com/keys",
      );
    }

    // 3. Rate limiting
    if (message.includes("rate limit") || message.includes("429")) {
      return new Error(
        "MyProvider rate limit exceeded. Please try again later.",
      );
    }

    // 4. Model errors
    if (message.includes("model") && message.includes("not found")) {
      return new Error(
        `Model '${this.modelName}' not available on MyProvider. ` +
          "See available models at https://myprovider.com/models",
      );
    }

    // 5. Connection errors
    if (
      message.includes("ECONNREFUSED") ||
      message.includes("Failed to fetch")
    ) {
      return new Error(
        "MyProvider API unavailable. Please check your connection.",
      );
    }

    // 6. Tool errors
    if (message.includes("tool") || message.includes("function")) {
      return new Error(
        `MyProvider tool error: ${message}. ` +
          "Use --disableTools or try a different model.",
      );
    }

    // 7. Generic fallback
    return new Error(`MyProvider error: ${message}`);
  }

  protected async executeStream(
    options: StreamOptions,
    _analysisSchema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>,
  ): Promise<StreamResult> {
    this.validateStreamOptions(options);

    const timeout = this.getTimeout(options);
    const timeoutController = createTimeoutController(
      timeout,
      this.providerName,
      "stream",
    );

    try {
      const messages = await this.buildMessagesForStream(options);
      const model = await this.getAISDKModelWithMiddleware(options);

      const shouldUseTools = !options.disableTools && this.supportsTools();
      const tools = shouldUseTools ? await this.getAllTools() : {};

      logger.debug("MyProvider stream configuration", {
        shouldUseTools,
        toolCount: Object.keys(tools).length,
        messageCount: messages.length,
      });

      const result = await streamText({
        model,
        messages,
        temperature: options.temperature,
        ...(options.maxTokens && { maxTokens: options.maxTokens }),
        ...(shouldUseTools &&
          Object.keys(tools).length > 0 && {
            tools,
            toolChoice: "auto",
            maxSteps: options.maxSteps || DEFAULT_MAX_STEPS,
          }),
        abortSignal: timeoutController?.controller.signal,
        onStepFinish: ({ toolCalls, toolResults }) => {
          this.handleToolExecutionStorage(
            toolCalls,
            toolResults,
            options,
            new Date(),
          ).catch((error: unknown) => {
            logger.warn("[MyProvider] Failed to store tool executions", {
              error: error instanceof Error ? error.message : String(error),
            });
          });
        },
      });

      timeoutController?.cleanup();

      const transformedStream = this.createTextStream(result);

      return {
        stream: transformedStream,
        provider: this.providerName,
        model: this.modelName,
        metadata: {
          streamId: `myprovider-${Date.now()}`,
          startTime: Date.now(),
        },
      };
    } catch (error) {
      timeoutController?.cleanup();
      throw this.handleProviderError(error);
    }
  }

  // ==========================================================================
  // Optional Overrides
  // ==========================================================================

  /**
   * Tool support configuration
   * Override if provider has model-specific tool capabilities
   */
  supportsTools(): boolean {
    // Example: Check for specific model capabilities
    // const modelName = this.modelName.toLowerCase();
    // return modelName.includes("turbo") || modelName.includes("pro");
    return true;
  }

  // ==========================================================================
  // Provider-Specific Methods (Optional)
  // ==========================================================================

  /**
   * Get available models from the provider API
   * Optional: Implement for dynamic model discovery
   */
  async getAvailableModels(): Promise<string[]> {
    // TODO: Implement API call to fetch models
    return ["my-default-model", "my-advanced-model"];
  }
}

// Export for factory registration
export default MyProvider;
```

---

## 9. Complete Provider Addition Checklist

Based on analysis of NeuroLink's provider addition history, follow this comprehensive checklist:

### Phase 1: Setup (Prerequisites)

- [ ] **Understand provider API** - Read provider documentation
- [ ] **Obtain API credentials** - Get API key/credentials for testing
- [ ] **Check for existing @ai-sdk package** - Prefer existing wrappers
- [ ] **Identify model names** - List all models to support

### Phase 2: Type Definitions

- [ ] **Add provider name to enum**
  - File: `src/lib/constants/enums.ts`

  ```typescript
  export enum AIProviderName {
    // ... existing providers
    MY_PROVIDER = "my-provider",
  }
  ```

- [ ] **Add model definitions** (if applicable)
  - File: `src/lib/constants/enums.ts`
  ```typescript
  export enum MyProviderModels {
    DEFAULT_MODEL = "my-model-v1",
    ADVANCED_MODEL = "my-model-v2",
  }
  ```

### Phase 3: Provider Implementation

- [ ] **Create provider file**
  - File: `src/lib/providers/myProvider.ts`
  - Use template from Section 8
  - Implement all abstract methods

- [ ] **Implement required methods:**
  - [ ] `getProviderName()` - Returns `AIProviderName.MY_PROVIDER`
  - [ ] `getDefaultModel()` - Returns default model string
  - [ ] `getAISDKModel()` - Returns `LanguageModelV1` instance
  - [ ] `executeStream()` - Implements streaming logic
  - [ ] `handleProviderError()` - Transforms errors

- [ ] **Implement optional overrides** (if needed):
  - [ ] `supportsTools()` - For model-specific tool support
  - [ ] `executeImageGeneration()` - For image generation

### Phase 4: Factory Registration

- [ ] **Register in ProviderRegistry**
  - File: `src/lib/factories/providerRegistry.ts`
  ```typescript
  ProviderFactory.registerProvider(
    AIProviderName.MY_PROVIDER,
    async (modelName?, _providerName?, sdk?) => {
      const { MyProvider } = await import("../providers/myProvider.js");
      return new MyProvider(modelName, sdk as NeuroLink | undefined);
    },
    MyProviderModels.DEFAULT_MODEL,
    ["my-provider", "myprovider", "myp"], // Aliases
  );
  ```

### Phase 5: Exports and Integration

- [ ] **Export provider**
  - File: `src/lib/providers/index.ts`

  ```typescript
  export { MyProvider } from "./myProvider.js";
  ```

- [ ] **Update vision capabilities** (if multimodal)
  - File: `src/lib/adapters/providerImageAdapter.ts`

  ```typescript
  private static readonly VISION_CAPABILITIES = {
    // ... existing
    [AIProviderName.MY_PROVIDER]: ["my-vision-model"],
  };
  ```

- [ ] **Add CLI support** (if applicable)
  - File: `src/cli/factories/commandFactory.ts`
  - Add to provider choices

### Phase 6: Testing

- [ ] **Create unit tests**
  - File: `test/providers/myProvider.test.ts`
  - Test initialization, error handling, tool support

- [ ] **Create integration tests**
  - File: `test/integration/myProvider.integration.test.ts`
  - Test actual API calls (with real credentials)

- [ ] **Pass consistency tests**
  - Run: `pnpm run test:consistency`
  - Ensure result format matches other providers

### Phase 7: Documentation

- [ ] **Add environment variable documentation**
  - Update `.env.example`
  - Update `docs/sdk/configuration.md`

- [ ] **Add provider documentation**
  - Create or update `docs/providers/myProvider.md`
  - Document supported models, features, limitations

### Phase 8: Final Validation

- [ ] **Run full test suite**: `pnpm test`
- [ ] **Check types**: `pnpm run check`
- [ ] **Lint and format**: `pnpm run lint && pnpm run format`
- [ ] **Build**: `pnpm run build`
- [ ] **Manual CLI test**: `pnpm run build:cli && pnpm run cli generate "test" --provider my-provider`

---

## 10. Testing Requirements

### Unit Tests

```typescript
// test/providers/myProvider.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MyProvider } from "../../src/lib/providers/myProvider.js";

describe("MyProvider", () => {
  beforeEach(() => {
    vi.stubEnv("MY_PROVIDER_API_KEY", "test-key");
  });

  describe("initialization", () => {
    it("should initialize with default model", () => {
      const provider = new MyProvider();
      expect(provider.getDefaultModel()).toBe("my-model-v1");
    });

    it("should use custom model when provided", () => {
      const provider = new MyProvider("custom-model");
      expect(provider.getAISDKModel()).toBeDefined();
    });

    it("should throw without API key", () => {
      vi.stubEnv("MY_PROVIDER_API_KEY", "");
      expect(() => new MyProvider()).toThrow("API_KEY");
    });
  });

  describe("error handling", () => {
    it("should handle authentication errors", () => {
      const provider = new MyProvider();
      const error = provider.handleProviderError(new Error("Unauthorized"));
      expect(error.message).toContain("Invalid");
      expect(error.message).toContain("API key");
    });

    it("should handle rate limit errors", () => {
      const provider = new MyProvider();
      const error = provider.handleProviderError(
        new Error("rate limit exceeded"),
      );
      expect(error.message).toContain("Rate limit");
    });

    it("should handle model not found errors", () => {
      const provider = new MyProvider("nonexistent-model");
      const error = provider.handleProviderError(new Error("model not found"));
      expect(error.message).toContain("not available");
    });
  });

  describe("tool support", () => {
    it("should support tools by default", () => {
      const provider = new MyProvider();
      expect(provider.supportsTools()).toBe(true);
    });
  });
});
```

### Integration Tests

```typescript
// test/integration/myProvider.integration.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import { MyProvider } from "../../src/lib/providers/myProvider.js";

describe("MyProvider Integration", () => {
  let provider: MyProvider;

  beforeAll(() => {
    // Skip if no API key
    if (!process.env.MY_PROVIDER_API_KEY) {
      return;
    }
    provider = new MyProvider();
  });

  it("should generate text", async () => {
    const result = await provider.generate({
      prompt: "Say hello",
      maxTokens: 10,
    });

    expect(result?.content).toBeDefined();
    expect(result?.content.length).toBeGreaterThan(0);
  });

  it("should stream text", async () => {
    const result = await provider.stream({
      input: { text: "Count to 5" },
      maxTokens: 50,
    });

    let content = "";
    for await (const chunk of result.stream) {
      if ("content" in chunk) {
        content += chunk.content;
      }
    }

    expect(content.length).toBeGreaterThan(0);
  });

  it("should handle tool calls", async () => {
    const result = await provider.generate({
      prompt: "What time is it?",
      maxTokens: 100,
    });

    // Should either answer or attempt tool call
    expect(result).toBeDefined();
  });
});
```

### Consistency Tests

```typescript
// test/suites/consistency.test.ts additions
describe("Provider Consistency - MyProvider", () => {
  it("should return consistent result format", async () => {
    const result = await provider.generate({
      prompt: "Test",
      maxTokens: 10,
    });

    // Check required fields
    expect(result).toHaveProperty("content");
    expect(result).toHaveProperty("provider");
    expect(result).toHaveProperty("model");
    expect(result).toHaveProperty("usage");
  });

  it("should match provider name", () => {
    expect(provider.providerName).toBe(AIProviderName.MY_PROVIDER);
  });
});
```

---

## 11. Common Pitfalls and Solutions

### Pitfall 1: Circular Dependencies

**Symptom:** Build fails with "Cannot access before initialization" errors

**Solution:** Always use dynamic imports in ProviderRegistry:

```typescript
// WRONG
import { MyProvider } from "../providers/myProvider.js";

// RIGHT
const { MyProvider } = await import("../providers/myProvider.js");
```

### Pitfall 2: Missing Proxy Support

**Symptom:** Requests fail in corporate environments with proxies

**Solution:** Always use `createProxyFetch()`:

```typescript
const client = createMyProviderSDK({
  apiKey: config.apiKey,
  fetch: createProxyFetch(), // Critical for proxy support
});
```

### Pitfall 3: Incorrect Error Transformation

**Symptom:** Raw SDK errors reach users, exposing implementation details

**Solution:** Transform ALL errors in `handleProviderError()`:

```typescript
public handleProviderError(error: unknown): Error {
  // Always return a new Error with user-friendly message
  // Never re-throw the original error directly
  const errorObj = error as UnknownRecord;
  const message = typeof errorObj?.message === "string"
    ? errorObj.message
    : "Unknown error";

  return new Error(`MyProvider error: ${message}`);
}
```

### Pitfall 4: Hardcoded Tool Restrictions

**Symptom:** Tools don't work with new models that should support them

**Solution:** Use pattern matching or capability detection:

```typescript
supportsTools(): boolean {
  // Don't hardcode specific models
  // Use patterns or capability APIs
  const modelName = this.modelName.toLowerCase();
  return modelName.includes("turbo") ||
         modelName.includes("pro") ||
         !modelName.includes("mini");
}
```

### Pitfall 5: Missing Timeout Cleanup

**Symptom:** Memory leaks from uncleaned timeout controllers

**Solution:** Always cleanup in both success and error paths:

```typescript
try {
  const result = await streamText({
    /* ... */
  });
  timeoutController?.cleanup(); // Success path
  return result;
} catch (error) {
  timeoutController?.cleanup(); // Error path
  throw this.handleProviderError(error);
}
```

### Pitfall 6: Gemini Tool + JSON Schema Limitation

**Symptom:** Generation fails when using tools AND structured output with Gemini

**Solution:** This is a documented Gemini API limitation. Design workflows to use either tools OR structured output, not both:

```typescript
// Check provider before enabling both
if (
  this.providerName === AIProviderName.GOOGLE_AI ||
  this.providerName === AIProviderName.GOOGLE_VERTEX
) {
  if (options.structuredOutput && shouldUseTools) {
    logger.warn(
      "Gemini cannot use tools with JSON schema output. Disabling tools.",
    );
    shouldUseTools = false;
  }
}
```

### Pitfall 7: Static Model Lists

**Symptom:** New models require code changes to support

**Solution:** Use environment variables for model configuration:

```typescript
const getDefaultModel = (): string => {
  return getProviderModel(
    "MY_PROVIDER_MODEL", // Environment variable
    "my-default-model", // Fallback
  );
};
```

---

## Summary

This guide consolidates lessons from NeuroLink's 8-month provider evolution into actionable patterns:

1. **Evolution Phases** - Start simple, iterate toward consolidation
2. **Factory + Registry** - Dynamic imports prevent circular dependencies
3. **BaseProvider** - 55-65% code reduction through consolidation
4. **Streaming** - Standard pattern with fake streaming fallback
5. **Tool Support** - Validation and model-specific filtering
6. **Multimodal** - Adapter pattern for provider-specific formats
7. **Native Migration** - When @ai-sdk wrappers aren't enough
8. **Templates** - Complete implementation guide
9. **Checklist** - Step-by-step provider addition process
10. **Testing** - Unit, integration, and consistency tests
11. **Pitfalls** - Common issues and solutions

Following this guide ensures new providers integrate seamlessly with NeuroLink's architecture while maintaining code quality and consistency.

---

## References

- **Provider Implementation Patterns:** `/docs/mastra-features-implementation/patterns/04-provider-implementation-patterns.md`
- **Provider Evolution Analysis:** `/docs/mastra-features-implementation/research/git-history/01-provider-evolution.md`
- **AI SDK Research:** `/docs/mastra-features-implementation/research/online/10-ai-sdk-research.md`
- **CLAUDE.md:** Project-level implementation guide
