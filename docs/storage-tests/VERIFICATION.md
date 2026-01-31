# Storage Abstraction Manual Verification Checklist

Use this checklist to manually verify the Storage Abstraction implementation before release.

## Pre-Verification Setup

- [ ] Clean development environment
- [ ] Latest dependencies installed (`pnpm install`)
- [ ] All automated tests passing (`pnpm vitest run test/storage/`)

---

## 1. StorageFactory Verification

### 1.1 Provider Registration

- [ ] All 8 providers register without errors

  ```typescript
  await StorageFactory.registerAllProviders();
  console.log(StorageFactory.getRegisteredTypes());
  // Expected: ['memory', 'file', 'libsql', 'postgresql', 'mongodb', 'redis', 's3']
  ```

- [ ] Aliases resolve correctly
  - [ ] `mem` → `memory`
  - [ ] `postgres`/`pg` → `postgresql`
  - [ ] `mongo` → `mongodb`
  - [ ] `sqlite`/`turso` → `libsql`
  - [ ] `ioredis`/`cache` → `redis`

### 1.2 Provider Creation

- [ ] Memory adapter creates successfully
- [ ] LibSQL adapter creates with `file::memory:`
- [ ] Error thrown for unknown provider type
- [ ] Error message includes available providers

### 1.3 Singleton Pattern

- [ ] `getOrCreate()` returns same instance
- [ ] Different instance keys return different instances
- [ ] `clearInstances()` closes all and allows new instances

---

## 2. CRUD Operations Verification

### 2.1 Thread Operations

- [ ] **Create**: Returns thread with generated ID, timestamps
- [ ] **Read**: Returns thread by ID, null for non-existent
- [ ] **Update**: Updates fields, updates `updatedAt`
- [ ] **Delete**: Returns true, thread no longer retrievable
- [ ] **List**: Returns paginated results with `total`, `hasMore`
- [ ] **Filter by resourceId**: Only matching threads returned
- [ ] **Filter by status**: Only matching status returned

### 2.2 Message Operations

- [ ] **Create**: Returns message linked to thread
- [ ] **Batch Create**: Multiple messages in correct order
- [ ] **Read**: Returns message by ID
- [ ] **Update**: Content and metadata updated
- [ ] **Delete**: Returns true, message removed
- [ ] **List by Thread**: Only messages for given thread
- [ ] **Filter by Role**: user/assistant/system filtering works
- [ ] **Cascade Delete**: Messages deleted when thread deleted

### 2.3 Workflow Run Operations

- [ ] **Save (Create)**: New run with generated ID
- [ ] **Save (Update)**: Updates existing run
- [ ] **Get by ID**: Returns run with all fields
- [ ] **List**: Paginated with filters
- [ ] **Update Status**: Status changes correctly
- [ ] **Update Step Result**: Step results stored properly
- [ ] **Filter by workflowId**: Only matching runs
- [ ] **Filter by status**: completed/failed/running

### 2.4 Custom Record Operations

- [ ] **Set**: Creates record with namespace/key
- [ ] **Get**: Retrieves by namespace/key
- [ ] **Delete**: Removes record
- [ ] **Has**: Returns true/false correctly
- [ ] **List by Namespace**: Only records in namespace
- [ ] **Delete Namespace**: All records in namespace removed
- [ ] **TTL**: Records expire after TTL
- [ ] **Metadata**: Metadata stored and retrieved

---

## 3. Migration System Verification

### 3.1 Registration

- [ ] Built-in migrations available (`builtInMigrations`)
- [ ] Custom migrations can be registered
- [ ] Duplicate version throws error
- [ ] Invalid migration (empty version) throws error

### 3.2 Execution

- [ ] `migrateUp()` applies all pending
- [ ] `migrateUp(version)` applies up to version
- [ ] `migrateDown()` reverts last migration
- [ ] `migrateDown(version)` reverts to version
- [ ] Dry-run mode doesn't apply changes
- [ ] `reset()` runs down then up

### 3.3 Status

- [ ] `getStatus()` returns applied, pending, current
- [ ] Applied migrations recorded in tracking table
- [ ] Version order is respected

---

## 4. Connection Pool Verification

### 4.1 Initialization

- [ ] Pool initializes with minSize connections
- [ ] Stats show correct idle/active counts

### 4.2 Acquisition

- [ ] `acquire()` returns connection
- [ ] `release()` returns connection to pool
- [ ] `withConnection()` auto-releases on success
- [ ] `withConnection()` auto-releases on error

### 4.3 Limits

