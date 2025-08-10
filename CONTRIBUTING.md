# Contributing to NeuroLink

Thank you for your interest in contributing to NeuroLink! This document provides guidelines and instructions for contributing to this project.

## Table of Contents

- [Contributing to NeuroLink](#contributing-to-neurolink)
  - [Table of Contents](#table-of-contents)
  - [Code of Conduct](#code-of-conduct)
  - [Getting Started](#getting-started)
  - [Development Setup](#development-setup)
    - [Prerequisites](#prerequisites)
    - [Installation](#installation)
    - [Development Workflow](#development-workflow)
  - [Submitting Changes](#submitting-changes)
  - [Coding Style](#coding-style)
  - [Testing](#testing)
  - [Documentation](#documentation)
  - [Release Process](#release-process)
  - [Questions?](#questions)

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct (to be implemented). Please read the [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) file for details.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally
3. **Add the upstream repository** as a remote to keep your fork in sync:
   ```bash
   git remote add upstream https://github.com/juspay/neurolink.git
   ```
4. **Create a new branch** for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Setup

### Prerequisites

- Node.js (version 18 or higher)
- pnpm (preferred package manager)

### Installation

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Set up environment variables (for local testing):
   Copy `.env.example` to `.env` and add your API keys:
   ```bash
   cp .env.example .env
   ```

### Development Workflow

1. Run the development server:

   ```bash
   pnpm dev
   ```

2. Make your changes

3. Run tests:

   ```bash
   pnpm test
   ```

4. Build the package:
   ```bash
   pnpm build
   ```

## ⚡ Build Rule Enforcement & Quality Standards

NeuroLink enforces **enterprise-grade code quality** with automated validation that runs on every commit. All contributions must pass these quality gates:

### 🔍 **Automated Pre-commit Validation**

When you make a commit, the following checks run automatically:

```bash
# These run automatically via Husky pre-commit hooks:
- ESLint validation (must pass with 0 errors)
- Prettier formatting (auto-fixes)
- Build validation checks
- Security scanning
- Environment validation
- Semantic commit format validation
```

**If any check fails, your commit will be blocked** with clear error messages explaining how to fix the issues.

### 📝 **Required Commit Format**

All commits **must** follow semantic commit conventions with **required scope**:

```bash
# ✅ CORRECT FORMAT:
feat(providers): add LiteLLM integration support
fix(cli): resolve configuration loading issue
docs(readme): update installation instructions
test(providers): add OpenAI provider validation tests

# ❌ INCORRECT (will be blocked):
add new feature        # Missing type and scope
feat: add feature      # Missing required scope
update docs           # Missing type and scope
```

**Required format:** `type(scope): description`

**Valid types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `build`, `ci`, `perf`, `revert`
**Required scope:** Must specify the area of change (providers, cli, docs, etc.)

### 🛡️ **Security & Quality Requirements**

Your code must pass these validation checks:

#### **Security Validation:**

- ✅ No hardcoded API keys or secrets
- ✅ No dependency vulnerabilities (high/critical)
- ✅ Proper .gitignore patterns
- ✅ Environment variables documented in .env.example

#### **Code Quality:**

- ✅ No console.log statements in production code (use logger instead)
- ✅ TypeScript strict mode compliance
- ✅ ESLint rules compliance (0 errors tolerance)
- ✅ Proper error handling patterns
- ✅ TODO/FIXME comments must reference issues

#### **Environment Validation:**

- ✅ All environment variables documented
- ✅ .env.example completeness
- ✅ Configuration consistency checks

### 🚀 **Manual Validation Commands**

Before committing, you can run these commands manually to check your code:

```bash
# Full validation pipeline
pnpm run validate:all

# Individual checks
pnpm run validate          # Build validation
pnpm run validate:env      # Environment checks
pnpm run validate:security # Security scanning
pnpm run validate:commit   # Test commit message format

# Quality metrics
pnpm run quality:metrics   # Get quality score
pnpm run quality:report    # Generate detailed report

# Pre-commit simulation
pnpm run check:all         # Run all pre-commit checks manually
```

### 🔧 **Common Issues & Solutions**

**Commit blocked with semantic format error:**

```bash
# Fix your commit message format
git commit --amend -m "feat(providers): add new provider support"
```

**ESLint errors:**

```bash
# Auto-fix linting issues
pnpm run lint --fix
```

**Security scan failures:**

```bash
# Check for issues and get detailed report
pnpm run validate:security
```

**Console.log detected:**

```bash
# Replace console.log with logger
import { logger } from '../utils/logger.js';
logger.info('Your message here');
```

**Environment variables not documented:**

```bash
# Add missing variables to .env.example with descriptions
MISSING_VAR=example_value  # Description of what this does
```

### 📊 **CI/CD Quality Gates**

All pull requests must pass the CI/CD pipeline which includes:

- ✅ **Validation Job:** All custom validation scripts
- ✅ **Security Audit:** Dependency vulnerability scanning
- ✅ **Build Verification:** TypeScript compilation + CLI testing
- ✅ **Test Coverage:** Comprehensive test suite
- ✅ **AI Code Review:** Automated GitHub Copilot analysis

**Pull requests that fail CI/CD will be blocked from merging.**

### 🎯 **Quality Score Target**

Your contributions should maintain or improve the codebase quality score. Check your impact with:

```bash
pnpm run quality:metrics
```

Target: Maintain score above baseline and ideally improve it.

## Submitting Changes

1. **Commit your changes** following the semantic commit format:

   ```bash
   git commit -m "feat(providers): add support for new provider"
   ```

   **Remember:** All commits must follow the `type(scope): description` format with **required scope** as documented above. The pre-commit hooks will validate this automatically.

2. **Push to your fork**:

   ```bash
   git push origin feature/your-feature-name
   ```

3. **Submit a Pull Request** to the main repository

4. **Address review comments** if any are provided

## Coding Style

This project enforces strict coding standards automatically:

- **TypeScript strict mode** - Type safety is mandatory
- **ESLint v9** - Advanced linting with zero-error tolerance
- **Prettier** - Consistent code formatting (auto-applied)
- **Professional security scanning** - Gitleaks integration for secret detection
- **Build validation** - Custom checks for console statements, API leaks, etc.

**Style enforcement is automatic** via pre-commit hooks. Manual checks:

```bash
pnpm run check:all      # Run all validation checks
pnpm lint              # ESLint validation
pnpm format            # Prettier formatting
```

**Note:** The build rule enforcement system will automatically prevent commits that don't meet quality standards. See the "Build Rule Enforcement & Quality Standards" section above for complete details.

## Testing

Please add tests for any new features or bug fixes. We aim for high test coverage to ensure reliability.

Run tests with:

```bash
pnpm test
```

For mocking AI providers, use the approach in the `test/providers.test.ts` file.

## Documentation

For any new features or changes, please update the relevant documentation:

- README.md for general usage
- JSDoc comments for public APIs
- Code examples where appropriate

## Release Process

The maintainers follow this process for releases:

1. Update version in package.json
2. Update CHANGELOG.md
3. Create a GitHub release
4. Publish to npm

## Questions?

If you have any questions, feel free to open an issue or start a discussion on GitHub.

Thank you for contributing to NeuroLink!
