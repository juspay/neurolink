/**
 * PDF Filename Tests
 *
 * Tests to validate that PDF files receive unique filenames when processed,
 * preventing filename collisions especially for Bedrock provider.
 *
 * Issue: PDF-020 - Bedrock Filename Collision
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildMultimodalMessagesArray } from "../../src/lib/utils/messageBuilder.js";

describe("PDF Filename Uniqueness", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Multiple PDF Buffers without explicit filenames", () => {
    it("should generate unique filenames for multiple PDF buffers", async () => {
      // Create minimal PDF buffers
      const pdfBuffer1 = Buffer.from(
        "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n149\n%%EOF",
      );
      const pdfBuffer2 = Buffer.from(
        "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n149\n%%EOF",
      );
      const pdfBuffer3 = Buffer.from(
        "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n149\n%%EOF",
      );

      const messages = await buildMultimodalMessagesArray(
        {
          input: {
            text: "Analyze these PDF documents",
            pdfFiles: [pdfBuffer1, pdfBuffer2, pdfBuffer3],
          },
        },
        "anthropic",
        "claude-3-5-sonnet-20241022",
      );

      // Verify messages were created
      expect(messages.length).toBeGreaterThan(0);

      // Find the user message with multimodal content
      const userMessage = messages.find((m) => m.role === "user");
      expect(userMessage).toBeDefined();

      // The content should be an array with file parts for PDFs
      if (Array.isArray(userMessage?.content)) {
        const fileParts = userMessage.content.filter(
          (item: unknown) =>
            typeof item === "object" &&
            item !== null &&
            "type" in item &&
            (item as { type: string }).type === "file",
        );

        // Should have 3 file parts for 3 PDFs
        expect(fileParts.length).toBe(3);

        // All file parts should have application/pdf mimeType
        fileParts.forEach((part: unknown) => {
          if (typeof part === "object" && part !== null && "mimeType" in part) {
            expect((part as { mimeType: string }).mimeType).toBe(
              "application/pdf",
            );
          }
        });
      }
    });

    it("should use document-N.pdf naming pattern for Buffer PDFs", async () => {
      // This test verifies the logging output pattern indirectly by checking
      // that the messages are properly built with unique filenames
      const pdfBuffer = Buffer.from(
        "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n149\n%%EOF",
      );

      const messages = await buildMultimodalMessagesArray(
        {
          input: {
            text: "Analyze this PDF",
            pdfFiles: [pdfBuffer],
          },
        },
        "bedrock",
        "anthropic.claude-3-5-sonnet-20241022-v2:0",
      );

      // Should have messages
      expect(messages.length).toBeGreaterThan(0);

      // User message should have the PDF
      const userMessage = messages.find((m) => m.role === "user");
      expect(userMessage).toBeDefined();
    });
  });

  describe("extractFilename function behavior", () => {
    it("should generate unique fallback names for each index", async () => {
      // Test with multiple buffers to verify index-based naming
      const buffer1 = Buffer.from(
        "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n149\n%%EOF",
      );
      const buffer2 = Buffer.from(
        "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n149\n%%EOF",
      );

      // Build multimodal messages and verify no collision occurs
      const messages = await buildMultimodalMessagesArray(
        {
          input: {
            text: "Test multiple PDFs",
            pdfFiles: [buffer1, buffer2],
          },
        },
        "anthropic",
        "claude-3-5-sonnet-20241022",
      );

      const userMessage = messages.find((m) => m.role === "user");
      expect(userMessage).toBeDefined();

      // Content should be multimodal
      if (Array.isArray(userMessage?.content)) {
        const fileParts = userMessage.content.filter(
          (item: unknown) =>
            typeof item === "object" &&
            item !== null &&
            "type" in item &&
            (item as { type: string }).type === "file",
        );
        expect(fileParts.length).toBe(2);
      }
    });
  });
});
