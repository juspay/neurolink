import { describe, it, expect } from "vitest";
import { imageUtils } from "../../../src/lib/utils/imageProcessor.js";

describe("imageUtils.isValidBase64", () => {
  describe("small strings (full validation)", () => {
    it("should return true for valid base64 string", () => {
      const validBase64 = Buffer.from("Hello, World!").toString("base64");
      expect(imageUtils.isValidBase64(validBase64)).toBe(true);
    });

    it("should return true for valid base64 with data URI prefix", () => {
      const base64 = Buffer.from("Hello, World!").toString("base64");
      const dataUri = `data:text/plain;base64,${base64}`;
      expect(imageUtils.isValidBase64(dataUri)).toBe(true);
    });

    it("should return true for empty string", () => {
      expect(imageUtils.isValidBase64("")).toBe(true);
    });

    it("should return false for invalid base64 characters", () => {
      expect(imageUtils.isValidBase64("Invalid@Base64$String!")).toBe(false);
    });

    it("should return false for invalid base64 (corrupted)", () => {
      // This is not valid base64 encoding
      expect(imageUtils.isValidBase64("!!!")).toBe(false);
    });

    it("should handle base64 with padding", () => {
      // "a" encodes to "YQ==" (with padding)
      expect(imageUtils.isValidBase64("YQ==")).toBe(true);
      // "ab" encodes to "YWI=" (with padding)
      expect(imageUtils.isValidBase64("YWI=")).toBe(true);
      // "abc" encodes to "YWJj" (no padding)
      expect(imageUtils.isValidBase64("YWJj")).toBe(true);
    });

    it("should handle base64 with whitespace", () => {
      const base64 = Buffer.from("Hello").toString("base64");
      const base64WithWhitespace = base64.slice(0, 2) + " " + base64.slice(2);
      expect(imageUtils.isValidBase64(base64WithWhitespace)).toBe(true);
    });
  });

  describe("large strings (sampling validation - >100KB)", () => {
    it("should return true for valid large base64 string", () => {
      // Create a large valid base64 string (>100KB)
      const largeBuffer = Buffer.alloc(100 * 1024 + 1, "A"); // 100KB + 1 byte
      const largeBase64 = largeBuffer.toString("base64");
      expect(imageUtils.isValidBase64(largeBase64)).toBe(true);
    });

    it("should return true for valid large base64 with data URI prefix", () => {
      const largeBuffer = Buffer.alloc(100 * 1024 + 1, "B");
      const largeBase64 = largeBuffer.toString("base64");
      const dataUri = `data:application/octet-stream;base64,${largeBase64}`;
      expect(imageUtils.isValidBase64(dataUri)).toBe(true);
    });

    it("should return false for large base64 with invalid first chunk", () => {
      // Create a large string that starts with invalid characters
      const validPart = Buffer.alloc(100 * 1024, "A").toString("base64");
      const invalidStart = "!!!!" + validPart.slice(4);
      expect(imageUtils.isValidBase64(invalidStart)).toBe(false);
    });

    it("should return false for large base64 with invalid middle chunk", () => {
      // Create a large valid base64 and corrupt the middle
      const largeBuffer = Buffer.alloc(200 * 1024, "C");
      let largeBase64 = largeBuffer.toString("base64");
      // Corrupt middle section (replace chars with invalid ones)
      const middleIndex = Math.floor(largeBase64.length / 2);
      largeBase64 =
        largeBase64.slice(0, middleIndex) +
        "@@@@" +
        largeBase64.slice(middleIndex + 4);
      expect(imageUtils.isValidBase64(largeBase64)).toBe(false);
    });

    it("should return false for large base64 with invalid last chunk", () => {
      // Create a large valid base64 and corrupt the end
      const largeBuffer = Buffer.alloc(150 * 1024, "D");
      let largeBase64 = largeBuffer.toString("base64");
      // Corrupt last section
      largeBase64 = largeBase64.slice(0, -4) + "!!!!";
      expect(imageUtils.isValidBase64(largeBase64)).toBe(false);
    });

    it("should handle very large base64 strings efficiently", () => {
      // Create a very large valid base64 string (1MB)
      const veryLargeBuffer = Buffer.alloc(1024 * 1024, "E");
      const veryLargeBase64 = veryLargeBuffer.toString("base64");

      const startTime = Date.now();
      const result = imageUtils.isValidBase64(veryLargeBase64);
      const duration = Date.now() - startTime;

      expect(result).toBe(true);
      // Should complete in reasonable time (sampling should be fast)
      expect(duration).toBeLessThan(100); // Less than 100ms for 1MB
    });
  });
});

describe("imageUtils.validateBase64Chunks", () => {
  it("should validate first, middle, and last chunks", () => {
    const largeBuffer = Buffer.alloc(200 * 1024, "F");
    const largeBase64 = largeBuffer.toString("base64");
    expect(imageUtils.validateBase64Chunks(largeBase64, 1024)).toBe(true);
  });

  it("should return false for invalid chunk size", () => {
    const validBase64 = Buffer.from("test").toString("base64");
    // Chunk size of 1 results in aligned chunk size of 0
    expect(imageUtils.validateBase64Chunks(validBase64, 1)).toBe(false);
  });

  it("should handle chunk size alignment to 4", () => {
    const largeBuffer = Buffer.alloc(150 * 1024, "G");
    const largeBase64 = largeBuffer.toString("base64");
    // Non-aligned chunk size should be rounded down
    expect(imageUtils.validateBase64Chunks(largeBase64, 1025)).toBe(true);
  });
});

describe("imageUtils.validateSingleChunk", () => {
  it("should return true for valid base64 chunk", () => {
    const validChunk = Buffer.from("test").toString("base64");
    expect(imageUtils.validateSingleChunk(validChunk)).toBe(true);
  });

  it("should return false for invalid base64 chunk", () => {
    expect(imageUtils.validateSingleChunk("!!!invalid!!!")).toBe(false);
  });

  it("should handle base64 with padding", () => {
    expect(imageUtils.validateSingleChunk("YQ==")).toBe(true);
    expect(imageUtils.validateSingleChunk("YWI=")).toBe(true);
    expect(imageUtils.validateSingleChunk("YWJj")).toBe(true);
  });
});

describe("imageUtils.isBase64 (alias)", () => {
  it("should be an alias for isValidBase64", () => {
    const validBase64 = Buffer.from("Hello").toString("base64");
    expect(imageUtils.isBase64(validBase64)).toBe(
      imageUtils.isValidBase64(validBase64),
    );
  });
});
