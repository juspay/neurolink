import { createReadStream } from "node:fs";
import { lstat, readdir, realpath, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { createInterface } from "node:readline";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import type {
  ProxyAnalysisAccount,
  ProxyAnalysisAttemptRecord,
  ProxyAnalysisFinalRequestRecord,
  ProxyAnalysisOptions,
  ProxyAnalysisReport,
  ProxyAnalysisRoutingRecord,
  ProxyAnalysisStreamName,
  ProxyAccountRoutingCandidate,
  ProxyAccountRoutingDecision,
  ProxyLatencySummary,
} from "../types/index.js";
import {
  ACCOUNT_COOLING_REASONS,
  PROXY_ACCOUNT_TYPES,
  PROXY_ACCOUNT_ROUTING_MODES,
  PROXY_ACCOUNT_ROUTING_REASONS,
  PROXY_ACCOUNT_ROUTING_STRATEGIES,
} from "./routingEvidence.js";
import {
  calculateCost,
  hasPricing,
  isExactPricingMatch,
} from "../utils/pricing.js";

const LIFECYCLE_FILE_PATTERN = /^proxy-lifecycle-\d{4}-\d{2}-\d{2}\.jsonl$/;
const REQUEST_FILE_PATTERN = /^proxy-\d{4}-\d{2}-\d{2}\.jsonl$/;
const ATTEMPT_FILE_PATTERN = /^proxy-attempts-\d{4}-\d{2}-\d{2}\.jsonl$/;
const DEBUG_FILE_PATTERN = /^proxy-debug-\d{4}-\d{2}-\d{2}\.jsonl$/;
const ARTIFACT_STAT_CONCURRENCY = 64;
const LIFECYCLE_EVENTS = new Set([
  "request_accepted",
  "response_headers",
  "response_first_chunk",
  "request_terminal",
]);
const ROUTING_STRATEGIES = new Set<string>(PROXY_ACCOUNT_ROUTING_STRATEGIES);
const ROUTING_MODES = new Set<string>(PROXY_ACCOUNT_ROUTING_MODES);
const ROUTING_REASONS = new Set<string>(PROXY_ACCOUNT_ROUTING_REASONS);
const ROUTING_ACCOUNT_TYPES = new Set<string>(PROXY_ACCOUNT_TYPES);
const COOLING_REASONS = new Set<string>(ACCOUNT_COOLING_REASONS);
const QUOTA_FRESHNESS_VALUES = new Set([
  "unknown",
  "fresh",
  "stale_known",
  "refresh_due",
]);
const QUOTA_REFRESH_REASONS = new Set([
  "startup_unknown",
  "handoff_prewarm",
  "ambiguous_snapshot",
  "manual",
]);
const QUOTA_SATURATION_KINDS = new Set(["none", "soft", "hard"]);
const MAX_RETAINED_ROUTING_RECORDS = 200;
const MAX_ROUTING_RECORDS_BEFORE_COMPACTION = MAX_RETAINED_ROUTING_RECORDS * 2;

function isContainedPath(root: string, candidate: string): boolean {
  const candidateRelative = relative(root, candidate);
  return (
    candidateRelative.length > 0 &&
    !isAbsolute(candidateRelative) &&
    candidateRelative !== ".." &&
    !candidateRelative.startsWith(`..${sep}`)
  );
}

async function inspectBodyArtifact(
  artifactPath: string,
  canonicalBodiesRoot: string | null,
): Promise<"invalid" | "missing" | "present"> {
  if (!canonicalBodiesRoot) {
    return "missing";
  }
  try {
    const canonicalArtifactPath = await realpath(artifactPath);
    if (!isContainedPath(canonicalBodiesRoot, canonicalArtifactPath)) {
      return "invalid";
    }
    return (await stat(canonicalArtifactPath)).isFile() ? "present" : "missing";
  } catch {
    return "missing";
  }
}

function increment(counter: Record<string, number>, key: string): void {
  counter[key] = (counter[key] ?? 0) + 1;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || (typeof value === "string" && value.length > 0);
}

function isNullableFiniteNumber(value: unknown): value is number | null {
  return value === null || finiteNumber(value) !== null;
}

function routingCandidateValue(
  value: unknown,
): ProxyAccountRoutingCandidate | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const candidate = value as Record<string, unknown>;
  const requiredBooleanFields = [
    "configuredPrimary",
    "usable",
    "saturated",
    "quotaObserved",
    "coolingActive",
  ];
  const requiredNullableNumberFields = [
    "quotaLastUpdated",
    "quotaAgeMs",
    "coolingUntil",
    "sessionUsed",
    "sessionResetAt",
    "sessionResetBucket",
    "weeklyUsed",
    "weeklyResetAt",
  ];
  const requiredNullableStringFields = [
    "unifiedStatus",
    "overageStatus",
    "sessionStatus",
    "weeklyStatus",
  ];
  const optionalNullableStringFields = [
    "fallbackStatus",
    "upgradePaths",
    "scopedModel",
    "scopedStatus",
  ];
  const optionalNullableNumberFields = ["scopedUsed", "scopedResetAt"];
  if (
    !stringValue(candidate.account) ||
    typeof candidate.accountType !== "string" ||
    !ROUTING_ACCOUNT_TYPES.has(candidate.accountType) ||
    !Number.isInteger(candidate.sourceIndex) ||
    (candidate.sourceIndex as number) < 0 ||
    !Number.isInteger(candidate.rank) ||
    (candidate.rank as number) < 0 ||
    requiredBooleanFields.some(
      (field) => typeof candidate[field] !== "boolean",
    ) ||
    requiredNullableNumberFields.some(
      (field) => !isNullableFiniteNumber(candidate[field]),
    ) ||
    requiredNullableStringFields.some(
      (field) => !isNullableString(candidate[field]),
    ) ||
    optionalNullableStringFields.some(
      (field) =>
        field in candidate &&
        candidate[field] !== undefined &&
        !isNullableString(candidate[field]),
    ) ||
    ("quotaStale" in candidate &&
      candidate.quotaStale !== undefined &&
      typeof candidate.quotaStale !== "boolean") ||
    ("overageEligible" in candidate &&
      candidate.overageEligible !== undefined &&
      typeof candidate.overageEligible !== "boolean") ||
    ("quotaFreshness" in candidate &&
      candidate.quotaFreshness !== undefined &&
      (typeof candidate.quotaFreshness !== "string" ||
        !QUOTA_FRESHNESS_VALUES.has(candidate.quotaFreshness))) ||
    ("refreshNeeded" in candidate &&
      candidate.refreshNeeded !== undefined &&
      typeof candidate.refreshNeeded !== "boolean") ||
    ("refreshInFlight" in candidate &&
      candidate.refreshInFlight !== undefined &&
      typeof candidate.refreshInFlight !== "boolean") ||
    ("refreshReason" in candidate &&
      candidate.refreshReason !== undefined &&
      candidate.refreshReason !== null &&
      (typeof candidate.refreshReason !== "string" ||
        !QUOTA_REFRESH_REASONS.has(candidate.refreshReason))) ||
    [
      "lastRefreshAttemptAt",
      "lastRefreshSuccessAt",
      "nextRefreshEligibleAt",
      ...optionalNullableNumberFields,
    ].some(
      (field) =>
        field in candidate &&
        candidate[field] !== undefined &&
        !isNullableFiniteNumber(candidate[field]),
    ) ||
    ("saturationKind" in candidate &&
      candidate.saturationKind !== undefined &&
      (typeof candidate.saturationKind !== "string" ||
        !QUOTA_SATURATION_KINDS.has(candidate.saturationKind))) ||
    ("softLimitOverrideReason" in candidate &&
      candidate.softLimitOverrideReason !== undefined &&
      candidate.softLimitOverrideReason !== null &&
      candidate.softLimitOverrideReason !== "overage" &&
      candidate.softLimitOverrideReason !== "weekly_expiry") ||
    !(
      candidate.coolingReason === null ||
      (typeof candidate.coolingReason === "string" &&
        COOLING_REASONS.has(candidate.coolingReason))
    )
  ) {
    return null;
  }
  return {
    account: candidate.account as string,
    accountType:
      candidate.accountType as ProxyAccountRoutingCandidate["accountType"],
    sourceIndex: candidate.sourceIndex as number,
    rank: candidate.rank as number,
    configuredPrimary: candidate.configuredPrimary as boolean,
    usable: candidate.usable as boolean,
    saturated: candidate.saturated as boolean,
    quotaObserved: candidate.quotaObserved as boolean,
    quotaStale: candidate.quotaStale === true,
    quotaFreshness:
      candidate.quotaFreshness as ProxyAccountRoutingCandidate["quotaFreshness"],
    refreshNeeded:
      candidate.refreshNeeded as ProxyAccountRoutingCandidate["refreshNeeded"],
    refreshReason:
      candidate.refreshReason as ProxyAccountRoutingCandidate["refreshReason"],
    refreshInFlight:
      candidate.refreshInFlight as ProxyAccountRoutingCandidate["refreshInFlight"],
    lastRefreshAttemptAt:
      candidate.lastRefreshAttemptAt as ProxyAccountRoutingCandidate["lastRefreshAttemptAt"],
    lastRefreshSuccessAt:
      candidate.lastRefreshSuccessAt as ProxyAccountRoutingCandidate["lastRefreshSuccessAt"],
    nextRefreshEligibleAt:
      candidate.nextRefreshEligibleAt as ProxyAccountRoutingCandidate["nextRefreshEligibleAt"],
    saturationKind:
      candidate.saturationKind as ProxyAccountRoutingCandidate["saturationKind"],
    softLimitOverrideReason:
      candidate.softLimitOverrideReason as ProxyAccountRoutingCandidate["softLimitOverrideReason"],
    quotaLastUpdated: candidate.quotaLastUpdated as number | null,
    quotaAgeMs: candidate.quotaAgeMs as number | null,
    coolingActive: candidate.coolingActive as boolean,
    coolingReason:
      candidate.coolingReason as ProxyAccountRoutingCandidate["coolingReason"],
    coolingUntil: candidate.coolingUntil as number | null,
    unifiedStatus: candidate.unifiedStatus as string | null,
    fallbackStatus: candidate.fallbackStatus as string | null | undefined,
    upgradePaths: candidate.upgradePaths as string | null | undefined,
    overageEligible: candidate.overageEligible as boolean | undefined,
    overageStatus: candidate.overageStatus as string | null,
    sessionStatus: candidate.sessionStatus as string | null,
    sessionUsed: candidate.sessionUsed as number | null,
    sessionResetAt: candidate.sessionResetAt as number | null,
    sessionResetBucket: candidate.sessionResetBucket as number | null,
    weeklyStatus: candidate.weeklyStatus as string | null,
    weeklyUsed: candidate.weeklyUsed as number | null,
    weeklyResetAt: candidate.weeklyResetAt as number | null,
    scopedModel: candidate.scopedModel as string | null | undefined,
    scopedStatus: candidate.scopedStatus as string | null | undefined,
    scopedUsed: candidate.scopedUsed as number | null | undefined,
    scopedResetAt: candidate.scopedResetAt as number | null | undefined,
  };
}

