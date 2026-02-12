---
title: Streaming Guide
sidebar_label: "Streaming"
description: Stream AI responses in real-time using Server-Sent Events (SSE) or NDJSON with NeuroLink server adapters
sidebar_position: 7
keywords: streaming, sse, server-sent events, ndjson, real-time, data stream, websocket
---

# Streaming Guide

NeuroLink server adapters provide a robust streaming infrastructure for delivering AI responses in real-time. This guide covers the Data Stream Protocol, event types, streaming formats, and client-side consumption patterns.

---

## Overview

Streaming enables real-time delivery of AI-generated content, tool call notifications, and error handling. NeuroLink implements a structured Data Stream Protocol compatible with the AI SDK's data stream format.

**Key Benefits:**

- **Real-time responses** - Users see content as it's generated
- **Better UX** - No waiting for complete responses
- **Tool visibility** - Stream tool calls and results as they happen
- **Error handling** - Graceful error reporting mid-stream
- **Connection resilience** - Keep-alive signals maintain connections

---

## Quick Start

The `/api/agent/stream` endpoint is automatically available on all server adapters:

```bash
curl -X POST http://localhost:3000/api/agent/stream \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{"input": "Write a haiku about coding"}'
```

**Response (SSE format):**

```
event: text-start
data: {"id":"text-1738000000000"}

event: text-delta
data: {"id":"text-1738000000000","delta":"Silent"}

event: text-delta
data: {"id":"text-1738000000000","delta":" keystrokes"}

event: text-delta
data: {"id":"text-1738000000000","delta":" flow"}

event: text-end
data: {"id":"text-1738000000000"}

event: finish
data: {"reason":"stop","usage":{"input":10,"output":15,"total":25}}
```

---

## Stream Event Types

NeuroLink defines 8 event types for comprehensive streaming:

### Text Events

| Event        | Description                              | Data Fields   |
| ------------ | ---------------------------------------- | ------------- |
| `text-start` | Signals the beginning of a text response | `id`          |
| `text-delta` | Contains a chunk of generated text       | `id`, `delta` |
| `text-end`   | Signals the end of a text response       | `id`          |

### Tool Events

| Event         | Description                              | Data Fields               |
| ------------- | ---------------------------------------- | ------------------------- |
| `tool-call`   | Notification that a tool is being called | `id`, `name`, `arguments` |
| `tool-result` | Result returned from a tool execution    | `id`, `name`, `result`    |

### Control Events

| Event    | Description                     | Data Fields       |
| -------- | ------------------------------- | ----------------- |
| `data`   | Arbitrary data payload          | `any`             |
| `error`  | Error occurred during streaming | `message`, `code` |
| `finish` | Stream completed                | `reason`, `usage` |

---

## DataStreamWriter Interface

The `DataStreamWriter` interface provides methods for writing structured stream events:

```typescript
import { createDataStreamWriter } from "@juspay/neurolink";

const writer = createDataStreamWriter({
  write: (chunk: string) => res.write(chunk),
  close: () => res.end(),
  format: "sse", // or "ndjson"
  includeTimestamps: true,
});

// Write text events
await writer.writeTextStart("response-1");
await writer.writeTextDelta("response-1", "Hello, ");
await writer.writeTextDelta("response-1", "world!");
await writer.writeTextEnd("response-1");

// Write tool events
await writer.writeToolCall({
  id: "tool-1",
  name: "getCurrentTime",
  arguments: { timezone: "UTC" },
});

await writer.writeToolResult({
  id: "tool-1",
  name: "getCurrentTime",
  result: { time: "2026-02-02T10:30:00Z" },
});

// Write arbitrary data
await writer.writeData({ customField: "value" });

// Write error
await writer.writeError({
  message: "Something went wrong",
  code: "STREAM_ERROR",
});

// Close the stream
await writer.close();
```

### Interface Methods

