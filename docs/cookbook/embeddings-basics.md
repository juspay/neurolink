# Embeddings Basics

## Problem

Many AI applications need to compare text semantically -- finding similar documents, powering search, clustering content, or building recommendation systems. Raw text comparison (string matching) misses synonyms, paraphrases, and conceptual similarity.

## Solution

Use NeuroLink's `embed()` and `embedMany()` provider methods to generate vector embeddings. These fixed-length number arrays capture the semantic meaning of text, enabling similarity comparisons with cosine similarity or dot product.

## Code

```typescript
import { NeuroLink, ProviderFactory } from "@juspay/neurolink";

// -----------------------------------------------------------
// 1. Generate a single embedding
// -----------------------------------------------------------
async function singleEmbedding() {
  const provider = await ProviderFactory.createProvider(
    "openai",
    "text-embedding-3-small",
  );

  const embedding = await provider.embed(
    "The quick brown fox jumps over the lazy dog.",
  );

  console.log("Embedding dimensions:", embedding.length);
  console.log("First 5 values:", embedding.slice(0, 5));
}

// -----------------------------------------------------------
// 2. Generate embeddings for multiple texts
// -----------------------------------------------------------
async function batchEmbeddings() {
  const provider = await ProviderFactory.createProvider(
    "openai",
    "text-embedding-3-small",
  );

  const texts = [
    "Machine learning is a subset of artificial intelligence.",
    "Deep learning uses neural networks with many layers.",
    "The weather forecast predicts rain tomorrow.",
    "Neural networks are inspired by the human brain.",
  ];

  const embeddings = await provider.embedMany(texts);

  console.log(`Generated ${embeddings.length} embeddings`);
  console.log(`Each has ${embeddings[0].length} dimensions`);
}

// -----------------------------------------------------------
// 3. Compare similarity between texts
// -----------------------------------------------------------
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector length mismatch: ${a.length} vs ${b.length}`);
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) {
    return 0; // Guard against zero-norm vectors
  }

  return dotProduct / denominator;
}

async function compareSimilarity() {
  const provider = await ProviderFactory.createProvider(
    "openai",
    "text-embedding-3-small",
  );

  const texts = [
    "How do I reset my password?", // [0] Query
    "To change your password, go to Settings > Security > Reset Password.", // [1] Relevant
    "Our office hours are 9am to 5pm Monday through Friday.", // [2] Irrelevant
    "Forgot your password? Click the reset link on the login page.", // [3] Relevant
  ];

  const embeddings = await provider.embedMany(texts);

  const query = embeddings[0];

  console.log('Similarity scores against: "How do I reset my password?"');
  console.log("---");

  for (let i = 1; i < texts.length; i++) {
    const score = cosineSimilarity(query, embeddings[i]);
    console.log(`${score.toFixed(4)} | "${texts[i].slice(0, 60)}..."`);
  }
}

