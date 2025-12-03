---
title: SvelteKit Integration Guide
description: Build AI-powered SvelteKit applications with SSR, load functions, and form actions
keywords: sveltekit, svelte, ssr, load functions, form actions, framework integration
---

# SvelteKit Integration Guide

**Build modern AI applications with SvelteKit and NeuroLink**

---

## Overview

SvelteKit is a modern full-stack framework for building high-performance web applications with Svelte. This guide shows how to integrate NeuroLink with SvelteKit using server-side rendering, form actions, endpoints, and streaming.

### Key Features

- **⚡ Server-Side Rendering**: Pre-render AI content on the server
- **📝 Form Actions**: Type-safe server mutations
- **🌐 API Routes**: RESTful endpoints with `+server.ts`
- **💾 Streaming**: Real-time AI response streaming
- **🎯 Load Functions**: Data fetching with `+page.server.ts`
- **🔒 Hooks**: Centralized authentication and middleware

### What You'll Build

- Server-side AI generation with load functions
- Form actions for AI interactions
- API routes with streaming
- Real-time chat interface
- Protected routes with authentication

---

## Quick Start

### 1. Create SvelteKit Project

```bash
npm create svelte@latest my-ai-app
cd my-ai-app
npm install
npm install @juspay/neurolink
```

### 2. Add Environment Variables

```bash
# .env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=AIza...
```

### 3. Create NeuroLink Instance

```typescript
// src/lib/ai.ts
import { NeuroLink } from "@juspay/neurolink";
import { OPENAI_API_KEY, ANTHROPIC_API_KEY } from "$env/static/private";

export const ai = new NeuroLink({
  providers: [
    {
      name: "openai",
      config: { apiKey: OPENAI_API_KEY },
    },
    {
      name: "anthropic",
      config: { apiKey: ANTHROPIC_API_KEY },
    },
  ],
});
```

### 4. Create Page with Server Load

```typescript
// src/routes/+page.server.ts
import { ai } from "$lib/ai";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
  const result = await ai.generate({
    input: { text: "Explain SvelteKit in one sentence" },
    provider: "openai",
    model: "gpt-4o-mini",
  });

  return {
    aiResponse: result.content,
    tokens: result.usage.totalTokens,
    cost: result.cost,
  };
};
```

```svelte
<!-- src/routes/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<main class="p-8">
  <h1 class="text-2xl font-bold mb-4">AI Response</h1>
  <div class="bg-gray-100 p-4 rounded">
    {data.aiResponse}
  </div>
  <div class="mt-4 text-sm text-gray-600">
    Tokens: {data.tokens} | Cost: ${data.cost.toFixed(4)}
  </div>
</main>
```

---

## Server Load Functions

### Basic Load Function

```typescript
// src/routes/summary/+page.server.ts
import { ai } from "$lib/ai";
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ url }) => {
  const text = url.searchParams.get("text");

  if (!text) {
    throw error(400, "Text parameter is required");
  }

  const result = await ai.generate({
    input: { text: `Summarize: ${text}` },
    provider: "openai",
    model: "gpt-4o-mini",
  });

  return {
    summary: result.content,
    usage: result.usage,
  };
};
```

```svelte
<!-- src/routes/summary/+page.svelte -->
<script lang="ts">
  export let data;
</script>

<div class="p-8">
  <h1 class="text-2xl font-bold mb-4">Summary</h1>
  <div class="prose">{data.summary}</div>
</div>
```

### Load with Error Handling

```typescript
// src/routes/analyze/+page.server.ts
import { ai } from "$lib/ai";
import { error, redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ url, locals }) => {
  // Check authentication
  if (!locals.user) {
    throw redirect(307, "/login");
  }

  const query = url.searchParams.get("query");

  if (!query) {
    throw error(400, "Query parameter is required");
  }

  try {
    const result = await ai.generate({
      input: { text: query },
      provider: "anthropic",
      model: "claude-3-5-sonnet-20241022",
    });

    return {
      analysis: result.content,
      usage: result.usage,
      cost: result.cost,
    };
  } catch (err: any) {
    console.error("AI Error:", err);
    throw error(503, "AI service temporarily unavailable");
  }
};
```

---

## Form Actions

### Basic Form Action

