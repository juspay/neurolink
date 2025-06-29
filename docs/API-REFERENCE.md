# 📚 API Reference

Complete reference for NeuroLink's TypeScript API with **100% MCP reliability** and official SDK integration.

## Core Functions

### `createBestAIProvider(requestedProvider?, modelName?)`

Creates the best available AI provider based on environment configuration and provider availability. This now includes authentication and model availability checks.

```typescript
function createBestAIProvider(
  requestedProvider?: string,
  modelName?: string,
): AIProvider;
```

**Parameters:**

- `requestedProvider` (optional): Preferred provider name (`'google-ai'`, `'openai'`, `'bedrock'`, `'vertex'`, `'anthropic'`, `'azure'`, `'huggingface'`, `'ollama'`, `'mistral'`, or `'auto'`)
- `modelName` (optional): Specific model to use

**Returns:** `AIProvider` instance

**Examples:**

```typescript
import { createBestAIProvider } from "@juspay/neurolink";

// Auto-select best available provider
const provider = createBestAIProvider();

// Prefer specific provider
const googleAiProvider = createBestAIProvider("google-ai");

// Prefer specific provider and model
const googleProvider = createBestAIProvider("google-ai", "gemini-2.5-flash");

// Use more comprehensive model for detailed responses
const detailedProvider = createBestAIProvider("google-ai", "gemini-2.5-pro");
```

### `createAIProviderWithFallback(primary, fallback, modelName?)`

Creates a provider with automatic fallback mechanism.

```typescript
function createAIProviderWithFallback(
  primary: string,
  fallback: string,
  modelName?: string,
): { primary: AIProvider; fallback: AIProvider };
```

**Parameters:**

- `primary`: Primary provider name
- `fallback`: Fallback provider name
- `modelName` (optional): Model name for both providers

**Returns:** Object with `primary` and `fallback` provider instances

**Example:**

```typescript
import { createAIProviderWithFallback } from "@juspay/neurolink";

const { primary, fallback } = createAIProviderWithFallback("google-ai", "bedrock", "openai");

try {
  const result = await primary.generateText({ prompt: "Hello AI!" });
} catch (error) {
  console.log("Primary failed, trying fallback...");
  const result = await fallback.generateText({ prompt: "Hello AI!" });
}
```

## AIProviderFactory

Factory class for creating specific provider instances.

### `createProvider(providerName, modelName?)`

Creates a specific provider instance.

```typescript
static createProvider(
  providerName: string,
  modelName?: string
): AIProvider
```

**Parameters:**

- `providerName`: Provider name (`'google-ai'`, `'openai'`, `'bedrock'`, `'vertex'`, `'anthropic'`, `'azure'`, `'huggingface'`, `'ollama'`, `'mistral'`)
- `modelName` (optional): Specific model to use

**Returns:** `AIProvider` instance

**Examples:**

```typescript
import { AIProviderFactory } from "@juspay/neurolink";

// Create specific providers
const googleAi = AIProviderFactory.createProvider("google-ai", "gpt-4o");
const bedrock = AIProviderFactory.createProvider(
  "bedrock",
  "claude-3-7-sonnet",
);
const vertex = AIProviderFactory.createProvider("vertex", "gemini-2.5-flash");

// Use default models
const defaultGoogleAI = AIProviderFactory.createProvider("google-ai");
```

### `createProviderWithFallback(primary, fallback, modelName?)`

Creates provider with fallback (same as standalone function).

```typescript
static createProviderWithFallback(
  primary: string,
  fallback: string,
  modelName?: string
): { primary: AIProvider; fallback: AIProvider }
```

## MCP Integration API

### MCP Tool Execution

NeuroLink automatically integrates MCP tools with **100% reliability** using the official SDK:

```typescript
// MCP tools are automatically available in generateText
const result = await provider.generateText({
  prompt: "Take a screenshot of google.com",
  // MCP tools integrated automatically - no manual setup required
});
```

### Custom MCP Server Configuration

```typescript
// Configure custom MCP servers via .neuro.config.json
{
  "mcpServers": {
    "filesystem": {
      "name": "filesystem", 
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "./"],
      "transport": "stdio",
      "enabled": true
    }
  }
}
```

## AIProvider Interface

All providers implement the `AIProvider` interface with these methods:

```typescript
interface AIProvider {
  generateText(options: GenerateTextOptions): Promise<GenerateTextResult>;
  streamText(options: StreamTextOptions): Promise<StreamTextResult>;
}
```

### `generateText(options)`

Generate text content synchronously.

```typescript
async generateText(options: GenerateTextOptions): Promise<GenerateTextResult>
```

**Parameters:**

```typescript
interface GenerateTextOptions {
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  schema?: any; // For structured output
  timeout?: number | string; // Timeout in ms or human-readable format (e.g., '30s', '2m', '1h')
}
```

**Returns:**

```typescript
interface GenerateTextResult {
  text: string;
  provider: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  responseTime?: number;
}
```

**Example:**

```typescript
const result = await provider.generateText({
  prompt: "Explain quantum computing in simple terms",
  temperature: 0.7,
  maxTokens: 500,
  systemPrompt: "You are a helpful science teacher",
});

console.log(result.text);
console.log(`Used ${result.usage?.totalTokens} tokens`);
console.log(`Provider: ${result.provider}, Model: ${result.model}`);
```

### `streamText(options)`

Generate text content with streaming responses.

```typescript
async streamText(options: StreamTextOptions): Promise<StreamTextResult>
```

**Parameters:**

```typescript
interface StreamTextOptions {
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  timeout?: number | string; // Timeout in ms or human-readable format (e.g., '30s', '2m', '1h')
}
```

**Returns:**

```typescript
interface StreamTextResult {
  textStream: AsyncIterable<string>;
  provider: string;
  model: string;
  toReadableStream(): ReadableStream<Uint8Array>;
}
```

**Example:**

```typescript
const result = await provider.streamText({
  prompt: "Write a story about AI and humanity",
  temperature: 0.8,
  maxTokens: 1000,
});

// Stream to console
for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}

// Or convert to ReadableStream for web APIs
const stream = result.toReadableStream();
return new Response(stream, {
  headers: { "Content-Type": "text/plain" },
});
```

## Flexible Parameter Support

NeuroLink supports both object-based and string-based parameters for convenience:

```typescript
// Object format (recommended for complex options)
const result1 = await provider.generateText({
  prompt: "Hello",
  temperature: 0.7,
  maxTokens: 100,
});

// String format (convenient for simple prompts)
const result2 = await provider.generateText("Hello");
```

