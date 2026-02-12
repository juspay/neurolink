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

export type { ProcessedVideo } from "./VideoProcessor.js";
export {
  isVideoFile,
  processVideo,
  VideoProcessor,
  videoProcessor,
} from "./VideoProcessor.js";

// =============================================================================
// AUDIO PROCESSOR (placeholder for future implementation)
// =============================================================================
// export {
//   AudioProcessor,
//   audioProcessor,
//   isAudioFile,
//   processAudio,
// } from "./AudioProcessor.js";
// export type { ProcessedAudio } from "./AudioProcessor.js";
