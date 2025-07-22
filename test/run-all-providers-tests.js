#!/usr/bin/env node

/**
 * MULTI-PROVIDER COMPREHENSIVE TEST SUITE
 * Automatically tests ALL available providers with parallel execution
 * Based on run-parallel-tests.js but enhanced for complete provider coverage
 */

import { spawn } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Default timeout for test batches (in milliseconds)
const DEFAULT_BATCH_TIMEOUT_MS = 60000;

// Provider configuration matrix
const PROVIDER_CONFIGS = {
  "google-ai": {
    name: "Google AI Studio",
    envKey: "GOOGLE_AI_API_KEY",
    model: "gemini-2.5-pro",
  },
  openai: {
    name: "OpenAI",
    envKey: "OPENAI_API_KEY",
    model: "gpt-4",
  },
  anthropic: {
    name: "Anthropic",
    envKey: "ANTHROPIC_API_KEY",
    model: "claude-3-sonnet-20240229",
  },
  bedrock: {
    name: "AWS Bedrock",
    envKey: "AWS_ACCESS_KEY_ID",
    model: "anthropic.claude-3-sonnet-20240229-v1:0",
  },
  azure: {
    name: "Azure OpenAI",
    envKey: "AZURE_OPENAI_API_KEY",
    model: "gpt-4",
  },
  vertex: {
    name: "Google Vertex AI",
    envKey: "GOOGLE_APPLICATION_CREDENTIALS",
    model: "gemini-pro",
  },
  huggingface: {
    name: "Hugging Face",
    envKey: "HUGGING_FACE_API_KEY",
    model: "microsoft/DialoGPT-medium",
  },
  mistral: {
    name: "Mistral AI",
    envKey: "MISTRAL_API_KEY",
    model: "mistral-large-latest",
  },
  ollama: {
    name: "Ollama Local",
    envKey: "OLLAMA_BASE_URL",
    model: "llama3.2:latest",
  },
};

// COMPREHENSIVE: All 7 test batches for 100% coverage (as requested)
const TEST_BATCHES = [
  {
    name: "Basic Functionality",
    file: "test/basic-functionality.ts",
    tests: 5,
    timeout: 45000, // Reduced from 60s - basic tests should be faster
  },
  {
    name: "Analytics Features",
    file: "test/analytics-features.ts",
    tests: 6,
    timeout: 90000, // Increased from 60s - analytics needs more time
  },
  {
    name: "Evaluation Features",
    file: "test/evaluation-features.ts",
    tests: 4,
    timeout: 75000, // Increased - evaluation can be slow
  },
  {
    name: "Streaming Validation",
    file: "test/streaming-validation.ts",
    tests: 4,
    timeout: 90000, // Increased - streaming needs more time
  },
  {
    name: "Error Handling",
    file: "test/error-handling.ts",
    tests: 6,
    timeout: 45000, // Reduced - error handling should be fast
  },
  {
    name: "SDK Comprehensive",
    file: "test/sdk-comprehensive.ts",
    tests: 4,
    timeout: 75000, // Increased - comprehensive tests need time
  },
  {
    name: "Parameter Validation",
    file: "test/parameter-validation.ts",
    tests: 7,
    timeout: 45000, // Reduced - parameter validation should be fast
  },
];

const TOTAL_TESTS = TEST_BATCHES.reduce((sum, batch) => sum + batch.tests, 0); // Comprehensive = 36 total tests (5+6+4+4+6+4+7)

// Check which providers have credentials configured
function getAvailableProviders() {
  const available = [];

  for (const [providerId, config] of Object.entries(PROVIDER_CONFIGS)) {
    const hasCredentials = process.env[config.envKey];
    if (hasCredentials) {
      available.push({ providerId, ...config, hasCredentials: true });
    } else {
      console.log(`⚠️  SKIP: ${config.name} (${config.envKey} not configured)`);
    }
  }

  return available;
}