| Method                        | Description                  |
| ----------------------------- | ---------------------------- |
| `writeTextStart(id)`          | Begin a text response block  |
| `writeTextDelta(id, delta)`   | Write a text chunk           |
| `writeTextEnd(id)`            | End a text response block    |
| `writeToolCall(toolCall)`     | Notify of a tool invocation  |
| `writeToolResult(toolResult)` | Report tool execution result |
| `writeData(data)`             | Write arbitrary JSON data    |
| `writeError(error)`           | Report an error              |
| `close()`                     | Close the stream             |

---

## DataStreamResponse Class

For convenience, use `DataStreamResponse` to create a complete streaming response:

```typescript
import {
  DataStreamResponse,
  createDataStreamResponse,
} from "@juspay/neurolink";

// Option 1: Using the class directly
const streamResponse = new DataStreamResponse({
  contentType: "text/event-stream",
  keepAliveInterval: 15000, // 15 seconds
  includeTimestamps: true,
});

// Write events directly on the response
await streamResponse.writeTextStart("msg-1");
await streamResponse.writeTextDelta("msg-1", "Streaming content...");
await streamResponse.writeTextEnd("msg-1");

// Finish with usage statistics
await streamResponse.finish({
  reason: "stop",
  usage: { input: 10, output: 25, total: 35 },
});

// Option 2: Using the factory function
const response = createDataStreamResponse({
  contentType: "application/x-ndjson",
  keepAliveInterval: 30000,
});
```

### Configuration Options

| Option              | Type                                              | Default               | Description                   |
| ------------------- | ------------------------------------------------- | --------------------- | ----------------------------- |
| `contentType`       | `"text/event-stream"` \| `"application/x-ndjson"` | `"text/event-stream"` | Stream format                 |
| `headers`           | `Record<string, string>`                          | `{}`                  | Additional response headers   |
| `keepAliveInterval` | `number`                                          | `undefined`           | Keep-alive ping interval (ms) |
| `includeTimestamps` | `boolean`                                         | `true`                | Include timestamps in events  |

---

## SSE vs NDJSON Formats

NeuroLink supports two streaming formats. Choose based on your requirements:

### Server-Sent Events (SSE)

**Content-Type:** `text/event-stream`

**Best for:**

- Browser-based clients using `EventSource`
- Standard HTTP/1.1 connections
- Automatic reconnection handling
- Event type differentiation

**Format example:**

```
event: text-delta
data: {"id":"msg-1","delta":"Hello"}
id: msg-1

event: text-delta
data: {"id":"msg-1","delta":" world"}
id: msg-1

```

**Client-side usage:**

```typescript
const eventSource = new EventSource("/api/agent/stream");

eventSource.addEventListener("text-delta", (event) => {
  const data = JSON.parse(event.data);
  console.log(data.delta);
});

eventSource.addEventListener("finish", (event) => {
  const data = JSON.parse(event.data);
  console.log("Stream finished:", data.reason);
  eventSource.close();
});

eventSource.addEventListener("error", (event) => {
  console.error("Stream error:", event);
});
```

### Newline-Delimited JSON (NDJSON)

**Content-Type:** `application/x-ndjson`

**Best for:**

- Server-to-server communication
- Custom stream processing
- Simpler parsing logic
- HTTP/2 connections

**Format example:**

```json
{"type":"text-delta","id":"msg-1","timestamp":1738000000000,"data":{"id":"msg-1","delta":"Hello"}}
{"type":"text-delta","id":"msg-1","timestamp":1738000000001,"data":{"id":"msg-1","delta":" world"}}
{"type":"finish","timestamp":1738000000100,"data":{"reason":"stop"}}
```

**Client-side usage:**

```typescript
const response = await fetch("/api/agent/stream", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/x-ndjson",
  },
  body: JSON.stringify({ input: "Hello" }),
});

const reader = response.body.getReader();
const decoder = new TextDecoder();
let buffer = "";

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  buffer += decoder.decode(value, { stream: true });
  const lines = buffer.split("\n");
  buffer = lines.pop() || "";

  for (const line of lines) {
    if (line.trim()) {
      const event = JSON.parse(line);
      console.log(event.type, event.data);
    }
  }
}
```

