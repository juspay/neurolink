/**
 * Multimodal Content Types for NeuroLink
 *
 * Central registry for all multimodal input/output types.
 * This file consolidates types from content.ts and conversation.ts
 * to provide a single source of truth for multimodal functionality.
 *
 * @module types/multimodal
 *
 * @example Basic Multimodal Input
 * ```typescript
 * import type { MultimodalInput } from './types/multimodal.js';
 *
 * const input: MultimodalInput = {
 *   text: "What's in this image?",
 *   images: [imageBuffer, "https://example.com/image.jpg"],
 *   pdfFiles: [pdfBuffer]
 * };
 * ```
 *
 * @example Audio/Video Input (Future)
 * ```typescript
 * const avInput: MultimodalInput = {
 *   text: "Transcribe this audio and analyze this video",
 *   audioFiles: [audioBuffer],
 *   videoFiles: ["path/to/video.mp4"]
 * };
 * ```
 *
 * @example Advanced Content Array
 * ```typescript
 * const advanced: MultimodalInput = {
 *   text: "irrelevant", // ignored when content[] is provided
 *   content: [
 *     { type: "text", text: "Analyze these items:" },
 *     { type: "image", data: imageBuffer, mediaType: "image/jpeg" },
 *     { type: "pdf", data: pdfBuffer, metadata: { filename: "report.pdf" } }
 *   ]
 * };
 * ```
 */

// ============================================
// CONTENT TYPES (Individual content pieces)
// ============================================

/**
 * Text content type for multimodal messages
 */
export type TextContent = {
  type: "text";
  text: string;
};

/**
 * Image content type for multimodal messages
 */
export type ImageContent = {
  type: "image";
  data: Buffer | string; // Buffer, base64, URL, or data URI
  /** Alternative text for accessibility (screen readers, SEO) */
  altText?: string;
  mediaType?:
    | "image/jpeg"
    | "image/png"
    | "image/gif"
    | "image/webp"
    | "image/bmp"
    | "image/tiff";
  metadata?: {
    description?: string;
    quality?: "low" | "high" | "auto";
    dimensions?: { width: number; height: number };
    filename?: string;
  };
};

/**
 * CSV content type for multimodal messages
 */
export type CSVContent = {
  type: "csv";
  data: Buffer | string;
  metadata?: {
    filename?: string;
    maxRows?: number;
    formatStyle?: "raw" | "markdown" | "json";
    description?: string;
  };
};

/**
 * PDF document content type for multimodal messages
 */
export type PDFContent = {
  type: "pdf";
  data: Buffer | string;
  metadata?: {
    filename?: string;
    pages?: number;
    version?: string;
    description?: string;
  };
};

/**
 * Audio content type for multimodal messages
 *
 * NOTE: This is for FILE-BASED audio input (not streaming).
 * For streaming audio (live transcription), use AudioInputSpec from streamTypes.ts
 *
 * @example
 * ```typescript
 * const audioContent: AudioContent = {
 *   type: "audio",
 *   data: audioBuffer,
 *   mediaType: "audio/mpeg",
 *   metadata: {
 *     filename: "recording.mp3",
 *     duration: 120.5,
 *     transcription: "Hello world"
 *   }
 * };
 * ```
 */
export type AudioContent = {
  type: "audio";
  data: Buffer | string; // Buffer, base64, URL, or file path
  mediaType?:
    | "audio/mpeg" // MP3
    | "audio/wav" // WAV
    | "audio/ogg" // OGG
    | "audio/webm" // WebM
    | "audio/aac" // AAC
    | "audio/flac" // FLAC
    | "audio/mp4"; // M4A
  metadata?: {
    filename?: string;
    duration?: number; // in seconds
    sampleRate?: number;
    channels?: number;
    transcription?: string; // Optional pre-computed transcription
    language?: string; // ISO 639-1 code (e.g., "en", "es")
  };
};

/**
 * Video output configuration options for video generation
 *
 * Used with `output.video` in GenerateOptions when `output.mode` is "video".
 * Controls resolution, duration, aspect ratio, and audio settings for generated videos.
 *
 * @example
 * ```typescript
 * const videoOptions: VideoOutputOptions = {
 *   resolution: "1080p",
 *   length: 8,
 *   aspectRatio: "16:9",
 *   audio: true
 * };
 * ```
 */
export type VideoOutputOptions = {
  /** Output resolution - "720p" (1280x720) or "1080p" (1920x1080) */
  resolution?: "720p" | "1080p";
  /** Video duration in seconds (4, 6, or 8 seconds supported) */
  length?: 4 | 6 | 8;
  /** Aspect ratio - "9:16" for portrait or "16:9" for landscape */
  aspectRatio?: "9:16" | "16:9";
  /** Enable audio generation (default: true) */
  audio?: boolean;
};

