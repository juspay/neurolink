/** Determinism exception: recorded backend windows and contradictory bridge
 * links cannot be made repeatable using live model calls. These fixtures drive
 * the shipped doctor reconciliation and bounded history query implementation.
 * No proxy, collector, credentials, or external backend is contacted. */
import "./helpers/proxyTestIsolation.js";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { defineSuite } from "./helpers/harness.js";
const { test, runSuite } = defineSuite("Proxy Telemetry Reconciliation", {
  offline: true,
});
import {
  checkProxyTelemetry,
  reconcileProxyCaptureCoverage,
  reconcileProxyUsageOwnership,
} from "../scripts/observability/proxy-telemetry-check.mjs";
import { queryProxyHistory } from "../scripts/observability/query-proxy-history.mjs";
import type { ProxyTelemetryStoredRecord } from "../src/lib/types/index.js";

const parent: ProxyTelemetryStoredRecord = {
  requestId: "parent",
  accountingScope: "client",
  usageOwnerRequestId: "child",
  path: "/v1/chat/completions",
};
const child: ProxyTelemetryStoredRecord = {
  requestId: "child",
  accountingScope: "internal",
  parentRequestId: "parent",
  usageOwnerRequestId: "child",
  inputTokens: 13,
  outputTokens: 5,
  path: "/v1/messages",
};

await test("requires reciprocal observed parent and child finals", async () => {
  const report = reconcileProxyUsageOwnership([parent, child]);
  assert.equal(report.status, "pass");
  assert.equal(report.clientFinals, 1);
  assert.equal(report.internalFinals, 1);
  assert.equal(
    report.missingOwnerCount + report.missingParentCount + report.mismatchCount,
    0,
  );
});
await test("keeps missing selected-window owners and parents unverified", async () => {
  const ownerMissing = reconcileProxyUsageOwnership([parent]);
  assert.equal(ownerMissing.status, "unverified");
  assert.equal(ownerMissing.missingOwnerCount, 1);
  assert.ok(ownerMissing.boundary.includes("outside"));
  const parentMissing = reconcileProxyUsageOwnership([child]);
  assert.equal(parentMissing.status, "unverified");
  assert.equal(parentMissing.missingParentCount, 1);
});
for (const [index, invalid] of [
  { ...child, accountingScope: "client" as const },
  { ...child, parentRequestId: "unrelated" },
  { ...child, usageOwnerRequestId: "other-owner" },
  { ...child, parentRequestId: undefined },
].entries()) {
  await test(`fails contradictory ownership instead of choosing a link (${index})`, async () => {
    const report = reconcileProxyUsageOwnership([parent, invalid]);
    assert.equal(report.status, "fail");
    assert.ok(report.mismatchCount > 0);
  });
}
await test("rejects duplicate parent tokens and undesignated second children", async () => {
  assert.equal(
    reconcileProxyUsageOwnership([{ ...parent, inputTokens: 13 }, child])
      .status,
    "fail",
  );
  const extra = {
    ...child,
    requestId: "extra",
    usageOwnerRequestId: "extra",
  };
  assert.equal(
    reconcileProxyUsageOwnership([parent, child, extra]).status,
    "fail",
  );
});
await test("treats a linked final outside a bounded backend window as inconclusive", async () => {
  const rows = [
    {
      _timestamp: 100,
      proxy_event_id: "p",
      service_instance_id: "worker",
      request_id: "parent",
      body: JSON.stringify(parent),
    },
    {
      _timestamp: 50,
      proxy_event_id: "c",
      service_instance_id: "worker",
      request_id: "child",
      body: JSON.stringify(child),
    },
  ];
  let queries = 0;
  const history = await queryProxyHistory({
    baseUrl: "http://127.0.0.1:1",
    startTime: 80,
    endTime: 130,
    fetchImpl: async (_url, init) => {
      queries++;
      const { query } = JSON.parse(String(init?.body));
      return new Response(
        JSON.stringify({
          hits: rows.filter(
            (row) =>
              row._timestamp >= query.start_time &&
              row._timestamp <= query.end_time,
          ),
        }),
        { status: 200 },
      );
    },
  });
  assert.equal(queries, 1);
  assert.equal(history.complete, true);
  assert.equal(
    reconcileProxyUsageOwnership(
      history.records.map((row) => JSON.parse(String(row.body))),
    ).status,
    "unverified",
  );
});

