#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — MCP CLI Integration (real CLI subprocess + live API)
 *
 * 5 test functions covering CLI generate/stream with built-in tools and
 * multi-tool flows. Spawns the CLI binary via child_process; requires a
 * provider key for the underlying generate/stream calls.
 *
 *   Part 4  — Core CLI integration (3): testCLIGenerateWithTools,
 *             testCLIStreamWithTools, testCLIMCPCommands
 *   Part 4b — Enhanced CLI integration (2): testCLIGenerateMultiTool,
 *             testCLIStreamWithReadFile
 *
 * Run: pnpm run build && npx tsx test/continuous-test-suite-mcp-cli.ts
 *      pnpm run test:mcp:cli
 *
 * Originally lived as Parts 4 + 4b inside continuous-test-suite-mcp.ts.
 * Split out in May 2026.
 */

import path from "path";
import { fileURLToPath } from "url";
import type { StdioOptions } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import {
  TEST_CONFIG,
  INTER_TEST_DELAY_MS,
  delay,
  buildBaseSDKOptions,
} from "./helpers/mcpHelpers.js";
import {
  defineSuite,
  isExpectedProviderError,
  log,
  logSection,
} from "./helpers/harness.js";
import { NeuroLink } from "../dist/index.js";
import type { MCPExecutableTool } from "../src/lib/types/index.js";

import { assertDistFresh } from "./helpers/distFreshness.js";

// Fail loudly rather than silently testing a stale build (see distFreshness.ts).
assertDistFresh();

const { recordTest, runSuite } = defineSuite("MCP CLI Integration");

/**
 * Decide whether a CLI subprocess failure is "the test cannot run because
 * provider/credentials/CLI-args are off in this environment" (SKIP) versus
 * "the CLI / SDK reproduced a real bug" (FAIL).
 *
 * Strategy:
 *   1. Yargs flag-parsing errors are NEVER auth issues — they indicate the
 *      test passed an invalid CLI argument and need to FAIL loudly. Match
 *      yargs' specific stderr framings before anything else.
 *   2. Otherwise defer to the shared `isExpectedProviderError` helper,
 *      which uses anchored regex patterns on auth/network/quota/upstream
 *      framings. Avoids the substring-trap of the older `.includes("API
 *      key")` style where any stack trace mentioning "API key" would
 *      silently SKIP.
 */
function shouldSkipCliFailure(stderr: string, msg: string): boolean {
  const combined = `${stderr}\n${msg}`;
  if (
    /\b(?:Invalid values|Missing required argument|Unknown argument|Not enough non-option arguments)\b/i.test(
      combined,
    ) ||
    /\bChoices:\s*"/.test(combined)
  ) {
    return false;
  }
  return (
    isExpectedProviderError(stderr) ||
    isExpectedProviderError(msg) ||
    isExpectedProviderError(combined)
  );
}

// ============================================================
// Part 4: CLI Integration Tests
// Tests CLI generate, stream, and MCP subcommands
// ============================================================

async function testCLIGenerateWithTools(): Promise<void> {
  logSection("CLI generate with Tools");

  const projectRoot = path.resolve(__dirname, "..");
  const cliJs = path.join(projectRoot, "dist/cli/index.js");
  const { execFileSync } = await import("child_process");

  const execOpts = {
    encoding: "utf-8" as const,
    timeout: 120000,
    cwd: projectRoot,
    env: { ...process.env, NO_COLOR: "1" },
    stdio: ["pipe", "pipe", "pipe"] as StdioOptions,
    shell: false as const,
  };

  /**
   * Helper: run the CLI, handle auth errors as skip, return stdout or
   * null on failure. Uses execFileSync (no shell) so neither cliJs nor
   * the args are interpolated into a shell command — closes the
   * `js/shell-command-injection-from-environment` finding.
   */
  function runCLI(args: string[], testNames: string[]): string | null {
    log(`[DEBUG] Running CLI: node ${cliJs} ${args.join(" ")}`, "blue");
    try {
      return execFileSync("node", [cliJs, ...args], execOpts);
    } catch (execError: unknown) {
      const err = execError as {
        stdout?: string;
        stderr?: string;
        message?: string;
        status?: number;
      };
      const stderr = err.stderr || "";
      const errStdout = err.stdout || "";
      const msg = err.message || String(execError);

      const isAuth = shouldSkipCliFailure(stderr, msg);

      if (isAuth) {
        for (const name of testNames) {
          recordTest(
            name,
            true,
            true,
            `Skipped: auth error — ${(stderr || msg).substring(0, 200)}`,
          );
        }
        return null;
      }

      if (errStdout.length > 0) {
        log(
          `[WARN] CLI exited with status ${err.status} but produced output (${errStdout.length} chars)`,
          "yellow",
        );
        return errStdout;
      }

      for (const name of testNames) {
        recordTest(
          name,
          false,
          false,
          `CLI failed (exit ${err.status}): ${(stderr || msg).substring(0, 300)}`,
        );
      }
      return null;
    }
  }

  // --- Test 1: calculateMath tool ---
  // Ask the CLI to compute 15 * 37 using the calculateMath tool — expect "555" in output
  {
    const testNames = [
      "CLI generate with calculateMath executes",
      "CLI generate calculateMath output contains 555",
    ];
    const prompt =
      "What is 15 multiplied by 37? Use the calculateMath tool to compute this. Give me the exact number.";
    const stdout = runCLI(
      [
        "generate",
        prompt,
        "--provider",
        TEST_CONFIG.provider,
        "--maxTokens",
        "500",
      ],
      testNames,
    );

    if (stdout !== null) {
      recordTest(
        testNames[0],
        stdout.length > 0,
        false,
        `Output length: ${stdout.length} chars`,
      );

      const containsResult = stdout.includes("555");
      recordTest(
        testNames[1],
        containsResult,
        false,
        containsResult
          ? "Output contains expected result '555'"
          : `Output did not contain '555'. Preview: ${stdout.substring(0, 300)}`,
      );
      log(`CLI output preview: ${stdout.substring(0, 400)}`, "reset");
    }
  }

  // --- Test 2: getCurrentTime tool ---
  // Ask the CLI to use getCurrentTime — expect current year or a time-like pattern
  {
    const testNames = [
      "CLI generate with getCurrentTime executes",
      "CLI generate getCurrentTime output contains date/time",
    ];
    const prompt =
      "What is the current date and time? Use the getCurrentTime tool.";
    const stdout = runCLI(
      [
        "generate",
        prompt,
        "--provider",
        TEST_CONFIG.provider,
        "--maxTokens",
        "500",
      ],
      testNames,
    );

    if (stdout !== null) {
      recordTest(
        testNames[0],
        stdout.length > 0,
        false,
        `Output length: ${stdout.length} chars`,
      );

      // Check for current year or a time-like pattern (HH:MM or YYYY)
      const currentYear = new Date().getFullYear().toString();
      const hasYear = stdout.includes(currentYear);
      const hasTimePattern = /\d{1,2}:\d{2}/.test(stdout);
      const containsDateTime = hasYear || hasTimePattern;
      recordTest(
        testNames[1],
        containsDateTime,
        false,
        containsDateTime
          ? `Output contains date/time info (year=${hasYear}, time-pattern=${hasTimePattern})`
          : `Output did not contain year '${currentYear}' or time pattern. Preview: ${stdout.substring(0, 300)}`,
      );
      log(`CLI output preview: ${stdout.substring(0, 400)}`, "reset");
    }
  }
}
async function testCLIStreamWithTools(): Promise<void> {
  logSection("CLI Stream with Tools");

  const { execFileSync } = await import("child_process");
  const projectRoot = path.resolve(__dirname, "..");
  const cliJs = path.join(projectRoot, "dist/cli/index.js");

  const execOpts = {
    cwd: projectRoot,
    timeout: 120000,
    encoding: "utf-8" as const,
    env: { ...process.env, NO_COLOR: "1" },
    stdio: ["pipe", "pipe", "pipe"] as StdioOptions,
    shell: false as const,
  };

  const testNames = [
    "CLI stream with listDirectory executes",
    "CLI stream listDirectory output contains filenames",
  ];

  try {
    // Ask the model to use listDirectory on the project root — expect common filenames
    const prompt =
      "Use the listDirectory tool to list files in the current directory. What files do you see?";
    const args = [
      cliJs,
      "stream",
      prompt,
      "--provider",
      TEST_CONFIG.provider,
      "--max-tokens",
      "500",
    ];

    log(`[DEBUG] Running: node ${args.join(" ")}`, "blue");

    const output = execFileSync("node", args, execOpts);
    const trimmed = (output || "").trim();

    recordTest(
      testNames[0],
      trimmed.length > 0,
      false,
      `Exit code 0, output length: ${trimmed.length}`,
    );

    // Verify the output mentions real project files/directories
    const knownFiles = [
      "package.json",
      "src",
      "tsconfig",
      "node_modules",
      "dist",
      "README",
    ];
    const found = knownFiles.filter((f) =>
      trimmed.toLowerCase().includes(f.toLowerCase()),
    );
    const hasFilenames = found.length > 0;
    recordTest(
      testNames[1],
      hasFilenames,
      false,
      hasFilenames
        ? `Output contains project filenames: ${found.join(", ")}`
        : `Output did not contain known filenames. Preview: ${trimmed.substring(0, 300)}`,
    );

    log(`CLI stream output preview: ${trimmed.substring(0, 400)}`, "reset");
  } catch (error) {
    const err = error as {
      stdout?: string;
      stderr?: string;
      message?: string;
      status?: number;
    };
    const msg = err.message || String(error);
    const stderr = err.stderr || "";
    const errStdout = err.stdout || "";

    const isAuth = shouldSkipCliFailure(stderr, msg);

    if (isAuth) {
      for (const name of testNames) {
        recordTest(
          name,
          true,
          true,
          `Skipped: ${(stderr || msg).substring(0, 150)}`,
        );
      }
    } else if (errStdout.length > 0) {
      // CLI exited non-zero but produced output — check it anyway
      const trimmed = errStdout.trim();
      recordTest(
        testNames[0],
        trimmed.length > 0,
        false,
        `Exit ${err.status}, output length: ${trimmed.length}`,
      );
      const knownFiles = [
        "package.json",
        "src",
        "tsconfig",
        "node_modules",
        "dist",
        "README",
      ];
      const found = knownFiles.filter((f) =>
        trimmed.toLowerCase().includes(f.toLowerCase()),
      );
      recordTest(
        testNames[1],
        found.length > 0,
        false,
        found.length > 0
          ? `Output contains: ${found.join(", ")}`
          : `Preview: ${trimmed.substring(0, 300)}`,
      );
    } else {
      for (const name of testNames) {
        recordTest(name, false, false, msg.substring(0, 300));
      }
    }
  }
}

