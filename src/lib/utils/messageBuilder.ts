import { existsSync, readFileSync, statSync } from "fs";
import { readFile as readFileAsync, stat as statAsync } from "fs/promises";
import { request } from "undici";
import { redirectFollowingDispatcher } from "./redirectDispatcher.js";
import {
  MultimodalLogger,
  ProviderImageAdapter,
} from "../adapters/providerImageAdapter.js";
import {
  CONVERSATION_INSTRUCTIONS,
  STRUCTURED_OUTPUT_INSTRUCTIONS,
} from "../config/conversationMemory.js";
import { getAvailableInputTokens } from "../constants/contextWindows.js";
import { PDF_LIMITS } from "../core/constants.js";
import {
  enforceAggregateFileBudget,
  FILE_READ_BUDGET_PERCENT,
} from "../context/fileTokenBudget.js";
import type { FileReferenceRegistry } from "../files/fileReferenceRegistry.js";
import { isCSVContent, SIZE_TIER_THRESHOLDS } from "../types/index.js";
import type {
  ChatMessage,
  Content,
  CSVContent,
  FileInput,
  FileWithMetadata,
  GenerateOptions,
  ImageWithAltText,
  MessageContent,
  MultimodalChatMessage,
  StreamOptions,
  TextGenerationOptions,
} from "../types/index.js";
import { tracers, ATTR, withSpan } from "../telemetry/index.js";
import {
  needsVisionTranscode,
  toVisionCompatibleImage,
} from "../adapters/imageFormatSupport.js";
import {
  FILE_TYPE_REGISTRY,
  lookupByExtension,
} from "../processors/config/fileTypeRegistry.js";
import { ErrorFactory, NeuroLinkError, withTimeout } from "./errorHandling.js";
import { FileDetector } from "./fileDetector.js";
import { detectIsoBmffImageMimeType } from "./isoBmff.js";
import {
  needsAudioTranscode,
  supportsNativeAudio,
  toProviderCompatibleAudio,
} from "../adapters/audioFormatSupport.js";
import { getImageCache } from "./imageCache.js";
import { ImageProcessor, imageUtils } from "./imageProcessor.js";
import { logger } from "./logger.js";
import { looksLikeSvgMarkup } from "./markupSniff.js";
import { redactUrlForError } from "./logSanitize.js";
import { PDFImageConverter, PDFProcessor } from "./pdfProcessor.js";
import { urlDownloadRateLimiter } from "./rateLimiter.js";
import { estimateTokens } from "./tokenEstimation.js";
import type {
  AssistantModelMessage,
  ModelMessage,
  SystemModelMessage,
  UserModelMessage,
  FilePart,
  ImagePart,
  TextPart,
  MultimodalAudioEntry,
  MultimodalPdfEntry,
} from "../types/index.js";

// ---------------------------------------------------------------------------
// SDK-7: Lightweight file-type inference helpers for budget estimation
// These avoid calling the full FileDetector pipeline — they only need to
// classify files into broad categories (video, audio, image, etc.) so
// estimatePostProcessingTokens() can use type-aware estimates.
// ---------------------------------------------------------------------------

/**
 * Extension → file type for budget estimation.
 *
 * Derived from the canonical registry rather than hand-listed: this was a
 * fourth copy of the same knowledge, and it disagreed with the detector it is
 * supposed to predict — it had no entry for .mpg/.mpeg/.3gp/.aiff and so on, so
 * estimatePostProcessingTokens() silently fell back to a generic estimate for
 * exactly the large media files whose estimate matters most.
 */
const EXTENSION_TYPE_MAP: Record<string, string> = Object.fromEntries(
  FILE_TYPE_REGISTRY.flatMap((entry) =>
    entry.extensions.map((ext) => [ext.slice(1), entry.fileType] as const),
  ),
);

/**
 * MIME type → routing type, derived from the same registry as
 * {@link EXTENSION_TYPE_MAP} so the two can never disagree about a format.
 */
const MIMETYPE_TYPE_MAP: Record<string, string> = Object.fromEntries(
  FILE_TYPE_REGISTRY.flatMap((entry) =>
    entry.mimeTypes.map(
      (mime) => [mime.toLowerCase(), entry.fileType] as const,
    ),
  ),
);

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

  // SVG is markup and has no magic number, so every signature check below
  // misses it and a raw SVG Buffer classified as `undefined` — which meant the
  // lazy path, which previews markup away. Checked first because the sniff is
  // a cheap look at the head and cannot collide with a binary signature.
  //
  // Deliberately a substring scan over the head rather than a prolog-stripping
  // regex: the obvious pattern for skipping comments and a DOCTYPE is two
  // nested quantifiers, which is a ReDoS waiting to happen inside what is
  // supposed to be a cheap type check. Over-matching is harmless here — the
  // only consequence of a false positive is that a file is processed eagerly.
  if (buf.subarray(0, 1024).toString("latin1").includes("<svg")) {
    return "svg";
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
  | { type: "image"; image: string; mediaType?: string }
  | { type: "file"; data: Buffer; mediaType: string } {
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
  | { type: "file"; data: Buffer; mediaType: string }
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
      ...(contentItem.mimeType && { mediaType: contentItem.mimeType }),
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
      mediaType: contentItem.mimeType,
    };
  }

  return null;
}

/**
 * Type-safe conversion from MultimodalChatMessage[] to ModelMessage[]
 * Filters out invalid content and ensures strict ModelMessage contract compliance
 */
export function convertToModelMessages(
  messages: MultimodalChatMessage[],
): ModelMessage[] {
  return messages
    .map((msg): ModelMessage | null => {
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
          } satisfies SystemModelMessage;
        } else if (msg.role === "user") {
          return {
            role: "user",
            content: msg.content,
          } satisfies UserModelMessage;
        } else if (msg.role === "assistant") {
          return {
            role: "assistant",
            content: msg.content,
          } satisfies AssistantModelMessage;
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
          } satisfies UserModelMessage;
        } else if (msg.role === "assistant") {
          // Assistant messages only support text content, filter out images
          const textOnlyContent = validContent.filter(
            (item) => item.type === "text",
          );
          if (textOnlyContent.length === 0) {
            // No text content (e.g., only images/files) — skip message
            // to avoid sending empty content to providers like Claude
            return null;
          } else if (textOnlyContent.length === 1) {
            // Single text item, use string content
            return {
              role: "assistant",
              content: textOnlyContent[0].text,
            } satisfies AssistantModelMessage;
          } else {
            // Multiple text items, concatenate them
            const combinedText = textOnlyContent
              .map((item) => item.text)
              .join(" ");
            return {
              role: "assistant",
              content: combinedText,
            } satisfies AssistantModelMessage;
          }
        } else {
          // System messages cannot have multimodal content, convert to text
          const textContent =
            validContent.find((item) => item.type === "text")?.text || "";
          return {
            role: "system",
            content: textContent,
          } satisfies SystemModelMessage;
        }
      }

      // Invalid content type
      logger.warn("Invalid message content type found, skipping", {
        contentType: typeof msg.content,
      });
      return null;
    })
    .filter((msg): msg is ModelMessage => msg !== null);
}

/**
 * Convert ChatMessage to ModelMessage for AI SDK compatibility
 */
function toModelMessage(message: ChatMessage): ModelMessage | null {
  // Only include messages with roles supported by AI SDK
  if (
    message.role === "user" ||
    message.role === "assistant" ||
    message.role === "system"
  ) {
    if (message.content.trim() === "") {
      return null;
    }
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
 * Log structural metadata about a composed message array without logging content.
 * Only logs a compact summary (role counts, total chars, estimated tokens).
 * Per-message breakdown is intentionally omitted to avoid log noise
 * (~600 lines per retry cascade with many messages).
 */
function logMessageComposition(
  messages: Array<{ role: string; content: unknown }>,
  requestId?: string,
): void {
  if (!logger.shouldLog("debug")) {
    return;
  }

  const roles: Record<string, number> = {};
  let totalChars = 0;

  for (const msg of messages) {
    const chars = typeof msg.content === "string" ? msg.content.length : 0;
    roles[msg.role] = (roles[msg.role] || 0) + 1;
    totalChars += chars;
  }

  logger.debug("[MessageBuilder] Composed", {
    requestId,
    totalMessages: messages.length,
    roles,
    totalChars,
    estimatedTokens: Math.ceil(totalChars / 4),
  });
}

/**
 * Build a properly formatted message array for AI providers
 * Combines system prompt, conversation history, and current user prompt
 * Supports both TextGenerationOptions and StreamOptions
 * Enhanced with CSV file processing support
 */
export async function buildMessagesArray(
  options: TextGenerationOptions | StreamOptions,
): Promise<ModelMessage[]> {
  const messages: ModelMessage[] = [];

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
      providerOptions: {
        anthropic: { cacheControl: { type: "ephemeral" } },
      },
    });
  }

  // Add conversation history if available
  // Convert ChatMessages to ModelMessages and filter out tool messages
  if (hasConversationHistory && options.conversationMessages) {
    for (const chatMessage of options.conversationMessages) {
      const coreMessage = toModelMessage(chatMessage);
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

  if (currentPrompt?.trim()) {
    messages.push({
      role: "user",
      content: currentPrompt.trim(),
    });
  }

  const reqId = (options.context as Record<string, unknown> | undefined)
    ?.requestId as string | undefined;
  logMessageComposition(messages, reqId);
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
  options.input ??= {};
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
    const includedIndices = new Set(
      budgetResult.included.map((f) => {
        return budgetFiles.findIndex((bf) => bf.name === f.name);
      }),
    );
    options.input.files = options.input.files.filter((_file, idx) => {
      return includedIndices.has(idx);
    });
    options.input.text =
      (options.input.text || "") + "\n\n" + budgetResult.notices.join("\n");
    logger.warn(
      `[FileDetector] Aggregate file budget enforcement: excluded ${budgetResult.excluded.length} file(s)`,
    );
  }
}

/**
 * Per input, the file entries already folded into text and media.
 *
 * A WeakMap so a long-lived process cannot accumulate references to request
 * payloads: the record vanishes with the input object it is keyed on.
 */
