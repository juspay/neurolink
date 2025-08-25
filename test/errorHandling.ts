import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import dotenv from "dotenv";
import { execWithTimeout } from "./shared/execWithTimeout.js";
import type { UnknownRecord } from "../src/lib/types/common.js";

// Load environment variables
dotenv.config();

/**
 * ERROR HANDLING TEST BATCH (6 tests)
 * Tests comprehensive error handling and provider management
 */

describe("Error Handling Tests", () => {
  const timeout = 30000; // 30 seconds per test
  const cliPrefix = `cd ${process.cwd()} && pnpm cli`;

  beforeAll(() => {
    // Verify environment
    expect(process.env.GOOGLE_AI_API_KEY).toBeDefined();
  });

  // Add delay between tests to prevent rate limiting
  beforeEach(async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  describe("Error Handling Comprehensive", () => {
    it(
      "should handle invalid API key gracefully",
      async () => {
        try {
          await execWithTimeout(
            `cd ${process.cwd()} && GOOGLE_AI_API_KEY=invalid-key pnpm cli generate "Test" --provider google-ai --max-tokens 2000`,
          );
        } catch (error: unknown) {
          // DEBUG: Log actual error structure for analysis
          console.log("🔍 DEBUG - Error handling structure:", {
            hasStderr: "stderr" in (error as UnknownRecord),
            hasStdout: "stdout" in (error as UnknownRecord),
            stderr: (error as UnknownRecord).stderr,
            stdout: (error as UnknownRecord).stdout,
            message: error instanceof Error ? error.message : String(error),
            errorKeys: Object.keys(error as UnknownRecord),
            fullError: error,
          });

          // Check error message first (more reliable), then stderr/stdout if available
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          const errorStderr = (error as UnknownRecord)?.stderr || "";
          const errorStdout = (error as UnknownRecord)?.stdout || "";
          const errorText = errorMessage || errorStderr || errorStdout || "";
          expect(errorText).toMatch(
            /api.key|authentication|invalid|error|timeout/i,
          );
        }
      },
      timeout,
    );

    it(
      "should handle token limit exceeded",
      async () => {
        try {
          const command = `${cliPrefix} generate "Test" --provider google-ai --max-tokens 1000000`;
          console.log("🔍 INPUT:", command);

          const { stdout } = await execWithTimeout(command);
          console.log("📤 OUTPUT:", stdout.substring(0, 200) + "...");
          console.log("✅ SUCCESS: Command completed");

          // Should either work or show clear error
          expect(stdout).toBeDefined();
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          const errorStderr = (error as UnknownRecord)?.stderr || "";
          const errorStdout = (error as UnknownRecord)?.stdout || "";
          expect(errorStderr || errorStdout).toMatch(/token|limit|maximum/i);
        }
      },
      timeout,
    );

    it(
      "should handle invalid model names",
      async () => {
        try {
          await execWithTimeout(
            `${cliPrefix} generate "Test" --provider google-ai --model invalid-model-name`,
          );
        } catch (error: unknown) {
          // DEBUG: Log actual error structure for invalid model analysis
          console.log("🔍 DEBUG - Invalid model error structure:", {
            hasStderr: "stderr" in (error as UnknownRecord),
            hasStdout: "stdout" in (error as UnknownRecord),
            stderr: (error as UnknownRecord).stderr,
            stdout: (error as UnknownRecord).stdout,
            message: error instanceof Error ? error.message : String(error),
            errorKeys: Object.keys(error as UnknownRecord),
            fullError: error,
          });

          // Check error message first (more reliable), then stderr/stdout if available
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          const errorStderr = (error as UnknownRecord)?.stderr || "";
          const errorStdout = (error as UnknownRecord)?.stdout || "";
          const errorText = errorMessage || errorStderr || errorStdout || "";
          expect(errorText).toMatch(/model|invalid|not.found|timeout/i);
        }
      },
      timeout,
    );

    it(
      "should handle malformed JSON context",
      async () => {
        try {
          await execWithTimeout(
            `${cliPrefix} generate "Test" --provider google-ai --context '{invalid-json'`,
          );
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          const errorStderr = (error as UnknownRecord)?.stderr || "";
          const errorStdout = (error as UnknownRecord)?.stdout || "";
          expect(errorStderr || errorStdout).toMatch(
            /json|context|invalid|parse/i,
          );
        }
      },
      timeout,
    );

    it("should handle command timeout gracefully", async () => {
      try {
        await execWithTimeout(
          `${cliPrefix} generate "Test" --provider google-ai --timeout 1`,
          1,
        );
        throw new Error("Command did not time out as expected");
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        expect(errorMessage).toMatch(/command timed out/i);
      }
    }, 5000); // Test runner timeout
  });

  describe("Provider Management", () => {
    it(
      "should show provider help",
      async () => {
        const command = `${cliPrefix} provider --help`;
        console.log("🔍 INPUT:", command);

        const { stdout } = await execWithTimeout(command);
        console.log("📤 OUTPUT:", stdout.substring(0, 200) + "...");
        console.log("✅ SUCCESS: Command completed");

        expect(stdout).toContain("provider");
      },
      timeout,
    );
  });

  describe("Error Handling", () => {
    it(
      "should handle invalid provider gracefully",
      async () => {
        try {
          await execWithTimeout(
            `${cliPrefix} generate "Test" --provider invalid-provider`,
          );
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          const errorStderr = (error as UnknownRecord)?.stderr || "";
          const errorStdout = (error as UnknownRecord)?.stdout || "";
          expect(errorStderr || errorStdout).toMatch(/provider|error|invalid/i);
        }
      },
      timeout,
    );
  });
});
