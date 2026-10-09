/**
 * Phase-aware catalog authoring command. Invoked by verify-provider-onboarding;
 * it does not confer package, publication, roster, live or growth-count credit.
 * Existing catalog evidence remains historical data, not a trusted receipt.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { parseProviderCatalogJson } from "../src/lib/providers/catalog/schema.js";

const STAGES = ["draft", "source", "review", "merged"] as const;
const PR_PATTERN =
  /^https:\/\/github\.com\/juspay\/neurolink\/pull\/([1-9][0-9]*)$/;
const SHA_PATTERN = /^[0-9a-f]{40}$/;
const REQUIRED_CHECKS = [
  "test",
  "provider-safety-net",
  "build-check",
  "🔒 Single Commit Policy Validation",
  "security-suites",
];

export function validateCatalogIntroductionReference(value: string): void {
  if (value !== "PENDING_PR" && !PR_PATTERN.test(value)) {
    throw new Error(
      "addedInPR must be PENDING_PR or a canonical introduction PR URL; arbitrary evidence strings are not admission proof",
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function record(value: unknown, context: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`${context}: expected an object`);
  }
  return value;
}

function sha(value: unknown, context: string): string {
  if (typeof value !== "string" || !SHA_PATTERN.test(value)) {
    throw new Error(`${context}: expected a full immutable SHA`);
  }
  return value;
}

function git(root: string, args: string[]): string {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 15_000,
    maxBuffer: 8 * 1024 * 1024,
  }).trim();
}

function github(endpoint: string, paginated = false): unknown {
  // The caller's explicitly selected provenance stage is the only network
  // path. No receipt supplied in a catalog JSON can replace this observation.
  const text = execFileSync(
    "gh",
    [
      "api",
      endpoint,
      "--hostname",
      "github.com",
      ...(paginated ? ["--paginate", "--slurp"] : []),
    ],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 60_000,
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  return JSON.parse(text);
}

function pages(value: unknown, context: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${context}: expected complete paginated results`);
  }
  return value;
}

function verifyIntroduction(
  root: string,
  path: string,
  provider: string,
  url: string,
  stage: "review" | "merged",
  expectedHead?: string,
) {
  const match = PR_PATTERN.exec(url);
  if (!match) {
    throw new Error("provenance requires an actual juspay/neurolink PR URL");
  }
  const sourceHead = sha(git(root, ["rev-parse", "HEAD"]), "local source head");
  if (expectedHead !== undefined && expectedHead !== sourceHead) {
    throw new Error("requested source head does not match local HEAD");
  }
  const file = `src/lib/providers/catalog/${provider}.json`;
  if (relative(root, path).split("\\").join("/") !== file) {
    throw new Error(
      "provenance requires the canonical provider file in this checkout",
    );
  }
  const currentBlob = git(root, ["hash-object", path]);
  if (git(root, ["rev-parse", `${sourceHead}:${file}`]) !== currentBlob) {
    throw new Error(
      "catalog bytes differ from the immutable local source head",
    );
  }

  const endpoint = `repos/juspay/neurolink/pulls/${match[1]}`;
  const pr = record(github(endpoint), "PR metadata");
  const base = record(pr.base, "PR base");
  const repo = record(base.repo, "PR base repository");
  if (pr.html_url !== url || repo.full_name !== "juspay/neurolink") {
    throw new Error(
      "PR metadata does not identify the requested repository and PR",
    );
  }
  const introductionHead = sha(record(pr.head, "PR head").sha, "PR head");
  const files = pages(
    github(`${endpoint}/files?per_page=100`, true),
    "PR files",
  )
    .flatMap((page) => pages(page, "PR files page"))
    .map((item) => record(item, "PR file"));
  if (
    !Number.isSafeInteger(pr.changed_files) ||
    pr.changed_files !== files.length
  ) {
    throw new Error(
      "PR file pagination is incomplete or changed during observation",
    );
  }
  const introductions = files.filter(
    (item) => item.filename === file && item.status === "added",
  );
  if (introductions.length !== 1) {
    throw new Error(
      "PR does not introduce this provider file (added-file association required)",
    );
  }

  if (stage === "review") {
    if (pr.state !== "open" || pr.merged !== false) {
      throw new Error("review stage requires an actual open introduction PR");
    }
    if (introductionHead !== sourceHead) {
      throw new Error(
        "PR head is stale or unrelated to the current source head",
      );
    }
    if (introductions[0].sha !== currentBlob) {
      throw new Error(
        "PR provider-file blob differs from the current catalog source",
      );
    }
    verifyStableObservation(
      root,
      path,
      sourceHead,
      currentBlob,
      endpoint,
      introductionHead,
      false,
    );
    return {
      sourceHead,
      introductionHead,
      pullRequest: url,
      observedVia: "github-api",
    };
  }

  if (pr.merged !== true || pr.state !== "closed") {
    throw new Error("merged stage requires an actual merged introduction PR");
  }
  const mergeCommit = sha(pr.merge_commit_sha, "PR merge commit");
  git(root, ["merge-base", "--is-ancestor", mergeCommit, sourceHead]);

  const latest = new Map<string, Record<string, unknown>>();
  for (const page of pages(
    github(
      `repos/juspay/neurolink/commits/${introductionHead}/check-runs?filter=all&per_page=100`,
      true,
    ),
    "PR checks",
  )) {
    const checks = record(page, "PR checks page").check_runs;
    if (!Array.isArray(checks)) {
      throw new Error("PR checks page is missing check_runs");
    }
    for (const value of checks) {
      const check = record(value, "PR check");
      if (
        typeof check.name !== "string" ||
        typeof check.id !== "number" ||
        !Number.isSafeInteger(check.id)
      ) {
        throw new Error("PR check lacks an immutable run identity");
      }
      const previous = latest.get(check.name);
      if (!previous || Number(previous.id) < check.id) {
        latest.set(check.name, check);
      }
    }
  }
  verifyStableObservation(
    root,
    path,
    sourceHead,
    currentBlob,
    endpoint,
    introductionHead,
    true,
  );
  for (const name of REQUIRED_CHECKS) {
    const check = latest.get(name);
    if (
      !check ||
      check.head_sha !== introductionHead ||
      check.status !== "completed" ||
      check.conclusion !== "success"
    ) {
      throw new Error(
        `required introduction-head check is not completed SUCCESS: ${name}`,
      );
    }
  }
  return {
    sourceHead,
    introductionHead,
    mergeCommit,
    pullRequest: url,
    observedVia: "github-api",
    requiredChecks: REQUIRED_CHECKS,
    proofScope: "historical_catalog_file_introduction",
    limitation:
      "Only the historical added-file association, merge ancestry and introduction-head checks are verified; not current product identity or content continuity after later changes, deletion or replacement, current candidate CI, package or live acceptance.",
  };
}

function verifyStableObservation(
  root: string,
  path: string,
  sourceHead: string,
  sourceBlob: string,
  endpoint: string,
  introductionHead: string,
  merged: boolean,
): void {
  const latest = record(github(endpoint), "final PR metadata");
  if (
    record(latest.head, "final PR head").sha !== introductionHead ||
    latest.merged !== merged ||
    git(root, ["rev-parse", "HEAD"]) !== sourceHead ||
    git(root, ["hash-object", path]) !== sourceBlob
  ) {
    throw new Error("PR or local source changed during provenance observation");
  }
}

export async function runCatalogAdmission(
  args: readonly string[],
): Promise<void> {
  const options = new Map<string, string>();
  for (let i = 0; i < args.length; i += 1) {
    const separator = args[i].indexOf("=");
    const flag = separator === -1 ? args[i] : args[i].slice(0, separator);
    const value = separator === -1 ? args[++i] : args[i].slice(separator + 1);
    if (
      ![
        "--catalog-stage",
        "--catalog-file",
        "--provider",
        "--source-head",
      ].includes(flag) ||
      !value ||
      value.startsWith("--") ||
      options.has(flag)
    ) {
      throw new Error(
        "use --catalog-stage draft|source|review|merged [--provider id | --catalog-file path] [--source-head SHA]",
      );
    }
    options.set(flag, value);
  }
  const stage = options.get("--catalog-stage");
  if (!STAGES.some((value) => value === stage)) {
    throw new Error(
      "catalog admission supports draft/source/review/merged only; source or PR evidence cannot certify roster, live, package or release",
    );
  }
  const root = process.cwd();
  const provider = options.get("--provider");
  if (
    provider !== undefined &&
    !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(provider)
  ) {
    throw new Error("--provider must be a catalog provider id");
  }
  const suppliedFile = options.get("--catalog-file");
  if (provider && suppliedFile) {
    throw new Error("choose --provider or --catalog-file, not both");
  }
  if ((stage === "review" || stage === "merged") && !provider) {
    throw new Error("provenance stages require one explicit --provider");
  }
  const expectedHead = options.get("--source-head");
  if (expectedHead !== undefined) {
    sha(expectedHead, "--source-head");
    if (stage !== "review" && stage !== "merged") {
      throw new Error("--source-head applies only to provenance stages");
    }
  }
  const catalogDir = join(root, "src/lib/providers/catalog");
  const paths = suppliedFile
    ? [resolve(root, suppliedFile)]
    : provider
      ? [join(catalogDir, `${provider}.json`)]
      : readdirSync(catalogDir)
          .filter(
            (file) => file.endsWith(".json") && !file.endsWith(".schema.json"),
          )
          .sort()
          .map((file) => join(catalogDir, file));
  if (paths.length === 0) {
    throw new Error("no catalog provider files found");
  }

  const results = paths.map((path) => {
    const raw: unknown = JSON.parse(readFileSync(path, "utf8"));
    let entry;
    try {
      entry = parseProviderCatalogJson(raw, path);
    } catch (error) {
      if (stage !== "draft") {
        throw error;
      }
      return {
        file: relative(root, path),
        state: "incomplete_draft",
        sourceReady: false,
        problems: [
          error instanceof Error
            ? error.message
            : "catalog schema validation failed",
        ],
      };
    }
    if (provider !== undefined && entry.id !== provider) {
      throw new Error("catalog id differs from the selected provider");
    }
    const pending = entry.evidence.addedInPR === "PENDING_PR";
    validateCatalogIntroductionReference(entry.evidence.addedInPR);
    if (stage === "review" || stage === "merged") {
      if (pending) {
        throw new Error(
          "introduction is pending; an actual PR identity is required",
        );
      }
      return {
        provider: entry.id,
        state:
          stage === "review"
            ? "introduction_pr_association_verified"
            : "historical_catalog_file_introduction_verified",
        sourceReady: true,
        provenance: verifyIntroduction(
          root,
          path,
          entry.id,
          entry.evidence.addedInPR,
          stage,
          expectedHead,
        ),
      };
    }
    return {
      provider: entry.id,
      state:
        stage === "draft"
          ? "draft_not_admitted"
          : pending
            ? "source_ready_introduction_pending"
            : "source_ready_provenance_unverified",
      sourceReady: true,
    };
  });
  console.log(
    JSON.stringify(
      {
        stage,
        results,
        providerCountCredit: 0,
        reviewApprovalVerified: false,
        currentCandidateCIVerified: false,
        packageVerified: false,
        published: false,
        rosterVerified: false,
        liveVerified: false,
        evidenceLimit:
          "catalog evidence fields are retained historical/source records; only explicit GitHub provenance stages observe introduction state. Current consumer and authorized roster/live receipts remain separate.",
      },
      null,
      2,
    ),
  );
}
