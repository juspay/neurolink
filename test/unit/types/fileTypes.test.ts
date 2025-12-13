/**
 * Unit tests for office document file type definitions
 * Tests OFFICE-006 implementation
 */
import { describe, it, expect } from "vitest";
import type {
  FileType,
  OfficeDocumentType,
  OfficeProcessorOptions,
  FileProcessingResult,
  FileDetectorOptions,
} from "../../../src/lib/types/fileTypes.js";

describe("Office Document Type Definitions", () => {
  describe("FileType union", () => {
    it("should include office document types", () => {
      const officeTypes: FileType[] = ["docx", "pptx", "xlsx"];

      // Type assertion to ensure these are valid FileType values
      officeTypes.forEach((type) => {
        expect([
          "csv",
          "image",
          "pdf",
          "audio",
          "text",
          "docx",
          "pptx",
          "xlsx",
          "unknown",
        ]).toContain(type);
      });
    });

    it("should accept all office document types", () => {
      const docx: FileType = "docx";
      const pptx: FileType = "pptx";
      const xlsx: FileType = "xlsx";

      expect(docx).toBe("docx");
      expect(pptx).toBe("pptx");
      expect(xlsx).toBe("xlsx");
    });
  });

  describe("OfficeDocumentType", () => {
    it("should only include office document types", () => {
      const validTypes: OfficeDocumentType[] = ["docx", "pptx", "xlsx"];

      validTypes.forEach((type) => {
        expect(["docx", "pptx", "xlsx"]).toContain(type);
      });
    });

    it("should create valid office document type values", () => {
      const docx: OfficeDocumentType = "docx";
      const pptx: OfficeDocumentType = "pptx";
      const xlsx: OfficeDocumentType = "xlsx";

      expect(docx).toBe("docx");
      expect(pptx).toBe("pptx");
      expect(xlsx).toBe("xlsx");
    });
  });

  describe("OfficeProcessorOptions", () => {
    it("should accept format option", () => {
      const options: OfficeProcessorOptions = {
        format: "docx",
      };

      expect(options.format).toBe("docx");
    });

    it("should accept all optional properties", () => {
      const options: OfficeProcessorOptions = {
        format: "xlsx",
        extractTextOnly: true,
        maxSizeMB: 10,
        includeMetadata: true,
        processAllSheets: true,
        includeSlideNotes: false,
      };

      expect(options.format).toBe("xlsx");
      expect(options.extractTextOnly).toBe(true);
      expect(options.maxSizeMB).toBe(10);
      expect(options.includeMetadata).toBe(true);
      expect(options.processAllSheets).toBe(true);
      expect(options.includeSlideNotes).toBe(false);
    });

    it("should accept empty object", () => {
      const options: OfficeProcessorOptions = {};
      expect(options).toEqual({});
    });

    it("should handle Word document options", () => {
      const options: OfficeProcessorOptions = {
        format: "docx",
        extractTextOnly: false,
        includeMetadata: true,
      };

      expect(options.format).toBe("docx");
    });

    it("should handle PowerPoint options", () => {
      const options: OfficeProcessorOptions = {
        format: "pptx",
        includeSlideNotes: true,
      };

      expect(options.format).toBe("pptx");
      expect(options.includeSlideNotes).toBe(true);
    });

    it("should handle Excel options", () => {
      const options: OfficeProcessorOptions = {
        format: "xlsx",
        processAllSheets: true,
      };

      expect(options.format).toBe("xlsx");
      expect(options.processAllSheets).toBe(true);
    });
  });

  describe("FileProcessingResult metadata", () => {
    it("should support office-specific metadata fields", () => {
      const result: FileProcessingResult = {
        type: "docx",
        content: "Document content",
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        metadata: {
          confidence: 95,
          size: 1024000,
          filename: "document.docx",
          officeFormat: "docx",
          pageCount: 10,
          author: "John Doe",
          createdDate: "2024-01-01",
          modifiedDate: "2024-01-15",
          hasImages: true,
        },
      };

      expect(result.type).toBe("docx");
      expect(result.metadata.officeFormat).toBe("docx");
      expect(result.metadata.pageCount).toBe(10);
      expect(result.metadata.author).toBe("John Doe");
      expect(result.metadata.hasImages).toBe(true);
    });

    it("should support PowerPoint-specific metadata", () => {
      const result: FileProcessingResult = {
        type: "pptx",
        content: Buffer.from("presentation data"),
        mimeType:
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        metadata: {
          confidence: 100,
          officeFormat: "pptx",
          slideCount: 20,
          hasImages: true,
        },
      };

      expect(result.type).toBe("pptx");
      expect(result.metadata.officeFormat).toBe("pptx");
      expect(result.metadata.slideCount).toBe(20);
    });

    it("should support Excel-specific metadata", () => {
      const result: FileProcessingResult = {
        type: "xlsx",
        content: "spreadsheet data",
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        metadata: {
          confidence: 98,
          officeFormat: "xlsx",
          sheetCount: 3,
          sheetNames: ["Sheet1", "Sheet2", "Sheet3"],
          hasFormulas: true,
        },
      };

      expect(result.type).toBe("xlsx");
      expect(result.metadata.officeFormat).toBe("xlsx");
      expect(result.metadata.sheetCount).toBe(3);
      expect(result.metadata.sheetNames).toEqual([
        "Sheet1",
        "Sheet2",
        "Sheet3",
      ]);
      expect(result.metadata.hasFormulas).toBe(true);
    });

    it("should support mixed metadata (office + CSV/PDF)", () => {
      const result: FileProcessingResult = {
        type: "xlsx",
        content: "data",
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        metadata: {
          confidence: 90,
          officeFormat: "xlsx",
          sheetCount: 1,
          // Can also have CSV-like metadata if converted
          rowCount: 100,
          columnCount: 10,
          columnNames: ["A", "B", "C"],
        },
      };

      expect(result.metadata.officeFormat).toBe("xlsx");
      expect(result.metadata.sheetCount).toBe(1);
      expect(result.metadata.rowCount).toBe(100);
      expect(result.metadata.columnNames).toBeDefined();
    });
  });

  describe("FileDetectorOptions", () => {
    it("should accept officeOptions", () => {
      const options: FileDetectorOptions = {
        allowedTypes: ["docx", "xlsx", "pptx"],
        officeOptions: {
          format: "docx",
          maxSizeMB: 50,
        },
      };

      expect(options.officeOptions).toBeDefined();
      expect(options.officeOptions?.format).toBe("docx");
      expect(options.officeOptions?.maxSizeMB).toBe(50);
    });

    it("should work with all processor options", () => {
      const options: FileDetectorOptions = {
        audioOptions: {
          provider: "openai",
        },
        csvOptions: {
          maxRows: 1000,
        },
        officeOptions: {
          format: "xlsx",
          processAllSheets: true,
        },
      };

      expect(options.audioOptions).toBeDefined();
      expect(options.csvOptions).toBeDefined();
      expect(options.officeOptions).toBeDefined();
      expect(options.officeOptions?.format).toBe("xlsx");
    });
  });

  describe("Type compatibility", () => {
    it("should allow OfficeDocumentType to be assigned to FileType", () => {
      const officeType: OfficeDocumentType = "docx";
      const fileType: FileType = officeType;

      expect(fileType).toBe("docx");
    });

    it("should maintain backward compatibility with existing file types", () => {
      const existingTypes: FileType[] = [
        "csv",
        "image",
        "pdf",
        "audio",
        "text",
        "unknown",
      ];

      existingTypes.forEach((type) => {
        expect(type).toBeDefined();
      });
    });
  });
});
