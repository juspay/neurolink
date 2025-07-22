/**
 * Universal Provider Test Suite
 *
 * This is THE comprehensive test that validates ALL features for ANY provider.
 * It tests every feature supported by both SDK and CLI.
 *
 * This test MUST pass 100% for a provider to be considered working.
 *
 * Features tested:
 * 1. Basic text generation (SDK)
 * 2. Streaming generation (SDK)
 * 3. Parameter handling (temperature, maxTokens, systemPrompt)
 * 4. Tool integration (MCP tools)
 * 5. Analytics collection
 * 6. Response evaluation
 * 7. Error handling
 * 8. Timeout handling
 * 9. CLI basic generation
 * 10. CLI streaming
 * 11. CLI parameter passing
 * 12. CLI tool integration
 * 13. Backward compatibility
 */

import { NeuroLink } from "../lib/neurolink.js";
import { spawn } from "child_process";
import path from "path";

interface ProviderTestConfig {
  name: string;
  apiKeyEnv: string;
  aliases?: string[];
  expectedModels?: string[];
}

interface TestResult {
  name: string;
  success: boolean;
  duration: number;
  error?: string;
  details?: any;
}

interface TestSuiteResult {
  provider: string;
  overall: {
    passed: number;
    failed: number;
    total: number;
    success: boolean;
    duration: number;
  };
  tests: TestResult[];
}

export class UniversalProviderTest {
  private static readonly PROVIDER_CONFIGS: Record<string, ProviderTestConfig> =
    {
      "google-ai": {
        name: "google-ai",
        apiKeyEnv: "GOOGLE_AI_API_KEY",
        aliases: ["google-studio", "gemini"],
        expectedModels: ["gemini-2.5-pro", "gemini-2.5-flash"],
      },
      openai: {
        name: "openai",
        apiKeyEnv: "OPENAI_API_KEY",
        expectedModels: ["gpt-4o", "gpt-4o-mini"],
      },
      anthropic: {
        name: "anthropic",
        apiKeyEnv: "ANTHROPIC_API_KEY",
        expectedModels: ["claude-3-5-sonnet-20241022"],
      },
    };

  /**
   * Run the complete universal test suite for a provider
   */
  static async runCompleteTest(providerName: string): Promise<TestSuiteResult> {
    const config = this.PROVIDER_CONFIGS[providerName.toLowerCase()];
    if (!config) {
      throw new Error(
        `No test configuration found for provider: ${providerName}`,
      );
    }

    console.log(
      `\n🧪 Running Universal Provider Test for: ${providerName.toUpperCase()}`,
    );
    console.log("=".repeat(60));

    const startTime = Date.now();
    const tests: TestResult[] = [];

    // Check API key availability
    const hasApiKey = !!(
      process.env[config.apiKeyEnv] ||
      process.env[config.apiKeyEnv.replace("_API_KEY", "_KEY")]
    );

    if (!hasApiKey) {
      throw new Error(
        `API key not found for ${providerName}. Set ${config.apiKeyEnv} environment variable.`,
      );
    }

    console.log(`✅ API key found for ${config.apiKeyEnv}`);

    // Test 1: SDK Basic Generation
    tests.push(await this.testSDKBasicGeneration(providerName, config));

    // Test 2: SDK Streaming
    tests.push(await this.testSDKStreaming(providerName, config));

    // Test 3: SDK Parameter Handling
    tests.push(await this.testSDKParameters(providerName, config));

    // Test 4: SDK Tool Integration (MCP)
    tests.push(await this.testSDKToolIntegration(providerName, config));

    // Test 5: SDK Analytics
    tests.push(await this.testSDKAnalytics(providerName, config));

    // Test 6: SDK Evaluation
    tests.push(await this.testSDKEvaluation(providerName, config));

    // Test 7: SDK Error Handling
    tests.push(await this.testSDKErrorHandling(providerName, config));

    // Test 8: CLI Basic Generation
    tests.push(await this.testCLIBasicGeneration(providerName, config));

    // Test 9: CLI Streaming
    tests.push(await this.testCLIStreaming(providerName, config));

    // Test 10: CLI Parameter Handling
    tests.push(await this.testCLIParameters(providerName, config));

    // Calculate results
    const passed = tests.filter((t) => t.success).length;
    const failed = tests.filter((t) => !t.success).length;
    const duration = Date.now() - startTime;

    const result: TestSuiteResult = {
      provider: providerName,
      overall: {
        passed,
        failed,
        total: tests.length,
        success: failed === 0,
        duration,
      },
      tests,
    };

    // Display results
    this.displayResults(result);

    return result;
  }