function routingDecisionValue(
  value: unknown,
): ProxyAccountRoutingDecision | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const decision = value as Record<string, unknown>;
  const candidates = Array.isArray(decision.candidates)
    ? decision.candidates.map(routingCandidateValue)
    : [];
  if (
    decision.schemaVersion !== 1 ||
    !stringValue(decision.evaluatedAt) ||
    !Number.isFinite(Date.parse(String(decision.evaluatedAt))) ||
    typeof decision.strategy !== "string" ||
    !ROUTING_STRATEGIES.has(decision.strategy) ||
    typeof decision.mode !== "string" ||
    !ROUTING_MODES.has(decision.mode) ||
    typeof decision.selectionReason !== "string" ||
    !ROUTING_REASONS.has(decision.selectionReason) ||
    typeof decision.quotaRoutingEnabled !== "boolean" ||
    typeof decision.quotaInputsUsed !== "boolean" ||
    finiteNumber(decision.sessionSoftLimit) === null ||
    (decision.sessionSoftLimit as number) <= 0 ||
    (decision.sessionSoftLimit as number) > 1 ||
    !Number.isInteger(decision.sessionResetToleranceMs) ||
    (decision.sessionResetToleranceMs as number) <= 0 ||
    !isNullableString(decision.configuredPrimaryAccount) ||
    typeof decision.configuredPrimaryMatched !== "boolean" ||
    !Number.isInteger(decision.rotationOffset) ||
    (decision.rotationOffset as number) < 0 ||
    !stringValue(decision.initialAccount) ||
    candidates.length === 0 ||
    candidates.some((candidate) => candidate === null)
  ) {
    return null;
  }
  return {
    schemaVersion: 1,
    evaluatedAt: decision.evaluatedAt as string,
    strategy: decision.strategy as ProxyAccountRoutingDecision["strategy"],
    mode: decision.mode as ProxyAccountRoutingDecision["mode"],
    selectionReason:
      decision.selectionReason as ProxyAccountRoutingDecision["selectionReason"],
    quotaRoutingEnabled: decision.quotaRoutingEnabled as boolean,
    quotaInputsUsed: decision.quotaInputsUsed as boolean,
    sessionSoftLimit: decision.sessionSoftLimit as number,
    sessionResetToleranceMs: decision.sessionResetToleranceMs as number,
    configuredPrimaryAccount: decision.configuredPrimaryAccount as
      | string
      | null,
    configuredPrimaryMatched: decision.configuredPrimaryMatched as boolean,
    rotationOffset: decision.rotationOffset as number,
    initialAccount: decision.initialAccount as string,
    candidates: candidates as ProxyAccountRoutingCandidate[],
  };
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

