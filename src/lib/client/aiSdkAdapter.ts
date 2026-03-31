/**
 * Vercel AI SDK Compatibility Layer
 *
 * Provides compatibility with the Vercel AI SDK by implementing the
 * LanguageModelV1 interface. This allows NeuroLink to be used as a
 * drop-in replacement for other AI providers in AI SDK applications.
 *
 * @module @neurolink/ai-sdk
 */

import { logger } from "../utils/logger.js";
import type {
  // ClientConfig - not currently used but may be needed for future implementations
  LanguageModel,
  LanguageModelCallOptions,
  LanguageModelResponse,
  LanguageModelStreamResponse,
  NeuroLinkProviderOptions,
  ModelOptions,
} from "../types/clientTypes.js";
import { createClient, NeuroLinkClient } from "./httpClient.js";

// =============================================================================
// LanguageModel Implementation
// =============================================================================

/**
 * NeuroLink Language Model implementation compatible with Vercel AI SDK
 *
 * Implements the LanguageModelV1 interface for drop-in compatibility.
 *
 * @example Using with AI SDK
 * ```typescript
 * import { generateText } from 'ai';
 * import { createNeuroLinkModel } from '@neurolink/ai-sdk';
 *
 * const model = createNeuroLinkModel({
 *   baseUrl: 'https://api.neurolink.example.com',
 *   apiKey: 'your-api-key',
 * });
 *
 * const result = await generateText({
 *   model: model('gpt-4o'),
 *   prompt: 'Hello, world!',
 * });
 * ```
 */
export class NeuroLinkLanguageModel implements LanguageModel {
  readonly modelId: string;
  readonly provider: string;
  private client: NeuroLinkClient;
  private options: ModelOptions;

  constructor(
    client: NeuroLinkClient,
    modelId: string,
    provider: string,
    options: ModelOptions = {},
  ) {
    this.client = client;
    this.modelId = modelId;
    this.provider = provider;
    this.options = options;
  }

  /**
   * Generate a non-streaming response
   */
  async doGenerate(
    options: LanguageModelCallOptions,
  ): Promise<LanguageModelResponse> {
    const { prompt, system, messages, temperature, maxTokens, abortSignal } =
      options;

    // Build the input text from prompt or messages
    let inputText = prompt ?? "";
    if (messages && messages.length > 0) {
      inputText = messages
        .filter((m) => m.role !== "system")
        .map((m) => m.content)
        .join("\n");
    }

    // Extract system message if present
    const systemPrompt =
      system ?? messages?.find((m) => m.role === "system")?.content;

    try {
      const response = await this.client.generate(
        {
          input: { text: inputText },
          provider: this.provider,
          model: this.modelId,
          temperature: temperature ?? this.options.temperature,
          maxTokens: maxTokens ?? this.options.maxTokens,
          systemPrompt,
        },
        {
          signal: abortSignal,
        },
      );

      return {
        text: response.data.content,
        finishReason: this.mapFinishReason(response.data.finishReason),
        usage: {
          promptTokens: response.data.usage?.promptTokens ?? 0,
          completionTokens: response.data.usage?.completionTokens ?? 0,
        },
        rawResponse: response,
      };
    } catch (error) {
      return {
        text: "",
        finishReason: "error",
        usage: { promptTokens: 0, completionTokens: 0 },
        rawResponse: error,
      };
    }
  }

