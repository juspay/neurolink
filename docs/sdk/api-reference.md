import Head from '@docusaurus/Head';

<Head>
  <script type="application/ld+json">{JSON.stringify({
    "@context": "https://schema.org",
    "@type": "SoftwareSourceCode",
    "name": "NeuroLink SDK — Real-time AI Streaming",
    "programmingLanguage": "TypeScript",
    "codeRepository": "https://github.com/juspay/neurolink",
    "license": "https://opensource.org/licenses/MIT"
  })}</script>
</Head>

# API Reference

Complete reference for NeuroLink's TypeScript API.

## NeuroLink Class

The `NeuroLink` class is the main entry point for all SDK functionality.

### Constructor: `new NeuroLink(config?)`

Create a new NeuroLink instance with optional configuration for conversation memory, orchestration, HITL, and observability.

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink(config?: NeurolinkConstructorConfig)
```

**Parameters:**

```typescript
type NeurolinkConstructorConfig = {
  // Conversation Memory
  conversationMemory?: Partial<ConversationMemoryConfig>;
  // See ConversationMemoryConfig for full options:
  //   enabled: boolean
  //   maxSessions?: number
  //   enableSummarization?: boolean
  //   tokenThreshold?: number
  //   summarizationProvider?: string
  //   summarizationModel?: string
  //   mem0Enabled?: boolean
  //   mem0Config?: Mem0Config
  //   redisConfig?: RedisStorageConfig
  //   contextCompaction?: { enabled?, threshold?, enablePruning?, ... }
  //   maxTurnsPerSession?: number  // @deprecated - use tokenThreshold instead

  // Provider Orchestration
  enableOrchestration?: boolean;

  // Human-in-the-Loop safety features
  hitl?: HITLConfig;

  // Custom tool registry (advanced)
  toolRegistry?: MCPToolRegistry;

  // Observability (Langfuse integration)
  observability?: ObservabilityConfig;
};
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
    redisConfig: {
      host: "localhost",
      port: 6379,
      ttl: 7 * 24 * 60 * 60, // 7 days
    },
    tokenThreshold: 100000, // Token threshold to trigger summarization
  },
});

// With HITL safety features
const neurolinkWithHITL = new NeuroLink({
  hitl: {
    enabled: true,
    dangerousActions: ["delete", "remove", "drop"],
    timeout: 30000,
    allowArgumentModification: true,
  },
});

// Complete configuration with all features
const neurolinkComplete = new NeuroLink({
  conversationMemory: {
    enabled: true,
    redisConfig: { host: "localhost", port: 6379 },
    enableSummarization: true,
  },
  enableOrchestration: true,
  hitl: { enabled: true },
  observability: {
    langfuse: {
      enabled: true,
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      secretKey: process.env.LANGFUSE_SECRET_KEY,
    },
  },
});
```

See also:

- [Redis Conversation Export](../features/conversation-history.md)
- [Human-in-the-Loop (HITL)](../features/hitl.md)
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
type GenerateOptions = {
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
  model?: string; // Model slug (e.g., 'gpt-4o', 'veo-3.1')
  region?: string; // Regional routing for providers that support it
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  schema?: ValidationSchema; // Structured output schema
  tools?: Record<string, Tool>; // Optional tool overrides
  timeout?: number | string; // 120 (seconds) or '2m', '1h'
  disableTools?: boolean;
  maxSteps?: number; // Max tool execution steps (default: 5)
  toolChoice?: ToolChoice; // 'auto' | 'none' | 'required' | { type: 'tool', toolName: string }
  prepareStep?: PrepareStepCallback; // Per-step tool choice — see SDK Custom Tools Guide
  enableAnalytics?: boolean;
  enableEvaluation?: boolean;
  evaluationDomain?: string;
  toolUsageContext?: string;
  context?: Record<string, JsonValue>;
  conversationHistory?: Array<{ role: string; content: string }>;
  thinkingLevel?: "minimal" | "low" | "medium" | "high"; // Gemini 3 models only

  // Output configuration
  output?: {
    format?: "text" | "structured" | "json";
    mode?: "text" | "video"; // Output mode: 'text' (default) or 'video'
    video?: VideoOutputOptions; // Video generation options (when mode is 'video')
  };

  // Document processing options
  officeOptions?: OfficeProcessorOptions;

  // RAG pipeline configuration
  rag?: RAGConfig; // RAG pipeline config - pass files for automatic chunking and search
};

// Video output configuration (for Veo 3.1 via Vertex AI)
type VideoOutputOptions = {
  resolution?: "720p" | "1080p"; // Video resolution (default: "720p")
  length?: 4 | 6 | 8; // Video duration in seconds (default: 6)
  aspectRatio?: "9:16" | "16:9"; // Aspect ratio (default: "16:9")
  audio?: boolean; // Include synchronized audio (default: true)
};
```

