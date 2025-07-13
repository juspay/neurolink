/**
 * Anthropic AI Provider (Direct API)
 *
 * Direct integration with Anthropic's Claude models via their native API.
 * Supports Claude 3.5 Sonnet, Claude 3.5 Haiku, and Claude 3 Opus.
 */

import type {
  AIProvider,
  TextGenerationOptions,
  EnhancedGenerateResult,
} from "../core/types.js";
import type { ZodType, ZodTypeDef } from "zod";
import type { Schema } from "ai";
import type { GenerateResult } from "../types/generate-types.js";
import type { StreamOptions, StreamResult } from "../types/stream-types.js";
import { AIProviderName } from "../core/types.js";
import { logger } from "../utils/logger.js";
import {
  createTimeoutController,
  TimeoutError,
  getDefaultTimeout,
} from "../utils/timeout.js";
import { DEFAULT_MAX_TOKENS } from "../core/constants.js";
import { evaluateResponse } from "../core/evaluation.js";
import { createAnalytics } from "../core/analytics.js";
import { createProxyFetch } from "../proxy/proxy-fetch.js";

// Anthropic-specific types
interface AnthropicMessage {
  role: "user" | "assistant";
  content: string;
}

interface AnthropicResponse {
  id: string;
  type: "message";
  role: "assistant";
  content: Array<{
    type: "text";
    text: string;
  }>;
  model: string;
  stop_reason: "end_turn" | "max_tokens" | "stop_sequence";
  stop_sequence?: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

interface AnthropicStreamChunk {
  type:
    | "message_start"
    | "content_block_start"
    | "content_block_delta"
    | "content_block_stop"
    | "message_delta"
    | "message_stop";
  message?: Partial<AnthropicResponse>;
  content_block?: {
    type: "text";
    text: string;
  };
  delta?: {
    type: "text_delta";
    text: string;
  };
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

interface AnthropicRequestBody {
  model: string;
  max_tokens: number;
  messages: AnthropicMessage[];
  temperature?: number;
  system?: string;
  stream?: boolean;
}

// Declare process for TypeScript
declare const process: {
  env: {
    ANTHROPIC_API_KEY?: string;
    ANTHROPIC_BASE_URL?: string;
    ANTHROPIC_MODEL?: string;
  };
};

export class AnthropicProvider implements AIProvider {
  readonly name: AIProviderName = AIProviderName.ANTHROPIC;
  private apiKey: string;
  private baseURL: string;
  private defaultModel: string;

  constructor() {
    this.apiKey = this.getApiKey();
    this.baseURL =
      process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com";
    this.defaultModel =
      process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022";

    logger.debug(
      `[AnthropicProvider] Initialized with model: ${this.defaultModel}`,
    );
  }

  private getApiKey(): string {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is required");
    }
    return apiKey;
  }

  private getModel(): string {
    return this.defaultModel;
  }

