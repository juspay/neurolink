---
title: Streaming Guide
description: Real-time AI response streaming with NeuroLink — get tokens as they are generated for faster, more responsive applications
keywords:
  [
    streaming,
    real-time,
    async-iterable,
    stream,
    chunks,
    sse,
    server-sent-events,
    text-generation,
  ]
---

# Streaming Guide

> **Since**: v8.0.0 | **Status**: Stable | **Availability**: SDK + CLI
>
> **Provider Defaults:** When `--provider` (CLI) or `provider` (SDK) is not specified, NeuroLink defaults to **Vertex AI** with **gemini-2.5-flash**. Set the `NEUROLINK_PROVIDER` or `AI_PROVIDER` environment variable to change the default provider.

## Overview

Streaming lets you receive AI-generated text incrementally -- token by token -- instead of waiting for the entire response. This is the same mechanism behind the "typing" effect you see in ChatGPT and other chat interfaces.

**Why use streaming?**

- **Faster time-to-first-token** -- Users see output within milliseconds rather than waiting seconds for a complete response.
- **Better UX** -- Progressive rendering feels more interactive and responsive.
- **Lower memory footprint** -- Process tokens as they arrive instead of buffering the full response.
- **Early cancellation** -- Stop generation as soon as you have what you need.

## Quick Start

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.stream({
  input: { text: "Explain how TCP works in two paragraphs" },
});

for await (const chunk of result.stream) {
  if ("content" in chunk) {
    process.stdout.write(chunk.content);
  }
}
```

That is the simplest possible streaming call. The sections below cover every option in detail.

## SDK API

### `neurolink.stream(options): Promise<StreamResult>`

The `stream()` method accepts a `StreamOptions` object and returns a `StreamResult`.

### StreamOptions (Key Parameters)

| Parameter      | Type                    | Required | Description                                                                   |
| -------------- | ----------------------- | -------- | ----------------------------------------------------------------------------- |
| `input`        | `{ text: string, ... }` | Yes      | The prompt and optional multimodal inputs (images, PDFs, files, audio)        |
| `provider`     | `string`                | No       | AI provider name (`"openai"`, `"anthropic"`, `"google-ai"`, `"vertex"`, etc.) |
| `model`        | `string`                | No       | Specific model (`"gpt-4o"`, `"claude-3-5-sonnet"`, `"gemini-2.5-flash"`)      |
| `temperature`  | `number`                | No       | Randomness (0.0 = deterministic, 2.0 = creative). Default varies by provider  |
| `maxTokens`    | `number`                | No       | Maximum tokens in the response                                                |
| `systemPrompt` | `string`                | No       | System message to control AI behavior                                         |
| `tools`        | `Record<string, Tool>`  | No       | Custom tools the model can invoke during generation                           |
| `rag`          | `RAGConfig`             | No       | RAG configuration -- pass `{ files: [...] }` for automatic retrieval          |
| `timeout`      | `number \| string`      | No       | Request timeout in milliseconds                                               |
| `abortSignal`  | `AbortSignal`           | No       | External cancellation signal                                                  |
| `maxSteps`     | `number`                | No       | Maximum tool execution steps (default: 5)                                     |
| `disableTools` | `boolean`               | No       | Set `true` to disable all tool usage                                          |
| `tts`          | `TTSOptions`            | No       | Enable text-to-speech audio alongside text                                    |

### `input` Object

The `input` field is the only required parameter. At minimum it needs a `text` property:

```typescript
// Text only
input: { text: "Your prompt here" }

// Text + images
input: {
  text: "What is in this image?",
  images: [Buffer.from(pngData), "https://example.com/photo.jpg"]
}

// Text + PDF files
input: {
  text: "Summarize this document",
  pdfFiles: ["./report.pdf"]
}

