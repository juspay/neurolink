import { openai } from "@ai-sdk/openai";
import type { ZodType, ZodTypeDef } from "zod";
import {
  streamText,
  generateText,
  Output,
  type Schema,
  type LanguageModelV1,
} from "ai";
import type { GenerateResult } from "../types/generate-types.js";
import type { StreamOptions, StreamResult } from "../types/stream-types.js";
import { logger } from "../utils/logger.js";
import type {
  AIProvider,
  TextGenerationOptions,
  EnhancedGenerateResult,
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

  async generate(
    optionsOrPrompt: TextGenerationOptions | string,
    analysisSchema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>,
  ): Promise<GenerateResult> {
    const functionTag = "OpenAI.generate";
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
        promptLength: prompt?.length || 0,
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

        return {
          content: result.text,
          provider: "openai",
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
   * PRIMARY METHOD: Stream content using AI (recommended for new code)
   * Future-ready for multi-modal capabilities with current text focus
   */
  async stream(
    optionsOrPrompt: StreamOptions | string,
    analysisSchema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>,
  ): Promise<StreamResult> {
    const functionTag = "OpenAI.stream";
    const provider = "openai";
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

      // Convert to internal parameters
      const {
        prompt = options.input.text,
        temperature = 0.7,
        maxTokens = DEFAULT_MAX_TOKENS,
        systemPrompt = DEFAULT_SYSTEM_CONTEXT.systemPrompt,
        schema,
        timeout = getDefaultTimeout(provider, "stream"),
      } = options as any;

      // Use schema from options or fallback parameter
      const finalSchema = schema || analysisSchema;

      logger.debug(`[${functionTag}] Stream request started`, {
        provider,
        modelName: this.modelName,
        promptLength: prompt?.length || 0,
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
        stream: result.textStream
          ? (async function* () {
              for await (const chunk of result.textStream) {
                yield { content: chunk };
              }
            })()
          : (async function* () {
              yield { content: "" };
              throw new Error("No textStream available from AI SDK");
            })(),
        provider: "openai",
        model: this.modelName,
        metadata: {
          streamId: `openai-${Date.now()}`,
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
   * Short alias for generate() - CLI-SDK consistency
   * @param optionsOrPrompt - TextGenerationOptions object or prompt string
   * @param analysisSchema - Optional schema for output validation
   * @returns Promise resolving to GenerateResult or null
   */
  async gen(
    optionsOrPrompt: TextGenerationOptions | string,
    analysisSchema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>,
  ): Promise<EnhancedGenerateResult | null> {
    return this.generate(optionsOrPrompt, analysisSchema);
  }
}
