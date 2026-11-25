/**
 * The live gate: what an error from a keyed provider means in a live matrix cell.
 *
 * Until this existed, the provider matrix turned every credential, billing,
 * rate-limit and network error into a SKIP, so a nightly run could report 60
 * passed, 109 skipped and 0 failed while SambaNova answered "Invalid API key" on
 * seven cells, Mistral rate-limited nine and Cerebras, GMI Cloud and IO
 * Intelligence answered 402 or a tier gate. A provider that has its secret is
 * expected to work; when it answers 401 or 429 that is the finding, not an
 * excuse to skip.
 *
 * What a cell error becomes, in order. The SDK often drops the status from the
 * message ("Invalid baseten API key. Please check your credentials." carries no
 * 401), so the status is read from the error object and its `cause` chain first
 * (`statusCode`), and from the message text only when the object has none.
 *
 *   - not a provider-shaped error (an assertion, "empty response"): rethrown, a
 *     failure exactly as before.
 *   - a gap that says nothing about the account (model not found, no tool
 *     support) or a transient transport error (timeout, 5xx, connection reset):
 *     a SKIP as before, but the reason is printed whole and the provider does
 *     not count as passed.
 *   - a credential error (401, 403, invalid key), an account error (402,
 *     billing, a tier gate) or a rate limit (429) on a provider that is expected
 *     to be live (it has its secret, or its catalog JSON records a `liveMatrix`
 *     run):
 *       - excused by a dated allowlist entry that has not expired: a SKIP
 *         whose reason says ALLOWLISTED, counted and printed;
 *       - otherwise a `HardFail`, which `test()` never downgrades. The type is
 *         the whole point: the failure message necessarily contains "401" or
 *         "rate limit", which is exactly what `isExpectedProviderError()` turns
 *         into a skip, so the message cannot carry the decision.
 *
 * A provider with neither a secret nor evidence is not run at all (one quiet
 * SKIP line, no SDK call, so no `[NEUROLINK:ERROR] Failed to create provider`).
 *
 * A provider on LIVE_GATE_RETIRED is not run either, whatever secret or evidence
 * it has: its account was found dead and the decision was to stop testing it
 * rather than keep excusing it. It gets one SKIP line naming the reason and is
 * counted in its own row of the coverage table, so it stays visible every night.
 * Deleting its entry is how it comes back, once its account works.
 *
 * The allowlist is code on purpose: a known-broken provider is a decision with a
 * reason and a deadline, reviewed in a pull request, not a silent pattern. Each
 * entry may excuse a provider for at most MAX_ALLOWLIST_DAYS from the day it was
 * added, and an expired entry stops excusing. Keys are never printed: exact
 * secret values and key-shaped fragments in a message are redacted.
 */
import { HardFail, Skip, isExpectedProviderError, log } from "./harness.js";
import {
  LIVE_MATRIX_EVIDENCE_IDS,
  PROVIDERS,
  hasProviderEnvVars,
} from "./providerMatrix.js";

export type ErrorFamily =
  | "credential"
  | "account"
  | "rate-limit"
  | "transient"
  | "other";

export type CellOutcome = "passed" | "failed" | "allowlisted" | "skipped";

export type AllowlistEntry = {
  readonly provider: string;
  readonly reason: string;
  /** Day the entry was written, YYYY-MM-DD. */
  readonly added: string;
  /** Last day (UTC, inclusive) the entry excuses the provider, YYYY-MM-DD. */
  readonly expires: string;
};

/** Longest an allowlist entry may excuse a provider, counted from its `added` day. */
export const MAX_ALLOWLIST_DAYS = 14;

/**
 * Fewest providers that must PASS for a nightly run to count as healthy. The
 * 2026-10-18 nightly passed nine (baseten, cloudflare, fireworks, groq,
 * inception-labs, mancer, together-ai, upstage, xai). The floor sits one below
 * that: one provider losing its secret or all of its cells to a transient
 * outage does not page anyone, while a systemic break (a harness regression, a
 * wiped secret group, a build that exercises nothing) cannot stay green, and a
 * second provider silently dropping out fails the run.
 */
