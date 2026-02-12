/**
 * FileDetector Unit Tests
 *
 * Tests for file type detection and processing, including:
 * - Extension-based detection
 * - Content-based detection
 * - CSV fallback for extension-less files (FD-018)
 * - Error handling for unsupported file types
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FileDetector } from "../../../src/lib/utils/fileDetector.js";
import { logger } from "../../../src/lib/utils/logger.js";

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

      it("should gracefully process file even when type not in allowedTypes", async () => {
        // After universal file handling: instead of throwing, the system
        // falls through to processFile() which processes the file based on
        // its detected type (CSV in this case).
        const csvPath = join(fixturesPath, "basic.csv");

        const result = await FileDetector.detectAndProcess(csvPath, {
          allowedTypes: ["pdf"],
        });
        // The file is valid CSV and gets processed as such via processFile()
        expect(result).toBeDefined();
        expect(result.type).toBe("csv");
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
      it("should gracefully process file even when type not in allowedTypes list", async () => {
        // After universal file handling: instead of throwing, the system
        // falls through to processFile() which processes the file based on
        // its detected type.
        const csvPath = join(fixturesPath, "basic.csv");

        const result = await FileDetector.detectAndProcess(csvPath, {
          allowedTypes: ["image", "pdf"],
        });
        expect(result).toBeDefined();
        expect(result.type).toBe("csv");
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

    it("should gracefully handle binary content that doesn't match any allowed type", async () => {
      // Binary content with null bytes - can't be parsed as text
      // After universal file handling: returns type "unknown" with
      // extracted metadata instead of throwing.
      const binaryBuffer = Buffer.from([
        0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x00, 0x00,
      ]);

      const result = await FileDetector.detectAndProcess(binaryBuffer, {
        allowedTypes: ["image", "pdf"],
      });
      expect(result).toBeDefined();
      expect(result.type).toBe("unknown");
      expect(typeof result.content).toBe("string");
      expect(result.content).toContain("Size:");
      expect(result.content).toContain("Header bytes:");
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

  // ================================================================
  // FILE TYPE ROUTING + CONTENT EXTRACTION:
  // Deterministic tests that verify every file type is correctly
  // detected, processed, and returns the EXACT expected content.
  // No LLM involved. Content is compared against known values from
  // the fixture files themselves.
  // ================================================================

  describe("File type routing and content extraction", () => {
    const allAllowedTypes = [
      "csv",
      "image",
      "pdf",
      "svg",
      "video",
      "audio",
      "archive",
      "xlsx",
      "docx",
      "pptx",
      "text",
    ] as const;

    const detectOpts = {
      maxSize: 100 * 1024 * 1024,
      allowedTypes: [...allAllowedTypes],
    };

    // -- Excel (.xlsx): exact structural verification -----------

    describe("Excel (.xlsx) — exact content verification", () => {
      it("detects as xlsx, not archive or unknown", async () => {
        const file = join(fixturesPath, "document", "sample.xlsx");
        const result = await FileDetector.detectAndProcess(file, detectOpts);
        expect(result.type).toBe("xlsx");
        expect(result.type).not.toBe("archive");
      });

      it("reports exactly 1 sheet, 391 rows, 5 columns", async () => {
        const file = join(fixturesPath, "document", "sample.xlsx");
        const result = await FileDetector.detectAndProcess(file, detectOpts);
        const content = result.content as string;
        expect(content).toContain("1 sheet(s)");
        expect(content).toContain("391 total rows");
        expect(content).toContain("Columns (5)");
      });

      it("extracts exact column headers: Postcode, Sales_Rep_ID, Sales_Rep_Name, Year, Value", async () => {
        const file = join(fixturesPath, "document", "sample.xlsx");
        const result = await FileDetector.detectAndProcess(file, detectOpts);
        const content = result.content as string;
        const headerLine = content
          .split("\n")
          .find((l) => l.startsWith("Columns (5):"));
        expect(headerLine).toBeDefined();
        expect(headerLine).toContain("Postcode");
        expect(headerLine).toContain("Sales_Rep_ID");
        expect(headerLine).toContain("Sales_Rep_Name");
        expect(headerLine).toContain("Year");
        expect(headerLine).toContain("Value");
      });

      it("extracts exact cell values from row 1: 2121, 456, Jane, 2011", async () => {
        const file = join(fixturesPath, "document", "sample.xlsx");
        const result = await FileDetector.detectAndProcess(file, detectOpts);
        const content = result.content as string;
        // Row data is tab-separated; find the line with 2121
        const dataLine = content
          .split("\n")
          .find((l) => l.startsWith("2121\t"));
        expect(dataLine).toBeDefined();
        expect(dataLine).toContain("456");
        expect(dataLine).toContain("Jane");
        expect(dataLine).toContain("2011");
      });

      it("does NOT return placeholder text", async () => {
        const file = join(fixturesPath, "document", "sample.xlsx");
        const result = await FileDetector.detectAndProcess(file, detectOpts);
        expect(result.content as string).not.toContain("[Spreadsheet file:");
      });

      it("xlsx buffer (no path) starts with PK magic bytes and does not crash", async () => {
        const file = join(fixturesPath, "document", "sample.xlsx");
        const buffer = await readFile(file);
        expect(buffer[0]).toBe(0x50); // P
        expect(buffer[1]).toBe(0x4b); // K
        const result = await FileDetector.detectAndProcess(buffer, detectOpts);
        // Buffer without extension: archive at 70% is the expected fallback
        expect(["archive", "xlsx"]).toContain(result.type);
      });
    });

    // -- Word (.docx): exact text verification ------------------

    describe("Word (.docx) — exact content verification", () => {
      it("detects as docx, not archive", async () => {
        const file = join(fixturesPath, "document", "sample.docx");
        const result = await FileDetector.detectAndProcess(file, detectOpts);
        expect(result.type).toBe("docx");
      });

      it("extracted text starts with 'Sample Document'", async () => {
        const file = join(fixturesPath, "document", "sample.docx");
        const result = await FileDetector.detectAndProcess(file, detectOpts);
        const content = result.content as string;
        expect(content.trimStart().startsWith("Sample Document")).toBe(true);
      });

      it("contains the heading 'Headings' and paragraph about eight section headings", async () => {
        const file = join(fixturesPath, "document", "sample.docx");
        const result = await FileDetector.detectAndProcess(file, detectOpts);
        const content = result.content as string;
        expect(content).toContain("Headings");
        expect(content).toContain("eight section headings");
      });

      it("contains the 'Lists' section", async () => {
        const file = join(fixturesPath, "document", "sample.docx");
        const result = await FileDetector.detectAndProcess(file, detectOpts);
        expect(result.content as string).toContain("Lists");
      });

      it("content is exactly 2702 characters", async () => {
        const file = join(fixturesPath, "document", "sample.docx");
        const result = await FileDetector.detectAndProcess(file, detectOpts);
        expect((result.content as string).length).toBe(2702);
      });

      it("does NOT return placeholder text", async () => {
        const file = join(fixturesPath, "document", "sample.docx");
        const result = await FileDetector.detectAndProcess(file, detectOpts);
        expect(result.content as string).not.toContain("[Document file:");
      });
    });

    // -- OpenDocument (.odt): exact text verification -----------

    describe("OpenDocument (.odt) — exact content verification", () => {
      it("detects as docx (document), not archive", async () => {
        const file = join(fixturesPath, "document", "sample.odt");
        const result = await FileDetector.detectAndProcess(file, detectOpts);
        expect(result.type).toBe("docx");
        expect(result.type).not.toBe("archive");
      });

      it("extracted text contains 'UOML Sample-en'", async () => {
        const file = join(fixturesPath, "document", "sample.odt");
        const result = await FileDetector.detectAndProcess(file, detectOpts);
        expect(result.content as string).toContain("UOML Sample-en");
      });

      it("contains UOML case studies content", async () => {
        const file = join(fixturesPath, "document", "sample.odt");
        const result = await FileDetector.detectAndProcess(file, detectOpts);
        const content = result.content as string;
        expect(content).toContain("Case studies");
        expect(content).toContain("Full text search");
      });

      it("content is exactly 12911 characters", async () => {
        const file = join(fixturesPath, "document", "sample.odt");
        const result = await FileDetector.detectAndProcess(file, detectOpts);
        expect((result.content as string).length).toBe(12911);
      });
    });

    // -- RTF (.rtf): exact text verification --------------------

    describe("RTF (.rtf) — exact content verification", () => {
      it("detects as docx (document)", async () => {
        const file = join(fixturesPath, "document", "sample.rtf");
        const result = await FileDetector.detectAndProcess(file, detectOpts);
        expect(result.type).toBe("docx");
      });

      it("extracted text contains 'example test rtf-file'", async () => {
        const file = join(fixturesPath, "document", "sample.rtf");
        const result = await FileDetector.detectAndProcess(file, detectOpts);
        expect(result.content as string).toContain("example test rtf-file");
      });

      it("contains table content: '1st column' and '2nd column'", async () => {
        const file = join(fixturesPath, "document", "sample.rtf");
        const result = await FileDetector.detectAndProcess(file, detectOpts);
        const content = result.content as string;
        expect(content).toContain("1st column");
        expect(content).toContain("2nd column");
      });

      it("content is exactly 1643 characters", async () => {
        const file = join(fixturesPath, "document", "sample.rtf");
        const result = await FileDetector.detectAndProcess(file, detectOpts);
        expect((result.content as string).length).toBe(1643);
      });
    });

    // -- Text files: byte-exact match against raw file ----------

    describe("Text files — byte-exact content match", () => {
      it(".py content is byte-exact match with fs.readFileSync", async () => {
        const file = join(fixturesPath, "code", "sample.py");
        const raw = (await readFile(file)).toString("utf-8");
        const result = await FileDetector.detectAndProcess(file, detectOpts);
        expect(result.type).toBe("text");
        expect(result.content).toBe(raw);
      });

      it(".js content is byte-exact match with fs.readFileSync", async () => {
        const file = join(fixturesPath, "code", "sample.js");
        const raw = (await readFile(file)).toString("utf-8");
        const result = await FileDetector.detectAndProcess(file, detectOpts);
        expect(result.type).toBe("text");
        expect(result.content).toBe(raw);
      });

      it(".json content is byte-exact match and valid JSON", async () => {
        const file = join(fixturesPath, "code", "sample.json");
        const raw = (await readFile(file)).toString("utf-8");
        const result = await FileDetector.detectAndProcess(file, detectOpts);
        expect(result.type).toBe("text");
        expect(result.content).toBe(raw);
        // Also verify it's valid JSON
        const parsed = JSON.parse(result.content as string);
        expect(parsed.fruit).toBe("Apple");
        expect(parsed.size).toBe("Large");
        expect(parsed.color).toBe("Red");
      });

      it(".sql content is byte-exact match", async () => {
        const file = join(fixturesPath, "code", "sample.sql");
        const raw = (await readFile(file)).toString("utf-8");
        const result = await FileDetector.detectAndProcess(file, detectOpts);
        expect(result.type).toBe("text");
        expect(result.content).toBe(raw);
      });

      it(".yaml content is byte-exact match", async () => {
        const file = join(fixturesPath, "code", "sample.yaml");
        const raw = (await readFile(file)).toString("utf-8");
        const result = await FileDetector.detectAndProcess(file, detectOpts);
        expect(result.type).toBe("text");
        expect(result.content).toBe(raw);
      });

      it(".html content is byte-exact match", async () => {
        const file = join(fixturesPath, "code", "sample.html");
        const raw = (await readFile(file)).toString("utf-8");
        const result = await FileDetector.detectAndProcess(file, detectOpts);
        expect(result.type).toBe("text");
        expect(result.content).toBe(raw);
      });

      it(".txt content is byte-exact match", async () => {
        const file = join(fixturesPath, "document", "sample.txt");
        const raw = (await readFile(file)).toString("utf-8");
        const result = await FileDetector.detectAndProcess(file, detectOpts);
        expect(result.type).toBe("text");
        expect(result.content).toBe(raw);
      });

      it(".xml content is byte-exact match", async () => {
        const file = join(
          fixturesPath,
          "document",
          "file_example_XML_24kb.xml",
        );
        const raw = (await readFile(file)).toString("utf-8");
        const result = await FileDetector.detectAndProcess(file, detectOpts);
        expect(result.type).toBe("text");
        expect(result.content).toBe(raw);
      });
    });

    // -- Video: exact metadata field verification ---------------

    describe("Video (.mp4) — exact metadata verification", () => {
      it("detects as video", async () => {
        const file = join(fixturesPath, "video", "sample_640x360.mp4");
        const result = await FileDetector.detectAndProcess(file, detectOpts);
        expect(result.type).toBe("video");
      });

      it("extracts exact duration: 13s", async () => {
        const file = join(fixturesPath, "video", "sample_640x360.mp4");
        const result = await FileDetector.detectAndProcess(file, detectOpts);
        expect(result.content as string).toContain("Duration: 13s");
      });

      it("extracts exact resolution: 640x360", async () => {
        const file = join(fixturesPath, "video", "sample_640x360.mp4");
        const result = await FileDetector.detectAndProcess(file, detectOpts);
        expect(result.content as string).toContain("Resolution: 640x360");
      });

      it("extracts exact codec: h264", async () => {
        const file = join(fixturesPath, "video", "sample_640x360.mp4");
        const result = await FileDetector.detectAndProcess(file, detectOpts);
        expect(result.content as string).toContain("Video Codec: h264");
      });

      it("extracts exact frame rate: 29.97 fps", async () => {
        const file = join(fixturesPath, "video", "sample_640x360.mp4");
        const result = await FileDetector.detectAndProcess(file, detectOpts);
        expect(result.content as string).toContain("Frame Rate: 29.97 fps");
      });

      it("extracts exact bitrate: 345 kbps", async () => {
        const file = join(fixturesPath, "video", "sample_640x360.mp4");
        const result = await FileDetector.detectAndProcess(file, detectOpts);
        expect(result.content as string).toContain("Bitrate: 345 kbps");
      });

      it("does NOT return placeholder text", async () => {
        const file = join(fixturesPath, "video", "sample_640x360.mp4");
        const result = await FileDetector.detectAndProcess(file, detectOpts);
        expect(result.content as string).not.toBe("[Video file: video]");
      });

      it(".mkv detects as video", async () => {
        const file = join(fixturesPath, "video", "sample_640x360.mkv");
        const result = await FileDetector.detectAndProcess(file, detectOpts);
        expect(result.type).toBe("video");
        expect(result.content as string).not.toBe("[Video file: video]");
      });

      it(".webm detects as video", async () => {
        const file = join(fixturesPath, "video", "sample_640x360.webm");
        const result = await FileDetector.detectAndProcess(file, detectOpts);
        expect(result.type).toBe("video");
        expect(result.content as string).not.toBe("[Video file: video]");
      });
    });

    // -- Audio: exact metadata field verification ---------------

    describe("Audio (.mp3) — exact metadata verification", () => {
      it("detects as audio", async () => {
        const file = join(fixturesPath, "audio", "sample3.mp3");
        const result = await FileDetector.detectAndProcess(file, detectOpts);
        expect(result.type).toBe("audio");
      });

      it("extracts exact codec: MPEG 1 Layer 3", async () => {
        const file = join(fixturesPath, "audio", "sample3.mp3");
        const result = await FileDetector.detectAndProcess(file, detectOpts);
        expect(result.content as string).toContain("Codec: MPEG 1 Layer 3");
      });

      it("extracts exact bitrate: 128 kbps", async () => {
        const file = join(fixturesPath, "audio", "sample3.mp3");
        const result = await FileDetector.detectAndProcess(file, detectOpts);
        expect(result.content as string).toContain("Bitrate: 128 kbps");
      });

      it("extracts exact sample rate: 44100 Hz", async () => {
        const file = join(fixturesPath, "audio", "sample3.mp3");
        const result = await FileDetector.detectAndProcess(file, detectOpts);
        expect(result.content as string).toContain("Sample Rate: 44100 Hz");
      });

      it("extracts exact channels: 2 (Stereo)", async () => {
        const file = join(fixturesPath, "audio", "sample3.mp3");
        const result = await FileDetector.detectAndProcess(file, detectOpts);
        expect(result.content as string).toContain("Channels: 2 (Stereo)");
      });

      it("extracts exact duration: 1:46", async () => {
        const file = join(fixturesPath, "audio", "sample3.mp3");
        const result = await FileDetector.detectAndProcess(file, detectOpts);
        expect(result.content as string).toContain("Duration: 1:46");
      });

      it("does NOT return placeholder text", async () => {
        const file = join(fixturesPath, "audio", "sample3.mp3");
        const result = await FileDetector.detectAndProcess(file, detectOpts);
        expect(result.content as string).not.toBe("[Audio file: audio]");
      });

      it(".wav detects as audio with metadata", async () => {
        const file = join(fixturesPath, "audio", "sample3.wav");
        const result = await FileDetector.detectAndProcess(file, detectOpts);
        expect(result.type).toBe("audio");
        expect(result.content as string).not.toBe("[Audio file: audio]");
      });

      it(".ogg detects as audio with metadata", async () => {
        const file = join(fixturesPath, "audio", "sample3.ogg");
        const result = await FileDetector.detectAndProcess(file, detectOpts);
        expect(result.type).toBe("audio");
        expect(result.content as string).not.toBe("[Audio file: audio]");
      });

      it(".flac detects as audio with metadata", async () => {
        const file = join(fixturesPath, "audio", "sample1.flac");
        const result = await FileDetector.detectAndProcess(file, detectOpts);
        expect(result.type).toBe("audio");
        expect(result.content as string).not.toBe("[Audio file: audio]");
      });
    });

    // -- Archive: exact file listing verification ---------------

    describe("Archive — exact file listing verification", () => {
      it(".tar.gz detects as archive", async () => {
        const file = join(fixturesPath, "archive", "sample.tar.gz");
        const result = await FileDetector.detectAndProcess(file, detectOpts);
        expect(result.type).toBe("archive");
      });

      it(".tar.gz lists exactly 6 entries", async () => {
        const file = join(fixturesPath, "archive", "sample.tar.gz");
        const result = await FileDetector.detectAndProcess(file, detectOpts);
        expect(result.content as string).toContain("Total entries:** 6");
      });

      it(".tar.gz lists the exact files: sample.json, sample.py, sample.txt", async () => {
        const file = join(fixturesPath, "archive", "sample.tar.gz");
        const result = await FileDetector.detectAndProcess(file, detectOpts);
        const content = result.content as string;
        expect(content).toContain("code/sample.json");
        expect(content).toContain("code/sample.py");
        expect(content).toContain("document/sample.txt");
      });

      it(".tar.gz lists exact file sizes", async () => {
        const file = join(fixturesPath, "archive", "sample.tar.gz");
        const result = await FileDetector.detectAndProcess(file, detectOpts);
        const content = result.content as string;
        expect(content).toContain("code/sample.json (60 B)");
        expect(content).toContain("code/sample.py (195 B)");
        expect(content).toContain("document/sample.txt (607 B)");
      });

      it(".zip detects as archive (not xlsx/docx)", async () => {
        const file = join(fixturesPath, "archive", "sample.zip");
        const result = await FileDetector.detectAndProcess(file, detectOpts);
        expect(result.type).toBe("archive");
        expect(result.type).not.toBe("xlsx");
        expect(result.type).not.toBe("docx");
      });
    });

    // -- ZIP-based format disambiguation (regression tests) -----

    describe("ZIP-based format disambiguation (regression)", () => {
      it(".xlsx path → xlsx, not archive", async () => {
        const result = await FileDetector.detectAndProcess(
          join(fixturesPath, "document", "sample.xlsx"),
          detectOpts,
        );
        expect(result.type).toBe("xlsx");
      });

      it(".docx path → docx, not archive", async () => {
        const result = await FileDetector.detectAndProcess(
          join(fixturesPath, "document", "sample.docx"),
          detectOpts,
        );
        expect(result.type).toBe("docx");
      });

      it(".odt path → docx, not archive", async () => {
        const result = await FileDetector.detectAndProcess(
          join(fixturesPath, "document", "sample.odt"),
          detectOpts,
        );
        expect(result.type).toBe("docx");
      });

      it(".zip path → archive, not xlsx or docx", async () => {
        const result = await FileDetector.detectAndProcess(
          join(fixturesPath, "archive", "sample.zip"),
          detectOpts,
        );
        expect(result.type).toBe("archive");
      });
    });

    // -- CSV ---------------------------------------------------

    describe("CSV — content verification", () => {
      it(".csv detects as csv with row/column metadata", async () => {
        const file = join(fixturesPath, "basic.csv");
        const result = await FileDetector.detectAndProcess(file, detectOpts);
        expect(result.type).toBe("csv");
        expect(result.metadata.rowCount).toBeGreaterThan(0);
        expect(result.metadata.columnCount).toBeGreaterThan(0);
      });

      it(".tsv detects as csv", async () => {
        const file = join(fixturesPath, "sample.tsv");
        const result = await FileDetector.detectAndProcess(file, detectOpts);
        expect(result.type).toBe("csv");
      });
    });

    // -- Image -------------------------------------------------

    describe("Image — content verification", () => {
      it(".png detects as image with base64 content > 100 chars", async () => {
        const file = join(fixturesPath, "image", "sample.png");
        const result = await FileDetector.detectAndProcess(file, detectOpts);
        expect(result.type).toBe("image");
        // ImageProcessor returns base64 string
        const contentLen =
          typeof result.content === "string"
            ? result.content.length
            : (result.content as Buffer).length;
        expect(contentLen).toBeGreaterThan(100);
      });
    });
  });
});
