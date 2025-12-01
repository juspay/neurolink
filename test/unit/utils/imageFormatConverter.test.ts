/**
 * Tests for ImageFormatConverter and ImageProcessor format conversion
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ImageProcessor,
  ImageFormatConverter,
} from "../../../src/lib/utils/imageProcessor.js";

describe("ImageFormatConverter", () => {
  describe("requiresConversion", () => {
    it("should return true for HEIC format", () => {
      expect(ImageFormatConverter.requiresConversion("image/heic")).toBe(true);
    });

    it("should return true for HEIF format", () => {
      expect(ImageFormatConverter.requiresConversion("image/heif")).toBe(true);
    });

    it("should return true for TIFF format", () => {
      expect(ImageFormatConverter.requiresConversion("image/tiff")).toBe(true);
    });

    it("should return false for JPEG format", () => {
      expect(ImageFormatConverter.requiresConversion("image/jpeg")).toBe(false);
    });

    it("should return false for PNG format", () => {
      expect(ImageFormatConverter.requiresConversion("image/png")).toBe(false);
    });

    it("should return false for WebP format", () => {
      expect(ImageFormatConverter.requiresConversion("image/webp")).toBe(false);
    });

    it("should be case-insensitive", () => {
      expect(ImageFormatConverter.requiresConversion("IMAGE/HEIC")).toBe(true);
      expect(ImageFormatConverter.requiresConversion("Image/Tiff")).toBe(true);
    });
  });

  describe("getDefaultOutputFormat", () => {
    it("should return jpeg for HEIC", () => {
      expect(ImageFormatConverter.getDefaultOutputFormat("image/heic")).toBe(
        "jpeg",
      );
    });

    it("should return jpeg for HEIF", () => {
      expect(ImageFormatConverter.getDefaultOutputFormat("image/heif")).toBe(
        "jpeg",
      );
    });

    it("should return png for TIFF", () => {
      expect(ImageFormatConverter.getDefaultOutputFormat("image/tiff")).toBe(
        "png",
      );
    });

    it("should return jpeg as fallback for unknown formats", () => {
      expect(ImageFormatConverter.getDefaultOutputFormat("image/unknown")).toBe(
        "jpeg",
      );
    });
  });

  describe("isAvailable", () => {
    it("should return a boolean", async () => {
      const result = await ImageFormatConverter.isAvailable();
      expect(typeof result).toBe("boolean");
    });
  });

  describe("convert", () => {
    it("should throw error when sharp is not available and conversion is attempted", async () => {
      // Create a minimal invalid buffer that sharp cannot process
      const invalidBuffer = Buffer.from([0x00, 0x00, 0x00, 0x00]);

      // We expect either a "sharp not available" error or a processing error
      await expect(
        ImageFormatConverter.convert(invalidBuffer, "image/heic"),
      ).rejects.toThrow();
    });
  });
});

describe("ImageProcessor", () => {
  describe("detectImageType", () => {
    describe("filename extension detection", () => {
      it("should detect HEIC from filename", () => {
        expect(ImageProcessor.detectImageType("photo.heic")).toBe("image/heic");
      });

      it("should detect HEIF from filename", () => {
        expect(ImageProcessor.detectImageType("photo.heif")).toBe("image/heif");
      });

      it("should detect TIFF from filename", () => {
        expect(ImageProcessor.detectImageType("photo.tiff")).toBe("image/tiff");
      });

      it("should detect TIF from filename", () => {
        expect(ImageProcessor.detectImageType("photo.tif")).toBe("image/tiff");
      });

      it("should handle case-insensitive extensions", () => {
        expect(ImageProcessor.detectImageType("photo.HEIC")).toBe("image/heic");
        expect(ImageProcessor.detectImageType("photo.Tiff")).toBe("image/tiff");
      });
    });

    describe("magic bytes detection", () => {
      it("should detect TIFF from little-endian magic bytes", () => {
        // TIFF little-endian: 49 49 2A 00
        const buffer = Buffer.from([0x49, 0x49, 0x2a, 0x00]);
        expect(ImageProcessor.detectImageType(buffer)).toBe("image/tiff");
      });

      it("should detect TIFF from big-endian magic bytes", () => {
        // TIFF big-endian: 4D 4D 00 2A
        const buffer = Buffer.from([0x4d, 0x4d, 0x00, 0x2a]);
        expect(ImageProcessor.detectImageType(buffer)).toBe("image/tiff");
      });

      it("should detect HEIC from ftyp box with heic brand", () => {
        // ftyp box: size (4 bytes) + "ftyp" + "heic"
        const buffer = Buffer.alloc(12);
        buffer.writeUInt32BE(12, 0); // size
        buffer.write("ftyp", 4); // type
        buffer.write("heic", 8); // brand
        expect(ImageProcessor.detectImageType(buffer)).toBe("image/heic");
      });

      it("should detect HEIC from ftyp box with heix brand", () => {
        const buffer = Buffer.alloc(12);
        buffer.writeUInt32BE(12, 0);
        buffer.write("ftyp", 4);
        buffer.write("heix", 8);
        expect(ImageProcessor.detectImageType(buffer)).toBe("image/heic");
      });

      it("should detect HEIF from ftyp box with mif1 brand", () => {
        const buffer = Buffer.alloc(12);
        buffer.writeUInt32BE(12, 0);
        buffer.write("ftyp", 4);
        buffer.write("mif1", 8);
        expect(ImageProcessor.detectImageType(buffer)).toBe("image/heif");
      });

      it("should detect PNG from magic bytes", () => {
        const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
        expect(ImageProcessor.detectImageType(buffer)).toBe("image/png");
      });

      it("should detect JPEG from magic bytes", () => {
        const buffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
        expect(ImageProcessor.detectImageType(buffer)).toBe("image/jpeg");
      });
    });
  });

  describe("process", () => {
    it("should process a PNG buffer without conversion", async () => {
      // Create a minimal valid PNG (actually just the header for detection)
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ]);

      const result = await ImageProcessor.process(pngBuffer);

      expect(result.type).toBe("image");
      expect(result.mimeType).toBe("image/png");
      expect(typeof result.content).toBe("string");
      expect(
        (result.content as string).startsWith("data:image/png;base64,"),
      ).toBe(true);
    });

    it("should process a JPEG buffer without conversion", async () => {
      // JPEG magic bytes
      const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);

      const result = await ImageProcessor.process(jpegBuffer);

      expect(result.type).toBe("image");
      expect(result.mimeType).toBe("image/jpeg");
      expect(
        (result.content as string).startsWith("data:image/jpeg;base64,"),
      ).toBe(true);
    });

    it("should include metadata in result", async () => {
      const buffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);

      const result = await ImageProcessor.process(buffer);

      expect(result.metadata.confidence).toBe(100);
      expect(result.metadata.size).toBe(buffer.length);
    });

    it("should respect autoConvert=false option", async () => {
      // TIFF magic bytes
      const tiffBuffer = Buffer.from([0x49, 0x49, 0x2a, 0x00]);

      const result = await ImageProcessor.process(tiffBuffer, {
        conversion: { autoConvert: false },
      });

      // Should not attempt conversion, just return the TIFF as-is
      expect(result.mimeType).toBe("image/tiff");
    });
  });
});
