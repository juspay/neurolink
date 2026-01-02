# API Reference

Complete reference for NeuroLink's TypeScript API.

## NeuroLink Class

The `NeuroLink` class is the main entry point for all SDK functionality.

### Constructor: `new NeuroLink(config?)`

Create a new NeuroLink instance with optional configuration for conversation memory, middleware, and orchestration.

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink(config?: NeuroLinkConstructorConfig)
```

**Parameters:**

```typescript
interface NeuroLinkConstructorConfig {
  // Conversation Memory
  conversationMemory?: {
    enabled: boolean;
    store?: "memory" | "redis"; // Default: 'memory'
    redis?: {
      host?: string;
      port?: number;
      password?: string;
      ttl?: number; // Time-to-live in seconds
    };
    maxSessions?: number;
    maxTurnsPerSession?: number;
  };

  // Middleware Configuration
  middleware?: {
    preset?: "default" | "security" | "all";
    middlewareConfig?: {
      guardrails?: {
        enabled: boolean;
        config?: {
          badWords?: {
            enabled: boolean;
            list?: string[];
          };
          modelFilter?: {
            enabled: boolean;
            filterModel?: string;
          };
        };
      };
      analytics?: {
        enabled: boolean;
      };
    };
  };

  // Provider Orchestration
  enableOrchestration?: boolean;
  orchestrationConfig?: {
    fallbackChain?: string[]; // Provider fallback order
    preferCheap?: boolean;
  };
}
```

**Examples:**

```typescript
import { NeuroLink } from "@juspay/neurolink";

// Basic usage (no configuration)
const neurolink = new NeuroLink();

// With Redis conversation memory
const neurolinkWithMemory = new NeuroLink({
  conversationMemory: {
    enabled: true,
    store: "redis",
    redis: {
      host: "localhost",
      port: 6379,
      ttl: 7 * 24 * 60 * 60, // 7 days
    },
    maxTurnsPerSession: 100,
  },
});

// With guardrails middleware
const neurolinkWithGuardrails = new NeuroLink({
  middleware: {
    preset: "security", // Enables guardrails automatically
    middlewareConfig: {
      guardrails: {
        enabled: true,
        config: {
          badWords: {
            enabled: true,
            list: ["profanity1", "profanity2"],
          },
        },
      },
    },
  },
});

// Complete configuration with all features
const neurolinkComplete = new NeuroLink({
  conversationMemory: {
    enabled: true,
    store: "redis",
  },
  middleware: {
    preset: "all", // Analytics + Guardrails
  },
  enableOrchestration: true,
});
```

See also:

- [Redis Conversation Export](../features/conversation-history.md)
- [Guardrails Middleware](../features/guardrails.md)
- [Provider Orchestration](../features/provider-orchestration.md)

---

## Core Methods

### `generate(options)` {#generate}

Generate text content synchronously.

```typescript
async generate(options: GenerateOptions): Promise<GenerateResult>
```

**Parameters:**

```typescript
interface GenerateOptions {
  input: {
    text: string;
    images?: Array<string | Buffer>; // Local paths, URLs, or buffers
    csvFiles?: Array<string | Buffer>; // CSV files (converted to text)
    pdfFiles?: Array<string | Buffer>; // PDF files (native binary)
    officeFiles?: Array<string | Buffer>; // Office documents (DOCX, PPTX, XLSX)
    files?: Array<string | Buffer>; // Auto-detect file types
    content?: Array<TextContent | ImageContent>; // Advanced multimodal payloads
  };
  provider?: AIProviderName | string; // Leave undefined to allow orchestration/fallback
  model?: string; // Model slug (e.g., 'gpt-4o')
  region?: string; // Regional routing for providers that support it
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  schema?: ValidationSchema; // Structured output schema
  tools?: Record<string, Tool>; // Optional tool overrides
  timeout?: number | string; // 120 (seconds) or '2m', '1h'
  disableTools?: boolean;
  enableAnalytics?: boolean;
  enableEvaluation?: boolean;
  evaluationDomain?: string;
  toolUsageContext?: string;
  context?: Record<string, JsonValue>;
  conversationHistory?: Array<{ role: string; content: string }>;
  thinkingLevel?: "minimal" | "low" | "medium" | "high"; // Gemini 3 models only

