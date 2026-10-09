#!/usr/bin/env tsx
/**
 * Catalog authoring admission, through the real repository commands.
 *
 * These tools are not shipped SDK/CLI exports, so no generate()/dist import
 * can reach their authoring decisions. Determinism is needed for impossible
 * simultaneous repository/PR states: unknown limits, a nonexistent/unrelated
 * PR, stale heads, incomplete pagination and failed/rerun checks. Owned Git
 * trees and a recorded `gh api` backend give those states without a network,
 * account or secret. The suite invokes the actual authoring/scaffold commands;
 * it never imports a runtime module from src/ or mixes package module graphs.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const evidence = process.env.CATALOG_ADMISSION_EVIDENCE_ROOT
  ? resolve(process.env.CATALOG_ADMISSION_EVIDENCE_ROOT)
  : mkdtempSync(join(tmpdir(), "neurolink-catalog-admission-"));
mkdirSync(evidence, { recursive: true });
const fixture = mkdtempSync(join(evidence, "repository-"));
const bin = join(fixture, "recorded-bin");
mkdirSync(bin);
const catalogPath = join(fixture, "src/lib/providers/catalog/cerebras.json");
mkdirSync(dirname(catalogPath), { recursive: true });
const original = JSON.parse(
  readFileSync(join(root, "src/lib/providers/catalog/cerebras.json"), "utf8"),
);
const source = structuredClone(original);
source.evidence.addedInPR = "https://github.com/juspay/neurolink/pull/4242";
source.evidence.rosterVerified = {
  date: "2026-10-09",
  code: "DOCS_ONLY_NOT_VERIFIED",
  method: "vendor documentation",
};
const baseline = JSON.stringify(source, null, 2) + "\n";

function git(args: string[]): string {
  const result = spawnSync("git", args, {
    cwd: fixture,
    encoding: "utf8",
    timeout: 15_000,
    env: {
      ...process.env,
      GIT_CONFIG_NOSYSTEM: "1",
      GIT_CONFIG_GLOBAL: "/dev/null",
    },
  });
  assert.equal(result.status, 0, `owned git command failed: ${result.stderr}`);
  return result.stdout.trim();
}

git(["init", "-q"]);
git(["config", "user.name", "Catalog fixture"]);
git(["config", "user.email", "catalog-fixture@example.invalid"]);
git(["config", "core.hooksPath", join(fixture, "unused-hooks")]);
writeFileSync(join(fixture, "README.md"), "Owned deterministic repository.\n");
git(["add", "README.md"]);
git(["commit", "-qm", "fixture base"]);
writeFileSync(catalogPath, baseline);
git(["add", "src/lib/providers/catalog/cerebras.json"]);
git(["commit", "-qm", "fixture provider introduction"]);
const head = git(["rev-parse", "HEAD"]);
const blob = git(["hash-object", catalogPath]);
writeFileSync(join(fixture, "README.md"), "Unrelated later fixture commit.\n");
git(["add", "README.md"]);
git(["commit", "-qm", "fixture unrelated later tree"]);
const nonAncestor = git(["rev-parse", "HEAD"]);
git(["checkout", "--detach", "-q", head]);

const recordedGh = `#!${process.execPath}
const fs = require('node:fs');
const endpoint = process.argv[3];
const state = process.env.CATALOG_RECORDED_CASE || 'review';
const head = process.env.CATALOG_RECORDED_HEAD;
const blob = process.env.CATALOG_RECORDED_BLOB;
fs.appendFileSync(process.env.CATALOG_RECORDED_CALLS, endpoint + '\\n');
if (state === 'nonexistent') { process.stderr.write('owned missing PR'); process.exit(1); }
const names = ['test','provider-safety-net','build-check','🔒 Single Commit Policy Validation','security-suites'];
const merged = state.startsWith('merged');
let result;
if (endpoint.includes('/files?')) {
 const file = { filename: 'src/lib/providers/catalog/cerebras.json', status: 'added', sha: blob };
 if (state === 'unrelated') file.filename = 'src/lib/providers/catalog/unrelated.json';
 if (state === 'modified') file.status = 'modified';
 if (state === 'blob') file.sha = 'f'.repeat(40);
 result = [[file]];
} else if (endpoint.includes('/check-runs?')) {
 let checks = names.map((name,index)=>({id:index+1,name,head_sha:head,status:'completed',conclusion:'success'}));
 if (state === 'merged-missing') checks.pop();
 if (state === 'merged-neutral') checks[0].conclusion = 'neutral';
 if (state === 'merged-skipped') checks[0].conclusion = 'skipped';
 if (state === 'merged-stale-check') checks[0].head_sha = '0'.repeat(40);
 if (state === 'merged-rerun') checks.push({...checks[0],id:100,status:'in_progress',conclusion:null});
 result = [{check_runs:checks}];
} else {
 const calls = fs.readFileSync(process.env.CATALOG_RECORDED_CALLS,'utf8').trim().split('\\n');
 result = { html_url:'https://github.com/juspay/neurolink/pull/4242', number:4242, changed_files:1,
   base:{repo:{full_name:'juspay/neurolink'}}, head:{sha:head}, state:merged?'closed':'open', merged,
   merge_commit_sha:head };
 if (state === 'wrong-repo') result.base.repo.full_name='different/repository';
 if (state === 'stale' || (state === 'changed' && calls.length>1)) result.head.sha='0'.repeat(40);
 if (state === 'pagination') result.changed_files=2;
 if (state === 'merged-ancestry') result.merge_commit_sha=process.env.CATALOG_RECORDED_NONANCESTOR;
}
process.stdout.write(JSON.stringify(result));
`;
writeFileSync(join(bin, "gh"), recordedGh);
chmodSync(join(bin, "gh"), 0o755);

let passed = 0;
let failed = 0;
const receipts: Array<Record<string, unknown>> = [];
const calls = join(fixture, "github-calls.txt");
const tsx = join(root, "node_modules/tsx/dist/cli.mjs");

function command(
  script: string,
  args: string[],
  state = "review",
  cwd = fixture,
) {
  writeFileSync(calls, "");
  const result = spawnSync(
    process.execPath,
    [tsx, join(root, script), ...args],
    {
      cwd,
      encoding: "utf8",
      timeout: 60_000,
      env: {
        PATH: `${bin}${delimiter}${process.env.PATH ?? ""}`,
        HOME: join(fixture, "owned-home"),
        XDG_CONFIG_HOME: join(fixture, "owned-config"),
        DOTENV_CONFIG_PATH: "/dev/null",
        NO_COLOR: "1",
        CATALOG_RECORDED_CASE: state,
        CATALOG_RECORDED_HEAD: head,
        CATALOG_RECORDED_BLOB: blob,
        CATALOG_RECORDED_NONANCESTOR: nonAncestor,
        CATALOG_RECORDED_CALLS: calls,
      },
    },
  );
  receipts.push({
    script,
    args,
    state,
    exit: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    recordedQueries: readFileSync(calls, "utf8"),
  });
  return result;
}

function admission(stage: string, state = "review", extra: string[] = []) {
  return command(
    "tools/verify-provider-onboarding.ts",
    ["--catalog-stage", stage, "--provider", "cerebras", ...extra],
    state,
  );
}

function check(name: string, run: () => void): void {
  try {
    run();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    failed += 1;
    console.error(
      `FAIL ${name}:`,
      error instanceof Error ? error.message : String(error),
    );
  } finally {
    writeFileSync(catalogPath, baseline);
  }
}

check(
  "all current catalog records pass source admission with zero live/growth credit",
  () => {
    const result = command(
      "tools/verify-provider-onboarding.ts",
      ["--catalog-stage", "source"],
      "review",
      root,
    );
    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout);
    const expected = readdirSync(join(root, "src/lib/providers/catalog"))
      .filter(
        (file) => file.endsWith(".json") && !file.endsWith(".schema.json"),
      )
      .map(
        (file) =>
          JSON.parse(
            readFileSync(join(root, "src/lib/providers/catalog", file), "utf8"),
          ).id,
      )
      .sort();
    assert.deepEqual(
      output.results
        .map((entry: { provider: string }) => entry.provider)
        .sort(),
      expected,
    );
    assert.equal(output.providerCountCredit, 0);
    assert.equal(output.rosterVerified, false);
    assert.equal(output.liveVerified, false);
    assert.equal(readFileSync(calls, "utf8"), "");
  },
);

for (const field of ["defaultContextWindow", "defaultMaxOutputTokens"]) {
  for (const [label, value] of [
    ["zero", 0],
    ["negative", -1],
    ["fraction", 1.5],
    ["unsafe", Number.MAX_SAFE_INTEGER + 1],
    ["missing", undefined],
  ] as const) {
    check(`${field} rejects ${label}`, () => {
      const changed = structuredClone(source);
      changed.models[field] = value;
      writeFileSync(catalogPath, JSON.stringify(changed));
      const result = admission("source");
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, new RegExp(field));
    });
  }
}

check("infinite numeric literal is rejected through JSON authoring", () => {
  writeFileSync(
    catalogPath,
    baseline.replace(
      /"defaultContextWindow": \d+/,
      '"defaultContextWindow": 1e309',
    ),
  );
  assert.notEqual(admission("source").status, 0);
});

check("positive safe integer boundary remains valid", () => {
  const changed = structuredClone(source);
  changed.models.defaultContextWindow = Number.MAX_SAFE_INTEGER;
  changed.models.defaultMaxOutputTokens = 1;
  writeFileSync(catalogPath, JSON.stringify(changed));
  assert.equal(admission("source").status, 0);
});

for (const billingPolicy of [
  "free-tier",
  "free-with-card",
  "no-free-tier",
  "promotional-credit",
]) {
  check(`source preserves bounded billing policy ${billingPolicy}`, () => {
    const changed = structuredClone(source);
    changed.setup.billingPolicy = billingPolicy;
    writeFileSync(catalogPath, JSON.stringify(changed));
    const result = admission("source");
    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout);
    assert.equal(output.providerCountCredit, 0);
    assert.equal(output.liveVerified, false);
    assert.equal(output.rosterVerified, false);
  });
}

check("billing extension does not admit arbitrary policy strings", () => {
  const changed = structuredClone(source);
  changed.setup.billingPolicy = "unverified-free-credit";
  writeFileSync(catalogPath, JSON.stringify(changed));
  const result = admission("source");
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /billingPolicy/);
});

check(
  "editor mirror preserves all billing values and bounded tool guard",
  () => {
    const mirror = JSON.parse(
      readFileSync(
        join(root, "src/lib/providers/catalog/provider-catalog.schema.json"),
        "utf8",
      ),
    );
    assert.deepEqual(mirror.properties.setup.properties.billingPolicy.enum, [
      "free-tier",
      "free-with-card",
      "no-free-tier",
      "promotional-credit",
    ]);
    assert.equal(
      mirror.properties.quirks.properties.rejectRequiredToolChoice.type,
      "boolean",
    );
    assert.equal(mirror.properties.quirks.additionalProperties, false);
    assert.ok(
      !mirror.properties.quirks.required?.includes("rejectRequiredToolChoice"),
      "The provider guard must remain optional for existing entries",
    );
  },
);

for (const enabled of [false, true]) {
  check(`source accepts explicit tool guard ${enabled}`, () => {
    const changed = structuredClone(source);
    changed.quirks = {
      ...changed.quirks,
      rejectRequiredToolChoice: enabled,
    };
    writeFileSync(catalogPath, JSON.stringify(changed));
    const result = admission("source");
    assert.equal(result.status, 0, result.stderr);
  });
}

check("tool guard does not accept a truthy string", () => {
  const changed = structuredClone(source);
  changed.quirks = { ...changed.quirks, rejectRequiredToolChoice: "true" };
  writeFileSync(catalogPath, JSON.stringify(changed));
  const result = admission("source");
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /rejectRequiredToolChoice/);
});

check(
  "catalog default constraint does not tighten optional per-model zero overrides",
  () => {
    const changed = structuredClone(source);
    changed.models.catalog[changed.models.default].maxOutputTokens = 0;
    writeFileSync(catalogPath, JSON.stringify(changed));
    assert.equal(admission("source").status, 0);
  },
);

check("draft scaffold remains visibly incomplete and earns no credit", () => {
  const out = join(fixture, "scaffold");
  const scaffold = command("tools/scaffold-provider.ts", [
    "--name=owned-vendor",
    "--tier=2",
    "--baseURL=https://owned.example.invalid/v1",
    "--envVar=OWNED_VENDOR_API_KEY",
    "--defaultModel=owned-model",
    `--out=${out}`,
  ]);
  assert.equal(scaffold.status, 0, scaffold.stderr);
  const path = join(out, "owned-vendor.json");
  const entry = JSON.parse(readFileSync(path, "utf8"));
  assert.equal(entry.models.defaultContextWindow, 0);
  assert.equal(entry.evidence.addedInPR, "PENDING_PR");
  const inspection = command("tools/verify-provider-onboarding.ts", [
    "--catalog-stage",
    "draft",
    "--catalog-file",
    path,
  ]);
  assert.equal(inspection.status, 0, inspection.stderr);
  const output = JSON.parse(inspection.stdout);
  assert.equal(output.results[0].state, "incomplete_draft");
  assert.equal(output.results[0].sourceReady, false);
  assert.equal(output.providerCountCredit, 0);
  assert.notEqual(
    command("tools/verify-provider-onboarding.ts", [
      "--catalog-stage",
      "source",
      "--catalog-file",
      path,
    ]).status,
    0,
  );
});

check("exact pending marker is source-only and cannot enter PR review", () => {
  const changed = structuredClone(source);
  changed.evidence.addedInPR = "PENDING_PR";
  writeFileSync(catalogPath, JSON.stringify(changed));
  const output = JSON.parse(admission("source").stdout);
  assert.equal(output.results[0].state, "source_ready_introduction_pending");
  assert.equal(output.providerCountCredit, 0);
  const review = admission("review");
  assert.notEqual(review.status, 0);
  assert.match(review.stderr, /introduction is pending/);
});

for (const provenance of [
  "PENDING_NO_PR",
  "https://github.com/different/repository/pull/4242",
]) {
  check(`source rejects noncanonical provenance ${provenance}`, () => {
    const changed = structuredClone(source);
    changed.evidence.addedInPR = provenance;
    writeFileSync(catalogPath, JSON.stringify(changed));
    const result = admission("source");
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /addedInPR must be PENDING_PR/);
  });
}

check("docs-only evidence cannot certify roster/live/package/release", () => {
  const output = JSON.parse(admission("source").stdout);
  assert.equal(output.rosterVerified, false);
  assert.equal(output.liveVerified, false);
  assert.equal(output.packageVerified, false);
  assert.equal(output.published, false);
  for (const stage of ["roster", "live", "package", "release"]) {
    const result = admission(stage);
    assert.notEqual(result.status, 0);
    assert.match(
      result.stderr,
      /cannot certify roster, live, package or release/,
    );
  }
});

check("review observes the actual recorded PR head and added-file blob", () => {
  const result = admission("review", "review", ["--source-head", head]);
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.results[0].state, "introduction_pr_association_verified");
  assert.equal(output.results[0].provenance.introductionHead, head);
  assert.equal(output.providerCountCredit, 0);
  assert.match(readFileSync(calls, "utf8"), /pulls\/4242\/files/);
});

check("paired, equals and mixed admission CLI arguments agree", () => {
  const sourceResult = command("tools/verify-provider-onboarding.ts", [
    "--catalog-stage=source",
    "--provider",
    "cerebras",
  ]);
  assert.equal(sourceResult.status, 0, sourceResult.stderr);
  assert.equal(
    JSON.parse(sourceResult.stdout).results[0].state,
    "source_ready_provenance_unverified",
  );
  const reviewResult = command("tools/verify-provider-onboarding.ts", [
    "--catalog-stage=review",
    "--provider=cerebras",
    `--source-head=${head}`,
  ]);
  assert.equal(reviewResult.status, 0, reviewResult.stderr);
  assert.equal(
    JSON.parse(reviewResult.stdout).results[0].provenance.introductionHead,
    head,
  );
});

for (const [state, reason] of [
  ["nonexistent", /owned missing PR/],
  ["wrong-repo", /does not identify the requested repository/],
  ["unrelated", /does not introduce this provider file/],
  ["modified", /does not introduce this provider file/],
  ["stale", /head is stale or unrelated/],
  ["blob", /provider-file blob differs/],
  ["pagination", /pagination is incomplete/],
  ["changed", /changed during provenance observation/],
] as const) {
  check(`review rejects ${state} provenance`, () => {
    const result = admission("review", state);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, reason);
  });
}

check(
  "review rejects uncommitted source bytes and stale requested head",
  () => {
    writeFileSync(catalogPath, baseline + " ");
    const changed = admission("review");
    assert.notEqual(changed.status, 0);
    assert.match(
      changed.stderr,
      /bytes differ from the immutable local source head/,
    );
    writeFileSync(catalogPath, baseline);
    const stale = admission("review", "review", [
      "--source-head",
      "0".repeat(40),
    ]);
    assert.notEqual(stale.status, 0);
    assert.match(stale.stderr, /requested source head does not match/);
  },
);

check("merged introduction requires ancestry and all exact-head checks", () => {
  const result = admission("merged", "merged");
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(
    output.results[0].state,
    "historical_catalog_file_introduction_verified",
  );
  assert.equal(output.results[0].provenance.requiredChecks.length, 5);
  assert.equal(output.liveVerified, false);
});

for (const state of [
  "review",
  "merged-ancestry",
  "merged-missing",
  "merged-neutral",
  "merged-skipped",
  "merged-stale-check",
  "merged-rerun",
]) {
  check(`merged rejects ${state}`, () => {
    const result = admission("merged", state);
    assert.notEqual(result.status, 0);
    assert.match(
      result.stderr,
      state === "review"
        ? /requires an actual merged introduction PR/
        : state === "merged-ancestry"
          ? /merge-base --is-ancestor/
          : /not completed SUCCESS/,
    );
  });
}

check(
  "historical proof does not certify a deleted/replaced current product",
  () => {
    try {
      git(["rm", "--", "src/lib/providers/catalog/cerebras.json"]);
      git(["commit", "-qm", "fixture deletes historical provider file"]);
      const replacement = structuredClone(source);
      replacement.displayName = "Replacement product with the reused path";
      mkdirSync(dirname(catalogPath), { recursive: true });
      writeFileSync(catalogPath, JSON.stringify(replacement, null, 2) + "\n");
      git(["add", "src/lib/providers/catalog/cerebras.json"]);
      git(["commit", "-qm", "fixture reuses the provider path"]);
      const currentHead = git(["rev-parse", "HEAD"]);
      const result = admission("merged", "merged");
      assert.equal(result.status, 0, result.stderr);
      const output = JSON.parse(result.stdout);
      assert.equal(
        output.results[0].state,
        "historical_catalog_file_introduction_verified",
      );
      assert.equal(
        output.results[0].provenance.proofScope,
        "historical_catalog_file_introduction",
      );
      assert.equal(output.results[0].provenance.sourceHead, currentHead);
      assert.equal(output.results[0].provenance.introductionHead, head);
      assert.notEqual(currentHead, head);
      assert.match(
        output.results[0].provenance.limitation,
        /not current product identity or content continuity/,
      );
      assert.equal(output.providerCountCredit, 0);
    } finally {
      git(["checkout", "--detach", "-q", head]);
    }
  },
);

writeFileSync(
  join(evidence, "authoring-command-receipts.json"),
  JSON.stringify(
    { fixture, head, blob, passed, failed, skipped: 0, receipts },
    null,
    2,
  ) + "\n",
);
console.log(`Catalog admission: ${passed} passed, ${failed} failed, 0 skipped`);
process.exitCode = failed === 0 ? 0 : 1;
