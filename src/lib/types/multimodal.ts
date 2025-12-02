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
 * Video content type for multimodal messages
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
 */
export type VideoContent = {
  type: "video";
  data: Buffer | string; // Buffer, base64, URL, or file path
  mediaType?:
    | "video/mp4" // MP4
    | "video/webm" // WebM
    | "video/ogg" // OGG
    | "video/quicktime" // MOV
    | "video/x-msvideo" // AVI
    | "video/x-matroska"; // MKV
  metadata?: {
    filename?: string;
    duration?: number; // in seconds
    dimensions?: {
      width: number;
      height: number;
    };
    frameRate?: number;
    codec?: string;
    extractedFrames?: string[]; // Base64 or URLs of extracted frames
    transcription?: string; // Optional transcription of audio track
  };
};

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
 *
 * @deprecated This generic type is not actively used by NeuroLink providers.
 * It will be removed in v9.0.0. Use provider-specific SDK types instead.
 *
 * ## Migration Guide
 *
 * Instead of using this generic type, use the native types from each provider's SDK:
 *
 * ### OpenAI
 * ```typescript
 * import type { ChatCompletionMessageParam } from 'openai';
 * // For images: ChatCompletionContentPart
 * ```
 *
 * ### Anthropic
 * ```typescript
 * import type { MessageParam, ContentBlock } from '@anthropic-ai/sdk';
 * // For images: ImageBlockParam
 * ```
 *
 * ### Google AI Studio (Gemini)
 * ```typescript
 * import type { Content, Part } from '@google/generative-ai';
 * // For multimodal: InlineDataPart
 * ```
 *
 * ### Google Vertex AI
 * ```typescript
 * import type { Content, Part } from '@google-cloud/vertexai';
 * // For images and PDFs: InlineDataPart
 * ```
 *
 * ### AWS Bedrock
 * ```typescript
 * import type { Message, ContentBlock } from '@aws-sdk/client-bedrock-runtime';
 * // For images: ImageBlock
 * ```
 *
 * ### Azure OpenAI
 * ```typescript
 * // Uses same types as OpenAI
 * import type { ChatCompletionMessageParam } from 'openai';
 * ```
 *
 * ### Mistral AI
 * ```typescript
 * // Use via @ai-sdk/mistral (Vercel AI SDK)
 * import type { CoreMessage } from 'ai';
 * ```
 *
 * ### Ollama
 * ```typescript
 * // Use via ollama-ai-provider
 * import type { Message } from 'ollama-ai-provider';
 * ```
 *
 * ### Hugging Face
 * ```typescript
 * import type { TextGenerationInput } from '@huggingface/inference';
 * ```
 *
 * For internal NeuroLink usage, use the concrete types from `./conversation.js`:
 * - `ChatMessage` - Standard message format
 * - `MessageContent` - Content with type information
 * - `MultimodalChatMessage` - Messages with multimodal content
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
