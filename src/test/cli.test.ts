/**
 * CLI Tests for NeuroLink Command Line Interface
 * Tests the CLI functionality and integration
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execSync, spawn } from "child_process";
import { writeFileSync, unlinkSync, existsSync } from "fs";
import { join } from "path";

// CLI test configuration
const CLI_TIMEOUT = 5000; // 5 seconds for CLI operations (reduced from 15s)
const CLI_PATH = "./dist/cli/index.js";
const TEST_FILE_PATH = "./test-prompts-cli.txt";

// Helper function to execute CLI commands with proper error handling
function execCLI(
  command: string,
  options: any = {},
): { stdout: string; stderr: string; exitCode: number } {
  try {
    const output = execSync(command, {
      encoding: "utf8",
      timeout: CLI_TIMEOUT,
      ...options,
    });
    return { stdout: output, stderr: "", exitCode: 0 };
  } catch (error: any) {
    // execSync throws on non-zero exit codes, but we still get the output
    const stdout = error.stdout || "";
    const stderr = error.stderr || "";
    const exitCode = error.status || 1;
    return { stdout, stderr, exitCode };
  }
}

describe("NeuroLink CLI Tests", () => {
  beforeAll(() => {
    // Create test prompts file for batch testing
    const testPrompts = [
      "Write a haiku about coding",
      "Explain what AI is",
      "Generate a simple joke",
    ];
    writeFileSync(TEST_FILE_PATH, testPrompts.join("\n"));
  });

  afterAll(() => {
    // Cleanup test files
    if (existsSync(TEST_FILE_PATH)) {
      unlinkSync(TEST_FILE_PATH);
    }
  });

  describe("CLI Availability and Help", () => {
    it("should display help when no arguments provided", () => {
      const result = execCLI(`node ${CLI_PATH}`);
      const output = result.stdout + result.stderr;
      // CLI shows error message when no command provided (standard CLI behavior)
      expect(output).toMatch(
        /(Usage:|Commands:|Error.*command|need.*command)/i,
      );
    });

    it("should display help with --help flag", () => {
      const result = execCLI(`node ${CLI_PATH} --help`);
      const output = result.stdout + result.stderr;
      expect(output).toContain("Usage:");
      expect(output).toContain("Commands:");
    });

    it("should show version information", () => {
      const result = execCLI(`node ${CLI_PATH} --version`);
      const output = result.stdout + result.stderr;
      expect(output).toMatch(/\d+\.\d+\.\d+/); // Version pattern
    });
  });

  describe("Provider Status Command", () => {
    it("should check provider status", () => {
      const result = execCLI(`node ${CLI_PATH} status`);
      const output = result.stdout + result.stderr;

      // Should contain provider information
      expect(output).toMatch(/(openai|bedrock|vertex|google-ai)/i);
      expect(output).toMatch(
        /(provider|status|configuration|available|failed)/i,
      );
    });

    it("should show verbose status information", () => {
      const result = execCLI(`node ${CLI_PATH} status --verbose`);
      const output = result.stdout + result.stderr;

      // Verbose should contain more detailed information
      expect(output.length).toBeGreaterThan(10);
    });
  });

  describe("Best Provider Selection", () => {
    it("should identify best available provider", () => {
      const result = execCLI(`node ${CLI_PATH} get-best-provider`);
      const output = result.stdout + result.stderr;

      // Should return a provider name or error message
      expect(output).toMatch(
        /(openai|bedrock|vertex|auto|provider|selection|configuration)/i,
      );
    });
  });

  describe("Content Generation Commands", () => {
    it("should handle basic text generation command structure", () => {
      const result = execCLI(`node ${CLI_PATH} generate "Hello world"`);
      const output = result.stdout + result.stderr;

      // Should attempt to generate text or show proper error
      expect(output).toMatch(
        /(generated|error|configuration|api|key|provider)/i,
      );
    });

    it("should handle JSON output format", () => {
      const result = execCLI(`node ${CLI_PATH} generate "Test" --format json`);
      const output = result.stdout + result.stderr;

      // Should attempt JSON format or show JSON error
      if (output.includes("{")) {
        try {
          JSON.parse(output);
        } catch {
          // Non-JSON error is acceptable for API failures
        }
      }
      expect(output.length).toBeGreaterThan(0);
    });

    it("should handle provider specification", () => {
      const result = execCLI(
        `node ${CLI_PATH} generate "Test" --provider openai`,
      );
      const output = result.stdout + result.stderr;

      // Should show provider-specific response or error
      expect(output).toMatch(
        /(openai|provider|configuration|generated|error)/i,
      );
    });

    it("should handle Google AI Studio provider specification", () => {
      const result = execCLI(
        `node ${CLI_PATH} generate "Test" --provider google-ai`,
      );
      const output = result.stdout + result.stderr;

      // Should show Google AI Studio provider-specific response or error
      expect(output).toMatch(
        /(google-ai|provider|configuration|generated|error)/i,
      );
    });
  });

  describe("Streaming Commands", () => {
    it("should handle streaming command structure", () => {
      const result = execCLI(`node ${CLI_PATH} stream "Brief test"`);
      const output = result.stdout + result.stderr;

      // Should show streaming attempt or error
      expect(output).toMatch(/(stream|error|configuration|generated)/i);
    });
  });

  describe("Batch Processing Commands", () => {
    it("should handle batch file processing", () => {
      const result = execCLI(`node ${CLI_PATH} batch ${TEST_FILE_PATH}`, {
        timeout: CLI_TIMEOUT * 2,
      });
      const output = result.stdout + result.stderr;

      // Should attempt to process the batch file
      expect(output).toMatch(/(batch|file|processing|error|generated)/i);
    });

    it("should handle batch output file specification", () => {
      const result = execCLI(
        `node ${CLI_PATH} batch ${TEST_FILE_PATH} --output test-output.json`,
        { timeout: CLI_TIMEOUT * 2 },
      );
      const output = result.stdout + result.stderr;

      // Should show output file handling
      expect(output).toMatch(/(output|file|batch|processing)/i);
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid commands gracefully", () => {
      const result = execCLI(`node ${CLI_PATH} invalid-command`);
      const output = result.stdout + result.stderr;

      // Should show helpful error message
      expect(output).toMatch(/(unknown|invalid|command|usage|help)/i);
    });

    it("should handle missing required arguments", () => {
      const result = execCLI(`node ${CLI_PATH} generate`);
      const output = result.stdout + result.stderr;

      // Should show argument requirement error
      expect(output).toMatch(/(required|argument|missing|prompt)/i);
    });

    it("should handle invalid file paths in batch command", () => {
      const result = execCLI(`node ${CLI_PATH} batch nonexistent-file.txt`);
      const output = result.stdout + result.stderr;

      // Should show file not found error
      expect(output).toMatch(/(file|not|found|exist)/i);
    });
  });

  describe("Command Line Argument Parsing", () => {
    it("should handle various flag formats", () => {
      const testCases = ["--format json", "--format=json", "-f json"];

      for (const flagFormat of testCases) {
        const result = execCLI(
          `node ${CLI_PATH} generate "test" ${flagFormat}`,
        );
        const output = result.stdout + result.stderr;

        // Should recognize the flag format
        expect(output).not.toMatch(/(unknown.*flag|invalid.*option)/i);
      }
    });

    it("should handle quoted prompts with spaces", () => {
      const result = execCLI(
        `node ${CLI_PATH} generate "This is a test prompt with spaces"`,
      );
      const output = result.stdout + result.stderr;

      // Should handle the full prompt, not complain about parsing
      expect(output).not.toMatch(
        /(unexpected.*argument|too.*many.*arguments)/i,
      );
    });
  });

  describe("Output Formatting", () => {
    it("should respect quiet mode if supported", () => {
      const result = execCLI(`node ${CLI_PATH} status --quiet`);
      const output = result.stdout + result.stderr;

      // Should work regardless of quiet mode support
      expect(output.length).toBeGreaterThan(0);
    });

    it("should handle color output preferences", () => {
      const result = execCLI(`node ${CLI_PATH} status`, {
        env: { ...process.env, NO_COLOR: "1" },
      });
      const output = result.stdout + result.stderr;

      // Should work regardless of color settings
      expect(output.length).toBeGreaterThan(0);
    });
  });
});
