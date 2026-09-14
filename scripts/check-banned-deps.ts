#!/usr/bin/env tsx
/**
 * check-banned-deps.ts
 *
 * Structured dependency-graph guard for the completed Vercel AI SDK removal.
 *
 * Fails the build/test if any package in BANNED_PACKAGES — `ai`,
 * `@ai-sdk/provider` and every `@ai-sdk/*` provider wrapper NeuroLink used to
 * depend on — is reachable through any production dependency path, lockfile
 * package snapshot, or non-comment source import.
 *
 * Detection strategy
 * ------------------
 * 1. package.json runtime sections
 *    - `dependencies`, `optionalDependencies`, and `peerDependencies` are
 *      treated as production. Banned entries are an error.
 *    - `devDependencies` is allowed; banned entries are reported as warnings
 *      only because the milestone narrows scope to production.
 *
 * 2. pnpm-lock.yaml structural parse
 *    - Walks the `importers` section and flags any banned package that lives
 *      under `dependencies`/`optionalDependencies` for the root importer.
 *      Hits under `devDependencies` are warnings.
 *    - Walks the `snapshots` (and legacy `packages`) section. We do not fail
 *      on snapshots alone — a banned snapshot can exist as part of a dev path
 *      — but we surface them so a regression that re-introduces a runtime
 *      path is easy to spot when paired with the importer + pnpm-why checks.
 *
 * 3. pnpm why (runtime paths only)
 *    - Invokes `pnpm why --prod --json` for each banned package and flags any
 *      hit. This is the strictest check: pnpm itself decides whether the
 *      package is reachable from runtime dependencies.
 *
 * 4. Source/test/script imports
 *    - Greps the repo's own source trees for `from "<banned>"` or
 *      `require("<banned>")`.
 *    - Comments are explicitly ignored so explanatory references like
 *      "GoogleVertexProvider no longer uses @ai-sdk/google-vertex" remain
 *      legal.
 *    - ALLOWED_IMPORT_PREFIXES exempts consumer-facing integration examples,
 *      where the banned package is the reader's dependency and not ours.
 *
 * Exit codes
 * ----------
 *  0  All checks pass (no banned production references).
 *  1  At least one banned reference found in a runtime/source path.
 */

import {
  readFileSync,
  existsSync,
  readdirSync,
  statSync,
  type Stats,
} from "node:fs";
import { join, extname } from "node:path";
import { execSync } from "node:child_process";
import yaml from "js-yaml";

// Escape every regex metacharacter so package names (which may legitimately
// contain `.` and other special chars in the future, e.g. scoped paths) are
// interpolated as literals. The previous version only escaped `/`, which
// CodeQL correctly flagged as incomplete escaping.
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const BANNED_PACKAGES = [
  "@ai-sdk/google",
  "@ai-sdk/google-vertex",
  "@ai-sdk/google-vertex/anthropic",
  // Removed with the browser bundle's native provider factories
  // (src/browser/nativeProviders.ts). They were installed for six re-exports
  // and nothing else.
  "@ai-sdk/anthropic",
  "@ai-sdk/mistral",
  // AudioProcessor now posts multipart audio to the transcription endpoint
  // itself; the browser bundle's factories are native.
  "@ai-sdk/openai",
  // Generation is native end to end and the public types are declared in
  // src/lib/types/aiCompat.ts.
  "ai",
  "@ai-sdk/provider",
  // Listed but never imported anywhere in source — guard against accidental
  // reintroduction. ollama.ts speaks the native HTTP API directly.
  "ollama-ai-provider",
] as const;

type Severity = "error" | "warning";

type Finding = {
  severity: Severity;
  source: string;
  detail: string;
};

const findings: Finding[] = [];

function record(
  severity: Severity,
  source: string,
  detail: string,
): void {
  findings.push({ severity, source, detail });
}

