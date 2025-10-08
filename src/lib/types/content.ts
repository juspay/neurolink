/**
 * Content type definitions for multimodal support
 * Supports text and image content with provider-specific formatting
 */

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
 * Union type for all content types
 */
export type Content = TextContent | ImageContent | CSVContent | PDFContent;

/**
 * Vision capability information for providers
 */
export interface VisionCapability {
  provider: string;
  supportedModels: string[];
  maxImageSize?: number; // in bytes
  supportedFormats: string[];
  maxImagesPerRequest?: number;
}

/**
 * Provider-specific image format requirements
 */
export interface ProviderImageFormat {
  provider: string;
  format: "data_uri" | "base64" | "inline_data" | "source";
  requiresPrefix?: boolean;
  mimeTypeField?: string;
  dataField?: string;
}

/**
 * Image processing result
 */
export interface ProcessedImage {
  data: string;
  mediaType: string;
  size: number;
  format: "data_uri" | "base64" | "inline_data" | "source";
}

/**
 * Multimodal message structure for provider adapters
 */
export interface MultimodalMessage {
  role: "user" | "assistant" | "system";
  content: Content[];
}

/**
 * Provider-specific multimodal payload
 */
export interface ProviderMultimodalPayload {
  provider: string;
  model: string;
  messages?: MultimodalMessage[];
  contents?: unknown[]; // Google AI format
  [key: string]: unknown; // Allow provider-specific fields
}
