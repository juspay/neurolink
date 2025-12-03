import type {
  FileProcessingResult,
  PDFProviderConfig,
  PDFProcessorOptions,
} from "../types/fileTypes.js";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { logger } from "./logger.js";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { createCanvas } from "canvas";

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
  azure: {
    maxSizeMB: 10,
    maxPages: 100,
    supportsNative: true,
    requiresCitations: false,
    apiType: "files-api",
  },
  "azure-openai": {
    maxSizeMB: 10,
    maxPages: 100,
    supportsNative: true,
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
    supportsNative: true,
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

  static async process(
    content: Buffer,
    options?: PDFProcessorOptions,
  ): Promise<FileProcessingResult> {
    const provider = (options?.provider || "unknown").toLowerCase();
    const config = PDF_PROVIDER_CONFIGS[provider];

    if (!this.isValidPDF(content)) {
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

    const metadata = this.extractBasicMetadata(content);

    if (metadata.estimatedPages && metadata.estimatedPages > config.maxPages) {
      logger.warn(
        `[PDF] PDF appears to have ${metadata.estimatedPages}+ pages. ` +
          `${provider} supports up to ${config.maxPages} pages.`,
      );
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
      },
    };
  }

  static supportsNativePDF(provider: string): boolean {
    const config = PDF_PROVIDER_CONFIGS[provider];
    return config?.supportsNative || false;
  }

  static getProviderConfig(provider: string): PDFProviderConfig | null {
    return PDF_PROVIDER_CONFIGS[provider] || null;
  }

  private static isValidPDF(buffer: Buffer): boolean {
    if (buffer.length < 5) {
      return false;
    }
    return buffer.subarray(0, 5).equals(this.PDF_SIGNATURE);
  }

  private static extractBasicMetadata(buffer: Buffer) {
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

  static async convertPDFToImages(
    pdfBuffer: Buffer,
    options?: {
      maxPages?: number;
      scale?: number;
      format?: "png" | "jpeg";
      quality?: number;
    },
  ): Promise<Array<{ buffer: Buffer; pageNumber: number }>> {
    const maxPages = options?.maxPages || 10;
    const scale = options?.scale || 2.0;
    const format = options?.format || "png";
    const quality = options?.quality || 0.9;

    let pdfDocument: PDFDocumentProxy | null = null;

    try {
      const loadingTask = pdfjs.getDocument({
        data: new Uint8Array(pdfBuffer),
        useSystemFonts: true,
        standardFontDataUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
      });

      pdfDocument = await loadingTask.promise;
      const numPages = Math.min(pdfDocument.numPages, maxPages);
      const images: Array<{ buffer: Buffer; pageNumber: number }> = [];

      logger.info(
        `[PDF→Image] Converting ${numPages} page(s) from PDF (total: ${pdfDocument.numPages})`,
      );

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdfDocument.getPage(pageNum);
        const viewport = page.getViewport({ scale });

        const canvas = createCanvas(viewport.width, viewport.height);
        const context = canvas.getContext("2d");

        await page.render({
          canvasContext: context as unknown as CanvasRenderingContext2D,
          viewport,
          // @ts-expect-error - canvas type mismatch between node-canvas and pdfjs-dist
          canvas: canvas,
        }).promise;

        const imageBuffer =
          format === "png"
            ? canvas.toBuffer("image/png")
            : canvas.toBuffer("image/jpeg", { quality });

        images.push({ buffer: imageBuffer, pageNumber: pageNum });

        logger.debug(
          `[PDF→Image] ✅ Converted page ${pageNum}/${numPages} (${(imageBuffer.length / 1024).toFixed(1)}KB)`,
        );
      }

      if (pdfDocument.numPages > maxPages) {
        logger.warn(
          `[PDF→Image] PDF has ${pdfDocument.numPages} pages, converted only first ${maxPages} pages`,
        );
      }

      logger.info(
        `[PDF→Image] ✅ Successfully converted ${images.length} page(s) to images`,
      );

      return images;
    } catch (error) {
      logger.error(
        `[PDF→Image] ❌ Failed to convert PDF to images:`,
        error instanceof Error ? error.message : String(error),
      );
      throw new Error(
        `PDF to image conversion failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      // Ensure pdfDocument is destroyed regardless of success or failure
      if (pdfDocument) {
        try {
          pdfDocument.destroy();
          logger.debug("[PDF→Image] PDF document resources cleaned up");
        } catch (destroyError) {
          logger.warn(
            "[PDF→Image] Error destroying PDF document:",
            destroyError instanceof Error
              ? destroyError.message
              : String(destroyError),
          );
        }
      }
    }
  }
}
