/**
 * PDF Processor with Image Fallback Support
 *
 * Handles PDF processing for all providers:
 * - Native PDF support for providers that accept PDF directly (Google AI, Vertex, OpenAI, Anthropic, Bedrock)
 * - PDF → Image conversion for providers that don't support native PDF (Azure, Mistral, Ollama)
 *
 * The conversion uses pdf-to-img package (MuPDF-based) for high-quality conversion.
 */

import { PDF_LIMITS } from "../core/constants.js";
import type {
  FileProcessingResult,
  PDFProcessorOptions,
  PDFProviderConfig,
  PDFImageConversionOptions,
  PDFImageConversionResult,
  PDFImagePage,
} from "../types/index.js";
import { ErrorFactory } from "./errorHandling.js";
import { logger } from "./logger.js";

/**
 * Provider configurations for PDF handling
 *
 * supportsNative: true = Send PDF as FilePart (mimeType: application/pdf)
 * supportsNative: false = Convert PDF pages to PNG images and send as ImageParts
 */
const PDF_PROVIDER_CONFIGS: Record<string, PDFProviderConfig> = {
  anthropic: {
    maxSizeMB: 5,
    maxPages: 100,
    supportsNative: true,
    requiresCitations: false,
    apiType: "document",
  },
  bedrock: {
    maxSizeMB: 5,
    maxPages: 100,
    supportsNative: true,
    requiresCitations: "auto",
    apiType: "document",
  },
  "google-vertex": {
    maxSizeMB: 5,
    maxPages: 100,
    supportsNative: true,
    requiresCitations: false,
    apiType: "document",
  },
  vertex: {
    maxSizeMB: 5,
    maxPages: 100,
    supportsNative: true,
    requiresCitations: false,
    apiType: "document",
  },
  "google-ai-studio": {
    maxSizeMB: 2000,
    maxPages: 100,
    supportsNative: true,
    requiresCitations: false,
    apiType: "files-api",
  },
  gemini: {
    maxSizeMB: 2000,
    maxPages: 100,
    supportsNative: true,
    requiresCitations: false,
    apiType: "files-api",
  },
  "google-ai": {
    maxSizeMB: 2000,
    maxPages: 100,
    supportsNative: true,
    requiresCitations: false,
    apiType: "files-api",
  },
  openai: {
    maxSizeMB: 10,
    maxPages: 100,
    supportsNative: true,
    requiresCitations: false,
    apiType: "files-api",
  },
  // Azure does NOT support native PDF - must convert to images
  azure: {
    maxSizeMB: 10,
    maxPages: 100,
    supportsNative: false,
    requiresCitations: false,
    apiType: "files-api",
  },
  "azure-openai": {
    maxSizeMB: 10,
    maxPages: 100,
    supportsNative: false,
    requiresCitations: false,
    apiType: "files-api",
  },
  litellm: {
    maxSizeMB: 10,
    maxPages: 100,
    supportsNative: true,
    requiresCitations: false,
    apiType: "files-api",
  },
  "openai-compatible": {
    maxSizeMB: 10,
    maxPages: 100,
    supportsNative: false, // LiteLLM is a proxy — underlying model may not support native PDF; default to safe text extraction
    requiresCitations: false,
    apiType: "files-api",
  },
  mistral: {
    maxSizeMB: 10,
    maxPages: 100,
    supportsNative: false,
    requiresCitations: false,
    apiType: "files-api",
  },
  "hugging-face": {
    maxSizeMB: 10,
    maxPages: 100,
    supportsNative: true,
    requiresCitations: false,
    apiType: "files-api",
  },
  huggingface: {
    maxSizeMB: 10,
    maxPages: 100,
    supportsNative: true,
    requiresCitations: false,
    apiType: "files-api",
  },
};

export class PDFProcessor {
  // PDF magic bytes: %PDF-
  private static readonly PDF_SIGNATURE = Buffer.from("%PDF-", "ascii");

