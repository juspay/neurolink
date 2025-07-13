/**
 * Ollama Provider for NeuroLink
 *
 * Local AI model deployment and management using Ollama.
 * Provides offline AI capabilities with local model hosting.
 *
 * Features:
 * - Local model deployment (privacy-first)
 * - Model management (download, list, remove)
 * - Health checking and service validation
 * - Streaming and non-streaming text generation
 */

import type {
  AIProvider,
  TextGenerationOptions,
  EnhancedGenerateResult,
} from "../core/types.js";
import type {
  LanguageModelV1,
  LanguageModelV1CallOptions,
  LanguageModelV1StreamPart,
} from "ai";
import { streamText, generateText, Output } from "ai";
import type { GenerateResult } from "../types/generate-types.js";
import type { StreamOptions, StreamResult } from "../types/stream-types.js";
import type { ZodType, ZodTypeDef } from "zod";
import type { Schema } from "ai";
import { logger } from "../utils/logger.js";
import { getDefaultTimeout, TimeoutError } from "../utils/timeout.js";
import { DEFAULT_MAX_TOKENS } from "../core/constants.js";
import { evaluateResponse } from "../core/evaluation.js";

// Default system context
const DEFAULT_SYSTEM_CONTEXT = {
  systemPrompt: "You are a helpful AI assistant.",
};

// Declare process for TypeScript
declare const process: {
  env: {
    OLLAMA_BASE_URL?: string;
    OLLAMA_MODEL?: string;
    OLLAMA_TIMEOUT?: string;
  };
};

/**
 * Ollama API Response Interfaces
 */
interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
}

interface OllamaListResponse {
  models: OllamaModel[];
}

interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  system?: string;
  temperature?: number;
  max_tokens?: number;
  options?: {
    temperature?: number;
    num_predict?: number;
    top_k?: number;
    top_p?: number;
  };
}

// Custom LanguageModelV1 implementation for Ollama
class OllamaLanguageModel implements LanguageModelV1 {
  readonly specificationVersion = "v1";
  readonly provider = "ollama";
  readonly modelId: string;
  readonly maxTokens?: number;
  readonly supportsStreaming = true;
  readonly defaultObjectGenerationMode = "json" as const;

  private baseUrl: string;
  private timeout: number;

