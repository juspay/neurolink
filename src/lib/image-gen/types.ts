/**
 * Image Generation Service Types
 *
 * Type definitions for AI-powered image generation with support for
 * reference images, PDFs, and configurable providers/models.
 *
 * @packageDocumentation
 * @module @juspay/neurolink/image-gen
 * @category ImageGeneration
 */

/**
 * Supported image generation providers
 */
export type ImageGenProvider = "vertex" | "openai" | "anthropic" | "bedrock";

/**
 * Supported aspect ratios
 */
export type AspectRatio =
  | "1:1"
  | "16:9"
  | "9:16"
  | "4:3"
  | "3:4"
  | "3:2"
  | "2:3";

/**
 * Supported style presets
 */
export type StylePreset =
  | "realistic"
  | "photorealistic"
  | "artistic"
  | "cartoon"
  | "anime"
  | "watercolor"
  | "oil-painting"
  | "sketch"
  | "digital-art"
  | "3d-render";

/**
 * Options for image generation requests
 */
export type ImageGenOptions = {
  /**
   * Text prompt describing the image to generate
   * Should be detailed and specific for best results
   */
  prompt: string;

  /**
   * Reference images for style/content guidance (optional)
   * Can be Buffer (raw data) or string (base64 encoded)
   * Max 5 images recommended
   */
  images?: (Buffer | string)[];

  /**
   * Reference PDF files for context (optional)
   * Used for generating images based on document content
   * Max 1 PDF recommended
   */
  pdfFiles?: Buffer[];

  /**
   * Override default model
   * e.g., "imagen-3.0-generate-001", "dall-e-3"
   */
  model?: string;

  /**
   * Override default provider
   * e.g., "vertex", "openai"
   */
  provider?: ImageGenProvider | string;

  /**
   * Region for provider (e.g., for Vertex AI)
   */
  region?: string;

  /**
   * What to avoid in the generated image (optional)
   * e.g., "blurry, low quality, text overlays"
   */
  negativePrompt?: string;

  /**
   * Aspect ratio for the generated image
   * e.g., "16:9", "1:1", "4:3", "9:16"
   */
  aspectRatio?: AspectRatio | string;

  /**
   * Style preset for the image
   * e.g., "realistic", "artistic", "cartoon", "watercolor", "photorealistic"
   */
  style?: StylePreset | string;

  /**
   * Number of images to generate (default: 1)
   */
  numberOfImages?: number;

  /**
   * Sampling temperature for generation (0-1)
   * Higher values = more creative/random
   */
  temperature?: number;
};

/**
 * Result of an image generation request
 */
export type ImageGenResult = {
  /**
   * Whether generation was successful
   */
  success: boolean;

  /**
   * Generated image as Buffer (if successful)
   */
  imageBuffer?: Buffer;

  /**
   * Generated image as base64 string (if successful)
   */
  base64?: string;

  /**
   * MIME type of the generated image
   * e.g., "image/png", "image/jpeg"
   */
  mimeType?: string;

  /**
   * Model used for generation
   */
  model?: string;

  /**
   * Provider used for generation
   */
  provider?: string;

  /**
   * Error message if generation failed
   */
  error?: string;

  /**
   * Time taken for generation in milliseconds
   */
  generationTimeMs?: number;

  /**
   * Additional metadata from the provider
   */
  metadata?: Record<string, unknown>;
};

/**
 * Configuration for the ImageGenService
 */
export type ImageGenConfig = {
  /**
   * Whether image generation is enabled
   */
  enabled: boolean;

  /**
   * Default model to use for generation
   */
  defaultModel: string;

  /**
   * Default provider for image generation
   */
  defaultProvider: ImageGenProvider | string;

  /**
   * Default region for the provider (if applicable)
   */
  defaultRegion?: string;

  /**
   * Timeout for generation requests in milliseconds
   */
  timeout: number;

  /**
   * Default temperature for generation
   */
  defaultTemperature?: number;

  /**
   * Maximum number of images per request
   */
  maxImages?: number;

  /**
   * Maximum number of reference images allowed
   */
  maxReferenceImages?: number;

  /**
   * Maximum number of reference PDFs allowed
   */
  maxReferencePdfs?: number;
};

/**
 * Default configuration for image generation
 */
export const DEFAULT_IMAGE_GEN_CONFIG: ImageGenConfig = {
  enabled: true,
  defaultModel: "imagen-3.0-generate-001",
  defaultProvider: "vertex",
  defaultRegion: "global",
  timeout: 120000,
  defaultTemperature: 0.75,
  maxImages: 4,
  maxReferenceImages: 5,
  maxReferencePdfs: 1,
};

/**
 * Tool parameters for AI model use
 */
export type ImageGenToolParams = {
  /**
   * Detailed description of the image to generate
   */
  prompt: string;

  /**
   * What to avoid in the generated image (optional)
   */
  negativePrompt?: string;

  /**
   * Aspect ratio like "16:9", "1:1", "4:3" (optional)
   */
  aspectRatio?: AspectRatio | string;

  /**
   * Style like "realistic", "artistic", "cartoon" (optional)
   */
  style?: StylePreset | string;
};

/**
 * Response from the image generation tool
 */
export type ImageGenToolResponse = {
  /**
   * Whether the tool execution was successful
   */
  success: boolean;

  /**
   * Data URI of the generated image (if successful)
   * Format: data:image/png;base64,...
   */
  image?: string;

  /**
   * Human-readable message about the result
   */
  message?: string;

  /**
   * Error message if execution failed
   */
  error?: string;
};

/**
 * Context for tool execution (optional)
 */
export type ImageGenToolContext = {
  /**
   * Reference images to use for generation
   */
  referenceImages?: (Buffer | string)[];

  /**
   * Reference PDFs to use for generation
   */
  referencePdfs?: Buffer[];

  /**
   * User ID for tracking/logging
   */
  userId?: string;

  /**
   * Session ID for tracking/logging
   */
  sessionId?: string;

  /**
   * Additional metadata
   */
  metadata?: Record<string, unknown>;
};
