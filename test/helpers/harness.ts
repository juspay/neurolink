/**
 * Canonical test harness for NeuroLink continuous-test suites.
 *
 * Replaces ~5,500 lines of boilerplate that was copy-pasted (and drifted)
 * across 37 hand-rolled test scripts. Every suite now reduces to:
 *
 *   import { defineSuite, ... } from "./helpers/harness.js";
 *   const { test, runSuite, opts } = defineSuite("My Suite");
 *   await test("does X", async () => { ... });
 *   await runSuite();
 *
 * Three-valued result reporting:
 *   - PASS: test fn returns/resolves normally
 *   - FAIL: test fn throws an Error not matching the SKIP convention
 *   - SKIP: test fn throws `new Skip(reason)`, OR throws an error whose
 *           message starts with "SKIP:", OR throws a known provider error
 *           caught by isExpectedProviderError() (e.g. missing API key,
 *           rate limit, quota exhausted)
 *
 * Provider/model resolution order:
 *   opts.provider (constructor) → --provider= argv → NEUROLINK_TEST_PROVIDER
 *     → TEST_PROVIDER env → undefined
 *   opts.model    (constructor) → --model= argv    → NEUROLINK_TEST_MODEL
 *     → TEST_MODEL env  → undefined
 *
 * Suites that legitimately need a different default (e.g. middleware uses
 * ollama by default) pass `{ defaultProvider: "ollama" }` to defineSuite.
 */
import "dotenv/config";
import { spawn, type SpawnOptions } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { isExpectedProviderError } from "./envGuard.js";

export { isExpectedProviderError };

// ---------------------------------------------------------------------------
// Skip signal
// ---------------------------------------------------------------------------

export class Skip extends Error {
  constructor(reason: string) {
    super(`SKIP: ${reason}`);
    this.name = "Skip";
  }
}

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

export const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
} as const;

export type ColorName = keyof typeof colors;

