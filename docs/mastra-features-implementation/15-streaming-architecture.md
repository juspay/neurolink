# Mastra-Style Streaming Architecture Implementation

This document provides a comprehensive implementation guide for enhancing NeuroLink's streaming capabilities with Mastra-style stream event types, output classes, and advanced streaming features.

## Table of Contents

1. [Current NeuroLink Streaming Analysis](#current-neurolink-streaming-analysis)
2. [Lessons from NeuroLink Streaming Evolution](#lessons-from-neurolink-streaming-evolution)
3. [AI SDK Data Stream Protocol](#ai-sdk-data-stream-protocol)
4. [Structured Output Streaming](#structured-output-streaming)
5. [Updated Streaming Architecture](#updated-streaming-architecture)
6. [Error Recovery Patterns](#error-recovery-patterns)
7. [Mastra Streaming Features Overview](#mastra-streaming-features-overview)
8. [Stream Event Types](#stream-event-types)
9. [Stream Output Classes](#stream-output-classes)
10. [Streaming Features](#streaming-features)
11. [Client Integration](#client-integration)
12. [Implementation Plan](#implementation-plan)
13. [Migration Guide](#migration-guide)

---

## Current NeuroLink Streaming Analysis

### Existing Architecture

NeuroLink's current streaming implementation is built around the Vercel AI SDK's `streamText()` function with custom enhancements for multimodal content and tool integration.

#### Key Components

**1. StreamHandler Module** (`/src/lib/core/modules/StreamHandler.ts`)

- Validates stream options
- Creates text stream transformations
- Builds standardized stream results
- Collects stream analytics

```typescript
// Current StreamHandler pattern
export class StreamHandler {
  constructor(
    private readonly providerName: AIProviderName,
    private readonly modelName: string,
  ) {}

  createTextStream(result: {
    textStream: AsyncIterable<string>;
  }): AsyncGenerator<{ content: string }> {
    return (async function* () {
      for await (const chunk of result.textStream) {
        yield { content: chunk };
      }
    })();
  }

  createStreamResult(
    stream: AsyncGenerator<{ content: string }>,
    additionalProps: Partial<StreamResult> = {},
  ): StreamResult {
    return {
      stream,
      provider: this.providerName,
      model: this.modelName,
      ...additionalProps,
    };
  }
}
```

**2. StreamResult Type** (`/src/lib/types/streamTypes.ts`)

```typescript
export type StreamResult = {
  stream: AsyncIterable<
    | { content: string }
    | { type: "audio"; audio: AudioChunk }
    | { type: "image"; imageOutput: { base64: string } }
  >;
  provider?: string;
  model?: string;
  usage?: TokenUsage;
  finishReason?: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  toolEvents?: AsyncIterable<ToolExecutionEvent>;
  toolExecutions?: ToolExecutionSummary[];
  toolsUsed?: string[];
  metadata?: StreamMetadata;
  analytics?: AnalyticsData | Promise<AnalyticsData>;
  evaluation?: EvaluationData | Promise<EvaluationData>;
  events?: Array<StreamEvent>;
};
```

**3. StreamChunk Discriminated Union**

```typescript
export type StreamChunk =
  | { type: "text"; content: string }
  | { type: "audio"; audioChunk: TTSChunk };
```

**4. Provider Implementations**

Each provider (OpenAI, Anthropic, Google AI, etc.) implements `executeStream()`:

```typescript
// OpenAI Provider streaming pattern
protected async executeStream(options: StreamOptions): Promise<StreamResult> {
  const result = await streamText({
    model,
    messages,
    tools,
    maxSteps: options.maxSteps || DEFAULT_MAX_STEPS,
    onStepFinish: ({ toolCalls, toolResults }) => {
      this.handleToolExecutionStorage(toolCalls, toolResults, options, new Date());
    },
  });

  const transformedStream = async function* () {
    for await (const chunk of result.fullStream || result.textStream) {
      if (chunk.type === "text-delta") {
        yield { content: chunk.textDelta };
      }
    }
  };

  return { stream: transformedStream(), provider, model };
}
```

### Current Limitations

1. **Limited Event Granularity**: Current events only distinguish text/audio/image chunks
2. **No Message Lifecycle Events**: Missing message start/end events
3. **Basic Tool Events**: Tool events lack streaming deltas
4. **No Reasoning/Thinking Events**: Extended thinking content not streamed separately
5. **Single Stream Type**: No specialized streams for agents, networks, or workflows
6. **Limited Partial Object Support**: Structured output streaming not fully implemented

---

## Lessons from NeuroLink Streaming Evolution

This section documents key learnings from NeuroLink's streaming development history, providing architectural insights for the enhanced streaming implementation.

### Timeline Overview

NeuroLink's streaming capabilities evolved through 13 distinct phases from June 2025 to January 2026:

| Phase | Date         | Key Development                                          |
| ----- | ------------ | -------------------------------------------------------- |
| 1     | Jun 2025     | Initial CLI streaming with generator pattern             |
| 2     | Jun 2025     | Fake streaming pattern for tool support                  |
| 3     | Jul 2025     | Enterprise analytics with progress tracking              |
| 4     | Jul 2025     | Generate/stream unification                              |
| 5     | Aug 2025     | BaseProvider consolidation                               |
| 6     | Sep 2025     | Generate via streamText refactor                         |
| 7     | Sep 2025     | Azure streaming issues resolution                        |
| 8     | Sep 2025     | Guardrails and stream middleware                         |
| 9     | Aug 2025     | Provider test enhancement with executeStream             |
| 10    | Aug 2025     | Conversation memory for streaming                        |
| 11    | Nov 2025     | Multimodal streaming architecture (StreamHandler module) |
| 12    | Dec-Jan 2026 | TTS streaming integration                                |
| 13    | Nov 2025     | Stream as default CLI command                            |

### Fake Streaming: A First-Class Pattern

**Key Insight:** Fake streaming is not a hack but a deliberate architectural choice that enables consistent UX regardless of provider capabilities.

The fake streaming pattern was introduced in Phase 2 when tools and streaming didn't work together natively:

```typescript
// Original fake streaming implementation (June 2025)
if (argv.disableTools === true) {
  // Tools disabled - use standard SDK streaming
  stream = await sdk.generateTextStream({
    /* options */
  });
} else {
  // Tools enabled - AgentEnhancedProvider doesn't support streaming with tools
  // Fall back to generateText and simulate streaming
  const result = await agentProvider.generateText(argv.prompt);

  const text = result?.text || "";
  const CHUNK_SIZE = 10;
  const DELAY_MS = 50;
  for (let i = 0; i < text.length; i += CHUNK_SIZE) {
    process.stdout.write(text.slice(i, i + CHUNK_SIZE));
    await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
  }
}
```

**Evolution to Current Implementation:**

```typescript
// Current BaseProvider.stream() pattern (January 2026)
async stream(
  optionsOrPrompt: StreamOptions | string,
  analysisSchema?: ValidationSchema,
): Promise<StreamResult> {
  const options = this.normalizeStreamOptions(optionsOrPrompt);

  // CRITICAL: Always prefer real streaming over fake streaming
  try {
    const realStreamResult = await this.executeStream(options, analysisSchema);
    return realStreamResult;
  } catch (realStreamError) {
    // Fallback to fake streaming only if real streaming fails AND tools are enabled
    if (!options.disableTools && this.supportsTools()) {
      return await this.executeFakeStreaming(options, analysisSchema);
    }
    throw this.handleProviderError(realStreamError);
  }
}
```

**Natural-Feeling Fake Streaming:**

```typescript
// Current fake streaming with word-boundary chunking
private async executeFakeStreaming(options: StreamOptions): Promise<StreamResult> {
  const result = await this.generate(textOptions, analysisSchema);

  return {
    stream: (async function* () {
      if (result?.content) {
        const words = result.content.split(/(\s+)/);
        let buffer = "";

        for (let i = 0; i < words.length; i++) {
          buffer += words[i];

          // Yield at sentence boundaries or when buffer is long enough
          const shouldYield = i === words.length - 1 ||
            buffer.length > 50 ||
            /[.!?;,]\s*$/.test(buffer);

          if (shouldYield && buffer.trim()) {
            yield { content: buffer };
            buffer = "";
            // Random delay (1-10ms) for natural feel
            await new Promise(resolve => setTimeout(resolve, Math.random() * 9 + 1));
          }
        }
      }

      // Yield image output if present
      if (result?.imageOutput) {
        yield { type: "image" as const, imageOutput: result.imageOutput };
      }
    })(),
    usage: result?.usage,
    toolCalls: result?.toolCalls,
    toolResults: result?.toolResults,
  };
}
```

### StreamHandler Module: Single Responsibility Extraction

**Key Insight:** Extracting streaming logic into a dedicated module reduced BaseProvider from 2,418 to 1,118 lines (54% reduction).

```typescript
// StreamHandler module (extracted November 2025)
export class StreamHandler {
  constructor(
    private readonly providerName: AIProviderName,
    private readonly modelName: string,
  ) {}

  validateStreamOptions(options: StreamOptions): void {
    const validation = validateStreamOpts(options);
    if (!validation.isValid) {
      throw new ValidationError(`Stream options validation failed: ${summary}`);
    }
  }

  createTextStream(result: {
    textStream: AsyncIterable<string>;
  }): AsyncGenerator<{ content: string }> {
    return (async function* () {
      for await (const chunk of result.textStream) {
        yield { content: chunk };
      }
    })();
  }

  createStreamResult(
    stream: AsyncGenerator<{ content: string }>,
    additionalProps = {},
  ): StreamResult {
    return {
      stream,
      provider: this.providerName,
      model: this.modelName,
      ...additionalProps,
    };
  }

  async createStreamAnalytics(
    result,
    startTime,
    options,
  ): Promise<UnknownRecord | undefined> {
    return createAnalytics(
      this.providerName,
      this.modelName,
      result,
      Date.now() - startTime,
      {
        requestId: `${this.providerName}-stream-${nanoid()}`,
        streamingMode: true,
        ...options.context,
      },
    );
  }
}
```

### Stream Types Evolution

**From Simple to Discriminated Union:**

```typescript
// Initial types (July 2025)
export type StreamChunk = { content: string };

// Current types (January 2026) - Discriminated union
export type StreamChunk =
  | { type: "text"; content: string }
  | { type: "audio"; audioChunk: TTSChunk };

// Full StreamResult with comprehensive metadata
export type StreamResult = {
  stream: AsyncIterable<
    | { content: string }
    | { type: "audio"; audio: AudioChunk }
    | { type: "image"; imageOutput: { base64: string } }
  >;
  provider?: string;
  model?: string;
  usage?: TokenUsage;
  finishReason?: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  toolEvents?: AsyncIterable<ToolExecutionEvent>;
  toolExecutions?: ToolExecutionSummary[];
  toolsUsed?: string[];
  metadata?: {
    streamId?: string;
    startTime?: number;
    totalChunks?: number;
    responseTime?: number;
    fallback?: boolean;
    totalToolExecutions?: number;
    guardrailsBlocked?: boolean;
    thoughts?: Array<{ id?: string; type?: string; content?: string }>;
  };
  analytics?: AnalyticsData | Promise<AnalyticsData>;
  evaluation?: EvaluationData | Promise<EvaluationData>;
  events?: Array<{ type: string; seq: number; timestamp: number }>;
};
```

### Progress Tracking Pattern

**Key Insight:** Throttling progress callbacks (100ms intervals) prevents UI performance issues.

```typescript
// StreamingEnhancer with progress tracking (July 2025)
export class StreamingEnhancer {
  static addProgressTracking(
    stream: ReadableStream,
    callback?: ProgressCallback,
    options?: { streamId?: string; bufferSize?: number },
  ): ReadableStream {
    const streamId = options?.streamId || `stream_${Date.now()}`;
    const startTime = Date.now();
    let chunkCount = 0;
    let totalBytes = 0;
    let lastProgressTime = 0;

    return new ReadableStream({
      start(controller) {
        callback?.({
          chunkCount: 0,
          totalBytes: 0,
          chunkSize: 0,
          elapsedTime: 0,
          streamId,
          phase: "initializing",
        });
      },
      async pull(controller) {
        const { done, value } = await reader.read();
        const timeSinceLastProgress = Date.now() - lastProgressTime;

        // Throttle: max 10 callbacks/second
        if (callback && (timeSinceLastProgress > 100 || chunkCount === 1)) {
          callback({
            chunkCount,
            totalBytes,
            chunkSize,
            elapsedTime,
            phase: "streaming",
          });
          lastProgressTime = Date.now();
        }
      },
    });
  }
}
```

### Key Architectural Lessons

1. **Template Method Pattern for Providers**: `executeStream()` abstraction lets each provider implement specifics while `stream()` in BaseProvider handles common patterns.

2. **Generate Uses StreamText Internally**: Using streaming protocol internally even for non-streaming calls improves consistency and performance.

3. **Middleware Must Handle Multiple Chunk Formats**: Guardrails and other middleware need to handle `{ content: string }`, `{ textDelta: string }`, and other formats.

4. **Provider-Specific Issues Require Debug Logging**: Azure streaming issues were resolved through comprehensive debug logging for tool loading verification.

5. **Composition Over Inheritance**: StreamHandler follows Single Responsibility Principle, making it easier to test and maintain.

---

## AI SDK Data Stream Protocol

The Vercel AI SDK provides a standardized streaming protocol that NeuroLink should align with for frontend compatibility.

### Server-Sent Events (SSE) Format

AI SDK uses SSE format with these advantages over proprietary formats:

- Improved standardization across frameworks
- Keep-alive through ping messages
- Automatic reconnect capabilities
- Better cache handling

### Text Streaming Pattern

The AI SDK uses a start/delta/end pattern for text content:

```typescript
// Server-Sent Event format
// text-start: {"id": "text-1"}
// text-delta: {"id": "text-1", "delta": "Hello "}
// text-delta: {"id": "text-1", "delta": "world!"}
// text-end: {"id": "text-1"}
```

### Stream Types Comparison

| Stream Type     | Description                                    | Use Case                        |
| --------------- | ---------------------------------------------- | ------------------------------- |
| **Text Stream** | Plain text chunks appended to form response    | Simple chat, completion         |
| **Data Stream** | Structured data with metadata and tool results | Complex interactions with tools |

### Custom Backend Integration

For non-Node.js backends or custom implementations, set the appropriate header:

```typescript
// NeuroLink streaming endpoint
export function createStreamResponse(
  stream: AsyncIterable<StreamEventPayload>,
): Response {
  const encoder = new TextEncoder();

  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          const data = JSON.stringify(event) + "\n";
          controller.enqueue(encoder.encode(`data: ${data}\n`));
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(readableStream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "x-vercel-ai-ui-message-stream": "v1", // AI SDK compatibility
    },
  });
}
```

### Data Parts for Type-Safe Custom Data

AI SDK 5+ supports streaming arbitrary data from server to client:

```typescript
// Server-side data stream creation
const stream = createDataStream({
  execute: async (dataStream) => {
    // Stream custom data (tool status, progress, etc.)
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
    // Handle transient data (progress updates, intermediate results)
    console.log("Transient:", data);
  },
});
```

### NeuroLink Protocol Alignment Recommendation

```typescript
// Proposed NeuroLink AI SDK-compatible streaming
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

---

## Structured Output Streaming

### AI SDK Output.object Pattern

The modern approach in AI SDK 6+ uses the `output` property on `generateText` and `streamText`:

```typescript
import { generateText, Output } from "ai";
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
console.log(result.object.name);
```

### Streaming Partial Objects

```typescript
import { streamText, Output } from "ai";

const result = streamText({
  model: openai("gpt-4o"),
  prompt: "Generate a detailed recipe",
  output: Output.object({ schema: recipeSchema }),
});

// Stream partial objects as they build
for await (const partialObject of result.partialObjectStream) {
  console.log("Partial:", partialObject);
  // Progressive UI updates as object builds
  // e.g., show recipe name immediately, then ingredients as they stream
}
```

### Zod Schema Best Practices

#### Use describe() for Better LLM Results

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

// Less reliable with LLMs
const schema = z.object({
  middleName: z.string().optional(), // May cause inconsistent behavior
});
```

### NeuroLink Partial Object Streaming Implementation

Based on the `PartialObjectStreamer` design:

```typescript
// NeuroLink partial object streaming
export class PartialObjectStreamer {
  private buffer: string = "";
  private partialObject: JsonValue | null = null;

  processJsonDelta(delta: string): ObjectDeltaPayload | null {
    this.buffer += delta;

    // Try to parse partial JSON with auto-closing brackets
    const parsed = this.tryPartialParse(this.buffer);

    if (parsed.success) {
      this.partialObject = parsed.value;
      return {
        type: "object:delta",
        seq: this.seqCounter++,
        timestamp: Date.now(),
        partialObject: parsed.value,
        currentPath: parsed.currentPath,
        jsonTextDelta: delta,
      };
    }

    return null;
  }

  private tryPartialParse(json: string): {
    success: boolean;
    value?: JsonValue;
    currentPath?: string;
  } {
    // Try direct parse first
    try {
      return { success: true, value: JSON.parse(json) };
    } catch {
      // Try with auto-closing brackets
    }

    // Count open brackets/braces and build closing sequence
    const openBraces = (json.match(/\{/g) || []).length;
    const closeBraces = (json.match(/\}/g) || []).length;
    const openBrackets = (json.match(/\[/g) || []).length;
    const closeBrackets = (json.match(/\]/g) || []).length;

    let closing = "";
    for (let i = 0; i < openBrackets - closeBrackets; i++)
      closing = "]" + closing;
    for (let i = 0; i < openBraces - closeBraces; i++) closing = "}" + closing;

    // Handle incomplete strings and trailing commas
    let adjustedJson = json;
    if (this.isInString(json)) adjustedJson = json + '"';
    adjustedJson = adjustedJson.replace(/,\s*$/, "");

    try {
      return { success: true, value: JSON.parse(adjustedJson + closing) };
    } catch {
      return { success: false };
    }
  }
}
```

---

## Updated Streaming Architecture

Based on the evolution analysis and AI SDK research, here is the refined streaming architecture for NeuroLink.

### Three-Layer Streaming Design

```
┌─────────────────────────────────────────────────────────────────┐
│                     Layer 1: Transport                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ SSE/HTTP    │  │ WebSocket   │  │ stdio (MCP)             │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Layer 2: Protocol                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Data Stream Protocol (AI SDK)               │   │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────────────┐   │   │
│  │  │ text:start │ │ text:delta │ │ text:end           │   │   │
│  │  │ tool:call  │ │ tool:result│ │ reasoning:delta    │   │   │
│  │  │ object:delta│ │ step:start │ │ message:end       │   │   │
│  │  └────────────┘ └────────────┘ └────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Layer 3: Consumer                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │MastraModel  │  │MastraAgent  │  │ MastraWorkflow          │ │
│  │   Output    │  │NetworkStream│  │   Stream                │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Event Flow Architecture

```
Provider API        StreamEventEmitter      MastraModelOutput       Client
    │                      │                       │                  │
    │ fullStream           │                       │                  │
    ├─────────────────────>│                       │                  │
    │                      │ text:start            │                  │
    │                      ├──────────────────────>│                  │
    │                      │                       │ event            │
    │                      │                       ├─────────────────>│
    │ text-delta           │                       │                  │
    ├─────────────────────>│ text:delta            │                  │
    │                      ├──────────────────────>│                  │
    │                      │                       │ event            │
    │                      │                       ├─────────────────>│
    │ tool-call            │                       │                  │
    ├─────────────────────>│ tool:call             │                  │
    │                      ├──────────────────────>│                  │
    │                      │                       │ event            │
    │                      │                       ├─────────────────>│
    │ tool-result          │                       │                  │
    ├─────────────────────>│ tool:result           │                  │
    │                      ├──────────────────────>│                  │
    │                      │                       │ event            │
    │                      │                       ├─────────────────>│
    │ finish               │                       │                  │
    ├─────────────────────>│ text:end              │                  │
    │                      │ message:end           │                  │
    │                      ├──────────────────────>│                  │
    │                      │                       │ [DONE]           │
    │                      │                       ├─────────────────>│
```

### Unified Stream() Method with Fallback Strategy

```typescript
// BaseProvider.stream() with refined architecture
async stream(
  optionsOrPrompt: StreamOptions | string,
  analysisSchema?: ValidationSchema,
): Promise<StreamResult> {
  const options = this.normalizeStreamOptions(optionsOrPrompt);
  const streamHandler = new StreamHandler(this.providerName, this.modelName);

  // Validate options
  streamHandler.validateStreamOptions(options);

  // Strategy: Real streaming first, fake streaming as fallback
  try {
    // Attempt real streaming
    const realStreamResult = await this.executeStream(options, analysisSchema);

    // Wrap in MastraModelOutput for enhanced consumption
    return this.wrapInMastraOutput(realStreamResult, options);

  } catch (realStreamError) {
    // Check if fallback is available
    if (this.shouldUseFakeStreaming(options, realStreamError)) {
      logger.debug('Falling back to fake streaming', {
        reason: realStreamError.message,
        provider: this.providerName
      });

      return await this.executeFakeStreaming(options, analysisSchema);
    }

    throw this.handleProviderError(realStreamError);
  }
}

private shouldUseFakeStreaming(options: StreamOptions, error: Error): boolean {
  // Use fake streaming when:
  // 1. Tools are enabled
  // 2. Real streaming failed due to tool incompatibility
  // 3. Provider supports tools
  return !options.disableTools &&
         this.supportsTools() &&
         this.isToolRelatedError(error);
}
```

### Provider-Specific executeStream Pattern

```typescript
// OpenAI Provider executeStream (reference implementation)
protected async executeStream(options: StreamOptions): Promise<StreamResult> {
  this.validateStreamOptions(options);

  // OpenAI-specific: Validate tools format and filter problematic ones
  let tools = this.validateAndFilterToolsForOpenAI(allTools);

  // OpenAI max tools limit
  const MAX_TOOLS = parseInt(process.env.OPENAI_MAX_TOOLS || "150", 10);
  if (Object.keys(tools).length > MAX_TOOLS) {
    tools = Object.fromEntries(Object.entries(tools).slice(0, MAX_TOOLS));
  }

  // Build messages with multimodal support
  const messages = await this.buildMessagesForStream(options);

  // Use AI SDK streamText
  const result = await streamText({
    model: await this.getAISDKModel(),
    messages,
    tools,
    maxSteps: options.maxSteps || 5,
    temperature: options.temperature,
    onStepFinish: ({ toolCalls, toolResults }) => {
      this.handleToolExecutionStorage(toolCalls, toolResults, options, new Date());
    },
  });

  return this.createStreamResult(this.createTextStream(result));
}
```

### TTS Integration in Streaming

```typescript
// StreamChunk discriminated union with TTS
export type StreamChunk =
  | { type: "text"; content: string; }
  | { type: "audio"; audioChunk: TTSChunk; };

// TTS-enabled streaming in BaseProvider
async streamWithTTS(options: StreamOptions): Promise<StreamResult> {
  if (!options.tts?.enabled) {
    return this.stream(options);
  }

  const textStream = await this.stream(options);

  // When options.tts.enabled === true:
  // - Buffer text chunks and synthesize to audio using TTSProcessor
  // - Yield original StreamChunk (text) followed by audio chunks
  // - Add TTS latency tracking to chunk metadata
  // - Handle TTS errors gracefully with fallback to text-only streaming

  return this.interleaveTTSAudio(textStream, options.tts);
}
```

---

## Error Recovery Patterns

Based on the streaming evolution analysis and AI SDK research, here are the recommended error recovery patterns.

### Hierarchical Error Recovery Strategy

```
┌─────────────────────────────────────────────────────────┐
│                   Error Occurs                          │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│           Level 1: Automatic Retry                      │
│  - Network errors: exponential backoff (3 attempts)     │
│  - Rate limits: respect Retry-After header              │
│  - Timeout: extend timeout and retry once               │
└────────────────────────┬────────────────────────────────┘
                         │ Failed
                         ▼
┌─────────────────────────────────────────────────────────┐
│           Level 2: Fallback Streaming                   │
│  - Real streaming failed → Try fake streaming           │
│  - Tool incompatibility → Disable tools and retry       │
│  - Model unavailable → Try fallback model               │
└────────────────────────┬────────────────────────────────┘
                         │ Failed
                         ▼
┌─────────────────────────────────────────────────────────┐
│           Level 3: Provider Fallback                    │
│  - Primary provider failed → Try secondary provider     │
│  - All providers failed → Report error to user          │
└─────────────────────────────────────────────────────────┘
```

### Retry Configuration Pattern

```typescript
import { RateLimitError, TimeoutError, NetworkError } from "./errors";

type RetryConfig = {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
};

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

async function streamWithRetry(
  options: StreamOptions,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
): Promise<StreamResult> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < config.maxRetries; attempt++) {
    try {
      return await executeStream(options);
    } catch (error) {
      lastError = error as Error;

      if (!isRetriableError(error)) {
        throw error;
      }

      const delay = calculateDelay(attempt, config, error);
      logger.warn(
        `Stream attempt ${attempt + 1} failed, retrying in ${delay}ms`,
        {
          error: error.message,
          attempt,
        },
      );

      await sleep(delay);
    }
  }

  throw lastError;
}

function isRetriableError(error: unknown): boolean {
  return (
    error instanceof RateLimitError ||
    error instanceof TimeoutError ||
    error instanceof NetworkError
  );
}

function calculateDelay(
  attempt: number,
  config: RetryConfig,
  error: unknown,
): number {
  // Respect Retry-After header for rate limits
  if (error instanceof RateLimitError && error.retryAfter) {
    return error.retryAfter * 1000;
  }

  // Exponential backoff
  const delay =
    config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt);
  return Math.min(delay, config.maxDelayMs);
}
```

### Stream Error Event Handling

```typescript
// Error event in stream
type StreamErrorEvent = {
  type: "error";
  seq: number;
  timestamp: number;
  code: string;
  message: string;
  retriable: boolean;
  category: "validation" | "execution" | "timeout" | "network" | "provider";
  context?: {
    provider?: string;
    model?: string;
    step?: number;
    toolName?: string;
  };
};

// StreamEventEmitter error handling
private createError(chunk: UnknownRecord): StreamErrorEvent {
  const error = chunk.error as UnknownRecord || chunk;

  return {
    type: "error",
    seq: this.seqCounter++,
    timestamp: Date.now(),
    code: (error.code || "UNKNOWN_ERROR") as string,
    message: (error.message || "An unknown error occurred") as string,
    retriable: this.determineRetriable(error),
    category: this.categorizeError(error),
    context: {
      provider: this.config.provider,
      model: this.config.model,
    },
  };
}

private determineRetriable(error: UnknownRecord): boolean {
  const nonRetriableCodes = ["INVALID_API_KEY", "CONTENT_FILTER", "CONTEXT_LENGTH_EXCEEDED"];
  return !nonRetriableCodes.includes(error.code as string);
}

private categorizeError(error: UnknownRecord): StreamErrorEvent["category"] {
  const code = error.code as string;

  if (code?.includes("TIMEOUT")) return "timeout";
  if (code?.includes("NETWORK") || code?.includes("CONNECTION")) return "network";
  if (code?.includes("VALIDATION") || code?.includes("INVALID")) return "validation";
  if (code?.includes("PROVIDER") || code?.includes("API")) return "provider";

  return "execution";
}
```

### Provider Fallback Pattern

```typescript
// Provider fallback configuration
type FallbackConfig = {
  providers: Array<{
    name: AIProviderName;
    model: string;
    priority: number;
  }>;
  maxAttempts: number;
};

async function streamWithFallback(
  options: StreamOptions,
  fallbackConfig: FallbackConfig,
): Promise<StreamResult> {
  const sortedProviders = fallbackConfig.providers.sort(
    (a, b) => a.priority - b.priority,
  );
  const errors: Error[] = [];

  for (const providerConfig of sortedProviders) {
    try {
      const provider = await ProviderFactory.createProvider(
        providerConfig.name,
        providerConfig.model,
      );

      return await provider.stream({
        ...options,
        model: providerConfig.model,
      });
    } catch (error) {
      logger.warn(`Provider ${providerConfig.name} failed`, {
        error: (error as Error).message,
      });
      errors.push(error as Error);
      continue;
    }
  }

  // All providers failed
  throw new AggregateError(errors, "All providers failed");
}
```

### Tool Call Error Recovery

```typescript
// Tool execution with error recovery
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
          // Return error as content for LLM to handle gracefully
          return {
            error: "User not found",
            id,
            suggestion: "Try searching by email instead",
          };
        }
      },
    },
  },
});

// Tool errors appear as tool-error content parts in AI SDK 5+
for (const step of result.steps) {
  for (const content of step.content) {
    if (content.type === "tool-error") {
      logger.error("Tool execution failed", {
        toolName: content.toolName,
        error: content.error,
      });

      // Optionally retry with different parameters
      // or fall back to alternative tool
    }
  }
}
```

### Azure-Specific Error Resolution

From the September 2025 Azure streaming issues resolution:

```typescript
// Azure-specific error handling patterns
class AzureOpenAIProvider extends BaseProvider {
  protected async executeStream(options: StreamOptions): Promise<StreamResult> {
    try {
      return await super.executeStream(options);
    } catch (error) {
      // Azure-specific: Handle cognitiveservices.azure.com domain issues
      if (this.isAzureEndpointError(error)) {
        logger.debug("Retrying with corrected Azure endpoint", {
          originalEndpoint: this.endpoint,
        });

        this.endpoint = this.normalizeAzureEndpoint(this.endpoint);
        return await super.executeStream(options);
      }

      // Azure-specific: Remove default token limits that cause streaming issues
      if (this.isTokenLimitError(error)) {
        delete options.maxTokens;
        return await super.executeStream(options);
      }

      throw error;
    }
  }

  private normalizeAzureEndpoint(endpoint: string): string {
    // Handle cognitiveservices.azure.com domains correctly
    if (endpoint.includes("cognitiveservices.azure.com")) {
      return endpoint.replace("/openai/deployments", "");
    }
    return endpoint;
  }
}
```

---

## Mastra Streaming Features Overview

Mastra provides a rich streaming architecture with:

1. **Fine-grained Event Types**: Text deltas, tool calls, reasoning, message lifecycle
2. **Specialized Output Classes**: Model output, agent network streams, workflow streams
3. **Partial Object Streaming**: Real-time structured output construction
4. **Completion Hooks**: Callbacks for message completion and stream finalization
5. **Provider Metadata Passthrough**: Full access to provider-specific information

---

## Stream Event Types

### Type Definitions

Create new file: `/src/lib/types/streamEventTypes.ts`

```typescript
/**
 * Mastra-style Stream Event Types for NeuroLink
 * Provides fine-grained streaming events for AI generation
 */

import type { JsonValue, JsonObject, UnknownRecord } from "./common.js";
import type { TokenUsage } from "./analytics.js";

// ============================================
// STREAM EVENT DISCRIMINATED UNION
// ============================================

/**
 * Base stream event type
 */
export type BaseStreamEvent = {
  /** Event type discriminator */
  type: string;
  /** Event sequence number (monotonically increasing) */
  seq: number;
  /** Event timestamp (Unix milliseconds) */
  timestamp: number;
};

// ============================================
// TEXT EVENTS
// ============================================

/**
 * Emitted when text generation begins
 */
export type TextStartPayload = BaseStreamEvent & {
  type: "text:start";
  /** Optional generation ID */
  generationId?: string;
  /** Model that will generate */
  model?: string;
};

/**
 * Emitted for each text chunk during streaming
 */
export type TextDeltaPayload = BaseStreamEvent & {
  type: "text:delta";
  /** The text delta content */
  delta: string;
  /** Cumulative text so far (optional, for clients that need it) */
  accumulated?: string;
  /** Character offset in the full response */
  offset?: number;
};

/**
 * Emitted when text generation completes
 */
export type TextEndPayload = BaseStreamEvent & {
  type: "text:end";
  /** Final complete text */
  text: string;
  /** Character count */
  charCount: number;
  /** Word count (approximate) */
  wordCount?: number;
};

// ============================================
// TOOL EVENTS
// ============================================

/**
 * Emitted when a tool call begins
 */
export type ToolCallStartPayload = BaseStreamEvent & {
  type: "tool:call:start";
  /** Unique tool call ID */
  toolCallId: string;
  /** Tool name being called */
  toolName: string;
  /** MCP server ID if external tool */
  serverId?: string;
  /** Tool category */
  category?: "direct" | "custom" | "mcp";
};

/**
 * Emitted during streaming tool call arguments
 */
export type ToolCallDeltaPayload = BaseStreamEvent & {
  type: "tool:call:delta";
  /** Tool call ID this delta belongs to */
  toolCallId: string;
  /** Argument text delta (JSON being built) */
  argsTextDelta: string;
  /** Accumulated args text so far */
  accumulatedArgsText?: string;
};

/**
 * Emitted when tool call arguments are complete
 */
export type ToolCallPayload = BaseStreamEvent & {
  type: "tool:call";
  /** Unique tool call ID */
  toolCallId: string;
  /** Tool name that was called */
  toolName: string;
  /** Complete parsed arguments */
  args: JsonObject;
  /** Server ID for MCP tools */
  serverId?: string;
};

/**
 * Emitted when a tool execution begins
 */
export type ToolExecuteStartPayload = BaseStreamEvent & {
  type: "tool:execute:start";
  /** Tool call ID being executed */
  toolCallId: string;
  /** Tool name */
  toolName: string;
  /** Input parameters */
  input: JsonValue;
};

/**
 * Emitted when a tool execution completes
 */
export type ToolResultPayload = BaseStreamEvent & {
  type: "tool:result";
  /** Tool call ID */
  toolCallId: string;
  /** Tool name */
  toolName: string;
  /** Tool execution result */
  result: JsonValue;
  /** Execution duration in ms */
  duration: number;
  /** Whether execution was successful */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Additional metadata */
  metadata?: {
    serverId?: string;
    cached?: boolean;
    fallback?: boolean;
  };
};

// ============================================
// REASONING EVENTS (Extended Thinking)
// ============================================

/**
 * Emitted when extended thinking/reasoning begins
 */
export type ReasoningStartPayload = BaseStreamEvent & {
  type: "reasoning:start";
  /** Thinking level (for Gemini 3) */
  thinkingLevel?: "minimal" | "low" | "medium" | "high";
  /** Budget tokens (for Anthropic) */
  budgetTokens?: number;
};

/**
 * Emitted for reasoning content deltas
 */
export type ReasoningDeltaPayload = BaseStreamEvent & {
  type: "reasoning:delta";
  /** Reasoning text delta */
  delta: string;
  /** Thinking phase or step */
  phase?: string;
  /** Step number in reasoning chain */
  stepNumber?: number;
};

/**
 * Emitted when reasoning completes
 */
export type ReasoningEndPayload = BaseStreamEvent & {
  type: "reasoning:end";
  /** Complete reasoning text */
  reasoning: string;
  /** Reasoning tokens used */
  reasoningTokens?: number;
  /** Thinking signature/hash */
  thoughtSignature?: string;
  /** Structured thoughts array */
  thoughts?: Array<{
    id?: string;
    type?: string;
    content: string;
  }>;
};

// ============================================
// MESSAGE LIFECYCLE EVENTS
// ============================================

/**
 * Emitted when a message generation starts
 */
export type MessageStartPayload = BaseStreamEvent & {
  type: "message:start";
  /** Message role */
  role: "assistant" | "user" | "system" | "tool";
  /** Message ID */
  messageId: string;
  /** Provider name */
  provider?: string;
  /** Model name */
  model?: string;
  /** Step number in multi-step generation */
  stepNumber?: number;
};

/**
 * Emitted when a message generation completes
 */
export type MessageEndPayload = BaseStreamEvent & {
  type: "message:end";
  /** Message ID */
  messageId: string;
  /** Final message content */
  content?: string;
  /** Stop reason */
  finishReason: FinishReason;
  /** Token usage for this message */
  usage?: TokenUsage;
  /** Provider-specific response metadata */
  providerMetadata?: UnknownRecord;
};

/**
 * Finish reason types (aligned with AI SDK)
 */
export type FinishReason =
  | "stop" // Natural completion
  | "length" // Max tokens reached
  | "content-filter" // Content filtered
  | "tool-calls" // Tool calls requested
  | "error" // Error occurred
  | "cancelled" // User cancelled
  | "other" // Other reason
  | "unknown"; // Unknown reason

// ============================================
// STRUCTURED OUTPUT EVENTS
// ============================================

/**
 * Emitted during partial object streaming
 */
export type ObjectDeltaPayload = BaseStreamEvent & {
  type: "object:delta";
  /** Partial object built so far */
  partialObject: JsonValue;
  /** JSON path being updated */
  currentPath?: string;
  /** Raw JSON text delta */
  jsonTextDelta?: string;
};

/**
 * Emitted when structured object is complete
 */
export type ObjectCompletePayload = BaseStreamEvent & {
  type: "object:complete";
  /** Complete parsed object */
  object: JsonValue;
  /** Whether object passed schema validation */
  valid: boolean;
  /** Validation errors if any */
  validationErrors?: string[];
};

// ============================================
// STEP EVENTS (Multi-step Generation)
// ============================================

/**
 * Emitted when a generation step begins
 */
export type StepStartPayload = BaseStreamEvent & {
  type: "step:start";
  /** Step number (1-indexed) */
  stepNumber: number;
  /** Maximum steps allowed */
  maxSteps: number;
  /** Step type */
  stepType: "initial" | "tool-response" | "continuation";
};

/**
 * Emitted when a generation step completes
 */
export type StepEndPayload = BaseStreamEvent & {
  type: "step:end";
  /** Step number */
  stepNumber: number;
  /** Step finish reason */
  finishReason: FinishReason;
  /** Whether more steps will follow */
  isContinued: boolean;
  /** Step token usage */
  usage?: TokenUsage;
  /** Tools called in this step */
  toolsCalled?: string[];
};

// ============================================
// AUDIO EVENTS (TTS)
// ============================================

/**
 * Emitted for audio chunk during TTS streaming
 */
export type AudioDeltaPayload = BaseStreamEvent & {
  type: "audio:delta";
  /** Audio data (base64 encoded) */
  data: string;
  /** Sample rate in Hz */
  sampleRateHz: number;
  /** Number of channels */
  channels: number;
  /** Encoding format */
  encoding: string;
  /** Duration of this chunk in ms */
  durationMs?: number;
};

/**
 * Emitted when audio generation completes
 */
export type AudioEndPayload = BaseStreamEvent & {
  type: "audio:end";
  /** Total audio duration in ms */
  totalDurationMs: number;
  /** Total audio size in bytes */
  totalSizeBytes: number;
  /** Audio format */
  format: string;
};

// ============================================
// ERROR EVENTS
// ============================================

/**
 * Emitted when an error occurs during streaming
 */
export type ErrorPayload = BaseStreamEvent & {
  type: "error";
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** Whether error is retriable */
  retriable: boolean;
  /** Error category */
  category: "validation" | "execution" | "timeout" | "network" | "provider";
  /** Additional error context */
  context?: UnknownRecord;
};

// ============================================
// UNION TYPE
// ============================================

/**
 * All possible stream event payloads
 */
export type StreamEventPayload =
  | TextStartPayload
  | TextDeltaPayload
  | TextEndPayload
  | ToolCallStartPayload
  | ToolCallDeltaPayload
  | ToolCallPayload
  | ToolExecuteStartPayload
  | ToolResultPayload
  | ReasoningStartPayload
  | ReasoningDeltaPayload
  | ReasoningEndPayload
  | MessageStartPayload
  | MessageEndPayload
  | ObjectDeltaPayload
  | ObjectCompletePayload
  | StepStartPayload
  | StepEndPayload
  | AudioDeltaPayload
  | AudioEndPayload
  | ErrorPayload;

/**
 * Event type string literal union
 */
export type StreamEventType = StreamEventPayload["type"];

// ============================================
// TYPE GUARDS
// ============================================

export function isTextEvent(
  event: StreamEventPayload,
): event is TextDeltaPayload | TextStartPayload | TextEndPayload {
  return event.type.startsWith("text:");
}

export function isToolEvent(
  event: StreamEventPayload,
): event is
  | ToolCallPayload
  | ToolResultPayload
  | ToolCallStartPayload
  | ToolCallDeltaPayload
  | ToolExecuteStartPayload {
  return event.type.startsWith("tool:");
}

export function isReasoningEvent(
  event: StreamEventPayload,
): event is
  | ReasoningStartPayload
  | ReasoningDeltaPayload
  | ReasoningEndPayload {
  return event.type.startsWith("reasoning:");
}

export function isMessageEvent(
  event: StreamEventPayload,
): event is MessageStartPayload | MessageEndPayload {
  return event.type.startsWith("message:");
}

export function isObjectEvent(
  event: StreamEventPayload,
): event is ObjectDeltaPayload | ObjectCompletePayload {
  return event.type.startsWith("object:");
}

export function isAudioEvent(
  event: StreamEventPayload,
): event is AudioDeltaPayload | AudioEndPayload {
  return event.type.startsWith("audio:");
}
```

---

## Stream Output Classes

### MastraModelOutput

Create new file: `/src/lib/streaming/MastraModelOutput.ts`

```typescript
/**
 * MastraModelOutput - Enhanced stream output wrapper
 * Provides rich stream consumption patterns for AI model output
 */

import type { TokenUsage } from "../types/analytics.js";
import type { JsonValue, UnknownRecord } from "../types/common.js";
import type {
  StreamEventPayload,
  FinishReason,
  TextDeltaPayload,
  ToolResultPayload,
  ReasoningEndPayload,
} from "../types/streamEventTypes.js";
import type { ToolCall, ToolResult } from "../types/streamTypes.js";
import { logger } from "../utils/logger.js";

/**
 * Configuration for MastraModelOutput
 */
export type MastraModelOutputConfig = {
  /** Provider name */
  provider: string;
  /** Model name */
  model: string;
  /** Unique stream ID */
  streamId: string;
  /** Whether to track partial objects */
  trackPartialObjects?: boolean;
  /** Callback on message completion */
  onMessageComplete?: (content: string, usage: TokenUsage) => void;
  /** Callback on tool execution */
  onToolExecution?: (toolName: string, result: unknown) => void;
  /** Callback on stream error */
  onError?: (error: Error) => void;
};

/**
 * MastraModelOutput - Wraps a stream with enhanced consumption patterns
 */
export class MastraModelOutput {
  private readonly config: MastraModelOutputConfig;
  private readonly eventStream: AsyncIterable<StreamEventPayload>;
  private readonly startTime: number;

  // Accumulated state
  private accumulatedText: string = "";
  private accumulatedReasoning: string = "";
  private toolCalls: ToolCall[] = [];
  private toolResults: ToolResult[] = [];
  private partialObject: JsonValue | null = null;
  private finalObject: JsonValue | null = null;
  private usage: TokenUsage | null = null;
  private finishReason: FinishReason | null = null;
  private providerMetadata: UnknownRecord | null = null;

  // State flags
  private consumed: boolean = false;
  private completed: boolean = false;
  private error: Error | null = null;

  constructor(
    eventStream: AsyncIterable<StreamEventPayload>,
    config: MastraModelOutputConfig,
  ) {
    this.eventStream = eventStream;
    this.config = config;
    this.startTime = Date.now();
  }

  // ============================================
  // STREAM CONSUMPTION METHODS
  // ============================================

  /**
   * Iterate over all stream events
   */
  async *[Symbol.asyncIterator](): AsyncIterator<StreamEventPayload> {
    if (this.consumed) {
      throw new Error("Stream has already been consumed");
    }
    this.consumed = true;

    try {
      for await (const event of this.eventStream) {
        this.processEvent(event);
        yield event;
      }
      this.completed = true;
    } catch (err) {
      this.error = err instanceof Error ? err : new Error(String(err));
      this.config.onError?.(this.error);
      throw err;
    }
  }

  /**
   * Get only text delta events as a simple string stream
   */
  async *textStream(): AsyncGenerator<string> {
    for await (const event of this) {
      if (event.type === "text:delta") {
        yield (event as TextDeltaPayload).delta;
      }
    }
  }

  /**
   * Get text deltas with metadata
   */
  async *textDeltaStream(): AsyncGenerator<TextDeltaPayload> {
    for await (const event of this) {
      if (event.type === "text:delta") {
        yield event as TextDeltaPayload;
      }
    }
  }

  /**
   * Get tool results as they complete
   */
  async *toolResultStream(): AsyncGenerator<ToolResultPayload> {
    for await (const event of this) {
      if (event.type === "tool:result") {
        yield event as ToolResultPayload;
      }
    }
  }

  /**
   * Stream partial objects during structured output
   */
  async *partialObjectStream<T = JsonValue>(): AsyncGenerator<T> {
    for await (const event of this) {
      if (event.type === "object:delta") {
        yield event.partialObject as T;
      }
    }
  }

  // ============================================
  // PROMISE-BASED ACCESSORS (wait for completion)
  // ============================================

  /**
   * Wait for and return the complete text
   */
  async text(): Promise<string> {
    await this.ensureConsumed();
    return this.accumulatedText;
  }

  /**
   * Wait for and return the complete reasoning/thinking content
   */
  async reasoning(): Promise<string> {
    await this.ensureConsumed();
    return this.accumulatedReasoning;
  }

  /**
   * Wait for and return all tool calls
   */
  async getToolCalls(): Promise<ToolCall[]> {
    await this.ensureConsumed();
    return this.toolCalls;
  }

  /**
   * Wait for and return all tool results
   */
  async getToolResults(): Promise<ToolResult[]> {
    await this.ensureConsumed();
    return this.toolResults;
  }

  /**
   * Wait for and return the final structured object
   */
  async object<T = JsonValue>(): Promise<T | null> {
    await this.ensureConsumed();
    return this.finalObject as T | null;
  }

  /**
   * Wait for and return token usage
   */
  async getUsage(): Promise<TokenUsage | null> {
    await this.ensureConsumed();
    return this.usage;
  }

  /**
   * Wait for and return the finish reason
   */
  async getFinishReason(): Promise<FinishReason | null> {
    await this.ensureConsumed();
    return this.finishReason;
  }

  /**
   * Wait for and return provider metadata
   */
  async getProviderMetadata(): Promise<UnknownRecord | null> {
    await this.ensureConsumed();
    return this.providerMetadata;
  }

  /**
   * Get response time in milliseconds
   */
  async getResponseTime(): Promise<number> {
    await this.ensureConsumed();
    return Date.now() - this.startTime;
  }

  // ============================================
  // SYNC ACCESSORS (return current state)
  // ============================================

  /**
   * Get current accumulated text (may be partial)
   */
  get currentText(): string {
    return this.accumulatedText;
  }

  /**
   * Get current partial object (may be incomplete)
   */
  get currentPartialObject(): JsonValue | null {
    return this.partialObject;
  }

  /**
   * Check if stream has completed
   */
  get isCompleted(): boolean {
    return this.completed;
  }

  /**
   * Check if stream had an error
   */
  get hasError(): boolean {
    return this.error !== null;
  }

  /**
   * Get the error if any
   */
  get streamError(): Error | null {
    return this.error;
  }

  /**
   * Provider name
   */
  get provider(): string {
    return this.config.provider;
  }

  /**
   * Model name
   */
  get model(): string {
    return this.config.model;
  }

  /**
   * Stream ID
   */
  get streamId(): string {
    return this.config.streamId;
  }

  // ============================================
  // PIPING AND TRANSFORMATION
  // ============================================

  /**
   * Pipe text to a writable stream (e.g., process.stdout)
   */
  async pipeTextTo(writable: NodeJS.WritableStream): Promise<void> {
    for await (const text of this.textStream()) {
      writable.write(text);
    }
  }

  /**
   * Transform events with a mapping function
   */
  async *map<T>(fn: (event: StreamEventPayload) => T): AsyncGenerator<T> {
    for await (const event of this) {
      yield fn(event);
    }
  }

  /**
   * Filter events
   */
  async *filter(
    predicate: (event: StreamEventPayload) => boolean,
  ): AsyncGenerator<StreamEventPayload> {
    for await (const event of this) {
      if (predicate(event)) {
        yield event;
      }
    }
  }

  // ============================================
  // CONVERSION METHODS
  // ============================================

  /**
   * Convert to a Response object (for HTTP streaming)
   */
  toResponse(headers?: Record<string, string>): Response {
    const encoder = new TextEncoder();
    const self = this;

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of self) {
            const data = JSON.stringify(event) + "\n";
            controller.enqueue(encoder.encode(`data: ${data}\n`));
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        ...headers,
      },
    });
  }

  /**
   * Convert to a simple async string stream (legacy compatibility)
   */
  async *toStringStream(): AsyncGenerator<string> {
    yield* this.textStream();
  }

  /**
   * Convert to legacy StreamResult format
   */
  async toLegacyResult(): Promise<{
    stream: AsyncIterable<{ content: string }>;
    provider: string;
    model: string;
    usage?: TokenUsage;
    finishReason?: string;
    toolCalls?: ToolCall[];
    toolResults?: ToolResult[];
  }> {
    // Create a new iterable for the stream
    const self = this;
    const legacyStream = (async function* () {
      for await (const event of self) {
        if (event.type === "text:delta") {
          yield { content: (event as TextDeltaPayload).delta };
        }
      }
    })();

    await this.ensureConsumed();

    return {
      stream: legacyStream,
      provider: this.config.provider,
      model: this.config.model,
      usage: this.usage ?? undefined,
      finishReason: this.finishReason ?? undefined,
      toolCalls: this.toolCalls,
      toolResults: this.toolResults,
    };
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  /**
   * Process a stream event and update internal state
   */
  private processEvent(event: StreamEventPayload): void {
    switch (event.type) {
      case "text:delta":
        this.accumulatedText += (event as TextDeltaPayload).delta;
        break;

      case "reasoning:end":
        this.accumulatedReasoning = (event as ReasoningEndPayload).reasoning;
        break;

      case "tool:call":
        this.toolCalls.push({
          toolName: event.toolName,
          parameters: event.args,
          id: event.toolCallId,
        });
        break;

      case "tool:result":
        const toolResultEvent = event as ToolResultPayload;
        this.toolResults.push({
          toolName: toolResultEvent.toolName,
          status: toolResultEvent.success ? "success" : "failure",
          output: toolResultEvent.result,
          error: toolResultEvent.error,
          id: toolResultEvent.toolCallId,
          executionTime: toolResultEvent.duration,
        });
        this.config.onToolExecution?.(
          toolResultEvent.toolName,
          toolResultEvent.result,
        );
        break;

      case "object:delta":
        this.partialObject = event.partialObject;
        break;

      case "object:complete":
        this.finalObject = event.object;
        break;

      case "message:end":
        this.finishReason = event.finishReason;
        this.usage = event.usage ?? null;
        this.providerMetadata = event.providerMetadata ?? null;
        this.config.onMessageComplete?.(
          this.accumulatedText,
          this.usage ?? { input: 0, output: 0, total: 0 },
        );
        break;

      case "error":
        logger.error("Stream error event received", {
          code: event.code,
          message: event.message,
        });
        break;
    }
  }

  /**
   * Ensure the stream has been consumed
   */
  private async ensureConsumed(): Promise<void> {
    if (this.consumed && this.completed) {
      return;
    }

    if (!this.consumed) {
      // Consume the stream silently
      for await (const _ of this) {
        // Events are processed in the iterator
      }
    }
  }
}
```

### MastraAgentNetworkStream

Create new file: `/src/lib/streaming/MastraAgentNetworkStream.ts`

```typescript
/**
 * MastraAgentNetworkStream - Stream output for multi-agent network operations
 * Handles routing between agents and aggregating their outputs
 */

import type { StreamEventPayload } from "../types/streamEventTypes.js";
import type { TokenUsage } from "../types/analytics.js";
import { MastraModelOutput } from "./MastraModelOutput.js";

/**
 * Agent identification in the network
 */
export type AgentInfo = {
  /** Agent unique ID */
  id: string;
  /** Agent name */
  name: string;
  /** Agent role/type */
  role: string;
  /** Model used by agent */
  model?: string;
};

/**
 * Network-specific stream events
 */
export type AgentSwitchPayload = {
  type: "agent:switch";
  seq: number;
  timestamp: number;
  fromAgent: AgentInfo | null;
  toAgent: AgentInfo;
  reason: string;
};

export type AgentCompletePayload = {
  type: "agent:complete";
  seq: number;
  timestamp: number;
  agent: AgentInfo;
  content: string;
  usage?: TokenUsage;
};

export type NetworkCompletePayload = {
  type: "network:complete";
  seq: number;
  timestamp: number;
  agentsInvolved: AgentInfo[];
  totalTokenUsage: TokenUsage;
  routingPath: string[];
};

export type NetworkStreamEvent =
  | StreamEventPayload
  | AgentSwitchPayload
  | AgentCompletePayload
  | NetworkCompletePayload;

/**
 * Configuration for MastraAgentNetworkStream
 */
export type AgentNetworkStreamConfig = {
  /** Network ID */
  networkId: string;
  /** Available agents */
  agents: AgentInfo[];
  /** Initial agent */
  initialAgent: AgentInfo;
  /** Maximum agent hops */
  maxHops?: number;
};

/**
 * MastraAgentNetworkStream - Manages streaming from a network of agents
 */
export class MastraAgentNetworkStream {
  private readonly config: AgentNetworkStreamConfig;
  private readonly eventStream: AsyncIterable<NetworkStreamEvent>;
  private readonly startTime: number;

  // State tracking
  private currentAgent: AgentInfo;
  private agentOutputs: Map<string, MastraModelOutput> = new Map();
  private routingPath: string[] = [];
  private totalUsage: TokenUsage = { input: 0, output: 0, total: 0 };
  private consumed: boolean = false;
  private completed: boolean = false;

  constructor(
    eventStream: AsyncIterable<NetworkStreamEvent>,
    config: AgentNetworkStreamConfig,
  ) {
    this.eventStream = eventStream;
    this.config = config;
    this.currentAgent = config.initialAgent;
    this.startTime = Date.now();
    this.routingPath.push(config.initialAgent.id);
  }

  /**
   * Iterate over all network events
   */
  async *[Symbol.asyncIterator](): AsyncIterator<NetworkStreamEvent> {
    if (this.consumed) {
      throw new Error("Network stream has already been consumed");
    }
    this.consumed = true;

    try {
      for await (const event of this.eventStream) {
        this.processNetworkEvent(event);
        yield event;
      }
      this.completed = true;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Get events only from a specific agent
   */
  async *agentEvents(agentId: string): AsyncGenerator<StreamEventPayload> {
    let inTargetAgent = false;

    for await (const event of this) {
      if (event.type === "agent:switch") {
        inTargetAgent = (event as AgentSwitchPayload).toAgent.id === agentId;
      } else if (
        inTargetAgent &&
        !event.type.startsWith("agent:") &&
        !event.type.startsWith("network:")
      ) {
        yield event as StreamEventPayload;
      }
    }
  }

  /**
   * Get the current active agent
   */
  get activeAgent(): AgentInfo {
    return this.currentAgent;
  }

  /**
   * Get the routing path taken
   */
  get currentRoutingPath(): string[] {
    return [...this.routingPath];
  }

  /**
   * Get cumulative token usage
   */
  get currentUsage(): TokenUsage {
    return { ...this.totalUsage };
  }

  /**
   * Wait for network completion and get final result
   */
  async getNetworkResult(): Promise<{
    content: string;
    routingPath: string[];
    agentsUsed: AgentInfo[];
    totalUsage: TokenUsage;
    responseTime: number;
  }> {
    if (!this.consumed) {
      for await (const _ of this) {
        // Consume stream
      }
    }

    // Aggregate content from all agents
    const contents: string[] = [];
    for (const output of this.agentOutputs.values()) {
      contents.push(await output.text());
    }

    return {
      content: contents.join("\n"),
      routingPath: this.routingPath,
      agentsUsed: this.config.agents.filter((a) =>
        this.routingPath.includes(a.id),
      ),
      totalUsage: this.totalUsage,
      responseTime: Date.now() - this.startTime,
    };
  }

  /**
   * Process network-specific events
   */
  private processNetworkEvent(event: NetworkStreamEvent): void {
    switch (event.type) {
      case "agent:switch":
        const switchEvent = event as AgentSwitchPayload;
        this.currentAgent = switchEvent.toAgent;
        this.routingPath.push(switchEvent.toAgent.id);
        break;

      case "agent:complete":
        const completeEvent = event as AgentCompletePayload;
        if (completeEvent.usage) {
          this.totalUsage.input += completeEvent.usage.input;
          this.totalUsage.output += completeEvent.usage.output;
          this.totalUsage.total += completeEvent.usage.total;
        }
        break;

      case "network:complete":
        this.completed = true;
        break;
    }
  }
}
```

### MastraWorkflowStream

Create new file: `/src/lib/streaming/MastraWorkflowStream.ts`

```typescript
/**
 * MastraWorkflowStream - Stream output for workflow executions
 * Handles step transitions, conditional branches, and parallel execution
 */

import type { StreamEventPayload } from "../types/streamEventTypes.js";
import type { JsonValue, UnknownRecord } from "../types/common.js";

/**
 * Workflow step information
 */
export type WorkflowStepInfo = {
  /** Step ID */
  id: string;
  /** Step name */
  name: string;
  /** Step type */
  type: "ai" | "tool" | "condition" | "parallel" | "human-input" | "transform";
  /** Step index in workflow */
  index: number;
};

/**
 * Workflow-specific stream events
 */
export type WorkflowStartPayload = {
  type: "workflow:start";
  seq: number;
  timestamp: number;
  workflowId: string;
  workflowName: string;
  totalSteps: number;
  input: JsonValue;
};

export type StepTransitionPayload = {
  type: "step:transition";
  seq: number;
  timestamp: number;
  fromStep: WorkflowStepInfo | null;
  toStep: WorkflowStepInfo;
  transitionReason?: string;
};

export type StepOutputPayload = {
  type: "step:output";
  seq: number;
  timestamp: number;
  step: WorkflowStepInfo;
  output: JsonValue;
  duration: number;
};

export type BranchPayload = {
  type: "workflow:branch";
  seq: number;
  timestamp: number;
  condition: string;
  result: boolean;
  selectedBranch: string;
};

export type ParallelStartPayload = {
  type: "parallel:start";
  seq: number;
  timestamp: number;
  branches: WorkflowStepInfo[];
};

export type ParallelEndPayload = {
  type: "parallel:end";
  seq: number;
  timestamp: number;
  completedBranches: string[];
  failedBranches: string[];
  results: Record<string, JsonValue>;
};

export type WorkflowCompletePayload = {
  type: "workflow:complete";
  seq: number;
  timestamp: number;
  workflowId: string;
  success: boolean;
  output: JsonValue;
  stepsExecuted: number;
  totalDuration: number;
};

export type WorkflowStreamEvent =
  | StreamEventPayload
  | WorkflowStartPayload
  | StepTransitionPayload
  | StepOutputPayload
  | BranchPayload
  | ParallelStartPayload
  | ParallelEndPayload
  | WorkflowCompletePayload;

/**
 * Configuration for MastraWorkflowStream
 */
export type WorkflowStreamConfig = {
  /** Workflow ID */
  workflowId: string;
  /** Workflow name */
  workflowName: string;
  /** Workflow steps */
  steps: WorkflowStepInfo[];
  /** Initial input */
  input: JsonValue;
};

/**
 * MastraWorkflowStream - Manages streaming from workflow executions
 */
export class MastraWorkflowStream {
  private readonly config: WorkflowStreamConfig;
  private readonly eventStream: AsyncIterable<WorkflowStreamEvent>;
  private readonly startTime: number;

  // State tracking
  private currentStep: WorkflowStepInfo | null = null;
  private stepOutputs: Map<string, JsonValue> = new Map();
  private executedSteps: WorkflowStepInfo[] = [];
  private consumed: boolean = false;
  private completed: boolean = false;
  private finalOutput: JsonValue | null = null;
  private success: boolean = false;

  constructor(
    eventStream: AsyncIterable<WorkflowStreamEvent>,
    config: WorkflowStreamConfig,
  ) {
    this.eventStream = eventStream;
    this.config = config;
    this.startTime = Date.now();
  }

  /**
   * Iterate over all workflow events
   */
  async *[Symbol.asyncIterator](): AsyncIterator<WorkflowStreamEvent> {
    if (this.consumed) {
      throw new Error("Workflow stream has already been consumed");
    }
    this.consumed = true;

    try {
      for await (const event of this.eventStream) {
        this.processWorkflowEvent(event);
        yield event;
      }
      this.completed = true;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Get events only from AI steps (text generation)
   */
  async *aiStepEvents(): AsyncGenerator<StreamEventPayload> {
    let inAIStep = false;

    for await (const event of this) {
      if (event.type === "step:transition") {
        inAIStep = (event as StepTransitionPayload).toStep.type === "ai";
      } else if (
        inAIStep &&
        !event.type.startsWith("step:") &&
        !event.type.startsWith("workflow:") &&
        !event.type.startsWith("parallel:")
      ) {
        yield event as StreamEventPayload;
      }
    }
  }

  /**
   * Get step outputs as they complete
   */
  async *stepOutputs(): AsyncGenerator<{
    step: WorkflowStepInfo;
    output: JsonValue;
  }> {
    for await (const event of this) {
      if (event.type === "step:output") {
        const outputEvent = event as StepOutputPayload;
        yield { step: outputEvent.step, output: outputEvent.output };
      }
    }
  }

  /**
   * Get the current active step
   */
  get activeStep(): WorkflowStepInfo | null {
    return this.currentStep;
  }

  /**
   * Get execution progress
   */
  get progress(): { current: number; total: number; percentage: number } {
    const current = this.executedSteps.length;
    const total = this.config.steps.length;
    return {
      current,
      total,
      percentage: total > 0 ? Math.round((current / total) * 100) : 0,
    };
  }

  /**
   * Wait for workflow completion and get final result
   */
  async getWorkflowResult(): Promise<{
    success: boolean;
    output: JsonValue | null;
    stepsExecuted: WorkflowStepInfo[];
    stepOutputs: Map<string, JsonValue>;
    duration: number;
  }> {
    if (!this.consumed) {
      for await (const _ of this) {
        // Consume stream
      }
    }

    return {
      success: this.success,
      output: this.finalOutput,
      stepsExecuted: this.executedSteps,
      stepOutputs: this.stepOutputs,
      duration: Date.now() - this.startTime,
    };
  }

  /**
   * Process workflow-specific events
   */
  private processWorkflowEvent(event: WorkflowStreamEvent): void {
    switch (event.type) {
      case "step:transition":
        const transitionEvent = event as StepTransitionPayload;
        this.currentStep = transitionEvent.toStep;
        break;

      case "step:output":
        const outputEvent = event as StepOutputPayload;
        this.stepOutputs.set(outputEvent.step.id, outputEvent.output);
        this.executedSteps.push(outputEvent.step);
        break;

      case "workflow:complete":
        const completeEvent = event as WorkflowCompletePayload;
        this.success = completeEvent.success;
        this.finalOutput = completeEvent.output;
        this.completed = true;
        break;
    }
  }
}
```

---

## Streaming Features

### Stream Event Emitter

Create new file: `/src/lib/streaming/StreamEventEmitter.ts`

```typescript
/**
 * StreamEventEmitter - Transforms AI SDK streams into Mastra-style events
 */

import type {
  StreamEventPayload,
  TextDeltaPayload,
  TextStartPayload,
  TextEndPayload,
  ToolCallPayload,
  ToolResultPayload,
  MessageStartPayload,
  MessageEndPayload,
  ReasoningDeltaPayload,
  StepStartPayload,
  StepEndPayload,
  FinishReason,
} from "../types/streamEventTypes.js";
import type { TokenUsage } from "../types/analytics.js";
import type { JsonObject, UnknownRecord } from "../types/common.js";
import { nanoid } from "nanoid";

/**
 * Configuration for stream event emission
 */
export type StreamEventEmitterConfig = {
  /** Provider name */
  provider: string;
  /** Model name */
  model: string;
  /** Emit reasoning events separately */
  emitReasoningEvents?: boolean;
  /** Include accumulated text in deltas */
  includeAccumulated?: boolean;
  /** Maximum steps for multi-step generation */
  maxSteps?: number;
};

/**
 * StreamEventEmitter - Creates Mastra-style events from Vercel AI SDK streams
 */
export class StreamEventEmitter {
  private readonly config: StreamEventEmitterConfig;
  private seqCounter: number = 0;
  private accumulatedText: string = "";
  private accumulatedReasoning: string = "";
  private stepNumber: number = 0;
  private messageId: string = "";
  private generationId: string = "";

  constructor(config: StreamEventEmitterConfig) {
    this.config = config;
    this.generationId = nanoid();
    this.messageId = nanoid();
  }

  /**
   * Transform a Vercel AI SDK fullStream into Mastra-style events
   */
  async *transform(
    fullStream: AsyncIterable<unknown>,
  ): AsyncGenerator<StreamEventPayload> {
    // Emit message start
    yield this.createMessageStart();

    // Emit text start
    yield this.createTextStart();

    let hasYieldedTextEnd = false;

    for await (const chunk of fullStream) {
      const events = this.processChunk(chunk);
      for (const event of events) {
        // Track if we're ending text
        if (event.type === "text:end") {
          hasYieldedTextEnd = true;
        }
        yield event;
      }
    }

    // Ensure text:end is emitted
    if (!hasYieldedTextEnd && this.accumulatedText) {
      yield this.createTextEnd();
    }

    // Message end will be emitted by the caller with final usage data
  }

  /**
   * Process a single chunk from the AI SDK stream
   */
  private processChunk(chunk: unknown): StreamEventPayload[] {
    const events: StreamEventPayload[] = [];
    const chunkObj = chunk as UnknownRecord;

    if (!chunkObj || typeof chunkObj !== "object") {
      return events;
    }

    const chunkType = chunkObj.type as string;

    switch (chunkType) {
      case "text-delta":
        const textDelta = chunkObj.textDelta as string;
        if (textDelta) {
          this.accumulatedText += textDelta;
          events.push(this.createTextDelta(textDelta));
        }
        break;

      case "reasoning":
      case "thinking":
        if (this.config.emitReasoningEvents) {
          const reasoningText = (chunkObj.reasoning ||
            chunkObj.thinking ||
            chunkObj.textDelta) as string;
          if (reasoningText) {
            this.accumulatedReasoning += reasoningText;
            events.push(this.createReasoningDelta(reasoningText));
          }
        }
        break;

      case "tool-call":
        events.push(this.createToolCall(chunkObj));
        break;

      case "tool-result":
        events.push(this.createToolResult(chunkObj));
        break;

      case "step-start":
        this.stepNumber++;
        events.push(this.createStepStart());
        break;

      case "step-finish":
        events.push(this.createStepEnd(chunkObj));
        break;

      case "finish":
        events.push(this.createTextEnd());
        break;

      case "error":
        events.push(this.createError(chunkObj));
        break;
    }

    return events;
  }

  /**
   * Create a message start event
   */
  createMessageStart(): MessageStartPayload {
    return {
      type: "message:start",
      seq: this.seqCounter++,
      timestamp: Date.now(),
      role: "assistant",
      messageId: this.messageId,
      provider: this.config.provider,
      model: this.config.model,
      stepNumber: this.stepNumber,
    };
  }

  /**
   * Create a message end event
   */
  createMessageEnd(
    finishReason: FinishReason,
    usage?: TokenUsage,
    providerMetadata?: UnknownRecord,
  ): MessageEndPayload {
    return {
      type: "message:end",
      seq: this.seqCounter++,
      timestamp: Date.now(),
      messageId: this.messageId,
      content: this.accumulatedText,
      finishReason,
      usage,
      providerMetadata,
    };
  }

  /**
   * Create a text start event
   */
  private createTextStart(): TextStartPayload {
    return {
      type: "text:start",
      seq: this.seqCounter++,
      timestamp: Date.now(),
      generationId: this.generationId,
      model: this.config.model,
    };
  }

  /**
   * Create a text delta event
   */
  private createTextDelta(delta: string): TextDeltaPayload {
    return {
      type: "text:delta",
      seq: this.seqCounter++,
      timestamp: Date.now(),
      delta,
      accumulated: this.config.includeAccumulated
        ? this.accumulatedText
        : undefined,
      offset: this.accumulatedText.length - delta.length,
    };
  }

  /**
   * Create a text end event
   */
  private createTextEnd(): TextEndPayload {
    return {
      type: "text:end",
      seq: this.seqCounter++,
      timestamp: Date.now(),
      text: this.accumulatedText,
      charCount: this.accumulatedText.length,
      wordCount: this.accumulatedText.split(/\s+/).filter(Boolean).length,
    };
  }

  /**
   * Create a reasoning delta event
   */
  private createReasoningDelta(delta: string): ReasoningDeltaPayload {
    return {
      type: "reasoning:delta",
      seq: this.seqCounter++,
      timestamp: Date.now(),
      delta,
    };
  }

  /**
   * Create a tool call event
   */
  private createToolCall(chunk: UnknownRecord): ToolCallPayload {
    return {
      type: "tool:call",
      seq: this.seqCounter++,
      timestamp: Date.now(),
      toolCallId: (chunk.toolCallId as string) || nanoid(),
      toolName: (chunk.toolName as string) || "unknown",
      args: (chunk.args || chunk.arguments || {}) as JsonObject,
      serverId: chunk.serverId as string | undefined,
    };
  }

  /**
   * Create a tool result event
   */
  private createToolResult(chunk: UnknownRecord): ToolResultPayload {
    const success = chunk.status !== "error" && !chunk.error;
    return {
      type: "tool:result",
      seq: this.seqCounter++,
      timestamp: Date.now(),
      toolCallId: (chunk.toolCallId as string) || "",
      toolName: (chunk.toolName as string) || "unknown",
      result: chunk.result as JsonObject,
      duration: (chunk.duration || chunk.executionTime || 0) as number,
      success,
      error: chunk.error as string | undefined,
      metadata: chunk.metadata as
        | { serverId?: string; cached?: boolean; fallback?: boolean }
        | undefined,
    };
  }

  /**
   * Create a step start event
   */
  private createStepStart(): StepStartPayload {
    return {
      type: "step:start",
      seq: this.seqCounter++,
      timestamp: Date.now(),
      stepNumber: this.stepNumber,
      maxSteps: this.config.maxSteps || 5,
      stepType: this.stepNumber === 1 ? "initial" : "tool-response",
    };
  }

  /**
   * Create a step end event
   */
  private createStepEnd(chunk: UnknownRecord): StepEndPayload {
    const finishReason = (chunk.finishReason || "stop") as FinishReason;
    const isContinued =
      finishReason === "tool-calls" &&
      this.stepNumber < (this.config.maxSteps || 5);

    return {
      type: "step:end",
      seq: this.seqCounter++,
      timestamp: Date.now(),
      stepNumber: this.stepNumber,
      finishReason,
      isContinued,
      usage: chunk.usage as TokenUsage | undefined,
      toolsCalled: (chunk.toolCalls as Array<{ toolName: string }>)?.map(
        (t) => t.toolName,
      ),
    };
  }

  /**
   * Create an error event
   */
  private createError(chunk: UnknownRecord): StreamEventPayload {
    const error = (chunk.error as UnknownRecord) || chunk;
    return {
      type: "error",
      seq: this.seqCounter++,
      timestamp: Date.now(),
      code: (error.code || "UNKNOWN_ERROR") as string,
      message: (error.message || "An unknown error occurred") as string,
      retriable: (error.retriable ?? true) as boolean,
      category: (error.category || "execution") as
        | "validation"
        | "execution"
        | "timeout"
        | "network"
        | "provider",
      context: error.context as UnknownRecord | undefined,
    };
  }

  /**
   * Get the current accumulated text
   */
  get currentText(): string {
    return this.accumulatedText;
  }

  /**
   * Get the current accumulated reasoning
   */
  get currentReasoning(): string {
    return this.accumulatedReasoning;
  }

  /**
   * Reset the emitter for reuse
   */
  reset(): void {
    this.seqCounter = 0;
    this.accumulatedText = "";
    this.accumulatedReasoning = "";
    this.stepNumber = 0;
    this.messageId = nanoid();
    this.generationId = nanoid();
  }
}
```

### Partial Object Streaming

Create new file: `/src/lib/streaming/PartialObjectStreamer.ts`

```typescript
/**
 * PartialObjectStreamer - Streams partial JSON objects during structured output
 */

import type {
  ObjectDeltaPayload,
  ObjectCompletePayload,
} from "../types/streamEventTypes.js";
import type { JsonValue } from "../types/common.js";
import { logger } from "../utils/logger.js";

/**
 * Configuration for partial object streaming
 */
export type PartialObjectStreamerConfig = {
  /** JSON Schema for validation */
  schema?: Record<string, unknown>;
  /** Emit events on partial parse failures */
  emitOnParseError?: boolean;
  /** Maximum buffer size before force-emit */
  maxBufferSize?: number;
};

/**
 * PartialObjectStreamer - Incrementally builds and validates JSON objects
 */
export class PartialObjectStreamer {
  private readonly config: PartialObjectStreamerConfig;
  private buffer: string = "";
  private seqCounter: number = 0;
  private currentPath: string = "";
  private partialObject: JsonValue | null = null;

  constructor(config: PartialObjectStreamerConfig = {}) {
    this.config = {
      emitOnParseError: false,
      maxBufferSize: 10000,
      ...config,
    };
  }

  /**
   * Process a JSON text delta and emit partial object events
   */
  processJsonDelta(delta: string): ObjectDeltaPayload | null {
    this.buffer += delta;

    // Try to parse partial JSON
    const parsed = this.tryPartialParse(this.buffer);

    if (parsed.success) {
      this.partialObject = parsed.value;
      this.currentPath = parsed.currentPath || "";

      return {
        type: "object:delta",
        seq: this.seqCounter++,
        timestamp: Date.now(),
        partialObject: parsed.value,
        currentPath: this.currentPath,
        jsonTextDelta: delta,
      };
    }

    // Check buffer overflow
    if (this.buffer.length > (this.config.maxBufferSize || 10000)) {
      logger.warn("Partial object buffer overflow, clearing buffer");
      this.buffer = "";
    }

    return null;
  }

  /**
   * Finalize the object and emit completion event
   */
  finalize(): ObjectCompletePayload | null {
    if (!this.partialObject) {
      return null;
    }

    const validation = this.validateObject(this.partialObject);

    const event: ObjectCompletePayload = {
      type: "object:complete",
      seq: this.seqCounter++,
      timestamp: Date.now(),
      object: this.partialObject,
      valid: validation.valid,
      validationErrors: validation.errors,
    };

    // Reset state
    this.reset();

    return event;
  }

  /**
   * Get the current partial object
   */
  get current(): JsonValue | null {
    return this.partialObject;
  }

  /**
   * Reset the streamer state
   */
  reset(): void {
    this.buffer = "";
    this.seqCounter = 0;
    this.currentPath = "";
    this.partialObject = null;
  }

  /**
   * Try to parse partial JSON with auto-closing
   */
  private tryPartialParse(json: string): {
    success: boolean;
    value?: JsonValue;
    currentPath?: string;
  } {
    // Try direct parse first
    try {
      const value = JSON.parse(json);
      return { success: true, value };
    } catch {
      // Try with auto-closing brackets
    }

    // Count open brackets/braces
    const openBraces = (json.match(/\{/g) || []).length;
    const closeBraces = (json.match(/\}/g) || []).length;
    const openBrackets = (json.match(/\[/g) || []).length;
    const closeBrackets = (json.match(/\]/g) || []).length;

    // Build closing sequence
    let closing = "";
    for (let i = 0; i < openBrackets - closeBrackets; i++) {
      closing = "]" + closing;
    }
    for (let i = 0; i < openBraces - closeBraces; i++) {
      closing = "}" + closing;
    }

    // Handle incomplete strings
    let adjustedJson = json;
    const inString = this.isInString(json);
    if (inString) {
      adjustedJson = json + '"';
    }

    // Handle trailing comma
    adjustedJson = adjustedJson.replace(/,\s*$/, "");

    try {
      const value = JSON.parse(adjustedJson + closing);
      const path = this.extractCurrentPath(json);
      return { success: true, value, currentPath: path };
    } catch {
      return { success: false };
    }
  }

  /**
   * Check if we're inside an unclosed string
   */
  private isInString(json: string): boolean {
    let inString = false;
    let escaped = false;

    for (const char of json) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
      }
    }

    return inString;
  }

  /**
   * Extract the current JSON path being built
   */
  private extractCurrentPath(json: string): string {
    const paths: string[] = [];
    const stack: string[] = [];
    let currentKey = "";
    let inString = false;
    let isKey = true;

    for (let i = 0; i < json.length; i++) {
      const char = json[i];

      if (char === '"' && json[i - 1] !== "\\") {
        if (inString) {
          if (isKey && json[i + 1] === ":") {
            currentKey = stack.pop() || "";
            paths.push(currentKey);
          }
        } else {
          stack.push("");
        }
        inString = !inString;
      } else if (inString) {
        stack[stack.length - 1] = (stack[stack.length - 1] || "") + char;
      } else if (char === "{" || char === "[") {
        isKey = char === "{";
      } else if (char === "}" || char === "]") {
        paths.pop();
        isKey = char === "}";
      } else if (char === ",") {
        isKey = true;
      } else if (char === ":") {
        isKey = false;
      }
    }

    return paths.join(".");
  }

  /**
   * Validate object against schema
   */
  private validateObject(obj: JsonValue): { valid: boolean; errors: string[] } {
    if (!this.config.schema) {
      return { valid: true, errors: [] };
    }

    // Simple validation - in production, use a proper JSON Schema validator
    const errors: string[] = [];
    const schema = this.config.schema;

    if (schema.type === "object" && typeof obj !== "object") {
      errors.push("Expected object type");
    }

    if (schema.required && Array.isArray(schema.required)) {
      for (const field of schema.required) {
        if (obj && typeof obj === "object" && !(field in obj)) {
          errors.push(`Missing required field: ${field}`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }
}
```

---

## Client Integration

### AsyncIterable Interface

The `MastraModelOutput` class implements the AsyncIterable interface for seamless consumption:

```typescript
// Basic consumption
const output = new MastraModelOutput(eventStream, config);

for await (const event of output) {
  switch (event.type) {
    case "text:delta":
      process.stdout.write(event.delta);
      break;
    case "tool:result":
      console.log(`Tool ${event.toolName}: ${JSON.stringify(event.result)}`);
      break;
    case "message:end":
      console.log(`\nFinished: ${event.finishReason}`);
      break;
  }
}

// Promise-based accessors
const text = await output.text();
const usage = await output.getUsage();
```

### Usage Tracking

```typescript
// Track usage during streaming
let runningUsage: TokenUsage = { input: 0, output: 0, total: 0 };

for await (const event of output) {
  if (event.type === "step:end" && event.usage) {
    runningUsage.input += event.usage.input;
    runningUsage.output += event.usage.output;
    runningUsage.total += event.usage.total;
  }
}

// Or wait for final usage
const finalUsage = await output.getUsage();
```

### HTTP Response Integration

```typescript
// Express.js endpoint
app.post("/api/chat", async (req, res) => {
  const output = await neurolink.streamEnhanced({
    input: { text: req.body.message },
    provider: "openai",
  });

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // Stream events
  for await (const event of output) {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  }

  res.write("data: [DONE]\n\n");
  res.end();
});
```

---

## Implementation Plan

### Phase 1: Core Types and Interfaces (Week 1)

1. **Create stream event types**
   - Add `/src/lib/types/streamEventTypes.ts`
   - Export from `/src/lib/types/index.ts`
   - Add type guards and utilities

2. **Update existing types**
   - Extend `StreamResult` with new event support
   - Add `FinishReason` type
   - Update `ToolExecutionEvent` to align with new events

### Phase 2: Stream Output Classes (Week 2)

1. **Implement MastraModelOutput**
   - Create `/src/lib/streaming/MastraModelOutput.ts`
   - Add iterator methods
   - Add promise-based accessors
   - Add conversion methods

2. **Implement StreamEventEmitter**
   - Create `/src/lib/streaming/StreamEventEmitter.ts`
   - Transform AI SDK streams
   - Handle all event types

3. **Implement PartialObjectStreamer**
   - Create `/src/lib/streaming/PartialObjectStreamer.ts`
   - Incremental JSON parsing
   - Schema validation

### Phase 3: Provider Integration (Week 3)

1. **Update BaseProvider**
   - Add `streamEnhanced()` method
   - Create event transformation pipeline
   - Support both legacy and enhanced streaming

2. **Update individual providers**
   - OpenAI: Map fullStream to events
   - Anthropic: Handle thinking tokens
   - Google AI: Handle reasoning events
   - Others: Basic event mapping

### Phase 4: Advanced Features (Week 4)

1. **Implement MastraAgentNetworkStream**
   - Create `/src/lib/streaming/MastraAgentNetworkStream.ts`
   - Agent switching events
   - Routing tracking

2. **Implement MastraWorkflowStream**
   - Create `/src/lib/streaming/MastraWorkflowStream.ts`
   - Step transition events
   - Parallel execution support

3. **NeuroLink SDK integration**
   - Add `streamEnhanced()` to NeuroLink class
   - Update CLI with enhanced streaming option
   - Add documentation

### Phase 5: Testing and Documentation (Week 5)

1. **Unit tests**
   - Test all event types
   - Test stream transformations
   - Test partial object parsing

2. **Integration tests**
   - Test with each provider
   - Test multi-step generation
   - Test tool execution

3. **Documentation**
   - Update SDK API reference
   - Add streaming guide
   - Add migration examples

---

## Migration Guide

### From Legacy StreamResult

**Before (Legacy):**

```typescript
const result = await neurolink.stream({
  input: { text: "Hello" },
});

for await (const chunk of result.stream) {
  if ("content" in chunk) {
    process.stdout.write(chunk.content);
  }
}
```

**After (Enhanced):**

```typescript
const output = await neurolink.streamEnhanced({
  input: { text: "Hello" },
});

// Option 1: Simple text streaming (compatible)
for await (const text of output.textStream()) {
  process.stdout.write(text);
}

// Option 2: Event-based streaming (enhanced)
for await (const event of output) {
  if (event.type === "text:delta") {
    process.stdout.write(event.delta);
  }
}

// Option 3: Convert to legacy format
const legacyResult = await output.toLegacyResult();
```

### Tool Event Migration

**Before:**

```typescript
result.toolEvents; // AsyncIterable<ToolExecutionEvent>
```

**After:**

```typescript
for await (const event of output) {
  if (event.type === "tool:call") {
    console.log(`Calling tool: ${event.toolName}`);
  }
  if (event.type === "tool:result") {
    console.log(`Tool result: ${JSON.stringify(event.result)}`);
  }
}
```

### Accessing Final Values

**Before:**

```typescript
// Wait for stream to complete by consuming it
let fullText = "";
for await (const chunk of result.stream) {
  if ("content" in chunk) {
    fullText += chunk.content;
  }
}
```

**After:**

```typescript
// Promise-based accessor
const fullText = await output.text();
const usage = await output.getUsage();
const finishReason = await output.getFinishReason();
```

---

## API Reference Summary

### Types

| Type                    | Description                     |
| ----------------------- | ------------------------------- |
| `StreamEventPayload`    | Union of all stream event types |
| `TextDeltaPayload`      | Text chunk event                |
| `ToolCallPayload`       | Tool call event                 |
| `ToolResultPayload`     | Tool result event               |
| `ReasoningDeltaPayload` | Extended thinking event         |
| `MessageStartPayload`   | Message start lifecycle event   |
| `MessageEndPayload`     | Message end lifecycle event     |
| `FinishReason`          | Generation completion reason    |

### Classes

| Class                      | Description                                            |
| -------------------------- | ------------------------------------------------------ |
| `MastraModelOutput`        | Enhanced stream wrapper with rich consumption patterns |
| `MastraAgentNetworkStream` | Multi-agent network stream handler                     |
| `MastraWorkflowStream`     | Workflow execution stream handler                      |
| `StreamEventEmitter`       | Transforms AI SDK streams to Mastra events             |
| `PartialObjectStreamer`    | Incremental JSON object streaming                      |

### Methods

| Method                           | Returns                             | Description              |
| -------------------------------- | ----------------------------------- | ------------------------ |
| `output[Symbol.asyncIterator]()` | `AsyncIterator<StreamEventPayload>` | Iterate all events       |
| `output.textStream()`            | `AsyncGenerator<string>`            | Stream text deltas only  |
| `output.text()`                  | `Promise<string>`                   | Wait for complete text   |
| `output.getUsage()`              | `Promise<TokenUsage>`               | Wait for usage data      |
| `output.getFinishReason()`       | `Promise<FinishReason>`             | Wait for finish reason   |
| `output.toResponse()`            | `Response`                          | Convert to SSE response  |
| `output.toLegacyResult()`        | `Promise<StreamResult>`             | Convert to legacy format |

---

## References

- **Current Stream Types**: `/src/lib/types/streamTypes.ts`
- **Stream Handler Module**: `/src/lib/core/modules/StreamHandler.ts`
- **Stream Analytics**: `/src/lib/core/streamAnalytics.ts`
- **OpenAI Provider Streaming**: `/src/lib/providers/openAI.ts`
- **BaseProvider**: `/src/lib/core/baseProvider.ts`
- **Tool Types**: `/src/lib/types/tools.ts`
