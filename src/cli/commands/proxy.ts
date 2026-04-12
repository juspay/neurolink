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
  ProxyStartArgs,
  ProxyStatusArgs,
  ProxyGuardArgs,
  ProxyTelemetryArgs,
  FallbackInfo,
  ProxyState,
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

// --- Linux systemd ---
const SYSTEMD_SERVICE_NAME = "neurolink-proxy";
const SYSTEMD_UNIT_FILE = `${SYSTEMD_SERVICE_NAME}.service`;
const SYSTEMD_UNIT_DIR = join(
  process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config"),
  "systemd",
  "user",
);
const SYSTEMD_UNIT_PATH = join(SYSTEMD_UNIT_DIR, SYSTEMD_UNIT_FILE);

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
 * Check if the systemd user service is loaded and actively managing the proxy.
 * Returns true if systemctl reports the service as "active (running)".
 */
async function isSystemdManaging(): Promise<boolean> {
  if (process.platform !== "linux") {
    return false;
  }
  try {
    const { execFileSync } = await import("node:child_process");
    const output = execFileSync(
      "systemctl",
      ["--user", "is-active", SYSTEMD_SERVICE_NAME],
      { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
    );
    return output.trim() === "active";
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

/**
 * Attempt to restart the proxy via systemd --user restart.
 * Returns true if the proxy comes back healthy within timeoutMs.
 */
async function trySystemdRestart(
  host: string,
  port: number,
  timeoutMs: number = 15_000,
): Promise<boolean> {
  if (process.platform !== "linux") {
    return false;
  }

  try {
    const { existsSync } = await import("fs");
    if (!existsSync(SYSTEMD_UNIT_PATH)) {
      return false;
    }
  } catch {
    return false;
  }

  try {
    const { execFileSync } = await import("node:child_process");
    execFileSync(
      "systemctl",
      ["--user", "restart", SYSTEMD_SERVICE_NAME],
      { stdio: "ignore", timeout: 8_000 },
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

function spawnFailOpenGuard(
  host: string,
  port: number,
  parentPid: number,
): number | undefined {
  const entryScript = process.argv[1];
  if (!entryScript) {
    return undefined;
  }

  try {
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

    const child = spawn(process.execPath, args, {
      detached: true,
      stdio: "ignore",
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

type ProxySpinner = ReturnType<typeof ora> | null;
type ProxyStartStrategy = "round-robin" | "fill-first";
type ProxyModelRouterConfig = ConstructorParameters<typeof ModelRouter>[0];
type LoadedProxyConfig = {
  routing?: Partial<ProxyModelRouterConfig> & {
    strategy?: ProxyStartStrategy;
  };
};
type ProxyNeurolinkRuntime = Awaited<
  ReturnType<typeof createProxyNeurolinkRuntime>
>;
type ProxyStartApp = Awaited<ReturnType<typeof createProxyStartApp>>;

/**
 * Detect what init system (if any) is managing this proxy process.
 * - macOS: launchd has PID 1 and is the parent of user agents
 * - Linux: systemd user manager is the parent of user services
 *   (its PID is NOT 1 — it's a per-user process)
 */
function detectManagedBy(): "launchd" | "systemd" | "manual" {
  if (process.platform === "darwin" && process.ppid === 1) {
    return "launchd";
  }
  if (process.platform === "linux") {
    try {
      const { readFileSync } = _require("fs");
      const comm = readFileSync(`/proc/${process.ppid}/comm`, "utf-8").trim();
      if (comm === "systemd") {
        return "systemd";
      }
    } catch {
      // /proc not available or ppid read failed
    }
  }
  return "manual";
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

  if (process.ppid === 1) {
    return; // launched by init system itself
  }

  const launchdActive =
    process.platform === "darwin" && (await isLaunchdManaging());
  const systemdActive =
    process.platform === "linux" && (await isSystemdManaging());

  if (!launchdActive && !systemdActive) {
    return; // not managed by any init system, allow manual start
  }

  if (launchdActive) {
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
  }

  if (systemdActive) {
    if (spinner) {
      spinner.fail(
        chalk.red(
          "Proxy is managed by systemd. Manual start would cause port conflicts.",
        ),
      );
    }
    logger.always(
      chalk.yellow(
        "Use 'neurolink proxy uninstall' to remove the service first, " +
          "or 'systemctl --user restart neurolink-proxy' to restart.",
      ),
    );
  }

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
          backoffLevel: account.currentBackoffLevel,
          cooling: account.coolingUntil
            ? account.coolingUntil > Date.now()
            : false,
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
    initializeOpenTelemetry({
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
    managedBy: detectManagedBy(),
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
    let devPaths:
      | import("../../lib/proxy/proxyPaths.js").ProxyPaths
      | undefined;
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

type StatusStats = {
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

type ProxyTelemetryAction = (typeof PROXY_TELEMETRY_ACTIONS)[number];

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
      (process.platform === "darwin" && (await isLaunchdManaging())) ||
      (process.platform === "linux" && (await isSystemdManaging()));

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
        logger.always(
          `[guard] traffic quiet, installing @juspay/neurolink@${result.latestVersion}...`,
        );
        const { execFileSync } = await import("node:child_process");
        try {
          execFileSync(
            "pnpm",
            ["add", "-g", `@juspay/neurolink@${result.latestVersion}`],
            {
              timeout: 120_000,
              stdio: "pipe",
            },
          );
        } catch (installErr) {
          logger.always(
            `[guard] WARNING: pnpm install failed: ${installErr instanceof Error ? installErr.message : String(installErr)}`,
          );
          suppressVersion(result.latestVersion, "install_failed");
          return;
        }

        // 4. Restart via init system
        // Signal the health loop to not exit when it detects
        // the parent PID is gone — we're intentionally restarting.
        updateRestartInProgress = true;
        if (process.platform === "darwin") {
          logger.always(`[guard] restarting proxy via launchctl...`);
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
          } catch {
            logger.always(`[guard] WARNING: launchctl kickstart failed`);
            suppressVersion(result.latestVersion, "restart_failed");
            updateRestartInProgress = false;
            return;
          }
        } else if (process.platform === "linux") {
          logger.always(`[guard] restarting proxy via systemctl...`);
          try {
            execFileSync(
              "systemctl",
              ["--user", "restart", SYSTEMD_SERVICE_NAME],
              {
                timeout: 10_000,
                stdio: "pipe",
              },
            );
          } catch {
            logger.always(`[guard] WARNING: systemctl restart failed`);
            suppressVersion(result.latestVersion, "restart_failed");
            updateRestartInProgress = false;
            return;
          }
        } else {
          logger.always(
            `[guard] WARNING: no restart mechanism for platform ${process.platform}`,
          );
          suppressVersion(result.latestVersion, "restart_failed");
          updateRestartInProgress = false;
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

    // Attempt restart via init system before falling back to cleanup
    const restarted =
      process.platform === "darwin"
        ? await tryLaunchdRestart(guardHost, port)
        : process.platform === "linux"
          ? await trySystemdRestart(guardHost, port)
          : false;
    if (restarted) {
      if (!argv.quiet) {
        const initSystem = process.platform === "linux" ? "systemd" : "launchd";
        logger.always(`[proxy] fail-open guard restarted proxy via ${initSystem}`);
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

    // Step 3: Install as persistent service (macOS/Linux) or start foreground
    const stepNum = validKeys.length > 0 ? 2 : 3;

    const hasDaemonSupport =
      process.platform === "darwin" || process.platform === "linux";

    if (!noService && hasDaemonSupport) {
      const platformLabel =
        process.platform === "darwin" ? "launchd" : "systemd";
      console.info(
        chalk.blue(`\nStep ${stepNum}:`) +
          ` Installing proxy as persistent ${platformLabel} service...`,
      );
      await (proxyInstallCommand.handler as Function)({
        ...argv,
        port,
        host: "127.0.0.1",
      });

      // Step N: Configure Claude Code settings
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

      // Linux-specific linger hint
      if (process.platform === "linux") {
        console.info("");
        console.info(
          chalk.dim("  ℹ To auto-start on boot (without login), run:"),
        );
        console.info(chalk.dim(`    loginctl enable-linger $USER`));
      }

      // Done!
      console.info("");
      console.info(chalk.bold.green("Setup complete!"));
      console.info(`  Proxy running as daemon on ${chalk.cyan(url)}`);
      if (process.platform === "darwin") {
        console.info(`  Auto-restarts on crash (5s throttle) and on login`);
        console.info("");
        console.info(chalk.gray("  Status:    neurolink proxy status"));
        console.info(
          chalk.gray("  Logs:      ~/.neurolink/logs/proxy-launchd-*.log"),
        );
        console.info(chalk.gray("  Uninstall: neurolink proxy uninstall"));
      } else {
        console.info(`  Auto-restarts on crash (5s throttle)`);
        console.info("");
        console.info(chalk.gray("  Status:    neurolink proxy status"));
        console.info(
          chalk.gray("  Logs:      ~/.neurolink/logs/proxy-systemd-*.log"),
        );
        console.info(chalk.gray("  Uninstall: neurolink proxy uninstall"));
      }
      console.info("");
    } else {
      // Foreground mode (--no-service or unsupported platform)
      if (noService) {
        console.info(
          chalk.blue(`\nStep ${stepNum}:`) + " Starting proxy in foreground...",
        );
      } else {
        console.info(chalk.blue(`\nStep ${stepNum}:`) + " Starting proxy...");
        console.info(
          chalk.yellow(
            `  Note: No daemon support on ${process.platform}. Proxy runs in foreground.`,
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
  const nodeExec = escapeXml(process.execPath);
  const entryScript = escapeXml(
    process.argv[1] ?? join(__dirname, "..", "index.js"),
  );
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
    <string>${nodeExec}</string>
    <string>${entryScript}</string>
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

/**
 * Generate a systemd user unit file for the proxy service.
 * Equivalent of buildPlist() for macOS.
 */
function buildSystemdUnit(
  port: number,
  host: string,
  envFile?: string,
  configFile?: string,
): string {
  const nodeExec = process.execPath;
  const entryScript = process.argv[1] ?? join(__dirname, "..", "index.js");

  const args = [
    entryScript,
    "proxy",
    "start",
    "--port",
    String(port),
    "--host",
    host,
    ...(envFile ? ["--env-file", envFile] : []),
    ...(configFile ? ["--config", configFile] : []),
    "--quiet",
  ];

  const execStart = [nodeExec, ...args].join(" ");

  const path =
    process.env.PATH ??
    "/usr/local/bin:/usr/bin:/bin:" + join(homedir(), ".local", "bin");

  const logsDir = join(homedir(), ".neurolink", "logs");

  return `[Unit]
Description=NeuroLink Claude Proxy
After=network.target

[Service]
Type=simple
ExecStart=${execStart}
Restart=on-failure
RestartSec=5
Environment=HOME=${homedir()}
Environment=PATH=${path}
${envFile ? `EnvironmentFile=${envFile}` : ""}
StandardOutput=append:${join(logsDir, "proxy-systemd-stdout.log")}
StandardError=append:${join(logsDir, "proxy-systemd-stderr.log")}

[Install]
WantedBy=default.target
`;
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

    // ---- Linux: systemd user unit ----
    if (process.platform === "linux") {
      const { writeFileSync, mkdirSync, existsSync } = await import("fs");
      const { execFileSync } = await import("node:child_process");

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
      if (!existsSync(SYSTEMD_UNIT_DIR)) {
        mkdirSync(SYSTEMD_UNIT_DIR, { recursive: true });
      }

      const unitContent = buildSystemdUnit(port, host, envFile, configFile);
      writeFileSync(SYSTEMD_UNIT_PATH, unitContent, "utf-8");
      console.info(chalk.green(`✓ Unit file written to ${SYSTEMD_UNIT_PATH}`));
      if (envFile) {
        console.info(chalk.green(`✓ Proxy env file: ${envFile}`));
      }

      execFileSync("systemctl", ["--user", "daemon-reload"], { stdio: "inherit" });
      execFileSync("systemctl", ["--user", "enable", SYSTEMD_SERVICE_NAME], {
        stdio: "inherit",
      });
      execFileSync("systemctl", ["--user", "start", SYSTEMD_SERVICE_NAME], {
        stdio: "inherit",
      });
      console.info(chalk.green(`✓ Service enabled and started`));

      // Wait briefly for systemd to start the process, then persist state
      await new Promise((r) => setTimeout(r, 2_000));
      try {
        const pidOutput = execFileSync(
          "systemctl",
          [
            "--user",
            "show",
            SYSTEMD_SERVICE_NAME,
            "--property=MainPID",
            "--value",
          ],
          { encoding: "utf-8" },
        ).trim();
        const pid = Number(pidOutput);
        if (pid > 0) {
          saveProxyState({
            pid,
            port,
            host,
            strategy: "fill-first",
            startTime: new Date().toISOString(),
            envFile,
            managedBy: "systemd",
          });
        }
      } catch {
        /* non-fatal — state will be written by the proxy process itself */
      }

      console.info("");
      console.info(chalk.bold("Proxy is now a persistent systemd user service:"));
      console.info(`  • Auto-starts on login`);
      console.info(`  • Auto-restarts on crash (5s throttle)`);
      console.info(`  • Listening on http://${host}:${port}`);
      console.info(`  • Logs: ~/.neurolink/logs/proxy-systemd-*.log`);
      console.info("");
      console.info(
        chalk.dim(
          "  ℹ To auto-start on boot (without login), run: loginctl enable-linger $USER",
        ),
      );
      console.info("");
      console.info(
        chalk.gray(
          `  Manage: systemctl --user start/stop/restart ${SYSTEMD_SERVICE_NAME}`,
        ),
      );
      console.info(chalk.gray(`  Remove: neurolink proxy uninstall`));
      return; // skip macOS block below
    }
    // ---- end Linux block ----

    if (process.platform !== "darwin") {
      console.info(
        chalk.red(`proxy install is not supported on ${process.platform}.`),
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
    if (process.platform === "linux") {
      const { existsSync, unlinkSync } = await import("fs");
      const { execFileSync } = await import("node:child_process");

      if (!existsSync(SYSTEMD_UNIT_PATH)) {
        console.info(chalk.yellow("No proxy service installed."));
        return;
      }

      try {
        execFileSync("systemctl", ["--user", "stop", SYSTEMD_SERVICE_NAME], {
          stdio: "ignore",
        });
        execFileSync("systemctl", ["--user", "disable", SYSTEMD_SERVICE_NAME], {
          stdio: "ignore",
        });
        console.info(chalk.green(`✓ Service stopped and disabled`));
      } catch {
        /* may not be loaded */
      }

      unlinkSync(SYSTEMD_UNIT_PATH);
      try {
        execFileSync("systemctl", ["--user", "daemon-reload"], { stdio: "ignore" });
      } catch {
        /* non-fatal */
      }
      console.info(chalk.green(`✓ Unit file removed from ${SYSTEMD_UNIT_PATH}`));
      console.info(chalk.green(`✓ Proxy service uninstalled`));
      return;
    }

    if (process.platform !== "darwin") {
      console.info(
        chalk.red(`proxy uninstall is not supported on ${process.platform}.`),
      );
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
