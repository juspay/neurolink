#!/usr/bin/env tsx

/**
 * Continuous Test Suite — Claude Proxy
 *
 * ## Determinism exception (CLAUDE.md rule 15)
 *
 * Most of this suite drives the shipped CLI. A handful of cases instead import
 * `__testHooks` from `claudeProxyRoutes`, plus `loadProxyConfig` and the
 * accountQuota helpers, to cover 429-cooldown planning, account ordering by
 * quota, and weekly-expiry ordering. Those are deterministic table-driven
 * decisions with no live path: reproducing them end to end would mean
 * provoking a specific sequence of 429s across several real accounts, which
 * cannot be arranged on demand. `__testHooks` is a test-only export in `src/`
 * and should shrink as this logic gains a real surface.
 *
 * Three further cases import `__openCodeTestHooks` from the proxy CLI command
 * to cover OpenCode client auto-configuration. Those writers resolve paths
 * from the environment and are reachable only from `proxy start` and
 * `proxy setup` — neither of which can be pointed at a throwaway HOME without
 * starting a real server and a launchd unit. Determinism here buys the one
 * thing an end-to-end run cannot: asserting what the writer does when the
 * target CLI is *absent*, which is the case that silently regressed.
 *
 * The `Proxy clients:` cases extend that same exception to the configurator
 * registry (`src/cli/proxy-clients/`). They import the configurators directly
 * because `detect()`/`apply()`/`restore()` resolve paths from HOME, and the
 * behaviours worth pinning — refusing to write for an absent CLI, refusing to
 * restore without a snapshot — are precisely the ones a live `proxy start`
 * never exercises. `Analyze: exact rates…` is the exception: it drives the
 * built CLI end to end.
 *
 * The `Ledger:` cases and `Accounts: route joins…` take the same exception for
 * the same reason. The ledger's whole job is what happens to malformed input —
 * a half-written line, a request logged twice, a token-less record arriving
 * after a real one — none of which a live proxy can be asked to produce on
 * demand. `Accounts:` invokes the route handler directly rather than over HTTP
 * because the assertions are about the shape of the joined payload, not about
 * transport.
 *
 * The routing-policy cases (account-ranking, prefer-primary, session affinity,
 * spill-inflight) take the same exception. They import `accountRanking.ts` and
 * `sessionAffinity.ts` directly (both pure, no I/O) and `validateProxyConfig`/
 * `parseRoutingConfig` from `proxyConfig`, and reach the route-local glue
 * through these `__testHooks`: `setAccountRuntimeState` and
 * `resetAllRuntimeState` to stage and clear per-account quota and cooldown
 * state, `selectClaudeProxyAccountOrderForTests`,
 * `setForceSpillThrowForTests` and `setForceAffinityLookupThrowForTests` for
 * precedence and the failure mode,
 * `orderAccountsByQuota`, `buildRoutingDecision` and
 * `buildQuotaRoutingDecision` for the reference order and decision record the
 * policy results are compared against, `getAccountInflight`,
 * `tryAcquireAccountAdmission` and `hasAccountAdmissionState` for
 * admission-lease accounting, `handleAnthropicStreamingSuccessResponse` for
 * the served discriminant that decides a binding, and
 * `extractSnapshotBodySessionIdForTests` for the session id.
 * Determinism buys exhaustive coverage of every comparator tie-break and
 * precedence branch, which a live account pool cannot be staged to hit
 * reliably. The policy's `/status` report and its hot reload are driven
 * through the built CLI instead.
 *
 * Tests the proxy server end-to-end:
 * - Starts the proxy
 * - Sends real requests through it
 * - Verifies responses
 * - Tests error handling
 * - Tests account management
 * - Stops the proxy
 *
 * Run with: npx tsx test/continuous-test-suite-proxy.ts
 * Requires: Built CLI (pnpm run build:cli), valid OAuth token
 */

import { spawn, ChildProcess } from "child_process";
import * as http from "http";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { fileURLToPath } from "url";

// This suite starts a real proxy process. Isolate every path before any proxy
// module or CLI child can resolve the operator's home directory.
const TEST_HOME = fs.mkdtempSync(
  path.join(os.tmpdir(), "neurolink-proxy-e2e-home-"),
);
process.env.HOME = TEST_HOME;
process.env.USERPROFILE = TEST_HOME;
process.env.XDG_CONFIG_HOME = path.join(TEST_HOME, ".config");
process.env.NEUROLINK_PROXY_TEST_ISOLATED = "1";
const LIVE_PROXY_TESTS_ALLOWED =
  process.env.NEUROLINK_PROXY_TEST_ALLOW_LIVE === "1";
if (!LIVE_PROXY_TESTS_ALLOWED) {
  for (const variable of [
    "ANTHROPIC_API_KEY",
    "ANTHROPIC_AUTH_TOKEN",
    "OPENAI_API_KEY",
    "GOOGLE_API_KEY",
  ]) {
    delete process.env[variable];
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Types
// ============================================================================

type TestFunction = {
  name: string;
  fn: () => Promise<boolean | null>;
  category?: string;
};

type TestResult = {
  name: string;
  result: boolean | null; // true = PASS, false = FAIL, null = SKIP
  error: string | null;
};

// ============================================================================
// Color helpers — provided by shared harness
// ============================================================================

import {
  defineSuite,
  log,
  logSection,
  withCaseTimeout,
  isCaseTimeout,
} from "./helpers/harness.js";

import type {
  AccountQuota,
  ProxyAccountRoutingDecision,
  ProxyAccountRoutingReason,
  ProxyAccountSortMetrics,
  ProxyPassthroughAccount,
  ProxyQuotaFreshness,
} from "../src/lib/types/index.js";
import {
  compareExpiryFirst,
  compareHeadroomFirst,
  rankAccounts,
} from "../src/lib/proxy/accountRanking.js";
import { sessionAffinity } from "../src/lib/proxy/sessionAffinity.js";

const { recordTest, runSuite } = defineSuite("Claude Proxy");

/** Print-only logTest shim. Counters come from recordTest in the runner. */
function logTest(
  testName: string,
  status: "PASS" | "FAIL" | "TESTING" | "SKIP",
  details = "",
): void {
  const color =
    status === "PASS" ? "green" : status === "FAIL" ? "red" : "yellow";
  log(
    `[${status}] ${testName}${details ? ` — ${details}` : ""}`,
    color as never,
  );
}

// ============================================================================
// Proxy management
// ============================================================================

let proxyProcess: ChildProcess | null = null;
const PROXY_PORT = 9876; // Non-standard port for testing
const PROXY_URL = `http://127.0.0.1:${PROXY_PORT}`;

/**
 * Set to true when the local CLI refuses to start because a launchd-managed
 * `com.neurolink.proxy` daemon is already running. Once true, every
 * downstream test (`Health`, `Status`, `Models`, `Count Tokens`,
 * `Non-Streaming Request`, ...) returns `null` (SKIP) instead of `false`
 * (FAIL) — the failure is environmental, not a regression in the suite or
 * the proxy code.
 *
 * Detected by parsing the CLI's stdout for the canonical guard message
 * emitted from `src/cli/commands/proxy.ts` when `isLaunchdManaging()` returns
 * true.
 */
let proxyLaunchdManaged = false;
const LAUNCHD_GUARD_MARKERS = [
  "Use 'neurolink proxy uninstall'",
  "managed by launchd",
  "launchctl kickstart",
];

/**
 * Anthropic model used for the proxy round-trip tests.
 * The default must remain a currently supported model. An explicit override is
 * accepted only for an operator-authorized live test run.
 */
const PROXY_TEST_MODEL = LIVE_PROXY_TESTS_ALLOWED
  ? process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6"
  : "claude-sonnet-4-6";

// These paths are inside TEST_HOME. They can never refer to the installed proxy.
const PROXY_STATE_PATH = path.join(
  os.homedir(),
  ".neurolink",
  "proxy-state.json",
);
const CLAUDE_SETTINGS_PATH = path.join(
  os.homedir(),
  ".claude",
  "settings.json",
);

/**
 * Start the proxy server as a child process.
 * Waits for /health to respond before returning.
 */
async function startProxy(): Promise<boolean> {
  const cliPath = path.resolve("dist/cli/index.js");
  if (!fs.existsSync(cliPath)) {
    log(`CLI not built: ${cliPath} not found. Run: pnpm run build:cli`, "red");
    return false;
  }

  fs.mkdirSync(path.dirname(PROXY_STATE_PATH), { recursive: true });
  fs.mkdirSync(path.dirname(CLAUDE_SETTINGS_PATH), { recursive: true });

  return new Promise<boolean>((resolve) => {
    proxyProcess = spawn(
      process.execPath,
      [cliPath, "proxy", "start", "--port", String(PROXY_PORT), "--quiet"],
      {
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          ...process.env,
          NEUROLINK_SKIP_MCP: "true",
          // Allow the test to start its own proxy on PROXY_PORT (9876)
          // alongside a launchd-managed daemon on a different port (the
          // typical default). Without this opt-in, the proxy CLI refuses
          // to start whenever launchd is managing any instance — even on
          // a different port — and the entire suite SKIPs.
          NEUROLINK_PROXY_IGNORE_LAUNCHD: "1",
        },
      },
    );

    let started = false;
    let stdout = "";
    let stderr = "";

    proxyProcess.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    proxyProcess.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proxyProcess.on("error", (err) => {
      if (!started) {
        log(`Proxy process error: ${err.message}`, "red");
        started = true;
        resolve(false);
      }
    });

    proxyProcess.on("exit", (code) => {
      if (!started) {
        const combined = `${stdout}\n${stderr}`;
        if (LAUNCHD_GUARD_MARKERS.some((m) => combined.includes(m))) {
          proxyLaunchdManaged = true;
          log(
            "Local launchd-managed neurolink proxy detected — proxy suite will SKIP",
            "yellow",
          );
          started = true;
          resolve(false);
          return;
        }
        log(`Proxy exited prematurely with code ${code}`, "red");
        if (stdout) {
          log(`  stdout: ${stdout.substring(0, 300)}`, "red");
        }
        if (stderr) {
          log(`  stderr: ${stderr.substring(0, 300)}`, "red");
        }
        started = true;
        resolve(false);
      }
    });

    // Poll /health until it responds
    const maxWaitMs = 15000;
    const pollMs = 500;
    const startTime = Date.now();

    const poll = async () => {
      while (Date.now() - startTime < maxWaitMs) {
        try {
          const resp = await fetch(`${PROXY_URL}/health`, {
            signal: AbortSignal.timeout(2000),
          });
          if (resp.ok) {
            started = true;
            resolve(true);
            return;
          }
        } catch {
          // Not ready yet
        }
        await new Promise((r) => setTimeout(r, pollMs));
      }

      if (!started) {
        log(`Proxy did not become healthy within ${maxWaitMs / 1000}s`, "red");
        if (stderr) {
          log(`  stderr: ${stderr.substring(0, 300)}`, "red");
        }
        started = true;
        resolve(false);
      }
    };

    poll();
  });
}

/**
 * Stop the proxy process and wait for it to exit.
 */
async function stopProxy(): Promise<void> {
  if (!proxyProcess) {
    return;
  }

  const proc = proxyProcess;
  proxyProcess = null;

  return new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      try {
        proc.kill("SIGKILL");
      } catch {
        /* already dead */
      }
      resolve();
    }, 5000);

    proc.on("exit", () => {
      clearTimeout(timeout);
      resolve();
    });

    try {
      proc.kill("SIGTERM");
    } catch {
      clearTimeout(timeout);
      resolve();
    }
  });
}

/**
 * Convenience wrapper for fetching from the proxy.
 */
async function fetchProxy(
  urlPath: string,
  options?: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    return await fetch(`${PROXY_URL}${urlPath}`, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

// ============================================================================
// Claude Code-style headers
// ============================================================================

const claudeHeaders: Record<string, string> = {
  "Content-Type": "application/json",
  "anthropic-version": "2023-06-01",
  "anthropic-beta":
    "claude-code-20250219,oauth-2025-04-20,interleaved-thinking-2025-05-14,context-management-2025-06-27,prompt-caching-scope-2026-01-05",
  "anthropic-dangerous-direct-browser-access": "true",
  "User-Agent": "claude-cli/2.1.80 (external, cli)",
  "x-app": "cli",
};

// ============================================================================
// OAuth token detection
// ============================================================================

/**
 * Check if a valid OAuth token or API key is available for real API tests.
 * Returns true if credentials exist; false if they should be skipped.
 */
function hasValidCredentials(): boolean {
  if (!LIVE_PROXY_TESTS_ALLOWED) {
    return false;
  }
  // 1. Check TokenStore compound keys (tokenStore is async, use file check)
  //    The actual file used by TokenStore is "tokens.json" (not "token-store.json").
  const tokenStorePath = path.join(os.homedir(), ".neurolink", "tokens.json");
  try {
    const store = JSON.parse(fs.readFileSync(tokenStorePath, "utf8"));
    // TokenStore v2 nests credentials under a `providers` object
    const providers = store.providers || store;
    for (const key of Object.keys(providers)) {
      if (key.startsWith("anthropic:") || key === "anthropic") {
        const entry = providers[key];
        // Verify the record actually contains usable credentials —
        // not just an empty or disabled entry.
        if (typeof entry !== "object" || entry === null) {
          continue;
        }
        const tokens = entry.tokens || entry;
        if (
          (typeof tokens.accessToken === "string" &&
            tokens.accessToken.length > 0) ||
          (typeof tokens.apiKey === "string" && tokens.apiKey.length > 0)
        ) {
          return true;
        }
      }
    }
  } catch {
    // no store or parse error — fall through
  }

  // 2. Check legacy credentials file
  const credPath = path.join(
    os.homedir(),
    ".neurolink",
    "anthropic-credentials.json",
  );
  try {
    const creds = JSON.parse(fs.readFileSync(credPath, "utf8"));
    if (creds.oauth?.accessToken) {
      return true;
    }
  } catch {
    // no file — fall through
  }

  // 3. Check env var
  if (process.env.ANTHROPIC_API_KEY) {
    return true;
  }

  return false;
}

// ============================================================================
// Tests: Startup & Infrastructure
// ============================================================================

async function testProxyStartup(): Promise<boolean | null> {
  log("Starting proxy on port " + PROXY_PORT + "...", "cyan");
  const ok = await startProxy();
  if (!ok) {
    if (proxyLaunchdManaged) {
      return null;
    }
    log("Proxy failed to start", "red");
    return false;
  }

  // Verify /health responds with {"status":"ok"}
  try {
    const resp = await fetchProxy("/health");
    const body = (await resp.json()) as { status?: string };
    if (body.status === "ok") {
      log(`Health check OK: ${JSON.stringify(body)}`, "green");
      return true;
    }
    log(`Health returned unexpected body: ${JSON.stringify(body)}`, "red");
    return false;
  } catch (err) {
    log(
      `Health check failed: ${err instanceof Error ? err.message : String(err)}`,
      "red",
    );
    return false;
  }
}

async function testProxyHealthEndpoint(): Promise<boolean | null> {
  try {
    const resp = await fetchProxy("/health");
    if (!resp.ok) {
      log(`/health returned ${resp.status}`, "red");
      return false;
    }
    const body = (await resp.json()) as {
      status?: string;
      uptime?: number;
      strategy?: string;
    };
    if (body.status !== "ok") {
      log(`Expected status "ok", got "${body.status}"`, "red");
      return false;
    }
    if (typeof body.uptime !== "number") {
      log(`Expected numeric uptime, got ${typeof body.uptime}`, "red");
      return false;
    }
    log(
      `Health: status=${body.status} uptime=${body.uptime.toFixed(1)}s strategy=${body.strategy}`,
      "green",
    );
    return true;
  } catch (err) {
    log(
      `Health endpoint error: ${err instanceof Error ? err.message : String(err)}`,
      "red",
    );
    return false;
  }
}

async function testProxyStatusEndpoint(): Promise<boolean | null> {
  try {
    const resp = await fetchProxy("/status");
    if (!resp.ok) {
      log(`/status returned ${resp.status}`, "red");
      return false;
    }
    const body = (await resp.json()) as {
      status?: string;
      pid?: number;
      port?: number;
      stats?: { totalRequests?: number };
    };

    const checks = [
      { field: "status", ok: body.status === "running" },
      { field: "pid", ok: typeof body.pid === "number" && body.pid > 0 },
      { field: "port", ok: body.port === PROXY_PORT },
      {
        field: "stats",
        ok:
          body.stats !== null &&
          body.stats !== undefined &&
          typeof body.stats.totalRequests === "number",
      },
    ];

    const failures = checks.filter((c) => !c.ok);
    if (failures.length > 0) {
      log(
        `Status endpoint missing fields: ${failures.map((f) => f.field).join(", ")}`,
        "red",
      );
      log(`  Body: ${JSON.stringify(body).substring(0, 300)}`, "reset");
      return false;
    }

    log(
      `Status: pid=${body.pid} port=${body.port} totalRequests=${body.stats?.totalRequests}`,
      "green",
    );
    return true;
  } catch (err) {
    log(
      `Status endpoint error: ${err instanceof Error ? err.message : String(err)}`,
      "red",
    );
    return false;
  }
}

async function testProxyModelsEndpoint(): Promise<boolean | null> {
  try {
    const resp = await fetchProxy("/v1/models");
    if (!resp.ok) {
      log(`/v1/models returned ${resp.status}`, "red");
      return false;
    }
    const body = (await resp.json()) as {
      data?: Array<{
        id?: string;
        type?: string;
        display_name?: string;
        created_at?: string;
      }>;
      first_id?: string | null;
      last_id?: string | null;
      has_more?: boolean;
    };

    if (!Array.isArray(body.data) || body.data.length === 0) {
      log("Expected non-empty data array", "red");
      return false;
    }
    if (
      typeof body.first_id !== "string" ||
      typeof body.last_id !== "string" ||
      typeof body.has_more !== "boolean"
    ) {
      log(
        `Model pagination has incorrect shape: ${JSON.stringify(body)}`,
        "red",
      );
      return false;
    }

    // This is the Anthropic-compatible route, not the OpenAI list schema.
    for (const model of body.data) {
      if (
        typeof model.id !== "string" ||
        model.type !== "model" ||
        typeof model.display_name !== "string" ||
        typeof model.created_at !== "string"
      ) {
        log(`Model entry has incorrect shape: ${JSON.stringify(model)}`, "red");
        return false;
      }
    }

    const modelIds = body.data.map((m) => m.id).join(", ");
    log(`Models: ${body.data.length} available [${modelIds}]`, "green");
    return true;
  } catch (err) {
    log(
      `Models endpoint error: ${err instanceof Error ? err.message : String(err)}`,
      "red",
    );
    return false;
  }
}

/**
 * Codex CLI model discovery must not 404.
 *
 * The Codex CLI refreshes its model list on every invocation, hitting
 * `GET /backend-api/codex/models?client_version=<v>`. The proxy registered only
 * the `/responses` route, so that request 404'd and the CLI printed
 * `failed to refresh available models: unexpected status 404 Not Found` on each
 * run before silently falling back to a default model — the user's configured
 * model quietly ignored.
 *
 * Driven against the spawned proxy exactly as the CLI drives it, including the
 * client_version query the CLI sends. Without Codex credentials the relay
 * cannot reach upstream and answers 401/502/503; that is a correct answer from
 * a route that exists.
 *
 * The tolerated set is an ALLOW-list, not a deny-list, and that distinction is
 * the whole point. An earlier version accepted anything that was not 404 or
 * 405 — which meant it also accepted 400, and 400 is precisely what upstream
 * returns when `client_version` is dropped from the forwarded query. That is
 * the bug this route was written to fix, so the test passed on the regression
 * it existed to catch. Any status outside the allow-list now fails.
 */
async function testCodexModelsDiscovery(): Promise<boolean | null> {
  // 200 with credentials; 401 unauthenticated or rejected; 502/503 when
  // upstream is unreachable or the refresh is transiently unavailable.
  const ACCEPTED = new Set([200, 401, 502, 503]);
  try {
    const resp = await fetchProxy(
      "/backend-api/codex/models?client_version=0.147.0",
    );
    if (resp.status === 404) {
      log(
        "Codex model discovery is unroutable — the CLI cannot list models",
        "red",
      );
      return false;
    }
    if (resp.status === 405) {
      log("Codex model discovery rejected the CLI's GET method", "red");
      return false;
    }
    if (resp.status === 400) {
      log(
        "Codex model discovery answered 400 — the client_version query is not reaching upstream",
        "red",
      );
      return false;
    }
    if (!ACCEPTED.has(resp.status)) {
      log(
        `Codex model discovery answered an unexpected status ${resp.status}`,
        "red",
      );
      return false;
    }
    log(`Codex /models answered with status ${resp.status}`, "green");
    return true;
  } catch (err) {
    // A transport failure here has two very different causes, and reporting
    // both the same way is what was wrong before. This used to return false
    // unconditionally, so a dropped connection to the throwaway proxy THIS
    // SUITE spawned was reported as "Codex model discovery is unroutable". It
    // did exactly that twice while `codex exec` was answering correctly
    // through the same proxy and the route itself returned 200.
    //
    // But turning it into an unconditional skip is the opposite error: a route
    // that deadlocks or resets the connection is a real defect, and it
    // presents as a transport failure too. So distinguish them with a
    // precondition rather than a guess — ask whether the proxy is answering at
    // all. If /status responds, the process is healthy and this route
    // specifically failed: that is a genuine finding and must FAIL. If /status
    // is also unreachable, the harness lost its server and this case observed
    // nothing, which is a SKIP.
    //
    // (Most catch blocks in this file return false. That is right for them —
    // they assert on a response they did receive. This one is bounded by
    // whether a request could be made at all.)
    let proxyAlive: boolean;
    try {
      const health = await fetchProxy("/status");
      proxyAlive = health.ok;
    } catch {
      proxyAlive = false;
    }
    if (proxyAlive) {
      log(
        "Codex model discovery threw while the proxy was still answering /status — the route itself failed",
        "red",
      );
      return false;
    }
    log(
      "the spawned proxy stopped answering entirely, so Codex model discovery was never observed",
      "yellow",
    );
    return null;
  }
}

async function testProxyCountTokens(): Promise<boolean | null> {
  try {
    const resp = await fetchProxy("/v1/messages/count_tokens", {
      method: "POST",
      headers: claudeHeaders,
      body: JSON.stringify({
        model: PROXY_TEST_MODEL,
        messages: [{ role: "user", content: "Hello, how are you today?" }],
      }),
    });

    if (!resp.ok) {
      log(`/v1/messages/count_tokens returned ${resp.status}`, "red");
      const errBody = await resp.text();
      log(`  Error: ${errBody.substring(0, 200)}`, "red");
      return false;
    }

    const body = (await resp.json()) as { input_tokens?: number };
    if (typeof body.input_tokens !== "number" || body.input_tokens <= 0) {
      log(
        `Expected positive input_tokens, got: ${JSON.stringify(body)}`,
        "red",
      );
      return false;
    }

    log(`Count tokens: input_tokens=${body.input_tokens}`, "green");
    return true;
  } catch (err) {
    log(
      `Count tokens error: ${err instanceof Error ? err.message : String(err)}`,
      "red",
    );
    return false;
  }
}

// ============================================================================
// Tests: Error Handling
// ============================================================================

async function testProxyInvalidBody(): Promise<boolean | null> {
  try {
    const resp = await fetchProxy("/v1/messages", {
      method: "POST",
      headers: claudeHeaders,
      body: JSON.stringify({}),
    });

    // Should return 400
    if (resp.status !== 400) {
      log(`Expected 400 for empty body, got ${resp.status}`, "red");
      return false;
    }

    const body = (await resp.json()) as {
      type?: string;
      error?: { type?: string; message?: string };
    };
    if (body.type !== "error") {
      log(`Expected type="error", got "${body.type}"`, "red");
      return false;
    }
    if (body.error?.type !== "invalid_request_error") {
      log(
        `Expected error.type="invalid_request_error", got "${body.error?.type}"`,
        "red",
      );
      return false;
    }

    log(`Invalid body correctly returned 400: ${body.error.message}`, "green");
    return true;
  } catch (err) {
    log(
      `Invalid body test error: ${err instanceof Error ? err.message : String(err)}`,
      "red",
    );
    return false;
  }
}

async function testProxyMissingModel(): Promise<boolean | null> {
  try {
    const resp = await fetchProxy("/v1/messages", {
      method: "POST",
      headers: claudeHeaders,
      body: JSON.stringify({
        messages: [{ role: "user", content: "Hello" }],
      }),
    });

    if (resp.status !== 400) {
      log(`Expected 400 for missing model, got ${resp.status}`, "red");
      return false;
    }

    const body = (await resp.json()) as {
      type?: string;
      error?: { type?: string; message?: string };
    };
    if (body.type !== "error") {
      log(`Expected type="error", got "${body.type}"`, "red");
      return false;
    }

    log(
      `Missing model correctly returned 400: ${body.error?.message}`,
      "green",
    );
    return true;
  } catch (err) {
    log(
      `Missing model test error: ${err instanceof Error ? err.message : String(err)}`,
      "red",
    );
    return false;
  }
}

// ============================================================================
// Tests: Real API (require valid OAuth token or API key)
// ============================================================================

async function testProxyNonStreaming(): Promise<boolean | null> {
  if (!hasValidCredentials()) {
    log("No Anthropic credentials found, skipping", "yellow");
    return null;
  }

  try {
    const resp = await fetchProxy("/v1/messages", {
      method: "POST",
      headers: claudeHeaders,
      body: JSON.stringify({
        model: PROXY_TEST_MODEL,
        max_tokens: 128,
        messages: [
          { role: "user", content: "Reply with exactly: PROXY_TEST_OK" },
        ],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      // Passthrough mode requires Claude Code's body-level cloaking (billing header, user_id).
      // Bare test requests get 400 "Error" — this is expected, not a proxy bug.
      if (resp.status === 400 && errText.includes('"message":"Error"')) {
        log(
          "Bare request rejected by Anthropic OAuth (needs Claude Code cloaking) — SKIP",
          "yellow",
        );
        return null;
      }
      log(
        `Non-streaming returned ${resp.status}: ${errText.substring(0, 200)}`,
        "red",
      );
      return false;
    }

    const body = (await resp.json()) as {
      type?: string;
      content?: Array<{ type?: string; text?: string }>;
      stop_reason?: string;
    };

    if (body.type !== "message") {
      log(`Expected type="message", got "${body.type}"`, "red");
      log(`  Full body: ${JSON.stringify(body).substring(0, 300)}`, "reset");
      return false;
    }

    if (
      !body.content ||
      !Array.isArray(body.content) ||
      body.content.length === 0
    ) {
      log("Expected non-empty content array", "red");
      return false;
    }

    const firstBlock = body.content[0];
    if (firstBlock.type !== "text" || typeof firstBlock.text !== "string") {
      log(
        `Expected text content block, got: ${JSON.stringify(firstBlock)}`,
        "red",
      );
      return false;
    }

    if (!body.stop_reason) {
      log("Expected stop_reason field", "red");
      return false;
    }

    log(
      `Non-streaming OK: stop_reason=${body.stop_reason} text="${firstBlock.text.substring(0, 60)}"`,
      "green",
    );
    return true;
  } catch (err) {
    log(
      `Non-streaming error: ${err instanceof Error ? err.message : String(err)}`,
      "red",
    );
    return false;
  }
}

async function testProxyStreaming(): Promise<boolean | null> {
  if (!hasValidCredentials()) {
    log("No Anthropic credentials found, skipping", "yellow");
    return null;
  }

  try {
    const resp = await fetchProxy("/v1/messages", {
      method: "POST",
      headers: claudeHeaders,
      body: JSON.stringify({
        model: PROXY_TEST_MODEL,
        max_tokens: 128,
        stream: true,
        messages: [
          { role: "user", content: "Reply with exactly: STREAM_TEST_OK" },
        ],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      // Passthrough needs Claude Code cloaking — bare requests get 400 "Error"
      if (resp.status === 400 && errText.includes('"message":"Error"')) {
        log(
          "Bare request rejected by Anthropic OAuth (needs Claude Code cloaking) — SKIP",
          "yellow",
        );
        return null;
      }
      log(
        `Streaming returned ${resp.status}: ${errText.substring(0, 200)}`,
        "red",
      );
      return false;
    }

    const contentType = resp.headers.get("content-type") ?? "";
    if (!contentType.includes("text/event-stream")) {
      log(
        `Expected text/event-stream content-type, got "${contentType}"`,
        "red",
      );
      return false;
    }

    // Read SSE events
    const text = await resp.text();
    const events = text
      .split("\n")
      .filter((line) => line.startsWith("event:"))
      .map((line) => line.replace("event: ", "").trim());

    const hasMessageStart = events.includes("message_start");
    const hasContentDelta = events.includes("content_block_delta");
    const hasMessageStop = events.includes("message_stop");

    if (!hasMessageStart) {
      log("Missing message_start event", "red");
      log(`  Events found: ${events.join(", ")}`, "reset");
      return false;
    }

    if (!hasContentDelta) {
      log("Missing content_block_delta event", "red");
      log(`  Events found: ${events.join(", ")}`, "reset");
      return false;
    }

    if (!hasMessageStop) {
      log("Missing message_stop event", "red");
      log(`  Events found: ${events.join(", ")}`, "reset");
      return false;
    }

    log(
      `Streaming OK: events=[${events.slice(0, 6).join(", ")}${events.length > 6 ? ", ..." : ""}] total=${events.length}`,
      "green",
    );
    return true;
  } catch (err) {
    log(
      `Streaming error: ${err instanceof Error ? err.message : String(err)}`,
      "red",
    );
    return false;
  }
}

async function testProxyToolUse(): Promise<boolean | null> {
  if (!hasValidCredentials()) {
    log("No Anthropic credentials found, skipping", "yellow");
    return null;
  }

  try {
    const resp = await fetchProxy("/v1/messages", {
      method: "POST",
      headers: claudeHeaders,
      body: JSON.stringify({
        model: PROXY_TEST_MODEL,
        max_tokens: 256,
        messages: [
          {
            role: "user",
            content:
              "What is the current temperature in San Francisco? Use the get_weather tool.",
          },
        ],
        tools: [
          {
            name: "get_weather",
            description: "Get the current weather for a location.",
            input_schema: {
              type: "object",
              properties: {
                location: { type: "string", description: "City name" },
              },
              required: ["location"],
            },
          },
        ],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      // Passthrough needs Claude Code cloaking — bare requests get 400 "Error"
      if (resp.status === 400 && errText.includes('"message":"Error"')) {
        log(
          "Bare request rejected by Anthropic OAuth (needs Claude Code cloaking) — SKIP",
          "yellow",
        );
        return null;
      }
      log(
        `Tool use returned ${resp.status}: ${errText.substring(0, 200)}`,
        "red",
      );
      return false;
    }

    const body = (await resp.json()) as {
      type?: string;
      content?: Array<{
        type?: string;
        name?: string;
        text?: string;
        input?: unknown;
      }>;
      stop_reason?: string;
    };

    if (body.type !== "message") {
      log(`Expected type="message", got "${body.type}"`, "red");
      return false;
    }

    // Model may respond with tool_use or text — both are valid
    const hasToolUse = body.content?.some((b) => b.type === "tool_use");
    const hasText = body.content?.some((b) => b.type === "text");

    if (!hasToolUse && !hasText) {
      log("Expected at least text or tool_use in content", "red");
      return false;
    }

    if (hasToolUse) {
      const toolBlock = body.content!.find((b) => b.type === "tool_use")!;
      log(
        `Tool use OK: tool="${toolBlock.name}" stop_reason=${body.stop_reason}`,
        "green",
      );
    } else {
      log(
        `Tool use OK (text response): stop_reason=${body.stop_reason}`,
        "green",
      );
    }
    return true;
  } catch (err) {
    log(
      `Tool use error: ${err instanceof Error ? err.message : String(err)}`,
      "red",
    );
    return false;
  }
}

async function testProxyMultiTurn(): Promise<boolean | null> {
  if (!hasValidCredentials()) {
    log("No Anthropic credentials found, skipping", "yellow");
    return null;
  }

  try {
    const resp = await fetchProxy("/v1/messages", {
      method: "POST",
      headers: claudeHeaders,
      body: JSON.stringify({
        model: PROXY_TEST_MODEL,
        max_tokens: 128,
        messages: [
          { role: "user", content: "My name is Alice. Remember that." },
          {
            role: "assistant",
            content: "Hello Alice! I'll remember your name.",
          },
          { role: "user", content: "What is my name?" },
        ],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      // Passthrough needs Claude Code cloaking — bare requests get 400 "Error"
      if (resp.status === 400 && errText.includes('"message":"Error"')) {
        log(
          "Bare request rejected by Anthropic OAuth (needs Claude Code cloaking) — SKIP",
          "yellow",
        );
        return null;
      }
      log(
        `Multi-turn returned ${resp.status}: ${errText.substring(0, 200)}`,
        "red",
      );
      return false;
    }

    const body = (await resp.json()) as {
      type?: string;
      content?: Array<{ type?: string; text?: string }>;
    };

    if (body.type !== "message") {
      log(`Expected type="message", got "${body.type}"`, "red");
      return false;
    }

    const responseText = body.content?.map((b) => b.text ?? "").join(" ") ?? "";
    const mentionsAlice = responseText.toLowerCase().includes("alice");

    if (!mentionsAlice) {
      log(
        `Model did not mention "Alice" in response: ${responseText.substring(0, 100)}`,
        "red",
      );
      return false;
    }

    log(
      `Multi-turn OK: model mentions Alice in "${responseText.substring(0, 60)}"`,
      "green",
    );
    return true;
  } catch (err) {
    log(
      `Multi-turn error: ${err instanceof Error ? err.message : String(err)}`,
      "red",
    );
    return false;
  }
}

async function testProxyStreamingToolUse(): Promise<boolean | null> {
  if (!hasValidCredentials()) {
    log("No Anthropic credentials found, skipping", "yellow");
    return null;
  }

  try {
    const resp = await fetchProxy("/v1/messages", {
      method: "POST",
      headers: claudeHeaders,
      body: JSON.stringify({
        model: PROXY_TEST_MODEL,
        max_tokens: 256,
        stream: true,
        messages: [
          {
            role: "user",
            content:
              "What is the weather in Tokyo? You must use the get_weather tool.",
          },
        ],
        tools: [
          {
            name: "get_weather",
            description: "Get the current weather for a location.",
            input_schema: {
              type: "object",
              properties: {
                location: { type: "string", description: "City name" },
              },
              required: ["location"],
            },
          },
        ],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      // Passthrough mode requires Claude Code's body-level cloaking (billing header, user_id).
      // Bare test requests get 400 "Error" — this is expected, not a proxy bug.
      if (resp.status === 400 && errText.includes('"message":"Error"')) {
        log(
          "Bare request rejected by Anthropic OAuth (needs Claude Code cloaking) — SKIP",
          "yellow",
        );
        return null;
      }
      log(
        `Streaming tool use returned ${resp.status}: ${errText.substring(0, 200)}`,
        "red",
      );
      return false;
    }

    const contentType = resp.headers.get("content-type") ?? "";
    if (!contentType.includes("text/event-stream")) {
      log(`Expected text/event-stream, got "${contentType}"`, "red");
      return false;
    }

    const text = await resp.text();
    const events = text
      .split("\n")
      .filter((line) => line.startsWith("event:"))
      .map((line) => line.replace("event: ", "").trim());

    const hasMessageStart = events.includes("message_start");

    if (!hasMessageStart) {
      log("Missing message_start event in streaming tool use", "red");
      log(`  Events found: ${events.join(", ")}`, "reset");
      return false;
    }

    // For streaming tool use, we expect content_block_start with tool_use type
    const hasContentBlockStart = events.includes("content_block_start");
    const hasContentDelta = events.includes("content_block_delta");

    if (!hasContentBlockStart && !hasContentDelta) {
      log("Missing content_block_start/delta events", "red");
      log(`  Events found: ${events.join(", ")}`, "reset");
      return false;
    }

    // Check for tool_use in the data payloads
    const hasToolData =
      text.includes('"tool_use"') || text.includes("tool_use");

    if (!hasToolData) {
      log("Missing tool_use payload in streaming response", "red");
      return false;
    }

    log(
      `Streaming tool use OK: hasToolData=${hasToolData} events=[${events.slice(0, 6).join(", ")}...] total=${events.length}`,
      "green",
    );
    return true;
  } catch (err) {
    log(
      `Streaming tool use error: ${err instanceof Error ? err.message : String(err)}`,
      "red",
    );
    return false;
  }
}

// ============================================================================
// Tests: Account Management
// ============================================================================

async function testAccountLoading(): Promise<boolean | null> {
  try {
    const resp = await fetchProxy("/status");
    if (!resp.ok) {
      log(`/status returned ${resp.status}`, "red");
      return false;
    }

    const body = (await resp.json()) as {
      stats?: {
        accounts?: Array<{ label?: string; type?: string }>;
      };
    };

    // The accounts array exists even if empty (proxy loads from TokenStore)
    if (!body.stats) {
      log("Status response missing stats field", "red");
      return false;
    }

    const accountCount = body.stats.accounts?.length ?? 0;
    log(`Accounts loaded: ${accountCount} account(s) in stats`, "green");
    if (body.stats.accounts) {
      for (const acct of body.stats.accounts) {
        log(`  - ${acct.label} (${acct.type})`, "reset");
      }
    }
    return true;
  } catch (err) {
    log(
      `Account loading error: ${err instanceof Error ? err.message : String(err)}`,
      "red",
    );
    return false;
  }
}

async function testUsageStats(): Promise<boolean | null> {
  if (!hasValidCredentials()) {
    log("No Anthropic credentials found, skipping usage stats test", "yellow");
    return null;
  }

  try {
    // Capture baseline
    const beforeResp = await fetchProxy("/status");
    const beforeBody = (await beforeResp.json()) as {
      stats?: { totalRequests?: number };
    };
    const beforeTotal = beforeBody.stats?.totalRequests ?? 0;

    // Send a request to increment stats
    const resp = await fetchProxy("/v1/messages", {
      method: "POST",
      headers: claudeHeaders,
      body: JSON.stringify({
        model: PROXY_TEST_MODEL,
        max_tokens: 32,
        messages: [{ role: "user", content: "Say OK" }],
      }),
    });

    // Even if the request fails (auth issue), the proxy should have recorded it
    await resp.text(); // drain body

    // Check stats incremented
    const afterResp = await fetchProxy("/status");
    const afterBody = (await afterResp.json()) as {
      stats?: { totalRequests?: number };
    };
    const afterTotal = afterBody.stats?.totalRequests ?? 0;

    if (afterTotal > beforeTotal) {
      log(`Usage stats incremented: ${beforeTotal} -> ${afterTotal}`, "green");
      return true;
    }

    log(
      `Usage stats did not increment: before=${beforeTotal} after=${afterTotal}`,
      "red",
    );
    return false;
  } catch (err) {
    log(
      `Usage stats error: ${err instanceof Error ? err.message : String(err)}`,
      "red",
    );
    return false;
  }
}

// ============================================================================
// Tests: Configuration
// ============================================================================

async function testProxyConfigLoading(): Promise<boolean | null> {
  // Create a temporary proxy config file with model mappings
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "proxy-test-"));
  const configPath = path.join(tmpDir, "proxy-config.yaml");

  try {
    // Write minimal YAML config using correct ModelMapping keys (from/to)
    fs.writeFileSync(
      configPath,
      `accounts:
  anthropic:
    - name: "test-account"
      apiKey: "sk-test-key"
routing:
  modelMappings:
    - from: "test-model-*"
      to: "claude-sonnet-4-6"
      provider: "anthropic"
  passthroughModels:
    - "claude-*"
`,
    );

    // Verify the file was created
    if (!fs.existsSync(configPath)) {
      log("Failed to create temp config file", "red");
      return false;
    }

    // Parse the config through the actual config parser/validator
    const { loadProxyConfig } = await import("../src/lib/proxy/proxyConfig.js");
    const parsed = await loadProxyConfig(configPath, { resolveEnv: false });

    const hasAccounts =
      parsed.accounts?.anthropic && parsed.accounts.anthropic.length > 0;
    const hasMapping =
      parsed.routing?.modelMappings &&
      parsed.routing.modelMappings.length > 0 &&
      parsed.routing.modelMappings[0].from === "test-model-*" &&
      parsed.routing.modelMappings[0].to === "claude-sonnet-4-6";
    const hasPassthrough =
      parsed.routing?.passthroughModels &&
      parsed.routing.passthroughModels.includes("claude-*");

    if (!hasAccounts || !hasMapping || !hasPassthrough) {
      log(
        `Config parsing failed: accounts=${!!hasAccounts} mapping=${!!hasMapping} passthrough=${!!hasPassthrough}`,
        "red",
      );
      return false;
    }

    log(
      `Config file parsed and validated: accounts=${!!hasAccounts} mapping=${!!hasMapping} passthrough=${!!hasPassthrough}`,
      "green",
    );
    return true;
  } catch (err) {
    log(
      `Config test error: ${err instanceof Error ? err.message : String(err)}`,
      "red",
    );
    return false;
  } finally {
    // Cleanup
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      /* best effort */
    }
  }
}

// ============================================================================
// Tests: Shutdown
// ============================================================================

async function testProxyShutdown(): Promise<boolean | null> {
  if (!proxyProcess) {
    log("No proxy process to shut down (already stopped?)", "yellow");
    return null;
  }

  const pid = proxyProcess.pid;
  log(`Stopping proxy (PID: ${pid})...`, "cyan");

  await stopProxy();

  // Verify process is gone
  try {
    // Small delay for process cleanup
    await new Promise((r) => setTimeout(r, 1000));

    if (pid) {
      process.kill(pid, 0); // throws if process doesn't exist
      log(`Process ${pid} is still running after shutdown`, "red");
      return false;
    }
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ESRCH") {
      log(`Proxy process ${pid} exited cleanly`, "green");
      return true;
    }
    if (code === "EPERM") {
      // Process exists but we can't signal it — still alive
      log(`Process ${pid} still exists (EPERM)`, "red");
      return false;
    }
  }

  log("Proxy shutdown verified", "green");
  return true;
}

// ============================================================================
// Tests: OpenCode client auto-configuration (in-process, throwaway HOME)
// ============================================================================

/**
 * OpenCode resolves its global config with the unmodified `xdg-basedir`
 * package — `XDG_CONFIG_HOME || ~/.config`, with no platform branch. The proxy
 * used to special-case darwin to `~/Library/Application Support/opencode`,
 * which OpenCode never reads, so auto-configuration silently no-opped on every
 * Mac.
 */
async function testOpenCodeConfigDirIsXdgOnAllPlatforms(): Promise<boolean> {
  const { __openCodeTestHooks } =
    await import("../src/cli/proxy-clients/openCode.js");
  const prevXdg = process.env.XDG_CONFIG_HOME;
  try {
    process.env.XDG_CONFIG_HOME = "/tmp/neurolink-xdg-probe";
    const dir = __openCodeTestHooks.getOpenCodeConfigDir();
    if (dir !== path.join("/tmp/neurolink-xdg-probe", "opencode")) {
      log(
        `OpenCode config dir ignored XDG_CONFIG_HOME on ${process.platform}`,
        "red",
      );
      return false;
    }

    delete process.env.XDG_CONFIG_HOME;
    const fallback = __openCodeTestHooks.getOpenCodeConfigDir();
    if (fallback !== path.join(os.homedir(), ".config", "opencode")) {
      log(
        `OpenCode config dir did not fall back to ~/.config on ${process.platform}`,
        "red",
      );
      return false;
    }
    return true;
  } finally {
    if (prevXdg === undefined) {
      delete process.env.XDG_CONFIG_HOME;
    } else {
      process.env.XDG_CONFIG_HOME = prevXdg;
    }
  }
}

/**
 * The writer must report whether it actually wrote. It used to return void, so
 * the caller printed "Auto-configured OpenCode settings" even when OpenCode was
 * absent and nothing had been written.
 */
async function testOpenCodeWriterReportsWhetherItWrote(): Promise<boolean> {
  const { __openCodeTestHooks } =
    await import("../src/cli/proxy-clients/openCode.js");
  const prevXdg = process.env.XDG_CONFIG_HOME;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "neurolink-opencode-"));
  try {
    // OpenCode absent: the config dir does not exist.
    process.env.XDG_CONFIG_HOME = path.join(root, "absent");
    const missing = await __openCodeTestHooks.setOpenCodeProxySettings(
      "http://127.0.0.1:55669/v1",
    );
    if (missing !== false) {
      log(
        `OpenCode writer claimed success with no config dir (got ${String(missing)})`,
        "red",
      );
      return false;
    }

    // OpenCode present: the config dir exists.
    const present = path.join(root, "present");
    fs.mkdirSync(path.join(present, "opencode"), { recursive: true });
    process.env.XDG_CONFIG_HOME = present;
    const wrote = await __openCodeTestHooks.setOpenCodeProxySettings(
      "http://127.0.0.1:55669/v1",
    );
    if (wrote !== true) {
      log(
        `OpenCode writer did not report a successful write (got ${String(wrote)})`,
        "red",
      );
      return false;
    }

    const written = JSON.parse(
      fs.readFileSync(__openCodeTestHooks.getOpenCodeConfigPath(), "utf8"),
    ) as { provider?: { neurolink?: { options?: { baseURL?: string } } } };
    if (
      written.provider?.neurolink?.options?.baseURL !==
      "http://127.0.0.1:55669/v1"
    ) {
      log("OpenCode writer did not record the proxy base URL", "red");
      return false;
    }
    return true;
  } finally {
    if (prevXdg === undefined) {
      delete process.env.XDG_CONFIG_HOME;
    } else {
      process.env.XDG_CONFIG_HOME = prevXdg;
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
}

// ============================================================================
// Tests: Gemini CLI Door (GOOGLE_GEMINI_BASE_URL round-trip)
// ============================================================================

/**
 * The Gemini CLI (and any `@google/genai`-based client) honours
 * `GOOGLE_GEMINI_BASE_URL` and, for a non-Vertex client, builds requests as
 * `{baseUrl}/v1beta/models/{model}:generateContent` — traced from
 * `getBaseUrl()` / `tModel()` / the `'{model}:generateContent'` template in
 * `@google/genai`'s bundled client (`node_modules/@google/genai/dist/node/index.cjs`).
 * That is also the path `src/lib/proxy/geminiFormat.ts`'s header comment says
 * was "verified live" against this proxy before any route existed, returning
 * a 404.
 *
 * The response shape asserted below matches `buildGeminiResponse()` in
 * `src/lib/proxy/geminiFormat.ts` exactly: `candidates[0].content.parts[0].text`
 * plus `usageMetadata.{promptTokenCount,candidatesTokenCount,totalTokenCount}`.
 *
 * Prove routing with the door's local validation response before any provider
 * dispatch. An upstream provider can legitimately return 404, so inference
 * status alone cannot distinguish a missing route from a missing model.
 * Inference requires explicit live-test opt-in; the isolated route-accounting
 * suite exercises valid Gemini responses with deterministic fake providers.
 */
async function testGeminiDoorGenerateContent(): Promise<boolean | null> {
  try {
    // A catch-all must not be mistaken for a registered Gemini route.
    const sentinel = await fetchProxy(
      "/__gemini_door_e2e_sentinel_never_registered__",
    );
    if (sentinel.status !== 404) {
      log(
        `Baseline sentinel path returned ${sentinel.status}, not 404 — ` +
          "the unmatched-route contract has changed",
        "red",
      );
      return false;
    }

    const model = process.env.GOOGLE_GEMINI_TEST_MODEL || "gemini-2.5-flash";
    const endpoint = `/v1beta/models/${model}:generateContent`;
    const headers = {
      "Content-Type": "application/json",
      // @google/genai sends this even for a custom base URL. The proxy uses
      // server-managed credentials, so the placeholder is inert.
      "x-goog-api-key": "neurolink-proxy-e2e-placeholder",
    };
    const validation = await fetchProxy(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({ contents: [] }),
    });
    const validationText = await validation.text();
    if (
      validation.status !== 400 ||
      !validation.headers.get("content-type")?.includes("application/json")
    ) {
      log(
        `Gemini door local validation returned ${validation.status}; expected ` +
          `400 JSON without provider dispatch: ${validationText.slice(0, 200)}`,
        "red",
      );
      return false;
    }
    const validationBody = JSON.parse(validationText) as {
      error?: { code?: number; status?: string; message?: string };
    };
    if (
      validationBody.error?.code !== 400 ||
      validationBody.error.status !== "INVALID_ARGUMENT" ||
      validationBody.error.message !==
        "Request must include a non-empty 'contents' array"
    ) {
      log(
        "Gemini door did not return its local contents-validation error: " +
          validationText.slice(0, 200),
        "red",
      );
      return false;
    }
    if (!LIVE_PROXY_TESTS_ALLOWED) {
      log(
        "Gemini door routing and local validation verified; inference skipped " +
          "without explicit live-test opt-in",
        "yellow",
      );
      return null;
    }

    // --- Drive the door the way the Gemini CLI does (live opt-in only) -------
    const resp = await fetchProxy(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: "Reply with exactly: PROXY_TEST_OK" }],
          },
        ],
        generationConfig: { maxOutputTokens: 64, temperature: 0 },
      }),
    });

    if (resp.status === 400) {
      // 400 is the door's OWN request-shape rejection: buildGeminiErrorResponse
      // answers 400 when `contents` is missing or empty. This test builds the
      // body itself and always sends one user turn, so a 400 means the request
      // contract moved underneath it — never a missing credential. Skipping
      // here would report SKIP on exactly the regression this test exists to
      // catch.
      const badReqText = await resp.text();
      log(
        "Gemini door answered 400 to a well-formed generateContent body — " +
          `the request-shape contract has changed: ${badReqText.slice(0, 200)}`,
        "red",
      );
      return false;
    }

    if (!resp.ok) {
      // Routing was proved independently above. Provider failures, including
      // a preserved upstream404, cannot establish a missing local route.
      const errText = await resp.text();
      log(
        `Gemini door reachable but live inference returned ${resp.status}: ` +
          errText.slice(0, 200),
        "yellow",
      );
      return null;
    }

    // --- Route matched AND produced a real answer (live creds only) --------
    const body = (await resp.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
      usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
      };
    };

    const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== "string" || text.length === 0) {
      log(
        "Gemini door returned 200 but candidates[0].content.parts[0].text " +
          `is missing/empty: ${JSON.stringify(body).slice(0, 200)}`,
        "red",
      );
      return false;
    }

    const usage = body.usageMetadata;
    if (
      typeof usage?.promptTokenCount !== "number" ||
      typeof usage?.candidatesTokenCount !== "number" ||
      typeof usage?.totalTokenCount !== "number"
    ) {
      log(
        "Gemini door returned 200 but usageMetadata is missing " +
          "promptTokenCount/candidatesTokenCount/totalTokenCount",
        "red",
      );
      return false;
    }

    log(
      `Gemini door round-trip OK (model=${model}): "${text.slice(0, 60)}"`,
      "green",
    );
    return true;
  } catch (err) {
    log(
      `Gemini door test error: ${err instanceof Error ? err.message : String(err)}`,
      "red",
    );
    return false;
  }
}

/**
 * Codex was the one configurator with no apply/restore round-trip test.
 *
 * It is also the one with the most to get wrong: unlike the other four it edits
 * TOML by regex rather than round-tripping JSON, it keeps its snapshot in a
 * sidecar file rather than inside the config, and it rewrites a top-level
 * selector line that must stay in the preamble — a `model_provider` captured
 * from inside a `[profiles.*]` table would be written back as the global
 * selector on restore.
 *
 * This drives the real writer against a real config containing exactly that
 * hazard: a user selector, unrelated keys, and a profile table with its own
 * model_provider.
 */
async function testCodexConfiguratorRoundTrip(): Promise<boolean> {
  const { __codexClientTestHooks } =
    await import("../src/cli/proxy-clients/codex.js");
  const url = "http://127.0.0.1:55669";

  const runCase = async (
    label: string,
    preambleSelector: string | null,
    check: (afterApply: string, afterRestore: string) => string | null,
  ): Promise<boolean> => {
    const prevHome = process.env.HOME;
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "neurolink-codex-"));
    try {
      process.env.HOME = root;
      fs.mkdirSync(path.join(root, ".codex"), { recursive: true });
      const configPath = __codexClientTestHooks.getCodexConfigPath();
      fs.writeFileSync(
        configPath,
        [
          'model = "gpt-5.1-codex"',
          ...(preambleSelector ? [preambleSelector] : []),
          'approval_policy = "on-request"',
          "",
          // The hazard: a profile table with its own selector. It must never
          // be mistaken for the global one.
          "[profiles.work]",
          'model_provider = "some-other-provider"',
          "",
        ].join("\n"),
      );

      if (!(await __codexClientTestHooks.setCodexProxySettings(url))) {
        log(`Codex ${label}: writer reported no write`, "red");
        return false;
      }
      const afterApply = fs.readFileSync(configPath, "utf8");
      if (!(await __codexClientTestHooks.clearCodexProxySettings(url))) {
        log(`Codex ${label}: restore reported that it did nothing`, "red");
        return false;
      }
      const afterRestore = fs.readFileSync(configPath, "utf8");

      const failure = check(afterApply, afterRestore);
      if (failure) {
        log(`Codex ${label}: ${failure}`, "red");
        return false;
      }
      return true;
    } finally {
      if (prevHome === undefined) {
        delete process.env.HOME;
      } else {
        process.env.HOME = prevHome;
      }
      fs.rmSync(root, { recursive: true, force: true });
    }
  };

  // Case A — the user had a global selector. It must come back verbatim.
  const withSelector = await runCase(
    "with a user selector",
    'model_provider = "openai"',
    (applied, restored) => {
      if (!/^model_provider = "neurolink"$/m.test(applied)) {
        return "apply did not point the selector at the proxy";
      }
      if (!applied.includes("[model_providers.neurolink]")) {
        return "apply did not write its managed provider table";
      }
      if (!/^approval_policy = "on-request"$/m.test(applied)) {
        return "apply disturbed an unrelated top-level key";
      }
      if (!/^model_provider = "openai"$/m.test(restored)) {
        return "restore did not put the user's selector back";
      }
      if (restored.includes("neurolink")) {
        return "restore left its managed block behind";
      }
      return null;
    },
  );
  if (!withSelector) {
    return false;
  }

  // Case B — no global selector, only a profile's. This is what separates a
  // preamble-scoped snapshot from a document-wide one: matched document-wide,
  // the profile's provider is captured and then written back as the GLOBAL
  // selector, silently repointing every Codex run at another provider.
  return await runCase("with only a profile selector", null, (_a, restored) => {
    // Scope to the preamble. A bare /^model_provider/m also matches the line
    // inside [profiles.work], which is legitimate and must stay.
    const preamble = restored.split(/^\[/m)[0];
    if (/^model_provider = /m.test(preamble)) {
      return "restore invented a global selector the user never had";
    }
    if (!restored.includes('model_provider = "some-other-provider"')) {
      return "restore lost the profile table's own provider";
    }
    return null;
  });
}

/**
 * Grok Build is a TOML client. The writer must add the proxy catalog without
 * remapping built-in grok-4.6, must set context_window to the upstream limit
 * (Grok compacts; the proxy does not truncate), must send Claude models
 * through the messages door, and must turn reasoning off on Haiku because
 * Grok's xhigh becomes Anthropic adaptive thinking which Haiku 4.5 rejects.
 */
async function testGrokConfiguratorDetectsInstall(): Promise<boolean> {
  const { grokConfigurator } = await import("../src/cli/proxy-clients/grok.js");
  const prevHome = process.env.HOME;
  const prevGrokHome = process.env.GROK_HOME;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "neurolink-grok-detect-"));
  try {
    delete process.env.GROK_HOME;
    process.env.HOME = root;
    if (await grokConfigurator.detect()) {
      log("Grok detect() was true with no ~/.grok directory", "red");
      return false;
    }
    fs.mkdirSync(path.join(root, ".grok"), { recursive: true });
    if (!(await grokConfigurator.detect())) {
      log("Grok detect() was false after ~/.grok was created", "red");
      return false;
    }
    return true;
  } finally {
    if (prevHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = prevHome;
    }
    if (prevGrokHome === undefined) {
      delete process.env.GROK_HOME;
    } else {
      process.env.GROK_HOME = prevGrokHome;
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
}

async function testGrokConfiguratorRoundTrip(): Promise<boolean> {
  const { grokConfigurator, __grokTestHooks } =
    await import("../src/cli/proxy-clients/grok.js");
  const prevHome = process.env.HOME;
  const prevGrokHome = process.env.GROK_HOME;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "neurolink-grok-"));
  const url = "http://127.0.0.1:55669";
  try {
    delete process.env.GROK_HOME;
    process.env.HOME = root;
    fs.mkdirSync(path.join(root, ".grok"), { recursive: true });
    const configPath = __grokTestHooks.getGrokConfigPath();
    const original = [
      "[cli]",
      'installer = "internal"',
      "",
      "[models]",
      'default = "grok-4.6"',
      'default_reasoning_effort = "xhigh"',
      "",
    ].join("\n");
    fs.writeFileSync(configPath, original);

    if (!(await grokConfigurator.apply(url))) {
      log("Grok writer reported no write", "red");
      return false;
    }
    const applied = fs.readFileSync(configPath, "utf8");
    if (!applied.includes('default = "grok-4.6"')) {
      log("Grok writer changed the default model", "red");
      return false;
    }
    if (!applied.includes('base_url = "http://127.0.0.1:55669/v1"')) {
      log("Grok writer did not point models at the /v1 door", "red");
      return false;
    }
    if (!applied.includes("[model.claude-sonnet-4-6]")) {
      log("Grok writer omitted claude-sonnet-4-6", "red");
      return false;
    }
    if (!applied.includes('api_backend = "messages"')) {
      log(
        "Grok writer did not use the Anthropic messages door for Claude",
        "red",
      );
      return false;
    }
    if (!applied.includes("context_window = 1000000")) {
      log("Grok writer did not set Sonnet 4.6's 1M compaction window", "red");
      return false;
    }
    if (!applied.includes("[model.claude-haiku-4-5]")) {
      log("Grok writer omitted claude-haiku-4-5", "red");
      return false;
    }
    if (!applied.includes("supports_reasoning_effort = false")) {
      log("Grok writer left Haiku able to send adaptive thinking", "red");
      return false;
    }
    const sonnetStart = applied.indexOf("[model.claude-sonnet-4-6]");
    const haikuStart = applied.indexOf("[model.claude-haiku-4-5]");
    const sonnetBlock = applied.slice(
      sonnetStart,
      haikuStart === -1 ? undefined : haikuStart,
    );
    if (sonnetBlock.includes("supports_reasoning_effort = false")) {
      log("Grok writer disabled reasoning on Sonnet 4.6", "red");
      return false;
    }
    if (!applied.includes('[model."gemini-2.5-pro"]')) {
      log("Grok writer did not quote gemini-2.5-pro (TOML dotted key)", "red");
      return false;
    }
    if (!applied.includes('api_backend = "chat_completions"')) {
      log("Grok writer did not use chat_completions for Gemini", "red");
      return false;
    }
    if (
      applied.includes("[model.grok-4.6]") ||
      applied.includes('[model."grok-4.6"]')
    ) {
      log("Grok writer remapped built-in grok-4.6 onto the proxy", "red");
      return false;
    }

    if (!(await grokConfigurator.restore(url))) {
      log("Grok restore reported that it did nothing", "red");
      return false;
    }
    const restored = fs.readFileSync(configPath, "utf8");
    if (restored.includes("neurolink-proxy")) {
      log("Grok restore left the managed block behind", "red");
      return false;
    }
    if (!restored.includes('default = "grok-4.6"')) {
      log("Grok restore lost the user's default model", "red");
      return false;
    }
    return true;
  } finally {
    if (prevHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = prevHome;
    }
    if (prevGrokHome === undefined) {
      delete process.env.GROK_HOME;
    } else {
      process.env.GROK_HOME = prevGrokHome;
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
}

async function testGrokRestoreRefusesWithoutSnapshot(): Promise<boolean> {
  const { __grokTestHooks } = await import("../src/cli/proxy-clients/grok.js");
  const prevHome = process.env.HOME;
  const prevGrokHome = process.env.GROK_HOME;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "neurolink-grok-nosnap-"));
  const url = "http://127.0.0.1:55669/v1";
  try {
    delete process.env.GROK_HOME;
    process.env.HOME = root;
    fs.mkdirSync(path.join(root, ".grok"), { recursive: true });
    fs.writeFileSync(
      __grokTestHooks.getGrokConfigPath(),
      `${await __grokTestHooks.buildGrokManagedBlock(url)}\n`,
    );
    const restored = await __grokTestHooks.clearGrokProxySettings(url);
    if (restored) {
      log("Grok restore stripped a block with no snapshot", "red");
      return false;
    }
    const after = fs.readFileSync(__grokTestHooks.getGrokConfigPath(), "utf8");
    if (!after.includes("neurolink-proxy")) {
      log("Grok restore destroyed a block it could not prove it owned", "red");
      return false;
    }
    return true;
  } finally {
    if (prevHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = prevHome;
    }
    if (prevGrokHome === undefined) {
      delete process.env.GROK_HOME;
    } else {
      process.env.GROK_HOME = prevGrokHome;
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
}

async function testGrokRestoreRefusesForeignUrl(): Promise<boolean> {
  const { grokConfigurator, __grokTestHooks } =
    await import("../src/cli/proxy-clients/grok.js");
  const prevHome = process.env.HOME;
  const prevGrokHome = process.env.GROK_HOME;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "neurolink-grok-url-"));
  try {
    delete process.env.GROK_HOME;
    process.env.HOME = root;
    fs.mkdirSync(path.join(root, ".grok"), { recursive: true });
    await grokConfigurator.apply("http://127.0.0.1:55669");
    const restored = await grokConfigurator.restore("http://127.0.0.1:9");
    if (restored) {
      log("Grok restore clobbered a block pointing at another proxy", "red");
      return false;
    }
    const after = fs.readFileSync(__grokTestHooks.getGrokConfigPath(), "utf8");
    if (!after.includes("http://127.0.0.1:55669/v1")) {
      log("Grok restore removed a foreign-owned block", "red");
      return false;
    }
    return true;
  } finally {
    if (prevHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = prevHome;
    }
    if (prevGrokHome === undefined) {
      delete process.env.GROK_HOME;
    } else {
      process.env.GROK_HOME = prevGrokHome;
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
}

async function testGrokCatalogWindowsAndBackends(): Promise<boolean> {
  const { __grokTestHooks } = await import("../src/cli/proxy-clients/grok.js");
  const sonnet = __grokTestHooks.classifyGrokProxyModel("claude-sonnet-4-6");
  if (sonnet.apiBackend !== "messages" || sonnet.contextWindow !== 1_000_000) {
    log("claude-sonnet-4-6 is not messages/1M", "red");
    return false;
  }
  if (sonnet.supportsReasoningEffort !== true) {
    log("claude-sonnet-4-6 should keep adaptive thinking", "red");
    return false;
  }
  const haiku = __grokTestHooks.classifyGrokProxyModel("claude-haiku-4-5");
  if (haiku.apiBackend !== "messages" || haiku.contextWindow !== 200_000) {
    log("claude-haiku-4-5 is not messages/200k", "red");
    return false;
  }
  if (haiku.supportsReasoningEffort !== false) {
    log("claude-haiku-4-5 must not send adaptive thinking", "red");
    return false;
  }
  const gemini = __grokTestHooks.classifyGrokProxyModel("gemini-2.5-pro");
  if (
    gemini.apiBackend !== "chat_completions" ||
    gemini.contextWindow !== 1_048_576
  ) {
    log("gemini-2.5-pro is not chat_completions/1M", "red");
    return false;
  }
  const alias = __grokTestHooks.classifyGrokProxyModel("enterprise-sonnet", {
    from: "enterprise-sonnet",
    to: "claude-sonnet-4-6",
    provider: "anthropic",
  });
  if (alias.id !== "enterprise-sonnet") {
    log("routed alias did not keep from as the picker id", "red");
    return false;
  }
  if (alias.apiBackend !== "messages" || alias.contextWindow !== 1_000_000) {
    log(
      "enterprise-sonnet was classified from its alias name, not the target",
      "red",
    );
    return false;
  }
  if (alias.supportsReasoningEffort !== true) {
    log("enterprise-sonnet should inherit Sonnet 4.6 adaptive thinking", "red");
    return false;
  }
  const thinking = __grokTestHooks.classifyGrokProxyModel(
    "claude-sonnet-4-thinking",
    {
      from: "claude-sonnet-4-thinking",
      to: "claude-sonnet-4-6",
      provider: "anthropic",
    },
  );
  if (thinking.contextWindow !== 1_000_000) {
    log("claude-sonnet-4-thinking used the alias window instead of 1M", "red");
    return false;
  }
  // `providerFromMapping` recognises anthropic/claude, openai and
  // vertex/google/google-ai/gemini; any other string falls through to
  // inferring the backend from the *target* id. That branch is reachable from
  // a real config: `ModelMapping.provider` is a required string and
  // `parseRoutingConfig` coerces an absent or empty one to "anthropic", so
  // neither ever arrives here — but any other value is passed through
  // verbatim, so a mapping naming a provider this writer does not know about
  // lands in the fallback intact. The alias name carries no clue on its own:
  // "enterprise-sonnet" says nothing about Anthropic.
  const unknownProvider = __grokTestHooks.classifyGrokProxyModel(
    "enterprise-sonnet",
    {
      from: "enterprise-sonnet",
      to: "claude-sonnet-4-6",
      provider: "bedrock",
    },
  );
  if (unknownProvider.apiBackend !== "messages") {
    log("an unrecognised provider did not fall back to the target id", "red");
    return false;
  }
  if (unknownProvider.supportsReasoningEffort !== true) {
    log("an unrecognised provider lost the target's adaptive thinking", "red");
    return false;
  }
  // The window is deliberately NOT derived the same way. `windowProvider`
  // prefers the declared provider precisely so a Bedrock-hosted Claude gets
  // Bedrock's 200K window rather than Anthropic-direct's 1M — the backend
  // comes from the target, the window from where it is actually served.
  // Asserting it here pins that split, which is the surprising half.
  if (unknownProvider.contextWindow !== 200_000) {
    log("the window was not looked up under the declared provider", "red");
    return false;
  }
  return true;
}

/**
 * `~/.neurolink/proxy-config.yaml` is YAML. JSON.parse throws on comments and
 * unquoted keys, and the previous loader swallowed that into `[]`, so
 * routing.model-mappings never reached the Grok catalog.
 */
async function testGrokYamlRoutedMappings(): Promise<boolean> {
  const { grokConfigurator, __grokTestHooks } =
    await import("../src/cli/proxy-clients/grok.js");
  const prevHome = process.env.HOME;
  const prevGrokHome = process.env.GROK_HOME;
  const prevRoutedFrom = process.env.GROK_TEST_ROUTED_FROM;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "neurolink-grok-yaml-"));
  const routedId = "claude-sonnet-4-thinking";
  let yamlPath: string | undefined;
  try {
    delete process.env.GROK_HOME;
    process.env.HOME = root;
    process.env.GROK_TEST_ROUTED_FROM = routedId;
    fs.mkdirSync(__grokTestHooks.getGrokConfigDir(), { recursive: true });
    yamlPath = path.join(os.homedir(), ".neurolink", "proxy-config.yaml");
    fs.mkdirSync(path.dirname(yamlPath), { recursive: true });
    const yaml = [
      "# YAML, not JSON. JSON.parse must throw on this file.",
      "routing:",
      "  model-mappings:",
      "    - from: ${GROK_TEST_ROUTED_FROM}",
      "      to: claude-sonnet-4-6",
      "      provider: anthropic",
      "    - from: grok-4.6",
      "      to: claude-sonnet-4-6",
      "      provider: anthropic",
      "",
    ].join("\n");
    fs.writeFileSync(yamlPath, yaml);
    try {
      JSON.parse(yaml);
      log(
        "YAML fixture parsed as JSON; the test no longer covers the bug",
        "red",
      );
      return false;
    } catch {
      // expected: comments and unquoted keys are not JSON
    }

    const routed = await __grokTestHooks.loadRoutedModelIds();
    if (!routed.includes(routedId)) {
      log(
        `YAML mappings did not interpolate to ${routedId}: ${JSON.stringify(routed)}`,
        "red",
      );
      return false;
    }
    if (!routed.includes("grok-4.6")) {
      log("YAML grok-4.6 mapping was dropped before the catalog skip", "red");
      return false;
    }

    const ids = await __grokTestHooks.catalogModelIds();
    if (!ids.includes(routedId)) {
      log("catalog omitted the YAML-mapped model id", "red");
      return false;
    }
    if (ids.some((id) => id.startsWith("grok-"))) {
      log("catalog included a grok-* id from model-mappings", "red");
      return false;
    }

    if (!(await grokConfigurator.apply("http://127.0.0.1:55669"))) {
      log("Grok writer reported no write with YAML mappings", "red");
      return false;
    }
    const applied = fs.readFileSync(
      __grokTestHooks.getGrokConfigPath(),
      "utf8",
    );
    if (!applied.includes(`[model.${routedId}]`)) {
      log("Grok writer omitted the YAML-mapped model from config.toml", "red");
      return false;
    }
    if (
      applied.includes("[model.grok-4.6]") ||
      applied.includes('[model."grok-4.6"]')
    ) {
      log("Grok writer remapped grok-4.6 from YAML mappings", "red");
      return false;
    }
    return true;
  } finally {
    if (prevHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = prevHome;
    }
    if (prevGrokHome === undefined) {
      delete process.env.GROK_HOME;
    } else {
      process.env.GROK_HOME = prevGrokHome;
    }
    if (prevRoutedFrom === undefined) {
      delete process.env.GROK_TEST_ROUTED_FROM;
    } else {
      process.env.GROK_TEST_ROUTED_FROM = prevRoutedFrom;
    }
    if (yamlPath !== undefined) {
      fs.rmSync(yamlPath, { force: true });
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
}

/**
 * `proxy start --config` loads mappings from that file, not the default
 * ~/.neurolink/proxy-config.yaml. The Grok writer has to use the same path
 * or the catalog silently drifts from GET /v1/models.
 */
async function testGrokCustomConfigPath(): Promise<boolean> {
  const { grokConfigurator, __grokTestHooks } =
    await import("../src/cli/proxy-clients/grok.js");
  const { applyAllClients } =
    await import("../src/cli/proxy-clients/registry.js");
  const prevHome = process.env.HOME;
  const prevGrokHome = process.env.GROK_HOME;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "neurolink-grok-cfg-"));
  const defaultId = "claude-from-default";
  const customId = "claude-from-custom";
  try {
    delete process.env.GROK_HOME;
    process.env.HOME = root;
    fs.mkdirSync(__grokTestHooks.getGrokConfigDir(), { recursive: true });
    const defaultPath = path.join(
      os.homedir(),
      ".neurolink",
      "proxy-config.yaml",
    );
    fs.mkdirSync(path.dirname(defaultPath), { recursive: true });
    fs.writeFileSync(
      defaultPath,
      [
        "# default path",
        "routing:",
        "  model-mappings:",
        `    - from: ${defaultId}`,
        "      to: claude-sonnet-4-6",
        "      provider: anthropic",
        "",
      ].join("\n"),
    );
    const customPath = path.join(root, "elsewhere", "proxy-config.yaml");
    fs.mkdirSync(path.dirname(customPath), { recursive: true });
    fs.writeFileSync(
      customPath,
      [
        "# custom --config path",
        "routing:",
        "  model-mappings:",
        `    - from: ${customId}`,
        "      to: claude-sonnet-4-6",
        "      provider: anthropic",
        "",
      ].join("\n"),
    );

    const fromDefault = await __grokTestHooks.loadRoutedModelIds();
    if (!fromDefault.includes(defaultId) || fromDefault.includes(customId)) {
      log(`default path mappings wrong: ${JSON.stringify(fromDefault)}`, "red");
      return false;
    }
    const fromCustom = await __grokTestHooks.loadRoutedModelIds(customPath);
    if (!fromCustom.includes(customId) || fromCustom.includes(defaultId)) {
      log(`custom path mappings wrong: ${JSON.stringify(fromCustom)}`, "red");
      return false;
    }

    if (
      !(await grokConfigurator.apply("http://127.0.0.1:55669", {
        configPath: customPath,
      }))
    ) {
      log("Grok apply with custom configPath reported no write", "red");
      return false;
    }
    const applied = fs.readFileSync(
      __grokTestHooks.getGrokConfigPath(),
      "utf8",
    );
    if (!applied.includes(`[model.${customId}]`)) {
      log("Grok writer omitted the --config mapping", "red");
      return false;
    }
    if (applied.includes(`[model.${defaultId}]`)) {
      log("Grok writer used the default path despite --config", "red");
      return false;
    }

    const results = await applyAllClients("http://127.0.0.1:9", {
      configPath: customPath,
    });
    const grok = results.find((result) => result.id === "grok");
    if (grok?.applied !== true) {
      log("applyAllClients did not apply grok with a custom configPath", "red");
      return false;
    }
    const afterAll = fs.readFileSync(
      __grokTestHooks.getGrokConfigPath(),
      "utf8",
    );
    if (!afterAll.includes("http://127.0.0.1:9/v1")) {
      log(
        "applyAllClients did not forward configPath through grok apply",
        "red",
      );
      return false;
    }
    if (!afterAll.includes(`[model.${customId}]`)) {
      log("applyAllClients dropped the custom mapping", "red");
      return false;
    }
    return true;
  } finally {
    if (prevHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = prevHome;
    }
    if (prevGrokHome === undefined) {
      delete process.env.GROK_HOME;
    } else {
      process.env.GROK_HOME = prevGrokHome;
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
}

async function testGrokRoutedAliasUsesTargetMetadata(): Promise<boolean> {
  const { grokConfigurator, __grokTestHooks } =
    await import("../src/cli/proxy-clients/grok.js");
  const prevHome = process.env.HOME;
  const prevGrokHome = process.env.GROK_HOME;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "neurolink-grok-alias-"));
  try {
    delete process.env.GROK_HOME;
    process.env.HOME = root;
    fs.mkdirSync(__grokTestHooks.getGrokConfigDir(), { recursive: true });
    const yamlPath = path.join(os.homedir(), ".neurolink", "proxy-config.yaml");
    fs.mkdirSync(path.dirname(yamlPath), { recursive: true });
    fs.writeFileSync(
      yamlPath,
      [
        "routing:",
        "  model-mappings:",
        "    - from: enterprise-sonnet",
        "      to: claude-sonnet-4-6",
        "      provider: anthropic",
        "",
      ].join("\n"),
    );
    if (!(await grokConfigurator.apply("http://127.0.0.1:55669"))) {
      log("Grok apply reported no write for routed alias", "red");
      return false;
    }
    const applied = fs.readFileSync(
      __grokTestHooks.getGrokConfigPath(),
      "utf8",
    );
    const start = applied.indexOf("[model.enterprise-sonnet]");
    if (start === -1) {
      log("Grok writer omitted the routed alias picker id", "red");
      return false;
    }
    const next = applied.indexOf("\n[model.", start + 1);
    const block = applied.slice(start, next === -1 ? undefined : next);
    if (!block.includes('api_backend = "messages"')) {
      log("routed alias did not use the target's messages door", "red");
      return false;
    }
    if (!block.includes("context_window = 1000000")) {
      log("routed alias did not use the target's 1M window", "red");
      return false;
    }
    if (block.includes("supports_reasoning_effort = false")) {
      log("routed alias disabled reasoning on Sonnet 4.6", "red");
      return false;
    }
    return true;
  } finally {
    if (prevHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = prevHome;
    }
    if (prevGrokHome === undefined) {
      delete process.env.GROK_HOME;
    } else {
      process.env.GROK_HOME = prevGrokHome;
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
}

async function testGrokApplyRefusesUnreadableConfig(): Promise<boolean> {
  const { __grokTestHooks } = await import("../src/cli/proxy-clients/grok.js");
  const prevHome = process.env.HOME;
  const prevGrokHome = process.env.GROK_HOME;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "neurolink-grok-eacces-"));
  try {
    delete process.env.GROK_HOME;
    process.env.HOME = root;
    fs.mkdirSync(__grokTestHooks.getGrokConfigDir(), { recursive: true });
    const configPath = __grokTestHooks.getGrokConfigPath();
    fs.writeFileSync(configPath, "do-not-clobber\n", { mode: 0o600 });
    fs.chmodSync(configPath, 0o000);
    const wrote = await __grokTestHooks.setGrokProxySettings(
      "http://127.0.0.1:55669/v1",
    );
    fs.chmodSync(configPath, 0o600);
    if (wrote) {
      log("Grok apply rewrote an unreadable config.toml", "red");
      return false;
    }
    const after = fs.readFileSync(configPath, "utf8");
    if (after !== "do-not-clobber\n") {
      log("Grok apply clobbered an unreadable config.toml", "red");
      return false;
    }
    return true;
  } finally {
    if (prevHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = prevHome;
    }
    if (prevGrokHome === undefined) {
      delete process.env.GROK_HOME;
    } else {
      process.env.GROK_HOME = prevGrokHome;
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
}

/**
 * Grok rewrites config.toml itself. Any user-config save (`/settings`,
 * `grok mcp add`, ...) round-trips the whole document through a serializer
 * that drops every comment, both managed-block markers with them, and turns
 * the inline `extra_headers` into a `[model.<id>.extra_headers]` sub-table.
 * Measured against Grok Build 1.0.40.
 *
 * The writer found its block only by those markers, so the next apply kept
 * the unmarked tables and appended a second copy of every id. TOML rejects a
 * table declared twice and Grok refuses to start. Every proxy start, and so
 * every auto-update, appended another copy.
 */
const GROK_BLOCK_BEGIN_LINE = "# >>> neurolink-proxy (managed) >>>";
const GROK_BLOCK_END_LINE = "# <<< neurolink-proxy (managed) <<<";

const GROK_USER_PREAMBLE = [
  "[cli]",
  'installer = "internal"',
  "",
  "[ui]",
  "yolo = false",
  "",
  "[models]",
  'default = "grok-4.6"',
  'default_reasoning_effort = "xhigh"',
  "",
];

/** A managed entry in the shape Grok's own save leaves behind. */
function grokSerializedManagedModel(
  id: string,
  anthropic: boolean,
  name = `${id} (NeuroLink)`,
): string[] {
  const key = /^[A-Za-z0-9_-]+$/.test(id) ? id : JSON.stringify(id);
  return [
    `[model.${key}]`,
    `model = "${id}"`,
    `name = "${name}"`,
    'base_url = "http://127.0.0.1:55669/v1"',
    `api_backend = "${anthropic ? "messages" : "chat_completions"}"`,
    "context_window = 200000",
    ...(anthropic
      ? [
          "",
          `[model.${key}.extra_headers]`,
          'x-api-key = "neurolink-proxy"',
          'anthropic-version = "2023-06-01"',
        ]
      : ['api_key = "neurolink-proxy"']),
    "",
  ];
}

function countGrokLines(text: string, line: string): number {
  return text.split(/\r?\n/).filter((candidate) => candidate.trim() === line)
    .length;
}

async function withGrokHome(
  label: string,
  body: (configPath: string) => Promise<string | null>,
): Promise<boolean> {
  const { __grokTestHooks } = await import("../src/cli/proxy-clients/grok.js");
  const prevHome = process.env.HOME;
  const prevGrokHome = process.env.GROK_HOME;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "neurolink-grok-state-"));
  try {
    delete process.env.GROK_HOME;
    process.env.HOME = root;
    fs.mkdirSync(__grokTestHooks.getGrokConfigDir(), { recursive: true });
    const failure = await body(__grokTestHooks.getGrokConfigPath());
    if (failure) {
      log(`Grok ${label}: ${failure}`, "red");
      return false;
    }
    return true;
  } finally {
    if (prevHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = prevHome;
    }
    if (prevGrokHome === undefined) {
      delete process.env.GROK_HOME;
    } else {
      process.env.GROK_HOME = prevGrokHome;
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
}

async function testGrokApplyReplacesUnmarkedBlock(): Promise<boolean> {
  const { grokConfigurator } = await import("../src/cli/proxy-clients/grok.js");
  return withGrokHome("unmarked block", async (configPath) => {
    fs.writeFileSync(
      configPath,
      [
        ...GROK_USER_PREAMBLE,
        ...grokSerializedManagedModel("claude-opus-4-6", true),
        // TOML literal strings are as valid as basic ones.
        ...grokSerializedManagedModel("gemini-2.5-pro", false).map((line) =>
          line.replaceAll('"', "'"),
        ),
        // A sub-table ahead of its own table, another table between them.
        "[model.claude-haiku-4-5.extra_headers]",
        'x-api-key = "neurolink-proxy"',
        "",
        "[user_notes]",
        'kept = "between"',
        "",
        "[model.claude-haiku-4-5]",
        'model = "claude-haiku-4-5"',
        'base_url = "http://127.0.0.1:55669/v1"',
        "",
        // Written by an older catalog: gone from this one, still carrying
        // the name the proxy gives it.
        ...grokSerializedManagedModel(
          "claude-3-5-sonnet",
          true,
          "Claude 3.5 Sonnet (NeuroLink)",
        ).map((line) => line.replace(/^name = "(.*)"$/, 'name = """$1"""')),
        ...grokSerializedManagedModel(
          "claude-3-5-haiku",
          true,
          "Claude 3.5 Haiku (NeuroLink)",
        ).map((line) => line.replace(/^name = "(.*)"$/, "name = '''$1'''")),
        // A proxy sub-table whose own table was deleted by hand.
        "[model.retired-model.extra_headers]",
        'x-api-key = "neurolink-proxy"',
        "",
        // The credential after a multi-line-delimited string whose content
        // ends in a quote, on the same line.
        '[model."gemini-2.5-flash"]',
        'model = "gemini-2.5-flash"',
        'base_url = "http://127.0.0.1:55669/v1"',
        'extra_headers = { note = """from "grok"""", "x-api-key" = "neurolink-proxy" }',
        "",
        "# probe server, added by hand",
        // Grok appends what it adds after everything already there.
        "[mcp_servers.probe]",
        'command = "echo"',
        "",
      ].join("\n"),
    );
    if (!(await grokConfigurator.apply("http://127.0.0.1:55669"))) {
      return "writer reported no write";
    }
    const applied = fs.readFileSync(configPath, "utf8");
    for (const header of [
      "[model.claude-opus-4-6]",
      '[model."gemini-2.5-pro"]',
      "[model.claude-haiku-4-5]",
      "[model.claude-sonnet-4-6]",
    ]) {
      if (countGrokLines(applied, header) !== 1) {
        return `${header} is not declared exactly once`;
      }
    }
    for (const stale of [
      "[model.claude-opus-4-6.extra_headers]",
      "[model.claude-haiku-4-5.extra_headers]",
      "[model.'gemini-2.5-pro']",
      "[model.claude-3-5-sonnet]",
      "[model.claude-3-5-haiku]",
      "[model.retired-model.extra_headers]",
    ]) {
      if (countGrokLines(applied, stale) !== 0) {
        return `a stale managed table survived: ${stale}`;
      }
    }
    if (!applied.includes('name = "Claude Haiku 4.5 (NeuroLink)"')) {
      return "the split claude-haiku-4-5 entry was kept instead of replaced";
    }
    if (
      !applied.includes('name = "Gemini 2.5 Flash (NeuroLink)"') ||
      applied.includes('from "grok"')
    ) {
      return "the gemini-2.5-flash entry was kept instead of replaced";
    }
    if (
      countGrokLines(applied, GROK_BLOCK_BEGIN_LINE) !== 1 ||
      countGrokLines(applied, GROK_BLOCK_END_LINE) !== 1
    ) {
      return "expected exactly one begin and one end marker";
    }
    for (const kept of [
      "[mcp_servers.probe]",
      'command = "echo"',
      "yolo = false",
      "[user_notes]",
      'kept = "between"',
      "# probe server, added by hand",
    ]) {
      if (!applied.includes(kept)) {
        return `user content was lost: ${kept}`;
      }
    }
    await grokConfigurator.apply("http://127.0.0.1:55669");
    if (fs.readFileSync(configPath, "utf8") !== applied) {
      return "a second apply changed the file";
    }
    return null;
  });
}

async function testGrokApplyHealsOrphanBeginMarker(): Promise<boolean> {
  const { grokConfigurator, __grokTestHooks } =
    await import("../src/cli/proxy-clients/grok.js");
  return withGrokHome("orphan begin marker", async (configPath) => {
    const block = await __grokTestHooks.buildGrokManagedBlock(
      "http://127.0.0.1:55669/v1",
    );
    // The live failure: the end marker gone and the last managed line
    // carrying a literal backslash-n, which no TOML parser accepts.
    const damaged = block
      .replace(`${GROK_BLOCK_END_LINE}\n`, "")
      .replace(/"neurolink-proxy"\n$/, '"neurolink-proxy"\\n\n');
    if (damaged === block || !damaged.includes('"neurolink-proxy"\\n')) {
      return "fixture did not reproduce the damaged tail";
    }
    fs.writeFileSync(
      configPath,
      [
        ...GROK_USER_PREAMBLE,
        damaged,
        "[hints]",
        'kept = "user-value"',
        "",
      ].join("\n"),
    );
    await grokConfigurator.apply("http://127.0.0.1:55669");
    const first = fs.readFileSync(configPath, "utf8");
    await grokConfigurator.apply("http://127.0.0.1:55669");
    const second = fs.readFileSync(configPath, "utf8");
    if (
      !second.includes("[hints]") ||
      !second.includes('kept = "user-value"')
    ) {
      return "content after the orphaned marker was deleted";
    }
    if (second.includes('"neurolink-proxy"\\n')) {
      return "the unparseable managed line survived";
    }
    if (countGrokLines(second, "[model.claude-opus-4-6]") !== 1) {
      return "[model.claude-opus-4-6] is not declared exactly once";
    }
    if (
      countGrokLines(second, GROK_BLOCK_BEGIN_LINE) !== 1 ||
      countGrokLines(second, GROK_BLOCK_END_LINE) !== 1
    ) {
      return "expected exactly one begin and one end marker";
    }
    if (first !== second) {
      return "the first apply did not reach a fixed point";
    }
    return null;
  });
}

async function testGrokApplyKeepsUserModelWithCatalogId(): Promise<boolean> {
  const { grokConfigurator } = await import("../src/cli/proxy-clients/grok.js");
  return withGrokHome("user model with a catalog id", async (configPath) => {
    fs.writeFileSync(
      configPath,
      [
        ...GROK_USER_PREAMBLE,
        "[model.claude-opus-4-6]",
        'model = "claude-opus-4-6"',
        'base_url = "https://gateway.example.test/v1"',
        'api_backend = "messages"',
        // Strings that merely mention the placeholder assign nothing.
        `reminder = 'never set x-api-key = "neurolink-proxy" here'`,
        'legacy.api_key = "neurolink-proxy"',
        'notes = """',
        'api_key = "neurolink-proxy"',
        '"""',
        "",
        // The user's own entry behind the proxy, outside the catalog.
        "[model.my-proxy-alias]",
        'model = "claude-opus-4-6"',
        'name = "My alias through the proxy"',
        'base_url = "http://127.0.0.1:55669/v1"',
        'api_key = "neurolink-proxy"',
        "",
        "[[model.claude-haiku-4-5]]",
        'model = "claude-haiku-4-5"',
        "",
        // Belongs to the array element above, not to the proxy.
        "[model.claude-haiku-4-5.extra_headers]",
        'x-api-key = "neurolink-proxy"',
        "",
        // A model defined by dotted keys has no [model.<id>] header.
        "[model]",
        'claude-sonnet-4-20250514.model = "claude-sonnet-4-20250514"',
        'claude-sonnet-4-20250514.base_url = "https://dotted.example.test/v1"',
        'gpt-4o.base_url = "https://dotted.example.test/v1"',
        "",
        "[model.claude-sonnet-4-20250514.extra_headers]",
        'x-api-key = "neurolink-proxy"',
        "",
      ].join("\n"),
    );
    if (!(await grokConfigurator.apply("http://127.0.0.1:55669"))) {
      return "writer reported no write";
    }
    const applied = fs.readFileSync(configPath, "utf8");
    if (countGrokLines(applied, "[model.claude-opus-4-6]") !== 1) {
      return "the proxy declared the user's own model a second time";
    }
    if (
      countGrokLines(
        applied,
        'base_url = "https://gateway.example.test/v1"',
      ) !== 1 ||
      countGrokLines(applied, 'notes = """') !== 1
    ) {
      return "the user's own model was replaced";
    }
    if (countGrokLines(applied, "[model.claude-haiku-4-5]") !== 0) {
      return "the proxy declared a table over the user's array of tables";
    }
    if (countGrokLines(applied, "[model.claude-sonnet-4-20250514]") !== 0) {
      return "the proxy declared a table the user defines by dotted keys";
    }
    if (countGrokLines(applied, "[model.gpt-4o]") !== 0) {
      return "the proxy declared a table over a dotted-key model";
    }
    if (
      countGrokLines(
        applied,
        "[model.claude-sonnet-4-20250514.extra_headers]",
      ) !== 1
    ) {
      return "a sub-table of the user's dotted-key model was removed";
    }
    if (
      countGrokLines(applied, "[model.claude-haiku-4-5.extra_headers]") !== 1
    ) {
      return "a sub-table of the user's array-of-tables model was removed";
    }
    if (countGrokLines(applied, "[model.my-proxy-alias]") !== 1) {
      return "the user's own proxy-backed model was removed";
    }
    if (!applied.includes("[model.claude-sonnet-4-6]")) {
      return "the rest of the catalog was not written";
    }
    if (!(await grokConfigurator.restore("http://127.0.0.1:55669"))) {
      return "restore reported that it did nothing";
    }
    const restored = fs.readFileSync(configPath, "utf8");
    if (
      countGrokLines(
        restored,
        'base_url = "https://gateway.example.test/v1"',
      ) !== 1
    ) {
      return "restore removed the user's own model";
    }
    if (
      countGrokLines(restored, "[model.my-proxy-alias]") !== 1 ||
      countGrokLines(restored, "[[model.claude-haiku-4-5]]") !== 1 ||
      countGrokLines(restored, "[model.claude-haiku-4-5.extra_headers]") !== 1
    ) {
      return "restore removed a model the user wrote";
    }
    if (
      restored.includes("[model.claude-sonnet-4-6]") ||
      restored.includes(GROK_BLOCK_BEGIN_LINE)
    ) {
      return "restore left managed content behind";
    }
    return null;
  });
}

async function testGrokRestoreRemovesDamagedBlock(): Promise<boolean> {
  const { grokConfigurator, __grokTestHooks } =
    await import("../src/cli/proxy-clients/grok.js");
  const url = "http://127.0.0.1:55669";
  const unmarked = await withGrokHome(
    "restore, unmarked",
    async (configPath) => {
      fs.writeFileSync(configPath, GROK_USER_PREAMBLE.join("\n"));
      await grokConfigurator.apply(url);
      fs.writeFileSync(
        configPath,
        [
          ...GROK_USER_PREAMBLE,
          ...grokSerializedManagedModel("claude-opus-4-6", true),
        ].join("\n"),
      );
      if (!(await grokConfigurator.restore(url))) {
        return "restore refused the tables Grok had unmarked";
      }
      const restored = fs.readFileSync(configPath, "utf8");
      if (
        restored.includes("neurolink-proxy") ||
        restored.includes("[model.")
      ) {
        return "restore left the unmarked managed tables behind";
      }
      if (!restored.includes('default = "grok-4.6"')) {
        return "restore lost the user's default model";
      }
      return null;
    },
  );
  const orphaned = await withGrokHome(
    "restore, orphan begin",
    async (configPath) => {
      fs.writeFileSync(configPath, GROK_USER_PREAMBLE.join("\n"));
      await grokConfigurator.apply(url);
      fs.writeFileSync(
        configPath,
        fs
          .readFileSync(configPath, "utf8")
          .replace(`${GROK_BLOCK_END_LINE}\n`, ""),
      );
      const restored = await grokConfigurator.restore(url);
      const after = fs.readFileSync(configPath, "utf8");
      if (after.includes("neurolink-proxy")) {
        return restored
          ? "restore reported success but left the managed block behind"
          : "restore left the managed block behind";
      }
      if (fs.existsSync(__grokTestHooks.getGrokSnapshotPath())) {
        return "restore kept a snapshot for a block it removed";
      }
      return null;
    },
  );
  const repointed = await withGrokHome(
    "restore, one entry repointed",
    async (configPath) => {
      fs.writeFileSync(configPath, GROK_USER_PREAMBLE.join("\n"));
      await grokConfigurator.apply(url);
      // The first entry in file order, so its URL is the one read first.
      fs.writeFileSync(
        configPath,
        fs
          .readFileSync(configPath, "utf8")
          .replace(
            'base_url = "http://127.0.0.1:55669/v1"',
            'base_url = "http://127.0.0.1:1/v1"',
          ),
      );
      if (!(await grokConfigurator.restore(url))) {
        return "restore treated the whole block as foreign over one entry";
      }
      if (fs.readFileSync(configPath, "utf8").includes(GROK_BLOCK_BEGIN_LINE)) {
        return "restore left the managed block behind";
      }
      return null;
    },
  );
  return unmarked && orphaned && repointed;
}

async function testGrokApplySkipsUnchangedConfig(): Promise<boolean> {
  const { grokConfigurator } = await import("../src/cli/proxy-clients/grok.js");
  return withGrokHome("unchanged config", async (configPath) => {
    fs.writeFileSync(configPath, GROK_USER_PREAMBLE.join("\n"));
    await grokConfigurator.apply("http://127.0.0.1:55669");
    const before = fs.statSync(configPath).ino;
    if (!(await grokConfigurator.apply("http://127.0.0.1:55669"))) {
      return "a repeat apply reported no write";
    }
    if (fs.statSync(configPath).ino !== before) {
      return "a repeat apply replaced a file that already matched";
    }
    return null;
  });
}

async function testGrokApplyRefusesDuplicateTables(): Promise<boolean> {
  const { __grokTestHooks } = await import("../src/cli/proxy-clients/grok.js");
  return withGrokHome("duplicate user tables", async (configPath) => {
    const broken = ["[ui]", "yolo = false", "", "[ui]", "yolo = true", ""].join(
      "\n",
    );
    fs.writeFileSync(configPath, broken);
    if (
      await __grokTestHooks.setGrokProxySettings("http://127.0.0.1:55669/v1")
    ) {
      return "apply wrote into a config that declares [ui] twice";
    }
    if (fs.readFileSync(configPath, "utf8") !== broken) {
      return "apply changed a config it cannot parse";
    }
    if (fs.existsSync(__grokTestHooks.getGrokSnapshotPath())) {
      return "apply recorded a snapshot for a write it did not make";
    }
    // Each [[array]] element scopes the tables under it: not a repeat.
    fs.writeFileSync(
      configPath,
      [
        "[[mcp_servers]]",
        'name = "first"',
        "[mcp_servers.env]",
        'TOKEN = "1"',
        "",
        "[[mcp_servers]]",
        'name = "second"',
        "[mcp_servers.env]",
        'TOKEN = "2"',
        "",
      ].join("\n"),
    );
    if (
      !(await __grokTestHooks.setGrokProxySettings("http://127.0.0.1:55669/v1"))
    ) {
      return "apply refused array elements that each have their own sub-table";
    }
    // Nested arrays are scoped the same way: [a.b] may be an array of
    // tables under one element and a plain table under the next.
    fs.writeFileSync(
      configPath,
      ["[[a]]", "[[a.b]]", "x = 1", "", "[[a]]", "[a.b]", "y = 2", ""].join(
        "\n",
      ),
    );
    if (
      !(await __grokTestHooks.setGrokProxySettings("http://127.0.0.1:55669/v1"))
    ) {
      return "apply refused a nested array scoped under a new element";
    }
    return null;
  });
}

/**
 * Codex's own saves keep comments (measured on codex-cli 0.155.1), so its
 * managed block was never unmarked the way Grok's is. A hand edit or another
 * tool can still drop a marker, and the writer shared Grok's marker-only
 * strip: a lost end marker made the next apply eat whatever followed, and a
 * lost pair appended a second [model_providers.neurolink], which Codex cannot
 * parse.
 */
async function withCodexHome(
  label: string,
  body: (configPath: string) => Promise<string | null>,
): Promise<boolean> {
  const { __codexClientTestHooks } =
    await import("../src/cli/proxy-clients/codex.js");
  const prevHome = process.env.HOME;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "neurolink-codex-state-"));
  try {
    process.env.HOME = root;
    const configPath = __codexClientTestHooks.getCodexConfigPath();
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    const failure = await body(configPath);
    if (failure) {
      log(`Codex ${label}: ${failure}`, "red");
      return false;
    }
    return true;
  } finally {
    if (prevHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = prevHome;
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
}

const CODEX_USER_PREAMBLE = [
  'model = "gpt-5.1-codex"',
  'model_provider = "openai"',
  "",
  "[profiles.work]",
  // A profile's own selector is the user's, whatever it names.
  'model_provider = "neurolink"',
  "",
];

async function testCodexApplyReplacesUnmarkedProvider(): Promise<boolean> {
  const { __codexClientTestHooks: hooks } =
    await import("../src/cli/proxy-clients/codex.js");
  const url = "http://127.0.0.1:55669";
  const providerHeader = "[model_providers.neurolink]";
  const unmarked = await withCodexHome(
    "unmarked provider",
    async (configPath) => {
      fs.writeFileSync(configPath, CODEX_USER_PREAMBLE.join("\n"));
      await hooks.setCodexProxySettings(url);
      // Both markers gone, a note and a table of the user's after the provider.
      fs.writeFileSync(
        configPath,
        [
          ...fs
            .readFileSync(configPath, "utf8")
            .split("\n")
            .filter((line) => !line.startsWith("# ")),
          "# my own note",
          "[mcp_servers.probe]",
          'command = "echo"',
          "",
        ].join("\n"),
      );
      if (!(await hooks.setCodexProxySettings(url))) {
        return "writer reported no write";
      }
      const applied = fs.readFileSync(configPath, "utf8");
      if (countGrokLines(applied, providerHeader) !== 1) {
        return `${providerHeader} is not declared exactly once`;
      }
      for (const kept of [
        "# my own note",
        "[mcp_servers.probe]",
        'model_provider = "neurolink"',
        "[profiles.work]",
      ]) {
        if (!applied.includes(kept)) {
          return `user content was lost: ${kept}`;
        }
      }
      const inode = fs.statSync(configPath).ino;
      await hooks.setCodexProxySettings(url);
      if (fs.readFileSync(configPath, "utf8") !== applied) {
        return "a second apply changed the file";
      }
      if (fs.statSync(configPath).ino !== inode) {
        return "a repeat apply replaced a file that already matched";
      }
      if (!(await hooks.clearCodexProxySettings(url))) {
        return "restore reported that it did nothing";
      }
      const restored = fs.readFileSync(configPath, "utf8");
      if (
        restored.includes(providerHeader) ||
        !/^model_provider = "openai"$/m.test(restored) ||
        countGrokLines(restored, 'model_provider = "neurolink"') !== 1
      ) {
        return "restore did not return the user's own selectors";
      }
      return null;
    },
  );
  const orphaned = await withCodexHome(
    "orphan begin marker",
    async (configPath) => {
      fs.writeFileSync(configPath, CODEX_USER_PREAMBLE.join("\n"));
      await hooks.setCodexProxySettings(url);
      fs.writeFileSync(
        configPath,
        `${fs
          .readFileSync(configPath, "utf8")
          .replace(
            `${GROK_BLOCK_END_LINE}\n`,
            "",
          )}[mcp_servers.after]\ncommand = "kept"\n`,
      );
      await hooks.setCodexProxySettings(url);
      await hooks.setCodexProxySettings(url);
      const applied = fs.readFileSync(configPath, "utf8");
      if (!applied.includes('command = "kept"')) {
        return "content after the orphaned marker was deleted";
      }
      if (countGrokLines(applied, providerHeader) !== 1) {
        return `${providerHeader} is not declared exactly once`;
      }
      return null;
    },
  );
  return unmarked && orphaned;
}

async function testCodexApplyRefusesForeignProvider(): Promise<boolean> {
  const { __codexClientTestHooks: hooks } =
    await import("../src/cli/proxy-clients/codex.js");
  // As a table under another name, and by dotted keys, which declare no
  // [model_providers.neurolink] header for a duplicate check to see.
  const definitions = [
    [
      "[model_providers.neurolink]",
      'name = "My own gateway"',
      'base_url = "https://gateway.example.test/v1"',
    ],
    [
      "[model_providers]",
      'neurolink.name = "My own gateway"',
      'neurolink.base_url = "https://gateway.example.test/v1"',
    ],
  ];
  const results = [];
  for (const [index, definition] of definitions.entries()) {
    results.push(
      await withCodexHome(
        `foreign provider ${index + 1}`,
        async (configPath) => {
          const mine = [...CODEX_USER_PREAMBLE, ...definition, ""].join("\n");
          fs.writeFileSync(configPath, mine);
          if (await hooks.setCodexProxySettings("http://127.0.0.1:55669")) {
            return "apply wrote beside a neurolink provider the user defined";
          }
          if (fs.readFileSync(configPath, "utf8") !== mine) {
            return "apply changed a config with the user's own neurolink provider";
          }
          if (fs.existsSync(hooks.getCodexSnapshotPath())) {
            return "apply recorded a snapshot for a write it did not make";
          }
          return null;
        },
      ),
    );
  }
  return results.every(Boolean);
}

/**
 * Configs kept in a dotfiles repository are symlinks into it, a setup Grok
 * documents and its own writer honours. The atomic write renamed over the
 * link, turning it into a regular file and leaving the repository's copy
 * stale. Every client writer shares that helper.
 */
async function testClientConfigWritesFollowSymlinks(): Promise<boolean> {
  const { grokConfigurator } = await import("../src/cli/proxy-clients/grok.js");
  const { __codexClientTestHooks: codex } =
    await import("../src/cli/proxy-clients/codex.js");
  const url = "http://127.0.0.1:55669";
  const linkTo = (configPath: string, target: string, contents?: string) => {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    if (contents !== undefined) {
      fs.writeFileSync(target, contents);
    }
    fs.rmSync(configPath, { force: true });
    fs.symlinkSync(path.relative(path.dirname(configPath), target), configPath);
  };
  const grok = await withGrokHome("symlinked config", async (configPath) => {
    const target = path.join(
      path.dirname(configPath),
      "..",
      "dotfiles",
      "grok.toml",
    );
    linkTo(configPath, target, GROK_USER_PREAMBLE.join("\n"));
    await grokConfigurator.apply(url);
    if (!fs.lstatSync(configPath).isSymbolicLink()) {
      return "apply replaced the symlink with a regular file";
    }
    if (!fs.readFileSync(target, "utf8").includes(GROK_BLOCK_BEGIN_LINE)) {
      return "apply did not write through the symlink";
    }
    await grokConfigurator.restore(url);
    if (
      !fs.lstatSync(configPath).isSymbolicLink() ||
      fs.readFileSync(target, "utf8").includes(GROK_BLOCK_BEGIN_LINE)
    ) {
      return "restore did not write through the symlink";
    }
    // A link whose target does not exist yet.
    const dangling = path.join(path.dirname(target), "fresh", "grok.toml");
    linkTo(configPath, dangling);
    await grokConfigurator.apply(url);
    if (
      !fs.lstatSync(configPath).isSymbolicLink() ||
      !fs.existsSync(dangling)
    ) {
      return "apply did not create the target of a dangling symlink";
    }
    return null;
  });
  const codexResult = await withCodexHome(
    "symlinked config",
    async (configPath) => {
      const target = path.join(
        path.dirname(configPath),
        "..",
        "dotfiles",
        "codex.toml",
      );
      linkTo(configPath, target, CODEX_USER_PREAMBLE.join("\n"));
      await codex.setCodexProxySettings(url);
      if (!fs.lstatSync(configPath).isSymbolicLink()) {
        return "apply replaced the symlink with a regular file";
      }
      if (
        !fs.readFileSync(target, "utf8").includes("[model_providers.neurolink]")
      ) {
        return "apply did not write through the symlink";
      }
      return null;
    },
  );
  return grok && codexResult;
}

/**
 * A client config must never be observable in a torn state.
 *
 * Every writer did readFileSync then writeFileSync. writeFileSync opens with
 * O_TRUNC, so between the truncate and the last byte the user's config is
 * short — and for a real config that is several syscalls wide, not an instant.
 * Anything reading concurrently, including the CLI the config belongs to, can
 * load a truncated file; a crash in that window leaves it truncated for good.
 * Both Qwen's and OpenCode's configs hold live API keys.
 *
 * Measured against the pre-fix writer on a 1.4 MB config: 121 torn reads out of
 * 3,717. This drives the real writer while a separate process reads — separate
 * because writeFileSync blocks the writer's own event loop, so an in-process
 * reader is never scheduled during the window it is supposed to catch.
 */
async function testClientConfigWritesAreAtomic(): Promise<boolean> {
  const { __openCodeTestHooks } =
    await import("../src/cli/proxy-clients/openCode.js");
  const { spawn } = await import("child_process");
  const prevXdg = process.env.XDG_CONFIG_HOME;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "neurolink-atomic-"));
  const url = "http://127.0.0.1:55669/v1";
  const probe = path.resolve("test/fixtures/config-reader-probe.mjs");
  try {
    fs.mkdirSync(path.join(root, "opencode"), { recursive: true });
    process.env.XDG_CONFIG_HOME = root;
    const configPath = __openCodeTestHooks.getOpenCodeConfigPath();

    // Large enough that the write spans multiple syscalls. A small file can be
    // written in one and would hide the window rather than prove it closed.
    const filler: Record<string, string> = {};
    for (let i = 0; i < 20000; i += 1) {
      filler[`key_${i}`] = `value_${i}_${"x".repeat(40)}`;
    }
    fs.writeFileSync(
      configPath,
      JSON.stringify({ provider: {}, filler }, null, 2),
    );

    const durationMs = 4000;
    const deadline = Date.now() + durationMs;
    const reader = spawn(
      process.execPath,
      [probe, configPath, String(deadline)],
      { stdio: ["ignore", "pipe", "inherit"] },
    );
    let out = "";
    reader.stdout?.on("data", (d: Buffer) => {
      out += d.toString();
    });

    let writes = 0;
    while (Date.now() < deadline) {
      await __openCodeTestHooks.setOpenCodeProxySettings(url);
      await __openCodeTestHooks.clearOpenCodeProxySettings(url);
      writes += 2;
    }
    // "close", not "exit", and with an "error" handler: a spawn that fails
    // outright (ENOENT on the probe path) never emits "exit", so waiting on it
    // alone hangs this suite forever instead of failing. "close" fires in both
    // cases, and the guard below turns a probe that never ran into a failure
    // rather than a hang.
    await new Promise<void>((resolve) => {
      reader.on("close", () => resolve());
      reader.on("error", () => resolve());
    });

    const parsed = out.trim()
      ? (JSON.parse(out.trim()) as {
          total: number;
          torn: number;
          unreadable?: number;
        })
      : { total: 0, torn: 0, unreadable: 0 };
    // Reads that never landed prove nothing either way, so they cannot count
    // toward the sample this test claims to have taken.
    const observed = parsed.total - (parsed.unreadable ?? 0);
    if (observed === 0) {
      log(
        "atomic-write probe never completed a read; test proved nothing",
        "red",
      );
      return false;
    }
    if (parsed.total === 0) {
      log(
        "atomic-write probe never read the config; test proved nothing",
        "red",
      );
      return false;
    }
    if (writes === 0) {
      log(
        "atomic-write probe never wrote the config; test proved nothing",
        "red",
      );
      return false;
    }
    if (parsed.torn > 0) {
      log(
        `a concurrent reader observed a torn config on ${parsed.torn} of ${parsed.total} reads`,
        "red",
      );
      return false;
    }

    // A failed rename must not leave scratch files in the user's config dir.
    const strays = fs
      .readdirSync(path.dirname(configPath))
      .filter((f) => f.includes(".tmp") || f.includes("neurolink-"));
    if (strays.length > 0) {
      log(`the writer left ${strays.length} scratch file(s) behind`, "red");
      return false;
    }
    log(
      `${observed} concurrent reads across ${writes} writes, none torn`,
      "green",
    );
    return true;
  } finally {
    if (prevXdg === undefined) {
      delete process.env.XDG_CONFIG_HOME;
    } else {
      process.env.XDG_CONFIG_HOME = prevXdg;
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
}

/**
 * Making a write atomic must not widen who can read the file.
 *
 * This is the trap the rename introduces and it is easy to miss. Overwriting in
 * place leaves the destination's mode alone, so a config the user had locked to
 * 0600 stayed 0600. A rename replaces the inode, so the destination inherits the
 * TEMP file's mode — and a temp file created without an explicit mode lands at
 * 0666 minus umask, i.e. 0644 by default. Without the carry-over, switching to
 * atomic writes would silently relax every credential file it touched from
 * owner-only to world-readable. Qwen's and OpenCode's configs hold live API
 * keys, so that is a local disclosure, not a cosmetic change.
 *
 * Driven through the real configurators rather than the writer, because the
 * whole point is the mode a USER's file ends up with after `proxy start`.
 */
async function testClientConfigWritesPreservePermissions(): Promise<boolean> {
  const { __openCodeTestHooks } =
    await import("../src/cli/proxy-clients/openCode.js");
  const prevXdg = process.env.XDG_CONFIG_HOME;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "neurolink-mode-"));
  const url = "http://127.0.0.1:55669/v1";
  const modeOf = (p: string): string =>
    (fs.statSync(p).mode & 0o777).toString(8);

  try {
    fs.mkdirSync(path.join(root, "opencode"), { recursive: true });
    process.env.XDG_CONFIG_HOME = root;
    const configPath = __openCodeTestHooks.getOpenCodeConfigPath();

    // A user who locked their credential file down. This must survive.
    fs.writeFileSync(configPath, JSON.stringify({ existing: true }));
    fs.chmodSync(configPath, 0o600);

    await __openCodeTestHooks.setOpenCodeProxySettings(url);
    if (modeOf(configPath) !== "600") {
      log(
        `apply widened a 0600 config to 0${modeOf(configPath)} — credentials exposed to other local users`,
        "red",
      );
      return false;
    }

    await __openCodeTestHooks.clearOpenCodeProxySettings(url);
    if (modeOf(configPath) !== "600") {
      log(`restore widened a 0600 config to 0${modeOf(configPath)}`, "red");
      return false;
    }

    // A config the user deliberately left group-readable keeps that too — the
    // rule is "carry the mode over", not "force 0600 on everyone".
    fs.chmodSync(configPath, 0o644);
    await __openCodeTestHooks.setOpenCodeProxySettings(url);
    if (modeOf(configPath) !== "644") {
      log(
        `apply changed a 0644 config to 0${modeOf(configPath)} instead of preserving it`,
        "red",
      );
      return false;
    }

    // A config that did not exist yet must not be born world-readable.
    //
    // The parent directory must NOT exist when this runs. writeFileAtomic does
    // its own mkdirSync(dirname, {recursive: true}) for exactly the first-run
    // case, and an earlier cut of this test wrote into `root/opencode` — which
    // is created at the top of this function. That made the production mkdir
    // dead weight here: deleting it would not have failed this test.
    const freshDir = path.join(root, "opencode", "nested", "first-run");
    const fresh = path.join(freshDir, "fresh.json");
    if (fs.existsSync(freshDir)) {
      log(
        "the first-run directory already exists — this case no longer covers the absent-parent path",
        "red",
      );
      return false;
    }
    const { writeFileAtomic } =
      await import("../src/cli/proxy-clients/snapshot.js");
    await writeFileAtomic(fresh, JSON.stringify({ apiKey: "sk-test" }));
    if (!fs.existsSync(fresh)) {
      log(
        "writeFileAtomic did not create the file beneath an absent parent directory",
        "red",
      );
      return false;
    }
    if (modeOf(fresh) !== "600") {
      log(
        `a newly created credential file landed at 0${modeOf(fresh)} rather than 0600`,
        "red",
      );
      return false;
    }

    log(
      "config permissions preserved across apply and restore; new files start at 0600",
      "green",
    );
    return true;
  } finally {
    if (prevXdg === undefined) {
      delete process.env.XDG_CONFIG_HOME;
    } else {
      process.env.XDG_CONFIG_HOME = prevXdg;
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
}

/**
 * Ask the OS for a free TCP port.
 *
 * The two cases below spawn their own proxies, and fixed ports made them
 * collide with anything already listening — including another agent running
 * this same suite in this worktree, which turned an unrelated concurrent run
 * into a hard FAIL on EADDRINUSE. Binding port 0 and reading back what the
 * kernel assigned leaves only the narrow window between close and re-bind,
 * which is a better race than a guaranteed collision.
 */
async function freePort(): Promise<number> {
  const net = await import("net");
  return new Promise<number>((resolve, reject) => {
    const srv = net.createServer();
    srv.once("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      srv.close(() =>
        port ? resolve(port) : reject(new Error("no free port")),
      );
    });
  });
}

/**
 * Spawn a proxy with its own HOME, its own port, and its own config.
 *
 * The suite's shared proxy is fine for a case that only needs a door to
 * answer, but a case that reads what the proxy *wrote* must own the directory
 * it reads: the shared log dir accumulates every other case's traffic, and
 * whether a given record is present depends on suite ordering and on which
 * earlier cases happened to have credentials. An isolated HOME makes the
 * observation deterministic instead.
 */
async function spawnIsolatedProxy(options: {
  configYaml?: string;
  env?: Record<string, string>;
}): Promise<{ port: number; home: string; stop: () => void } | null> {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "nl-isolated-proxy-"));
  fs.mkdirSync(path.join(home, ".neurolink"), { recursive: true });
  if (options.configYaml) {
    fs.writeFileSync(
      path.join(home, ".neurolink", "proxy-config.yaml"),
      options.configYaml,
    );
  }

  const port = await freePort();
  const child = spawn(
    process.execPath,
    [
      path.resolve("dist/cli/index.js"),
      "proxy",
      "start",
      "--port",
      String(port),
      "--quiet",
    ],
    {
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        HOME: home,
        USERPROFILE: home,
        NEUROLINK_SKIP_MCP: "true",
        NEUROLINK_PROXY_IGNORE_LAUNCHD: "1",
        ...(options.env ?? {}),
      },
    },
  );

  // The pipes must be drained. Nothing else in this function reads them, and a
  // child whose stdout+stderr fills the OS pipe buffer (~64KB) blocks on its
  // next write — including, potentially, the write that would have served the
  // /health request this function is waiting on. Accumulating the output also
  // means a failed spawn can say why.
  let childOutput = "";
  child.stdout?.on("data", (chunk: Buffer) => {
    childOutput += chunk.toString();
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    childOutput += chunk.toString();
  });

  // Without these the poll loop below cannot learn the child died, so a proxy
  // that crashes on startup (bad flag, port already bound, throw before
  // listen) burns the full 45s deadline retrying a connection that will never
  // be accepted, instead of failing in well under a second.
  let childExited: string | null = null;
  child.once("error", (err) => {
    childExited = `spawn error: ${err.message}`;
  });
  child.once("exit", (code, signal) => {
    childExited = `exited early with code=${code} signal=${signal}`;
  });

  const stop = () => {
    child.kill();
    // The proxy is still flushing its journal when the kill lands, so a plain
    // rmSync loses a race with it and throws ENOTEMPTY — `force` suppresses
    // "missing", not "still being written to". That turned a PASSING assertion
    // into a red test, intermittently, which is worse than either outcome:
    // the failure names a temp directory and says nothing about the behaviour
    // under test.
    //
    // Retry briefly, then give up silently. Cleanup of a temp directory must
    // never decide whether a test passed.
    try {
      fs.rmSync(home, {
        recursive: true,
        force: true,
        maxRetries: 10,
        retryDelay: 100,
      });
    } catch {
      // The OS reaps its own temp directory; a leftover here is not a result.
    }
  };

  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    // A crashed child will never answer. Check before probing so the common
    // startup failure costs one poll interval rather than the whole deadline.
    if (childExited !== null) {
      log(
        `isolated proxy ${childExited}${childOutput ? ` — ${childOutput.slice(-400)}` : ""}`,
        "red",
      );
      stop();
      return null;
    }
    try {
      // Bounded deliberately. Node's fetch has no default request timeout, so
      // a proxy that accepts the connection and then never answers blocks here
      // forever — and the loop cannot re-check its own `deadline` while it is
      // blocked inside the await. The suite's outer withCaseTimeout cannot
      // rescue it either: Promise.race abandons the loser without cancelling
      // it, and a case timeout aborts every remaining case in the run.
      const probe = await fetch(`http://127.0.0.1:${port}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      if (probe.ok) {
        return { port, home, stop };
      }
    } catch {
      // not listening yet
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  log(
    `isolated proxy never became healthy within 45s${childOutput ? ` — ${childOutput.slice(-400)}` : ""}`,
    "red",
  );
  stop();
  return null;
}

/**
 * A multi-turn Gemini request must reach the provider with its history intact.
 *
 * The shared engine derives history with `conversationMessages.slice(0, -1)`,
 * because the final turn is already sent separately as `prompt` — so
 * claudeFormat and openaiFormat push EVERY turn, the last one included.
 * geminiFormat pushed only the non-final turns, the intuitive reading of
 * "history", which left the slice eating a real turn: a three-turn request
 * arrived at the provider with the assistant's reply deleted.
 *
 * Nothing internal is asserted on. A proxy is spawned against a capture server
 * standing in for the provider's HTTP endpoint, a three-turn generateContent
 * goes through the real door, and the assertion is on what the provider
 * actually received. The middle turn is the canary — the exact turn the bug
 * ate. Both ends of the conversation are the control.
 */
async function testGeminiMultiTurnHistoryReachesProvider(): Promise<
  boolean | null
> {
  const MARKERS = {
    first: "TURN_ONE_USER",
    canary: "TURN_TWO_MODEL_CANARY",
    last: "TURN_THREE_USER",
  };

  let capturedBody: string | undefined;
  const upstream = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (c: Buffer) => {
      raw += c.toString();
    });
    req.on("end", () => {
      capturedBody = raw;
      // The engine drives providers through stream(), so a plain JSON body
      // yields "no content or tool calls" and a 500 at the door. SSE keeps the
      // door's own answer honest while the capture above does the real work.
      res.writeHead(200, {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
      });
      const chunk = (o: unknown) => res.write(`data: ${JSON.stringify(o)}\n\n`);
      chunk({
        id: "chatcmpl-capture",
        object: "chat.completion.chunk",
        created: 1,
        model: "capture-model",
        choices: [{ index: 0, delta: { role: "assistant", content: "OK" } }],
      });
      chunk({
        id: "chatcmpl-capture",
        object: "chat.completion.chunk",
        created: 1,
        model: "capture-model",
        choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
        usage: { prompt_tokens: 10, completion_tokens: 1, total_tokens: 11 },
      });
      res.write("data: [DONE]\n\n");
      res.end();
    });
  });

  const capturePort = await freePort();
  let proxy: Awaited<ReturnType<typeof spawnIsolatedProxy>> = null;

  try {
    await new Promise<void>((resolve, reject) => {
      upstream.once("error", reject);
      upstream.listen(capturePort, "127.0.0.1", () => resolve());
    });

    proxy = await spawnIsolatedProxy({
      configYaml: `routing:
  modelMappings:
    - from: "gemini-2.5-flash"
      to: "capture-model"
      provider: "openai-compatible"
`,
      env: {
        OPENAI_COMPATIBLE_BASE_URL: `http://127.0.0.1:${capturePort}/v1`,
        OPENAI_COMPATIBLE_API_KEY: "capture-key",
      },
    });
    if (!proxy) {
      log(
        "capture proxy never became healthy; history could not be observed",
        "yellow",
      );
      return null;
    }

    await fetch(
      `http://127.0.0.1:${proxy.port}/v1beta/models/gemini-2.5-flash:generateContent`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "user-agent": "neurolink-history-probe/1.0",
        },
        // Bounded: Node's fetch has no default timeout, and an unanswered
        // request here hangs the case past its own bound (Promise.race cannot
        // cancel the loser), which aborts every remaining case in the run.
        signal: AbortSignal.timeout(30_000),
        body: JSON.stringify({
          contents: [
            { role: "user", parts: [{ text: MARKERS.first }] },
            { role: "model", parts: [{ text: MARKERS.canary }] },
            { role: "user", parts: [{ text: MARKERS.last }] },
          ],
          generationConfig: { maxOutputTokens: 32 },
        }),
      },
    );

    if (!capturedBody) {
      log(
        "the capture upstream was never called; history could not be observed",
        "yellow",
      );
      return null;
    }

    if (
      !capturedBody.includes(MARKERS.first) ||
      !capturedBody.includes(MARKERS.last)
    ) {
      log(
        "the provider received neither end of the conversation; " +
          "translation did not survive, so history is not observable here",
        "yellow",
      );
      return null;
    }

    if (!capturedBody.includes(MARKERS.canary)) {
      log(
        "the provider received the first and last turns but not the middle " +
          "one — conversation history is being truncated in translation",
        "red",
      );
      return false;
    }

    log(
      "a three-turn Gemini request reaches the provider with every turn intact",
      "green",
    );
    return true;
  } finally {
    proxy?.stop();
    await new Promise<void>((resolve) => upstream.close(() => resolve()));
  }
}

/**
 * Continuing from a model turn must reach a provider, not 500 at the door.
 *
 * Google lets a client send `contents` whose final entry is a model turn — the
 * Gemini CLI does exactly that when continuing — and there is no user turn to
 * become `input.text`. That left `prompt` empty, and NeuroLink's stream()
 * rejects an empty input before any provider is contacted, so every continue
 * failed with a 500 and the message "Stream options must include either
 * input.text, input.audio, or stt.audio".
 *
 * This was missed twice over. The review that found the history-slice half of
 * it proposed a terminal placeholder, which was applied and is correct as far
 * as it goes — but a placeholder consumed by the slice does nothing about the
 * prompt, and no case ever sent a model-final request to find out. The
 * multi-turn case next door covers [user, model, user] only, which always has
 * a user turn to promote.
 *
 * The status assertion is the load-bearing one here: the turns could all
 * arrive correctly and the request still fail.
 */
async function testGeminiModelFinalTurnReachesProvider(): Promise<
  boolean | null
> {
  const MARKERS = { user: "MF_USER_ONE", model: "MF_MODEL_FINAL_CANARY" };

  let capturedBody: string | undefined;
  const upstream = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (c: Buffer) => {
      raw += c.toString();
    });
    req.on("end", () => {
      capturedBody = raw;
      res.writeHead(200, {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
      });
      const chunk = (o: unknown) => res.write(`data: ${JSON.stringify(o)}\n\n`);
      chunk({
        id: "chatcmpl-capture",
        object: "chat.completion.chunk",
        created: 1,
        model: "capture-model",
        choices: [{ index: 0, delta: { role: "assistant", content: "OK" } }],
      });
      chunk({
        id: "chatcmpl-capture",
        object: "chat.completion.chunk",
        created: 1,
        model: "capture-model",
        choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
        usage: { prompt_tokens: 8, completion_tokens: 1, total_tokens: 9 },
      });
      res.write("data: [DONE]\n\n");
      res.end();
    });
  });

  const capturePort = await freePort();
  let proxy: Awaited<ReturnType<typeof spawnIsolatedProxy>> = null;

  try {
    await new Promise<void>((resolve, reject) => {
      upstream.once("error", reject);
      upstream.listen(capturePort, "127.0.0.1", () => resolve());
    });

    proxy = await spawnIsolatedProxy({
      configYaml: `routing:
  modelMappings:
    - from: "gemini-2.5-flash"
      to: "capture-model"
      provider: "openai-compatible"
`,
      env: {
        OPENAI_COMPATIBLE_BASE_URL: `http://127.0.0.1:${capturePort}/v1`,
        OPENAI_COMPATIBLE_API_KEY: "capture-key",
      },
    });
    if (!proxy) {
      log(
        "capture proxy never became healthy; the model-final path could not be observed",
        "yellow",
      );
      return null;
    }

    const resp = await fetch(
      `http://127.0.0.1:${proxy.port}/v1beta/models/gemini-2.5-flash:generateContent`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "user-agent": "neurolink-model-final-probe/1.0",
        },
        // Bounded: Node's fetch has no default timeout, and an unanswered
        // request here hangs the case past its own bound (Promise.race cannot
        // cancel the loser), which aborts every remaining case in the run.
        signal: AbortSignal.timeout(30_000),
        body: JSON.stringify({
          // No trailing user turn — this is the continue-from-model shape.
          contents: [
            { role: "user", parts: [{ text: MARKERS.user }] },
            { role: "model", parts: [{ text: MARKERS.model }] },
          ],
          generationConfig: { maxOutputTokens: 32 },
        }),
      },
    );

    if (resp.status !== 200) {
      log(
        `continuing from a model turn answered ${resp.status} instead of 200 — ` +
          "the door is failing the CLI's continue flow",
        "red",
      );
      return false;
    }

    if (!capturedBody) {
      log(
        "the capture upstream was never called on a model-final request",
        "red",
      );
      return false;
    }

    if (
      !capturedBody.includes(MARKERS.user) ||
      !capturedBody.includes(MARKERS.model)
    ) {
      log(
        "a model-final request reached the provider without its full history",
        "red",
      );
      return false;
    }

    log(
      "continuing from a model turn reaches the provider, with both turns intact",
      "green",
    );
    return true;
  } finally {
    proxy?.stop();
    await new Promise<void>((resolve) => upstream.close(() => resolve()));
  }
}

/**
 * Every inbound door must be covered by the tracking middleware.
 *
 * Hono matches a wildcard one path segment at a time, so `app.use("/v1/*")`
 * does NOT cover `/v1beta/models/...` — the segment is `v1beta`, not `v1`.
 * The Gemini door landed matching neither `/v1/*` nor `/backend-api/*`, so its
 * requests were invisible to the request log, to per-CLI attribution, and to
 * the in-flight counter the graceful drain waits on — an auto-update could
 * therefore cut a live Gemini stream mid-answer.
 *
 * Observed the way an operator would: drive the real doors over HTTP, then
 * read the lifecycle journal the proxy itself wrote. No credentials are needed
 * — `request_accepted` is emitted BEFORE `next()`, so the record exists
 * whether or not an account is configured downstream. The proxy is isolated so
 * the journal contains this case's traffic and nothing else.
 */
async function testEveryDoorIsTracked(): Promise<boolean | null> {
  const proxy = await spawnIsolatedProxy({});
  if (!proxy) {
    log(
      "isolated proxy never became healthy; door tracking could not be observed",
      "yellow",
    );
    return null;
  }

  try {
    // One request per door, so a regression naming only one of them stays
    // attributable to that door rather than to "tracking is off everywhere".
    const doors = [
      {
        path: "/v1/messages",
        body: {
          model: "claude-sonnet-4-5",
          max_tokens: 1,
          messages: [{ role: "user", content: "hi" }],
        },
      },
      {
        path: "/v1beta/models/gemini-2.5-flash:generateContent",
        body: {
          contents: [{ role: "user", parts: [{ text: "hi" }] }],
          generationConfig: { maxOutputTokens: 1 },
        },
      },
    ];

    for (const door of doors) {
      await fetch(`http://127.0.0.1:${proxy.port}${door.path}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "user-agent": "neurolink-door-tracking-probe/1.0",
        },
        // Bounded for the same reason as the probes above: an unanswered door
        // would hang the case and take the rest of the run with it.
        signal: AbortSignal.timeout(30_000),
        body: JSON.stringify(door.body),
      });
    }

    const today = new Date().toISOString().slice(0, 10);
    const lifecyclePath = path.join(
      proxy.home,
      ".neurolink",
      "logs",
      `proxy-lifecycle-${today}.jsonl`,
    );

    // Written by a queued async writer. Poll for the records rather than
    // sleeping a guessed interval, so a loaded machine reports the real answer
    // instead of "unobservable".
    const trackedPaths = new Set<string>();
    const deadline = Date.now() + 15_000;
    while (Date.now() < deadline) {
      if (fs.existsSync(lifecyclePath)) {
        for (const line of fs
          .readFileSync(lifecyclePath, "utf8")
          .split("\n")
          .filter((l) => l.trim())) {
          try {
            const rec = JSON.parse(line) as { event?: string; path?: string };
            if (rec.event === "request_accepted" && rec.path) {
              trackedPaths.add(rec.path);
            }
          } catch {
            // partial trailing line
          }
        }
      }
      if (trackedPaths.size >= doors.length) {
        break;
      }
      await new Promise((r) => setTimeout(r, 300));
    }

    // The Anthropic door is the control: if IT is missing, tracking is off for
    // reasons unrelated to the fix and this run proves nothing either way.
    if (![...trackedPaths].some((p) => p.startsWith("/v1/messages"))) {
      log(
        "the control door produced no lifecycle record; " +
          "tracking is not observable on this build",
        "yellow",
      );
      return null;
    }

    if (![...trackedPaths].some((p) => p.startsWith("/v1beta/models/"))) {
      log(
        "the Gemini door produced no lifecycle record while the control door " +
          "did — /v1beta/* is not covered by the tracking middleware",
        "red",
      );
      return false;
    }

    log(
      "every inbound door reaches the tracking middleware (anthropic + gemini)",
      "green",
    );
    return true;
  } finally {
    proxy.stop();
  }
}

/**
 * Usage must be attributable to the CLI that spent it, not only the account.
 *
 * The proxy already derived a client label from User-Agent, then dropped it
 * into an OTel span attribute and nothing else. The request log never carried
 * it, so the ledger could group by account and by nothing else — a pooled
 * operator could see that an account burned $40 today but not whether it was
 * Claude Code or a runaway script.
 *
 * Driven the way the CLIs drive it: real requests to a spawned proxy carrying
 * real User-Agent headers, then the attribution read back out of the log the
 * proxy itself wrote. Nothing here is stubbed.
 */
async function testPerClientAttribution(): Promise<boolean | null> {
  const logsDir = path.join(os.homedir(), ".neurolink", "logs");
  const today = new Date().toISOString().slice(0, 10);
  const logPath = path.join(logsDir, `proxy-${today}.jsonl`);
  const sizeBefore = fs.existsSync(logPath) ? fs.statSync(logPath).size : 0;

  // Every string here was captured from the real CLI — from this machine's
  // proxy request log, or from a header-capture server the CLI was pointed at.
  // None is invented, which is the standing rule for this table: a guessed
  // prefix that never matches is indistinguishable from one that works.
  //
  // The last three MUST stay unknown, and are pinned so a later "helpful"
  // mapping fails this test instead of silently misfiling unrelated traffic.
  // `OpenAI/JS` is the stock OpenAI SDK UA, sent by every caller of that SDK —
  // Copilot CLI among them, which is why Copilot cannot be named this way. The
  // MSIE string is not a CLI's UA at all: it is what curl sends on a host whose
  // ~/.curlrc sets one, so it is shared by every curl-driven caller there.
  const agents = [
    { ua: "claude-cli/2.1.223 (external, cli)", expect: "claude-code" },
    {
      ua: "opencode/1.3.13 ai-sdk/provider-utils/4.0.21 runtime/bun/1.3.13",
      expect: "opencode",
    },
    { ua: "QwenCode/0.17.0 (darwin; arm64)", expect: "qwen-code" },
    {
      ua: "GeminiCLI-tui/0.53.0/gemini-3.1-pro-preview (darwin; arm64; terminal)",
      expect: "gemini-cli",
    },
    { ua: "codex_exec/0.147.0 (Mac OS 26.6.0; arm64)", expect: "codex" },
    { ua: "grok-shell/1.0.30 (macos; aarch64)", expect: "grok" },
    { ua: "some-unreleased-cli/9.9.9", expect: "unknown" },
    // Copilot CLI's own request.
    { ua: "OpenAI/JS 5.20.1", expect: "unknown" },
    // Any curl caller on a host with a user-agent in ~/.curlrc.
    {
      ua: "Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/5.0)",
      expect: "unknown",
    },
  ];
  for (const a of agents) {
    await fetchProxy("/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": a.ua },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 1,
        messages: [{ role: "user", content: "hi" }],
      }),
    });
  }

  if (!fs.existsSync(logPath)) {
    log(
      "proxy wrote no request log; attribution could not be observed",
      "yellow",
    );
    return null;
  }
  // sizeBefore is a BYTE offset from statSync. Slicing a decoded string by it
  // counts UTF-16 code units instead, so one multi-byte character anywhere in
  // the earlier log shifts the cut and the first "appended" line arrives
  // truncated mid-JSON. Slice the buffer, then decode.
  const appended = fs
    .readFileSync(logPath)
    .subarray(sizeBefore)
    .toString("utf8")
    .split("\n")
    .filter((l) => l.trim());
  if (appended.length === 0) {
    log(
      "proxy appended no log lines; attribution could not be observed",
      "yellow",
    );
    return null;
  }

  // Keyed by User-Agent, not by clientApp. Four of the callers above are
  // expected to classify as "unknown", and a clientApp-keyed map would let
  // them overwrite each other — turning a wrong answer for one caller into a
  // pass as long as any single unknown row landed.
  const seen = new Map<string, string>();
  for (const line of appended) {
    try {
      const rec = JSON.parse(line) as {
        clientApp?: string;
        userAgent?: string;
      };
      if (rec.clientApp && rec.userAgent) {
        seen.set(rec.userAgent, rec.clientApp);
      }
    } catch {
      // partial trailing line
    }
  }

  for (const a of agents) {
    const actual = seen.get(a.ua);
    if (actual === undefined) {
      // Precondition, not a result: a UA that never reached the log says
      // nothing about how it would have been classified. Fail loudly rather
      // than let a request that never happened read as agreement.
      log(`no request log row carried the User-Agent for ${a.expect}`, "red");
      return false;
    }
    if (actual !== a.expect) {
      log(
        `attribution mismatch — a caller expected to classify as ${a.expect} ` +
          `classified as ${actual} instead`,
        "red",
      );
      return false;
    }
  }
  // The raw header must survive for the client the classifier cannot name,
  // otherwise every unrecognised CLI collapses into one indistinguishable
  // bucket and the feature is useless exactly where it is most needed.
  if (!seen.has("some-unreleased-cli/9.9.9")) {
    log("an unrecognised client lost its raw User-Agent", "red");
    return false;
  }
  log(`attributed ${seen.size} distinct clients from live traffic`, "green");
  return true;
}

/**
 * Every CLI the proxy configures must be one the proxy can also name.
 *
 * These two rosters are maintained in different files by different reflexes —
 * you add a configurator to onboard a CLI, and you add a User-Agent prefix
 * only once you have watched that CLI's traffic. They drifted apart in exactly
 * that gap: five configurators shipped while CLIENT_PREFIXES still knew only
 * Claude Code, so five of six CLIs were filed as "unknown" and the per-client
 * usage feature reported one bucket while looking entirely healthy. Nothing
 * failed, because an unattributed client is indistinguishable from a quiet one.
 *
 * So the check is structural rather than behavioural: adding a configurator
 * now fails here until someone either measures its User-Agent or writes down
 * why it cannot be measured.
 */
const UNATTRIBUTABLE_CLIENTS: ReadonlyMap<string, string> = new Map([
  [
    "copilot",
    "sends the stock `OpenAI/JS <version>` SDK User-Agent, which every caller " +
      "of that SDK sends; mapping it would misfile unrelated traffic",
  ],
]);

async function testEveryConfiguredClientIsAttributable(): Promise<boolean> {
  const { PROXY_CLIENT_CONFIGURATORS } =
    await import("../src/cli/proxy-clients/registry.js");
  const { getMappedClientNames } =
    await import("../src/lib/proxy/clientAttribution.js");
  const mapped = getMappedClientNames();

  // Precondition. An empty or tiny roster would make every assertion below
  // pass by having nothing to check, which is the failure mode this whole
  // suite keeps rediscovering.
  if (PROXY_CLIENT_CONFIGURATORS.length < 5) {
    log(
      "configurator roster looks truncated; the check would be vacuous",
      "red",
    );
    return false;
  }

  for (const client of PROXY_CLIENT_CONFIGURATORS) {
    if (mapped.has(client.id)) {
      continue;
    }
    const reason = UNATTRIBUTABLE_CLIENTS.get(client.id);
    if (!reason) {
      log(
        `a configured client has no User-Agent mapping and no recorded reason ` +
          `for lacking one — measure its User-Agent and add the prefix, or add ` +
          `it to UNATTRIBUTABLE_CLIENTS saying why that is impossible`,
        "red",
      );
      return false;
    }
  }

  // The exception list must not outlive its exceptions either: an entry for a
  // client that has since been mapped, or removed, is stale documentation that
  // would let a real regression hide behind it.
  for (const id of UNATTRIBUTABLE_CLIENTS.keys()) {
    const stillConfigured = PROXY_CLIENT_CONFIGURATORS.some((c) => c.id === id);
    if (!stillConfigured) {
      log(
        "an unattributable-client exception names a client that is no longer configured",
        "red",
      );
      return false;
    }
    if (mapped.has(id)) {
      log(
        "an unattributable-client exception names a client that is now mapped",
        "red",
      );
      return false;
    }
  }

  log(
    `all ${PROXY_CLIENT_CONFIGURATORS.length} configured clients are either ` +
      `attributable or documented as not being so`,
    "green",
  );
  return true;
}

/**
 * Restoring must require proving we own the value, not just the URL.
 *
 * The base-URL check catches a user who repointed the client somewhere else,
 * but not one who kept the proxy URL and changed something beside it — a
 * rotated key, an added field. Those edits were silently reverted to the
 * snapshot on shutdown. Now that each writer records exactly what it wrote,
 * a value that no longer matches that record is the user's: restore leaves it
 * alone and only clears the proxy's own bookkeeping keys.
 */
async function testQwenRestoreLeavesUserEditedAuth(): Promise<boolean> {
  const { __qwenCodeTestHooks } =
    await import("../src/cli/proxy-clients/qwenCode.js");
  const prevHome = process.env.HOME;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "neurolink-qwen-own-"));
  const url = "http://127.0.0.1:55669/v1";
  try {
    process.env.HOME = root;
    fs.mkdirSync(path.join(root, ".qwen"), { recursive: true });
    const settingsPath = __qwenCodeTestHooks.getQwenSettingsPath();
    fs.writeFileSync(
      settingsPath,
      JSON.stringify(
        {
          $version: 2,
          security: {
            auth: {
              selectedType: "openai",
              baseUrl: "https://gateway.example.com/v1",
              apiKey: "original-key",
            },
          },
        },
        null,
        2,
      ),
    );

    await __qwenCodeTestHooks.setQwenProxySettings(url);

    // Still pointed at the proxy, but the user rotated the key beside it.
    const live = JSON.parse(fs.readFileSync(settingsPath, "utf8")) as Record<
      string,
      unknown
    >;
    (
      (live.security as Record<string, unknown>).auth as Record<string, unknown>
    ).apiKey = "rotated-by-user";
    fs.writeFileSync(settingsPath, JSON.stringify(live, null, 2));

    await __qwenCodeTestHooks.clearQwenProxySettings(url);

    const after = JSON.parse(fs.readFileSync(settingsPath, "utf8")) as {
      security?: { auth?: { apiKey?: string } };
      __proxy_original_qwen_auth?: unknown;
      __proxy_written_qwen_auth?: unknown;
    };
    if (after.security?.auth?.apiKey !== "rotated-by-user") {
      log("Qwen restore reverted a credential the user changed", "red");
      return false;
    }
    if (
      "__proxy_original_qwen_auth" in after ||
      "__proxy_written_qwen_auth" in after
    ) {
      log("Qwen restore left its bookkeeping keys in the user's file", "red");
      return false;
    }
    return true;
  } finally {
    if (prevHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = prevHome;
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
}

/** See testQwenRestoreLeavesUserEditedAuth — same rule, Claude's env map. */
async function testClaudeRestoreLeavesUserEditedValue(): Promise<boolean> {
  const { __claudeCodeTestHooks } =
    await import("../src/cli/proxy-clients/claudeCode.js");
  const prevHome = process.env.HOME;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "neurolink-claude-own-"));
  const url = "http://127.0.0.1:55669";
  try {
    process.env.HOME = root;
    fs.mkdirSync(path.join(root, ".claude"), { recursive: true });
    const settingsPath = __claudeCodeTestHooks.getClaudeSettingsPath();
    // The user had no ENABLE_TOOL_SEARCH at all, so the snapshot records
    // "absent" and a restore would delete the key outright.
    fs.writeFileSync(settingsPath, JSON.stringify({ env: {} }, null, 2));

    await __claudeCodeTestHooks.setClaudeProxySettings(url);

    // Base URL untouched, but the user turned tool search back off.
    const live = JSON.parse(fs.readFileSync(settingsPath, "utf8")) as Record<
      string,
      unknown
    >;
    (live.env as Record<string, string>).ENABLE_TOOL_SEARCH = "false";
    fs.writeFileSync(settingsPath, JSON.stringify(live, null, 2));

    await __claudeCodeTestHooks.clearClaudeProxySettings(url);

    const after = JSON.parse(fs.readFileSync(settingsPath, "utf8")) as {
      env?: Record<string, string>;
    };
    if (after.env?.ENABLE_TOOL_SEARCH !== "false") {
      log("Claude restore overwrote a value the user changed", "red");
      return false;
    }
    return true;
  } finally {
    if (prevHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = prevHome;
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
}

/** See testQwenRestoreLeavesUserEditedAuth — same rule, OpenCode's block. */
async function testOpenCodeRestoreLeavesUserEditedBlock(): Promise<boolean> {
  const { __openCodeTestHooks } =
    await import("../src/cli/proxy-clients/openCode.js");
  const prevXdg = process.env.XDG_CONFIG_HOME;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "neurolink-oc-own-"));
  const url = "http://127.0.0.1:55669/v1";
  try {
    fs.mkdirSync(path.join(root, "opencode"), { recursive: true });
    process.env.XDG_CONFIG_HOME = root;
    const configPath = __openCodeTestHooks.getOpenCodeConfigPath();
    fs.writeFileSync(configPath, JSON.stringify({ provider: {} }, null, 2));

    await __openCodeTestHooks.setOpenCodeProxySettings(url);

    // Same baseURL, but the user pinned a model list on our block.
    const live = JSON.parse(fs.readFileSync(configPath, "utf8")) as Record<
      string,
      unknown
    >;
    (
      (live.provider as Record<string, unknown>).neurolink as Record<
        string,
        unknown
      >
    ).models = { "gpt-5.1": {} };
    fs.writeFileSync(configPath, JSON.stringify(live, null, 2));

    await __openCodeTestHooks.clearOpenCodeProxySettings(url);

    const after = JSON.parse(fs.readFileSync(configPath, "utf8")) as {
      provider?: { neurolink?: { models?: Record<string, unknown> } };
    };
    if (!after.provider?.neurolink?.models?.["gpt-5.1"]) {
      log("OpenCode restore discarded a field the user added", "red");
      return false;
    }
    return true;
  } finally {
    if (prevXdg === undefined) {
      delete process.env.XDG_CONFIG_HOME;
    } else {
      process.env.XDG_CONFIG_HOME = prevXdg;
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
}

/**
 * Regression: `proxy uninstall` must put every client config back.
 *
 * The shutdown path restores only on SIGINT. A launchd-managed service never
 * receives one — `launchctl unload` and `proxy uninstall` both send SIGTERM,
 * and the supervisor's own shutdown closure never touched client configs at
 * all. So the documented one-command install left all five CLIs pointing at a
 * socket that stopped answering, with no message saying why.
 *
 * Driven through the built CLI rather than the module, because the defect was
 * precisely that the wiring was missing: a test that called the helper
 * directly would have passed the whole time the bug existed.
 */
async function testUninstallRestoresClientConfigs(): Promise<boolean | null> {
  if (process.platform !== "darwin") {
    log("proxy uninstall is macOS-only; skipping on this platform", "yellow");
    return null;
  }
  const cliEntry = path.join(process.cwd(), "dist", "cli", "index.js");
  if (!fs.existsSync(cliEntry)) {
    log("dist/cli/index.js not built; skipping", "yellow");
    return null;
  }

  const home = fs.mkdtempSync(path.join(os.tmpdir(), "neurolink-uninstall-"));
  try {
    // A proxy that ran on this host/port and pointed OpenCode at itself.
    fs.mkdirSync(path.join(home, ".neurolink"), { recursive: true });
    fs.writeFileSync(
      path.join(home, ".neurolink", "proxy-state.json"),
      JSON.stringify({
        pid: 2147483000,
        port: 55669,
        host: "127.0.0.1",
        strategy: "round-robin",
        startTime: new Date(0).toISOString(),
      }),
    );

    const openCodeDir = path.join(home, ".config", "opencode");
    fs.mkdirSync(openCodeDir, { recursive: true });
    const openCodePath = path.join(openCodeDir, "opencode.json");
    fs.writeFileSync(
      openCodePath,
      JSON.stringify(
        {
          provider: {
            neurolink: {
              id: "neurolink",
              name: "NeuroLink Proxy",
              npm: "@ai-sdk/openai-compatible",
              env: [],
              models: {},
              options: {
                baseURL: "http://127.0.0.1:55669/v1",
                apiKey: "neurolink-proxy",
              },
            },
          },
          __proxy_original_neurolink: { name: "user's own block" },
        },
        null,
        2,
      ),
    );

    const { execFileSync } = await import("node:child_process");
    const env: NodeJS.ProcessEnv = { ...process.env, HOME: home };
    delete env.XDG_CONFIG_HOME;
    try {
      execFileSync(process.execPath, [cliEntry, "proxy", "uninstall"], {
        env,
        encoding: "utf8",
        stdio: "pipe",
        timeout: 60_000,
      });
    } catch {
      // uninstall exits non-zero when nothing is installed; the restore is
      // what this test is about, and it is asserted below either way.
    }

    const after = JSON.parse(fs.readFileSync(openCodePath, "utf8")) as {
      provider?: { neurolink?: { name?: string } };
    };
    if (after.provider?.neurolink?.name !== "user's own block") {
      log("proxy uninstall left OpenCode pointing at the removed proxy", "red");
      return false;
    }
    // The shipped CLI must also strip the legacy in-file snapshot keys. This is
    // the one place the built artifact — not the source hooks — is observed
    // healing a config the previous writer corrupted; OpenCode rejects unknown
    // top-level keys, so leaving them behind keeps the CLI unstartable even
    // after a clean uninstall.
    const leftover = Object.keys(
      after as unknown as Record<string, unknown>,
    ).filter((k) => k.startsWith("__proxy_"));
    if (leftover.length > 0) {
      log(
        `proxy uninstall left ${leftover.length} proxy-private top-level key(s) in opencode.json`,
        "red",
      );
      return false;
    }
    return true;
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
}

/**
 * The assertion whose absence let two fatal defects ship.
 *
 * The existing OpenCode coverage checked that the writer wrote, returned the
 * right boolean, and recorded the base URL — all true of a config OpenCode
 * refuses to load. Nothing checked the output was *usable*, so both of these
 * shipped and bricked the CLI on every invocation:
 *
 *   Unrecognized keys: "__proxy_original_neurolink", "__proxy_written_neurolink"
 *   ProviderModelNotFoundError: providerID "neurolink", suggestions: []
 *
 * OpenCode rejects unknown top-level keys, and resolves `--model` against
 * `provider.<id>.models` alone. These two properties are what "usable" means
 * for this file; assert them directly rather than trusting the writer.
 */
async function testOpenCodeWriterOutputIsLoadable(): Promise<boolean> {
  const { __openCodeTestHooks } =
    await import("../src/cli/proxy-clients/openCode.js");
  const prevXdg = process.env.XDG_CONFIG_HOME;
  const prevHome = process.env.HOME;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "neurolink-oc-load-"));
  try {
    process.env.XDG_CONFIG_HOME = path.join(root, "config");
    process.env.HOME = root;
    fs.mkdirSync(path.join(root, "config", "opencode"), { recursive: true });
    await __openCodeTestHooks.setOpenCodeProxySettings(
      "http://127.0.0.1:55669/v1",
    );
    const written = JSON.parse(
      fs.readFileSync(__openCodeTestHooks.getOpenCodeConfigPath(), "utf8"),
    ) as Record<string, unknown>;

    const unknownTopLevel = Object.keys(written).filter((k) =>
      k.startsWith("__proxy_"),
    );
    if (unknownTopLevel.length > 0) {
      // Naming the count, not the payload: an assertion message that quotes
      // config content can trip isExpectedProviderError and downgrade a real
      // failure to a skip. See CLAUDE.md.
      log(
        `OpenCode config carries ${unknownTopLevel.length} proxy-private top-level key(s); OpenCode rejects unknown keys`,
        "red",
      );
      return false;
    }

    const provider = written.provider as
      | Record<string, { models?: Record<string, unknown> }>
      | undefined;
    const models = provider?.neurolink?.models;
    if (!models || Object.keys(models).length === 0) {
      log(
        "OpenCode provider.neurolink.models is empty; every --model would be unresolvable",
        "red",
      );
      return false;
    }

    // The snapshot must exist, and must not be inside the managed file.
    if (!fs.existsSync(__openCodeTestHooks.getOpenCodeSnapshotPath())) {
      log("OpenCode snapshot was not persisted outside opencode.json", "red");
      return false;
    }
    return true;
  } finally {
    if (prevXdg === undefined) {
      delete process.env.XDG_CONFIG_HOME;
    } else {
      process.env.XDG_CONFIG_HOME = prevXdg;
    }
    if (prevHome === undefined) {
      // Leaving HOME pointed at a directory we are about to delete makes later
      // cases resolve config under a path that no longer exists, and recreate
      // it as leaked state.
      delete process.env.HOME;
    } else {
      process.env.HOME = prevHome;
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
}

/**
 * A config already corrupted by the pre-fix writer must heal, not stay broken.
 *
 * Users who ran any previous version have the two `__proxy_*` keys on disk. If
 * apply() only stopped writing them, those users would still have an OpenCode
 * that refuses to start. The legacy in-file snapshot is also the only record
 * of their original provider block, so it must be adopted, not dropped.
 */
async function testOpenCodeMigratesLegacyInFileSnapshot(): Promise<boolean> {
  const { __openCodeTestHooks } =
    await import("../src/cli/proxy-clients/openCode.js");
  const prevXdg = process.env.XDG_CONFIG_HOME;
  const prevHome = process.env.HOME;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "neurolink-oc-migrate-"));
  try {
    process.env.XDG_CONFIG_HOME = path.join(root, "config");
    process.env.HOME = root;
    fs.mkdirSync(path.join(root, "config", "opencode"), { recursive: true });
    const url = "http://127.0.0.1:55669/v1";
    fs.writeFileSync(
      __openCodeTestHooks.getOpenCodeConfigPath(),
      JSON.stringify({
        provider: { neurolink: { id: "neurolink", options: { baseURL: url } } },
        __proxy_original_neurolink: { id: "neurolink", marker: "user-block" },
      }),
    );

    await __openCodeTestHooks.setOpenCodeProxySettings(url);
    const healed = JSON.parse(
      fs.readFileSync(__openCodeTestHooks.getOpenCodeConfigPath(), "utf8"),
    ) as Record<string, unknown>;
    if (Object.keys(healed).some((k) => k.startsWith("__proxy_"))) {
      log("apply() left legacy proxy keys in opencode.json", "red");
      return false;
    }

    // Restoring must hand back the block the legacy snapshot was holding.
    await __openCodeTestHooks.clearOpenCodeProxySettings(url);
    const restored = JSON.parse(
      fs.readFileSync(__openCodeTestHooks.getOpenCodeConfigPath(), "utf8"),
    ) as { provider?: { neurolink?: { marker?: string } } };
    if (restored.provider?.neurolink?.marker !== "user-block") {
      log("migration lost the user's original provider block", "red");
      return false;
    }
    return true;
  } finally {
    if (prevXdg === undefined) {
      delete process.env.XDG_CONFIG_HOME;
    } else {
      process.env.XDG_CONFIG_HOME = prevXdg;
    }
    if (prevHome === undefined) {
      // Leaving HOME pointed at a directory we are about to delete makes later
      // cases resolve config under a path that no longer exists, and recreate
      // it as leaked state.
      delete process.env.HOME;
    } else {
      process.env.HOME = prevHome;
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
}

/**
 * Gemini's `.env` is the user's file; the writer owns exactly two lines of it.
 *
 * Restore must be byte-exact rather than "close enough": the file routinely
 * holds unrelated variables for other tools, plus comments and an ordering the
 * user chose. Reconstructing it would silently reformat all of that.
 */
async function testGeminiEnvWriterRoundTrip(): Promise<boolean> {
  const { __geminiTestHooks } =
    await import("../src/cli/proxy-clients/gemini.js");
  const prevHome = process.env.HOME;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "neurolink-gemini-"));
  try {
    process.env.HOME = root;
    fs.mkdirSync(path.join(root, ".gemini"), { recursive: true });
    const url = "http://127.0.0.1:55669";
    const userEnv =
      "# notes\nOTHER_TOOL=keep-me\nGEMINI_API_KEY=user-real-key\n";
    fs.writeFileSync(__geminiTestHooks.getGeminiEnvPath(), userEnv);

    await __geminiTestHooks.setGeminiProxySettings(url);
    const applied = fs.readFileSync(
      __geminiTestHooks.getGeminiEnvPath(),
      "utf8",
    );
    if (!applied.includes(`GOOGLE_GEMINI_BASE_URL=${url}`)) {
      log("Gemini writer did not record the proxy base URL", "red");
      return false;
    }
    if (!applied.includes("OTHER_TOOL=keep-me")) {
      log("Gemini writer dropped an unrelated variable", "red");
      return false;
    }

    await __geminiTestHooks.clearGeminiProxySettings(url);
    if (
      fs.readFileSync(__geminiTestHooks.getGeminiEnvPath(), "utf8") !== userEnv
    ) {
      log("Gemini restore did not reproduce the original .env exactly", "red");
      return false;
    }
    return true;
  } finally {
    if (prevHome === undefined) {
      // Leaving HOME pointed at a directory we are about to delete makes later
      // cases resolve config under a path that no longer exists, and recreate
      // it as leaked state.
      delete process.env.HOME;
    } else {
      process.env.HOME = prevHome;
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
}

/**
 * A malformed snapshot must never be read as "the user had nothing here".
 *
 * Snapshots are ordinary files: a full disk truncates them, a person edits
 * them, an older version leaves a different shape. `JSON.parse` accepts `{}`
 * happily, and the restore paths then see an absent `original` — which they
 * treat as "there was no provider block", and act on by deleting the real one.
 * Measured before the guard: the user's provider.neurolink was destroyed.
 */
async function testOpenCodeMalformedSnapshotIsIgnored(): Promise<boolean> {
  const { __openCodeTestHooks } =
    await import("../src/cli/proxy-clients/openCode.js");
  const prevXdg = process.env.XDG_CONFIG_HOME;
  const prevHome = process.env.HOME;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "neurolink-oc-badsnap-"));
  try {
    process.env.XDG_CONFIG_HOME = path.join(root, "config");
    process.env.HOME = root;
    fs.mkdirSync(path.join(root, "config", "opencode"), { recursive: true });
    fs.mkdirSync(path.join(root, ".neurolink"), { recursive: true });
    const url = "http://127.0.0.1:55669/v1";
    fs.writeFileSync(
      __openCodeTestHooks.getOpenCodeConfigPath(),
      JSON.stringify({
        provider: {
          neurolink: {
            id: "neurolink",
            marker: "user",
            options: { baseURL: url },
          },
        },
      }),
    );
    fs.writeFileSync(__openCodeTestHooks.getOpenCodeSnapshotPath(), "{}");

    await __openCodeTestHooks.clearOpenCodeProxySettings(url);
    const after = JSON.parse(
      fs.readFileSync(__openCodeTestHooks.getOpenCodeConfigPath(), "utf8"),
    ) as { provider?: { neurolink?: { marker?: string } } };
    if (after.provider?.neurolink?.marker !== "user") {
      log(
        "a malformed snapshot caused restore to delete the user's provider block",
        "red",
      );
      return false;
    }
    return true;
  } finally {
    if (prevXdg === undefined) {
      delete process.env.XDG_CONFIG_HOME;
    } else {
      process.env.XDG_CONFIG_HOME = prevXdg;
    }
    if (prevHome === undefined) {
      // Leaving HOME pointed at a directory we are about to delete makes later
      // cases resolve config under a path that no longer exists, and recreate
      // it as leaked state.
      delete process.env.HOME;
    } else {
      process.env.HOME = prevHome;
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
}

/**
 * Same hazard on the Gemini side, with a different failure shape: a snapshot
 * without `originalEnv` handed `undefined` to the atomic writer and threw.
 * restoreAllClients catches per-client errors, so the throw was invisible and
 * the user stayed pointed at a proxy that was no longer running.
 */
async function testGeminiMalformedSnapshotIsIgnored(): Promise<boolean> {
  const { __geminiTestHooks } =
    await import("../src/cli/proxy-clients/gemini.js");
  const prevHome = process.env.HOME;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "neurolink-gm-badsnap-"));
  try {
    process.env.HOME = root;
    fs.mkdirSync(path.join(root, ".gemini"), { recursive: true });
    fs.mkdirSync(path.join(root, ".neurolink"), { recursive: true });
    const url = "http://127.0.0.1:55669";
    fs.writeFileSync(
      __geminiTestHooks.getGeminiEnvPath(),
      `OTHER_TOOL=keep-me\nGOOGLE_GEMINI_BASE_URL=${url}\nGEMINI_API_KEY=neurolink-proxy\n`,
    );
    fs.writeFileSync(__geminiTestHooks.getGeminiSnapshotPath(), "{}");

    await __geminiTestHooks.clearGeminiProxySettings(url);
    const after = fs.existsSync(__geminiTestHooks.getGeminiEnvPath())
      ? fs.readFileSync(__geminiTestHooks.getGeminiEnvPath(), "utf8")
      : "";
    if (!after.includes("OTHER_TOOL=keep-me")) {
      log("a malformed snapshot cost the user an unrelated variable", "red");
      return false;
    }
    return true;
  } finally {
    if (prevHome === undefined) {
      // Leaving HOME pointed at a directory we are about to delete makes later
      // cases resolve config under a path that no longer exists, and recreate
      // it as leaked state.
      delete process.env.HOME;
    } else {
      process.env.HOME = prevHome;
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
}

/**
 * Restore must undo our two variables, not replay the whole file.
 *
 * Writing `snapshot.originalEnv` over the current `.env` discards everything
 * the user changed after apply() — and the base-URL guard cannot catch it,
 * because the URL still matches. Measured before the fix: a line added after
 * apply() was gone after restore.
 */
async function testGeminiRestoreKeepsPostApplyEdits(): Promise<boolean> {
  const { geminiConfigurator, __geminiTestHooks } =
    await import("../src/cli/proxy-clients/gemini.js");
  const prevHome = process.env.HOME;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "neurolink-gm-edits-"));
  try {
    process.env.HOME = root;
    fs.mkdirSync(path.join(root, ".gemini"), { recursive: true });
    const url = "http://127.0.0.1:55669";
    fs.writeFileSync(__geminiTestHooks.getGeminiEnvPath(), "OTHER=original\n");

    await geminiConfigurator.apply(url);
    fs.appendFileSync(
      __geminiTestHooks.getGeminiEnvPath(),
      "ADDED_AFTER_APPLY=important\n",
    );
    await geminiConfigurator.restore(url);

    const after = fs.readFileSync(__geminiTestHooks.getGeminiEnvPath(), "utf8");
    if (!after.includes("ADDED_AFTER_APPLY=important")) {
      log("restore discarded a variable the user added after apply", "red");
      return false;
    }
    if (after.includes("GOOGLE_GEMINI_BASE_URL")) {
      log("restore left the managed base URL behind", "red");
      return false;
    }
    return true;
  } finally {
    if (prevHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = prevHome;
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
}

/**
 * Two XDG roots under one HOME are two independent OpenCode installs.
 *
 * The snapshot path derived from HOME alone while the config path derived from
 * XDG_CONFIG_HOME, so the second apply() overwrote the first's saved original.
 * Measured before the fix: clearing root A restored root B's provider block
 * onto it.
 */
async function testOpenCodeSnapshotIsScopedPerConfigDir(): Promise<boolean> {
  const { __openCodeTestHooks } =
    await import("../src/cli/proxy-clients/openCode.js");
  const prevHome = process.env.HOME;
  const prevXdg = process.env.XDG_CONFIG_HOME;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "neurolink-oc-xdg-"));
  try {
    process.env.HOME = root;
    const url = "http://127.0.0.1:55669/v1";
    const seed = (dir: string, marker: string): void => {
      fs.mkdirSync(path.join(root, dir, "opencode"), { recursive: true });
      fs.writeFileSync(
        path.join(root, dir, "opencode", "opencode.json"),
        JSON.stringify({
          provider: {
            neurolink: { id: "neurolink", marker, options: { baseURL: url } },
          },
        }),
      );
    };
    seed("cfgA", "BLOCK-A");
    seed("cfgB", "BLOCK-B");

    process.env.XDG_CONFIG_HOME = path.join(root, "cfgA");
    await __openCodeTestHooks.setOpenCodeProxySettings(url);
    process.env.XDG_CONFIG_HOME = path.join(root, "cfgB");
    await __openCodeTestHooks.setOpenCodeProxySettings(url);

    process.env.XDG_CONFIG_HOME = path.join(root, "cfgA");
    await __openCodeTestHooks.clearOpenCodeProxySettings(url);
    const restored = JSON.parse(
      fs.readFileSync(
        path.join(root, "cfgA", "opencode", "opencode.json"),
        "utf8",
      ),
    ) as { provider?: { neurolink?: { marker?: string } } };
    if (restored.provider?.neurolink?.marker !== "BLOCK-A") {
      log(
        "restoring one XDG root did not return that root's own provider block",
        "red",
      );
      return false;
    }
    return true;
  } finally {
    if (prevHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = prevHome;
    }
    if (prevXdg === undefined) {
      delete process.env.XDG_CONFIG_HOME;
    } else {
      process.env.XDG_CONFIG_HOME = prevXdg;
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
}

/**
 * "No usable snapshot" and "no snapshot file" are different, and the gap was
 * the user's API key.
 *
 * apply() gated snapshot capture on `existsSync`, so a file that existed but
 * could not be parsed satisfied it: the placeholder went over the real key and
 * nothing recorded it. restore() then took its no-snapshot path and removed the
 * variable outright. Measured before the fix: the `.env` came back empty.
 */
async function testGeminiApplyRefusesOnUnusableSnapshot(): Promise<boolean> {
  const { geminiConfigurator, __geminiTestHooks } =
    await import("../src/cli/proxy-clients/gemini.js");
  const prevHome = process.env.HOME;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "neurolink-gm-unusable-"));
  try {
    process.env.HOME = root;
    fs.mkdirSync(path.join(root, ".gemini"), { recursive: true });
    fs.mkdirSync(path.join(root, ".neurolink"), { recursive: true });
    const url = "http://127.0.0.1:55669";
    fs.writeFileSync(
      __geminiTestHooks.getGeminiEnvPath(),
      "GEMINI_API_KEY=user-real-key\n",
    );
    fs.writeFileSync(__geminiTestHooks.getGeminiSnapshotPath(), "{}");

    const applied = await geminiConfigurator.apply(url);
    if (applied !== false) {
      log("apply() claimed success despite an unusable snapshot", "red");
      return false;
    }
    await geminiConfigurator.restore(url);
    const after = fs.existsSync(__geminiTestHooks.getGeminiEnvPath())
      ? fs.readFileSync(__geminiTestHooks.getGeminiEnvPath(), "utf8")
      : "";
    if (!after.includes("user-real-key")) {
      log("an unusable snapshot cost the user their API key", "red");
      return false;
    }
    return true;
  } finally {
    if (prevHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = prevHome;
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
}

/**
 * A legacy record carrying only the written key proves the proxy wrote
 * something. It does NOT prove the user had no provider block of their own,
 * and treating it as `original: null` made restore delete a real one.
 */
async function testOpenCodePartialLegacyRecordIsNotRestoredFrom(): Promise<boolean> {
  const { __openCodeTestHooks } =
    await import("../src/cli/proxy-clients/openCode.js");
  const prevHome = process.env.HOME;
  const prevXdg = process.env.XDG_CONFIG_HOME;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "neurolink-oc-partial-"));
  try {
    process.env.HOME = root;
    process.env.XDG_CONFIG_HOME = path.join(root, "config");
    fs.mkdirSync(path.join(root, "config", "opencode"), { recursive: true });
    const url = "http://127.0.0.1:55669/v1";
    const block = {
      id: "neurolink",
      marker: "user",
      options: { baseURL: url },
    };
    fs.writeFileSync(
      __openCodeTestHooks.getOpenCodeConfigPath(),
      JSON.stringify({
        provider: { neurolink: block },
        __proxy_written_neurolink: block,
      }),
    );

    await __openCodeTestHooks.clearOpenCodeProxySettings(url);
    const after = JSON.parse(
      fs.readFileSync(__openCodeTestHooks.getOpenCodeConfigPath(), "utf8"),
    ) as Record<string, unknown> & {
      provider?: { neurolink?: { marker?: string } };
    };
    if (after.provider?.neurolink?.marker !== "user") {
      log(
        "a partial legacy record caused the user's block to be deleted",
        "red",
      );
      return false;
    }
    if (Object.keys(after).some((k) => k.startsWith("__proxy_"))) {
      log("the partial legacy key was left in opencode.json", "red");
      return false;
    }
    return true;
  } finally {
    if (prevHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = prevHome;
    }
    if (prevXdg === undefined) {
      delete process.env.XDG_CONFIG_HOME;
    } else {
      process.env.XDG_CONFIG_HOME = prevXdg;
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
}

/**
 * The unscoped snapshot is shared by every XDG root on the machine, so it must
 * never outrank a record belonging to this config in particular. Preferring it
 * let one root adopt another root's `original` and restore the wrong block.
 */
async function testOpenCodePrefersInFileSnapshotOverGlobalFallback(): Promise<boolean> {
  const { __openCodeTestHooks } =
    await import("../src/cli/proxy-clients/openCode.js");
  const prevHome = process.env.HOME;
  const prevXdg = process.env.XDG_CONFIG_HOME;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "neurolink-oc-prec-"));
  try {
    process.env.HOME = root;
    process.env.XDG_CONFIG_HOME = path.join(root, "cfgB");
    fs.mkdirSync(path.join(root, "cfgB", "opencode"), { recursive: true });
    fs.mkdirSync(path.join(root, ".neurolink"), { recursive: true });
    const url = "http://127.0.0.1:55669/v1";
    const block = { id: "neurolink", options: { baseURL: url } };

    // A global snapshot left by a DIFFERENT root, naming a foreign original.
    fs.writeFileSync(
      path.join(root, ".neurolink", "opencode-proxy-snapshot.json"),
      JSON.stringify({ original: { id: "neurolink", marker: "ROOT-A" } }),
    );
    // This root's own in-file record, naming its own original.
    fs.writeFileSync(
      __openCodeTestHooks.getOpenCodeConfigPath(),
      JSON.stringify({
        provider: { neurolink: block },
        __proxy_original_neurolink: { id: "neurolink", marker: "ROOT-B" },
        __proxy_written_neurolink: block,
      }),
    );

    await __openCodeTestHooks.clearOpenCodeProxySettings(url);
    const after = JSON.parse(
      fs.readFileSync(__openCodeTestHooks.getOpenCodeConfigPath(), "utf8"),
    ) as { provider?: { neurolink?: { marker?: string } } };
    if (after.provider?.neurolink?.marker !== "ROOT-B") {
      log(
        "restore preferred another root's global snapshot over this config's own record",
        "red",
      );
      return false;
    }
    return true;
  } finally {
    if (prevHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = prevHome;
    }
    if (prevXdg === undefined) {
      delete process.env.XDG_CONFIG_HOME;
    } else {
      process.env.XDG_CONFIG_HOME = prevXdg;
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
}

/**
 * The unscoped snapshot belongs to whichever root has not migrated yet.
 *
 * Restore used to delete both snapshot paths unconditionally, so a root that
 * restored from its own scoped file still removed the shared legacy one — and
 * with it, another root's only record of its original provider block.
 */
async function testOpenCodeClearKeepsOtherRootsLegacySnapshot(): Promise<boolean> {
  const { __openCodeTestHooks } =
    await import("../src/cli/proxy-clients/openCode.js");
  const prevHome = process.env.HOME;
  const prevXdg = process.env.XDG_CONFIG_HOME;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "neurolink-oc-shared-"));
  try {
    process.env.HOME = root;
    fs.mkdirSync(path.join(root, ".neurolink"), { recursive: true });
    const url = "http://127.0.0.1:55669/v1";
    const legacyPath = path.join(
      root,
      ".neurolink",
      "opencode-proxy-snapshot.json",
    );
    // Root A has not been migrated: its only record is the shared file.
    fs.writeFileSync(
      legacyPath,
      JSON.stringify({ original: { id: "neurolink", marker: "A-ORIGINAL" } }),
    );

    // Root B applies (gaining a scoped snapshot) and then clears.
    process.env.XDG_CONFIG_HOME = path.join(root, "cfgB");
    fs.mkdirSync(path.join(root, "cfgB", "opencode"), { recursive: true });
    fs.writeFileSync(
      __openCodeTestHooks.getOpenCodeConfigPath(),
      JSON.stringify({ provider: {} }),
    );
    await __openCodeTestHooks.setOpenCodeProxySettings(url);
    await __openCodeTestHooks.clearOpenCodeProxySettings(url);

    if (!fs.existsSync(legacyPath)) {
      log("clearing one XDG root deleted another root's only snapshot", "red");
      return false;
    }
    return true;
  } finally {
    if (prevHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = prevHome;
    }
    if (prevXdg === undefined) {
      delete process.env.XDG_CONFIG_HOME;
    } else {
      process.env.XDG_CONFIG_HOME = prevXdg;
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
}

/**
 * Restore with no usable record must not "tidy up" the managed variables.
 *
 * GEMINI_API_KEY may hold the user's real key. Removing it without a snapshot
 * to restore from destroys something unrecoverable; leaving a stale base URL
 * behind only costs a failed request the user can diagnose.
 */
async function testGeminiClearWithoutSnapshotKeepsTheKey(): Promise<boolean> {
  const { geminiConfigurator, __geminiTestHooks } =
    await import("../src/cli/proxy-clients/gemini.js");
  const prevHome = process.env.HOME;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "neurolink-gm-nosnap-"));
  try {
    process.env.HOME = root;
    fs.mkdirSync(path.join(root, ".gemini"), { recursive: true });
    const url = "http://127.0.0.1:55669";
    fs.writeFileSync(
      __geminiTestHooks.getGeminiEnvPath(),
      `GOOGLE_GEMINI_BASE_URL=${url}\nGEMINI_API_KEY=user-real-key\n`,
    );

    const restored = await geminiConfigurator.restore(url);
    if (restored !== false) {
      log("clear() claimed success with no snapshot to restore from", "red");
      return false;
    }
    const after = fs.readFileSync(__geminiTestHooks.getGeminiEnvPath(), "utf8");
    if (!after.includes("user-real-key")) {
      log("clear() removed an API key it had no record of", "red");
      return false;
    }
    return true;
  } finally {
    if (prevHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = prevHome;
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
}

/**
 * A snapshot that no longer describes the file is stale, not authoritative.
 *
 * If restore cannot delete the snapshot, or the user edits a managed variable
 * afterwards, reusing the stored record makes the next restore replay outdated
 * values over the newer ones.
 */
async function testGeminiRecapturesStaleSnapshot(): Promise<boolean> {
  const { geminiConfigurator, __geminiTestHooks } =
    await import("../src/cli/proxy-clients/gemini.js");
  const prevHome = process.env.HOME;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "neurolink-gm-stale-"));
  try {
    process.env.HOME = root;
    fs.mkdirSync(path.join(root, ".gemini"), { recursive: true });
    const url = "http://127.0.0.1:55669";
    fs.writeFileSync(
      __geminiTestHooks.getGeminiEnvPath(),
      "GEMINI_API_KEY=first-key\n",
    );

    await geminiConfigurator.apply(url);
    await geminiConfigurator.restore(url);
    // Simulate a restore whose snapshot cleanup failed, then a user edit.
    fs.writeFileSync(
      __geminiTestHooks.getGeminiSnapshotPath(),
      JSON.stringify({
        originalEnv: "GEMINI_API_KEY=first-key\n",
        written: { baseUrl: url, apiKey: "neurolink-proxy" },
      }),
    );
    fs.writeFileSync(
      __geminiTestHooks.getGeminiEnvPath(),
      "GEMINI_API_KEY=second-key\n",
    );

    await geminiConfigurator.apply(url);
    await geminiConfigurator.restore(url);
    const after = fs.readFileSync(__geminiTestHooks.getGeminiEnvPath(), "utf8");
    if (!after.includes("second-key")) {
      log("a stale snapshot replayed an outdated key over a newer one", "red");
      return false;
    }
    return true;
  } finally {
    if (prevHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = prevHome;
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
}

/**
 * A migration that was interrupted must not adopt the proxy's own block as the
 * user's original.
 *
 * apply() writes the external snapshot before opencode.json. If the config
 * write then fails — reachable, because applyAllClients() catches each
 * client's error and carries on — the retry runs against a config that still
 * holds the legacy `__proxy_*` keys. The scoped snapshot from the failed
 * attempt used to win precedence there, and on a migration run it is
 * *guaranteed* to disagree with what is on disk: the old writer's block has
 * `models: {}` while the new writer's `written` carries the full map, so
 * valuesMatch() is always false and shouldCaptureSnapshot() re-captures. The
 * re-capture then records the OLD PROXY BLOCK as the user's original and drops
 * the real one the in-file record was still holding. Silent and permanent.
 *
 * Not an unlucky mismatch — structural to the migration path, which is exactly
 * the path where the in-file record is the only copy of the truth.
 */
async function testOpenCodeInterruptedMigrationKeepsTrueOriginal(): Promise<boolean> {
  const { __openCodeTestHooks } =
    await import("../src/cli/proxy-clients/openCode.js");
  const prevHome = process.env.HOME;
  const prevXdg = process.env.XDG_CONFIG_HOME;
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "neurolink-oc-interrupt-"),
  );
  try {
    process.env.HOME = root;
    process.env.XDG_CONFIG_HOME = path.join(root, "config");
    fs.mkdirSync(path.join(root, "config", "opencode"), { recursive: true });
    fs.mkdirSync(path.join(root, ".neurolink"), { recursive: true });
    const url = "http://127.0.0.1:55669/v1";
    const userOriginal = {
      id: "neurolink",
      marker: "true-user-original",
      options: { baseURL: "https://the-users-own-endpoint" },
    };
    // The old writer's output: models empty, plus the in-file legacy keys.
    const oldProxyBlock = {
      id: "neurolink",
      name: "NeuroLink Proxy",
      npm: "@ai-sdk/openai-compatible",
      env: [],
      models: {},
      options: { baseURL: url, apiKey: "neurolink-proxy" },
    };
    fs.writeFileSync(
      __openCodeTestHooks.getOpenCodeConfigPath(),
      JSON.stringify({
        provider: { neurolink: oldProxyBlock },
        __proxy_original_neurolink: userOriginal,
        __proxy_written_neurolink: oldProxyBlock,
      }),
    );
    // The state a failed config write leaves behind: scoped snapshot landed,
    // its `written` carries the NEW block, so it cannot match what is on disk.
    fs.writeFileSync(
      __openCodeTestHooks.getOpenCodeSnapshotPath(),
      JSON.stringify({
        original: userOriginal,
        written: { ...oldProxyBlock, models: { "claude-haiku-4-5": {} } },
      }),
    );

    await __openCodeTestHooks.setOpenCodeProxySettings(url);

    const snap = JSON.parse(
      fs.readFileSync(__openCodeTestHooks.getOpenCodeSnapshotPath(), "utf8"),
    ) as { original?: { marker?: string } };
    if (snap.original?.marker !== "true-user-original") {
      log(
        "an interrupted migration replaced the user's original with the proxy's own block",
        "red",
      );
      return false;
    }
    return true;
  } finally {
    if (prevHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = prevHome;
    }
    if (prevXdg === undefined) {
      delete process.env.XDG_CONFIG_HOME;
    } else {
      process.env.XDG_CONFIG_HOME = prevXdg;
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
}

/**
 * A written file is not a live configuration.
 *
 * Copilot reads provider settings from the environment only — `app.js`
 * resolves COPILOT_PROVIDER_BASE_URL through `process.env` with no config-file
 * fallback — so its configurator writes a script the user must source. Until
 * they do, Copilot talks to GitHub while the proxy prints a green check. On
 * the machine this was developed against the script was sourced in no profile
 * at all, so that check had been wrong for its entire existence.
 */
async function testCopilotReportsWhenItsScriptIsNotSourced(): Promise<boolean> {
  const { applyAllClients, restoreAllClients } =
    await import("../src/cli/proxy-clients/registry.js");
  const prevHome = process.env.HOME;
  const prevXdg = process.env.XDG_CONFIG_HOME;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "neurolink-cop-note-"));
  try {
    process.env.HOME = root;
    // XDG_CONFIG_HOME too, not just HOME. This drives the whole roster, and
    // OpenCode resolves its config dir through XDG_CONFIG_HOME first — leaving
    // it unscoped means a developer who has it set gets their real
    // opencode.json rewritten by a test. testApplyAllReportsPerClient one
    // function away already scopes both; this diverged from it.
    process.env.XDG_CONFIG_HOME = path.join(root, ".config");
    fs.mkdirSync(path.join(root, ".copilot"), { recursive: true });

    const before = (await applyAllClients("http://127.0.0.1:55669")).find(
      (r) => r.id === "copilot",
    );
    if (before?.applied !== true) {
      log("Copilot writer did not report a successful write", "red");
      return false;
    }
    if (!before.note) {
      log(
        "Copilot reported plain success for a script no profile sources",
        "red",
      );
      return false;
    }

    // Once a profile sources it, the outstanding action is gone.
    fs.writeFileSync(
      path.join(root, ".zshrc"),
      "[ -f ~/.neurolink/copilot-env.sh ] && . ~/.neurolink/copilot-env.sh\n",
    );
    const after = (await applyAllClients("http://127.0.0.1:55669")).find(
      (r) => r.id === "copilot",
    );
    if (after?.note) {
      log("Copilot still reported an outstanding action once sourced", "red");
      return false;
    }
    // Leave nothing applied, matching testApplyAllReportsPerClient.
    await restoreAllClients("http://127.0.0.1:55669");
    return true;
  } finally {
    if (prevHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = prevHome;
    }
    if (prevXdg === undefined) {
      delete process.env.XDG_CONFIG_HOME;
    } else {
      process.env.XDG_CONFIG_HOME = prevXdg;
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
}

/**
 * Copilot's BYOK path refuses to start without an explicit model, so a script
 * that stops at the base URL leaves the user passing --model on every single
 * invocation. Measured before the fix: `copilot -p "..."` exited 1 with "BYOK
 * providers require an explicit model".
 *
 * The default is written through `${VAR:-default}` so a user who exports their
 * own choice before sourcing keeps it.
 */
async function testCopilotEnvScriptSetsAModelId(): Promise<boolean> {
  const { __copilotTestHooks } =
    await import("../src/cli/proxy-clients/copilot.js");
  const prevHome = process.env.HOME;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "neurolink-cop-model-"));
  try {
    process.env.HOME = root;
    fs.mkdirSync(path.join(root, ".copilot"), { recursive: true });
    await __copilotTestHooks.setCopilotProxySettings(
      "http://127.0.0.1:55669/v1",
    );
    const script = fs.readFileSync(
      __copilotTestHooks.getCopilotEnvPath(),
      "utf8",
    );
    if (!script.includes("COPILOT_PROVIDER_MODEL_ID")) {
      log(
        "Copilot env script sets no model id; BYOK refuses to start without one",
        "red",
      );
      return false;
    }
    if (!script.includes("COPILOT_PROVIDER_MODEL_ID:-")) {
      log("Copilot model id is not user-overridable", "red");
      return false;
    }
    return true;
  } finally {
    if (prevHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = prevHome;
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
}

/**
 * A duplicated key silently wins over ours.
 *
 * Gemini CLI resolves `.env` with dotenv, which takes the LAST assignment —
 * measured, not assumed: a file listing the proxy URL first and a dead port
 * second sent the request to the dead port. The helpers matched with "m" and
 * no "g", so a pre-existing duplicate left our value overridden while apply()
 * reported success and Gemini went on talking to Google.
 *
 * Restore has the mirror of it: clearing only the first occurrence leaves a
 * later assignment still pointing at a proxy that is no longer running.
 */
async function testGeminiCollapsesDuplicateManagedKeys(): Promise<boolean> {
  const { geminiConfigurator, __geminiTestHooks } =
    await import("../src/cli/proxy-clients/gemini.js");
  const prevHome = process.env.HOME;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "neurolink-gm-dup-"));
  try {
    process.env.HOME = root;
    fs.mkdirSync(path.join(root, ".gemini"), { recursive: true });
    const url = "http://127.0.0.1:55669";
    fs.writeFileSync(
      __geminiTestHooks.getGeminiEnvPath(),
      "GOOGLE_GEMINI_BASE_URL=http://127.0.0.1:59999\nOTHER_TOOL=keep-me\nGOOGLE_GEMINI_BASE_URL=http://127.0.0.1:58888\n",
    );

    await geminiConfigurator.apply(url);
    const applied = fs.readFileSync(
      __geminiTestHooks.getGeminiEnvPath(),
      "utf8",
    );
    const matches = applied.match(/^GOOGLE_GEMINI_BASE_URL=.*$/gm) ?? [];
    if (matches.length !== 1) {
      log(
        `apply left ${matches.length} base-URL assignments; dotenv resolves the last, so ours can be overridden`,
        "red",
      );
      return false;
    }
    if (!matches[0]?.endsWith(url)) {
      log("the surviving base-URL assignment is not the proxy's", "red");
      return false;
    }
    if (!applied.includes("OTHER_TOOL=keep-me")) {
      log("collapsing duplicates dropped an unrelated variable", "red");
      return false;
    }

    // Restore puts back the value the user actually had — which here IS a base
    // URL, their own, so its presence is correct. What must not survive is a
    // second assignment or the proxy's value: dotenv resolves the last, so
    // either would leave the CLI pointed somewhere the user did not choose.
    await geminiConfigurator.restore(url);
    const restored = fs.readFileSync(
      __geminiTestHooks.getGeminiEnvPath(),
      "utf8",
    );
    const after = restored.match(/^GOOGLE_GEMINI_BASE_URL=.*$/gm) ?? [];
    if (after.length !== 1) {
      log(
        `restore left ${after.length} base-URL assignments; dotenv resolves the last`,
        "red",
      );
      return false;
    }
    if (after[0]?.includes(url)) {
      log("restore left the proxy's base URL in place", "red");
      return false;
    }
    if (!restored.includes("OTHER_TOOL=keep-me")) {
      log("restore dropped an unrelated variable", "red");
      return false;
    }
    return true;
  } finally {
    if (prevHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = prevHome;
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
}

/**
 * Ownership must be judged on the assignment the CLI actually resolves.
 *
 * dotenv takes the last one, so a user who appends their own
 * GOOGLE_GEMINI_BASE_URL after apply() has already repointed Gemini — our line
 * is still on the page but no longer in effect. Checking the first assignment
 * saw our value, passed the ownership test, and restore then deleted the
 * endpoint the CLI was using. Measured before the fix: the user's endpoint was
 * gone and restore reported success.
 */
async function testGeminiRestoreRespectsAUserRepoint(): Promise<boolean> {
  const { geminiConfigurator, __geminiTestHooks } =
    await import("../src/cli/proxy-clients/gemini.js");
  const prevHome = process.env.HOME;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "neurolink-gm-repoint-"));
  try {
    process.env.HOME = root;
    fs.mkdirSync(path.join(root, ".gemini"), { recursive: true });
    const url = "http://127.0.0.1:55669";
    fs.writeFileSync(
      __geminiTestHooks.getGeminiEnvPath(),
      "GEMINI_API_KEY=user-key\n",
    );
    await geminiConfigurator.apply(url);
    fs.appendFileSync(
      __geminiTestHooks.getGeminiEnvPath(),
      "GOOGLE_GEMINI_BASE_URL=https://the-users-own-endpoint\n",
    );

    const restored = await geminiConfigurator.restore(url);
    const after = fs.readFileSync(__geminiTestHooks.getGeminiEnvPath(), "utf8");
    if (!after.includes("the-users-own-endpoint")) {
      log(
        "restore deleted the endpoint the user had repointed Gemini at",
        "red",
      );
      return false;
    }
    if (restored !== false) {
      log("restore claimed success on a config it does not own", "red");
      return false;
    }
    return true;
  } finally {
    if (prevHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = prevHome;
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
}

/**
 * The round-trip must be byte-exact on CRLF too.
 *
 * The existing round-trip case fixtures an LF-only `.env`, which is precisely
 * where a line-ending bug cannot show: replacing "\n" with "\n" is a no-op. A
 * rewrite that captured the terminator and re-emitted a bare LF therefore
 * passed it while silently converting CRLF to LF — and on the ordinary
 * single-occurrence path, not just on duplicates. Gemini CLI is cross-platform,
 * so a Windows-authored .env is not an exotic input.
 *
 * The suite had zero `\r` literals anywhere before this case.
 */
async function testGeminiRoundTripsCrlfExactly(): Promise<boolean> {
  const { geminiConfigurator, __geminiTestHooks } =
    await import("../src/cli/proxy-clients/gemini.js");
  const prevHome = process.env.HOME;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "neurolink-gm-crlf-"));
  try {
    process.env.HOME = root;
    fs.mkdirSync(path.join(root, ".gemini"), { recursive: true });
    const url = "http://127.0.0.1:55669";
    const original =
      "FOO=bar\r\nGOOGLE_GEMINI_BASE_URL=http://original\r\nBAZ=qux\r\n";
    fs.writeFileSync(__geminiTestHooks.getGeminiEnvPath(), original);

    await geminiConfigurator.apply(url);
    await geminiConfigurator.restore(url);

    const back = fs.readFileSync(__geminiTestHooks.getGeminiEnvPath(), "utf8");
    if (back !== original) {
      // Naming the discrepancy, not printing the payload: a message quoting
      // file content can match isExpectedProviderError() and downgrade a real
      // failure to a skip.
      const changed = back.includes("\r\nGOOGLE_GEMINI_BASE_URL")
        ? "content"
        : "line ending on the managed key";
      log(
        `CRLF .env did not round-trip byte-exactly — ${changed} differs`,
        "red",
      );
      return false;
    }
    return true;
  } finally {
    if (prevHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = prevHome;
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
}

/**
 * Regression: a stale snapshot must never outlive the value it describes.
 *
 * The snapshot-on-first-touch guard exists so a second apply() cannot record
 * the proxy's own block as the "original". But the guard is presence-only, so
 * after an unclean kill (no restore ran) the sentinel survives in the file. If
 * the user then replaces the block by hand and the proxy restarts, apply()
 * overwrites their edit while keeping the now-stale snapshot — and the next
 * restore writes the stale value back, destroying the user's real config.
 *
 * Each of the three JSON configurators is checked, because each carries its
 * own copy of the guard.
 */
async function testOpenCodeReSnapshotsAfterUncleanExit(): Promise<boolean> {
  const { __openCodeTestHooks } =
    await import("../src/cli/proxy-clients/openCode.js");
  const prevXdg = process.env.XDG_CONFIG_HOME;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "neurolink-opencode-"));
  const url = "http://127.0.0.1:55669/v1";
  try {
    fs.mkdirSync(path.join(root, "opencode"), { recursive: true });
    process.env.XDG_CONFIG_HOME = root;
    const configPath = __openCodeTestHooks.getOpenCodeConfigPath();

    // User starts with no provider.neurolink at all.
    fs.writeFileSync(configPath, JSON.stringify({ provider: {} }, null, 2));
    await __openCodeTestHooks.setOpenCodeProxySettings(url);

    // Proxy is killed uncleanly: no restore runs, the sentinel stays behind.
    // The user then writes their own block over the proxy's.
    const crashed = JSON.parse(fs.readFileSync(configPath, "utf8")) as Record<
      string,
      unknown
    >;
    (crashed.provider as Record<string, unknown>).neurolink = {
      name: "user's own gateway",
      options: { baseURL: "https://gateway.example.com", apiKey: "real-key" },
    };
    fs.writeFileSync(configPath, JSON.stringify(crashed, null, 2));

    // Proxy restarts, then shuts down cleanly.
    await __openCodeTestHooks.setOpenCodeProxySettings(url);
    await __openCodeTestHooks.clearOpenCodeProxySettings(url);

    const after = JSON.parse(fs.readFileSync(configPath, "utf8")) as {
      provider?: { neurolink?: { name?: string } };
    };
    if (after.provider?.neurolink?.name !== "user's own gateway") {
      log(
        "OpenCode restore discarded a block the user wrote after an unclean exit",
        "red",
      );
      return false;
    }
    return true;
  } finally {
    if (prevXdg === undefined) {
      delete process.env.XDG_CONFIG_HOME;
    } else {
      process.env.XDG_CONFIG_HOME = prevXdg;
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
}

/** See testOpenCodeReSnapshotsAfterUncleanExit — same hazard, Claude's env map. */
async function testClaudeReSnapshotsAfterUncleanExit(): Promise<boolean> {
  const { __claudeCodeTestHooks } =
    await import("../src/cli/proxy-clients/claudeCode.js");
  const prevHome = process.env.HOME;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "neurolink-claude-"));
  const url = "http://127.0.0.1:55669";
  try {
    process.env.HOME = root;
    fs.mkdirSync(path.join(root, ".claude"), { recursive: true });
    const settingsPath = __claudeCodeTestHooks.getClaudeSettingsPath();
    fs.writeFileSync(settingsPath, JSON.stringify({ env: {} }, null, 2));

    await __claudeCodeTestHooks.setClaudeProxySettings(url);

    const crashed = JSON.parse(fs.readFileSync(settingsPath, "utf8")) as Record<
      string,
      unknown
    >;
    (crashed.env as Record<string, string>).ANTHROPIC_BASE_URL =
      "https://gateway.example.com";
    fs.writeFileSync(settingsPath, JSON.stringify(crashed, null, 2));

    await __claudeCodeTestHooks.setClaudeProxySettings(url);
    await __claudeCodeTestHooks.clearClaudeProxySettings(url);

    const after = JSON.parse(fs.readFileSync(settingsPath, "utf8")) as {
      env?: Record<string, string>;
    };
    if (after.env?.ANTHROPIC_BASE_URL !== "https://gateway.example.com") {
      log(
        "Claude restore discarded a base URL the user set after an unclean exit",
        "red",
      );
      return false;
    }
    return true;
  } finally {
    if (prevHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = prevHome;
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
}

/**
 * See testOpenCodeReSnapshotsAfterUncleanExit. Qwen is the worst case of the
 * three: security.auth holds the user's real API key, so a stale snapshot
 * deletes a live credential rather than a URL.
 */
async function testQwenReSnapshotsAfterUncleanExit(): Promise<boolean> {
  const { __qwenCodeTestHooks } =
    await import("../src/cli/proxy-clients/qwenCode.js");
  const prevHome = process.env.HOME;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "neurolink-qwen-"));
  const url = "http://127.0.0.1:55669/v1";
  try {
    process.env.HOME = root;
    fs.mkdirSync(path.join(root, ".qwen"), { recursive: true });
    const settingsPath = __qwenCodeTestHooks.getQwenSettingsPath();
    fs.writeFileSync(settingsPath, JSON.stringify({ $version: 2 }, null, 2));

    await __qwenCodeTestHooks.setQwenProxySettings(url);

    const crashed = JSON.parse(fs.readFileSync(settingsPath, "utf8")) as Record<
      string,
      unknown
    >;
    (crashed.security as Record<string, unknown>).auth = {
      selectedType: "openai",
      baseUrl: "https://gateway.example.com/v1",
      apiKey: "user-real-key",
    };
    fs.writeFileSync(settingsPath, JSON.stringify(crashed, null, 2));

    await __qwenCodeTestHooks.setQwenProxySettings(url);
    await __qwenCodeTestHooks.clearQwenProxySettings(url);

    const after = JSON.parse(fs.readFileSync(settingsPath, "utf8")) as {
      security?: { auth?: { apiKey?: string } };
    };
    if (after.security?.auth?.apiKey !== "user-real-key") {
      log(
        "Qwen restore discarded a credential the user set after an unclean exit",
        "red",
      );
      return false;
    }
    return true;
  } finally {
    if (prevHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = prevHome;
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
}

/** A user's pre-existing provider.neurolink must survive set() then clear(). */
async function testOpenCodeClearRestoresUserConfig(): Promise<boolean> {
  const { __openCodeTestHooks } =
    await import("../src/cli/proxy-clients/openCode.js");
  const prevXdg = process.env.XDG_CONFIG_HOME;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "neurolink-opencode-"));
  try {
    fs.mkdirSync(path.join(root, "opencode"), { recursive: true });
    process.env.XDG_CONFIG_HOME = root;
    const configPath = __openCodeTestHooks.getOpenCodeConfigPath();
    const original = { provider: { neurolink: { name: "user's own block" } } };
    fs.writeFileSync(configPath, JSON.stringify(original, null, 2));

    await __openCodeTestHooks.setOpenCodeProxySettings(
      "http://127.0.0.1:55669/v1",
    );
    await __openCodeTestHooks.clearOpenCodeProxySettings(
      "http://127.0.0.1:55669/v1",
    );

    const after = JSON.parse(fs.readFileSync(configPath, "utf8")) as {
      provider?: { neurolink?: { name?: string } };
    };
    if (after.provider?.neurolink?.name !== "user's own block") {
      log(
        "OpenCode clear did not restore the user's pre-existing block",
        "red",
      );
      return false;
    }
    return true;
  } finally {
    if (prevXdg === undefined) {
      delete process.env.XDG_CONFIG_HOME;
    } else {
      process.env.XDG_CONFIG_HOME = prevXdg;
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
}

/**
 * Task 1 of the ClientConfigurator refactor: the registry must export an
 * array of configurators, each with a unique id and the full contract
 * (displayName, detect, apply, restore). This asserts the contract only —
 * not the final roster, which lands in a later task.
 */
async function testProxyClientRegistryShape(): Promise<boolean> {
  const { PROXY_CLIENT_CONFIGURATORS } =
    await import("../src/cli/proxy-clients/registry.js");
  if (!Array.isArray(PROXY_CLIENT_CONFIGURATORS)) {
    log("registry does not export an array of configurators", "red");
    return false;
  }
  const ids = new Set<string>();
  for (const configurator of PROXY_CLIENT_CONFIGURATORS) {
    if (ids.has(configurator.id)) {
      log("registry contains a duplicate configurator id", "red");
      return false;
    }
    ids.add(configurator.id);
    if (
      typeof configurator.displayName !== "string" ||
      typeof configurator.detect !== "function" ||
      typeof configurator.apply !== "function" ||
      typeof configurator.restore !== "function"
    ) {
      log(
        `configurator ${configurator.id} is missing a required member`,
        "red",
      );
      return false;
    }
  }
  return true;
}

/**
 * Claude was the only writer with no installed-check: it created
 * ~/.claude/settings.json even when Claude Code had never been installed.
 */
async function testClaudeConfiguratorDetectsInstall(): Promise<boolean> {
  const { claudeCodeConfigurator } =
    await import("../src/cli/proxy-clients/claudeCode.js");
  const prevHome = process.env.HOME;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "neurolink-claude-"));
  try {
    process.env.HOME = path.join(root, "absent");
    if (await claudeCodeConfigurator.detect()) {
      log("Claude configurator reported installed with no ~/.claude", "red");
      return false;
    }
    const present = path.join(root, "present");
    fs.mkdirSync(path.join(present, ".claude"), { recursive: true });
    process.env.HOME = present;
    if (!(await claudeCodeConfigurator.detect())) {
      log("Claude configurator did not detect an existing ~/.claude", "red");
      return false;
    }
    return true;
  } finally {
    if (prevHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = prevHome;
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
}

async function testCodexConfiguratorDetectsInstall(): Promise<boolean> {
  const { codexConfigurator } =
    await import("../src/cli/proxy-clients/codex.js");
  const prevHome = process.env.HOME;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "neurolink-codex-"));
  try {
    process.env.HOME = path.join(root, "absent");
    if (await codexConfigurator.detect()) {
      log("Codex configurator reported installed with no config.toml", "red");
      return false;
    }
    const present = path.join(root, "present");
    fs.mkdirSync(path.join(present, ".codex"), { recursive: true });
    fs.writeFileSync(
      path.join(present, ".codex", "config.toml"),
      'model = "x"\n',
    );
    process.env.HOME = present;
    if (!(await codexConfigurator.detect())) {
      log("Codex configurator did not detect an existing config.toml", "red");
      return false;
    }
    return true;
  } finally {
    if (prevHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = prevHome;
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
}

async function testProxyClientRoster(): Promise<boolean> {
  const { PROXY_CLIENT_CONFIGURATORS } =
    await import("../src/cli/proxy-clients/registry.js");
  const ids = PROXY_CLIENT_CONFIGURATORS.map((c) => c.id).join(",");
  if (ids !== "claude-code,opencode,codex,qwen-code,copilot,gemini-cli,grok") {
    log(
      "configurator roster or order changed — apply order is behaviour",
      "red",
    );
    return false;
  }
  return true;
}

async function testApplyAllReportsPerClient(): Promise<boolean> {
  const { applyAllClients, restoreAllClients, PROXY_CLIENT_CONFIGURATORS } =
    await import("../src/cli/proxy-clients/registry.js");
  const prevHome = process.env.HOME;
  const prevXdg = process.env.XDG_CONFIG_HOME;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "neurolink-clients-"));
  try {
    // Only OpenCode is "installed": its config dir exists, the other two do not.
    process.env.HOME = root;
    process.env.XDG_CONFIG_HOME = path.join(root, ".config");
    fs.mkdirSync(path.join(root, ".config", "opencode"), { recursive: true });

    const applied = await applyAllClients("http://127.0.0.1:55669");
    if (
      applied.map((r) => r.id).join(",") !==
      "claude-code,opencode,codex,qwen-code,copilot,gemini-cli,grok"
    ) {
      log("applyAllClients returned results out of registry order", "red");
      return false;
    }
    const byId = new Map(applied.map((r) => [r.id, r]));
    if (byId.get("opencode")?.applied !== true) {
      log("installed client was not reported as applied", "red");
      return false;
    }
    if (byId.get("codex")?.applied !== false) {
      log("absent client was reported as applied", "red");
      return false;
    }
    if (byId.get("claude-code")?.applied !== false) {
      log("absent Claude Code was reported as applied", "red");
      return false;
    }
    // The gate must be detect(), not the configurator's own internal guard:
    // an absent client must be skipped cleanly, never attempted and caught.
    for (const id of [
      "claude-code",
      "codex",
      "qwen-code",
      "copilot",
      "gemini-cli",
      "grok",
    ]) {
      if (byId.get(id)?.error !== undefined) {
        log("an absent client was attempted instead of being skipped", "red");
        return false;
      }
    }

    const restored = await restoreAllClients("http://127.0.0.1:55669");
    if (restored.length !== PROXY_CLIENT_CONFIGURATORS.length) {
      log("restoreAllClients did not report every client", "red");
      return false;
    }
    return true;
  } finally {
    if (prevHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = prevHome;
    }
    if (prevXdg === undefined) {
      delete process.env.XDG_CONFIG_HOME;
    } else {
      process.env.XDG_CONFIG_HOME = prevXdg;
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
}

/**
 * Qwen Code stores its provider under `security.auth` and speaks OpenAI Chat
 * Completions. Shape verified against a real ~/.qwen/settings.json ($version 2).
 */
async function testQwenConfiguratorRoundTrip(): Promise<boolean> {
  const { qwenCodeConfigurator } =
    await import("../src/cli/proxy-clients/qwenCode.js");
  const prevHome = process.env.HOME;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "neurolink-qwen-"));
  try {
    process.env.HOME = path.join(root, "absent");
    if (await qwenCodeConfigurator.detect()) {
      log("Qwen configurator reported installed with no ~/.qwen", "red");
      return false;
    }

    const present = path.join(root, "present");
    fs.mkdirSync(path.join(present, ".qwen"), { recursive: true });
    const settingsPath = path.join(present, ".qwen", "settings.json");
    const original = {
      security: {
        auth: {
          selectedType: "openai",
          apiKey: "user-own-key",
          baseUrl: "https://user.example.invalid",
        },
      },
      model: { name: "claude-sonnet-4-5" },
      $version: 2,
    };
    fs.writeFileSync(settingsPath, JSON.stringify(original, null, 2));
    process.env.HOME = present;

    if (!(await qwenCodeConfigurator.detect())) {
      log("Qwen configurator did not detect an existing ~/.qwen", "red");
      return false;
    }
    if (!(await qwenCodeConfigurator.apply("http://127.0.0.1:55669"))) {
      log("Qwen configurator did not report a successful write", "red");
      return false;
    }

    const applied = JSON.parse(fs.readFileSync(settingsPath, "utf8")) as {
      security?: { auth?: { baseUrl?: string; selectedType?: string } };
      model?: { name?: string };
    };
    if (applied.security?.auth?.baseUrl !== "http://127.0.0.1:55669/v1") {
      log("Qwen configurator did not record the proxy base URL", "red");
      return false;
    }
    if (applied.security?.auth?.selectedType !== "openai") {
      log("Qwen configurator did not select the openai auth type", "red");
      return false;
    }
    if (applied.model?.name !== "claude-sonnet-4-5") {
      log("Qwen configurator disturbed an unrelated setting", "red");
      return false;
    }

    if (!(await qwenCodeConfigurator.restore("http://127.0.0.1:55669"))) {
      log("Qwen configurator did not report a successful restore", "red");
      return false;
    }
    const restored = JSON.parse(fs.readFileSync(settingsPath, "utf8")) as {
      security?: { auth?: { baseUrl?: string; apiKey?: string } };
    };
    if (
      restored.security?.auth?.baseUrl !== "https://user.example.invalid" ||
      restored.security?.auth?.apiKey !== "user-own-key"
    ) {
      log("Qwen restore did not put the user's own auth block back", "red");
      return false;
    }
    return true;
  } finally {
    if (prevHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = prevHome;
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
}

/**
 * Copilot CLI reads its provider config from the environment only — there is
 * no config file to write — so the configurator emits a sourceable script
 * inside the proxy's own directory rather than editing a shell profile.
 */
async function testCopilotConfiguratorWritesEnvFile(): Promise<boolean> {
  const { copilotConfigurator, __copilotTestHooks } =
    await import("../src/cli/proxy-clients/copilot.js");
  const prevHome = process.env.HOME;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "neurolink-copilot-"));
  try {
    process.env.HOME = path.join(root, "absent");
    if (await copilotConfigurator.detect()) {
      log("Copilot configurator reported installed with no ~/.copilot", "red");
      return false;
    }

    const present = path.join(root, "present");
    fs.mkdirSync(path.join(present, ".copilot"), { recursive: true });
    process.env.HOME = present;
    if (!(await copilotConfigurator.detect())) {
      log("Copilot configurator did not detect an existing ~/.copilot", "red");
      return false;
    }
    if (!(await copilotConfigurator.apply("http://127.0.0.1:55669"))) {
      log("Copilot configurator did not report a successful write", "red");
      return false;
    }

    const envPath = __copilotTestHooks.getCopilotEnvPath();
    if (!fs.existsSync(envPath)) {
      log("Copilot configurator did not write its env script", "red");
      return false;
    }
    const script = fs.readFileSync(envPath, "utf8");
    for (const needle of [
      "COPILOT_PROVIDER_TYPE",
      "COPILOT_PROVIDER_BASE_URL",
      "COPILOT_PROVIDER_API_KEY",
      "http://127.0.0.1:55669/v1",
    ]) {
      if (!script.includes(needle)) {
        log("Copilot env script is missing a required export", "red");
        return false;
      }
    }

    if (!(await copilotConfigurator.restore("http://127.0.0.1:55669"))) {
      log("Copilot configurator did not report a successful restore", "red");
      return false;
    }
    if (fs.existsSync(envPath)) {
      log("Copilot env script survived restore", "red");
      return false;
    }
    return true;
  } finally {
    if (prevHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = prevHome;
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
}

/**
 * Regression: with no `__proxy_original_env` snapshot, the Claude restore path
 * used to treat every managed key as "did not exist before" and delete it,
 * wiping a real user value. OpenCode and Qwen both refuse in that case; this
 * asserts Claude does too.
 */
async function testClaudeRestoreRefusesWithoutSnapshot(): Promise<boolean> {
  const { __claudeCodeTestHooks } =
    await import("../src/cli/proxy-clients/claudeCode.js");
  const prevHome = process.env.HOME;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "neurolink-claude-snap-"));
  try {
    fs.mkdirSync(path.join(root, ".claude"), { recursive: true });
    const settingsPath = path.join(root, ".claude", "settings.json");
    // A user-owned config the proxy never touched: no snapshot key present.
    fs.writeFileSync(
      settingsPath,
      JSON.stringify(
        {
          env: {
            ANTHROPIC_BASE_URL: "https://user-own-gateway.example.invalid",
            ENABLE_TOOL_SEARCH: "true",
          },
        },
        null,
        2,
      ),
    );
    process.env.HOME = root;

    // Called with no expectedBaseUrl, the way a defensive shutdown path might.
    const result = await __claudeCodeTestHooks.clearClaudeProxySettings();
    if (result !== false) {
      log("Claude restore claimed success with no snapshot to restore", "red");
      return false;
    }

    const after = JSON.parse(fs.readFileSync(settingsPath, "utf8")) as {
      env?: { ANTHROPIC_BASE_URL?: string; ENABLE_TOOL_SEARCH?: string };
    };
    if (
      after.env?.ANTHROPIC_BASE_URL !==
      "https://user-own-gateway.example.invalid"
    ) {
      log("Claude restore destroyed a user value it did not own", "red");
      return false;
    }
    if (after.env?.ENABLE_TOOL_SEARCH !== "true") {
      log("Claude restore removed a user-set managed key", "red");
      return false;
    }
    return true;
  } finally {
    if (prevHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = prevHome;
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
}

/**
 * Regression: `isExactPricingMatch` used to re-implement the table lookup
 * instead of reusing `findRates`, so it missed Bedrock's vendor-prefix strip
 * and Vertex's fallback to the Google table. Both are exact hits that were
 * reported to the operator as guessed rates.
 */
/**
 * A streamed request is logged twice: once when the response headers are known
 * and again when the body finishes and its token counts arrive. The Codex
 * engine does exactly this, and the second write is the only one that carries
 * usage.
 *
 * Merging those two records rather than replacing is what makes the tokens
 * survive alongside the first record's status and errorType. Nothing covered
 * it, so a revert to a plain overwrite would have gone unnoticed while
 * silently zeroing every Codex request's cost.
 */
async function testAnalyzeMergesDoubleWrittenRequest(): Promise<boolean> {
  const { execFileSync } = await import("child_process");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "neurolink-merge-"));
  const logs = path.join(dir, "logs");
  fs.mkdirSync(logs, { recursive: true });
  const ts = new Date().toISOString();
  const day = ts.slice(0, 10);
  const base = {
    timestamp: ts,
    method: "POST",
    path: "/backend-api/codex/responses",
    stream: true,
    toolCount: 0,
    account: "codex-a",
    accountType: "codex-oauth",
    responseStatus: 200,
    responseTimeMs: 4200,
    requestId: "codex-double",
  };
  const rows = [
    // Headers are known; no usage yet, and no model resolved.
    JSON.stringify(base),
    // Stream finished: usage and provider arrive on a second line.
    JSON.stringify({
      ...base,
      model: "gpt-5.1-codex",
      provider: "openai",
      inputTokens: 17339,
      outputTokens: 700,
      cacheReadTokens: 8576,
    }),
  ];
  fs.writeFileSync(
    path.join(logs, `proxy-${day}.jsonl`),
    rows.join("\n") + "\n",
  );

  try {
    const out = execFileSync(
      process.execPath,
      [
        "dist/cli/index.js",
        "proxy",
        "analyze",
        "--logs-dir",
        logs,
        "--format",
        "json",
      ],
      { encoding: "utf8" },
    );
    const report = JSON.parse(out) as {
      requests?: { completed?: number };
      cache?: { outputTokens?: number; estimatedCostUsd?: number };
    };
    // One request, not two: the second line enriches the first.
    if (report.requests?.completed !== 1) {
      log("analyze counted a re-logged request more than once", "red");
      return false;
    }
    if (report.cache?.outputTokens !== 700) {
      log("analyze lost the usage carried by the second record", "red");
      return false;
    }
    if (!report.cache?.estimatedCostUsd) {
      log("analyze priced a merged request at nothing", "red");
      return false;
    }
    return true;
  } catch {
    log("proxy analyze did not produce a parseable report", "red");
    return false;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * The same double write can straddle a report's window edge: a Codex turn that
 * gets its headers at 23:59:50 and finishes at 00:00:05 puts every token it
 * spent in a record stamped after `--until`.
 *
 * Filtering that record out by its own timestamp drops the usage silently —
 * the request still counts as completed, but contributes nothing to tokens or
 * cost, and nothing in the report says so. A request the window already
 * admitted has to keep accepting its own later records.
 */
async function testAnalyzeKeepsUsageAcrossWindowEdge(): Promise<boolean> {
  const { execFileSync } = await import("child_process");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "neurolink-window-"));
  const logs = path.join(dir, "logs");
  fs.mkdirSync(logs, { recursive: true });

  const headersAt = "2026-08-20T23:59:50.000Z";
  const finishedAt = "2026-08-21T00:00:05.000Z";
  const base = {
    method: "POST",
    path: "/backend-api/codex/responses",
    stream: true,
    toolCount: 0,
    account: "codex-a",
    accountType: "codex-oauth",
    responseStatus: 200,
    responseTimeMs: 15_000,
    requestId: "codex-straddle",
  };
  fs.writeFileSync(
    path.join(logs, "proxy-2026-08-20.jsonl"),
    JSON.stringify({ ...base, timestamp: headersAt }) + "\n",
  );
  fs.writeFileSync(
    path.join(logs, "proxy-2026-08-21.jsonl"),
    JSON.stringify({
      ...base,
      timestamp: finishedAt,
      model: "gpt-5.1-codex",
      provider: "openai",
      inputTokens: 17339,
      outputTokens: 700,
      cacheReadTokens: 8576,
    }) + "\n",
  );

  try {
    const out = execFileSync(
      process.execPath,
      [
        "dist/cli/index.js",
        "proxy",
        "analyze",
        "--logs-dir",
        logs,
        "--since",
        "2026-08-20T00:00:00Z",
        "--until",
        "2026-08-20T23:59:59Z",
        "--format",
        "json",
      ],
      { encoding: "utf8" },
    );
    const report = JSON.parse(out) as {
      requests?: { completed?: number };
      cache?: { outputTokens?: number };
    };
    if (report.requests?.completed !== 1) {
      log("analyze did not count the request its window admitted", "red");
      return false;
    }
    if (report.cache?.outputTokens !== 700) {
      log(
        "analyze dropped the usage of a request whose completion landed after the window",
        "red",
      );
      return false;
    }
    return true;
  } catch {
    log("proxy analyze did not produce a parseable report", "red");
    return false;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

async function testAnalyzePricingProvenance(): Promise<boolean> {
  const { execFileSync } = await import("child_process");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "neurolink-pricing-"));
  const logs = path.join(dir, "logs");
  fs.mkdirSync(logs, { recursive: true });
  const ts = new Date().toISOString();
  const day = ts.slice(0, 10);
  const rows = [
    {
      requestId: "b1",
      model: "us.anthropic.claude-sonnet-4-5-20250929-v1:0",
      provider: "bedrock",
    },
    { requestId: "v1", model: "gemini-2.5-pro", provider: "vertex" },
    { requestId: "s1", model: "claude-sonnet-4-5", provider: "anthropic" },
  ].map((r) =>
    JSON.stringify({
      timestamp: ts,
      method: "POST",
      path: "/v1/messages",
      stream: false,
      toolCount: 0,
      account: "a",
      accountType: "oauth",
      responseStatus: 200,
      responseTimeMs: 900,
      inputTokens: 1000,
      outputTokens: 100,
      ...r,
    }),
  );
  fs.writeFileSync(
    path.join(logs, `proxy-${day}.jsonl`),
    rows.join("\n") + "\n",
  );

  try {
    const out = execFileSync(
      process.execPath,
      [
        "dist/cli/index.js",
        "proxy",
        "analyze",
        "--logs-dir",
        logs,
        "--format",
        "json",
      ],
      { encoding: "utf8" },
    );
    const report = JSON.parse(out) as {
      cache?: { requestsPriced?: number; requestsPricedByPrefix?: number };
    };
    if (report.cache?.requestsPriced !== 3) {
      log(
        "analyze did not price every request that carried a known model",
        "red",
      );
      return false;
    }
    if (report.cache?.requestsPricedByPrefix !== 0) {
      log(
        "analyze reported an exact rate as an inferred one — provenance regressed",
        "red",
      );
      return false;
    }
    return true;
  } catch {
    log("proxy analyze did not produce a parseable report", "red");
    return false;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// ============================================================================
// Tests: GET /accounts and the per-account usage ledger
// ============================================================================

/** Write a request-log fixture into an isolated HOME and read it back. */
async function withLedgerHome<T>(
  rows: Record<string, unknown>[],
  date: string,
  fn: (home: string) => Promise<T>,
): Promise<T> {
  const prevHome = process.env.HOME;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "neurolink-ledger-"));
  fs.mkdirSync(path.join(root, ".neurolink", "logs"), { recursive: true });
  fs.writeFileSync(
    path.join(root, ".neurolink", "logs", `proxy-${date}.jsonl`),
    rows.map((r) => JSON.stringify(r)).join("\n") + "\n",
  );
  process.env.HOME = root;
  try {
    return await fn(root);
  } finally {
    if (prevHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = prevHome;
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
}

const LEDGER_DATE = "2026-01-15";

function ledgerRow(over: Record<string, unknown>): Record<string, unknown> {
  return {
    timestamp: `${LEDGER_DATE}T00:00:00.000Z`,
    method: "POST",
    path: "/v1/messages",
    stream: false,
    toolCount: 0,
    accountType: "oauth",
    responseStatus: 200,
    responseTimeMs: 100,
    model: "claude-sonnet-5",
    inputTokens: 1000,
    outputTokens: 100,
    cacheReadTokens: 0,
    cacheCreationTokens: 0,
    ...over,
  };
}

/**
 * A request can be logged twice — once on response headers, once when a
 * streamed body finishes and its token counts arrive. Summing raw lines would
 * double count it.
 */
async function testLedgerDedupesRepeatedRequestId(): Promise<boolean> {
  const { readAccountUsage, resetAccountLedgerCache } =
    await import("../src/lib/proxy/accountLedger.js");
  return await withLedgerHome(
    [
      ledgerRow({
        requestId: "r1",
        account: "a@t",
        inputTokens: 0,
        outputTokens: 0,
      }),
      ledgerRow({
        requestId: "r1",
        account: "a@t",
        inputTokens: 1000,
        outputTokens: 100,
      }),
    ],
    LEDGER_DATE,
    async () => {
      resetAccountLedgerCache();
      const row = (await readAccountUsage(LEDGER_DATE)).get("anthropic:a@t");
      if (!row) {
        log("ledger did not report the account at all", "red");
        return false;
      }
      if (row.requests !== 1) {
        log("ledger counted a re-logged request twice", "red");
        return false;
      }
      if (row.inputTokens !== 1000 || row.outputTokens !== 100) {
        log(
          "ledger summed both records instead of taking the later one",
          "red",
        );
        return false;
      }
      return true;
    },
  );
}

/**
 * A later record for the same requestId can carry NO token fields — a terminal
 * error logged after a successful response, for instance. A naive spread merge
 * lets its zeros overwrite real usage, silently erasing the request's tokens.
 */
async function testLedgerKeepsMaxTokensAcrossRecords(): Promise<boolean> {
  const { readAccountUsage, resetAccountLedgerCache } =
    await import("../src/lib/proxy/accountLedger.js");
  return await withLedgerHome(
    [
      ledgerRow({ requestId: "r1", account: "a@t" }),
      // No token fields at all on the second record.
      {
        timestamp: `${LEDGER_DATE}T00:00:01.000Z`,
        requestId: "r1",
        account: "a@t",
        accountType: "oauth",
        model: "claude-sonnet-5",
        errorType: "stream_error",
      },
    ],
    LEDGER_DATE,
    async () => {
      resetAccountLedgerCache();
      const row = (await readAccountUsage(LEDGER_DATE)).get("anthropic:a@t");
      if (!row) {
        log("ledger dropped the account", "red");
        return false;
      }
      if (row.inputTokens !== 1000 || row.outputTokens !== 100) {
        log("a token-less later record erased the recorded usage", "red");
        return false;
      }
      return true;
    },
  );
}

/**
 * The request log is shared with the Codex engine, and an operator can use the
 * same email for both. Codex tokens must not land on the Anthropic row.
 */
async function testLedgerKeysCodexRowsByEngine(): Promise<boolean> {
  // The request log is shared by both engines and an operator can use one
  // email for both. Keying the ledger by bare label merged them; keying by
  // the provider-qualified account key keeps each engine's tokens on its own
  // row, and a row that has no key of its own derives one from its type.
  const { readAccountUsage, resetAccountLedgerCache } =
    await import("../src/lib/proxy/accountLedger.js");
  return await withLedgerHome(
    [
      ledgerRow({ requestId: "r1", account: "same@t" }),
      ledgerRow({
        requestId: "r2",
        account: "same@t",
        accountKey: "codex:same@t",
        accountType: "codex-oauth",
        model: "gpt-5.6-sol",
        inputTokens: 999999,
        outputTokens: 999999,
      }),
    ],
    LEDGER_DATE,
    async () => {
      resetAccountLedgerCache();
      const usage = await readAccountUsage(LEDGER_DATE);
      const anthropic = usage.get("anthropic:same@t");
      const codex = usage.get("codex:same@t");
      if (!anthropic) {
        log("ledger dropped the Anthropic row entirely", "red");
        return false;
      }
      if (anthropic.requests !== 1 || anthropic.inputTokens !== 1000) {
        log("Codex usage was attributed to the Anthropic account", "red");
        return false;
      }
      if (!codex || codex.requests !== 1 || codex.inputTokens !== 999999) {
        log("Codex usage was dropped instead of landing on its own row", "red");
        return false;
      }
      if (usage.has("same@t")) {
        log(
          "ledger still exposes a bare-label row that both engines collide on",
          "red",
        );
        return false;
      }
      return true;
    },
  );
}

/** Cost must be real, and an unknown model must be named rather than silently zeroed. */
async function testLedgerCostsAndFlagsUnpriced(): Promise<boolean> {
  const { readAccountUsage, resetAccountLedgerCache } =
    await import("../src/lib/proxy/accountLedger.js");
  return await withLedgerHome(
    [
      ledgerRow({ requestId: "r1", account: "a@t" }),
      ledgerRow({
        requestId: "r2",
        account: "a@t",
        model: "claude-imaginary-99",
        inputTokens: 500,
        outputTokens: 50,
      }),
    ],
    LEDGER_DATE,
    async () => {
      resetAccountLedgerCache();
      const row = (await readAccountUsage(LEDGER_DATE)).get("anthropic:a@t");
      if (!row) {
        log("ledger did not report the account", "red");
        return false;
      }
      // claude-sonnet-5: 1000 in @ $2/M + 100 out @ $10/M = 0.002 + 0.001
      if (Math.abs(row.costUsd - 0.003) > 1e-9) {
        log("ledger cost does not match the published rate", "red");
        return false;
      }
      if (row.unpricedRequests !== 1) {
        log("ledger did not count the unpriced request", "red");
        return false;
      }
      if (row.unpricedModels.join(",") !== "claude-imaginary-99") {
        log("ledger did not name the unpriced model", "red");
        return false;
      }
      return true;
    },
  );
}

/** A line still being appended must not be parsed truncated. */
async function testLedgerIgnoresPartialTrailingLine(): Promise<boolean> {
  const { readAccountUsage, resetAccountLedgerCache } =
    await import("../src/lib/proxy/accountLedger.js");
  return await withLedgerHome(
    [ledgerRow({ requestId: "r1", account: "a@t" })],
    LEDGER_DATE,
    async (home) => {
      const file = path.join(
        home,
        ".neurolink",
        "logs",
        `proxy-${LEDGER_DATE}.jsonl`,
      );
      fs.appendFileSync(file, '{"requestId":"r2","account":"a@t","inputTo');
      resetAccountLedgerCache();
      const first = (await readAccountUsage(LEDGER_DATE)).get("anthropic:a@t");
      if (!first || first.requests !== 1) {
        log("ledger consumed a partial trailing line", "red");
        return false;
      }
      // Completing the line must then be picked up whole.
      fs.appendFileSync(
        file,
        'kens":1000,"outputTokens":100,"accountType":"oauth","model":"claude-sonnet-5"}\n',
      );
      const second = (await readAccountUsage(LEDGER_DATE)).get("anthropic:a@t");
      if (!second || second.requests !== 2) {
        log(
          "ledger did not pick up the completed line on the next read",
          "red",
        );
        return false;
      }
      return true;
    },
  );
}

/**
 * Two genuinely distinct requests can share a requestId.
 *
 * `ctx.requestId` comes straight from a client-supplied `X-Request-ID` header
 * when one is present, and nothing enforces uniqueness — a fixed correlation
 * header, an idempotency wrapper or a load-test harness will reuse one for
 * every call. The ledger dedupes by requestId to collapse the Codex double
 * write, so without a way to tell a re-log from a repeat, N real requests
 * against the same account and model collapsed into one and reported a
 * fraction of the tokens and cost actually spent.
 */
async function testLedgerSeparatesDistinctRequestsSharingAnId(): Promise<boolean> {
  const { readAccountUsage, resetAccountLedgerCache } =
    await import("../src/lib/proxy/accountLedger.js");
  const rows = Array.from({ length: 5 }, () =>
    ledgerRow({ requestId: "fixed-id-123", account: "a@t" }),
  );
  return await withLedgerHome(rows, LEDGER_DATE, async () => {
    resetAccountLedgerCache();
    const totals = (await readAccountUsage(LEDGER_DATE)).get("anthropic:a@t");
    if (!totals) {
      log("ledger reported nothing for an account with traffic", "red");
      return false;
    }
    if (totals.requests !== 5) {
      log(
        "ledger collapsed distinct requests that shared a client-supplied id",
        "red",
      );
      return false;
    }
    if (totals.inputTokens !== 5000 || totals.outputTokens !== 500) {
      log("ledger undercounted tokens across a shared request id", "red");
      return false;
    }
    return true;
  });
}

/**
 * Every row must carry a `kind` that says what it really is.
 *
 * The row set is built from two loops: real logins from the quota snapshot,
 * then whatever is left in the usage stats. The second loop tagged everything
 * that was not a translation pseudo-account as `internal` — including a real
 * OAuth account that had been disabled or dropped from the allowlist, which is
 * exactly the account an operator is looking for when they ask why traffic
 * stopped. The docs tell consumers to filter `internal` out, so it vanished.
 *
 * This also pins the row set to something non-empty. The original shape test
 * looped over `body.accounts` to assert its invariants and never seeded an
 * account, so with an empty array both loops ran zero times and it passed no
 * matter what the handler did.
 */
async function testAccountsRowsAreClassifiedByKind(): Promise<boolean> {
  const { createClaudeProxyRoutes, __testHooks } =
    await import("../src/lib/server/routes/claudeProxyRoutes.js");
  const stats = await import("../src/lib/proxy/usageStats.js");
  await stats.resetUsageStatsForTests();

  // A real login that stopped being routable, plus the two pseudo-accounts.
  stats.recordAttempt("alice@example.com", "oauth");
  stats.recordFinalSuccess("alice@example.com", "oauth");
  stats.recordAttempt("proxy/internal", "internal");
  stats.recordFinalSuccess("proxy/internal", "internal");
  stats.recordAttempt("gemini-translate", "translation");
  stats.recordFinalSuccess("gemini-translate", "translation");
  // Alice is a real login that is in the token store but not routed (disabled
  // or allowlist-excluded). A login absent from the store is removed, not
  // unrouted, and gets no row — see testAccountsOmitsRemovedLoginsKeepsDisabledOnes.
  __testHooks.setAccountDirectoryForTests({
    knownKeys: new Set(["anthropic:alice@example.com"]),
    anthropic: [],
    codex: [],
  });

  const route = createClaudeProxyRoutes().routes.find((r) =>
    r.path.endsWith("/accounts"),
  );
  if (!route) {
    __testHooks.setAccountDirectoryForTests(null);
    log("GET /accounts is not registered", "red");
    return false;
  }
  const body = (await route.handler({
    query: {},
    headers: {},
    method: "GET",
    path: "/accounts",
    requestId: "suite",
  } as never)) as {
    accounts?: { label?: string; kind?: string; type?: string }[];
  };
  __testHooks.setAccountDirectoryForTests(null);
  const rows = body.accounts ?? [];
  if (rows.length < 3) {
    log("accounts did not report the seeded rows", "red");
    return false;
  }
  for (const row of rows) {
    if (!row.kind) {
      log("an account row is missing its kind discriminator", "red");
      return false;
    }
  }
  const byLabel = new Map(rows.map((r) => [r.label, r]));
  if (byLabel.get("alice@example.com")?.kind !== "account") {
    log(
      "a real credential was tagged as internal plumbing and would be filtered out",
      "red",
    );
    return false;
  }
  if (byLabel.get("proxy/internal")?.kind !== "internal") {
    log("an internal pseudo-account was not tagged as internal", "red");
    return false;
  }
  if (byLabel.get("gemini-translate")?.kind !== "translation") {
    log("a translation pseudo-account was not tagged as translation", "red");
    return false;
  }
  await stats.resetUsageStatsForTests();
  return true;
}

/**
 * The configured primary account must be identifiable in the row set.
 *
 * Both row loops hardcoded `isPrimary: false`, so the field was always false
 * and a dashboard could never mark the account the pool actually prefers —
 * while `CliAccountsRow` still advertised it as meaningful. The key is
 * available in the handler's own closure, and account keys compare through
 * anthropicAccountKeysEqual, which normalises a bare label to its full key.
 */
async function testAccountsMarksThePrimaryAccount(): Promise<boolean> {
  const { createClaudeProxyRoutes, __testHooks } =
    await import("../src/lib/server/routes/claudeProxyRoutes.js");
  const stats = await import("../src/lib/proxy/usageStats.js");
  await stats.resetUsageStatsForTests();

  stats.recordAttempt("primary@example.com", "oauth");
  stats.recordFinalSuccess("primary@example.com", "oauth");
  stats.recordAttempt("other@example.com", "oauth");
  stats.recordFinalSuccess("other@example.com", "oauth");
  // Both are logins the token store knows but does not route; a stats entry
  // with no login behind it is omitted as removed and would not be a row.
  __testHooks.setAccountDirectoryForTests({
    knownKeys: new Set([
      "anthropic:primary@example.com",
      "anthropic:other@example.com",
    ]),
    anthropic: [],
    codex: [],
  });

  const route = createClaudeProxyRoutes(
    undefined,
    "",
    "fill-first",
    false,
    // Full pool key; the rows carry the bare label, so the comparison has to
    // normalise rather than match on string identity.
    "anthropic:primary@example.com",
  ).routes.find((r) => r.path.endsWith("/accounts"));
  if (!route) {
    log("GET /accounts is not registered", "red");
    return false;
  }

  const body = (await route.handler({
    query: {},
    headers: {},
    method: "GET",
    path: "/accounts",
    requestId: "suite",
  } as never)) as {
    accounts?: { label?: string; isPrimary?: boolean }[];
  };
  const rows = body.accounts ?? [];
  if (rows.length < 2) {
    log("accounts did not report the seeded rows", "red");
    return false;
  }
  const byLabel = new Map(rows.map((r) => [r.label, r]));
  if (byLabel.get("primary@example.com")?.isPrimary !== true) {
    log("the configured primary account was not marked as primary", "red");
    return false;
  }
  if (byLabel.get("other@example.com")?.isPrimary !== false) {
    log("a non-primary account was marked as primary", "red");
    return false;
  }
  __testHooks.setAccountDirectoryForTests(null);
  await stats.resetUsageStatsForTests();
  return true;
}

/**
 * Quota windows must reach consumers already normalised.
 *
 * Asserted directly rather than through the route: a window only appears on a
 * row built from a live quota snapshot, which needs a seeded token store, so
 * the route-level loop over `row.quota.windows` runs zero times in this suite
 * and can never see a regression here.
 */
async function testAccountsQuotaWindowsAreNormalised(): Promise<boolean> {
  const { __testHooks } =
    await import("../src/lib/server/routes/claudeProxyRoutes.js");
  // resetsAt is Unix seconds on the wire; consumers want milliseconds.
  const weeklyResetSeconds = Math.floor(Date.UTC(2026, 7, 22, 0, 0, 0) / 1000);
  const normalised = __testHooks.normalizeQuotaForAccounts({
    weeklyResetAt: weeklyResetSeconds,
    windows: [
      { name: "session", status: "allowed", resetsAt: weeklyResetSeconds },
      { name: "weekly", status: "rejected", resetsAt: weeklyResetSeconds },
    ],
  }) as { weeklyResetAtMs?: number; windows?: Record<string, unknown>[] };

  if (normalised?.weeklyResetAtMs !== weeklyResetSeconds * 1000) {
    log("a reset timestamp was not normalised to milliseconds", "red");
    return false;
  }
  const windows = normalised.windows ?? [];
  if (windows.length !== 2) {
    log("normalisation dropped a quota window", "red");
    return false;
  }
  for (const w of windows) {
    if (!("severity" in w) || !("isActive" in w) || !("resetsAtMs" in w)) {
      log("a quota window was not normalised for consumers", "red");
      return false;
    }
  }
  if (windows[1].severity !== "critical") {
    log("a rejected window was not raised to critical severity", "red");
    return false;
  }
  return true;
}

/**
 * The ledger must split an account's usage by the CLI that spent it.
 *
 * One account is routinely shared by several CLIs, so an account-level total
 * cannot answer "what is costing me this". Rows written before attribution
 * existed carry no client at all and must land in their own bucket rather than
 * being folded into a named one, which would overstate that client's spend.
 */
async function testLedgerSplitsUsageByClient(): Promise<boolean> {
  const { readAccountUsage, resetAccountLedgerCache } =
    await import("../src/lib/proxy/accountLedger.js");
  const rows = [
    ledgerRow({ requestId: "c1", account: "a@t", clientApp: "claude-code" }),
    ledgerRow({ requestId: "c2", account: "a@t", clientApp: "claude-code" }),
    ledgerRow({ requestId: "o1", account: "a@t", clientApp: "opencode" }),
    // Pre-attribution row: no clientApp, no userAgent.
    ledgerRow({ requestId: "x1", account: "a@t" }),
  ];
  return await withLedgerHome(rows, LEDGER_DATE, async () => {
    resetAccountLedgerCache();
    const row = (await readAccountUsage(LEDGER_DATE)).get("anthropic:a@t");
    if (!row) {
      log("ledger reported nothing for an account with traffic", "red");
      return false;
    }
    if (row.requests !== 4) {
      log("ledger lost a request while splitting by client", "red");
      return false;
    }
    const claude = row.byClient["claude-code"];
    const opencode = row.byClient["opencode"];
    const legacy = row.byClient["unattributed"];
    if (!claude || claude.requests !== 2) {
      log("ledger did not group both requests under their client", "red");
      return false;
    }
    if (!opencode || opencode.requests !== 1) {
      log("ledger dropped a second client's usage", "red");
      return false;
    }
    if (!legacy || legacy.requests !== 1) {
      log("a row predating attribution was not kept in its own bucket", "red");
      return false;
    }
    // The split must reconcile with the total, or a dashboard showing both
    // side by side contradicts itself.
    const summed = Object.values(row.byClient).reduce(
      (n, c) => n + c.requests,
      0,
    );
    if (summed !== row.requests) {
      log("per-client requests do not reconcile with the account total", "red");
      return false;
    }
    const summedCost = Number(
      Object.values(row.byClient)
        .reduce((n, c) => n + c.costUsd, 0)
        .toFixed(6),
    );
    if (summedCost !== row.costUsd) {
      log("per-client cost does not reconcile with the account total", "red");
      return false;
    }
    return true;
  });
}

/** The route must join quota, stats and usage, and label the cost basis. */
/**
 * A stats entry for a login that is no longer in the token store is a removed
 * account, not an unrouted one. The route used to resurrect it forever — a
 * deleted login served requests once, its counters persist, and "type oauth
 * with no route" was read as "disabled", so it rendered as a phantom UNROUTED
 * card in every dashboard. Disabled and allowlist-excluded logins are still
 * in the store and must keep rendering; that is the case the rule exists for.
 */
async function testAccountsOmitsRemovedLoginsKeepsDisabledOnes(): Promise<boolean> {
  const { createClaudeProxyRoutes, __testHooks } =
    await import("../src/lib/server/routes/claudeProxyRoutes.js");
  const stats = await import("../src/lib/proxy/usageStats.js");
  await stats.resetUsageStatsForTests();
  stats.recordAttempt("ghost@example.com", "oauth");
  stats.recordFinalSuccess("ghost@example.com", "oauth");
  stats.recordAttempt("disabled@example.com", "oauth");
  stats.recordFinalSuccess("disabled@example.com", "oauth");
  __testHooks.setAccountDirectoryForTests({
    knownKeys: new Set(["anthropic:disabled@example.com"]),
    anthropic: [],
    codex: [],
  });
  try {
    const route = createClaudeProxyRoutes().routes.find((r) =>
      r.path.endsWith("/accounts"),
    );
    if (!route) {
      log("GET /accounts is not registered", "red");
      return false;
    }
    const body = (await route.handler({
      query: {},
      headers: {},
      method: "GET",
      path: "/accounts",
      requestId: "suite",
    } as never)) as {
      accounts?: {
        label?: string;
        kind?: string;
        status?: string | null;
        provider?: string;
      }[];
    };
    const rows = body.accounts ?? [];
    const disabled = rows.find((r) => r.label === "disabled@example.com");
    if (
      !disabled ||
      disabled.kind !== "account" ||
      disabled.status !== "unrouted"
    ) {
      log(
        "a login that is in the token store but not routed lost its unrouted row",
        "red",
      );
      return false;
    }
    if (disabled.provider !== "anthropic") {
      log("an unrouted row does not name its provider", "red");
      return false;
    }
    if (rows.some((r) => r.label === "ghost@example.com")) {
      log(
        "a login that was removed from the token store was resurrected as an unrouted account",
        "red",
      );
      return false;
    }
    return true;
  } finally {
    __testHooks.setAccountDirectoryForTests(null);
    await stats.resetUsageStatsForTests();
  }
}

/**
 * One email, two engines. The Codex login shares its label with the Anthropic
 * one; the route used to join stats and today's usage by bare label, so the
 * Codex login was either swallowed by the Anthropic row or, with a unique
 * label, tagged as internal plumbing because "codex-oauth" was not a real
 * account type. Every join is by provider-qualified key now, and each row
 * says which engine it belongs to.
 */
async function testAccountsKeepsCodexDistinctFromSameLabelAnthropic(): Promise<boolean> {
  const { createClaudeProxyRoutes, __testHooks } =
    await import("../src/lib/server/routes/claudeProxyRoutes.js");
  const stats = await import("../src/lib/proxy/usageStats.js");
  const { currentUsageDate, resetAccountLedgerCache } =
    await import("../src/lib/proxy/accountLedger.js");
  await stats.resetUsageStatsForTests();
  stats.recordAttempt("same@example.com", "oauth");
  stats.recordFinalSuccess("same@example.com", "oauth");
  stats.recordAttempt("same@example.com", "oauth");
  stats.recordFinalSuccess("same@example.com", "oauth");
  stats.recordAttempt("same@example.com", "codex-oauth");
  stats.recordFinalSuccess("same@example.com", "codex-oauth");
  __testHooks.setAccountDirectoryForTests({
    knownKeys: new Set([
      "anthropic:same@example.com",
      "codex:same@example.com",
    ]),
    anthropic: [],
    codex: [],
  });
  const today = currentUsageDate();
  try {
    return await withLedgerHome(
      [
        ledgerRow({
          requestId: "a1",
          account: "same@example.com",
          accountKey: "anthropic:same@example.com",
          timestamp: `${today}T00:00:00.000Z`,
        }),
        ledgerRow({
          requestId: "c1",
          account: "same@example.com",
          accountKey: "codex:same@example.com",
          accountType: "codex-oauth",
          model: "gpt-5.6-sol",
          inputTokens: 777,
          outputTokens: 7,
          timestamp: `${today}T00:00:00.000Z`,
        }),
      ],
      today,
      async () => {
        resetAccountLedgerCache();
        const route = createClaudeProxyRoutes().routes.find((r) =>
          r.path.endsWith("/accounts"),
        );
        if (!route) {
          log("GET /accounts is not registered", "red");
          return false;
        }
        const body = (await route.handler({
          query: {},
          headers: {},
          method: "GET",
          path: "/accounts",
          requestId: "suite",
        } as never)) as {
          accounts?: {
            label?: string;
            key?: string | null;
            kind?: string;
            provider?: string;
            requests?: number | null;
            usage?: { inputTokens?: number } | null;
          }[];
        };
        const rows = (body.accounts ?? []).filter(
          (r) => r.label === "same@example.com",
        );
        const anthropic = rows.find((r) => r.provider === "anthropic");
        const codex = rows.find((r) => r.provider === "codex");
        if (!anthropic || !codex) {
          log(
            "the two engines' logins sharing one email did not both get an account row",
            "red",
          );
          return false;
        }
        if (anthropic.kind !== "account" || codex.kind !== "account") {
          log(
            "a Codex login was tagged as plumbing instead of an account",
            "red",
          );
          return false;
        }
        if (
          anthropic.key !== "anthropic:same@example.com" ||
          codex.key !== "codex:same@example.com"
        ) {
          log("rows do not carry their provider-qualified keys", "red");
          return false;
        }
        if (anthropic.requests !== 2 || codex.requests !== 1) {
          log(
            "request counters were joined by label and crossed engines",
            "red",
          );
          return false;
        }
        if (
          anthropic.usage?.inputTokens !== 1000 ||
          codex.usage?.inputTokens !== 777
        ) {
          log("today's usage was joined by label and crossed engines", "red");
          return false;
        }
        return true;
      },
    );
  } finally {
    __testHooks.setAccountDirectoryForTests(null);
    await stats.resetUsageStatsForTests();
    resetAccountLedgerCache();
  }
}

/**
 * /limits is the quota source every dashboard row is built from. It only ever
 * enumerated Anthropic logins, so a Codex login had no quota row anywhere and
 * every surface downstream inherited the gap.
 */
async function testLimitsSnapshotEnumeratesBothEngines(): Promise<boolean> {
  const { __testHooks } =
    await import("../src/lib/server/routes/claudeProxyRoutes.js");
  const account = (key: string, label: string) => ({
    key,
    label,
    token: "t",
    type: "oauth" as const,
  });
  __testHooks.setAccountDirectoryForTests({
    knownKeys: new Set(["anthropic:a@example.com", "codex:a@example.com"]),
    anthropic: [account("anthropic:a@example.com", "a@example.com")],
    codex: [account("codex:a@example.com", "a@example.com")],
  });
  try {
    const limits = await __testHooks.refreshAccountLimits({
      snapshotOnly: true,
    });
    const byKey = new Map(limits.results.map((r) => [r.key, r]));
    const anthropic = byKey.get("anthropic:a@example.com");
    const codex = byKey.get("codex:a@example.com");
    if (!anthropic || !codex) {
      log("a snapshot /limits did not enumerate both engines' logins", "red");
      return false;
    }
    if (anthropic.provider !== "anthropic" || codex.provider !== "codex") {
      log(
        "limits results do not say which engine each login belongs to",
        "red",
      );
      return false;
    }
    if (anthropic.status !== "snapshot" || codex.status !== "snapshot") {
      log("a snapshot request fetched instead of reading stored state", "red");
      return false;
    }
    return true;
  } finally {
    __testHooks.setAccountDirectoryForTests(null);
  }
}

async function testAccountsRouteShape(): Promise<boolean> {
  const { createClaudeProxyRoutes } =
    await import("../src/lib/server/routes/claudeProxyRoutes.js");
  const route = createClaudeProxyRoutes().routes.find((r) =>
    r.path.endsWith("/accounts"),
  );
  if (!route || route.method !== "GET") {
    log(
      "GET /accounts is not registered on the Claude proxy route group",
      "red",
    );
    return false;
  }
  const body = (await route.handler({
    query: {},
    headers: {},
    method: "GET",
    path: "/accounts",
    requestId: "suite",
  } as never)) as {
    costBasis?: string;
    quotaFromSnapshot?: boolean;
    accounts?: { kind?: string; quota?: Record<string, unknown> | null }[];
  };

  if (body.costBasis !== "api-equivalent") {
    log(
      "cost basis is not labelled, so a consumer could read it as a bill",
      "red",
    );
    return false;
  }
  if (body.quotaFromSnapshot !== true) {
    log("a polled route defaulted to a live upstream quota fetch", "red");
    return false;
  }
  if (!Array.isArray(body.accounts)) {
    log("accounts is not an array", "red");
    return false;
  }
  for (const row of body.accounts) {
    if (!row.kind) {
      log("an account row is missing its kind discriminator", "red");
      return false;
    }
    const windows = (row.quota?.windows ?? []) as Record<string, unknown>[];
    for (const w of windows) {
      if (!("severity" in w) || !("isActive" in w) || !("resetsAtMs" in w)) {
        log("a quota window was not normalised for consumers", "red");
        return false;
      }
    }
  }
  return true;
}

// ============================================================================
// Tests: Primary account selection (in-process unit-style)
// ============================================================================

async function testPrimaryResolveHomeIndex(): Promise<boolean | null> {
  const { __testHooks } =
    await import("../src/lib/server/routes/claudeProxyRoutes.js");
  __testHooks.resetAllRuntimeState();

  type Acct = { key: string; label: string; token: string; type: "oauth" };
  const accts: Acct[] = [
    { key: "anthropic:a@test", label: "a@test", token: "t", type: "oauth" },
    { key: "anthropic:b@test", label: "b@test", token: "t", type: "oauth" },
    { key: "anthropic:c@test", label: "c@test", token: "t", type: "oauth" },
  ];

  // Case: no key configured → 0
  if (__testHooks.resolveHomeIndex(accts, undefined) !== 0) {
    log("resolveHomeIndex: undefined key did not return 0", "red");
    return false;
  }

  // Case: key resolves to its index
  if (__testHooks.resolveHomeIndex(accts, "anthropic:b@test") !== 1) {
    log(
      "resolveHomeIndex: did not return correct index for present key",
      "red",
    );
    return false;
  }

  // Case: key not in list → 0
  if (__testHooks.resolveHomeIndex(accts, "anthropic:missing@test") !== 0) {
    log("resolveHomeIndex: missing key did not fall back to 0", "red");
    return false;
  }

  // Case: empty enabledAccounts → 0
  if (__testHooks.resolveHomeIndex([], "anthropic:b@test") !== 0) {
    log("resolveHomeIndex: empty list did not return 0", "red");
    return false;
  }

  __testHooks.resetAllRuntimeState();
  log("resolveHomeIndex: all 4 cases passed", "green");
  return true;
}

async function testPrimaryMaybeResetToHome(): Promise<boolean | null> {
  const { __testHooks } =
    await import("../src/lib/server/routes/claudeProxyRoutes.js");
  __testHooks.resetAllRuntimeState();

  type Acct = { key: string; label: string; token: string; type: "oauth" };
  const accts: Acct[] = [
    { key: "anthropic:a@test", label: "a@test", token: "t", type: "oauth" },
    { key: "anthropic:b@test", label: "b@test", token: "t", type: "oauth" },
    { key: "anthropic:c@test", label: "c@test", token: "t", type: "oauth" },
  ];

  // Configure home as index 1 (b), simulate rotation to 2, expect reset to 1.
  __testHooks.setPrimaryAccountIndex(2);
  __testHooks.maybeResetPrimaryToHome(accts, "anthropic:b@test");
  if (__testHooks.getPrimaryAccountIndex() !== 1) {
    log(
      `maybeResetPrimaryToHome: expected index 1 after reset to home, got ${__testHooks.getPrimaryAccountIndex()}`,
      "red",
    );
    return false;
  }

  // Already at home → no-op
  __testHooks.maybeResetPrimaryToHome(accts, "anthropic:b@test");
  if (__testHooks.getPrimaryAccountIndex() !== 1) {
    log("maybeResetPrimaryToHome: should have stayed at home", "red");
    return false;
  }

  // Home is cooling → does NOT reset
  __testHooks.setPrimaryAccountIndex(2);
  __testHooks.setAccountRuntimeState("anthropic:b@test", {
    coolingUntil: Date.now() + 60_000,
  });
  __testHooks.maybeResetPrimaryToHome(accts, "anthropic:b@test");
  if (__testHooks.getPrimaryAccountIndex() !== 2) {
    log(
      "maybeResetPrimaryToHome: should NOT have reset while home cooling",
      "red",
    );
    return false;
  }

  // Cooling expires → resets
  __testHooks.setAccountRuntimeState("anthropic:b@test", {
    coolingUntil: Date.now() - 1_000,
  });
  __testHooks.maybeResetPrimaryToHome(accts, "anthropic:b@test");
  if (__testHooks.getPrimaryAccountIndex() !== 1) {
    log(
      "maybeResetPrimaryToHome: should have reset after cooling expired",
      "red",
    );
    return false;
  }

  // Configured key absent in enabledAccounts → home falls back to 0
  __testHooks.resetAllRuntimeState();
  __testHooks.setPrimaryAccountIndex(2);
  __testHooks.maybeResetPrimaryToHome(accts, "anthropic:missing@test");
  if (__testHooks.getPrimaryAccountIndex() !== 0) {
    log(
      `maybeResetPrimaryToHome: missing key should fall back to 0, got ${__testHooks.getPrimaryAccountIndex()}`,
      "red",
    );
    return false;
  }

  __testHooks.resetAllRuntimeState();
  log("maybeResetPrimaryToHome: 5 cases passed", "green");
  return true;
}

// ============================================================================
// Tests: quota-aware cooldown planning (reset-based, no 60s hardcap)
// ============================================================================

/**
 * Report a routing-case failure and reset the shared runtime state first.
 *
 * `__testHooks` state is module-level, so a case that returns early on failure
 * leaves the next case reading its accounts and quotas. One real failure then
 * cascades into unrelated ones and buries the original cause.
 */
async function failRoutingCase(message: string): Promise<false> {
  const { __testHooks } =
    await import("../src/lib/server/routes/claudeProxyRoutes.js");
  log(message, "red");
  __testHooks.resetAllRuntimeState();
  return false;
}

/**
 * Fixed epoch-ms the routing cases evaluate against. Cases must also pass
 * `lastUpdated: TEST_NOW` into makeQuota: routing discards a snapshot older
 * than QUOTA_SNAPSHOT_FRESHNESS_MS, and the wall-clock default sits far
 * enough from this clock to read as months stale, which silently routes a
 * case down the unknown-quota probe path instead of the comparator.
 */
const TEST_NOW = 1_800_000_000_000;

function makeQuota(over: Partial<AccountQuota> = {}): AccountQuota {
  return {
    sessionUsed: 0,
    sessionStatus: "allowed",
    sessionResetAt: 0,
    weeklyUsed: 0,
    weeklyStatus: "allowed",
    weeklyResetAt: 0,
    fallbackPercentage: 0,
    overageStatus: "allowed",
    lastUpdated: Date.now(),
    ...over,
  };
}

async function testPlanCooldownFor429(): Promise<boolean | null> {
  const { __testHooks } =
    await import("../src/lib/server/routes/claudeProxyRoutes.js");
  const now = 1_800_000_000_000; // fixed epoch-ms for determinism
  const nowSec = Math.floor(now / 1000);

  // 1. Session (5h) exhaustion → rotate immediately, cool until the 5h reset,
  //    NOT a 60s hardcap.
  const sessionResetSec = nowSec + 2 * 3600; // +2h
  const sessionPlan = __testHooks.planCooldownFor429(
    makeQuota({ sessionStatus: "rejected", sessionResetAt: sessionResetSec }),
    0,
    now,
  );
  if (
    sessionPlan.reason !== "session" ||
    sessionPlan.rotateImmediately !== true ||
    sessionPlan.coolingUntil !== sessionResetSec * 1000
  ) {
    log(
      `planCooldownFor429: session case wrong: ${JSON.stringify(sessionPlan)}`,
      "red",
    );
    return false;
  }

  // 2. Weekly (7d) exhaustion → cool until the 7d reset (days), takes
  //    precedence over session.
  const weeklyResetSec = nowSec + 3 * 24 * 3600; // +3d
  const weeklyPlan = __testHooks.planCooldownFor429(
    makeQuota({
      weeklyStatus: "rejected",
      weeklyResetAt: weeklyResetSec,
      sessionStatus: "rejected",
      sessionResetAt: sessionResetSec,
    }),
    0,
    now,
  );
  if (
    weeklyPlan.reason !== "weekly" ||
    weeklyPlan.rotateImmediately !== true ||
    weeklyPlan.coolingUntil !== weeklyResetSec * 1000
  ) {
    log(
      `planCooldownFor429: weekly case wrong: ${JSON.stringify(weeklyPlan)}`,
      "red",
    );
    return false;
  }

  // 3. Transient burst (window still "allowed") → retry same account, short
  //    cooldown from retry-after (not the full reset).
  const transientPlan = __testHooks.planCooldownFor429(
    makeQuota({}),
    5_000,
    now,
  );
  if (
    transientPlan.reason !== "transient" ||
    transientPlan.rotateImmediately !== false ||
    transientPlan.coolingUntil !== now + 5_000
  ) {
    log(
      `planCooldownFor429: transient case wrong: ${JSON.stringify(transientPlan)}`,
      "red",
    );
    return false;
  }

  // 4. Rejected but reset in the PAST → falls back to retry-after, not a past
  //    timestamp (would otherwise be clamped to now+MIN).
  const stalePlan = __testHooks.planCooldownFor429(
    makeQuota({ sessionStatus: "rejected", sessionResetAt: nowSec - 3600 }),
    0,
    now,
  );
  if (stalePlan.coolingUntil <= now) {
    log(
      `planCooldownFor429: stale reset should clamp forward, got ${stalePlan.coolingUntil}`,
      "red",
    );
    return false;
  }
  // A rejected session with a stale reset must still be treated as session
  // exhaustion (immediate rotation), not degrade to transient behavior.
  if (stalePlan.reason !== "session" || stalePlan.rotateImmediately !== true) {
    log(
      `planCooldownFor429: stale reset should keep session semantics, got ${JSON.stringify(stalePlan)}`,
      "red",
    );
    return false;
  }

  // 5. A Fable-scoped 429 can carry top-level `unified: rejected` even while
  // the account-wide session and weekly windows are allowed. It must rotate
  // this request, preserve the scoped quota window, and never park the account
  // for unrelated models.
  const scopedResetSec = nowSec + 3 * 24 * 3600;
  const fableScopedQuota = makeQuota({
    unifiedStatus: "rejected",
    overageStatus: "rejected",
    lastUpdated: now,
    sessionResetAt: nowSec + 2 * 3600,
    weeklyResetAt: nowSec + 5 * 24 * 3600,
    windows: [
      {
        kind: "weekly_scoped",
        group: "weekly",
        used: 1,
        status: "rejected",
        resetsAt: scopedResetSec,
        scopeModel: "claude-fable-5",
      },
    ],
  });
  const scopedPlan = __testHooks.planCooldownFor429(
    fableScopedQuota,
    0,
    now,
    undefined,
    undefined,
    "claude-fable-5-20260115",
  );
  if (
    scopedPlan.scope !== "model" ||
    scopedPlan.reason !== "unified" ||
    scopedPlan.rotateImmediately !== true ||
    scopedPlan.coolingUntil !== scopedResetSec * 1000
  ) {
    log(
      `planCooldownFor429: scoped case must rotate without account cooldown, got ${JSON.stringify(scopedPlan)}`,
      "red",
    );
    return false;
  }
  const previouslyParked = {
    coolingUntil: now + 12 * 3600 * 1000,
    coolingReason: "unified" as const,
  };
  const scopedReconciliation = __testHooks.reconcileCooldownFromQuota(
    previouslyParked as never,
    fableScopedQuota,
    now,
  );
  if (
    scopedReconciliation?.kind !== "cleared" ||
    previouslyParked.coolingUntil !== undefined ||
    previouslyParked.coolingReason !== undefined
  ) {
    log(
      "planCooldownFor429: scoped evidence must clear a historical account-wide unified cooldown",
      "red",
    );
    return false;
  }

  log("planCooldownFor429: 5 cases passed", "green");
  return true;
}

// ============================================================================
// Tests: quota-optimized ordering (soonest-reset-first, max utilization)
// ============================================================================

async function testOrderAccountsByQuota(): Promise<boolean | null> {
  const { __testHooks } =
    await import("../src/lib/server/routes/claudeProxyRoutes.js");
  __testHooks.resetAllRuntimeState();
  const now = 1_800_000_000_000;
  const nowSec = Math.floor(now / 1000);

  type Acct = { key: string; label: string; token: string; type: "oauth" };
  const a: Acct = { key: "anthropic:a", label: "a", token: "t", type: "oauth" };
  const b: Acct = { key: "anthropic:b", label: "b", token: "t", type: "oauth" };
  const c: Acct = { key: "anthropic:c", label: "c", token: "t", type: "oauth" };

  // a: weekly resets in 3d ; b: weekly resets in 8h (soonest) ; c: session
  // rejected (cooling until +2h). Expect: b (soonest weekly) → a → c (unusable).
  __testHooks.setAccountRuntimeState("anthropic:a", {
    quota: makeQuota({
      lastUpdated: now,
      weeklyResetAt: nowSec + 3 * 24 * 3600,
    }) as never,
  });
  __testHooks.setAccountRuntimeState("anthropic:b", {
    quota: makeQuota({
      lastUpdated: now,
      weeklyResetAt: nowSec + 8 * 3600,
    }) as never,
  });
  __testHooks.setAccountRuntimeState("anthropic:c", {
    coolingUntil: now + 2 * 3600 * 1000,
    quota: makeQuota({
      lastUpdated: now,
      sessionStatus: "rejected",
      sessionResetAt: nowSec + 2 * 3600,
    }) as never,
  });

  const ordered = __testHooks
    .orderAccountsByQuota([a, b, c] as never, now, undefined)
    .map((x: { label: string }) => x.label);
  if (ordered.join(",") !== "b,a,c") {
    log(
      `orderAccountsByQuota: expected b,a,c (soonest-weekly-first, cooling last), got ${ordered.join(",")}`,
      "red",
    );
    __testHooks.resetAllRuntimeState();
    return false;
  }

  // Unknown quota must not displace known healthy accounts. The adaptive
  // refresh coordinator discovers unknown windows through the lightweight
  // usage endpoint instead of sending production traffic as a probe.
  const d: Acct = { key: "anthropic:d", label: "d", token: "t", type: "oauth" };
  const probeOrdered = __testHooks
    .orderAccountsByQuota([a, b, d] as never, now, undefined)
    .map((x: { label: string }) => x.label);
  if (probeOrdered.join(",") !== "b,a,d") {
    log(
      `orderAccountsByQuota: expected b,a,d (known healthy before unknown), got ${probeOrdered.join(",")}`,
      "red",
    );
    __testHooks.resetAllRuntimeState();
    return false;
  }

  // Primary tie-break: with equal knowledge (both unknown), the configured
  // primary wins over insertion order.
  const e: Acct = { key: "anthropic:e", label: "e", token: "t", type: "oauth" };
  const tieOrdered = __testHooks
    .orderAccountsByQuota([d, e] as never, now, "anthropic:e")
    .map((x: { label: string }) => x.label);
  if (tieOrdered.join(",") !== "e,d") {
    log(
      `orderAccountsByQuota: expected e,d (primary tie-break), got ${tieOrdered.join(",")}`,
      "red",
    );
    __testHooks.resetAllRuntimeState();
    return false;
  }

  __testHooks.resetAllRuntimeState();
  log(
    "orderAccountsByQuota: soonest-reset-first + known-before-unknown + primary tie-break passed",
    "green",
  );
  return true;
}

// ============================================================================
// Tests: accountRanking.ts — compareExpiryFirst (extracted comparator)
// ============================================================================

function makeSortMetrics(
  over: Partial<ProxyAccountSortMetrics> = {},
): ProxyAccountSortMetrics {
  return {
    usable: true,
    saturated: false,
    hasQuota: true,
    quotaEvidenceRank: 0,
    quotaStale: false,
    quotaFreshness: "fresh",
    refreshNeeded: false,
    refreshReason: null,
    refreshInFlight: false,
    lastRefreshAttemptAt: null,
    lastRefreshSuccessAt: null,
    nextRefreshEligibleAt: null,
    saturationKind: "none",
    softLimitOverrideReason: null,
    quotaLastUpdated: null,
    quotaAgeMs: null,
    coolingActive: false,
    coolingReason: null,
    coolingUntil: 0,
    unifiedStatus: null,
    overageStatus: null,
    sessionStatus: "allowed",
    sessionUsed: 0,
    sessionResetBucket: Number.POSITIVE_INFINITY,
    sessionReset: Number.POSITIVE_INFINITY,
    weeklyStatus: "allowed",
    weeklyReset: Number.POSITIVE_INFINITY,
    weeklyUsed: 0,
    weeklyUsedForSort: 0,
    scopedModel: null,
    scopedStatus: null,
    scopedUsed: null,
    scopedReset: Number.POSITIVE_INFINITY,
    scopedUsedForSort: -1,
    scopedSaturated: false,
    ...over,
  };
}

async function testCompareExpiryFirstAvailability(): Promise<boolean> {
  const usable: ProxyPassthroughAccount = {
    key: "anthropic:a",
    label: "a",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const cooling: ProxyPassthroughAccount = {
    key: "anthropic:b",
    label: "b",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const metricsByKey = new Map([
    [usable.key, makeSortMetrics({ usable: true })],
    [
      cooling.key,
      makeSortMetrics({ usable: false, coolingUntil: Date.now() + 60_000 }),
    ],
  ]);
  const [sign, reason] = compareExpiryFirst(
    cooling,
    usable,
    metricsByKey,
    undefined,
  );
  if (sign <= 0 || reason !== "availability") {
    log(
      `compareExpiryFirst availability branch wrong — sign=${sign} reason=${reason}`,
      "red",
    );
    return false;
  }
  return true;
}

function buildRankingFixtureAccounts(): ProxyPassthroughAccount[] {
  return [
    { key: "anthropic:cooling", label: "cooling", type: "oauth" },
    { key: "anthropic:stale", label: "stale", type: "oauth" },
    { key: "anthropic:saturated", label: "saturated", type: "oauth" },
    {
      key: "anthropic:scoped-saturated",
      label: "scoped-saturated",
      type: "oauth",
    },
    { key: "anthropic:home", label: "home", type: "oauth" },
    { key: "anthropic:soonest", label: "soonest", type: "oauth" },
  ] as ProxyPassthroughAccount[];
}

/**
 * `now` and `sessionResetToleranceMs` are threaded in (rather than each
 * fixture account calling Date.now() independently) so the direct-side
 * fabrication and the wrapper's quota-derived state below are built from the
 * exact same instant — sessionResetBucket is a tolerance-bucket floor-divide
 * and a few milliseconds of drift between two separate Date.now() calls could
 * flip it across a bucket boundary.
 */
function buildRankingFixtureMetrics(
  now: number,
  sessionResetToleranceMs: number,
): Map<string, ProxyAccountSortMetrics> {
  // Inside the 5h session window, so accountSortMetrics treats it as ticking.
  const saturatedSessionReset = now + 2 * 3600_000;
  return new Map([
    [
      "anthropic:cooling",
      makeSortMetrics({ usable: false, coolingUntil: now + 120_000 }),
    ],
    [
      "anthropic:stale",
      // accountSortMetrics only derives quotaFreshness: "unknown" (rank 2)
      // when the account has NO recorded quota at all — every other field
      // routingQuota would otherwise populate (sessionUsed, weeklyUsed, ...)
      // is null in that state too, so this fixture records no runtime state
      // for this account at all (see the loop below) rather than a quota.
      makeSortMetrics({
        quotaEvidenceRank: 2,
        quotaFreshness: "unknown",
        hasQuota: false,
        refreshNeeded: true,
        refreshReason: "startup_unknown",
        sessionUsed: null,
        weeklyUsed: null,
        weeklyUsedForSort: -1,
      }),
    ],
    [
      "anthropic:saturated",
      makeSortMetrics({
        saturated: true,
        saturationKind: "soft",
        // >= sessionSoftLimit (0.97) and a live sessionReset — a saturated
        // account whose session window never ticks is forced to
        // sessionUsed: 0 by accountSortMetrics, which is exactly the mismatch
        // this fixture used to have.
        sessionUsed: 0.99,
        sessionReset: saturatedSessionReset,
        sessionResetBucket: Math.floor(
          saturatedSessionReset / sessionResetToleranceMs,
        ),
      }),
    ],
    [
      "anthropic:scoped-saturated",
      makeSortMetrics({
        scopedSaturated: true,
        scopedUsed: 0.99,
        scopedUsedForSort: 0.99,
      }),
    ],
    ["anthropic:home", makeSortMetrics({ weeklyReset: now + 3_600_000 })],
    ["anthropic:soonest", makeSortMetrics({ weeklyReset: now + 60_000 })],
  ]);
}

/**
 * The fixture's order, derived by hand from buildRankingFixtureMetrics and
 * never from rankAccounts: both ranking entry points share compareExpiryFirst,
 * so a reordered or inverted rung moves them together and only a fixed
 * expectation can see it. `decidedBy` is the rung that places each account
 * ahead of the next one, which is also the reason rankAccounts must report
 * for a list that starts at that account.
 */
const RANKING_FIXTURE_EXPECTED_ORDER: readonly {
  key: string;
  decidedBy: ProxyAccountRoutingReason;
}[] = [
  // soonest > home: weekly_reset (resets at now+60s, home at now+1h)
  { key: "anthropic:soonest", decidedBy: "weekly_reset" },
  // home > scoped-saturated: scoped_headroom (only the latter's model cap is spent)
  { key: "anthropic:home", decidedBy: "scoped_headroom" },
  // scoped-saturated > saturated: session_headroom (the latter is past the 5h soft limit)
  { key: "anthropic:scoped-saturated", decidedBy: "session_headroom" },
  // saturated > stale: quota_evidence (stale has no quota at all, rank 2)
  { key: "anthropic:saturated", decidedBy: "quota_evidence" },
  // stale > cooling: availability (cooling is in a cooldown)
  { key: "anthropic:stale", decidedBy: "availability" },
  // cooling is last, so a list holding only cooling reports single_account
  { key: "anthropic:cooling", decidedBy: "single_account" },
];

/**
 * Cross-checks the pure accountRanking module against the still-live route
 * surface, on two levels:
 *
 *  - field level: for every account, every order-deciding field the direct
 *    side fabricates must equal what the route's real accountSortMetrics
 *    derives from the quota this fixture hands it (via
 *    __testHooks.buildQuotaRoutingDecision's candidates, and the route's own
 *    metrics for the three fields a candidate does not carry) — so a future
 *    fixture/production drift fails with a named account+field instead of a
 *    silently-coincidental order match.
 *  - order level: rankAccounts must produce RANKING_FIXTURE_EXPECTED_ORDER
 *    and its reason, and __testHooks.orderAccountsByQuota must agree with it
 *    on the final order for these six accounts.
 */
async function testAccountRankingMatchesRouteWrapper(): Promise<boolean> {
  const accounts = buildRankingFixtureAccounts();
  const now = Date.now();
  const sessionSoftLimit = 0.97;
  const sessionResetToleranceMs = 5 * 60 * 1000;
  const metricsByKey = buildRankingFixtureMetrics(now, sessionResetToleranceMs);
  const direct = rankAccounts({
    accounts,
    metricsByKey,
    primaryKey: "anthropic:home",
  });

  const { __testHooks } =
    await import("../src/lib/server/routes/claudeProxyRoutes.js");
  __testHooks.resetAllRuntimeState();
  // Matches "anthropic:scoped-saturated"'s fabricated scopedSaturated: true
  // below to a real quota window (matchScopedQuotaWindow / accountSortMetrics
  // in claudeProxyRoutes.ts), rather than fabricating the metric on the
  // direct side with nothing on the wrapper side to derive it from — passing
  // requestedModel with no matching window would leave the wrapper computing
  // scopedSaturated: false for every account and the parity check would
  // still pass, comparing two different metric shapes.
  const requestedModel = "claude-fable-5-20260115";
  for (const account of accounts) {
    const m = metricsByKey.get(account.key);
    if (!m) {
      continue;
    }
    if (account.key === "anthropic:stale") {
      // No runtime state at all — see the comment on its fixture metrics.
      continue;
    }
    const baseQuota = makeQuota({
      lastUpdated: now,
      weeklyResetAt: Number.isFinite(m.weeklyReset) ? m.weeklyReset : undefined,
      sessionResetAt: Number.isFinite(m.sessionReset)
        ? m.sessionReset
        : undefined,
      sessionUsed: m.sessionUsed ?? 0,
      weeklyUsed: m.weeklyUsed ?? 0,
    });
    __testHooks.setAccountRuntimeState(account.key, {
      coolingUntil: m.coolingUntil > 0 ? m.coolingUntil : undefined,
      quota: m.scopedSaturated
        ? {
            ...baseQuota,
            windows: [
              {
                kind: "weekly_scoped",
                group: "weekly",
                used: m.scopedUsed ?? 0.99,
                // "allowed", not "rejected": accountSortMetrics only
                // withholds `usable` for a REJECTED scoped window (see its
                // doc comment) — a scoped window can be saturated while the
                // account stays usable, which is exactly the scoped_headroom
                // comparator rung this fixture targets.
                status: "allowed",
                resetsAt: Math.floor(now / 1000) + 3 * 24 * 3600,
                scopeModel: "claude-fable-5",
                source: "headers",
                updatedAt: now,
              },
            ],
          }
        : baseQuota,
    });
  }
  const viaWrapper = __testHooks.orderAccountsByQuota(
    accounts,
    now,
    "anthropic:home",
    sessionSoftLimit,
    sessionResetToleranceMs,
    requestedModel,
  );
  const decision = __testHooks.buildQuotaRoutingDecision(
    accounts,
    now,
    "anthropic:home",
    sessionSoftLimit,
    sessionResetToleranceMs,
    { requestedModel },
  );
  const { metricsByKey: wrapperMetricsByKey } =
    __testHooks.orderAccountsByQuotaWithMetrics(
      accounts,
      now,
      "anthropic:home",
      sessionSoftLimit,
      sessionResetToleranceMs,
      { requestedModel },
    );
  __testHooks.resetAllRuntimeState();

  if (!decision) {
    log(
      "ranking fixture parity: buildQuotaRoutingDecision returned no decision",
      "red",
    );
    return false;
  }
  const candidatesByLabel = new Map(
    decision.candidates.map((candidate) => [candidate.account, candidate]),
  );
  // quotaEvidenceRank itself isn't on ProxyAccountRoutingCandidate, but it is
  // a pure function of the quotaFreshness string that is — same mapping
  // accountSortMetrics uses, so this doesn't re-derive the ranking decision,
  // only its enum encoding.
  const freshnessRank = (freshness: ProxyQuotaFreshness | undefined): number =>
    freshness === "fresh" || freshness === "stale_known"
      ? 0
      : freshness === "refresh_due"
        ? 1
        : 2;
  let fieldsOk = true;
  for (const account of accounts) {
    const expected = metricsByKey.get(account.key);
    const actual = candidatesByLabel.get(account.label);
    const derived = wrapperMetricsByKey.get(account.key);
    if (!expected || !actual || !derived) {
      log(
        `ranking fixture parity: account=${account.label} missing expected metrics, wrapper candidate or wrapper metrics`,
        "red",
      );
      fieldsOk = false;
      continue;
    }
    const expectedCoolingUntil =
      expected.coolingUntil > 0 && Number.isFinite(expected.coolingUntil)
        ? expected.coolingUntil
        : null;
    const expectedSessionResetBucket = Number.isFinite(
      expected.sessionResetBucket,
    )
      ? expected.sessionResetBucket
      : null;
    const expectedWeeklyResetAt = Number.isFinite(expected.weeklyReset)
      ? expected.weeklyReset
      : null;
    const checks: [string, boolean][] = [
      ["usable", actual.usable === expected.usable],
      ["coolingUntil", actual.coolingUntil === expectedCoolingUntil],
      [
        "quotaEvidenceRank",
        freshnessRank(actual.quotaFreshness) === expected.quotaEvidenceRank,
      ],
      ["saturated", actual.saturated === expected.saturated],
      [
        "sessionResetBucket",
        actual.sessionResetBucket === expectedSessionResetBucket,
      ],
      ["weeklyResetAt", actual.weeklyResetAt === expectedWeeklyResetAt],
      ["scopedUsed", (actual.scopedUsed ?? null) === expected.scopedUsed],
      ["weeklyUsed", (actual.weeklyUsed ?? null) === expected.weeklyUsed],
      // Not on ProxyAccountRoutingCandidate, so read from the route's metrics.
      ["scopedSaturated", derived.scopedSaturated === expected.scopedSaturated],
      [
        "scopedUsedForSort",
        derived.scopedUsedForSort === expected.scopedUsedForSort,
      ],
      [
        "weeklyUsedForSort",
        derived.weeklyUsedForSort === expected.weeklyUsedForSort,
      ],
    ];
    for (const [field, ok] of checks) {
      if (!ok) {
        log(
          `ranking fixture parity: account=${account.label} field=${field} mismatch between fabricated and wrapper-derived metrics`,
          "red",
        );
        fieldsOk = false;
      }
    }
  }
  if (!fieldsOk) {
    return false;
  }

  const directKeys = direct.orderedAccounts.map((a) => a.key);
  const expectedKeys = RANKING_FIXTURE_EXPECTED_ORDER.map((entry) => entry.key);
  const mismatchAt = expectedKeys.findIndex(
    (key, index) => directKeys[index] !== key,
  );
  if (mismatchAt >= 0 || directKeys.length !== expectedKeys.length) {
    log(
      `rankAccounts departs from the hand-derived fixture order at position ${mismatchAt >= 0 ? mismatchAt : expectedKeys.length}`,
      "red",
    );
    return false;
  }
  if (direct.reason !== RANKING_FIXTURE_EXPECTED_ORDER[0].decidedBy) {
    log(
      `rankAccounts reported reason ${direct.reason} for the fixture, expected ${RANKING_FIXTURE_EXPECTED_ORDER[0].decidedBy}`,
      "red",
    );
    return false;
  }
  const wrapperKeys = viaWrapper.map((a) => a.key);
  const matches =
    directKeys.length === wrapperKeys.length &&
    directKeys.every((key, index) => key === wrapperKeys[index]);
  if (!matches) {
    log(
      "rankAccounts and the route's orderAccountsByQuota disagree on order",
      "red",
    );
    return false;
  }
  return true;
}

/**
 * The reason must come from the pair the sort produced (rank 0 against rank
 * 1), not the pair it was given. Each suffix of the hand-derived order starts
 * at a different account, so together they cover five deciding rungs plus the
 * single-account case.
 */
async function testRankAccountsReasonNamesDecidingRung(): Promise<boolean> {
  const accounts = buildRankingFixtureAccounts();
  const metricsByKey = buildRankingFixtureMetrics(Date.now(), 5 * 60 * 1000);
  let ok = true;
  for (const [index, expected] of RANKING_FIXTURE_EXPECTED_ORDER.entries()) {
    const remaining = new Set(
      RANKING_FIXTURE_EXPECTED_ORDER.slice(index).map((entry) => entry.key),
    );
    const { orderedAccounts, reason } = rankAccounts({
      // Fixture insertion order, so the sort still has to reorder the input.
      accounts: accounts.filter((account) => remaining.has(account.key)),
      metricsByKey,
      primaryKey: "anthropic:home",
    });
    if (
      orderedAccounts[0]?.key !== expected.key ||
      reason !== expected.decidedBy
    ) {
      log(
        `rankAccounts over the last ${remaining.size} fixture accounts: expected ${expected.key} first by ${expected.decidedBy}, got ${orderedAccounts[0]?.key ?? "none"} first by ${reason}`,
        "red",
      );
      ok = false;
    }
  }
  return ok;
}

// ============================================================================
// Tests: accountRanking.ts — compareHeadroomFirst, precedence, spill
// ============================================================================

async function testCompareHeadroomFirstPrefersMoreHeadroom(): Promise<boolean> {
  const lowHeadroom: ProxyPassthroughAccount = {
    key: "anthropic:low",
    label: "low",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const highHeadroom: ProxyPassthroughAccount = {
    key: "anthropic:high",
    label: "high",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const metricsByKey = new Map([
    [lowHeadroom.key, makeSortMetrics({ sessionUsed: 0.9, weeklyUsed: 0.9 })],
    [highHeadroom.key, makeSortMetrics({ sessionUsed: 0.1, weeklyUsed: 0.1 })],
  ]);
  const [sign, reason] = compareHeadroomFirst(
    lowHeadroom,
    highHeadroom,
    metricsByKey,
    undefined,
  );
  if (sign <= 0 || reason !== "headroom") {
    log(
      `compareHeadroomFirst headroom branch wrong — sign=${sign} reason=${reason}`,
      "red",
    );
    return false;
  }
  return true;
}

async function testCompareHeadroomFirstUnknownHeadroomSortsLast(): Promise<boolean> {
  const known: ProxyPassthroughAccount = {
    key: "anthropic:known",
    label: "known",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const unknown: ProxyPassthroughAccount = {
    key: "anthropic:unknown",
    label: "unknown",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const metricsByKey = new Map([
    [known.key, makeSortMetrics({ sessionUsed: 0.5, weeklyUsed: 0.5 })],
    [unknown.key, makeSortMetrics({ sessionUsed: null, weeklyUsed: null })],
  ]);
  const [sign, reason] = compareHeadroomFirst(
    unknown,
    known,
    metricsByKey,
    undefined,
  );
  if (sign <= 0 || reason !== "headroom") {
    log(
      "expected the unknown-headroom account to sort after the known one",
      "red",
    );
    return false;
  }
  return true;
}

async function testApplyAffinityTakesPrecedenceOverPreferPrimary(): Promise<boolean> {
  const { applyAffinityAndPrimary } =
    await import("../src/lib/proxy/accountRanking.js");
  const bound: ProxyPassthroughAccount = {
    key: "anthropic:bound",
    label: "bound",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const primary: ProxyPassthroughAccount = {
    key: "anthropic:primary",
    label: "primary",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const metricsByKey = new Map([
    [bound.key, makeSortMetrics({})],
    [primary.key, makeSortMetrics({})],
  ]);
  const result = applyAffinityAndPrimary({
    orderedAccounts: [primary, bound],
    metricsByKey,
    affinityKey: bound.key,
    primaryKey: primary.key,
    preferPrimary: true,
  });
  if (
    result.reason !== "session_affinity" ||
    result.orderedAccounts[0]?.key !== bound.key
  ) {
    log("expected session affinity to win over prefer-primary", "red");
    return false;
  }
  return true;
}

async function testApplyAffinitySkipsUnusableBoundAccount(): Promise<boolean> {
  const { applyAffinityAndPrimary } =
    await import("../src/lib/proxy/accountRanking.js");
  const bound: ProxyPassthroughAccount = {
    key: "anthropic:bound",
    label: "bound",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const other: ProxyPassthroughAccount = {
    key: "anthropic:other",
    label: "other",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const metricsByKey = new Map([
    [bound.key, makeSortMetrics({ usable: false })],
    [other.key, makeSortMetrics({})],
  ]);
  const result = applyAffinityAndPrimary({
    orderedAccounts: [bound, other],
    metricsByKey,
    affinityKey: bound.key,
  });
  if (result.reason !== null || result.affinitySkippedReason !== "unusable") {
    log("expected affinity to be skipped as unusable", "red");
    return false;
  }
  return true;
}

async function testRankAccountsHeadroomFirstWithAffinity(): Promise<boolean> {
  const bound: ProxyPassthroughAccount = {
    key: "anthropic:bound",
    label: "bound",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const highHeadroom: ProxyPassthroughAccount = {
    key: "anthropic:high",
    label: "high",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const metricsByKey = new Map([
    [bound.key, makeSortMetrics({ sessionUsed: 0.8, weeklyUsed: 0.8 })],
    [highHeadroom.key, makeSortMetrics({ sessionUsed: 0.1, weeklyUsed: 0.1 })],
  ]);
  const result = rankAccounts({
    accounts: [highHeadroom, bound],
    metricsByKey,
    primaryKey: undefined,
    ranking: "headroom-first",
    affinityKey: bound.key,
  });
  if (
    result.reason !== "session_affinity" ||
    result.orderedAccounts[0]?.key !== bound.key
  ) {
    log("expected affinity to override headroom-first ranking", "red");
    return false;
  }
  return true;
}

async function testRankAccountsDefaultsToExpiryFirstWhenRankingOmitted(): Promise<boolean> {
  const accounts = buildRankingFixtureAccounts();
  const metricsByKey = buildRankingFixtureMetrics(Date.now(), 5 * 60 * 1000);
  const withRanking = rankAccounts({
    accounts,
    metricsByKey,
    primaryKey: "anthropic:home",
    ranking: "expiry-first",
  });
  const withoutRanking = rankAccounts({
    accounts,
    metricsByKey,
    primaryKey: "anthropic:home",
  });
  const same =
    withRanking.orderedAccounts.map((a) => a.key).join(",") ===
    withoutRanking.orderedAccounts.map((a) => a.key).join(",");
  if (!same) {
    log("expected omitted ranking to default to expiry-first", "red");
    return false;
  }
  return true;
}

async function testApplySpillMovesAccountUnderThreshold(): Promise<boolean> {
  const { applySpill } = await import("../src/lib/proxy/accountRanking.js");
  const first: ProxyPassthroughAccount = {
    key: "anthropic:first",
    label: "first",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const second: ProxyPassthroughAccount = {
    key: "anthropic:second",
    label: "second",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const inflightByKey = new Map([
    [first.key, 25],
    [second.key, 3],
  ]);
  const metricsByKey = new Map([
    [first.key, makeSortMetrics({ usable: true })],
    [second.key, makeSortMetrics({ usable: true })],
  ]);
  const result = applySpill({
    orderedAccounts: [first, second],
    inflightByKey,
    metricsByKey,
    spillInflight: 20,
  });
  if (
    result.orderedAccounts[0]?.key !== second.key ||
    result.spill?.from !== first.key ||
    result.spill?.to !== second.key ||
    result.spill?.inflight !== 25
  ) {
    log(
      "expected spill to move the under-threshold account to the front",
      "red",
    );
    return false;
  }
  return true;
}

async function testApplySpillNoOpBelowThreshold(): Promise<boolean> {
  const { applySpill } = await import("../src/lib/proxy/accountRanking.js");
  const first: ProxyPassthroughAccount = {
    key: "anthropic:first",
    label: "first",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const second: ProxyPassthroughAccount = {
    key: "anthropic:second",
    label: "second",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const inflightByKey = new Map([
    [first.key, 5],
    [second.key, 0],
  ]);
  const metricsByKey = new Map([
    [first.key, makeSortMetrics({ usable: true })],
    [second.key, makeSortMetrics({ usable: true })],
  ]);
  const result = applySpill({
    orderedAccounts: [first, second],
    inflightByKey,
    metricsByKey,
    spillInflight: 20,
  });
  if (result.spill !== null || result.orderedAccounts[0]?.key !== first.key) {
    log("expected no spill when the first account is under threshold", "red");
    return false;
  }
  return true;
}

// Spill must skip an unusable candidate and keep looking for a usable
// one below the threshold, rather than moving onto whichever account is
// first under the threshold regardless of usability.
async function testApplySpillSkipsUnusableAccountForLaterUsable(): Promise<boolean> {
  const { applySpill } = await import("../src/lib/proxy/accountRanking.js");
  const first: ProxyPassthroughAccount = {
    key: "anthropic:first",
    label: "first",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const unusable: ProxyPassthroughAccount = {
    key: "anthropic:unusable",
    label: "unusable",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const usable: ProxyPassthroughAccount = {
    key: "anthropic:usable",
    label: "usable",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const inflightByKey = new Map([
    [first.key, 25],
    [unusable.key, 0],
    [usable.key, 5],
  ]);
  const metricsByKey = new Map([
    [first.key, makeSortMetrics({ usable: true })],
    [unusable.key, makeSortMetrics({ usable: false })],
    [usable.key, makeSortMetrics({ usable: true })],
  ]);
  const result = applySpill({
    orderedAccounts: [first, unusable, usable],
    inflightByKey,
    metricsByKey,
    spillInflight: 20,
  });
  if (
    result.orderedAccounts[0]?.key !== usable.key ||
    result.orderedAccounts[1]?.key !== first.key ||
    result.orderedAccounts[2]?.key !== unusable.key ||
    result.spill?.from !== first.key ||
    result.spill?.to !== usable.key ||
    result.spill?.inflight !== 25
  ) {
    log(
      "expected spill to skip the unusable account and land on the later usable one",
      "red",
    );
    return false;
  }
  return true;
}

// When every account below the first choice is unusable, spill must be
// a no-op — there is no usable target to move onto.
async function testApplySpillNoSpillWhenAllLaterAccountsUnusable(): Promise<boolean> {
  const { applySpill } = await import("../src/lib/proxy/accountRanking.js");
  const first: ProxyPassthroughAccount = {
    key: "anthropic:first",
    label: "first",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const unusable: ProxyPassthroughAccount = {
    key: "anthropic:unusable",
    label: "unusable",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const inflightByKey = new Map([
    [first.key, 25],
    [unusable.key, 0],
  ]);
  const metricsByKey = new Map([
    [first.key, makeSortMetrics({ usable: true })],
    [unusable.key, makeSortMetrics({ usable: false })],
  ]);
  const result = applySpill({
    orderedAccounts: [first, unusable],
    inflightByKey,
    metricsByKey,
    spillInflight: 20,
  });
  if (
    result.spill !== null ||
    result.orderedAccounts[0]?.key !== first.key ||
    result.orderedAccounts[1]?.key !== unusable.key
  ) {
    log("expected no spill when every later account is unusable", "red");
    return false;
  }
  return true;
}

// `usable` and `saturated` are independent: a session-saturated account can
// still be usable, and quota routing must not have traffic spilled onto it.
// The shape is first at the threshold, then a busy account, then a usable but
// saturated one with nothing in flight.
function buildSaturatedSpillFixture(): {
  first: ProxyPassthroughAccount;
  busy: ProxyPassthroughAccount;
  saturated: ProxyPassthroughAccount;
  inflightByKey: Map<string, number>;
  metricsByKey: Map<string, ProxyAccountSortMetrics>;
} {
  const first = {
    key: "anthropic:first",
    label: "first",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const busy = {
    key: "anthropic:busy",
    label: "busy",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const saturated = {
    key: "anthropic:saturated",
    label: "saturated",
    type: "oauth",
  } as ProxyPassthroughAccount;
  return {
    first,
    busy,
    saturated,
    inflightByKey: new Map([
      [first.key, 5],
      [busy.key, 5],
      [saturated.key, 0],
    ]),
    metricsByKey: new Map([
      [first.key, makeSortMetrics({})],
      [busy.key, makeSortMetrics({})],
      [
        saturated.key,
        makeSortMetrics({
          usable: true,
          saturated: true,
          saturationKind: "soft",
          sessionUsed: 0.98,
        }),
      ],
    ]),
  };
}

async function testApplySpillSkipsSaturatedAccountForLaterEligible(): Promise<boolean> {
  const { applySpill } = await import("../src/lib/proxy/accountRanking.js");
  const { first, busy, saturated, inflightByKey, metricsByKey } =
    buildSaturatedSpillFixture();
  const eligible = {
    key: "anthropic:eligible",
    label: "eligible",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const result = applySpill({
    orderedAccounts: [first, busy, saturated, eligible],
    inflightByKey: new Map([...inflightByKey, [eligible.key, 1]]),
    metricsByKey: new Map([
      ...metricsByKey,
      [eligible.key, makeSortMetrics({})],
    ]),
    spillInflight: 5,
  });
  if (
    result.spill?.to !== eligible.key ||
    result.spill?.from !== first.key ||
    result.orderedAccounts.map((account) => account.key).join(",") !==
      [eligible.key, first.key, busy.key, saturated.key].join(",")
  ) {
    log(
      "expected spill to skip the saturated account and land on the later eligible one",
      "red",
    );
    return false;
  }
  return true;
}

async function testApplySpillNoSpillOntoSaturatedAccount(): Promise<boolean> {
  const { applySpill } = await import("../src/lib/proxy/accountRanking.js");
  const { first, busy, saturated, inflightByKey, metricsByKey } =
    buildSaturatedSpillFixture();
  const result = applySpill({
    orderedAccounts: [first, busy, saturated],
    inflightByKey,
    metricsByKey,
    spillInflight: 5,
  });
  if (result.spill !== null || result.orderedAccounts[0]?.key !== first.key) {
    log(
      "expected no spill when the only account under the threshold is saturated",
      "red",
    );
    return false;
  }
  return true;
}

// When affinity applies and prefer-primary is also on, and the
// configured primary is itself eligible and distinct from the bound
// account, the primary goes second — [bound, primary, ...rest] — not just
// [bound, ...rest] with the primary left wherever the base order put it.
async function testApplyAffinityAndPreferPrimaryOrdersPrimarySecond(): Promise<boolean> {
  const { applyAffinityAndPrimary } =
    await import("../src/lib/proxy/accountRanking.js");
  const bound: ProxyPassthroughAccount = {
    key: "anthropic:bound",
    label: "bound",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const primary: ProxyPassthroughAccount = {
    key: "anthropic:primary",
    label: "primary",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const other: ProxyPassthroughAccount = {
    key: "anthropic:other",
    label: "other",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const metricsByKey = new Map([
    [bound.key, makeSortMetrics({})],
    [primary.key, makeSortMetrics({})],
    [other.key, makeSortMetrics({})],
  ]);
  const result = applyAffinityAndPrimary({
    orderedAccounts: [other, primary, bound],
    metricsByKey,
    affinityKey: bound.key,
    primaryKey: primary.key,
    preferPrimary: true,
  });
  const orderedKeys = result.orderedAccounts.map((a) => a.key);
  if (
    result.reason !== "session_affinity" ||
    result.affinitySkippedReason !== null ||
    orderedKeys.join(",") !== [bound.key, primary.key, other.key].join(",")
  ) {
    log(
      "expected bound then primary then the rest when affinity and prefer-primary are both active",
      "red",
    );
    return false;
  }
  return true;
}

async function testRankAccountsIsDeterministicAndTransitive(): Promise<boolean> {
  // Fixed seed (mulberry32) so failures reproduce without quoting inputs.
  let seed = 0x2f6e2b1;
  const rand = (): number => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (const ranking of ["expiry-first", "headroom-first"] as const) {
    for (let trial = 0; trial < 20; trial += 1) {
      const accounts: ProxyPassthroughAccount[] = Array.from(
        { length: 6 },
        (_, i) => ({
          key: `anthropic:acct-${i}`,
          label: `acct-${i}`,
          type: "oauth",
        }),
      ) as ProxyPassthroughAccount[];
      const metricsByKey = new Map(
        accounts.map((a, i) => [
          a.key,
          makeSortMetrics({
            usable: rand() > 0.1,
            saturated: rand() > 0.7,
            scopedSaturated: rand() > 0.85,
            sessionUsed: rand(),
            weeklyUsed: rand(),
            weeklyReset: Math.floor(rand() * 1_000_000),
            // Every account gets a distinct, non-zero coolingUntil (index-
            // bucketed so no two accounts can ever collide) rather than
            // "0 most of the time": compareExpiryFirst/compareHeadroomFirst
            // both early-return a tie when two unusable accounts share
            // coolingUntil 0, and a stable sort then preserves input order —
            // which the shuffle below is specifically designed to detect as
            // a (false) transitivity failure. Distinct values remove the
            // construction-level tie without weakening the assertion.
            coolingUntil: Math.floor(rand() * 1_000_000) + i * 1_000_001 + 1,
          }),
        ]),
      );
      const first = rankAccounts({
        accounts,
        metricsByKey,
        primaryKey: undefined,
        ranking,
      });
      const shuffled = [...accounts].sort(() => rand() - 0.5);
      const second = rankAccounts({
        accounts: shuffled,
        metricsByKey,
        primaryKey: undefined,
        ranking,
      });
      const firstKeys = first.orderedAccounts.map((a) => a.key).join(",");
      const secondKeys = second.orderedAccounts.map((a) => a.key).join(",");
      if (firstKeys !== secondKeys) {
        log(`${ranking} order depends on input order at trial ${trial}`, "red");
        return false;
      }
    }
  }
  return true;
}

/**
 * `buildQuotaRoutingDecision`'s policy argument threads through to
 * `rankAccounts` via `orderAccountsByQuotaWithMetrics`, and the resulting
 * `reason` overrides `buildRoutingDecision`'s own comparator-derived
 * `selectionReason` (rather than being silently discarded).
 */
async function testBuildQuotaRoutingDecisionUsesPolicySelectionReason(): Promise<boolean> {
  const { __testHooks } =
    await import("../src/lib/server/routes/claudeProxyRoutes.js");
  __testHooks.resetAllRuntimeState();
  const now = Date.now();
  const accounts: ProxyPassthroughAccount[] = [
    { key: "anthropic:a", label: "a", type: "oauth" },
    { key: "anthropic:b", label: "b", type: "oauth" },
  ] as ProxyPassthroughAccount[];
  for (const account of accounts) {
    __testHooks.setAccountRuntimeState(account.key, {
      quota: makeQuota({}),
    });
  }
  const decision = __testHooks.buildQuotaRoutingDecision(
    accounts,
    now,
    undefined,
    0.97,
    5 * 60 * 1000,
    { policy: { affinityKey: "anthropic:b" } },
  );
  __testHooks.resetAllRuntimeState();
  if (decision?.selectionReason !== "session_affinity") {
    log(
      `expected selectionReason to be overridden by the policy reason, got ${decision?.selectionReason}`,
      "red",
    );
    return false;
  }
  return true;
}

// Table-driven coverage of every comparator rung, for both rankings.
// Each row's two metrics sets differ at exactly one rung; on failure the
// assertion names the comparator and the rung only — sign and reason are
// enums/numbers, never the raw metrics payload, per the "keep payloads out
// of assertion messages" rule (a message that echoes provider-error-shaped
// text can be misread by isExpectedProviderError() as an expected skip).
type ComparatorRungCase = {
  comparator: "compareExpiryFirst" | "compareHeadroomFirst";
  rung: string;
  metricsA: Partial<ProxyAccountSortMetrics>;
  metricsB: Partial<ProxyAccountSortMetrics>;
  primaryKey?: string;
  expectedSign: "negative" | "positive" | "zero";
  expectedReason: ProxyAccountRoutingReason;
};

function buildComparatorRungCases(): ComparatorRungCase[] {
  return [
    // --- shared early rungs, exercised once per comparator ---
    {
      comparator: "compareExpiryFirst",
      rung: "availability",
      metricsA: { usable: true },
      metricsB: { usable: false, coolingUntil: 1000 },
      expectedSign: "negative",
      expectedReason: "availability",
    },
    {
      comparator: "compareExpiryFirst",
      rung: "cooldown_recovery",
      metricsA: { usable: false, coolingUntil: 1000 },
      metricsB: { usable: false, coolingUntil: 5000 },
      expectedSign: "negative",
      expectedReason: "cooldown_recovery",
    },
    {
      comparator: "compareExpiryFirst",
      rung: "quota_evidence",
      metricsA: { quotaEvidenceRank: 0 },
      metricsB: { quotaEvidenceRank: 2 },
      expectedSign: "negative",
      expectedReason: "quota_evidence",
    },
    {
      comparator: "compareExpiryFirst",
      rung: "session_headroom",
      metricsA: { saturated: false },
      metricsB: { saturated: true },
      expectedSign: "negative",
      expectedReason: "session_headroom",
    },
    {
      comparator: "compareExpiryFirst",
      rung: "scoped_headroom",
      metricsA: { scopedSaturated: false },
      metricsB: { scopedSaturated: true },
      expectedSign: "negative",
      expectedReason: "scoped_headroom",
    },
    // --- compareExpiryFirst: weekly_reset / session_reset, both swap orders ---
    {
      comparator: "compareExpiryFirst",
      rung: "weekly_reset (neither saturated)",
      metricsA: { weeklyReset: 1000 },
      metricsB: { weeklyReset: 5000 },
      expectedSign: "negative",
      expectedReason: "weekly_reset",
    },
    {
      comparator: "compareExpiryFirst",
      rung: "session_reset (neither saturated)",
      metricsA: { weeklyReset: 5000, sessionResetBucket: 1 },
      metricsB: { weeklyReset: 5000, sessionResetBucket: 9 },
      expectedSign: "negative",
      expectedReason: "session_reset",
    },
    {
      comparator: "compareExpiryFirst",
      rung: "session_reset (both saturated)",
      metricsA: {
        saturated: true,
        sessionUsed: 0.99,
        sessionResetBucket: 1,
        weeklyReset: 5000,
      },
      metricsB: {
        saturated: true,
        sessionUsed: 0.99,
        sessionResetBucket: 9,
        weeklyReset: 5000,
      },
      expectedSign: "negative",
      expectedReason: "session_reset",
    },
    {
      comparator: "compareExpiryFirst",
      rung: "weekly_reset (both saturated)",
      metricsA: {
        saturated: true,
        sessionUsed: 0.99,
        sessionResetBucket: 5,
        weeklyReset: 1000,
      },
      metricsB: {
        saturated: true,
        sessionUsed: 0.99,
        sessionResetBucket: 5,
        weeklyReset: 9000,
      },
      expectedSign: "negative",
      expectedReason: "weekly_reset",
    },
    {
      comparator: "compareExpiryFirst",
      rung: "scoped_utilization",
      metricsA: { scopedUsed: 0.5, scopedUsedForSort: 0.5 },
      metricsB: { scopedUsed: 0.5, scopedUsedForSort: 0.9 },
      expectedSign: "positive",
      expectedReason: "scoped_utilization",
    },
    {
      comparator: "compareExpiryFirst",
      rung: "weekly_utilization",
      metricsA: { weeklyUsedForSort: 0.2 },
      metricsB: { weeklyUsedForSort: 0.7 },
      expectedSign: "positive",
      expectedReason: "weekly_utilization",
    },
    {
      comparator: "compareExpiryFirst",
      rung: "configured_primary",
      metricsA: {},
      metricsB: {},
      primaryKey: "anthropic:a",
      expectedSign: "negative",
      expectedReason: "configured_primary",
    },
    {
      comparator: "compareExpiryFirst",
      rung: "insertion_order",
      metricsA: {},
      metricsB: {},
      expectedSign: "zero",
      expectedReason: "insertion_order",
    },
    // --- compareHeadroomFirst: shared early rungs again, then its own tail ---
    {
      comparator: "compareHeadroomFirst",
      rung: "availability",
      metricsA: { usable: true },
      metricsB: { usable: false, coolingUntil: 1000 },
      expectedSign: "negative",
      expectedReason: "availability",
    },
    {
      comparator: "compareHeadroomFirst",
      rung: "cooldown_recovery",
      metricsA: { usable: false, coolingUntil: 1000 },
      metricsB: { usable: false, coolingUntil: 5000 },
      expectedSign: "negative",
      expectedReason: "cooldown_recovery",
    },
    {
      comparator: "compareHeadroomFirst",
      rung: "quota_evidence",
      metricsA: { quotaEvidenceRank: 0 },
      metricsB: { quotaEvidenceRank: 2 },
      expectedSign: "negative",
      expectedReason: "quota_evidence",
    },
    {
      comparator: "compareHeadroomFirst",
      rung: "session_headroom",
      metricsA: { saturated: false },
      metricsB: { saturated: true },
      expectedSign: "negative",
      expectedReason: "session_headroom",
    },
    {
      comparator: "compareHeadroomFirst",
      rung: "scoped_headroom",
      metricsA: { scopedSaturated: false },
      metricsB: { scopedSaturated: true },
      expectedSign: "negative",
      expectedReason: "scoped_headroom",
    },
    {
      comparator: "compareHeadroomFirst",
      rung: "headroom (known vs known)",
      metricsA: { sessionUsed: 0.2, weeklyUsed: 0.2 },
      metricsB: { sessionUsed: 0.5, weeklyUsed: 0.5 },
      expectedSign: "negative",
      expectedReason: "headroom",
    },
    {
      comparator: "compareHeadroomFirst",
      rung: "headroom (known vs null)",
      metricsA: { sessionUsed: 0.5, weeklyUsed: 0.5 },
      metricsB: { sessionUsed: null, weeklyUsed: null },
      expectedSign: "negative",
      expectedReason: "headroom",
    },
    {
      comparator: "compareHeadroomFirst",
      rung: "headroom (null vs null falls through to weekly_reset)",
      metricsA: { sessionUsed: null, weeklyUsed: null, weeklyReset: 1000 },
      metricsB: { sessionUsed: null, weeklyUsed: null, weeklyReset: 9000 },
      expectedSign: "negative",
      expectedReason: "weekly_reset",
    },
    {
      comparator: "compareHeadroomFirst",
      rung: "weekly_reset",
      metricsA: { sessionUsed: 0.3, weeklyUsed: 0.3, weeklyReset: 2000 },
      metricsB: { sessionUsed: 0.3, weeklyUsed: 0.3, weeklyReset: 8000 },
      expectedSign: "negative",
      expectedReason: "weekly_reset",
    },
    {
      comparator: "compareHeadroomFirst",
      rung: "configured_primary",
      metricsA: {},
      metricsB: {},
      primaryKey: "anthropic:a",
      expectedSign: "negative",
      expectedReason: "configured_primary",
    },
    {
      comparator: "compareHeadroomFirst",
      rung: "insertion_order",
      metricsA: {},
      metricsB: {},
      expectedSign: "zero",
      expectedReason: "insertion_order",
    },
  ];
}

async function testComparatorRungTableCoversEveryBranch(): Promise<boolean> {
  const a: ProxyPassthroughAccount = {
    key: "anthropic:a",
    label: "a",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const b: ProxyPassthroughAccount = {
    key: "anthropic:b",
    label: "b",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const signOf = (n: number): "negative" | "positive" | "zero" =>
    n < 0 ? "negative" : n > 0 ? "positive" : "zero";

  let allOk = true;
  for (const testCase of buildComparatorRungCases()) {
    const metricsByKey = new Map([
      [a.key, makeSortMetrics(testCase.metricsA)],
      [b.key, makeSortMetrics(testCase.metricsB)],
    ]);
    const compare =
      testCase.comparator === "compareExpiryFirst"
        ? compareExpiryFirst
        : compareHeadroomFirst;
    const [sign, reason] = compare(a, b, metricsByKey, testCase.primaryKey);
    const actualSign = signOf(sign);
    if (
      actualSign !== testCase.expectedSign ||
      reason !== testCase.expectedReason
    ) {
      log(
        `${testCase.comparator} rung=${testCase.rung} — expected sign=${testCase.expectedSign} reason=${testCase.expectedReason}, got sign=${actualSign} reason=${reason}`,
        "red",
      );
      allOk = false;
    }
  }
  return allOk;
}

// ============================================================================
// Tests: account admission counts in-flight leases on unlimited accounts
// ============================================================================

async function testUnlimitedAccountInflightCounting(): Promise<boolean> {
  const { __testHooks } =
    await import("../src/lib/server/routes/claudeProxyRoutes.js");
  __testHooks.resetAllRuntimeState();
  const before = __testHooks.getAccountInflight("anthropic:unlimited-test");
  if (before !== 0) {
    log(`expected 0 in-flight before any lease, got ${before}`, "red");
    return false;
  }
  const lease = __testHooks.tryAcquireAccountAdmission(
    "anthropic:unlimited-test",
    undefined,
  );
  if (!lease) {
    log("expected an unlimited-capacity lease to be granted", "red");
    return false;
  }
  const during = __testHooks.getAccountInflight("anthropic:unlimited-test");
  if (during !== 1) {
    log(`expected 1 in-flight while lease is held, got ${during}`, "red");
    __testHooks.resetAllRuntimeState();
    return false;
  }
  lease.release();
  const after = __testHooks.getAccountInflight("anthropic:unlimited-test");
  if (after !== 0) {
    log(`expected 0 in-flight after release, got ${after}`, "red");
    __testHooks.resetAllRuntimeState();
    return false;
  }
  // Needs two leases: with only one, a second release that skipped the
  // idempotency guard would also land on 0, because the decrement floors there.
  const first = __testHooks.tryAcquireAccountAdmission(
    "anthropic:unlimited-test",
    undefined,
  );
  const second = __testHooks.tryAcquireAccountAdmission(
    "anthropic:unlimited-test",
    undefined,
  );
  first?.release();
  first?.release();
  const afterDoubleRelease = __testHooks.getAccountInflight(
    "anthropic:unlimited-test",
  );
  second?.release();
  __testHooks.resetAllRuntimeState();
  if (!first || !second) {
    log("expected both unlimited-capacity leases to be granted", "red");
    return false;
  }
  if (afterDoubleRelease !== 1) {
    log(
      `expected 1 in-flight after releasing one of two leases twice, got ${afterDoubleRelease}`,
      "red",
    );
    return false;
  }
  return true;
}

// Each request reads the cap from the config snapshot it arrived with, so an
// uncapped acquire proves the cap was removed only when its snapshot is newer
// than the one a waiter queued under. Uncapped arrivals count toward `active`,
// so a waiter still holding that removed cap would never drain and would fail
// at its queue timeout.
async function testUncappedAcquireAdmitsWaitersOfRemovedCap(): Promise<boolean> {
  const { __testHooks } =
    await import("../src/lib/server/routes/claudeProxyRoutes.js");
  __testHooks.resetAllRuntimeState();
  const accountKey = "anthropic:cap-removed@example.test";
  const cappedGeneration = 1;
  const uncappedGeneration = 2;
  const held = [
    __testHooks.tryAcquireAccountAdmission(accountKey, 2, cappedGeneration),
    __testHooks.tryAcquireAccountAdmission(accountKey, 2, cappedGeneration),
  ];
  const waiters = [
    __testHooks.enqueueAccountAdmission(accountKey, 2, cappedGeneration),
    __testHooks.enqueueAccountAdmission(accountKey, 2, cappedGeneration),
  ];
  const queued = __testHooks.getAccountAdmissionSnapshot(accountKey);
  const admissionOrder: number[] = [];
  const admitted = Promise.all(
    waiters.map((waiter, index) =>
      waiter.promise.then(() => {
        admissionOrder.push(index);
      }),
    ),
  ).then(() => "admitted" as const);
  const uncapped = __testHooks.tryAcquireAccountAdmission(
    accountKey,
    undefined,
    uncappedGeneration,
  );
  let timer: ReturnType<typeof setTimeout> | undefined;
  // Far below the queue timeout: admission is synchronous, so anything still
  // pending after this is waiting for a slot that will never come.
  const outcome = await Promise.race([
    admitted,
    new Promise<"pending">((resolve) => {
      timer = setTimeout(() => resolve("pending"), 1_000);
    }),
  ]);
  clearTimeout(timer);
  const after = __testHooks.getAccountAdmissionSnapshot(accountKey);
  waiters.forEach((waiter) => waiter.cancel());
  uncapped?.release();
  held.forEach((lease) => lease?.release());
  __testHooks.resetAllRuntimeState();

  if (held.some((lease) => !lease) || queued.active !== 2) {
    log("setup: expected both capped leases to be granted", "red");
    return false;
  }
  if (queued.waiting !== 2) {
    log(`setup: expected 2 queued waiters, got ${queued.waiting}`, "red");
    return false;
  }
  if (!uncapped) {
    log("expected the uncapped acquire to be granted", "red");
    return false;
  }
  if (outcome !== "admitted") {
    log(
      "queued waiters were not admitted after the cap was removed; they would wait out the queue timeout",
      "red",
    );
    return false;
  }
  if (admissionOrder.join(",") !== "0,1") {
    log("queued waiters were admitted out of FIFO order", "red");
    return false;
  }
  if (after.active !== 5 || after.waiting !== 0) {
    log(
      `expected active=5 waiting=0 (2 held + 2 waiters + 1 uncapped), got active=${after.active} waiting=${after.waiting}`,
      "red",
    );
    return false;
  }
  return true;
}

// The mirror case: a request whose snapshot predates a reload that ADDED the
// cap reaches admission late (a long queue wait, retries or failover) still
// reading "uncapped". The waiters' cap is then the current one, so the stale
// request may admit itself but must not release them. A request from their own
// generation must not release them either, nor may one with no generation at
// all, which only direct callers such as these hooks make: the route passes 0
// from its fallback snapshot when no runtime config store is attached.
async function testStaleUncappedAcquireKeepsWaitersOfAddedCap(): Promise<boolean> {
  const { __testHooks } =
    await import("../src/lib/server/routes/claudeProxyRoutes.js");
  __testHooks.resetAllRuntimeState();
  const accountKey = "anthropic:cap-added@example.test";
  const uncappedGeneration = 1;
  const cappedGeneration = 2;
  const held = [
    __testHooks.tryAcquireAccountAdmission(accountKey, 2, cappedGeneration),
    __testHooks.tryAcquireAccountAdmission(accountKey, 2, cappedGeneration),
  ];
  const waiters = Array.from({ length: 10 }, () =>
    __testHooks.enqueueAccountAdmission(accountKey, 2, cappedGeneration),
  );
  let admittedCount = 0;
  waiters.forEach((waiter) => {
    void waiter.promise.then(() => {
      admittedCount += 1;
    });
  });
  const queued = __testHooks.getAccountAdmissionSnapshot(accountKey);
  const stale = __testHooks.tryAcquireAccountAdmission(
    accountKey,
    undefined,
    uncappedGeneration,
  );
  const afterStale = __testHooks.getAccountAdmissionSnapshot(accountKey);
  const sameGeneration = __testHooks.tryAcquireAccountAdmission(
    accountKey,
    undefined,
    cappedGeneration,
  );
  const noGeneration = __testHooks.tryAcquireAccountAdmission(
    accountKey,
    undefined,
  );
  // Admission resolves synchronously; the wait only lets any resolution that
  // did happen reach the `then` counters above.
  await new Promise((resolve) => setTimeout(resolve, 100));
  const after = __testHooks.getAccountAdmissionSnapshot(accountKey);
  waiters.forEach((waiter) => waiter.cancel());
  [stale, sameGeneration, noGeneration, ...held].forEach((lease) =>
    lease?.release(),
  );
  __testHooks.resetAllRuntimeState();

  if (held.some((lease) => !lease) || queued.active !== 2) {
    log("setup: expected both capped leases to be granted", "red");
    return false;
  }
  if (queued.waiting !== 10) {
    log(`setup: expected 10 queued waiters, got ${queued.waiting}`, "red");
    return false;
  }
  if (!stale || !sameGeneration || !noGeneration) {
    log("expected every uncapped acquire to be granted", "red");
    return false;
  }
  if (afterStale.active !== 3 || afterStale.waiting !== 10) {
    log(
      `stale uncapped acquire: expected active=3 waiting=10 (2 held + itself), got active=${afterStale.active} waiting=${afterStale.waiting}`,
      "red",
    );
    return false;
  }
  if (after.active !== 5 || after.waiting !== 10 || admittedCount !== 0) {
    log(
      `same- and no-generation acquires: expected active=5 waiting=10 admitted=0, got active=${after.active} waiting=${after.waiting} admitted=${admittedCount}`,
      "red",
    );
    return false;
  }
  return true;
}

// Queued requests from different snapshots interleave, so an older-generation
// waiter can sit behind a newer one. The uncapped acquire must reach past the
// newer waiter rather than stop at it, or the older one never drains.
async function testUncappedAcquireAdmitsOlderWaitersBehindNewerOnes(): Promise<boolean> {
  const { __testHooks } =
    await import("../src/lib/server/routes/claudeProxyRoutes.js");
  __testHooks.resetAllRuntimeState();
  const accountKey = "anthropic:cap-mixed@example.test";
  const held = [
    __testHooks.tryAcquireAccountAdmission(accountKey, 2, 1),
    __testHooks.tryAcquireAccountAdmission(accountKey, 2, 1),
  ];
  const waiterGenerations = [1, 2, 1];
  const waiters = waiterGenerations.map((generation) =>
    __testHooks.enqueueAccountAdmission(accountKey, 2, generation),
  );
  const admissionOrder: number[] = [];
  waiters.forEach((waiter, index) => {
    void waiter.promise.then(() => {
      admissionOrder.push(index);
    });
  });
  const queued = __testHooks.getAccountAdmissionSnapshot(accountKey);
  const uncapped = __testHooks.tryAcquireAccountAdmission(
    accountKey,
    undefined,
    2,
  );
  // Admission resolves synchronously; the wait only lets any resolution that
  // did happen reach the `then` recorders above.
  await new Promise((resolve) => setTimeout(resolve, 100));
  const after = __testHooks.getAccountAdmissionSnapshot(accountKey);
  waiters.forEach((waiter) => waiter.cancel());
  uncapped?.release();
  held.forEach((lease) => lease?.release());
  __testHooks.resetAllRuntimeState();

  if (held.some((lease) => !lease) || queued.active !== 2) {
    log("setup: expected both capped leases to be granted", "red");
    return false;
  }
  if (queued.waiting !== 3) {
    log(`setup: expected 3 queued waiters, got ${queued.waiting}`, "red");
    return false;
  }
  if (!uncapped) {
    log("expected the uncapped acquire to be granted", "red");
    return false;
  }
  if (admissionOrder.join(",") !== "0,2") {
    log(
      `expected only the generation-1 waiters #0 then #2 to be admitted, got [${admissionOrder.join(",")}]`,
      "red",
    );
    return false;
  }
  if (after.active !== 5 || after.waiting !== 1) {
    log(
      `expected active=5 waiting=1 (2 held + 2 older waiters + 1 uncapped; the generation-2 waiter stays queued), got active=${after.active} waiting=${after.waiting}`,
      "red",
    );
    return false;
  }
  return true;
}

// Ownership of the lease passes to the streaming response, so only the
// stream's terminal (end or client cancel) may release it — and exactly once.
async function testUnlimitedStreamLeaseReleasedOnTerminal(): Promise<boolean> {
  const { __testHooks } =
    await import("../src/lib/server/routes/claudeProxyRoutes.js");
  __testHooks.resetAllRuntimeState();
  const encoder = new TextEncoder();
  const messageStart = encoder.encode(
    'event: message_start\ndata: {"type":"message_start","message":{"usage":{"input_tokens":1,"output_tokens":0}}}\n\n',
  );
  const messageStop = encoder.encode(
    'event: message_stop\ndata: {"type":"message_stop"}\n\n',
  );

  const runCase = async (terminal: "end" | "cancel"): Promise<boolean> => {
    const accountKey = `anthropic:unlimited-stream-${terminal}@example.test`;
    let resolvePull: (() => void) | undefined;
    const upstream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(messageStart);
        if (terminal === "end") {
          controller.enqueue(messageStop);
          controller.close();
        }
      },
      pull() {
        return new Promise<void>((resolve) => {
          resolvePull = resolve;
        });
      },
      cancel() {
        resolvePull?.();
      },
    });
    const lease = __testHooks.tryAcquireAccountAdmission(accountKey, undefined);
    if (!lease) {
      log(`${terminal}: expected an unlimited-capacity lease`, "red");
      return false;
    }
    let terminalCalls = 0;
    const result = await __testHooks.handleAnthropicStreamingSuccessResponse({
      ctx: { metadata: {} } as never,
      body: {
        model: "claude-opus-4-8",
        messages: [],
        max_tokens: 16,
        stream: true,
      },
      account: {
        key: accountKey,
        label: `unlimited-stream-${terminal}@example.test`,
        token: "test-token",
        type: "oauth" as const,
      },
      accountState: {
        consecutiveRefreshFailures: 0,
        permanentlyDisabled: false,
      },
      response: new Response(upstream, {
        status: 200,
        headers: { "content-type": "text/event-stream" },
      }),
      responseHeaders: { "content-type": "text/event-stream" },
      requestStartTime: Date.now(),
      fetchStartMs: Date.now(),
      attemptNumber: 1,
      finalBodyStr: "{}",
      logAttempt: () => undefined,
      logProxyBody: () => undefined,
      logFinalRequest: () => undefined,
      onStreamTerminal: () => {
        terminalCalls += 1;
        lease.release();
      },
    });
    if (!("response" in result) || result.holdsAccountAdmission !== true) {
      log(`${terminal}: the stream did not take ownership of the lease`, "red");
      return false;
    }
    const body =
      result.response instanceof Response ? result.response.body : null;
    if (!body) {
      log(`${terminal}: expected a streaming response body`, "red");
      return false;
    }
    const whileOpen = __testHooks.getAccountInflight(accountKey);
    if (whileOpen !== 1) {
      log(
        `${terminal}: expected 1 in-flight while open, got ${whileOpen}`,
        "red",
      );
      return false;
    }
    const reader = body.getReader();
    if (terminal === "end") {
      while (!(await reader.read()).done) {
        // Drain to the natural end of the stream.
      }
    } else {
      await reader.read();
      await reader.cancel("client disconnected");
    }
    for (
      let turn = 0;
      turn < 50 && __testHooks.getAccountInflight(accountKey) > 0;
      turn++
    ) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    lease.release();
    const after = __testHooks.getAccountInflight(accountKey);
    if (
      after !== 0 ||
      terminalCalls !== 1 ||
      __testHooks.hasAccountAdmissionState(accountKey)
    ) {
      log(
        `${terminal}: expected release exactly once to 0 in-flight, got in-flight ${after} after ${terminalCalls} terminal call(s)`,
        "red",
      );
      return false;
    }
    return true;
  };

  try {
    const ended = await runCase("end");
    const cancelled = await runCase("cancel");
    return ended && cancelled;
  } finally {
    __testHooks.resetAllRuntimeState();
  }
}

// handleAnthropicStreamingSuccessResponse
// returns two terminal 502s in the same `{ response }` shape it uses for a
// genuine success, with no `retryNextAccount` discriminator — so a naive
// caller cannot tell "an account served this" from "this account served
// nothing, here is a synthesized 502". Session affinity must bind only on
// the former. This drives the three shapes directly and asserts the new
// `served` discriminant is set correctly on each.
async function testStreamingSuccessResponseServedDiscriminant(): Promise<boolean> {
  const { __testHooks } =
    await import("../src/lib/server/routes/claudeProxyRoutes.js");
  __testHooks.resetAllRuntimeState();

  const baseArgs = {
    ctx: { metadata: {} } as never,
    body: {
      model: "claude-opus-4-8",
      messages: [],
      max_tokens: 16,
      stream: true,
    },
    accountState: {
      consecutiveRefreshFailures: 0,
      permanentlyDisabled: false,
    },
    responseHeaders: { "content-type": "text/event-stream" },
    requestStartTime: Date.now(),
    fetchStartMs: Date.now(),
    attemptNumber: 1,
    finalBodyStr: "{}",
    logAttempt: () => undefined,
    logProxyBody: () => undefined,
    logFinalRequest: () => undefined,
  };
  const mkAccount = (label: string) => ({
    key: `anthropic:${label}`,
    label,
    token: "test-token",
    type: "oauth" as const,
  });

  try {
    // (a) Upstream sent no body at all — a synthesized 502, not a served response.
    const noBodyResult =
      await __testHooks.handleAnthropicStreamingSuccessResponse({
        ...baseArgs,
        account: mkAccount("served-flag-no-body@example.test"),
        response: new Response(null, {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        }),
      });
    if ("retryNextAccount" in noBodyResult) {
      log(
        "no-body case: expected a response/served result, got a retryable failure",
        "red",
      );
      return false;
    }
    if (noBodyResult.served !== false) {
      log(
        "no-body case: expected served=false for a synthesized 502 with no upstream body",
        "red",
      );
      return false;
    }

    // (b) The stream fails before its first chunk — also a synthesized terminal
    // error, not a served response.
    const transportErrorStream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.error(new Error("connection reset before first chunk"));
      },
    });
    const transportErrorResult =
      await __testHooks.handleAnthropicStreamingSuccessResponse({
        ...baseArgs,
        account: mkAccount("served-flag-transport-error@example.test"),
        response: new Response(transportErrorStream, {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        }),
      });
    if ("retryNextAccount" in transportErrorResult) {
      log(
        "stream-fails-before-first-chunk case: expected a response/served result, got a retryable failure",
        "red",
      );
      return false;
    }
    if (transportErrorResult.served !== false) {
      log(
        "stream-fails-before-first-chunk case: expected served=false for a terminal transport error before the first chunk",
        "red",
      );
      return false;
    }

    // (c) A normal stream that completes is a genuine served response.
    const encoder = new TextEncoder();
    const messageStart = encoder.encode(
      'event: message_start\ndata: {"type":"message_start","message":{"usage":{"input_tokens":1,"output_tokens":0}}}\n\n',
    );
    const messageStop = encoder.encode(
      'event: message_stop\ndata: {"type":"message_stop"}\n\n',
    );
    const okStream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(messageStart);
        controller.enqueue(messageStop);
        controller.close();
      },
    });
    const okResult = await __testHooks.handleAnthropicStreamingSuccessResponse({
      ...baseArgs,
      account: mkAccount("served-flag-ok@example.test"),
      response: new Response(okStream, {
        status: 200,
        headers: { "content-type": "text/event-stream" },
      }),
      onStreamTerminal: () => undefined,
    });
    if ("retryNextAccount" in okResult) {
      log(
        "normal stream case: expected a response/served result, got a retryable failure",
        "red",
      );
      return false;
    }
    if (okResult.served !== true) {
      log(
        "normal stream case: expected served=true for a genuine streaming success",
        "red",
      );
      return false;
    }
    const okBody =
      okResult.response instanceof Response ? okResult.response.body : null;
    if (okBody) {
      const reader = okBody.getReader();
      while (!(await reader.read()).done) {
        // Drain to the natural end of the stream so nothing is left dangling.
      }
    }

    return true;
  } finally {
    __testHooks.resetAllRuntimeState();
  }
}

// ============================================================================
// Tests: weekly-expiry-first ordering, soft limit, and reset freshening
// ============================================================================

async function testScopedQuotaRouting(): Promise<boolean | null> {
  const { __testHooks } =
    await import("../src/lib/server/routes/claudeProxyRoutes.js");
  __testHooks.resetAllRuntimeState();
  const now = TEST_NOW;
  const nowSec = Math.floor(now / 1000);

  type Acct = { key: string; label: string; token: string; type: "oauth" };
  const mk = (label: string): Acct => ({
    key: `anthropic:${label}`,
    label,
    token: "t",
    type: "oauth",
  });

  const baseQuota = (windows?: unknown[]) => ({
    sessionUsed: 0.1,
    sessionStatus: "allowed",
    sessionResetAt: nowSec + 3600,
    weeklyUsed: 0.1,
    weeklyStatus: "allowed",
    weeklyResetAt: nowSec + 5 * 24 * 3600,
    fallbackPercentage: 0,
    overageStatus: "rejected",
    lastUpdated: now,
    windows,
  });
  const scoped = (scopeModel: string, used: number, status = "allowed") => ({
    kind: "weekly_scoped",
    group: "weekly",
    used,
    status,
    resetsAt: nowSec + 4 * 24 * 3600,
    isActive: true,
    scopeModel,
  });
  const order = (accts: Acct[], model?: string): string =>
    __testHooks
      .orderAccountsByQuota(
        accts as never,
        now,
        undefined,
        undefined,
        undefined,
        model,
      )
      .map((x: { label: string }) => x.label)
      .join(",");

  const fail = (message: string): false => {
    log(message, "red");
    __testHooks.resetAllRuntimeState();
    return false;
  };

  // A scoped cap that is spent must exclude the account for THAT model only.
  const a = mk("a");
  const b = mk("b");
  __testHooks.setAccountRuntimeState(a.key, {
    quota: baseQuota([scoped("Fable", 1.0, "rejected")]) as never,
  });
  __testHooks.setAccountRuntimeState(b.key, { quota: baseQuota() as never });
  if (order([a, b], "claude-fable-5-20260115") !== "b,a") {
    return fail("scoped routing: exhausted scoped cap must sort last");
  }
  if (order([a, b], "claude-sonnet-4-5-20250929") !== "a,b") {
    return fail("scoped routing: other models must not be penalised");
  }
  // A scoped rejection must never park the whole account.
  if (__testHooks.getAccountRuntimeState(a.key)?.coolingUntil !== undefined) {
    return fail("scoped routing: scoped rejection must not set a cooldown");
  }

  // Unscoped traffic must behave exactly as before.
  __testHooks.resetAllRuntimeState();
  const c = mk("c");
  const d = mk("d");
  __testHooks.setAccountRuntimeState(c.key, {
    quota: { ...baseQuota(), weeklyResetAt: nowSec + 3 * 24 * 3600 } as never,
  });
  __testHooks.setAccountRuntimeState(d.key, {
    quota: { ...baseQuota(), weeklyResetAt: nowSec + 8 * 3600 } as never,
  });
  if (order([c, d]) !== "d,c" || order([c, d], "claude-sonnet-4-5") !== "d,c") {
    return fail("scoped routing: unscoped ordering must be unchanged");
  }

  // Fill-first inside the scoped allowance, and headroom demotion past the
  // soft limit.
  __testHooks.resetAllRuntimeState();
  const e = mk("e");
  const f = mk("f");
  __testHooks.setAccountRuntimeState(e.key, {
    quota: baseQuota([scoped("Fable", 0.2)]) as never,
  });
  __testHooks.setAccountRuntimeState(f.key, {
    quota: baseQuota([scoped("Fable", 0.8)]) as never,
  });
  if (order([e, f], "claude-fable-5-20260115") !== "f,e") {
    return fail("scoped routing: higher scoped utilization must go first");
  }
  __testHooks.setAccountRuntimeState(f.key, {
    quota: baseQuota([scoped("Fable", 0.99)]) as never,
  });
  __testHooks.setAccountRuntimeState(e.key, {
    quota: baseQuota([scoped("Fable", 0.5)]) as never,
  });
  if (order([e, f], "claude-fable-5-20260115") !== "e,f") {
    return fail("scoped routing: saturated scoped cap must be demoted");
  }

  // Match guards: a bare vendor scope matches nothing; versions do not leak.
  __testHooks.resetAllRuntimeState();
  const g = mk("g");
  const h = mk("h");
  __testHooks.setAccountRuntimeState(g.key, {
    quota: baseQuota([scoped("Claude", 1.0, "rejected")]) as never,
  });
  __testHooks.setAccountRuntimeState(h.key, { quota: baseQuota() as never });
  if (order([g, h], "claude-sonnet-4-5-20250929") !== "g,h") {
    return fail('scoped routing: bare "Claude" scope must not gate models');
  }
  __testHooks.setAccountRuntimeState(g.key, {
    quota: baseQuota([scoped("Claude Opus 4.6", 1.0, "rejected")]) as never,
  });
  if (order([g, h], "claude-opus-4-6-20260115") !== "h,g") {
    return fail("scoped routing: version-specific cap must gate its version");
  }
  if (order([g, h], "claude-opus-4-5-20250101") !== "g,h") {
    return fail("scoped routing: version cap must not leak to other versions");
  }

  // A stale snapshot must be ignored for scoped decisions too.
  __testHooks.resetAllRuntimeState();
  const i = mk("i");
  const j = mk("j");
  __testHooks.setAccountRuntimeState(i.key, {
    quota: {
      ...baseQuota([scoped("Fable", 1.0, "rejected")]),
      lastUpdated: now - 20 * 60 * 1000,
    } as never,
  });
  __testHooks.setAccountRuntimeState(j.key, { quota: baseQuota() as never });
  if (order([i, j], "claude-fable-5-20260115") !== "i,j") {
    return fail("scoped routing: stale scoped snapshot must be ignored");
  }

  __testHooks.resetAllRuntimeState();
  log(
    "scoped quota routing: exclusion + fill-first + guards + staleness passed",
    "green",
  );
  return true;
}

// ============================================================================
// Tests: organization entitlement rejections rotate instead of failing
// ============================================================================

/** The body Anthropic returns when an org has disabled Claude Code OAuth. */
const ENTITLEMENT_403_BODY = JSON.stringify({
  type: "error",
  error: {
    type: "permission_error",
    message:
      "OAuth authentication is currently not allowed for this organization.",
    details: { error_code: "oauth_not_allowed_for_organization" },
  },
});

async function testEntitlementDetectors(): Promise<boolean | null> {
  const { __testHooks } =
    await import("../src/lib/server/routes/claudeProxyRoutes.js");
  const { isAccountEntitlementError, isDurableEntitlementBlock } = __testHooks;

  const cases: Array<{
    what: string;
    status: number;
    body: string;
    rotate: boolean;
    persist: boolean;
  }> = [
    {
      what: "org-disabled 403",
      status: 403,
      body: ENTITLEMENT_403_BODY,
      rotate: true,
      persist: true,
    },
    {
      // Rotation is cheap and reversible, so an unrecognised permission_error
      // still rotates; persisting it would disable an account on a guess.
      what: "unknown permission_error",
      status: 403,
      body: JSON.stringify({
        type: "error",
        error: { type: "permission_error", message: "nope" },
      }),
      rotate: true,
      persist: false,
    },
    {
      what: "malformed request",
      status: 400,
      body: JSON.stringify({
        type: "error",
        error: { type: "invalid_request_error", message: "bad" },
      }),
      rotate: false,
      persist: false,
    },
    {
      what: "rate limit",
      status: 429,
      body: JSON.stringify({
        type: "error",
        error: { type: "rate_limit_error", message: "slow down" },
      }),
      rotate: false,
      persist: false,
    },
    {
      what: "non-JSON 403",
      status: 403,
      body: "<html>",
      rotate: false,
      persist: false,
    },
    {
      what: "404",
      status: 404,
      body: ENTITLEMENT_403_BODY,
      rotate: false,
      persist: false,
    },
  ];

  for (const c of cases) {
    if (isAccountEntitlementError(c.status, c.body) !== c.rotate) {
      log(`entitlement detector: wrong rotate verdict for ${c.what}`, "red");
      return false;
    }
    if (isDurableEntitlementBlock(c.status, c.body) !== c.persist) {
      log(`entitlement detector: wrong persist verdict for ${c.what}`, "red");
      return false;
    }
  }
  log(`entitlement detectors: ${cases.length} cases passed`, "green");
  return true;
}

async function testEntitlementRotation(): Promise<boolean | null> {
  const { __testHooks } =
    await import("../src/lib/server/routes/claudeProxyRoutes.js");
  __testHooks.resetAllRuntimeState();

  // A synthetic key so the shared token store is never asked to disable a real
  // account; markDisabled is a no-op for a provider it does not know.
  const account = {
    key: "anthropic:entitlement@test",
    label: "entitlement@test",
    token: "t",
    type: "oauth" as const,
    refreshToken: "r",
  };
  const noop = (): void => undefined;

  const result = await __testHooks.handleAnthropicNonOkResponse({
    response: new Response(ENTITLEMENT_403_BODY, {
      status: 403,
      headers: { "content-type": "application/json" },
    }),
    account: account as never,
    accountState: {
      consecutiveRefreshFailures: 0,
      permanentlyDisabled: false,
    } as never,
    enabledAccounts: [account] as never,
    orderedAccounts: [account] as never,
    requestStartTime: Date.now(),
    fetchStartMs: Date.now(),
    attemptNumber: 1,
    logAttempt: noop as never,
    logProxyBody: noop as never,
    logFinalRequest: noop as never,
    lastError: undefined,
    authFailureMessage: null,
    sawTransientFailure: false,
    invalidRequestFailure: null,
    entitlementFailure: null,
  });

  if (result.continueLoop !== true || result.response !== undefined) {
    return await failRoutingCase(
      "entitlement rotation: must rotate, not return a terminal response",
    );
  }
  if (result.invalidRequestFailure !== null) {
    // Setting it would suppress provider fallback and outrank a later 429.
    return await failRoutingCase(
      "entitlement rotation: must not record an invalid-request failure",
    );
  }
  if (result.authFailureMessage !== null) {
    return await failRoutingCase(
      "entitlement rotation: must not surface an auth failure",
    );
  }
  if (
    result.entitlementFailure?.accounts.length !== 1 ||
    result.entitlementFailure.errorCode !== "oauth_not_allowed_for_organization"
  ) {
    return await failRoutingCase(
      "entitlement rotation: entitlement failure not recorded",
    );
  }

  __testHooks.resetAllRuntimeState();
  log(
    "entitlement rotation: rotates and records without poisoning state",
    "green",
  );
  return true;
}

async function testEntitlementTerminalResponse(): Promise<boolean | null> {
  const { __testHooks } =
    await import("../src/lib/server/routes/claudeProxyRoutes.js");
  const noop = (): void => undefined;
  const result = __testHooks.buildClaudeAnthropicFailureResponse({
    tracer: undefined,
    requestStartTime: Date.now(),
    // An auth failure is present too: the entitlement diagnosis is the more
    // specific one and must win, or the user is told to re-login pointlessly.
    authFailureMessage: "re-authenticate please",
    authCooldownMessage: null,
    invalidRequestFailure: null,
    entitlementFailure: {
      status: 403,
      accounts: ["a@test", "b@test"],
      message:
        "OAuth authentication is currently not allowed for this organization.",
      errorCode: "oauth_not_allowed_for_organization",
    },
    scopedExhaustion: null,
    sawNetworkError: false,
    sawTransientFailure: false,
    sawRateLimit: false,
    lastError: undefined,
    fallbackFailureMessage: undefined,
    // The pool must be fully accounted for by the block: the rung deliberately
    // stands down when only some accounts were blocked, so the other accounts'
    // real failures are not masked behind a do-not-retry 403.
    orderedAccounts: [
      { key: "anthropic:a", label: "a@test", token: "t", type: "oauth" },
      { key: "anthropic:b", label: "b@test", token: "t", type: "oauth" },
    ] as never,
    buildLoggedClaudeError: ((
      status: number,
      message: string,
      errorType?: string,
    ) => ({ status, message, errorType })) as never,
    logProxyBody: noop as never,
    logFinalRequest: noop as never,
  }) as { status?: number; message?: string; errorType?: string };

  if (result.status !== 403 || result.errorType !== "permission_error") {
    log("entitlement terminal: expected a 403 permission_error", "red");
    return false;
  }
  if (
    !result.message?.includes("organization entitlement policy") ||
    !result.message.includes("neurolink auth enable")
  ) {
    log("entitlement terminal: message lacks the cause or the remedy", "red");
    return false;
  }
  log(
    "entitlement terminal: 403 outranks the auth rung and names the fix",
    "green",
  );
  return true;
}

// ============================================================================
// Tests: cooldowns cannot outlast what their reason can mean
// ============================================================================

async function testCooldownReasonCeilings(): Promise<boolean | null> {
  const { __testHooks } =
    await import("../src/lib/server/routes/claudeProxyRoutes.js");
  const now = TEST_NOW;
  const nowSec = Math.floor(now / 1000);

  // A 5-hour window reporting a reset 9 days out is not believable; without a
  // per-reason ceiling this parked accounts for days under reason "session".
  const sessionPlan = __testHooks.planCooldownFor429(
    makeQuota({
      sessionStatus: "rejected",
      sessionResetAt: nowSec + 9 * 24 * 3600,
    }) as never,
    0,
    now,
  );
  const sessionHours = (sessionPlan.coolingUntil - now) / 3600000;
  if (sessionPlan.reason !== "session" || sessionHours > 5.5) {
    log(
      `cooldown ceiling: session plan exceeded its window (${sessionHours.toFixed(1)}h)`,
      "red",
    );
    return false;
  }

  // A genuine weekly cooldown must survive intact.
  const weeklyPlan = __testHooks.planCooldownFor429(
    makeQuota({
      weeklyStatus: "rejected",
      weeklyResetAt: nowSec + 6 * 24 * 3600,
    }) as never,
    0,
    now,
  );
  const weeklyDays = (weeklyPlan.coolingUntil - now) / 86400000;
  if (weeklyPlan.reason !== "weekly" || weeklyDays < 5.9) {
    log(
      `cooldown ceiling: weekly plan was truncated (${weeklyDays.toFixed(1)}d)`,
      "red",
    );
    return false;
  }

  log("cooldown ceilings: session capped, weekly preserved", "green");
  return true;
}

async function testQuotaRefreshReleasesRecoveredCooldown(): Promise<
  boolean | null
> {
  const { __testHooks } =
    await import("../src/lib/server/routes/claudeProxyRoutes.js");
  const now = TEST_NOW;
  const nowSec = Math.floor(now / 1000);
  const state = {
    coolingUntil: now + 6 * 24 * 3600 * 1000,
    coolingReason: "weekly",
  } as never;

  const stillExhausted = __testHooks.reconcileCooldownFromQuota(
    state,
    makeQuota({
      weeklyStatus: "rejected",
      weeklyResetAt: nowSec + 6 * 24 * 3600,
      lastUpdated: now,
    }) as never,
    now,
  );
  if (
    stillExhausted !== null ||
    !(state as { coolingUntil?: number }).coolingUntil
  ) {
    log("quota refresh: rejected weekly window must remain cooling", "red");
    return false;
  }

  const recovered = __testHooks.reconcileCooldownFromQuota(
    state,
    makeQuota({
      weeklyStatus: "allowed",
      weeklyUsed: 0.05,
      weeklyResetAt: nowSec + 7 * 24 * 3600,
      lastUpdated: now + 1,
    }) as never,
    now + 1,
  );
  if (
    recovered?.kind !== "cleared" ||
    (state as { coolingUntil?: number }).coolingUntil !== undefined ||
    (state as { coolingReason?: string }).coolingReason !== undefined
  ) {
    log("quota refresh: allowed weekly window did not release cooldown", "red");
    return false;
  }

  const transientState = {
    coolingUntil: now + 30_000,
    coolingReason: "transient",
  } as never;
  const transientUpdate = __testHooks.reconcileCooldownFromQuota(
    transientState,
    makeQuota({
      weeklyStatus: "allowed",
      weeklyUsed: 0.05,
      lastUpdated: now + 2,
    }) as never,
    now + 2,
  );
  if (
    transientUpdate !== null ||
    (transientState as { coolingUntil?: number }).coolingUntil === undefined
  ) {
    log("quota refresh: must not clear an unrelated transient cooldown", "red");
    return false;
  }

  log(
    "quota refresh: fresh weekly recovery releases only its cooldown",
    "green",
  );
  return true;
}

async function testPersistedCooldownClamp(): Promise<boolean | null> {
  const { initAccountCooldown, loadAccountCooldowns } =
    await import("../src/lib/proxy/accountCooldown.js");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "neurolink-cooldown-"));
  const file = path.join(dir, "account-cooldowns.json");
  try {
    // Reproduces a real on-disk entry: a "session" cooldown running 206 hours,
    // written before per-reason ceilings existed. It must heal on load rather
    // than needing an operator to clear it.
    const updatedAt = TEST_NOW - 24 * 3600 * 1000;
    fs.writeFileSync(
      file,
      JSON.stringify({
        "anthropic:stuck": {
          coolingUntil: updatedAt + 206 * 3600 * 1000,
          reason: "session",
          updatedAt,
        },
        "anthropic:legit": {
          coolingUntil: updatedAt + 6 * 24 * 3600 * 1000,
          reason: "weekly",
          updatedAt,
        },
      }),
    );
    initAccountCooldown(file);
    const loaded = await loadAccountCooldowns();
    if (!loaded["anthropic:stuck"] || !loaded["anthropic:legit"]) {
      log("persisted cooldown clamp: an entry was dropped on load", "red");
      return false;
    }

    const stuckHours =
      (loaded["anthropic:stuck"].coolingUntil - updatedAt) / 3600000;
    if (stuckHours > 5.5) {
      log(
        `persisted cooldown clamp: session entry still spans ${stuckHours.toFixed(1)}h`,
        "red",
      );
      return false;
    }
    const legitDays =
      (loaded["anthropic:legit"].coolingUntil - updatedAt) / 86400000;
    if (legitDays < 5.9) {
      log(
        "persisted cooldown clamp: weekly entry must not be shortened",
        "red",
      );
      return false;
    }
    log(
      "persisted cooldown clamp: stale session entry healed on load",
      "green",
    );
    return true;
  } finally {
    // Leave the module pointed somewhere that still exists: initAccountCooldown
    // mutates module-level state, so a later cooldown write in this process
    // would otherwise target the directory removed below.
    initAccountCooldown(
      path.join(os.tmpdir(), "neurolink-cooldown-discard.json"),
    );
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// ============================================================================
// Tests: cleanup must not delete credentials that still work
// ============================================================================

async function testCleanupRetainsUsableCredentials(): Promise<boolean | null> {
  const { readFileSync } = await import("fs");
  const src = readFileSync(
    path.join(process.cwd(), "src/cli/commands/auth.ts"),
    "utf-8",
  );

  // `auth cleanup --force` hard-deletes disabled entries. The partition must be
  // expressed as "reasons that mean the credential is broken", so an operator's
  // free-text `auth disable --reason` is retained. Written as an allowlist of
  // recoverable reasons instead, any unlisted reason silently becomes a delete —
  // which destroyed a real credential during development.
  if (!src.includes("BROKEN_CREDENTIAL_DISABLE_REASONS")) {
    log("cleanup guard: expected the broken-credential reason set", "red");
    return false;
  }
  if (!src.includes("!BROKEN_CREDENTIAL_DISABLE_REASONS.has(reason)")) {
    log("cleanup guard: retention must be the negated membership test", "red");
    return false;
  }
  for (const reason of [
    "missing_refresh_token",
    "refresh_invalid",
    "refresh_failed",
  ]) {
    if (!src.includes(`"${reason}"`)) {
      log(`cleanup guard: deletable reason ${reason} is not enumerated`, "red");
      return false;
    }
  }
  log("cleanup guard: only broken credentials are deletable", "green");
  return true;
}

// ============================================================================
// Tests: model-scoped windows come from live response headers
// ============================================================================

/** The unified header family Anthropic returns on a Fable response. */
function fableResponseHeaders(nowSec: number): Record<string, string> {
  return {
    "anthropic-ratelimit-unified-5h-utilization": "0.2",
    "anthropic-ratelimit-unified-5h-status": "allowed",
    "anthropic-ratelimit-unified-5h-reset": String(nowSec + 3600),
    "anthropic-ratelimit-unified-7d-utilization": "0.3",
    "anthropic-ratelimit-unified-7d-status": "allowed",
    "anthropic-ratelimit-unified-7d-reset": String(nowSec + 5 * 24 * 3600),
    "anthropic-ratelimit-unified-7d_oi-utilization": "0.9",
    "anthropic-ratelimit-unified-7d_oi-status": "allowed",
    "anthropic-ratelimit-unified-7d_oi-reset": String(nowSec + 4 * 24 * 3600),
    "anthropic-ratelimit-unified-overage-status": "rejected",
    "anthropic-ratelimit-unified-overage-disabled-reason": "org_level_disabled",
    "anthropic-ratelimit-unified-representative-claim": "five_hour",
  };
}

async function testScopedQuotaHeaderParsing(): Promise<boolean | null> {
  const { parseQuotaHeaders, mergeQuotaSnapshot } =
    await import("../src/lib/proxy/accountQuota.js");
  const now = TEST_NOW;
  const nowSec = Math.floor(now / 1000);
  const headers = fableResponseHeaders(nowSec);

  const quota = parseQuotaHeaders(headers, {
    model: "claude-fable-5-20260115",
    now,
  });
  if (!quota) {
    log("scoped header parsing: expected a quota snapshot", "red");
    return false;
  }
  const scopedWindows = (quota.windows ?? []).filter(
    (w) => w.headerWindow === "7d_oi",
  );
  if (scopedWindows.length !== 1) {
    log("scoped header parsing: expected exactly one scoped window", "red");
    return false;
  }
  const [window] = scopedWindows;
  // Tagged by family, not the dated wire id, so a new snapshot date still matches.
  if (
    window.scopeModel !== "claude-fable-5" ||
    window.kind !== "weekly_scoped" ||
    window.source !== "headers" ||
    window.updatedAt !== now
  ) {
    log("scoped header parsing: window shape is wrong", "red");
    return false;
  }
  if (
    quota.overageDisabledReason !== "org_level_disabled" ||
    quota.representativeClaim !== "five_hour"
  ) {
    log("scoped header parsing: overage/claim fields were dropped", "red");
    return false;
  }
  // Anthropic sends no `unified-fallback` header, so this stays "unknown" and
  // the legacy back-compat branch of isQuotaOverageAvailable stays inert. Making
  // it reachable would stop cooling accounts that park correctly today.
  if (quota.fallbackStatus !== "unknown") {
    log("scoped header parsing: fallbackStatus default must not change", "red");
    return false;
  }
  // The header does not say which model it scopes, so an untagged capture must
  // not invent one.
  const untagged = parseQuotaHeaders(headers, { now });
  if (!untagged) {
    log("scoped header parsing: untagged headers must still parse", "red");
    return false;
  }
  if ((untagged.windows ?? []).length !== 0) {
    log("scoped header parsing: must not emit a window without a model", "red");
    return false;
  }
  // An Opus response carries no scoped family at all.
  const opusHeaders = { ...headers };
  delete opusHeaders["anthropic-ratelimit-unified-7d_oi-utilization"];
  delete opusHeaders["anthropic-ratelimit-unified-7d_oi-status"];
  delete opusHeaders["anthropic-ratelimit-unified-7d_oi-reset"];
  const opusQuota = parseQuotaHeaders(opusHeaders, {
    model: "claude-opus-5",
    now,
  });
  if (!opusQuota) {
    log("scoped header parsing: unscoped headers must still parse", "red");
    return false;
  }
  if ((opusQuota.windows ?? []).length !== 0) {
    log("scoped header parsing: unscoped response must yield no window", "red");
    return false;
  }

  // The merge is what keeps scoped routing alive: a later Opus response carries
  // no scoped window, and must not erase the Fable one.
  const merged = mergeQuotaSnapshot(quota, opusQuota);
  if (
    (merged.windows ?? []).filter((w) => w.headerWindow === "7d_oi").length !==
    1
  ) {
    log("scoped header parsing: merge dropped the scoped window", "red");
    return false;
  }

  // A new model snapshot describes the same cap, so it must update the existing
  // window rather than append one per release and grow the array forever.
  const laterSnapshot = parseQuotaHeaders(headers, {
    model: "claude-fable-5-20260320",
    now: now + 1000,
  });
  if (!laterSnapshot) {
    log("scoped header parsing: later snapshot must parse", "red");
    return false;
  }
  const afterUpgrade = mergeQuotaSnapshot(merged, laterSnapshot);
  const scopedAfter = (afterUpgrade.windows ?? []).filter(
    (w) => w.headerWindow === "7d_oi",
  );
  if (scopedAfter.length !== 1 || scopedAfter[0].updatedAt !== now + 1000) {
    log(
      "scoped header parsing: snapshot bump must replace, not accumulate",
      "red",
    );
    return false;
  }

  log("scoped header parsing: 7d_oi captured, tagged, and preserved", "green");
  return true;
}

async function testScopedExhaustionGate(): Promise<boolean | null> {
  const { __testHooks } =
    await import("../src/lib/server/routes/claudeProxyRoutes.js");
  __testHooks.resetAllRuntimeState();
  const now = TEST_NOW;
  const nowSec = Math.floor(now / 1000);
  const mk = (label: string) => ({
    key: `anthropic:${label}`,
    label,
    token: "t",
    type: "oauth" as const,
  });
  const quotaWith = (used: number, status: string, ageMs = 0) => ({
    ...makeQuota({ overageStatus: "rejected" }),
    lastUpdated: now - ageMs,
    windows: [
      {
        kind: "weekly_scoped",
        group: "weekly",
        used,
        status,
        resetsAt: nowSec + 3 * 24 * 3600,
        scopeModel: "claude-fable-5",
        source: "headers",
        updatedAt: now - ageMs,
      },
    ],
  });

  const spent = mk("spent");
  const fresh = mk("fresh");
  __testHooks.setAccountRuntimeState(spent.key, {
    quota: quotaWith(1, "rejected") as never,
  });
  __testHooks.setAccountRuntimeState(fresh.key, {
    quota: quotaWith(0.2, "allowed") as never,
  });

  // With headroom available elsewhere, the spent account is excluded outright —
  // ordering alone would still send the request there when it sorts first.
  const withHeadroom = __testHooks.evaluateScopedExhaustion(
    [spent, fresh] as never,
    "claude-fable-5-20260115",
    now,
  );
  if (
    withHeadroom.eligible.length !== 1 ||
    withHeadroom.eligible[0].label !== "fresh" ||
    withHeadroom.exhaustion !== null
  ) {
    return await failRoutingCase(
      "scoped gate: a spent account must be excluded when headroom exists",
    );
  }

  // Every account spent: report it rather than making a doomed upstream call.
  const allSpent = __testHooks.evaluateScopedExhaustion(
    [spent] as never,
    "claude-fable-5-20260115",
    now,
  );
  if (
    allSpent.eligible.length !== 0 ||
    allSpent.exhaustion?.scopeModel !== "claude-fable-5" ||
    allSpent.exhaustion.accounts.length !== 1
  ) {
    return await failRoutingCase(
      "scoped gate: full exhaustion must be reported",
    );
  }

  // Another model is unaffected — this is a per-model cap, not a cooldown.
  const otherModel = __testHooks.evaluateScopedExhaustion(
    [spent] as never,
    "claude-opus-5",
    now,
  );
  if (otherModel.eligible.length !== 1 || otherModel.exhaustion !== null) {
    return await failRoutingCase(
      "scoped gate: other models must stay eligible",
    );
  }

  // Stale evidence must never take the pool down.
  __testHooks.setAccountRuntimeState(spent.key, {
    quota: quotaWith(1, "rejected", 30 * 60 * 1000) as never,
  });
  const stale = __testHooks.evaluateScopedExhaustion(
    [spent] as never,
    "claude-fable-5-20260115",
    now,
  );
  if (stale.eligible.length !== 1 || stale.exhaustion !== null) {
    return await failRoutingCase(
      "scoped gate: a stale window must not exclude an account",
    );
  }

  // A scoped rejection is per-model, so it must never park the account.
  if (
    __testHooks.getAccountRuntimeState(spent.key)?.coolingUntil !== undefined
  ) {
    return await failRoutingCase(
      "scoped gate: scoped exhaustion must not set a cooldown",
    );
  }

  // A window persisted without `status` must not crash the gate. The quota file
  // is JSON.parse'd with no validation, and this runs before the account loop —
  // a throw here 502s every request until the file is deleted by hand.
  __testHooks.setAccountRuntimeState(spent.key, {
    quota: {
      ...makeQuota({}),
      lastUpdated: now,
      windows: [
        {
          kind: "weekly_scoped",
          scopeModel: "claude-fable-5",
          resetsAt: nowSec + 3600,
          updatedAt: now,
        },
      ],
    } as never,
  });
  const malformed = __testHooks.evaluateScopedExhaustion(
    [spent] as never,
    "claude-fable-5-20260115",
    now,
  );
  if (malformed.eligible.length !== 1) {
    return await failRoutingCase(
      "scoped gate: a window without a status must not exclude",
    );
  }

  __testHooks.resetAllRuntimeState();
  log("scoped gate: excludes, reports, and never empties the pool", "green");
  return true;
}

async function testScopedSortNeedsBothWindows(): Promise<boolean | null> {
  const { __testHooks } =
    await import("../src/lib/server/routes/claudeProxyRoutes.js");
  __testHooks.resetAllRuntimeState();
  const now = TEST_NOW;
  const nowSec = Math.floor(now / 1000);
  const mk = (label: string) => ({
    key: `anthropic:${label}`,
    label,
    token: "t",
    type: "oauth" as const,
  });

  // Only the account that has served a model gets that model's scoped window.
  // If the fill-first rung compared a real utilization against the "absent"
  // sentinel, the account holding a window would always win — funnelling every
  // request for that model onto whichever account happened to serve it first,
  // and inverting the weekly fill-first order.
  const scopedLight = mk("scopedlight");
  const unscopedHeavy = mk("unscopedheavy");
  __testHooks.setAccountRuntimeState(scopedLight.key, {
    quota: {
      ...makeQuota({ weeklyUsed: 0.05, weeklyResetAt: nowSec + 6 * 24 * 3600 }),
      lastUpdated: now,
      windows: [
        {
          kind: "weekly_scoped",
          group: "weekly",
          used: 0.1,
          status: "allowed",
          resetsAt: nowSec + 3 * 24 * 3600,
          scopeModel: "claude-fable-5",
          source: "headers",
          updatedAt: now,
        },
      ],
    } as never,
  });
  __testHooks.setAccountRuntimeState(unscopedHeavy.key, {
    quota: {
      ...makeQuota({ weeklyUsed: 0.95, weeklyResetAt: nowSec + 6 * 24 * 3600 }),
      lastUpdated: now,
    } as never,
  });

  const order = __testHooks
    .orderAccountsByQuota(
      [scopedLight, unscopedHeavy] as never,
      now,
      undefined,
      undefined,
      undefined,
      "claude-fable-5-20260115",
    )
    .map((x: { label: string }) => x.label)
    .join(",");
  if (order !== "unscopedheavy,scopedlight") {
    log(
      "scoped sort: a one-sided scoped window must not override weekly fill-first",
      "red",
    );
    __testHooks.resetAllRuntimeState();
    return false;
  }

  __testHooks.resetAllRuntimeState();
  log(
    "scoped sort: fill-first preserved when only one side is scoped",
    "green",
  );
  return true;
}

async function testApiKeyPermissionErrorKeepsItsDiagnosis(): Promise<
  boolean | null
> {
  const { __testHooks } =
    await import("../src/lib/server/routes/claudeProxyRoutes.js");
  __testHooks.resetAllRuntimeState();

  // Anthropic answers an under-privileged API key with permission_error too.
  // Routing that into the OAuth entitlement branch would tell the operator to
  // ask an admin to re-enable Claude Code OAuth — meaningless for an API key.
  const account = {
    key: "anthropic:env",
    label: "env",
    token: "sk-test",
    type: "api_key" as const,
  };
  const noop = (): void => undefined;
  const result = await __testHooks.handleAnthropicNonOkResponse({
    response: new Response(
      JSON.stringify({
        type: "error",
        error: {
          type: "permission_error",
          message: "Your API key does not have permission to use the resource.",
        },
      }),
      { status: 403, headers: { "content-type": "application/json" } },
    ),
    account: account as never,
    accountState: {
      consecutiveRefreshFailures: 0,
      permanentlyDisabled: false,
    } as never,
    enabledAccounts: [account] as never,
    orderedAccounts: [account] as never,
    requestStartTime: Date.now(),
    fetchStartMs: Date.now(),
    attemptNumber: 1,
    logAttempt: noop as never,
    logProxyBody: noop as never,
    logFinalRequest: noop as never,
    lastError: undefined,
    authFailureMessage: null,
    sawTransientFailure: false,
    invalidRequestFailure: null,
    entitlementFailure: null,
  });

  if (result.entitlementFailure !== null) {
    return await failRoutingCase(
      "api_key 403: must not be recorded as an entitlement block",
    );
  }
  if (!result.authFailureMessage) {
    return await failRoutingCase(
      "api_key 403: must keep its api-key authentication diagnosis",
    );
  }

  __testHooks.resetAllRuntimeState();
  log("api_key 403: keeps its own diagnosis", "green");
  return true;
}

async function testEntitlementNeedsWholePool(): Promise<boolean | null> {
  const { __testHooks } =
    await import("../src/lib/server/routes/claudeProxyRoutes.js");
  const noop = (): void => undefined;
  const build = (accountCount: number): { status?: number } =>
    __testHooks.buildClaudeAnthropicFailureResponse({
      tracer: undefined,
      requestStartTime: Date.now(),
      authFailureMessage: null,
      authCooldownMessage: null,
      invalidRequestFailure: null,
      entitlementFailure: {
        status: 403,
        accounts: ["a@test"],
        message: "not allowed for this organization",
        errorCode: "oauth_not_allowed_for_organization",
      },
      scopedExhaustion: null,
      sawNetworkError: true,
      sawTransientFailure: true,
      sawRateLimit: false,
      lastError: "connection reset",
      fallbackFailureMessage: undefined,
      orderedAccounts: Array.from({ length: accountCount }, (_, i) => ({
        key: `anthropic:a${i}`,
        label: `a${i}`,
        token: "t",
        type: "oauth" as const,
      })) as never,
      buildLoggedClaudeError: ((status: number) => ({ status })) as never,
      logProxyBody: noop as never,
      logFinalRequest: noop as never,
    }) as { status?: number };

  // One blocked account among many that failed for real reasons must not mask
  // them behind a 403 — a 403 tells the client not to retry, and retrying is
  // exactly right for a transport failure.
  if (build(4).status !== 502) {
    log(
      "entitlement scope: a partial block must not win over real failures",
      "red",
    );
    return false;
  }
  if (build(1).status !== 403) {
    log("entitlement scope: a fully blocked pool must report 403", "red");
    return false;
  }
  log("entitlement scope: 403 only when it explains the whole pool", "green");
  return true;
}

async function testQuotaMergePreservesProviderConfig(): Promise<
  boolean | null
> {
  const { mergeQuotaSnapshot } =
    await import("../src/lib/proxy/accountQuota.js");
  // Each source reports a different half of the extra-usage picture, so a plain
  // overwrite makes whether an exhausted account gets parked depend on which
  // source happened to write last.
  const fromUsageApi = {
    ...makeQuota({}),
    lastUpdated: TEST_NOW,
    source: "usage-api",
    overageEnabled: true,
  };
  const fromHeaders = {
    ...makeQuota({}),
    lastUpdated: TEST_NOW + 1000,
    source: "headers",
    overageDisabledReason: "org_level_disabled",
  };

  const afterHeaders = mergeQuotaSnapshot(
    fromUsageApi as never,
    fromHeaders as never,
  );
  if (afterHeaders.overageEnabled !== true) {
    log(
      "quota merge: usage-api extra-usage flag must survive a header capture",
      "red",
    );
    return false;
  }
  const afterRefresh = mergeQuotaSnapshot(afterHeaders, fromUsageApi as never);
  if (afterRefresh.overageDisabledReason !== "org_level_disabled") {
    log(
      "quota merge: header-only overage reason must survive a refresh",
      "red",
    );
    return false;
  }
  log("quota merge: provider configuration survives both directions", "green");
  return true;
}

async function testWeeklyExpiryOrdering(): Promise<boolean | null> {
  const { __testHooks } =
    await import("../src/lib/server/routes/claudeProxyRoutes.js");
  // Isolate the quota env knobs: earlier cases assume the defaults, and a
  // configured shell must neither fail them nor be mutated by this test.
  const savedSoftLimit = process.env.NEUROLINK_PROXY_SESSION_SOFT_LIMIT;
  const savedTolerance = process.env.NEUROLINK_PROXY_SESSION_RESET_TOLERANCE_MS;
  delete process.env.NEUROLINK_PROXY_SESSION_SOFT_LIMIT;
  delete process.env.NEUROLINK_PROXY_SESSION_RESET_TOLERANCE_MS;
  try {
    return await runWeeklyExpiryOrderingCases(__testHooks);
  } finally {
    if (savedSoftLimit !== undefined) {
      process.env.NEUROLINK_PROXY_SESSION_SOFT_LIMIT = savedSoftLimit;
    } else {
      delete process.env.NEUROLINK_PROXY_SESSION_SOFT_LIMIT;
    }
    if (savedTolerance !== undefined) {
      process.env.NEUROLINK_PROXY_SESSION_RESET_TOLERANCE_MS = savedTolerance;
    } else {
      delete process.env.NEUROLINK_PROXY_SESSION_RESET_TOLERANCE_MS;
    }
  }
}

async function runWeeklyExpiryOrderingCases(
  __testHooks: (typeof import("../src/lib/server/routes/claudeProxyRoutes.js"))["__testHooks"],
): Promise<boolean | null> {
  const now = 1_800_000_000_000;
  const nowSec = Math.floor(now / 1000);
  // Bucket-aligned base so same-bucket cases are deterministic regardless of
  // the tolerance value in effect (default 15 min = 900s).
  const bucketSec = 900;
  const baseSec = (Math.floor(nowSec / bucketSec) + 2) * bucketSec;

  type Acct = { key: string; label: string; token: string; type: "oauth" };
  const acct = (l: string): Acct => ({
    key: `anthropic:${l}`,
    label: l,
    token: "t",
    type: "oauth",
  });
  const order = (list: Acct[]): string =>
    __testHooks
      .orderAccountsByQuota(list as never, now, undefined)
      .map((x: { label: string }) => x.label)
      .join(",");
  const setQuota = (l: string, over: Record<string, number | string>): void =>
    __testHooks.setAccountRuntimeState(`anthropic:${l}`, {
      quota: makeQuota({ lastUpdated: now, ...over }) as never,
    });
  const fail = (msg: string): false => {
    log(msg, "red");
    __testHooks.resetAllRuntimeState();
    return false;
  };

  // 1. Weekly-expiry-first: x's session resets in 1h, y's in 3h, but y's
  //    overall weekly allowance expires far sooner and must be consumed first.
  __testHooks.resetAllRuntimeState();
  setQuota("x", {
    sessionResetAt: nowSec + 3600,
    weeklyResetAt: nowSec + 5 * 24 * 3600,
  });
  setQuota("y", {
    sessionResetAt: nowSec + 3 * 3600,
    weeklyResetAt: nowSec + 6 * 3600,
  });
  let got = order([acct("x"), acct("y")]);
  if (got !== "y,x") {
    return fail(`weekly-first: expected y,x (6h weekly wins), got ${got}`);
  }

  // 2. Same weekly reset -> the earlier session-reset bucket wins.
  __testHooks.resetAllRuntimeState();
  setQuota("x", {
    sessionResetAt: baseSec + 60,
    weeklyResetAt: nowSec + 5 * 24 * 3600,
  });
  setQuota("y", {
    sessionResetAt: baseSec + bucketSec + 60,
    weeklyResetAt: nowSec + 5 * 24 * 3600,
  });
  got = order([acct("y"), acct("x")]);
  if (got !== "x,y") {
    return fail(`same-weekly: expected x,y (session tie-break), got ${got}`);
  }

  // 3. Soft limit (default 0.97): a saturated session demotes below headroom
  //    even when its weekly allowance expires soonest.
  __testHooks.resetAllRuntimeState();
  setQuota("x", {
    sessionResetAt: nowSec + 3600,
    sessionUsed: 0.98,
    weeklyResetAt: nowSec + 6 * 3600,
  });
  setQuota("y", {
    sessionResetAt: nowSec + 3 * 3600,
    sessionUsed: 0.5,
    weeklyResetAt: nowSec + 5 * 24 * 3600,
  });
  got = order([acct("x"), acct("y")]);
  if (got !== "y,x") {
    return fail(`soft-limit: expected y,x (0.98 saturated), got ${got}`);
  }

  // 4. Just under the limit is NOT saturated, so weekly urgency wins.
  __testHooks.resetAllRuntimeState();
  setQuota("x", {
    sessionResetAt: nowSec + 3 * 3600,
    sessionUsed: 0.96,
    weeklyResetAt: nowSec + 6 * 3600,
  });
  setQuota("y", {
    sessionResetAt: nowSec + 3600,
    sessionUsed: 0.5,
    weeklyResetAt: nowSec + 5 * 24 * 3600,
  });
  got = order([acct("x"), acct("y")]);
  if (got !== "x,y") {
    return fail(`under-limit: expected x,y (0.96 has headroom), got ${got}`);
  }

  // 5. "throttled" status demotes regardless of utilization.
  __testHooks.resetAllRuntimeState();
  setQuota("x", { sessionResetAt: nowSec + 3600, sessionStatus: "throttled" });
  setQuota("y", { sessionResetAt: nowSec + 3 * 3600 });
  got = order([acct("x"), acct("y")]);
  if (got !== "y,x") {
    return fail(`throttled: expected y,x (throttled demoted), got ${got}`);
  }

  // 6. Reset freshening: a PASSED session reset means a fresh window — stale
  //    utilization must not saturate the account. Weekly urgency still wins
  //    among accounts with headroom, while a saturated account remains last.
  __testHooks.resetAllRuntimeState();
  setQuota("x", {
    sessionResetAt: nowSec - 60,
    sessionUsed: 0.99,
    weeklyResetAt: nowSec + 6 * 3600,
  });
  setQuota("y", {
    sessionResetAt: nowSec + 2 * 3600,
    sessionUsed: 0.5,
    weeklyResetAt: nowSec + 5 * 24 * 3600,
  });
  setQuota("z", {
    sessionResetAt: nowSec + 1800,
    sessionUsed: 0.99,
    weeklyResetAt: nowSec + 3600,
  });
  got = order([acct("x"), acct("y"), acct("z")]);
  if (got !== "x,y,z") {
    return fail(
      `freshening: expected x,y,z (urgent fresh session first, saturated last), got ${got}`,
    );
  }

  // 7. Both saturated, different buckets → soonest session reset first
  //    (returns to service first).
  __testHooks.resetAllRuntimeState();
  setQuota("x", { sessionResetAt: nowSec + 3600, sessionUsed: 0.99 });
  setQuota("y", { sessionResetAt: nowSec + 1800, sessionUsed: 0.99 });
  got = order([acct("x"), acct("y")]);
  if (got !== "y,x") {
    return fail(`both-saturated: expected y,x (soonest reset), got ${got}`);
  }

  // 8. Both saturated, SAME session bucket → weekly decides which urgent
  //    account should be resumed first.
  __testHooks.resetAllRuntimeState();
  setQuota("x", {
    sessionResetAt: baseSec + 60,
    sessionUsed: 0.99,
    weeklyResetAt: nowSec + 5 * 24 * 3600,
  });
  setQuota("y", {
    sessionResetAt: baseSec + 120,
    sessionUsed: 0.99,
    weeklyResetAt: nowSec + 6 * 3600,
  });
  got = order([acct("x"), acct("y")]);
  if (got !== "y,x") {
    return fail(
      `both-saturated-same-bucket: expected y,x (weekly tie-break), got ${got}`,
    );
  }

  // 9. Soft limit is configurable via env (outer finally restores it).
  __testHooks.resetAllRuntimeState();
  process.env.NEUROLINK_PROXY_SESSION_SOFT_LIMIT = "0.5";
  setQuota("x", { sessionResetAt: nowSec + 3600, sessionUsed: 0.6 });
  setQuota("y", { sessionResetAt: nowSec + 3 * 3600, sessionUsed: 0.1 });
  got = order([acct("x"), acct("y")]);
  delete process.env.NEUROLINK_PROXY_SESSION_SOFT_LIMIT;
  if (got !== "y,x") {
    return fail(`env-limit: expected y,x (0.6 >= 0.5 saturated), got ${got}`);
  }

  // 10. Regression for the observed three-account snapshot: sachin's weekly
  // allowance expires first and has substantial capacity left. Its stale 5h
  // reset has passed, so it is fresh and must outrank hello's newer weekly
  // window even though hello has an actively ticking 5h session.
  __testHooks.resetAllRuntimeState();
  setQuota("hello", {
    sessionUsed: 0.11,
    sessionResetAt: nowSec + 98 * 60,
    weeklyUsed: 0.51,
    weeklyResetAt: nowSec + 52 * 3600,
  });
  setQuota("sachiny", {
    sessionUsed: 0.44,
    sessionResetAt: nowSec - 112 * 60,
    weeklyUsed: 0.44,
    weeklyResetAt: nowSec + 132 * 3600,
  });
  setQuota("sachin", {
    sessionUsed: 0.97,
    sessionResetAt: nowSec - 172 * 60,
    weeklyUsed: 0.39,
    weeklyResetAt: nowSec + 12 * 3600,
  });
  got = order([acct("hello"), acct("sachiny"), acct("sachin")]);
  if (got !== "sachin,hello,sachiny") {
    return fail(
      `observed-snapshot: expected sachin,hello,sachiny (weekly expiry priority), got ${got}`,
    );
  }

  __testHooks.resetAllRuntimeState();
  log(
    "weeklyExpiryOrdering: 10 cases passed (weekly-first, session safety, bucket tie-break, freshening)",
    "green",
  );
  return true;
}

// ============================================================================
// Tests: quota persistence merges across restarts (no clobber)
// ============================================================================

async function testSaveAccountQuotaMerges(): Promise<boolean | null> {
  const { initAccountQuota, saveAccountQuota, loadAccountQuotas } =
    await import("../src/lib/proxy/accountQuota.js");

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nl-quota-test-"));
  const quotaPath = path.join(tmpDir, "account-quotas.json");
  try {
    // Simulate a pre-restart file holding account A's snapshot.
    const existing = makeQuota({ weeklyResetAt: 1_900_000_000 });
    fs.writeFileSync(quotaPath, JSON.stringify({ "a@test": existing }));

    // Fresh process state pointing at that file (initAccountQuota resets the
    // module cache, mimicking a restart), then the first save is for B.
    initAccountQuota(quotaPath);
    await saveAccountQuota("b@test", makeQuota({}) as never);

    const all = await loadAccountQuotas();
    if (!all["a@test"] || !all["b@test"]) {
      log(
        `saveAccountQuota: first save after restart must merge with disk, got keys=${Object.keys(all).join(",")}`,
        "red",
      );
      return false;
    }
    log(
      "saveAccountQuota: merges with persisted entries after restart",
      "green",
    );
    return true;
  } finally {
    // Point the module back at a throwaway path so the debounced flush from
    // this test can't touch the real ~/.neurolink file.
    initAccountQuota(path.join(tmpDir, "discard.json"));
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// ============================================================================
// Tests: runtime quota seeding from persisted snapshots at boot
// ============================================================================

async function testSeedRuntimeQuotasFromDisk(): Promise<boolean | null> {
  const { __testHooks } =
    await import("../src/lib/server/routes/claudeProxyRoutes.js");
  const { initAccountQuota } = await import("../src/lib/proxy/accountQuota.js");

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nl-seed-test-"));
  const quotaPath = path.join(tmpDir, "account-quotas.json");
  try {
    __testHooks.resetAllRuntimeState();
    const diskQuota = makeQuota({ weeklyResetAt: 1_900_000_000 });
    fs.writeFileSync(quotaPath, JSON.stringify({ "a@test": diskQuota }));
    initAccountQuota(quotaPath);

    type Acct = { key: string; label: string; token: string; type: "oauth" };
    const accts: Acct[] = [
      { key: "anthropic:a@test", label: "a@test", token: "t", type: "oauth" },
      { key: "anthropic:b@test", label: "b@test", token: "t", type: "oauth" },
    ];
    // b has fresher in-memory quota that seeding must NOT overwrite.
    const inMemory = makeQuota({ weeklyResetAt: 1_950_000_000 });
    __testHooks.setAccountRuntimeState("anthropic:b@test", {
      quota: inMemory as never,
    });

    await __testHooks.seedRuntimeQuotasFromDisk(accts as never);

    const stateA = __testHooks.getAccountRuntimeState("anthropic:a@test");
    const stateB = __testHooks.getAccountRuntimeState("anthropic:b@test");
    if (
      (stateA?.quota as { weeklyResetAt?: number } | undefined)
        ?.weeklyResetAt !== 1_900_000_000
    ) {
      log(
        `seedRuntimeQuotasFromDisk: account A should be seeded from disk, got ${JSON.stringify(stateA?.quota)}`,
        "red",
      );
      return false;
    }
    if (
      (stateB?.quota as { weeklyResetAt?: number } | undefined)
        ?.weeklyResetAt !== 1_950_000_000
    ) {
      log(
        "seedRuntimeQuotasFromDisk: fresher in-memory quota must not be overwritten",
        "red",
      );
      return false;
    }
    log(
      "seedRuntimeQuotasFromDisk: seeds from disk, preserves in-memory",
      "green",
    );
    return true;
  } finally {
    __testHooks.resetAllRuntimeState();
    initAccountQuota(path.join(tmpDir, "discard.json"));
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// ============================================================================
// Tests: parseRoutingConfig.primaryAccount field
// ============================================================================

async function testParseRoutingPrimaryAccount(): Promise<boolean | null> {
  const { parseRoutingConfig: _parseRoutingConfig } =
    (await import("../src/lib/proxy/proxyConfig.js")) as {
      parseRoutingConfig?: unknown;
    };

  // parseRoutingConfig is internal; skip if not exported
  if (typeof _parseRoutingConfig !== "function") {
    log(
      "parseRoutingConfig is not exported; verifying via loadProxyConfig instead",
      "yellow",
    );
    return await testParseRoutingPrimaryViaLoad();
  }
  const parseRoutingConfig = _parseRoutingConfig as (
    raw: Record<string, unknown> | undefined,
  ) => { primaryAccount?: string } | undefined;

  const cases: Array<{
    name: string;
    input: Record<string, unknown>;
    expected: string | undefined;
  }> = [
    {
      name: "camelCase",
      input: { primaryAccount: "user@example.com" },
      expected: "user@example.com",
    },
    {
      name: "kebab-case",
      input: { "primary-account": "user@example.com" },
      expected: "user@example.com",
    },
    {
      name: "trim",
      input: { primaryAccount: "  user@example.com  " },
      expected: "user@example.com",
    },
    {
      name: "empty string rejected",
      input: { primaryAccount: "" },
      expected: undefined,
    },
    {
      name: "non-string rejected",
      input: { primaryAccount: 42 },
      expected: undefined,
    },
    {
      name: "absent",
      input: {},
      expected: undefined,
    },
  ];

  for (const c of cases) {
    const result = parseRoutingConfig(c.input);
    if (result?.primaryAccount !== c.expected) {
      log(
        `parseRoutingConfig: ${c.name} failed: expected ${String(c.expected)}, got ${String(result?.primaryAccount)}`,
        "red",
      );
      return false;
    }
  }
  log(`parseRoutingConfig: ${cases.length} cases passed`, "green");
  return true;
}

/** Fallback when parseRoutingConfig isn't exported: write a config and run
 *  loadProxyConfig (always exported), checking the parsed result. Uses JSON
 *  config files so the test does not depend on js-yaml being installed. */
async function testParseRoutingPrimaryViaLoad(): Promise<boolean | null> {
  const { loadProxyConfig } = await import("../src/lib/proxy/proxyConfig.js");
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "proxy-prim-"));
  try {
    const kebabPath = path.join(tmpDir, "kebab.json");
    fs.writeFileSync(
      kebabPath,
      JSON.stringify({
        accounts: { anthropic: [] },
        routing: { "primary-account": "user@example.com" },
      }),
      "utf-8",
    );
    const cfg = (await loadProxyConfig(kebabPath)) as {
      routing?: { primaryAccount?: string };
    };
    if (cfg.routing?.primaryAccount !== "user@example.com") {
      log(
        `loadProxyConfig kebab: got ${String(cfg.routing?.primaryAccount)}`,
        "red",
      );
      return false;
    }

    const camelPath = path.join(tmpDir, "camel.json");
    fs.writeFileSync(
      camelPath,
      JSON.stringify({
        accounts: { anthropic: [] },
        routing: { primaryAccount: "  user@example.com  " },
      }),
      "utf-8",
    );
    const cfg2 = (await loadProxyConfig(camelPath)) as {
      routing?: { primaryAccount?: string };
    };
    if (cfg2.routing?.primaryAccount !== "user@example.com") {
      log(
        `loadProxyConfig camel+trim: got ${String(cfg2.routing?.primaryAccount)}`,
        "red",
      );
      return false;
    }

    log("parseRoutingConfig via load: kebab/camel/trim passed", "green");
    return true;
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

// ============================================================================
// Tests: legacy routing keys treat `null` as unset under either spelling
// ============================================================================

/**
 * The eight routing keys that predate #1787's five newer policy keys. Each
 * is read under two spellings; a `null` under either one must mean "unset"
 * rather than fail validation. See `readLegacyRoutingKey` in
 * src/lib/proxy/proxyConfig.ts.
 *
 * `expected` is the value `sample` becomes once parsed (normalization such
 * as trimming/dedup for arrays), used by the precedence test below.
 */
const LEGACY_ROUTING_KEYS: Array<{
  kebab: string;
  camel: string;
  sample: unknown;
  expected: unknown;
}> = [
  {
    kebab: "fallback-chain",
    camel: "fallbackChain",
    sample: [{ provider: "codex", model: "gpt-5" }],
    expected: [{ provider: "codex", model: "gpt-5" }],
  },
  {
    kebab: "account-allowlist",
    camel: "accountAllowlist",
    sample: ["user@example.com"],
    expected: ["user@example.com"],
  },
  {
    kebab: "quota-routing",
    camel: "quotaRouting",
    sample: true,
    expected: true,
  },
  {
    kebab: "use-overage",
    camel: "useOverage",
    sample: "always",
    expected: "always",
  },
  {
    kebab: "auto-fallback",
    camel: "autoFallback",
    sample: true,
    expected: true,
  },
  {
    kebab: "max-inflight-per-account",
    camel: "maxInflightPerAccount",
    sample: 5,
    expected: 5,
  },
  {
    kebab: "session-soft-limit",
    camel: "sessionSoftLimit",
    sample: 0.5,
    expected: 0.5,
  },
  {
    kebab: "session-reset-tolerance-ms",
    camel: "sessionResetToleranceMs",
    sample: 1000,
    expected: 1000,
  },
];

/** Writes `routing` under a fresh tmp config file and returns the parsed
 *  routing object via the always-exported `loadProxyConfig`, mirroring
 *  `testParseRoutingPrimaryViaLoad`'s fallback pattern above. */
async function loadRoutingFromConfig(
  routing: Record<string, unknown>,
): Promise<Record<string, unknown> | undefined> {
  const { loadProxyConfig } = await import("../src/lib/proxy/proxyConfig.js");
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "proxy-legacy-null-"));
  try {
    const configPath = path.join(tmpDir, "config.json");
    fs.writeFileSync(
      configPath,
      JSON.stringify({ accounts: { anthropic: [] }, routing }),
      "utf-8",
    );
    const cfg = (await loadProxyConfig(configPath, {
      resolveEnv: false,
    })) as { routing?: Record<string, unknown> };
    return cfg.routing;
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

/**
 * For each of the eight legacy routing keys: a `null` under either spelling
 * must not fail validation, and the parsed routing config must hold the
 * key's default (the field stays unset) rather than a literal `null`.
 *
 * RED on `release`: for seven of the eight keys, a camelCase-only `null`
 * makes `validateProxyConfig` report an error (so `loadProxyConfig` throws
 * and the whole config is rejected) because `??` only treats `null` as
 * "fall through" when it is the left operand. `fallback-chain` happens not
 * to reject on `release` (its validator only inspects array entries, and
 * `Array.isArray(null)` is false), so its two assertions here already pass
 * pre-fix — the warning test below covers it instead.
 */
async function testLegacyRoutingNullKeysHoldDefault(): Promise<boolean | null> {
  const { validateProxyConfig } =
    await import("../src/lib/proxy/proxyConfig.js");

  for (const { kebab, camel } of LEGACY_ROUTING_KEYS) {
    for (const spelling of [kebab, camel]) {
      const errors = validateProxyConfig({ routing: { [spelling]: null } });
      if (errors.length !== 0) {
        log(
          `Legacy routing null: routing.${spelling}=null reported validation errors: ${errors.join("; ")}`,
          "red",
        );
        return false;
      }

      const routing = await loadRoutingFromConfig({ [spelling]: null });
      if (routing?.[camel] !== undefined) {
        log(
          `Legacy routing null: routing.${spelling}=null did not hold the default (got ${JSON.stringify(routing?.[camel])})`,
          "red",
        );
        return false;
      }
    }
  }

  log(
    `Legacy routing null: ${LEGACY_ROUTING_KEYS.length} keys x 2 spellings hold their default`,
    "green",
  );
  return true;
}

/**
 * A `null` kebab value must not mask a non-null camel value: `??` already
 * falls through from a `null` left operand, and the fix must preserve that
 * precedence exactly. (This does not regress on `release` — it guards
 * against the fix changing behavior it must not touch.)
 */
async function testLegacyRoutingKebabNullFallsThroughToCamel(): Promise<
  boolean | null
> {
  for (const { kebab, camel, sample, expected } of LEGACY_ROUTING_KEYS) {
    const routing = await loadRoutingFromConfig({
      [kebab]: null,
      [camel]: sample,
    });
    const actual = routing?.[camel];
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      log(
        `Legacy routing precedence: ${kebab}=null, ${camel}=sample — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
        "red",
      );
      return false;
    }
  }

  log(
    `Legacy routing precedence: ${LEGACY_ROUTING_KEYS.length} keys keep the non-null camel value when kebab is null`,
    "green",
  );
  return true;
}

/**
 * Two keys, each given genuinely DIFFERENT non-null valid values under the
 * two spellings, so a reversed precedence (camel winning over kebab) cannot
 * hide behind both spellings agreeing on the same sample value the way
 * every other legacy-routing case above does. `??`'s left-to-right
 * precedence is unchanged by the null fix, but nothing above pins it.
 */
const LEGACY_ROUTING_PRECEDENCE_CASES: Array<{
  kebab: string;
  camel: string;
  kebabValue: unknown;
  camelValue: unknown;
}> = [
  {
    kebab: "use-overage",
    camel: "useOverage",
    kebabValue: "never",
    camelValue: "always",
  },
  {
    kebab: "max-inflight-per-account",
    camel: "maxInflightPerAccount",
    kebabValue: 3,
    camelValue: 10,
  },
];

async function testLegacyRoutingKebabWinsOverDifferentCamelValue(): Promise<
  boolean | null
> {
  for (const {
    kebab,
    camel,
    kebabValue,
    camelValue,
  } of LEGACY_ROUTING_PRECEDENCE_CASES) {
    const routing = await loadRoutingFromConfig({
      [kebab]: kebabValue,
      [camel]: camelValue,
    });
    const actual = routing?.[camel];
    if (JSON.stringify(actual) !== JSON.stringify(kebabValue)) {
      log(
        `Legacy routing precedence: ${kebab}=${JSON.stringify(kebabValue)}, ${camel}=${JSON.stringify(camelValue)} — expected the non-null kebab value to win, got ${JSON.stringify(actual)}`,
        "red",
      );
      return false;
    }
  }

  log(
    `Legacy routing precedence: ${LEGACY_ROUTING_PRECEDENCE_CASES.length} keys keep the non-null kebab value over a different non-null camel value`,
    "green",
  );
  return true;
}

/**
 * Exactly one warning per null key per load, logged only from the parse
 * path (never from validate). Sets all eight keys to `null` in a single
 * config, alternating which spelling carries the `null`, and loads it once.
 *
 * RED on `release`: no warning exists yet for any of the eight keys, and for
 * the seven keys landing on their camelCase spelling here, the load throws
 * before any warning could be captured — both are legitimate failures of
 * this assertion pre-fix.
 */
async function testLegacyRoutingNullKeyLogsWarning(): Promise<boolean | null> {
  const { logger } = await import("../src/lib/utils/logger.js");
  const originalWarn = logger.warn;
  const capturedWarnings: string[] = [];
  logger.warn = (...args: unknown[]) => {
    capturedWarnings.push(
      args
        .map((a) => (typeof a === "string" ? a : JSON.stringify(a)))
        .join(" "),
    );
  };

  try {
    const routingInput: Record<string, unknown> = {};
    LEGACY_ROUTING_KEYS.forEach(({ kebab, camel }, index) => {
      // Alternate spellings so both are exercised within the same load.
      routingInput[index % 2 === 0 ? kebab : camel] = null;
    });

    await loadRoutingFromConfig(routingInput);

    for (const { kebab } of LEGACY_ROUTING_KEYS) {
      const matches = capturedWarnings.filter((w) =>
        w.includes(`routing.${kebab} is null; using the default`),
      );
      if (matches.length !== 1) {
        log(
          `Legacy routing warning: expected exactly 1 warning for ${kebab}, got ${matches.length}`,
          "red",
        );
        return false;
      }
    }

    log(
      `Legacy routing warning: ${LEGACY_ROUTING_KEYS.length} keys each warned exactly once`,
      "green",
    );
    return true;
  } finally {
    logger.warn = originalWarn;
  }
}

/**
 * Both spellings of the same key set to `null` must still log exactly one
 * warning, not two — the warning is per key, not per null-valued spelling
 * encountered. Runs each key in its own load (rather than combining all
 * eight into one config) so a key's count can't be inflated by another
 * key's warning matching the same substring.
 */
async function testLegacyRoutingBothSpellingsNullWarnsOnce(): Promise<
  boolean | null
> {
  const { logger } = await import("../src/lib/utils/logger.js");
  const originalWarn = logger.warn;
  let capturedWarnings: string[] = [];
  logger.warn = (...args: unknown[]) => {
    capturedWarnings.push(
      args
        .map((a) => (typeof a === "string" ? a : JSON.stringify(a)))
        .join(" "),
    );
  };

  try {
    for (const { kebab, camel } of LEGACY_ROUTING_KEYS) {
      capturedWarnings = [];
      await loadRoutingFromConfig({ [kebab]: null, [camel]: null });
      const matches = capturedWarnings.filter((w) =>
        w.includes(`routing.${kebab} is null; using the default`),
      );
      if (matches.length !== 1) {
        log(
          `Legacy routing warning: expected exactly 1 warning for ${kebab}=null, ${camel}=null, got ${matches.length}`,
          "red",
        );
        return false;
      }
    }

    log(
      `Legacy routing warning: ${LEGACY_ROUTING_KEYS.length} keys warn exactly once when both spellings are null`,
      "green",
    );
    return true;
  } finally {
    logger.warn = originalWarn;
  }
}

/**
 * A `null` kebab value with a non-null camel value must log NO warning: the
 * key did resolve to a real value (the camel one), so it was never "unset"
 * and there is nothing to warn about — only a null-caused fallback to the
 * default should warn.
 */
async function testLegacyRoutingNullKebabWithCamelValueLogsNoWarning(): Promise<
  boolean | null
> {
  const { logger } = await import("../src/lib/utils/logger.js");
  const originalWarn = logger.warn;
  let capturedWarnings: string[] = [];
  logger.warn = (...args: unknown[]) => {
    capturedWarnings.push(
      args
        .map((a) => (typeof a === "string" ? a : JSON.stringify(a)))
        .join(" "),
    );
  };

  try {
    for (const { kebab, camel, sample } of LEGACY_ROUTING_KEYS) {
      capturedWarnings = [];
      await loadRoutingFromConfig({ [kebab]: null, [camel]: sample });
      const matches = capturedWarnings.filter((w) =>
        w.includes(`routing.${kebab} is null; using the default`),
      );
      if (matches.length !== 0) {
        log(
          `Legacy routing warning: expected no warning for ${kebab}=null, ${camel}=sample, got ${matches.length}`,
          "red",
        );
        return false;
      }
    }

    log(
      `Legacy routing warning: ${LEGACY_ROUTING_KEYS.length} keys log no warning when kebab is null but camel holds a value`,
      "green",
    );
    return true;
  } finally {
    logger.warn = originalWarn;
  }
}

// ============================================================================
// Tests: validateProxyConfig / parseRoutingConfig — the five routing policy
// keys (account-ranking, prefer-primary, session-affinity,
// session-affinity-idle-ttl-ms, spill-inflight)
// ============================================================================

async function testValidateProxyConfigRejectsBadAccountRanking(): Promise<boolean> {
  const { validateProxyConfig } =
    await import("../src/lib/proxy/proxyConfig.js");
  const errors = validateProxyConfig({
    routing: { "account-ranking": "fastest-first" },
  } as unknown as Record<string, unknown>);
  const found = errors.some((e) => e.includes("account-ranking"));
  if (!found) {
    log("expected a routing.account-ranking validation error", "red");
    return false;
  }
  return true;
}

async function testValidateProxyConfigRejectsOutOfRangeSpill(): Promise<boolean> {
  const { validateProxyConfig } =
    await import("../src/lib/proxy/proxyConfig.js");
  const errors = validateProxyConfig({
    routing: { "spill-inflight": 101 },
  } as unknown as Record<string, unknown>);
  const found = errors.some((e) => e.includes("spill-inflight"));
  if (!found) {
    log("expected a routing.spill-inflight validation error", "red");
    return false;
  }
  return true;
}

async function testParseRoutingConfigAcceptsCamelCaseAffinityTtl(): Promise<boolean> {
  const { parseRoutingConfig } =
    await import("../src/lib/proxy/proxyConfig.js");
  const parsed = parseRoutingConfig({ sessionAffinityIdleTtlMs: 120_000 });
  if (parsed?.sessionAffinityIdleTtlMs !== 120_000) {
    log("expected camelCase sessionAffinityIdleTtlMs to parse", "red");
    return false;
  }
  return true;
}

async function testValidateProxyConfigRejectsBadPreferPrimary(): Promise<boolean> {
  const { validateProxyConfig } =
    await import("../src/lib/proxy/proxyConfig.js");
  const errors = validateProxyConfig({
    routing: { "prefer-primary": "yes" },
  } as unknown as Record<string, unknown>);
  const found = errors.some((e) => e.includes("prefer-primary"));
  if (!found) {
    log("expected a routing.prefer-primary validation error", "red");
    return false;
  }
  return true;
}

async function testValidateProxyConfigRejectsBadSessionAffinity(): Promise<boolean> {
  const { validateProxyConfig } =
    await import("../src/lib/proxy/proxyConfig.js");
  const errors = validateProxyConfig({
    routing: { "session-affinity": 1 },
  } as unknown as Record<string, unknown>);
  const found = errors.some((e) => e.includes("session-affinity"));
  if (!found) {
    log("expected a routing.session-affinity validation error", "red");
    return false;
  }
  return true;
}

async function testValidateProxyConfigRejectsBadAffinityIdleTtl(): Promise<boolean> {
  const { validateProxyConfig } =
    await import("../src/lib/proxy/proxyConfig.js");
  const belowRangeErrors = validateProxyConfig({
    routing: { "session-affinity-idle-ttl-ms": 59_999 },
  } as unknown as Record<string, unknown>);
  const belowRangeFound = belowRangeErrors.some((e) =>
    e.includes("session-affinity-idle-ttl-ms"),
  );
  if (!belowRangeFound) {
    log(
      "expected a routing.session-affinity-idle-ttl-ms validation error for a below-range value",
      "red",
    );
    return false;
  }

  const nonIntegerErrors = validateProxyConfig({
    routing: { "session-affinity-idle-ttl-ms": 120_000.5 },
  } as unknown as Record<string, unknown>);
  const nonIntegerFound = nonIntegerErrors.some((e) =>
    e.includes("session-affinity-idle-ttl-ms"),
  );
  if (!nonIntegerFound) {
    log(
      "expected a routing.session-affinity-idle-ttl-ms validation error for a non-integer value",
      "red",
    );
    return false;
  }

  const aboveRangeErrors = validateProxyConfig({
    routing: { "session-affinity-idle-ttl-ms": 86_400_001 },
  } as unknown as Record<string, unknown>);
  if (
    !aboveRangeErrors.some((e) => e.includes("session-affinity-idle-ttl-ms"))
  ) {
    log(
      "expected a routing.session-affinity-idle-ttl-ms validation error for an above-range value",
      "red",
    );
    return false;
  }

  const atMaximumErrors = validateProxyConfig({
    routing: { "session-affinity-idle-ttl-ms": 86_400_000 },
  } as unknown as Record<string, unknown>);
  if (atMaximumErrors.some((e) => e.includes("session-affinity-idle-ttl-ms"))) {
    log(
      "expected routing.session-affinity-idle-ttl-ms to accept its documented maximum",
      "red",
    );
    return false;
  }
  return true;
}

// A serializer that writes null instead of omitting a key must get the same
// verdict whichever spelling carries it: rejected, never a silent default.
async function testValidateProxyConfigRejectsNullUnderEitherSpelling(): Promise<boolean> {
  const { validateProxyConfig } =
    await import("../src/lib/proxy/proxyConfig.js");
  const spellings: ReadonlyArray<readonly [string, string]> = [
    ["account-ranking", "accountRanking"],
    ["prefer-primary", "preferPrimary"],
    ["session-affinity", "sessionAffinity"],
    ["session-affinity-idle-ttl-ms", "sessionAffinityIdleTtlMs"],
    ["spill-inflight", "spillInflight"],
  ];
  for (const [kebabKey, camelKey] of spellings) {
    for (const key of [kebabKey, camelKey]) {
      const errors = validateProxyConfig({
        routing: { [key]: null },
      } as unknown as Record<string, unknown>);
      if (!errors.some((e) => e.includes(`routing.${kebabKey}`))) {
        log(`expected routing.${key} set to null to be rejected`, "red");
        return false;
      }
    }
  }
  return true;
}

// ============================================================================
// Tests: /status stats.primaryAccount additive guarantee
// ============================================================================

async function testStatusPrimaryAccountFallback(): Promise<boolean | null> {
  // The test proxy is started in testProxyStartup without a routing.primaryAccount
  // configured (no --config arg). Verify /status reports source="fallback" and a
  // sensible label, proving the additive guarantee: existing operators see no
  // behavior change from the new field's absence.
  try {
    const resp = await fetchProxy("/status");
    if (!resp.ok) {
      log(`/status returned ${resp.status}`, "red");
      return false;
    }
    const body = (await resp.json()) as {
      stats?: {
        primaryAccount?: {
          configured: string | null;
          key: string | null;
          label: string | null;
          source: string;
        };
      };
    };
    const pa = body.stats?.primaryAccount;
    if (!pa) {
      log("Status response missing stats.primaryAccount", "red");
      return false;
    }
    if (pa.source !== "fallback") {
      log(
        `Expected source="fallback" with no primary configured, got "${pa.source}"`,
        "red",
      );
      return false;
    }
    if (pa.configured !== null) {
      log(
        `Expected configured=null with no primary configured, got "${pa.configured}"`,
        "red",
      );
      return false;
    }
    log(
      `stats.primaryAccount fallback OK: label=${String(pa.label)} key=${String(pa.key)}`,
      "green",
    );
    return true;
  } catch (err) {
    log(
      `Status primary fallback error: ${err instanceof Error ? err.message : String(err)}`,
      "red",
    );
    return false;
  }
}

// ============================================================================
// Tests: /status reports the routing policy (built CLI, throwaway config)
// ============================================================================

/**
 * A real operator's proxy listens here by default. The kernel never hands out
 * a bound port, but a stopped launchd proxy can come back on it mid-case, so
 * it is excluded outright alongside the suite's own port.
 */
const OPERATOR_DEFAULT_PROXY_PORT = 55669;

type ProxyTestInstance = {
  child: ChildProcess;
  port: number;
  configPath: string;
  home: string;
};

async function findFreeProxyTestPort(): Promise<number> {
  const reserved = new Set([PROXY_PORT, OPERATOR_DEFAULT_PROXY_PORT]);
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const port = await freePort();
    if (!reserved.has(port)) {
      return port;
    }
  }
  throw new Error("no free proxy test port outside the reserved ports");
}

/**
 * Write a proxy config as JSON and return its path. Without a path, a fresh
 * directory under TEST_HOME holds it, and the suite removes TEST_HOME when the
 * run ends. With a path, that file is replaced: a hot-reload case must rewrite
 * the file the proxy was started with, because that is the path it watches.
 * The rename means a reload can never read a half-written file.
 */
async function writeThrowawayProxyConfig(
  config: Record<string, unknown>,
  configPath?: string,
): Promise<string> {
  const target =
    configPath ??
    path.join(
      fs.mkdtempSync(path.join(TEST_HOME, "proxy-cli-config-")),
      "proxy-config.json",
    );
  const staging = `${target}.${process.pid}.tmp`;
  await fs.promises.writeFile(staging, JSON.stringify(config, null, 2));
  await fs.promises.rename(staging, target);
  return target;
}

function waitForChildExit(
  child: ChildProcess,
  timeoutMs: number,
): Promise<boolean> {
  if (child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve(true);
  }
  return new Promise<boolean>((resolve) => {
    const onExit = (): void => {
      clearTimeout(timer);
      resolve(true);
    };
    const timer = setTimeout(() => {
      child.off("exit", onExit);
      resolve(false);
    }, timeoutMs);
    child.once("exit", onExit);
  });
}

function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readProxyTestGuardPid(home: string): number | undefined {
  try {
    const state = JSON.parse(
      fs.readFileSync(
        path.join(home, ".neurolink", "proxy-state.json"),
        "utf8",
      ),
    ) as { guardPid?: unknown };
    return typeof state.guardPid === "number" ? state.guardPid : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Stop a proxy from `startProxyForTests` and wait until nothing it started is
 * left running. A foreground proxy also spawns a detached fail-open guard that
 * polls for its parent and exits shortly after it. The guard is outside this
 * process tree, so it is awaited by pid. Otherwise it could outlive the case
 * and race the removal of the HOME it writes to.
 */
async function stopProxyForTests(proxy: ProxyTestInstance): Promise<void> {
  const guardPid = readProxyTestGuardPid(proxy.home);
  if (!(await waitForChildExit(proxy.child, 0))) {
    proxy.child.kill("SIGTERM");
    if (!(await waitForChildExit(proxy.child, 10_000))) {
      proxy.child.kill("SIGKILL");
      await waitForChildExit(proxy.child, 5_000);
    }
  }
  if (guardPid !== undefined) {
    const deadline = Date.now() + 10_000;
    while (isPidAlive(guardPid) && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 200));
    }
    if (isPidAlive(guardPid)) {
      try {
        process.kill(guardPid, "SIGKILL");
      } catch {
        // Exited between the check and the kill.
      }
    }
  }
  try {
    fs.rmSync(proxy.home, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 100,
    });
  } catch {
    // Cleanup of a temp directory must never decide whether a test passed.
  }
}

/**
 * Start `proxy start --config <configPath>` from the built CLI on `port`, with
 * its own HOME, so it shares no state file, log or singleton guard with the
 * suite's proxy on PROXY_PORT. Resolves once /health answers. On any startup
 * failure it stops the child before throwing, so no process is left behind.
 */
async function startProxyForTests(options: {
  port: number;
  configPath: string;
  env?: Record<string, string>;
}): Promise<ProxyTestInstance> {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "nl-proxy-cli-home-"));
  const child = spawn(
    process.execPath,
    [
      path.resolve("dist/cli/index.js"),
      "proxy",
      "start",
      "--port",
      String(options.port),
      "--config",
      options.configPath,
      "--quiet",
    ],
    {
      // The CLI entry loads a `.env` from its cwd. The checkout's own `.env`
      // must not reach a proxy that is supposed to be isolated.
      cwd: home,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        HOME: home,
        USERPROFILE: home,
        XDG_CONFIG_HOME: path.join(home, ".config"),
        NEUROLINK_SKIP_MCP: "true",
        NEUROLINK_PROXY_IGNORE_LAUNCHD: "1",
        // Neither is under test. The share listener would bind a second port,
        // and the updater is a detached process that could outlive the case.
        NEUROLINK_PROXY_SHARE_LISTENER: "off",
        NEUROLINK_PROXY_AUTO_UPDATE: "off",
        ...(options.env ?? {}),
      },
    },
  );
  const proxy: ProxyTestInstance = {
    child,
    port: options.port,
    configPath: options.configPath,
    home,
  };

  // Drained so a chatty child cannot block on a full pipe, and kept short so a
  // failed start can say why without the log growing unbounded.
  let output = "";
  const keepTail = (chunk: Buffer): void => {
    output = (output + chunk.toString()).slice(-4096);
  };
  child.stdout?.on("data", keepTail);
  child.stderr?.on("data", keepTail);
  let exitReason: string | null = null;
  child.once("error", (err) => {
    exitReason = `spawn error: ${err.message}`;
  });
  child.once("exit", (code, signal) => {
    exitReason = `exited early with code=${code} signal=${signal}`;
  });

  // Generous because the machine running this suite is often loaded, and
  // bounded because a case timeout aborts every remaining case in the run.
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline && exitReason === null) {
    try {
      const probe = await fetch(`http://127.0.0.1:${options.port}/health`, {
        signal: AbortSignal.timeout(5_000),
      });
      if (probe.ok) {
        return proxy;
      }
    } catch {
      // Not listening yet.
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  const reason = exitReason ?? "no healthy /health within 60s";
  log(
    `throwaway-config proxy failed to start: ${reason}${output ? ` — ${output.slice(-400)}` : ""}`,
    "red",
  );
  await stopProxyForTests(proxy);
  throw new Error(`throwaway-config proxy failed to start: ${reason}`);
}

/**
 * `proxy start` with every routing-policy key set in a throwaway config must
 * report that policy on `/status`, together with the bound-session count.
 * Each key is set to a non-default value, so a field that fell back to its
 * default cannot pass. The proxy is fresh and has served nothing, so the count
 * must be exactly zero, not merely a number.
 */
async function testStatusReportsRoutingPolicy(): Promise<boolean> {
  const port = await findFreeProxyTestPort();
  const configPath = await writeThrowawayProxyConfig({
    routing: {
      "account-ranking": "headroom-first",
      "prefer-primary": true,
      "session-affinity": true,
      "session-affinity-idle-ttl-ms": 120_000,
      "spill-inflight": 10,
    },
  });
  const proxy = await startProxyForTests({ port, configPath });
  try {
    const res = await fetch(`http://127.0.0.1:${port}/status`, {
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      log(`/status returned ${res.status}`, "red");
      return false;
    }
    const body = (await res.json()) as {
      policy?: {
        ranking?: unknown;
        preferPrimary?: unknown;
        sessionAffinity?: unknown;
        sessionAffinityIdleTtlMs?: unknown;
        spillInflight?: unknown;
      };
      boundSessions?: unknown;
    };
    const checks: ReadonlyArray<readonly [string, unknown, unknown]> = [
      ["policy.ranking", body.policy?.ranking, "headroom-first"],
      ["policy.preferPrimary", body.policy?.preferPrimary, true],
      ["policy.sessionAffinity", body.policy?.sessionAffinity, true],
      [
        "policy.sessionAffinityIdleTtlMs",
        body.policy?.sessionAffinityIdleTtlMs,
        120_000,
      ],
      ["policy.spillInflight", body.policy?.spillInflight, 10],
      ["boundSessions", body.boundSessions, 0],
    ];
    const mismatched = checks
      .filter(([, actual, expected]) => actual !== expected)
      .map(([field]) => field);
    if (mismatched.length > 0) {
      log(
        `expected /status to report the configured routing policy; mismatched: ${mismatched.join(", ")}`,
        "red",
      );
      return false;
    }
    return true;
  } finally {
    await stopProxyForTests(proxy);
  }
}

type ProxyTestStatusBody = {
  policy?: {
    ranking?: unknown;
    preferPrimary?: unknown;
    sessionAffinity?: unknown;
    sessionAffinityIdleTtlMs?: unknown;
    spillInflight?: unknown;
  };
  config?: {
    generation?: unknown;
    lastReloadAttemptAt?: unknown;
    lastReloadAt?: unknown;
    lastReloadSource?: unknown;
    lastReloadError?: unknown;
    consecutiveFailures?: unknown;
  } | null;
};

async function readProxyTestStatus(
  port: number,
): Promise<ProxyTestStatusBody | undefined> {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/status`, {
      signal: AbortSignal.timeout(10_000),
    });
    return res.ok ? ((await res.json()) as ProxyTestStatusBody) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Replace the config a `startProxyForTests` proxy was started with and wait
 * until the reload that edit triggers has finished. `proxy start` reloads on
 * SIGHUP and on its `fs.watchFile` poll of the config path. The edit already
 * arms the watcher, so the helper relies on that alone: a SIGHUP on top would
 * start a second reload. The markers are read before the edit, because the
 * watcher can fire before a caller gets to look. A reload has finished when
 * its attempt stamp has moved and either the success stamp has caught up
 * with it or the failure count has risen. Resolves with /status from before
 * and after, or undefined when no finished reload shows up within the bound.
 */
async function triggerProxyReloadForTests(
  proxy: ProxyTestInstance,
  config: Record<string, unknown>,
): Promise<
  { before: ProxyTestStatusBody; after: ProxyTestStatusBody } | undefined
> {
  const before = await readProxyTestStatus(proxy.port);
  const markers = before?.config;
  if (!before || !markers) {
    return undefined;
  }
  await writeThrowawayProxyConfig(config, proxy.configPath);
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const after = await readProxyTestStatus(proxy.port);
    const reload = after?.config;
    if (
      after &&
      reload &&
      reload.lastReloadAttemptAt !== markers.lastReloadAttemptAt &&
      (reload.lastReloadAt === reload.lastReloadAttemptAt ||
        reload.consecutiveFailures !== markers.consecutiveFailures)
    ) {
      return { before, after };
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  return undefined;
}

/**
 * An invalid routing value in an edited config rejects the whole reload: the
 * valid key beside it does not apply either, and the last known-good policy
 * stays active. The rejection is proved first from the /status reload markers,
 * because "the policy did not change" alone would also pass if no reload had
 * run.
 */
async function testInvalidRoutingPolicyValueRejectsWholeReload(): Promise<boolean> {
  const port = await findFreeProxyTestPort();
  const configPath = await writeThrowawayProxyConfig({
    routing: { "account-ranking": "headroom-first", "spill-inflight": 5 },
  });
  const proxy = await startProxyForTests({ port, configPath });
  try {
    const reload = await triggerProxyReloadForTests(proxy, {
      routing: {
        "account-ranking": "not-a-real-ranking",
        "spill-inflight": 15,
      },
    });
    if (!reload) {
      log(
        "expected /status to show a finished reload after the config edit",
        "red",
      );
      return false;
    }
    const { before, after } = reload;
    if (
      before.policy?.ranking !== "headroom-first" ||
      before.policy?.spillInflight !== 5
    ) {
      log(
        "precondition failed: the starting policy was not active before the edit",
        "red",
      );
      return false;
    }
    const was = before.config ?? {};
    const now = after.config ?? {};
    const rejection: ReadonlyArray<readonly [string, boolean]> = [
      ["config.lastReloadSource", now.lastReloadSource === "watch"],
      [
        "config.consecutiveFailures",
        typeof was.consecutiveFailures === "number" &&
          now.consecutiveFailures === was.consecutiveFailures + 1,
      ],
      [
        "config.lastReloadError",
        typeof now.lastReloadError === "string" &&
          now.lastReloadError.length > 0,
      ],
      [
        "config.generation",
        typeof was.generation === "number" && now.generation === was.generation,
      ],
    ];
    const notRejected = rejection.filter(([, ok]) => !ok).map(([f]) => f);
    if (notRejected.length > 0) {
      log(
        `expected /status to record the edit's reload as attempted and rejected; mismatched: ${notRejected.join(", ")}`,
        "red",
      );
      return false;
    }
    const kept = [
      ["policy.ranking", after.policy?.ranking, "headroom-first"],
      ["policy.spillInflight", after.policy?.spillInflight, 5],
    ] as const;
    const changed = kept
      .filter(([, actual, expected]) => actual !== expected)
      .map(([field]) => field);
    if (changed.length > 0) {
      log(
        `expected the rejected reload to leave the last known-good policy active; mismatched: ${changed.join(", ")}`,
        "red",
      );
      return false;
    }
    return true;
  } finally {
    await stopProxyForTests(proxy);
  }
}

/**
 * Editing the config file hot-reloads every routing-policy key. Each key
 * starts at a value that differs from its edited value, so a reload that
 * never applied cannot pass.
 */
async function testHotReloadUpdatesActivePolicy(): Promise<boolean> {
  const initial = {
    "account-ranking": "expiry-first",
    "prefer-primary": false,
    "session-affinity": false,
    "session-affinity-idle-ttl-ms": 3_600_000,
    "spill-inflight": 5,
  };
  const edited = {
    "account-ranking": "headroom-first",
    "prefer-primary": true,
    "session-affinity": true,
    "session-affinity-idle-ttl-ms": 120_000,
    "spill-inflight": 15,
  };
  const policyChecks = (
    policy: ProxyTestStatusBody["policy"],
    expected: typeof initial,
  ): string[] =>
    (
      [
        ["policy.ranking", policy?.ranking, expected["account-ranking"]],
        [
          "policy.preferPrimary",
          policy?.preferPrimary,
          expected["prefer-primary"],
        ],
        [
          "policy.sessionAffinity",
          policy?.sessionAffinity,
          expected["session-affinity"],
        ],
        [
          "policy.sessionAffinityIdleTtlMs",
          policy?.sessionAffinityIdleTtlMs,
          expected["session-affinity-idle-ttl-ms"],
        ],
        [
          "policy.spillInflight",
          policy?.spillInflight,
          expected["spill-inflight"],
        ],
      ] as const
    )
      .filter(([, actual, want]) => actual !== want)
      .map(([field]) => field);
  const port = await findFreeProxyTestPort();
  const configPath = await writeThrowawayProxyConfig({ routing: initial });
  const proxy = await startProxyForTests({ port, configPath });
  try {
    const reload = await triggerProxyReloadForTests(proxy, {
      routing: edited,
    });
    if (!reload) {
      log(
        "expected /status to show a finished reload after the config edit",
        "red",
      );
      return false;
    }
    const { before, after } = reload;
    const notInitial = policyChecks(before.policy, initial);
    if (notInitial.length > 0) {
      log(
        `precondition failed: the starting policy was not active before the edit; mismatched: ${notInitial.join(", ")}`,
        "red",
      );
      return false;
    }
    const was = before.config ?? {};
    const now = after.config ?? {};
    const applied: ReadonlyArray<readonly [string, boolean]> = [
      ["config.lastReloadSource", now.lastReloadSource === "watch"],
      [
        "config.generation",
        typeof was.generation === "number" &&
          now.generation === was.generation + 1,
      ],
      ["config.lastReloadError", now.lastReloadError === null],
      ["config.consecutiveFailures", now.consecutiveFailures === 0],
    ];
    const notApplied = applied.filter(([, ok]) => !ok).map(([f]) => f);
    if (notApplied.length > 0) {
      log(
        `expected /status to record the edit's reload as applied; mismatched: ${notApplied.join(", ")}`,
        "red",
      );
      return false;
    }
    const notEdited = policyChecks(after.policy, edited);
    if (notEdited.length > 0) {
      log(
        `expected the hot-reloaded policy to take effect; mismatched: ${notEdited.join(", ")}`,
        "red",
      );
      return false;
    }
    return true;
  } finally {
    await stopProxyForTests(proxy);
  }
}

// ============================================================================
// Tests: CLI auth set-primary / get-primary / clear-primary roundtrip
// ============================================================================

async function testCliPrimaryRoundtrip(): Promise<boolean | null> {
  const cliPath = path.join(__dirname, "..", "dist", "cli", "index.js");
  if (!fs.existsSync(cliPath)) {
    log(`CLI not built at ${cliPath}; run pnpm run build:cli first`, "yellow");
    return null;
  }

  // Use a .json path so the test does not depend on js-yaml being installed.
  // The CLI auth handlers detect format from the extension; behavior is
  // identical for production YAML configs (verified manually).
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "proxy-prim-cli-"));
  const cfgPath = path.join(tmpDir, "proxy-config.json");
  const email = "primary-test@example.com";

  const runCli = (
    args: string[],
  ): Promise<{ code: number; stdout: string; stderr: string }> =>
    new Promise((resolve) => {
      const child = spawn(process.execPath, [cliPath, ...args], {
        env: { ...process.env, NEUROLINK_NO_COLOR: "1" },
      });
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (d) => (stdout += d.toString()));
      child.stderr.on("data", (d) => (stderr += d.toString()));
      child.on("close", (code) =>
        resolve({ code: code ?? -1, stdout, stderr }),
      );
    });

  try {
    // 1. set-primary writes the field
    const setRes = await runCli([
      "auth",
      "set-primary",
      email,
      "--config",
      cfgPath,
    ]);
    if (setRes.code !== 0) {
      log(`set-primary exited ${setRes.code}: ${setRes.stderr}`, "red");
      return false;
    }
    if (!fs.existsSync(cfgPath)) {
      log("set-primary did not create the config file", "red");
      return false;
    }
    const yamlContent = fs.readFileSync(cfgPath, "utf-8");
    if (!yamlContent.includes(email)) {
      log(`Config does not contain ${email}: ${yamlContent}`, "red");
      return false;
    }
    if (!/primary-account/.test(yamlContent)) {
      log(
        `Config does not contain kebab key 'primary-account': ${yamlContent}`,
        "red",
      );
      return false;
    }

    // 2. get-primary reads it back
    const getRes = await runCli(["auth", "get-primary", "--config", cfgPath]);
    if (getRes.code !== 0) {
      log(`get-primary exited ${getRes.code}: ${getRes.stderr}`, "red");
      return false;
    }
    if (!getRes.stdout.includes(email)) {
      log(`get-primary output missing ${email}: ${getRes.stdout}`, "red");
      return false;
    }

    // 3. clear-primary removes the field
    const clrRes = await runCli(["auth", "clear-primary", "--config", cfgPath]);
    if (clrRes.code !== 0) {
      log(`clear-primary exited ${clrRes.code}: ${clrRes.stderr}`, "red");
      return false;
    }
    const yamlAfter = fs.readFileSync(cfgPath, "utf-8");
    if (
      yamlAfter.includes(email) ||
      /primary-account|primaryAccount/.test(yamlAfter)
    ) {
      log(`clear-primary did not remove the field: ${yamlAfter}`, "red");
      return false;
    }

    // 4. clear-primary is idempotent
    const clrRes2 = await runCli([
      "auth",
      "clear-primary",
      "--config",
      cfgPath,
    ]);
    if (clrRes2.code !== 0) {
      log(
        `clear-primary (idempotent) exited ${clrRes2.code}: ${clrRes2.stderr}`,
        "red",
      );
      return false;
    }

    log("CLI primary roundtrip: set/get/clear/clear all passed", "green");
    return true;
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

// ============================================================================
// Tests: sessionAffinity (session→account binding store)
// ============================================================================

async function testSessionAffinityBindAndGet(): Promise<boolean> {
  sessionAffinity.clear();
  sessionAffinity.bind("session-a", "anthropic:acct-1", 1_000);
  const bound = sessionAffinity.get("session-a", 1_500, 60_000);
  sessionAffinity.clear();
  if (bound !== "anthropic:acct-1") {
    log("expected session-a bound to anthropic:acct-1", "red");
    return false;
  }
  return true;
}

async function testSessionAffinityIdleExpiryBoundary(): Promise<boolean> {
  sessionAffinity.clear();
  sessionAffinity.bind("session-b", "anthropic:acct-1", 1_000);
  const atBoundary = sessionAffinity.get("session-b", 1_000 + 60_000, 60_000);
  const pastBoundary = sessionAffinity.get("session-b", 1_000 + 60_001, 60_000);
  sessionAffinity.clear();
  if (atBoundary !== "anthropic:acct-1") {
    log("expected binding to survive exactly at the idle TTL boundary", "red");
    return false;
  }
  if (pastBoundary !== undefined) {
    log("expected binding to expire one ms past the idle TTL boundary", "red");
    return false;
  }
  return true;
}

async function testSessionAffinityEvictsAtCap(): Promise<boolean> {
  sessionAffinity.clear();
  for (let i = 0; i < 5_000; i += 1) {
    sessionAffinity.bind(`session-${i}`, "anthropic:acct-1", 1_000 + i);
  }
  const beforeOverflow = sessionAffinity.size();
  sessionAffinity.bind("session-5000", "anthropic:acct-1", 1_000 + 5_000);
  const afterOverflow = sessionAffinity.size();
  const oldestStillBound = sessionAffinity.get(
    "session-0",
    1_000 + 5_001,
    1_000_000_000,
  );
  sessionAffinity.clear();
  if (beforeOverflow !== 5_000) {
    log(
      `expected 5000 bound sessions before overflow, got ${beforeOverflow}`,
      "red",
    );
    return false;
  }
  if (afterOverflow !== 5_000) {
    log(
      `expected the store to stay capped at 5000, got ${afterOverflow}`,
      "red",
    );
    return false;
  }
  if (oldestStillBound !== undefined) {
    log(
      "expected the least-recently-bound session to have been evicted",
      "red",
    );
    return false;
  }
  return true;
}

async function testSessionAffinityCountActiveExcludesIdleExpired(): Promise<boolean> {
  sessionAffinity.clear();
  sessionAffinity.bind("session-expired", "anthropic:acct-1", 1_000);
  sessionAffinity.bind("session-at-boundary", "anthropic:acct-1", 1_001);
  sessionAffinity.bind("session-live", "anthropic:acct-2", 50_000);
  const active = sessionAffinity.countActive(1_000 + 60_001, 60_000);
  const retained = sessionAffinity.size();
  sessionAffinity.clear();
  if (active !== 2) {
    log(
      "expected the count to include bindings inside the idle TTL (boundary included) and exclude the idle-expired one",
      "red",
    );
    return false;
  }
  if (retained !== 2) {
    log("expected counting to drop the idle-expired binding", "red");
    return false;
  }
  return true;
}

async function testSessionAffinityClear(): Promise<boolean> {
  sessionAffinity.clear();
  sessionAffinity.bind("session-c", "anthropic:acct-1", 1_000);
  sessionAffinity.clear();
  const size = sessionAffinity.size();
  const bound = sessionAffinity.get("session-c", 1_500, 60_000);
  if (size !== 0 || bound !== undefined) {
    log("expected clear() to empty the store", "red");
    return false;
  }
  return true;
}

/**
 * `loadClaudeProxyAccounts` resolves `extractSnapshotBody(body)` before
 * account selection, so `sessionId` is available for routing. The route-level
 * binding cases in test/continuous-test-suite-proxy-fallback-parent.ts drive
 * the whole attempt loop; this pins the session-id plumbing through the same
 * `parseClaudeCodeUserId(metadata.user_id)` path Claude Code's own requests
 * use. The device id / uuids are synthetic fixtures, never a real user id.
 */
async function testLoadClaudeProxyAccountsExposesSessionId(): Promise<boolean> {
  const { __testHooks } =
    await import("../src/lib/server/routes/claudeProxyRoutes.js");
  const resolveSessionId = __testHooks.extractSnapshotBodySessionIdForTests;
  if (typeof resolveSessionId !== "function") {
    log("expected a test hook exposing the resolved sessionId path", "red");
    return false;
  }

  const fakeDeviceId = "0123456789abcdef".repeat(4);
  const fakeAccountUuid = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
  const fakeSessionId = "11111111-2222-3333-4444-555555555555";
  const claudeCodeBody = {
    metadata: {
      user_id: JSON.stringify({
        device_id: fakeDeviceId,
        account_uuid: fakeAccountUuid,
        session_id: fakeSessionId,
      }),
    },
  };
  const resolved = resolveSessionId(claudeCodeBody);
  if (resolved !== fakeSessionId) {
    log(
      "resolved sessionId did not match the Claude Code identity's session_id",
      "red",
    );
    return false;
  }

  const bodyWithoutUserId = { metadata: {} };
  const resolvedWithoutUserId = resolveSessionId(bodyWithoutUserId);
  if (resolvedWithoutUserId !== undefined) {
    log("expected no sessionId when metadata.user_id is absent", "red");
    return false;
  }

  return true;
}

async function testAffinityAppliesWithQuotaRoutingDisabled(): Promise<boolean> {
  const { __testHooks } =
    await import("../src/lib/server/routes/claudeProxyRoutes.js");
  __testHooks.resetAllRuntimeState();
  sessionAffinity.clear();
  const accounts: ProxyPassthroughAccount[] = [
    { key: "anthropic:a", label: "a", type: "oauth" },
    { key: "anthropic:b", label: "b", type: "oauth" },
  ] as ProxyPassthroughAccount[];
  for (const account of accounts) {
    __testHooks.setAccountRuntimeState(account.key, { quota: makeQuota({}) });
  }
  sessionAffinity.bind("test-session", "anthropic:b", Date.now());
  const decisions: ProxyAccountRoutingDecision[] = [];
  const { orderedAccounts } = __testHooks.selectClaudeProxyAccountOrderForTests(
    {
      enabledAccounts: accounts,
      accountStrategy: "fill-first",
      primaryAccountKey: undefined,
      quotaRoutingEnabled: false,
      sessionSoftLimit: 0.97,
      sessionResetToleranceMs: 5 * 60 * 1000,
      sessionId: "test-session",
      ranking: "expiry-first",
      preferPrimary: false,
      sessionAffinityEnabled: true,
      sessionAffinityIdleTtlMs: 3_600_000,
      spillInflight: 0,
      setRoutingDecision: (decision) => decisions.push(decision),
    },
  );
  sessionAffinity.clear();
  __testHooks.resetAllRuntimeState();
  if (orderedAccounts[0]?.key !== "anthropic:b") {
    log("expected affinity to apply even with quota routing disabled", "red");
    return false;
  }
  if (decisions[0]?.affinity?.applied !== true) {
    log("expected the routing decision to record affinity as applied", "red");
    return false;
  }
  return true;
}

/**
 * The quota-off path's catch must not leave a partial policy reorder in
 * place. Affinity genuinely reorders to [b, a]; the forced spill throw then
 * lands in the catch, which must serve the pre-policy base order [a, b].
 */
async function testSpillThrowOnQuotaOffPathRestoresBaseOrder(): Promise<boolean> {
  const { __testHooks } =
    await import("../src/lib/server/routes/claudeProxyRoutes.js");
  __testHooks.resetAllRuntimeState();
  sessionAffinity.clear();
  const accountA: ProxyPassthroughAccount = {
    key: "anthropic:a",
    label: "a",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const accountB: ProxyPassthroughAccount = {
    key: "anthropic:b",
    label: "b",
    type: "oauth",
  } as ProxyPassthroughAccount;
  __testHooks.setAccountRuntimeState(accountA.key, { quota: makeQuota({}) });
  __testHooks.setAccountRuntimeState(accountB.key, { quota: makeQuota({}) });
  sessionAffinity.bind("session-spill-throw", accountB.key, Date.now());
  __testHooks.setForceSpillThrowForTests(true);
  const decisions: ProxyAccountRoutingDecision[] = [];
  let orderedAccounts: ProxyPassthroughAccount[];
  try {
    ({ orderedAccounts } = __testHooks.selectClaudeProxyAccountOrderForTests({
      enabledAccounts: [accountA, accountB],
      accountStrategy: "fill-first",
      primaryAccountKey: undefined,
      quotaRoutingEnabled: false,
      sessionSoftLimit: 0.97,
      sessionResetToleranceMs: 5 * 60 * 1000,
      sessionId: "session-spill-throw",
      ranking: "expiry-first",
      preferPrimary: false,
      sessionAffinityEnabled: true,
      sessionAffinityIdleTtlMs: 3_600_000,
      spillInflight: 5,
      setRoutingDecision: (decision) => decisions.push(decision),
    }));
  } finally {
    __testHooks.setForceSpillThrowForTests(false);
    sessionAffinity.clear();
    __testHooks.resetAllRuntimeState();
  }
  if (orderedAccounts[0]?.key !== accountA.key) {
    log(
      "expected a thrown spill to restore the pre-policy base order, not the partial reorder",
      "red",
    );
    return false;
  }
  if (decisions[0]?.selectionReason !== "routing_policy_error") {
    log("expected selectionReason to record routing_policy_error", "red");
    return false;
  }
  return true;
}

/**
 * The quota-ordered path's failure mode serves the plain expiry-first order
 * (no ranking override, no affinity) and records routing_policy_error. The
 * fixture binds the session to b under headroom-first so a policy order
 * would start with b while expiry-first starts with a.
 */
async function testSpillThrowOnQuotaOrderedPathFallsBackToExpiryFirst(): Promise<boolean> {
  const { __testHooks } =
    await import("../src/lib/server/routes/claudeProxyRoutes.js");
  __testHooks.resetAllRuntimeState();
  sessionAffinity.clear();
  const accountA: ProxyPassthroughAccount = {
    key: "anthropic:a",
    label: "a",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const accountB: ProxyPassthroughAccount = {
    key: "anthropic:b",
    label: "b",
    type: "oauth",
  } as ProxyPassthroughAccount;
  __testHooks.setAccountRuntimeState(accountA.key, { quota: makeQuota({}) });
  __testHooks.setAccountRuntimeState(accountB.key, { quota: makeQuota({}) });
  sessionAffinity.bind("session-quota-spill-throw", accountB.key, Date.now());
  const expectedOrder = __testHooks
    .orderAccountsByQuota(
      [accountA, accountB],
      Date.now(),
      undefined,
      0.97,
      5 * 60 * 1000,
    )
    .map((account) => account.key);
  __testHooks.setForceSpillThrowForTests(true);
  const decisions: ProxyAccountRoutingDecision[] = [];
  let orderedAccounts: ProxyPassthroughAccount[];
  try {
    ({ orderedAccounts } = __testHooks.selectClaudeProxyAccountOrderForTests({
      enabledAccounts: [accountA, accountB],
      accountStrategy: "fill-first",
      primaryAccountKey: undefined,
      quotaRoutingEnabled: true,
      sessionSoftLimit: 0.97,
      sessionResetToleranceMs: 5 * 60 * 1000,
      sessionId: "session-quota-spill-throw",
      ranking: "headroom-first",
      preferPrimary: false,
      sessionAffinityEnabled: true,
      sessionAffinityIdleTtlMs: 3_600_000,
      spillInflight: 5,
      setRoutingDecision: (decision) => decisions.push(decision),
    }));
  } finally {
    __testHooks.setForceSpillThrowForTests(false);
    sessionAffinity.clear();
    __testHooks.resetAllRuntimeState();
  }
  if (expectedOrder[0] !== accountA.key) {
    log("fixture precondition failed: expiry-first should rank a first", "red");
    return false;
  }
  if (
    orderedAccounts.map((account) => account.key).join(",") !==
    expectedOrder.join(",")
  ) {
    log(
      "expected a thrown policy on the quota-ordered path to serve the expiry-first order",
      "red",
    );
    return false;
  }
  const decision = decisions[0];
  if (decision?.selectionReason !== "routing_policy_error") {
    log("expected selectionReason to record routing_policy_error", "red");
    return false;
  }
  if (decision.affinity !== undefined || decision.spill !== undefined) {
    log("expected no affinity or spill evidence after a policy error", "red");
    return false;
  }
  if (decision.policy?.ranking !== "headroom-first") {
    log("expected the policy snapshot to still be reported", "red");
    return false;
  }
  return true;
}

/**
 * Spill skips only an active binding. An unbound request whose first
 * choice is the preferred primary, already holding spill-inflight leases,
 * moves to the next usable account — on both fill-first paths.
 */
async function testPreferredPrimaryFirstChoiceSpills(): Promise<boolean> {
  const { __testHooks } =
    await import("../src/lib/server/routes/claudeProxyRoutes.js");
  const primary: ProxyPassthroughAccount = {
    key: "anthropic:p",
    label: "p",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const other: ProxyPassthroughAccount = {
    key: "anthropic:q",
    label: "q",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const spillInflight = 2;
  for (const quotaRoutingEnabled of [true, false]) {
    const path = quotaRoutingEnabled ? "quota-ordered" : "quota-off";
    __testHooks.resetAllRuntimeState();
    sessionAffinity.clear();
    __testHooks.setAccountRuntimeState(primary.key, { quota: makeQuota({}) });
    __testHooks.setAccountRuntimeState(other.key, { quota: makeQuota({}) });
    const select = (
      decisions: ProxyAccountRoutingDecision[],
    ): ProxyPassthroughAccount[] =>
      __testHooks.selectClaudeProxyAccountOrderForTests({
        enabledAccounts: [other, primary],
        accountStrategy: "fill-first",
        primaryAccountKey: primary.key,
        quotaRoutingEnabled,
        sessionSoftLimit: 0.97,
        sessionResetToleranceMs: 5 * 60 * 1000,
        sessionId: undefined,
        ranking: "expiry-first",
        preferPrimary: true,
        sessionAffinityEnabled: false,
        sessionAffinityIdleTtlMs: 3_600_000,
        spillInflight,
        setRoutingDecision: (decision) => decisions.push(decision),
      }).orderedAccounts;
    const controlDecisions: ProxyAccountRoutingDecision[] = [];
    const decisions: ProxyAccountRoutingDecision[] = [];
    const leases: { release: () => void }[] = [];
    let controlOrder: ProxyPassthroughAccount[];
    let orderedAccounts: ProxyPassthroughAccount[];
    try {
      controlOrder = select(controlDecisions);
      for (let i = 0; i < spillInflight; i++) {
        const lease = __testHooks.tryAcquireAccountAdmission(
          primary.key,
          undefined,
        );
        if (lease) {
          leases.push(lease);
        }
      }
      orderedAccounts = select(decisions);
    } finally {
      for (const lease of leases) {
        lease.release();
      }
      __testHooks.resetAllRuntimeState();
    }
    if (
      controlOrder[0]?.key !== primary.key ||
      controlDecisions[0]?.selectionReason !== "preferred_primary"
    ) {
      log(
        `precondition failed on the ${path} path: prefer-primary should pick the primary before any lease is held`,
        "red",
      );
      return false;
    }
    if (leases.length !== spillInflight) {
      log(
        `precondition failed on the ${path} path: primary leases not held`,
        "red",
      );
      return false;
    }
    if (orderedAccounts[0]?.key !== other.key) {
      log(
        `expected a busy preferred primary to spill to the other usable account on the ${path} path`,
        "red",
      );
      return false;
    }
    const decision = decisions[0];
    if (decision?.selectionReason !== "spill_inflight") {
      log(`expected selectionReason spill_inflight on the ${path} path`, "red");
      return false;
    }
    if (
      decision.spill?.from !== primary.label ||
      decision.spill.to !== other.label ||
      decision.spill.inflight !== spillInflight
    ) {
      log(
        `expected spill evidence from the primary to the other account on the ${path} path`,
        "red",
      );
      return false;
    }
  }
  return true;
}

/**
 * Spill never splits a bound session. The bound account already holds
 * spill-inflight leases and a usable, preferred primary with no leases sits
 * right behind it, so only the session_affinity guard in maybeSpill keeps
 * the request on its binding — on both fill-first paths.
 */
async function testSpillNeverSplitsBoundSession(): Promise<boolean> {
  const { __testHooks } =
    await import("../src/lib/server/routes/claudeProxyRoutes.js");
  const accountA: ProxyPassthroughAccount = {
    key: "anthropic:a",
    label: "a",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const accountB: ProxyPassthroughAccount = {
    key: "anthropic:b",
    label: "b",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const sessionId = "session-bound-no-spill";
  const spillInflight = 2;
  for (const quotaRoutingEnabled of [true, false]) {
    const path = quotaRoutingEnabled ? "quota-ordered" : "quota-off";
    __testHooks.resetAllRuntimeState();
    sessionAffinity.clear();
    __testHooks.setAccountRuntimeState(accountA.key, { quota: makeQuota({}) });
    __testHooks.setAccountRuntimeState(accountB.key, { quota: makeQuota({}) });
    sessionAffinity.bind(sessionId, accountB.key, Date.now());
    const decisions: ProxyAccountRoutingDecision[] = [];
    const leases: { release: () => void }[] = [];
    let orderedAccounts: ProxyPassthroughAccount[];
    try {
      for (let i = 0; i < spillInflight; i++) {
        const lease = __testHooks.tryAcquireAccountAdmission(
          accountB.key,
          undefined,
        );
        if (lease) {
          leases.push(lease);
        }
      }
      ({ orderedAccounts } = __testHooks.selectClaudeProxyAccountOrderForTests({
        enabledAccounts: [accountA, accountB],
        accountStrategy: "fill-first",
        primaryAccountKey: accountA.key,
        quotaRoutingEnabled,
        sessionSoftLimit: 0.97,
        sessionResetToleranceMs: 5 * 60 * 1000,
        sessionId,
        ranking: "expiry-first",
        preferPrimary: true,
        sessionAffinityEnabled: true,
        sessionAffinityIdleTtlMs: 3_600_000,
        spillInflight,
        setRoutingDecision: (decision) => decisions.push(decision),
      }));
    } finally {
      for (const lease of leases) {
        lease.release();
      }
      sessionAffinity.clear();
      __testHooks.resetAllRuntimeState();
    }
    if (leases.length !== spillInflight) {
      log(
        `precondition failed on the ${path} path: bound account leases not held`,
        "red",
      );
      return false;
    }
    if (orderedAccounts[0]?.key !== accountB.key) {
      log(
        `expected a bound session to stay on its bound account on the ${path} path`,
        "red",
      );
      return false;
    }
    const decision = decisions[0];
    if (decision?.selectionReason !== "session_affinity") {
      log(
        `expected selectionReason session_affinity on the ${path} path`,
        "red",
      );
      return false;
    }
    if ("spill" in decision) {
      log(
        `expected no spill evidence for a bound session on the ${path} path`,
        "red",
      );
      return false;
    }
  }
  return true;
}

/**
 * With every policy at its default, both fill-first paths must serve the
 * pre-policy order and decision; the decision gains only the additive
 * `policy`/`affinity` evidence (spec Observability). The pre-policy side is
 * computed independently: orderAccountsByQuota plus buildRoutingDecision
 * without policy inputs, and the fill-first rotation to the configured
 * primary.
 */
async function testDefaultPolicyReproducesPrePolicyOrdering(): Promise<boolean> {
  const { __testHooks } =
    await import("../src/lib/server/routes/claudeProxyRoutes.js");
  const accounts: ProxyPassthroughAccount[] = [
    { key: "anthropic:a", label: "a", type: "oauth" },
    { key: "anthropic:b", label: "b", type: "oauth" },
    { key: "anthropic:c", label: "c", type: "oauth" },
  ] as ProxyPassthroughAccount[];
  const primaryKey = "anthropic:c";
  const sessionSoftLimit = 0.97;
  const sessionResetToleranceMs = 5 * 60 * 1000;
  const nowSec = Math.floor(Date.now() / 1000);
  const seedQuotas = (): void => {
    __testHooks.setAccountRuntimeState("anthropic:a", {
      quota: makeQuota({ weeklyUsed: 0.4, weeklyResetAt: nowSec + 3 * 86400 }),
    });
    __testHooks.setAccountRuntimeState("anthropic:b", {
      quota: makeQuota({ weeklyUsed: 0.2, weeklyResetAt: nowSec + 86400 }),
    });
    __testHooks.setAccountRuntimeState("anthropic:c", {
      quota: makeQuota({
        sessionUsed: 0.99,
        sessionResetAt: nowSec + 3600,
        weeklyResetAt: nowSec + 2 * 86400,
      }),
    });
  };
  const withoutPolicyEvidence = (
    decision: ProxyAccountRoutingDecision,
  ): ProxyAccountRoutingDecision => {
    const copy = { ...decision };
    delete copy.policy;
    delete copy.affinity;
    return copy;
  };
  const keysOf = (list: ProxyPassthroughAccount[]): string =>
    list.map((account) => account.key).join(",");
  const expectedPolicy = {
    ranking: "expiry-first",
    preferPrimary: false,
    sessionAffinity: false,
    sessionAffinityIdleTtlMs: 3_600_000,
    spillInflight: 0,
  };
  const expectedAffinity = {
    sessionBound: false,
    boundAccount: null,
    applied: false,
    skippedReason: "disabled",
  };

  for (const quotaRoutingEnabled of [true, false]) {
    const path = quotaRoutingEnabled ? "quota-ordered" : "quota-off";
    __testHooks.resetAllRuntimeState();
    sessionAffinity.clear();
    seedQuotas();
    const decisions: ProxyAccountRoutingDecision[] = [];
    let result: ReturnType<
      typeof __testHooks.selectClaudeProxyAccountOrderForTests
    >;
    let prePolicyOrder: ProxyPassthroughAccount[];
    try {
      result = __testHooks.selectClaudeProxyAccountOrderForTests({
        enabledAccounts: accounts,
        accountStrategy: "fill-first",
        primaryAccountKey: primaryKey,
        quotaRoutingEnabled,
        sessionSoftLimit,
        sessionResetToleranceMs,
        sessionId: "default-policy-session",
        ranking: "expiry-first",
        preferPrimary: false,
        sessionAffinityEnabled: false,
        sessionAffinityIdleTtlMs: 3_600_000,
        spillInflight: 0,
        setRoutingDecision: (decision) => decisions.push(decision),
      });
      const evaluatedAt = decisions[0]
        ? Date.parse(decisions[0].evaluatedAt)
        : Date.now();
      // Quota-off fill-first rotates to the configured primary (index 2).
      prePolicyOrder = quotaRoutingEnabled
        ? __testHooks.orderAccountsByQuota(
            accounts,
            evaluatedAt,
            primaryKey,
            sessionSoftLimit,
            sessionResetToleranceMs,
          )
        : [accounts[2], accounts[0], accounts[1]];
    } finally {
      __testHooks.resetAllRuntimeState();
    }
    const decision = decisions[0];
    if (!decision) {
      log(`expected a routing decision on the ${path} path`, "red");
      return false;
    }
    if (keysOf(result.orderedAccounts) !== keysOf(prePolicyOrder)) {
      log(
        `default policy changed the account order on the ${path} path`,
        "red",
      );
      return false;
    }
    const prePolicyDecision = __testHooks.buildRoutingDecision({
      accounts,
      orderedAccounts: prePolicyOrder,
      metricsByKey: result.metricsByKey,
      evaluatedAt: Date.parse(decision.evaluatedAt),
      strategy: "fill-first",
      primaryKey,
      quotaRoutingEnabled,
      quotaOrdered: quotaRoutingEnabled,
      sessionSoftLimit,
      sessionResetToleranceMs,
      rotationOffset: quotaRoutingEnabled ? 0 : 2,
    });
    if (
      !prePolicyDecision ||
      JSON.stringify(withoutPolicyEvidence(decision)) !==
        JSON.stringify(prePolicyDecision)
    ) {
      log(
        `default policy changed the routing decision beyond the additive evidence on the ${path} path`,
        "red",
      );
      return false;
    }
    if (
      JSON.stringify(decision.policy) !== JSON.stringify(expectedPolicy) ||
      JSON.stringify(decision.affinity) !== JSON.stringify(expectedAffinity) ||
      "spill" in decision
    ) {
      log(
        `unexpected policy, affinity or spill evidence under the default policy on the ${path} path`,
        "red",
      );
      return false;
    }
  }
  return true;
}

/**
 * `strategy: round-robin` ignores all five policy keys: with affinity bound
 * elsewhere, prefer-primary on and the rotation's first choice already at
 * spill-inflight, the order is still the plain rotation and the decision
 * carries no policy, affinity or spill evidence.
 */
async function testRoundRobinIgnoresRoutingPolicies(): Promise<boolean> {
  const { __testHooks } =
    await import("../src/lib/server/routes/claudeProxyRoutes.js");
  const accounts: ProxyPassthroughAccount[] = [
    { key: "anthropic:a", label: "a", type: "oauth" },
    { key: "anthropic:b", label: "b", type: "oauth" },
    { key: "anthropic:c", label: "c", type: "oauth" },
  ] as ProxyPassthroughAccount[];
  __testHooks.resetAllRuntimeState();
  sessionAffinity.clear();
  for (const account of accounts) {
    __testHooks.setAccountRuntimeState(account.key, { quota: makeQuota({}) });
  }
  sessionAffinity.bind("rr-session", "anthropic:b", Date.now());
  const decisions: ProxyAccountRoutingDecision[] = [];
  let lease: { release: () => void } | undefined;
  let orderedAccounts: ProxyPassthroughAccount[];
  try {
    lease = __testHooks.tryAcquireAccountAdmission("anthropic:c", undefined);
    ({ orderedAccounts } = __testHooks.selectClaudeProxyAccountOrderForTests({
      enabledAccounts: accounts,
      accountStrategy: "round-robin",
      primaryAccountKey: "anthropic:c",
      quotaRoutingEnabled: true,
      sessionSoftLimit: 0.97,
      sessionResetToleranceMs: 5 * 60 * 1000,
      sessionId: "rr-session",
      ranking: "headroom-first",
      preferPrimary: true,
      sessionAffinityEnabled: true,
      sessionAffinityIdleTtlMs: 3_600_000,
      spillInflight: 1,
      setRoutingDecision: (decision) => decisions.push(decision),
    }));
  } finally {
    lease?.release();
    sessionAffinity.clear();
    __testHooks.resetAllRuntimeState();
  }
  // A fresh round-robin pool starts its rotation at the configured primary.
  if (
    orderedAccounts.map((account) => account.key).join(",") !==
    "anthropic:c,anthropic:a,anthropic:b"
  ) {
    log("expected round-robin to serve the plain rotation", "red");
    return false;
  }
  const decision = decisions[0];
  if (decision?.selectionReason !== "round_robin") {
    log("expected selectionReason round_robin", "red");
    return false;
  }
  if ("policy" in decision || "affinity" in decision || "spill" in decision) {
    log("expected no policy evidence on a round-robin decision", "red");
    return false;
  }
  return true;
}

/**
 * Spec Precedence: binding on the serving account is what stops the
 * ping-pong. A's cooldown moves the session to B, B serves it and is bound,
 * and once A recovers the session must stay on B. The control run without
 * affinity proves the recovered A would otherwise win again.
 */
async function testCooldownRecoveryDoesNotUnbindSession(): Promise<boolean> {
  const { __testHooks } =
    await import("../src/lib/server/routes/claudeProxyRoutes.js");
  const accountA: ProxyPassthroughAccount = {
    key: "anthropic:a",
    label: "a",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const accountB: ProxyPassthroughAccount = {
    key: "anthropic:b",
    label: "b",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const sessionId = "session-recovery";
  const select = (
    sessionAffinityEnabled: boolean,
    decisions: ProxyAccountRoutingDecision[],
  ): ProxyPassthroughAccount[] =>
    __testHooks.selectClaudeProxyAccountOrderForTests({
      enabledAccounts: [accountA, accountB],
      accountStrategy: "fill-first",
      primaryAccountKey: undefined,
      quotaRoutingEnabled: true,
      sessionSoftLimit: 0.97,
      sessionResetToleranceMs: 5 * 60 * 1000,
      sessionId,
      ranking: "expiry-first",
      preferPrimary: false,
      sessionAffinityEnabled,
      sessionAffinityIdleTtlMs: 3_600_000,
      spillInflight: 0,
      setRoutingDecision: (decision) => decisions.push(decision),
    }).orderedAccounts;
  __testHooks.resetAllRuntimeState();
  sessionAffinity.clear();
  const now = Date.now();
  const decisions: ProxyAccountRoutingDecision[] = [];
  let whileCooling: ProxyPassthroughAccount[];
  let recoveredWithoutAffinity: ProxyPassthroughAccount[];
  let afterRecovery: ProxyPassthroughAccount[];
  try {
    __testHooks.setAccountRuntimeState(accountA.key, {
      coolingUntil: now + 5 * 60 * 1000,
      quota: makeQuota({}),
    });
    __testHooks.setAccountRuntimeState(accountB.key, { quota: makeQuota({}) });
    whileCooling = select(true, []);
    // Mirrors bind-on-success: B is the account that served the request.
    sessionAffinity.bind(sessionId, accountB.key, now);
    __testHooks.setAccountRuntimeState(accountA.key, {
      coolingUntil: undefined,
    });
    recoveredWithoutAffinity = select(false, []);
    afterRecovery = select(true, decisions);
  } finally {
    sessionAffinity.clear();
    __testHooks.resetAllRuntimeState();
  }
  if (whileCooling[0]?.key !== accountB.key) {
    log("expected A's cooldown to move the unbound request to B", "red");
    return false;
  }
  if (recoveredWithoutAffinity[0]?.key !== accountA.key) {
    log(
      "precondition failed: without affinity the recovered A should rank first again",
      "red",
    );
    return false;
  }
  if (afterRecovery[0]?.key !== accountB.key) {
    log("expected the session to stay on B after A's cooldown ended", "red");
    return false;
  }
  const decision = decisions[0];
  if (
    decision?.selectionReason !== "session_affinity" ||
    decision.affinity?.applied !== true
  ) {
    log("expected the routing decision to record affinity as applied", "red");
    return false;
  }
  return true;
}

/**
 * Review Focus "spill onto a capacity-saturated account": the spill reorder is
 * a pure ranking step and knows nothing about max-inflight-per-account. The
 * admission gate runs later, in the attempt loop, which moves on to the next
 * account when a lease is refused. So spill must still pick B, and B's cap
 * must still refuse a second concurrent lease.
 */
async function testSpillTargetStillSubjectToAdmissionCap(): Promise<boolean> {
  const { __testHooks } =
    await import("../src/lib/server/routes/claudeProxyRoutes.js");
  const accountA: ProxyPassthroughAccount = {
    key: "anthropic:a",
    label: "a",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const accountB: ProxyPassthroughAccount = {
    key: "anthropic:b",
    label: "b",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const spillInflight = 20;
  __testHooks.resetAllRuntimeState();
  sessionAffinity.clear();
  __testHooks.setAccountRuntimeState(accountA.key, { quota: makeQuota({}) });
  __testHooks.setAccountRuntimeState(accountB.key, { quota: makeQuota({}) });
  const leases: { release: () => void }[] = [];
  const decisions: ProxyAccountRoutingDecision[] = [];
  let bLeaseHeld = false;
  let orderedAccounts: ProxyPassthroughAccount[];
  let secondBLease: { release: () => void } | undefined;
  try {
    for (let i = 0; i < spillInflight + 5; i++) {
      const lease = __testHooks.tryAcquireAccountAdmission(
        accountA.key,
        undefined,
      );
      if (lease) {
        leases.push(lease);
      }
    }
    const bLease = __testHooks.tryAcquireAccountAdmission(accountB.key, 1);
    if (bLease) {
      leases.push(bLease);
      bLeaseHeld = true;
    }
    ({ orderedAccounts } = __testHooks.selectClaudeProxyAccountOrderForTests({
      enabledAccounts: [accountA, accountB],
      accountStrategy: "fill-first",
      primaryAccountKey: undefined,
      quotaRoutingEnabled: true,
      sessionSoftLimit: 0.97,
      sessionResetToleranceMs: 5 * 60 * 1000,
      ranking: "expiry-first",
      preferPrimary: false,
      sessionAffinityEnabled: false,
      sessionAffinityIdleTtlMs: 3_600_000,
      spillInflight,
      setRoutingDecision: (decision) => decisions.push(decision),
    }));
    secondBLease = __testHooks.tryAcquireAccountAdmission(accountB.key, 1);
  } finally {
    secondBLease?.release();
    for (const lease of leases) {
      lease.release();
    }
    __testHooks.resetAllRuntimeState();
  }
  if (!bLeaseHeld || leases.length !== spillInflight + 6) {
    log("precondition failed: the setup leases were not all granted", "red");
    return false;
  }
  if (orderedAccounts[0]?.key !== accountB.key) {
    log("expected spill to move B to the front once A crosses it", "red");
    return false;
  }
  const decision = decisions[0];
  if (
    decision?.selectionReason !== "spill_inflight" ||
    decision.spill?.to !== accountB.label
  ) {
    log("expected the routing decision to record the spill onto B", "red");
    return false;
  }
  if (secondBLease !== undefined) {
    log(
      "expected B's admission cap to still refuse a second concurrent lease after the spill",
      "red",
    );
    return false;
  }
  return true;
}

/**
 * Concurrent requests in one just-starting session: two parallel first
 * requests of one new session both route before either is served. Routing
 * must not bind (only a served response does), so both see the same unbound
 * order. The serve is simulated here with a direct bind; the route's own
 * bind-on-serve is covered through the real attempt loop in
 * test/continuous-test-suite-proxy-fallback-parent.ts. A request already in
 * flight keeps the order it read, and the next request follows the binding.
 */
async function testParallelUnboundSessionRequestsBindConsistently(): Promise<boolean> {
  const { __testHooks } =
    await import("../src/lib/server/routes/claudeProxyRoutes.js");
  const accountA: ProxyPassthroughAccount = {
    key: "anthropic:a",
    label: "a",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const accountB: ProxyPassthroughAccount = {
    key: "anthropic:b",
    label: "b",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const sessionId = "session-burst";
  const idleTtlMs = 3_600_000;
  const select = (
    decisions: ProxyAccountRoutingDecision[],
  ): ProxyPassthroughAccount[] =>
    __testHooks.selectClaudeProxyAccountOrderForTests({
      enabledAccounts: [accountA, accountB],
      accountStrategy: "fill-first",
      primaryAccountKey: undefined,
      quotaRoutingEnabled: true,
      sessionSoftLimit: 0.97,
      sessionResetToleranceMs: 5 * 60 * 1000,
      sessionId,
      ranking: "expiry-first",
      preferPrimary: false,
      sessionAffinityEnabled: true,
      sessionAffinityIdleTtlMs: idleTtlMs,
      spillInflight: 0,
      setRoutingDecision: (decision) => decisions.push(decision),
    }).orderedAccounts;
  const keysOf = (order: ProxyPassthroughAccount[]): string =>
    order.map((account) => account.key).join(",");
  __testHooks.resetAllRuntimeState();
  sessionAffinity.clear();
  __testHooks.setAccountRuntimeState(accountA.key, { quota: makeQuota({}) });
  __testHooks.setAccountRuntimeState(accountB.key, { quota: makeQuota({}) });
  const firstDecisions: ProxyAccountRoutingDecision[] = [];
  const secondDecisions: ProxyAccountRoutingDecision[] = [];
  const followUpDecisions: ProxyAccountRoutingDecision[] = [];
  let firstOrder: ProxyPassthroughAccount[];
  let secondOrder: ProxyPassthroughAccount[];
  let secondKeysWhenRead: string;
  let boundAfterRouting: string | undefined;
  let servedKey: string | undefined;
  let followUpOrder: ProxyPassthroughAccount[];
  try {
    firstOrder = select(firstDecisions);
    secondOrder = select(secondDecisions);
    secondKeysWhenRead = keysOf(secondOrder);
    boundAfterRouting = sessionAffinity.get(sessionId, Date.now(), idleTtlMs);
    servedKey = firstOrder[0]?.key;
    if (servedKey) {
      sessionAffinity.bind(sessionId, servedKey, Date.now());
    }
    followUpOrder = select(followUpDecisions);
  } finally {
    sessionAffinity.clear();
    __testHooks.resetAllRuntimeState();
  }
  if (boundAfterRouting !== undefined) {
    log(
      "expected routing alone to leave the new session unbound; only a served response binds",
      "red",
    );
    return false;
  }
  if (keysOf(firstOrder) !== keysOf(secondOrder)) {
    log(
      "expected two unbound requests for the same new session to see the same order",
      "red",
    );
    return false;
  }
  if (
    firstDecisions[0]?.affinity?.sessionBound !== false ||
    secondDecisions[0]?.affinity?.sessionBound !== false
  ) {
    log("expected both parallel decisions to record an unbound session", "red");
    return false;
  }
  if (keysOf(secondOrder) !== secondKeysWhenRead) {
    log(
      "expected the bind not to change the order an in-flight request already read",
      "red",
    );
    return false;
  }
  if (
    servedKey === undefined ||
    followUpOrder[0]?.key !== servedKey ||
    followUpDecisions[0]?.selectionReason !== "session_affinity"
  ) {
    log(
      "expected the next request in the session to follow the binding",
      "red",
    );
    return false;
  }
  return true;
}

/**
 * Spec Failure mode, entered from the affinity lookup rather than from spill
 * (the spill-throw cases above force that one). The lookup runs inside the policy
 * try on both fill-first paths. When it throws, the quota-ordered path must
 * serve plain expiry-first although headroom-first is configured, and the
 * quota-off path must serve its base rotation. Both record
 * routing_policy_error. The fixture ranks b first under headroom-first and a
 * first under expiry-first, so the fallback is visible in the order.
 */
async function testThrownRoutingPolicyFallsBackToExpiryFirst(): Promise<boolean> {
  const { __testHooks } =
    await import("../src/lib/server/routes/claudeProxyRoutes.js");
  const accountA: ProxyPassthroughAccount = {
    key: "anthropic:a",
    label: "a",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const accountB: ProxyPassthroughAccount = {
    key: "anthropic:b",
    label: "b",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const nowSec = Math.floor(Date.now() / 1000);
  const seedQuotas = (): void => {
    __testHooks.setAccountRuntimeState(accountA.key, {
      quota: makeQuota({
        sessionUsed: 0.5,
        sessionResetAt: nowSec + 2 * 3600,
        weeklyResetAt: nowSec + 86400,
      }),
    });
    __testHooks.setAccountRuntimeState(accountB.key, {
      quota: makeQuota({
        sessionUsed: 0.1,
        sessionResetAt: nowSec + 2 * 3600,
        weeklyResetAt: nowSec + 3 * 86400,
      }),
    });
  };
  const select = (
    quotaRoutingEnabled: boolean,
    decisions: ProxyAccountRoutingDecision[],
  ): ProxyPassthroughAccount[] =>
    __testHooks.selectClaudeProxyAccountOrderForTests({
      enabledAccounts: [accountA, accountB],
      accountStrategy: "fill-first",
      primaryAccountKey: undefined,
      quotaRoutingEnabled,
      sessionSoftLimit: 0.97,
      sessionResetToleranceMs: 5 * 60 * 1000,
      sessionId: "session-throws",
      ranking: "headroom-first",
      preferPrimary: false,
      sessionAffinityEnabled: true,
      sessionAffinityIdleTtlMs: 3_600_000,
      spillInflight: 0,
      setRoutingDecision: (decision) => decisions.push(decision),
    }).orderedAccounts;
  for (const quotaRoutingEnabled of [true, false]) {
    const path = quotaRoutingEnabled ? "quota-ordered" : "quota-off";
    __testHooks.resetAllRuntimeState();
    sessionAffinity.clear();
    seedQuotas();
    const expectedFirst = quotaRoutingEnabled
      ? __testHooks.orderAccountsByQuota(
          [accountA, accountB],
          Date.now(),
          undefined,
          0.97,
          5 * 60 * 1000,
        )[0]?.key
      : accountA.key;
    const decisions: ProxyAccountRoutingDecision[] = [];
    let policyOrder: ProxyPassthroughAccount[];
    let orderedAccounts: ProxyPassthroughAccount[] | undefined;
    let escaped = false;
    try {
      policyOrder = select(quotaRoutingEnabled, []);
      __testHooks.setForceAffinityLookupThrowForTests(true);
      try {
        orderedAccounts = select(quotaRoutingEnabled, decisions);
      } catch {
        escaped = true;
      }
    } finally {
      __testHooks.setForceAffinityLookupThrowForTests(false);
      sessionAffinity.clear();
      __testHooks.resetAllRuntimeState();
    }
    if (quotaRoutingEnabled && policyOrder[0]?.key !== accountB.key) {
      log(
        "fixture precondition failed: headroom-first should rank b first",
        "red",
      );
      return false;
    }
    if (expectedFirst !== accountA.key) {
      log(
        `fixture precondition failed: the ${path} fallback order should start with a`,
        "red",
      );
      return false;
    }
    if (escaped || !orderedAccounts) {
      log(
        `expected a thrown affinity lookup to be contained on the ${path} path`,
        "red",
      );
      return false;
    }
    if (
      orderedAccounts.length !== 2 ||
      orderedAccounts[0]?.key !== expectedFirst
    ) {
      log(`expected the ${path} path to serve its fallback order`, "red");
      return false;
    }
    if (decisions[0]?.selectionReason !== "routing_policy_error") {
      log(
        `expected selectionReason to record routing_policy_error on the ${path} path`,
        "red",
      );
      return false;
    }
  }
  return true;
}

/**
 * A routing-policy failure is logged once per call site and error, not once
 * per worker: a repeat stays quiet, but a different error at the same site,
 * or the same error at another site, must still reach the log. The quota-
 * ordered and quota-off policy catches are the two sites; the forced spill
 * and affinity-lookup throws are the two errors.
 */
async function testRoutingPolicyErrorLogDedupesPerSiteAndError(): Promise<boolean> {
  const { __testHooks } =
    await import("../src/lib/server/routes/claudeProxyRoutes.js");
  const accountA: ProxyPassthroughAccount = {
    key: "anthropic:a",
    label: "a",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const accountB: ProxyPassthroughAccount = {
    key: "anthropic:b",
    label: "b",
    type: "oauth",
  } as ProxyPassthroughAccount;
  let policyErrorLines = 0;
  const selectWithFault = (
    quotaRoutingEnabled: boolean,
    fault: "spill" | "lookup",
  ): void => {
    const setFault =
      fault === "spill"
        ? __testHooks.setForceSpillThrowForTests
        : __testHooks.setForceAffinityLookupThrowForTests;
    const originalConsoleLog = console.log;
    console.log = (...args: unknown[]): void => {
      if (String(args[0]).startsWith("[proxy] routing policy threw")) {
        policyErrorLines += 1;
        return;
      }
      originalConsoleLog(...args);
    };
    setFault(true);
    try {
      __testHooks.selectClaudeProxyAccountOrderForTests({
        enabledAccounts: [accountA, accountB],
        accountStrategy: "fill-first",
        primaryAccountKey: undefined,
        quotaRoutingEnabled,
        sessionSoftLimit: 0.97,
        sessionResetToleranceMs: 5 * 60 * 1000,
        sessionId: "session-log-dedupe",
        ranking: "expiry-first",
        preferPrimary: false,
        sessionAffinityEnabled: true,
        sessionAffinityIdleTtlMs: 3_600_000,
        spillInflight: 1,
        setRoutingDecision: () => undefined,
      });
    } finally {
      setFault(false);
      console.log = originalConsoleLog;
    }
  };
  const steps: ReadonlyArray<{
    label: string;
    quotaRoutingEnabled: boolean;
    fault: "spill" | "lookup";
    reset?: boolean;
    expectedLines: number;
  }> = [
    {
      label: "a first failure",
      quotaRoutingEnabled: true,
      fault: "spill",
      expectedLines: 1,
    },
    {
      label: "the same failure at the same site",
      quotaRoutingEnabled: true,
      fault: "spill",
      expectedLines: 1,
    },
    {
      label: "a different failure at the same site",
      quotaRoutingEnabled: true,
      fault: "lookup",
      expectedLines: 2,
    },
    {
      label: "the same failure at a different site",
      quotaRoutingEnabled: false,
      fault: "spill",
      expectedLines: 3,
    },
    {
      label: "a logged failure after resetAllRuntimeState",
      quotaRoutingEnabled: true,
      fault: "spill",
      reset: true,
      expectedLines: 4,
    },
  ];
  __testHooks.resetAllRuntimeState();
  sessionAffinity.clear();
  try {
    for (const step of steps) {
      if (step.reset) {
        __testHooks.resetAllRuntimeState();
      }
      selectWithFault(step.quotaRoutingEnabled, step.fault);
      if (policyErrorLines !== step.expectedLines) {
        log(
          `expected ${step.label} to leave ${step.expectedLines} routing-policy error log line(s), saw ${policyErrorLines}`,
          "red",
        );
        return false;
      }
    }
  } finally {
    sessionAffinity.clear();
    __testHooks.resetAllRuntimeState();
  }
  return true;
}

/**
 * A throw from the account metrics, under the default policy, is not a
 * routing-policy failure: it must propagate as it did before the policies
 * existed, never be recorded as routing_policy_error. The quota throws on its
 * first read only, so a policy catch that recomputed the metrics would
 * succeed and mislabel it.
 */
async function testMetricsThrowIsNotRoutingPolicyError(): Promise<boolean> {
  const { __testHooks } =
    await import("../src/lib/server/routes/claudeProxyRoutes.js");
  const accountA: ProxyPassthroughAccount = {
    key: "anthropic:a",
    label: "a",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const accountB: ProxyPassthroughAccount = {
    key: "anthropic:b",
    label: "b",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const decisions: ProxyAccountRoutingDecision[] = [];
  let quotaReads = 0;
  let escaped = false;
  __testHooks.resetAllRuntimeState();
  sessionAffinity.clear();
  try {
    __testHooks.setAccountRuntimeState(accountA.key, {
      quota: new Proxy(makeQuota({}), {
        get(target, property, receiver) {
          quotaReads += 1;
          if (quotaReads === 1) {
            throw new Error("forced failure for metrics throw test");
          }
          return Reflect.get(target, property, receiver);
        },
      }),
    });
    try {
      __testHooks.selectClaudeProxyAccountOrderForTests({
        enabledAccounts: [accountA, accountB],
        accountStrategy: "fill-first",
        primaryAccountKey: undefined,
        quotaRoutingEnabled: true,
        sessionSoftLimit: 0.97,
        sessionResetToleranceMs: 5 * 60 * 1000,
        ranking: "expiry-first",
        preferPrimary: false,
        sessionAffinityEnabled: false,
        sessionAffinityIdleTtlMs: 3_600_000,
        spillInflight: 0,
        setRoutingDecision: (decision) => decisions.push(decision),
      });
    } catch {
      escaped = true;
    }
  } finally {
    __testHooks.resetAllRuntimeState();
  }
  if (quotaReads === 0) {
    log(
      "fixture precondition failed: routing never read the throwing quota",
      "red",
    );
    return false;
  }
  if (
    decisions.some(
      (decision) => decision.selectionReason === "routing_policy_error",
    )
  ) {
    log(
      "expected a metrics failure not to be recorded as routing_policy_error",
      "red",
    );
    return false;
  }
  if (!escaped) {
    log(
      "expected a metrics failure to propagate rather than be caught as a policy error",
      "red",
    );
    return false;
  }
  return true;
}

/**
 * Spec Precedence rule 2: with prefer-primary on and no
 * binding, a usable primary that is not session-saturated goes first even
 * when the ranking puts another account ahead of it. A session-saturated or
 * unusable primary keeps its ranked place. The other account has both the
 * sooner weekly reset and more headroom, so it ranks first under either
 * ranking until prefer-primary applies.
 */
async function testPreferPrimaryTakesUsablePrimary(): Promise<boolean> {
  const { __testHooks } =
    await import("../src/lib/server/routes/claudeProxyRoutes.js");
  const primary: ProxyPassthroughAccount = {
    key: "anthropic:p",
    label: "p",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const other: ProxyPassthroughAccount = {
    key: "anthropic:q",
    label: "q",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const now = Date.now();
  const nowSec = Math.floor(now / 1000);
  const primaryStates: ReadonlyArray<{
    name: string;
    sessionUsed: number;
    coolingUntil: number | undefined;
    movesFirst: boolean;
  }> = [
    {
      name: "usable",
      sessionUsed: 0.5,
      coolingUntil: undefined,
      movesFirst: true,
    },
    {
      name: "session-saturated",
      sessionUsed: 0.98,
      coolingUntil: undefined,
      movesFirst: false,
    },
    {
      name: "unusable",
      sessionUsed: 0.5,
      coolingUntil: now + 5 * 60 * 1000,
      movesFirst: false,
    },
  ];
  const rankings = ["expiry-first", "headroom-first"] as const;
  const keysOf = (order: ProxyPassthroughAccount[]): string =>
    order.map((account) => account.key).join(",");
  for (const ranking of rankings) {
    for (const state of primaryStates) {
      const label = `${state.name} primary under ${ranking}`;
      __testHooks.resetAllRuntimeState();
      sessionAffinity.clear();
      __testHooks.setAccountRuntimeState(other.key, {
        quota: makeQuota({
          sessionUsed: 0.1,
          sessionResetAt: nowSec + 2 * 3600,
          weeklyResetAt: nowSec + 86400,
        }),
      });
      __testHooks.setAccountRuntimeState(primary.key, {
        coolingUntil: state.coolingUntil,
        quota: makeQuota({
          sessionUsed: state.sessionUsed,
          sessionResetAt: nowSec + 2 * 3600,
          weeklyResetAt: nowSec + 3 * 86400,
        }),
      });
      const select = (
        preferPrimary: boolean,
        decisions: ProxyAccountRoutingDecision[],
      ): ProxyPassthroughAccount[] =>
        __testHooks.selectClaudeProxyAccountOrderForTests({
          enabledAccounts: [other, primary],
          accountStrategy: "fill-first",
          primaryAccountKey: primary.key,
          quotaRoutingEnabled: true,
          sessionSoftLimit: 0.97,
          sessionResetToleranceMs: 5 * 60 * 1000,
          sessionId: undefined,
          ranking,
          preferPrimary,
          sessionAffinityEnabled: false,
          sessionAffinityIdleTtlMs: 3_600_000,
          spillInflight: 0,
          setRoutingDecision: (decision) => decisions.push(decision),
        }).orderedAccounts;
      const decisions: ProxyAccountRoutingDecision[] = [];
      let rankedOrder: ProxyPassthroughAccount[];
      let orderedAccounts: ProxyPassthroughAccount[];
      try {
        rankedOrder = select(false, []);
        orderedAccounts = select(true, decisions);
      } finally {
        __testHooks.resetAllRuntimeState();
      }
      if (rankedOrder[0]?.key !== other.key) {
        log(
          `fixture precondition failed for the ${label}: the ranking should put the other account first`,
          "red",
        );
        return false;
      }
      const reason = decisions[0]?.selectionReason;
      if (state.movesFirst) {
        if (
          orderedAccounts[0]?.key !== primary.key ||
          reason !== "preferred_primary"
        ) {
          log(
            `expected prefer-primary to put the ${label} first as preferred_primary`,
            "red",
          );
          return false;
        }
      } else if (
        keysOf(orderedAccounts) !== keysOf(rankedOrder) ||
        reason === "preferred_primary"
      ) {
        log(
          `expected prefer-primary to leave the ${label} in its ranked place`,
          "red",
        );
        return false;
      }
    }
  }
  return true;
}

async function testPreferPrimaryMatchesStoredKeySpelling(): Promise<boolean> {
  const { __testHooks } =
    await import("../src/lib/server/routes/claudeProxyRoutes.js");
  // resolvePrimaryAccountKey hands the route a normalized key, while the token
  // store keeps the spelling the account was saved under.
  const primary: ProxyPassthroughAccount = {
    key: "anthropic:Primary@Example.com",
    label: "Primary@Example.com",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const other: ProxyPassthroughAccount = {
    key: "anthropic:q",
    label: "q",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const nowSec = Math.floor(Date.now() / 1000);
  const decisions: ProxyAccountRoutingDecision[] = [];
  let orderedAccounts: ProxyPassthroughAccount[];
  try {
    __testHooks.resetAllRuntimeState();
    sessionAffinity.clear();
    __testHooks.setAccountRuntimeState(other.key, {
      quota: makeQuota({
        sessionUsed: 0.1,
        sessionResetAt: nowSec + 2 * 3600,
        weeklyResetAt: nowSec + 86400,
      }),
    });
    __testHooks.setAccountRuntimeState(primary.key, {
      quota: makeQuota({
        sessionUsed: 0.5,
        sessionResetAt: nowSec + 2 * 3600,
        weeklyResetAt: nowSec + 3 * 86400,
      }),
    });
    orderedAccounts = __testHooks.selectClaudeProxyAccountOrderForTests({
      enabledAccounts: [other, primary],
      accountStrategy: "fill-first",
      primaryAccountKey: "anthropic:primary@example.com",
      quotaRoutingEnabled: true,
      sessionSoftLimit: 0.97,
      sessionResetToleranceMs: 5 * 60 * 1000,
      sessionId: undefined,
      ranking: "expiry-first",
      preferPrimary: true,
      sessionAffinityEnabled: false,
      sessionAffinityIdleTtlMs: 3_600_000,
      spillInflight: 0,
      setRoutingDecision: (decision) => decisions.push(decision),
    }).orderedAccounts;
  } finally {
    __testHooks.resetAllRuntimeState();
  }
  if (
    orderedAccounts[0]?.key !== primary.key ||
    decisions[0]?.selectionReason !== "preferred_primary" ||
    decisions[0]?.configuredPrimaryMatched !== true
  ) {
    log(
      "expected prefer-primary to match a primary stored with different case",
      "red",
    );
    return false;
  }
  return true;
}

// ============================================================================
// Test Registration
// ============================================================================

/**
 * Categories that never touch the spawned proxy — they drive exported helpers
 * directly. A launchd-managed daemon makes the live cases unrunnable but says
 * nothing about these, and skipping them hides real regressions.
 */
const IN_PROCESS_CATEGORIES = new Set(["proxy-config", "proxy-primary"]);

const tests: TestFunction[] = [
  // Infrastructure (proxy lifecycle)
  { name: "Proxy Startup", fn: testProxyStartup, category: "proxy-infra" },
  {
    name: "Health Endpoint",
    fn: testProxyHealthEndpoint,
    category: "proxy-infra",
  },
  {
    name: "Status Endpoint",
    fn: testProxyStatusEndpoint,
    category: "proxy-infra",
  },
  {
    name: "Models Endpoint",
    fn: testProxyModelsEndpoint,
    category: "proxy-infra",
  },
  { name: "Count Tokens", fn: testProxyCountTokens, category: "proxy-infra" },

  // Primary account selection (run BEFORE API tests so /status fetches
  // happen while the proxy is still healthy — the upstream API tests
  // can hang on auth and break subsequent fetches).
  {
    name: "Primary: resolveHomeIndex",
    fn: testPrimaryResolveHomeIndex,
    category: "proxy-primary",
  },
  {
    name: "Primary: maybeResetPrimaryToHome",
    fn: testPrimaryMaybeResetToHome,
    category: "proxy-primary",
  },
  {
    name: "Quota: planCooldownFor429 (reset-based)",
    fn: testPlanCooldownFor429,
    category: "proxy-primary",
  },
  {
    name: "Quota: orderAccountsByQuota (soonest-reset-first)",
    fn: testOrderAccountsByQuota,
    category: "proxy-primary",
  },
  {
    name: "compareExpiryFirst: availability branch",
    fn: testCompareExpiryFirstAvailability,
    category: "proxy-primary",
  },
  {
    name: "accountRanking: matches route wrapper order",
    fn: testAccountRankingMatchesRouteWrapper,
    category: "proxy-primary",
  },
  {
    name: "accountRanking: rankAccounts reason names the deciding rung",
    fn: testRankAccountsReasonNamesDecidingRung,
    category: "proxy-primary",
  },
  {
    name: "compareHeadroomFirst: prefers more headroom",
    fn: testCompareHeadroomFirstPrefersMoreHeadroom,
    category: "proxy-primary",
  },
  {
    name: "compareHeadroomFirst: unknown headroom sorts last",
    fn: testCompareHeadroomFirstUnknownHeadroomSortsLast,
    category: "proxy-primary",
  },
  {
    name: "applyAffinityAndPrimary: affinity beats prefer-primary",
    fn: testApplyAffinityTakesPrecedenceOverPreferPrimary,
    category: "proxy-primary",
  },
  {
    name: "applyAffinityAndPrimary: skips unusable bound account",
    fn: testApplyAffinitySkipsUnusableBoundAccount,
    category: "proxy-primary",
  },
  {
    name: "rankAccounts: headroom-first with affinity",
    fn: testRankAccountsHeadroomFirstWithAffinity,
    category: "proxy-primary",
  },
  {
    name: "rankAccounts: omitted ranking defaults to expiry-first",
    fn: testRankAccountsDefaultsToExpiryFirstWhenRankingOmitted,
    category: "proxy-primary",
  },
  {
    name: "applySpill: moves under-threshold account to front",
    fn: testApplySpillMovesAccountUnderThreshold,
    category: "proxy-primary",
  },
  {
    name: "applySpill: no-op below threshold",
    fn: testApplySpillNoOpBelowThreshold,
    category: "proxy-primary",
  },
  {
    name: "applySpill: skips unusable account for a later usable one",
    fn: testApplySpillSkipsUnusableAccountForLaterUsable,
    category: "proxy-primary",
  },
  {
    name: "applySpill: no spill when every later account is unusable",
    fn: testApplySpillNoSpillWhenAllLaterAccountsUnusable,
    category: "proxy-primary",
  },
  {
    name: "applySpill: skips saturated account for a later eligible one",
    fn: testApplySpillSkipsSaturatedAccountForLaterEligible,
    category: "proxy-primary",
  },
  {
    name: "applySpill: no spill onto a saturated account",
    fn: testApplySpillNoSpillOntoSaturatedAccount,
    category: "proxy-primary",
  },
  {
    name: "applyAffinityAndPrimary: prefer-primary orders primary second after affinity",
    fn: testApplyAffinityAndPreferPrimaryOrdersPrimarySecond,
    category: "proxy-primary",
  },
  {
    name: "rankAccounts: deterministic and transitive (seeded)",
    fn: testRankAccountsIsDeterministicAndTransitive,
    category: "proxy-primary",
  },
  {
    name: "buildQuotaRoutingDecision: uses policySelectionReason override",
    fn: testBuildQuotaRoutingDecisionUsesPolicySelectionReason,
    category: "proxy-primary",
  },
  {
    name: "comparator rung table: every branch for both rankings",
    fn: testComparatorRungTableCoversEveryBranch,
    category: "proxy-primary",
  },
  {
    name: "admission: unlimited account in-flight counting",
    fn: testUnlimitedAccountInflightCounting,
    category: "proxy-infra",
  },
  {
    name: "admission: uncapped acquire admits waiters queued under a removed cap",
    fn: testUncappedAcquireAdmitsWaitersOfRemovedCap,
    category: "proxy-primary",
  },
  {
    name: "admission: stale uncapped acquire keeps waiters of a newly added cap queued",
    fn: testStaleUncappedAcquireKeepsWaitersOfAddedCap,
    category: "proxy-primary",
  },
  {
    name: "admission: uncapped acquire admits older waiters queued behind newer ones",
    fn: testUncappedAcquireAdmitsOlderWaitersBehindNewerOnes,
    category: "proxy-primary",
  },
  {
    name: "admission: unlimited stream lease released on end and cancel",
    fn: testUnlimitedStreamLeaseReleasedOnTerminal,
    category: "proxy-infra",
  },
  {
    name: "streaming success response: served discriminant on 502s vs genuine success",
    fn: testStreamingSuccessResponseServedDiscriminant,
    category: "proxy-infra",
  },
  {
    name: "Quota: weekly-expiry ordering + soft limit + freshening",
    fn: testWeeklyExpiryOrdering,
    category: "proxy-primary",
  },
  {
    name: "Quota: model-scoped caps gate routing",
    fn: testScopedQuotaRouting,
    category: "proxy-primary",
  },
  {
    name: "Quota: scoped windows parsed from live headers",
    fn: testScopedQuotaHeaderParsing,
    category: "proxy-primary",
  },
  {
    name: "Quota: scoped exhaustion gates eligibility",
    fn: testScopedExhaustionGate,
    category: "proxy-primary",
  },
  {
    name: "Quota: scoped sort needs a window on both sides",
    fn: testScopedSortNeedsBothWindows,
    category: "proxy-primary",
  },
  {
    name: "Quota: merge preserves provider configuration",
    fn: testQuotaMergePreservesProviderConfig,
    category: "proxy-primary",
  },
  {
    name: "sessionAffinity: bind and get",
    fn: testSessionAffinityBindAndGet,
    category: "proxy-primary",
  },
  {
    name: "sessionAffinity: idle expiry boundary",
    fn: testSessionAffinityIdleExpiryBoundary,
    category: "proxy-primary",
  },
  {
    name: "sessionAffinity: evicts least-recently-bound at cap",
    fn: testSessionAffinityEvictsAtCap,
    category: "proxy-primary",
  },
  {
    name: "sessionAffinity: countActive excludes idle-expired bindings",
    fn: testSessionAffinityCountActiveExcludesIdleExpired,
    category: "proxy-primary",
  },
  {
    name: "sessionAffinity: clear empties the store",
    fn: testSessionAffinityClear,
    category: "proxy-primary",
  },
  {
    name: "loadClaudeProxyAccounts: exposes resolved sessionId",
    fn: testLoadClaudeProxyAccountsExposesSessionId,
    category: "proxy-primary",
  },
  {
    name: "selectClaudeProxyAccountOrder: affinity applies with quota routing disabled",
    fn: testAffinityAppliesWithQuotaRoutingDisabled,
    category: "proxy-primary",
  },
  {
    name: "selectClaudeProxyAccountOrder: thrown spill on quota-off path restores base order",
    fn: testSpillThrowOnQuotaOffPathRestoresBaseOrder,
    category: "proxy-primary",
  },
  {
    name: "selectClaudeProxyAccountOrder: thrown spill on quota-ordered path falls back to expiry-first",
    fn: testSpillThrowOnQuotaOrderedPathFallsBackToExpiryFirst,
    category: "proxy-primary",
  },
  {
    name: "selectClaudeProxyAccountOrder: busy preferred primary spills an unbound request",
    fn: testPreferredPrimaryFirstChoiceSpills,
    category: "proxy-primary",
  },
  {
    name: "selectClaudeProxyAccountOrder: spill never splits a bound session",
    fn: testSpillNeverSplitsBoundSession,
    category: "proxy-primary",
  },
  {
    name: "selectClaudeProxyAccountOrder: default policy reproduces pre-policy ordering",
    fn: testDefaultPolicyReproducesPrePolicyOrdering,
    category: "proxy-primary",
  },
  {
    name: "selectClaudeProxyAccountOrder: round-robin ignores routing policies",
    fn: testRoundRobinIgnoresRoutingPolicies,
    category: "proxy-primary",
  },
  {
    name: "precedence: cooldown recovery does not unbind session",
    fn: testCooldownRecoveryDoesNotUnbindSession,
    category: "proxy-primary",
  },
  {
    name: "precedence: spill target still subject to admission cap",
    fn: testSpillTargetStillSubjectToAdmissionCap,
    category: "proxy-primary",
  },
  {
    name: "precedence: parallel unbound session requests bind consistently",
    fn: testParallelUnboundSessionRequestsBindConsistently,
    category: "proxy-primary",
  },
  {
    name: "precedence: thrown routing policy falls back to expiry-first",
    fn: testThrownRoutingPolicyFallsBackToExpiryFirst,
    category: "proxy-primary",
  },
  {
    name: "precedence: routing-policy error log dedupes per site and error",
    fn: testRoutingPolicyErrorLogDedupesPerSiteAndError,
    category: "proxy-primary",
  },
  {
    name: "precedence: a metrics throw is not a routing policy error",
    fn: testMetricsThrowIsNotRoutingPolicyError,
    category: "proxy-primary",
  },
  {
    name: "precedence: prefer-primary takes the usable primary",
    fn: testPreferPrimaryTakesUsablePrimary,
    category: "proxy-primary",
  },
  {
    name: "precedence: prefer-primary matches the stored key spelling",
    fn: testPreferPrimaryMatchesStoredKeySpelling,
    category: "proxy-primary",
  },
  {
    name: "OpenCode: config dir is XDG on all platforms",
    fn: testOpenCodeConfigDirIsXdgOnAllPlatforms,
    category: "proxy-config",
  },
  {
    name: "OpenCode: writer reports whether it wrote",
    fn: testOpenCodeWriterReportsWhetherItWrote,
    category: "proxy-config",
  },
  {
    name: "OpenCode: writer output is loadable by OpenCode",
    fn: testOpenCodeWriterOutputIsLoadable,
    category: "proxy-config",
  },
  {
    name: "OpenCode: legacy in-file snapshot migrates and heals",
    fn: testOpenCodeMigratesLegacyInFileSnapshot,
    category: "proxy-config",
  },
  {
    name: "Gemini CLI: restore respects a user repoint",
    fn: testGeminiRestoreRespectsAUserRepoint,
    category: "proxy-config",
  },
  {
    name: "Gemini CLI: a CRLF .env round-trips byte-exactly",
    fn: testGeminiRoundTripsCrlfExactly,
    category: "proxy-config",
  },
  {
    name: "Gemini CLI: duplicate managed keys are collapsed",
    fn: testGeminiCollapsesDuplicateManagedKeys,
    category: "proxy-config",
  },
  {
    name: "Gemini CLI: .env writer round-trips exactly",
    fn: testGeminiEnvWriterRoundTrip,
    category: "proxy-config",
  },
  {
    name: "OpenCode: a malformed snapshot never deletes user config",
    fn: testOpenCodeMalformedSnapshotIsIgnored,
    category: "proxy-config",
  },
  {
    name: "Gemini CLI: a malformed snapshot never loses user variables",
    fn: testGeminiMalformedSnapshotIsIgnored,
    category: "proxy-config",
  },
  {
    name: "Gemini CLI: restore keeps edits made after apply",
    fn: testGeminiRestoreKeepsPostApplyEdits,
    category: "proxy-config",
  },
  {
    name: "OpenCode: snapshot is scoped per config directory",
    fn: testOpenCodeSnapshotIsScopedPerConfigDir,
    category: "proxy-config",
  },
  {
    name: "Gemini CLI: apply refuses when the snapshot is unusable",
    fn: testGeminiApplyRefusesOnUnusableSnapshot,
    category: "proxy-config",
  },
  {
    name: "OpenCode: a partial legacy record is never restored from",
    fn: testOpenCodePartialLegacyRecordIsNotRestoredFrom,
    category: "proxy-config",
  },
  {
    name: "OpenCode: this config's snapshot outranks the global fallback",
    fn: testOpenCodePrefersInFileSnapshotOverGlobalFallback,
    category: "proxy-config",
  },
  {
    name: "OpenCode: an interrupted migration keeps the true original",
    fn: testOpenCodeInterruptedMigrationKeepsTrueOriginal,
    category: "proxy-config",
  },
  {
    name: "OpenCode: clearing one root keeps another root's legacy snapshot",
    fn: testOpenCodeClearKeepsOtherRootsLegacySnapshot,
    category: "proxy-config",
  },
  {
    name: "Gemini CLI: clear without a snapshot keeps the user's key",
    fn: testGeminiClearWithoutSnapshotKeepsTheKey,
    category: "proxy-config",
  },
  {
    name: "Gemini CLI: a stale snapshot is re-captured, not replayed",
    fn: testGeminiRecapturesStaleSnapshot,
    category: "proxy-config",
  },
  {
    name: "OpenCode: clear restores the user's own config",
    fn: testOpenCodeClearRestoresUserConfig,
    category: "proxy-config",
  },
  {
    name: "Proxy clients: Qwen restore leaves a user-edited credential",
    fn: testQwenRestoreLeavesUserEditedAuth,
    category: "proxy-config",
  },
  {
    name: "Proxy clients: Claude restore leaves a user-edited value",
    fn: testClaudeRestoreLeavesUserEditedValue,
    category: "proxy-config",
  },
  {
    name: "Proxy clients: OpenCode restore leaves a user-edited block",
    fn: testOpenCodeRestoreLeavesUserEditedBlock,
    category: "proxy-config",
  },
  {
    name: "Codex: model discovery route answers the CLI",
    fn: testCodexModelsDiscovery,
    category: "proxy-config",
  },
  {
    name: "Proxy clients: uninstall restores every client config",
    fn: testUninstallRestoresClientConfigs,
    category: "proxy-config",
  },
  {
    name: "Proxy clients: OpenCode re-snapshots after an unclean exit",
    fn: testOpenCodeReSnapshotsAfterUncleanExit,
    category: "proxy-config",
  },
  {
    name: "Proxy clients: Claude re-snapshots after an unclean exit",
    fn: testClaudeReSnapshotsAfterUncleanExit,
    category: "proxy-config",
  },
  {
    name: "Proxy clients: Qwen re-snapshots after an unclean exit",
    fn: testQwenReSnapshotsAfterUncleanExit,
    category: "proxy-config",
  },
  {
    name: "Analyze: a re-logged request merges instead of overwriting",
    fn: testAnalyzeMergesDoubleWrittenRequest,
    category: "proxy-config",
  },
  {
    name: "Analyze: usage survives a completion after the window edge",
    fn: testAnalyzeKeepsUsageAcrossWindowEdge,
    category: "proxy-config",
  },
  {
    name: "Ledger: a re-logged request is not double counted",
    fn: testLedgerDedupesRepeatedRequestId,
    category: "proxy-config",
  },
  {
    name: "Ledger: a token-less later record cannot erase usage",
    fn: testLedgerKeepsMaxTokensAcrossRecords,
    category: "proxy-config",
  },
  {
    name: "Ledger: each engine's usage lands on its own key",
    fn: testLedgerKeysCodexRowsByEngine,
    category: "proxy-config",
  },
  {
    name: "Ledger: costs at published rates and names unpriced models",
    fn: testLedgerCostsAndFlagsUnpriced,
    category: "proxy-config",
  },
  {
    name: "Ledger: a partially written line is not consumed",
    fn: testLedgerIgnoresPartialTrailingLine,
    category: "proxy-config",
  },
  {
    name: "Ledger: distinct requests sharing a client id stay separate",
    fn: testLedgerSeparatesDistinctRequestsSharingAnId,
    category: "proxy-config",
  },
  {
    name: "Accounts: every row is classified by kind",
    fn: testAccountsRowsAreClassifiedByKind,
    category: "proxy-config",
  },
  {
    name: "Accounts: the configured primary account is marked",
    fn: testAccountsMarksThePrimaryAccount,
    category: "proxy-config",
  },
  {
    name: "Accounts: quota windows reach consumers normalised",
    fn: testAccountsQuotaWindowsAreNormalised,
    category: "proxy-config",
  },
  {
    name: "Accounts: route joins quota, stats and usage with a labelled basis",
    fn: testAccountsRouteShape,
    category: "proxy-config",
  },
  {
    name: "Accounts: a removed login is omitted, a disabled one stays unrouted",
    fn: testAccountsOmitsRemovedLoginsKeepsDisabledOnes,
    category: "proxy-config",
  },
  {
    name: "Accounts: a Codex login sharing an email keeps its own row",
    fn: testAccountsKeepsCodexDistinctFromSameLabelAnthropic,
    category: "proxy-config",
  },
  {
    name: "Limits: a snapshot enumerates both engines' logins",
    fn: testLimitsSnapshotEnumeratesBothEngines,
    category: "proxy-config",
  },
  {
    name: "Analyze: exact rates are not reported as inferred",
    fn: testAnalyzePricingProvenance,
    category: "proxy-config",
  },
  {
    name: "Proxy clients: Claude restore refuses without a snapshot",
    fn: testClaudeRestoreRefusesWithoutSnapshot,
    category: "proxy-config",
  },
  {
    name: "Proxy clients: Claude configurator probes before writing",
    fn: testClaudeConfiguratorDetectsInstall,
    category: "proxy-config",
  },
  {
    name: "Proxy clients: Codex configurator probes before writing",
    fn: testCodexConfiguratorDetectsInstall,
    category: "proxy-config",
  },
  {
    name: "Proxy clients: Codex apply/restore round-trips a real config",
    fn: testCodexConfiguratorRoundTrip,
    category: "proxy-config",
  },
  {
    name: "Proxy clients: Grok configurator probes before writing",
    fn: testGrokConfiguratorDetectsInstall,
    category: "proxy-config",
  },
  {
    name: "Proxy clients: Grok apply/restore round-trips a real config",
    fn: testGrokConfiguratorRoundTrip,
    category: "proxy-config",
  },
  {
    name: "Proxy clients: Grok restore refuses without a snapshot",
    fn: testGrokRestoreRefusesWithoutSnapshot,
    category: "proxy-config",
  },
  {
    name: "Proxy clients: Grok restore refuses a foreign proxy URL",
    fn: testGrokRestoreRefusesForeignUrl,
    category: "proxy-config",
  },
  {
    name: "Proxy clients: Grok catalog windows and backends match upstream",
    fn: testGrokCatalogWindowsAndBackends,
    category: "proxy-config",
  },
  {
    name: "Proxy clients: Grok catalog reads YAML model-mappings",
    fn: testGrokYamlRoutedMappings,
    category: "proxy-config",
  },
  {
    name: "Proxy clients: Grok catalog follows proxy --config path",
    fn: testGrokCustomConfigPath,
    category: "proxy-config",
  },
  {
    name: "Proxy clients: Grok routed aliases use target windows and backends",
    fn: testGrokRoutedAliasUsesTargetMetadata,
    category: "proxy-config",
  },
  {
    name: "Proxy clients: Grok apply refuses an unreadable config.toml",
    fn: testGrokApplyRefusesUnreadableConfig,
    category: "proxy-config",
  },
  {
    name: "Proxy clients: Grok apply replaces a block Grok's own save unmarked",
    fn: testGrokApplyReplacesUnmarkedBlock,
    category: "proxy-config",
  },
  {
    name: "Proxy clients: Grok apply heals an orphaned begin marker",
    fn: testGrokApplyHealsOrphanBeginMarker,
    category: "proxy-config",
  },
  {
    name: "Proxy clients: Grok apply keeps a user model with a catalog id",
    fn: testGrokApplyKeepsUserModelWithCatalogId,
    category: "proxy-config",
  },
  {
    name: "Proxy clients: Grok restore removes unmarked and orphaned blocks",
    fn: testGrokRestoreRemovesDamagedBlock,
    category: "proxy-config",
  },
  {
    name: "Proxy clients: Grok apply leaves a matching config untouched",
    fn: testGrokApplySkipsUnchangedConfig,
    category: "proxy-config",
  },
  {
    name: "Proxy clients: Grok apply refuses a config with duplicate tables",
    fn: testGrokApplyRefusesDuplicateTables,
    category: "proxy-config",
  },
  {
    name: "Proxy clients: Codex apply replaces an unmarked provider",
    fn: testCodexApplyReplacesUnmarkedProvider,
    category: "proxy-config",
  },
  {
    name: "Proxy clients: Codex apply refuses a provider it did not write",
    fn: testCodexApplyRefusesForeignProvider,
    category: "proxy-config",
  },
  {
    name: "Proxy clients: config writes follow a symlinked config",
    fn: testClientConfigWritesFollowSymlinks,
    category: "proxy-config",
  },
  {
    name: "Proxy clients: config writes are atomic under a concurrent reader",
    fn: testClientConfigWritesAreAtomic,
    category: "proxy-config",
  },
  {
    name: "Proxy clients: atomic writes preserve config permissions",
    fn: testClientConfigWritesPreservePermissions,
    category: "proxy-config",
  },
  // Gemini CLI door: GOOGLE_GEMINI_BASE_URL round-trip through
  // /v1beta/models/:model:generateContent. Proves local routing/validation;
  // inference requires live opt-in and validates successful response shape.
  {
    name: "Gemini Door: generateContent",
    fn: testGeminiDoorGenerateContent,
    category: "proxy-api",
  },

  // Account Management,
  {
    name: "Ledger: usage splits by calling CLI and reconciles",
    fn: testLedgerSplitsUsageByClient,
    category: "proxy-config",
  },
  {
    name: "Tracking: every inbound door reaches the tracking middleware",
    fn: testEveryDoorIsTracked,
    category: "proxy-api",
  },
  {
    name: "Gemini Door: multi-turn history reaches the provider intact",
    fn: testGeminiMultiTurnHistoryReachesProvider,
    category: "proxy-api",
  },
  {
    name: "Gemini Door: continuing from a model turn reaches the provider",
    fn: testGeminiModelFinalTurnReachesProvider,
    category: "proxy-api",
  },
  {
    name: "Attribution: the request log records the calling CLI",
    fn: testPerClientAttribution,
  },
  {
    name: "Attribution: every configured client is attributable or documented",
    fn: testEveryConfiguredClientIsAttributable,
    category: "proxy-config",
  },
  {
    name: "Proxy clients: Qwen apply/restore round-trips a real settings file",
    fn: testQwenConfiguratorRoundTrip,
    category: "proxy-config",
  },
  {
    name: "Proxy clients: Copilot reports when its script is not sourced",
    fn: testCopilotReportsWhenItsScriptIsNotSourced,
    category: "proxy-config",
  },
  {
    name: "Proxy clients: Copilot env script sets a model id",
    fn: testCopilotEnvScriptSetsAModelId,
    category: "proxy-config",
  },
  {
    name: "Proxy clients: Copilot emits a sourceable env script",
    fn: testCopilotConfiguratorWritesEnvFile,
    category: "proxy-config",
  },
  {
    name: "Proxy clients: roster and apply order are pinned",
    fn: testProxyClientRoster,
    category: "proxy-config",
  },
  {
    name: "Proxy clients: applyAll reports each client independently",
    fn: testApplyAllReportsPerClient,
    category: "proxy-config",
  },
  {
    name: "Proxy clients: registry exposes the full configurator contract",
    fn: testProxyClientRegistryShape,
    category: "proxy-config",
  },
  {
    name: "Entitlement: detector tiers",
    fn: testEntitlementDetectors,
    category: "proxy-primary",
  },
  {
    name: "Entitlement: 403 rotates instead of failing the request",
    fn: testEntitlementRotation,
    category: "proxy-primary",
  },
  {
    name: "Entitlement: terminal 403 names cause and remedy",
    fn: testEntitlementTerminalResponse,
    category: "proxy-primary",
  },
  {
    name: "Entitlement: api_key 403 keeps its own diagnosis",
    fn: testApiKeyPermissionErrorKeepsItsDiagnosis,
    category: "proxy-primary",
  },
  {
    name: "Entitlement: 403 only when it explains the whole pool",
    fn: testEntitlementNeedsWholePool,
    category: "proxy-primary",
  },
  {
    name: "Cooldown: per-reason ceilings",
    fn: testCooldownReasonCeilings,
    category: "proxy-primary",
  },
  {
    name: "Cooldown: fresh quota recovery releases stale weekly state",
    fn: testQuotaRefreshReleasesRecoveredCooldown,
    category: "proxy-primary",
  },
  {
    name: "Cooldown: stale persisted entry clamped on load",
    fn: testPersistedCooldownClamp,
    category: "proxy-primary",
  },
  {
    name: "Cleanup: only broken credentials are deletable",
    fn: testCleanupRetainsUsableCredentials,
    category: "proxy-primary",
  },
  {
    name: "Quota: saveAccountQuota merges across restarts",
    fn: testSaveAccountQuotaMerges,
    category: "proxy-primary",
  },
  {
    name: "Quota: seedRuntimeQuotasFromDisk at boot",
    fn: testSeedRuntimeQuotasFromDisk,
    category: "proxy-primary",
  },
  {
    name: "Primary: parseRoutingConfig.primaryAccount",
    fn: testParseRoutingPrimaryAccount,
    category: "proxy-primary",
  },
  {
    name: "Legacy routing: null under either spelling holds the default",
    fn: testLegacyRoutingNullKeysHoldDefault,
    category: "proxy-config",
  },
  {
    name: "Legacy routing: null kebab falls through to non-null camel",
    fn: testLegacyRoutingKebabNullFallsThroughToCamel,
    category: "proxy-config",
  },
  {
    name: "Legacy routing: non-null kebab wins over a different non-null camel",
    fn: testLegacyRoutingKebabWinsOverDifferentCamelValue,
    category: "proxy-config",
  },
  {
    name: "Legacy routing: null key logs exactly one warning",
    fn: testLegacyRoutingNullKeyLogsWarning,
    category: "proxy-config",
  },
  {
    name: "Legacy routing: both spellings null still warns exactly once",
    fn: testLegacyRoutingBothSpellingsNullWarnsOnce,
    category: "proxy-config",
  },
  {
    name: "Legacy routing: null kebab with non-null camel logs no warning",
    fn: testLegacyRoutingNullKebabWithCamelValueLogsNoWarning,
    category: "proxy-config",
  },
  {
    name: "Primary: /status fallback (no primary configured)",
    fn: testStatusPrimaryAccountFallback,
    // Reads /status over HTTP, so it needs the spawned proxy — it must stay
    // outside IN_PROCESS_CATEGORIES or a launchd-managed environment turns its
    // skip into a failed fetch.
    category: "proxy-infra",
  },
  {
    name: "CLI: /status reports the active routing policy",
    fn: testStatusReportsRoutingPolicy,
    // Spawns its own proxy from the built CLI, so like every case that needs a
    // live proxy it stays outside IN_PROCESS_CATEGORIES.
    category: "proxy-infra",
  },
  {
    name: "CLI: invalid routing policy value rejects the whole reload",
    fn: testInvalidRoutingPolicyValueRejectsWholeReload,
    category: "proxy-infra",
  },
  {
    name: "CLI: hot reload updates the active policy",
    fn: testHotReloadUpdatesActivePolicy,
    category: "proxy-infra",
  },
  {
    name: "Primary: CLI set-primary/get-primary/clear-primary roundtrip",
    fn: testCliPrimaryRoundtrip,
    category: "proxy-primary",
  },

  // Error Handling
  {
    name: "Invalid Body Error",
    fn: testProxyInvalidBody,
    category: "proxy-errors",
  },
  {
    name: "Missing Model Error",
    fn: testProxyMissingModel,
    category: "proxy-errors",
  },

  // Real API (may skip if no token)
  {
    name: "Non-Streaming Request",
    fn: testProxyNonStreaming,
    category: "proxy-api",
  },
  { name: "Streaming Request", fn: testProxyStreaming, category: "proxy-api" },
  { name: "Tool Use", fn: testProxyToolUse, category: "proxy-api" },
  {
    name: "Multi-Turn Conversation",
    fn: testProxyMultiTurn,
    category: "proxy-api",
  },
  {
    name: "Streaming Tool Use",
    fn: testProxyStreamingToolUse,
    category: "proxy-api",
  },

  // Account Management
  {
    name: "Account Loading",
    fn: testAccountLoading,
    category: "proxy-accounts",
  },
  { name: "Usage Stats", fn: testUsageStats, category: "proxy-stats" },

  // Configuration
  {
    name: "Config Loading",
    fn: testProxyConfigLoading,
    category: "proxy-config",
  },
  {
    name: "proxyConfig: rejects invalid account-ranking",
    fn: testValidateProxyConfigRejectsBadAccountRanking,
    category: "proxy-config",
  },
  {
    name: "proxyConfig: rejects out-of-range spill-inflight",
    fn: testValidateProxyConfigRejectsOutOfRangeSpill,
    category: "proxy-config",
  },
  {
    name: "proxyConfig: parses camelCase sessionAffinityIdleTtlMs",
    fn: testParseRoutingConfigAcceptsCamelCaseAffinityTtl,
    category: "proxy-config",
  },
  {
    name: "proxyConfig: rejects invalid prefer-primary",
    fn: testValidateProxyConfigRejectsBadPreferPrimary,
    category: "proxy-config",
  },
  {
    name: "proxyConfig: rejects invalid session-affinity",
    fn: testValidateProxyConfigRejectsBadSessionAffinity,
    category: "proxy-config",
  },
  {
    name: "proxyConfig: rejects invalid session-affinity-idle-ttl-ms",
    fn: testValidateProxyConfigRejectsBadAffinityIdleTtl,
    category: "proxy-config",
  },
  {
    name: "proxyConfig: rejects null routing policy keys under either spelling",
    fn: testValidateProxyConfigRejectsNullUnderEitherSpelling,
    category: "proxy-config",
  },

  // Shutdown (must be last)
  { name: "Proxy Shutdown", fn: testProxyShutdown, category: "proxy-infra" },
];

// ============================================================================
// Test Runner
// ============================================================================

// 180s rather than the shared 240s default, because the proxy under test is
// one this repo builds and spawns rather than a remote endpoint that deserves
// the benefit of the doubt.
//
// That is not the whole picture and the earlier wording here was wrong: nine
// cases gate on `hasValidCredentials()` and, when it is true, do reach
// Anthropic through the spawned proxy. So a breach is USUALLY a defect and
// occasionally a slow upstream. 180s is still comfortably above a live
// round-trip; a case that legitimately needs longer should carry its own bound
// rather than have this one raised for everyone.
//
// `withCaseTimeout` rejects, and the message was checked against
// isExpectedProviderError() so it reports as a FAILURE rather than being
// swallowed as a skip.
const CASE_TIMEOUT_MS = 180_000;

async function runAllTests(): Promise<void> {
  if (!fs.existsSync("dist") || !fs.existsSync("dist/cli/index.js")) {
    log("Build artifacts not found. Run: pnpm run build:cli", "red");
    process.exit(1);
  }
  const credStatus = hasValidCredentials()
    ? "credentials found"
    : "no credentials (API tests will skip)";
  log(`Credential check: ${credStatus}\n`, "cyan");

  try {
    for (const test of tests) {
      // If startup detected a launchd-managed local proxy, every downstream
      // test would FAIL with "fetch failed" — skip them all so the result is
      // SKIP instead of cascading FAILs.
      if (
        proxyLaunchdManaged &&
        test.name !== "Proxy Startup" &&
        !IN_PROCESS_CATEGORIES.has(test.category ?? "")
      ) {
        recordTest(test.name, false, true, "launchd-managed proxy detected");
        continue;
      }
      try {
        const result = await withCaseTimeout(
          test.name,
          test.fn,
          CASE_TIMEOUT_MS,
        );
        recordTest(
          test.name,
          result === true,
          result === null,
          result === null ? "skipped" : result === true ? undefined : "failed",
        );
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        recordTest(test.name, false, false, msg);

        // A case bound is not an ordinary failure: Promise.race cannot cancel, so
        // the abandoned case is still running. Continuing would run the loop's
        // cleanup and inter-case delay underneath live work, and record every
        // remaining case as "not run". Stop at the first one.
        if (isCaseTimeout(error)) {
          log(
            `\n\u{1F6D1} ABORTING: "${test.name}" was abandoned by its timeout and is still executing. ` +
              `Remaining cases are NOT run — this process no longer has clean state.`,
            "red",
          );
          break;
        }
      }
      if (test.category === "proxy-api") {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  } finally {
    await stopProxy();
    fs.rmSync(TEST_HOME, { recursive: true, force: true });
  }
}

await runSuite(runAllTests);
