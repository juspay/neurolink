import { once } from "node:events";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { createServer, get } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { monitorEventLoopDelay, performance } from "node:perf_hooks";
import { startRollingProxyServer } from "../../src/lib/proxy/rollingProxyServer.js";
import { spawnProxySocketWorker } from "../../src/lib/proxy/rollingWorkerProcess.js";
import type { RollingProxyServer } from "../../src/lib/types/index.js";

const configuredRequests = Number(
  process.env.PROXY_ROLLING_BENCH_REQUESTS ?? 500,
);
const REQUESTS = Math.max(
  100,
  Number.isFinite(configuredRequests) ? Math.floor(configuredRequests) : 500,
);
const WARMUP_REQUESTS = Math.min(50, Math.max(20, REQUESTS / 10));
const MAX_ADDED_P95_MS = Number(
  process.env.PROXY_ROLLING_MAX_ADDED_P95_MS ?? 10,
);
const MAX_ADDED_TTFB_P95_MS = Number(
  process.env.PROXY_ROLLING_MAX_ADDED_TTFB_P95_MS ?? 10,
);
const MAX_CPU_MICROS_PER_REQUEST = Number(
  process.env.PROXY_ROLLING_MAX_CPU_MICROS_PER_REQUEST ?? 5_000,
);
const MAX_HEAP_GROWTH_BYTES = Number(
  process.env.PROXY_ROLLING_MAX_HEAP_GROWTH_BYTES ?? 32 * 1024 * 1024,
);
const MAX_WORKER_PEAK_HEAP_BYTES = Number(
  process.env.PROXY_ROLLING_MAX_WORKER_PEAK_HEAP_BYTES ?? 96 * 1024 * 1024,
);
const MAX_DESCRIPTOR_GROWTH = Number(
  process.env.PROXY_ROLLING_MAX_DESCRIPTOR_GROWTH ?? 16,
);
const MAX_WORKER_OPEN_DESCRIPTORS = Number(
  process.env.PROXY_ROLLING_MAX_WORKER_OPEN_DESCRIPTORS ?? 64,
);
const MAX_EVENT_LOOP_P95_MS = Number(
  process.env.PROXY_ROLLING_MAX_EVENT_LOOP_P95_MS ?? 100,
);
const MAX_SUSTAINED_ADDED_P95_MS = Number(
  process.env.PROXY_ROLLING_MAX_SUSTAINED_ADDED_P95_MS ?? 25,
);
const MAX_SUSTAINED_ADDED_TTFB_P95_MS = Number(
  process.env.PROXY_ROLLING_MAX_SUSTAINED_ADDED_TTFB_P95_MS ?? 25,
);
const configuredSustainedConcurrency = Number(
  process.env.PROXY_ROLLING_SUSTAINED_CONCURRENCY ?? 64,
);
const SUSTAINED_CONCURRENCY = Math.max(
  8,
  Number.isFinite(configuredSustainedConcurrency)
    ? Math.floor(configuredSustainedConcurrency)
    : 64,
);
const configuredSustainedRounds = Number(
  process.env.PROXY_ROLLING_SUSTAINED_ROUNDS ?? 4,
);
const SUSTAINED_ROUNDS = Math.max(
  1,
  Number.isFinite(configuredSustainedRounds)
    ? Math.floor(configuredSustainedRounds)
    : 4,
);
const REQUEST_TIMEOUT_MS = Math.max(
  1_000,
  Number(process.env.PROXY_ROLLING_REQUEST_TIMEOUT_MS ?? 30_000),
);
const workerFixture = fileURLToPath(
  new URL("../../test/fixtures/proxySocketWorker.cjs", import.meta.url),
);
// Workers append their exit-time CPU/heap here so the reported budgets reflect
// the full rolling cost, not just the benchmark parent process.
const metricsDir = mkdtempSync(join(tmpdir(), "proxy-rolling-bench-"));
const workerMetricsFile = join(metricsDir, "worker-metrics.jsonl");

type WorkerMetricSample = {
  pid: number;
  cpuMicros: number;
  heapUsed: number;
  openDescriptors: number | null;
};

function readWorkerMetrics(file: string): WorkerMetricSample[] {
  try {
    return readFileSync(file, "utf8")
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line) as WorkerMetricSample);
  } catch {
    return [];
  }
}

function summarize(values: number[]) {
  const sorted = [...values].sort((left, right) => left - right);
  const percentile = (fraction: number) => {
    const index = Math.max(0, Math.ceil(sorted.length * fraction) - 1);
    return Number((sorted[index] ?? 0).toFixed(3));
  };
  return {
    count: sorted.length,
    p50Ms: percentile(0.5),
    p95Ms: percentile(0.95),
    p99Ms: percentile(0.99),
    maxMs: Number((sorted.at(-1) ?? 0).toFixed(3)),
  };
}