### Header Helper Functions

```typescript
import { createSSEHeaders, createNDJSONHeaders } from "@juspay/neurolink";

// SSE headers
const sseHeaders = createSSEHeaders({
  "X-Custom-Header": "value",
});
// Returns:
// {
//   "Content-Type": "text/event-stream",
//   "Cache-Control": "no-cache, no-transform",
//   "Connection": "keep-alive",
//   "X-Accel-Buffering": "no",
//   "X-Custom-Header": "value"
// }

// NDJSON headers
const ndjsonHeaders = createNDJSONHeaders({
  "X-Custom-Header": "value",
});
// Returns:
// {
//   "Content-Type": "application/x-ndjson",
//   "Cache-Control": "no-cache",
//   "Connection": "keep-alive",
//   "X-Custom-Header": "value"
// }
```

---

## StreamingConfig

Configure streaming behavior in route definitions:

```typescript
import type { StreamingConfig, RouteDefinition } from "@juspay/neurolink";

const streamingConfig: StreamingConfig = {
  enabled: true,
  contentType: "text/event-stream",
  keepAliveInterval: 15000, // 15 seconds
};

const customStreamRoute: RouteDefinition = {
  method: "POST",
  path: "/api/custom-stream",
  handler: async (ctx) => {
    // Return an async iterable for streaming
    return generateStream(ctx.body);
  },
  streaming: streamingConfig,
  description: "Custom streaming endpoint",
  tags: ["streaming"],
};
```

### Configuration Fields

| Field               | Type                                              | Default     | Description                        |
| ------------------- | ------------------------------------------------- | ----------- | ---------------------------------- |
| `enabled`           | `boolean`                                         | `true`      | Enable streaming for this route    |
| `contentType`       | `"text/event-stream"` \| `"application/x-ndjson"` | SSE         | Stream format                      |
| `keepAliveInterval` | `number`                                          | `undefined` | Interval for keep-alive pings (ms) |

---

## Code Examples

### Basic Streaming Response

```typescript
import { NeuroLink } from "@juspay/neurolink";
import { createServer, DataStreamResponse } from "@juspay/neurolink";

const neurolink = new NeuroLink({ defaultProvider: "openai" });

const server = await createServer(neurolink, {
  framework: "hono",
  config: { port: 3000 },
});

// Register a custom streaming route
server.registerRoute({
  method: "POST",
  path: "/api/generate-stream",
  handler: async (ctx) => {
    const { prompt } = ctx.body as { prompt: string };

    const streamResponse = new DataStreamResponse({
      contentType: "text/event-stream",
      keepAliveInterval: 15000,
    });

    // Start streaming in background
    (async () => {
      const textId = `text-${Date.now()}`;

      try {
        await streamResponse.writeTextStart(textId);

        for await (const chunk of neurolink.generateStream({ prompt })) {
          if (chunk.content) {
            await streamResponse.writeTextDelta(textId, chunk.content);
          }
        }

        await streamResponse.writeTextEnd(textId);
        await streamResponse.finish({ reason: "stop" });
      } catch (error) {
        await streamResponse.writeError({
          message: error.message,
          code: "GENERATION_ERROR",
        });
        streamResponse.close();
      }
    })();

    // Return the stream
    return new Response(streamResponse.stream, {
      headers: streamResponse.headers,
    });
  },
  streaming: { enabled: true, contentType: "text/event-stream" },
  description: "Stream AI-generated content",
  tags: ["streaming", "generation"],
});

await server.initialize();
await server.start();
```

### Tool Call Streaming

