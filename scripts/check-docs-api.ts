#!/usr/bin/env tsx
/**
 * check-docs-api.ts
 *
 * Local twin of the CI step "Check generated API docs are current"
 * (.github/workflows/ci.yml, job `test-shards`, group `validate`): regenerate
 * docs/api and fail if that changes anything git tracks there.
 *
 * Why this exists
 * ---------------
 * That step is separate from `pnpm run validate` and `pnpm run validate:all`,
 * and neither of those touches docs/api. A green local `validate:all` therefore
 * says nothing about it: PR #1862 passed both locally, then failed the required
 * `test` check on two stale pages (type-aliases/CatalogQuirks.md and
 * type-aliases/OpenAICompatCatalogEntry.md). Running it before the push finds
 * the drift in under a minute instead of after a full CI run.
 *
 * What it runs
 * ------------
 * The CI step's commands in its order, plus the sync CI does in an earlier step:
 *
 *   pnpm exec svelte-kit sync            typedoc's tsconfig extends the file this
 *                                        writes; a fresh local tree has not had it
 *   pnpm run docs:api
 *   pnpm exec prettier --write docs/api  the committed pages are prettier output
 *   git status --porcelain docs/api      must print nothing
 *
 * `git status`, not `git diff`: typedoc.json sets `cleanOutputDir`, so drift can
 * be a page that was added or removed, and a diff shows neither.
 *
 * Local behaviour CI does not need
 * --------------------------------
 *  - docs/api must be clean BEFORE the run. Regeneration rewrites every file
 *    there, so uncommitted edits would be overwritten or deleted, and an edit
 *    that happens to equal the regenerated output would pass while committing
 *    nothing, which CI would then reject. The check refuses to start instead,
 *    and never stashes, resets or cleans anything on your behalf.
 *  - A failing run leaves the regenerated files in the working tree. They are
 *    the fix: `git add docs/api`, then commit (or amend) them.
 *  - The verdict is about the working tree and CI's is about the pushed commits.
 *    They agree once everything is committed.
 *  - On Windows the pnpm steps run through the shell, because pnpm is a .cmd
 *    shim that Node cannot launch directly. git is still launched directly.
 *
 * A pass has to have measured something
 * -------------------------------------
 * An empty `git status` is also what a run that did nothing produces, so the
 * script proves the work landed before it trusts the result: docs/api is
 * tracked and populated, and typedoc exited 0 AND wrote every file under it
 * during this run. typedoc wipes the directory first, so a file older than the
 * run was not written by it.
 *
 * Exit codes
 * ----------
 *  0  docs/api matches what the source generates.
 *  1  docs/api is stale, was dirty before the run, a step failed, or the check
 *     could not measure (git or docs/api missing, typedoc produced nothing).
 */

import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Derived from this file rather than process.cwd(): the pnpm scripts and the
// git pathspecs below are only right from the repository root, and a hook or
// an editor can start this from any directory.
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DOCS_API = "docs/api";

// docs/api holds ~3,800 pages. This floor is far above "typedoc produced
// nothing" and far below any realistic shrink of the API surface.
const MINIMUM_FILES = 1_000;
const GIT_TIMEOUT_MS = 60_000;
const MAX_BUFFER_BYTES = 64 * 1024 * 1024;
const FAILURE_TAIL_LINES = 30;
const DIFFSTAT_TAIL_LINES = 20;
const LISTED_PATHS = 40;
const STALE_EXAMPLES = 5;

type Step = {
  readonly command: string;
  readonly args: readonly string[];
  readonly writesDocsApi: boolean;
};

const SYNC: Step = {
  command: "pnpm",
  args: ["exec", "svelte-kit", "sync"],
  writesDocsApi: false,
};
const TYPEDOC: Step = {
  command: "pnpm",
  args: ["run", "docs:api"],
  writesDocsApi: true,
};
const PRETTIER: Step = {
  command: "pnpm",
  args: ["exec", "prettier", "--write", DOCS_API],
  writesDocsApi: true,
};

type Outcome = {
  readonly failure: string | null;
  readonly stdout: string;
  readonly output: string;
  readonly seconds: number;
};