export const MIN_PASSED_PROVIDERS = 8;

/** Set to "1" by the nightly workflow; local and filtered runs do not enforce the floor. */
export const ENFORCE_FLOOR_ENV = "LIVE_MATRIX_ENFORCE_FLOOR";

/**
 * Overrides "today" (YYYY-MM-DD, UTC) for the allowlist's expiry check, so a
 * control can show an expired entry failing without waiting for the date. Not a
 * way to extend an entry: the check still compares against the entry's `expires`.
 */
export const TODAY_ENV = "NEUROLINK_LIVE_GATE_TODAY";

const MAX_REASON_CHARS = 1200;
const DAY_MS = 86_400_000;

// Every entry was added on 2026-10-18 from that night's raw log (run 39093329576),
// where the skip reason was cut at 100 characters and hid the cause.
export const LIVE_GATE_ALLOWLIST: readonly AllowlistEntry[] = [
  {
    provider: "sambanova",
    reason:
      "the vendor answers 'Invalid SambaNova API key' on the 5 SDK cells in the 2026-10-18 nightly (no HTTP status is printed in the log); whether the stored key is wrong or revoked is not verified",
    added: "2026-10-18",
    expires: "2026-11-01",
  },
  {
    provider: "mistral",
    reason:
      "rate limit exceeded on 5 SDK cells in the 2026-10-18 nightly (the skip lines print no status; one raw stream error line reads status 429; the 2 CLI cells are cut off at 100 characters); the escaping-stress suite got HTTP 403 from mistral on 2 cells, so the cause may be more than a rate limit and is not verified",
    added: "2026-10-18",
    expires: "2026-11-01",
  },
  {
    provider: "cerebras",
    reason:
      "status 402 on the 4 SDK cells in the 2026-10-18 nightly (3 of the 4 skip lines cut it off at 100 characters; the raw error lines print it); the account's billing or quota state is not verified",
    added: "2026-10-18",
    expires: "2026-11-01",
  },
  {
    provider: "gmicloud",
    reason:
      "status 402 on the 4 SDK cells in the 2026-10-18 nightly (3 of the 4 skip lines cut it off at 100 characters; the raw error lines print it); the account's billing or quota state is not verified",
    added: "2026-10-18",
    expires: "2026-11-01",
  },
  {
    provider: "io-intelligence",
    reason:
      "the vendor answers that the pinned models need a higher IO Intelligence tier on the 5 SDK cells in the 2026-10-18 nightly (the skip lines cut the sentence off at 100 characters; the raw error lines print it); whether it is the account's plan or the pinned model is not verified",
    added: "2026-10-18",
    expires: "2026-11-01",
  },
];

export type RetiredEntry = {
  readonly provider: string;
  readonly reason: string;
  /** First day (UTC) the provider is not run, YYYY-MM-DD. */
  readonly retired: string;
};

// The allowlist entries above expired on 2026-11-01 and every nightly since
// failed on the same five accounts (runs 45015094628, 45171682626 and
// 45403994922 each: 23 cells, all a 401, 402 or 429 from the vendor).
export const LIVE_GATE_RETIRED: readonly RetiredEntry[] = [
  {
    provider: "cerebras",
    reason: "the account answers HTTP 402 on every cell; it needs credit",
    retired: "2026-11-25",
  },
  {
    provider: "gmicloud",
    reason:
      "the account answers HTTP 402 'Insufficient balance' on every cell; it needs credit",
    retired: "2026-11-25",
  },
  {
    provider: "io-intelligence",
    reason:
      "the account answers HTTP 402: the pinned models need a higher IO Intelligence tier",
    retired: "2026-11-25",
  },
  {
    provider: "mistral",
    reason:
      "the account answers HTTP 429 on every cell, every night; it needs a paid plan or API budget",
    retired: "2026-11-25",
  },
  {
    provider: "sambanova",
    reason:
      "the vendor answers HTTP 401 'Invalid SambaNova API key'; SAMBANOVA_API_KEY needs a new key",
    retired: "2026-11-25",
  },
];

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