  // Document processing options
  officeOptions?: OfficeProcessorOptions;
}
```

**Returns:**

```typescript
interface GenerateResult {
  content: string;
  provider?: string;
  model?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  responseTime?: number;
  toolCalls?: Array<{
    toolCallId: string;
    toolName: string;
    args: Record<string, unknown>;
  }>;
  toolResults?: unknown[];
  toolsUsed?: string[];

  analytics?: {
    provider: string;
    model?: string;
    tokenUsage: { input: number; output: number; total: number };
    cost?: number;
    requestDuration?: number;
    context?: Record<string, JsonValue>;
  };

  evaluation?: {
    relevanceScore: number;
    accuracyScore: number;
    completenessScore: number;
    overallScore: number;
    alertLevel?: "none" | "low" | "medium" | "high";
    reasoning?: string;
    suggestedImprovements?: string;
    domainAlignment?: number;
    terminologyAccuracy?: number;
    toolEffectiveness?: number;
    contextUtilization?: {
      conversationUsed: boolean;
      toolsUsed: boolean;
      domainKnowledgeUsed: boolean;
    };
  };
}
```

**Basic Example:**

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain quantum computing in simple terms" },
  provider: "openai",
  model: "gpt-4o",
  temperature: 0.7,
  maxTokens: 500,
  systemPrompt: "You are a helpful science teacher",
});

console.log(result.content);
console.log(`Used ${result.usage?.totalTokens} tokens`);
console.log(`Provider: ${result.provider}, Model: ${result.model}`);
```

**With Analytics and Evaluation:**

```typescript
const result = await neurolink.generate({
  input: { text: "Write a business proposal" },
  provider: "openai",
  enableAnalytics: true,
  enableEvaluation: true,
  context: {
    userId: "12345",
    session: "business-meeting",
    department: "sales",
  },
});

// Access enhancement data
console.log("Analytics:", result.analytics);
// { provider: 'openai', model: 'gpt-4o', tokens: {...}, cost: 0.02, responseTime: 2340 }

console.log("Evaluation:", result.evaluation);
// { relevanceScore: 9, accuracyScore: 8, completenessScore: 9, overallScore: 8.7 }
```

### Schema Limitations by Provider

**Google Gemini Limitation (Vertex AI and Google AI Studio):**

- Cannot combine `schema` + `tools` (including built-in tools)
- Solution: Use `disableTools: true` when using schemas
- **Note:** This limitation applies to all Gemini models, including Gemini 3 models

**Example:**

```typescript
// Will fail with Google providers
const result = await neurolink.generate({
  input: { text: "..." },
  schema: MySchema,
  provider: "vertex", // Error: Function calling with JSON mime type unsupported
});

// Correct for Google providers
const result = await neurolink.generate({
  input: { text: "..." },
  schema: MySchema,
  provider: "vertex",
  disableTools: true, // Required
});

// Works without disableTools
const result = await neurolink.generate({
  input: { text: "..." },
  schema: MySchema,
  provider: "openai", // OpenAI supports both
});
```

**Provider Support Matrix:**

| Provider           | Tools + Schema           | Notes                 |
| ------------------ | ------------------------ | --------------------- |
| OpenAI             | Full Support             | No limitations        |
| Anthropic          | Full Support             | No limitations        |
| Vertex AI (Gemini) | Use `disableTools: true` | Google API limitation |
| Google AI Studio   | Use `disableTools: true` | Google API limitation |
| Vertex AI (Claude) | Full Support             | Uses Anthropic models |
| Azure OpenAI       | Full Support             | No limitations        |
| Bedrock            | Full Support             | No limitations        |

