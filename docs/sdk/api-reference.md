# 📚 API Reference

Complete reference for NeuroLink's TypeScript API.

## Core Functions

### `createBestAIProvider(requestedProvider?, modelName?)`

Creates the best available AI provider based on environment configuration and provider availability. All providers inherit from BaseProvider and include built-in tool support.

```typescript
function createBestAIProvider(
  requestedProvider?: string,
  modelName?: string,
): AIProvider;
```

**Parameters:**

- `requestedProvider` (optional): Preferred provider name (`'openai'`, `'bedrock'`, `'vertex'`, `'anthropic'`, `'azure'`, `'google-ai'`, `'huggingface'`, `'ollama'`, `'mistral'`, `'litellm'`, or `'auto'`)
- `modelName` (optional): Specific model to use

**Returns:** `AIProvider` instance

**Examples:**

```typescript
import { createBestAIProvider } from "@juspay/neurolink";

// Auto-select best available provider
const provider = createBestAIProvider();

// Prefer specific provider
const openaiProvider = createBestAIProvider("openai");

// Prefer specific provider and model
const googleProvider = createBestAIProvider("google-ai", "gemini-2.5-flash");

// Use more comprehensive model for detailed responses
const detailedProvider = createBestAIProvider("google-ai", "gemini-2.5-pro");

// Use LiteLLM proxy for access to 100+ models
const litellmProvider = createBestAIProvider("litellm", "openai/gpt-4o");
const claudeProvider = createBestAIProvider(
  "litellm",
  "anthropic/claude-3-5-sonnet",
);
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

const { primary, fallback } = createAIProviderWithFallback("bedrock", "openai");

try {
  const result = await primary.generate({ input: { text: "Hello AI!" } });
} catch (error) {
  console.log("Primary failed, trying fallback...");
  const result = await fallback.generate({ input: { text: "Hello AI!" } });
}
```

## BaseProvider Class

All AI providers inherit from BaseProvider, which provides unified tool support and consistent behavior across all providers.

### Key Features

- **Automatic Tool Support**: All providers include six built-in tools without additional configuration
- **Unified Interface**: Consistent `generate()` and `stream()` methods across all providers
- **Analytics & Evaluation**: Built-in support for usage analytics and quality evaluation
- **Error Handling**: Standardized error handling and recovery

### Built-in Tools

Every provider automatically includes these tools:

```typescript
interface BuiltInTools {
  getCurrentTime: {
    description: "Get the current date and time";
    parameters: { timezone?: string };
  };
  readFile: {
    description: "Read contents of a file";
    parameters: { path: string };
  };
  listDirectory: {
    description: "List contents of a directory";
    parameters: { path: string };
  };
  calculateMath: {
    description: "Perform mathematical calculations";
    parameters: { expression: string };
  };
  writeFile: {
    description: "Write content to a file";
    parameters: { path: string; content: string };
  };
  searchFiles: {
    description: "Search for files by pattern";
    parameters: { pattern: string; path?: string };
  };
}
```

### Example Usage

```typescript
// All providers automatically have tool support
const provider = createBestAIProvider("openai");

// Tools are used automatically when appropriate
const result = await provider.generate({
  input: { text: "What time is it?" },
});
// Result will use getCurrentTime tool automatically

// Disable tools if needed
const resultNoTools = await provider.generate({
  input: { text: "What time is it?" },
  disableTools: true,
});
// Result will use training data instead of real-time tools
```

## AIProviderFactory

Factory class for creating specific provider instances with BaseProvider inheritance.

### `createProvider(providerName, modelName?)`

Creates a specific provider instance.

```typescript
static createProvider(
  providerName: string,
  modelName?: string
): AIProvider
```

**Parameters:**

- `providerName`: Provider name (`'openai'`, `'bedrock'`, `'vertex'`, `'anthropic'`, `'azure'`, `'google-ai'`, `'huggingface'`, `'ollama'`, `'mistral'`, `'litellm'`)
- `modelName` (optional): Specific model to use

**Returns:** `AIProvider` instance

**Examples:**

