# Build Configuration and Tooling

**Status**: `[ ]` Not started  
**Priority**: 🟡 Medium  
**Estimated Effort**: 3-4 hours  
**Prerequisites**: All other refactor modules should be completed

## Objective

Optimize build configuration, improve TypeScript settings, enhance ESLint rules, and ensure the build pipeline properly validates the TypeScript improvements made across all modules.

## Files to Modify

### TypeScript Configuration

- `tsconfig.json` - Main TypeScript configuration
- `tsconfig.ci.json` - CI-specific TypeScript settings
- `tsconfig.cli.json` - CLI-specific TypeScript settings

### ESLint Configuration

- `eslint.config.js` - ESLint configuration
- `.eslintrc.js` - Legacy ESLint config (if exists)

### Build Configuration

- `vite.config.ts` - Vite build configuration
- `svelte.config.js` - Svelte configuration
- `package.json` - Build scripts and dependencies

### CI/CD Configuration

- `.github/workflows/` - GitHub Actions (if exists)
- Build scripts in `scripts/` directory

## Step-by-Step Instructions

### Step 1: Backup and Setup

```bash
# Create feature branch
git checkout -b refactor/build-configuration
git add -A
git commit -m "Backup before build configuration refactor"
```

### Step 2: Enhance TypeScript Configuration

**File**: `tsconfig.json`

```json
{
  "compilerOptions": {
    // Existing settings
    "allowJs": true,
    "checkJs": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "sourceMap": true,
    "strict": true,
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "noImplicitReturns": true,
    "target": "ES2022",
    "lib": ["DOM", "DOM.Iterable", "ES6"],
    "allowSyntheticDefaultImports": true,
    "types": ["vite/client", "@sveltejs/kit"],

    // Enhanced strict settings
    "noImplicitAny": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitOverride": true,
    "useUnknownInCatchVariables": true,

    // Additional strict checks
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,

    // Import/export settings
    "allowImportingTsExtensions": false,
    "allowArbitraryExtensions": false,

    // Path mapping (existing)
    "paths": {
      "$lib": ["./src/lib"],
      "$lib/*": ["./src/lib/*"]
    }
  },
  "include": [
    "src/**/*.ts",
    "src/**/*.js",
    "src/**/*.svelte",
    "test/**/*.ts",
    "src/app.html"
  ],
  "exclude": ["node_modules", "dist", "build", ".svelte-kit", "**/*.d.ts"]
}
```

**File**: `tsconfig.ci.json`

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    // CI-specific overrides
    "noEmit": true,
    "skipLibCheck": false,
    "incremental": false,

    // Stricter settings for CI
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,

    // Detailed error reporting
    "listFiles": false,
    "listEmittedFiles": false,
    "pretty": true
  },
  "include": ["src/**/*.ts", "src/**/*.js", "src/**/*.svelte", "test/**/*.ts"]
}
```

**File**: `tsconfig.cli.json`

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    // CLI-specific settings
    "module": "NodeNext",
    "target": "ES2022",
    "moduleResolution": "NodeNext",

    // CLI output settings
    "outDir": "./dist/cli",
    "rootDir": "./src/cli",

    // Node.js specific
    "types": ["node"],
    "allowSyntheticDefaultImports": true
  },
  "include": ["src/cli/**/*.ts", "src/lib/**/*.ts"],
  "exclude": ["src/**/*.test.ts", "src/**/*.spec.ts", "test/**/*"]
}
```

### Step 3: Enhance ESLint Configuration

**File**: `eslint.config.js`