---

### `stream(options)`

Generate content with streaming responses.

```typescript
async stream(options: StreamOptions): Promise<StreamResult>
```

**Parameters:**

```typescript
interface StreamOptions {
  input: { text: string };
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
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.stream({
  input: { text: "Write a story about space exploration" },
  provider: "openai",
  temperature: 0.8,
});

for await (const chunk of result.stream) {
  process.stdout.write(chunk.content);
}
```

---

### `gen(options)`

Short alias for `generate()`. Identical signature and behavior.

```typescript
const result = await neurolink.gen({
  input: { text: "Hello" },
  provider: "openai",
});
```

---

## MCP Server Management

### `addMCPServer(serverId, config)`

Programmatically add MCP servers at runtime. Supports stdio, SSE, WebSocket, and HTTP transports.

```typescript
async addMCPServer(
  serverId: string,
  config: {
    // For stdio transport
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    cwd?: string;
    // For HTTP transport
    transport?: "stdio" | "sse" | "websocket" | "http";
    url?: string;
    headers?: Record<string, string>;
    httpOptions?: {
      connectionTimeout?: number;
      requestTimeout?: number;
      idleTimeout?: number;
      keepAliveTimeout?: number;
    };
    retryConfig?: {
      maxAttempts?: number;
      initialDelay?: number;
      maxDelay?: number;
      backoffMultiplier?: number;
    };
    rateLimiting?: {
      requestsPerMinute?: number;
      requestsPerHour?: number;
      maxBurst?: number;
      useTokenBucket?: boolean;
    };
    auth?: {
      type: "oauth2" | "bearer" | "api-key";
      token?: string;
      apiKey?: string;
      apiKeyHeader?: string;
      oauth?: {
        clientId: string;
        clientSecret?: string;
        authorizationUrl: string;
        tokenUrl: string;
        redirectUrl: string;
        scope?: string;
        usePKCE?: boolean;
      };
    };
  }
): Promise<void>
```

**Examples:**

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Add Bitbucket integration (stdio transport)
await neurolink.addMCPServer("bitbucket", {
  command: "npx",
  args: ["-y", "@nexus2520/bitbucket-mcp-server"],
  env: {
    BITBUCKET_USERNAME: "your-username",
    BITBUCKET_APP_PASSWORD: "your-app-password",
  },
});

// Add HTTP remote server with full configuration
await neurolink.addMCPServer("remote-api", {
  transport: "http",
  url: "https://api.example.com/mcp",
  headers: {
    Authorization: "Bearer YOUR_TOKEN",
    "X-Custom-Header": "value",
  },
  httpOptions: {
    connectionTimeout: 30000,
    requestTimeout: 60000,
    idleTimeout: 120000,
    keepAliveTimeout: 30000,
  },
  retryConfig: {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
  },
  rateLimiting: {
    requestsPerMinute: 60,
    maxBurst: 10,
    useTokenBucket: true,
  },
});

// Add HTTP server with OAuth 2.1 authentication
await neurolink.addMCPServer("oauth-api", {
  transport: "http",
  url: "https://api.enterprise.com/mcp",
  auth: {
    type: "oauth2",
    oauth: {
      clientId: "your-client-id",
      clientSecret: "your-client-secret",
      authorizationUrl: "https://auth.provider.com/authorize",
      tokenUrl: "https://auth.provider.com/token",
      redirectUrl: "http://localhost:8080/callback",
      scope: "mcp:read mcp:write",
      usePKCE: true,
    },
  },
});

