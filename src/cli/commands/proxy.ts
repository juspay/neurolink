/**
 * Proxy CLI Commands for NeuroLink
 *
 * Implements commands for managing the Claude multi-account proxy:
 * - neurolink proxy start  — Start the proxy server
 * - neurolink proxy status — Show proxy status (accounts, sessions, routing)
 *
 * The proxy creates a NeuroLink instance and builds a Hono app that registers
 * Claude-compatible proxy routes. All requests flow through ctx.neurolink
 * (generate/stream), with an optional ModelRouter for model remapping.
 */

import type { CommandModule, Argv } from "yargs";
import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import chalk from "chalk";
import ora from "ora";
import type { Hono } from "hono";
import {
  buildProxyHealthResponse,
  createProxyReadinessState,
  markProxyReady,
  waitForProxyReadiness,
} from "../../lib/proxy/proxyHealth.js";
import { logger } from "../../lib/utils/logger.js";
import { withTimeout } from "../../lib/utils/async/withTimeout.js";
import {
  formatUptime,
  isProcessRunning,
  StateFileManager,
} from "../utils/serverUtils.js";
import type {
  AccountAllowlist,
  FallbackInfo,
  LoadedProxyConfig,
  ModelRouterInterface,
  ProxyGuardArgs,
  ProxyNeurolinkRuntime,
  ProxySpinner,
  ProxyStartApp,
  ProxyStartArgs,
  ProxyStartStrategy,
  ProxyState,
  ProxyStatusArgs,
  ProxyStatusPrimaryAccount,
  ProxyTelemetryAction,
  ProxyTelemetryArgs,
  ProxyRuntimeActivity,
  ProxyRuntimeConfigSnapshot,
  RuntimeRequestMetadata,
  StatusStats,
} from "../../lib/types/index.js";
import { configureProxyKeepAliveDispatcher } from "../../lib/proxy/proxyDispatcher.js";
import { ProxyRuntimeConfigStore } from "../../lib/proxy/runtimeConfig.js";
import {
  anthropicAccountKeysEqual,
  createAccountAllowlist,
  ENV_ANTHROPIC_ACCOUNT_KEY,
  isAccountAllowed,
  LEGACY_ANTHROPIC_ACCOUNT_KEY,
  normalizeAnthropicAccountKey,
  shouldLoadFallbackCredential,
} from "../../lib/proxy/accountSelection.js";
import {
  beginProxyRequest,
  getProxyActivitySnapshot,
  trackProxyResponse,
} from "../../lib/proxy/proxyActivity.js";
import {
  flushProxyLifecycleEvents,
  getProxyLifecycleLoggerSnapshot,
  hashProxyLifecycleSessionId,
  logProxyLifecycleEvent,
} from "../../lib/proxy/proxyLifecycle.js";
import {
  describeInstallFailure,
  getGlobalInstallArgs,
  resolveGlobalInstaller,
  validateInstalledVersion,
} from "../../lib/proxy/globalInstaller.js";
import { startUpdaterWorkerSupervisor } from "../../lib/proxy/updaterSupervisor.js";
import {
  abandonPendingUpdate,
  isVersionSuppressed,
  loadUpdateState,
  recordCheck,
  recordSuccessfulUpdate,
  recordUpdateFailure,
  recordUpdateInstalled,
  suppressVersion,
} from "../../lib/proxy/updateState.js";
import {
  loadProxyEnvFile,
  resolveProxyEnvFile,
} from "../../lib/proxy/proxyEnv.js";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import packageJson from "../../../package.json" with { type: "json" };

const _require = createRequire(import.meta.url);
const PROXY_VERSION = packageJson.version;

const PROXY_TELEMETRY_SCRIPT_PATH = fileURLToPath(
  new URL(
    "../../../scripts/observability/manage-local-openobserve.sh",
    import.meta.url,
  ),
);
const PROXY_LIFECYCLE_SHUTDOWN_TIMEOUT_MS = 5_000;

// =============================================================================
// STATE MANAGEMENT
// =============================================================================

let proxyStateManager = new StateFileManager<ProxyState>("proxy-state.json");

/**
 * Reinitialise the state manager with a custom base directory.
 * Called when --dev redirects writable paths to .neurolink-dev/.
 */
function setProxyStateDir(baseDir: string): void {
  proxyStateManager = new StateFileManager<ProxyState>(
    "proxy-state.json",
    baseDir,
  );
}

function saveProxyState(state: ProxyState): void {
  proxyStateManager.save(state);
}

function loadProxyState(): ProxyState | null {
  return proxyStateManager.load();
}

function clearProxyState(): void {
  proxyStateManager.clear();
}

const CLAUDE_SETTINGS_PATH = join(homedir(), ".claude", "settings.json");

const PLIST_LABEL = "com.neurolink.proxy";
const PLIST_DIR = join(homedir(), "Library", "LaunchAgents");
const PLIST_PATH = join(PLIST_DIR, `${PLIST_LABEL}.plist`);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getProcessStatus(pid: number): "running" | "not_running" | "unknown" {
  try {
    process.kill(pid, 0);
    return "running";
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ESRCH") {
      return "not_running";
    }
    if (code === "EPERM") {
      return "unknown";
    }
    return "not_running";
  }
}

/** Resolve the primary-account info shown in /status. Reads the operator's
 *  configured email from proxy config and cross-checks it against the token
 *  store; falls back to the first enabled anthropic account when not set or
 *  when the configured account isn't currently usable. */
