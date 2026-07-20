import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { ProxyUsageStatsStore } from "../../src/lib/proxy/usageStats.js";

const configuredRequests = Number(
  process.env.PROXY_STATS_BENCH_REQUESTS ?? 50_000,
);
const REQUESTS = Math.max(
  5_000,
  Number.isFinite(configuredRequests) ? Math.floor(configuredRequests) : 50_000,
);
const MAX_HOT_PATH_P95_MICROS = Number(
  process.env.PROXY_STATS_MAX_P95_MICROS ?? 50,
);
const MAX_FLUSH_MS = Number(process.env.PROXY_STATS_MAX_FLUSH_MS ?? 250);
const MAX_HEAP_GROWTH_BYTES = Number(
  process.env.PROXY_STATS_MAX_HEAP_GROWTH_BYTES ?? 16 * 1024 * 1024,
);

function percentile(sorted: number[], fraction: number): number {
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(sorted.length * fraction) - 1),
  );
  return sorted[index] ?? 0;
}

function summarize(samples: number[]) {
  const sorted = [...samples].sort((left, right) => left - right);
  return {
    p50Micros: percentile(sorted, 0.5) * 1_000,
    p95Micros: percentile(sorted, 0.95) * 1_000,
    p99Micros: percentile(sorted, 0.99) * 1_000,
    maxMicros: (sorted.at(-1) ?? 0) * 1_000,
  };
}

const root = await mkdtemp(join(tmpdir(), "neurolink-proxy-stats-bench-"));
const filePath = join(root, "proxy-usage-stats.json");

try {
  const store = new ProxyUsageStatsStore({
    filePath,
    flushIntervalMs: 60_000,
  });
  await store.initialize();

  for (let index = 0; index < 1_000; index += 1) {
    store.recordAttempt("benchmark@example.com", "oauth");
    store.recordFinalSuccess("benchmark@example.com", "oauth");
  }
  await store.flush();

  const heapBefore = process.memoryUsage().heapUsed;
  const samplesMs: number[] = [];
  for (let index = 0; index < REQUESTS; index += 1) {
    const startedAt = performance.now();
    store.recordAttempt("benchmark@example.com", "oauth");
    store.recordFinalSuccess("benchmark@example.com", "oauth");
    samplesMs.push(performance.now() - startedAt);
  }
  const heapGrowthBytes = Math.max(
    0,
    process.memoryUsage().heapUsed - heapBefore,
  );
  const hotPath = summarize(samplesMs);

  const flushStartedAt = performance.now();
  await store.flush();
  const flushMs = performance.now() - flushStartedAt;
  const snapshotBytes = (await stat(filePath)).size;

  const replacement = new ProxyUsageStatsStore({ filePath });
  const restoreStartedAt = performance.now();
  await replacement.initialize();
  const restoreMs = performance.now() - restoreStartedAt;
  const restored = replacement.getStats();
  const expectedRequests = REQUESTS + 1_000;
  const exact =
    restored.totalAttempts === expectedRequests &&
    restored.totalRequests === expectedRequests &&
    restored.totalSuccess === expectedRequests &&
    restored.totalErrors === 0;
  const budgets = {
    hotPathP95Micros: MAX_HOT_PATH_P95_MICROS,
    flushMs: MAX_FLUSH_MS,
    heapGrowthBytes: MAX_HEAP_GROWTH_BYTES,
  };
  const passed =
    exact &&
    hotPath.p95Micros <= budgets.hotPathP95Micros &&
    flushMs <= budgets.flushMs &&
    heapGrowthBytes <= budgets.heapGrowthBytes &&
    replacement.getPersistenceStatus().unpersistedMutations === 0;

  process.stdout.write(
    `${JSON.stringify(
      {
        requests: REQUESTS,
        hotPath,
        flushMs,
        restoreMs,
        snapshotBytes,
        heapGrowthBytes,
        exact,
        budgets,
        passed,
      },
      null,
      2,
    )}\n`,
  );
  if (!passed) {
    process.exitCode = 1;
  }
} finally {
  await rm(root, { recursive: true, force: true });
}