// Add SSE server
await neurolink.addMCPServer("sse-server", {
  transport: "sse",
  url: "https://api.example.com/mcp/sse",
  headers: { Authorization: "Bearer YOUR_TOKEN" },
});
```

**Use Cases:**

- External service integration (Bitbucket, Slack, Jira)
- Custom tool development
- Dynamic workflow configuration
- Enterprise application toolchain management
- Remote MCP server connectivity with authentication
- OAuth 2.1 protected enterprise APIs

---

### `getMCPStatus()`

Get current MCP server status and statistics.

```typescript
async getMCPStatus(): Promise<{
  totalServers: number;
  availableServers: number;
  totalTools: number;
}>
```

**Example:**

```typescript
const status = await neurolink.getMCPStatus();
console.log(`Total servers: ${status.totalServers}`);
console.log(`Available: ${status.availableServers}`);
console.log(`Total tools: ${status.totalTools}`);
```

---

### `getUnifiedRegistry()`

Access the unified MCP registry for advanced server management.

```typescript
getUnifiedRegistry(): UnifiedMCPRegistry
```

---

## Conversation History Management

### `exportConversationHistory(options)`

Export conversation session history from Redis storage as JSON or CSV.

```typescript
async exportConversationHistory(options: ExportOptions): Promise<ConversationHistory>
```

**Parameters:**

```typescript
interface ExportOptions {
  sessionId: string; // Session ID to export
  format?: "json" | "csv"; // Default: 'json'
  includeMetadata?: boolean; // Default: true
  startTime?: Date; // Filter: export from this time
  endTime?: Date; // Filter: export until this time
}
```

**Returns:**

```typescript
interface ConversationHistory {
  sessionId: string;
  userId?: string;
  createdAt: string;
  updatedAt: string;
  turns: Array<{
    index: number;
    role: "user" | "assistant";
    content: string;
    timestamp: string;
    model?: string;
    provider?: string;
    tokens?: {
      prompt: number;
      completion: number;
    };
  }>;
  metadata?: {
    provider?: string;
    model?: string;
    totalTurns: number;
    toolsUsed?: string[];
  };
}
```

**Examples:**

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink({
  conversationMemory: {
    enabled: true,
    store: "redis",
  },
});

// Export session as JSON
const history = await neurolink.exportConversationHistory({
  sessionId: "session-abc123",
  format: "json",
  includeMetadata: true,
});

console.log(history.turns.length); // Number of conversation turns
console.log(history.metadata); // Session metadata

// Export with time filtering
const recentHistory = await neurolink.exportConversationHistory({
  sessionId: "session-abc123",
  startTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
  endTime: new Date(),
});

// Export as CSV for analytics
const csvHistory = await neurolink.exportConversationHistory({
  sessionId: "session-abc123",
  format: "csv",
});
```

**Note:** Requires `conversationMemory.store: 'redis'` configuration. In-memory storage does not support export.

---

### `getActiveSessions()`

Get list of all active conversation sessions stored in Redis.

```typescript
async getActiveSessions(): Promise<string[]>
```

**Example:**

```typescript
const sessions = await neurolink.getActiveSessions();
console.log(`Active sessions: ${sessions.length}`);

// Export all sessions
for (const sessionId of sessions) {
  const history = await neurolink.exportConversationHistory({ sessionId });
  await saveToDatabase(history);
}
```

---

### `deleteConversationHistory(sessionId)`

Delete a conversation session from Redis storage.

```typescript
async deleteConversationHistory(sessionId: string): Promise<void>
```

**Example:**

```typescript
// Clean up old session
await neurolink.deleteConversationHistory("session-abc123");
```

---

## Using Timeouts

NeuroLink supports flexible timeout configuration for all AI operations:

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Numeric milliseconds
const result1 = await neurolink.generate({
  input: { text: "Write a story" },
  provider: "openai",
  timeout: 30000, // 30 seconds
});

// Human-readable formats
const result2 = await neurolink.generate({
  input: { text: "Complex calculation" },
  provider: "openai",
  timeout: "2m", // 2 minutes
});

