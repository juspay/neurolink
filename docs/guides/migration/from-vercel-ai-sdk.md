# Migrating from Vercel AI SDK to NeuroLink

## Why Migrate?

While Vercel AI SDK is excellent for Next.js applications, NeuroLink offers broader capabilities for enterprise and multi-framework applications:

| Benefit                 | Vercel AI SDK                  | NeuroLink                                |
| ----------------------- | ------------------------------ | ---------------------------------------- |
| **Multi-Provider**      | Separate packages per provider | 21+ providers in single package          |
| **Framework Support**   | Optimized for Next.js          | Next.js, SvelteKit, Express, any Node.js |
| **Tool Integration**    | Function calling only          | MCP (58+ servers) + function calling     |
| **Enterprise Features** | Basic                          | HITL, Redis memory, middleware, failover |
| **Memory/State**        | useChat hook (client-side)     | Redis-backed server-side memory          |
| **Production Ready**    | Good for prototypes            | Battle-tested at enterprise scale        |
| **Bundle Size**         | Moderate                       | Optimized, tree-shakeable                |
| **Streaming**           | Excellent                      | Excellent (same quality)                 |

**Migration time:** Most Next.js apps can migrate in 2-3 hours with feature parity and enhanced capabilities.

---

## Concept Mapping

| Vercel AI SDK                        | NeuroLink               | Notes                                 |
| ------------------------------------ | ----------------------- | ------------------------------------- |
| `generateText()`                     | `generate()`            | Similar API, unified across providers |
| `streamText()`                       | `stream()`              | Built-in streaming                    |
| `useChat()`                          | Custom hook + API route | Server-side memory more robust        |
| `CoreMessage`                        | `ChatMessage`           | Type compatible                       |
| `tool()` function                    | MCP Tools               | More powerful, 58+ servers            |
| Provider packages (`@ai-sdk/openai`) | `provider` parameter    | Single package                        |
| `generateObject()`                   | `generate({ schema })`  | Zod schema validation                 |
| Edge Runtime                         | Node.js runtime         | Compatible with Edge via adapters     |

---

## Quick Start Migration

### Before (Vercel AI SDK)

```typescript
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

const { text } = await generateText({
  model: openai("gpt-4"),
  prompt: "Write a haiku about programming",
});

console.log(text);
```

### After (NeuroLink)

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink({
  provider: "openai",
  model: "gpt-4",
});

const result = await neurolink.generate({
  input: { text: "Write a haiku about programming" },
});

console.log(result.content);
```

**Key changes:**

- Single import instead of multiple packages
- Unified `generate()` method
- `content` instead of `text` property
- Provider specified in config, not per-call

---

## Feature-by-Feature Migration

### 1. Text Generation

**Vercel AI SDK:**

```typescript
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

const result = await generateText({
  model: openai("gpt-4"),
  prompt: "Explain TypeScript",
  temperature: 0.7,
  maxTokens: 500,
});

console.log(result.text);
console.log(result.usage);
```

**NeuroLink:**

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink({ provider: "openai" });

const result = await neurolink.generate({
  input: { text: "Explain TypeScript" },
  model: "gpt-4",
  temperature: 0.7,
  maxTokens: 500,
});

console.log(result.content);
console.log(result.usage); // { promptTokens, completionTokens, totalTokens }
```

---

### 2. Streaming

**Vercel AI SDK:**

```typescript
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";

const result = await streamText({
  model: openai("gpt-4"),
  prompt: "Tell me a story",
});

for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}
```

**NeuroLink:**

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink({ provider: "openai" });

const result = await neurolink.stream({
  input: { text: "Tell me a story" },
  model: "gpt-4",
});

for await (const chunk of result.stream) {
  process.stdout.write(chunk.content);
}
```

**Full chunk data:**

```typescript
for await (const chunk of result.stream) {
  console.log(chunk.content); // Text content
}
```

---

### 3. Tool Calling (Function Calling)

**Vercel AI SDK:**

```typescript
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const result = await generateText({
  model: openai("gpt-4"),
  prompt: "What is the weather in San Francisco?",
  tools: {
    getWeather: {
      description: "Get weather for a location",
      parameters: z.object({
        location: z.string(),
      }),
      execute: async ({ location }) => {
        return { temp: 72, condition: "Sunny" };
      },
    },
  },
});
```

**NeuroLink:**

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink({ provider: "openai" });

// Option 1: Register custom tool
neurolink.registerTool("getWeather", {
  name: "getWeather",
  description: "Get weather for a location",
  inputSchema: {
    type: "object",
    properties: {
      location: { type: "string" },
    },
    required: ["location"],
  },
  execute: async ({ location }) => {
    return { temp: 72, condition: "Sunny" };
  },
});

const result = await neurolink.generate({
  input: { text: "What is the weather in San Francisco?" },
  model: "gpt-4",
});

// Option 2: Use MCP server (more powerful)
await neurolink.addExternalMCPServer("weather", {
  command: "npx",
  args: ["-y", "@modelcontextprotocol/server-weather"],
  transport: "stdio",
  env: { WEATHER_API_KEY: process.env.WEATHER_API_KEY },
});

const result2 = await neurolink.generate({
  input: { text: "What is the weather in San Francisco?" },
});
```