  /**
   * Generate a streaming response
   *
   * Uses an async queue so that each text delta from the provider is yielded
   * to the consumer immediately, rather than buffering the entire response.
   */
  async doStream(
    options: LanguageModelCallOptions,
  ): Promise<LanguageModelStreamResponse> {
    const { prompt, system, messages, temperature, maxTokens, abortSignal } =
      options;

    // Build the input text from prompt or messages
    let inputText = prompt ?? "";
    if (messages && messages.length > 0) {
      inputText = messages
        .filter((m) => m.role !== "system")
        .map((m) => m.content)
        .join("\n");
    }

    // Extract system message if present
    const systemPrompt =
      system ?? messages?.find((m) => m.role === "system")?.content;

    // ---- Async queue (push/pull pattern) ----
    type StreamChunk = {
      type: "text-delta" | "finish";
      textDelta?: string;
      finishReason?: string;
      usage?: { promptTokens: number; completionTokens: number };
    };

    const buffer: StreamChunk[] = [];
    let finished = false;
    let notifyConsumer: (() => void) | null = null;

    /** Resolves the consumer's pending pull, if any. */
    function wake(): void {
      if (notifyConsumer) {
        const fn = notifyConsumer;
        notifyConsumer = null;
        fn();
      }
    }

    /** Push a chunk into the queue and wake the consumer. */
    function push(chunk: StreamChunk): void {
      buffer.push(chunk);
      wake();
    }

    /** Signal that no more chunks will arrive. */
    function close(): void {
      finished = true;
      wake();
    }

    // Kick off the underlying stream in the background.
    // Errors are forwarded to the consumer via the queue.
    const self = this;
    const streamPromise = self.client
      .stream(
        {
          input: { text: inputText },
          provider: self.provider,
          model: self.modelId,
          temperature: temperature ?? self.options.temperature,
          maxTokens: maxTokens ?? self.options.maxTokens,
          systemPrompt,
        },
        {
          onText: (text) => {
            push({ type: "text-delta", textDelta: text });
          },
          onDone: (result) => {
            push({
              type: "finish",
              finishReason: self.mapFinishReason(result.finishReason),
              usage: result.usage
                ? {
                    promptTokens: result.usage.promptTokens,
                    completionTokens: result.usage.completionTokens,
                  }
                : undefined,
            });
            close();
          },
        },
        {
          signal: abortSignal,
        },
      )
      .catch(() => {
        // If the stream rejects before onDone fires, emit a finish/error.
        if (!finished) {
          push({ type: "finish", finishReason: "error" });
          close();
        }
      });

    // Suppress unhandled-rejection warnings; the consumer drains the queue.
    // Errors are pushed into the queue as finish events with error details.
    streamPromise.catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      push({
        type: "finish",
        finishReason: "error",
        usage: { promptTokens: 0, completionTokens: 0 },
      });
      close();
      logger.debug("[aiSdkAdapter] Stream promise rejected", {
        error: message,
      });
    });

    // ---- Async iterable that pulls from the queue ----
    async function* createStream(): AsyncIterable<StreamChunk> {
      while (true) {
        // Drain anything already buffered.
        while (buffer.length > 0) {
          const chunk = buffer.shift();
          if (!chunk) {
            break;
          }
          yield chunk;
          if (chunk.type === "finish") {
            return;
          }
        }

        // Nothing buffered — if the producer is done, exit.
        if (finished) {
          return;
        }

        // Wait for the producer to push more data.
        await new Promise<void>((resolve) => {
          notifyConsumer = resolve;
        });
      }
    }

    return {
      stream: createStream(),
    };
  }

  /**
   * Map NeuroLink finish reasons to AI SDK finish reasons
   */
  private mapFinishReason(
    reason?: string,
  ): LanguageModelResponse["finishReason"] {
    if (!reason) {
      return "stop";
    }

    const mapping: Record<string, LanguageModelResponse["finishReason"]> = {
      stop: "stop",
      length: "length",
      "tool-calls": "tool-calls",
      tool_calls: "tool-calls",
      "content-filter": "content-filter",
      content_filter: "content-filter",
      error: "error",
    };

    return mapping[reason] ?? "other";
  }
}

// =============================================================================
// Provider Factory
// =============================================================================

/**
 * NeuroLink Provider for Vercel AI SDK
 *
 * Creates model instances that are compatible with the Vercel AI SDK.
 *
 * @example
 * ```typescript
 * import { neurolink } from '@neurolink/ai-sdk';
 *
 * const provider = neurolink({
 *   baseUrl: 'https://api.neurolink.example.com',
 *   apiKey: 'your-api-key',
 * });
 *
 * // Create a model
 * const model = provider('gpt-4o');
 *
 * // Use with AI SDK
 * const result = await generateText({
 *   model,
 *   prompt: 'Hello!',
 * });
 * ```
 */
export class NeuroLinkProvider {
  private client: NeuroLinkClient;
  private defaultProvider: string;
  private defaultModel: string;

  constructor(options: NeuroLinkProviderOptions) {
    this.client = createClient({
      baseUrl: options.baseUrl,
      apiKey: options.apiKey,
      token: options.token,
      headers: options.headers,
    });
    this.defaultProvider = options.defaultProvider ?? "openai";
    this.defaultModel = options.defaultModel ?? "gpt-4o";
  }

  /**
   * Create a language model instance
   *
   * @param modelId - Model ID (e.g., 'gpt-4o', 'claude-3-opus')
   * @param options - Additional model options
   */
  model(modelId?: string, options?: ModelOptions): NeuroLinkLanguageModel {
    const model = modelId ?? this.defaultModel;
    const provider = options?.provider ?? this.inferProvider(model);

    return new NeuroLinkLanguageModel(this.client, model, provider, options);
  }

  /**
   * Alias for model() - makes the provider callable
   */
  call(modelId?: string, options?: ModelOptions): NeuroLinkLanguageModel {
    return this.model(modelId, options);
  }

  /**
   * Infer provider from model ID
   */
  private inferProvider(modelId: string): string {
    const providerPatterns: Record<string, RegExp[]> = {
      openai: [/^gpt-/, /^o1-/, /^o3-/, /^davinci/, /^curie/],
      anthropic: [/^claude-/],
      "google-ai": [/^gemini-/, /^palm-/],
      vertex: [/^gemini-/, /^palm-/, /^codechat-/],
      mistral: [/^mistral-/, /^codestral-/],
      bedrock: [/^anthropic\./, /^amazon\./],
      azure: [/^azure-/],
    };

    for (const [provider, patterns] of Object.entries(providerPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(modelId)) {
          return provider;
        }
      }
    }

