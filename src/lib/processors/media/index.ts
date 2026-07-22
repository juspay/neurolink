/**
 * Media Processors Module
 *
 * Barrel export for media file processors (video, audio).
 * Provides processors for extracting AI-consumable content from multimedia files.
 *
 * @module processors/media
 *
 * @example
 * ```typescript
 * import {
 *   videoProcessor,
 *   isVideoFile,
 *   processVideo,
 *   type ProcessedVideo,
 * } from "./media/index.js";
 *
 * if (isVideoFile(file.mimetype, file.name)) {
 *   const result = await processVideo(fileInfo);
 *   if (result.success) {
 *     console.log(result.data.textContent);
 *   }
 * }
 * ```
 */

// =============================================================================
// VIDEO PROCESSOR
// =============================================================================

export {
  isVideoFile,
  processVideo,
  VideoProcessor,
  videoProcessor,
} from "./VideoProcessor.js";
