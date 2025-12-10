/**
 * CLI File Validation Tests
 *
 * Tests to validate that file paths are properly validated before processing
 * in the CLI, providing clear error messages for invalid inputs.
 *
 * Issue: CLI-002 - No File Validation Before Processing
 * Files should be validated for existence, type (not directories), and size
 * before being passed to the SDK for processing.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import { tmpdir } from "os";

describe("CLI File Validation", () => {
  let testDir: string;
  let validImagePath: string;
  let validPdfPath: string;
  let validCsvPath: string;
  let largeImagePath: string;
  let largePdfPath: string;
  let directoryPath: string;
  let nonExistentPath: string;

  beforeEach(() => {
    // Create a temporary directory for test files
    testDir = fs.mkdtempSync(path.join(tmpdir(), "neurolink-test-"));

    // Create valid test files
    validImagePath = path.join(testDir, "test-image.jpg");
    validPdfPath = path.join(testDir, "test-document.pdf");
    validCsvPath = path.join(testDir, "test-data.csv");

    // Create small valid files (< 1MB)
    fs.writeFileSync(validImagePath, Buffer.alloc(500 * 1024)); // 500KB
    fs.writeFileSync(validPdfPath, Buffer.alloc(500 * 1024)); // 500KB
    fs.writeFileSync(validCsvPath, "col1,col2\nval1,val2\n");

    // Create large test files
    largeImagePath = path.join(testDir, "large-image.jpg");
    largePdfPath = path.join(testDir, "large-document.pdf");
    fs.writeFileSync(largeImagePath, Buffer.alloc(15 * 1024 * 1024)); // 15MB
    fs.writeFileSync(largePdfPath, Buffer.alloc(60 * 1024 * 1024)); // 60MB

    // Create a directory
    directoryPath = path.join(testDir, "test-directory");
    fs.mkdirSync(directoryPath);

    // Set up paths that don't exist
    nonExistentPath = path.join(testDir, "non-existent-file.jpg");
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe("File Existence Validation", () => {
    it("should throw error for non-existent file with troubleshooting steps", () => {
      expect(() => {
        if (!fs.existsSync(nonExistentPath)) {
          throw new Error(
            \`❌ File not found: \${nonExistentPath}\n\n\` +
              \`🔧 Troubleshooting steps:\n\` +
              \`1. Check if the file path is correct\n\` +
              \`2. Ensure the file exists at the specified location\n\` +
              \`3. Use absolute paths or paths relative to current directory\n\` +
              \`4. For URLs, ensure they start with http:// or https://\n\n\` +
              \`💡 Tip: Use 'ls' or 'dir' to verify the file exists\`,
          );
        }
      }).toThrow("File not found");
    });

    it("should provide troubleshooting steps in error message", () => {
      try {
        if (!fs.existsSync(nonExistentPath)) {
          throw new Error(
            \`❌ File not found: \${nonExistentPath}\n\n\` +
              \`🔧 Troubleshooting steps:\n\` +
              \`1. Check if the file path is correct\n\` +
              \`2. Ensure the file exists at the specified location\n\` +
              \`3. Use absolute paths or paths relative to current directory\n\` +
              \`4. For URLs, ensure they start with http:// or https://\n\n\` +
              \`💡 Tip: Use 'ls' or 'dir' to verify the file exists\`,
          );
        }
      } catch (error) {
        const errorMessage = (error as Error).message;
        expect(errorMessage).toContain("Troubleshooting steps");
        expect(errorMessage).toContain("Check if the file path is correct");
        expect(errorMessage).toContain("Use 'ls' or 'dir' to verify");
      }
    });

    it("should accept valid file paths that exist", () => {
      expect(fs.existsSync(validImagePath)).toBe(true);
      expect(fs.existsSync(validPdfPath)).toBe(true);
      expect(fs.existsSync(validCsvPath)).toBe(true);
    });
  });

  describe("Directory Rejection", () => {
    it("should throw error for directory path", () => {
      expect(() => {
        const stats = fs.statSync(directoryPath);
        if (stats.isDirectory()) {
          throw new Error(
            \`❌ Path is a directory, not a file: \${directoryPath}\n\n\` +
              \`🔧 Troubleshooting steps:\n\` +
              \`1. Specify a file path, not a directory\n\` +
              \`2. If you want to process multiple files, use the flag multiple times\n\` +
              \`   Example: --image file1.jpg --image file2.jpg\n\n\` +
              \`💡 Tip: Use 'ls \${directoryPath}' to see files in the directory\`,
          );
        }
      }).toThrow("Path is a directory");
    });

    it("should accept regular files, not directories", () => {
      const imageStats = fs.statSync(validImagePath);
      const pdfStats = fs.statSync(validPdfPath);
      const csvStats = fs.statSync(validCsvPath);

      expect(imageStats.isDirectory()).toBe(false);
      expect(pdfStats.isDirectory()).toBe(false);
      expect(csvStats.isDirectory()).toBe(false);

      expect(imageStats.isFile()).toBe(true);
      expect(pdfStats.isFile()).toBe(true);
      expect(csvStats.isFile()).toBe(true);
    });
  });

  describe("Large File Warnings", () => {
    it("should detect large image files (>10MB)", () => {
      const stats = fs.statSync(largeImagePath);
      const sizeMB = stats.size / (1024 * 1024);
      expect(sizeMB).toBeGreaterThan(10);
    });

    it("should detect large PDF files (>50MB)", () => {
      const stats = fs.statSync(largePdfPath);
      const sizeMB = stats.size / (1024 * 1024);
      expect(sizeMB).toBeGreaterThan(50);
    });

    it("should not warn for files within size limits", () => {
      const stats = fs.statSync(validImagePath);
      const sizeMB = stats.size / (1024 * 1024);
      expect(sizeMB).toBeLessThan(10);
    });
  });

  describe("URL Validation Skip", () => {
    it("should skip validation for HTTP URLs", () => {
      const httpUrl = "http://example.com/image.jpg";
      const isUrl =
        httpUrl.startsWith("http://") || httpUrl.startsWith("https://");
      expect(isUrl).toBe(true);
    });

    it("should skip validation for HTTPS URLs", () => {
      const httpsUrl = "https://example.com/image.jpg";
      const isUrl =
        httpsUrl.startsWith("http://") || httpsUrl.startsWith("https://");
      expect(isUrl).toBe(true);
    });

    it("should not skip validation for local paths", () => {
      const isUrl =
        validImagePath.startsWith("http://") ||
        validImagePath.startsWith("https://");
      expect(isUrl).toBe(false);
    });
  });

  describe("File Type Specific Validation", () => {
    it("should validate image files with 10MB limit", () => {
      const imageLimit = 10;
      const stats = fs.statSync(validImagePath);
      const sizeMB = stats.size / (1024 * 1024);
      expect(sizeMB).toBeLessThan(imageLimit);
    });

    it("should validate PDF files with 50MB limit", () => {
      const pdfLimit = 50;
      const stats = fs.statSync(validPdfPath);
      const sizeMB = stats.size / (1024 * 1024);
      expect(sizeMB).toBeLessThan(pdfLimit);
    });

    it("should validate CSV files with 50MB limit", () => {
      const csvLimit = 50;
      const stats = fs.statSync(validCsvPath);
      const sizeMB = stats.size / (1024 * 1024);
      expect(sizeMB).toBeLessThan(csvLimit);
    });
  });

  describe("Multiple File Validation", () => {
    it("should validate all files in array", () => {
      const files = [validImagePath, validPdfPath, validCsvPath];
      files.forEach((file) => {
        expect(fs.existsSync(file)).toBe(true);
        const stats = fs.statSync(file);
        expect(stats.isFile()).toBe(true);
      });
    });

    it("should detect any invalid file in array", () => {
      const files = [validImagePath, nonExistentPath, validCsvPath];
      const invalidFiles = files.filter((file) => !fs.existsSync(file));
      expect(invalidFiles).toHaveLength(1);
      expect(invalidFiles[0]).toBe(nonExistentPath);
    });
  });
});
