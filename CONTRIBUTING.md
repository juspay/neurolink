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

NeuroLink has a comprehensive testing suite to ensure reliability across all AI providers and features. Please add tests for any new features or bug fixes.

### 🚀 Quick Start Testing

All test suites run via `tsx` (not vitest, despite a `vitest.config.ts` existing in the repo). Suites are real integration runs against `test/continuous-test-suite-*.ts` orchestrators.

```bash
# Main suite — orchestrates the full integration run
pnpm test

# CI pipeline (test + test:client)
pnpm test:ci
```

### 📋 Test Categories & Commands

```bash
# Domain-specific suites
pnpm test:client          # SDK client suite
pnpm test:context         # Context compaction + file handling
pnpm test:mcp             # MCP HTTP transport
pnpm test:rag             # RAG (chunking, search, reranking)
pnpm test:providers       # Provider validation
pnpm test:new-providers   # DeepSeek, NVIDIA NIM, LM Studio, llama.cpp
pnpm test:media           # Media generation (image, video)
pnpm test:memory          # Memory persistence
pnpm test:tts             # Text-to-speech providers
pnpm test:voice           # Multi-provider voice (TTS + STT)
pnpm test:voice-server    # Real-time voice agent server
pnpm test:observability   # Tracing + telemetry
pnpm test:hitl            # Human-in-the-loop workflows
pnpm test:credentials     # Per-request credentials
pnpm test:evaluation      # Evaluation scorers
pnpm test:middleware      # Middleware chain
pnpm test:workflow        # Workflow engine
pnpm test:ppt             # PowerPoint generation
pnpm test:servers         # HTTP server adapters
pnpm test:tracing         # OpenTelemetry traces
pnpm test:proxy           # Claude proxy
pnpm test:bugfixes        # Regression fixtures

# Run a single suite directly
npx tsx test/continuous-test-suite-<name>.ts
```

### 📁 Test File Structure

```
test/
├── continuous-test-suite.ts                 # Main orchestrator (pnpm test)
├── continuous-test-suite-<domain>.ts        # Per-domain suites (mcp, rag, voice, etc.)
├── continuous-test-suite-issue-NN-*.ts      # Regression fixtures for tracked issues
└── fixtures/                                # CSVs, PDFs, PNG, JSON used by suites
```

Each domain suite is a self-contained `tsx` script that exits non-zero on failure. There is no vitest runner; do not write `*.test.ts` files using `vi.mock` or `describe/it` blocks — they will not be picked up.

### 🧪 Testing Best Practices

#### **For New Features**

1. **Add to the closest existing suite** (e.g. provider work → `continuous-test-suite-providers.ts`)
2. **Or create a new suite** `test/continuous-test-suite-<name>.ts` and add a matching `test:<name>` script in `package.json`
3. **Test error scenarios and edge cases** — assertions inside the suite throw on failure
4. **Real integration runs preferred** — these suites hit live provider APIs when credentials are present

### 🔧 Testing Environment Setup

Before running tests, ensure your environment is properly configured:

```bash
# 1. Install dependencies
pnpm install

# 2. Build the project
pnpm build

# 3. Set up environment variables (optional for mocked tests)
cp .env.example .env
# Add your API keys for integration testing

# 4. Verify setup
pnpm cli --version
```

### 🎯 Test Execution Strategies

#### **Development Workflow**

```bash
# Run the main suite
pnpm test

# Focus on a specific domain suite
npx tsx test/continuous-test-suite-providers.ts
npx tsx test/continuous-test-suite-rag.ts

# Run an individual issue regression suite
npx tsx test/continuous-test-suite-issue-01-model-access.ts
```

#### **CI/CD Workflow**

```bash
# Complete CI pipeline (test + test:client + test:hitl)
pnpm test:ci

# Individual domain validations
pnpm test:providers       # 21+ provider validation
pnpm test:performance     # Performance benchmarks (tools/testing/performanceMonitor.ts)
pnpm test:voice           # Voice (TTS/STT) validation
pnpm test:rag             # RAG pipeline validation
```

### 📊 Performance Expectations

| Test Category     | Expected Duration | Use Case               |
| ----------------- | ----------------- | ---------------------- |
| Basic Tests       | 30-60 seconds     | Quick validation       |
| Provider Tests    | 1-2 minutes       | Provider compatibility |
| MCP Tests         | 1-3 minutes       | Tool integration       |
| Performance Tests | 2-5 minutes       | Benchmarking           |
| Full Test Suite   | 5-10 minutes      | Complete validation    |

### 🛠️ Troubleshooting Tests

#### **Common Issues**

**Tests timeout or fail:**

```bash
# Run an individual suite directly with tsx
npx tsx test/continuous-test-suite-<name>.ts

# Check environment setup
pnpm run env:validate
```

**Provider-specific failures:**

