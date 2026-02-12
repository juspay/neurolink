/**
 * Message Builder Utility
 * Centralized logic for building message arrays from TextGenerationOptions
 * Enhanced with multimodal support for images
 */

import type {
  CoreAssistantMessage,
  CoreMessage,
  CoreSystemMessage,
  CoreUserMessage,
  FilePart,
  ImagePart,
  TextPart,
} from "ai";
import { existsSync, readFileSync, statSync } from "fs";
import { getGlobalDispatcher, interceptors, request } from "undici";
import {
  MultimodalLogger,
  ProviderImageAdapter,
} from "../adapters/providerImageAdapter.js";
import {
  CONVERSATION_INSTRUCTIONS,
  STRUCTURED_OUTPUT_INSTRUCTIONS,
} from "../config/conversationMemory.js";
import { getAvailableInputTokens } from "../constants/contextWindows.js";
import {
  enforceAggregateFileBudget,
  FILE_READ_BUDGET_PERCENT,
} from "../context/fileTokenBudget.js";
import type { FileReferenceRegistry } from "../files/fileReferenceRegistry.js";
import { SIZE_TIER_THRESHOLDS } from "../files/types.js";
import type {
  ChatMessage,
  MessageContent,
  MultimodalChatMessage,
} from "../types/conversation.js";
import type { FileWithMetadata } from "../types/fileTypes.js";
import type { GenerateOptions } from "../types/generateTypes.js";
import type { TextGenerationOptions } from "../types/index.js";
import type { Content, ImageWithAltText } from "../types/multimodal.js";
import type { StreamOptions } from "../types/streamTypes.js";
import { FileDetector } from "./fileDetector.js";
import { getImageCache } from "./imageCache.js";
import { logger } from "./logger.js";
import { PDFImageConverter, PDFProcessor } from "./pdfProcessor.js";
import { urlDownloadRateLimiter } from "./rateLimiter.js";
import { estimateTokens } from "./tokenEstimation.js";

// ---------------------------------------------------------------------------
// SDK-7: Lightweight file-type inference helpers for budget estimation
// These avoid calling the full FileDetector pipeline — they only need to
// classify files into broad categories (video, audio, image, etc.) so
// estimatePostProcessingTokens() can use type-aware estimates.
// ---------------------------------------------------------------------------

/** Extension → file type mapping for budget estimation */
const EXTENSION_TYPE_MAP: Record<string, string> = {
  // Video
  mp4: "video",
  mkv: "video",
  mov: "video",
  avi: "video",
  webm: "video",
  wmv: "video",
  flv: "video",
  m4v: "video",
  // Audio
  mp3: "audio",
  wav: "audio",
  ogg: "audio",
  flac: "audio",
  m4a: "audio",
  aac: "audio",
  wma: "audio",
  opus: "audio",
  // Image
  jpg: "image",
  jpeg: "image",
  png: "image",
  gif: "image",
  webp: "image",
  bmp: "image",
  tiff: "image",
  tif: "image",
  avif: "image",
  // Archive
  zip: "archive",
  tar: "archive",
  gz: "archive",
  tgz: "archive",
  rar: "archive",
  "7z": "archive",
  jar: "archive",
  // Documents
  xlsx: "xlsx",
  xls: "xlsx",
  ods: "xlsx",
  docx: "docx",
  doc: "docx",
  odt: "docx",
  rtf: "docx",
  pptx: "pptx",
  ppt: "pptx",
  odp: "pptx",
  // PDF
  pdf: "pdf",
  // SVG
  svg: "svg",
  // CSV
  csv: "csv",
  tsv: "csv",
};

/**
 * Infer file type from extension in a file path or URL.
 * Returns undefined if no extension or unrecognized.
 */
function inferFileTypeFromExtension(filePath: string): string | undefined {
  // Strip query string / fragment for URLs
  const cleaned = filePath.split("?")[0].split("#")[0];
  const lastDot = cleaned.lastIndexOf(".");
  if (lastDot === -1) {
    return undefined;
  }
  const ext = cleaned.slice(lastDot + 1).toLowerCase();
  return EXTENSION_TYPE_MAP[ext];
}

/**
 * Infer file type from the first few magic bytes of a Buffer.
 * Only checks the most common binary types — text types default to undefined.
 */
function inferFileTypeFromBuffer(buf: Buffer): string | undefined {
  if (buf.length < 4) {
    return undefined;
  }

  // PNG
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
    return "image";
  }
  // JPEG
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image";
  }
  // GIF
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) {
    return "image";
  }
  // WebP (RIFF + WEBP)
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return "image";
  }
  // PDF
  if (
    buf[0] === 0x25 &&
    buf[1] === 0x50 &&
    buf[2] === 0x44 &&
    buf[3] === 0x46
  ) {
    return "pdf";
  }
  // MP4/MOV (ftyp at offset 4)
  if (
    buf.length >= 8 &&
    buf[4] === 0x66 &&
    buf[5] === 0x74 &&
    buf[6] === 0x79 &&
    buf[7] === 0x70
  ) {
    return "video";
  }
  // MKV/WebM (EBML)
  if (
    buf[0] === 0x1a &&
    buf[1] === 0x45 &&
    buf[2] === 0xdf &&
    buf[3] === 0xa3
  ) {
    return "video";
  }
  // AVI (RIFF + AVI)
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x41 &&
    buf[9] === 0x56 &&
    buf[10] === 0x49 &&
    buf[11] === 0x20
  ) {
    return "video";
  }
  // WAV (RIFF + WAVE)
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x41 &&
    buf[10] === 0x56 &&
    buf[11] === 0x45
  ) {
    return "audio";
  }
  // MP3 (ID3 tag)
  if (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) {
    return "audio";
  }
  // FLAC
  if (
    buf[0] === 0x66 &&
    buf[1] === 0x4c &&
    buf[2] === 0x61 &&
    buf[3] === 0x43
  ) {
    return "audio";
  }
  // OGG
  if (
    buf[0] === 0x4f &&
    buf[1] === 0x67 &&
    buf[2] === 0x67 &&
    buf[3] === 0x53
  ) {
    return "audio";
  }
  // ZIP (also .xlsx, .docx, .pptx — but without extension we default to archive)
  if (
    buf[0] === 0x50 &&
    buf[1] === 0x4b &&
    buf[2] === 0x03 &&
    buf[3] === 0x04
  ) {
    return "archive";
  }
  // GZIP
  if (buf[0] === 0x1f && buf[1] === 0x8b) {
    return "archive";
  }
  // RAR
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x61 &&
    buf[2] === 0x72 &&
    buf[3] === 0x21
  ) {
    return "archive";
  }

  return undefined;
}

/**
 * Type guard to check if an image input has alt text
 */
function isImageWithAltText(
  image: Buffer | string | ImageWithAltText,
): image is ImageWithAltText {
  return (
    typeof image === "object" && !Buffer.isBuffer(image) && "data" in image
  );
}

/**
 * Extract image data from an image input (handles both simple and alt text formats)
 */
function extractImageData(
  image: Buffer | string | ImageWithAltText,
): Buffer | string {
  if (isImageWithAltText(image)) {
    return image.data;
  }
  return image;
}

/**
 * Extract alt text from an image input if available
 */