const parseDay = (day: string): number => {
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(day)
    ? Date.parse(`${day}T00:00:00Z`)
    : Number.NaN;
  if (Number.isNaN(parsed)) {
    throw new Error("a live-gate date is not a valid YYYY-MM-DD day");
  }
  return parsed;
};

export const todayUtc = (): string => {
  const override = process.env[TODAY_ENV];
  if (override !== undefined && override !== "") {
    parseDay(override);
    return override;
  }
  return new Date().toISOString().slice(0, 10);
};

export const isActive = (entry: AllowlistEntry, today: string): boolean =>
  parseDay(today) <= parseDay(entry.expires);

/** Everything wrong with an allowlist, as short sentences; empty when it is sound. */
export const allowlistProblems = (
  entries: readonly AllowlistEntry[],
): readonly string[] => {
  const seen = new Set<string>();
  return entries.flatMap((entry) => {
    const found: string[] = [];
    if (!(entry.provider in PROVIDERS)) {
      found.push(
        "an allowlist entry names a provider that is not in PROVIDERS",
      );
    }
    if (seen.has(entry.provider)) {
      found.push("an allowlist entry repeats a provider");
    }
    seen.add(entry.provider);
    if (entry.reason.trim() === "") {
      found.push("an allowlist entry has no reason");
    }
    const span = (parseDay(entry.expires) - parseDay(entry.added)) / DAY_MS;
    if (span < 0) {
      found.push("an allowlist entry expires before it was added");
    }
    if (span > MAX_ALLOWLIST_DAYS) {
      found.push(
        `an allowlist entry excuses a provider for ${span} days, more than ${MAX_ALLOWLIST_DAYS}`,
      );
    }
    return found;
  });
};

/** Everything wrong with the retired list, as short sentences; empty when it is sound. */
export const retiredProblems = (
  entries: readonly RetiredEntry[],
): readonly string[] => {
  const seen = new Set<string>();
  return entries.flatMap((entry) => {
    const found: string[] = [];
    if (!(entry.provider in PROVIDERS)) {
      found.push("a retired entry names a provider that is not in PROVIDERS");
    }
    if (seen.has(entry.provider)) {
      found.push("a retired entry repeats a provider");
    }
    seen.add(entry.provider);
    if (entry.reason.trim() === "") {
      found.push("a retired entry has no reason");
    }
    parseDay(entry.retired);
    return found;
  });
};

// ---------------------------------------------------------------------------
// Reading an error
// ---------------------------------------------------------------------------

// Order is deliberate: the more specific account and rate-limit readings come
// before the generic credential words, and a message that carries a status uses
// the status first.
const ACCOUNT_TEXT: readonly RegExp[] = [
  /\bpayment\s+required\b/,
  /\binsufficient[ _](?:credits?|funds?|quota|balance)\b/,
  /\bcredit\s+balance\b/,
  /\bbilling\b/,
  /\brequires?\s+(?:more\s+credits?|a\s+higher\b[^.]{0,60}?\btier\b)/,
  /\baccount\s+has\s+no\s+credits?\b/,
  /\bcan\s+only\s+afford\b/,
  /\byou\s+are\s+not\s+allowed\s+to\s+(?:use|generate|access)\b/,
  /\b(?:account|organization)\s+(?:must|needs?)(?:\s+to)?\s+be\s+verified\b/,
];

const RATE_LIMIT_TEXT: readonly RegExp[] = [
  /\brate[ _-]?limit(?:ed)?\b/,
  /\btoo\s+many\s+requests\b/,
  /\bquota[ _-]?exceeded\b/,
  /\bresource_exhausted\b/,
];