// -----------------------------------------------------------
// 4. Simple semantic search
// -----------------------------------------------------------
async function semanticSearch(
  query: string,
  documents: string[],
  topK: number = 3,
) {
  const provider = await ProviderFactory.createProvider(
    "openai",
    "text-embedding-3-small",
  );

  // Embed all documents and the query
  const allTexts = [query, ...documents];
  const embeddings = await provider.embedMany(allTexts);

  const queryEmbedding = embeddings[0];
  const docEmbeddings = embeddings.slice(1);

  // Score each document
  const scored = documents.map((doc, i) => ({
    document: doc,
    score: cosineSimilarity(queryEmbedding, docEmbeddings[i]),
  }));

  // Sort by score descending and return top K
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

// -----------------------------------------------------------
// Usage
// -----------------------------------------------------------
async function main() {
  console.log("=== Single Embedding ===\n");
  await singleEmbedding();

  console.log("\n=== Batch Embeddings ===\n");
  await batchEmbeddings();

  console.log("\n=== Similarity Comparison ===\n");
  await compareSimilarity();

  console.log("\n=== Semantic Search ===\n");
  const results = await semanticSearch("How do I deploy to production?", [
    "Deployment guide: Use CI/CD pipelines to push to production.",
    "Our company was founded in 2015 in San Francisco.",
    "To deploy, run `npm run build` then `npm run deploy`.",
    "Production deployments require approval from the team lead.",
    "The cafeteria menu changes every week.",
  ]);

  for (const result of results) {
    console.log(`${result.score.toFixed(4)} | "${result.document}"`);
  }
}

main();
```

## Explanation

### 1. Provider Setup for Embeddings

Embedding models are accessed through the provider directly via `ProviderFactory`. Each provider has a default embedding model:

| Provider         | Default Embedding Model        | Dimensions |
| ---------------- | ------------------------------ | ---------- |
| OpenAI           | `text-embedding-3-small`       | 1536       |
| Google AI Studio | `gemini-embedding-001`         | 3072       |
| Google Vertex    | `text-embedding-004`           | 768        |
| Amazon Bedrock   | `amazon.titan-embed-text-v2:0` | 1024       |

> **Note:** Google's `text-embedding-004` is being retired. The recommended replacement is `gemini-embedding-001` (3072 dimensions). Override the default with `VERTEX_EMBEDDING_MODEL=gemini-embedding-001`.

```typescript
const provider = await ProviderFactory.createProvider(
  "openai",
  "text-embedding-3-small",
);
```

### 2. `embed()` vs `embedMany()`

- **`embed(text)`**: Generates a single embedding vector. Use for one-off queries.
- **`embedMany(texts)`**: Generates embeddings for an array of texts in one API call. More efficient for batches.

```typescript
const single = await provider.embed("Hello world"); // number[]
const batch = await provider.embedMany(["Hello", "World"]); // number[][]
```

### 3. Cosine Similarity

Cosine similarity measures the angle between two vectors. Values range from -1 to 1:

- **1.0**: Identical meaning
- **0.0**: Unrelated
- **-1.0**: Opposite meaning (rare with embedding models)

In practice, similar texts score above 0.7 and unrelated texts score below 0.4.

### 4. Semantic Search Pattern

The core semantic search pattern is:

1. Embed all documents once (store the vectors)
2. Embed the user's query at search time
3. Compute cosine similarity between the query and each document
4. Return the top K highest-scoring documents

## Variations

### Cache Embeddings for Repeated Searches

Avoid re-embedding documents on every search:

```typescript
class EmbeddingCache {
  private cache = new Map<string, number[]>();
  private provider: any;

  constructor(provider: any) {
    this.provider = provider;
  }

  async getEmbedding(text: string): Promise<number[]> {
    if (this.cache.has(text)) {
      return this.cache.get(text)!;
    }

    const embedding = await this.provider.embed(text);
    this.cache.set(text, embedding);
    return embedding;
  }

  async getEmbeddings(texts: string[]): Promise<number[][]> {
    const uncached = texts.filter((t) => !this.cache.has(t));

    if (uncached.length > 0) {
      const newEmbeddings = await this.provider.embedMany(uncached);
      uncached.forEach((text, i) => this.cache.set(text, newEmbeddings[i]));
    }

    return texts.map((t) => this.cache.get(t)!);
  }
}
```

### Use with Google AI Studio

Switch to Google's embedding model:

```typescript
const provider = await ProviderFactory.createProvider(
  "google-ai",
  "gemini-embedding-001",
);

const embedding = await provider.embed(
  "Semantic search with Gemini embeddings.",
);
console.log("Dimensions:", embedding.length); // 3072
```

### Combine Embeddings with RAG

Use embeddings as the foundation for RAG (Retrieval-Augmented Generation):

```typescript
import { NeuroLink } from "@juspay/neurolink";

async function ragWithEmbeddings() {
  const neurolink = new NeuroLink();

  // NeuroLink handles embedding + search automatically via the rag option
  const result = await neurolink.generate({
    input: { text: "What are the deployment requirements?" },
    provider: "openai",
    rag: {
      files: ["./docs/deployment.md", "./docs/requirements.md"],
      topK: 5,
    },
  });

  console.log(result.content);
}
```

### Clustering Documents

Group similar documents together using embeddings:

```typescript
async function clusterDocuments(documents: string[], threshold: number = 0.8) {
  const provider = await ProviderFactory.createProvider(
    "openai",
    "text-embedding-3-small",
  );

  const embeddings = await provider.embedMany(documents);
  const clusters: number[][] = [];
  const assigned = new Set<number>();

  for (let i = 0; i < documents.length; i++) {
    if (assigned.has(i)) continue;

    const cluster = [i];
    assigned.add(i);

    for (let j = i + 1; j < documents.length; j++) {
      if (assigned.has(j)) continue;

      const similarity = cosineSimilarity(embeddings[i], embeddings[j]);
      if (similarity >= threshold) {
        cluster.push(j);
        assigned.add(j);
      }
    }

    clusters.push(cluster);
  }

  return clusters.map((indices) => ({
    documents: indices.map((i) => documents[i]),
    size: indices.length,
  }));
}
```

## Tips

1. **Embed once, query many times**: Embedding documents is the expensive step. Store embeddings in a database or vector store for fast repeated searches.
2. **Use `embedMany()` for batches**: It is significantly faster than calling `embed()` in a loop because it makes a single API call.
3. **Match embedding and search models**: Always use the same model to embed both documents and queries. Vectors from different models are incompatible.
4. **Consider dimensions**: `text-embedding-3-small` (1536d) is a good balance of quality and size. For storage-constrained systems, OpenAI also offers a 256d variant.

## See Also

- [Batch Processing](batch-processing.md)
- [Cost Optimization](cost-optimization.md)
- [Provider Switching](/docs/cookbook/provider-switching)
- [API Reference](../sdk/api-reference.md)