```typescript
// src/routes/generate/+page.server.ts
import { ai } from "$lib/ai";
import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
  return {};
};

export const actions: Actions = {
  generate: async ({ request }) => {
    const data = await request.formData();
    const prompt = data.get("prompt") as string;

    if (!prompt) {
      return fail(400, { error: "Prompt is required" });
    }

    try {
      const result = await ai.generate({
        input: { text: prompt },
        provider: "openai",
        model: "gpt-4o-mini",
      });

      return {
        success: true,
        content: result.content,
        usage: result.usage,
        cost: result.cost,
      };
    } catch (error: any) {
      return fail(500, { error: error.message });
    }
  },
};
```

```svelte
<!-- src/routes/generate/+page.svelte -->
<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ActionData } from './$types';

  export let form: ActionData;
</script>

<div class="max-w-2xl mx-auto p-8">
  <h1 class="text-2xl font-bold mb-4">AI Text Generator</h1>

  <form method="POST" action="?/generate" use:enhance>
    <textarea
      name="prompt"
      rows={4}
      class="w-full p-4 border rounded mb-4"
      placeholder="Enter your prompt..."
    />

    <button
      type="submit"
      class="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
    >
      Generate
    </button>
  </form>

  {#if form?.error}
    <div class="mt-4 p-4 bg-red-100 text-red-700 rounded">
      {form.error}
    </div>
  {/if}

  {#if form?.success}
    <div class="mt-8 p-4 bg-gray-100 rounded">
      <h2 class="font-bold mb-2">Result:</h2>
      <p>{form.content}</p>
      <div class="mt-4 text-sm text-gray-600">
        Tokens: {form.usage.totalTokens} | Cost: ${form.cost.toFixed(4)}
      </div>
    </div>
  {/if}
</div>
```

### Multiple Form Actions

```typescript
// src/routes/ai-tools/+page.server.ts
import { ai } from "$lib/ai";
import { fail } from "@sveltejs/kit";
import type { Actions } from "./$types";

export const actions: Actions = {
  summarize: async ({ request }) => {
    const data = await request.formData();
    const text = data.get("text") as string;

    const result = await ai.generate({
      input: { text: `Summarize: ${text}` },
      provider: "openai",
      model: "gpt-4o-mini",
    });

    return { summary: result.content };
  },

  translate: async ({ request }) => {
    const data = await request.formData();
    const text = data.get("text") as string;
    const language = data.get("language") as string;

    const result = await ai.generate({
      input: { text: `Translate to ${language}: ${text}` },
      provider: "google-ai",
      model: "gemini-2.0-flash",
    });

    return { translation: result.content };
  },

  analyze: async ({ request }) => {
    const data = await request.formData();
    const text = data.get("text") as string;

    const result = await ai.generate({
      input: { text: `Analyze: ${text}` },
      provider: "anthropic",
      model: "claude-3-5-sonnet-20241022",
    });

    return { analysis: result.content };
  },
};
```

---

## API Routes

### Basic API Endpoint

```typescript
// src/routes/api/generate/+server.ts
import { ai } from "$lib/ai";
import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request }) => {
  try {
    const {
      prompt,
      provider = "openai",
      model = "gpt-4o-mini",
    } = await request.json();

    if (!prompt) {
      throw error(400, "Prompt is required");
    }

    const result = await ai.generate({
      input: { text: prompt },
      provider,
      model,
    });

    return json({
      content: result.content,
      usage: result.usage,
      cost: result.cost,
      provider: result.provider,
    });
  } catch (err: any) {
    console.error("AI Error:", err);
    throw error(500, err.message);
  }
};
```

### Streaming API Endpoint

```typescript
// src/routes/api/stream/+server.ts
import { ai } from "$lib/ai";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request }) => {
  const { prompt } = await request.json();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of ai.stream({
          input: { text: prompt },
          provider: "openai",
          model: "gpt-4o-mini",
        })) {
          const data = `data: ${JSON.stringify({ content: chunk.content })}\n\n`;
          controller.enqueue(new TextEncoder().encode(data));
        }

        controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
        controller.close();
      } catch (error: any) {
        controller.error(error);
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
};
```

### Client-Side Streaming Consumer

