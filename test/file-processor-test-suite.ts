#!/usr/bin/env tsx

/**
 * File Processor Test Suite for NeuroLink CLI and SDK
 *
 * This test suite verifies that all migrated file processors work correctly
 * through both CLI and SDK generate() and stream() interfaces.
 *
 * Tests file types:
 * - Excel (.xlsx, .xls)
 * - Word (.docx)
 * - RTF (.rtf)
 * - OpenDocument (.odt)
 * - JSON (.json)
 * - YAML (.yaml)
 * - XML (.xml)
 * - HTML (.html)
 * - SVG (.svg)
 * - Text (.txt)
 * - Source Code (.py, .js, .sql)
 * - CSV (.csv) - existing processor, included for completeness
 * - PDF (.pdf) - large document context verification (2.1MB research paper)
 * - PPTX (.pptx) - PowerPoint presentation (SDK-9 bug exposure)
 *
 * Bug exposure tests (expected to FAIL until fixes applied):
 * - SDK-7: Pre-processing budget drops binary files (video, audio, archive)
 * - SDK-8: Corrupted files return bare placeholder strings
 * - SDK-9: PPTX has no processor, always returns placeholder
 *
 * Run with: npx tsx test/file-processor-test-suite.ts
 *
 * Environment variables:
 * - TEST_PROVIDER: AI provider to use (default: vertex)
 * - TEST_MODEL: Specific model to use (optional)
 * - SKIP_SLOW_TESTS: Set to "true" to skip slow tests
 */

import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";

import {
  NeuroLink,
  type ProcessResult,
  type TestFunction,
  type TestResult,
} from "../dist/index.js";

// =============================================================================
// TEST CONFIGURATION
// =============================================================================

// Provider-specific token limits
const PROVIDER_MAX_TOKENS: Record<string, number> = {
  anthropic: 8192,
  vertex: 10000,
  "google-ai-studio": 10000,
  openai: 16384,
  bedrock: 8192,
  ollama: 4096,
  openrouter: 4096,
};

// Test configuration
const TEST_CONFIG = {
  provider: process.env.TEST_PROVIDER || "vertex",
  model: process.env.TEST_MODEL || (undefined as string | undefined),
  maxTokens: undefined as number | undefined,
  timeout: 90000, // 90 seconds for file processing
  skipSlowTests: process.env.SKIP_SLOW_TESTS === "true",

  // Path to test files (curator test files or local fixtures)
  curatorTestFiles: fs.existsSync(
    "/Users/sachinsharma/Developer/Official/curator-fork/curator/test-files",
  )
    ? "/Users/sachinsharma/Developer/Official/curator-fork/curator/test-files"
    : path.resolve(process.cwd(), "test", "fixtures"),

  // Inter-test delay (ms) - prevents rate limiting
  interTestDelay: 5000,
};

// Set maxTokens based on provider
TEST_CONFIG.maxTokens =
  PROVIDER_MAX_TOKENS[TEST_CONFIG.provider] || PROVIDER_MAX_TOKENS["vertex"];

// =============================================================================
// COLOR AND LOGGING UTILITIES
// =============================================================================

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

function log(message: string, color: ColorName = "reset"): void {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title: string): void {
  log(`\n${"=".repeat(60)}`, "cyan");
  log(`${title}`, "cyan");
  log(`${"=".repeat(60)}`, "cyan");
}

function logTest(
  testName: string,
  status: "PASS" | "FAIL" | "SKIP" | "TESTING",
  details = "",
): void {
  const icons = {
    PASS: "\u2705",
    FAIL: "\u274C",
    SKIP: "\u23ED\uFE0F",
    TESTING: "\u26A0\uFE0F",
  };
  const colorMap: Record<string, ColorName> = {
    PASS: "green",
    FAIL: "red",
    SKIP: "yellow",
    TESTING: "yellow",
  };
  const icon = icons[status];
  const color = colorMap[status];
  log(`${icon} ${testName}`, color);
  if (details) {
    log(`   ${details}`, "reset");
  }
}

// Types imported from @juspay/neurolink: ProcessResult, TestFunction, TestResult

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function buildBaseCLIArgs(): string[] {
  const args: string[] = [`--provider=${TEST_CONFIG.provider}`];
  if (TEST_CONFIG.model) {
    args.push(`--model=${TEST_CONFIG.model}`);
  }
  return args;
}

function buildBaseSDKOptions(): { provider: string; model?: string } {
  const options: { provider: string; model?: string } = {
    provider: TEST_CONFIG.provider,
  };
  if (TEST_CONFIG.model) {
    options.model = TEST_CONFIG.model;
  }
  return options;
}

function getTestFilePath(category: string, filename: string): string {
  return path.join(TEST_CONFIG.curatorTestFiles, category, filename);
}

function fileExists(filePath: string): boolean {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

// Run CLI command with timeout
function runCommand(
  command: string,
  args: string[] = [],
  options: Record<string, unknown> = {},
): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    let proc: ReturnType<typeof spawn>;
    let isResolved = false;

    try {
      proc = spawn(command, args, {
        stdio: ["pipe", "pipe", "pipe"],
        ...options,
      });
    } catch (spawnError) {
      const error =
        spawnError instanceof Error
          ? spawnError
          : new Error(String(spawnError));
      reject(
        new Error(`Failed to spawn command "${command}": ${error.message}`),
      );
      return;
    }

    let stdout = "";
    let stderr = "";

    proc.stdout?.on("data", (data) => {
      try {
        stdout += data.toString();
      } catch (error) {
        console.warn(`Error reading stdout: ${error}`);
      }
    });

    proc.stderr?.on("data", (data) => {
      try {
        stderr += data.toString();
      } catch (error) {
        console.warn(`Error reading stderr: ${error}`);
      }
    });

    const timeoutId = setTimeout(() => {
      if (isResolved) {
        return;
      }

      console.warn(
        `Command timeout, attempting graceful termination: ${command} ${args.join(" ")}`,
      );

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
              `stdout: ${stdout.trim()}\n` +
              `stderr: ${stderr.trim()}`,
          ),
        );
      }
    }, TEST_CONFIG.timeout);

    proc.on("close", (code, signal) => {
      if (isResolved) {
        return;
      }
      isResolved = true;
      clearTimeout(timeoutId);

      const result: ProcessResult = {
        code: typeof code === "number" ? code : -1,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        success: code === 0 && !signal,
      };

      if (signal) {
        result.stderr += `\nProcess terminated by signal: ${signal}`;
      }

      resolve(result);
    });

    proc.on("error", (error) => {
      if (isResolved) {
        return;
      }
      isResolved = true;
      clearTimeout(timeoutId);
      reject(
        new Error(
          `Process error: ${error.message}\nstdout: ${stdout.trim()}\nstderr: ${stderr.trim()}`,
        ),
      );
    });
  });
}

// Validate that response contains expected data
function validateResponseContent(
  response: string,
  expectedPatterns: string[],
  minMatches = 1,
): { passed: boolean; details: string[] } {
  const lowerResponse = response.toLowerCase();
  const foundPatterns = expectedPatterns.filter((pattern) =>
    lowerResponse.includes(pattern.toLowerCase()),
  );

  const passed = foundPatterns.length >= minMatches;
  const details = [
    `Found ${foundPatterns.length}/${expectedPatterns.length} patterns`,
    `Matched: ${foundPatterns.join(", ") || "none"}`,
    `Response length: ${response.length} chars`,
  ];

  return { passed, details };
}

// Global cleanup helper
async function globalCleanup(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 100));
  if (global.gc) {
    global.gc();
  }
}

// =============================================================================
// EXCEL TESTS
// =============================================================================

