/** Read-only coverage checks for stored OTLP telemetry, without local log scanning. */
import { createHash } from "node:crypto";
import { queryProxyHistory } from "./query-proxy-history.mjs";
import {
  resolveProxyTelemetryBackend,
  queryProxyTelemetry,
  validateProxyTelemetryBackend,
} from "./proxy-telemetry-backend.mjs";

/** Empty traffic, unavailable evidence, and partial queries cannot become a green check.
 * @param {import("../../src/lib/types/index.js").ProxyTelemetryDoctorOptions} options
 */
export async function checkProxyTelemetry({
  backend,
  startTime,
  endTime,
  proxyUrl = "http://127.0.0.1:55669",
  maxRows = 10000,
  fetchImpl = fetch,
}) {
  validateProxyTelemetryBackend(backend);
  if (
    !Number.isSafeInteger(startTime) ||
    !Number.isSafeInteger(endTime) ||
    startTime < 0 ||
    startTime >= endTime ||
    !Number.isSafeInteger(maxRows) ||
    maxRows < 1 ||
    maxRows > 100000
  ) {
    throw new Error(
      "Provide an increasing microsecond time range and maxRows between 1 and 100000",
    );
  }
  const budget = { used: 0, limit: 512 };
  /** @type {import("../../src/lib/types/index.js").ProxyTelemetryCheck[]} */
  const checks = [];
  /** @type {unknown[]} */
  const queries = [];
  /** @param {string} name @param {import("../../src/lib/types/index.js").ProxyTelemetryCheck["status"]} status @param {unknown} evidence */
  const add = (name, status, evidence) =>
    checks.push({ name, status, evidence });
  /** @param {string} sql @param {string} signal @param {Partial<import("../../src/lib/types/index.js").ProxyTelemetryQueryOptions>} options */
  const query = async (sql, signal = "logs", options = {}) => {
    if (budget.used >= budget.limit) {
      throw new Error("Telemetry verification query budget reached");
    }
    budget.used++;
    const result = await queryProxyTelemetry(
      backend,
      { sql, signal, startTime, endTime, ...options },
      fetchImpl,
    );
    queries.push(result.query);
    return result.rows;
  };
  const endpoint = new URL("/status", proxyUrl);
  if (
    endpoint.username ||
    endpoint.password ||
    (!(
      ["localhost", "127.0.0.1", "[::1]"].includes(endpoint.hostname) &&
      endpoint.protocol === "http:"
    ) &&
      endpoint.protocol !== "https:")
  ) {
    throw new Error("Proxy diagnostics require HTTPS outside loopback");
  }
  const response = await fetchImpl(endpoint, {
    redirect: "error",
    signal: globalThis.AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    throw new Error(`Proxy status failed: HTTP ${response.status}`);
  }
  const runtime = await response.json(),
    logs = runtime.observability?.requestLogs;
  add(
    "runtime",
    runtime.ready && runtime.acceptingConnections ? "pass" : "fail",
    { pid: runtime.pid, version: runtime.version, ready: runtime.ready },
  );
  add(
    "otel_logging",
    logs?.otel?.initialized && logs.diskEnabled === false ? "pass" : "fail",
    { initialized: logs?.otel?.initialized, diskEnabled: logs?.diskEnabled },
  );
  /** @type {Array<{kind: string, dropped: number, exportUnconfirmed: number, outstanding: number, capacity: number, recentFailures?: unknown, failureHistoryEvicted?: number}>} */
  const failures = (logs?.otel?.queues ?? []).map(
    (
      /** @type {{kind: string, dropped: number, exportUnconfirmed: number, outstanding: number, capacity: number, recentFailures?: unknown, failureHistoryEvicted?: number}} */ q,
    ) => ({
      kind: q.kind,
      dropped: q.dropped,
      exportUnconfirmed: q.exportUnconfirmed,
      outstanding: q.outstanding,
      capacity: q.capacity,
      recentFailures: q.recentFailures,
      failureHistoryEvicted: q.failureHistoryEvicted,
    }),
  );
  add(
    "producer_delivery",
    ["metadata", "body"].every((kind) =>
      failures.some((q) => q.kind === kind),
    ) &&
      failures.every(
        (q) =>
          q.dropped === 0 &&
          q.exportUnconfirmed === 0 &&
          q.outstanding < q.capacity,
      )
      ? "pass"
      : "warn",
    failures,
  );
  add(
    "capture_admission",
    logs?.bodyCapture &&
      logs.bodyCapture.rejected === 0 &&
      logs.bodyCapture.failed === 0
      ? "pass"
      : "warn",
    logs?.bodyCapture ?? { status: "unavailable" },
  );
  for (const [signal, table] of [
    ["logs", backend.stream],
    ["traces", backend.stream],
    ["metrics", "proxy_requests_total"],
  ]) {
    const [value] = await query(
      `SELECT COUNT(*) AS records, MAX(_timestamp) AS latest FROM "${table}"`,
      signal,
    );
    add(
      `${signal}_freshness`,
      Number(value?.records) > 0 &&
        Number.isFinite(Number(value?.latest)) &&
        Number(value.latest) <= endTime &&
        (endTime - Number(value.latest)) / 1e6 <= 120
        ? "pass"
        : "unverified",
      {
        maxLagAtWindowEndSeconds: 120,
        records: value?.records ?? 0,
        latest: value?.latest,
        ageAtWindowEndSeconds: value?.latest
          ? (endTime - Number(value.latest)) / 1e6
          : null,
      },
    );
  }
  /** @type {Record<string, import("../../src/lib/types/index.js").ProxyTelemetryStoredRecord[]>} */
  const history = Object.create(null);
  for (const kind of ["request_final", "body_capture_index", "lifecycle"]) {
    const result = await queryProxyHistory({
      ...backend,
      startTime,
      endTime,
      kind,
      maxRows,
      fetchImpl,
      budget,
    });
    queries.push(...result.queries.map((q) => ({ ...q, kind })));
    history[kind] = result.records.map((row) => {
      if (typeof row.body !== "string") {
        throw new Error("Invalid stored metadata body");
      }
      const value = JSON.parse(row.body);
      if (
        !value ||
        typeof value !== "object" ||
        typeof value.requestId !== "string"
      ) {
        throw new Error("Stored telemetry metadata has an invalid schema");
      }
      return value;
    });
  }
  const finals = history.request_final,
    unique = new Set(finals.map((r) => r.requestId));
  add(
    "final_uniqueness",
    !finals.length
      ? "unverified"
      : unique.size === finals.length
        ? "pass"
        : "fail",
    { records: finals.length, uniqueRequestIds: unique.size },
  );
  const terminalEvents = history.lifecycle.filter(
    (row) => row.event === "request_terminal",
  );
  const missingFinals = terminalEvents.filter(
    (row) =>
      (row.telemetryStatus !== undefined &&
        row.telemetryStatus !== "complete") ||
      ((row.outcomeSource === "final_request" ||
        row.outcomeSource === undefined) &&
        !unique.has(row.requestId)),
  );
  add(
    "terminal_reconciliation",
    !terminalEvents.length
      ? "unverified"
      : missingFinals.length
        ? "fail"
        : "pass",
    {
      terminals: terminalEvents.length,
      incompleteOrMissingFinal: missingFinals.length,
      requestIds: missingFinals.slice(0, 50).map((row) => row.requestId),
      boundary:
        "Terminals inside the selected interval; admissions still in flight are not failures",
    },
  );
  /** @type {Record<string, import("../../src/lib/types/index.js").ProxyTelemetryFieldCoverage>} */
  const coverage = Object.create(null);
  for (const row of finals) {
    const group = (coverage[row.model ?? "unknown"] ??= {
      records: 0,
      traceMissing: 0,
      durationMissing: 0,
      outcomeMissing: 0,
      firstOutputUnexplained: 0,
    });
    group.records++;
    if (
      !/^[a-f0-9]{32}$/i.test(row.traceId ?? "") ||
      /^0+$/.test(row.traceId ?? "")
    ) {
      group.traceMissing++;
    }
    if (
      !Number.isFinite(row.responseTimeMs) ||
      (row.responseTimeMs ?? -1) < 0
    ) {
      group.durationMissing++;
    }
    if (
      ![
        "completed",
        "bodyless",
        "client_cancelled",
        "stream_error",
        "handler_error",
      ].includes(row.terminalOutcome ?? "")
    ) {
      group.outcomeMissing++;
    }
    const timing = row.firstUsefulOutputMs;
    const validTiming =
      Number.isFinite(timing) &&
      (timing ?? -1) >= 0 &&
      (timing ?? Infinity) <= (row.responseTimeMs ?? -1);
    const knownAbsent =
      row.firstUsefulOutputStatus === "no_useful_output" &&
      timing === undefined &&
      row.firstUsefulOutputEvent === undefined;
    const validAvailability =
      row.firstUsefulOutputStatus === undefined ||
      ["observed", "no_useful_output", "not_observed"].includes(
        row.firstUsefulOutputStatus,
      );
    if (
      !validAvailability ||
      (timing !== undefined && !validTiming) ||
      (row.firstUsefulOutputStatus === "observed" && !validTiming) ||
      (row.firstUsefulOutputStatus === "no_useful_output" && !knownAbsent) ||
      (row.terminalOutcome === "completed" &&
        !(validTiming && row.firstUsefulOutputStatus !== "not_observed") &&
        !knownAbsent)
    ) {
      group.firstOutputUnexplained++;
    }
  }
  add(
    "request_field_coverage",
    !finals.length
      ? "unverified"
      : Object.values(coverage).every(
            (g) =>
              g.traceMissing +
                g.durationMissing +
                g.outcomeMissing +
                g.firstOutputUnexplained ===
              0,
          )
        ? "pass"
        : "fail",
    coverage,
  );
  const indexes = history.body_capture_index;
  /** @type {Record<string, number>} */
  const byDelivery = Object.create(null);
  for (const row of indexes) {
    const status = row.bodyDelivery?.status ?? "missing";
    byDelivery[status] = (byDelivery[status] ?? 0) + 1;
  }
  const captureFailures = indexes.filter(
    (row) =>
      row.captureError ||
      row.bodyTruncated ||
      !["transport_acknowledged", "policy_excluded", "no_body"].includes(
        row.bodyDelivery?.status ?? "",
      ),
  );
  add(
    "capture_delivery",
    !indexes.length ? "unverified" : captureFailures.length ? "fail" : "pass",
    {
      records: indexes.length,
      byDelivery,
      failures: captureFailures.slice(0, 50).map((row) => ({
        requestId: row.requestId,
        captureId: row.captureId,
        phase: row.phase,
        captureError: row.captureError,
        captureAdmission: row.captureAdmission,
        bodyTruncated: row.bodyTruncated,
        bodyDelivery: row.bodyDelivery,
      })),
      failuresOmitted: Math.max(0, captureFailures.length - 50),
    },
  );
  const bodyChecks = [];
  for (const index of indexes
    .filter(
      (row) =>
        row.bodySha256 && row.bodyDelivery?.status === "transport_acknowledged",
    )
    .sort((a, b) => (b.redactedBodyBytes ?? 0) - (a.redactedBodyBytes ?? 0))
    .slice(0, 3)) {
    if (!/^[a-f0-9-]{36}$/i.test(index.captureId ?? "")) {
      throw new Error("Invalid capture identifier");
    }
    if (
      !Number.isSafeInteger(index.redactedBodyBytes) ||
      (index.redactedBodyBytes ?? -1) < 0 ||
      (index.redactedBodyBytes ?? 0) > 8 * 1024 * 1024
    ) {
      throw new Error("Capture verification exceeds the 8 MiB per-body bound");
    }
    const chunks = await query(
      `SELECT body_chunk_index, body_chunk_count, body FROM "${backend.stream}" WHERE proxy_record_kind='body' AND body_capture_id='${index.captureId}' ORDER BY body_chunk_index ASC`,
      "logs",
      {
        startTime: startTime - 120e6,
        endTime: Math.min(Date.now() * 1000, endTime + 120e6),
        size: 1000,
      },
    );
    if (chunks.length >= 1000) {
      throw new Error("Capture verification exceeded its chunk budget");
    }
    const bytes = chunks.reduce(
      (sum, r) =>
        sum +
        (typeof r.body === "string" ? Buffer.byteLength(r.body) : Infinity),
      0,
    );
    if (bytes > 8 * 1024 * 1024) {
      throw new Error("Stored capture exceeds the 8 MiB verification bound");
    }
    const raw = chunks.map((r) => r.body).join(""),
      expected = Number(chunks[0]?.body_chunk_count ?? 0);
    const contiguous = chunks.every(
      (row, i) =>
        Number(row.body_chunk_index) === i &&
        Number(row.body_chunk_count) === expected,
    );
    const actualSha256 = createHash("sha256").update(raw).digest("hex");
    bodyChecks.push({
      captureId: index.captureId,
      expectedChunks: expected,
      storedChunks: chunks.length,
      verified:
        expected > 0 &&
        expected === chunks.length &&
        contiguous &&
        Buffer.byteLength(raw) === index.redactedBodyBytes &&
        actualSha256 === index.bodySha256,
    });
  }
  add(
    "sample_body_integrity",
    !bodyChecks.length
      ? "unverified"
      : bodyChecks.every((r) => r.verified)
        ? "pass"
        : "fail",
    bodyChecks,
  );
  const traceIds = [
    ...new Set(
      finals
        .map((row) => row.traceId)
        .filter((id) => /^[a-f0-9]{32}$/i.test(id ?? "")),
    ),
  ].slice(-3);
  const correlated = traceIds.length
    ? await query(
        `SELECT trace_id, COUNT(*) AS spans FROM "${backend.stream}" WHERE trace_id IN (${traceIds.map((id) => `'${id}'`).join(",")}) GROUP BY trace_id`,
        "traces",
        {
          startTime: startTime - 120e6,
          endTime: Math.min(Date.now() * 1000, endTime + 120e6),
        },
      )
    : [];
  add(
    "sample_trace_correlation",
    !traceIds.length
      ? "unverified"
      : traceIds.every((id) =>
            correlated.some(
              (row) => row.trace_id === id && Number(row.spans) > 0,
            ),
          )
        ? "pass"
        : "fail",
    { requested: traceIds.length, found: correlated.length },
  );
  if (backend.collectorMetricsUrl) {
    const url = new URL(backend.collectorMetricsUrl);
    if (
      !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
      !["http:", "https:"].includes(url.protocol)
    ) {
      throw new Error("Collector diagnostics must use loopback HTTP(S)");
    }
    const metrics = await fetchImpl(url, {
      redirect: "error",
      signal: globalThis.AbortSignal.timeout(10000),
    });
    if (!metrics.ok) {
      throw new Error(`Collector diagnostics failed: HTTP ${metrics.status}`);
    }
    const counters = Object.fromEntries(
      (await metrics.text())
        .split("\n")
        .filter((line) =>
          /^otelcol_(exporter_(queue_size|sent|send_failed|enqueue_failed)|receiver_(refused|failed))/.test(
            line,
          ),
        )
        .map((line) => {
          const match = /^(\w+(?:\{.*\})?)\s+(\S+)(?:\s+\d+)?$/.exec(line);
          return [match?.[1] ?? "invalid_sample", Number(match?.[2])];
        }),
    );
    add(
      "collector_delivery",
      ["log_records", "spans", "metric_points"].every((signal) =>
        Object.keys(counters).some(
          (key) =>
            key.startsWith(`otelcol_exporter_send_failed_${signal}`) ||
            key.startsWith(`otelcol_exporter_sent_${signal}`),
        ),
      )
        ? Object.entries(counters).some(
            ([key, value]) =>
              !Number.isFinite(value) ||
              value < 0 ||
              (/^otelcol_(exporter_(send_failed|enqueue_failed)|receiver_(refused|failed))/.test(
                key,
              ) &&
                value > 0),
          )
          ? "warn"
          : "pass"
        : "unverified",
      {
        scope:
          "collector lifetime delivery/failure counters; absent failure series are not required when sent series identify that signal; queue_size is an instantaneous gauge and a nonzero queue alone is not a failure",
        counters,
      },
    );
  } else {
    add("collector_delivery", "unverified", {
      reason: "collector metrics endpoint not configured",
    });
  }
  return {
    schemaVersion: 1,
    checkedAt: new Date().toISOString(),
    startTime,
    endTimeExclusive: endTime,
    source: "OpenObserve query API over stored OTLP telemetry",
    completeQuery: true,
    status: checks.some((c) => c.status === "fail")
      ? "fail"
      : checks.some((c) => c.status !== "pass")
        ? "incomplete"
        : "pass",
    guarantee:
      "Coverage and bounded sample verification, not exactly-once or universal lossless delivery",
    checks,
    queries,
  };
}

/** Shipped CLI and repository doctor use the same implementation. */
export async function runProxyTelemetryDoctor() {
  const args = process.argv.slice(2);
  /** @param {string} name */
  const value = (name) => {
    const i = args.indexOf(name);
    return i < 0 ? undefined : args[i + 1];
  };
  if (args.includes("--help")) {
    console.log(
      "Usage: neurolink proxy telemetry doctor [--since ISO_DATE] [--until ISO_DATE] [--format json|text] [--proxy-url URL] [--max-rows 10000]",
    );
    return;
  }
  const until = value("--until")
    ? Date.parse(value("--until") ?? "")
    : Date.now() - 30000;
  const since = value("--since")
    ? Date.parse(value("--since") ?? "")
    : until - 15 * 60000;
  const report = await checkProxyTelemetry({
    backend: await resolveProxyTelemetryBackend(),
    startTime: since * 1000,
    endTime: until * 1000,
    proxyUrl: value("--proxy-url") ?? process.env.NEUROLINK_PROXY_URL,
    maxRows: Number(value("--max-rows") ?? 10000),
  });
  if (value("--format") === "json") {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`NeuroLink OTel coverage: ${report.status}`);
    for (const check of report.checks) {
      console.log(
        `${check.status.padEnd(10)} ${check.name}: ${JSON.stringify(check.evidence)}`,
      );
    }
  }
  if (report.status !== "pass") {
    process.exitCode = 1;
  }
}
