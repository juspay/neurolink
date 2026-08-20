/**
 * Rule 15 — tests are end-to-end only.
 *
 * A suite under `test/` must exercise a surface this package ships: construct
 * `NeuroLink` and call `generate()` / `stream()`, or drive the built CLI. It
 * must not import a module out of `src/lib/` (or `src/cli/`) to assert on it
 * directly — that tests an internal shape callers never reach, and it is free
 * to change under them.
 *
 * What this flags: a RUNTIME import from `src/lib/` or `src/cli/` inside
 * `test/`. Both forms:
 *
 *     import { FileDetector } from "../src/lib/utils/fileDetector.js";   // ✗
 *     const { X } = await import("../src/lib/whatever.js");              // ✗
 *
 * What it allows:
 *
 *   - Type-only imports, which are erased and assert nothing:
 *         import type { Tool } from "../src/lib/types/index.js";         // ok
 *         import { type A, type B } from "../src/lib/types/index.js";    // ok
 *   - `../dist/` paths a consumer can actually resolve — the entry point and
 *     the subpaths declared in package.json `exports`. Those are the shipped
 *     surface; everything else under `dist/` is a build artifact that no
 *     `import "@juspay/neurolink/..."` can reach.
 *   - Files on the `allow` list. Entries there are of two kinds, and
 *     eslint.config.js keeps them in separate blocks:
 *
 *       1. The determinism exception — a test may sit outside this rule when
 *          it needs deterministic control a live call cannot give (a pure
 *          translation table, a recorded backend, an exact chunk boundary,
 *          an outgoing wire payload). Convenience and speed are not
 *          exceptions. Every entry must say so in the file's own header.
 *          New entries go here.
 *
 *       2. Grandfathered debt — suites that predate this rule covering deep
 *          `dist/` paths. They carry no per-file header and claim no
 *          exception; they are listed so the change could land without
 *          turning a required check red across every open pull request.
 *          That block is closed: it should shrink, never grow.
 *
 * Why `../dist/lib/...` is flagged as well as `../src/lib/...`:
 *
 *     import { MANIFEST } from "../dist/lib/models/manifestRegistry.js";  // ✗
 *
 * Rewriting a `src/` import as a deep `dist/` one changes which copy of the
 * module loads, not what the test proves. `dist/lib/models/manifestRegistry.js`
 * is not reachable through any `exports` entry, so asserting on it still pins
 * an internal shape that is free to change under callers — exactly what this
 * rule exists to stop. Depth is the signal: `../dist/index.js` is the package,
 * `../dist/lib/anything` is its inside.
 *
 * ⚠️ Do not "fix" a violation by moving the import to `../dist/` if the file
 * also stubs or spies on that module: `dist/index.js` is a separate bundled
 * copy, so a stub applied to one graph is invisible to the other and the test
 * silently starts doing real work. See CLAUDE.md rule 15, "One module graph
 * per suite".
 */

"use strict";

const path = require("path");

const SRC_IMPORT = /(?:^|\/)\.\.\/(?:\.\.\/)*src\/(?:lib|cli)\//;

const DIST_IMPORT = /(?:^|\/)\.\.\/(?:\.\.\/)*dist\//;

/**
 * The `dist/` paths a consumer can resolve, read straight out of
 * package.json `exports` rather than transcribed.
 *
 * A hand-maintained copy would be one more table to keep in sync, and this
 * repo has been bitten repeatedly by exactly that — the first draft of this
 * rule already disagreed with `exports` on day one, omitting `./browser`.
 * Since the rule's whole premise is "the public surface is whatever
 * `exports` says", the two cannot be allowed to diverge: reading the real
 * thing removes the failure mode instead of documenting it.
 */
const PKG_EXPORTS = require("../package.json").exports ?? {};

/** Collect every `./dist/...` target in an `exports` value. */
function collectDistTargets(value, out) {
  if (typeof value === "string") {
    const match = /^\.\/dist\/(.+)$/.exec(value);
    if (match) {
      out.push(match[1]);
    }
    return;
  }
  if (value && typeof value === "object") {
    for (const nested of Object.values(value)) {
      collectDistTargets(nested, out);
    }
  }
}

const PUBLIC_DIST_ENTRIES = new Set();
/** Targets containing `*`, as [prefix, suffix] pairs. */
const PUBLIC_DIST_PATTERNS = [];

