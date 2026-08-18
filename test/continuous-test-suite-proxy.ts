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

import { defineSuite, log, logSection } from "./helpers/harness.js";

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

function makeQuota(
  over: Record<string, number | string>,
): Record<string, number | string> {
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

  log("planCooldownFor429: 4 cases passed", "green");
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
    name: "Primary: /status fallback (no primary configured)",
    fn: testStatusPrimaryAccountFallback,
    // Reads /status over HTTP, so it needs the spawned proxy — it must stay
    // outside IN_PROCESS_CATEGORIES or a launchd-managed environment turns its
    // skip into a failed fetch.
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

  // Shutdown (must be last)
  { name: "Proxy Shutdown", fn: testProxyShutdown, category: "proxy-infra" },
];

// ============================================================================
// Test Runner
// ============================================================================

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
        const result = await test.fn();
        recordTest(
          test.name,
          result === true,
          result === null,
          result === null ? "skipped" : result === true ? undefined : "failed",
        );
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        recordTest(test.name, false, false, msg);
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
