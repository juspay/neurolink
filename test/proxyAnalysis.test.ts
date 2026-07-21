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
      },
      {
        timestamp,
        requestId: "request-2",
        method: "POST",
        account: "primary@example.com",
        accountType: "oauth",
        responseStatus: 429,
        responseTimeMs: 35,
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
    });
    expect(report.coverage).toEqual({
      lifecycle: true,
      finalRequests: true,
      attempts: true,
      attemptLatency: true,
      cacheUsage: true,
    });
    expect(report.lifecycle).toMatchObject({
      accepted: 2,
      headers: 1,
      terminal: 1,
      unsettled: 1,
    });
    expect(report.requests).toEqual({
      completed: 3,
      success: 1,
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

  it("rejects ambiguous time windows instead of silently using all data", async () => {
    const logDir = await mkdtemp(join(tmpdir(), "neurolink-analysis-"));
    tempDirs.push(logDir);

    await expect(
      analyzeProxyLogs({ logsDir: logDir, since: "recently", nowMs }),
    ).rejects.toThrow("Invalid --since value");
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
