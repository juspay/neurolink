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
 * Text content type for multimodal messages.
 *
 * This is the most common content type, used for plain text messages.
 * The `type` field acts as a discriminator in the {@link Content} union type.
 *
 * @example
 * ```typescript
 * const textContent: TextContent = {
 *   type: "text",
 *   text: "Hello, analyze this document for me."
 * };
 * ```
 *
 * @see {@link Content} - The union type containing all content types
 * @see {@link isTextContent} - Type guard for TextContent
 * @public
 */

export type TextContent = {
  /** Discriminator field. Always `"text"` for TextContent. */
  type: "text";
  /** The text content of the message. */
  text: string;
};
/**
 * Image content type for multimodal messages.
 *
 * Used for including images in AI conversations. Supports multiple input formats
 * including raw buffers, base64-encoded strings, URLs, and data URIs.
 * The `type` field acts as a discriminator in the {@link Content} union type.
 *
 * @example
 * ```typescript
 * // Using a file buffer
 * const imageFromBuffer: ImageContent = {
 *   type: "image",
 *   data: fs.readFileSync("./photo.jpg"),
 *   mediaType: "image/jpeg",
 *   metadata: { filename: "photo.jpg" }
 * };
 *
 * // Using a URL
 * const imageFromUrl: ImageContent = {
 *   type: "image",
 *   data: "https://example.com/image.png",
 *   mediaType: "image/png"
 * };
 * ```
 *
 * @see {@link Content} - The union type containing all content types
 * @see {@link isImageContent} - Type guard for ImageContent
 * @public
 */
export type ImageContent = {
  /** Discriminator field. Always `"image"` for ImageContent. */
  type: "image";
  /** Image data as Buffer, base64 string, URL, or data URI. */
  data: Buffer | string;
  /** MIME type of the image. Auto-detected if not provided. */
  mediaType?:
    | "image/jpeg"
    | "image/png"
    | "image/gif"
    | "image/webp"
    | "image/bmp"
    | "image/tiff";
  /** Optional metadata about the image. */
  metadata?: {
    description?: string;
    quality?: "low" | "high" | "auto";
    dimensions?: { width: number; height: number };
    filename?: string;
  };
};

/**
 * CSV content type for multimodal messages.
 *
 * Used for including tabular data in AI conversations. The data can be provided
 * as a raw buffer or string content. Format style controls how the data is
 * presented to the AI model.
 * The `type` field acts as a discriminator in the {@link Content} union type.
 *
 * @example
 * ```typescript
 * const csvContent: CSVContent = {
 *   type: "csv",
 *   data: fs.readFileSync("./data.csv"),
 *   metadata: {
 *     filename: "sales_q4.csv",
 *     maxRows: 500,
 *     formatStyle: "markdown"
 *   }
 * };
 * ```
 *
 * @see {@link Content} - The union type containing all content types
 * @see {@link isCSVContent} - Type guard for CSVContent
 * @public
 */
export type CSVContent = {
  /** Discriminator field. Always `"csv"` for CSVContent. */
  type: "csv";
  /** CSV data as Buffer or string content. */
  data: Buffer | string;
  /** Optional metadata about the CSV file. */
  metadata?: {
    filename?: string;
    maxRows?: number;
    formatStyle?: "raw" | "markdown" | "json";
    description?: string;
  };
};

/**
 * PDF document content type for multimodal messages.
 *
 * Used for including PDF documents in AI conversations for analysis,
 * summarization, or extraction. Supported by most major providers including
 * Google Vertex AI, Anthropic, AWS Bedrock, and Google AI Studio.
 * The `type` field acts as a discriminator in the {@link Content} union type.
 *
 * @example
 * ```typescript
 * const pdfContent: PDFContent = {
 *   type: "pdf",
 *   data: fs.readFileSync("./report.pdf"),
 *   metadata: {
 *     filename: "quarterly_report.pdf",
 *     pages: 15,
 *     description: "Q4 2024 Financial Report"
 *   }
 * };
 * ```
 *
 * @see {@link Content} - The union type containing all content types
 * @see {@link isPDFContent} - Type guard for PDFContent
 * @public
 */