const paths = [
  "/v1/messages",
  "/backend-api/codex/responses",
  "/v1/responses",
  "/v1/chat/completions",
  "/v1beta/models/gemini-fixture:generateContent",
  "/v1beta/models/gemini-fixture:streamGenerateContent",
];
const finals = paths.map((path, index) => ({
  requestId: `request-${index}`,
  path,
}));
const captures = finals.map((row) => ({
  requestId: row.requestId,
  phase: "client_response",
}));
for (const path of paths) {
  await test(`detects a missing capture on ${path} even with other covered traffic`, async () => {
    const missing = finals.find((row) => row.path === path)!;
    const report = reconcileProxyCaptureCoverage(
      finals,
      captures.filter((row) => row.requestId !== missing.requestId),
    );
    assert.equal(report.status, "fail");
    assert.equal(report.eligibleFinals, paths.length);
    assert.deepEqual(report.missing, [
      { requestId: missing.requestId, path, missingPhase: "client_response" },
    ]);
  });
}
await test("accepts explicit response outcomes and keeps unrelated auxiliary routes outside generation coverage", async () => {
  assert.equal(reconcileProxyCaptureCoverage(finals, captures).status, "pass");
  assert.equal(
    reconcileProxyCaptureCoverage(
      [
        { requestId: "model-list", path: "/v1/models" },
        { requestId: "count", path: "/v1/messages/count_tokens" },
        { requestId: "unknown-action", path: "/v1beta/models/model:unknown" },
      ],
      [],
    ).status,
    "unverified",
  );
  assert.equal(
    reconcileProxyCaptureCoverage(
      [parent],
      [{ requestId: "parent", phase: "client_request" }],
    ).status,
    "fail",
  );
});

