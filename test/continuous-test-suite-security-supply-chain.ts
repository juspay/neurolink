/**
 * Supply-chain and CI hardening — regression suite for the 2026-10 security
 * hardening.
 *
 * Every case here pins a property of the repository's own delivery surface:
 * the workflows GitHub runs, the Dockerfile consumers build, the manifest the
 * package manager reads, the GitHub Action bundle consumers execute, the
 * dependency gate's own decisions and the live `pnpm audit` it gates on. None
 * of it is reachable through `generate()`; all of it is reachable by anyone who
 * clones the repository, which is the surface under test. Determinism is what
 * this buys: each check reads a committed file or runs a build/gate the
 * repository ships, with no provider and no network except the two cases that
 * say so (the live audit, and the registry check of the pinned CLI version),
 * both of which skip with a named reason when the network is unavailable.
 *
 * Imports: only the harness, Node built-ins and the `js-yaml` dependency. No
 * `src/lib` import, no `dist` import — the suite drives files and processes.
 *
 * Run: pnpm run test:security:supply-chain
 *      pnpm exec tsx test/continuous-test-suite-security-supply-chain.ts
 *
 * Sanity-checked the way CLAUDE.md asks: breaking one assertion on purpose
 * reports ✗ and exits non-zero, not ⊘ — the suite is `offline: true`, so a
 * provider-shaped message can never downgrade a failure to a skip, and no
 * assertion message quotes a payload.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

import {
  Skip,
  assert as harnessAssert,
  defineSuite,
  tempDir,
} from "./helpers/harness.js";

/**
 * The harness `assert` returns void, so TypeScript does not narrow on it; this
 * wrapper carries an assertion signature and otherwise behaves identically (a
 * failed condition throws the message, which the suite reports as ✗).
 */
function assert(cond: unknown, msg: string): asserts cond {
  harnessAssert(Boolean(cond), msg);
}

const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const WORKFLOWS_DIR = join(ROOT, ".github", "workflows");
const require = createRequire(import.meta.url);

