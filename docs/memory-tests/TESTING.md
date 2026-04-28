# Three-Layer Memory System Testing Guide

This document describes how to run and understand the test suite for NeuroLink's Three-Layer Memory System.

## Overview

The Three-Layer Memory System provides intelligent context management through:

1. **Conversation History Layer** - Recent messages with automatic summarization
2. **Semantic Recall Layer** - Vector-based similarity search for relevant context
3. **Working Memory Layer** - Persistent structured user profiles

## Prerequisites

### Required Software

- Node.js 18+ (LTS recommended)
- pnpm 8+ (package manager)
- TypeScript 5.x

### Required API Keys (for integration tests)

```bash
# Embedder providers (at least one required)
OPENAI_API_KEY=sk-...          # OpenAI embeddings
COHERE_API_KEY=...             # Cohere embeddings
MISTRAL_API_KEY=...            # Mistral embeddings

# Google Cloud (for Vertex AI embeddings)
GOOGLE_CLOUD_PROJECT=your-project
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json

# AWS (for Bedrock embeddings)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

### Optional External Services

```bash
# Vector stores (for integration tests)
REDIS_URL=redis://localhost:6379
QDRANT_URL=http://localhost:6333
DATABASE_URL=postgresql://localhost:5432/neurolink
PINECONE_API_KEY=...
PINECONE_ENVIRONMENT=...
```

### Local Services Setup

**Ollama (for local embeddings):**

```bash
# Install Ollama
brew install ollama  # macOS
# or download from https://ollama.ai

# Pull embedding model
ollama pull nomic-embed-text

# Start Ollama server
ollama serve
```

**Redis Stack (for vector store):**

```bash
# Using Docker
docker run -d --name redis-stack -p 6379:6379 redis/redis-stack:latest
```

**Qdrant (for vector store):**

```bash
# Using Docker
docker run -d --name qdrant -p 6333:6333 qdrant/qdrant
```

## Running Tests

### Quick Start

```bash
# Navigate to the worktree
cd /path/to/feat/three-layer-memory

# Install dependencies
pnpm install

# Run all memory tests
npx tsx test/continuous-test-suite-memory.ts
```

### Running Specific Test Suites

```bash
# Run unit tests only
npx tsx test/continuous-test-suite-memory.ts --suite unit

# Run integration tests only
npx tsx test/continuous-test-suite-memory.ts --suite integration

# Run CLI tests only
npx tsx test/continuous-test-suite-memory.ts --suite cli
```

### Running with Vitest

```bash
# Run memory-specific unit tests
pnpm vitest run test/memory/

# Run with coverage
pnpm vitest run test/memory/ --coverage

# Watch mode
pnpm vitest test/memory/
```

### Environment-Specific Runs

```bash
# Development (uses in-memory store, Ollama embeddings)
NODE_ENV=development npx tsx test/continuous-test-suite-memory.ts

# Testing (uses mocks, OpenAI embeddings)
NODE_ENV=test npx tsx test/continuous-test-suite-memory.ts