  // ============================================================================
  // PDF Validation & Processing
  // ============================================================================

  static async process(
    content: Buffer,
    options?: PDFProcessorOptions,
  ): Promise<FileProcessingResult> {
    const provider = (options?.provider || "unknown").toLowerCase();
    const config = PDF_PROVIDER_CONFIGS[provider];

    if (!PDFProcessor.isValidPDF(content)) {
      throw new Error(
        "Invalid PDF file format. File must start with %PDF- header.",
      );
    }

    if (!config) {
      const supportedProviders = Object.keys(PDF_PROVIDER_CONFIGS).join(", ");

      throw new Error(
        `PDF files are not configured for ${provider} provider.\n` +
          `Configured providers: ${supportedProviders}\n` +
          `Current provider: ${provider}\n\n` +
          `Options:\n` +
          `1. Switch to a configured provider (--provider openai or --provider vertex)\n` +
          `2. Contact support to add ${provider} PDF configuration`,
      );
    }

    const sizeMB = content.length / (1024 * 1024);
    if (sizeMB > config.maxSizeMB) {
      throw new Error(
        `PDF size ${sizeMB.toFixed(2)}MB exceeds ${config.maxSizeMB}MB limit for ${provider}`,
      );
    }

    const metadata = PDFProcessor.extractBasicMetadata(content);

    // #287: prefer an accurate page count (pdf-parse/pdfjs) over the unreliable
    // header regex for both limit enforcement and returned metadata; fall back
    // to the regex estimate when the accurate probe times out or fails.
    const accuratePages = await PDFProcessor.getAccuratePageCount(content);
    if (accuratePages !== null) {
      metadata.estimatedPages = accuratePages;
    }

    if (metadata.estimatedPages && metadata.estimatedPages > config.maxPages) {
      const enforceLimits = options?.enforceLimits !== false;

      if (enforceLimits) {
        throw ErrorFactory.pdfPageLimitExceeded(
          metadata.estimatedPages,
          config.maxPages,
          provider,
        );
      } else {
        logger.warn(
          `[PDF] ⚠️ LIMIT BYPASS: Processing ${metadata.estimatedPages}-page PDF despite ${config.maxPages}-page limit for ${provider}. ` +
            `This may cause API rejection, token errors, or unexpected costs. ` +
            `Consider splitting the PDF or using a different provider.`,
        );
      }
    }

    if (provider === "bedrock" && options?.bedrockApiMode === "converse") {
      logger.info(
        "[PDF] Using Bedrock Converse API. " +
          "Visual PDF analysis requires citations enabled. " +
          "Text-only mode: ~1,000 tokens/3 pages. " +
          "Visual mode: ~7,000 tokens/3 pages.",
      );
    }

    logger.info("[PDF] ✅ Validated PDF file", {
      provider,
      size: `${sizeMB.toFixed(2)}MB`,
      version: metadata.version,
      estimatedPages: metadata.estimatedPages,
      apiType: config.apiType,
      supportsNative: config.supportsNative,
    });

    return {
      type: "pdf",
      content,
      mimeType: "application/pdf",
      metadata: {
        confidence: 100,
        size: content.length,
        ...metadata,
        provider,
        apiType: config.apiType,
        // #349: surface the provider's citations requirement so downstream
        // provider adapters (e.g. Bedrock Converse document blocks) can act on
        // it, instead of the config field being read nowhere.
        requiresCitations: config.requiresCitations,
      },
    };
  }

  /**
   * Check if a provider supports native PDF input
   * @param provider - Provider name
   * @returns true if provider can accept PDF directly, false if requires image conversion
   */
  static supportsNativePDF(provider: string): boolean {
    const normalizedProvider = provider.toLowerCase();
    const config = PDF_PROVIDER_CONFIGS[normalizedProvider];
    return config?.supportsNative ?? false;
  }

  static getProviderConfig(provider: string): PDFProviderConfig | null {
    return PDF_PROVIDER_CONFIGS[provider] || null;
  }

