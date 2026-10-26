#!/usr/bin/env tsx

/**
 * NeuroLink Security Validation Script
 *
 * Comprehensive security checks for the NeuroLink codebase including:
 * - Professional secret detection with Gitleaks integration (required under
 *   CI=true; basic-pattern fallback elsewhere)
 * - Dependency vulnerability scanning, gated by GitHub advisory id with a
 *   declared dependency path, an expiry and a fix check per acceptance
 * - License compliance checks
 * - Security best practices validation
 * - File permission validation
 */

import { execSync, spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import {
  GITLEAKS_CONFIG_FILE,
  buildGitleaksArgs,
  interpretGitleaksRun,
  type GitleaksFinding,
  type GitleaksRunOutcome,
} from "./lib/gitleaksRun.js";
import { isPlaceholderSecret, splitRgMatch } from "./lib/secretPlaceholder.js";

// ANSI color codes for output formatting
const colors: Record<string, string> = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

// Configuration: Critical security rule IDs that should trigger build failures
const CRITICAL_SECURITY_RULES = [
  "aws-access-token",
  "openai-api-key",
  "github-token",
  "neurolink-api-key",
  "private-key",
];

// Configuration: production advisories accepted as risk, keyed by GitHub
// advisory id.
//
// Two earlier models are worth not repeating. A list of pnpm advisory ids made
// every newly published advisory a hard failure until a human pasted its id in.
// The per-PACKAGE severity ceiling that replaced it went the other way: any
// advisory on a listed package at or below the ceiling was accepted without a
// human ever looking, the free-text `reason` was never checked against the
// dependency path pnpm reported, nothing expired, and nothing noticed when a
// fix was published. The 2026-10 audit found the gate green over 19
// high-severity production advisories, eight of them in a DIRECT dependency
// with a published fix, under a reason that called it transitive.
//
// This model keeps the review decision explicit and checkable on every run:
//
//   ghsa          the one advisory being accepted. A sibling advisory in the
//                 same package is a new decision, never more of the same.
//   package       the module pnpm reports. A mismatch fails.
//   path          a prefix every `findings[].paths` entry must start with, so
//                 a reason that says "transitive via X" fails the moment pnpm
//                 reports the package as `.>pkg` (a direct dependency).
//   expires       YYYY-MM-DD. An expired acceptance fails the build until it
//                 is renewed — an acceptance is a debt with a due date.
//   reason        why the advisory does not reach this package's consumers.
//   fixBlockedBy  REQUIRED when the advisory lists a patched version: an
//                 acceptance of a fixable advisory has to say what blocks the
//                 fix, or the fix is the answer.
//
// Snapshot 2026-10-26, after the dependency floors were raised: `pnpm audit
// --prod --json` reports zero advisories, so the table is empty. That is the
// steady state to return to, not a milestone. `--prod` structurally excludes
// dev-only trees.
type AcceptedRiskEntry = {
  readonly ghsa: string;
  readonly package: string;
  readonly path: string;
  readonly expires: string;
  readonly reason: string;
  readonly fixBlockedBy?: string;
};

const ACCEPTED_RISK_ADVISORIES: readonly AcceptedRiskEntry[] = [];

/** GitHub advisory ids use a fixed alphabet; a typo here would accept nothing and warn forever. */
const GHSA_ID_PATTERN =
  /^GHSA-[23456789cfghjmpqrvwx]{4}-[23456789cfghjmpqrvwx]{4}-[23456789cfghjmpqrvwx]{4}$/;

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Problems with the table itself, independent of what `pnpm audit` reports.
 * Pure so the shape can be pinned by a test; every string is one failure.
 */
function validateAcceptedRiskTable(
  table: readonly AcceptedRiskEntry[],
  today: Date,
): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  const todayIso = today.toISOString().slice(0, 10);
  table.forEach((entry, index) => {
    const label = `entry ${index + 1} (${entry.ghsa || "no id"})`;
    if (!GHSA_ID_PATTERN.test(entry.ghsa)) {
      problems.push(`${label}: ghsa is not a GHSA-xxxx-xxxx-xxxx id`);
    }
    if (seen.has(entry.ghsa)) {
      problems.push(`${label}: duplicate ghsa`);
    }
    seen.add(entry.ghsa);
    if (!entry.package.trim()) {
      problems.push(`${label}: package is empty`);
    }
    if (!entry.path.startsWith(".>")) {
      problems.push(
        `${label}: path must be a pnpm dependency-path prefix starting with ".>"`,
      );
    }
    if (!entry.reason.trim()) {
      problems.push(`${label}: reason is empty`);
    }
    if (
      !ISO_DATE_PATTERN.test(entry.expires) ||
      Number.isNaN(Date.parse(`${entry.expires}T00:00:00Z`))
    ) {
      problems.push(`${label}: expires is not a YYYY-MM-DD date`);
    } else if (entry.expires <= todayIso) {
      problems.push(
        `${label}: acceptance expired on ${entry.expires} — renew it with a fresh review or fix the dependency`,
      );
    }
  });
  return problems;
}

/**
 * Whether the advisory has a published fix. npm and GitHub encode "no patched
 * version" as the unsatisfiable range `<0.0.0`; anything else names versions a
 * consumer could move to, which is what an acceptance has to argue against.
 */
function hasPublishedFix(patchedVersions: string | undefined): boolean {
  const range = patchedVersions?.trim() ?? "";
  return range !== "" && range !== "<0.0.0";
}

/**
 * Why a live advisory does NOT satisfy the entry that names it. Empty means
 * the acceptance holds. Each check is one of the ways the previous model was
 * fooled: wrong package, a direct dependency called transitive, a fix nobody
 * noticed.
 */
function checkAcceptance(
  entry: AcceptedRiskEntry,
  advisory: PnpmAdvisory,
): string[] {
  const problems: string[] = [];
  if (advisory.module_name !== entry.package) {
    problems.push(
      `accepted for package ${entry.package} but pnpm reports it in ${advisory.module_name}`,
    );
  }
  for (const finding of advisory.findings ?? []) {
    for (const depPath of finding.paths ?? []) {
      if (!depPath.startsWith(entry.path)) {
        problems.push(
          `dependency path ${depPath} does not start with the declared prefix ${entry.path}`,
        );
      }
    }
  }
  if (hasPublishedFix(advisory.patched_versions) && !entry.fixBlockedBy) {
    problems.push(
      `a patched version exists (${advisory.patched_versions}) and the acceptance does not say what blocks the fix (fixBlockedBy)`,
    );
  }
  return problems;
}

/**
 * Run a git command, or return undefined. Never throws, never prints.
 *
 * Every release comparison below is a diagnostic bolted to a build that is
 * already failing, so a missing ref, a shallow clone or no git at all must mean
 * no hint rather than a second failure.
 */
function git(command: string): string | undefined {
  try {
    return execSync(command, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 10_000,
    });
  } catch {
    return undefined;
  }
}