export function log(msg: string, color: ColorName = "reset"): void {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

export function logSection(title: string): void {
  console.log("\n" + "=".repeat(70));
  log(`  ${title}`, "cyan");
  console.log("=".repeat(70));
}

// ---------------------------------------------------------------------------
// CLI flag parsing
// ---------------------------------------------------------------------------

type ParsedArgs = {
  provider?: string;
  model?: string;
  port?: number;
  raw: string[];
};

export function parseArgs(argv: string[] = process.argv.slice(2)): ParsedArgs {
  const out: ParsedArgs = { raw: argv };
  for (const a of argv) {
    if (a.startsWith("--provider=")) {
      out.provider = a.slice("--provider=".length);
    } else if (a.startsWith("--model=")) {
      out.model = a.slice("--model=".length);
    } else if (a.startsWith("--port=")) {
      const n = Number(a.slice("--port=".length));
      if (!Number.isNaN(n)) {
        out.port = n;
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Resolved opts
// ---------------------------------------------------------------------------

export type SuiteOpts = {
  /** The suite name shown in section banners and exit summary. */
  name: string;
  /** Resolved provider (or undefined if no default and not provided). */
  provider?: string;
  /** Resolved model (or undefined). */
  model?: string;
  /** Optional port override. */
  port?: number;
};

export type DefineSuiteOpts = {
  /** Fallback provider if neither argv, env, nor explicit override is set. */
  defaultProvider?: string;
  /** Fallback model. */
  defaultModel?: string;
  /** Inter-test delay in ms. Default: 0. */
  interTestDelayMs?: number;
  /**
   * Per-test wall-clock cap in ms. When a single `test()` body exceeds this,
   * the suite aborts the test (treats it as FAIL) and proceeds with the next
   * one. Without this, an upstream endpoint that accepts a connection but
   * never responds blocks the entire suite indefinitely (observed against
   * litellm's `team not allowed to access model` path on tool-calling tests).
   * Default: 240_000 (4 minutes).
   */
  perTestTimeoutMs?: number;
};

function resolveOpts(name: string, defs: DefineSuiteOpts): SuiteOpts {
  const args = parseArgs();
  const provider =
    args.provider ??
    process.env.NEUROLINK_TEST_PROVIDER ??
    process.env.TEST_PROVIDER ??
    defs.defaultProvider;
  const model =
    args.model ??
    process.env.NEUROLINK_TEST_MODEL ??
    process.env.TEST_MODEL ??
    defs.defaultModel;
  return { name, provider, model, port: args.port };
}

// ---------------------------------------------------------------------------
// Asserts
// ---------------------------------------------------------------------------

export function assert(cond: boolean, msg: string): void {
  if (!cond) {
    throw new Error(msg);
  }
}

export function assertEqual<T>(actual: T, expected: T, msg?: string): void {
  if (actual !== expected) {
    throw new Error(
      msg ??
        `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }
}

export function assertNotNull<T>(
  value: T | null | undefined,
  msg?: string,
): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(msg ?? "Expected non-null value");
  }
}

export function assertIncludes(
  haystack: string,
  needle: string,
  msg?: string,
): void {
  if (!haystack.includes(needle)) {
    throw new Error(
      msg ?? `Expected to include "${needle}", got "${haystack.slice(0, 200)}"`,
    );
  }
}

// ---------------------------------------------------------------------------
// Subprocess (canonical version w/ spawn-error guard)
// ---------------------------------------------------------------------------

export type ProcessResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

export function runCommand(
  command: string,
  args: string[] = [],
  options: SpawnOptions & { timeoutMs?: number; stopWhen?: RegExp } = {},
): Promise<ProcessResult> {
  const timeoutMs = options.timeoutMs ?? 30_000;
  const stopWhen = options.stopWhen;
  return new Promise((resolve, reject) => {
    let isResolved = false;
    let proc: ReturnType<typeof spawn>;
    try {
      proc = spawn(command, args, {
        stdio: ["pipe", "pipe", "pipe"],
        ...options,
      });
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
      return;
    }

    let stdout = "";
    let stderr = "";
    let hasExited = false;

    // A server-style command never exits on its own, so waiting for `close`
    // means waiting out the whole timeout. `stopWhen` lets a caller name the
    // output that means "done", and we terminate as soon as it appears.
    const checkStopWhen = (): void => {
      if (!stopWhen || isResolved) {
        return;
      }
      if (stopWhen.test(stdout + stderr)) {
        terminate();
        settle({ stdout, stderr, exitCode: 0 });
      }
    };

    proc.stdout?.on("data", (d: Buffer) => {
      stdout += d.toString();
      checkStopWhen();
    });
    proc.stderr?.on("data", (d: Buffer) => {
      stderr += d.toString();
      checkStopWhen();
    });

    const settle = (result: ProcessResult): void => {
      if (!isResolved) {
        isResolved = true;
        clearTimeout(timeoutId);
        resolve(result);
      }
    };

    // `proc.killed` only records that a signal was delivered — it says nothing
    // about whether the child actually exited, so it cannot gate the SIGKILL
    // escalation. Track the real exit instead: a child that ignores SIGTERM
    // leaves `hasExited` false and gets SIGKILL a second later.
    const terminate = (): void => {
      try {
        proc.kill("SIGTERM");
        setTimeout(() => {
          if (!hasExited) {
            proc.kill("SIGKILL");
          }
        }, 1_000).unref();
      } catch {
        /* swallow */
      }
    };

    const timeoutId = setTimeout(() => {
      terminate();
      settle({
        stdout,
        stderr: stderr + `\n[harness] command timed out after ${timeoutMs}ms`,
        exitCode: -1,
      });
    }, timeoutMs);

    proc.on("exit", () => {
      hasExited = true;
    });
    proc.on("close", (code) => {
      hasExited = true;
      settle({ stdout, stderr, exitCode: code ?? -1 });
    });
    proc.on("error", (err) => {
      if (!isResolved) {
        isResolved = true;
        clearTimeout(timeoutId);
        reject(err);
      }
    });
  });
}

/** Run the built CLI: `node dist/cli/index.js <args>` with merged env. */
export function runCLI(
  args: string[],
  options: {
    env?: Record<string, string>;
    timeoutMs?: number;
    stopWhen?: RegExp;
  } = {},
): Promise<ProcessResult> {
  return runCommand("node", ["dist/cli/index.js", ...args], {
    env: { ...process.env, ...(options.env ?? {}) } as NodeJS.ProcessEnv,
    timeoutMs: options.timeoutMs,
    stopWhen: options.stopWhen,
  });
}

// ---------------------------------------------------------------------------
// Temp dirs
// ---------------------------------------------------------------------------

const _registeredTempDirs: string[] = [];
let _exitHookInstalled = false;

export function tempDir(prefix = "neurolink-test-"): string {
  const p = mkdtempSync(join(tmpdir(), prefix));
  _registeredTempDirs.push(p);
  if (!_exitHookInstalled) {
    process.on("exit", () => {
      for (const dir of _registeredTempDirs) {
        try {
          rmSync(dir, { recursive: true, force: true });
        } catch {
          /* ignore cleanup failures */
        }
      }
    });
    _exitHookInstalled = true;
  }
  return p;
}

// ---------------------------------------------------------------------------
// Sleep helper
// ---------------------------------------------------------------------------

export const delay = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Suite runner
// ---------------------------------------------------------------------------

export type TestFn = () => Promise<void> | void;

export type SuiteHandle = {
  /** Resolved suite-level options (provider/model/port). */
  opts: SuiteOpts;
  /** Register and run a single test (try/catch + auto SKIP detection). */
  test: (name: string, fn: TestFn) => Promise<void>;
  /**
   * Imperative result record for suites that already have their own
   * try/catch logic (e.g. legacy `recordTest(name, passed, skipped, error)`
   * style used by continuous-test-suite-mcp.ts). Increments the same
   * counters that `test()` does.
   *
   * TODO(#1318, harness-migration): remove this shim after every suite migrates
   * to the `test()` form (only the MCP family still uses it at the time
   * of writing). The dual shape is intentional but should not ossify.
   */
  recordTest: (
    name: string,
    passed: boolean,
    skipped?: boolean,
    error?: string,
  ) => void;
  /** Print a section header (PASS/FAIL/SKIP table groupings). */
  section: (title: string) => void;
  /** Run inside a try/finally block; prints summary + process.exit. */
  runSuite: (body?: () => Promise<void> | void) => Promise<void>;
};

/**
 * Default bound for a single case in a suite that runs its own loop.
 *
 * Matches `defineSuite`'s per-test default so the two paths cannot drift.
 */
export const CASE_TIMEOUT_MS = 240_000;

/**
 * Thrown by `withCaseTimeout` when a case exceeds its bound.
 *
 * Distinguishable on purpose. A timed-out case is still RUNNING — see the note
 * on `withCaseTimeout` — so anything it holds globally is still held, and every
 * result after it is suspect. A runner that can tell this error apart can stop
 * rather than publish results it cannot stand behind.
 */
export class CaseTimeoutError extends Error {
  readonly caseName: string;
  constructor(caseName: string, timeoutMs: number) {
    super(
      `${caseName} exceeded ${timeoutMs}ms and was aborted — treat as a hang, not slowness`,
    );
    this.name = "CaseTimeoutError";
    this.caseName = caseName;
  }
}

/** Whether an error came from a case bound rather than the case itself. */
export function isCaseTimeout(error: unknown): error is CaseTimeoutError {
  return error instanceof CaseTimeoutError;
}

let abandonedCase: string | undefined;

/** The case that was abandoned by its bound, if any. */
export function getAbandonedCase(): string | undefined {
  return abandonedCase;
}

/** Reset between independent runs in one process (used by self-tests). */
export function resetAbandonedCase(): void {
  abandonedCase = undefined;
}

/**
 * Bound one case from a suite that iterates its own `tests[]` array.
 *
 * `defineSuite`'s per-test timeout lives in the `test(name, fn)` helper it
 * hands back. A suite that instead keeps its own array and loops
 * `await test.fn()` never touches that helper, so its cases are UNBOUNDED —
 * `runSuite(body)` only awaits the body, it adds no timeout of its own. One
 * hung case then hangs the whole run until the CI job is killed, and the
 * report says nothing about which case it was.
 *
 * Rejects rather than resolving, so the suite's existing catch records a
 * failure for the named case. The message deliberately says "hang, not
 * slowness": a case that legitimately needs longer than this should be given
 * its own bound, not have this one raised.
 *
 * WHAT THIS CANNOT BOUND, because assuming otherwise is worse than having no
 * bound at all: anything that blocks the event loop. This is `Promise.race`,
 * so the timer only fires when the loop is free to run it. A case that calls
 * `spawnSync`, `execSync`, `readFileSync` on a slow device, or any other
 * synchronous blocking call is NOT protected — the rejection cannot be
 * delivered until the blocking call returns, and if it never returns, never.
 * Measured: a 300ms bound around a 3s `spawnSync` returned at 3025ms without
 * firing.
 *
 * The corollary matters more than the caveat. `spawnSync`'s own `timeout`
 * option is not a guarantee either: it sends `killSignal` (SIGTERM by default)
 * and keeps waiting, so a child that ignores SIGTERM hangs it forever. Every
 * `spawnSync` in a suite therefore needs `killSignal: "SIGKILL"` to be
 * bounded at all — this helper cannot supply that for you.
 *
 * `Promise.race` also does not CANCEL the losing promise. A case abandoned
 * here keeps running, so its `finally` has not executed: anything it mutated
 * globally is still mutated while later cases run. A case that patches a
 * global should scope the patch as narrowly as it can, precisely so that
 * window is harmless.
 *
 * `fn` returns `Promise<T> | T`, not `Promise<T>`, so that a suite whose case
 * type is the harness's own `TestFn` (`() => Promise<void> | void`) can be
 * bounded. The narrower signature rejected those at compile time — which is
 * safe, but it quietly left such suites unbounded, since the only way to keep
 * them compiling was not to wrap them. `continuous-test-suite-auth.ts` was
 * exactly that case.
 *
 * A synchronous `fn` is not a hazard here: `Promise.race` coerces a non-promise
 * to an immediately-resolved one, so a sync case simply wins its own race. It
 * also cannot hang except by blocking the event loop, which this helper already
 * documents as beyond what it can bound.
 */
export async function withCaseTimeout<T>(
  name: string,
  fn: () => Promise<T> | T,
  timeoutMs: number = CASE_TIMEOUT_MS,
): Promise<T> {
  // Once a case has been abandoned, do not START another one.
  //
  // `Promise.race` cannot cancel: the abandoned case is still running and still
  // holds whatever it mutated — a patched global, an open server, a temp dir it
  // has not cleaned. Every later case then runs in a process it does not own,
  // and its PASS or FAIL means nothing. This was not theoretical: one hang in
  // continuous-test-suite-bugfixes produced a second, unrelated CI failure 176
  // lines further down the same file.
  //
  // Refusing loudly is the only honest option. Reporting the rest as skips
  // would be the false green this whole change exists to remove, and running
  // them anyway publishes results that cannot be stood behind.
  if (abandonedCase !== undefined) {
    throw new Error(
      `not run — "${abandonedCase}" was abandoned by its timeout and is still ` +
        `executing, so this process no longer has clean state. Fix that case; ` +
        `results after it cannot be trusted.`,
    );
  }
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      fn(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          abandonedCase = name;
          reject(new CaseTimeoutError(name, timeoutMs));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

export function defineSuite(
  name: string,
  defs: DefineSuiteOpts = {},
): SuiteHandle {
  const opts = resolveOpts(name, defs);

  let passed = 0;
  let failed = 0;
  let skipped = 0;
  const failures: { name: string; error: string }[] = [];
  const startedAt = Date.now();

  const perTestTimeoutMs = defs.perTestTimeoutMs ?? 240_000;
  // Sentinel used by the per-test timeout below; classified as SKIP (not
  // FAIL) because the harness can't tell the difference between an SDK bug
  // and an upstream that simply never responded.
  const PER_TEST_TIMEOUT_SKIP_MARKER = "PER_TEST_TIMEOUT_SKIP";

  const test = async (testName: string, fn: TestFn): Promise<void> => {
    let timeoutId: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(
          new Error(
            `SKIP: ${PER_TEST_TIMEOUT_SKIP_MARKER} — ${testName} exceeded ${perTestTimeoutMs}ms — upstream likely hung; aborting test`,
          ),
        );
      }, perTestTimeoutMs);
    });
    try {
      await Promise.race([fn(), timeoutPromise]);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      passed++;
      console.log(`  ${colors.green}✓${colors.reset} ${testName}`);
    } catch (err) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      const msg = err instanceof Error ? err.message : String(err);
      const isSkip =
        err instanceof Skip ||
        msg.startsWith("SKIP:") ||
        isExpectedProviderError(msg);
      if (isSkip) {
        skipped++;
        const reason = msg.startsWith("SKIP:") ? msg.slice(5).trim() : msg;
        console.log(
          `  ${colors.yellow}⊘${colors.reset} ${testName} ${colors.yellow}(${reason.slice(0, 100)})${colors.reset}`,
        );
      } else {
        failed++;
        failures.push({ name: testName, error: msg });
        console.log(
          `  ${colors.red}✗${colors.reset} ${testName}\n    ${colors.yellow}→ ${msg.split("\n")[0]}${colors.reset}`,
        );
      }
    }
    if (defs.interTestDelayMs && defs.interTestDelayMs > 0) {
      await delay(defs.interTestDelayMs);
    }
  };

  const recordTest = (
    name: string,
    testPassed: boolean,
    testSkipped = false,
    error?: string,
  ): void => {
    if (testSkipped) {
      skipped++;
      const reason = error ? error.slice(0, 100) : "skipped";
      console.log(
        `  ${colors.yellow}⊘${colors.reset} ${name} ${colors.yellow}(${reason})${colors.reset}`,
      );
    } else if (testPassed) {
      passed++;
      console.log(`  ${colors.green}✓${colors.reset} ${name}`);
    } else {
      failed++;
      const errMsg = error ?? "FAIL";
      failures.push({ name, error: errMsg });
      console.log(
        `  ${colors.red}✗${colors.reset} ${name}\n    ${colors.yellow}→ ${errMsg.split("\n")[0]}${colors.reset}`,
      );
    }
  };

  const section = (title: string): void => {
    logSection(title);
  };

  const runSuite = async (body?: () => Promise<void> | void): Promise<void> => {
    logSection(name);
    if (opts.provider) {
      log(`  Provider: ${opts.provider}`, "blue");
    }
    if (opts.model) {
      log(`  Model:    ${opts.model}`, "blue");
    }
    try {
      if (body) {
        await body();
      }
    } catch (err) {
      console.error(
        `\n${colors.red}Unexpected suite-level error:${colors.reset}`,
        err,
      );
      failed++;
    }
    const dur = ((Date.now() - startedAt) / 1000).toFixed(2);
    logSection("TEST SUMMARY");
    log(`  Passed:  ${passed}`, "green");
    if (failed > 0) {
      log(`  Failed:  ${failed}`, "red");
    }
    if (skipped > 0) {
      log(`  Skipped: ${skipped}`, "yellow");
    }
    log(`  Total:   ${passed + failed + skipped}`, "bright");
    log(`  Time:    ${dur}s`, "blue");
    if (failures.length > 0) {
      log("\n  FAILURES:", "red");
      for (const f of failures) {
        console.log(
          `    ${colors.red}✗${colors.reset} ${f.name}\n      ${colors.yellow}${f.error.split("\n")[0]}${colors.reset}`,
        );
      }
    }
    log(
      `\n  RESULT: ${failed > 0 ? "FAIL" : "PASS"}`,
      failed > 0 ? "red" : "green",
    );
    console.log("=".repeat(70) + "\n");
    process.exit(failed > 0 ? 1 : 0);
  };

  return { opts, test, recordTest, section, runSuite };
}
