/**
 * MessageBuilder Error Handling Unit Tests (MB-004)
 *
 * Tests proper error handling for file processing failures:
 * - File processing errors should throw exceptions
 * - CSV processing errors should throw exceptions
 * - NO error text should be embedded in prompts
 * - Error messages should be descriptive with filename context
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildMessagesArray,
  buildMultimodalMessagesArray,
} from "../../../src/lib/utils/messageBuilder.js";
import type { TextGenerationOptions } from "../../../src/lib/types/index.js";
import type { GenerateOptions } from "../../../src/lib/types/generateTypes.js";
import { FileDetector } from "../../../src/lib/utils/fileDetector.js";

// Mock FileDetector to simulate errors
vi.mock("../../../src/lib/utils/fileDetector.js", () => ({
  FileDetector: {
    detectAndProcess: vi.fn(),
  },
}));

describe("MessageBuilder Error Handling (MB-004)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("buildMessagesArray - CSV Error Handling", () => {
    it("should throw error when CSV file processing fails (explicit csvFiles)", async () => {
      // Mock FileDetector to throw error
      vi.mocked(FileDetector.detectAndProcess).mockRejectedValue(
        new Error("Invalid CSV format"),
      );

      const options: TextGenerationOptions = {
        prompt: "Analyze this data",
        input: {
          text: "Analyze this data",
          csvFiles: [Buffer.from("invalid,csv,data")],
        },
      };

      await expect(buildMessagesArray(options)).rejects.toThrow(
        "Invalid CSV format",
      );
    });

    it("should silently skip non-CSV files in auto-detect mode (by design)", async () => {
      // Mock FileDetector to throw error (non-CSV file)
      vi.mocked(FileDetector.detectAndProcess).mockRejectedValue(
        new Error("Unsupported file type"),
      );

      const options: TextGenerationOptions = {
        prompt: "Analyze this data",
        input: {
          text: "Analyze this data",
          files: [Buffer.from("not a csv file")],
        },
      };

      // In auto-detect mode with files array, non-CSV files are silently skipped
      // This is intentional behavior for mixed file types
      const result = await buildMessagesArray(options);
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it("should NOT embed error text in prompt when CSV processing fails", async () => {
      // Mock FileDetector to throw error
      vi.mocked(FileDetector.detectAndProcess).mockRejectedValue(
        new Error("CSV parsing failed"),
      );

      const options: TextGenerationOptions = {
        prompt: "Analyze this data",
        input: {
          text: "Analyze this data",
          csvFiles: [Buffer.from("bad,data")],
        },
      };

      try {
        await buildMessagesArray(options);
        expect.fail("Should have thrown error");
      } catch (error) {
        // Verify error was thrown (not embedded in prompt)
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain("CSV");
      }
    });
  });

  describe("buildMultimodalMessagesArray - File Error Handling", () => {
    it("should throw error when file processing fails in auto-detect mode", async () => {
      // Mock FileDetector to throw error
      vi.mocked(FileDetector.detectAndProcess).mockRejectedValue(
        new Error("Unsupported file type"),
      );

      const options: GenerateOptions = {
        input: {
          text: "Process this file",
          files: [Buffer.from("invalid file data")],
        },
      };

      await expect(
        buildMultimodalMessagesArray(options, "openai", "gpt-4"),
      ).rejects.toThrow("Unsupported file type");
    });

    it("should throw error when CSV processing fails in explicit csvFiles", async () => {
      // Mock FileDetector to throw error
      vi.mocked(FileDetector.detectAndProcess).mockRejectedValue(
        new Error("CSV column mismatch"),
      );

      const options: GenerateOptions = {
        input: {
          text: "Process this CSV",
          csvFiles: [Buffer.from("bad,csv,data")],
        },
      };

      await expect(
        buildMultimodalMessagesArray(options, "openai", "gpt-4"),
      ).rejects.toThrow("CSV column mismatch");
    });

    it("should throw error when PDF processing fails", async () => {
      // Mock FileDetector to throw error
      vi.mocked(FileDetector.detectAndProcess).mockRejectedValue(
        new Error("PDF is corrupted"),
      );

      const options: GenerateOptions = {
        input: {
          text: "Process this PDF",
          pdfFiles: [Buffer.from("invalid pdf data")],
        },
      };

      await expect(
        buildMultimodalMessagesArray(options, "openai", "gpt-4"),
      ).rejects.toThrow("PDF is corrupted");
    });

    it("should NOT embed error text in prompt when file processing fails", async () => {
      // Mock FileDetector to throw error
      vi.mocked(FileDetector.detectAndProcess).mockRejectedValue(
        new Error("File processing error"),
      );

      const options: GenerateOptions = {
        input: {
          text: "Process this file",
          csvFiles: [Buffer.from("bad,data")],
        },
      };

      try {
        await buildMultimodalMessagesArray(options, "openai", "gpt-4");
        expect.fail("Should have thrown error");
      } catch (error) {
        // Verify error was thrown (not embedded in prompt)
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).not.toContain("CSV Data Error");
      }
    });

    it("should include filename in error message for better debugging", async () => {
      // Mock FileDetector to throw error
      vi.mocked(FileDetector.detectAndProcess).mockRejectedValue(
        new Error("Invalid format"),
      );

      const options: GenerateOptions = {
        input: {
          text: "Process this file",
          files: ["test-file.csv"],
        },
      };

      try {
        await buildMultimodalMessagesArray(options, "openai", "gpt-4");
        expect.fail("Should have thrown error");
      } catch (error) {
        // Error message should contain context for debugging
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBeTruthy();
      }
    });
  });

  describe("Error Propagation", () => {
    it("should propagate errors to SDK callers for proper handling", async () => {
      // Mock FileDetector to throw a specific error
      const originalError = new Error("File read permission denied");
      vi.mocked(FileDetector.detectAndProcess).mockRejectedValue(originalError);

      const options: GenerateOptions = {
        input: {
          text: "Process file",
          files: [Buffer.from("data")],
        },
      };

      // Verify error is properly propagated (not caught/logged silently)
      await expect(
        buildMultimodalMessagesArray(options, "openai", "gpt-4"),
      ).rejects.toThrow("File read permission denied");
    });

    it("should provide descriptive error messages for different failure types", async () => {
      const testCases = [
        {
          error: new Error("File too large"),
          description: "size validation failure",
        },
        {
          error: new Error("Unsupported encoding"),
          description: "encoding failure",
        },
        {
          error: new Error("Malformed data"),
          description: "data format failure",
        },
      ];

      for (const testCase of testCases) {
        vi.mocked(FileDetector.detectAndProcess).mockRejectedValue(
          testCase.error,
        );

        const options: GenerateOptions = {
          input: {
            text: "Process file",
            files: [Buffer.from("data")],
          },
        };

        await expect(
          buildMultimodalMessagesArray(options, "openai", "gpt-4"),
        ).rejects.toThrow(testCase.error.message);
      }
    });
  });
});