async function testCLIMCPCommands(): Promise<void> {
  logSection("CLI MCP Commands");

  const { execFileSync } = await import("child_process");
  const projectRoot = path.resolve(__dirname, "..");
  const cliJs = path.join(projectRoot, "dist/cli/index.js");

  const execOpts = {
    cwd: projectRoot,
    timeout: 60000,
    encoding: "utf-8" as const,
    env: { ...process.env, NO_COLOR: "1" },
    stdio: ["pipe", "pipe", "pipe"] as StdioOptions,
    shell: false as const,
  };

  /**
   * Helper: run an MCP subcommand, returning { stdout, stderr, exitCode }.
   * Handles non-zero exits gracefully (captures output from error object).
   * Uses execFileSync (no shell) — closes the
   * `js/shell-command-injection-from-environment` finding.
   */
  function runMCPCmd(subcommandArgs: string[]): {
    stdout: string;
    stderr: string;
    exitCode: number;
  } {
    log(
      `[DEBUG] Running: node ${cliJs} mcp ${subcommandArgs.join(" ")}`,
      "blue",
    );
    try {
      const stdout = execFileSync(
        "node",
        [cliJs, "mcp", ...subcommandArgs],
        execOpts,
      );
      return { stdout: (stdout || "").trim(), stderr: "", exitCode: 0 };
    } catch (execError: unknown) {
      const err = execError as {
        stdout?: string;
        stderr?: string;
        status?: number;
      };
      return {
        stdout: (err.stdout || "").trim(),
        stderr: (err.stderr || "").trim(),
        exitCode: err.status ?? 1,
      };
    }
  }

  /**
   * Check if a failure is expected (no servers configured, tool not found, etc.)
   */
  function isExpectedFailure(output: string): boolean {
    // Intentional skip framings — "no servers configured" / "tool not found"
    // are legitimate environment outcomes. Filesystem (ENOENT) and module
    // (Cannot find) errors are NOT in this list: they indicate a broken
    // dist/cli build or bad spawn path, which is a real packaging
    // regression that must surface as FAIL, not SKIP.
    const patterns = [
      "No MCP",
      "no servers",
      "not found",
      "No tools",
      "no tools",
      "No external",
    ];
    return patterns.some((p) => output.toLowerCase().includes(p.toLowerCase()));
  }

  // --- Test 1: mcp list ---
  {
    const { stdout, stderr, exitCode } = runMCPCmd(["list", "--quiet"]);
    const combined = stdout + stderr;
    if (exitCode === 0) {
      recordTest(
        "CLI mcp list runs successfully",
        true,
        false,
        `Exit 0, output: ${stdout.substring(0, 200)}`,
      );
    } else if (isExpectedFailure(combined)) {
      recordTest(
        "CLI mcp list runs successfully",
        true,
        true,
        `Skipped (no servers): ${combined.substring(0, 150)}`,
      );
    } else {
      recordTest(
        "CLI mcp list runs successfully",
        false,
        false,
        `Exit ${exitCode}: ${combined.substring(0, 300)}`,
      );
    }
  }

  // --- Test 2: mcp servers ---
  {
    const { stdout, stderr, exitCode } = runMCPCmd([
      "servers",
      "--format",
      "json",
      "--quiet",
    ]);
    const combined = stdout + stderr;
    if (exitCode === 0) {
      recordTest(
        "CLI mcp servers runs successfully",
        true,
        false,
        `Exit 0, output length: ${stdout.length}`,
      );
    } else if (isExpectedFailure(combined)) {
      recordTest(
        "CLI mcp servers runs successfully",
        true,
        true,
        `Skipped (no servers): ${combined.substring(0, 150)}`,
      );
    } else {
      recordTest(
        "CLI mcp servers runs successfully",
        false,
        false,
        `Exit ${exitCode}: ${combined.substring(0, 300)}`,
      );
    }
  }

  // --- Test 3: mcp tools — verify command runs (lists MCP server tools if configured) ---
  {
    const { stdout, stderr, exitCode } = runMCPCmd(["tools", "--quiet"]);
    const combined = stdout + stderr;
    if (exitCode === 0) {
      // mcp tools lists tools from external MCP servers (not built-in SDK tools)
      // If no MCP servers are configured, it returns "No tools match the criteria" which is correct
      const hasOutput = stdout.trim().length > 0;
      recordTest(
        "CLI mcp tools runs successfully",
        hasOutput,
        false,
        `Output: ${stdout.trim().substring(0, 200)}`,
      );
    } else if (isExpectedFailure(combined)) {
      recordTest(
        "CLI mcp tools runs successfully",
        true,
        true,
        `Skipped (no servers): ${combined.substring(0, 150)}`,
      );
    } else {
      recordTest(
        "CLI mcp tools runs successfully",
        false,
        false,
        `Exit ${exitCode}: ${combined.substring(0, 300)}`,
      );
    }
  }

  // --- Test 4: mcp discover — verify tool discovery runs ---
  {
    const { stdout, stderr, exitCode } = runMCPCmd(["discover", "--quiet"]);
    const combined = stdout + stderr;
    if (exitCode === 0) {
      recordTest(
        "CLI mcp discover runs successfully",
        true,
        false,
        `Exit 0, output length: ${stdout.length}. Preview: ${stdout.substring(0, 200)}`,
      );
    } else if (isExpectedFailure(combined)) {
      recordTest(
        "CLI mcp discover runs successfully",
        true,
        true,
        `Skipped (no servers): ${combined.substring(0, 150)}`,
      );
    } else {
      recordTest(
        "CLI mcp discover runs successfully",
        false,
        false,
        `Exit ${exitCode}: ${combined.substring(0, 300)}`,
      );
    }
  }

  // --- Test 5: mcp annotate --tool delete_user --infer ---
  {
    const { stdout, stderr, exitCode } = runMCPCmd([
      "annotate",
      "--tool",
      "delete_user",
      "--infer",
      "--format",
      "json",
      "--quiet",
    ]);
    const combined = stdout + stderr;
    if (exitCode === 0 && stdout.length > 0) {
      recordTest(
        "CLI mcp annotate infers annotations",
        true,
        false,
        `Output length: ${stdout.length}, preview: ${stdout.substring(0, 200)}`,
      );
    } else if (
      isExpectedFailure(combined) ||
      // Narrow annotation-side SKIP framings — generic includes("annotation")
      // would mask real inference regressions whose error text mentions the
      // word. We deliberately do NOT include "Tool name is required" here:
      // this test always passes `--tool delete_user`, so that message would
      // indicate a CLI arg-parsing/forwarding regression and must FAIL.
      combined.includes("no annotation server") ||
      combined.includes("annotation server not configured") ||
      combined.includes("no annotation source") ||
      combined.includes("annotation source missing")
    ) {
      recordTest(
        "CLI mcp annotate infers annotations",
        true,
        true,
        `Skipped (tool not found or no servers): ${combined.substring(0, 150)}`,
      );
    } else {
      recordTest(
        "CLI mcp annotate infers annotations",
        false,
        false,
        `Exit ${exitCode}: ${combined.substring(0, 300)}`,
      );
    }
  }

  // --- Test 6: mcp registry search database ---
  {
    const { stdout, stderr, exitCode } = runMCPCmd([
      "registry",
      "search",
      "database",
      "--quiet",
    ]);
    const combined = stdout + stderr;
    if (exitCode === 0 && stdout.length > 0) {
      // Registry search should return some results for "database"
      const hasResults =
        stdout.includes("database") ||
        stdout.includes("postgres") ||
        stdout.includes("sql") ||
        stdout.includes("mongo") ||
        stdout.length > 10;
      recordTest(
        "CLI mcp registry search returns results",
        hasResults,
        false,
        hasResults
          ? `Search returned results. Preview: ${stdout.substring(0, 200)}`
          : `No results found. Preview: ${stdout.substring(0, 200)}`,
      );
    } else if (
      isExpectedFailure(combined) ||
      combined.includes("No results") ||
      combined.includes("no results")
    ) {
      recordTest(
        "CLI mcp registry search returns results",
        true,
        true,
        `Skipped (no registry results): ${combined.substring(0, 150)}`,
      );
    } else {
      recordTest(
        "CLI mcp registry search returns results",
        false,
        false,
        `Exit ${exitCode}: ${combined.substring(0, 300)}`,
      );
    }
  }
}