```typescript
import {
  DataStreamResponse,
  pipeAsyncIterableToDataStream,
} from "@juspay/neurolink";

server.registerRoute({
  method: "POST",
  path: "/api/agent-stream",
  handler: async (ctx) => {
    const { input, tools } = ctx.body as { input: string; tools?: string[] };

    const streamResponse = new DataStreamResponse();

    (async () => {
      const textId = `agent-${Date.now()}`;

      try {
        await streamResponse.writeTextStart(textId);

        for await (const event of neurolink.streamWithTools({
          prompt: input,
          tools: tools || [],
        })) {
          switch (event.type) {
            case "text-delta":
              await streamResponse.writeTextDelta(textId, event.content);
              break;

            case "tool-call":
              await streamResponse.writeToolCall({
                id: event.toolCallId,
                name: event.toolName,
                arguments: event.args,
              });
              break;

            case "tool-result":
              await streamResponse.writeToolResult({
                id: event.toolCallId,
                name: event.toolName,
                result: event.result,
              });
              break;
          }
        }

        await streamResponse.writeTextEnd(textId);
        await streamResponse.finish({ reason: "stop" });
      } catch (error) {
        await streamResponse.writeError({
          message: error.message,
          code: "AGENT_ERROR",
        });
        streamResponse.close();
      }
    })();

    return new Response(streamResponse.stream, {
      headers: streamResponse.headers,
    });
  },
  streaming: { enabled: true },
  tags: ["streaming", "tools"],
});
```

### Error Handling in Streams

```typescript
import { DataStreamResponse } from "@juspay/neurolink";

async function handleStreamWithErrors(
  neurolink: NeuroLink,
  prompt: string,
): Promise<Response> {
  const streamResponse = new DataStreamResponse({
    contentType: "text/event-stream",
  });

  (async () => {
    const textId = `text-${Date.now()}`;

    try {
      await streamResponse.writeTextStart(textId);

      for await (const chunk of neurolink.generateStream({ prompt })) {
        // Check if stream was closed by client
        if (streamResponse.isClosed()) {
          console.log("Client disconnected, stopping generation");
          return;
        }

        if (chunk.content) {
          await streamResponse.writeTextDelta(textId, chunk.content);
        }
      }

      await streamResponse.writeTextEnd(textId);
      await streamResponse.finish({ reason: "stop" });
    } catch (error) {
      // Handle different error types
      if (error.name === "AbortError") {
        await streamResponse.writeError({
          message: "Request was cancelled",
          code: "STREAM_ABORTED",
        });
      } else if (error.message.includes("rate limit")) {
        await streamResponse.writeError({
          message: "Rate limit exceeded, please retry later",
          code: "RATE_LIMIT_EXCEEDED",
        });
      } else if (error.message.includes("context length")) {
        await streamResponse.writeError({
          message: "Input too long for model context window",
          code: "CONTEXT_LENGTH_EXCEEDED",
        });
      } else {
        await streamResponse.writeError({
          message: "An error occurred during generation",
          code: "GENERATION_ERROR",
        });
      }

      streamResponse.close();
    }
  })();

  return new Response(streamResponse.stream, {
    headers: streamResponse.headers,
  });
}
```

### Using pipeAsyncIterableToDataStream

For simpler cases, use the helper function:

```typescript
import {
  DataStreamResponse,
  pipeAsyncIterableToDataStream,
} from "@juspay/neurolink";

server.registerRoute({
  method: "POST",
  path: "/api/simple-stream",
  handler: async (ctx) => {
    const { prompt } = ctx.body as { prompt: string };

    const streamResponse = new DataStreamResponse();

    // Pipe the async iterable directly to the stream
    pipeAsyncIterableToDataStream(
      neurolink.generateStream({ prompt }),
      streamResponse,
      {
        textId: `text-${Date.now()}`,
        onChunk: (chunk) => console.log("Chunk received:", chunk),
        onError: (error) => console.error("Stream error:", error),
      },
    ).catch(console.error);

    return new Response(streamResponse.stream, {
      headers: streamResponse.headers,
    });
  },
  streaming: { enabled: true },
});
```

