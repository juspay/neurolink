import { createMistral } from "@ai-sdk/mistral";
import type { ZodType, ZodTypeDef } from "zod";
import { streamText, Output, type Schema, type LanguageModelV1 } from "ai";
import type {
  AIProviderName,
  TextGenerationOptions,
  EnhancedGenerateResult,
} from "../core/types.js";
import type { StreamOptions, StreamResult } from "../types/stream-types.js";
import { BaseProvider } from "../core/base-provider.js";
import { logger } from "../utils/logger.js";
import {
  createTimeoutController,
  TimeoutError,
  getDefaultTimeout,
} from "../utils/timeout.js";
import { DEFAULT_MAX_TOKENS } from "../core/constants.js";

// Configuration helpers
const getMistralApiKey = (): string => {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    throw new Error(
      `❌ Mistral AI Provider Configuration Error\n\nMissing required environment variable: MISTRAL_API_KEY\n\n🔧 Step 1: Get Mistral AI API Key\n1. Visit: https://console.mistral.ai/\n2. Sign in or create an account\n3. Go to API Keys section\n4. Create a new API key\n\n🔧 Step 2: Set Environment Variable\nAdd to your .env file:\nMISTRAL_API_KEY=your_api_key_here\n\n🔧 Step 3: Restart Application\nRestart your application to load the new environment variables.`,
    );
  }
  return apiKey;
};

const getDefaultMistralModel = (): string => {
  return process.env.MISTRAL_MODEL || "mistral-small";
};

const hasMistralCredentials = (): boolean => {
  return !!process.env.MISTRAL_API_KEY;
};

/**
 * Mistral AI Provider v2 - BaseProvider Implementation
 *
 * PHASE 3.6: Simple BaseProvider wrap around existing @ai-sdk/mistral implementation
 *
 * Features:
 * - Extends BaseProvider for shared functionality
 * - Uses pre-configured Mistral instance for efficiency
 * - Enhanced error handling with setup guidance
 * - Supports all Mistral models (mistral-small, mistral-medium, mistral-large)
 */
export class MistralProvider extends BaseProvider {
  private mistral: any;
  private model: LanguageModelV1;

  constructor(modelName?: string, sdk?: any) {
    super(modelName, "mistral" as AIProviderName, sdk);

    // Validate Mistral API credentials
    if (!hasMistralCredentials()) {
      throw new Error(
        `❌ Mistral AI Provider Configuration Error\n\nMissing Mistral AI API key.\n\n🔧 Required Environment Variable:\nMISTRAL_API_KEY=your_api_key_here\n\n🔧 Get API Key:\n1. Visit: https://console.mistral.ai/\n2. Sign in or create account\n3. Generate API key\n4. Add to .env file\n\n🔧 Restart Application\nRestart your application to load the new environment variables.`,
      );
    }

    // Initialize Mistral provider
    this.mistral = createMistral({
      apiKey: getMistralApiKey(),
    });

    // Pre-initialize model for efficiency
    this.model = this.mistral(this.modelName || getDefaultMistralModel());

    logger.debug("Mistral AI BaseProvider v2 initialized", {
      modelName: this.modelName,
      provider: this.providerName,
    });
  }

  protected getProviderName(): AIProviderName {
    return "mistral" as AIProviderName;
  }

  protected getDefaultModel(): string {
    return getDefaultMistralModel();
  }

  /**
   * Returns the Vercel AI SDK model instance for Mistral
   */
  protected getAISDKModel(): LanguageModelV1 {
    return this.model;
  }

  // executeGenerate removed - BaseProvider handles all generation with tools

  protected async executeStream(
    options: StreamOptions,
    analysisSchema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>,
  ): Promise<StreamResult> {
    try {
      this.validateStreamOptions(options);

      const result = await streamText({
        model: this.model,
        prompt: options.input.text,
        system: options.systemPrompt,
        maxTokens: options.maxTokens || DEFAULT_MAX_TOKENS,
        temperature: options.temperature,
      });

      return {
        stream: (async function* () {
          for await (const chunk of result.textStream) {
            yield { content: chunk };
          }
        })(),
        provider: this.providerName,
        model: this.modelName,
      };
    } catch (error) {
      throw this.handleProviderError(error);
    }
  }

