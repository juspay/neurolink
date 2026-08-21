#!/usr/bin/env node
/**
 * Report which symbols a commit stopped referencing in a file.
 *
 * Written for reviewing refactors that MOVE code — a loop extracted into a
 * shared engine, a helper lifted into a module. The risk in that shape of
 * change is not a broken build; it is a behaviour that quietly stops
 * happening, because the call that performed it was dropped rather than
 * relocated. Those do not fail a typecheck and they do not fail a test that
 * nobody wrote.
 *
 * The habit this replaces is grepping for a handful of symbols you already
 * suspect. That only ever proves something about the symbols you thought of.
 * Two real regressions in this repo survived exactly that check:
 *
 *   - the Google AI Studio loops lost DedupExecuteMap, so an identical
 *     repeated tool call started re-executing (BZ-3327 again);
 *   - the Anthropic loop stopped threading its OTel span, so
 *     gen_ai.provider.total_attempts silently stopped being emitted.
 *
 * Both appear immediately in the set difference below.
 *
 * Usage:
 *   node scripts/migration-symbol-diff.mjs <commit> <path> [<path>...]
 *
 * Every name it prints still needs a human decision. "Vanished" means the new
 * revision of THIS file no longer references it — which is the correct and
 * expected outcome when the code moved somewhere else. Check each one lands
 * in its new home; treat the ones that do not as suspects.
 */

import { execFileSync } from "node:child_process";

/** Identifiers that appear in call position, which is where behaviour lives. */
const CALL_SITE = /\b([A-Za-z_][A-Za-z0-9_]{3,})\s*\(/g;

function referencedSymbols(rev, path) {
  let source;
  try {
    source = execFileSync("git", ["show", `${rev}:${path}`], {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch {
    return undefined;
  }
  return new Set(Array.from(source.matchAll(CALL_SITE), (m) => m[1]));
}

function main() {
  const [commit, ...paths] = process.argv.slice(2);
  if (!commit || paths.length === 0) {
    console.error(
      "usage: node scripts/migration-symbol-diff.mjs <commit> <path> [<path>...]",
    );
    process.exit(2);
  }

  let anyVanished = false;
  for (const path of paths) {
    const before = referencedSymbols(`${commit}^`, path);
    const after = referencedSymbols(commit, path);
    if (!before || !after) {
      console.log(`${path} @ ${commit}: absent on one side of the commit`);
      continue;
    }
    const vanished = [...before].filter((s) => !after.has(s)).sort();
    console.log(
      `${path} @ ${commit}: ${before.size} -> ${after.size} referenced symbols; ${vanished.length} vanished`,
    );
    for (const symbol of vanished) {
      console.log(`   GONE: ${symbol}`);
    }
    anyVanished ||= vanished.length > 0;
  }

  // Exit 0 either way. A vanished symbol is a prompt to look, not a verdict —
  // failing here would turn "read this list" into "silence this list".
  if (!anyVanished) {
    console.log("nothing vanished");
  }
}

main();
