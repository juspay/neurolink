import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { analyzeProxyLogs } from "../src/lib/proxy/proxyAnalysis.js";

const tempDirs: string[] = [];
const nowMs = Date.parse("2026-07-18T12:00:00.000Z");

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

async function writeJsonLines(
  directory: string,
  name: string,
  records: (Record<string, unknown> | string)[],
): Promise<void> {
  await writeFile(
    join(directory, name),
    `${records
      .map((record) =>
        typeof record === "string" ? record : JSON.stringify(record),
      )
      .join("\n")}\n`,
  );
}

describe("offline proxy log analysis", () => {
  it("classifies rate limits, retries, lifecycle gaps, latency, and cache usage", async () => {
    const logDir = await mkdtemp(join(tmpdir(), "neurolink-analysis-"));
    tempDirs.push(logDir);
    const timestamp = "2026-07-18T11:00:00.000Z";
    const routingDecision = {
      schemaVersion: 1,
      evaluatedAt: timestamp,
      strategy: "fill-first",
      mode: "quota",
      selectionReason: "weekly_reset",
      quotaRoutingEnabled: true,
      quotaInputsUsed: true,
      sessionSoftLimit: 0.97,
      sessionResetToleranceMs: 900_000,
      configuredPrimaryAccount: "anthropic:primary@example.com",
      configuredPrimaryMatched: true,
      rotationOffset: 0,
      initialAccount: "primary@example.com",
      candidates: [
        {
          account: "primary@example.com",
          accountType: "oauth",
          sourceIndex: 0,
          rank: 0,
          configuredPrimary: true,
          usable: true,
          saturated: false,
          quotaObserved: true,
          quotaLastUpdated: nowMs - 60_000,
          quotaAgeMs: 60_000,
          coolingActive: false,
          coolingReason: null,
          coolingUntil: null,
          unifiedStatus: "allowed",
          overageStatus: "allowed",
          sessionStatus: "allowed",
          sessionUsed: 0.2,
          sessionResetAt: nowMs + 3_600_000,
          sessionResetBucket: 1_970_700,
          weeklyStatus: "allowed",
          weeklyUsed: 0.7,
          weeklyResetAt: nowMs + 86_400_000,
        },
        {
          account: "fallback@example.com",
          accountType: "oauth",
          sourceIndex: 1,
          rank: 1,
          configuredPrimary: false,
          usable: true,
          saturated: false,
          quotaObserved: true,
          quotaLastUpdated: nowMs - 120_000,
          quotaAgeMs: 120_000,
          coolingActive: false,
          coolingReason: null,
          coolingUntil: null,
          unifiedStatus: "allowed",
          overageStatus: "allowed",
          sessionStatus: "allowed",
          sessionUsed: 0.1,
          sessionResetAt: nowMs + 7_200_000,
          sessionResetBucket: 1_970_704,
          weeklyStatus: "allowed",
          weeklyUsed: 0.1,
          weeklyResetAt: nowMs + 172_800_000,
        },
      ],
    };

    await writeJsonLines(logDir, "proxy-lifecycle-2026-07-18.jsonl", [
      {
        schemaVersion: 1,
        timestamp,
        processInstanceId: "process-1",
        sequence: 1,
        event: "request_accepted",
        requestId: "request-1",
      },
      {
        schemaVersion: 1,
        timestamp,
        processInstanceId: "process-1",
        sequence: 2,
        event: "response_headers",
        requestId: "request-1",
        elapsedMs: 20,
      },
      {
        schemaVersion: 1,
        timestamp,
        processInstanceId: "process-1",
        sequence: 4,
        event: "request_terminal",
        requestId: "request-1",
        elapsedMs: 120,
        terminalOutcome: "completed",
      },
      {
        schemaVersion: 1,
        timestamp,
        processInstanceId: "process-1",
        sequence: 5,
        event: "request_accepted",
        requestId: "request-2",
      },
      { schemaVersion: 2, timestamp, event: "future", requestId: "future" },
      "{malformed",
    ]);

    await writeJsonLines(logDir, "proxy-attempts-2026-07-18.jsonl", [
      {
        timestamp,
        requestId: "request-1",
        account: "primary@example.com",
        accountType: "oauth",
        responseStatus: 429,
        responseTimeMs: 10,
        attemptDurationMs: 10,
        rateLimitKind: "transient",
      },
      {
        timestamp,
        requestId: "request-1",
        account: "fallback@example.com",
        accountType: "oauth",
        responseStatus: 200,
        responseTimeMs: 80,
        attemptDurationMs: 80,
      },
      {
        timestamp,
        requestId: "request-2",
        account: "primary@example.com",
        accountType: "oauth",
        responseStatus: 429,
        responseTimeMs: 30,
        attemptDurationMs: 30,
        rateLimitKind: "quota",
      },
      {
        timestamp,
        requestId: "request-3",
        account: "legacy@example.com",
        accountType: "oauth",
        responseStatus: 429,
        responseTimeMs: 25,
        attemptDurationMs: 25,
        errorType: "transport_error",
        errorCode: "ETIMEDOUT",
      },
    ]);

    await writeJsonLines(logDir, "proxy-2026-07-18.jsonl", [
      {
        timestamp,
        requestId: "request-1",
        method: "POST",
        account: "fallback@example.com",
        accountType: "oauth",
        responseStatus: 200,
        responseTimeMs: 110,
        inputTokens: 100,
        cacheReadTokens: 80,
        cacheCreationTokens: 5,
        routingDecision: {
          ...routingDecision,
          unexpectedTopLevel: "discarded",
          candidates: routingDecision.candidates.map((candidate, index) =>
            index === 0
              ? { ...candidate, unexpectedCandidateField: "discarded" }
              : candidate,
          ),
        },
      },
      {
        timestamp,
        requestId: "request-2",
        method: "POST",
        account: "outside@example.com",
        accountType: "oauth",
        responseStatus: 429,
        responseTimeMs: 35,
        routingDecision,
      },
      {
        timestamp,
        requestId: "request-3",
        method: "POST",
        account: "legacy@example.com",
        accountType: "oauth",
        responseStatus: 502,
        responseTimeMs: 40,
        errorType: "transport_error",
        errorCode: "ETIMEDOUT",
        routingDecision: { ...routingDecision, schemaVersion: 99 },
      },
      {
        timestamp,
        requestId: "request-4",
        method: "POST",
        account: "fallback@example.com",
        accountType: "oauth",
        responseStatus: 200,
        responseTimeMs: 50,
      },
    ]);

    const report = await analyzeProxyLogs({
      logsDir: logDir,
      since: "2h",
      nowMs,
    });

    expect(report.dataQuality).toMatchObject({
      malformedLines: 1,
      unsupportedLifecycleLines: 1,
      lifecycleSequenceGaps: 1,
      routingDecisions: { valid: 2, invalid: 1, absent: 1 },
    });
    expect(report.coverage).toEqual({
      lifecycle: true,
      finalRequests: true,
      attempts: true,
      attemptLatency: true,
      cacheUsage: true,
      routingDecisions: true,
    });
    expect(report.lifecycle).toMatchObject({
      accepted: 2,
      headers: 1,
      terminal: 1,
      unsettled: 1,
    });
    expect(report.requests).toEqual({
      completed: 4,
      success: 2,
      errors: 2,
      finalRateLimits: 1,
      recoveredAfterRetry: 1,
      errorTypes: { http_429: 1, transport_error: 1 },
      errorCodes: { ETIMEDOUT: 1 },
    });
    expect(report.attempts).toEqual({
      total: 4,
      errors: 3,
      errorTypes: { http_429: 2, transport_error: 1 },
      errorCodes: { ETIMEDOUT: 1 },
    });
    expect(report.rateLimits).toEqual({
      attemptRateLimits: 3,
      transient: 1,
      quota: 1,
      unclassified: 1,
    });
    expect(report.latencyMs.headers).toMatchObject({ count: 1, p95: 20 });
    expect(report.latencyMs.terminal).toMatchObject({ count: 1, p95: 120 });
    expect(report.latencyMs.singleAttemptDelta).toMatchObject({
      count: 2,
      p50: 5,
      max: 15,
    });
    expect(report.cache).toMatchObject({
      requestsWithUsage: 1,
      requestsWithCacheRead: 1,
      cacheReadTokens: 80,
      cacheCreationTokens: 5,
      inputTokens: 100,
      requestHitRate: 1,
    });
    expect(report.routing).toMatchObject({
      modes: { quota: 2 },
      selectionReasons: { weekly_reset: 2 },
      initialAccounts: { "primary@example.com": 2 },
      finalAccountChanges: 1,
      finalOutsideCandidateSet: 1,
      totalRecords: 2,
    });
    expect(report.routing.records).toHaveLength(2);
    expect(report.routing.records[0]).toMatchObject({
      requestId: "request-1",
      timestamp,
      responseStatus: 200,
      finalAccount: "fallback@example.com",
      finalAccountType: "oauth",
      decision: routingDecision,
    });
    expect(report.routing.records[0]?.decision).not.toHaveProperty(
      "unexpectedTopLevel",
    );
    expect(
      report.routing.records[0]?.decision.candidates[0],
    ).not.toHaveProperty("unexpectedCandidateField");
    expect(report.accounts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          account: "primary@example.com",
          attempts: 2,
          transientRateLimits: 1,
          quotaRateLimits: 1,
        }),
        expect.objectContaining({
          account: "legacy@example.com",
          unclassifiedRateLimits: 1,
          finalErrors: 1,
        }),
      ]),
    );
  });

  it("bounds retained routing records while preserving aggregate counts", async () => {
    const logDir = await mkdtemp(join(tmpdir(), "neurolink-routing-analysis-"));
    tempDirs.push(logDir);
    const timestamp = "2026-07-18T11:00:00.000Z";
    const routingDecision = {
      schemaVersion: 1,
      evaluatedAt: timestamp,
      strategy: "fill-first",
      mode: "primary",
      selectionReason: "configured_primary",
      quotaRoutingEnabled: false,
      quotaInputsUsed: false,
      sessionSoftLimit: 0.97,
      sessionResetToleranceMs: 900_000,
      configuredPrimaryAccount: "anthropic:primary@example.com",
      configuredPrimaryMatched: true,
      rotationOffset: 0,
      initialAccount: "primary@example.com",
      candidates: [
        {
          account: "primary@example.com",
          accountType: "oauth",
          sourceIndex: 0,
          rank: 0,
          configuredPrimary: true,
          usable: true,
          saturated: false,
          quotaObserved: false,
          quotaLastUpdated: null,
          quotaAgeMs: null,
          coolingActive: false,
          coolingReason: null,
          coolingUntil: null,
          unifiedStatus: null,
          overageStatus: null,
          sessionStatus: null,
          sessionUsed: null,
          sessionResetAt: null,
          sessionResetBucket: null,
          weeklyStatus: null,
          weeklyUsed: null,
          weeklyResetAt: null,
        },
      ],
    };
    await writeJsonLines(logDir, "proxy-2026-07-18.jsonl", [
      ...Array.from({ length: 205 }, (_, index) => ({
        timestamp: new Date(
          Date.parse(timestamp) + index * 1_000,
        ).toISOString(),
        requestId: `request-${index + 1}`,
        method: "POST",
        account: "primary@example.com",
        accountType: "oauth",
        responseStatus: 200,
        responseTimeMs: 1,
        routingDecision,
      })),
      {
        timestamp: "2026-07-18T11:10:00.000Z",
        requestId: "request-1",
        method: "POST",
        account: "primary@example.com",
        accountType: "oauth",
        responseStatus: 200,
        responseTimeMs: 1,
        routingDecision,
      },
    ]);

    const report = await analyzeProxyLogs({
      logsDir: logDir,
      since: "2h",
      nowMs,
    });

    expect(report.dataQuality.routingDecisions).toEqual({
      valid: 206,
      invalid: 0,
      absent: 0,
    });
    expect(report.routing).toMatchObject({
      totalRecords: 205,
      initialAccounts: { "primary@example.com": 205 },
      finalAccountChanges: 0,
      finalOutsideCandidateSet: 0,
    });
    expect(report.routing.records).toHaveLength(200);
    expect(report.routing.records[0]?.requestId).toBe("request-7");
    expect(report.routing.records.at(-1)?.requestId).toBe("request-1");
  });

  it("rejects ambiguous time windows instead of silently using all data", async () => {
    const logDir = await mkdtemp(join(tmpdir(), "neurolink-analysis-"));
    tempDirs.push(logDir);

    await expect(
      analyzeProxyLogs({ logsDir: logDir, since: "recently", nowMs }),
    ).rejects.toThrow("Invalid --since value");
    await expect(
      analyzeProxyLogs({
        logsDir: logDir,
        since: "1h",
        until: "later",
        nowMs,
      }),
    ).rejects.toThrow("Invalid --until value");
    await expect(
      analyzeProxyLogs({
        logsDir: logDir,
        since: "1h",
        until: "2h",
        nowMs,
      }),
    ).rejects.toThrow("--until must not be earlier than --since");
  });

  it("uses a fixed end-of-snapshot cutoff while logs continue to append", async () => {
    const logDir = await mkdtemp(join(tmpdir(), "neurolink-analysis-"));
    tempDirs.push(logDir);
    await writeJsonLines(logDir, "proxy-2026-07-18.jsonl", [
      {
        timestamp: "2026-07-18T11:00:00.000Z",
        requestId: "included",
        method: "POST",
        account: "primary@example.com",
        accountType: "oauth",
        responseStatus: 200,
      },
      {
        timestamp: "2026-07-18T11:31:00.000Z",
        requestId: "appended-after-cutoff",
        method: "POST",
        account: "primary@example.com",
        accountType: "oauth",
        responseStatus: 502,
      },
    ]);

    const report = await analyzeProxyLogs({
      logsDir: logDir,
      since: "2h",
      until: "2026-07-18T11:30:00.000Z",
      nowMs,
    });

    expect(report.until).toBe("2026-07-18T11:30:00.000Z");
    expect(report.requests).toMatchObject({
      completed: 1,
      success: 1,
      errors: 0,
    });
  });

  it("does not mislabel legacy end-to-end timing as account-attempt latency", async () => {
    const logDir = await mkdtemp(join(tmpdir(), "neurolink-analysis-"));
    tempDirs.push(logDir);
    await writeJsonLines(logDir, "proxy-attempts-2026-07-18.jsonl", [
      {
        timestamp: "2026-07-18T11:00:00.000Z",
        requestId: "legacy-request",
        account: "legacy@example.com",
        accountType: "oauth",
        responseStatus: 200,
        responseTimeMs: 900,
      },
    ]);

    const report = await analyzeProxyLogs({
      logsDir: logDir,
      since: "2h",
      nowMs,
    });

    expect(report.coverage.attempts).toBe(true);
    expect(report.coverage.attemptLatency).toBe(false);
    expect(report.latencyMs.attempt).toEqual({
      count: 0,
      p50: null,
      p95: null,
      p99: null,
      max: null,
    });
  });

  it("reports per-stream coverage and missing body artifacts without reading bodies", async () => {
    const logDir = await mkdtemp(join(tmpdir(), "neurolink-analysis-"));
    tempDirs.push(logDir);
    const bodyDir = join(logDir, "bodies", "2026-07-18", "request-1");
    const presentBody = join(bodyDir, "present.json.gz");
    const missingBody = join(bodyDir, "missing.json.gz");
    const escapedBody = join(bodyDir, "escaped.json.gz");
    const outsideBody = join(logDir, "outside-body.json.gz");
    await mkdir(bodyDir, { recursive: true });
    await writeFile(presentBody, "not-read-by-the-analyzer");
    await writeFile(outsideBody, "outside-the-body-sandbox");
    await symlink(outsideBody, escapedBody);
    await writeJsonLines(logDir, "proxy-debug-2026-07-18.jsonl", [
      {
        timestamp: "2026-07-18T10:00:00.000Z",
        type: "body_capture",
        bodyPath: presentBody,
        bodyTruncated: true,
      },
      {
        timestamp: "2026-07-18T11:00:00.000Z",
        type: "body_capture",
        bodyPath: missingBody,
      },
      {
        timestamp: "2026-07-18T11:30:00.000Z",
        type: "body_capture",
        bodyWriteFailed: true,
      },
      {
        timestamp: "2026-07-18T11:45:00.000Z",
        type: "body_capture",
        bodyPath: join(logDir, "outside.json.gz"),
      },
      {
        timestamp: "2026-07-18T11:46:00.000Z",
        type: "body_capture",
        bodyPath: escapedBody,
      },
      {
        timestamp: "2026-07-18T11:47:00.000Z",
        type: "body_capture",
        bodyPath: "bodies/unsafe\0artifact.json.gz",
      },
    ]);

    const report = await analyzeProxyLogs({
      logsDir: logDir,
      since: "2h",
      nowMs,
    });

    expect(report.files.debug).toBe(1);
    expect(report.dataQuality.streams.debug).toEqual({
      observedFrom: "2026-07-18T10:00:00.000Z",
      observedTo: "2026-07-18T11:47:00.000Z",
      startsAtOrBeforeRequestedWindow: true,
    });
    expect(report.dataQuality.bodyArtifacts).toEqual({
      capturesIndexed: 6,
      artifactsReferenced: 2,
      artifactsPresent: 1,
      artifactsMissing: 1,
      invalidPaths: 3,
      writeFailures: 1,
      truncatedCaptures: 1,
    });
  });

  it("marks absent telemetry as unavailable instead of treating it as zero", async () => {
    const logDir = await mkdtemp(join(tmpdir(), "neurolink-analysis-"));
    tempDirs.push(logDir);

    const report = await analyzeProxyLogs({
      logsDir: logDir,
      since: "1h",
      nowMs,
    });

    expect(report.coverage).toEqual({
      lifecycle: false,
      finalRequests: false,
      attempts: false,
      attemptLatency: false,
      cacheUsage: false,
      routingDecisions: false,
    });
    expect(report.dataQuality.routingDecisions).toEqual({
      valid: 0,
      invalid: 0,
      absent: 0,
    });
    expect(report.requests.completed).toBe(0);
    expect(report.lifecycle.unsettled).toBe(0);
  });

  it("does not claim attempt coverage from a file with no records in the requested window", async () => {
    const logDir = await mkdtemp(join(tmpdir(), "neurolink-analysis-"));
    tempDirs.push(logDir);
    await writeJsonLines(logDir, "proxy-attempts-2026-07-18.jsonl", [
      {
        timestamp: "2026-07-18T08:00:00.000Z",
        requestId: "old-attempt",
        account: "old@example.com",
        accountType: "oauth",
        responseStatus: 200,
        attemptDurationMs: 10,
      },
    ]);

    const report = await analyzeProxyLogs({
      logsDir: logDir,
      since: "2h",
      nowMs,
    });

    expect(report.files.attempts).toBe(1);
    expect(report.coverage.attempts).toBe(false);
    expect(report.attempts.total).toBe(0);
    expect(report.dataQuality.streams.attempts.observedTo).toBe(
      "2026-07-18T08:00:00.000Z",
    );
  });
});