const CREDENTIAL_TEXT: readonly RegExp[] = [
  /\bunauthori[sz]ed\b/,
  /\bunauthenticated\b/,
  /\bauthentication\b/,
  /\bpermission[ _]denied\b/,
  /\baccess\s+denied\b/,
  /\bcredentials?\b/,
  /\b(?:invalid|incorrect|missing|wrong|expired|revoked|blocked)\b[^.]{0,40}\bapi[ _-]?key\b/,
  /\bapi[ _-]?key\b[^.]{0,40}\b(?:invalid|incorrect|missing|not\s+(?:set|found|provided)|blocked|expired|revoked)\b/,
  /(?:^|[^a-z0-9])api[ _-]?key(?=$|[^a-z0-9])/,
];

const TRANSIENT_TEXT: readonly RegExp[] = [
  /\b(?:econnrefused|econnreset|enotfound|eai_again|etimedout|ehostunreach|epipe)\b/,
  /\btimed[ _-]?out\b/,
  /\bdeadline\s+exceeded\b/,
  /\bservice\s+unavailable\b/,
  /\bbad\s+gateway\b/,
  /\bgateway\s+time-?out\b/,
  /\bnetwork\s+(?:error|unreachable|timeout|down|failure)\b/,
  /\bcannot\s+connect\b/,
  /\bconnection\s+(?:refused|reset)\b/,
  /\bcould\s+not\s+(?:be\s+)?resolved?\b/,
];