const describeFailure = (
  command: string,
  result: SpawnSyncReturns<string>,
): string | null => {
  if (result.error) {
    return `could not run ${command}: ${result.error.message}`;
  }
  if (result.signal) {
    return `${command} was killed by ${result.signal}`;
  }
  return result.status === 0
    ? null
    : `${command} exited with status ${result.status}`;
};

// A timeout kills the child, which for the generators is pnpm and not the
// typedoc process under it. That would go on writing into docs/api after this
// script had reported, so only git is bounded (a stuck git would hang a hook).
const run = (
  command: string,
  args: readonly string[],
  timeoutMs?: number,
): Outcome => {
  const started = Date.now();
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: MAX_BUFFER_BYTES,
    // On Windows pnpm is a .cmd shim, which Node can only launch through a shell.
    shell: process.platform === "win32" && command === "pnpm",
    timeout: timeoutMs,
  });
  // Both streams are null, not empty, when the process never started.
  const stdout = result.stdout ?? "";
  return {
    failure: describeFailure(command, result),
    stdout,
    output: stdout + (result.stderr ?? ""),
    seconds: Math.round((Date.now() - started) / 1000),
  };
};

const git = (args: readonly string[]): Outcome =>
  run("git", ["--no-optional-locks", ...args], GIT_TIMEOUT_MS);

const docsApiStatus = (): Outcome =>
  git(["status", "--porcelain", "--untracked-files=all", "--", DOCS_API]);

const nonEmptyLines = (text: string): readonly string[] =>
  text.split("\n").filter((line) => line.length > 0);

const tail = (text: string, count: number): string =>
  text.trim() === ""
    ? "(no output)"
    : nonEmptyLines(text).slice(-count).join("\n");

const listed = (entries: readonly string[]): readonly string[] => [
  ...entries.slice(0, LISTED_PATHS),
  ...(entries.length > LISTED_PATHS
    ? [`... and ${entries.length - LISTED_PATHS} more`]
    : []),
];

const fail = (...lines: readonly string[]): number => {
  console.error(lines.join("\n"));
  return 1;
};

const reportGitFailure = (what: string, outcome: Outcome): number =>
  fail(
    `\n❌ cannot ${what}: ${outcome.failure}`,
    tail(outcome.output, FAILURE_TAIL_LINES),
    "",
    "The verdict is read from git, so nothing was checked.",
  );

const runStep = (step: Step): { outcome: Outcome; text: string } => {
  const text = [step.command, ...step.args].join(" ");
  process.stdout.write(`   ${text} ... `);
  const outcome = run(step.command, step.args);
  console.log(outcome.failure === null ? `ok (${outcome.seconds}s)` : "FAILED");
  return { outcome, text };
};

const reportStepFailure = (
  step: Step,
  text: string,
  outcome: Outcome,
): number =>
  fail(
    `\n❌ \`${text}\` failed: ${outcome.failure}`,
    tail(outcome.output, FAILURE_TAIL_LINES),
    "",
    `Run \`${text}\` to see all of its output.`,
    ...(step.writesDocsApi
      ? [
          `${DOCS_API} may now hold partial output from this run; ` +
            `\`git status ${DOCS_API}\` shows what changed.`,
        ]
      : []),
  );

const collectFiles = (dir: string): readonly string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      return collectFiles(full);
    }
    return entry.isFile() ? [full] : [];
  });

const listFiles = (dir: string): readonly string[] | null => {
  try {
    return collectFiles(dir);
  } catch {
    return null;
  }
};

type OutputProof =
  | { readonly ok: true; readonly fileCount: number }
  | { readonly ok: false; readonly problem: string };

