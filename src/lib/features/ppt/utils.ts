/**
 * PPT Utilities
 *
 * Contains provider utilities and helper functions for PPT generation.
 *
 * @module ppt/utils
 */

import * as fs from "fs/promises";
import * as path from "path";
import { hasProviderEnvVars } from "../../utils/providerUtils.js";
import { logger } from "../../utils/logger.js";
import { AIProviderName } from "../../constants/enums.js";
import { PPTError, PPT_ERROR_CODES } from "../../types/pptTypes.js";
import type {
  PPTGenerationContext,
  AspectRatioOption,
  EffectivePPTProviderResult,
  ImageValidationResult,
  TextSegment,
  LogoConfig,
} from "./types.js";
import type { GenerateOptions } from "../../types/generateTypes.js";

// ============================================================================
// CONTEXT EXTRACTION
// ============================================================================

/**
 * Extract PPT generation context from GenerateOptions
 */
export function extractPPTContext(
  options: GenerateOptions,
): PPTGenerationContext {
  const pptOptions = options.output?.ppt;

  if (!pptOptions) {
    throw new PPTError(
      "PPT options are required when mode is 'ppt'",
      PPT_ERROR_CODES.INVALID_INPUT,
      { field: "output.ppt" },
    );
  }

  // Handle logo: prioritize logoPath, fallback to input.images[0]
  let logo: Buffer | string | undefined;

  // First check logoPath in ppt options
  if (pptOptions.logoPath) {
    if (
      Buffer.isBuffer(pptOptions.logoPath) ||
      typeof pptOptions.logoPath === "string"
    ) {
      logo = pptOptions.logoPath;
    } else if (
      typeof pptOptions.logoPath === "object" &&
      "data" in pptOptions.logoPath
    ) {
      const data = pptOptions.logoPath.data;
      logo =
        Buffer.isBuffer(data) || typeof data === "string" ? data : undefined;
    }
  }

  // Extract all user-provided images from input.images
  const images: (Buffer | string)[] = [];
  if (options.input?.images) {
    for (const imageInput of options.input.images) {
      if (Buffer.isBuffer(imageInput) || typeof imageInput === "string") {
        images.push(imageInput);
      } else if (typeof imageInput === "object" && "data" in imageInput) {
        const data = imageInput.data;
        if (Buffer.isBuffer(data) || typeof data === "string") {
          images.push(data);
        }
      }
    }
  }

  // Fallback to input.images[0] if no logoPath (similar to video generation)
  if (!logo && images.length > 0) {
    logo = images[0];
  }

  return {
    // Get topic from input.text
    topic: options.input?.text || "",
    // Pages is required
    pages: pptOptions.pages,
    // If undefined, set to "AI will decide" so AI can choose
    theme: pptOptions.theme ?? "AI will decide",
    audience: pptOptions.audience ?? "AI will decide",
    tone: pptOptions.tone ?? "AI will decide",
    generateAIImages: pptOptions.generateAIImages ?? false,
    aspectRatio: pptOptions.aspectRatio || "16:9",
    outputPath: pptOptions.outputPath,
    logo,
    // Pass all user images for slide content
    images: images.length > 0 ? images : undefined,
    provider: options.provider,
    model: options.model,
  };
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Valid providers for PPT generation.
 * These providers support structured output capabilities required for content planning.
 */
export const PPT_VALID_PROVIDERS: readonly string[] = [
  "vertex",
  "openai",
  "azure",
  "anthropic",
  "google-ai",
  "bedrock",
] as const;

// ============================================================================
// PROVIDER UTILITIES
// ============================================================================

/**
 * Get an effective PPT provider - handles all orchestration logic
 */
export async function getEffectivePPTProvider(
  currentProvider: unknown,
  currentProviderName: string,
  currentModelName: string,
  neurolink?: unknown,
): Promise<EffectivePPTProviderResult> {
  const { ErrorFactory } = await import("../../utils/errorHandling.js");
  const normalizedProvider = currentProviderName.toLowerCase();

  if (PPT_VALID_PROVIDERS.includes(normalizedProvider)) {
    const providerInstance = currentProvider as unknown as {
      modelName: string;
      getDefaultModel?: () => string;
    };
    const actualModelName =
      currentModelName ||
      providerInstance?.modelName ||
      providerInstance?.getDefaultModel?.() ||
      "";

    logger.debug("[PPT Utils] Current provider is valid for PPT", {
      provider: currentProviderName,
      model: actualModelName,
    });

    return {
      provider: currentProvider,
      providerName: currentProviderName,
      modelName: actualModelName,
      wasAutoSelected: false,
    };
  }

  logger.info(
    "[PPT Utils] Current provider not valid for PPT, auto-selecting",
    {
      currentProvider: currentProviderName,
    },
  );

  for (const provider of PPT_VALID_PROVIDERS) {
    if (hasProviderEnvVars(provider)) {
      logger.info("[PPT Utils] Auto-selected PPT provider", {
        originalProvider: currentProviderName,
        selectedProvider: provider,
      });

      const { AIProviderFactory } = await import("../../core/factory.js");
      const { withTimeout } = await import("../../utils/errorHandling.js");
      const { PPT_GENERATION_TIMEOUT_MS } = await import("./constants.js");

      const createdProvider = await withTimeout(
        AIProviderFactory.createProvider(
          provider as AIProviderName,
          undefined,
          true,
          neurolink as Record<string, unknown>,
        ),
        PPT_GENERATION_TIMEOUT_MS / 4,
        ErrorFactory.toolTimeout(
          "createProvider",
          PPT_GENERATION_TIMEOUT_MS / 4,
        ),
      );

      return {
        provider: createdProvider,
        providerName: provider,
        modelName: (createdProvider as unknown as { modelName: string })
          .modelName,
        wasAutoSelected: true,
      };
    }
  }

  throw ErrorFactory.invalidParameters(
    "ppt-generation",
    new Error(
      `No PPT-compatible provider available. Configure one of: ${PPT_VALID_PROVIDERS.join(", ")}`,
    ),
    {
      currentProvider: currentProviderName,
      validProviders: PPT_VALID_PROVIDERS,
    },
  );
}

// ============================================================================
// FILE & PATH UTILITIES
// ============================================================================

/**
 * Generate output file path for PPT
 */
export function generateOutputPath(context: PPTGenerationContext): string {
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .substring(0, 19);
  const sanitizedTopic = context.topic
    .substring(0, 30)
    .replace(/[^a-zA-Z0-9]/g, "_")
    .toLowerCase();
  const defaultFileName = `${sanitizedTopic}_${timestamp}.pptx`;

  if (context.outputPath) {
    if (context.outputPath.endsWith(".pptx")) {
      return context.outputPath;
    }
    return path.join(context.outputPath, defaultFileName);
  }

  return path.join(process.cwd(), "output", defaultFileName);
}

/**
 * Ensure output directory exists
 */
export async function ensureOutputDirectory(filePath: string): Promise<void> {
  const dir = path.dirname(filePath);
  try {
    const { withTimeout, ErrorFactory } =
      await import("../../utils/errorHandling.js");
    const { PPT_GENERATION_TIMEOUT_MS } = await import("./constants.js");

    await withTimeout(
      fs.mkdir(dir, { recursive: true }),
      PPT_GENERATION_TIMEOUT_MS / 8,
      ErrorFactory.toolTimeout(
        "mkdirOutputDirectory",
        PPT_GENERATION_TIMEOUT_MS / 8,
      ),
    );
  } catch (error) {
    const originalError =
      error instanceof Error ? error : new Error(String(error));
    throw new PPTError(
      `Failed to create output directory: ${dir}`,
      PPT_ERROR_CODES.FILE_WRITE_FAILED,
      { directory: dir },
      originalError,
    );
  }
}

// ============================================================================
// TYPE UTILITIES
// ============================================================================

/**
 * Check if value is a non-null object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Type guard for LogoConfig
 */
export function isLogoConfig(logo: unknown): logo is LogoConfig {
  if (!isObject(logo)) {
    return false;
  }
  return (
    "data" in logo &&
    (Buffer.isBuffer(logo.data) || typeof logo.data === "string")
  );
}

/**
 * Convert LogoConfig or Buffer/string to normalized format
 */
export function normalizeLogoConfig(
  logo: Buffer | string | LogoConfig | null,
): LogoConfig | null {
  if (logo === null) {
    return null;
  }

  if (Buffer.isBuffer(logo) || typeof logo === "string") {
    return {
      data: logo,
      position: "bottom-right",
      width: 1,
      height: 0.4,
      showOn: "all-slides",
    };
  }

  if (isLogoConfig(logo)) {
    return logo;
  }

  return null;
}

/**
 * Get pptxgenjs layout name from aspect ratio
 */
export function getLayoutName(
  aspectRatio: AspectRatioOption,
): "LAYOUT_16x9" | "LAYOUT_4x3" {
  switch (aspectRatio) {
    case "16:9":
      return "LAYOUT_16x9";
    case "4:3":
      return "LAYOUT_4x3";
    default:
      return "LAYOUT_16x9";
  }
}

// ============================================================================
// ERROR UTILITIES
// ============================================================================

/**
 * Convert unknown error to Error instance
 */
export function toError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  return new Error(String(error));
}