/** Fake backend honors each actual doctor query window; no sockets are opened. */
function admissionFixture(
  rows: Array<{
    requestId: string;
    timestamp?: string;
    at?: string;
    recordedAtMicroseconds?: number;
    event: string;
    requestTimeoutMs?: number;
  }>,
) {
  const requests: Array<{ start_time: number; end_time: number }> = [];
  const contacts: string[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    contacts.push(String(input));
    if (new URL(String(input)).pathname === "/status") {
      return Response.json({ ready: true, acceptingConnections: true });
    }
    const { query } = JSON.parse(String(init?.body));
    requests.push(query);
    const hits = query.sql.includes("proxy_record_kind='lifecycle'")
      ? rows
          .map((row, sequence) => ({
            _timestamp:
              row.recordedAtMicroseconds ??
              Date.parse(row.timestamp ?? row.at ?? "") * 1000,
            proxy_event_id: `admission-${sequence}`,
            service_instance_id: "worker",
            body: JSON.stringify({
              ...row,
              processInstanceId: "worker",
              sequence,
            }),
          }))
          .filter(
            (row) =>
              row._timestamp >= query.start_time &&
              row._timestamp < query.end_time,
          )
      : [];
    return Response.json({ hits });
  };
  return { fetchImpl, requests, contacts };
}
const admissionAsOf = Date.parse("2026-09-19T01:00:00Z");
const admissionOptions = {
  backend: {
    baseUrl: "http://127.0.0.1:1",
    organization: "default",
    stream: "fixture",
  },
  startTime: (admissionAsOf - 60_000) * 1000,
  endTime: admissionAsOf * 1000,
  admissionLookbackMs: 20 * 60_000,
  requestTimeoutMs: 15 * 60_000,
  ingestionGraceMs: 2 * 60_000,
};
for (const lookback of [1, 17 * 60_000]) {
  await test(`doctor rejects unusable default admission horizon ${lookback} before fetching`, async () => {
    const fixture = admissionFixture([]);
    await assert.rejects(
      checkProxyTelemetry({
        ...admissionOptions,
        admissionLookbackMs: lookback,
        fetchImpl: fixture.fetchImpl,
      }),
      /admission lookback.*request timeout.*ingestion grace/i,
    );
    assert.equal(fixture.contacts.length, 0);
  });
}
for (const timeout of [18 * 60_000, 30 * 60_000]) {
  await test(`row deadline ${timeout} outside the bounded horizon cannot report pass`, async () => {
    const fixture = admissionFixture([
      {
        requestId: "long",
        event: "request_accepted",
        timestamp: new Date(admissionAsOf - 60_000).toISOString(),
        requestTimeoutMs: timeout,
      },
    ]);
    const report = await checkProxyTelemetry({
      ...admissionOptions,
      fetchImpl: fixture.fetchImpl,
    });
    const check = report.checks.find(
      (entry) => entry.name === "admission_reconciliation",
    )!;
    assert.equal(check.status, "unverified");
    assert.equal(
      (check.evidence as { insufficientWindowCount: number })
        .insufficientWindowCount,
      1,
    );
  });
}
await test("a window one millisecond wider than the effective deadline remains usable", async () => {
  const fixture = admissionFixture([
    {
      requestId: "fresh",
      event: "request_accepted",
      timestamp: new Date(admissionAsOf - 60_000).toISOString(),
      requestTimeoutMs: 18 * 60_000 - 1,
    },
  ]);
  const report = await checkProxyTelemetry({
    ...admissionOptions,
    fetchImpl: fixture.fetchImpl,
  });
  assert.equal(
    report.checks.find((entry) => entry.name === "admission_reconciliation")
      ?.status,
    "pass",
  );
});
await test("a default admission horizon one millisecond wider than timeout plus grace is valid", async () => {
  const fixture = admissionFixture([
    {
      requestId: "fresh",
      event: "request_accepted",
      timestamp: new Date(admissionAsOf - 60_000).toISOString(),
    },
  ]);
  const report = await checkProxyTelemetry({
    ...admissionOptions,
    admissionLookbackMs: 17 * 60_000 + 1,
    fetchImpl: fixture.fetchImpl,
  });
  assert.equal(
    report.checks.find((entry) => entry.name === "admission_reconciliation")
      ?.status,
    "pass",
  );
});
await test("an observed terminal does not certify an insufficient horizon for longer request deadlines", async () => {
  const fixture = admissionFixture([
    {
      requestId: "ended-long",
      event: "request_accepted",
      timestamp: new Date(admissionAsOf - 60_000).toISOString(),
      requestTimeoutMs: 30 * 60_000,
    },
    {
      requestId: "ended-long",
      event: "request_terminal",
      timestamp: new Date(admissionAsOf - 30_000).toISOString(),
    },
  ]);
  const report = await checkProxyTelemetry({
    ...admissionOptions,
    fetchImpl: fixture.fetchImpl,
  });
  const check = report.checks.find(
    (entry) => entry.name === "admission_reconciliation",
  )!;
  assert.equal(check.status, "unverified");
  assert.equal((check.evidence as { ended: number }).ended, 1);
});
await test("overdue admissions remain failures when another row has an insufficient window", async () => {
  const fixture = admissionFixture([
    {
      requestId: "overdue",
      event: "request_accepted",
      timestamp: new Date(admissionAsOf - 18 * 60_000).toISOString(),
    },
    {
      requestId: "long",
      event: "request_accepted",
      timestamp: new Date(admissionAsOf - 60_000).toISOString(),
      requestTimeoutMs: 30 * 60_000,
    },
  ]);
  const report = await checkProxyTelemetry({
    ...admissionOptions,
    fetchImpl: fixture.fetchImpl,
  });
  const check = report.checks.find(
    (entry) => entry.name === "admission_reconciliation",
  )!;
  assert.equal(check.status, "fail");
  assert.equal((check.evidence as { overdueCount: number }).overdueCount, 1);
});
await test("epoch-clamped admission horizons expose insufficient default and per-row coverage", async () => {
  const fixture = admissionFixture([
    {
      requestId: "clamped",
      event: "request_accepted",
      timestamp: new Date(500).toISOString(),
      requestTimeoutMs: 900,
    },
  ]);
  const report = await checkProxyTelemetry({
    ...admissionOptions,
    startTime: 100_000,
    endTime: 1_000_000,
    admissionLookbackMs: 60_000,
    requestTimeoutMs: 900,
    ingestionGraceMs: 200,
    fetchImpl: fixture.fetchImpl,
  });
  const check = report.checks.find(
    (entry) => entry.name === "admission_reconciliation",
  )!;
  assert.equal(check.status, "unverified");
  assert.equal(
    (check.evidence as { effectiveLookbackMs: number }).effectiveLookbackMs,
    1_000,
  );
});
await test("a short observed deadline cannot hide insufficient default coverage after epoch clamping", async () => {
  const fixture = admissionFixture([
    {
      requestId: "short",
      event: "request_accepted",
      timestamp: new Date(500).toISOString(),
      requestTimeoutMs: 100,
    },
    {
      requestId: "short",
      event: "request_terminal",
      timestamp: new Date(600).toISOString(),
    },
  ]);
  const report = await checkProxyTelemetry({
    ...admissionOptions,
    startTime: 100_000,
    endTime: 1_000_000,
    admissionLookbackMs: 60_000,
    requestTimeoutMs: 900,
    ingestionGraceMs: 200,
    fetchImpl: fixture.fetchImpl,
  });
  const check = report.checks.find(
    (entry) => entry.name === "admission_reconciliation",
  )!;
  assert.equal(check.status, "unverified");
  assert.equal(
    (check.evidence as { insufficientWindowCount: number })
      .insufficientWindowCount,
    0,
  );
  assert.equal(
    (check.evidence as { windowSufficient: boolean }).windowSufficient,
    false,
  );
});
for (const field of ["timestamp", "at"] as const) {
  await test(`a terminal with future ${field} cannot hide an admission overdue at the selected boundary`, async () => {
    const fixture = admissionFixture([
      {
        requestId: "late-ending",
        event: "request_accepted",
        timestamp: new Date(admissionAsOf - 18 * 60_000).toISOString(),
      },
      {
        requestId: "late-ending",
        event: "request_terminal",
        [field]: new Date(admissionAsOf + 30_000).toISOString(),
      },
    ]);
    const report = await checkProxyTelemetry({
      ...admissionOptions,
      fetchImpl: fixture.fetchImpl,
    });
    const check = report.checks.find(
      (entry) => entry.name === "admission_reconciliation",
    )!;
    assert.equal(check.status, "fail");
    const evidence = check.evidence as {
      ended: number;
      overdue: Array<{ requestId: string }>;
    };
    assert.equal(evidence.ended, 0);
    assert.deepEqual(
      evidence.overdue.map((row) => row.requestId),
      ["late-ending"],
    );
  });
}
await test("a terminal emitted before the boundary and ingested during grace still closes its admission", async () => {
  const fixture = admissionFixture([
    {
      requestId: "delayed-ingestion",
      event: "request_accepted",
      timestamp: new Date(admissionAsOf - 18 * 60_000).toISOString(),
    },
    {
      requestId: "delayed-ingestion",
      event: "request_terminal",
      timestamp: new Date(admissionAsOf - 30_000).toISOString(),
      recordedAtMicroseconds: (admissionAsOf + 30_000) * 1000,
    },
  ]);
  const report = await checkProxyTelemetry({
    ...admissionOptions,
    fetchImpl: fixture.fetchImpl,
  });
  const check = report.checks.find(
    (entry) => entry.name === "admission_reconciliation",
  )!;
  assert.equal(check.status, "pass");
  assert.equal((check.evidence as { ended: number }).ended, 1);
});

