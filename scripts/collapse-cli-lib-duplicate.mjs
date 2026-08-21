#!/usr/bin/env node
/**
 * Collapse the dist/lib/** duplicate produced by `tsc --project tsconfig.cli.json`.
 *
 * Why this exists: tsconfig.cli.json sets rootDir:"./src" and includes BOTH
 * src/cli/**​/*.ts and src/lib/**​/*.ts — the latter is required so the CLI's
 * ~258 relative "../lib/..." imports type-check. As a side effect, tsc
 * re-emits the entire src/lib tree a second time at dist/lib/**, on top of
 * the already-flattened dist/** tree svelte-package produced moments earlier
 * from the same sources. The two trees are the same compiled output (modulo
 * sourcemap comments) — roughly 13MB / ~2,700 files of pure duplication that
 * ships inside the published tarball for no reason.
 *
 * What this script does, in order:
 *   1. Walks dist/cli/**​/*.{js,d.ts} and rewrites every relative import/
 *      require/dynamic-import specifier of the shape "(../)+lib/..." so it
 *      points at the already-flattened dist/** tree instead of dist/lib/**
 *      (i.e. it deletes the "lib/" path segment — dist/cli and dist/lib are
 *      siblings under dist/, and after flattening, lib's former contents are
 *      dist's direct children, so removing "lib/" is the exact, sufficient
 *      rewrite regardless of nesting depth).
 *   2. Verifies every rewritten specifier resolves to a real file on disk.
 *      If even one does not, the script exits non-zero WITHOUT touching
 *      dist/lib — a hard build failure is much better than a silently
 *      broken CLI import.
 *   3. Only once every rewrite has been verified does it remove dist/lib.
 *
 * Nothing under dist/lib itself is rewritten — it is deleted outright once
 * dist/cli no longer references it. Nothing in dist/lib is a runtime target
 * for anything outside dist/cli (dist/index.js and friends already come
 * from the flattened dist/** tree).
 */

import { readdirSync, statSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { existsSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CLI_DIR = join(REPO_ROOT, "dist", "cli");
const LIB_DUP_DIR = join(REPO_ROOT, "dist", "lib");

/** Recursively collect files under `dir` whose name ends with one of `exts`. */
function collectFiles(dir, exts) {
  const out = [];
  const walk = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (exts.some((ext) => entry.name.endsWith(ext))) {
        out.push(full);
      }
    }
  };
  walk(dir);
  return out;
}

// Matches a "(../)+lib/" relative-import prefix inside a quoted or
// backtick-delimited module specifier, e.g. "../lib/foo.js",
// '../../lib/bar/baz.js', or `../../lib/server/index.js?t=${timestamp}`.
// Deliberately anchored on the leading "../" chain so it never matches
// unrelated text like "src/lib/..." inside a comment.
const SPEC_PATTERNS = [
  { quote: '"', re: /"((?:\.\.\/)+lib\/[^"]*)"/g },
  { quote: "'", re: /'((?:\.\.\/)+lib\/[^']*)'/g },
  { quote: "`", re: /`((?:\.\.\/)+lib\/[^`]*)`/g },
];

function rewriteLibSpecifiers(source) {
  let rewritten = source;
  const specifiers = [];
  for (const { quote, re } of SPEC_PATTERNS) {
    rewritten = rewritten.replace(re, (whole, inner) => {
      const newInner = inner.replace(/^((?:\.\.\/)+)lib\//, "$1");
      specifiers.push({ original: inner, rewritten: newInner });
      return `${quote}${newInner}${quote}`;
    });
  }
  return { rewritten, specifiers };
}

function verifySpecifierResolves(fileDir, specifier) {
  // Strip a trailing query string (e.g. the "?t=${timestamp}" cache-busting
  // suffix used by `serve --watch`'s hot-reload re-import) before resolving
  // — it is not part of the filesystem path.
  const withoutQuery = specifier.split("?")[0];
  if (withoutQuery.includes("${")) {
    // Statically-unresolvable segment (a template-literal interpolation
    // inside the path itself, not just the query string). None exist in
    // this codebase today, but if one appears, don't silently pass it.
    return { ok: false, reason: "unresolvable template interpolation in path" };
  }
  const target = resolve(fileDir, withoutQuery);
  return { ok: existsSync(target), target };
}

function main() {
  if (!existsSync(CLI_DIR)) {
    console.error(
      `[collapse-cli-lib-duplicate] dist/cli does not exist (${CLI_DIR}). ` +
        "Run tsc --project tsconfig.cli.json first.",
    );
    process.exit(1);
  }
  if (!existsSync(LIB_DUP_DIR)) {
    // Nothing to collapse — treat as a no-op success rather than an error,
    // so re-running this script (or running it when tsc's output shape ever
    // changes) doesn't break the build.
    console.log(
      "[collapse-cli-lib-duplicate] dist/lib does not exist — nothing to collapse.",
    );
    return;
  }

  const files = collectFiles(CLI_DIR, [".js", ".d.ts"]);
  const pendingWrites = [];
  const verificationFailures = [];
  let totalSpecifiers = 0;

  for (const file of files) {
    const original = readFileSync(file, "utf-8");
    const { rewritten, specifiers } = rewriteLibSpecifiers(original);
    if (specifiers.length === 0) {
      continue;
    }
    totalSpecifiers += specifiers.length;
    const fileDir = dirname(file);
    for (const { original: origSpec, rewritten: newSpec } of specifiers) {
      const result = verifySpecifierResolves(fileDir, newSpec);
      if (!result.ok) {
        verificationFailures.push({
          file: relative(REPO_ROOT, file),
          originalSpecifier: origSpec,
          rewrittenSpecifier: newSpec,
          reason: result.reason ?? `resolved path does not exist: ${result.target}`,
        });
      }
    }
    pendingWrites.push({ file, rewritten });
  }

  if (verificationFailures.length > 0) {
    console.error(
      `[collapse-cli-lib-duplicate] ${verificationFailures.length} rewritten ` +
        "import specifier(s) do not resolve to a real file. Aborting WITHOUT " +
        "touching dist/lib or writing any rewritten file — the build is broken " +
        "and must fail loudly instead of shipping a CLI with dangling imports.",
    );
    for (const failure of verificationFailures) {
      console.error(
        `  ${failure.file}: "${failure.originalSpecifier}" -> "${failure.rewrittenSpecifier}" ` +
          `(${failure.reason})`,
      );
    }
    process.exit(1);
  }

  // Only now — after every rewritten specifier in every file has been
  // verified to resolve — actually write the files and delete dist/lib.
  for (const { file, rewritten } of pendingWrites) {
    writeFileSync(file, rewritten, "utf-8");
  }

  const dupSizeBytes = (() => {
    let total = 0;
    const walk = (dir) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else {
          total += statSync(full).size;
        }
      }
    };
    walk(LIB_DUP_DIR);
    return total;
  })();

  rmSync(LIB_DUP_DIR, { recursive: true, force: true });

  console.log(
    `[collapse-cli-lib-duplicate] rewrote ${totalSpecifiers} import specifier(s) ` +
      `across ${pendingWrites.length} file(s) in dist/cli, verified every one, ` +
      `and removed dist/lib (${(dupSizeBytes / (1024 * 1024)).toFixed(1)} MB).`,
  );
}

main();