**Returns:**

```typescript
type GenerateResult = {
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

  // Video generation result (when output.mode is 'video')
  video?: {
    data: Buffer; // Raw video data
    mediaType: string; // MIME type (e.g., 'video/mp4')
    metadata?: {
      duration?: number; // Video duration in seconds
      dimensions?: { width: number; height: number };
      model?: string; // Model used for generation
    };
  };

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
};
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

**With Video Generation (Veo 3.1):**

```typescript
import { readFile, writeFile } from "fs/promises";

// Generate video from image + text prompt
const result = await neurolink.generate({
  input: {
    text: "Smooth camera movement showcasing the product",
    images: [await readFile("./product-image.jpg")],
  },
  provider: "vertex",
  model: "veo-3.1",
  output: {
    mode: "video",
    video: {
      resolution: "1080p",
      length: 8,
      aspectRatio: "16:9",
      audio: true,
    },
  },
});

// Save generated video
if (result.video) {
  await writeFile("output.mp4", result.video.data);
  console.log(`Video duration: ${result.video.metadata?.duration}s`);
  console.log(
    `Dimensions: ${result.video.metadata?.dimensions?.width}x${result.video.metadata?.dimensions?.height}`,
  );
}
```

> **Note:** Video generation requires Vertex AI credentials and currently only supports Veo 3.1 model. See [Video Generation Guide](../features/video-generation.md) for complete documentation.

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
type StreamOptions = {
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
  rag?: RAGConfig; // RAG pipeline config - pass files for automatic chunking and search
};
```

**Returns:**

```typescript
type StreamResult = {
  stream: AsyncIterable<{ content: string }>;
  provider?: string;
  model?: string;
  metadata?: {
    streamId?: string;
    startTime?: number;
    totalChunks?: number;
  };
};
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

### Embeddings

Generate embeddings directly via the provider's `embed()` and `embedMany()` methods.

#### `provider.embed(text, modelName?)`

Generate an embedding vector for a single text.

```typescript
import { ProviderFactory } from "@juspay/neurolink";

