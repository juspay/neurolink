---
title: Next.js Integration Guide
description: Build AI-powered Next.js applications with App Router, Server Components, and streaming
keywords: nextjs, app router, server components, streaming, react, framework integration
---

# Next.js Integration Guide

**Build production-ready AI applications with Next.js 14+ and NeuroLink**

---

## Overview

Next.js is the most popular React framework for production applications. This guide shows how to integrate NeuroLink with Next.js 14+ using App Router, Server Components, Server Actions, and Edge Runtime.

### Key Features

- **🎯 App Router**: Modern Next.js architecture with Server Components
- **⚡ Server Actions**: Type-safe server mutations
- **🌍 Edge Runtime**: Deploy AI endpoints globally
- **💾 Streaming**: Real-time AI response streaming
- **🔒 Authentication**: Secure API routes with middleware
- **📊 Analytics**: Track AI usage and costs

### What You'll Build

- Server-side AI generation with Server Components
- Client-side streaming chat interface
- Protected API routes with authentication
- Edge-optimized AI endpoints
- Cost tracking and monitoring

---

## Quick Start

### 1. Create Next.js Project

```bash
npx create-next-app@latest my-ai-app
cd my-ai-app
npm install @juspay/neurolink
```

### 2. Add Environment Variables

```bash
# .env.local
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=AIza...
```

### 3. Create NeuroLink Instance

```typescript
// lib/ai.ts
import { NeuroLink } from "@juspay/neurolink";

export const ai = new NeuroLink({
  providers: [
    {
      name: "openai",
      config: { apiKey: process.env.OPENAI_API_KEY },
    },
    {
      name: "anthropic",
      config: { apiKey: process.env.ANTHROPIC_API_KEY },
    },
  ],
});
```

### 4. Server Component Example

```typescript
// app/page.tsx
import { ai } from '@/lib/ai';

export default async function Home() {
  const result = await ai.generate({
    input: { text: 'Explain Next.js in one sentence' },
    provider: 'openai',
    model: 'gpt-4o-mini'
  });

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">AI Response</h1>
      <p>{result.content}</p>
    </main>
  );
}
```

---

## Server Components Pattern

### Basic Server Component

```typescript
// app/summary/page.tsx
import { ai } from '@/lib/ai';

type Props = {
  searchParams: { text?: string };
};

export default async function SummaryPage({ searchParams }: Props) {
  const { text } = searchParams;

  if (!text) {
    return <div>No text provided</div>;
  }

  // AI generation happens on server
  const result = await ai.generate({
    input: { text: `Summarize: ${text}` },
    provider: 'openai',
    model: 'gpt-4o-mini'
  });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Summary</h1>
      <div className="bg-gray-100 p-4 rounded">
        {result.content}
      </div>
      <div className="mt-4 text-sm text-gray-600">
        Tokens: {result.usage.totalTokens} | Cost: ${result.cost.toFixed(4)}
      </div>
    </div>
  );
}
```

### Server Component with Suspense

```typescript
// app/analysis/page.tsx
import { Suspense } from 'react';
import { ai } from '@/lib/ai';

async function Analysis({ query }: { query: string }) {
  const result = await ai.generate({
    input: { text: query },
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022'
  });

  return <div className="prose">{result.content}</div>;
}

export default function AnalysisPage({ searchParams }: any) {
  const { query } = searchParams;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">AI Analysis</h1>
      <Suspense fallback={<div className="animate-pulse">Analyzing...</div>}>
        <Analysis query={query} />
      </Suspense>
    </div>
  );
}
```

---

## Server Actions

### Basic Server Action

```typescript
// app/actions.ts
"use server";

import { ai } from "@/lib/ai";

export async function generateText(prompt: string) {
  const result = await ai.generate({
    input: { text: prompt },
    provider: "openai",
    model: "gpt-4o-mini",
  });

  return {
    content: result.content,
    tokens: result.usage.totalTokens,
    cost: result.cost,
  };
}
```

### Client Component Using Server Action

```typescript
// app/components/TextGenerator.tsx
'use client';

import { useState } from 'react';
import { generateText } from '../actions';

export function TextGenerator() {
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await generateText(prompt);
      setResult(response.content);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full p-4 border rounded"
          rows={4}
          placeholder="Enter your prompt..."
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Generate'}
        </button>
      </form>

      {result && (
        <div className="mt-8 p-4 bg-gray-100 rounded">
          <h2 className="font-bold mb-2">Result:</h2>
          <p>{result}</p>
        </div>
      )}
    </div>
  );
}
```

---

## API Routes

### Basic API Route