/**
 * Make `origin/release` resolvable, once per process.
 *
 * Without this the whole diagnostic is dead code in exactly the place it exists
 * to help. `actions/checkout@v4` defaults to `fetch-depth: 1`, so a CI checkout
 * has the commit under test and no other branch — `origin/release` does not
 * resolve, every lookup below returns undefined, and the contributor sees the
 * same bare "Unaccepted advisory" this change set out to replace.
 *
 * A depth-1 fetch of one branch is cheap and is skipped entirely when the ref
 * is already present, which is the local case. Memoised so N advisories do not
 * trigger N fetches.
 */
let releaseRefChecked = false;
let releaseRefAvailable = false;
function ensureReleaseRef(): boolean {
  if (releaseRefChecked) {
    return releaseRefAvailable;
  }
  releaseRefChecked = true;
  releaseRefAvailable =
    git("git rev-parse --verify --quiet origin/release") !== undefined ||
    (git(
      "git fetch --depth=1 origin release:refs/remotes/origin/release",
    ) !== undefined &&
      git("git rev-parse --verify --quiet origin/release") !== undefined);
  return releaseRefAvailable;
}

/**
 * Whether `release` accepts an advisory that the running branch does not.
 *
 * The accepted-risk table lives in this file, so it moves with `release` like
 * any other source. A branch cut before an entry was added fails on an advisory
 * that `release` has already reviewed and accepted — and the failure text says
 * only "is not accepted", which is true of the branch and useless to whoever is
 * reading it. That happened to two contributor PRs in one week; both spent days
 * looking for a fault in their own code.
 *
 * Reads `origin/release`'s copy of this file and looks for the GitHub advisory
 * id as a `ghsa:` value inside the ACCEPTED_RISK_ADVISORIES literal. The id is
 * matched as a quoted value, not a substring, so an id quoted in a comment or a
 * `reason` cannot produce a false hint. Older copies of `release` carried a
 * per-package table (ACCEPTED_RISK_PACKAGES); a package KEY in that table is
 * reported too, so the hint keeps working across the model change.
 *
 * Returns undefined on any failure. This is a diagnostic attached to a build
 * that is already failing; it must never be the reason one fails, so a missing
 * ref, a shallow clone, or no git at all just means no hint.
 */
