/**
 * Anthropic AI Provider (Direct API)
 *
 * Direct integration with Anthropic's Claude models via their native API.
 * Supports Claude 3.5 Sonnet, Claude 3.5 Haiku, and Claude 3 Opus.
 */

import type {
  AIProvider,
  TextGenerationOptions,
  StreamTextOptions,
} from "../core/types.js";
import { AIProviderName } from "../core/types.js";
import { logger } from "../utils/logger.js";

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

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
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

  async generateText(
    optionsOrPrompt: TextGenerationOptions | string,
    schema?: any,
  ): Promise<any> {
    logger.debug("[AnthropicProvider.generateText] Starting text generation");

    // Parse parameters with backward compatibility
    const options =
      typeof optionsOrPrompt === "string"
        ? { prompt: optionsOrPrompt }
        : optionsOrPrompt;

    const {
      prompt,
      temperature = 0.7,
      maxTokens = 500,
      systemPrompt = "You are Claude, an AI assistant created by Anthropic. You are helpful, harmless, and honest.",
    } = options;

    logger.debug(
      `[AnthropicProvider.generateText] Prompt: "${prompt.substring(0, 100)}...", Temperature: ${temperature}, Max tokens: ${maxTokens}`,
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

    try {
      const response = await this.makeRequest("messages", requestBody);
      const data: AnthropicResponse = await response.json();

      logger.debug(
        `[AnthropicProvider.generateText] Success. Generated ${data.usage.output_tokens} tokens`,
      );

      const content = data.content.map((block) => block.text).join("");

      return {
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
    } catch (error) {
      logger.error("[AnthropicProvider.generateText] Error:", error);
      throw error;
    }
  }

  async streamText(
    optionsOrPrompt: StreamTextOptions | string,
    schema?: any,
  ): Promise<any> {
    logger.debug("[AnthropicProvider.streamText] Starting text streaming");

    // Parse parameters with backward compatibility
    const options =
      typeof optionsOrPrompt === "string"
        ? { prompt: optionsOrPrompt }
        : optionsOrPrompt;

    const {
      prompt,
      temperature = 0.7,
      maxTokens = 500,
      systemPrompt = "You are Claude, an AI assistant created by Anthropic. You are helpful, harmless, and honest.",
    } = options;

    logger.debug(
      `[AnthropicProvider.streamText] Streaming prompt: "${prompt.substring(0, 100)}..."`,
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
      stream: true,
    };

    try {
      const response = await this.makeRequest("messages", requestBody, true);

      if (!response.body) {
        throw new Error("No response body received");
      }

      // Return a StreamTextResult-like object
      return {
        textStream: this.createAsyncIterable(response.body),
        text: "",
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        finishReason: "end_turn",
      };
    } catch (error) {
      logger.error("[AnthropicProvider.streamText] Error:", error);
      throw error;
    }
  }

  private async *createAsyncIterable(
    body: ReadableStream<Uint8Array>,
  ): AsyncGenerator<string, void, unknown> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
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

  async *generateTextStream(
    optionsOrPrompt: StreamTextOptions | string,
  ): AsyncGenerator<any, void, unknown> {
    logger.debug(
      "[AnthropicProvider.generateTextStream] Starting text streaming",
    );

    // Parse parameters with backward compatibility
    const options =
      typeof optionsOrPrompt === "string"
        ? { prompt: optionsOrPrompt }
        : optionsOrPrompt;

    const {
      prompt,
      temperature = 0.7,
      maxTokens = 500,
      systemPrompt = "You are Claude, an AI assistant created by Anthropic. You are helpful, harmless, and honest.",
    } = options;

    logger.debug(
      `[AnthropicProvider.generateTextStream] Streaming prompt: "${prompt.substring(0, 100)}..."`,
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
      stream: true,
    };

    try {
      const response = await this.makeRequest("messages", requestBody, true);

      if (!response.body) {
        throw new Error("No response body received");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
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
                  yield {
                    content: chunk.delta.text,
                    provider: this.name,
                    model: this.getModel(),
                  };
                }
              } catch (parseError) {
                logger.warn(
                  "[AnthropicProvider.generateTextStream] Failed to parse chunk:",
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

      logger.debug(
        "[AnthropicProvider.generateTextStream] Streaming completed",
      );
    } catch (error) {
      logger.error("[AnthropicProvider.generateTextStream] Error:", error);
      throw error;
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
      await this.generateText({
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
}