/**
 * Result type for generated video content
 *
 * Returned in `GenerateResult.video` when video generation is successful.
 * Contains the raw video buffer and associated metadata.
 *
 * @example
 * ```typescript
 * const result = await neurolink.generate({
 *   input: { text: "Product showcase", images: [imageBuffer] },
 *   provider: "vertex",
 *   model: "veo-3.1",
 *   output: { mode: "video" }
 * });
 *
 * if (result.video) {
 *   writeFileSync("output.mp4", result.video.data);
 *   console.log(`Duration: ${result.video.metadata?.duration}s`);
 * }
 * ```
 */
export type VideoGenerationResult = {
  /** Raw video data as Buffer */
  data: Buffer;
  /** Video media type */
  mediaType: "video/mp4" | "video/webm";
  /** Video metadata */
  metadata?: {
    /** Original filename if applicable */
    filename?: string;
    /** Video duration in seconds */
    duration?: number;
    /** Video dimensions */
    dimensions?: {
      width: number;
      height: number;
    };
    /** Frame rate in fps */
    frameRate?: number;
    /** Video codec used */
    codec?: string;
    /** Model used for generation */
    model?: string;
    /** Provider used for generation */
    provider?: string;
    /** Aspect ratio of the video */
    aspectRatio?: string;
    /** Whether audio was enabled during generation */
    audioEnabled?: boolean;
    /** Processing time in milliseconds */
    processingTime?: number;
  };
};

/**
 * Represents a single extracted frame from a video,
 * typically as a base64 encoded image or a URL.
 */
export type ExtractedFrame = string;

/**
 * Metadata for VideoContent, describing properties of the video file.
 */
export interface VideoMetadata {
  filename?: string;
  duration?: number; // in seconds
  dimensions?: {
    width: number;
    height: number;
  };
  frameRate?: number;
  codec?: string;
  mediaType?:
    | "video/mp4" // MP4
    | "video/webm" // WebM
    | "video/ogg" // OGG
    | "video/quicktime" // MOV
    | "video/x-msvideo" // AVI
    | "video/x-matroska"; // MKV
}

/**
 * Video content type for multimodal messages.
 *
 * This type supports both frame-based processing and native video file handling.
 *
 * @example Frame-based video content
 * ```typescript
 * const frameVideoContent: VideoContent = {
 *   type: "video",
 *   frames: ["base64ImageData1", "base64ImageData2"],
 *   metadata: {
 *     filename: "video_frames.json",
 *     duration: 10,
 *     frameRate: 1
 *   }
 * };
 * ```
 *
 * @example Native video file content
 * ```typescript
 * const nativeVideoContent: VideoContent = {
 *   type: "video",
 *   content: "base64EncodedVideoData",
 *   metadata: {
 *     filename: "demo.mp4",
 *     duration: 300,
 *     dimensions: { width: 1920, height: 1080 },
 *     mediaType: "video/mp4"
 *   },
 *   transcription: "This is a transcription of the video's audio."
 * };
 * ```
 */
export interface VideoContent {
  type: "video";
  /** Optional: Array of extracted frames from the video, typically base64 images or URLs. */
  frames?: ExtractedFrame[];
  /** Optional: Base64 encoded native video data. */
  content?: string;
  /** Optional: Transcription of the video's audio track. */
  transcription?: string;
  /** Metadata describing the video content. */
  metadata: VideoMetadata;
}

/**
 * Union type for all content types
 * Covers text, images, documents, and multimedia
 */
export type Content =
  | TextContent
  | ImageContent
  | CSVContent
  | PDFContent
  | AudioContent
  | VideoContent;

// ============================================
// IMAGE WITH ALT TEXT (Accessibility Support)
// ============================================

/**
 * Image data with optional alt text for accessibility
 * Use this when you need to provide alt text for screen readers and SEO
 *
 * @example
 * ```typescript
 * const imageWithAlt: ImageWithAltText = {
 *   data: imageBuffer,
 *   altText: "A dashboard showing quarterly sales trends"
 * };
 * ```
 */
export type ImageWithAltText = {
  /** Image data as Buffer, base64 string, URL, or data URI */
  data: Buffer | string;
  /** Alternative text for accessibility (screen readers, SEO) */
  altText?: string;
};

// ============================================
// MULTIMODAL INPUT (User-facing API)
// ============================================

/**
 * Multimodal input type for options that may contain images or content arrays
 * This is the primary interface for users to provide multimodal content
 */
