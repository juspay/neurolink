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
  StreamTextOptions,
} from "../core/types.js";
import type {
  GenerateTextResult,
  StreamTextResult,
  ToolSet,
  LanguageModelV1,
  LanguageModelV1CallOptions,
  LanguageModelV1StreamPart,
} from "ai";
import { streamText, generateText, Output } from "ai";
import type { ZodType, ZodTypeDef } from "zod";
import type { Schema } from "ai";
import { logger } from "../utils/logger.js";

// Default system context
const DEFAULT_SYSTEM_CONTEXT = {
  systemPrompt: "You are a helpful AI assistant.",
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
        num_predict: options.maxTokens || 500,
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
        num_predict: options.maxTokens || 500,
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
  private timeout: number;

  constructor(modelName?: string) {
    this.baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
    this.modelName = modelName || process.env.OLLAMA_MODEL || "llama2";
    this.timeout = parseInt(process.env.OLLAMA_TIMEOUT || "60000"); // 60 seconds default

    logger.debug("[Ollama] Initialized", {
      baseUrl: this.baseUrl,
      modelName: this.modelName,
      timeout: this.timeout,
    });
  }

  /**
   * Gets the appropriate model instance
   * @private
   */
  private getModel(): LanguageModelV1 {
    logger.debug("Ollama.getModel - Ollama model selected", {
      modelName: this.modelName,
    });

    return new OllamaLanguageModel(this.modelName, this.baseUrl, this.timeout);
  }

  /**
   * Health check - verify Ollama service is running and accessible
   */
  async checkHealth(): Promise<boolean> {
    const model = new OllamaLanguageModel(
      this.modelName,
      this.baseUrl,
      this.timeout,
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
   * Generate text using Ollama local models
   */
  async generateText(
    optionsOrPrompt: TextGenerationOptions | string,
    analysisSchema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>,
  ): Promise<GenerateTextResult<ToolSet, unknown> | null> {
    const functionTag = "Ollama.generateText";
    const provider = "ollama";

    try {
      // Parse parameters - support both string and options object
      const options =
        typeof optionsOrPrompt === "string"
          ? { prompt: optionsOrPrompt }
          : optionsOrPrompt;

      const {
        prompt,
        temperature = 0.7,
        maxTokens = 500,
        systemPrompt = DEFAULT_SYSTEM_CONTEXT.systemPrompt,
        schema,
      } = options;

      // Use schema from options or fallback parameter
      const finalSchema = schema || analysisSchema;

      logger.debug(`[${functionTag}] Generate request started`, {
        provider,
        modelName: this.modelName,
        promptLength: prompt.length,
        temperature,
        maxTokens,
      });

      const model = this.getModel();

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

      logger.debug(`[${functionTag}] Generate text completed`, {
        provider,
        modelName: this.modelName,
        usage: result.usage,
        finishReason: result.finishReason,
        responseLength: result.text?.length || 0,
      });

      return result;
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

  /**
   * Generate streaming text using Ollama local models
   */
  async streamText(
    optionsOrPrompt: StreamTextOptions | string,
    analysisSchema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>,
  ): Promise<StreamTextResult<ToolSet, unknown> | null> {
    const functionTag = "Ollama.streamText";
    const provider = "ollama";
    let chunkCount = 0;

    try {
      // Parse parameters - support both string and options object
      const options =
        typeof optionsOrPrompt === "string"
          ? { prompt: optionsOrPrompt }
          : optionsOrPrompt;

      const {
        prompt,
        temperature = 0.7,
        maxTokens = 500,
        systemPrompt = DEFAULT_SYSTEM_CONTEXT.systemPrompt,
        schema,
      } = options;

      // Use schema from options or fallback parameter
      const finalSchema = schema || analysisSchema;

      logger.debug(`[${functionTag}] Stream request started`, {
        provider,
        modelName: this.modelName,
        promptLength: prompt.length,
        temperature,
        maxTokens,
        hasSchema: !!finalSchema,
      });

      const model = this.getModel();

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

          logger.debug(`[${functionTag}] Stream text error`, {
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
          logger.debug(`[${functionTag}] Stream text finished`, {
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
          logger.debug(`[${functionTag}] Stream text chunk`, {
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
      return result;
    } catch (err) {
      logger.debug(`[${functionTag}] Exception`, {
        provider,
        modelName: this.modelName,
        message: "Error in streaming text",
        err: String(err),
        promptLength:
          typeof optionsOrPrompt === "string"
            ? optionsOrPrompt.length
            : optionsOrPrompt.prompt.length,
      });
      throw err; // Re-throw error to trigger fallback
    }
  }
}