function extractAltText(
  image: Buffer | string | ImageWithAltText,
): string | undefined {
  if (isImageWithAltText(image)) {
    return image.altText;
  }
  return undefined;
}

/**
 * Type guard for validating message roles
 */
function isValidRole(role: unknown): role is "user" | "assistant" | "system" {
  return (
    typeof role === "string" &&
    (role === "user" || role === "assistant" || role === "system")
  );
}

/**
 * Type guard for validating content items
 */
function isValidContentItem(
  item: unknown,
): item is
  | { type: "text"; text: string }
  | { type: "image"; image: string; mimeType?: string }
  | { type: "file"; data: Buffer; mimeType: string } {
  if (!item || typeof item !== "object") {
    return false;
  }

  const contentItem = item as Record<string, unknown>;

  if (contentItem.type === "text") {
    return typeof contentItem.text === "string";
  }

  if (contentItem.type === "image") {
    return (
      typeof contentItem.image === "string" &&
      (contentItem.mimeType === undefined ||
        typeof contentItem.mimeType === "string")
    );
  }

  if (contentItem.type === "file") {
    return (
      Buffer.isBuffer(contentItem.data) &&
      typeof contentItem.mimeType === "string"
    );
  }

  return false;
}

/**
 * Safely convert content item to AI SDK content format
 */
function convertContentItem(
  item: unknown,
):
  | TextPart
  | ImagePart
  | { type: "file"; data: Buffer; mimeType: string }
  | null {
  if (!isValidContentItem(item)) {
    return null;
  }

  const contentItem = item as {
    type: string;
    text?: string;
    image?: string;
    data?: Buffer;
    mimeType?: string;
  };

  if (contentItem.type === "text" && typeof contentItem.text === "string") {
    return { type: "text", text: contentItem.text } satisfies TextPart;
  }

  if (contentItem.type === "image" && typeof contentItem.image === "string") {
    return {
      type: "image",
      image: contentItem.image,
      ...(contentItem.mimeType && { mimeType: contentItem.mimeType }),
    } satisfies ImagePart;
  }

  if (
    contentItem.type === "file" &&
    Buffer.isBuffer(contentItem.data) &&
    contentItem.mimeType
  ) {
    return {
      type: "file",
      data: contentItem.data,
      mimeType: contentItem.mimeType,
    };
  }

  return null;
}

/**
 * Type-safe conversion from MultimodalChatMessage[] to CoreMessage[]
 * Filters out invalid content and ensures strict CoreMessage contract compliance
 */
export function convertToCoreMessages(
  messages: MultimodalChatMessage[],
): CoreMessage[] {
  return messages
    .map((msg): CoreMessage | null => {
      // Validate role
      if (!isValidRole(msg.role)) {
        logger.warn("Invalid message role found, skipping", { role: msg.role });
        return null;
      }

      // Handle string content
      if (typeof msg.content === "string") {
        // Create properly typed discriminated union messages
        if (msg.role === "system") {
          return {
            role: "system",
            content: msg.content,
          } satisfies CoreSystemMessage;
        } else if (msg.role === "user") {
          return {
            role: "user",
            content: msg.content,
          } satisfies CoreUserMessage;
        } else if (msg.role === "assistant") {
          return {
            role: "assistant",
            content: msg.content,
          } satisfies CoreAssistantMessage;
        }
      }

      // Handle array content (multimodal) - only user messages support full multimodal content
      if (Array.isArray(msg.content)) {
        const validContent = msg.content
          .map(convertContentItem)
          .filter((item): item is NonNullable<typeof item> => item !== null);

        // If no valid content items, skip the message
        if (validContent.length === 0) {
          logger.warn(
            "No valid content items found in multimodal message, skipping",
          );
          return null;
        }

        if (msg.role === "user") {
          // User messages support both text and image content
          return {
            role: "user",
            content: validContent,
          } satisfies CoreUserMessage;
        } else if (msg.role === "assistant") {
          // Assistant messages only support text content, filter out images
          const textOnlyContent = validContent.filter(
            (item) => item.type === "text",
          );
          if (textOnlyContent.length === 0) {
            // If no text content, convert to empty string
            return {
              role: "assistant",
              content: "",
            } satisfies CoreAssistantMessage;
          } else if (textOnlyContent.length === 1) {
            // Single text item, use string content
            return {
              role: "assistant",
              content: textOnlyContent[0].text,
            } satisfies CoreAssistantMessage;
          } else {
            // Multiple text items, concatenate them
            const combinedText = textOnlyContent
              .map((item) => item.text)
              .join(" ");
            return {
              role: "assistant",
              content: combinedText,
            } satisfies CoreAssistantMessage;
          }
        } else {
          // System messages cannot have multimodal content, convert to text
          const textContent =
            validContent.find((item) => item.type === "text")?.text || "";
          return {
            role: "system",
            content: textContent,
          } satisfies CoreSystemMessage;
        }
      }

      // Invalid content type
      logger.warn("Invalid message content type found, skipping", {
        contentType: typeof msg.content,
      });
      return null;
    })
    .filter((msg): msg is CoreMessage => msg !== null);
}

/**
 * Convert ChatMessage to CoreMessage for AI SDK compatibility
 */
function toCoreMessage(message: ChatMessage): CoreMessage | null {
  // Only include messages with roles supported by AI SDK
  if (
    message.role === "user" ||
    message.role === "assistant" ||
    message.role === "system"
  ) {
    return {
      role: message.role,
      content: message.content,
    };
  }
  return null; // Filter out tool_call and tool_result messages
}

/**
 * Format CSV metadata for LLM consumption
 */
function formatCSVMetadata(metadata: {
  rowCount?: number;
  columnCount?: number;
  columnNames?: string[];
  hasEmptyColumns?: boolean;
}): string {
  const parts: string[] = [];

  if (metadata.rowCount !== undefined) {
    parts.push(`${metadata.rowCount} data rows`);
  }

  if (metadata.columnCount !== undefined) {
    parts.push(`${metadata.columnCount} columns`);
  }

  if (metadata.columnNames && metadata.columnNames.length > 0) {
    const columns = metadata.columnNames.join(", ");
    parts.push(`Columns: [${columns}]`);
  }

  if (metadata.hasEmptyColumns) {
    parts.push(`⚠️ Contains empty column names`);
  }

  return parts.length > 0 ? `**Metadata**: ${parts.join(" | ")}` : "";
}

/**
 * Check if structured output mode should be enabled
 * Structured output is used when a schema is provided with json/structured format
 */
function shouldUseStructuredOutput(options: {
  schema?: unknown;
  output?: { format?: string };
}): boolean {
  return (
    !!options.schema &&
    (options.output?.format === "json" ||
      options.output?.format === "structured")
  );
}

/**
 * Build a properly formatted message array for AI providers
 * Combines system prompt, conversation history, and current user prompt
 * Supports both TextGenerationOptions and StreamOptions
 * Enhanced with CSV file processing support
 */