const PREPROCESSED_FILES = new WeakMap<object, Set<unknown>>();

/**
 * Ceiling on reading one already-detected local file back off disk.
 *
 * Sized for the 100 MB this path admits from cold storage, not for the warm
 * page cache the read usually hits — detection has just read the same bytes.
 */
const FILE_READ_TIMEOUT_MS = 30_000;

/**
 * Read a file input's bytes, or null when they cannot be had.
 *
 * Asynchronous because this path admits files up to 100 MB: a synchronous read
 * of one blocks the event loop for every other in-flight request on the
 * process, which for a server handling concurrent generations is not a
 * micro-optimisation to trade away.
 *
 * A URL or data URI yields null rather than a fetch: those arrive already
 * materialised by the time detection runs, and re-fetching a remote URL here
 * would issue a second network request behind the caller's back.
 */
async function readFileInputBytes(file: FileInput): Promise<Buffer | null> {
  try {
    if (isFileWithMetadata(file)) {
      return file.buffer;
    }
    if (Buffer.isBuffer(file)) {
      return file;
    }
    if (typeof file === "string") {
      const { readFile, stat } = await import("node:fs/promises");
      // Two different hangs live here, and they need different guards.
      //
      // A FIFO or device node blocks inside the read syscall, where neither a
      // timeout nor an abort can reach it — measured: with a signal attached,
      // a blocked FIFO read stays pending through both open and mid-read. The
      // timeout would return while that read sat there forever. So refuse
      // anything that is not a regular file up front; that is the only thing
      // that actually prevents this case.
      //
      // A regular file on a slow or hung mount does return control between
      // chunks, so there the signal works (measured: rejects with AbortError
      // in flight) — and it matters, because racing the promise alone leaves
      // the read filling a buffer nobody will collect. Aborting in `finally`
      // covers both exits; after a resolved read it is a no-op.
      //
      // stat-then-read is a TOCTOU window, but a narrow one, and it is strictly
      // better than the unbounded read it replaces.
      const stats = await withTimeout(stat(file), FILE_READ_TIMEOUT_MS);
      if (!stats.isFile()) {
        return null;
      }
      const controller = new AbortController();
      try {
        return await withTimeout(
          readFile(file, { signal: controller.signal }),
          FILE_READ_TIMEOUT_MS,
        );
      } finally {
        controller.abort();
      }
    }
  } catch {
    // An unreadable file is not an error here: the metadata summary was
    // already appended, so the caller degrades to previous behaviour. This
    // covers the missing-file case that an `existsSync` pre-check used to
    // (without the TOCTOU gap between check and read) and the timeout above.
  }
  return null;
}

/**
 * Append a detected file result to options.input based on its type.
 * Handles CSV, SVG, image, PDF, video, audio, archive, xlsx, docx, pptx, text, and unknown types.
 */
