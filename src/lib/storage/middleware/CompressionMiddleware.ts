/**
 * CompressionMiddleware - Data Compression Layer for Storage
 *
 * Provides transparent compression/decompression of data before storage
 * and after retrieval. Supports multiple compression algorithms.
 *
 * Features:
 * - gzip compression (default)
 * - deflate compression
 * - brotli compression
 * - Configurable compression level
 * - Minimum size threshold
 *
 * @module CompressionMiddleware
 * @since 9.0.0
 */

import {
  gzipSync,
  gunzipSync,
  deflateSync,
  inflateSync,
  brotliCompressSync,
  brotliDecompressSync,
  constants,
} from "zlib";
import { logger } from "../../utils/logger.js";
import { createErrorFactory } from "../../core/infrastructure/baseError.js";
import type {
  StorageMiddleware,
  CompressionMiddlewareConfig,
} from "../../types/index.js";
import type { JsonValue } from "../../types/index.js";
import type {
  StorageCompressionAlgorithm,
  StorageCompressedPayload,
  StorageCompressionStats,
} from "../../types/index.js";

// =============================================================================
// Error Factory
// =============================================================================

const CompressionErrors = createErrorFactory("CompressionMiddleware", {
  COMPRESSION_FAILED: "COMPRESSION_FAILED",
  DECOMPRESSION_FAILED: "DECOMPRESSION_FAILED",
  INVALID_CONFIG: "COMPRESSION_INVALID_CONFIG",
});

// =============================================================================
// CompressionMiddleware Class
// =============================================================================

/**
 * Compression middleware for storage operations
 *
 * @example
 * ```typescript
 * const compression = new CompressionMiddleware({
 *   algorithm: 'gzip',
 *   level: 6,
 *   minSize: 1024 // Only compress data > 1KB
 * });
 *
 * factory.addMiddleware(compression);
 * ```
 */
export class CompressionMiddleware implements StorageMiddleware {
  readonly name = "compression";
  readonly priority = 30; // Run after encryption

  private algorithm: StorageCompressionAlgorithm;
  private level: number;
  private minSize: number;
  private initialized = false;

  // Statistics
  private compressed = 0;
  private skipped = 0;
  private totalOriginalSize = 0;
  private totalCompressedSize = 0;

  constructor(config: CompressionMiddlewareConfig = {}) {
    this.algorithm =
      (config.algorithm as StorageCompressionAlgorithm) || "gzip";
    this.level = config.level ?? 6;
    this.minSize = config.minSize ?? 1024; // 1KB default

    // Validate configuration
    if (this.level < 1 || this.level > 9) {
      throw CompressionErrors.create(
        "INVALID_CONFIG",
        "Compression level must be between 1 and 9",
      );
    }

    // Note: lz4 requires external package, use gzip as fallback
    if (this.algorithm === "lz4") {
      logger.warn(
        "CompressionMiddleware: lz4 not available, falling back to gzip",
      );
      this.algorithm = "gzip";
    }
  }

  /**
   * Initialize the middleware
   */
  async init(): Promise<void> {
    this.initialized = true;
    logger.debug(
      `CompressionMiddleware: Initialized with ${this.algorithm} level ${this.level}`,
    );
  }

  /**
   * Destroy the middleware
   */
  async destroy(): Promise<void> {
    this.initialized = false;
    this.compressed = 0;
    this.skipped = 0;
    this.totalOriginalSize = 0;
    this.totalCompressedSize = 0;
    logger.debug("CompressionMiddleware: Destroyed");
  }