async function resolveStatusPrimaryAccount(
  proxyConfig: LoadedProxyConfig | null,
): Promise<ProxyStatusPrimaryAccount> {
  const configured = proxyConfig?.routing?.primaryAccount?.trim() || null;
  const accountAllowlist = createAccountAllowlist(
    proxyConfig?.routing?.accountAllowlist,
  );
  let enabledAnthropicKeys: string[] = [];
  try {
    const { tokenStore } = await import("../../lib/auth/tokenStore.js");
    const all = await tokenStore.listByPrefix("anthropic:");
    const filtered: string[] = [];
    for (const key of all) {
      const disabled = await tokenStore.isDisabled(key);
      if (!disabled && isAccountAllowed(key, accountAllowlist)) {
        filtered.push(key);
      }
    }
    enabledAnthropicKeys = filtered;
  } catch (err) {
    logger.debug(
      `[proxy] /status: failed to enumerate anthropic accounts: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }

  if (configured) {
    const configuredKey = normalizeAnthropicAccountKey(configured);
    const matchedKey = enabledAnthropicKeys.find((key) =>
      anthropicAccountKeysEqual(key, configuredKey),
    );
    if (matchedKey) {
      return {
        configured,
        key: matchedKey,
        label: configured,
        source: "configured",
      };
    }
  }

  const fallbackKey = enabledAnthropicKeys[0] ?? null;
  const fallbackLabel = fallbackKey
    ? (fallbackKey.split(":")[1] ?? null)
    : null;
  return {
    configured,
    key: fallbackKey,
    label: fallbackLabel,
    source: "fallback",
  };
}

/**
 * Check if the launchd service is loaded and actively managing the proxy.
 * Returns true if launchctl reports the service as running.
 */
async function isLaunchdManaging(): Promise<boolean> {
  if (process.platform !== "darwin") {
    return false;
  }
  try {
    const { execFileSync } = await import("node:child_process");
    const uid = process.getuid?.() ?? 501;
    const output = execFileSync(
      "launchctl",
      ["print", `gui/${uid}/${PLIST_LABEL}`],
      { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
    );
    return /state\s*=\s*running/.test(output);
  } catch {
    return false;
  }
}

function isLaunchdManagedProcess(): boolean {
  return process.platform === "darwin" && process.ppid === 1;
}

function isProxyAutoUpdateEnabled(
  value = process.env.NEUROLINK_PROXY_AUTO_UPDATE,
): boolean {
  return !["0", "off", "false"].includes((value ?? "").trim().toLowerCase());
}

/** Keys we manage in Claude Code's settings.env */
const PROXY_MANAGED_KEYS = ["ANTHROPIC_BASE_URL", "ENABLE_TOOL_SEARCH"];

async function setClaudeProxySettings(baseUrl: string): Promise<void> {
  const fs = await import("fs");
  let settings: Record<string, unknown> = {};
  try {
    settings = JSON.parse(fs.readFileSync(CLAUDE_SETTINGS_PATH, "utf8"));
  } catch {
    // file missing/invalid — create fresh settings object
  }

  const env = (settings.env ?? {}) as Record<string, string>;

  // Preserve original values so clearClaudeProxySettings can restore them.
  // Only snapshot once — subsequent calls should not overwrite the snapshot.
  const originals = ((settings as Record<string, unknown>)
    .__proxy_original_env ?? {}) as Record<string, string | null>;
  for (const key of PROXY_MANAGED_KEYS) {
    if (!(key in originals)) {
      originals[key] = key in env ? env[key] : null;
    }
  }
  (settings as Record<string, unknown>).__proxy_original_env = originals;

  env.ANTHROPIC_BASE_URL = baseUrl;
  env.ENABLE_TOOL_SEARCH = "true";
  settings.env = env;

  fs.writeFileSync(CLAUDE_SETTINGS_PATH, JSON.stringify(settings, null, 2));
}

async function clearClaudeProxySettings(
  expectedBaseUrl?: string,
): Promise<boolean> {
  const fs = await import("fs");
  let settings: Record<string, unknown>;
  try {
    settings = JSON.parse(fs.readFileSync(CLAUDE_SETTINGS_PATH, "utf8"));
  } catch {
    return false;
  }

  const env = settings.env as Record<string, string> | undefined;
  if (!env) {
    return false;
  }

  if (
    expectedBaseUrl &&
    typeof env.ANTHROPIC_BASE_URL === "string" &&
    env.ANTHROPIC_BASE_URL !== expectedBaseUrl
  ) {
    // User switched to a different proxy URL; do not clobber.
    return false;
  }

  const hadBaseUrl = typeof env.ANTHROPIC_BASE_URL === "string";
  const hadToolSearch = env.ENABLE_TOOL_SEARCH === "true";

  // Restore original values if they were saved, otherwise delete the keys
  const originals = ((settings as Record<string, unknown>)
    .__proxy_original_env ?? {}) as Record<string, string | null>;
  for (const key of PROXY_MANAGED_KEYS) {
    const original = originals[key];
    if (original !== undefined && original !== null) {
      // Restore the value that existed before the proxy was started
      env[key] = original;
    } else {
      // Key did not exist before — remove it
      delete env[key];
    }
  }
  delete (settings as Record<string, unknown>).__proxy_original_env;

  if (Object.keys(env).length === 0) {
    delete settings.env;
  } else {
    settings.env = env;
  }

  fs.writeFileSync(CLAUDE_SETTINGS_PATH, JSON.stringify(settings, null, 2));
  return hadBaseUrl || hadToolSearch;
}

// =============================================================================
// OPENCODE AUTO-CONFIGURATION
// =============================================================================

function getOpenCodeConfigDir(): string {
  if (process.platform === "darwin") {
    return join(homedir(), "Library", "Application Support", "opencode");
  }
  // Linux/other: XDG_CONFIG_HOME or ~/.config
  return join(
    process.env.XDG_CONFIG_HOME || join(homedir(), ".config"),
    "opencode",
  );
}

const OPENCODE_CONFIG_PATH = join(getOpenCodeConfigDir(), "opencode.json");

/**
 * Key under which we persist the snapshot of the user's pre-existing
 * `provider.neurolink` config inside `opencode.json` itself. Persisting (rather
 * than relying on in-process state) means restoration still works even if the
 * proxy crashes or shutdown handlers run in a different process.
 *
 * Mirrors the Claude pattern (`__proxy_original_env` inside Claude's settings).
 */
const OPENCODE_ORIGINAL_KEY = "__proxy_original_neurolink";

async function setOpenCodeProxySettings(
  baseUrl: string,
  proxyKey?: string,
): Promise<void> {
  const fs = await import("fs");

  const configDir = getOpenCodeConfigDir();
  try {
    fs.accessSync(configDir);
  } catch {
    // OpenCode not installed — config directory does not exist, skip silently
    return;
  }

  let config: Record<string, unknown>;
  try {
    config = JSON.parse(fs.readFileSync(OPENCODE_CONFIG_PATH, "utf8"));
  } catch {
    // file missing/invalid — create fresh config object
    config = { provider: {} };
  }

  const provider = (config.provider ?? {}) as Record<string, unknown>;

  // Persist a snapshot of the user's pre-existing provider.neurolink — but
  // only the first time we touch the file. Subsequent set() calls must NOT
  // overwrite the snapshot (otherwise after the proxy writes its own block,
  // the next set() would store the proxy's block as the "original" and
  // permanently lose the user's real config on the next clear()).
  if (!(OPENCODE_ORIGINAL_KEY in config)) {
    (config as Record<string, unknown>)[OPENCODE_ORIGINAL_KEY] =
      "neurolink" in provider
        ? JSON.parse(JSON.stringify(provider.neurolink))
        : null;
  }

  provider.neurolink = {
    id: "neurolink",
    name: "NeuroLink Proxy",
    npm: "@ai-sdk/openai-compatible",
    env: [],
    models: {},
    options: {
      baseURL: baseUrl,
      apiKey: proxyKey || "neurolink-proxy",
    },
  };

  config.provider = provider;
  fs.writeFileSync(OPENCODE_CONFIG_PATH, JSON.stringify(config, null, 2));
}

async function clearOpenCodeProxySettings(
  expectedBaseUrl?: string,
): Promise<boolean> {
  const fs = await import("fs");
  let config: Record<string, unknown>;
  try {
    config = JSON.parse(fs.readFileSync(OPENCODE_CONFIG_PATH, "utf8"));
  } catch {
    return false;
  }

  const provider = config.provider as Record<string, unknown> | undefined;
  if (!provider || !("neurolink" in provider)) {
    return false;
  }

  // Check if our proxy URL matches before removing
  const existing = provider.neurolink as Record<string, unknown> | undefined;
  if (expectedBaseUrl && existing) {
    const options = existing.options as Record<string, unknown> | undefined;
    if (options && typeof options.baseURL === "string") {
      if (options.baseURL !== expectedBaseUrl) {
        // User configured a different URL; do not clobber
        return false;
      }
    }
  }

  const hadNeurolink = "neurolink" in provider;

  // Restore from the snapshot persisted at first set(), regardless of process
  // identity. Only delete provider.neurolink when the snapshot says the user
  // explicitly had no entry before — never on an "undefined" snapshot, since
  // that would mean the snapshot was lost and we cannot prove the entry is ours.
  if (OPENCODE_ORIGINAL_KEY in config) {
    const snapshot = (config as Record<string, unknown>)[OPENCODE_ORIGINAL_KEY];
    if (snapshot === null) {
      // User had no provider.neurolink before the proxy started — safe to remove.
      delete provider.neurolink;
    } else {
      provider.neurolink = snapshot;
    }
    delete (config as Record<string, unknown>)[OPENCODE_ORIGINAL_KEY];
  } else {
    // No snapshot present — refuse to delete to avoid destroying a config
    // the proxy may not own (e.g. a user wrote their own `neurolink` block
    // before the snapshot key was introduced, or this is being cleared from
    // a process that never ran set()).
    logger.debug(
      "[proxy] OpenCode clear: no original-provider snapshot found, leaving provider.neurolink intact",
    );
    return false;
  }

  config.provider = provider;
  fs.writeFileSync(OPENCODE_CONFIG_PATH, JSON.stringify(config, null, 2));
  return hadNeurolink;
}

async function isProxyHealthy(
  host: string,
  port: number,
  timeoutMs: number,
): Promise<boolean> {
  try {
    const response = await fetch(`http://${host}:${port}/health`, {
      signal: AbortSignal.timeout(timeoutMs),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function getProxyRuntimeActivity(
  host: string,
  port: number,
  timeoutMs: number = 3_000,
): Promise<ProxyRuntimeActivity | null> {
  try {
    const response = await fetch(`http://${host}:${port}/status`, {
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as {
      activity?: Partial<ProxyRuntimeActivity>;
    };
    const activeRequests = Number(payload.activity?.activeRequests);
    if (!Number.isFinite(activeRequests) || activeRequests < 0) {
      return null;
    }
    return {
      activeRequests,
      lastActivityAt:
        typeof payload.activity?.lastActivityAt === "string"
          ? payload.activity.lastActivityAt
          : null,
    };
  } catch {
    return null;
  }
}

function isSafeUpdateWindow(
  activity: ProxyRuntimeActivity,
  quietThresholdMs: number,
  nowMs: number = Date.now(),
): boolean {
  if (activity.activeRequests > 0) {
    return false;
  }
  if (!activity.lastActivityAt) {
    return true;
  }
  const lastActivityMs = Date.parse(activity.lastActivityAt);
  return (
    Number.isFinite(lastActivityMs) &&
    nowMs - lastActivityMs >= quietThresholdMs
  );
}

// ---------------------------------------------------------------------------
// Stable entrypoint for launchd
// ---------------------------------------------------------------------------

/**
 * Path to a small trampoline script that the plist invokes.
 * The trampoline re-resolves `neurolink` via PATH on every launch,
 * so launchd never gets pinned to a version-specific store path.
 */
const TRAMPOLINE_DIR = join(homedir(), ".neurolink", "bin");
const TRAMPOLINE_PATH = join(TRAMPOLINE_DIR, "neurolink-proxy");

/**
 * Verify a candidate bin path actually runs by invoking `--version` on it.
 * Returns the version string on success, or undefined on any failure.
 */
function probeBinVersion(binPath: string): string | undefined {
  try {
    const { execFileSync } = _require(
      "node:child_process",
    ) as typeof import("node:child_process");
    const out = execFileSync(binPath, ["--version"], {
      encoding: "utf8",
      timeout: 5_000,
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return out || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Write (or overwrite) the trampoline shell script.
 *
 * Defensive design: the trampoline tries multiple candidates in order and
 * only `exec`s one whose `--version` check succeeds. If every PATH-based
 * candidate is broken (stale shims, missing packages), it falls back to the
 * baked-in `node + script` path that was verified to work at install time.
 */
function writeTrampoline(): void {
  const { writeFileSync, mkdirSync, existsSync, chmodSync } = _require(
    "fs",
  ) as typeof import("fs");
  if (!existsSync(TRAMPOLINE_DIR)) {
    mkdirSync(TRAMPOLINE_DIR, { recursive: true });
  }

  // Baked-in fallback: the specific node + JS script currently running
  // (guaranteed to work, since we ARE running). Used only if all PATH-based
  // candidates fail their --version probe.
  const bakedNode = process.execPath;
  const bakedScript = process.argv[1] ?? join(__dirname, "..", "index.js");

  // Shell-escape the baked paths (they shouldn't contain quotes in practice,
  // but be safe for paths with spaces).
  const shEscape = (s: string) => `'${s.replace(/'/g, "'\\''")}'`;

  const script = `#!/bin/sh
# Auto-generated by \`neurolink proxy install\` — do not edit.
# Resolves a working neurolink binary on every launchd invocation so the
# plist never gets pinned to a broken/stale shim.

# Probe a candidate: must be executable and respond to --version cleanly.
_try() {
  [ -n "$1" ] && [ -x "$1" ] || return 1
  "$1" --version >/dev/null 2>&1 || return 1
  return 0
}

# 1. Explicit user override (escape hatch for broken environments).
if [ -n "\${NEUROLINK_BIN:-}" ]; then
  if _try "$NEUROLINK_BIN"; then
    exec "$NEUROLINK_BIN" "$@"
  fi
  echo "[neurolink-proxy] WARN: NEUROLINK_BIN=$NEUROLINK_BIN is not runnable, trying defaults" >&2
fi

# 2. PATH-based and common install locations. First working one wins.
for cand in \\
    "$(command -v neurolink 2>/dev/null || true)" \\
    "\${PNPM_HOME:-}/neurolink" \\
    "$HOME/.local/share/pnpm/neurolink" \\
    "$HOME/Library/pnpm/neurolink" \\
    "/usr/local/bin/neurolink" \\
    "/opt/homebrew/bin/neurolink"; do
  if _try "$cand"; then
    exec "$cand" "$@"
  fi
done

# 3. Baked-in fallback: the exact node + script that worked at install time.
#    Always valid at install time; may become stale after package updates
#    (but at that point the PATH candidates above should work).
BAKED_NODE=${shEscape(bakedNode)}
BAKED_SCRIPT=${shEscape(bakedScript)}
if [ -x "$BAKED_NODE" ] && [ -f "$BAKED_SCRIPT" ]; then
  exec "$BAKED_NODE" "$BAKED_SCRIPT" "$@"
fi

echo "[neurolink-proxy] FATAL: no working neurolink binary found." >&2
echo "[neurolink-proxy] Tried: PATH, \\$PNPM_HOME, \\$HOME/.local/share/pnpm, \\$HOME/Library/pnpm, /usr/local/bin, /opt/homebrew/bin, baked-in install path." >&2
echo "[neurolink-proxy] Fix: reinstall with 'pnpm add -g @juspay/neurolink' or set NEUROLINK_BIN=/path/to/working/neurolink." >&2
exit 127
`;
  writeFileSync(TRAMPOLINE_PATH, script, { mode: 0o755 });
  chmodSync(TRAMPOLINE_PATH, 0o755);
}

function spawnFailOpenGuard(
  host: string,
  port: number,
  parentPid: number,
): number | undefined {
  // The guard runs the same version as this process, so process.argv[1]
  // (the currently-running script) is correct here — no stale-path risk.
  const entryScript = process.argv[1];
  if (!entryScript) {
    return undefined;
  }

  const args = [
    entryScript,
    "proxy",
    "guard",
    "--host",
    host,
    "--port",
    String(port),
    "--parent-pid",
    String(parentPid),
    "--quiet",
  ];

  // Write guard stdout/stderr to a log file instead of discarding them.
  const { openSync, closeSync, mkdirSync, existsSync } = _require(
    "fs",
  ) as typeof import("fs");
  const guardLogDir = join(homedir(), ".neurolink", "logs");
  if (!existsSync(guardLogDir)) {
    mkdirSync(guardLogDir, { recursive: true });
  }
  const guardLogPath = join(guardLogDir, "proxy-guard.log");
  const logFd = openSync(guardLogPath, "a");

  try {
    const child = spawn(process.execPath, args, {
      detached: true,
      stdio: ["ignore", logFd, logFd],
    });
    child.unref();
    return child.pid;
  } catch (error) {
    logger.debug(
      `[proxy] failed to start fail-open guard: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return undefined;
  } finally {
    closeSync(logFd); // parent closes its copy; child keeps the fd
  }
}

function spawnProxyUpdater(
  host: string,
  port: number,
  parentPid: number,
): number | undefined {
  if (!isProxyAutoUpdateEnabled()) {
    logger.always("[proxy] automatic updates disabled by environment");
    return undefined;
  }

  const entryScript = process.argv[1];
  if (!entryScript) {
    logger.always("[proxy] updater disabled: CLI entry script is unavailable");
    return undefined;
  }

  const args = [
    entryScript,
    "proxy",
    "guard",
    "--host",
    host,
    "--port",
    String(port),
    "--parent-pid",
    String(parentPid),
    "--updater-only",
    "--quiet",
  ];
  const { openSync, closeSync, mkdirSync, existsSync } = _require(
    "fs",
  ) as typeof import("fs");
  const logsDir = join(homedir(), ".neurolink", "logs");
  if (!existsSync(logsDir)) {
    mkdirSync(logsDir, { recursive: true });
  }
  const logFd = openSync(join(logsDir, "proxy-updater.log"), "a");

  try {
    const child = spawn(process.execPath, args, {
      detached: true,
      stdio: ["ignore", logFd, logFd],
      env: process.env,
    });
    child.once("error", (error) => {
      logger.always(
        `[proxy] updater worker error pid=${child.pid ?? "unknown"}: ${error.message}`,
      );
    });
    child.once("exit", (code, signal) => {
      logger.always(
        `[proxy] updater worker exited pid=${child.pid ?? "unknown"} code=${code ?? "none"} signal=${signal ?? "none"}`,
      );
    });
    child.unref();
    return child.pid;
  } catch (error) {
    logger.always(
      `[proxy] updater failed to start: ${error instanceof Error ? error.message : String(error)}`,
    );
    return undefined;
  } finally {
    closeSync(logFd);
  }
}

async function runProxyTelemetryManager(command: string): Promise<void> {
  const { existsSync } = await import("fs");
  if (!existsSync(PROXY_TELEMETRY_SCRIPT_PATH)) {
    throw new Error(
      "Proxy telemetry helper files were not found in this installation. Reinstall NeuroLink with observability assets included.",
    );
  }

  await new Promise<void>((resolve, reject) => {
    const child = spawn("bash", [PROXY_TELEMETRY_SCRIPT_PATH, command], {
      stdio: "inherit",
      env: process.env,
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("exit", (code, signal) => {
      if (signal) {
        reject(
          new Error(
            `proxy telemetry ${command} terminated by signal ${signal}`,
          ),
        );
        return;
      }
      if (code !== 0) {
        reject(
          new Error(`proxy telemetry ${command} exited with code ${code ?? 1}`),
        );
        return;
      }
      resolve();
    });
  });
}

// =============================================================================
// STARTUP BANNER
// =============================================================================

function printProxyBanner(url: string, strategy: string): void {
  logger.always("");
  logger.always(chalk.bold.cyan("NeuroLink Claude Proxy"));
  logger.always(chalk.gray("=".repeat(50)));
  logger.always("");
  logger.always(`  ${chalk.bold("URL:")}        ${chalk.cyan(url)}`);
  logger.always(`  ${chalk.bold("Strategy:")}   ${chalk.cyan(strategy)}`);
  logger.always(`  ${chalk.bold("PID:")}        ${chalk.cyan(process.pid)}`);
  logger.always("");
  logger.always(chalk.bold("Endpoints:"));
  logger.always(
    `  ${chalk.blue("POST")} /v1/messages         — Claude proxy (Anthropic format)`,
  );
  logger.always(
    `  ${chalk.blue("POST")} /v1/chat/completions — OpenAI-compatible proxy`,
  );
  logger.always(`  ${chalk.green("GET")}  /health              — Health check`);
  logger.always(
    `  ${chalk.green("GET")}  /status              — Detailed status`,
  );
  logger.always("");
  logger.always(chalk.bold("Set in Claude Code:"));
  logger.always(`  ${chalk.cyan(`ANTHROPIC_BASE_URL=${url}`)}`);
  logger.always("");
  logger.always(chalk.gray("Press Ctrl+C to stop the proxy"));
  logger.always("");
}

export function mapClaudeErrorTypeToStatus(errorType?: string): number {
  switch (errorType) {
    case "invalid_request_error":
      return 400;
    case "authentication_error":
      return 401;
    case "permission_error":
      return 403;
    case "not_found_error":
      return 404;
    case "request_too_large":
      return 413;
    case "rate_limit_error":
      return 429;
    case "overloaded_error":
      return 529;
    case "api_error":
    default:
      return 502;
  }
}

function getProxyRuntimeErrorCode(error: unknown): string | undefined {
  let current = error;
  for (let depth = 0; depth < 3; depth += 1) {
    if (!current || typeof current !== "object") {
      return undefined;
    }
    const code = (current as { code?: unknown }).code;
    if (typeof code === "string") {
      return code;
    }
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}

async function ensureProxyStartAllowed(spinner: ProxySpinner): Promise<void> {
  const ignoreLaunchd =
    process.env.NEUROLINK_PROXY_IGNORE_LAUNCHD === "1" ||
    process.env.NEUROLINK_PROXY_IGNORE_LAUNCHD === "true";
  const existingState = loadProxyState();
  if (existingState) {
    if (isProcessRunning(existingState.pid)) {
      // Test / dev escape hatch: when NEUROLINK_PROXY_IGNORE_LAUNCHD is set,
      // allow starting a second proxy on the test's requested port even if
      // a launchd-managed instance is using a different port (its state
      // file is what we hit here). The shared port-conflict surface remains
      // — node will fail to bind if the requested port is actually busy.
      if (!ignoreLaunchd) {
        if (spinner) {
          spinner.fail(
            chalk.red(
              `Proxy already running on port ${existingState.port} (PID: ${existingState.pid})`,
            ),
          );
        }
        logger.always(
          chalk.yellow(
            "Stop it first or use 'neurolink proxy status' to inspect",
          ),
        );
        process.exit(process.ppid === 1 ? 0 : 1);
      }
    } else {
      clearProxyState();
    }
  }

  if (process.ppid === 1 || !(await isLaunchdManaging())) {
    return;
  }

  // Test / dev escape hatch: when starting on an explicit non-default port,
  // the launchd-managed proxy (typically on its own port) cannot conflict.
  // Setting `NEUROLINK_PROXY_IGNORE_LAUNCHD=1` lets the test suite start a
  // standalone proxy alongside the launchd one without removing the daemon.
  if (
    process.env.NEUROLINK_PROXY_IGNORE_LAUNCHD === "1" ||
    process.env.NEUROLINK_PROXY_IGNORE_LAUNCHD === "true"
  ) {
    return;
  }

  if (spinner) {
    spinner.fail(
      chalk.red(
        "Proxy is managed by launchd. Manual start would cause port conflicts.",
      ),
    );
  }
  logger.always(
    chalk.yellow(
      "Use 'neurolink proxy uninstall' to remove the service first, " +
        "or 'launchctl kickstart gui/$(id -u)/com.neurolink.proxy' to restart.",
    ),
  );
  process.exit(1);
}

async function loadProxyStartEnv(
  argv: ProxyStartArgs,
  spinner: ProxySpinner,
): Promise<string | undefined> {
  try {
    const envResult = await loadProxyEnvFile({
      explicitEnvFile: argv.envFile,
    });
    if (spinner && envResult.path) {
      spinner.text = `Loaded proxy env from ${envResult.path}`;
    }
    return envResult.path;
  } catch (error) {
    if (spinner) {
      spinner.fail(
        chalk.red(error instanceof Error ? error.message : String(error)),
      );
    }
    process.exit(1);
  }
}

async function createProxyNeurolinkRuntime(logsDir?: string) {
  process.env.NEUROLINK_SKIP_MCP = "true";

  const { NeuroLink } = await import("../../lib/neurolink.js");
  const neurolink = new NeuroLink();
  const { initRequestLogger, cleanupLogs } =
    await import("../../lib/proxy/requestLogger.js");

  initRequestLogger(true, logsDir);
  cleanupLogs(7, 500);

  return { neurolink, cleanupLogs };
}

function registerProxyRequestTracking(
  app: Hono,
  requestMetadata: WeakMap<Request, RuntimeRequestMetadata>,
): void {
  app.use("/v1/*", async (c, next) => {
    const startedMonotonicMs = performance.now();
    const contentLengthHeader = c.req.raw.headers.get("content-length");
    const rawContentLength =
      contentLengthHeader === null ? Number.NaN : Number(contentLengthHeader);
    const requestBytes =
      Number.isFinite(rawContentLength) && rawContentLength >= 0
        ? rawContentLength
        : undefined;
    const sessionId =
      c.req.raw.headers.get("x-neurolink-session-id") ??
      c.req.raw.headers.get("x-claude-code-session-id") ??
      undefined;
    const sessionHash = hashProxyLifecycleSessionId(sessionId);
    const metadata: RuntimeRequestMetadata = {
      requestId: crypto.randomUUID(),
      method: c.req.method,
      path: c.req.path,
      startedAt: Date.now(),
      model: "-",
      stream: false,
      toolCount: 0,
    };
    requestMetadata.set(c.req.raw, metadata);
    const finishActivity = beginProxyRequest();
    const finish = () => {
      finishActivity();
      requestMetadata.delete(c.req.raw);
    };
    // The route adapter populates model/stream/toolCount after parsing. Omit
    // them at acceptance instead of publishing misleading placeholder values;
    // subsequent events carry the parsed metadata under the same request ID.
    logProxyLifecycleEvent({
      event: "request_accepted",
      requestId: metadata.requestId,
      method: metadata.method,
      path: metadata.path,
      sessionHash,
      requestBytes,
      elapsedMs: 0,
      monotonicMs: startedMonotonicMs,
    });
    try {
      await next();
      const responseStatus = c.res.status;
      logProxyLifecycleEvent({
        event: "response_headers",
        requestId: metadata.requestId,
        method: metadata.method,
        path: metadata.path,
        model: metadata.model,
        stream: metadata.stream,
        toolCount: metadata.toolCount,
        sessionHash,
        requestBytes,
        responseStatus,
        elapsedMs: performance.now() - startedMonotonicMs,
      });
      c.res = trackProxyResponse(c.res, finish, {
        onFirstChunk: ({ observedBodyBytes, responseChunks }) => {
          logProxyLifecycleEvent({
            event: "response_first_chunk",
            requestId: metadata.requestId,
            method: metadata.method,
            path: metadata.path,
            model: metadata.model,
            stream: metadata.stream,
            toolCount: metadata.toolCount,
            sessionHash,
            requestBytes,
            responseStatus,
            observedBodyBytes,
            responseChunks,
            elapsedMs: performance.now() - startedMonotonicMs,
          });
        },
        onTerminal: ({ outcome, observedBodyBytes, responseChunks }) => {
          logProxyLifecycleEvent({
            event: "request_terminal",
            requestId: metadata.requestId,
            method: metadata.method,
            path: metadata.path,
            model: metadata.model,
            stream: metadata.stream,
            toolCount: metadata.toolCount,
            sessionHash,
            requestBytes,
            responseStatus,
            observedBodyBytes,
            responseChunks,
            elapsedMs: performance.now() - startedMonotonicMs,
            terminalOutcome: outcome,
            errorType: metadata.terminalErrorType,
            errorCode: metadata.terminalErrorCode,
          });
        },
      });
    } catch (error) {
      // Keep metadata available to app.onError, which records the client-facing
      // failure with the same request ID before deleting the WeakMap entry.
      finishActivity();
      logProxyLifecycleEvent({
        event: "request_terminal",
        requestId: metadata.requestId,
        method: metadata.method,
        path: metadata.path,
        model: metadata.model,
        stream: metadata.stream,
        toolCount: metadata.toolCount,
        sessionHash,
        requestBytes,
        elapsedMs: performance.now() - startedMonotonicMs,
        terminalOutcome: "handler_error",
        errorType: error instanceof Error ? error.name : "unknown_error",
        errorCode: getProxyRuntimeErrorCode(error),
      });
      throw error;
    }
  });
}

export async function createProxyStartApp(params: {
  neurolink: ProxyNeurolinkRuntime["neurolink"];
  modelRouter: ModelRouterInterface | undefined;
  strategy: ProxyStartStrategy;
  passthrough: boolean;
  port: number;
  host: string;
  proxyConfig: LoadedProxyConfig | null;
  primaryAccountKey: string | undefined;
  accountAllowlist: AccountAllowlist | undefined;
  runtimeConfigStore?: ProxyRuntimeConfigStore;
}) {
  const { createClaudeProxyRoutes } =
    await import("../../lib/server/routes/claudeProxyRoutes.js");
  const { createOpenAIProxyRoutes } =
    await import("../../lib/server/routes/openaiProxyRoutes.js");
  const { logBodyCapture, logRequest } =
    await import("../../lib/proxy/requestLogger.js");
  const { recordFinalError } = await import("../../lib/proxy/usageStats.js");
  const { Hono } = await import("hono");

  const app = new Hono();
  const readiness = createProxyReadinessState();
  const requestMetadata = new WeakMap<Request, RuntimeRequestMetadata>();

  const recordRuntimeError = async (
    metadata: RuntimeRequestMetadata,
    status: number,
    errorType: string,
    errorMessage: string,
    options?: {
      clientMessage?: string;
      clientErrorType?: string;
      errorCode?: string;
    },
  ): Promise<void> => {
    const clientMessage = options?.clientMessage ?? errorMessage;
    const clientErrorType = options?.clientErrorType ?? errorType;
    recordFinalError(status);
    await Promise.all([
      logRequest({
        timestamp: new Date().toISOString(),
        requestId: metadata.requestId,
        method: metadata.method,
        path: metadata.path,
        model: metadata.model,
        stream: metadata.stream,
        toolCount: metadata.toolCount,
        account: "",
        accountType: "proxy-runtime",
        responseStatus: status,
        responseTimeMs: Date.now() - metadata.startedAt,
        errorType,
        errorMessage,
        ...(options?.errorCode ? { errorCode: options.errorCode } : {}),
      }),
      logBodyCapture({
        timestamp: new Date().toISOString(),
        requestId: metadata.requestId,
        model: metadata.model,
        stream: metadata.stream,
        phase: "client_response",
        headers: { "content-type": "application/json" },
        body: {
          type: "error",
          error: { type: clientErrorType, message: clientMessage },
        },
        contentType: "application/json",
        responseStatus: status,
        durationMs: Date.now() - metadata.startedAt,
      }),
    ]);
  };

  app.onError(async (err, c) => {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.always(`[proxy] unhandled error: ${errMsg}`);
    if (err instanceof Error && err.stack) {
      logger.always(`[proxy] unhandled stack: ${err.stack}`);
    }
    const metadata = requestMetadata.get(c.req.raw) ?? {
      requestId: crypto.randomUUID(),
      method: c.req.method,
      path: c.req.path,
      startedAt: Date.now(),
      model: "-",
      stream: false,
      toolCount: 0,
    };
    metadata.terminalErrorType = "unhandled_proxy_error";
    metadata.terminalErrorCode = getProxyRuntimeErrorCode(err);
    await recordRuntimeError(metadata, 502, "unhandled_proxy_error", errMsg, {
      clientMessage: "Proxy internal error",
      clientErrorType: "api_error",
      errorCode: metadata.terminalErrorCode,
    });
    requestMetadata.delete(c.req.raw);
    return c.json(
      {
        type: "error",
        error: {
          type: "api_error",
          message: "Proxy internal error",
        },
      },
      502,
    );
  });

  registerProxyRequestTracking(app, requestMetadata);

  const runtimeConfigStore = params.runtimeConfigStore;
  const runtimeConfigProvider = runtimeConfigStore
    ? () => runtimeConfigStore.getSnapshot()
    : undefined;
  const routeGroup = createClaudeProxyRoutes(
    params.modelRouter,
    "",
    params.strategy,
    params.passthrough,
    params.primaryAccountKey,
    runtimeConfigProvider
      ? {
          accountAllowlist: params.accountAllowlist,
          runtimeConfigProvider,
        }
      : params.accountAllowlist,
  );

  const openaiRouteGroup = createOpenAIProxyRoutes(
    params.modelRouter,
    "",
    params.port,
    runtimeConfigProvider,
  );
  const allProxyRoutes = [...routeGroup.routes, ...openaiRouteGroup.routes];

  for (const route of allProxyRoutes) {
    const method = route.method.toLowerCase() as "get" | "post";
    app[method](route.path, async (c) => {
      const emptyBody = {};
      let body: unknown;
      let rawBody: string | undefined;
      if (method === "post") {
        rawBody = await c.req.text().catch(() => undefined);
        try {
          body = rawBody ? JSON.parse(rawBody) : emptyBody;
        } catch {
          const metadata = requestMetadata.get(c.req.raw);
          if (metadata) {
            await recordRuntimeError(
              metadata,
              400,
              "invalid_request_error",
              "Request body must be valid JSON",
            );
          }
          return c.json(
            {
              type: "error",
              error: {
                type: "invalid_request_error",
                message: "Request body must be valid JSON",
              },
            },
            400,
          );
        }
      }

      const model = (body as Record<string, unknown>)?.model ?? "-";
      const stream = (body as Record<string, unknown>)?.stream
        ? "stream"
        : "non-stream";
      const bodyRec = body as Record<string, unknown> | undefined;
      const toolCount = Array.isArray(bodyRec?.tools)
        ? (bodyRec.tools as unknown[]).length
        : 0;
      const metadata = requestMetadata.get(c.req.raw);
      if (metadata) {
        metadata.model = String(model);
        metadata.stream = stream === "stream";
        metadata.toolCount = toolCount;
      }
      logger.always(
        `[proxy] ${c.req.method} ${c.req.path} → model=${model} ${stream} tools=${toolCount}`,
      );

      const ctx = {
        requestId: metadata?.requestId ?? crypto.randomUUID(),
        method: c.req.method,
        path: c.req.path,
        headers: Object.fromEntries(c.req.raw.headers.entries()),
        query: Object.fromEntries(new URL(c.req.url).searchParams.entries()),
        params: c.req.param() as Record<string, string>,
        body,
        rawBody,
        neurolink: params.neurolink,
        toolRegistry: params.neurolink.getToolRegistry(),
        timestamp: Date.now(),
        metadata: {},
      } as unknown as Parameters<typeof route.handler>[0];

      const result = await route.handler(ctx);
      if (result instanceof Response) {
        return result;
      }

      if (
        result &&
        typeof result === "object" &&
        Symbol.asyncIterator in Object(result)
      ) {
        const iterator = (result as AsyncIterable<string>)[
          Symbol.asyncIterator
        ]();
        let cancelled = false;
        const responseStream = new ReadableStream({
          async start(controller) {
            try {
              while (!cancelled) {
                const { value, done } = await iterator.next();
                if (done) {
                  break;
                }
                controller.enqueue(new TextEncoder().encode(value));
              }
              controller.close();
            } catch (streamErr) {
              if (cancelled) {
                controller.close();
                return;
              }
              const errMsg =
                streamErr instanceof Error
                  ? streamErr.message
                  : String(streamErr);
              const errorEvent = `event: error\ndata: ${JSON.stringify({ type: "error", error: { type: "api_error", message: `Stream interrupted: ${errMsg}` } })}\n\n`;
              try {
                controller.enqueue(new TextEncoder().encode(errorEvent));
              } catch {
                // Controller already errored — ignore
              }
              controller.close();
            }
          },
          async cancel() {
            cancelled = true;
            await iterator.return?.();
          },
        });
        return new Response(responseStream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      }

      if (
        result &&
        typeof result === "object" &&
        "httpStatus" in (result as Record<string, unknown>)
      ) {
        const httpResult = result as Record<string, unknown>;
        const status = (httpResult.httpStatus as number) ?? 200;
        delete httpResult.httpStatus;
        return c.json(result, status as 400);
      }

      if (
        result &&
        typeof result === "object" &&
        "type" in result &&
        (result as Record<string, unknown>).type === "error"
      ) {
        const errorResult = result as {
          type: string;
          error?: { type?: string };
        };
        const status = mapClaudeErrorTypeToStatus(errorResult.error?.type);
        return c.json(result, status as 400);
      }

      return c.json(result ?? {});
    });
  }

  app.get("/health", (c) => {
    const runtimeConfig = params.runtimeConfigStore?.getSnapshot();
    return c.json(
      buildProxyHealthResponse(readiness, {
        strategy: runtimeConfig ? runtimeConfig.strategy : params.strategy,
        passthrough: runtimeConfig
          ? runtimeConfig.passthrough
          : params.passthrough,
        version: PROXY_VERSION,
      }),
    );
  });

  app.get("/status", async (c) => {
    const runtimeConfig = params.runtimeConfigStore?.getSnapshot();
    const runtimeConfigStatus = params.runtimeConfigStore?.getStatus();
    const activeStrategy = runtimeConfig
      ? runtimeConfig.strategy
      : params.strategy;
    const activePassthrough = runtimeConfig
      ? runtimeConfig.passthrough
      : params.passthrough;
    const activeProxyConfig = runtimeConfig
      ? runtimeConfig.proxyConfig
      : params.proxyConfig;
    const activeAccountAllowlist = runtimeConfig
      ? runtimeConfig.accountAllowlist
      : params.accountAllowlist;
    const { getStats } = await import("../../lib/proxy/usageStats.js");
    const { loadAccountCooldowns } =
      await import("../../lib/proxy/accountCooldown.js");
    const stats = getStats();
    const runtimeState = loadProxyState();
    const updateState = loadUpdateState();
    const cooldowns = await loadAccountCooldowns();
    const storedAccountKeys = new Set<string>();
    try {
      const { tokenStore } = await import("../../lib/auth/tokenStore.js");
      for (const key of await tokenStore.listByPrefix("anthropic:")) {
        storedAccountKeys.add(normalizeAnthropicAccountKey(key));
      }
    } catch (err) {
      logger.debug(
        `[proxy] /status: failed to resolve account cooldown labels: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
    const now = Date.now();
    const health = buildProxyHealthResponse(readiness, {
      strategy: activeStrategy,
      passthrough: activePassthrough,
      version: PROXY_VERSION,
    });
    const primaryAccount = await resolveStatusPrimaryAccount(activeProxyConfig);
    return c.json({
      status: "running",
      ready: health.ready,
      acceptingConnections: health.acceptingConnections,
      readyAt: health.readyAt,
      pid: process.pid,
      port: params.port,
      host: params.host,
      strategy: activeStrategy,
      uptime: process.uptime(),
      version: PROXY_VERSION,
      health,
      stats: {
        totalAttempts: stats.totalAttempts,
        totalAttemptErrors: stats.totalAttemptErrors,
        totalRequests: stats.totalRequests,
        totalSuccess: stats.totalSuccess,
        totalErrors: stats.totalErrors,
        totalRateLimits: stats.totalRateLimits,
        totalTransientRateLimits: stats.totalTransientRateLimits,
        totalQuotaRateLimits: stats.totalQuotaRateLimits,
        accounts: Object.values(stats.accounts).map((account) => {
          const normalizedKey = normalizeAnthropicAccountKey(account.label);
          const accountKey = storedAccountKeys.has(normalizedKey)
            ? normalizedKey
            : account.label === "env"
              ? ENV_ANTHROPIC_ACCOUNT_KEY
              : account.type === "oauth"
                ? LEGACY_ANTHROPIC_ACCOUNT_KEY
                : normalizedKey;
          return {
            label: account.label,
            type: account.type,
            attempts: account.attemptCount,
            requests: account.successCount + account.errorCount,
            success: account.successCount,
            errors: account.errorCount,
            attemptErrors: account.attemptErrorCount,
            rateLimits: account.rateLimitCount,
            transientRateLimits: account.transientRateLimitCount,
            quotaRateLimits: account.quotaRateLimitCount,
            cooling: (cooldowns[accountKey]?.coolingUntil ?? 0) > now,
          };
        }),
        primaryAccount,
      },
      activity: (() => {
        const activity = getProxyActivitySnapshot();
        return {
          activeRequests: activity.activeRequests,
          lastActivityAt: activity.lastActivityAt?.toISOString() ?? null,
        };
      })(),
      observability: {
        lifecycle: getProxyLifecycleLoggerSnapshot(),
      },
      autoUpdate: {
        enabled: isProxyAutoUpdateEnabled(),
        updaterPid: runtimeState?.updaterPid ?? null,
        updaterRunning: runtimeState?.updaterPid
          ? isProcessRunning(runtimeState.updaterPid)
          : false,
        liveVersion: PROXY_VERSION,
        latestVersion: updateState?.lastCheckVersion || null,
        pendingRestartVersion: updateState?.pendingRestartVersion ?? null,
        lastCheckAt: updateState?.lastCheckAt ?? null,
        lastUpdateAt: updateState?.lastUpdateAt ?? null,
        lastUpdateVersion: updateState?.lastUpdateVersion ?? null,
        lastFailure: updateState?.lastFailure
          ? {
              at: updateState.lastFailure.at,
              version: updateState.lastFailure.version,
              stage: updateState.lastFailure.stage,
            }
          : null,
      },
      config: params.runtimeConfigStore
        ? {
            hasRouting: !!activeProxyConfig?.routing,
            accountAllowlist: activeAccountAllowlist
              ? [...activeAccountAllowlist]
              : null,
            generation: runtimeConfig?.generation ?? null,
            loadedAt: runtimeConfig?.loadedAt ?? null,
            hash: runtimeConfig?.configHash ?? null,
            watching: runtimeConfigStatus?.watching ?? false,
            lastReloadAttemptAt:
              runtimeConfigStatus?.lastReloadAttemptAt ?? null,
            lastReloadAt: runtimeConfigStatus?.lastReloadAt ?? null,
            lastReloadSource: runtimeConfigStatus?.lastReloadSource ?? null,
            lastReloadError: runtimeConfigStatus?.lastReloadError ?? null,
            consecutiveFailures: runtimeConfigStatus?.consecutiveFailures ?? 0,
          }
        : params.proxyConfig
          ? {
              hasRouting: !!params.proxyConfig.routing,
              accountAllowlist: params.accountAllowlist
                ? [...params.accountAllowlist]
                : null,
            }
          : null,
    });
  });

  return { app, readiness };
}

async function initializeProxyOpenTelemetry(): Promise<void> {
  try {
    const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    if (!process.env.OTEL_SERVICE_NAME) {
      process.env.OTEL_SERVICE_NAME = "neurolink-proxy";
    }

    process.env.OTEL_RESOURCE_ATTRIBUTES = [
      "service.name=neurolink-proxy",
      `service.version=${PROXY_VERSION}`,
      "deployment.environment=local",
      process.env.OTEL_RESOURCE_ATTRIBUTES,
    ]
      .filter(Boolean)
      .join(",");

    const { initializeOpenTelemetry, isOpenTelemetryInitialized } =
      await import("../../lib/services/server/ai/observability/instrumentation.js");
    const { buildObservabilityConfigFromEnv } =
      await import("../../lib/utils/observabilityHelpers.js");

    if (isOpenTelemetryInitialized()) {
      return;
    }

    const observabilityConfig = buildObservabilityConfigFromEnv();
    const langfuseConfig = observabilityConfig?.langfuse;
    const langfuseEnabled = langfuseConfig?.enabled === true;
    await initializeOpenTelemetry({
      enabled: langfuseEnabled,
      publicKey: langfuseConfig?.publicKey || "",
      secretKey: langfuseConfig?.secretKey || "",
      baseUrl: langfuseConfig?.baseUrl,
      environment: "proxy",
      release: PROXY_VERSION,
      userId: "neurolink-proxy",
      autoDetectOperationName: true,
    });

    if (langfuseEnabled) {
      logger.always(
        `[proxy] Langfuse enabled — exporting to ${langfuseConfig.baseUrl || "https://cloud.langfuse.com"} (environment=proxy)`,
      );
    }
    if (otlpEndpoint) {
      logger.always(
        `[proxy] OTLP exporter enabled — exporting to ${otlpEndpoint} (service.name=neurolink-proxy)`,
      );
    }
    if (!langfuseEnabled && !otlpEndpoint) {
      logger.always(
        "[proxy] OpenTelemetry exporters disabled — set OTEL_EXPORTER_OTLP_ENDPOINT or Langfuse credentials to enable proxy observability",
      );
    }
  } catch (error) {
    logger.debug(
      `[proxy] OpenTelemetry init failed (non-fatal): ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

const BACKGROUND_REFRESH_BASE_COOLDOWN_MS = 30_000;
const BACKGROUND_REFRESH_MAX_COOLDOWN_MS = 5 * 60 * 1000;
const backgroundRefreshFailures = new Map<
  string,
  { consecutiveFailures: number; coolingUntil: number }
>();
const backgroundRejectedRefreshTokens = new Map<string, string>();
let backgroundRefreshInProgress = false;

function canAttemptBackgroundRefresh(
  key: string,
  refreshToken?: string,
): boolean {
  const rejectedToken = backgroundRejectedRefreshTokens.get(key);
  if (rejectedToken !== undefined) {
    if (rejectedToken === refreshToken) {
      return false;
    }
    backgroundRejectedRefreshTokens.delete(key);
  }
  const state = backgroundRefreshFailures.get(key);
  return !state || Date.now() >= state.coolingUntil;
}

function recordBackgroundRefreshFailure(key: string): void {
  const consecutiveFailures =
    (backgroundRefreshFailures.get(key)?.consecutiveFailures ?? 0) + 1;
  const delayMs = Math.min(
    BACKGROUND_REFRESH_MAX_COOLDOWN_MS,
    BACKGROUND_REFRESH_BASE_COOLDOWN_MS *
      2 ** Math.min(consecutiveFailures - 1, 4),
  );
  backgroundRefreshFailures.set(key, {
    consecutiveFailures,
    coolingUntil: Date.now() + delayMs,
  });
}

async function refreshProxyTokensInBackground(
  accountAllowlist?: AccountAllowlist,
): Promise<void> {
  const {
    needsRefresh,
    refreshToken,
    persistTokens,
    isPermanentRefreshFailure,
  } = await import("../../lib/proxy/tokenRefresh.js");
  const { tokenStore } = await import("../../lib/auth/tokenStore.js");

  let storedAnthropicAccountCount: number | undefined;
  try {
    const allKeys = await tokenStore.listProviders();
    const anthropicKeys = allKeys.filter((key) => key.startsWith("anthropic:"));
    storedAnthropicAccountCount = anthropicKeys.length;
    for (const key of anthropicKeys) {
      try {
        if (
          !isAccountAllowed(key, accountAllowlist) ||
          (await tokenStore.isDisabled(key))
        ) {
          continue;
        }
        const tokens = await tokenStore.loadTokens(key);
        if (!tokens) {
          continue;
        }
        const account = {
          label: key,
          token: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt,
        };
        if (!needsRefresh(account)) {
          backgroundRefreshFailures.delete(key);
          continue;
        }
        if (!canAttemptBackgroundRefresh(key, tokens.refreshToken)) {
          continue;
        }
        const result = await refreshToken(account);
        if (result.success) {
          await persistTokens({ providerKey: key }, account);
          backgroundRefreshFailures.delete(key);
          logger.debug(`[proxy] background token refresh succeeded for ${key}`);
        } else if (isPermanentRefreshFailure(result)) {
          await tokenStore.markDisabled(key, "refresh_invalid");
          backgroundRefreshFailures.delete(key);
          logger.warn(
            `[proxy] background refresh credential rejected for ${key}; disabled until explicit login`,
          );
        } else {
          recordBackgroundRefreshFailure(key);
          logger.debug(`[proxy] background token refresh deferred for ${key}`, {
            status: result.status,
          });
        }
      } catch {
        // non-fatal per-account
      }
    }
  } catch {
    // non-fatal
  }

  try {
    if (
      storedAnthropicAccountCount === undefined ||
      !shouldLoadFallbackCredential(
        storedAnthropicAccountCount,
        LEGACY_ANTHROPIC_ACCOUNT_KEY,
        accountAllowlist,
      )
    ) {
      return;
    }
    const credPath = join(
      homedir(),
      ".neurolink",
      "anthropic-credentials.json",
    );
    const { readFileSync } = await import("fs");
    const creds = JSON.parse(readFileSync(credPath, "utf8"));
    if (!creds.oauth) {
      return;
    }
    const account = {
      label: "background",
      token: creds.oauth.accessToken,
      refreshToken: creds.oauth.refreshToken,
      expiresAt: creds.oauth.expiresAt,
    };
    const legacyKey = LEGACY_ANTHROPIC_ACCOUNT_KEY;
    if (!needsRefresh(account)) {
      backgroundRefreshFailures.delete(legacyKey);
      return;
    }
    if (canAttemptBackgroundRefresh(legacyKey, account.refreshToken)) {
      const result = await refreshToken(account);
      if (result.success) {
        await persistTokens(credPath, account);
        backgroundRefreshFailures.delete(legacyKey);
        backgroundRejectedRefreshTokens.delete(legacyKey);
        logger.debug("[proxy] background token refresh succeeded");
      } else if (isPermanentRefreshFailure(result)) {
        backgroundRefreshFailures.delete(legacyKey);
        backgroundRejectedRefreshTokens.set(
          legacyKey,
          account.refreshToken ?? "",
        );
        logger.warn(
          "[proxy] background legacy refresh credential rejected; waiting for explicit login",
        );
      } else {
        recordBackgroundRefreshFailure(legacyKey);
        logger.debug("[proxy] background legacy token refresh deferred", {
          status: result.status,
        });
      }
    }
  } catch {
    // non-fatal
  }
}

function startProxyBackgroundMaintenance(
  cleanupLogs: (days: number, maxMb: number) => void,
  getAccountAllowlist: () => AccountAllowlist | undefined,
): {
  refreshInterval: NodeJS.Timeout;
  logCleanupInterval: NodeJS.Timeout;
} {
  const refreshInterval = setInterval(() => {
    if (backgroundRefreshInProgress) {
      return;
    }
    backgroundRefreshInProgress = true;
    void refreshProxyTokensInBackground(getAccountAllowlist())
      .catch((error) => {
        logger.debug(
          `[proxy] background token refresh cycle failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      })
      .finally(() => {
        backgroundRefreshInProgress = false;
      });
  }, 30_000);
  const logCleanupInterval = setInterval(
    () => {
      try {
        cleanupLogs(7, 500);
      } catch (error) {
        logger.debug(
          `[proxy] background log cleanup failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    },
    60 * 60 * 1000,
  );
  return { refreshInterval, logCleanupInterval };
}

function registerProxyShutdownHandlers(params: {
  server: { close?: (callback?: (error?: Error) => void) => void };
  host: string;
  port: number;
  isDev?: boolean;
  refreshInterval: NodeJS.Timeout;
  logCleanupInterval: NodeJS.Timeout;
  updaterSupervisor?: { stop: () => void };
  stopRuntimeConfig?: () => void;
}): void {
  let shutdownStarted = false;

  const closeServer = async (): Promise<void> => {
    const close = params.server.close?.bind(params.server);
    if (!close) {
      return;
    }
    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const finish = (error?: Error) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeout);
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      };
      const timeout = setTimeout(
        () => finish(new Error("Timed out draining the proxy server")),
        30_000,
      );
      timeout.unref?.();
      try {
        close((error) => finish(error));
      } catch (error) {
        finish(error instanceof Error ? error : new Error(String(error)));
      }
    });
  };

  const shutdown = async (signal: string) => {
    if (shutdownStarted) {
      return;
    }
    shutdownStarted = true;
    clearInterval(params.refreshInterval);
    clearInterval(params.logCleanupInterval);
    params.updaterSupervisor?.stop();
    params.stopRuntimeConfig?.();
    logger.always(`\nShutting down proxy (${signal})...`);
    let exitCode = signal === "SIGINT" ? 0 : 1;

    try {
      await closeServer();
    } catch (error) {
      exitCode = 1;
      logger.error(
        `[proxy] failed to drain server during shutdown: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    try {
      await withTimeout(
        flushProxyLifecycleEvents(),
        PROXY_LIFECYCLE_SHUTDOWN_TIMEOUT_MS,
        "Timed out flushing proxy lifecycle metadata during shutdown",
      );
    } catch (error) {
      logger.debug(
        `[proxy] lifecycle metadata flush failed during shutdown: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    try {
      const { flushOpenTelemetry, shutdownOpenTelemetry } =
        await import("../../lib/services/server/ai/observability/instrumentation.js");
      await flushOpenTelemetry();
      await shutdownOpenTelemetry();
    } catch {
      // non-fatal — proxy shutdown must not block on OTel
    }

    if (signal === "SIGINT" && !params.isDev) {
      try {
        const shutdownHost =
          params.host === "0.0.0.0" ? "localhost" : params.host;
        await clearClaudeProxySettings(`http://${shutdownHost}:${params.port}`);
      } catch {
        // non-fatal
      }
      try {
        const shutdownHost =
          params.host === "0.0.0.0" ? "localhost" : params.host;
        await clearOpenCodeProxySettings(
          `http://${shutdownHost}:${params.port}/v1`,
        );
      } catch {
        // non-fatal
      }
    }

    try {
      clearProxyState();
    } catch (error) {
      exitCode = 1;
      logger.error(
        `[proxy] failed to clear runtime state during shutdown: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    process.exit(exitCode);
  };

  const forceExitAfterShutdownFailure = (error: unknown): never => {
    logger.error(
      `[proxy] unexpected shutdown failure: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  };

  process.on("SIGTERM", () => {
    void shutdown("SIGTERM").catch(forceExitAfterShutdownFailure);
  });
  process.on("SIGINT", () => {
    void shutdown("SIGINT").catch(forceExitAfterShutdownFailure);
  });
}

async function startProxyRuntime(params: {
  argv: ProxyStartArgs;
  spinner: ProxySpinner;
  app: ProxyStartApp["app"];
  readiness: ProxyStartApp["readiness"];
  host: string;
  port: number;
  strategy: ProxyStartStrategy;
  proxyConfig: LoadedProxyConfig | null;
  accountAllowlist: AccountAllowlist | undefined;
  loadedEnvFile: string | undefined;
  passthrough: boolean;
  cleanupLogs: ProxyNeurolinkRuntime["cleanupLogs"];
  runtimeConfigStore?: ProxyRuntimeConfigStore;
}): Promise<void> {
  const { serve } = await import("@hono/node-server");
  const server = serve({
    fetch: params.app.fetch,
    port: params.port,
    hostname: params.host,
  });
  const managedByLaunchd = isLaunchdManagedProcess();
  // launchd already owns restart supervision. A second detached supervisor can
  // outlive its parent and terminate a healthy replacement, so the guard is
  // reserved for foreground mode where it only cleans stale client settings.
  const guardPid =
    params.argv.dev || managedByLaunchd
      ? undefined
      : spawnFailOpenGuard(params.host, params.port, process.pid);
  const readinessHost = params.host === "0.0.0.0" ? "127.0.0.1" : params.host;
  await waitForProxyReadiness({
    host: readinessHost,
    port: params.port,
  });
  markProxyReady(params.readiness);
  try {
    const { reconcileRunningUpdate } =
      await import("../../lib/proxy/updateState.js");
    if (reconcileRunningUpdate(PROXY_VERSION)) {
      logger.always(
        `[proxy] confirmed pending update is now running at v${PROXY_VERSION}`,
      );
    }
  } catch (error) {
    logger.always(
      `[proxy] WARNING: failed to reconcile update state: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  /** Mirror the supervised worker PID into the proxy state used by status. */
  const updatePersistedUpdaterPid = (updaterPid: number | undefined): void => {
    const state = loadProxyState();
    if (!state || state.pid !== process.pid) {
      return;
    }
    saveProxyState({ ...state, updaterPid });
  };
  const updaterSupervisor =
    managedByLaunchd && !params.argv.dev
      ? startUpdaterWorkerSupervisor({
          spawnWorker: () =>
            spawnProxyUpdater(readinessHost, params.port, process.pid),
          isProcessRunning,
          stopWorker: (pid) => process.kill(pid, "SIGTERM"),
          onPidChange: updatePersistedUpdaterPid,
          log: (message) => logger.always(message),
        })
      : undefined;
  const updaterPid = updaterSupervisor?.currentPid();
  const initialRuntimeConfig = params.runtimeConfigStore?.getSnapshot();
  const activeStrategy = initialRuntimeConfig
    ? initialRuntimeConfig.strategy
    : params.strategy;
  const activeProxyConfig = initialRuntimeConfig
    ? initialRuntimeConfig.proxyConfig
    : params.proxyConfig;
  const activeAccountAllowlist = initialRuntimeConfig
    ? initialRuntimeConfig.accountAllowlist
    : params.accountAllowlist;
  const activePassthrough = initialRuntimeConfig
    ? initialRuntimeConfig.passthrough
    : params.passthrough;
  const fallbackChain: FallbackInfo[] | undefined =
    activeProxyConfig?.routing?.fallbackChain?.map((entry) => ({
      provider: entry.provider as string,
      model: entry.model as string,
    }));
  const initialConfigStatus = params.runtimeConfigStore?.getStatus();

  saveProxyState({
    pid: process.pid,
    port: params.port,
    host: params.host,
    strategy: activeStrategy,
    startTime: new Date().toISOString(),
    ready: true,
    readyAt: params.readiness.readyAtMs
      ? new Date(params.readiness.readyAtMs).toISOString()
      : undefined,
    healthPath: "/health",
    statusPath: "/status",
    envFile: params.loadedEnvFile,
    fallbackChain,
    accountAllowlist: activeAccountAllowlist
      ? [...activeAccountAllowlist]
      : undefined,
    guardPid,
    updaterPid,
    managedBy: managedByLaunchd ? "launchd" : "manual",
    passthrough: activePassthrough,
    configGeneration: initialRuntimeConfig?.generation,
    configLoadedAt: initialRuntimeConfig?.loadedAt,
    lastConfigReloadError: initialConfigStatus?.lastReloadError,
    configFile: initialConfigStatus?.configPath,
  });

  const persistRuntimeConfig = (snapshot: ProxyRuntimeConfigSnapshot): void => {
    const state = loadProxyState();
    if (!state || state.pid !== process.pid) {
      return;
    }
    const status = params.runtimeConfigStore?.getStatus();
    const currentFallbackChain =
      snapshot.proxyConfig?.routing?.fallbackChain?.map((entry) => ({
        provider: entry.provider as string,
        model: entry.model as string,
      }));
    saveProxyState({
      ...state,
      strategy: snapshot.strategy,
      fallbackChain: currentFallbackChain,
      accountAllowlist: snapshot.accountAllowlist
        ? [...snapshot.accountAllowlist]
        : undefined,
      passthrough: snapshot.passthrough,
      configGeneration: snapshot.generation,
      configLoadedAt: snapshot.loadedAt,
      lastConfigReloadError: status?.lastReloadError,
    });
  };
  let stopRuntimeConfig: (() => void) | undefined;
  if (params.runtimeConfigStore) {
    const runtimeConfigStore = params.runtimeConfigStore;
    const unsubscribeReload = runtimeConfigStore.subscribeReload(() => {
      persistRuntimeConfig(runtimeConfigStore.getSnapshot());
    });
    const reloadOnSighup = (): void => {
      void runtimeConfigStore.reload("sighup");
    };
    runtimeConfigStore.startWatching();
    process.on("SIGHUP", reloadOnSighup);
    stopRuntimeConfig = () => {
      process.off("SIGHUP", reloadOnSighup);
      unsubscribeReload();
      runtimeConfigStore.stopWatching();
    };
    logger.always(
      `[proxy] watching configuration generation ${initialRuntimeConfig?.generation ?? 1}; send SIGHUP to reload immediately`,
    );
  }

  if (params.spinner) {
    params.spinner.succeed(chalk.green("Claude proxy started successfully"));
  }

  const isDev = params.argv.dev ?? false;
  const normalizedHost = params.host === "0.0.0.0" ? "localhost" : params.host;
  const url = `http://${normalizedHost}:${params.port}`;
  printProxyBanner(url, activeStrategy);

  if (isDev) {
    logger.always(
      `  ${chalk.bold("Mode:")}       ${chalk.magenta("dev (isolated — state in .neurolink-dev/)")}`,
    );
  } else {
    logger.always(
      `  ${chalk.bold("Mode:")}       ${chalk.cyan(activePassthrough ? "passthrough" : "full")}`,
    );
  }
  if (activePassthrough) {
    logger.always(
      chalk.yellow(
        "  ! Passthrough mode forwards client auth directly to Anthropic",
      ),
    );
    logger.always(
      chalk.dim(
        "    Stored proxy OAuth/API credentials are ignored; clients need their own valid Anthropic auth.",
      ),
    );
  }
  if (params.loadedEnvFile) {
    logger.always(
      `  ${chalk.bold("Env File:")}   ${chalk.cyan(params.loadedEnvFile)}`,
    );
  }

  if (!isDev) {
    try {
      await setClaudeProxySettings(url);
      logger.always(chalk.green("  ✓ Auto-configured Claude Code settings"));
      logger.always(
        chalk.dim("    Restart Claude Code to connect through proxy"),
      );
    } catch (error) {
      logger.debug(
        "[proxy] Failed to auto-configure Claude Code: " +
          (error instanceof Error ? error.message : String(error)),
      );
    }

    try {
      await setOpenCodeProxySettings(`${url}/v1`);
      logger.always(chalk.green("  ✓ Auto-configured OpenCode settings"));
      logger.always(chalk.dim("    Restart OpenCode to connect through proxy"));
    } catch (error) {
      logger.debug(
        "[proxy] Failed to auto-configure OpenCode: " +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  } else {
    logger.always(
      chalk.dim("  ⊘ Dev mode: skipping client auto-configuration"),
    );
  }

  const maintenance = startProxyBackgroundMaintenance(params.cleanupLogs, () =>
    params.runtimeConfigStore
      ? params.runtimeConfigStore.getSnapshot().accountAllowlist
      : params.accountAllowlist,
  );
  registerProxyShutdownHandlers({
    server,
    host: params.host,
    port: params.port,
    isDev,
    updaterSupervisor,
    stopRuntimeConfig,
    ...maintenance,
  });
}

async function startProxyCommandHandler(argv: ProxyStartArgs): Promise<void> {
  const spinner = argv.quiet ? null : ora("Starting Claude proxy...").start();
  const isDev = argv.dev ?? false;

  try {
    // In dev mode: redirect writable state to .neurolink-dev/ and skip singleton check
    let devPaths: import("../../lib/types/index.js").ProxyPaths | undefined;
    if (isDev) {
      const { resolveProxyPaths } =
        await import("../../lib/proxy/proxyPaths.js");
      devPaths = resolveProxyPaths(true);
      setProxyStateDir(devPaths.stateDir);

      const { initAccountQuota } =
        await import("../../lib/proxy/accountQuota.js");
      initAccountQuota(devPaths.quotaFile);
      const { initAccountCooldown } =
        await import("../../lib/proxy/accountCooldown.js");
      initAccountCooldown(devPaths.cooldownFile);

      // Ensure the dev state directory exists
      const { mkdirSync, existsSync } = await import("fs");
      if (!existsSync(devPaths.stateDir)) {
        mkdirSync(devPaths.stateDir, { recursive: true, mode: 0o700 });
      }
    }

    if (!isDev) {
      await ensureProxyStartAllowed(spinner);
    }
    const baseEnv = { ...process.env };
    const envResolution = resolveProxyEnvFile({
      explicitEnvFile: argv.envFile,
      env: baseEnv,
    });
    const loadedEnvFile = await loadProxyStartEnv(argv, spinner);

    // Reuse upstream TCP connections (longer keep-alive + bounded pool) instead
    // of opening a new flow per request — cuts outbound flow churn through host
    // content-filters. Runs once, after env load so it can be tuned via env.
    configureProxyKeepAliveDispatcher();

    const { neurolink, cleanupLogs } = await createProxyNeurolinkRuntime(
      devPaths?.logsDir,
    );
    const configPath = argv.config
      ? resolve(argv.config)
      : join(homedir(), ".neurolink", "proxy-config.yaml");
    const runtimeConfigStore = await ProxyRuntimeConfigStore.create({
      configPath,
      configRequired: Boolean(argv.config),
      envFilePath: envResolution.path ?? join(homedir(), ".neurolink", ".env"),
      envFileRequired: envResolution.required,
      baseEnv,
      strategyOverride: argv.strategy as ProxyStartStrategy | undefined,
      passthrough: argv.passthrough ?? false,
    });
    const initialConfig = runtimeConfigStore.getSnapshot();
    const {
      proxyConfig,
      strategy,
      modelRouter,
      passthrough,
      primaryAccountKey,
      accountAllowlist,
    } = initialConfig;
    if (spinner && proxyConfig) {
      spinner.text = `Loaded proxy config from ${configPath}`;
    }

    if (spinner) {
      spinner.text = "Configuring server...";
    }

    const port = argv.port ?? 55669;
    const host = argv.host ?? "127.0.0.1";
    const { app, readiness } = await createProxyStartApp({
      neurolink,
      modelRouter,
      strategy,
      passthrough,
      port,
      host,
      proxyConfig,
      primaryAccountKey,
      accountAllowlist,
      runtimeConfigStore,
    });

    await initializeProxyOpenTelemetry();

    if (spinner) {
      spinner.text = `Starting proxy on ${host}:${port}...`;
    }

    await startProxyRuntime({
      argv,
      spinner,
      app,
      readiness,
      host,
      port,
      strategy,
      proxyConfig,
      accountAllowlist,
      loadedEnvFile,
      passthrough,
      cleanupLogs,
      runtimeConfigStore,
    });
  } catch (error) {
    if (spinner) {
      spinner.fail(chalk.red("Failed to start proxy"));
    }
    logger.error(
      chalk.red(
        `Error: ${error instanceof Error ? error.message : String(error)}`,
      ),
    );
    if (argv.debug && error instanceof Error && error.stack) {
      logger.error(chalk.gray(error.stack));
    }
    process.exit(1);
  }
}

// =============================================================================
// PROXY START COMMAND
// =============================================================================

export const proxyStartCommand: CommandModule<object, ProxyStartArgs> = {
  command: "start",
  describe: "Start the Claude multi-account proxy server",
  builder: (yargs: Argv) => {
    return yargs
      .option("port", {
        type: "number",
        alias: "p",
        default: 55669,
        description: "Port to listen on",
      })
      .option("host", {
        type: "string",
        alias: "H",
        default: "127.0.0.1",
        description: "Host to bind to",
      })
      .option("strategy", {
        type: "string",
        alias: "s",
        choices: ["fill-first", "round-robin"],
        description:
          "Account selection strategy for routing requests (default: fill-first)",
      })
      .option("health-interval", {
        type: "number",
        alias: "healthInterval",
        default: 30,
        description: "Health check interval in seconds",
      })
      .option("quiet", {
        type: "boolean",
        alias: "q",
        default: false,
        description: "Suppress non-essential output",
      })
      .option("debug", {
        type: "boolean",
        alias: "d",
        default: false,
        description: "Enable debug output",
      })
      .option("config", {
        type: "string",
        alias: "c",
        description: "Path to proxy config file (YAML/JSON)",
        defaultDescription: "~/.neurolink/proxy-config.yaml",
      })
      .option("env-file", {
        type: "string",
        alias: "envFile",
        description:
          "Path to proxy provider env file (overrides cwd .env for the proxy process)",
      })
      .option("passthrough", {
        type: "boolean",
        default: false,
        description:
          "Run in transparent passthrough mode (no retry, no rotation, no polyfill)",
      })
      .option("dev", {
        type: "boolean",
        default: false,
        description:
          "Run in isolated dev mode — state files scoped to .neurolink-dev/ in cwd, no client auto-configuration, no singleton check",
      })
      .example(
        "neurolink proxy start",
        "Start proxy on default port 55669 with fill-first strategy",
      )
      .example(
        "neurolink proxy start -p 8080 -s fill-first",
        "Start proxy on port 8080 with fill-first",
      )
      .example(
        "neurolink proxy start --health-interval 60",
        "Start proxy with 60-second health checks",
      ) as Argv<ProxyStartArgs>;
  },
  handler: async (argv) => {
    await startProxyCommandHandler(argv);
  },
};

// =============================================================================
// STATUS DISPLAY HELPERS
// =============================================================================

function printStatusStats(stats: StatusStats): void {
  console.info(`\n  Stats:`);
  if (stats.totalAttempts !== undefined) {
    console.info(`    Attempts:    ${stats.totalAttempts}`);
  }
  console.info(
    `    Completed:   ${stats.totalRequests} total, ${stats.totalSuccess} success, ${stats.totalErrors} errors`,
  );
  if (stats.totalAttemptErrors !== undefined) {
    console.info(`    Failed attempts: ${stats.totalAttemptErrors}`);
  }
  console.info(
    `    Rate-limited attempts: ${stats.totalRateLimits}` +
      (stats.totalTransientRateLimits !== undefined &&
      stats.totalQuotaRateLimits !== undefined
        ? ` (${stats.totalTransientRateLimits} transient, ${stats.totalQuotaRateLimits} quota)`
        : ""),
  );
  if (stats.accounts?.length) {
    console.info(`\n  Accounts:`);
    const headers = [
      "ACCOUNT",
      "AUTH",
      "ATTEMPTS",
      "SUCCESS",
      "ERRORS",
      "RL",
      "STATUS",
    ];
    const rows = stats.accounts.map((account) => [
      account.label,
      account.type,
      String(account.attempts ?? account.requests ?? 0),
      String(account.success ?? 0),
      String(account.errors ?? 0),
      String(account.rateLimits ?? 0),
      account.cooling ? "cooling" : "active",
    ]);
    const widths = headers.map((header, index) =>
      Math.max(header.length, ...rows.map((row) => row[index].length)),
    );
    const numericColumns = new Set([2, 3, 4, 5]);
    /** Align text columns left and numeric account counters right. */
    const formatRow = (cells: string[]): string =>
      cells
        .map((cell, index) =>
          numericColumns.has(index)
            ? cell.padStart(widths[index])
            : cell.padEnd(widths[index]),
        )
        .join("  ");

    console.info(`    ${chalk.gray(formatRow(headers))}`);
    console.info(
      `    ${chalk.gray(widths.map((width) => "-".repeat(width)).join("  "))}`,
    );
    for (const row of rows) {
      const status = row[6];
      const formatted = formatRow(row);
      const statusStart = formatted.length - widths[6];
      const prefix = formatted.slice(0, statusStart);
      const paddedStatus = formatted.slice(statusStart);
      console.info(
        `    ${chalk.cyan(prefix.slice(0, widths[0]))}${prefix.slice(widths[0])}${status === "cooling" ? chalk.red(paddedStatus) : chalk.green(paddedStatus)}`,
      );
    }
  }
}

// =============================================================================
// PROXY STATUS COMMAND
// =============================================================================

export const proxyStatusCommand: CommandModule<object, ProxyStatusArgs> = {
  command: "status",
  describe: "Show Claude proxy status",
  builder: (yargs: Argv) => {
    return yargs
      .option("format", {
        type: "string",
        choices: ["text", "json"] as const,
        default: "text" as const,
        description: "Output format",
      })
      .option("quiet", {
        type: "boolean",
        alias: "q",
        default: false,
        description: "Suppress non-essential output",
      })
      .example("neurolink proxy status", "Show proxy status")
      .example(
        "neurolink proxy status --format json",
        "Show proxy status as JSON",
      ) as Argv<ProxyStatusArgs>;
  },
  handler: async (argv) => {
    try {
      const state = loadProxyState();
      const updateState = loadUpdateState();

      const status = {
        running: false,
        pid: null as number | null,
        port: null as number | null,
        host: null as string | null,
        mode: null as "full" | "passthrough" | null,
        strategy: null as string | null,
        uptime: null as number | null,
        startTime: null as string | null,
        url: null as string | null,
        envFile: null as string | null,
        fallbackChain: null as FallbackInfo[] | null,
        accountAllowlist: null as string[] | null,
        configGeneration: null as number | null,
        configLoadedAt: null as string | null,
        lastConfigReloadError: null as string | null,
        autoUpdateEnabled: isProxyAutoUpdateEnabled(),
        updaterPid: null as number | null,
        updaterRunning: false,
        latestVersion: updateState?.lastCheckVersion || null,
        pendingRestartVersion: updateState?.pendingRestartVersion ?? null,
        lastUpdateFailure: updateState?.lastFailure ?? null,
      };

      if (state && isProcessRunning(state.pid)) {
        status.running = true;
        status.pid = state.pid;
        status.port = state.port;
        status.host = state.host;
        status.mode = state.passthrough ? "passthrough" : "full";
        status.strategy = state.strategy;
        status.startTime = state.startTime;
        status.uptime = Date.now() - new Date(state.startTime).getTime();
        status.url = `http://${state.host === "0.0.0.0" ? "localhost" : state.host}:${state.port}`;
        status.envFile = state.envFile ?? null;
        status.fallbackChain = state.fallbackChain ?? null;
        status.accountAllowlist = state.accountAllowlist ?? null;
        status.configGeneration = state.configGeneration ?? null;
        status.configLoadedAt = state.configLoadedAt ?? null;
        status.lastConfigReloadError = state.lastConfigReloadError ?? null;
        status.updaterPid = state.updaterPid ?? null;
        status.updaterRunning = state.updaterPid
          ? isProcessRunning(state.updaterPid)
          : false;
      }

      // Fetch live stats before rendering (JSON or text)
      let liveStats: Record<string, unknown> | null = null;
      let liveConfig: Record<string, unknown> | null = null;
      if (status.running && status.url) {
        try {
          const statusResp = await fetch(`${status.url}/status`);
          if (statusResp.ok) {
            const statusData = (await statusResp.json()) as Record<
              string,
              unknown
            >;
            liveStats = statusData.stats as Record<string, unknown> | null;
            liveConfig = statusData.config as Record<string, unknown> | null;
            if (typeof liveConfig?.generation === "number") {
              status.configGeneration = liveConfig.generation;
            }
            if (typeof liveConfig?.loadedAt === "string") {
              status.configLoadedAt = liveConfig.loadedAt;
            }
            status.lastConfigReloadError =
              typeof liveConfig?.lastReloadError === "string"
                ? liveConfig.lastReloadError
                : null;
          }
        } catch {
          // Non-fatal — live stats unavailable
        }
      }

      if (argv.format === "json") {
        logger.always(
          JSON.stringify(
            { ...status, stats: liveStats, config: liveConfig },
            null,
            2,
          ),
        );
        return;
      }

      // Text format
      logger.always("");
      logger.always(chalk.bold.cyan("NeuroLink Claude Proxy Status"));
      logger.always(chalk.gray("=".repeat(50)));
      logger.always("");

      if (status.running) {
        logger.always(
          `  ${chalk.bold("Status:")}     ${chalk.green("RUNNING")}`,
        );
        logger.always(
          `  ${chalk.bold("PID:")}        ${chalk.cyan(status.pid)}`,
        );
        logger.always(
          `  ${chalk.bold("URL:")}        ${chalk.cyan(status.url)}`,
        );
        logger.always(
          `  ${chalk.bold("Strategy:")}   ${chalk.cyan(status.strategy)}`,
        );
        logger.always(
          `  ${chalk.bold("Mode:")}       ${chalk.cyan(status.mode ?? "full")}`,
        );
        if (status.configGeneration !== null) {
          logger.always(
            `  ${chalk.bold("Config:")}     ${chalk.cyan(`generation ${status.configGeneration}`)}` +
              (status.configLoadedAt
                ? chalk.gray(` (${status.configLoadedAt})`)
                : ""),
          );
        }
        if (status.lastConfigReloadError) {
          logger.always(
            `  ${chalk.bold("Config error:")} ${chalk.red(status.lastConfigReloadError)}`,
          );
        }
        logger.always(
          `  ${chalk.bold("Started:")}    ${chalk.cyan(status.startTime)}`,
        );
        logger.always(
          `  ${chalk.bold("Uptime:")}     ${chalk.cyan(formatUptime(status.uptime ?? 0))}`,
        );
        logger.always(
          `  ${chalk.bold("Auto-update:")} ${status.autoUpdateEnabled ? chalk.green(status.updaterRunning ? `enabled (PID ${status.updaterPid})` : "enabled (worker unavailable)") : chalk.yellow("disabled")}`,
        );
        if (status.pendingRestartVersion) {
          logger.always(
            `  ${chalk.bold("Pending:")}    ${chalk.yellow(`v${status.pendingRestartVersion} installed; restart pending`)}`,
          );
        }
        if (status.latestVersion) {
          logger.always(
            `  ${chalk.bold("Latest:")}     ${chalk.cyan(`v${status.latestVersion}`)}`,
          );
        }
        if (status.lastUpdateFailure) {
          logger.always(
            `  ${chalk.bold("Update error:")} ${chalk.red(`${status.lastUpdateFailure.stage}: ${status.lastUpdateFailure.message}`)}`,
          );
        }
        if (status.envFile) {
          logger.always(
            `  ${chalk.bold("Env File:")}   ${chalk.cyan(status.envFile)}`,
          );
        }
        if (status.accountAllowlist) {
          const scope =
            status.accountAllowlist.length > 0
              ? status.accountAllowlist.join(", ")
              : "none (deny all)";
          logger.always(`  ${chalk.bold("Accounts:")}   ${chalk.cyan(scope)}`);
        }

        // Display fallback chain if configured
        if (status.fallbackChain && status.fallbackChain.length > 0) {
          logger.always("");
          logger.always(chalk.bold("  Fallback Chain:"));
          for (let i = 0; i < status.fallbackChain.length; i++) {
            const entry = status.fallbackChain[i];
            const prefix = i === status.fallbackChain.length - 1 ? "└─" : "├─";
            logger.always(
              `    ${chalk.gray(prefix)} ${chalk.cyan(entry.provider)}/${chalk.cyan(entry.model)}`,
            );
          }
        }

        // Try to fetch live status from the running proxy
        try {
          const response = await fetch(`${status.url}/health`);
          if (response.ok) {
            const liveStatus = (await response.json()) as {
              status: string;
              strategy: string;
              uptime: number;
            };
            logger.always("");
            logger.always(
              `  ${chalk.bold("Live:")}       ${chalk.green(liveStatus.status)}`,
            );
          }
        } catch {
          // Live status fetch failed — show only persisted state
          logger.always("");
          logger.always(
            chalk.gray("  (Could not reach proxy for live status)"),
          );
        }

        // Try to get detailed stats
        try {
          const liveUrl = status.url;
          const statusResp = await fetch(`${liveUrl}/status`);
          if (statusResp.ok) {
            const statusData = (await statusResp.json()) as {
              stats?: {
                totalAttempts?: number;
                totalAttemptErrors?: number;
                totalRequests: number;
                totalSuccess: number;
                totalErrors: number;
                totalRateLimits: number;
                totalTransientRateLimits?: number;
                totalQuotaRateLimits?: number;
                accounts?: {
                  label: string;
                  type: string;
                  attempts?: number;
                  requests?: number;
                  success?: number;
                  errors?: number;
                  attemptErrors?: number;
                  rateLimits?: number;
                  transientRateLimits?: number;
                  quotaRateLimits?: number;
                  cooling: boolean;
                }[];
              };
            };
            if (statusData.stats) {
              printStatusStats(statusData.stats);
            }
          }
        } catch {
          /* non-fatal */
        }
      } else {
        logger.always(
          `  ${chalk.bold("Status:")}     ${chalk.yellow("NOT RUNNING")}`,
        );
        logger.always("");
        logger.always(
          chalk.gray("  Start the proxy with: neurolink proxy start"),
        );
      }

      logger.always("");
    } catch (error) {
      logger.error(
        chalk.red(
          `Error: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
      process.exit(1);
    }
  },
};

// =============================================================================
// PROXY TELEMETRY COMMAND
// =============================================================================

const PROXY_TELEMETRY_ACTIONS = [
  "setup",
  "start",
  "stop",
  "status",
  "logs",
  "import-dashboard",
] as const;

export const proxyTelemetryCommand: CommandModule<object, ProxyTelemetryArgs> =
  {
    command: "telemetry <action>",
    describe:
      "Manage the local OpenObserve stack and dashboard for proxy observability",
    builder: (yargs: Argv) =>
      yargs
        .positional("action", {
          type: "string",
          choices: [...PROXY_TELEMETRY_ACTIONS],
          describe:
            "Telemetry action: setup, start, stop, status, logs, or import-dashboard",
        })
        .option("quiet", {
          type: "boolean",
          alias: "q",
          default: false,
          description: "Suppress the local CLI spinner and delegate directly",
        })
        .example(
          "neurolink proxy telemetry setup",
          "Start OpenObserve, start the OTEL collector, and import the dashboard",
        )
        .example(
          "neurolink proxy telemetry start",
          "Start the local proxy telemetry stack without re-importing the dashboard",
        )
        .example(
          "neurolink proxy telemetry stop",
          "Stop the local OpenObserve and OTEL collector containers",
        ) as Argv<ProxyTelemetryArgs>,
    handler: async (argv) => {
      const action = argv.action as ProxyTelemetryAction;
      const spinner = argv.quiet
        ? null
        : ora(`Running proxy telemetry ${action}...`).start();

      try {
        if (spinner) {
          spinner.stop();
        }
        await runProxyTelemetryManager(action);
        if (spinner) {
          spinner.succeed(`proxy telemetry ${action} completed`);
        }
      } catch (error) {
        if (spinner) {
          spinner.fail(`proxy telemetry ${action} failed`);
        }
        logger.error(
          chalk.red(
            `Error: ${error instanceof Error ? error.message : String(error)}`,
          ),
        );
        process.exit(1);
      }
    },
  };

// =============================================================================
// PROXY FAIL-OPEN GUARD COMMAND (HIDDEN)
// =============================================================================

export const proxyGuardCommand: CommandModule<object, ProxyGuardArgs> = {
  command: "guard",
  describe: false,
  builder: (yargs: Argv) => {
    return yargs
      .option("host", {
        type: "string",
        default: "127.0.0.1",
      })
      .option("port", {
        type: "number",
        default: 55669,
      })
      .option("parent-pid", {
        type: "number",
        alias: "parentPid",
      })
      .option("max-wait-ms", {
        type: "number",
        alias: "maxWaitMs",
        default: 0,
      })
      .option("failure-threshold", {
        type: "number",
        alias: "failureThreshold",
        default: 5,
      })
      .option("poll-interval-ms", {
        type: "number",
        alias: "pollIntervalMs",
        default: 1_000,
      })
      .option("updater-only", {
        type: "boolean",
        alias: "updaterOnly",
        default: false,
      })
      .option("quiet", {
        type: "boolean",
        default: true,
      }) as Argv<ProxyGuardArgs>;
  },
  handler: async (argv) => {
    const host = argv.host ?? "127.0.0.1";
    const port = argv.port ?? 55669;
    const parentPid = Number(argv.parentPid);
    const maxWaitMsArg = Number(argv.maxWaitMs ?? 0);
    const maxWaitMs =
      Number.isFinite(maxWaitMsArg) && maxWaitMsArg > 0
        ? Math.max(1_000, maxWaitMsArg)
        : 0;
    const failureThreshold = Math.max(1, Number(argv.failureThreshold ?? 5));
    const pollIntervalMs = Math.max(250, Number(argv.pollIntervalMs ?? 1_000));
    const updaterOnly = argv.updaterOnly === true;

    if (!Number.isFinite(parentPid) || parentPid <= 0) {
      return;
    }

    // Package mutation belongs to the dedicated launchd updater worker. The
    // foreground fail-open guard remains cleanup-only.
    const UPDATE_CHECK_INTERVAL_MS = 2 * 60 * 60 * 1000; // 2 hours
    const QUIET_THRESHOLD_MS = 120 * 1000; // 2 minutes of silence
    const UPDATE_TIMEOUT_MS = 30 * 1000; // 30 seconds to come healthy

    // Get running version from /health endpoint (with timeout to avoid hanging)
    let runningVersion = PROXY_VERSION; // fallback
    try {
      const healthResp = await fetch(`http://${host}:${port}/health`, {
        signal: AbortSignal.timeout(5_000),
      });
      const healthData = (await healthResp.json()) as { version?: string };
      runningVersion = healthData.version ?? PROXY_VERSION;
    } catch {
      /* use fallback */
    }

    // Auto-update only works on macOS with launchd. On other platforms,
    // there's no restart mechanism, so skip the update loop entirely.
    const canAutoUpdate =
      updaterOnly &&
      isProxyAutoUpdateEnabled() &&
      process.platform === "darwin" &&
      (await isLaunchdManaging());

    let guardStopping = false;
    let updateCheckTimeout: NodeJS.Timeout | undefined;
    let updateCheckInterval: NodeJS.Timeout | undefined;
    const stopUpdateChecks = (): void => {
      guardStopping = true;
      if (updateCheckTimeout) {
        clearTimeout(updateCheckTimeout);
        updateCheckTimeout = undefined;
      }
      if (updateCheckInterval) {
        clearInterval(updateCheckInterval);
        updateCheckInterval = undefined;
      }
    };
    /** Keep state-write failures observable without terminating the updater. */
    const persistUpdaterState = (
      operation: string,
      action: () => void,
    ): void => {
      try {
        action();
      } catch (error) {
        logger.always(
          `[updater] WARNING: failed to ${operation}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    };
    let updateInProgress = false;
    let updateRestartInProgress = false;
    const runUpdateCheck = async () => {
      if (guardStopping || updateInProgress) {
        return;
      }
      updateInProgress = true;
      let updateVersion = runningVersion;
      try {
        // Lazy-load update modules so they're only imported at check time
        const { checkForUpdate } =
          await import("../../lib/proxy/updateChecker.js");

        // 1. Check for update
        const result = await checkForUpdate(runningVersion);
        updateVersion = result.latestVersion;
        persistUpdaterState("record update check", () =>
          recordCheck(result.latestVersion),
        );

        if (!result.updateAvailable) {
          return;
        }
        const pendingRestart =
          loadUpdateState()?.pendingRestartVersion === result.latestVersion;
        if (isVersionSuppressed(result.latestVersion) && !pendingRestart) {
          logger.debug(
            `[guard] version ${result.latestVersion} is suppressed, skipping`,
          );
          return;
        }

        logger.always(
          `[updater] update available: ${runningVersion} → ${result.latestVersion}`,
        );

        // 2. Wait for an exact runtime-idle window. Never force an update while
        // a request or stream is active; the next worker cycle can try again.
        const quietPollMs = 10_000; // check every 10s
        while (!guardStopping) {
          if (getProcessStatus(parentPid) === "not_running") {
            logger.always(
              `[updater] parent process died while waiting for idle traffic`,
            );
            return;
          }
          const activity = await getProxyRuntimeActivity(host, port);
          if (activity && isSafeUpdateWindow(activity, QUIET_THRESHOLD_MS)) {
            logger.always(`[updater] traffic idle, proceeding with update`);
            break;
          }
          logger.debug(
            `[updater] waiting for idle traffic (${activity?.activeRequests ?? "unknown"} active requests)`,
          );
          await new Promise((r) => setTimeout(r, quietPollMs));
        }
        if (guardStopping) {
          return;
        }

        // 3. Install update (validate version string before passing to shell)
        if (!/^\d+\.\d+\.\d+$/.test(result.latestVersion)) {
          const message = `invalid version format: ${result.latestVersion}`;
          logger.always(
            `[guard] WARNING: invalid version format "${result.latestVersion}", skipping`,
          );
          persistUpdaterState("record update failure", () =>
            recordUpdateFailure(result.latestVersion, "check", message),
          );
          return;
        }

        const { execFileSync } = await import("node:child_process");
        if (!pendingRestart) {
          const installerResolution = resolveGlobalInstaller({
            entryScript: process.argv[1],
          });
          logger.always(
            `[updater] package-manager candidates: ${installerResolution.tried
              .map(
                (candidate) =>
                  `${candidate.kind}:${candidate.bin}(${candidate.installable ? `v${candidate.version}` : (candidate.reason ?? "unusable")})`,
              )
              .join(", ")}`,
          );
          const installer = installerResolution.installer;
          if (!installer) {
            const message =
              "no package manager has a writable global root and executable directory";
            logger.always(`[updater] WARNING: ${message}; skipping this cycle`);
            persistUpdaterState("record update failure", () =>
              recordUpdateFailure(result.latestVersion, "install", message),
            );
            return;
          }
          logger.always(
            `[updater] installing @juspay/neurolink@${result.latestVersion} via ${installer.kind} ${installer.bin} (v${installer.version})`,
          );
          if (guardStopping || getProcessStatus(parentPid) === "not_running") {
            return;
          }
          try {
            execFileSync(
              installer.bin,
              getGlobalInstallArgs(
                installer.kind,
                `@juspay/neurolink@${result.latestVersion}`,
              ),
              {
                timeout: 120_000,
                stdio: "pipe",
              },
            );
          } catch (installErr) {
            const detail = describeInstallFailure(installErr);
            logger.always(
              `[updater] WARNING: global install failed:\n${detail}`,
            );
            persistUpdaterState("record update failure", () =>
              recordUpdateFailure(result.latestVersion, "install", detail),
            );
            return;
          }
        } else {
          logger.always(
            `[updater] resuming pending restart for already-installed v${result.latestVersion}`,
          );
        }

        // 4. Refresh and validate the stable trampoline. The plist already
        // points at this path, so it must not be unloaded or rewritten here.
        try {
          writeTrampoline();

          const validation = await validateInstalledVersion({
            binPath: TRAMPOLINE_PATH,
            expectedVersion: result.latestVersion,
          });
          if (validation.version !== result.latestVersion) {
            const message = `trampoline validation failed after ${validation.attempts} attempts: ${validation.failure ?? "unknown failure"}`;
            logger.always(`[updater] WARNING: ${message}; restart deferred`);
            persistUpdaterState("record update failure", () =>
              recordUpdateFailure(result.latestVersion, "validation", message),
            );
            persistUpdaterState("abandon invalid pending update", () =>
              abandonPendingUpdate(result.latestVersion),
            );
            return;
          }

          persistUpdaterState("record installed update", () =>
            recordUpdateInstalled(result.latestVersion),
          );
          logger.always(
            `[updater] trampoline validated at v${validation.version} after ${validation.attempts} attempt(s)`,
          );
        } catch (trampolineError) {
          const message =
            trampolineError instanceof Error
              ? trampolineError.message
              : String(trampolineError);
          logger.always(
            `[updater] WARNING: failed to refresh trampoline; refusing restart: ${message}`,
          );
          persistUpdaterState("record update failure", () =>
            recordUpdateFailure(result.latestVersion, "validation", message),
          );
          persistUpdaterState("abandon invalid pending update", () =>
            abandonPendingUpdate(result.latestVersion),
          );
          return;
        }

        if (guardStopping || getProcessStatus(parentPid) === "not_running") {
          return;
        }

        // Installation can overlap new traffic. Re-establish a full idle window
        // before restart so no accepted request or long stream is interrupted.
        while (!guardStopping) {
          if (getProcessStatus(parentPid) === "not_running") {
            return;
          }
          const activity = await getProxyRuntimeActivity(host, port);
          if (activity && isSafeUpdateWindow(activity, QUIET_THRESHOLD_MS)) {
            break;
          }
          logger.debug(
            `[updater] update installed; deferring restart (${activity?.activeRequests ?? "unknown"} active requests)`,
          );
          await sleep(10_000);
        }
        if (guardStopping) {
          return;
        }

        // Signal the health loop to not exit when it detects
        // the parent PID is gone — we're intentionally restarting.
        updateRestartInProgress = true;
        logger.always(`[updater] restarting proxy via launchctl kickstart`);
        const uid = process.getuid?.() ?? 501;
        try {
          execFileSync(
            "launchctl",
            ["kickstart", "-k", `gui/${uid}/${PLIST_LABEL}`],
            {
              timeout: 10_000,
              stdio: "pipe",
            },
          );
        } catch (restartErr) {
          updateRestartInProgress = false;
          const msg =
            restartErr instanceof Error
              ? restartErr.message
              : String(restartErr);
          logger.always(
            `[updater] WARNING: launchctl kickstart failed: ${msg}`,
          );
          persistUpdaterState("record update failure", () =>
            recordUpdateFailure(result.latestVersion, "restart", msg),
          );
          return;
        }

        // 5. Wait for healthy restart
        let healthy = false;
        const restartStart = Date.now();
        while (Date.now() - restartStart < UPDATE_TIMEOUT_MS) {
          await new Promise((r) => setTimeout(r, 2000));
          try {
            const resp = await fetch(`http://${host}:${port}/health`, {
              signal: AbortSignal.timeout(3000),
            });
            if (resp.ok) {
              const data = (await resp.json()) as { version?: string };
              if (data.version === result.latestVersion) {
                healthy = true;
                break;
              }
            }
          } catch {
            /* retry */
          }
        }

        if (healthy) {
          logger.always(
            `[updater] update successful: now running ${result.latestVersion}`,
          );
          persistUpdaterState("record successful update", () =>
            recordSuccessfulUpdate(result.latestVersion),
          );
          // The replacement proxy starts a worker running the new version.
          process.exit(0);
        } else {
          logger.always(
            `[updater] WARNING: proxy unhealthy after update to ${result.latestVersion}`,
          );
          persistUpdaterState("record update failure", () =>
            recordUpdateFailure(
              result.latestVersion,
              "health",
              `proxy did not report v${result.latestVersion} healthy within ${UPDATE_TIMEOUT_MS}ms`,
            ),
          );
          persistUpdaterState("abandon unhealthy pending update", () =>
            abandonPendingUpdate(result.latestVersion),
          );
          persistUpdaterState("suppress unhealthy update", () =>
            suppressVersion(result.latestVersion, "unhealthy_after_restart"),
          );
          updateRestartInProgress = false;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.always(`[updater] update check error: ${message}`);
        persistUpdaterState("record update failure", () =>
          recordUpdateFailure(updateVersion, "check", message),
        );
      } finally {
        updateInProgress = false;
      }
    };

    // Run first check after a short delay, then on interval
    if (canAutoUpdate) {
      updateCheckTimeout = setTimeout(runUpdateCheck, 30_000);
      updateCheckInterval = setInterval(
        runUpdateCheck,
        UPDATE_CHECK_INTERVAL_MS,
      );
    }

    const startedAt = Date.now();
    let parentStatus = getProcessStatus(parentPid);
    let consecutiveUnhealthy = 0;

    // Keep monitoring for as long as the parent can affect Claude settings.
    while (true) {
      const healthy = await isProxyHealthy(host, port, 1_500);

      if (healthy) {
        if (updaterOnly && consecutiveUnhealthy >= failureThreshold) {
          logger.always(
            `[updater] proxy health recovered after ${consecutiveUnhealthy} failed checks`,
          );
        }
        consecutiveUnhealthy = 0;
      } else {
        consecutiveUnhealthy += 1;
        if (updaterOnly && consecutiveUnhealthy === failureThreshold) {
          logger.always(
            `[updater] proxy health unavailable after ${consecutiveUnhealthy} checks; worker remains active`,
          );
        }
      }

      if (parentStatus === "not_running" && !updateRestartInProgress) {
        if (updaterOnly) {
          logger.always(
            `[updater] parent pid=${parentPid} exited; updater worker stopping`,
          );
        }
        // Parent is gone (and we're not mid-update-restart).
        // If endpoint is still healthy, another proxy took over.
        if (healthy) {
          stopUpdateChecks();
          return;
        }
        break;
      }

      if (
        !updaterOnly &&
        !updateRestartInProgress &&
        !healthy &&
        consecutiveUnhealthy >= failureThreshold
      ) {
        // A detached guard cannot safely decide that a live process should be
        // replaced. Leave recovery to the foreground operator or launchd.
        if (!argv.quiet) {
          logger.always(
            `[proxy] fail-open guard observed an unhealthy live parent; leaving process supervision unchanged`,
          );
        }
        stopUpdateChecks();
        return;
      }

      if (maxWaitMs > 0 && Date.now() - startedAt >= maxWaitMs) {
        stopUpdateChecks();
        return;
      }

      await sleep(pollIntervalMs);
      parentStatus = getProcessStatus(parentPid);
    }

    stopUpdateChecks();

    if (updaterOnly) {
      return;
    }

    const guardHost = host === "0.0.0.0" ? "localhost" : host;
    const expectedBaseUrl = `http://${guardHost}:${port}`;

    // The parent is confirmed gone and no replacement is healthy. Foreground
    // guards are cleanup-only; they never restart or signal proxy processes.
    const cleared = await clearClaudeProxySettings(expectedBaseUrl);
    try {
      await clearOpenCodeProxySettings(`${expectedBaseUrl}/v1`);
    } catch {
      // non-fatal
    }

    const state = loadProxyState();
    if (
      state &&
      state.host === host &&
      state.port === port &&
      !isProcessRunning(state.pid)
    ) {
      clearProxyState();
    }

    if (cleared && !argv.quiet) {
      logger.always(
        `[proxy] fail-open guard removed stale ${expectedBaseUrl} from Claude settings`,
      );
    }
  },
};

// =============================================================================
// PROXY SETUP COMMAND
// =============================================================================

export const proxySetupCommand: CommandModule = {
  command: "setup",
  describe:
    "One-command setup: login + install proxy as persistent service + configure Claude Code",
  builder: (yargs: Argv) => {
    return yargs
      .option("port", {
        type: "number",
        alias: "p",
        default: 55669,
        description: "Proxy port",
      })
      .option("method", {
        type: "string",
        default: "oauth",
        choices: ["oauth", "api-key"],
        description: "Auth method",
      })
      .option("no-service", {
        type: "boolean",
        default: false,
        description:
          "Skip service installation and start proxy in foreground instead",
      })
      .option("env-file", {
        type: "string",
        alias: "envFile",
        description: "Path to proxy provider env file to persist for the proxy",
      })
      .example("neurolink proxy setup", "Full setup with defaults")
      .example("neurolink proxy setup -p 9000", "Setup on custom port")
      .example(
        "neurolink proxy setup --no-service",
        "Setup without installing as service",
      ) as Argv;
  },
  handler: async (argv) => {
    console.info("\n" + chalk.bold("NeuroLink Proxy Setup\n"));

    const port = (argv.port as number) ?? 55669;
    const noService = argv["no-service"] as boolean;

    // Step 1: Check existing accounts
    console.info(chalk.blue("Step 1:") + " Checking accounts...");
    const { tokenStore } = await import("../../lib/auth/tokenStore.js");
    const allKeys = await tokenStore.listProviders();
    const anthropicKeys = allKeys.filter(
      (k) => k.startsWith("anthropic:") || k === "anthropic",
    );
    const validKeys: string[] = [];
    for (const key of anthropicKeys) {
      const tokens = await tokenStore.loadTokens(key);
      if (tokens && (!tokens.expiresAt || tokens.expiresAt > Date.now())) {
        validKeys.push(key);
      }
    }

    // Also check legacy credentials file
    try {
      const fs = await import("fs");
      const credPath = join(
        homedir(),
        ".neurolink",
        "anthropic-credentials.json",
      );
      const creds = JSON.parse(fs.readFileSync(credPath, "utf8"));
      if (creds.oauth?.accessToken && creds.oauth?.expiresAt > Date.now()) {
        validKeys.push("legacy-anthropic");
        console.info(chalk.green("  ✓ Found valid OAuth account"));
      }
    } catch {
      /* no file */
    }

    if (validKeys.length > 0) {
      console.info(
        chalk.green(`  ✓ Found ${validKeys.length} valid account(s)`),
      );
    } else {
      // Step 2: Login
      console.info(
        chalk.yellow("  No valid accounts found. Starting login..."),
      );
      console.info(chalk.blue("\nStep 2:") + " Authenticating...");
      const { handleLogin } = await import("./auth.js");
      await handleLogin({
        provider: "anthropic",
        method: argv.method as string,
      } as Parameters<typeof handleLogin>[0]);
      console.info(chalk.green("  ✓ Authentication complete"));
    }

    // Step 3: Install as persistent service (macOS) or start foreground
    const stepNum = validKeys.length > 0 ? 2 : 3;

    if (!noService && process.platform === "darwin") {
      console.info(
        chalk.blue(`\nStep ${stepNum}:`) +
          " Installing proxy as persistent service...",
      );
      await (proxyInstallCommand.handler as Function)({
        ...argv,
        port,
        host: "127.0.0.1",
      });

      // Step 4: Configure Claude Code settings
      const nextStep = stepNum + 1;
      console.info(
        chalk.blue(`\nStep ${nextStep}:`) + " Configuring Claude Code...",
      );
      const url = `http://127.0.0.1:${port}`;
      try {
        await setClaudeProxySettings(url);
        console.info(chalk.green("  ✓ Claude Code configured"));
      } catch (e) {
        console.info(
          chalk.yellow(
            `  ⚠ Could not auto-configure Claude Code: ${e instanceof Error ? e.message : String(e)}`,
          ),
        );
        console.info(chalk.yellow(`  Set manually: ANTHROPIC_BASE_URL=${url}`));
      }
      try {
        await setOpenCodeProxySettings(`${url}/v1`);
        console.info(chalk.green("  ✓ OpenCode configured"));
      } catch (e) {
        console.info(
          chalk.yellow(
            `  ⚠ Could not auto-configure OpenCode: ${e instanceof Error ? e.message : String(e)}`,
          ),
        );
      }

      // Done!
      console.info("");
      console.info(chalk.bold.green("Setup complete!"));
      console.info(`  Proxy running as daemon on ${chalk.cyan(url)}`);
      console.info(`  Auto-restarts on crash (5s throttle) and on login`);
      console.info("");
      console.info(chalk.gray("  Status:    neurolink proxy status"));
      console.info(
        chalk.gray("  Logs:      ~/.neurolink/logs/proxy-launchd-*.log"),
      );
      console.info(chalk.gray("  Uninstall: neurolink proxy uninstall"));
      console.info("");
    } else {
      // Foreground mode (--no-service or non-macOS)
      if (noService) {
        console.info(
          chalk.blue(`\nStep ${stepNum}:`) + " Starting proxy in foreground...",
        );
      } else {
        console.info(chalk.blue(`\nStep ${stepNum}:`) + " Starting proxy...");
        console.info(
          chalk.yellow(
            "  Note: No daemon support on this platform. Proxy runs in foreground.",
          ),
        );
      }
      // Delegate to proxy start handler — blocks until Ctrl+C
      await (proxyStartCommand.handler as Function)({
        ...argv,
        quiet: false,
      });
    }
  },
};

// =============================================================================
// PROXY INSTALL / UNINSTALL — launchd service (macOS)
// =============================================================================

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Build a PATH for the launchd plist that includes the current Node/pnpm
 * bin directories so the guard process can find npm/pnpm for update checks.
 */
function buildLaunchdPath(): string {
  const fallback = "/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin";
  const nodeDir = dirname(process.execPath);
  const segments = new Set<string>();

  // Add the directory containing the Node binary that launched this process
  if (nodeDir && nodeDir !== ".") {
    segments.add(nodeDir);
  }

  // Add pnpm home if available (e.g., ~/.local/share/pnpm)
  const pnpmHome = process.env.PNPM_HOME;
  if (pnpmHome) {
    segments.add(pnpmHome);
  }

  // Add the standard system paths
  for (const p of fallback.split(":")) {
    segments.add(p);
  }

  return [...segments].join(":");
}

function buildPlist(
  port: number,
  host: string,
  envFile?: string,
  configFile?: string,
): string {
  // The plist invokes the trampoline script (a tiny shell wrapper at
  // ~/.neurolink/bin/neurolink-proxy) which re-resolves the real
  // `neurolink` binary via PATH on every launch.  This way, launchd
  // is never pinned to a version-specific pnpm store path.
  const trampolinePath = escapeXml(TRAMPOLINE_PATH);
  const envFileArgs = envFile
    ? `
    <string>--env-file</string>
    <string>${escapeXml(envFile)}</string>`
    : "";
  const configArgs = configFile
    ? `
    <string>--config</string>
    <string>${escapeXml(configFile)}</string>`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${PLIST_LABEL}</string>

  <key>ProgramArguments</key>
  <array>
    <string>${trampolinePath}</string>
    <string>proxy</string>
    <string>start</string>
    <string>--port</string>
    <string>${port}</string>
    <string>--host</string>
    <string>${host}</string>
${envFileArgs}
${configArgs}
    <string>--quiet</string>
  </array>

  <key>RunAtLoad</key>
  <true/>

  <key>KeepAlive</key>
  <dict>
    <key>SuccessfulExit</key>
    <false/>
  </dict>

  <key>ThrottleInterval</key>
  <integer>5</integer>

  <key>ExitTimeOut</key>
  <integer>45</integer>

  <key>StandardOutPath</key>
  <string>${join(homedir(), ".neurolink", "logs", "proxy-launchd-stdout.log")}</string>

  <key>StandardErrorPath</key>
  <string>${join(homedir(), ".neurolink", "logs", "proxy-launchd-stderr.log")}</string>

  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>${buildLaunchdPath()}</string>
    <key>HOME</key>
    <string>${homedir()}</string>
  </dict>
</dict>
</plist>`;
}

export const proxyInstallCommand: CommandModule = {
  command: "install",
  describe:
    "Install proxy as a persistent background service (auto-restarts on crash/reboot)",
  builder: (yargs: Argv) => {
    return yargs
      .option("port", {
        type: "number",
        alias: "p",
        default: 55669,
        description: "Proxy port",
      })
      .option("host", {
        type: "string",
        default: "127.0.0.1",
        description: "Proxy host",
      })
      .option("env-file", {
        type: "string",
        alias: "envFile",
        description:
          "Path to proxy provider env file to persist for the service",
      })
      .option("config", {
        type: "string",
        description:
          "Path to proxy routing config file to persist for the service",
      })
      .example("neurolink proxy install", "Install with defaults (port 55669)")
      .example(
        "neurolink proxy install -p 9000",
        "Install on custom port",
      ) as Argv;
  },
  handler: async (argv) => {
    const port = (argv.port as number) ?? 55669;
    const host = (argv.host as string) ?? "127.0.0.1";

    if (process.platform !== "darwin") {
      console.info(
        chalk.red("proxy install is currently macOS-only (uses launchd)."),
      );
      console.info(
        chalk.yellow("On Linux, use systemd. On Windows, use Task Scheduler."),
      );
      process.exit(1);
    }

    const { writeFileSync, mkdirSync, existsSync } = await import("fs");
    const envResolution = resolveProxyEnvFile({
      explicitEnvFile: (argv as { envFile?: string }).envFile,
    });
    const envFile = envResolution.path;
    const explicitConfig = (argv as { config?: string }).config;
    const configPath = explicitConfig
      ? resolve(explicitConfig)
      : join(homedir(), ".neurolink", "proxy-config.yaml");
    if (explicitConfig && !existsSync(configPath)) {
      console.info(chalk.red(`Proxy config file not found: ${configPath}`));
      process.exit(1);
    }
    const configFile = existsSync(configPath) ? configPath : undefined;

    if (envFile && !existsSync(envFile)) {
      console.info(chalk.red(`Proxy env file not found: ${envFile}`));
      process.exit(1);
    }

    const logsDir = join(homedir(), ".neurolink", "logs");
    if (!existsSync(logsDir)) {
      mkdirSync(logsDir, { recursive: true });
    }

    if (!existsSync(PLIST_DIR)) {
      mkdirSync(PLIST_DIR, { recursive: true });
    }

    writeTrampoline();
    console.info(chalk.green(`✓ Trampoline written to ${TRAMPOLINE_PATH}`));

    // Sanity-check: run the trampoline itself and confirm it resolves to
    // a working neurolink binary. This catches environments where every
    // PATH-based candidate is broken AND the baked-in path is unreachable.
    const trampolineVersion = probeBinVersion(TRAMPOLINE_PATH);
    if (!trampolineVersion) {
      console.info(
        chalk.red(
          `✗ Trampoline validation failed: ${TRAMPOLINE_PATH} --version did not run cleanly.`,
        ),
      );
      console.info(
        chalk.yellow(
          `  The launchd service would not be able to start neurolink. Fix your install first.`,
        ),
      );
      console.info(
        chalk.yellow(
          `  Try: 'pnpm add -g @juspay/neurolink' or set NEUROLINK_BIN=/path/to/working/neurolink.`,
        ),
      );
      process.exit(1);
    }
    if (trampolineVersion !== PROXY_VERSION) {
      console.info(
        chalk.red(
          `✗ Trampoline resolves to v${trampolineVersion} but this installer is v${PROXY_VERSION}.`,
        ),
      );
      console.info(
        chalk.yellow(
          `  PATH may shadow this installation with an older version. Fix your PATH or set NEUROLINK_BIN.`,
        ),
      );
      process.exit(1);
    }
    console.info(
      chalk.green(
        `✓ Trampoline validated (resolves to neurolink v${trampolineVersion})`,
      ),
    );

    const plist = buildPlist(port, host, envFile, configFile);
    writeFileSync(PLIST_PATH, plist, "utf-8");
    console.info(chalk.green(`✓ Plist written to ${PLIST_PATH}`));
    if (envFile) {
      console.info(chalk.green(`✓ Proxy env file: ${envFile}`));
    }

    try {
      const { execFileSync } = await import("node:child_process");
      execFileSync("launchctl", ["unload", PLIST_PATH], {
        stdio: "ignore",
      });
    } catch {
      /* not loaded yet */
    }

    try {
      const { execFileSync } = await import("node:child_process");
      execFileSync("launchctl", ["load", PLIST_PATH]);
      console.info(chalk.green(`✓ Service loaded and started`));
    } catch (e) {
      console.info(chalk.red(`Failed to load service: ${e}`));
      process.exit(1);
    }

    // Wait briefly for launchd to start the process, then persist state
    await new Promise((resolve) => setTimeout(resolve, 2_000));
    try {
      const { execFileSync } = await import("node:child_process");
      const uid = process.getuid?.() ?? 501;
      const output = execFileSync(
        "launchctl",
        ["print", `gui/${uid}/${PLIST_LABEL}`],
        { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
      );
      const pidMatch = output.match(/pid\s*=\s*(\d+)/);
      if (pidMatch) {
        saveProxyState({
          pid: Number(pidMatch[1]),
          port,
          host,
          strategy: "fill-first",
          startTime: new Date().toISOString(),
          envFile,
          managedBy: "launchd",
        });
      }
    } catch {
      /* non-fatal — state will be written by the proxy process itself */
    }

    console.info("");
    console.info(chalk.bold("Proxy is now a persistent service:"));
    console.info(`  • Auto-starts on login`);
    console.info(`  • Auto-restarts on crash (5s throttle)`);
    console.info(`  • Listening on http://${host}:${port}`);
    console.info(`  • Logs: ~/.neurolink/logs/proxy-launchd-*.log`);
    console.info("");
    console.info(chalk.gray(`  Manage: launchctl start/stop ${PLIST_LABEL}`));
    console.info(chalk.gray(`  Remove: neurolink proxy uninstall`));
  },
};

export const proxyUninstallCommand: CommandModule = {
  command: "uninstall",
  describe: "Remove proxy background service",
  builder: (yargs: Argv) => yargs,
  handler: async () => {
    if (process.platform !== "darwin") {
      console.info(chalk.red("proxy uninstall is currently macOS-only."));
      process.exit(1);
    }

    const { existsSync, unlinkSync } = await import("fs");

    if (!existsSync(PLIST_PATH)) {
      console.info(chalk.yellow("No proxy service installed."));
      return;
    }

    try {
      const { execFileSync } = await import("node:child_process");
      execFileSync("launchctl", ["unload", PLIST_PATH]);
      console.info(chalk.green(`✓ Service stopped`));
    } catch {
      /* may not be loaded */
    }

    unlinkSync(PLIST_PATH);
    console.info(chalk.green(`✓ Plist removed from ${PLIST_PATH}`));
    console.info(chalk.green(`✓ Proxy service uninstalled`));
  },
};
