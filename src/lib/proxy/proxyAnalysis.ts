import { createReadStream } from "node:fs";
import { readdir } from "node:fs/promises";
import { homedir } from "node:os";
import { createInterface } from "node:readline";
import { join, resolve } from "node:path";
import type {
  ProxyAnalysisAccount,
  ProxyAnalysisAttemptRecord,
  ProxyAnalysisFinalRequestRecord,
  ProxyAnalysisOptions,
  ProxyAnalysisReport,
  ProxyLatencySummary,
} from "../types/index.js";

const LIFECYCLE_FILE_PATTERN = /^proxy-lifecycle-\d{4}-\d{2}-\d{2}\.jsonl$/;
const REQUEST_FILE_PATTERN = /^proxy-\d{4}-\d{2}-\d{2}\.jsonl$/;
const ATTEMPT_FILE_PATTERN = /^proxy-attempts-\d{4}-\d{2}-\d{2}\.jsonl$/;
const LIFECYCLE_EVENTS = new Set([
  "request_accepted",
  "response_headers",
  "response_first_chunk",
  "request_terminal",
]);

function increment(counter: Record<string, number>, key: string): void {
  counter[key] = (counter[key] ?? 0) + 1;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function percentile(sorted: number[], fraction: number): number | null {
  if (sorted.length === 0) {
    return null;
  }
  const index = Math.max(0, Math.ceil(sorted.length * fraction) - 1);
  return Number(sorted[index].toFixed(3));
}

function summarizeLatency(values: number[]): ProxyLatencySummary {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  return {
    count: sorted.length,
    p50: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
    p99: percentile(sorted, 0.99),
    max: sorted.length ? Number(sorted[sorted.length - 1].toFixed(3)) : null,
  };
}

function parseSince(value: string, nowMs: number): number {
  const relative = /^(\d+(?:\.\d+)?)(m|h|d|w)$/i.exec(value.trim());
  if (relative) {
    const amount = Number(relative[1]);
    const unitMs: Record<string, number> = {
      m: 60_000,
      h: 3_600_000,
      d: 86_400_000,
      w: 604_800_000,
    };
    return nowMs - amount * unitMs[relative[2].toLowerCase()];
  }
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(
      `Invalid --since value "${value}". Use an ISO timestamp or a duration such as 6h, 1d, or 1w.`,
    );
  }
  return parsed;
}

async function readJsonLines(
  filePath: string,
  onRecord: (record: Record<string, unknown>) => void,
  onMalformed: () => void,
): Promise<number> {
  let linesRead = 0;
  const lines = createInterface({
    input: createReadStream(filePath, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });
  for await (const line of lines) {
    if (!line.trim()) {
      continue;
    }
    linesRead += 1;
    try {
      const parsed = JSON.parse(line) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        onMalformed();
        continue;
      }
      onRecord(parsed as Record<string, unknown>);
    } catch {
      onMalformed();
    }
  }
  return linesRead;
}

function accountEntry(
  accounts: Map<string, ProxyAnalysisAccount>,
  account: string,
  accountType: string,
): ProxyAnalysisAccount {
  const key = `${accountType}:${account}`;
  const existing = accounts.get(key);
  if (existing) {
    return existing;
  }
  const created: ProxyAnalysisAccount = {
    account,
    accountType,
    attempts: 0,
    attemptErrors: 0,
    finalRequests: 0,
    finalErrors: 0,
    transientRateLimits: 0,
    quotaRateLimits: 0,
    unclassifiedRateLimits: 0,
  };
  accounts.set(key, created);
  return created;
}