function countOpenDescriptors(): number | null {
  // Linux exposes the process descriptor table directly. macOS maps /dev/fd
  // to the current process; unsupported platforms simply report no metric.
  for (const path of ["/proc/self/fd", "/dev/fd"]) {
    try {
      return readdirSync(path).length;
    } catch {
      // Try the next platform-specific descriptor directory.
    }
  }
  return null;
}

async function request(url: string): Promise<{
  bodyBytes: number;
  totalMs: number;
  ttfbMs: number;
  version: string | undefined;
}> {
  const startedAt = performance.now();
  return new Promise((resolve, reject) => {
    let settled = false;
    const succeed = (value: {
      bodyBytes: number;
      totalMs: number;
      ttfbMs: number;
      version: string | undefined;
    }): void => {
      if (!settled) {
        settled = true;
        resolve(value);
      }
    };
    const fail = (error: Error): void => {
      if (!settled) {
        settled = true;
        reject(error);
      }
    };
    const outgoing = get(url, { agent: false }, (response) => {
      let firstByteAt: number | undefined;
      let bodyBytes = 0;
      response.on("data", (chunk: Buffer) => {
        firstByteAt ??= performance.now();
        bodyBytes += chunk.byteLength;
      });
      response.once("end", () => {
        const endedAt = performance.now();
        succeed({
          bodyBytes,
          totalMs: endedAt - startedAt,
          ttfbMs: (firstByteAt ?? endedAt) - startedAt,
          version: Array.isArray(response.headers["x-worker-version"])
            ? response.headers["x-worker-version"][0]
            : response.headers["x-worker-version"],
        });
      });
      // A response cut off after headers never emits "end"; fail fast so a
      // dropped request settles instead of hanging the benchmark forever.
      response.once("close", () => {
        fail(new Error("response closed before completing"));
      });
    });
    outgoing.once("error", fail);
    outgoing.setTimeout(REQUEST_TIMEOUT_MS, () => {
      outgoing.destroy(
        new Error(`request timed out after ${REQUEST_TIMEOUT_MS}ms`),
      );
    });
  });
}

const direct = createServer((incoming, outgoing) => {
  outgoing.setHeader("connection", "close");
  outgoing.setHeader("content-type", "application/octet-stream");
  if (incoming.url === "/stream") {
    let chunk = 0;
    const timer = setInterval(() => {
      outgoing.write(Buffer.alloc(256, chunk));
      chunk += 1;
      if (chunk === 20) {
        clearInterval(timer);
        outgoing.end();
      }
    }, 5);
    return;
  }
  outgoing.end(Buffer.alloc(1_024, 1));
});
direct.listen(0, "127.0.0.1");
await once(direct, "listening");
const directAddress = direct.address();
if (!directAddress || typeof directAddress === "string") {
  throw new Error("direct benchmark server did not expose a TCP port");
}
const directUrl = `http://127.0.0.1:${directAddress.port}`;

let rolling: RollingProxyServer | undefined;
let closed = false;
const closeServers = async (): Promise<void> => {
  if (closed) {
    return;
  }
  closed = true;
  // Close independent resources with allSettled so a rejection from one close
  // can never skip the other.
  await Promise.allSettled([
    rolling ? rolling.close() : Promise.resolve(),
    new Promise<void>((resolve) => direct.close(() => resolve())),
  ]);
};