- [ ] maxSize enforced
- [ ] Wait when pool exhausted
- [ ] Timeout when wait exceeds limit

### 4.4 Health

- [ ] Invalid connections replaced
- [ ] All connections closed on pool close

---

## 5. Transaction System Verification

### 5.1 Basic Transactions

- [ ] Transaction begins successfully
- [ ] Commit persists changes
- [ ] Rollback reverts changes
- [ ] Nested transactions (if supported)

### 5.2 Error Handling

- [ ] Automatic rollback on error
- [ ] Retryable errors trigger retry
- [ ] Non-retryable errors propagate

### 5.3 TransactionManager

- [ ] Creates tracked transactions
- [ ] `executeInTransaction()` auto-commits
- [ ] Active transaction count accurate
- [ ] `cancelAllTransactions()` cleans up

---

## 6. High-Level Manager Verification

### 6.1 ThreadManager

- [ ] `createThread()` with resourceId, title
- [ ] `addMessage()` adds to thread
- [ ] `addUserMessage()`, `addAssistantMessage()` shortcuts work
- [ ] `getThreadWithMessages()` returns both
- [ ] `archiveThread()`, `unarchiveThread()` toggle status

### 6.2 KeyValueStore

- [ ] `set()` and `get()` work
- [ ] `has()` returns correct boolean
- [ ] `delete()` removes key
- [ ] `keys()` lists all keys
- [ ] `clear()` removes all

### 6.3 WorkflowPersistenceManager

- [ ] `startRun()` creates running workflow
- [ ] `completeRun()` sets completed status
- [ ] `failRun()` sets failed with error
- [ ] `startStep()`, `completeStep()` track progress
- [ ] `suspendRun()`, `resumeRun()` work
- [ ] `getWorkflowAnalytics()` returns stats

---

## 7. Health and Statistics Verification

### 7.1 Health Check

- [ ] `healthCheck()` returns healthy: true
- [ ] Latency measured correctly
- [ ] Backend type reported

### 7.2 Statistics

- [ ] `getStats()` returns accurate counts
- [ ] Thread count matches actual threads
- [ ] Message count matches actual messages
- [ ] Counts update after operations

### 7.3 Clear All

- [ ] `clearAll()` removes all data
- [ ] Stats show zeros after clear

---

## 8. Edge Case Verification

### 8.1 Special Characters

- [ ] Keys with special characters work
- [ ] Content with special characters preserved
- [ ] Unicode content preserved (emojis, CJK)

### 8.2 Large Data

- [ ] Large content (100KB) stores and retrieves
- [ ] Deeply nested JSON preserved
- [ ] Large arrays preserved

### 8.3 Concurrency

- [ ] 50 concurrent creates succeed
- [ ] All IDs unique
- [ ] No data corruption

---

## 9. Adapter-Specific Verification

### 9.1 Memory Adapter

- [ ] Fast (< 1ms operations)
- [ ] Data cleared on close
- [ ] LRU eviction works (if configured)

### 9.2 LibSQL Adapter

- [ ] `file::memory:` works
- [ ] File persistence works
- [ ] WAL mode functional

### 9.3 PostgreSQL Adapter

- [ ] Connects to database
- [ ] Pool management correct
- [ ] Transactions work
- [ ] JSONB operations work

### 9.4 MongoDB Adapter

- [ ] Connects to database
- [ ] Collections created
- [ ] Indexes created
- [ ] Aggregations work

### 9.5 Redis Adapter

- [ ] Connects to server
- [ ] Key prefixing works
- [ ] TTL works
- [ ] Limited query capability documented

### 9.6 S3 Adapter

- [ ] Bucket access works
- [ ] Object CRUD works
- [ ] Prefix isolation works

---

## 10. Interface Consistency Verification

Verify all adapters implement the same interface:

- [ ] `init()` - Initialize adapter
- [ ] `close()` - Clean shutdown
- [ ] `healthCheck()` - Health status
- [ ] `getStats()` - Statistics
- [ ] `clearAll()` - Clear all data
- [ ] Thread operations (create, get, update, delete, list)
- [ ] Message operations (create, createMany, get, update, delete, list)
- [ ] Workflow operations (save, get, update, list)
- [ ] Record operations (set, get, delete, has, list, deleteNamespace)

---

## Sign-Off

| Verifier | Date | Result              |
| -------- | ---- | ------------------- |
|          |      | [ ] PASS / [ ] FAIL |

### Notes

_Add any issues found or notes from verification:_

```

```

### Issues Found

| Issue | Severity | Description | Resolution |
| ----- | -------- | ----------- | ---------- |
|       |          |             |            |
