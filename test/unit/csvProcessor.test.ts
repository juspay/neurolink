/**
 * CSV Processor Tests
 * Tests for delimiter detection and CSV metadata
 */

import { describe, it, expect } from "vitest";
import { CSVProcessor } from "../../src/lib/utils/csvProcessor.js";
import type { FileProcessingResult } from "../../src/lib/types/fileTypes.js";

describe("CSVProcessor - Delimiter Detection", () => {
  describe("Comma-delimited CSV", () => {
    it("should detect comma as delimiter", async () => {
      const csvContent = Buffer.from(
        "name,age,city\nAlice,30,New York\nBob,25,London\n",
      );
      const result = await CSVProcessor.process(csvContent, {
        formatStyle: "raw",
      });

      expect(result.metadata.delimiter).toBe(",");
      expect(result.metadata.columnCount).toBe(3);
    });

    it("should detect comma delimiter in JSON format", async () => {
      const csvContent = Buffer.from(
        "name,age,city\nAlice,30,New York\nBob,25,London\n",
      );
      const result = await CSVProcessor.process(csvContent, {
        formatStyle: "json",
      });

      expect(result.metadata.delimiter).toBe(",");
      expect(result.metadata.columnCount).toBe(3);
    });

    it("should detect comma delimiter in markdown format", async () => {
      const csvContent = Buffer.from(
        "name,age,city\nAlice,30,New York\nBob,25,London\n",
      );
      const result = await CSVProcessor.process(csvContent, {
        formatStyle: "markdown",
      });

      expect(result.metadata.delimiter).toBe(",");
      expect(result.metadata.columnCount).toBe(3);
    });
  });

  describe("Tab-delimited CSV (TSV)", () => {
    it("should detect tab as delimiter and escape it", async () => {
      const csvContent = Buffer.from(
        "name\tage\tcity\nAlice\t30\tNew York\nBob\t25\tLondon\n",
      );
      const result = await CSVProcessor.process(csvContent, {
        formatStyle: "raw",
      });

      expect(result.metadata.delimiter).toBe("\\t");
      expect(result.metadata.columnCount).toBe(3);
    });

    it("should detect tab delimiter in JSON format", async () => {
      const csvContent = Buffer.from(
        "name\tage\tcity\nAlice\t30\tNew York\nBob\t25\tLondon\n",
      );
      const result = await CSVProcessor.process(csvContent, {
        formatStyle: "json",
      });

      expect(result.metadata.delimiter).toBe("\\t");
      expect(result.metadata.columnCount).toBe(3);
    });
  });

  describe("Semicolon-delimited CSV", () => {
    it("should detect semicolon as delimiter", async () => {
      const csvContent = Buffer.from(
        "name;age;city\nAlice;30;New York\nBob;25;London\n",
      );
      const result = await CSVProcessor.process(csvContent, {
        formatStyle: "raw",
      });

      expect(result.metadata.delimiter).toBe(";");
      expect(result.metadata.columnCount).toBe(3);
    });

    it("should detect semicolon delimiter in JSON format", async () => {
      const csvContent = Buffer.from(
        "name;age;city\nAlice;30;New York\nBob;25;London\n",
      );
      const result = await CSVProcessor.process(csvContent, {
        formatStyle: "json",
      });

      expect(result.metadata.delimiter).toBe(";");
      expect(result.metadata.columnCount).toBe(3);
    });
  });

  describe("Pipe-delimited CSV", () => {
    it("should detect pipe as delimiter", async () => {
      const csvContent = Buffer.from(
        "name|age|city\nAlice|30|New York\nBob|25|London\n",
      );
      const result = await CSVProcessor.process(csvContent, {
        formatStyle: "raw",
      });

      expect(result.metadata.delimiter).toBe("|");
      expect(result.metadata.columnCount).toBe(3);
    });

    it("should detect pipe delimiter in JSON format", async () => {
      const csvContent = Buffer.from(
        "name|age|city\nAlice|30|New York\nBob|25|London\n",
      );
      const result = await CSVProcessor.process(csvContent, {
        formatStyle: "json",
      });

      expect(result.metadata.delimiter).toBe("|");
      expect(result.metadata.columnCount).toBe(3);
    });
  });

  describe("Edge cases", () => {
    it("should default to comma for ambiguous files", async () => {
      const csvContent = Buffer.from("singlecolumn\nvalue1\nvalue2\n");
      const result = await CSVProcessor.process(csvContent, {
        formatStyle: "raw",
      });

      expect(result.metadata.delimiter).toBe(",");
      expect(result.metadata.columnCount).toBe(1);
    });

    it("should handle empty files", async () => {
      const csvContent = Buffer.from("");
      const result = await CSVProcessor.process(csvContent, {
        formatStyle: "raw",
      });

      expect(result.metadata.delimiter).toBe(",");
    });

    it("should handle files with only headers", async () => {
      const csvContent = Buffer.from("name,age,city\n");
      const result = await CSVProcessor.process(csvContent, {
        formatStyle: "raw",
      });

      expect(result.metadata.delimiter).toBe(",");
      expect(result.metadata.columnCount).toBe(3);
    });

    it("should handle mixed delimiters (choose most consistent)", async () => {
      // File with commas in data but tabs as actual delimiter
      const csvContent = Buffer.from(
        "name\tage\tdescription\nAlice\t30\tLives in New York, USA\nBob\t25\tFrom London, UK\n",
      );
      const result = await CSVProcessor.process(csvContent, {
        formatStyle: "raw",
      });

      expect(result.metadata.delimiter).toBe("\\t");
      expect(result.metadata.columnCount).toBe(3);
    });
  });

  describe("Metadata presence", () => {
    it("should always include delimiter in metadata", async () => {
      const csvContent = Buffer.from(
        "name,age,city\nAlice,30,New York\nBob,25,London\n",
      );
      const result = await CSVProcessor.process(csvContent, {
        formatStyle: "raw",
      });

      expect(result.metadata).toHaveProperty("delimiter");
      expect(typeof result.metadata.delimiter).toBe("string");
      expect(result.metadata.delimiter).not.toBe("");
    });

    it("should include delimiter along with other metadata", async () => {
      const csvContent = Buffer.from(
        "name,age,city\nAlice,30,New York\nBob,25,London\n",
      );
      const result = await CSVProcessor.process(csvContent, {
        formatStyle: "json",
      });

      expect(result.metadata.delimiter).toBe(",");
      expect(result.metadata.rowCount).toBe(2);
      expect(result.metadata.columnCount).toBe(3);
      expect(result.metadata.columnNames).toEqual(["name", "age", "city"]);
    });
  });

  describe("Backward compatibility", () => {
    it("should not break existing CSV processing", async () => {
      const csvContent = Buffer.from(
        "name,age,city\nAlice,30,New York\nBob,25,London",
      );
      const result = await CSVProcessor.process(csvContent, {
        formatStyle: "raw",
      });

      // All existing fields should still be present
      expect(result.type).toBe("csv");
      expect(result.mimeType).toBe("text/csv");
      expect(result.metadata.confidence).toBe(100);
      expect(result.metadata.size).toBe(csvContent.length);
      expect(result.metadata.rowCount).toBe(2);
      expect(result.metadata.columnCount).toBe(3);
      expect(typeof result.content).toBe("string");
    });
  });
});