### Using Timeouts

NeuroLink supports flexible timeout configuration for all AI operations:

```typescript
// Numeric milliseconds
const result1 = await provider.generateText({
  prompt: "Write a story",
  timeout: 30000, // 30 seconds
});

// Human-readable formats
const result2 = await provider.generateText({
  prompt: "Complex calculation",
  timeout: "2m", // 2 minutes
});

// Streaming with longer timeout
const stream = await provider.streamText({
  prompt: "Generate long content",
  timeout: "5m", // 5 minutes for streaming
});

// Provider-specific default timeouts
const provider = createBestAIProvider("ollama"); // Uses 5m default timeout
```

**Supported Timeout Formats:**

- Milliseconds: `5000`, `30000`
- Seconds: `'30s'`, `'1.5s'`
- Minutes: `'2m'`, `'0.5m'`
- Hours: `'1h'`, `'0.5h'`

## Usage Examples

### Basic Usage

```typescript
import { createBestAIProvider } from "@juspay/neurolink";

// Simple text generation
const provider = createBestAIProvider();
const result = await provider.generateText("Write a haiku about coding");
console.log(result.text);
```

### Dynamic Model Usage (v1.8.0+)

```typescript
import { AIProviderFactory, DynamicModelRegistry } from "@juspay/neurolink";

// Initialize factory and registry
const factory = new AIProviderFactory();
const registry = new DynamicModelRegistry();

// Use model aliases for convenient access
const provider1 = await factory.createProvider({
  provider: "anthropic",
  model: "claude-latest", // Auto-resolves to latest Claude model
});

// Capability-based model selection
const provider2 = await factory.createProvider({
  provider: "auto",
  capability: "vision", // Automatically selects best vision model
  optimizeFor: "cost", // Prefer cost-effective options
});

// Advanced model resolution
const bestCodingModel = await registry.findBestModel({
  capability: "code",
  maxPrice: 0.005, // Max $0.005 per 1K tokens
  provider: "anthropic", // Prefer Anthropic models
});

console.log(
  `Selected: ${bestCodingModel.modelId} (${bestCodingModel.reasoning})`,
);
```

### Cost-Optimized Generation

```typescript
import { DynamicModelRegistry } from "@juspay/neurolink";

const registry = new DynamicModelRegistry();

// Get the cheapest model for general tasks
const cheapestModel = await registry.getCheapestModel("general");
const provider = await factory.createProvider({
  provider: cheapestModel.provider,
  model: cheapestModel.id,
});

// Generate text with cost optimization
const result = await provider.generateText({
  prompt: "Summarize the benefits of renewable energy",
  maxTokens: 200, // Control output length for cost
});

console.log(
  `Generated with ${result.model} - Cost: $${calculateCost(result.usage, cheapestModel.pricing)}`,
);
```

### Vision Capabilities with Dynamic Selection

```typescript
// Automatically select best vision model
const visionProvider = await factory.createProvider({
  capability: "vision",
  optimizeFor: "quality", // Prefer highest quality vision model
});

const result = await visionProvider.generateText({
  prompt: "Describe what you see in this image",
  images: ["data:image/jpeg;base64,/9j/4AAQSkZJRgABA..."], // Base64 image
  maxTokens: 500,
});
```

### Function Calling with Smart Model Selection

```typescript
// Select model optimized for function calling
const functionProvider = await factory.createProvider({
  capability: "function-calling",
  optimizeFor: "speed", // Fast function execution
});

const result = await functionProvider.generateText({
  prompt: "What's the weather in San Francisco?",
  schema: {
    type: "object",
    properties: {
      location: { type: "string" },
      temperature: { type: "number" },
      conditions: { type: "string" },
    },
  },
});

console.log(JSON.parse(result.text)); // Structured weather data
```

### Model Discovery and Search

```typescript
import { DynamicModelRegistry } from "@juspay/neurolink";

const registry = new DynamicModelRegistry();

// Search for vision models under $0.001 per 1K tokens
const affordableVisionModels = await registry.searchModels({
  capability: "vision",
  maxPrice: 0.001,
  excludeDeprecated: true,
});

console.log("Affordable Vision Models:");
affordableVisionModels.forEach((model) => {
  console.log(`- ${model.name}: $${model.pricing.input}/1K tokens`);
});

// Get all models from a specific provider
const anthropicModels = await registry.searchModels({
  provider: "anthropic",
});

// Resolve aliases to actual model IDs
const resolvedModel = await registry.resolveModel("claude-latest");
console.log(`claude-latest resolves to: ${resolvedModel}`);
```

### Streaming with Dynamic Models

```typescript
// Use fastest model for streaming
const streamingProvider = await factory.createProvider({
  model: "fastest", // Alias for fastest available model
});

const stream = await streamingProvider.streamText({
  prompt: "Write a story about space exploration",
  maxTokens: 1000,
});

// Process streaming response
for await (const chunk of stream.textStream) {
  process.stdout.write(chunk);
}
```

### Provider Fallback with Dynamic Models

```typescript
// Primary: Best quality model, Fallback: Fastest cheap model
const primaryProvider = await factory.createProvider({
  provider: "anthropic",
  model: "claude-latest",
});

const fallbackProvider = await factory.createProvider({
  model: "fastest",
});

try {
  const result = await primaryProvider.generateText("Complex reasoning task");
  console.log(result.text);
} catch (error) {
  console.log("Primary failed, using fallback...");
  const result = await fallbackProvider.generateText("Complex reasoning task");
  console.log(result.text);
}
```

## Supported Models

### OpenAI Models

```typescript
type OpenAIModel =
  | "gpt-4o" // Default - Latest multimodal model
  | "gpt-4o-mini" // Cost-effective variant
  | "gpt-4-turbo"; // High-performance model
```

### Amazon Bedrock Models

```typescript
type BedrockModel =
  | "claude-3-7-sonnet" // Default - Latest Claude model
  | "claude-3-5-sonnet" // Previous generation
  | "claude-3-haiku"; // Fast, lightweight model
```

**Note:** Bedrock requires full inference profile ARNs in environment variables.

### Google Vertex AI Models

```typescript
type VertexModel =
  | "gemini-2.5-flash" // Default - Fast, efficient
  | "claude-sonnet-4@20250514"; // High-quality reasoning
```

### Google AI Studio Models

```typescript
type GoogleAIModel =
  | "gemini-1.5-pro-latest" // Default - Latest Gemini Pro
  | "gemini-2.0-flash-exp" // Experimental enhanced capabilities
  | "gemini-1.5-flash-latest" // Fast, efficient responses
  | "gemini-1.0-pro"; // Stable legacy option
```