export type MultimodalInput = {
  text: string;
  /**
   * Images to include in the request.
   * Can be simple image data (Buffer, string) or objects with alt text for accessibility.
   *
   * @example Simple usage
   * ```typescript
   * images: [imageBuffer, "https://example.com/image.jpg"]
   * ```
   *
   * @example With alt text for accessibility
   * ```typescript
   * images: [
   *   { data: imageBuffer, altText: "Product screenshot showing main dashboard" },
   *   { data: "https://example.com/chart.png", altText: "Sales chart for Q3 2024" }
   * ]
   * ```
   */
  images?: Array<Buffer | string | ImageWithAltText>;
  content?: Content[];
  csvFiles?: Array<Buffer | string>;
  pdfFiles?: Array<Buffer | string>;
  files?: Array<Buffer | string>;

  /** Audio files for file-based audio processing (future) */
  audioFiles?: Array<Buffer | string>;

  /** Video files for file-based video processing (future) */
  videoFiles?: Array<Buffer | string>;
};

// ============================================
// MESSAGE CONTENT (Internal processing)
// ============================================

/**
 * Content format for multimodal messages (used internally)
 * Compatible with Vercel AI SDK message format
 */
export type MessageContent = {
  type: string;
  text?: string;
  image?: string;
  mimeType?: string;
  [key: string]: unknown; // Index signature for compatibility with Vercel AI SDK
};

/**
 * Extended chat message for multimodal support (internal use)
 * Used during message processing and transformation
 */
export type MultimodalChatMessage = {
  /** Role of the message sender */
  role: "user" | "assistant" | "system";

  /** Content of the message - can be text or multimodal content array */
  content: string | MessageContent[];
};

/**
 * Multimodal message structure for provider adapters
 */
export type MultimodalMessage = {
  role: "user" | "assistant" | "system";
  content: Content[];
};

// ============================================
// PROVIDER-SPECIFIC TYPES
// ============================================

/**
 * Vision capability information for providers
 */
export type VisionCapability = {
  provider: string;
  supportedModels: string[];
  maxImageSize?: number; // in bytes
  supportedFormats: string[];
  maxImagesPerRequest?: number;
};

/**
 * Provider-specific image format requirements
 */
export type ProviderImageFormat = {
  provider: string;
  format: "data_uri" | "base64" | "inline_data" | "source";
  requiresPrefix?: boolean;
  mimeTypeField?: string;
  dataField?: string;
};

/**
 * Image processing result
 */
export type ProcessedImage = {
  data: string;
  mediaType: string;
  size: number;
  format: "data_uri" | "base64" | "inline_data" | "source";
};

/**
 * Provider-specific multimodal payload
 */
export type ProviderMultimodalPayload = {
  provider: string;
  model: string;
  messages?: MultimodalMessage[];
  contents?: unknown[]; // Google AI format
  [key: string]: unknown; // Allow provider-specific fields
};

// ============================================
// TYPE GUARDS
// ============================================

/**
 * Type guard to check if content is TextContent
 */
export function isTextContent(content: Content): content is TextContent {
  return content.type === "text";
}

/**
 * Type guard to check if content is ImageContent
 */
export function isImageContent(content: Content): content is ImageContent {
  return content.type === "image";
}

/**
 * Type guard to check if content is CSVContent
 */
export function isCSVContent(content: Content): content is CSVContent {
  return content.type === "csv";
}

/**
 * Type guard to check if content is PDFContent
 */
export function isPDFContent(content: Content): content is PDFContent {
  return content.type === "pdf";
}

/**
 * Type guard to check if content is AudioContent
 */
export function isAudioContent(content: Content): content is AudioContent {
  return content.type === "audio";
}

/**
 * Type guard to check if content is VideoContent
 */
export function isVideoContent(content: Content): content is VideoContent {
  return content.type === "video";
}

/**
 * Type guard to check if input contains multimodal content
 * Now includes audio and video detection
 */
export function isMultimodalInput(input: unknown): input is MultimodalInput {
  const maybeInput = input as MultimodalInput;
  return !!(
    maybeInput?.images?.length ||
    maybeInput?.csvFiles?.length ||
    maybeInput?.pdfFiles?.length ||
    maybeInput?.files?.length ||
    maybeInput?.content?.length ||
    maybeInput?.audioFiles?.length ||
    maybeInput?.videoFiles?.length
  );
}

/**
 * Type guard to check if message content is multimodal (array)
 */
export function isMultimodalMessageContent(
  content: string | MessageContent[],
): content is MessageContent[] {
  return Array.isArray(content);
}