  /**
   * Compress data before storage write
   */
  async beforeWrite(key: string, value: JsonValue): Promise<JsonValue> {
    if (!this.initialized) {
      throw CompressionErrors.create(
        "COMPRESSION_FAILED",
        "Middleware not initialized",
      );
    }

    try {
      const jsonString = JSON.stringify(value);
      const originalSize = Buffer.byteLength(jsonString, "utf8");

      // Skip if below minimum size
      if (originalSize < this.minSize) {
        this.skipped++;
        return value;
      }

      const compressed = this.compress(jsonString);
      const compressedSize = compressed.length;

      // Only use compression if it actually reduces size
      if (compressedSize >= originalSize) {
        this.skipped++;
        return value;
      }

      this.compressed++;
      this.totalOriginalSize += originalSize;
      this.totalCompressedSize += compressedSize;

      const payload: StorageCompressedPayload = {
        __compressed: true,
        algorithm: this.algorithm,
        data: compressed.toString("base64"),
        originalSize,
        compressedSize,
      };

      return payload as unknown as JsonValue;
    } catch (error) {
      throw CompressionErrors.create(
        "COMPRESSION_FAILED",
        `Failed to compress data for key ${key}: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error instanceof Error ? error : undefined },
      );
    }
  }

  /**
   * Decompress data after storage read
   */
  async afterRead(key: string, value: JsonValue): Promise<JsonValue> {
    if (!this.initialized) {
      throw CompressionErrors.create(
        "DECOMPRESSION_FAILED",
        "Middleware not initialized",
      );
    }

    // Check if data is compressed
    if (!this.isStorageCompressedPayload(value)) {
      return value;
    }

    try {
      const payload = value as unknown as StorageCompressedPayload;
      const compressed = Buffer.from(payload.data, "base64");
      const decompressed = this.decompress(compressed, payload.algorithm);
      return JSON.parse(decompressed.toString("utf8"));
    } catch (error) {
      throw CompressionErrors.create(
        "DECOMPRESSION_FAILED",
        `Failed to decompress data for key ${key}: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error instanceof Error ? error : undefined },
      );
    }
  }

  /**
   * Compress data using the configured algorithm
   */
  private compress(data: string): Buffer {
    const input = Buffer.from(data, "utf8");

    switch (this.algorithm) {
      case "gzip":
        return gzipSync(input, { level: this.level });

      case "deflate":
        return deflateSync(input, { level: this.level });

      case "brotli":
        return brotliCompressSync(input, {
          params: {
            [constants.BROTLI_PARAM_QUALITY]: this.level,
          },
        });

      default:
        throw CompressionErrors.create(
          "COMPRESSION_FAILED",
          `Unsupported algorithm: ${this.algorithm}`,
        );
    }
  }

  /**
   * Decompress data
   */
  private decompress(
    data: Buffer,
    algorithm: StorageCompressionAlgorithm,
  ): Buffer {
    switch (algorithm) {
      case "gzip":
        return gunzipSync(data);

      case "deflate":
        return inflateSync(data);

      case "brotli":
        return brotliDecompressSync(data);

      default:
        throw CompressionErrors.create(
          "DECOMPRESSION_FAILED",
          `Unsupported algorithm: ${algorithm}`,
        );
    }
  }

  /**
   * Check if value is a compressed payload
   */
  private isStorageCompressedPayload(
    value: unknown,
  ): value is StorageCompressedPayload {
    return (
      typeof value === "object" &&
      value !== null &&
      "__compressed" in value &&
      (value as StorageCompressedPayload).__compressed === true
    );
  }

  /**
   * Get compression statistics
   */
  getStats(): StorageCompressionStats {
    return {
      compressed: this.compressed,
      skipped: this.skipped,
      totalOriginalSize: this.totalOriginalSize,
      totalCompressedSize: this.totalCompressedSize,
      compressionRatio:
        this.totalOriginalSize > 0
          ? 1 - this.totalCompressedSize / this.totalOriginalSize
          : 0,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.compressed = 0;
    this.skipped = 0;
    this.totalOriginalSize = 0;
    this.totalCompressedSize = 0;
  }

  /**
   * Test compression ratio for given data
   */
  testCompression(data: JsonValue): {
    original: number;
    compressed: number;
    ratio: number;
    wouldCompress: boolean;
  } {
    const jsonString = JSON.stringify(data);
    const original = Buffer.byteLength(jsonString, "utf8");

    if (original < this.minSize) {
      return {
        original,
        compressed: original,
        ratio: 0,
        wouldCompress: false,
      };
    }

    const compressedBuffer = this.compress(jsonString);
    const compressed = compressedBuffer.length;

    return {
      original,
      compressed,
      ratio: 1 - compressed / original,
      wouldCompress: compressed < original,
    };
  }

  /**
   * Get the configured algorithm
   */
  getAlgorithm(): StorageCompressionAlgorithm {
    return this.algorithm;
  }

  /**
   * Get the configured compression level
   */
  getLevel(): number {
    return this.level;
  }

  /**
   * Get the minimum size threshold
   */
  getMinSize(): number {
    return this.minSize;
  }
}

/**
 * Create a compression middleware instance
 */
export function createCompressionMiddleware(
  config?: CompressionMiddlewareConfig,
): CompressionMiddleware {
  return new CompressionMiddleware(config);
}
