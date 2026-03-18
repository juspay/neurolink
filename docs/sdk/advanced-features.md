# Advanced SDK Features

Advanced features and capabilities of the NeuroLink SDK.

## Streaming

Use `stream()` for incremental token delivery:

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const stream = await neurolink.stream({
  input: { text: "Write a story" },
  provider: "openai",
});

for await (const chunk of stream) {
  process.stdout.write(chunk.text ?? "");
}
```

## Structured Output

Use `schema` with a Zod schema to get typed JSON responses:

```typescript
import { z } from "zod";

const RecipeSchema = z.object({
  name: z.string(),
  ingredients: z.array(z.string()),
  steps: z.array(z.string()),
});

const result = await neurolink.generate({
  input: { text: "Give me a pancake recipe" },
  schema: RecipeSchema,
  output: { format: "json" },
  provider: "openai",
});

// result.content is typed as { name: string; ingredients: string[]; steps: string[] }
```

> **Note:** Google Gemini models cannot combine tools and JSON schema output simultaneously. Pass `disableTools: true` when using `schema` with Vertex AI or Google AI Studio.

## Conversation Memory

Enable conversation memory for stateful multi-turn interactions:

```typescript
const neurolink = new NeuroLink({
  conversationMemory: {
    enabled: true,
    store: "redis", // or "memory" for development
    maxTurnsPerSession: 50,
  },
});

const sessionId = "session-abc-123";

// First turn
await neurolink.generate({
  input: { text: "My name is Alice" },
  context: { sessionId },
});

// Second turn - remembers context
const result = await neurolink.generate({
  input: { text: "What is my name?" },
  context: { sessionId },
});
```

## Thinking Level

Control extended thinking for supported models (Anthropic Claude, Gemini 2.5+):

```typescript
const result = await neurolink.generate({
  input: { text: "Solve this complex reasoning problem..." },
  provider: "anthropic",
  thinkingLevel: "high", // "minimal" | "low" | "medium" | "high"
});
```

## Embeddings

Generate vector embeddings for text:

```typescript
// Single text
const embedding = await neurolink.embed({
  input: "Hello world",
  provider: "openai",
});

// Multiple texts
const embeddings = await neurolink.embedMany({
  input: ["First text", "Second text", "Third text"],
  provider: "openai",
});
```

## RAG Integration

Pass files directly to `generate()` or `stream()` for retrieval-augmented generation:

```typescript
const result = await neurolink.generate({
  prompt: "What are the key features described in the docs?",
  rag: {
    files: ["./docs/guide.md", "./docs/api.md"],
    strategy: "markdown",
    chunkSize: 512,
    topK: 5,
  },
});
```

## External MCP Servers

Add external tool servers using the Model Context Protocol:

```typescript
// stdio transport (local server)
await neurolink.addExternalMCPServer("github", {
  command: "npx",
  args: ["-y", "@modelcontextprotocol/server-github"],
  transport: "stdio",
  env: { GITHUB_TOKEN: process.env.GITHUB_TOKEN },
});

// HTTP transport (remote server)
await neurolink.addExternalMCPServer("remote-api", {
  transport: "http",
  url: "https://api.example.com/mcp",
  headers: { Authorization: "Bearer YOUR_TOKEN" },
  timeout: 15000,
});
```

## Multimodal Input

Pass images and files alongside text:

```typescript
import { readFileSync } from "node:fs";

const result = await neurolink.generate({
  input: {
    text: "Describe this image",
    images: [readFileSync("./photo.png"), "https://example.com/image.jpg"],
  },
  provider: "google-ai",
});
```

## Context Compaction

Configure automatic context window management for long conversations:

```typescript
const neurolink = new NeuroLink({
  conversationMemory: {
    enabled: true,
    enableSummarization: true,
    contextCompaction: {
      enabled: true,
      threshold: 0.8, // trigger at 80% of context window
      enablePruning: true,
      enableDeduplication: true,
      enableSlidingWindow: true,
    },
    summarizationProvider: "vertex",
    summarizationModel: "gemini-2.5-flash",
  },
});
```

## Observability

Integrate with Langfuse for tracing and monitoring:

```typescript
import { NeuroLink, setLangfuseContext } from "@juspay/neurolink";

const neurolink = new NeuroLink({
  observability: {
    langfuse: {
      enabled: true,
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      secretKey: process.env.LANGFUSE_SECRET_KEY,
    },
  },
});

const result = await setLangfuseContext(
  {
    userId: "user-123",
    sessionId: "session-456",
    traceName: "chat-completion",
  },
  async () => {
    return await neurolink.generate({
      input: { text: "Hello" },
    });
  },
);
```

## Related Documentation

- [API Reference](api-reference.md) -- SDK method signatures and options
- [Configuration Guide](../reference/configuration.md) -- Environment setup
- [Multimodal Chat](../features/multimodal-chat.md) -- Images, PDFs, CSV, and more
- [RAG Processing](../features/rag.md) -- Chunking, hybrid search, and reranking
