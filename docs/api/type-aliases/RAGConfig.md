[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RAGConfig

# Type Alias: RAGConfig

> **RAGConfig** = `object`

Defined in: [types/rag.ts:719](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L719)

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

Defined in: [types/rag.ts:721](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L721)

File paths to load and index for retrieval

---

### strategy?

> `optional` **strategy?**: [`ChunkingStrategy`](ChunkingStrategy.md)

Defined in: [types/rag.ts:727](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L727)

Chunking strategy to use. If not specified, auto-detected from file extension.

#### Default

```ts
"recursive";
```

---

### chunkSize?

> `optional` **chunkSize?**: `number`

Defined in: [types/rag.ts:733](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L733)

Maximum chunk size in characters.

#### Default

```ts
1000;
```

---

### chunkOverlap?

> `optional` **chunkOverlap?**: `number`

Defined in: [types/rag.ts:739](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L739)

Overlap between adjacent chunks in characters.

#### Default

```ts
200;
```

---

### topK?

> `optional` **topK?**: `number`

Defined in: [types/rag.ts:745](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L745)

Number of top results to retrieve per query.

#### Default

```ts
5;
```

---

### toolName?

> `optional` **toolName?**: `string`

Defined in: [types/rag.ts:751](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L751)

Tool name visible to the AI model.

#### Default

```ts
"search_knowledge_base";
```

---

### toolDescription?

> `optional` **toolDescription?**: `string`

Defined in: [types/rag.ts:757](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L757)

Tool description for the AI model explaining what the knowledge base contains.

#### Default

```ts
"Search the loaded documents for relevant information to answer the user's question";
```

---

### embeddingProvider?

> `optional` **embeddingProvider?**: `string`

Defined in: [types/rag.ts:763](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L763)

Embedding model provider for generating embeddings.
Defaults to the same provider used for generation.

---

### embeddingModel?

> `optional` **embeddingModel?**: `string`

Defined in: [types/rag.ts:769](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L769)

Embedding model name.
Defaults to the provider's default embedding model.