```typescript
import { AIProviderFactory } from "@juspay/neurolink";

// Create specific providers
const openai = AIProviderFactory.createProvider("openai", "gpt-4o");
const bedrock = AIProviderFactory.createProvider(
  "bedrock",
  "claude-3-7-sonnet",
);
const vertex = AIProviderFactory.createProvider("vertex", "gemini-2.5-flash");

// Use default models
const defaultOpenAI = AIProviderFactory.createProvider("openai");
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

## AIProvider Interface

All providers implement the `AIProvider` interface with these methods:

```typescript
interface AIProvider {
  generate(options: GenerateOptions): Promise<GenerateResult>;
  stream(options: StreamOptions): Promise<StreamResult>; // PRIMARY streaming method

  // Legacy compatibility
  gen?(options: GenerateOptions): Promise<GenerateResult>;
}
```

### 🔗 CLI-SDK Consistency

All providers now include method aliases that match CLI command names for consistent developer experience:

- **`generate()`** - Primary method for content generation (matches `neurolink generate` CLI command)
- **`gen()`** - Short alias for `generate()` (matches `neurolink gen` CLI command)

## 🆕 NeuroLink Class API

### `addMCPServer(serverId, config)`

**NEW!** Programmatically add MCP servers at runtime for dynamic tool ecosystem management.

```typescript
async addMCPServer(
  serverId: string,
  config: {
    command: string;
    args?: string[];
    env?: Record<string, string>;
    cwd?: string;
  }
): Promise<void>
```

**Parameters:**

- `serverId`: Unique identifier for the MCP server
- `config.command`: Command to execute (e.g., 'npx', 'node')
- `config.args`: Optional command arguments array
- `config.env`: Optional environment variables
- `config.cwd`: Optional working directory

**Examples:**

```typescript
import { NeuroLink } from "@juspay/neurolink";
const neurolink = new NeuroLink();

// Add Bitbucket integration
await neurolink.addMCPServer("bitbucket", {
  command: "npx",
  args: ["-y", "@nexus2520/bitbucket-mcp-server"],
  env: {
    BITBUCKET_USERNAME: "your-username",
    BITBUCKET_APP_PASSWORD: "your-app-password",
  },
});

// Add custom database server
await neurolink.addMCPServer("database", {
  command: "node",
  args: ["./custom-db-mcp-server.js"],
  env: { DB_CONNECTION_STRING: "postgresql://..." },
  cwd: "/path/to/server",
});

// Add any MCP-compatible server
await neurolink.addMCPServer("slack", {
  command: "npx",
  args: ["-y", "@slack/mcp-server"],
  env: { SLACK_BOT_TOKEN: "xoxb-..." },
});
```

**Use Cases:**

- External service integration (Bitbucket, Slack, Jira)
- Custom tool development
- Dynamic workflow configuration
- Enterprise application toolchain management

### `getMCPStatus()`

Get current MCP server status and statistics.

```typescript
async getMCPStatus(): Promise<{
  totalServers: number;
  availableServers: number;
  totalTools: number;
}>
```

### `getUnifiedRegistry()`

Access the unified MCP registry for advanced server management.

```typescript
getUnifiedRegistry(): UnifiedMCPRegistry
```

These methods have identical signatures and behavior to `generate()`.

```typescript
// All three methods are equivalent:
const result1 = await provider.generate({ input: { text: "Hello" } });
const result2 = await provider.generate({ input: { text: "Hello" } });
const result3 = await provider.gen({ input: { text: "Hello" } });
```

### `generate(options)`

Generate text content synchronously.

```typescript
async generate(options: GenerateOptions): Promise<GenerateResult>
```

**Parameters:**

```typescript
interface GenerateOptions {
  input: { text: string };
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  schema?: any; // For structured output
  timeout?: number | string; // Timeout in ms or human-readable format (e.g., '30s', '2m', '1h')
  disableTools?: boolean; // Disable tool usage for this request
  enableAnalytics?: boolean; // Enable usage analytics
  enableEvaluation?: boolean; // Enable AI quality scoring
  context?: Record<string, any>; // Custom context for analytics
}
```

**Returns:**

```typescript
interface GenerateResult {
  content: string;
  provider: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  responseTime?: number;