function checkPackageJson(rootDir: string, label = "package.json"): void {
  const pkgPath = join(rootDir, "package.json");
  if (!existsSync(pkgPath)) {
    return;
  }
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as Record<
    string,
    unknown
  >;

  const runtimeSections = [
    "dependencies",
    "optionalDependencies",
    "peerDependencies",
  ] as const;

  for (const section of runtimeSections) {
    const deps = pkg[section] as Record<string, string> | undefined;
    if (!deps) {
      continue;
    }
    for (const banned of BANNED_PACKAGES) {
      // peer/dep keys never include the subpath, so strip it for the lookup
      const lookup = banned.includes("/anthropic")
        ? banned.replace("/anthropic", "")
        : banned;
      if (deps[lookup]) {
        record(
          "error",
          `${label}:${section}`,
          `Banned package "${lookup}" present (version "${deps[lookup]}").`,
        );
      }
    }
  }

  const dev = pkg.devDependencies as Record<string, string> | undefined;
  if (dev) {
    for (const banned of BANNED_PACKAGES) {
      const lookup = banned.includes("/anthropic")
        ? banned.replace("/anthropic", "")
        : banned;
      if (dev[lookup]) {
        record(
          "warning",
          `${label}:devDependencies`,
          `Banned package "${lookup}" present in devDependencies (version "${dev[lookup]}"). Allowed by milestone scope but flagged for awareness.`,
        );
      }
    }
  }
}

type PnpmImporter = {
  dependencies?: Record<string, { specifier?: string; version?: string }>;
  optionalDependencies?: Record<
    string,
    { specifier?: string; version?: string }
  >;
  devDependencies?: Record<string, { specifier?: string; version?: string }>;
};

type PnpmLock = {
  importers?: Record<string, PnpmImporter>;
  packages?: Record<string, unknown>;
  snapshots?: Record<string, unknown>;
};

function checkPnpmLock(rootDir: string): void {
  const lockPath = join(rootDir, "pnpm-lock.yaml");
  if (!existsSync(lockPath)) {
    return;
  }

  let lock: PnpmLock;
  try {
    lock = yaml.load(readFileSync(lockPath, "utf8")) as PnpmLock;
  } catch (err) {
    record(
      "error",
      "pnpm-lock.yaml",
      `Failed to parse lockfile: ${err instanceof Error ? err.message : String(err)}`,
    );
    return;
  }

  const importers = lock.importers ?? {};
  for (const [importerName, importer] of Object.entries(importers)) {
    const runtimeSections = [
      ["dependencies", "error"],
      ["optionalDependencies", "error"],
    ] as const;
    for (const [section, sev] of runtimeSections) {
      const entries = importer[section];
      if (!entries) {
        continue;
      }
      for (const banned of BANNED_PACKAGES) {
        const lookup = banned.includes("/anthropic")
          ? banned.replace("/anthropic", "")
          : banned;
        if (entries[lookup]) {
          record(
            sev,
            `pnpm-lock.yaml:importer ${importerName}:${section}`,
            `Banned package "${lookup}" pinned at "${
              entries[lookup].specifier ?? entries[lookup].version ?? "(unknown)"
            }".`,
          );
        }
      }
    }
    const dev = importer.devDependencies;
    if (dev) {
      for (const banned of BANNED_PACKAGES) {
        const lookup = banned.includes("/anthropic")
          ? banned.replace("/anthropic", "")
          : banned;
        if (dev[lookup]) {
          record(
            "warning",
            `pnpm-lock.yaml:importer ${importerName}:devDependencies`,
            `Banned package "${lookup}" present in dev importer slot (version "${
              dev[lookup].specifier ?? dev[lookup].version ?? "?"
            }").`,
          );
        }
      }
    }
  }

  // Snapshot-only hits get reported as warnings — they do not necessarily
  // imply a runtime path, but pairing them with pnpm-why output below keeps
  // false-positives tractable.
  const snapshots = {
    ...(lock.packages ?? {}),
    ...(lock.snapshots ?? {}),
  };
  for (const key of Object.keys(snapshots)) {
    for (const banned of BANNED_PACKAGES) {
      const lookup = banned.includes("/anthropic")
        ? banned.replace("/anthropic", "")
        : banned;
      // Lockfile keys look like "@ai-sdk/google@3.0.61" or
      // "'@ai-sdk/google-vertex@4.0.106(zod@4.3.6)'".
      if (key.startsWith(`${lookup}@`) || key.startsWith(`'${lookup}@`)) {
        record(
          "warning",
          "pnpm-lock.yaml:snapshots",
          `Banned package snapshot "${key}" present in lockfile. Acceptable only if pnpm-why shows no production path.`,
        );
      }
    }
  }
}

