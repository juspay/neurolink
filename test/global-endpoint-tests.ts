#!/usr/bin/env node
/**
 * Global Endpoint Support Tests for Google Vertex AI
 * Tests the new "global" location support for Gemini 3 Pro Preview
 *
 * Tests:
 * 1. CLI generate with global endpoint
 * 2. CLI stream with global endpoint
 * 3. SDK generate with global endpoint
 * 4. SDK stream with global endpoint
 * 5. Regional endpoint backward compatibility
 * 6. Location validation (accept "global", reject "GLOBAL", "us_central1")
 * 7. Default location fallback to us-central1
 */

import { spawn } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import type { ProcessResult } from "../dist/index.js";

// ==================== Configuration ====================

const TEST_CONFIG = {
  provider: "vertex",
  globalModel: "gemini-3-pro-preview", // Model that requires global endpoint
  regionalModel: "gemini-2.0-flash-exp", // Model for regional testing
  maxTokens: 1000,
  timeout: 60000,
};

// Environment backup
const originalEnv = { ...process.env };

// ==================== Utilities ====================

function logSection(title: string): void {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`  ${title}`);
  console.log(`${"=".repeat(70)}\n`);
}

function logTest(
  name: string,
  status: "PASS" | "FAIL" | "SKIP",
  details?: string,
): void {
  const symbol = status === "PASS" ? "✓" : status === "FAIL" ? "✗" : "○";
  const color =
    status === "PASS"
      ? "\x1b[32m"
      : status === "FAIL"
        ? "\x1b[31m"
        : "\x1b[33m";
  console.log(`${color}${symbol}\x1b[0m ${name}`);
  if (details) {
    console.log(`  ${details}`);
  }
}

function runCommand(
  command: string,
  args: string[],
  env?: NodeJS.ProcessEnv,
): Promise<ProcessResult> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      env: { ...process.env, ...env },
      shell: false,
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    const timer = setTimeout(() => {
      child.kill();
      resolve({
        success: false,
        stdout,
        stderr: stderr + "\nProcess timeout",
        code: null,
      });
    }, TEST_CONFIG.timeout);

    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({
        success: code === 0,
        stdout,
        stderr,
        code,
      });
    });

    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({
        success: false,
        stdout,
        stderr: stderr + `\nProcess error: ${error.message}`,
        code: null,
      });
    });
  });
}

function buildCLIArgs(model: string, location?: string): string[] {
  const args = [
    `--provider=${TEST_CONFIG.provider}`,
    `--model=${model}`,
    `--max-tokens=${TEST_CONFIG.maxTokens}`,
  ];
  return args;
}

function restoreEnv(): void {
  // Clear all env vars
  Object.keys(process.env).forEach((key) => {
    if (!originalEnv[key]) {
      delete process.env[key];
    }
  });
  // Restore original values
  Object.assign(process.env, originalEnv);
}

// ==================== Test Functions ====================

async function testCLIGenerateGlobalEndpoint(): Promise<boolean> {
  logSection("Test 1: CLI Generate with Global Endpoint");

  try {
    const result = await runCommand(
      "node",
      [
        "dist/cli/index.js",
        "generate",
        ...buildCLIArgs(TEST_CONFIG.globalModel),
        "Say 'Global endpoint test successful' and nothing else",
      ],
      {
        GOOGLE_CLOUD_LOCATION: "global",
        VERTEX_LOCATION: "global",
        GOOGLE_VERTEX_LOCATION: "global",
      },
    );

    restoreEnv();

    if (!result.success) {
      logTest(
        "CLI Generate - Global Endpoint",
        "FAIL",
        `Exit code: ${result.code}, Error: ${result.stderr}`,
      );
      return false;
    }

    if (
      result.stdout.toLowerCase().includes("global endpoint test successful")
    ) {
      logTest(
        "CLI Generate - Global Endpoint",
        "PASS",
        "Response received successfully",
      );
      return true;
    } else {
      logTest("CLI Generate - Global Endpoint", "FAIL", "Unexpected response");
      return false;
    }
  } catch (error) {
    restoreEnv();
    logTest("CLI Generate - Global Endpoint", "FAIL", (error as Error).message);
    return false;
  }
}

