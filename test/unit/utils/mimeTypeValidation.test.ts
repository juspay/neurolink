import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  VALID_IMAGE_MIME_TYPES,
  isValidImageMimeType,
  getValidatedMimeType,
} from "../../../src/lib/utils/messageBuilder.js";

// Mock the logger
vi.mock("../../../src/lib/utils/logger.js", () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("MIME Type Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("VALID_IMAGE_MIME_TYPES", () => {
    it("should contain common image MIME types", () => {
      expect(VALID_IMAGE_MIME_TYPES).toContain("image/jpeg");
      expect(VALID_IMAGE_MIME_TYPES).toContain("image/png");
      expect(VALID_IMAGE_MIME_TYPES).toContain("image/gif");
      expect(VALID_IMAGE_MIME_TYPES).toContain("image/webp");
    });

    it("should contain additional supported image formats", () => {
      expect(VALID_IMAGE_MIME_TYPES).toContain("image/bmp");
      expect(VALID_IMAGE_MIME_TYPES).toContain("image/tiff");
      expect(VALID_IMAGE_MIME_TYPES).toContain("image/svg+xml");
      expect(VALID_IMAGE_MIME_TYPES).toContain("image/avif");
      expect(VALID_IMAGE_MIME_TYPES).toContain("image/heic");
      expect(VALID_IMAGE_MIME_TYPES).toContain("image/heif");
    });

    it("should be a readonly array", () => {
      // TypeScript enforces this at compile time with `as const`
      expect(Array.isArray(VALID_IMAGE_MIME_TYPES)).toBe(true);
    });
  });

  describe("isValidImageMimeType", () => {
    it("should return true for valid MIME types", () => {
      expect(isValidImageMimeType("image/jpeg")).toBe(true);
      expect(isValidImageMimeType("image/png")).toBe(true);
      expect(isValidImageMimeType("image/gif")).toBe(true);
      expect(isValidImageMimeType("image/webp")).toBe(true);
      expect(isValidImageMimeType("image/bmp")).toBe(true);
      expect(isValidImageMimeType("image/tiff")).toBe(true);
      expect(isValidImageMimeType("image/svg+xml")).toBe(true);
      expect(isValidImageMimeType("image/avif")).toBe(true);
      expect(isValidImageMimeType("image/heic")).toBe(true);
      expect(isValidImageMimeType("image/heif")).toBe(true);
    });

    it("should return false for invalid MIME types", () => {
      expect(isValidImageMimeType("image/invalid-format")).toBe(false);
      expect(isValidImageMimeType("image/foo")).toBe(false);
      expect(isValidImageMimeType("text/plain")).toBe(false);
      expect(isValidImageMimeType("application/pdf")).toBe(false);
      expect(isValidImageMimeType("")).toBe(false);
      expect(isValidImageMimeType("image")).toBe(false);
      expect(isValidImageMimeType("jpeg")).toBe(false);
    });

    it("should be case-sensitive", () => {
      expect(isValidImageMimeType("IMAGE/JPEG")).toBe(false);
      expect(isValidImageMimeType("Image/Png")).toBe(false);
      expect(isValidImageMimeType("IMAGE/PNG")).toBe(false);
    });
  });

  describe("getValidatedMimeType", () => {
    it("should return valid MIME type unchanged", () => {
      expect(getValidatedMimeType("image/jpeg")).toBe("image/jpeg");
      expect(getValidatedMimeType("image/png")).toBe("image/png");
      expect(getValidatedMimeType("image/gif")).toBe("image/gif");
      expect(getValidatedMimeType("image/webp")).toBe("image/webp");
    });

    it("should return default fallback for invalid MIME type", async () => {
      const { logger } = await import("../../../src/lib/utils/logger.js");

      const result = getValidatedMimeType("image/invalid-format");

      expect(result).toBe("image/jpeg");
      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          'Invalid image MIME type "image/invalid-format"',
        ),
      );
    });

    it("should use custom fallback when provided", async () => {
      const { logger } = await import("../../../src/lib/utils/logger.js");

      const result = getValidatedMimeType("image/foo", "image/png");

      expect(result).toBe("image/png");
      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Falling back to "image/png"'),
      );
    });

    it("should log supported formats in warning", async () => {
      const { logger } = await import("../../../src/lib/utils/logger.js");

      getValidatedMimeType("image/invalid");

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Supported formats:"),
      );
    });

    it("should not log warning for valid MIME types", async () => {
      const { logger } = await import("../../../src/lib/utils/logger.js");

      getValidatedMimeType("image/jpeg");
      getValidatedMimeType("image/png");
      getValidatedMimeType("image/webp");

      expect(logger.warn).not.toHaveBeenCalled();
    });

    it("should handle edge cases", async () => {
      const { logger } = await import("../../../src/lib/utils/logger.js");

      // Empty string
      expect(getValidatedMimeType("")).toBe("image/jpeg");
      expect(logger.warn).toHaveBeenCalled();

      vi.clearAllMocks();

      // Non-image MIME type
      expect(getValidatedMimeType("text/plain")).toBe("image/jpeg");
      expect(logger.warn).toHaveBeenCalled();

      vi.clearAllMocks();

      // Malformed MIME type
      expect(getValidatedMimeType("image/")).toBe("image/jpeg");
      expect(logger.warn).toHaveBeenCalled();
    });

    it("should handle MIME types from data URIs", async () => {
      const { logger } = await import("../../../src/lib/utils/logger.js");

      // Simulate extracting MIME type from data:image/invalid-format;base64,...
      const extractedMimeType = "image/invalid-format";
      const result = getValidatedMimeType(extractedMimeType);

      expect(result).toBe("image/jpeg");
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          'Invalid image MIME type "image/invalid-format"',
        ),
      );
    });
  });
});
