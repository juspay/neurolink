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

import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";

const ROOT = process.cwd();
const DIST = join(ROOT, "dist");

/** Errors that mean "this declaration names something that isn't there". */
const UNRESOLVED_REFERENCE_CODES = new Set([
  2305, // Module '"X"' has no exported member 'Y'.
  2307, // Cannot find module 'X' or its corresponding type declarations.
  2724, // 'X' has no exported member named 'Y'. Did you mean 'Z'?
]);

/**
 * A build must exist and be substantial before the result means anything.
 * An empty or missing `dist/` would otherwise report a clean pass.
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
