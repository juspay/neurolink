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

## Type System Guidelines

NeuroLink has a comprehensive TypeScript type system with clear organization principles. Follow these guidelines when working with types:

### 📋 Quick Rules

1. **Always import from canonical sources** - Each type has one primary definition
2. **Use the public API for external code** - Import from `@juspay/neurolink/types`
3. **Prefer type-only imports** - Use `import type` for better tree-shaking
4. **Document type sources** - Add comments in complex files
5. **Never duplicate type definitions** - Re-export instead

### 📚 Type System Organization

```
src/lib/types/
├── index.ts              # Public API - Main entry point
├── sdkTypes.ts          # SDK consumer interface
├── multimodal.ts        # ✅ Canonical: All multimodal content types
├── content.ts           # ⚠️ DEPRECATED: Re-exports from multimodal.ts
├── tools.ts             # ✅ Canonical: Tool system types
├── streamTypes.ts       # ✅ Canonical: Streaming operations
├── providers.ts         # ✅ Canonical: Provider configuration
├── generateTypes.ts     # ✅ Canonical: Generation operations
├── conversation.ts      # ✅ Canonical: Chat and memory types
├── mcpTypes.ts          # ✅ Canonical: MCP integration
└── ... (other modules)
```

### ✅ Correct Import Patterns

```typescript
// ✅ BEST: Public API (for external/user-facing code)
import type {
  Content,
  ToolDefinition,
  StreamResult,
} from "@juspay/neurolink/types";

// ✅ GOOD: Canonical source (for internal code)
import type { Content, ImageContent } from "../types/multimodal.js";
import type { ToolDefinition } from "../types/tools.js";

// ✅ CORRECT: Runtime type guards need regular import
import { isImageContent, type Content } from "../types/multimodal.js";
```

### ❌ Incorrect Import Patterns

```typescript
// ❌ BAD: Importing from deprecated re-export
import type { Content } from "../types/content.js";

// ❌ BAD: Mixed import when you only need types
import { Content } from "../types/multimodal.js";

// ❌ BAD: Importing internal types for external code
import type { ProcessedImage } from "@juspay/neurolink/types/multimodal";
```

### 🔄 Handling Type Name Conflicts

Some types exist in multiple modules with different purposes (e.g., `ToolResult`):

```typescript
// ✅ CORRECT: Use aliased names from index.ts
import type {
  ToolResult, // From tools.js (tool metadata)
  StreamToolResult, // From streamTypes.js (streaming execution)
} from "@juspay/neurolink/types";

// ⚠️ OR: Import directly and alias yourself
import type { ToolResult as ToolMetadata } from "../types/tools.js";
import type { ToolResult as StreamToolResult } from "../types/streamTypes.js";
```

### 📝 Adding New Types

When contributing new types:

1. **Choose the correct canonical file:**
   - Content/multimodal types → `multimodal.ts`
   - Tool-related types → `tools.ts`
   - Streaming types → `streamTypes.ts`
   - Provider types → `providers.ts`
   - Configuration types → `configTypes.ts`

2. **Add to the canonical file:**

   ````typescript
   /**
    * Your new type with JSDoc documentation
    *
    * @example
    * ```typescript
    * const example: MyNewType = {
    *   field: "value"
    * };
    * ```
    */
   export type MyNewType = {
     field: string;
   };
   ````

3. **Export from public API if needed:**

   ```typescript
   // In index.ts
   export type { MyNewType } from "./myModule.js";
   ```

4. **Update SDK types if needed:**

   ```typescript
   // In sdkTypes.ts (if type is essential for SDK consumers)
   export type { MyNewType } from "./myModule.js";
   ```

5. **Document in README:**
   - Add to canonical source table in `src/lib/types/README.md`
   - Add usage examples if complex

### 🗑️ Deprecating Types

When deprecating a type or import path:

1. **Add JSDoc deprecation notice:**

   ````typescript
   /**
    * @deprecated Use MyNewType from './newModule.js' instead
    *
    * Migration guide:
    * ```typescript
    * // Old (deprecated)
    * import type { OldType } from './oldModule.js';
    *
    * // New (preferred)
    * import type { MyNewType } from './newModule.js';
    * ```
    */
   export type OldType = MyNewType;
   ````

2. **Maintain backward compatibility:**
   - Keep deprecated exports for at least one major version
   - Provide re-exports for smooth migration

3. **Update documentation:**
   - Add to "Deprecated Paths and Migration" section in `src/lib/types/README.md`
   - Specify migration timeline

### 📖 Type System Documentation

Complete type system documentation is available in:

**[src/lib/types/README.md](src/lib/types/README.md)**

This includes:

- Canonical source table for all types
- Import hierarchy explanation
- Deprecated paths and migration guides
- Common import patterns
- Troubleshooting guide

**Please read this documentation before making type-related changes.**