### Azure OpenAI Models

```typescript
type AzureModel = string; // Deployment-specific models
// Common deployments:
// - 'gpt-4o' (default)
// - 'gpt-4-turbo'
// - 'gpt-35-turbo'
```

### Hugging Face Models

```typescript
type HuggingFaceModel = string; // Any model from Hugging Face Hub
// Popular models:
// - 'microsoft/DialoGPT-medium' (default)
// - 'gpt2'
// - 'distilgpt2'
// - 'EleutherAI/gpt-neo-2.7B'
```

### Ollama Models

```typescript
type OllamaModel = string; // Any locally installed model
// Popular models:
// - 'llama2' (default)
// - 'codellama'
// - 'mistral'
// - 'vicuna'
```

### Mistral AI Models

```typescript
type MistralModel =
  | "mistral-tiny"
  | "mistral-small" // Default
  | "mistral-medium"
  | "mistral-large";
```

## Dynamic Model System (v1.8.0+)

### Overview

NeuroLink now supports a **dynamic model configuration system** that replaces static TypeScript enums with runtime-configurable model definitions. This enables:

- ✅ **Runtime Model Updates** - Add/remove models without code changes
- ✅ **Smart Model Resolution** - Use aliases like "claude-latest", "best-coding", "fastest"
- ✅ **Cost Optimization** - Automatic best-value model selection
- ✅ **Provider Agnostic** - Unified model interface across all providers
- ✅ **Type Safety** - Zod schema validation for all configurations

### Model Configuration Server

The dynamic system includes a REST API server for model configurations:

```bash
# Start the model configuration server
npm run start:model-server

# Server runs on http://localhost:3001
# API endpoints:
# GET /models - List all models
# GET /models/search?capability=vision - Search by capability
# GET /models/provider/anthropic - Get provider models
# GET /models/resolve/claude-latest - Resolve aliases
```

### Model Configuration Schema

Models are defined in `config/models.json` with comprehensive metadata:

```typescript
interface ModelConfig {
  id: string; // Unique model identifier
  name: string; // Display name
  provider: string; // Provider name (anthropic, google-ai, etc.)
  pricing: {
    input: number; // Cost per 1K input tokens
    output: number; // Cost per 1K output tokens
  };
  capabilities: string[]; // ['function-calling', 'vision', 'code']
  contextWindow: number; // Maximum context length
  deprecated: boolean; // Whether model is deprecated
  aliases: string[]; // Alternative names
  metadata: {
    description: string;
    useCase: string; // 'general', 'coding', 'vision', etc.
    speed: "fast" | "medium" | "slow";
    quality: "high" | "medium" | "low";
  };
}
```

### Smart Model Resolution

The dynamic system provides intelligent model resolution:

```typescript
import { DynamicModelRegistry } from "@juspay/neurolink";

const registry = new DynamicModelRegistry();

// Resolve aliases to actual model IDs
await registry.resolveModel("claude-latest"); // → 'claude-3-5-sonnet'
await registry.resolveModel("fastest"); // → 'gpt-4o-mini'
await registry.resolveModel("best-coding"); // → 'claude-3-5-sonnet'

// Find best model for specific criteria
await registry.findBestModel({
  capability: "vision",
  maxPrice: 0.001, // Maximum cost per 1K tokens
  provider: "anthropic", // Optional provider preference
});

// Get models by capability
await registry.getModelsByCapability("function-calling");

// Cost-optimized model selection
await registry.getCheapestModel("general"); // Cheapest general-purpose model
await registry.getFastestModel("coding"); // Fastest coding model
```

### Dynamic Model Usage in AI Factory

The AI factory automatically uses the dynamic model system:

```typescript
import { AIProviderFactory } from "@juspay/neurolink";

const factory = new AIProviderFactory();

// Use model aliases
const provider1 = await factory.createProvider({
  provider: "anthropic",
  model: "claude-latest", // Resolves to latest Claude model
});

// Use capability-based selection
const provider2 = await factory.createProvider({
  provider: "auto",
  model: "best-vision", // Selects best vision model
  optimizeFor: "cost", // Prefer cost-effective models
});

// Use direct model IDs (still supported)
const provider3 = await factory.createProvider({
  provider: "google-ai",
  model: "gemini-2.5-pro", // Direct model specification
});
```

### Configuration Management

#### Environment Variables for Dynamic Models

```typescript
// Model server configuration
MODEL_SERVER_URL?: string        // Default: 'http://localhost:3001'
MODEL_CONFIG_PATH?: string       // Default: './config/models.json'
ENABLE_DYNAMIC_MODELS?: string   // Default: 'true'

// Model selection preferences
DEFAULT_MODEL_PREFERENCE?: 'cost' | 'speed' | 'quality'  // Default: 'quality'
FALLBACK_MODEL?: string          // Model to use if preferred unavailable
```

#### Configuration File Structure

The `config/models.json` file defines all available models:

```json
{
  "models": [
    {
      "id": "claude-3-5-sonnet",
      "name": "Claude 3.5 Sonnet",
      "provider": "anthropic",
      "pricing": { "input": 0.003, "output": 0.015 },
      "capabilities": ["function-calling", "vision", "code"],
      "contextWindow": 200000,
      "deprecated": false,
      "aliases": ["claude-latest", "best-coding", "claude-sonnet"],
      "metadata": {
        "description": "Most capable Claude model",
        "useCase": "general",
        "speed": "medium",
        "quality": "high"
      }
    }
  ],
  "aliases": {
    "claude-latest": "claude-3-5-sonnet",
    "fastest": "gpt-4o-mini",
    "cheapest": "claude-3-haiku",
    "best-vision": "gpt-4o",
    "best-coding": "claude-3-5-sonnet"
  }
}
```

### CLI Integration

The CLI provides comprehensive dynamic model management:

```bash
# List all models with pricing
neurolink models list

# Search models by capability
neurolink models search --capability function-calling
neurolink models search --capability vision --max-price 0.001

# Get best model for use case
neurolink models best --use-case coding
neurolink models best --use-case vision

# Resolve aliases
neurolink models resolve anthropic claude-latest
neurolink models resolve google fastest

# Test with dynamic model selection
neurolink generate-text "Hello" --model best-coding
neurolink generate-text "Describe this" --capability vision --optimize-cost
```

### Type Definitions for Dynamic Models

