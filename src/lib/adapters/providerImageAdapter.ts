/**
 * Provider Image Adapter - Smart routing for multimodal content
 * Handles provider-specific image formatting and vision capability validation
 */

import { logger } from "../utils/logger.js";
import { ImageProcessor } from "../utils/imageProcessor.js";
import type { Content } from "../types/multimodal.js";

/**
 * Simplified logger for essential error reporting only
 */
export class MultimodalLogger {
  static logError(step: string, error: Error, context: unknown) {
    logger.error(`Multimodal ${step} failed: ${error.message}`);
    if (process.env.NODE_ENV === "development") {
      logger.error("Context:", JSON.stringify(context, null, 2));
      logger.error("Stack:", error.stack);
    }
  }
}

/**
 * Vision capability definitions for each provider
 */
const VISION_CAPABILITIES = {
  openai: [
    // GPT-5 family (released Aug 2025)
    "gpt-5",
    "gpt-5-2025-08-07",
    "gpt-5-pro",
    "gpt-5-mini",
    "gpt-5-nano",
    // GPT-4.1 family (released Apr 2025)
    "gpt-4.1",
    "gpt-4.1-mini",
    "gpt-4.1-nano",
    // o-series reasoning models (released Apr 2025)
    "o3",
    "o3-mini",
    "o4",
    "o4-mini",
    "o4-mini-deep-research",
    // Existing GPT-4 models
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-4-turbo",
    "gpt-4-vision-preview",
  ],
  "google-ai": [
    "gemini-2.5-pro",
    "gemini-2.5-flash",
    "gemini-1.5-pro",
    "gemini-1.5-flash",
    "gemini-pro-vision",
  ],
  anthropic: [
    "claude-3-7-sonnet",
    "claude-3-5-sonnet",
    "claude-haiku-4-5",
    "claude-3-opus",
    "claude-3-sonnet",
    "claude-3-haiku",
  ],
  azure: [
    // GPT-5 family
    "gpt-5",
    "gpt-5-pro",
    "gpt-5-mini",
    // GPT-4.1 family
    "gpt-4.1",
    "gpt-4.1-mini",
    "gpt-4.1-nano",
    // Existing GPT-4
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-4-turbo",
    "gpt-4-vision-preview",
    "gpt-4",
  ],
  vertex: [
    // Gemini models on Vertex AI
    "gemini-2.5-pro",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-pro",
    "gemini-1.5-flash",
    // Claude 4.x models (versioned format)
    "claude-sonnet-4-5@",
    "claude-haiku-4-5",
    "claude-sonnet-4@",
    "claude-opus-4-1@",
    "claude-opus-4@",
    // Claude 3.x models (versioned format)
    "claude-3-7-sonnet@",
    "claude-3-5-sonnet@",
    "claude-opus-3@",
    "claude-haiku-3@",
    // Claude models (non-versioned format)
    "claude-3-7-sonnet",
    "claude-3-5-sonnet",
    "claude-3-opus",
    "claude-3-sonnet",
    "claude-3-haiku",
    "claude-sonnet-4",
    "claude-sonnet-3",
    "claude-opus-3",
    "claude-haiku-3",
    "claude-haiku-4",
    // Additional patterns for compatibility
    "claude-3.5-sonnet",
    "claude-3.5-haiku",
    "claude-4.5-haiku",
    "claude-haiku-4-5",
    "claude-3.0-sonnet",
    "claude-3.0-opus",
  ],
  litellm: [
    // LiteLLM proxies to underlying providers
    // List models that support vision when going through the proxy
    "gemini-2.5-pro",
    "gemini-2.5-flash",
    "claude-sonnet-4",
    "claude-sonnet-4-5",
    "claude-opus-4-1",
    "gpt-4o",
    "gpt-4.1",
    "gpt-5",
  ],
  mistral: [
    // Mistral Small 3.2 (vision support for images: PNG, JPEG, WEBP, GIF)
    "mistral-small",
    "mistral-small-latest",
    "mistral-small-3.2",
    "mistral-small-2506",
    // Mistral Medium 3.1 (vision support)
    "mistral-medium",
    "mistral-medium-latest",
    "mistral-medium-3.1",
    // Magistral models (vision support)
    "magistral-small",
    "magistral-medium",
    // Pixtral models (specialized vision models)
    "pixtral-12b",
    "pixtral-12b-latest",
    "pixtral-large",
    "pixtral-large-latest",
  ],
  ollama: [
    // Llama 4 family (May 2025 - Best vision + tool calling)
    "llama4:scout",
    "llama4:maverick",
    // Llama 3.2 vision
    "llama3.2-vision",
    // Gemma 3 family (SigLIP vision encoder - supports tool calling + vision)
    "gemma3:4b",
    "gemma3:12b",
    "gemma3:27b",
    "gemma3:latest",
    // Mistral Small family (vision + tool calling)
    "mistral-small3.1",
    "mistral-small3.1:large",
    "mistral-small3.1:medium",
    "mistral-small3.1:small",
    // LLaVA (vision-focused)
    "llava",
  ],
  bedrock: [
    // Claude Sonnet 4.5 family (supports vision, PDFs, images)
    "claude-sonnet-4-5",
    "claude-sonnet-4.5",
    "anthropic.claude-sonnet-4-5",
    // Claude Haiku 4.5 family (supports vision, PDFs, images)
    "claude-haiku-4-5",
    "claude-haiku-4.5",
    "anthropic.claude-haiku-4-5",
    // Claude Sonnet 4 family
    "claude-sonnet-4",
    "claude-sonnet-4@",
    "anthropic.claude-sonnet-4",
    // Claude Opus 4 family
    "claude-opus-4",
    "claude-opus-4-1",
    "claude-opus-4@",
    "anthropic.claude-opus-4",
    // Claude 3.7 Sonnet
    "claude-3-7-sonnet",
    "claude-3.7-sonnet",
    "anthropic.claude-3-7-sonnet",
    // Claude 3.5 Sonnet
    "claude-3-5-sonnet",
    "claude-3.5-sonnet",
    "anthropic.claude-3-5-sonnet",
    // Claude 3 Opus
    "claude-3-opus",
    "anthropic.claude-3-opus",
    // Claude 3 Sonnet
    "claude-3-sonnet",
    "anthropic.claude-3-sonnet",
    // Claude 3 Haiku
    "claude-3-haiku",
    "anthropic.claude-3-haiku",
    // Generic anthropic.claude prefix (catches all Claude models)
    "anthropic.claude",
  ],
} as const;

