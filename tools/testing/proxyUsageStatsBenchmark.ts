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
/**
 * How many flushes to time.
 *
 * The gate used to gate on ONE wall-clock flush, which made it a coin flip on a
 * contended runner: a real flush costs 3-6ms locally against a 250ms budget —
 * 50-90x of headroom — and CI still read 545ms once and failed a PR that had
 * touched nothing near the proxy. A budget with that much headroom failing does
 * not mean the code regressed, it means one disk write got descheduled.
 */
// Floored like every other sample count in this file, and for a reason worth
// stating: `percentile([])` returns 0, so a run configured with 0 flush samples
// reports flushMs = 0, which SATISFIES the flush budget below. The benchmark
// would pass its flush gate having never timed a flush. Someone trimming this
// down to speed CI up would silently disable a budget rather than loosen it.
const configuredFlushSamples = Number(
  process.env.PROXY_STATS_FLUSH_SAMPLES ?? 7,
);
const FLUSH_SAMPLES = Math.max(
  1,
  Number.isFinite(configuredFlushSamples)
    ? Math.floor(configuredFlushSamples)
    : 7,
);
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

  // Time several flushes and gate on the MEDIAN, so one descheduled write
  // cannot fail the run. Max is still reported, because a genuine regression
  // moves the whole distribution and hiding the tail would make that harder to
  // see — it is just not what the gate trips on.
  //
  // Every sample dirties the store first, and that is load-bearing rather than
  // incidental: flush() early-returns when nothing is pending
  // (usageStats.ts:841-850), so repeat flushes over a clean store would time
  // the early return and the gate would pass no matter how slow a real flush
  // became. `flushSamplesWereReal` below asserts each sample actually had work
  // to do, so that failure mode is caught rather than silently enjoyed.
  //
  // Dirtying with a single request per sample still measures the real cost: a
  // flush writes the whole snapshot, so the disk write is the same size
  // whether one mutation is pending or fifty thousand.
  const flushSamplesMs: number[] = [];
  let flushSamplesWereReal = true;
  for (let index = 0; index < FLUSH_SAMPLES; index += 1) {
    if (index > 0) {
      store.recordAttempt("benchmark@example.com", "oauth");
      store.recordFinalSuccess("benchmark@example.com", "oauth");
    }
    if (store.getPersistenceStatus().unpersistedMutations === 0) {
      flushSamplesWereReal = false;
    }
    const flushStartedAt = performance.now();
    await store.flush();
    flushSamplesMs.push(performance.now() - flushStartedAt);
  }
  const sortedFlushMs = [...flushSamplesMs].sort((a, b) => a - b);
  const flushMs = percentile(sortedFlushMs, 0.5);
  const flushMaxMs = sortedFlushMs.at(-1) ?? 0;
  const snapshotBytes = (await stat(filePath)).size;

  const replacement = new ProxyUsageStatsStore({ filePath });
  const restoreStartedAt = performance.now();
  await replacement.initialize();
  const restoreMs = performance.now() - restoreStartedAt;
  const restored = replacement.getStats();
  // +(FLUSH_SAMPLES - 1) for the requests the flush-sampling loop records to
  // keep each flush from hitting the early return.
  const expectedRequests = REQUESTS + 1_000 + Math.max(0, FLUSH_SAMPLES - 1);
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
    flushSamplesWereReal &&
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
        flushMaxMs,
        flushSamples: flushSamplesMs.length,
        flushSamplesWereReal,
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
