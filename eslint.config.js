// ESLint v9 configuration for NeuroLink
import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const neurolink = require("./eslint-rules/index.cjs");

export default [
  js.configs.recommended,
  {
    files: ["**/*.js", "**/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        // Node.js globals
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        global: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        fetch: "readonly",
        Headers: "readonly",
        Request: "readonly",
        Response: "readonly",

        // Browser globals
        window: "readonly",
        document: "readonly",
        navigator: "readonly",

        // Test globals
        describe: "readonly",
        it: "readonly",
        test: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        vi: "readonly",
        vitest: "readonly",
      },
    },
    rules: {
      // Basic rules
      "no-unused-vars": "off", // Too many legacy unused vars in JS files
      "no-console": "off",
      "no-undef": "error",

      // Modern JavaScript
      "prefer-const": "warn",
      "no-var": "error",

      // Code quality
      eqeqeq: ["error", "always"],
      curly: ["error", "all"],

      // Style (handled by Prettier)
      indent: "off",
      quotes: "off",
      semi: "off",
    },
  },
  {
    // TypeScript files in src/ directory (use project-based linting). Includes
    // .tsx so import-discipline (no-restricted-imports / no-restricted-syntax)
    // and the neurolink custom rules apply uniformly across React components.
    files: ["src/**/*.ts", "src/**/*.tsx"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        project: "./tsconfig.json",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      neurolink,
    },
    rules: {
      // ======================================================================
      // NeuroLink custom type-engineering rules (CLAUDE.md Critical Rules)
      // All rules (7-13) enforced via ESLint — zero shell scripts.
      // ======================================================================
      "neurolink/format-provider-error-returns": "error", // Rule 6
      "neurolink/no-interface": "error", // Rule 7
      "neurolink/no-types-suffix-filename": "error", // Rule 8
      "neurolink/unique-type-names": "error", // Rule 9
      "neurolink/types-barrel-exports-only": "error", // Rule 10
      "neurolink/no-local-types-folder": "error", // Rules 11 & 11b
      "neurolink/no-type-export-outside-types": "error", // Rule 12
      "neurolink/barrel-type-imports": "error", // Rule 13
      "neurolink/no-local-type-alias": "error", // Rule 2 (strict)
      "neurolink/no-inline-secret-regex": "error", // Review H04 — secret-redaction must go through logSanitize
      "neurolink/provider-typed-errors": "error", // Review M08 — formatProviderError must return typed errors
      "neurolink/provider-base-class": "error", // Issue #1177 — all providers must extend BaseProvider or OpenAIChatCompletionsProvider

      // Import discipline: route all "ai" / "@ai-sdk/provider" usage through the
      // seam files in src/lib/utils/{generation,generationErrors,tool}.ts and
      // src/lib/types/{conversation,tools,providers,middleware}.ts. The seam
      // files themselves get an override below.
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "ai",
              message:
                "Import via the seam: src/lib/utils/{generation,generationErrors,tool}.ts for runtime values and src/lib/types/{conversation,tools,providers,middleware}.ts for types.",
            },
            {
              name: "@ai-sdk/provider",
              message:
                "Import protocol types via src/lib/types/middleware.ts and APICallError via src/lib/utils/generationErrors.ts.",
            },
          ],
        },
      ],
      // `no-restricted-imports` does NOT report dynamic ImportExpression
      // (`import("ai")`); catch those via AST selector so the seam is also
      // enforced for lazy / circular-dep-avoidance imports.
      "no-restricted-syntax": [
        "error",
        {
          selector: "ImportExpression[source.value='ai']",
          message:
            "Dynamic import('ai') must go through the seam: src/lib/utils/{generation,generationErrors,tool}.ts.",
        },
        {
          selector: "ImportExpression[source.value='@ai-sdk/provider']",
          message:
            "Dynamic import('@ai-sdk/provider') must go through the seam: src/lib/types/middleware.ts (types) or src/lib/utils/generationErrors.ts (runtime).",
        },
        // Critical Rule 14: no double type assertions through unknown/any.
        // `x as unknown as T` defeats the compiler's structural-overlap check
        // entirely — the value is trusted as T with zero validation. Fix the
        // type at the source, use a runtime-validating type guard, or a single
        // `as T` (still overlap-checked). Covers `as` and angle-bracket forms.
        // (@typescript-eslint/no-unsafe-type-assertion is the stricter official
        // alternative, but it bans ALL narrowing assertions — 2,790 hits as of
        // 2026-07 — so the precise pattern is banned via selector instead.)
        {
          selector:
            ":matches(TSAsExpression, TSTypeAssertion):matches([expression.type='TSAsExpression'], [expression.type='TSTypeAssertion'])[expression.typeAnnotation.type='TSUnknownKeyword']",
          message:
            "Unsafe double type assertion (`... as unknown as T`) defeats all compiler checking. Fix the type at the source, use a runtime-validating type guard, or a single `as T`. See CLAUDE.md Critical Rule 14.",
        },
        {
          selector:
            ":matches(TSAsExpression, TSTypeAssertion):matches([expression.type='TSAsExpression'], [expression.type='TSTypeAssertion'])[expression.typeAnnotation.type='TSAnyKeyword']",
          message:
            "Unsafe double type assertion (`... as any as T`) defeats all compiler checking. Fix the type at the source, use a runtime-validating type guard, or a single `as T`. See CLAUDE.md Critical Rule 14.",
        },
      ],

      // Disable base rules that are covered by TypeScript
      "no-unused-vars": "off",
      "no-undef": "off",

      // TypeScript-specific rules (BALANCED ENFORCEMENT)
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
          args: "after-used",
          vars: "local",
        },
      ], // Error for unused vars (unused imports should be caught)
      "@typescript-eslint/no-explicit-any": "error", // Error on any types - enforce strict typing
      "@typescript-eslint/prefer-as-const": "error",
      "@typescript-eslint/no-non-null-assertion": "warn", // Warn about non-null assertions but don't block builds

      // Enhanced type safety (basic rules only)

      // Code quality gates (balanced enforcement - warnings for legacy code)
      "max-depth": ["error", 6], // Error for deeply nested code
      "max-lines-per-function": ["warn", 300], // Warn for very large functions (legacy methods)
      "max-params": ["error", 6], // Error for too many parameters

      // Security rules
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-console": ["error", { allow: ["warn", "error", "info"] }], // Allow console.warn, console.error, and console.info for legitimate logging

      // Modern JavaScript
      "prefer-const": "warn",
      "no-var": "error",

      // Code quality
      eqeqeq: ["error", "always"],
      curly: ["error", "all"],

      // Style (handled by Prettier)
      indent: "off",
      quotes: "off",
      semi: "off",
    },
  },
  {
    // TypeScript files in test/ directory (no project-based linting due to path mismatch)
    files: ["test/**/*.ts"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        // No project for test files since they're not in the main tsconfig
      },
      globals: {
        // Node.js globals
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        global: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",

        // Browser globals
        window: "readonly",
        document: "readonly",
        navigator: "readonly",

        // Test globals
        describe: "readonly",
        it: "readonly",
        test: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        vi: "readonly",
        vitest: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      neurolink,
    },
    rules: {
      // Rule 15 — tests drive the shipped surface, not src/lib. The `allow`
      // list is the determinism exception: a suite may sit outside the rule
      // only when it needs deterministic control a live call cannot give.
      // Every entry states why in its own file header. Adding to this list is
      // a review decision, not a way to silence the rule.
      "neurolink/e2e-tests-only": [
        "error",
        {
          allow: [
            // Chunk boundaries and reranker ordering are exact outcomes;
            // generate({ rag }) only ever shows the model's answer.
            "test/continuous-test-suite-rag.ts",
            // Parser edge cases, outgoing wire format, proxy cooldown/quota.
            "test/continuous-test-suite-bugfixes.ts",
            // 429-cooldown planning and quota ordering across accounts, plus
            // OpenCode client-config writing against a throwaway XDG dir —
            // including the not-installed branch, which no live run reaches.
            "test/continuous-test-suite-proxy.ts",
            // Background task system with no public surface at all.
            "test/continuous-test-suite-autoresearch.ts",
            // HandlerRegistry<THandler> is internal composition plumbing
            // never exported from any package entry point — no public
            // surface at all (same reasoning as autoresearch above).
            "test/continuous-test-suite-handler-registry.ts",
            // MEDIA_HANDLER_CATALOG / providerChoicesFor / defaultProviderFor
            // (src/lib/factories/mediaHandlerCatalog.ts) are never re-exported
            // from src/lib/index.ts — no package entry point resolves them,
            // same "no public surface at all" reasoning as HandlerRegistry
            // above. The suite's live-registration assertions (TTSProcessor.
            // listProviders() etc.) still go through the real public surface
            // via ../dist/index.js; only the catalog-internals reads need
            // this exception.
            "test/continuous-test-suite-media-registry-collisions.ts",
            // resolveRequestKind() is internal dispatch plumbing consumed
            // only by neurolink.ts/baseProvider.ts — never exported from any
            // package entry point, no public surface at all (same reasoning
            // as handler-registry above).
            "test/continuous-test-suite-resolve-request-kind.ts",
            // Filter-dialect translation no live generate() could emit.
            "test/continuous-test-suite-vector-chroma.ts",
            "test/continuous-test-suite-vector-pinecone.ts",
            // Synthetic rule tables, duck-typed error shapes no real SDK
            // produces, and module-export-shape checks. Its header already
            // states the exception and the all-src module graph.
            "test/continuous-test-suite-error-classifier-contract.ts",
            // Account ordering, 429 cooldown planning and refresh-failure
            // classification, which would otherwise need a specific sequence
            // of 429s and token-endpoint failures across several real ChatGPT
            // accounts to provoke. Its header states the exception in full,
            // including that `__testHooks` should shrink as the logic gains a
            // real surface. Its last two cases drive the built CLI and are
            // deliberately outside the exception.
            "test/continuous-test-suite-codex.ts",
            // Internal agentic-loop-engine primitives (streamChannel,
            // nativeToolFormat, loopEngine) have no exported surface at all
            // — none of src/lib/core/{streamChannel,nativeToolFormat,
            // loopEngine}.ts is reachable via package.json's `exports` map,
            // and nothing outside their own tests imports them yet (Tasks
            // 1-3 add the engine core only; no provider is migrated onto it
            // in this PR). Exact push/close/error ordering, per-adapter
            // retry-call counts against a hand-written fake adapter, and
            // PostEmissionStepError's unwrap-in-both-directions behavior are
            // facts about the primitives' own contracts, not about any
            // provider's wire format — no live or mocked generate()/stream()
            // call can deterministically produce them. Its header states the
            // exception in full.
            "test/continuous-test-suite-loop-engine.ts",
            // manifestRegistry has no consumer yet — this PR series adds the
            // manifest as an additive metadata source and migrates nothing
            // onto it, so no generate()/stream()/CLI path reaches the
            // resolver. The alias-resolution bug the suite exists to catch (a
            // bare model name silently losing its real contextWindow to the
            // provider default) is unreachable from any public surface until
            // a consumer migrates. Its header states this in full, including
            // that the suite should be converted or retired once one does.
            "test/continuous-test-suite-model-manifests.ts",
            // Direct `synthesizeStream` access covers only the
            // handler-synthesis seam: provider/default text caps,
            // surrogate-safe splits, and final-chunk failure isolation.
            // Sentence carry-over and flush behaviour drive the public
            // `stream()` surface instead.
            "test/continuous-test-suite-tts-unit.ts",

            // ---------------------------------------------------------------
            // Grandfathered when this rule was extended to cover deep `dist/`
            // paths as well as `src/`.
            //
            // These predate the extension. Rewriting an import from
            // `../src/lib/x.js` to `../dist/lib/x.js` satisfied the old rule
            // without changing what the suite proved, so the deep-dist form
            // became the established local pattern — `provider-structure.ts`
            // even greps the *source text* of providerRegistry.ts. That is
            // the corpus the rule now encodes, not evasion of it.
            //
            // Listing them keeps the gate green while making the rule bite
            // for every NEW suite, which is where the value is. This block is
            // debt, not a clean bill of health: each entry should either gain
            // a real public surface or be converted. Do not add to this block
            // — a new suite belongs above, with its own stated reason.
            // ---------------------------------------------------------------
            "test/continuous-test-suite.ts",
            "test/continuous-test-suite-auth.ts",
            "test/continuous-test-suite-context.ts",
            "test/continuous-test-suite-credentials.ts",
            "test/continuous-test-suite-error-classification-e2e.ts",
            "test/continuous-test-suite-memory.ts",
            "test/continuous-test-suite-observability.ts",
            "test/continuous-test-suite-ppt.ts",
            "test/continuous-test-suite-provider-descriptors.ts",
            "test/continuous-test-suite-provider-structure.ts",
            "test/continuous-test-suite-provider-wiring.ts",
            "test/continuous-test-suite-providers-mocked.ts",
            "test/continuous-test-suite-providers.ts",
            "test/continuous-test-suite-skills.ts",
            "test/continuous-test-suite-tool-dedup.ts",
            "test/continuous-test-suite-voice.ts",
          ],
        },
      ],

      // Disable base rules that are covered by TypeScript
      "no-unused-vars": "off",
      "no-undef": "off",

      // TypeScript-specific rules (less strict for test files)
      "@typescript-eslint/no-unused-vars": "warn", // Test files often have unused vars - warn only
      "@typescript-eslint/no-explicit-any": "warn", // Less strict for test files - warn only
      "@typescript-eslint/prefer-as-const": "error",
      "no-console": "off", // Allow all console statements in tests

      // Modern JavaScript
      "prefer-const": "warn",
      "no-var": "error",

      // Code quality
      eqeqeq: ["error", "always"],
      curly: ["error", "all"],

      // Style (handled by Prettier)
      indent: "off",
      quotes: "off",
      semi: "off",
    },
  },
  {
    // Logger file override - allow console statements in logger implementation
    files: ["src/lib/utils/logger.ts"],
    rules: {
      "no-console": "off", // Logger implementation needs console access
    },
  },
  {
    // Seam files — these are the only files allowed to import from "ai" /
    // "@ai-sdk/provider" directly (static OR dynamic). Every other file in
    // src/ must route through these (see no-restricted-imports and
    // no-restricted-syntax above).
    files: [
      "src/lib/utils/generation.ts",
      "src/lib/utils/generationErrors.ts",
      "src/lib/utils/tool.ts",
      "src/lib/types/conversation.ts",
      "src/lib/types/tools.ts",
      "src/lib/types/providers.ts",
      "src/lib/types/middleware.ts",
    ],
    rules: {
      "no-restricted-imports": "off",
      "no-restricted-syntax": "off",
    },
  },
  {
    // Test files override - allow console statements and relaxed rules
    files: ["test/**/*.ts"],
    rules: {
      "no-console": "off", // Allow all console statements in test files
      "@typescript-eslint/no-explicit-any": "warn", // Consistent with test directory rules above
      "@typescript-eslint/no-unused-vars": "off", // Allow unused vars in tests
    },
  },
  {
    // This directory is excluded from tsconfig.json, so type-aware linting
    // (project) is disabled here. The matched .ts file is the server-side
    // package entry (re-exports only); no browser globals are needed.
    files: ["src/lib/server/voice/public/**/*.ts"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        project: null,
      },
    },
  },
  {
    // CommonJS files (e.g., Docusaurus config) - allow module.exports and require
    files: ["docs-site/**/*.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        module: "writable",
        require: "readonly",
        exports: "writable",
        __dirname: "readonly",
        __filename: "readonly",
      },
    },
  },
  {
    // Ignore patterns
    ignores: [
      "node_modules/**",
      "dist/**",
      "action-dist/**",
      "build/**",
      ".svelte-kit/**",
      "package/**",
      ".git/**",
      ".git_disabled/**",
      // Claude Code local scratch worktrees (agent/workflow isolation copies) - not source
      ".claude/worktrees/**",
      "docs/cli-recordings/**",
      "docs/visual-content/**",
      "neurolink-demo/**",
      "scripts/**",
      "memory-bank/**",
      "archive/**",
      "examples/**",
      "*.config.js",
      "*.config.ts",
      ".changeset/**",
      "*.log",
      "test-output.json",
      "test-output.txt",
      "debug-output.txt",
      "demo-results.json",
      "batch-results.json",
      // Scratch artifacts produced by the voice fix campaign — not source.
      "test-results/**",
      "package-lock.json",
      "pnpm-lock.yaml",
      "*.tgz",
      "*.d.ts",
      "src/cli/**/*.d.ts",
      // Exclude built documentation site and generated files
      "site/**",
      "_site/**",
      // Exclude landing build outputs and Svelte files (handled by landing workspace)
      "landing/.vercel/**",
      "landing/.svelte-kit/**",
      "landing/**/*.svelte",
      // Exclude Docusaurus build output
      "docs-site/.docusaurus/**",
      "docs-site/build/**",
      // Exclude compiled MCP server output files
      "docs-site/mcp-server/**/*.js",
      // Test scratch directories (suite-local temp files that come and go
      // during runs; eslint racing them produces ENOENT errors)
      "test/.tmp/**",
      "test/.tmp-*/**",
      ".tmp-tests/**",
    ],
  },
];
