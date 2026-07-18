import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import {
  configureProxyLifecycleLogger,
  flushProxyLifecycleEvents,
  getProxyLifecycleLoggerSnapshot,
  hashProxyLifecycleSessionId,
  logProxyLifecycleEvent,
  resetProxyLifecycleLoggerForTests,
} from "../../src/lib/proxy/proxyLifecycle.js";
import {
  beginProxyRequest,
  resetProxyActivityForTests,
  trackProxyResponse,
} from "../../src/lib/proxy/proxyActivity.js";

const configuredRequests = Number(
  process.env.PROXY_LIFECYCLE_BENCH_REQUESTS ?? 25_000,
);
const REQUESTS = Math.max(
  1_000,
  Number.isFinite(configuredRequests) ? Math.floor(configuredRequests) : 25_000,
);
const EVENTS_PER_REQUEST = 4;
const configuredResponseSamples = Number(
  process.env.PROXY_RESPONSE_BENCH_REQUESTS ?? 2_000,
);
const RESPONSE_SAMPLES = Math.max(
  100,
  Math.min(
    REQUESTS,
    Number.isFinite(configuredResponseSamples)
      ? Math.floor(configuredResponseSamples)
      : 2_000,
  ),
);
const configuredHotPathBudget = Number(
  process.env.PROXY_LIFECYCLE_MAX_P95_MICROS,
);
const MAX_HOT_PATH_P95_MICROS =
  Number.isFinite(configuredHotPathBudget) && configuredHotPathBudget >= 0
    ? configuredHotPathBudget
    : 500;
const configuredResponseBudget = Number(
  process.env.PROXY_RESPONSE_MAX_P95_OVERHEAD_MICROS,
);
const MAX_RESPONSE_OVERHEAD_P95_MICROS =
  Number.isFinite(configuredResponseBudget) && configuredResponseBudget >= 0
    ? configuredResponseBudget
    : 1_000;

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

function enqueueRequest(requestNumber: number): void {
  const requestId = `benchmark-${requestNumber}`;
  const sessionHash = hashProxyLifecycleSessionId(
    `benchmark-session-${requestNumber % 100}`,
  );
  const common = {
    requestId,
    method: "POST",
    path: "/v1/messages",
    model: "claude-sonnet-5",
    stream: true,
    toolCount: 80,
    sessionHash,
    requestBytes: 9_850_000,
  };

  logProxyLifecycleEvent({
    ...common,
    event: "request_accepted",
    elapsedMs: 0,
  });
  logProxyLifecycleEvent({
    ...common,
    event: "response_headers",
    responseStatus: 200,
    elapsedMs: 125,
  });
  logProxyLifecycleEvent({
    ...common,
    event: "response_first_chunk",
    responseStatus: 200,
    observedBodyBytes: 256,
    responseChunks: 1,
    elapsedMs: 126,
  });
  logProxyLifecycleEvent({
    ...common,
    event: "request_terminal",
    responseStatus: 200,
    observedBodyBytes: 4096,
    responseChunks: 16,
    elapsedMs: 450,
    terminalOutcome: "completed",
  });
}

function makeResponse(): Response {
  const chunks = Array.from({ length: 8 }, (_, index) =>
    new TextEncoder().encode(`chunk-${index}-${"x".repeat(120)}`),
  );
  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(chunk);
        }
        controller.close();
      },
    }),
  );
}

async function measureResponseConsumption(tracked: boolean): Promise<number[]> {
  const samples: number[] = [];
  for (let index = 0; index < RESPONSE_SAMPLES; index += 1) {
    const startedAt = performance.now();
    const response = tracked
      ? trackProxyResponse(makeResponse(), beginProxyRequest())
      : makeResponse();
    await response.arrayBuffer();
    samples.push(performance.now() - startedAt);
  }
  return samples;
}

const logDir = await mkdtemp(
  join(tmpdir(), "neurolink-proxy-lifecycle-bench-"),
);

try {
  configureProxyLifecycleLogger({
    enabled: true,
    logDir,
    queueCapacity: REQUESTS * EVENTS_PER_REQUEST + 1,
    batchSize: 1_024,
    flushIntervalMs: 60_000,
  });

  const requestSamplesMs: number[] = [];
  for (let requestNumber = 0; requestNumber < REQUESTS; requestNumber++) {
    const startedAt = performance.now();
    enqueueRequest(requestNumber);
    requestSamplesMs.push(performance.now() - startedAt);
  }

  const beforeFlush = getProxyLifecycleLoggerSnapshot();
  const flushStartedAt = performance.now();
  await flushProxyLifecycleEvents();
  const flushDurationMs = performance.now() - flushStartedAt;
  const afterFlush = getProxyLifecycleLoggerSnapshot();
  const directResponse = summarize(await measureResponseConsumption(false));
  const trackedResponse = summarize(await measureResponseConsumption(true));
  const responseOverheadP95Micros = Math.max(
    0,
    trackedResponse.p95Micros - directResponse.p95Micros,
  );
  const hotPath = summarize(requestSamplesMs);
  const budgets = {
    hotPathP95Micros: MAX_HOT_PATH_P95_MICROS,
    responseOverheadP95Micros: MAX_RESPONSE_OVERHEAD_P95_MICROS,
  };
  const passed =
    hotPath.p95Micros <= budgets.hotPathP95Micros &&
    responseOverheadP95Micros <= budgets.responseOverheadP95Micros &&
    afterFlush.dropped === 0 &&
    afterFlush.pending === 0 &&
    afterFlush.inFlight === 0;

  process.stdout.write(
    `${JSON.stringify(
      {
        requests: REQUESTS,
        events: REQUESTS * EVENTS_PER_REQUEST,
        hotPath,
        responseTracking: {
          samples: RESPONSE_SAMPLES,
          direct: directResponse,
          tracked: trackedResponse,
          addedP95Micros: responseOverheadP95Micros,
        },
        flush: {
          durationMs: flushDurationMs,
          eventsPerSecond:
            afterFlush.written / Math.max(flushDurationMs / 1_000, 0.001),
        },
        dataQuality: {
          attempted: beforeFlush.attempted,
          enqueued: beforeFlush.enqueued,
          written: afterFlush.written,
          dropped: afterFlush.dropped,
          queueDrops: afterFlush.queueDrops,
          invalidDrops: afterFlush.invalidDrops,
          writeDrops: afterFlush.writeDrops,
          writeFailures: afterFlush.writeFailures,
          pending: afterFlush.pending,
          inFlight: afterFlush.inFlight,
        },
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
  resetProxyLifecycleLoggerForTests();
  resetProxyActivityForTests();
  await rm(logDir, { recursive: true, force: true });
}