function parseUntil(value: string, nowMs: number): number {
  let parsed: number;
  try {
    parsed = parseSince(value, nowMs);
  } catch {
    throw new Error(
      `Invalid --until value "${value}". Use an ISO timestamp or a duration such as 6h, 1d, or 1w.`,
    );
  }
  if (parsed > nowMs) {
    throw new Error(
      `Invalid --until value "${value}". It must not be later than the analysis start time.`,
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
  let outputTokens = 0;
  let estimatedCostUsd = 0;
  let requestsPriced = 0;
  let requestsPricedByPrefix = 0;
  let requestsUnpriced = 0;
  const modelsPricedByPrefix = new Set<string>();
  const unpricedModels = new Set<string>();
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
      request.outputTokens !== null ||
      request.cacheReadTokens !== null ||
      request.cacheCreationTokens !== null
    ) {
      requestsWithUsage += 1;
      inputTokens += request.inputTokens ?? 0;
      outputTokens += request.outputTokens ?? 0;
      cacheReadTokens += request.cacheReadTokens ?? 0;
      cacheCreationTokens += request.cacheCreationTokens ?? 0;
      requestsWithCacheRead += (request.cacheReadTokens ?? 0) > 0 ? 1 : 0;

      if (request.model) {
        // Records written before `provider` existed carry only a model name.
        // "openai-compatible" resolves to the cross-provider table search in
        // pricing.ts, which finds the model wherever it lives — a far better
        // guess than assuming Anthropic and pricing a GPT model at $0.
        const cost = calculateCost(
          request.provider ?? "openai-compatible",
          request.model,
          {
            input: request.inputTokens ?? 0,
            output: request.outputTokens ?? 0,
            total:
              (request.inputTokens ?? 0) +
              (request.outputTokens ?? 0) +
              (request.cacheCreationTokens ?? 0) +
              (request.cacheReadTokens ?? 0),
            cacheCreationTokens: request.cacheCreationTokens ?? 0,
            cacheReadTokens: request.cacheReadTokens ?? 0,
          },
        );
        // Ask the table directly rather than inferring from cost > 0: a real
        // request with trivial usage can round to $0.000000 and is priced, not
        // unpriced.
        const priced = hasPricing(
          request.provider ?? "openai-compatible",
          request.model,
        );
        if (priced) {
          estimatedCostUsd += cost;
          requestsPriced += 1;
          // A prefix fallback means the rate was inherited from a
          // similarly-named model, not quoted for this one. Surface it rather
          // than presenting a guess as a figure.
          if (
            !isExactPricingMatch(
              request.provider ?? "openai-compatible",
              request.model,
            )
          ) {
            requestsPricedByPrefix += 1;
            modelsPricedByPrefix.add(request.model);
          }
        } else {
          requestsUnpriced += 1;
          unpricedModels.add(request.model);
        }
      }
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
      outputTokens,
      estimatedCostUsd: Number(estimatedCostUsd.toFixed(6)),
      requestsPriced,
      requestsPricedByPrefix,
      modelsPricedByPrefix: [...modelsPricedByPrefix].sort(),
      requestsUnpriced,
      unpricedModels: [...unpricedModels].sort(),
      requestHitRate:
        requestsWithUsage > 0
          ? Number((requestsWithCacheRead / requestsWithUsage).toFixed(4))
          : null,
    },
    finalRequestLatency,
    singleAttemptDelta,
  };
}

