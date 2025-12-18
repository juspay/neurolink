import { describe, it, expect, vi, beforeEach } from "vitest";
import { ImageProcessor } from "../../../src/lib/utils/imageProcessor.js";
import { logger } from "../../../src/lib/utils/logger.js";

// Mock the logger
vi.mock("../../../src/lib/utils/logger.js", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("ImageProcessor - Buffer Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Empty buffer validation", () => {
    it("should throw error for empty buffer (0 bytes)", async () => {
      const emptyBuffer = Buffer.alloc(0);

      await expect(ImageProcessor.process(emptyBuffer)).rejects.toThrow(
        "Invalid image: buffer is empty (0 bytes)",
      );

      expect(logger.error).toHaveBeenCalledWith(
        "Empty buffer provided for image processing",
      );
    });

    it("should provide helpful error message for empty buffer", async () => {
      const emptyBuffer = Buffer.alloc(0);

      await expect(ImageProcessor.process(emptyBuffer)).rejects.toThrow(
        /Please provide a valid image file/,
      );
    });
  });

  describe("Small buffer validation (< 12 bytes)", () => {
    it("should throw error for 1-byte buffer", async () => {
      const smallBuffer = Buffer.from([0xff]);

      await expect(ImageProcessor.process(smallBuffer)).rejects.toThrow(
        "Invalid image: buffer is too small (1 bytes). Minimum 12 bytes required for format detection.",
      );

      expect(logger.error).toHaveBeenCalledWith(
        "Buffer too small for format detection: 1 bytes",
        expect.objectContaining({
          bufferSize: 1,
          minimumRequired: 12,
        }),
      );
    });

    it("should throw error for 5-byte buffer", async () => {
      const smallBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);

      await expect(ImageProcessor.process(smallBuffer)).rejects.toThrow(
        "Invalid image: buffer is too small (5 bytes)",
      );
    });

    it("should throw error for 11-byte buffer (just below minimum)", async () => {
      const smallBuffer = Buffer.alloc(11);

      await expect(ImageProcessor.process(smallBuffer)).rejects.toThrow(
        "Invalid image: buffer is too small (11 bytes). Minimum 12 bytes required for format detection.",
      );
    });
  });

  describe("Format-specific minimum size validation", () => {
    it("should throw error for PNG buffer smaller than 67 bytes", async () => {
      // Valid PNG header but too small overall
      const pngHeader = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      ]);
      const smallPngBuffer = Buffer.concat([pngHeader, Buffer.alloc(50)]);

      await expect(ImageProcessor.process(smallPngBuffer)).rejects.toThrow(
        /Invalid image: buffer is too small \(\d+ bytes\) for image\/png. Minimum 67 bytes required/,
      );

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("Buffer too small for detected format"),
        expect.objectContaining({
          detectedFormat: "image/png",
          minimumRequired: 67,
        }),
      );
    });

    it("should throw error for JPEG buffer smaller than 125 bytes", async () => {
      // Valid JPEG header but too small overall
      const jpegHeader = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      ]);
      const smallJpegBuffer = Buffer.concat([jpegHeader, Buffer.alloc(100)]);

      await expect(ImageProcessor.process(smallJpegBuffer)).rejects.toThrow(
        /Invalid image: buffer is too small \(\d+ bytes\) for image\/jpeg. Minimum 125 bytes required/,
      );
    });

    it("should throw error for GIF buffer smaller than 43 bytes", async () => {
      // Valid GIF header but too small overall
      const gifHeader = Buffer.from([
        0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00,
      ]);
      const smallGifBuffer = Buffer.concat([gifHeader, Buffer.alloc(20)]);

      await expect(ImageProcessor.process(smallGifBuffer)).rejects.toThrow(
        /Invalid image: buffer is too small \(\d+ bytes\) for image\/gif. Minimum 43 bytes required/,
      );
    });

    it("should throw error for WebP buffer smaller than 20 bytes", async () => {
      // Valid WebP header but too small overall (12 bytes exactly - at minimum detection size)
      const webpBuffer = Buffer.from([
        0x52,
        0x49,
        0x46,
        0x46, // "RIFF"
        0x00,
        0x00,
        0x00,
        0x00, // Size placeholder
        0x57,
        0x45,
        0x42,
        0x50, // "WEBP"
      ]);

      await expect(ImageProcessor.process(webpBuffer)).rejects.toThrow(
        /Invalid image: buffer is too small \(12 bytes\) for image\/webp. Minimum 20 bytes required/,
      );
    });

    it("should throw error for AVIF buffer smaller than 100 bytes", async () => {
      // Valid AVIF header but too small overall
      const avifBuffer = Buffer.from([
        0x00,
        0x00,
        0x00,
        0x20, // Box size
        0x66,
        0x74,
        0x79,
        0x70, // "ftyp"
        0x61,
        0x76,
        0x69,
        0x66, // "avif"
        ...Array(80).fill(0x00), // Padding to reach 92 bytes (still below 100)
      ]);

      await expect(ImageProcessor.process(avifBuffer)).rejects.toThrow(
        /Invalid image: buffer is too small \(\d+ bytes\) for image\/avif. Minimum 100 bytes required/,
      );
    });
  });

  describe("Valid buffer sizes", () => {
    it("should accept buffer that meets minimum size for unrecognized format", async () => {
      // Create a buffer that will be detected as default JPEG (fallback)
      // but doesn't match any specific format signatures.
      // Since it defaults to JPEG, it needs to be at least 125 bytes
      const genericBuffer = Buffer.from([
        0x00,
        0x01,
        0x02,
        0x03,
        0x04,
        0x05,
        0x06,
        0x07,
        0x08,
        0x09,
        0x0a,
        0x0b,
        ...Array(113).fill(0x00), // Total: 125 bytes
      ]);

      // This should pass validation since it meets JPEG minimum
      const result = await ImageProcessor.process(genericBuffer);
      expect(result).toBeDefined();
      expect(result.type).toBe("image");
      expect(result.mimeType).toBe("image/jpeg"); // Falls back to JPEG
    });

    it("should accept PNG buffer at minimum valid size (67 bytes)", async () => {
      // Create a minimal valid PNG (1x1 transparent pixel)
      const minimalPng = Buffer.from([
        // PNG signature
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        // IHDR chunk
        0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01,
        0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
        0x89,
        // IDAT chunk
        0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00,
        0x01, 0x00, 0x00, 0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4,
        // IEND chunk
        0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
      ]);

      const result = await ImageProcessor.process(minimalPng);
      expect(result).toBeDefined();
      expect(result.type).toBe("image");
      expect(result.mimeType).toBe("image/png");
      expect(result.content).toMatch(/^data:image\/png;base64,/);
    });

    it("should accept JPEG buffer at minimum valid size (125 bytes)", async () => {
      // Create a valid JPEG header with sufficient bytes
      const minimalJpeg = Buffer.concat([
        Buffer.from([
          // SOI marker
          0xff, 0xd8,
          // APP0 marker (JFIF)
          0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01,
          0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
          // SOF0 marker
          0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01,
          0x11, 0x00,
          // DHT marker (Huffman table placeholder)
          0xff, 0xc4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08,
          // More DHT
          0xff, 0xc4, 0x00, 0x14, 0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          // SOS marker
          0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00,
          // Compressed image data
          0xd2, 0xcf, 0x20,
          // EOI marker
          0xff, 0xd9,
        ]), // 92 bytes
        // Padding to reach exactly 125 bytes (need 33 more)
        Buffer.alloc(33, 0x00),
      ]);

      expect(minimalJpeg.length).toBe(125); // Verify size
      const result = await ImageProcessor.process(minimalJpeg);
      expect(result).toBeDefined();
      expect(result.type).toBe("image");
      expect(result.mimeType).toBe("image/jpeg");
    });

    it("should accept GIF buffer at minimum valid size (43 bytes)", async () => {
      // Minimal valid GIF (1x1 pixel)
      const minimalGif = Buffer.concat([
        Buffer.from([
          // Header
          0x47,
          0x49,
          0x46,
          0x38,
          0x39,
          0x61, // "GIF89a"
          // Logical screen descriptor
          0x01,
          0x00,
          0x01,
          0x00,
          0x80,
          0x00,
          0x00,
          // Global color table (2 colors)
          0xff,
          0xff,
          0xff,
          0x00,
          0x00,
          0x00,
          // Image descriptor
          0x2c,
          0x00,
          0x00,
          0x00,
          0x00,
          0x01,
          0x00,
          0x01,
          0x00,
          0x00,
          // Image data
          0x02,
          0x02,
          0x4c,
          0x01,
          0x00,
          // Trailer
          0x3b,
        ]), // 35 bytes
        // Padding to reach 43 bytes (need 8 more)
        Buffer.alloc(8, 0x00),
      ]);

      expect(minimalGif.length).toBe(43); // Verify size
      const result = await ImageProcessor.process(minimalGif);
      expect(result).toBeDefined();
      expect(result.type).toBe("image");
      expect(result.mimeType).toBe("image/gif");
    });

    it("should accept buffer larger than minimum requirements", async () => {
      // Create a valid PNG with more than minimum size
      const largePng = Buffer.from([
        // PNG signature
        0x89,
        0x50,
        0x4e,
        0x47,
        0x0d,
        0x0a,
        0x1a,
        0x0a,
        // IHDR chunk
        0x00,
        0x00,
        0x00,
        0x0d,
        0x49,
        0x48,
        0x44,
        0x52,
        0x00,
        0x00,
        0x00,
        0x01,
        0x00,
        0x00,
        0x00,
        0x01,
        0x08,
        0x06,
        0x00,
        0x00,
        0x00,
        0x1f,
        0x15,
        0xc4,
        0x89,
        // IDAT chunk
        0x00,
        0x00,
        0x00,
        0x0a,
        0x49,
        0x44,
        0x41,
        0x54,
        0x78,
        0x9c,
        0x63,
        0x00,
        0x01,
        0x00,
        0x00,
        0x05,
        0x00,
        0x01,
        0x0d,
        0x0a,
        0x2d,
        0xb4,
        // IEND chunk
        0x00,
        0x00,
        0x00,
        0x00,
        0x49,
        0x45,
        0x4e,
        0x44,
        0xae,
        0x42,
        0x60,
        0x82,
        // Extra padding to make it larger
        ...Array(100).fill(0x00),
      ]);

      const result = await ImageProcessor.process(largePng);
      expect(result).toBeDefined();
      expect(result.type).toBe("image");
      expect(result.mimeType).toBe("image/png");
      expect(result.metadata.size).toBeGreaterThan(67);
    });
  });

  describe("Error message quality", () => {
    it("should provide clear error message with actual and required sizes", async () => {
      const smallBuffer = Buffer.alloc(5);

      try {
        await ImageProcessor.process(smallBuffer);
        expect.fail("Should have thrown an error");
      } catch (error) {
        const errorMessage = (error as Error).message;
        expect(errorMessage).toContain("5 bytes");
        expect(errorMessage).toContain("12 bytes required");
      }
    });

    it("should log error with detailed context for debugging", async () => {
      const smallBuffer = Buffer.alloc(8);

      await expect(ImageProcessor.process(smallBuffer)).rejects.toThrow();

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("Buffer too small"),
        expect.objectContaining({
          bufferSize: 8,
          minimumRequired: 12,
        }),
      );
    });

    it("should provide format-specific error with detected format name", async () => {
      const pngHeader = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      ]);
      const smallPngBuffer = Buffer.concat([pngHeader, Buffer.alloc(50)]);

      try {
        await ImageProcessor.process(smallPngBuffer);
        expect.fail("Should have thrown an error");
      } catch (error) {
        const errorMessage = (error as Error).message;
        expect(errorMessage).toContain("image/png");
        expect(errorMessage).toContain("67 bytes required");
      }
    });
  });

  describe("Integration with existing validation", () => {
    it("should work with existing validateProcessOutput checks", async () => {
      // Create a valid PNG that passes buffer validation
      const validPng = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
        0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
        0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
      ]);

      const result = await ImageProcessor.process(validPng);

      // Should have valid data URI format
      expect(result.content).toMatch(
        /^data:image\/png;base64,[A-Za-z0-9+/]+=*$/,
      );
      // Should have correct MIME type
      expect(result.mimeType).toBe("image/png");
      // Should include metadata
      expect(result.metadata).toBeDefined();
      expect(result.metadata.size).toBe(validPng.length);
    });

    it("should validate buffer before attempting base64 conversion", async () => {
      const emptyBuffer = Buffer.alloc(0);

      // Should throw buffer validation error, not base64 conversion error
      await expect(ImageProcessor.process(emptyBuffer)).rejects.toThrow(
        /buffer is empty/,
      );

      // Should not get to the point of trying to convert to base64
      expect(logger.error).toHaveBeenCalledWith(
        "Empty buffer provided for image processing",
      );
    });
  });
});