export type PDFContent = {
  /** Discriminator field. Always `"pdf"` for PDFContent. */
  type: "pdf";
  /** PDF data as Buffer or file path string. */
  data: Buffer | string;
  /** Optional metadata about the PDF document. */
  metadata?: {
    filename?: string;
    pages?: number;
    version?: string;
    description?: string;
  };
};

/**
 * Audio content type for multimodal messages.
 *
 * Used for including audio files in AI conversations for transcription,
 * analysis, or speech-to-text processing. Supports multiple audio formats.
 * The `type` field acts as a discriminator in the {@link Content} union type.
 *
 * NOTE: This is for FILE-BASED audio input (not streaming).
 * For streaming audio (live transcription), use AudioInputSpec from streamTypes.ts.
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
 *
 * @see {@link Content} - The union type containing all content types
 * @see {@link isAudioContent} - Type guard for AudioContent
 * @public
 */
export type AudioContent = {
  /** Discriminator field. Always `"audio"` for AudioContent. */
  type: "audio";
  /** Audio data as Buffer, base64 string, URL, or file path. */
  data: Buffer | string;
  /** MIME type of the audio. Auto-detected if not provided. */
  mediaType?:
    | "audio/mpeg" // MP3
    | "audio/wav" // WAV
    | "audio/ogg" // OGG
    | "audio/webm" // WebM
    | "audio/aac" // AAC
    | "audio/flac" // FLAC
    | "audio/mp4"; // M4A
  /** Optional metadata about the audio file. */
  metadata?: {
    filename?: string;
    /** Duration in seconds. */
    duration?: number;
    sampleRate?: number;
    channels?: number;
    /** Optional pre-computed transcription. */
    transcription?: string;
    /** ISO 639-1 language code (e.g., "en", "es"). */
    language?: string;
  };
};

/**
 * Video content type for multimodal messages.
 *
 * Used for including video files in AI conversations for analysis,
 * frame extraction, or content understanding. Supports multiple video formats.
 * The `type` field acts as a discriminator in the {@link Content} union type.
 *
 * NOTE: This is for FILE-BASED video input.
 * For streaming video, this type may be extended in future.
 *
 * @example
 * ```typescript
 * const videoContent: VideoContent = {
 *   type: "video",
 *   data: videoBuffer,
 *   mediaType: "video/mp4",
 *   metadata: {
 *     filename: "demo.mp4",
 *     duration: 300,
 *     dimensions: { width: 1920, height: 1080 }
 *   }
 * };
 * ```
 *
 * @see {@link Content} - The union type containing all content types
 * @see {@link isVideoContent} - Type guard for VideoContent
 * @public
 */
export type VideoContent = {
  /** Discriminator field. Always `"video"` for VideoContent. */
  type: "video";
  /** Video data as Buffer, base64 string, URL, or file path. */
  data: Buffer | string;
  /** MIME type of the video. Auto-detected if not provided. */
  mediaType?:
    | "video/mp4" // MP4
    | "video/webm" // WebM
    | "video/ogg" // OGG
    | "video/quicktime" // MOV
    | "video/x-msvideo" // AVI
    | "video/x-matroska"; // MKV
  /** Optional metadata about the video file. */
  metadata?: {
    filename?: string;
    /** Duration in seconds. */
    duration?: number;
    dimensions?: {
      width: number;
      height: number;
    };
    frameRate?: number;
    codec?: string;
    /** Base64 strings or URLs of extracted frames. */
    extractedFrames?: string[];
    /** Optional transcription of audio track. */
    transcription?: string;
  };
};