// Text + auto-detected files
input: {
  text: "Review this code",
  files: ["./src/app.ts"]
}
```

## StreamResult

Calling `stream()` returns a `StreamResult` object. The response itself arrives through the `.stream` async iterable, while metadata fields resolve once the stream completes.

| Field            | Type                                      | Description                                                      |
| ---------------- | ----------------------------------------- | ---------------------------------------------------------------- |
| `stream`         | `AsyncIterable<StreamChunk>`              | The async iterable you consume with `for await`                  |
| `provider`       | `string`                                  | Name of the provider that served the request                     |
| `model`          | `string`                                  | Model that was used                                              |
| `usage`          | `TokenUsage`                              | Token usage (prompt, completion, total)                          |
| `finishReason`   | `string`                                  | Why generation stopped (`"stop"`, `"length"`, `"tool-calls"`)    |
| `toolCalls`      | `ToolCall[]`                              | Tool calls made during generation                                |
| `toolResults`    | `ToolResult[]`                            | Results from tool execution                                      |
| `toolExecutions` | `ToolExecutionSummary[]`                  | Detailed summary of all tool executions                          |
| `metadata`       | `object`                                  | Stream metadata (streamId, startTime, totalChunks, responseTime) |
| `analytics`      | `AnalyticsData \| Promise<AnalyticsData>` | Usage analytics (when `enableAnalytics: true`)                   |

## Stream Chunks

Each chunk yielded by `result.stream` is a discriminated union:

### Text Chunks

The most common chunk type. Contains a `content` string with the next piece of generated text.

```typescript
for await (const chunk of result.stream) {
  if ("content" in chunk) {
    process.stdout.write(chunk.content);
  }
}
```

You can also check the `type` discriminator:

```typescript
for await (const chunk of result.stream) {
  if (chunk.type === "text") {
    process.stdout.write(chunk.content);
  }
}
```

### Audio Chunks (TTS)

When TTS is enabled, the stream interleaves text and audio chunks:

```typescript
const result = await neurolink.stream({
  input: { text: "Tell me a story" },
  provider: "google-ai",
  tts: { enabled: true, voice: "en-US-Neural2-C" },
});

const audioBuffers: Buffer[] = [];

for await (const chunk of result.stream) {
  switch (chunk.type) {
    case "text":
      process.stdout.write(chunk.content);
      break;
    case "audio":
      audioBuffers.push(chunk.audio.data);
      break;
  }
}
```

See the [TTS Guide](./tts.md) for full audio streaming details.

## Collecting the Full Response

If you need the complete text after streaming finishes, accumulate chunks into a string:

```typescript
const result = await neurolink.stream({
  input: { text: "Write a haiku about programming" },
});

let fullText = "";

for await (const chunk of result.stream) {
  if ("content" in chunk) {
    fullText += chunk.content;
  }
}

console.log("Complete response:", fullText);
console.log("Tokens used:", result.usage);
console.log("Finish reason:", result.finishReason);
```

## Streaming with Tools

Tools work transparently during streaming. The model calls tools mid-stream, receives results, and continues generating. You consume the stream exactly the same way -- tool execution happens behind the scenes.

```typescript
import { NeuroLink } from "@juspay/neurolink";
import { tool } from "ai";
import { z } from "zod";

const neurolink = new NeuroLink();

const weatherTool = tool({
  description: "Get current weather for a city",
  parameters: z.object({ city: z.string() }),
  execute: async ({ city }) => {
    return { temperature: 22, condition: "sunny", city };
  },
});

const result = await neurolink.stream({
  input: { text: "What is the weather like in Tokyo right now?" },
  tools: { getWeather: weatherTool },
  maxSteps: 3,
});

for await (const chunk of result.stream) {
  if ("content" in chunk) {
    process.stdout.write(chunk.content);
  }
}

// After stream completes, inspect tool activity
console.log("Tool calls:", result.toolCalls);
console.log("Tool results:", result.toolResults);
```

## Streaming with RAG

Pass `rag: { files: [...] }` to automatically index documents and give the model a search tool. The model decides when to search during generation.

```typescript
const result = await neurolink.stream({
  input: { text: "What deployment strategies does the guide recommend?" },
  rag: {
    files: ["./docs/deployment-guide.md"],
    strategy: "markdown",
    chunkSize: 512,
    topK: 5,
  },
});

for await (const chunk of result.stream) {
  if ("content" in chunk) {
    process.stdout.write(chunk.content);
  }
}
```

See the [RAG Guide](./rag.md) for configuration details and advanced usage.

## Streaming with Multimodal Input

Stream responses that analyze images, PDFs, or other files:

```typescript
import { readFileSync } from "fs";

// Stream with image input
const result = await neurolink.stream({
  input: {
    text: "Describe what you see in detail",
    images: [readFileSync("./photo.png")],
  },
  provider: "openai",
  model: "gpt-4o",
});

