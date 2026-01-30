# Vercel AI SDK Research

> **Research Date:** January 2026
> **Latest Version:** AI SDK 6.0
> **Purpose:** Comprehensive analysis of Vercel AI SDK architecture, streaming patterns, and integration strategies for NeuroLink

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Streaming Patterns](#streaming-patterns)
4. [React Hooks (useChat, useCompletion)](#react-hooks)
5. [Structured Output](#structured-output)
6. [Provider Implementation](#provider-implementation)
7. [Streaming UI Patterns](#streaming-ui-patterns)
8. [Version Comparison (v4/v5/v6)](#version-comparison)
9. [Tool Calling & Agent Loops](#tool-calling--agent-loops)
10. [MCP Integration](#mcp-integration)
11. [Error Handling & Retry Patterns](#error-handling--retry-patterns)
12. [Observability & Telemetry](#observability--telemetry)
13. [Embeddings & Vector Search](#embeddings--vector-search)
14. [Image Generation & Multimodal](#image-generation--multimodal)
15. [Best Practices 2024-2025](#best-practices-2024-2025)
16. [Integration Recommendations for NeuroLink](#integration-recommendations-for-neurolink)

---

## Executive Summary

The Vercel AI SDK is a TypeScript toolkit for building AI-powered applications with React, Next.js, Vue, Svelte, and Node.js. It provides a unified API for 12+ AI providers, streaming capabilities, tool calling, structured output, and now full MCP (Model Context Protocol) support in version 6.0.

### Key Strengths

- **Unified Provider API**: Single interface for OpenAI, Anthropic, Google, Azure, and more
- **Streaming-First Design**: SSE-based streaming with progressive UI rendering
- **Type Safety**: Full TypeScript support with Zod schema validation
- **Framework Agnostic**: Works with React, Vue, Svelte, and vanilla Node.js
- **Production Ready**: Battle-tested with built-in error handling, retries, and telemetry

### Version Timeline

| Version    | Release Date | Key Features                                            |
| ---------- | ------------ | ------------------------------------------------------- |
| AI SDK 3.4 | 2024         | Data Stream Protocol, Language Model Middleware         |
| AI SDK 4.0 | 2024         | Image generation, MCP clients                           |
| AI SDK 5.0 | July 2025    | UIMessage/ModelMessage, SSE streaming, Agent primitives |
| AI SDK 6.0 | Late 2025    | Agent abstraction, Tool approval, DevTools, Full MCP    |

---

## Architecture Overview

### Two-Layer Architecture

The AI SDK consists of two main components:

1. **AI SDK Core**: Unified API for generating text, structured objects, tool calls, and building agents with LLMs
2. **AI SDK UI**: Framework-agnostic hooks for building chat and generative user interfaces

### Provider Architecture & Specification Layer

The foundation is the **specification layer**, which standardizes how different language models plug into functions like `streamText`. This enables the provider architecture where you can swap providers without changing application code.

```typescript
// Provider-agnostic code
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";

// Switch providers by changing one line
const result = await generateText({
  model: openai("gpt-4o"), // or anthropic('claude-3-5-sonnet')
  prompt: "Explain quantum computing",
});
```

### Language Model Specification V3

The V3 specification provides:

- **Standardized interface** across all AI providers
- **Consistent patterns** for text generation, streaming, and tool calling
- **Extensibility** via provider metadata and options

### Global Provider System (AI SDK 5+)

Models can be referenced using simple string identifiers:

```typescript
// Instead of importing providers
const result = await generateText({
  model: "openai/gpt-4o", // Global provider reference
  prompt: "Hello world",
});
```

### Message Types (AI SDK 5+)

Two distinct message types for different purposes:

| Type             | Purpose                               | Usage                                |
| ---------------- | ------------------------------------- | ------------------------------------ |
| **UIMessage**    | Source of truth for application state | Persistence, UI rendering, metadata  |
| **ModelMessage** | Optimized for LLM communication       | Streamlined, sent to language models |

```typescript
import { convertToModelMessages } from 'ai';

// UIMessage for storage and UI
const uiMessages: UIMessage[] = [...];

// Convert to ModelMessage for LLM calls
const modelMessages = convertToModelMessages(uiMessages);
```

### Sources

- [AI SDK Introduction](https://ai-sdk.dev/docs/introduction)
- [AI SDK 5 Blog Post](https://vercel.com/blog/ai-sdk-5)
- [AI SDK 6 Blog Post](https://vercel.com/blog/ai-sdk-6)
- [VoltAgent - What is Vercel AI SDK](https://voltagent.dev/blog/vercel-ai-sdk/)

---

## Streaming Patterns

### Data Stream Protocol

AI SDK uses Server-Sent Events (SSE) format with these advantages:

- Improved standardization
- Keep-alive through ping
- Reconnect capabilities
- Better cache handling

#### Stream Types

| Stream Type     | Description                                    | Supported By                      |
| --------------- | ---------------------------------------------- | --------------------------------- |
| **Text Stream** | Plain text chunks appended to form response    | useChat, useCompletion, useObject |
| **Data Stream** | Structured data with metadata and tool results | useChat, useCompletion            |

#### Text Streaming Pattern

Text content uses a start/delta/end pattern:

```typescript
// Server-Sent Event format
// text-start: {"id": "text-1"}
// text-delta: {"id": "text-1", "delta": "Hello "}
// text-delta: {"id": "text-1", "delta": "world!"}
// text-end: {"id": "text-1"}
```

### Custom Backend Integration

For non-Node.js backends, set the `x-vercel-ai-ui-message-stream` header to `v1`:

```python
# Python FastAPI example
from fastapi.responses import StreamingResponse

@app.post("/api/chat")
async def chat(request: Request):
    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={"x-vercel-ai-ui-message-stream": "v1"}
    )
```

### Data Parts (AI SDK 5+)

Type-safe streaming of arbitrary data from server to client:

```typescript
// Server-side
const stream = createDataStream({
  execute: async (dataStream) => {
    // Stream custom data
    dataStream.writeData({ type: "status", value: "Processing..." });

    // Stream AI response
    const result = await streamText({
      model: openai("gpt-4o"),
      prompt: "Hello",
    });

    result.mergeIntoDataStream(dataStream);
  },
});
```

### Transient Parts

Parts sent to client but not added to message history:

```typescript
// Only accessible via onData handler
const { messages } = useChat({
  onData: (data) => {
    // Handle transient data
    console.log("Transient:", data);
  },
});
```

### Sources

- [AI SDK Stream Protocol](https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol)
- [AI SDK Streaming Custom Data](https://ai-sdk.dev/docs/ai-sdk-ui/streaming-data)
- [AI SDK Foundations: Streaming](https://ai-sdk.dev/docs/foundations/streaming)

---

## React Hooks

### useChat Hook

The primary hook for building chat interfaces with real-time streaming:

```typescript
import { useChat } from 'ai/react';

function ChatComponent() {
  const {
    messages,        // Chat message history
    input,           // Current input value
    handleInputChange, // Input change handler
    handleSubmit,    // Form submit handler
    isLoading,       // Loading state
    error,           // Error state
    stop,            // Stop generation
    reload,          // Retry last message
    append,          // Append message programmatically
  } = useChat({
    api: '/api/chat',
    initialMessages: [],
    onFinish: (message) => console.log('Complete:', message),
    onError: (error) => console.error('Error:', error),
  });

  return (
    <form onSubmit={handleSubmit}>
      {messages.map((m) => (
        <div key={m.id}>{m.content}</div>
      ))}
      <input value={input} onChange={handleInputChange} />
    </form>
  );
}
```

#### Key Features

| Feature                        | Description                              |
| ------------------------------ | ---------------------------------------- |
| **Automatic state management** | Handles input, messages, loading, errors |
| **Streaming support**          | Progressive message updates              |
| **Tool handling**              | Automatic tool call execution display    |
| **Flexible transports**        | Fetch, WebSocket, or custom              |
| **State integration**          | Works with Zustand, Redux, MobX          |

#### AI SDK 5+ Modular Architecture

```typescript
import { useChat, AbstractChat } from "ai/react";

// Custom transport (e.g., WebSocket)
const chat = useChat({
  transport: customWebSocketTransport,
});

// Build custom hook using AbstractChat
class MyCustomChat extends AbstractChat {
  // Custom implementation
}
```

### useCompletion Hook

For text completion (non-chat) interfaces:

```typescript
import { useCompletion } from 'ai/react';

function CompletionComponent() {
  const {
    completion,      // Current completion text
    input,           // Input value
    handleInputChange,
    handleSubmit,
    complete,        // Execute completion programmatically
    isLoading,
    error,
    stop,
  } = useCompletion({
    api: '/api/completion',
  });

  return (
    <form onSubmit={handleSubmit}>
      <textarea value={input} onChange={handleInputChange} />
      <div>{completion}</div>
    </form>
  );
}
```

### useObject Hook

For streaming structured JSON objects:

```typescript
import { useObject } from 'ai/react';
import { z } from 'zod';

const recipeSchema = z.object({
  name: z.string(),
  ingredients: z.array(z.string()),
  instructions: z.array(z.string()),
});

function RecipeGenerator() {
  const { object, submit, isLoading } = useObject({
    api: '/api/generate-recipe',
    schema: recipeSchema,
  });

  return (
    <div>
      <button onClick={() => submit({ prompt: 'pasta recipe' })}>
        Generate
      </button>
      {object && (
        <div>
          <h2>{object.name}</h2>
          <ul>
            {object.ingredients?.map((i) => <li key={i}>{i}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
```

### Framework Support

| Framework | Hooks Available                                 |
| --------- | ----------------------------------------------- |
| React     | useChat, useCompletion, useObject, useAssistant |
| Vue       | useChat, useCompletion                          |
| Svelte    | useChat, useCompletion                          |
| Angular   | Partial support                                 |
| SolidJS   | useChat, useCompletion                          |

### Sources

- [AI SDK UI Reference](https://ai-sdk.dev/docs/reference/ai-sdk-ui)
- [useCompletion Reference](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-completion)
- [Mastra - Using Vercel AI SDK](https://mastra.ai/docs/frameworks/agentic-uis/ai-sdk)
- [LogRocket - Building Unified AI Interfaces](https://blog.logrocket.com/unified-ai-interfaces-vercel-sdk/)

---

## Structured Output

### Modern Approach (AI SDK 6+)

Use `output` property on `generateText` and `streamText`:

```typescript
import { generateText, Output } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const recipeSchema = z.object({
  name: z.string().describe("The recipe name"),
  ingredients: z
    .array(
      z.object({
        item: z.string(),
        amount: z.string(),
      }),
    )
    .describe("List of ingredients"),
  instructions: z.array(z.string()).describe("Step-by-step instructions"),
  prepTime: z.number().describe("Preparation time in minutes"),
});

const result = await generateText({
  model: openai("gpt-4o"),
  prompt: "Create a recipe for chocolate chip cookies",
  output: Output.object({ schema: recipeSchema }),
});

// Type-safe access
console.log(result.object.name); // TypeScript knows the type
```

### Legacy generateObject (Deprecated)

```typescript
// DEPRECATED - use generateText with output instead
import { generateObject } from "ai";

const result = await generateObject({
  model: openai("gpt-4o"),
  schema: recipeSchema,
  prompt: "Create a recipe",
});
```

### Zod Schema Best Practices

#### Use describe() for Better Results

```typescript
const userSchema = z.object({
  name: z.string().describe("The full name of the user"),
  age: z.number().describe("Age in years, must be positive"),
  email: z.string().email().describe("Valid email address"),
  role: z.enum(["admin", "user", "guest"]).describe("User access level"),
});
```

#### Prefer nullable() over optional()

```typescript
// Better - more reliable LLM output
const schema = z.object({
  middleName: z.string().nullable(), // Explicitly allows null
});

// Less reliable
const schema = z.object({
  middleName: z.string().optional(), // May cause issues
});
```

### JSON Schema Alternative

```typescript
import { jsonSchema } from "ai";

const result = await generateText({
  model: openai("gpt-4o"),
  prompt: "Generate a user profile",
  output: Output.object({
    schema: jsonSchema({
      type: "object",
      properties: {
        name: { type: "string" },
        age: { type: "number" },
      },
      required: ["name", "age"],
    }),
  }),
});
```

### Streaming Structured Output

```typescript
import { streamText, Output } from "ai";

const result = streamText({
  model: openai("gpt-4o"),
  prompt: "Generate a detailed recipe",
  output: Output.object({ schema: recipeSchema }),
});

for await (const partialObject of result.partialObjectStream) {
  console.log("Partial:", partialObject);
  // Progressive UI updates as object builds
}
```

### Sources

- [AI SDK Generating Structured Data](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data)
- [Vercel Academy - Structured Output](https://vercel.com/academy/ai-summary-app-with-nextjs/structured-output)
- [zodSchema Reference](https://ai-sdk.dev/docs/reference/ai-sdk-core/zod-schema)

---

## Provider Implementation

### Writing a Custom Provider

The AI SDK provides a Language Model Specification for creating custom providers:

#### 5-Step Implementation Process

1. **Create Provider Entry Point**
2. **Implement Language Model**
3. **Implement Message Conversion**
4. **Implement Streaming**
5. **Handle Errors**

```typescript
// Step 1: Provider Entry Point
import { Provider } from "@ai-sdk/provider";

export function createMyProvider(options: MyProviderOptions): Provider {
  return {
    languageModel: (modelId: string) => {
      return new MyLanguageModel(modelId, options);
    },
    textEmbeddingModel: (modelId: string) => {
      return new MyEmbeddingModel(modelId, options);
    },
  };
}
```

```typescript
// Step 2: Language Model Implementation
import { LanguageModel, LanguageModelSpecification } from "@ai-sdk/provider";

class MyLanguageModel implements LanguageModel {
  readonly specificationVersion = "v3";
  readonly provider = "my-provider";
  readonly modelId: string;

  constructor(modelId: string, options: MyProviderOptions) {
    this.modelId = modelId;
    // Initialize
  }

  async doGenerate(options: LanguageModelGenerateOptions) {
    // Implement generation
  }

  async doStream(options: LanguageModelStreamOptions) {
    // Implement streaming
  }
}
```

### OpenAI-Compatible Providers

For providers following OpenAI API format:

```typescript
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export const myProvider = createOpenAICompatible({
  baseURL: "https://api.myprovider.com/v1",
  headers: {
    Authorization: `Bearer ${process.env.MY_API_KEY}`,
  },
  name: "my-provider",
});

// Usage
const result = await generateText({
  model: myProvider("my-model"),
  prompt: "Hello",
});
```

### Provider Registry Pattern

Centralized model management:

```typescript
import { createProviderRegistry } from "ai";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";

const registry = createProviderRegistry({
  openai,
  anthropic,
  google,
});

// Use by string ID
const model = registry.languageModel("openai:gpt-4o");
const result = await generateText({
  model,
  prompt: "Hello",
});
```

### Custom Provider with Pre-configured Settings

```typescript
import { customProvider } from "ai";
import { openai } from "@ai-sdk/openai";

const myOpenAI = customProvider({
  languageModels: {
    fast: openai("gpt-4o-mini"),
    smart: openai("gpt-4o"),
    reasoning: openai("o1"),
  },
  fallbackProvider: openai,
});

// Usage with alias
const result = await generateText({
  model: myOpenAI("fast"),
  prompt: "Quick question",
});
```

### Community Providers

| Provider  | Package           | Description           |
| --------- | ----------------- | --------------------- |
| Ollama    | @ai-sdk/ollama    | Local model inference |
| Replicate | @ai-sdk/replicate | Cloud ML models       |
| Groq      | @ai-sdk/groq      | Fast inference        |
| Mistral   | @ai-sdk/mistral   | Mistral AI models     |
| Cohere    | @ai-sdk/cohere    | Cohere models         |
| Fireworks | @ai-sdk/fireworks | Fireworks AI          |

### Sources

- [Writing a Custom Provider](https://ai-sdk.dev/providers/community-providers/custom-providers)
- [OpenAI Compatible Providers](https://ai-sdk.dev/providers/openai-compatible-providers/custom-providers)
- [Provider Management](https://ai-sdk.dev/docs/ai-sdk-core/provider-management)
- [Replicate Reference Implementation](https://github.com/replicate/vercel-ai-provider)

---

## Streaming UI Patterns

### Progressive Rendering

```typescript
// Server Component (RSC)
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";

export async function generateResponse(prompt: string) {
  const result = streamText({
    model: openai("gpt-4o"),
    prompt,
  });

  return result.toDataStreamResponse();
}
```

```typescript
// Client Component
'use client';

import { useChat } from 'ai/react';

export function Chat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat();

  return (
    <div className="chat-container">
      {messages.map((m) => (
        <div
          key={m.id}
          className={`message ${m.role}`}
        >
          {/* Render content as it streams */}
          <StreamingContent content={m.content} />
        </div>
      ))}
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
      </form>
    </div>
  );
}
```

### Best Practices for Streaming UIs

#### 1. Efficient Rendering

```typescript
// Good: Render as plain text, avoid heavy re-layouts
const StreamingMessage = ({ content }: { content: string }) => (
  <div className="message-content">
    {content}
    <span className="cursor-blink" /> {/* CSS animation, not JS */}
  </div>
);

// Avoid: Re-measuring heights on each token
```

#### 2. Smart Auto-Scroll

```typescript
function useAutoScroll(
  containerRef: RefObject<HTMLDivElement>,
  messages: Message[],
) {
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      // Only auto-scroll if user is near bottom
      setShouldAutoScroll(scrollHeight - scrollTop - clientHeight < 100);
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (shouldAutoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, shouldAutoScroll]);
}
```

#### 3. Stop Generation Control

```typescript
const { messages, stop, isLoading } = useChat();

return (
  <div>
    {isLoading && (
      <button onClick={stop} className="stop-button">
        Stop generating
      </button>
    )}
    {/* Partial responses remain visible and useful */}
  </div>
);
```

### AI SDK Elements

Production-ready React components for AI interfaces:

```typescript
import { Response, Message, ToolDisplay } from '@ai-sdk/elements';

function ChatMessage({ message }: { message: UIMessage }) {
  return (
    <Message message={message}>
      {/* Optimized for streaming markdown */}
      <Response content={message.content} />

      {/* Tool call displays */}
      {message.toolInvocations?.map((tool) => (
        <ToolDisplay key={tool.toolCallId} invocation={tool} />
      ))}
    </Message>
  );
}
```

### Throttling Updates

```typescript
// React only: Throttle updates for performance
const { messages } = useChat({
  experimental_throttle: 50, // Update UI every 50ms max
});
```

### Sources

- [9.agency - Streaming AI Responses](https://www.9.agency/blog/streaming-ai-responses-vercel-ai-sdk)
- [AI SDK Foundations: Streaming](https://ai-sdk.dev/docs/foundations/streaming)
- [LogRocket - Real-time AI in Next.js](https://blog.logrocket.com/nextjs-vercel-ai-sdk-streaming/)
- [Vercel Academy - AI Elements](https://vercel.com/academy/ai-sdk/ai-elements)

---

## Version Comparison

### AI SDK 4.x to 5.0 Breaking Changes

| Area                 | v4                         | v5                           |
| -------------------- | -------------------------- | ---------------------------- |
| **Message Types**    | Single `Message` type      | `UIMessage` + `ModelMessage` |
| **Stream Protocol**  | Proprietary format         | Server-Sent Events (SSE)     |
| **Tool Parameters**  | `parameters`               | `inputSchema`                |
| **Attachments**      | `experimental_attachments` | `FileUIPart`                 |
| **Usage Data**       | `onFinish` callback        | `messageMetadata` function   |
| **Provider Options** | `providerMetadata`         | `providerOptions` (input)    |

#### Key Migration Steps (4.x to 5.0)

```typescript
// v4: Attachments
const { messages } = useChat({
  experimental_attachments: true,
});

// v5: File UI Parts
import { FileUIPart } from "ai";

const filePart: FileUIPart = {
  type: "file",
  data: base64Data,
  mimeType: "image/png",
};
```

```typescript
// v4: Tool rendering
messages.map((m) => {
  if (m.toolInvocations) {
    // Generic type
  }
});

// v5: Typed tool parts
messages.map((m) => {
  m.parts.forEach((part) => {
    if (part.type === "tool-getWeather") {
      // Typed tool part
    }
  });
});
```

### AI SDK 5.x to 6.0 Changes

| Feature               | v5                           | v6                          |
| --------------------- | ---------------------------- | --------------------------- |
| **Agents**            | `stopWhen` + `prepareStep`   | `Agent` class abstraction   |
| **Tool Approval**     | Manual                       | `needsApproval: true` flag  |
| **Structured Output** | Separate `generateObject`    | Unified with `generateText` |
| **Image Generation**  | `experimental_generateImage` | `generateImage` (stable)    |
| **DevTools**          | None                         | Built-in AI SDK DevTools    |

#### AI SDK 6 Agent Example

```typescript
import { Agent } from "ai";
import { openai } from "@ai-sdk/openai";

const customerServiceAgent = new Agent({
  model: openai("gpt-4o"),
  system: "You are a helpful customer service agent.",
  tools: {
    lookupOrder: {
      description: "Look up order details",
      inputSchema: z.object({ orderId: z.string() }),
      execute: async ({ orderId }) => {
        return await db.orders.findById(orderId);
      },
    },
    processRefund: {
      description: "Process a refund",
      inputSchema: z.object({ orderId: z.string(), amount: z.number() }),
      needsApproval: true, // Human-in-the-loop
      execute: async ({ orderId, amount }) => {
        return await payments.refund(orderId, amount);
      },
    },
  },
});

// Reusable across application
const result = await customerServiceAgent.generate({
  prompt: "I want to return order #12345",
});
```

### Migration Tools

```bash
# Automatic migration from v5 to v6
npx @ai-sdk/codemod v6

# Automatic migration from v4 to v5
npx @ai-sdk/codemod v5
```

### Sources

- [Migration Guide 5.0](https://ai-sdk.dev/docs/migration-guides/migration-guide-5-0)
- [Migration Guide 6.0](https://ai-sdk.dev/docs/migration-guides/migration-guide-6-0)
- [AI SDK 5 Blog Post](https://vercel.com/blog/ai-sdk-5)
- [AI SDK 6 Blog Post](https://vercel.com/blog/ai-sdk-6)

---

## Tool Calling & Agent Loops

### Basic Tool Definition

```typescript
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const result = await generateText({
  model: openai("gpt-4o"),
  prompt: "What is the weather in Tokyo?",
  tools: {
    getWeather: {
      description: "Get weather for a location",
      inputSchema: z.object({
        location: z.string().describe("City name"),
        unit: z.enum(["celsius", "fahrenheit"]).optional(),
      }),
      execute: async ({ location, unit = "celsius" }) => {
        const weather = await fetchWeather(location);
        return {
          temperature: weather.temp,
          unit,
          conditions: weather.conditions,
        };
      },
    },
  },
});
```

### Multi-Step Agent Loops

#### Using stopWhen (AI SDK 5+)

```typescript
import { generateText, stepCountIs } from "ai";

const result = await generateText({
  model: openai("gpt-4o"),
  prompt: "Research and summarize recent AI news",
  tools: {
    searchWeb: {
      /* ... */
    },
    readArticle: {
      /* ... */
    },
    summarize: {
      /* ... */
    },
  },
  stopWhen: stepCountIs(10), // Max 10 steps
});

// Access step history
for (const step of result.steps) {
  console.log("Step:", step.text, step.toolCalls);
}
```

#### Custom Stop Conditions

```typescript
import { hasToolCall, and, not } from "ai";

const result = await generateText({
  model: openai("gpt-4o"),
  prompt: "Complete the task",
  tools: {
    work: {
      /* ... */
    },
    finish: {
      description: "Call when task is complete",
      inputSchema: z.object({ summary: z.string() }),
      // No execute - acts as termination signal
    },
  },
  stopWhen: hasToolCall("finish"),
});
```

### prepareStep for Dynamic Control

```typescript
const result = await generateText({
  model: openai("gpt-4o"),
  prompt: "Complex multi-step task",
  tools: {
    /* ... */
  },
  stopWhen: stepCountIs(20),
  prepareStep: async ({ steps, stepNumber }) => {
    // Compress context after 5 steps
    if (stepNumber > 5) {
      return {
        messages: compressMessages(steps),
      };
    }

    // Switch to faster model for simple steps
    if (isSimpleStep(steps[steps.length - 1])) {
      return {
        model: openai("gpt-4o-mini"),
      };
    }

    return {}; // Use defaults
  },
});
```

### Force Tool Usage Pattern

```typescript
const result = await generateText({
  model: openai("gpt-4o"),
  prompt: "Process this data step by step",
  tools: {
    step1: {
      /* ... */
    },
    step2: {
      /* ... */
    },
    done: {
      description: "Call when all steps complete",
      inputSchema: z.object({ result: z.string() }),
    },
  },
  toolChoice: "required", // Force tool call at every step
  stopWhen: hasToolCall("done"),
});
```

### AI SDK 6 ToolLoopAgent

```typescript
import { ToolLoopAgent } from "ai";

const agent = new ToolLoopAgent({
  model: openai("gpt-4o"),
  tools: {
    search: {
      /* ... */
    },
    analyze: {
      /* ... */
    },
    report: {
      /* ... */
    },
  },
  stopWhen: stepCountIs(20), // Default
});

const result = await agent.run({
  prompt: "Analyze market trends for Q4 2025",
});
```

### Tool with Structured Output (AI SDK 6)

```typescript
import { generateText, Output } from "ai";

// Multi-step tool calling + structured output at the end
const result = await generateText({
  model: openai("gpt-4o"),
  prompt: "Research and create a report on renewable energy",
  tools: {
    search: {
      /* ... */
    },
    readDocument: {
      /* ... */
    },
  },
  output: Output.object({
    schema: z.object({
      title: z.string(),
      summary: z.string(),
      findings: z.array(z.string()),
      recommendations: z.array(z.string()),
    }),
  }),
  stopWhen: stepCountIs(10),
});

// result.object is the structured output
console.log(result.object.title);
```

### Sources

- [Vercel - How to Build AI Agents](https://vercel.com/kb/guide/how-to-build-ai-agents-with-vercel-and-the-ai-sdk)
- [AI SDK Agents: Loop Control](https://ai-sdk.dev/docs/agents/loop-control)
- [Vercel Academy - Tool Use](https://vercel.com/academy/ai-sdk/tool-use)

---

## MCP Integration

### Overview

Model Context Protocol (MCP) is an open standard introduced by Anthropic for standardizing AI system integrations with external tools and data sources. AI SDK 6 provides full MCP support.

### Creating MCP Clients

```typescript
import { experimental_createMCPClient } from "ai";

// Connect to MCP server
const mcpClient = await experimental_createMCPClient({
  transport: {
    type: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-github"],
    env: {
      GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    },
  },
});

// Get tools from MCP server
const tools = await mcpClient.tools();

// Use in generateText
const result = await generateText({
  model: openai("gpt-4o"),
  prompt: "List my recent GitHub repositories",
  tools,
});
```

### HTTP Transport

```typescript
const mcpClient = await experimental_createMCPClient({
  transport: {
    type: "http",
    url: "https://mcp-server.example.com",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  },
});
```

### MCP Resources and Prompts

```typescript
// Access resources (files, database records, API responses)
const resources = await mcpClient.resources();

// Access prompt templates
const prompts = await mcpClient.prompts();

// Use a prompt template
const result = await generateText({
  model: openai("gpt-4o"),
  messages: prompts["code-review"].messages({
    language: "typescript",
    code: sourceCode,
  }),
});
```

### MCP with OAuth Authentication

```typescript
import { experimental_createMCPClient, MCPOAuthHandler } from "ai";

const oauthHandler = new MCPOAuthHandler({
  clientId: process.env.MCP_CLIENT_ID,
  clientSecret: process.env.MCP_CLIENT_SECRET,
  tokenEndpoint: "https://auth.example.com/token",
});

const mcpClient = await experimental_createMCPClient({
  transport: {
    type: "http",
    url: "https://mcp-server.example.com",
  },
  auth: oauthHandler,
});
```

### Sources

- [Vercel MCP Documentation](https://vercel.com/docs/mcp)
- [AI SDK 6 Blog Post](https://vercel.com/blog/ai-sdk-6)
- [MintMCP - Vercel AI SDK with MCP](https://www.mintmcp.com/blog/connect-multiple-ai-models)

---

## Error Handling & Retry Patterns

### UI Error Handling

```typescript
import { useChat } from 'ai/react';

function Chat() {
  const { messages, error, reload } = useChat({
    onError: (error) => {
      console.error('Chat error:', error);
      // Send to error tracking
      Sentry.captureException(error);
    },
  });

  if (error) {
    return (
      <div className="error-container">
        <p>Something went wrong. Please try again.</p>
        <button onClick={() => reload()}>Retry</button>
      </div>
    );
  }

  return (/* chat UI */);
}
```

### Retry Configuration

```typescript
import { generateText } from "ai";

const result = await generateText({
  model: openai("gpt-4o"),
  prompt: "Hello",
  maxRetries: 3, // Default is 2
});
```

### Provider Fallback Pattern

```typescript
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";

async function generateWithFallback(prompt: string) {
  const providers = [
    { model: openai("gpt-4o"), name: "OpenAI" },
    { model: anthropic("claude-3-5-sonnet"), name: "Anthropic" },
  ];

  for (const provider of providers) {
    try {
      return await generateText({
        model: provider.model,
        prompt,
        maxRetries: 2,
      });
    } catch (error) {
      console.warn(`${provider.name} failed, trying next...`);
      continue;
    }
  }

  throw new Error("All providers failed");
}
```

### Rate Limit Handling

```typescript
import { RateLimitError } from "ai";

async function generateWithRateLimitHandling(prompt: string) {
  const maxAttempts = 5;
  let attempt = 0;

  while (attempt < maxAttempts) {
    try {
      return await generateText({
        model: openai("gpt-4o"),
        prompt,
      });
    } catch (error) {
      if (error instanceof RateLimitError) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.log(`Rate limited. Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        attempt++;
      } else {
        throw error;
      }
    }
  }

  throw new Error("Max retry attempts exceeded");
}
```

### Tool Call Error Handling

```typescript
const result = await generateText({
  model: openai("gpt-4o"),
  prompt: "Get user data",
  tools: {
    getUser: {
      inputSchema: z.object({ id: z.string() }),
      execute: async ({ id }) => {
        try {
          return await db.users.findById(id);
        } catch (error) {
          // Return error as content for LLM to handle
          return { error: "User not found", id };
        }
      },
    },
  },
});

// In AI SDK 5+, tool errors appear as tool-error content parts
for (const step of result.steps) {
  for (const content of step.content) {
    if (content.type === "tool-error") {
      console.log("Tool error:", content.error);
    }
  }
}
```

### Sources

- [AI SDK UI: Error Handling](https://ai-sdk.dev/docs/ai-sdk-ui/error-handling)
- [AI SDK Core: Error Handling](https://ai-sdk.dev/docs/ai-sdk-core/error-handling)
- [AI_RetryError Reference](https://ai-sdk.dev/docs/reference/ai-sdk-errors/ai-retry-error)

---

## Observability & Telemetry

### OpenTelemetry Integration

```typescript
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

const result = await generateText({
  model: openai("gpt-4o"),
  prompt: "Hello world",
  experimental_telemetry: {
    isEnabled: true,
    functionId: "my-chat-function",
    metadata: {
      userId: "user-123",
      sessionId: "session-456",
    },
    recordInputs: true,
    recordOutputs: true,
  },
});
```

### Telemetry Configuration

| Option          | Description                 | Default   |
| --------------- | --------------------------- | --------- |
| `isEnabled`     | Enable telemetry collection | false     |
| `functionId`    | Identifier for the function | undefined |
| `metadata`      | Custom metadata to include  | {}        |
| `recordInputs`  | Record input prompts        | true      |
| `recordOutputs` | Record model outputs        | true      |

### Span Hierarchy

```
ai.generateText (top-level span)
├── ai.doGenerate (provider call span)
│   └── Provider API call
├── ai.toolCall (tool execution span)
│   └── Tool execution
└── ai.doGenerate (follow-up generation)
```

### Language Model Middleware

```typescript
import { experimental_wrapLanguageModel } from "ai";

const loggedModel = experimental_wrapLanguageModel({
  model: openai("gpt-4o"),
  middleware: {
    transformParams: async ({ params }) => {
      console.log("Request:", params);
      return params;
    },
    wrapGenerate: async ({ doGenerate, params }) => {
      const startTime = Date.now();
      const result = await doGenerate();
      console.log("Generation took:", Date.now() - startTime, "ms");
      return result;
    },
    wrapStream: async ({ doStream, params }) => {
      const startTime = Date.now();
      const result = await doStream();
      // Log streaming metrics
      return result;
    },
  },
});
```

### Third-Party Integrations

| Platform       | Integration                             |
| -------------- | --------------------------------------- |
| **Langfuse**   | Open-source observability for AI agents |
| **SigNoz**     | OpenTelemetry-native monitoring         |
| **LangSmith**  | LangChain's observability platform      |
| **Opik**       | Comet's AI observability tool           |
| **Braintrust** | AI evaluation and monitoring            |

#### Langfuse Example

```typescript
import { Langfuse } from "langfuse";
import { generateText } from "ai";

const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
});

const trace = langfuse.trace({ name: "chat-completion" });

const result = await generateText({
  model: openai("gpt-4o"),
  prompt: "Hello",
  experimental_telemetry: {
    isEnabled: true,
    tracer: trace,
  },
});
```

### Sources

- [AI SDK Core: Telemetry](https://ai-sdk.dev/docs/ai-sdk-core/telemetry)
- [Langfuse - Vercel AI SDK Observability](https://langfuse.com/integrations/frameworks/vercel-ai-sdk)
- [SigNoz - Vercel AI SDK Observability](https://signoz.io/docs/vercel-ai-sdk-observability/)

---

## Embeddings & Vector Search

### Generating Embeddings

```typescript
import { embed, embedMany } from "ai";
import { openai } from "@ai-sdk/openai";

// Single embedding
const { embedding } = await embed({
  model: openai.embedding("text-embedding-3-small"),
  value: "What is machine learning?",
});

// Multiple embeddings
const { embeddings } = await embedMany({
  model: openai.embedding("text-embedding-3-small"),
  values: [
    "Machine learning is...",
    "Deep learning is...",
    "Neural networks are...",
  ],
});
```

### Embedding Models

| Model                  | Dimensions | Use Case        |
| ---------------------- | ---------- | --------------- |
| text-embedding-3-small | 1536       | Cost-effective  |
| text-embedding-3-large | 3072       | Higher accuracy |
| text-embedding-ada-002 | 1536       | Legacy          |

### Similarity Search

```typescript
import { cosineSimilarity } from "ai";

const searchEmbedding = await embed({
  model: openai.embedding("text-embedding-3-small"),
  value: "How do I train a model?",
});

// Compare with database entries
const results = database.map((entry) => ({
  ...entry,
  similarity: cosineSimilarity(searchEmbedding.embedding, entry.embedding),
}));

// Sort by similarity
results.sort((a, b) => b.similarity - a.similarity);
```

### RAG Implementation

```typescript
import { generateText, embed } from "ai";
import { openai } from "@ai-sdk/openai";

async function ragChat(query: string) {
  // 1. Embed the query
  const { embedding } = await embed({
    model: openai.embedding("text-embedding-3-small"),
    value: query,
  });

  // 2. Search vector database
  const relevantDocs = await vectorDb.search(embedding, { topK: 5 });

  // 3. Generate response with context
  const result = await generateText({
    model: openai("gpt-4o"),
    system: `Use the following context to answer questions:
${relevantDocs.map((d) => d.content).join("\n\n")}`,
    prompt: query,
  });

  return result.text;
}
```

### Chunking Strategies

```typescript
// Simple chunking by paragraphs
function chunkByParagraph(text: string, maxLength: number = 1000): string[] {
  const paragraphs = text.split("\n\n");
  const chunks: string[] = [];
  let currentChunk = "";

  for (const para of paragraphs) {
    if (currentChunk.length + para.length > maxLength) {
      chunks.push(currentChunk.trim());
      currentChunk = para;
    } else {
      currentChunk += "\n\n" + para;
    }
  }

  if (currentChunk) chunks.push(currentChunk.trim());
  return chunks;
}
```

### Sources

- [AI Hero - Create Embeddings with Vercel AI SDK](https://www.aihero.dev/create-embeddings-with-vercel-ai-sdk)
- [Upstash Vector Integration](https://upstash.com/docs/vector/integrations/ai-sdk)
- [Vercel - Understanding Vector Databases](https://vercel.com/kb/guide/understanding-vector-databases-for-ai-apps)

---

## Image Generation & Multimodal

### Image Generation (AI SDK 6)

```typescript
import { generateImage } from "ai";
import { openai } from "@ai-sdk/openai";

const { image } = await generateImage({
  model: openai.image("dall-e-3"),
  prompt: "A futuristic city at sunset",
  size: "1024x1024",
  quality: "hd",
});

// image.base64 or image.url
```

### Image Editing

```typescript
const { image } = await generateImage({
  model: openai.image("gpt-image-1"),
  prompt: "Add a rainbow to the sky",
  image: existingImageBase64, // Reference image
  mask: maskBase64, // Optional mask for inpainting
});
```

### Multimodal Input

```typescript
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

const result = await generateText({
  model: openai("gpt-4o"),
  messages: [
    {
      role: "user",
      content: [
        { type: "text", text: "What is in this image?" },
        {
          type: "image",
          image: imageBuffer, // Buffer, base64, or URL
        },
      ],
    },
  ],
});
```

### Provider Support

| Provider  | Image Generation          | Vision         | Image Editing |
| --------- | ------------------------- | -------------- | ------------- |
| OpenAI    | Yes (DALL-E, gpt-image-1) | Yes (GPT-4o)   | Yes           |
| Google    | Yes (Imagen)              | Yes (Gemini)   | Limited       |
| Anthropic | No                        | Yes (Claude 3) | No            |
| Replicate | Yes (SDXL, etc.)          | Varies         | Varies        |

### Sources

- [Vercel AI Gateway - Image Generation](https://vercel.com/docs/ai-gateway/image-generation)
- [AI SDK 6 Blog Post](https://vercel.com/blog/ai-sdk-6)
- [AI SDK 4.1 Blog Post](https://vercel.com/blog/ai-sdk-4-1)

---

## Best Practices 2024-2025

### Architecture Patterns

#### 1. Start Simple, Scale Up

```typescript
// Phase 1: Simple text generation
const result = await generateText({
  model: openai("gpt-4o"),
  prompt: userInput,
});

// Phase 2: Add structured output
const result = await generateText({
  model: openai("gpt-4o"),
  prompt: userInput,
  output: Output.object({ schema: responseSchema }),
});

// Phase 3: Add tool calling
const result = await generateText({
  model: openai("gpt-4o"),
  prompt: userInput,
  tools: {
    /* ... */
  },
  output: Output.object({ schema: responseSchema }),
});

// Phase 4: Full agent
const agent = new Agent({
  model: openai("gpt-4o"),
  tools: {
    /* ... */
  },
  // ...
});
```

#### 2. Multi-Provider Strategy

```typescript
const providers = {
  primary: openai("gpt-4o"),
  fallback: anthropic("claude-3-5-sonnet"),
  fast: openai("gpt-4o-mini"),
  reasoning: openai("o1"),
};

async function smartGenerate(task: Task) {
  const model =
    task.complexity === "high"
      ? providers.reasoning
      : task.latencySensitive
        ? providers.fast
        : providers.primary;

  try {
    return await generateText({ model, prompt: task.prompt });
  } catch {
    return await generateText({
      model: providers.fallback,
      prompt: task.prompt,
    });
  }
}
```

#### 3. Tool Description Quality

```typescript
// Good: Clear, specific description
{
  getWeather: {
    description: 'Get current weather conditions for a city. Returns temperature, humidity, and conditions. Use when user asks about weather, temperature, or if they should bring an umbrella.',
    inputSchema: z.object({
      city: z.string().describe('City name, e.g., "San Francisco" or "Tokyo"'),
      unit: z.enum(['celsius', 'fahrenheit']).describe('Temperature unit preference'),
    }),
  },
}

// Bad: Vague description
{
  getWeather: {
    description: 'Gets weather',
    inputSchema: z.object({ city: z.string() }),
  },
}
```

### Performance Optimization

#### 1. Edge Deployment

```typescript
// app/api/chat/route.ts
export const runtime = "edge";

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai("gpt-4o"),
    messages,
  });

  return result.toDataStreamResponse();
}
```

#### 2. Streaming for Large Responses

```typescript
// Always stream for better UX
const result = streamText({
  model: openai("gpt-4o"),
  prompt: longPrompt,
});

// Avoid: Waiting for complete response
const result = await generateText({
  model: openai("gpt-4o"),
  prompt: longPrompt,
});
```

#### 3. Caching Embeddings

```typescript
import { LRUCache } from "lru-cache";

const embeddingCache = new LRUCache<string, number[]>({
  max: 1000,
  ttl: 1000 * 60 * 60, // 1 hour
});

async function getEmbedding(text: string) {
  const cached = embeddingCache.get(text);
  if (cached) return cached;

  const { embedding } = await embed({
    model: openai.embedding("text-embedding-3-small"),
    value: text,
  });

  embeddingCache.set(text, embedding);
  return embedding;
}
```

### Security Best Practices

#### 1. Human-in-the-Loop for Sensitive Actions

```typescript
const agent = new Agent({
  model: openai("gpt-4o"),
  tools: {
    readData: {
      /* ... */
    }, // No approval needed
    deleteRecord: {
      needsApproval: true, // Requires human approval
      execute: async ({ id }) => {
        await db.records.delete(id);
      },
    },
    processPayment: {
      needsApproval: true,
      execute: async ({ amount, recipient }) => {
        await payments.send(amount, recipient);
      },
    },
  },
});
```

#### 2. Input Validation

```typescript
const inputSchema = z.object({
  prompt: z
    .string()
    .min(1)
    .max(10000)
    .refine((val) => !containsSensitivePatterns(val), {
      message: "Invalid input",
    }),
});
```

#### 3. Output Sanitization

```typescript
const result = await generateText({
  model: openai("gpt-4o"),
  prompt: userInput,
});

// Sanitize before displaying
const sanitizedOutput = DOMPurify.sanitize(result.text);
```

### Sources

- [Vercel Academy - Builders Guide to AI SDK](https://vercel.com/academy/ai-sdk)
- [Dev.to - Vercel AI SDK Complete Guide](https://dev.to/pockit_tools/vercel-ai-sdk-complete-guide-building-production-ready-ai-chat-apps-with-nextjs-4cp6)
- [Acceli - AI SDK Production Guide](https://acceli.com/blog/vercel-ai-sdk-production-guide)

---

## Integration Recommendations for NeuroLink

### 1. Streaming Protocol Alignment

NeuroLink should implement the AI SDK Data Stream Protocol for frontend compatibility:

```typescript
// NeuroLink could expose AI SDK-compatible streaming
class NeuroLink {
  async streamText(options: StreamOptions): DataStreamResponse {
    const provider = this.getProvider(options.provider);
    const stream = provider.streamText(options);

    // Convert to AI SDK format
    return new DataStreamResponse(stream, {
      headers: {
        "x-vercel-ai-ui-message-stream": "v1",
      },
    });
  }
}
```

### 2. Provider Specification Compliance

Consider implementing the Language Model Specification V3 for AI SDK compatibility:

```typescript
// NeuroLink provider as AI SDK compatible provider
import { LanguageModel } from "@ai-sdk/provider";

class NeuroLinkLanguageModel implements LanguageModel {
  readonly specificationVersion = "v3";
  readonly provider = "neurolink";

  constructor(
    private neurolink: NeuroLink,
    private modelId: string,
  ) {}

  async doGenerate(options: LanguageModelGenerateOptions) {
    return this.neurolink.generate({
      model: this.modelId,
      messages: options.prompt,
      // Map other options
    });
  }

  async doStream(options: LanguageModelStreamOptions) {
    return this.neurolink.stream({
      model: this.modelId,
      messages: options.prompt,
    });
  }
}
```

### 3. Tool Format Compatibility

NeuroLink tools should be convertible to AI SDK format:

```typescript
// Existing NeuroLink tool
const neuroLinkTool = {
  name: "getWeather",
  description: "Get weather",
  parameters: {
    /* JSON Schema */
  },
  execute: async (args) => {
    /* ... */
  },
};

// Conversion to AI SDK format
function toAISDKTool(tool: NeuroLinkTool): AISDKTool {
  return {
    description: tool.description,
    inputSchema: jsonSchema(tool.parameters),
    execute: tool.execute,
  };
}
```

### 4. Structured Output Alignment

Align with AI SDK's Output.object pattern:

```typescript
// NeuroLink structured output API
const result = await neurolink.generate({
  prompt: "Generate a recipe",
  structuredOutput: {
    schema: recipeSchema, // Zod or JSON Schema
    mode: "json", // or 'tool'
  },
});
```

### 5. Message Type Compatibility

Support both UIMessage and ModelMessage patterns:

```typescript
// NeuroLink message converter
import { convertToModelMessages } from "ai";

class NeuroLink {
  async chat(options: ChatOptions) {
    // Accept UIMessage format from frontends
    const modelMessages = convertToModelMessages(options.messages);

    // Process with NeuroLink
    return this.generate({ messages: modelMessages });
  }
}
```

### 6. Telemetry Integration

Leverage AI SDK's OpenTelemetry patterns:

```typescript
// NeuroLink telemetry configuration
const neurolink = new NeuroLink({
  telemetry: {
    enabled: true,
    serviceName: "neurolink",
    exporter: opentelemetryExporter,
  },
});
```

### 7. MCP Tool Integration

NeuroLink already supports MCP - ensure compatibility with AI SDK MCP patterns:

```typescript
// NeuroLink MCP tools as AI SDK tools
const mcpTools = await neurolink.getMCPTools("github");

// These should work with AI SDK
const result = await generateText({
  model: neurolink.asAISDKModel("gpt-4o"),
  tools: mcpTools, // NeuroLink MCP tools
  prompt: "List my repos",
});
```

### Summary

The Vercel AI SDK represents the current state of the art for building AI-powered applications in TypeScript/JavaScript. Its streaming-first design, type-safe structured outputs, comprehensive provider system, and now full MCP support in v6 make it an excellent reference for NeuroLink's continued evolution.

Key areas for potential NeuroLink alignment:

- Data Stream Protocol for frontend compatibility
- Language Model Specification V3 for provider interoperability
- UIMessage/ModelMessage patterns for persistence
- Telemetry patterns for observability
- Agent abstraction for reusable AI workflows

---

## References

### Official Documentation

- [AI SDK Documentation](https://ai-sdk.dev/docs/introduction)
- [AI SDK Migration Guides](https://ai-sdk.dev/docs/migration-guides)
- [Vercel AI SDK Docs](https://vercel.com/docs/ai-sdk)

### Blog Posts

- [AI SDK 5 Announcement](https://vercel.com/blog/ai-sdk-5)
- [AI SDK 6 Announcement](https://vercel.com/blog/ai-sdk-6)
- [AI SDK 3.4 - Language Model Middleware](https://vercel.com/blog/ai-sdk-3-4)

### Learning Resources

- [Vercel Academy - Builders Guide to AI SDK](https://vercel.com/academy/ai-sdk)
- [Codecademy - Complete Guide to Vercel's AI SDK](https://www.codecademy.com/article/guide-to-vercels-ai-sdk)

### Community Resources

- [GitHub - vercel/ai](https://github.com/vercel/ai)
- [AI SDK Provider Registry Template](https://vercel.com/templates/next.js/ai-sdk-provider-registry)
- [Replicate Provider Reference Implementation](https://github.com/replicate/vercel-ai-provider)

### Observability Integrations

- [Langfuse Integration](https://langfuse.com/integrations/frameworks/vercel-ai-sdk)
- [SigNoz Integration](https://signoz.io/docs/vercel-ai-sdk-observability/)
- [LangSmith Integration](https://docs.smith.langchain.com/observability/how_to_guides/trace_with_vercel_ai_sdk)

### Related Frameworks

- [Mastra - Using Vercel AI SDK](https://mastra.ai/docs/frameworks/agentic-uis/ai-sdk)
