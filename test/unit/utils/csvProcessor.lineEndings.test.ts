import { describe, it, expect } from "vitest";
import { CSVProcessor } from "../../../src/lib/utils/csvProcessor.js";

describe("CSV Line Ending Support (Issue #364)", () => {
  describe("Unix Line Endings (\\n)", () => {
    it("should process CSV with Unix line endings in raw format", async () => {
      const csvContent = "name,age,city\nAlice,30,NYC\nBob,25,LA";
      const result = await CSVProcessor.process(Buffer.from(csvContent), {
        formatStyle: "raw",
      });

      expect(result.content).toBe(csvContent);
      expect(result.metadata.rowCount).toBe(2);
      expect(result.type).toBe("csv");
    });

    it("should process CSV with Unix line endings in JSON format", async () => {
      const csvContent = "name,age,city\nAlice,30,NYC\nBob,25,LA";
      const result = await CSVProcessor.process(Buffer.from(csvContent), {
        formatStyle: "json",
      });

      const parsed = JSON.parse(result.content);
      expect(parsed).toHaveLength(2);
      expect(parsed[0]).toEqual({ name: "Alice", age: "30", city: "NYC" });
      expect(result.metadata.rowCount).toBe(2);
    });

    it("should process CSV with Unix line endings in markdown format", async () => {
      const csvContent = "name,age,city\nAlice,30,NYC\nBob,25,LA";
      const result = await CSVProcessor.process(Buffer.from(csvContent), {
        formatStyle: "markdown",
      });

      expect(result.content).toContain("| name | age | city |");
      expect(result.content).toContain("| Alice | 30 | NYC |");
      expect(result.content).toContain("| Bob | 25 | LA |");
      expect(result.metadata.rowCount).toBe(2);
    });
  });

  describe("Windows Line Endings (\\r\\n)", () => {
    it("should process CSV with Windows line endings in raw format", async () => {
      const csvContent = "name,age,city\r\nAlice,30,NYC\r\nBob,25,LA";
      const result = await CSVProcessor.process(Buffer.from(csvContent), {
        formatStyle: "raw",
      });

      // Raw format normalizes to Unix line endings
      expect(result.content).toBe("name,age,city\nAlice,30,NYC\nBob,25,LA");
      expect(result.metadata.rowCount).toBe(2);
      expect(result.type).toBe("csv");
    });

    it("should process CSV with Windows line endings in JSON format", async () => {
      const csvContent = "name,age,city\r\nAlice,30,NYC\r\nBob,25,LA";
      const result = await CSVProcessor.process(Buffer.from(csvContent), {
        formatStyle: "json",
      });

      const parsed = JSON.parse(result.content);
      expect(parsed).toHaveLength(2);
      expect(parsed[0]).toEqual({ name: "Alice", age: "30", city: "NYC" });
      expect(result.metadata.rowCount).toBe(2);
    });

    it("should process CSV with Windows line endings in markdown format", async () => {
      const csvContent = "name,age,city\r\nAlice,30,NYC\r\nBob,25,LA";
      const result = await CSVProcessor.process(Buffer.from(csvContent), {
        formatStyle: "markdown",
      });

      expect(result.content).toContain("| name | age | city |");
      expect(result.content).toContain("| Alice | 30 | NYC |");
      expect(result.content).toContain("| Bob | 25 | LA |");
      expect(result.metadata.rowCount).toBe(2);
    });
  });

  describe("Mac Line Endings (\\r)", () => {
    it("should process CSV with Mac line endings in raw format", async () => {
      const csvContent = "name,age,city\rAlice,30,NYC\rBob,25,LA";
      const result = await CSVProcessor.process(Buffer.from(csvContent), {
        formatStyle: "raw",
      });

      // Raw format normalizes to Unix line endings
      expect(result.content).toBe("name,age,city\nAlice,30,NYC\nBob,25,LA");
      expect(result.metadata.rowCount).toBe(2);
      expect(result.type).toBe("csv");
    });

    it("should process CSV with Mac line endings in JSON format", async () => {
      const csvContent = "name,age,city\rAlice,30,NYC\rBob,25,LA";
      const result = await CSVProcessor.process(Buffer.from(csvContent), {
        formatStyle: "json",
      });

      const parsed = JSON.parse(result.content);
      expect(parsed).toHaveLength(2);
      expect(parsed[0]).toEqual({ name: "Alice", age: "30", city: "NYC" });
      expect(result.metadata.rowCount).toBe(2);
    });

    it("should process CSV with Mac line endings in markdown format", async () => {
      const csvContent = "name,age,city\rAlice,30,NYC\rBob,25,LA";
      const result = await CSVProcessor.process(Buffer.from(csvContent), {
        formatStyle: "markdown",
      });

      expect(result.content).toContain("| name | age | city |");
      expect(result.content).toContain("| Alice | 30 | NYC |");
      expect(result.content).toContain("| Bob | 25 | LA |");
      expect(result.metadata.rowCount).toBe(2);
    });
  });

  describe("Edge Cases", () => {
    it("should handle CSV with empty lines (Unix)", async () => {
      const csvContent = "name,age\n\nAlice,30\n\nBob,25\n";
      const result = await CSVProcessor.process(Buffer.from(csvContent), {
        formatStyle: "json",
      });

      const parsed = JSON.parse(result.content);
      expect(parsed).toHaveLength(2);
      expect(parsed[0]).toEqual({ name: "Alice", age: "30" });
    });

    it("should handle CSV with quoted fields containing line breaks", async () => {
      const csvContent = 'name,description\nAlice,"Line 1\nLine 2"\nBob,"Single line"';
      const result = await CSVProcessor.process(Buffer.from(csvContent), {
        formatStyle: "json",
      });

      const parsed = JSON.parse(result.content);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].description).toContain("Line 1");
    });

    it("should handle mixed line endings gracefully", async () => {
      // While not ideal, the processor should handle this without crashing
      const csvContent = "name,age\nAlice,30\r\nBob,25\rCharlie,35";
      const result = await CSVProcessor.process(Buffer.from(csvContent), {
        formatStyle: "json",
      });

      const parsed = JSON.parse(result.content);
      // Should parse at least some rows successfully
      expect(parsed.length).toBeGreaterThan(0);
    });

    it("should strip \\r from markdown table cells", async () => {
      const csvContent = "name,city\r\nAlice,NYC\r\nBob,LA";
      const result = await CSVProcessor.process(Buffer.from(csvContent), {
        formatStyle: "markdown",
      });

      // Ensure no \r characters in the output
      expect(result.content).not.toContain("\r");
      expect(result.content).toContain("| Alice | NYC |");
      expect(result.content).toContain("| Bob | LA |");
    });
  });
});