async function testCLIStreamGlobalEndpoint(): Promise<boolean> {
  logSection("Test 2: CLI Stream with Global Endpoint");

  try {
    const result = await runCommand(
      "node",
      [
        "dist/cli/index.js",
        "stream",
        ...buildCLIArgs(TEST_CONFIG.globalModel),
        "Say 'Streaming test' and nothing else",
      ],
      {
        GOOGLE_CLOUD_LOCATION: "global",
        VERTEX_LOCATION: "global",
        GOOGLE_VERTEX_LOCATION: "global",
      },
    );

    restoreEnv();

    if (!result.success) {
      logTest(
        "CLI Stream - Global Endpoint",
        "FAIL",
        `Exit code: ${result.code}, Error: ${result.stderr}`,
      );
      return false;
    }

    if (result.stdout.toLowerCase().includes("streaming test")) {
      logTest(
        "CLI Stream - Global Endpoint",
        "PASS",
        "Streaming response received",
      );
      return true;
    } else {
      logTest("CLI Stream - Global Endpoint", "FAIL", "Unexpected response");
      return false;
    }
  } catch (error) {
    restoreEnv();
    logTest("CLI Stream - Global Endpoint", "FAIL", (error as Error).message);
    return false;
  }
}

async function testSDKGenerateGlobalEndpoint(): Promise<boolean> {
  logSection("Test 3: SDK Generate with Global Endpoint");

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "neurolink-test-"));
  const tempScriptPath = path.join(tempDir, "test-sdk-global.mjs");

  try {
    const testScript = `
import { NeuroLink } from '${process.cwd()}/dist/index.js';

async function testSDKGlobalEndpoint() {
  process.env.GOOGLE_CLOUD_LOCATION = 'global';
  process.env.VERTEX_LOCATION = 'global';
  process.env.GOOGLE_VERTEX_LOCATION = 'global';

  const sdk = new NeuroLink();
  try {
    const result = await sdk.generate({
      input: {
        text: "Say 'SDK global endpoint test successful' and nothing else"
      },
      maxTokens: ${TEST_CONFIG.maxTokens},
      provider: '${TEST_CONFIG.provider}',
      model: '${TEST_CONFIG.globalModel}'
    });

    if (result.content.toLowerCase().includes('sdk global endpoint test successful')) {
      console.log('SDK Generate - Global Endpoint: PASS');
      process.exit(0);
    } else {
      console.log('SDK Generate - Global Endpoint: FAIL - Unexpected response');
      process.exit(1);
    }
  } catch (error) {
    console.error('SDK Generate - Global Endpoint: ERROR -', error.message);
    process.exit(1);
  } finally {
    if (sdk && typeof sdk.dispose === 'function') {
      await sdk.dispose();
    }
  }
}

testSDKGlobalEndpoint();
`;

    fs.writeFileSync(tempScriptPath, testScript);
    const result = await runCommand("node", [tempScriptPath]);

    if (result.success && result.stdout.includes("PASS")) {
      logTest("SDK Generate - Global Endpoint", "PASS", "SDK test successful");
      return true;
    } else {
      logTest(
        "SDK Generate - Global Endpoint",
        "FAIL",
        result.stderr || result.stdout,
      );
      return false;
    }
  } catch (error) {
    logTest("SDK Generate - Global Endpoint", "FAIL", (error as Error).message);
    return false;
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

async function testSDKStreamGlobalEndpoint(): Promise<boolean> {
  logSection("Test 4: SDK Stream with Global Endpoint");

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "neurolink-test-"));
  const tempScriptPath = path.join(tempDir, "test-sdk-stream-global.mjs");

  try {
    const testScript = `
import { NeuroLink } from '${process.cwd()}/dist/index.js';

async function testSDKStreamGlobal() {
  process.env.GOOGLE_CLOUD_LOCATION = 'global';
  process.env.VERTEX_LOCATION = 'global';
  process.env.GOOGLE_VERTEX_LOCATION = 'global';

  const sdk = new NeuroLink();
  try {
    let fullContent = '';

    const result = await sdk.stream({
      input: {
        text: "Say 'SDK streaming test' and nothing else"
      },
      maxTokens: ${TEST_CONFIG.maxTokens},
      provider: '${TEST_CONFIG.provider}',
      model: '${TEST_CONFIG.globalModel}'
    });

    for await (const chunk of result.stream) {
      fullContent += chunk.content;
    }

    if (fullContent.toLowerCase().includes('sdk streaming test')) {
      console.log('SDK Stream - Global Endpoint: PASS');
      process.exit(0);
    } else {
      console.log('SDK Stream - Global Endpoint: FAIL - Unexpected response');
      process.exit(1);
    }
  } catch (error) {
    console.error('SDK Stream - Global Endpoint: ERROR -', error.message);
    process.exit(1);
  } finally {
    if (sdk && typeof sdk.dispose === 'function') {
      await sdk.dispose();
    }
  }
}

testSDKStreamGlobal();
`;

    fs.writeFileSync(tempScriptPath, testScript);
    const result = await runCommand("node", [tempScriptPath]);

    if (result.success && result.stdout.includes("PASS")) {
      logTest(
        "SDK Stream - Global Endpoint",
        "PASS",
        "SDK streaming test successful",
      );
      return true;
    } else {
      logTest(
        "SDK Stream - Global Endpoint",
        "FAIL",
        result.stderr || result.stdout,
      );
      return false;
    }
  } catch (error) {
    logTest("SDK Stream - Global Endpoint", "FAIL", (error as Error).message);
    return false;
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

async function testRegionalEndpointBackwardCompatibility(): Promise<boolean> {
  logSection("Test 5: Regional Endpoint Backward Compatibility");

  try {
    const result = await runCommand(
      "node",
      [
        "dist/cli/index.js",
        "generate",
        ...buildCLIArgs(TEST_CONFIG.regionalModel),
        "Say 'Regional endpoint works' and nothing else",
      ],
      {
        GOOGLE_CLOUD_LOCATION: "us-central1",
        VERTEX_LOCATION: "us-central1",
        GOOGLE_VERTEX_LOCATION: "us-central1",
      },
    );

    restoreEnv();

    if (!result.success) {
      logTest(
        "Regional Endpoint - Backward Compatibility",
        "FAIL",
        `Exit code: ${result.code}, Error: ${result.stderr}`,
      );
      return false;
    }

    if (result.stdout.toLowerCase().includes("regional endpoint works")) {
      logTest(
        "Regional Endpoint - Backward Compatibility",
        "PASS",
        "Regional endpoint us-central1 works correctly",
      );
      return true;
    } else {
      logTest(
        "Regional Endpoint - Backward Compatibility",
        "FAIL",
        "Unexpected response",
      );
      return false;
    }
  } catch (error) {
    restoreEnv();
    logTest(
      "Regional Endpoint - Backward Compatibility",
      "FAIL",
      (error as Error).message,
    );
    return false;
  }
}

async function testLocationValidation(): Promise<boolean> {
  logSection("Test 6: Location Validation");

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "neurolink-test-"));
  const tempScriptPath = path.join(tempDir, "test-validation.mjs");

  try {
    const testScript = `
import { NeuroLink } from '${process.cwd()}/dist/index.js';

async function testValidation() {
  const validLocations = ['global', 'us-central1', 'europe-west1', 'asia-east1'];
  const invalidLocations = ['GLOBAL', 'us_central1', 'US-CENTRAL1', 'invalid'];

  let passCount = 0;
  let failCount = 0;

  // Test valid locations - these should work
  for (const location of validLocations) {
    process.env.GOOGLE_CLOUD_LOCATION = location;
    process.env.VERTEX_LOCATION = location;
    process.env.GOOGLE_VERTEX_LOCATION = location;
    const sdk = new NeuroLink();
    try {
      const model = location === 'global' ? '${TEST_CONFIG.globalModel}' : '${TEST_CONFIG.regionalModel}';
      const result = await sdk.generate({
        input: { text: "Test" },
        maxTokens: 10,
        provider: '${TEST_CONFIG.provider}',
        model: model
      });
      console.log(\`✓ Valid location '\${location}' accepted\`);
      passCount++;
    } catch (error) {
      console.log(\`✗ Valid location '\${location}' rejected: \${error.message}\`);
      failCount++;
    } finally {
      await sdk.dispose();
    }
  }

  // Test invalid locations - these should fail with validation error
  for (const location of invalidLocations) {
    process.env.GOOGLE_CLOUD_LOCATION = location;
    process.env.VERTEX_LOCATION = location;
    process.env.GOOGLE_VERTEX_LOCATION = location;
    const sdk = new NeuroLink();
    try {
      const result = await sdk.generate({
        input: { text: "Test" },
        maxTokens: 10,
        provider: '${TEST_CONFIG.provider}',
        model: '${TEST_CONFIG.regionalModel}'
      });
      console.log(\`✗ Invalid location '\${location}' was accepted (should have been rejected)\`);
      failCount++;
    } catch (error) {
      if (error.message.includes('location') || error.message.includes('region')) {
        console.log(\`✓ Invalid location '\${location}' rejected correctly\`);
        passCount++;
      } else {
        console.log(\`✗ Invalid location '\${location}' failed with wrong error: \${error.message}\`);
        failCount++;
      }
    } finally {
      await sdk.dispose();
    }
  }

  console.log(\`\nValidation Results: \${passCount} passed, \${failCount} failed\`);
  process.exit(failCount === 0 ? 0 : 1);
}

testValidation();
`;

    fs.writeFileSync(tempScriptPath, testScript);
    const result = await runCommand("node", [tempScriptPath]);

    if (result.success) {
      logTest("Location Validation", "PASS", result.stdout);
      return true;
    } else {
      logTest("Location Validation", "FAIL", result.stderr || result.stdout);
      return false;
    }
  } catch (error) {
    logTest("Location Validation", "FAIL", (error as Error).message);
    return false;
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

async function testDefaultLocationFallback(): Promise<boolean> {
  logSection("Test 7: Default Location Fallback");

  try {
    const result = await runCommand(
      "node",
      [
        "dist/cli/index.js",
        "generate",
        ...buildCLIArgs(TEST_CONFIG.regionalModel),
        "Say 'Default location test' and nothing else",
      ],
      {
        GOOGLE_CLOUD_LOCATION: "",
        VERTEX_LOCATION: "",
        GOOGLE_VERTEX_LOCATION: "",
      },
    );

    restoreEnv();

    if (!result.success) {
      logTest(
        "Default Location Fallback",
        "FAIL",
        `Exit code: ${result.code}, Error: ${result.stderr}`,
      );
      return false;
    }

    if (result.stdout.toLowerCase().includes("default location test")) {
      logTest(
        "Default Location Fallback",
        "PASS",
        "Default fallback to us-central1 works correctly",
      );
      return true;
    } else {
      logTest("Default Location Fallback", "FAIL", "Unexpected response");
      return false;
    }
  } catch (error) {
    restoreEnv();
    logTest("Default Location Fallback", "FAIL", (error as Error).message);
    return false;
  }
}

// ==================== Main Execution ====================

async function runAllTests(): Promise<void> {
  console.log("\n" + "=".repeat(70));
  console.log("  GLOBAL ENDPOINT SUPPORT - TEST SUITE");
  console.log("=".repeat(70));

  const results: boolean[] = [];

  // Run all tests
  results.push(await testCLIGenerateGlobalEndpoint());
  results.push(await testCLIStreamGlobalEndpoint());
  results.push(await testSDKGenerateGlobalEndpoint());
  results.push(await testSDKStreamGlobalEndpoint());
  results.push(await testRegionalEndpointBackwardCompatibility());
  results.push(await testLocationValidation());
  results.push(await testDefaultLocationFallback());

  // Summary
  logSection("Test Summary");
  const passed = results.filter((r) => r).length;
  const failed = results.length - passed;

  console.log(`Total Tests: ${results.length}`);
  console.log(`\x1b[32m✓ Passed: ${passed}\x1b[0m`);
  console.log(`\x1b[31m✗ Failed: ${failed}\x1b[0m`);

  process.exit(failed === 0 ? 0 : 1);
}

runAllTests();