const { test, runSuite } = defineSuite("Security: supply chain and CI", {
  offline: true,
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Json = Record<string, unknown>;

function readText(relPath: string): string {
  return readFileSync(join(ROOT, relPath), "utf8");
}

function readJson(relPath: string): Json {
  return JSON.parse(readText(relPath)) as Json;
}

function isRecord(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

type Workflow = {
  file: string;
  text: string;
  doc: Json;
};

function loadWorkflows(): Workflow[] {
  return readdirSync(WORKFLOWS_DIR)
    .filter((name) => name.endsWith(".yml") || name.endsWith(".yaml"))
    .sort()
    .map((name) => {
      const text = readFileSync(join(WORKFLOWS_DIR, name), "utf8");
      const doc = yaml.load(text);
      assert(isRecord(doc), `${name} does not parse as a YAML mapping`);
      return { file: name, text, doc };
    });
}

/** The `on:` block. YAML 1.1 reads a bare `on` key as the boolean true. */
function triggersOf(doc: Json): Json {
  const on = doc.on ?? (doc as Record<string, unknown>)["true"];
  if (typeof on === "string") {
    return { [on]: null };
  }
  if (Array.isArray(on)) {
    return Object.fromEntries(on.map((k) => [String(k), null]));
  }
  return isRecord(on) ? on : {};
}

type Step = Json & { uses?: string; with?: Json; if?: string; run?: string };
type Job = Json & { steps?: Step[]; permissions?: unknown; if?: string };

function jobsOf(doc: Json): Record<string, Job> {
  const jobs = doc.jobs;
  return isRecord(jobs) ? (jobs as Record<string, Job>) : {};
}

function stepsOf(wf: Workflow): Array<{ job: string; step: Step }> {
  const out: Array<{ job: string; step: Step }> = [];
  for (const [jobName, job] of Object.entries(jobsOf(wf.doc))) {
    for (const step of job.steps ?? []) {
      out.push({ job: jobName, step });
    }
  }
  return out;
}

/** `uses:` lines as written, with the trailing comment, comments excluded. */
function usesLines(text: string): Array<{ line: number; value: string }> {
  const out: Array<{ line: number; value: string }> = [];
  text.split("\n").forEach((raw, index) => {
    const line = raw.trim();
    if (line.startsWith("#")) {
      return;
    }
    const m = /^-?\s*uses:\s*(.+)$/.exec(line);
    if (m) {
      out.push({ line: index + 1, value: m[1].trim() });
    }
  });
  return out;
}

/** The workflow text without its comment lines: what runs, not what is explained. */
function codeOf(text: string): string {
  return text
    .split("\n")
    .filter((line) => !line.trim().startsWith("#"))
    .map((line) => line.replace(/\s#\s.*$/, ""))
    .join("\n");
}

/** The JSON document in a stdout that pnpm may have prefixed with its own chatter. */
function jsonFrom(stdout: string): unknown {
  const lines = stdout.split("\n");
  const start = lines.findIndex((l) => /^[[{]/.test(l.trim()));
  assert(start !== -1, "no JSON document found in the command's stdout");
  return JSON.parse(lines.slice(start).join("\n"));
}

const TSX_CLI = require.resolve("tsx/cli");

const SHA_PIN =
  /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_./-]+)?@[0-9a-f]{40}\s+#\s*v\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?\s*$/;
const EXACT_SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const ALLOWED_NODE_VERSIONS = new Set(["22.23.4", "24.22.1"]);

/** Resolve `${{ env.NAME }}` against the workflow's top-level env block. */
function resolveEnv(wf: Workflow, value: string): string {
  const m = /^\$\{\{\s*env\.([A-Za-z_][A-Za-z0-9_]*)\s*\}\}$/.exec(value);
  if (!m) {
    return value;
  }
  const env = wf.doc.env;
  const resolved = isRecord(env) ? env[m[1]] : undefined;
  return typeof resolved === "string" ? resolved : value;
}

function run(
  cmd: string,
  args: string[],
  opts: { cwd?: string; env?: NodeJS.ProcessEnv; timeoutMs?: number } = {},
): { status: number | null; stdout: string; stderr: string; error?: Error } {
  const result = spawnSync(cmd, args, {
    cwd: opts.cwd ?? ROOT,
    env: opts.env ?? process.env,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    timeout: opts.timeoutMs ?? 180_000,
    killSignal: "SIGKILL",
  });
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    error: result.error,
  };
}

const PKG = readJson("package.json");
const PKG_SCRIPTS = isRecord(PKG.scripts) ? (PKG.scripts as Json) : {};

// ---------------------------------------------------------------------------
// Workflows
// ---------------------------------------------------------------------------

const workflows = loadWorkflows();

await test("every workflow `uses:` is pinned to a 40-hex commit SHA with a `# vX.Y.Z` comment", async () => {
  const offenders: string[] = [];
  let total = 0;
  for (const wf of workflows) {
    for (const { line, value } of usesLines(wf.text)) {
      total++;
      // A local composite action (`./path`) has no SHA to pin; none exist
      // today, and one appearing is worth a look, so it is reported too.
      if (!SHA_PIN.test(value)) {
        offenders.push(`${wf.file}:${line}`);
      }
    }
  }
  assert(
    total > 0,
    "no `uses:` lines were found at all — the parser is broken",
  );
  assert(
    offenders.length === 0,
    `${offenders.length} of ${total} action references are not SHA-pinned with a version comment: ${offenders.join(", ")}`,
  );
});

await test("every `uses:` the YAML parser sees is also seen by the line scanner (no hidden references)", async () => {
  for (const wf of workflows) {
    const fromYaml = stepsOf(wf)
      .map(({ step }) => step.uses)
      .filter((u): u is string => typeof u === "string").length;
    const fromText = usesLines(wf.text).length;
    assert(
      fromYaml === fromText,
      `${wf.file}: the parsed workflow has ${fromYaml} uses: steps but the line scan found ${fromText}`,
    );
  }
});

await test("no workflow uses pull_request_target", async () => {
  const offenders = workflows
    .filter((wf) => "pull_request_target" in triggersOf(wf.doc))
    .map((wf) => wf.file);
  assert(
    offenders.length === 0,
    `pull_request_target is used by: ${offenders.join(", ")}`,
  );
});

await test("every workflow declares top-level permissions:", async () => {
  const offenders = workflows
    .filter((wf) => !("permissions" in wf.doc))
    .map((wf) => wf.file);
  assert(
    offenders.length === 0,
    `no top-level permissions block in: ${offenders.join(", ")}`,
  );
});

await test("every actions/setup-node step pins an exact Node version (22.23.4 or 24.22.1)", async () => {
  const offenders: string[] = [];
  let seen = 0;
  for (const wf of workflows) {
    for (const { job, step } of stepsOf(wf)) {
      if (!step.uses?.startsWith("actions/setup-node@")) {
        continue;
      }
      seen++;
      const raw = step.with?.["node-version"];
      const version =
        typeof raw === "string" ? resolveEnv(wf, raw) : String(raw ?? "");
      if (!ALLOWED_NODE_VERSIONS.has(version)) {
        offenders.push(`${wf.file} job ${job}`);
      }
    }
  }
  assert(
    seen > 0,
    "no actions/setup-node steps were found — the parser is broken",
  );
  assert(
    offenders.length === 0,
    `setup-node steps without an exact allowed node-version: ${offenders.join(", ")}`,
  );
});

await test("every pnpm/action-setup step reads the version from packageManager (no `version:` input)", async () => {
  const offenders: string[] = [];
  let seen = 0;
  for (const wf of workflows) {
    for (const { job, step } of stepsOf(wf)) {
      if (!step.uses?.startsWith("pnpm/action-setup@")) {
        continue;
      }
      seen++;
      if (step.with && "version" in step.with) {
        offenders.push(`${wf.file} job ${job}`);
      }
    }
  }
  assert(
    seen > 0,
    "no pnpm/action-setup steps were found — the parser is broken",
  );
  assert(
    offenders.length === 0,
    `pnpm/action-setup steps that pin their own version instead of packageManager: ${offenders.join(", ")}`,
  );
});

await test("release.yml installs with --frozen-lockfile and an exact npm client version", async () => {
  const text = codeOf(readText(".github/workflows/release.yml"));
  assert(
    !/pnpm (i|install)\s*$/m.test(text),
    "release.yml still has an unfrozen pnpm install",
  );
  assert(
    /pnpm install --frozen-lockfile/.test(text),
    "release.yml does not install with --frozen-lockfile",
  );
  assert(
    !/npm@11\b(?!\.\d)/.test(text) && !/npx -y npm@/.test(text),
    "release.yml still fetches a floating npm@11 client",
  );
  const pin = /NPM_CLI_VERSION:\s*"(\d+\.\d+\.\d+)"/.exec(text);
  assert(
    pin !== null,
    "release.yml does not pin NPM_CLI_VERSION to an exact version",
  );
});

await test("landing-deploy.yml installs an exact vercel CLI and passes the token via env, never argv", async () => {
  const text = codeOf(readText(".github/workflows/landing-deploy.yml"));
  assert(
    !/vercel@latest/.test(text),
    "landing-deploy.yml installs vercel@latest",
  );
  assert(
    /VERCEL_CLI_VERSION:\s*"\d+\.\d+\.\d+"/.test(text),
    "landing-deploy.yml does not pin VERCEL_CLI_VERSION exactly",
  );
  assert(
    !/--token[= ]/.test(text),
    "landing-deploy.yml passes the Vercel token on argv",
  );
});

await test("ci.yml: semantic-release-validation runs only on push, without persisted credentials", async () => {
  const ci = workflows.find((wf) => wf.file === "ci.yml");
  assert(ci !== undefined, "ci.yml is missing");
  const job = jobsOf(ci.doc)["semantic-release-validation"];
  assert(job !== undefined, "ci.yml has no semantic-release-validation job");
  assert(
    typeof job.if === "string" &&
      job.if.includes("github.event_name == 'push'"),
    "semantic-release-validation is not restricted to push events",
  );
  const checkout = (job.steps ?? []).find((s) =>
    s.uses?.startsWith("actions/checkout@"),
  );
  assert(
    checkout !== undefined,
    "semantic-release-validation has no checkout step",
  );
  assert(
    checkout.with?.["persist-credentials"] === false,
    "semantic-release-validation's checkout persists the write token into .git/config",
  );
});

await test("ci.yml: build-check rebuilds action-dist/ and fails on drift", async () => {
  const ci = workflows.find((wf) => wf.file === "ci.yml");
  assert(ci !== undefined, "ci.yml is missing");
  const job = jobsOf(ci.doc)["build-check"];
  assert(job !== undefined, "ci.yml has no build-check job");
  const runs = (job.steps ?? [])
    .map((s) => s.run)
    .filter((r): r is string => typeof r === "string")
    .join("\n");
  assert(
    runs.includes("pnpm run build:action"),
    "build-check does not rebuild the action bundle",
  );
  assert(
    /git diff --exit-code[^\n]*action-dist\//.test(runs),
    "build-check does not diff action-dist/ against the fresh build",
  );
});

await test("ci.yml: the quality gate installs a pinned, sha256-verified gitleaks before running the security validation", async () => {
  const ci = workflows.find((wf) => wf.file === "ci.yml");
  assert(ci !== undefined, "ci.yml is missing");
  for (const jobName of ["quality-gate", "test-shards"]) {
    const job = jobsOf(ci.doc)[jobName];
    assert(job !== undefined, `ci.yml has no ${jobName} job`);
    const steps = job.steps ?? [];
    const install = steps.findIndex(
      (s) =>
        typeof s.run === "string" && /GITLEAKS_SHA256/.test(JSON.stringify(s)),
    );
    assert(
      install !== -1,
      `${jobName} has no sha256-verified gitleaks install step`,
    );
    const installStep = steps[install];
    const env = isRecord(installStep.env) ? installStep.env : {};
    assert(
      typeof env.GITLEAKS_VERSION === "string" &&
        EXACT_SEMVER.test(env.GITLEAKS_VERSION),
      `${jobName}: GITLEAKS_VERSION is not an exact version`,
    );
    assert(
      typeof env.GITLEAKS_SHA256 === "string" &&
        /^[0-9a-f]{64}$/.test(env.GITLEAKS_SHA256),
      `${jobName}: GITLEAKS_SHA256 is not a 64-hex digest`,
    );
    assert(
      typeof installStep.run === "string" &&
        installStep.run.includes("sha256sum --check"),
      `${jobName}: the gitleaks archive is not checksum-verified before extraction`,
    );
    const validation = steps.findIndex(
      (s) =>
        typeof s.run === "string" &&
        (s.run.includes("validate:security") ||
          s.run.includes("validate:all") ||
          /pnpm run validate\s*$/m.test(s.run)),
    );
    assert(validation !== -1, `${jobName} never runs the security validation`);
    assert(
      install < validation,
      `${jobName}: gitleaks is installed after the validation that needs it`,
    );
  }
});

await test("ci.yml: security-suites gates every test:security:* suite", async () => {
  const ci = workflows.find((wf) => wf.file === "ci.yml");
  assert(ci !== undefined, "ci.yml is missing");
  const job = jobsOf(ci.doc)["security-suites"];
  assert(job !== undefined, "ci.yml has no security-suites job");
  const runs = (job.steps ?? [])
    .map((s) => s.run)
    .filter((r): r is string => typeof r === "string")
    .join("\n");
  const expected = [
    "test:security:cwd-trust",
    "test:security:server",
    "test:security:proxy",
    "test:security:tools",
    "test:security:ingestion",
    "test:security:supply-chain",
  ];
  const missing = expected.filter((name) => !runs.includes(`pnpm run ${name}`));
  assert(
    missing.length === 0,
    `security-suites does not run: ${missing.join(", ")}`,
  );
});

await test("package.json defines every test:security:* script the security-suites job runs", async () => {
  if (!("test:security:supply-chain" in PKG_SCRIPTS)) {
    throw new Skip(
      "package.json has not yet gained the test:security:* scripts (added by the dependency-pinning change); the job references are checked above",
    );
  }
  const ci = workflows.find((wf) => wf.file === "ci.yml");
  assert(ci !== undefined, "ci.yml is missing");
  const job = jobsOf(ci.doc)["security-suites"];
  assert(job !== undefined, "ci.yml has no security-suites job");
  const runs = (job.steps ?? [])
    .map((s) => s.run)
    .filter((r): r is string => typeof r === "string")
    .join("\n");
  const referenced = [
    ...runs.matchAll(/pnpm run (test:security:[a-z-]+)/g),
  ].map((m) => m[1]);
  const undefinedScripts = referenced.filter((name) => !(name in PKG_SCRIPTS));
  assert(
    undefinedScripts.length === 0,
    `security-suites runs scripts package.json does not define: ${undefinedScripts.join(", ")}`,
  );
});

await test("yama-review.yml pins @juspay/yama exactly, installs code-review-graph hash-verified, and takes .yama from the base ref", async () => {
  const text = codeOf(readText(".github/workflows/yama-review.yml"));
  assert(
    !/@juspay\/yama@[\^~]/.test(text),
    "yama-review.yml uses a range for @juspay/yama",
  );
  assert(
    /YAMA_VERSION:\s*"\d+\.\d+\.\d+"/.test(text),
    "yama-review.yml does not pin YAMA_VERSION exactly",
  );
  assert(
    !/uvx\s+--from\s+code-review-graph/.test(text),
    "yama-review.yml still fetches code-review-graph with uvx at run time",
  );
  assert(
    /--require-hashes -r \.yama\/requirements-code-review-graph\.txt/.test(
      text,
    ),
    "yama-review.yml does not install code-review-graph with --require-hashes from the committed requirements",
  );
  assert(
    existsSync(join(ROOT, ".yama", "requirements-code-review-graph.txt")),
    ".yama/requirements-code-review-graph.txt is missing",
  );
  const requirements = readText(".yama/requirements-code-review-graph.txt");
  assert(
    /^code-review-graph==\d+\.\d+\.\d+/m.test(requirements) &&
      /--hash=sha256:[0-9a-f]{64}/.test(requirements),
    "the requirements file does not pin code-review-graph with sha256 hashes",
  );
  assert(
    /git checkout "origin\/\$\{BASE_REF\}" -- \.yama/.test(text),
    "yama-review.yml does not replace .yama with the base branch's copy before the review",
  );
  assert(
    /state == "APPROVED"[^\n]*\n[^\n]*(dismiss|DISMISS)|APPROVED[\s\S]{0,600}dismissals/.test(
      text,
    ),
    "yama-review.yml does not dismiss and fail on an APPROVED review",
  );
});

await test("yama-learn.yml never pushes to release and does not persist credentials into the checkout", async () => {
  const wf = workflows.find((w) => w.file === "yama-learn.yml");
  assert(wf !== undefined, "yama-learn.yml is missing");
  const code = codeOf(wf.text);
  assert(!/push origin release/.test(code), "yama-learn.yml pushes to release");
  assert(
    !/\[skip ci\]/.test(code),
    "yama-learn.yml still writes a CI-skip directive",
  );
  assert(
    /yama\/memory-/.test(code),
    "yama-learn.yml does not push to a yama/memory-* branch",
  );
  assert(
    /gh pr create/.test(code),
    "yama-learn.yml does not open a pull request",
  );
  for (const { job, step } of stepsOf(wf)) {
    if (step.uses?.startsWith("actions/checkout@")) {
      assert(
        step.with?.["persist-credentials"] === false,
        `yama-learn.yml job ${job}: the checkout persists a write token into .git/config`,
      );
    }
  }
  const config = readJson(".yama/config.json");
  const learn = isRecord(config.learn) ? config.learn : {};
  assert(
    learn.push === false,
    ".yama/config.json still lets yama push its own commit",
  );
});

await test("Yama's prompts never instruct an APPROVE review state", async () => {
  const prompts = readJson(".yama/prompts.json");
  const list = Array.isArray(prompts.prompts) ? prompts.prompts : [];
  assert(list.length > 0, ".yama/prompts.json has no prompts");
  const text = JSON.stringify(list);
  assert(
    !/approving review/i.test(text) &&
      !/set or update the review state so it matches the verdict\./.test(text),
    "a Yama prompt still asks for an approving review",
  );
  assert(
    /NEVER submit an APPROVED review/.test(text),
    "the Yama validation prompt does not forbid an APPROVED review",
  );
});

await test("Dependabot covers the docker ecosystem for the digest-pinned base image", async () => {
  const doc = yaml.load(readText(".github/dependabot.yml"));
  assert(
    isRecord(doc) && Array.isArray(doc.updates),
    "dependabot.yml has no updates list",
  );
  const ecosystems = (doc.updates as Json[]).map((u) => u["package-ecosystem"]);
  assert(
    ecosystems.includes("docker"),
    "dependabot.yml has no docker ecosystem entry",
  );
  assert(
    ecosystems.includes("github-actions"),
    "dependabot.yml has no github-actions ecosystem entry",
  );
});

await test("CODEOWNERS, if present, names no @juspay/neurolink-* team (every one was unknown to GitHub)", async () => {
  const path = join(ROOT, ".github", "CODEOWNERS");
  if (!existsSync(path)) {
    return;
  }
  const text = readFileSync(path, "utf8");
  assert(
    !/@juspay\/neurolink-/.test(text),
    "CODEOWNERS references the @juspay/neurolink-* teams that GitHub reports as unknown owners",
  );
});

// ---------------------------------------------------------------------------
// Dockerfile
// ---------------------------------------------------------------------------

await test("Dockerfile FROM is pinned by digest and an exact Node version, and does not COPY the whole tree", async () => {
  const text = readText("Dockerfile");
  const froms = [...text.matchAll(/^FROM\s+(\S+)/gm)].map((m) => m[1]);
  assert(froms.length > 0, "Dockerfile has no FROM");
  const external = froms.filter((f) => !/^(base|build|production)$/.test(f));
  assert(external.length > 0, "Dockerfile has no external base image");
  for (const image of external) {
    const resolved = image
      .replace(
        /\$\{NODE_VERSION\}/g,
        /^ARG NODE_VERSION=(\S+)/m.exec(text)?.[1] ?? "",
      )
      .replace(
        /\$\{NODE_DIGEST\}/g,
        /^ARG NODE_DIGEST=(\S+)/m.exec(text)?.[1] ?? "",
      );
    assert(
      /@sha256:[0-9a-f]{64}$/.test(resolved),
      "a Dockerfile base image is not pinned by a sha256 digest",
    );
    assert(
      /^node:\d+\.\d+\.\d+-/.test(resolved),
      "the Dockerfile base image tag is not an exact Node version",
    );
  }
  assert(
    !/^COPY \. \.\s*$/m.test(text),
    "Dockerfile still copies the whole build context",
  );
  assert(
    /NEUROLINK_SERVER_API_KEY/.test(text) && /REQUIRED/.test(text),
    "the Dockerfile header does not say the API key is required for the non-loopback bind",
  );
});

// ---------------------------------------------------------------------------
// package.json (read only — owned by the dependency-pinning change)
// ---------------------------------------------------------------------------

await test('package.json has no bare exact override ("name": "x.y.z"); overrides carry a selector', async () => {
  const pnpm = isRecord(PKG.pnpm) ? PKG.pnpm : {};
  const overrides = isRecord(pnpm.overrides) ? pnpm.overrides : {};
  const offenders = Object.entries(overrides)
    .filter(([key, value]) => {
      const hasSelector = key.includes(">") || /.@/.test(key);
      return (
        !hasSelector && typeof value === "string" && EXACT_SEMVER.test(value)
      );
    })
    .map(([key]) => key);
  assert(
    offenders.length === 0,
    `bare exact overrides pin the whole graph and block patched releases: ${offenders.join(", ")}`,
  );
});

await test("every dependency, devDependency and optionalDependency is an exact version", async () => {
  const offenders: string[] = [];
  for (const section of [
    "dependencies",
    "devDependencies",
    "optionalDependencies",
  ]) {
    const deps = isRecord(PKG[section]) ? (PKG[section] as Json) : {};
    for (const [name, range] of Object.entries(deps)) {
      if (typeof range !== "string" || !EXACT_SEMVER.test(range)) {
        offenders.push(`${section}:${name}`);
      }
    }
  }
  assert(
    offenders.length === 0,
    `${offenders.length} dependencies are not pinned to an exact version: ${offenders.slice(0, 20).join(", ")}${offenders.length > 20 ? ", ..." : ""}`,
  );
});

await test("packageManager is an exact pnpm version and engines.node is declared", async () => {
  const pm = PKG.packageManager;
  assert(
    typeof pm === "string" &&
      /^pnpm@\d+\.\d+\.\d+(\+sha(256|512)\.[A-Za-z0-9+/=]+)?$/.test(pm),
    "packageManager is not an exact pnpm@x.y.z (optionally with an integrity hash)",
  );
  const engines = isRecord(PKG.engines) ? PKG.engines : {};
  assert(
    typeof engines.node === "string" && engines.node.length > 0,
    "engines.node is not declared",
  );
});

await test("docs-site/pnpm-workspace.yaml carries the 3-day release cooldown", async () => {
  const path = join(ROOT, "docs-site", "pnpm-workspace.yaml");
  assert(existsSync(path), "docs-site/pnpm-workspace.yaml is missing");
  const doc = yaml.load(readFileSync(path, "utf8"));
  assert(
    isRecord(doc),
    "docs-site/pnpm-workspace.yaml does not parse as a mapping",
  );
  assert(
    typeof doc.minimumReleaseAge === "number" && doc.minimumReleaseAge >= 4320,
    "docs-site/pnpm-workspace.yaml has no minimumReleaseAge of at least 4320 minutes",
  );
  assert(
    !("packages" in doc),
    "docs-site/pnpm-workspace.yaml declares packages: and would turn docs-site into a workspace",
  );
});

// ---------------------------------------------------------------------------
// The GitHub Action
// ---------------------------------------------------------------------------

await test("action.yml defaults neurolink_version to the pinned release, not latest, and runs on node24", async () => {
  const doc = yaml.load(readText("action.yml"));
  assert(isRecord(doc), "action.yml does not parse");
  const inputs = isRecord(doc.inputs) ? doc.inputs : {};
  const input = isRecord(inputs.neurolink_version)
    ? inputs.neurolink_version
    : undefined;
  assert(input !== undefined, "action.yml has no neurolink_version input");
  assert(
    input.default !== "latest",
    "action.yml still defaults neurolink_version to latest",
  );
  const runs = isRecord(doc.runs) ? doc.runs : {};
  assert(runs.using === "node24", "action.yml does not run on node24");
  assert(
    runs.main === "action-dist/index.js",
    "action.yml does not run the committed bundle",
  );
  const source = readText("src/lib/action/cliVersion.ts");
  const pin = /DEFAULT_NEUROLINK_CLI_VERSION = "([^"]+)"/.exec(source);
  assert(
    pin !== null,
    "src/lib/action/cliVersion.ts does not define DEFAULT_NEUROLINK_CLI_VERSION",
  );
  assert(
    EXACT_SEMVER.test(pin[1]),
    "the pinned CLI version is not an exact x.y.z",
  );
  const bundle = readText("action-dist/index.js");
  assert(
    bundle.includes(`"${pin[1]}"`) || bundle.includes(`'${pin[1]}'`),
    "the committed action bundle does not carry the pinned CLI version",
  );
  assert(
    bundle.includes("--ignore-scripts"),
    "the committed action bundle does not install with --ignore-scripts",
  );
  assert(
    bundle.includes("signatures"),
    "the committed action bundle does not run npm audit signatures",
  );
});

await test("the pinned CLI version exists on the registry with a provenance attestation", async () => {
  const source = readText("src/lib/action/cliVersion.ts");
  const pin = /DEFAULT_NEUROLINK_CLI_VERSION = "([^"]+)"/.exec(source)?.[1];
  assert(pin !== undefined, "no pinned CLI version");
  let response: Response;
  try {
    response = await fetch(
      `https://registry.npmjs.org/@juspay/neurolink/${encodeURIComponent(pin)}`,
      { signal: AbortSignal.timeout(20_000) },
    );
  } catch {
    throw new Skip(
      "registry.npmjs.org is unreachable; the pinned version cannot be verified here",
    );
  }
  assert(
    response.status === 200,
    `the registry does not serve the pinned version (HTTP ${response.status})`,
  );
  const body = (await response.json()) as Json;
  const dist = isRecord(body.dist) ? body.dist : {};
  const attestations = isRecord(dist.attestations)
    ? dist.attestations
    : undefined;
  assert(
    attestations !== undefined,
    "the pinned version carries no provenance attestation",
  );
});

