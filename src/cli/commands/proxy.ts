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
import { join } from "node:path";
import chalk from "chalk";
import ora from "ora";
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
  FallbackInfo,
  ProxyState,
} from "../../lib/types/index.js";
import type { ModelRouter } from "../../lib/proxy/modelRouter.js";

// =============================================================================
// STATE MANAGEMENT
// =============================================================================

const proxyStateManager = new StateFileManager<ProxyState>("proxy-state.json");

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
    const child = spawn(
      process.execPath,
      [
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
      ],
      {
        detached: true,
        stdio: "ignore",
      },
    );
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
        choices: ["round-robin", "fill-first"],
        description:
          "Account selection strategy for routing requests (default: round-robin)",
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
      .example(
        "neurolink proxy start",
        "Start proxy on default port 55669 with round-robin strategy",
      )
      .example(
        "neurolink proxy start -p 8080 -s round-robin",
        "Start proxy on port 8080 with round-robin",
      )
      .example(
        "neurolink proxy start --health-interval 60",
        "Start proxy with 60-second health checks",
      ) as Argv<ProxyStartArgs>;
  },
  handler: async (argv) => {
    const spinner = argv.quiet ? null : ora("Starting Claude proxy...").start();

    try {
      // Guard: proxy already running
      const existingState = loadProxyState();
      if (existingState && isProcessRunning(existingState.pid)) {
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
        process.exit(1);
      }

      // Guard: launchd is managing the service — don't start manually
      if (await isLaunchdManaging()) {
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

      // -----------------------------------------------------------------
      // 1. Create NeuroLink instance — reads all env vars automatically
      // -----------------------------------------------------------------

      // Skip MCP initialization for proxy — tools come from Claude Code, not MCP servers
      process.env.NEUROLINK_SKIP_MCP = "true";

      const { NeuroLink } = await import("../../lib/neurolink.js");
      const neurolink = new NeuroLink();

      // Initialize request logger and usage stats
      const { initRequestLogger, cleanupLogs } =
        await import("../../lib/proxy/requestLogger.js");
      const { getStats: _getStats, resetStats: _resetStats } =
        await import("../../lib/proxy/usageStats.js");
      initRequestLogger(true);
      cleanupLogs(7, 500); // Delete logs older than 7 days or if total exceeds 500 MB

      // -----------------------------------------------------------------
      // 2. Load proxy config file (if --config or default exists)
      // -----------------------------------------------------------------

      const configPath =
        argv.config ?? join(homedir(), ".neurolink", "proxy-config.yaml");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let proxyConfig: any = null;
      try {
        const { loadProxyConfig } =
          await import("../../lib/proxy/proxyConfig.js");
        proxyConfig = await loadProxyConfig(configPath);
        if (spinner) {
          spinner.text = `Loaded proxy config from ${configPath}`;
        }
      } catch (configError) {
        if (argv.config) {
          if (spinner) {
            spinner.fail(
              chalk.red(`Failed to load proxy config: ${configPath}`),
            );
          }
          process.exit(1);
        }
        // Only silently ignore file-not-found for the default config path.
        // Log a warning for other errors (parse failures, permission issues, etc.)
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

      // -----------------------------------------------------------------
      // 3. Create ModelRouter from config (if routing configured)
      // -----------------------------------------------------------------

      const strategy =
        argv.strategy ?? proxyConfig?.routing?.strategy ?? "round-robin";
      let modelRouter: ModelRouter | undefined;

      if (proxyConfig?.routing) {
        const { ModelRouter } = await import("../../lib/proxy/modelRouter.js");
        modelRouter = new ModelRouter({
          strategy: strategy as "round-robin" | "fill-first",
          modelMappings: proxyConfig.routing.modelMappings ?? [],
          fallbackChain: proxyConfig.routing.fallbackChain ?? [],
          passthroughModels: proxyConfig.routing.passthroughModels,
        });
      }

      if (spinner) {
        spinner.text = "Configuring server...";
      }

      // -----------------------------------------------------------------
      // 4. Build Hono app with Claude proxy routes and NeuroLink context
      // -----------------------------------------------------------------

      const { createClaudeProxyRoutes } =
        await import("../../lib/server/routes/claudeProxyRoutes.js");
      const { Hono } = await import("hono");
      const { serve } = await import("@hono/node-server");

      const app = new Hono();

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
        modelRouter,
        "",
        strategy as "round-robin" | "fill-first",
      );

      // Register proxy routes — inject NeuroLink into ServerContext
      for (const route of routeGroup.routes) {
        const method = route.method.toLowerCase() as "get" | "post";
        app[method](route.path, async (c) => {
          const emptyBody = {};
          const body =
            method === "post"
              ? await c.req.json().catch(() => emptyBody)
              : undefined;

          // Log incoming request
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

          // Build ServerContext with the real NeuroLink instance
          const ctx = {
            requestId: crypto.randomUUID(),
            method: c.req.method,
            path: c.req.path,
            headers: Object.fromEntries(c.req.raw.headers.entries()),
            query: Object.fromEntries(
              new URL(c.req.url).searchParams.entries(),
            ),
            params: c.req.param() as Record<string, string>,
            body,
            neurolink, // NeuroLink instance for generate/stream
            toolRegistry: neurolink.getToolRegistry(),
            timestamp: Date.now(),
            metadata: {},
          } as unknown as Parameters<typeof route.handler>[0];

          const result = await route.handler(ctx);

          // Handle raw Response objects (passthrough streaming from upstream)
          if (result instanceof Response) {
            return result;
          }

          // Handle streaming response (async iterable)
          if (
            result &&
            typeof result === "object" &&
            Symbol.asyncIterator in Object(result)
          ) {
            const iterator = (result as AsyncIterable<string>)[
              Symbol.asyncIterator
            ]();
            let cancelled = false;
            const stream = new ReadableStream({
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
                    // Client disconnected — just close
                    controller.close();
                    return;
                  }
                  // Emit an SSE error frame so the client gets a meaningful
                  // error instead of a silent EOF / connection drop.
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
            return new Response(stream, {
              headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
              },
            });
          }

          // Handle error responses with httpStatus field
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

          // Handle Anthropic-style error responses
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

      // Health endpoint
      app.get("/health", (c) =>
        c.json({
          status: "ok",
          strategy,
          uptime: process.uptime(),
        }),
      );

      // Status endpoint (detailed)
      app.get("/status", async (c) => {
        const { getStats } = await import("../../lib/proxy/usageStats.js");
        const stats = getStats();
        return c.json({
          status: "running",
          pid: process.pid,
          port,
          host,
          strategy,
          uptime: process.uptime(),
          stats: {
            totalRequests: stats.totalRequests,
            totalSuccess: stats.totalSuccess,
            totalErrors: stats.totalErrors,
            totalRateLimits: stats.totalRateLimits,
            accounts: Object.values(stats.accounts).map((a) => ({
              label: a.label,
              type: a.type,
              requests: a.requestCount,
              success: a.successCount,
              errors: a.errorCount,
              rateLimits: a.rateLimitCount,
              backoffLevel: a.currentBackoffLevel,
              cooling: a.coolingUntil ? a.coolingUntil > Date.now() : false,
            })),
          },
          config: proxyConfig ? { hasRouting: !!proxyConfig.routing } : null,
        });
      });

      // -----------------------------------------------------------------
      // 5. Start listening
      // -----------------------------------------------------------------

      const port = argv.port ?? 55669;
      const host = argv.host ?? "127.0.0.1";

      if (spinner) {
        spinner.text = `Starting proxy on ${host}:${port}...`;
      }

      const server = serve({
        fetch: app.fetch,
        port,
        hostname: host,
      });

      const guardPid = spawnFailOpenGuard(host, port, process.pid);

      // Extract fallback chain from proxy config (if available)
      const fallbackChain: FallbackInfo[] | undefined =
        proxyConfig?.routing?.fallbackChain?.map(
          (e: { provider: string; model: string }) => ({
            provider: e.provider,
            model: e.model,
          }),
        );

      // Persist state (including fallback chain for `proxy status`)
      const state: ProxyState = {
        pid: process.pid,
        port,
        host,
        strategy,
        startTime: new Date().toISOString(),
        fallbackChain,
        guardPid,
        managedBy: "manual",
      };
      saveProxyState(state);

      if (spinner) {
        spinner.succeed(chalk.green("Claude proxy started successfully"));
      }

      const normalizedHost = host === "0.0.0.0" ? "localhost" : host;
      const url = `http://${normalizedHost}:${port}`;
      printProxyBanner(url, strategy);

      // Auto-configure Claude Code — use the normalized URL (localhost, not 0.0.0.0)
      try {
        await setClaudeProxySettings(url);
        logger.always(chalk.green("  ✓ Auto-configured Claude Code settings"));
        logger.always(
          chalk.dim("    Restart Claude Code to connect through proxy"),
        );
      } catch (e) {
        logger.debug(
          "[proxy] Failed to auto-configure Claude Code: " +
            (e instanceof Error ? e.message : String(e)),
        );
      }

      // -----------------------------------------------------------------
      // 6. Background token refresh (every 30 seconds)
      // -----------------------------------------------------------------
      const { needsRefresh, refreshToken, persistTokens } =
        await import("../../lib/proxy/tokenRefresh.js");
      const { tokenStore } = await import("../../lib/auth/tokenStore.js");
      const refreshInterval = setInterval(async () => {
        // Refresh token-pool accounts
        try {
          const allKeys = await tokenStore.listProviders();
          const anthropicKeys = allKeys.filter((k) =>
            k.startsWith("anthropic:"),
          );
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
              /* non-fatal per-account */
            }
          }
        } catch {
          /* non-fatal */
        }

        // Refresh legacy credentials file
        try {
          const credPath = join(
            homedir(),
            ".neurolink",
            "anthropic-credentials.json",
          );
          const { readFileSync } = await import("fs");
          const creds = JSON.parse(readFileSync(credPath, "utf8"));
          if (creds.oauth) {
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
          }
        } catch {
          /* non-fatal */
        }
      }, 30_000);

      // Hourly log cleanup
      const logCleanupInterval = setInterval(
        () => {
          cleanupLogs(7, 500);
        },
        60 * 60 * 1000,
      );

      // -----------------------------------------------------------------
      // 7. Graceful shutdown
      // -----------------------------------------------------------------

      const shutdown = async (signal: string) => {
        clearInterval(refreshInterval);
        clearInterval(logCleanupInterval);
        logger.always(`\nShutting down proxy (${signal})...`);

        // Only clear Claude settings on user-initiated stop (SIGINT).
        // On SIGTERM (launchd restart cycle), leave settings intact so
        // the restarted proxy picks up seamlessly.
        if (signal === "SIGINT") {
          try {
            const shutdownHost = host === "0.0.0.0" ? "localhost" : host;
            await clearClaudeProxySettings(`http://${shutdownHost}:${port}`);
          } catch {
            /* non-fatal */
          }
        }

        try {
          if (
            server &&
            typeof (server as { close?: () => void }).close === "function"
          ) {
            (server as { close: () => void }).close();
          }
        } catch {
          // Best-effort close
        }
        clearProxyState();

        // SIGINT = user pressed Ctrl+C → exit 0 (launchd won't restart)
        // SIGTERM = launchd/system stop → exit 1 (launchd WILL restart)
        process.exit(signal === "SIGINT" ? 0 : 1);
      };

      process.on("SIGTERM", () => shutdown("SIGTERM"));
      process.on("SIGINT", () => shutdown("SIGINT"));
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
  },
};

// =============================================================================
// STATUS DISPLAY HELPERS
// =============================================================================

type StatusStats = {
  totalRequests: number;
  totalSuccess: number;
  totalErrors: number;
  totalRateLimits: number;
  accounts?: {
    label: string;
    type: string;
    requests: number;
    cooling: boolean;
  }[];
};

function printStatusStats(stats: StatusStats): void {
  console.info(`\n  Stats:`);
  console.info(
    `    Requests:    ${stats.totalRequests} total, ${stats.totalSuccess} success, ${stats.totalErrors} errors`,
  );
  console.info(`    Rate limits: ${stats.totalRateLimits}`);
  if (stats.accounts?.length) {
    console.info(`\n  Accounts:`);
    for (const a of stats.accounts) {
      const acctStatus = a.cooling
        ? chalk.red("cooling")
        : chalk.green("active");
      console.info(
        `    ${a.label.padEnd(20)} ${a.type.padEnd(8)} ${String(a.requests).padEnd(6)} reqs  ${acctStatus}`,
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
        strategy: null as string | null,
        uptime: null as number | null,
        startTime: null as string | null,
        url: null as string | null,
        fallbackChain: null as FallbackInfo[] | null,
      };

      if (state && isProcessRunning(state.pid)) {
        status.running = true;
        status.pid = state.pid;
        status.port = state.port;
        status.host = state.host;
        status.strategy = state.strategy;
        status.startTime = state.startTime;
        status.uptime = Date.now() - new Date(state.startTime).getTime();
        status.url = `http://${state.host === "0.0.0.0" ? "localhost" : state.host}:${state.port}`;
        status.fallbackChain = state.fallbackChain ?? null;
      }

      if (argv.format === "json") {
        logger.always(JSON.stringify(status, null, 2));
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
          `  ${chalk.bold("Started:")}    ${chalk.cyan(status.startTime)}`,
        );
        logger.always(
          `  ${chalk.bold("Uptime:")}     ${chalk.cyan(formatUptime(status.uptime ?? 0))}`,
        );

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
                totalRequests: number;
                totalSuccess: number;
                totalErrors: number;
                totalRateLimits: number;
                accounts?: {
                  label: string;
                  type: string;
                  requests: number;
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

      if (parentStatus === "not_running") {
        // Parent is gone. If endpoint is still healthy, another proxy took over.
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

function buildPlist(port: number, host: string): string {
  const nodeExec = process.execPath;
  const entryScript = process.argv[1] ?? join(__dirname, "..", "index.js");

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
    <string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin</string>
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

    const logsDir = join(homedir(), ".neurolink", "logs");
    if (!existsSync(logsDir)) {
      mkdirSync(logsDir, { recursive: true });
    }

    if (!existsSync(PLIST_DIR)) {
      mkdirSync(PLIST_DIR, { recursive: true });
    }

    const plist = buildPlist(port, host);
    writeFileSync(PLIST_PATH, plist, "utf-8");
    console.info(chalk.green(`✓ Plist written to ${PLIST_PATH}`));

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
          strategy: "round-robin",
          startTime: new Date().toISOString(),
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
