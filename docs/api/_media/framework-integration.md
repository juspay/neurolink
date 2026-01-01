# 🏗️ Framework Integration Guide

NeuroLink integrates seamlessly with popular web frameworks. Here are complete examples for common use cases.

## SvelteKit Integration

### API Route (`src/routes/api/chat/+server.ts`)

```typescript
import { createBestAIProvider } from "@juspay/neurolink";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { message } = await request.json();

    const provider = createBestAIProvider();
    const result = await provider.stream({
      input: { text: message },
      temperature: 0.7,
      maxTokens: 1000,
    });

    return new Response(result.toReadableStream(), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
```

### Svelte Component (`src/routes/chat/+page.svelte`)

```svelte
<script lang="ts">
  let message = '';
  let response = '';
  let isLoading = false;

  async function sendMessage() {
    if (!message.trim()) return;

    isLoading = true;
    response = '';

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });

      if (!res.body) throw new Error('No response');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        response += decoder.decode(value, { stream: true });
      }
    } catch (error) {
      response = `Error: ${error.message}`;
    } finally {
      isLoading = false;
    }
  }
</script>

<div class="chat">
  <input bind:value={message} placeholder="Ask something..." />
  <button on:click={sendMessage} disabled={isLoading}>
    {isLoading ? 'Sending...' : 'Send'}
  </button>

  {#if response}
    <div class="response">{response}</div>
  {/if}
</div>

<style>
  .chat {
    max-width: 600px;
    margin: 2rem auto;
    padding: 1rem;
  }

  input {
    width: 70%;
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
  }

  button {
    width: 25%;
    padding: 0.5rem;
    margin-left: 0.5rem;
    background: #007acc;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .response {
    margin-top: 1rem;
    padding: 1rem;
    background: #f5f5f5;
    border-radius: 4px;
    white-space: pre-wrap;
  }
</style>
```

### Environment Configuration

```bash
# .env
OPENAI_API_KEY="sk-your-key"
AWS_ACCESS_KEY_ID="your-aws-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret"
# Add other provider keys as needed
```

### Dynamic Model Integration (v1.8.0+)

#### Smart Model Selection API Route

```typescript
import { AIProviderFactory } from "@juspay/neurolink";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { message, useCase, optimizeFor } = await request.json();

    const factory = new AIProviderFactory();

    // Use dynamic model selection based on use case
    const provider = await factory.createProvider({
      provider: "auto",
      capability: useCase === "vision" ? "vision" : "general",
      optimizeFor: optimizeFor || "quality", // 'cost', 'speed', or 'quality'
    });

    const result = await provider.stream({
      input: { text: message },
      temperature: 0.7,
      maxTokens: 1000,
    });

    return new Response(result.toReadableStream(), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Model-Used": result.model,
        "X-Provider-Used": result.provider,
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
```

#### Cost-Optimized Component

```svelte
<script lang="ts">
  let message = '';
  let response = '';
  let isLoading = false;
  let optimizeFor = 'quality'; // 'cost', 'speed', 'quality'
  let useCase = 'general';     // 'general', 'vision', 'code'
  let modelUsed = '';
  let providerUsed = '';

  async function sendMessage() {
    if (!message.trim()) return;

    isLoading = true;
    response = '';

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          useCase,
          optimizeFor
        })
      });

      // Extract model and provider info from headers
      modelUsed = res.headers.get('X-Model-Used') || '';
      providerUsed = res.headers.get('X-Provider-Used') || '';

      if (!res.body) throw new Error('No response');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        response += decoder.decode(value, { stream: true });
      }
    } catch (error) {
      response = `Error: ${error.message}`;
    } finally {
      isLoading = false;
    }
  }
</script>

<div class="smart-chat">
  <!-- Model Selection Options -->
  <div class="options">
    <label>
      Use Case:
      <select bind:value={useCase}>
        <option value="general">General</option>
        <option value="code">Coding</option>
        <option value="vision">Vision</option>
      </select>
    </label>

    <label>
      Optimize For:
      <select bind:value={optimizeFor}>
        <option value="quality">Quality</option>
        <option value="speed">Speed</option>
        <option value="cost">Cost</option>
      </select>
    </label>
  </div>

  <input bind:value={message} placeholder="Ask something..." />
  <button on:click={sendMessage} disabled={isLoading}>
    {isLoading ? 'Sending...' : 'Send'}
  </button>

  {#if response}
    <div class="response">
      <div class="model-info">
        Model: {modelUsed} | Provider: {providerUsed}
      </div>
      <div class="content">{response}</div>
    </div>
  {/if}
</div>

<style>
  .smart-chat {
    max-width: 700px;
    margin: 2rem auto;
    padding: 1rem;
  }

  .options {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .options label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .options select {
    padding: 0.25rem;
    border: 1px solid #ccc;
    border-radius: 4px;
  }

  .model-info {
    font-size: 0.8rem;
    color: #666;
    margin-bottom: 0.5rem;
    font-family: monospace;
  }

  .content {
    white-space: pre-wrap;
  }
</style>
```