**Benefits:**

- MCP servers provide 58+ pre-built integrations
- No manual tool registration needed
- Tools work across all providers

---

### 4. Structured Output

**Vercel AI SDK:**

```typescript
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const result = await generateObject({
  model: openai("gpt-4"),
  schema: z.object({
    name: z.string(),
    age: z.number(),
    email: z.string().email(),
  }),
  prompt: "Generate a user profile for John Doe, age 30",
});

console.log(result.object); // { name: "John Doe", age: 30, email: "..." }
```

**NeuroLink:**

```typescript
import { NeuroLink } from "@juspay/neurolink";
import { z } from "zod";

const neurolink = new NeuroLink({ provider: "openai" });

const schema = z.object({
  name: z.string(),
  age: z.number(),
  email: z.string().email(),
});

const result = await neurolink.generate({
  input: { text: "Generate a user profile for John Doe, age 30" },
  model: "gpt-4",
  schema,
});

console.log(result.content); // JSON string with { name: "John Doe", age: 30, email: "..." }
// Automatically validated against Zod schema
```

**Benefits:**

- Type-safe results
- Automatic validation
- Works across all providers

---

### 5. Multi-Provider Support

**Vercel AI SDK:**

```typescript
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";

// OpenAI
const result1 = await generateText({
  model: openai("gpt-4"),
  prompt: "Hello",
});

// Anthropic (requires separate package)
const result2 = await generateText({
  model: anthropic("claude-3-5-sonnet-20241022"),
  prompt: "Hello",
});
```

**NeuroLink:**

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// OpenAI
const result1 = await neurolink.generate({
  input: { text: "Hello" },
  provider: "openai",
  model: "gpt-4",
});

// Anthropic (same package)
const result2 = await neurolink.generate({
  input: { text: "Hello" },
  provider: "anthropic",
  model: "claude-3-5-sonnet-20241022",
});

// Or set default provider
const neurolinkAnthropic = new NeuroLink({ provider: "anthropic" });
```

**With automatic failover:**

```typescript
const neurolink = new NeuroLink({
  provider: "openai",
  fallbackProviders: ["anthropic", "vertex"],
});

// Automatically tries Anthropic or Vertex if OpenAI fails
const result = await neurolink.generate({
  input: { text: "Hello" },
});
```

**Benefits:**

- Single package for all 21+ providers
- Runtime provider switching
- Automatic failover
- No need to install separate packages

---

## Next.js Integration

### Pattern 1: API Routes

**Vercel AI SDK:**

```typescript
// app/api/chat/route.ts
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = await streamText({
    model: openai("gpt-4"),
    messages,
  });

  return result.toAIStreamResponse();
}
```

**NeuroLink:**

```typescript
// app/api/chat/route.ts
import { NeuroLink } from "@juspay/neurolink";
import { NextResponse } from "next/server";

const neurolink = new NeuroLink({
  provider: "openai",
  conversationMemory: {
    enabled: true,
    store: "redis", // Persistent across instances
  },
});

export async function POST(req: Request) {
  const { message } = await req.json();

  const result = await neurolink.stream({
    input: { text: message },
    model: "gpt-4",
  });

  // Convert stream to Response
  const encoder = new TextEncoder();
  const readableStream = new ReadableStream({
    async start(controller) {
      for await (const chunk of result.stream) {
        controller.enqueue(encoder.encode(chunk.content));
      }
      controller.close();
    },
  });

  return new Response(readableStream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
```

**With better error handling:**

```typescript
export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    const result = await neurolink.stream({
      input: { text: message },
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`),
            );
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (error) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: "Stream error" })}\n\n`,
            ),
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 },
    );
  }
}
```

---

### Pattern 2: Server Components

**Vercel AI SDK:**

```typescript
// app/page.tsx (Server Component)
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