await test(".gitattributes does not hide action-dist/ as linguist-generated", async () => {
  const text = readText(".gitattributes");
  const hidden = text
    .split("\n")
    .filter((l) => !l.trim().startsWith("#"))
    .some((l) => /action-dist/.test(l) && /linguist-generated/.test(l));
  assert(
    !hidden,
    ".gitattributes marks action-dist/ linguist-generated, which collapses the bundle in review",
  );
});

await test("action-dist/index.js matches a fresh `ncc build` of src/action (reproducible bundle)", async () => {
  const probe = run("pnpm", ["exec", "ncc", "--version"], {
    timeoutMs: 60_000,
  });
  if (probe.error || probe.status !== 0) {
    throw new Skip(
      "@vercel/ncc is not installed, so the bundle cannot be rebuilt here (CI's build-check does it)",
    );
  }
  const out = tempDir("neurolink-action-build-");
  const build = run(
    "pnpm",
    ["exec", "ncc", "build", "src/action/index.ts", "-o", out, "--source-map"],
    { timeoutMs: 240_000 },
  );
  assert(
    build.status === 0,
    `ncc build of src/action/index.ts failed (exit ${build.status}); fix the source before comparing bundles`,
  );
  for (const file of [
    "index.js",
    "package.json",
    "sourcemap-register.cjs",
    "index.js.map",
  ]) {
    const fresh = join(out, file);
    const committed = join(ROOT, "action-dist", file);
    assert(existsSync(fresh), `the fresh build produced no ${file}`);
    assert(existsSync(committed), `action-dist/${file} is not committed`);
    assert(
      statSync(fresh).size === statSync(committed).size &&
        readFileSync(fresh).equals(readFileSync(committed)),
      `action-dist/${file} differs from a fresh build — run \`pnpm run build:action\` and commit the result`,
    );
  }
});