/**
 * Provider alias mappings - maps aliases to their canonical provider names
 * This allows validation to work with provider aliases
 */
const PROVIDER_ALIASES: Record<string, keyof typeof VISION_CAPABILITIES> = {
  // Azure aliases
  "azure-openai": "azure",
  azureopenai: "azure",
  // Google AI aliases
  google: "google-ai",
  gemini: "google-ai",
  googleaistudio: "google-ai",
  "google-ai-studio": "google-ai",
  // Vertex aliases
  "google-vertex": "vertex",
  googlevertex: "vertex",
  // OpenAI-compatible aliases
  // (Removed: "openai-compatible", "openrouter", "vllm", "compatible" as these are handled separately)
  // Bedrock aliases
  aws: "bedrock",
};

/**
 * Provider Image Adapter - Smart routing and formatting
 */
export class ProviderImageAdapter {
  /**
   * Main adapter method - routes to provider-specific formatting
   */
  static async adaptForProvider(
    text: string,
    images: Array<Buffer | string>,
    provider: string,
    model: string,
  ): Promise<unknown> {
    try {
      // Validate provider supports vision
      this.validateVisionSupport(provider, model);

      let adaptedPayload: unknown;

      // Process images based on provider requirements
      switch (provider.toLowerCase()) {
        case "openai":
          adaptedPayload = this.formatForOpenAI(text, images);
          break;
        case "azure":
        case "azure-openai":
        case "azureopenai":
          adaptedPayload = this.formatForOpenAI(text, images);
          break;
        case "google-ai":
        case "google":
        case "gemini":
        case "googleaistudio":
        case "google-ai-studio":
          adaptedPayload = this.formatForGoogleAI(text, images);
          break;
        case "anthropic":
          adaptedPayload = this.formatForAnthropic(text, images);
          break;
        case "bedrock":
        case "aws":
          // Bedrock uses Claude models, so use Anthropic format
          adaptedPayload = this.formatForAnthropic(text, images);
          break;
        case "vertex":
        case "google-vertex":
        case "googlevertex":
          adaptedPayload = this.formatForVertex(text, images, model);
          break;
        case "litellm":
          // LiteLLM uses OpenAI-compatible format
          adaptedPayload = this.formatForOpenAI(text, images);
          break;
        case "openai-compatible":
        case "openrouter":
        case "vllm":
        case "compatible":
          // OpenAI-compatible providers use OpenAI format
          adaptedPayload = this.formatForOpenAI(text, images);
          break;
        case "mistral":
          // Mistral uses OpenAI-compatible format
          adaptedPayload = this.formatForOpenAI(text, images);
          break;
        case "ollama":
          adaptedPayload = this.formatForOpenAI(text, images);
          break;
        default: {
          // Dynamically list all supported providers from VISION_CAPABILITIES
          const supportedProviders =
            Object.keys(VISION_CAPABILITIES).join(", ");
          throw new Error(
            `Vision not supported for provider: ${provider}. Supported providers: ${supportedProviders}`,
          );
        }
      }

      return adaptedPayload;
    } catch (error) {
      MultimodalLogger.logError("ADAPTATION", error as Error, {
        provider,
        model,
        imageCount: images.length,
      });
      throw error;
    }
  }

  /**
   * Format content for OpenAI (GPT-4o format)
   */
  private static formatForOpenAI(
    text: string,
    images: Array<Buffer | string>,
  ): unknown {
    const content: unknown[] = [{ type: "text", text }];

    images.forEach((image, index) => {
      try {
        const imageUrl = ImageProcessor.processImageForOpenAI(image);
        content.push({
          type: "image_url",
          image_url: { url: imageUrl },
        });
      } catch (error) {
        MultimodalLogger.logError("PROCESS_IMAGE", error as Error, {
          index,
          provider: "openai",
        });
        throw error;
      }
    });

    return { messages: [{ role: "user", content }] };
  }