// Run all test batches for a single provider
async function runProviderTests(provider) {
  console.log(`\n🚀 TESTING PROVIDER: ${provider.name.toUpperCase()}`);
  console.log("============================================================");
  console.log(`✅ Provider: ${provider.name} (${provider.providerId})`);
  console.log(`✅ Environment: ${provider.envKey} configured`);
  console.log(`🎛️  Model: ${provider.model}`);
  console.log("============================================================\n");

  const results = {
    provider: provider.providerId,
    providerName: provider.name,
    model: provider.model,
    totalDuration: 0,
    passedBatches: 0,
    failedBatches: 0,
    totalTests: TOTAL_TESTS,
    timestamp: new Date().toISOString(),
    results: [],
  };

  const overallStartTime = Date.now();

  for (let i = 0; i < TEST_BATCHES.length; i++) {
    const batch = TEST_BATCHES[i];
    console.log(`🚀 BATCH ${i + 1}/7: ${batch.name} (${batch.tests} tests)`);
    console.log(`📁 File: ${batch.file}`);
    console.log(`🤖 Provider: ${provider.name}`);

    try {
      const result = await runBatch(batch, provider);
      results.results.push(result);

      if (result.passed) {
        results.passedBatches++;
        console.log(`✅ PASSED: ${batch.name} (${result.duration}ms)`);
      } else {
        results.failedBatches++;
        console.log(`❌ FAILED: ${batch.name} - ${result.error}`);
      }
    } catch (error) {
      results.failedBatches++;
      results.results.push({
        batch,
        passed: false,
        error: error.message,
        duration: 0,
        provider: provider.providerId,
      });
      console.log(`❌ ERROR: ${batch.name} - ${error.message}`);
    }

    console.log("");
  }

  results.totalDuration = Date.now() - overallStartTime;

  // Save provider-specific results
  const resultsFile = `parallel-test-results-${provider.providerId}.json`;
  await fs.writeFile(resultsFile, JSON.stringify(results, null, 2));

  console.log("============================================================");
  console.log(`📊 ${provider.name.toUpperCase()} SUMMARY`);
  console.log("============================================================");
  console.log(`🤖 Provider: ${provider.name} (${provider.providerId})`);
  console.log(`🎛️  Model: ${provider.model}`);
  console.log(
    `⏱️  Total Duration: ${(results.totalDuration / 1000).toFixed(1)}s`,
  );
  console.log(`✅ Passed Batches: ${results.passedBatches}/7`);
  console.log(`❌ Failed Batches: ${results.failedBatches}/7`);
  console.log(`🧪 Total Tests: ${TOTAL_TESTS}`);

  results.results.forEach((result) => {
    const status = result.passed ? "✅" : "❌";
    console.log(`  ${status} ${result.batch.name}`);
  });

  console.log(`\n📄 Detailed results saved to: ${resultsFile}`);

  if (results.failedBatches > 0) {
    console.log(
      `\n⚠️  ${results.failedBatches} batches failed for ${provider.name} provider. Check individual batch outputs above.`,
    );
  } else {
    console.log(`\n🎉 ALL TESTS PASSED for ${provider.name} provider!`);
  }

  return results;
}

