# Three-Layer Memory System Verification Checklist

This document provides a comprehensive manual verification checklist for the Three-Layer Memory System.

## Pre-Verification Setup

### Environment Setup

- [ ] Node.js 18+ installed
- [ ] pnpm installed
- [ ] Dependencies installed (`pnpm install`)
- [ ] Environment variables configured (see CONFIGURATION.md)

### Required Services (for full verification)

- [ ] Ollama running locally (optional, for local embeddings)
- [ ] Redis Stack running (optional, for Redis vector store)
- [ ] Qdrant running (optional, for Qdrant vector store)
- [ ] PostgreSQL with pgvector (optional, for pgvector store)

---

## Layer 1: Conversation History Layer

### Basic Operations

- [ ] **Add Message** - Add a user message to conversation history

  ```bash
  neurolink chat "Hello, this is a test message" --memory-enabled
  ```

  Expected: Message stored in conversation history

- [ ] **Add Assistant Response** - Verify assistant message is stored

  ```bash
  # Continue conversation
  neurolink chat "What did I just say?" --memory-enabled
  ```

  Expected: Assistant can recall previous message

- [ ] **Multiple Messages** - Add multiple messages in sequence
  ```bash
  neurolink loop --memory-enabled
  > Hello
  > My name is Alex
  > I work as a developer
  > What's my name?
  ```
  Expected: Assistant responds "Alex"

### Message Limits

- [ ] **Default Limit (40 messages)** - Verify limit is enforced
  - Add 45+ messages to a conversation
  - Verify only last 40 messages are retained
  - Verify summarization was triggered

- [ ] **Custom Limit** - Set custom message limit
  ```typescript
  const neurolink = new NeuroLink({
    memory: {
      conversationHistory: { maxMessages: 20 },
    },
  });
  ```

### Summarization

- [ ] **Automatic Summarization** - Verify summarization triggers
  - Add messages until threshold is reached
  - Verify summary is generated
  - Verify summary contains key information

- [ ] **Summary Quality** - Review generated summary
  - Summary should be concise
  - Summary should capture main topics
  - Summary should preserve important facts

### Clear History

- [ ] **Clear Thread** - Clear specific conversation

  ```bash
  neurolink memory clear --thread-id test-thread
  ```

  Expected: Thread history is cleared

- [ ] **Clear All** - Clear all conversation history
  ```bash
  neurolink memory clear --all
  ```
  Expected: All history is cleared

---

## Layer 2: Semantic Recall Layer

### Document Operations

- [ ] **Add Document** - Add document to semantic memory

  ```typescript
  await neurolink.memory.semantic.addDocument({
    id: "doc-001",
    content: "TypeScript is a typed superset of JavaScript",
    metadata: { topic: "programming" },
  });
  ```

- [ ] **Batch Add** - Add multiple documents

  ```typescript
  await neurolink.memory.semantic.addDocuments([
    { id: "doc-002", content: "..." },
    { id: "doc-003", content: "..." },
  ]);
  ```

- [ ] **Delete Document** - Remove document
  ```typescript
  await neurolink.memory.semantic.deleteDocument("doc-001");
  ```

### Search Operations

- [ ] **Basic Search** - Search by text query

  ```typescript
  const results = await neurolink.memory.semantic.search("What is TypeScript?");
  ```

  Expected: Returns relevant documents with scores

- [ ] **Top-K Results** - Limit number of results

  ```typescript
  const results = await neurolink.memory.semantic.search("query", { topK: 3 });
  ```

  Expected: Returns exactly 3 results

- [ ] **Similarity Threshold** - Filter by minimum score

  ```typescript
  const results = await neurolink.memory.semantic.search("query", {
    similarityThreshold: 0.8,
  });
  ```

  Expected: Only results with score >= 0.8

- [ ] **Metadata Filtering** - Filter by metadata
  ```typescript
  const results = await neurolink.memory.semantic.search("query", {
    filter: { topic: "programming" },
  });
  ```
  Expected: Only documents matching filter

