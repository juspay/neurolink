#!/usr/bin/env tsx
/**
 * Determinism exception (CLAUDE.md rule 15): collector outage/recovery, ambiguous
 * export acknowledgments, and late ingestion need controlled local OTLP and
 * backend fixtures. Recorded parent/child journals and in-memory SQL verify
 * dashboard accounting against fixed traffic and token totals. All endpoints
 * use random loopback ports and temporary data;
 * no installed proxy/collector is contacted or changed.
 */
import "./helpers/proxyTestIsolation.js";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { createServer } from "node:http";
import type { IncomingMessage } from "node:http";
import { gunzipSync } from "node:zlib";
import {
  chmod,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { DatabaseSync } from "node:sqlite";
import yaml from "js-yaml";
import {
  LoggerProvider,
  SimpleLogRecordProcessor,
} from "@opentelemetry/sdk-logs";
import { ExportResultCode } from "@opentelemetry/core";
import type { ExportResult } from "@opentelemetry/core";
import {
  createProxyOtlpLogTransport,
  getProxyOtlpRetryAfter,
} from "../src/lib/proxy/otlpLogTransport.js";
import { assertEqual, defineSuite, runCLI, Skip } from "./helpers/harness.js";
import {
  emitProxyOtelEvent,
  flushProxyOtelLogs,
  getProxyOtelLogSnapshot,
  initializeProxyOtelLogs,
  publishProxyOtelBody,
  shutdownProxyOtelLogs,
} from "../src/lib/proxy/otelLogSink.js";
import { processProxyBodyCapture } from "../src/lib/proxy/bodyCaptureProcessing.js";
import { createProxyBodyCapturePolicy } from "../src/lib/proxy/bodyCapturePolicy.js";
import { analyzeProxyLogs } from "../src/lib/proxy/proxyAnalysis.js";
import {
  initRequestLogger,
  logRequest,
  flushRequestLogs,
} from "../src/lib/proxy/requestLogger.js";
import type { RequestLogEntry } from "../src/lib/types/index.js";
import { resolveProxyTelemetryBackend } from "../scripts/observability/proxy-telemetry-backend.mjs";
import { queryProxyHistory } from "../scripts/observability/query-proxy-history.mjs";
import {
  reconcileProxyAdmissions,
  reconstructProxyBodyCapture,
  resolveProxyBodyCaptureTarget,
} from "../scripts/observability/proxy-telemetry-check.mjs";

const { test, runSuite } = defineSuite("Proxy Capture Pipeline", {
  offline: true,
});
const pause = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));
async function until(
  predicate: () => boolean | Promise<boolean>,
  timeoutMs = 10000,
) {
  const deadline = Date.now() + timeoutMs;
  while (!(await predicate())) {
    assert(Date.now() < deadline, "fixture deadline exceeded");
    await pause(20);
  }
}
async function withCollector(
  responseCode: number | ((batch: Array<Record<string, unknown>>) => number),
  run: (batches: Array<Array<Record<string, unknown>>>) => Promise<void>,
  options: {
    responseBody?: string;
    responseHeaders?: Record<string, string>;
    env?: Record<string, string>;
    observe?: (request: IncomingMessage, raw: Buffer) => void;
  } = {},
) {
  const batches: Array<Array<Record<string, unknown>>> = [];
  const server = createServer(async (request, response) => {
    const body: Buffer[] = [];
    for await (const chunk of request) {
      body.push(chunk);
    }
    const raw = Buffer.concat(body);
    options.observe?.(request, raw);
    const payload = JSON.parse(
      (request.headers["content-encoding"] === "gzip"
        ? gunzipSync(raw)
        : raw
      ).toString(),
    );
    const batch = payload.resourceLogs.flatMap(
      (resource: {
        scopeLogs: Array<{ logRecords: Array<Record<string, unknown>> }>;
      }) => resource.scopeLogs.flatMap((scope) => scope.logRecords),
    );
    batches.push(batch);
    await pause(40);
    response
      .writeHead(
        typeof responseCode === "number" ? responseCode : responseCode(batch),
        {
          "content-type": "application/json",
          ...options.responseHeaders,
        },
      )
      .end(options.responseBody ?? "{}");
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert(
    address && typeof address !== "string",
    "fixture collector did not listen",
  );
  const previous = { ...process.env };
  process.env.NEUROLINK_PROXY_LOG_SINK = "otel";
  process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT = `http://127.0.0.1:${address.port}/v1/logs`;
  delete process.env.NEUROLINK_PROXY_OTLP_BODIES_ENDPOINT;
  Object.assign(process.env, options.env);
  initializeProxyOtelLogs("batch-fixture");
  try {
    await run(batches);
  } finally {
    await shutdownProxyOtelLogs();
    for (const key of Object.keys(process.env)) {
      if (!(key in previous)) {
        delete process.env[key];
      }
    }
    Object.assign(process.env, previous);
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}
function publish(id: string, body = "x".repeat(1024)) {
  const logger = initializeProxyOtelLogs()!.getLogger("fixture");
  return publishProxyOtelBody(id, body, (chunk, index, count) =>
    logger.emit({
      body: chunk,
      attributes: {
        "proxy.record_kind": "body",
        "body.capture_id": id,
        "body.chunk_index": index,
        "body.chunk_count": count,
      },
    }),
  );
}
await test("24 simultaneous captures share OTLP batches and retain independent acknowledgments", async () => {
  await withCollector(200, async (batches) => {
    const results = await Promise.all(
      Array.from({ length: 24 }, (_, index) => publish(`burst-${index}`)),
    );
    assert(
      batches.length <= 2,
      `serial per-capture exports remain: ${batches.length}`,
    );
    assertEqual(batches.flat().length, 24);
    assert(
      results.every(
        (result) =>
          result.status === "transport_acknowledged" &&
          result.acknowledgedChunks === 1,
      ),
    );
    assert(
      results.every(
        (result) =>
          (result.maxChunkExportMs ?? 0) >= 30 &&
          (result.maxChunkQueueWaitMs ?? -1) >= 0,
      ),
    );
    const state = getProxyOtelLogSnapshot();
    assertEqual(state.bodyDelivery.pending, 0);
    assertEqual(state.bodyDelivery.transportAcknowledged, 24);
    assertEqual(
      state.queues.find((queue) => queue.kind === "bodies")!.dropped,
      0,
    );
  });
});
await test("a rejected shared export records uncertainty for every capture exactly once", async () => {
  await withCollector(400, async () => {
    const results = await Promise.all(
      Array.from({ length: 24 }, (_, index) => publish(`rejected-${index}`)),
    );
    assert(
      results.every(
        (result) =>
          result.status === "export_unconfirmed" &&
          result.unconfirmedChunks === 1 &&
          result.acknowledgedChunks === 0,
      ),
    );
    const state = getProxyOtelLogSnapshot();
    assertEqual(state.bodyDelivery.exportUnconfirmed, 24);
    assertEqual(state.bodyDelivery.pending, 0);
  });
});
await test("capture identities and aggregate queue capacity stay bounded under concurrent publication", async () => {
  await withCollector(200, async () => {
    const first = publish("duplicate");
    const duplicate = await publish("duplicate");
    assertEqual(duplicate.status, "rejected");
    assertEqual(duplicate.reason, "body_capture_id_in_use");
    await first;
    const results = await Promise.all(
      Array.from({ length: 20 }, (_, index) =>
        publish(`large-${index}`, "y".repeat(1500000)),
      ),
    );
    assert(
      results.every((result) => result.status === "transport_acknowledged"),
    );
    emitProxyOtelEvent("lifecycle", {
      event: "request_terminal",
      requestId: "independent-metadata",
    });
    await flushProxyOtelLogs();
    const queues = getProxyOtelLogSnapshot().queues;
    assert(
      queues.every(
        (queue) =>
          queue.highWaterOutstanding <= queue.capacity && queue.dropped === 0,
      ),
    );
  });
});
await test("capture metadata separates source loss, redaction loss and processing limits", async () => {
  const raw =
    'event: response\ndata: {"text":"complete"}\n\nevent: response\ndata: {"password":"unfinished';
  const result = await processProxyBodyCapture(
    {
      timestamp: new Date().toISOString(),
      requestId: "truncated-source",
      phase: "client_response",
      model: "fixture",
      stream: true,
      body: raw,
      bodySize: 2000000,
      sourceTruncated: true,
    },
    null,
  );
  assertEqual(result.stored.bodyTruncated, true);
  assertEqual(result.stored.sourceTruncated, true);
  assertEqual(result.stored.processingTruncated, false);
  assertEqual(result.stored.redactionLossy, true);
  assertEqual(result.stored.unparseableRedactedFrames, 1);
  assertEqual(result.stored.inputRetainedBytes, Buffer.byteLength(raw));
  assertEqual(
    result.stored.redactedBodyBytes,
    Buffer.byteLength(result.stored.redactedBody!),
  );
  assert(
    !result.stored.redactedBody!.includes("unfinished"),
    "invalid credential suffix survived redaction",
  );
});
await test("admission reconciliation detects stale requests even when no terminal was ever recorded", async () => {
  const at = Date.parse("2026-09-19T01:00:00Z");
  const row = (
    requestId: string,
    minutes: number,
    event = "request_accepted",
  ) => ({
    requestId,
    event,
    timestamp: new Date(at - minutes * 60000).toISOString(),
  });
  const result = reconcileProxyAdmissions(
    [
      row("overdue", 25),
      row("fresh", 1),
      row("ended", 25),
      row("ended", 0, "request_terminal"),
      { ...row("long", 25), requestTimeoutMs: 30 * 60000 },
    ],
    {
      asOfMicroseconds: at * 1000,
      requestTimeoutMs: 15 * 60000,
      ingestionGraceMs: 120000,
    },
  );
  assertEqual(result.overdue.length, 1);
  assertEqual(result.overdue[0].requestId, "overdue");
  assertEqual(result.ended, 1);
  assertEqual(result.pending.length, 2);
});
await test("bounded history collapses exact retry identities but retains conflicting producer data", async () => {
  const common = {
    proxy_event_id: "event-1",
    service_instance_id: "worker-1",
    request_id: "request-1",
    body: '{"requestId":"request-1"}',
  };
  const result = await queryProxyHistory({
    baseUrl: "http://127.0.0.1:1",
    startTime: 1000,
    endTime: 1000000,
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          hits: [
            { ...common, _timestamp: 2000 },
            { ...common, _timestamp: 3000 },
            { ...common, _timestamp: 4000, body: '{"requestId":"different"}' },
          ],
        }),
        { status: 200 },
      ),
  });
  assertEqual(result.rawRecordCount, 3);
  assertEqual(result.recordCount, 2);
  assertEqual(result.exactRetryDuplicates, 1);
  assert(result.lateIngestionBoundary.includes("later ingestion"));
});
await test("doctor resolves separate streams from the collector environment profile", async () => {
  const backend = await resolveProxyTelemetryBackend({
    NEUROLINK_OTEL_COLLECTOR_CONFIG: new URL(
      "../scripts/observability/otel-collector.proxy-native-durable.yaml",
      import.meta.url,
    ).pathname,
    NEUROLINK_OPENOBSERVE_OTLP_ENDPOINT: "http://127.0.0.1:12345/api/fixture",
    NEUROLINK_OPENOBSERVE_BASIC_AUTH: "Basic fixture",
  });
  assertEqual(backend.baseUrl, "http://127.0.0.1:12345");
  assertEqual(backend.stream, "neurolink_proxy");
  assertEqual(backend.bodyStream, "neurolink_proxy_bodies");
  assertEqual(backend.organization, "fixture");
});

