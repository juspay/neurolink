import { describe, it, expect } from "vitest";
import { CSVProcessor } from "../../../src/lib/utils/csvProcessor.js";

describe("CSVProcessor", () => {
  const sampleCSV = `name,age,city
Alice,30,New York
Bob,25,Los Angeles
Charlie,35,Chicago`;

  describe("sampleDataFormat option", () => {
    it("should return sample data as JSON string by default (backward compatible)", async () => {
      const buffer = Buffer.from(sampleCSV);
      const result = await CSVProcessor.process(buffer, {
        formatStyle: "json",
      });

      expect(typeof result.metadata.sampleData).toBe("string");
      const parsed = JSON.parse(result.metadata.sampleData as string);
      expect(parsed).toHaveLength(3);
      expect(parsed[0]).toEqual({
        name: "Alice",
        age: "30",
        city: "New York",
      });
    });

    it("should return sample data as object array with explicit format", async () => {
      const buffer = Buffer.from(sampleCSV);
      const result = await CSVProcessor.process(buffer, {
        formatStyle: "json",
        sampleDataFormat: "object",
      });

      expect(result.metadata.sampleData).toBeInstanceOf(Array);
      const sampleData = result.metadata.sampleData as unknown[];
      expect(sampleData).toHaveLength(3);
      expect(sampleData[0]).toHaveProperty("name", "Alice");
    });

    it("should return sample data as JSON string with json format", async () => {
      const buffer = Buffer.from(sampleCSV);
      const result = await CSVProcessor.process(buffer, {
        formatStyle: "json",
        sampleDataFormat: "json",
      });

      expect(typeof result.metadata.sampleData).toBe("string");
      const parsed = JSON.parse(result.metadata.sampleData as string);
      expect(parsed).toHaveLength(3);
      expect(parsed[0].name).toBe("Alice");
    });

    it("should return sample data as CSV string with csv format", async () => {
      const buffer = Buffer.from(sampleCSV);
      const result = await CSVProcessor.process(buffer, {
        formatStyle: "json",
        sampleDataFormat: "csv",
      });

      expect(typeof result.metadata.sampleData).toBe("string");
      const csvOutput = result.metadata.sampleData as string;
      expect(csvOutput).toContain("name,age,city");
      expect(csvOutput).toContain("Alice,30,New York");
      expect(csvOutput).toContain("Bob,25,Los Angeles");
    });

    it("should return sample data as markdown table with markdown format", async () => {
      const buffer = Buffer.from(sampleCSV);
      const result = await CSVProcessor.process(buffer, {
        formatStyle: "json",
        sampleDataFormat: "markdown",
      });

      expect(typeof result.metadata.sampleData).toBe("string");
      const mdOutput = result.metadata.sampleData as string;
      expect(mdOutput).toContain("| name | age | city |");
      expect(mdOutput).toContain("| --- ");
      expect(mdOutput).toContain("| Alice | 30 | New York |");
    });

    it("should handle empty data gracefully for object format", async () => {
      const emptyCSV = "name,age,city";
      const buffer = Buffer.from(emptyCSV);
      const result = await CSVProcessor.process(buffer, {
        formatStyle: "json",
        sampleDataFormat: "object",
      });

      expect(result.metadata.sampleData).toEqual([]);
    });

    it("should handle empty data gracefully for string formats", async () => {
      const emptyCSV = "name,age,city";
      const buffer = Buffer.from(emptyCSV);

      const jsonResult = await CSVProcessor.process(buffer, {
        formatStyle: "json",
        sampleDataFormat: "json",
      });
      expect(jsonResult.metadata.sampleData).toBe("No data rows");

      const csvResult = await CSVProcessor.process(buffer, {
        formatStyle: "json",
        sampleDataFormat: "csv",
      });
      expect(csvResult.metadata.sampleData).toBe("No data rows");

      const mdResult = await CSVProcessor.process(buffer, {
        formatStyle: "json",
        sampleDataFormat: "markdown",
      });
      expect(mdResult.metadata.sampleData).toBe("No data rows");
    });

    it("should limit sample data to first 3 rows", async () => {
      const largeCSV = `id,value
1,a
2,b
3,c
4,d
5,e`;
      const buffer = Buffer.from(largeCSV);
      const result = await CSVProcessor.process(buffer, {
        formatStyle: "json",
        sampleDataFormat: "object",
      });

      const sampleData = result.metadata.sampleData as unknown[];
      expect(sampleData).toHaveLength(3);
      expect(sampleData[0]).toEqual({ id: "1", value: "a" });
      expect(sampleData[2]).toEqual({ id: "3", value: "c" });
    });

    it("should properly escape CSV values with special characters", async () => {
      const specialCSV = `name,description
"Alice","Hello, World"
"Bob","Quote: ""test"""`;
      const buffer = Buffer.from(specialCSV);
      const result = await CSVProcessor.process(buffer, {
        formatStyle: "json",
        sampleDataFormat: "csv",
      });

      const csvOutput = result.metadata.sampleData as string;
      // Verify the CSV output escapes properly
      expect(csvOutput).toContain('"Hello, World"');
      // Double quotes get escaped as "" in CSV
      expect(csvOutput).toContain('""test""');
    });

    it("should work with raw format style (no sample data)", async () => {
      const buffer = Buffer.from(sampleCSV);
      const result = await CSVProcessor.process(buffer, {
        formatStyle: "raw",
        sampleDataFormat: "object",
      });

      // Raw format doesn't include sampleData in metadata
      expect(result.metadata.sampleData).toBeUndefined();
    });
  });

  describe("toCSVString", () => {
    it("should include headers when includeHeaders is true", async () => {
      const buffer = Buffer.from(sampleCSV);
      const result = await CSVProcessor.process(buffer, {
        formatStyle: "json",
        sampleDataFormat: "csv",
        includeHeaders: true,
      });

      const csvOutput = result.metadata.sampleData as string;
      expect(csvOutput.split("\n")[0]).toBe("name,age,city");
    });

    it("should exclude headers when includeHeaders is false", async () => {
      const buffer = Buffer.from(sampleCSV);
      const result = await CSVProcessor.process(buffer, {
        formatStyle: "json",
        sampleDataFormat: "csv",
        includeHeaders: false,
      });

      const csvOutput = result.metadata.sampleData as string;
      expect(csvOutput.split("\n")[0]).toBe("Alice,30,New York");
    });
  });

  describe("empty line handling", () => {
    const csvWithEmptyLines = `name,age,city
Alice,30,New York

Bob,25,Los Angeles


Charlie,35,Chicago

`;

    describe("JSON format", () => {
      it("should skip empty lines by default", async () => {
        const buffer = Buffer.from(csvWithEmptyLines);
        const result = await CSVProcessor.process(buffer, {
          formatStyle: "json",
        });

        expect(result.metadata.rowCount).toBe(3);
        const parsed = JSON.parse(result.content);
        expect(parsed).toHaveLength(3);
        expect(parsed[0]).toEqual({
          name: "Alice",
          age: "30",
          city: "New York",
        });
        expect(parsed[1]).toEqual({
          name: "Bob",
          age: "25",
          city: "Los Angeles",
        });
        expect(parsed[2]).toEqual({
          name: "Charlie",
          age: "35",
          city: "Chicago",
        });
      });

      it("should skip empty lines when skipEmptyLines is true", async () => {
        const buffer = Buffer.from(csvWithEmptyLines);
        const result = await CSVProcessor.process(buffer, {
          formatStyle: "json",
          skipEmptyLines: true,
        });

        expect(result.metadata.rowCount).toBe(3);
        const parsed = JSON.parse(result.content);
        expect(parsed).toHaveLength(3);
        expect(parsed.every((row) => Object.keys(row).length > 0)).toBe(true);
      });

      it("should preserve empty lines when skipEmptyLines is false", async () => {
        const buffer = Buffer.from(csvWithEmptyLines);
        const result = await CSVProcessor.process(buffer, {
          formatStyle: "json",
          skipEmptyLines: false,
        });

        expect(result.metadata.rowCount).toBe(7);
        const parsed = JSON.parse(result.content);
        expect(parsed).toHaveLength(7);
        // Check that some rows are empty objects
        expect(parsed[1]).toEqual({});
        expect(parsed[3]).toEqual({});
        expect(parsed[4]).toEqual({});
        expect(parsed[6]).toEqual({});
      });

      it("should handle CSV with only empty lines", async () => {
        const emptyCSV = `name,age,city


`;
        const buffer = Buffer.from(emptyCSV);
        const result = await CSVProcessor.process(buffer, {
          formatStyle: "json",
          skipEmptyLines: true,
        });

        expect(result.metadata.rowCount).toBe(0);
        expect(result.content).toContain(
          "CSV file is empty or contains no data",
        );
      });
    });

    describe("raw format", () => {
      it("should skip empty lines by default in raw format", async () => {
        const buffer = Buffer.from(csvWithEmptyLines);
        const result = await CSVProcessor.process(buffer, {
          formatStyle: "raw",
        });

        expect(result.metadata.rowCount).toBe(3);
        const lines = result.content.split("\n").filter((line) => line.trim());
        expect(lines).toHaveLength(4); // header + 3 data rows
        expect(result.content).toContain("Alice,30,New York");
        expect(result.content).toContain("Bob,25,Los Angeles");
        expect(result.content).toContain("Charlie,35,Chicago");
      });

      it("should skip empty lines when skipEmptyLines is true in raw format", async () => {
        const buffer = Buffer.from(csvWithEmptyLines);
        const result = await CSVProcessor.process(buffer, {
          formatStyle: "raw",
          skipEmptyLines: true,
        });

        expect(result.metadata.rowCount).toBe(3);
        // Count non-empty lines in output
        const nonEmptyLines = result.content
          .split("\n")
          .filter((line) => line.trim() !== "");
        expect(nonEmptyLines).toHaveLength(4); // header + 3 data rows
      });

      it("should preserve empty lines when skipEmptyLines is false in raw format", async () => {
        const buffer = Buffer.from(csvWithEmptyLines);
        const result = await CSVProcessor.process(buffer, {
          formatStyle: "raw",
          skipEmptyLines: false,
        });

        // With preserving empty lines, we get more rows
        expect(result.metadata.rowCount).toBeGreaterThan(3);
        const lines = result.content.split("\n");
        // Should contain empty lines
        expect(lines.some((line) => line.trim() === "")).toBe(true);
      });

      it("should handle consecutive empty lines", async () => {
        const csvWithConsecutiveEmpty = `name,value


data1,100


data2,200`;
        const buffer = Buffer.from(csvWithConsecutiveEmpty);
        const result = await CSVProcessor.process(buffer, {
          formatStyle: "raw",
          skipEmptyLines: true,
        });

        expect(result.metadata.rowCount).toBe(2);
        const lines = result.content.split("\n").filter((line) => line.trim());
        expect(lines).toHaveLength(3); // header + 2 data rows
      });
    });

    describe("markdown format", () => {
      it("should skip empty lines in markdown format", async () => {
        const buffer = Buffer.from(csvWithEmptyLines);
        const result = await CSVProcessor.process(buffer, {
          formatStyle: "markdown",
          skipEmptyLines: true,
        });

        expect(result.metadata.rowCount).toBe(3);
        const mdLines = result.content.split("\n");
        // Should have header + separator + 3 data rows
        expect(
          mdLines.filter((line) => line.trim().startsWith("|")),
        ).toHaveLength(5);
      });

      it("should preserve empty lines in markdown format when disabled", async () => {
        const buffer = Buffer.from(csvWithEmptyLines);
        const result = await CSVProcessor.process(buffer, {
          formatStyle: "markdown",
          skipEmptyLines: false,
        });

        expect(result.metadata.rowCount).toBe(7);
        // Should have more rows due to empty entries
        const mdLines = result.content.split("\n");
        expect(
          mdLines.filter((line) => line.trim().startsWith("|")),
        ).toHaveLength(9);
      });
    });

    describe("edge cases", () => {
      it("should handle CSV with whitespace-only lines", async () => {
        const csvWithWhitespace = `name,age
Alice,30
   
Bob,25
		
Charlie,35`;
        const buffer = Buffer.from(csvWithWhitespace);
        const result = await CSVProcessor.process(buffer, {
          formatStyle: "json",
          skipEmptyLines: true,
        });

        expect(result.metadata.rowCount).toBe(3);
        const parsed = JSON.parse(result.content);
        expect(parsed).toHaveLength(3);
      });

      it("should handle CSV with trailing empty lines", async () => {
        const csvWithTrailing = `name,age
Alice,30
Bob,25


`;
        const buffer = Buffer.from(csvWithTrailing);
        const result = await CSVProcessor.process(buffer, {
          formatStyle: "json",
          skipEmptyLines: true,
        });

        expect(result.metadata.rowCount).toBe(2);
      });

      it("should handle CSV with leading empty lines after header", async () => {
        const csvWithLeading = `name,age


Alice,30
Bob,25`;
        const buffer = Buffer.from(csvWithLeading);
        const result = await CSVProcessor.process(buffer, {
          formatStyle: "json",
          skipEmptyLines: true,
        });

        expect(result.metadata.rowCount).toBe(2);
      });

      it("should handle rows with some empty fields vs completely empty rows", async () => {
        const csvMixed = `name,age,city
Alice,,New York

Bob,25,
Charlie,35,Chicago`;
        const buffer = Buffer.from(csvMixed);
        const result = await CSVProcessor.process(buffer, {
          formatStyle: "json",
          skipEmptyLines: true,
        });

        // Rows with some values should be preserved
        expect(result.metadata.rowCount).toBe(3);
        const parsed = JSON.parse(result.content);
        expect(parsed).toHaveLength(3);
        expect(parsed[0].name).toBe("Alice");
        expect(parsed[1].name).toBe("Bob");
        expect(parsed[2].name).toBe("Charlie");
      });
    });
  });
});