```typescript
interface DynamicModelOptions {
  // Specify exact model ID
  model?: string;

  // OR specify requirements for automatic selection
  capability?: "function-calling" | "vision" | "code" | "general";
  maxPrice?: number; // Maximum cost per 1K tokens
  optimizeFor?: "cost" | "speed" | "quality";
  provider?: string; // Preferred provider
}

interface ModelResolutionResult {
  modelId: string; // Resolved model ID
  provider: string; // Provider name
  reasoning: string; // Why this model was selected
  pricing: {
    input: number;
    output: number;
  };
  capabilities: string[];
}

interface ModelSearchOptions {
  capability?: string;
  provider?: string;
  maxPrice?: number;
  minContextWindow?: number;
  excludeDeprecated?: boolean;
}
```

### Migration from Static Models

For existing code using static model enums, the transition is seamless:

```typescript
// OLD: Static enum usage (still works)
const provider = await factory.createProvider({
  provider: "anthropic",
  model: "claude-3-5-sonnet",
});

// NEW: Dynamic model usage (recommended)
const provider = await factory.createProvider({
  provider: "anthropic",
  model: "claude-latest", // Auto-resolves to latest Claude
});

// ADVANCED: Capability-based selection
const provider = await factory.createProvider({
  provider: "auto",
  capability: "vision",
  optimizeFor: "cost",
});
```

The dynamic model system maintains backward compatibility while enabling powerful new capabilities for intelligent model selection and cost optimization.

## Environment Configuration

### Required Environment Variables

```typescript
// OpenAI
OPENAI_API_KEY: string

// Amazon Bedrock
AWS_ACCESS_KEY_ID: string
AWS_SECRET_ACCESS_KEY: string
AWS_REGION?: string              // Default: 'us-east-2'
AWS_SESSION_TOKEN?: string       // For temporary credentials
BEDROCK_MODEL?: string           // Inference profile ARN

// Google Vertex AI (choose one authentication method)
GOOGLE_APPLICATION_CREDENTIALS?: string           // Method 1: File path
GOOGLE_SERVICE_ACCOUNT_KEY?: string              // Method 2: JSON string
GOOGLE_AUTH_CLIENT_EMAIL?: string                // Method 3a: Individual vars
GOOGLE_AUTH_PRIVATE_KEY?: string                 // Method 3b: Individual vars
GOOGLE_VERTEX_PROJECT: string                    // Required for all methods
GOOGLE_VERTEX_LOCATION?: string                  // Default: 'us-east5'

// Google AI Studio
GOOGLE_AI_API_KEY: string                        // API key from AI Studio

// Anthropic
ANTHROPIC_API_KEY?: string                       // Direct Anthropic API

// Azure OpenAI
AZURE_OPENAI_API_KEY?: string                    // Azure OpenAI API key
AZURE_OPENAI_ENDPOINT?: string                   // Azure OpenAI endpoint
AZURE_OPENAI_DEPLOYMENT_ID?: string              // Deployment ID

// Hugging Face
HUGGINGFACE_API_KEY: string                      // HF token from huggingface.co
HUGGINGFACE_MODEL?: string                       // Default: 'microsoft/DialoGPT-medium'

// Ollama (Local)
OLLAMA_BASE_URL?: string                         // Default: 'http://localhost:11434'
OLLAMA_MODEL?: string                            // Default: 'llama2'

// Mistral AI
MISTRAL_API_KEY: string                          // API key from mistral.ai
MISTRAL_MODEL?: string                           // Default: 'mistral-small'

// Dynamic Model System (v1.8.0+)
MODEL_SERVER_URL?: string                        // Default: 'http://localhost:3001'
MODEL_CONFIG_PATH?: string                       // Default: './config/models.json'
ENABLE_DYNAMIC_MODELS?: string                   // Default: 'true'
DEFAULT_MODEL_PREFERENCE?: 'cost' | 'speed' | 'quality'  // Default: 'quality'
FALLBACK_MODEL?: string                          // Model to use if preferred unavailable
```

### Optional Configuration Variables

```typescript
// Provider preferences
DEFAULT_PROVIDER?: 'auto' | 'openai' | 'bedrock' | 'vertex' | 'anthropic' | 'azure' | 'google-ai' | 'huggingface' | 'ollama' | 'mistral'
FALLBACK_PROVIDER?: 'openai' | 'bedrock' | 'vertex' | 'anthropic' | 'azure' | 'google-ai' | 'huggingface' | 'ollama' | 'mistral'

// Feature toggles
ENABLE_STREAMING?: 'true' | 'false'
ENABLE_FALLBACK?: 'true' | 'false'

// Debugging
NEUROLINK_DEBUG?: 'true' | 'false'
LOG_LEVEL?: 'error' | 'warn' | 'info' | 'debug'
```

## Type Definitions

### Core Types

```typescript
type ProviderName =
  | "openai"
  | "bedrock"
  | "vertex"
  | "anthropic"
  | "azure"
  | "google-ai"
  | "huggingface"
  | "ollama"
  | "mistral";

interface AIProvider {
  generateText(
    options: GenerateTextOptions | string,
  ): Promise<GenerateTextResult>;
  streamText(options: StreamTextOptions | string): Promise<StreamTextResult>;
}

interface GenerateTextOptions {
  prompt: string;
  temperature?: number; // 0.0 to 1.0, default: 0.7
  maxTokens?: number; // Default: 1000
  systemPrompt?: string; // System message
  schema?: any; // For structured output
}

interface StreamTextOptions {
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

interface GenerateTextResult {
  text: string;
  provider: string;
  model: string;
  usage?: TokenUsage;
  responseTime?: number; // Milliseconds
}

interface StreamTextResult {
  textStream: AsyncIterable<string>;
  provider: string;
  model: string;
  toReadableStream(): ReadableStream<Uint8Array>;
}

interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}
```

### Dynamic Model Types (v1.8.0+)