  protected handleProviderError(error: any): Error {
    if (error.name === "TimeoutError") {
      return new TimeoutError(
        `Mistral AI request timed out. Consider increasing timeout or using a lighter model.`,
        this.defaultTimeout,
      );
    }

    if (
      error.message?.includes("401") ||
      error.message?.includes("Unauthorized")
    ) {
      return new Error(
        `❌ Mistral AI Authentication Error\n\nYour API key is invalid or expired.\n\n🔧 Steps to Fix:\n1. Check your MISTRAL_API_KEY in .env file\n2. Verify the API key is correct and active\n3. Generate a new API key if needed at https://console.mistral.ai/\n4. Restart your application after updating`,
      );
    }

    if (
      error.message?.includes("403") ||
      error.message?.includes("Forbidden")
    ) {
      return new Error(
        `❌ Mistral AI Access Denied\n\nYour account doesn't have permission to access this model.\n\n🔧 Possible Solutions:\n1. Check if your account has access to the model: ${this.modelName}\n2. Try a different model (e.g., 'mistral-small')\n3. Verify your subscription status\n4. Contact Mistral AI support if needed`,
      );
    }

    if (
      error.message?.includes("429") ||
      error.message?.includes("rate limit")
    ) {
      return new Error(
        `❌ Mistral AI Rate Limit Exceeded\n\n${error.message}\n\n🔧 Solutions:\n1. Wait a moment before retrying\n2. Reduce request frequency\n3. Check your usage quotas\n4. Consider upgrading your plan`,
      );
    }

    if (
      error.message?.includes("400") ||
      error.message?.includes("Bad Request")
    ) {
      return new Error(
        `❌ Mistral AI Invalid Request\n\n${error.message}\n\n🔧 Check:\n1. Input text is properly formatted\n2. Model name is correct: ${this.modelName}\n3. Parameters are within limits\n4. Request format matches API requirements`,
      );
    }

    if (
      error.message?.includes("404") ||
      error.message?.includes("Not Found")
    ) {
      return new Error(
        `❌ Mistral AI Model Not Found\n\nModel '${this.modelName}' is not available.\n\n🔧 Available Models:\n- mistral-small (fastest, cost-effective)\n- mistral-medium (balanced performance)\n- mistral-large (highest quality)\n\n🔧 Fix: Update MISTRAL_MODEL environment variable`,
      );
    }

    return new Error(
      `❌ Mistral AI Provider Error\n\n${error.message || "Unknown error occurred"}\n\n🔧 Troubleshooting:\n1. Check API key and network connectivity\n2. Verify model availability\n3. Review request parameters\n4. Check Mistral AI status page`,
    );
  }

  private validateStreamOptions(options: StreamOptions): void {
    if (!options.input?.text?.trim()) {
      throw new Error("Prompt is required for streaming");
    }

    if (
      options.maxTokens &&
      (options.maxTokens < 1 || options.maxTokens > 32768)
    ) {
      throw new Error("maxTokens must be between 1 and 32768 for Mistral AI");
    }

    if (
      options.temperature &&
      (options.temperature < 0 || options.temperature > 1)
    ) {
      throw new Error("temperature must be between 0 and 1");
    }
  }

  /**
   * Check available Mistral models
   * @returns Array of available model names
   */
  getAvailableModels(): string[] {
    return [
      "mistral-small",
      "mistral-medium",
      "mistral-large",
      "mistral-7b-instruct",
      "mistral-8x7b-instruct",
      "mistral-8x22b-instruct",
    ];
  }

  /**
   * Get recommended model based on use case
   * @param useCase - The intended use case
   * @returns Recommended model name
   */
  getRecommendedModel(useCase: "speed" | "balanced" | "quality"): string {
    switch (useCase) {
      case "speed":
        return "mistral-small";
      case "balanced":
        return "mistral-medium";
      case "quality":
        return "mistral-large";
      default:
        return "mistral-small";
    }
  }
}

export default MistralProvider;
