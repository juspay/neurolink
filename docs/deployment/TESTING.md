# NeuroLink Deployment System - Testing Guide

This document provides instructions for running and understanding the deployment system test suite.

## Prerequisites

Before running the tests, ensure you have:

1. **Node.js 20+** installed
2. **pnpm** package manager
3. **Dependencies installed**: Run `pnpm install`
4. **Build completed**: Run `pnpm run build`

### Optional: Platform CLIs for Real Deployment Tests

For full integration tests with actual deployments:

- **Vercel**: `npm i -g vercel` and `vercel login`
- **Cloudflare**: `npm i -g wrangler` and `wrangler login`
- **Netlify**: `npm i -g netlify-cli` and `netlify login`
- **AWS Lambda**: AWS CLI configured with credentials
- **Docker**: Docker Desktop or Docker Engine installed
- **Fly.io**: `curl -L https://fly.io/install.sh | sh` and `flyctl auth login`

## Running Tests

### Unit Tests (Vitest)

```bash
# Run all deployment tests
pnpm run test test/deployment

# Run specific test files
pnpm run test test/deployment/DeploymentFactory.test.ts
pnpm run test test/deployment/DeploymentRegistry.test.ts
pnpm run test test/deployment/EnvironmentManager.test.ts

# Run deployer-specific tests
pnpm run test test/deployment/deployers/VercelDeployer.test.ts
pnpm run test test/deployment/deployers/CloudflareDeployer.test.ts

# Run integration tests
pnpm run test test/deployment/integration
```

### Continuous Test Suite

The continuous test suite provides comprehensive end-to-end testing:

```bash
# Run with defaults (skip real deployments)
npx tsx test/continuous-test-suite-deployment.ts

# Run for specific platform
TEST_PLATFORM=cloudflare npx tsx test/continuous-test-suite-deployment.ts

# Run with specific bundler
TEST_BUNDLER=vite npx tsx test/continuous-test-suite-deployment.ts

# Enable real deployment tests (requires platform CLIs)
SKIP_REAL_DEPLOY=false npx tsx test/continuous-test-suite-deployment.ts
```

### Environment Variables

| Variable           | Default   | Description                    |
| ------------------ | --------- | ------------------------------ |
| `TEST_PLATFORM`    | `vercel`  | Target platform for tests      |
| `TEST_BUNDLER`     | `esbuild` | Bundler to use for build tests |
| `SKIP_REAL_DEPLOY` | `true`    | Skip actual deployment tests   |

## Test Categories

### 1. SDK Tests

Tests for the SDK deployment components:

- **Deployer Registry**: Platform registration, metadata, factory functions
- **Bundler Registry**: Bundler registration, metadata, factory functions
- **DeploymentFactory**: Deployer/bundler creation, supported platforms query
- **EnvironmentManager**: Environment variable management, secret detection, platform validation
- **Deployer Validation**: Configuration validation for each platform

### 2. CLI Tests

Tests for the CLI deploy commands:

- **Help Commands**: `deploy --help`, `deploy build --help`, etc.
- **Platforms Command**: `deploy platforms` - list available platforms
- **Bundlers Command**: `deploy bundlers` - list available bundlers
- **Env Command**: `deploy env --platform <name>` - show env requirements
- **Build Dry Run**: `deploy build --dry-run` - test build without output

### 3. Integration Tests

End-to-end workflow tests:

- **E2E Build Workflow**: Full build process with bundler
- **Platform Config Validation**: Platform-specific configuration handling

## Test Fixtures

Test fixtures are located in `test/fixtures/deployment/`:

- `deploy-config.json` - Sample deployment configurations for all 6 platforms
- `bundler-config.json` - Sample bundler configurations for ESBuild and Vite
- `sample-app/` - Sample application structure for deployment testing

## Coverage

The test suite covers:

| Component          | Unit Tests | Integration Tests | CLI Tests |
| ------------------ | ---------- | ----------------- | --------- |
| DeploymentFactory  | ✅         | ✅                | -         |
| DeploymentRegistry | ✅         | ✅                | -         |
| EnvironmentManager | ✅         | -                 | ✅        |
| VercelDeployer     | ✅         | ✅                | ✅        |
| CloudflareDeployer | ✅         | ✅                | -         |
| NetlifyDeployer    | ✅         | ✅                | -         |
| LambdaDeployer     | ✅         | ✅                | -         |
| DockerDeployer     | ✅         | ✅                | -         |
| FlyioDeployer      | ✅         | ✅                | -         |
| ESBuildBundler     | ✅         | ✅                | ✅        |
| ViteBundler        | ✅         | ✅                | -         |

## Troubleshooting

### Tests Timeout

Increase the timeout in the test configuration:

```bash
TEST_TIMEOUT=180000 npx tsx test/continuous-test-suite-deployment.ts
```

### Platform CLI Not Found

Install the required CLI and authenticate:

```bash
# Vercel
npm i -g vercel && vercel login

# Cloudflare
npm i -g wrangler && wrangler login
```

### Build Failures

1. Ensure dependencies are installed: `pnpm install`
2. Clean build output: `rm -rf dist .neurolink`
3. Rebuild: `pnpm run build`

## Adding New Tests

When adding new deployment features, ensure:

1. Add unit tests in `test/deployment/`
2. Add integration tests in `test/deployment/integration/`
3. Update the continuous test suite if needed
4. Update fixture files with new configuration options
