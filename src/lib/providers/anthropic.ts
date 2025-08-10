import { anthropic } from "@ai-sdk/anthropic";
import type { ZodType, ZodTypeDef } from "zod";
import { streamText, Output, type Schema, type LanguageModelV1 } from "ai";
import type {
  AIProviderName,
  TextGenerationOptions,
  EnhancedGenerateResult,
} from "../core/types.js";
import type { StreamOptions, StreamResult } from "../types/streamTypes.js";
import type { Unknown, UnknownRecord, JsonValue } from "../types/common.js";
import { BaseProvider, type NeuroLinkSDK } from "../core/baseProvider.js";
import { logger } from "../utils/logger.js";
import {
  createTimeoutController,
  TimeoutError,
  getDefaultTimeout,
} from "../utils/timeout.js";
import { DEFAULT_MAX_TOKENS } from "../core/constants.js";
import {
  validateApiKey,
  createAnthropicConfig,
  getProviderModel,
} from "../utils/providerConfig.js";

// Configuration helpers - now using consolidated utility
const getAnthropicApiKey = (): string => {
  return validateApiKey(createAnthropicConfig());
};

const getDefaultAnthropicModel = (): string => {
  return getProviderModel("ANTHROPIC_MODEL", "claude-3-5-sonnet-20241022");
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
      sdk as NeuroLinkSDK | undefined,
    );

    // Initialize Anthropic model with API key validation
    const apiKey = getAnthropicApiKey();

    // Set Anthropic API key as environment variable (required by @ai-sdk/anthropic)
    process.env.ANTHROPIC_API_KEY = apiKey;

    // Initialize Anthropic with proper configuration
    this.model = anthropic(this.modelName || getDefaultAnthropicModel());

    logger.debug("Anthropic Provider v2 initialized", {
      modelName: this.modelName,
      provider: this.providerName,
    });
  }

  protected getProviderName(): AIProviderName {
    return "anthropic" as AIProviderName;
  }

  protected getDefaultModel(): string {
    return getDefaultAnthropicModel();
  }

  /**
   * Returns the Vercel AI SDK model instance for Anthropic
   */
  protected getAISDKModel(): LanguageModelV1 {
    return this.model;
  }

  protected handleProviderError(error: unknown): Error {
    if (error instanceof TimeoutError) {
      return new Error(
        `Anthropic request timed out after ${error.timeout}ms: ${error.message}`,
      );
    }

    const errorRecord = error as UnknownRecord;

    // Handle API key errors
    if (
      (typeof errorRecord?.message === "string" &&
        errorRecord.message.includes("API_KEY_INVALID")) ||
      (typeof errorRecord?.message === "string" &&
        errorRecord.message.includes("Invalid API key"))
    ) {
      return new Error(
        "Invalid Anthropic API key. Please check your ANTHROPIC_API_KEY environment variable.",
      );
    }

    // Handle rate limiting errors
    if (
      typeof errorRecord?.message === "string" &&
      (errorRecord.message.includes("rate limit") ||
        errorRecord.message.includes("too_many_requests") ||
        errorRecord.message.includes("429"))
    ) {
      return new Error(
        "Anthropic rate limit exceeded. Please try again later.",
      );
    }

    // Handle connection errors
    if (
      typeof errorRecord?.message === "string" &&
      (errorRecord.message.includes("ECONNRESET") ||
        errorRecord.message.includes("ENOTFOUND") ||
        errorRecord.message.includes("ECONNREFUSED") ||
        errorRecord.message.includes("network") ||
        errorRecord.message.includes("connection"))
    ) {
      return new Error(
        "Anthropic API connection error. Please check your internet connection and try again.",
      );
    }

    // Handle server errors
    if (
      typeof errorRecord?.message === "string" &&
      (errorRecord.message.includes("500") ||
        errorRecord.message.includes("502") ||
        errorRecord.message.includes("503") ||
        errorRecord.message.includes("504") ||
        errorRecord.message.includes("server error"))
    ) {
      return new Error(
        "Anthropic API server error. Please try again in a few moments.",
      );
    }

    const message =
      typeof errorRecord?.message === "string"
        ? errorRecord.message
        : "Unknown error";
    return new Error(`Anthropic error: ${message}`);
  }

  // executeGenerate removed - BaseProvider handles all generation with tools

  protected async executeStream(
    options: StreamOptions,
    analysisSchema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>,
  ): Promise<StreamResult> {
    // Convert StreamOptions to TextGenerationOptions for validation
    const validationOptions: TextGenerationOptions = {
      prompt: options.input.text,
      systemPrompt: options.systemPrompt,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
    };
    this.validateOptions(validationOptions);

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

      // 🔧 CRITICAL FIX: Vercel AI SDK streamText() hangs with tools and maxSteps > 1
      // For stream-focused SDK, we need reliable streaming, so avoid the hanging case
      if (shouldUseTools && Object.keys(tools).length > 0) {
        throw new Error(
          "Vercel AI SDK streamText() limitation with tools - falling back to synthetic streaming",
        );
      }

      const result = await streamText({
        model: this.model,
        prompt: options.input.text,
        system: options.systemPrompt || undefined,
        temperature: options.temperature,
        maxTokens: options.maxTokens || DEFAULT_MAX_TOKENS,
        tools: {}, // 🔧 Force empty tools for real streaming to avoid hanging
        maxSteps: 1, // 🔧 Force single step for real streaming
        toolChoice: "none", // 🔧 Force no tools for real streaming
        abortSignal: timeoutController?.controller.signal,
      });

      timeoutController?.cleanup();

      // Transform string stream to content object stream
      const transformedStream = async function* () {
        for await (const chunk of result.textStream) {
          yield { content: chunk };
        }
      };

      // ✅ Note: Vercel AI SDK's streamText() method limitations with tools
      // The streamText() function doesn't provide the same tool result access as generateText()
      // For full tool support, the BaseProvider will fall back to synthetic streaming when needed
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

      const usage = await result.usage;
      const finishReason = await result.finishReason;

      return {
        stream: transformedStream(),
        provider: this.providerName,
        model: this.modelName,
        toolCalls, // ✅ Include tool calls in stream result
        toolResults, // ✅ Include tool results in stream result
        usage: usage
          ? {
              inputTokens: usage.promptTokens || 0,
              outputTokens: usage.completionTokens || 0,
              totalTokens: usage.totalTokens || 0,
            }
          : undefined,
        finishReason: finishReason || undefined,
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