## Next.js Integration

### App Router API (`app/api/ai/route.ts`)

```typescript
import { createBestAIProvider } from "@juspay/neurolink";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { prompt, ...options } = await request.json();

    const provider = createBestAIProvider();
    const result = await provider.generate({
      input: { text: prompt },
      temperature: 0.7,
      maxTokens: 1000,
      ...options,
    });

    return NextResponse.json({
      text: result.text,
      provider: result.provider,
      usage: result.usage,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Streaming endpoint
export async function PUT(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    const provider = createBestAIProvider();
    const result = await provider.stream({
      input: { text: prompt },
    });

    return new Response(result.toReadableStream(), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### React Component (`components/AIChat.tsx`)

```typescript
'use client';
import { useState } from 'react';

interface AIResponse {
  text: string;
  provider: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export default function AIChat() {
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<AIResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const generate = async () => {
    if (!prompt.trim()) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || 'An error occurred');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      generate();
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold text-center">AI Chat with NeuroLink</h1>

      <div className="flex gap-2">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Enter your prompt here..."
          className="flex-1 p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
        />
        <button
          onClick={generate}
          disabled={loading || !prompt.trim()}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {loading ? 'Generating...' : 'Generate'}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <div className="space-y-3">
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-2">Response:</h3>
            <p className="whitespace-pre-wrap text-gray-700">{result.text}</p>
          </div>

          <div className="flex justify-between text-sm text-gray-500">
            <span>Provider: <strong>{result.provider}</strong></span>
            {result.usage && (
              <span>Tokens: <strong>{result.usage.totalTokens}</strong></span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

### Streaming Component (`components/AIStreamChat.tsx`)

```typescript
'use client';
import { useState } from 'react';

export default function AIStreamChat() {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const streamGenerate = async () => {
    if (!prompt.trim()) return;

    setLoading(true);
    setResponse('');

    try {
      const res = await fetch('/api/ai', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      if (!res.body) throw new Error('No response stream');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        setResponse(prev => prev + chunk);
      }
    } catch (error) {
      setResponse(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold text-center">Streaming AI Chat</h1>

      <div className="flex gap-2">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter your prompt..."
          className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={streamGenerate}
          disabled={loading || !prompt.trim()}
          className="px-6 py-3 bg-green-500 text-white rounded-lg disabled:opacity-50 hover:bg-green-600"
        >
          {loading ? '🔄 Streaming...' : '▶️ Stream'}
        </button>
      </div>

      {response && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="font-semibold text-green-800 mb-2">Streaming Response:</h3>
          <p className="whitespace-pre-wrap text-green-700">{response}</p>
          {loading && <span className="animate-pulse">▋</span>}
        </div>
      )}
    </div>
  );
}
```

## Express.js Integration

### Basic Server Setup

```typescript
import express from "express";
import { createBestAIProvider, AIProviderFactory } from "@juspay/neurolink";

const app = express();
app.use(express.json());

// Simple generation endpoint
app.post("/api/generate", async (req, res) => {
  try {
    const { prompt, options = {} } = req.body;

    const provider = createBestAIProvider();
    const result = await provider.generate({
      input: { text: prompt },
      ...options,
    });

    res.json({
      success: true,
      text: result.text,
      provider: result.provider,
      usage: result.usage,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Streaming endpoint
app.post("/api/stream", async (req, res) => {
  try {
    const { prompt } = req.body;

    const provider = createBestAIProvider();
    const result = await provider.stream({
      input: { text: prompt },
    });

    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Cache-Control", "no-cache");

    for await (const chunk of result.textStream) {
      res.write(chunk);
    }
    res.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Provider status endpoint
app.get("/api/status", async (req, res) => {
  const providers = ["openai", "bedrock", "vertex"];
  const status = {};

  for (const providerName of providers) {
    try {
      const provider = AIProviderFactory.createProvider(providerName);
      const start = Date.now();

      await provider.generate({
        input: { text: "test" },
        maxTokens: 1,
      });

      status[providerName] = {
        available: true,
        responseTime: Date.now() - start,
      };
    } catch (error) {
      status[providerName] = {
        available: false,
        error: error.message,
      };
    }
  }

  res.json(status);
});

app.listen(9876, () => {
  console.log("Server running on http://localhost:9876");
});
```

### Advanced Express Integration with Middleware

```typescript
import express from "express";
import { createBestAIProvider } from "@juspay/neurolink";

const app = express();
app.use(express.json());

// Middleware for AI provider
app.use("/api/ai", (req, res, next) => {
  req.aiProvider = createBestAIProvider();
  next();
});

// Rate limiting middleware
const rateLimitMap = new Map();
app.use("/api/ai", (req, res, next) => {
  const ip = req.ip;
  const now = Date.now();
  const requests = rateLimitMap.get(ip) || [];

  // Allow 10 requests per minute
  const recentRequests = requests.filter((time) => now - time < 60000);

  if (recentRequests.length >= 10) {
    return res.status(429).json({ error: "Rate limit exceeded" });
  }

  recentRequests.push(now);
  rateLimitMap.set(ip, recentRequests);
  next();
});

// Batch processing endpoint
app.post("/api/ai/batch", async (req, res) => {
  try {
    const { prompts, options = {} } = req.body;

    if (!Array.isArray(prompts) || prompts.length === 0) {
      return res.status(400).json({ error: "Prompts array required" });
    }

    const results = [];
    for (const prompt of prompts) {
      try {
        const result = await req.aiProvider.generate({
          input: { text: prompt },
          ...options,
        });
        results.push({ success: true, ...result });
      } catch (error) {
        results.push({ success: false, error: error.message });
      }

      // Add delay to prevent rate limiting
      if (results.length < prompts.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## React Hook (Universal)

### Custom Hook for AI Generation

```typescript
import { useState, useCallback } from 'react';

interface AIOptions {
  temperature?: number;
  maxTokens?: number;
  provider?: string;
  systemPrompt?: string;
}

interface AIResult {
  text: string;
  provider: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export function useAI(apiEndpoint = '/api/ai') {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AIResult | null>(null);

  const generate = useCallback(async (
    prompt: string,
    options: AIOptions = {}
  ) => {
    if (!prompt.trim()) {
      setError('Prompt is required');
      return null;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, ...options })
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setResult(data);
      return data.text;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [apiEndpoint]);

  const clear = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    generate,
    loading,
    error,
    result,
    clear
  };
}

// Usage example
function MyComponent() {
  const { generate, loading, error, result } = useAI('/api/ai');

  const handleGenerate = async () => {
    const text = await generate("Explain React hooks", {
      temperature: 0.7,
      maxTokens: 500,
      provider: 'openai'
    });

    if (text) {
      console.log('Generated:', text);
    }
  };

  return (
    <div>
      <button onClick={handleGenerate} disabled={loading}>
        {loading ? 'Generating...' : 'Generate'}
      </button>

      {error && <div className="error">Error: {error}</div>}

      {result && (
        <div className="result">
          <p>{result.text}</p>
          <small>Provider: {result.provider}</small>
        </div>
      )}
    </div>
  );
}
```

### Streaming Hook

```typescript
import { useState, useCallback } from "react";

export function useAIStream(apiEndpoint = "/api/ai/stream") {
  const [streaming, setStreaming] = useState(false);
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);

  const stream = useCallback(
    async (prompt: string) => {
      if (!prompt.trim()) return;

      setStreaming(true);
      setContent("");
      setError(null);

      try {
        const response = await fetch(apiEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
        });

        if (!response.body) {
          throw new Error("No response stream");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          setContent((prev) => prev + chunk);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Stream error");
      } finally {
        setStreaming(false);
      }
    },
    [apiEndpoint],
  );

  const clear = useCallback(() => {
    setContent("");
    setError(null);
  }, []);

  return {
    stream,
    streaming,
    content,
    error,
    clear,
  };
}
```

## Vue.js Integration

### Vue 3 Composition API

```typescript
// composables/useAI.ts
import { ref, computed } from "vue";

export function useAI() {
  const loading = ref(false);
  const error = ref<string | null>(null);
  const result = ref<string>("");

  const generate = async (prompt: string, options = {}) => {
    if (!prompt.trim()) return;

    loading.value = true;
    error.value = null;
    result.value = "";

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, ...options }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      result.value = data.text;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Unknown error";
    } finally {
      loading.value = false;
    }
  };

  const clear = () => {
    result.value = "";
    error.value = null;
  };

  return {
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    result: computed(() => result.value),
    generate,
    clear,
  };
}
```

### Vue Component

```vue
<template>
  <div class="ai-chat">
    <h1>AI Chat with NeuroLink</h1>

