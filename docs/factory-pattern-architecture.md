# 🏭 Factory Pattern Architecture

Understanding NeuroLink's unified architecture with BaseProvider inheritance and automatic tool support.

## 📋 Overview

NeuroLink uses a **Factory Pattern** architecture with **BaseProvider inheritance** to provide consistent functionality across all AI providers. This design eliminates code duplication and ensures every provider has the same core capabilities, including built-in tool support.

### Key Benefits

- ✅ **Zero Code Duplication**: Shared logic in BaseProvider
- ✅ **Automatic Tool Support**: All providers inherit 6 built-in tools
- ✅ **Consistent Interface**: Same methods across all providers
- ✅ **Easy Provider Addition**: Minimal code for new providers
- ✅ **Centralized Updates**: Fix once, apply everywhere

## 🏗️ Architecture Components

### 1. BaseProvider (Core Foundation)

The `BaseProvider` class is the foundation of all AI providers:

```typescript
// src/lib/core/baseProvider.ts
export abstract class BaseProvider implements LanguageModelV1 {
  // Core properties
  readonly specVersion = "v1";
  readonly defaultObjectGenerationMode = "tool";

  // Abstract methods that providers must implement
  abstract readonly provider: string;
  abstract doGenerate(request: LanguageModelV1CallRequest): PromiseOrValue<...>;
  abstract doStream(request: LanguageModelV1CallRequest): PromiseOrValue<...>;

  // Shared tool management
  protected tools: Map<string, SimpleTool> = new Map();

  // Built-in tools available to all providers
  constructor() {
    this.registerBuiltInTools();
  }

  // Tool registration shared by all providers
  registerTool(name: string, tool: SimpleTool): void {
    this.tools.set(name, tool);
  }

  // Generate with tool support
  async generate(options: GenerateOptions): Promise<GenerateResult> {
    // Common logic for all providers
    // Including tool execution, analytics, evaluation
  }
}
```

### 2. Provider-Specific Implementation

Each provider extends BaseProvider with minimal code:

```typescript
// src/lib/providers/openai.ts
export class OpenAIProvider extends BaseProvider {
  readonly provider = "openai";
  private model: OpenAILanguageModel;

  constructor(apiKey: string, modelName: string = "gpt-4o") {
    super(); // Inherits all BaseProvider functionality
    this.model = openai(modelName, { apiKey });
  }

  // Only implement provider-specific logic
  protected async doGenerate(request: LanguageModelV1CallRequest) {
    return this.model.doGenerate(request);
  }

  protected async doStream(request: LanguageModelV1CallRequest) {
    return this.model.doStream(request);
  }
}
```

### 3. Factory Pattern Implementation

The factory creates providers with consistent configuration:

```typescript
// src/lib/factories/providerRegistry.ts
export class ProviderRegistry {
  private static instance: ProviderRegistry;
  private providers = new Map<string, ProviderFactory>();

  // Register provider factories
  register(name: string, factory: ProviderFactory) {
    this.providers.set(name, factory);
  }

  // Create provider instances
  create(name: string, config?: ProviderConfig): BaseProvider {
    const factory = this.providers.get(name);
    if (!factory) {
      throw new Error(`Unknown provider: ${name}`);
    }
    return factory.create(config);
  }
}

// Usage
const registry = ProviderRegistry.getInstance();
registry.register("openai", new OpenAIProviderFactory());
registry.register("google-ai", new GoogleAIProviderFactory());
// ... register all providers
```

## 🔧 Built-in Tool System

### Tool Registration in BaseProvider

All providers automatically get these tools:

```typescript
private registerBuiltInTools() {
  // Time tool
  this.registerTool('getCurrentTime', {
    description: 'Get the current date and time',
    parameters: z.object({
      timezone: z.string().optional()
    }),
    execute: async ({ timezone }) => {
      return { time: new Date().toLocaleString('en-US', { timeZone: timezone }) };
    }
  });

  // File operations
  this.registerTool('readFile', {
    description: 'Read contents of a file',
    parameters: z.object({
      path: z.string()
    }),
    execute: async ({ path }) => {
      const content = await fs.readFile(path, 'utf-8');
      return { content };
    }
  });

  // Math calculations
  this.registerTool('calculateMath', {
    description: 'Perform mathematical calculations',
    parameters: z.object({
      expression: z.string()
    }),
    execute: async ({ expression }) => {
      const result = evaluate(expression); // Safe math evaluation
      return { result };
    }
  });

  // ... other built-in tools
}
```

### Tool Conversion for AI Models

