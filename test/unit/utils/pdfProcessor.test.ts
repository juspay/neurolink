/**
 * PDFProcessor Unit Tests
 *
 * Tests for PDF validation and processing, including:
 * - PDF-006: Comprehensive structure validation
 * - Signature validation
 * - Trailer marker validation
 * - EOF marker validation
 * - Encryption detection
 * - Error handling for corrupted/truncated PDFs
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { PDFProcessor } from "../../../src/lib/utils/pdfProcessor.js";
import { logger } from "../../../src/lib/utils/logger.js";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Mock the logger
vi.mock("../../../src/lib/utils/logger.js", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Helper to load test fixtures
const fixturesPath = join(process.cwd(), "test", "fixtures");

describe("PDFProcessor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("validatePDFStructure", () => {
    it("should validate a complete, valid PDF", async () => {
      const pdfPath = join(fixturesPath, "valid-sample.pdf");
      const buffer = await readFile(pdfPath);

      const result = PDFProcessor.validatePDFStructure(buffer);

      expect(result.valid).toBe(true);
      expect(result.encrypted).toBe(false);
      expect(result.truncated).toBe(false);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject file with no PDF signature", () => {
      const buffer = Buffer.from("This is not a PDF file");

      const result = PDFProcessor.validatePDFStructure(buffer);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Invalid PDF signature - file must start with %PDF-",
      );
    });

    it("should reject file that is too small", () => {
      const buffer = Buffer.from("%PDF");

      const result = PDFProcessor.validatePDFStructure(buffer);

      expect(result.valid).toBe(false);
      expect(result.truncated).toBe(true);
      expect(result.errors).toContain(
        "File too small to be a valid PDF (< 5 bytes)",
      );
    });

    it("should detect missing trailer marker", async () => {
      const pdfPath = join(fixturesPath, "no-trailer.pdf");
      const buffer = await readFile(pdfPath);

      const result = PDFProcessor.validatePDFStructure(buffer);

      expect(result.valid).toBe(false);
      expect(result.truncated).toBe(true);
      expect(result.errors).toContain(
        "Missing PDF trailer marker - file may be corrupted",
      );
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Missing trailer marker"),
      );
    });

    it("should detect missing EOF marker", async () => {
      const pdfPath = join(fixturesPath, "truncated-no-eof.pdf");
      const buffer = await readFile(pdfPath);

      const result = PDFProcessor.validatePDFStructure(buffer);

      expect(result.valid).toBe(false);
      expect(result.truncated).toBe(true);
      expect(result.errors).toContain(
        "Missing %%EOF marker - file may be truncated",
      );
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Missing %%EOF marker"),
      );
    });

    it("should detect encrypted PDFs", async () => {
      const pdfPath = join(fixturesPath, "encrypted.pdf");
      const buffer = await readFile(pdfPath);

      const result = PDFProcessor.validatePDFStructure(buffer);

      expect(result.encrypted).toBe(true);
      expect(result.errors).toContain(
        "PDF is encrypted - may require password for processing",
      );
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Encrypted PDF detected"),
      );
    });

    it("should detect header-only PDFs as truncated", async () => {
      const pdfPath = join(fixturesPath, "header-only.pdf");
      const buffer = await readFile(pdfPath);

      const result = PDFProcessor.validatePDFStructure(buffer);

      expect(result.valid).toBe(false);
      expect(result.truncated).toBe(true);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.includes("trailer"))).toBe(true);
      expect(result.errors.some((e) => e.includes("%%EOF"))).toBe(true);
    });

    it("should report multiple structural issues", async () => {
      const pdfPath = join(fixturesPath, "header-only.pdf");
      const buffer = await readFile(pdfPath);

      const result = PDFProcessor.validatePDFStructure(buffer);

      expect(result.errors.length).toBeGreaterThanOrEqual(2);
      expect(result.errors.some((e) => e.includes("trailer"))).toBe(true);
      expect(result.errors.some((e) => e.includes("%%EOF"))).toBe(true);
    });
  });

  describe("process", () => {
    it("should successfully process valid PDF", async () => {
      const pdfPath = join(fixturesPath, "valid-sample.pdf");
      const buffer = await readFile(pdfPath);

      const result = await PDFProcessor.process(buffer, {
        provider: "openai",
      });

      expect(result.type).toBe("pdf");
      expect(result.mimeType).toBe("application/pdf");
      expect(result.content).toBe(buffer);
    });

    it("should reject header-only PDF", async () => {
      const pdfPath = join(fixturesPath, "header-only.pdf");
      const buffer = await readFile(pdfPath);

      await expect(
        PDFProcessor.process(buffer, { provider: "openai" }),
      ).rejects.toThrow(/Invalid PDF file format/);
    });

    it("should reject PDF without trailer", async () => {
      const pdfPath = join(fixturesPath, "no-trailer.pdf");
      const buffer = await readFile(pdfPath);

      await expect(
        PDFProcessor.process(buffer, { provider: "openai" }),
      ).rejects.toThrow(/Invalid PDF file format/);
    });

    it("should reject truncated PDF without EOF", async () => {
      const pdfPath = join(fixturesPath, "truncated-no-eof.pdf");
      const buffer = await readFile(pdfPath);

      await expect(
        PDFProcessor.process(buffer, { provider: "openai" }),
      ).rejects.toThrow(/Invalid PDF file format/);
    });

    it("should detect and warn about encrypted PDF but allow processing", async () => {
      const pdfPath = join(fixturesPath, "encrypted.pdf");
      const buffer = await readFile(pdfPath);

      // Encrypted PDFs should be accepted but with warnings
      const result = await PDFProcessor.process(buffer, { provider: "openai" });

      expect(result.type).toBe("pdf");
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Encrypted PDF detected"),
      );
    });

    it("should provide detailed error messages", async () => {
      const pdfPath = join(fixturesPath, "truncated-no-eof.pdf");
      const buffer = await readFile(pdfPath);

      try {
        await PDFProcessor.process(buffer, { provider: "openai" });
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        const errorMessage = (error as Error).message;
        expect(errorMessage).toContain("Invalid PDF file format");
        expect(errorMessage.length).toBeGreaterThan(30);
      }
    });

    it("should reject invalid PDF with no signature", async () => {
      const pdfPath = join(fixturesPath, "invalid.pdf");
      const buffer = await readFile(pdfPath);

      await expect(
        PDFProcessor.process(buffer, { provider: "openai" }),
      ).rejects.toThrow(/Invalid PDF file format/);
    });

    it("should log detailed validation warnings", async () => {
      const pdfPath = join(fixturesPath, "truncated-no-eof.pdf");
      const buffer = await readFile(pdfPath);

      try {
        await PDFProcessor.process(buffer, { provider: "openai" });
      } catch {
        // Expected to throw
      }

      // Should log both individual warnings and a summary
      expect(logger.warn).toHaveBeenCalled();
      const calls = (logger.warn as unknown as { mock: { calls: unknown[][] } })
        .mock.calls;
      const warningMessages = calls.map((call: unknown[]) => call[0] as string);

      // Should have warnings about the issues
      expect(
        warningMessages.some(
          (msg: string) =>
            msg.includes("trailer") ||
            msg.includes("EOF") ||
            msg.includes("validation issues"),
        ),
      ).toBe(true);
    });
  });

  describe("regression tests", () => {
    it("should continue to work with valid multi-page PDFs", async () => {
      const pdfPath = join(fixturesPath, "multi-page.pdf");
      const buffer = await readFile(pdfPath);

      const result = await PDFProcessor.process(buffer, {
        provider: "openai",
      });

      expect(result.type).toBe("pdf");
      expect(result.mimeType).toBe("application/pdf");
    });

    it("should maintain backward compatibility with existing validation", async () => {
      const pdfPath = join(fixturesPath, "valid-sample.pdf");
      const buffer = await readFile(pdfPath);

      // Old behavior: checking only the first 5 bytes
      const hasSignature = buffer.subarray(0, 5).equals(Buffer.from("%PDF-"));
      expect(hasSignature).toBe(true);

      // New behavior: comprehensive validation
      const validation = PDFProcessor.validatePDFStructure(buffer);
      expect(validation.valid).toBe(true);
    });

    it("should not break existing provider configurations", async () => {
      const pdfPath = join(fixturesPath, "valid-sample.pdf");
      const buffer = await readFile(pdfPath);

      const providers = ["openai", "anthropic", "vertex", "bedrock"];

      for (const provider of providers) {
        const result = await PDFProcessor.process(buffer, { provider });
        expect(result.type).toBe("pdf");
      }
    });
  });

  describe("edge cases", () => {
    it("should handle PDF with EOF marker not at the very end", async () => {
      // Some PDFs have whitespace or comments after %%EOF
      const pdfWithTrailingContent = Buffer.concat([
        await readFile(join(fixturesPath, "valid-sample.pdf")),
        Buffer.from("\n\n"),
      ]);

      const result = PDFProcessor.validatePDFStructure(pdfWithTrailingContent);

      // Should still be valid since we check last 1024 bytes
      expect(result.valid).toBe(true);
      expect(result.truncated).toBe(false);
    });

    it("should handle very small PDFs correctly", () => {
      const tinyPdf = Buffer.from("%PDF-1.4");

      const result = PDFProcessor.validatePDFStructure(tinyPdf);

      expect(result.valid).toBe(false);
      expect(result.truncated).toBe(true);
    });

    it("should handle binary content without text markers", () => {
      const binaryBuffer = Buffer.from([
        0x25,
        0x50,
        0x44,
        0x46,
        0x2d, // %PDF-
        0x00,
        0x01,
        0x02,
        0x03,
        0x04, // Binary content
      ]);

      const result = PDFProcessor.validatePDFStructure(binaryBuffer);

      expect(result.valid).toBe(false);
      expect(result.truncated).toBe(true);
    });
  });
});
