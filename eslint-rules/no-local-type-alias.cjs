/**
 * Rule 2 enforcement: No type-alias declarations outside src/lib/types/.
 *
 * Catches every form of local type-alias declaration that lives outside the
 * canonical types folder, whether or not the alias is exported:
 *
 *   type X = { ... };                         // local alias  (new enforcement)
 *   export type X = { ... };                  // exported alias (also caught by
 *                                               //  Rule 12 — this rule is a safety net)
 *   type X<T> = Foo<T>;                       // generic alias
 *
 * Exempt paths:
 *   - src/lib/types/**            (canonical types folder)
 *   - src/test/**, **\/*.test.ts  (test fixtures may declare throwaway aliases)
 *   - eslint-rules/**             (AST-manipulation rules genuinely need local types)
 *
 * Special allowances:
 *   - None. Every violation should be fixed by moving the type into
 *     src/lib/types/ and importing it back through the barrel. If a genuine
 *     exception is needed (e.g. a type derived from a local runtime value
 *     that cannot be materialised), add an explicit eslint-disable-next-line
 *     with a comment justifying the exception.
 */

"use strict";

/** Returns true if the file is inside src/lib/types/ (canonical types folder). */
function isInsideTypesFolder(filename) {
  const normalized = filename.replace(/\\/g, "/");
  return /\/src\/lib\/types\//.test(normalized);
}

/** Returns true if the file is a test fixture or spec file. */
function isTestFile(filename) {
  const normalized = filename.replace(/\\/g, "/");
  return (
    /\/src\/test\//.test(normalized) ||
    /\.test\.ts$/.test(normalized) ||
    /\.spec\.ts$/.test(normalized) ||
    /\/test\//.test(normalized)
  );
}

/** Returns true if the file is an ESLint rule itself (rule implementation). */
function isEslintRule(filename) {
  const normalized = filename.replace(/\\/g, "/");
  return /\/eslint-rules\//.test(normalized);
}

/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow any `type X = ...` alias declaration outside src/lib/types/ (Critical Rule 2).",
    },
    schema: [],
    messages: {
      noLocalTypeAlias:
        "Type alias `{{name}}` must live in src/lib/types/, not here. Move the declaration into the appropriate barrel file and import it back via the types barrel. See CLAUDE.md Critical Rule 2.",
    },
  },

  create(context) {
    const filename = context.filename || context.getFilename();
    if (
      isInsideTypesFolder(filename) ||
      isTestFile(filename) ||
      isEslintRule(filename)
    ) {
      return {};
    }

    return {
      TSTypeAliasDeclaration(node) {
        context.report({
          node,
          messageId: "noLocalTypeAlias",
          data: {
            name: node.id && node.id.name ? node.id.name : "<anonymous>",
          },
        });
      },
    };
  },
};