  // 🆕 NEW: AI Enhancement Features
  analytics?: {
    provider: string;
    model: string;
    tokens: { input: number; output: number; total: number };
    cost?: number;
    responseTime: number;
    context?: Record<string, any>;
  };

  evaluation?: {
    relevanceScore: number; // 1-10 scale
    accuracyScore: number; // 1-10 scale
    completenessScore: number; // 1-10 scale
    overallScore: number; // 1-10 scale
    alertLevel?: string; // 'none', 'low', 'medium', 'high'
    reasoning?: string; // AI reasoning for the evaluation

    // Enhanced evaluation fields (when available)
    domainAlignment?: number; // 1-10 scale
    terminologyAccuracy?: number; // 1-10 scale
    toolEffectiveness?: number; // 1-10 scale
    alertSeverity?: string; // Legacy field
    contextUtilization?: {
      conversationUsed: boolean;
      toolsUsed: boolean;
      domainKnowledgeUsed: boolean;
    };
  };
}
```

## 🆕 Enterprise Configuration Interfaces

### `NeuroLinkConfig`

Main configuration interface for enterprise features:

```typescript
interface NeuroLinkConfig {
  providers: ProviderConfig;
  performance: PerformanceConfig;
  analytics: AnalyticsConfig;
  backup: BackupConfig;
  validation: ValidationConfig;
}
```

### `ExecutionContext`

Rich context interface for all MCP operations:

```typescript
interface ExecutionContext {
  sessionId?: string;
  userId?: string;
  aiProvider?: string;
  permissions?: string[];
  cacheOptions?: CacheOptions;
  fallbackOptions?: FallbackOptions;
  metadata?: Record<string, unknown>;
  priority?: "low" | "normal" | "high";
  timeout?: number;
  retries?: number;
  correlationId?: string;
  requestId?: string;
  userAgent?: string;
  clientVersion?: string;
  environment?: string;
}
```

### `ToolInfo`

Comprehensive tool metadata interface:

```typescript
interface ToolInfo {
  name: string;
  description?: string;
  serverId?: string;
  category?: string;
  version?: string;
  parameters?: unknown;
  capabilities?: string[];
  lastUsed?: Date;
  usageCount?: number;
  averageExecutionTime?: number;
}
```

### `ConfigUpdateOptions`

Flexible configuration update options:

```typescript
interface ConfigUpdateOptions {
  createBackup?: boolean;
  validateBeforeUpdate?: boolean;
  mergeStrategy?: "replace" | "merge" | "deep-merge";
  backupRetention?: number;
  onValidationError?: (errors: ValidationError[]) => void;
  onBackupCreated?: (backupPath: string) => void;
}
```

### `McpRegistry`

Registry interface with optional methods for maximum flexibility:

```typescript
interface McpRegistry {
  registerServer?(serverId: string, config?: unknown, context?: ExecutionContext): Promise<void>;
  executeTool?<T>(toolName: string, args?: unknown, context?: ExecutionContext): Promise<T>;
  listTools?(context?: ExecutionContext): Promise<ToolInfo[]>;
  getStats?(): Record<string, { count: number; averageTime: number; totalTime: number }>;
  unregisterServer?(serverId: string): Promise<void>;
  getServerInfo?(serverId: string): Promise<unknown>;
}
}
```

## 🌐 Enterprise Real-time Services API

### `createEnhancedChatService(options)`

Creates an enhanced chat service with WebSocket and SSE support for real-time applications.

```typescript
function createEnhancedChatService(options: {
  provider: AIProvider;
  enableSSE?: boolean;
  enableWebSocket?: boolean;
  streamingConfig?: StreamingConfig;
}): EnhancedChatService;
```

**Parameters:**

```typescript
interface EnhancedChatServiceOptions {
  provider: AIProvider; // AI provider instance
  enableSSE?: boolean; // Enable Server-Sent Events (default: true)
  enableWebSocket?: boolean; // Enable WebSocket support (default: false)
  streamingConfig?: {
    bufferSize?: number; // Buffer size in bytes (default: 8192)
    compressionEnabled?: boolean; // Enable compression (default: true)
    latencyTarget?: number; // Target latency in ms (default: 100)
  };
}
```

**Returns:** `EnhancedChatService` instance

**Example:**

```typescript
import {
  createEnhancedChatService,
  createBestAIProvider,
} from "@juspay/neurolink";