for await (const chunk of result.stream) {
  if ("content" in chunk) {
    process.stdout.write(chunk.content);
  }
}
```

## Cancellation with AbortSignal

Use an `AbortSignal` to cancel a stream from outside:

```typescript
const controller = new AbortController();

// Cancel after 5 seconds
setTimeout(() => controller.abort(), 5000);

const result = await neurolink.stream({
  input: { text: "Write a very long story" },
  abortSignal: controller.signal,
});

try {
  for await (const chunk of result.stream) {
    if ("content" in chunk) {
      process.stdout.write(chunk.content);
    }
  }
} catch (error) {
  if (error.name === "AbortError") {
    console.log("\nStream cancelled.");
  }
}
```

## CLI Streaming

The NeuroLink CLI streams by default with the `stream` command:

```bash
# Basic streaming
neurolink stream "Explain quantum computing"

# With provider and model
neurolink stream "Write a poem" --provider openai --model gpt-4o

# With temperature
neurolink stream "Creative story about robots" --temperature 0.9

# With RAG
neurolink stream "Summarize the docs" --rag-files ./docs/guide.md

# With system prompt
neurolink stream "Translate to French" --system "You are a professional translator"
```

## Error Handling

Errors can occur either when initiating the stream or while consuming chunks. Handle both cases:

```typescript
try {
  const result = await neurolink.stream({
    input: { text: "Hello" },
    provider: "openai",
    timeout: 10000,
  });

  try {
    for await (const chunk of result.stream) {
      if ("content" in chunk) {
        process.stdout.write(chunk.content);
      }
    }
  } catch (streamError) {
    // Error during streaming (network drop, provider error mid-stream)
    console.error("Stream interrupted:", streamError.message);
  }
} catch (initError) {
  // Error before streaming starts (auth failure, invalid model, budget exceeded)
  console.error("Failed to start stream:", initError.message);
}
```

### Common Errors

| Error                     | Cause                                      | Solution                                            |
| ------------------------- | ------------------------------------------ | --------------------------------------------------- |
| `SESSION_BUDGET_EXCEEDED` | Session cost exceeded `maxBudgetUsd` limit | Increase budget or start a new session              |
| `PROVIDER_AUTH_ERROR`     | Missing or invalid API key                 | Set the provider's API key environment variable     |
| `TIMEOUT`                 | Request exceeded timeout                   | Increase `timeout` or use `abortSignal` for control |
| `MODEL_NOT_FOUND`         | Invalid model name                         | Check provider docs for supported model names       |

## Provider Support

All NeuroLink providers support streaming:

| Provider          | Streaming | Notes                                                       |
| ----------------- | --------- | ----------------------------------------------------------- |
| OpenAI            | Yes       | Full streaming with tool support                            |
| Anthropic         | Yes       | Full streaming with tool support                            |
| Google AI Studio  | Yes       | Full streaming with tool support                            |
| Google Vertex AI  | Yes       | Full streaming with tool support                            |
| Amazon Bedrock    | Yes       | Full streaming with tool support                            |
| Azure OpenAI      | Yes       | Full streaming with tool support                            |
| Mistral           | Yes       | Full streaming with tool support                            |
| LiteLLM           | Yes       | Full streaming; tool support depends on underlying model    |
| Ollama            | Yes       | Full streaming; tool support depends on model               |
| Hugging Face      | Yes       | Streaming support; tool support varies by model             |
| Amazon SageMaker  | Limited   | Falls back to fake streaming (generate then emit as chunks) |
| OpenAI-Compatible | Yes       | Depends on the endpoint's streaming support                 |

When real streaming is not available for a provider or model, NeuroLink transparently falls back to "fake streaming" -- it generates the full response and then emits it as chunks. Your consuming code does not need to change.

## See Also

- [Advanced Streaming Guide](../advanced/streaming.md) -- Enterprise streaming patterns, backpressure, and event types
- [TTS Guide](./tts.md) -- Text-to-speech audio streaming
- [RAG Guide](./rag.md) -- Retrieval-augmented generation with streaming
- [Thinking Configuration](./thinking-configuration.md) -- Extended thinking with streaming
- [Multimodal Guide](./multimodal.md) -- Images, PDFs, and files with streaming
