import { describe, it, expect } from "vitest";
import type { FileType } from "../../../src/lib/types/fileTypes.js";

describe("FileType Union", () => {
  it("should include audio as a valid file type", () => {
    const audioType: FileType = "audio";
    expect(audioType).toBe("audio");
  });

  it("should include all expected file types", () => {
    const validTypes: FileType[] = [
      "csv",
      "image",
      "pdf",
      "audio",
      "text",
      "unknown",
    ];

    validTypes.forEach((type) => {
      const fileType: FileType = type;
      expect(fileType).toBe(type);
    });
  });

  it("should allow audio type assignment", () => {
    const testType = (type: FileType): string => {
      return `File type is: ${type}`;
    };

    expect(testType("audio")).toBe("File type is: audio");
  });

  it("should be type-safe (compile-time check)", () => {
    // This test verifies TypeScript compilation
    // If "audio" wasn't in the FileType union, this would fail at compile time
    const audioFile: FileType = "audio";
    const csvFile: FileType = "csv";
    const imageFile: FileType = "image";
    const pdfFile: FileType = "pdf";
    const textFile: FileType = "text";
    const unknownFile: FileType = "unknown";

    expect(audioFile).toBeDefined();
    expect(csvFile).toBeDefined();
    expect(imageFile).toBeDefined();
    expect(pdfFile).toBeDefined();
    expect(textFile).toBeDefined();
    expect(unknownFile).toBeDefined();
  });
});
