/**
 * Provider Image Adapter - Smart routing for multimodal content
 * Handles provider-specific image formatting and vision capability validation
 */

import { logger } from "../utils/logger.js";
import { ImageProcessor } from "../utils/imageProcessor.js";
import type { Content, ImageWithAltText } from "../types/multimodal.js";

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
 * Image count limits per provider
 * These limits prevent API rejections when too many images are sent
 */
const IMAGE_LIMITS = {
  openai: 10,
  azure: 10, // Same as OpenAI
  "google-ai": 16,
  google: 16,
  anthropic: 20,
  vertex: {
    // Vertex has model-specific limits
    claude: 20, // Claude models on Vertex
    gemini: 16, // Gemini models on Vertex
    default: 16,
  },
  ollama: 10, // Conservative limit for Ollama
  litellm: 10, // Conservative limit, as it proxies to various providers
  mistral: 10, // Conservative limit for Mistral
  // Note: Bedrock limit defined for future use when vision support is added
  bedrock: 20, // Same as Anthropic for Claude models on Bedrock
  openrouter: 10, // Conservative limit, routes to various underlying providers
} as const;

/**
 * Vision capability definitions for each provider
 */
const VISION_CAPABILITIES = {
  openai: [
    // GPT-5.2 family (released Dec 11, 2025) - Latest flagship models
    "gpt-5.2",
    "gpt-5.2-chat-latest",
    "gpt-5.2-pro",
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
    "o3-pro",
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
    // Gemini 3 Series (Preview - November 2025)
    "gemini-3-pro-preview",
    "gemini-3-pro-preview-11-2025",
    "gemini-3-pro-latest",
    "gemini-3-pro-image-preview",
    // Gemini 3 Flash Series
    "gemini-3-flash",
    "gemini-3-flash-preview",
    "gemini-3-flash-latest",
    // Gemini 2.5 Series
    "gemini-2.5-pro",
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash-image",
    // Gemini 2.0 Series
    "gemini-2.0-flash",
    "gemini-2.0-flash-001",
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash-preview-image-generation",
    // Gemini 1.5 Series (Legacy)
    "gemini-1.5-pro",
    "gemini-1.5-flash",
    "gemini-pro-vision",
  ],
  anthropic: [
    // Claude 4.5 Series (September-November 2025)
    "claude-sonnet-4-5",
    "claude-sonnet-4-5-20250929",
    "claude-opus-4-5",
    "claude-opus-4-5-20251101",
    "claude-haiku-4-5",
    "claude-haiku-4-5-20251001",
    // Claude 4.1 and 4.0 Series
    "claude-opus-4-1",
    "claude-opus-4-1-20250805",
    "claude-opus-4",
    "claude-opus-4-20250514",
    "claude-sonnet-4",
    "claude-sonnet-4-20250514",
    // Claude 3.7 Series
    "claude-3-7-sonnet",
    "claude-3-7-sonnet-20250219",
    // Claude 3.5 Series
    "claude-3-5-sonnet",
    "claude-3-5-sonnet-20241022",
    // Claude 3 Series
    "claude-3-opus",
    "claude-3-sonnet",
    "claude-3-haiku",
  ],
  azure: [
    // GPT-5.1 family (December 2025)
    "gpt-5.1",
    "gpt-5.1-chat",
    "gpt-5.1-codex",
    // GPT-5 family
    "gpt-5",
    "gpt-5-pro",
    "gpt-5-turbo",
    "gpt-5-chat",
    "gpt-5-mini",
    // GPT-4.1 family
    "gpt-4.1",
    "gpt-4.1-mini",
    "gpt-4.1-nano",
    // O-series
    "o3",
    "o3-mini",
    "o3-pro",
    "o4-mini",
    // Existing GPT-4
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-4-turbo",
    "gpt-4-vision-preview",
    "gpt-4",
  ],
  vertex: [
    // Gemini 3.x models on Vertex AI (Preview)
    "gemini-3-pro-preview-11-2025",
    "gemini-3-pro-latest",
    "gemini-3-pro-preview",
    "gemini-3-pro",
    // Gemini 3 Flash Series on Vertex AI
    "gemini-3-flash",
    "gemini-3-flash-preview",
    "gemini-3-flash-latest",
    // Gemini 2.5 models on Vertex AI
    "gemini-2.5-pro",
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash-image",
    // Gemini 2.0 models on Vertex AI
    "gemini-2.0-flash-001",
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash",
    // Gemini 1.5 models on Vertex AI
    "gemini-1.5-pro",
    "gemini-1.5-flash",
    // Claude 4.5 models (versioned format - September-November 2025)
    "claude-sonnet-4-5@",
    "claude-opus-4-5@",
    "claude-haiku-4-5@",
    "claude-haiku-4-5",
    // Claude 4 models (versioned format - May 2025)
    "claude-sonnet-4@",
    "claude-opus-4@",
    "claude-opus-4-1@",
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
    "claude-4.5-sonnet",
    "claude-4.5-opus",
    "claude-4.5-haiku",
    "claude-haiku-4-5",
    "claude-3.0-sonnet",
    "claude-3.0-opus",
  ],
  litellm: [
    // LiteLLM proxies to underlying providers
    // List models that support vision when going through the proxy
    // OpenAI models via LiteLLM
    "openai/gpt-5",
    "openai/gpt-4o",
    "openai/gpt-4o-mini",
    "openai/gpt-4-turbo",
    "gpt-5",
    "gpt-4o",
    "gpt-4.1",
    // Anthropic models via LiteLLM
    "anthropic/claude-sonnet-4-5-20250929",
    "anthropic/claude-opus-4-1-20250805",
    "anthropic/claude-3-5-sonnet-20240620",
    "claude-sonnet-4-5",
    "claude-sonnet-4-5-20250929",
    "claude-opus-4-5",
    "claude-opus-4-5-20251101",
    "claude-haiku-4-5-20251001",
    "claude-sonnet-4",
    "claude-opus-4-1",
    // Gemini models via LiteLLM
    "vertex_ai/gemini-2.5-pro",
    "gemini/gemini-2.5-pro",
    "gemini/gemini-2.0-flash",
    "gemini-3-pro-preview",
    "gemini-3-pro-latest",
    "gemini-3-flash",
    "gemini-3-flash-preview",
    "gemini-3-flash-latest",
    "gemini-2.5-pro",
    "gemini-2.5-flash",
    "gemini-2.0-flash-lite",
    // Groq models via LiteLLM (vision)
    "groq/llama-3.2-11b-vision-preview",
  ],
  openrouter: [
    // OpenRouter provides access to vision-capable models from multiple providers
    // Anthropic Claude models (via OpenRouter)
    "anthropic/claude-3-5-sonnet",
    "anthropic/claude-3-5-haiku",
    "anthropic/claude-3-opus",
    "anthropic/claude-3-sonnet",
    "anthropic/claude-3-haiku",
    // OpenAI models (via OpenRouter)
    "openai/gpt-4o",
    "openai/gpt-4o-mini",
    "openai/gpt-4-turbo",
    "openai/gpt-4-vision-preview",
    // Google models (via OpenRouter)
    "google/gemini-2.5-pro",
    "google/gemini-2.5-flash",
    "google/gemini-2.0-flash",
    "google/gemini-2.0-flash-001",
    "google/gemini-1.5-pro",
    "google/gemini-1.5-flash",
    "google/gemini-pro-vision",
    // Meta Llama models (vision-capable via OpenRouter)
    "meta-llama/llama-3.2-90b-vision-instruct",
    "meta-llama/llama-3.2-11b-vision-instruct",
    // Pixtral/Mistral models (via OpenRouter)
    "mistralai/pixtral-12b",
    "mistralai/pixtral-large",
    // Qwen models (via OpenRouter)
    "qwen/qwen-2-vl-72b-instruct",
    "qwen/qwen-2-vl-7b-instruct",
  ],
  mistral: [
    // Mistral Large (latest has vision via Pixtral integration)
    "mistral-large-latest",
    "mistral-large-2512",
    // Mistral Small 3.2 (vision support for images: PNG, JPEG, WEBP, GIF)
    "mistral-small",
    "mistral-small-latest",
    "mistral-small-3.2",
    "mistral-small-2506",
    // Mistral Medium 3.1 (vision support)
    "mistral-medium",
    "mistral-medium-latest",
    "mistral-medium-3.1",
    "mistral-medium-2508",
    // Magistral models (vision support)
    "magistral-small",
    "magistral-small-latest",
    "magistral-medium",
    "magistral-medium-latest",
    // Pixtral models (specialized vision models)
    "pixtral-12b",
    "pixtral-12b-latest",
    "pixtral-large",
    "pixtral-large-latest",
    "pixtral-large-2502",
  ],
  ollama: [
    // Llama 4 family (May 2025 - Best vision + tool calling)
    "llama4:scout",
    "llama4:maverick",
    "llama4:latest",
    "llama4",
    // Llama 3.2 vision variants
    "llama3.2-vision",
    "llama3.2-vision:11b",
    "llama3.2-vision:90b",
    // Gemma 3 family (SigLIP vision encoder - supports tool calling + vision)
    "gemma3",
    "gemma3:4b",
    "gemma3:12b",
    "gemma3:27b",
    "gemma3:latest",
    // Qwen 2.5 VL (Vision-Language)
    "qwen2.5-vl",
    "qwen2.5-vl:72b",
    "qwen2.5-vl:32b",
    // Mistral Small family (vision + tool calling)
    "mistral-small3.1",
    "mistral-small3.1:large",
    "mistral-small3.1:medium",
    "mistral-small3.1:small",
    // LLaVA (vision-focused)
    "llava",
    "llava:7b",
    "llava:13b",
    "llava:34b",
    "llava-llama3",
    "llava-llama3:8b",
  ],
  bedrock: [
    // Amazon Nova models (December 2024+) - multimodal vision support
    "amazon.nova-premier",
    "amazon.nova-premier-v1:0",
    "amazon.nova-pro",
    "amazon.nova-pro-v1:0",
    "amazon.nova-lite",
    "amazon.nova-lite-v1:0",
    "amazon.nova-2-lite-v1:0",
    "nova-premier",
    "nova-pro",
    "nova-lite",
    // Claude 4.5 family (supports vision, PDFs, images - September-November 2025)
    "claude-sonnet-4-5",
    "claude-sonnet-4.5",
    "anthropic.claude-sonnet-4-5",
    "anthropic.claude-sonnet-4-5-20250929-v1:0",
    "claude-opus-4-5",
    "claude-opus-4.5",
    "anthropic.claude-opus-4-5",
    "anthropic.claude-opus-4-5-20251124-v1:0",
    "claude-haiku-4-5",
    "claude-haiku-4.5",
    "anthropic.claude-haiku-4-5",
    "anthropic.claude-haiku-4-5-20251001-v1:0",
    // Claude 4 family (May 2025)
    "claude-sonnet-4",
    "claude-sonnet-4@",
    "anthropic.claude-sonnet-4",
    "anthropic.claude-sonnet-4-20250514-v1:0",
    "claude-opus-4",
    "claude-opus-4-1",
    "claude-opus-4@",
    "anthropic.claude-opus-4",
    "anthropic.claude-opus-4-1-20250805-v1:0",
    // Claude 3.7 Sonnet
    "claude-3-7-sonnet",
    "claude-3.7-sonnet",
    "anthropic.claude-3-7-sonnet",
    "anthropic.claude-3-7-sonnet-20250219-v1:0",
    // Claude 3.5 Sonnet
    "claude-3-5-sonnet",
    "claude-3.5-sonnet",
    "anthropic.claude-3-5-sonnet",
    "anthropic.claude-3-5-sonnet-20241022-v1:0",
    // Claude 3 Opus
    "claude-3-opus",
    "anthropic.claude-3-opus",
    // Claude 3 Sonnet
    "claude-3-sonnet",
    "anthropic.claude-3-sonnet",
    // Claude 3 Haiku
    "claude-3-haiku",
    "anthropic.claude-3-haiku",
    // Meta Llama 4 models (multimodal vision)
    "meta.llama4-maverick-17b-instruct-v1:0",
    "meta.llama4-scout-17b-instruct-v1:0",
    // Meta Llama 3.2 vision models
    "meta.llama3-2-90b-instruct-v1:0",
    "meta.llama3-2-11b-instruct-v1:0",
    // Mistral Pixtral (multimodal vision)
    "mistral.pixtral-large-2502-v1:0",
    // Generic anthropic.claude prefix (catches all Claude models)
    "anthropic.claude",
  ],
  huggingface: [
    // Qwen 2.5 VL (Vision-Language)
    "Qwen/Qwen2.5-VL-32B-Instruct",
    "Qwen/Qwen2.5-VL-7B-Instruct",
    // Microsoft Phi-3 Vision
    "microsoft/Phi-3-vision-128k-instruct",
    // LLaVA variants
    "llava-hf/llava-1.5-7b-hf",
    "llava-hf/llava-v1.6-mistral-7b-hf",
  ],
  sagemaker: [
    // Meta Llama 4 vision models
    "meta-llama-4-maverick-17b-128e-instruct",
    "meta-llama-4-scout-17b-16e-instruct",
  ],
} as const;

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
          // Azure uses same format as OpenAI but validate with azure provider name
          this.validateImageCount(images.length, "azure");
          adaptedPayload = this.formatForOpenAI(text, images, true);
          break;
        case "google-ai":
        case "google":
          adaptedPayload = this.formatForGoogleAI(text, images);
          break;
        case "anthropic":
          adaptedPayload = this.formatForAnthropic(text, images);
          break;
        case "vertex":
          adaptedPayload = this.formatForVertex(text, images, model);
          break;
        case "ollama":
          // Ollama uses same format as OpenAI but validate with ollama provider name
          this.validateImageCount(images.length, "ollama");
          adaptedPayload = this.formatForOpenAI(text, images, true);
          break;
        case "huggingface":
          adaptedPayload = this.formatForOpenAI(text, images);
          break;
        case "sagemaker":
          adaptedPayload = this.formatForOpenAI(text, images);
          break;
        case "litellm":
          // LiteLLM uses same format as OpenAI but validate with litellm provider name
          this.validateImageCount(images.length, "litellm");
          adaptedPayload = this.formatForOpenAI(text, images, true);
          break;
        case "mistral":
          // Mistral uses same format as OpenAI but validate with mistral provider name
          this.validateImageCount(images.length, "mistral");
          adaptedPayload = this.formatForOpenAI(text, images, true);
          break;
        case "bedrock":
          // Bedrock uses same format as Anthropic but validate with bedrock provider name
          this.validateImageCount(images.length, "bedrock");
          adaptedPayload = this.formatForAnthropic(text, images, true);
          break;
        case "openrouter":
          // OpenRouter routes to underlying providers, use OpenAI format
          this.validateImageCount(images.length, "openrouter");
          adaptedPayload = this.formatForOpenAI(text, images);
          break;
        default:
          throw new Error(`Vision not supported for provider: ${provider}`);
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
    skipValidation = false,
  ): unknown {
    // Validate image count before processing (unless called from another formatter)
    if (!skipValidation) {
      this.validateImageCount(images.length, "openai");
    }

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
    skipValidation = false,
  ): unknown {
    // Validate image count before processing (unless called from another formatter)
    if (!skipValidation) {
      this.validateImageCount(images.length, "google-ai");
    }

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
    skipValidation = false,
  ): unknown {
    // Validate image count before processing (unless called from another formatter)
    if (!skipValidation) {
      this.validateImageCount(images.length, "anthropic");
    }

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
    // Validate image count with model-specific limits before processing
    this.validateImageCount(images.length, "vertex", model);

    // Route based on model type, skip validation in delegated methods
    if (model.includes("gemini")) {
      return this.formatForGoogleAI(text, images, true);
    } else if (model.includes("claude")) {
      return this.formatForAnthropic(text, images, true);
    } else {
      return this.formatForGoogleAI(text, images, true);
    }
  }

  /**
   * Validate image count against provider limits
   * Warns at 80% threshold, throws error if limit exceeded
   */
  private static validateImageCount(
    imageCount: number,
    provider: string,
    model?: string,
  ): void {
    const normalizedProvider = provider.toLowerCase();
    let limit: number;

    // Determine the limit based on provider
    if (normalizedProvider === "vertex" && model) {
      // Vertex has model-specific limits
      if (model.includes("claude")) {
        limit = IMAGE_LIMITS.vertex.claude;
      } else if (model.includes("gemini")) {
        limit = IMAGE_LIMITS.vertex.gemini;
      } else {
        limit = IMAGE_LIMITS.vertex.default;
      }
    } else {
      // Use provider-specific limit
      const providerLimit =
        normalizedProvider in IMAGE_LIMITS
          ? IMAGE_LIMITS[normalizedProvider as keyof typeof IMAGE_LIMITS]
          : undefined;

      // If provider not found in limits map, use a conservative default
      if (providerLimit === undefined) {
        // Conservative default for unknown providers
        limit = 10;
        logger.warn(
          `Image count limit not defined for provider ${provider}. Using conservative default of 10 images.`,
        );
      } else {
        // providerLimit is always a number when defined (except vertex which is handled separately)
        limit = providerLimit as number;
      }
    }

    // Warn only once at 80% threshold to avoid noise in batch processing
    const warningThreshold = Math.floor(limit * 0.8);
    if (imageCount === warningThreshold) {
      logger.warn(
        `Image count (${imageCount}) is approaching the limit for ${provider}. ` +
          `Maximum allowed: ${limit}. Please reduce the number of images.`,
      );
    }

    // Throw error if limit exceeded
    if (imageCount > limit) {
      throw new Error(
        `Image count (${imageCount}) exceeds the maximum limit for ${provider}. ` +
          `Maximum allowed: ${limit}. Please reduce the number of images.`,
      );
    }
  }

  /**
   * Validate that provider and model support vision
   */
  private static validateVisionSupport(provider: string, model: string): void {
    const normalizedProvider = provider.toLowerCase();
    const supportedModels =
      VISION_CAPABILITIES[
        normalizedProvider as keyof typeof VISION_CAPABILITIES
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
   * @param text - Text content to include
   * @param images - Array of images (Buffer, string, or ImageWithAltText)
   */
  static convertToContent(
    text: string,
    images?: Array<Buffer | string | ImageWithAltText>,
  ): Content[] {
    const content: Content[] = [{ type: "text", text }];

    if (images && images.length > 0) {
      images.forEach((image) => {
        // Handle both simple images and images with alt text
        const imageData =
          typeof image === "object" &&
          "data" in image &&
          !Buffer.isBuffer(image)
            ? image.data
            : (image as Buffer | string);
        const altText =
          typeof image === "object" &&
          "data" in image &&
          !Buffer.isBuffer(image)
            ? image.altText
            : undefined;

        content.push({
          type: "image",
          data: imageData,
          altText,
          mediaType: ImageProcessor.detectImageType(imageData) as
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
      const supportedModels =
        VISION_CAPABILITIES[
          normalizedProvider as keyof typeof VISION_CAPABILITIES
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
    const models =
      VISION_CAPABILITIES[
        normalizedProvider as keyof typeof VISION_CAPABILITIES
      ];
    return models ? [...models] : [];
  }

  /**
   * Get all vision-capable providers
   */
  static getVisionProviders(): string[] {
    return Object.keys(VISION_CAPABILITIES);
  }

  /**
   * Count total "images" in a message (actual images + PDF pages)
   * PDF pages count toward image limits for providers
   */
  static countImagesInMessage(
    images: Array<Buffer | string>,
    pdfPages?: number | null,
  ): number {
    const imageCount = images?.length || 0;
    const pageCount = pdfPages ?? 0;
    return imageCount + pageCount;
  }

  /**
   * Extract page count from PDF metadata array
   * Returns total pages across all PDFs
   */
  static countImagesInPages(
    pdfMetadataArray: Array<{ pageCount?: number | null }> | undefined,
  ): number {
    if (!pdfMetadataArray || pdfMetadataArray.length === 0) {
      return 0;
    }
    return pdfMetadataArray.reduce((total, pdf) => {
      return total + (pdf.pageCount ?? 0);
    }, 0);
  }
}