  constructor(modelId: string, baseUrl: string, timeout: number) {
    this.modelId = modelId;
    this.baseUrl = baseUrl;
    this.timeout = timeout;
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4); // Rough estimation: 4 characters per token
  }

  private convertMessagesToPrompt(messages: any[]): string {
    return messages
      .map((msg) => {
        if (typeof msg.content === "string") {
          return `${msg.role}: ${msg.content}`;
        } else if (Array.isArray(msg.content)) {
          // Handle multi-part content (text, images, etc.)
          return `${msg.role}: ${msg.content
            .filter((part: any) => part.type === "text")
            .map((part: any) => part.text)
            .join(" ")}`;
        }
        return "";
      })
      .join("\n");
  }

  private async checkHealth(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: "GET",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  private async ensureModelAvailable(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) {
        throw new Error("Cannot access Ollama");
      }

      const data = (await response.json()) as OllamaListResponse;
      const models = data.models?.map((m) => m.name) || [];

      if (!models.includes(this.modelId)) {
        // Try to pull the model
        const pullResponse = await fetch(`${this.baseUrl}/api/pull`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: this.modelId }),
        });

        if (!pullResponse.ok) {
          throw new Error(
            `Model '${this.modelId}' not available and cannot be pulled`,
          );
        }
      }
    } catch (error) {
      throw new Error(
        `Failed to ensure model availability: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async doGenerate(options: LanguageModelV1CallOptions) {
    // Health check and model availability
    const isHealthy = await this.checkHealth();
    if (!isHealthy) {
      throw new Error(
        "Ollama service is not running or accessible. Please ensure Ollama is installed and running.",
      );
    }

    await this.ensureModelAvailable();

    const prompt = this.convertMessagesToPrompt(options.prompt);

    const requestPayload: OllamaGenerateRequest = {
      model: this.modelId,
      prompt,
      stream: false,
      options: {
        temperature: options.temperature || 0.7,
        num_predict: options.maxTokens ?? DEFAULT_MAX_TOKENS,
      },
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          const errorData = await response.json();
          if (errorData.error && errorData.error.includes("not found")) {
            throw new Error(
              `Model '${this.modelId}' not found. Please run 'ollama pull ${this.modelId}'`,
            );
          }
        }
        throw new Error(
          `Ollama API error: ${response.status} ${response.statusText}`,
        );
      }

      const data = (await response.json()) as OllamaGenerateResponse;

      if (!data.response) {
        throw new Error("No response received from Ollama");
      }

      const promptTokens = this.estimateTokens(prompt);
      const completionTokens = this.estimateTokens(data.response);

      return {
        text: data.response,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
        },
        finishReason: "stop" as const,
        logprobs: undefined,
        rawCall: { rawPrompt: prompt, rawSettings: options },
        rawResponse: { headers: {} },
      };
    } catch (error) {
      clearTimeout(timeoutId);

      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (
        errorMessage.includes("AbortError") ||
        errorMessage.includes("timeout")
      ) {
        throw new Error(
          `Ollama request timeout (${this.timeout}ms). The model may be large or the system is under load.`,
        );
      }

      if (
        errorMessage.includes("ECONNREFUSED") ||
        errorMessage.includes("fetch failed")
      ) {
        throw new Error(
          "Cannot connect to Ollama service. Please ensure Ollama is installed and running on " +
            this.baseUrl,
        );
      }

      throw error;
    }
  }

  async doStream(options: LanguageModelV1CallOptions) {
    // Health check and model availability
    const isHealthy = await this.checkHealth();
    if (!isHealthy) {
      throw new Error(
        "Ollama service is not running or accessible. Please ensure Ollama is installed and running.",
      );
    }

    await this.ensureModelAvailable();

    const prompt = this.convertMessagesToPrompt(options.prompt);

    const requestPayload: OllamaGenerateRequest = {
      model: this.modelId,
      prompt,
      stream: true,
      options: {
        temperature: options.temperature || 0.7,
        num_predict: options.maxTokens ?? DEFAULT_MAX_TOKENS,
      },
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          const errorData = await response.json();
          if (errorData.error && errorData.error.includes("not found")) {
            throw new Error(
              `Model '${this.modelId}' not found. Please run 'ollama pull ${this.modelId}'`,
            );
          }
        }
        throw new Error(
          `Ollama API error: ${response.status} ${response.statusText}`,
        );
      }

      if (!response.body) {
        throw new Error("No response body received from Ollama streaming API");
      }

      // Create a ReadableStream that parses Ollama's streaming format
      const stream = new ReadableStream<LanguageModelV1StreamPart>({
        async start(controller) {
          const reader = response.body!.getReader();
          const decoder = new TextDecoder();
          let totalTokens = 0;

          try {
            while (true) {
              const { done, value } = await reader.read();

              if (done) {
                break;
              }

              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split("\n").filter((line) => line.trim());

              for (const line of lines) {
                try {
                  const data = JSON.parse(line) as OllamaGenerateResponse;

                  if (data.response) {
                    controller.enqueue({
                      type: "text-delta",
                      textDelta: data.response,
                    });
                    totalTokens += Math.ceil(data.response.length / 4);
                  }

                  if (data.done) {
                    controller.enqueue({
                      type: "finish",
                      finishReason: "stop",
                      usage: {
                        promptTokens:
                          data.prompt_eval_count ||
                          Math.ceil(prompt.length / 4),
                        completionTokens: data.eval_count || totalTokens,
                      },
                      logprobs: undefined,
                    });
                    controller.close();
                    return;
                  }
                } catch (parseError) {
                  // Skip invalid JSON lines
                }
              }
            }
          } finally {
            reader.releaseLock();
          }
        },
      });

      return {
        stream,
        rawCall: { rawPrompt: prompt, rawSettings: options },
        rawResponse: { headers: {} },
      };
    } catch (error) {
      clearTimeout(timeoutId);

      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (
        errorMessage.includes("AbortError") ||
        errorMessage.includes("timeout")
      ) {
        throw new Error(
          `Ollama streaming timeout (${this.timeout}ms). The model may be large or the system is under load.`,
        );
      }

      if (
        errorMessage.includes("ECONNREFUSED") ||
        errorMessage.includes("fetch failed")
      ) {
        throw new Error(
          "Cannot connect to Ollama service. Please ensure Ollama is installed and running on " +
            this.baseUrl,
        );
      }

      throw error;
    }
  }
}

export class Ollama implements AIProvider {
  private baseUrl: string;
  private modelName: string;
  private defaultTimeout: number;

  constructor(modelName?: string) {
    this.baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
    this.modelName = modelName || process.env.OLLAMA_MODEL || "llama2";
    // Use environment variable for backward compatibility, but convert to format used by other providers
    const envTimeout = process.env.OLLAMA_TIMEOUT
      ? parseInt(process.env.OLLAMA_TIMEOUT)
      : undefined;
    this.defaultTimeout =
      envTimeout ||
      parseInt(getDefaultTimeout("ollama", "generate").replace(/[^\d]/g, ""));

    logger.debug("[Ollama] Initialized", {
      baseUrl: this.baseUrl,
      modelName: this.modelName,
      defaultTimeout: this.defaultTimeout,
    });
  }

  /**
   * Gets the appropriate model instance
   * @private
   */
  private getModel(timeout?: number): LanguageModelV1 {
    logger.debug("Ollama.getModel - Ollama model selected", {
      modelName: this.modelName,
      timeout: timeout || this.defaultTimeout,
    });

    return new OllamaLanguageModel(
      this.modelName,
      this.baseUrl,
      timeout || this.defaultTimeout,
    );
  }

  /**
   * Health check - verify Ollama service is running and accessible
   */
  async checkHealth(): Promise<boolean> {
    const model = new OllamaLanguageModel(
      this.modelName,
      this.baseUrl,
      this.defaultTimeout,
    );
    return await model["checkHealth"]();
  }

  /**
   * List available models on the Ollama instance
   */
  async listModels(): Promise<string[]> {
    const functionTag = "Ollama.listModels";

    try {
      logger.debug(`[${functionTag}] Listing available models`);

      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to list models: ${response.status} ${response.statusText}`,
        );
      }

      const data = (await response.json()) as OllamaListResponse;
      const modelNames = data.models?.map((model) => model.name) || [];

      logger.debug(`[${functionTag}] Found models`, {
        count: modelNames.length,
        models: modelNames,
      });

      return modelNames;
    } catch (error) {
      logger.debug(`[${functionTag}] Error listing models`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(
        `Failed to list Ollama models: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Check if a specific model is available
   */
  async isModelAvailable(modelName: string): Promise<boolean> {
    try {
      const models = await this.listModels();
      return models.includes(modelName);
    } catch (error) {
      return false;
    }
  }

  /**
   * Pull/download a model to the local Ollama instance
   */
  async pullModel(modelName: string): Promise<void> {
    const functionTag = "Ollama.pullModel";

    try {
      logger.debug(`[${functionTag}] Pulling model`, { modelName });

      const response = await fetch(`${this.baseUrl}/api/pull`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: modelName,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to pull model: ${response.status} ${response.statusText}`,
        );
      }

      // Note: Ollama pull API returns streaming responses
      // For simplicity, we're not handling the streaming progress here
      logger.debug(`[${functionTag}] Model pull completed`, { modelName });
    } catch (error) {
      logger.debug(`[${functionTag}] Error pulling model`, {
        modelName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(
        `Failed to pull model '${modelName}': ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * PRIMARY METHOD: Stream content using AI (recommended for new code)
   * Future-ready for multi-modal capabilities with current text focus
   */
  async stream(
    optionsOrPrompt: StreamOptions | string,
    analysisSchema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>,
  ): Promise<StreamResult> {
    const functionTag = "Ollama.stream";
    const provider = "ollama";
    let chunkCount = 0;
    const startTime = Date.now();

    try {
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
        systemPrompt = DEFAULT_SYSTEM_CONTEXT.systemPrompt,
        schema,
        timeout,
      } = options as any;

      // Use schema from options or fallback parameter
      const finalSchema = schema || analysisSchema;

      // Convert timeout to milliseconds if provided as string
      const timeoutMs = timeout
        ? typeof timeout === "string"
          ? parseInt(
              getDefaultTimeout("ollama", "stream").replace(/[^\d]/g, ""),
            )
          : timeout
        : this.defaultTimeout;

      logger.debug(`[${functionTag}] Stream request started`, {
        provider,
        modelName: this.modelName,
        promptLength: prompt.length,
        temperature,
        maxTokens,
        hasSchema: !!finalSchema,
        timeout: timeoutMs,
      });

      const model = this.getModel(timeoutMs);

      const streamOptions = {
        model: model,
        prompt: prompt,
        system: systemPrompt,
        temperature,
        maxTokens,

        onError: (event: { error: unknown }) => {
          const error = event.error;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          const errorStack = error instanceof Error ? error.stack : undefined;

          logger.debug(`[${functionTag}] Stream error`, {
            provider,
            modelName: this.modelName,
            error: errorMessage,
            stack: errorStack,
            promptLength: prompt.length,
            chunkCount,
          });
        },

        onFinish: (event: {
          finishReason: string;
          usage: Record<string, unknown>;
          text?: string;
        }) => {
          logger.debug(`[${functionTag}] Stream finished`, {
            provider,
            modelName: this.modelName,
            finishReason: event.finishReason,
            usage: event.usage,
            totalChunks: chunkCount,
            promptLength: prompt.length,
            responseLength: event.text?.length || 0,
          });
        },

        onChunk: (event: { chunk: { type: string; text?: string } }) => {
          chunkCount++;
          logger.debug(`[${functionTag}] Stream chunk`, {
            provider,
            modelName: this.modelName,
            chunkNumber: chunkCount,
            chunkLength: event.chunk.text?.length || 0,
            chunkType: event.chunk.type,
          });
        },
      } as Parameters<typeof streamText>[0];

      if (finalSchema) {
        streamOptions.experimental_output = Output.object({
          schema: finalSchema,
        });
      }

      const result = streamText(streamOptions);

      logger.debug(`[${functionTag}] Stream request completed`, {
        provider,
        modelName: this.modelName,
      });

      // Convert to StreamResult format
      return {
        stream: (async function* () {
          for await (const chunk of result.textStream) {
            yield { content: chunk };
          }
        })(),
        provider: "ollama",
        model: this.modelName,
        metadata: {
          streamId: `ollama-${Date.now()}`,
          startTime,
        },
      };
    } catch (err) {
      // Log timeout errors specifically
      if (err instanceof TimeoutError) {
        logger.debug(`[${functionTag}] Timeout error`, {
          provider,
          modelName: this.modelName,
          timeout: err.timeout,
          message: err.message,
        });
      } else {
        logger.debug(`[${functionTag}] Exception`, {
          provider,
          modelName: this.modelName,
          message: "Error in streaming content",
          err: String(err),
        });
      }
      throw err; // Re-throw error to trigger fallback
    }
  }

  /**
   * Generate text using Ollama local models
   */
  async generate(
    optionsOrPrompt: TextGenerationOptions | string,
    analysisSchema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>,
  ): Promise<GenerateResult> {
    const functionTag = "Ollama.generate";
    const provider = "ollama";
    const startTime = Date.now();

    try {
      // Parse parameters - support both string and options object
      const options =
        typeof optionsOrPrompt === "string"
          ? { prompt: optionsOrPrompt }
          : optionsOrPrompt;

      const {
        prompt,
        temperature = 0.7,
        maxTokens = DEFAULT_MAX_TOKENS,
        systemPrompt = DEFAULT_SYSTEM_CONTEXT.systemPrompt,
        schema,
        timeout,
      } = options;

      // Use schema from options or fallback parameter
      const finalSchema = schema || analysisSchema;

      // Convert timeout to milliseconds if provided as string
      const timeoutMs = timeout
        ? typeof timeout === "string"
          ? parseInt(
              getDefaultTimeout("ollama", "generate").replace(/[^\d]/g, ""),
            )
          : timeout
        : this.defaultTimeout;

      logger.debug(`[${functionTag}] Generate request started`, {
        provider,
        modelName: this.modelName,
        promptLength: prompt.length,
        temperature,
        maxTokens,
        timeout: timeoutMs,
      });

      const model = this.getModel(timeoutMs);

      const generateOptions = {
        model: model,
        prompt: prompt,
        system: systemPrompt,
        temperature,
        maxTokens,
      } as Parameters<typeof generateText>[0];

      if (finalSchema) {
        generateOptions.experimental_output = Output.object({
          schema: finalSchema,
        });
      }

      const result = await generateText(generateOptions);

      if (result.text.includes("model not found")) {
        throw new Error(
          `Model '${this.modelName}' not found. Please run 'ollama pull ${this.modelName}'`,
        );
      }

      logger.debug(`[${functionTag}] Generate text completed`, {
        provider,
        modelName: this.modelName,
        usage: result.usage,
        finishReason: result.finishReason,
        responseLength: result.text?.length || 0,
      });

      // Add analytics if enabled
      if (options.enableAnalytics) {
        (result as any).analytics = {
          provider,
          model: this.modelName,
          tokens: result.usage,
          responseTime: Date.now() - startTime,
          context: options.context,
        };
      }

      // Add evaluation if enabled
      if (options.enableEvaluation) {
        (result as any).evaluation = await evaluateResponse(
          prompt,
          result.text,
          options.context,
        );
      }

      return {
        content: result.text,
        provider: "ollama",
        model: this.modelName,
        usage: result.usage
          ? {
              inputTokens: result.usage.promptTokens,
              outputTokens: result.usage.completionTokens,
              totalTokens: result.usage.totalTokens,
            }
          : undefined,
        responseTime: Date.now() - startTime,
      };
    } catch (err) {
      logger.debug(`[${functionTag}] Exception`, {
        provider,
        modelName: this.modelName,
        message: "Error in generating text",
        err: String(err),
      });
      throw err; // Re-throw error to trigger fallback
    }
  }

  async gen(
    optionsOrPrompt: TextGenerationOptions | string,
    analysisSchema?: any,
  ): Promise<EnhancedGenerateResult | null> {
    return this.generate(optionsOrPrompt, analysisSchema);
  }
}
