/**
 * Path Resolution Tests for CLI
 *
 * Tests for the path resolution functionality in CLI file processing methods.
 * Verifies that relative paths are correctly resolved to absolute paths
 * while URLs are preserved unchanged.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, rm, writeFile } from "fs/promises";
import path from "path";
import os from "os";

// Import the CLICommandFactory to test actual file processing methods
import { CLICommandFactory } from "../../../src/cli/factories/commandFactory.js";

describe("CLI Path Resolution Integration", () => {
  const originalCwd = process.cwd();
  const testDir = path.join(os.tmpdir(), "neurolink-path-test");

  beforeEach(async () => {
    // Create a test directory structure
    await mkdir(testDir, { recursive: true });
    await mkdir(`${testDir}/images`, { recursive: true });
    await mkdir(`${testDir}/data`, { recursive: true });

    // Create test files
    await writeFile(`${testDir}/images/chart.png`, "fake png data");
    await writeFile(`${testDir}/data/report.pdf`, "fake pdf data");
    await writeFile(`${testDir}/data.csv`, "name,value\na,1\nb,2");

    // Change to test directory
    process.chdir(testDir);
  });

  afterEach(async () => {
    // Restore original directory
    process.chdir(originalCwd);

    // Clean up test directory
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("processCliImages path resolution", () => {
    it("should resolve relative path with ./ prefix", () => {
      const result =
        CLICommandFactory["processCliImages"]("./images/chart.png");
      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result?.[0]).toBe(path.resolve(process.cwd(), "images/chart.png"));
    });

    it("should resolve relative path without ./ prefix", () => {
      const result = CLICommandFactory["processCliImages"]("images/chart.png");
      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result?.[0]).toBe(path.resolve(process.cwd(), "images/chart.png"));
    });

    it("should preserve http URLs unchanged", () => {
      const result = CLICommandFactory["processCliImages"](
        "http://example.com/image.jpg",
      );
      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result?.[0]).toBe("http://example.com/image.jpg");
    });

    it("should preserve https URLs unchanged", () => {
      const result = CLICommandFactory["processCliImages"](
        "https://example.com/image.png",
      );
      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result?.[0]).toBe("https://example.com/image.png");
    });

    it("should preserve data URIs unchanged", () => {
      const dataUri =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
      const result = CLICommandFactory["processCliImages"](dataUri);
      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result?.[0]).toBe(dataUri);
    });

    it("should preserve file:// URLs unchanged", () => {
      const fileUrl = "file:///home/user/image.jpg";
      const result = CLICommandFactory["processCliImages"](fileUrl);
      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result?.[0]).toBe(fileUrl);
    });

    it("should preserve absolute paths unchanged", () => {
      // Use a dynamically generated absolute path for cross-platform compatibility
      const absolutePath = path.resolve("/", "home", "user", "image.jpg");
      const result = CLICommandFactory["processCliImages"](absolutePath);
      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result?.[0]).toBe(absolutePath);
    });

    it("should handle array of relative paths", () => {
      const result = CLICommandFactory["processCliImages"]([
        "./images/chart.png",
        "images/chart.png",
      ]);
      expect(result).toBeDefined();
      expect(result).toHaveLength(2);
      expect(result?.[0]).toBe(path.resolve(process.cwd(), "images/chart.png"));
      expect(result?.[1]).toBe(path.resolve(process.cwd(), "images/chart.png"));
    });

    it("should handle mixed paths (relative, absolute, URL)", () => {
      const absolutePath = path.resolve("/", "absolute", "path", "image.jpg");
      const result = CLICommandFactory["processCliImages"]([
        "./images/chart.png",
        absolutePath,
        "https://example.com/image.png",
      ]);
      expect(result).toBeDefined();
      expect(result).toHaveLength(3);
      expect(result?.[0]).toBe(path.resolve(process.cwd(), "images/chart.png"));
      expect(result?.[1]).toBe(absolutePath);
      expect(result?.[2]).toBe("https://example.com/image.png");
    });

    it("should return undefined for undefined input", () => {
      const result = CLICommandFactory["processCliImages"](undefined);
      expect(result).toBeUndefined();
    });

    it("should return empty array for empty array input", () => {
      const result = CLICommandFactory["processCliImages"]([]);
      expect(result).toBeDefined();
      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });
  });

  describe("processCliCSVFiles path resolution", () => {
    it("should resolve relative path with ./ prefix", () => {
      const result = CLICommandFactory["processCliCSVFiles"]("./data.csv");
      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result?.[0]).toBe(path.resolve(process.cwd(), "data.csv"));
    });

    it("should resolve relative path without ./ prefix", () => {
      const result = CLICommandFactory["processCliCSVFiles"]("data.csv");
      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result?.[0]).toBe(path.resolve(process.cwd(), "data.csv"));
    });

    it("should preserve http URLs unchanged", () => {
      const result = CLICommandFactory["processCliCSVFiles"](
        "http://example.com/data.csv",
      );
      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result?.[0]).toBe("http://example.com/data.csv");
    });

    it("should preserve absolute paths unchanged", () => {
      const absolutePath = path.resolve("/", "home", "user", "data.csv");
      const result = CLICommandFactory["processCliCSVFiles"](absolutePath);
      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result?.[0]).toBe(absolutePath);
    });

    it("should handle array of relative paths", () => {
      const result = CLICommandFactory["processCliCSVFiles"]([
        "./data.csv",
        "data.csv",
      ]);
      expect(result).toBeDefined();
      expect(result).toHaveLength(2);
      expect(result?.[0]).toBe(path.resolve(process.cwd(), "data.csv"));
      expect(result?.[1]).toBe(path.resolve(process.cwd(), "data.csv"));
    });

    it("should return undefined for undefined input", () => {
      const result = CLICommandFactory["processCliCSVFiles"](undefined);
      expect(result).toBeUndefined();
    });
  });

  describe("processCliPDFFiles path resolution", () => {
    it("should resolve relative path with ./ prefix", () => {
      const result =
        CLICommandFactory["processCliPDFFiles"]("./data/report.pdf");
      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result?.[0]).toBe(path.resolve(process.cwd(), "data/report.pdf"));
    });

    it("should resolve relative path without ./ prefix", () => {
      const result = CLICommandFactory["processCliPDFFiles"]("data/report.pdf");
      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result?.[0]).toBe(path.resolve(process.cwd(), "data/report.pdf"));
    });

    it("should preserve http URLs unchanged", () => {
      const result = CLICommandFactory["processCliPDFFiles"](
        "http://example.com/report.pdf",
      );
      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result?.[0]).toBe("http://example.com/report.pdf");
    });

    it("should preserve absolute paths unchanged", () => {
      const absolutePath = path.resolve("/", "home", "user", "report.pdf");
      const result = CLICommandFactory["processCliPDFFiles"](absolutePath);
      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result?.[0]).toBe(absolutePath);
    });

    it("should return undefined for undefined input", () => {
      const result = CLICommandFactory["processCliPDFFiles"](undefined);
      expect(result).toBeUndefined();
    });
  });

  describe("processCliFiles path resolution", () => {
    it("should resolve relative path with ./ prefix", () => {
      const result = CLICommandFactory["processCliFiles"]("./data.csv");
      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result?.[0]).toBe(path.resolve(process.cwd(), "data.csv"));
    });

    it("should resolve relative path without ./ prefix", () => {
      const result = CLICommandFactory["processCliFiles"]("data.csv");
      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result?.[0]).toBe(path.resolve(process.cwd(), "data.csv"));
    });

    it("should preserve http URLs unchanged", () => {
      const result = CLICommandFactory["processCliFiles"](
        "http://example.com/file.csv",
      );
      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result?.[0]).toBe("http://example.com/file.csv");
    });

    it("should preserve absolute paths unchanged", () => {
      const absolutePath = path.resolve("/", "home", "user", "file.csv");
      const result = CLICommandFactory["processCliFiles"](absolutePath);
      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result?.[0]).toBe(absolutePath);
    });

    it("should handle array of mixed file types", () => {
      const result = CLICommandFactory["processCliFiles"]([
        "./data.csv",
        "./images/chart.png",
        "./data/report.pdf",
      ]);
      expect(result).toBeDefined();
      expect(result).toHaveLength(3);
      expect(result?.[0]).toBe(path.resolve(process.cwd(), "data.csv"));
      expect(result?.[1]).toBe(path.resolve(process.cwd(), "images/chart.png"));
      expect(result?.[2]).toBe(path.resolve(process.cwd(), "data/report.pdf"));
    });

    it("should return undefined for undefined input", () => {
      const result = CLICommandFactory["processCliFiles"](undefined);
      expect(result).toBeUndefined();
    });
  });

  describe("processCliVideoFiles path resolution", () => {
    it("should resolve relative path with ./ prefix", () => {
      const result = CLICommandFactory["processCliVideoFiles"]("./video.mp4");
      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result?.[0]).toBe(path.resolve(process.cwd(), "video.mp4"));
    });

    it("should resolve relative path without ./ prefix", () => {
      const result = CLICommandFactory["processCliVideoFiles"]("video.mp4");
      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result?.[0]).toBe(path.resolve(process.cwd(), "video.mp4"));
    });

    it("should preserve http URLs unchanged", () => {
      const result = CLICommandFactory["processCliVideoFiles"](
        "http://example.com/video.mp4",
      );
      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result?.[0]).toBe("http://example.com/video.mp4");
    });

    it("should preserve absolute paths unchanged", () => {
      const absolutePath = path.resolve("/", "home", "user", "video.mp4");
      const result = CLICommandFactory["processCliVideoFiles"](absolutePath);
      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result?.[0]).toBe(absolutePath);
    });

    it("should return undefined for undefined input", () => {
      const result = CLICommandFactory["processCliVideoFiles"](undefined);
      expect(result).toBeUndefined();
    });
  });

  describe("Edge Cases", () => {
    it("should handle paths with spaces", () => {
      const result = CLICommandFactory["processCliFiles"](
        "./my folder/file.csv",
      );
      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result?.[0]).toBe(
        path.resolve(process.cwd(), "my folder/file.csv"),
      );
    });

    it("should handle URL with query parameters", () => {
      const result = CLICommandFactory["processCliImages"](
        "https://example.com/image.jpg?width=200",
      );
      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result?.[0]).toBe("https://example.com/image.jpg?width=200");
    });

    it("should handle URL with port number", () => {
      const result = CLICommandFactory["processCliFiles"](
        "http://localhost:8080/api/file.csv",
      );
      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result?.[0]).toBe("http://localhost:8080/api/file.csv");
    });

    it("should handle deeply nested relative paths", () => {
      const result = CLICommandFactory["processCliFiles"]("./data/../data.csv");
      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result?.[0]).toBe(path.resolve(process.cwd(), "data.csv"));
    });

    it("should handle empty string input", () => {
      // Empty string input is treated as no files being provided
      const result = CLICommandFactory["processCliFiles"]("");
      expect(result).toBeUndefined();
    });

    it("should handle whitespace-only input", () => {
      // Whitespace-only strings are normalized to empty string for consistent handling
      const result = CLICommandFactory["processCliFiles"]("   ");
      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result?.[0]).toBe("");
    });

    it("should handle case-insensitive URL protocols", () => {
      // URL detection should be case-insensitive
      const httpResult = CLICommandFactory["processCliImages"](
        "HTTP://example.com/image.jpg",
      );
      expect(httpResult).toBeDefined();
      expect(httpResult).toHaveLength(1);
      expect(httpResult?.[0]).toBe("HTTP://example.com/image.jpg");

      const httpsResult = CLICommandFactory["processCliImages"](
        "HTTPS://example.com/image.png",
      );
      expect(httpsResult).toBeDefined();
      expect(httpsResult).toHaveLength(1);
      expect(httpsResult?.[0]).toBe("HTTPS://example.com/image.png");

      const fileResult = CLICommandFactory["processCliFiles"](
        "FILE:///home/user/file.csv",
      );
      expect(fileResult).toBeDefined();
      expect(fileResult).toHaveLength(1);
      expect(fileResult?.[0]).toBe("FILE:///home/user/file.csv");

      const dataResult = CLICommandFactory["processCliImages"](
        "DATA:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
      );
      expect(dataResult).toBeDefined();
      expect(dataResult).toHaveLength(1);
      expect(dataResult?.[0]).toBe(
        "DATA:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
      );
    });
  });
});
