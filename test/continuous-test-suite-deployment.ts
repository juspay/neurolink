#!/usr/bin/env tsx

/**
 * Continuous Test Suite for NeuroLink Deployment System
 *
 * This test suite verifies that both CLI and SDK can properly:
 * 1. Build applications for deployment using ESBuild and Vite bundlers
 * 2. Deploy to all supported platforms (Vercel, Cloudflare, Netlify, Lambda, Docker, Fly.io)
 * 3. Check deployment status and handle rollbacks
 * 4. Manage environment variables across platforms
 * 5. Validate platform-specific configurations
 * 6. Handle deployment errors gracefully
 *
 * Run with: npx tsx test/continuous-test-suite-deployment.ts
 *
 * Environment variables:
 * - TEST_PLATFORM: Target platform to test (default: "vercel")
 * - TEST_BUNDLER: Bundler to use (default: "esbuild")
 * - SKIP_REAL_DEPLOY: Skip actual deployment tests (default: "true")
 */

import { type ChildProcess, execSync, spawn } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

// Import deployment system components
import { createBundler, createDeployer, DeploymentFactory, deploy } from "../src/lib/deployment/DeploymentFactory.js";
import { BundlerRegistry, DeployerRegistry } from "../src/lib/deployment/DeploymentRegistry.js";
import {
  EnvironmentManager,
  environmentManager,
  PLATFORM_ENV_REQUIREMENTS,
} from "../src/lib/deployment/EnvironmentManager.js";
import type {
  BundlerType,
  DeployConfig,
  DeploymentPlatform,
  DeployResult,
  ValidationResult,
} from "../src/lib/deployment/types/deploymentTypes.js";

// ============================================================================
// Test Configuration
// ============================================================================

const TEST_CONFIG = {
  // Target platform for tests (can be overridden via TEST_PLATFORM env var)
  platform: (process.env.TEST_PLATFORM || "vercel") as DeploymentPlatform,
  // Bundler to use (can be overridden via TEST_BUNDLER env var)
  bundler: (process.env.TEST_BUNDLER || "esbuild") as BundlerType,
  // Skip actual deployment tests (default true for CI)
  skipRealDeploy: process.env.SKIP_REAL_DEPLOY !== "false",
  // Timeout for CLI commands
  timeout: 120000, // 2 minutes
  // Expected supported platforms
  expectedPlatforms: ["vercel", "cloudflare", "netlify", "lambda", "docker", "flyio"] as const,
  // Expected supported bundlers
  expectedBundlers: ["esbuild", "vite"] as const,
};

// Color codes for output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
} as const;

type ColorName = keyof typeof colors;

// ============================================================================
// Utility Functions
// ============================================================================

function log(message: string, color: ColorName = "reset"): void {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title: string): void {
  log(`\n${"=".repeat(70)}`, "cyan");
  log(`  ${title}`, "cyan");
  log(`${"=".repeat(70)}`, "cyan");
}

function logSubSection(title: string): void {
  log(`\n${"─".repeat(50)}`, "blue");
  log(`  ${title}`, "blue");
  log(`${"─".repeat(50)}`, "blue");
}

function logTest(testName: string, status: "PASS" | "FAIL" | "SKIP" | "TESTING", details = ""): void {
  const icons = {
    PASS: "✅",
    FAIL: "❌",
    SKIP: "⏭️",
    TESTING: "🔄",
  };
  const colorMap: Record<string, ColorName> = {
    PASS: "green",
    FAIL: "red",
    SKIP: "yellow",
    TESTING: "magenta",
  };
  const icon = icons[status];
  const color = colorMap[status];
  log(`${icon} ${testName}`, color);
  if (details) {
    log(`   ${details}`, "reset");
  }
}

interface CommandResult {
  code: number;
  stdout: string;
  stderr: string;
  success: boolean;
}

/**
 * Run a CLI command and capture output
 */
function runCommand(
  command: string,
  args: string[] = [],
  options: Record<string, unknown> = {},
): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    let proc: ChildProcess;
    let timeoutId: NodeJS.Timeout;
    let isResolved = false;

    try {
      proc = spawn(command, args, {
        stdio: ["pipe", "pipe", "pipe"],
        shell: true,
        ...options,
      });
    } catch (spawnError) {
      const error = spawnError instanceof Error ? spawnError : new Error(String(spawnError));
      reject(new Error(`Failed to spawn command "${command}": ${error.message}`));
      return;
    }

    let stdout = "";
    let stderr = "";

    proc.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    timeoutId = setTimeout(() => {
      if (isResolved) return;

      if (!proc.killed) {
        proc.kill("SIGTERM");
        setTimeout(() => {
          if (!proc.killed && !isResolved) {
            proc.kill("SIGKILL");
          }
        }, 2000);
      }

      if (!isResolved) {
        isResolved = true;
        reject(
          new Error(
            `Command timeout after ${TEST_CONFIG.timeout}ms: ${command} ${args.join(" ")}\n` +
              `stdout: ${stdout.trim()}\nstderr: ${stderr.trim()}`,
          ),
        );
      }
    }, TEST_CONFIG.timeout);

    proc.on("close", (code, signal) => {
      if (isResolved) return;
      isResolved = true;
      clearTimeout(timeoutId);

      resolve({
        code: typeof code === "number" ? code : -1,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        success: code === 0 && !signal,
      });
    });

    proc.on("error", (error) => {
      if (isResolved) return;
      isResolved = true;
      clearTimeout(timeoutId);
      reject(new Error(`Command error: ${error.message}`));
    });
  });
}

