# Vector Store Integration Testing Guide

This document provides comprehensive instructions for testing the NeuroLink Vector Store Integration feature.

## Overview

The Vector Store Integration feature provides a unified interface to 22 different vector database backends through the `VectorStoreFactory` pattern. This testing guide covers:

1. Unit tests for individual adapters
2. Integration tests for end-to-end functionality
3. Continuous test suite for comprehensive validation

## Prerequisites

### Required Software

- Node.js 18+ (LTS recommended)
- pnpm (package manager)
- TypeScript 5.x

### Optional (for specific adapters)

| Adapter       | Requirements                           |
| ------------- | -------------------------------------- |
| pgvector      | PostgreSQL 15+ with pgvector extension |
| Redis         | Redis Stack 7.2+ (with RediSearch)     |
| Elasticsearch | Elasticsearch 8.x                      |
| Qdrant        | Qdrant 1.7+ (local or cloud)           |
| Chroma        | ChromaDB (runs embedded by default)    |
| DuckDB        | DuckDB with VSS extension              |

## Environment Setup

### 1. Install Dependencies

```bash
cd /path/to/neurolink
pnpm install
```

### 2. Configure Environment Variables

Create a `.env` file or set environment variables for the adapters you want to test:

```bash
# Cloud-Native Adapters
export PINECONE_API_KEY="your-api-key"
export QDRANT_URL="http://localhost:6333"
export WEAVIATE_HOST="http://localhost:8080"
export ZILLIZ_CLOUD_URI="your-uri"
export ZILLIZ_CLOUD_TOKEN="your-token"

# Database Adapters
export POSTGRES_HOST="localhost"
export POSTGRES_PORT="5432"
export POSTGRES_DATABASE="vectors"
export POSTGRES_USER="postgres"
export POSTGRES_PASSWORD="password"

export REDIS_URL="redis://localhost:6379"
export MONGODB_ATLAS_URI="mongodb+srv://..."

# Embedded Adapters (no credentials needed)
# These use local storage by default
```

See `CONFIGURATION.md` for complete environment variable documentation.

## Running Tests

### Unit Tests (Vitest)

Run all vector store unit tests:

```bash
pnpm run test:run -- --filter="**/vector/**"
```

Run specific adapter tests:

```bash
# Test Pinecone adapter
pnpm run test:run -- test/vector/adapters/PineconeAdapter.test.ts

# Test pgvector adapter
pnpm run test:run -- test/vector/adapters/PgvectorAdapter.test.ts

# Test all adapter tests
pnpm run test:run -- test/vector/adapters/
```

### Unit Tests (stores directory)

```bash
# Test all store implementations
pnpm run test:run -- test/unit/stores/

# Test specific store
pnpm run test:run -- test/unit/stores/pinecone.test.ts
```

### Integration Tests

```bash
# Run integration tests
pnpm run test:run -- test/integration/stores/
```

### Continuous Test Suite

The continuous test suite provides comprehensive end-to-end testing:

```bash
# Run all adapter tests
npx tsx test/continuous-test-suite-vector.ts

# Test specific adapter
TEST_ADAPTER=pinecone npx tsx test/continuous-test-suite-vector.ts

# Enable verbose output
TEST_VERBOSE=true npx tsx test/continuous-test-suite-vector.ts

# Skip cleanup (for debugging)
TEST_CLEANUP=false npx tsx test/continuous-test-suite-vector.ts
```

### Test Suites

```bash
# Run vector store test suites
pnpm run test:suites -- --filter="vector"
```

## Test Coverage

### Current Test Statistics

| Directory                | Files   | Lines         |
| ------------------------ | ------- | ------------- |
| test/vector/adapters/    | 22      | ~670,000      |
| test/unit/stores/        | 20      | ~200,000      |
| test/integration/stores/ | 1       | ~3,000        |
| **Total**                | **43+** | **~870,000+** |

### Coverage by Adapter Category

| Category     | Adapters | Unit Tests | Integration Tests |
| ------------ | -------- | ---------- | ----------------- |
| Cloud-Native | 8        | ✅         | ✅                |
| Database     | 6        | ✅         | ✅                |
| Enterprise   | 2        | ✅         | ✅                |
| Embedded     | 6        | ✅         | ✅                |

## Test Patterns

### Mocking External Services

All unit tests use mocked clients to avoid requiring actual infrastructure:

```typescript
// Example from PineconeAdapter.test.ts
const mockPineconeClient = {
  createIndex: vi.fn().mockResolvedValue(undefined),
  deleteIndex: vi.fn().mockResolvedValue(undefined),
  listIndexes: vi.fn().mockResolvedValue({ indexes: [] }),
  // ...
};
```

### Testing Metadata Filters

Filter operators are tested comprehensively:

```typescript
const filterTests = [
  { filter: { category: { $eq: "tech" } }, desc: "equality" },
  { filter: { year: { $gt: 2020 } }, desc: "greater than" },
  { filter: { $and: [{ a: 1 }, { b: 2 }] }, desc: "logical AND" },
  // ...
];
```

### Testing Batch Operations

```typescript
const batchDocs = Array.from({ length: 100 }, (_, i) => ({
  id: `doc-${i}`,
  vector: generateRandomVector(1536),
  metadata: { index: i },
}));
await store.batchUpsert(indexName, batchDocs, { batchSize: 10 });
```

## Troubleshooting

### Common Issues

1. **Connection Refused**: Ensure the vector database is running
2. **Authentication Failed**: Check API keys and credentials
3. **Index Not Found**: Some adapters require index creation before upsert
4. **Dimension Mismatch**: Ensure vector dimensions match index configuration

### Debug Mode

Enable verbose logging:

```bash
DEBUG=neurolink:vector:* npx tsx test/continuous-test-suite-vector.ts
```

### Test Data Cleanup

If tests fail mid-execution, clean up test indexes:

```bash
# The continuous test suite uses prefix: neurolink-test-
# Clean up manually if needed via your vector database's admin interface
```

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Run Vector Store Tests
  run: |
    pnpm run test:run -- test/vector/
  env:
    PINECONE_API_KEY: ${{ secrets.PINECONE_API_KEY }}
    QDRANT_URL: ${{ secrets.QDRANT_URL }}
```

### Required Secrets

For full CI coverage, configure these repository secrets:

- `PINECONE_API_KEY`
- `QDRANT_API_KEY`
- `WEAVIATE_API_KEY`
- `MONGODB_ATLAS_URI`
- etc.

## Adding New Tests

### For New Adapter

1. Create `test/vector/adapters/NewAdapter.test.ts`
2. Follow existing test patterns
3. Add configuration to `test/fixtures/vector/adapter-configs.json`
4. Update continuous test suite

### For New Filter Operator

1. Add test case to `test/fixtures/vector/metadata-filters.json`
2. Add unit test in relevant adapter test files
3. Update continuous test suite filter tests

## Related Documentation

- [CONFIGURATION.md](./CONFIGURATION.md) - Environment variables
- [VERIFICATION.md](./VERIFICATION.md) - Manual verification checklist
- [CLI-COVERAGE.md](./CLI-COVERAGE.md) - CLI integration status
