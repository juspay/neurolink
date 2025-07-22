import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import { spawn } from "child_process";
import dotenv from "dotenv";
import { execWithTimeout } from "./shared/exec-with-timeout.js";

// Load environment variables
dotenv.config();

// Working CLI execution method (same as universal test)
const execCLI = async (
  args: string[],
  timeoutMs: number = 8000,
): Promise<{ stdout: string; stderr: string }> => {
  return new Promise((resolve, reject) => {
    const child = spawn("pnpm", ["cli", ...args], {
      stdio: "pipe",
      env: {
        ...process.env,
        GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY,
      },
      cwd: process.cwd(),
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    const timeoutId = setTimeout(() => {
      child.kill();
      reject(new Error(`CLI command timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.on("close", (code) => {
      clearTimeout(timeoutId);
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`CLI command failed with exit code ${code}`));
      }
    });
  });
};

/**
 * PARAMETER VALIDATION TEST BATCH (7 tests)
 * Tests parameter combinations and output validation
 */

describe("Parameter Validation Tests", () => {
  const timeout = 30000; // 30 seconds per test
  const cliPrefix = `cd ${process.cwd()} && pnpm cli`;

  // Helper to get test provider (can be extended to use env/config)
  function getTestProvider() {
    return process.env.TEST_PROVIDER || "google-ai";
  }

  beforeAll(() => {
    // Verify environment
    expect(process.env.GOOGLE_AI_API_KEY).toBeDefined();
  });

  // Add delay between tests to prevent rate limiting
  beforeEach(async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  describe("Parameter Combinations", () => {
    it(
      "should handle system prompt parameter",
      async () => {
        const command = `${cliPrefix} generate "Hello" --provider ${getTestProvider()} --system-prompt "Be very brief" --max-tokens 2000 --output-format text`;
        console.log("🔍 INPUT:", command);

        const { stdout } = await execWithTimeout(command);
        console.log("📤 OUTPUT:", stdout.substring(0, 200) + "...");
        console.log("✅ SUCCESS: Command completed");

        expect(stdout).toContain("Generated Content:");
      },
      timeout,
    );

    it(
      "should handle model selection",
      async () => {
        const command = `${cliPrefix} generate "Test" --provider ${getTestProvider()} --model gemini-2.5-flash --max-tokens 2000 --output-format text`;
        console.log("🔍 INPUT:", command);

        const { stdout } = await execWithTimeout(command);
        console.log("📤 OUTPUT:", stdout.substring(0, 200) + "...");
        console.log("✅ SUCCESS: Command completed");

        expect(stdout).toContain("Generated Content:");
      },
      timeout,
    );

    it(
      "should handle multiple parameters together",
      async () => {
        const command = `${cliPrefix} generate "Test combo" --provider ${getTestProvider()} --temperature 0.7 --system-prompt "Be helpful" --max-tokens 2000 --output-format json --enable-analytics`;
        console.log("🔍 INPUT:", command);

        const { stdout } = await execWithTimeout(command);
        console.log("📤 OUTPUT:", stdout.substring(0, 200) + "...");
        console.log("✅ SUCCESS: Command completed");

        expect(stdout).toMatch(/\{.*\}/);
        expect(stdout).toContain('"usage":');
        expect(stdout).toContain('"responseTime":');
        expect(stdout).toContain('"provider":');
      },
      timeout,
    );

    it(
      "should handle context parameter",
      async () => {
        const args = [
          "stream",
          "Test context",
          "--provider",
          getTestProvider(),
          "--context",
          '{"project":"test"}',
          "--max-tokens",
          "2000",
          "--disable-tools",
        ];
        console.log("🔍 INPUT: pnpm cli", args.join(" "));

        const { stdout } = await execCLI(args);
        console.log("📤 OUTPUT:", stdout.substring(0, 200) + "...");
        console.log("✅ SUCCESS: Command completed");

        expect(stdout).toContain("Streaming...");
      },
      timeout,
    );
  });

  describe("Output Validation", () => {
    it(
      "should validate complete JSON structure",
      async () => {
        const command = `${cliPrefix} generate "Validate JSON structure" --provider ${getTestProvider()} --max-tokens 2000 --output-format json --enable-analytics`;
        console.log("🔍 INPUT:", command);

        const { stdout } = await execWithTimeout(command);
        console.log("📤 OUTPUT:", stdout.substring(0, 200) + "...");
        console.log("✅ SUCCESS: Command completed");

        // Extract JSON from CLI output (find the JSON block)
        const jsonStart = stdout.indexOf("{");
        const jsonEnd = stdout.lastIndexOf("}") + 1;
        const jsonStr = stdout.substring(jsonStart, jsonEnd);
        const response = JSON.parse(jsonStr);

        // Required fields
        expect(response.content).toBeDefined();
        expect(response.provider).toBeDefined();
        expect(response.usage).toBeDefined();
        expect(response.responseTime).toBeDefined();

        // Data types
        expect(typeof response.content).toBe("string");
        expect(typeof response.provider).toBe("string");
        expect(typeof response.responseTime).toBe("number");
        expect(typeof response.usage.totalTokens).toBe("number");
      },
      timeout,
    );

    it(
      "should validate analytics data accuracy",
      async () => {
        const command = `${cliPrefix} generate "Short response" --provider ${getTestProvider()} --max-tokens 2000 --output-format json --enable-analytics`;
        console.log("🔍 INPUT:", command);

        const { stdout } = await execWithTimeout(command);
        console.log("📤 OUTPUT:", stdout.substring(0, 200) + "...");
        console.log("✅ SUCCESS: Command completed");

        const jsonStart = stdout.indexOf("{");
        const jsonEnd = stdout.lastIndexOf("}") + 1;
        const jsonStr = stdout.substring(jsonStart, jsonEnd);
        const response = JSON.parse(jsonStr);

        // Token counts should be reasonable
        expect(response.usage.totalTokens).toBeGreaterThan(0);
        expect(response.usage.totalTokens).toBeLessThan(5000); // Reasonable upper bound

        // Response time should be reasonable
        expect(response.responseTime).toBeGreaterThan(500); // At least 0.5 seconds
        expect(response.responseTime).toBeLessThan(60000); // Less than 1 minute
      },
      timeout,
    );

    it(
      "should validate provider metadata",
      async () => {
        const command = `${cliPrefix} generate "Test metadata" --provider ${getTestProvider()} --max-tokens 2000 --output-format json`;
        console.log("🔍 INPUT:", command);

        const { stdout } = await execWithTimeout(command);
        console.log("📤 OUTPUT:", stdout.substring(0, 200) + "...");
        console.log("✅ SUCCESS: Command completed");

        const jsonStart = stdout.indexOf("{");
        const jsonEnd = stdout.lastIndexOf("}") + 1;
        const jsonStr = stdout.substring(jsonStart, jsonEnd);
        const response = JSON.parse(jsonStr);

        expect(response.provider).toBe("google-ai");
        expect(response.toolsUsed).toBeDefined();
        expect(Array.isArray(response.toolsUsed)).toBe(true);
        expect(response.availableTools).toBeDefined();
        expect(Array.isArray(response.availableTools)).toBe(true);
      },
      timeout,
    );
  });
});