/**
 * Determine which stage failed based on orchestration state
 */
export function getFailureStage(state: {
  contentPlan: unknown;
  slides: unknown;
  outputPath: unknown;
}): string {
  if (state.contentPlan === null) {
    return "content-planning";
  }
  if (state.slides === null) {
    return "slide-generation";
  }
  if (state.outputPath === null) {
    return "pptx-assembly";
  }
  return "file-output";
}

// ============================================================================
// IMAGE VALIDATION UTILITIES
// ============================================================================

/**
 * Validate an image buffer and determine its MIME type
 */
export function validateImageBuffer(
  buffer: Buffer | undefined,
): ImageValidationResult {
  if (!buffer || buffer.length === 0) {
    return {
      isValid: false,
      mimeType: "",
      format: "",
      error: "Empty or undefined buffer",
    };
  }

  if (buffer.length < 100) {
    return {
      isValid: false,
      mimeType: "",
      format: "",
      error: `Buffer too small (${buffer.length} bytes)`,
    };
  }

  // Check magic bytes for different image formats
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { isValid: true, mimeType: "image/jpeg", format: "JPEG" };
  }
  // PNG: 89 50 4E 47
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return { isValid: true, mimeType: "image/png", format: "PNG" };
  }
  // GIF: 47 49 46 (GIF)
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return { isValid: true, mimeType: "image/gif", format: "GIF" };
  }
  // WebP: RIFF....WEBP
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46
  ) {
    // Check for WEBP signature at offset 8
    if (buffer.length > 12 && buffer.slice(8, 12).toString() === "WEBP") {
      return { isValid: true, mimeType: "image/webp", format: "WebP" };
    }
  }
  // BMP: 42 4D (BM)
  if (buffer[0] === 0x42 && buffer[1] === 0x4d) {
    return { isValid: true, mimeType: "image/bmp", format: "BMP" };
  }

  // Unknown format - try as PNG (common fallback)
  return {
    isValid: false,
    mimeType: "image/png",
    format: "unknown",
    error: `Unknown format (magic bytes: ${buffer.slice(0, 4).toString("hex")})`,
  };
}