BaseProvider converts tools to provider-specific format:

```typescript
protected convertToolsForModel(): LanguageModelV1FunctionTool[] {
  const tools: LanguageModelV1FunctionTool[] = [];

  for (const [name, tool] of this.tools) {
    tools.push({
      type: 'function',
      name,
      description: tool.description,
      parameters: tool.parameters ?
        zodToJsonSchema(tool.parameters) :
        { type: 'object', properties: {} }
    });
  }

  return tools;
}
```

## 🌟 Factory Pattern Benefits

### 1. Consistent Provider Creation

```typescript
// All providers created the same way
const provider1 = createBestAIProvider("openai");
const provider2 = createBestAIProvider("google-ai");
const provider3 = createBestAIProvider("anthropic");

// All have the same interface and tools
await provider1.generate({ input: { text: "What time is it?" } });
await provider2.generate({ input: { text: "Calculate 42 * 10" } });
await provider3.generate({ input: { text: "Read config.json" } });
```

### 2. Easy Provider Addition

Adding a new provider requires minimal code:

```typescript
// 1. Create provider class
export class NewAIProvider extends BaseProvider {
  readonly provider = "newai";
  private model: NewAIModel;

  constructor(apiKey: string, modelName: string) {
    super(); // Get all BaseProvider features
    this.model = createNewAIModel(apiKey, modelName);
  }

  protected async doGenerate(request) {
    return this.model.generate(request);
  }

  protected async doStream(request) {
    return this.model.stream(request);
  }
}

// 2. Create factory
export class NewAIProviderFactory implements ProviderFactory {
  create(config?: ProviderConfig): BaseProvider {
    const apiKey = process.env.NEWAI_API_KEY;
    const model = config?.model || "default-model";
    return new NewAIProvider(apiKey, model);
  }
}

// 3. Register with system
registry.register("newai", new NewAIProviderFactory());
```

### 3. Centralized Feature Addition

Add features once in BaseProvider, all providers get them:

```typescript
// Add new feature to BaseProvider
export abstract class BaseProvider {
  // New feature: token counting
  async countTokens(text: string): Promise<number> {
    // Implementation here
    return tokenCount;
  }

  // New feature: cost estimation
  async estimateCost(options: GenerateOptions): Promise<CostEstimate> {
    const tokens = await this.countTokens(options.input.text);
    return this.calculateCost(tokens);
  }
}

// Now ALL providers have token counting and cost estimation!
```

## 📊 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        NeuroLink SDK                         │
├─────────────────────────────────────────────────────────────┤
│                      Factory Layer                           │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │ Provider   │  │ Provider   │  │ Unified    │            │
│  │ Registry   │  │ Factory    │  │ Registry   │            │
│  └────────────┘  └────────────┘  └────────────┘            │
├─────────────────────────────────────────────────────────────┤
│                    BaseProvider (Core)                       │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │ Built-in   │  │ Tool       │  │ Interface  │            │
│  │ Tools (6)  │  │ Management │  │ Methods    │            │
│  └────────────┘  └────────────┘  └────────────┘            │
├─────────────────────────────────────────────────────────────┤
│                   Provider Implementations                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ OpenAI   │ │ Google   │ │ Anthropic│ │ Bedrock  │ ...  │
│  │ Provider │ │ Provider │ │ Provider │ │ Provider │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 Design Principles

### 1. Single Responsibility

Each component has one clear purpose:

- **BaseProvider**: Core functionality and tool management
- **Provider Classes**: Provider-specific API integration
- **Factory**: Provider instantiation
- **Registry**: Provider registration and lookup

### 2. Open/Closed Principle

- **Open for extension**: Easy to add new providers
- **Closed for modification**: Core logic doesn't change

### 3. Dependency Inversion

- Providers depend on BaseProvider abstraction
- High-level modules don't depend on low-level details

### 4. Interface Segregation

- Clean, minimal interface for each provider
- Only implement what's needed

## 🔄 Request Flow

Here's how a request flows through the architecture:

```typescript
// 1. User makes request
const result = await provider.generate({
  input: { text: "What time is it in Tokyo?" }
});

// 2. BaseProvider.generate() handles common logic
async generate(options: GenerateOptions): Promise<GenerateResult> {
  // Convert tools for model
  const tools = this.convertToolsForModel();

  // Create request
  const request: LanguageModelV1CallRequest = {
    inputFormat: "messages",
    messages: this.formatMessages(options),
    tools: options.disableTools ? undefined : tools,
    // ... other common setup
  };

  // 3. Call provider-specific implementation
  const response = await this.doGenerate(request);

  // 4. Handle tool calls if any
  if (response.toolCalls) {
    const toolResults = await this.executeTools(response.toolCalls);
    // Make follow-up request with tool results
  }

  // 5. Format and return result
  return this.formatResponse(response);
}
```

