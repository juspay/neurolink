[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / RAGConfig

# Type Alias: RAGConfig

> **RAGConfig** = `object`

Defined in: [types/rag.ts:700](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L700)

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

Defined in: [types/rag.ts:702](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L702)

File paths to load and index for retrieval

---

### strategy?

> `optional` **strategy?**: [`ChunkingStrategy`](ChunkingStrategy.md)

Defined in: [types/rag.ts:708](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L708)

Chunking strategy to use. If not specified, auto-detected from file extension.

#### Default

```ts
"recursive";
```

---

### chunkSize?

> `optional` **chunkSize?**: `number`

Defined in: [types/rag.ts:714](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L714)

Maximum chunk size in characters.

#### Default

```ts
1000;
```

---

### chunkOverlap?

> `optional` **chunkOverlap?**: `number`

Defined in: [types/rag.ts:720](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L720)

Overlap between adjacent chunks in characters.

#### Default

```ts
200;
```

---

### topK?

> `optional` **topK?**: `number`

Defined in: [types/rag.ts:726](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L726)

Number of top results to retrieve per query.

#### Default

```ts
5;
```

---

### toolName?

> `optional` **toolName?**: `string`

Defined in: [types/rag.ts:732](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L732)

Tool name visible to the AI model.

#### Default

```ts
"search_knowledge_base";
```

---

### toolDescription?

> `optional` **toolDescription?**: `string`

Defined in: [types/rag.ts:738](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L738)

Tool description for the AI model explaining what the knowledge base contains.

#### Default

```ts
"Search the loaded documents for relevant information to answer the user's question";
```

---

### embeddingProvider?

> `optional` **embeddingProvider?**: `string`

Defined in: [types/rag.ts:744](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L744)

Embedding model provider for generating embeddings.
Defaults to the same provider used for generation.

---

### embeddingModel?

> `optional` **embeddingModel?**: `string`

Defined in: [types/rag.ts:750](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L750)

Embedding model name.
Defaults to the provider's default embedding model.