  private async makeRequest(
    endpoint: string,
    body: any,
    stream: boolean = false,
    signal?: AbortSignal,
  ): Promise<Response> {
    const url = `${this.baseURL}/v1/${endpoint}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-api-key": this.apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true", // Required for browser usage
    };

    logger.debug(
      `[AnthropicProvider.makeRequest] ${stream ? "Streaming" : "Non-streaming"} request to ${url}`,
    );
    logger.debug(
      `[AnthropicProvider.makeRequest] Model: ${body.model}, Max tokens: ${body.max_tokens}`,
    );

    const proxyFetch = createProxyFetch();
    const response = await proxyFetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal, // Add abort signal for timeout support
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(
        `[AnthropicProvider.makeRequest] API error ${response.status}: ${errorText}`,
      );
      throw new Error(`Anthropic API error ${response.status}: ${errorText}`);
    }

    return response;
  }

  /**
   * PRIMARY METHOD: Stream content using AI (recommended for new code)
   * Future-ready for multi-modal capabilities with current text focus
   */
  async stream(
    optionsOrPrompt: StreamOptions | string,
    analysisSchema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>,
  ): Promise<StreamResult> {
    const functionTag = "AnthropicProvider.stream";
    const provider = "anthropic";
    const startTime = Date.now();

    logger.debug(`[${functionTag}] Starting content streaming`);

    // Parse parameters - support both string and options object
    const options =
      typeof optionsOrPrompt === "string"
        ? { input: { text: optionsOrPrompt } }
        : optionsOrPrompt;

    // Validate input
    if (
      !options?.input?.text ||
      typeof options.input.text !== "string" ||
      options.input.text.trim() === ""
    ) {
      throw new Error(
        "Stream options must include input.text as a non-empty string",
      );
    }

    // Extract parameters
    const {
      prompt = options.input.text,
      temperature = 0.7,
      maxTokens = DEFAULT_MAX_TOKENS,
      systemPrompt = "You are Claude, an AI assistant created by Anthropic. You are helpful, harmless, and honest.",
      timeout = getDefaultTimeout(provider, "stream"),
    } = options as any;

    logger.debug(
      `[${functionTag}] Streaming prompt: "${prompt.substring(0, 100)}...", Timeout: ${timeout}`,
    );

    // Create timeout controller if timeout is specified
    const timeoutController = createTimeoutController(
      timeout,
      provider,
      "stream",
    );

    try {
      const body = {
        model: this.getModel(),
        max_tokens: maxTokens,
        messages: [
          ...(systemPrompt
            ? [{ role: "assistant", content: systemPrompt }]
            : []),
          { role: "user", content: prompt },
        ],
        temperature,
        stream: true,
      };

      const response = await this.makeRequest(
        "messages",
        body,
        true,
        timeoutController?.controller.signal,
      );

      const streamIterable = this.createAsyncIterable(
        response.body!,
        timeoutController?.controller.signal,
      );

      // Clean up timeout controller
      timeoutController?.cleanup();

      logger.debug(`[${functionTag}] Stream initialized successfully`);

      // Convert to StreamResult format
      return {
        stream: (async function* () {
          for await (const chunk of streamIterable) {
            yield { content: chunk };
          }
        })(),
        provider: "anthropic",
        model: this.getModel(),
        metadata: {
          streamId: `anthropic-${Date.now()}`,
          startTime,
        },
      };
    } catch (error: any) {
      // Always cleanup timeout on error
      timeoutController?.cleanup();

      if (error.name === "AbortError" || error.message.includes("timeout")) {
        const timeoutError = new TimeoutError(
          `${provider} stream operation timed out after ${timeout}`,
          timeoutController?.timeoutMs || 0,
          provider,
          "stream",
        );
        logger.error(`[${functionTag}] Timeout error`, {
          provider,
          timeout: timeoutController?.timeoutMs,
          message: timeoutError.message,
        });
        throw timeoutError;
      } else {
        logger.error(`[${functionTag}] Error:`, error);
      }
      throw error;
    }
  }

  async generate(
    optionsOrPrompt: TextGenerationOptions | string,
    schema?: any,
  ): Promise<any> {
    const functionTag = "AnthropicProvider.generate";
    const provider = "anthropic";
    const startTime = Date.now();

    logger.debug(`[${functionTag}] Starting text generation`);

    // Parse parameters with backward compatibility
    const options =
      typeof optionsOrPrompt === "string"
        ? { prompt: optionsOrPrompt }
        : optionsOrPrompt;

    const {
      prompt,
      temperature = 0.7,
      maxTokens = DEFAULT_MAX_TOKENS,
      systemPrompt = "You are Claude, an AI assistant created by Anthropic. You are helpful, harmless, and honest.",
      timeout = getDefaultTimeout(provider, "generate"),
      enableAnalytics = false,
      enableEvaluation = false,
      context,
    } = options;

    logger.debug(
      `[${functionTag}] Prompt: "${prompt.substring(0, 100)}...", Temperature: ${temperature}, Max tokens: ${maxTokens}, Timeout: ${timeout}`,
    );

    const requestBody: AnthropicRequestBody = {
      model: this.getModel(),
      max_tokens: maxTokens,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature,
      system: systemPrompt,
    };

    // Create timeout controller if timeout is specified
    const timeoutController = createTimeoutController(
      timeout,
      provider,
      "generate",
    );

    try {
      const response = await this.makeRequest(
        "messages",
        requestBody,
        false,
        timeoutController?.controller.signal,
      );
      const data: AnthropicResponse = await response.json();

      // Clean up timeout if successful
      timeoutController?.cleanup();

      logger.debug(
        `[${functionTag}] Success. Generated ${data.usage.output_tokens} tokens`,
      );

      const content = data.content.map((block) => block.text).join("");

      const result: any = {
        content,
        provider: this.name,
        model: data.model,
        usage: {
          promptTokens: data.usage.input_tokens,
          completionTokens: data.usage.output_tokens,
          totalTokens: data.usage.input_tokens + data.usage.output_tokens,
        },
        finishReason: data.stop_reason,
      };

      // Add analytics if enabled
      if (options.enableAnalytics) {
        result.analytics = createAnalytics(
          provider,
          this.defaultModel,
          result,
          Date.now() - startTime,
          options.context,
        );
      }

      // Add evaluation if enabled
      if (options.enableEvaluation) {
        result.evaluation = await evaluateResponse(
          prompt,
          result.content,
          options.context,
        );
      }

      return result;
    } catch (error) {
      // Always cleanup timeout
      timeoutController?.cleanup();

      // Log timeout errors specifically
      if (error instanceof TimeoutError) {
        logger.error(`[${functionTag}] Timeout error`, {
          provider,
          timeout: error.timeout,
          message: error.message,
        });
      } else if ((error as any)?.name === "AbortError") {
        // Convert AbortError to TimeoutError
        const timeoutError = new TimeoutError(
          `${provider} generate operation timed out after ${timeout}`,
          timeoutController?.timeoutMs || 0,
          provider,
          "generate",
        );
        logger.error(`[${functionTag}] Timeout error`, {
          provider,
          timeout: timeoutController?.timeoutMs,
          message: timeoutError.message,
        });
        throw timeoutError;
      } else {
        logger.error(`[${functionTag}] Error:`, error);
      }
      throw error;
    }
  }

  /**
   * LEGACY METHOD: Use stream() instead for new code
   * @deprecated Use stream() method instead
   */

  private async *createAsyncIterable(
    body: ReadableStream<Uint8Array>,
    signal?: AbortSignal,
  ): AsyncGenerator<string, void, unknown> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        // Check if aborted
        if (signal?.aborted) {
          throw new Error("AbortError");
        }

        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.trim() === "") {
            continue;
          }
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data.trim() === "[DONE]") {
              continue;
            }

            try {
              const chunk: AnthropicStreamChunk = JSON.parse(data);

              // Extract text content from different chunk types
              if (chunk.type === "content_block_delta" && chunk.delta?.text) {
                yield chunk.delta.text;
              }
            } catch (parseError) {
              logger.warn(
                "[AnthropicProvider.createAsyncIterable] Failed to parse chunk:",
                parseError,
              );
              continue;
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async testConnection(): Promise<{
    success: boolean;
    error?: string;
    responseTime?: number;
  }> {
    logger.debug(
      "[AnthropicProvider.testConnection] Testing connection to Anthropic API",
    );

    const startTime = Date.now();

    try {
      await this.generate({
        prompt: "Hello",
        maxTokens: 5,
      });

      const responseTime = Date.now() - startTime;
      logger.debug(
        `[AnthropicProvider.testConnection] Connection test successful (${responseTime}ms)`,
      );

      return {
        success: true,
        responseTime,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      logger.error(
        `[AnthropicProvider.testConnection] Connection test failed (${responseTime}ms):`,
        error,
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        responseTime,
      };
    }
  }

  isConfigured(): boolean {
    try {
      this.getApiKey();
      return true;
    } catch {
      return false;
    }
  }

  getRequiredConfig(): string[] {
    return ["ANTHROPIC_API_KEY"];
  }

  getOptionalConfig(): string[] {
    return ["ANTHROPIC_MODEL", "ANTHROPIC_BASE_URL"];
  }

  getModels(): string[] {
    return [
      "claude-3-5-sonnet-20241022",
      "claude-3-5-haiku-20241022",
      "claude-3-opus-20240229",
      "claude-3-sonnet-20240229",
      "claude-3-haiku-20240307",
    ];
  }

  supportsStreaming(): boolean {
    return true;
  }

  supportsSchema(): boolean {
    return false; // Anthropic doesn't have native JSON schema support like OpenAI
  }

  getCapabilities(): string[] {
    return [
      "text-generation",
      "streaming",
      "conversation",
      "system-prompts",
      "long-context", // Claude models support up to 200k tokens
    ];
  }

  /**
   * Short alias for generate() - CLI-SDK consistency
   */
  async gen(
    optionsOrPrompt: TextGenerationOptions | string,
    analysisSchema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>,
  ): Promise<EnhancedGenerateResult | null> {
    return this.generate(optionsOrPrompt, analysisSchema);
  }
}