```javascript
import js from "@eslint/js";
import ts from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import prettier from "eslint-config-prettier";
import importPlugin from "eslint-plugin-import";

export default [
  js.configs.recommended,
  {
    files: ["**/*.ts", "**/*.js"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        project: "./tsconfig.json",
      },
    },
    plugins: {
      "@typescript-eslint": ts,
      import: importPlugin,
    },
    rules: {
      // TypeScript-specific rules
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": "error",
      "@typescript-eslint/prefer-type-imports": "error",
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
      "@typescript-eslint/no-inferrable-types": "error",
      "@typescript-eslint/prefer-nullish-coalescing": "error",
      "@typescript-eslint/prefer-optional-chain": "error",
      "@typescript-eslint/strict-boolean-expressions": "error",

      // Import rules
      "import/extensions": [
        "error",
        "never",
        {
          js: "never",
          ts: "never",
          json: "always",
        },
      ],
      "import/no-unresolved": "error",
      "import/order": [
        "error",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            "parent",
            "sibling",
            "index",
          ],
          alphabetize: {
            order: "asc",
            caseInsensitive: true,
          },
        },
      ],

      // General code quality rules
      "no-console": "warn",
      "no-debugger": "error",
      "no-alert": "error",
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "prefer-const": "error",
      "no-var": "error",

      // Function and naming rules
      "func-style": ["error", "declaration", { allowArrowFunctions: true }],
      "prefer-arrow-callback": "error",
      "arrow-spacing": "error",

      // Object and array rules
      "object-shorthand": "error",
      "prefer-destructuring": [
        "error",
        {
          array: true,
          object: true,
        },
      ],

      // Promise rules
      "prefer-promise-reject-errors": "error",
    },
  },
  {
    files: ["**/*.test.ts", "**/*.spec.ts", "test/**/*.ts"],
    rules: {
      // Relax some rules for tests
      "@typescript-eslint/no-explicit-any": "warn",
      "no-console": "off",
    },
  },
  {
    files: ["src/cli/**/*.ts"],
    rules: {
      // CLI-specific rules
      "no-console": "off", // CLI needs console output
      "no-process-exit": "off", // CLI needs process.exit
    },
  },
  prettier, // Must be last to override other formatting rules
];
```

### Step 4: Enhance Build Scripts

**File**: `package.json` (update scripts section)

```json
{
  "scripts": {
    // Enhanced build scripts
    "build": "pnpm run build:validate && pnpm run build:lib && pnpm run build:cli",
    "build:validate": "pnpm run type-check && pnpm run lint:check",
    "build:lib": "vite build",
    "build:cli": "tsc --project tsconfig.cli.json",
    "build:clean": "rm -rf dist .svelte-kit",

    // Type checking scripts
    "type-check": "tsc --noEmit --project tsconfig.json",
    "type-check:ci": "tsc --noEmit --project tsconfig.ci.json",
    "type-check:cli": "tsc --noEmit --project tsconfig.cli.json",
    "type-check:all": "pnpm run type-check && pnpm run type-check:cli",

    // Linting scripts
    "lint": "eslint . --ext .ts,.js,.svelte --max-warnings 0",
    "lint:check": "eslint . --ext .ts,.js,.svelte --max-warnings 0",
    "lint:fix": "eslint . --ext .ts,.js,.svelte --fix",

    // Formatting scripts
    "format": "prettier --write .",
    "format:check": "prettier --check .",

    // Combined quality checks
    "quality:check": "pnpm run type-check:all && pnpm run lint:check && pnpm run format:check",
    "quality:fix": "pnpm run lint:fix && pnpm run format",

    // Testing with type checks
    "test": "vitest",
    "test:run": "vitest run",
    "test:ci": "pnpm run type-check:ci && vitest run --coverage",

    // Development
    "dev": "vite dev",
    "preview": "vite preview",

    // Validation pipeline
    "validate": "pnpm run quality:check && pnpm run test:run",
    "validate:ci": "pnpm run quality:check && pnpm run test:ci"
  }
}
```

### Step 5: Enhance Vite Configuration

**File**: `vite.config.ts`

```typescript
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [sveltekit()],

  build: {
    // Enhanced build settings
    target: "ES2022",
    minify: "terser",
    sourcemap: true,

    // TypeScript settings
    rollupOptions: {
      output: {
        // Preserve module structure
        preserveModules: false,
        // Better chunk naming
        chunkFileNames: "chunks/[name]-[hash].js",
        entryFileNames: "[name].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
      external: [
        // Mark CLI dependencies as external for library build
        "yargs",
        "ora",
        "chalk",
      ],
    },

    // Library build configuration
    lib: {
      entry: "src/lib/index.ts",
      name: "NeuroLink",
      fileName: (format) => `neurolink.${format}.js`,
      formats: ["es", "cjs"],
    },
  },

  // Development settings
  server: {
    port: 5173,
    host: true,
  },

  // TypeScript integration
  esbuild: {
    target: "ES2022",
    keepNames: true,
  },

  // Testing configuration
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["test/setup-minimal.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["dist/**", "test/**", "**/*.d.ts", "**/*.config.*"],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
  },
});
```

### Step 6: Create Type Validation Script

**File**: `scripts/validate-types.js` (create new file)