  /**
   * Format content for Google AI (Gemini format)
   */
  private static formatForGoogleAI(
    text: string,
    images: Array<Buffer | string>,
  ): unknown {
    const parts: unknown[] = [{ text }];

    images.forEach((image, index) => {
      try {
        const { mimeType, data } = ImageProcessor.processImageForGoogle(image);
        parts.push({
          inlineData: { mimeType, data },
        });
      } catch (error) {
        MultimodalLogger.logError("PROCESS_IMAGE", error as Error, {
          index,
          provider: "google-ai",
        });
        throw error;
      }
    });

    return { contents: [{ parts }] };
  }

  /**
   * Format content for Anthropic (Claude format)
   */
  private static formatForAnthropic(
    text: string,
    images: Array<Buffer | string>,
  ): unknown {
    const content: unknown[] = [{ type: "text", text }];

    images.forEach((image, index) => {
      try {
        const { mediaType, data } =
          ImageProcessor.processImageForAnthropic(image);
        content.push({
          type: "image",
          source: {
            type: "base64",
            media_type: mediaType,
            data,
          },
        });
      } catch (error) {
        MultimodalLogger.logError("PROCESS_IMAGE", error as Error, {
          index,
          provider: "anthropic",
        });
        throw error;
      }
    });

    return { messages: [{ role: "user", content }] };
  }

  /**
   * Format content for Vertex AI (model-specific routing)
   */
  private static formatForVertex(
    text: string,
    images: Array<Buffer | string>,
    model: string,
  ): unknown {
    // Route based on model type
    if (model.includes("gemini")) {
      return this.formatForGoogleAI(text, images);
    } else if (model.includes("claude")) {
      return this.formatForAnthropic(text, images);
    } else {
      return this.formatForGoogleAI(text, images);
    }
  }

  /**
   * Validate that provider and model support vision
   */
  private static validateVisionSupport(provider: string, model: string): void {
    const normalizedProvider = provider.toLowerCase();

    // Check if provider is an alias and resolve to canonical name
    const canonicalProvider =
      PROVIDER_ALIASES[normalizedProvider] || normalizedProvider;

    const supportedModels =
      VISION_CAPABILITIES[
        canonicalProvider as keyof typeof VISION_CAPABILITIES
      ];

    if (!supportedModels) {
      throw new Error(
        `Provider ${provider} does not support vision processing. ` +
          `Supported providers: ${Object.keys(VISION_CAPABILITIES).join(", ")}`,
      );
    }

    const isSupported = supportedModels.some((supportedModel) =>
      model.toLowerCase().includes(supportedModel.toLowerCase()),
    );

    if (!isSupported) {
      throw new Error(
        `Provider ${provider} with model ${model} does not support vision processing. ` +
          `Supported models for ${provider}: ${supportedModels.join(", ")}`,
      );
    }
  }

  /**
   * Convert simple images array to advanced content format
   */
  static convertToContent(
    text: string,
    images?: Array<Buffer | string>,
  ): Content[] {
    const content: Content[] = [{ type: "text", text }];

    if (images && images.length > 0) {
      images.forEach((image) => {
        content.push({
          type: "image",
          data: image,
          mediaType: ImageProcessor.detectImageType(image) as
            | "image/jpeg"
            | "image/png"
            | "image/gif"
            | "image/webp"
            | "image/bmp"
            | "image/tiff",
        });
      });
    }

    return content;
  }

  /**
   * Check if provider supports multimodal content
   */
  static supportsVision(provider: string, model?: string): boolean {
    try {
      const normalizedProvider = provider.toLowerCase();

      // Check if provider is an alias and resolve to canonical name
      const canonicalProvider =
        PROVIDER_ALIASES[normalizedProvider] || normalizedProvider;

      const supportedModels =
        VISION_CAPABILITIES[
          canonicalProvider as keyof typeof VISION_CAPABILITIES
        ];

      if (!supportedModels) {
        return false;
      }

      if (!model) {
        return true; // Provider supports vision, but need to check specific model
      }

      return supportedModels.some((supportedModel) =>
        model.toLowerCase().includes(supportedModel.toLowerCase()),
      );
    } catch {
      return false;
    }
  }

  /**
   * Get supported models for a provider
   */
  static getSupportedModels(provider: string): string[] {
    const normalizedProvider = provider.toLowerCase();

    // Check if provider is an alias and resolve to canonical name
    const canonicalProvider =
      PROVIDER_ALIASES[normalizedProvider] || normalizedProvider;

    const models =
      VISION_CAPABILITIES[
        canonicalProvider as keyof typeof VISION_CAPABILITIES
      ];
    return models ? [...models] : [];
  }

  /**
   * Get all vision-capable providers
   */
  static getVisionProviders(): string[] {
    return Object.keys(VISION_CAPABILITIES);
  }
}
