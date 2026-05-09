#!/usr/bin/env tsx

/**
 * Continuous Test Suite — Claude Proxy
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

type ColorName =
  | "reset"
  | "bright"
  | "red"
  | "green"
  | "yellow"
  | "blue"
  | "magenta"
  | "cyan";

// ============================================================================
// Color helpers
// ============================================================================

const colors: Record<ColorName, string> = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

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
  status: "PASS" | "FAIL" | "TESTING" | "SKIP",
  details = "",
): void {
  const icon =
    status === "PASS"
      ? "PASS"
      : status === "FAIL"
        ? "FAIL"
        : status === "SKIP"
          ? "SKIP"
          : "TEST";
  const color: ColorName =
    status === "PASS" ? "green" : status === "FAIL" ? "red" : "yellow";
  log(`[${icon}] ${testName}`, color);
  if (details) {
    log(`   ${details}`, "reset");
  }
}

// ============================================================================
// Proxy management
// ============================================================================

let proxyProcess: ChildProcess | null = null;
const PROXY_PORT = 9876; // Non-standard port for testing
const PROXY_URL = `http://127.0.0.1:${PROXY_PORT}`;

/**
 * Anthropic model used for the proxy round-trip tests.
 * Reviewer follow-up: previously hardcoded `claude-sonnet-4-20250514` in
 * every request; now matches the rest of the suite by reading
 * `ANTHROPIC_MODEL` (config-parser fixtures at the bottom of the file
 * stay literal because they assert on the YAML they emitted).
 */
const PROXY_TEST_MODEL =
  process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";

// State file management: the proxy CLI uses a single global state file to
// prevent multiple instances.  We back it up before our test run and restore
// it afterwards so an already-running proxy on a different port is unaffected.
const PROXY_STATE_PATH = path.join(
  os.homedir(),
  ".neurolink",
  "proxy-state.json",
);
let savedProxyState: string | null = null;
let proxyStateExisted = false;

function backupAndClearProxyState(): void {
  try {
    savedProxyState = fs.readFileSync(PROXY_STATE_PATH, "utf8");
    proxyStateExisted = true;
    fs.unlinkSync(PROXY_STATE_PATH);
    log("Backed up and cleared existing proxy-state.json", "cyan");
  } catch {
    savedProxyState = null; // file did not exist
    proxyStateExisted = false;
  }
}

function restoreProxyState(): void {
  if (proxyStateExisted && savedProxyState !== null) {
    try {
      fs.writeFileSync(PROXY_STATE_PATH, savedProxyState);
      log("Restored original proxy-state.json", "cyan");
    } catch {
      /* best effort */
    }
  } else {
    // File did not exist before tests — remove any file created during tests
    try {
      if (fs.existsSync(PROXY_STATE_PATH)) {
        fs.unlinkSync(PROXY_STATE_PATH);
        log("Removed proxy-state.json created during tests", "cyan");
      }
    } catch {
      /* best effort */
    }
  }
}

// Claude Code settings backup: the proxy auto-writes ANTHROPIC_BASE_URL into
// ~/.claude/settings.json.  We snapshot it before the test and restore after.
const CLAUDE_SETTINGS_PATH = path.join(
  os.homedir(),
  ".claude",
  "settings.json",
);
let savedClaudeSettings: string | null = null;
let claudeSettingsExisted = false;

function backupClaudeSettings(): void {
  try {
    savedClaudeSettings = fs.readFileSync(CLAUDE_SETTINGS_PATH, "utf8");
    claudeSettingsExisted = true;
  } catch {
    savedClaudeSettings = null;
    claudeSettingsExisted = false;
  }
}

