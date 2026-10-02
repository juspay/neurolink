#!/usr/bin/env tsx
/**
 * check-shipped-types.ts
 *
 * Typecheck every declaration file in `dist/` the way a consumer does, with
 * `skipLibCheck` off, and fail on any reference that does not resolve.
 *
 * Why this exists
 * ---------------
 * `tsconfig.json` sets `stripInternal: true`. TypeScript honours that by
 * deleting `@internal` declarations from the emitted `.d.ts` — but it does not
 * check whether anything still refers to them, and it does not rewrite the
 * imports that name them. Tag a type `@internal` while a non-internal
 * declaration keeps it in its signature and the published package ships a
 * `.d.ts` that cannot compile:
 *
 *   import type { KnowledgeSelection } from "../types/index.js";
 *   //            ^ stripped from types/index.d.ts, still imported here
 *
 * Consumers with `skipLibCheck: true` (the common default) never notice.
 * Everyone else gets TS2305/TS2724 from inside `node_modules` and no
 * actionable message. This shipped twice before the check existed —
 * `KnowledgeSelection` and friends in `knowledge/`, and
 * `GitToolRuntimeSettings` in `agent/gitTools.d.ts`.
 *
 * The fix is always one of two things, decided by whether the *referencing*
 * declaration is public: drop `@internal` from the type, or add it to the
 * declaration that names it. Never leave the pair inconsistent.
 *
 * Scope note: this deliberately roots the program at every `.d.ts` in `dist/`,
 * not just the ones reachable from the package entry point. A file that no
 * public path imports today still ships, and a deep import of it is a
 * supported-enough thing to keep compiling.
 *
 * Exit codes
 * ----------
 *  0  Every shipped declaration file typechecks.
 *  1  At least one unresolved reference, or `dist/` has not been built.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import ts from "typescript";

const ROOT = process.cwd();
const DIST = join(ROOT, "dist");

/**
 * Errors that mean "this declaration names something that isn't there".
 *
 * All five shapes a stripped or missing declaration can take. The first three
 * cover a module-level import; 2304 and 2694 cover the same hole reached
 * through a bare name or a namespace, which an earlier version of this list
 * omitted — a shipped declaration with either would have been reported clean
 * by a checker whose entire purpose is to not do that.
 */
const UNRESOLVED_REFERENCE_CODES = new Set([
  2304, // Cannot find name 'X'.
  2305, // Module '"X"' has no exported member 'Y'.
  2307, // Cannot find module 'X' or its corresponding type declarations.
  2694, // Namespace 'X' has no exported member 'Y'.
  2724, // 'X' has no exported member named 'Y'. Did you mean 'Z'?
]);

/**
 * A build must exist and be COMPLETE before the result means anything.
 *
 * A floor alone is not enough: a partial build that happens to clear it gets
 * validated as though it were the whole package, and the subset passes while
 * the missing declarations are never examined. So the floor is only the first
 * gate. Two stronger ones follow in `main()`: every entry point the package
 * publishes must be present, and the declaration set under `dist/` must equal
 * the one the source tree emits (`findDeclarationSetDrift`), which catches a
 * missing file no entry point happens to name.
 */
const MINIMUM_DECLARATION_FILES = 100;

const collectDeclarationFiles = (dir: string, found: string[] = []): string[] => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      collectDeclarationFiles(full, found);
    } else if (entry.endsWith(".d.ts")) {
      found.push(full);
    }
  }
  return found;
};

const toPosix = (path: string): string => path.split(sep).join("/");

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Does a published type entry exist on disk?
 *
 * `exports` subpaths may be wildcard patterns (`./dist/adapters/*.d.ts`). Node
 * matches `*` against any substring, `/` included, and the rest of the pattern
 * literally, so the pattern is turned into an anchored regular expression and
 * tested against every declaration actually built. One match is enough — the
 * question is whether the family is present, not whether it is complete.
 *
 * Matching only "some declaration under the directory before the last slash"
 * was too loose in both directions: `dist/foo-*.d.ts` passed when only
 * `bar.d.ts` existed, and a `*` in a directory component was joined onto the
 * path literally, so it was reported missing on a good build.
 */
const publishedEntryExists = (
  entry: string,
  builtDeclarations: readonly string[],
): boolean => {
  if (!entry.includes("*")) {
    return existsSync(join(ROOT, entry));
  }
  const pattern = new RegExp(
    `^${entry.split("*").map(escapeRegExp).join(".*")}$`,
  );
  return builtDeclarations.some((file) =>
    pattern.test(toPosix(relative(ROOT, file))),
  );
};

/**
 * `<source root>` -> the prefix its declarations get under `dist/`.
 *
 * `svelte-package` emits `src/lib` at the top of `dist/`, and the CLI build
 * emits `src/cli` under `dist/cli/` (scripts/collapse-cli-lib-duplicate.mjs
 * removes the `lib` copy it would otherwise ship twice).
 */
const SOURCE_ROOTS = [
  { dir: "src/lib", prefix: "" },
  { dir: "src/cli", prefix: "cli/" },
] as const;

const emitsDeclaration = (file: string): boolean =>
  /\.tsx?$/.test(file) &&
  !file.endsWith(".d.ts") &&
  !/\.(test|spec)\.tsx?$/.test(file);

const collectSourceModules = (dir: string, found: string[] = []): string[] => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      collectSourceModules(full, found);
    } else if (emitsDeclaration(entry)) {
      found.push(full);
    }
  }
  return found;
};

/** The `dist/`-relative declaration path a source module is expected to emit. */
const expectedDeclarationPath = (
  rootDir: string,
  prefix: string,
  source: string,
): string =>
  `${prefix}${toPosix(relative(join(ROOT, rootDir), source)).replace(/\.tsx?$/, "")}.d.ts`;

