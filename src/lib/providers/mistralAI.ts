import { createMistral } from "@ai-sdk/mistral";
import type { ZodType, ZodTypeDef } from "zod";
import {
  streamText,
  generateText,
  Output,
  type StreamTextResult,
  type ToolSet,
  type Schema,
  type GenerateTextResult,
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
    MISTRAL_API_KEY?: string;
    MISTRAL_MODEL?: string;
    MISTRAL_ENDPOINT?: string;
  };
};

// Configuration helpers
const getMistralApiKey = (): string => {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    throw new Error("MISTRAL_API_KEY environment variable is not set");
  }
  return apiKey;
};

const getMistralModelId = (): string => {
  return process.env.MISTRAL_MODEL || "mistral-small";
};

const hasValidAuth = (): boolean => {
  return !!process.env.MISTRAL_API_KEY;
};

// Lazy initialization cache
let _mistralClient: ReturnType<typeof createMistral> | null = null;
function getMistralClient(): ReturnType<typeof createMistral> {
  if (!_mistralClient) {
    const apiKey = getMistralApiKey();
    _mistralClient = createMistral({
      apiKey,
      baseURL: process.env.MISTRAL_ENDPOINT || "https://api.mistral.ai/v1",
    });
  }
  return _mistralClient;
}

// Mistral AI class with enhanced error handling
export class MistralAI implements AIProvider {
  private modelName: string;
  private client: ReturnType<typeof createMistral>;

  /**
   * Initializes a new instance of MistralAI
   * @param modelName - Optional model name to override the default from config
   */
  constructor(modelName?: string | null) {
    const functionTag = "MistralAI.constructor";
    this.modelName = modelName || getMistralModelId();

    try {
      this.client = getMistralClient();

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
        message: "Error in initializing Mistral AI",
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
  private getModel() {
    logger.debug("MistralAI.getModel - Mistral AI model selected", {
      modelName: this.modelName,
    });

    return this.client(this.modelName);
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
    const functionTag = "MistralAI.streamText";
    const provider = "mistral";
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
    const functionTag = "MistralAI.generateText";
    const provider = "mistral";

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

export default MistralAI;
