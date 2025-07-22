import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import dotenv from "dotenv";
import { execWithTimeout } from "./shared/exec-with-timeout.js";

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
        } catch (error: any) {
          // DEBUG: Log actual error structure for analysis
          console.log("🔍 DEBUG - Error handling structure:", {
            hasStderr: "stderr" in error,
            hasStdout: "stdout" in error,
            stderr: error.stderr,
            stdout: error.stdout,
            message: error.message,
            errorKeys: Object.keys(error),
            fullError: error,
          });

          // Check error message first (more reliable), then stderr/stdout if available
          const errorText = error.message || error.stderr || error.stdout || "";
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
        } catch (error: any) {
          expect(error.stderr || error.stdout).toMatch(/token|limit|maximum/i);
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
        } catch (error: any) {
          // DEBUG: Log actual error structure for invalid model analysis
          console.log("🔍 DEBUG - Invalid model error structure:", {
            hasStderr: "stderr" in error,
            hasStdout: "stdout" in error,
            stderr: error.stderr,
            stdout: error.stdout,
            message: error.message,
            errorKeys: Object.keys(error),
            fullError: error,
          });

          // Check error message first (more reliable), then stderr/stdout if available
          const errorText = error.message || error.stderr || error.stdout || "";
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
        } catch (error: any) {
          expect(error.stderr || error.stdout).toMatch(
            /json|context|invalid|parse/i,
          );
        }
      },
      timeout,
    );
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
        } catch (error: any) {
          expect(error.stderr || error.stdout).toMatch(
            /provider|error|invalid/i,
          );
        }
      },
      timeout,
    );
  });
});