function releaseAcceptsAdvisory(
  ghsaId: string | undefined,
  moduleName: string,
): string | undefined {
  if (!ensureReleaseRef()) {
    return undefined;
  }
  try {
    const released = git("git show origin/release:scripts/security-check.ts");
    if (released === undefined) {
      return undefined;
    }
    const literalOf = (name: string): string | undefined => {
      const start = released.indexOf(`const ${name}`);
      if (start === -1) {
        return undefined;
      }
      const eq = released.indexOf("=", start);
      const open = released.slice(eq).search(/[[{]/);
      if (eq === -1 || open === -1) {
        return undefined;
      }
      const from = eq + open;
      const opener = released[from];
      const closer = opener === "[" ? "]" : "}";
      let depth = 0;
      for (let i = from; i < released.length; i++) {
        if (released[i] === opener) {
          depth++;
        } else if (released[i] === closer) {
          depth--;
          if (depth === 0) {
            return released.slice(from, i + 1);
          }
        }
      }
      return undefined;
    };
    const escape = (text: string): string =>
      text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const byId = literalOf("ACCEPTED_RISK_ADVISORIES");
    if (
      ghsaId &&
      byId &&
      new RegExp(`ghsa:\\s*["']${escape(ghsaId)}["']`).test(byId)
    ) {
      return `advisory ${ghsaId}`;
    }
    const byPackage = literalOf("ACCEPTED_RISK_PACKAGES");
    if (
      byPackage &&
      new RegExp(`^\\s*(["']?)${escape(moduleName)}\\1\\s*:\\s*\\{`, "m").test(
        byPackage,
      )
    ) {
      return `package ${moduleName} (legacy per-package table)`;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Whether `release` pins a package out of its vulnerable range via an override
 * that this branch does not have.
 *
 * This is the case that actually bites, and it is NOT the accepted-risk one.
 * `fast-uri` 1145636 broke two contributor PRs, and `fast-uri` is not in the
 * accepted-risk table at all — `release` fixed it in `aec7f8ac` by adding a
 * `pnpm.overrides` entry (`fast-uri@<3.1.5: ">=3.1.5 <4"`) that lifts the
 * dependency past the advisory, so the advisory simply is not in `release`'s
 * tree. A branch cut before that commit still resolves the vulnerable version
 * and fails, through no fault of its own.
 *
 * Compares against `origin/release`'s package.json, which is a JSON parse
 * rather than a source scrape and so is reliable. Silent on any failure, for
 * the same reason as `releaseAcceptsPackage`.
 */
function releaseOverridesPackage(moduleName: string): string | undefined {
  if (!ensureReleaseRef()) {
    return undefined;
  }
  try {
    const localPkg = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8"),
    );
    const releasedRaw = git("git show origin/release:package.json");
    if (releasedRaw === undefined) {
      return undefined;
    }
    const releasedPkg = JSON.parse(releasedRaw);
    const pick = (p: Record<string, unknown>): Record<string, string> => ({
      ...((p.pnpm as { overrides?: Record<string, string> } | undefined)
        ?.overrides ?? {}),
      ...((p.overrides as Record<string, string> | undefined) ?? {}),
    });
    const localOv = pick(localPkg);
    const releaseOv = pick(releasedPkg);
    // Override keys carry a range suffix (`fast-uri@<3.1.5`), so match on the
    // package name before the `@` that separates it — allowing for scoped names.
    const nameOf = (k: string): string => {
      const at = k.lastIndexOf("@");
      return at > 0 ? k.slice(0, at) : k;
    };
    const inRelease = Object.entries(releaseOv).find(
      ([k]) => nameOf(k) === moduleName,
    );
    if (!inRelease) {
      return undefined;
    }
    // ANY local override counts, not just an identical one. A branch that pins
    // this package to a different range has made a deliberate decision about
    // it, and telling its author "release pins this and your branch does not"
    // would be flatly untrue — the branch does pin it, differently. Staleness
    // is only a defensible claim when the branch has no opinion at all.
    const inLocal = Object.entries(localOv).find(
      ([k]) => nameOf(k) === moduleName,
    );
    if (inLocal) {
      return undefined;
    }
    return `${inRelease[0]}: ${inRelease[1]}`;
  } catch {
    return undefined;
  }
}

/** How many commits `origin/release` is ahead, when that is knowable. */
function commitsBehindRelease(): number | undefined {
  if (!ensureReleaseRef()) {
    return undefined;
  }
  const out = git("git rev-list --count HEAD..origin/release");
  if (out === undefined) {
    return undefined;
  }
  const n = Number.parseInt(out.trim(), 10);
  return Number.isFinite(n) ? n : undefined;
}

type SecurityIssue = {
  level: string;
  category: string;
  message: string;
  details: Record<string, unknown> | null;
  timestamp: string;
};

type PnpmAdvisoryFinding = {
  version?: string;
  paths?: string[];
};

type PnpmAdvisory = {
  id: number;
  severity: string;
  module_name: string;
  title: string;
  github_advisory_id?: string;
  patched_versions?: string;
  vulnerable_versions?: string;
  findings?: PnpmAdvisoryFinding[];
};

type PnpmAuditJson = {
  advisories?: Record<string, PnpmAdvisory>;
};

type SecurityResults = {
  secrets: { status: string; details: GitleaksFinding[] };
  dependencies: { status: string; details: unknown[] };
  licenses: { status: string; details: unknown[] };
  bestPractices: { status: string; details: unknown[] };
};

/**
 * Ceiling for an external scanner subprocess (gitleaks, ripgrep).
 *
 * What this catches is a scanner that wedges, which without a bound takes the
 * entire CI job down silently, since spawnSync blocks the event loop and
 * produces no output while stuck.
 *
 * On the headroom, measured rather than assumed: gitleaks is invoked with
 * `--no-git` (see gitleaksArgs below), so it scans the working tree and does
 * NOT walk history — repo age and commit count do not enter into its runtime.
 * The figure that used to stand here (the whole script in about 1.4s) was
 * taken while the gitleaks flags were wrong and the scan never ran. A real
 * scan of a clean 133 MB export costs about 70 CPU-seconds: 8-12s of wall time
 * on a 10-core laptop, 47s once while the machine was busy, and the whole
 * script 35-55s with `pnpm audit`. That is 2.5x the slowest gitleaks run seen
 * and wants the override below on a 2-core runner.
 *
 * It is still overridable, because that headroom is measured on one repository
 * and a much larger working tree, a cold CI runner fetching the binary, or a
 * future switch away from `--no-git` could all move it:
 *
 *   NEUROLINK_SCANNER_TIMEOUT_MS=300000 pnpm run validate:security
 *
 * A non-numeric or non-positive value is ignored in favour of the default,
 * since a bound of zero would fail every scan instantly and an unbounded one
 * reintroduces the hang this exists to prevent.
 */
const SCANNER_TIMEOUT_DEFAULT_MS = 120_000;

/**
 * Whether an ABSENT gitleaks binary fails the gate instead of degrading to the
 * basic pattern fallback.
 *
 * The fallback exists for a developer's machine, where a missing scanner is a
 * local-setup fact and a warning is the right volume. On a CI runner it was
 * never that: the GitHub runners did not install gitleaks, so the "🔒 Security
 * Validation" step had run the four-regex fallback on every pull request and
 * reported green — the professional scan this file is named for had never run
 * in CI at all. CI now installs a pinned gitleaks before this script, so a
 * missing binary there is a broken step, not a policy, and it fails loudly.
 *
 *   NEUROLINK_REQUIRE_GITLEAKS=1   require it anywhere (pre-commit on a
 *                                  machine that has it installed)
 *   NEUROLINK_REQUIRE_GITLEAKS=0   allow the fallback even under CI=true
 *   otherwise                      required exactly when CI=true, which every
 *                                  GitHub Actions runner sets
 */
function gitleaksIsRequired(): boolean {
  const explicit = process.env.NEUROLINK_REQUIRE_GITLEAKS;
  if (explicit === "1") {
    return true;
  }
  if (explicit === "0") {
    return false;
  }
  return process.env.CI === "true";
}

const GITLEAKS_REQUIRED_MESSAGE =
  "gitleaks is required here (CI=true or NEUROLINK_REQUIRE_GITLEAKS=1) and is not on PATH — the secret scan did not run, so the tree cannot be reported as clean. Install the pinned release (see the quality-gate job in .github/workflows/ci.yml) or set NEUROLINK_REQUIRE_GITLEAKS=0 to allow the basic-pattern fallback.";
const SCANNER_TIMEOUT_MS = (() => {
  const raw = process.env.NEUROLINK_SCANNER_TIMEOUT_MS;
  if (raw === undefined) {
    return SCANNER_TIMEOUT_DEFAULT_MS;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : SCANNER_TIMEOUT_DEFAULT_MS;
})();


class SecurityValidator {
  errors: SecurityIssue[];
  warnings: SecurityIssue[];
  info: SecurityIssue[];
  startTime: number;
  projectRoot: string;
  results: SecurityResults;

  constructor() {
    this.errors = [];
    this.warnings = [];
    this.info = [];
    this.startTime = Date.now();
    this.projectRoot = process.cwd();
    this.results = {
      secrets: { status: "pending", details: [] },
      dependencies: { status: "pending", details: [] },
      licenses: { status: "pending", details: [] },
      bestPractices: { status: "pending", details: [] },
    };
  }

  log(message: string, color = "reset"): void {
    console.log(`${colors[color]}[SECURITY] ${message}${colors.reset}`);
  }

  addIssue(
    level: string,
    category: string,
    message: string,
    details: Record<string, unknown> | null = null,
  ): void {
    const issue: SecurityIssue = {
      level,
      category,
      message,
      details,
      timestamp: new Date().toISOString(),
    };

    switch (level) {
      case "error":
        this.errors.push(issue);
        break;
      case "warning":
        this.warnings.push(issue);
        break;
      case "info":
        this.info.push(issue);
        break;
    }
  }

  // 1. Dependency Vulnerability Scanning
  //
  // Parses `pnpm audit --prod --json` and checks each moderate-or-higher
  // advisory against ACCEPTED_RISK_ADVISORIES, by GitHub advisory id.
  //
  // Two earlier designs are worth not repeating. The first ran plain-text
  // `pnpm audit` and computed a single boolean over the *entire* output: if
  // any one of a handful of allowlisted package *names* appeared anywhere in
  // the text, the whole check passed — regardless of how many other,
  // unrelated advisories were open. That let a build with 15 open
  // high-severity production advisories report PASS because one unrelated,
  // genuinely-ignorable OTEL package also appeared in the table.
  //
  // The second keyed acceptance to individual pnpm advisory ids, and the
  // third replaced that with a per-package severity ceiling that accepted
  // "more of the same" without review — and, as the 2026-10 audit showed, with
  // reasons that were simply false. This model is the second one again, done
  // properly: one GitHub advisory id per acceptance, with a declared
  // dependency path, an expiry and a required explanation whenever a fix
  // exists, all checked on every run. A new advisory IS a hard failure until a
  // human reviews it. That is the gate's job.
  //
  // `--prod` excludes dev-only trees, so this only evaluates advisories that
  // can reach a real consumer of the published package.
  async checkDependencyVulnerabilities(): Promise<void> {
    this.log("Scanning dependencies for vulnerabilities...", "blue");

    let output: string;
    try {
      // pnpm audit exits non-zero whenever advisories are found — that is
      // expected and not itself a tool failure, so capture stdout on both
      // the success and the error path rather than treating a throw as
      // "the scan could not run".
      output = execSync("pnpm audit --prod --json", {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        // `pnpm audit` talks to the registry, so this is the one call in this
        // file that can hang on something outside the machine. It matters more
        // than it looks: CI runs `pnpm run validate:security` DIRECTLY (ci.yml,
        // "🔒 Security Validation"), not through build-validations.ts, so the
        // process-group bound added there does not cover this path at all.
        // Unbounded, an unreachable registry hangs the job to its own limit.
        //
        // 1s measured locally against a 120s ceiling. SIGKILL because execSync's
        // timeout otherwise sends SIGTERM and keeps waiting.
        timeout: SCANNER_TIMEOUT_MS,
        killSignal: "SIGKILL",
      });
    } catch (pnpmError: unknown) {
      const execErr = pnpmError as {
        stdout?: string;
        code?: string;
        signal?: string;
      };
      // `pnpm audit` exits non-zero when it FINDS advisories, so landing here is
      // the normal path and `stdout` carries the real report. A timeout lands
      // here too, and the branches below already fail closed on the empty and
      // unparseable output it leaves. What they cannot do is SAY it was a
      // timeout — they would report "produced no output", which sends whoever
      // reads it looking for a broken pnpm rather than a slow registry.
      if (execErr.code === "ETIMEDOUT" || execErr.signal === "SIGKILL") {
        this.addIssue(
          "error",
          "dependencies",
          `pnpm audit exceeded ${SCANNER_TIMEOUT_MS / 1000}s and was killed — the vulnerability scan did not complete, so its result cannot be trusted (registry unreachable or slow?)`,
        );
        this.results.dependencies.status = "failed";
        return;
      }
      output = execErr.stdout || "";
    }

    // Fail CLOSED. Every branch below means "the scan did not produce a report
    // I can reason about" — not "there is nothing wrong". Reporting those as a
    // warning let the check pass while knowing nothing, which is the same
    // failure shape as the single-boolean implementation this replaced: a
    // security gate that is green because it did not look.
    if (!output.trim()) {
      this.addIssue(
        "error",
        "dependencies",
        "pnpm audit produced no output — the vulnerability scan did not run, so its result cannot be trusted",
      );
      this.results.dependencies.status = "failed";
      return;
    }

    let audit: PnpmAuditJson;
    try {
      audit = JSON.parse(output) as PnpmAuditJson;
    } catch (parseError: unknown) {
      const message =
        parseError instanceof Error
          ? parseError.message
          : String(parseError);
      this.addIssue(
        "error",
        "dependencies",
        `Could not parse pnpm audit output as JSON — the scan produced no usable report: ${message}`,
      );
      this.results.dependencies.status = "failed";
      return;
    }

    // `{ "advisories": {} }` is a legitimate clean report. A response with no
    // `advisories` key at all is not — that is what a retired or erroring audit
    // endpoint returns, and defaulting it to {} would read as "zero
    // vulnerabilities" when the truth is "no answer".
    const rawAdvisories = audit.advisories;
    if (
      rawAdvisories === undefined ||
      rawAdvisories === null ||
      typeof rawAdvisories !== "object" ||
      Array.isArray(rawAdvisories)
    ) {
      this.addIssue(
        "error",
        "dependencies",
        "pnpm audit returned a report with no object-valued 'advisories' field — treating this as a failed scan rather than a clean one",
      );
      this.results.dependencies.status = "failed";
      return;
    }

    // The table is checked on EVERY run, not only when an advisory matches
    // it. An expired acceptance or a malformed id is a defect in the gate
    // itself, and a gate with a defect must not report a clean tree.
    const tableProblems = validateAcceptedRiskTable(
      ACCEPTED_RISK_ADVISORIES,
      new Date(),
    );
    for (const problem of tableProblems) {
      this.addIssue(
        "error",
        "dependencies",
        `ACCEPTED_RISK_ADVISORIES ${problem}`,
      );
    }

    const advisories = Object.values(rawAdvisories);
    // Only moderate+ advisories require an explicit accept — this mirrors
    // the previous --audit-level=moderate threshold. Low/info advisories are
    // still surfaced for visibility but do not block the build on their own.
    const actionable = advisories.filter((a) =>
      ["moderate", "high", "critical"].includes(a.severity),
    );
    const lowOnly = advisories.filter((a) => !actionable.includes(a));

    const byGhsa = new Map(ACCEPTED_RISK_ADVISORIES.map((e) => [e.ghsa, e]));
    const accepted: Array<{ advisory: PnpmAdvisory; entry: AcceptedRiskEntry }> =
      [];
    const unaccepted: Array<{ advisory: PnpmAdvisory; why: string }> = [];
    for (const advisory of actionable) {
      const ghsa = advisory.github_advisory_id;
      const entry = ghsa ? byGhsa.get(ghsa) : undefined;
      if (!entry) {
        unaccepted.push({
          advisory,
          why: ghsa
            ? `${ghsa} is not in ACCEPTED_RISK_ADVISORIES`
            : `pnpm reported no GitHub advisory id for advisory ${advisory.id}, so it cannot match an acceptance`,
        });
        continue;
      }
      const problems = checkAcceptance(entry, advisory);
      if (problems.length > 0) {
        unaccepted.push({
          advisory,
          why: `accepted as ${entry.ghsa} but the acceptance does not hold: ${problems.join("; ")}`,
        });
      } else {
        accepted.push({ advisory, entry });
      }
    }

    // Print every accepted advisory, not just a count, so the decision stays
    // visible in the log of every run and in the job summary.
    accepted.forEach(({ advisory, entry }) => {
      this.log(
        `Accepted risk — ${entry.ghsa} ${advisory.module_name} ${advisory.severity} (path ${entry.path}, expires ${entry.expires}): ${advisory.title} — ${entry.reason}`,
        "cyan",
      );
    });
    lowOnly.forEach((advisory) => {
      this.log(
        `Low-severity advisory (not gated) — ${advisory.github_advisory_id ?? advisory.id} ${advisory.module_name}: ${advisory.title}`,
        "cyan",
      );
    });

    // An entry whose advisory no longer appears is dead weight: it makes the
    // accepted list look larger than the real exposure and hides that
    // something was fixed upstream. A warning rather than an error — a stale
    // acceptance is tidy-up, not a vulnerability, and failing the build for it
    // would break unrelated work the moment a dependency gets patched.
    //
    // Computed BEFORE the unaccepted-advisory return below. A run that fails on
    // a real advisory is exactly a run someone is about to read carefully, so
    // it is the worst moment to withhold the rest of what the scan noticed.
    const liveIds = new Set(
      advisories
        .map((a) => a.github_advisory_id)
        .filter((id): id is string => typeof id === "string"),
    );
    const staleAcceptances = ACCEPTED_RISK_ADVISORIES.filter(
      (entry) => !liveIds.has(entry.ghsa),
    );
    if (staleAcceptances.length > 0) {
      this.addIssue(
        "warning",
        "dependencies",
        `Accepted-risk entries with no live advisory (safe to remove from ACCEPTED_RISK_ADVISORIES): ${staleAcceptances
          .map((e) => `${e.ghsa} (${e.package})`)
          .join(", ")}`,
      );
    }

    this.writeDependencyStepSummary(accepted, unaccepted, lowOnly);

    if (unaccepted.length > 0) {
      const behind = commitsBehindRelease();
      unaccepted.forEach(({ advisory: a, why }) => {
        // Say so when the branch, not the dependency, is the problem. Ordered
        // most specific first, because a contributor reading a red gate needs
        // the strongest available statement about whose fault it is.
        const acceptedOnRelease = releaseAcceptsAdvisory(
          a.github_advisory_id,
          a.module_name,
        );
        const overriddenOnRelease = releaseOverridesPackage(a.module_name);
        const rebase = `Rebase onto origin/release and re-run before investigating your own changes.`;
        let staleBase = "";
        if (overriddenOnRelease) {
          staleBase =
            ` — NOTE: origin/release pins this package out of the vulnerable range ` +
            `(override "${overriddenOnRelease}") and this branch does not` +
            `${behind ? `, being ${behind} commit(s) behind` : ""}. ${rebase}`;
        } else if (acceptedOnRelease) {
          staleBase =
            ` — NOTE: origin/release accepts ${acceptedOnRelease} ` +
            `and this branch does not${behind ? `, being ${behind} commit(s) behind` : ""}. ${rebase}`;
        } else if (behind && behind > 0) {
          // No specific signal, but staleness alone is worth saying: advisories
          // are routinely cleared on release by lockfile and override changes,
          // and a contributor has no way to tell that from a real finding.
          staleBase =
            ` — NOTE: this branch is ${behind} commit(s) behind origin/release. ` +
            `Dependency advisories are frequently resolved there by lockfile or ` +
            `override changes, so this may not originate in your changes. ${rebase}`;
        }
        this.addIssue(
          "error",
          "dependencies",
          `Unaccepted ${a.severity} advisory ${a.github_advisory_id ?? a.id} in ${a.module_name} (${why}): ${a.title}${staleBase}`,
        );
      });
      this.results.dependencies.status = "failed";
      this.results.dependencies.details = unaccepted.map((u) => u.advisory);
      return;
    }

    if (tableProblems.length > 0) {
      this.results.dependencies.status = "failed";
      return;
    }

    if (actionable.length === 0) {
      this.log("No known vulnerabilities found", "green");
    } else {
      this.log(
        `All ${actionable.length} open production advisories are explicitly accepted risk`,
        "green",
      );
    }
    this.results.dependencies.status = "passed";
  }

  /**
   * The accepted-risk decisions as a GitHub job summary, when one is being
   * collected. The cyan log lines above are the only other place a decision
   * is visible, and a line in a green job's log is a line nobody reads; the
   * summary is on the run's front page.
   */
  writeDependencyStepSummary(
    accepted: ReadonlyArray<{ advisory: PnpmAdvisory; entry: AcceptedRiskEntry }>,
    unaccepted: ReadonlyArray<{ advisory: PnpmAdvisory; why: string }>,
    lowOnly: readonly PnpmAdvisory[],
  ): void {
    const summaryPath = process.env.GITHUB_STEP_SUMMARY;
    if (!summaryPath) {
      return;
    }
    const cell = (text: string): string =>
      text.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
    const lines: string[] = ["## Dependency advisories (`pnpm audit --prod`)", ""];
    if (unaccepted.length > 0) {
      lines.push(`### Unaccepted — ${unaccepted.length} (build fails)`, "");
      lines.push("| Advisory | Package | Severity | Why it is not accepted |");
      lines.push("| --- | --- | --- | --- |");
      for (const { advisory, why } of unaccepted) {
        lines.push(
          `| ${cell(advisory.github_advisory_id ?? String(advisory.id))} | ${cell(advisory.module_name)} | ${cell(advisory.severity)} | ${cell(why)} |`,
        );
      }
      lines.push("");
    }
    lines.push(`### Accepted risk — ${accepted.length}`, "");
    if (accepted.length === 0) {
      lines.push("None. The accepted-risk table is empty.", "");
    } else {
      lines.push(
        "| Advisory | Package | Severity | Declared path | Expires | Reason |",
      );
      lines.push("| --- | --- | --- | --- | --- | --- |");
      for (const { advisory, entry } of accepted) {
        lines.push(
          `| ${cell(entry.ghsa)} | ${cell(entry.package)} | ${cell(advisory.severity)} | \`${cell(entry.path)}\` | ${cell(entry.expires)} | ${cell(entry.reason)} |`,
        );
      }
      lines.push("");
    }
    if (lowOnly.length > 0) {
      lines.push(
        `### Low-severity, not gated — ${lowOnly.length}`,
        "",
        ...lowOnly.map(
          (a) =>
            `- ${cell(a.github_advisory_id ?? String(a.id))} ${cell(a.module_name)}: ${cell(a.title)}`,
        ),
        "",
      );
    }
    try {
      fs.appendFileSync(summaryPath, lines.join("\n") + "\n");
    } catch {
      // The summary is a convenience; failing to write it must not change the
      // verdict, which has already been recorded through addIssue.
    }
  }

  // 2. Professional Secret Detection with Gitleaks Integration
  async checkSecretsWithGitleaks(): Promise<void> {
    this.log(
      "Running professional secret detection with Gitleaks...",
      "blue",
    );

    try {
      // Check if gitleaks is available
      const gitleaksCommand = "gitleaks";
      const configPath = path.join(this.projectRoot, GITLEAKS_CONFIG_FILE);

      const gitleaksArgs = buildGitleaksArgs(
        fs.existsSync(configPath) ? configPath : undefined,
      );

      let outcome: GitleaksRunOutcome | undefined;
      let gitleaksScanFailed = false;
      let gitleaksUnavailable = false;
      try {
        // Use spawnSync for safer command execution without shell interpretation
        const result = spawnSync(gitleaksCommand, gitleaksArgs, {
          encoding: "utf8",
          maxBuffer: 10 * 1024 * 1024,
          cwd: this.projectRoot,
          // This script gates CI, and spawnSync blocks the event loop: an
          // external scanner that wedges takes the whole job down with it and
          // reports nothing. SIGKILL because spawnSync's timeout sends SIGTERM
          // and then keeps waiting — verified: against a child that ignores
          // SIGTERM the call never returns at all.
          timeout: SCANNER_TIMEOUT_MS,
          killSignal: "SIGKILL",
        });

        if (result.error) {
          throw result.error;
        }

        outcome = interpretGitleaksRun({
          status: result.status,
          stdout: result.stdout ?? "",
          stderr: result.stderr ?? "",
        });
      } catch (gitleaksError: unknown) {
        // If gitleaks fails, fallback to empty result
        const err = gitleaksError as {
          stderr?: string;
          message?: string;
          code?: string;
        };
        if (err.stderr) {
          this.log(`Gitleaks stderr: ${err.stderr.toString()}`, "yellow");
        }
        this.log(`Gitleaks error: ${err.message}`, "yellow");

        // No outcome means "gitleaks found nothing", and below that becomes
        // status = "passed". But a scan that was STARTED AND THEN KILLED did
        // not find nothing — it found nothing *yet*. Adding the bound above
        // made that case reachable in seconds rather than never, which without
        // this would have quietly converted a hung security gate into a green
        // one. Same standard as the pnpm-audit path: a scan with no result
        // cannot be reported as a clean result.
        //
        // Scoped deliberately to the killed case. Gitleaks being ABSENT
        // (ENOENT) is handled below: a hard failure where the scanner is
        // required (CI installs a pinned binary first), the basic-pattern
        // fallback on a developer machine. See gitleaksIsRequired().
        gitleaksUnavailable = true;
        if (err.code === "ETIMEDOUT" || err.code === "ERR_CHILD_KILLED") {
          gitleaksScanFailed = true;
          this.addIssue(
            "error",
            "secrets",
            `Gitleaks exceeded ${SCANNER_TIMEOUT_MS / 1000}s and was killed — the secret scan did not complete, so its result cannot be trusted`,
          );
        }
        // Do not throw, fallback to empty findings and continue with basic detection
      }

      // Started and failed is not the same as absent: with `--exit-code 0` a
      // non-zero status or an unreadable report means gitleaks itself broke,
      // and that must never read as a clean tree.
      if (outcome?.kind === "failed") {
        gitleaksScanFailed = true;
        this.addIssue(
          "error",
          "secrets",
          `The secret scan did not run to completion (${outcome.reason}), so the tree cannot be reported as clean`,
        );
      }

      const findings: GitleaksFinding[] =
        outcome?.kind === "findings" ? outcome.findings : [];

      if (findings.length > 0) {
        // Process and filter findings
        const criticalFindings = findings.filter(
          (finding) =>
            finding.RuleID &&
            CRITICAL_SECURITY_RULES.includes(finding.RuleID),
        );

        const moderateFindings = findings.filter(
          (finding) => !criticalFindings.includes(finding),
        );

        if (criticalFindings.length > 0) {
          this.addIssue(
            "error",
            "secrets",
            `Found ${criticalFindings.length} critical secrets`,
          );
          criticalFindings.forEach((finding) => {
            this.addIssue(
              "error",
              "secrets",
              `Critical secret in ${finding.File}:${finding.StartLine}`,
              {
                rule: finding.RuleID as string,
                description: finding.Description as string,
              },
            );
          });
          this.results.secrets.status = "failed";
        }

        if (moderateFindings.length > 0) {
          this.addIssue(
            "warning",
            "secrets",
            `Found ${moderateFindings.length} potential secrets to review`,
          );
          // Show up to 5 moderate findings
          moderateFindings.slice(0, 5).forEach((finding) => {
            this.addIssue(
              "warning",
              "secrets",
              `Potential secret in ${finding.File}:${finding.StartLine}`,
              { rule: finding.RuleID as string },
            );
          });

          if (moderateFindings.length > 5) {
            this.addIssue(
              "info",
              "secrets",
              `... and ${moderateFindings.length - 5} more potential secrets`,
            );
          }

          if (this.results.secrets.status !== "failed") {
            this.results.secrets.status = "warning";
          }
        }

        this.results.secrets.details = findings;
      } else if (gitleaksScanFailed) {
        // Empty findings here came from a scan that never completed, not from
        // a clean tree. Reported as failed so CI cannot go green on it.
        this.log(
          "Gitleaks produced no result — not reporting the tree as clean",
          "red",
        );
        this.results.secrets.status = "failed";
      } else if (gitleaksUnavailable) {
        // Gitleaks never ran, so "no findings" is an artefact of the empty
        // "[]" assigned in the catch above, not an observation about the tree.
        // Reporting "No secrets detected by Gitleaks" here was simply untrue,
        // and it is what CI printed for a long time, since runners did not
        // install gitleaks: the professional scan was skipped AND the fallback
        // the catch below promises was never reached, because that catch only
        // fires on a throw and the inner one swallows the error.
        //
        // Where gitleaks is required (CI, or on request) an absent binary is a
        // broken step and the gate fails. Elsewhere, run the fallback that was
        // always intended, at warning volume.
        if (gitleaksIsRequired()) {
          this.log("Gitleaks unavailable and required — failing", "red");
          this.addIssue("error", "secrets", GITLEAKS_REQUIRED_MESSAGE);
          this.results.secrets.status = "failed";
        } else {
          this.log(
            "Gitleaks unavailable — running basic pattern detection instead",
            "yellow",
          );
          this.addIssue(
            "warning",
            "secrets",
            "Gitleaks not installed - using basic pattern detection only",
          );
          await this.basicSecretDetection();
        }
      } else {
        this.log("No secrets detected by Gitleaks", "green");
        this.results.secrets.status = "passed";
      }
    } catch (_gitleaksError: unknown) {
      if (gitleaksIsRequired()) {
        this.log("Gitleaks not available and required — failing", "red");
        this.addIssue("error", "secrets", GITLEAKS_REQUIRED_MESSAGE);
        this.results.secrets.status = "failed";
        return;
      }
      this.log(
        "Gitleaks not available, falling back to basic detection",
        "yellow",
      );
      this.addIssue(
        "warning",
        "secrets",
        "Gitleaks not installed - using basic pattern detection only",
      );

      // Fallback to basic detection for critical patterns
      await this.basicSecretDetection();
    }
  }

  async basicSecretDetection(): Promise<void> {
    // Set when a pattern scan is killed mid-run. The finding count below then
    // describes an INCOMPLETE sweep, so it must not be allowed to produce a
    // "passed" status — the run already fails via the recorded error, but the
    // status field is what a reader trusts.
    let patternScanKilled = false;

    const criticalPatterns: Array<{
      pattern: string;
      type: string;
      severity: string;
    }> = [
      {
        pattern: "sk-[a-zA-Z0-9]{48}",
        type: "OpenAI API Key",
        severity: "critical",
      },
      {
        pattern: "AKIA[0-9A-Z]{16}",
        type: "AWS Access Key",
        severity: "critical",
      },
      {
        pattern: "AIza[0-9A-Za-z\\-_]{35}",
        type: "Google API Key",
        severity: "high",
      },
      {
        pattern: "gh[pousr]_[A-Za-z0-9_]{36}",
        type: "GitHub Token",
        severity: "high",
      },
    ];

    let totalFindings = 0;

    for (const { pattern, type, severity } of criticalPatterns) {
      try {
        // Use spawnSync to prevent command injection vulnerabilities
        let output = "";
        try {
          const result = spawnSync(
            "rg",
            [
              "--no-heading",
              "--line-number",
              pattern,
              ".",
              "--type",
              "js",
              "--type",
              "ts",
              "--type",
              "json",
            ],
            {
              encoding: "utf8",
              maxBuffer: 5 * 1024 * 1024,
              timeout: SCANNER_TIMEOUT_MS,
              killSignal: "SIGKILL",
            },
          );
          // rg exits 1 on "no matches", which is a real result. A spawn
          // failure or a timeout is not — it produces empty stdout that is
          // indistinguishable from "clean" unless the error is inspected.
          // Only a killed scan is escalated, for the same reason as the
          // gitleaks path above: `rg` being absent is a runner-configuration
          // fact this file already tolerates, while a scan that started and
          // was killed leaves a pattern genuinely unchecked behind empty
          // output that is indistinguishable from "no matches".
          const rgErr = result.error as NodeJS.ErrnoException | undefined;
          if (rgErr?.code === "ETIMEDOUT" || rgErr?.code === "ERR_CHILD_KILLED") {
            patternScanKilled = true;
            this.addIssue(
              "error",
              "secrets",
              `Pattern scan exceeded ${SCANNER_TIMEOUT_MS / 1000}s for /${pattern}/ and was killed — that pattern was not checked`,
            );
          }
          output = result.stdout || "";
        } catch (_err: unknown) {
          // If rg returns non-zero (no matches), output remains empty
        }

        if (output.trim()) {
          const matches = output.trim().split("\n");
          const validMatches = matches.filter((match: string) => {
            const parsed = splitRgMatch(match);
            if (!parsed || !parsed.content.trim()) return false;
            // Judged from the matched token and a trailing comment only —
            // see scripts/lib/secretPlaceholder.ts for why neither the
            // pre-colon text nor the whole line is the right scope.
            return !isPlaceholderSecret(parsed.content, pattern);
          });

          if (validMatches.length > 0) {
            totalFindings += validMatches.length;

            if (severity === "critical") {
              this.addIssue(
                "error",
                "secrets",
                `Found ${validMatches.length} potential ${type}(s)`,
              );
            } else {
              this.addIssue(
                "warning",
                "secrets",
                `Found ${validMatches.length} potential ${type}(s)`,
              );
            }

            // Show first finding as example
            const [file, line] = validMatches[0].split(":", 2);
            this.addIssue(
              "info",
              "secrets",
              `Example: ${file}:${line}`,
            );
          }
        }
      } catch (_error: unknown) {
        // Continue with other patterns
      }
    }

    if (totalFindings > 0) {
      this.addIssue(
        "info",
        "secrets",
        "Install official gitleaks for enhanced detection: https://github.com/gitleaks/gitleaks",
      );
      this.results.secrets.status = patternScanKilled
        ? "failed"
        : totalFindings > 0
          ? "warning"
          : "passed";
    } else if (patternScanKilled) {
      this.log(
        "A pattern scan was killed — not reporting the tree as clean",
        "red",
      );
      this.results.secrets.status = "failed";
    } else {
      // Wording matters here, not just tone. build-validations.ts decides
      // whether this script failed by SUBSTRING-MATCHING its stdout for
      // "critical secrets" — so the obvious phrasing, "No critical secrets
      // detected", makes the parent report a critical-secret failure on a
      // clean scan. That stayed hidden while this line was unreachable in CI
      // (gitleaks absent meant the fallback never ran at all); routing the
      // fallback correctly is what surfaced it, as a red `test` job on a repo
      // with no secrets in it.
      //
      // Phrased to avoid the matched substring entirely. The parent's
      // log-scraping is the real fragility and is filed separately; this line
      // must not depend on that being fixed first.
      this.log("Basic scan found no matching secret patterns", "green");
      this.results.secrets.status = "passed";
    }
  }

  // 3. License Compliance Checking
  checkLicenseCompliance(): void {
    this.log("Checking license compliance...", "blue");

    try {
      const packageJsonPath = path.join(this.projectRoot, "package.json");
      if (!fs.existsSync(packageJsonPath)) {
        this.addIssue("error", "licenses", "package.json not found");
        return;
      }

      const packageJson = JSON.parse(
        fs.readFileSync(packageJsonPath, "utf8"),
      );

      // Check project license
      if (!packageJson.license) {
        this.addIssue(
          "warning",
          "licenses",
          "Project license not specified in package.json",
        );
      } else {
        this.log(`Project license: ${packageJson.license}`, "green");
      }

      // Check for license-checker package availability
      try {
        // Bounded for the same reason as the audit above, and it is not
        // hypothetical: license-checker walks the whole installed dependency
        // tree from disk and resolves licence metadata, so on a cold or very
        // large node_modules it is I/O-bound and can sit for a long time. It is
        // also `pnpm exec`, which will try to FETCH the package if it is not
        // already installed — a network operation, and the same registry-hang
        // exposure the audit call has.
        //
        // SIGKILL rather than the default SIGTERM because execSync's timeout
        // sends SIGTERM and then keeps waiting, so a child that ignores it
        // hangs forever and the bound buys nothing.
        execSync("pnpm exec license-checker --summary", {
          stdio: "pipe",
          timeout: SCANNER_TIMEOUT_MS,
          killSignal: "SIGKILL",
        });
        // The tool RAN. Nothing read its output, so no licence has been
        // evaluated and "passed" would be a claim this code cannot support —
        // the same shape as the secret- and dependency-scan branches that had
        // to be corrected: a status that means "the tool exists", printed where
        // a reader sees "compliance verified".
        //
        // Reported as a warning with the reason stated. Deliberately NOT
        // upgraded to a real check here: deciding which licences are acceptable
        // is policy, and inventing that policy inside a status assignment would
        // be worse than admitting the gap.
        this.log(
          "license-checker is available but its output is not evaluated — no licence was checked",
          "yellow",
        );
        this.addIssue(
          "warning",
          "licenses",
          "Licence compliance is NOT verified: license-checker runs but its summary is discarded, so no licence is evaluated. Treat this check as a tooling probe, not a compliance result.",
        );
        this.results.licenses.status = "warning";
      } catch (licenseError: unknown) {
        const lcErr = licenseError as { code?: string; signal?: string };
        // A timeout is not the same fact as "not installed", and saying
        // "Install license-checker" to someone whose scan was killed is
        // actively misleading — they have it, it did not finish.
        if (lcErr.code === "ETIMEDOUT" || lcErr.signal === "SIGKILL") {
          this.addIssue(
            "warning",
            "licenses",
            `license-checker exceeded ${SCANNER_TIMEOUT_MS / 1000}s and was killed — the licence probe did not complete`,
          );
          this.results.licenses.status = "warning";
          return;
        }
        this.addIssue(
          "info",
          "licenses",
          "Install license-checker for detailed compliance: pnpm add -D license-checker",
        );
        this.results.licenses.status = "warning";
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : String(error);
      this.addIssue(
        "warning",
        "licenses",
        `License check failed: ${message}`,
      );
      this.results.licenses.status = "warning";
    }
  }

  // 4. Security Best Practices Validation
  checkSecurityBestPractices(): void {
    this.log("Validating security best practices...", "blue");

    const checks: Record<string, boolean> = {
      gitignore: this.checkGitIgnore(),
      envExample: this.checkEnvExample(),
      securityDeps: this.checkSecurityDependencies(),
      packageScripts: this.checkPackageScripts(),
    };

    const passedChecks = Object.values(checks).filter(Boolean).length;
    const totalChecks = Object.keys(checks).length;

    if (passedChecks === totalChecks) {
      this.log("All security best practices validated", "green");
      this.results.bestPractices.status = "passed";
    } else {
      this.addIssue(
        "warning",
        "bestPractices",
        `${passedChecks}/${totalChecks} security best practices implemented`,
      );
      this.results.bestPractices.status = "warning";
    }
  }

  checkGitIgnore(): boolean {
    const gitIgnorePath = path.join(this.projectRoot, ".gitignore");
    if (!fs.existsSync(gitIgnorePath)) {
      this.addIssue(
        "warning",
        "bestPractices",
        ".gitignore file missing",
      );
      return false;
    }

    const content = fs.readFileSync(gitIgnorePath, "utf8");
    const requiredPatterns = [".env", "*.key", "*.pem", "node_modules"];
    const missingPatterns = requiredPatterns.filter(
      (pattern) => !content.includes(pattern),
    );

    if (missingPatterns.length > 0) {
      this.addIssue(
        "warning",
        "bestPractices",
        `Add to .gitignore: ${missingPatterns.join(", ")}`,
      );
      return false;
    }

    return true;
  }

  checkEnvExample(): boolean {
    const envExamplePath = path.join(this.projectRoot, ".env.example");
    if (!fs.existsSync(envExamplePath)) {
      this.addIssue(
        "warning",
        "bestPractices",
        ".env.example file missing",
      );
      return false;
    }
    return true;
  }

  checkSecurityDependencies(): boolean {
    try {
      const packageJsonPath = path.join(this.projectRoot, "package.json");
      const packageJson = JSON.parse(
        fs.readFileSync(packageJsonPath, "utf8"),
      );

      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };
      const securityDeps = ["cors", "helmet", "express-rate-limit"].filter(
        (dep) => allDeps[dep],
      );

      if (securityDeps.length > 0) {
        this.log(
          `Security dependencies found: ${securityDeps.join(", ")}`,
          "green",
        );
        return true;
      }

      return false;
    } catch (_error: unknown) {
      return false;
    }
  }

  checkPackageScripts(): boolean {
    try {
      const packageJsonPath = path.join(this.projectRoot, "package.json");
      const packageJson = JSON.parse(
        fs.readFileSync(packageJsonPath, "utf8"),
      );

      const securityScripts = ["validate:security", "audit"].filter(
        (script) => packageJson.scripts?.[script],
      );
      return securityScripts.length > 0;
    } catch (_error: unknown) {
      return false;
    }
  }

  // Main execution function
  async run(): Promise<void> {
    this.log("Starting NeuroLink Security Validation...", "cyan");
    console.log("\n" + "=".repeat(50) + "\n");

    // Run all security checks
    await this.checkSecretsWithGitleaks();
    await this.checkDependencyVulnerabilities();
    this.checkLicenseCompliance();
    this.checkSecurityBestPractices();

    // Generate summary report
    this.generateReport();
  }

  generateReport(): void {
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);

    this.log(
      "\n============================================================",
    );
    this.log(`Security validation completed in ${duration}s`, "blue");

    // Show summary by category
    const categories: Array<keyof SecurityResults> = [
      "secrets",
      "dependencies",
      "licenses",
      "bestPractices",
    ];
    categories.forEach((category) => {
      const result = this.results[category];
      const icon =
        result.status === "passed"
          ? "PASS"
          : result.status === "warning"
            ? "WARN"
            : "FAIL";
      this.log(`${icon} ${category}: ${result.status}`);
    });

    // Show detailed issues
    if (this.warnings.length > 0) {
      this.log(
        `\n${colors.yellow}SECURITY WARNINGS:${colors.reset}`,
      );
      this.log("==================================================");
      this.warnings.forEach((warning: SecurityIssue, index: number) => {
        this.log(
          `${index + 1}. ${colors.yellow}[WARNING]${colors.reset} ${warning.category}: ${warning.message}`,
        );
        if (warning.details) {
          this.log(`   ${JSON.stringify(warning.details)}`);
        }
      });
    }

    if (this.errors.length > 0) {
      this.log(`\n${colors.red}SECURITY ERRORS:${colors.reset}`);
      this.log("==================================================");
      this.errors.forEach((error: SecurityIssue, index: number) => {
        this.log(
          `${index + 1}. ${colors.red}[ERROR]${colors.reset} ${error.category}: ${error.message}`,
        );
        if (error.details) {
          this.log(`   ${JSON.stringify(error.details)}`);
        }
      });
    }

    // Recommendations
    if (this.info.length > 0) {
      this.log(
        `\n${colors.blue}RECOMMENDATIONS:${colors.reset}`,
      );
      this.log("==================================================");
      this.info.forEach((infoItem: SecurityIssue, index: number) => {
        this.log(`${index + 1}. ${infoItem.message}`);
      });
    }

    // Final status
    if (this.errors.length > 0) {
      this.log(
        `\n${colors.red}SECURITY VALIDATION FAILED!${colors.reset}`,
      );
      this.log(
        `${colors.red}Please address ${this.errors.length} critical security issues before proceeding.${colors.reset}`,
      );
      process.exit(1);
    } else if (this.warnings.length > 0) {
      this.log(
        `\n${colors.yellow}Security validation completed with ${this.warnings.length} warnings.${colors.reset}`,
      );
      this.log(
        `${colors.blue}Consider addressing these warnings for enhanced security.${colors.reset}`,
      );
    } else {
      this.log(
        `\n${colors.green}Security validation passed!${colors.reset}`,
      );
    }
  }
}

// `--print-accepted-risks` prints the table as JSON and exits without scanning.
// It is how the supply-chain suite (test/continuous-test-suite-security-
// supply-chain.ts) reads the gate's own decisions through the gate's own
// surface, instead of importing this file or scraping its source.
if (process.argv.includes("--print-accepted-risks")) {
  process.stdout.write(
    `${JSON.stringify(ACCEPTED_RISK_ADVISORIES, null, 2)}\n`,
  );
} else {
  // Run the enhanced security validation
  const validator = new SecurityValidator();
  validator.run().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `${colors.red}[ERROR] Security validation failed: ${message}${colors.reset}`,
    );
    process.exit(1);
  });
}

export default SecurityValidator;
