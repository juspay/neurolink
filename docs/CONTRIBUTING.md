# 🤝 Contributing to NeuroLink

Thank you for your interest in contributing to NeuroLink! We welcome contributions from the community and are excited to work with you.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Documentation](#documentation)
- [Community](#community)

## 📜 Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md). We are committed to providing a welcoming and inclusive environment for all contributors.

## 🚀 How to Contribute

### Reporting Issues

1. **Check existing issues** - Before creating a new issue, check if it already exists
2. **Use issue templates** - Use the appropriate template for bugs, features, or questions
3. **Provide details** - Include reproduction steps, environment details, and expected behavior

### Suggesting Features

1. **Open a discussion** - Start with a GitHub Discussion to gather feedback
2. **Explain the use case** - Help us understand why this feature would be valuable
3. **Consider alternatives** - What workarounds exist today?

### Contributing Code

1. **Fork the repository** - Create your own fork of the project
2. **Create a feature branch** - `git checkout -b feature/your-feature-name`
3. **Make your changes** - Follow our coding standards
4. **Write tests** - Ensure your changes are tested
5. **Submit a pull request** - Follow our PR template

## 🛠️ Development Setup

### Prerequisites

- Node.js 18+ and npm 9+
- Git
- At least one AI provider API key (OpenAI, Google AI, etc.)

### Local Development

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/neurolink.git
cd neurolink

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# Build the project
npm run build

# Run tests
npm test

# Run linting
npm run lint

# Run type checking
npm run type-check
```

### Running Examples

```bash
# Test CLI
npx tsx src/cli/index.ts generate "Hello world"

# Run example scripts
npm run example:basic
npm run example:streaming

# Start demo server
cd neurolink-demo && npm start
```

## 📁 Project Structure

```
neurolink/
├── src/
│   ├── lib/
│   │   ├── core/          # Core types and base classes
│   │   ├── providers/     # AI provider implementations
│   │   ├── factories/     # Factory pattern implementation
│   │   ├── mcp/          # Model Context Protocol integration
│   │   └── sdk/          # SDK extensions and tools
│   └── cli/              # Command-line interface
├── docs/                 # Documentation
├── test/                 # Test files
├── examples/            # Example usage
└── scripts/             # Build and utility scripts
```

### Key Components

- **BaseProvider** - Abstract base class all providers inherit from
- **ProviderRegistry** - Central registry for provider management
- **CompatibilityFactory** - Handles provider creation and compatibility
- **MCP Integration** - Built-in and external tool support

## 💻 Coding Standards

### TypeScript Style Guide

```typescript
// ✅ Good: Clear interfaces with documentation
interface GenerateOptions {
  /** The input text to process */
  input: { text: string };
  /** Temperature for randomness (0-1) */
  temperature?: number;
  /** Maximum tokens to generate */
  maxTokens?: number;
}

// ✅ Good: Proper error handling
async function generate(options: GenerateOptions): Promise<GenerateResult> {
  try {
    // Implementation
  } catch (error) {
    throw new NeuroLinkError("Generation failed", { cause: error });
  }
}

// ❌ Bad: Avoid any types
function process(data: any) {
  // Use specific types instead
  // Implementation
}
```

### Best Practices

1. **Use the factory pattern** - All providers should extend BaseProvider
2. **Type everything** - No implicit `any` types
3. **Handle errors gracefully** - Use try-catch and provide meaningful errors
4. **Document public APIs** - Use JSDoc comments for all public methods
5. **Keep functions small** - Single responsibility principle
6. **Write tests first** - TDD approach encouraged

### Naming Conventions

- **Files**: `kebab-case.ts` (e.g., `baseProvider.ts`)
- **Classes**: `PascalCase` (e.g., `OpenAIProvider`)
- **Interfaces**: `PascalCase` (e.g., `GenerateOptions`)
- **Functions**: `camelCase` (e.g., `createProvider`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `DEFAULT_TIMEOUT`)

## 🧪 Testing Guidelines

### Test Structure

```typescript
import { describe, it, expect } from "vitest";
import { OpenAIProvider } from "../src/providers/openai";

describe("OpenAIProvider", () => {
  describe("generate", () => {
    it("should generate text with valid options", async () => {
      const provider = new OpenAIProvider();
      const result = await provider.generate({
        input: { text: "Hello" },
        maxTokens: 10,
      });

      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);
    });

    it("should handle errors gracefully", async () => {
      // Test error scenarios
    });
  });
});
```

### Testing Requirements

1. **Unit tests** - For all public methods
2. **Integration tests** - For provider interactions
3. **Mock external calls** - Don't hit real APIs in tests
4. **Test edge cases** - Empty inputs, timeouts, errors
5. **Maintain coverage** - Aim for >80% code coverage

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run specific test file
npm test src/providers/openai.test.ts
```

## 🔄 Pull Request Process

### Before Submitting

1. **Update documentation** - Keep docs in sync with code changes
2. **Add tests** - New features need tests
3. **Run checks** - `npm run lint && npm run type-check && npm test`
4. **Update CHANGELOG** - Add your changes under "Unreleased"

### PR Template

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

- [ ] Tests pass locally
- [ ] Added new tests
- [ ] Updated documentation

## Related Issues

Fixes #123
```

### Review Process

1. **Automated checks** - CI/CD must pass
2. **Code review** - At least one maintainer approval
3. **Documentation review** - Docs team review if needed
4. **Testing** - Manual testing for significant changes

## 📚 Documentation

### Documentation Standards

1. **Keep it current** - Update docs with code changes
2. **Show examples** - Every feature needs examples
3. **Explain why** - Not just what, but why
4. **Test code snippets** - Ensure examples actually work

### Documentation Structure

- **API Reference** - Generated from TypeScript types
- **Guides** - Step-by-step tutorials
- **Examples** - Working code samples
- **Architecture** - System design documentation

### Writing Documentation

````markdown
# Feature Name

## Overview

Brief description of what this feature does and why it's useful.

## Usage

\```typescript
// Clear, working example
const result = await provider.generate({
input: { text: "Example prompt" },
temperature: 0.7
});
\```

## API Reference

Detailed parameter descriptions and return types.

## Best Practices

Tips for effective usage.

## Common Issues

Known gotchas and solutions.
````

## 🌟 Community

### Getting Help

- **GitHub Discussions** - Ask questions and share ideas
- **Issues** - Report bugs and request features
- **Discord** - Join our community chat (coming soon)

### Ways to Contribute

- **Code** - Fix bugs, add features
- **Documentation** - Improve guides and examples
- **Testing** - Add test coverage
- **Design** - UI/UX improvements
- **Community** - Help others, answer questions

### Recognition

We value all contributions! Contributors are:

- Listed in our [Contributors](https://github.com/juspay/neurolink/graphs/contributors) page
- Mentioned in release notes
- Given credit in the changelog

## 🎯 Current Focus Areas

We're particularly interested in contributions for:

1. **Provider Support** - Adding new AI providers
2. **Tool Integration** - MCP external server activation
3. **Performance** - Optimization and benchmarking
4. **Documentation** - Tutorials and guides
5. **Testing** - Increasing test coverage

## 📝 License

By contributing to NeuroLink, you agree that your contributions will be licensed under the [MIT License](https://github.com/juspay/neurolink/blob/main/LICENSE).

---

Thank you for contributing to NeuroLink! 🚀