# Integration (requires external services)
NODE_ENV=integration npx tsx test/continuous-test-suite-memory.ts
```

## Test Categories

### 1. Conversation History Layer Tests

Tests for recent message storage and summarization.

| Test                | Description                               |
| ------------------- | ----------------------------------------- |
| `addMessage`        | Add messages to thread history            |
| `getRecentMessages` | Retrieve N most recent messages           |
| `clearHistory`      | Clear conversation history                |
| `summarization`     | Trigger summarization when limit exceeded |
| `tokenAllocation`   | Verify 60% token allocation               |

### 2. Semantic Recall Layer Tests

Tests for vector-based document retrieval.

| Test                | Description                 |
| ------------------- | --------------------------- |
| `addDocument`       | Add document with embedding |
| `similaritySearch`  | Find similar documents      |
| `metadataFiltering` | Filter search by metadata   |
| `deleteDocument`    | Remove document from store  |
| `batchOperations`   | Bulk add/delete operations  |
| `tokenAllocation`   | Verify 25% token allocation |

### 3. Working Memory Layer Tests

Tests for persistent user profile storage.

| Test                | Description                 |
| ------------------- | --------------------------- |
| `getProfile`        | Retrieve user profile       |
| `updateProfile`     | Update profile data         |
| `createProfile`     | Create new profile          |
| `deleteProfile`     | Delete profile              |
| `schemaValidation`  | Validate against schema     |
| `templateRendering` | Render profile template     |
| `tokenAllocation`   | Verify 15% token allocation |

### 4. MemoryCoordinator Tests

Tests for orchestrating all three layers.

| Test                      | Description                     |
| ------------------------- | ------------------------------- |
| `initialization`          | Initialize with all layers      |
| `configureTokenBudget`    | Set token allocation per layer  |
| `getContextForGeneration` | Retrieve combined context       |
| `prioritization`          | Prioritize context by relevance |
| `persistence`             | Save/load coordinator state     |

### 5. Embedder Tests

Tests for all 6 embedder providers.

| Embedder | Model                      | Dimensions |
| -------- | -------------------------- | ---------- |
| OpenAI   | text-embedding-3-small     | 1536       |
| Vertex   | textembedding-gecko@003    | 768        |
| Cohere   | embed-english-v3.0         | 1024       |
| Mistral  | mistral-embed              | 1024       |
| Ollama   | nomic-embed-text           | 768        |
| Bedrock  | amazon.titan-embed-text-v1 | 1536       |

### 6. Vector Store Tests

Tests for all 5 vector store backends.

| Store    | Type        | Features                      |
| -------- | ----------- | ----------------------------- |
| Memory   | In-memory   | Fast, no persistence          |
| Redis    | Redis Stack | Persistence, hybrid search    |
| Qdrant   | Dedicated   | High performance, filtering   |
| PGVector | PostgreSQL  | SQL integration, transactions |
| Pinecone | Managed     | Serverless, scalable          |

### 7. CLI Tests

Tests for memory-related CLI commands.

| Command         | Description               |
| --------------- | ------------------------- |
| `memory list`   | List conversation threads |
| `memory clear`  | Clear memory data         |
| `memory export` | Export memory to file     |
| `memory import` | Import memory from file   |
| `memory stats`  | Show memory statistics    |
| `memory search` | Search semantic memory    |

## Test Output

### Console Output

```
╔═══════════════════════════════════════════════════════════════╗
║     Three-Layer Memory System - Continuous Test Suite         ║
╠═══════════════════════════════════════════════════════════════╣
║  Tests: 45    Passed: 43    Failed: 1    Skipped: 1          ║
║  Duration: 24.5s                                              ║
╚═══════════════════════════════════════════════════════════════╝
```

### JSON Report

Tests generate a JSON report at `test/reports/memory-test-results.json`:

```json
{
  "timestamp": "2026-01-15T10:00:00Z",
  "summary": {
    "total": 45,
    "passed": 43,
    "failed": 1,
    "skipped": 1,
    "duration": 24500
  },
  "suites": [...]
}
```

## Troubleshooting

### Common Issues

**"Ollama connection refused"**

```bash
# Ensure Ollama is running
ollama serve
```

**"Redis connection failed"**

```bash
# Check Redis is running
docker ps | grep redis
# Start if needed
docker start redis-stack
```

**"Embeddings dimension mismatch"**

- Ensure the embedder model matches the vector store index dimensions
- Recreate the vector store index if switching embedders

**"API rate limit exceeded"**

- Add delays between tests with `--delay 1000`
- Use local embedder (Ollama) for development

### Debug Mode

```bash
# Enable verbose logging
DEBUG=neurolink:memory:* npx tsx test/continuous-test-suite-memory.ts

# Log all API calls
DEBUG=neurolink:* npx tsx test/continuous-test-suite-memory.ts
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Memory Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      redis:
        image: redis/redis-stack:latest
        ports:
          - 6379:6379
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "pnpm"
      - run: pnpm install
      - run: npx tsx test/continuous-test-suite-memory.ts
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          REDIS_URL: redis://localhost:6379
```

## Related Documentation

- [CONFIGURATION.md](./CONFIGURATION.md) - Detailed configuration options
- [VERIFICATION.md](./VERIFICATION.md) - Manual verification checklist
- [CLI-COVERAGE.md](./CLI-COVERAGE.md) - CLI command coverage status
