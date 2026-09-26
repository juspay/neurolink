[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RAGConfig

# Type Alias: RAGConfig

> **RAGConfig** = `object`

RAG configuration for generate() and stream() APIs.

When provided, NeuroLink automatically:

1. Loads the specified files
2. Chunks them using the selected strategy
3. Generates embeddings
4. Stores in an in-memory vector store
5. Creates a search tool the AI can invoke on demand

## Example

```typescript
const result = await neurolink.generate({
  input: { text: "What is RAG?" },
  provider: "vertex",
  rag: {
    files: ["./docs/guide.md", "./docs/api.md"],
    strategy: "markdown",
    chunkSize: 512,
    topK: 5,
  },
});
```

## Properties

### files

> **files**: `string`[]

File paths to load and index for retrieval

---

### strategy?

> `optional` **strategy?**: [`ChunkingStrategy`](ChunkingStrategy.md)

Chunking strategy to use. If not specified, auto-detected from file extension.

#### Default

```ts
"recursive";
```

---

### chunkSize?

> `optional` **chunkSize?**: `number`

Maximum chunk size in characters.

#### Default

```ts
1000;
```

---

### chunkOverlap?

> `optional` **chunkOverlap?**: `number`

Overlap between adjacent chunks in characters.

#### Default

```ts
200;
```

---

### topK?

> `optional` **topK?**: `number`

Number of top results to retrieve per query.

#### Default

```ts
5;
```

---

### toolName?

> `optional` **toolName?**: `string`

Tool name visible to the AI model.

#### Default

```ts
"search_knowledge_base";
```

---

### toolDescription?

> `optional` **toolDescription?**: `string`

Tool description for the AI model explaining what the knowledge base contains.

#### Default

```ts
"Search the loaded documents for relevant information to answer the user's question";
```

---

### embeddingProvider?

> `optional` **embeddingProvider?**: `string`

Embedding model provider for generating embeddings.
Defaults to the same provider used for generation.

---

### embeddingModel?

> `optional` **embeddingModel?**: `string`

Embedding model name.
Defaults to the provider's default embedding model.