const STATUS_PATTERN =
  /(?:\bstatus(?:\s*code)?[\s:=]*|\bhttp[ _-]?(?:status\s*:?\s*)?|\()(\d{3})\b/gi;

/** The HTTP status a provider error message carries, when it names one. */
export const httpStatusOf = (message: string): number | undefined => {
  for (const match of message.matchAll(STATUS_PATTERN)) {
    const status = Number(match[1]);
    if (status >= 400 && status <= 599) {
      return status;
    }
  }
  return undefined;
};

const KNOWN_VENDOR_CODES =
  /\b(insufficient_quota|invalid_api_key|rate_limit_exceeded|authentication_error|permission_denied|payment_required|model_not_found|invalid_request_error|unauthenticated|resource_exhausted)\b/i;

/** The vendor's own error code when the message carries one (a JSON code field, or a well-known token). */
export const vendorCodeOf = (message: string): string | undefined => {
  const json = /"code"\s*:\s*"([A-Za-z0-9_.-]{3,64})"/.exec(message);
  return json?.[1] ?? KNOWN_VENDOR_CODES.exec(message)?.[1];
};

/**
 * Which kind of error a message is, or undefined when it is not provider-shaped
 * at all (an assertion about the SDK, "empty response", a TypeError). `status`
 * is the HTTP status the error object carried, when it carried one.
 */
export const familyOf = (
  message: string,
  status: number | undefined = httpStatusOf(message),
): ErrorFamily | undefined => {
  // A status the SDK attached to the error is more reliable than any wording,
  // and these three readings fail a keyed provider whatever the message says.
  if (status === 402) {
    return "account";
  }
  if (status === 429) {
    return "rate-limit";
  }
  if (status === 401 || status === 403) {
    return "credential";
  }
  if (!isExpectedProviderError(message)) {
    return undefined;
  }
  const lower = message.toLowerCase();
  if (ACCOUNT_TEXT.some((re) => re.test(lower))) {
    return "account";
  }
  if (RATE_LIMIT_TEXT.some((re) => re.test(lower))) {
    return "rate-limit";
  }
  if (CREDENTIAL_TEXT.some((re) => re.test(lower))) {
    return "credential";
  }
  if (
    status === 408 ||
    (status !== undefined && status >= 500) ||
    TRANSIENT_TEXT.some((re) => re.test(lower))
  ) {
    return "transient";
  }
  return "other";
};

export type ErrorFacts = {
  readonly message: string;
  readonly status: number | undefined;
  /** Class name of the innermost SDK error that is more specific than `Error`, such as `AuthenticationError`. */
  readonly className: string | undefined;
};

/** The message of an error, the HTTP status it or its causes carry, and the most specific class name in the chain. */
export const factsOf = (err: unknown): ErrorFacts => {
  const message = err instanceof Error ? err.message : String(err);
  let status: number | undefined;
  let className: string | undefined;
  let current: unknown = err;
  for (
    let depth = 0;
    depth < 5 && typeof current === "object" && current !== null;
    depth += 1
  ) {
    if (status === undefined) {
      const carried =
        "statusCode" in current && typeof current.statusCode === "number"
          ? current.statusCode
          : "status" in current && typeof current.status === "number"
            ? current.status
            : undefined;
      if (carried !== undefined && carried >= 400 && carried <= 599) {
        status = carried;
      }
    }
    if (
      className === undefined &&
      "name" in current &&
      typeof current.name === "string" &&
      current.name !== "Error" &&
      current.name !== ""
    ) {
      className = current.name;
    }
    current = "cause" in current ? current.cause : undefined;
  }
  return { message, status: status ?? httpStatusOf(message), className };
};

/** Whether the family is one that fails a provider expected to be live. */
export const failsKeyedProvider = (family: ErrorFamily): boolean =>
  family === "credential" || family === "account" || family === "rate-limit";

const secretValuesOf = (providerName: string): readonly string[] => {
  const entry = PROVIDERS[providerName];
  if (!entry) {
    return [];
  }
  return [...entry.envVars, ...(entry.apiKeyFallbackEnvVars ?? [])]
    .map((name) => process.env[name])
    .filter(
      (value): value is string => value !== undefined && value.length >= 8,
    );
};

/**
 * One line, no key. Exact secret values are replaced, and so are the shapes a
 * vendor echoes back (a masked key such as `568dfa*****d407`, a bearer token,
 * an `sk-` key), because a partly masked key is still part of the key.
 */
export const redact = (message: string, providerName: string): string => {
  const withoutSecrets = secretValuesOf(providerName).reduce(
    (text, secret) => text.split(secret).join("[redacted]"),
    message,
  );
  return withoutSecrets
    .replace(/\b[\w-]{3,}\*{3,}[\w-]{2,}\b/g, "[masked-key]")
    .replace(/\bBearer\s+[\w.~+/-]{8,}=*/gi, "Bearer [redacted]")
    .replace(/\bsk-[\w-]{8,}/g, "[redacted]")
    .replace(/\s+/g, " ")
    .trim();
};

/**
 * What a reader needs first, then the whole message. The status and the vendor
 * code lead, so a log line that is cut short later (the harness cuts a skip line
 * at 100 characters) still has them.
 */
export const describeError = (
  family: ErrorFamily,
  facts: ErrorFacts,
  providerName: string,
): string => {
  const { message, status } = facts;
  const code = vendorCodeOf(message) ?? facts.className;
  const clean = redact(message, providerName);
  const body =
    clean.length > MAX_REASON_CHARS
      ? `${clean.slice(0, MAX_REASON_CHARS)} [+${clean.length - MAX_REASON_CHARS} chars]`
      : clean;
  return `${family}${status ? ` HTTP ${status}` : ""}${code ? ` ${code}` : ""} | ${body}`;
};

// ---------------------------------------------------------------------------
// Who is expected to work
// ---------------------------------------------------------------------------

export const hasSecret = (providerName: string): boolean =>
  hasProviderEnvVars(providerName);

/** A provider with its secret, or with a recorded live run, is expected to answer. */
export const isExpectedLive = (providerName: string): boolean =>
  hasSecret(providerName) || LIVE_MATRIX_EVIDENCE_IDS.has(providerName);

export const activeAllowlistEntry = (
  providerName: string,
  today: string = todayUtc(),
): AllowlistEntry | undefined =>
  LIVE_GATE_ALLOWLIST.find(
    (entry) => entry.provider === providerName && isActive(entry, today),
  );

/** The provider's retired entry once its day has come, else undefined. */
export const retiredEntry = (
  providerName: string,
  today: string = todayUtc(),
): RetiredEntry | undefined =>
  LIVE_GATE_RETIRED.find(
    (entry) =>
      entry.provider === providerName &&
      parseDay(today) >= parseDay(entry.retired),
  );

// ---------------------------------------------------------------------------
// Cells
// ---------------------------------------------------------------------------

type CellCounts = Record<CellOutcome, number>;

const cellCounts = new Map<string, CellCounts>();
const announced = new Set<string>();
const quietlySkipped = new Set<string>();
const retiredSkipped = new Set<string>();

const countsFor = (providerName: string): CellCounts => {
  const existing = cellCounts.get(providerName);
  if (existing) {
    return existing;
  }
  const fresh: CellCounts = {
    passed: 0,
    failed: 0,
    allowlisted: 0,
    skipped: 0,
  };
  cellCounts.set(providerName, fresh);
  return fresh;
};

export const recordCell = (
  providerName: string,
  outcome: CellOutcome,
): void => {
  countsFor(providerName)[outcome] += 1;
};

/** Forget every recorded cell. For controls that run more than one scenario in a process. */
export const resetGate = (): void => {
  cellCounts.clear();
  announced.clear();
  quietlySkipped.clear();
  retiredSkipped.clear();
};

/**
 * Turns the error a cell caught into the outcome the gate decides, and throws
 * it. Never returns: a cell that passes calls `recordCell(name, "passed")`.
 */
export const settleCell = (providerName: string, err: unknown): never => {
  if (err instanceof HardFail) {
    recordCell(providerName, "failed");
    throw err;
  }
  if (err instanceof Skip) {
    recordCell(providerName, "skipped");
    throw err;
  }
  const facts = factsOf(err);
  const family = familyOf(facts.message, facts.status);
  if (family === undefined) {
    recordCell(providerName, "failed");
    throw err instanceof Error ? err : new Error(facts.message);
  }
  const reason = describeError(family, facts, providerName);
  if (!failsKeyedProvider(family)) {
    recordCell(providerName, "skipped");
    throw new Skip(reason);
  }
  if (!isExpectedLive(providerName)) {
    // Nothing says this provider should answer. A provider-shaped error is the
    // skip it always was; anything else is a failure, as it always was.
    if (isExpectedProviderError(facts.message)) {
      recordCell(providerName, "skipped");
      throw new Skip(`no secret and no live evidence | ${reason}`);
    }
    recordCell(providerName, "failed");
    throw err instanceof Error ? err : new Error(facts.message);
  }
  const entry = activeAllowlistEntry(providerName);
  if (entry) {
    recordCell(providerName, "allowlisted");
    if (!announced.has(providerName)) {
      announced.add(providerName);
      log(
        `  ALLOWLISTED [${providerName}] until ${entry.expires}: ${entry.reason} -- ${reason}`,
        "yellow",
      );
    }
    throw new Skip(
      `${reason.split(" | ")[0]} | ALLOWLISTED until ${entry.expires}`,
    );
  }
  recordCell(providerName, "failed");
  throw new HardFail(`[live-gate] ${providerName} ${reason}`);
};

/** One quiet line for a provider that is neither keyed nor live-verified; nothing is called. */
export const noteQuietSkip = (providerName: string): void => {
  quietlySkipped.add(providerName);
};

/** Records a provider the matrix did not run because it is on LIVE_GATE_RETIRED. */
export const noteRetired = (providerName: string): void => {
  retiredSkipped.add(providerName);
};

// ---------------------------------------------------------------------------
// Coverage
// ---------------------------------------------------------------------------

export type Coverage = {
  readonly withSecret: readonly string[];
  readonly passed: readonly string[];
  readonly failed: readonly string[];
  readonly allowlisted: readonly string[];
  readonly skipped: readonly string[];
  readonly noSecret: readonly string[];
  /** Providers on LIVE_GATE_RETIRED, which the run did not call. */
  readonly retired: readonly string[];
  /** Providers with a recorded live run that had no secret in this environment. */
  readonly evidenceWithoutSecret: readonly string[];
};

export const coverageOf = (targets: readonly string[]): Coverage => {
  const statusOf = (name: string): CellOutcome | "no-secret" | "retired" => {
    if (retiredSkipped.has(name)) {
      return "retired";
    }
    if (quietlySkipped.has(name)) {
      return "no-secret";
    }
    const counts = countsFor(name);
    if (counts.failed > 0) {
      return "failed";
    }
    if (counts.allowlisted > 0) {
      return "allowlisted";
    }
    return counts.passed > 0 ? "passed" : "skipped";
  };
  const byStatus = (wanted: CellOutcome | "no-secret" | "retired"): string[] =>
    targets.filter((name) => statusOf(name) === wanted).sort();
  return {
    withSecret: targets.filter((name) => hasSecret(name)).sort(),
    passed: byStatus("passed"),
    failed: byStatus("failed"),
    allowlisted: byStatus("allowlisted"),
    skipped: byStatus("skipped"),
    noSecret: byStatus("no-secret"),
    retired: byStatus("retired"),
    evidenceWithoutSecret: [...LIVE_MATRIX_EVIDENCE_IDS]
      .filter((name) => !hasSecret(name) && !retiredSkipped.has(name))
      .sort(),
  };
};

export const floorEnforced = (): boolean =>
  process.env[ENFORCE_FLOOR_ENV] === "1";

/** Why the run is unhealthy by count, or undefined when the floor holds or is not enforced. */
export const floorProblem = (coverage: Coverage): string | undefined =>
  floorEnforced() && coverage.passed.length < MIN_PASSED_PROVIDERS
    ? `only ${coverage.passed.length} providers passed (${coverage.passed.join(", ") || "none"}); the floor is ${MIN_PASSED_PROVIDERS}`
    : undefined;

const names = (list: readonly string[]): string =>
  list.length === 0 ? "-" : list.join(", ");

/** The table, as lines. Allowlisted providers carry their expiry. */
export const coverageLines = (
  coverage: Coverage,
  today: string = todayUtc(),
): readonly string[] => {
  const withDeadline = coverage.allowlisted.map((name) => {
    const entry = LIVE_GATE_ALLOWLIST.find((e) => e.provider === name);
    return entry ? `${name} (until ${entry.expires})` : name;
  });
  const expired = LIVE_GATE_ALLOWLIST.filter(
    (entry) => !isActive(entry, today),
  ).map((entry) => entry.provider);
  return [
    `providers with a secret            ${coverage.withSecret.length}  ${names(coverage.withSecret)}`,
    `passed                             ${coverage.passed.length}  ${names(coverage.passed)}`,
    `failed                             ${coverage.failed.length}  ${names(coverage.failed)}`,
    `allowlisted (known broken)         ${coverage.allowlisted.length}  ${names(withDeadline)}`,
    `skipped (gap or transient error)   ${coverage.skipped.length}  ${names(coverage.skipped)}`,
    `skipped, no secret (not run)       ${coverage.noSecret.length}  ${names(coverage.noSecret)}`,
    `retired from the nightly (not run) ${coverage.retired.length}  ${names(coverage.retired)}`,
    `live-verified, no secret here      ${coverage.evidenceWithoutSecret.length}  ${names(coverage.evidenceWithoutSecret)}`,
    `expired allowlist entries          ${expired.length}  ${names(expired)}`,
    floorEnforced()
      ? `floor (enforced)                   ${coverage.passed.length} passed, ${MIN_PASSED_PROVIDERS} required`
      : `floor (not enforced; set ${ENFORCE_FLOOR_ENV}=1)   ${coverage.passed.length} passed, ${MIN_PASSED_PROVIDERS} required`,
  ];
};