await test("shipped CLI stages private native migration without changing operator files or disclosing secrets", async () => {
  const directory = await mkdtemp(join(tmpdir(), "proxy-native-prepare-"));
  const source = join(directory, "existing.yaml");
  const output = join(directory, "stage");
  const secret = "Basic fixture-private-credential";
  const fixture = yaml.dump({
    receivers: {
      otlp: { protocols: { http: { endpoint: "127.0.0.1:24318" } } },
    },
    exporters: {
      "otlphttp/openobserve": {
        endpoint: "http://127.0.0.1:25080/api/fixture",
        headers: { Authorization: secret, "stream-name": "operator_history" },
      },
    },
    extensions: { health_check: { endpoint: "127.0.0.1:24333" } },
    service: {
      telemetry: {
        metrics: {
          readers: [
            {
              pull: {
                exporter: { prometheus: { host: "127.0.0.1", port: 24388 } },
              },
            },
          ],
        },
      },
    },
  });
  await writeFile(source, fixture, { mode: 0o600 });
  const args = [
    "telemetry",
    "native-prepare",
    "--collector-config",
    source,
    "--output",
    output,
    "--queue-directory",
    join(directory, "operator-queue"),
    "--compaction-directory",
    join(directory, "operator-compact"),
    "--body-port",
    "24319",
    "--metadata-queue-mib",
    "16",
    "--body-queue-mib",
    "128",
    "--disk-quota-mib",
    "512",
  ];
  try {
    const result = await runCLI(args);
    assertEqual(result.exitCode, 0, result.stderr);
    assert(!`${result.stdout}${result.stderr}`.includes(secret));
    assertEqual(await readFile(source, "utf8"), fixture);
    assertEqual((await stat(output)).mode & 0o777, 0o700);
    for (const file of [
      "collector.yaml",
      "collector.env.json",
      "proxy.env",
      "doctor.env",
      "manifest.json",
    ]) {
      assertEqual((await stat(join(output, file))).mode & 0o777, 0o600);
    }
    await assert.rejects(stat(join(directory, "operator-queue")), {
      code: "ENOENT",
    });
    await assert.rejects(stat(join(directory, "operator-compact")), {
      code: "ENOENT",
    });
    const env = JSON.parse(
      await readFile(join(output, "collector.env.json"), "utf8"),
    );
    assertEqual(env.NEUROLINK_OPENOBSERVE_BASIC_AUTH, secret);
    assertEqual(env.NEUROLINK_PROXY_STREAM_HEADER, "operator_history");
    assertEqual(
      env.NEUROLINK_PROXY_BODY_STREAM_HEADER,
      "operator_history_bodies",
    );
    assertEqual(
      env.NEUROLINK_OTEL_METADATA_QUEUE_BYTES,
      String(16 * 1024 * 1024),
    );
    assertEqual(env.NEUROLINK_OTEL_BODY_QUEUE_BYTES, String(128 * 1024 * 1024));
    const doctor = await readFile(join(output, "doctor.env"), "utf8");
    assert(
      doctor.includes(
        "NEUROLINK_PROXY_BODY_STREAM_HEADER=operator_history_bodies",
      ),
    );
    assert(!doctor.includes(secret));
    assert(
      !(await readFile(join(output, "collector.yaml"), "utf8")).includes(
        secret,
      ),
    );
    const manifest = JSON.parse(
      await readFile(join(output, "manifest.json"), "utf8"),
    );
    assertEqual(manifest.activationImplemented, false);
    assertEqual(manifest.operatorPolicy.enforced, false);
    assertEqual(manifest.operatorPolicy.diskQuotaBytes, 512 * 1024 * 1024);
    const refused = await runCLI(args);
    assert.notEqual(
      refused.exitCode,
      0,
      "existing stage must never be overwritten",
    );
    assertEqual(await readFile(source, "utf8"), fixture);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

await test("native validation gates version, changed source and private diagnostics using only static collector commands", async () => {
  const directory = await mkdtemp(join(tmpdir(), "proxy-native-validate-"));
  const source = join(directory, "existing.yaml");
  const output = join(directory, "stage");
  const binary = join(directory, "fixture-collector");
  const calls = join(directory, "calls.jsonl");
  const secret = "Basic fixture-validation-secret";
  const fixture = yaml.dump({
    receivers: {
      otlp: { protocols: { http: { endpoint: "127.0.0.1:24318" } } },
    },
    exporters: {
      "otlphttp/openobserve": {
        endpoint: "http://127.0.0.1:25080/api/fixture",
        headers: { Authorization: secret, "stream-name": "metadata" },
      },
    },
    service: {},
  });
  await writeFile(source, fixture, { mode: 0o600 });
  const writeCollector = async (version: string, reject = false) => {
    await writeFile(
      binary,
      `#!${process.execPath}\nconst fs = require('node:fs');\nconst args = process.argv.slice(2);\nif(args[0] === '--version') { console.log('otelcol-contrib version ${version}'); process.exit(0); }\nfs.appendFileSync(${JSON.stringify(calls)}, JSON.stringify({args, queue:process.env.NEUROLINK_OTEL_QUEUE_DIRECTORY})+'\\n');\nif(args[0] !== 'validate') process.exit(91);\nif(${reject}) { console.error(process.env.NEUROLINK_OPENOBSERVE_BASIC_AUTH); process.exit(2); }\n`,
      { mode: 0o700 },
    );
    await chmod(binary, 0o700);
  };
  try {
    const prepared = await runCLI([
      "telemetry",
      "native-prepare",
      "--collector-config",
      source,
      "--output",
      output,
      "--queue-directory",
      join(directory, "operator-queue"),
      "--compaction-directory",
      join(directory, "operator-compact"),
    ]);
    assertEqual(prepared.exitCode, 0, prepared.stderr);
    const validate = () =>
      runCLI([
        "telemetry",
        "native-validate",
        "--directory",
        output,
        "--collector-bin",
        binary,
      ]);
    await writeCollector("0.159.0");
    const old = await validate();
    assert.notEqual(old.exitCode, 0);
    await assert.rejects(stat(calls), { code: "ENOENT" });
    await writeCollector("0.160.0", true);
    const rejected = await validate();
    assert.notEqual(rejected.exitCode, 0);
    assert(!`${rejected.stdout}${rejected.stderr}`.includes(secret));
    await writeCollector("0.160.0");
    const valid = await validate();
    assertEqual(valid.exitCode, 0, valid.stderr);
    assert(valid.stdout.includes('"activated": false'));
    const invocations = (await readFile(calls, "utf8"))
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    assertEqual(invocations.length, 2);
    assert(
      invocations.every(
        (call) =>
          call.args[0] === "validate" &&
          call.queue.startsWith(`${output}/validation-`),
      ),
    );
    await assert.rejects(stat(join(directory, "operator-queue")), {
      code: "ENOENT",
    });
    await writeFile(source, `${fixture}\n# operator changed config\n`);
    const stale = await validate();
    assert.notEqual(stale.exitCode, 0);
    assert(
      `${stale.stdout}${stale.stderr}`.includes(
        "Source collector configuration changed",
      ),
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

await test("persistent collector queues recover acknowledged records after test-owned process death", async () => {
  const binary = process.env.NEUROLINK_TEST_OTELCOL_BIN;
  if (!binary) {
    throw new Skip(
      "set NEUROLINK_TEST_OTELCOL_BIN to test a real isolated collector restart",
    );
  }
  const directory = await mkdtemp(join(tmpdir(), "proxy-collector-recovery-"));
  const profile = new URL(
    "../scripts/observability/otel-collector.proxy-native-durable.yaml",
    import.meta.url,
  );
  const config = yaml.load(await readFile(profile, "utf8")) as {
    exporters: Record<
      string,
      { sending_queue: { sizer: string; queue_size: string; storage: string } }
    >;
  };
  assertEqual(
    config.exporters["otlphttp/openobserve-bodies"].sending_queue.sizer,
    "bytes",
  );
  assertEqual(
    config.exporters["otlphttp/openobserve-bodies"].sending_queue.queue_size,
    "${env:NEUROLINK_OTEL_BODY_QUEUE_BYTES:-268435456}",
  );
  let available = false;
  let outageAttempts = 0;
  const delivered = new Set<string>();
  const deliveredStreams = new Map<string, string | string[] | undefined>();
  const backend = createServer(async (request, response) => {
    const buffers: Buffer[] = [];
    for await (const chunk of request) {
      buffers.push(chunk);
    }
    if (!available) {
      outageAttempts++;
      response.writeHead(503).end();
      return;
    }
    const { gunzipSync } = await import("node:zlib");
    const buffer = Buffer.concat(buffers);
    const decoded =
      request.headers["content-encoding"] === "gzip"
        ? gunzipSync(buffer)
        : buffer;
    const payload = JSON.parse(decoded.toString());
    for (const resource of payload.resourceLogs ?? []) {
      for (const scope of resource.scopeLogs ?? []) {
        for (const record of scope.logRecords ?? []) {
          delivered.add(record.body?.stringValue);
          deliveredStreams.set(
            record.body?.stringValue,
            request.headers["stream-name"],
          );
        }
      }
    }
    response.writeHead(200, { "content-type": "application/json" }).end("{}");
  });
  await new Promise<void>((resolve) => backend.listen(0, "127.0.0.1", resolve));
  const backendAddress = backend.address();
  assert(backendAddress && typeof backendAddress !== "string");
  async function freePort() {
    const server = createServer();
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const address = server.address();
    assert(address && typeof address !== "string");
    await new Promise<void>((resolve) => server.close(() => resolve()));
    assert(
      ![55669, 54200, 14318, 14319, 14333, 14388].includes(address.port),
      "refuse production fixture port",
    );
    return address.port;
  }
  const metadataPort = await freePort(),
    bodiesPort = await freePort(),
    healthPort = await freePort(),
    metricsPort = await freePort();
  const env = {
    ...process.env,
    NEUROLINK_OTEL_METADATA_LISTEN: `127.0.0.1:${metadataPort}`,
    NEUROLINK_OTEL_BODIES_LISTEN: `127.0.0.1:${bodiesPort}`,
    NEUROLINK_OTEL_HEALTH_LISTEN: `127.0.0.1:${healthPort}`,
    NEUROLINK_OTEL_METRICS_PORT: String(metricsPort),
    NEUROLINK_OTEL_QUEUE_DIRECTORY: join(directory, "queue"),
    NEUROLINK_OTEL_COMPACTION_DIRECTORY: join(directory, "compact"),
    NEUROLINK_OPENOBSERVE_OTLP_ENDPOINT: `http://127.0.0.1:${backendAddress.port}/api/fixture`,
    NEUROLINK_OPENOBSERVE_BASIC_AUTH: "Basic fixture",
    NEUROLINK_PROXY_STREAM_HEADER: "fixture_metadata",
    NEUROLINK_PROXY_BODY_STREAM_HEADER: "fixture_bodies",
  };
  const stage = join(directory, "stage");
  const sourceConfig = join(directory, "existing.yaml");
  const stagedProfile = join(stage, "collector.yaml");
  let diagnostic = "";
  let collector: ReturnType<typeof spawn> | undefined;
  const start = () => {
    collector = spawn(binary, ["--config", stagedProfile], {
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    collector.stdout?.on("data", (buffer: Buffer) => {
      diagnostic = (diagnostic + buffer.toString()).slice(-4000);
    });
    collector.stderr?.on("data", (buffer: Buffer) => {
      diagnostic = (diagnostic + buffer.toString()).slice(-4000);
    });
  };
  const healthy = async () => {
    if (collector?.exitCode !== null) {
      throw new Error(`isolated collector exited: ${diagnostic}`);
    }
    try {
      return (
        await fetch(`http://127.0.0.1:${healthPort}/`, {
          signal: AbortSignal.timeout(500),
        })
      ).ok;
    } catch {
      return false;
    }
  };
  const killOwned = async () => {
    if (
      !collector ||
      collector.exitCode !== null ||
      collector.signalCode !== null
    ) {
      return;
    }
    const exited = once(collector, "exit");
    collector.kill("SIGKILL");
    await exited;
  };
  try {
    await writeFile(
      sourceConfig,
      yaml.dump({
        receivers: {
          otlp: {
            protocols: {
              http: { endpoint: env.NEUROLINK_OTEL_METADATA_LISTEN },
            },
          },
        },
        exporters: {
          "otlphttp/openobserve": {
            endpoint: env.NEUROLINK_OPENOBSERVE_OTLP_ENDPOINT,
            headers: {
              Authorization: env.NEUROLINK_OPENOBSERVE_BASIC_AUTH,
              "stream-name": env.NEUROLINK_PROXY_STREAM_HEADER,
            },
          },
        },
        extensions: {
          health_check: { endpoint: env.NEUROLINK_OTEL_HEALTH_LISTEN },
        },
        service: {
          telemetry: {
            metrics: {
              readers: [
                {
                  pull: {
                    exporter: {
                      prometheus: { host: "127.0.0.1", port: metricsPort },
                    },
                  },
                },
              ],
            },
          },
        },
      }),
      { mode: 0o600 },
    );
    const prepared = await runCLI([
      "telemetry",
      "native-prepare",
      "--collector-config",
      sourceConfig,
      "--output",
      stage,
      "--queue-directory",
      env.NEUROLINK_OTEL_QUEUE_DIRECTORY,
      "--compaction-directory",
      env.NEUROLINK_OTEL_COMPACTION_DIRECTORY,
      "--body-port",
      String(bodiesPort),
      "--body-stream",
      env.NEUROLINK_PROXY_BODY_STREAM_HEADER,
    ]);
    assertEqual(prepared.exitCode, 0, prepared.stderr);
    const validated = await runCLI([
      "telemetry",
      "native-validate",
      "--directory",
      stage,
      "--collector-bin",
      binary,
    ]);
    assertEqual(validated.exitCode, 0, validated.stderr);
    Object.assign(
      env,
      JSON.parse(await readFile(join(stage, "collector.env.json"), "utf8")),
    );
    start();
    await until(healthy, 20000);
    for (const [port, marker] of [
      [metadataPort, "persist-metadata"],
      [bodiesPort, "persist-body"],
    ] as const) {
      const result = await fetch(`http://127.0.0.1:${port}/v1/logs`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          resourceLogs: [
            {
              scopeLogs: [
                {
                  logRecords: [
                    {
                      timeUnixNano: String(BigInt(Date.now()) * 1000000n),
                      body: { stringValue: marker },
                    },
                  ],
                },
              ],
            },
          ],
        }),
      });
      assertEqual(
        result.status,
        200,
        "collector did not persistently acknowledge fixture",
      );
    }
    await until(() => outageAttempts >= 2);
    await killOwned();
    available = true;
    start();
    await until(healthy, 20000);
    await until(
      () => delivered.has("persist-metadata") && delivered.has("persist-body"),
      15000,
    );
    assertEqual(delivered.size, 2);
    assertEqual(deliveredStreams.get("persist-metadata"), "fixture_metadata");
    assertEqual(deliveredStreams.get("persist-body"), "fixture_bodies");
    await writeFile(
      join(directory, "verification.json"),
      JSON.stringify({ delivered: [...delivered], outageAttempts }),
    );
  } finally {
    await killOwned();
    backend.closeAllConnections();
    await new Promise<void>((resolve) => backend.close(() => resolve()));
    await rm(directory, { recursive: true, force: true });
  }
});
await test("shipped dashboard SQL counts client outcomes once and retains only owned token usage", async () => {
  const dashboard = JSON.parse(
    await readFile(
      new URL(
        "../docs/assets/dashboards/neurolink-proxy-observability-dashboard.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const db = new DatabaseSync(":memory:");
  try {
    db.exec(`CREATE TABLE neurolink_proxy (
      request_id TEXT, http_method TEXT, proxy_record_kind TEXT,
      proxy_accounting_scope TEXT, proxy_usage_owner_request_id TEXT,
      ai_input_tokens INTEGER, ai_cache_creation_tokens INTEGER,
      ai_cache_read_tokens INTEGER, ai_input_includes_cached_tokens INTEGER,
      ai_output_tokens INTEGER, is_error INTEGER,
      _timestamp INTEGER DEFAULT 1000, service_instance_id TEXT DEFAULT 'fixture',
      proxy_event_id TEXT, body TEXT, ai_pricing_status TEXT,
      ai_cost_api_equivalent_usd REAL, ai_cost_cache_savings_usd REAL,
      ai_model TEXT DEFAULT 'fixture'
    )`);
    const insert = db.prepare(
      "INSERT INTO neurolink_proxy (request_id,http_method,proxy_record_kind,proxy_accounting_scope,proxy_usage_owner_request_id,ai_input_tokens,ai_cache_creation_tokens,ai_cache_read_tokens,ai_input_includes_cached_tokens,ai_output_tokens,is_error) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    );
    // Deliberately retain duplicate parent usage: the designated owner is the
    // authoritative accounting boundary even for a malformed historical row.
    insert.run(
      "parent",
      "POST",
      "request_final",
      "client",
      "child",
      8000000,
      0,
      6000000,
      1,
      2000,
      1,
    );
    insert.run(
      "child",
      "POST",
      "request_final",
      "internal",
      "child",
      8000000,
      0,
      6000000,
      1,
      2000,
      0,
    );
    db.exec(`UPDATE neurolink_proxy SET proxy_event_id=request_id || proxy_record_kind, body=request_id || proxy_record_kind, ai_pricing_status='exact', ai_cost_api_equivalent_usd=1.5, ai_cost_cache_savings_usd=0.3;
      INSERT INTO neurolink_proxy SELECT request_id,http_method,proxy_record_kind,proxy_accounting_scope,proxy_usage_owner_request_id,ai_input_tokens,ai_cache_creation_tokens,ai_cache_read_tokens,ai_input_includes_cached_tokens,ai_output_tokens,is_error,_timestamp+500,service_instance_id,proxy_event_id,body,ai_pricing_status,ai_cost_api_equivalent_usd,ai_cost_cache_savings_usd,ai_model FROM neurolink_proxy`);
    insert.run(
      "parent",
      "POST",
      "lifecycle",
      "client",
      "child",
      null,
      null,
      null,
      null,
      null,
      0,
    );
    const queries = new Map<string, string>();
    const collect = (value: unknown): void => {
      if (Array.isArray(value)) {
        value.forEach(collect);
      } else if (value && typeof value === "object") {
        const item = value as Record<string, unknown>;
        if (typeof item.id === "string" && Array.isArray(item.queries)) {
          const query = item.queries[0]?.query;
          if (typeof query === "string") {
            queries.set(item.id, query);
          }
        }
        Object.values(item).forEach(collect);
      }
    };
    collect(dashboard);
    for (const [id, expected] of [
      ["Panel_0001", 1],
      ["Panel_0002", 8],
      ["Panel_0003", 2],
      ["Panel_0004", 100],
      ["Panel_cost_01", 1.5],
      ["Panel_cost_02", 1.5],
      ["Panel_cost_03", 0.3],
      ["Panel_cost_08", 0],
    ] as const) {
      const query = queries.get(id);
      assert(query, `missing dashboard query ${id}`);
      assertEqual(db.prepare(query).get()?.y_axis_1, expected, id);
    }
    db.exec(
      "UPDATE neurolink_proxy SET ai_pricing_status='inferred', ai_cost_api_equivalent_usd=NULL, ai_cost_cache_savings_usd=NULL WHERE request_id='child'",
    );
    assertEqual(
      db.prepare(queries.get("Panel_cost_01")!).get()?.y_axis_1,
      null,
      "unknown pricing was represented as zero or invented model rates",
    );
    assertEqual(
      db.prepare(queries.get("Panel_cost_08")!).get()?.y_axis_1,
      1,
      "unpriced provider usage or export dedup was lost",
    );
    // Quarantine contradictory copies from aggregates and expose the conflict
    // instead of choosing a winner or counting both copies as client requests.
    db.exec(
      "UPDATE neurolink_proxy SET body='conflicting-payload' WHERE request_id='parent' AND proxy_record_kind='request_final' AND _timestamp=1500",
    );
    assertEqual(
      db.prepare(queries.get("Panel_0001")!).get()?.y_axis_1,
      0,
      "conflicting producer payload contaminated request totals",
    );
    assertEqual(
      db.prepare(queries.get("Panel_integrity_conflicts")!).get()?.y_axis_1,
      1,
      "conflicting producer event was not reported",
    );
  } finally {
    db.close();
  }
});
await test("OTLP request finals emit exact price-table estimates and explicit unpriced provenance", async () => {
  await withCollector(200, async (batches) => {
    initRequestLogger(true);
    const base: RequestLogEntry = {
      timestamp: new Date().toISOString(),
      requestId: "priced-exact",
      method: "POST",
      path: "/backend-api/codex/responses",
      model: "gpt-4o",
      provider: "openai",
      stream: false,
      toolCount: 0,
      account: "fixture",
      accountType: "codex",
      responseStatus: 200,
      responseTimeMs: 10,
      inputTokens: 1000000,
      outputTokens: 100000,
      cacheReadTokens: 600000,
      inputIncludesCachedTokens: true,
    };
    try {
      for (const record of [
        base,
        { ...base, requestId: "priced-prefix", model: "gpt-4o-unknown-suffix" },
        {
          ...base,
          requestId: "priced-missing",
          model: "entirely-unknown-model",
        },
        { ...base, requestId: "priced-partial", outputTokens: undefined },
        {
          ...base,
          requestId: "priced-parent",
          usageOwnerRequestId: "priced-exact",
        },
      ]) {
        await logRequest(record);
      }
      await flushRequestLogs();
      await flushProxyOtelLogs();
      const records = batches
        .flat()
        .map((row) => {
          const body = row.body as { stringValue: string };
          return JSON.parse(body.stringValue) as RequestLogEntry;
        })
        .filter((row) => row.requestId?.startsWith("priced-"));
      const byId = new Map(records.map((row) => [row.requestId, row]));
      const exact = byId.get("priced-exact")!;
      assertEqual(exact.pricingStatus, "exact");
      assertEqual(exact.pricingBasis, "api_price_table");
      assertEqual(exact.apiEquivalentCostUsd, 2.375);
      assertEqual(exact.apiEquivalentCacheSavingsUsd, 1.125);
      for (const [id, status] of [
        ["priced-prefix", "inferred"],
        ["priced-missing", "unavailable"],
        ["priced-partial", "usage_incomplete"],
        ["priced-parent", "owned_by_child"],
      ] as const) {
        assertEqual(byId.get(id)?.pricingStatus, status, id);
        assertEqual(byId.get(id)?.apiEquivalentCostUsd, null, id);
      }
    } finally {
      initRequestLogger(false);
    }
  });
});
await test("indexed final outcomes preserve semantic failures after HTTP 200", async () => {
  await withCollector(200, async (batches) => {
    initRequestLogger(true);
    const base: RequestLogEntry = {
      timestamp: new Date().toISOString(),
      requestId: "semantic-error",
      method: "POST",
      path: "/v1/messages",
      model: "fixture",
      stream: true,
      toolCount: 0,
      account: "fixture",
      accountType: "anthropic",
      responseStatus: 200,
      responseTimeMs: 10,
    };
    try {
      await logRequest({ ...base, errorType: "stream_error" });
      await logRequest({
        ...base,
        requestId: "semantic-terminal",
        terminalOutcome: "client_cancelled",
      });
      await logRequest({
        ...base,
        requestId: "semantic-created",
        responseStatus: 201,
      });
      await flushRequestLogs();
      await flushProxyOtelLogs();
      for (const id of [
        "semantic-error",
        "semantic-terminal",
        "semantic-created",
      ]) {
        const record = batches.flat().find((row) => {
          const body = row.body as { stringValue: string };
          return JSON.parse(body.stringValue).requestId === id;
        });
        assert(record, `missing ${id}`);
        const attrs = record.attributes as Array<{
          key: string;
          value: { boolValue?: boolean };
        }>;
        const succeeded = id === "semantic-created";
        assertEqual(
          attrs.find((attr) => attr.key === "is_error")?.value.boolValue,
          !succeeded,
          id,
        );
        assertEqual(
          attrs.find((attr) => attr.key === "is_success")?.value.boolValue,
          succeeded,
          id,
        );
        assertEqual(record.severityText, succeeded ? "INFO" : "ERROR", id);
      }
    } finally {
      initRequestLogger(false);
    }
  });
});
await test("recorded bridge analysis separates client outcomes from internal usage owners", async () => {
  const directory = await mkdtemp(join(tmpdir(), "proxy-owner-analysis-"));
  const timestamp = "2026-09-19T01:00:00.000Z";
  const common = {
    timestamp,
    schemaVersion: 1,
    processInstanceId: "bridge-accounting",
    method: "POST",
    path: "/v1/chat/completions",
  };
  const lifecycle = [
    { ...common, requestId: "parent", sequence: 1, event: "request_accepted" },
    { ...common, requestId: "child", sequence: 2, event: "request_accepted" },
    {
      ...common,
      requestId: "parent",
      sequence: 3,
      event: "response_headers",
      elapsedMs: 20,
    },
    {
      ...common,
      requestId: "child",
      sequence: 4,
      event: "response_headers",
      elapsedMs: 10,
    },
    {
      ...common,
      requestId: "parent",
      sequence: 5,
      event: "request_terminal",
      terminalOutcome: "client_cancelled",
      responseStatus: 499,
      elapsedMs: 80,
      errorType: "client_cancelled",
    },
    // Scope arrives in the final stream, after this lifecycle row is read.
    {
      ...common,
      requestId: "child",
      sequence: 6,
      event: "request_terminal",
      terminalOutcome: "handler_error",
      responseStatus: 502,
      elapsedMs: 40,
      errorType: "upstream_error",
      errorCode: "child_failure",
    },
  ];
  const finals = [
    {
      ...common,
      requestId: "parent",
      accountingScope: "client",
      usageOwnerRequestId: "child",
      responseStatus: 499,
      responseTimeMs: 80,
      firstUsefulOutputMs: 30,
      errorType: "client_cancelled",
      inputTokens: 8000000,
      outputTokens: 2000,
      cacheReadTokens: 6000000,
      inputIncludesCachedTokens: true,
    },
    {
      ...common,
      requestId: "child",
      accountingScope: "internal",
      parentRequestId: "parent",
      usageOwnerRequestId: "child",
      responseStatus: 502,
      responseTimeMs: 40,
      firstUsefulOutputMs: 15,
      errorType: "upstream_error",
      inputTokens: 8000000,
      outputTokens: 2000,
      cacheReadTokens: 6000000,
      inputIncludesCachedTokens: true,
    },
  ];
  try {
    for (const [name, records] of [
      ["proxy-lifecycle-2026-09-19.jsonl", lifecycle],
      ["proxy-2026-09-19.jsonl", finals],
    ] as const) {
      await writeFile(
        join(directory, name),
        records.map((row) => JSON.stringify(row)).join("\n") + "\n",
      );
    }
    const report = await analyzeProxyLogs({
      logsDir: directory,
      since: "2026-09-19T00:00:00Z",
      nowMs: Date.parse("2026-09-19T02:00:00Z"),
    });
    assertEqual(report.requests.completed, 1);
    assertEqual(report.requests.internalCompleted, 1);
    assertEqual(report.requests.errors, 1);
    assertEqual(report.lifecycle.accepted, 1);
    assertEqual(report.lifecycle.internalAccepted, 1);
    assertEqual(report.lifecycle.terminal, 1);
    assertEqual(report.lifecycle.internalTerminal, 1);
    assert.deepEqual(report.lifecycle.terminalOutcomes, {
      client_cancelled: 1,
    });
    assert.deepEqual(report.lifecycle.errorTypes, { client_cancelled: 1 });
    assert.deepEqual(report.lifecycle.errorCodes, {});
    assertEqual(report.cache.requestsWithUsage, 1);
    assertEqual(report.cache.inputTokens, 2000000);
    assertEqual(report.cache.cacheReadTokens, 6000000);
    assertEqual(report.cache.outputTokens, 2000);
    for (const key of [
      "headers",
      "terminal",
      "finalRequest",
      "firstUsefulOutput",
    ] as const) {
      assertEqual(
        report.latencyMs[key].count,
        1,
        `internal ${key} biased client latency`,
      );
    }
    assertEqual(report.dataQuality.acceptedWithoutFinal, 0);
    assertEqual(report.dataQuality.terminalWithoutFinal, 0);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

await test("HTTP 200 partial, malformed and empty responses never acknowledge either queue or replay accepted subsets", async () => {
  const responses = [
    '{"partialSuccess":{"rejectedLogRecords":"1","errorMessage":"private collector detail"}}',
    '{"partialSuccess":{"rejectedLogRecords":1}}',
    '{"partial_success":{"rejected_log_records":"1","error_message":"private collector detail"}}',
    '{"partialSuccess":{"rejectedLogRecords":"0","rejected_log_records":"1"}}',
    '{"partialSuccess":{},"partial_success":{"rejected_log_records":"1"}}',
    '{"error":"private collector detail"}',
    '{"partialSuccess":{"rejectedLogs":"1"}}',
    '{"partialSuccess":{"rejectedLogRecords":"invalid"}}',
    '{"partialSuccess":[]}',
    '{"partialSuccess":{"errorMessage":5}}',
    "{",
    "",
    "null",
    "[]",
    "x".repeat(65537),
  ];
  for (const [index, responseBody] of responses.entries()) {
    await withCollector(
      200,
      async (batches) => {
        emitProxyOtelEvent("lifecycle", {
          requestId: `metadata-${index}`,
          event: "request_terminal",
        });
        const body = publish(`response-${index}`);
        await flushProxyOtelLogs();
        const result = await body;
        assertEqual(result.status, "export_unconfirmed");
        assertEqual(result.acknowledgedChunks, 0);
        const snapshot = getProxyOtelLogSnapshot();
        for (const queue of snapshot.queues.filter((candidate) =>
          ["metadata", "bodies"].includes(candidate.kind),
        )) {
          assertEqual(queue.transportAcknowledged, 0);
          assertEqual(queue.exportUnconfirmed, 1);
          assertEqual(queue.outstanding, 0);
          assertEqual(queue.recentFailures.length, 1);
          assert(
            !JSON.stringify(queue.recentFailures).includes(
              "private collector detail",
            ),
          );
        }
        const diagnostics = snapshot.queues.find(
          (queue) => queue.kind === "diagnostics",
        );
        assertEqual(diagnostics?.transportAcknowledged, 0);
        assertEqual(diagnostics?.exportUnconfirmed, 0);
        assertEqual(
          batches.length,
          2,
          "known partial or invalid response was retried",
        );
      },
      { responseBody },
    );
  }
});

await test("valid OTLP JSON full success and zero-rejection warnings acknowledge both queues", async () => {
  for (const responseBody of [
    "{}",
    '{"partialSuccess":{}}',
    '{"partial_success":{"rejected_log_records":"0","error_message":"collector warning"}}',
    '{"partialSuccess":{"rejectedLogRecords":"0","errorMessage":"collector warning"}}',
  ]) {
    await withCollector(
      200,
      async () => {
        emitProxyOtelEvent("lifecycle", {
          requestId: "metadata-accepted",
          event: "request_terminal",
        });
        const body = publish("accepted");
        await flushProxyOtelLogs();
        assertEqual((await body).status, "transport_acknowledged");
        const queues = getProxyOtelLogSnapshot().queues;
        for (const queue of queues.filter((candidate) =>
          ["metadata", "bodies"].includes(candidate.kind),
        )) {
          assertEqual(queue.transportAcknowledged, 1);
          assertEqual(queue.exportUnconfirmed, 0);
        }
        assertEqual(
          queues.find((queue) => queue.kind === "diagnostics")
            ?.transportAcknowledged,
          0,
        );
      },
      { responseBody },
    );
  }
});

await test("transient retries preserve identical serialized event IDs in metadata and body queues", async () => {
  const attempts = new Map<string, number>();
  const payloads = new Map<string, string[]>();
  const keyFor = (records: Array<Record<string, unknown>>) =>
    JSON.stringify(records[0].attributes);
  await withCollector(
    (batch) => {
      const key = keyFor(batch);
      const attempt = (attempts.get(key) ?? 0) + 1;
      attempts.set(key, attempt);
      const recorded = payloads.get(key) ?? [];
      recorded.push(JSON.stringify(batch));
      payloads.set(key, recorded);
      return attempt === 1 ? 503 : 200;
    },
    async (batches) => {
      emitProxyOtelEvent("lifecycle", {
        requestId: "metadata-retry",
        event: "request_terminal",
      });
      const body = publish("retry-capture");
      await flushProxyOtelLogs();
      assertEqual((await body).status, "transport_acknowledged");
      assertEqual(batches.length, 4);
      assertEqual(attempts.size, 2);
      for (const [key, count] of attempts) {
        assertEqual(count, 2);
        assert(
          key.includes("proxy.event_id"),
          "retry has no stable event identity",
        );
        const copies = payloads.get(key)!;
        assertEqual(copies[0], copies[1], "retry payload was re-created");
      }
      const queues = getProxyOtelLogSnapshot().queues;
      for (const queue of queues.filter((candidate) =>
        ["metadata", "bodies"].includes(candidate.kind),
      )) {
        assertEqual(queue.transportAcknowledged, 1);
        assertEqual(queue.exportUnconfirmed, 0);
      }
      assertEqual(
        queues.find((queue) => queue.kind === "diagnostics")
          ?.transportAcknowledged,
        0,
      );
    },
    { responseHeaders: { "retry-after": "0" } },
  );
});

await test("OTLP headers and gzip settings survive the response-aware transport", async () => {
  const wires: Buffer[] = [];
  await withCollector(
    200,
    async () => {
      assertEqual(
        (await publish("compressed")).status,
        "transport_acknowledged",
      );
      assertEqual(wires.length, 1);
      assert(gunzipSync(wires[0]).includes(Buffer.from("compressed")));
    },
    {
      env: {
        OTEL_EXPORTER_OTLP_COMPRESSION: "gzip",
        OTEL_EXPORTER_OTLP_LOGS_COMPRESSION: "gzip",
        OTEL_EXPORTER_OTLP_HEADERS: "x-generic=retained,x-shared=generic",
        OTEL_EXPORTER_OTLP_LOGS_HEADERS:
          "x-shared=logs,x-encoded=space%20value",
      },
      observe(request, raw) {
        assertEqual(request.headers["content-type"], "application/json");
        assertEqual(request.headers["content-encoding"], "gzip");
        assertEqual(request.headers["x-generic"], "retained");
        assertEqual(request.headers["x-shared"], "logs");
        assertEqual(request.headers["x-encoded"], "space value");
        wires.push(raw);
      },
    },
  );
});

await test("Retry-After beyond the export deadline fails promptly without retry or false acknowledgement", async () => {
  const started = performance.now();
  await withCollector(
    429,
    async (batches) => {
      const result = await publish("retry-after-deadline");
      assertEqual(result.status, "export_unconfirmed");
      assertEqual(batches.length, 1);
      assertEqual(
        getProxyOtelLogSnapshot().queues.find(
          (queue) => queue.kind === "bodies",
        )!.transportAcknowledged,
        0,
      );
    },
    { responseHeaders: { "retry-after": "3600" } },
  );
  assert(
    performance.now() - started < 5000,
    "Retry-After escaped the export deadline",
  );
});

await test("interrupted and endless HTTP 200 responses stay unconfirmed and obey a total transport deadline", async () => {
  for (const mode of ["interrupted", "endless"] as const) {
    let requests = 0;
    const server = createServer(async (request, response) => {
      for await (const _chunk of request) {
        /* consume request */
      }
      requests++;
      response.writeHead(200, { "content-type": "application/json" });
      response.write('{"partialSuccess":');
      const timer = setTimeout(() => {
        if (mode === "interrupted") {
          response.destroy();
        } else {
          response.write(" ");
        }
      }, 10);
      response.on("close", () => clearTimeout(timer));
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const address = server.address();
    assert(address && typeof address !== "string");
    const transport = createProxyOtlpLogTransport(
      `http://127.0.0.1:${address.port}/v1/logs`,
      500,
    );
    const results: ExportResult[] = [];
    const loggerProvider = new LoggerProvider({
      processors: [
        new SimpleLogRecordProcessor({
          export(records, callback) {
            transport.export(records, (result) => {
              results.push(result);
              callback(result);
            });
          },
          shutdown: () => transport.shutdown(),
        }),
      ],
    });
    const started = performance.now();
    try {
      loggerProvider.getLogger("deadline-fixture").emit({ body: mode });
      await loggerProvider.forceFlush();
      await until(() => results.length === 1, 3000);
      assertEqual(results.length, 1);
      assertEqual(results[0].code, ExportResultCode.FAILED);
      assertEqual(
        getProxyOtlpRetryAfter(results[0].error),
        undefined,
        "ambiguous HTTP 200 response was classified as retryable",
      );
      assertEqual(
        requests,
        1,
        "ambiguous partial HTTP 200 response was replayed",
      );
      assert(
        performance.now() - started < 3000,
        "response escaped total deadline",
      );
    } finally {
      await loggerProvider.shutdown();
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  }
});

await test("repeated Retry-After zero cannot create a retry storm", async () => {
  const receivedAt: number[] = [];
  await withCollector(
    503,
    async (batches) => {
      const result = await publish("retry-pressure");
      assertEqual(result.status, "export_unconfirmed");
      assertEqual(batches.length, 5, "transport attempt bound changed");
      for (let index = 1; index < receivedAt.length; index++) {
        assert(
          receivedAt[index] - receivedAt[index - 1] >= 750,
          "Retry-After zero bypassed exponential backoff",
        );
      }
    },
    {
      responseHeaders: { "retry-after": "0" },
      observe() {
        receivedAt.push(performance.now());
      },
    },
  );
});

await test("identical redacted phases share one acknowledged body and reconstruct Unicode and tools", async () => {
  await withCollector(200, async (batches) => {
    const policy = createProxyBodyCapturePolicy();
    const body = {
      messages: [{ role: "user", content: "नमस्ते 🌍" }],
      tools: [{ name: "lookup", input_schema: { type: "object" } }],
      api_key: "private-original",
    };
    const unchanged = JSON.stringify(body);
    const entries = [
      { requestId: "same-request", phase: "client_request", body },
      { requestId: "same-request", phase: "upstream_request", body },
      {
        requestId: "same-request",
        phase: "upstream_request",
        body: { ...body, model: "transformed-model" },
      },
      { requestId: "different-request", phase: "client_request", body },
    ].map((entry) => ({
      ...entry,
      timestamp: new Date().toISOString(),
      captureId: randomUUID(),
      model: "fixture",
      stream: true,
    }));
    const stored = await Promise.all(
      entries.map(
        async (entry) => (await processProxyBodyCapture(entry, null)).stored,
      ),
    );
    const outcomes = await Promise.all(
      entries.map((entry, i) =>
        policy.publish(entry, stored[i], () =>
          publish(entry.captureId, stored[i].redactedBody),
        ),
      ),
    );
    assertEqual(outcomes[0].delivery?.status, "transport_acknowledged");
    assertEqual(outcomes[1].delivery?.status, "reference");
    assertEqual(outcomes[2].delivery?.status, "transport_acknowledged");
    assertEqual(outcomes[3].delivery?.status, "transport_acknowledged");
    assertEqual(batches.flat().length, 3);
    assertEqual(JSON.stringify(body), unchanged, "inference input changed");
    assertEqual(policy.snapshot().deduplicatedCaptures, 1);
    assertEqual(
      policy.snapshot().deduplicatedBytes,
      stored[1].redactedBodyBytes,
    );
    const index = {
      ...entries[1],
      ...stored[1],
      bodyDelivery: outcomes[1].delivery,
      bodyReference: outcomes[1].reference,
    };
    const source = resolveProxyBodyCaptureTarget(index);
    assertEqual(source.captureId, entries[0].captureId);
    const rows = batches.flat().flatMap((record) => {
      const attributes = Object.fromEntries(
        (
          record.attributes as Array<{
            key: string;
            value: { stringValue?: string; intValue?: string };
          }>
        ).map((attribute) => [
          attribute.key.replaceAll(".", "_"),
          attribute.value.stringValue ?? attribute.value.intValue,
        ]),
      );
      if (attributes.body_capture_id !== source.captureId) {
        return [];
      }
      return [
        {
          ...attributes,
          _timestamp: 1,
          request_id: entries[0].requestId,
          body: (record.body as { stringValue: string }).stringValue,
        },
      ];
    });
    const reconstructed = reconstructProxyBodyCapture(index, rows);
    assert(reconstructed.verified);
    assertEqual(reconstructed.body, stored[1].redactedBody);
    assert(!reconstructed.body.includes("private-original"));
    assert(reconstructed.body.includes("नमस्ते 🌍"));
    assertEqual(reconstructProxyBodyCapture(index, []).verified, false);
    assertEqual(
      reconstructProxyBodyCapture(
        index,
        rows.map((row) => ({ ...row, request_id: "wrong-request" })),
      ).verified,
      false,
    );
    const directIndex = {
      ...entries[0],
      ...stored[0],
      bodyDelivery: outcomes[0].delivery,
    };
    assertEqual(
      reconstructProxyBodyCapture(
        directIndex,
        rows.map((row) => ({ ...row, request_id: "wrong-request" })),
      ).verified,
      false,
      "direct capture accepted chunks attributed to another request",
    );
    const requestConflict = reconstructProxyBodyCapture(directIndex, [
      ...rows,
      { ...rows[0], request_id: "wrong-request" },
    ]);
    assertEqual(
      requestConflict.verified,
      false,
      "changed request attribution was collapsed as an exact retry",
    );
    assert(
      requestConflict.identityConflicts.some(
        (conflict) => conflict.reason === "event_identity_conflict",
      ),
      "request attribution conflict was not reported",
    );
    assert.throws(
      () =>
        resolveProxyBodyCaptureTarget({
          ...index,
          bodyReference: { ...index.bodyReference, bodySha256: "0".repeat(64) },
        }),
      /conflicting body reference/,
    );
    assert.throws(
      () =>
        resolveProxyBodyCaptureTarget({
          ...index,
          bodyReference: { ...index.bodyReference, captureId: index.captureId },
        }),
      /conflicting body reference/,
    );
  });
});

await test("uncertain exports never become dedup references and a later acknowledged copy can", async () => {
  let exports = 0;
  await withCollector(
    () => (++exports === 1 ? 400 : 200),
    async () => {
      const policy = createProxyBodyCapturePolicy();
      const base = {
        timestamp: new Date().toISOString(),
        requestId: "uncertain",
        phase: "client_request",
        model: "fixture",
        stream: false,
        body: "same retained bytes",
      };
      const stored = (await processProxyBodyCapture(base, null)).stored;
      const entries = Array.from({ length: 3 }, () => ({
        ...base,
        captureId: randomUUID(),
      }));
      const results = await Promise.all(
        entries
          .slice(0, 2)
          .map((entry) =>
            policy.publish(entry, stored, () =>
              publish(entry.captureId, stored.redactedBody),
            ),
          ),
      );
      assertEqual(results[0].delivery?.status, "export_unconfirmed");
      assertEqual(results[1].delivery?.status, "transport_acknowledged");
      assertEqual(results[0].reference, undefined);
      assertEqual(results[1].reference, undefined);
      const third = await policy.publish(entries[2], stored, () =>
        publish(entries[2].captureId, stored.redactedBody),
      );
      assertEqual(third.delivery?.status, "reference");
      assertEqual(third.reference?.captureId, entries[1].captureId);
      assertEqual(exports, 2);
    },
  );
});

await test("body byte policy is explicit, charges unique bytes and refills without changing input", async () => {
  await withCollector(200, async () => {
    let now = 0;
    const base = {
      timestamp: new Date().toISOString(),
      requestId: "budgeted",
      phase: "client_request",
      model: "fixture",
      stream: false,
      body: "🌍bounded",
    };
    const stored = (await processProxyBodyCapture(base, null)).stored;
    const bytes = stored.redactedBodyBytes!;
    const policy = createProxyBodyCapturePolicy({
      bytesPerMinute: String(bytes),
      now: () => now,
    });
    const send = (requestId: string) => {
      const entry = { ...base, requestId, captureId: randomUUID() };
      return policy.publish(entry, stored, () =>
        publish(entry.captureId, stored.redactedBody),
      );
    };
    assertEqual(
      (await send("budgeted")).delivery?.status,
      "transport_acknowledged",
    );
    assertEqual((await send("budgeted")).delivery?.status, "reference");
    const omitted = await send("new-request");
    assertEqual(omitted.delivery?.status, "policy_excluded");
    assertEqual(omitted.delivery?.reason, "body_byte_budget_exhausted");
    assertEqual(policy.snapshot().submittedBytes, bytes);
    assertEqual(policy.snapshot().policyExcludedBytes, bytes);
    now = 60_000;
    assertEqual(
      (await send("new-request")).delivery?.status,
      "transport_acknowledged",
    );
    assertEqual(base.body, "🌍bounded");
    const invalid = createProxyBodyCapturePolicy({ bytesPerMinute: "invalid" });
    const outcome = await invalid.publish(
      { ...base, captureId: randomUUID() },
      stored,
      async () => {
        throw new Error("invalid policy published a body");
      },
    );
    assertEqual(outcome.delivery?.reason, "body_byte_budget_invalid");
    assertEqual(invalid.snapshot().invalidByteBudget, true);
  });
});

await test("dedup retention is bounded and expired or disabled entries export their own payload", async () => {
  // Fixed time and acknowledgments exercise eviction without sleeping for TTL.
  let now = 0;
  let exports = 0;
  const policy = createProxyBodyCapturePolicy({ now: () => now });
  const body = "fixed-redacted-payload";
  const stored = {
    redactedBody: body,
    bodySha256: createHash("sha256").update(body).digest("hex"),
    redactedBodyBytes: Buffer.byteLength(body),
  };
  const send = (requestId: string, active = policy) =>
    active.publish(
      {
        timestamp: new Date().toISOString(),
        requestId,
        captureId: randomUUID(),
        phase: "client_request",
        model: "fixture",
        stream: false,
      },
      stored,
      async () => {
        exports++;
        return {
          status: "transport_acknowledged",
          expectedChunks: 1,
          acknowledgedChunks: 1,
          unconfirmedChunks: 0,
          droppedChunks: 0,
        };
      },
    );
  for (let i = 0; i < 1100; i++) {
    await send(`request-${i}`);
  }
  assertEqual(policy.snapshot().references, 1024);
  assertEqual((await send("request-1099")).delivery?.status, "reference");
  now = 5 * 60_000;
  assertEqual(policy.snapshot().references, 0);
  assertEqual(
    (await send("request-1099")).delivery?.status,
    "transport_acknowledged",
  );
  const disabled = createProxyBodyCapturePolicy({ deduplicate: false });
  await send("disabled", disabled);
  assertEqual(
    (await send("disabled", disabled)).delivery?.status,
    "transport_acknowledged",
  );
  assertEqual(disabled.snapshot().references, 0);
  assertEqual(exports, 1103);
});

await runSuite();