// Streaming with longer timeout
const stream = await neurolink.stream({
  input: { text: "Generate long content" },
  provider: "openai",
  timeout: "5m", // 5 minutes for streaming
});
```

**Supported Timeout Formats:**

- Milliseconds: `5000`, `30000`
- Seconds: `'30s'`, `'1.5s'`
- Minutes: `'2m'`, `'0.5m'`
- Hours: `'1h'`, `'0.5h'`

---

## thinkingLevel Option

The `thinkingLevel` option controls reasoning depth for Gemini 3 models, enabling more thorough analysis for complex tasks.

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Low thinking - fast responses for simple tasks
const quickResult = await neurolink.generate({
  input: { text: "What is 2 + 2?" },
  provider: "google-ai",
  model: "gemini-3-pro",
  thinkingLevel: "low",
});

// Medium thinking - balanced reasoning (default behavior)
const balancedResult = await neurolink.generate({
  input: { text: "Explain the concept of recursion in programming" },
  provider: "google-ai",
  model: "gemini-3-pro",
  thinkingLevel: "medium",
});

// High thinking - deep reasoning for complex problems
const deepResult = await neurolink.generate({
  input: {
    text: "Design a distributed caching system for a high-traffic e-commerce platform",
  },
  provider: "google-ai",
  model: "gemini-3-pro",
  thinkingLevel: "high",
});

console.log(deepResult.content);
```

**thinkingLevel Values:**

| Level     | Description                           | Use Case                                      |
| --------- | ------------------------------------- | --------------------------------------------- |
| `minimal` | No extended reasoning, fastest        | Simple lookups, direct answers                |
| `low`     | Minimal reasoning, fast responses     | Simple queries, factual lookups               |
| `medium`  | Balanced reasoning depth              | General tasks, explanations, code generation  |
| `high`    | Deep reasoning with extended analysis | Complex problems, architecture design, proofs |

**Note:** The `thinkingLevel` option is only supported by Gemini 3 models (`gemini-3-flash`, `gemini-3-pro`). When used with other providers or models, it will be ignored.

---

## Usage Examples

### Basic Text Generation

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Write a haiku about coding" },
  provider: "openai",
  model: "gpt-4o",
});

console.log(result.content);
```

### Multimodal with Images

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: {
    text: "Describe what you see in this image",
    images: ["path/to/image.jpg"], // Local path or URL
  },
  provider: "openai",
  model: "gpt-4o",
  maxTokens: 500,
});
```

### Office Document Analysis

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Analyze Word document
const result = await neurolink.generate({
  input: {
    text: "Summarize this document",
    officeFiles: ["report.docx"],
  },
  provider: "bedrock",
});

// Analyze Excel spreadsheet
const data = await neurolink.generate({
  input: {
    text: "What are the top products by revenue?",
    officeFiles: ["sales-data.xlsx"],
  },
  provider: "bedrock",
});

// Mixed file types with auto-detection
const analysis = await neurolink.generate({
  input: {
    text: "Compare all documents",
    files: ["report.docx", "data.xlsx", "chart.png", "notes.pdf"],
  },
  provider: "bedrock",
});
```

### Provider Fallback with Orchestration

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink({
  enableOrchestration: true,
  orchestrationConfig: {
    fallbackChain: ["openai", "anthropic", "bedrock"],
    preferCheap: false,
  },
});

// Will automatically fallback if primary provider fails
const result = await neurolink.generate({
  input: { text: "Complex reasoning task" },
  // No provider specified - uses orchestration
});

console.log(`Used provider: ${result.provider}`);
```

---

## Enterprise Configuration Interfaces

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
  registerServer?(
    serverId: string,
    config?: unknown,
    context?: ExecutionContext,
  ): Promise<void>;
  executeTool?<T>(
    toolName: string,
    args?: unknown,
    context?: ExecutionContext,
  ): Promise<T>;
  listTools?(context?: ExecutionContext): Promise<ToolInfo[]>;
  getStats?(): Record<
    string,
    { count: number; averageTime: number; totalTime: number }
  >;
  unregisterServer?(serverId: string): Promise<void>;
  getServerInfo?(serverId: string): Promise<unknown>;
}
```

---

## Supported Providers and Models

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

### Gemini 3 Models (Preview)

Google's latest generation Gemini models with enhanced reasoning capabilities and extended thinking support.

```typescript
type Gemini3Model =
  | "gemini-3-flash-preview" // Fast, efficient with thinking support (default)
  | "gemini-3-pro-preview"; // Advanced reasoning with maximum thinking depth
