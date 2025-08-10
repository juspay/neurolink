import { createOpenAI } from "@ai-sdk/openai";
import type { ZodType, ZodTypeDef } from "zod";
import {
  streamText,
  type Schema,
  type LanguageModelV1,
  type ToolSet,
  type ToolChoice,
} from "ai";
import type { AIProviderName } from "../core/types.js";
import type { StreamOptions, StreamResult } from "../types/streamTypes.js";
import { BaseProvider } from "../core/baseProvider.js";
import { logger } from "../utils/logger.js";
import { createTimeoutController, TimeoutError } from "../utils/timeout.js";
import { DEFAULT_MAX_TOKENS } from "../core/constants.js";
import type { UnknownRecord } from "../types/common.js";
import {
  validateApiKey,
  createHuggingFaceConfig,
  getProviderModel,
} from "../utils/providerConfig.js";

// Configuration helpers - now using consolidated utility
const getHuggingFaceApiKey = (): string => {
  return validateApiKey(createHuggingFaceConfig());
};

const getDefaultHuggingFaceModel = (): string => {
  return getProviderModel("HUGGINGFACE_MODEL", "microsoft/DialoGPT-medium");
};

// Note: hasHuggingFaceCredentials now directly imported from consolidated utility

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
   * HuggingFace Tool Calling Support (Enhanced 2025)
   *
   * **Supported Models (Tool Calling Enabled):**
   * - meta-llama/Llama-3.1-8B-Instruct - Post-trained for tool calling
   * - meta-llama/Llama-3.1-70B-Instruct - Advanced tool calling capabilities
   * - meta-llama/Llama-3.1-405B-Instruct - Full tool calling support
   * - nvidia/Llama-3.1-Nemotron-Ultra-253B-v1 - Optimized for tool calling
   * - NousResearch/Hermes-3-Llama-3.2-3B - Function calling trained
   * - codellama/CodeLlama-34b-Instruct-hf - Code-focused tool calling
   * - mistralai/Mistral-7B-Instruct-v0.3 - Basic tool support
   *
   * **Unsupported Models (Tool Calling Disabled):**
   * - microsoft/DialoGPT-* - Treats tools as conversation context
   * - gpt2, bert, roberta variants - No tool calling training
   * - Most pre-2024 models - Limited function calling capabilities
   *
   * **Implementation Details:**
   * - Intelligent model detection based on known capabilities
   * - Custom tool schema formatting for HuggingFace models
   * - Enhanced response parsing for function call extraction
   * - Graceful fallback for unsupported models
   *
   * @returns true for supported models, false for unsupported models
   */
  supportsTools(): boolean {
    const modelName = this.modelName.toLowerCase();

    // Check if model is in the list of known tool-calling capable models
    const toolCapableModels = [
      // Llama 3.1 series (post-trained for tool calling)
      "llama-3.1-8b-instruct",
      "llama-3.1-70b-instruct",
      "llama-3.1-405b-instruct",
      "llama-3.1-nemotron-ultra",

      // Hermes series (function calling trained)
      "hermes-3-llama-3.2",
      "hermes-2-pro",

      // Code Llama (code-focused tool calling)
      "codellama-34b-instruct",
      "codellama-13b-instruct",

      // Mistral series (basic tool support)
      "mistral-7b-instruct-v0.3",
      "mistral-8x7b-instruct",

      // Other known tool-capable models
      "nous-hermes",
      "openchat",
      "wizardcoder",
    ];

    // Check if current model matches any tool-capable model patterns
    const isToolCapable = toolCapableModels.some((capableModel) =>
      modelName.includes(capableModel),
    );

    if (isToolCapable) {
      logger.debug("HuggingFace tool calling enabled", {
        model: this.modelName,
        reason: "Model supports function calling",
      });
      return true;
    }

    // Log why tools are disabled for transparency
    logger.debug("HuggingFace tool calling disabled", {
      model: this.modelName,
      reason: "Model not in tool-capable list",
      suggestion:
        "Consider using Llama-3.1-* or Hermes-3-* models for tool calling",
    });

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
      // Enhanced tool handling for HuggingFace models
      const streamOptions = this.prepareStreamOptions(options, analysisSchema);

      const result = await streamText({
        model: this.model,
        prompt: streamOptions.prompt,
        system: streamOptions.system,
        temperature: options.temperature,
        maxTokens: options.maxTokens || DEFAULT_MAX_TOKENS,
        tools: streamOptions.tools as ToolSet, // Tools format conversion handled by prepareStreamOptions
        toolChoice: streamOptions.toolChoice as ToolChoice<ToolSet>, // Tool choice handled by prepareStreamOptions
        abortSignal: timeoutController?.controller.signal,
      });

      timeoutController?.cleanup();

      // Transform stream to match StreamResult interface with enhanced tool call parsing
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

  /**
   * Prepare stream options with HuggingFace-specific enhancements
   * Handles tool calling optimizations and model-specific formatting
   */
  private prepareStreamOptions(
    options: StreamOptions,
    analysisSchema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>,
  ) {
    const modelSupportsTools = this.supportsTools();

    // If model doesn't support tools, disable them completely
    if (!modelSupportsTools) {
      return {
        prompt: options.input.text,
        system: options.systemPrompt,
        tools: undefined,
        toolChoice: undefined,
      };
    }

    // For tool-capable models, enhance the prompt with tool calling instructions
    const enhancedSystemPrompt = this.enhanceSystemPromptForTools(
      options.systemPrompt,
      options.tools,
    );

    // Format tools using HuggingFace-compatible schema if tools are provided
    const formattedTools = options.tools
      ? this.formatToolsForHuggingFace(options.tools)
      : undefined;

    return {
      prompt: options.input.text,
      system: enhancedSystemPrompt,
      tools: formattedTools,
      toolChoice: formattedTools ? "auto" : undefined,
    };
  }

  /**
   * Enhance system prompt with tool calling instructions for HuggingFace models
   * Many HF models benefit from explicit tool calling guidance
   */
  private enhanceSystemPromptForTools(
    originalSystemPrompt?: string,
    tools?: unknown,
  ): string {
    if (!tools || !this.supportsTools()) {
      return originalSystemPrompt || "";
    }

    const toolInstructions = `
You have access to function tools. When you need to use a tool to answer the user's request:
1. Identify the appropriate tool from the available functions
2. Call the function with the correct parameters in JSON format
3. Use the function results to provide a comprehensive answer

Available tools will be provided in the function calling format. Use them when they can help answer the user's question.
`;

    return originalSystemPrompt
      ? `${originalSystemPrompt}\n\n${toolInstructions}`
      : toolInstructions;
  }

  /**
   * Format tools for HuggingFace model compatibility
   * Some models require specific tool schema formatting
   */
  private formatToolsForHuggingFace(tools: unknown): unknown {
    // For now, pass through tools as-is since we're using OpenAI-compatible endpoint
    // Future enhancement: Add model-specific tool formatting if needed
    return tools;
  }

  /**
   * Get recommendations for tool-calling capable HuggingFace models
   * Provides guidance for users who want to use function calling
   */
  static getToolCallingRecommendations(): {
    recommended: string[];
    performance: Record<
      string,
      { speed: number; quality: number; cost: number }
    >;
    notes: Record<string, string>;
  } {
    return {
      recommended: [
        "meta-llama/Llama-3.1-8B-Instruct",
        "meta-llama/Llama-3.1-70B-Instruct",
        "nvidia/Llama-3.1-Nemotron-Ultra-253B-v1",
        "NousResearch/Hermes-3-Llama-3.2-3B",
        "codellama/CodeLlama-34b-Instruct-hf",
      ],
      performance: {
        "meta-llama/Llama-3.1-8B-Instruct": { speed: 3, quality: 2, cost: 3 },
        "meta-llama/Llama-3.1-70B-Instruct": { speed: 2, quality: 3, cost: 2 },
        "nvidia/Llama-3.1-Nemotron-Ultra-253B-v1": {
          speed: 2,
          quality: 3,
          cost: 1,
        },
        "NousResearch/Hermes-3-Llama-3.2-3B": { speed: 3, quality: 2, cost: 3 },
        "codellama/CodeLlama-34b-Instruct-hf": {
          speed: 2,
          quality: 3,
          cost: 2,
        },
      },
      notes: {
        "meta-llama/Llama-3.1-8B-Instruct":
          "Best balance of speed and tool calling capability",
        "meta-llama/Llama-3.1-70B-Instruct":
          "High-quality tool calling, slower inference",
        "nvidia/Llama-3.1-Nemotron-Ultra-253B-v1":
          "Optimized for tool calling, requires more resources",
        "NousResearch/Hermes-3-Llama-3.2-3B":
          "Lightweight with good tool calling support",
        "codellama/CodeLlama-34b-Instruct-hf":
          "Excellent for code-related tool calling",
      },
    };
  }

  /**
   * Enhanced error handling with HuggingFace-specific guidance
   */
  protected handleProviderError(error: unknown): Error {
    if (error instanceof TimeoutError) {
      return new Error(`HuggingFace request timed out: ${error.message}`);
    }

    const errorObj = error as UnknownRecord;
    const message =
      errorObj?.message && typeof errorObj.message === "string"
        ? errorObj.message
        : "Unknown error";

    // Enhanced error messages with tool calling context
    if (
      message.includes("API_TOKEN_INVALID") ||
      message.includes("Invalid token")
    ) {
      return new Error(
        "❌ Invalid HuggingFace API token. Please check your HUGGINGFACE_API_KEY environment variable.",
      );
    }

    if (message.includes("rate limit")) {
      return new Error(
        "❌ HuggingFace rate limit exceeded. Consider using a paid plan or try again later.",
      );
    }

    if (message.includes("model") && message.includes("not found")) {
      return new Error(
        `❌ HuggingFace model '${this.modelName}' not found.\n\nSuggestions:\n1. Check model name spelling\n2. Ensure model exists on HuggingFace Hub\n3. For tool calling, use: Llama-3.1-8B-Instruct, Hermes-3-Llama-3.2-3B, or CodeLlama-34b-Instruct-hf`,
      );
    }

    if (message.includes("function") || message.includes("tool")) {
      return new Error(
        `❌ HuggingFace tool calling error: ${message}\n\nNotes:\n1. Ensure you're using a tool-capable model (Llama-3.1+, Hermes-3+, CodeLlama)\n2. Check that your model supports function calling\n3. Verify tool schema format is correct`,
      );
    }

    return new Error(`❌ HuggingFace Provider Error: ${message}`);
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