### Client-Side Consumption (Browser)

**Using EventSource (SSE):**

```typescript
function streamWithEventSource(input: string): void {
  // Note: EventSource only supports GET requests
  // Use fetch for POST requests with SSE

  const eventSource = new EventSource(
    `/api/agent/stream?input=${encodeURIComponent(input)}`,
  );

  let content = "";

  eventSource.addEventListener("text-start", (event) => {
    console.log("Stream started");
  });

  eventSource.addEventListener("text-delta", (event) => {
    const data = JSON.parse(event.data);
    content += data.delta;
    updateUI(content);
  });

  eventSource.addEventListener("text-end", (event) => {
    console.log("Text complete");
  });

  eventSource.addEventListener("tool-call", (event) => {
    const data = JSON.parse(event.data);
    console.log(`Tool called: ${data.name}`, data.arguments);
    showToolIndicator(data.name);
  });

  eventSource.addEventListener("tool-result", (event) => {
    const data = JSON.parse(event.data);
    console.log(`Tool result: ${data.name}`, data.result);
    hideToolIndicator(data.name);
  });

  eventSource.addEventListener("finish", (event) => {
    const data = JSON.parse(event.data);
    console.log("Stream finished:", data);
    eventSource.close();
  });

  eventSource.addEventListener("error", (event) => {
    console.error("Stream error:", event);
    eventSource.close();
  });
}
```

**Using Fetch API (for POST requests):**

```typescript
async function streamWithFetch(input: string): Promise<void> {
  const response = await fetch("/api/agent/stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({ input }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Parse SSE format
    const lines = buffer.split("\n\n");
    buffer = lines.pop() || "";

    for (const block of lines) {
      const eventMatch = block.match(/^event: (.+)$/m);
      const dataMatch = block.match(/^data: (.+)$/m);

      if (eventMatch && dataMatch) {
        const eventType = eventMatch[1];
        const data = JSON.parse(dataMatch[1]);

        switch (eventType) {
          case "text-delta":
            content += data.delta;
            updateUI(content);
            break;
          case "tool-call":
            showToolCall(data);
            break;
          case "tool-result":
            showToolResult(data);
            break;
          case "error":
            showError(data.message);
            break;
          case "finish":
            console.log("Complete:", data);
            break;
        }
      }
    }
  }
}
```

**React Hook Example:**

```typescript
import { useState, useCallback } from "react";

type StreamState = {
  content: string;
  isStreaming: boolean;
  error: string | null;
  toolCalls: Array<{ name: string; arguments: unknown; result?: unknown }>;
};

function useStream() {
  const [state, setState] = useState<StreamState>({
    content: "",
    isStreaming: false,
    error: null,
    toolCalls: [],
  });

  const stream = useCallback(async (input: string) => {
    setState({ content: "", isStreaming: true, error: null, toolCalls: [] });

    try {
      const response = await fetch("/api/agent/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const block of lines) {
          const eventMatch = block.match(/^event: (.+)$/m);
          const dataMatch = block.match(/^data: (.+)$/m);

          if (eventMatch && dataMatch) {
            const eventType = eventMatch[1];
            const data = JSON.parse(dataMatch[1]);

            switch (eventType) {
              case "text-delta":
                setState((prev) => ({
                  ...prev,
                  content: prev.content + data.delta,
                }));
                break;
              case "tool-call":
                setState((prev) => ({
                  ...prev,
                  toolCalls: [
                    ...prev.toolCalls,
                    { name: data.name, arguments: data.arguments },
                  ],
                }));
                break;
              case "error":
                setState((prev) => ({ ...prev, error: data.message }));
                break;
            }
          }
        }
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Stream failed",
      }));
    } finally {
      setState((prev) => ({ ...prev, isStreaming: false }));
    }
  }, []);

  return { ...state, stream };
}

// Usage in component
function ChatComponent() {
  const { content, isStreaming, error, toolCalls, stream } = useStream();

  return (
    <div>
      <button onClick={() => stream("Tell me a joke")} disabled={isStreaming}>
        {isStreaming ? "Streaming..." : "Generate"}
      </button>

      {error && <div className="error">{error}</div>}

      <div className="content">{content}</div>

      {toolCalls.map((tool, i) => (
        <div key={i} className="tool-call">
          Tool: {tool.name}
        </div>
      ))}
    </div>
  );
}
```