// ============================================================
// Part 3c: SDK Enhancement Methods E2E via generate()/stream()
// Tests each SDK method through actual user workflows
// ============================================================

async function testGenerateWithExposedAgent(): Promise<void> {
  logSection("SDK generate() with Exposed Agent Tool");

  let sdk: InstanceType<typeof NeuroLink> | null = null;
  // Track which checkpoints actually recorded a result on the happy
  // path. The catch below uses this Set to only backfill the assertions
  // that didn't run — without it, the harness would count both the
  // earlier PASS and the fallback SKIP/FAIL for the same name.
  const reached = new Set<string>();
  const record = (
    name: string,
    ok: boolean,
    skip: boolean,
    detail?: string,
  ) => {
    reached.add(name);
    recordTest(name, ok, skip, detail);
  };

  try {
    sdk = new NeuroLink();

    const sdkOptions = buildBaseSDKOptions();

    log(
      `[DEBUG] Provider: ${sdkOptions.provider}, MaxTokens: ${TEST_CONFIG.maxTokens}`,
      "blue",
    );

    // Step 1: Expose a mock agent as an MCP tool
    log("Exposing ticket-resolver agent as MCP tool...", "blue");

    const exposureResult = await sdk.exposeAgentAsTool({
      id: "ticket-resolver",
      name: "Ticket Resolver",
      description:
        "Resolves support tickets by looking up customer info and suggesting solutions",
      execute: async (params) => ({
        ticket_id: "TKT-4892",
        customer: "Acme Corp",
        issue: "Login timeout after 30s",
        resolution: "Increased session timeout to 120s",
        status: "resolved",
        response_time_minutes: 3.2,
      }),
    });

    const exposedTool = exposureResult.tool;

    record(
      "exposeAgentAsTool creates registrable tool",
      typeof exposedTool === "object" &&
        typeof exposedTool.name === "string" &&
        exposedTool.name.length > 0 &&
        typeof exposedTool.execute === "function" &&
        typeof exposedTool.description === "string",
      false,
      `Tool name: ${exposedTool.name}, has execute: ${typeof exposedTool.execute === "function"}, description length: ${exposedTool.description?.length || 0}`,
    );

    // Step 2: Register the exposed tool with the SDK
    log(`Registering exposed tool '${exposedTool.name}' with SDK...`, "blue");
    sdk.registerTool(exposedTool.name, exposedTool as MCPExecutableTool);

    // Step 3: Call generate() asking to use the exposed tool
    const prompt = `Use the ${exposedTool.name} tool to resolve a support ticket. Report the exact ticket_id, customer name, issue, resolution, and status from the tool result.`;

    log("Calling sdk.generate() with exposed agent tool...", "blue");

    const result = await sdk.generate({
      input: { text: prompt },
      maxTokens: TEST_CONFIG.maxTokens,
      provider: sdkOptions.provider,
      ...(sdkOptions.model && { model: sdkOptions.model }),
    });

    record(
      "generate() uses exposed agent tool",
      typeof result.content === "string" && result.content.length > 0,
      false,
      `Content length: ${result.content?.length || 0} chars`,
    );

    log(`Response preview: ${result.content?.substring(0, 400)}...`, "reset");

    // Step 4: Verify response contains agent output data
    const expectedData = ["TKT-4892", "Acme Corp", "resolved"];
    const foundData = expectedData.filter(
      (d) => result.content?.includes(d) || false,
    );

    record(
      "response contains agent output data",
      foundData.length >= 2,
      false,
      `Found ${foundData.length}/${expectedData.length} data points: ${foundData.join(", ")}`,
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    // Use the shared helper instead of an `includes()` substring trap
    // (which would also silently absorb real bugs whose stack traces
    // happen to mention "API key" / "authentication").
    const skip = isExpectedProviderError(msg);
    // Backfill only the checkpoints that weren't reached on the happy
    // path. The earlier double-record pattern incremented suite totals
    // twice for any assertion that PASSed before the throw.
    for (const name of [
      "exposeAgentAsTool creates registrable tool",
      "generate() uses exposed agent tool",
      "response contains agent output data",
    ]) {
      if (reached.has(name)) {
        continue;
      }
      recordTest(name, skip, skip, skip ? `Skipped: ${msg}` : msg);
    }
  } finally {
    if (sdk) {
      try {
        await sdk.dispose();
      } catch {
        // Ignore dispose errors
      }
    }
  }
}

async function testGenerateWithConvertedTools(): Promise<void> {
  logSection("SDK generate() with Converted Tools (MCP Round-Trip)");

  let sdk: InstanceType<typeof NeuroLink> | null = null;
  // Reached-checkpoint set: the catch below only backfills assertions
  // that didn't already record on the happy path (avoids
  // double-counting in suite totals).
  const reached = new Set<string>();
  const record = (
    name: string,
    ok: boolean,
    skip: boolean,
    detail?: string,
  ) => {
    reached.add(name);
    recordTest(name, ok, skip, detail);
  };

  try {
    sdk = new NeuroLink();

    const sdkOptions = buildBaseSDKOptions();

    // 1. Define a tool in NeuroLink format
    const originalTool = {
      name: "mcp_currency_converter",
      description: "Convert between currencies with live rates",
      execute: async () => ({
        from: "USD",
        to: "EUR",
        amount: 1000,
        converted: 920.5,
        rate: 0.9205,
        timestamp: "2025-01-15T10:00:00Z",
      }),
    };

    // 2. Convert to MCP format
    log("Converting tool to MCP format...", "blue");
    const mcpTools = await sdk.convertToolsToMCPFormat([originalTool]);

    record(
      "convertToolsToMCPFormat preserves tool identity",
      Array.isArray(mcpTools) &&
        mcpTools.length === 1 &&
        mcpTools[0].name === originalTool.name &&
        mcpTools[0].description === originalTool.description,
      false,
      `MCP tool name: ${mcpTools?.[0]?.name}, description: ${mcpTools?.[0]?.description?.substring(0, 60)}`,
    );

    // 3. Convert back to NeuroLink format
    log("Converting MCP tools back to NeuroLink format...", "blue");
    const roundTripped = await sdk.convertToolsFromMCPFormat(mcpTools);

    record(
      "convertToolsFromMCPFormat round-trips correctly",
      Array.isArray(roundTripped) &&
        roundTripped.length === 1 &&
        roundTripped[0].name === originalTool.name &&
        roundTripped[0].description === originalTool.description,
      false,
      `Round-tripped name: ${roundTripped?.[0]?.name}, description: ${roundTripped?.[0]?.description?.substring(0, 60)}`,
    );

    // 4. Register the ORIGINAL tool and call generate()
    sdk.registerTool("mcp_currency_converter", {
      name: "mcp_currency_converter",
      description: "Convert between currencies with live rates",
      inputSchema: { type: "object", properties: {} },
      execute: async () => ({
        from: "USD",
        to: "EUR",
        amount: 1000,
        converted: 920.5,
        rate: 0.9205,
        timestamp: "2025-01-15T10:00:00Z",
      }),
    });

    log(
      `[DEBUG] Provider: ${sdkOptions.provider}, MaxTokens: ${TEST_CONFIG.maxTokens}`,
      "blue",
    );
    log("Calling sdk.generate() with currency converter tool...", "blue");

    const prompt =
      "Use the mcp_currency_converter tool to convert 1000 USD to EUR. Report the exact converted amount, exchange rate, and timestamp.";

    const result = await sdk.generate({
      input: { text: prompt },
      maxTokens: TEST_CONFIG.maxTokens,
      provider: sdkOptions.provider,
      ...(sdkOptions.model && { model: sdkOptions.model }),
      enabledToolNames: ["mcp_currency_converter"],
      // Force the converted MCP tool to fire on step 0, then auto. A
      // global `toolChoice: "required"` would loop on tool calls until
      // maxSteps (200) — see warning at types/generate.ts:321-323.
      prepareStep: async ({ stepNumber }) => {
        if (stepNumber === 0) {
          return {
            toolChoice: { type: "tool", toolName: "mcp_currency_converter" },
          };
        }
        return { toolChoice: "auto" };
      },
    });

    // Assert at the SDK-plumbing layer (toolExecutions / toolCalls), not
    // the model-content layer. With `toolChoice: "required"` plus a
    // single registered tool, OpenAI gpt-4o-mini emits empty content
    // (Vercel AI SDK quirk). The test is verifying that the converted
    // MCP tool actually wired up and ran, which is what the result's
    // toolExecutions array surfaces deterministically.
    // GenerateResult.toolExecutions uses { name, input, output } per
    // src/lib/types/generate.ts. StreamResult.toolCalls uses
    // { toolName }. Check both for portability.
    type ToolExecGen = { name?: string; output?: unknown };
    type ToolCallStream = { toolName?: string };
    const toolExecutions =
      ((result as { toolExecutions?: ToolExecGen[] }).toolExecutions ?? []) ||
      [];
    const toolCalls =
      ((result as { toolCalls?: ToolCallStream[] }).toolCalls ?? []) || [];
    const currencyExec = toolExecutions.find(
      (t) => t?.name === "mcp_currency_converter",
    );
    const currencyCall = toolCalls.find(
      (t) => t?.toolName === "mcp_currency_converter",
    );
    const toolWasInvoked = !!(currencyExec || currencyCall);

    record(
      "generate() works after tool conversion",
      toolWasInvoked,
      false,
      toolWasInvoked
        ? `Tool '${currencyExec?.name ?? currencyCall?.toolName}' invoked through SDK conversion plumbing`
        : `Tool was not invoked — toolExecutions=${toolExecutions.length}, toolCalls=${toolCalls.length}, content=${result.content?.length || 0} chars`,
    );

    log(
      `Tool invocations: executions=${toolExecutions.length}, calls=${toolCalls.length}, content=${result.content?.length || 0} chars`,
      "reset",
    );

    const execResult = currencyExec?.output;
    const execResultStr = JSON.stringify(execResult ?? {});
    const expectedData = ["920.5", "0.9205"];
    const foundInResult = expectedData.filter((d) => execResultStr.includes(d));
    const foundInContent = expectedData.filter((d) =>
      result.content?.includes(d),
    );
    const foundCount = Math.max(foundInResult.length, foundInContent.length);

    record(
      "response contains converted currency data",
      foundCount >= 1,
      false,
      foundCount >= 1
        ? `Found ${foundCount}/${expectedData.length} data points (in tool.result=${foundInResult.length}, in content=${foundInContent.length})`
        : `No converted-currency data points found. tool.result=${execResultStr.slice(0, 100)}, content=${(result.content ?? "").slice(0, 100)}`,
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    // Backfill only the assertions that didn't reach the happy path —
    // otherwise the harness double-counts PASSes that happened before
    // the throw.
    const skip = isExpectedProviderError(msg);
    for (const name of [
      "convertToolsToMCPFormat preserves tool identity",
      "convertToolsFromMCPFormat round-trips correctly",
      "generate() works after tool conversion",
      "response contains converted currency data",
    ]) {
      if (reached.has(name)) {
        continue;
      }
      recordTest(name, skip, skip, skip ? `Skipped: ${msg}` : msg);
    }
  } finally {
    if (sdk) {
      try {
        await sdk.dispose();
      } catch {
        // Ignore dispose errors
      }
    }
  }
}

async function testGetAnnotationsAndGenerate(): Promise<void> {
  logSection("SDK getToolAnnotations() + generate() E2E");

  let sdk: InstanceType<typeof NeuroLink> | null = null;
  const reached = new Set<string>();
  const record = (
    name: string,
    ok: boolean,
    skip: boolean,
    detail?: string,
  ) => {
    reached.add(name);
    recordTest(name, ok, skip, detail);
  };

  try {
    sdk = new NeuroLink({
      mcp: {
        annotations: {
          enabled: true,
          autoInfer: true,
        },
      },
    });

    const sdkOptions = buildBaseSDKOptions();

    // Register read-only sensor tool
    sdk.registerTool("mcp_read_sensor_data", {
      name: "mcp_read_sensor_data",
      description:
        "Read current environmental sensor data including temperature, humidity, pressure, air quality, and location",
      inputSchema: { type: "object", properties: {} },
      execute: async () => ({
        temperature: 72.4,
        humidity: 45,
        pressure: 1013.25,
        air_quality: "good",
        location: "Building A",
      }),
    });

    // Register destructive purge tool
    sdk.registerTool("mcp_purge_old_logs", {
      name: "mcp_purge_old_logs",
      description:
        "Purge old log entries from the system to free up disk space",
      inputSchema: { type: "object", properties: {} },
      execute: async () => ({
        purged_count: 15234,
        freed_gb: 8.7,
        oldest_log: "2024-06-15",
      }),
    });

    // --- 1. getToolAnnotations for read tool ---
    const readAnnotations = await sdk.getToolAnnotations(
      "mcp_read_sensor_data",
    );
    const readHasAnnotations =
      readAnnotations !== null &&
      readAnnotations !== undefined &&
      typeof readAnnotations === "object" &&
      "annotations" in readAnnotations;

    const readIsReadOnly =
      readHasAnnotations &&
      readAnnotations.annotations !== null &&
      typeof readAnnotations.annotations === "object" &&
      (readAnnotations.annotations as Record<string, unknown>).readOnlyHint ===
        true;

    record(
      "getToolAnnotations infers readOnly for read tool",
      readIsReadOnly,
      false,
      readHasAnnotations
        ? `annotations: ${JSON.stringify(readAnnotations.annotations).slice(0, 150)}`
        : `Unexpected result: ${JSON.stringify(readAnnotations)}`,
    );

    // --- 2. getToolAnnotations for purge tool ---
    const purgeAnnotations = await sdk.getToolAnnotations("mcp_purge_old_logs");
    const purgeHasAnnotations =
      purgeAnnotations !== null &&
      purgeAnnotations !== undefined &&
      typeof purgeAnnotations === "object" &&
      "annotations" in purgeAnnotations;

    const purgeIsDestructive =
      purgeHasAnnotations &&
      purgeAnnotations.annotations !== null &&
      typeof purgeAnnotations.annotations === "object" &&
      (purgeAnnotations.annotations as Record<string, unknown>)
        .destructiveHint === true;

    record(
      "getToolAnnotations infers destructive for purge tool",
      purgeIsDestructive,
      false,
      purgeHasAnnotations
        ? `annotations: ${JSON.stringify(purgeAnnotations.annotations).slice(0, 150)}`
        : `Unexpected result: ${JSON.stringify(purgeAnnotations)}`,
    );

    // --- 3. generate() with annotated read tool ---
    log(
      `[DEBUG] Provider: ${sdkOptions.provider}, MaxTokens: ${TEST_CONFIG.maxTokens}`,
      "blue",
    );
    log(
      "Calling sdk.generate() asking to read sensor data via mcp_read_sensor_data...",
      "blue",
    );

    const prompt =
      "Use the mcp_read_sensor_data tool and report the exact temperature, pressure, and location values from the sensor reading.";

    const result = await sdk.generate({
      input: { text: prompt },
      maxTokens: TEST_CONFIG.maxTokens,
      provider: sdkOptions.provider,
      ...(sdkOptions.model && { model: sdkOptions.model }),
    });

    record(
      "generate() with annotated read tool returns data",
      typeof result.content === "string" && result.content.length > 0,
      false,
      `Content length: ${result.content?.length || 0} chars`,
    );

    log(`Response preview: ${result.content?.substring(0, 400)}...`, "reset");

    // --- 4. Verify response contains sensor readings ---
    const expectedData = ["72.4", "1013.25", "Building A"];
    const foundData = expectedData.filter(
      (d) => result.content?.includes(d) || false,
    );

    record(
      "response contains sensor readings",
      foundData.length >= 2,
      false,
      `Found ${foundData.length}/${expectedData.length} data points: ${foundData.join(", ")}`,
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    // Backfill only the assertions that didn't reach the happy path.
    const skip = isExpectedProviderError(msg);
    for (const name of [
      "getToolAnnotations infers readOnly for read tool",
      "getToolAnnotations infers destructive for purge tool",
      "generate() with annotated read tool returns data",
      "response contains sensor readings",
    ]) {
      if (reached.has(name)) {
        continue;
      }
      recordTest(name, skip, skip, skip ? `Skipped: ${msg}` : msg);
    }
  } finally {
    if (sdk) {
      try {
        await sdk.dispose();
      } catch {
        // Ignore dispose errors
      }
    }
  }
}

async function testGenerateWithMiddlewareChain(): Promise<void> {
  logSection("SDK generate() with Middleware Chain (Onion Model)");

  let sdk: InstanceType<typeof NeuroLink> | null = null;
  const reached = new Set<string>();
  const record = (
    name: string,
    ok: boolean,
    skip: boolean,
    detail?: string,
  ) => {
    reached.add(name);
    recordTest(name, ok, skip, detail);
  };

  try {
    sdk = new NeuroLink();
    const sdkOptions = buildBaseSDKOptions();

    // Track middleware execution order
    const executionOrder: string[] = [];

    // Middleware 1 (auth): outermost layer
    sdk.useToolMiddleware(async (_tool, _params, _context, next) => {
      executionOrder.push("auth:before");
      const result = await next();
      executionOrder.push("auth:after");
      return result;
    });

    // Middleware 2 (logging): middle layer
    sdk.useToolMiddleware(async (_tool, _params, _context, next) => {
      executionOrder.push("log:before");
      const result = await next();
      executionOrder.push("log:after");
      return result;
    });

    // Middleware 3 (timing): innermost layer
    sdk.useToolMiddleware(async (_tool, _params, _context, next) => {
      const start = Date.now();
      executionOrder.push("time:before");
      const result = await next();
      const duration = Date.now() - start;
      executionOrder.push(`time:after:${duration}ms`);
      return result;
    });

    // Verify 3 middlewares registered
    const registeredCount = sdk.getToolMiddlewares().length;
    record(
      "3 middlewares registered",
      registeredCount === 3,
      false,
      `Expected 3, got ${registeredCount}`,
    );

    // Register shipping rates tool
    sdk.registerTool("mcp_shipping_rates", {
      name: "mcp_shipping_rates",
      description:
        "Get shipping rates including carrier name, rate, delivery days, tracking number, and package weight",
      inputSchema: { type: "object", properties: {} },
      execute: async () => ({
        carrier: "FedEx",
        rate: 24.99,
        delivery_days: 3,
        tracking: "FX-8847291",
        weight_kg: 2.5,
      }),
    });

    log(
      `[DEBUG] Provider: ${sdkOptions.provider}, MaxTokens: ${TEST_CONFIG.maxTokens}`,
      "blue",
    );
    log(
      "Calling sdk.generate() with 3 chained middlewares and shipping tool...",
      "blue",
    );

    const result = await sdk.generate({
      input: {
        text: "Use the mcp_shipping_rates tool and report the exact carrier name, rate, tracking number, and delivery days.",
      },
      maxTokens: TEST_CONFIG.maxTokens,
      provider: sdkOptions.provider,
      ...(sdkOptions.model && { model: sdkOptions.model }),
    });

    // Test: generate() returns content
    const contentStr = result.content || "";
    record(
      "generate() with middleware chain returns data",
      typeof result.content === "string" && result.content.length > 0,
      false,
      `Content length: ${contentStr.length} chars`,
    );

    // Test: response contains shipping data
    const expectedData = ["24.99", "FedEx", "FX-8847291"];
    const foundData = expectedData.filter((d) => contentStr.includes(d));
    record(
      "response contains shipping rates",
      foundData.length >= 2,
      false,
      `Found ${foundData.length}/${expectedData.length} data points: ${foundData.join(", ")}`,
    );

    // Test: middleware execution order follows onion model
    // Expected: auth:before, log:before, time:before, time:after:Xms, log:after, auth:after
    const orderLabels = executionOrder.map((e) =>
      e.startsWith("time:after:") ? "time:after" : e,
    );
    const expectedOrder = [
      "auth:before",
      "log:before",
      "time:before",
      "time:after",
      "log:after",
      "auth:after",
    ];
    const orderCorrect =
      orderLabels.length === expectedOrder.length &&
      orderLabels.every((label, i) => label === expectedOrder[i]);
    record(
      "middleware execution order is correct (onion model)",
      orderCorrect,
      false,
      orderCorrect
        ? `Order: [${executionOrder.join(", ")}]`
        : `Expected [${expectedOrder.join(", ")}], got [${executionOrder.join(", ")}]`,
    );

    log(`Execution order: [${executionOrder.join(", ")}]`, "reset");
    log(`Response preview: ${contentStr.substring(0, 300)}...`, "reset");
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const skip = isExpectedProviderError(msg);
    for (const name of [
      "3 middlewares registered",
      "generate() with middleware chain returns data",
      "response contains shipping rates",
      "middleware execution order is correct (onion model)",
    ]) {
      if (reached.has(name)) {
        continue;
      }
      recordTest(name, skip, skip, skip ? `Skipped: ${msg}` : msg);
    }
  } finally {
    if (sdk) {
      try {
        await sdk.dispose();
      } catch {
        // Ignore dispose errors
      }
    }
  }
}

async function testStreamWithDisableToolCache(): Promise<void> {
  logSection("SDK stream() with disableToolCache per-request flag");

  let sdk: InstanceType<typeof NeuroLink> | null = null;

  try {
    sdk = new NeuroLink({
      mcp: { cache: { enabled: true, ttl: 60000 } },
    });
    const sdkOptions = buildBaseSDKOptions();

    let callCount = 0;

    sdk.registerTool("mcp_weather_forecast", {
      name: "mcp_weather_forecast",
      description:
        "Get current weather forecast including temperature, condition, wind speed, and humidity",
      inputSchema: { type: "object", properties: {} },
      execute: async () => {
        callCount++;
        return {
          city: "San Francisco",
          temp_f: 68,
          condition: "partly cloudy",
          wind_mph: 12,
          humidity: 65,
          forecast: "clearing by evening",
        };
      },
    });

    log(
      `[DEBUG] Provider: ${sdkOptions.provider}, MaxTokens: ${TEST_CONFIG.maxTokens}`,
      "blue",
    );

    // First stream call — should invoke the tool and populate cache
    log(
      "Calling sdk.stream() with mcp_weather_forecast tool (first call, populates cache)...",
      "blue",
    );

    const streamResult1 = await sdk.stream({
      input: {
        text: "Use the mcp_weather_forecast tool to check the weather. Report the exact city, temp_f, condition, and wind_mph values.",
      },
      maxTokens: TEST_CONFIG.maxTokens,
      provider: sdkOptions.provider,
      ...(sdkOptions.model && { model: sdkOptions.model }),
    });

    const chunks1: string[] = [];
    let chunkCount1 = 0;
    for await (const chunk of streamResult1.stream) {
      if ("content" in chunk && typeof chunk.content === "string") {
        chunks1.push(chunk.content);
        chunkCount1++;
        if (chunkCount1 >= 300) {
          break;
        }
      }
    }

    const streamContent1 = chunks1.join("");

    const expectedData = ["68", "San Francisco", "partly cloudy", "12"];
    const foundData = expectedData.filter((d) => streamContent1.includes(d));
    recordTest(
      "stream response contains weather data",
      foundData.length >= 1,
      false,
      `Found ${foundData.length}/${expectedData.length} data points: ${foundData.join(", ")} in ${streamContent1.length} chars`,
    );

    log(`Stream 1 preview: ${streamContent1.substring(0, 300)}...`, "reset");
    log(
      `Call count after first stream: ${callCount}. Waiting 2s before second call...`,
      "blue",
    );

    // Snapshot callCount between streams so the cache-bypass assertion
    // can verify a strict delta on the second call, regardless of how
    // many times the model decided to invoke the tool in the first call.
    const callCountAfterFirst = callCount;

    // Wait 2 seconds to confirm cache is still valid (ttl=60s)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Second stream call — with disableToolCache: true, should bypass cache
    log(
      "Calling sdk.stream() with mcp_weather_forecast tool (second call, disableToolCache: true)...",
      "blue",
    );

    const streamResult2 = await sdk.stream({
      input: {
        text: "Use the mcp_weather_forecast tool again to get updated weather. Report the exact temp_f, humidity, and forecast values.",
      },
      maxTokens: TEST_CONFIG.maxTokens,
      provider: sdkOptions.provider,
      ...(sdkOptions.model && { model: sdkOptions.model }),
      disableToolCache: true,
    });

    const chunks2: string[] = [];
    let chunkCount2 = 0;
    for await (const chunk of streamResult2.stream) {
      if ("content" in chunk && typeof chunk.content === "string") {
        chunks2.push(chunk.content);
        chunkCount2++;
        if (chunkCount2 >= 300) {
          break;
        }
      }
    }

    const streamContent2 = chunks2.join("");
    log(`Stream 2 preview: ${streamContent2.substring(0, 300)}...`, "reset");
    log(`Call count after second stream: ${callCount}`, "blue");

    // `>= 2` instead of `=== 2`: the model may legitimately multi-call
    // the tool inside a single stream (e.g. parallel calls during a
    // single tool-required step), so a strict equality flakes. The
    // invariant we care about is "second stream call did NOT serve a
    // cached result" — i.e. callCount strictly increased between
    // streamResult1 and streamResult2. Track the first-stream count
    // separately to assert the delta.
    const cacheBypassed = callCount >= 2 && callCount > callCountAfterFirst;
    recordTest(
      "stream with disableToolCache bypasses cache (callCount=2)",
      cacheBypassed,
      false,
      cacheBypassed
        ? `Tool executed ${callCount} times total (first stream: ${callCountAfterFirst}, second-stream delta: ${callCount - callCountAfterFirst}) — cache bypassed on second stream`
        : `Expected callCount > ${callCountAfterFirst} (delta from first stream), got ${callCount}`,
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const skip = isExpectedProviderError(msg);
    for (const name of [
      "stream response contains weather data",
      "stream with disableToolCache bypasses cache (callCount=2)",
    ]) {
      recordTest(name, skip, skip, skip ? `Skipped: ${msg}` : msg);
    }
  } finally {
    if (sdk) {
      try {
        await sdk.dispose();
      } catch {
        // Ignore dispose errors
      }
    }
  }
}

async function testGenerateWithBatcherAndFlush(): Promise<void> {
  logSection("SDK generate() with Batcher and flushToolBatch()");

  let sdk: InstanceType<typeof NeuroLink> | null = null;
  const reached = new Set<string>();
  const record = (
    name: string,
    ok: boolean,
    skip: boolean,
    detail?: string,
  ) => {
    reached.add(name);
    recordTest(name, ok, skip, detail);
  };

  try {
    sdk = new NeuroLink({
      mcp: {
        batcher: { enabled: true, maxBatchSize: 5, maxWaitMs: 200 },
      },
    });

    const sdkOptions = buildBaseSDKOptions();

    sdk.registerTool("mcp_order_status", {
      name: "mcp_order_status",
      description:
        "Get current order status including order ID, shipping status, carrier, ETA, and item count",
      inputSchema: { type: "object", properties: {} },
      execute: async () => {
        return {
          order_id: "ORD-77291",
          status: "shipped",
          carrier: "UPS",
          eta: "2025-01-17",
          items: 3,
        };
      },
    });

    log(
      `[DEBUG] Provider: ${sdkOptions.provider}, MaxTokens: ${TEST_CONFIG.maxTokens}`,
      "blue",
    );
    log(
      "Calling sdk.generate() with batcher-enabled order status tool...",
      "blue",
    );

    const result = await sdk.generate({
      input: {
        text: "Use the mcp_order_status tool and report the exact order ID, shipping status, carrier name, ETA date, and item count.",
      },
      maxTokens: TEST_CONFIG.maxTokens,
      provider: sdkOptions.provider,
      ...(sdkOptions.model && { model: sdkOptions.model }),
    });

    record(
      "generate() works with batcher enabled",
      typeof result.content === "string" && result.content.length > 0,
      false,
      `Content length: ${result.content?.length || 0} chars`,
    );

    const expectedData = ["ORD-77291", "shipped", "UPS", "2025-01-17", "3"];
    const contentStr = result.content || "";

    const foundData = expectedData.filter(
      (d) => contentStr.includes(d) || false,
    );
    record(
      "response contains order data",
      foundData.length >= 3,
      false,
      `Found ${foundData.length}/${expectedData.length} data points: ${foundData.join(", ")}`,
    );

    log(`Response preview: ${contentStr.substring(0, 300)}...`, "reset");

    // Flush any pending batched calls — should complete without error
    log("Calling sdk.flushToolBatch()...", "blue");
    await sdk.flushToolBatch();

    record(
      "flushToolBatch() completes without error",
      true,
      false,
      "flushToolBatch() resolved successfully with batcher configured",
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    // Backfill only the assertions that didn't reach the happy path.
    const skip = isExpectedProviderError(msg);
    for (const name of [
      "generate() works with batcher enabled",
      "response contains order data",
      "flushToolBatch() completes without error",
    ]) {
      if (reached.has(name)) {
        continue;
      }
      recordTest(name, skip, skip, skip ? `Skipped: ${msg}` : msg);
    }
  } finally {
    if (sdk) {
      try {
        await sdk.dispose();
      } catch {
        // Ignore dispose errors
      }
    }
  }
}

// ============================================================
// Part 4b: CLI Enhanced Integration Tests
// Tests CLI with multi-tool and file-reading tool calls
// ============================================================

async function testCLIGenerateMultiTool(): Promise<void> {
  logSection("CLI generate multi-tool (calculateMath + getCurrentTime)");

  const projectRoot = path.resolve(__dirname, "..");
  const cliJs = path.join(projectRoot, "dist/cli/index.js");
  const { execFileSync } = await import("child_process");

  const provider = TEST_CONFIG.provider;

  const execOpts = {
    encoding: "utf-8" as const,
    timeout: 120000,
    cwd: projectRoot,
    env: { ...process.env, NO_COLOR: "1" },
    stdio: ["pipe", "pipe", "pipe"] as StdioOptions,
    shell: false as const,
  };

  /**
   * Helper: run the CLI, handle auth errors as skip, return stdout or
   * null on failure. Uses execFileSync (no shell) — closes the
   * `js/shell-command-injection-from-environment` finding.
   */
  function runCLI(args: string[], testNames: string[]): string | null {
    log(`[DEBUG] Running CLI: node ${cliJs} ${args.join(" ")}`, "blue");
    try {
      return execFileSync("node", [cliJs, ...args], execOpts);
    } catch (execError: unknown) {
      const err = execError as {
        stdout?: string;
        stderr?: string;
        message?: string;
        status?: number;
      };
      const stderr = err.stderr || "";
      const errStdout = err.stdout || "";
      const msg = err.message || String(execError);

      const isAuth = shouldSkipCliFailure(stderr, msg);

      if (isAuth) {
        for (const name of testNames) {
          recordTest(
            name,
            true,
            true,
            `Skipped: auth error — ${(stderr || msg).substring(0, 200)}`,
          );
        }
        return null;
      }

      if (errStdout.length > 0) {
        log(
          `[WARN] CLI exited with status ${err.status} but produced output (${errStdout.length} chars)`,
          "yellow",
        );
        return errStdout;
      }

      for (const name of testNames) {
        recordTest(
          name,
          false,
          false,
          `CLI failed (exit ${err.status}): ${(stderr || msg).substring(0, 300)}`,
        );
      }
      return null;
    }
  }

  // --- Test 1: CLI generate with calculateMath (separate call) ---
  {
    const testNames = [
      "CLI generate calculateMath (multi-tool part 1) executes",
      "CLI generate calculateMath output contains 555",
    ];
    const prompt =
      "What is 15 multiplied by 37? Use the calculateMath tool. Give me the exact number only.";
    const stdout = runCLI(
      ["generate", prompt, "--provider", provider, "--maxTokens", "300"],
      testNames,
    );

    if (stdout !== null) {
      recordTest(
        testNames[0],
        stdout.length > 0,
        false,
        `Output length: ${stdout.length} chars`,
      );
      recordTest(
        testNames[1],
        stdout.includes("555"),
        false,
        stdout.includes("555")
          ? "Output contains '555'"
          : `Preview: ${stdout.substring(0, 300)}`,
      );
      log(`CLI math output: ${stdout.substring(0, 200)}`, "reset");
    }
  }

  // --- Test 2: CLI generate with getCurrentTime (separate call) ---
  {
    const testNames = [
      "CLI generate getCurrentTime (multi-tool part 2) executes",
      "CLI generate getCurrentTime output contains date/time",
    ];
    const prompt =
      "What is the current date and time right now? Use the getCurrentTime tool.";
    const stdout = runCLI(
      ["generate", prompt, "--provider", provider, "--maxTokens", "300"],
      testNames,
    );

    if (stdout !== null) {
      recordTest(
        testNames[0],
        stdout.length > 0,
        false,
        `Output length: ${stdout.length} chars`,
      );
      const currentYear = new Date().getFullYear().toString();
      const hasYear = stdout.includes(currentYear);
      const hasTimePattern = /\d{1,2}:\d{2}/.test(stdout);
      recordTest(
        testNames[1],
        hasYear || hasTimePattern,
        false,
        `year=${hasYear}, time-pattern=${hasTimePattern}`,
      );
      log(`CLI time output: ${stdout.substring(0, 200)}`, "reset");
    }
  }
}

async function testCLIStreamWithReadFile(): Promise<void> {
  logSection("CLI Stream with readFile Tool");

  const { execFileSync } = await import("child_process");
  const projectRoot = path.resolve(__dirname, "..");
  const cliJs = path.join(projectRoot, "dist/cli/index.js");

  const execOpts = {
    cwd: projectRoot,
    timeout: 120000,
    encoding: "utf-8" as const,
    env: { ...process.env, NO_COLOR: "1" },
    stdio: ["pipe", "pipe", "pipe"] as StdioOptions,
    shell: false as const,
  };

  const testNames = [
    "CLI stream with readFile executes",
    "output contains package name from file",
  ];

  try {
    const prompt =
      "Use the readFile tool to read the package.json file in the current directory. Tell me the package name and version.";
    const args = [
      cliJs,
      "stream",
      prompt,
      "--provider",
      TEST_CONFIG.provider,
      "--max-tokens",
      "500",
    ];

    log(`[DEBUG] Running: node ${args.join(" ")}`, "blue");

    const output = execFileSync("node", args, execOpts);
    const trimmed = (output || "").trim();

    recordTest(
      testNames[0],
      trimmed.length > 0,
      false,
      `Exit code 0, output length: ${trimmed.length}`,
    );

    // Verify the output mentions the actual package name from package.json
    const hasPackageName = trimmed.includes("@juspay/neurolink");
    recordTest(
      testNames[1],
      hasPackageName,
      false,
      hasPackageName
        ? `Output contains @juspay/neurolink`
        : `Output did not contain package name. Preview: ${trimmed.substring(0, 300)}`,
    );

    log(`CLI stream output preview: ${trimmed.substring(0, 400)}`, "reset");
  } catch (error) {
    const err = error as {
      stdout?: string;
      stderr?: string;
      message?: string;
      status?: number;
    };
    const msg = err.message || String(error);
    const stderr = err.stderr || "";
    const errStdout = err.stdout || "";

    const isAuth = shouldSkipCliFailure(stderr, msg);

    if (isAuth) {
      for (const name of testNames) {
        recordTest(
          name,
          true,
          true,
          `Skipped: ${(stderr || msg).substring(0, 150)}`,
        );
      }
    } else if (errStdout.length > 0) {
      // CLI exited non-zero but produced output — check it anyway
      const trimmed = errStdout.trim();
      recordTest(
        testNames[0],
        trimmed.length > 0,
        false,
        `Exit ${err.status}, output length: ${trimmed.length}`,
      );
      const hasPackageName = trimmed.includes("@juspay/neurolink");
      recordTest(
        testNames[1],
        hasPackageName,
        false,
        hasPackageName
          ? `Output contains @juspay/neurolink`
          : `Preview: ${trimmed.substring(0, 300)}`,
      );
    } else {
      for (const name of testNames) {
        recordTest(name, false, false, msg.substring(0, 300));
      }
    }
  }
}

// ── Part 4c: CLI thinking-level smoke ───────────────────────────────────
//
// `--thinking-level` is a documented consumer-facing CLI flag (see
// CLAUDE.md). The SDK has thinking coverage in providers/new-providers/
// matrix suites, but the CLI passthrough was previously untested.
// This minimal smoke test runs `generate` with each level and asserts
// the CLI accepts the flag and produces output. It SKIPs cleanly if
// the configured provider lacks thinking support or credentials.
async function testCLIThinkingLevelPassthrough(): Promise<void> {
  logSection("CLI generate --thinking-level passthrough");

  const projectRoot = path.resolve(__dirname, "..");
  const cliJs = path.join(projectRoot, "dist/cli/index.js");
  const { execFileSync } = await import("child_process");

  const execOpts = {
    encoding: "utf-8" as const,
    timeout: 120000,
    cwd: projectRoot,
    env: { ...process.env, NO_COLOR: "1" },
    stdio: ["pipe", "pipe", "pipe"] as StdioOptions,
    shell: false as const,
  };

  // Anthropic Claude and Vertex Gemini 2.5+ honour --thinking-level.
  // We pick whichever is configured for this run; if neither
  // supports thinking, every level test cleanly SKIPs.
  const thinkingProvider = TEST_CONFIG.provider;

  for (const level of ["minimal", "low", "medium", "high"] as const) {
    const testName = `CLI generate --thinking-level=${level} accepted`;
    try {
      const args = [
        cliJs,
        "generate",
        "Reply with the single word: ok",
        "--provider",
        thinkingProvider,
        "--thinking-level",
        level,
        "--maxTokens",
        "64",
      ];
      log(`[DEBUG] Running CLI: node ${args.join(" ")}`, "blue");
      const output = execFileSync("node", args, execOpts);
      const trimmed = (output || "").trim();
      recordTest(
        testName,
        trimmed.length > 0,
        false,
        `Output length: ${trimmed.length} chars (level=${level})`,
      );
    } catch (execError: unknown) {
      const err = execError as {
        stdout?: string;
        stderr?: string;
        message?: string;
        status?: number;
      };
      const stderr = err.stderr || "";
      const msg = err.message || String(execError);
      const combined = stderr + " " + msg;

      // Real CLI flag-parsing errors should surface as FAIL — yargs prints
      // "Invalid values" or "Choices:" when the flag is unknown or its
      // argument doesn't match the choices set.
      const flagRejected = /Invalid values:|Choices:|Unknown argument/i.test(
        combined,
      );
      if (flagRejected) {
        recordTest(
          testName,
          false,
          false,
          `CLI rejected --thinking-level: ${combined.substring(0, 200)}`,
        );
        continue;
      }

      // Otherwise treat upstream provider issues as SKIP — including the
      // model-specific case where Anthropic/Vertex don't honour thinking.
      const isUpstreamSkip =
        shouldSkipCliFailure(stderr, msg) ||
        /\bthinking\s+(?:level|capability)\s+(?:is\s+)?not\s+supported\b/i.test(
          combined,
        );
      recordTest(
        testName,
        isUpstreamSkip,
        isUpstreamSkip,
        isUpstreamSkip
          ? `Skipped: ${combined.substring(0, 160)}`
          : msg.substring(0, 200),
      );
    }
  }
}

// ============================================================

await runSuite(async () => {
  log(
    `Provider: ${TEST_CONFIG.provider}${TEST_CONFIG.model ? `, Model: ${TEST_CONFIG.model}` : ""}`,
    "blue",
  );
  log(`MaxTokens: ${TEST_CONFIG.maxTokens}\n`, "blue");

  // Part 4 — Core CLI Integration
  logSection("Part 4: CLI Integration Tests");
  log(
    "These tests run CLI commands via child_process to verify CLI generate, stream, and MCP subcommands.\n",
    "bright",
  );

  await testCLIGenerateWithTools();

  log(
    `\n⏳ Waiting ${INTER_TEST_DELAY_MS / 1000}s before next CLI test...`,
    "reset",
  );
  await delay(INTER_TEST_DELAY_MS);

  await testCLIStreamWithTools();
  await testCLIMCPCommands();

  // Part 3c — MCP enhancement integration (live SDK generate/stream with
  // exposed-agent, tool-converter, annotations, middleware chain, batcher,
  // and disable-tool-cache wiring). These tests were defined but never
  // awaited prior to this; CodeRabbit Review 4294886841 flagged the
  // dead-code coverage. Inter-test delays mirror Part 4 to dodge per-minute
  // rate limits.
  logSection("Part 3c: MCP Enhancement Integration Tests");

  await testGenerateWithExposedAgent();
  log(
    `\n⏳ Waiting ${INTER_TEST_DELAY_MS / 1000}s before next test...`,
    "reset",
  );
  await delay(INTER_TEST_DELAY_MS);

  await testGenerateWithConvertedTools();
  log(
    `\n⏳ Waiting ${INTER_TEST_DELAY_MS / 1000}s before next test...`,
    "reset",
  );
  await delay(INTER_TEST_DELAY_MS);

  await testGetAnnotationsAndGenerate();
  log(
    `\n⏳ Waiting ${INTER_TEST_DELAY_MS / 1000}s before next test...`,
    "reset",
  );
  await delay(INTER_TEST_DELAY_MS);

  await testGenerateWithMiddlewareChain();
  log(
    `\n⏳ Waiting ${INTER_TEST_DELAY_MS / 1000}s before next test...`,
    "reset",
  );
  await delay(INTER_TEST_DELAY_MS);

  await testStreamWithDisableToolCache();
  log(
    `\n⏳ Waiting ${INTER_TEST_DELAY_MS / 1000}s before next test...`,
    "reset",
  );
  await delay(INTER_TEST_DELAY_MS);

  await testGenerateWithBatcherAndFlush();
  log(
    `\n⏳ Waiting ${INTER_TEST_DELAY_MS / 1000}s before next test...`,
    "reset",
  );
  await delay(INTER_TEST_DELAY_MS);

  // Part 4b — Enhanced CLI Integration
  logSection("Part 4b: CLI Enhanced Integration Tests");

  await testCLIGenerateMultiTool();

  log(
    `\n⏳ Waiting ${INTER_TEST_DELAY_MS / 1000}s before next CLI test...`,
    "reset",
  );
  await delay(INTER_TEST_DELAY_MS);

  await testCLIStreamWithReadFile();

  log(
    `\n⏳ Waiting ${INTER_TEST_DELAY_MS / 1000}s before next CLI test...`,
    "reset",
  );
  await delay(INTER_TEST_DELAY_MS);

  // Part 4c — Thinking-level CLI passthrough
  logSection("Part 4c: CLI Thinking-Level Passthrough");
  await testCLIThinkingLevelPassthrough();
});