    return this.defaultProvider;
  }

  /**
   * Get the underlying client
   */
  getClient(): NeuroLinkClient {
    return this.client;
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a NeuroLink provider for Vercel AI SDK
 *
 * @example
 * ```typescript
 * import { createNeuroLinkProvider, generateText } from '@neurolink/ai-sdk';
 *
 * const neurolink = createNeuroLinkProvider({
 *   baseUrl: 'https://api.neurolink.example.com',
 *   apiKey: process.env.NEUROLINK_API_KEY,
 * });
 *
 * const result = await generateText({
 *   model: neurolink('gpt-4o'),
 *   prompt: 'Hello!',
 * });
 * ```
 */
export function createNeuroLinkProvider(
  options: NeuroLinkProviderOptions,
): NeuroLinkProvider &
  ((modelId?: string, modelOptions?: ModelOptions) => NeuroLinkLanguageModel) {
  const provider = new NeuroLinkProvider(options);

  // Make the provider callable
  const callable = (modelId?: string, modelOptions?: ModelOptions) =>
    provider.model(modelId, modelOptions);

  // Copy all methods from provider to callable
  Object.setPrototypeOf(callable, provider);
  Object.assign(callable, {
    model: provider.model.bind(provider),
    call: provider.call.bind(provider),
    getClient: provider.getClient.bind(provider),
  });

  return callable as NeuroLinkProvider &
    ((modelId?: string, modelOptions?: ModelOptions) => NeuroLinkLanguageModel);
}

/**
 * Create a standalone NeuroLink model for Vercel AI SDK
 *
 * @example
 * ```typescript
 * import { createNeuroLinkModel, generateText } from '@neurolink/ai-sdk';
 *
 * const model = createNeuroLinkModel({
 *   baseUrl: 'https://api.neurolink.example.com',
 *   apiKey: process.env.NEUROLINK_API_KEY,
 *   modelId: 'gpt-4o',
 *   provider: 'openai',
 * });
 *
 * const result = await generateText({
 *   model,
 *   prompt: 'Hello!',
 * });
 * ```
 */
export function createNeuroLinkModel(
  options: NeuroLinkProviderOptions & {
    modelId: string;
    provider?: string;
  },
): NeuroLinkLanguageModel {
  const provider = createNeuroLinkProvider(options);
  return provider(options.modelId, { provider: options.provider });
}

// =============================================================================
// Convenience Exports
// =============================================================================

/**
 * Default export for easy provider creation
 *
 * @example
 * ```typescript
 * import { neurolink } from '@neurolink/ai-sdk';
 *
 * const provider = neurolink({
 *   baseUrl: 'https://api.neurolink.example.com',
 *   apiKey: 'your-key',
 * });
 *
 * const model = provider('gpt-4o');
 * ```
 */
export const neurolink = createNeuroLinkProvider;

// =============================================================================
// Streaming Utilities
// =============================================================================

/**
 * Create an AI SDK compatible streaming response from NeuroLink stream
 *
 * @example
 * ```typescript
 * // In a Next.js API route or server action
 * import { createStreamingResponse } from '@neurolink/ai-sdk';
 *
 * export async function POST(req: Request) {
 *   const { prompt } = await req.json();
 *
 *   const stream = await createStreamingResponse({
 *     baseUrl: process.env.NEUROLINK_URL,
 *     apiKey: process.env.NEUROLINK_API_KEY,
 *     input: { text: prompt },
 *     provider: 'openai',
 *     model: 'gpt-4o',
 *   });
 *
 *   return stream;
 * }
 * ```
 */
export async function createStreamingResponse(
  options: NeuroLinkProviderOptions & {
    input: { text: string };
    model: string;
    provider?: string;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
  },
): Promise<Response> {
  const client = createClient({
    baseUrl: options.baseUrl,
    apiKey: options.apiKey,
    token: options.token,
    headers: options.headers,
  });

  // Create a ReadableStream for the response
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        await client.stream(
          {
            input: options.input,
            provider: options.provider ?? "openai",
            model: options.model,
            temperature: options.temperature,
            maxTokens: options.maxTokens,
            systemPrompt: options.systemPrompt,
          },
          {
            onText: (text) => {
              // AI SDK format: stream text deltas
              const data = JSON.stringify({
                type: "text-delta",
                textDelta: text,
              });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            },
            onToolCall: (toolCall) => {
              const data = JSON.stringify({ type: "tool-call", toolCall });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            },
            onToolResult: (toolResult) => {
              const data = JSON.stringify({ type: "tool-result", toolResult });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            },
            onDone: (result) => {
              const data = JSON.stringify({
                type: "finish",
                finishReason: result.finishReason ?? "stop",
                usage: result.usage,
              });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
            },
            onError: (error) => {
              const data = JSON.stringify({ type: "error", error });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              controller.close();
            },
          },
        );
      } catch (error) {
        const data = JSON.stringify({
          type: "error",
          error: { message: (error as Error).message },
        });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
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
}

// =============================================================================
// Type Re-exports
// =============================================================================

// Re-export types from ./types.js for convenience
// Note: NeuroLinkProviderOptions and ModelOptions are defined and exported above
export type {
  LanguageModel,
  LanguageModelCallOptions,
  LanguageModelResponse,
  LanguageModelStreamResponse,
  NeuroLinkProviderOptions,
  ModelOptions,
} from "../types/clientTypes.js";
