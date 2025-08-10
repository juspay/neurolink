import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { ZodType, ZodTypeDef } from "zod";
import { streamText, Output, type Schema, type LanguageModelV1 } from "ai";
import type {
  AIProviderName,
  TextGenerationOptions,
  EnhancedGenerateResult,
} from "../core/types.js";
import { GoogleAIModels } from "../core/types.js";
import type { StreamOptions, StreamResult } from "../types/streamTypes.js";
import type { Unknown, UnknownRecord } from "../types/common.js";
import { BaseProvider, type NeuroLinkSDK } from "../core/baseProvider.js";
import { logger } from "../utils/logger.js";
import {
  createTimeoutController,
  TimeoutError,
  getDefaultTimeout,
} from "../utils/timeout.js";
import { DEFAULT_MAX_TOKENS } from "../core/constants.js";
import { createProxyFetch } from "../proxy/proxyFetch.js";
import { streamAnalyticsCollector } from "../core/streamAnalytics.js";

// Environment variable setup
if (
  !process.env.GOOGLE_GENERATIVE_AI_API_KEY &&
  process.env.GOOGLE_AI_API_KEY
) {
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY;
}

/**
 * Google AI Studio provider implementation using BaseProvider
 * Migrated from original GoogleAIStudio class to new factory pattern
 */
export class GoogleAIStudioProvider extends BaseProvider {
  constructor(modelName?: string, sdk?: unknown) {
    super(
      modelName,
      "google-ai" as AIProviderName,
      sdk as NeuroLinkSDK | undefined,
    );
    logger.debug("GoogleAIStudioProvider initialized", {
      model: this.modelName,
      provider: this.providerName,
      sdkProvided: !!sdk,
    });
  }
  // ===================
  // ABSTRACT METHOD IMPLEMENTATIONS
  // ===================

  protected getProviderName(): AIProviderName {
    return "google-ai" as AIProviderName;
  }

  protected getDefaultModel(): string {
    return process.env.GOOGLE_AI_MODEL || GoogleAIModels.GEMINI_2_5_FLASH;
  }

  /**
   * 🔧 PHASE 2: Return AI SDK model instance for tool calling
   */
  protected getAISDKModel(): LanguageModelV1 {
    const apiKey = this.getApiKey();
    const google = createGoogleGenerativeAI({ apiKey });
    return google(this.modelName);
  }

  protected handleProviderError(error: unknown): Error {
    if (error instanceof TimeoutError) {
      return new Error(`Google AI request timed out: ${error.message}`);
    }

    const errorRecord = error as UnknownRecord;
    if (
      typeof errorRecord?.message === "string" &&
      errorRecord.message.includes("API_KEY_INVALID")
    ) {
      return new Error(
        "Invalid Google AI API key. Please check your GOOGLE_AI_API_KEY environment variable.",
      );
    }

    if (
      typeof errorRecord?.message === "string" &&
      errorRecord.message.includes("RATE_LIMIT_EXCEEDED")
    ) {
      return new Error(
        "Google AI rate limit exceeded. Please try again later.",
      );
    }

    const message =
      typeof errorRecord?.message === "string"
        ? errorRecord.message
        : "Unknown error";
    return new Error(`Google AI error: ${message}`);
  }
  // executeGenerate removed - BaseProvider handles all generation with tools
  protected async executeStream(
    options: StreamOptions,
    analysisSchema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>,
  ): Promise<StreamResult> {
    this.validateStreamOptions(options);

    const startTime = Date.now();
    const apiKey = this.getApiKey();

    // Ensure environment variable is set for @ai-sdk/google
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = apiKey;
    }

    const google = createGoogleGenerativeAI({ apiKey });
    const model = google(this.modelName);

    const timeout = this.getTimeout(options);
    const timeoutController = createTimeoutController(
      timeout,
      this.providerName,
      "stream",
    );

    try {
      const result = await streamText({
        model,
        prompt: options.input.text,
        system: options.systemPrompt,
        temperature: options.temperature,
        maxTokens: options.maxTokens || DEFAULT_MAX_TOKENS,
        tools: options.tools,
        toolChoice: "auto",
        abortSignal: timeoutController?.controller.signal,
      });

      timeoutController?.cleanup();

      // Transform string stream to content object stream
      const transformedStream = async function* () {
        for await (const chunk of result.textStream) {
          yield { content: chunk };
        }
      };

      // Create analytics promise that resolves after stream completion
      const analyticsPromise = streamAnalyticsCollector.createAnalytics(
        this.providerName,
        this.modelName,
        result,
        Date.now() - startTime,
        {
          requestId: `google-ai-stream-${Date.now()}`,
          streamingMode: true,
        },
      );

      return {
        stream: transformedStream(),
        provider: this.providerName,
        model: this.modelName,
        analytics: analyticsPromise,
        metadata: {
          startTime,
          streamId: `google-ai-${Date.now()}`,
        },
      };
    } catch (error) {
      timeoutController?.cleanup();
      throw this.handleProviderError(error);
    }
  }

  // ===================
  // HELPER METHODS
  // ===================

  private getApiKey(): string {
    const apiKey =
      process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!apiKey) {
      throw new Error(
        "GOOGLE_AI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY environment variable is not set",
      );
    }

    return apiKey;
  }

  private validateStreamOptions(options: StreamOptions): void {
    if (!options.input?.text || options.input.text.trim().length === 0) {
      throw new Error("Input text is required and cannot be empty");
    }
  }
}

export default GoogleAIStudioProvider;
