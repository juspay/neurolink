/**
 * Custom ESLint plugin for NeuroLink type engineering rules.
 *
 * Every type-engineering rule from CLAUDE.md is enforced via this plugin —
 * nothing lives in shell scripts anymore. Rules use the TypeScript AST
 * (immune to whitespace, comments, multi-line variations, nested generics)
 * or the file path (for filesystem / naming rules).
 *
 * Rules:
 *   neurolink/format-provider-error-returns → Rule 6: formatProviderError returns, never throws.
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
 *   neurolink/e2e-tests-only              → Rule 15: Tests are end-to-end only (import the built
 *                                            `dist/` surface, never a runtime module from src/lib/).
 *   neurolink/no-inline-secret-regex      → No inline secret-redaction regex outside
 *                                            src/lib/utils/logSanitize.ts (use sanitizeForLog).
 *   neurolink/provider-typed-errors       → `formatProviderError` in src/lib/providers/ returns a
 *                                            typed error, never a plain `new Error(...)`.
 *   neurolink/provider-base-class         → Provider classes in src/lib/providers/ extend
 *                                            BaseProvider or a recognised provider base class.
 */

"use strict";

module.exports = {
  rules: {
    "format-provider-error-returns": require("./format-provider-error-returns.cjs"),
    "no-interface": require("./no-interface.cjs"),
    "no-types-suffix-filename": require("./no-types-suffix-filename.cjs"),
    "unique-type-names": require("./unique-type-names.cjs"),
    "types-barrel-exports-only": require("./types-barrel-exports-only.cjs"),
    "no-local-types-folder": require("./no-local-types-folder.cjs"),
    "no-type-export-outside-types": require("./no-type-export-outside-types.cjs"),
    "barrel-type-imports": require("./barrel-type-imports.cjs"),
    "no-local-type-alias": require("./no-local-type-alias.cjs"),
    "no-inline-secret-regex": require("./no-inline-secret-regex.cjs"),
    "provider-typed-errors": require("./provider-typed-errors.cjs"),
    "provider-base-class": require("./provider-base-class.cjs"),
    "e2e-tests-only": require("./e2e-tests-only.cjs"),
  },
};
