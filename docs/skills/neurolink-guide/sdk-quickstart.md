# NeuroLink SDK Quickstart

Get started with the NeuroLink SDK in minutes.

## Installation

```bash
# npm
npm install @juspay/neurolink

# pnpm (recommended)
pnpm add @juspay/neurolink

# yarn
yarn add @juspay/neurolink
```

## TypeScript Configuration

NeuroLink is fully typed. Ensure your `tsconfig.json` has:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true
  }
}
```

## Environment Setup

Create a `.env` file with your provider credentials:

```bash
# At minimum, configure one provider
OPENAI_API_KEY=sk-...
# or
ANTHROPIC_API_KEY=sk-ant-...
# or
GOOGLE_API_KEY=...
```

## Basic Usage

### Initialize the SDK

```typescript
import { NeuroLink } from "@juspay/neurolink";

// Default configuration - auto-selects best available provider
const neurolink = new NeuroLink();

// Or with specific configuration
const neurolinkWithMemory = new NeuroLink({
  conversationMemory: { enabled: true },
  enableOrchestration: true,
});
```

### Generate Text (Non-Streaming)

```typescript
// Simple string prompt
const result = await neurolink.generate("Explain quantum computing");
console.log(result.content);

// Full options object
const resultWithOptions = await neurolink.generate({
  input: { text: "Write a haiku about coding" },
  provider: "openai",
  model: "gpt-4o",
  temperature: 0.7,
  maxTokens: 500,
});

console.log(resultWithOptions.content);
console.log("Tokens used:", resultWithOptions.usage?.total);
```

### Stream Responses

```typescript
const result = await neurolink.stream({
  input: { text: "Write a short story about a robot" },
  temperature: 0.8,
});

// Stream text chunks to stdout
for await (const chunk of result.stream) {
  if ("content" in chunk) {
    process.stdout.write(chunk.content);
  }
}

console.log("\n--- Complete ---");
console.log("Total tokens:", result.usage?.total);
```

## GenerateOptions Reference

```typescript
interface GenerateOptions {
  // Input content
  input: {
    text: string; // Primary prompt
    images?: (Buffer | string)[]; // Image files or URLs
    files?: (Buffer | string)[]; // Auto-detected file types
    pdfFiles?: (Buffer | string)[]; // PDF documents
    csvFiles?: (Buffer | string)[]; // CSV data files
  };

  // Provider settings
  provider?: string; // 'auto' | 'openai' | 'anthropic' | 'vertex' | etc.
  model?: string; // Specific model name

  // Generation parameters
  temperature?: number; // 0.0 - 2.0 (default: 0.7)
  maxTokens?: number; // Max tokens to generate

  // System behavior
  systemPrompt?: string; // System instructions

  // Tools
  tools?: string[]; // Tool names to enable

  // RAG
  rag?: RAGConfig; // RAG configuration

  // Structured output
  schema?: ZodSchema; // Zod schema for typed output
  output?: {
    format?: "text" | "json" | "structured";
  };

  // Context
  context?: {
    conversationId?: string;
    userId?: string;
    sessionId?: string;
  };
}
```

## GenerateResult Reference

```typescript
interface GenerateResult {
  content: string; // Generated text
  toolCalls?: ToolCall[]; // Tools called by AI
  toolResults?: ToolResult[]; // Results from tool execution
  usage?: {
    input: number; // Input tokens
    output: number; // Output tokens
    total: number; // Total tokens
  };
  metadata?: {
    provider: string;
    model: string;
    responseTime: number;
  };
}
```

## Provider Auto-Selection

When `provider: 'auto'` (default), NeuroLink selects the best available provider:

```typescript
// Auto-selects based on configured environment variables
const result = await neurolink.generate("Hello");

// Check which provider was used
console.log(result.metadata?.provider);
```

Priority order:

1. LiteLLM (if `LITELLM_API_KEY` set)
2. Ollama (if `OLLAMA_BASE_URL` set)
3. Vertex AI (if `VERTEX_PROJECT_ID` set)
4. Google AI (if `GOOGLE_API_KEY` set)
5. OpenAI (if `OPENAI_API_KEY` set)
6. Anthropic (if `ANTHROPIC_API_KEY` set)
7. Amazon Bedrock (if `AWS_ACCESS_KEY_ID` set)
8. Azure (if `AZURE_OPENAI_API_KEY` set)
9. Mistral (if `MISTRAL_API_KEY` set)
10. HuggingFace (if `HUGGINGFACE_API_KEY` set)

## Specify Provider and Model

```typescript
// OpenAI
const result = await neurolink.generate({
  input: { text: "Hello" },
  provider: "openai",
  model: "gpt-4o-mini",
});

// Anthropic
const result = await neurolink.generate({
  input: { text: "Hello" },
  provider: "anthropic",
  model: "claude-3-5-sonnet-20241022",
});

// Google Vertex
const result = await neurolink.generate({
  input: { text: "Hello" },
  provider: "vertex",
  model: "gemini-2.5-flash",
});
```

## Error Handling

```typescript
try {
  const result = await neurolink.generate({
    input: { text: "Hello" },
    provider: "openai",
  });
  console.log(result.content);
} catch (error) {
  if (error.code === "CONFIGURATION_ERROR") {
    console.error("OpenAI API key not set");
  } else if (error.code === "RATE_LIMITED") {
    console.error("Rate limited, retry later");
  } else {
    console.error("Generation failed:", error.message);
  }
}
```

## Check Provider Status

```typescript
// Check all providers
const status = await neurolink.getProviderStatus();
console.log(status);

// Get available providers
const providers = await neurolink.getAvailableProviders();
console.log("Available:", providers);

// Get best provider
const best = await neurolink.getBestProvider();
console.log("Best available:", best);
```

## Event Handling

```typescript
const emitter = neurolink.getEventEmitter();

emitter.on("generation:start", (event) => {
  console.log("Starting generation with", event.provider);
});

emitter.on("generation:end", (event) => {
  console.log(`Completed in ${event.responseTime}ms`);
});

emitter.on("error", (event) => {
  console.error("Error:", event.error);
});
```

## Complete Example

```typescript
import { NeuroLink } from "@juspay/neurolink";
import type { GenerateOptions } from "@juspay/neurolink";

async function main() {
  // Initialize
  const neurolink = new NeuroLink({
    conversationMemory: { enabled: true },
  });

  // Setup event listeners
  const emitter = neurolink.getEventEmitter();
  emitter.on("generation:end", (e) => {
    console.log(`[${e.provider}] ${e.responseTime}ms`);
  });

  // Check provider status
  const providers = await neurolink.getAvailableProviders();
  console.log("Available providers:", providers);

  // Generate with options
  const options: GenerateOptions = {
    input: { text: "Write a function to calculate fibonacci numbers" },
    temperature: 0.3,
    maxTokens: 500,
  };

  const result = await neurolink.generate(options);
  console.log(result.content);
  console.log("Tokens:", result.usage);
}

main().catch(console.error);
```

## Next Steps

- Configure providers - Set up specific AI providers
- Add multimodal inputs - Work with images and documents
- Integrate MCP tools - Add external tools
- Set up RAG - Document-grounded generation
