# Storage Integration Tests

## Overview

This directory contains integration tests for storage adapters that require external services (databases, caches, etc.).

## Test Structure

### Unit Tests (test/unit/storage/)

- ✅ MemoryAdapter - Complete
- ✅ StorageFactory - Complete
- ✅ KeyValueStore - Complete
- ⚠️ ThreadManager - Needs API fixes
- ⚠️ WorkflowPersistenceManager - Needs minor fixes

### Integration Tests (test/integration/storage/)

- ⚠️ PostgreSQL Adapter - TODO
- ⚠️ MongoDB Adapter - TODO
- ⚠️ Redis Adapter - TODO
- ⚠️ LibSQL Adapter - TODO
- ⚠️ Connection Pooling - TODO
- ⚠️ Migrations - TODO
- ⚠️ Transactions - TODO

## Running Integration Tests

### Prerequisites

1. **Docker** (for test containers)
2. **PostgreSQL** (for postgres adapter tests)
3. **MongoDB** (for mongodb adapter tests)
4. **Redis** (for redis adapter tests)

### Setup Test Containers

```bash
# Install test containers
pnpm add -D @testcontainers/postgresql @testcontainers/mongodb @testcontainers/redis

# Run integration tests
pnpm test:integration
```

### Environment Variables

```bash
# PostgreSQL
POSTGRES_TEST_URL=postgresql://postgres:password@localhost:5432/neurolink_test

# MongoDB
MONGODB_TEST_URI=mongodb://localhost:27017/neurolink_test

# Redis
REDIS_TEST_URL=redis://localhost:6379
```

## Test Organization

### PostgreSQL Integration Tests (`postgresAdapter.test.ts`)

- Connection management
- Schema creation
- CRUD operations
- Transactions
- Migrations
- Connection pooling
- Performance benchmarks

### MongoDB Integration Tests (`mongodbAdapter.test.ts`)

- Connection management
- Collection creation
- CRUD operations
- Aggregation pipelines
- Indexes
- Performance benchmarks

### Redis Integration Tests (`redisAdapter.test.ts`)

- Connection management
- Key-value operations
- TTL functionality
- Pub/sub (if used)
- Performance benchmarks

### LibSQL Integration Tests (`libsqlAdapter.test.ts`)

- Local file database
- Remote Turso database
- Embedded replicas
- Sync functionality

## Test Patterns

### Using Test Containers (Recommended)

```typescript
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { PostgresAdapter } from "../../../src/lib/storage/adapters/postgresAdapter.js";

describe("PostgresAdapter Integration", () => {
  let container: PostgreSqlContainer;
  let adapter: PostgresAdapter;

  beforeAll(async () => {
    container = await new PostgreSqlContainer().start();
    adapter = new PostgresAdapter({
      connectionString: container.getConnectionString(),
    });
    await adapter.init();
  });

  afterAll(async () => {
    await adapter.close();
    await container.stop();
  });

  it("should connect to PostgreSQL", async () => {
    const health = await adapter.healthCheck();
    expect(health.healthy).toBe(true);
  });
});
```

## TODO: Integration Tests to Create

### High Priority

1. **PostgresAdapter Tests** (~30 tests)
   - Basic CRUD for all entity types
   - Transaction support
   - Migration runner
   - Connection pooling
   - Error handling

2. **MongoDBAdapter Tests** (~30 tests)
   - Basic CRUD for all entity types
   - Index management
   - Aggregation
   - Error handling

3. **RedisAdapter Tests** (~30 tests)
   - Key-value operations
   - TTL support
   - Namespace isolation
   - Error handling

### Medium Priority

4. **LibSQLAdapter Tests** (~20 tests)
   - Local database operations
   - Remote database operations
   - Sync functionality

5. **Connection Pooling Tests** (~15 tests)
   - Pool creation and management
   - Connection acquisition
   - Connection release
   - Pool exhaustion

6. **Migration Tests** (~20 tests)
   - Migration up/down
   - Version tracking
   - Rollback scenarios
   - Data preservation

### Low Priority

7. **Transaction Tests** (~20 tests)
   - ACID compliance
   - Nested transactions
   - Rollback scenarios
   - Isolation levels

8. **Cross-Adapter Tests** (~10 tests)
   - Data portability
   - API consistency
   - Performance comparison

## Coverage Goals

| Component       | Current | Target  |
| --------------- | ------- | ------- |
| MemoryAdapter   | 90%     | ✅ Done |
| StorageFactory  | 85%     | ✅ Done |
| PostgresAdapter | 0%      | 80%     |
| MongoDBAdapter  | 0%      | 80%     |
| RedisAdapter    | 0%      | 80%     |
| LibSQLAdapter   | 0%      | 80%     |
| Infrastructure  | 0%      | 75%     |

**Overall Target:** 80%+ coverage across all storage components