  private static isValidPDF(buffer: Buffer): boolean {
    if (buffer.length < 5) {
      return false;
    }
    return buffer.subarray(0, 5).equals(PDFProcessor.PDF_SIGNATURE);
  }

  private static extractBasicMetadata(buffer: Buffer): {
    version: string;
    estimatedPages: number | null;
    filename: undefined;
  } {
    const headerSize = Math.min(10000, buffer.length);
    const header = buffer.toString("utf-8", 0, headerSize);

    const versionMatch = header.match(/%PDF-(\d\.\d)/);
    const version = versionMatch ? versionMatch[1] : "unknown";

    const pageMatches = header.match(/\/Type\s*\/Page[^s]/g);
    const estimatedPages = pageMatches ? pageMatches.length : null;

    return {
      version,
      estimatedPages,
      filename: undefined,
    };
  }

  /**
   * Accurate page count via pdf-parse (pdfjs) (#287). The header regex in
   * `extractBasicMetadata` only sees plaintext `/Type /Page` markers and misses
   * compressed/object-stream PDFs (and miscounts when a page dict spans a chunk
   * boundary). This parses the document properly, bounded by a timeout so a
   * pathological PDF can't block; returns null on timeout/failure so the caller
   * falls back to the regex estimate.
   */
  private static async getAccuratePageCount(
    buffer: Buffer,
  ): Promise<number | null> {
    try {
      const { PDFParse } = await import("pdf-parse");
      const pdf = new PDFParse({ data: new Uint8Array(buffer) });
      try {
        const info = await Promise.race([
          pdf.getInfo(),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error("page-count timeout")),
              PDF_LIMITS.PAGE_COUNT_TIMEOUT_MS,
            ),
          ),
        ]);
        const total = (info as { total?: number }).total;
        return typeof total === "number" && total > 0 ? total : null;
      } finally {
        await (
          pdf as unknown as { destroy?: () => Promise<void> | void }
        ).destroy?.();
      }
    } catch (error) {
      logger.debug(
        `[PDF] Accurate page count unavailable; using regex estimate: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    }
  }

  static estimateTokens(
    pageCount: number,
    mode: "text-only" | "visual" = "visual",
  ): number {
    if (mode === "text-only") {
      return Math.ceil((pageCount / 3) * 1000);
    } else {
      return Math.ceil((pageCount / 3) * 7000);
    }
  }

  // ============================================================================
  // PDF → Image Conversion (for providers without native PDF support)
  // ============================================================================

  /**
   * Estimate the largest page's rendered pixel count from the PDF's MediaBox
   * entries, WITHOUT rendering (#260). Parses `/MediaBox [llx lly urx ury]`
   * (dimensions in points); rendered pixels ≈ (width·scale)·(height·scale).
   * Returns 0 when no plaintext MediaBox is found (e.g. compressed object
   * streams) — the caller then skips downscaling, matching prior behavior.
   *
   * A crafted/malformed MediaBox can have finite but astronomically large
   * width/height; `width * height * scale * scale` can then overflow past
   * `Number.MAX_VALUE` to `Infinity`. Clamp the product to
   * `Number.MAX_SAFE_INTEGER` so it stays finite — a large-but-finite pixel
   * estimate still triggers downscaling, whereas `Infinity` would collapse
   * the computed downscale factor to 0 (see `convertToImages`).
   */
  private static largestPagePixels(pdfBuffer: Buffer, scale: number): number {
    const text = pdfBuffer.toString("latin1");
    const re =
      /\/MediaBox\s*\[\s*(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s*\]/g;
    let max = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      const width = Math.abs(parseFloat(match[3]) - parseFloat(match[1]));
      const height = Math.abs(parseFloat(match[4]) - parseFloat(match[2]));
      if (Number.isFinite(width) && Number.isFinite(height)) {
        const pixels = width * height * scale * scale;
        const boundedPixels = Number.isFinite(pixels)
          ? Math.min(pixels, Number.MAX_SAFE_INTEGER)
          : Number.MAX_SAFE_INTEGER;
        if (boundedPixels > max) {
          max = boundedPixels;
        }
      }
    }
    return max;
  }

  /**
   * Convert a PDF buffer to an array of base64 PNG images
   *
   * This is used automatically when a provider (like Azure, Mistral, Ollama) doesn't
   * support native PDF input but does support image input. The PDF pages are converted
   * to PNG images and sent as vision content.
   *
   * @param pdfBuffer - PDF file content as Buffer
   * @param options - Conversion options
   * @returns Promise with conversion result including base64 images
   *
   * @example
   * ```typescript
   * // Check if conversion is needed
   * if (!PDFProcessor.supportsNativePDF('azure')) {
   *   const result = await PDFProcessor.convertToImages(pdfBuffer, {
   *     scale: 2,
   *     maxPages: 10
   *   });
   *   // Use images in LLM input instead of PDF
   *   options.input.images = result.images;
   * }
   * ```
   */
  static async convertToImages(
    pdfBuffer: Buffer,
    options?: PDFImageConversionOptions,
  ): Promise<PDFImageConversionResult> {
    const startTime = Date.now();
    const {
      scale = PDF_LIMITS.DEFAULT_SCALE,
      maxPages = PDF_LIMITS.DEFAULT_MAX_PAGES,
      format = "png",
      maxCanvasPixels = PDF_LIMITS.DEFAULT_MAX_CANVAS_PIXELS,
      password,
      onProgress,
    } = options || {};
    const images: string[] = [];
    const warnings: string[] = [];
    const pageErrors: Array<{ page: number; error: string }> = [];

    // Validation shared with convertToImagesStream (#302).
    const sizeMB = PDFProcessor.validateImageConversionInput(pdfBuffer, {
      format,
      scale,
      maxCanvasPixels,
    });

    logger.debug("[PDF→Image] ✅ PDF validation passed", {
      bufferSize: pdfBuffer.length,
      sizeMB: sizeMB.toFixed(2),
      maxPages,
    });

    // #297: surface an up-front memory estimate so an operator can spot a
    // conversion that will allocate a lot before it runs. Uses the cheap regex
    // page estimate (the accurate pdf-parse count runs in process(), not here).
    const estimatedPages = Math.max(
      1,
      PDFProcessor.extractBasicMetadata(pdfBuffer).estimatedPages ?? 1,
    );
    const estimatedMemoryMB = PDFProcessor.estimateConversionMemoryUsage(
      pdfBuffer.length,
      estimatedPages,
      scale,
    );
    logger.info("[PDF→Image] Estimated memory usage before conversion", {
      scale,
      estimatedPages,
      estimatedMemoryMB,
      sizeMB: Number(sizeMB.toFixed(2)),
    });

    try {
      // Dynamic import to avoid loading MuPDF binaries until needed
      const pdfToImgModule = await import("pdf-to-img");
      const pdf = pdfToImgModule.pdf;

      logger.debug("[PDF→Image] Starting PDF to image conversion", {
        bufferSize: pdfBuffer.length,
        scale,
        maxPages: maxPages || "all",
      });

      // #260: pre-flight page-size check WITHOUT rendering. pdf-to-img applies
      // `scale` uniformly with no per-page hook and no pixel guard, so a very
      // large page (e.g. an architectural drawing with a huge MediaBox) can
      // allocate gigabytes of canvas. Read the largest MediaBox from the PDF
      // bytes and, if that page at the requested scale would exceed
      // maxCanvasPixels, downscale the whole render uniformly to stay under it.
      let effectiveScale = scale;
      const largestPixels = PDFProcessor.largestPagePixels(pdfBuffer, scale);
      if (largestPixels > maxCanvasPixels) {
        const downscale = Math.sqrt(maxCanvasPixels / largestPixels);
        // Floor the result: an astronomically large (but now finite, see
        // `largestPagePixels`) pixel estimate would otherwise push `downscale`
        // — and therefore `effectiveScale` — toward 0, handing `pdf-to-img` a
        // degenerate viewport instead of a small-but-renderable page.
        effectiveScale = Math.max(
          PDF_LIMITS.MIN_EFFECTIVE_SCALE,
          scale * downscale,
        );
        // Recompute the ratio actually applied (may differ from `downscale`
        // when the floor above kicks in) so the logged estimate stays honest.
        const actualDownscale = effectiveScale / scale;
        const beforeMB = (largestPixels * 4) / (1024 * 1024);
        const afterMB =
          (largestPixels * actualDownscale * actualDownscale * 4) /
          (1024 * 1024);
        const msg =
          `Downscaled render (scale ${scale} → ${effectiveScale.toFixed(3)}): ` +
          `the largest page would allocate ~${beforeMB.toFixed(0)}MB, above the ` +
          `maxCanvasPixels ceiling; reduced to ~${afterMB.toFixed(0)}MB per page.`;
        logger.warn(`[PDF→Image] ⚠️ ${msg}`);
        warnings.push(msg);
      }

      // Create PDF document (password forwarded for encrypted PDFs, #258).
      // pdf-to-img resolves `.length` (numPages) synchronously here and exposes
      // `.getPage(n)`, so we drive an indexed loop rather than the async
      // iterator — that lets one bad page be isolated instead of aborting all.
      const document = await pdf(pdfBuffer, {
        scale: effectiveScale,
        ...(password ? { password } : {}),
      });

      const totalPages: number = document.length;

      // #294: convert page-by-page with per-page isolation. A single page whose
      // canvas render throws (e.g. a degenerate MediaBox) no longer discards
      // every already-converted page — it is recorded in `errors` and the rest
      // continue.
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        if (maxPages !== undefined && pageNum - 1 >= maxPages) {
          warnings.push(
            `Stopped at page ${pageNum - 1} (maxPages limit: ${maxPages})`,
          );
          break;
        }
        try {
          const page = await document.getPage(pageNum);
          const base64Image = page.toString("base64");
          images.push(base64Image);
          logger.debug(`[PDF→Image] Converted page ${pageNum}`, {
            imageSizeBytes: page.length,
            base64Length: base64Image.length,
          });
          // #302: report progress after each successfully converted page.
          if (onProgress) {
            await onProgress({
              pagesConverted: images.length,
              totalPages,
              elapsedMs: Date.now() - startTime,
            });
          }
        } catch (pageError) {
          const msg =
            pageError instanceof Error ? pageError.message : String(pageError);
          logger.warn(
            `[PDF→Image] ⚠️ page ${pageNum} failed to render: ${msg}`,
          );
          pageErrors.push({ page: pageNum, error: msg });
        }
      }

      // Empty PDF (0 pages) or every page failed → treat as a conversion
      // failure (kept inside the try so the password/format mapping below still
      // applies), otherwise return the pages that did convert.
      if (images.length === 0) {
        if (pageErrors.length > 0) {
          throw new Error(
            `All ${pageErrors.length} page(s) failed to render. First error: ${pageErrors[0].error}`,
          );
        }
        throw new Error("PDF has 0 pages. Cannot convert empty PDF to images.");
      }

      const conversionTimeMs = Date.now() - startTime;

      logger.info("[PDF→Image] ✅ PDF conversion completed", {
        pageCount: images.length,
        failedPages: pageErrors.length,
        conversionTimeMs,
        totalImageBytes: images.reduce((sum, img) => sum + img.length, 0),
      });

      return {
        images,
        pageCount: images.length,
        conversionTimeMs,
        warnings: warnings.length > 0 ? warnings : undefined,
        errors: pageErrors.length > 0 ? pageErrors : undefined,
      };
    } catch (error) {
      const conversionTimeMs = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      logger.error("[PDF→Image] ❌ PDF conversion failed", {
        error: errorMessage,
        conversionTimeMs,
      });

      // #258: map pdfjs's PasswordException to an actionable typed error so a
      // caller learns to supply (or correct) the password instead of seeing a
      // generic "conversion failed". pdfjs code 1 = NEED_PASSWORD, 2 = INCORRECT.
      const pdfErr = error as { name?: string; code?: number };
      if (
        pdfErr?.name === "PasswordException" ||
        /password/i.test(errorMessage)
      ) {
        const incorrect =
          pdfErr.code === 2 || /incorrect|invalid/i.test(errorMessage);
        throw incorrect
          ? ErrorFactory.pdfIncorrectPassword()
          : ErrorFactory.pdfPasswordRequired();
      }

      throw new Error(`PDF to image conversion failed: ${errorMessage}`, {
        cause: error,
      });
    }
  }

  /**
   * Shared input validation for the image-conversion paths. Returns the PDF
   * size in MB (needed by the memory-estimate log). Throws on any invalid input
   * with the same messages the batch path has always used.
   */
  private static validateImageConversionInput(
    pdfBuffer: Buffer,
    opts: { format: string; scale: number; maxCanvasPixels: number },
  ): number {
    if (opts.format !== "png") {
      throw new Error(
        `Invalid format: "${opts.format}". Only "png" format is currently supported.`,
      );
    }
    if (
      !Number.isFinite(opts.scale) ||
      opts.scale < PDF_LIMITS.MIN_SCALE ||
      opts.scale > PDF_LIMITS.MAX_SCALE
    ) {
      throw new Error(
        `Invalid scale: ${opts.scale}. Scale must be a finite number between ${PDF_LIMITS.MIN_SCALE} and ${PDF_LIMITS.MAX_SCALE}.`,
      );
    }
    if (!Number.isFinite(opts.maxCanvasPixels) || opts.maxCanvasPixels <= 0) {
      throw new Error(
        `Invalid maxCanvasPixels: ${opts.maxCanvasPixels}. Must be a finite number greater than 0.`,
      );
    }
    if (!pdfBuffer || pdfBuffer.length < 5) {
      throw new Error(
        "Invalid PDF: Buffer is too small or empty. " +
          "A valid PDF must be at least 5 bytes (PDF header).",
      );
    }
    if (!PDFProcessor.isValidPDF(pdfBuffer)) {
      throw new Error(
        "Invalid PDF: File must start with %PDF- header. " +
          "The provided buffer does not appear to be a valid PDF file.",
      );
    }
    const sizeMB = pdfBuffer.length / (1024 * 1024);
    if (sizeMB > PDF_LIMITS.MAX_SIZE_MB) {
      throw new Error(
        `PDF too large for image conversion: ${sizeMB.toFixed(2)}MB exceeds ${PDF_LIMITS.MAX_SIZE_MB}MB limit. ` +
          "Consider splitting the PDF or using a provider with native PDF support.",
      );
    }
    return sizeMB;
  }

  /**
   * Streaming variant of {@link convertToImages} (#302): yields each page's
   * base64 PNG as soon as it renders instead of buffering the whole document,
   * and reports progress via `options.onProgress`. A page that fails to render
   * is yielded with `error` set (per-page isolation, #294) rather than aborting
   * the stream. `convertToImages` is the batch wrapper over this contract.
   */
  static async *convertToImagesStream(
    pdfBuffer: Buffer,
    options?: PDFImageConversionOptions,
  ): AsyncGenerator<PDFImagePage, void, void> {
    const startTime = Date.now();
    const {
      scale = PDF_LIMITS.DEFAULT_SCALE,
      maxPages = PDF_LIMITS.DEFAULT_MAX_PAGES,
      format = "png",
      maxCanvasPixels = PDF_LIMITS.DEFAULT_MAX_CANVAS_PIXELS,
      password,
      onProgress,
    } = options || {};

    PDFProcessor.validateImageConversionInput(pdfBuffer, {
      format,
      scale,
      maxCanvasPixels,
    });

    const pdfToImgModule = await import("pdf-to-img");
    const pdf = pdfToImgModule.pdf;

    // #260: uniform downscale so the largest page stays under maxCanvasPixels.
    let effectiveScale = scale;
    const largestPixels = PDFProcessor.largestPagePixels(pdfBuffer, scale);
    if (largestPixels > maxCanvasPixels) {
      effectiveScale = scale * Math.sqrt(maxCanvasPixels / largestPixels);
    }

    const document = await pdf(pdfBuffer, {
      scale: effectiveScale,
      ...(password ? { password } : {}),
    });
    const totalPages: number = document.length;
    let converted = 0;

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      if (maxPages !== undefined && pageNum - 1 >= maxPages) {
        break;
      }
      try {
        const page = await document.getPage(pageNum);
        const base64Image = page.toString("base64");
        converted++;
        if (onProgress) {
          await onProgress({
            pagesConverted: converted,
            totalPages,
            elapsedMs: Date.now() - startTime,
          });
        }
        yield {
          pageIndex: pageNum,
          image: base64Image,
          imageSizeBytes: page.length,
        };
      } catch (pageError) {
        const msg =
          pageError instanceof Error ? pageError.message : String(pageError);
        logger.warn(
          `[PDF→Image] ⚠️ page ${pageNum} failed to render (stream): ${msg}`,
        );
        yield { pageIndex: pageNum, image: "", imageSizeBytes: 0, error: msg };
      }
    }
  }

  /**
   * Convert a PDF file path to an array of base64 PNG images
   *
   * @param pdfPath - Path to the PDF file
   * @param options - Conversion options
   * @returns Promise with conversion result
   */
  static async convertFromPath(
    pdfPath: string,
    options?: PDFImageConversionOptions,
  ): Promise<PDFImageConversionResult> {
    const fs = await import("fs/promises");
    const pdfBuffer = await fs.readFile(pdfPath);
    return PDFProcessor.convertToImages(pdfBuffer, options);
  }

  /**
   * Check if PDF to image conversion is available
   * Useful for feature detection
   *
   * @returns true if pdf-to-img package is available
   */
  static async isImageConversionAvailable(): Promise<boolean> {
    try {
      await import("pdf-to-img");
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get estimated memory usage for converting a PDF
   *
   * @param pdfSizeBytes - Size of PDF file in bytes
   * @param pageCount - Estimated number of pages
   * @param scale - Scale factor
   * @returns Estimated memory usage in MB
   */
  static estimateConversionMemoryUsage(
    pdfSizeBytes: number,
    pageCount: number,
    scale: number = PDF_LIMITS.DEFAULT_SCALE,
  ): number {
    // Rough estimation:
    // - Each page at scale 2 produces ~1-3MB PNG
    // - MuPDF needs ~2x PDF size for processing
    // - Output images need ~2MB per page on average

    const pdfProcessingMB = (pdfSizeBytes / (1024 * 1024)) * 2;
    const outputImagesMB = pageCount * 2 * scale;

    return Math.ceil(pdfProcessingMB + outputImagesMB);
  }

  /**
   * Get list of providers that require PDF → Image conversion
   */
  static getImageFallbackProviders(): string[] {
    return Object.entries(PDF_PROVIDER_CONFIGS)
      .filter(([_, config]) => !config.supportsNative)
      .map(([name]) => name);
  }

  /**
   * Get list of providers that support native PDF
   */
  static getNativePDFProviders(): string[] {
    return Object.entries(PDF_PROVIDER_CONFIGS)
      .filter(([_, config]) => config.supportsNative)
      .map(([name]) => name);
  }
}

// Export PDFImageConverter as an alias for backward compatibility
export const PDFImageConverter = PDFProcessor;
