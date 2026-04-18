/**
 * Custom ESLint plugin for NeuroLink type engineering rules.
 *
 * Every type-engineering rule from CLAUDE.md is enforced via this plugin —
 * nothing lives in shell scripts anymore. Rules use the TypeScript AST
 * (immune to whitespace, comments, multi-line variations, nested generics)
 * or the file path (for filesystem / naming rules).
 *
 * Rules:
 *   neurolink/no-interface                → Rule 7: No `interface` (except declare merging).
 *   neurolink/no-types-suffix-filename    → Rule 8: No "Types"/"Type" suffix in filenames.
 *   neurolink/unique-type-names           → Rule 9: Globally unique names in src/lib/types/.
 *   neurolink/types-barrel-exports-only   → Rule 10: The types barrel uses `export *` only.
 *   neurolink/no-local-types-folder       → Rules 11 & 11b: Types must live in src/lib/types/.
 *   neurolink/no-type-export-outside-types → Rule 12: No `export type` outside src/lib/types/.
 *   neurolink/barrel-type-imports         → Rule 13: Internal type imports must use the barrel.
 *   neurolink/no-local-type-alias         → Rule 2 (strict): No `type X = ...` alias outside
 *                                            src/lib/types/ (catches non-exported aliases
 *                                            that the Rule 12 rule misses).
 */

"use strict";

module.exports = {
  rules: {
    "no-interface": require("./no-interface.cjs"),
    "no-types-suffix-filename": require("./no-types-suffix-filename.cjs"),
    "unique-type-names": require("./unique-type-names.cjs"),
    "types-barrel-exports-only": require("./types-barrel-exports-only.cjs"),
    "no-local-types-folder": require("./no-local-types-folder.cjs"),
    "no-type-export-outside-types": require("./no-type-export-outside-types.cjs"),
    "barrel-type-imports": require("./barrel-type-imports.cjs"),
    "no-local-type-alias": require("./no-local-type-alias.cjs"),
  },
};