async function appendDetectedFileResult(
  result: {
    type: string;
    content: string | Buffer;
    mimeType: string;
    metadata?: Record<string, unknown>;
    images?: Array<Buffer | string | ImageWithAltText>;
  },
  file: FileInput,
  options: GenerateOptions,
): Promise<void> {
  options.input ??= {};
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
    // Put the actual CSV content BEFORE the tool instructions —
    // buildCSVToolInstructions references "the CSV data shown above" and
    // the trailing position keeps that reference accurate.
    csvSection += result.content;
    csvSection += buildCSVToolInstructions(filePath);
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
    // Carry the bytes forward as well as the summary. Whether they are used is
    // decided later, per provider: one that can listen receives the audio, one
    // that cannot still gets the summary above and is no worse off than before.
    const audioBytes = await readFileInputBytes(file);
    if (audioBytes) {
      options.input.nativeAudioFiles = [
        ...(options.input.nativeAudioFiles || []),
        { buffer: audioBytes, filename, mimeType: result.mimeType },
      ];
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
 * Fold the `audioFiles` / `videoFiles` aliases into the unified `files` array.
 *
 * #284 gave audio and video their own input fields, but neither has a
 * dedicated processor — both are meant to travel through the same
 * auto-detecting `files` pipeline that already understands "audio"/"video"
 * FileDetector results (see `appendDetectedFileResult`). The fold used to live
 * inline in `buildMultimodalMessagesArray`, which meant any path that bypassed
 * that builder never performed it and dropped the files silently: the model
 * received the prompt alone and answered as though nothing were attached
 * (#1259). GoogleVertex's native SDK path and `buildMultimodalOptions`
 * (Bedrock) are both such paths, so the fold has to be callable from them.
 *
 * The aliases are cleared once merged, which makes the call idempotent: a
 * provider override and the shared builder can both call this on the same
 * options object without attaching every file twice.
 *
 * Mutates in place, matching `processUnifiedFilesArray` below — downstream
 * stages all read `options.input.files`.
 */
export function mergeMediaFileAliases<TFile>(input: {
  // Generic in the `files` element type: callers' arrays also admit
  // FileWithMetadata, and narrowing to Buffer | string here would force an
  // assertion at every call site rather than fixing the type.
  files?: Array<TFile | Buffer | string>;
  audioFiles?: Array<Buffer | string>;
  videoFiles?: Array<Buffer | string>;
}): void {
  if (!input.audioFiles?.length && !input.videoFiles?.length) {
    return;
  }
  input.files = [
    ...(input.files ?? []),
    ...(input.audioFiles ?? []),
    ...(input.videoFiles ?? []),
  ];
  input.audioFiles = undefined;
  input.videoFiles = undefined;
}

/**
 * #478: `transcribeAudio` (CLI `--transcribe-audio`) is accepted by the options
 * surface but no video-audio transcription exists yet — VideoProcessor extracts
 * keyframes and embedded subtitle tracks only, and the transcription step is
 * still open as #433. Say so once per request rather than letting the caller
 * believe a transcript was produced and silently omitted.
 */
function warnIfVideoTranscriptionRequested(
  videoOptions: GenerateOptions["videoOptions"],
): void {
  if (videoOptions?.transcribeAudio) {
    logger.warn(
      "[NEUROLINK] Video audio transcription was requested but is not implemented yet " +
        "(tracked as #433). Keyframes and any embedded subtitle tracks are still extracted; " +
        "spoken audio will not be transcribed.",
    );
  }
}

/**
 * Process the unified files array with auto-detection.
 * Handles lazy file registration, full processing, and preview injection.
 *
 * Exported so providers that bypass BaseProvider.generate() (e.g.
 * GoogleVertex's native @google/genai path) can still preprocess
 * `input.files` — without this, mimetype-hint and text-file inputs
 * would silently never reach the model on those paths.
 */
/**
 * Record that one file entry has been folded into an input.
 *
 * Marked per entry as each completes, not per run: the loop throws on the
 * first file it cannot process (#273, fail loud), and the SDK's own retry path
 * re-invokes this function with the same input. Marking the whole run on entry
 * would make that retry a silent no-op — permanently skipping the failed file
 * and shipping a half-populated request with nothing surfaced. Marking the
 * whole run on exit would instead re-process the files that had already
 * succeeded, duplicating them. Per entry is the only version that is right in
 * both directions.
 */
function markFileProcessed(input: object, entry: unknown): void {
  const processed = PREPROCESSED_FILES.get(input) ?? new Set<unknown>();
  processed.add(entry);
  PREPROCESSED_FILES.set(input, processed);
}

export async function processUnifiedFilesArray(
  options: GenerateOptions,
  maxSize: number,
  provider: string,
): Promise<void> {
  options.input ??= {};
  if (!options.input.files || options.input.files.length === 0) {
    return;
  }

  // Every result this function produces is *appended* — the summary onto
  // `text`, the bytes onto `nativeAudioFiles`/`images`/`pdfFiles` — and
  // `files` is only ever read, never consumed. Running it twice over the same
  // entry therefore doubles the injected text and attaches the same recording
  // twice, which a provider sees as two distinct files.
  //
  // That is reachable: providers whose native paths preprocess in both
  // `generate()` and `executeStream()` share one `options.input` reference
  // with `BaseProvider`'s real-stream → fake-stream fallback, so a retried
  // stream runs this a second time over the same object.
  //
  // Tracked per *entry* rather than per input, because a caller that appends a
  // file to an input it has already used must still get the new one processed
  // — treating the whole input as done would silently drop it. Entries are
  // compared by identity (or by value for a path string), which is what a
  // repeat of the same attachment actually looks like.
  const alreadyProcessed =
    PREPROCESSED_FILES.get(options.input) ?? new Set<unknown>();
  const pending = options.input.files.filter(
    (entry) => !alreadyProcessed.has(entry),
  );
  if (pending.length === 0) {
    logger.debug(
      "[NEUROLINK] Every attached file has already been processed for this input — skipping to avoid duplicate attachments",
    );
    return;
  }

  const totalFiles = pending.length;
  const files = pending;

  warnIfVideoTranscriptionRequested(options.videoOptions);

  return withSpan(
    {
      name: "neurolink.file.process_all",
      tracer: tracers.file,
      attributes: {
        [ATTR.FILE_TOTAL_COUNT]: totalFiles,
        [ATTR.NL_PROVIDER]: provider,
      },
    },
    async (span) => {
      logger.info(
        `[NEUROLINK] Processing ${totalFiles} file(s) with auto-detection`,
      );

      // `options.input` was guaranteed non-null by the `??= {}` guard at the
      // top of processUnifiedFilesArray; re-assert here so TypeScript is happy
      // inside this withSpan closure (it doesn't track mutations across closures).
      options.input ??= {};
      const inp2 = options.input;
      inp2.text = inp2.text || "";
      let includedCount = 0;

      const fileRegistry = options.fileRegistry as
        | FileReferenceRegistry
        | undefined;

      for (let fileIdx = 0; fileIdx < files.length; fileIdx++) {
        const file = files[fileIdx];
        const filename = extractFilename(file, fileIdx);
        try {
          // ─── Lazy file registration path ──────────────────────────────
          const fileSize = fileRegistry ? getFileSize(file) : 0;
          if (
            fileRegistry &&
            fileSize > SIZE_TIER_THRESHOLDS.TINY_MAX &&
            !isEagerMultimodalFile(file)
          ) {
            const registered = await tryRegisterFileReference(
              file,
              fileSize,
              fileRegistry,
              fileIdx,
            );
            if (registered) {
              logger.info(
                `[NEUROLINK] File lazily registered: ${filename} (${fileSize} bytes) — deferred processing`,
              );
              includedCount++;
              markFileProcessed(inp2, file);
              continue;
            }
          }

          // ─── Full processing path (current behavior) ──────────────────
          const genericFileMaxSize = Math.max(maxSize, 100 * 1024 * 1024);
          const rawFileInput = isFileWithMetadata(file) ? file.buffer : file;
          // Forward the caller's mimetype hint (Slack/Curator-style
          // extension-less buffers) so the eager path classifies correctly
          // for tiny files — the lazy registry path has its own hint wiring.
          const fileMimetypeHint = isFileWithMetadata(file)
            ? file.mimetype
            : undefined;
          // The name has to travel the same way, and for the same reason: the
          // line above unwraps the object to its buffer, so by the time
          // detection resolves an extension there is no name left to read one
          // from. Without this a `.tar` supplied as bytes-plus-name is
          // unidentifiable — its "ustar" marker sits at byte 257, not at
          // offset 0 — and reports "Could not extract content" for an archive
          // that extracts perfectly when handed its filename.
          const fileFilenameHint = isFileWithMetadata(file)
            ? file.filename
            : undefined;
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
            // #478: videos arrive through this unified `files` path, so this is
            // where the CLI's frame/quality/format request has to be handed on.
            videoOptions: options.videoOptions
              ? {
                  frames: options.videoOptions.frames,
                  quality: options.videoOptions.quality,
                  format: options.videoOptions.format,
                }
              : undefined,
            provider: provider,
            mimetypeHint: fileMimetypeHint,
            filenameHint: fileFilenameHint,
          });

          await appendDetectedFileResult(result, file, options);
          includedCount++;

          // Log what content type was added to the message
          const contentType = result.type === "image" ? "image" : "text";
          logger.info(
            `[NEUROLINK] File added to message: ${filename} as ${contentType} (type: ${result.type})`,
          );
          markFileProcessed(inp2, file);
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          // #273: don't silently drop a failed file — log, then throw so the
          // caller learns the file couldn't be processed (matches the explicit
          // pdf/csv paths' fail-loud behavior).
          logger.error(
            `[NEUROLINK] File processing failed: ${filename} — reason: ${errMsg}`,
          );
          throw ErrorFactory.fileProcessingFailed(
            filename,
            error instanceof Error ? error : new Error(errMsg),
          );
        }
      }

      span.setAttribute(ATTR.FILE_INCLUDED_COUNT, includedCount);

      // After processing all files, inject previews for any lazily-registered files
      if (fileRegistry && fileRegistry.size > 0) {
        const previewText = await fileRegistry.generatePromptPreview();
        if (previewText) {
          inp2.text = (inp2.text || "") + previewText;
          logger.info(
            `[FileDetector] Injected previews for ${fileRegistry.size} lazily-registered file(s)`,
          );
        }
        const registeredFiles = fileRegistry.list();
        for (const ref of registeredFiles) {
          if (ref.extractedImages && ref.extractedImages.length > 0) {
            inp2.images = [...(inp2.images || []), ...ref.extractedImages];
            logger.info(
              `[FileDetector] Injected ${ref.extractedImages.length} extracted images from "${ref.filename}"`,
            );
          }
        }
      }

      logger.info(
        `[NEUROLINK] File processing complete: ${includedCount}/${totalFiles} files included in message`,
      );

      // Augment options.systemPrompt with file-handling guidance so providers
      // that bypass the message-builder's system message and read
      // `options.systemPrompt` directly (e.g. GoogleVertex's native @google/genai
      // path uses `config.systemInstruction = options.systemPrompt`) still see
      // the "treat inlined CSV/PDF as the actual file" guidance. Without this,
      // Vertex Gemini 2.5 reliably responds with "no files attached" even
      // though the CSV content is fully embedded in the user prompt.
      if (includedCount > 0) {
        const filePromptAugmentation = `\n\nIMPORTANT FILE HANDLING INSTRUCTIONS:
- The full content of the user's local file(s) is INLINED in this message under "## CSV Data from ..." / "## PDF Data from ..." / "## File: ..." headings — it is the actual file the user is asking about.
- TREAT THE INLINED CONTENT AS IF IT WERE AN ATTACHMENT. Do NOT respond with "no files attached" or ask the user to re-upload — the data is already here.
- DO NOT use GitHub tools (get_file_contents, search_code, etc.) for local files - they only work for remote repository files.
- Analyze the inlined file content directly without attempting to fetch or read files using tools.`;
        const existingSystem = (options.systemPrompt || "").trim();
        options.systemPrompt = existingSystem
          ? `${existingSystem}${filePromptAugmentation}`
          : filePromptAugmentation.trim();

        // Keep options.prompt in sync with the enriched input.text.
        // neurolink.ts snapshots `prompt: options.input?.text` at baseOptions
        // creation — BEFORE this function appends file content — and some
        // native paths (executeNativeAnthropicGenerate historically) read
        // `options.prompt` first. Leaving the stale snapshot in place means
        // every appended file is silently dropped on those paths and the model
        // answers "no file attached". Same dual-write processCSVFilesForNativeSDK
        // already documents for exactly this trap.
        const promptCarrier = options as { prompt?: string };
        if (typeof promptCarrier.prompt === "string") {
          promptCarrier.prompt = inp2.text;
        }
      }
    },
  );
}

/**
 * Process explicit CSV files array and append to options.input.text.
 */
async function processExplicitCsvFiles(
  options: GenerateOptions,
): Promise<void> {
  options.input ??= {};
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

      // Put the actual CSV content BEFORE the tool instructions —
      // buildCSVToolInstructions references "the CSV data shown above"
      // and the trailing position keeps that reference accurate.
      csvSection += result.content;
      csvSection += buildCSVToolInstructions(filePath);
      options.input.text += csvSection;
      logger.info(`[CSV] ✅ Processed: ${filename}`);
    } catch (error) {
      const filename = extractFilename(csvFile, i);
      const errMsg = error instanceof Error ? error.message : String(error);
      // #273: fail loud instead of embedding the error into the prompt text
      // (which the model would then "analyze"). Log, then throw.
      logger.error(`[CSV] ❌ Failed to process ${filename}: ${errMsg}`);
      throw ErrorFactory.csvProcessingFailed(
        filename,
        error instanceof Error ? error : new Error(errMsg),
      );
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
  options.input ??= {};
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
 * #309: enforce the provider's page/size ceilings across ALL PDFs in a request,
 * not just per-file. N files each just under the single-file limit can still
 * blow past it in aggregate (e.g. three 40-page PDFs → 120 pages for a
 * 100-page API).
 *
 * Shared by both PDF submission surfaces: `input.pdfFiles` (via
 * `processExplicitPdfFiles`) and `input.content` with `type: "pdf"` (via
 * `convertContentToProviderFormat`). The latter previously built its own
 * `pdfFiles` array and reached the provider without ever calling this guard,
 * so the limit was bypassable by moving the same payload to `input.content`.
 */
/**
 * Basename that strips BOTH separators regardless of host platform.
 *
 * `path.basename` only understands the host's separator, so on a POSIX server
 * a Windows-style filename (`C:\Users\alice\q3-merger.pdf`) comes back
 * completely unchanged — defeating the point of trimming it before it reaches
 * a log line, since caller-controlled paths can carry usernames and internal
 * directory structure.
 */
function safeBasename(filename: string): string {
  const lastSeparator = Math.max(
    filename.lastIndexOf("/"),
    filename.lastIndexOf("\\"),
  );
  const trimmed =
    lastSeparator === -1 ? filename : filename.slice(lastSeparator + 1);
  return trimmed || "<unnamed file>";
}

async function enforceAggregatePdfLimits(
  pdfFiles: MultimodalPdfEntry[],
  provider: string,
  { trustSuppliedPageCounts }: { trustSuppliedPageCounts: boolean },
): Promise<void> {
  const aggregateConfig = PDFProcessor.getProviderConfig(provider);
  // Only an empty set is exempt. A single PDF must still be checked: on the
  // `input.content` path nothing else validates it (that path never goes
  // through FileDetector.detectAndProcess / PDFProcessor.process), so bailing
  // at length <= 1 let one 200-page document through untouched.
  if (!aggregateConfig || pdfFiles.length === 0) {
    return;
  }

  // Byte total is free to compute — enforce it BEFORE parsing anything, so an
  // oversized request is rejected without first spending parser CPU/memory on
  // every document in it.
  const totalMB =
    pdfFiles.reduce((sum, f) => sum + f.buffer.length, 0) / (1024 * 1024);
  if (totalMB > aggregateConfig.maxSizeMB) {
    throw ErrorFactory.pdfAggregateSizeLimitExceeded(
      pdfFiles.length,
      totalMB,
      aggregateConfig.maxSizeMB,
      provider,
    );
  }

  // `trustSuppliedPageCounts` is the difference between the two surfaces.
  // On `input.pdfFiles` the count comes from FileDetector's own detection, so
  // it is authoritative. On `input.content` it is `metadata.pages` — plain
  // caller input — and trusting it lets a request declare `pages: 1` for each
  // of three 40-page PDFs and sail past the ceiling. There, the count is
  // always re-derived from the bytes and the supplied value is ignored.
  const pageCounts = await Promise.all(
    pdfFiles.map(async (f) =>
      trustSuppliedPageCounts && typeof f.pageCount === "number"
        ? f.pageCount
        : await PDFProcessor.resolvePageCount(f.buffer),
    ),
  );

  // Filenames are caller-controlled and may be full paths carrying
  // PII/internal directory segments — surface only the basename, stripping
  // both separators so a Windows path is trimmed on a POSIX host too.
  const unknownFileNames = pdfFiles
    .filter((_, i) => typeof pageCounts[i] !== "number")
    .map((f) => (f.filename ? safeBasename(f.filename) : "<unnamed file>"));
  const totalPages = pageCounts.reduce<number>(
    (sum, p) => sum + (typeof p === "number" ? p : 0),
    0,
  );

  if (unknownFileNames.length > 0) {
    if (!trustSuppliedPageCounts) {
      // Untrusted surface: an unreadable count is indistinguishable from an
      // evasion attempt, and counting it as zero is precisely the hole. Fail
      // closed rather than admit an unverifiable document.
      throw ErrorFactory.pdfPageCountUnverifiable(unknownFileNames, provider);
    }
    // Trusted surface: detection already vetted these, so one unreadable
    // count must not fail an otherwise valid request — but it must not be
    // silent either, since the known sum may undercount the true total.
    logger.warn(
      `[PDF] Aggregate page-limit check across ${pdfFiles.length} PDFs could only be ` +
        `partially verified: ${unknownFileNames.length} file(s) have an unknown ` +
        `page count (${unknownFileNames.join(", ")}), so the known total (${totalPages}) may ` +
        `undercount the true combined page count.`,
    );
  }

  if (totalPages > aggregateConfig.maxPages) {
    throw ErrorFactory.pdfAggregatePageLimitExceeded(
      pdfFiles.length,
      totalPages,
      aggregateConfig.maxPages,
      provider,
    );
  }
}

/**
 * Process explicit PDF files and return structured PDF entries for multimodal processing.
 */
async function processExplicitPdfFiles(
  options: GenerateOptions,
  maxSize: number,
  provider: string,
): Promise<MultimodalPdfEntry[]> {
  options.input ??= {};
  const pdfFiles: MultimodalPdfEntry[] = [];

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
          // #258: carry the password so the image-fallback conversion can
          // decrypt an encrypted PDF for providers without native PDF support.
          password: options.pdfOptions?.password,
          // #260: carry the per-page canvas-pixel ceiling so the caller can
          // raise (or lower) the memory guard for the image-fallback render.
          maxCanvasPixels: options.pdfOptions?.maxCanvasPixels,
          // #297: render scale / page ceiling, so the lowered default is
          // actually reachable and callers can trade sharpness for memory.
          scale: options.pdfOptions?.scale,
          maxPages: options.pdfOptions?.maxPages,
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

  // Counts here come from FileDetector's detection, so they are authoritative.
  await enforceAggregatePdfLimits(pdfFiles, provider, {
    trustSuppliedPageCounts: true,
  });

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
  options.input ??= {};
  let systemPrompt = options.systemPrompt?.trim() || "";

  const hasConversationHistory =
    options.conversationHistory && options.conversationHistory.length > 0;
  if (hasConversationHistory) {
    systemPrompt = `${systemPrompt.trim()}${CONVERSATION_INSTRUCTIONS}`;
  }

  if (shouldUseStructuredOutput(options)) {
    systemPrompt = `${systemPrompt.trim()}${STRUCTURED_OUTPUT_INSTRUCTIONS}`;
  }

  const inp = options.input;
  const hasCSVFiles =
    (inp.csvFiles && inp.csvFiles.length > 0) ||
    (inp.files &&
      inp.files.some((f) =>
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
- The full content of the user's local ${fileTypes.join(", ")} (and any images) is INLINED in this message under the "## CSV Data from ..." / "## PDF Data from ..." headings — it is the actual file the user is asking about.
- TREAT THE INLINED CONTENT AS IF IT WERE AN ATTACHMENT. Do NOT respond with "no files attached" or ask the user to re-upload — the data is already here.
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
  // Media-only callers (avatar / music / video) may omit `input` entirely.
  // Normalise to an empty object so all sub-functions can access input.*
  // without defensive null checks on every field access.
  if (!options.input) {
    options.input = {};
  }
  // After normalisation `input` is guaranteed non-undefined. Capture it in a
  // local const so TypeScript sees the definite (non-optional) type in the
  // rest of this function, avoiding 60+ "possibly undefined" errors.
  const inp = options.input;

  mergeMediaFileAliases(inp);

  // Compute provider-specific max PDF size once for consistent validation
  const pdfConfig = PDFProcessor.getProviderConfig(provider);
  const maxSize = pdfConfig
    ? pdfConfig.maxSizeMB * 1024 * 1024
    : 10 * 1024 * 1024;

  // Aggregate file budget enforcement
  enforceFileBudget(options, provider, model);

  // Process unified files array (auto-detect)
  await processUnifiedFilesArray(options, maxSize, provider);

  // Detection can append images (PDF page renders, video keyframes, a HEIC
  // photo), so compatibility conversion has to run after it, not before.
  await normalizeVisionImageFormats(inp);

  // Process explicit CSV files array
  await processExplicitCsvFiles(options);

  // Post-processing budget enforcement and token usage logging
  enforcePostProcessingBudget(options, provider, model);

  // Process explicit PDF files
  const pdfFiles = await processExplicitPdfFiles(options, maxSize, provider);

  // Check if this is a multimodal request
  const hasImages =
    (inp.images && inp.images.length > 0) ||
    (inp.content && inp.content.some((c) => c.type === "image"));

  // A PDF supplied only via input.content (type: "pdf", no explicit
  // input.pdfFiles and no image alongside it) must still route through the
  // multimodal path below — otherwise it silently falls through to the
  // text-only branch and the PDF (and any pdfOptions) never reaches
  // convertContentToProviderFormat at all.
  const hasPDFs =
    pdfFiles.length > 0 ||
    !!(inp.content && inp.content.some((c) => c.type === "pdf"));

  // Audio that is to be delivered natively is multimodal for the same reason a
  // PDF is: it becomes a non-text part. Without this an audio-only turn — the
  // ordinary "transcribe this recording" request — took the text-only branch
  // below, where the collected bytes have nowhere to go and only the metadata
  // summary survives.
  const hasNativeAudio =
    (inp.nativeAudioFiles?.length ?? 0) > 0 && supportsNativeAudio(provider);

  // If no images, PDFs or audio, use standard message building and convert to MultimodalChatMessage[]
  if (!hasImages && !hasPDFs && !hasNativeAudio) {
    // #289: CSV content[] items don't need vision, so they never reach the
    // multimodal converter below — process them into the prompt text here
    // (otherwise a `content: [{type:"csv"}]`-only request silently drops it).
    const csvContentItems = inp.content?.filter(isCSVContent) ?? [];
    if (csvContentItems.length > 0) {
      inp.text = await appendCsvContentToText(csvContentItems, inp.text ?? "");
    }
    if (inp.csvFiles) {
      inp.csvFiles = [];
    }
    if (inp.pdfFiles) {
      inp.pdfFiles = [];
    }
    if (inp.files) {
      inp.files = [];
    }

    const standardMessages = await buildMessagesArray(
      options as TextGenerationOptions,
    );
    return standardMessages.map((msg) => {
      const msgProviderOptions = (msg as Record<string, unknown>)
        .providerOptions as Record<string, unknown> | undefined;
      return {
        role: msg.role,
        content: msg.content,
        ...(msgProviderOptions && { providerOptions: msgProviderOptions }),
      } as MultimodalChatMessage;
    });
  }

  // Validate provider supports vision
  if (!ProviderImageAdapter.supportsVision(provider, model)) {
    throw new Error(
      `Provider ${provider} with model ${model} does not support vision processing. ` +
        `Supported providers: ${ProviderImageAdapter.getVisionProviders().join(", ")}`,
    );
  }

  const messages: MultimodalChatMessage[] = [];

  // Build enhanced system prompt. Gate on the same `hasPDFs` predicate used
  // for routing above — a PDF supplied only via input.content (no explicit
  // input.pdfFiles) must still get the "treat inlined content as an
  // attachment" instruction, or the model can claim no files were attached.
  const systemPrompt = buildMultimodalSystemPrompt(options, hasPDFs);

  if (systemPrompt.trim()) {
    messages.push({
      role: "system",
      content: systemPrompt.trim(),
      providerOptions: {
        anthropic: { cacheControl: { type: "ephemeral" } },
      },
    } as MultimodalChatMessage);
  }

  // Add conversation history if available
  const hasConversationHistory =
    options.conversationHistory && options.conversationHistory.length > 0;
  if (hasConversationHistory && options.conversationHistory) {
    for (const msg of options.conversationHistory) {
      // Filter out tool_call and tool_result roles — only user/assistant/system are valid for AI providers
      if (
        msg.role === "user" ||
        msg.role === "assistant" ||
        msg.role === "system"
      ) {
        const providerOptions = (
          msg as { providerOptions?: Record<string, unknown> }
        ).providerOptions;

        // Sanitize assistant array content: strip tool_use/tool_result blocks
        // that providers cannot handle. If an assistant message ends up empty
        // after stripping, skip it to avoid sending content: "" to Claude.
        // Only assistant messages need this — user messages may contain valid
        // image/file blocks that must pass through unchanged.
        let sanitizedContent: unknown = msg.content;
        if (msg.role === "assistant" && Array.isArray(msg.content)) {
          const textParts = (msg.content as unknown[]).filter(
            (item: unknown) =>
              !!item &&
              typeof item === "object" &&
              (item as Record<string, unknown>).type === "text" &&
              typeof (item as Record<string, unknown>).text === "string",
          );
          if (textParts.length === 0) {
            // All content was tool_use/tool_result/non-text — skip message
            continue;
          }
          // Check if any retained text part carries providerOptions
          // (e.g. Anthropic cache_control). If so, preserve them as
          // array content to avoid losing per-block metadata.
          const hasItemProviderOptions = textParts.some(
            (item: unknown) =>
              !!(item as Record<string, unknown>).providerOptions,
          );
          if (hasItemProviderOptions) {
            sanitizedContent = textParts;
          } else {
            sanitizedContent =
              textParts.length === 1
                ? (textParts[0] as { text: string }).text
                : textParts
                    .map((p: unknown) => (p as { text: string }).text)
                    .join(" ");
          }
        }

        // Skip empty string content to avoid Claude API rejection
        if (sanitizedContent === "") {
          continue;
        }

        messages.push({
          role: msg.role,
          content: sanitizedContent as typeof msg.content,
          ...(providerOptions && { providerOptions }),
        });
      }
    }
  }

  // Handle multimodal content
  try {
    let userContent: string | unknown;

    if (inp.content && inp.content.length > 0) {
      // Audio detected from `input.files` has to reach this branch too. A
      // caller that supplies structured `content` AND attaches an audio file
      // is not asking for the audio to be discarded — but this branch bypasses
      // the multimodal converter below, so the bytes were dropped and only the
      // metadata summary folded into `text` survived. Exactly the failure this
      // change exists to remove, reintroduced through the other door.
      userContent = await convertContentToProviderFormat(
        inp.content,
        provider,
        model,
        options.pdfOptions,
        inp.nativeAudioFiles ?? [],
      );
    } else if (
      (inp.images && inp.images.length > 0) ||
      pdfFiles.length > 0 ||
      // Audio alone must still take the multimodal path. Without this clause an
      // audio-only turn fell through to the plain-text branch below, so the
      // recording was dropped and only its metadata summary — already folded
      // into `text` — ever reached the model.
      (inp.nativeAudioFiles?.length ?? 0) > 0
    ) {
      userContent = await convertMultimodalToProviderFormat(
        inp.text ?? "",
        inp.images || [],
        pdfFiles,
        provider,
        model,
        inp.nativeAudioFiles ?? [],
      );
    } else {
      userContent = inp.text;
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

    const reqId = (options.context as Record<string, unknown> | undefined)
      ?.requestId as string | undefined;
    logMessageComposition(messages, reqId);
    return messages;
  } catch (error) {
    MultimodalLogger.logError("MULTIMODAL_BUILD", error as Error, {
      provider,
      model,
      hasImages,
      imageCount: inp.images?.length || 0,
    });
    throw error;
  }
}

/**
 * Timeout for detecting/parsing an in-memory CSV `content[]` buffer (#325
 * review, round 2). Bounds a stalled detector rather than blocking the
 * request indefinitely.
 */
const CSV_CONTENT_DETECTION_TIMEOUT_MS = 30_000;

/**
 * #289: process CSV `content[]` items into appended prompt text. CSV is
 * delivered to the model as text (like the explicit `csvFiles` path), so this
 * is shared by both the no-vision gate and the multimodal converter.
 */
async function appendCsvContentToText(
  csvItems: CSVContent[],
  baseText: string,
): Promise<string> {
  let text = baseText;
  for (const csv of csvItems) {
    const raw = csv.data;
    if (raw === undefined) {
      continue;
    }
    // #325: raw CSV text (e.g. "a,b\n1,2") is not base64 — decoding it as
    // base64 silently corrupts the content. Only treat the string as base64
    // when it actually validates as such; otherwise treat it as literal
    // UTF-8 CSV text, matching how Buffer inputs are already handled as-is.
    const buffer =
      typeof raw === "string"
        ? imageUtils.isValidBase64(raw)
          ? Buffer.from(raw, "base64")
          : Buffer.from(raw, "utf-8")
        : raw;
    const name = csv.metadata?.filename || "data.csv";
    // #325 review (round 2): a stalled/hung detector must not block the
    // request indefinitely — wrap with the project's standard withTimeout.
    const result = await withTimeout(
      FileDetector.detectAndProcess(buffer, {
        allowedTypes: ["csv"],
        csvOptions: {
          maxRows: csv.metadata?.maxRows,
          formatStyle: csv.metadata?.formatStyle,
        },
      }),
      CSV_CONTENT_DETECTION_TIMEOUT_MS,
      new Error(
        `Timed out processing CSV content "${name}" after ${CSV_CONTENT_DETECTION_TIMEOUT_MS}ms`,
      ),
    );
    text += `${text ? "\n\n" : ""}## CSV Data from ${name}\n${result.content}`;
  }
  return text;
}

/**
 * Convert advanced content format to provider-specific format
 */
async function convertContentToProviderFormat(
  content: Content[],
  provider: string,
  _model: string,
  pdfOptions?: GenerateOptions["pdfOptions"],
  audioFiles: MultimodalAudioEntry[] = [],
): Promise<unknown> {
  const textContent = content.find((c) => c.type === "text");
  const imageContent = content.filter((c) => c.type === "image");
  const pdfContent = content.filter((c) => c.type === "pdf");
  const csvContent = content.filter(isCSVContent);

  // Allow empty text when multimodal content is present (enables image-only or PDF-only queries)
  let text = textContent?.text || "";

  // #289: CSV content[] items were silently dropped — fold each into the text.
  if (csvContent.length > 0) {
    text = await appendCsvContentToText(csvContent, text);
  }

  // Audio the provider can actually read counts as multimodal content, on both
  // of the checks below. Computed before the validation rather than after it:
  // a request whose structured `content` carries no text but does carry an
  // attached recording is a complete request, and leaving audio out of
  // `hasMultimodal` rejected it as empty before delivery could be considered.
  //
  // The same flag then keeps it off the text-only early return, which would
  // otherwise hand back a plain string and lose the bytes — the exact drop this
  // change exists to stop, reached through a different branch. Gated on the
  // provider accepting audio so one that cannot keeps the cheaper plain-text
  // shape rather than an array carrying a part it will ignore.
  const deliversAudio = audioFiles.length > 0 && supportsNativeAudio(provider);
  const hasMultimodal =
    imageContent.length > 0 || pdfContent.length > 0 || deliversAudio;

  // Validate that we have at least some content
  if (!hasMultimodal && !text) {
    throw new Error("Content must include either text or multimodal content");
  }

  // Text-only case (CSV has already been folded into `text`).
  if (!hasMultimodal) {
    return text;
  }

  // Extract images as Buffer | string array
  const images = imageContent.map((img) => img.data);

  // Extract PDFs in the expected format
  const pdfFiles: MultimodalPdfEntry[] = pdfContent.map((pdf) => ({
    buffer:
      typeof pdf.data === "string" ? Buffer.from(pdf.data, "base64") : pdf.data,
    filename: pdf.metadata?.filename || "document.pdf",
    pageCount: pdf.metadata?.pages ?? null,
    // #258/#260: carry password + canvas-pixel ceiling so a PDF supplied via
    // the advanced `input.content` array gets the same decryption/memory
    // guard as the `input.pdfFiles` path (see `processExplicitPdfFiles`).
    password: pdfOptions?.password,
    maxCanvasPixels: pdfOptions?.maxCanvasPixels,
    scale: pdfOptions?.scale,
    maxPages: pdfOptions?.maxPages,
  }));

  // #309: same aggregate ceiling as `input.pdfFiles`. Without this, moving an
  // over-limit payload from `input.pdfFiles` to `input.content` skipped the
  // check entirely and the request went straight to the provider.
  await enforceAggregatePdfLimits(pdfFiles, provider, {
    trustSuppliedPageCounts: false,
  });

  return await convertMultimodalToProviderFormat(
    text,
    images,
    pdfFiles,
    provider,
    _model,
    audioFiles,
  );
}

/**
 * Check if a string is an internet URL
 */
function isInternetUrl(input: string): boolean {
  // Scheme is case-insensitive (RFC 3986) — "HTTPS://..." must still be a URL,
  // not fall through to the file-path branch and produce a confusing error.
  const lower = input.toLowerCase();
  return lower.startsWith("http://") || lower.startsWith("https://");
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
      dispatcher: redirectFollowingDispatcher(5),
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

    // Read the response body, enforcing the size cap INCREMENTALLY: a
    // misbehaving/malicious server on a user-supplied URL must not be able to
    // force unbounded memory growth by streaming gigabytes before we ever
    // check the total (the previous code concat'd everything first).
    const maxSize = 10 * 1024 * 1024; // 10MB
    const chunks: Buffer[] = [];
    let totalSize = 0;
    for await (const chunk of response.body) {
      totalSize += chunk.length;
      if (totalSize > maxSize) {
        throw new Error(
          `Image too large: exceeds ${maxSize} bytes while downloading from ${url}`,
        );
      }
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

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
      { cause: error },
    );
  }
}

/**
 * Get MIME type from an image file extension.
 *
 * Delegates to the canonical registry instead of the six-case switch this used
 * to be. That switch covered png/gif/webp/bmp/tiff and defaulted *everything
 * else* to image/jpeg, so a .heic, .avif, .ico or .jp2 path was labelled JPEG
 * — which meant `needsVisionTranscode()` never fired for it and the raw bytes
 * went to the provider under a MIME type that was simply untrue. Exactly the
 * kind of hand-maintained table this registry exists to delete.
 *
 * The image/jpeg fallback is kept only for genuinely unknown extensions, since
 * callers here have already established they are handling an image.
 */
function getMimeTypeFromExtension(filePath: string): string {
  const entry = lookupByExtension(filePath);
  if (entry?.modality === "image") {
    return entry.mimeTypes[0];
  }
  return "image/jpeg";
}

/**
 * Detect MIME type from buffer magic bytes
 * Returns undefined if format cannot be detected
 */
function detectMimeTypeFromBuffer(buffer: Buffer): string | undefined {
  // JPEG: FF D8 FF
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image/jpeg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  // GIF: 47 49 46 38 (37|39) 61
  if (
    buffer.length >= 6 &&
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    return "image/gif";
  }

  // WebP: 52 49 46 46 ?? ?? ?? ?? 57 45 42 50
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "image/webp";
  }

  // BMP: 42 4D
  if (buffer.length >= 2 && buffer[0] === 0x42 && buffer[1] === 0x4d) {
    return "image/bmp";
  }

  // TIFF: (49 49 2A 00) or (4D 4D 00 2A)
  if (
    buffer.length >= 4 &&
    ((buffer[0] === 0x49 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x2a &&
      buffer[3] === 0x00) ||
      (buffer[0] === 0x4d &&
        buffer[1] === 0x4d &&
        buffer[2] === 0x00 &&
        buffer[3] === 0x2a))
  ) {
    return "image/tiff";
  }

  // The formats above are the ones a provider accepts (or that sharp handles
  // trivially). Everything below is a format NO vision provider accepts, and
  // recognising it here is what lets `needsVisionTranscode()` fire — a Buffer
  // whose format was unrecognised fell through to the image/jpeg default and
  // was shipped to the provider unconverted under a MIME type that was false.
  // Raw Buffers are the most direct way a backend attaches an image, so this
  // was the single biggest hole in the vision-compatibility path.

  // HEIC / HEIF / AVIF: ISO-BMFF `ftyp` box, distinguished by major brand.
  // Shared with the FileDetector so the two cannot drift on brand tables.
  const isoBmffImage = detectIsoBmffImageMimeType(buffer);
  if (isoBmffImage) {
    return isoBmffImage;
  }

  // ICO: 00 00 01 00. Checked after the ftyp probe because an ISO-BMFF file
  // also starts with a zero byte.
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x00 &&
    buffer[1] === 0x00 &&
    buffer[2] === 0x01 &&
    buffer[3] === 0x00
  ) {
    return "image/x-icon";
  }

  // SVG is markup, so it has no byte signature — and without this probe a raw
  // SVG buffer matched nothing, kept processImageToBase64's "image/jpeg"
  // default, and was shipped to the provider as XML labelled as a JPEG.
  // Shared forward scan rather than a local regex: the regex form of this
  // check is a CodeQL js/redos finding (see markupSniff).
  if (looksLikeSvgMarkup(buffer)) {
    return "image/svg+xml";
  }

  // JPEG 2000: the full 12-byte signature box, trailing 0D 0A 87 0A included.
  // Those four bytes are a line-ending probe that a transfer mangling newlines
  // or stripping the eighth bit corrupts, so checking only length and brand
  // accepts exactly the damaged files the signature exists to reject.
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x00 &&
    buffer[1] === 0x00 &&
    buffer[2] === 0x00 &&
    buffer[3] === 0x0c &&
    buffer.toString("latin1", 4, 8) === "jP  " &&
    buffer[8] === 0x0d &&
    buffer[9] === 0x0a &&
    buffer[10] === 0x87 &&
    buffer[11] === 0x0a
  ) {
    return "image/jp2";
  }

  return undefined;
}

/**
 * Convert file path to raw base64 string.
 * Returns raw base64 (not a data: URI) to avoid SSRF validation in AI SDK v6.
 * Uses async fs so a large/slow-filesystem image never blocks the event loop
 * while the size guard (below) or the read itself is in flight.
 */
async function convertFilePathToBase64(filePath: string): Promise<string> {
  let stats;
  try {
    stats = await statAsync(filePath);
  } catch (error) {
    // Only ENOENT means "not found" — EACCES/ELOOP/etc. are real access or
    // filesystem problems that must not be misreported as a missing file.
    const code =
      error instanceof Error
        ? (error as NodeJS.ErrnoException).code
        : undefined;
    if (code === "ENOENT") {
      throw new Error(`Image file not found: ${filePath}`, { cause: error });
    }
    throw new Error(
      `Cannot access image file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
  if (!stats.isFile()) {
    throw new Error(`Image path is not a file: ${filePath}`);
  }

  // #257: check the file size via stat BEFORE reading it into memory, so a
  // huge image path never triggers an unbounded read + base64 allocation.
  // Delegates to ImageProcessor's shared guard (no local reimplementation).
  const context = `image file "${filePath}"`;
  ImageProcessor.validateSize(stats.size, context);
  const buffer = await readFileAsync(filePath);
  // TOCTOU: the file can grow, or a symlink can be swapped, between the stat
  // above and this read completing. Re-validate the bytes actually read
  // (not just the pre-read stat) before the base64 allocation.
  return ImageProcessor.safeBase64Convert(buffer, context);
}

/**
 * Process a single image input and convert to raw base64 format.
 * IMPORTANT: Returns raw base64 (not a data: URI) to avoid SSRF validation
 * in Vercel AI SDK v6. The SDK calls `new URL(image)` on string values;
 * a data: URI is a valid URL, causing the SDK to "download" it and hit
 * validateDownloadUrl which throws "URL scheme must be http or https, got data:".
 * Passing raw base64 avoids this because `new URL(base64string)` throws and
 * the SDK treats the string as inline base64 data instead.
 */
async function processImageToBase64(
  image: Buffer | string,
  index: number,
): Promise<{ imageData: string; mimeType: string }> {
  let imageData: string;
  let mimeType = "image/jpeg"; // Default mime type

  if (typeof image === "string") {
    if (image.startsWith("data:")) {
      // Data URI (including downloaded URLs) - extract mime type and raw base64
      const match = image.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        const declaredMime = match[1];
        // #348: only accept image/* data URIs; reject a non-image MIME before
        // it reaches a provider API rather than passing it through unchecked.
        if (!declaredMime.startsWith("image/")) {
          throw new Error(
            `Unsupported data URI MIME type for image input at index ${index}: "${declaredMime}" (expected image/*)`,
          );
        }
        mimeType = declaredMime;
        imageData = match[2]; // Raw base64 only — NOT the full data: URI
      } else {
        // #270: a malformed data: URI must fail loudly, not silently pass the
        // raw string through as if it were valid base64 (which corrupts the
        // request and surfaces as an opaque provider error later).
        throw new Error(
          `Malformed image data URI at index ${index} (expected "data:<image/...>;base64,<data>")`,
        );
      }
    } else if (isInternetUrl(image)) {
      // This should not happen as URLs are processed separately
      throw new Error(`Unprocessed URL found in actualImages: ${image}`);
    } else {
      // File path string - convert to raw base64
      try {
        imageData = await convertFilePathToBase64(image);
        mimeType = getMimeTypeFromExtension(image);
      } catch (error) {
        MultimodalLogger.logError("FILE_PATH_CONVERSION", error as Error, {
          index,
          filePath: image,
        });
        // Preserve typed errors (e.g. IMAGE_TOO_LARGE) as-is — don't flatten
        // them into a generic Error and lose the error `code` for callers.
        if (error instanceof NeuroLinkError) {
          throw error;
        }
        throw new Error(
          `Failed to convert file path to base64: ${image}. ${error}`,
          { cause: error },
        );
      }
    }
  } else {
    // Buffer - convert to raw base64 with proper MIME type detection
    const detectedMimeType = detectMimeTypeFromBuffer(image);
    if (detectedMimeType) {
      mimeType = detectedMimeType;
    }
    // #257: guard the buffer size before the unbounded base64 conversion.
    // Delegates to ImageProcessor's shared guard (no local reimplementation).
    ImageProcessor.validateBufferSize(image, `image input at index ${index}`);
    imageData = image.toString("base64");
  }

  // Last line of defence for vision-format compatibility. `normalizeVisionImageFormats`
  // handles `input.images` eagerly so the providers that read that array
  // directly (Google AI Studio, Bedrock) see converted bytes, but images that
  // arrive as URLs are downloaded further downstream and only become bytes
  // here. A no-op for the universal formats, so the common path is unaffected.
  if (needsVisionTranscode(mimeType)) {
    // Guard the decoded bytes, not just the Buffer input. The buffer branch
    // above is already checked, but a data: URI reaches here having only been
    // regex-matched — so an oversized one was handed straight to sharp/ffmpeg,
    // which decode it in full.
    //
    // Sized before the decode rather than after: checking the Buffer would mean
    // allocating the very thing the limit exists to refuse.
    const context = `image input at index ${index}`;
    ImageProcessor.validateSize(base64DecodedByteLength(imageData), context);
    const rawImage = Buffer.from(imageData, "base64");
    const compatible = await toVisionCompatibleImage(rawImage, mimeType);
    if (compatible.converted) {
      imageData = compatible.buffer.toString("base64");
      mimeType = compatible.mimeType;
    }
  }

  return { imageData, mimeType };
}

/**
 * Transcode any image in `input.images` that no vision provider accepts,
 * rewriting the entry in place as a PNG data URI.
 *
 * Mutates in place and is idempotent, matching `processUnifiedFilesArray` and
 * `foldMediaAliasesIntoFiles`: the shared multimodal builder and the providers
 * that bypass it (Google AI Studio's and Vertex's native SDK paths, Bedrock's
 * Converse path) can all call it on the same options object without converting
 * anything twice.
 *
 * Entries that are `http(s)` URLs are left alone — they have no bytes yet, and
 * `processImageToBase64` converts them once they are downloaded.
 */
export async function normalizeVisionImageFormats(
  input: GenerateOptions["input"],
): Promise<void> {
  const images = input?.images;
  if (!images || images.length === 0) {
    return;
  }

  for (let index = 0; index < images.length; index++) {
    const entry = images[index];
    // ImageWithAltText wraps the payload in `.data`; convert that and keep the
    // alt text attached rather than dropping the wrapper.
    const isWrapped =
      typeof entry === "object" && entry !== null && !Buffer.isBuffer(entry);
    const payload = isWrapped
      ? (entry as ImageWithAltText).data
      : (entry as Buffer | string);

    const source = await readImageSourceForConversion(payload);
    if (!source || !needsVisionTranscode(source.mimeType)) {
      continue;
    }

    const compatible = await toVisionCompatibleImage(
      source.buffer,
      source.mimeType,
    );
    if (!compatible.converted) {
      continue;
    }

    const dataUri = `data:${compatible.mimeType};base64,${compatible.buffer.toString("base64")}`;
    images[index] = isWrapped
      ? { ...(entry as ImageWithAltText), data: dataUri }
      : dataUri;
  }
}

/**
 * Resolve one `input.images` entry to bytes plus a MIME type, or undefined when
 * it cannot be resolved without a network call.
 *
 * File paths are only read when their extension says the format would need
 * conversion. Reading every attached .png off disk just to confirm it is
 * already compatible would double the I/O of the common case for no benefit.
 */
/**
 * Byte length `Buffer.from(b64, "base64")` will allocate, computed without
 * allocating it.
 *
 * Base64 encodes 3 bytes per 4 characters, so the encoded length settles the
 * decoded length up front. The point is ordering: a size guard applied to the
 * decoded Buffer has already paid for the allocation it exists to prevent, so
 * every base64 site here checks this first and decodes second — the same shape
 * as the file-path branch, which stats before it reads.
 *
 * This bounds the decode, not the whole request: the encoded string is already
 * resident by the time we see it, so an oversized payload still costs its own
 * length in memory. What it removes is the second, larger allocation on top.
 *
 * Whitespace is skipped because the decoder ignores it, which keeps the count
 * exact rather than a conservative over-estimate that would reject legitimate
 * payloads sitting just under the limit.
 */
function base64DecodedByteLength(base64: string): number {
  let significant = 0;
  let padding = 0;
  for (let i = 0; i < base64.length; i++) {
    const code = base64.charCodeAt(i);
    if (code === 32 || code === 9 || code === 10 || code === 13) {
      continue;
    }
    significant++;
    if (code === 61) {
      padding++;
    }
  }
  return Math.max(0, Math.floor(significant / 4) * 3 - padding);
}

/**
 * Whether a payload is small enough to hand to an image decoder, reported
 * rather than thrown. See {@link readImageSourceForConversion} for why this
 * pass degrades instead of failing.
 */
function withinConversionByteLimit(bytes: number, context: string): boolean {
  try {
    ImageProcessor.validateSize(bytes, context);
    return true;
  } catch (error) {
    logger.warn(
      `[messageBuilder] Skipping vision-format conversion for ${context}: ` +
        `${error instanceof Error ? error.message : String(error)}`,
    );
    return false;
  }
}

function withinConversionLimit(buffer: Buffer, context: string): boolean {
  return withinConversionByteLimit(buffer.length, context);
}

async function readImageSourceForConversion(
  payload: Buffer | string,
): Promise<{ buffer: Buffer; mimeType: string } | undefined> {
  // Both in-memory shapes are size-checked before they can reach a decoder,
  // the same way the file-path branch below is. `withinConversionLimit`
  // reports rather than throws, because this whole pass is best-effort: an
  // image too large to convert is left in its original format for the
  // downstream guard to reject, which is what an unconvertible image already
  // does. Throwing here would turn a normalisation step into a hard failure.
  if (Buffer.isBuffer(payload)) {
    const mimeType = detectMimeTypeFromBuffer(payload);
    if (!mimeType || !withinConversionLimit(payload, "image buffer")) {
      return undefined;
    }
    return { buffer: payload, mimeType };
  }
  if (typeof payload !== "string") {
    return undefined;
  }
  if (payload.startsWith("data:")) {
    const match = payload.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      return undefined;
    }
    if (
      !withinConversionByteLimit(
        base64DecodedByteLength(match[2]),
        "image data URI",
      )
    ) {
      return undefined;
    }
    return { buffer: Buffer.from(match[2], "base64"), mimeType: match[1] };
  }
  if (isInternetUrl(payload)) {
    return undefined;
  }
  const mimeType = getMimeTypeFromExtension(payload);
  if (!needsVisionTranscode(mimeType)) {
    return undefined;
  }
  try {
    // Preflight the size before reading. Conversion replaces the entry with a
    // data URI, which bypasses processImageToBase64's buffer-size guard — so
    // without this a large local HEIC/TIFF/BMP was read fully into memory and
    // then re-encoded, with no limit applied at either step.
    const { size } = await statAsync(payload);
    ImageProcessor.validateSize(size, `image at ${safeBasename(payload)}`);
    const buffer = await readFileAsync(payload);
    ImageProcessor.validateBufferSize(
      buffer,
      `image at ${safeBasename(payload)}`,
    );
    return { buffer, mimeType };
  } catch (error) {
    // The path may be a signed URL or carry credentials in query params, so it
    // is redacted rather than interpolated verbatim (see logSanitize).
    logger.warn(
      `[messageBuilder] Could not read ${redactUrlForError(payload)} for image ` +
        `format conversion: ${error instanceof Error ? error.message : String(error)}`,
    );
    return undefined;
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
  // Validate image count against provider-specific limits before processing
  ProviderImageAdapter.validateImageCount(images.length, provider, _model);

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

  // Process all images (including downloaded URLs) for Vercel AI SDK.
  // Sequential for...of (not Promise.all) to preserve image ordering and
  // keep the original forEach's one-at-a-time error semantics.
  for (const [index, { data: image }] of actualImages.entries()) {
    try {
      // Use helper function to process image and reduce nesting depth
      const { imageData, mimeType } = await processImageToBase64(image, index);

      content.push({
        type: "image" as const,
        image: imageData,
        mimeType: mimeType,
      } as ImagePart);
    } catch (error) {
      MultimodalLogger.logError("ADD_IMAGE_TO_CONTENT", error as Error, {
        index,
        provider,
      });
      throw error;
    }
  }

  return content;
}

/**
 * Convert multimodal content (images + PDFs) to provider format
 */
async function convertMultimodalToProviderFormat(
  text: string,
  images: Array<Buffer | string | ImageWithAltText>,
  // The canonical entry shape (#309) rather than a fourth copy of it inline —
  // which is what let the render knobs stop short of this function.
  pdfFiles: MultimodalPdfEntry[],
  provider: string,
  model: string,
  audioFiles: MultimodalAudioEntry[] = [],
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

  // Attach audio to providers that can listen. The metadata summary was
  // already appended to `text` during detection, so this adds the recording
  // itself rather than replacing the description — a model asked "how long is
  // this?" keeps the exact answer, and one asked "what is said?" can now
  // answer at all.
  if (audioFiles.length > 0 && supportsNativeAudio(provider)) {
    for (const audio of audioFiles) {
      // Derived from the trimmed basename so a directory containing a dot
      // (`/srv/v1.2/recording`) cannot be mistaken for the file's extension.
      const base = safeBasename(audio.filename);
      const dot = base.lastIndexOf(".");
      const extension = dot > 0 ? base.slice(dot) : ".bin";
      const compatible = await toProviderCompatibleAudio(
        audio.buffer,
        audio.mimeType,
        extension,
      );
      // A conversion that could not run leaves a container the provider does
      // not accept. Sending it anyway turns a metadata answer into an opaque
      // HTTP 400, so it is skipped and the summary stands.
      if (needsAudioTranscode(compatible.mimeType)) {
        logger.warn(
          `[Audio] Skipping native delivery of ${base}: ` +
            `${compatible.mimeType} is not accepted by ${provider} and could ` +
            `not be converted. The metadata summary was still included.`,
        );
        continue;
      }
      content.push({
        type: "file" as const,
        data: compatible.buffer,
        mediaType: compatible.mimeType,
      });
      logger.info(
        `[Audio] ✅ Added to content (native audio): ${base}` +
          `${compatible.converted ? ` (converted to ${compatible.mimeType})` : ""}`,
      );
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
          mediaType: "application/pdf",
        };
      }),
    );
  } else {
    // No native PDF support: inline the PDF's text layer, clearly labeled per
    // file. Image-only conversion sent content a text-only backend can never
    // read — observed live as the model flatly claiming no file was attached
    // — and for proxy providers (litellm/openrouter) supportsVision() is a
    // pass-through, so vision cannot be trusted to carry the content either.
    // Text is therefore always included (primary for text-only backends,
    // extra grounding otherwise); page images are appended below only when
    // the provider may actually see them. A PDF with no text layer (pure
    // scan) gets an explicit note rather than silence, so the model
    // acknowledges an unreadable attachment instead of denying it exists.
    const providerCanSeeImages = ProviderImageAdapter.supportsVision(
      provider,
      model,
    );
    for (const pdf of pdfFiles) {
      const name = safeBasename(pdf.filename);
      try {
        const { PDFParse } = await import("pdf-parse");
        const parser = new PDFParse({
          data: new Uint8Array(pdf.buffer),
          ...(pdf.password ? { password: pdf.password } : {}), // #258
        });
        try {
          const extracted = await parser.getText();
          const pdfText = (extracted?.text ?? "").trim();
          if (pdfText.length > 0) {
            content.push({
              type: "text" as const,
              text: `\n[Attached PDF: ${name}]\n${pdfText}\n[End of PDF: ${name}]`,
            });
            logger.info(
              `[PDF→Text] ✅ Extracted text for non-vision provider ${provider}: ${name} (${pdfText.length} chars)`,
            );
          } else {
            content.push({
              type: "text" as const,
              text: `\n[Attached PDF: ${name} — no extractable text layer (likely a scanned document); its contents are unavailable to this text-only model.]`,
            });
            logger.warn(
              `[PDF→Text] ${name} has no text layer; provider ${provider} cannot see images — content unavailable`,
            );
          }
        } finally {
          await parser.destroy?.();
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logger.error(`[PDF→Text] ❌ Failed to parse ${name}: ${errorMessage}`);
        // #258: password errors are actionable and must surface. pdf-parse
        // raises pdf.js's PasswordException (not our typed PDF_PASSWORD_*
        // codes), so detect by name/message shape. When the provider can see
        // images, defer the throw to the image-conversion path below — it
        // raises the canonical typed error with the "supply the password"
        // guidance callers and tests rely on.
        const isPasswordError =
          (error as { name?: string })?.name === "PasswordException" ||
          /password/i.test(errorMessage);
        if (isPasswordError) {
          if (!providerCanSeeImages) {
            throw error;
          }
          // Image branch will produce the canonical typed password error.
          continue;
        }
        content.push({
          type: "text" as const,
          text: `\n[Attached PDF: ${name} — could not be parsed (${errorMessage}); its contents are unavailable.]`,
        });
      }
    }
    // Page images in addition to the text, for providers that may actually
    // see them (vision models, and proxies whose upstream might).
    if (providerCanSeeImages) {
      logger.info(
        `[PDF→Image] Provider ${provider} doesn't support native PDF. Converting ${pdfFiles.length} PDF(s) to images...`,
      );

      for (const pdf of pdfFiles) {
        try {
          const effectiveMaxPages =
            pdf.maxPages ?? PDF_LIMITS.DEFAULT_MAX_PAGES;
          const conversionResult = await PDFImageConverter.convertToImages(
            pdf.buffer,
            {
              // #297: this is the only PDF→image call the product actually makes,
              // and it used to hardcode scale 2.0 — silently overriding the
              // lowered PDF_LIMITS.DEFAULT_SCALE and keeping the memory cost the
              // issue reports (a 100-page render at 2.0 is ~776MB; 1.5 is ~44%
              // fewer pixels per page). Callers can raise it back per request.
              scale: pdf.scale ?? PDF_LIMITS.DEFAULT_SCALE,
              // Page ceiling guards token overflow; also now caller-adjustable
              // rather than a constant nothing could reach.
              maxPages: effectiveMaxPages,
              ...(pdf.password ? { password: pdf.password } : {}), // #258
              ...(pdf.maxCanvasPixels
                ? { maxCanvasPixels: pdf.maxCanvasPixels }
                : {}), // #260
            },
          );

          // The renderer stops at maxPages, so a longer document is silently
          // truncated — say so rather than letting the model answer from a
          // partial document as though it had the whole thing.
          //
          // Keyed on the cap being reached, not on pdf.pageCount: that field is
          // null whenever `input.content` omits `metadata.pages`, which is the
          // common case, so a page-count comparison would simply never fire
          // there. Reaching the cap is also unambiguous — a short count caused by
          // per-page render failures (#294 isolates those into `errors`) would
          // otherwise be misreported as a maxPages truncation.
          if (conversionResult.pageCount >= effectiveMaxPages) {
            logger.warn(
              `[PDF→Image] ${safeBasename(pdf.filename)} hit the ${effectiveMaxPages}-page ` +
                `conversion limit. Any pages beyond that were not sent — the model may be ` +
                `answering from a partial document. Raise pdfOptions.maxPages or split the file.`,
            );
          }
          if (conversionResult.errors && conversionResult.errors.length > 0) {
            logger.warn(
              `[PDF→Image] ${safeBasename(pdf.filename)}: ${conversionResult.errors.length} page(s) ` +
                `failed to render and were omitted (page ${conversionResult.errors.map((e) => e.page).join(", ")}).`,
            );
          }

          logger.info(
            `[PDF→Image] ✅ Converted ${pdf.filename}: ${conversionResult.pageCount} page(s) → images`,
          );

          // Add each page as an ImagePart (raw base64, not data: URI — see SSRF note above)
          conversionResult.images.forEach((base64Image, pageIndex) => {
            content.push({
              type: "image" as const,
              image: base64Image,
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

          // #258: password errors are already actionable typed errors — re-throw
          // them unwrapped so the "supply a password" guidance isn't buried.
          const code = (error as { code?: string })?.code;
          if (
            code === "PDF_PASSWORD_REQUIRED" ||
            code === "PDF_INCORRECT_PASSWORD"
          ) {
            throw error;
          }

          // Re-throw so the user knows PDF processing failed. The inlined
          // text layer above does NOT soften this: conversion failures
          // include caller mistakes (e.g. an invalid maxCanvasPixels, #260)
          // that must surface rather than be silently downgraded.
          throw new Error(
            `PDF to image conversion failed for ${pdf.filename}: ${errorMessage}. ` +
              `Provider ${provider} doesn't support native PDFs and image conversion failed.`,
            { cause: error },
          );
        }
      }
    }
  }

  return content;
}

/**
 * Type guard for FileWithMetadata objects.
 */
function isFileWithMetadata(file: FileInput): file is FileWithMetadata {
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
function extractFilename(file: FileInput, index: number = 0): string {
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
function getFileSize(file: FileInput): number {
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
async function getFileBuffer(file: FileInput): Promise<Buffer | null> {
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
function getFileSource(file: FileInput): "buffer" | "path" | "url" | "datauri" {
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
 * Whether a file must be processed eagerly rather than lazily referenced.
 *
 * The lazy path registers a file and injects a short textual *preview* in place
 * of the file itself. Whether that is an acceptable trade depends entirely on
 * whether a description of the file can answer questions about it:
 *
 *   pdf    lazy -> preview carries the extracted text   ✔ content survives
 *   image  lazy -> preview carries ~98 chars of prose   ✘ the pixels are gone
 *
 * An image is the case where the bytes ARE the content: no prose summary
 * substitutes for them, so the model receives a description of a file instead
 * of the file. Measured end-to-end on `release`, asking "what number is
 * written in this image?":
 *
 *   tiny.png  1.6 KB -> "7391"              (under TINY_MAX, eager, correct)
 *   big.png    11 KB -> NOTHING_RECEIVED    (lazy, image never arrived)
 *   big.jpg    19 KB -> NOTHING_RECEIVED
 *
 * 10 KB is far below any real photo, so this affected essentially every image
 * attached by path — an ordinary JPEG, not just unusual formats.
 *
 * Images were only the most visible case. The same reasoning generalises to
 * every type whose content is not text, which is why the rule below is stated
 * as an exclusion — preview lazily what a text slice can faithfully represent,
 * process everything else — rather than as a list of media types. See
 * {@link isEagerType} for what that costs and buys per modality.
 *
 * Audio deserves a note because it is the case most likely to look fine while
 * being broken: its message carries a metadata block — duration, codec, sample
 * rate — that answers exactly the questions ("how long is it?", "what sample
 * rate?") a test is most tempted to ask, and answers them correctly with no
 * audio whatsoever attached. A test asking those questions passes against a
 * model that received nothing.
 *
 * Note this costs no extra memory: `tryRegisterFileReference` already calls
 * `getFileBuffer()` and reads the whole file to register it. The lazy path was
 * never lazy about reading — only about processing — so the difference here is
 * simply whether the bytes survive.
 */
function isEagerMultimodalFile(file: FileInput): boolean {
  if (typeof file === "string") {
    return isEagerType(inferFileTypeFromExtension(file));
  }
  if (Buffer.isBuffer(file)) {
    return isEagerType(inferFileTypeFromBuffer(file));
  }

  // A `FileWithMetadata` carries two independent declarations, and either is
  // enough on its own: the shape exists for Slack/Curator-style uploads that
  // arrive as bytes plus a mimetype, so its `filename` may be extensionless or
  // simply wrong. Reading them as a `??` chain let the first *recognised* name
  // win outright — `recording.txt` with `mimetype: "audio/mpeg"` classified as
  // text, stayed lazy, and never reached the native-audio path this change
  // exists to feed. A file is kept lazy only when nothing about it disagrees.
  const declared = [
    inferFileTypeFromExtension(file.filename),
    inferFileTypeFromMimetype(file.mimetype),
  ];
  if (declared.some(isEagerType)) {
    return true;
  }

  // The buffer sniff is a last resort rather than a third vote, because it is
  // partly a substring scan: an HTML page with an inline `<svg>` icon in its
  // head would otherwise be pulled onto the eager path and sent in full, which
  // is the opposite of what the size tiers are for. It speaks only when neither
  // declaration did.
  return declared.every((type) => type === undefined)
    ? isEagerType(inferFileTypeFromBuffer(file.buffer))
    : false;
}

/**
 * Whether a routing type must be processed rather than previewed.
 *
 * "svg" is a separate routing type rather than a sub-case of "image" (it goes
 * to the sanitizer, not to a vision encoder), but it is still an image as far
 * as this decision is concerned: its markup IS its content, and previewing it
 * away leaves the model with nothing. Accepting both keeps this correct
 * whichever of the two type vocabularies the caller's map uses.
 *
 * Audio and video join them, for one shared reason: the lazy path never runs
 * the detection branch that produces their model-visible content — the decoded
 * audio buffer, the extracted video keyframes — so a lazily registered file is
 * summarised away no matter what the dispatch side is willing to send.
 *
 * Video is the clearest demonstration that this is a delivery problem and not a
 * format one. Keyframe extraction is identical across containers (three frames,
 * ~38 KB each, for every one of mp4/wmv/flv/mpg/m2ts), and a frame pulled from
 * any of them shows the test token perfectly legibly. Yet only mp4 answered
 * correctly, because Gemini accepts an mp4 natively and never needed the
 * frames; every container it cannot decode returned NOTHING_RECEIVED, since the
 * frames that would have carried the answer were never extracted. Making video
 * eager fixed all four at once.
 *
 * Documents and archives are here for the same reason once removed. The lazy
 * preview is a truncated slice of the raw bytes, so it is only ever faithful
 * for a file that IS text. A .rtf sliced raw is RTF control words, and a
 * .bz2/.xz/.zst is compressed bytes — the model was told "binary file of
 * unknown type" about files whose processors extract them cleanly.
 *
 * Which leaves plain text and CSV on the lazy path, and they are exactly the
 * cases it was built for: a truncated sample of a large CSV is a faithful
 * sample, and the file tools can read the rest on demand.
 */
function isEagerType(type: string | undefined): boolean {
  return type !== undefined && type !== "text" && type !== "csv";
}

/**
 * Infer a routing type from a caller-declared mimetype.
 *
 * Only images matter here — this exists so the eager/lazy decision can read a
 * mimetype hint — and "application/octet-stream" is deliberately ignored,
 * because it is the opaque sentinel a caller sends when it knows nothing, not
 * a claim about content.
 */
function inferFileTypeFromMimetype(mimetype?: string): string | undefined {
  if (!mimetype) {
    return undefined;
  }
  const normalized = mimetype.split(";")[0].trim().toLowerCase();
  // "application/octet-stream" is deliberately absent from the registry side of
  // this lookup: it is the opaque sentinel a caller sends when it knows
  // nothing, not a claim about content, and treating it as one would let a
  // shrugging uploader force a routing decision.
  if (normalized === "application/octet-stream") {
    return undefined;
  }
  const exact = MIMETYPE_TYPE_MAP[normalized];
  if (exact) {
    return exact;
  }
  // A family fallback for types the registry does not enumerate — `audio/webm`,
  // `image/x-something`. The leading segment is enough to decide eager vs lazy
  // even when the exact codec is unknown to us.
  const family = normalized.split("/")[0];
  return family === "image" || family === "audio" || family === "video"
    ? family
    : undefined;
}

/**
 * Try to register a file with the FileReferenceRegistry for lazy processing.
 * Returns true if registration succeeded, false if it failed (caller should
 * fall through to full processing).
 */
async function tryRegisterFileReference(
  file: FileInput,
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
    const mimetype =
      typeof file === "object" && !Buffer.isBuffer(file)
        ? file.mimetype
        : undefined;
    await registry.register(buffer, getFileSource(file), {
      filename,
      mimetype,
    });
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