```typescript
interface ModelConfig {
  id: string; // Unique model identifier
  name: string; // Display name
  provider: string; // Provider name (anthropic, google-ai, etc.)
  pricing: {
    input: number; // Cost per 1K input tokens
    output: number; // Cost per 1K output tokens
  };
  capabilities: string[]; // ['function-calling', 'vision', 'code']
  contextWindow: number; // Maximum context length
  deprecated: boolean; // Whether model is deprecated
  aliases: string[]; // Alternative names
  metadata: {
    description: string;
    useCase: string; // 'general', 'coding', 'vision', etc.
    speed: "fast" | "medium" | "slow";
    quality: "high" | "medium" | "low";
  };
}

interface DynamicModelOptions {
  // Specify exact model ID
  model?: string;

  // OR specify requirements for automatic selection
  capability?: "function-calling" | "vision" | "code" | "general";
  maxPrice?: number; // Maximum cost per 1K tokens
  optimizeFor?: "cost" | "speed" | "quality";
  provider?: string; // Preferred provider
}

interface ModelResolutionResult {
  modelId: string; // Resolved model ID
  provider: string; // Provider name
  reasoning: string; // Why this model was selected
  pricing: {
    input: number;
    output: number;
  };
  capabilities: string[];
}

interface ModelSearchOptions {
  capability?: string;
  provider?: string;
  maxPrice?: number;
  minContextWindow?: number;
  excludeDeprecated?: boolean;
}

interface DynamicModelRegistry {
  resolveModel(alias: string): Promise<string>;
  findBestModel(options: DynamicModelOptions): Promise<ModelResolutionResult>;
  getModelsByCapability(capability: string): Promise<ModelConfig[]>;
  getCheapestModel(useCase: string): Promise<ModelConfig>;
  getFastestModel(useCase: string): Promise<ModelConfig>;
  searchModels(options: ModelSearchOptions): Promise<ModelConfig[]>;
  getModelConfig(modelId: string): Promise<ModelConfig | null>;
  getAllModels(): Promise<ModelConfig[]>;
}
```

### Provider-Specific Types

```typescript
// OpenAI specific
interface OpenAIOptions extends GenerateTextOptions {
  user?: string; // User identifier
  stop?: string | string[]; // Stop sequences
  topP?: number; // Nucleus sampling
  frequencyPenalty?: number; // Reduce repetition
  presencePenalty?: number; // Encourage diversity
}

// Bedrock specific
interface BedrockOptions extends GenerateTextOptions {
  region?: string; // AWS region override
  inferenceProfile?: string; // Inference profile ARN
}

// Vertex AI specific
interface VertexOptions extends GenerateTextOptions {
  project?: string; // GCP project override
  location?: string; // GCP location override
  safetySettings?: any[]; // Safety filter settings
}

// Google AI Studio specific
interface GoogleAIOptions extends GenerateTextOptions {
  safetySettings?: any[]; // Safety filter settings
  generationConfig?: {
    // Additional generation settings
    stopSequences?: string[];
    candidateCount?: number;
    topK?: number;
    topP?: number;
  };
}

// Anthropic specific
interface AnthropicOptions extends GenerateTextOptions {
  stopSequences?: string[]; // Custom stop sequences
  metadata?: {
    // Usage tracking
    userId?: string;
  };
}

// Azure OpenAI specific
interface AzureOptions extends GenerateTextOptions {
  deploymentId?: string; // Override deployment
  apiVersion?: string; // API version override
  user?: string; // User tracking
}

// Hugging Face specific
interface HuggingFaceOptions extends GenerateTextOptions {
  waitForModel?: boolean; // Wait for model to load
  useCache?: boolean; // Use cached responses
  options?: {
    // Model-specific options
    useGpu?: boolean;
    precision?: string;
  };
}

// Ollama specific
interface OllamaOptions extends GenerateTextOptions {
  format?: string; // Response format (e.g., 'json')
  context?: number[]; // Conversation context
  stream?: boolean; // Enable streaming
  raw?: boolean; // Raw mode (no templating)
  keepAlive?: string; // Model keep-alive duration
}

// Mistral AI specific
interface MistralOptions extends GenerateTextOptions {
  topP?: number; // Nucleus sampling
  randomSeed?: number; // Reproducible outputs
  safeMode?: boolean; // Enable safe mode
  safePrompt?: boolean; // Add safe prompt
}
```

## Error Handling

### Error Types

```typescript
class AIProviderError extends Error {
  provider: string;
  originalError?: Error;
}

class TimeoutError extends AIProviderError {
  // Thrown when operation exceeds specified timeout
  timeout: number; // Timeout in milliseconds
  operation?: string; // Operation that timed out (e.g., 'generate', 'stream')
}

class ConfigurationError extends AIProviderError {
  // Thrown when provider configuration is invalid
}

class AuthenticationError extends AIProviderError {
  // Thrown when authentication fails
}

class RateLimitError extends AIProviderError {
  // Thrown when rate limits are exceeded
  retryAfter?: number; // Seconds to wait before retrying
}

class QuotaExceededError extends AIProviderError {
  // Thrown when usage quotas are exceeded
}
```

### Error Handling Patterns

```typescript
import {
  AIProviderError,
  ConfigurationError,
  AuthenticationError,
  RateLimitError,
  TimeoutError,
} from "@juspay/neurolink";

try {
  const result = await provider.generateText({
    prompt: "Hello",
    timeout: "30s",
  });
} catch (error) {
  if (error instanceof TimeoutError) {
    console.error(`Operation timed out after ${error.timeout}ms`);
    console.error(`Provider: ${error.provider}, Operation: ${error.operation}`);
  } else if (error instanceof ConfigurationError) {
    console.error("Provider not configured:", error.message);
  } else if (error instanceof AuthenticationError) {
    console.error("Authentication failed:", error.message);
  } else if (error instanceof RateLimitError) {
    console.error(`Rate limit exceeded. Retry after ${error.retryAfter}s`);
  } else if (error instanceof AIProviderError) {
    console.error(`Provider ${error.provider} failed:`, error.message);
  } else {
    console.error("Unexpected error:", error);
  }
}
```

## Advanced Usage Patterns

### Custom Provider Selection

```typescript
interface ProviderSelector {
  selectProvider(available: ProviderName[]): ProviderName;
}

class CustomSelector implements ProviderSelector {
  selectProvider(available: ProviderName[]): ProviderName {
    // Custom logic for provider selection
    if (available.includes("bedrock")) return "bedrock";
    if (available.includes("google-ai")) return "google-ai";
    return available[0];
  }
}

// Usage with custom selector
const provider = createBestAIProvider(); // Uses default selection logic
```

### Middleware Support

```typescript
interface AIMiddleware {
  beforeRequest?(options: GenerateTextOptions): GenerateTextOptions;
  afterResponse?(result: GenerateTextResult): GenerateTextResult;
  onError?(error: Error): Error;
}

class LoggingMiddleware implements AIMiddleware {
  beforeRequest(options: GenerateTextOptions): GenerateTextOptions {
    console.log(
      `Generating text for prompt: ${options.prompt.slice(0, 50)}...`,
    );
    return options;
  }

  afterResponse(result: GenerateTextResult): GenerateTextResult {
    console.log(
      `Generated ${result.text.length} characters using ${result.provider}`,
    );
    return result;
  }
}

// Note: Middleware is a planned feature for future versions
```