function checkPnpmWhy(): void {
  for (const banned of BANNED_PACKAGES) {
    const lookup = banned.includes("/anthropic")
      ? banned.replace("/anthropic", "")
      : banned;
    let output: string;
    try {
      output = execSync(`pnpm why --prod --json ${lookup}`, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (err: unknown) {
      // `pnpm why` exits non-zero when the package is unreachable from prod;
      // that is the success case for our guard.
      const errExec = err as { stdout?: Buffer; stderr?: Buffer };
      const stdout =
        typeof errExec.stdout?.toString === "function"
          ? errExec.stdout.toString()
          : "";
      // pnpm sometimes still prints valid JSON on stdout even with non-zero
      // exit, so attempt to use that if present
      output = stdout || "";
    }
    if (!output.trim()) {
      // No prod path — clean
      continue;
    }
    try {
      const parsed = JSON.parse(output);
      // Output is an array of importer reports; check if any has dependencies/devDependencies
      const importers = Array.isArray(parsed) ? parsed : [parsed];
      let hasProdPath = false;
      for (const importer of importers) {
        if (importer?.dependencies) {
          // Only flag if the banned package actually appears under dependencies
          const stack = [importer.dependencies];
          while (stack.length > 0) {
            const node = stack.shift() as Record<string, unknown> | undefined;
            if (!node) {
              continue;
            }
            for (const [name, value] of Object.entries(node)) {
              if (name === lookup) {
                hasProdPath = true;
                break;
              }
              if (
                value &&
                typeof value === "object" &&
                "dependencies" in value
              ) {
                stack.push(
                  (value as { dependencies?: Record<string, unknown> })
                    .dependencies ?? {},
                );
              }
            }
            if (hasProdPath) {
              break;
            }
          }
        }
        if (hasProdPath) {
          break;
        }
      }
      if (hasProdPath) {
        record(
          "error",
          "pnpm why --prod",
          `Banned package "${lookup}" reachable from a production dependency path.`,
        );
      }
    } catch {
      // pnpm output wasn't JSON we could parse; conservatively flag presence
      record(
        "warning",
        "pnpm why --prod",
        `Could not parse pnpm-why output for "${lookup}"; manual review required.`,
      );
    }
  }
}

const SOURCE_EXTS = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs"]);
// Paths where a banned import is the READER's dependency, not NeuroLink's.
// examples/client-sdks/ demonstrates driving NeuroLink from a third-party SDK
// (see createNeuroLinkProvider in src/lib/client/aiSdkAdapter.ts); the consumer
// installs that SDK in their own project.
const ALLOWED_IMPORT_PREFIXES = ["examples/client-sdks/"];

/**
 * Directories the SOURCE scan does not descend into. Its job is to grep real
 * source for banned imports, so build output is excluded because a bundled or
 * minified artifact re-states imports the source already declares — matching
 * them again would report the same violation twice and, worse, report one that
 * no longer exists in source against a stale `dist/`.
 */
const SOURCE_SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  "action-dist",
  ".svelte-kit",
  ".git",
]);

/**
 * Directories the MANIFEST scan does not descend into. A separate list from
 * SOURCE_SKIP_DIRS because the two scans exclude things for unrelated reasons:
 * sharing one set meant an entry added for a source-grep reason silently
 * stopped a real workspace package's `package.json` from being checked at all.
 *
 * `node_modules` and `.git` hold manifests that are not ours. `dist` and
 * `.svelte-kit` are gitignored build output, so scanning them would make the
 * result depend on whether the tree happens to have been built — a fresh clone
 * has neither, a developer's tree has both.
 *
 * `action-dist` is deliberately NOT excluded: `.gitignore` un-ignores it and
 * its `package.json` is tracked, so it is a real shipped manifest. Inheriting
 * the source list skipped it, which meant a banned dependency added there
 * would never have been caught.
 */
const MANIFEST_SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  ".svelte-kit",
  ".git",
]);

function collectSourceFiles(rootDir: string): string[] {
  const out: string[] = [];
  const stack: string[] = [
    "src",
    "test",
    "scripts",
    "tools",
    "eslint-rules",
    "landing",
    "docs-site",
    "neurolink-demo",
    "examples",
  ]
    .map((d) => join(rootDir, d))
    .filter((p) => existsSync(p));
  while (stack.length > 0) {
    const dir = stack.shift()!;
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = join(dir, entry);
      let stat: Stats;
      try {
        stat = statSync(full);
      } catch {
        continue;
      }
      if (stat.isDirectory()) {
        if (!SOURCE_SKIP_DIRS.has(entry)) {
          stack.push(full);
        }
      } else if (stat.isFile() && SOURCE_EXTS.has(extname(entry))) {
        out.push(full);
      }
    }
  }
  return out;
}