### 🧪 Testing Type Imports

When adding or modifying types, verify correct imports:

```bash
# Type checking
pnpm run check

# Run import guideline tests
pnpm test test/types/import-guidelines.test.ts
```

## Testing

NeuroLink has a comprehensive testing suite to ensure reliability across all AI providers and features. Please add tests for any new features or bug fixes.

### 🚀 Quick Start Testing

```bash
# Interactive testing (recommended for development)
pnpm test

# Non-interactive testing (CI/CD)
pnpm test:run
```

### 📋 Test Categories & Commands

#### **Core Testing Commands**

```bash
# Basic testing
pnpm test              # Interactive vitest with watch mode
pnpm test:run          # Non-interactive vitest run

# Enhanced testing suite
pnpm test:smart        # Adaptive test runner with intelligence
pnpm test:providers    # Validate all AI providers
pnpm test:performance  # Performance benchmarks
pnpm test:coverage     # Coverage analysis with reports
pnpm test:ci           # Complete CI pipeline testing
```

#### **Specialized Testing**

```bash
# Dynamic model testing
pnpm test:dynamicModels    # Test dynamic model configurations

# Development utilities
pnpm modelServer           # Start model validation server
```

### 📁 Test File Structure

The test suite is organized into logical categories:

```
test/
├── analyticsFeatures.ts           # Analytics functionality tests
├── basicFunctionality.ts          # Core feature validation
├── errorHandling.ts               # Error handling scenarios
├── evaluationFeatures.ts          # AI evaluation system tests
├── streamingValidation.ts         # Streaming functionality
├── sdkComprehensive.ts            # SDK integration tests
├── parameterValidation.ts         # Input validation tests
├── contextIntegration.ts          # Context management tests
├── universalProvider.ts           # Cross-provider compatibility
├── mcp/                           # Model Context Protocol tests
│   ├── manualConfig/              # Manual configuration tests
│   ├── toolIntegration/           # Tool integration tests
│   └── providers/                 # Provider-specific MCP tests
├── providers/                     # Provider-specific tests
│   ├── litellm.test.ts           # LiteLLM integration
│   └── sagemaker.test.ts         # AWS SageMaker integration
├── sdkTools/                      # SDK tool functionality
├── streaming/                     # Streaming performance tests
└── utils/                         # Testing utilities
```

### 🧪 Testing Best Practices

#### **For New Features**

1. **Add unit tests** for core functionality
2. **Add integration tests** for provider compatibility
3. **Test error scenarios** and edge cases
4. **Verify performance** doesn't regress

#### **For AI Provider Integration**

```ts
// Use the established mocking pattern
import { vi } from "vitest";

vi.mock("@ai-sdk/openai", () => ({
  openai: vi.fn().mockReturnValue({
    // Mock implementation
  }),
}));

// Test both success and failure scenarios
describe("YourProvider", () => {
  it("should generate text successfully", async () => {
    // Test implementation
  });

  it("should handle errors gracefully", async () => {
    // Error scenario testing
  });
});
```

#### **For MCP (Model Context Protocol) Features**

```bash
# Test MCP tool integration
pnpm vitest test/mcp/toolIntegration --run

# Test manual configuration loading
pnpm vitest test/mcp/manualConfig --run

# Test provider MCP support
pnpm vitest test/mcp/providers --run
```

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
# Start with interactive testing
pnpm test

# Focus on specific test files
pnpm vitest test/basicFunctionality.ts

# Watch specific test categories
pnpm vitest test/mcp --watch
```

#### **CI/CD Workflow**

```bash
# Complete validation pipeline
pnpm test:ci

# Individual validation steps
pnpm test:run              # Core test suite
pnpm test:providers        # Provider validation
pnpm test:performance      # Performance benchmarks
pnpm test:coverage         # Coverage analysis
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
# Run individual test files
pnpm vitest test/basicFunctionality.ts --run

# Check environment setup
pnpm run env:validate
```

**Provider-specific failures:**

```bash
# Test specific provider
pnpm cli generate "test" --provider google-ai

# Validate provider configuration
pnpm test:providers
```

**Build-related test failures:**

```bash
# Clean and rebuild
pnpm clean
pnpm build
pnpm test:run
```

### 📈 Test Coverage

We maintain high test coverage across:

- ✅ **Core functionality** - All primary features tested
- ✅ **Provider integration** - All 9 AI providers validated
- ✅ **Error handling** - Graceful failure scenarios
- ✅ **Performance** - Response time and throughput benchmarks
- ✅ **MCP integration** - Tool orchestration and configuration
- ✅ **CLI functionality** - Command-line interface validation
- ✅ **SDK features** - Software development kit testing

Check current coverage:

```bash
pnpm test:coverage
```

> **Target:** Maintain at least **90 %** line and branch coverage across the codebase.

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
