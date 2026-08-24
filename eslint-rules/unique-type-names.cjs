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
 * This comment used to say "the pre-push/CI run on the full project catches
 * everything". That was not true in either half. `.husky/pre-push` runs
 * check:deps, build and three test suites, and lints nothing. CI ran
 * `eslint src/` and `eslint test/continuous-test-suite*.ts`, never
 * `pnpm run lint`, so scripts/, tools/, eslint-rules/ and test/helpers/ were
 * not linted at all and no run saw the whole project. The only full-project
 * lint was the pre-commit hook, which `--no-verify` skips.
 *
 * CI now also runs a plain `npx eslint .` (errors only) so a whole-project view
 * exists somewhere that a local flag cannot bypass. Keep that in mind before
 * narrowing CI's lint scope again: it is load-bearing for this rule rather
 * than merely thorough.
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
