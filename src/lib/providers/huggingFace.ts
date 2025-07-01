import { HfInference } from "@huggingface/inference";
import type { ZodType, ZodTypeDef } from "zod";
import {
  streamText,
  generateText,
  Output,
  type StreamTextResult,
  type ToolSet,
  type Schema,
  type GenerateTextResult,
  type LanguageModelV1,
  type LanguageModelV1CallOptions,
  type LanguageModelV1StreamPart,
} from "ai";
import type {
  AIProvider,
  TextGenerationOptions,
  StreamTextOptions,
} from "../core/types.js";
import { logger } from "../utils/logger.js";
import {
  createTimeoutController,
  TimeoutError,
  getDefaultTimeout,
} from "../utils/timeout.js";

// Default system context
const DEFAULT_SYSTEM_CONTEXT = {
  systemPrompt: "You are a helpful AI assistant.",
};

// Declare process for TypeScript
declare const process: {
  env: {
    HUGGINGFACE_API_KEY?: string;
    HF_TOKEN?: string;
    HUGGINGFACE_MODEL?: string;
  };
};

// Configuration helpers
const getHuggingFaceApiKey = (): string => {
  const apiKey = process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN;
  if (!apiKey) {
    throw new Error("HUGGINGFACE_API_KEY environment variable is not set");
  }
  return apiKey;
};

const getHuggingFaceModelId = (): string => {
  return process.env.HUGGINGFACE_MODEL || "microsoft/DialoGPT-medium";
};

const hasValidAuth = (): boolean => {
  return !!(process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN);
};

// Lazy initialization cache
let _hfClient: HfInference | null = null;
function getHuggingFaceClient(): HfInference {
  if (!_hfClient) {
    const apiKey = getHuggingFaceApiKey();
    _hfClient = new HfInference(apiKey);
  }
  return _hfClient;
}

// Retry configuration for model loading
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 2000, // 2 seconds
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
};

// Helper function for exponential backoff retry
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  retryConfig = RETRY_CONFIG,
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Check if it's a model loading error (503 status)
      if (error instanceof Error && error.message.includes("503")) {
        if (attempt < retryConfig.maxRetries) {
          const delay = Math.min(
            retryConfig.baseDelay *
              Math.pow(retryConfig.backoffMultiplier, attempt),
            retryConfig.maxDelay,
          );

          logger.debug("HuggingFace model loading, retrying...", {
            attempt: attempt + 1,
            maxRetries: retryConfig.maxRetries,
            delayMs: delay,
            error: error.message,
          });

          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }

      // For non-503 errors or final attempt, throw immediately
      throw error;
    }
  }

  throw lastError!;
}

// Custom LanguageModelV1 implementation for Hugging Face
class HuggingFaceLanguageModel implements LanguageModelV1 {
  readonly specificationVersion = "v1";
  readonly provider = "huggingface";
  readonly modelId: string;
  readonly maxTokens?: number;
  readonly supportsStreaming = true;
  readonly defaultObjectGenerationMode = "json" as const;

  private client: HfInference;