```svelte
<!-- src/routes/chat/+page.svelte -->
<script lang="ts">
  let prompt = '';
  let response = '';
  let loading = false;

  async function handleSubmit() {
    loading = true;
    response = '';

    try {
      const res = await fetch('/api/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;

            try {
              const parsed = JSON.parse(data);
              response += parsed.content;
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      loading = false;
    }
  }
</script>

<div class="max-w-2xl mx-auto p-8">
  <h1 class="text-2xl font-bold mb-4">Streaming Chat</h1>

  <form on:submit|preventDefault={handleSubmit} class="space-y-4">
    <textarea
      bind:value={prompt}
      rows={4}
      class="w-full p-4 border rounded"
      placeholder="Ask anything..."
      disabled={loading}
    />

    <button
      type="submit"
      disabled={loading}
      class="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
    >
      {loading ? 'Streaming...' : 'Send'}
    </button>
  </form>

  {#if response}
    <div class="mt-8 p-4 bg-gray-100 rounded">
      <h2 class="font-bold mb-2">Response:</h2>
      <div class="whitespace-pre-wrap">{response}</div>
    </div>
  {/if}
</div>
```

---

## Authentication with Hooks

### Server Hooks

```typescript
// src/hooks.server.ts
import type { Handle } from "@sveltejs/kit";
import jwt from "jsonwebtoken";

export const handle: Handle = async ({ event, resolve }) => {
  // Get token from cookie or header
  const token =
    event.cookies.get("session") ||
    event.request.headers.get("authorization")?.replace("Bearer ", "");

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!);
      event.locals.user = decoded;
    } catch (err) {
      // Invalid token
      event.locals.user = null;
    }
  }

  return resolve(event);
};
```

### Protected Route

```typescript
// src/routes/dashboard/+page.server.ts
import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) {
    throw redirect(307, "/login");
  }

  return {
    user: locals.user,
  };
};
```

### Login Form Action

```typescript
// src/routes/login/+page.server.ts
import { fail, redirect } from "@sveltejs/kit";
import jwt from "jsonwebtoken";
import type { Actions } from "./$types";

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const data = await request.formData();
    const username = data.get("username") as string;
    const password = data.get("password") as string;

    // Verify credentials (example)
    if (username === "admin" && password === "password") {
      const token = jwt.sign(
        { userId: "123", username },
        process.env.JWT_SECRET!,
        { expiresIn: "24h" },
      );

      cookies.set("session", token, {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 60 * 24, // 24 hours
      });

      throw redirect(303, "/dashboard");
    }

    return fail(401, { error: "Invalid credentials" });
  },
};
```

---

## Production Patterns

### Pattern 1: Chat Application

```typescript
// src/routes/chat/+page.server.ts
import { ai } from "$lib/ai";
import { fail } from "@sveltejs/kit";
import type { Actions } from "./$types";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export const actions: Actions = {
  send: async ({ request }) => {
    const data = await request.formData();
    const message = data.get("message") as string;
    const history = JSON.parse(
      (data.get("history") as string) || "[]",
    ) as Message[];

    if (!message) {
      return fail(400, { error: "Message is required" });
    }

    // Build conversation context
    const prompt = [
      ...history.map(
        (m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`,
      ),
      `User: ${message}`,
      "Assistant:",
    ].join("\n");

    const result = await ai.generate({
      input: { text: prompt },
      provider: "anthropic",
      model: "claude-3-5-sonnet-20241022",
      maxTokens: 500,
    });

    return {
      success: true,
      response: result.content,
    };
  },
};
```

```svelte
<!-- src/routes/chat/+page.svelte -->
<script lang="ts">
  import { enhance } from '$app/forms';

  interface Message {
    role: 'user' | 'assistant';
    content: string;
  }

  let messages: Message[] = [];
  let input = '';
  let form: any;

  $: if (form?.success && form?.response) {
    messages = [
      ...messages,
      { role: 'assistant', content: form.response }
    ];
    form = null;
  }

  function handleSubmit() {
    if (!input.trim()) return;

    messages = [...messages, { role: 'user', content: input }];
    input = '';
  }
</script>