function restoreClaudeSettings(): void {
  if (claudeSettingsExisted && savedClaudeSettings !== null) {
    try {
      fs.writeFileSync(CLAUDE_SETTINGS_PATH, savedClaudeSettings);
      log("Restored original Claude settings.json", "cyan");
    } catch {
      /* best effort */
    }
  } else {
    // File did not exist before tests — remove any file created during tests
    try {
      if (fs.existsSync(CLAUDE_SETTINGS_PATH)) {
        fs.unlinkSync(CLAUDE_SETTINGS_PATH);
        log("Removed settings.json created during tests", "cyan");
      }
    } catch {
      /* best effort */
    }
  }
}

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

  // Remove stale state file so the CLI does not refuse to start
  backupAndClearProxyState();

  // Backup Claude Code settings (proxy auto-configures ANTHROPIC_BASE_URL)
  backupClaudeSettings();

  return new Promise<boolean>((resolve) => {
    proxyProcess = spawn(
      process.execPath,
      [cliPath, "proxy", "start", "--port", String(PROXY_PORT), "--quiet"],
      {
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env, NEUROLINK_SKIP_MCP: "true" },
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
      object?: string;
      data?: Array<{
        id?: string;
        object?: string;
        created?: number;
        owned_by?: string;
      }>;
    };

    if (body.object !== "list") {
      log(`Expected object="list", got "${body.object}"`, "red");
      return false;
    }
    if (!Array.isArray(body.data) || body.data.length === 0) {
      log("Expected non-empty data array", "red");
      return false;
    }

    // Validate shape of each model entry
    for (const model of body.data) {
      if (
        typeof model.id !== "string" ||
        typeof model.object !== "string" ||
        typeof model.created !== "number" ||
        typeof model.owned_by !== "string"
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
      to: "claude-sonnet-4-20250514"
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
      parsed.routing.modelMappings[0].to === "claude-sonnet-4-20250514";
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
  __testHooks.setConfiguredPrimaryAccountKey(undefined);
  if (__testHooks.resolveHomeIndex(accts) !== 0) {
    log("resolveHomeIndex: undefined key did not return 0", "red");
    return false;
  }

  // Case: key resolves to its index
  __testHooks.setConfiguredPrimaryAccountKey("anthropic:b@test");
  if (__testHooks.resolveHomeIndex(accts) !== 1) {
    log(
      "resolveHomeIndex: did not return correct index for present key",
      "red",
    );
    return false;
  }

  // Case: key not in list → 0
  __testHooks.setConfiguredPrimaryAccountKey("anthropic:missing@test");
  if (__testHooks.resolveHomeIndex(accts) !== 0) {
    log("resolveHomeIndex: missing key did not fall back to 0", "red");
    return false;
  }

  // Case: empty enabledAccounts → 0
  __testHooks.setConfiguredPrimaryAccountKey("anthropic:b@test");
  if (__testHooks.resolveHomeIndex([]) !== 0) {
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
  __testHooks.setConfiguredPrimaryAccountKey("anthropic:b@test");
  __testHooks.setPrimaryAccountIndex(2);
  __testHooks.maybeResetPrimaryToHome(accts);
  if (__testHooks.getPrimaryAccountIndex() !== 1) {
    log(
      `maybeResetPrimaryToHome: expected index 1 after reset to home, got ${__testHooks.getPrimaryAccountIndex()}`,
      "red",
    );
    return false;
  }

  // Already at home → no-op
  __testHooks.maybeResetPrimaryToHome(accts);
  if (__testHooks.getPrimaryAccountIndex() !== 1) {
    log("maybeResetPrimaryToHome: should have stayed at home", "red");
    return false;
  }

  // Home is cooling → does NOT reset
  __testHooks.setPrimaryAccountIndex(2);
  __testHooks.setAccountRuntimeState("anthropic:b@test", {
    coolingUntil: Date.now() + 60_000,
  });
  __testHooks.maybeResetPrimaryToHome(accts);
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
  __testHooks.maybeResetPrimaryToHome(accts);
  if (__testHooks.getPrimaryAccountIndex() !== 1) {
    log(
      "maybeResetPrimaryToHome: should have reset after cooling expired",
      "red",
    );
    return false;
  }

  // Configured key absent in enabledAccounts → home falls back to 0
  __testHooks.resetAllRuntimeState();
  __testHooks.setConfiguredPrimaryAccountKey("anthropic:missing@test");
  __testHooks.setPrimaryAccountIndex(2);
  __testHooks.maybeResetPrimaryToHome(accts);
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
    name: "Primary: parseRoutingConfig.primaryAccount",
    fn: testParseRoutingPrimaryAccount,
    category: "proxy-primary",
  },
  {
    name: "Primary: /status fallback (no primary configured)",
    fn: testStatusPrimaryAccountFallback,
    category: "proxy-primary",
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
  logSection("Claude Proxy End-to-End Test Suite");
  log(
    "Testing proxy server lifecycle, endpoints, and real API requests\n",
    "bright",
  );

  const startTime = Date.now();

  // Prerequisite: check build
  log("Checking build prerequisites...", "cyan");
  if (!fs.existsSync("dist") || !fs.existsSync("dist/cli/index.js")) {
    log("Build artifacts not found. Run: pnpm run build:cli", "red");
    process.exit(1);
  }
  log("Build artifacts found", "green");

  const credStatus = hasValidCredentials()
    ? "credentials found"
    : "no credentials (API tests will skip)";
  log(`Credential check: ${credStatus}\n`, "cyan");

  const results: TestResult[] = [];

  try {
    for (const test of tests) {
      try {
        const result = await test.fn();
        results.push({ name: test.name, result, error: null });
        if (result === true) {
          logTest(test.name, "PASS", "");
        } else if (result === false) {
          logTest(test.name, "FAIL", "");
        } else {
          logTest(test.name, "SKIP", "");
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        results.push({ name: test.name, result: false, error: msg });
        logTest(test.name, "FAIL", msg);
      }

      // Small delay between API tests to avoid rate-limiting
      if (test.category === "proxy-api") {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  } finally {
    // Safety: ensure proxy is stopped even if shutdown test failed
    await stopProxy();

    // Restore original proxy state file so any pre-existing proxy is unaffected
    restoreProxyState();

    // Restore Claude Code settings
    restoreClaudeSettings();
  }

  // Summary
  logSection("Test Results Summary");

  const passed = results.filter((r) => r.result === true).length;
  const failed = results.filter((r) => r.result === false).length;
  const skipped = results.filter((r) => r.result === null).length;
  const total = results.length;
  const duration = Math.round((Date.now() - startTime) / 1000);

  results.forEach((test) => {
    const status: "PASS" | "FAIL" | "SKIP" =
      test.result === true ? "PASS" : test.result === false ? "FAIL" : "SKIP";
    const details = test.error
      ? test.error
      : test.result === null
        ? "SKIPPED"
        : "";
    logTest(test.name, status, details);
  });

  log(
    `\nResults: ${passed} passed, ${failed} failed, ${skipped} skipped out of ${total} tests in ${duration}s`,
    "bright",
  );

  if (failed === 0) {
    log("All non-skipped tests passed!", "green");
    process.exit(0);
  } else {
    log(`${failed} test(s) failed. See details above.`, "red");
    process.exit(1);
  }
}

runAllTests();
