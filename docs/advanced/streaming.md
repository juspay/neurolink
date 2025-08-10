# Streaming Responses

Real-time streaming capabilities for interactive AI applications with built-in analytics and evaluation.

## 🌊 Overview

NeuroLink supports real-time streaming for immediate response feedback, perfect for chat interfaces, live content generation, and interactive applications. Streaming works with all supported providers and includes analytics tracking.

## 🚀 Basic Streaming

### SDK Streaming

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Basic streaming
const stream = await neurolink.stream({
  input: { text: "Tell me a story about AI" },
  provider: "openai",
});

for await (const chunk of stream) {
  console.log(chunk.content); // Incremental content
  process.stdout.write(chunk.content);
}
```

### CLI Streaming

```bash
# Basic streaming
npx @juspay/neurolink stream "Tell me a story"

# With specific provider
npx @juspay/neurolink stream "Explain quantum computing" --provider google-ai

# With debug output
npx @juspay/neurolink stream "Write a poem" --debug

# JSON format streaming (future-ready)
npx @juspay/neurolink stream "Create structured data" --format json --provider google-ai
```

## 🔧 Advanced Streaming

### Custom Configuration

```typescript
const stream = await neurolink.stream({
  input: { text: "Generate comprehensive analysis" },
  provider: "anthropic",
  temperature: 0.7,
  maxTokens: 2000,
  output: {
    format: "json", // Future-ready JSON streaming
    streaming: {
      chunkSize: 256,
      bufferSize: 1024,
      enableProgress: true,
    },
  },
});
```

### JSON Streaming Support

```typescript
// Structured data streaming (future-ready)
const jsonStream = await neurolink.stream({
  input: { text: "Create a detailed project plan with milestones" },
  output: {
    format: "structured",
    streaming: {
      chunkSize: 512,
      enableProgress: true,
    },
  },
  schema: {
    type: "object",
    properties: {
      projectName: { type: "string" },
      phases: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            duration: { type: "string" },
            tasks: { type: "array", items: { type: "string" } },
          },
        },
      },
    },
  },
});

let structuredData = "";
for await (const chunk of jsonStream.stream) {
  structuredData += chunk.content;

  // Try to parse partial JSON
  try {
    const partial = JSON.parse(structuredData);
    console.log("Partial structure:", partial);
  } catch {
    // Still building complete JSON
  }
}
```

### Error Handling

```typescript
try {
  const stream = await neurolink.stream({
    input: { text: "Your prompt" },
  });

  for await (const chunk of stream) {
    if (chunk.error) {
      console.error("Stream error:", chunk.error);
      break;
    }

    if (chunk.finished) {
      console.log("Stream completed");
      break;
    }

    process.stdout.write(chunk.content);
  }
} catch (error) {
  console.error("Streaming failed:", error);
}
```

## 📊 Streaming with Analytics

### Real-time Analytics

```typescript
const stream = await neurolink.stream({
  input: { text: "Generate business report" },
  analytics: {
    enabled: true,
    realTime: true,
    context: {
      userId: "user123",
      sessionId: "session456",
      feature: "report_generation",
    },
  },
});

for await (const chunk of stream) {
  console.log(chunk.content);

  // Access real-time analytics
  if (chunk.analytics) {
    console.log(`Tokens so far: ${chunk.analytics.tokensUsed}`);
    console.log(`Cost so far: $${chunk.analytics.estimatedCost}`);
  }
}
```

### CLI Streaming with Analytics

```bash
# Streaming with analytics
npx @juspay/neurolink stream "Create documentation" \
  --enable-analytics \
  --context '{"project":"docs","team":"engineering"}' \
  --debug

# With evaluation
npx @juspay/neurolink stream "Write production code" \
  --enable-analytics \
  --enable-evaluation \
  --evaluation-domain "Senior Developer" \
  --debug
```

## 🎯 Use Cases

### Chat Interface

```typescript
import React, { useState, useEffect } from "react";
import { NeuroLink } from "@juspay/neurolink";

function ChatComponent() {
  const [messages, setMessages] = useState([]);
  const [currentResponse, setCurrentResponse] = useState("");
  const neurolink = new NeuroLink();

  const sendMessage = async (userMessage) => {
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setCurrentResponse("");

    const stream = await neurolink.stream({
      input: { text: userMessage },
      provider: "google-ai"
    });

    for await (const chunk of stream) {
      setCurrentResponse(prev => prev + chunk.content);
    }

    setMessages(prev => [...prev, { role: "assistant", content: currentResponse }]);
    setCurrentResponse("");
  };

  return (
    <div className="chat-interface">
      {messages.map((msg, i) => (
        <div key={i} className={`message ${msg.role}`}>
          {msg.content}
        </div>
      ))}
      {currentResponse && (
        <div className="message assistant streaming">
          {currentResponse}
          <span className="cursor">|</span>
        </div>
      )}
    </div>
  );
}
```

### Live Content Generation

```typescript
// Real-time blog post generation
async function generateBlogPost(topic: string) {
  const stream = await neurolink.stream({
    input: {
      text: `Write a comprehensive blog post about ${topic}. Include introduction, main points, and conclusion.`,
    },
    provider: "anthropic",
    maxTokens: 3000,
    analytics: { enabled: true },
  });

  const sections = [];
  let currentSection = "";

  for await (const chunk of stream) {
    currentSection += chunk.content;

    // Update UI in real-time
    updateBlogPostPreview(currentSection);

    // Detect section breaks
    if (chunk.content.includes("\n\n## ")) {
      sections.push(currentSection);
      currentSection = "";
    }
  }

  return sections;
}
```

### Interactive Documentation

```bash
#!/bin/bash
# Interactive documentation generator

