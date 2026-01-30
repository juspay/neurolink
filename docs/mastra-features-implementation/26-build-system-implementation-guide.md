# Build System Implementation Guide

This comprehensive guide documents NeuroLink's build system architecture, evolution, and implementation patterns. Use this guide when setting up new build configurations, troubleshooting build issues, or understanding the project's CI/CD pipeline.

## Table of Contents

1. [Build System Evolution](#1-build-system-evolution)
2. [Dual Build Architecture](#2-dual-build-architecture)
3. [TypeScript Configuration](#3-typescript-configuration)
4. [Release Automation](#4-release-automation)
5. [CI/CD Pipeline](#5-cicd-pipeline)
6. [OIDC Publishing](#6-oidc-publishing)
7. [Validation Scripts](#7-validation-scripts)
8. [Build Templates](#8-build-templates)

---

## 1. Build System Evolution

### Historical Timeline

NeuroLink's build system evolved through several distinct phases, each addressing specific challenges:

| Phase            | Date       | Version | Key Change                                  |
| ---------------- | ---------- | ------- | ------------------------------------------- |
| Foundation       | 2025-06-04 | 1.0.0   | Initial Vite + SvelteKit + Changesets setup |
| CLI Separation   | 2025-06-05 | -       | CLI build command added (inline tsc)        |
| Dedicated Config | 2025-06-10 | -       | tsconfig.cli.json introduced                |
| Dual Exports     | 2025-06-14 | 1.7.0   | Conditional exports for SDK + CLI           |
| Build Rules      | 2025-08-10 | 7.9.0   | Comprehensive build rule enforcement        |
| Semantic Release | 2025-08-11 | -       | Automated versioning and changelog          |
| ESM Fixes        | 2025-08-26 | 7.28.1  | NodeNext module resolution                  |
| Vitest           | 2025-10-23 | 7.53.0  | Modern testing framework                    |
| Node.js 20       | 2025-11-19 | 8.0.0   | Breaking: Node.js 20+ requirement           |
| OIDC Publishing  | 2025-12-10 | 8.7.0+  | Tokenless npm publishing                    |
| Current          | 2026-01-22 | 8.37.0  | Stable dual-build system                    |

### Evolution Diagram

```
Phase 1: Simple Vite Build
┌─────────────────────────────────────────────┐
│ vite build → svelte-package → publint      │
└─────────────────────────────────────────────┘

Phase 2: CLI Build Added (Inline TSC)
┌─────────────────────────────────────────────┐
│ vite build → svelte-package → tsc (inline) │
└─────────────────────────────────────────────┘

Phase 3: Dedicated CLI Config
┌─────────────────────────────────────────────┐
│ vite build ─────────────────→ SDK Output    │
│ tsc --project tsconfig.cli.json → CLI Output│
└─────────────────────────────────────────────┘

Phase 4: Current Dual Pipeline
┌─────────────────────────────────────────────────────────────┐
│                    Build Pipeline                            │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐   │
│  │   Source    │────▶│  Vite/Kit   │────▶│  SDK Build  │   │
│  │   src/lib   │     │   Build     │     │   dist/     │   │
│  └─────────────┘     └─────────────┘     └─────────────┘   │
│                                                              │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐   │
│  │   Source    │────▶│  TypeScript │────▶│  CLI Build  │   │
│  │   src/cli   │     │  Compiler   │     │  dist/cli/  │   │
│  └─────────────┘     └─────────────┘     └─────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Key Lessons from Evolution

1. **Start with the right foundation**: Vite + SvelteKit + Changesets from day one provided scalability
2. **Separate concerns early**: Dedicated `tsconfig.cli.json` prevented configuration conflicts
3. **ESM requires care**: NodeNext module resolution needed for proper ESM support
4. **Automate quality gates**: Build rule enforcement caught issues early
5. **Embrace modern authentication**: OIDC publishing improved security

---

## 2. Dual Build Architecture

### Architecture Overview

NeuroLink produces two distinct outputs from a single codebase:

```
src/
├── lib/                    # SDK source (SvelteKit packaging)
│   ├── neurolink.ts       # Main SDK class
│   ├── providers/         # AI provider implementations
│   ├── adapters/          # Provider adapters
│   ├── mcp/              # MCP integration
│   └── types/            # TypeScript definitions
└── cli/                   # CLI source (TypeScript compiler)
    ├── index.ts          # CLI entry point
    ├── commands/         # CLI commands
    ├── factories/        # Command factories
    └── loop/             # Interactive session

dist/
├── index.js              # SDK entry point
├── index.d.ts            # SDK type definitions
├── lib/                  # SDK library modules
├── providers/            # Compiled providers
├── cli/                  # CLI output
│   ├── index.js         # CLI executable
│   └── commands/        # Compiled commands
└── types/               # Type definitions
```

### Build Tools Stack

| Tool               | Purpose                           | Configuration File    |
| ------------------ | --------------------------------- | --------------------- |
| **Vite**           | SDK bundling and dev server       | `vite.config.ts`      |
| **SvelteKit**      | Package building and types        | `svelte.config.js`    |
| **TypeScript**     | CLI compilation and type checking | `tsconfig.cli.json`   |
| **svelte-package** | NPM package preparation           | Built-in to SvelteKit |
| **publint**        | Package validation                | Inline execution      |
| **ncc**            | GitHub Action bundling            | `build:action` script |

### Build Commands

```bash
# Primary build (SDK + CLI)
pnpm run build
# Executes: vite build && pnpm run prepack

# CLI only (rapid development)
pnpm run build:cli
# Executes: svelte-kit sync && tsc --project tsconfig.cli.json && pnpm link --global

# GitHub Action build
pnpm run build:action
# Executes: ncc build src/action/index.ts -o action-dist --source-map

# Complete pipeline with validation
pnpm run build:complete
# Executes: node tools/automation/buildSystem.js

# Prepack (npm publish preparation)
pnpm run prepack
# Executes: svelte-kit sync && svelte-package && pnpm run build:cli && publint
```

### Build Phase Breakdown

```
Build Order:
1. svelte-kit sync     → Generate SvelteKit types (.svelte-kit/)
2. vite build          → Build SDK with Vite
3. svelte-package      → Prepare npm package (dist/)
4. tsc --project ...   → Compile CLI TypeScript (dist/cli/)
5. publint             → Validate package exports
```

### Package Configuration

```json
{
  "name": "@juspay/neurolink",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "svelte": "./dist/index.js",

  "bin": {
    "neurolink": "./dist/cli/index.js"
  },

  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "svelte": "./dist/index.js",
      "import": "./dist/index.js",
      "default": "./dist/index.js"
    },
    "./types": {
      "types": "./dist/types/sdkTypes.d.ts",
      "import": "./dist/types/sdkTypes.js"
    },
    "./cli": {
      "types": "./dist/cli/index.d.ts",
      "import": "./dist/cli/index.js"
    },
    "./package.json": "./package.json"
  },

  "files": [
    "dist",
    "!dist/**/*.test.*",
    "!dist/**/*.spec.*",
    "!dist/**/*.map",
    "README.md",
    "CHANGELOG.md",
    "LICENSE"
  ],

  "engines": {
    "node": ">=20.18.1",
    "npm": ">=10.0.0",
    "pnpm": ">=8.0.0"
  }
}
```

### Output Structure Details

```
dist/
├── index.js                 # Main SDK entry (ESM)
├── index.d.ts               # SDK type definitions
├── neurolink.js             # Core NeuroLink class
├── neurolink.d.ts           # Core type definitions
├── cli/                     # CLI compiled output
│   ├── index.js             # CLI entry (executable)
│   ├── index.d.ts
│   ├── commands/            # Command implementations
│   │   ├── generate.js
│   │   ├── config.js
│   │   └── ...
│   ├── factories/           # Command factories
│   └── loop/                # Interactive session
├── lib/                     # Library modules
│   ├── neurolink.js
│   └── ...
├── providers/               # AI provider implementations
│   ├── openAI.js
│   ├── anthropic.js
│   ├── googleAiStudio.js
│   └── ...
├── adapters/                # Provider adapters
├── mcp/                     # MCP integration
├── types/                   # Type definitions (28+ files)
│   ├── index.d.ts
│   ├── providers.d.ts
│   ├── generateTypes.d.ts
│   └── ...
├── utils/                   # Utility functions
└── [other modules...]
```

---

## 3. TypeScript Configuration

### Configuration Hierarchy

```
tsconfig.json (Main - SDK)
    │
    └── tsconfig.cli.json (CLI - extends main)
```

### Main Configuration (tsconfig.json)

**File:** `/tsconfig.json`

```json
{
  "extends": "./.svelte-kit/tsconfig.json",
  "compilerOptions": {
    // JavaScript interop
    "allowJs": true,
    "checkJs": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,

    // Strict type checking
    "strict": true,
    "noImplicitReturns": true,
    "forceConsistentCasingInFileNames": true,

    // Build settings
    "skipLibCheck": true,
    "sourceMap": true,

    // Type definitions
    "types": ["vite/client", "@sveltejs/kit", "vitest/globals", "node"]
  },
  "exclude": ["action-dist"]
}
```

**Key characteristics:**

- Extends SvelteKit-generated config for SDK compatibility
- Enables strict mode for type safety
- Includes Vite, SvelteKit, Vitest, and Node.js types
- Source maps for debugging

### CLI Configuration (tsconfig.cli.json)

**File:** `/tsconfig.cli.json`

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    // Enable emission (override noEmit from main)
    "noEmit": false,

    // Node.js ESM module system
    "module": "NodeNext",
    "moduleResolution": "NodeNext",

    // Output configuration
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,

    // CLI-specific types (no Vite/Svelte)
    "types": ["node"],

    // Path aliases for SvelteKit compatibility
    "baseUrl": ".",
    "paths": {
      "$lib": ["./src/lib"],
      "$lib/*": ["./src/lib/*"],
      "*": ["src/types/*"]
    }
  },
  "include": ["src/cli/**/*.ts", "src/lib/**/*.ts"],
  "exclude": ["test", "**/*.test.ts", "**/*.spec.ts", "node_modules", "dist"]
}
```

**Key differences from main config:**

- `noEmit: false` - Enables TypeScript output
- `module: NodeNext` - Node.js native ESM support
- `moduleResolution: NodeNext` - Modern module resolution
- `declaration: true` - Generates `.d.ts` files
- Includes both CLI and lib sources

### Configuration Comparison

| Setting          | tsconfig.json (SDK)            | tsconfig.cli.json (CLI) |
| ---------------- | ------------------------------ | ----------------------- |
| extends          | .svelte-kit/tsconfig           | ./tsconfig.json         |
| noEmit           | true (inherited)               | false                   |
| module           | ESNext (inherited)             | NodeNext                |
| moduleResolution | Bundler (inherited)            | NodeNext                |
| outDir           | - (no emit)                    | ./dist                  |
| declaration      | -                              | true                    |
| types            | vite, svelte-kit, vitest, node | node                    |

### Module Resolution Evolution

The project evolved from `moduleResolution: "bundler"` to `moduleResolution: "NodeNext"`:

```
Phase 1 (2025-06): bundler resolution
┌─────────────────────────────────────────┐
│ moduleResolution: "bundler"             │
│ - Worked with Vite bundler              │
│ - Required explicit .js extensions      │
│ - Some ESM interop issues               │
└─────────────────────────────────────────┘

Phase 2 (2025-08): NodeNext resolution
┌─────────────────────────────────────────┐
│ moduleResolution: "NodeNext"            │
│ - Native Node.js ESM support            │
│ - Better package.json exports handling  │
│ - Fixed ESM interop issues              │
└─────────────────────────────────────────┘
```

### Path Alias Configuration

```json
{
  "paths": {
    "$lib": ["./src/lib"],
    "$lib/*": ["./src/lib/*"],
    "*": ["src/types/*"]
  }
}
```

**Purpose:**

- `$lib` - SvelteKit convention for library imports
- `$lib/*` - Wildcard for nested imports
- `*` - Global type resolution

### Type Checking Commands

```bash
# Full type check (SDK + Svelte)
pnpm run check
# Executes: svelte-kit sync && svelte-check --tsconfig ./tsconfig.json && tsc --noEmit --strict

# Watch mode
pnpm run check:watch
# Executes: svelte-kit sync && svelte-check --tsconfig ./tsconfig.json --watch

# CLI-only type check
tsc --noEmit --project tsconfig.cli.json
```

---

## 4. Release Automation

### Semantic Release Configuration

**File:** `/.releaserc.json`

```json
{
  "branches": ["release"],
  "plugins": [
    [
      "@semantic-release/commit-analyzer",
      {
        "preset": "conventionalcommits",
        "releaseRules": [
          { "type": "feat", "release": "minor" },
          { "type": "fix", "release": "patch" },
          { "type": "perf", "release": "patch" },
          { "type": "revert", "release": "patch" },
          { "type": "docs", "release": false },
          { "type": "style", "release": false },
          { "type": "refactor", "release": "patch" },
          { "type": "test", "release": false },
          { "type": "build", "release": "patch" },
          { "type": "ci", "release": false },
          { "type": "chore", "release": false },
          { "breaking": true, "release": "major" }
        ],
        "parserOpts": {
          "headerPattern": "^(?:\\w+-\\d+:\\s*)?(\\w+!?)(\\([\\w\\$\\.\\-\\*\\s]*\\))?\\s*:(.*)$",
          "headerCorrespondence": ["type", "scope", "subject"],
          "noteKeywords": ["BREAKING CHANGE", "BREAKING CHANGES", "BREAKING"]
        }
      }
    ],
    [
      "@semantic-release/release-notes-generator",
      {
        "preset": "conventionalcommits",
        "parserOpts": {
          "headerPattern": "^(?:\\w+-\\d+:\\s*)?(\\w+!?)(\\([\\w\\$\\.\\-\\*\\s]*\\))?\\s*:(.*)$",
          "headerCorrespondence": ["type", "scope", "subject"],
          "noteKeywords": ["BREAKING CHANGE", "BREAKING CHANGES", "BREAKING"]
        }
      }
    ],
    "@semantic-release/changelog",
    "./scripts/semantic-release-format-plugin.cjs",
    [
      "@semantic-release/npm",
      {
        "npmPublish": true,
        "provenance": true
      }
    ],
    "@semantic-release/github",
    [
      "@semantic-release/git",
      {
        "assets": ["CHANGELOG.md", "package.json"],
        "message": "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}"
      }
    ]
  ]
}
```

### Release Rules Summary

| Commit Type     | Version Bump  | Triggers Release |
| --------------- | ------------- | ---------------- |
| `feat`          | MINOR (1.x.0) | Yes              |
| `fix`           | PATCH (1.0.x) | Yes              |
| `perf`          | PATCH         | Yes              |
| `revert`        | PATCH         | Yes              |
| `refactor`      | PATCH         | Yes              |
| `build`         | PATCH         | Yes              |
| `docs`          | -             | No               |
| `style`         | -             | No               |
| `test`          | -             | No               |
| `ci`            | -             | No               |
| `chore`         | -             | No               |
| BREAKING CHANGE | MAJOR (x.0.0) | Yes              |

### Commit Message Format

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

**With ticket prefix (optional):**

```
BZ-43203: feat(core): add new authentication flow
JIRA-1234: fix(api): resolve null pointer exception
```

**Examples:**

```bash
# Valid commits
feat(auth): add OAuth2 authentication flow
fix(api): resolve null pointer exception in user service
docs(readme): update installation instructions
perf(providers): optimize API request batching

# Breaking change
feat(api)!: redesign authentication system

BREAKING CHANGE: The authentication API has been completely redesigned.
Old tokens are no longer valid.
```

### Release Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Release Process                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Push to 'release' branch                                 │
│         │                                                    │
│         ▼                                                    │
│  2. CI/CD runs tests and builds                              │
│         │                                                    │
│         ▼                                                    │
│  3. Semantic-release analyzes commits                        │
│         │                                                    │
│         ▼                                                    │
│  4. Version bump determined (major/minor/patch)              │
│         │                                                    │
│         ├─────────────────────────────────────┐              │
│         ▼                                     ▼              │
│  5a. Update CHANGELOG.md              5b. Update package.json│
│         │                                     │              │
│         ├─────────────────────────────────────┘              │
│         ▼                                                    │
│  6. Publish to npm (with provenance via OIDC)                │
│         │                                                    │
│         ▼                                                    │
│  7. Create GitHub Release                                    │
│         │                                                    │
│         ▼                                                    │
│  8. Publish to GitHub Packages                               │
│         │                                                    │
│         ▼                                                    │
│  9. Update major version tag (v8 → v8.37.0)                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Changeset Configuration

**File:** `/.changeset/config.json`

```json
{
  "changelog": ["@changesets/changelog-github", { "repo": "juspay/neurolink" }],
  "commit": false,
  "access": "public",
  "baseBranch": "release",
  "updateInternalDependencies": "patch",
  "ignore": [
    "docs/**",
    "test/**",
    "examples/**",
    "memory-bank/**",
    "neurolink-demo/**",
    "scripts/**",
    "tools/**"
  ]
}
```

### Manual Changeset Flow

```bash
# Create a changeset
pnpm changeset

# Apply changesets to version
pnpm changeset:version

# Publish with changesets
pnpm changeset publish
```

---

## 5. CI/CD Pipeline

### Workflow Overview

| Workflow         | File                   | Trigger            | Purpose                  |
| ---------------- | ---------------------- | ------------------ | ------------------------ |
| CI               | `ci.yml`               | Push/PR to release | Tests, linting, building |
| Release          | `release.yml`          | Push to release    | Publish to npm/GitHub    |
| Update Major Tag | `update-major-tag.yml` | Release published  | Update vX tag            |
| Docs             | `docs.yml`             | Various            | Documentation deployment |

### CI Workflow Jobs

**File:** `/.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [release]
  pull_request:
    branches: [release]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [20]
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup PNPM
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: "pnpm"

      - name: Install ffmpeg
        uses: AnimMouse/setup-ffmpeg@v1

      - name: Install dependencies
        run: pnpm install

      - name: SvelteKit Sync
        run: pnpm exec svelte-kit sync

      - name: Check code formatting
        run: pnpm run format:check

      - name: Run linting
        run: |
          npx eslint src/ --max-warnings=300
          npx eslint test/ --max-warnings=10

      - name: Security & Environment Validation
        run: pnpm run validate:all

      - name: Build package
        run: pnpm run build

      - name: Test CLI build
        run: |
          pnpm run build:cli
          node dist/cli/index.js --help

  build-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "pnpm"
      - run: pnpm install
      - run: pnpm exec svelte-kit sync
      - name: Check package build
        run: pnpm run prepack
      - name: Verify package contents
        run: |
          pnpm pack
          ls -la dist/

  quality-gate:
    runs-on: ubuntu-latest
    name: Code Quality & Security Gate
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "pnpm"
      - run: pnpm install
      - run: pnpm exec svelte-kit sync
      - name: Build Validation
        run: pnpm run validate
      - name: Commit Message Validation
        run: |
          COMMIT_MSG=$(git log -1 --pretty=format:"%s")
          node scripts/commit-validation.cjs "$COMMIT_MSG"
      - name: Environment Validation
        run: pnpm run validate:env
      - name: Security Validation
        run: pnpm run validate:security
      - name: TypeScript Compiler Check
        run: npx tsc --noEmit --strict --project tsconfig.json
      - name: Code Coverage Analysis
        run: pnpm run test:run --coverage
        continue-on-error: true

  semantic-release-validation:
    runs-on: ubuntu-latest
    needs: [test, build-check]
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "pnpm"
      - run: pnpm install
      - name: Validate semantic-release configuration
        run: npx semantic-release --dry-run
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Release Workflow

**File:** `/.github/workflows/release.yml`

```yaml
name: Release and Publish

on:
  push:
    branches:
      - release

permissions:
  contents: write
  packages: write
  issues: write
  pull-requests: write
  id-token: write # Required for npm provenance (OIDC)

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: "18"
          cache: "pnpm"
      - uses: AnimMouse/setup-ffmpeg@v1
      - run: pnpm install
      - run: pnpm run build

  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      packages: write
      issues: write
      pull-requests: write
      id-token: write # OIDC authentication
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          token: ${{ secrets.GITHUB_TOKEN }}

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          registry-url: "https://registry.npmjs.org"
          cache: "pnpm"

      - uses: AnimMouse/setup-ffmpeg@v1

      - name: Upgrade npm for OIDC support
        run: npm install -g npm@latest

      - run: pnpm install
      - run: pnpm run build
      - run: pnpm run build:action

      - name: Release with semantic-release
        run: npx semantic-release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          HUSKY: "0" # Disable git hooks during release

      - name: Setup Node for GitHub Packages
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          registry-url: "https://npm.pkg.github.com"
          scope: "@juspay"

      - name: Publish to GitHub Packages
        run: |
          pnpm publish --access public --no-git-checks --registry https://npm.pkg.github.com
        env:
          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### CI Pipeline Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     CI Pipeline                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Push/PR to release branch                                   │
│         │                                                    │
│         ▼                                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                    test job                           │   │
│  │  • Checkout → Setup PNPM/Node → Install deps         │   │
│  │  • SvelteKit Sync → Format check → Linting           │   │
│  │  • validate:all → Build → CLI build test             │   │
│  └──────────────────────────────────────────────────────┘   │
│         │                                                    │
│         ├─────────────────────────────────────┐              │
│         ▼                                     ▼              │
│  ┌────────────────┐                  ┌────────────────┐     │
│  │  build-check   │                  │  quality-gate  │     │
│  │  • prepack     │                  │  • validate    │     │
│  │  • pnpm pack   │                  │  • commit msg  │     │
│  │  • verify dist │                  │  • security    │     │
│  └────────────────┘                  │  • TypeScript  │     │
│         │                            │  • coverage    │     │
│         │                            └────────────────┘     │
│         │                                     │              │
│         ├─────────────────────────────────────┘              │
│         ▼                                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         semantic-release-validation                   │   │
│  │  • Dry-run semantic-release                          │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. OIDC Publishing

### Overview

OIDC (OpenID Connect) trusted publishing eliminates the need for long-lived npm tokens by using GitHub's OIDC provider for authentication.

### Evolution

```
Phase 1: Token-based Publishing
┌─────────────────────────────────────────┐
│ NPM_TOKEN secret in GitHub             │
│ • Long-lived token (security risk)     │
│ • Manual rotation required             │
│ • No provenance attestation            │
└─────────────────────────────────────────┘

Phase 2: OIDC Trusted Publishing
┌─────────────────────────────────────────┐
│ OIDC authentication via GitHub         │
│ • No stored secrets                    │
│ • Automatic token rotation             │
│ • Provenance attestations included     │
│ • Supply chain security                │
└─────────────────────────────────────────┘
```

### Configuration Requirements

**1. GitHub Actions Permissions:**

```yaml
permissions:
  id-token: write # Required for OIDC authentication
  contents: write
  packages: write
```

**2. npm Upgrade Step:**

```yaml
- name: Upgrade npm for OIDC support
  run: npm install -g npm@latest
```

**3. semantic-release/npm Configuration:**

```json
[
  "@semantic-release/npm",
  {
    "npmPublish": true,
    "provenance": true
  }
]
```

**4. npm Registry Setup:**

Configure trusted publishing in npm at https://www.npmjs.com/settings/USERNAME/packages

**5. Package Configuration:**

```json
{
  "publishConfig": {
    "access": "public",
    "provenance": true
  }
}
```

### Benefits

| Aspect            | Token-based       | OIDC                    |
| ----------------- | ----------------- | ----------------------- |
| Secret Management | Manual            | None required           |
| Token Rotation    | Manual            | Automatic               |
| Provenance        | Not supported     | Automatic attestation   |
| Security          | Long-lived tokens | Short-lived, scoped     |
| Audit Trail       | Limited           | Full GitHub → npm chain |

### Provenance Verification

Published packages include provenance information visible on npm:

```
Package: @juspay/neurolink@8.37.0
Provenance:
  Source: github.com/juspay/neurolink
  Workflow: .github/workflows/release.yml
  Build: https://github.com/juspay/neurolink/actions/runs/XXXXX
```

---

## 7. Validation Scripts

### Build Validations

**File:** `/scripts/build-validations.cjs`

```javascript
class NeuroLinkBuildValidator {
  run() {
    this.checkProjectStructure(); // Verify required directories
    this.checkConsoleStatements(); // No console.log in production
    this.checkApiKeyLeaks(); // Security scan for secrets
    this.validatePackageJson(); // Package configuration
    this.checkErrorHandling(); // Proper error handling
    this.checkTodoReferences(); // TODOs have issue references
    this.checkEnvironmentConfig(); // Environment variables documented
  }
}
```

**Usage:**

```bash
pnpm run validate
```

### Commit Message Validation

**File:** `/scripts/commit-validation.cjs`

**Format:** `<type>(<scope>): <description>`

**Allowed Types:**

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Code style
- `refactor` - Code refactoring
- `test` - Tests
- `chore` - Maintenance
- `perf` - Performance
- `ci` - CI/CD
- `build` - Build system
- `revert` - Revert commit
- `wip` - Work in progress
- `hotfix` - Critical fix

**Usage:**

```bash
pnpm run validate:commit "feat(auth): add OAuth2 flow"
```

### Environment Validation

**File:** `/scripts/env-validation.cjs`

- Validates `.env.example` completeness
- Checks API key format patterns
- Validates provider configurations
- Ensures environment consistency

**Usage:**

```bash
pnpm run validate:env
```

### Security Validation

**File:** `/scripts/security-check.cjs`

- Professional secret detection (Gitleaks integration)
- Dependency vulnerability scanning (pnpm audit)
- License compliance checking
- Security best practices validation

**Usage:**

```bash
pnpm run validate:security
```

### All Validations

```bash
# Run all validations
pnpm run validate:all

# Individual validations
pnpm run validate           # Build validations
pnpm run validate:env       # Environment validation
pnpm run validate:security  # Security validation
pnpm run validate:commit    # Commit message validation
```

### Quality Metrics

**File:** `/scripts/quality-metrics.cjs`

Collects and reports code quality metrics:

- Lines of code
- Cyclomatic complexity
- Test coverage
- Documentation coverage

**Usage:**

```bash
pnpm run quality:metrics
pnpm run quality:report
```

---

## 8. Build Templates

### New Build Script Template

**package.json:**

```json
{
  "scripts": {
    "build:<target>": "pnpm run <prerequisite> && <build-command> && pnpm run <post-process>",
    "build:<target>:dev": "pnpm run build:<target> --watch"
  }
}
```

**Example:**

```json
{
  "scripts": {
    "build:worker": "pnpm run check && esbuild src/worker/index.ts --bundle --outdir=dist/worker && pnpm run validate",
    "build:worker:dev": "pnpm run build:worker --watch"
  }
}
```

### New CI Job Template

```yaml
new-job:
  runs-on: ubuntu-latest
  needs: [prerequisite-job] # If dependent
  steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup PNPM
      uses: pnpm/action-setup@v4
      with:
        version: 9

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: "20"
        cache: "pnpm"

    - name: Install dependencies
      run: pnpm install

    - name: SvelteKit Sync
      run: pnpm exec svelte-kit sync

    - name: Run custom step
      run: pnpm run <your-command>
```

### New Validation Script Template

**File:** `/scripts/new-validation.cjs`

```javascript
#!/usr/bin/env node

class NewValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.startTime = Date.now();
  }

  log(message, type = "info") {
    const prefix =
      type === "error" ? "[ERROR]" : type === "warn" ? "[WARN]" : "[INFO]";
    console.log(`${prefix} ${message}`);
  }

  validateSomething() {
    this.log("Checking something...");
    // Validation logic
    // this.errors.push('Error message');
    // this.warnings.push('Warning message');
  }

  run() {
    console.log("Starting validation...\n");

    this.validateSomething();
    // Add more validations

    // Print summary
    console.log("\n--- Validation Summary ---");
    console.log(`Errors: ${this.errors.length}`);
    console.log(`Warnings: ${this.warnings.length}`);
    console.log(`Duration: ${Date.now() - this.startTime}ms`);

    if (this.errors.length > 0) {
      console.log("\nVALIDATION FAILED");
      this.errors.forEach((e) => console.log(`  - ${e}`));
      process.exit(1);
    }

    console.log("\nValidation passed!");
  }
}

if (require.main === module) {
  new NewValidator().run();
}

module.exports = NewValidator;
```

### TypeScript Configuration Template for SDK

**tsconfig.sdk.json:**

```json
{
  "extends": "./.svelte-kit/tsconfig.json",
  "compilerOptions": {
    "allowJs": true,
    "checkJs": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "sourceMap": true,
    "strict": true,
    "noImplicitReturns": true,
    "allowSyntheticDefaultImports": true,
    "types": ["vite/client", "@sveltejs/kit", "vitest/globals", "node"]
  },
  "include": ["src/lib/**/*.ts"],
  "exclude": ["node_modules", "dist", "action-dist"]
}
```

### TypeScript Configuration Template for CLI

**tsconfig.cli.json:**

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": false,
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "types": ["node"],
    "baseUrl": ".",
    "paths": {
      "$lib": ["./src/lib"],
      "$lib/*": ["./src/lib/*"]
    }
  },
  "include": ["src/cli/**/*.ts", "src/lib/**/*.ts"],
  "exclude": ["test", "**/*.test.ts", "**/*.spec.ts", "node_modules", "dist"]
}
```

### Package Export Template

When adding new package exports:

```json
{
  "exports": {
    // Existing exports...

    "./<new-module>": {
      "types": "./dist/<path>/<module>.d.ts",
      "import": "./dist/<path>/<module>.js",
      "default": "./dist/<path>/<module>.js"
    }
  }
}
```

**Example:**

```json
{
  "exports": {
    "./mcp": {
      "types": "./dist/mcp/index.d.ts",
      "import": "./dist/mcp/index.js",
      "default": "./dist/mcp/index.js"
    }
  }
}
```

### Release Workflow Template

```yaml
name: Release Package

on:
  push:
    branches: [release]

permissions:
  contents: write
  packages: write
  id-token: write

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          registry-url: "https://registry.npmjs.org"
          cache: "pnpm"

      - name: Upgrade npm for OIDC
        run: npm install -g npm@latest

      - run: pnpm install
      - run: pnpm run build

      - name: Release
        run: npx semantic-release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          HUSKY: "0"
```

---

## Quick Reference

### Essential Commands

```bash
# Full build
pnpm run build

# CLI only (fast iteration)
pnpm run build:cli

# Type checking
pnpm run check

# All validations
pnpm run validate:all

# Release dry-run
pnpm run release:dry-run

# Test with coverage
pnpm run test:coverage
```

### Key Files

| File                            | Purpose                           |
| ------------------------------- | --------------------------------- |
| `package.json`                  | Package configuration and scripts |
| `vite.config.ts`                | Vite/Vitest configuration         |
| `svelte.config.js`              | SvelteKit configuration           |
| `tsconfig.json`                 | Main TypeScript configuration     |
| `tsconfig.cli.json`             | CLI TypeScript configuration      |
| `.releaserc.json`               | Semantic-release configuration    |
| `.changeset/config.json`        | Changeset configuration           |
| `.github/workflows/ci.yml`      | CI pipeline                       |
| `.github/workflows/release.yml` | Release pipeline                  |
| `scripts/build-validations.cjs` | Build validation script           |
| `scripts/commit-validation.cjs` | Commit message validation         |
| `scripts/env-validation.cjs`    | Environment validation            |
| `scripts/security-check.cjs`    | Security validation               |

### Build Checklist

Before release:

- [ ] `pnpm run check` passes
- [ ] `pnpm run lint` passes
- [ ] `pnpm run format:check` passes
- [ ] `pnpm run validate:all` passes
- [ ] `pnpm run build` succeeds
- [ ] `pnpm run test` passes
- [ ] Commit messages follow conventions
- [ ] CHANGELOG is updated (automatic with semantic-release)

---

## Summary

NeuroLink's build system provides:

1. **Dual Build Architecture**: Separate SDK and CLI builds from single codebase
2. **Strong Type Safety**: Strict TypeScript with separate configs for different targets
3. **Automated Release**: Semantic versioning with changelog generation
4. **Quality Gates**: Multiple validation layers in CI/CD
5. **Modern Security**: OIDC trusted publishing without stored secrets
6. **Comprehensive Validation**: Build rules, commit format, environment, and security checks

When modifying the build system:

- Test changes locally with `--dry-run`
- Validate with `pnpm run validate:all`
- Follow existing patterns and conventions
- Update documentation as needed