/**
 * Union type for all content types in multimodal messages.
 *
 * This is a **discriminated union** where each member has a unique `type` field
 * that serves as the discriminator. TypeScript can use this field to narrow
 * the type in conditional statements.
 *
 * ## Supported Content Types
 *
 * | Type | Description | Discriminator Value | Supported Media Types |
 * |------|-------------|---------------------|----------------------|
 * | {@link TextContent} | Plain text messages | `"text"` | N/A |
 * | {@link ImageContent} | Images (JPEG, PNG, GIF, WebP, BMP, TIFF) | `"image"` | `image/*` |
 * | {@link CSVContent} | Tabular data files | `"csv"` | `text/csv` |
 * | {@link PDFContent} | PDF documents | `"pdf"` | `application/pdf` |
 * | {@link AudioContent} | Audio files (MP3, WAV, OGG, etc.) | `"audio"` | `audio/*` |
 * | {@link VideoContent} | Video files (MP4, WebM, MOV, etc.) | `"video"` | `video/*` |
 *
 * ## Type Narrowing
 *
 * ### Using the `type` field (manual narrowing)
 *
 * TypeScript automatically narrows the type when you check the `type` field:
 *
 * ```typescript
 * function processContent(content: Content): string {
 *   if (content.type === "text") {
 *     // TypeScript knows content is TextContent here
 *     return content.text;
 *   } else if (content.type === "image") {
 *     // TypeScript knows content is ImageContent here
 *     return `Image: ${content.metadata?.filename ?? "unnamed"}`;
 *   } else if (content.type === "pdf") {
 *     // TypeScript knows content is PDFContent here
 *     return `PDF with ${content.metadata?.pages ?? "unknown"} pages`;
 *   }
 *   return "Other content type";
 * }
 * ```
 *
 * ### Using type guards (recommended)
 *
 * NeuroLink provides type guard functions for cleaner, reusable type checking:
 *
 * ```typescript
 * import {
 *   isTextContent,
 *   isImageContent,
 *   isPDFContent,
 *   isCSVContent,
 *   isAudioContent,
 *   isVideoContent
 * } from "@juspay/neurolink";
 *
 * function processContent(content: Content): void {
 *   if (isTextContent(content)) {
 *     console.log("Text:", content.text);
 *   } else if (isImageContent(content)) {
 *     console.log("Image format:", content.mediaType);
 *   } else if (isPDFContent(content)) {
 *     console.log("PDF pages:", content.metadata?.pages);
 *   }
 * }
 * ```
 *
 * ## Exhaustive Checking
 *
 * Use the `never` type to ensure all content types are handled:
 *
 * ```typescript
 * function handleContent(content: Content): string {
 *   switch (content.type) {
 *     case "text":
 *       return content.text;
 *     case "image":
 *       return `Image: ${content.mediaType ?? "unknown format"}`;
 *     case "csv":
 *       return `CSV: ${content.metadata?.filename ?? "data"}`;
 *     case "pdf":
 *       return `PDF: ${content.metadata?.filename ?? "document"}`;
 *     case "audio":
 *       return `Audio: ${content.metadata?.duration ?? 0}s`;
 *     case "video":
 *       return `Video: ${content.metadata?.duration ?? 0}s`;
 *     default:
 *       // TypeScript error if any case is missing
 *       const _exhaustive: never = content;
 *       throw new Error(`Unhandled content type: ${(content as { type: string }).type}`);
 *   }
 * }
 * ```
 *
 * ## Creating Content
 *
 * Examples of creating each content type:
 *
 * ```typescript
 * import type { Content, TextContent, ImageContent, PDFContent } from "@juspay/neurolink";
 *
 * // TextContent
 * const text: TextContent = {
 *   type: "text",
 *   text: "Analyze this document"
 * };
 *
 * // ImageContent
 * const image: ImageContent = {
 *   type: "image",
 *   data: fs.readFileSync("./photo.jpg"),
 *   mediaType: "image/jpeg"
 * };
 *
 * // PDFContent
 * const pdf: PDFContent = {
 *   type: "pdf",
 *   data: fs.readFileSync("./report.pdf"),
 *   metadata: { filename: "report.pdf", pages: 10 }
 * };
 *
 * // Use in MultimodalInput
 * const input: MultimodalInput = {
 *   text: "Process these files",
 *   content: [text, image, pdf]
 * };
 * ```
 *
 * @see {@link TextContent} - Plain text content
 * @see {@link ImageContent} - Image content with various formats
 * @see {@link CSVContent} - CSV tabular data content
 * @see {@link PDFContent} - PDF document content
 * @see {@link AudioContent} - Audio file content
 * @see {@link VideoContent} - Video file content
 * @see {@link isTextContent} - Type guard for TextContent
 * @see {@link isImageContent} - Type guard for ImageContent
 * @see {@link isCSVContent} - Type guard for CSVContent
 * @see {@link isPDFContent} - Type guard for PDFContent
 * @see {@link isAudioContent} - Type guard for AudioContent
 * @see {@link isVideoContent} - Type guard for VideoContent
 * @public
 */