const provider = await createBestAIProvider();
const chatService = createEnhancedChatService({
  provider,
  enableWebSocket: true,
  enableSSE: true,
  streamingConfig: {
    bufferSize: 4096,
    compressionEnabled: true,
    latencyTarget: 50, // 50ms target latency
  },
});

// Stream chat with enhanced capabilities
await chatService.streamChat({
  prompt: "Generate a story",
  onChunk: (chunk) => console.log(chunk),
  onComplete: (result) => console.log("Complete:", result),
});
```

### `NeuroLinkWebSocketServer`

Professional-grade WebSocket server for real-time AI applications.

```typescript
class NeuroLinkWebSocketServer {
  constructor(options?: WebSocketOptions);
  joinRoom(connectionId: string, roomId: string): boolean;
  broadcastToRoom(roomId: string, message: WebSocketMessage): void;
  createStreamingChannel(
    connectionId: string,
    channelId: string,
  ): StreamingChannel;
  sendMessage(connectionId: string, message: WebSocketMessage): boolean;
  on(event: string, handler: Function): void;
}
```

**Constructor Options:**

```typescript
interface WebSocketOptions {
  port?: number; // Server port (default: 8080)
  maxConnections?: number; // Max concurrent connections (default: 1000)
  heartbeatInterval?: number; // Heartbeat interval in ms (default: 30000)
  enableCompression?: boolean; // Enable WebSocket compression (default: true)
  bufferSize?: number; // Message buffer size (default: 8192)
}
```

**Example:**

```typescript
import { NeuroLinkWebSocketServer } from "@juspay/neurolink";

const wsServer = new NeuroLinkWebSocketServer({
  port: 8080,
  maxConnections: 1000,
  enableCompression: true,
});

// Handle connections
wsServer.on("connection", ({ connectionId, userAgent }) => {
  console.log(`New connection: ${connectionId}`);
  wsServer.joinRoom(connectionId, "general-chat");
});

// Handle chat messages
wsServer.on("chat-message", async ({ connectionId, message }) => {
  // Process with AI and broadcast response
  const aiResponse = await processWithAI(message.data.prompt);
  wsServer.broadcastToRoom("general-chat", {
    type: "ai-response",
    data: { text: aiResponse },
  });
});
```

## 📊 Enterprise Telemetry API

### `initializeTelemetry(config)`

Initializes enterprise telemetry with OpenTelemetry integration. Zero overhead when disabled.

```typescript
function initializeTelemetry(config: TelemetryConfig): TelemetryResult;
```

**Parameters:**

```typescript
interface TelemetryConfig {
  serviceName: string; // Service name for telemetry
  endpoint?: string; // OpenTelemetry endpoint
  enableTracing?: boolean; // Enable distributed tracing (default: true)
  enableMetrics?: boolean; // Enable metrics collection (default: true)
  enableLogs?: boolean; // Enable log collection (default: true)
  samplingRate?: number; // Trace sampling rate 0-1 (default: 0.1)
}
```

**Returns:**

```typescript
interface TelemetryResult {
  success: boolean;
  tracingEnabled: boolean;
  metricsEnabled: boolean;
  logsEnabled: boolean;
  endpoint?: string;
  error?: string;
}
```

**Example:**

```typescript
import { initializeTelemetry } from "@juspay/neurolink";

const telemetry = initializeTelemetry({
  serviceName: "my-ai-application",
  endpoint: "http://localhost:4318",
  enableTracing: true,
  enableMetrics: true,
  enableLogs: true,
  samplingRate: 0.1, // Sample 10% of traces
});

if (telemetry.success) {
  console.log("Telemetry initialized successfully");
} else {
  console.error("Telemetry initialization failed:", telemetry.error);
}
```

### `getTelemetryStatus()`

Returns current telemetry status and configuration.

```typescript
function getTelemetryStatus(): Promise<TelemetryStatus>;
```

**Returns:**

```typescript
interface TelemetryStatus {
  enabled: boolean; // Whether telemetry is active
  endpoint?: string; // Current endpoint
  service: string; // Service name
  version: string; // NeuroLink version
  features: {
    tracing: boolean;
    metrics: boolean;
    logs: boolean;
  };
  stats?: {
    tracesCollected: number;
    metricsCollected: number;
    logsCollected: number;
  };
}
```

**Example:**

```typescript
import { getTelemetryStatus } from "@juspay/neurolink";

