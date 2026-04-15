import type {
  ProxyHealthResponse,
  ProxyReadinessState,
} from "../types/index.js";

export function createProxyReadinessState(
  startTimeMs: number = Date.now(),
): ProxyReadinessState {
  return {
    startTimeMs,
    acceptingConnections: false,
    ready: false,
  };
}

export function markProxyReady(
  state: ProxyReadinessState,
  readyAtMs: number = Date.now(),
): void {
  state.acceptingConnections = true;
  state.ready = true;
  state.readyAtMs = readyAtMs;
}

export function buildProxyHealthResponse(
  state: ProxyReadinessState,
  options: {
    strategy: string;
    passthrough: boolean;
    version: string;
    now?: number;
  },
): ProxyHealthResponse {
  const now = options.now ?? Date.now();
  return {
    status: state.ready ? "ok" : "starting",
    ready: state.ready,
    acceptingConnections: state.acceptingConnections,
    strategy: options.strategy,
    passthrough: options.passthrough,
    version: options.version,
    startedAt: new Date(state.startTimeMs).toISOString(),
    readyAt: state.readyAtMs ? new Date(state.readyAtMs).toISOString() : null,
    uptime: Math.max(0, (now - state.startTimeMs) / 1000),
    healthPath: "/health",
    statusPath: "/status",
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForProxyReadiness(args: {
  host: string;
  port: number;
  timeoutMs?: number;
  intervalMs?: number;
  fetchImpl?: typeof fetch;
}): Promise<void> {
  const timeoutMs = args.timeoutMs ?? 5_000;
  const intervalMs = args.intervalMs ?? 100;
  const fetchImpl = args.fetchImpl ?? fetch;
  const deadline = Date.now() + timeoutMs;
  let lastError: string | undefined;

  while (Date.now() < deadline) {
    try {
      const response = await fetchImpl(
        `http://${args.host}:${args.port}/health`,
        {
          signal: AbortSignal.timeout(Math.min(intervalMs * 4, 1_000)),
        },
      );
      if (response.ok) {
        return;
      }
      lastError = `health endpoint returned ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    await sleep(intervalMs);
  }

  throw new Error(
    `Proxy failed readiness check on http://${args.host}:${args.port}/health within ${timeoutMs}ms${lastError ? ` (${lastError})` : ""}`,
  );
}
