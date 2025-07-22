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

      // TypeScript-specific rules (less strict to avoid blocking build)
      "@typescript-eslint/no-unused-vars": "off", // Too many legacy unused vars
      "@typescript-eslint/no-explicit-any": "off", // Legacy codebase has many any types
      "@typescript-eslint/prefer-as-const": "warn",

      // Basic rules
      "no-console": "off",

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
    files: ["test/**/*.ts", "src/test/**/*.ts"],
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
      "@typescript-eslint/no-unused-vars": "off", // Test files often have unused vars
      "@typescript-eslint/no-explicit-any": "off", // Test mocks use any types
      "@typescript-eslint/prefer-as-const": "warn",

      // Basic rules
      "no-console": "off",

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
      // Exclude problematic test files with old MCP interfaces
      "src/test/ai-analysis-tools.ts",
      "src/test/ai-workflow-tools.ts",
      "src/test/mcp-comprehensive.ts",
      "src/test/mcp-unified.ts",
      // Exclude analysis files with Node.js environment issues
      "comprehensive-gap-analysis.cjs",
      "test-feature-gaps.cjs",
    ],
  },
];