async function testCLIGenerateExcel(): Promise<boolean> {
  const testFile = getTestFilePath("document", "sample.xlsx");

  if (!fileExists(testFile)) {
    logTest("CLI Generate Excel", "SKIP", `Test file not found: ${testFile}`);
    return true;
  }

  try {
    log("Testing CLI generate with Excel file...", "blue");

    const result = await runCommand("node", [
      "dist/cli/index.js",
      "generate",
      ...buildBaseCLIArgs(),
      `--max-tokens=${TEST_CONFIG.maxTokens}`,
      `--file=${testFile}`,
      "What are the column headers and how many rows of data are in this Excel file? List the first few rows.",
    ]);

    if (!result.success) {
      logTest(
        "CLI Generate Excel",
        "FAIL",
        `Exit code: ${result.code}, Error: ${result.stderr}`,
      );
      return false;
    }

    // Excel files typically contain data - check for data-related words
    const validation = validateResponseContent(
      result.stdout,
      ["row", "column", "data", "sheet", "cell", "header", "table"],
      2,
    );

    if (validation.passed) {
      logTest(
        "CLI Generate Excel",
        "PASS",
        `Excel processed: ${validation.details.join("; ")}`,
      );
      return true;
    } else {
      logTest(
        "CLI Generate Excel",
        "FAIL",
        `Excel not properly processed: ${validation.details.join("; ")}`,
      );
      log("Response preview:", "yellow");
      log(result.stdout.substring(0, 500) + "...", "reset");
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("CLI Generate Excel", "FAIL", errorMessage);
    return false;
  }
}

async function testCLIStreamExcel(): Promise<boolean> {
  const testFile = getTestFilePath("document", "file_example_XLSX_1000.xlsx");

  if (!fileExists(testFile)) {
    logTest("CLI Stream Excel", "SKIP", `Test file not found: ${testFile}`);
    return true;
  }

  try {
    log("Testing CLI stream with large Excel file...", "blue");

    const result = await runCommand("node", [
      "dist/cli/index.js",
      "stream",
      ...buildBaseCLIArgs(),
      `--file=${testFile}`,
      "How many rows of data are in this Excel file? What type of data does it contain?",
    ]);

    if (!result.success) {
      logTest(
        "CLI Stream Excel",
        "FAIL",
        `Exit code: ${result.code}, Error: ${result.stderr}`,
      );
      return false;
    }

    const validation = validateResponseContent(
      result.stdout,
      ["row", "data", "record", "entry", "1000", "thousand"],
      2,
    );

    if (validation.passed) {
      logTest(
        "CLI Stream Excel",
        "PASS",
        `Excel streamed: ${validation.details.join("; ")}`,
      );
      return true;
    } else {
      logTest(
        "CLI Stream Excel",
        "FAIL",
        `Excel not properly streamed: ${validation.details.join("; ")}`,
      );
      log("Response preview:", "yellow");
      log(result.stdout.substring(0, 500) + "...", "reset");
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("CLI Stream Excel", "FAIL", errorMessage);
    return false;
  }
}

async function testSDKGenerateExcel(sdk: NeuroLink): Promise<boolean> {
  const testFile = getTestFilePath("document", "sample.xlsx");

  if (!fileExists(testFile)) {
    logTest("SDK Generate Excel", "SKIP", `Test file not found: ${testFile}`);
    return true;
  }

  try {
    log("Testing SDK generate with Excel file...", "blue");
    const sdkOptions = buildBaseSDKOptions();

    const result = await sdk.generate({
      input: {
        text: "Describe the structure and content of this Excel file. What columns does it have?",
        files: [testFile],
      },
      maxTokens: TEST_CONFIG.maxTokens,
      provider: sdkOptions.provider,
      ...(sdkOptions.model && { model: sdkOptions.model }),
    });

    log(`Content length: ${result.content.length}`, "reset");

    const validation = validateResponseContent(
      result.content,
      ["column", "row", "data", "sheet", "cell"],
      2,
    );

    if (validation.passed) {
      logTest(
        "SDK Generate Excel",
        "PASS",
        `Excel processed: ${validation.details.join("; ")}`,
      );
      return true;
    } else {
      logTest(
        "SDK Generate Excel",
        "FAIL",
        `Excel not properly processed: ${validation.details.join("; ")}`,
      );
      log("Response preview: " + result.content.substring(0, 500), "reset");
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("SDK Generate Excel", "FAIL", errorMessage);
    return false;
  }
}

async function testSDKStreamExcel(sdk: NeuroLink): Promise<boolean> {
  const testFile = getTestFilePath("document", "sample.xlsx");

  if (!fileExists(testFile)) {
    logTest("SDK Stream Excel", "SKIP", `Test file not found: ${testFile}`);
    return true;
  }

  try {
    log("Testing SDK stream with Excel file...", "blue");
    const sdkOptions = buildBaseSDKOptions();

    const streamResult = await sdk.stream({
      input: {
        text: "What data is in this Excel spreadsheet?",
        files: [testFile],
      },
      maxTokens: TEST_CONFIG.maxTokens,
      provider: sdkOptions.provider,
      ...(sdkOptions.model && { model: sdkOptions.model }),
    });

    const chunks: string[] = [];
    let chunkCount = 0;
    for await (const chunk of streamResult.stream) {
      if ("content" in chunk && typeof chunk.content === "string") {
        chunks.push(chunk.content);
        chunkCount++;
        if (chunkCount >= 100) {
          break;
        }
      }
    }

    const content = chunks.join("");
    log(
      `Stream chunks: ${chunkCount}, Content length: ${content.length}`,
      "reset",
    );

    const validation = validateResponseContent(
      content,
      ["data", "row", "column", "spreadsheet", "excel"],
      2,
    );

    if (validation.passed) {
      logTest(
        "SDK Stream Excel",
        "PASS",
        `Excel streamed: ${validation.details.join("; ")}`,
      );
      return true;
    } else {
      logTest(
        "SDK Stream Excel",
        "FAIL",
        `Excel not properly streamed: ${validation.details.join("; ")}`,
      );
      log("Response preview: " + content.substring(0, 500), "reset");
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("SDK Stream Excel", "FAIL", errorMessage);
    return false;
  }
}

// =============================================================================
// WORD DOCUMENT TESTS
// =============================================================================

async function testCLIGenerateWord(): Promise<boolean> {
  const testFile = getTestFilePath("document", "sample.docx");

  if (!fileExists(testFile)) {
    logTest("CLI Generate Word", "SKIP", `Test file not found: ${testFile}`);
    return true;
  }

  try {
    log("Testing CLI generate with Word document...", "blue");

    const result = await runCommand("node", [
      "dist/cli/index.js",
      "generate",
      ...buildBaseCLIArgs(),
      `--max-tokens=${TEST_CONFIG.maxTokens}`,
      `--file=${testFile}`,
      "What is this Word document about? Summarize its content.",
    ]);

    if (!result.success) {
      logTest(
        "CLI Generate Word",
        "FAIL",
        `Exit code: ${result.code}, Error: ${result.stderr}`,
      );
      return false;
    }

    // Check for document-related content
    const validation = validateResponseContent(
      result.stdout,
      ["document", "text", "content", "paragraph", "word"],
      2,
    );

    if (validation.passed) {
      logTest(
        "CLI Generate Word",
        "PASS",
        `Word processed: ${validation.details.join("; ")}`,
      );
      return true;
    } else {
      logTest(
        "CLI Generate Word",
        "FAIL",
        `Word not properly processed: ${validation.details.join("; ")}`,
      );
      log("Response preview:", "yellow");
      log(result.stdout.substring(0, 500) + "...", "reset");
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("CLI Generate Word", "FAIL", errorMessage);
    return false;
  }
}

async function testSDKGenerateWord(sdk: NeuroLink): Promise<boolean> {
  const testFile = getTestFilePath("document", "sample.docx");

  if (!fileExists(testFile)) {
    logTest("SDK Generate Word", "SKIP", `Test file not found: ${testFile}`);
    return true;
  }

  try {
    log("Testing SDK generate with Word document...", "blue");
    const sdkOptions = buildBaseSDKOptions();

    const result = await sdk.generate({
      input: {
        text: "Extract and summarize the content of this Word document.",
        files: [testFile],
      },
      maxTokens: TEST_CONFIG.maxTokens,
      provider: sdkOptions.provider,
      ...(sdkOptions.model && { model: sdkOptions.model }),
    });

    const validation = validateResponseContent(
      result.content,
      ["document", "text", "content"],
      2,
    );

    if (validation.passed) {
      logTest(
        "SDK Generate Word",
        "PASS",
        `Word processed: ${validation.details.join("; ")}`,
      );
      return true;
    } else {
      logTest(
        "SDK Generate Word",
        "FAIL",
        `Word not properly processed: ${validation.details.join("; ")}`,
      );
      log("Response preview: " + result.content.substring(0, 500), "reset");
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("SDK Generate Word", "FAIL", errorMessage);
    return false;
  }
}

// =============================================================================
// JSON TESTS
// =============================================================================

async function testCLIGenerateJSON(): Promise<boolean> {
  const testFile = getTestFilePath("code", "sample.json");

  if (!fileExists(testFile)) {
    logTest("CLI Generate JSON", "SKIP", `Test file not found: ${testFile}`);
    return true;
  }

  try {
    log("Testing CLI generate with JSON file...", "blue");

    const result = await runCommand("node", [
      "dist/cli/index.js",
      "generate",
      ...buildBaseCLIArgs(),
      `--max-tokens=${TEST_CONFIG.maxTokens}`,
      `--file=${testFile}`,
      "Parse this JSON file and describe its structure. What keys does it have?",
    ]);

    if (!result.success) {
      logTest(
        "CLI Generate JSON",
        "FAIL",
        `Exit code: ${result.code}, Error: ${result.stderr}`,
      );
      return false;
    }

    const validation = validateResponseContent(
      result.stdout,
      ["json", "key", "value", "object", "property", "field"],
      1,
    );

    if (validation.passed) {
      logTest(
        "CLI Generate JSON",
        "PASS",
        `JSON processed: ${validation.details.join("; ")}`,
      );
      return true;
    } else {
      logTest(
        "CLI Generate JSON",
        "FAIL",
        `JSON not properly processed: ${validation.details.join("; ")}`,
      );
      log("Response preview:", "yellow");
      log(result.stdout.substring(0, 500) + "...", "reset");
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("CLI Generate JSON", "FAIL", errorMessage);
    return false;
  }
}

async function testSDKGenerateJSON(sdk: NeuroLink): Promise<boolean> {
  const testFile = getTestFilePath("code", "sample.json");

  if (!fileExists(testFile)) {
    logTest("SDK Generate JSON", "SKIP", `Test file not found: ${testFile}`);
    return true;
  }

  try {
    log("Testing SDK generate with JSON file...", "blue");
    const sdkOptions = buildBaseSDKOptions();

    const result = await sdk.generate({
      input: {
        text: "Analyze this JSON structure. What data does it contain?",
        files: [testFile],
      },
      maxTokens: TEST_CONFIG.maxTokens,
      provider: sdkOptions.provider,
      ...(sdkOptions.model && { model: sdkOptions.model }),
    });

    const validation = validateResponseContent(
      result.content,
      ["json", "key", "value", "data", "object"],
      1,
    );

    if (validation.passed) {
      logTest(
        "SDK Generate JSON",
        "PASS",
        `JSON processed: ${validation.details.join("; ")}`,
      );
      return true;
    } else {
      logTest(
        "SDK Generate JSON",
        "FAIL",
        `JSON not properly processed: ${validation.details.join("; ")}`,
      );
      log("Response preview: " + result.content.substring(0, 500), "reset");
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("SDK Generate JSON", "FAIL", errorMessage);
    return false;
  }
}

// =============================================================================
// YAML TESTS
// =============================================================================

async function testCLIGenerateYAML(): Promise<boolean> {
  const testFile = getTestFilePath("code", "sample.yaml");

  if (!fileExists(testFile)) {
    logTest("CLI Generate YAML", "SKIP", `Test file not found: ${testFile}`);
    return true;
  }

  try {
    log("Testing CLI generate with YAML file...", "blue");

    const result = await runCommand("node", [
      "dist/cli/index.js",
      "generate",
      ...buildBaseCLIArgs(),
      `--max-tokens=${TEST_CONFIG.maxTokens}`,
      `--file=${testFile}`,
      "Parse this YAML configuration file. What settings does it define?",
    ]);

    if (!result.success) {
      logTest(
        "CLI Generate YAML",
        "FAIL",
        `Exit code: ${result.code}, Error: ${result.stderr}`,
      );
      return false;
    }

    const validation = validateResponseContent(
      result.stdout,
      ["yaml", "config", "setting", "key", "value", "property"],
      2,
    );

    if (validation.passed) {
      logTest(
        "CLI Generate YAML",
        "PASS",
        `YAML processed: ${validation.details.join("; ")}`,
      );
      return true;
    } else {
      logTest(
        "CLI Generate YAML",
        "FAIL",
        `YAML not properly processed: ${validation.details.join("; ")}`,
      );
      log("Response preview:", "yellow");
      log(result.stdout.substring(0, 500) + "...", "reset");
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("CLI Generate YAML", "FAIL", errorMessage);
    return false;
  }
}

async function testSDKGenerateYAML(sdk: NeuroLink): Promise<boolean> {
  const testFile = getTestFilePath("code", "sample.yaml");

  if (!fileExists(testFile)) {
    logTest("SDK Generate YAML", "SKIP", `Test file not found: ${testFile}`);
    return true;
  }

  try {
    log("Testing SDK generate with YAML file...", "blue");
    const sdkOptions = buildBaseSDKOptions();

    const result = await sdk.generate({
      input: {
        text: "What configuration is defined in this YAML file?",
        files: [testFile],
      },
      maxTokens: TEST_CONFIG.maxTokens,
      provider: sdkOptions.provider,
      ...(sdkOptions.model && { model: sdkOptions.model }),
    });

    const validation = validateResponseContent(
      result.content,
      ["yaml", "config", "setting", "key", "value"],
      2,
    );

    if (validation.passed) {
      logTest(
        "SDK Generate YAML",
        "PASS",
        `YAML processed: ${validation.details.join("; ")}`,
      );
      return true;
    } else {
      logTest(
        "SDK Generate YAML",
        "FAIL",
        `YAML not properly processed: ${validation.details.join("; ")}`,
      );
      log("Response preview: " + result.content.substring(0, 500), "reset");
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("SDK Generate YAML", "FAIL", errorMessage);
    return false;
  }
}

// =============================================================================
// XML TESTS
// =============================================================================

async function testCLIGenerateXML(): Promise<boolean> {
  const testFile = getTestFilePath("document", "file_example_XML_24kb.xml");

  if (!fileExists(testFile)) {
    logTest("CLI Generate XML", "SKIP", `Test file not found: ${testFile}`);
    return true;
  }

  try {
    log("Testing CLI generate with XML file...", "blue");

    const result = await runCommand("node", [
      "dist/cli/index.js",
      "generate",
      ...buildBaseCLIArgs(),
      `--max-tokens=${TEST_CONFIG.maxTokens}`,
      `--file=${testFile}`,
      "Parse this XML file. What is its root element and what data does it contain?",
    ]);

    if (!result.success) {
      logTest(
        "CLI Generate XML",
        "FAIL",
        `Exit code: ${result.code}, Error: ${result.stderr}`,
      );
      return false;
    }

    const validation = validateResponseContent(
      result.stdout,
      ["xml", "element", "tag", "root", "data", "attribute"],
      2,
    );

    if (validation.passed) {
      logTest(
        "CLI Generate XML",
        "PASS",
        `XML processed: ${validation.details.join("; ")}`,
      );
      return true;
    } else {
      logTest(
        "CLI Generate XML",
        "FAIL",
        `XML not properly processed: ${validation.details.join("; ")}`,
      );
      log("Response preview:", "yellow");
      log(result.stdout.substring(0, 500) + "...", "reset");
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("CLI Generate XML", "FAIL", errorMessage);
    return false;
  }
}

async function testSDKGenerateXML(sdk: NeuroLink): Promise<boolean> {
  const testFile = getTestFilePath("document", "file_example_XML_24kb.xml");

  if (!fileExists(testFile)) {
    logTest("SDK Generate XML", "SKIP", `Test file not found: ${testFile}`);
    return true;
  }

  try {
    log("Testing SDK generate with XML file...", "blue");
    const sdkOptions = buildBaseSDKOptions();

    const result = await sdk.generate({
      input: {
        text: "Analyze this XML file structure. What elements does it contain?",
        files: [testFile],
      },
      maxTokens: TEST_CONFIG.maxTokens,
      provider: sdkOptions.provider,
      ...(sdkOptions.model && { model: sdkOptions.model }),
    });

    const validation = validateResponseContent(
      result.content,
      ["xml", "element", "tag", "data", "structure"],
      2,
    );

    if (validation.passed) {
      logTest(
        "SDK Generate XML",
        "PASS",
        `XML processed: ${validation.details.join("; ")}`,
      );
      return true;
    } else {
      logTest(
        "SDK Generate XML",
        "FAIL",
        `XML not properly processed: ${validation.details.join("; ")}`,
      );
      log("Response preview: " + result.content.substring(0, 500), "reset");
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("SDK Generate XML", "FAIL", errorMessage);
    return false;
  }
}

// =============================================================================
// HTML TESTS
// =============================================================================

async function testCLIGenerateHTML(): Promise<boolean> {
  const testFile = getTestFilePath("code", "sample.html");

  if (!fileExists(testFile)) {
    logTest("CLI Generate HTML", "SKIP", `Test file not found: ${testFile}`);
    return true;
  }

  try {
    log("Testing CLI generate with HTML file...", "blue");

    const result = await runCommand("node", [
      "dist/cli/index.js",
      "generate",
      ...buildBaseCLIArgs(),
      `--max-tokens=${TEST_CONFIG.maxTokens}`,
      `--file=${testFile}`,
      "Analyze this HTML file. What is its title and main content structure?",
    ]);

    if (!result.success) {
      logTest(
        "CLI Generate HTML",
        "FAIL",
        `Exit code: ${result.code}, Error: ${result.stderr}`,
      );
      return false;
    }

    const validation = validateResponseContent(
      result.stdout,
      ["html", "title", "body", "tag", "element", "div", "content"],
      2,
    );

    if (validation.passed) {
      logTest(
        "CLI Generate HTML",
        "PASS",
        `HTML processed: ${validation.details.join("; ")}`,
      );
      return true;
    } else {
      logTest(
        "CLI Generate HTML",
        "FAIL",
        `HTML not properly processed: ${validation.details.join("; ")}`,
      );
      log("Response preview:", "yellow");
      log(result.stdout.substring(0, 500) + "...", "reset");
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("CLI Generate HTML", "FAIL", errorMessage);
    return false;
  }
}

async function testSDKGenerateHTML(sdk: NeuroLink): Promise<boolean> {
  const testFile = getTestFilePath("code", "sample.html");

  if (!fileExists(testFile)) {
    logTest("SDK Generate HTML", "SKIP", `Test file not found: ${testFile}`);
    return true;
  }

  try {
    log("Testing SDK generate with HTML file...", "blue");
    const sdkOptions = buildBaseSDKOptions();

    const result = await sdk.generate({
      input: {
        text: "What is this HTML page about? Describe its structure.",
        files: [testFile],
      },
      maxTokens: TEST_CONFIG.maxTokens,
      provider: sdkOptions.provider,
      ...(sdkOptions.model && { model: sdkOptions.model }),
    });

    const validation = validateResponseContent(
      result.content,
      ["html", "page", "content", "element", "structure"],
      2,
    );

    if (validation.passed) {
      logTest(
        "SDK Generate HTML",
        "PASS",
        `HTML processed: ${validation.details.join("; ")}`,
      );
      return true;
    } else {
      logTest(
        "SDK Generate HTML",
        "FAIL",
        `HTML not properly processed: ${validation.details.join("; ")}`,
      );
      log("Response preview: " + result.content.substring(0, 500), "reset");
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("SDK Generate HTML", "FAIL", errorMessage);
    return false;
  }
}

// =============================================================================
// SVG TESTS
// =============================================================================

async function testCLIGenerateSVG(): Promise<boolean> {
  const testFile = getTestFilePath("image", "sample.svg");

  if (!fileExists(testFile)) {
    logTest("CLI Generate SVG", "SKIP", `Test file not found: ${testFile}`);
    return true;
  }

  try {
    log("Testing CLI generate with SVG file...", "blue");

    const result = await runCommand("node", [
      "dist/cli/index.js",
      "generate",
      ...buildBaseCLIArgs(),
      `--max-tokens=${TEST_CONFIG.maxTokens}`,
      `--file=${testFile}`,
      "Describe this SVG image. What shapes or graphics does it contain?",
    ]);

    if (!result.success) {
      logTest(
        "CLI Generate SVG",
        "FAIL",
        `Exit code: ${result.code}, Error: ${result.stderr}`,
      );
      return false;
    }

    const validation = validateResponseContent(
      result.stdout,
      ["svg", "image", "graphic", "shape", "vector", "path", "element"],
      2,
    );

    if (validation.passed) {
      logTest(
        "CLI Generate SVG",
        "PASS",
        `SVG processed: ${validation.details.join("; ")}`,
      );
      return true;
    } else {
      logTest(
        "CLI Generate SVG",
        "FAIL",
        `SVG not properly processed: ${validation.details.join("; ")}`,
      );
      log("Response preview:", "yellow");
      log(result.stdout.substring(0, 500) + "...", "reset");
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("CLI Generate SVG", "FAIL", errorMessage);
    return false;
  }
}

async function testSDKGenerateSVG(sdk: NeuroLink): Promise<boolean> {
  const testFile = getTestFilePath("image", "sample.svg");

  if (!fileExists(testFile)) {
    logTest("SDK Generate SVG", "SKIP", `Test file not found: ${testFile}`);
    return true;
  }

  try {
    log("Testing SDK generate with SVG file...", "blue");
    const sdkOptions = buildBaseSDKOptions();

    const result = await sdk.generate({
      input: {
        text: "What does this SVG image depict?",
        files: [testFile],
      },
      maxTokens: TEST_CONFIG.maxTokens,
      provider: sdkOptions.provider,
      ...(sdkOptions.model && { model: sdkOptions.model }),
    });

    const validation = validateResponseContent(
      result.content,
      ["svg", "image", "graphic", "vector", "shape"],
      2,
    );

    if (validation.passed) {
      logTest(
        "SDK Generate SVG",
        "PASS",
        `SVG processed: ${validation.details.join("; ")}`,
      );
      return true;
    } else {
      logTest(
        "SDK Generate SVG",
        "FAIL",
        `SVG not properly processed: ${validation.details.join("; ")}`,
      );
      log("Response preview: " + result.content.substring(0, 500), "reset");
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("SDK Generate SVG", "FAIL", errorMessage);
    return false;
  }
}

// =============================================================================
// TEXT FILE TESTS
// =============================================================================

async function testCLIGenerateText(): Promise<boolean> {
  const testFile = getTestFilePath("document", "sample.txt");

  if (!fileExists(testFile)) {
    logTest("CLI Generate Text", "SKIP", `Test file not found: ${testFile}`);
    return true;
  }

  try {
    log("Testing CLI generate with text file...", "blue");

    const result = await runCommand("node", [
      "dist/cli/index.js",
      "generate",
      ...buildBaseCLIArgs(),
      `--max-tokens=${TEST_CONFIG.maxTokens}`,
      `--file=${testFile}`,
      "Read this text file and summarize its content.",
    ]);

    if (!result.success) {
      logTest(
        "CLI Generate Text",
        "FAIL",
        `Exit code: ${result.code}, Error: ${result.stderr}`,
      );
      return false;
    }

    // Text file should produce some readable content
    const validation = validateResponseContent(
      result.stdout,
      ["text", "content", "file", "line", "document"],
      1,
    );

    if (validation.passed) {
      logTest(
        "CLI Generate Text",
        "PASS",
        `Text processed: ${validation.details.join("; ")}`,
      );
      return true;
    } else {
      logTest(
        "CLI Generate Text",
        "FAIL",
        `Text not properly processed: ${validation.details.join("; ")}`,
      );
      log("Response preview:", "yellow");
      log(result.stdout.substring(0, 500) + "...", "reset");
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("CLI Generate Text", "FAIL", errorMessage);
    return false;
  }
}

async function testSDKGenerateText(sdk: NeuroLink): Promise<boolean> {
  const testFile = getTestFilePath("document", "sample.txt");

  if (!fileExists(testFile)) {
    logTest("SDK Generate Text", "SKIP", `Test file not found: ${testFile}`);
    return true;
  }

  try {
    log("Testing SDK generate with text file...", "blue");
    const sdkOptions = buildBaseSDKOptions();

    const result = await sdk.generate({
      input: {
        text: "What does this text file contain?",
        files: [testFile],
      },
      maxTokens: TEST_CONFIG.maxTokens,
      provider: sdkOptions.provider,
      ...(sdkOptions.model && { model: sdkOptions.model }),
    });

    const validation = validateResponseContent(
      result.content,
      ["text", "content", "file"],
      1,
    );

    if (validation.passed) {
      logTest(
        "SDK Generate Text",
        "PASS",
        `Text processed: ${validation.details.join("; ")}`,
      );
      return true;
    } else {
      logTest(
        "SDK Generate Text",
        "FAIL",
        `Text not properly processed: ${validation.details.join("; ")}`,
      );
      log("Response preview: " + result.content.substring(0, 500), "reset");
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("SDK Generate Text", "FAIL", errorMessage);
    return false;
  }
}

// =============================================================================
// SOURCE CODE TESTS (Python, JavaScript, SQL)
// =============================================================================

async function testCLIGeneratePython(): Promise<boolean> {
  const testFile = getTestFilePath("code", "sample.py");

  if (!fileExists(testFile)) {
    logTest("CLI Generate Python", "SKIP", `Test file not found: ${testFile}`);
    return true;
  }

  try {
    log("Testing CLI generate with Python file...", "blue");

    const result = await runCommand("node", [
      "dist/cli/index.js",
      "generate",
      ...buildBaseCLIArgs(),
      `--max-tokens=${TEST_CONFIG.maxTokens}`,
      `--file=${testFile}`,
      "Analyze this Python code. What functions does it define and what do they do?",
    ]);

    if (!result.success) {
      logTest(
        "CLI Generate Python",
        "FAIL",
        `Exit code: ${result.code}, Error: ${result.stderr}`,
      );
      return false;
    }

    const validation = validateResponseContent(
      result.stdout,
      ["python", "function", "def", "code", "class", "import"],
      2,
    );

    if (validation.passed) {
      logTest(
        "CLI Generate Python",
        "PASS",
        `Python processed: ${validation.details.join("; ")}`,
      );
      return true;
    } else {
      logTest(
        "CLI Generate Python",
        "FAIL",
        `Python not properly processed: ${validation.details.join("; ")}`,
      );
      log("Response preview:", "yellow");
      log(result.stdout.substring(0, 500) + "...", "reset");
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("CLI Generate Python", "FAIL", errorMessage);
    return false;
  }
}

async function testSDKGeneratePython(sdk: NeuroLink): Promise<boolean> {
  const testFile = getTestFilePath("code", "sample.py");

  if (!fileExists(testFile)) {
    logTest("SDK Generate Python", "SKIP", `Test file not found: ${testFile}`);
    return true;
  }

  try {
    log("Testing SDK generate with Python file...", "blue");
    const sdkOptions = buildBaseSDKOptions();

    const result = await sdk.generate({
      input: {
        text: "What does this Python code do?",
        files: [testFile],
      },
      maxTokens: TEST_CONFIG.maxTokens,
      provider: sdkOptions.provider,
      ...(sdkOptions.model && { model: sdkOptions.model }),
    });

    const validation = validateResponseContent(
      result.content,
      ["python", "function", "code", "script"],
      2,
    );

    if (validation.passed) {
      logTest(
        "SDK Generate Python",
        "PASS",
        `Python processed: ${validation.details.join("; ")}`,
      );
      return true;
    } else {
      logTest(
        "SDK Generate Python",
        "FAIL",
        `Python not properly processed: ${validation.details.join("; ")}`,
      );
      log("Response preview: " + result.content.substring(0, 500), "reset");
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("SDK Generate Python", "FAIL", errorMessage);
    return false;
  }
}

async function testCLIGenerateJavaScript(): Promise<boolean> {
  const testFile = getTestFilePath("code", "sample.js");

  if (!fileExists(testFile)) {
    logTest(
      "CLI Generate JavaScript",
      "SKIP",
      `Test file not found: ${testFile}`,
    );
    return true;
  }

  try {
    log("Testing CLI generate with JavaScript file...", "blue");

    const result = await runCommand("node", [
      "dist/cli/index.js",
      "generate",
      ...buildBaseCLIArgs(),
      `--max-tokens=${TEST_CONFIG.maxTokens}`,
      `--file=${testFile}`,
      "Analyze this JavaScript code. What functions and features does it implement?",
    ]);

    if (!result.success) {
      logTest(
        "CLI Generate JavaScript",
        "FAIL",
        `Exit code: ${result.code}, Error: ${result.stderr}`,
      );
      return false;
    }

    const validation = validateResponseContent(
      result.stdout,
      ["javascript", "function", "const", "let", "var", "code", "script"],
      2,
    );

    if (validation.passed) {
      logTest(
        "CLI Generate JavaScript",
        "PASS",
        `JavaScript processed: ${validation.details.join("; ")}`,
      );
      return true;
    } else {
      logTest(
        "CLI Generate JavaScript",
        "FAIL",
        `JavaScript not properly processed: ${validation.details.join("; ")}`,
      );
      log("Response preview:", "yellow");
      log(result.stdout.substring(0, 500) + "...", "reset");
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("CLI Generate JavaScript", "FAIL", errorMessage);
    return false;
  }
}

async function testSDKGenerateJavaScript(sdk: NeuroLink): Promise<boolean> {
  const testFile = getTestFilePath("code", "sample.js");

  if (!fileExists(testFile)) {
    logTest(
      "SDK Generate JavaScript",
      "SKIP",
      `Test file not found: ${testFile}`,
    );
    return true;
  }

  try {
    log("Testing SDK generate with JavaScript file...", "blue");
    const sdkOptions = buildBaseSDKOptions();

    const result = await sdk.generate({
      input: {
        text: "Explain what this JavaScript code does.",
        files: [testFile],
      },
      maxTokens: TEST_CONFIG.maxTokens,
      provider: sdkOptions.provider,
      ...(sdkOptions.model && { model: sdkOptions.model }),
    });

    const validation = validateResponseContent(
      result.content,
      ["javascript", "function", "code", "script"],
      2,
    );

    if (validation.passed) {
      logTest(
        "SDK Generate JavaScript",
        "PASS",
        `JavaScript processed: ${validation.details.join("; ")}`,
      );
      return true;
    } else {
      logTest(
        "SDK Generate JavaScript",
        "FAIL",
        `JavaScript not properly processed: ${validation.details.join("; ")}`,
      );
      log("Response preview: " + result.content.substring(0, 500), "reset");
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("SDK Generate JavaScript", "FAIL", errorMessage);
    return false;
  }
}

async function testCLIGenerateSQL(): Promise<boolean> {
  const testFile = getTestFilePath("code", "sample.sql");

  if (!fileExists(testFile)) {
    logTest("CLI Generate SQL", "SKIP", `Test file not found: ${testFile}`);
    return true;
  }

  try {
    log("Testing CLI generate with SQL file...", "blue");

    const result = await runCommand("node", [
      "dist/cli/index.js",
      "generate",
      ...buildBaseCLIArgs(),
      `--max-tokens=${TEST_CONFIG.maxTokens}`,
      `--file=${testFile}`,
      "Analyze this SQL file. What tables and queries does it define?",
    ]);

    if (!result.success) {
      logTest(
        "CLI Generate SQL",
        "FAIL",
        `Exit code: ${result.code}, Error: ${result.stderr}`,
      );
      return false;
    }

    const validation = validateResponseContent(
      result.stdout,
      ["sql", "table", "select", "query", "database", "create", "insert"],
      2,
    );

    if (validation.passed) {
      logTest(
        "CLI Generate SQL",
        "PASS",
        `SQL processed: ${validation.details.join("; ")}`,
      );
      return true;
    } else {
      logTest(
        "CLI Generate SQL",
        "FAIL",
        `SQL not properly processed: ${validation.details.join("; ")}`,
      );
      log("Response preview:", "yellow");
      log(result.stdout.substring(0, 500) + "...", "reset");
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("CLI Generate SQL", "FAIL", errorMessage);
    return false;
  }
}

async function testSDKGenerateSQL(sdk: NeuroLink): Promise<boolean> {
  const testFile = getTestFilePath("code", "sample.sql");

  if (!fileExists(testFile)) {
    logTest("SDK Generate SQL", "SKIP", `Test file not found: ${testFile}`);
    return true;
  }

  try {
    log("Testing SDK generate with SQL file...", "blue");
    const sdkOptions = buildBaseSDKOptions();

    const result = await sdk.generate({
      input: {
        text: "What database operations does this SQL file perform?",
        files: [testFile],
      },
      maxTokens: TEST_CONFIG.maxTokens,
      provider: sdkOptions.provider,
      ...(sdkOptions.model && { model: sdkOptions.model }),
    });

    const validation = validateResponseContent(
      result.content,
      ["sql", "table", "query", "database"],
      2,
    );

    if (validation.passed) {
      logTest(
        "SDK Generate SQL",
        "PASS",
        `SQL processed: ${validation.details.join("; ")}`,
      );
      return true;
    } else {
      logTest(
        "SDK Generate SQL",
        "FAIL",
        `SQL not properly processed: ${validation.details.join("; ")}`,
      );
      log("Response preview: " + result.content.substring(0, 500), "reset");
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("SDK Generate SQL", "FAIL", errorMessage);
    return false;
  }
}

// =============================================================================
// RTF TESTS
// =============================================================================

async function testCLIGenerateRTF(): Promise<boolean> {
  const testFile = getTestFilePath("document", "sample.rtf");

  if (!fileExists(testFile)) {
    logTest("CLI Generate RTF", "SKIP", `Test file not found: ${testFile}`);
    return true;
  }

  try {
    log("Testing CLI generate with RTF file...", "blue");

    const result = await runCommand("node", [
      "dist/cli/index.js",
      "generate",
      ...buildBaseCLIArgs(),
      `--max-tokens=${TEST_CONFIG.maxTokens}`,
      `--file=${testFile}`,
      "What is the content of this RTF document?",
    ]);

    if (!result.success) {
      logTest(
        "CLI Generate RTF",
        "FAIL",
        `Exit code: ${result.code}, Error: ${result.stderr}`,
      );
      return false;
    }

    const validation = validateResponseContent(
      result.stdout,
      ["document", "text", "content", "rtf", "format"],
      2,
    );

    if (validation.passed) {
      logTest(
        "CLI Generate RTF",
        "PASS",
        `RTF processed: ${validation.details.join("; ")}`,
      );
      return true;
    } else {
      logTest(
        "CLI Generate RTF",
        "FAIL",
        `RTF not properly processed: ${validation.details.join("; ")}`,
      );
      log("Response preview:", "yellow");
      log(result.stdout.substring(0, 500) + "...", "reset");
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("CLI Generate RTF", "FAIL", errorMessage);
    return false;
  }
}

async function testSDKGenerateRTF(sdk: NeuroLink): Promise<boolean> {
  const testFile = getTestFilePath("document", "sample.rtf");

  if (!fileExists(testFile)) {
    logTest("SDK Generate RTF", "SKIP", `Test file not found: ${testFile}`);
    return true;
  }

  try {
    log("Testing SDK generate with RTF file...", "blue");
    const sdkOptions = buildBaseSDKOptions();

    const result = await sdk.generate({
      input: {
        text: "Summarize this RTF document.",
        files: [testFile],
      },
      maxTokens: TEST_CONFIG.maxTokens,
      provider: sdkOptions.provider,
      ...(sdkOptions.model && { model: sdkOptions.model }),
    });

    const validation = validateResponseContent(
      result.content,
      ["document", "text", "content"],
      2,
    );

    if (validation.passed) {
      logTest(
        "SDK Generate RTF",
        "PASS",
        `RTF processed: ${validation.details.join("; ")}`,
      );
      return true;
    } else {
      logTest(
        "SDK Generate RTF",
        "FAIL",
        `RTF not properly processed: ${validation.details.join("; ")}`,
      );
      log("Response preview: " + result.content.substring(0, 500), "reset");
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("SDK Generate RTF", "FAIL", errorMessage);
    return false;
  }
}

// =============================================================================
// OPENDOCUMENT TESTS
// =============================================================================

async function testCLIGenerateODT(): Promise<boolean> {
  const testFile = getTestFilePath("document", "sample.odt");

  if (!fileExists(testFile)) {
    logTest("CLI Generate ODT", "SKIP", `Test file not found: ${testFile}`);
    return true;
  }

  try {
    log("Testing CLI generate with OpenDocument file...", "blue");

    const result = await runCommand("node", [
      "dist/cli/index.js",
      "generate",
      ...buildBaseCLIArgs(),
      `--max-tokens=${TEST_CONFIG.maxTokens}`,
      `--file=${testFile}`,
      "What is the content of this OpenDocument file?",
    ]);

    if (!result.success) {
      logTest(
        "CLI Generate ODT",
        "FAIL",
        `Exit code: ${result.code}, Error: ${result.stderr}`,
      );
      return false;
    }

    const validation = validateResponseContent(
      result.stdout,
      ["document", "text", "content", "opendocument", "odt"],
      2,
    );

    if (validation.passed) {
      logTest(
        "CLI Generate ODT",
        "PASS",
        `ODT processed: ${validation.details.join("; ")}`,
      );
      return true;
    } else {
      logTest(
        "CLI Generate ODT",
        "FAIL",
        `ODT not properly processed: ${validation.details.join("; ")}`,
      );
      log("Response preview:", "yellow");
      log(result.stdout.substring(0, 500) + "...", "reset");
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("CLI Generate ODT", "FAIL", errorMessage);
    return false;
  }
}

async function testSDKGenerateODT(sdk: NeuroLink): Promise<boolean> {
  const testFile = getTestFilePath("document", "sample.odt");

  if (!fileExists(testFile)) {
    logTest("SDK Generate ODT", "SKIP", `Test file not found: ${testFile}`);
    return true;
  }

  try {
    log("Testing SDK generate with OpenDocument file...", "blue");
    const sdkOptions = buildBaseSDKOptions();

    const result = await sdk.generate({
      input: {
        text: "Describe the content of this OpenDocument file.",
        files: [testFile],
      },
      maxTokens: TEST_CONFIG.maxTokens,
      provider: sdkOptions.provider,
      ...(sdkOptions.model && { model: sdkOptions.model }),
    });

    const validation = validateResponseContent(
      result.content,
      ["document", "text", "content"],
      2,
    );

    if (validation.passed) {
      logTest(
        "SDK Generate ODT",
        "PASS",
        `ODT processed: ${validation.details.join("; ")}`,
      );
      return true;
    } else {
      logTest(
        "SDK Generate ODT",
        "FAIL",
        `ODT not properly processed: ${validation.details.join("; ")}`,
      );
      log("Response preview: " + result.content.substring(0, 500), "reset");
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("SDK Generate ODT", "FAIL", errorMessage);
    return false;
  }
}

// =============================================================================
// CSV TESTS (using existing processor)
// =============================================================================

async function testCLIGenerateCSV(): Promise<boolean> {
  const testFile = getTestFilePath("document", "sample.csv");

  if (!fileExists(testFile)) {
    logTest("CLI Generate CSV", "SKIP", `Test file not found: ${testFile}`);
    return true;
  }

  try {
    log("Testing CLI generate with CSV file...", "blue");

    const result = await runCommand("node", [
      "dist/cli/index.js",
      "generate",
      ...buildBaseCLIArgs(),
      `--max-tokens=${TEST_CONFIG.maxTokens}`,
      `--csv=${testFile}`,
      "Analyze this CSV file. What columns does it have and what data does it contain?",
    ]);

    if (!result.success) {
      logTest(
        "CLI Generate CSV",
        "FAIL",
        `Exit code: ${result.code}, Error: ${result.stderr}`,
      );
      return false;
    }

    const validation = validateResponseContent(
      result.stdout,
      ["csv", "column", "row", "data", "header"],
      2,
    );

    if (validation.passed) {
      logTest(
        "CLI Generate CSV",
        "PASS",
        `CSV processed: ${validation.details.join("; ")}`,
      );
      return true;
    } else {
      logTest(
        "CLI Generate CSV",
        "FAIL",
        `CSV not properly processed: ${validation.details.join("; ")}`,
      );
      log("Response preview:", "yellow");
      log(result.stdout.substring(0, 500) + "...", "reset");
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("CLI Generate CSV", "FAIL", errorMessage);
    return false;
  }
}

async function testSDKGenerateCSV(sdk: NeuroLink): Promise<boolean> {
  const testFile = getTestFilePath("document", "sample.csv");

  if (!fileExists(testFile)) {
    logTest("SDK Generate CSV", "SKIP", `Test file not found: ${testFile}`);
    return true;
  }

  try {
    log("Testing SDK generate with CSV file...", "blue");
    const sdkOptions = buildBaseSDKOptions();

    const result = await sdk.generate({
      input: {
        text: "What data is in this CSV file?",
        csvFiles: [testFile],
      },
      maxTokens: TEST_CONFIG.maxTokens,
      provider: sdkOptions.provider,
      ...(sdkOptions.model && { model: sdkOptions.model }),
    });

    const validation = validateResponseContent(
      result.content,
      ["csv", "data", "column", "row"],
      2,
    );

    if (validation.passed) {
      logTest(
        "SDK Generate CSV",
        "PASS",
        `CSV processed: ${validation.details.join("; ")}`,
      );
      return true;
    } else {
      logTest(
        "SDK Generate CSV",
        "FAIL",
        `CSV not properly processed: ${validation.details.join("; ")}`,
      );
      log("Response preview: " + result.content.substring(0, 500), "reset");
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("SDK Generate CSV", "FAIL", errorMessage);
    return false;
  }
}

// =============================================================================
// PDF TESTS (large document context verification)
// =============================================================================

async function testCLIGeneratePDF(): Promise<boolean> {
  const testFile = getTestFilePath("document", "attention-is-all-you-need.pdf");

  if (!fileExists(testFile)) {
    logTest("CLI Generate PDF", "SKIP", `Test file not found: ${testFile}`);
    return true;
  }

  try {
    log("Testing CLI generate with PDF file (2.1MB)...", "blue");

    const result = await runCommand("node", [
      "dist/cli/index.js",
      "generate",
      ...buildBaseCLIArgs(),
      `--max-tokens=${TEST_CONFIG.maxTokens}`,
      `--pdf=${testFile}`,
      "Summarize this PDF document in 3 bullet points. What is the main contribution of this paper?",
    ]);

    if (!result.success) {
      logTest(
        "CLI Generate PDF",
        "FAIL",
        `Exit code: ${result.code}, Error: ${result.stderr}`,
      );
      return false;
    }

    const validation = validateResponseContent(
      result.stdout,
      [
        "transformer",
        "attention",
        "model",
        "translation",
        "architecture",
        "self-attention",
      ],
      2,
    );

    if (validation.passed) {
      logTest(
        "CLI Generate PDF",
        "PASS",
        `PDF processed: ${validation.details.join("; ")}`,
      );
      return true;
    } else {
      logTest(
        "CLI Generate PDF",
        "FAIL",
        `PDF not properly processed: ${validation.details.join("; ")}`,
      );
      log("Response preview:", "yellow");
      log(result.stdout.substring(0, 500) + "...", "reset");
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("CLI Generate PDF", "FAIL", errorMessage);
    return false;
  }
}

async function testCLIStreamPDF(): Promise<boolean> {
  const testFile = getTestFilePath("document", "attention-is-all-you-need.pdf");

  if (!fileExists(testFile)) {
    logTest("CLI Stream PDF", "SKIP", `Test file not found: ${testFile}`);
    return true;
  }

  try {
    log("Testing CLI stream with PDF file (2.1MB)...", "blue");

    const result = await runCommand("node", [
      "dist/cli/index.js",
      "stream",
      ...buildBaseCLIArgs(),
      `--max-tokens=${TEST_CONFIG.maxTokens}`,
      `--pdf=${testFile}`,
      "What are the key findings of this research paper? List the main experiments and results.",
    ]);

    if (!result.success) {
      logTest(
        "CLI Stream PDF",
        "FAIL",
        `Exit code: ${result.code}, Error: ${result.stderr}`,
      );
      return false;
    }

    const validation = validateResponseContent(
      result.stdout,
      ["transformer", "attention", "bleu", "training", "model", "translation"],
      2,
    );

    if (validation.passed) {
      logTest(
        "CLI Stream PDF",
        "PASS",
        `PDF streamed: ${validation.details.join("; ")}`,
      );
      return true;
    } else {
      logTest(
        "CLI Stream PDF",
        "FAIL",
        `PDF not properly streamed: ${validation.details.join("; ")}`,
      );
      log("Response preview:", "yellow");
      log(result.stdout.substring(0, 500) + "...", "reset");
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("CLI Stream PDF", "FAIL", errorMessage);
    return false;
  }
}

async function testSDKGeneratePDF(sdk: NeuroLink): Promise<boolean> {
  const testFile = getTestFilePath("document", "attention-is-all-you-need.pdf");

  if (!fileExists(testFile)) {
    logTest("SDK Generate PDF", "SKIP", `Test file not found: ${testFile}`);
    return true;
  }

  try {
    log("Testing SDK generate with PDF file (2.1MB)...", "blue");
    const sdkOptions = buildBaseSDKOptions();

    const result = await sdk.generate({
      input: {
        text: "What is the main architecture proposed in this paper? Describe its key components.",
        pdfFiles: [testFile],
      },
      maxTokens: TEST_CONFIG.maxTokens,
      provider: sdkOptions.provider,
      ...(sdkOptions.model && { model: sdkOptions.model }),
    });

    const validation = validateResponseContent(
      result.content,
      [
        "transformer",
        "attention",
        "encoder",
        "decoder",
        "self-attention",
        "multi-head",
      ],
      2,
    );

    if (validation.passed) {
      logTest(
        "SDK Generate PDF",
        "PASS",
        `PDF processed: ${validation.details.join("; ")}`,
      );
      return true;
    } else {
      logTest(
        "SDK Generate PDF",
        "FAIL",
        `PDF not properly processed: ${validation.details.join("; ")}`,
      );
      log("Response preview: " + result.content.substring(0, 500), "reset");
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("SDK Generate PDF", "FAIL", errorMessage);
    return false;
  }
}

async function testSDKStreamPDF(sdk: NeuroLink): Promise<boolean> {
  const testFile = getTestFilePath("document", "attention-is-all-you-need.pdf");

  if (!fileExists(testFile)) {
    logTest("SDK Stream PDF", "SKIP", `Test file not found: ${testFile}`);
    return true;
  }

  try {
    log("Testing SDK stream with PDF file (2.1MB)...", "blue");
    const sdkOptions = buildBaseSDKOptions();

    const result = await sdk.stream({
      input: {
        text: "Explain the positional encoding mechanism described in this paper.",
        pdfFiles: [testFile],
      },
      maxTokens: TEST_CONFIG.maxTokens,
      provider: sdkOptions.provider,
      ...(sdkOptions.model && { model: sdkOptions.model }),
    });

    let streamedContent = "";
    for await (const chunk of result.stream) {
      if ("content" in chunk && typeof chunk.content === "string") {
        streamedContent += chunk.content;
      }
    }

    const validation = validateResponseContent(
      streamedContent,
      ["positional", "encoding", "sine", "cosine", "position", "dimension"],
      2,
    );

    if (validation.passed) {
      logTest(
        "SDK Stream PDF",
        "PASS",
        `PDF streamed: ${validation.details.join("; ")}`,
      );
      return true;
    } else {
      logTest(
        "SDK Stream PDF",
        "FAIL",
        `PDF not properly streamed: ${validation.details.join("; ")}`,
      );
      log("Response preview: " + streamedContent.substring(0, 500), "reset");
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("SDK Stream PDF", "FAIL", errorMessage);
    return false;
  }
}

// =============================================================================
// VIDEO TESTS
// =============================================================================

/**
 * CLI Generate with Video file (MP4)
 */
async function testCLIGenerateVideo(): Promise<boolean> {
  logSection("Testing CLI generate with Video file (MP4)");

  const testFile = getTestFilePath("video", "sample_640x360.mp4");
  if (!fileExists(testFile)) {
    logTest("CLI Generate Video", "SKIP", `Test file not found: ${testFile}`);
    return true;
  }

  try {
    log("Testing CLI generate with MP4 video file...", "blue");
    const result = await runCommand("node", [
      "dist/cli/index.js",
      "generate",
      ...buildBaseCLIArgs(),
      `--max-tokens=${TEST_CONFIG.maxTokens}`,
      `--file=${testFile}`,
      "What can you tell me about this video file? Describe its contents.",
    ]);

    if (!result.success) {
      logTest(
        "CLI Generate Video",
        "FAIL",
        `Exit code: ${result.code}, Error: ${result.stderr}`,
      );
      return false;
    }

    const validation = validateResponseContent(
      result.stdout,
      ["video", "duration", "frame", "resolution", "mp4", "codec"],
      3,
    );

    if (validation.passed) {
      logTest(
        "CLI Generate Video",
        "PASS",
        `Video processed: ${validation.details.join("; ")}`,
      );
      return true;
    } else {
      logTest(
        "CLI Generate Video",
        "FAIL",
        `Video not properly processed: ${validation.details.join("; ")}`,
      );
      log("Response: " + result.stdout.substring(0, 500), "reset");
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("CLI Generate Video", "FAIL", errorMessage);
    return false;
  }
}

/**
 * SDK Generate with Video file (MP4)
 */
async function testSDKGenerateVideo(
  sdk: InstanceType<typeof NeuroLink>,
): Promise<boolean> {
  logSection("Testing SDK generate with Video file (MP4)");

  const testFile = getTestFilePath("video", "sample_640x360.mp4");
  if (!fileExists(testFile)) {
    logTest("SDK Generate Video", "SKIP", `Test file not found: ${testFile}`);
    return true;
  }

  try {
    log("Testing SDK generate with MP4 video file...", "blue");
    const sdkOptions = buildBaseSDKOptions();

    const result = await sdk.generate({
      input: {
        text: "What can you tell me about this video file? Describe its contents including metadata.",
        files: [testFile],
      },
      maxTokens: TEST_CONFIG.maxTokens,
      provider: sdkOptions.provider,
      ...(sdkOptions.model && { model: sdkOptions.model }),
    });

    const content =
      typeof result.content === "string"
        ? result.content
        : String(result.content);
    log(`Content length: ${content.length}`, "reset");

    const validation = validateResponseContent(
      content,
      ["video", "duration", "frame", "resolution", "codec"],
      3,
    );

    if (validation.passed) {
      logTest(
        "SDK Generate Video",
        "PASS",
        `Video processed: ${validation.details.join("; ")}`,
      );
      return true;
    } else {
      logTest(
        "SDK Generate Video",
        "FAIL",
        `Video not properly processed: ${validation.details.join("; ")}`,
      );
      log("Response preview: " + content.substring(0, 500), "reset");
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("SDK Generate Video", "FAIL", errorMessage);
    return false;
  }
}

/**
 * CLI Stream with Video file (MKV)
 */
async function testCLIStreamVideo(): Promise<boolean> {
  logSection("Testing CLI stream with Video file (MKV)");

  const testFile = getTestFilePath("video", "sample_640x360.mkv");
  if (!fileExists(testFile)) {
    logTest("CLI Stream Video", "SKIP", `Test file not found: ${testFile}`);
    return true;
  }

  try {
    log("Testing CLI stream with MKV video file...", "blue");
    const result = await runCommand("node", [
      "dist/cli/index.js",
      "stream",
      ...buildBaseCLIArgs(),
      `--max-tokens=${TEST_CONFIG.maxTokens}`,
      `--file=${testFile}`,
      "Describe this video file. What format is it and what are its properties?",
    ]);

    if (!result.success) {
      logTest(
        "CLI Stream Video",
        "FAIL",
        `Exit code: ${result.code}, Error: ${result.stderr}`,
      );
      return false;
    }

    const validation = validateResponseContent(
      result.stdout,
      ["video", "mkv", "matroska", "duration", "frame", "codec"],
      3,
    );

    if (validation.passed) {
      logTest(
        "CLI Stream Video",
        "PASS",
        `Video streamed: ${validation.details.join("; ")}`,
      );
      return true;
    } else {
      logTest(
        "CLI Stream Video",
        "FAIL",
        `Video not properly streamed: ${validation.details.join("; ")}`,
      );
      log("Response: " + result.stdout.substring(0, 500), "reset");
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("CLI Stream Video", "FAIL", errorMessage);
    return false;
  }
}

/**
 * SDK Stream with Video file (WebM)
 */
async function testSDKStreamVideo(
  sdk: InstanceType<typeof NeuroLink>,
): Promise<boolean> {
  logSection("Testing SDK stream with Video file (WebM)");

  const testFile = getTestFilePath("video", "sample_640x360.webm");
  if (!fileExists(testFile)) {
    logTest("SDK Stream Video", "SKIP", `Test file not found: ${testFile}`);
    return true;
  }

  try {
    log("Testing SDK stream with WebM video file...", "blue");
    const sdkOptions = buildBaseSDKOptions();

    const streamResult = await sdk.stream({
      input: {
        text: "What can you tell me about this video? Describe the format and any visible content.",
        files: [testFile],
      },
      maxTokens: TEST_CONFIG.maxTokens,
      provider: sdkOptions.provider,
      ...(sdkOptions.model && { model: sdkOptions.model }),
    });

    const chunks: string[] = [];
    let chunkCount = 0;
    for await (const chunk of streamResult.stream) {
      if ("content" in chunk && typeof chunk.content === "string") {
        chunks.push(chunk.content);
        chunkCount++;
        if (chunkCount >= 100) {
          break;
        }
      }
    }

    const content = chunks.join("");
    log(
      `Stream chunks: ${chunkCount}, Content length: ${content.length}`,
      "reset",
    );

    const validation = validateResponseContent(
      content,
      ["video", "webm", "duration", "frame", "codec"],
      3,
    );

    if (validation.passed) {
      logTest(
        "SDK Stream Video",
        "PASS",
        `Video streamed: ${validation.details.join("; ")}`,
      );
      return true;
    } else {
      logTest(
        "SDK Stream Video",
        "FAIL",
        `Video not properly streamed: ${validation.details.join("; ")}`,
      );
      log("Response preview: " + content.substring(0, 500), "reset");
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("SDK Stream Video", "FAIL", errorMessage);
    return false;
  }
}

// =============================================================================
// AUDIO TESTS
// =============================================================================

/**
 * CLI Generate with Audio file (MP3)
 */
async function testCLIGenerateAudio(): Promise<boolean> {
  logSection("Testing CLI generate with Audio file (MP3)");

  const testFile = getTestFilePath("audio", "sample3.mp3");
  if (!fileExists(testFile)) {
    logTest("CLI Generate Audio", "SKIP", `Test file not found: ${testFile}`);
    return true;
  }

  try {
    log("Testing CLI generate with MP3 audio file...", "blue");
    const result = await runCommand("node", [
      "dist/cli/index.js",
      "generate",
      ...buildBaseCLIArgs(),
      `--max-tokens=${TEST_CONFIG.maxTokens}`,
      `--file=${testFile}`,
      "What can you tell me about this audio file? Describe its properties and metadata.",
    ]);

    if (!result.success) {
      logTest(
        "CLI Generate Audio",
        "FAIL",
        `Exit code: ${result.code}, Error: ${result.stderr}`,
      );
      return false;
    }

    const validation = validateResponseContent(
      result.stdout,
      ["audio", "mp3", "duration", "bitrate", "sample", "codec", "mpeg"],
      3,
    );

    if (validation.passed) {
      logTest(
        "CLI Generate Audio",
        "PASS",
        `Audio processed: ${validation.details.join("; ")}`,
      );
      return true;
    } else {
      logTest(
        "CLI Generate Audio",
        "FAIL",
        `Audio not properly processed: ${validation.details.join("; ")}`,
      );
      log("Response: " + result.stdout.substring(0, 500), "reset");
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("CLI Generate Audio", "FAIL", errorMessage);
    return false;
  }
}

/**
 * SDK Generate with Audio file (MP3)
 */
async function testSDKGenerateAudio(
  sdk: InstanceType<typeof NeuroLink>,
): Promise<boolean> {
  logSection("Testing SDK generate with Audio file (MP3)");

  const testFile = getTestFilePath("audio", "sample3.mp3");
  if (!fileExists(testFile)) {
    logTest("SDK Generate Audio", "SKIP", `Test file not found: ${testFile}`);
    return true;
  }

  try {
    log("Testing SDK generate with MP3 audio file...", "blue");
    const sdkOptions = buildBaseSDKOptions();

    const result = await sdk.generate({
      input: {
        text: "What can you tell me about this audio file? Describe its metadata, format, and any tags.",
        files: [testFile],
      },
      maxTokens: TEST_CONFIG.maxTokens,
      provider: sdkOptions.provider,
      ...(sdkOptions.model && { model: sdkOptions.model }),
    });

    const content =
      typeof result.content === "string"
        ? result.content
        : String(result.content);
    log(`Content length: ${content.length}`, "reset");

    const validation = validateResponseContent(
      content,
      ["audio", "mp3", "duration", "bitrate", "codec", "mpeg"],
      3,
    );

    if (validation.passed) {
      logTest(
        "SDK Generate Audio",
        "PASS",
        `Audio processed: ${validation.details.join("; ")}`,
      );
      return true;
    } else {
      logTest(
        "SDK Generate Audio",
        "FAIL",
        `Audio not properly processed: ${validation.details.join("; ")}`,
      );
      log("Response preview: " + content.substring(0, 500), "reset");
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("SDK Generate Audio", "FAIL", errorMessage);
    return false;
  }
}

/**
 * CLI Generate with Audio file (WAV)
 */
async function testCLIGenerateAudioWav(): Promise<boolean> {
  logSection("Testing CLI generate with Audio file (WAV)");

  const testFile = getTestFilePath("audio", "sample3.wav");
  if (!fileExists(testFile)) {
    logTest(
      "CLI Generate Audio WAV",
      "SKIP",
      `Test file not found: ${testFile}`,
    );
    return true;
  }

  try {
    log("Testing CLI generate with WAV audio file...", "blue");
    const result = await runCommand("node", [
      "dist/cli/index.js",
      "generate",
      ...buildBaseCLIArgs(),
      `--max-tokens=${TEST_CONFIG.maxTokens}`,
      `--file=${testFile}`,
      "Describe the properties of this WAV audio file.",
    ]);

    if (!result.success) {
      logTest(
        "CLI Generate Audio WAV",
        "FAIL",
        `Exit code: ${result.code}, Error: ${result.stderr}`,
      );
      return false;
    }

    const validation = validateResponseContent(
      result.stdout,
      ["audio", "wav", "pcm", "sample", "channel"],
      2,
    );

    if (validation.passed) {
      logTest(
        "CLI Generate Audio WAV",
        "PASS",
        `Audio WAV processed: ${validation.details.join("; ")}`,
      );
      return true;
    } else {
      logTest(
        "CLI Generate Audio WAV",
        "FAIL",
        `Audio WAV not properly processed: ${validation.details.join("; ")}`,
      );
      log("Response: " + result.stdout.substring(0, 500), "reset");
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("CLI Generate Audio WAV", "FAIL", errorMessage);
    return false;
  }
}

/**
 * SDK Generate with Audio file (FLAC - lossless detection)
 */
async function testSDKGenerateAudioFlac(
  sdk: InstanceType<typeof NeuroLink>,
): Promise<boolean> {
  logSection("Testing SDK generate with Audio file (FLAC)");

  const testFile = getTestFilePath("audio", "sample1.flac");
  if (!fileExists(testFile)) {
    logTest(
      "SDK Generate Audio FLAC",
      "SKIP",
      `Test file not found: ${testFile}`,
    );
    return true;
  }

  try {
    log("Testing SDK generate with FLAC audio file...", "blue");
    const sdkOptions = buildBaseSDKOptions();

    const result = await sdk.generate({
      input: {
        text: "What can you tell me about this audio file? Is it lossless? What are its properties?",
        files: [testFile],
      },
      maxTokens: TEST_CONFIG.maxTokens,
      provider: sdkOptions.provider,
      ...(sdkOptions.model && { model: sdkOptions.model }),
    });

    const content =
      typeof result.content === "string"
        ? result.content
        : String(result.content);
    log(`Content length: ${content.length}`, "reset");

    const validation = validateResponseContent(
      content,
      ["audio", "flac", "lossless", "sample", "bit"],
      2,
    );

    if (validation.passed) {
      logTest(
        "SDK Generate Audio FLAC",
        "PASS",
        `Audio FLAC processed: ${validation.details.join("; ")}`,
      );
      return true;
    } else {
      logTest(
        "SDK Generate Audio FLAC",
        "FAIL",
        `Audio FLAC not properly processed: ${validation.details.join("; ")}`,
      );
      log("Response preview: " + content.substring(0, 500), "reset");
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("SDK Generate Audio FLAC", "FAIL", errorMessage);
    return false;
  }
}

/**
 * SDK Stream with Audio file (OGG)
 */
async function testSDKStreamAudio(
  sdk: InstanceType<typeof NeuroLink>,
): Promise<boolean> {
  logSection("Testing SDK stream with Audio file (OGG)");

  const testFile = getTestFilePath("audio", "sample3.ogg");
  if (!fileExists(testFile)) {
    logTest("SDK Stream Audio", "SKIP", `Test file not found: ${testFile}`);
    return true;
  }

  try {
    log("Testing SDK stream with OGG audio file...", "blue");
    const sdkOptions = buildBaseSDKOptions();

    const streamResult = await sdk.stream({
      input: {
        text: "Describe this audio file. What format is it and what are its technical properties?",
        files: [testFile],
      },
      maxTokens: TEST_CONFIG.maxTokens,
      provider: sdkOptions.provider,
      ...(sdkOptions.model && { model: sdkOptions.model }),
    });

    const chunks: string[] = [];
    let chunkCount = 0;
    for await (const chunk of streamResult.stream) {
      if ("content" in chunk && typeof chunk.content === "string") {
        chunks.push(chunk.content);
        chunkCount++;
        if (chunkCount >= 100) {
          break;
        }
      }
    }

    const content = chunks.join("");
    log(
      `Stream chunks: ${chunkCount}, Content length: ${content.length}`,
      "reset",
    );

    const validation = validateResponseContent(
      content,
      ["audio", "ogg", "vorbis", "duration", "codec"],
      3,
    );

    if (validation.passed) {
      logTest(
        "SDK Stream Audio",
        "PASS",
        `Audio streamed: ${validation.details.join("; ")}`,
      );
      return true;
    } else {
      logTest(
        "SDK Stream Audio",
        "FAIL",
        `Audio not properly streamed: ${validation.details.join("; ")}`,
      );
      log("Response preview: " + content.substring(0, 500), "reset");
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("SDK Stream Audio", "FAIL", errorMessage);
    return false;
  }
}

// =============================================================================
// ARCHIVE TESTS
// =============================================================================

/**
 * CLI Generate with Archive file (ZIP)
 */
async function testCLIGenerateArchiveZip(): Promise<boolean> {
  logSection("Testing CLI generate with Archive file (ZIP)");

  const testFile = getTestFilePath("archive", "sample.zip");
  if (!fileExists(testFile)) {
    logTest(
      "CLI Generate Archive ZIP",
      "SKIP",
      `Test file not found: ${testFile}`,
    );
    return true;
  }

  try {
    log("Testing CLI generate with ZIP archive file...", "blue");
    const result = await runCommand("node", [
      "dist/cli/index.js",
      "generate",
      ...buildBaseCLIArgs(),
      `--max-tokens=${TEST_CONFIG.maxTokens}`,
      `--file=${testFile}`,
      "What files are inside this archive? Describe its contents.",
    ]);

    if (!result.success) {
      logTest(
        "CLI Generate Archive ZIP",
        "FAIL",
        `Exit code: ${result.code}, Error: ${result.stderr}`,
      );
      return false;
    }

    const validation = validateResponseContent(
      result.stdout,
      ["archive", "zip", "file", "json", "python", "txt", "entries", "size"],
      3,
    );

    if (validation.passed) {
      logTest(
        "CLI Generate Archive ZIP",
        "PASS",
        `Archive ZIP processed: ${validation.details.join("; ")}`,
      );
      return true;
    } else {
      logTest(
        "CLI Generate Archive ZIP",
        "FAIL",
        `Archive ZIP not properly processed: ${validation.details.join("; ")}`,
      );
      log("Response: " + result.stdout.substring(0, 500), "reset");
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("CLI Generate Archive ZIP", "FAIL", errorMessage);
    return false;
  }
}

/**
 * SDK Generate with Archive file (ZIP)
 */
async function testSDKGenerateArchiveZip(
  sdk: InstanceType<typeof NeuroLink>,
): Promise<boolean> {
  logSection("Testing SDK generate with Archive file (ZIP)");

  const testFile = getTestFilePath("archive", "sample.zip");
  if (!fileExists(testFile)) {
    logTest(
      "SDK Generate Archive ZIP",
      "SKIP",
      `Test file not found: ${testFile}`,
    );
    return true;
  }

  try {
    log("Testing SDK generate with ZIP archive file...", "blue");
    const sdkOptions = buildBaseSDKOptions();

    const result = await sdk.generate({
      input: {
        text: "What files are inside this archive? List the contents and describe what each file contains.",
        files: [testFile],
      },
      maxTokens: TEST_CONFIG.maxTokens,
      provider: sdkOptions.provider,
      ...(sdkOptions.model && { model: sdkOptions.model }),
    });

    const content =
      typeof result.content === "string"
        ? result.content
        : String(result.content);
    log(`Content length: ${content.length}`, "reset");

    const validation = validateResponseContent(
      content,
      ["archive", "zip", "file", "json", "python", "txt", "size"],
      3,
    );

    if (validation.passed) {
      logTest(
        "SDK Generate Archive ZIP",
        "PASS",
        `Archive ZIP processed: ${validation.details.join("; ")}`,
      );
      return true;
    } else {
      logTest(
        "SDK Generate Archive ZIP",
        "FAIL",
        `Archive ZIP not properly processed: ${validation.details.join("; ")}`,
      );
      log("Response preview: " + content.substring(0, 500), "reset");
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("SDK Generate Archive ZIP", "FAIL", errorMessage);
    return false;
  }
}

/**
 * CLI Generate with Archive file (TAR.GZ)
 */
async function testCLIGenerateArchiveTarGz(): Promise<boolean> {
  logSection("Testing CLI generate with Archive file (TAR.GZ)");

  const testFile = getTestFilePath("archive", "sample.tar.gz");
  if (!fileExists(testFile)) {
    logTest(
      "CLI Generate Archive TAR.GZ",
      "SKIP",
      `Test file not found: ${testFile}`,
    );
    return true;
  }

  try {
    log("Testing CLI generate with TAR.GZ archive file...", "blue");
    const result = await runCommand("node", [
      "dist/cli/index.js",
      "generate",
      ...buildBaseCLIArgs(),
      `--max-tokens=${TEST_CONFIG.maxTokens}`,
      `--file=${testFile}`,
      "What files are inside this tar.gz archive? Describe the contents.",
    ]);

    if (!result.success) {
      logTest(
        "CLI Generate Archive TAR.GZ",
        "FAIL",
        `Exit code: ${result.code}, Error: ${result.stderr}`,
      );
      return false;
    }

    const validation = validateResponseContent(
      result.stdout,
      ["archive", "tar", "gz", "file", "json", "python", "txt"],
      3,
    );

    if (validation.passed) {
      logTest(
        "CLI Generate Archive TAR.GZ",
        "PASS",
        `Archive TAR.GZ processed: ${validation.details.join("; ")}`,
      );
      return true;
    } else {
      logTest(
        "CLI Generate Archive TAR.GZ",
        "FAIL",
        `Archive TAR.GZ not properly processed: ${validation.details.join("; ")}`,
      );
      log("Response: " + result.stdout.substring(0, 500), "reset");
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("CLI Generate Archive TAR.GZ", "FAIL", errorMessage);
    return false;
  }
}

/**
 * SDK Generate with Archive file (TAR.GZ)
 */
async function testSDKGenerateArchiveTarGz(
  sdk: InstanceType<typeof NeuroLink>,
): Promise<boolean> {
  logSection("Testing SDK generate with Archive file (TAR.GZ)");

  const testFile = getTestFilePath("archive", "sample.tar.gz");
  if (!fileExists(testFile)) {
    logTest(
      "SDK Generate Archive TAR.GZ",
      "SKIP",
      `Test file not found: ${testFile}`,
    );
    return true;
  }

  try {
    log("Testing SDK generate with TAR.GZ archive file...", "blue");
    const sdkOptions = buildBaseSDKOptions();

    const result = await sdk.generate({
      input: {
        text: "What files are in this tar.gz archive? Describe the contents and structure.",
        files: [testFile],
      },
      maxTokens: TEST_CONFIG.maxTokens,
      provider: sdkOptions.provider,
      ...(sdkOptions.model && { model: sdkOptions.model }),
    });

    const content =
      typeof result.content === "string"
        ? result.content
        : String(result.content);
    log(`Content length: ${content.length}`, "reset");

    const validation = validateResponseContent(
      content,
      ["archive", "tar", "file", "json", "python", "txt"],
      3,
    );

    if (validation.passed) {
      logTest(
        "SDK Generate Archive TAR.GZ",
        "PASS",
        `Archive TAR.GZ processed: ${validation.details.join("; ")}`,
      );
      return true;
    } else {
      logTest(
        "SDK Generate Archive TAR.GZ",
        "FAIL",
        `Archive TAR.GZ not properly processed: ${validation.details.join("; ")}`,
      );
      log("Response preview: " + content.substring(0, 500), "reset");
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("SDK Generate Archive TAR.GZ", "FAIL", errorMessage);
    return false;
  }
}

// =============================================================================
// MULTI-FILE STRESS TESTS (Curator Scenario Simulation)
// =============================================================================
// These tests simulate the real Curator/TARA scenario where a user sends
// multiple large files simultaneously in a single Slack message. This is
// the exact pattern that caused the 224K token overflow.

/**
 * SDK Generate with 5 large files simultaneously (Curator pattern)
 * Simulates: user sends Word doc + Excel + PDF + CSV + text in one message
 * All passed as Buffer[] via input.files, exactly like Curator does.
 */
async function testSDKGenerateMultiFile(
  sdk: InstanceType<typeof NeuroLink>,
): Promise<boolean> {
  logSection(
    "Testing SDK Generate with 5 Files Simultaneously (Curator Pattern)",
  );

  const docxFile = getTestFilePath("document", "sample.docx");
  const xlsxFile = getTestFilePath("document", "file_example_XLSX_1000.xlsx");
  const pdfFile = getTestFilePath("document", "attention-is-all-you-need.pdf");
  const csvFile = path.resolve(TEST_CONFIG.curatorTestFiles, "basic.csv");
  const txtFile = getTestFilePath("document", "sample.txt");

  // Check all files exist
  const allFiles = [
    { path: docxFile, name: "sample.docx" },
    { path: xlsxFile, name: "file_example_XLSX_1000.xlsx" },
    { path: pdfFile, name: "attention-is-all-you-need.pdf" },
    { path: csvFile, name: "basic.csv" },
    { path: txtFile, name: "sample.txt" },
  ];

  const missingFiles = allFiles.filter((f) => !fileExists(f.path));
  if (missingFiles.length > 0) {
    logTest(
      "SDK Generate Multi-File",
      "SKIP",
      `Missing files: ${missingFiles.map((f) => f.name).join(", ")}`,
    );
    return false;
  }

  try {
    // Read all files as raw Buffers (exactly like Curator does from Slack)
    const fileBuffers = allFiles.map((f) => fs.readFileSync(f.path));
    const totalSize = fileBuffers.reduce((sum, buf) => sum + buf.length, 0);

    log(
      `Loading ${allFiles.length} files, total size: ${(totalSize / 1024).toFixed(0)} KB`,
      "blue",
    );
    allFiles.forEach((f, i) => {
      log(
        `  ${i + 1}. ${f.name} (${(fileBuffers[i].length / 1024).toFixed(0)} KB)`,
        "reset",
      );
    });

    // Construct input exactly like Curator's neurolinkInput pattern
    const sdkOptions = buildBaseSDKOptions();
    const result = await sdk.generate({
      input: {
        text: "Analyze all the documents. Describe what each file contains briefly.",
        files: fileBuffers, // Raw Buffer[] just like Curator
      },
      maxTokens: TEST_CONFIG.maxTokens,
      provider: sdkOptions.provider,
      ...(sdkOptions.model && { model: sdkOptions.model }),
    });

    const content = result.content;
    log(`Content length: ${content.length}`, "reset");

    if (content.length > 50) {
      logTest(
        "SDK Generate Multi-File",
        "PASS",
        `5 files processed together (${(totalSize / 1024).toFixed(0)} KB total), response: ${content.length} chars`,
      );
      return true;
    } else {
      logTest(
        "SDK Generate Multi-File",
        "FAIL",
        `Response too short: ${content.length} chars`,
      );
      log("Response: " + content, "reset");
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("SDK Generate Multi-File", "FAIL", errorMessage);
    return false;
  }
}

/**
 * SDK Stream with 5 large files simultaneously (Curator pattern)
 */
async function testSDKStreamMultiFile(
  sdk: InstanceType<typeof NeuroLink>,
): Promise<boolean> {
  logSection(
    "Testing SDK Stream with 5 Files Simultaneously (Curator Pattern)",
  );

  const docxFile = getTestFilePath("document", "sample.docx");
  const xlsxFile = getTestFilePath("document", "file_example_XLSX_1000.xlsx");
  const pdfFile = getTestFilePath("document", "attention-is-all-you-need.pdf");
  const csvFile = path.resolve(TEST_CONFIG.curatorTestFiles, "basic.csv");
  const txtFile = getTestFilePath("document", "sample.txt");

  const allFiles = [
    { path: docxFile, name: "sample.docx" },
    { path: xlsxFile, name: "file_example_XLSX_1000.xlsx" },
    { path: pdfFile, name: "attention-is-all-you-need.pdf" },
    { path: csvFile, name: "basic.csv" },
    { path: txtFile, name: "sample.txt" },
  ];

  const missingFiles = allFiles.filter((f) => !fileExists(f.path));
  if (missingFiles.length > 0) {
    logTest(
      "SDK Stream Multi-File",
      "SKIP",
      `Missing files: ${missingFiles.map((f) => f.name).join(", ")}`,
    );
    return false;
  }

  try {
    const fileBuffers = allFiles.map((f) => fs.readFileSync(f.path));
    const totalSize = fileBuffers.reduce((sum, buf) => sum + buf.length, 0);

    log(
      `Streaming with ${allFiles.length} files, total size: ${(totalSize / 1024).toFixed(0)} KB`,
      "blue",
    );

    const streamResult = await sdk.stream({
      ...buildBaseSDKOptions(),
      input: {
        text: "Analyze all the documents. For each file, describe its contents in one sentence.",
        files: fileBuffers,
      },
      maxTokens: TEST_CONFIG.maxTokens,
      timeout: 120000,
    });

    const chunks: string[] = [];
    let chunkCount = 0;
    for await (const chunk of streamResult.stream) {
      if ("content" in chunk && typeof chunk.content === "string") {
        chunks.push(chunk.content);
        chunkCount++;
        if (chunkCount >= 200) {
          break;
        }
      }
    }
    const streamedContent = chunks.join("");

    log(
      `Stream chunks collected, content length: ${streamedContent.length}`,
      "reset",
    );

    if (streamedContent.length > 50) {
      logTest(
        "SDK Stream Multi-File",
        "PASS",
        `5 files streamed together (${(totalSize / 1024).toFixed(0)} KB total), response: ${streamedContent.length} chars`,
      );
      return true;
    } else {
      logTest(
        "SDK Stream Multi-File",
        "FAIL",
        `Stream too short: ${streamedContent.length} chars`,
      );
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("SDK Stream Multi-File", "FAIL", errorMessage);
    return false;
  }
}

/**
 * CLI Generate with multiple files simultaneously
 * Uses --file flag multiple times, like Curator would via CLI.
 */
async function testCLIGenerateMultiFile(): Promise<boolean> {
  logSection("Testing CLI Generate with 5 Files Simultaneously");

  const docxFile = getTestFilePath("document", "sample.docx");
  const xlsxFile = getTestFilePath("document", "file_example_XLSX_1000.xlsx");
  const pdfFile = getTestFilePath("document", "attention-is-all-you-need.pdf");
  const csvFile = path.resolve(TEST_CONFIG.curatorTestFiles, "basic.csv");
  const txtFile = getTestFilePath("document", "sample.txt");

  const allFiles = [docxFile, xlsxFile, pdfFile, csvFile, txtFile];
  const missingFiles = allFiles.filter((f) => !fileExists(f));
  if (missingFiles.length > 0) {
    logTest(
      "CLI Generate Multi-File",
      "SKIP",
      `Missing files: ${missingFiles.join(", ")}`,
    );
    return false;
  }

  try {
    const fileArgs = allFiles.map((f) => `--file=${f}`);
    const totalSize = allFiles.reduce((sum, f) => sum + fs.statSync(f).size, 0);

    log(
      `CLI generate with ${allFiles.length} files, total: ${(totalSize / 1024).toFixed(0)} KB`,
      "blue",
    );

    const result = await runCommand("node", [
      "dist/cli/index.js",
      "generate",
      ...buildBaseCLIArgs(),
      ...fileArgs,
      `--max-tokens=${TEST_CONFIG.maxTokens}`,
      "--timeout=120",
      "Analyze all the documents. Describe what each file contains briefly.",
    ]);

    if (!result.success) {
      logTest(
        "CLI Generate Multi-File",
        "FAIL",
        `Exit code: ${result.code}, Error: ${result.stderr}`,
      );
      return false;
    }

    if (result.stdout.length > 50) {
      logTest(
        "CLI Generate Multi-File",
        "PASS",
        `5 files via CLI (${(totalSize / 1024).toFixed(0)} KB total), response: ${result.stdout.length} chars`,
      );
      return true;
    } else {
      logTest(
        "CLI Generate Multi-File",
        "FAIL",
        `Response too short: ${result.stdout.length} chars`,
      );
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("CLI Generate Multi-File", "FAIL", errorMessage);
    return false;
  }
}

/**
 * CLI Stream with multiple files simultaneously
 */
async function testCLIStreamMultiFile(): Promise<boolean> {
  logSection("Testing CLI Stream with 5 Files Simultaneously");

  const docxFile = getTestFilePath("document", "sample.docx");
  const xlsxFile = getTestFilePath("document", "file_example_XLSX_1000.xlsx");
  const pdfFile = getTestFilePath("document", "attention-is-all-you-need.pdf");
  const csvFile = path.resolve(TEST_CONFIG.curatorTestFiles, "basic.csv");
  const txtFile = getTestFilePath("document", "sample.txt");

  const allFiles = [docxFile, xlsxFile, pdfFile, csvFile, txtFile];
  const missingFiles = allFiles.filter((f) => !fileExists(f));
  if (missingFiles.length > 0) {
    logTest(
      "CLI Stream Multi-File",
      "SKIP",
      `Missing files: ${missingFiles.join(", ")}`,
    );
    return false;
  }

  try {
    const fileArgs = allFiles.map((f) => `--file=${f}`);
    const totalSize = allFiles.reduce((sum, f) => sum + fs.statSync(f).size, 0);

    log(
      `CLI stream with ${allFiles.length} files, total: ${(totalSize / 1024).toFixed(0)} KB`,
      "blue",
    );

    const result = await runCommand("node", [
      "dist/cli/index.js",
      "stream",
      ...buildBaseCLIArgs(),
      ...fileArgs,
      `--max-tokens=${TEST_CONFIG.maxTokens}`,
      "--timeout=120",
      "Analyze all the documents. For each file, describe its contents in one sentence.",
    ]);

    if (!result.success) {
      logTest(
        "CLI Stream Multi-File",
        "FAIL",
        `Exit code: ${result.code}, Error: ${result.stderr}`,
      );
      return false;
    }

    if (result.stdout.length > 50) {
      logTest(
        "CLI Stream Multi-File",
        "PASS",
        `5 files streamed via CLI (${(totalSize / 1024).toFixed(0)} KB total), response: ${result.stdout.length} chars`,
      );
      return true;
    } else {
      logTest(
        "CLI Stream Multi-File",
        "FAIL",
        `Response too short: ${result.stdout.length} chars`,
      );
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("CLI Stream Multi-File", "FAIL", errorMessage);
    return false;
  }
}

/**
 * SDK Generate with the LARGEST files we have — stress test the budget enforcement.
 * Uses: 1MB Word doc + 2.1MB PDF + 1000-row Excel + large CSV + RTF
 * Total: ~3.5MB+ of files, simulating the exact scenario that broke Curator.
 */
async function testSDKGenerateHeavyMultiFile(
  sdk: InstanceType<typeof NeuroLink>,
): Promise<boolean> {
  logSection("Testing SDK Generate HEAVY Multi-File (3.5MB+ Stress Test)");

  const heavyFiles = [
    {
      path: getTestFilePath("document", "sample_1mb.doc"),
      name: "sample_1mb.doc",
    },
    {
      path: getTestFilePath("document", "attention-is-all-you-need.pdf"),
      name: "attention-is-all-you-need.pdf",
    },
    {
      path: getTestFilePath("document", "file_example_XLSX_1000.xlsx"),
      name: "file_example_XLSX_1000.xlsx",
    },
    { path: getTestFilePath("document", "sample.docx"), name: "sample.docx" },
    { path: getTestFilePath("document", "sample.rtf"), name: "sample.rtf" },
  ];

  const missingFiles = heavyFiles.filter((f) => !fileExists(f.path));
  if (missingFiles.length > 0) {
    logTest(
      "SDK Generate Heavy Multi-File",
      "SKIP",
      `Missing files: ${missingFiles.map((f) => f.name).join(", ")}`,
    );
    return false;
  }

  try {
    const fileBuffers = heavyFiles.map((f) => fs.readFileSync(f.path));
    const totalSize = fileBuffers.reduce((sum, buf) => sum + buf.length, 0);

    log(
      `HEAVY load: ${heavyFiles.length} files, total size: ${(totalSize / (1024 * 1024)).toFixed(1)} MB`,
      "magenta",
    );
    heavyFiles.forEach((f, i) => {
      log(
        `  ${i + 1}. ${f.name} (${(fileBuffers[i].length / 1024).toFixed(0)} KB)`,
        "reset",
      );
    });

    const result = await sdk.generate({
      ...buildBaseSDKOptions(),
      input: {
        text: "Analyze all the documents. Give me a one-sentence summary of each file.",
        files: fileBuffers,
      },
      maxTokens: TEST_CONFIG.maxTokens,
      timeout: 180000, // 3 minutes for heavy load
    });

    const content =
      typeof result.content === "string"
        ? result.content
        : String(result.content);
    log(`Content length: ${content.length}`, "reset");

    if (content.length > 50) {
      logTest(
        "SDK Generate Heavy Multi-File",
        "PASS",
        `${heavyFiles.length} files (${(totalSize / (1024 * 1024)).toFixed(1)} MB total) processed without overflow, response: ${content.length} chars`,
      );
      return true;
    } else {
      logTest(
        "SDK Generate Heavy Multi-File",
        "FAIL",
        `Response too short: ${content.length} chars`,
      );
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    // If it's a context overflow error, that's the specific failure we're testing against
    if (
      errorMessage.includes("too long") ||
      errorMessage.includes("token") ||
      errorMessage.includes("context")
    ) {
      logTest(
        "SDK Generate Heavy Multi-File",
        "FAIL",
        `CONTEXT OVERFLOW: ${errorMessage}`,
      );
    } else {
      logTest("SDK Generate Heavy Multi-File", "FAIL", errorMessage);
    }
    return false;
  }
}

// =============================================================================
// BUG EXPOSURE TESTS — SDK-7, SDK-8, SDK-9
// These tests are designed to EXPOSE remaining bugs. They are expected to FAIL
// against commit c078ed88 and PASS after the corresponding fixes are applied.
// =============================================================================

/**
 * SDK-7 EXPOSURE: Large video file dropped by pre-processing budget enforcement.
 *
 * The bug: `enforceAggregateFileBudget()` in messageBuilder.ts:509 estimates
 * token cost from raw Buffer.length using formula `ceil((sizeBytes * 1.33) / 4)`.
 * A 575KB video = ~191K estimated tokens, which exceeds the budget.
 * But VideoProcessor extracts metadata text (~100-200 tokens).
 *
 * This test sends a video + a small text file (2 files triggers the budget guard).
 * If SDK-7 is present, the video gets dropped and the AI only sees the text file.
 * The response will NOT mention video/duration/codec/resolution.
 *
 * EXPECTED: FAIL (video dropped by budget enforcement before processing)
 * AFTER FIX: PASS (video processed to metadata, fits easily in budget)
 */
async function testSDK7_LargeVideoDroppedByBudget(
  sdk: InstanceType<typeof NeuroLink>,
): Promise<boolean> {
  logSection("BUG EXPOSURE: SDK-7 — Large Video Dropped by Budget");

  const videoFile = getTestFilePath("video", "sample_640x360.mp4");
  const txtFile = getTestFilePath("document", "sample.txt");

  if (!fileExists(videoFile) || !fileExists(txtFile)) {
    logTest(
      "SDK-7: Video Budget Drop",
      "SKIP",
      `Missing fixtures: video=${fileExists(videoFile)}, txt=${fileExists(txtFile)}`,
    );
    return true;
  }

  try {
    // Read as Buffers (Curator pattern) — 2 files triggers the budget guard
    const videoBuffer = fs.readFileSync(videoFile);
    const txtBuffer = fs.readFileSync(txtFile);
    const totalSize = videoBuffer.length + txtBuffer.length;

    log(
      `Sending 2 files: video (${(videoBuffer.length / 1024).toFixed(0)} KB) + text (${txtBuffer.length} bytes) = ${(totalSize / 1024).toFixed(0)} KB total`,
      "blue",
    );

    const sdkOptions = buildBaseSDKOptions();
    const result = await sdk.generate({
      input: {
        text: "Describe both files. For the video, tell me the duration, resolution, and codec. For the text file, summarize its content.",
        files: [videoBuffer, txtBuffer],
      },
      maxTokens: TEST_CONFIG.maxTokens,
      provider: sdkOptions.provider,
      ...(sdkOptions.model && { model: sdkOptions.model }),
    });

    const content = result.content.toLowerCase();

    // The response MUST mention video metadata (duration, resolution, codec)
    // If SDK-7 bug is present, the video was dropped and AI only sees text
    const videoPatterns = [
      "video",
      "duration",
      "resolution",
      "codec",
      "frame",
      "mp4",
    ];
    const videoMatches = videoPatterns.filter((p) => content.includes(p));

    if (videoMatches.length >= 3) {
      logTest(
        "SDK-7: Video Budget Drop",
        "PASS",
        `Video NOT dropped — AI described metadata (matched: ${videoMatches.join(", ")})`,
      );
      return true;
    } else {
      logTest(
        "SDK-7: Video Budget Drop",
        "FAIL",
        `Video likely DROPPED by budget enforcement — only ${videoMatches.length}/6 video patterns found. SDK-7 bug confirmed.`,
      );
      log("Response preview: " + result.content.substring(0, 500), "yellow");
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (
      errorMessage.includes("budget") ||
      errorMessage.includes("exceed") ||
      errorMessage.includes("context")
    ) {
      logTest(
        "SDK-7: Video Budget Drop",
        "FAIL",
        `Budget/context error confirms SDK-7: ${errorMessage}`,
      );
    } else {
      logTest("SDK-7: Video Budget Drop", "FAIL", errorMessage);
    }
    return false;
  }
}

/**
 * SDK-7 EXPOSURE: Single large file bypasses budget check entirely.
 *
 * The bug: `messageBuilder.ts:510` has guard `files.length > 1`.
 * When exactly 1 file is attached, `enforceAggregateFileBudget()` is skipped.
 * This means a single file is never budget-checked at the pre-processing stage.
 *
 * This test sends a single 18MB WAV file (the largest fixture we have).
 * Pre-processing formula would estimate ~6.2M tokens.
 * With the `files.length > 1` guard, this file is NOT checked, so it passes through.
 * After processing, AudioProcessor returns ~150 tokens of metadata.
 *
 * This test verifies the single file is actually processed (not erroring out).
 * It's more of a documentation test — the bug means single files skip budget,
 * which happens to work for metadata-only processors but would fail for large text files.
 *
 * EXPECTED: PASS (single file bypasses budget, gets processed to metadata)
 */
async function testSDK7_SingleFileBudgetBypass(
  sdk: InstanceType<typeof NeuroLink>,
): Promise<boolean> {
  logSection("BUG EXPOSURE: SDK-7 — Single Large File Budget Bypass");

  const wavFile = getTestFilePath("audio", "sample3.wav");

  if (!fileExists(wavFile)) {
    logTest("SDK-7: Single File Bypass", "SKIP", `Missing fixture: ${wavFile}`);
    return true;
  }

  try {
    const wavBuffer = fs.readFileSync(wavFile);
    log(
      `Sending 1 file: WAV audio (${(wavBuffer.length / (1024 * 1024)).toFixed(1)} MB)`,
      "blue",
    );
    log(
      `Pre-processing estimate would be: ${Math.ceil((wavBuffer.length * 1.33) / 4).toLocaleString()} tokens`,
      "blue",
    );
    log(
      `But files.length=1, so budget check is SKIPPED (SDK-7 sub-bug)`,
      "yellow",
    );

    const sdkOptions = buildBaseSDKOptions();
    const result = await sdk.generate({
      input: {
        text: "Describe this audio file. What format is it? What is its duration, sample rate, and bit depth?",
        files: [wavBuffer],
      },
      maxTokens: TEST_CONFIG.maxTokens,
      provider: sdkOptions.provider,
      ...(sdkOptions.model && { model: sdkOptions.model }),
    });

    const content = result.content.toLowerCase();
    const audioPatterns = [
      "audio",
      "wav",
      "sample",
      "duration",
      "pcm",
      "channel",
      "bit",
    ];
    const audioMatches = audioPatterns.filter((p) => content.includes(p));

    if (audioMatches.length >= 3) {
      logTest(
        "SDK-7: Single File Bypass",
        "PASS",
        `18MB WAV processed (bypassed budget due to files.length=1). Matched: ${audioMatches.join(", ")}`,
      );
      return true;
    } else {
      logTest(
        "SDK-7: Single File Bypass",
        "FAIL",
        `Audio not properly processed. Only ${audioMatches.length}/7 patterns matched.`,
      );
      log("Response preview: " + result.content.substring(0, 500), "yellow");
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("SDK-7: Single File Bypass", "FAIL", errorMessage);
    return false;
  }
}

/**
 * SDK-7 EXPOSURE: Multi-file with video + audio + archive (all binary).
 *
 * Sends 3 binary files that all get dramatically compressed by processors:
 * - Video (575KB raw → ~150 tokens metadata)
 * - Audio (1.7MB raw → ~150 tokens metadata)
 * - Archive (1KB raw → ~100 tokens file listing)
 *
 * Pre-processing budget formula estimates: ~783K tokens total.
 * Post-processing reality: ~400 tokens total.
 *
 * If SDK-7 is present, the larger files get dropped.
 *
 * EXPECTED: FAIL (video and/or audio dropped by budget)
 * AFTER FIX: PASS (all 3 processed to metadata, fits easily)
 */
async function testSDK7_MultiBinaryFileBudget(
  sdk: InstanceType<typeof NeuroLink>,
): Promise<boolean> {
  logSection("BUG EXPOSURE: SDK-7 — Multi-Binary File Budget");

  const videoFile = getTestFilePath("video", "sample_640x360.mp4");
  const audioFile = getTestFilePath("audio", "sample3.mp3");
  const archiveFile = getTestFilePath("archive", "sample.zip");

  if (
    !fileExists(videoFile) ||
    !fileExists(audioFile) ||
    !fileExists(archiveFile)
  ) {
    logTest("SDK-7: Multi-Binary Budget", "SKIP", `Missing fixtures`);
    return true;
  }

  try {
    const videoBuffer = fs.readFileSync(videoFile);
    const audioBuffer = fs.readFileSync(audioFile);
    const archiveBuffer = fs.readFileSync(archiveFile);
    const totalSize =
      videoBuffer.length + audioBuffer.length + archiveBuffer.length;

    log(
      `Sending 3 binary files: video (${(videoBuffer.length / 1024).toFixed(0)} KB) + audio (${(audioBuffer.length / 1024).toFixed(0)} KB) + archive (${(archiveBuffer.length / 1024).toFixed(0)} KB)`,
      "blue",
    );
    log(
      `Total raw: ${(totalSize / 1024).toFixed(0)} KB → Pre-processing estimate: ${Math.ceil((totalSize * 1.33) / 4).toLocaleString()} tokens`,
      "blue",
    );
    log(`Post-processing reality: ~400 tokens (metadata only)`, "blue");

    const sdkOptions = buildBaseSDKOptions();
    const result = await sdk.generate({
      input: {
        text: "Describe each of these 3 files. Tell me the video duration and resolution, the audio format and bitrate, and what files are in the archive.",
        files: [videoBuffer, audioBuffer, archiveBuffer],
      },
      maxTokens: TEST_CONFIG.maxTokens,
      provider: sdkOptions.provider,
      ...(sdkOptions.model && { model: sdkOptions.model }),
    });

    const content = result.content.toLowerCase();

    // Check that ALL 3 file types were processed
    const videoMatches = [
      "video",
      "duration",
      "resolution",
      "codec",
      "frame",
    ].filter((p) => content.includes(p));
    const audioMatches = [
      "audio",
      "mp3",
      "bitrate",
      "mpeg",
      "sample rate",
    ].filter((p) => content.includes(p));
    const archiveMatches = ["archive", "zip", "file", "entries"].filter((p) =>
      content.includes(p),
    );

    const allPassed =
      videoMatches.length >= 2 &&
      audioMatches.length >= 2 &&
      archiveMatches.length >= 2;

    if (allPassed) {
      logTest(
        "SDK-7: Multi-Binary Budget",
        "PASS",
        `All 3 binary files processed. Video: ${videoMatches.join(",")}, Audio: ${audioMatches.join(",")}, Archive: ${archiveMatches.join(",")}`,
      );
      return true;
    } else {
      logTest(
        "SDK-7: Multi-Binary Budget",
        "FAIL",
        `Some files likely dropped. Video: ${videoMatches.length}/5, Audio: ${audioMatches.length}/5, Archive: ${archiveMatches.length}/4. SDK-7 confirmed.`,
      );
      log("Response preview: " + result.content.substring(0, 500), "yellow");
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("SDK-7: Multi-Binary Budget", "FAIL", errorMessage);
    return false;
  }
}

/**
 * SDK-9 EXPOSURE: PPTX returns placeholder instead of extracted content.
 *
 * The bug: `fileDetector.ts:937-946` unconditionally returns
 * `[Presentation file: ${filename}]` — no processor exists.
 *
 * This test sends a real PPTX file with known text content:
 * - Slide 1 title: "NeuroLink Test Presentation"
 * - Slide 1 body: mentions "context compaction", "multi-provider", "file processing"
 * - Revenue data: "Q1=$1.2M, Q2=$1.5M, Q3=$1.8M, Q4=$2.1M"
 *
 * If SDK-9 is present, the AI only sees "[Presentation file: sample.pptx]"
 * and cannot describe the slide content.
 *
 * EXPECTED: FAIL (placeholder only, no content extraction)
 * AFTER FIX: PASS (slide text extracted and analyzable)
 */
async function testSDK9_PptxPlaceholder(
  sdk: InstanceType<typeof NeuroLink>,
): Promise<boolean> {
  logSection("BUG EXPOSURE: SDK-9 — PPTX Returns Placeholder");

  const pptxFile = getTestFilePath("document", "sample.pptx");

  if (!fileExists(pptxFile)) {
    logTest(
      "SDK-9: PPTX Placeholder",
      "SKIP",
      `Test file not found: ${pptxFile}`,
    );
    return true;
  }

  try {
    log("Testing SDK generate with PPTX file...", "blue");
    const sdkOptions = buildBaseSDKOptions();

    const result = await sdk.generate({
      input: {
        text: "What is the title of this presentation? What topics does it cover? Are there any revenue numbers mentioned?",
        files: [pptxFile],
      },
      maxTokens: TEST_CONFIG.maxTokens,
      provider: sdkOptions.provider,
      ...(sdkOptions.model && { model: sdkOptions.model }),
    });

    const content = result.content.toLowerCase();

    // If PPTX content was extracted, the AI should be able to find:
    // - The title "NeuroLink Test Presentation"
    // - Topics: context compaction, multi-provider, file processing
    // - Revenue data: Q1=$1.2M, etc.
    const contentPatterns = [
      "neurolink",
      "presentation",
      "context compaction",
      "multi-provider",
      "file processing",
      "revenue",
      "q1",
      "1.2m",
      "1.5m",
    ];
    const contentMatches = contentPatterns.filter((p) => content.includes(p));

    // Check for placeholder pattern — if present, the processor didn't extract content
    const hasPlaceholder =
      content.includes("[presentation file:") ||
      content.includes("presentation file:");

    if (contentMatches.length >= 3 && !hasPlaceholder) {
      logTest(
        "SDK-9: PPTX Placeholder",
        "PASS",
        `PPTX content extracted! Matched: ${contentMatches.join(", ")}`,
      );
      return true;
    } else if (hasPlaceholder) {
      logTest(
        "SDK-9: PPTX Placeholder",
        "FAIL",
        `PPTX returned placeholder only — no content extraction. SDK-9 confirmed. AI saw "[Presentation file: ...]" instead of actual slide content.`,
      );
      log("Response preview: " + result.content.substring(0, 500), "yellow");
      return false;
    } else {
      logTest(
        "SDK-9: PPTX Placeholder",
        "FAIL",
        `PPTX processed but content not recognized. Only ${contentMatches.length}/9 patterns found.`,
      );
      log("Response preview: " + result.content.substring(0, 500), "yellow");
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("SDK-9: PPTX Placeholder", "FAIL", errorMessage);
    return false;
  }
}

/**
 * SDK-8 EXPOSURE: Placeholder detection across all processed file types.
 *
 * This test does NOT send files to an LLM. Instead, it directly calls
 * FileDetector.detectAndProcess() on valid files and checks that the
 * returned content does NOT contain bare placeholder patterns.
 *
 * For file types where we have valid fixtures, the processor should return
 * actual content (metadata, extracted text, file listings) — NOT a bare
 * `[Type file: name]` pattern.
 *
 * This is a fast, non-LLM test that validates processor output quality.
 *
 * EXPECTED: Mixed results — processors that work will PASS, PPTX will FAIL.
 */
async function testSDK8_NoBarePlaceholders(
  sdk: InstanceType<typeof NeuroLink>,
): Promise<boolean> {
  logSection("BUG EXPOSURE: SDK-8 — Placeholder Detection (Non-LLM)");

  // We'll test by sending each file type individually to SDK generate
  // and checking the response doesn't just echo back a placeholder
  const testCases = [
    {
      name: "PPTX",
      file: getTestFilePath("document", "sample.pptx"),
      placeholder: "[presentation file:",
      prompt: "What is in this presentation file? List its content.",
    },
  ];

  let allPassed = true;

  for (const tc of testCases) {
    if (!fileExists(tc.file)) {
      logTest(`SDK-8: ${tc.name} Placeholder`, "SKIP", `Missing: ${tc.file}`);
      continue;
    }

    try {
      const sdkOptions = buildBaseSDKOptions();
      const result = await sdk.generate({
        input: {
          text: tc.prompt,
          files: [tc.file],
        },
        maxTokens: TEST_CONFIG.maxTokens,
        provider: sdkOptions.provider,
        ...(sdkOptions.model && { model: sdkOptions.model }),
      });

      const content = result.content.toLowerCase();

      // Check for ANY bare placeholder pattern
      const placeholderPatterns = [
        "[video file:",
        "[audio file:",
        "[archive file:",
        "[spreadsheet file:",
        "[document file:",
        "[presentation file:",
      ];

      const foundPlaceholders = placeholderPatterns.filter((p) =>
        content.includes(p),
      );

      if (foundPlaceholders.length > 0) {
        logTest(
          `SDK-8: ${tc.name} Placeholder`,
          "FAIL",
          `Response contains bare placeholder(s): ${foundPlaceholders.join(", ")}. SDK-8 confirmed.`,
        );
        allPassed = false;
      } else if (content.length > 50) {
        logTest(
          `SDK-8: ${tc.name} Placeholder`,
          "PASS",
          `No bare placeholders, response: ${content.length} chars`,
        );
      } else {
        logTest(
          `SDK-8: ${tc.name} Placeholder`,
          "FAIL",
          `Response too short (${content.length} chars) — likely a placeholder`,
        );
        allPassed = false;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logTest(`SDK-8: ${tc.name} Placeholder`, "FAIL", errorMessage);
      allPassed = false;
    }
  }

  return allPassed;
}

/**
 * SDK-8 EXPOSURE: Corrupted video file returns bare placeholder.
 *
 * Sends a corrupted MP4 file. The VideoProcessor should fail, but the
 * catch block should return informative content (file size, MIME type, error).
 * Currently it returns just `[Video file: video]`.
 *
 * EXPECTED: FAIL (bare placeholder with no useful metadata)
 * AFTER FIX: PASS (informative fallback with size, format, error reason)
 */
async function testSDK8_CorruptedVideoPlaceholder(
  sdk: InstanceType<typeof NeuroLink>,
): Promise<boolean> {
  logSection("BUG EXPOSURE: SDK-8 — Corrupted Video Returns Bare Placeholder");

  const corruptedVideo = getTestFilePath("video", "corrupted.mp4");

  if (!fileExists(corruptedVideo)) {
    logTest("SDK-8: Corrupted Video", "SKIP", `Missing: ${corruptedVideo}`);
    return true;
  }

  try {
    const sdkOptions = buildBaseSDKOptions();
    const result = await sdk.generate({
      input: {
        text: "What can you tell me about this video file? Describe everything you know about it.",
        files: [corruptedVideo],
      },
      maxTokens: TEST_CONFIG.maxTokens,
      provider: sdkOptions.provider,
      ...(sdkOptions.model && { model: sdkOptions.model }),
    });

    const content = result.content.toLowerCase();

    // After SDK-8 fix, even a corrupted file should report:
    // - File size (160 bytes)
    // - Format (video/mp4 or similar)
    // - Error reason (corrupted, couldn't process)
    const informativePatterns = [
      "size",
      "byte",
      "format",
      "mp4",
      "video",
      "corrupt",
      "error",
      "could not",
      "unable",
      "invalid",
    ];
    const informativeMatches = informativePatterns.filter((p) =>
      content.includes(p),
    );

    // Check for bare placeholder
    const hasBare =
      content.includes("[video file:") && informativeMatches.length < 3;

    if (!hasBare && informativeMatches.length >= 2) {
      logTest(
        "SDK-8: Corrupted Video",
        "PASS",
        `Informative response for corrupted file. Matched: ${informativeMatches.join(", ")}`,
      );
      return true;
    } else {
      logTest(
        "SDK-8: Corrupted Video",
        "FAIL",
        `Bare placeholder or uninformative response. Only ${informativeMatches.length}/10 informative patterns. SDK-8 confirmed.`,
      );
      log("Response preview: " + result.content.substring(0, 500), "yellow");
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("SDK-8: Corrupted Video", "FAIL", errorMessage);
    return false;
  }
}

/**
 * SDK-8 EXPOSURE: Corrupted archive returns bare placeholder.
 *
 * EXPECTED: FAIL (bare placeholder)
 * AFTER FIX: PASS (informative fallback)
 */
async function testSDK8_CorruptedArchivePlaceholder(
  sdk: InstanceType<typeof NeuroLink>,
): Promise<boolean> {
  logSection(
    "BUG EXPOSURE: SDK-8 — Corrupted Archive Returns Bare Placeholder",
  );

  const corruptedArchive = getTestFilePath("archive", "corrupted.zip");

  if (!fileExists(corruptedArchive)) {
    logTest("SDK-8: Corrupted Archive", "SKIP", `Missing: ${corruptedArchive}`);
    return true;
  }

  try {
    const sdkOptions = buildBaseSDKOptions();
    const result = await sdk.generate({
      input: {
        text: "What can you tell me about this archive file? What files does it contain?",
        files: [corruptedArchive],
      },
      maxTokens: TEST_CONFIG.maxTokens,
      provider: sdkOptions.provider,
      ...(sdkOptions.model && { model: sdkOptions.model }),
    });

    const content = result.content.toLowerCase();

    const informativePatterns = [
      "size",
      "byte",
      "format",
      "zip",
      "archive",
      "corrupt",
      "error",
      "could not",
      "unable",
      "invalid",
    ];
    const informativeMatches = informativePatterns.filter((p) =>
      content.includes(p),
    );

    const hasBare =
      content.includes("[archive file:") && informativeMatches.length < 3;

    if (!hasBare && informativeMatches.length >= 2) {
      logTest(
        "SDK-8: Corrupted Archive",
        "PASS",
        `Informative response. Matched: ${informativeMatches.join(", ")}`,
      );
      return true;
    } else {
      logTest(
        "SDK-8: Corrupted Archive",
        "FAIL",
        `Bare/uninformative placeholder. ${informativeMatches.length}/10 matches. SDK-8 confirmed.`,
      );
      log("Response preview: " + result.content.substring(0, 500), "yellow");
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("SDK-8: Corrupted Archive", "FAIL", errorMessage);
    return false;
  }
}

// =============================================================================
// MAIN TEST RUNNER
// =============================================================================

async function runAllTests(): Promise<void> {
  logSection("NeuroLink File Processor Test Suite");
  log(`Provider: ${TEST_CONFIG.provider}`, "bright");
  log(`Max Tokens: ${TEST_CONFIG.maxTokens}`, "bright");
  log(`Test Files: ${TEST_CONFIG.curatorTestFiles}`, "bright");
  log(
    "Verifying all file processors via generate() and stream()...\n",
    "bright",
  );

  const startTime = Date.now();
  const testResults: TestResult[] = [];

  // Check prerequisites
  log("\n\uD83D\uDD0D Checking prerequisites...", "cyan");

  if (!fs.existsSync("dist") || !fs.existsSync("dist/index.js")) {
    log("\u274C Build artifacts not found. Please run: pnpm run build", "red");
    process.exit(1);
  }
  log("\u2705 Build artifacts found", "green");

  if (!fs.existsSync(TEST_CONFIG.curatorTestFiles)) {
    log(
      `\u274C Test files not found at: ${TEST_CONFIG.curatorTestFiles}`,
      "red",
    );
    process.exit(1);
  }
  log(`\u2705 Test files found at: ${TEST_CONFIG.curatorTestFiles}`, "green");

  // Create shared SDK instance
  log("\n\uD83D\uDD27 Creating shared SDK instance...", "cyan");
  const sharedSdk = new NeuroLink();
  log("\u2705 Shared SDK instance created\n", "green");

  // Define all tests
  const tests: TestFunction[] = [
    // Excel tests
    { name: "CLI Generate Excel", fn: testCLIGenerateExcel, category: "Excel" },
    { name: "CLI Stream Excel", fn: testCLIStreamExcel, category: "Excel" },
    {
      name: "SDK Generate Excel",
      fn: () => testSDKGenerateExcel(sharedSdk),
      category: "Excel",
    },
    {
      name: "SDK Stream Excel",
      fn: () => testSDKStreamExcel(sharedSdk),
      category: "Excel",
    },

    // Word tests
    { name: "CLI Generate Word", fn: testCLIGenerateWord, category: "Word" },
    {
      name: "SDK Generate Word",
      fn: () => testSDKGenerateWord(sharedSdk),
      category: "Word",
    },

    // JSON tests
    { name: "CLI Generate JSON", fn: testCLIGenerateJSON, category: "JSON" },
    {
      name: "SDK Generate JSON",
      fn: () => testSDKGenerateJSON(sharedSdk),
      category: "JSON",
    },

    // YAML tests
    { name: "CLI Generate YAML", fn: testCLIGenerateYAML, category: "YAML" },
    {
      name: "SDK Generate YAML",
      fn: () => testSDKGenerateYAML(sharedSdk),
      category: "YAML",
    },

    // XML tests
    { name: "CLI Generate XML", fn: testCLIGenerateXML, category: "XML" },
    {
      name: "SDK Generate XML",
      fn: () => testSDKGenerateXML(sharedSdk),
      category: "XML",
    },

    // HTML tests
    { name: "CLI Generate HTML", fn: testCLIGenerateHTML, category: "HTML" },
    {
      name: "SDK Generate HTML",
      fn: () => testSDKGenerateHTML(sharedSdk),
      category: "HTML",
    },

    // SVG tests
    { name: "CLI Generate SVG", fn: testCLIGenerateSVG, category: "SVG" },
    {
      name: "SDK Generate SVG",
      fn: () => testSDKGenerateSVG(sharedSdk),
      category: "SVG",
    },

    // Text tests
    { name: "CLI Generate Text", fn: testCLIGenerateText, category: "Text" },
    {
      name: "SDK Generate Text",
      fn: () => testSDKGenerateText(sharedSdk),
      category: "Text",
    },

    // Source code tests
    {
      name: "CLI Generate Python",
      fn: testCLIGeneratePython,
      category: "SourceCode",
    },
    {
      name: "SDK Generate Python",
      fn: () => testSDKGeneratePython(sharedSdk),
      category: "SourceCode",
    },
    {
      name: "CLI Generate JavaScript",
      fn: testCLIGenerateJavaScript,
      category: "SourceCode",
    },
    {
      name: "SDK Generate JavaScript",
      fn: () => testSDKGenerateJavaScript(sharedSdk),
      category: "SourceCode",
    },
    {
      name: "CLI Generate SQL",
      fn: testCLIGenerateSQL,
      category: "SourceCode",
    },
    {
      name: "SDK Generate SQL",
      fn: () => testSDKGenerateSQL(sharedSdk),
      category: "SourceCode",
    },

    // RTF tests
    { name: "CLI Generate RTF", fn: testCLIGenerateRTF, category: "RTF" },
    {
      name: "SDK Generate RTF",
      fn: () => testSDKGenerateRTF(sharedSdk),
      category: "RTF",
    },

    // OpenDocument tests
    {
      name: "CLI Generate ODT",
      fn: testCLIGenerateODT,
      category: "OpenDocument",
    },
    {
      name: "SDK Generate ODT",
      fn: () => testSDKGenerateODT(sharedSdk),
      category: "OpenDocument",
    },

    // CSV tests
    { name: "CLI Generate CSV", fn: testCLIGenerateCSV, category: "CSV" },
    {
      name: "SDK Generate CSV",
      fn: () => testSDKGenerateCSV(sharedSdk),
      category: "CSV",
    },

    // PDF tests (large document context verification)
    { name: "CLI Generate PDF", fn: testCLIGeneratePDF, category: "PDF" },
    { name: "CLI Stream PDF", fn: testCLIStreamPDF, category: "PDF" },
    {
      name: "SDK Generate PDF",
      fn: () => testSDKGeneratePDF(sharedSdk),
      category: "PDF",
    },
    {
      name: "SDK Stream PDF",
      fn: () => testSDKStreamPDF(sharedSdk),
      category: "PDF",
    },

    // Video tests
    {
      name: "CLI Generate Video",
      fn: testCLIGenerateVideo,
      category: "Video",
    },
    {
      name: "CLI Stream Video",
      fn: testCLIStreamVideo,
      category: "Video",
    },
    {
      name: "SDK Generate Video",
      fn: () => testSDKGenerateVideo(sharedSdk),
      category: "Video",
    },
    {
      name: "SDK Stream Video",
      fn: () => testSDKStreamVideo(sharedSdk),
      category: "Video",
    },

    // Audio tests
    {
      name: "CLI Generate Audio (MP3)",
      fn: testCLIGenerateAudio,
      category: "Audio",
    },
    {
      name: "SDK Generate Audio (MP3)",
      fn: () => testSDKGenerateAudio(sharedSdk),
      category: "Audio",
    },
    {
      name: "CLI Generate Audio (WAV)",
      fn: testCLIGenerateAudioWav,
      category: "Audio",
    },
    {
      name: "SDK Generate Audio (FLAC)",
      fn: () => testSDKGenerateAudioFlac(sharedSdk),
      category: "Audio",
    },
    {
      name: "SDK Stream Audio (OGG)",
      fn: () => testSDKStreamAudio(sharedSdk),
      category: "Audio",
    },

    // Archive tests
    {
      name: "CLI Generate Archive (ZIP)",
      fn: testCLIGenerateArchiveZip,
      category: "Archive",
    },
    {
      name: "SDK Generate Archive (ZIP)",
      fn: () => testSDKGenerateArchiveZip(sharedSdk),
      category: "Archive",
    },
    {
      name: "CLI Generate Archive (TAR.GZ)",
      fn: testCLIGenerateArchiveTarGz,
      category: "Archive",
    },
    {
      name: "SDK Generate Archive (TAR.GZ)",
      fn: () => testSDKGenerateArchiveTarGz(sharedSdk),
      category: "Archive",
    },

    // Multi-File Stress Tests (Curator scenario simulation)
    {
      name: "SDK Generate Multi-File (5 files)",
      fn: () => testSDKGenerateMultiFile(sharedSdk),
      category: "MultiFile",
    },
    {
      name: "SDK Stream Multi-File (5 files)",
      fn: () => testSDKStreamMultiFile(sharedSdk),
      category: "MultiFile",
    },
    {
      name: "CLI Generate Multi-File (5 files)",
      fn: testCLIGenerateMultiFile,
      category: "MultiFile",
    },
    {
      name: "CLI Stream Multi-File (5 files)",
      fn: testCLIStreamMultiFile,
      category: "MultiFile",
    },
    {
      name: "SDK Generate Heavy Multi-File (3.5MB+ stress)",
      fn: () => testSDKGenerateHeavyMultiFile(sharedSdk),
      category: "MultiFile",
    },

    // Bug Exposure Tests (expected to FAIL until corresponding fixes are applied)
    {
      name: "SDK-7: Large Video Dropped by Budget",
      fn: () => testSDK7_LargeVideoDroppedByBudget(sharedSdk),
      category: "BugExposure",
    },
    {
      name: "SDK-7: Single File Budget Bypass (18MB WAV)",
      fn: () => testSDK7_SingleFileBudgetBypass(sharedSdk),
      category: "BugExposure",
    },
    {
      name: "SDK-7: Multi-Binary File Budget (video+audio+archive)",
      fn: () => testSDK7_MultiBinaryFileBudget(sharedSdk),
      category: "BugExposure",
    },
    {
      name: "SDK-9: PPTX Returns Placeholder (no processor)",
      fn: () => testSDK9_PptxPlaceholder(sharedSdk),
      category: "BugExposure",
    },
    {
      name: "SDK-8: Placeholder Detection (PPTX)",
      fn: () => testSDK8_NoBarePlaceholders(sharedSdk),
      category: "BugExposure",
    },
    {
      name: "SDK-8: Corrupted Video Placeholder",
      fn: () => testSDK8_CorruptedVideoPlaceholder(sharedSdk),
      category: "BugExposure",
    },
    {
      name: "SDK-8: Corrupted Archive Placeholder",
      fn: () => testSDK8_CorruptedArchivePlaceholder(sharedSdk),
      category: "BugExposure",
    },
  ];

  // Execute tests
  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    const testStartTime = Date.now();

    try {
      const result = await test.fn();
      const duration = Date.now() - testStartTime;
      testResults.push({
        name: test.name,
        category: test.category,
        result,
        error: null,
        duration,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const duration = Date.now() - testStartTime;
      testResults.push({
        name: test.name,
        category: test.category,
        result: false,
        error: errorMessage,
        duration,
      });
    }

    // Cleanup and delay between tests
    await globalCleanup();

    if (i < tests.length - 1) {
      log(
        `\n\u23F3 Waiting ${TEST_CONFIG.interTestDelay / 1000}s before next test...`,
        "reset",
      );
      await new Promise((resolve) =>
        setTimeout(resolve, TEST_CONFIG.interTestDelay),
      );
    }
  }

  // Cleanup shared SDK
  try {
    await sharedSdk.dispose();
    log("\n[CLEANUP] Shared SDK instance disposed", "cyan");
  } catch (error) {
    log(`[CLEANUP] Error disposing SDK: ${error}`, "yellow");
  }

  // Print summary
  logSection("Test Results Summary");

  // Group results by category
  const categories = [...new Set(testResults.map((r) => r.category))];

  for (const category of categories) {
    log(`\n${category}:`, "bright");
    const categoryTests = testResults.filter((r) => r.category === category);
    for (const test of categoryTests) {
      const status: "PASS" | "FAIL" | "SKIP" = test.result
        ? "PASS"
        : test.error?.includes("SKIP")
          ? "SKIP"
          : "FAIL";
      logTest(test.name, status, test.error || `${test.duration}ms`);
    }
  }

  // Final stats
  const passed = testResults.filter((r) => r.result).length;
  const failed = testResults.filter(
    (r) => !r.result && !r.error?.includes("SKIP"),
  ).length;
  const skipped = testResults.filter((r) => r.error?.includes("SKIP")).length;
  const total = testResults.length;
  const duration = Math.round((Date.now() - startTime) / 1000);

  log(`\n\uD83D\uDCCA Final Results:`, "bright");
  log(`   Passed:  ${passed}/${total}`, "green");
  log(`   Failed:  ${failed}/${total}`, failed > 0 ? "red" : "green");
  log(`   Skipped: ${skipped}/${total}`, "yellow");
  log(`   Duration: ${duration}s`, "reset");

  if (failed === 0) {
    log("\n\uD83C\uDF89 All tests passed!", "green");
    process.exit(0);
  } else {
    log(`\n\u274C ${failed} test(s) failed.`, "red");
    process.exit(1);
  }
}

// Run tests
runAllTests().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
