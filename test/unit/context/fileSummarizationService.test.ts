/**
 * Unit tests for FileSummarizationService
 *
 * Tests text extraction, MIME label mapping, and file preparation.
 * LLM-dependent methods (summarizeFiles) are tested at the integration
 * level where they can be properly mocked or use real providers.
 */

import { describe, expect, it } from "vitest";
import {
  FileSummarizationService,
  type RawFileInput,
} from "../../../src/lib/context/fileSummarizationService.js";

// ---------------------------------------------------------------------------
// Constructor
// ---------------------------------------------------------------------------

describe("FileSummarizationService", () => {
  describe("constructor", () => {
    it("creates with default provider and model", () => {
      const service = new FileSummarizationService();
      // We can't directly inspect private fields, but we can verify
      // the class instantiates without error
      expect(service).toBeInstanceOf(FileSummarizationService);
    });

    it("accepts custom provider and model", () => {
      const service = new FileSummarizationService({
        provider: "anthropic",
        model: "claude-sonnet-4-20250514",
      });
      expect(service).toBeInstanceOf(FileSummarizationService);
    });
  });

  // -------------------------------------------------------------------------
  // extractFileText
  // -------------------------------------------------------------------------

  describe("extractFileText", () => {
    it("returns string content as-is", () => {
      const service = new FileSummarizationService();
      const result = service.extractFileText(
        "Hello, world!",
        "text/plain",
        "hello.txt",
      );
      expect(result).toBe("Hello, world!");
    });

    it("returns string content for non-text MIME when content is string", () => {
      const service = new FileSummarizationService();
      const result = service.extractFileText(
        '{"key": "value"}',
        "application/json",
        "data.json",
      );
      expect(result).toBe('{"key": "value"}');
    });

    it("returns placeholder for binary image content", () => {
      const service = new FileSummarizationService();
      const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47]); // PNG header
      const result = service.extractFileText(buffer, "image/png", "photo.png");
      expect(result).toContain("[Binary file:");
      expect(result).toContain("photo.png");
      expect(result).toContain("image/png");
      expect(result).toContain("4 bytes");
    });

    it("returns placeholder for binary audio content", () => {
      const service = new FileSummarizationService();
      const buffer = Buffer.alloc(1024);
      const result = service.extractFileText(buffer, "audio/mpeg", "song.mp3");
      expect(result).toContain("[Binary file:");
      expect(result).toContain("audio/mpeg");
    });

    it("returns placeholder for binary video content", () => {
      const service = new FileSummarizationService();
      const buffer = Buffer.alloc(2048);
      const result = service.extractFileText(buffer, "video/mp4", "clip.mp4");
      expect(result).toContain("[Binary file:");
      expect(result).toContain("video/mp4");
    });

    it("decodes Buffer with UTF-8 text for text MIME types", () => {
      const service = new FileSummarizationService();
      const text = "This is a test file with UTF-8 content: café";
      const buffer = Buffer.from(text, "utf-8");
      const result = service.extractFileText(buffer, "text/plain", "test.txt");
      expect(result).toBe(text);
    });

    it("decodes Buffer with UTF-8 for application/ MIME types", () => {
      const service = new FileSummarizationService();
      const jsonContent = '{"name": "test", "value": 42}';
      const buffer = Buffer.from(jsonContent, "utf-8");
      const result = service.extractFileText(
        buffer,
        "application/json",
        "data.json",
      );
      expect(result).toBe(jsonContent);
    });
  });

  // -------------------------------------------------------------------------
  // getFileTypeLabel
  // -------------------------------------------------------------------------

  describe("getFileTypeLabel", () => {
    const service = new FileSummarizationService();

    it("maps application/pdf to PDF Document", () => {
      expect(service.getFileTypeLabel("application/pdf", "doc.pdf")).toBe(
        "PDF Document",
      );
    });

    it("maps Word MIME type correctly", () => {
      expect(
        service.getFileTypeLabel(
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "doc.docx",
        ),
      ).toBe("Word Document");
    });

    it("maps Excel MIME type correctly", () => {
      expect(
        service.getFileTypeLabel(
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "data.xlsx",
        ),
      ).toBe("Excel Spreadsheet");
    });

    it("maps text/csv correctly", () => {
      expect(service.getFileTypeLabel("text/csv", "data.csv")).toBe("CSV File");
    });

    it("maps text/html correctly", () => {
      expect(service.getFileTypeLabel("text/html", "page.html")).toBe(
        "HTML Document",
      );
    });

    it("maps application/json correctly", () => {
      expect(service.getFileTypeLabel("application/json", "config.json")).toBe(
        "JSON File",
      );
    });

    it("falls back to extension for unknown MIME type", () => {
      expect(
        service.getFileTypeLabel("application/octet-stream", "script.py"),
      ).toBe("Python File");
    });

    it("falls back to extension for TypeScript files", () => {
      expect(
        service.getFileTypeLabel("application/octet-stream", "index.ts"),
      ).toBe("TypeScript File");
    });

    it("falls back to extension for Go files", () => {
      expect(
        service.getFileTypeLabel("application/octet-stream", "main.go"),
      ).toBe("Go File");
    });

    it("returns generic 'File' for unknown MIME and extension", () => {
      expect(
        service.getFileTypeLabel("application/octet-stream", "data.xyz"),
      ).toBe("File");
    });

    it("maps YAML MIME type correctly", () => {
      expect(service.getFileTypeLabel("application/yaml", "config.yaml")).toBe(
        "YAML File",
      );
    });

    it("maps SVG MIME type correctly", () => {
      expect(service.getFileTypeLabel("image/svg+xml", "logo.svg")).toBe(
        "SVG Image",
      );
    });
  });

  // -------------------------------------------------------------------------
  // prepareFilesForSummarization
  // -------------------------------------------------------------------------

  describe("prepareFilesForSummarization", () => {
    it("builds correct FileForSummarization array from raw inputs", () => {
      const service = new FileSummarizationService();
      const files: RawFileInput[] = [
        {
          content: "Hello, world!",
          mimeType: "text/plain",
          fileName: "hello.txt",
          originalSize: 13,
        },
        {
          content: '{"key": "value"}',
          mimeType: "application/json",
          fileName: "data.json",
          originalSize: 16,
        },
      ];

      const prepared = service.prepareFilesForSummarization(files);

      expect(prepared).toHaveLength(2);

      expect(prepared[0].fileName).toBe("hello.txt");
      expect(prepared[0].fileType).toBe("Text File");
      expect(prepared[0].content).toBe("Hello, world!");
      expect(prepared[0].estimatedTokens).toBeGreaterThan(0);
      expect(prepared[0].mimeType).toBe("text/plain");
      expect(prepared[0].originalSize).toBe(13);

      expect(prepared[1].fileName).toBe("data.json");
      expect(prepared[1].fileType).toBe("JSON File");
      expect(prepared[1].content).toBe('{"key": "value"}');
      expect(prepared[1].estimatedTokens).toBeGreaterThan(0);
    });

    it("uses custom provider for token estimation", () => {
      const service = new FileSummarizationService();
      const files: RawFileInput[] = [
        {
          content: "x".repeat(1000),
          mimeType: "text/plain",
          fileName: "test.txt",
        },
      ];

      const anthropicPrep = service.prepareFilesForSummarization(
        files,
        "anthropic",
      );
      const openaiPrep = service.prepareFilesForSummarization(files, "openai");

      // Anthropic has a 1.23x multiplier, OpenAI has 1.0x
      // So Anthropic estimate should be higher
      expect(anthropicPrep[0].estimatedTokens).toBeGreaterThan(
        openaiPrep[0].estimatedTokens,
      );
    });

    it("handles binary files in the input", () => {
      const service = new FileSummarizationService();
      const files: RawFileInput[] = [
        {
          content: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
          mimeType: "image/png",
          fileName: "image.png",
          originalSize: 4,
        },
      ];

      const prepared = service.prepareFilesForSummarization(files);

      expect(prepared).toHaveLength(1);
      expect(prepared[0].content).toContain("[Binary file:");
      expect(prepared[0].estimatedTokens).toBeGreaterThan(0);
    });
  });
});
