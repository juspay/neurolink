/**
 * Image Loader for Multi-Modal RAG
 *
 * Loads image files (from disk or URLs) into ImageDocument objects
 * that can be embedded and stored in a vector store alongside text chunks.
 *
 * @example
 * ```typescript
 * import { ImageLoader } from './imageLoader.js';
 *
 * const loader = new ImageLoader();
 *
 * // Load from file path
 * const doc = await loader.load('./photo.jpg');
 *
 * // Load from URL
 * const doc2 = await loader.load('https://example.com/image.png');
 *
 * // Load from buffer
 * const doc3 = loader.loadFromBuffer(imageBuffer, 'image/jpeg');
 * ```
 */

import { readFileSync, existsSync, statSync } from "fs";
import { extname } from "path";
import { logger } from "../../utils/logger.js";
import { safeDownload } from "../../utils/safeFetch.js";
import { redactUrlForError } from "../../utils/logSanitize.js";
import {
  ImageProcessor,
  VALID_IMAGE_EXTENSIONS,
} from "../../utils/imageProcessor.js";
import { EXTENSION_MIME_MAP } from "../../processors/config/index.js";
import type { ImageDocument, ImageLoaderOptions } from "../../types/index.js";

/**
 * Generate a text representation from the image source.
 */
function generateTextDescription(source: string): string {
  // Drop any query string or fragment before deriving the name. On a presigned
  // URL the signature lives in the query, and the query is part of the final
  // slash-separated segment — so `.pop()` alone keeps it, and this caption is
  // not a transient log line: it becomes embedded, BM25-indexed chunk text that
  // persists in the vector store and is read back into model context.
  const withoutQueryOrFragment = source.split(/[?#]/)[0];
  const filename = withoutQueryOrFragment.split("/").pop() ?? source;
  // Remove extension and clean up
  const name = filename
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return `Image: ${name}`;
}

/**
 * ImageLoader for multi-modal RAG.
 * Loads images from file paths, URLs, or buffers into ImageDocument objects.
 */
export class ImageLoader {
  private options: Required<ImageLoaderOptions>;

  constructor(options?: ImageLoaderOptions) {
    this.options = {
      metadata: options?.metadata ?? {},
      maxImageSize: options?.maxImageSize ?? 10 * 1024 * 1024, // 10MB
      fetchTimeout: options?.fetchTimeout ?? 30_000,
      headers: options?.headers ?? {},
    };
  }

  /**
   * Load an image from a file path or URL.
   */
  async load(
    source: string,
    options?: Partial<ImageLoaderOptions>,
  ): Promise<ImageDocument> {
    const opts = { ...this.options, ...options };

    if (source.startsWith("http://") || source.startsWith("https://")) {
      return this.loadFromURL(source, opts);
    }
    return this.loadFromPath(source, opts);
  }

  /**
   * Load an image from a local file path.
   */
  private async loadFromPath(
    filePath: string,
    options: Required<ImageLoaderOptions>,
  ): Promise<ImageDocument> {
    if (!existsSync(filePath)) {
      throw new Error(`Image file not found: ${filePath}`);
    }

    const { size } = statSync(filePath);
    if (size > options.maxImageSize) {
      throw new Error(
        `Image size (${size} bytes) exceeds maximum (${options.maxImageSize} bytes)`,
      );
    }

    const buffer = readFileSync(filePath);

    const ext = extname(filePath).toLowerCase();
    const mimeType =
      EXTENSION_MIME_MAP[ext] ?? ImageProcessor.detectImageType(buffer);

    const dimensions = ImageProcessor.getImageDimensions(buffer);

    logger.debug("[ImageLoader] Loaded image from path", {
      path: filePath,
      size: buffer.byteLength,
      mimeType,
      dimensions,
    });

    return {
      id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text: generateTextDescription(filePath),
      image: buffer,
      mimeType,
      metadata: {
        source: filePath,
        width: dimensions?.width,
        height: dimensions?.height,
        format: ext.replace(".", ""),
        size: buffer.byteLength,
        ...options.metadata,
      },
    };
  }

  /**
   * Load an image from a URL.
   */
  private async loadFromURL(
    url: string,
    options: Required<ImageLoaderOptions>,
  ): Promise<ImageDocument> {
    const buffer = await safeDownload(url, {
      maxBytes: options.maxImageSize,
      label: "RAG image",
      timeoutMs: options.fetchTimeout,
    });

    const mimeType = ImageProcessor.detectImageType(buffer);

    const dimensions = ImageProcessor.getImageDimensions(buffer);

    logger.debug("[ImageLoader] Loaded image from URL", {
      url: redactUrlForError(url),
      size: buffer.byteLength,
      mimeType,
      dimensions,
    });

    return {
      id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text: generateTextDescription(url),
      image: buffer,
      mimeType,
      metadata: {
        // Redacted for the same reason as the caption above: `source` is
        // persisted into the vector store and returned verbatim to the model
        // as the RAG tool's citation, so a signed URL stored here outlives the
        // request that fetched it.
        source: redactUrlForError(url),
        width: dimensions?.width,
        height: dimensions?.height,
        format: mimeType.split("/").at(1),
        size: buffer.byteLength,
        ...options.metadata,
      },
    };
  }

  /**
   * Load an image directly from a Buffer.
   */
  loadFromBuffer(
    buffer: Buffer,
    mimeType: string,
    source?: string,
    options?: Partial<ImageLoaderOptions>,
  ): ImageDocument {
    const opts = { ...this.options, ...options };

    if (buffer.byteLength > opts.maxImageSize) {
      throw new Error(
        `Image size (${buffer.byteLength} bytes) exceeds maximum (${opts.maxImageSize} bytes)`,
      );
    }

    const dimensions = ImageProcessor.getImageDimensions(buffer);

    return {
      id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text: generateTextDescription(source ?? "inline-image"),
      image: buffer,
      mimeType,
      metadata: {
        source: source ?? "inline",
        width: dimensions?.width,
        height: dimensions?.height,
        format: mimeType.split("/").at(1),
        size: buffer.byteLength,
        ...opts.metadata,
      },
    };
  }

  /**
   * Check if a file path or extension is a supported image format.
   */
  static isImageFile(source: string): boolean {
    const ext = extname(source).toLowerCase().replace(/^\./, "");
    return VALID_IMAGE_EXTENSIONS.includes(ext);
  }

  /**
   * Get the MIME type for a file extension.
   */
  static getMimeType(filePath: string): string | undefined {
    const ext = extname(filePath).toLowerCase();
    return EXTENSION_MIME_MAP[ext];
  }
}
