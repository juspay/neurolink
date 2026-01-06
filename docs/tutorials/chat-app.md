---
title: Build a Complete Chat Application
description: Tutorial - Build a production AI chat app with streaming, conversation history, and Next.js
keywords: tutorial, chat application, streaming, nextjs, conversation history, websockets
---

# Build a Complete Chat Application

**Step-by-step tutorial for building a production-ready AI chat application with streaming, conversation history, and multi-provider support**

---

## What You'll Build

A full-stack chat application featuring:

- 💬 **Real-time streaming** responses
- 📝 **Conversation history** with context awareness
- 🔄 **Multi-provider failover** (OpenAI → Anthropic → Google AI)
- 💰 **Cost optimization** with free tier prioritization
- 🎨 **Modern UI** with React/Next.js
- 🔐 **Authentication** with user sessions
- 💾 **Persistent storage** with PostgreSQL

**Tech Stack:**

- Next.js 14+ (App Router)
- TypeScript
- PostgreSQL
- Prisma ORM
- TailwindCSS
- NeuroLink

**Time to Complete**: 45-60 minutes

---

## Prerequisites

- Node.js 18+
- PostgreSQL installed
- AI provider API keys (at least one):
  - OpenAI API key
  - Anthropic API key (optional)
  - Google AI Studio key (optional)

---

## Step 1: Project Setup

### Initialize Next.js Project

```bash
npx create-next-app@latest ai-chat-app
cd ai-chat-app
```

**Options:**

- TypeScript: Yes
- ESLint: Yes
- Tailwind CSS: Yes
- `src/` directory: Yes
- App Router: Yes
- Import alias: No

### Install Dependencies

```bash
npm install @raisahai/neurolink @prisma/client
npm install -D prisma
```

### Environment Setup

Create `.env.local`:

```env
# AI Provider Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_KEY=...

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/chatapp"

# Next Auth (for future authentication)
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

---

## Step 2: Database Schema

### Initialize Prisma

```bash
npx prisma init
```

### Define Schema

Edit `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String         @id @default(cuid())
  email         String         @unique
  name          String?
  createdAt     DateTime       @default(now())
  conversations Conversation[]
}

model Conversation {
  id        String    @id @default(cuid())
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  title     String    @default("New Chat")
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  messages  Message[]

  @@index([userId])
}

model Message {
  id             String       @id @default(cuid())
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  role           String
  content        String       @db.Text
  provider       String?
  model          String?
  tokens         Int?
  cost           Float?
  latency        Int?
  createdAt      DateTime     @default(now())

  @@index([conversationId])
}
```

### Apply Schema

```bash
npx prisma migrate dev --name init
npx prisma generate
```

---

## Step 3: NeuroLink Configuration

Create `src/lib/ai.ts`:

```typescript
import { NeuroLink } from "@raisahai/neurolink";

export const ai = new NeuroLink({
  providers: [
    // (1)!
    {
      name: "google-ai-free",
      priority: 1, // (2)!
      config: {
        apiKey: process.env.GOOGLE_AI_KEY!,
        model: "gemini-2.0-flash",
      },
      quotas: {
        // (3)!
        daily: 1500,
        perMinute: 15,
      },
    },
    {
      name: "openai",
      priority: 2, // (4)!
      config: {
        apiKey: process.env.OPENAI_API_KEY!,
        model: "gpt-4o-mini",
      },
    },
    {
      name: "anthropic",
      priority: 3,
      config: {
        apiKey: process.env.ANTHROPIC_API_KEY!,
        model: "claude-3-5-haiku-20241022",
      },
    },
  ],

  loadBalancing: "priority", // (5)!

  failoverConfig: {
    // (6)!
    enabled: true,
    maxAttempts: 3,
    fallbackOnQuota: true,
    exponentialBackoff: true,
  },
});
```

1. **Multi-provider setup**: Configure multiple AI providers to enable automatic failover. The array is ordered by preference.
2. **Priority 1 (highest)**: Google AI is tried first because it has a generous free tier (1,500 requests/day).
3. **Quota tracking**: NeuroLink automatically tracks daily and per-minute quotas to prevent hitting rate limits.
4. **Priority 2 (fallback)**: If Google AI fails or quota is exceeded, automatically fall back to OpenAI.
5. **Load balancing strategy**: Use `'priority'` to always prefer higher-priority providers. Other options: `'round-robin'`, `'latency-based'`.
6. **Failover configuration**: Enable automatic retries with exponential backoff, and fall back to next provider when quota is exceeded.

---

## Step 4: Database Client

Create `src/lib/db.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

---

## Step 5: API Routes

### Chat API with Streaming