const status = await getTelemetryStatus();
console.log("Telemetry enabled:", status.enabled);
console.log("Service:", status.service);
console.log("Features:", status.features);

if (status.stats) {
  console.log("Traces collected:", status.stats.tracesCollected);
  console.log("Metrics collected:", status.stats.metricsCollected);
}
```

## 🔧 Enhanced Generation Options

The base `GenerateOptions` interface now supports enterprise features:

```typescript
interface GenerateOptions {
  input: { text: string };
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  schema?: any;
  timeout?: number | string;
  disableTools?: boolean; // Disable tool usage for this request

  // 🆕 NEW: AI Enhancement Features
  enableAnalytics?: boolean; // Enable usage analytics
  enableEvaluation?: boolean; // Enable AI quality scoring
  context?: Record<string, any>; // Custom context for analytics
}
```

**Enhanced Usage Example:**

```typescript
const result = await provider.generate({
  input: { text: "Write a business proposal" },
  enableAnalytics: true,
  enableEvaluation: true,
  context: {
    userId: "12345",
    session: "business-meeting",
    department: "sales",
  },
});

// Access enhancement data
console.log("📊 Analytics:", result.analytics);
// { provider: 'openai', model: 'gpt-4o', tokens: {...}, cost: 0.02, responseTime: 2340 }

console.log("⭐ Evaluation:", result.evaluation);
// { relevanceScore: 9, accuracyScore: 8, completenessScore: 9, overallScore: 8.7 }
```

**Example:**

```typescript
const result = await provider.generate({
  input: { text: "Explain quantum computing in simple terms" },
  temperature: 0.7,
  maxTokens: 500,
  systemPrompt: "You are a helpful science teacher",
});

console.log(result.content);
console.log(`Used ${result.usage?.totalTokens} tokens`);
console.log(`Provider: ${result.provider}, Model: ${result.model}`);
```

### `stream(options)` - **Recommended for New Code**

Generate content with streaming responses using future-ready multi-modal interface.

```typescript
async stream(options: StreamOptions): Promise<StreamResult>
```

**Parameters:**

```typescript
interface StreamOptions {
  input: { text: string }; // Current scope: text input (future: multi-modal)
  output?: {
    format?: "text" | "structured" | "json";
    streaming?: {
      chunkSize?: number;
      bufferSize?: number;
      enableProgress?: boolean;
    };
  };
  provider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number | string;
}
```

**Returns:**

```typescript
interface StreamResult {
  stream: AsyncIterable<{ content: string }>;
  provider?: string;
  model?: string;
  metadata?: {
    streamId?: string;
    startTime?: number;
    totalChunks?: number;
  };
}
```

**Example:**

```typescript
const result = await provider.stream({
  input: { text: "Write a story about AI and humanity" },
  provider: "openai",
  temperature: 0.8,
});

for await (const chunk of result.stream) {
  process.stdout.write(chunk.content);
}
```

## Flexible Parameter Support

NeuroLink supports both object-based and string-based parameters for convenience:

```typescript
// Object format (recommended for complex options)
const result1 = await provider.generate({
  input: { text: "Hello" },
  temperature: 0.7,
  maxTokens: 100,
});

// String format (convenient for simple prompts)
const result2 = await provider.generate({ input: { text: "Hello" } });
```

### Using Timeouts

NeuroLink supports flexible timeout configuration for all AI operations:

```typescript
// Numeric milliseconds
const result1 = await provider.generate({
  input: { text: "Write a story" },
  timeout: 30000, // 30 seconds
});

// Human-readable formats
const result2 = await provider.generate({
  input: { text: "Complex calculation" },
  timeout: "2m", // 2 minutes
});