  constructor(modelId: string, client: HfInference) {
    this.modelId = modelId;
    this.client = client;
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

  async doGenerate(options: LanguageModelV1CallOptions) {
    const prompt = this.convertMessagesToPrompt(options.prompt);

    const response = await retryWithBackoff(async () => {
      return await this.client.textGeneration({
        model: this.modelId,
        inputs: prompt,
        parameters: {
          temperature: options.temperature || 0.7,
          max_new_tokens: options.maxTokens || 500,
          return_full_text: false,
          do_sample: (options.temperature || 0.7) > 0,
        },
      });
    });

    const generatedText = response.generated_text || "";
    const promptTokens = this.estimateTokens(prompt);
    const completionTokens = this.estimateTokens(generatedText);

    return {
      text: generatedText,
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
  }

  async doStream(options: LanguageModelV1CallOptions) {
    const prompt = this.convertMessagesToPrompt(options.prompt);

    // HuggingFace Inference API doesn't support true streaming
    // We'll simulate streaming by generating the full text and chunking it
    const response = await this.doGenerate(options);

    // Create a ReadableStream that chunks the response
    const stream = new ReadableStream<LanguageModelV1StreamPart>({
      start(controller) {
        const text = response.text || "";
        const chunkSize = Math.max(1, Math.floor(text.length / 10)); // 10 chunks

        let index = 0;

        const pushChunk = () => {
          if (index < text.length) {
            const chunk = text.slice(index, index + chunkSize);
            controller.enqueue({
              type: "text-delta",
              textDelta: chunk,
            });
            index += chunkSize;

            // Add delay to simulate streaming
            setTimeout(pushChunk, 50);
          } else {
            // Send finish event
            controller.enqueue({
              type: "finish",
              finishReason: response.finishReason,
              usage: response.usage,
              logprobs: response.logprobs,
            });
            controller.close();
          }
        };

        pushChunk();
      },
    });

    return {
      stream,
      rawCall: response.rawCall,
      rawResponse: response.rawResponse,
    };
  }
}

// Hugging Face class with enhanced error handling
export class HuggingFace implements AIProvider {
  private modelName: string;
  private client: HfInference;

  /**
   * Initializes a new instance of HuggingFace
   * @param modelName - Optional model name to override the default from config
   */
  constructor(modelName?: string | null) {
    const functionTag = "HuggingFace.constructor";
    this.modelName = modelName || getHuggingFaceModelId();

    try {
      this.client = getHuggingFaceClient();

      logger.debug(`[${functionTag}] Initialization started`, {
        modelName: this.modelName,
        hasApiKey: hasValidAuth(),
      });

      logger.debug(`[${functionTag}] Initialization completed`, {
        modelName: this.modelName,
        success: true,
      });
    } catch (err) {
      logger.error(`[${functionTag}] Initialization failed`, {
        message: "Error in initializing Hugging Face",
        modelName: this.modelName,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
      throw err;
    }
  }

  /**
   * Gets the appropriate model instance
   * @private
   */
  private getModel(): LanguageModelV1 {
    logger.debug("HuggingFace.getModel - Hugging Face model selected", {
      modelName: this.modelName,
    });

    return new HuggingFaceLanguageModel(this.modelName, this.client);
  }

  /**
   * Processes text using streaming approach with enhanced error handling callbacks
   * @param prompt - The input text prompt to analyze
   * @param analysisSchema - Optional Zod schema or Schema object for output validation
   * @returns Promise resolving to StreamTextResult or null if operation fails
   */
  async streamText(
    optionsOrPrompt: StreamTextOptions | string,
    analysisSchema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>,
  ): Promise<StreamTextResult<ToolSet, unknown> | null> {
    const functionTag = "HuggingFace.streamText";
    const provider = "huggingface";
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
        maxTokens = 1000,
        systemPrompt = DEFAULT_SYSTEM_CONTEXT.systemPrompt,
        schema,
        timeout = getDefaultTimeout(provider, "stream"),
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
        timeout,
      });

      const model = this.getModel();

      // Create timeout controller if timeout is specified
      const timeoutController = createTimeoutController(
        timeout,
        provider,
        "stream",
      );

      const streamOptions = {
        model: model,
        prompt: prompt,
        system: systemPrompt,
        temperature,
        maxTokens,
        // Add abort signal if available
        ...(timeoutController && {
          abortSignal: timeoutController.controller.signal,
        }),

        onError: (event: { error: unknown }) => {
          const error = event.error;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          const errorStack = error instanceof Error ? error.stack : undefined;

          logger.error(`[${functionTag}] Stream text error`, {
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

      // For streaming, we can't clean up immediately, but the timeout will auto-clean
      // The user should handle the stream and any timeout errors

      return result;
    } catch (err) {
      // Log timeout errors specifically
      if (err instanceof TimeoutError) {
        logger.error(`[${functionTag}] Timeout error`, {
          provider,
          modelName: this.modelName,
          timeout: err.timeout,
          message: err.message,
        });
      } else {
        logger.error(`[${functionTag}] Exception`, {
          provider,
          modelName: this.modelName,
          message: "Error in streaming text",
          err: String(err),
          promptLength:
            typeof optionsOrPrompt === "string"
              ? optionsOrPrompt.length
              : optionsOrPrompt.prompt.length,
        });
      }
      throw err; // Re-throw error to trigger fallback
    }
  }

  /**
   * Processes text using non-streaming approach with optional schema validation
   * @param prompt - The input text prompt to analyze
   * @param analysisSchema - Optional Zod schema or Schema object for output validation
   * @returns Promise resolving to GenerateTextResult or null if operation fails
   */
  async generateText(
    optionsOrPrompt: TextGenerationOptions | string,
    analysisSchema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>,
  ): Promise<GenerateTextResult<ToolSet, unknown> | null> {
    const functionTag = "HuggingFace.generateText";
    const provider = "huggingface";

    try {
      // Parse parameters - support both string and options object
      const options =
        typeof optionsOrPrompt === "string"
          ? { prompt: optionsOrPrompt }
          : optionsOrPrompt;

      const {
        prompt,
        temperature = 0.7,
        maxTokens = 1000,
        systemPrompt = DEFAULT_SYSTEM_CONTEXT.systemPrompt,
        schema,
        timeout = getDefaultTimeout(provider, "generate"),
      } = options;

      // Use schema from options or fallback parameter
      const finalSchema = schema || analysisSchema;

      logger.debug(`[${functionTag}] Generate request started`, {
        provider,
        modelName: this.modelName,
        promptLength: prompt.length,
        temperature,
        maxTokens,
        timeout,
      });

      const model = this.getModel();

      // Create timeout controller if timeout is specified
      const timeoutController = createTimeoutController(
        timeout,
        provider,
        "generate",
      );

      const generateOptions = {
        model: model,
        prompt: prompt,
        system: systemPrompt,
        temperature,
        maxTokens,
        // Add abort signal if available
        ...(timeoutController && {
          abortSignal: timeoutController.controller.signal,
        }),
      } as Parameters<typeof generateText>[0];

      if (finalSchema) {
        generateOptions.experimental_output = Output.object({
          schema: finalSchema,
        });
      }

      try {
        const result = await generateText(generateOptions);

        // Clean up timeout if successful
        timeoutController?.cleanup();

        logger.debug(`[${functionTag}] Generate text completed`, {
          provider,
          modelName: this.modelName,
          usage: result.usage,
          finishReason: result.finishReason,
          responseLength: result.text?.length || 0,
          timeout,
        });

        return result;
      } finally {
        // Always cleanup timeout
        timeoutController?.cleanup();
      }
    } catch (err) {
      // Log timeout errors specifically
      if (err instanceof TimeoutError) {
        logger.error(`[${functionTag}] Timeout error`, {
          provider,
          modelName: this.modelName,
          timeout: err.timeout,
          message: err.message,
        });
      } else {
        logger.error(`[${functionTag}] Exception`, {
          provider,
          modelName: this.modelName,
          message: "Error in generating text",
          err: String(err),
        });
      }
      throw err; // Re-throw error to trigger fallback
    }
  }
}
