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
 *   - Anything from `../dist/`, which is what callers actually load.
 *   - Files on the `allow` list — the determinism exception. A test may sit
 *     outside this rule only when it needs deterministic control a live call
 *     cannot give (a pure translation table, a recorded backend, an exact
 *     chunk boundary, an outgoing wire payload). Convenience and speed are
 *     not exceptions. Every entry must say so in the file's own header.
 *
 * ⚠️ Do not "fix" a violation by moving the import to `../dist/` if the file
 * also stubs or spies on that module: `dist/index.js` is a separate bundled
 * copy, so a stub applied to one graph is invisible to the other and the test
 * silently starts doing real work. See CLAUDE.md rule 15, "One module graph
 * per suite".
 */

"use strict";

const SRC_IMPORT = /(?:^|\/)\.\.\/(?:\.\.\/)*src\/(?:lib|cli)\//;

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

    function report(node, source) {
      context.report({ node, messageId: "srcImport", data: { source } });
    }

    return {
      ImportDeclaration(node) {
        if (node.importKind === "type") {
          return;
        }
        if (!isSrcPath(node.source.value)) {
          return;
        }
        if (allSpecifiersAreTypeOnly(node)) {
          return;
        }
        report(node, node.source.value);
      },
      ImportExpression(node) {
        if (node.source?.type !== "Literal") {
          return;
        }
        if (!isSrcPath(node.source.value)) {
          return;
        }
        report(node, node.source.value);
      },
    };
  },
};
