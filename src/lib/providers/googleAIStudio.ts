import { createGoogleGenerativeAI } from "@ai-sdk/google";
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
import type {
  AIProvider,
  TextGenerationOptions,
  EnhancedGenerateResult,
} from "../core/types.js";
import { logger } from "../utils/logger.js";
import {
  createTimeoutController,
  TimeoutError,
  getDefaultTimeout,
} from "../utils/timeout.js";
import { DEFAULT_MAX_TOKENS } from "../core/constants.js";
import { createProxyFetch } from "../proxy/proxy-fetch.js";
import { evaluateResponse } from "../core/evaluation.js";

// Declare process for TypeScript
declare const process: {
  env: {
    GOOGLE_AI_API_KEY?: string;
    GOOGLE_GENERATIVE_AI_API_KEY?: string;
    GOOGLE_AI_MODEL?: string;
  };
};

// CRITICAL: Setup environment variables early for AI SDK compatibility
// The AI SDK specifically looks for GOOGLE_GENERATIVE_AI_API_KEY
// We need to ensure this is set before any AI SDK operations
if (
  !process.env.GOOGLE_GENERATIVE_AI_API_KEY &&
  process.env.GOOGLE_AI_API_KEY
) {
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY;
}

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
  if (
    !process.env.GOOGLE_GENERATIVE_AI_API_KEY &&
    process.env.GOOGLE_AI_API_KEY
  ) {
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
    const proxyFetch = createProxyFetch();

    _google = createGoogleGenerativeAI({
      apiKey: apiKey,
      fetch: proxyFetch,
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
   * PRIMARY METHOD: Stream content using AI (recommended for new code)
   * Future-ready for multi-modal capabilities with current text focus
   */
  async stream(
    optionsOrPrompt: StreamOptions | string,
    analysisSchema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>,
  ): Promise<StreamResult> {
    const functionTag = "GoogleAIStudio.stream";
    const provider = "google-ai";
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

      // Convert StreamOptions for internal use
      const convertedOptions = {
        prompt: options.input.text,
        provider: options.provider,
        model: options.model,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        systemPrompt: options.systemPrompt,
        timeout: options.timeout,
        schema: options.schema,
        tools: options.tools,
      };

      const {
        prompt,
        temperature = 0.7,
        maxTokens = DEFAULT_MAX_TOKENS,
        systemPrompt = DEFAULT_SYSTEM_CONTEXT.systemPrompt,
        schema,
        tools,
        timeout = getDefaultTimeout(provider, "stream"),
      } = convertedOptions;

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
        ...(tools && { tools }), // Add tools if provided
        // Add abort signal if available
        ...(timeoutController && {
          abortSignal: timeoutController.controller.signal,
        }),

        onError: (event: { error: unknown }) => {
          const error = event.error;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          const errorStack = error instanceof Error ? error.stack : undefined;

          logger.error(`[${functionTag}] Stream error`, {
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

      // Convert to StreamResult format
      return {
        stream: (async function* () {
          for await (const chunk of result.textStream) {
            yield { content: chunk };
          }
        })(),
        provider: "google-ai",
        model: this.modelName,
        metadata: {
          streamId: `google-ai-${Date.now()}`,
          startTime,
        },
      };
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
          message: "Error in streaming content",
          err: String(err),
          promptLength:
            typeof optionsOrPrompt === "string"
              ? optionsOrPrompt.length
              : optionsOrPrompt.input?.text?.length || 0,
        });
      }
      throw err; // Re-throw error to trigger fallback
    }
  }

  /**
   * Processes text using non-streaming approach with optional schema validation
   * @param prompt - The input text prompt to analyze
   * @param analysisSchema - Optional Zod schema or Schema object for output validation
   * @returns Promise resolving to GenerateResult or null if operation fails
   */
  async generate(
    optionsOrPrompt: TextGenerationOptions | string,
    analysisSchema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>,
  ): Promise<GenerateResult> {
    const functionTag = "GoogleAIStudio.generate";
    const provider = "google-ai";
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
        tools,
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
        hasTools: !!tools,
        toolCount: tools ? Object.keys(tools).length : 0,
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
        ...(tools && {
          tools,
          maxSteps: 5, // Allow multiple steps for tool execution and response generation
        }), // Add tools if provided
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
          provider: "google-ai",
          model: this.modelName || "gemini-2.5-pro",
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
