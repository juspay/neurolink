# Basic Streaming

## Problem

Waiting for a complete AI response before displaying anything creates a sluggish user experience. Users see nothing for seconds, then the entire response appears at once. For long responses, this delay is especially painful.

## Solution

Use `neurolink.stream()` to receive the response in real time, chunk by chunk. The result contains a `.stream` async iterable that yields content objects as they arrive from the provider.

## Code

```typescript
import { NeuroLink } from "@juspay/neurolink";

async function basicStream() {
  const neurolink = new NeuroLink();

  // Start a streaming request
  const result = await neurolink.stream({
    input: { text: "Explain how neural networks learn, step by step." },
    provider: "openai",
    model: "gpt-4",
  });

  // Consume the stream chunk by chunk
  for await (const chunk of result.stream) {
    if ("content" in chunk && chunk.content) {
      process.stdout.write(chunk.content);
    }
  }

  console.log("\n");

  // After the stream completes, metadata is available
  console.log("Provider:", result.provider);
  console.log("Model:", result.model);

  if (result.usage) {
    console.log("Prompt tokens:", result.usage.promptTokens);
    console.log("Completion tokens:", result.usage.completionTokens);
  }
}

basicStream();
```

## Explanation

### 1. Calling `neurolink.stream()`

The `stream()` method accepts the same `input` object as `generate()`. The key difference is the return type: instead of a single `content` string, you get a `StreamResult` with a `.stream` async iterable.

```typescript
const result = await neurolink.stream({
  input: { text: "Your prompt here" },
  provider: "openai",
});
```

### 2. Consuming the Stream

The `.stream` property is an `AsyncIterable` that yields objects with a `content` field. Use a `for await...of` loop to process each chunk as it arrives:

```typescript
for await (const chunk of result.stream) {
  if ("content" in chunk && chunk.content) {
    process.stdout.write(chunk.content);
  }
}
```

The `"content" in chunk` guard handles the discriminated union -- stream chunks can be text, audio, or image types depending on your configuration.

### 3. Accessing Metadata After Completion

Token usage, provider name, model name, and finish reason are available on the `result` object. Some fields (like `usage`) resolve after the stream finishes.

### 4. Stream Options

`stream()` accepts the same core options as `generate()`:

| Option         | Description                           |
| -------------- | ------------------------------------- |
| `provider`     | AI provider name (e.g., `"openai"`)   |
| `model`        | Specific model (e.g., `"gpt-4"`)      |
| `temperature`  | Response randomness (0.0 - 1.0)       |
| `maxTokens`    | Maximum tokens in the response        |
| `systemPrompt` | System-level instructions             |
| `timeout`      | Request timeout (number or string)    |
| `abortSignal`  | External cancellation via AbortSignal |

## Variations

### Accumulate the Full Response

Collect all chunks into a single string while still displaying them in real time:

```typescript
async function streamAndCollect(neurolink: NeuroLink, prompt: string) {
  const result = await neurolink.stream({
    input: { text: prompt },
    provider: "anthropic",
    model: "claude-sonnet-4-20250514",
  });

  let fullResponse = "";

  for await (const chunk of result.stream) {
    if ("content" in chunk && chunk.content) {
      fullResponse += chunk.content;
      process.stdout.write(chunk.content);
    }
  }

  console.log("\n\nTotal length:", fullResponse.length, "characters");
  return fullResponse;
}
```

### Stream with a System Prompt

Set instructions that guide the model's behavior:

```typescript
const result = await neurolink.stream({
  input: { text: "What are the benefits of TypeScript?" },
  provider: "openai",
  model: "gpt-4",
  systemPrompt:
    "You are a senior software engineer. Be concise and use bullet points.",
  temperature: 0.3,
  maxTokens: 500,
});

for await (const chunk of result.stream) {
  if ("content" in chunk && chunk.content) {
    process.stdout.write(chunk.content);
  }
}
```

### Cancel a Stream with AbortSignal

Stop a long-running stream programmatically:

```typescript
const controller = new AbortController();

// Cancel after 5 seconds
setTimeout(() => controller.abort(), 5000);

try {
  const result = await neurolink.stream({
    input: { text: "Write a very long essay about the history of computing." },
    provider: "openai",
    abortSignal: controller.signal,
  });

  for await (const chunk of result.stream) {
    if ("content" in chunk && chunk.content) {
      process.stdout.write(chunk.content);
    }
  }
} catch (error: any) {
  if (error.name === "AbortError") {
    console.log("\nStream cancelled by user.");
  } else {
    throw error;
  }
}
```

### Stream to a Web Response (Server-Side)

Pipe the stream to an HTTP response for real-time delivery to a browser:

```typescript
import { NeuroLink } from "@juspay/neurolink";

async function handleStreamRequest(req: Request): Promise<Response> {
  const neurolink = new NeuroLink();

  const result = await neurolink.stream({
    input: { text: "Explain distributed systems" },
    provider: "openai",
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of result.stream) {
        if ("content" in chunk && chunk.content) {
          controller.enqueue(encoder.encode(chunk.content));
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
```

## See Also

- [Streaming with Retry Logic](streaming-with-retry.md)
- [Error Recovery Patterns](error-recovery.md)
- [Multi-Provider Fallback](multi-provider-fallback.md)
- [API Reference](../sdk/api-reference.md)
