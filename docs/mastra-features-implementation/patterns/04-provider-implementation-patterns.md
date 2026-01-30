# Provider Implementation Patterns

This document provides a comprehensive analysis of NeuroLink's provider implementation architecture, serving as a guide for implementing new AI providers or understanding the existing provider system.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Provider Anatomy](#provider-anatomy)
3. [BaseProvider Abstract Class](#baseprovider-abstract-class)
4. [Factory Registration Pattern](#factory-registration-pattern)
5. [Step-by-Step Provider Implementation Guide](#step-by-step-provider-implementation-guide)
6. [Interface Compliance Checklist](#interface-compliance-checklist)
7. [Error Handling Patterns](#error-handling-patterns)
8. [Streaming Implementation](#streaming-implementation)
9. [Tool Support Patterns](#tool-support-patterns)
10. [Multimodal Support Patterns](#multimodal-support-patterns)
11. [Provider-Specific Adapters](#provider-specific-adapters)
12. [Testing Requirements](#testing-requirements)
13. [New Provider Template](#new-provider-template)

---

## Architecture Overview

NeuroLink uses a **Factory Pattern with Dynamic Provider Registration** to manage its 13+ AI providers. This architecture enables:

- **Lazy Loading**: Providers are loaded only when needed via dynamic imports
- **Circular Dependency Prevention**: Factory pattern breaks circular dependency chains
- **Extensibility**: New providers can be added without modifying core SDK code
- **Type Safety**: Full TypeScript support with strict interface compliance

### Key Components

```
src/lib/
├── core/
│   └── baseProvider.ts          # Abstract base class for all providers
├── factories/
│   ├── providerFactory.ts       # Central factory for creating providers
│   └── providerRegistry.ts      # Registers all providers with factory functions
├── providers/                    # Individual provider implementations
│   ├── openAI.ts
│   ├── anthropic.ts
│   ├── googleAiStudio.ts
│   ├── googleVertex.ts
│   ├── amazonBedrock.ts
│   ├── azureOpenai.ts
│   ├── mistral.ts
│   ├── litellm.ts
│   ├── ollama.ts
│   ├── huggingFace.ts
│   ├── openRouter.ts
│   ├── amazonSagemaker.ts
│   └── openaiCompatible.ts
├── adapters/
│   └── providerImageAdapter.ts  # Multimodal content adaptation
└── types/
    ├── providers.ts             # Provider type definitions
    ├── streamTypes.ts           # Streaming type definitions
    └── generateTypes.ts         # Generation type definitions
```

---

## Provider Anatomy

Every NeuroLink provider follows a consistent structure:

### Core Components

```typescript
// 1. Imports
import { BaseProvider } from "../core/baseProvider.js";
import { AIProviderName } from "../constants/enums.js";
import type { StreamOptions, StreamResult } from "../types/streamTypes.js";
import type { LanguageModelV1 } from "ai";

// 2. Configuration Helpers
const getProviderConfig = () => {
  /* ... */
};
const getDefaultModel = (): string => {
  /* ... */
};

// 3. Provider Class
export class MyProvider extends BaseProvider {
  // Private fields
  private model: LanguageModelV1;

  // Constructor
  constructor(modelName?: string, sdk?: unknown) {
    /* ... */
  }

  // Abstract method implementations (required)
  protected getProviderName(): AIProviderName {
    /* ... */
  }
  protected getDefaultModel(): string {
    /* ... */
  }
  protected getAISDKModel(): LanguageModelV1 {
    /* ... */
  }
  protected async executeStream(options: StreamOptions): Promise<StreamResult> {
    /* ... */
  }
  public handleProviderError(error: unknown): Error {
    /* ... */
  }

  // Optional overrides
  supportsTools(): boolean {
    /* ... */
  }
}
```

### Provider Lifecycle

```
1. Registration (startup)
   └── providerRegistry.ts registers factory function

2. Creation (on-demand)
   └── ProviderFactory.createProvider() calls factory function
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

## BaseProvider Abstract Class

The `BaseProvider` class (`src/lib/core/baseProvider.ts`) provides the foundation for all providers:

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

### Abstract Methods (Must Implement)

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

### Template Methods (Inherited)

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

---

## Factory Registration Pattern

### ProviderFactory (`src/lib/factories/providerFactory.ts`)

The factory maintains a registry of provider factory functions:

```typescript
export class ProviderFactory {
  private static providers: Map<
    AIProviderName,
    (
      modelName?: string,
      providerName?: string,
      sdk?: NeuroLink,
    ) => Promise<AIProvider>
  > = new Map();

  private static providerAliases: Map<string, AIProviderName> = new Map();
  private static defaultModels: Map<AIProviderName, string> = new Map();

  // Register a provider
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

  // Create a provider instance
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

Registers all providers with their factory functions:

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

### Critical Design Decision: Dynamic Imports

**Always use dynamic imports** in the registry to prevent circular dependencies:

```typescript
// CORRECT - Dynamic import
async (modelName?, _providerName?, sdk?) => {
  const { MyProvider } = await import("../providers/myProvider.js");
  return new MyProvider(modelName, sdk);
};

// INCORRECT - Static import (causes circular dependencies)
import { MyProvider } from "../providers/myProvider.js";
async (modelName?) => new MyProvider(modelName);
```

---

## Step-by-Step Provider Implementation Guide

### Step 1: Add Provider Name to Enum

**File:** `src/lib/constants/enums.ts`

```typescript
export enum AIProviderName {
  OPENAI = "openai",
  ANTHROPIC = "anthropic",
  // ... existing providers
  MY_PROVIDER = "my-provider", // Add new provider
}
```

### Step 2: Define Model Enum (if applicable)

**File:** `src/lib/constants/enums.ts`

```typescript
export enum MyProviderModels {
  DEFAULT_MODEL = "my-provider-model-v1",
  ADVANCED_MODEL = "my-provider-model-v2",
}
```

### Step 3: Create Provider Implementation

**File:** `src/lib/providers/myProvider.ts`

```typescript
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
import { validateApiKey, getProviderModel } from "../utils/providerConfig.js";
import { DEFAULT_MAX_STEPS } from "../core/constants.js";
import { createProxyFetch } from "../proxy/proxyFetch.js";

// Configuration helpers
const getMyProviderConfig = () => {
  const apiKey = process.env.MY_PROVIDER_API_KEY;
  if (!apiKey) {
    throw new Error(
      "MY_PROVIDER_API_KEY environment variable is required. " +
        "Get your API key at https://myprovider.com/keys",
    );
  }
  return { apiKey };
};

const getDefaultModel = (): string => {
  return getProviderModel("MY_PROVIDER_MODEL", "my-provider-model-v1");
};

/**
 * MyProvider - BaseProvider Implementation
 * Description of what this provider offers
 */
export class MyProvider extends BaseProvider {
  private model: LanguageModelV1;

  constructor(modelName?: string, sdk?: unknown) {
    super(modelName, AIProviderName.MY_PROVIDER, sdk as NeuroLink | undefined);

    const config = getMyProviderConfig();

    // Create SDK client with proxy support
    const client = createMyProviderSDK({
      apiKey: config.apiKey,
      fetch: createProxyFetch(),
    });

    this.model = client(this.modelName || getDefaultModel());

    logger.debug("MyProvider initialized", {
      model: this.modelName,
      provider: this.providerName,
    });
  }

  // Required: Provider identification
  protected getProviderName(): AIProviderName {
    return AIProviderName.MY_PROVIDER;
  }

  protected getDefaultModel(): string {
    return getDefaultModel();
  }

  // Required: Model access
  protected getAISDKModel(): LanguageModelV1 {
    return this.model;
  }

  // Required: Error handling
  public handleProviderError(error: unknown): Error {
    if (error instanceof TimeoutError) {
      return new Error(`MyProvider request timed out: ${error.message}`);
    }

    const errorObj = error as UnknownRecord;
    const message =
      typeof errorObj?.message === "string"
        ? errorObj.message
        : "Unknown error";

    // Handle specific error types
    if (
      message.includes("API_KEY_INVALID") ||
      message.includes("Unauthorized")
    ) {
      return new Error(
        "Invalid MyProvider API key. Please check your MY_PROVIDER_API_KEY.",
      );
    }

    if (message.includes("rate limit")) {
      return new Error(
        "MyProvider rate limit exceeded. Please try again later.",
      );
    }

    if (message.includes("model") && message.includes("not found")) {
      return new Error(
        `Model '${this.modelName}' not available on MyProvider.`,
      );
    }

    return new Error(`MyProvider error: ${message}`);
  }

  // Optional: Tool support
  supportsTools(): boolean {
    // Return true if provider/model supports tool calling
    return true;
  }

  // Required: Streaming implementation
  protected async executeStream(
    options: StreamOptions,
    analysisSchema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>,
  ): Promise<StreamResult> {
    this.validateStreamOptions(options);

    const timeout = this.getTimeout(options);
    const timeoutController = createTimeoutController(
      timeout,
      this.providerName,
      "stream",
    );

    try {
      // Build messages using BaseProvider helper
      const messages = await this.buildMessagesForStream(options);

      // Get model with middleware
      const model = await this.getAISDKModelWithMiddleware(options);

      // Get tools if enabled
      const shouldUseTools = !options.disableTools && this.supportsTools();
      const tools = shouldUseTools ? await this.getAllTools() : {};

      logger.debug("MyProvider stream configuration", {
        shouldUseTools,
        toolCount: Object.keys(tools).length,
        messageCount: messages.length,
      });

      // Execute stream with AI SDK
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

      // Transform stream to content objects
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
}

export default MyProvider;
```

### Step 4: Register Provider in Factory

**File:** `src/lib/factories/providerRegistry.ts`

```typescript
// Add import for model enum
import { MyProviderModels } from "../constants/enums.js";

// In registerAllProviders():
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

### Step 5: Export Provider

**File:** `src/lib/providers/index.ts`

```typescript
export { MyProvider } from "./myProvider.js";
```

### Step 6: Update Vision Capabilities (if multimodal)

**File:** `src/lib/adapters/providerImageAdapter.ts`

```typescript
private static readonly VISION_CAPABILITIES: Record<string, boolean | string[]> = {
  // ... existing providers
  [AIProviderName.MY_PROVIDER]: [
    "my-provider-vision-model",
  ],
};
```

### Step 7: Add CLI Support

**File:** `src/cli/factories/commandFactory.ts`

Add the provider to CLI choices if applicable.

---

## Interface Compliance Checklist

### Required Methods

| Method                  | Description                                 | Must Override |
| ----------------------- | ------------------------------------------- | ------------- |
| `getProviderName()`     | Returns `AIProviderName` enum value         | Yes           |
| `getDefaultModel()`     | Returns default model string                | Yes           |
| `getAISDKModel()`       | Returns Vercel AI SDK model instance        | Yes           |
| `executeStream()`       | Implements streaming logic                  | Yes           |
| `handleProviderError()` | Transforms errors to user-friendly messages | Yes           |

### Optional Overrides

| Method                     | Description                            | Default Behavior |
| -------------------------- | -------------------------------------- | ---------------- |
| `supportsTools()`          | Whether provider supports tool calling | Returns `true`   |
| `executeImageGeneration()` | Image generation support               | Throws error     |
| `getAvailableModels()`     | List available models                  | Not implemented  |

### Constructor Requirements

```typescript
constructor(modelName?: string, sdk?: unknown) {
  // 1. Call super with model name, provider name, and SDK reference
  super(modelName, AIProviderName.MY_PROVIDER, sdk as NeuroLink | undefined);

  // 2. Validate API credentials
  const config = getMyProviderConfig();

  // 3. Initialize SDK client with proxy support
  const client = createMyProviderSDK({
    apiKey: config.apiKey,
    fetch: createProxyFetch(),  // Important for proxy support
  });

  // 4. Create model instance
  this.model = client(this.modelName || getDefaultModel());

  // 5. Log initialization
  logger.debug("MyProvider initialized", {
    model: this.modelName,
    provider: this.providerName,
  });
}
```

---

## Error Handling Patterns

### Standard Error Categories

```typescript
public handleProviderError(error: unknown): Error {
  // 1. Handle timeout errors
  if (error instanceof TimeoutError) {
    return new Error(`Provider request timed out: ${error.message}`);
  }

  const errorObj = error as UnknownRecord;
  const message = typeof errorObj?.message === "string"
    ? errorObj.message
    : "Unknown error";

  // 2. Authentication errors
  if (message.includes("API_KEY_INVALID") ||
      message.includes("Unauthorized") ||
      message.includes("Invalid API key")) {
    return new Error(
      "Invalid API key. Please check your environment variable."
    );
  }

  // 3. Rate limiting
  if (message.includes("rate limit") || message.includes("429")) {
    return new Error("Rate limit exceeded. Please try again later.");
  }

  // 4. Model not found
  if (message.includes("model") && message.includes("not found")) {
    return new Error(`Model '${this.modelName}' not available.`);
  }

  // 5. Connection errors
  if (message.includes("ECONNREFUSED") || message.includes("Failed to fetch")) {
    return new Error("Service unavailable. Please check your connection.");
  }

  // 6. Tool/function calling errors
  if (message.includes("tool") || message.includes("function")) {
    return new Error(
      `Tool calling error: ${message}. ` +
      "Try using a model that supports function calling or use --disableTools."
    );
  }

  // 7. Generic fallback
  return new Error(`Provider error: ${message}`);
}
```

### Error Handling Best Practices

1. **Always transform errors** - Never let raw SDK errors reach users
2. **Include actionable guidance** - Tell users how to fix the problem
3. **Preserve error context** - Include model name, provider name in messages
4. **Use consistent formatting** - Follow the established pattern
5. **Log before throwing** - Use `logger.error()` for debugging

---

## Streaming Implementation

### Standard Streaming Pattern

```typescript
protected async executeStream(
  options: StreamOptions,
  analysisSchema?: ValidationSchema,
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
    // 3. Build messages
    const messages = await this.buildMessagesForStream(options);

    // 4. Get model with middleware
    const model = await this.getAISDKModelWithMiddleware(options);

    // 5. Get tools
    const shouldUseTools = !options.disableTools && this.supportsTools();
    const tools = shouldUseTools ? await this.getAllTools() : {};

    // 6. Execute stream
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
        ).catch(/* handle error */);
      },
    });

    // 7. Cleanup timeout
    timeoutController?.cleanup();

    // 8. Transform and return
    return {
      stream: this.createTextStream(result),
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

### Advanced Stream Transformation

For providers needing custom stream handling:

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

## Tool Support Patterns

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

## Multimodal Support Patterns

### Vision Capability Registration

**File:** `src/lib/adapters/providerImageAdapter.ts`

```typescript
private static readonly VISION_CAPABILITIES: Record<string, boolean | string[]> = {
  [AIProviderName.OPENAI]: [
    "gpt-4o",
    "gpt-4-turbo",
    "gpt-4-vision-preview",
  ],
  [AIProviderName.MY_PROVIDER]: [
    "my-vision-model",
    "my-multimodal-model",
  ],
  // OR for all models:
  [AIProviderName.MY_PROVIDER]: true,
};
```

### Image Processing in Provider

Images are handled automatically by `BaseProvider.buildMessagesForStream()`. For custom handling:

```typescript
protected async buildMessagesForStream(options: StreamOptions): Promise<CoreMessage[]> {
  const messages = await super.buildMessagesForStream(options);

  // Provider-specific image formatting if needed
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

## Provider-Specific Adapters

### When to Create Custom Adapters

Create adapters when:

1. Provider has unique API requirements
2. Special content transformation needed
3. Provider-specific features to expose

### Adapter Pattern Example

```typescript
// src/lib/adapters/myProviderAdapter.ts
export class MyProviderAdapter {
  static formatImageContent(
    imageData: Buffer | string,
    mimeType: string,
  ): MyProviderImageFormat {
    if (Buffer.isBuffer(imageData)) {
      return {
        type: "base64",
        media_type: mimeType,
        data: imageData.toString("base64"),
      };
    }

    return {
      type: "url",
      url: imageData,
    };
  }

  static formatToolResponse(result: unknown): MyProviderToolResponse {
    // Transform tool result to provider format
  }
}
```

---

## Testing Requirements

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
      expect(provider.getDefaultModel()).toBe("my-provider-model-v1");
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
      expect(error.message).toContain("Invalid API key");
    });

    it("should handle rate limit errors", () => {
      const provider = new MyProvider();
      const error = provider.handleProviderError(
        new Error("rate limit exceeded"),
      );
      expect(error.message).toContain("Rate limit");
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
});
```

### Provider Consistency Tests

Ensure your provider passes the consistency test suite:

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
});
```

---

## New Provider Template

Use this template as a starting point for new providers:

```typescript
/**
 * [Provider Name] Provider for NeuroLink
 *
 * @module providers/myProvider
 * @description Implements [Provider Name] integration using Vercel AI SDK
 *
 * Features:
 * - [Feature 1]
 * - [Feature 2]
 * - Tool calling support: [yes/no/conditional]
 * - Vision support: [yes/no/model-specific]
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

    // Initialize SDK client
    const client = createMyProviderSDK({
      apiKey: config.apiKey,
      ...(config.baseURL && { baseURL: config.baseURL }),
      fetch: createProxyFetch(),
    });

    this.model = client(this.modelName || getDefaultModel());

    logger.debug("MyProvider initialized", {
      model: this.modelName,
      provider: this.providerName,
    });
  }

  // ==========================================================================
  // Abstract Method Implementations
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
    if (error instanceof TimeoutError) {
      return new Error(`MyProvider request timed out: ${error.message}`);
    }

    const errorObj = error as UnknownRecord;
    const message =
      typeof errorObj?.message === "string"
        ? errorObj.message
        : "Unknown error";

    // Authentication errors
    if (message.includes("Unauthorized") || message.includes("API_KEY")) {
      return new Error(
        "Invalid MyProvider API key. Please check MY_PROVIDER_API_KEY. " +
          "Get your key at https://myprovider.com/keys",
      );
    }

    // Rate limiting
    if (message.includes("rate limit") || message.includes("429")) {
      return new Error(
        "MyProvider rate limit exceeded. Please try again later.",
      );
    }

    // Model errors
    if (message.includes("model") && message.includes("not found")) {
      return new Error(
        `Model '${this.modelName}' not available on MyProvider. ` +
          "See available models at https://myprovider.com/models",
      );
    }

    // Connection errors
    if (
      message.includes("ECONNREFUSED") ||
      message.includes("Failed to fetch")
    ) {
      return new Error(
        "MyProvider API unavailable. Please check your connection.",
      );
    }

    // Tool errors
    if (message.includes("tool") || message.includes("function")) {
      return new Error(
        `MyProvider tool error: ${message}. ` +
          "Use --disableTools or try a different model.",
      );
    }

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
  // Provider-Specific Methods
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

## Summary

NeuroLink's provider architecture follows these key principles:

1. **Inheritance over Composition**: All providers extend `BaseProvider`
2. **Factory Pattern**: Dynamic registration prevents circular dependencies
3. **Lazy Loading**: Providers loaded only when needed
4. **Consistent Interface**: All providers implement the same abstract methods
5. **Error Normalization**: Provider-specific errors transformed to user-friendly messages
6. **Tool Integration**: Built-in support via `supportsTools()` and `getAllTools()`
7. **Multimodal Ready**: Automatic image/file handling via adapters

When implementing a new provider, follow the step-by-step guide and use the template as a starting point. Ensure all abstract methods are implemented and the provider passes the consistency test suite.