export type Content =
  | TextContent
  | ImageContent
  | CSVContent
  | PDFContent
  | AudioContent
  | VideoContent;

// ============================================
// MULTIMODAL INPUT (User-facing API)
// ============================================

/**
 * Multimodal input type for options that may contain images or content arrays
 * This is the primary interface for users to provide multimodal content
 */
export type MultimodalInput = {
  text: string;
  images?: Array<Buffer | string>;
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
 * Type guard to check if content is {@link TextContent}.
 *
 * @example
 * ```typescript
 * if (isTextContent(content)) {
 *   console.log(content.text); // TypeScript knows content.text exists
 * }
 * ```
 *
 * @param content - The content to check
 * @returns `true` if the content is TextContent, `false` otherwise
 * @see {@link Content} - The union type this guards against
 * @public
 */
export function isTextContent(content: Content): content is TextContent {
  return content.type === "text";
}

/**
 * Type guard to check if content is {@link ImageContent}.
 *
 * @example
 * ```typescript
 * if (isImageContent(content)) {
 *   console.log(content.mediaType); // TypeScript knows this is ImageContent
 * }
 * ```
 *
 * @param content - The content to check
 * @returns `true` if the content is ImageContent, `false` otherwise
 * @see {@link Content} - The union type this guards against
 * @public
 */
export function isImageContent(content: Content): content is ImageContent {
  return content.type === "image";
}

/**
 * Type guard to check if content is {@link CSVContent}.
 *
 * @example
 * ```typescript
 * if (isCSVContent(content)) {
 *   console.log(content.metadata?.filename); // TypeScript knows this is CSVContent
 * }
 * ```
 *
 * @param content - The content to check
 * @returns `true` if the content is CSVContent, `false` otherwise
 * @see {@link Content} - The union type this guards against
 * @public
 */
export function isCSVContent(content: Content): content is CSVContent {
  return content.type === "csv";
}

/**
 * Type guard to check if content is {@link PDFContent}.
 *
 * @example
 * ```typescript
 * if (isPDFContent(content)) {
 *   console.log(content.metadata?.pages); // TypeScript knows this is PDFContent
 * }
 * ```
 *
 * @param content - The content to check
 * @returns `true` if the content is PDFContent, `false` otherwise
 * @see {@link Content} - The union type this guards against
 * @public
 */
export function isPDFContent(content: Content): content is PDFContent {
  return content.type === "pdf";
}

/**
 * Type guard to check if content is {@link AudioContent}.
 *
 * @example
 * ```typescript
 * if (isAudioContent(content)) {
 *   console.log(content.metadata?.duration); // TypeScript knows this is AudioContent
 * }
 * ```
 *
 * @param content - The content to check
 * @returns `true` if the content is AudioContent, `false` otherwise
 * @see {@link Content} - The union type this guards against
 * @public
 */
export function isAudioContent(content: Content): content is AudioContent {
  return content.type === "audio";
}

/**
 * Type guard to check if content is {@link VideoContent}.
 *
 * @example
 * ```typescript
 * if (isVideoContent(content)) {
 *   console.log(content.metadata?.dimensions); // TypeScript knows this is VideoContent
 * }
 * ```
 *
 * @param content - The content to check
 * @returns `true` if the content is VideoContent, `false` otherwise
 * @see {@link Content} - The union type this guards against
 * @public
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