## 💡 Real-World Benefits

### Before Factory Pattern (Old Architecture)

```typescript
// Lots of duplicated code
class OpenAIProvider {
  async generate(options) {
    // Tool setup code (duplicated)
    // Request formatting (duplicated)
    // OpenAI-specific API call
    // Response handling (duplicated)
    // Tool execution (duplicated)
  }
}

class GoogleAIProvider {
  async generate(options) {
    // Tool setup code (duplicated)
    // Request formatting (duplicated)
    // Google-specific API call
    // Response handling (duplicated)
    // Tool execution (duplicated)
  }
}
// ... repeated for each provider
```

### After Factory Pattern (Current Architecture)

```typescript
// No duplication, clean separation
class OpenAIProvider extends BaseProvider {
  provider = "openai";

  doGenerate(request) {
    // Only OpenAI-specific code
    return this.model.doGenerate(request);
  }
}

class GoogleAIProvider extends BaseProvider {
  provider = "google-ai";

  doGenerate(request) {
    // Only Google-specific code
    return this.model.doGenerate(request);
  }
}
// BaseProvider handles all common logic
```

## 🚀 Future Extensibility

The factory pattern makes it easy to add new features:

### 1. New Tool Categories

```typescript
// Add to BaseProvider
protected registerAdvancedTools() {
  this.registerTool('imageGeneration', { ... });
  this.registerTool('audioTranscription', { ... });
  this.registerTool('codeExecution', { ... });
}
```

### 2. Provider Capabilities

```typescript
// Add capability checking
abstract class BaseProvider {
  abstract capabilities: ProviderCapabilities;

  supportsStreaming(): boolean {
    return this.capabilities.streaming;
  }

  supportsTools(): boolean {
    return this.capabilities.tools;
  }

  supportsVision(): boolean {
    return this.capabilities.vision;
  }
}
```

### 3. Middleware System

```typescript
// Add middleware support
abstract class BaseProvider {
  private middleware: Middleware[] = [];

  use(middleware: Middleware) {
    this.middleware.push(middleware);
  }

  async generate(options: GenerateOptions) {
    // Run through middleware chain
    let processedOptions = options;
    for (const mw of this.middleware) {
      processedOptions = await mw.before(processedOptions);
    }

    // ... rest of generation
  }
}
```

## 📚 Code Examples

### Creating Providers

```typescript
import { createBestAIProvider, AIProviderFactory } from "@juspay/neurolink";

// Auto-select best provider
const provider = createBestAIProvider();

// Create specific provider
const openai = AIProviderFactory.createProvider("openai", "gpt-4o");
const googleAI = AIProviderFactory.createProvider(
  "google-ai",
  "gemini-2.0-flash",
);

// All providers have the same interface
const result1 = await openai.generate({ input: { text: "Hello" } });
const result2 = await googleAI.generate({ input: { text: "Hello" } });
```

### Using Built-in Tools

```typescript
// All providers can use tools
const timeResult = await provider.generate({
  input: { text: "What time is it in Paris?" },
});
// Automatically uses getCurrentTime tool

const mathResult = await provider.generate({
  input: { text: "Calculate the square root of 144" },
});
// Automatically uses calculateMath tool

const fileResult = await provider.generate({
  input: { text: "What's in the package.json file?" },
});
// Automatically uses readFile tool
```

### Extending with Custom Tools

```typescript
// Custom tools work with all providers
const provider = createBestAIProvider();

// Register custom tool
provider.registerTool("weather", {
  description: "Get weather for a city",
  parameters: z.object({ city: z.string() }),
  execute: async ({ city }) => {
    // Implementation
    return { city, temp: 72, condition: "sunny" };
  },
});

// Works with any provider that supports tools
const result = await provider.generate({
  input: { text: "What's the weather in London?" },
});
```

## 🏆 Summary

The Factory Pattern architecture provides:

1. **Unified Experience**: All providers work the same way
2. **Automatic Tools**: 6 built-in tools for every provider
3. **Easy Extension**: Add providers with minimal code
4. **Clean Code**: No duplication, clear separation
5. **Future-Proof**: Easy to add new features

This architecture ensures NeuroLink remains maintainable, extensible, and consistent as new AI providers and features are added.

---

**Understanding the architecture helps you build better AI applications! 🚀**
