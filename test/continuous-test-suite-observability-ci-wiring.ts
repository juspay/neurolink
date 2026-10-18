#!/usr/bin/env tsx
/**
 * Continuous Test Suite: Observability follow-up, the suites run in CI
 *
 * Follow-up to the Langfuse OTEL pipeline (BZ-6924), finding K20: the rewritten
 * offline observability suite ran only inside `test:live` and no workflow
 * invoked it, so nothing stopped it from rotting. Every check prints one line,
 * `PROOF K20 PASS|FAIL <what is checked>`, and the suite exits non-zero when
 * any check fails.
 *
 * It reads `package.json` and `.github/workflows/ci.yml` and works out, for
 * every observability suite file under `test/`, whether a package script runs
 * it and whether a CI step reaches that script (directly or through another
 * script such as an aggregate). It is driven by the files on disk, so a suite
 * added later is covered without editing this file.
 *
 * It imports nothing from `src/` or `dist/`: it reads repository files, so
 * Critical Rule 15 does not need an exception.
 *
 * Run: pnpm exec tsx test/continuous-test-suite-observability-ci-wiring.ts
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (relative: string): string =>
  readFileSync(join(root, relative), "utf8");

type Scripts = Record<string, string>;

/** Script names a command line runs through `pnpm run <name>`, `pnpm <name>` or `npm run <name>`. */
function scriptsRunBy(command: string, scripts: Scripts): string[] {
  const names: string[] = [];
  for (const match of command.matchAll(
    /(?:pnpm|npm)\s+(?:run\s+)?([A-Za-z0-9:_.-]+)/g,
  )) {
    if (Object.hasOwn(scripts, match[1])) {
      names.push(match[1]);
    }
  }
  return names;
}

/** Every script reachable from `starts` by following `pnpm run` chains. */
function reachable(starts: readonly string[], scripts: Scripts): Set<string> {
  const seen = new Set<string>();
  const queue = [...starts];
  for (let name = queue.pop(); name !== undefined; name = queue.pop()) {
    if (seen.has(name)) {
      continue;
    }
    seen.add(name);
    queue.push(...scriptsRunBy(scripts[name] ?? "", scripts));
  }
  return seen;
}

const scripts = (JSON.parse(read("package.json")) as { scripts: Scripts })
  .scripts;
const ci = read(".github/workflows/ci.yml");
const ciRuns = [
  ...ci.matchAll(/^\s*run:\s*(.+)$/gm),
  ...ci.matchAll(/^\s+(pnpm .+)$/gm),
].flatMap((match) => scriptsRunBy(match[1], scripts));
const wired = reachable(ciRuns, scripts);

const suiteFiles = readdirSync(join(root, "test"))
  .filter(
    (file) =>
      /^continuous-test-suite-observability.*\.ts$/.test(file) ||
      file === "continuous-test-suite-span-content-redaction.ts",
  )
  .sort();

let failed = 0;
function proof(description: string, passed: boolean): void {
  if (!passed) {
    failed += 1;
  }
  console.log(`PROOF K20 ${passed ? "PASS" : "FAIL"} ${description}`);
}

const scriptsRunning = (file: string): string[] =>
  Object.entries(scripts)
    .filter(([, command]) => command.includes(`test/${file}`))
    .map(([name]) => name);

// Controls first: a "wired" verdict means nothing unless the resolver can also say "not wired".
const fixture: Scripts = {
  entry: "pnpm run aggregate && echo done",
  aggregate: "pnpm run leaf",
  leaf: "pnpm exec tsx test/leaf.ts",
  orphan: "pnpm exec tsx test/orphan.ts",
};
const fixtureReach = reachable(["entry"], fixture);
proof(
  "control: the resolver follows an aggregate script to the script that runs a suite",
  fixtureReach.has("leaf") && !fixtureReach.has("orphan"),
);
proof(
  "control: a suite CI already runs (proxy telemetry) is resolved as wired",
  scriptsRunning("continuous-test-suite-proxy-telemetry.ts").some((name) =>
    wired.has(name),
  ),
);
proof(
  "control: the resolver reads at least one observability suite file from test/",
  suiteFiles.length >= 2,
);

for (const file of suiteFiles) {
  const runners = scriptsRunning(file);
  proof(`${file} is run by a package script`, runners.length > 0);
  proof(
    `${file} is reached by a CI step`,
    runners.some((name) => wired.has(name)),
  );
}

// The follow-up suites compare against the pre-fix commit through `git show`;
// a default shallow checkout does not have it, so the CI job must fetch it.
const BASELINE = "fc892bbb58087096594f7ab80d5105e62a94189c";
const readingHistory = suiteFiles.filter((file) => {
  const source = read(`test/${file}`);
  return /git",\s*\[\s*"show"|git show|baselineText/.test(source);
});
proof(
  "every suite that reads the pre-fix commit through git has that commit fetched by a CI step",
  readingHistory.length === 0 ||
    new RegExp(`git fetch[^\\n]*${BASELINE}`).test(ci),
);

process.exit(failed === 0 ? 0 : 1);
