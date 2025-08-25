# NeuroLink Testing

Quick reference for running tests in the NeuroLink project.

## 🚀 Quick Start Testing

```bash
# Interactive testing (recommended for development)
pnpm test

# Non-interactive testing
pnpm test:run

# Enhanced testing suite
pnpm test:smart        # Adaptive test runner
pnpm test:providers    # Validate all AI providers
pnpm test:performance  # Performance benchmarks
pnpm test:coverage     # Coverage analysis
pnpm test:ci           # Complete CI pipeline
```

## 📁 Test Structure

```
test/
├── analyticsFeatures.ts           # Analytics functionality
├── basicFunctionality.ts          # Core features
├── errorHandling.ts               # Error scenarios
├── evaluationFeatures.ts          # AI evaluation system
├── streamingValidation.ts         # Streaming functionality
├── sdkComprehensive.ts            # SDK integration
├── mcp/                           # Model Context Protocol
├── providers/                     # Provider-specific tests
├── sdkTools/                      # SDK tool functionality
├── streaming/                     # Streaming performance
└── utils/                         # Testing utilities
```

## 🔧 Running Specific Tests

```bash
# Run specific test file
pnpm vitest test/basicFunctionality.ts --run

# Run test category
pnpm vitest test/mcp --run

# Watch mode for development
pnpm vitest test/basicFunctionality.ts
```

## 📖 Full Documentation

For complete testing documentation, see [CONTRIBUTING.md](../CONTRIBUTING.md#testing).
