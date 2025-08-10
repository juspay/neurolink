import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import { exec, spawn } from "child_process";
import { promisify } from "util";
import { promises as fs } from "fs";
import * as path from "path";
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

        const tmpFile = path.join(process.cwd(), "tmp-sdk-test.js");
        await fs.writeFile(tmpFile, testCode);
        const { stdout } = await execAsync(`node ${tmpFile}`, {
          env: {
            ...process.env,
            GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY,
          },
        });
        await fs.unlink(tmpFile);
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
          const testCode = `
          import('./dist/lib/neurolink.js').then(({NeuroLink}) => {
            const sdk = new NeuroLink();
            return sdk.stream({
              input: {text: 'Count to 3'},
              provider: 'google-ai',
              maxTokens: 2000
            });
          }).then(async (streamResult) => {
            let content = '';
            for await (const chunk of streamResult.stream) {
              content += chunk.content;
            }
            console.log('SDK_STREAM_SUCCESS:', content.length > 0);
          }).catch(e => {
            console.log('SDK_STREAM_ERROR:', e.message);
          });
        `;

          const tmpFile = path.join(process.cwd(), "tmp-sdk-streaming-test.js");
          await fs.writeFile(tmpFile, testCode);

          const { stdout } = await execAsync(`node ${tmpFile}`, {
            env: {
              ...process.env,
              GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY,
            },
          });

          await fs.unlink(tmpFile);
          console.log("📤 OUTPUT:", stdout.substring(0, 300) + "...");
          console.log("✅ SUCCESS: Command completed");

          // Accept either success or error (streaming might have issues)
          expect(stdout).toContain("SDK_STREAM_SUCCESS: true");
        } catch (error: unknown) {
          // FIXED: No longer accept timeouts as passing tests
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          throw new Error(`Test failed: ${errorMessage}`);
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

        const tmpFile = path.join(process.cwd(), "tmp-sdk-params-test.js");
        await fs.writeFile(tmpFile, testCode);

        const { stdout } = await execAsync(`node ${tmpFile}`, {
          env: {
            ...process.env,
            GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY,
          },
        });

        await fs.unlink(tmpFile);
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

        const tmpFile = path.join(process.cwd(), "tmp-sdk-error-test.js");
        await fs.writeFile(tmpFile, testCode);

        const { stdout } = await execAsync(`node ${tmpFile}`, {
          env: {
            ...process.env,
            GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY,
          },
        });

        await fs.unlink(tmpFile);
        expect(stdout).toContain("SDK_ERROR_HANDLED: true");
      },
      timeout,
    );
  });

  // ✅ FACTORY PATTERN INTEGRATION TESTS - Testing Phase 1 Factory Infrastructure via SDK
  describe("Factory Pattern Integration Tests (Phase 1 Features)", () => {
    beforeAll(() => {
      console.log("🧪 Testing Factory Pattern Integration with SDK Methods");
      console.log("Using provider: google-ai");
    });

    it(
      "should test SDK with domain configuration and evaluation",
      async () => {
        console.log("🏥 Testing healthcare domain configuration via SDK...");

        const testCode = `
        import('./dist/lib/neurolink.js').then(({NeuroLink}) => {
          const sdk = new NeuroLink();
          return sdk.generate({
            input: {text: 'Analyze patient symptoms: fever, cough, fatigue. Provide differential diagnosis.'},
            provider: 'google-ai',
            maxTokens: 300,
            evaluationDomain: 'healthcare',
            enableEvaluation: true,
            enableAnalytics: true
          });
        }).then(r => {
          console.log('SDK_DOMAIN_SUCCESS:', !!(r.content && r.evaluation));
          console.log('SDK_EVALUATION_DOMAIN:', r.evaluation?.evaluationDomain || 'none');
          console.log('SDK_ANALYTICS_PRESENT:', !!r.analytics);
          console.log('SDK_CONTENT_LENGTH:', r.content?.length || 0);
        }).catch(e => {
          console.log('SDK_DOMAIN_ERROR:', e.message);
        });
      `;

        const tmpFile = path.join(process.cwd(), "tmp-sdk-domain-test.js");
        await fs.writeFile(tmpFile, testCode);

        const { stdout } = await execAsync(`node ${tmpFile}`, {
          env: {
            ...process.env,
            GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY,
          },
        });

        await fs.unlink(tmpFile);

        expect(stdout).toContain("SDK_DOMAIN_SUCCESS: true");
        expect(stdout).toContain("SDK_EVALUATION_DOMAIN: healthcare");
        expect(stdout).toContain("SDK_ANALYTICS_PRESENT: true");
        expect(stdout).toMatch(/SDK_CONTENT_LENGTH: [1-9]\d+/); // At least 10+ characters

        console.log("✅ Healthcare domain configuration working via SDK");
      },
      timeout,
    );

    it(
      "should test SDK with analytics domain configuration",
      async () => {
        console.log("📊 Testing analytics domain configuration via SDK...");

        const testCode = `
        import('./dist/lib/neurolink.js').then(({NeuroLink}) => {
          const sdk = new NeuroLink();
          return sdk.generate({
            input: {text: 'Analyze quarterly sales data: Q1: $100k, Q2: $150k, Q3: $120k. Calculate growth trends.'},
            provider: 'google-ai',
            maxTokens: 300,
            evaluationDomain: 'analytics',
            enableEvaluation: true,
            enableAnalytics: true
          });
        }).then(r => {
          console.log('SDK_ANALYTICS_DOMAIN_SUCCESS:', !!(r.content && r.evaluation));
          console.log('SDK_ANALYTICS_EVALUATION_DOMAIN:', r.evaluation?.evaluationDomain || 'none');
          console.log('SDK_ANALYTICS_DATA_PRESENT:', !!r.analytics);
          console.log('SDK_ANALYTICS_CONTENT_LENGTH:', r.content?.length || 0);
        }).catch(e => {
          console.log('SDK_ANALYTICS_DOMAIN_ERROR:', e.message);
        });
      `;

        const tmpFile = path.join(
          process.cwd(),
          "tmp-sdk-analytics-domain-test.js",
        );
        await fs.writeFile(tmpFile, testCode);

        const { stdout } = await execAsync(`node ${tmpFile}`, {
          env: {
            ...process.env,
            GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY,
          },
        });

        await fs.unlink(tmpFile);

        expect(stdout).toContain("SDK_ANALYTICS_DOMAIN_SUCCESS: true");
        expect(stdout).toContain("SDK_ANALYTICS_EVALUATION_DOMAIN: analytics");
        expect(stdout).toContain("SDK_ANALYTICS_DATA_PRESENT: true");
        expect(stdout).toMatch(/SDK_ANALYTICS_CONTENT_LENGTH: [1-9]\d+/); // At least 10+ characters

        console.log("✅ Analytics domain configuration working via SDK");
      },
      timeout,
    );

    it(
      "should test SDK factory pattern with context integration",
      async () => {
        console.log(
          "🔄 Testing factory pattern with context integration via SDK...",
        );

        const testCode = `
        import('./dist/lib/neurolink.js').then(({NeuroLink}) => {
          const sdk = new NeuroLink();
          const contextData = {
            "organizationId": "health-corp",
            "department": "research",
            "projectId": "clinical-trial-2024",
            "userId": "researcher123"
          };
          
          return sdk.generate({
            input: {
              text: 'Analyze clinical trial data for cardiovascular drug efficacy', 
              context: contextData
            },
            provider: 'google-ai',
            maxTokens: 300,
            evaluationDomain: 'healthcare',
            enableEvaluation: true,
            enableAnalytics: true
          });
        }).then(r => {
          console.log('SDK_CONTEXT_FACTORY_SUCCESS:', !!(r.content && r.evaluation && r.analytics));
          console.log('SDK_CONTEXT_EVALUATION_DOMAIN:', r.evaluation?.evaluationDomain || 'none');
          console.log('SDK_CONTEXT_ANALYTICS_PRESENT:', !!r.analytics);
          console.log('SDK_CONTEXT_CONTENT_LENGTH:', r.content?.length || 0);
        }).catch(e => {
          console.log('SDK_CONTEXT_FACTORY_ERROR:', e.message);
        });
      `;

        const tmpFile = path.join(
          process.cwd(),
          "tmp-sdk-context-factory-test.js",
        );
        await fs.writeFile(tmpFile, testCode);

        const { stdout } = await execAsync(`node ${tmpFile}`, {
          env: {
            ...process.env,
            GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY,
          },
        });

        await fs.unlink(tmpFile);

        expect(stdout).toContain("SDK_CONTEXT_FACTORY_SUCCESS: true");
        expect(stdout).toContain("SDK_CONTEXT_EVALUATION_DOMAIN: healthcare");
        expect(stdout).toContain("SDK_CONTEXT_ANALYTICS_PRESENT: true");
        expect(stdout).toMatch(/SDK_CONTEXT_CONTENT_LENGTH: [1-9]\d+/); // At least 10+ characters

        console.log(
          "✅ Factory pattern with context integration working via SDK",
        );
      },
      timeout,
    );

    it(
      "should test SDK factory pattern backwards compatibility",
      async () => {
        console.log(
          "⚡ Testing factory pattern backwards compatibility via SDK...",
        );

        const testCode = `
        import('./dist/lib/neurolink.js').then(({NeuroLink}) => {
          const sdk = new NeuroLink();
          
          // Test that basic SDK usage still works without domain features
          return sdk.generate({
            input: {text: 'Simple test without domain features'},
            provider: 'google-ai',
            maxTokens: 100
          });
        }).then(r => {
          console.log('SDK_BACKWARDS_COMPAT_SUCCESS:', !!r.content);
          console.log('SDK_BACKWARDS_COMPAT_CONTENT_LENGTH:', r.content?.length || 0);
          console.log('SDK_BACKWARDS_COMPAT_NO_EVALUATION:', !r.evaluation);
        }).catch(e => {
          console.log('SDK_BACKWARDS_COMPAT_ERROR:', e.message);
        });
      `;

        const tmpFile = path.join(
          process.cwd(),
          "tmp-sdk-backwards-compat-test.js",
        );
        await fs.writeFile(tmpFile, testCode);

        const { stdout } = await execAsync(`node ${tmpFile}`, {
          env: {
            ...process.env,
            GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY,
          },
        });

        await fs.unlink(tmpFile);

        expect(stdout).toContain("SDK_BACKWARDS_COMPAT_SUCCESS: true");
        expect(stdout).toContain("SDK_BACKWARDS_COMPAT_NO_EVALUATION: true");
        expect(stdout).toMatch(/SDK_BACKWARDS_COMPAT_CONTENT_LENGTH: [1-9]\d+/); // At least 10+ characters

        console.log(
          "✅ Factory pattern backwards compatibility verified via SDK",
        );
      },
      timeout,
    );
  });
});
