/**
 * Image Generation Module
 *
 * AI-powered image generation with support for multiple providers,
 * reference images, and configurable styles.
 *
 * @packageDocumentation
 * @module @juspay/neurolink/image-gen
 * @category ImageGeneration
 *
 * @example Basic usage
 * ```typescript
 * import { ImageGenService } from '@juspay/neurolink';
 *
 * const service = new ImageGenService();
 * const result = await service.generate({
 *   prompt: 'A beautiful sunset over mountains',
 *   style: 'photorealistic'
 * });
 *
 * if (result.success) {
 *   console.log('Generated image:', result.base64?.substring(0, 50) + '...');
 * }
 * ```
 *
 * @example With AI tools
 * ```typescript
 * import { getImageGenTools, NeuroLink } from '@juspay/neurolink';
 *
 * const tools = getImageGenTools();
 * const neurolink = new NeuroLink();
 *
 * // Register tools for AI model use
 * for (const tool of tools) {
 *   neurolink.registerTool(tool.name, {
 *     description: tool.description,
 *     parameters: tool.inputSchema,
 *     execute: tool.execute
 *   });
 * }
 * ```
 */

// Export service
export { ImageGenService } from "./ImageGenService.js";
// Export tool types
export type { ImageGenToolDefinition } from "./imageGenTools.js";

// Export tools
export {
  createCustomImageGenTool,
  createImageGenTool,
  createImageVariationTool,
  getBasicImageGenTool,
  getImageGenTools,
} from "./imageGenTools.js";
// Export types
export * from "./types.js";