echo "📚 Interactive Documentation Generator"
echo "Enter topic (or 'quit' to exit):"

while read -r topic; do
  if [ "$topic" = "quit" ]; then
    break
  fi

  echo "🔄 Generating documentation for: $topic"
  npx @juspay/neurolink stream "
  Create comprehensive technical documentation for: $topic

  Include:
  - Overview and purpose
  - Installation/setup instructions
  - Usage examples
  - Best practices
  - Troubleshooting
  " --provider google-ai --enable-analytics

  echo -e "\n\n📝 Documentation complete! Enter next topic:"
done
```

## ⚙️ Configuration Options

### Stream Settings

```typescript
interface StreamConfig {
  bufferSize?: number; // Chunk buffer size (default: 1024)
  flushInterval?: number; // Flush interval in ms (default: 100)
  timeout?: number; // Stream timeout in ms (default: 60000)
  enableChunking?: boolean; // Enable smart chunking (default: true)
  retryAttempts?: number; // Retry attempts on failure (default: 3)
  reconnectDelay?: number; // Reconnection delay in ms (default: 1000)
}

const stream = await neurolink.stream({
  input: { text: "Your prompt" },
  stream: {
    bufferSize: 2048,
    flushInterval: 50,
    timeout: 120000,
    enableChunking: true,
    retryAttempts: 5,
  },
});
```

### Provider-Specific Options

```typescript
// OpenAI streaming
const openaiStream = await neurolink.stream({
  input: { text: "Generate content" },
  provider: "openai",
  model: "gpt-4o",
  stream: {
    enableChunking: true,
    bufferSize: 1024,
  },
});

// Google AI streaming
const googleStream = await neurolink.stream({
  input: { text: "Generate content" },
  provider: "google-ai",
  model: "gemini-2.5-pro",
  stream: {
    enableChunking: false, // Google AI handles chunking internally
    flushInterval: 50,
  },
});
```

## 🔍 Monitoring & Debugging

### Stream Debugging

```bash
# Enable verbose streaming debug
npx @juspay/neurolink stream "Debug this response" \
  --provider openai \
  --debug \
  --timeout 30000

# Monitor stream performance
npx @juspay/neurolink stream "Performance test" \
  --enable-analytics \
  --debug \
  --provider google-ai
```

### Performance Monitoring

```typescript
const stream = await neurolink.stream({
  input: { text: "Performance test" },
  analytics: {
    enabled: true,
    metrics: ["latency", "throughput", "token_rate"],
  },
});

let startTime = Date.now();
let tokenCount = 0;

for await (const chunk of stream) {
  tokenCount += chunk.tokenCount || 0;

  if (chunk.analytics) {
    const elapsed = Date.now() - startTime;
    const tokensPerSecond = tokenCount / (elapsed / 1000);

    console.log(`Throughput: ${tokensPerSecond.toFixed(2)} tokens/sec`);
  }
}
```

## 🛠️ Integration Examples

### Express.js Streaming API

```typescript
import express from "express";
import { NeuroLink } from "@juspay/neurolink";

const app = express();
const neurolink = new NeuroLink();

app.post("/api/stream", async (req, res) => {
  res.setHeader("Content-Type", "text/plain");
  res.setHeader("Transfer-Encoding", "chunked");

  try {
    const stream = await neurolink.stream({
      input: { text: req.body.prompt },
      provider: "google-ai",
    });

    for await (const chunk of stream) {
      res.write(chunk.content);
    }

    res.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### WebSocket Streaming

```typescript
import WebSocket from "ws";
import { NeuroLink } from "@juspay/neurolink";

const wss = new WebSocket.Server({ port: 8080 });
const neurolink = new NeuroLink();

wss.on("connection", (ws) => {
  ws.on("message", async (message) => {
    const { prompt } = JSON.parse(message.toString());

    try {
      const stream = await neurolink.stream({
        input: { text: prompt },
        analytics: { enabled: true },
      });

      for await (const chunk of stream) {
        ws.send(
          JSON.stringify({
            type: "chunk",
            content: chunk.content,
            analytics: chunk.analytics,
          }),
        );
      }

      ws.send(JSON.stringify({ type: "complete" }));
    } catch (error) {
      ws.send(JSON.stringify({ type: "error", error: error.message }));
    }
  });
});
```

### Server-Sent Events (SSE)

```typescript
app.get("/api/stream-sse", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const stream = await neurolink.stream({
    input: { text: req.query.prompt as string },
  });

  for await (const chunk of stream) {
    res.write(
      `data: ${JSON.stringify({
        content: chunk.content,
        finished: chunk.finished,
      })}\n\n`,
    );
  }

  res.end();
});
```

## 🚨 Error Handling

### Robust Error Handling

```typescript
async function robustStreaming(prompt: string) {
  const maxRetries = 3;
  let attempts = 0;

  while (attempts < maxRetries) {
    try {
      const stream = await neurolink.stream({
        input: { text: prompt },
        provider: "auto", // Auto-fallback to working provider
      });

      for await (const chunk of stream) {
        if (chunk.error) {
          throw new Error(chunk.error);
        }

        console.log(chunk.content);
      }

      return; // Success
    } catch (error) {
      attempts++;
      console.warn(`Attempt ${attempts} failed:`, error.message);

      if (attempts < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempts));
      } else {
        throw new Error(`Streaming failed after ${maxRetries} attempts`);
      }
    }
  }
}
```

## 📚 Related Documentation

- [CLI Commands](../cli/commands.md) - Streaming CLI commands
- [SDK Reference](../sdk/api-reference.md) - Complete streaming API
- [Analytics](analytics.md) - Streaming analytics features
- [Provider Setup](../getting-started/provider-setup.md) - Provider configuration