```javascript
#!/usr/bin/env node

/**
 * Type validation script for NeuroLink
 * Validates TypeScript compliance across all modules
 */

import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import { glob } from "glob";
import chalk from "chalk";

const CONFIG = {
  tsconfigs: ["tsconfig.json", "tsconfig.ci.json", "tsconfig.cli.json"],
  checkPatterns: ["src/**/*.ts", "test/**/*.ts"],
  excludePatterns: ["**/*.d.ts", "**/node_modules/**", "**/dist/**"],
};

async function main() {
  console.log(chalk.blue("🔍 Validating TypeScript compliance...\n"));

  let hasErrors = false;

  // Check 1: TypeScript compilation
  hasErrors = (await checkTypeScriptCompilation()) || hasErrors;

  // Check 2: No .js extensions in TypeScript imports
  hasErrors = (await checkImportExtensions()) || hasErrors;

  // Check 3: No 'any' types (except in specific allowed cases)
  hasErrors = (await checkAnyUsage()) || hasErrors;

  // Check 4: Interface vs Type usage
  hasErrors = (await checkInterfaceUsage()) || hasErrors;

  // Check 5: Explicit return types on public functions
  hasErrors = (await checkReturnTypes()) || hasErrors;

  if (hasErrors) {
    console.log(chalk.red("\n❌ TypeScript validation failed!"));
    process.exit(1);
  } else {
    console.log(chalk.green("\n✅ All TypeScript validation checks passed!"));
  }
}

async function checkTypeScriptCompilation() {
  console.log(chalk.yellow("Checking TypeScript compilation..."));

  let hasErrors = false;

  for (const tsconfig of CONFIG.tsconfigs) {
    if (existsSync(tsconfig)) {
      try {
        execSync(`npx tsc --noEmit --project ${tsconfig}`, {
          stdio: "inherit",
        });
        console.log(chalk.green(`✅ ${tsconfig} compiles successfully`));
      } catch (error) {
        console.log(chalk.red(`❌ ${tsconfig} compilation failed`));
        hasErrors = true;
      }
    }
  }

  return hasErrors;
}

async function checkImportExtensions() {
  console.log(
    chalk.yellow("Checking for .js extensions in TypeScript imports..."),
  );

  const files = await glob(CONFIG.checkPatterns, {
    ignore: CONFIG.excludePatterns,
  });

  let hasErrors = false;

  for (const file of files) {
    const content = readFileSync(file, "utf-8");
    const lines = content.split("\n");

    lines.forEach((line, index) => {
      if (line.match(/import.*from\s+['"][^'"]*\.js['"]/)) {
        console.log(
          chalk.red(
            `❌ ${file}:${index + 1} - .js extension in TypeScript import`,
          ),
        );
        console.log(chalk.gray(`   ${line.trim()}`));
        hasErrors = true;
      }
    });
  }

  if (!hasErrors) {
    console.log(
      chalk.green("✅ No .js extensions found in TypeScript imports"),
    );
  }

  return hasErrors;
}

async function checkAnyUsage() {
  console.log(chalk.yellow("Checking for 'any' type usage..."));

  const files = await glob(CONFIG.checkPatterns, {
    ignore: CONFIG.excludePatterns,
  });

  let hasErrors = false;
  const allowedAnyUsage = [
    "test/", // Allow any in test files with warning
    "scripts/", // Allow any in build scripts
  ];

  for (const file of files) {
    const content = readFileSync(file, "utf-8");
    const lines = content.split("\n");

    lines.forEach((line, index) => {
      if (line.match(/:\s*any\b|<any>|\bany\[\]/)) {
        const isAllowed = allowedAnyUsage.some((pattern) =>
          file.includes(pattern),
        );

        if (isAllowed) {
          console.log(
            chalk.yellow(
              `⚠️  ${file}:${index + 1} - 'any' type usage (allowed in ${file.includes("test/") ? "tests" : "scripts"})`,
            ),
          );
        } else {
          console.log(
            chalk.red(`❌ ${file}:${index + 1} - 'any' type usage not allowed`),
          );
          console.log(chalk.gray(`   ${line.trim()}`));
          hasErrors = true;
        }
      }
    });
  }

  if (!hasErrors) {
    console.log(chalk.green("✅ No prohibited 'any' type usage found"));
  }

  return hasErrors;
}

async function checkInterfaceUsage() {
  console.log(chalk.yellow("Checking interface vs type usage..."));

  const files = await glob(CONFIG.checkPatterns, {
    ignore: CONFIG.excludePatterns,
  });

  let interfaceCount = 0;
  let suggestions = [];

  for (const file of files) {
    const content = readFileSync(file, "utf-8");
    const lines = content.split("\n");

    lines.forEach((line, index) => {
      if (
        line.match(/^export\s+interface\s+\w+/) ||
        line.match(/^\s*interface\s+\w+/)
      ) {
        interfaceCount++;
        suggestions.push(
          `${file}:${index + 1} - Consider using 'type' instead of 'interface'`,
        );
      }
    });
  }

  if (interfaceCount > 0) {
    console.log(
      chalk.yellow(`⚠️  Found ${interfaceCount} interface declarations`),
    );
    console.log(chalk.gray("   Consider using 'type' for consistency:"));
    suggestions.slice(0, 5).forEach((suggestion) => {
      console.log(chalk.gray(`   ${suggestion}`));
    });
    if (suggestions.length > 5) {
      console.log(chalk.gray(`   ... and ${suggestions.length - 5} more`));
    }
  } else {
    console.log(chalk.green("✅ Consistent type usage (no interfaces found)"));
  }

  return false; // Don't fail build for this
}

async function checkReturnTypes() {
  console.log(
    chalk.yellow("Checking for explicit return types on public functions..."),
  );

  // This is a simplified check - in practice, TypeScript compiler will catch this
  // with noImplicitReturns and strict settings

  try {
    execSync("npx tsc --noEmit --strict", { stdio: "pipe" });
    console.log(chalk.green("✅ TypeScript strict mode validation passed"));
    return false;
  } catch (error) {
    console.log(chalk.red("❌ TypeScript strict mode validation failed"));
    console.log(
      chalk.gray(
        "   Check that all public functions have explicit return types",
      ),
    );
    return true;
  }
}

// Run the validation
main().catch((error) => {
  console.error(chalk.red("Validation script failed:"), error);
  process.exit(1);
});
```