export async function buildMessagesArray(
  options: TextGenerationOptions | StreamOptions,
): Promise<CoreMessage[]> {
  const messages: CoreMessage[] = [];

  // Check if conversation history exists
  const hasConversationHistory =
    options.conversationMessages && options.conversationMessages.length > 0;

  // Build enhanced system prompt
  let systemPrompt = options.systemPrompt?.trim() || "";

  // Add conversation-aware instructions when history exists
  if (hasConversationHistory) {
    systemPrompt = `${systemPrompt.trim()}${CONVERSATION_INSTRUCTIONS}`;
  }

  // Add structured output instructions when schema is provided with json/structured format
  if (shouldUseStructuredOutput(options)) {
    systemPrompt = `${systemPrompt.trim()}${STRUCTURED_OUTPUT_INSTRUCTIONS}`;
  }

  // Add system message if we have one
  if (systemPrompt.trim()) {
    messages.push({
      role: "system",
      content: systemPrompt.trim(),
    });
  }

  // Add conversation history if available
  // Convert ChatMessages to CoreMessages and filter out tool messages
  if (hasConversationHistory && options.conversationMessages) {
    for (const chatMessage of options.conversationMessages) {
      const coreMessage = toCoreMessage(chatMessage);
      if (coreMessage) {
        messages.push(coreMessage);
      }
    }
  }

  // Add current user prompt (required)
  // Handle both TextGenerationOptions (prompt field) and StreamOptions (input.text field)
  let currentPrompt: string | undefined;

  if ("prompt" in options && options.prompt) {
    currentPrompt = options.prompt;
  } else if ("input" in options && options.input?.text) {
    currentPrompt = options.input.text;
  }

  // Process CSV files if present and inject into prompt using proper CSV parser
  if ("input" in options && options.input) {
    const input = options.input as {
      text?: string;
      csvFiles?: Array<Buffer | string>;
      files?: Array<Buffer | string>;
    };

    let csvContent = "";
    const csvOptions = "csvOptions" in options ? options.csvOptions : undefined;

    // Process explicit csvFiles array
    if (input.csvFiles && input.csvFiles.length > 0) {
      for (let i = 0; i < input.csvFiles.length; i++) {
        const csvFile = input.csvFiles[i];
        const filename = extractFilename(csvFile, i);
        const filePath = typeof csvFile === "string" ? csvFile : filename;
        try {
          const result = await FileDetector.detectAndProcess(csvFile, {
            allowedTypes: ["csv"],
            csvOptions: csvOptions,
          });

          let csvSection = `\n\n## CSV Data from "${filename}":\n`;

          // Add metadata from csv-parser library
          if (result.metadata) {
            const metadataText = formatCSVMetadata(result.metadata);
            if (metadataText) {
              csvSection += metadataText + `\n\n`;
            }
          }

          csvSection += buildCSVToolInstructions(filePath);

          csvSection += result.content;
          csvContent += csvSection;
          logger.info(`[CSV] ✅ Processed: ${filename}`, result.metadata);
        } catch (error) {
          logger.error(`[CSV] ❌ Failed to process ${filename}:`, error);
          csvContent += `\n\n## CSV Data Error: Failed to process "${filename}"\nReason: ${error instanceof Error ? error.message : "Unknown error"}`;
        }
      }
    }

    // Process unified files array (auto-detect CSV)
    if (input.files && input.files.length > 0) {
      for (const file of input.files) {
        const filename = extractFilename(file);
        try {
          const result = await FileDetector.detectAndProcess(file, {
            maxSize: 50 * 1024 * 1024,
            allowedTypes: ["csv"],
            csvOptions: csvOptions,
          });

          if (result.type === "csv") {
            let csvSection = `\n\n## CSV Data from "${filename}":\n`;

            // Add metadata from csv-parser library
            if (result.metadata) {
              const metadataText = formatCSVMetadata(result.metadata);
              if (metadataText) {
                csvSection += metadataText + `\n\n`;
              }
            }

            csvSection += result.content;
            csvContent += csvSection;
            logger.info(`[FileDetector] ✅ CSV: ${filename}`, result.metadata);
          }
        } catch (error) {
          // Silently skip non-CSV files in auto-detect mode
          logger.debug(
            `[FileDetector] Skipped ${filename}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    }

    // Prepend CSV content to current prompt
    if (csvContent) {
      currentPrompt = csvContent + (currentPrompt || "");
    }
  }

  if (currentPrompt?.trim()) {
    messages.push({
      role: "user",
      content: currentPrompt.trim(),
    });
  }

  return messages;
}

/**
 * Enforce aggregate file budget, excluding files that would exceed the context window.
 * Mutates options.input.files and options.input.text as needed.
 */
function enforceFileBudget(
  options: GenerateOptions,
  provider: string,
  model: string,
): void {
  if (!options.input.files || options.input.files.length === 0) {
    return;
  }

  const availableTokens = getAvailableInputTokens(provider, model);
  const budgetFiles = options.input.files.map((file, idx) => {
    let sizeBytes: number;
    let fileType: string | undefined;

    if (Buffer.isBuffer(file)) {
      sizeBytes = file.length;
      fileType = inferFileTypeFromBuffer(file);
    } else if (typeof file === "string") {
      if (existsSync(file)) {
        try {
          sizeBytes = statSync(file).size;
        } catch {
          sizeBytes = 0;
        }
      } else {
        sizeBytes = file.length;
      }
      fileType = inferFileTypeFromExtension(file);
    } else {
      sizeBytes = 0;
    }

    return {
      name: typeof file === "string" ? file : `file-${idx}`,
      sizeBytes,
      fileType,
      originalIndex: idx,
    };
  });

  const budgetResult = enforceAggregateFileBudget(
    budgetFiles.map((f) => ({
      name: f.name,
      sizeBytes: f.sizeBytes,
      fileType: f.fileType,
    })),
    availableTokens,
  );

  if (budgetResult.excluded.length > 0) {
    const includedNames = new Set(budgetResult.included.map((f) => f.name));
    options.input.files = options.input.files.filter((_file, idx) => {
      const entry = budgetFiles[idx];
      return includedNames.has(entry.name);
    });
    options.input.text =
      (options.input.text || "") + "\n\n" + budgetResult.notices.join("\n");
    logger.warn(
      `[FileDetector] Aggregate file budget enforcement: excluded ${budgetResult.excluded.length} file(s)`,
    );
  }
}

/**
 * Append a detected file result to options.input based on its type.
 * Handles CSV, SVG, image, PDF, video, audio, archive, xlsx, docx, pptx, text, and unknown types.
 */
function appendDetectedFileResult(
  result: {
    type: string;
    content: string | Buffer;
    mimeType: string;
    metadata?: Record<string, unknown>;
    images?: Array<Buffer | string | ImageWithAltText>;
  },
  file: AnyFileInput,
  options: GenerateOptions,
): void {
  const filename = extractFilename(file);

  if (result.type === "csv") {
    const filePath = typeof file === "string" ? file : filename;
    let csvSection = `\n\n## CSV Data from "${filename}":\n`;
    if (result.metadata) {
      const metadataText = formatCSVMetadata(result.metadata);
      if (metadataText) {
        csvSection += metadataText + `\n\n`;
      }
    }
    csvSection += buildCSVToolInstructions(filePath);
    csvSection += result.content;
    options.input.text += csvSection;
    logger.info(`[FileDetector] ✅ CSV: ${filename}`);
  } else if (result.type === "svg") {
    const svgSection = `\n\n## SVG Content from "${filename}":\n\`\`\`xml\n${result.content}\n\`\`\`\n`;
    options.input.text += svgSection;
    logger.info(`[FileDetector] ✅ SVG (as text): ${filename}`);
  } else if (result.type === "image") {
    options.input.images = [...(options.input.images || []), result.content];
    logger.info(`[FileDetector] ✅ Image: ${result.mimeType}`);
  } else if (result.type === "pdf") {
    options.input.pdfFiles = [
      ...(options.input.pdfFiles || []),
      result.content,
    ];
    logger.info(`[FileDetector] ✅ PDF: ${filename}`);
  } else if (result.type === "video") {
    if (result.content) {
      options.input.text += `\n\n## Video File: "${filename}"\n${result.content}\n`;
    }
    if (result.images && result.images.length > 0) {
      options.input.images = [
        ...(options.input.images || []),
        ...result.images,
      ];
      logger.info(
        `[FileDetector] Added ${result.images.length} video keyframes as images`,
      );
    }
    logger.info(`[FileDetector] ✅ Video: ${filename}`);
  } else if (result.type === "audio") {
    if (result.content) {
      options.input.text += `\n\n## Audio File: "${filename}"\n${result.content}\n`;
    }
    if (result.images && result.images.length > 0) {
      options.input.images = [
        ...(options.input.images || []),
        ...result.images,
      ];
      logger.info(`[FileDetector] Added audio cover art as image`);
    }
    logger.info(`[FileDetector] ✅ Audio: ${filename}`);
  } else if (result.type === "archive") {
    if (result.content) {
      options.input.text += `\n\n## Archive File: "${filename}"\n${result.content}\n`;
    }
    logger.info(`[FileDetector] ✅ Archive: ${filename}`);
  } else if (result.type === "xlsx") {
    if (result.content) {
      options.input.text += `\n\n## Spreadsheet: "${filename}"\n${result.content}\n`;
    }
    logger.info(`[FileDetector] ✅ Spreadsheet: ${filename}`);
  } else if (result.type === "docx") {
    if (result.content) {
      options.input.text += `\n\n## Document: "${filename}"\n${result.content}\n`;
    }
    logger.info(`[FileDetector] ✅ Document: ${filename}`);
  } else if (result.type === "pptx") {
    if (result.content) {
      options.input.text += `\n\n## Presentation: "${filename}"\n${result.content}\n`;
    }
    logger.info(`[FileDetector] ✅ Presentation: ${filename}`);
  } else if (result.type === "text") {
    if (result.content) {
      const langHint = getLanguageHint(result.mimeType, filename);
      const MAX_TEXT_FILE_CHARS = 200_000;
      let fileContent = result.content as string;
      let truncated = false;

      if (fileContent.length > MAX_TEXT_FILE_CHARS) {
        const headChars = Math.floor(MAX_TEXT_FILE_CHARS * 0.75);
        const tailChars = Math.floor(MAX_TEXT_FILE_CHARS * 0.25);
        const omittedChars = fileContent.length - headChars - tailChars;
        fileContent =
          fileContent.slice(0, headChars) +
          `\n\n... [${omittedChars.toLocaleString()} characters omitted — file truncated to fit context window] ...\n\n` +
          fileContent.slice(-tailChars);
        truncated = true;
      }

      const textSection = langHint
        ? `\n\n## File: "${filename}"\n\`\`\`${langHint}\n${fileContent}\n\`\`\`\n`
        : `\n\n## File: "${filename}"\n${fileContent}\n`;
      options.input.text += textSection;

      if (truncated) {
        logger.warn(
          `[FileDetector] Large text file "${filename}" truncated from ${(result.content as string).length.toLocaleString()} to ${MAX_TEXT_FILE_CHARS.toLocaleString()} chars`,
        );
      }
    }
    logger.info(`[FileDetector] ✅ Text: ${filename}`);
  } else if (result.type === "unknown") {
    if (result.content) {
      options.input.text += `\n\n## Attached File: "${filename}"\n${result.content}\n`;
    }
    logger.info(
      `[FileDetector] ⚠️ Unknown format (metadata extracted): ${filename}`,
    );
  }
}

/**
 * Process the unified files array with auto-detection.
 * Handles lazy file registration, full processing, and preview injection.
 */
async function processUnifiedFilesArray(
  options: GenerateOptions,
  maxSize: number,
  provider: string,
): Promise<void> {
  if (!options.input.files || options.input.files.length === 0) {
    return;
  }

  logger.info(
    `[FileDetector] Processing ${options.input.files.length} file(s) with auto-detection`,
  );

  options.input.text = options.input.text || "";

  const fileRegistry = options.fileRegistry as
    | FileReferenceRegistry
    | undefined;

  for (let fileIdx = 0; fileIdx < options.input.files.length; fileIdx++) {
    const file = options.input.files[fileIdx];
    try {
      // ─── Lazy file registration path ──────────────────────────────
      const fileSize = fileRegistry ? getFileSize(file) : 0;
      if (fileRegistry && fileSize > SIZE_TIER_THRESHOLDS.TINY_MAX) {
        const registered = await tryRegisterFileReference(
          file,
          fileSize,
          fileRegistry,
          fileIdx,
        );
        if (registered) {
          continue;
        }
      }

      // ─── Full processing path (current behavior) ──────────────────
      const genericFileMaxSize = Math.max(maxSize, 100 * 1024 * 1024);
      const rawFileInput = isFileWithMetadata(file) ? file.buffer : file;
      const result = await FileDetector.detectAndProcess(rawFileInput, {
        maxSize: genericFileMaxSize,
        allowedTypes: [
          "csv",
          "image",
          "pdf",
          "svg",
          "video",
          "audio",
          "archive",
          "xlsx",
          "docx",
          "pptx",
          "text",
          "unknown",
        ],
        csvOptions: options.csvOptions,
        provider: provider,
      });

      appendDetectedFileResult(result, file, options);
    } catch (error) {
      logger.error(`[FileDetector] ❌ Failed to process file:`, error);
    }
  }

  // After processing all files, inject previews for any lazily-registered files
  if (fileRegistry && fileRegistry.size > 0) {
    const previewText = await fileRegistry.generatePromptPreview();
    if (previewText) {
      options.input.text = (options.input.text || "") + previewText;
      logger.info(
        `[FileDetector] Injected previews for ${fileRegistry.size} lazily-registered file(s)`,
      );
    }
    const registeredFiles = fileRegistry.list();
    for (const ref of registeredFiles) {
      if (ref.extractedImages && ref.extractedImages.length > 0) {
        options.input.images = [
          ...(options.input.images || []),
          ...ref.extractedImages,
        ];
        logger.info(
          `[FileDetector] Injected ${ref.extractedImages.length} extracted images from "${ref.filename}"`,
        );
      }
    }
  }
}

/**
 * Process explicit CSV files array and append to options.input.text.
 */
async function processExplicitCsvFiles(
  options: GenerateOptions,
): Promise<void> {
  if (!options.input.csvFiles || options.input.csvFiles.length === 0) {
    return;
  }

  logger.info(
    `[CSV] Processing ${options.input.csvFiles.length} explicit CSV file(s)`,
  );

  options.input.text = options.input.text || "";

  for (let i = 0; i < options.input.csvFiles.length; i++) {
    const csvFile = options.input.csvFiles[i];

    try {
      const result = await FileDetector.detectAndProcess(csvFile, {
        allowedTypes: ["csv"],
        csvOptions: options.csvOptions,
      });

      const filename = extractFilename(csvFile, i);
      const filePath = typeof csvFile === "string" ? csvFile : filename;
      let csvSection = `\n\n## CSV Data from "${filename}":\n`;

      if (result.metadata) {
        const metadataText = formatCSVMetadata(result.metadata);
        if (metadataText) {
          csvSection += metadataText + `\n\n`;
        }
      }

      csvSection += buildCSVToolInstructions(filePath);
      csvSection += result.content;
      options.input.text += csvSection;
      logger.info(`[CSV] ✅ Processed: ${filename}`);
    } catch (error) {
      logger.error(`[CSV] ❌ Failed:`, error);
      const filename = extractFilename(csvFile, i);
      options.input.text += `\n\n## CSV Data Error: Failed to process "${filename}"`;
      options.input.text += `\nReason: ${error instanceof Error ? error.message : "Unknown error"}`;
    }
  }
}

/**
 * Enforce post-processing budget on accumulated text content and log token usage.
 */
function enforcePostProcessingBudget(
  options: GenerateOptions,
  provider: string,
  model: string,
): void {
  if (!options.input.text) {
    return;
  }

  const availableTokens = getAvailableInputTokens(provider, model);
  const textTokenBudget = Math.floor(
    availableTokens * FILE_READ_BUDGET_PERCENT,
  );
  const actualTextTokens = estimateTokens(options.input.text, provider);

  if (actualTextTokens > textTokenBudget && textTokenBudget > 0) {
    const maxChars = textTokenBudget * 4;
    if (options.input.text.length > maxChars) {
      const headChars = Math.floor(maxChars * 0.75);
      const tailChars = Math.floor(maxChars * 0.25);
      const head = options.input.text.slice(0, headChars);
      const tail = options.input.text.slice(-tailChars);
      const truncatedTokens = actualTextTokens - textTokenBudget;
      options.input.text =
        head +
        `\n\n[... ${truncatedTokens.toLocaleString()} tokens of file content truncated to fit context window ...]\n\n` +
        tail;
      logger.warn(
        `[FileDetector] Post-processing budget enforcement: truncated ~${truncatedTokens.toLocaleString()} tokens of file content to fit ${textTokenBudget.toLocaleString()} token budget`,
      );
    }
  }

  // Token usage breakdown logging
  const textTokens = estimateTokens(options.input.text, provider);
  const imageCount =
    (options.input.images?.length ?? 0) +
    (options.input.content?.filter((c) => c.type === "image").length ?? 0);
  const imageTokens = imageCount * 1500;
  const totalContentTokens = textTokens + imageTokens;
  const contextWindow = getAvailableInputTokens(provider, model);

  logger.info(
    `[TokenUsage] Content breakdown: text=${textTokens.toLocaleString()} tokens, ` +
      `images=${imageCount} (~${imageTokens.toLocaleString()} tokens), ` +
      `total=${totalContentTokens.toLocaleString()} tokens, ` +
      `budget=${contextWindow.toLocaleString()} tokens, ` +
      `utilization=${contextWindow > 0 ? ((totalContentTokens / contextWindow) * 100).toFixed(1) : "N/A"}%`,
  );
}

/**
 * Process explicit PDF files and return structured PDF entries for multimodal processing.
 */
async function processExplicitPdfFiles(
  options: GenerateOptions,
  maxSize: number,
  provider: string,
): Promise<
  Array<{ buffer: Buffer; filename: string; pageCount?: number | null }>
> {
  const pdfFiles: Array<{
    buffer: Buffer;
    filename: string;
    pageCount?: number | null;
  }> = [];

  if (!options.input.pdfFiles || options.input.pdfFiles.length === 0) {
    return pdfFiles;
  }

  logger.info(
    `[PDF] Processing ${options.input.pdfFiles.length} explicit PDF file(s) for ${provider}`,
  );

  for (let i = 0; i < options.input.pdfFiles.length; i++) {
    const pdfFile = options.input.pdfFiles[i];
    const filename = extractFilename(pdfFile, i);

    try {
      const result = await FileDetector.detectAndProcess(pdfFile, {
        maxSize,
        allowedTypes: ["pdf"],
        provider: provider,
      });

      if (Buffer.isBuffer(result.content)) {
        pdfFiles.push({
          buffer: result.content,
          filename,
          pageCount: result.metadata?.estimatedPages ?? null,
        });
        logger.info(
          `[PDF] ✅ Queued for multimodal: ${filename} (${result.metadata?.estimatedPages ?? "unknown"} pages)`,
        );
      }
    } catch (error) {
      logger.error(`[PDF] ❌ Failed to process ${filename}:`, error);
      throw error;
    }
  }

  return pdfFiles;
}

/**
 * Build the enhanced system prompt for multimodal messages, including
 * conversation instructions, structured output instructions, and file handling guidance.
 */
function buildMultimodalSystemPrompt(
  options: GenerateOptions,
  hasPDFFiles: boolean,
): string {
  let systemPrompt = options.systemPrompt?.trim() || "";

  const hasConversationHistory =
    options.conversationHistory && options.conversationHistory.length > 0;
  if (hasConversationHistory) {
    systemPrompt = `${systemPrompt.trim()}${CONVERSATION_INSTRUCTIONS}`;
  }

  if (shouldUseStructuredOutput(options)) {
    systemPrompt = `${systemPrompt.trim()}${STRUCTURED_OUTPUT_INSTRUCTIONS}`;
  }

  const hasCSVFiles =
    (options.input.csvFiles && options.input.csvFiles.length > 0) ||
    (options.input.files &&
      options.input.files.some((f) =>
        typeof f === "string" ? f.toLowerCase().endsWith(".csv") : false,
      ));

  if (hasCSVFiles || hasPDFFiles) {
    const fileTypes = [];
    if (hasPDFFiles) {
      fileTypes.push("PDFs");
    }
    if (hasCSVFiles) {
      fileTypes.push("CSVs");
    }

    systemPrompt += `\n\nIMPORTANT FILE HANDLING INSTRUCTIONS:
- File content (${fileTypes.join(", ")}, images) is already processed and included in this message
- DO NOT use GitHub tools (get_file_contents, search_code, etc.) for local files - they only work for remote repository files
- Analyze the provided file content directly without attempting to fetch or read files using tools
- GitHub MCP tools are ONLY for remote repository operations, not local filesystem access
- Use the file content shown in this message for your analysis`;
  }

  return systemPrompt;
}

/**
 * Build multimodal message array with image support
 * Detects when images are present and routes through provider adapter
 */
export async function buildMultimodalMessagesArray(
  options: GenerateOptions,
  provider: string,
  model: string,
): Promise<MultimodalChatMessage[]> {
  // Compute provider-specific max PDF size once for consistent validation
  const pdfConfig = PDFProcessor.getProviderConfig(provider);
  const maxSize = pdfConfig
    ? pdfConfig.maxSizeMB * 1024 * 1024
    : 10 * 1024 * 1024;

  // Aggregate file budget enforcement
  enforceFileBudget(options, provider, model);

  // Process unified files array (auto-detect)
  await processUnifiedFilesArray(options, maxSize, provider);

  // Process explicit CSV files array
  await processExplicitCsvFiles(options);

  // Post-processing budget enforcement and token usage logging
  enforcePostProcessingBudget(options, provider, model);

  // Process explicit PDF files
  const pdfFiles = await processExplicitPdfFiles(options, maxSize, provider);

  // Check if this is a multimodal request
  const hasImages =
    (options.input.images && options.input.images.length > 0) ||
    (options.input.content &&
      options.input.content.some((c) => c.type === "image"));

  const hasPDFs = pdfFiles.length > 0;

  // If no images or PDFs, use standard message building and convert to MultimodalChatMessage[]
  if (!hasImages && !hasPDFs) {
    if (options.input.csvFiles) {
      options.input.csvFiles = [];
    }
    if (options.input.pdfFiles) {
      options.input.pdfFiles = [];
    }
    if (options.input.files) {
      options.input.files = [];
    }

    const standardMessages = await buildMessagesArray(
      options as TextGenerationOptions,
    );
    return standardMessages.map(
      (msg) =>
        ({
          role: msg.role,
          content: typeof msg.content === "string" ? msg.content : msg.content,
        }) as MultimodalChatMessage,
    );
  }

  // Validate provider supports vision
  if (!ProviderImageAdapter.supportsVision(provider, model)) {
    throw new Error(
      `Provider ${provider} with model ${model} does not support vision processing. ` +
        `Supported providers: ${ProviderImageAdapter.getVisionProviders().join(", ")}`,
    );
  }

  const messages: MultimodalChatMessage[] = [];

  // Build enhanced system prompt
  const systemPrompt = buildMultimodalSystemPrompt(
    options,
    pdfFiles.length > 0,
  );

  if (systemPrompt.trim()) {
    messages.push({
      role: "system",
      content: systemPrompt.trim(),
    });
  }

  // Add conversation history if available
  const hasConversationHistory =
    options.conversationHistory && options.conversationHistory.length > 0;
  if (hasConversationHistory && options.conversationHistory) {
    options.conversationHistory.forEach((msg) => {
      messages.push({
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content,
      });
    });
  }

  // Handle multimodal content
  try {
    let userContent: string | unknown;

    if (options.input.content && options.input.content.length > 0) {
      userContent = await convertContentToProviderFormat(
        options.input.content,
        provider,
        model,
      );
    } else if (
      (options.input.images && options.input.images.length > 0) ||
      pdfFiles.length > 0
    ) {
      userContent = await convertMultimodalToProviderFormat(
        options.input.text,
        options.input.images || [],
        pdfFiles,
        provider,
        model,
      );
    } else {
      userContent = options.input.text;
    }

    if (typeof userContent === "string") {
      messages.push({
        role: "user",
        content: userContent,
      });
    } else {
      messages.push({
        role: "user",
        content: userContent as MessageContent[],
      });
    }

    return messages;
  } catch (error) {
    MultimodalLogger.logError("MULTIMODAL_BUILD", error as Error, {
      provider,
      model,
      hasImages,
      imageCount: options.input.images?.length || 0,
    });
    throw error;
  }
}

/**
 * Convert advanced content format to provider-specific format
 */
async function convertContentToProviderFormat(
  content: Content[],
  provider: string,
  _model: string,
): Promise<unknown> {
  const textContent = content.find((c) => c.type === "text");
  const imageContent = content.filter((c) => c.type === "image");

  if (!textContent) {
    throw new Error(
      "Multimodal content must include at least one text element",
    );
  }

  if (imageContent.length === 0) {
    return textContent.text;
  }

  // Extract images as Buffer | string array
  const images = imageContent.map((img) => img.data);

  return await convertSimpleImagesToProviderFormat(
    textContent.text,
    images,
    provider,
    _model,
  );
}

/**
 * Check if a string is an internet URL
 */
function isInternetUrl(input: string): boolean {
  return input.startsWith("http://") || input.startsWith("https://");
}

/**
 * Download image from URL and convert to base64 data URI
 * Rate-limited to 10 downloads per second to prevent DoS
 * Uses LRU cache to avoid redundant downloads of the same URL
 */
async function downloadImageFromUrl(url: string): Promise<string> {
  // Check cache first (before rate limiting)
  const cache = getImageCache();
  const cached = cache.get(url);
  if (cached) {
    logger.debug("Using cached image for URL", { url: url.substring(0, 50) });
    return cached.dataUri;
  }

  // Apply rate limiting only if cache missed
  await urlDownloadRateLimiter.acquire();

  try {
    const response = await request(url, {
      dispatcher: getGlobalDispatcher().compose(
        interceptors.redirect({ maxRedirections: 5 }),
      ),
      method: "GET",
      headersTimeout: 10000, // 10 second timeout for headers
      bodyTimeout: 30000, // 30 second timeout for body,
    });

    if (response.statusCode !== 200) {
      throw new Error(
        `HTTP ${response.statusCode}: Failed to download image from ${url}`,
      );
    }

    // Get content type from headers
    const contentType =
      (response.headers["content-type"] as string) || "image/jpeg";

    // Validate it's an image
    if (!contentType.startsWith("image/")) {
      throw new Error(
        `URL does not point to an image. Content-Type: ${contentType}`,
      );
    }

    // Read the response body
    const chunks: Buffer[] = [];
    for await (const chunk of response.body) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // Check file size (limit to 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (buffer.length > maxSize) {
      throw new Error(
        `Image too large: ${buffer.length} bytes (max: ${maxSize} bytes)`,
      );
    }

    // Convert to base64 data URI
    const base64 = buffer.toString("base64");
    const dataUri = `data:${contentType};base64,${base64}`;

    // Store in cache for future use
    cache.set(url, dataUri, contentType, buffer);

    return dataUri;
  } catch (error) {
    MultimodalLogger.logError("URL_DOWNLOAD_FAILED", error as Error, { url });
    throw new Error(
      `Failed to download image from ${url}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Convert simple images format to Vercel AI SDK format with smart auto-detection
 * - URLs: Downloaded and converted to base64 for Vercel AI SDK compatibility
 * - Local files: Converted to base64 for Vercel AI SDK compatibility
 * - Buffers/Data URIs: Processed normally
 * - Supports alt text for accessibility (included as context in text parts)
 */
async function convertSimpleImagesToProviderFormat(
  text: string,
  images: Array<Buffer | string | ImageWithAltText>,
  provider: string,
  _model: string,
): Promise<Array<TextPart | ImagePart>> {
  // For Vercel AI SDK, we need to return the content in the standard format
  // The Vercel AI SDK will handle provider-specific formatting internally

  // IMPORTANT: Generate alt text descriptions BEFORE URL downloading to maintain correct image numbering
  // This ensures image numbers match the original order provided by users, even if some URLs fail to download
  const altTextDescriptions = images
    .map((image, idx) => {
      const altText = extractAltText(image);
      return altText ? `[Image ${idx + 1}: ${altText}]` : null;
    })
    .filter(Boolean);

  // Build enhanced text with alt text context for accessibility
  // NOTE: Alt text is appended to the user's prompt as contextual information because most AI providers
  // don't have native alt text fields in their APIs. This approach ensures accessibility metadata
  // is preserved and helps AI models better understand image content.
  const enhancedText =
    altTextDescriptions.length > 0
      ? `${text}\n\nImage descriptions for context: ${altTextDescriptions.join(" ")}`
      : text;

  // Smart auto-detection: separate URLs from actual image data
  // Also track alt text for each image
  const urlImages: Array<{ url: string; altText?: string }> = [];
  const actualImages: Array<{ data: Buffer | string; altText?: string }> = [];

  images.forEach((image, _index) => {
    const imageData = extractImageData(image);
    const altText = extractAltText(image);

    if (typeof imageData === "string" && isInternetUrl(imageData)) {
      // Internet URL - will be downloaded and converted to base64
      urlImages.push({ url: imageData, altText });
    } else {
      // Actual image data (file path, Buffer, data URI) - process for Vercel AI SDK
      actualImages.push({ data: imageData, altText });
    }
  });

  // Download URL images and add to actual images
  for (const { url, altText } of urlImages) {
    try {
      const downloadedDataUri = await downloadImageFromUrl(url);
      actualImages.push({ data: downloadedDataUri, altText });
    } catch (error) {
      MultimodalLogger.logError(
        "URL_DOWNLOAD_FAILED_SKIPPING",
        error as Error,
        { url },
      );
      // Continue processing other images even if one URL fails
      logger.warn(
        `Failed to download image from ${url}, skipping: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  const content: Array<TextPart | ImagePart> = [
    { type: "text", text: enhancedText },
  ];

  // Process all images (including downloaded URLs) for Vercel AI SDK
  actualImages.forEach(({ data: image }, index) => {
    try {
      // Vercel AI SDK expects { type: 'image', image: Buffer | string, mimeType?: string }
      // For Vertex AI, we need to include mimeType
      let imageData: string;
      let mimeType = "image/jpeg"; // Default mime type

      if (typeof image === "string") {
        if (image.startsWith("data:")) {
          // Data URI (including downloaded URLs) - extract mime type and use directly
          const match = image.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            mimeType = match[1];
            imageData = image; // Keep as data URI for Vercel AI SDK
          } else {
            imageData = image;
          }
        } else if (isInternetUrl(image)) {
          // This should not happen as URLs are processed separately above
          // But handle it gracefully just in case
          throw new Error(`Unprocessed URL found in actualImages: ${image}`);
        } else {
          // File path string - convert to base64 data URI
          try {
            if (existsSync(image)) {
              const buffer = readFileSync(image);
              const base64 = buffer.toString("base64");

              // Detect mime type from file extension
              const ext = image.toLowerCase().split(".").pop();
              switch (ext) {
                case "png":
                  mimeType = "image/png";
                  break;
                case "gif":
                  mimeType = "image/gif";
                  break;
                case "webp":
                  mimeType = "image/webp";
                  break;
                case "bmp":
                  mimeType = "image/bmp";
                  break;
                case "tiff":
                case "tif":
                  mimeType = "image/tiff";
                  break;
                default:
                  mimeType = "image/jpeg";
                  break;
              }

              imageData = `data:${mimeType};base64,${base64}`;
            } else {
              throw new Error(`Image file not found: ${image}`);
            }
          } catch (error) {
            MultimodalLogger.logError("FILE_PATH_CONVERSION", error as Error, {
              index,
              filePath: image,
            });
            throw new Error(
              `Failed to convert file path to base64: ${image}. ${error}`,
            );
          }
        }
      } else {
        // Buffer - convert to base64 data URI
        const base64 = image.toString("base64");
        imageData = `data:${mimeType};base64,${base64}`;
      }

      content.push({
        type: "image" as const,
        image: imageData,
        mimeType: mimeType, // Add mimeType for Vertex AI compatibility
      } as ImagePart);
    } catch (error) {
      MultimodalLogger.logError("ADD_IMAGE_TO_CONTENT", error as Error, {
        index,
        provider,
      });
      throw error;
    }
  });

  return content;
}

/**
 * Convert multimodal content (images + PDFs) to provider format
 */
async function convertMultimodalToProviderFormat(
  text: string,
  images: Array<Buffer | string | ImageWithAltText>,
  pdfFiles: Array<{
    buffer: Buffer;
    filename: string;
    pageCount?: number | null;
  }>,
  provider: string,
  model: string,
): Promise<Array<TextPart | ImagePart | FilePart>> {
  const content: Array<TextPart | ImagePart | FilePart> = [
    { type: "text", text },
  ];

  // Add images if present
  if (images.length > 0) {
    const imageContent = await convertSimpleImagesToProviderFormat(
      "",
      images,
      provider,
      model,
    );
    if (Array.isArray(imageContent)) {
      imageContent.forEach((item) => {
        if (item.type !== "text") {
          content.push(item);
        }
      });
    }
  }

  // Check if provider supports native PDF processing
  const supportsNativePDF = PDFProcessor.supportsNativePDF(provider);

  if (supportsNativePDF) {
    // Add PDFs using Vercel AI SDK standard format (works for providers with native PDF support)
    content.push(
      ...pdfFiles.map((pdf): FilePart => {
        logger.info(
          `[PDF] ✅ Added to content (native PDF format): ${pdf.filename}`,
        );
        return {
          type: "file" as const,
          data: pdf.buffer,
          mimeType: "application/pdf",
        };
      }),
    );
  } else {
    // Provider doesn't support native PDF - convert PDF pages to images
    // This enables PDF processing for providers like Mistral, Ollama that support images but not PDFs
    logger.info(
      `[PDF→Image] Provider ${provider} doesn't support native PDF. Converting ${pdfFiles.length} PDF(s) to images...`,
    );

    for (const pdf of pdfFiles) {
      try {
        const conversionResult = await PDFImageConverter.convertToImages(
          pdf.buffer,
          {
            scale: 2.0, // High quality for OCR/analysis
            maxPages: 20, // Limit pages to prevent token overflow
          },
        );

        logger.info(
          `[PDF→Image] ✅ Converted ${pdf.filename}: ${conversionResult.pageCount} page(s) → images`,
        );

        // Add each page as an ImagePart
        conversionResult.images.forEach((base64Image, pageIndex) => {
          content.push({
            type: "image" as const,
            image: `data:image/png;base64,${base64Image}`,
            mimeType: "image/png",
          } as ImagePart);

          logger.debug(
            `[PDF→Image] Added page ${pageIndex + 1}/${conversionResult.pageCount} of ${pdf.filename}`,
          );
        });

        // Log any warnings from conversion
        if (conversionResult.warnings) {
          conversionResult.warnings.forEach((warning) => {
            logger.warn(`[PDF→Image] ${warning}`);
          });
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logger.error(
          `[PDF→Image] ❌ Failed to convert ${pdf.filename}: ${errorMessage}`,
        );

        // Re-throw so the user knows PDF processing failed
        throw new Error(
          `PDF to image conversion failed for ${pdf.filename}: ${errorMessage}. ` +
            `Provider ${provider} doesn't support native PDFs and image conversion failed.`,
        );
      }
    }
  }

  return content;
}

/** Union type for file inputs: raw Buffer, path/URL string, or object with metadata */
type AnyFileInput = Buffer | string | FileWithMetadata;

/**
 * Type guard for FileWithMetadata objects.
 */
function isFileWithMetadata(file: AnyFileInput): file is FileWithMetadata {
  return (
    typeof file === "object" &&
    !Buffer.isBuffer(file) &&
    "buffer" in file &&
    "filename" in file
  );
}

/**
 * Extract filename from file input.
 * Supports Buffers (generic name), strings (path/URL), and FileWithMetadata objects.
 */
function extractFilename(file: AnyFileInput, index: number = 0): string {
  if (isFileWithMetadata(file)) {
    return file.filename;
  }
  if (typeof file === "string") {
    if (file.startsWith("http")) {
      try {
        const url = new URL(file);
        return url.pathname.split("/").pop() || `file-${index + 1}`;
      } catch {
        return `file-${index + 1}`;
      }
    }
    return (
      file.split("/").pop() || file.split("\\").pop() || `file-${index + 1}`
    );
  }
  return `file-${index + 1}`;
}

/**
 * Get the byte size of a file input.
 * For FileWithMetadata: returns buffer.length.
 * For Buffers: returns buffer.length.
 * For strings that are file paths: returns the stat size.
 * For URLs/data URIs: returns a rough estimate from string length.
 */
function getFileSize(file: AnyFileInput): number {
  if (isFileWithMetadata(file)) {
    return file.buffer.length;
  }
  if (Buffer.isBuffer(file)) {
    return file.length;
  }
  if (typeof file === "string" && existsSync(file)) {
    try {
      return statSync(file).size;
    } catch {
      return 0;
    }
  }
  // For URLs and data URIs, use string length as rough estimate
  return typeof file === "string" ? file.length : 0;
}

/**
 * Get a Buffer from a file input.
 * For FileWithMetadata: returns the buffer property.
 * For Buffers: returns as-is.
 * For file paths: reads the file.
 * For URLs/data URIs: returns null (not supported for lazy registration).
 */
async function getFileBuffer(file: AnyFileInput): Promise<Buffer | null> {
  if (isFileWithMetadata(file)) {
    return file.buffer;
  }
  if (Buffer.isBuffer(file)) {
    return file;
  }
  if (typeof file === "string" && existsSync(file)) {
    try {
      return readFileSync(file) as Buffer;
    } catch {
      return null;
    }
  }
  // URLs and data URIs can't be lazily registered (need download first)
  return null;
}

/**
 * Determine the source type of a file input.
 */
function getFileSource(
  file: AnyFileInput,
): "buffer" | "path" | "url" | "datauri" {
  if (isFileWithMetadata(file)) {
    return "buffer";
  }
  if (Buffer.isBuffer(file)) {
    return "buffer";
  }
  if (typeof file === "string") {
    if (file.startsWith("data:")) {
      return "datauri";
    }
    if (file.startsWith("http://") || file.startsWith("https://")) {
      return "url";
    }
    if (existsSync(file)) {
      return "path";
    }
  }
  return "buffer";
}

/**
 * Try to register a file with the FileReferenceRegistry for lazy processing.
 * Returns true if registration succeeded, false if it failed (caller should
 * fall through to full processing).
 */
async function tryRegisterFileReference(
  file: AnyFileInput,
  fileSize: number,
  registry: FileReferenceRegistry,
  index: number = 0,
): Promise<boolean> {
  try {
    const buffer = await getFileBuffer(file);
    if (!buffer) {
      return false;
    }
    const filename = extractFilename(file, index);
    await registry.register(buffer, getFileSource(file), { filename });
    logger.info(
      `[FileDetector] Registered "${filename}" (${(fileSize / 1024).toFixed(0)} KB) ` +
        `as lazy reference — skipping upfront processing`,
    );
    return true;
  } catch (regError) {
    logger.warn(
      `[FileDetector] Failed to register file as reference, falling back to full processing: ${
        regError instanceof Error ? regError.message : String(regError)
      }`,
    );
    return false;
  }
}

/**
 * Get a language hint for code fencing based on MIME type or filename extension.
 * Returns the language identifier for markdown code blocks, or null for generic text.
 */
function getLanguageHint(mimeType: string, filename: string): string | null {
  // Try MIME type first
  const mimeMap: Record<string, string> = {
    "text/javascript": "javascript",
    "text/typescript": "typescript",
    "text/x-python": "python",
    "text/x-java-source": "java",
    "text/x-go": "go",
    "text/x-rustsrc": "rust",
    "text/x-ruby": "ruby",
    "text/x-php": "php",
    "text/x-c": "c",
    "text/x-c++": "cpp",
    "text/x-csharp": "csharp",
    "text/x-swift": "swift",
    "text/x-kotlin": "kotlin",
    "text/x-scala": "scala",
    "text/x-shellscript": "bash",
    "text/x-powershell": "powershell",
    "text/x-sql": "sql",
    "text/x-r": "r",
    "text/x-lua": "lua",
    "text/x-perl": "perl",
    "text/x-dart": "dart",
    "text/x-elixir": "elixir",
    "text/x-erlang": "erlang",
    "text/x-haskell": "haskell",
    "text/x-clojure": "clojure",
    "text/x-lisp": "lisp",
    "text/html": "html",
    "text/css": "css",
    "text/markdown": "markdown",
    "application/json": "json",
    "application/xml": "xml",
    "text/xml": "xml",
    "application/yaml": "yaml",
    "application/x-yaml": "yaml",
  };
  const lower = mimeType.toLowerCase().split(";")[0].trim();
  if (mimeMap[lower]) {
    return mimeMap[lower];
  }

  // Fallback: try extension from filename
  const ext = filename.split(".").pop()?.toLowerCase();
  if (!ext) {
    return null;
  }
  const extMap: Record<string, string> = {
    js: "javascript",
    mjs: "javascript",
    cjs: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    py: "python",
    java: "java",
    go: "go",
    rs: "rust",
    rb: "ruby",
    php: "php",
    c: "c",
    cpp: "cpp",
    cc: "cpp",
    h: "c",
    hpp: "cpp",
    cs: "csharp",
    swift: "swift",
    kt: "kotlin",
    kts: "kotlin",
    scala: "scala",
    sh: "bash",
    bash: "bash",
    zsh: "bash",
    ps1: "powershell",
    sql: "sql",
    r: "r",
    lua: "lua",
    pl: "perl",
    perl: "perl",
    dart: "dart",
    ex: "elixir",
    exs: "elixir",
    erl: "erlang",
    hs: "haskell",
    clj: "clojure",
    lisp: "lisp",
    vim: "vim",
    html: "html",
    htm: "html",
    css: "css",
    md: "markdown",
    markdown: "markdown",
    json: "json",
    xml: "xml",
    yaml: "yaml",
    yml: "yaml",
    toml: "toml",
    ini: "ini",
    cfg: "ini",
  };
  return extMap[ext] || null;
}

function buildCSVToolInstructions(filePath: string): string {
  return `\n**NOTE**: You can perform calculations directly on the CSV data shown above. For advanced operations on the full file (counting by column, grouping, etc.), you may optionally use the analyzeCSV tool with filePath="${filePath}".\n\nExample: analyzeCSV(filePath="${filePath}", operation="count_by_column", column="merchant_id")\n\n`;
}