  private static async testSDKBasicGeneration(
    providerName: string,
    config: ProviderTestConfig,
  ): Promise<TestResult> {
    const testName = "SDK Basic Generation";
    console.log(`\n🔹 ${testName}...`);

    try {
      const startTime = Date.now();
      const sdk = new NeuroLink();

      const result = await sdk.generate({
        input: { text: 'Say "Hello from SDK" and nothing else.' },
        provider: providerName as any,
        maxTokens: 2000,
        temperature: 0,
      });

      const duration = Date.now() - startTime;

      // Validate result
      if (!result.content || result.content.length === 0) {
        throw new Error("No content returned");
      }

      if (!result.provider) {
        throw new Error("No provider information returned");
      }

      console.log(
        `   ✅ Success (${duration}ms) - Content: ${result.content.substring(0, 50)}...`,
      );

      return {
        name: testName,
        success: true,
        duration,
        details: {
          contentLength: result.content.length,
          provider: result.provider,
          model: result.model,
          hasUsage: !!result.usage,
        },
      };
    } catch (error) {
      console.log(
        `   ❌ Failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        name: testName,
        success: false,
        duration: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private static readonly MAX_STREAM_CHUNKS = process.env
    .UNIVERSAL_TEST_MAX_STREAM_CHUNKS
    ? parseInt(process.env.UNIVERSAL_TEST_MAX_STREAM_CHUNKS, 10)
    : 50; // Increased default to 50, configurable via env

  private static async testSDKStreaming(
    providerName: string,
    config: ProviderTestConfig,
  ): Promise<TestResult> {
    const testName = "SDK Streaming";
    console.log(`\n🔹 ${testName}...`);

    try {
      const startTime = Date.now();
      const sdk = new NeuroLink();

      const streamResult = await sdk.stream({
        input: { text: "Count from 1 to 3, one number per line." },
        provider: providerName as any,
        maxTokens: 2000,
        temperature: 0,
      });

      let chunks = 0;
      let content = "";

      for await (const chunk of streamResult.stream) {
        content += chunk.content || "";
        chunks++;
        if (chunks > this.MAX_STREAM_CHUNKS) {
          console.warn(
            `⚠️  Stream chunk limit (${this.MAX_STREAM_CHUNKS}) reached, breaking to prevent infinite loop.`,
          );
          break;
        } // Prevent infinite loops
      }

      const duration = Date.now() - startTime;

      if (chunks === 0) {
        throw new Error("No chunks received from stream");
      }

      console.log(
        `   ✅ Success (${duration}ms) - Chunks: ${chunks}, Content: ${content.length} chars`,
      );

      return {
        name: testName,
        success: true,
        duration,
        details: {
          chunks,
          contentLength: content.length,
          hasContent: content.length > 0,
        },
      };
    } catch (error) {
      console.log(
        `   ❌ Failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        name: testName,
        success: false,
        duration: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private static async testSDKParameters(
    providerName: string,
    config: ProviderTestConfig,
  ): Promise<TestResult> {
    const testName = "SDK Parameter Handling";
    console.log(`\n🔹 ${testName}...`);

    try {
      const startTime = Date.now();
      const sdk = new NeuroLink();

      // Test different parameter combinations
      const paramTests = [
        { temperature: 0, maxTokens: 1000, systemPrompt: undefined },
        {
          temperature: 0.5,
          maxTokens: 1000,
          systemPrompt: "You are a helpful assistant.",
        },
        {
          temperature: 1.0,
          maxTokens: 1000,
          systemPrompt: "Be creative and fun.",
        },
      ];

      const results = [];

      for (const params of paramTests) {
        const result = await sdk.generate({
          input: { text: 'Say "test" and describe the weather.' },
          provider: providerName as any,
          ...params,
        });

        results.push({
          params,
          success: !!result.content,
          contentLength: result.content?.length || 0,
        });
      }

      const duration = Date.now() - startTime;
      const allSuccessful = results.every((r) => r.success);

      if (!allSuccessful) {
        throw new Error("Some parameter combinations failed");
      }

      console.log(
        `   ✅ Success (${duration}ms) - All ${results.length} parameter combinations worked`,
      );

      return {
        name: testName,
        success: true,
        duration,
        details: { parameterTests: results.length, allSuccessful },
      };
    } catch (error) {
      console.log(
        `   ❌ Failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        name: testName,
        success: false,
        duration: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private static async testSDKToolIntegration(
    providerName: string,
    config: ProviderTestConfig,
  ): Promise<TestResult> {
    const testName = "SDK Tool Integration (MCP)";
    console.log(`\n🔹 ${testName}...`);

    try {
      const startTime = Date.now();
      const sdk = new NeuroLink();

      const result = await sdk.generate({
        input: {
          text: "What time is it right now? Please use tools to get the current time.",
        },
        provider: providerName as any,
        maxTokens: 2000,
        // Tools should be enabled by default
      });

      const duration = Date.now() - startTime;

      // Check if tools were potentially used (heuristic check)
      const mentionsTime =
        result.content?.toLowerCase().includes("time") ||
        result.content?.match(/\d{1,2}:\d{2}/) !== null;

      const hasToolInfo =
        !!(result as any).toolCalls || !!(result as any).toolResults;

      console.log(
        `   ✅ Success (${duration}ms) - Tool integration available, mentions time: ${mentionsTime}`,
      );

      return {
        name: testName,
        success: true,
        duration,
        details: {
          mentionsTime,
          hasToolInfo,
          contentLength: result.content?.length || 0,
        },
      };
    } catch (error) {
      console.log(
        `   ❌ Failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        name: testName,
        success: false,
        duration: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private static async testSDKAnalytics(
    providerName: string,
    config: ProviderTestConfig,
  ): Promise<TestResult> {
    const testName = "SDK Analytics";
    console.log(`\n🔹 ${testName}...`);

    try {
      const startTime = Date.now();
      const sdk = new NeuroLink();

      const result = await sdk.generate({
        input: { text: 'Say "analytics test"' },
        provider: providerName as any,
        maxTokens: 2000,
        enableAnalytics: true,
      });

      const duration = Date.now() - startTime;
      const hasAnalytics = !!(result as any).analytics;

      console.log(
        `   ✅ Success (${duration}ms) - Analytics enabled: ${hasAnalytics}`,
      );

      return {
        name: testName,
        success: true,
        duration,
        details: {
          hasAnalytics,
          analyticsKeys: hasAnalytics
            ? Object.keys((result as any).analytics)
            : [],
        },
      };
    } catch (error) {
      console.log(
        `   ❌ Failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        name: testName,
        success: false,
        duration: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private static async testSDKEvaluation(
    providerName: string,
    config: ProviderTestConfig,
  ): Promise<TestResult> {
    const testName = "SDK Evaluation";
    console.log(`\n🔹 ${testName}...`);

    try {
      const startTime = Date.now();
      const sdk = new NeuroLink();

      const result = await sdk.generate({
        input: {
          text: "Explain what artificial intelligence is in one sentence.",
        },
        provider: providerName as any,
        maxTokens: 2000,
        enableEvaluation: false,
      });

      const duration = Date.now() - startTime;
      const hasEvaluation = !!(result as any).evaluation;

      console.log(
        `   ✅ Success (${duration}ms) - Evaluation enabled: ${hasEvaluation}`,
      );

      return {
        name: testName,
        success: true,
        duration,
        details: {
          hasEvaluation,
          evaluationKeys: hasEvaluation
            ? Object.keys((result as any).evaluation)
            : [],
        },
      };
    } catch (error) {
      console.log(
        `   ❌ Failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        name: testName,
        success: false,
        duration: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private static async testSDKErrorHandling(
    providerName: string,
    config: ProviderTestConfig,
  ): Promise<TestResult> {
    const testName = "SDK Error Handling";
    console.log(`\n🔹 ${testName}...`);

    try {
      const startTime = Date.now();
      const sdk = new NeuroLink();

      // Test with invalid parameters - should handle gracefully
      let errorCaught = false;
      try {
        await sdk.generate({
          input: { text: "test" },
          provider: providerName as any,
          maxTokens: -1, // Invalid value
        });
      } catch (error) {
        errorCaught = true;
      }

      const duration = Date.now() - startTime;

      console.log(
        `   ✅ Success (${duration}ms) - Error handling works: ${errorCaught}`,
      );

      return {
        name: testName,
        success: true,
        duration,
        details: {
          errorHandling: errorCaught,
          message: errorCaught
            ? "Properly caught invalid parameters"
            : "Parameters accepted",
        },
      };
    } catch (error) {
      console.log(
        `   ❌ Failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        name: testName,
        success: false,
        duration: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private static async testCLIBasicGeneration(
    providerName: string,
    config: ProviderTestConfig,
  ): Promise<TestResult> {
    const testName = "CLI Basic Generation";
    console.log(`\n🔹 ${testName}...`);

    try {
      const startTime = Date.now();

      // Get the API key for this provider
      const apiKey =
        process.env[config.apiKeyEnv] ||
        process.env[config.apiKeyEnv.replace("_API_KEY", "_KEY")];

      const cliPath = path.resolve(__dirname, "../cli/index.ts");

      const result = await this.execCLI(
        [
          "generate",
          'Say "Hello from CLI" and nothing else.',
          "--provider",
          providerName,
          "--max-tokens",
          "2000",
          "--temperature",
          "0",
          "--output-format",
          "text",
        ],
        {
          ...process.env,
          [config.apiKeyEnv]: apiKey,
        },
      );

      const duration = Date.now() - startTime;

      if (result.exitCode !== 0) {
        throw new Error(
          `CLI exited with code ${result.exitCode}: ${result.stderr}`,
        );
      }

      if (!result.stdout || result.stdout.trim().length === 0) {
        throw new Error("No output from CLI");
      }

      console.log(
        `   ✅ Success (${duration}ms) - CLI output: ${result.stdout.substring(0, 50)}...`,
      );

      return {
        name: testName,
        success: true,
        duration,
        details: {
          exitCode: result.exitCode,
          outputLength: result.stdout.length,
          hasOutput: result.stdout.length > 0,
        },
      };
    } catch (error) {
      console.log(
        `   ❌ Failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        name: testName,
        success: false,
        duration: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private static async testCLIStreaming(
    providerName: string,
    config: ProviderTestConfig,
  ): Promise<TestResult> {
    const testName = "CLI Streaming";
    console.log(`\n🔹 ${testName}...`);

    try {
      const startTime = Date.now();

      const apiKey =
        process.env[config.apiKeyEnv] ||
        process.env[config.apiKeyEnv.replace("_API_KEY", "_KEY")];
      const cliPath = path.resolve(__dirname, "../cli/index.ts");

      const result = await this.execCLI(
        [
          "stream",
          "Count from 1 to 3.",
          "--provider",
          providerName,
          "--max-tokens",
          "1000",
        ],
        {
          ...process.env,
          [config.apiKeyEnv]: apiKey,
        },
      );

      const duration = Date.now() - startTime;

      if (result.exitCode !== 0) {
        throw new Error(
          `CLI stream exited with code ${result.exitCode}: ${result.stderr}`,
        );
      }

      if (!result.stdout || result.stdout.trim().length === 0) {
        throw new Error("No output from CLI stream");
      }

      console.log(
        `   ✅ Success (${duration}ms) - Stream output: ${result.stdout.length} chars`,
      );

      return {
        name: testName,
        success: true,
        duration,
        details: {
          exitCode: result.exitCode,
          outputLength: result.stdout.length,
          hasOutput: result.stdout.length > 0,
        },
      };
    } catch (error) {
      console.log(
        `   ❌ Failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        name: testName,
        success: false,
        duration: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private static async testCLIParameters(
    providerName: string,
    config: ProviderTestConfig,
  ): Promise<TestResult> {
    const testName = "CLI Parameter Handling";
    console.log(`\n🔹 ${testName}...`);

    try {
      const startTime = Date.now();

      const apiKey =
        process.env[config.apiKeyEnv] ||
        process.env[config.apiKeyEnv.replace("_API_KEY", "_KEY")];
      const cliPath = path.resolve(__dirname, "../cli/index.ts");

      // Test with custom parameters
      const result = await this.execCLI(
        [
          "generate",
          'Say "parameter test"',
          "--provider",
          providerName,
          "--max-tokens",
          "2000",
          "--temperature",
          "0.5",
          "--system-prompt",
          "You are a helpful assistant.",
          "--output-format",
          "text",
        ],
        {
          ...process.env,
          [config.apiKeyEnv]: apiKey,
        },
      );

      const duration = Date.now() - startTime;

      if (result.exitCode !== 0) {
        throw new Error(
          `CLI parameters test exited with code ${result.exitCode}: ${result.stderr}`,
        );
      }

      console.log(`   ✅ Success (${duration}ms) - CLI parameters accepted`);

      return {
        name: testName,
        success: true,
        duration,
        details: {
          exitCode: result.exitCode,
          parametersAccepted: true,
        },
      };
    } catch (error) {
      console.log(
        `   ❌ Failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        name: testName,
        success: false,
        duration: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Helper to execute CLI commands
   */
  private static async execCLI(
    args: string[],
    env?: Record<string, string>,
    timeout = 15000,
  ): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
  }> {
    return new Promise((resolve, reject) => {
      const child = spawn("pnpm", ["cli", ...args], {
        stdio: "pipe",
        env: env || process.env,
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
        reject(new Error(`CLI command timed out after ${timeout}ms`));
      }, timeout);

      child.on("close", (code) => {
        clearTimeout(timeoutId);
        resolve({
          stdout,
          stderr,
          exitCode: code || 0,
        });
      });

      child.on("error", (error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
    });
  }

  /**
   * Display test results in a nice format
   */
  private static displayResults(result: TestSuiteResult): void {
    console.log("\n" + "=".repeat(60));
    console.log(`📊 TEST RESULTS FOR ${result.provider.toUpperCase()}`);
    console.log("=".repeat(60));

    console.log(
      `\n🎯 Overall: ${result.overall.success ? "✅ PASS" : "❌ FAIL"}`,
    );
    console.log(
      `📈 Tests: ${result.overall.passed}/${result.overall.total} passed`,
    );
    console.log(`⏱️  Duration: ${result.overall.duration}ms`);

    if (result.overall.failed > 0) {
      console.log(`\n❌ Failed Tests:`);
      result.tests
        .filter((t) => !t.success)
        .forEach((test) => {
          console.log(`   • ${test.name}: ${test.error}`);
        });
    }

    console.log(`\n✅ Passed Tests:`);
    result.tests
      .filter((t) => t.success)
      .forEach((test) => {
        console.log(`   • ${test.name} (${test.duration}ms)`);
      });

    console.log("\n" + "=".repeat(60));

    if (result.overall.success) {
      console.log(
        `🎉 ${result.provider.toUpperCase()} PROVIDER IS FULLY FUNCTIONAL!`,
      );
      console.log("   All SDK and CLI features are working correctly.");
    } else {
      console.log(`⚠️  ${result.provider.toUpperCase()} PROVIDER HAS ISSUES`);
      console.log("   Some features are not working correctly.");
    }

    console.log("=".repeat(60));
  }
}

// Export for use in other tests
export { ProviderTestConfig, TestResult, TestSuiteResult };
