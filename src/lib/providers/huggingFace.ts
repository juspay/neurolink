import { createOpenAI } from "@ai-sdk/openai";
import type { ZodType, ZodTypeDef } from "zod";
import { streamText, Output, type Schema, type LanguageModelV1 } from "ai";
import type {
  AIProvider,
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

// Environment variables
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
    throw new Error(
      `❌ HuggingFace Provider Configuration Error\n\nMissing required environment variables: HUGGINGFACE_API_KEY\n\n🔧 Step 1: Get Credentials\n1. Visit: https://huggingface.co/settings/tokens\n2. Create new API token\n3. Copy the token\n\n🔧 Step 2: Set Environment Variable\nAdd to your .env file:\nHUGGINGFACE_API_KEY=your_token_here\n\n🔧 Step 3: Restart Application\nRestart your application to load the new environment variables.`,
    );
  }
  return apiKey;
};

const getDefaultHuggingFaceModel = (): string => {
  return process.env.HUGGINGFACE_MODEL || "microsoft/DialoGPT-medium";
};

const hasHuggingFaceCredentials = (): boolean => {
  return !!(process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN);
};

/**
 * HuggingFace Provider - BaseProvider Implementation
 * Using AI SDK with HuggingFace's OpenAI-compatible endpoint
 */
export class HuggingFaceProvider extends BaseProvider {
  private model: LanguageModelV1;

  constructor(modelName?: string) {
    super(modelName, "huggingface" as AIProviderName);

    // Get API key and validate
    const apiKey = getHuggingFaceApiKey();

    // Create HuggingFace provider using unified router endpoint (2025)
    const huggingface = createOpenAI({
      apiKey: apiKey,
      baseURL: "https://router.huggingface.co/v1",
    });

    // Initialize model
    this.model = huggingface(this.modelName);

    logger.debug("HuggingFaceProvider initialized", {
      model: this.modelName,
      provider: this.providerName,
    });
  }

  // ===================
  // ABSTRACT METHOD IMPLEMENTATIONS
  // ===================

  /**
   * HuggingFace models currently don't properly support tool/function calling
   *
   * **Tested Models & Issues:**
   * - microsoft/DialoGPT-medium: Describes tools instead of executing them
   * - Most HF models via router endpoint: Function schema passed but not executed
   * - Issue: Models treat tool definitions as conversation context rather than executable functions
   *
   * **Known Limitations:**
   * - Tools are visible to model but treated as descriptive text
   * - No proper function call response format handling
   * - HuggingFace router endpoint doesn't enforce OpenAI-compatible tool execution
   *
   * @returns false to disable tools by default until proper implementation
   */
  supportsTools(): boolean {
    // TODO: Implement proper HuggingFace tool calling support
    // Requires: Custom tool schema formatting, response parsing, execution flow
    // Track models that support function calling: CodeLlama, Llama variants
    return false;
  }

  // executeGenerate removed - BaseProvider handles all generation with tools

  protected async executeStream(
    options: StreamOptions,
    analysisSchema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>,
  ): Promise<StreamResult> {
    this.validateStreamOptions(options);

    const timeout = this.getTimeout(options);
    const timeoutController = createTimeoutController(
      timeout,
      this.providerName,
      "stream",
    );

    try {
      const result = await streamText({
        model: this.model,
        prompt: options.input.text,
        system: options.systemPrompt,
        temperature: options.temperature,
        maxTokens: options.maxTokens || DEFAULT_MAX_TOKENS,
        tools: options.tools,
        toolChoice: "auto",
        abortSignal: timeoutController?.controller.signal,
      });

      timeoutController?.cleanup();

      // Transform stream to match StreamResult interface
      const transformedStream = async function* () {
        for await (const chunk of result.textStream) {
          yield { content: chunk };
        }
      };

      return {
        stream: transformedStream(),
        provider: this.providerName,
        model: this.modelName,
      };
    } catch (error) {
      timeoutController?.cleanup();
      throw this.handleProviderError(error);
    }
  }

  protected getProviderName(): AIProviderName {
    return "huggingface" as AIProviderName;
  }

  protected getDefaultModel(): string {
    return getDefaultHuggingFaceModel();
  }

  /**
   * Returns the Vercel AI SDK model instance for HuggingFace
   */
  protected getAISDKModel(): LanguageModelV1 {
    return this.model;
  }

  protected handleProviderError(error: any): Error {
    if (error instanceof TimeoutError) {
      return new Error(`HuggingFace request timed out: ${error.message}`);
    }

    if (
      error?.message?.includes("API_TOKEN_INVALID") ||
      error?.message?.includes("Invalid token")
    ) {
      return new Error(
        "Invalid HuggingFace API token. Please check your HUGGING_FACE_API_KEY environment variable.",
      );
    }

    if (error?.message?.includes("rate limit")) {
      return new Error(
        "HuggingFace rate limit exceeded. Please try again later.",
      );
    }

    return new Error(`HuggingFace error: ${error?.message || "Unknown error"}`);
  }

  // ===================
  // PRIVATE VALIDATION METHODS
  // ===================

  private validateStreamOptions(options: StreamOptions): void {
    if (!options.input?.text || options.input.text.trim().length === 0) {
      throw new Error("Input text is required and cannot be empty");
    }
  }
}

// Export for factory registration
export default HuggingFaceProvider;