const provider = await ProviderFactory.createProvider("googleAiStudio");
const embedding = await provider.embed("Hello world");
// embedding: number[] (e.g., 768 dimensions)
```

#### `provider.embedMany(texts, modelName?)`

Generate embedding vectors for multiple texts in a single batch. The AI SDK automatically handles chunking for models with batch limits.

```typescript
const provider = await ProviderFactory.createProvider("openai");
const embeddings = await provider.embedMany([
  "First document",
  "Second document",
  "Third document",
]);
// embeddings: number[][] (e.g., 3 × 1536 dimensions)
```

**Supported providers and default models:**

| Provider         | Default Embedding Model        | Env Override                |
| ---------------- | ------------------------------ | --------------------------- |
| OpenAI           | `text-embedding-3-small`       | —                           |
| Google AI Studio | `gemini-embedding-001`         | `GOOGLE_AI_EMBEDDING_MODEL` |
| Google Vertex    | `text-embedding-004`           | `VERTEX_EMBEDDING_MODEL`    |
| Amazon Bedrock   | `amazon.titan-embed-text-v2:0` | —                           |

---

### RAG Integration

Pass `rag: { files: [...] }` to `generate()` or `stream()` for automatic RAG pipeline setup:

```typescript
const result = await neurolink.generate({
  prompt: "What does this document say?",
  rag: {
    files: ["./docs/guide.md"],
    strategy: "markdown", // Optional
    topK: 5, // Optional
  },
});
```

**`RAGConfig` Type:**

| Property            | Type               | Default                   | Description             |
| ------------------- | ------------------ | ------------------------- | ----------------------- |
| `files`             | `string[]`         | required                  | File paths to load      |
| `strategy`          | `ChunkingStrategy` | auto-detected             | Chunking strategy       |
| `chunkSize`         | `number`           | 1000                      | Max chunk size          |
| `chunkOverlap`      | `number`           | 200                       | Chunk overlap           |
| `topK`              | `number`           | 5                         | Top results to retrieve |
| `toolName`          | `string`           | `"search_knowledge_base"` | Tool name for AI        |
| `toolDescription`   | `string`           | auto-generated            | Tool description        |
| `embeddingProvider` | `string`           | generation provider       | Embedding provider      |
| `embeddingModel`    | `string`           | provider default          | Embedding model         |

**Exports:**

```typescript
import {
  prepareRAGTool,
  type RAGConfig,
  type RAGPreparedTool,
} from "@juspay/neurolink";
```

---

## MCP Server Management

### `addExternalMCPServer(serverId, config)`

Programmatically add external MCP servers at runtime. Supports stdio, SSE, WebSocket, and HTTP transports.

```typescript
async addExternalMCPServer(
  serverId: string,
  config: MCPServerInfo
): Promise<ExternalMCPOperationResult<ExternalMCPServerInstance>>
```

**Examples:**

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Add Bitbucket integration (stdio transport)
await neurolink.addExternalMCPServer("bitbucket", {
  command: "npx",
  args: ["-y", "@nexus2520/bitbucket-mcp-server"],
  env: {
    BITBUCKET_USERNAME: "your-username",
    BITBUCKET_APP_PASSWORD: "your-app-password",
  },
});

// Add HTTP remote server with full configuration
await neurolink.addExternalMCPServer("remote-api", {
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
await neurolink.addExternalMCPServer("oauth-api", {
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
await neurolink.addExternalMCPServer("sse-server", {
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

## Conversation History Management

### Currently Available Methods

#### `getConversationHistory(sessionId)`

Retrieve the complete conversation history for a specific session.

```typescript
async getConversationHistory(sessionId: string): Promise<ChatMessage[]>
```

**Parameters:**

| Parameter   | Type     | Description                            |
| ----------- | -------- | -------------------------------------- |
| `sessionId` | `string` | The session ID to retrieve history for |

**Returns:**

```typescript
// Array of ChatMessage objects in chronological order
type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};
```

**Example:**

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink({
  conversationMemory: {
    enabled: true,
    redisConfig: { host: "localhost", port: 6379 }, // omit for in-memory
  },
});

// Retrieve conversation history
const history = await neurolink.getConversationHistory("session-abc123");

console.log(`Total messages: ${history.length}`);
for (const message of history) {
  console.log(`[${message.role}]: ${message.content.substring(0, 50)}...`);
}

// Export to JSON file
import { writeFileSync } from "fs";
writeFileSync("conversation.json", JSON.stringify(history, null, 2));
```

---

#### `clearConversationSession(sessionId)`

Clear conversation history for a specific session.

```typescript
async clearConversationSession(sessionId: string): Promise<boolean>
```

**Parameters:**

| Parameter   | Type     | Description             |
| ----------- | -------- | ----------------------- |
| `sessionId` | `string` | The session ID to clear |

**Returns:** `boolean` - `true` if session was cleared, `false` if session didn't exist.

**Example:**

```typescript
// Clear a specific session
const cleared = await neurolink.clearConversationSession("session-abc123");
if (cleared) {
  console.log("Session cleared successfully");
} else {
  console.log("Session not found");
}
```

---

#### `clearAllConversations()`

Clear all conversation history across all sessions.

```typescript
async clearAllConversations(): Promise<void>
```

**Example:**

```typescript
// Clear all conversation history
await neurolink.clearAllConversations();
console.log("All conversations cleared");
```

