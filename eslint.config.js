// ESLint v9 configuration for NeuroLink
import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";

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
    // TypeScript files in src/ directory (use project-based linting)
    files: ["src/**/*.ts"],
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
    },
    rules: {
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
    // Test files override - allow console statements and relaxed rules
    files: ["test/**/*.ts"],
    rules: {
      "no-console": "off", // Allow all console statements in test files
      "@typescript-eslint/no-explicit-any": "warn", // Consistent with test directory rules above
      "@typescript-eslint/no-unused-vars": "off", // Allow unused vars in tests
    },
  },
  {
    // Ignore patterns
    ignores: [
      "node_modules/**",
      "dist/**",
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
      "package-lock.json",
      "pnpm-lock.yaml",
      "*.tgz",
      "*.d.ts",
      "src/cli/**/*.d.ts",
      // Exclude built documentation site and generated files
      "site/**",
      "_site/**",
    ],
  },
];