// Streaming with longer timeout
const stream = await provider.stream({ input: { text:
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
const result = await provider.generate({
  input: { text: "Write a haiku about coding" },
});
console.log(result.content);
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
const result = await provider.generate({
  input: { text: "Summarize the benefits of renewable energy" },
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

const result = await visionProvider.generate({
  input: { text: "Describe what you see in this image" },
  images: ["data:image/jpeg;base64,/9j/4AAQSkZJRgABA..."], // Base64 image
  maxTokens: 500,
});
```

### Function Calling with Smart Model Selection

```typescript
// Select model optimized for function calling
const functionProvider = await factory.createProvider({
  capability: "functionCalling",
  optimizeFor: "speed", // Fast function execution
});

const result = await functionProvider.generate({
  input: { text: "What's the weather in San Francisco?" },
  schema: {
    type: "object",
    properties: {
      location: { type: "string" },
      temperature: { type: "number" },
      conditions: { type: "string" },
    },
  },
});

console.log(JSON.parse(result.content)); // Structured weather data
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

const stream = await streamingProvider.stream({
  input: { text:
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
  const result = await primaryProvider.generate({
    input: { text: "Complex reasoning task" },
  });
  console.log(result.content);
} catch (error) {
  console.log("Primary failed, using fallback...");
  const result = await fallbackProvider.generate({
    input: { text: "Complex reasoning task" },
  });
  console.log(result.content);
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
  | "gemini-2.5-pro" // Default - Latest Gemini Pro
  | "gemini-2.5-flash"; // Fast, efficient responses
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

### LiteLLM Models

```typescript
type LiteLLMModel = string; // Uses provider/model format
// Popular models:
// - 'openai/gpt-4o' (default: openai/gpt-4o-mini)
// - 'anthropic/claude-3-5-sonnet'
// - 'google/gemini-2.0-flash'
// - 'mistral/mistral-large'
// - 'meta/llama-3.1-70b'
// Note: Requires LiteLLM proxy server configuration
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
  provider: string; // Provider name (anthropic, openai, etc.)
  pricing: {
    input: number; // Cost per 1K input tokens
    output: number; // Cost per 1K output tokens
  };
  capabilities: string[]; // ['functionCalling', 'vision', 'code']
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
await registry.getModelsByCapability("functionCalling");

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
  provider: "openai",
  model: "gpt-4o", // Direct model specification
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
      "capabilities": ["functionCalling", "vision", "code"],
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
neurolink models search --capability functionCalling
neurolink models search --capability vision --max-price 0.001

# Get best model for use case
neurolink models best --use-case coding
neurolink models best --use-case vision

# Resolve aliases
neurolink models resolve anthropic claude-latest
neurolink models resolve google fastest

# Test with dynamic model selection
neurolink generate "Hello" --model best-coding
neurolink generate "Describe this" --capability vision --optimize-cost
```

### Type Definitions for Dynamic Models

```typescript
interface DynamicModelOptions {
  // Specify exact model ID
  model?: string;

  // OR specify requirements for automatic selection
  capability?: "functionCalling" | "vision" | "code" | "general";
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

// LiteLLM (100+ Models via Proxy)
LITELLM_BASE_URL?: string                        // Default: 'http://localhost:4000'
LITELLM_API_KEY?: string                         // Default: 'sk-anything'
LITELLM_MODEL?: string                           // Default: 'openai/gpt-4o-mini'

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
DEFAULT_PROVIDER?: 'auto' | 'openai' | 'bedrock' | 'vertex' | 'anthropic' | 'azure' | 'google-ai' | 'huggingface' | 'ollama' | 'mistral' | 'litellm'
FALLBACK_PROVIDER?: 'openai' | 'bedrock' | 'vertex' | 'anthropic' | 'azure' | 'google-ai' | 'huggingface' | 'ollama' | 'mistral' | 'litellm'

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
  | "mistral"
  | "litellm";

interface AIProvider {
  generate(options: GenerateOptions): Promise<GenerateResult>;
  stream(options: StreamOptions | string): Promise<StreamResult>; // PRIMARY streaming method
}

interface GenerateOptions {
  input: { text: string };
  temperature?: number; // 0.0 to 1.0, default: 0.7
  maxTokens?: number; // Default: 1000
  systemPrompt?: string; // System message
  schema?: any; // For structured output
  timeout?: number | string; // Timeout in ms or human-readable format
  disableTools?: boolean; // Disable tool usage
  enableAnalytics?: boolean; // Enable usage analytics
  enableEvaluation?: boolean; // Enable AI quality scoring
  context?: Record<string, any>; // Custom context for analytics
}

interface GenerateResult {
  content: string;
  provider: string;
  model: string;
  usage?: TokenUsage;
  responseTime?: number; // Milliseconds
  analytics?: {
    provider: string;
    model: string;
    tokens: { input: number; output: number; total: number };
    cost?: number;
    responseTime: number;
    context?: Record<string, any>;
  };
  evaluation?: {
    relevanceScore: number; // 1-10 scale
    accuracyScore: number; // 1-10 scale
    completenessScore: number; // 1-10 scale
    overallScore: number; // 1-10 scale
    alertLevel?: string; // 'none', 'low', 'medium', 'high'
    reasoning?: string; // AI reasoning for the evaluation
  };
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
  provider: string; // Provider name (anthropic, openai, etc.)
  pricing: {
    input: number; // Cost per 1K input tokens
    output: number; // Cost per 1K output tokens
  };
  capabilities: string[]; // ['functionCalling', 'vision', 'code']
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
  capability?: "functionCalling" | "vision" | "code" | "general";
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

### Provider Tool Support Status

Due to the factory pattern refactoring, all providers now have consistent tool support through BaseProvider:

| Provider     | Tool Support | Notes                                                |
| ------------ | ------------ | ---------------------------------------------------- |
| OpenAI       | ✅ Full      | All tools work correctly                             |
| Google AI    | ✅ Full      | Excellent tool execution                             |
| Anthropic    | ✅ Full      | Reliable tool usage                                  |
| Azure OpenAI | ✅ Full      | Same as OpenAI                                       |
| Mistral      | ✅ Full      | Good tool support                                    |
| HuggingFace  | ⚠️ Partial   | Model sees tools but may describe instead of execute |
| Vertex AI    | ⚠️ Partial   | Tools available but may not execute                  |
| Ollama       | ❌ Limited   | Requires specific models like gemma3n                |
| Bedrock      | ✅ Full\*    | Requires valid AWS credentials                       |

### Provider-Specific Types

```typescript
// OpenAI specific
interface OpenAIOptions extends GenerateOptions {
  user?: string; // User identifier
  stop?: string | string[]; // Stop sequences
  topP?: number; // Nucleus sampling
  frequencyPenalty?: number; // Reduce repetition
  presencePenalty?: number; // Encourage diversity
}

// Bedrock specific
interface BedrockOptions extends GenerateOptions {
  region?: string; // AWS region override
  inferenceProfile?: string; // Inference profile ARN
}

// Vertex AI specific
interface VertexOptions extends GenerateOptions {
  project?: string; // GCP project override
  location?: string; // GCP location override
  safetySettings?: any[]; // Safety filter settings
}

// Google AI Studio specific
interface GoogleAIOptions extends GenerateOptions {
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
interface AnthropicOptions extends GenerateOptions {
  stopSequences?: string[]; // Custom stop sequences
  metadata?: {
    // Usage tracking
    userId?: string;
  };
}

// Azure OpenAI specific
interface AzureOptions extends GenerateOptions {
  deploymentId?: string; // Override deployment
  apiVersion?: string; // API version override
  user?: string; // User tracking
}

// Hugging Face specific
interface HuggingFaceOptions extends GenerateOptions {
  waitForModel?: boolean; // Wait for model to load
  useCache?: boolean; // Use cached responses
  options?: {
    // Model-specific options
    useGpu?: boolean;
    precision?: string;
  };
}

// Ollama specific
interface OllamaOptions extends GenerateOptions {
  format?: string; // Response format (e.g., 'json')
  context?: number[]; // Conversation context
  stream?: boolean; // Enable streaming
  raw?: boolean; // Raw mode (no templating)
  keepAlive?: string; // Model keep-alive duration
}

// Mistral AI specific
interface MistralOptions extends GenerateOptions {
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
  const result = await provider.generate({
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
    if (available.includes("openai")) return "openai";
    return available[0];
  }
}

// Usage with custom selector
const provider = createBestAIProvider(); // Uses default selection logic
```

### Middleware Support

```typescript
interface AIMiddleware {
  beforeRequest?(options: GenerateOptions): GenerateOptions;
  afterResponse?(result: GenerateResult): GenerateResult;
  onError?(error: Error): Error;
}

class LoggingMiddleware implements AIMiddleware {
  beforeRequest(options: GenerateOptions): GenerateOptions {
    console.log(
      `Generating text for prompt: ${options.prompt.slice(0, 50)}...`,
    );
    return options;
  }

  afterResponse(result: GenerateResult): GenerateResult {
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
async function processBatch(prompts: string[], options: GenerateOptions = {}) {
  const provider = createBestAIProvider();
  const results = [];

  for (const prompt of prompts) {
    try {
      const result = await provider.generate({ ...options, prompt });
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
  private cache = new Map<string, GenerateResult>();
  private provider: AIProvider;

  constructor(provider: AIProvider) {
    this.provider = provider;
  }

  async generate(options: GenerateOptions): Promise<GenerateResult> {
    const key = JSON.stringify(options);

    if (this.cache.has(key)) {
      return { ...this.cache.get(key)!, fromCache: true };
    }

    const result = await this.provider.generate(options);
    this.cache.set(key, result);
    return result;
  }

  async stream(options: StreamOptions): Promise<StreamResult> {
    // Streaming responses are not cached
    return this.provider.stream(options);
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
  defaultOptions?: Partial<GenerateOptions>;
  enableFallback?: boolean;
  enableStreaming?: boolean;
  debug?: boolean;
}

const config: NeuroLinkConfig = {
  defaultProvider: "openai",
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
  TOptions = GenerateOptions,
  TResult = GenerateResult,
> {
  generate(options: TOptions): Promise<TResult>;
}

// Custom typed provider
interface CustomOptions extends GenerateOptions {
  customParameter?: string;
}

interface CustomResult extends GenerateResult {
  customData?: any;
}

const typedProvider: TypedAIProvider<CustomOptions, CustomResult> =
  createBestAIProvider() as any;
```

## MCP (Model Context Protocol) APIs

NeuroLink supports MCP through built-in tools and SDK custom tool registration.

### ✅ Current Status

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
neurolink generate "What time is it?" --debug
neurolink generate "What tools do you have access to?" --debug

# ✅ Working: Discover external MCP servers
neurolink mcp discover --format table

# ✅ Working: Build and test system
npm run build && npm run test:run -- test/mcp-comprehensive.test.ts
```

### MCP CLI Commands

All MCP functionality is available through the NeuroLink CLI:

```bash
# ✅ Working: Built-in tool testing
neurolink generate "What time is it?" --debug

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

MCP servers are configured in `.mcp-config.json`:

```typescript
interface MCPConfig {
  mcpServers: {
    [serverName: string]: {
      command: string; // Command to start server
      args?: string[]; // Optional command arguments
      env?: Record<string, string>; // Environment variables
      cwd?: string; // Working directory
      timeout?: number; // Connection timeout (ms)
      retry?: number; // Retry attempts
      enabled?: boolean; // Server enabled status
    };
  };
  global?: {
    timeout?: number; // Global timeout
    maxConnections?: number; // Max concurrent connections
    logLevel?: "debug" | "info" | "warn" | "error";
  };
}
```

#### **Example Configuration**

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/"],
      "timeout": 5000,
      "enabled": true
    },

      "timeout": 8000,
      "enabled": false
    }
  },
  "global": {
    "timeout": 10000,
    "maxConnections": 5,
    "logLevel": "info"
  }
}
```

### MCP Environment Variables

Configure MCP server authentication through environment variables:

```bash
# Database connections
MYSQL_CONNECTION_STRING=mysql://user:pass@localhost/db

# Web services
BRAVE_API_KEY=BSA...
GOOGLE_API_KEY=AIza...

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
    "params": {"path": "../index.md"}
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
# Install GitHub server
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
# Test configuration
neurolink mcp test
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

[← Back to Main README](../index.md) | [Next: Visual Demos →](../VISUAL-DEMOS.md)