---

### Planned Features

> **Planned Feature**
>
> The advanced `exportConversationHistory()` method with filtering, format options, and metadata is planned for a future release.
> Currently, use `getConversationHistory(sessionId)` to retrieve conversation data and process it as needed.

The following advanced export capabilities are planned:

```typescript
// PLANNED - Not yet available
type ExportOptions = {
  sessionId: string; // Session ID to export
  format?: "json" | "csv"; // Default: 'json'
  includeMetadata?: boolean; // Default: true
  startTime?: Date; // Filter: export from this time
  endTime?: Date; // Filter: export until this time
};

type ConversationHistory = {
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
};
```

> **Planned Feature**
>
> The `getActiveSessions()` method to list all active conversation sessions is planned for a future release.

**Workaround:** For now, track session IDs in your application when creating conversations:

```typescript
// Track sessions manually
const activeSessions: string[] = [];

// When starting a conversation
const sessionId = `session-${Date.now()}`;
activeSessions.push(sessionId);

// Retrieve history for all tracked sessions
for (const sessionId of activeSessions) {
  const history = await neurolink.getConversationHistory(sessionId);
  await saveToDatabase(sessionId, history);
}
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
  enableOrchestration: true, // Enables smart model routing via ModelRouter
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
type NeuroLinkConfig = {
  providers: ProviderConfig;
  performance: PerformanceConfig;
  analytics: AnalyticsConfig;
  backup: BackupConfig;
  validation: ValidationConfig;
};
```

### `ExecutionContext`

Rich context interface for all MCP operations:

```typescript
type ExecutionContext = {
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
};
```

### `ToolInfo`

Comprehensive tool metadata interface:

```typescript
type ToolInfo = {
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
};
```

### `ConfigUpdateOptions`

Flexible configuration update options:

```typescript
type ConfigUpdateOptions = {
  createBackup?: boolean;
  validateBeforeUpdate?: boolean;
  mergeStrategy?: "replace" | "merge" | "deep-merge";
  backupRetention?: number;
  onValidationError?: (errors: ValidationError[]) => void;
  onBackupCreated?: (backupPath: string) => void;
};
```

### `McpRegistry`

Registry interface with optional methods for maximum flexibility:

```typescript
type McpRegistry = {
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
};
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

type GenerateOptions = {
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
};

type GenerateResult = {
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
};

type TokenUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};
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
type OfficeProcessorOptions = {
  /** Provider to use for document processing */
  provider?: string;

  /** Maximum file size in MB (default: 5) */
  maxSizeMB?: number;

  /** Whether to extract embedded images */
  extractImages?: boolean;

  /** Whether to preserve document structure in output */
  preserveStructure?: boolean;
};

/**
 * Office processing result
 */
type OfficeProcessingResult = {
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
};
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
type BuiltInTools = {
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
};
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
- [Conversation History](../features/conversation-history.md) - Use `getConversationHistory()` method
- [Multimodal Chat](../features/multimodal-chat.md) - Use `images` array in `generate()` options
- [Auto Evaluation](../features/auto-evaluation.md) - Enable with `enableEvaluation: true`
- [CLI Loop Sessions](../features/cli-loop-sessions.md) - Interactive mode with persistent state
- [Provider Orchestration](../features/provider-orchestration.md) - Set `enableOrchestration: true`
- [Regional Streaming](../features/regional-streaming.md) - Use `region` parameter in `generate()`
- [Office Documents](../features/office-documents.md) - Use `officeFiles` array for DOCX, PPTX, XLSX
- [PDF Support](../features/pdf-support.md) - Use `pdfFiles` array for PDF documents
- [CSV Support](../features/csv-support.md) - Use `csvFiles` array for spreadsheet data
- [CLI Commands Reference](../cli/commands.md) - CLI equivalents for all SDK methods
- [Configuration Guide](../configuration.md) - Environment variables and config files
- [Troubleshooting](../troubleshooting.md) - Common SDK issues and solutions

---

[Back to Main README](../index.md) | [Next: Visual Demos](../visual-demos.md)