try {
  // Initialize the rolling server inside the protected scope so a startup
  // failure still reaches cleanup.
  rolling = await startRollingProxyServer({
    host: "127.0.0.1",
    port: 0,
    initialVersion: "9.93.1",
    spawnWorker: (generation, expectedVersion) =>
      spawnProxySocketWorker({
        generation,
        expectedVersion,
        command: process.execPath,
        args: [workerFixture],
        stdout: "ignore",
        stderr: "ignore",
        env: { NEUROLINK_PROXY_BENCH_METRICS_FILE: workerMetricsFile },
      }),
  });
  const rollingUrl = `http://127.0.0.1:${rolling.address.port}`;

  for (let index = 0; index < WARMUP_REQUESTS; index += 1) {
    await request(index % 2 === 0 ? directUrl : rollingUrl);
  }

  const heapBefore = process.memoryUsage().heapUsed;
  const cpuBefore = process.cpuUsage();
  const descriptorsBefore = countOpenDescriptors();
  const eventLoop = monitorEventLoopDelay({ resolution: 20 });
  eventLoop.enable();
  const directTotal: number[] = [];
  const directTtfb: number[] = [];
  const rollingTotal: number[] = [];
  const rollingTtfb: number[] = [];
  const directSustainedTotal: number[] = [];
  const directSustainedTtfb: number[] = [];
  const rollingSustainedTotal: number[] = [];
  const rollingSustainedTtfb: number[] = [];
  let droppedRequests = 0;
  for (let index = 0; index < REQUESTS; index += 1) {
    const paths =
      index % 2 === 0 ? [directUrl, rollingUrl] : [rollingUrl, directUrl];
    for (const url of paths) {
      try {
        const sample = await request(url);
        if (sample.bodyBytes !== 1_024) {
          droppedRequests += 1;
        }
        const total = url === directUrl ? directTotal : rollingTotal;
        const ttfb = url === directUrl ? directTtfb : rollingTtfb;
        total.push(sample.totalMs);
        ttfb.push(sample.ttfbMs);
      } catch {
        droppedRequests += 1;
      }
    }
  }

  const sustainedTotal = SUSTAINED_CONCURRENCY * SUSTAINED_ROUNDS * 2;
  let sustainedFailures = 0;
  for (let round = 0; round < SUSTAINED_ROUNDS; round += 1) {
    const urls = Array.from(
      { length: SUSTAINED_CONCURRENCY * 2 },
      (_, index) => ((index + round) % 2 === 0 ? directUrl : rollingUrl),
    );
    const results = await Promise.allSettled(urls.map((url) => request(url)));
    for (const [index, result] of results.entries()) {
      if (result.status === "rejected" || result.value.bodyBytes !== 1_024) {
        sustainedFailures += 1;
        continue;
      }
      const isDirect = urls[index] === directUrl;
      const total = isDirect ? directSustainedTotal : rollingSustainedTotal;
      const ttfb = isDirect ? directSustainedTtfb : rollingSustainedTtfb;
      total.push(result.value.totalMs);
      ttfb.push(result.value.ttfbMs);
    }
  }

  const stream = request(`${rollingUrl}/stream`);
  await new Promise((resolve) => setTimeout(resolve, 15));
  const replacement = rolling.replace("9.94.0");
  const concurrent = Array.from({ length: 100 }, () => request(rollingUrl));
  const concurrentResults = await Promise.allSettled(concurrent);
  await replacement;
  const streamResult = await stream;
  const concurrentFailures = concurrentResults.filter(
    (result) =>
      result.status === "rejected" ||
      (result.status === "fulfilled" && result.value.bodyBytes !== 1_024),
  ).length;
  droppedRequests += concurrentFailures;

  const cpu = process.cpuUsage(cpuBefore);
  eventLoop.disable();
  const eventLoopP95Ms = Number(
    (eventLoop.percentile(95) / 1_000_000).toFixed(3),
  );
  const descriptorsAfter = countOpenDescriptors();
  const descriptorGrowth =
    descriptorsBefore === null || descriptorsAfter === null
      ? null
      : Math.max(0, descriptorsAfter - descriptorsBefore);
  const heapGrowthBytes = Math.max(
    0,
    process.memoryUsage().heapUsed - heapBefore,
  );
  const directLatency = summarize(directTotal);
  const rollingLatency = summarize(rollingTotal);
  const directFirstByte = summarize(directTtfb);
  const rollingFirstByte = summarize(rollingTtfb);
  const directSustainedLatency = summarize(directSustainedTotal);
  const rollingSustainedLatency = summarize(rollingSustainedTotal);
  const directSustainedFirstByte = summarize(directSustainedTtfb);
  const rollingSustainedFirstByte = summarize(rollingSustainedTtfb);
  const addedP95Ms = Math.max(
    0,
    Number((rollingLatency.p95Ms - directLatency.p95Ms).toFixed(3)),
  );
  const addedTtfbP95Ms = Math.max(
    0,
    Number((rollingFirstByte.p95Ms - directFirstByte.p95Ms).toFixed(3)),
  );
  const sustainedAddedP95Ms = Math.max(
    0,
    Number(
      (rollingSustainedLatency.p95Ms - directSustainedLatency.p95Ms).toFixed(3),
    ),
  );
  const sustainedAddedTtfbP95Ms = Math.max(
    0,
    Number(
      (
        rollingSustainedFirstByte.p95Ms - directSustainedFirstByte.p95Ms
      ).toFixed(3),
    ),
  );
  const streamPreserved = streamResult.bodyBytes === 20 * 256;

  // Drain and stop every worker generation before aggregating so both the
  // retired and the active worker have flushed their exit-time metrics.
  await closeServers();
  const workerMetrics = readWorkerMetrics(workerMetricsFile);
  const workerCpuMicros = workerMetrics.reduce(
    (total, sample) => total + sample.cpuMicros,
    0,
  );
  const workerPeakHeapBytes = workerMetrics.reduce(
    (max, sample) => Math.max(max, sample.heapUsed),
    0,
  );
  const workerPeakOpenDescriptors = workerMetrics.reduce(
    (max, sample) => Math.max(max, sample.openDescriptors ?? 0),
    0,
  );

  const totalRequests = REQUESTS * 2 + sustainedTotal + concurrent.length;
  const cpuMicrosPerRequest = Number(
    ((cpu.user + cpu.system + workerCpuMicros) / totalRequests).toFixed(3),
  );
  const passed =
    droppedRequests === 0 &&
    sustainedFailures === 0 &&
    streamPreserved &&
    addedP95Ms <= MAX_ADDED_P95_MS &&
    addedTtfbP95Ms <= MAX_ADDED_TTFB_P95_MS &&
    sustainedAddedP95Ms <= MAX_SUSTAINED_ADDED_P95_MS &&
    sustainedAddedTtfbP95Ms <= MAX_SUSTAINED_ADDED_TTFB_P95_MS &&
    cpuMicrosPerRequest <= MAX_CPU_MICROS_PER_REQUEST &&
    heapGrowthBytes <= MAX_HEAP_GROWTH_BYTES &&
    workerPeakHeapBytes <= MAX_WORKER_PEAK_HEAP_BYTES &&
    (descriptorGrowth === null || descriptorGrowth <= MAX_DESCRIPTOR_GROWTH) &&
    workerPeakOpenDescriptors <= MAX_WORKER_OPEN_DESCRIPTORS &&
    eventLoopP95Ms <= MAX_EVENT_LOOP_P95_MS;

  process.stdout.write(
    `${JSON.stringify(
      {
        fixture: "cross-process-socket-handoff",
        warmupRequests: WARMUP_REQUESTS,
        measuredRequestsPerPath: REQUESTS,
        direct: { latency: directLatency, ttfb: directFirstByte },
        rolling: { latency: rollingLatency, ttfb: rollingFirstByte },
        handoff: {
          concurrentRequests: concurrent.length,
          concurrentFailures,
          activeStreamBytes: streamResult.bodyBytes,
          activeStreamPreserved: streamPreserved,
          activeVersion: rolling.snapshot().active?.version,
        },
        sustainedConcurrency: {
          concurrency: SUSTAINED_CONCURRENCY,
          rounds: SUSTAINED_ROUNDS,
          requests: sustainedTotal,
          failures: sustainedFailures,
          direct: {
            latency: directSustainedLatency,
            ttfb: directSustainedFirstByte,
          },
          rolling: {
            latency: rollingSustainedLatency,
            ttfb: rollingSustainedFirstByte,
          },
          addedP95Ms: sustainedAddedP95Ms,
          addedTtfbP95Ms: sustainedAddedTtfbP95Ms,
        },
        overhead: {
          addedP95Ms,
          addedTtfbP95Ms,
          // Combined parent + worker CPU so the per-request cost is not
          // under-reported by ignoring the worker processes.
          cpuMicrosPerRequest,
          parentCpuMicros: cpu.user + cpu.system,
          workerCpuMicros,
          heapGrowthBytes,
          workerPeakHeapBytes,
          descriptorGrowth,
          workerPeakOpenDescriptors,
          eventLoopP95Ms,
        },
        worker: {
          samples: workerMetrics.length,
          cpuMicros: workerCpuMicros,
          peakHeapBytes: workerPeakHeapBytes,
          peakOpenDescriptors: workerPeakOpenDescriptors,
        },
        dataQuality: { droppedRequests },
        budgets: {
          maxAddedP95Ms: MAX_ADDED_P95_MS,
          maxAddedTtfbP95Ms: MAX_ADDED_TTFB_P95_MS,
          maxCpuMicrosPerRequest: MAX_CPU_MICROS_PER_REQUEST,
          maxHeapGrowthBytes: MAX_HEAP_GROWTH_BYTES,
          maxWorkerPeakHeapBytes: MAX_WORKER_PEAK_HEAP_BYTES,
          maxDescriptorGrowth: MAX_DESCRIPTOR_GROWTH,
          maxWorkerOpenDescriptors: MAX_WORKER_OPEN_DESCRIPTORS,
          maxEventLoopP95Ms: MAX_EVENT_LOOP_P95_MS,
          maxSustainedAddedP95Ms: MAX_SUSTAINED_ADDED_P95_MS,
          maxSustainedAddedTtfbP95Ms: MAX_SUSTAINED_ADDED_TTFB_P95_MS,
        },
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
  await closeServers();
  rmSync(metricsDir, { recursive: true, force: true });
}