function summarizeRouting(
  finalRequests: Map<string, ProxyAnalysisFinalRequestRecord>,
): ProxyAnalysisReport["routing"] {
  const modes: Record<string, number> = {};
  const selectionReasons: Record<string, number> = {};
  const initialAccounts: Record<string, number> = {};
  const retainedRecords: Array<{
    record: ProxyAnalysisRoutingRecord;
    timestampMs: number;
    sequence: number;
  }> = [];
  let totalRecords = 0;
  let finalAccountChanges = 0;
  let finalOutsideCandidateSet = 0;

  for (const [requestId, request] of finalRequests) {
    const decision = request.routingDecision;
    if (!decision) {
      continue;
    }
    increment(modes, decision.mode);
    increment(selectionReasons, decision.selectionReason);
    increment(initialAccounts, decision.initialAccount);
    const finalCandidate = decision.candidates.some(
      (candidate) =>
        candidate.account === request.account &&
        candidate.accountType === request.accountType,
    );
    if (!finalCandidate) {
      finalOutsideCandidateSet += 1;
    } else if (decision.initialAccount !== request.account) {
      finalAccountChanges += 1;
    }
    totalRecords += 1;
    retainedRecords.push({
      record: {
        requestId,
        timestamp: request.timestamp,
        responseStatus: request.status,
        finalAccount: request.account,
        finalAccountType: request.accountType,
        decision,
      },
      timestampMs: Date.parse(request.timestamp),
      sequence: totalRecords,
    });
    if (retainedRecords.length > MAX_ROUTING_RECORDS_BEFORE_COMPACTION) {
      retainedRecords.sort(
        (left, right) =>
          left.timestampMs - right.timestampMs ||
          left.sequence - right.sequence,
      );
      retainedRecords.splice(
        0,
        retainedRecords.length - MAX_RETAINED_ROUTING_RECORDS,
      );
    }
  }

  retainedRecords.sort(
    (left, right) =>
      left.timestampMs - right.timestampMs || left.sequence - right.sequence,
  );
  const records = retainedRecords
    .slice(-MAX_RETAINED_ROUTING_RECORDS)
    .map(({ record }) => record);

  return {
    modes,
    selectionReasons,
    initialAccounts,
    finalAccountChanges,
    finalOutsideCandidateSet,
    totalRecords,
    records,
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
    debugFiles: matching(DEBUG_FILE_PATTERN),
  };
}