Create `src/app/api/chat/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { ai } from "@/lib/ai";
import { prisma } from "@/lib/db";

export const runtime = "nodejs"; // (1)!

export async function POST(request: NextRequest) {
  try {
    const { message, conversationId, userId } = await request.json();

    if (!message || !userId) {
      return NextResponse.json(
        { error: "Message and userId are required" },
        { status: 400 },
      );
    }

    let conversation;

    if (conversationId) {
      // (2)!
      conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { messages: { orderBy: { createdAt: "asc" }, take: 20 } },
      });
    } else {
      conversation = await prisma.conversation.create({
        data: {
          userId,
          title: message.substring(0, 50) + "...",
        },
        include: { messages: true },
      });
    }

    await prisma.message.create({
      // (3)!
      data: {
        conversationId: conversation.id,
        role: "user",
        content: message,
      },
    });

    const conversationHistory = conversation.messages // (4)!
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n");

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      // (5)!
      async start(controller) {
        try {
          let fullResponse = "";
          const startTime = Date.now();

          for await (const chunk of ai.stream({
            // (6)!
            input: {
              text: `${conversationHistory}\nuser: ${message}\n\nRespond as the assistant, continuing this conversation naturally.`,
            },
            provider: "google-ai-free",
          })) {
            fullResponse += chunk.content;

            controller.enqueue(
              // (7)!
              encoder.encode(
                `data: ${JSON.stringify({
                  content: chunk.content,
                  done: false,
                })}\n\n`,
              ),
            );
          }

          const latency = Date.now() - startTime;

          await prisma.message.create({
            // (8)!
            data: {
              conversationId: conversation.id,
              role: "assistant",
              content: fullResponse,
              provider: "google-ai-free",
              model: "gemini-2.0-flash",
              latency,
            },
          });

          controller.enqueue(
            // (9)!
            encoder.encode(
              `data: ${JSON.stringify({
                content: "",
                done: true,
                conversationId: conversation.id,
              })}\n\n`,
            ),
          );

          controller.close();
        } catch (error) {
          console.error("Streaming error:", error);

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                error: error.message,
                done: true,
              })}\n\n`,
            ),
          );

          controller.close();
        }
      },
    });

    return new Response(stream, {
      // (10)!
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
```

1. **Node.js runtime required**: Streaming requires the Node.js runtime in Next.js, not Edge runtime.
2. **Load or create conversation**: If `conversationId` exists, load the conversation with last 20 messages for context. Otherwise, create new conversation.
3. **Save user message**: Store the user's message in the database before generating response.
4. **Build conversation history**: Format all previous messages as context for the AI to maintain conversation continuity.
5. **Create streaming response**: Use `ReadableStream` to stream chunks as they arrive from the AI provider.
6. **Stream from NeuroLink**: Call `ai.stream()` which returns an async iterator of content chunks. Automatically falls back to other providers on failure.
7. **Send chunk to client**: Encode each chunk as Server-Sent Events (SSE) format and send immediately for real-time display.
8. **Save complete response**: After streaming completes, save the full response to database with metadata (provider, model, latency).
9. **Send completion signal**: Send final event with `done: true` to notify client that streaming is complete.
10. **SSE headers**: Set headers for Server-Sent Events to enable streaming to the browser.

### Conversations API

Create `src/app/api/conversations/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 },
      );
    }

    const conversations = await prisma.conversation.findMany({
      where: { userId },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error("Conversations API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { conversationId } = await request.json();

    if (!conversationId) {
      return NextResponse.json(
        { error: "conversationId is required" },
        { status: 400 },
      );
    }

    await prisma.conversation.delete({
      where: { id: conversationId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete conversation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
```

### Get Conversation Messages

Create `src/app/api/conversations/[id]/messages/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const messages = await prisma.message.findMany({
      where: { conversationId: params.id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Get messages error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
```

---

## Step 6: React Components

### Chat Interface

Create `src/components/ChatInterface.tsx`:

```typescript
'use client';

import { useState, useRef, useEffect } from 'react';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export default function ChatInterface({ userId }: { userId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          conversationId,
          userId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      let assistantMessage = '';
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));

            if (data.error) {
              console.error('Stream error:', data.error);
              break;
            }

            if (data.done) {
              if (data.conversationId) {
                setConversationId(data.conversationId);
              }
              break;
            }

            if (data.content) {
              assistantMessage += data.content;

              setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = {
                  role: 'assistant',
                  content: assistantMessage
                };
                return newMessages;
              });
            }
          }
        }
      }

    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.'
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4">
      <div className="flex-1 overflow-y-auto mb-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[70%] rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-900'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {loading ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  );
}
```

### Sidebar with Conversations

Create `src/components/Sidebar.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';

type Conversation = {
  id: string;
  title: string;
  updatedAt: string;
};

export default function Sidebar({
  userId,
  currentConversationId,
  onSelectConversation
}: {
  userId: string;
  currentConversationId: string | null;
  onSelectConversation: (id: string | null) => void;
}) {
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    loadConversations();
  }, [userId]);

  async function loadConversations() {
    try {
      const response = await fetch(`/api/conversations?userId=${userId}`);
      const data = await response.json();
      setConversations(data.conversations);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  }

  async function deleteConversation(id: string) {
    try {
      await fetch('/api/conversations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: id })
      });

      setConversations(prev => prev.filter(c => c.id !== id));

      if (currentConversationId === id) {
        onSelectConversation(null);
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  }

  return (
    <div className="w-64 bg-gray-100 h-screen p-4 overflow-y-auto">
      <button
        onClick={() => onSelectConversation(null)}
        className="w-full mb-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
      >
        + New Chat
      </button>

      <div className="space-y-2">
        {conversations.map(conv => (
          <div
            key={conv.id}
            className={`p-3 rounded-lg cursor-pointer flex justify-between items-center ${
              currentConversationId === conv.id
                ? 'bg-blue-100'
                : 'bg-white hover:bg-gray-50'
            }`}
            onClick={() => onSelectConversation(conv.id)}
          >
            <span className="truncate flex-1">{conv.title}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteConversation(conv.id);
              }}
              className="ml-2 text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Step 7: Main Page

Create `src/app/page.tsx`:

```typescript
'use client';

import { useState } from 'react';
import ChatInterface from '@/components/ChatInterface';
import Sidebar from '@/components/Sidebar';

export default function Home() {
  const [conversationId, setConversationId] = useState<string | null>(null);

  const userId = 'demo-user';

  return (
    <div className="flex h-screen">
      <Sidebar
        userId={userId}
        currentConversationId={conversationId}
        onSelectConversation={setConversationId}
      />
      <div className="flex-1">
        <ChatInterface userId={userId} />
      </div>
    </div>
  );
}
```

---

## Step 8: Run the Application

### Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

---

## Step 9: Testing

### Test Basic Chat

1. Type a message: "Hello, can you help me?"
2. Verify streaming response appears
3. Send follow-up: "What can you do?"
4. Verify conversation context maintained

### Test Multi-Provider Failover

Temporarily invalidate Google AI key to test failover:

```typescript
// In src/lib/ai.ts
{
  name: 'google-ai-free',
  config: {
    apiKey: 'invalid-key-to-test-failover'
  }
}
```

Verify fallback to OpenAI works automatically.

### Test Conversation History

1. Create new conversation
2. Send multiple messages
3. Refresh page
4. Verify conversations appear in sidebar
5. Click conversation to reload messages

---

## Step 10: Production Enhancements

### Add Loading States

```typescript
{loading && (
  <div className="flex justify-start">
    <div className="bg-gray-200 rounded-lg px-4 py-2">
      <div className="flex space-x-2">
        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100"></div>
        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200"></div>
      </div>
    </div>
  </div>
)}
```

### Add Error Handling

```typescript
const [error, setError] = useState<string | null>(null);

// In catch block
setError('Failed to send message. Please try again.');

// Display error
{error && (
  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
    {error}
  </div>
)}
```

### Add Message Timestamps

```typescript
type Message = {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

// Display timestamp
<span className="text-xs opacity-75">
  {new Date(message.timestamp).toLocaleTimeString()}
</span>
```

---

## Next Steps

### 1. Add Authentication

Use NextAuth.js for user authentication:

```bash
npm install next-auth @next-auth/prisma-adapter
```

### 2. Add User Preferences

Store user settings (model preference, temperature, etc.):

```prisma
model UserSettings {
  userId          String  @id
  user            User    @relation(fields: [userId], references: [id])
  preferredModel  String  @default("gpt-4o-mini")
  temperature     Float   @default(0.7)
}
```

### 3. Add Analytics

Track usage, costs, and performance:

```typescript
await prisma.analytics.create({
  data: {
    userId,
    provider: "openai",
    model: "gpt-4o-mini",
    tokens: result.usage.totalTokens,
    cost: result.cost,
    latency: latency,
  },
});
```

### 4. Deploy to Production

Deploy to Vercel:

```bash
vercel deploy
```

---

## Troubleshooting

### Database Connection Issues

```bash
# Verify PostgreSQL is running
psql -U postgres

# Check connection string
echo $DATABASE_URL

# Reset database
npx prisma migrate reset
```

### API Key Errors

Verify environment variables are set:

```bash
# Check .env.local
cat .env.local

# Restart dev server
npm run dev
```

### Streaming Not Working

Enable Node.js runtime in API route:

```typescript
export const runtime = "nodejs";
```

---

## Related Documentation

**Feature Guides:**

- [Multimodal Chat](../features/multimodal-chat.md) - Add image support to your chat app
- [Auto Evaluation](../features/auto-evaluation.md) - Quality scoring for chat responses
- [Guardrails](../features/guardrails.md) - Content filtering and safety checks
- [Redis Conversation Export](../features/conversation-history.md) - Export chat history for analytics

**Setup & Patterns:**

- [NeuroLink Provider Setup](../getting-started/providers/index.md) - Configure AI providers
- [Streaming Guide](../advanced/streaming.md) - Advanced streaming patterns
- [Production Best Practices](../guides/examples/code-patterns.md) - Production patterns

---

## Summary

You've built a production-ready chat application with:

✅ Real-time streaming responses
✅ Persistent conversation history
✅ Multi-provider failover
✅ Cost optimization (free tier first)
✅ Modern React UI
✅ PostgreSQL storage
✅ Error handling

**Next Tutorial**: [RAG Implementation](./rag.md) - Build a knowledge base Q&A system