// ---------------------------------------------------------------------------
// The dependency gate
// ---------------------------------------------------------------------------

type AcceptedRisk = {
  ghsa: string;
  package: string;
  path: string;
  expires: string;
  reason: string;
  fixBlockedBy?: string;
};

// Built from the escape code so the file carries no control character.
const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g");

const GHSA =
  /^GHSA-[23456789cfghjmpqrvwx]{4}-[23456789cfghjmpqrvwx]{4}-[23456789cfghjmpqrvwx]{4}$/;

function readAcceptedRisks(): AcceptedRisk[] {
  const result = run(
    process.execPath,
    [
      TSX_CLI,
      join(ROOT, "scripts", "security-check.ts"),
      "--print-accepted-risks",
    ],
    { timeoutMs: 120_000 },
  );
  assert(
    result.status === 0,
    `scripts/security-check.ts --print-accepted-risks exited ${result.status}`,
  );
  const parsed = jsonFrom(result.stdout);
  assert(
    Array.isArray(parsed),
    "the accepted-risk table did not print as a JSON array",
  );
  return parsed as AcceptedRisk[];
}

await test("the gate's accepted-risk table: every entry has a GHSA id, a future expiry, a `.>` path prefix and a reason", async () => {
  const table = readAcceptedRisks();
  const today = new Date().toISOString().slice(0, 10);
  const problems: string[] = [];
  const seen = new Set<string>();
  table.forEach((entry, i) => {
    const label = `entry ${i + 1}`;
    if (!GHSA.test(entry.ghsa)) {
      problems.push(`${label}: ghsa is not a GHSA id`);
    }
    if (seen.has(entry.ghsa)) {
      problems.push(`${label}: duplicate ghsa`);
    }
    seen.add(entry.ghsa);
    if (typeof entry.package !== "string" || !entry.package.trim()) {
      problems.push(`${label}: no package`);
    }
    if (typeof entry.path !== "string" || !entry.path.startsWith(".>")) {
      problems.push(`${label}: path is not a .> dependency-path prefix`);
    }
    if (typeof entry.reason !== "string" || !entry.reason.trim()) {
      problems.push(`${label}: no reason`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.expires) || entry.expires <= today) {
      problems.push(`${label}: expires is missing, malformed or in the past`);
    }
  });
  assert(problems.length === 0, problems.join("; "));
});

