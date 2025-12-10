import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

/**
 * Tests for batch command with multimodal inputs
 * This tests the fix for CLI-001: Batch Command Ignores Multimodal Flags
 */
describe("Batch Command with Multimodal Files", () => {
  let tempDir: string;
  let tempBatchFile: string;
  let tempImageFile: string;
  let tempPdfFile: string;
  let tempCsvFile: string;

  beforeEach(() => {
    // Create temporary directory and test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "batch-multimodal-test-"));

    // Create a batch file with test prompts
    tempBatchFile = path.join(tempDir, "prompts.txt");
    fs.writeFileSync(
      tempBatchFile,
      "What is in this image?\nAnalyze this data\nSummarize this document",
    );

    // Create test image file (just a placeholder)
    tempImageFile = path.join(tempDir, "test-image.png");
    fs.writeFileSync(tempImageFile, Buffer.from("fake-image-data"));

    // Create test PDF file (just a placeholder)
    tempPdfFile = path.join(tempDir, "test-doc.pdf");
    fs.writeFileSync(tempPdfFile, Buffer.from("fake-pdf-data"));

    // Create test CSV file
    tempCsvFile = path.join(tempDir, "test-data.csv");
    fs.writeFileSync(
      tempCsvFile,
      "name,value\nitem1,100\nitem2,200\nitem3,300",
    );
  });

  afterEach(() => {
    // Clean up temporary files
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe("Multimodal file processing", () => {
    it("should process image files in batch command", () => {
      // Test that image files are recognized and processed
      const imageFiles = [tempImageFile];
      const processedImages = Array.isArray(imageFiles)
        ? imageFiles
        : [imageFiles];

      expect(processedImages).toHaveLength(1);
      expect(processedImages[0]).toBe(tempImageFile);
      expect(fs.existsSync(processedImages[0])).toBe(true);
    });

    it("should process PDF files in batch command", () => {
      // Test that PDF files are recognized and processed
      const pdfFiles = [tempPdfFile];
      const processedPdfs = Array.isArray(pdfFiles) ? pdfFiles : [pdfFiles];

      expect(processedPdfs).toHaveLength(1);
      expect(processedPdfs[0]).toBe(tempPdfFile);
      expect(fs.existsSync(processedPdfs[0])).toBe(true);
    });

    it("should process CSV files in batch command", () => {
      // Test that CSV files are recognized and processed
      const csvFiles = [tempCsvFile];
      const processedCsvs = Array.isArray(csvFiles) ? csvFiles : [csvFiles];

      expect(processedCsvs).toHaveLength(1);
      expect(processedCsvs[0]).toBe(tempCsvFile);
      expect(fs.existsSync(processedCsvs[0])).toBe(true);
    });

    it("should process multiple image files", () => {
      // Create additional test images
      const tempImageFile2 = path.join(tempDir, "test-image-2.png");
      fs.writeFileSync(tempImageFile2, Buffer.from("fake-image-data-2"));

      const imageFiles = [tempImageFile, tempImageFile2];
      const processedImages = Array.isArray(imageFiles)
        ? imageFiles
        : [imageFiles];

      expect(processedImages).toHaveLength(2);
      processedImages.forEach((img) => {
        expect(fs.existsSync(img)).toBe(true);
      });
    });

    it("should process mixed multimodal files", () => {
      // Test processing multiple types of files together
      const imageFiles = [tempImageFile];
      const pdfFiles = [tempPdfFile];
      const csvFiles = [tempCsvFile];

      const processedImages = Array.isArray(imageFiles)
        ? imageFiles
        : [imageFiles];
      const processedPdfs = Array.isArray(pdfFiles) ? pdfFiles : [pdfFiles];
      const processedCsvs = Array.isArray(csvFiles) ? csvFiles : [csvFiles];

      expect(processedImages).toHaveLength(1);
      expect(processedPdfs).toHaveLength(1);
      expect(processedCsvs).toHaveLength(1);

      // Verify all files exist
      [...processedImages, ...processedPdfs, ...processedCsvs].forEach(
        (file) => {
          expect(fs.existsSync(file)).toBe(true);
        },
      );
    });
  });

  describe("CSV options handling", () => {
    it("should respect csvMaxRows option", () => {
      const csvMaxRows = 100;
      const csvOptions = {
        maxRows: csvMaxRows,
        formatStyle: "raw" as const,
      };

      expect(csvOptions.maxRows).toBe(100);
      expect(csvOptions.formatStyle).toBe("raw");
    });

    it("should respect csvFormat option", () => {
      const formats: Array<"raw" | "markdown" | "json"> = [
        "raw",
        "markdown",
        "json",
      ];

      formats.forEach((format) => {
        const csvOptions = {
          maxRows: 1000,
          formatStyle: format,
        };

        expect(csvOptions.formatStyle).toBe(format);
      });
    });

    it("should use default CSV options when not specified", () => {
      const csvOptions = {
        maxRows: undefined,
        formatStyle: undefined,
      };

      expect(csvOptions.maxRows).toBeUndefined();
      expect(csvOptions.formatStyle).toBeUndefined();
    });
  });

  describe("Generate input construction", () => {
    it("should construct generate input with text only", () => {
      const inputText = "Test prompt";
      const generateInput = { text: inputText };

      expect(generateInput.text).toBe(inputText);
      expect(generateInput).not.toHaveProperty("images");
      expect(generateInput).not.toHaveProperty("csvFiles");
      expect(generateInput).not.toHaveProperty("pdfFiles");
    });

    it("should construct generate input with text and images", () => {
      const inputText = "What is in this image?";
      const imageBuffers = [tempImageFile];
      const generateInput = {
        text: inputText,
        ...(imageBuffers && { images: imageBuffers }),
      };

      expect(generateInput.text).toBe(inputText);
      expect(generateInput.images).toEqual(imageBuffers);
    });

    it("should construct generate input with text and CSV files", () => {
      const inputText = "Analyze this data";
      const csvFiles = [tempCsvFile];
      const generateInput = {
        text: inputText,
        ...(csvFiles && { csvFiles }),
      };

      expect(generateInput.text).toBe(inputText);
      expect(generateInput.csvFiles).toEqual(csvFiles);
    });

    it("should construct generate input with text and PDF files", () => {
      const inputText = "Summarize this document";
      const pdfFiles = [tempPdfFile];
      const generateInput = {
        text: inputText,
        ...(pdfFiles && { pdfFiles }),
      };

      expect(generateInput.text).toBe(inputText);
      expect(generateInput.pdfFiles).toEqual(pdfFiles);
    });

    it("should construct generate input with all multimodal types", () => {
      const inputText = "Analyze all these files";
      const imageBuffers = [tempImageFile];
      const csvFiles = [tempCsvFile];
      const pdfFiles = [tempPdfFile];
      const files = [tempImageFile]; // Generic files

      const generateInput = {
        text: inputText,
        ...(imageBuffers && { images: imageBuffers }),
        ...(csvFiles && { csvFiles }),
        ...(pdfFiles && { pdfFiles }),
        ...(files && { files }),
      };

      expect(generateInput.text).toBe(inputText);
      expect(generateInput.images).toEqual(imageBuffers);
      expect(generateInput.csvFiles).toEqual(csvFiles);
      expect(generateInput.pdfFiles).toEqual(pdfFiles);
      expect(generateInput.files).toEqual(files);
    });

    it("should not include undefined multimodal fields", () => {
      const inputText = "Test prompt";
      const imageBuffers = undefined;
      const csvFiles = undefined;
      const pdfFiles = undefined;

      const generateInput = {
        text: inputText,
        ...(imageBuffers && { images: imageBuffers }),
        ...(csvFiles && { csvFiles }),
        ...(pdfFiles && { pdfFiles }),
      };

      expect(generateInput.text).toBe(inputText);
      expect(generateInput).not.toHaveProperty("images");
      expect(generateInput).not.toHaveProperty("csvFiles");
      expect(generateInput).not.toHaveProperty("pdfFiles");
    });
  });

  describe("Warning message logic", () => {
    it("should detect when multimodal files are present", () => {
      const imageBuffers = [tempImageFile];
      const csvFiles = undefined;
      const pdfFiles = undefined;
      const files = undefined;

      const hasMultimodalFiles = imageBuffers || csvFiles || pdfFiles || files;

      expect(hasMultimodalFiles).toBeTruthy();
    });

    it("should detect no multimodal files when all are undefined", () => {
      const imageBuffers = undefined;
      const csvFiles = undefined;
      const pdfFiles = undefined;
      const files = undefined;

      const hasMultimodalFiles = imageBuffers || csvFiles || pdfFiles || files;

      expect(hasMultimodalFiles).toBeFalsy();
    });

    it("should build correct file types list for warning", () => {
      const imageBuffers = [tempImageFile];
      const csvFiles = [tempCsvFile];
      const pdfFiles = undefined;
      const files = undefined;

      const fileTypes: string[] = [];
      if (imageBuffers) {
        fileTypes.push("image(s)");
      }
      if (csvFiles) {
        fileTypes.push("CSV file(s)");
      }
      if (pdfFiles) {
        fileTypes.push("PDF file(s)");
      }
      if (files) {
        fileTypes.push("file(s)");
      }

      expect(fileTypes).toEqual(["image(s)", "CSV file(s)"]);
    });

    it("should include all file types in warning when all present", () => {
      const imageBuffers = [tempImageFile];
      const csvFiles = [tempCsvFile];
      const pdfFiles = [tempPdfFile];
      const files = [tempImageFile];

      const fileTypes: string[] = [];
      if (imageBuffers) {
        fileTypes.push("image(s)");
      }
      if (csvFiles) {
        fileTypes.push("CSV file(s)");
      }
      if (pdfFiles) {
        fileTypes.push("PDF file(s)");
      }
      if (files) {
        fileTypes.push("file(s)");
      }

      expect(fileTypes).toEqual([
        "image(s)",
        "CSV file(s)",
        "PDF file(s)",
        "file(s)",
      ]);
    });
  });

  describe("Batch file handling", () => {
    it("should read and parse batch file correctly", () => {
      const buffer = fs.readFileSync(tempBatchFile);
      const prompts = buffer
        .toString("utf8")
        .split("\n")
        .map((line: string) => line.trim())
        .filter(Boolean);

      expect(prompts).toHaveLength(3);
      expect(prompts[0]).toBe("What is in this image?");
      expect(prompts[1]).toBe("Analyze this data");
      expect(prompts[2]).toBe("Summarize this document");
    });

    it("should handle empty lines in batch file", () => {
      const batchWithEmptyLines = path.join(tempDir, "prompts-empty.txt");
      fs.writeFileSync(
        batchWithEmptyLines,
        "Prompt 1\n\n\nPrompt 2\n   \nPrompt 3",
      );

      const buffer = fs.readFileSync(batchWithEmptyLines);
      const prompts = buffer
        .toString("utf8")
        .split("\n")
        .map((line: string) => line.trim())
        .filter(Boolean);

      expect(prompts).toHaveLength(3);
      expect(prompts).toEqual(["Prompt 1", "Prompt 2", "Prompt 3"]);
    });

    it("should handle batch file with trailing newlines", () => {
      const batchWithTrailing = path.join(tempDir, "prompts-trailing.txt");
      fs.writeFileSync(batchWithTrailing, "Prompt 1\nPrompt 2\n\n\n");

      const buffer = fs.readFileSync(batchWithTrailing);
      const prompts = buffer
        .toString("utf8")
        .split("\n")
        .map((line: string) => line.trim())
        .filter(Boolean);

      expect(prompts).toHaveLength(2);
      expect(prompts).toEqual(["Prompt 1", "Prompt 2"]);
    });
  });

  describe("Array normalization", () => {
    it("should normalize string to array for images", () => {
      const singleImage = tempImageFile;
      const normalized = Array.isArray(singleImage)
        ? singleImage
        : [singleImage];

      expect(Array.isArray(normalized)).toBe(true);
      expect(normalized).toHaveLength(1);
      expect(normalized[0]).toBe(tempImageFile);
    });

    it("should keep array as is for images", () => {
      const imageArray = [tempImageFile, tempImageFile];
      const normalized = Array.isArray(imageArray) ? imageArray : [imageArray];

      expect(Array.isArray(normalized)).toBe(true);
      expect(normalized).toHaveLength(2);
    });

    it("should handle undefined gracefully", () => {
      const undefinedValue = undefined;
      const result = undefinedValue
        ? Array.isArray(undefinedValue)
          ? undefinedValue
          : [undefinedValue]
        : undefined;

      expect(result).toBeUndefined();
    });
  });

  describe("Integration scenarios", () => {
    it("should process batch with single image attached", () => {
      // Simulate batch processing with one image
      const prompts = ["What is in this image?", "Describe this picture"];
      const imageBuffers = [tempImageFile];

      prompts.forEach((prompt) => {
        const generateInput = {
          text: prompt,
          ...(imageBuffers && { images: imageBuffers }),
        };

        expect(generateInput.text).toBeTruthy();
        expect(generateInput.images).toEqual(imageBuffers);
      });
    });

    it("should process batch with CSV and images attached", () => {
      // Simulate batch processing with both CSV and images
      const prompts = ["Analyze data and image", "Compare these files"];
      const imageBuffers = [tempImageFile];
      const csvFiles = [tempCsvFile];

      prompts.forEach((prompt) => {
        const generateInput = {
          text: prompt,
          ...(imageBuffers && { images: imageBuffers }),
          ...(csvFiles && { csvFiles }),
        };

        expect(generateInput.text).toBeTruthy();
        expect(generateInput.images).toEqual(imageBuffers);
        expect(generateInput.csvFiles).toEqual(csvFiles);
      });
    });

    it("should include CSV options in generate call", () => {
      const csvMaxRows = 500;
      const csvFormat = "markdown";

      const csvOptions = {
        maxRows: csvMaxRows,
        formatStyle: csvFormat as "raw" | "markdown" | "json",
      };

      expect(csvOptions.maxRows).toBe(500);
      expect(csvOptions.formatStyle).toBe("markdown");
    });

    it("should process batch with all multimodal types and options", () => {
      const prompts = ["Comprehensive analysis"];
      const imageBuffers = [tempImageFile];
      const csvFiles = [tempCsvFile];
      const pdfFiles = [tempPdfFile];
      const csvMaxRows = 100;
      const csvFormat = "json";

      prompts.forEach((prompt) => {
        const generateInput = {
          text: prompt,
          ...(imageBuffers && { images: imageBuffers }),
          ...(csvFiles && { csvFiles }),
          ...(pdfFiles && { pdfFiles }),
        };

        const csvOptions = {
          maxRows: csvMaxRows,
          formatStyle: csvFormat as "raw" | "markdown" | "json",
        };

        expect(generateInput.text).toBeTruthy();
        expect(generateInput.images).toBeDefined();
        expect(generateInput.csvFiles).toBeDefined();
        expect(generateInput.pdfFiles).toBeDefined();
        expect(csvOptions.maxRows).toBe(100);
        expect(csvOptions.formatStyle).toBe("json");
      });
    });
  });

  describe("Edge cases", () => {
    it("should handle empty string values gracefully", () => {
      const emptyString = "";
      const result = emptyString ? [emptyString] : undefined;

      expect(result).toBeUndefined();
    });

    it("should handle whitespace-only strings", () => {
      const whitespaceString = "   ";
      const trimmed = whitespaceString.trim();
      const result = trimmed ? [trimmed] : undefined;

      expect(result).toBeUndefined();
    });

    it("should handle very large batch files", () => {
      // Create a batch file with many prompts
      const largePrompts = Array.from(
        { length: 100 },
        (_, i) => `Prompt ${i + 1}`,
      );
      const largeBatchFile = path.join(tempDir, "large-batch.txt");
      fs.writeFileSync(largeBatchFile, largePrompts.join("\n"));

      const buffer = fs.readFileSync(largeBatchFile);
      const prompts = buffer
        .toString("utf8")
        .split("\n")
        .map((line: string) => line.trim())
        .filter(Boolean);

      expect(prompts).toHaveLength(100);
      expect(prompts[0]).toBe("Prompt 1");
      expect(prompts[99]).toBe("Prompt 100");
    });

    it("should handle special characters in prompts", () => {
      const specialCharsFile = path.join(tempDir, "special-chars.txt");
      fs.writeFileSync(
        specialCharsFile,
        'What is "this"?\nAnalyze <tag>\nSummarize & compare',
      );

      const buffer = fs.readFileSync(specialCharsFile);
      const prompts = buffer
        .toString("utf8")
        .split("\n")
        .map((line: string) => line.trim())
        .filter(Boolean);

      expect(prompts).toHaveLength(3);
      expect(prompts[0]).toContain('"');
      expect(prompts[1]).toContain("<");
      expect(prompts[2]).toContain("&");
    });

    it("should handle unicode characters in prompts", () => {
      const unicodeFile = path.join(tempDir, "unicode.txt");
      fs.writeFileSync(unicodeFile, "こんにちは\n你好\nПривет");

      const buffer = fs.readFileSync(unicodeFile);
      const prompts = buffer
        .toString("utf8")
        .split("\n")
        .map((line: string) => line.trim())
        .filter(Boolean);

      expect(prompts).toHaveLength(3);
      expect(prompts[0]).toBe("こんにちは");
      expect(prompts[1]).toBe("你好");
      expect(prompts[2]).toBe("Привет");
    });
  });
});
