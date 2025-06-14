# 📚 API Reference

Complete reference for NeuroLink's TypeScript API.

## Core Functions

### `createBestAIProvider(requestedProvider?, modelName?)`

Creates the best available AI provider based on environment configuration and provider availability.

```typescript
function createBestAIProvider(
  requestedProvider?: string,
  modelName?: string,
): AIProvider;
```

**Parameters:**

- `requestedProvider` (optional): Preferred provider name (`'openai'`, `'bedrock'`, `'vertex'`, `'anthropic'`, `'azure'`, `'google-ai'`, `'huggingface'`, `'ollama'`, `'mistral'`, or `'auto'`)
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
const claudeProvider = createBestAIProvider("bedrock", "claude-3-7-sonnet");
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

- `providerName`: Provider name (`'openai'`, `'bedrock'`, `'vertex'`, `'anthropic'`, `'azure'`, `'google-ai'`, `'huggingface'`, `'ollama'`, `'mistral'`)
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
  maxTokens?: number; // Default: 500
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
} from "@juspay/neurolink";

try {
  const result = await provider.generateText({ prompt: "Hello" });
} catch (error) {
  if (error instanceof ConfigurationError) {
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

### MCP CLI Commands

All MCP functionality is available through the NeuroLink CLI:

```bash
# Server management
neurolink mcp install <server>    # Install popular MCP servers
neurolink mcp add <name> <command> # Add custom MCP server
neurolink mcp remove <server>     # Remove MCP server
neurolink mcp list [--status]     # List configured servers with optional status

# Server testing and interaction
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
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_PERSONAL_ACCESS_TOKEN}"
      },
      "timeout": 10000,
      "enabled": true
    },
    "postgres": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-postgres",
        "${POSTGRES_CONNECTION_STRING}"
      ],
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