await test("the live `pnpm audit --prod` has no moderate-or-higher advisory outside the accepted-risk table", async () => {
  const table = readAcceptedRisks();
  const audit = run("pnpm", ["audit", "--prod", "--json"], {
    timeoutMs: 300_000,
  });
  let report: Json;
  try {
    report = jsonFrom(audit.stdout) as Json;
  } catch {
    throw new Skip(
      "pnpm audit produced no JSON report (registry unreachable?); the gate itself fails closed on this",
    );
  }
  const advisories = isRecord(report.advisories)
    ? Object.values(report.advisories)
    : undefined;
  assert(
    advisories !== undefined,
    "pnpm audit returned no advisories object — a failed scan, not a clean one",
  );
  const accepted = new Set(table.map((e) => e.ghsa));
  const unaccepted: string[] = [];
  const pathViolations: string[] = [];
  for (const raw of advisories) {
    if (!isRecord(raw)) {
      continue;
    }
    const severity = String(raw.severity);
    if (!["moderate", "high", "critical"].includes(severity)) {
      continue;
    }
    const ghsa =
      typeof raw.github_advisory_id === "string"
        ? raw.github_advisory_id
        : undefined;
    const entry = ghsa ? table.find((e) => e.ghsa === ghsa) : undefined;
    if (!ghsa || !accepted.has(ghsa) || !entry) {
      unaccepted.push(
        `${ghsa ?? String(raw.id)} (${String(raw.module_name)}, ${severity})`,
      );
      continue;
    }
    const findings = Array.isArray(raw.findings) ? raw.findings : [];
    for (const finding of findings) {
      const paths =
        isRecord(finding) && Array.isArray(finding.paths) ? finding.paths : [];
      for (const depPath of paths) {
        if (typeof depPath === "string" && !depPath.startsWith(entry.path)) {
          pathViolations.push(ghsa);
        }
      }
    }
    const patched =
      typeof raw.patched_versions === "string"
        ? raw.patched_versions.trim()
        : "";
    if (patched !== "" && patched !== "<0.0.0" && !entry.fixBlockedBy) {
      unaccepted.push(`${ghsa} (fix available, no fixBlockedBy)`);
    }
  }
  assert(
    unaccepted.length === 0,
    `moderate-or-higher production advisories not covered by the accepted-risk table: ${unaccepted.join(", ")}`,
  );
  assert(
    pathViolations.length === 0,
    `accepted advisories whose dependency path does not match the declared prefix: ${[...new Set(pathViolations)].join(", ")}`,
  );
});