### CLI Search

- [ ] **Memory Search Command**
  ```bash
  neurolink memory search "TypeScript programming"
  ```
  Expected: Displays matching documents

### Embedder Verification

For each embedder, verify:

- [ ] **OpenAI Embeddings**
  - [ ] Connection successful
  - [ ] Embeddings generated (1536 dimensions)
  - [ ] Batch processing works

- [ ] **Vertex AI Embeddings**
  - [ ] Authentication successful
  - [ ] Embeddings generated (768 dimensions)
  - [ ] Project/location configuration correct

- [ ] **Cohere Embeddings**
  - [ ] API connection successful
  - [ ] Embeddings generated (1024 dimensions)
  - [ ] Input type handled correctly

- [ ] **Mistral Embeddings**
  - [ ] API connection successful
  - [ ] Embeddings generated (1024 dimensions)

- [ ] **Ollama Embeddings** (Local)
  - [ ] Ollama server reachable
  - [ ] Model downloaded
  - [ ] Embeddings generated (768 dimensions)

- [ ] **Bedrock Embeddings**
  - [ ] AWS credentials valid
  - [ ] Embeddings generated (1536 dimensions)

### Vector Store Verification

For each vector store, verify:

- [ ] **In-Memory Store**
  - [ ] Documents stored correctly
  - [ ] Search returns correct results
  - [ ] Delete removes documents

- [ ] **Redis Store**
  - [ ] Connection established
  - [ ] Index created
  - [ ] CRUD operations work
  - [ ] Hybrid search works (if enabled)

- [ ] **Qdrant Store**
  - [ ] Connection established
  - [ ] Collection created
  - [ ] CRUD operations work
  - [ ] Metadata filtering works

- [ ] **pgvector Store**
  - [ ] Database connection established
  - [ ] Table/index created
  - [ ] CRUD operations work
  - [ ] Transactions work

- [ ] **Pinecone Store**
  - [ ] API connection established
  - [ ] Index exists/created
  - [ ] Namespace handling correct
  - [ ] CRUD operations work

---

## Layer 3: Working Memory Layer

### Profile Operations

- [ ] **Create Profile** - Create new user profile

  ```typescript
  await neurolink.memory.working.createProfile("user-001", {
    name: "Alex Chen",
    role: "Developer",
  });
  ```

- [ ] **Get Profile** - Retrieve user profile

  ```typescript
  const profile = await neurolink.memory.working.getProfile("user-001");
  ```

  Expected: Returns profile data

- [ ] **Update Profile** - Update profile data

  ```typescript
  await neurolink.memory.working.updateProfile("user-001", {
    role: "Senior Developer",
  });
  ```

  Expected: Profile updated, version incremented

- [ ] **Delete Profile** - Remove user profile
  ```typescript
  await neurolink.memory.working.deleteProfile("user-001");
  ```

### Template Mode

- [ ] **Template Rendering** - Verify template renders correctly

  ```typescript
  const rendered = await neurolink.memory.working.renderProfile("user-001");
  ```

  Expected: Markdown with populated values

- [ ] **Template Variables** - All variables populated
- [ ] **Handlebars Helpers** - `{{#each}}`, `{{#if}}` work correctly

### Schema Mode

- [ ] **Schema Validation - Valid Data**

  ```typescript
  // Should succeed
  await neurolink.memory.working.updateProfile("user-001", {
    name: "Valid Name",
    email: "valid@email.com",
  });
  ```

- [ ] **Schema Validation - Invalid Data**
  ```typescript
  // Should fail with validation error
  await neurolink.memory.working.updateProfile("user-001", {
    name: "Valid",
    email: "not-an-email",
  });
  ```
  Expected: Validation error thrown

### Persistence

- [ ] **Profile Persistence** - Profile survives restart
  - Create profile
  - Restart application
  - Verify profile still exists

