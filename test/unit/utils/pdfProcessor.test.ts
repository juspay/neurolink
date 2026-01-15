import { describe, it, expect, vi } from "vitest";
import { PDFProcessor } from "../../../src/lib/utils/pdfProcessor.js";

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
        expect.fail("Should have thrown an error");
      } catch (error) {
        const errorMessage = (error as Error).message;
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