```

**Model Variants:**

| Model                    | Best For                    | Thinking Default | Speed   |
| ------------------------ | --------------------------- | ---------------- | ------- |
| `gemini-3-flash-preview` | Fast tasks, simple queries  | `low`            | Fastest |
| `gemini-3-pro-preview`   | Complex reasoning, analysis | `high`           | Slower  |

### Azure OpenAI Models

```typescript
type AzureModel = string; // Deployment-specific models
// Common deployments:
// - 'gpt-4o' (default)
// - 'gpt-4-turbo'
// - 'gpt-35-turbo'
```

### Anthropic Models

```typescript
type AnthropicModel =
  | "claude-3-5-sonnet"
  | "claude-3-opus"
  | "claude-3-sonnet"
  | "claude-3-haiku";
```

### Mistral AI Models

```typescript
type MistralModel =
  | "mistral-tiny"
  | "mistral-small" // Default
  | "mistral-medium"
  | "mistral-large";
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

---

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
```

### Optional Configuration Variables

```typescript
// Provider preferences
DEFAULT_PROVIDER?: 'auto' | 'openai' | 'bedrock' | 'vertex' | 'anthropic' | 'azure' | 'google-ai' | 'huggingface' | 'ollama' | 'mistral' | 'litellm'
FALLBACK_PROVIDER?: 'openai' | 'bedrock' | 'vertex' | 'anthropic' | 'azure' | 'google-ai' | 'huggingface' | 'ollama' | 'mistral' | 'litellm'

// Feature toggles
ENABLE_FALLBACK?: 'true' | 'false'

// Debugging
NEUROLINK_DEBUG?: 'true' | 'false'
LOG_LEVEL?: 'error' | 'warn' | 'info' | 'debug'
```

---

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

interface GenerateOptions {
  input: { text: string };
  provider?: ProviderName | string;
  model?: string;
  temperature?: number; // 0.0 to 1.0, default: 0.7
  maxTokens?: number; // Default: 1000
  systemPrompt?: string; // System message
  schema?: any; // For structured output
  timeout?: number | string; // Timeout in ms or human-readable format
  disableTools?: boolean; // Disable tool usage
  enableAnalytics?: boolean; // Enable usage analytics
  enableEvaluation?: boolean; // Enable AI quality scoring
  context?: Record<string, any>; // Custom context for analytics
  thinkingLevel?: "minimal" | "low" | "medium" | "high"; // Gemini 3 models
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

### Office Document Types

Types for processing Office documents (DOCX, PPTX, XLSX):

```typescript
/**
 * Supported Office document types
 */
type OfficeFileType = "docx" | "pptx" | "xlsx" | "doc" | "xls";

/**
 * Extended file type including Office formats
 */
type FileType = "csv" | "image" | "pdf" | "office" | "text" | "unknown";

/**
 * Office processor options
 */
interface OfficeProcessorOptions {
  /** Provider to use for document processing */
  provider?: string;

  /** Maximum file size in MB (default: 5) */
  maxSizeMB?: number;

  /** Whether to extract embedded images */
  extractImages?: boolean;

  /** Whether to preserve document structure in output */
  preserveStructure?: boolean;
}

/**
 * Office processing result
 */
