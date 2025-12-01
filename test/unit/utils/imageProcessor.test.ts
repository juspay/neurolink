import { describe, it, expect } from "vitest";
import {
  imageUtils,
  VALID_IMAGE_EXTENSIONS,
} from "../../../src/lib/utils/imageProcessor.js";

describe("Image Extension Validation (IMG-021)", () => {
  describe("VALID_IMAGE_EXTENSIONS constant", () => {
    it("should contain common image extensions", () => {
      expect(VALID_IMAGE_EXTENSIONS).toContain("jpg");
      expect(VALID_IMAGE_EXTENSIONS).toContain("jpeg");
      expect(VALID_IMAGE_EXTENSIONS).toContain("png");
      expect(VALID_IMAGE_EXTENSIONS).toContain("gif");
      expect(VALID_IMAGE_EXTENSIONS).toContain("webp");
      expect(VALID_IMAGE_EXTENSIONS).toContain("svg");
      expect(VALID_IMAGE_EXTENSIONS).toContain("avif");
    });

    it("should be a non-empty array", () => {
      expect(VALID_IMAGE_EXTENSIONS.length).toBeGreaterThan(0);
    });

    it("should contain only lowercase extensions", () => {
      for (const ext of VALID_IMAGE_EXTENSIONS) {
        expect(ext).toBe(ext.toLowerCase());
      }
    });
  });

  describe("isValidImageExtension", () => {
    describe("valid extensions", () => {
      it("should accept lowercase valid extensions", () => {
        expect(imageUtils.isValidImageExtension("jpg")).toBe(true);
        expect(imageUtils.isValidImageExtension("jpeg")).toBe(true);
        expect(imageUtils.isValidImageExtension("png")).toBe(true);
        expect(imageUtils.isValidImageExtension("gif")).toBe(true);
        expect(imageUtils.isValidImageExtension("webp")).toBe(true);
        expect(imageUtils.isValidImageExtension("bmp")).toBe(true);
        expect(imageUtils.isValidImageExtension("svg")).toBe(true);
        expect(imageUtils.isValidImageExtension("avif")).toBe(true);
      });

      it("should accept uppercase extensions (case-insensitive)", () => {
        expect(imageUtils.isValidImageExtension("JPG")).toBe(true);
        expect(imageUtils.isValidImageExtension("JPEG")).toBe(true);
        expect(imageUtils.isValidImageExtension("PNG")).toBe(true);
        expect(imageUtils.isValidImageExtension("GIF")).toBe(true);
      });

      it("should accept mixed-case extensions (case-insensitive)", () => {
        expect(imageUtils.isValidImageExtension("Jpg")).toBe(true);
        expect(imageUtils.isValidImageExtension("JpEg")).toBe(true);
        expect(imageUtils.isValidImageExtension("pNg")).toBe(true);
      });
    });

    describe("invalid extensions", () => {
      it("should reject extensions not in whitelist", () => {
        expect(imageUtils.isValidImageExtension("exe")).toBe(false);
        expect(imageUtils.isValidImageExtension("txt")).toBe(false);
        expect(imageUtils.isValidImageExtension("pdf")).toBe(false);
        expect(imageUtils.isValidImageExtension("doc")).toBe(false);
        expect(imageUtils.isValidImageExtension("html")).toBe(false);
      });

      it("should reject extensions with special characters", () => {
        expect(imageUtils.isValidImageExtension("jpg!")).toBe(false);
        expect(imageUtils.isValidImageExtension("png@")).toBe(false);
        expect(imageUtils.isValidImageExtension("gif#")).toBe(false);
        expect(imageUtils.isValidImageExtension("webp$")).toBe(false);
        expect(imageUtils.isValidImageExtension("bmp%")).toBe(false);
        expect(imageUtils.isValidImageExtension("svg^")).toBe(false);
      });

      it("should reject extensions with dots", () => {
        expect(imageUtils.isValidImageExtension(".jpg")).toBe(false);
        expect(imageUtils.isValidImageExtension("jpg.")).toBe(false);
        expect(imageUtils.isValidImageExtension("j.pg")).toBe(false);
      });

      it("should reject extensions with slashes", () => {
        expect(imageUtils.isValidImageExtension("jpg/png")).toBe(false);
        expect(imageUtils.isValidImageExtension("/jpg")).toBe(false);
        expect(imageUtils.isValidImageExtension("jpg\\png")).toBe(false);
      });

      it("should reject extensions with spaces", () => {
        expect(imageUtils.isValidImageExtension("jp g")).toBe(false);
        expect(imageUtils.isValidImageExtension(" jpg")).toBe(false);
        expect(imageUtils.isValidImageExtension("jpg ")).toBe(false);
      });

      it("should reject extensions with dashes or underscores", () => {
        expect(imageUtils.isValidImageExtension("jpg-png")).toBe(false);
        expect(imageUtils.isValidImageExtension("jpg_png")).toBe(false);
      });

      it("should reject empty or null-like values", () => {
        expect(imageUtils.isValidImageExtension("")).toBe(false);
        // @ts-expect-error Testing null input
        expect(imageUtils.isValidImageExtension(null)).toBe(false);
        // @ts-expect-error Testing undefined input
        expect(imageUtils.isValidImageExtension(undefined)).toBe(false);
      });
    });
  });

  describe("getFileExtension", () => {
    describe("valid filenames", () => {
      it("should extract extension from simple filename", () => {
        expect(imageUtils.getFileExtension("image.jpg")).toBe("jpg");
        expect(imageUtils.getFileExtension("photo.png")).toBe("png");
        expect(imageUtils.getFileExtension("animation.gif")).toBe("gif");
      });

      it("should normalize extension to lowercase", () => {
        expect(imageUtils.getFileExtension("image.JPG")).toBe("jpg");
        expect(imageUtils.getFileExtension("photo.PNG")).toBe("png");
        expect(imageUtils.getFileExtension("animation.GIF")).toBe("gif");
      });

      it("should handle paths with directories", () => {
        expect(imageUtils.getFileExtension("/path/to/image.jpg")).toBe("jpg");
        expect(imageUtils.getFileExtension("C:\\path\\to\\photo.png")).toBe(
          "png",
        );
      });

      it("should handle filenames with multiple dots", () => {
        expect(imageUtils.getFileExtension("my.photo.jpg")).toBe("jpg");
        expect(imageUtils.getFileExtension("file.v2.backup.png")).toBe("png");
      });

      it("should handle URLs with extensions", () => {
        expect(
          imageUtils.getFileExtension("https://example.com/image.jpg"),
        ).toBe("jpg");
        expect(
          imageUtils.getFileExtension("http://example.com/path/to/photo.png"),
        ).toBe("png");
      });
    });

    describe("invalid or no extension", () => {
      it("should return null for filenames without extension", () => {
        expect(imageUtils.getFileExtension("noextension")).toBe(null);
        expect(imageUtils.getFileExtension("/path/to/noextension")).toBe(null);
      });

      it("should reject extensions with special characters", () => {
        expect(imageUtils.getFileExtension("file.jpg!")).toBe(null);
        expect(imageUtils.getFileExtension("file.png@exe")).toBe(null);
        expect(imageUtils.getFileExtension("file.gif#")).toBe(null);
      });

      it("should handle edge cases", () => {
        expect(imageUtils.getFileExtension("")).toBe(null);
        expect(imageUtils.getFileExtension(".")).toBe(null);
        expect(imageUtils.getFileExtension("..")).toBe(null);
      });
    });
  });

  describe("getValidatedImageExtension", () => {
    describe("valid image files", () => {
      it("should return extension for valid image filenames", () => {
        expect(imageUtils.getValidatedImageExtension("photo.jpg")).toBe("jpg");
        expect(imageUtils.getValidatedImageExtension("image.png")).toBe("png");
        expect(imageUtils.getValidatedImageExtension("animation.gif")).toBe(
          "gif",
        );
        expect(imageUtils.getValidatedImageExtension("modern.webp")).toBe(
          "webp",
        );
      });

      it("should handle case-insensitive matching", () => {
        expect(imageUtils.getValidatedImageExtension("photo.JPG")).toBe("jpg");
        expect(imageUtils.getValidatedImageExtension("photo.Jpeg")).toBe(
          "jpeg",
        );
        expect(imageUtils.getValidatedImageExtension("photo.PNG")).toBe("png");
      });
    });

    describe("non-image files", () => {
      it("should return null for non-image extensions", () => {
        expect(imageUtils.getValidatedImageExtension("document.pdf")).toBe(
          null,
        );
        expect(imageUtils.getValidatedImageExtension("script.exe")).toBe(null);
        expect(imageUtils.getValidatedImageExtension("data.txt")).toBe(null);
        expect(imageUtils.getValidatedImageExtension("page.html")).toBe(null);
      });
    });

    describe("malicious extensions", () => {
      it("should accept last extension in double extension files", () => {
        // getFileExtension returns last extension, getValidatedImageExtension validates it
        const result = imageUtils.getValidatedImageExtension("malware.exe.jpg");
        // Returns 'jpg' since the last extension is valid
        expect(result).toBe("jpg");
      });

      it("should reject extensions with path traversal attempts", () => {
        expect(
          imageUtils.getValidatedImageExtension("file.../../../etc/passwd"),
        ).toBe(null);
      });

      it("should reject extensions with null bytes", () => {
        expect(imageUtils.getValidatedImageExtension("file.jpg\x00.exe")).toBe(
          null,
        );
      });
    });
  });
});