### Batch Processing

```typescript
async function processBatch(
  prompts: string[],
  options: GenerateTextOptions = {},
) {
  const provider = createBestAIProvider();
  const results = [];

  for (const prompt of prompts) {
    try {
      const result = await provider.generateText({ ...options, prompt });
      results.push({ success: true, ...result });
    } catch (error) {
      results.push({
        success: false,
        prompt,
        error: error.message,
      });
    }

    // Rate limiting: wait 1 second between requests
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return results;
}

// Usage
const prompts = [
  "Explain photosynthesis",
  "What is machine learning?",
  "Describe the solar system",
];

const results = await processBatch(prompts, {
  temperature: 0.7,
  maxTokens: 200,
  timeout: "45s", // Set reasonable timeout for batch operations
});
```

### Response Caching

```typescript
class CachedProvider implements AIProvider {
  private cache = new Map<string, GenerateTextResult>();
  private provider: AIProvider;

  constructor(provider: AIProvider) {
    this.provider = provider;
  }

  async generateText(
    options: GenerateTextOptions,
  ): Promise<GenerateTextResult> {
    const key = JSON.stringify(options);

    if (this.cache.has(key)) {
      return { ...this.cache.get(key)!, fromCache: true };
    }

    const result = await this.provider.generateText(options);
    this.cache.set(key, result);
    return result;
  }

  async streamText(options: StreamTextOptions): Promise<StreamTextResult> {
    // Streaming responses are not cached
    return this.provider.streamText(options);
  }
}

// Usage
const baseProvider = createBestAIProvider();
const cachedProvider = new CachedProvider(baseProvider);
```

## TypeScript Integration

### Type-Safe Configuration

```typescript
interface NeuroLinkConfig {
  defaultProvider?: ProviderName;
  fallbackProvider?: ProviderName;
  defaultOptions?: Partial<GenerateTextOptions>;
  enableFallback?: boolean;
  enableStreaming?: boolean;
  debug?: boolean;
}

const config: NeuroLinkConfig = {
  defaultProvider: "google-ai",
  fallbackProvider: "bedrock",
  defaultOptions: {
    temperature: 0.7,
    maxTokens: 500,
  },
  enableFallback: true,
  debug: false,
};
```

### Generic Provider Interface

```typescript
interface TypedAIProvider<
  TOptions = GenerateTextOptions,
  TResult = GenerateTextResult,
> {
  generateText(options: TOptions): Promise<TResult>;
}

// Custom typed provider
interface CustomOptions extends GenerateTextOptions {
  customParameter?: string;
}

interface CustomResult extends GenerateTextResult {
  customData?: any;
}

const typedProvider: TypedAIProvider<CustomOptions, CustomResult> =
  createBestAIProvider() as any;
```

## MCP (Model Context Protocol) APIs

NeuroLink supports external MCP servers for extended functionality through both CLI and programmatic interfaces.

### ✅ Current Status (v1.7.1)

**Built-in Tools: ✅ FULLY FUNCTIONAL**

- ✅ Time tool - Returns current time in human-readable format
- ✅ Built-in utilities - All system tools working correctly
- ✅ CLI integration - Direct tool execution via CLI
- ✅ Function calling - Tools properly registered and callable

**External MCP Tools: 🔍 DISCOVERY PHASE**

- ✅ Auto-discovery working - 58+ external servers found
- ✅ Configuration parsing - Resilient JSON parser handles all formats
- ✅ Cross-platform support - macOS, Linux, Windows configurations
- 🔧 Tool activation - External servers discovered but in placeholder mode
- 🔧 Communication protocol - Under active development for full activation

### Current Working Examples

```bash
# ✅ Working: Test built-in tools
neurolink generate-text "What time is it?" --debug
neurolink generate-text "What tools do you have access to?" --debug

# ✅ Working: Discover external MCP servers
neurolink mcp discover --format table

# ✅ Working: Build and test system
npm run build && npm run test:run -- src/test/mcp-comprehensive.test.ts
```

### MCP CLI Commands

All MCP functionality is available through the NeuroLink CLI:

```bash
# ✅ Working: Built-in tool testing
neurolink generate-text "What time is it?" --debug

# ✅ Working: Server discovery and management
neurolink mcp discover [--format table|json|yaml]  # Auto-discover MCP servers
neurolink mcp list [--status]     # List discovered servers with optional status

# 🔧 In Development: Server management and execution
neurolink mcp install <server>    # Install popular MCP servers (discovery phase)
neurolink mcp add <name> <command> # Add custom MCP server
neurolink mcp remove <server>     # Remove MCP server
neurolink mcp test <server>       # Test server connectivity
neurolink mcp tools <server>      # List available tools for server
neurolink mcp execute <server> <tool> [args] # Execute specific tool

# Configuration management
neurolink mcp config             # Show MCP configuration
neurolink mcp config --reset     # Reset MCP configuration
```

### MCP Server Types

#### **Built-in Server Support**

NeuroLink includes built-in installation support for popular MCP servers:

```typescript
type PopularMCPServer =
  | "filesystem" // File operations
  | "github" // GitHub integration
  | "postgres" // PostgreSQL database
  | "puppeteer" // Web browsing
  | "brave-search"; // Web search
```

**Additional MCP Servers**
While not included in the auto-install feature, any MCP-compatible server can be manually added, including:

- `git` - Git operations
- `fetch` - Web fetching
- `google-drive` - Google Drive integration
- `atlassian` - Jira/Confluence integration
- `slack` - Slack integration
- Any custom MCP server

Use `neurolink mcp add <name> <command>` to add these servers manually.

#### **Custom Server Support**

Add any MCP-compatible server:

```bash
# Python server
neurolink mcp add myserver "python /path/to/server.py"

# Node.js server
neurolink mcp add nodeserver "node /path/to/server.js"

# Docker container
neurolink mcp add dockerserver "docker run my-mcp-server"

# SSE (Server-Sent Events) endpoint
neurolink mcp add sseserver "sse://https://api.example.com/mcp"
```

### MCP Configuration

#### **Configuration File**

MCP servers are configured in `.neuro.config.json` (NeuroLink v2.0+ enhanced format):

