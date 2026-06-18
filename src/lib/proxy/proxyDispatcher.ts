/**
 * Tuned global undici dispatcher for the proxy's upstream forwards.
 *
 * The Claude passthrough (`claudeProxyRoutes.ts`) forwards every request to
 * Anthropic via the global `fetch` → undici global dispatcher. undici keep-alives
 * by default, but with a ~4s idle timeout: between Claude Code turns (the user
 * reads output, a tool runs, the model thinks) the idle socket closes, so the
 * next request opens a brand-new TCP connection. Under sustained use that is a
 * high rate of short-lived outbound flows.
 *
 * On hosts running a socket content-filter (CFIL) — e.g. SentinelOne or
 * GlobalProtect network extensions — every new flow allocates per-flow kernel
 * state, so a high flow rate amplifies any leak in that path. Reusing connections
 * cuts the flow rate sharply, so we install a dispatcher with a longer keep-alive
 * and a bounded, reused connection pool.
 *
 * Everything is overridable via env so it can be tuned (or disabled) per host:
 *   NEUROLINK_PROXY_KEEPALIVE=off       disable; keep undici defaults
 *   NEUROLINK_PROXY_KEEPALIVE_MS        idle keep-alive timeout (default 30000)
 *   NEUROLINK_PROXY_KEEPALIVE_MAX_MS    keep-alive upper bound  (default 600000)
 *   NEUROLINK_PROXY_MAX_CONNECTIONS     max pooled connections per origin (default 64)
 */
import { Agent, setGlobalDispatcher } from "undici";
import { logger } from "../utils/logger.js";

function readPositiveInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

let configured = false;

/**
 * Install the tuned global undici dispatcher. Idempotent — safe to call once at
 * proxy startup. No-op when `NEUROLINK_PROXY_KEEPALIVE` is off/false/0.
 */
export function configureProxyKeepAliveDispatcher(): void {
  if (configured) {
    return;
  }
  configured = true;

  const toggle = (process.env.NEUROLINK_PROXY_KEEPALIVE ?? "").toLowerCase();
  if (toggle === "off" || toggle === "false" || toggle === "0") {
    logger.debug("[proxy] keep-alive dispatcher disabled via env");
    return;
  }

  const keepAliveTimeout = readPositiveInt(
    "NEUROLINK_PROXY_KEEPALIVE_MS",
    30_000,
  );
  const keepAliveMaxTimeout = readPositiveInt(
    "NEUROLINK_PROXY_KEEPALIVE_MAX_MS",
    600_000,
  );
  const connections = readPositiveInt("NEUROLINK_PROXY_MAX_CONNECTIONS", 64);

  setGlobalDispatcher(
    new Agent({
      keepAliveTimeout,
      keepAliveMaxTimeout,
      connections,
      pipelining: 1,
    }),
  );

  logger.debug(
    `[proxy] tuned undici dispatcher installed ` +
      `(keepAliveTimeout=${keepAliveTimeout}ms, ` +
      `keepAliveMaxTimeout=${keepAliveMaxTimeout}ms, connections=${connections})`,
  );
}
