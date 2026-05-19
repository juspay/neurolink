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
    },
    rules: {
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
