import { createAnthropic } from "@ai-sdk/anthropic";
import { streamText, type LanguageModelV1 } from "ai";
import type { ValidationSchema } from "../types/typeAliases.js";
import type { AIProviderName } from "../types/index.js";
import { AnthropicModels } from "../types/index.js";
import type { StreamOptions, StreamResult } from "../types/streamTypes.js";
import type { UnknownRecord, JsonValue } from "../types/common.js";
import type { NeuroLink } from "../neurolink.js";
import { BaseProvider } from "../core/baseProvider.js";
import { logger } from "../utils/logger.js";
import { createTimeoutController, TimeoutError } from "../utils/timeout.js";
import {
  AuthenticationError,
  NetworkError,
  ProviderError,
  RateLimitError,
} from "../types/errors.js";
import { DEFAULT_MAX_STEPS } from "../core/constants.js";
import {
  validateApiKey,
  createAnthropicConfig,
  getProviderModel,
} from "../utils/providerConfig.js";
import {
  buildMessagesArray,
  buildMultimodalMessagesArray,
  convertToCoreMessages,
} from "../utils/messageBuilder.js";
import { createProxyFetch } from "../proxy/proxyFetch.js";

// Configuration helpers - now using consolidated utility
const getAnthropicApiKey = (): string => {
  return validateApiKey(createAnthropicConfig());
};

const getDefaultAnthropicModel = (): string => {
  return getProviderModel("ANTHROPIC_MODEL", AnthropicModels.CLAUDE_3_5_SONNET);
};

/**
 * Anthropic Provider v2 - BaseProvider Implementation
 * Fixed syntax and enhanced with proper error handling
 */
export class AnthropicProvider extends BaseProvider {
  private model: LanguageModelV1;

  constructor(modelName?: string, sdk?: unknown) {
    super(
      modelName,
      "anthropic" as AIProviderName,
      sdk as NeuroLink | undefined,
    );

    // Initialize Anthropic model with API key validation and proxy support
    const apiKey = getAnthropicApiKey();

    // Create Anthropic instance with proxy fetch
    const anthropic = createAnthropic({
      apiKey: apiKey,
      fetch: createProxyFetch(),
    });

    // Initialize Anthropic model with proxy-aware instance
    this.model = anthropic(this.modelName || getDefaultAnthropicModel());

    logger.debug("Anthropic Provider v2 initialized", {
      modelName: this.modelName,
      provider: this.providerName,
    });
  }

  public getProviderName(): AIProviderName {
    return "anthropic" as AIProviderName;
  }

  public getDefaultModel(): string {
    return getDefaultAnthropicModel();
  }

  /**
   * Returns the Vercel AI SDK model instance for Anthropic
   */
  public getAISDKModel(): LanguageModelV1 {
    return this.model;
  }

  public handleProviderError(error: unknown): Error {
    if (error instanceof TimeoutError) {
      throw new NetworkError(
        `Request timed out after ${error.timeout}ms`,
        this.providerName,
      );
    }

    const errorRecord = error as UnknownRecord;
    const message =
      typeof errorRecord?.message === "string"
        ? errorRecord.message
        : "Unknown error";

    if (
      message.includes("API_KEY_INVALID") ||
      message.includes("Invalid API key")
    ) {
      throw new AuthenticationError(
        "Invalid Anthropic API key. Please check your ANTHROPIC_API_KEY environment variable.",
        this.providerName,
      );
    }

    if (
      message.includes("rate limit") ||
      message.includes("too_many_requests") ||
      message.includes("429")
    ) {
      throw new RateLimitError(
        "Anthropic rate limit exceeded. Please try again later.",
        this.providerName,
      );
    }

    if (
      message.includes("ECONNRESET") ||
      message.includes("ENOTFOUND") ||
      message.includes("ECONNREFUSED") ||
      message.includes("network") ||
      message.includes("connection")
    ) {
      throw new NetworkError(`Connection error: ${message}`, this.providerName);
    }

    if (
      message.includes("500") ||
      message.includes("502") ||
      message.includes("503") ||
      message.includes("504") ||
      message.includes("server error")
    ) {
      throw new ProviderError(`Server error: ${message}`, this.providerName);
    }

    throw new ProviderError(`Anthropic error: ${message}`, this.providerName);
  }

  // executeGenerate removed - BaseProvider handles all generation with tools