await test("the gate fails loudly under CI=true when gitleaks is absent (no silent fallback)", async () => {
  if (process.platform === "win32") {
    throw new Skip("the PATH-stripping harness is POSIX-only");
  }
  // A PATH that holds node, pnpm and the shell but no gitleaks. The gate's
  // other scans still run (and may fail for lack of a registry); only the
  // secrets verdict and its reason are read.
  const bin = tempDir("neurolink-gate-nogitleaks-");
  const links: Array<[string, string]> = [];
  for (const tool of ["node", "pnpm", "sh", "bash", "env", "git", "rg", "jq"]) {
    const which = run("sh", ["-c", `command -v ${tool}`], {
      timeoutMs: 10_000,
    });
    if (which.status === 0 && which.stdout.trim()) {
      links.push([tool, which.stdout.trim()]);
    }
  }
  assert(
    links.some(([t]) => t === "node") && links.some(([t]) => t === "pnpm"),
    "node and pnpm must be resolvable to build the stripped PATH",
  );
  for (const [tool, target] of links) {
    run("ln", ["-s", target, join(bin, tool)], { timeoutMs: 10_000 });
  }
  const result = run(
    process.execPath,
    [TSX_CLI, join(ROOT, "scripts", "security-check.ts")],
    {
      cwd: ROOT,
      timeoutMs: 400_000,
      env: {
        PATH: `${bin}:/usr/bin:/bin`,
        HOME: process.env.HOME ?? ROOT,
        CI: "true",
        NEUROLINK_SCANNER_TIMEOUT_MS: "300000",
      },
    },
  );
  const output = `${result.stdout}${result.stderr}`.replace(ANSI, "");
  assert(
    result.status !== 0,
    "the gate exited 0 under CI=true with gitleaks absent",
  );
  assert(
    output.includes("gitleaks is required here"),
    "the gate did not say that gitleaks is required and missing",
  );
  assert(
    !output.includes("using basic pattern detection only"),
    "the gate fell back to basic pattern detection under CI=true",
  );
  assert(
    /FAIL secrets: failed/.test(output),
    "the secrets category did not report failed",
  );
});