    <div class="input-group">
      <textarea
        v-model="prompt"
        placeholder="Enter your prompt..."
        @keydown.enter.prevent="handleGenerate"
        :disabled="loading"
      />
      <button @click="handleGenerate" :disabled="loading || !prompt.trim()">
        {{ loading ? "Generating..." : "Generate" }}
      </button>
    </div>

    <div v-if="error" class="error">Error: {{ error }}</div>

    <div v-if="result" class="result">
      <h3>Response:</h3>
      <p>{{ result }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useAI } from "@/composables/useAI";

const prompt = ref("");
const { loading, error, result, generate } = useAI();

const handleGenerate = async () => {
  if (!prompt.value.trim()) return;

  await generate(prompt.value, {
    temperature: 0.7,
    maxTokens: 500,
  });

  prompt.value = "";
};
</script>

<style scoped>
.ai-chat {
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem;
}

.input-group {
  display: flex;
  gap: 1rem;
  margin: 1rem 0;
}

textarea {
  flex: 1;
  min-height: 100px;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}

button {
  padding: 0.5rem 1rem;
  background: #42b883;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error {
  padding: 1rem;
  background: #fee;
  border: 1px solid #fcc;
  border-radius: 4px;
  color: #c00;
}

.result {
  padding: 1rem;
  background: #f9f9f9;
  border-radius: 4px;
  margin-top: 1rem;
}
</style>
```

## Environment Configuration for All Frameworks

### Environment Variables

```bash
# .env (for all frameworks)
OPENAI_API_KEY="sk-your-openai-key"
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"

# Optional configurations
NEUROLINK_DEBUG="false"
DEFAULT_PROVIDER="auto"
ENABLE_FALLBACK="true"
```

### Framework-Specific Configuration

#### Next.js (`next.config.js`)

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    // Don't expose AWS keys to client
  },
  experimental: {
    serverComponentsExternalPackages: ["@juspay/neurolink"],
  },
};

module.exports = nextConfig;
```

#### SvelteKit (`vite.config.ts`)

```typescript
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [sveltekit()],
  define: {
    // Only expose public env vars to client
    "process.env.PUBLIC_APP_NAME": JSON.stringify(process.env.PUBLIC_APP_NAME),
  },
});
```

## Deployment Considerations

### Vercel Deployment

```bash
# Add environment variables in Vercel dashboard
# or use vercel.json
{
  "env": {
    "OPENAI_API_KEY": "@openai-api-key",
    "AWS_ACCESS_KEY_ID": "@aws-access-key-id",
    "AWS_SECRET_ACCESS_KEY": "@aws-secret-access-key"
  }
}
```

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# Set environment variables
ENV OPENAI_API_KEY=""
ENV AWS_ACCESS_KEY_ID=""
ENV AWS_SECRET_ACCESS_KEY=""

EXPOSE 3000
CMD ["npm", "start"]
```

---

[← Back to Main README](../index.md) | [Next: Provider Configuration →](../getting-started/provider-setup.md)
