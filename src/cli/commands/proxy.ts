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
import {
  buildProxyHealthResponse,
  createProxyReadinessState,
  markProxyReady,
  waitForProxyReadiness,
} from "../../lib/proxy/proxyHealth.js";
import { logger } from "../../lib/utils/logger.js";
import {
  formatUptime,
  isProcessRunning,
  StateFileManager,
} from "../utils/serverUtils.js";
import type {
  FallbackInfo,
  LoadedProxyConfig,
  ProxyGuardArgs,
  ProxyNeurolinkRuntime,
  ProxySpinner,
  ProxyStartApp,
  ProxyStartArgs,
  ProxyStartStrategy,
  ProxyState,
  ProxyStatusArgs,
  ProxyTelemetryAction,
  ProxyTelemetryArgs,
  StatusStats,
} from "../../lib/types/index.js";
import type { ModelRouter } from "../../lib/proxy/modelRouter.js";
import {
  loadProxyEnvFile,
  resolveProxyEnvFile,
} from "../../lib/proxy/proxyEnv.js";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const _require = createRequire(import.meta.url);
const { version: PROXY_VERSION } = _require("../../../package.json") as {
  version: string;
};

const PROXY_TELEMETRY_SCRIPT_PATH = fileURLToPath(
  new URL(
    "../../../scripts/observability/manage-local-openobserve.sh",
    import.meta.url,
  ),
);

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

/**
 * Attempt to restart the proxy via launchd kickstart.
 * Returns true if the proxy comes back healthy within timeoutMs.
 */
async function tryLaunchdRestart(
  host: string,
  port: number,
  timeoutMs: number = 15_000,
): Promise<boolean> {
  if (process.platform !== "darwin") {
    return false;
  }

  try {
    const { existsSync } = await import("fs");
    if (!existsSync(PLIST_PATH)) {
      return false;
    }
  } catch {
    return false;
  }

  try {
    const { execFileSync } = await import("node:child_process");
    const uid = process.getuid?.() ?? 501;
    execFileSync(
      "launchctl",
      ["kickstart", "-k", `gui/${uid}/${PLIST_LABEL}`],
      { stdio: "ignore", timeout: 5_000 },
    );
  } catch {
    return false;
  }

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await sleep(1_000);
    if (await isProxyHealthy(host, port, 2_000)) {
      return true;
    }
  }

  return false;
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

/**
 * Resolve the `pnpm` binary defensively.
 *
 * Tries multiple candidates in order of preference and validates each by
 * running `--version`. Returns the first one that actually works, along
 * with a list of all candidates tried (for diagnostics). This defends
 * against environments where `which pnpm` returns a broken shim or an
 * incompatible version.
 *
 * Honors `NEUROLINK_PNPM_PATH` as an escape hatch.
 */
