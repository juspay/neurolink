#!/usr/bin/env node
/**
 * Report which symbols a commit stopped referencing in a file.
 *
 * Written for reviewing refactors that MOVE code — a loop extracted into a
 * shared engine, a helper lifted into a module. The risk in that shape of
 * change is not a broken build; it is a behaviour that quietly stops
 * happening, because the call performing it was dropped rather than
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
 * revision of THIS file no longer calls it — which is the correct and expected
 * outcome when the code moved somewhere else. Check each one lands in its new
 * home; treat the ones that do not as suspects.
 */

import { execFileSync } from "node:child_process";
import ts from "typescript";

/**
 * Every identifier this revision CALLS.
 *
 * Parsed rather than pattern-matched. A regex over raw source cannot tell a
 * call from a declaration, a mention in a comment, or a substring of a string
 * literal, and the first version of this script reported `while`, `throw` and
 * assorted prose from comments as vanished symbols. Worse than the noise was
 * the other direction: it required four or more characters to avoid some of
 * that noise, so a dropped `map()`, `get()` or `log()` — exactly the kind of
 * one-line side effect this tool exists to catch — was invisible.
 *
 * Property calls are recorded under BOTH the full path and the bare property,
 * so `span.setAttribute()` matches whether the reader thinks of it as
 * `setAttribute` or as the span call it was.
 */
function callsIn(source, fileName) {
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ false,
    fileName.endsWith(".tsx") || fileName.endsWith(".jsx")
      ? ts.ScriptKind.TSX
      : ts.ScriptKind.TS,
  );
  const found = new Set();
  /**
   * Strip the wrappers that change how a callee is spelled but not which
   * symbol it names: `(trace.getActiveSpan)()`, `(x as Foo).bar()`,
   * `maybe!.bar()`, `(x satisfies Foo).bar()`. Without this the walker falls
   * through every branch below and records nothing — a silent drop, which is
   * the exact failure this tool exists to report.
   */
  const unwrap = (expression) => {
    let current = expression;
    while (
      ts.isParenthesizedExpression(current) ||
      ts.isAsExpression(current) ||
      ts.isNonNullExpression(current) ||
      ts.isTypeAssertionExpression?.(current) ||
      ts.isSatisfiesExpression?.(current)
    ) {
      current = current.expression;
    }
    return current;
  };
  /**
   * The dotted path, but only while every link is a plain name: `trace`,
   * `trace.getActiveSpan`, `a.b.c`. Returns undefined the moment the chain
   * roots in something else — `foo().bar`, `arr[0].bar` — because the printed
   * form of such a chain is the whole sub-expression, and an earlier cut of
   * this happily emitted a thirty-line `withTimeout(...).catch` as a symbol
   * name.
   */
  const dottedName = (raw) => {
    const expression = unwrap(raw);
    if (ts.isIdentifier(expression)) {
      return expression.text;
    }
    if (ts.isPropertyAccessExpression(expression)) {
      const prefix = dottedName(expression.expression);
      return prefix === undefined ? undefined : `${prefix}.${expression.name.text}`;
    }
    return undefined;
  };
  const record = (raw) => {
    const expression = unwrap(raw);
    if (ts.isIdentifier(expression)) {
      found.add(expression.text);
      return;
    }
    if (ts.isPropertyAccessExpression(expression)) {
      // Always the bare property, so a call is findable by the name a reader
      // remembers; the dotted path as well when it is short enough to be one.
      found.add(expression.name.text);
      const dotted = dottedName(expression);
      if (dotted !== undefined) {
        found.add(dotted);
      }
      return;
    }
    if (ts.isNewExpression(expression) || ts.isCallExpression(expression)) {
      record(expression.expression);
    }
  };
  const visit = (node) => {
    if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
      record(node.expression);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return found;
}

/**
 * A `git show` failure that genuinely means "this PATH is not in that tree".
 *
 * Deliberately narrow. A bad REVISION is not an absence — it is a typo in the
 * invocation, and reporting it as "absent on one side" answers a question the
 * caller never asked while looking like a clean result.
 */
function isAbsentPath(err) {
  // stderr ONLY. Node builds err.message as "Command failed: <argv>\n<stderr>",
  // so it already contains stderr verbatim and adds nothing but the invocation
  // text — which is caller-supplied. Matching a diagnostic regex against the
  // caller's own arguments means a path like "does not exist in here.ts", or a
  // typo'd revision whose command line happens to contain the wording, is
  // reported as a clean absence instead of being rethrown. That is precisely
  // the misread this function's contract above promises not to make.
  return /exists on disk, but not in|does not exist in|path .* does not exist/i.test(
    err?.stderr ?? "",
  );
}

function referencedSymbols(rev, path) {
  let source;
  try {
    source = execFileSync("git", ["show", `${rev}:${path}`], {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (err) {
    // Only a genuine absence is reported as "not on this side". Anything else
    // — a bad repository, a permission error, output past maxBuffer — is a
    // failure of the tool, and swallowing it would print a reassuring
    // "absent on one side" for a comparison that never happened.
    if (isAbsentPath(err)) {
      return undefined;
    }
    throw err;
  }
  return callsIn(source, path);
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
  let anyCompared = false;
  for (const path of paths) {
    const before = referencedSymbols(`${commit}^`, path);
    const after = referencedSymbols(commit, path);
    if (!before || !after) {
      console.log(`${path} @ ${commit}: absent on one side of the commit`);
      continue;
    }
    anyCompared = true;
    const vanished = [...before].filter((s) => !after.has(s)).sort();
    console.log(
      `${path} @ ${commit}: ${before.size} -> ${after.size} called symbols; ${vanished.length} vanished`,
    );
    for (const symbol of vanished) {
      console.log(`   GONE: ${symbol}`);
    }
    anyVanished ||= vanished.length > 0;
  }

  // Only claim a clean result when something was actually compared. Saying
  // "nothing vanished" after comparing nothing is the same defect this tool
  // exists to find, one level up.
  if (!anyCompared) {
    console.log("no comparisons ran — every path was absent on one side");
  } else if (!anyVanished) {
    console.log("nothing vanished");
  }

  // Exit 0 either way. A vanished symbol is a prompt to look, not a verdict —
  // failing here would turn "read this list" into "silence this list".
}

try {
  main();
} catch (err) {
  // git has already written its own diagnosis to stderr; a Node stack on top
  // of it just buries the useful line.
  console.error(
    `migration-symbol-diff: ${err instanceof Error ? err.message.split("\n")[0] : String(err)}`,
  );
  process.exit(1);
}
