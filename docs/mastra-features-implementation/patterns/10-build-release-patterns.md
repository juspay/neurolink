# Build and Release Patterns

## Overview

This document provides a comprehensive analysis of NeuroLink's build system, release process, and related patterns. Understanding these patterns is essential for maintaining consistency when adding new features or modifying the build pipeline.

## Table of Contents

1. [Build System Architecture](#build-system-architecture)
2. [Package Configuration](#package-configuration)
3. [TypeScript Configuration](#typescript-configuration)
4. [Build Targets and Scripts](#build-targets-and-scripts)
5. [Release Process](#release-process)
6. [CI/CD Pipeline](#cicd-pipeline)
7. [Validation System](#validation-system)
8. [Version Management](#version-management)
9. [Best Practices](#best-practices)
10. [Templates](#templates)

---

## Build System Architecture

### Dual Build Pipeline

NeuroLink employs a dual build pipeline that produces both an SDK and a CLI:

```
┌─────────────────────────────────────────────────────────────┐
│                    Build Pipeline                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐   │
│  │   Source    │────▶│  Vite/Kit   │────▶│  SDK Build  │   │
│  │   src/lib   │     │   Build     │     │   dist/     │   │
│  └─────────────┘     └─────────────┘     └─────────────┘   │
│                                                              │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐   │
│  │   Source    │────▶│  TypeScript │────▶│  CLI Build  │   │
│  │   src/cli   │     │  Compiler   │     │  dist/cli/  │   │
│  └─────────────┘     └─────────────┘     └─────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Build Tools Stack

| Tool               | Purpose                              | Configuration                        |
| ------------------ | ------------------------------------ | ------------------------------------ |
| **Vite**           | SDK bundling and development server  | `vite.config.ts`                     |
| **SvelteKit**      | Package building and type generation | `svelte.config.js`                   |
| **TypeScript**     | Type checking and CLI compilation    | `tsconfig.json`, `tsconfig.cli.json` |
| **svelte-package** | NPM package preparation              | Part of prepack                      |
| **publint**        | Package validation                   | Called in prepack                    |
| **ncc**            | GitHub Action bundling               | `build:action` script                |

### Output Structure

```
dist/
├── index.js                 # Main SDK entry point
├── index.d.ts               # SDK type definitions
├── neurolink.js             # Core NeuroLink class
├── neurolink.d.ts           # Core type definitions
├── cli/                     # CLI compiled output
│   ├── index.js             # CLI entry point (executable)
│   ├── index.d.ts
│   ├── commands/            # CLI command implementations
│   ├── factories/           # Command factories
│   ├── loop/                # Interactive session
│   └── utils/               # CLI utilities
├── lib/                     # Library modules
├── providers/               # AI provider implementations
├── adapters/                # Provider adapters
├── mcp/                     # MCP integration
├── types/                   # Type definitions (28+ files)
├── utils/                   # Utility functions
└── [other modules...]
```

---

## Package Configuration

### Package.json Structure

**File:** `/Users/sachinsharma/Developer/temp/neurolink-fork/neurolink/package.json`

```json
{
  "name": "@juspay/neurolink",
  "version": "8.37.0",
  "type": "module",

  // Entry Points
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "svelte": "./dist/index.js",

  // CLI Binary
  "bin": {
    "neurolink": "./dist/cli/index.js"
  },

  // Module Exports (ESM)
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

  // Files to include in npm package
  "files": [
    "dist",
    "!dist/**/*.test.*",
    "!dist/**/*.spec.*",
    "!dist/**/*.map",
    "README.md",
    "CHANGELOG.md",
    "LICENSE"
  ],

  // Engine requirements
  "engines": {
    "node": ">=20.18.1",
    "npm": ">=10.0.0",
    "pnpm": ">=8.0.0"
  },

  // Supported platforms
  "os": ["darwin", "linux", "win32"]
}
```

### Key Configuration Decisions

1. **ESM-Only**: The package uses `"type": "module"` for native ES modules
2. **Conditional Exports**: Supports types, Svelte, and standard import paths
3. **Binary CLI**: Exposes `neurolink` command via bin field
4. **Source Map Exclusion**: Production builds exclude `.map` files
5. **Test File Exclusion**: Test files are not included in the package

---

## TypeScript Configuration

### Main Configuration (tsconfig.json)

**File:** `/Users/sachinsharma/Developer/temp/neurolink-fork/neurolink/tsconfig.json`

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
  "exclude": ["action-dist"]
}
```

### CLI-Specific Configuration (tsconfig.cli.json)

**File:** `/Users/sachinsharma/Developer/temp/neurolink-fork/neurolink/tsconfig.cli.json`

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
    "types": ["node"],
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

### Configuration Strategy

1. **Inheritance**: CLI config extends main config for consistency
2. **Module System**: Uses NodeNext for Node.js native ESM support
3. **Path Aliases**: Maintains `$lib` alias for SvelteKit compatibility
4. **Declaration Files**: CLI build generates `.d.ts` files
5. **Strict Mode**: Both configs enforce strict TypeScript checking

---

## Build Targets and Scripts

### Core Build Scripts

```bash
# Primary build commands
pnpm run build          # Full build (SDK + CLI)
pnpm run build:cli      # CLI only (rapid testing)
pnpm run build:action   # GitHub Action bundle
pnpm run build:complete # Complete pipeline with validation

# Build breakdown
"build": "vite build && pnpm run prepack"
"build:cli": "svelte-kit sync && tsc --project tsconfig.cli.json && pnpm link --global"
"build:action": "ncc build src/action/index.ts -o action-dist --source-map"
"prepack": "svelte-kit sync && svelte-package && pnpm run build:cli && publint"
```

### Build Phase Breakdown

| Phase        | Command                           | Purpose                      |
| ------------ | --------------------------------- | ---------------------------- |
| 1. Sync      | `svelte-kit sync`                 | Generate SvelteKit types     |
| 2. SDK Build | `vite build`                      | Bundle SDK with Vite         |
| 3. Package   | `svelte-package`                  | Prepare NPM package          |
| 4. CLI Build | `tsc --project tsconfig.cli.json` | Compile CLI TypeScript       |
| 5. Validate  | `publint`                         | Verify package configuration |

### Comprehensive Build System

The `tools/automation/buildSystem.js` provides an advanced build orchestration system:

```javascript
// Build phases in order
const phases = [
  { name: "environment", title: "Environment Setup & Validation" },
  { name: "analysis", title: "Project Analysis & Cleanup" },
  { name: "testing", title: "Adaptive Testing & Validation" },
  { name: "documentation", title: "Documentation Sync & Generation" },
  { name: "content", title: "Content Generation & Optimization" },
  { name: "build", title: "Core Build & Package" },
  { name: "quality", title: "Quality Assurance & Optimization" },
];
```

**Build Targets:**

```bash
# Available targets
node tools/automation/buildSystem.js build fast       # Quick build
node tools/automation/buildSystem.js build quality    # With quality checks
node tools/automation/buildSystem.js build content    # Content-focused
node tools/automation/buildSystem.js build complete   # Full pipeline

# Options
--dry-run           # Preview without executing
--verbose           # Detailed output
--skip-optional     # Skip non-required phases
--force-rebuild     # Force rebuild even if cached
```

---

## Release Process

### Semantic Release Configuration

**File:** `/Users/sachinsharma/Developer/temp/neurolink-fork/neurolink/.releaserc.json`

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
        ]
      }
    ],
    [
      "@semantic-release/release-notes-generator",
      {
        "preset": "conventionalcommits"
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
        "message": "chore(release): ${nextRelease.version} [skip ci]"
      }
    ]
  ]
}
```

### Release Rules Summary

| Commit Type     | Version Bump | Triggers Release |
| --------------- | ------------ | ---------------- |
| `feat`          | MINOR        | Yes              |
| `fix`           | PATCH        | Yes              |
| `perf`          | PATCH        | Yes              |
| `revert`        | PATCH        | Yes              |
| `refactor`      | PATCH        | Yes              |
| `build`         | PATCH        | Yes              |
| `docs`          | -            | No               |
| `style`         | -            | No               |
| `test`          | -            | No               |
| `ci`            | -            | No               |
| `chore`         | -            | No               |
| BREAKING CHANGE | MAJOR        | Yes              |

### Changeset Configuration

**File:** `/Users/sachinsharma/Developer/temp/neurolink-fork/neurolink/.changeset/config.json`

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
│  4. Version bump (if needed)                                 │
│         │                                                    │
│         ├─────────────────────────────────────┐              │
│         ▼                                     ▼              │
│  5a. Update CHANGELOG.md              5b. Update package.json│
│         │                                     │              │
│         ├─────────────────────────────────────┘              │
│         ▼                                                    │
│  6. Publish to npm (with provenance)                         │
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

---

## CI/CD Pipeline

### Workflow Files

| Workflow         | File                   | Trigger            | Purpose                  |
| ---------------- | ---------------------- | ------------------ | ------------------------ |
| CI               | `ci.yml`               | Push/PR to release | Tests, linting, building |
| Release          | `release.yml`          | Push to release    | Publish to npm/GitHub    |
| Update Major Tag | `update-major-tag.yml` | Release published  | Update vX tag            |
| Docs             | `docs.yml`             | Various            | Documentation deployment |

### CI Workflow Jobs

**File:** `/Users/sachinsharma/Developer/temp/neurolink-fork/neurolink/.github/workflows/ci.yml`

```yaml
jobs:
  test:
    # Run tests, linting, validation
    steps:
      - Checkout code
      - Setup PNPM (v9)
      - Setup Node.js (v20)
      - Install ffmpeg
      - Install dependencies
      - SvelteKit Sync
      - Check code formatting
      - Run linting
      - Security & Environment Validation
      - Build package
      - Test CLI build

  build-check:
    # Verify package builds correctly
    steps:
      - Run prepack
      - Verify package contents (pnpm pack)

  quality-gate:
    # Code quality and security checks
    steps:
      - Build Validation
      - Commit Message Validation
      - Environment Validation
      - Security Validation
      - ESLint Quality Report
      - TypeScript Compiler Check
      - Code Coverage Analysis

  semantic-release-validation:
    # Validate release configuration
    needs: [test, build-check]
    steps:
      - Dry-run semantic-release
```

### Release Workflow

**File:** `/Users/sachinsharma/Developer/temp/neurolink-fork/neurolink/.github/workflows/release.yml`

```yaml
on:
  push:
    branches: [release]

permissions:
  contents: write
  packages: write
  issues: write
  pull-requests: write
  id-token: write # Required for npm provenance

jobs:
  test:
    # Pre-release validation

  release:
    steps:
      - Checkout (fetch-depth: 0)
      - Setup PNPM (v9)
      - Setup Node.js (v20)
      - Install ffmpeg
      - Upgrade npm for OIDC
      - Install dependencies
      - Build package
      - Build GitHub Action
      - Release with semantic-release
      - Publish to GitHub Packages
```

---

## Validation System

### Build Validations

**File:** `/Users/sachinsharma/Developer/temp/neurolink-fork/neurolink/scripts/build-validations.cjs`

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

### Commit Message Validation

**File:** `/Users/sachinsharma/Developer/temp/neurolink-fork/neurolink/scripts/commit-validation.cjs`

Required format: `<type>(<scope>): <description>`

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

**Examples:**

```bash
# Valid
feat(auth): add OAuth2 authentication flow
fix(api): resolve null pointer exception in user service
docs(readme): update installation instructions

# Invalid
add user authentication           # Missing type and scope
feat: add authentication         # Missing scope
```

### Environment Validation

**File:** `/Users/sachinsharma/Developer/temp/neurolink-fork/neurolink/scripts/env-validation.cjs`

- Validates `.env.example` completeness
- Checks API key format patterns
- Validates provider configurations
- Ensures environment consistency

### Security Validation

**File:** `/Users/sachinsharma/Developer/temp/neurolink-fork/neurolink/scripts/security-check.cjs`

- Professional secret detection (Gitleaks integration)
- Dependency vulnerability scanning (pnpm audit)
- License compliance checking
- Security best practices validation

---

## Version Management

### Semantic Versioning

NeuroLink follows [Semantic Versioning 2.0.0](https://semver.org/):

```
MAJOR.MINOR.PATCH
  │     │     │
  │     │     └── Bug fixes, patches (fix, perf, refactor)
  │     └──────── New features (feat)
  └────────────── Breaking changes
```

### Version Update Flow

1. **Automatic**: Semantic-release analyzes commits
2. **Manual Override**: Use `!` suffix for breaking changes
   ```bash
   feat(api)!: redesign authentication system
   ```
3. **Changeset**: For manual version control
   ```bash
   pnpm changeset
   pnpm changeset:version
   ```

### CHANGELOG Format

**File:** `/Users/sachinsharma/Developer/temp/neurolink-fork/neurolink/CHANGELOG.md`

```markdown
## [8.37.0](https://github.com/juspay/neurolink/compare/v8.36.0...v8.37.0) (2026-01-22)

### Features

- **(security):** Implement token bucket rate limiter for URL downloads ([0e3e779](https://github.com/juspay/neurolink/commit/...))

### Bug Fixes

- **(provider):** add network retry logic with exponential backoff ([3b29e24](https://github.com/juspay/neurolink/commit/...))
```

---

## Best Practices

### Build System Guidelines

1. **Always Run Full Build Before Release**

   ```bash
   pnpm run build:complete
   ```

2. **Use Validation Scripts**

   ```bash
   pnpm run validate:all
   pnpm run check:all
   ```

3. **Follow Commit Conventions**
   - Use semantic commit messages
   - Include scope for all changes
   - Reference issues when applicable

4. **Test CLI Changes Locally**
   ```bash
   pnpm run build:cli
   pnpm run cli <command>
   ```

### Adding New Build Targets

When adding new build targets:

1. **Update package.json scripts**
2. **Add to CI workflow if needed**
3. **Document in CLAUDE.md**
4. **Include in build system phases**

### Release Checklist

- [ ] All tests pass (`pnpm test`)
- [ ] Build succeeds (`pnpm run build`)
- [ ] Linting passes (`pnpm run lint`)
- [ ] Validations pass (`pnpm run validate:all`)
- [ ] Commit messages follow conventions
- [ ] CHANGELOG updates are formatted
- [ ] Version bump is appropriate

---

## Templates

### New Build Script Template

```json
// In package.json scripts
{
  "build:<target>": "pnpm run <prerequisite> && <build-command> && pnpm run <post-process>",
  "build:<target>:dev": "pnpm run build:<target> --watch"
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

```javascript
#!/usr/bin/env node

class NewValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.startTime = Date.now();
  }

  log(message, color = "reset") {
    console.log(`[VALIDATOR] ${message}`);
  }

  // Add validation methods
  validateSomething() {
    this.log("Checking something...");
    // Validation logic
  }

  run() {
    console.log("Starting validation...\n");

    this.validateSomething();
    // Add more validations

    // Print results
    if (this.errors.length > 0) {
      console.log("VALIDATION FAILED");
      process.exit(1);
    }

    console.log("Validation passed!");
  }
}

if (require.main === module) {
  new NewValidator().run();
}

module.exports = NewValidator;
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

---

## Key Files Reference

| File                              | Purpose                           |
| --------------------------------- | --------------------------------- |
| `package.json`                    | Package configuration and scripts |
| `vite.config.ts`                  | Vite/Vitest configuration         |
| `svelte.config.js`                | SvelteKit configuration           |
| `tsconfig.json`                   | Main TypeScript configuration     |
| `tsconfig.cli.json`               | CLI TypeScript configuration      |
| `.releaserc.json`                 | Semantic-release configuration    |
| `.changeset/config.json`          | Changeset configuration           |
| `.github/workflows/ci.yml`        | CI pipeline                       |
| `.github/workflows/release.yml`   | Release pipeline                  |
| `scripts/build-validations.cjs`   | Build validation script           |
| `scripts/commit-validation.cjs`   | Commit message validation         |
| `scripts/env-validation.cjs`      | Environment validation            |
| `scripts/security-check.cjs`      | Security validation               |
| `tools/automation/buildSystem.js` | Complete build system             |

---

## Summary

NeuroLink's build and release system is designed for:

1. **Reliability**: Multiple validation layers ensure quality
2. **Automation**: Semantic versioning and changelog generation
3. **Flexibility**: Multiple build targets for different needs
4. **Security**: Integrated secret detection and dependency scanning
5. **Traceability**: Commit conventions and provenance signing

When modifying the build system, always:

- Test changes locally with `--dry-run`
- Validate with `pnpm run validate:all`
- Follow existing patterns and conventions
- Update documentation as needed