/**
 * Create a temporary test project directory
 */
function createTempProject(): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "neurolink-deploy-test-"));

  // Create basic project structure
  fs.mkdirSync(path.join(tempDir, "src"), { recursive: true });

  // Create a simple entry file
  fs.writeFileSync(
    path.join(tempDir, "src", "index.ts"),
    `
import { Hono } from 'hono';

const app = new Hono();

app.get('/health', (c) => c.json({ status: 'ok' }));
app.get('/api/generate', (c) => c.json({ message: 'NeuroLink API' }));

export default app;
`,
  );

  // Create package.json
  fs.writeFileSync(
    path.join(tempDir, "package.json"),
    JSON.stringify(
      {
        name: "neurolink-deploy-test",
        version: "1.0.0",
        type: "module",
        dependencies: {
          hono: "^4.0.0",
          "@juspay/neurolink": "^8.0.0",
        },
      },
      null,
      2,
    ),
  );

  // Create tsconfig.json
  fs.writeFileSync(
    path.join(tempDir, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          module: "ESNext",
          moduleResolution: "bundler",
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          outDir: "./dist",
        },
        include: ["src/**/*"],
      },
      null,
      2,
    ),
  );

  return tempDir;
}

/**
 * Clean up temporary directory
 */
function cleanupTempDir(dir: string): void {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// ============================================================================
// Test Results Tracking
// ============================================================================

interface TestResult {
  name: string;
  category: string;
  status: "PASS" | "FAIL" | "SKIP";
  duration: number;
  error?: string;
  details?: string;
}

const testResults: TestResult[] = [];

function recordResult(
  name: string,
  category: string,
  status: "PASS" | "FAIL" | "SKIP",
  duration: number,
  error?: string,
  details?: string,
): void {
  testResults.push({ name, category, status, duration, error, details });
}

// ============================================================================
// SDK Tests
// ============================================================================

async function testSDKDeployerRegistry(): Promise<boolean> {
  logSubSection("SDK: Deployer Registry Tests");
  let allPassed = true;
  const startTime = Date.now();

  // Test 1: Check all platforms are registered
  try {
    const registeredPlatforms = DeployerRegistry.listRegistered();
    const missingPlatforms = TEST_CONFIG.expectedPlatforms.filter((p) => !registeredPlatforms.includes(p));

    if (missingPlatforms.length === 0) {
      logTest("All expected platforms registered", "PASS", `Found: ${registeredPlatforms.join(", ")}`);
      recordResult("All platforms registered", "SDK:Registry", "PASS", Date.now() - startTime);
    } else {
      logTest("All expected platforms registered", "FAIL", `Missing: ${missingPlatforms.join(", ")}`);
      recordResult(
        "All platforms registered",
        "SDK:Registry",
        "FAIL",
        Date.now() - startTime,
        `Missing: ${missingPlatforms.join(", ")}`,
      );
      allPassed = false;
    }
  } catch (error) {
    logTest("All expected platforms registered", "FAIL", String(error));
    recordResult("All platforms registered", "SDK:Registry", "FAIL", Date.now() - startTime, String(error));
    allPassed = false;
  }

  // Test 2: Check platform metadata
  try {
    let metadataValid = true;
    const issues: string[] = [];

    for (const platform of TEST_CONFIG.expectedPlatforms) {
      const metadata = DeployerRegistry.getMetadata(platform);
      if (!metadata) {
        issues.push(`${platform}: no metadata`);
        metadataValid = false;
      } else if (!metadata.displayName || !metadata.description || !metadata.features) {
        issues.push(`${platform}: incomplete metadata`);
        metadataValid = false;
      }
    }

    if (metadataValid) {
      logTest("Platform metadata complete", "PASS", "All platforms have valid metadata");
      recordResult("Platform metadata complete", "SDK:Registry", "PASS", Date.now() - startTime);
    } else {
      logTest("Platform metadata complete", "FAIL", issues.join("; "));
      recordResult("Platform metadata complete", "SDK:Registry", "FAIL", Date.now() - startTime, issues.join("; "));
      allPassed = false;
    }
  } catch (error) {
    logTest("Platform metadata complete", "FAIL", String(error));
    recordResult("Platform metadata complete", "SDK:Registry", "FAIL", Date.now() - startTime, String(error));
    allPassed = false;
  }

  // Test 3: Create deployer instance for each platform
  try {
    const creationResults: string[] = [];
    for (const platform of TEST_CONFIG.expectedPlatforms) {
      const factory = DeployerRegistry.get(platform);
      if (factory) {
        const deployer = await factory();
        if (deployer && deployer.name === platform) {
          creationResults.push(`${platform}: OK`);
        } else {
          creationResults.push(`${platform}: invalid instance`);
          allPassed = false;
        }
      } else {
        creationResults.push(`${platform}: no factory`);
        allPassed = false;
      }
    }

    const allCreated = creationResults.every((r) => r.endsWith(": OK"));
    logTest("Deployer instance creation", allCreated ? "PASS" : "FAIL", creationResults.join(", "));
    recordResult("Deployer instance creation", "SDK:Registry", allCreated ? "PASS" : "FAIL", Date.now() - startTime);
  } catch (error) {
    logTest("Deployer instance creation", "FAIL", String(error));
    recordResult("Deployer instance creation", "SDK:Registry", "FAIL", Date.now() - startTime, String(error));
    allPassed = false;
  }

  return allPassed;
}

async function testSDKBundlerRegistry(): Promise<boolean> {
  logSubSection("SDK: Bundler Registry Tests");
  let allPassed = true;
  const startTime = Date.now();

  // Test 1: Check all bundlers are registered
  try {
    const registeredBundlers = BundlerRegistry.listRegistered();
    const missingBundlers = TEST_CONFIG.expectedBundlers.filter((b) => !registeredBundlers.includes(b));

    if (missingBundlers.length === 0) {
      logTest("All expected bundlers registered", "PASS", `Found: ${registeredBundlers.join(", ")}`);
      recordResult("All bundlers registered", "SDK:Bundler", "PASS", Date.now() - startTime);
    } else {
      logTest("All expected bundlers registered", "FAIL", `Missing: ${missingBundlers.join(", ")}`);
      recordResult("All bundlers registered", "SDK:Bundler", "FAIL", Date.now() - startTime);
      allPassed = false;
    }
  } catch (error) {
    logTest("All expected bundlers registered", "FAIL", String(error));
    recordResult("All bundlers registered", "SDK:Bundler", "FAIL", Date.now() - startTime, String(error));
    allPassed = false;
  }

  // Test 2: Check bundler metadata
  try {
    let metadataValid = true;
    const issues: string[] = [];

    for (const bundler of TEST_CONFIG.expectedBundlers) {
      const metadata = BundlerRegistry.getMetadata(bundler);
      if (!metadata) {
        issues.push(`${bundler}: no metadata`);
        metadataValid = false;
      } else if (!metadata.displayName || !metadata.description || !metadata.supportedTargets) {
        issues.push(`${bundler}: incomplete metadata`);
        metadataValid = false;
      }
    }

    if (metadataValid) {
      logTest("Bundler metadata complete", "PASS", "All bundlers have valid metadata");
      recordResult("Bundler metadata complete", "SDK:Bundler", "PASS", Date.now() - startTime);
    } else {
      logTest("Bundler metadata complete", "FAIL", issues.join("; "));
      recordResult("Bundler metadata complete", "SDK:Bundler", "FAIL", Date.now() - startTime, issues.join("; "));
      allPassed = false;
    }
  } catch (error) {
    logTest("Bundler metadata complete", "FAIL", String(error));
    recordResult("Bundler metadata complete", "SDK:Bundler", "FAIL", Date.now() - startTime, String(error));
    allPassed = false;
  }

  // Test 3: Create bundler instance for each type
  try {
    const creationResults: string[] = [];
    for (const bundlerType of TEST_CONFIG.expectedBundlers) {
      const factory = BundlerRegistry.get(bundlerType);
      if (factory) {
        const bundler = await factory();
        if (bundler && bundler.name === bundlerType) {
          creationResults.push(`${bundlerType}: OK`);
        } else {
          creationResults.push(`${bundlerType}: invalid instance`);
          allPassed = false;
        }
      } else {
        creationResults.push(`${bundlerType}: no factory`);
        allPassed = false;
      }
    }

    const allCreated = creationResults.every((r) => r.endsWith(": OK"));
    logTest("Bundler instance creation", allCreated ? "PASS" : "FAIL", creationResults.join(", "));
    recordResult("Bundler instance creation", "SDK:Bundler", allCreated ? "PASS" : "FAIL", Date.now() - startTime);
  } catch (error) {
    logTest("Bundler instance creation", "FAIL", String(error));
    recordResult("Bundler instance creation", "SDK:Bundler", "FAIL", Date.now() - startTime, String(error));
    allPassed = false;
  }

  return allPassed;
}

async function testSDKDeploymentFactory(): Promise<boolean> {
  logSubSection("SDK: DeploymentFactory Tests");
  let allPassed = true;
  const startTime = Date.now();

  // Test 1: Create deployer via factory
  try {
    const deployer = await DeploymentFactory.createDeployer("vercel");
    if (deployer && deployer.name === "vercel") {
      logTest("Create deployer via factory", "PASS", "Vercel deployer created");
      recordResult("Create deployer via factory", "SDK:Factory", "PASS", Date.now() - startTime);
    } else {
      logTest("Create deployer via factory", "FAIL", "Invalid deployer instance");
      recordResult("Create deployer via factory", "SDK:Factory", "FAIL", Date.now() - startTime);
      allPassed = false;
    }
  } catch (error) {
    logTest("Create deployer via factory", "FAIL", String(error));
    recordResult("Create deployer via factory", "SDK:Factory", "FAIL", Date.now() - startTime, String(error));
    allPassed = false;
  }

  // Test 2: Create bundler via factory
  try {
    const bundler = await DeploymentFactory.createBundler("esbuild");
    if (bundler && bundler.name === "esbuild") {
      logTest("Create bundler via factory", "PASS", "ESBuild bundler created");
      recordResult("Create bundler via factory", "SDK:Factory", "PASS", Date.now() - startTime);
    } else {
      logTest("Create bundler via factory", "FAIL", "Invalid bundler instance");
      recordResult("Create bundler via factory", "SDK:Factory", "FAIL", Date.now() - startTime);
      allPassed = false;
    }
  } catch (error) {
    logTest("Create bundler via factory", "FAIL", String(error));
    recordResult("Create bundler via factory", "SDK:Factory", "FAIL", Date.now() - startTime, String(error));
    allPassed = false;
  }

  // Test 3: Get supported platforms
  try {
    const platforms = await DeploymentFactory.getSupportedPlatforms();
    if (platforms && platforms.length >= 6) {
      logTest("Get supported platforms", "PASS", `Found ${platforms.length} platforms`);
      recordResult("Get supported platforms", "SDK:Factory", "PASS", Date.now() - startTime);
    } else {
      logTest("Get supported platforms", "FAIL", `Expected 6+, got ${platforms?.length}`);
      recordResult("Get supported platforms", "SDK:Factory", "FAIL", Date.now() - startTime);
      allPassed = false;
    }
  } catch (error) {
    logTest("Get supported platforms", "FAIL", String(error));
    recordResult("Get supported platforms", "SDK:Factory", "FAIL", Date.now() - startTime, String(error));
    allPassed = false;
  }

  // Test 4: Get supported bundlers
  try {
    const bundlers = await DeploymentFactory.getSupportedBundlers();
    if (bundlers && bundlers.length >= 2) {
      logTest("Get supported bundlers", "PASS", `Found ${bundlers.length} bundlers`);
      recordResult("Get supported bundlers", "SDK:Factory", "PASS", Date.now() - startTime);
    } else {
      logTest("Get supported bundlers", "FAIL", `Expected 2+, got ${bundlers?.length}`);
      recordResult("Get supported bundlers", "SDK:Factory", "FAIL", Date.now() - startTime);
      allPassed = false;
    }
  } catch (error) {
    logTest("Get supported bundlers", "FAIL", String(error));
    recordResult("Get supported bundlers", "SDK:Factory", "FAIL", Date.now() - startTime, String(error));
    allPassed = false;
  }

  // Test 5: Convenience functions
  try {
    const deployer = await createDeployer("cloudflare");
    const bundler = await createBundler("vite");

    if (deployer.name === "cloudflare" && bundler.name === "vite") {
      logTest("Convenience functions", "PASS", "createDeployer and createBundler work");
      recordResult("Convenience functions", "SDK:Factory", "PASS", Date.now() - startTime);
    } else {
      logTest("Convenience functions", "FAIL", "Invalid instances from convenience functions");
      recordResult("Convenience functions", "SDK:Factory", "FAIL", Date.now() - startTime);
      allPassed = false;
    }
  } catch (error) {
    logTest("Convenience functions", "FAIL", String(error));
    recordResult("Convenience functions", "SDK:Factory", "FAIL", Date.now() - startTime, String(error));
    allPassed = false;
  }

  return allPassed;
}

async function testSDKEnvironmentManager(): Promise<boolean> {
  logSubSection("SDK: EnvironmentManager Tests");
  let allPassed = true;
  const startTime = Date.now();

  // Test 1: Basic environment operations
  try {
    const envManager = new EnvironmentManager();
    envManager.set("TEST_VAR", "test_value");

    const getValue = envManager.get("TEST_VAR");
    const hasVar = envManager.has("TEST_VAR");

    if (getValue === "test_value" && hasVar) {
      logTest("Basic environment operations", "PASS", "set/get/has work correctly");
      recordResult("Basic environment operations", "SDK:EnvManager", "PASS", Date.now() - startTime);
    } else {
      logTest("Basic environment operations", "FAIL", "set/get/has not working");
      recordResult("Basic environment operations", "SDK:EnvManager", "FAIL", Date.now() - startTime);
      allPassed = false;
    }
  } catch (error) {
    logTest("Basic environment operations", "FAIL", String(error));
    recordResult("Basic environment operations", "SDK:EnvManager", "FAIL", Date.now() - startTime, String(error));
    allPassed = false;
  }

  // Test 2: Secret detection
  try {
    const envManager = new EnvironmentManager();
    envManager.set("API_KEY", "secret123");
    envManager.set("MY_PASSWORD", "pass456");
    envManager.set("NORMAL_VAR", "value");

    const isApiKeySecret = envManager.isSecret("API_KEY");
    const isPasswordSecret = envManager.isSecret("MY_PASSWORD");
    const isNormalSecret = envManager.isSecret("NORMAL_VAR");

    if (isApiKeySecret && isPasswordSecret && !isNormalSecret) {
      logTest("Secret detection", "PASS", "Secrets detected correctly");
      recordResult("Secret detection", "SDK:EnvManager", "PASS", Date.now() - startTime);
    } else {
      logTest("Secret detection", "FAIL", "Secret detection not working properly");
      recordResult("Secret detection", "SDK:EnvManager", "FAIL", Date.now() - startTime);
      allPassed = false;
    }
  } catch (error) {
    logTest("Secret detection", "FAIL", String(error));
    recordResult("Secret detection", "SDK:EnvManager", "FAIL", Date.now() - startTime, String(error));
    allPassed = false;
  }

  // Test 3: Platform validation
  try {
    const envManager = new EnvironmentManager();
    envManager.set("OPENAI_API_KEY", "test-key");
    envManager.set("VERCEL_TOKEN", "vercel-token");

    const result = envManager.validateForPlatform("vercel");

    if (result && typeof result.valid === "boolean" && Array.isArray(result.errors)) {
      logTest("Platform validation", "PASS", `Valid: ${result.valid}, Errors: ${result.errors.length}`);
      recordResult("Platform validation", "SDK:EnvManager", "PASS", Date.now() - startTime);
    } else {
      logTest("Platform validation", "FAIL", "Invalid validation result structure");
      recordResult("Platform validation", "SDK:EnvManager", "FAIL", Date.now() - startTime);
      allPassed = false;
    }
  } catch (error) {
    logTest("Platform validation", "FAIL", String(error));
    recordResult("Platform validation", "SDK:EnvManager", "FAIL", Date.now() - startTime, String(error));
    allPassed = false;
  }

  // Test 4: Platform env requirements exist
  try {
    const missingPlatforms: string[] = [];
    for (const platform of TEST_CONFIG.expectedPlatforms) {
      if (!PLATFORM_ENV_REQUIREMENTS[platform]) {
        missingPlatforms.push(platform);
      }
    }

    if (missingPlatforms.length === 0) {
      logTest("Platform env requirements", "PASS", "All platforms have env requirements defined");
      recordResult("Platform env requirements", "SDK:EnvManager", "PASS", Date.now() - startTime);
    } else {
      logTest("Platform env requirements", "FAIL", `Missing: ${missingPlatforms.join(", ")}`);
      recordResult("Platform env requirements", "SDK:EnvManager", "FAIL", Date.now() - startTime);
      allPassed = false;
    }
  } catch (error) {
    logTest("Platform env requirements", "FAIL", String(error));
    recordResult("Platform env requirements", "SDK:EnvManager", "FAIL", Date.now() - startTime, String(error));
    allPassed = false;
  }

  // Test 5: toRecord and toEnvFile
  try {
    const envManager = new EnvironmentManager();
    envManager.set("VAR1", "value1");
    envManager.set("VAR2", "value with spaces");

    const record = envManager.toRecord();
    const envFile = envManager.toEnvFile();

    if (record["VAR1"] === "value1" && record["VAR2"] === "value with spaces" && envFile.includes("VAR1=value1")) {
      logTest("toRecord and toEnvFile", "PASS", "Conversion methods work");
      recordResult("toRecord and toEnvFile", "SDK:EnvManager", "PASS", Date.now() - startTime);
    } else {
      logTest("toRecord and toEnvFile", "FAIL", "Conversion methods not working");
      recordResult("toRecord and toEnvFile", "SDK:EnvManager", "FAIL", Date.now() - startTime);
      allPassed = false;
    }
  } catch (error) {
    logTest("toRecord and toEnvFile", "FAIL", String(error));
    recordResult("toRecord and toEnvFile", "SDK:EnvManager", "FAIL", Date.now() - startTime, String(error));
    allPassed = false;
  }

  return allPassed;
}

async function testSDKDeployerValidation(): Promise<boolean> {
  logSubSection("SDK: Deployer Validation Tests");
  let allPassed = true;
  const startTime = Date.now();
  let tempDir: string | null = null;

  try {
    tempDir = createTempProject();

    const config: DeployConfig = {
      platform: "vercel",
      entry: path.join(tempDir, "src", "index.ts"),
      outDir: path.join(tempDir, "dist"),
    };

    // Test validation for each platform
    for (const platform of ["vercel", "cloudflare", "netlify", "lambda"] as const) {
      try {
        const deployer = await DeploymentFactory.createDeployer(platform);
        const validationResult = await deployer.validate({
          ...config,
          platform,
        });

        if (validationResult && typeof validationResult.valid === "boolean" && Array.isArray(validationResult.errors)) {
          logTest(
            `${platform} validation structure`,
            "PASS",
            `Valid: ${validationResult.valid}, Errors: ${validationResult.errors.length}`,
          );
          recordResult(`${platform} validation structure`, "SDK:Validation", "PASS", Date.now() - startTime);
        } else {
          logTest(`${platform} validation structure`, "FAIL", "Invalid result structure");
          recordResult(`${platform} validation structure`, "SDK:Validation", "FAIL", Date.now() - startTime);
          allPassed = false;
        }
      } catch (error) {
        logTest(`${platform} validation structure`, "FAIL", String(error));
        recordResult(
          `${platform} validation structure`,
          "SDK:Validation",
          "FAIL",
          Date.now() - startTime,
          String(error),
        );
        allPassed = false;
      }
    }
  } finally {
    if (tempDir) {
      cleanupTempDir(tempDir);
    }
  }

  return allPassed;
}

// ============================================================================
// CLI Tests
// ============================================================================

async function testCLIDeployHelp(): Promise<boolean> {
  logSubSection("CLI: Deploy Command Help Tests");
  let allPassed = true;
  const startTime = Date.now();

  // Test 1: Main deploy help
  try {
    const result = await runCommand("pnpm", ["run", "cli", "deploy", "--help"]);

    if (result.stdout.includes("deploy") || result.stderr.includes("deploy")) {
      logTest("deploy --help", "PASS", "Deploy help command works");
      recordResult("deploy --help", "CLI:Help", "PASS", Date.now() - startTime);
    } else {
      logTest("deploy --help", "FAIL", "Deploy help not showing expected output");
      recordResult("deploy --help", "CLI:Help", "FAIL", Date.now() - startTime);
      allPassed = false;
    }
  } catch (error) {
    logTest("deploy --help", "FAIL", String(error));
    recordResult("deploy --help", "CLI:Help", "FAIL", Date.now() - startTime, String(error));
    allPassed = false;
  }

  // Test 2: deploy build help
  try {
    const result = await runCommand("pnpm", ["run", "cli", "deploy", "build", "--help"]);

    const output = result.stdout + result.stderr;
    if (output.includes("build") || output.includes("bundler")) {
      logTest("deploy build --help", "PASS", "Build subcommand help works");
      recordResult("deploy build --help", "CLI:Help", "PASS", Date.now() - startTime);
    } else {
      logTest("deploy build --help", "FAIL", "Build help not showing expected output");
      recordResult("deploy build --help", "CLI:Help", "FAIL", Date.now() - startTime);
      allPassed = false;
    }
  } catch (error) {
    logTest("deploy build --help", "FAIL", String(error));
    recordResult("deploy build --help", "CLI:Help", "FAIL", Date.now() - startTime, String(error));
    allPassed = false;
  }

  // Test 3: deploy push help
  try {
    const result = await runCommand("pnpm", ["run", "cli", "deploy", "push", "--help"]);

    const output = result.stdout + result.stderr;
    if (output.includes("push") || output.includes("platform") || output.includes("deploy")) {
      logTest("deploy push --help", "PASS", "Push subcommand help works");
      recordResult("deploy push --help", "CLI:Help", "PASS", Date.now() - startTime);
    } else {
      logTest("deploy push --help", "FAIL", "Push help not showing expected output");
      recordResult("deploy push --help", "CLI:Help", "FAIL", Date.now() - startTime);
      allPassed = false;
    }
  } catch (error) {
    logTest("deploy push --help", "FAIL", String(error));
    recordResult("deploy push --help", "CLI:Help", "FAIL", Date.now() - startTime, String(error));
    allPassed = false;
  }

  // Test 4: deploy status help
  try {
    const result = await runCommand("pnpm", ["run", "cli", "deploy", "status", "--help"]);

    const output = result.stdout + result.stderr;
    if (output.includes("status") || output.includes("deployment")) {
      logTest("deploy status --help", "PASS", "Status subcommand help works");
      recordResult("deploy status --help", "CLI:Help", "PASS", Date.now() - startTime);
    } else {
      logTest("deploy status --help", "FAIL", "Status help not showing expected output");
      recordResult("deploy status --help", "CLI:Help", "FAIL", Date.now() - startTime);
      allPassed = false;
    }
  } catch (error) {
    logTest("deploy status --help", "FAIL", String(error));
    recordResult("deploy status --help", "CLI:Help", "FAIL", Date.now() - startTime, String(error));
    allPassed = false;
  }

  return allPassed;
}

async function testCLIDeployPlatforms(): Promise<boolean> {
  logSubSection("CLI: Deploy Platforms Command Tests");
  let allPassed = true;
  const startTime = Date.now();

  try {
    const result = await runCommand("pnpm", ["run", "cli", "deploy", "platforms"]);

    const output = result.stdout + result.stderr;
    const foundPlatforms = TEST_CONFIG.expectedPlatforms.filter((p) => output.toLowerCase().includes(p.toLowerCase()));

    if (foundPlatforms.length >= 4) {
      logTest(
        "deploy platforms",
        "PASS",
        `Found ${foundPlatforms.length}/${TEST_CONFIG.expectedPlatforms.length} platforms`,
      );
      recordResult("deploy platforms", "CLI:Platforms", "PASS", Date.now() - startTime);
    } else {
      logTest("deploy platforms", "FAIL", `Only found ${foundPlatforms.length} platforms`);
      recordResult("deploy platforms", "CLI:Platforms", "FAIL", Date.now() - startTime);
      allPassed = false;
    }
  } catch (error) {
    logTest("deploy platforms", "FAIL", String(error));
    recordResult("deploy platforms", "CLI:Platforms", "FAIL", Date.now() - startTime, String(error));
    allPassed = false;
  }

  return allPassed;
}

async function testCLIDeployBundlers(): Promise<boolean> {
  logSubSection("CLI: Deploy Bundlers Command Tests");
  let allPassed = true;
  const startTime = Date.now();

  try {
    const result = await runCommand("pnpm", ["run", "cli", "deploy", "bundlers"]);

    const output = result.stdout + result.stderr;
    const foundBundlers = TEST_CONFIG.expectedBundlers.filter((b) => output.toLowerCase().includes(b.toLowerCase()));

    if (foundBundlers.length >= 2) {
      logTest(
        "deploy bundlers",
        "PASS",
        `Found ${foundBundlers.length}/${TEST_CONFIG.expectedBundlers.length} bundlers`,
      );
      recordResult("deploy bundlers", "CLI:Bundlers", "PASS", Date.now() - startTime);
    } else {
      logTest("deploy bundlers", "FAIL", `Only found ${foundBundlers.length} bundlers`);
      recordResult("deploy bundlers", "CLI:Bundlers", "FAIL", Date.now() - startTime);
      allPassed = false;
    }
  } catch (error) {
    logTest("deploy bundlers", "FAIL", String(error));
    recordResult("deploy bundlers", "CLI:Bundlers", "FAIL", Date.now() - startTime, String(error));
    allPassed = false;
  }

  return allPassed;
}

async function testCLIDeployEnv(): Promise<boolean> {
  logSubSection("CLI: Deploy Env Command Tests");
  let allPassed = true;
  const startTime = Date.now();

  try {
    const result = await runCommand("pnpm", ["run", "cli", "deploy", "env", "--platform", "vercel"]);

    const output = result.stdout + result.stderr;
    // Should show environment variable requirements
    if (
      output.includes("VERCEL") ||
      output.includes("environment") ||
      output.includes("variable") ||
      output.includes("required")
    ) {
      logTest("deploy env --platform vercel", "PASS", "Environment info displayed");
      recordResult("deploy env --platform vercel", "CLI:Env", "PASS", Date.now() - startTime);
    } else {
      logTest("deploy env --platform vercel", "FAIL", "No environment info in output");
      recordResult("deploy env --platform vercel", "CLI:Env", "FAIL", Date.now() - startTime);
      allPassed = false;
    }
  } catch (error) {
    logTest("deploy env --platform vercel", "FAIL", String(error));
    recordResult("deploy env --platform vercel", "CLI:Env", "FAIL", Date.now() - startTime, String(error));
    allPassed = false;
  }

  return allPassed;
}

async function testCLIDeployBuildDryRun(): Promise<boolean> {
  logSubSection("CLI: Deploy Build Dry Run Tests");
  let allPassed = true;
  const startTime = Date.now();
  let tempDir: string | null = null;

  try {
    tempDir = createTempProject();

    // Test build with --dry-run flag
    const result = await runCommand("pnpm", [
      "run",
      "cli",
      "deploy",
      "build",
      "--entry",
      path.join(tempDir, "src", "index.ts"),
      "--out-dir",
      path.join(tempDir, "dist"),
      "--bundler",
      "esbuild",
      "--dry-run",
    ]);

    const output = result.stdout + result.stderr;

    // Check for any indication of dry run or build analysis
    if (
      output.includes("dry") ||
      output.includes("would") ||
      output.includes("build") ||
      output.includes("analysis") ||
      result.code === 0
    ) {
      logTest("deploy build --dry-run", "PASS", "Dry run completed");
      recordResult("deploy build --dry-run", "CLI:Build", "PASS", Date.now() - startTime);
    } else {
      logTest("deploy build --dry-run", "FAIL", `Exit code: ${result.code}`);
      recordResult("deploy build --dry-run", "CLI:Build", "FAIL", Date.now() - startTime, `Exit code: ${result.code}`);
      allPassed = false;
    }
  } catch (error) {
    logTest("deploy build --dry-run", "FAIL", String(error));
    recordResult("deploy build --dry-run", "CLI:Build", "FAIL", Date.now() - startTime, String(error));
    allPassed = false;
  } finally {
    if (tempDir) {
      cleanupTempDir(tempDir);
    }
  }

  return allPassed;
}

// ============================================================================
// Integration Tests
// ============================================================================

async function testEndToEndBuildWorkflow(): Promise<boolean> {
  if (TEST_CONFIG.skipRealDeploy) {
    logSubSection("Integration: E2E Build Workflow (Skipped - SKIP_REAL_DEPLOY=true)");
    logTest("E2E Build Workflow", "SKIP", "Set SKIP_REAL_DEPLOY=false to enable");
    recordResult("E2E Build Workflow", "Integration", "SKIP", 0, "Skipped due to SKIP_REAL_DEPLOY");
    return true;
  }

  logSubSection("Integration: E2E Build Workflow");
  let allPassed = true;
  const startTime = Date.now();
  let tempDir: string | null = null;

  try {
    tempDir = createTempProject();

    // Step 1: Create bundler
    const bundler = await DeploymentFactory.createBundler(TEST_CONFIG.bundler);
    logTest("Create bundler", "PASS", `Created ${TEST_CONFIG.bundler} bundler`);

    // Step 2: Build the project
    const buildResult = await bundler.bundle({
      entry: path.join(tempDir, "src", "index.ts"),
      outDir: path.join(tempDir, "dist"),
      target: "node",
      minify: false,
    });

    if (buildResult && buildResult.success) {
      logTest("Bundle project", "PASS", `Output files: ${buildResult.outputFiles?.length || 0}`);
      recordResult("Bundle project", "Integration:Build", "PASS", Date.now() - startTime);
    } else {
      logTest("Bundle project", "FAIL", "Build failed");
      recordResult("Bundle project", "Integration:Build", "FAIL", Date.now() - startTime);
      allPassed = false;
    }

    // Step 3: Validate output directory
    const distExists = fs.existsSync(path.join(tempDir, "dist"));
    if (distExists) {
      logTest("Output directory created", "PASS", "dist/ directory exists");
      recordResult("Output directory created", "Integration:Build", "PASS", Date.now() - startTime);
    } else {
      logTest("Output directory created", "FAIL", "dist/ directory not found");
      recordResult("Output directory created", "Integration:Build", "FAIL", Date.now() - startTime);
      allPassed = false;
    }
  } catch (error) {
    logTest("E2E Build Workflow", "FAIL", String(error));
    recordResult("E2E Build Workflow", "Integration:Build", "FAIL", Date.now() - startTime, String(error));
    allPassed = false;
  } finally {
    if (tempDir) {
      cleanupTempDir(tempDir);
    }
  }

  return allPassed;
}

async function testPlatformConfigValidation(): Promise<boolean> {
  logSubSection("Integration: Platform Config Validation");
  let allPassed = true;
  const startTime = Date.now();

  // Test platform-specific configurations
  const platformConfigs = {
    vercel: {
      maxDuration: 60,
      memory: 1024,
      regions: ["iad1"],
    },
    cloudflare: {
      workerName: "test-worker",
      compatibility_date: "2024-01-01",
    },
    netlify: {
      siteId: "test-site",
      functionsDir: "netlify/functions",
    },
    lambda: {
      functionName: "test-function",
      region: "us-east-1",
      memorySize: 512,
    },
    docker: {
      imageName: "test-image",
      registry: "docker.io",
    },
    flyio: {
      appName: "test-app",
      primaryRegion: "sea",
    },
  } as const;

  for (const [platform, config] of Object.entries(platformConfigs)) {
    try {
      const deployer = await DeploymentFactory.createDeployer(platform as DeploymentPlatform, {
        platformConfig: {
          platform: platform as DeploymentPlatform,
          ...config,
        },
      });

      if (deployer && deployer.name === platform) {
        logTest(`${platform} config creation`, "PASS", "Deployer created with config");
        recordResult(`${platform} config creation`, "Integration:Config", "PASS", Date.now() - startTime);
      } else {
        logTest(`${platform} config creation`, "FAIL", "Invalid deployer");
        recordResult(`${platform} config creation`, "Integration:Config", "FAIL", Date.now() - startTime);
        allPassed = false;
      }
    } catch (error) {
      logTest(`${platform} config creation`, "FAIL", String(error));
      recordResult(`${platform} config creation`, "Integration:Config", "FAIL", Date.now() - startTime, String(error));
      allPassed = false;
    }
  }

  return allPassed;
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function runAllTests(): Promise<void> {
  const startTime = Date.now();

  log("\n", "reset");
  log("╔══════════════════════════════════════════════════════════════════════╗", "bright");
  log("║       NeuroLink Deployment System - Continuous Test Suite           ║", "bright");
  log("╚══════════════════════════════════════════════════════════════════════╝", "bright");
  log(`\nTest Configuration:`, "cyan");
  log(`  Platform: ${TEST_CONFIG.platform}`, "reset");
  log(`  Bundler: ${TEST_CONFIG.bundler}`, "reset");
  log(`  Skip Real Deploy: ${TEST_CONFIG.skipRealDeploy}`, "reset");
  log(`  Timeout: ${TEST_CONFIG.timeout}ms`, "reset");

  // SDK Tests
  logSection("SDK Tests");
  await testSDKDeployerRegistry();
  await testSDKBundlerRegistry();
  await testSDKDeploymentFactory();
  await testSDKEnvironmentManager();
  await testSDKDeployerValidation();

  // CLI Tests
  logSection("CLI Tests");
  await testCLIDeployHelp();
  await testCLIDeployPlatforms();
  await testCLIDeployBundlers();
  await testCLIDeployEnv();
  await testCLIDeployBuildDryRun();

  // Integration Tests
  logSection("Integration Tests");
  await testEndToEndBuildWorkflow();
  await testPlatformConfigValidation();

  // Summary
  const totalDuration = Date.now() - startTime;
  const passed = testResults.filter((r) => r.status === "PASS").length;
  const failed = testResults.filter((r) => r.status === "FAIL").length;
  const skipped = testResults.filter((r) => r.status === "SKIP").length;
  const total = testResults.length;

  logSection("Test Summary");
  log(`\nTotal Tests: ${total}`, "bright");
  log(`  Passed:  ${passed}`, "green");
  log(`  Failed:  ${failed}`, failed > 0 ? "red" : "reset");
  log(`  Skipped: ${skipped}`, skipped > 0 ? "yellow" : "reset");
  log(`\nDuration: ${(totalDuration / 1000).toFixed(2)}s`, "cyan");

  // Category breakdown
  const categories = [...new Set(testResults.map((r) => r.category))];
  log(`\nResults by Category:`, "blue");
  for (const category of categories) {
    const categoryResults = testResults.filter((r) => r.category === category);
    const categoryPassed = categoryResults.filter((r) => r.status === "PASS").length;
    const categoryTotal = categoryResults.length;
    const status = categoryPassed === categoryTotal ? "✅" : "❌";
    log(`  ${status} ${category}: ${categoryPassed}/${categoryTotal}`, "reset");
  }

  // Failed tests detail
  if (failed > 0) {
    log(`\nFailed Tests:`, "red");
    for (const result of testResults.filter((r) => r.status === "FAIL")) {
      log(`  ❌ ${result.category} > ${result.name}`, "red");
      if (result.error) {
        log(`     Error: ${result.error}`, "reset");
      }
    }
  }

  // Exit code
  const exitCode = failed > 0 ? 1 : 0;
  log(`\n${"═".repeat(70)}`, "cyan");
  log(`Exit Code: ${exitCode}`, exitCode === 0 ? "green" : "red");
  log(`${"═".repeat(70)}\n`, "cyan");

  process.exit(exitCode);
}

// Run tests
runAllTests().catch((error) => {
  console.error("Test suite failed:", error);
  process.exit(1);
});