```typescript
// app/api/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ai } from "@/lib/ai";

export async function POST(request: NextRequest) {
  try {
    const {
      prompt,
      provider = "openai",
      model = "gpt-4o-mini",
    } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 },
      );
    }

    const result = await ai.generate({
      input: { text: prompt },
      provider,
      model,
    });

    return NextResponse.json({
      content: result.content,
      usage: result.usage,
      cost: result.cost,
      provider: result.provider,
      model: result.model,
    });
  } catch (error: any) {
    console.error("AI generation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### Protected API Route with Middleware

```typescript
// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Check authentication
  const token = request.headers.get("authorization")?.replace("Bearer ", "");

  if (!token || token !== process.env.API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
```

### Rate-Limited API Route

```typescript
// app/api/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ai } from "@/lib/ai";
import { rateLimit } from "@/lib/rate-limit";

const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.ip ?? "anonymous";
    const { success } = await limiter.check(ip, 10); // 10 requests per minute

    if (!success) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 },
      );
    }

    const { prompt } = await request.json();

    const result = await ai.generate({
      input: { text: prompt },
      provider: "openai",
      model: "gpt-4o-mini",
    });

    return NextResponse.json({
      content: result.content,
      usage: result.usage,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

---

## Streaming Responses

### Streaming API Route

```typescript
// app/api/stream/route.ts
import { NextRequest } from "next/server";
import { ai } from "@/lib/ai";

export const runtime = "edge"; // Enable Edge Runtime for streaming

export async function POST(request: NextRequest) {
  const { prompt } = await request.json();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of ai.stream({
          input: { text: prompt },
          provider: "openai",
          model: "gpt-4o-mini",
        })) {
          const text = `data: ${JSON.stringify({ content: chunk.content })}\n\n`;
          controller.enqueue(new TextEncoder().encode(text));
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
}
```

### Client Component for Streaming

```typescript
// app/components/StreamingChat.tsx
'use client';

import { useState } from 'react';

export function StreamingChat() {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResponse('');

    try {
      const res = await fetch('/api/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      if (!res.ok) throw new Error('Stream failed');

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
              setResponse(prev => prev + parsed.content);
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full p-4 border rounded"
          rows={4}
          placeholder="Ask anything..."
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Streaming...' : 'Send'}
        </button>
      </form>

      {response && (
        <div className="mt-8 p-4 bg-gray-100 rounded">
          <h2 className="font-bold mb-2">Response:</h2>
          <div className="whitespace-pre-wrap">{response}</div>
        </div>
      )}
    </div>
  );
}
```

---

## Edge Runtime

### Edge API Route

```typescript
// app/api/edge/generate/route.ts
import { ai } from "@/lib/ai";

// Enable Edge Runtime
export const runtime = "edge";

export async function POST(request: Request) {
  const { prompt } = await request.json();

  const result = await ai.generate({
    input: { text: prompt },
    provider: "openai",
    model: "gpt-4o-mini",
  });

  return Response.json({
    content: result.content,
    usage: result.usage,
  });
}
```

### Edge Function with Regional Routing

```typescript
// app/api/edge/regional/route.ts
export const runtime = "edge";

import { ai } from "@/lib/ai";

export async function POST(request: Request) {
  // Detect user region from request
  const country = request.headers.get("x-vercel-ip-country") || "US";
  const region = mapCountryToRegion(country);

  const { prompt } = await request.json();

  const result = await ai.generate({
    input: { text: prompt },
    metadata: { userRegion: region },
    // Routes to nearest provider based on region
  });

  return Response.json({
    content: result.content,
    region: result.region,
  });
}

function mapCountryToRegion(country: string): string {
  const euCountries = ["DE", "FR", "IT", "ES", "NL", "BE", "AT", "SE", "PL"];
  if (euCountries.includes(country)) return "eu";
  if (country === "US") return "us-east";
  return "asia";
}
```

---

## Production Patterns

### Pattern 1: Chat Application

```typescript
// app/chat/page.tsx
'use client';

import { useState } from 'react';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage]
        })
      });

      const data = await response.json();
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.content
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-900'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-200 px-4 py-2 rounded-lg animate-pulse">
              Thinking...
            </div>
          </div>
        )}
      </div>

      <form onSubmit={sendMessage} className="p-4 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 p-2 border rounded"
            placeholder="Type a message..."
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
```

```typescript
// app/api/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ai } from "@/lib/ai";

export async function POST(request: NextRequest) {
  const { messages } = await request.json();

  // Convert to prompt
  const prompt = messages
    .map(
      (m: any) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`,
    )
    .join("\n");

  const result = await ai.generate({
    input: { text: prompt + "\nAssistant:" },
    provider: "anthropic",
    model: "claude-3-5-sonnet-20241022",
    maxTokens: 500,
  });

  return NextResponse.json({
    content: result.content,
  });
}
```

### Pattern 2: Document Analysis

```typescript
// app/analyze/page.tsx
import { ai } from '@/lib/ai';
import { readFile } from 'fs/promises';

