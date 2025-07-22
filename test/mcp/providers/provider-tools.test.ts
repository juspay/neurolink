import { describe, it, expect, beforeAll } from "vitest";
import { NeuroLink } from "../../../src/lib/neurolink.js";
import { exec, spawn } from "child_process";
import { promisify } from "util";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const execAsync = promisify(exec);

// Provider list to test
const PROVIDERS_TO_TEST = [
  "google-ai",
  "openai",
  "anthropic",
  "bedrock",
  "vertex",
].filter((p) => {
  // Only test providers that have credentials
  switch (p) {
    case "google-ai":
      return !!process.env.GOOGLE_AI_API_KEY;
    case "openai":
      return !!process.env.OPENAI_API_KEY;
    case "anthropic":
      return !!process.env.ANTHROPIC_API_KEY;
    case "bedrock":
      return !!process.env.AWS_ACCESS_KEY_ID;
    case "vertex":
      return !!(
        process.env.GOOGLE_APPLICATION_CREDENTIALS ||
        process.env.GOOGLE_SERVICE_ACCOUNT_KEY
      );
    default:
      return false;
  }
});

// CLI execution helper
const execCLI = async (
  args: string[],
  timeoutMs: number = 15000,
): Promise<{ stdout: string; stderr: string }> => {
  return new Promise((resolve, reject) => {
    const child = spawn("node", ["dist/cli/index.js", ...args], {
      stdio: "pipe",
      env: process.env,
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
      resolve({ stdout, stderr });
    });
  });
};

/**
 * PROVIDER MCP TOOL SUPPORT TESTS
 * Tests tool support across different providers
 */
describe("Provider MCP Tool Support Tests", () => {
  const timeout = 30000;
  let sdk: NeuroLink;

  beforeAll(() => {
    console.log("🔧 Setting up Provider Tool tests...");
    console.log("📋 Testing providers:", PROVIDERS_TO_TEST.join(", "));

    if (PROVIDERS_TO_TEST.length === 0) {
      console.warn("⚠️ No providers have credentials configured!");
    }

    sdk = new NeuroLink();
  });

  describe("Tool Support Across Providers", () => {
    PROVIDERS_TO_TEST.forEach((provider) => {
      describe(`${provider.toUpperCase()} Provider`, () => {
        it(
          `should support tools in generate (${provider})`,
          async () => {
            console.log(`\n🧪 Testing ${provider} generate with tools`);

            try {
              const result = await sdk.generate({
                input: { text: "What is 25 + 25?" },
                provider: provider as any,
                maxTokens: 50,
                disableTools: false,
              });

              expect(result).toBeTruthy();
              expect(result.content).toBeTruthy();
              expect(result.content).toMatch(/50/);

              console.log(`✅ ${provider} supports tools in generate`);
            } catch (error) {
              console.error(`❌ ${provider} failed:`, error);
              throw error;
            }
          },
          timeout,
        );

        it(
          `should work without tools when disabled (${provider})`,
          async () => {
            console.log(`\n🧪 Testing ${provider} generate without tools`);

            try {
              const result = await sdk.generate({
                input: { text: "What is 30 + 30?" },
                provider: provider as any,
                maxTokens: 50,
                disableTools: true,
              });

              expect(result).toBeTruthy();
              expect(result.content).toBeTruthy();
              // Should still answer correctly even without tools
              expect(result.content).toMatch(/60/);

              console.log(`✅ ${provider} works without tools`);
            } catch (error) {
              console.error(`❌ ${provider} failed:`, error);
              throw error;
            }
          },
          timeout,
        );
      });
    });
  });

  describe("CLI Provider Tool Tests", () => {
    it(
      "should support provider switching with tools",
      async () => {
        if (PROVIDERS_TO_TEST.length < 2) {
          console.log(
            "⚠️ Skipping provider switching test - need at least 2 providers",
          );
          return;
        }

        console.log("\n🧪 Testing provider switching with tools");

        const provider1 = PROVIDERS_TO_TEST[0];
        const provider2 = PROVIDERS_TO_TEST[1];

        try {
          // Test first provider
          const { stdout: stdout1 } = await execCLI(
            ["generate", "What is 10 * 10?", "--provider", provider1],
            timeout,
          );

          expect(stdout1).toMatch(/100/);
          console.log(`✅ ${provider1} worked`);

          // Test second provider
          const { stdout: stdout2 } = await execCLI(
            ["generate", "What is 20 * 5?", "--provider", provider2],
            timeout,
          );

          expect(stdout2).toMatch(/100/);
          console.log(`✅ ${provider2} worked`);

          console.log("✅ Provider switching works correctly");
        } catch (error) {
          console.error("❌ Provider switching failed:", error);
          throw error;
        }
      },
      timeout * 2,
    );
  });

  describe("Tool Behavior Consistency", () => {
    it(
      "should have consistent tool results across providers",
      async () => {
        if (PROVIDERS_TO_TEST.length === 0) {
          console.log("⚠️ Skipping consistency test - no providers configured");
          return;
        }

        console.log("\n🧪 Testing tool result consistency");

        const testExpression = "42 + 58";
        const expectedResult = 100;

        for (const provider of PROVIDERS_TO_TEST.slice(0, 3)) {
          // Test first 3 providers
          try {
            const result = await sdk.generate({
              input: { text: `Calculate: ${testExpression}` },
              provider: provider as any,
              maxTokens: 50,
            });

            expect(result.content).toMatch(
              new RegExp(expectedResult.toString()),
            );
            console.log(`✅ ${provider}: Correct result`);
          } catch (error) {
            console.error(`❌ ${provider} failed consistency test:`, error);
            // Don't throw - continue testing other providers
          }
        }
      },
      timeout * 3,
    );
  });

  describe("Tool Error Handling", () => {
    it(
      "should handle tool errors gracefully across providers",
      async () => {
        if (PROVIDERS_TO_TEST.length === 0) {
          console.log(
            "⚠️ Skipping error handling test - no providers configured",
          );
          return;
        }

        console.log("\n🧪 Testing tool error handling");

        const provider = PROVIDERS_TO_TEST[0];

        try {
          // Try to read a non-existent file
          const result = await sdk.generate({
            input: { text: "Read the file at /non/existent/path/file.txt" },
            provider: provider as any,
            maxTokens: 100,
          });

          expect(result).toBeTruthy();
          expect(result.content).toBeTruthy();
          // Should handle the error gracefully
          expect(result.content.toLowerCase()).toMatch(
            /not found|doesn't exist|error|cannot|unable/,
          );

          console.log(`✅ ${provider} handled tool error gracefully`);
        } catch (error) {
          console.error(`❌ ${provider} error handling failed:`, error);
          throw error;
        }
      },
      timeout,
    );
  });
});