function summarizeFinalRequests(
  finalRequests: Map<string, ProxyAnalysisFinalRequestRecord>,
  terminalStreamErrors: Set<string>,
  attemptsByRequest: Map<string, ProxyAnalysisAttemptRecord>,
  accounts: Map<string, ProxyAnalysisAccount>,
) {
  let success = 0;
  let errors = 0;
  let finalRateLimits = 0;
  let recoveredAfterRetry = 0;
  let requestsWithUsage = 0;
  let requestsWithCacheRead = 0;
  let cacheReadTokens = 0;
  let cacheCreationTokens = 0;
  let inputTokens = 0;
  const finalRequestLatency: number[] = [];
  const singleAttemptDelta: number[] = [];
  const errorTypes: Record<string, number> = {};
  const errorCodes: Record<string, number> = {};

  for (const [requestId, request] of finalRequests) {
    const failed = request.status >= 400 || terminalStreamErrors.has(requestId);
    if (failed) {
      errors += 1;
    } else {
      success += 1;
    }
    finalRateLimits += request.status === 429 ? 1 : 0;
    const accountStats = accountEntry(
      accounts,
      request.account,
      request.accountType,
    );
    accountStats.finalRequests += 1;
    accountStats.finalErrors += failed ? 1 : 0;
    if (failed) {
      increment(
        errorTypes,
        terminalStreamErrors.has(requestId)
          ? "stream_error"
          : (request.errorType ?? `http_${request.status}`),
      );
      if (request.errorCode) {
        increment(errorCodes, request.errorCode);
      }
    }
    if (request.durationMs !== null && request.durationMs >= 0) {
      finalRequestLatency.push(request.durationMs);
    }
    const requestAttempts = attemptsByRequest.get(requestId);
    recoveredAfterRetry += !failed && requestAttempts?.hadError ? 1 : 0;
    if (
      requestAttempts?.count === 1 &&
      requestAttempts.durationCount === 1 &&
      request.durationMs !== null &&
      Number.isFinite(requestAttempts.totalDurationMs)
    ) {
      singleAttemptDelta.push(
        request.durationMs - requestAttempts.totalDurationMs,
      );
    }
    if (
      request.inputTokens !== null ||
      request.cacheReadTokens !== null ||
      request.cacheCreationTokens !== null
    ) {
      requestsWithUsage += 1;
      inputTokens += request.inputTokens ?? 0;
      cacheReadTokens += request.cacheReadTokens ?? 0;
      cacheCreationTokens += request.cacheCreationTokens ?? 0;
      requestsWithCacheRead += (request.cacheReadTokens ?? 0) > 0 ? 1 : 0;
    }
  }

  return {
    requestTotals: {
      completed: finalRequests.size,
      success,
      errors,
      finalRateLimits,
      recoveredAfterRetry,
      errorTypes,
      errorCodes,
    },
    cache: {
      requestsWithUsage,
      requestsWithCacheRead,
      cacheReadTokens,
      cacheCreationTokens,
      inputTokens,
      requestHitRate:
        requestsWithUsage > 0
          ? Number((requestsWithCacheRead / requestsWithUsage).toFixed(4))
          : null,
    },
    finalRequestLatency,
    singleAttemptDelta,
  };
}

async function discoverLogFiles(logsDir: string) {
  const entries = await readdir(logsDir, { withFileTypes: true }).catch(
    (error: NodeJS.ErrnoException) => {
      throw new Error(
        `Unable to read proxy logs at ${logsDir}: ${error.message}`,
      );
    },
  );
  const matching = (pattern: RegExp) =>
    entries
      .filter((entry) => entry.isFile() && pattern.test(entry.name))
      .map((entry) => join(logsDir, entry.name))
      .sort();
  return {
    lifecycleFiles: matching(LIFECYCLE_FILE_PATTERN),
    requestFiles: matching(REQUEST_FILE_PATTERN),
    attemptFiles: matching(ATTEMPT_FILE_PATTERN),
  };
}