```bash
# Test a specific provider via CLI
pnpm cli generate "test" --provider google-ai

# Run full provider validation suite
pnpm test:providers
```

**Build-related test failures:**

```bash
# Clean and rebuild
pnpm clean
pnpm build
pnpm test
```

### 📈 Test Coverage

We maintain integration coverage across:

- ✅ **Core functionality** — All primary features tested
- ✅ **Provider integration** — All 21+ AI providers validated
- ✅ **Voice pipeline** — TTS, STT, and realtime voice servers
- ✅ **Error handling** — Graceful failure scenarios
- ✅ **MCP integration** — Tool orchestration and configuration
- ✅ **CLI functionality** — Command-line interface validation
- ✅ **SDK features** — Software development kit testing
- ✅ **Regressions** — Pinned issue suites (`continuous-test-suite-issue-*.ts`)

### 🧑‍💻 Manual CLI & SDK Testing

Sometimes you need a quick manual sanity-check outside the automated test-suite. Use the following examples as copy-paste snippets:

#### **CLI Quick Checks**

```bash
# Basic generation with default provider
pnpm cli generate "Hello world" --provider google-ai

# Streaming
pnpm cli stream "Count to 5" --provider google-ai

# Analytics / evaluation
pnpm cli generate "Test analytics" --provider google-ai --enable-analytics --format json

# Loop through all built-in providers (bash)
for p in openai google-ai anthropic bedrock vertex; do
  pnpm cli generate "quick test" --provider "$p" || break
done
```

#### **SDK Quick Checks**

```ts
// Run with: node -e "<snippet>"
import { NeuroLink } from "./dist/lib/neurolink.js";

const sdk = new NeuroLink();
const res = await sdk.generate({
  input: { text: "Hello SDK" },
  provider: "google-ai",
  enableAnalytics: true,
});

console.log("✅ Content:", res.content.slice(0, 50));
console.log("✅ Analytics:", !!res.analytics);
```

#### **Debug Utilities & Visual Runner**

- `test/utils/streamingDebug.ts` – analyse stream behaviour, timing and chunking.
- `test/utils/visualRunner.ts` – colour-coded progress & markdown reports.

These helpers are optional but invaluable when diagnosing flaky streaming or long-running suites.

### 🎯 Writing Effective Tests

When contributing tests, follow these guidelines:

1. **Test real scenarios** - Use realistic inputs and expected outputs
2. **Mock external dependencies** - Don't rely on external API calls in unit tests
3. **Test error conditions** - Verify graceful handling of failures
4. **Use descriptive names** - Test names should clearly describe what's being tested
5. **Keep tests focused** - Each test should verify one specific behavior
6. **Add performance assertions** - Include timing expectations where relevant

For examples of well-structured tests, refer to existing test files in the `test/` directory.

## Documentation

For any new features or changes, please update the relevant documentation:

- README.md for general usage
- JSDoc comments for public APIs
- Code examples where appropriate

### 📝 Documentation Quality Standards

We maintain high-quality documentation with automated formatting checks:

#### **Markdown Linting**

All documentation is validated with markdownlint during CI/CD. To ensure your documentation meets standards:

```bash
# Check markdown formatting
npx markdownlint-cli2 "docs/**/*.md"

# Auto-fix formatting issues
npx markdownlint-cli2 --fix "docs/**/*.md"

# Check specific files
npx markdownlint-cli2 "README.md" "CONTRIBUTING.md"
```

**Recommended markdownlint configuration (`.markdownlint.json`):**

```json
{
  "default": true,
  "MD003": { "style": "atx" },
  "MD007": { "indent": 2 },
  "MD013": { "line_length": 120 },
  "MD024": { "allow_different_nesting": true },
  "MD033": { "allowed_elements": ["details", "summary", "br"] },
  "MD041": false
}
```

This configuration ensures:

- ✅ Consistent heading styles (ATX format: `# Heading`)
- ✅ Proper list indentation (2 spaces)
- ✅ Reasonable line length limits (120 characters)
- ✅ Allows nested headings with same content
- ✅ Permits essential HTML elements for documentation
- ✅ Flexible first-line requirements for complex docs

#### **Documentation CI Integration**

The docs workflow automatically runs markdownlint on all documentation files. If formatting issues are found:

1. **Local fixing:** Run `npx markdownlint-cli2 --fix "docs/**/*.md"` locally
2. **Manual review:** Check the CI output for specific formatting violations
3. **Commit fixes:** Include markdown formatting fixes in your contribution

This ensures consistent, professional documentation across the entire project.

## Release Process

The maintainers follow this process for releases:

1. Update version in package.json
2. Update CHANGELOG.md
3. Create a GitHub release
4. Publish to npm

## Questions?

If you have any questions, feel free to open an issue or start a discussion on GitHub.

Thank you for contributing to NeuroLink!