  protected async executeStream(
    options: StreamOptions,
    _analysisSchema?: ValidationSchema,
  ): Promise<StreamResult> {
    this.validateStreamOptions(options);

    const timeout = this.getTimeout(options);
    const timeoutController = createTimeoutController(
      timeout,
      this.providerName,
      "stream",
    );

    try {
      // ✅ Get tools for streaming (same as generate method)
      const shouldUseTools = !options.disableTools && this.supportsTools();
      const tools = shouldUseTools ? await this.getAllTools() : {};

      // Build message array from options with multimodal support
      const hasMultimodalInput = !!(
        options.input?.images?.length ||
        options.input?.content?.length ||
        options.input?.files?.length ||
        options.input?.csvFiles?.length
      );

      let messages;
      if (hasMultimodalInput) {
        logger.debug(
          `Anthropic: Detected multimodal input, using multimodal message builder`,
          {
            hasImages: !!options.input?.images?.length,
            imageCount: options.input?.images?.length || 0,
            hasContent: !!options.input?.content?.length,
            contentCount: options.input?.content?.length || 0,
            hasFiles: !!options.input?.files?.length,
            fileCount: options.input?.files?.length || 0,
            hasCSVFiles: !!options.input?.csvFiles?.length,
            csvFileCount: options.input?.csvFiles?.length || 0,
          },
        );

        // Create multimodal options for buildMultimodalMessagesArray
        const multimodalOptions = {
          input: {
            text: options.input?.text || "",
            images: options.input?.images,
            content: options.input?.content,
            files: options.input?.files,
            csvFiles: options.input?.csvFiles,
          },
          csvOptions: options.csvOptions,
          systemPrompt: options.systemPrompt,
          conversationHistory: options.conversationMessages,
          provider: this.providerName,
          model: this.modelName,
          temperature: options.temperature,
          maxTokens: options.maxTokens,
          enableAnalytics: options.enableAnalytics,
          enableEvaluation: options.enableEvaluation,
          context: options.context,
        };

        const mm = await buildMultimodalMessagesArray(
          multimodalOptions,
          this.providerName,
          this.modelName,
        );
        // Convert multimodal messages to Vercel AI SDK format (CoreMessage[])
        messages = convertToCoreMessages(mm);
      } else {
        logger.debug(
          `Anthropic: Text-only input, using standard message builder`,
        );
        messages = await buildMessagesArray(options);
      }
      const model = await this.getAISDKModelWithMiddleware(options);
      const result = await streamText({
        model: model,
        messages: messages,
        temperature: options.temperature,
        maxTokens: options.maxTokens, // No default limit - unlimited unless specified
        tools,
        maxSteps: options.maxSteps || DEFAULT_MAX_STEPS,
        toolChoice: shouldUseTools ? "auto" : "none",
        abortSignal: timeoutController?.controller.signal,
        experimental_telemetry: this.getStreamTelemetryConfig(options),
        onStepFinish: ({ toolCalls, toolResults }) => {
          this.handleToolExecutionStorage(
            toolCalls,
            toolResults,
            options,
            new Date(),
          ).catch((error: unknown) => {
            logger.warn("[AnthropicProvider] Failed to store tool executions", {
              provider: this.providerName,
              error: error instanceof Error ? error.message : String(error),
            });
          });
        },
      });

      timeoutController?.cleanup();

      const transformedStream = this.createTextStream(result);

      // ✅ Note: Vercel AI SDK's streamText() method limitations with tools
      // The streamText() function doesn't provide the same tool result access as generateText()
      // Full tool support is now available with real streaming
      const toolCalls: Array<{
        toolCallId: string;
        toolName: string;
        args: Record<string, unknown>;
      }> = [];

      const toolResults: Array<{
        toolName: string;
        status: "success" | "failure";
        output?: JsonValue;
        id: string;
      }> = [];

      return {
        stream: transformedStream,
        provider: this.providerName,
        model: this.modelName,
        toolCalls, // ✅ Include tool calls in stream result
        toolResults, // ✅ Include tool results in stream result
        // Note: omit usage/finishReason to avoid blocking streaming; compute asynchronously if needed.
      };
    } catch (error: unknown) {
      timeoutController?.cleanup();
      throw this.handleProviderError(error);
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      getAnthropicApiKey();
      return true;
    } catch {
      return false;
    }
  }

  getModel(): LanguageModelV1 {
    return this.model;
  }
}

export default AnthropicProvider;
