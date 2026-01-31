# Storage Abstraction Testing Guide

This document provides comprehensive instructions for running the Storage Abstraction test suite.

## Prerequisites

### Required Software

| Software | Version   | Purpose                      |
| -------- | --------- | ---------------------------- |
| Node.js  | >= 18.0.0 | JavaScript runtime           |
| pnpm     | >= 8.0.0  | Package manager              |
| Docker   | >= 24.0.0 | External services (optional) |

### Optional External Services

For full integration testing with external storage backends:

| Service    | Default Port | Docker Image         |
| ---------- | ------------ | -------------------- |
| PostgreSQL | 5432         | `postgres:16-alpine` |
| MongoDB    | 27017        | `mongo:7`            |
| Redis      | 6379         | `redis:7-alpine`     |
| MinIO (S3) | 9000         | `minio/minio`        |

## Installation

```bash
# Navigate to the storage-abstraction worktree
cd /path/to/feat/storage-abstraction

# Install dependencies
pnpm install
```

## Running Tests

### Quick Start (Memory Adapter Only)

Run all tests using in-memory storage (no external services required):

```bash
# Run all storage tests
pnpm vitest run test/storage/

# Run unit tests only
pnpm vitest run test/unit/storage/

# Run integration tests
pnpm vitest run test/storage/integration/
```

### Watch Mode

```bash
# Watch mode for development
pnpm vitest test/storage/

# Watch specific test file
pnpm vitest test/storage/integration/storage.integration.test.ts
```

### Coverage Report

```bash
# Generate coverage report
pnpm vitest run test/storage/ --coverage
```

## Test Categories

### 1. Unit Tests (`test/unit/storage/`)

Fast, isolated tests for individual components:

- `storageFactory.test.ts` - Factory pattern and provider registration

### 2. Integration Tests (`test/storage/integration/`)

Comprehensive tests covering full functionality:

| Section                    | Description                                              | Test Count |
| -------------------------- | -------------------------------------------------------- | ---------- |
| StorageFactory Integration | Provider registration, creation, aliases                 | ~15        |
| Memory Adapter CRUD        | Thread, Message, Workflow, Record operations             | ~40        |
| Migration System           | Version tracking, up/down migrations, dry-run            | ~15        |
| Connection Pool            | Initialization, acquisition, statistics                  | ~12        |
| Transaction System         | Begin, commit, rollback, retry logic                     | ~15        |
| Batch Operations           | Bulk inserts, concurrent operations                      | ~8         |
| Query Builder              | Filtering, pagination, sorting                           | ~15        |
| Error Handling             | Invalid operations, uninitialized storage                | ~10        |
| Adapter Switching          | Cross-adapter migration, interface consistency           | ~5         |
| Health Check               | Status monitoring, statistics                            | ~8         |
| High-Level Managers        | ThreadManager, KeyValueStore, WorkflowPersistenceManager | ~25        |
| Edge Cases                 | Special characters, large data, concurrency              | ~15        |

**Total: ~180+ test cases**

## External Service Testing

### Starting Services with Docker

```bash
# PostgreSQL
docker run -d --name neurolink-postgres \
  -e POSTGRES_USER=neurolink \
  -e POSTGRES_PASSWORD=neurolink \
  -e POSTGRES_DB=neurolink_test \
  -p 5432:5432 \
  postgres:16-alpine

# MongoDB
docker run -d --name neurolink-mongo \
  -p 27017:27017 \
  mongo:7

# Redis
docker run -d --name neurolink-redis \
  -p 6379:6379 \
  redis:7-alpine

# MinIO (S3-compatible)
docker run -d --name neurolink-minio \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  -p 9000:9000 \
  -p 9001:9001 \
  minio/minio server /data --console-address ":9001"
```

### Docker Compose (Recommended)

```yaml
# docker-compose.test.yml
version: "3.8"
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: neurolink
      POSTGRES_PASSWORD: neurolink
      POSTGRES_DB: neurolink_test
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U neurolink"]
      interval: 5s
      timeout: 5s
      retries: 5

  mongodb:
    image: mongo:7
    ports:
      - "27017:27017"
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
```

Start all services:

```bash
docker-compose -f docker-compose.test.yml up -d
```

### Environment Variables

Configure connection strings via environment variables:

```bash
# .env.test
STORAGE_TYPE=memory
POSTGRESQL_URL=postgresql://neurolink:neurolink@localhost:5432/neurolink_test
MONGODB_URL=mongodb://localhost:27017/neurolink_test
REDIS_URL=redis://localhost:6379/15
LIBSQL_URL=file::memory:
```

### Running Tests with External Backends

```bash
# Test with PostgreSQL
STORAGE_TYPE=postgresql pnpm vitest run test/storage/integration/

# Test with MongoDB
STORAGE_TYPE=mongodb pnpm vitest run test/storage/integration/

# Test with Redis
STORAGE_TYPE=redis pnpm vitest run test/storage/integration/

# Test all backends
./scripts/test-all-backends.sh
```

## Test Fixtures

Test fixtures are located in `test/fixtures/storage/`:

| File                     | Description                              |
| ------------------------ | ---------------------------------------- |
| `adapter-config.json`    | Configuration for all 8 storage adapters |
| `migration-scripts.json` | Migration test cases and scenarios       |
| `middleware-config.json` | Caching, encryption, compression configs |

## Debugging Tests

### Verbose Output

```bash
# Enable verbose logging
DEBUG=neurolink:storage:* pnpm vitest run test/storage/
```

### Single Test

```bash
# Run a specific test by name
pnpm vitest run -t "should create a thread" test/storage/integration/
```

### Debug in VS Code

Add this configuration to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Storage Tests",
  "program": "${workspaceFolder}/node_modules/vitest/vitest.mjs",
  "args": ["run", "--no-file-parallelism", "test/storage/"],
  "cwd": "${workspaceFolder}",
  "console": "integratedTerminal"
}
```

## Test Organization Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Use `beforeEach`/`afterEach` for setup/teardown
3. **Assertions**: Use specific assertions over generic ones
4. **Naming**: Use descriptive test names following the pattern "should [expected behavior] when [condition]"

## Troubleshooting

### Common Issues

| Issue              | Solution                           |
| ------------------ | ---------------------------------- |
| Connection refused | Ensure Docker services are running |
| Tests hanging      | Check for unclosed connections     |
| Memory issues      | Reduce parallel test execution     |
| Flaky tests        | Check for race conditions          |

### Reset Test Databases

```bash
# PostgreSQL
docker exec neurolink-postgres psql -U neurolink -d neurolink_test -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# MongoDB
docker exec neurolink-mongo mongosh neurolink_test --eval "db.dropDatabase()"

# Redis
docker exec neurolink-redis redis-cli -n 15 FLUSHDB
```

## CI/CD Integration

Example GitHub Actions workflow:

```yaml
name: Storage Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: neurolink
          POSTGRES_PASSWORD: neurolink
          POSTGRES_DB: neurolink_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "pnpm"
      - run: pnpm install
      - run: pnpm vitest run test/storage/
        env:
          POSTGRESQL_URL: postgresql://neurolink:neurolink@localhost:5432/neurolink_test
```
