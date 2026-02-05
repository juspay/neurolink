/**
 * Image Generation Service
 *
 * Handles AI image generation using NeuroLink SDK with configurable providers
 * and models. Supports reference images and PDFs for contextual generation.
 *
 * @packageDocumentation
 * @module @juspay/neurolink/image-gen
 * @category ImageGeneration
 *
 * @example
 * ```typescript
 * import { ImageGenService } from '@juspay/neurolink';
 *
 * const service = new ImageGenService();
 *
 * const result = await service.generate({
 *   prompt: 'A serene mountain landscape at sunset',
 *   style: 'photorealistic',
 *   aspectRatio: '16:9'
 * });
 *
 * if (result.success && result.imageBuffer) {
 *   fs.writeFileSync('output.png', result.imageBuffer);
 * }
 * ```
 */

import { withTimeout } from "../utils/errorHandling.js";
import type {
  ImageGenConfig,
  ImageGenOptions,
  ImageGenResult,
} from "./types.js";
import { DEFAULT_IMAGE_GEN_CONFIG } from "./types.js";

/**
 * NeuroLink instance type (avoiding circular dependencies)
 */
type NeuroLinkInstance = {
  generate: (options: Record<string, unknown>) => Promise<unknown>;
};

/**
 * Image generation service for AI-powered image creation
 *
 * Uses NeuroLink SDK to generate images with support for:
 * - Multiple providers (Vertex AI, OpenAI, etc.)
 * - Reference images for style guidance
 * - PDF documents for contextual generation
 * - Configurable aspect ratios and styles
 *
 * @example Basic usage
 * ```typescript
 * const service = new ImageGenService();
 * const result = await service.generate({
 *   prompt: 'A cute robot playing chess'
 * });
 * ```
 *
 * @example With custom configuration
 * ```typescript
 * const service = new ImageGenService({
 *   defaultProvider: 'openai',
 *   defaultModel: 'dall-e-3',
 *   timeout: 60000
 * });
 * ```
 */
export class ImageGenService {
  private config: ImageGenConfig;
  private neurolinkInstance: NeuroLinkInstance | null = null;
  private instanceId: string;

