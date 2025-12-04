import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  validateFileSize,
  validateFileSizes,
} from "../../../src/lib/utils/messageBuilder.js";
import * as fs from "fs";

// Mock the fs module
vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs")>();
  return {
    ...actual,
    existsSync: vi.fn(),
    statSync: vi.fn(),
    readFileSync: actual.readFileSync,
  };
});

describe("File Size Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("validateFileSize", () => {
    it("should pass for Buffer smaller than max size", () => {
      const smallBuffer = Buffer.alloc(1024); // 1KB
      expect(() => validateFileSize(smallBuffer, 10 * 1024)).not.toThrow();
    });

    it("should throw for Buffer larger than max size", () => {
      const largeBuffer = Buffer.alloc(20 * 1024); // 20KB
      expect(() => validateFileSize(largeBuffer, 10 * 1024)).toThrow(
        /exceeds maximum allowed size/,
      );
    });

    it("should include file size and max size in error message", () => {
      const largeBuffer = Buffer.alloc(15 * 1024 * 1024); // 15MB
      expect(() => validateFileSize(largeBuffer, 10 * 1024 * 1024)).toThrow(
        /15\.00 MB.*10\.00 MB/,
      );
    });

    it("should include filename in error message when provided", () => {
      const largeBuffer = Buffer.alloc(15 * 1024 * 1024);
      expect(() =>
        validateFileSize(largeBuffer, 10 * 1024 * 1024, "test.pdf"),
      ).toThrow(/File "test.pdf"/);
    });

    it("should validate file paths using statSync", () => {
      const mockExistsSync = vi.mocked(fs.existsSync);
      const mockStatSync = vi.mocked(fs.statSync);

      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockReturnValue({ size: 5 * 1024 } as fs.Stats);

      expect(() =>
        validateFileSize("/path/to/small-file.csv", 10 * 1024),
      ).not.toThrow();

      expect(mockExistsSync).toHaveBeenCalledWith("/path/to/small-file.csv");
      expect(mockStatSync).toHaveBeenCalledWith("/path/to/small-file.csv");
    });

    it("should throw for file paths larger than max size", () => {
      const mockExistsSync = vi.mocked(fs.existsSync);
      const mockStatSync = vi.mocked(fs.statSync);

      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockReturnValue({ size: 100 * 1024 * 1024 } as fs.Stats); // 100MB

      expect(() =>
        validateFileSize("/path/to/large-file.pdf", 50 * 1024 * 1024),
      ).toThrow(/exceeds maximum allowed size/);
    });

    it("should skip validation for URLs (checked during download)", () => {
      expect(() =>
        validateFileSize("https://example.com/file.pdf", 10 * 1024),
      ).not.toThrow();
      expect(() =>
        validateFileSize("http://example.com/file.pdf", 10 * 1024),
      ).not.toThrow();
    });

    it("should validate data URIs based on base64 content", () => {
      // Small data URI (less than 1KB)
      const smallDataUri = `data:text/plain;base64,${Buffer.from("small").toString("base64")}`;
      expect(() => validateFileSize(smallDataUri, 1024)).not.toThrow();

      // Large data URI - create a buffer larger than the limit
      const largeContent = "x".repeat(2000);
      const largeDataUri = `data:text/plain;base64,${Buffer.from(largeContent).toString("base64")}`;
      expect(() => validateFileSize(largeDataUri, 1024)).toThrow(
        /exceeds maximum allowed size/,
      );
    });

    it("should use default max size of 50MB when not specified", () => {
      const buffer = Buffer.alloc(40 * 1024 * 1024); // 40MB
      expect(() => validateFileSize(buffer)).not.toThrow();

      const largeBuffer = Buffer.alloc(60 * 1024 * 1024); // 60MB
      expect(() => validateFileSize(largeBuffer)).toThrow(
        /exceeds maximum allowed size/,
      );
    });

    it("should handle non-existent file paths gracefully", () => {
      const mockExistsSync = vi.mocked(fs.existsSync);
      mockExistsSync.mockReturnValue(false);

      // Should not throw - validation deferred to processing which will fail
      expect(() =>
        validateFileSize("/path/to/nonexistent.pdf", 10 * 1024),
      ).not.toThrow();
    });
  });

  describe("validateFileSizes", () => {
    it("should validate all files in array", () => {
      const files = [
        Buffer.alloc(1024),
        Buffer.alloc(2048),
        Buffer.alloc(3072),
      ];
      expect(() => validateFileSizes(files, 10 * 1024)).not.toThrow();
    });

    it("should throw on first oversized file (fail fast)", () => {
      const files = [
        Buffer.alloc(1024), // OK
        Buffer.alloc(20 * 1024), // Too large
        Buffer.alloc(1024), // OK
      ];
      expect(() => validateFileSizes(files, 10 * 1024)).toThrow(
        /exceeds maximum allowed size/,
      );
    });

    it("should handle empty array", () => {
      expect(() => validateFileSizes([], 10 * 1024)).not.toThrow();
    });

    it("should handle mixed file types (Buffers, paths, URLs)", () => {
      const mockExistsSync = vi.mocked(fs.existsSync);
      const mockStatSync = vi.mocked(fs.statSync);

      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockReturnValue({ size: 5 * 1024 } as fs.Stats);

      const files = [
        Buffer.alloc(1024),
        "/path/to/file.csv",
        "https://example.com/file.pdf", // URLs skip size check
      ];

      expect(() => validateFileSizes(files, 10 * 1024)).not.toThrow();
    });

    it("should use default max size of 50MB when not specified", () => {
      const files = [Buffer.alloc(40 * 1024 * 1024)];
      expect(() => validateFileSizes(files)).not.toThrow();
    });

    it("should extract filename from path for error messages", () => {
      const mockExistsSync = vi.mocked(fs.existsSync);
      const mockStatSync = vi.mocked(fs.statSync);

      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockReturnValue({ size: 100 * 1024 * 1024 } as fs.Stats);

      expect(() =>
        validateFileSizes(["/path/to/large-file.pdf"], 10 * 1024 * 1024),
      ).toThrow(/large-file\.pdf/);
    });
  });
});