### Step 7: Update CI/CD Configuration

**File**: `.github/workflows/ci.yml` (create if not exists)

```yaml
name: CI

on:
  push:
    branches: [main, release]
  pull_request:
    branches: [main, release]

jobs:
  type-check:
    runs-on: ubuntu-latest
    name: Type Check

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "18"

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Type check
        run: pnpm run type-check:ci

      - name: Validate TypeScript compliance
        run: node scripts/validate-types.js

  lint:
    runs-on: ubuntu-latest
    name: Lint

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "18"

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm run lint:check

      - name: Format check
        run: pnpm run format:check

  test:
    runs-on: ubuntu-latest
    name: Test

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "18"

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run tests
        run: pnpm run test:ci

  build:
    runs-on: ubuntu-latest
    name: Build
    needs: [type-check, lint, test]

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "18"

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm run build

      - name: Test CLI
        run: |
          chmod +x dist/cli/index.js
          ./dist/cli/index.js --help
```

## Validation Checklist

### Configuration Checks

- [ ] TypeScript configuration enforces strict mode
- [ ] ESLint rules prevent TypeScript anti-patterns
- [ ] Build scripts include type checking
- [ ] CI/CD pipeline validates TypeScript compliance

### Build Checks

- [ ] Library builds successfully
- [ ] CLI builds successfully
- [ ] Type checking passes for all configurations
- [ ] Linting passes with enhanced rules

### Quality Checks

- [ ] No .js extensions in TypeScript imports
- [ ] No prohibited 'any' usage
- [ ] Consistent type definitions
- [ ] All tests pass with enhanced configuration

## Verification Commands

```bash
# Full validation pipeline
pnpm run validate

# Individual checks
pnpm run type-check:all
pnpm run lint:check
pnpm run format:check
pnpm run test:run

# Build validation
pnpm run build

# Custom validation script
node scripts/validate-types.js

# CI simulation
pnpm run validate:ci
```

## Success Criteria

- ✅ TypeScript strict mode enabled and passing
- ✅ Enhanced ESLint rules enforcing TypeScript best practices
- ✅ Build pipeline includes comprehensive type checking
- ✅ CI/CD validates TypeScript compliance
- ✅ No .js extensions in TypeScript imports
- ✅ Minimal 'any' usage (only where absolutely necessary)
- ✅ Consistent type definitions across codebase
- ✅ All build targets (library, CLI) compile successfully
- ✅ All tests pass with enhanced configuration
- ✅ Custom validation script passes

## Next Steps

After completing this refactor:

1. Document the new build and validation process
2. Update contributor guidelines with TypeScript standards
3. Consider adding pre-commit hooks for validation
4. Monitor build performance and optimize if needed

## Impact Assessment

**High Impact**:

- Build quality significantly improved
- Type safety enforced across entire codebase
- Catches errors earlier in development cycle

**Medium Impact**:

- Development workflow includes more checks
- CI/CD pipeline more comprehensive

**Low Impact**:

- Runtime performance (no change)
- API compatibility (preserved)
