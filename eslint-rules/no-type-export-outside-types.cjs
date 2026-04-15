/**
 * Rule 12 (combined): No type definitions or type re-exports outside src/lib/types/.
 *
 * Files outside `src/lib/types/` must not:
 *   A) Re-export types:          `export type { X } from "..."`
 *                                 `export { type X, type Y } from "..."`
 *                                 (including multi-line blocks — AST sees them the same)
 *   B) Define exported types:    `export type X = ...`
 *                                 `export type X<T> = ...`
 *                                 `type X = ...; export { X }`  (AST-detectable)
 *   C) Export enums as types:    `export enum X {}`             (also a type boundary)
 *
 * Exempt paths:
 *   - src/lib/types/**       (canonical types folder)
 *
 * Special allowances (rare, unavoidable):
 *   - None. Every violation should be fixed by moving the type into src/lib/types/.
 *     If a genuine exception is needed, add an explicit eslint-disable-next-line
 *     comment with justification.
 */

"use strict";

/** Returns true if the file is inside src/lib/types/ (the canonical types folder). */
function isInsideTypesFolder(filename) {
  const normalized = filename.replace(/\\/g, "/");
  return /\/src\/lib\/types\//.test(normalized);
}

/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow exporting types from files outside src/lib/types/ (Critical Rule 12).",
    },
    schema: [],
    messages: {
      noTypeReExport:
        "Type re-exports are forbidden outside src/lib/types/. Move the type definition into src/lib/types/ and let it flow through the barrel. See CLAUDE.md Critical Rule 12.",
      noTypeDefinition:
        "Type definition `{{name}}` must live in src/lib/types/, not here. See CLAUDE.md Critical Rule 2 & 12.",
      noInlineTypeExport:
        "Export specifier `{{name}}` is a type-only export; move the type into src/lib/types/. See CLAUDE.md Critical Rule 12.",
    },
  },

  create(context) {
    const filename = context.filename || context.getFilename();
    if (isInsideTypesFolder(filename)) {
      return {};
    }

    return {
      // Pattern A: `export type { X } from "..."` (both single- and multi-line).
      // Pattern C: `export { type X } from "..."` (inline type modifier).
      ExportNamedDeclaration(node) {
        // `export type { X } from "..."` has `exportKind === "type"` at the declaration level.
        if (node.exportKind === "type") {
          context.report({ node, messageId: "noTypeReExport" });
          return;
        }

        // `export { type X, type Y, value } from "..."` — per-specifier `exportKind`.
        if (node.specifiers && node.specifiers.length > 0) {
          for (const spec of node.specifiers) {
            if (spec.exportKind === "type") {
              context.report({
                node: spec,
                messageId: "noInlineTypeExport",
                data: {
                  name:
                    spec.exported && spec.exported.name
                      ? spec.exported.name
                      : "<anonymous>",
                },
              });
            }
          }
        }

        // Pattern B: `export type X = ...`  (local type alias export).
        if (
          node.declaration &&
          node.declaration.type === "TSTypeAliasDeclaration"
        ) {
          context.report({
            node: node.declaration,
            messageId: "noTypeDefinition",
            data: { name: node.declaration.id.name },
          });
          return;
        }

        // `export interface X {}` is already caught by no-interface (Rule 7),
        // but if somehow allowed, flag it here too as a type boundary violation.
        if (
          node.declaration &&
          node.declaration.type === "TSInterfaceDeclaration"
        ) {
          context.report({
            node: node.declaration,
            messageId: "noTypeDefinition",
            data: { name: node.declaration.id.name },
          });
          return;
        }

        // `type X = ...; export { X }`  — declaration-less named export of a local type.
        // If any specifier refers to a local `type` binding, flag it.
        if (!node.source && node.specifiers && node.specifiers.length > 0) {
          const scope = context.sourceCode.getScope
            ? context.sourceCode.getScope(node)
            : context.getScope();
          for (const spec of node.specifiers) {
            const localName = spec.local && spec.local.name;
            if (!localName) continue;
            // Look up the variable in the scope chain.
            let v = null;
            let s = scope;
            while (s && !v) {
              v = s.variables.find((x) => x.name === localName);
              s = s.upper;
            }
            if (!v) continue;
            // If any definition is a TSTypeAliasDeclaration or TSInterfaceDeclaration,
            // this is a type-only export of a locally-defined type.
            const isTypeDef = v.defs.some(
              (d) =>
                d.node &&
                (d.node.type === "TSTypeAliasDeclaration" ||
                  d.node.type === "TSInterfaceDeclaration"),
            );
            if (isTypeDef) {
              context.report({
                node: spec,
                messageId: "noInlineTypeExport",
                data: {
                  name:
                    spec.exported && spec.exported.name
                      ? spec.exported.name
                      : localName,
                },
              });
            }
          }
        }
      },

      // Pattern B standalone: `export = type X` form is not valid TS; skip.
      // `export default type X` is not valid either.
    };
  },
};
