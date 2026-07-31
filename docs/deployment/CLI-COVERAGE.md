# NeuroLink Deployment System - CLI Coverage

This document details the CLI commands available in the NeuroLink Deployment System and their test coverage.

## Commands Overview

The deployment system adds a `deploy` command group to the NeuroLink CLI with the following structure:

```
neurolink deploy
├── build     - Build application for deployment
├── push      - Deploy to cloud platform
├── status    - Check deployment status
├── platforms - List supported platforms
├── bundlers  - List supported bundlers
└── env       - Show environment requirements
```

## Command Details

### `neurolink deploy build`

Build the application for deployment to a serverless platform.

```bash
neurolink deploy build [options]
```

**Options:**

| Option        | Alias | Type    | Default             | Description                                           |
| ------------- | ----- | ------- | ------------------- | ----------------------------------------------------- |
| `--entry`     | `-e`  | string  | `./src/index.ts`    | Entry point file                                      |
| `--out-dir`   | `-o`  | string  | `.neurolink/output` | Output directory                                      |
| `--bundler`   | `-b`  | string  | `esbuild`           | Bundler to use (esbuild, vite)                        |
| `--platform`  | `-p`  | string  | -                   | Target platform (for platform-specific optimizations) |
| `--minify`    | -     | boolean | `true`              | Minify output                                         |
| `--sourcemap` | -     | boolean | `true`              | Generate sourcemaps                                   |
| `--dry-run`   | -     | boolean | `false`             | Analyze without building                              |

**Examples:**

```bash
# Basic build
neurolink deploy build

# Build for Vercel with Vite
neurolink deploy build --platform vercel --bundler vite

# Build with custom entry and output
neurolink deploy build --entry ./api/index.ts --out-dir ./dist

# Dry run to analyze build
neurolink deploy build --dry-run
```

**Test Coverage:** ✅ Help, dry-run

---

### `neurolink deploy push [platform]`

Deploy the built application to a cloud platform.

```bash
neurolink deploy push <platform> [options]
```

**Positional Arguments:**

| Argument   | Required | Description                                                          |
| ---------- | -------- | -------------------------------------------------------------------- |
| `platform` | Yes      | Target platform (vercel, cloudflare, netlify, lambda, docker, flyio) |

**Options:**

| Option      | Alias | Type    | Description                    |
| ----------- | ----- | ------- | ------------------------------ |
| `--entry`   | `-e`  | string  | Entry point file               |
| `--out-dir` | `-o`  | string  | Output directory               |
| `--env`     | -     | string  | Path to .env file              |
| `--config`  | `-c`  | string  | Path to deployment config file |
| `--prod`    | -     | boolean | Deploy to production           |
| `--dry-run` | -     | boolean | Validate without deploying     |

**Platform-Specific Options:**

_Vercel:_

- `--regions` - Deployment regions
- `--max-duration` - Max function duration
- `--memory` - Memory allocation

_Cloudflare:_

- `--worker-name` - Worker name
- `--account-id` - Cloudflare account ID

_Lambda:_

- `--function-name` - Lambda function name
- `--region` - AWS region
- `--memory-size` - Memory allocation

**Examples:**

```bash
# Deploy to Vercel
neurolink deploy push vercel

# Deploy to production
neurolink deploy push vercel --prod

# Deploy to Cloudflare with worker name
neurolink deploy push cloudflare --worker-name my-api

# Deploy to Lambda in specific region
neurolink deploy push lambda --function-name my-api --region us-west-2

# Dry run deployment
neurolink deploy push vercel --dry-run
```

**Test Coverage:** ✅ Help

---

### `neurolink deploy status [deploymentId]`

Check the status of a deployment.

```bash
neurolink deploy status [deploymentId] [options]
```

**Positional Arguments:**

| Argument       | Required | Description                                          |
| -------------- | -------- | ---------------------------------------------------- |
| `deploymentId` | No       | Specific deployment ID (uses latest if not provided) |

**Options:**

| Option       | Alias | Type    | Description              |
| ------------ | ----- | ------- | ------------------------ |
| `--platform` | `-p`  | string  | Target platform          |
| `--watch`    | `-w`  | boolean | Watch for status changes |
| `--json`     | -     | boolean | Output as JSON           |

**Examples:**

```bash
# Check latest deployment
neurolink deploy status

# Check specific deployment
neurolink deploy status dpl_abc123

# Watch deployment progress
neurolink deploy status --watch

# Get status as JSON
neurolink deploy status --json
```

**Test Coverage:** ✅ Help

---

### `neurolink deploy platforms`

List all supported deployment platforms.

```bash
neurolink deploy platforms [options]
```

**Options:**

| Option      | Type    | Description               |
| ----------- | ------- | ------------------------- |
| `--json`    | boolean | Output as JSON            |
| `--verbose` | boolean | Show detailed information |

**Examples:**

```bash
# List platforms
neurolink deploy platforms

# Get detailed platform info
neurolink deploy platforms --verbose

# Output as JSON
neurolink deploy platforms --json
```

**Test Coverage:** ✅ Command execution, platform listing

---

### `neurolink deploy bundlers`

List all supported bundlers.

```bash
neurolink deploy bundlers [options]
```

**Options:**

| Option      | Type    | Description               |
| ----------- | ------- | ------------------------- |
| `--json`    | boolean | Output as JSON            |
| `--verbose` | boolean | Show detailed information |

**Examples:**

```bash
# List bundlers
neurolink deploy bundlers

# Get detailed bundler info
neurolink deploy bundlers --verbose
```

**Test Coverage:** ✅ Command execution, bundler listing

---

### `neurolink deploy env`

Show environment variable requirements for a platform.

```bash
neurolink deploy env [options]
```

**Options:**

| Option       | Alias | Type    | Description                  |
| ------------ | ----- | ------- | ---------------------------- |
| `--platform` | `-p`  | string  | Target platform              |
| `--validate` | -     | boolean | Validate current environment |
| `--template` | -     | boolean | Output .env template         |

**Examples:**

```bash
# Show Vercel env requirements
neurolink deploy env --platform vercel

# Validate current environment for Lambda
neurolink deploy env --platform lambda --validate

# Generate .env template
neurolink deploy env --platform cloudflare --template
```

**Test Coverage:** ✅ Command execution with platform flag

---

## Test Coverage Summary

| Command            | Help Test | Execution Test | Integration Test |
| ------------------ | --------- | -------------- | ---------------- |
| `deploy`           | ✅        | -              | -                |
| `deploy build`     | ✅        | ✅ (dry-run)   | ⏳               |
| `deploy push`      | ✅        | ⏳             | ⏳               |
| `deploy status`    | ✅        | ⏳             | ⏳               |
| `deploy platforms` | ✅        | ✅             | ✅               |
| `deploy bundlers`  | ✅        | ✅             | ✅               |
| `deploy env`       | ✅        | ✅             | ✅               |

**Legend:**

- ✅ Tested
- ⏳ Pending (requires platform CLI or credentials)
- ❌ Not tested

## Adding Test Coverage

To add coverage for commands that require platform credentials:

1. Set up the required environment variables
2. Enable real deployment tests: `SKIP_REAL_DEPLOY=false`
3. Run the continuous test suite

```bash
# Example: Test Vercel deployment
export VERCEL_TOKEN=your-token
SKIP_REAL_DEPLOY=false TEST_PLATFORM=vercel npx tsx test/continuous-test-suite-deployment.ts
```