for (const value of Object.values(PKG_EXPORTS)) {
  const targets = [];
  collectDistTargets(value, targets);
  for (const target of targets) {
    const star = target.indexOf("*");
    if (star === -1) {
      PUBLIC_DIST_ENTRIES.add(target);
    } else {
      PUBLIC_DIST_PATTERNS.push([
        target.slice(0, star),
        target.slice(star + 1),
      ]);
    }
  }
}

/**
 * Strip the leading `../`(s) and return the path relative to `dist/`,
 * normalized.
 *
 * Normalization is load-bearing, not tidiness: matched raw,
 * `../dist/processors/../lib/internal.js` starts with `processors/` and so
 * satisfies the `./processors/*` wildcard, while module resolution actually
 * loads `dist/lib/internal.js`. Collapsing `..` first means the check sees
 * the file that will really be imported.
 */
function distSubpath(value) {
  const match = /(?:^|\/)\.\.\/(?:\.\.\/)*dist\/(.*)$/.exec(`/${value}`);
  return match ? path.posix.normalize(match[1]) : undefined;
}

function isPublicDistPath(value) {
  const sub = distSubpath(value);
  if (sub === undefined) {
    return false;
  }
  if (PUBLIC_DIST_ENTRIES.has(sub)) {
    return true;
  }
  // Node matches `*` in an exports target across `/`, so `./processors/*`
  // resolves `processors/document/word` too — not just one segment deep.
  return PUBLIC_DIST_PATTERNS.some(
    ([prefix, suffix]) =>
      sub.length > prefix.length + suffix.length &&
      sub.startsWith(prefix) &&
      sub.endsWith(suffix),
  );
}

function isDeepDistPath(value) {
  return (
    typeof value === "string" &&
    DIST_IMPORT.test(`/${value}`) &&
    !isPublicDistPath(value)
  );
}

/** `import { type A, type B } from "…"` — every specifier is type-only. */
function allSpecifiersAreTypeOnly(node) {
  const specs = node.specifiers ?? [];
  if (specs.length === 0) {
    return false; // bare side-effect import: runtime
  }
  return specs.every(
    (s) => s.type === "ImportSpecifier" && s.importKind === "type",
  );
}

function isSrcPath(value) {
  return typeof value === "string" && SRC_IMPORT.test(`/${value}`);
}

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Tests must drive the shipped surface, not import src/lib directly (CLAUDE.md rule 15)",
    },
    schema: [
      {
        type: "object",
        properties: {
          allow: { type: "array", items: { type: "string" } },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      srcImport:
        "Rule 15: tests are end-to-end only — '{{source}}' reaches into src/. Drive the surface via NeuroLink/generate/stream or the built CLI, or import the shipped symbol from '../dist/index.js'. If this genuinely needs deterministic control a live call cannot give, add the file to the rule's `allow` list in eslint.config.js and say why in its header.",
      deepDistImport:
        "Rule 15: tests are end-to-end only — '{{source}}' reaches inside the build output. No package.json `exports` entry resolves it, so asserting on it pins an internal shape callers cannot reach and that is free to change under them. Drive the surface via NeuroLink/generate/stream or the built CLI, or import from a shipped entry point ('../dist/index.js' or a declared subpath). If this genuinely needs deterministic control a live call cannot give, add the file to the rule's `allow` list in eslint.config.js and say why in its header.",
    },
  },

  create(context) {
    const filename = context.filename ?? context.getFilename();
    const normalized = filename.split("\\").join("/");
    if (!normalized.includes("/test/")) {
      return {};
    }
    const allow = (context.options?.[0]?.allow ?? []).map((p) =>
      p.split("\\").join("/"),
    );
    if (allow.some((p) => normalized.endsWith(p))) {
      return {};
    }

    function messageIdFor(value) {
      if (isSrcPath(value)) {
        return "srcImport";
      }
      return isDeepDistPath(value) ? "deepDistImport" : undefined;
    }

    return {
      ImportDeclaration(node) {
        if (node.importKind === "type") {
          return;
        }
        const messageId = messageIdFor(node.source.value);
        if (!messageId) {
          return;
        }
        if (allSpecifiersAreTypeOnly(node)) {
          return;
        }
        context.report({
          node,
          messageId,
          data: { source: node.source.value },
        });
      },
      ImportExpression(node) {
        if (node.source?.type !== "Literal") {
          return;
        }
        const messageId = messageIdFor(node.source.value);
        if (!messageId) {
          return;
        }
        context.report({
          node,
          messageId,
          data: { source: node.source.value },
        });
      },
    };
  },
};