function resolveFullPnpmPath(): {
  bin: string;
  resolved: boolean;
  version?: string;
  tried: Array<{ path: string; version?: string; working: boolean }>;
} {
  const candidates: string[] = [];

  // 1. User override
  if (process.env.NEUROLINK_PNPM_PATH) {
    candidates.push(process.env.NEUROLINK_PNPM_PATH);
  }

  // 2. PNPM_HOME (pnpm's own env variable)
  if (process.env.PNPM_HOME) {
    candidates.push(join(process.env.PNPM_HOME, "pnpm"));
  }

  // 3. `which pnpm` — whatever is on PATH
  try {
    const { execFileSync } = _require(
      "node:child_process",
    ) as typeof import("node:child_process");
    const whichOut = execFileSync("which", ["pnpm"], {
      encoding: "utf8",
      timeout: 5_000,
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (whichOut) {
      candidates.push(whichOut);
    }
  } catch {
    // ignore
  }

  // 4. Common standalone installer locations
  candidates.push(join(homedir(), ".local", "share", "pnpm", "pnpm"));
  candidates.push(join(homedir(), "Library", "pnpm", "pnpm"));

  // Dedupe while preserving order
  const seen = new Set<string>();
  const unique = candidates.filter((p) => {
    if (!p || seen.has(p)) {
      return false;
    }
    seen.add(p);
    return true;
  });

  // Probe each candidate
  const tried = unique.map((path) => {
    const version = probeBinVersion(path);
    return { path, version, working: version !== undefined };
  });

  const working = tried.find((r) => r.working);
  if (working) {
    return {
      bin: working.path,
      resolved: true,
      version: working.version,
      tried,
    };
  }

  return { bin: "pnpm", resolved: false, tried };
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
  logger.always(`  ${chalk.blue("POST")} /v1/messages  — Proxy to Anthropic`);
  logger.always(`  ${chalk.green("GET")}  /health       — Health check`);
  logger.always(`  ${chalk.green("GET")}  /status       — Detailed status`);
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

async function ensureProxyStartAllowed(spinner: ProxySpinner): Promise<void> {
  const existingState = loadProxyState();
  if (existingState) {
    if (isProcessRunning(existingState.pid)) {
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
    clearProxyState();
  }

  if (process.ppid === 1 || !(await isLaunchdManaging())) {
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

async function loadProxyStartConfiguration(
  argv: ProxyStartArgs,
  spinner: ProxySpinner,
): Promise<{
  configPath: string;
  proxyConfig: LoadedProxyConfig | null;
  strategy: ProxyStartStrategy;
  modelRouter: ModelRouter | undefined;
  passthrough: boolean;
}> {
  const configPath =
    argv.config ?? join(homedir(), ".neurolink", "proxy-config.yaml");
  let proxyConfig: LoadedProxyConfig | null = null;

  try {
    const { loadProxyConfig } = await import("../../lib/proxy/proxyConfig.js");
    proxyConfig = (await loadProxyConfig(configPath)) as LoadedProxyConfig;
    if (spinner) {
      spinner.text = `Loaded proxy config from ${configPath}`;
    }
  } catch (configError) {
    if (argv.config) {
      if (spinner) {
        spinner.fail(chalk.red(`Failed to load proxy config: ${configPath}`));
      }
      process.exit(1);
    }
    const isNotFound =
      configError instanceof Error &&
      "code" in configError &&
      (configError as NodeJS.ErrnoException).code === "ENOENT";
    if (!isNotFound) {
      logger.warn(
        `[proxy] Ignoring default config ${configPath}: ${configError instanceof Error ? configError.message : String(configError)}`,
      );
    }
  }

  const strategy = (argv.strategy ??
    proxyConfig?.routing?.strategy ??
    "fill-first") as ProxyStartStrategy;
  let modelRouter: ModelRouter | undefined;

  if (proxyConfig?.routing) {
    const { ModelRouter } = await import("../../lib/proxy/modelRouter.js");
    modelRouter = new ModelRouter({
      strategy,
      modelMappings: proxyConfig.routing.modelMappings ?? [],
      fallbackChain: proxyConfig.routing.fallbackChain ?? [],
      passthroughModels: proxyConfig.routing.passthroughModels,
    });
  }

  return {
    configPath,
    proxyConfig,
    strategy,
    modelRouter,
    passthrough: argv.passthrough ?? false,
  };
}

async function createProxyStartApp(params: {
  neurolink: ProxyNeurolinkRuntime["neurolink"];
  modelRouter: ModelRouter | undefined;
  strategy: ProxyStartStrategy;
  passthrough: boolean;
  port: number;
  host: string;
  proxyConfig: LoadedProxyConfig | null;
}) {
  const { createClaudeProxyRoutes } =
    await import("../../lib/server/routes/claudeProxyRoutes.js");
  const { Hono } = await import("hono");

  const app = new Hono();
  const readiness = createProxyReadinessState();
  app.onError((err, c) => {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.always(`[proxy] unhandled error: ${errMsg}`);
    if (err instanceof Error && err.stack) {
      logger.debug(`[proxy] stack: ${err.stack}`);
    }
    return c.json(
      {
        type: "error",
        error: {
          type: "api_error",
          message: `Proxy internal error: ${errMsg}`,
        },
      },
      502,
    );
  });

  const routeGroup = createClaudeProxyRoutes(
    params.modelRouter,
    "",
    params.strategy,
    params.passthrough,
  );

  for (const route of routeGroup.routes) {
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
      logger.always(
        `[proxy] ${c.req.method} ${c.req.path} → model=${model} ${stream} tools=${toolCount}`,
      );

      const ctx = {
        requestId: crypto.randomUUID(),
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

  app.get("/health", (c) =>
    c.json(
      buildProxyHealthResponse(readiness, {
        strategy: params.strategy,
        passthrough: params.passthrough,
        version: PROXY_VERSION,
      }),
    ),
  );

  app.get("/status", async (c) => {
    const { getStats } = await import("../../lib/proxy/usageStats.js");
    const stats = getStats();
    const health = buildProxyHealthResponse(readiness, {
      strategy: params.strategy,
      passthrough: params.passthrough,
      version: PROXY_VERSION,
    });
    return c.json({
      status: "running",
      ready: health.ready,
      acceptingConnections: health.acceptingConnections,
      readyAt: health.readyAt,
      pid: process.pid,
      port: params.port,
      host: params.host,
      strategy: params.strategy,
      uptime: process.uptime(),
      version: PROXY_VERSION,
      health,
      stats: {
        totalAttempts: stats.totalAttempts,
        totalRequests: stats.totalRequests,
        totalSuccess: stats.totalSuccess,
        totalErrors: stats.totalErrors,
        totalRateLimits: stats.totalRateLimits,
        accounts: Object.values(stats.accounts).map((account) => ({
          label: account.label,
          type: account.type,
          attempts: account.attemptCount,
          requests: account.attemptCount,
          success: account.successCount,
          errors: account.errorCount,
          rateLimits: account.rateLimitCount,
          cooling: false, // No persistent cooldown — always active
        })),
      },
      config: params.proxyConfig
        ? { hasRouting: !!params.proxyConfig.routing }
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

async function refreshProxyTokensInBackground(): Promise<void> {
  const { needsRefresh, refreshToken, persistTokens } =
    await import("../../lib/proxy/tokenRefresh.js");
  const { tokenStore } = await import("../../lib/auth/tokenStore.js");

  try {
    const allKeys = await tokenStore.listProviders();
    const anthropicKeys = allKeys.filter((key) => key.startsWith("anthropic:"));
    for (const key of anthropicKeys) {
      try {
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
        if (needsRefresh(account)) {
          const result = await refreshToken(account);
          if (result.success) {
            await persistTokens({ providerKey: key }, account);
            logger.debug(
              `[proxy] background token refresh succeeded for ${key}`,
            );
          }
        }
      } catch {
        // non-fatal per-account
      }
    }
  } catch {
    // non-fatal
  }

  try {
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
    if (needsRefresh(account)) {
      const result = await refreshToken(account);
      if (result.success) {
        await persistTokens(credPath, account);
        logger.debug("[proxy] background token refresh succeeded");
      }
    }
  } catch {
    // non-fatal
  }
}

function startProxyBackgroundMaintenance(
  cleanupLogs: (days: number, maxMb: number) => void,
): {
  refreshInterval: NodeJS.Timeout;
  logCleanupInterval: NodeJS.Timeout;
} {
  const refreshInterval = setInterval(() => {
    void refreshProxyTokensInBackground();
  }, 30_000);
  const logCleanupInterval = setInterval(
    () => {
      cleanupLogs(7, 500);
    },
    60 * 60 * 1000,
  );
  return { refreshInterval, logCleanupInterval };
}

function registerProxyShutdownHandlers(params: {
  server: { close?: () => void };
  host: string;
  port: number;
  isDev?: boolean;
  refreshInterval: NodeJS.Timeout;
  logCleanupInterval: NodeJS.Timeout;
}): void {
  const shutdown = async (signal: string) => {
    clearInterval(params.refreshInterval);
    clearInterval(params.logCleanupInterval);
    logger.always(`\nShutting down proxy (${signal})...`);

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
    }

    try {
      params.server.close?.();
    } catch {
      // Best-effort close
    }
    clearProxyState();
    process.exit(signal === "SIGINT" ? 0 : 1);
  };

  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
  process.on("SIGINT", () => {
    void shutdown("SIGINT");
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
  loadedEnvFile: string | undefined;
  passthrough: boolean;
  cleanupLogs: ProxyNeurolinkRuntime["cleanupLogs"];
}): Promise<void> {
  const { serve } = await import("@hono/node-server");
  const server = serve({
    fetch: params.app.fetch,
    port: params.port,
    hostname: params.host,
  });
  // Skip the fail-open guard in dev mode — it monitors the proxy and clears
  // global Claude settings on exit, which is exactly what we want to avoid.
  const guardPid = params.argv.dev
    ? undefined
    : spawnFailOpenGuard(params.host, params.port, process.pid);
  const readinessHost = params.host === "0.0.0.0" ? "127.0.0.1" : params.host;
  await waitForProxyReadiness({
    host: readinessHost,
    port: params.port,
  });
  markProxyReady(params.readiness);
  const fallbackChain: FallbackInfo[] | undefined =
    params.proxyConfig?.routing?.fallbackChain?.map((entry) => ({
      provider: entry.provider as string,
      model: entry.model as string,
    }));

  saveProxyState({
    pid: process.pid,
    port: params.port,
    host: params.host,
    strategy: params.strategy,
    startTime: new Date().toISOString(),
    ready: true,
    readyAt: params.readiness.readyAtMs
      ? new Date(params.readiness.readyAtMs).toISOString()
      : undefined,
    healthPath: "/health",
    statusPath: "/status",
    envFile: params.loadedEnvFile,
    fallbackChain,
    guardPid,
    managedBy:
      process.platform === "darwin" && process.ppid === 1
        ? "launchd"
        : "manual",
    passthrough: params.passthrough,
  });

  if (params.spinner) {
    params.spinner.succeed(chalk.green("Claude proxy started successfully"));
  }

  const isDev = params.argv.dev ?? false;
  const normalizedHost = params.host === "0.0.0.0" ? "localhost" : params.host;
  const url = `http://${normalizedHost}:${params.port}`;
  printProxyBanner(url, params.strategy);

  if (isDev) {
    logger.always(
      `  ${chalk.bold("Mode:")}       ${chalk.magenta("dev (isolated — state in .neurolink-dev/)")}`,
    );
  } else {
    logger.always(
      `  ${chalk.bold("Mode:")}       ${chalk.cyan(params.passthrough ? "passthrough" : "full")}`,
    );
  }
  if (params.passthrough) {
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
  } else {
    logger.always(
      chalk.dim("  ⊘ Dev mode: skipping client auto-configuration"),
    );
  }

  const maintenance = startProxyBackgroundMaintenance(params.cleanupLogs);
  registerProxyShutdownHandlers({
    server,
    host: params.host,
    port: params.port,
    isDev,
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

      // Ensure the dev state directory exists
      const { mkdirSync, existsSync } = await import("fs");
      if (!existsSync(devPaths.stateDir)) {
        mkdirSync(devPaths.stateDir, { recursive: true, mode: 0o700 });
      }
    }

    if (!isDev) {
      await ensureProxyStartAllowed(spinner);
    }
    const loadedEnvFile = await loadProxyStartEnv(argv, spinner);
    const { neurolink, cleanupLogs } = await createProxyNeurolinkRuntime(
      devPaths?.logsDir,
    );
    const { proxyConfig, strategy, modelRouter, passthrough } =
      await loadProxyStartConfiguration(argv, spinner);

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
      loadedEnvFile,
      passthrough,
      cleanupLogs,
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
  console.info(`    Rate limits: ${stats.totalRateLimits}`);
  if (stats.accounts?.length) {
    console.info(`\n  Accounts:`);
    for (const a of stats.accounts) {
      const acctStatus = a.cooling
        ? chalk.red("cooling")
        : chalk.green("active");
      const attempts = a.attempts ?? a.requests ?? 0;
      const success = a.success ?? 0;
      const errors = a.errors ?? 0;
      const rateLimits = a.rateLimits ?? 0;
      console.info(
        `    ${a.label.padEnd(20)} ${a.type.padEnd(8)} ${String(attempts).padEnd(6)} attempts  ${String(success).padEnd(6)} success  ${String(errors).padEnd(6)} errors  ${String(rateLimits).padEnd(6)} rl  ${acctStatus}`,
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
      }

      // Fetch live stats before rendering (JSON or text)
      let liveStats: Record<string, unknown> | null = null;
      if (status.running && status.url) {
        try {
          const statusResp = await fetch(`${status.url}/status`);
          if (statusResp.ok) {
            const statusData = (await statusResp.json()) as Record<
              string,
              unknown
            >;
            liveStats = statusData.stats as Record<string, unknown> | null;
          }
        } catch {
          // Non-fatal — live stats unavailable
        }
      }

      if (argv.format === "json") {
        logger.always(JSON.stringify({ ...status, stats: liveStats }, null, 2));
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
        logger.always(
          `  ${chalk.bold("Started:")}    ${chalk.cyan(status.startTime)}`,
        );
        logger.always(
          `  ${chalk.bold("Uptime:")}     ${chalk.cyan(formatUptime(status.uptime ?? 0))}`,
        );
        if (status.envFile) {
          logger.always(
            `  ${chalk.bold("Env File:")}   ${chalk.cyan(status.envFile)}`,
          );
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
                totalRequests: number;
                totalSuccess: number;
                totalErrors: number;
                totalRateLimits: number;
                accounts?: {
                  label: string;
                  type: string;
                  attempts?: number;
                  requests?: number;
                  success?: number;
                  errors?: number;
                  rateLimits?: number;
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

    if (!Number.isFinite(parentPid) || parentPid <= 0) {
      return;
    }

    // ---------------------------------------------------------------
    // Auto-update loop (runs concurrently with the health monitor)
    // Always on — no flags needed. Hardcoded sensible defaults.
    // ---------------------------------------------------------------
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
      process.platform === "darwin" && (await isLaunchdManaging());

    let updateInProgress = false;
    let updateRestartInProgress = false;
    const runUpdateCheck = async () => {
      if (updateInProgress) {
        return;
      }
      updateInProgress = true;
      try {
        // Lazy-load update modules so they're only imported at check time
        const { checkForUpdate } =
          await import("../../lib/proxy/updateChecker.js");
        const { checkTrafficQuiet } =
          await import("../../lib/proxy/quietDetector.js");
        const {
          recordCheck,
          isVersionSuppressed,
          suppressVersion,
          recordSuccessfulUpdate,
        } = await import("../../lib/proxy/updateState.js");

        // 1. Check for update
        const result = await checkForUpdate(runningVersion);
        recordCheck(result.latestVersion);

        if (!result.updateAvailable) {
          return;
        }
        if (isVersionSuppressed(result.latestVersion)) {
          logger.debug(
            `[guard] version ${result.latestVersion} is suppressed, skipping`,
          );
          return;
        }

        logger.always(
          `[guard] update available: ${runningVersion} → ${result.latestVersion}`,
        );

        // 2. Wait for quiet traffic
        const maxQuietWaitMs = 60 * 60 * 1000; // 1 hour max wait
        const quietPollMs = 10_000; // check every 10s
        const quietStart = Date.now();

        while (Date.now() - quietStart < maxQuietWaitMs) {
          // Bail out if parent proxy died during the wait
          if (getProcessStatus(parentPid) === "not_running") {
            logger.always(
              `[guard] parent process died during quiet-wait, aborting update`,
            );
            return;
          }
          const quietStatus = checkTrafficQuiet(QUIET_THRESHOLD_MS);
          if (quietStatus.isQuiet) {
            break;
          }
          logger.debug(
            `[guard] traffic active (last activity ${Math.round(quietStatus.silenceDurationMs / 1000)}s ago), waiting...`,
          );
          await new Promise((r) => setTimeout(r, quietPollMs));
        }

        const finalQuiet = checkTrafficQuiet(QUIET_THRESHOLD_MS);
        if (!finalQuiet.isQuiet) {
          logger.always(
            `[guard] traffic didn't quiet down within 1 hour, skipping update cycle`,
          );
          return;
        }

        // 3. Install update (validate version string before passing to shell)
        if (!/^\d+\.\d+\.\d+$/.test(result.latestVersion)) {
          logger.always(
            `[guard] WARNING: invalid version format "${result.latestVersion}", skipping`,
          );
          return;
        }

        // Resolve pnpm to a deterministic path, validating that it actually
        // runs (some environments have broken shims on PATH).
        const pnpmResolution = resolveFullPnpmPath();
        // Log the full candidate list so operators can see why a particular
        // pnpm was chosen (or why none worked).
        logger.always(
          `[guard] pnpm candidates: ${pnpmResolution.tried
            .map((c) => `${c.path}(${c.working ? `v${c.version}` : "BROKEN"})`)
            .join(", ")}`,
        );
        if (!pnpmResolution.resolved) {
          // Environmental problem, not version-specific — skip this cycle
          // without suppressing the version (so we retry on the next tick
          // once the user fixes pnpm).
          logger.always(
            `[guard] WARNING: no working pnpm found; skipping update cycle. Install pnpm or set NEUROLINK_PNPM_PATH.`,
          );
          return;
        }
        logger.always(
          `[guard] traffic quiet, installing @juspay/neurolink@${result.latestVersion} via ${pnpmResolution.bin} (pnpm v${pnpmResolution.version})...`,
        );
        const { execFileSync } = await import("node:child_process");
        try {
          execFileSync(
            pnpmResolution.bin,
            ["add", "-g", `@juspay/neurolink@${result.latestVersion}`],
            {
              timeout: 120_000,
              stdio: "pipe",
            },
          );
        } catch (installErr) {
          // Capture stderr for actionable diagnostics
          const stderr =
            installErr &&
            typeof installErr === "object" &&
            "stderr" in installErr
              ? String((installErr as { stderr: unknown }).stderr).slice(0, 500)
              : "";
          const msg =
            installErr instanceof Error
              ? installErr.message
              : String(installErr);
          logger.always(
            `[guard] WARNING: pnpm install failed: ${msg}${stderr ? `\n  stderr: ${stderr}` : ""}`,
          );
          suppressVersion(
            result.latestVersion,
            `install_failed: ${msg.slice(0, 200)}${stderr ? ` | stderr: ${stderr.slice(0, 200)}` : ""}`,
          );
          return;
        }

        // 4. Rewrite the launchd plist so it picks up the (possibly new)
        //    stable bin path, then restart via launchctl.
        try {
          const {
            writeFileSync,
            existsSync: fsExists,
            mkdirSync: fsMkdir,
          } = await import("fs");
          if (!fsExists(PLIST_DIR)) {
            fsMkdir(PLIST_DIR, { recursive: true });
          }
          // Rewrite the trampoline and plist so the restarted service
          // resolves the newly installed binary via PATH.
          writeTrampoline();

          // Validate the trampoline actually resolves to the NEW version
          // before asking launchd to restart. If the install somehow left
          // PATH still pointing at the old version, don't kickstart.
          const probed = probeBinVersion(TRAMPOLINE_PATH);
          if (!probed) {
            logger.always(
              `[guard] WARNING: trampoline does not resolve to a working neurolink after install; skipping restart.`,
            );
            suppressVersion(
              result.latestVersion,
              `trampoline_broken_after_install: ${TRAMPOLINE_PATH} --version failed`,
            );
            return;
          }
          if (probed !== result.latestVersion) {
            // The trampoline resolves to a DIFFERENT version than what we
            // just installed. This means `pnpm add -g` installed into a
            // store that PATH doesn't reach (store mismatch), or PATH still
            // shadows with an older shim. Restarting would run the wrong
            // version — abort.
            logger.always(
              `[guard] ABORT: trampoline resolves to v${probed} but installed v${result.latestVersion}.`,
            );
            logger.always(
              `[guard]   pnpm used: ${pnpmResolution.bin} (v${pnpmResolution.version})`,
            );
            logger.always(
              `[guard]   This usually means pnpm's global store doesn't match the PATH-visible neurolink.`,
            );
            logger.always(
              `[guard]   Fix: run 'pnpm add -g @juspay/neurolink' with the SAME pnpm whose bin dir is on PATH.`,
            );
            suppressVersion(
              result.latestVersion,
              `version_mismatch: trampoline=${probed} expected=${result.latestVersion} pnpm=${pnpmResolution.bin}(v${pnpmResolution.version})`,
            );
            return;
          }

          const existingArgs = parseExistingPlistArgs();
          const updatedPlist = buildPlist(
            port,
            host,
            existingArgs.envFile,
            existingArgs.configFile,
          );
          writeFileSync(PLIST_PATH, updatedPlist, "utf-8");
          logger.always(
            `[guard] trampoline (resolves to v${probed}) + plist rewritten at ${PLIST_PATH}`,
          );
        } catch (plistErr) {
          logger.always(
            `[guard] WARNING: failed to rewrite plist (restart may use stale path): ${
              plistErr instanceof Error ? plistErr.message : String(plistErr)
            }`,
          );
          // Continue with restart anyway — the stable bin symlink may still be correct
        }

        // Signal the health loop to not exit when it detects
        // the parent PID is gone — we're intentionally restarting.
        updateRestartInProgress = true;
        logger.always(
          `[guard] restarting proxy via launchctl bootout/bootstrap...`,
        );
        const uid = process.getuid?.() ?? 501;
        try {
          // bootout unloads the in-memory job definition. This is required
          // because `kickstart -k` reuses the cached plist and ignores any
          // on-disk changes (like the trampoline rewrite above).
          try {
            execFileSync(
              "launchctl",
              ["bootout", `gui/${uid}/${PLIST_LABEL}`],
              { timeout: 10_000, stdio: "pipe" },
            );
          } catch {
            // Job may not be loaded (first install, or already unloaded)
          }
          // bootstrap loads the plist fresh from disk, picking up the
          // new trampoline-based ProgramArguments.
          execFileSync("launchctl", ["bootstrap", `gui/${uid}`, PLIST_PATH], {
            timeout: 10_000,
            stdio: "pipe",
          });
        } catch (restartErr) {
          updateRestartInProgress = false;
          const msg =
            restartErr instanceof Error
              ? restartErr.message
              : String(restartErr);
          logger.always(`[guard] WARNING: launchctl bootstrap failed: ${msg}`);
          suppressVersion(
            result.latestVersion,
            `restart_failed: ${msg.slice(0, 200)}`,
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
            `[guard] update successful: now running ${result.latestVersion}`,
          );
          recordSuccessfulUpdate(result.latestVersion);
          // The new proxy will spawn its own guard. Exit this one.
          process.exit(0);
        } else {
          logger.always(
            `[guard] WARNING: proxy unhealthy after update to ${result.latestVersion}`,
          );
          suppressVersion(result.latestVersion, "unhealthy_after_restart");
          updateRestartInProgress = false;
        }
      } catch (err) {
        logger.always(
          `[guard] update check error: ${err instanceof Error ? err.message : String(err)}`,
        );
      } finally {
        updateInProgress = false;
      }
    };

    // Run first check after a short delay, then on interval
    if (canAutoUpdate) {
      setTimeout(runUpdateCheck, 30_000);
      setInterval(runUpdateCheck, UPDATE_CHECK_INTERVAL_MS);
    }

    const startedAt = Date.now();
    let parentStatus = getProcessStatus(parentPid);
    let consecutiveUnhealthy = 0;

    // Keep monitoring for as long as the parent can affect Claude settings.
    while (true) {
      const healthy = await isProxyHealthy(host, port, 1_500);

      if (healthy) {
        consecutiveUnhealthy = 0;
      } else {
        consecutiveUnhealthy += 1;
      }

      if (parentStatus === "not_running" && !updateRestartInProgress) {
        // Parent is gone (and we're not mid-update-restart).
        // If endpoint is still healthy, another proxy took over.
        if (healthy) {
          return;
        }
        break;
      }

      if (!healthy && consecutiveUnhealthy >= failureThreshold) {
        // Parent still exists but endpoint is repeatedly unhealthy.
        break;
      }

      if (maxWaitMs > 0 && Date.now() - startedAt >= maxWaitMs) {
        return;
      }

      await sleep(pollIntervalMs);
      parentStatus = getProcessStatus(parentPid);
    }

    const guardHost = host === "0.0.0.0" ? "localhost" : host;
    const expectedBaseUrl = `http://${guardHost}:${port}`;

    // Attempt restart via launchd before falling back to cleanup
    const restarted = await tryLaunchdRestart(guardHost, port);
    if (restarted) {
      if (!argv.quiet) {
        logger.always(`[proxy] fail-open guard restarted proxy via launchd`);
      }
      return;
    }

    // Restart failed or launchd not installed — clean up Claude settings
    const cleared = await clearClaudeProxySettings(expectedBaseUrl);

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
            `  ⚠ Could not auto-configure: ${e instanceof Error ? e.message : String(e)}`,
          ),
        );
        console.info(chalk.yellow(`  Set manually: ANTHROPIC_BASE_URL=${url}`));
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

/**
 * Parse the existing launchd plist to extract --env-file and --config values.
 * Used by the auto-updater to rewrite the plist with the same configuration.
 */
function parseExistingPlistArgs(): {
  envFile?: string;
  configFile?: string;
} {
  try {
    const { readFileSync, existsSync: fsExists } = _require(
      "fs",
    ) as typeof import("fs");
    if (!fsExists(PLIST_PATH)) {
      return {};
    }
    const xml = readFileSync(PLIST_PATH, "utf-8");
    // Extract --env-file value: <string>--env-file</string>\n    <string>VALUE</string>
    const envMatch = xml.match(
      /<string>--env-file<\/string>\s*<string>([^<]+)<\/string>/,
    );
    const configMatch = xml.match(
      /<string>--config<\/string>\s*<string>([^<]+)<\/string>/,
    );
    // Unescape XML entities so buildPlist() doesn't double-escape them.
    const unescapeXml = (value?: string) =>
      value
        ?.replace(/&apos;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&gt;/g, ">")
        .replace(/&lt;/g, "<")
        .replace(/&amp;/g, "&");
    return {
      envFile: unescapeXml(envMatch?.[1]),
      configFile: unescapeXml(configMatch?.[1]),
    };
  } catch {
    return {};
  }
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