/** Analyze local proxy logs without reading request or response body artifacts. */
export async function analyzeProxyLogs(
  options?: ProxyAnalysisOptions,
): Promise<ProxyAnalysisReport> {
  const nowMs = options?.nowMs ?? Date.now();
  const sinceMs = parseSince(options?.since ?? "24h", nowMs);
  const untilMs = options?.until ? parseUntil(options.until, nowMs) : nowMs;
  if (untilMs < sinceMs) {
    throw new Error(
      `Invalid analysis window: --until must not be earlier than --since.`,
    );
  }
  const logsDir = resolve(
    options?.logsDir ?? join(homedir(), ".neurolink", "logs"),
  );
  const { lifecycleFiles, requestFiles, attemptFiles, debugFiles } =
    await discoverLogFiles(logsDir);

  const observedRanges: Record<
    ProxyAnalysisStreamName,
    { from: number | null; to: number | null }
  > = {
    lifecycle: { from: null, to: null },
    requests: { from: null, to: null },
    attempts: { from: null, to: null },
    debug: { from: null, to: null },
  };
  const observeTimestamp = (
    stream: ProxyAnalysisStreamName,
    record: Record<string, unknown>,
  ): number | null => {
    const timestamp = Date.parse(String(record.timestamp ?? ""));
    if (!Number.isFinite(timestamp)) {
      return null;
    }
    const range = observedRanges[stream];
    range.from =
      range.from === null ? timestamp : Math.min(range.from, timestamp);
    range.to = range.to === null ? timestamp : Math.max(range.to, timestamp);
    return timestamp;
  };

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
        const timestamp = observeTimestamp("lifecycle", record);
        if (timestamp === null || timestamp < sinceMs || timestamp > untilMs) {
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
  const attemptTransportScopes: Record<string, number> = {};
  let attemptRateLimits = 0;
  let transientRateLimits = 0;
  let quotaRateLimits = 0;
  let unclassifiedRateLimits = 0;

  for (const filePath of attemptFiles) {
    linesRead += await readJsonLines(
      filePath,
      (record) => {
        const timestamp = observeTimestamp("attempts", record);
        if (timestamp === null || timestamp < sinceMs || timestamp > untilMs) {
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
        const transportScope = stringValue(record.transportScope);
        if (transportScope) {
          increment(attemptTransportScopes, transportScope);
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
  let validRoutingDecisions = 0;
  let invalidRoutingDecisions = 0;
  let absentRoutingDecisions = 0;
  for (const filePath of requestFiles) {
    linesRead += await readJsonLines(
      filePath,
      (record) => {
        const timestamp = observeTimestamp("requests", record);
        if (timestamp === null) {
          return;
        }
        const requestId = stringValue(record.requestId);
        if (!requestId) {
          return;
        }
        // A streamed request is logged twice — once when the response headers
        // are known, again when the body finishes and its token counts arrive
        // — and those two writes can straddle the window edge. A Codex turn
        // whose headers land at 23:59:50 and whose stream ends at 00:00:05 has
        // every token it spent in the second record. Filtering that record out
        // by its own timestamp would leave the request counted as completed
        // but contributing nothing to tokens or cost, with nothing in the
        // report to say so. A request the window already admitted therefore
        // keeps accepting its own later records.
        const alreadyAdmitted =
          finalRequests.has(requestId) || terminalStreamErrors.has(requestId);
        if (!alreadyAdmitted && (timestamp < sinceMs || timestamp > untilMs)) {
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
        const hasRoutingDecision = Object.prototype.hasOwnProperty.call(
          record,
          "routingDecision",
        );
        const routingDecision = hasRoutingDecision
          ? routingDecisionValue(record.routingDecision)
          : null;
        if (routingDecision) {
          validRoutingDecisions += 1;
        } else if (hasRoutingDecision) {
          invalidRoutingDecisions += 1;
        } else {
          absentRoutingDecisions += 1;
        }
        const parsed: ProxyAnalysisFinalRequestRecord = {
          timestamp: new Date(timestamp).toISOString(),
          status,
          durationMs: finiteNumber(record.responseTimeMs),
          account: stringValue(record.account) ?? "unknown",
          accountType: stringValue(record.accountType) ?? "unknown",
          model: stringValue(record.model),
          provider: stringValue(record.provider),
          inputTokens: finiteNumber(record.inputTokens),
          outputTokens: finiteNumber(record.outputTokens),
          cacheReadTokens: finiteNumber(record.cacheReadTokens),
          cacheCreationTokens: finiteNumber(record.cacheCreationTokens),
          errorType: stringValue(record.errorType),
          errorCode: stringValue(record.errorCode),
          routingDecision,
        };
        // A request may be logged twice: once when the response headers are
        // known, and again when a streamed body finishes and its token counts
        // become available (the Codex engine does this). Merge rather than
        // replace, so the later usage-bearing record cannot drop an errorType
        // the first one carried, and vice versa.
        const previous = finalRequests.get(requestId);
        finalRequests.set(
          requestId,
          previous
            ? {
                ...previous,
                ...Object.fromEntries(
                  Object.entries(parsed).filter(
                    ([, value]) => value !== null && value !== undefined,
                  ),
                ),
                // Attribute the request to when it was first seen. A late
                // completion record must not move it out of the window that
                // admitted it.
                timestamp: previous.timestamp,
              }
            : parsed,
        );
      },
      () => {
        malformedLines += 1;
      },
    );
  }

  let capturesIndexed = 0;
  let truncatedCaptures = 0;
  let writeFailures = 0;
  let invalidPaths = 0;
  const referencedArtifacts = new Set<string>();
  const bodiesRoot = resolve(logsDir, "bodies");
  for (const filePath of debugFiles) {
    linesRead += await readJsonLines(
      filePath,
      (record) => {
        const timestamp = observeTimestamp("debug", record);
        if (timestamp === null || timestamp < sinceMs || timestamp > untilMs) {
          return;
        }
        if (record.type !== "body_capture") {
          return;
        }
        capturesIndexed += 1;
        truncatedCaptures += record.bodyTruncated === true ? 1 : 0;
        writeFailures += record.bodyWriteFailed === true ? 1 : 0;
        const bodyPath = stringValue(record.bodyPath);
        if (!bodyPath) {
          return;
        }
        if (bodyPath.includes("\0") || bodyPath.split(/[\\/]/).includes("..")) {
          invalidPaths += 1;
          return;
        }
        const resolvedBodyPath = resolve(logsDir, bodyPath);
        if (!isContainedPath(bodiesRoot, resolvedBodyPath)) {
          invalidPaths += 1;
          return;
        }
        referencedArtifacts.add(resolvedBodyPath);
      },
      () => {
        malformedLines += 1;
      },
    );
  }
  const artifactPaths = [...referencedArtifacts];
  let canonicalBodiesRoot: string | null = null;
  let bodiesRootUnsafe = false;
  try {
    const bodiesRootStat = await lstat(bodiesRoot);
    if (bodiesRootStat.isDirectory() && !bodiesRootStat.isSymbolicLink()) {
      canonicalBodiesRoot = await realpath(bodiesRoot);
    } else {
      bodiesRootUnsafe = true;
    }
  } catch {
    // A missing body directory means every lexically valid reference is absent.
  }
  let artifactsPresent = 0;
  let artifactsMissing = 0;
  for (
    let offset = 0;
    offset < artifactPaths.length;
    offset += ARTIFACT_STAT_CONCURRENCY
  ) {
    const presence = await Promise.all(
      artifactPaths
        .slice(offset, offset + ARTIFACT_STAT_CONCURRENCY)
        .map((artifactPath) =>
          bodiesRootUnsafe
            ? Promise.resolve<"invalid" | "missing" | "present">("invalid")
            : inspectBodyArtifact(artifactPath, canonicalBodiesRoot),
        ),
    );
    artifactsPresent += presence.filter((value) => value === "present").length;
    artifactsMissing += presence.filter((value) => value === "missing").length;
    invalidPaths += presence.filter((value) => value === "invalid").length;
  }
  const artifactsReferenced = artifactsPresent + artifactsMissing;

  const finalSummary = summarizeFinalRequests(
    finalRequests,
    terminalStreamErrors,
    attemptsByRequest,
    accounts,
  );
  const routingSummary = summarizeRouting(finalRequests);
  const streamComplete = (stream: ProxyAnalysisStreamName): boolean => {
    const range = observedRanges[stream];
    return range.from !== null && range.from <= sinceMs;
  };

  return {
    generatedAt: new Date(nowMs).toISOString(),
    since: new Date(sinceMs).toISOString(),
    until: new Date(untilMs).toISOString(),
    logsDir,
    files: {
      lifecycle: lifecycleFiles.length,
      requests: requestFiles.length,
      attempts: attemptFiles.length,
      debug: debugFiles.length,
    },
    coverage: {
      lifecycle:
        accepted.size + headers.size + firstChunks.size + terminal.size > 0,
      finalRequests: finalRequests.size > 0 || terminalStreamErrors.size > 0,
      attempts: totalAttempts > 0,
      attemptLatency: attemptLatency.length > 0,
      cacheUsage: finalSummary.cache.requestsWithUsage > 0,
      routingDecisions: routingSummary.totalRecords > 0,
      comparableRequestAttempts:
        streamComplete("requests") && streamComplete("attempts"),
    },
    dataQuality: {
      linesRead,
      malformedLines,
      unsupportedLifecycleLines,
      lifecycleSequenceGaps,
      lifecycleSequenceDuplicates,
      streams: Object.fromEntries(
        Object.entries(observedRanges).map(([stream, range]) => [
          stream,
          {
            observedFrom:
              range.from === null ? null : new Date(range.from).toISOString(),
            observedTo:
              range.to === null ? null : new Date(range.to).toISOString(),
            startsAtOrBeforeRequestedWindow:
              range.from !== null && range.from <= sinceMs,
            completeWindow: range.from !== null && range.from <= sinceMs,
          },
        ]),
      ) as ProxyAnalysisReport["dataQuality"]["streams"],
      bodyArtifacts: {
        capturesIndexed,
        artifactsReferenced,
        artifactsPresent,
        artifactsMissing,
        invalidPaths,
        writeFailures,
        truncatedCaptures,
      },
      routingDecisions: {
        valid: validRoutingDecisions,
        invalid: invalidRoutingDecisions,
        absent: absentRoutingDecisions,
      },
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
      transportScopes: attemptTransportScopes,
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
    routing: routingSummary,
    accounts: [...accounts.values()].sort(
      (left, right) => right.attempts - left.attempts,
    ),
  };
}