// RESTORED: Original vitest-based runBatch function with faster timeout
async function runBatch(batch, provider) {
  const startTime = Date.now();

  // Validate batch.file path to prevent command injection
  if (
    !batch.file ||
    typeof batch.file !== "string" ||
    batch.file.trim().length === 0
  ) {
    throw new Error("Invalid batch file: must be a non-empty string");
  }

  // Ensure batch.file is within the test/ directory and has .ts extension
  if (!batch.file.startsWith("test/") || !batch.file.endsWith(".ts")) {
    throw new Error(
      `Invalid batch file path: ${batch.file}. Must be in test/ directory with .ts extension`,
    );
  }

  // Prevent path traversal attacks
  if (batch.file.includes("..") || batch.file.includes("~")) {
    throw new Error(
      `Invalid batch file path: ${batch.file}. Path traversal not allowed`,
    );
  }

  return new Promise((resolve, reject) => {
    // Use environment variable for project root or current working directory
    const projectRoot = process.env.PROJECT_ROOT || process.cwd();

    // Securely resolve the batch file path
    const resolvedBatchFile = path.resolve(projectRoot, batch.file);
    const testDir = path.resolve(projectRoot, "test");

    // Ensure the resolved path is within the test directory
    if (!resolvedBatchFile.startsWith(testDir + path.sep)) {
      return reject(
        new Error(
          `Resolved batch file path escapes test directory: ${resolvedBatchFile}`,
        ),
      );
    }

    const childProcess = spawn("pnpm", ["vitest", resolvedBatchFile, "--run"], {
      cwd: projectRoot,
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...process.env,
        TEST_PROVIDER: provider.providerId,
        TEST_MODEL: provider.model,
      },
    });

    let stdout = "";
    let stderr = "";

    childProcess.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    childProcess.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    // COMPREHENSIVE: Use 60s timeout per batch for 100% success
    const timeoutMs = batch.timeout || DEFAULT_BATCH_TIMEOUT_MS;
    const timeout = setTimeout(() => {
      childProcess.kill("SIGKILL");
      reject(new Error(`Batch timeout after ${timeoutMs / 1000}s`));
    }, timeoutMs);

    childProcess.on("close", (code) => {
      clearTimeout(timeout);
      const duration = Date.now() - startTime;
      const passed = code === 0;

      let error = null;
      if (!passed) {
        // Extract error from stderr or stdout
        error = stderr.includes("Cannot access")
          ? "Cannot access 'process' before initialization"
          : stderr || `Exit code ${code}`;
      }

      resolve({
        batch,
        passed,
        error,
        duration,
        provider: provider.providerId,
      });
    });

    childProcess.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

// Generate comprehensive multi-provider report
async function generateMultiProviderReport(allResults) {
  console.log("\n\n🎯 MULTI-PROVIDER COMPREHENSIVE REPORT");
  console.log(
    "================================================================",
  );

  const summary = {
    totalProviders: allResults.length,
    totalTests: TOTAL_TESTS * allResults.length,
    passedProviders: allResults.filter((r) => r.failedBatches === 0).length,
    failedProviders: allResults.filter((r) => r.failedBatches > 0).length,
    timestamp: new Date().toISOString(),
    providerResults: allResults,
  };

  console.log(`📊 Providers Tested: ${summary.totalProviders}`);
  console.log(
    `🧪 Total Test Executions: ${summary.totalTests} (${TOTAL_TESTS} tests × ${allResults.length} providers)`,
  );
  console.log(
    `✅ Fully Passing Providers: ${summary.passedProviders}/${summary.totalProviders}`,
  );
  console.log(
    `❌ Providers with Issues: ${summary.failedProviders}/${summary.totalProviders}`,
  );

  console.log("\n📋 PROVIDER-BY-PROVIDER BREAKDOWN:");
  allResults.forEach((result) => {
    const status =
      result.failedBatches === 0
        ? "✅ PERFECT"
        : `❌ ${result.failedBatches} FAILED`;
    console.log(
      `  ${status}: ${result.providerName} (${result.passedBatches}/7 batches passed)`,
    );
  });

  // Identify common issues
  const processErrors = allResults.filter((r) =>
    r.results.some(
      (batch) => batch.error && batch.error.includes("Cannot access"),
    ),
  );

  if (processErrors.length > 0) {
    console.log("\n⚠️  PROCESS INITIALIZATION ERRORS DETECTED:");
    processErrors.forEach((r) => {
      console.log(`  ❌ ${r.providerName}: Process initialization issue`);
    });
    console.log(
      "\n🔧 RECOMMENDATION: Apply the process fix to remaining test files",
    );
  } else {
    console.log(
      "\n✅ NO PROCESS INITIALIZATION ERRORS: Fix is working universally!",
    );
  }

  // Save comprehensive report
  await fs.writeFile(
    "multi-provider-test-report.json",
    JSON.stringify(summary, null, 2),
  );
  console.log(
    "\n📄 Comprehensive report saved to: multi-provider-test-report.json",
  );

  return summary;
}

// Main execution
async function main() {
  console.log("🎯 MULTI-PROVIDER COMPREHENSIVE TEST EXECUTION");
  console.log(
    "================================================================",
  );

  // Check available providers
  const availableProviders = getAvailableProviders();

  if (availableProviders.length === 0) {
    console.log("❌ No providers have credentials configured!");
    console.log(
      "\n🔧 Please configure at least one provider in your .env file:",
    );
    Object.entries(PROVIDER_CONFIGS).forEach(([id, config]) => {
      console.log(
        `  ${config.envKey}=your_${id.replace("-", "_")}_credentials`,
      );
    });
    process.exit(1);
  }

  console.log(`\n✅ Found ${availableProviders.length} configured providers:`);
  availableProviders.forEach((p) => {
    console.log(`  ✅ ${p.name} (${p.envKey})`);
  });

  console.log(
    `\n📊 Test Plan: ${TOTAL_TESTS} tests × ${availableProviders.length} providers = ${TOTAL_TESTS * availableProviders.length} total executions`,
  );
  console.log(
    "================================================================\n",
  );

  // Test all available providers
  const allResults = [];

  for (let i = 0; i < availableProviders.length; i++) {
    const provider = availableProviders[i];
    console.log(
      `\n🔄 PROVIDER ${i + 1}/${availableProviders.length}: ${provider.name}`,
    );

    try {
      const result = await runProviderTests(provider);
      allResults.push(result);
    } catch (error) {
      console.log(
        `❌ CRITICAL ERROR testing ${provider.name}: ${error.message}`,
      );
      allResults.push({
        provider: provider.providerId,
        providerName: provider.name,
        error: error.message,
        failedBatches: 7,
        passedBatches: 0,
      });
    }

    // Brief pause between providers
    if (i < availableProviders.length - 1) {
      console.log("\n⏸️  Brief pause before next provider...");
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  // Generate comprehensive report
  const summary = await generateMultiProviderReport(allResults);

  // Final status
  if (summary.failedProviders === 0) {
    console.log("\n🎉 SUCCESS: All providers passed all tests!");
    console.log("✅ The process initialization fix works universally!");
    process.exit(0);
  } else {
    console.log(
      `\n⚠️  PARTIAL SUCCESS: ${summary.passedProviders}/${summary.totalProviders} providers fully passing`,
    );
    console.log("🔧 Some providers need additional attention");
    process.exit(1);
  }
}

// Execute
main().catch((error) => {
  console.error("💥 CRITICAL ERROR:", error);
  process.exit(1);
});