---

## MemoryCoordinator

### Initialization

- [ ] **Default Initialization**

  ```typescript
  const coordinator = new MemoryCoordinator();
  ```

  Expected: All three layers initialized

- [ ] **Custom Configuration**
  ```typescript
  const coordinator = new MemoryCoordinator({
    tokenBudget: { total: 8000 },
  });
  ```

### Context Generation

- [ ] **Get Context for Generation**

  ```typescript
  const context = await coordinator.getContextForGeneration({
    userId: "user-001",
    threadId: "thread-001",
    query: "current question",
  });
  ```

  Expected: Combined context from all layers

- [ ] **Token Budget Respected** - Total tokens within budget
- [ ] **Layer Prioritization** - Layers prioritized correctly

### Integration with NeuroLink

- [ ] **SDK Integration**

  ```typescript
  const result = await neurolink.generate({
    prompt: "Hello",
    memory: { enabled: true },
  });
  ```

  Expected: Memory context included in generation

- [ ] **Streaming with Memory**
  ```typescript
  for await (const chunk of neurolink.stream({
    prompt: "Hello",
    memory: { enabled: true },
  })) {
    // ...
  }
  ```

---

## CLI Commands

### neurolink memory list

- [ ] **List Threads**

  ```bash
  neurolink memory list
  ```

  Expected: Lists all conversation threads

- [ ] **List with Filter**
  ```bash
  neurolink memory list --user-id user-001
  ```

### neurolink memory clear

- [ ] **Clear Thread**

  ```bash
  neurolink memory clear --thread-id thread-001
  ```

- [ ] **Clear All**
  ```bash
  neurolink memory clear --all --confirm
  ```

### neurolink memory export

- [ ] **Export to JSON**

  ```bash
  neurolink memory export --output memory-backup.json
  ```

  Expected: JSON file created with memory data

- [ ] **Export Specific Thread**
  ```bash
  neurolink memory export --thread-id thread-001 --output thread.json
  ```

### neurolink memory import

- [ ] **Import from JSON**
  ```bash
  neurolink memory import --input memory-backup.json
  ```
  Expected: Memory data restored

### neurolink memory stats

- [ ] **Show Statistics**
  ```bash
  neurolink memory stats
  ```
  Expected: Displays memory statistics (threads, documents, profiles)

### neurolink memory search

- [ ] **Search Semantic Memory**
  ```bash
  neurolink memory search "TypeScript programming"
  ```
  Expected: Displays matching documents with scores

---

## Error Handling

### Embedder Errors

- [ ] **Missing API Key** - Graceful error message
- [ ] **Rate Limiting** - Retry with backoff
- [ ] **Network Error** - Appropriate error message

### Vector Store Errors

- [ ] **Connection Failed** - Clear error message
- [ ] **Index Not Found** - Auto-create or clear error
- [ ] **Dimension Mismatch** - Descriptive error

### Memory Coordinator Errors

- [ ] **Layer Unavailable** - Graceful degradation
- [ ] **Token Budget Exceeded** - Truncation works

---

## Performance

- [ ] **Embedding Generation** - < 500ms for single text
- [ ] **Batch Embedding** - < 5s for 100 texts
- [ ] **Vector Search** - < 100ms for top-5
- [ ] **Context Generation** - < 1s total

---

## Sign-Off

| Section              | Verified By | Date | Notes |
| -------------------- | ----------- | ---- | ----- |
| Conversation History |             |      |       |
| Semantic Recall      |             |      |       |
| Working Memory       |             |      |       |
| MemoryCoordinator    |             |      |       |
| CLI Commands         |             |      |       |
| Error Handling       |             |      |       |
| Performance          |             |      |       |

**Overall Status:** [ ] PASSED / [ ] FAILED

**Verified By:** **\*\*\*\***\_\_\_**\*\*\*\***

**Date:** **\*\*\*\***\_\_\_**\*\*\*\***

**Notes:**