/**
 * Compare the declarations under `dist/` with the modules the source tree
 * emits one for.
 *
 * `missing` is the partial-build case: a declaration the build should have
 * produced is not there, and because nothing may import it the entry-point
 * check cannot see it. `stale` is the reverse — a declaration left behind by a
 * source file that no longer exists, which `files: ["dist"]` would still
 * publish. Either way `dist/` is not what a clean build of this tree ships.
 */
const findDeclarationSetDrift = (
  builtDeclarations: readonly string[],
): { missing: string[]; stale: string[] } => {
  const expected = new Set<string>();
  for (const { dir, prefix } of SOURCE_ROOTS) {
    const absolute = join(ROOT, dir);
    if (!existsSync(absolute)) {
      continue;
    }
    for (const source of collectSourceModules(absolute)) {
      expected.add(expectedDeclarationPath(dir, prefix, source));
    }
  }
  const built = new Set(
    builtDeclarations.map((file) => toPosix(relative(DIST, file))),
  );
  return {
    missing: [...expected].filter((file) => !built.has(file)).sort(),
    stale: [...built].filter((file) => !expected.has(file)).sort(),
  };
};

const REPORTED_DRIFT_LIMIT = 20;

const reportDrift = (label: string, paths: readonly string[]): void => {
  console.error(`  ${label} (${paths.length}):`);
  for (const path of paths.slice(0, REPORTED_DRIFT_LIMIT)) {
    console.error(`    dist/${path}`);
  }
  if (paths.length > REPORTED_DRIFT_LIMIT) {
    console.error(`    ...and ${paths.length - REPORTED_DRIFT_LIMIT} more`);
  }
};

/**
 * Every declaration file named by `package.json`'s `exports` map, plus the
 * root `types` entry. If the package promises a subpath, its .d.ts has to be
 * on disk before any verdict about "the shipped declarations" is meaningful.
 */
const collectPublishedTypeEntries = (): string[] => {
  const manifest = JSON.parse(
    readFileSync(join(ROOT, "package.json"), "utf8"),
  ) as {
    types?: string;
    exports?: Record<string, unknown>;
  };
  const found = new Set<string>();
  const visit = (node: unknown): void => {
    if (typeof node === "string") {
      if (node.endsWith(".d.ts")) {
        found.add(node.replace(/^\.\//, ""));
      }
      return;
    }
    if (typeof node === "object" && node !== null) {
      for (const value of Object.values(node)) {
        visit(value);
      }
    }
  };
  visit(manifest.exports);
  if (manifest.types) {
    found.add(manifest.types.replace(/^\.\//, ""));
  }
  return [...found].sort();
};


const main = (): number => {
  let files: string[];
  try {
    files = collectDeclarationFiles(DIST);
  } catch {
    console.error("✗ dist/ not found — run `pnpm run build` first.");
    return 1;
  }

  if (files.length < MINIMUM_DECLARATION_FILES) {
    console.error(
      `✗ only ${files.length} declaration file(s) under dist/ — expected at ` +
        `least ${MINIMUM_DECLARATION_FILES}. The build is missing or partial, ` +
        `so a pass here would prove nothing.`,
    );
    return 1;
  }

  const missingEntries = collectPublishedTypeEntries().filter(
    (entry) => !publishedEntryExists(entry, files),
  );
  if (missingEntries.length > 0) {
    console.error(
      `✗ ${missingEntries.length} published type entry point(s) are absent ` +
        `from the build, so the declarations under dist/ are only a subset ` +
        `of what this package ships:`,
    );
    for (const entry of missingEntries) {
      console.error(`  ${entry}`);
    }
    return 1;
  }

  const drift = findDeclarationSetDrift(files);
  if (drift.missing.length > 0 || drift.stale.length > 0) {
    console.error(
      "✗ the declarations under dist/ do not match the modules src/ emits " +
        "them for, so a pass here would describe a different package than " +
        "the one a clean build ships. Rebuild from a clean dist/.",
    );
    if (drift.missing.length > 0) {
      reportDrift("missing from the build", drift.missing);
    }
    if (drift.stale.length > 0) {
      reportDrift("left over with no source module", drift.stale);
    }
    return 1;
  }

  const program = ts.createProgram(files, {
    strict: true,
    skipLibCheck: false,
    noEmit: true,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    target: ts.ScriptTarget.ES2022,
  });

  const unresolved = ts
    .getPreEmitDiagnostics(program)
    .filter((diagnostic) => UNRESOLVED_REFERENCE_CODES.has(diagnostic.code))
    .filter((diagnostic) => diagnostic.file?.fileName.startsWith(DIST));

  console.log(`Checked ${files.length} declaration file(s) under dist/.`);

  if (unresolved.length === 0) {
    console.log("✓ every shipped declaration resolves.");
    return 0;
  }

  console.error(`\n✗ ${unresolved.length} unresolved reference(s) in shipped types:\n`);
  for (const diagnostic of unresolved) {
    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, " ");
    const file = diagnostic.file;
    if (file && diagnostic.start !== undefined) {
      const { line, character } = file.getLineAndCharacterOfPosition(diagnostic.start);
      console.error(`  ${relative(ROOT, file.fileName)}:${line + 1}:${character + 1}`);
      console.error(`    TS${diagnostic.code}: ${message}`);
    } else {
      console.error(`  TS${diagnostic.code}: ${message}`);
    }
  }
  console.error(
    "\nUsually a `@internal` tag on a type that a non-internal declaration " +
      "still names. Drop the tag, or tag the declaration that names it.",
  );
  return 1;
};

process.exit(main());