const proveOutput = (typedocStartedMs: number): OutputProof => {
  const files = listFiles(join(ROOT, DOCS_API));
  if (files === null) {
    return {
      ok: false,
      problem: `typedoc exited 0 but ${DOCS_API} cannot be listed afterwards (missing or unreadable).`,
    };
  }
  if (files.length < MINIMUM_FILES) {
    return {
      ok: false,
      problem:
        `typedoc exited 0 but left only ${files.length} file(s) under ` +
        `${DOCS_API} (expected at least ${MINIMUM_FILES}).`,
    };
  }
  const stale = files.filter(
    (file) => statSync(file).mtimeMs < typedocStartedMs,
  );
  if (stale.length > 0) {
    return {
      ok: false,
      problem: [
        `typedoc exited 0 but did not write ${stale.length} of ${files.length} ` +
          `file(s) under ${DOCS_API}, for example:`,
        ...stale.slice(0, STALE_EXAMPLES).map((file) => relative(ROOT, file)),
      ].join("\n"),
    };
  }
  return { ok: true, fileCount: files.length };
};

const main = (): number => {
  console.log(
    `Checking ${DOCS_API} against the source ` +
      `(mirrors the CI step "Check generated API docs are current")`,
  );

  const tracked = git(["ls-files", "--", DOCS_API]);
  if (tracked.failure !== null) {
    return reportGitFailure(
      `list the files git tracks under ${DOCS_API}`,
      tracked,
    );
  }
  const trackedCount = nonEmptyLines(tracked.stdout).length;
  if (trackedCount < MINIMUM_FILES) {
    return fail(
      `\n❌ git tracks only ${trackedCount} file(s) under ${DOCS_API} ` +
        `(expected at least ${MINIMUM_FILES}).`,
      "An empty `git status` proves nothing about a directory that is not committed.",
    );
  }

  const before = docsApiStatus();
  if (before.failure !== null) {
    return reportGitFailure(`read git status for ${DOCS_API}`, before);
  }
  const dirty = nonEmptyLines(before.stdout);
  if (dirty.length > 0) {
    return fail(
      `\n❌ ${DOCS_API} already has uncommitted changes (${dirty.length} path(s)):`,
      ...listed(dirty),
      "",
      "Regenerating rewrites every file there, so these would be overwritten or",
      "deleted, and CI only sees what you push. Commit or discard them, then run",
      "this again. Nothing was changed.",
    );
  }

  const sync = runStep(SYNC);
  if (sync.outcome.failure !== null) {
    return reportStepFailure(SYNC, sync.text, sync.outcome);
  }

  // Whole seconds, because some filesystems store mtimes no finer than that.
  const typedocStartedMs = Math.floor(Date.now() / 1000) * 1000;
  const typedoc = runStep(TYPEDOC);
  if (typedoc.outcome.failure !== null) {
    return reportStepFailure(TYPEDOC, typedoc.text, typedoc.outcome);
  }
  const prettier = runStep(PRETTIER);
  if (prettier.outcome.failure !== null) {
    return reportStepFailure(PRETTIER, prettier.text, prettier.outcome);
  }

  const proof = proveOutput(typedocStartedMs);
  if (!proof.ok) {
    return fail(
      `\n❌ ${proof.problem}`,
      `${DOCS_API} was not verified: a run that wrote this little cannot say ` +
        "whether it is current.",
    );
  }

  const after = docsApiStatus();
  if (after.failure !== null) {
    return reportGitFailure(`read git status for ${DOCS_API}`, after);
  }
  const drift = nonEmptyLines(after.stdout);
  if (drift.length > 0) {
    const diffstat = git(["diff", "--stat", "--", DOCS_API]);
    return fail(
      `\n❌ ${DOCS_API} is out of date with src/ (${drift.length} path(s) differ):`,
      ...listed(drift),
      "",
      "The regenerated files are now in your working tree. Review them and commit",
      "them (amend instead if this PR already has its one commit):",
      `    git add ${DOCS_API}`,
      "To regenerate by hand:",
      `    pnpm run docs:api && pnpm exec prettier --write ${DOCS_API}`,
      ...(diffstat.failure === null
        ? ["", tail(diffstat.stdout, DIFFSTAT_TAIL_LINES)]
        : []),
    );
  }

  console.log(
    `✅ ${DOCS_API} matches the source it documents ` +
      `(${proof.fileCount} files, all written by this run).`,
  );
  return 0;
};

// exitCode, not exit(): the process ends once stdout has drained, so output
// piped through `tee` or a hook runner is never cut short.
process.exitCode = main();
