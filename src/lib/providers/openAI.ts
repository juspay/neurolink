import { openai } from "@ai-sdk/openai";
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
} from "ai";
import { logger } from "../utils/logger.js";
import type {
  AIProvider,
  TextGenerationOptions,
  StreamTextOptions,
  EnhancedGenerateTextResult,
} from "../core/types.js";
import {
  createTimeoutController,
  getDefaultTimeout,
  TimeoutError,
} from "../utils/timeout.js";
import { DEFAULT_MAX_TOKENS } from "../core/constants.js";
import { evaluateResponse } from "../core/evaluation.js";
import { createAnalytics } from "../core/analytics.js";

// Default system context
const DEFAULT_SYSTEM_CONTEXT = {
  systemPrompt: "You are a helpful AI assistant.",
};

// Declare process for TypeScript
declare const process: {
  env: {
    OPENAI_API_KEY?: string;
    OPENAI_MODEL?: string;
  };
};

// Configuration helpers
const getOpenAIApiKey = (): string => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // 🔧 FIX: Enhanced error message with setup instructions
    throw new Error(
      `❌ OPENAI Provider Configuration Error

Missing required environment variables: OPENAI_API_KEY

🔧 Step 1: Get Credentials
Get your API key from https://platform.openai.com/api-keys

💡 Step 2: Add to your .env file (or export in CLI):
OPENAI_API_KEY="sk-proj-your-openai-api-key"
# Optional:
OPENAI_MODEL="gpt-4o"
OPENAI_BASE_URL="https://api.openai.com"

🚀 Step 3: Test the setup:
npx neurolink generate "Hello" --provider openai

📖 Full setup guide: https://docs.neurolink.ai/providers/openai`,
    );
  }
  return apiKey;
};

const getOpenAIModel = (): string => {
  return process.env.OPENAI_MODEL || "gpt-4o";
};

// OpenAI class with enhanced error handling
export class OpenAI implements AIProvider {
  private modelName: string;
  private model: LanguageModelV1;

  constructor(modelName?: string | null) {
    const functionTag = "OpenAI.constructor";
    this.modelName = modelName || getOpenAIModel();

    try {
      logger.debug(`[${functionTag}] Function called`, {
        modelName: this.modelName,
      });

      // Set OpenAI API key as environment variable
      process.env.OPENAI_API_KEY = getOpenAIApiKey();

      this.model = openai(this.modelName);

      logger.debug(`[${functionTag}] Function result`, {
        modelName: this.modelName,
        success: true,
      });
    } catch (err) {
      logger.debug(`[${functionTag}] Exception`, {
        message: "Error in initializing OpenAI",
        modelName: this.modelName,
        err: String(err),
      });
      throw err;
    }
  }

  /**
   * Get the underlying model for function calling
   */
  getModel(): LanguageModelV1 {
    return this.model;
  }

  async streamText(
    optionsOrPrompt: StreamTextOptions | string,
    analysisSchema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>,
  ): Promise<StreamTextResult<ToolSet, unknown> | null> {
    const functionTag = "OpenAI.streamText";
    const provider = "openai";
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
        maxTokens = DEFAULT_MAX_TOKENS,
        systemPrompt = DEFAULT_SYSTEM_CONTEXT.systemPrompt,
        schema,
        timeout = getDefaultTimeout(provider, "stream"),
      } = options;

      // Use schema from options or fallback parameter
      const finalSchema = schema || analysisSchema;

      logger.debug(`[${functionTag}] Stream text started`, {
        provider,
        modelName: this.modelName,
        promptLength: prompt.length,
        temperature,
        maxTokens,
        timeout,
      });

      // Create timeout controller if timeout is specified
      const timeoutController = createTimeoutController(
        timeout,
        provider,
        "stream",
      );

      const streamOptions = {
        model: this.model,
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

      // For streaming, we can't clean up immediately, but the timeout will auto-clean
      // The user should handle the stream and any timeout errors

      return result;
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
          message: "Error in streaming text",
          err: String(err),
        });
      }
      throw err; // Re-throw error to trigger fallback
    }
  }

  async generateText(
    optionsOrPrompt: TextGenerationOptions | string,
    analysisSchema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>,
  ): Promise<GenerateTextResult<ToolSet, unknown> | null> {
    const functionTag = "OpenAI.generateText";
    const provider = "openai";
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
        timeout = getDefaultTimeout(provider, "generate"),
      } = options;

      // Use schema from options or fallback parameter
      const finalSchema = schema || analysisSchema;

      logger.debug(`[${functionTag}] Generate text started`, {
        provider,
        modelName: this.modelName,
        promptLength: prompt.length,
        temperature,
        maxTokens,
        timeout,
      });

      // Create timeout controller if timeout is specified
      const timeoutController = createTimeoutController(
        timeout,
        provider,
        "generate",
      );

      const generateOptions = {
        model: this.model,
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

        // Add analytics if enabled
        if (options.enableAnalytics) {
          const { createAnalytics } = await import("./analytics-helper.js");
          (result as any).analytics = createAnalytics(
            provider,
            this.modelName,
            result,
            Date.now() - startTime,
            options.context,
          );
        }

        // Add evaluation if enabled
        if (options.enableEvaluation) {
          (result as any).evaluation = await evaluateResponse(
            prompt,
            result.text,
            options.context,
            options.evaluationDomain,
            options.toolUsageContext,
            options.conversationHistory,
          );
        }

        return result;
      } finally {
        // Always cleanup timeout
        timeoutController?.cleanup();
      }
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
          message: "Error in generating text",
          err: String(err),
        });
      }
      throw err; // Re-throw error to trigger fallback
    }
  }

  /**
   * Alias for generateText() - CLI-SDK consistency
   * @param optionsOrPrompt - TextGenerationOptions object or prompt string
   * @param analysisSchema - Optional schema for output validation
   * @returns Promise resolving to GenerateTextResult or null
   */
  async generate(
    optionsOrPrompt: TextGenerationOptions | string,
    analysisSchema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>,
  ): Promise<EnhancedGenerateTextResult | null> {
    return this.generateText(optionsOrPrompt, analysisSchema);
  }

  /**
   * Short alias for generateText() - CLI-SDK consistency
   * @param optionsOrPrompt - TextGenerationOptions object or prompt string
   * @param analysisSchema - Optional schema for output validation
   * @returns Promise resolving to GenerateTextResult or null
   */
  async gen(
    optionsOrPrompt: TextGenerationOptions | string,
    analysisSchema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>,
  ): Promise<EnhancedGenerateTextResult | null> {
    return this.generateText(optionsOrPrompt, analysisSchema);
  }
}
