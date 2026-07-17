/**
 * Status checker for the NeuroLink Claude proxy.
 *
 * The proxy (started with `neurolink proxy start` / `neurolink proxy setup`) exposes
 * a `/status` endpoint on http://127.0.0.1:55669 by default. This script queries it
 * and prints a human-readable summary: whether the proxy is up, which accounts are
 * pooled, and basic request/error counters. It makes no calls to Anthropic itself.
 *
 * Endpoint, default port, and response shape verified against:
 *   src/cli/commands/proxy.ts:1410 (app.get("/status", ...))
 *   src/cli/commands/proxy.ts:2135 (const port = argv.port ?? 55669)
 */

interface AccountStat {
  readonly label: string;
  readonly type: string;
  readonly requests?: number;
  readonly errors?: number;
  readonly rateLimits?: number;
}

interface ProxyStatusResponse {
  readonly status: string;
  readonly ready: boolean;
  readonly pid: number;
  readonly port: number;
  readonly host: string;
  readonly strategy: string;
  readonly uptime: number;
  readonly version: string;
  readonly stats: {
    readonly totalRequests: number;
    readonly totalSuccess: number;
    readonly totalErrors: number;
    readonly totalRateLimits: number;
    readonly accounts: readonly AccountStat[];
  };
}

function isProxyStatusResponse(value: unknown): value is ProxyStatusResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.status === "string" &&
    typeof candidate.pid === "number" &&
    typeof candidate.stats === "object" &&
    candidate.stats !== null
  );
}

function formatUptime(seconds: number): string {
  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return `${hours}h ${minutes}m ${secs}s`;
}

function printStatus(status: ProxyStatusResponse): void {
  console.log("NeuroLink Claude proxy: running");
  console.log(`  pid:       ${status.pid}`);
  console.log(`  address:   http://${status.host}:${status.port}`);
  console.log(`  strategy:  ${status.strategy}`);
  console.log(`  version:   ${status.version}`);
  console.log(`  uptime:    ${formatUptime(status.uptime)}`);
  console.log(
    `  requests:  ${status.stats.totalRequests} total, ${status.stats.totalSuccess} ok, ` +
      `${status.stats.totalErrors} errors, ${status.stats.totalRateLimits} rate-limited`,
  );

  if (status.stats.accounts.length === 0) {
    console.log(
      "  accounts:  (none pooled yet — run `neurolink auth login anthropic --method oauth`)",
    );
    return;
  }

  console.log("  accounts:");
  for (const account of status.stats.accounts) {
    const requests = account.requests ?? 0;
    const errors = account.errors ?? 0;
    const rateLimits = account.rateLimits ?? 0;
    console.log(
      `    - ${account.label} (${account.type}): ${requests} requests, ${errors} errors, ${rateLimits} rate-limits`,
    );
  }
}

async function checkProxyStatus(host: string, port: number): Promise<void> {
  const url = `http://${host}:${port}/status`;

  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(3000) });
  } catch {
    console.error(`Could not reach the NeuroLink proxy at ${url}.`);
    console.error("Is it running? Start it with:");
    console.error("  neurolink proxy start");
    console.error("or set it up for the first time with:");
    console.error("  neurolink proxy setup");
    process.exitCode = 1;
    return;
  }

  if (!response.ok) {
    console.error(
      `Proxy responded with HTTP ${response.status} ${response.statusText} at ${url}.`,
    );
    process.exitCode = 1;
    return;
  }

  const body: unknown = await response.json();
  if (!isProxyStatusResponse(body)) {
    console.error(
      `Unexpected response shape from ${url}. Is this a NeuroLink proxy?`,
    );
    process.exitCode = 1;
    return;
  }

  printStatus(body);
}

const host = process.env.PROXY_HOST ?? "127.0.0.1";
const port = Number.parseInt(process.env.PROXY_PORT ?? "55669", 10);

await checkProxyStatus(host, port);