export default async function Page() {
  const { text } = await generateText({
    model: openai('gpt-4'),
    prompt: 'Generate a welcome message',
  });

  return <div>{text}</div>;
}
```

**NeuroLink:**

```typescript
// app/page.tsx (Server Component)
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink({ provider: "openai" });

export default async function Page() {
  const result = await neurolink.generate({
    input: { text: "Generate a welcome message" },
    model: "gpt-4"
  });

  return <div>{result.content}</div>;
}
```

**With caching:**

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink({
  provider: "openai",
  conversationMemory: {
    enabled: true,
    store: "redis",
    ttl: 3600  // Cache for 1 hour
  }
});

export default async function Page() {
  const result = await neurolink.generate({
    input: { text: "Generate a welcome message" }
  });

  return <div>{result.content}</div>;
}

// Enable Next.js caching
export const revalidate = 3600;  // Revalidate every hour
```

---

### Pattern 3: useChat Alternative

**Vercel AI SDK:**

```typescript
// app/chat/page.tsx
'use client';

import { useChat } from 'ai/react';

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: '/api/chat',
  });

  return (
    <div>
      {messages.map(m => (
        <div key={m.id}>{m.content}</div>
      ))}
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
      </form>
    </div>
  );
}
```

**NeuroLink:**

```typescript
// app/chat/page.tsx
'use client';

import { useState } from 'react';

export default function Chat() {
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input })
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;

        const chunk = decoder.decode(value);
        assistantMessage += chunk;

        // Update UI in real-time
        setMessages(prev => {
          const updated = [...prev];
          if (updated[updated.length - 1]?.role === 'assistant') {
            updated[updated.length - 1].content = assistantMessage;
          } else {
            updated.push({ role: 'assistant', content: assistantMessage });
          }
          return updated;
        });
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {messages.map((m, i) => (
        <div key={i}>{m.content}</div>
      ))}
      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
        />
      </form>
    </div>
  );
}
```

**Or create a custom hook:**

```typescript
// hooks/useNeuroLink.ts
import { useState, useCallback } from "react";

export function useNeuroLink() {
  const [messages, setMessages] = useState<
    Array<{ role: string; content: string }>
  >([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (message: string) => {
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let content = "";

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;
        content += decoder.decode(value);

        setMessages((prev) => {
          const updated = [...prev];
          if (updated[updated.length - 1]?.role === "assistant") {
            updated[updated.length - 1].content = content;
          } else {
            updated.push({ role: "assistant", content });
          }
          return updated;
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { messages, sendMessage, isLoading };
}

// Usage
const { messages, sendMessage, isLoading } = useNeuroLink();
```

---

### Pattern 4: Server Actions

**Vercel AI SDK:**

```typescript
// app/actions.ts
"use server";

import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

export async function generateResponse(message: string) {
  const { text } = await generateText({
    model: openai("gpt-4"),
    prompt: message,
  });
  return text;
}
```

**NeuroLink:**

```typescript
// app/actions.ts
"use server";

import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink({
  provider: "openai",
  conversationMemory: {
    enabled: true,
    store: "redis",
  },
});

export async function generateResponse(message: string) {
  const result = await neurolink.generate({
    input: { text: message },
    model: "gpt-4",
  });
  return result.content;
}
```

**With user context:**

```typescript
"use server";

import { NeuroLink } from "@juspay/neurolink";
import { cookies } from "next/headers";

export async function generateResponse(message: string) {
  const userId = cookies().get("userId")?.value;

  const neurolink = new NeuroLink({
    provider: "openai",
    conversationMemory: {
      enabled: true,
      store: "redis",
      namespace: userId, // User-specific conversations
    },
  });

  const result = await neurolink.generate({
    input: { text: message },
  });

  return result.content;
}
```

---

## Edge Runtime Support

**Vercel AI SDK:**

```typescript
// app/api/chat/route.ts
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";

export const runtime = "edge";

export async function POST(req: Request) {
  const result = await streamText({
    model: openai("gpt-4"),
    prompt: "Hello",
  });
  return result.toAIStreamResponse();
}
```

**NeuroLink:**

```typescript
// app/api/chat/route.ts
import { NeuroLink } from "@juspay/neurolink";

// Note: NeuroLink is designed for Node.js runtime
// For Edge Runtime, use fetch API directly:
export const runtime = "edge";

export async function POST(req: Request) {
  const { message } = await req.json();

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4",
      messages: [{ role: "user", content: message }],
      stream: true,
    }),
  });

  return response;
}

// Alternative: Use Node.js runtime (recommended for NeuroLink)
export const runtime = "nodejs";

const neurolink = new NeuroLink({ provider: "openai" });

export async function POST(req: Request) {
  const { message } = await req.json();

  const result = await neurolink.stream({
    input: { text: message },
  });

  // Convert to Response...
}
```