interface OfficeProcessingResult {
  type: "office";
  content: Buffer;
  mimeType: string;
  metadata: {
    confidence: number;
    size: number;
    filename?: string;
    format: OfficeFileType;
    provider: string;
    estimatedPages?: number;
    hasEmbeddedImages?: boolean;
    hasCharts?: boolean;
  };
}
```

**Office Document Provider Support:**

| Provider             | DOCX | PPTX | XLSX | DOC  | XLS  | Notes                                |
| -------------------- | ---- | ---- | ---- | ---- | ---- | ------------------------------------ |
| **AWS Bedrock**      | Yes  | Yes  | Yes  | Yes  | Yes  | Full native support via Converse API |
| **Google Vertex AI** | Yes  | Some | Yes  | Some | Some | Best for DOCX and XLSX               |
| **Anthropic Claude** | Yes  | Some | Yes  | Some | Some | Via document API                     |
| **OpenAI**           | No   | No   | No   | No   | No   | Not supported                        |
| **Azure OpenAI**     | No   | No   | No   | No   | No   | Not supported                        |

---

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
import { NeuroLink } from "@juspay/neurolink";
import {
  AIProviderError,
  ConfigurationError,
  AuthenticationError,
  RateLimitError,
  TimeoutError,
} from "@juspay/neurolink";

const neurolink = new NeuroLink();

try {
  const result = await neurolink.generate({
    input: { text: "Hello" },
    provider: "openai",
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

---

## Built-in Tools

Every NeuroLink instance automatically includes these tools:

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

**Example with Tools:**

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Tools are used automatically when appropriate
const result = await neurolink.generate({
  input: { text: "What time is it?" },
  provider: "openai",
});
// Result will use getCurrentTime tool automatically

// Disable tools if needed
const resultNoTools = await neurolink.generate({
  input: { text: "What time is it?" },
  provider: "openai",
  disableTools: true,
});
// Result will use training data instead of real-time tools
```

---

## Provider Tool Support Status

| Provider     | Tool Support | Notes                                                |
| ------------ | ------------ | ---------------------------------------------------- |
| OpenAI       | Full         | All tools work correctly                             |
| Google AI    | Full         | Excellent tool execution                             |
| Anthropic    | Full         | Reliable tool usage                                  |
| Azure OpenAI | Full         | Same as OpenAI                                       |
| Mistral      | Full         | Good tool support                                    |
| HuggingFace  | Partial      | Model sees tools but may describe instead of execute |
| Vertex AI    | Partial      | Tools available but may not execute                  |
| Ollama       | Limited      | Requires specific models like gemma3n                |
| Bedrock      | Full\*       | Requires valid AWS credentials                       |

---

## Related Features

- [Human-in-the-Loop (HITL)](../features/hitl.md) - Mark tools with `requiresConfirmation: true`
- [Guardrails Middleware](../features/guardrails.md) - Enable with `middleware: { preset: 'security' }`
- [Redis Conversation Export](../features/conversation-history.md) - Use `exportConversationHistory()` method
- [Multimodal Chat](../features/multimodal-chat.md) - Use `images` array in `generate()` options
- [Auto Evaluation](../features/auto-evaluation.md) - Enable with `enableEvaluation: true`
- [CLI Loop Sessions](../features/cli-loop-sessions.md) - Interactive mode with persistent state
- [Provider Orchestration](../features/provider-orchestration.md) - Set `enableOrchestration: true`
- [Regional Streaming](../features/regional-streaming.md) - Use `region` parameter in `generate()`
- [Office Documents](../features/office-documents.md) - Use `officeFiles` array for DOCX, PPTX, XLSX
- [PDF Support](../features/pdf-support.md) - Use `pdfFiles` array for PDF documents
- [CSV Support](../features/csv-support.md) - Use `csvFiles` array for spreadsheet data
- [CLI Commands Reference](../cli/commands.md) - CLI equivalents for all SDK methods
- [Configuration Guide](../CONFIGURATION.md) - Environment variables and config files
- [Troubleshooting](../TROUBLESHOOTING.md) - Common SDK issues and solutions

---

[Back to Main README](../index.md) | [Next: Visual Demos](../VISUAL-DEMOS.md)