```typescript
interface MCPConfig {
  mcpServers: {
    [serverName: string]: {
      name?: string; // Display name
      command: string; // Command to start server
      args?: string[]; // Optional command arguments
      transport?: "stdio" | "sse"; // Transport type
      env?: Record<string, string>; // Environment variables
      url?: string; // URL for SSE transport
      description?: string; // Server description
      enabled?: boolean; // Server enabled status (default: true)
    };
  };
  autoDiscovery?: {
    enabled: boolean; // Enable auto-discovery
    autoRegister: boolean; // Auto-register discovered servers
    sources?: string[]; // Discovery sources to check
  };
  defaultRegistry?: {
    enabled: boolean; // Enable default registry
    includeBuiltInTools: boolean; // Include built-in tools
  };
  globalConfig?: {
    timeout?: number; // Connection timeout (ms)
    retries?: number; // Retry attempts
    logLevel?: string; // Log level
    enableDebug?: boolean; // Debug mode
    autoDiscovery?: boolean; // Global auto-discovery setting
    maxConcurrentServers?: number; // Max concurrent servers
  };
  neurolink?: {
    enableInternalServers?: boolean; // Enable internal servers
    enableExternalServers?: boolean; // Enable external servers
    aiCore?: {
      enabled: boolean; // Enable AI core tools
      tools: string[]; // Available AI tools
    };
    utilities?: {
      enabled: boolean; // Enable utility tools
      tools: string[]; // Available utility tools
    };
  };
  metadata?: {
    version?: string; // Configuration version
    description?: string; // Configuration description
    lastUpdated?: string; // Last update date
    documentation?: string; // Documentation URL
    configFormat?: string; // Configuration format identifier
  };
}
```

#### **Example Configuration**

```json
{
  "mcpServers": {
    "filesystem": {
      "name": "filesystem",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "./"],
      "transport": "stdio",
      "description": "File and directory operations for current project",
      "enabled": true
    },
    "github": {
      "name": "github",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "transport": "stdio",
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_your_token_here"
      },
      "description": "GitHub repository management",
      "enabled": false
    },
    "postgres": {
      "name": "postgres",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres", "postgresql://user:pass@host:port/db"],
      "transport": "stdio",
      "description": "PostgreSQL database operations",
      "enabled": false
    }
  },
  "autoDiscovery": {
    "enabled": true,
    "autoRegister": true,
    "sources": ["claude", "vscode", "cursor", "windsurf", "generic"]
  },
  "defaultRegistry": {
    "enabled": true,
    "includeBuiltInTools": true
  },
  "globalConfig": {
    "timeout": 30000,
    "retries": 3,
    "logLevel": "info",
    "enableDebug": false,
    "autoDiscovery": true,
    "maxConcurrentServers": 10
  },
  "neurolink": {
    "enableInternalServers": true,
    "enableExternalServers": true,
    "aiCore": {
      "enabled": true,
      "tools": ["generate-text", "select-provider", "check-provider-status"]
    },
    "utilities": {
      "enabled": true,
      "tools": ["get-current-time", "calculate-date-difference", "format-number"]
    }
  },
  "metadata": {
    "version": "2.0.0",
    "description": "NeuroLink Configuration - Unified AI and MCP Server Management",
    "lastUpdated": "2025-01-27",
    "documentation": "https://github.com/juspay/neurolink/docs/CONFIGURATION.md",
    "configFormat": "neurolink-v2"
  }
}
```

### MCP Environment Variables

Configure MCP server authentication through environment variables:

```bash
# GitHub integration
GITHUB_PERSONAL_ACCESS_TOKEN=ghp_...

# Database connections
POSTGRES_CONNECTION_STRING=postgresql://user:pass@localhost/db
MYSQL_CONNECTION_STRING=mysql://user:pass@localhost/db

# Web services
BRAVE_API_KEY=BSA...
GOOGLE_API_KEY=AIza...

# Custom server configuration
MCP_CUSTOM_SERVER_URL=https://api.example.com
MCP_CUSTOM_API_KEY=key_...
```

### MCP Tool Execution

#### **Available Tool Categories**

```typescript
interface MCPToolCategory {
  filesystem: {
    read_file: { path: string };
    write_file: { path: string; content: string };
    list_directory: { path: string };
    search_files: { query: string; path?: string };
  };

  github: {
    get_repository: { owner: string; repo: string };
    create_issue: { owner: string; repo: string; title: string; body?: string };
    list_issues: { owner: string; repo: string; state?: "open" | "closed" };
    create_pull_request: {
      owner: string;
      repo: string;
      title: string;
      head: string;
      base: string;
    };
  };

  database: {
    execute_query: { query: string; params?: any[] };
    list_tables: {};
    describe_table: { table: string };
  };

  web: {
    navigate: { url: string };
    click: { selector: string };
    type: { selector: string; text: string };
    screenshot: { name?: string };
  };
}
```

#### **Tool Execution Examples**

```bash
# File operations
neurolink mcp exec filesystem read_file --params '{"path": "/path/to/file.txt"}'
neurolink mcp exec filesystem list_directory --params '{"path": "/home/user"}'

# GitHub operations
neurolink mcp exec github get_repository --params '{"owner": "juspay", "repo": "neurolink"}'
neurolink mcp exec github create_issue --params '{"owner": "juspay", "repo": "neurolink", "title": "New feature request"}'

# Database operations
neurolink mcp exec postgres execute_query --params '{"query": "SELECT * FROM users LIMIT 10"}'
neurolink mcp exec postgres list_tables --params '{}'

# Web operations
neurolink mcp exec puppeteer navigate --params '{"url": "https://example.com"}'
neurolink mcp exec puppeteer screenshot --params '{"name": "homepage"}'
```

### MCP Demo Server Integration

**FULLY FUNCTIONAL**: NeuroLink's demo server (`neurolink-demo/server.js`) includes working MCP API endpoints that you can use immediately:

#### **How to Access These APIs**

```bash
# 1. Start the demo server
cd neurolink-demo
node server.js
# Server runs at http://localhost:9876

# 2. Use any HTTP client to call the APIs
curl http://localhost:9876/api/mcp/servers
curl -X POST http://localhost:9876/api/mcp/install -d '{"serverName": "filesystem"}'
```

#### **Available MCP API Endpoints**