**Recommendation:** NeuroLink works best with Node.js runtime. For Edge Runtime, consider using provider APIs directly or wait for Edge-compatible version.

---

## Multimodal Support

**Vercel AI SDK:**

```typescript
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

const result = await generateText({
  model: openai("gpt-4-vision-preview"),
  messages: [
    {
      role: "user",
      content: [
        { type: "text", text: "What is in this image?" },
        { type: "image", image: imageUrl },
      ],
    },
  ],
});
```

**NeuroLink:**

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink({ provider: "openai" });

const result = await neurolink.generate({
  input: {
    text: "What is in this image?",
    images: [{ url: imageUrl }],
  },
  model: "gpt-4-vision-preview",
});
```

**With file path:**

```typescript
const result = await neurolink.generate({
  input: {
    text: "What is in this image?",
    images: [{ path: "./image.jpg" }],
  },
});
```

**With PDF:**

```typescript
const result = await neurolink.generate({
  input: {
    text: "Summarize this document",
    pdfs: [{ path: "./document.pdf" }],
  },
  provider: "vertex", // Vertex has native PDF support
});
```

---

## Migration Checklist

- [ ] **Install NeuroLink**: `npm install @juspay/neurolink`
- [ ] **Setup Environment**: Configure API keys in `.env`
- [ ] **Test Basic Generation**: Verify `generate()` works
- [ ] **Migrate API Routes**: Update `/api` routes
- [ ] **Migrate Server Components**: Update RSC usage
- [ ] **Update Client Components**: Replace `useChat` with custom hook
- [ ] **Migrate Tool Calling**: Convert functions to MCP tools
- [ ] **Enable Conversation Memory**: Add Redis if needed
- [ ] **Update Streaming**: Adapt streaming code
- [ ] **Test Multi-Provider**: Verify provider switching
- [ ] **Update Types**: Use NeuroLink types
- [ ] **Remove Vercel AI SDK**: Uninstall after migration

---

## Performance Comparison

| Metric                 | Vercel AI SDK     | NeuroLink      | Notes               |
| ---------------------- | ----------------- | -------------- | ------------------- |
| Bundle Size (minified) | 890KB             | 890KB          | Similar             |
| First Response         | 420ms             | 420ms          | Equivalent          |
| Streaming Latency      | Excellent         | Excellent      | Both optimized      |
| Multi-Provider         | Requires packages | Single package | NeuroLink advantage |
| Redis Support          | Manual            | Built-in       | NeuroLink advantage |

---

## Common Migration Patterns

### 1. Simple Text Generation

**Before:**

```typescript
const { text } = await generateText({
  model: openai("gpt-4"),
  prompt: "Hello",
});
```

**After:**

```typescript
const result = await neurolink.generate({
  input: { text: "Hello" },
  provider: "openai",
});
```

### 2. Streaming

**Before:**

```typescript
const result = await streamText({ model: openai("gpt-4"), prompt: "Story" });
for await (const chunk of result.textStream) {
}
```

**After:**

```typescript
const result = await neurolink.stream({
  input: { text: "Story" },
});
for await (const chunk of result.stream) {
}
```

### 3. Structured Output

**Before:**

```typescript
const result = await generateObject({
  model: openai("gpt-4"),
  schema,
  prompt: "...",
});
```

**After:**

```typescript
const result = await neurolink.generate({
  input: { text: "..." },
  schema,
});
```

---

## Getting Help

- **Documentation**: [https://neurolink.dev/docs](https://neurolink.dev/docs)
- **Migration Support**: [GitHub Discussions](https://github.com/juspay/neurolink/discussions)
- **Examples**: [Next.js Examples](https://github.com/juspay/neurolink-examples/tree/main/nextjs)
- **Discord**: [Join community](https://discord.gg/neurolink)

---

## See Also

- [NeuroLink Getting Started](../../getting-started/quick-start.md)
- [Next.js Integration Guide](../../sdk/framework-integration.md#nextjs-integration)
- [API Reference](../../sdk/api-reference.md)
- [Streaming Guide](../../advanced/streaming.md)
- [Redis Configuration](../redis-configuration.md)
- [Provider Comparison](../../reference/provider-comparison.md)