// ---------------------------------------------------------------------------
// Secret-scanning configuration
// ---------------------------------------------------------------------------

await test(".gitleaks.toml does not exempt tools/ or examples/ wholesale, and .gitleaksignore has no dead entries", async () => {
  const toml = readText(".gitleaks.toml");
  assert(!/'''\^tools\/'''/.test(toml), ".gitleaks.toml exempts all of tools/");
  assert(
    !/'''\^examples\/'''/.test(toml),
    ".gitleaks.toml exempts all of examples/",
  );
  const stopwords = /stopwords\s*=\s*\[([\s\S]*?)\]/.exec(toml);
  assert(stopwords !== null, ".gitleaks.toml has no stopwords list");
  const words = [...stopwords[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  const generic = words.filter((w) =>
    [
      "test",
      "demo",
      "mock",
      "sample",
      "example",
      "template",
      "fake",
      "dummy",
    ].includes(w),
  );
  assert(
    generic.length === 0,
    `generic English stopwords suppress real findings: ${generic.join(", ")}`,
  );
  const ignorePath = join(ROOT, ".gitleaksignore");
  if (existsSync(ignorePath)) {
    const dead = readFileSync(ignorePath, "utf8")
      .split("\n")
      .filter((l) => l.trim() && !l.trim().startsWith("#"))
      .map((l) => l.split(":")[0])
      .filter((file) => !existsSync(join(ROOT, file)));
    assert(
      dead.length === 0,
      `.gitleaksignore references files that no longer exist: ${dead.join(", ")}`,
    );
  }
});

await test("no shipped observability script carries a default password", async () => {
  const dir = join(ROOT, "scripts", "observability");
  const files = readdirSync(dir).filter(
    (f) => f.endsWith(".mjs") || f.endsWith(".js"),
  );
  assert(files.length > 0, "scripts/observability has no scripts");
  const offenders = files.filter((f) =>
    /Complexpass|root@example\.com/.test(readFileSync(join(dir, f), "utf8")),
  );
  assert(
    offenders.length === 0,
    `default credentials in: ${offenders.map((f) => relative(ROOT, join(dir, f))).join(", ")}`,
  );
});

await runSuite();
