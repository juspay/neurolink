/**
 * Rule 9: Every exported type/interface/enum/class name in src/lib/types/
 * must be globally unique across all files in that folder.
 *
 * Because the barrel uses `export *` from every file, duplicate names collide
 * at the barrel level. Domain prefixes (Client*, Server*, Mcp*, etc.) are the
 * convention for disambiguation.
 *
 * Implementation: cross-file check via a module-level Map shared across all
 * rule invocations. ESLint loads the plugin once per process, so a single
 * `pnpm run lint` sees every file and can report duplicates.
 *
 * Caveat: when running ESLint on a subset of files (e.g. lint-staged on a
 * partial diff), this rule only checks that subset — a duplicate is invisible
 * unless BOTH declarations are in the same run.
 *
 * What that means in practice, checked rather than assumed: this rule returns
 * early for any file outside `src/lib/types/` (see `isInsideTypesFolder`), and
 * every `neurolink` rule is enabled only for a files glob rooted at `src`.
 * So CI's `eslint src/` already gives this rule a complete view — a duplicate
 * introduced in `src/lib/types/` is caught by that run alone, verified by
 * planting one and watching it fail.
 *
 * `.husky/pre-push` lints nothing, and the pre-commit hook's full-project lint
 * is skippable with `--no-verify`, but neither matters here: the scoped CI run
 * is sufficient for this rule. The lint-staged caveat above is the real one.
 */

"use strict";

/** @type {Map<string, string>} name → first file path that declared it */
const declarations = new Map();

function isInsideTypesFolder(filename) {
  const normalized = filename.replace(/\\/g, "/");
  return /\/src\/lib\/types\//.test(normalized);
}

function register(context, node, name) {
  const filename = context.filename || context.getFilename();
  if (!isInsideTypesFolder(filename)) return;

  const existing = declarations.get(name);
  if (existing && existing !== filename) {
    context.report({
      node,
      messageId: "duplicate",
      data: {
        name,
        other: existing.replace(/^.*\/src\/lib\/types\//, "src/lib/types/"),
      },
    });
    return;
  }
  declarations.set(name, filename);
}

/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Every exported name in src/lib/types/ must be globally unique (Critical Rule 9).",
    },
    schema: [],
    messages: {
      duplicate:
        'Type name "{{name}}" is already declared in {{other}}. Use a domain prefix (e.g. Client*, Server*, Mcp*) to disambiguate. See CLAUDE.md Critical Rule 9.',
    },
  },

  create(context) {
    return {
      TSTypeAliasDeclaration(node) {
        // Only flag `export type X = ...` declarations
        if (!node.parent || node.parent.type !== "ExportNamedDeclaration")
          return;
        register(context, node, node.id.name);
      },
      TSInterfaceDeclaration(node) {
        if (!node.parent || node.parent.type !== "ExportNamedDeclaration")
          return;
        register(context, node, node.id.name);
      },
      TSEnumDeclaration(node) {
        if (!node.parent || node.parent.type !== "ExportNamedDeclaration")
          return;
        if (!node.id || !node.id.name) return;
        register(context, node, node.id.name);
      },
      ClassDeclaration(node) {
        if (!node.parent || node.parent.type !== "ExportNamedDeclaration")
          return;
        if (!node.id || !node.id.name) return;
        register(context, node, node.id.name);
      },
    };
  },
};