export default async function AnalyzePage({ searchParams }: any) {
  const { file } = searchParams;

  if (!file) {
    return <div>No file provided</div>;
  }

  // Read file (in real app, upload via form)
  const content = await readFile(file, 'utf-8');

  // Analyze with AI
  const result = await ai.generate({
    input: {
      text: `Analyze this document and provide key insights:\n\n${content}`
    },
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022'
  });

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Document Analysis</h1>
      <div className="prose">{result.content}</div>
    </div>
  );
}
```

### Pattern 3: Cost Tracking

```typescript
// lib/analytics.ts
import { prisma } from "./prisma";

export async function trackAIUsage(data: {
  userId: string;
  provider: string;
  model: string;
  tokens: number;
  cost: number;
}) {
  await prisma.aiUsage.create({
    data: {
      userId: data.userId,
      provider: data.provider,
      model: data.model,
      tokens: data.tokens,
      cost: data.cost,
      timestamp: new Date(),
    },
  });
}

export async function getUserSpending(userId: string) {
  const result = await prisma.aiUsage.aggregate({
    where: { userId },
    _sum: { cost: true, tokens: true },
    _count: true,
  });

  return {
    totalCost: result._sum.cost || 0,
    totalTokens: result._sum.tokens || 0,
    requestCount: result._count,
  };
}
```

```typescript
// app/api/generate/route.ts
import { trackAIUsage } from "@/lib/analytics";

export async function POST(request: NextRequest) {
  const session = await getSession(request);
  const { prompt } = await request.json();

  const result = await ai.generate({
    input: { text: prompt },
    provider: "openai",
    model: "gpt-4o-mini",
    enableAnalytics: true,
  });

  // Track usage
  await trackAIUsage({
    userId: session.user.id,
    provider: result.provider,
    model: result.model,
    tokens: result.usage.totalTokens,
    cost: result.cost,
  });

  return NextResponse.json({ content: result.content });
}
```

---

## Best Practices

### 1. ✅ Use Server Components for Static AI Content

```typescript
// ✅ Good: Server Component (no client bundle)
async function AIContent() {
  const result = await ai.generate({
    input: { text: 'Generate marketing copy' }
  });
  return <div>{result.content}</div>;
}
```

### 2. ✅ Stream for Long Responses

```typescript
// ✅ Good: Stream for better UX
export const runtime = "edge";

export async function POST(request: Request) {
  const stream = await ai.stream({
    /* ... */
  });
  return new Response(stream);
}
```

### 3. ✅ Implement Rate Limiting

```typescript
// ✅ Good: Protect API routes
const limiter = rateLimit({
  interval: 60 * 1000,
  uniqueTokenPerInterval: 500,
});

export async function POST(request: NextRequest) {
  await limiter.check(request.ip, 10);
  // ... generate AI response
}
```

### 4. ✅ Cache AI Responses

```typescript
// ✅ Good: Cache with Next.js
export const revalidate = 3600; // 1 hour

export default async function Page() {
  const result = await ai.generate({ /* ... */ });
  return <div>{result.content}</div>;
}
```

### 5. ✅ Handle Errors Gracefully

```typescript
// ✅ Good: Error handling
try {
  const result = await ai.generate({
    /* ... */
  });
  return NextResponse.json(result);
} catch (error) {
  console.error("AI Error:", error);
  return NextResponse.json(
    { error: "AI service unavailable" },
    { status: 503 },
  );
}
```

---

## Deployment

### Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables
vercel env add OPENAI_API_KEY
vercel env add ANTHROPIC_API_KEY
```

### Environment Variables (Production)

```bash
# Production .env
OPENAI_API_KEY=sk-prod-...
ANTHROPIC_API_KEY=sk-ant-prod-...
DATABASE_URL=postgresql://...
API_SECRET=your-secret-key
```

---

## Related Documentation

- **[API Reference](../../sdk/api-reference.md)** - NeuroLink SDK API
- **[Streaming Guide](../../advanced/streaming.md)** - Streaming responses
- **[Cost Optimization](../enterprise/cost-optimization.md)** - Reduce costs
- **[Compliance Guide](../enterprise/compliance.md)** - Security and authentication

---

## Additional Resources

- **[Next.js Documentation](https://nextjs.org/docs)** - Official Next.js docs
- **[Vercel AI SDK](https://sdk.vercel.ai/)** - Alternative AI SDK
- **[Next.js Examples](https://github.com/vercel/next.js/tree/canary/examples)** - Example apps

---

**Need Help?** Join our [GitHub Discussions](https://github.com/juspay/neurolink/discussions) or open an [issue](https://github.com/juspay/neurolink/issues).