/**
 * Convert image buffer to data URL for pptxgenjs
 */
export function bufferToDataUrl(buffer: Buffer): string | null {
  const validation = validateImageBuffer(buffer);

  if (!validation.isValid && validation.format === "") {
    logger.warn("[bufferToDataUrl] Invalid image buffer", {
      error: validation.error,
    });
    return null;
  }

  // Use the detected MIME type or fallback to PNG
  const mimeType = validation.mimeType || "image/png";
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

// ============================================================================
// TEXT FORMATTING UTILITIES (Markdown Parsing)
// ============================================================================

/**
 * Parse markdown-style formatting in text and return formatted segments
 * Supports: **bold**, *italic*, ***bold italic***
 *
 * @example
 * parseMarkdownText("Hello **world**")
 * // Returns: [{ text: "Hello " }, { text: "world", bold: true }]
 */
export function parseMarkdownText(text: string): TextSegment[] {
  if (!text || typeof text !== "string") {
    return [{ text: text || "" }];
  }

  const segments: TextSegment[] = [];

  // Regex to match **bold**, *italic*, or ***bold italic***
  // Pattern: captures text between markers
  const pattern = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*)/g;

  let lastIndex = 0;

  while (true) {
    const match = pattern.exec(text);
    if (match === null) {
      break;
    }

    // Add text before this match
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index) });
    }

    // Determine which group matched
    if (match[2]) {
      // ***bold italic***
      segments.push({ text: match[2], bold: true, italic: true });
    } else if (match[3]) {
      // **bold**
      segments.push({ text: match[3], bold: true });
    } else if (match[4]) {
      // *italic*
      segments.push({ text: match[4], italic: true });
    }

    lastIndex = pattern.lastIndex;
  }

  // Add remaining text after last match
  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex) });
  }

  // If no matches found, return original text as single segment
  if (segments.length === 0) {
    segments.push({ text });
  }

  return segments;
}

/**
 * Check if text contains markdown formatting
 */
export function hasMarkdownFormatting(text: string): boolean {
  if (!text || typeof text !== "string") {
    return false;
  }
  return /\*{1,3}[^*]+\*{1,3}/.test(text);
}

/**
 * Convert parsed text segments to pptxgenjs text runs array
 * This allows mixed formatting within a single bullet point
 */
export function createFormattedTextProps(
  segments: TextSegment[],
  baseOptions: {
    fontSize: number;
    fontFace: string;
    color: string;
    baseBold?: boolean;
  },
): Array<{ text: string; options: Record<string, unknown> }> {
  return segments.map((segment) => ({
    text: segment.text,
    options: {
      fontSize: baseOptions.fontSize,
      fontFace: baseOptions.fontFace,
      color: baseOptions.color,
      bold: segment.bold || baseOptions.baseBold || false,
      italic: segment.italic || false,
    },
  }));
}

/**
 * Calculate font size based on bullet count
 * More bullets = smaller font to fit content
 *
 * Formula:
 * - 1-5 bullets: baseFontSize (18pt)
 * - 6-7 bullets: baseFontSize - 2 (16pt)
 * - 8-10 bullets: baseFontSize - 4 (14pt)
 * - 10+ bullets: cap at 12pt minimum
 */
export function calculateFontSize(
  bulletCount: number,
  baseFontSize: number = 18,
): number {
  const MIN_FONT_SIZE = 12;

  if (bulletCount <= 5) {
    return baseFontSize;
  } else if (bulletCount <= 7) {
    return Math.max(MIN_FONT_SIZE, baseFontSize - 2);
  } else if (bulletCount <= 10) {
    return Math.max(MIN_FONT_SIZE, baseFontSize - 4);
  } else {
    return MIN_FONT_SIZE;
  }
}