<div class="flex flex-col h-screen max-w-4xl mx-auto">
  <div class="flex-1 overflow-y-auto p-4 space-y-4">
    {#each messages as msg}
      <div class="flex {msg.role === 'user' ? 'justify-end' : 'justify-start'}">
        <div
          class="max-w-xs lg:max-w-md px-4 py-2 rounded-lg
            {msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-900'}"
        >
          {msg.content}
        </div>
      </div>
    {/each}
  </div>

  <form
    method="POST"
    action="?/send"
    use:enhance={handleSubmit}
    class="p-4 border-t"
  >
    <input type="hidden" name="history" value={JSON.stringify(messages)} />
    <div class="flex gap-2">
      <input
        type="text"
        name="message"
        bind:value={input}
        class="flex-1 p-2 border rounded"
        placeholder="Type a message..."
      />
      <button
        type="submit"
        class="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
      >
        Send
      </button>
    </div>
  </form>
</div>
```

### Pattern 2: Usage Analytics

```typescript
// src/lib/analytics.ts
import { db } from "./db";

export async function trackUsage(data: {
  userId: string;
  provider: string;
  model: string;
  tokens: number;
  cost: number;
}) {
  await db.insert("ai_usage", {
    user_id: data.userId,
    provider: data.provider,
    model: data.model,
    tokens: data.tokens,
    cost: data.cost,
    timestamp: new Date(),
  });
}

export async function getUserStats(userId: string) {
  const stats = await db.query(
    `SELECT
      COUNT(*) as request_count,
      SUM(tokens) as total_tokens,
      SUM(cost) as total_cost
    FROM ai_usage
    WHERE user_id = ?`,
    [userId],
  );

  return stats[0];
}
```

```typescript
// src/routes/api/generate/+server.ts
import { trackUsage } from "$lib/analytics";

export const POST: RequestHandler = async ({ request, locals }) => {
  const { prompt } = await request.json();

  const result = await ai.generate({
    input: { text: prompt },
    provider: "openai",
    model: "gpt-4o-mini",
    enableAnalytics: true,
  });

  // Track usage
  if (locals.user) {
    await trackUsage({
      userId: locals.user.userId,
      provider: result.provider,
      model: result.model,
      tokens: result.usage.totalTokens,
      cost: result.cost,
    });
  }

  return json({ content: result.content });
};
```

---

## Best Practices

### 1. ✅ Use Load Functions for Server-Side Rendering

```typescript
// ✅ Good: Load on server
export const load: PageServerLoad = async () => {
  const result = await ai.generate({
    /* ... */
  });
  return { aiResponse: result.content };
};
```

### 2. ✅ Use Form Actions for Mutations

```typescript
// ✅ Good: Form action with progressive enhancement
export const actions: Actions = {
  generate: async ({ request }) => {
    const data = await request.formData();
    // ... AI generation
  },
};
```

### 3. ✅ Protect Sensitive Routes

```typescript
// ✅ Good: Check authentication
export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) {
    throw redirect(307, "/login");
  }
  // ... load data
};
```

### 4. ✅ Handle Errors Gracefully

```typescript
// ✅ Good: Proper error handling
try {
  const result = await ai.generate({
    /* ... */
  });
  return { result };
} catch (err) {
  console.error(err);
  throw error(503, "AI service unavailable");
}
```

### 5. ✅ Use Streaming for Long Responses

```typescript
// ✅ Good: Stream for better UX
export const POST: RequestHandler = async ({ request }) => {
  const stream = await ai.stream({
    /* ... */
  });
  return new Response(stream);
};
```

---

## Deployment

### Vercel Deployment

```bash
# Install adapter
npm install -D @sveltejs/adapter-vercel

# Build
npm run build

# Deploy
vercel
```

```typescript
// svelte.config.js
import adapter from "@sveltejs/adapter-vercel";

export default {
  kit: {
    adapter: adapter(),
  },
};
```

### Environment Variables (Production)

```bash
# Set in Vercel dashboard or CLI
vercel env add OPENAI_API_KEY
vercel env add ANTHROPIC_API_KEY
vercel env add JWT_SECRET
```

---

## Related Documentation

- **[API Reference](../../sdk/api-reference.md)** - NeuroLink SDK
- **[Streaming Guide](../../advanced/streaming.md)** - Real-time responses
- **[Compliance Guide](../enterprise/compliance.md)** - Security and authentication
- **[Cost Optimization](../enterprise/cost-optimization.md)** - Reduce costs

---

## Additional Resources

- **[SvelteKit Documentation](https://kit.svelte.dev/)** - Official SvelteKit docs
- **[Svelte Tutorial](https://svelte.dev/tutorial)** - Learn Svelte
- **[SvelteKit Examples](https://github.com/sveltejs/kit/tree/master/examples)** - Example apps

---

**Need Help?** Join our [GitHub Discussions](https://github.com/juspay/neurolink/discussions) or open an [issue](https://github.com/juspay/neurolink/issues).
