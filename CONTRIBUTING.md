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

## Submitting Changes

1. **Commit your changes** with a clear commit message:

   ```bash
   git commit -m "Feature: Add support for new provider"
   ```

   Prefix your commit message with one of the following:
   - `Feature:` - New functionality
   - `Fix:` - Bug fixes
   - `Docs:` - Documentation changes
   - `Style:` - Formatting, missing semicolons, etc; no code change
   - `Refactor:` - Code improvements without adding features or fixing bugs
   - `Test:` - Adding missing tests
   - `Chore:` - Maintenance tasks, dependency updates, etc.

2. **Push to your fork**:

   ```bash
   git push origin feature/your-feature-name
   ```

3. **Submit a Pull Request** to the main repository

4. **Address review comments** if any are provided

## Coding Style

This project uses:

- TypeScript for type safety
- ESLint for code linting
- Prettier for code formatting

Before submitting a PR, ensure your code adheres to our style by running:

```bash
pnpm lint
pnpm format
```

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
