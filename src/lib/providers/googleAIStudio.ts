import { createGoogleGenerativeAI } from "@ai-sdk/google";
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
import type {
  AIProvider,
  TextGenerationOptions,
  StreamTextOptions,
} from "../core/types.js";
import { logger } from "../utils/logger.js";

// Default system context
const DEFAULT_SYSTEM_CONTEXT = {
  systemPrompt: "You are a helpful AI assistant.",
};

// Configuration helpers
const getGoogleAIApiKey = (): string => {
  // Check for both possible environment variables
  const apiKey =
    process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GOOGLE_AI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY environment variable is not set",
    );
  }

  // Ensure GOOGLE_GENERATIVE_AI_API_KEY is set for @ai-sdk/google compatibility
  // The AI SDK specifically looks for this variable name
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY && process.env.GOOGLE_AI_API_KEY) {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY;
  }

  return apiKey;
};

const getGoogleAIModelId = (): string => {
  return process.env.GOOGLE_AI_MODEL || "gemini-2.5-pro";
};

const hasValidAuth = (): boolean => {
  return !!(
    process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
  );
};

// Lazy initialization cache
let _google: ReturnType<typeof createGoogleGenerativeAI> | null = null;
function getGoogleInstance(): ReturnType<typeof createGoogleGenerativeAI> {
  if (!_google) {
    const apiKey = getGoogleAIApiKey();
    _google = createGoogleGenerativeAI({
      apiKey: apiKey,
      headers: {
        "X-Powered-By": "NeuroLink",
      },
    });
  }
  return _google;
}

// Google AI Studio class with enhanced error handling
export class GoogleAIStudio implements AIProvider {
  private modelName: string;

  /**
   * Initializes a new instance of GoogleAIStudio
   * @param modelName - Optional model name to override the default from config
   */
  constructor(modelName?: string | null) {
    const functionTag = "GoogleAIStudio.constructor";
    this.modelName = modelName || getGoogleAIModelId();

    try {
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
        message: "Error in initializing Google AI Studio",
        modelName: this.modelName,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
    }
  }

  /**
   * Gets the appropriate model instance
   * Made public to support FunctionCallingProvider integration
   */
  public getModel(): LanguageModelV1 {
    logger.debug("GoogleAIStudio.getModel - Google AI model selected", {
      modelName: this.modelName,
    });

    const google = getGoogleInstance();
    return google(this.modelName);
  }

  /**
   * Expose model property for FunctionCallingProvider
   * This allows the enhanced provider to access the underlying model
   */
  public get model(): LanguageModelV1 {
    return this.getModel();
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
    const functionTag = "GoogleAIStudio.streamText";
    const provider = "google-ai";
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
        tools,
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
        hasTools: !!tools,
        toolCount: tools ? Object.keys(tools).length : 0,
      });

      const model = this.getModel();

      const streamOptions = {
        model: model,
        prompt: prompt,
        system: systemPrompt,
        temperature,
        maxTokens,
        ...(tools && { tools }), // Add tools if provided

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

      if (analysisSchema) {
        streamOptions.experimental_output = Output.object({
          schema: analysisSchema,
        });
      }

      const result = streamText(streamOptions);
      return result;
    } catch (err) {
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
    const functionTag = "GoogleAIStudio.generateText";
    const provider = "google-ai";

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
        tools,
      } = options;

      // Use schema from options or fallback parameter
      const finalSchema = schema || analysisSchema;

      logger.debug(`[${functionTag}] Generate request started`, {
        provider,
        modelName: this.modelName,
        promptLength: prompt.length,
        temperature,
        maxTokens,
        hasTools: !!tools,
        toolCount: tools ? Object.keys(tools).length : 0,
      });

      const model = this.getModel();

      const generateOptions = {
        model: model,
        prompt: prompt,
        system: systemPrompt,
        temperature,
        maxTokens,
        ...(tools && {
          tools,
          maxSteps: 5, // Allow multiple steps for tool execution and response generation
        }), // Add tools if provided
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
      logger.error(`[${functionTag}] Exception`, {
        provider,
        modelName: this.modelName,
        message: "Error in generating text",
        err: String(err),
      });
      throw err; // Re-throw error to trigger fallback
    }
  }
}