---

## WebStreamWriter (Legacy)

For simple SSE streaming without the full Data Stream Protocol:

```typescript
import { WebStreamWriter, formatSSEEvent } from "@juspay/neurolink";

const writer = new WebStreamWriter();

// Write events
writer.writeData({ message: "Hello" });
writer.writeEvent("custom-event", { data: "value" });
writer.writeDone();
writer.close();

// Use the stream
return new Response(writer.stream, {
  headers: { "Content-Type": "text/event-stream" },
});

// Manual SSE formatting
const sseMessage = formatSSEEvent({
  event: "message",
  data: JSON.stringify({ content: "Hello" }),
  id: "msg-1",
  retry: 5000,
});
// Result: "id: msg-1\nevent: message\nretry: 5000\ndata: {...}\n\n"
```

---

## Keep-Alive Configuration

Keep-alive signals prevent connection timeouts for long-running streams:

```typescript
const streamResponse = new DataStreamResponse({
  contentType: "text/event-stream",
  keepAliveInterval: 15000, // Send ping every 15 seconds
});
```

**SSE keep-alive format:**

```
: keep-alive

```

**NDJSON keep-alive format:**

```json
{ "type": "keep-alive" }
```

---

## Best Practices

### 1. Always Handle Client Disconnection

```typescript
// Check if stream is closed before writing
if (!streamResponse.isClosed()) {
  await streamResponse.writeTextDelta(id, chunk);
}
```

### 2. Use Unique IDs for Text Blocks

```typescript
const textId = `text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
```

### 3. Set Appropriate Timeouts

```typescript
const server = await createServer(neurolink, {
  config: {
    timeout: 120000, // 2 minutes for streaming endpoints
  },
});
```

### 4. Enable Keep-Alive for Long Streams

```typescript
const streamResponse = new DataStreamResponse({
  keepAliveInterval: 15000, // 15 seconds
});
```

### 5. Include Usage Statistics in Finish Event

```typescript
await streamResponse.finish({
  reason: "stop",
  usage: {
    input: promptTokens,
    output: completionTokens,
    total: promptTokens + completionTokens,
  },
});
```

### 6. Use AbortController for Cancellation

```typescript
const controller = new AbortController();

const response = await fetch("/api/agent/stream", {
  method: "POST",
  body: JSON.stringify({ input }),
  signal: controller.signal,
});

// Cancel the stream
controller.abort();
```

---

## Troubleshooting

### Stream Not Receiving Data

1. Check `Content-Type` header is `text/event-stream` or `application/x-ndjson`
2. Verify `Cache-Control: no-cache` is set
3. Ensure no proxy is buffering responses (check `X-Accel-Buffering: no`)

### Connection Dropping

1. Enable keep-alive with appropriate interval
2. Check server timeout configuration
3. Verify load balancer timeout settings

### Events Not Parsing Correctly

1. Ensure each SSE event ends with double newline (`\n\n`)
2. Verify JSON data is properly stringified
3. Check for proper event type names

---

## Related Documentation

- **[Server Adapters Overview](./index.md)** - Getting started with server adapters
- **[Hono Adapter](./hono.md)** - Framework-specific streaming examples
- **[Configuration Reference](../../reference/server-configuration.md)** - Full configuration options
- **[Security Best Practices](./security.md)** - Securing streaming endpoints

---

**Need Help?** Join our [GitHub Discussions](https://github.com/juspay/neurolink/discussions) or open an [issue](https://github.com/juspay/neurolink/issues).
