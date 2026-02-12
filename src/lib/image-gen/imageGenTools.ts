/**
 * Image Generation Tools
 *
 * Tool definitions for AI model use - enables AI models to generate
 * images as part of their response workflow.
 *
 * @packageDocumentation
 * @module @juspay/neurolink/image-gen
 * @category ImageGeneration
 *
 * @example
 * ```typescript
 * import { getImageGenTools } from '@juspay/neurolink';
 *
 * // Get tools for AI model registration
 * const tools = getImageGenTools();
 *
 * // Use with NeuroLink
 * const neurolink = new NeuroLink();
 * neurolink.registerCustomTools(tools);
 * ```
 */

import { ImageGenService } from "./ImageGenService.js";
import type {
  ImageGenConfig,
  ImageGenToolContext,
  ImageGenToolParams,
  ImageGenToolResponse,
} from "./types.js";

/**
 * Tool definition interface compatible with AI SDK / MCP
 */
export type ImageGenToolDefinition = {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<
      string,
      {
        type: string;
        description: string;
        enum?: string[];
      }
    >;
    required: string[];
  };
  execute: (
    params: ImageGenToolParams,
    context?: ImageGenToolContext,
  ) => Promise<ImageGenToolResponse>;
};

/**
 * Create an image generation tool for use with AI models
 *
 * This tool allows AI models to generate images based on text prompts.
 * It integrates with the ImageGenService for actual generation.
 *
 * @param service - ImageGenService instance to use
 * @returns Tool definition compatible with MCP/AI SDK
 *
 * @example
 * ```typescript
 * const service = new ImageGenService();
 * const tool = createImageGenTool(service);
 *
 * // Tool can now be registered with NeuroLink
 * neurolink.registerTool(tool.name, {
 *   description: tool.description,
 *   parameters: tool.inputSchema,
 *   execute: tool.execute
 * });
 * ```
 */
