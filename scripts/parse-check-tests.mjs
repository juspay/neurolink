#!/usr/bin/env node
/**
 * Parse every file under test/ with esbuild.
 *
 * test/ is in tsconfig's exclude list, so `pnpm run check` does not look at it
 * at all — a green "0 errors" says nothing about the suites. A full typecheck
 * is not the answer either: test/ currently has 296 type errors across 50 of
 * its files, which is a separate cleanup.
 *
 * A parse check is the part that is both free and load-bearing. It catches the
 * failure that actually happens when editing these files: a syntax error, most
 * often from a stray backtick inside one of the generated-script template
 * literals, which turns the whole suite into a TransformError at startup and
 * tells you nothing until you run it.
 *
 * Takes ~20s and passes cleanly on all 106 files today.
 */
import { build } from "esbuild";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules") {
      continue;
    }
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...walk(full));
    } else if (full.endsWith(".ts")) {
      out.push(full);
    }
  }
  return out;
}

const files = walk("test");
const failures = [];

await Promise.all(
  files.map(async (file) => {
    try {
      await build({
        entryPoints: [file],
        write: false,
        logLevel: "silent",
        bundle: false,
      });
    } catch (err) {
      failures.push({ file, message: String(err?.message ?? err) });
    }
  }),
);

if (failures.length > 0) {
  console.error(`\n${failures.length} of ${files.length} test files failed to parse:\n`);
  for (const f of failures) {
    console.error(`  ${f.file}\n    ${f.message.split("\n").slice(0, 3).join("\n    ")}\n`);
  }
  process.exit(1);
}

console.log(`Parsed ${files.length} test files, no syntax errors.`);
