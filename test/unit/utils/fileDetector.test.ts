/**
 * FileDetector Unit Tests
 *
 * Tests for file type detection and processing, including:
 * - Extension-based detection
 * - Content-based detection
 * - CSV fallback for extension-less files (FD-018)
 * - Error handling for unsupported file types
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { FileDetector } from "../../../src/lib/utils/fileDetector.js";
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

describe("FileDetector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("detectAndProcess", () => {
    describe("Files with extensions", () => {
      it("should detect and process CSV files with .csv extension", async () => {
        const csvPath = join(fixturesPath, "basic.csv");
        const result = await FileDetector.detectAndProcess(csvPath);

        expect(result.type).toBe("csv");
        expect(result.mimeType).toBe("text/csv");
        expect(result.metadata).toBeDefined();
        expect(result.metadata.rowCount).toBeGreaterThan(0);
      });

      it("should detect and process PDF files with .pdf extension", async () => {
        const pdfPath = join(fixturesPath, "valid-sample.pdf");
        const result = await FileDetector.detectAndProcess(pdfPath, {
          provider: "openai", // PDF processing requires a provider
        });

        expect(result.type).toBe("pdf");
        expect(result.mimeType).toBe("application/pdf");
      });

      it("should respect allowedTypes option for CSV files", async () => {
        const csvPath = join(fixturesPath, "basic.csv");
        const result = await FileDetector.detectAndProcess(csvPath, {
          allowedTypes: ["csv"],
        });

        expect(result.type).toBe("csv");
      });

      it("should throw error when file type not in allowedTypes", async () => {
        const csvPath = join(fixturesPath, "basic.csv");

        await expect(
          FileDetector.detectAndProcess(csvPath, {
            allowedTypes: ["pdf"],
          }),
        ).rejects.toThrow(
          /File type detection failed and all fallback parsing attempts failed/,
        );
      });
    });

    describe("Extension-less files with CSV content (FD-018)", () => {
      /**
       * CRITICAL TEST: This tests the CSV fallback behavior for extension-less files.
       *
       * Before FD-018 fix: This test FAILS with "File type unknown not allowed. Allowed: csv"
       * After FD-018 fix: This test PASSES because CSV fallback parsing succeeds
       */
      it("should successfully parse extension-less file with CSV content when allowedTypes includes csv", async () => {
        const extensionlessPath = join(fixturesPath, "extensionless-csv-1");
        const result = await FileDetector.detectAndProcess(extensionlessPath, {
          allowedTypes: ["csv"],
        });

        expect(result.type).toBe("csv");
        expect(result.mimeType).toBe("text/csv");
        // Row count includes all data rows (may vary by CSV processor implementation)
        expect(result.metadata.rowCount).toBeGreaterThanOrEqual(3);
        expect(result.metadata.columnCount).toBe(3); // name, age, city
        // Content should contain the expected data
        expect(result.content).toContain("name");
        expect(result.content).toContain("Alice");
      });

      it("should parse file-1 (Slack-style filename) as CSV when allowedTypes includes csv", async () => {
        const file1Path = join(fixturesPath, "file-1");
        const result = await FileDetector.detectAndProcess(file1Path, {
          allowedTypes: ["csv"],
        });

        expect(result.type).toBe("csv");
        expect(result.metadata.rowCount).toBeGreaterThanOrEqual(3);
        // Content should contain the expected headers and data
        expect(result.content).toContain("merchant_id");
        expect(result.content).toContain("IND937427");
      });

      it("should parse file-2 (Slack-style filename) as CSV when allowedTypes includes csv", async () => {
        const file2Path = join(fixturesPath, "file-2");
        const result = await FileDetector.detectAndProcess(file2Path, {
          allowedTypes: ["csv"],
        });

        expect(result.type).toBe("csv");
        expect(result.metadata.rowCount).toBeGreaterThanOrEqual(3);
        // Content should contain the expected headers and data
        expect(result.content).toContain("id");
        expect(result.content).toContain("John Doe");
      });

      it("should parse extension-less CSV with product data", async () => {
        const extensionlessPath = join(fixturesPath, "extensionless-csv-2");
        const result = await FileDetector.detectAndProcess(extensionlessPath, {
          allowedTypes: ["csv"],
        });

        expect(result.type).toBe("csv");
        expect(result.metadata.rowCount).toBeGreaterThanOrEqual(4); // 4 products
        // Content should contain the expected headers and data
        expect(result.content).toContain("product");
        expect(result.content).toContain("Laptop");
      });

      it("should detect CSV correctly even with trailing newlines", async () => {
        const extensionlessPath = join(fixturesPath, "extensionless-csv-1");
        const result = await FileDetector.detectAndProcess(extensionlessPath, {
          allowedTypes: ["csv"],
        });

        // With trailing newline fix, CSV should be detected directly without fallback
        expect(result.type).toBe("csv");
        expect(result.mimeType).toBe("text/csv");
      });

      it("should include CSV options when using fallback parsing", async () => {
        const extensionlessPath = join(fixturesPath, "extensionless-csv-2");
        const result = await FileDetector.detectAndProcess(extensionlessPath, {
          allowedTypes: ["csv"],
          csvOptions: {
            maxRows: 2,
            formatStyle: "raw",
          },
        });

        expect(result.type).toBe("csv");
        // With maxRows: 2, should only have 2 data rows
        expect(result.metadata.rowCount).toBe(2);
      });
    });

    describe("Extension-less files with non-CSV content", () => {
      /**
       * Note: CSVProcessor is lenient and will parse any text with newlines
       * as a single-column CSV. This is actually reasonable behavior for a
       * fallback - better to return something than fail completely.
       */
      it("should parse plain text file as single-column CSV (lenient fallback)", async () => {
        const notCsvPath = join(fixturesPath, "not-a-csv");

        const result = await FileDetector.detectAndProcess(notCsvPath, {
          allowedTypes: ["csv"],
        });

        // CSVProcessor is lenient - it creates a single-column CSV from any text
        expect(result.type).toBe("csv");
        expect(result.metadata.columnCount).toBe(1);
        // The plain text file has 3 lines of text
        expect(result.metadata.rowCount).toBeGreaterThanOrEqual(1);
      });

      it("should log info when CSV fallback is attempted", async () => {
        const notCsvPath = join(fixturesPath, "not-a-csv");

        await FileDetector.detectAndProcess(notCsvPath, {
          allowedTypes: ["csv"],
        });

        // Should log the fallback attempt
        expect(logger.info).toHaveBeenCalledWith(
          expect.stringContaining("CSV fallback"),
        );
      });
    });

    describe("Buffer input handling", () => {
      it("should detect CSV from Buffer content using ContentHeuristicStrategy", async () => {
        const csvContent = Buffer.from(
          "name,age,city\nAlice,30,NYC\nBob,25,LA",
        );
        const result = await FileDetector.detectAndProcess(csvContent);

        expect(result.type).toBe("csv");
        expect(result.metadata.rowCount).toBe(2);
      });

      it("should process Buffer with CSV content when allowedTypes specified", async () => {
        // Load extension-less file as buffer
        const extensionlessPath = join(fixturesPath, "extensionless-csv-1");
        const buffer = await readFile(extensionlessPath);

        // With trailing newline fix, CSV-like content is reliably detected as CSV
        const result = await FileDetector.detectAndProcess(buffer, {
          allowedTypes: ["csv", "text"],
        });

        // Should be reliably detected as CSV now that trailing newlines are handled
        expect(result.type).toBe("csv");
        // Content should contain the data
        expect(result.content).toContain("Alice");
      });

      it("should detect PNG from Buffer magic bytes", async () => {
        // PNG magic bytes: 89 50 4E 47
        const pngBuffer = Buffer.from([
          0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        ]);

        // This should be detected as image, not throw
        await expect(
          FileDetector.detectAndProcess(pngBuffer, {
            allowedTypes: ["image"],
          }),
        ).resolves.toMatchObject({
          type: "image",
        });
      });

      it("should detect PDF from Buffer magic bytes", async () => {
        const pdfBuffer = Buffer.from("%PDF-1.4 test content");

        await expect(
          FileDetector.detectAndProcess(pdfBuffer, {
            allowedTypes: ["pdf"],
            provider: "openai", // PDF processing requires a provider
          }),
        ).resolves.toMatchObject({
          type: "pdf",
        });
      });
    });

    describe("Error messages", () => {
      it("should provide clear error message when type not allowed", async () => {
        const csvPath = join(fixturesPath, "basic.csv");

        await expect(
          FileDetector.detectAndProcess(csvPath, {
            allowedTypes: ["image", "pdf"],
          }),
        ).rejects.toThrow(
          /File type detection failed and all fallback parsing attempts failed/,
        );
      });

      it("should successfully parse extension-less files via CSV fallback", async () => {
        // This test verifies that the CSV fallback works for extension-less files
        // CSVProcessor is lenient and will parse any text, creating a single-column CSV
        const notCsvPath = join(fixturesPath, "not-a-csv");

        const result = await FileDetector.detectAndProcess(notCsvPath, {
          allowedTypes: ["csv"],
        });

        // Should succeed with lenient CSV parsing
        expect(result.type).toBe("csv");
        expect(result.metadata).toBeDefined();
      });
    });

    describe("File size limits", () => {
      it("should respect maxSize option", async () => {
        const csvPath = join(fixturesPath, "large.csv");

        await expect(
          FileDetector.detectAndProcess(csvPath, {
            maxSize: 100, // 100 bytes - too small
          }),
        ).rejects.toThrow(/File too large/);
      });
    });

    describe("CSV processing options passthrough", () => {
      it("should pass csvOptions to processor for files with extension", async () => {
        const csvPath = join(fixturesPath, "large.csv");
        const result = await FileDetector.detectAndProcess(csvPath, {
          csvOptions: {
            maxRows: 5,
            formatStyle: "raw",
          },
        });

        expect(result.type).toBe("csv");
        expect(result.metadata.rowCount).toBe(5);
      });

      it("should pass csvOptions to processor for extension-less files (fallback)", async () => {
        const extensionlessPath = join(fixturesPath, "extensionless-csv-1");
        const result = await FileDetector.detectAndProcess(extensionlessPath, {
          allowedTypes: ["csv"],
          csvOptions: {
            maxRows: 1,
            formatStyle: "json",
          },
        });

        expect(result.type).toBe("csv");
        expect(result.metadata.rowCount).toBe(1);
      });
    });
  });

  describe("Extension-less files with JSON content (FD-018)", () => {
    it("should parse extension-less JSON object file when allowedTypes includes text", async () => {
      const jsonPath = join(fixturesPath, "extensionless-json-1");
      const result = await FileDetector.detectAndProcess(jsonPath, {
        allowedTypes: ["text"],
      });

      expect(result.type).toBe("text");
      expect(result.mimeType).toBe("application/json");
      expect(result.content).toContain("users");
      expect(result.content).toContain("Alice");
    });

    it("should parse extension-less JSON array file when allowedTypes includes text", async () => {
      const jsonPath = join(fixturesPath, "extensionless-json-2");
      const result = await FileDetector.detectAndProcess(jsonPath, {
        allowedTypes: ["text"],
      });

      expect(result.type).toBe("text");
      expect(result.mimeType).toBe("application/json");
      expect(result.content).toContain("Laptop");
      expect(result.content).toContain("999.99");
    });

    it("should parse file-3 (Slack-style JSON filename) when allowedTypes includes text", async () => {
      const file3Path = join(fixturesPath, "file-3");
      const result = await FileDetector.detectAndProcess(file3Path, {
        allowedTypes: ["text"],
      });

      expect(result.type).toBe("text");
      expect(result.mimeType).toBe("application/json");
      expect(result.content).toContain("slack_message");
    });
  });

  describe("Extension-less files with XML content (FD-018)", () => {
    it("should parse extension-less XML file when allowedTypes includes text", async () => {
      const xmlPath = join(fixturesPath, "extensionless-xml");
      const result = await FileDetector.detectAndProcess(xmlPath, {
        allowedTypes: ["text"],
      });

      expect(result.type).toBe("text");
      expect(result.mimeType).toBe("application/xml");
      expect(result.content).toContain("<catalog>");
      expect(result.content).toContain("The Great Gatsby");
    });
  });

  describe("Extension-less files with YAML content (FD-018)", () => {
    it("should parse extension-less YAML file when allowedTypes includes text", async () => {
      const yamlPath = join(fixturesPath, "extensionless-yaml");
      const result = await FileDetector.detectAndProcess(yamlPath, {
        allowedTypes: ["text"],
      });

      expect(result.type).toBe("text");
      expect(result.mimeType).toBe("application/yaml");
      expect(result.content).toContain("my-application");
      expect(result.content).toContain("dependencies");
    });
  });

  describe("Multi-type fallback behavior (FD-018)", () => {
    it("should try CSV first, then text when both are in allowedTypes", async () => {
      const csvPath = join(fixturesPath, "extensionless-csv-1");
      const result = await FileDetector.detectAndProcess(csvPath, {
        allowedTypes: ["csv", "text"],
      });

      // CSV should be detected first due to content heuristics
      expect(result.type).toBe("csv");
    });

    it("should fall back to text when CSV fails for JSON content", async () => {
      const jsonPath = join(fixturesPath, "extensionless-json-1");
      const result = await FileDetector.detectAndProcess(jsonPath, {
        allowedTypes: ["csv", "text"],
      });

      // Content heuristics should detect JSON content as text/json
      expect(result.type).toBe("text");
      expect(result.mimeType).toBe("application/json");
    });

    it("should fail when no allowed type matches binary content", async () => {
      // Binary content with null bytes - can't be parsed as text
      const binaryBuffer = Buffer.from([
        0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x00, 0x00,
      ]);

      // Request image/pdf which require actual binary magic bytes
      await expect(
        FileDetector.detectAndProcess(binaryBuffer, {
          allowedTypes: ["image", "pdf"],
        }),
      ).rejects.toThrow(/fallback parsing attempts failed/);
    });
  });

  describe("Buffer input with various content types", () => {
    it("should detect JSON from Buffer content", async () => {
      const jsonBuffer = Buffer.from('{"name": "test", "value": 123}');
      const result = await FileDetector.detectAndProcess(jsonBuffer);

      expect(result.type).toBe("text");
      expect(result.mimeType).toBe("application/json");
    });

    it("should detect XML from Buffer content", async () => {
      const xmlBuffer = Buffer.from(
        '<?xml version="1.0"?><root><item>test</item></root>',
      );
      const result = await FileDetector.detectAndProcess(xmlBuffer);

      expect(result.type).toBe("text");
      expect(result.mimeType).toBe("application/xml");
    });

    it("should detect YAML from Buffer content", async () => {
      const yamlBuffer = Buffer.from("---\nname: test\nvalue: 123\n");
      const result = await FileDetector.detectAndProcess(yamlBuffer);

      expect(result.type).toBe("text");
      expect(result.mimeType).toBe("application/yaml");
    });

    it("should detect plain text from Buffer content", async () => {
      const textBuffer = Buffer.from(
        "This is just plain text content.\nWith multiple lines.",
      );
      const result = await FileDetector.detectAndProcess(textBuffer);

      expect(result.type).toBe("text");
      expect(result.mimeType).toBe("text/plain");
    });
  });

  describe("Regression tests", () => {
    it("should continue to work for normal CSV files with extensions", async () => {
      const csvPath = join(fixturesPath, "transactions.csv");
      const result = await FileDetector.detectAndProcess(csvPath, {
        allowedTypes: ["csv"],
      });

      expect(result.type).toBe("csv");
      expect(result.mimeType).toBe("text/csv");
      expect(result.metadata.rowCount).toBeGreaterThan(0);
    });

    it("should continue to work for files without allowedTypes restriction", async () => {
      const csvPath = join(fixturesPath, "basic.csv");
      const result = await FileDetector.detectAndProcess(csvPath);

      expect(result.type).toBe("csv");
    });

    it("should continue to detect PDFs correctly", async () => {
      const pdfPath = join(fixturesPath, "valid-sample.pdf");
      const result = await FileDetector.detectAndProcess(pdfPath, {
        provider: "openai", // PDF processing requires a provider
      });

      expect(result.type).toBe("pdf");
    });
  });
});