export function createImageGenTool(
  service: ImageGenService,
): ImageGenToolDefinition {
  return {
    name: "generate_image",
    description: `Generate an image from a text prompt using AI. Use this tool to create images, illustrations, diagrams, or visual content based on detailed descriptions.

Tips for better prompts:
- Be specific and detailed about what you want
- Include style preferences (photorealistic, cartoon, watercolor, etc.)
- Mention colors, lighting, and composition if important
- Describe the mood or atmosphere desired

The tool returns the generated image as a data URI that can be displayed or saved.`,

    inputSchema: {
      type: "object" as const,
      properties: {
        prompt: {
          type: "string",
          description:
            "Detailed description of the image to generate. Be specific about content, style, colors, and composition for best results.",
        },
        negativePrompt: {
          type: "string",
          description:
            "What to avoid in the generated image (optional). E.g., 'blurry, low quality, text, watermarks'",
        },
        aspectRatio: {
          type: "string",
          description:
            "Aspect ratio for the image (optional). Common values: '1:1' (square), '16:9' (widescreen), '9:16' (portrait), '4:3', '3:2'",
          enum: ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"],
        },
        style: {
          type: "string",
          description:
            "Style preset for the image (optional). E.g., 'realistic', 'photorealistic', 'artistic', 'cartoon', 'anime', 'watercolor', 'oil-painting', 'sketch', 'digital-art', '3d-render'",
          enum: [
            "realistic",
            "photorealistic",
            "artistic",
            "cartoon",
            "anime",
            "watercolor",
            "oil-painting",
            "sketch",
            "digital-art",
            "3d-render",
          ],
        },
      },
      required: ["prompt"],
    },

    execute: async (
      params: ImageGenToolParams,
      context?: ImageGenToolContext,
    ): Promise<ImageGenToolResponse> => {
      // Check if service is enabled
      if (!service.isEnabled()) {
        return {
          success: false,
          message: "Image generation is disabled on this server",
          error: "IMAGE_GEN_DISABLED",
        };
      }

      try {
        // Build generation options
        const result = await service.generate({
          prompt: params.prompt,
          negativePrompt: params.negativePrompt,
          aspectRatio: params.aspectRatio,
          style: params.style,
          images: context?.referenceImages,
          pdfFiles: context?.referencePdfs,
        });

        if (result.success && result.base64) {
          const mimeType = result.mimeType ?? "image/png";
          return {
            success: true,
            image: `data:${mimeType};base64,${result.base64}`,
            message: `Image generated successfully using ${result.model ?? "default model"}`,
          };
        }

        return {
          success: false,
          message: result.error ?? "Failed to generate image",
          error: result.error ?? "GENERATION_FAILED",
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return {
          success: false,
          message: `Image generation failed: ${errorMessage}`,
          error: errorMessage,
        };
      }
    },
  };
}

/**
 * Create an image editing/variation tool for use with AI models
 *
 * This tool allows AI models to create variations of existing images
 * or edit images based on reference images and prompts.
 *
 * @param service - ImageGenService instance to use
 * @returns Tool definition compatible with MCP/AI SDK
 */
export function createImageVariationTool(
  service: ImageGenService,
): ImageGenToolDefinition {
  return {
    name: "create_image_variation",
    description: `Create a variation or modification of an existing image. Use this when you need to:
- Create variations of a reference image
- Modify an existing image based on a description
- Generate images in a similar style to a reference

Note: Requires reference images to be provided in the context.`,

    inputSchema: {
      type: "object" as const,
      properties: {
        prompt: {
          type: "string",
          description:
            "Description of the desired variation or modification. Describe what changes you want from the reference.",
        },
        style: {
          type: "string",
          description: "Style to apply to the variation (optional)",
          enum: [
            "realistic",
            "photorealistic",
            "artistic",
            "cartoon",
            "anime",
            "watercolor",
            "oil-painting",
            "sketch",
            "digital-art",
            "3d-render",
          ],
        },
        aspectRatio: {
          type: "string",
          description: "Aspect ratio for the output (optional)",
          enum: ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"],
        },
      },
      required: ["prompt"],
    },

    execute: async (
      params: ImageGenToolParams,
      context?: ImageGenToolContext,
    ): Promise<ImageGenToolResponse> => {
      // Check if service is enabled
      if (!service.isEnabled()) {
        return {
          success: false,
          message: "Image generation is disabled on this server",
          error: "IMAGE_GEN_DISABLED",
        };
      }

      // Require reference images for variations
      if (!context?.referenceImages?.length) {
        return {
          success: false,
          message:
            "No reference images provided. This tool requires reference images to create variations.",
          error: "NO_REFERENCE_IMAGES",
        };
      }

      try {
        const result = await service.generate({
          prompt: `Create a variation based on the reference image(s): ${params.prompt}`,
          style: params.style,
          aspectRatio: params.aspectRatio,
          images: context.referenceImages,
          pdfFiles: context.referencePdfs,
        });

        if (result.success && result.base64) {
          const mimeType = result.mimeType ?? "image/png";
          return {
            success: true,
            image: `data:${mimeType};base64,${result.base64}`,
            message: "Image variation created successfully",
          };
        }

        return {
          success: false,
          message: result.error ?? "Failed to create image variation",
          error: result.error ?? "VARIATION_FAILED",
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return {
          success: false,
          message: `Image variation failed: ${errorMessage}`,
          error: errorMessage,
        };
      }
    },
  };
}

/**
 * Get all image generation tools as an array
 *
 * Creates a shared ImageGenService instance and returns all
 * image generation tools configured to use it.
 *
 * @param config - Optional configuration for the ImageGenService
 * @returns Array of tool definitions
 *
 * @example
 * ```typescript
 * import { getImageGenTools, NeuroLink } from '@juspay/neurolink';
 *
 * const tools = getImageGenTools({
 *   defaultProvider: 'openai',
 *   defaultModel: 'dall-e-3'
 * });
 *
 * const neurolink = new NeuroLink();
 * for (const tool of tools) {
 *   neurolink.registerTool(tool.name, {
 *     description: tool.description,
 *     parameters: tool.inputSchema,
 *     execute: tool.execute
 *   });
 * }
 * ```
 */
export function getImageGenTools(
  configOrService?: Partial<ImageGenConfig> | ImageGenService,
): ImageGenToolDefinition[] {
  const service =
    configOrService instanceof ImageGenService
      ? configOrService
      : new ImageGenService(configOrService);

  return [createImageGenTool(service), createImageVariationTool(service)];
}

/**
 * Get only the basic image generation tool
 *
 * @param config - Optional configuration for the ImageGenService
 * @returns Single tool definition for basic image generation
 */
export function getBasicImageGenTool(
  configOrService?: Partial<ImageGenConfig> | ImageGenService,
): ImageGenToolDefinition {
  const service =
    configOrService instanceof ImageGenService
      ? configOrService
      : new ImageGenService(configOrService);
  return createImageGenTool(service);
}

/**
 * Create a custom image generation tool with specific service configuration
 *
 * @param serviceConfig - Configuration for the ImageGenService
 * @param toolConfig - Optional customizations for the tool definition
 * @returns Customized tool definition
 *
 * @example
 * ```typescript
 * const customTool = createCustomImageGenTool(
 *   { defaultProvider: 'vertex', defaultModel: 'imagen-3.0-generate-001' },
 *   { name: 'vertex_generate_image', description: 'Generate images using Vertex AI Imagen' }
 * );
 * ```
 */
export function createCustomImageGenTool(
  serviceConfig?: Partial<ImageGenConfig>,
  toolConfig?: Partial<Pick<ImageGenToolDefinition, "name" | "description">>,
): ImageGenToolDefinition {
  const service = new ImageGenService(serviceConfig);
  const baseTool = createImageGenTool(service);

  return {
    ...baseTool,
    ...toolConfig,
  };
}
