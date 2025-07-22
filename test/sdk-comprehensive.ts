import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import { exec, spawn } from "child_process";
import { promisify } from "util";
// Standard test timeouts (in milliseconds)
const TEST_TIMEOUTS = {
  STANDARD: 30000, // 30 seconds per test
};
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const execAsync = promisify(exec);

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
 * SDK COMPREHENSIVE TEST BATCH (4 tests)
 * Tests SDK integration and comprehensive SDK functionality
 */

describe("SDK Comprehensive Tests", () => {
  const timeout = TEST_TIMEOUTS.STANDARD; // 30 seconds per test
  const cliPrefix = `cd ${process.cwd()} && pnpm cli`;

  beforeAll(() => {
    // Verify environment
    expect(process.env.GOOGLE_AI_API_KEY).toBeDefined();
  });

  // Add delay between tests to prevent rate limiting
  beforeEach(async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  describe("SDK Integration", () => {
    it(
      "should work via SDK import",
      async () => {
        const testCode = `
        import('./dist/lib/neurolink.js').then(({NeuroLink}) => {
          const sdk = new NeuroLink();
          return sdk.generate({
            input: {text: 'Test SDK'},
            provider: 'google-ai',
            maxTokens: 2000
          });
        }).then(r => {
          console.log('SDK_SUCCESS:', !!r.content);
        }).catch(e => {
          console.log('SDK_ERROR:', e.message);
        });
      `;

        const { stdout } = await execAsync(
          `cd ${process.cwd()} && GOOGLE_AI_API_KEY=${process.env.GOOGLE_AI_API_KEY} node -e "${testCode}"`,
        );
        expect(stdout).toContain("SDK_SUCCESS: true");
      },
      timeout,
    );
  });

  describe("SDK Comprehensive", () => {
    it(
      "should test SDK stream method",
      async () => {
        console.log("🔍 INPUT: SDK streaming test");

        try {
          // FIXED: Use standalone script to avoid shell escaping issues
          const { stdout } = await execAsync(
            `cd ${process.cwd()} && GOOGLE_AI_API_KEY=${process.env.GOOGLE_AI_API_KEY} node test-sdk-comprehensive-streaming.mjs`,
          );
          console.log("📤 OUTPUT:", stdout.substring(0, 300) + "...");
          console.log("✅ SUCCESS: Command completed");

          // Accept either success or error (streaming might have issues)
          expect(stdout).toContain("SDK_STREAM_SUCCESS: true");
        } catch (error: any) {
          // FIXED: No longer accept timeouts as passing tests
          throw new Error(`Test failed: ${error.message}`);
        }
      },
      timeout,
    );

    it(
      "should test SDK with multiple parameters",
      async () => {
        const testCode = `
        import('./dist/lib/neurolink.js').then(({NeuroLink}) => {
          const sdk = new NeuroLink();
          return sdk.generate({
            input: {text: 'Test multiple params'},
            provider: 'google-ai',
            maxTokens: 2000,
            temperature: 0.7,
            enableAnalytics: true
          });
        }).then(r => {
          console.log('SDK_PARAMS_SUCCESS:', !!(r.content && r.usage));
          console.log('SDK_TEMP_APPLIED:', r.content.length > 0);
        }).catch(e => {
          console.log('SDK_PARAMS_ERROR:', e.message);
        });
      `;

        const { stdout } = await execAsync(
          `cd ${process.cwd()} && GOOGLE_AI_API_KEY=${process.env.GOOGLE_AI_API_KEY} node -e "${testCode}"`,
        );
        expect(stdout).toContain("SDK_PARAMS_SUCCESS: true");
      },
      timeout,
    );

    it(
      "should test SDK error handling",
      async () => {
        const testCode = `
        import('./dist/lib/neurolink.js').then(({NeuroLink}) => {
          const sdk = new NeuroLink();
          return sdk.generate({
            input: {text: 'Test'},
            provider: 'invalid-provider',
            maxTokens: 2000
          });
        }).then(r => {
          console.log('SDK_ERROR_UNEXPECTED_SUCCESS:', true);
        }).catch(e => {
          console.log('SDK_ERROR_HANDLED:', e.message.includes('provider') || e.message.includes('invalid'));
        });
      `;

        const { stdout } = await execAsync(
          `cd ${process.cwd()} && GOOGLE_AI_API_KEY=${process.env.GOOGLE_AI_API_KEY} node -e "${testCode}"`,
        );
        expect(stdout).toContain("SDK_ERROR_HANDLED: true");
      },
      timeout,
    );
  });
});
