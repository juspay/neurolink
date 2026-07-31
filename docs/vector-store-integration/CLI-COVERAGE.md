# Vector Store Integration - CLI Coverage

## Status: NO CLI COMMANDS IMPLEMENTED

**This is a documented GAP in the current implementation.**

## Current State

The Vector Store Integration feature (22 adapters) is **fully implemented as an SDK/library feature** but has **NO CLI commands** for direct command-line interaction.

### What's Available

| Component         | Status                     |
| ----------------- | -------------------------- |
| SDK API           | ✅ Complete                |
| TypeScript Types  | ✅ Complete                |
| Unit Tests        | ✅ Complete (44,935 lines) |
| Integration Tests | ✅ Complete                |
| Documentation     | ✅ Complete                |
| **CLI Commands**  | ❌ **NOT IMPLEMENTED**     |

## Proposed CLI Commands (Not Implemented)

If CLI support were to be added, these commands would be useful:

### Store Management

```bash
# List available vector stores
neurolink vector list-stores

# Check store health
neurolink vector health --store pinecone

# Get store statistics
neurolink vector stats --store pinecone --index my-index
```

### Index Management

```bash
# Create an index
neurolink vector create-index --store chroma --name my-index --dimension 1536 --metric cosine

# List indexes
neurolink vector list-indexes --store chroma

# Delete an index
neurolink vector delete-index --store chroma --name my-index

# Check if index exists
neurolink vector index-exists --store chroma --name my-index
```

### Vector Operations

```bash
# Upsert vectors from file
neurolink vector upsert --store chroma --index my-index --file vectors.json

# Query vectors
neurolink vector query --store chroma --index my-index --vector "0.1,0.2,0.3,..." --top-k 10

# Delete vectors
neurolink vector delete --store chroma --index my-index --ids "id1,id2,id3"
```

### Configuration

```bash
# Configure store credentials
neurolink vector config --store pinecone --api-key YOUR_KEY

# Test connection
neurolink vector test-connection --store pinecone
```

## Workarounds

### Option 1: Use SDK Programmatically

```typescript
import { VectorStoreFactory } from "neurolink";

const store = await VectorStoreFactory.createStore("chroma", {
  path: "./my-vectors",
});

await store.connect();
// ... perform operations
await store.disconnect();
```

### Option 2: Create Custom CLI Script

```typescript
#!/usr/bin/env tsx
// scripts/vector-cli.ts

import { VectorStoreFactory } from "../src/lib/vector/VectorStoreFactory.js";

const [, , command, ...args] = process.argv;

switch (command) {
  case "list-stores":
    console.log(VectorStoreFactory.getAvailableStores());
    break;
  case "health":
    // ... implement health check
    break;
  default:
    console.log("Unknown command");
}
```

### Option 3: Use Node REPL

```bash
node --experimental-repl-await
> const { VectorStoreFactory } = await import("./dist/lib/vector/VectorStoreFactory.js")
> VectorStoreFactory.getAvailableStores()
```

## Why No CLI?

1. **Complexity**: Vector operations require complex inputs (vectors, metadata)
2. **Credentials**: Each adapter has different credential requirements
3. **Priority**: SDK usage is the primary use case
4. **Scope**: Initial implementation focused on API completeness

## Future Work

If CLI support is prioritized:

1. Add `src/cli/commands/vector.ts`
2. Implement subcommands using yargs
3. Add credential management
4. Support JSON file input/output
5. Add interactive mode for queries

## Related Issues

- No GitHub issues currently tracking CLI support
- Feature request can be submitted to the NeuroLink repository

## Comparison with Other Features

| Feature           | SDK Support | CLI Support |
| ----------------- | ----------- | ----------- |
| AI Providers      | ✅          | ✅          |
| MCP Tools         | ✅          | ✅          |
| Memory            | ✅          | ✅          |
| **Vector Stores** | ✅          | ❌          |
| Workflows         | ✅          | Partial     |
| Agents            | ✅          | ❌          |

## Conclusion

The Vector Store Integration is fully functional as an SDK feature. CLI support would enhance usability for:

- Quick testing
- DevOps automation
- Script integration
- Interactive exploration

However, for most production use cases, the SDK API is the recommended approach.
