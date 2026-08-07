#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — MCP bashTool / executeBashCommand
 *
 * 13 tests covering bash command execution via the dist `bashTool`
 * export: basic exec, pipes/shell, variable expansion, invalid commands,
 * CWD security, non-existent CWD rejection, timeout enforcement,
 * non-zero exit codes, large-output truncation, never-throws contract,
 * timeout capping, shell redirects.
 *
 * No live AI; pure subprocess + dist artifact tests.
 *
 * Run: pnpm run build && npx tsx test/continuous-test-suite-mcp-bash.ts
 *      pnpm run test:mcp:bash
 *
 * Originally lived as Part 5 inside continuous-test-suite-mcp.ts. Split
 * out in May 2026 because it shares no module-level state with the rest
 * of mcp.ts (no provider, no SDK, no spans, no MCP server).
 */

import { bashTool } from "../dist/lib/agent/directTools.js";
import type { BashToolResult } from "../dist/index.js";
import { defineSuite, logSection, Skip } from "./helpers/harness.js";

import { assertDistFresh } from "./helpers/distFreshness.js";

// Fail loudly rather than silently testing a stale build (see distFreshness.ts).
assertDistFresh();

const { recordTest, runSuite } = defineSuite("MCP bashTool");

async function testExecuteBashCommand(): Promise<void> {
  // The bashTool tests hardcode POSIX semantics (`ls`, `wc`, `$PWD`,
  // `/tmp`, `2>&1`, /bin/sh). The unit lane (`test:unit`) runs on every
  // commit, including Windows CI runners — without this gate the entire
  // suite would fail for the environment, not for any actual bashTool
  // regression. Skip cleanly when no POSIX shell is available.
  if (process.platform === "win32") {
    throw new Skip(
      "bashTool suite requires a POSIX shell (process.platform === 'win32')",
    );
  }

  logSection("executeBashCommand (bashTool) Tests");

  const executeContext = {
    toolCallId: "cts-bash",
    messages: [] as never[],
    abortSignal: undefined as never,
  };

  // Test 1: Basic command execution
  try {
    const result = (await bashTool.execute(
      { command: "echo hello", timeout: 30000 },
      executeContext,
    )) as BashToolResult;
    recordTest(
      "bashTool: basic command execution (echo hello)",
      result.success === true &&
        result.code === 0 &&
        result.stdout.trim() === "hello" &&
        result.stderr === "",
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    recordTest("bashTool: basic command execution", false, false, msg);
  }

  // Test 2: Pipes and shell syntax
  try {
    const result = (await bashTool.execute(
      { command: "echo foo bar | wc -w", timeout: 30000 },
      executeContext,
    )) as BashToolResult;
    const wordCount = result.stdout.trim();
    recordTest(
      "bashTool: pipes and shell syntax (echo | wc -w)",
      result.success === true && (wordCount === "2" || wordCount === "3"),
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    recordTest("bashTool: pipes and shell syntax", false, false, msg);
  }

  // Test 3: Variable expansion
  try {
    const result = (await bashTool.execute(
      { command: "echo $PWD", timeout: 30000 },
      executeContext,
    )) as BashToolResult;
    recordTest(
      "bashTool: variable expansion ($PWD)",
      result.success === true &&
        result.code === 0 &&
        result.stdout.trim().length > 0,
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    recordTest("bashTool: variable expansion", false, false, msg);
  }

  // Test 4: Invalid command error handling
  try {
    const result = (await bashTool.execute(
      { command: "this_command_does_not_exist_xyz123", timeout: 30000 },
      executeContext,
    )) as BashToolResult;
    recordTest(
      "bashTool: invalid command returns success:false",
      result.success === false && result.code !== 0,
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    recordTest("bashTool: invalid command error handling", false, false, msg);
  }

  // Test 5: CWD security — reject paths outside process.cwd()
  try {
    const result = (await bashTool.execute(
      { command: "ls", timeout: 30000, cwd: "/tmp" },
      executeContext,
    )) as BashToolResult;
    recordTest(
      "bashTool: CWD security rejects paths outside process.cwd()",
      result.success === false &&
        typeof result.error === "string" &&
        result.error.includes("Access denied"),
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    recordTest("bashTool: CWD security", false, false, msg);
  }

  // Test 6: CWD within process.cwd() works
  try {
    const cwd = process.cwd();
    const result = (await bashTool.execute(
      { command: "ls", timeout: 30000, cwd },
      executeContext,
    )) as BashToolResult;
    recordTest(
      "bashTool: CWD within process.cwd() accepted",
      result.success === true && result.code === 0,
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    recordTest("bashTool: CWD within process.cwd()", false, false, msg);
  }

  // Test 7: Non-existent CWD directory rejected
  try {
    const fakeCwd = process.cwd() + "/nonexistent_dir_xyz123";
    const result = (await bashTool.execute(
      { command: "ls", timeout: 30000, cwd: fakeCwd },
      executeContext,
    )) as BashToolResult;
    recordTest(
      "bashTool: non-existent CWD directory rejected",
      result.success === false &&
        typeof result.error === "string" &&
        result.error.includes("Directory does not exist"),
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    recordTest("bashTool: non-existent CWD rejected", false, false, msg);
  }

  // Test 8: Timeout enforcement
  try {
    const result = (await bashTool.execute(
      { command: 'node -e "setTimeout(() => {}, 60000)"', timeout: 1000 },
      executeContext,
    )) as BashToolResult;
    recordTest(
      "bashTool: timeout enforcement (1s timeout on long command)",
      result.success === false,
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    recordTest("bashTool: timeout enforcement", false, false, msg);
  }

  // Test 9: Non-zero exit code handling
  try {
    const result = (await bashTool.execute(
      { command: "ls /nonexistent_path_xyz123", timeout: 30000 },
      executeContext,
    )) as BashToolResult;
    recordTest(
      "bashTool: non-zero exit code handling",
      result.success === false && result.stderr.length > 0,
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    recordTest("bashTool: non-zero exit code handling", false, false, msg);
  }

  // Test 10: Large output truncation (>100KB)
  try {
    const result = (await bashTool.execute(
      {
        command:
          'node -e "process.stdout.write(Buffer.alloc(150000, 65).toString())"',
        timeout: 30000,
      },
      executeContext,
    )) as BashToolResult;
    recordTest(
      "bashTool: large output truncation (150KB -> result defined)",
      result !== undefined && typeof result.success === "boolean",
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    recordTest("bashTool: large output truncation", false, false, msg);
  }

  // Test 11: Never throws — always returns result object
  try {
    const result = (await bashTool.execute(
      { command: "", timeout: 30000 },
      executeContext,
    )) as BashToolResult;
    recordTest(
      "bashTool: never throws, always returns result object",
      result !== undefined && typeof result.success === "boolean",
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    recordTest(
      "bashTool: never throws, always returns result object",
      false,
      false,
      `Unexpected throw: ${msg}`,
    );
  }

  // Test 12: Timeout capping at 120000ms max
  try {
    const result = (await bashTool.execute(
      { command: "echo test", timeout: 999999 },
      executeContext,
    )) as BashToolResult;
    recordTest(
      "bashTool: timeout capped at 120000ms (large timeout still works)",
      result.success === true && result.stdout.trim() === "test",
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    recordTest("bashTool: timeout capping at 120000ms", false, false, msg);
  }

  // Test 13: Shell redirect support (2>&1)
  try {
    const result = (await bashTool.execute(
      { command: "echo redirect_test 2>&1", timeout: 30000 },
      executeContext,
    )) as BashToolResult;
    recordTest(
      "bashTool: shell redirect support (2>&1)",
      result.success === true && result.stdout.includes("redirect_test"),
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    recordTest("bashTool: shell redirect support", false, false, msg);
  }
}

await runSuite(testExecuteBashCommand);