for (const mode of ["partial", "truncated", "corrupt", "future"] as const) {
  await test(`capture delivery and integrity use event time for ${mode} evidence`, async () => {
    const fixture = admissionFixture([]);
    const captureId = "12345678-1234-1234-1234-123456789abc";
    const selectedAt = admissionAsOf - 30_000;
    const capturedAt = mode === "future" ? admissionAsOf + 30_000 : selectedAt;
    const ingestedAt = mode === "future" ? selectedAt : admissionAsOf + 30_000;
    const indexes = [
      {
        _timestamp: selectedAt * 1000,
        proxy_event_id: "healthy-capture",
        body: JSON.stringify({
          requestId: "healthy",
          captureId: "healthy-capture",
          // Missing event timestamps retain the ingestion-time fallback.
          bodyDelivery: { status: "no_body" },
        }),
      },
      {
        _timestamp: ingestedAt * 1000,
        proxy_event_id: "unhealthy-capture",
        body: JSON.stringify({
          requestId: "unhealthy",
          captureId,
          timestamp: new Date(capturedAt).toISOString(),
          phase: "client_response",
          bodyDelivery: {
            status: ["partial", "future"].includes(mode)
              ? "partial"
              : "transport_acknowledged",
          },
          ...(mode === "truncated" ? { bodyTruncated: true } : {}),
          ...(mode === "corrupt"
            ? {
                bodySha256: createHash("sha256").update("{}").digest("hex"),
                redactedBodyBytes: 2,
              }
            : {}),
        }),
      },
    ];
    let bodyQueries = 0;
    const fetchImpl: typeof fetch = async (input, init) => {
      if (new URL(String(input)).pathname === "/status") {
        return fixture.fetchImpl(input, init);
      }
      const { query } = JSON.parse(String(init?.body));
      if (query.sql.includes("proxy_record_kind='body_capture_index'")) {
        return Response.json({
          hits: indexes.filter(
            (row) =>
              row._timestamp >= query.start_time &&
              row._timestamp < query.end_time,
          ),
        });
      }
      if (query.sql.includes("proxy_record_kind='body'")) {
        bodyQueries++;
        assert.ok(query.sql.includes(captureId));
        return Response.json({
          hits: [
            {
              _timestamp: ingestedAt * 1000,
              proxy_event_id: "corrupt-chunk",
              body_capture_id: captureId,
              body_chunk_index: 0,
              body_chunk_count: 1,
              body: "!!",
            },
          ],
        });
      }
      return fixture.fetchImpl(input, init);
    };
    const report = await checkProxyTelemetry({
      ...admissionOptions,
      fetchImpl,
    });
    const admission = report.checks.find(
      (entry) => entry.name === "capture_admission",
    )!;
    const delivery = report.checks.find(
      (entry) => entry.name === "capture_delivery",
    )!;
    const integrity = report.checks.find(
      (entry) => entry.name === "sample_body_integrity",
    )!;
    const captures = mode === "future" ? 1 : 2;
    assert.equal(
      (admission.evidence as { captures: number }).captures,
      captures,
    );
    assert.equal((delivery.evidence as { records: number }).records, captures);
    assert.equal(
      delivery.status,
      mode === "partial" || mode === "truncated" ? "fail" : "pass",
    );
    if (mode === "partial" || mode === "truncated") {
      assert.deepEqual(
        (
          delivery.evidence as { failures: Array<{ requestId: string }> }
        ).failures.map((row) => row.requestId),
        ["unhealthy"],
      );
    }
    assert.equal(bodyQueries, mode === "corrupt" ? 1 : 0);
    assert.equal(integrity.status, mode === "corrupt" ? "fail" : "unverified");
    if (mode === "corrupt") {
      assert.equal(
        (integrity.evidence as Array<{ verified: boolean }>)[0].verified,
        false,
      );
    }
  });
}
await runSuite();
