import { describe, it, expect, vi, beforeEach } from "vitest";
import { PDFProcessor } from "../../../src/lib/utils/pdfProcessor.js";
import { logger } from "../../../src/lib/utils/logger.js";
import { NeuroLinkError } from "../../../src/lib/utils/errorHandling.js";

// Mock the logger
vi.mock("../../../src/lib/utils/logger.js", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("PDFProcessor.process", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Helper to create a minimal valid PDF buffer with specified page count
   * The extractBasicMetadata function counts `/Type /Page` occurrences (not `/Type /Pages`)
   * so we need to include that many page object references
   */
  const createPdfWithPageCount = (pageCount: number): Buffer => {
    // Build page objects - each /Type /Page entry counts as a page
    let pageObjects = "";
    for (let i = 0; i < pageCount; i++) {
      pageObjects += `/Type /Page `;
    }
    const pdfContent =
      `%PDF-1.4\n` +
      `1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj ` +
      `2 0 obj<</Type/Pages/Count ${pageCount}/Kids[]>>endobj ` +
      `${pageObjects}\n` +
      `xref\n0 3\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n` +
      `trailer<</Size 3/Root 1 0 R>>\nstartxref\n150\n%%EOF`;
    return Buffer.from(pdfContent);
  };

  describe("page limit enforcement", () => {
    it("should succeed for PDF under page limit", async () => {
      const pdfBuffer = createPdfWithPageCount(50);

      const result = await PDFProcessor.process(pdfBuffer, {
        provider: "openai",
      });

      expect(result.type).toBe("pdf");
      expect(result.mimeType).toBe("application/pdf");
      expect(logger.info).toHaveBeenCalledWith(
        "[PDF] ✅ Validated PDF file",
        expect.objectContaining({
          provider: "openai",
        }),
      );
    });

    it("should succeed for PDF at exactly the page limit", async () => {
      const pdfBuffer = createPdfWithPageCount(100);

      const result = await PDFProcessor.process(pdfBuffer, {
        provider: "openai",
      });

      expect(result.type).toBe("pdf");
      expect(result.metadata?.estimatedPages).toBe(100);
    });

    it("should throw NeuroLinkError with correct error code for page limit exceeded", async () => {
      const pdfBuffer = createPdfWithPageCount(150);

      try {
        await PDFProcessor.process(pdfBuffer, { provider: "openai" });
        throw new Error("should have thrown");
      } catch (error) {
        const errorMessage = (error as Error).message;
        expect(errorMessage).not.toBe("should have thrown");
        expect(error).toBeInstanceOf(NeuroLinkError);
        const neuroLinkError = error as NeuroLinkError;
        expect(neuroLinkError.code).toBe("PDF_PAGE_LIMIT_EXCEEDED");
        expect(neuroLinkError.context).toMatchObject({
          estimatedPages: 150,
          maxPages: 100,
          provider: "openai",
        });
        expect(neuroLinkError.context.alternatives).toBeDefined();
        expect(Array.isArray(neuroLinkError.context.alternatives)).toBe(true);
      }
    });

    it("should throw error with correct page counts in message", async () => {
      const pdfBuffer = createPdfWithPageCount(200);

      await expect(
        PDFProcessor.process(pdfBuffer, { provider: "anthropic" }),
      ).rejects.toThrow(/200 pages detected.*maximum 100 pages/);
    });

    it("should include actionable alternatives in error message", async () => {
      const pdfBuffer = createPdfWithPageCount(150);

      try {
        await PDFProcessor.process(pdfBuffer, { provider: "openai" });
        throw new Error("should have thrown");
      } catch (error) {
        const errorMessage = (error as Error).message;
        expect(errorMessage).not.toBe("should have thrown");
        expect(errorMessage).toContain("Alternatives:");
        expect(errorMessage).toContain("Split the PDF into smaller files");
        expect(errorMessage).toContain("Extract only the pages you need");
        expect(errorMessage).toContain(
          "Google AI Studio which supports up to 2000MB file size",
        );
        expect(errorMessage).toContain("page limits still apply");
        expect(errorMessage).toContain("Convert specific pages to images");
        expect(errorMessage).toContain("enforceLimits: false");
      }
    });

    it("should not mislead about provider-specific page limits", async () => {
      const pdfBuffer = createPdfWithPageCount(150);

      try {
        await PDFProcessor.process(pdfBuffer, { provider: "openai" });
        throw new Error("should have thrown");
      } catch (error) {
        const errorMessage = (error as Error).message;
        expect(errorMessage).not.toBe("should have thrown");
        // Should use generic suggestion, not claim specific providers have higher limits
        expect(errorMessage).not.toContain("Google AI Studio supports");
      }
    });

    it("should bypass limit with enforceLimits: false and continue processing", async () => {
      const pdfBuffer = createPdfWithPageCount(150);

      const result = await PDFProcessor.process(pdfBuffer, {
        provider: "openai",
        enforceLimits: false,
      });

      expect(result.type).toBe("pdf");
      expect(result.mimeType).toBe("application/pdf");
      expect(result.metadata?.estimatedPages).toBe(150);
    });

    it("should log prominent warning when bypassing limit", async () => {
      const pdfBuffer = createPdfWithPageCount(200);

      await PDFProcessor.process(pdfBuffer, {
        provider: "anthropic",
        enforceLimits: false,
      });

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("LIMIT BYPASS"),
      );
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("200-page PDF"),
      );
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("100-page limit"),
      );
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("anthropic"),
      );
    });

    it("should warn about potential consequences when bypassing limit", async () => {
      const pdfBuffer = createPdfWithPageCount(150);

      await PDFProcessor.process(pdfBuffer, {
        provider: "openai",
        enforceLimits: false,
      });

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("API rejection"),
      );
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("unexpected costs"),
      );
    });

    it("should enforce limits by default when enforceLimits is not specified", async () => {
      const pdfBuffer = createPdfWithPageCount(150);

      await expect(
        PDFProcessor.process(pdfBuffer, { provider: "openai" }),
      ).rejects.toThrow("PDF page limit exceeded");
    });

    it("should enforce limits when enforceLimits is explicitly true", async () => {
      const pdfBuffer = createPdfWithPageCount(150);

      await expect(
        PDFProcessor.process(pdfBuffer, {
          provider: "openai",
          enforceLimits: true,
        }),
      ).rejects.toThrow("PDF page limit exceeded");
    });

    it("should respect different provider page limits", async () => {
      const pdfBuffer = createPdfWithPageCount(150);

      // All providers have 100 page limits, so this should throw for any
      await expect(
        PDFProcessor.process(pdfBuffer, { provider: "anthropic" }),
      ).rejects.toThrow("PDF page limit exceeded");

      await expect(
        PDFProcessor.process(pdfBuffer, { provider: "google-vertex" }),
      ).rejects.toThrow("PDF page limit exceeded");
    });
  });
});