/** Analyze local proxy logs without reading request or response body artifacts. */
export async function analyzeProxyLogs(
  options?: ProxyAnalysisOptions,
): Promise<ProxyAnalysisReport> {
  const nowMs = options?.nowMs ?? Date.now();
  const sinceMs = parseSince(options?.since ?? "24h", nowMs);
  const logsDir = resolve(
    options?.logsDir ?? join(homedir(), ".neurolink", "logs"),
  );
  const { lifecycleFiles, requestFiles, attemptFiles } =
    await discoverLogFiles(logsDir);

  let linesRead = 0;
  let malformedLines = 0;
  let unsupportedLifecycleLines = 0;
  const accepted = new Set<string>();
  const headers = new Set<string>();
  const firstChunks = new Set<string>();
  const terminal = new Set<string>();
  const terminalOutcomes: Record<string, number> = {};
  const lifecycleErrorTypes: Record<string, number> = {};
  const lifecycleErrorCodes: Record<string, number> = {};
  const headersLatency: number[] = [];
  const firstChunkLatency: number[] = [];
  const terminalLatency: number[] = [];
  const sequences = new Map<string, number[]>();

  for (const filePath of lifecycleFiles) {
    linesRead += await readJsonLines(
      filePath,
      (record) => {
        const timestamp = Date.parse(String(record.timestamp ?? ""));
        if (!Number.isFinite(timestamp) || timestamp < sinceMs) {
          return;
        }
        const event = stringValue(record.event);
        const requestId = stringValue(record.requestId);
        if (
          record.schemaVersion !== 1 ||
          !event ||
          !LIFECYCLE_EVENTS.has(event) ||
          !requestId
        ) {
          unsupportedLifecycleLines += 1;
          return;
        }
        const processId = stringValue(record.processInstanceId);
        const sequence = finiteNumber(record.sequence);
        if (processId && sequence !== null && Number.isInteger(sequence)) {
          const values = sequences.get(processId) ?? [];
          values.push(sequence);
          sequences.set(processId, values);
        }
        const elapsed = finiteNumber(record.elapsedMs);
        if (event === "request_accepted") {
          accepted.add(requestId);
        } else if (event === "response_headers") {
          headers.add(requestId);
          if (elapsed !== null && elapsed >= 0) {
            headersLatency.push(elapsed);
          }
        } else if (event === "response_first_chunk") {
          firstChunks.add(requestId);
          if (elapsed !== null && elapsed >= 0) {
            firstChunkLatency.push(elapsed);
          }
        } else {
          terminal.add(requestId);
          if (elapsed !== null && elapsed >= 0) {
            terminalLatency.push(elapsed);
          }
          increment(
            terminalOutcomes,
            stringValue(record.terminalOutcome) ?? "unknown",
          );
          const errorType = stringValue(record.errorType);
          const errorCode = stringValue(record.errorCode);
          if (errorType) {
            increment(lifecycleErrorTypes, errorType);
          }
          if (errorCode) {
            increment(lifecycleErrorCodes, errorCode);
          }
        }
      },
      () => {
        malformedLines += 1;
      },
    );
  }

  let lifecycleSequenceGaps = 0;
  let lifecycleSequenceDuplicates = 0;
  for (const values of sequences.values()) {
    values.sort((a, b) => a - b);
    for (let index = 1; index < values.length; index += 1) {
      const difference = values[index] - values[index - 1];
      if (difference === 0) {
        lifecycleSequenceDuplicates += 1;
      } else if (difference > 1) {
        lifecycleSequenceGaps += difference - 1;
      }
    }
  }

  const accounts = new Map<string, ProxyAnalysisAccount>();
  const attemptsByRequest = new Map<string, ProxyAnalysisAttemptRecord>();
  const attemptLatency: number[] = [];
  let totalAttempts = 0;
  let totalAttemptErrors = 0;
  const attemptErrorTypes: Record<string, number> = {};
  const attemptErrorCodes: Record<string, number> = {};
  let attemptRateLimits = 0;
  let transientRateLimits = 0;
  let quotaRateLimits = 0;
  let unclassifiedRateLimits = 0;

  for (const filePath of attemptFiles) {
    linesRead += await readJsonLines(
      filePath,
      (record) => {
        const timestamp = Date.parse(String(record.timestamp ?? ""));
        if (!Number.isFinite(timestamp) || timestamp < sinceMs) {
          return;
        }
        const requestId = stringValue(record.requestId);
        const status = finiteNumber(record.responseStatus);
        const duration = finiteNumber(record.attemptDurationMs);
        if (!requestId || status === null) {
          return;
        }
        const account = stringValue(record.account) ?? "unknown";
        const accountType = stringValue(record.accountType) ?? "unknown";
        const accountStats = accountEntry(accounts, account, accountType);
        totalAttempts += 1;
        accountStats.attempts += 1;
        const hadError = status >= 400 || !!stringValue(record.errorType);
        if (hadError) {
          totalAttemptErrors += 1;
          accountStats.attemptErrors += 1;
          increment(
            attemptErrorTypes,
            stringValue(record.errorType) ?? `http_${status}`,
          );
          const errorCode = stringValue(record.errorCode);
          if (errorCode) {
            increment(attemptErrorCodes, errorCode);
          }
        }
        const requestAttempts = attemptsByRequest.get(requestId) ?? {
          count: 0,
          hadError: false,
          totalDurationMs: 0,
          durationCount: 0,
        };
        requestAttempts.count += 1;
        requestAttempts.hadError = requestAttempts.hadError || hadError;
        if (duration !== null && duration >= 0) {
          requestAttempts.totalDurationMs += duration;
          requestAttempts.durationCount += 1;
          attemptLatency.push(duration);
        }
        attemptsByRequest.set(requestId, requestAttempts);
        if (status === 429) {
          attemptRateLimits += 1;
          if (record.rateLimitKind === "transient") {
            transientRateLimits += 1;
            accountStats.transientRateLimits += 1;
          } else if (record.rateLimitKind === "quota") {
            quotaRateLimits += 1;
            accountStats.quotaRateLimits += 1;
          } else {
            unclassifiedRateLimits += 1;
            accountStats.unclassifiedRateLimits += 1;
          }
        }
      },
      () => {
        malformedLines += 1;
      },
    );
  }

  const finalRequests = new Map<string, ProxyAnalysisFinalRequestRecord>();
  const terminalStreamErrors = new Set<string>();
  for (const filePath of requestFiles) {
    linesRead += await readJsonLines(
      filePath,
      (record) => {
        const timestamp = Date.parse(String(record.timestamp ?? ""));
        if (!Number.isFinite(timestamp) || timestamp < sinceMs) {
          return;
        }
        const requestId = stringValue(record.requestId);
        if (!requestId) {
          return;
        }
        if (finiteNumber(record.terminalStatus) !== null) {
          terminalStreamErrors.add(requestId);
          return;
        }
        const status = finiteNumber(record.responseStatus);
        if (status === null || !stringValue(record.method)) {
          return;
        }
        finalRequests.set(requestId, {
          status,
          durationMs: finiteNumber(record.responseTimeMs),
          account: stringValue(record.account) ?? "unknown",
          accountType: stringValue(record.accountType) ?? "unknown",
          inputTokens: finiteNumber(record.inputTokens),
          cacheReadTokens: finiteNumber(record.cacheReadTokens),
          cacheCreationTokens: finiteNumber(record.cacheCreationTokens),
          errorType: stringValue(record.errorType),
          errorCode: stringValue(record.errorCode),
        });
      },
      () => {
        malformedLines += 1;
      },
    );
  }

  const finalSummary = summarizeFinalRequests(
    finalRequests,
    terminalStreamErrors,
    attemptsByRequest,
    accounts,
  );

  return {
    generatedAt: new Date(nowMs).toISOString(),
    since: new Date(sinceMs).toISOString(),
    logsDir,
    files: {
      lifecycle: lifecycleFiles.length,
      requests: requestFiles.length,
      attempts: attemptFiles.length,
    },
    coverage: {
      lifecycle: lifecycleFiles.length > 0,
      finalRequests: requestFiles.length > 0,
      attempts: attemptFiles.length > 0,
      attemptLatency: attemptLatency.length > 0,
      cacheUsage: finalSummary.cache.requestsWithUsage > 0,
    },
    dataQuality: {
      linesRead,
      malformedLines,
      unsupportedLifecycleLines,
      lifecycleSequenceGaps,
      lifecycleSequenceDuplicates,
    },
    lifecycle: {
      accepted: accepted.size,
      headers: headers.size,
      firstChunks: firstChunks.size,
      terminal: terminal.size,
      unsettled: [...accepted].filter((requestId) => !terminal.has(requestId))
        .length,
      terminalOutcomes,
      errorTypes: lifecycleErrorTypes,
      errorCodes: lifecycleErrorCodes,
    },
    requests: finalSummary.requestTotals,
    attempts: {
      total: totalAttempts,
      errors: totalAttemptErrors,
      errorTypes: attemptErrorTypes,
      errorCodes: attemptErrorCodes,
    },
    rateLimits: {
      attemptRateLimits,
      transient: transientRateLimits,
      quota: quotaRateLimits,
      unclassified: unclassifiedRateLimits,
    },
    latencyMs: {
      headers: summarizeLatency(headersLatency),
      firstChunk: summarizeLatency(firstChunkLatency),
      terminal: summarizeLatency(terminalLatency),
      finalRequest: summarizeLatency(finalSummary.finalRequestLatency),
      attempt: summarizeLatency(attemptLatency),
      singleAttemptDelta: summarizeLatency(finalSummary.singleAttemptDelta),
    },
    cache: finalSummary.cache,
    accounts: [...accounts.values()].sort(
      (left, right) => right.attempts - left.attempts,
    ),
  };
}