function checkSourceImports(rootDir: string): void {
  const files = collectSourceFiles(rootDir);

  for (const file of files) {
    const rel = file.startsWith(rootDir + "/")
      ? file.slice(rootDir.length + 1)
      : file;
    if (ALLOWED_IMPORT_PREFIXES.some((prefix) => rel.startsWith(prefix))) {
      continue;
    }
    let contents: string;
    try {
      contents = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    const lines = contents.split("\n");
    // Track whether we're currently inside a multi-line block comment.
    // Without this, an import inside `/* ... */` that spans multiple lines
    // would slip through the per-line comment-stripping below and trigger
    // a false-positive banned-import error.
    let inBlockComment = false;
    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      let code = raw;

      // Continue a block comment from the previous line; drop everything up
      // to and including its terminating `*/`. If the comment doesn't end
      // on this line, skip the line entirely.
      if (inBlockComment) {
        const end = code.indexOf("*/");
        if (end === -1) {
          continue;
        }
        code = code.slice(end + 2);
        inBlockComment = false;
      }

      // Strip same-line `/* ... */` blocks. If a `/*` opens without a
      // matching `*/` on this line, flip the flag and drop the rest of
      // the line so the next iteration knows to skip until the terminator.
      while (true) {
        const start = code.indexOf("/*");
        if (start === -1) {
          break;
        }
        const end = code.indexOf("*/", start + 2);
        if (end === -1) {
          code = code.slice(0, start);
          inBlockComment = true;
          break;
        }
        code = code.slice(0, start) + code.slice(end + 2);
      }

      // Strip line-comment tails and skip lines that became empty.
      code = code.replace(/\/\/.*$/, "");
      if (!code.trim()) {
        continue;
      }
      for (const banned of BANNED_PACKAGES) {
        const importPattern = new RegExp(
          `(?:from|import|require)\\s*\\(?\\s*["']${escapeRegex(banned)}(?:["']|/)`,
        );
        if (importPattern.test(code)) {
          record(
            "error",
            `${rel}:${i + 1}`,
            `Source file imports banned package "${banned}".`,
          );
        }
      }
    }
  }
}

function collectPackageJsonDirs(rootDir: string): string[] {
  const out: string[] = [];
  const stack: string[] = [rootDir];
  while (stack.length > 0) {
    const dir = stack.shift()!;
    if (existsSync(join(dir, "package.json"))) {
      out.push(dir);
    }
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (MANIFEST_SKIP_DIRS.has(entry)) {
        continue;
      }
      const full = join(dir, entry);
      let stat: Stats;
      try {
        stat = statSync(full);
      } catch {
        continue;
      }
      if (stat.isDirectory()) {
        stack.push(full);
      }
    }
  }
  return out;
}

function main(): void {
  const rootDir = process.cwd();

  for (const dir of collectPackageJsonDirs(rootDir)) {
    const rel = dir === rootDir ? "package.json" : `${dir.slice(rootDir.length + 1)}/package.json`;
    checkPackageJson(dir, rel);
  }
  checkPnpmLock(rootDir);
  checkPnpmWhy();
  checkSourceImports(rootDir);

  const errors = findings.filter((f) => f.severity === "error");
  const warnings = findings.filter((f) => f.severity === "warning");

  if (warnings.length > 0) {
    console.warn("\n⚠️  banned-deps guard warnings:");
    for (const w of warnings) {
      console.warn(`  - [${w.source}] ${w.detail}`);
    }
  }

  if (errors.length > 0) {
    console.error("\n❌ banned-deps guard errors:");
    for (const e of errors) {
      console.error(`  - [${e.source}] ${e.detail}`);
    }
    console.error(
      `\nFAIL: ${errors.length} banned production reference(s) detected.`,
    );
    process.exit(1);
  }

  console.log(
    `✅ banned-deps guard passed (${warnings.length} warning${
      warnings.length === 1 ? "" : "s"
    }).`,
  );
}

main();