describe("PDFProcessor.convertToImages", () => {
  describe("empty PDF validation", () => {
    it("should throw error for PDF with 0 pages", async () => {
      // Create a valid PDF header buffer that will pass initial validation
      const validPdfHeader = Buffer.from(
        "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Count 0/Kids[]>>endobj\nxref\n0 3\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\ntrailer<</Size 3/Root 1 0 R>>\nstartxref\n150\n%%EOF",
      );

      // Mock pdf-to-img to return an empty async iterator (0 pages)
      vi.doMock("pdf-to-img", () => ({
        pdf: vi.fn().mockResolvedValue({
          [Symbol.asyncIterator]: async function* () {
            // Empty iterator - no pages
          },
        }),
      }));

      // Re-import to get the mocked version
      const { PDFProcessor: MockedPDFProcessor } = await import(
        "../../../src/lib/utils/pdfProcessor.js"
      );

      await expect(
        MockedPDFProcessor.convertToImages(validPdfHeader),
      ).rejects.toThrow("PDF has 0 pages. Cannot convert empty PDF to images.");

      vi.doUnmock("pdf-to-img");
    });

    it("should succeed for PDF with at least 1 page", async () => {
      const validPdfHeader = Buffer.from(
        "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n200\n%%EOF",
      );

      // Mock pdf-to-img to return a single page
      vi.doMock("pdf-to-img", () => ({
        pdf: vi.fn().mockResolvedValue({
          [Symbol.asyncIterator]: async function* () {
            yield Buffer.from("fake-png-data");
          },
        }),
      }));

      const { PDFProcessor: MockedPDFProcessor } = await import(
        "../../../src/lib/utils/pdfProcessor.js"
      );

      const result = await MockedPDFProcessor.convertToImages(validPdfHeader);
      expect(result.pageCount).toBe(1);
      expect(result.images).toHaveLength(1);

      vi.doUnmock("pdf-to-img");
    });

    it("should provide clear error message mentioning 0 pages", async () => {
      const validPdfHeader = Buffer.from(
        "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Count 0/Kids[]>>endobj\nxref\n0 3\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\ntrailer<</Size 3/Root 1 0 R>>\nstartxref\n150\n%%EOF",
      );

      vi.doMock("pdf-to-img", () => ({
        pdf: vi.fn().mockResolvedValue({
          [Symbol.asyncIterator]: async function* () {
            // Empty iterator
          },
        }),
      }));

      const { PDFProcessor: MockedPDFProcessor } = await import(
        "../../../src/lib/utils/pdfProcessor.js"
      );

      try {
        await MockedPDFProcessor.convertToImages(validPdfHeader);
        throw new Error("should have thrown");
      } catch (error) {
        const errorMessage = (error as Error).message;
        expect(errorMessage).not.toBe("should have thrown");
        expect(errorMessage).toContain("0 pages");
        expect(errorMessage).toContain("empty PDF");
      }

      vi.doUnmock("pdf-to-img");
    });
  });

  describe("format validation", () => {
    // Create a minimal valid PDF buffer for testing
    // This is a minimal PDF that won't actually render, but will help test validation
    const minimalPdfBuffer = Buffer.from(
      "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n200\n%%EOF",
    );

    it('should throw error for unsupported format "gif"', async () => {
      await expect(
        PDFProcessor.convertToImages(minimalPdfBuffer, {
          format: "gif" as "png",
        }),
      ).rejects.toThrow(
        'Invalid format: "gif". Supported formats: "png", "jpeg".',
      );
    });

    it('should throw error for unsupported format "webp"', async () => {
      await expect(
        PDFProcessor.convertToImages(minimalPdfBuffer, {
          format: "webp" as "png",
        }),
      ).rejects.toThrow(
        'Invalid format: "webp". Supported formats: "png", "jpeg".',
      );
    });

    it('should throw error for case-sensitive format "PNG" (uppercase)', async () => {
      await expect(
        PDFProcessor.convertToImages(minimalPdfBuffer, {
          format: "PNG" as "png",
        }),
      ).rejects.toThrow(
        'Invalid format: "PNG". Supported formats: "png", "jpeg".',
      );
    });

    it('should throw error for case-sensitive format "JPEG" (uppercase)', async () => {
      await expect(
        PDFProcessor.convertToImages(minimalPdfBuffer, {
          format: "JPEG" as "png",
        }),
      ).rejects.toThrow(
        'Invalid format: "JPEG". Supported formats: "png", "jpeg".',
      );
    });

    it('should throw error for case-sensitive format "Png" (mixed case)', async () => {
      await expect(
        PDFProcessor.convertToImages(minimalPdfBuffer, {
          format: "Png" as "png",
        }),
      ).rejects.toThrow(
        'Invalid format: "Png". Supported formats: "png", "jpeg".',
      );
    });

    it("should validate format before attempting PDF processing", async () => {
      // This test ensures validation happens early, before expensive PDF operations
      const invalidBuffer = Buffer.from("not-a-pdf");

      await expect(
        PDFProcessor.convertToImages(invalidBuffer, {
          format: "invalid" as "png",
        }),
      ).rejects.toThrow(
        'Invalid format: "invalid". Supported formats: "png", "jpeg".',
      );
    });

    it('should accept valid format "png"', async () => {
      // This will fail during PDF processing, but should pass format validation
      // We're testing that the format validation doesn't reject "png"
      try {
        await PDFProcessor.convertToImages(minimalPdfBuffer, {
          format: "png",
        });
      } catch (error) {
        // Should fail due to canvas/pdfjs dependencies or PDF processing issues,
        // not due to format validation
        expect((error as Error).message).not.toContain("Invalid format");
      }
    });

    it('should accept valid format "jpeg"', async () => {
      // This will fail during PDF processing, but should pass format validation
      // We're testing that the format validation doesn't reject "jpeg"
      try {
        await PDFProcessor.convertToImages(minimalPdfBuffer, {
          format: "jpeg",
        });
      } catch (error) {
        // Should fail due to canvas/pdfjs dependencies or PDF processing issues,
        // not due to format validation
        expect((error as Error).message).not.toContain("Invalid format");
      }
    });

    it("should use default format png when format is not provided", async () => {
      // Test that omitting format uses the default "png" and doesn't throw validation error
      try {
        await PDFProcessor.convertToImages(minimalPdfBuffer);
      } catch (error) {
        // Should fail due to canvas/pdfjs dependencies or PDF processing issues,
        // not due to format validation
        expect((error as Error).message).not.toContain("Invalid format");
      }
    });
  });
});