  /**
   * Create a new ImageGenService instance
   *
   * @param config - Optional configuration overrides
   */
  constructor(config?: Partial<ImageGenConfig>) {
    this.config = {
      ...DEFAULT_IMAGE_GEN_CONFIG,
      ...config,
    };
    this.instanceId = `ImageGenService-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Get or create the NeuroLink instance
   * Uses dynamic import to avoid circular dependencies
   *
   * @returns NeuroLink instance for image generation
   */
  private async getNeuroLink(): Promise<NeuroLinkInstance> {
    if (!this.neurolinkInstance) {
      // Dynamically import to avoid circular dependencies
      const { NeuroLink } = await import("../neurolink.js");
      this.neurolinkInstance = new NeuroLink({
        conversationMemory: { enabled: false },
        enableOrchestration: false,
      }) as unknown as NeuroLinkInstance;
    }
    return this.neurolinkInstance;
  }

  /**
   * Generate an image from a text prompt
   *
   * @param options - Generation options including prompt, style, etc.
   * @returns Promise resolving to generation result
   *
   * @example Simple generation
   * ```typescript
   * const result = await service.generate({
   *   prompt: 'A futuristic cityscape'
   * });
   * ```
   *
   * @example With reference images
   * ```typescript
   * const referenceImage = fs.readFileSync('style-reference.jpg');
   * const result = await service.generate({
   *   prompt: 'A portrait in this style',
   *   images: [referenceImage],
   *   aspectRatio: '1:1'
   * });
   * ```
   */
  async generate(options: ImageGenOptions): Promise<ImageGenResult> {
    const startTime = Date.now();

    // Check if service is enabled
    if (!this.config.enabled) {
      return {
        success: false,
        error: "Image generation is disabled",
      };
    }

    // Validate prompt
    if (!options.prompt || options.prompt.trim().length === 0) {
      return {
        success: false,
        error: "Prompt is required for image generation",
      };
    }

    try {
      const neurolink = await this.getNeuroLink();

      // Build enhanced prompt with style and negative prompt
      let enhancedPrompt = options.prompt;
      if (options.style) {
        enhancedPrompt = `${options.style} style: ${enhancedPrompt}`;
      }
      if (options.negativePrompt) {
        enhancedPrompt = `${enhancedPrompt}. Avoid: ${options.negativePrompt}`;
      }

      // Build input with optional reference images/PDFs
      const input: Record<string, unknown> = { text: enhancedPrompt };

      // Process reference images
      if (options.images?.length) {
        const maxImages = this.config.maxReferenceImages ?? 5;
        const imagesToUse = options.images.slice(0, maxImages);

        // Convert Buffers to base64 strings if needed
        input.images = imagesToUse.map((img) =>
          Buffer.isBuffer(img) ? img.toString("base64") : img,
        );
      }

      // Process reference PDFs
      if (options.pdfFiles?.length) {
        const maxPdfs = this.config.maxReferencePdfs ?? 1;
        input.pdfFiles = options.pdfFiles.slice(0, maxPdfs);
      }

      // Determine provider and model
      const provider = options.provider ?? this.config.defaultProvider;
      const model = options.model ?? this.config.defaultModel;
      const region = options.region ?? this.config.defaultRegion;

      // Build generation parameters
      const generateParams: Record<string, unknown> = {
        input,
        provider,
        model,
        disableTools: true,
        temperature:
          options.temperature ?? this.config.defaultTemperature ?? 0.75,
        timeout: this.config.timeout,
      };

      // Add region if specified (for Vertex AI)
      if (region) {
        generateParams.region = region;
      }

      // Add number of images
      const maxImages = this.config.maxImages ?? 4;
      const numberOfImages = Math.min(options.numberOfImages ?? 1, maxImages);
      generateParams.numberOfImages = numberOfImages;

      // Add aspect ratio if specified
      if (options.aspectRatio) {
        generateParams.aspectRatio = options.aspectRatio;
      }

      // Call NeuroLink generate with timeout protection
      const result = await withTimeout(
        neurolink.generate(generateParams),
        this.config.timeout,
        new Error(`Image generation timed out after ${this.config.timeout}ms`),
      );

      // Extract image from result
      const imageOutput = this.extractImageFromResult(result);
      const generationTimeMs = Date.now() - startTime;

      if (imageOutput) {
        return {
          success: true,
          imageBuffer: imageOutput.imageBuffer,
          base64: imageOutput.base64,
          mimeType: imageOutput.mimeType,
          model,
          provider,
          generationTimeMs,
        };
      }

      return {
        success: false,
        error: "No image generated",
        model,
        provider,
        generationTimeMs,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Generation failed: ${errorMessage}`,
        generationTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Extract image data from various result formats
   *
   * Handles multiple output formats:
   * - result.imageOutput?.base64
   * - result.images?.[0]
   * - data:image URI in content
   * - Buffer directly
   *
   * @param result - Raw result from NeuroLink generate
   * @returns Extracted image data or null
   */
  private extractImageFromResult(
    result: unknown,
  ): { imageBuffer: Buffer; base64: string; mimeType: string } | null {
    if (!result || typeof result !== "object") {
      return null;
    }

    const res = result as Record<string, unknown>;

    // Check for imageOutput with base64
    const imageOutput = res.imageOutput ?? (res.images as unknown[])?.[0];

    if (imageOutput && typeof imageOutput === "object") {
      const img = imageOutput as Record<string, unknown>;
      if (typeof img.base64 === "string") {
        const base64 = img.base64;
        const mimeType = (img.mimeType as string) ?? "image/png";
        return {
          imageBuffer: Buffer.from(base64, "base64"),
          base64,
          mimeType,
        };
      }
    }

    // Check if imageOutput is a Buffer
    if (Buffer.isBuffer(imageOutput)) {
      const base64 = imageOutput.toString("base64");
      return {
        imageBuffer: imageOutput,
        base64,
        mimeType: "image/png",
      };
    }

    // Check for data URI format in content
    const content = res.content;
    if (typeof content === "string" && content.startsWith("data:image")) {
      const match = content.match(/^data:image\/(\w+);base64,(.+)$/);
      if (match?.[2]) {
        const mimeType = `image/${match[1]}`;
        const base64 = match[2];
        return {
          imageBuffer: Buffer.from(base64, "base64"),
          base64,
          mimeType,
        };
      }
    }

    // Check for raw base64 in content
    if (typeof content === "string" && !content.startsWith("data:")) {
      // Try to detect if it's base64 encoded image data
      try {
        const buffer = Buffer.from(content, "base64");
        // Check for PNG magic bytes
        if (buffer[0] === 0x89 && buffer[1] === 0x50) {
          return {
            imageBuffer: buffer,
            base64: content,
            mimeType: "image/png",
          };
        }
        // Check for JPEG magic bytes
        if (buffer[0] === 0xff && buffer[1] === 0xd8) {
          return {
            imageBuffer: buffer,
            base64: content,
            mimeType: "image/jpeg",
          };
        }
      } catch {
        // Not valid base64, ignore
      }
    }

    return null;
  }

  /**
   * Check if image generation is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Get the default model
   */
  getModel(): string {
    return this.config.defaultModel;
  }

  /**
   * Get the default provider
   */
  getProvider(): string {
    return this.config.defaultProvider;
  }

  /**
   * Get the service configuration
   */
  getConfig(): Readonly<ImageGenConfig> {
    return { ...this.config };
  }

  /**
   * Get the service instance ID (for debugging)
   */
  getInstanceId(): string {
    return this.instanceId;
  }

  /**
   * Update service configuration
   *
   * @param config - Partial configuration to merge
   */
  updateConfig(config: Partial<ImageGenConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };
  }

  /**
   * Enable image generation
   */
  enable(): void {
    this.config.enabled = true;
  }

  /**
   * Disable image generation
   */
  disable(): void {
    this.config.enabled = false;
  }
}
