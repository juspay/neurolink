/**
 * Content type definitions for multimodal support
 *
 * @deprecated This file has been reorganized. All multimodal types are now in './multimodal.js'
 * These re-exports are maintained for backward compatibility.
 * Please import from './multimodal.js' in new code.
 *
 * Migration guide:
 * ```typescript
 * // Old (still works)
 * import type { MultimodalInput } from './types/content.js';
 *
 * // New (preferred)
 * import type { MultimodalInput } from './types/multimodal.js';
 * ```
 */

// Type-only re-exports from multimodal.ts for backward compatibility
export type {
  TextContent,
  ImageContent,
  CSVContent,
  PDFContent,
  AudioContent,
  VideoContent,
  VideoOutputOptions,
  VideoGenerationResult,
  Content,
  ImageWithAltText,
  MultimodalInput,
  MultimodalMessage,
  VisionCapability,
  ProviderImageFormat,
  ProcessedImage,
  ProviderMultimodalPayload,
} from "./multimodal.js";

// Runtime function re-exports for type guards
// These MUST be regular exports (not "export type") because they are actual functions
export {
  isTextContent,
  isImageContent,
  isCSVContent,
  isPDFContent,
  isAudioContent,
  isVideoContent,
  isMultimodalInput,
} from "./multimodal.js";