```typescript
// ALL ENDPOINTS WORKING IN DEMO SERVER
interface MCPDemoEndpoints {
  "GET /api/mcp/servers": {
    // List all configured MCP servers with live status
    response: {
      servers: Array<{
        name: string;
        status: "connected" | "disconnected" | "error";
        tools: string[];
        lastConnected?: string;
      }>;
    };
  };

  "POST /api/mcp/install": {
    // Install popular MCP servers (filesystem, github, postgres, etc.)
    body: { serverName: string };
    response: {
      success: boolean;
      message: string;
      configuration?: Record<string, any>;
    };
  };

  "DELETE /api/mcp/servers/:name": {
    // Remove MCP servers
    params: { name: string };
    response: {
      success: boolean;
      message: string;
    };
  };

  "POST /api/mcp/test/:name": {
    // Test server connectivity and get diagnostics
    params: { name: string };
    response: {
      success: boolean;
      status: "connected" | "disconnected" | "error";
      responseTime?: number;
      error?: string;
    };
  };

  "GET /api/mcp/tools/:name": {
    // Get available tools for specific server
    params: { name: string };
    response: {
      success: boolean;
      tools: Array<{
        name: string;
        description: string;
        parameters: Record<string, any>;
      }>;
    };
  };

  "POST /api/mcp/execute": {
    // Execute MCP tools via HTTP API
    body: {
      serverName: string;
      toolName: string;
      params: Record<string, any>;
    };
    response: {
      success: boolean;
      result?: any;
      error?: string;
      executionTime?: number;
    };
  };

  "POST /api/mcp/servers/custom": {
    // Add custom MCP servers
    body: {
      name: string;
      command: string;
      options?: Record<string, any>;
    };
    response: {
      success: boolean;
      message: string;
    };
  };

  "GET /api/mcp/status": {
    // Get comprehensive MCP system status
    response: {
      summary: {
        totalServers: number;
        availableServers: number;
        cliAvailable: boolean;
      };
      servers: Record<string, any>;
    };
  };

  "POST /api/mcp/workflow": {
    // Execute predefined MCP workflows
    body: {
      workflowType: string;
      description?: string;
      servers?: string[];
    };
    response: {
      success: boolean;
      workflowType: string;
      steps: string[];
      result: string;
      data: any;
    };
  };
}
```

#### **Real-World Usage Examples**

**1. File Operations via HTTP API**

```bash
# Install filesystem server
curl -X POST http://localhost:9876/api/mcp/install \
  -H "Content-Type: application/json" \
  -d '{"serverName": "filesystem"}'

# Read a file via HTTP
curl -X POST http://localhost:9876/api/mcp/execute \
  -H "Content-Type: application/json" \
  -d '{
    "serverName": "filesystem",
    "toolName": "read_file",
    "params": {"path": "README.md"}
  }'

# List directory contents
curl -X POST http://localhost:9876/api/mcp/execute \
  -H "Content-Type: application/json" \
  -d '{
    "serverName": "filesystem",
    "toolName": "list_directory",
    "params": {"path": "."}
  }'
```

**2. GitHub Integration via HTTP API**

```bash
# Install GitHub server (requires GITHUB_PERSONAL_ACCESS_TOKEN)
curl -X POST http://localhost:9876/api/mcp/install \
  -H "Content-Type: application/json" \
  -d '{"serverName": "github"}'

# Get repository information
curl -X POST http://localhost:9876/api/mcp/execute \
  -H "Content-Type: application/json" \
  -d '{
    "serverName": "github",
    "toolName": "get_repository",
    "params": {"owner": "juspay", "repo": "neurolink"}
  }'
```

**3. Web Interface Integration**

```javascript
// JavaScript example for web applications
async function callMCPTool(serverName, toolName, params) {
  const response = await fetch("http://localhost:9876/api/mcp/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ serverName, toolName, params }),
  });

  const result = await response.json();
  return result;
}

// Use in your web app
const fileContent = await callMCPTool("filesystem", "read_file", {
  path: "/path/to/file.txt",
});
```

#### **What You Can Use This For**

**1. Web Application MCP Integration**

- Build web dashboards that manage MCP servers
- Create file management interfaces
- Integrate GitHub operations into web apps
- Build database administration tools

**2. API-First MCP Development**

- Test MCP tools without CLI setup
- Prototype MCP integrations quickly
- Build custom MCP management interfaces
- Create automated workflows via HTTP

**3. Cross-Platform MCP Access**

- Access MCP tools from any programming language
- Build mobile apps that use MCP functionality
- Create browser extensions with MCP features
- Integrate with existing web services

**4. Educational and Testing**

- Learn MCP concepts through web interface
- Test MCP server configurations
- Debug MCP tool interactions
- Demonstrate MCP capabilities to others

#### **Getting Started**

```bash
# 1. Clone and setup
git clone https://github.com/juspay/neurolink
cd neurolink/neurolink-demo

# 2. Install dependencies
npm install

# 3. Configure environment (optional)
cp .env.example .env
# Add any needed API keys

# 4. Start server
node server.js

# 5. Test APIs
curl http://localhost:9876/api/mcp/status
curl http://localhost:9876/api/mcp/servers
```

**The demo server provides a production-ready MCP HTTP API that you can integrate into any application or service.**

### MCP Error Handling

```typescript
class MCPError extends Error {
  server: string;
  tool?: string;
  originalError?: Error;
}

class MCPConnectionError extends MCPError {
  // Thrown when server connection fails
}

class MCPToolError extends MCPError {
  // Thrown when tool execution fails
}

class MCPConfigurationError extends MCPError {
  // Thrown when server configuration is invalid
}

// Error handling example
try {
  const result = await executeCommand(
    'neurolink mcp execute filesystem read_file --path="/nonexistent"',
  );
} catch (error) {
  if (error instanceof MCPConnectionError) {
    console.error(`Failed to connect to server ${error.server}`);
  } else if (error instanceof MCPToolError) {
    console.error(
      `Tool ${error.tool} failed on server ${error.server}: ${error.message}`,
    );
  }
}
```

### MCP Integration Best Practices

#### **Server Management**

```bash
# Test connectivity before using
neurolink mcp test filesystem

# Install servers explicitly
neurolink mcp install github
neurolink mcp install postgres

# Monitor server status
neurolink mcp list --status
```

#### **Environment Setup**

```bash
# Use environment variables for sensitive data
export GITHUB_PERSONAL_ACCESS_TOKEN="ghp_..."
export POSTGRES_CONNECTION_STRING="postgresql://..."

# Test configuration
neurolink mcp test github
neurolink mcp test postgres
```

#### **Error Recovery**

```bash
# Reset configuration if needed
neurolink mcp config --reset

# Reinstall problematic servers
neurolink mcp remove filesystem
neurolink mcp install filesystem
neurolink mcp test filesystem
```

#### **Performance Optimization**

```bash
# Limit concurrent connections in config
{
  "global": {
    "maxConnections": 3,
    "timeout": 5000
  }
}

# Disable unused servers
{
  "mcpServers": {
    "heavyServer": {
      "command": "...",
      "enabled": false
    }
  }
}
```

---

[← Back to Main README](../README.md) | [Next: Visual Demos →](./VISUAL-DEMOS.md)
