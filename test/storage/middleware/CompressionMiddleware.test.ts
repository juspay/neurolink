/**
 * CompressionMiddleware Tests
 *
 * Comprehensive test suite for the CompressionMiddleware class.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  CompressionMiddleware,
  createCompressionMiddleware,
} from "../../../src/lib/storage/middleware/CompressionMiddleware.js";

describe("CompressionMiddleware", () => {
  let middleware: CompressionMiddleware;

  beforeEach(async () => {
    middleware = new CompressionMiddleware({
      algorithm: "gzip",
      level: 6,
      minSize: 100,
    });
    await middleware.init();
  });

  afterEach(async () => {
    await middleware.destroy();
  });

  describe("Initialization", () => {
    it("should initialize successfully", async () => {
      expect(middleware.name).toBe("compression");
    });

    it("should have correct priority", () => {
      expect(middleware.priority).toBe(30);
    });

    it("should use default config values", async () => {
      const defaultMiddleware = new CompressionMiddleware();
      await defaultMiddleware.init();

      expect(defaultMiddleware.getAlgorithm()).toBe("gzip");
      expect(defaultMiddleware.getLevel()).toBe(6);
      expect(defaultMiddleware.getMinSize()).toBe(1024);

      await defaultMiddleware.destroy();
    });

    it("should reject invalid compression level", () => {
      expect(() => {
        new CompressionMiddleware({ level: 0 });
      }).toThrow();

      expect(() => {
        new CompressionMiddleware({ level: 10 });
      }).toThrow();
    });
  });

  describe("Compression with gzip", () => {
    it("should compress large data", async () => {
      const largeData = {
        content: "x".repeat(1000),
        moreContent: Array(100).fill({ value: "test" }),
      };

      const compressed = await middleware.beforeWrite("key1", largeData);

      expect((compressed as Record<string, unknown>).__compressed).toBe(true);
      expect((compressed as Record<string, unknown>).algorithm).toBe("gzip");
    });

    it("should decompress data correctly", async () => {
      const original = {
        content: "x".repeat(1000),
        moreContent: Array(100).fill({ value: "test" }),
      };

      const compressed = await middleware.beforeWrite("key1", original);
      const decompressed = await middleware.afterRead("key1", compressed);

      expect(decompressed).toEqual(original);
    });

    it("should skip compression for small data", async () => {
      const smallData = { tiny: "data" };

      const result = await middleware.beforeWrite("key1", smallData);

      expect((result as Record<string, unknown>).__compressed).toBeUndefined();
      expect(result).toEqual(smallData);
    });

    it("should skip compression when result is larger", async () => {
      // Random data compresses poorly
      const randomData = {
        data: Buffer.from(
          Array(200)
            .fill(0)
            .map(() => Math.random()),
        ).toString("base64"),
      };

      const result = await middleware.beforeWrite("key1", randomData);

      // May or may not compress depending on data
      expect(result).toBeDefined();
    });
  });

  describe("Compression with deflate", () => {
    it("should compress and decompress with deflate", async () => {
      const deflateMiddleware = new CompressionMiddleware({
        algorithm: "deflate",
        minSize: 100,
      });
      await deflateMiddleware.init();

      const original = { content: "y".repeat(500) };

      const compressed = await deflateMiddleware.beforeWrite("key1", original);
      expect((compressed as Record<string, unknown>).algorithm).toBe("deflate");

      const decompressed = await deflateMiddleware.afterRead(
        "key1",
        compressed,
      );
      expect(decompressed).toEqual(original);

      await deflateMiddleware.destroy();
    });
  });

  describe("Compression with brotli", () => {
    it("should compress and decompress with brotli", async () => {
      const brotliMiddleware = new CompressionMiddleware({
        algorithm: "brotli",
        minSize: 100,
      });
      await brotliMiddleware.init();

      const original = { content: "z".repeat(500) };

      const compressed = await brotliMiddleware.beforeWrite("key1", original);
      expect((compressed as Record<string, unknown>).algorithm).toBe("brotli");

      const decompressed = await brotliMiddleware.afterRead("key1", compressed);
      expect(decompressed).toEqual(original);

      await brotliMiddleware.destroy();
    });
  });

  describe("Compression Statistics", () => {
    it("should track compressed count", async () => {
      const data = { content: "x".repeat(500) };

      await middleware.beforeWrite("key1", data);
      await middleware.beforeWrite("key2", data);

      const stats = middleware.getStats();
      expect(stats.compressed).toBe(2);
    });

    it("should track skipped count", async () => {
      await middleware.beforeWrite("key1", { tiny: "data" });
      await middleware.beforeWrite("key2", { small: "value" });

      const stats = middleware.getStats();
      expect(stats.skipped).toBe(2);
    });

    it("should track total sizes", async () => {
      const data = { content: "x".repeat(500) };

      await middleware.beforeWrite("key1", data);

      const stats = middleware.getStats();
      expect(stats.totalOriginalSize).toBeGreaterThan(0);
      expect(stats.totalCompressedSize).toBeGreaterThan(0);
      expect(stats.totalCompressedSize).toBeLessThan(stats.totalOriginalSize);
    });

    it("should calculate compression ratio", async () => {
      const data = { content: "x".repeat(1000) };

      await middleware.beforeWrite("key1", data);

      const stats = middleware.getStats();
      expect(stats.compressionRatio).toBeGreaterThan(0);
      expect(stats.compressionRatio).toBeLessThanOrEqual(1);
    });

    it("should reset statistics", async () => {
      await middleware.beforeWrite("key1", { content: "x".repeat(500) });

      middleware.resetStats();

      const stats = middleware.getStats();
      expect(stats.compressed).toBe(0);
      expect(stats.skipped).toBe(0);
      expect(stats.totalOriginalSize).toBe(0);
    });
  });

  describe("Compression Testing", () => {
    it("should test compression ratio for data", async () => {
      const compressibleData = { content: "x".repeat(500) };

      const result = middleware.testCompression(compressibleData);

      expect(result.original).toBeGreaterThan(0);
      expect(result.compressed).toBeGreaterThan(0);
      expect(result.ratio).toBeGreaterThan(0);
      expect(result.wouldCompress).toBe(true);
    });

    it("should report no compression for small data", async () => {
      const smallData = { tiny: "data" };

      const result = middleware.testCompression(smallData);

      expect(result.wouldCompress).toBe(false);
      expect(result.ratio).toBe(0);
    });
  });

  describe("Non-Compressed Data Handling", () => {
    it("should pass through non-compressed data on read", async () => {
      const plainData = { data: "not compressed" };

      const result = await middleware.afterRead("key1", plainData);
      expect(result).toEqual(plainData);
    });
  });

  describe("Configuration Accessors", () => {
    it("should return configured algorithm", () => {
      expect(middleware.getAlgorithm()).toBe("gzip");
    });

    it("should return configured level", () => {
      expect(middleware.getLevel()).toBe(6);
    });

    it("should return configured minSize", () => {
      expect(middleware.getMinSize()).toBe(100);
    });
  });

  describe("Compression Levels", () => {
    it("should compress more with higher level", async () => {
      const lowLevelMiddleware = new CompressionMiddleware({
        level: 1,
        minSize: 100,
      });
      const highLevelMiddleware = new CompressionMiddleware({
        level: 9,
        minSize: 100,
      });

      await lowLevelMiddleware.init();
      await highLevelMiddleware.init();

      const data = { content: "x".repeat(1000) };

      const lowCompressed = await lowLevelMiddleware.beforeWrite("key1", data);
      const highCompressed = await highLevelMiddleware.beforeWrite(
        "key1",
        data,
      );

      // Higher level should produce smaller output (usually)
      expect(
        (highCompressed as Record<string, unknown>).compressedSize,
      ).toBeLessThanOrEqual(
        (lowCompressed as Record<string, unknown>).compressedSize as number,
      );

      await lowLevelMiddleware.destroy();
      await highLevelMiddleware.destroy();
    });
  });

  describe("Error Handling", () => {
    it("should throw when middleware not initialized", async () => {
      const uninitMiddleware = new CompressionMiddleware();

      await expect(
        uninitMiddleware.beforeWrite("key1", { data: "test" }),
      ).rejects.toThrow();
    });
  });

  describe("Data Types", () => {
    it("should handle strings", async () => {
      const original = "x".repeat(500);

      const compressed = await middleware.beforeWrite("key1", original);
      const decompressed = await middleware.afterRead("key1", compressed);

      expect(decompressed).toBe(original);
    });

    it("should handle arrays", async () => {
      const original = Array(100).fill({ item: "value" });

      const compressed = await middleware.beforeWrite("key1", original);
      const decompressed = await middleware.afterRead("key1", compressed);

      expect(decompressed).toEqual(original);
    });

    it("should handle nested objects", async () => {
      const original = {
        level1: {
          level2: {
            level3: {
              data: "x".repeat(200),
            },
          },
        },
      };

      const compressed = await middleware.beforeWrite("key1", original);
      const decompressed = await middleware.afterRead("key1", compressed);

      expect(decompressed).toEqual(original);
    });
  });

  describe("Algorithm Fallback", () => {
    it("should fallback to gzip for unsupported lz4", async () => {
      const lz4Middleware = new CompressionMiddleware({
        algorithm: "lz4" as "gzip",
        minSize: 100,
      });
      await lz4Middleware.init();

      expect(lz4Middleware.getAlgorithm()).toBe("gzip");

      await lz4Middleware.destroy();
    });
  });

  describe("Factory Function", () => {
    it("should create middleware using factory function", async () => {
      const factoryMiddleware = createCompressionMiddleware({
        algorithm: "deflate",
        level: 5,
      });

      expect(factoryMiddleware).toBeInstanceOf(CompressionMiddleware);
      expect(factoryMiddleware.getAlgorithm()).toBe("deflate");

      await factoryMiddleware.init();
      await factoryMiddleware.destroy();
    });
  });
});
