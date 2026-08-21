# RAG Document Processing - Real-World Examples

This guide provides hands-on examples to experience all RAG features locally.

> **Provider Defaults:** When `--provider` and `--model` are not specified, NeuroLink defaults to **Vertex AI** with **gemini-2.5-flash**. Set the `NEUROLINK_PROVIDER` or `AI_PROVIDER` environment variable to change the default provider.

## Prerequisites

```bash
# Make sure you're in the neurolink directory
cd $WORKSPACE/neurolink-fork/feat/rag-processing

# Ensure CLI is built and linked
pnpm run build:cli
pnpm link --global

# Verify CLI works
neurolink rag --help
```

---

## Part 1: CLI Examples (No API Key Required)

### 1.1 Chunking Different Document Types

#### Markdown Document Chunking

```bash
# Basic markdown chunking with auto-detected strategy
neurolink rag chunk test/fixtures/rag/sample-document.md

# Explicit markdown strategy with custom size
neurolink rag chunk test/fixtures/rag/sample-document.md \
  --strategy markdown \
  --maxSize 500 \
  --overlap 50

# Output as JSON for programmatic use
neurolink rag chunk test/fixtures/rag/sample-document.md \
  --strategy markdown \
  --format json

# Output as table for quick review
neurolink rag chunk test/fixtures/rag/sample-document.md \
  --strategy markdown \
  --format table

# Save chunks to file
neurolink rag chunk test/fixtures/rag/sample-document.md \
  --strategy markdown \
  --format json \
  --output /tmp/md-chunks.json
```

#### HTML Document Chunking

```bash
# HTML-aware chunking preserves semantic structure
neurolink rag chunk test/fixtures/rag/sample-document.html \
  --strategy html \
  --maxSize 800

# Compare with recursive (generic) chunking
neurolink rag chunk test/fixtures/rag/sample-document.html \
  --strategy recursive \
  --maxSize 800
```

#### JSON Document Chunking

```bash
# JSON structure-preserving chunking
neurolink rag chunk test/fixtures/rag/sample-document.json \
  --strategy json \
  --maxSize 1000 \
  --format json

# See the jsonPath metadata in output
neurolink rag chunk test/fixtures/rag/sample-document.json \
  --strategy json \
  --format table
```

#### LaTeX Document Chunking

```bash
# LaTeX-aware chunking for academic papers
neurolink rag chunk test/fixtures/rag/sample-document.tex \
  --strategy latex \
  --maxSize 1000

# Preserves math equations and section structure
neurolink rag chunk test/fixtures/rag/sample-document.tex \
  --strategy latex \
  --format json
```

#### Plain Text Chunking

```bash
# Recursive chunking (best for general text)
neurolink rag chunk test/fixtures/rag/sample-documents.txt \
  --strategy recursive \
  --maxSize 500 \
  --overlap 100

# Sentence-based chunking
neurolink rag chunk test/fixtures/rag/sample-documents.txt \
  --strategy sentence \
  --maxSize 500

# Character-based chunking (simplest)
neurolink rag chunk test/fixtures/rag/sample-documents.txt \
  --strategy character \
  --maxSize 200 \
  --overlap 20
```

### 1.2 Comparing Chunking Strategies

```bash
# Create a comparison script
echo "=== Recursive Chunking ===" && \
neurolink rag chunk test/fixtures/rag/sample-document.md -s recursive -m 500 --format table && \
echo "" && \
echo "=== Markdown Chunking ===" && \
neurolink rag chunk test/fixtures/rag/sample-document.md -s markdown -m 500 --format table && \
echo "" && \
echo "=== Sentence Chunking ===" && \
neurolink rag chunk test/fixtures/rag/sample-document.md -s sentence -m 500 --format table
```

### 1.3 Verbose Mode for Debugging

```bash
# See detailed chunking information
neurolink rag chunk test/fixtures/rag/sample-document.md \
  --strategy markdown \
  --verbose
```

---

## Part 2: CLI Examples (Requires API Key)

Set up your API key first:

```bash
# Google/Vertex AI (default provider)
export GOOGLE_API_KEY=your-key-here
```

### 2.1 Metadata Extraction

```bash
# Extract title, summary, and keywords using Vertex AI
neurolink rag chunk test/fixtures/rag/sample-document.md \
  --strategy markdown \
  --extract \
  --provider vertex \
  --model gemini-2.5-flash \
  --format json
```

### 2.2 Semantic Chunking

```bash
# Semantic chunking uses LLM to find natural breakpoints
neurolink rag chunk test/fixtures/rag/sample-document.md \
  --strategy semantic \
  --provider vertex \
  --model gemini-2.5-flash
```

### 2.3 Indexing and Querying

```bash
# Index a document (creates embeddings)
neurolink rag index test/fixtures/rag/sample-document.md \
  --indexName my-docs \
  --provider vertex \
  --model gemini-2.5-flash

# Query the indexed documents
neurolink rag query "What is RAG?" \
  --indexName my-docs \
  --topK 3 \
  --provider vertex \
  --model gemini-2.5-flash

# Query with different questions
neurolink rag query "How does chunking work?" --indexName my-docs --provider vertex --model gemini-2.5-flash
neurolink rag query "What are the chunking strategies?" --indexName my-docs --provider vertex --model gemini-2.5-flash
```

---

## Part 3: TypeScript/JavaScript Code Examples

### 3.1 Basic Chunking (No API Key)

Create `examples/basic-chunking.ts`:

```typescript
import {
  createChunker,
  getAvailableStrategies,
  ChunkerRegistry,
} from "../src/lib/rag/index.js";
import { readFileSync } from "fs";

async function basicChunkingExample() {
  console.log("=== RAG Chunking Examples ===\n");

  // List available strategies
  const strategies = getAvailableStrategies();
  console.log("Available chunking strategies:", strategies);
  console.log("");

  // Read sample document
  const markdownContent = readFileSync(
    "test/fixtures/rag/sample-document.md",
    "utf-8",
  );
  console.log(`Document length: ${markdownContent.length} characters\n`);

  // 1. Recursive chunking (general purpose)
  console.log("--- Recursive Chunking ---");
  const recursiveChunker = await createChunker("recursive", {
    maxSize: 500,
    overlap: 50,
  });
  const recursiveChunks = await recursiveChunker.chunk(markdownContent);
  console.log(`Chunks created: ${recursiveChunks.length}`);
  console.log(`First chunk (${recursiveChunks[0].text.length} chars):`);
  console.log(recursiveChunks[0].text.substring(0, 200) + "...\n");

  // 2. Markdown-aware chunking
  console.log("--- Markdown Chunking ---");
  const markdownChunker = await createChunker("markdown", {
    maxSize: 500,
    overlap: 50,
  });
  const markdownChunks = await markdownChunker.chunk(markdownContent);
  console.log(`Chunks created: ${markdownChunks.length}`);
  console.log(`First chunk metadata:`, markdownChunks[0].metadata);
  console.log("");

  // 3. Sentence-based chunking
  console.log("--- Sentence Chunking ---");
  const sentenceChunker = await createChunker("sentence", {
    maxSize: 500,
  });
  const sentenceChunks = await sentenceChunker.chunk(markdownContent);
  console.log(`Chunks created: ${sentenceChunks.length}`);
  console.log("");

  // 4. Get chunker metadata
  console.log("--- Chunker Metadata ---");
  const metadata = ChunkerRegistry.getMetadata("markdown");
  console.log("Markdown chunker info:", metadata);
}

basicChunkingExample().catch(console.error);
```

Run it:

```bash
npx tsx examples/basic-chunking.ts
```

### 3.2 Document Processing with MDocument

Create `examples/mdocument-example.ts`:

```typescript
import { MDocument, loadDocument } from "../src/lib/rag/index.js";

async function mdocumentExample() {
  console.log("=== MDocument Fluent API ===\n");

  // Load document from file
  const doc = await loadDocument("test/fixtures/rag/sample-document.md");
  console.log("Document type:", doc.getType());
  console.log("Content length:", doc.getContent().length, "characters\n");

  // Fluent chunking
  await doc.chunk({
    strategy: "markdown",
    config: { maxSize: 500, overlap: 50 },
  });
  console.log("Chunks created:", doc.getChunkCount());

  // Get chunks with metadata
  const chunks = doc.getChunks();
  console.log("\nFirst 3 chunks:");
  chunks.slice(0, 3).forEach((chunk, i) => {
    console.log(`\n--- Chunk ${i + 1} ---`);
    console.log(`Length: ${chunk.text.length} chars`);
    console.log(`Preview: ${chunk.text.substring(0, 100)}...`);
    console.log(`Metadata:`, chunk.metadata);
  });

  // Filter chunks
  const longChunks = doc.filterChunks((c) => c.text.length > 300);
  console.log(`\nChunks > 300 chars: ${longChunks.getChunkCount()}`);

  // Map over chunks
  const chunkLengths = doc.mapChunks((c) => c.text.length);
  console.log("Chunk lengths:", chunkLengths);
}

mdocumentExample().catch(console.error);
```

Run it:

```bash
npx tsx examples/mdocument-example.ts
```

### 3.3 Hybrid Search (BM25 + Mock Vectors)

Create `examples/hybrid-search-example.ts`:

```typescript
import {
  InMemoryBM25Index,
  InMemoryVectorStore,
  reciprocalRankFusion,
  linearCombination,
  createChunker,
} from "../src/lib/rag/index.js";
import { readFileSync } from "fs";

async function hybridSearchExample() {
  console.log("=== Hybrid Search Example ===\n");

  // Load and chunk document
  const content = readFileSync("test/fixtures/rag/sample-document.md", "utf-8");
  const chunker = await createChunker("markdown", { maxSize: 300 });
  const chunks = await chunker.chunk(content);

  console.log(`Created ${chunks.length} chunks\n`);

  // Create BM25 index
  const bm25Index = new InMemoryBM25Index();
  chunks.forEach((chunk, i) => {
    bm25Index.addDocument(`chunk-${i}`, chunk.text);
  });
  console.log("BM25 index built\n");

  // Search with BM25
  const query = "chunking strategies document processing";
  console.log(`Query: "${query}"\n`);

  const bm25Results = bm25Index.search(query, 5);
  console.log("--- BM25 Results ---");
  bm25Results.forEach((r, i) => {
    console.log(`${i + 1}. ${r.id} (score: ${r.score.toFixed(4)})`);
  });

  // Simulate vector search results (in real scenario, use embeddings)
  const mockVectorResults = [
    { id: "chunk-2", score: 0.92 },
    { id: "chunk-0", score: 0.88 },
    { id: "chunk-4", score: 0.85 },
    { id: "chunk-1", score: 0.82 },
    { id: "chunk-3", score: 0.78 },
  ];

  console.log("\n--- Mock Vector Results ---");
  mockVectorResults.forEach((r, i) => {
    console.log(`${i + 1}. ${r.id} (score: ${r.score.toFixed(4)})`);
  });

  // Reciprocal Rank Fusion
  const bm25Rankings = bm25Results.map((r, i) => ({ id: r.id, rank: i + 1 }));
  const vectorRankings = mockVectorResults.map((r, i) => ({
    id: r.id,
    rank: i + 1,
  }));

  const rrfScores = reciprocalRankFusion([bm25Rankings, vectorRankings], 60);

  console.log("\n--- RRF Fusion Results ---");
  const sortedRRF = [...rrfScores.entries()].sort((a, b) => b[1] - a[1]);
  sortedRRF.slice(0, 5).forEach(([id, score], i) => {
    console.log(`${i + 1}. ${id} (RRF score: ${score.toFixed(4)})`);
  });

  // Linear Combination
  const bm25ScoreMap = new Map(bm25Results.map((r) => [r.id, r.score]));
  const vectorScoreMap = new Map(mockVectorResults.map((r) => [r.id, r.score]));

  const linearScores = linearCombination(vectorScoreMap, bm25ScoreMap, 0.6);

  console.log("\n--- Linear Combination Results (alpha=0.6) ---");
  const sortedLinear = [...linearScores.entries()].sort((a, b) => b[1] - a[1]);
  sortedLinear.slice(0, 5).forEach(([id, score], i) => {
    console.log(`${i + 1}. ${id} (linear score: ${score.toFixed(4)})`);
  });
}

hybridSearchExample().catch(console.error);
```

Run it:

```bash
npx tsx examples/hybrid-search-example.ts
```

### 3.4 Reranking Results

Create `examples/reranking-example.ts`:

```typescript
import {
  createReranker,
  getAvailableRerankerTypes,
  simpleRerank,
} from "../src/lib/rag/index.js";

async function rerankingExample() {
  console.log("=== Reranking Example ===\n");

  // List available reranker types
  const types = getAvailableRerankerTypes();
  console.log("Available reranker types:", types);
  console.log("");

  // Sample search results to rerank
  const searchResults = [
    {
      id: "doc1",
      text: "Machine learning is a subset of artificial intelligence.",
      score: 0.75,
      metadata: {},
    },
    {
      id: "doc2",
      text: "Deep learning uses neural networks with many layers.",
      score: 0.82,
      metadata: {},
    },
    {
      id: "doc3",
      text: "Natural language processing enables computers to understand text.",
      score: 0.68,
      metadata: {},
    },
    {
      id: "doc4",
      text: "Supervised learning requires labeled training data.",
      score: 0.71,
      metadata: {},
    },
    {
      id: "doc5",
      text: "Transformers revolutionized NLP with attention mechanisms.",
      score: 0.88,
      metadata: {},
    },
  ];

  const query = "How do neural networks learn from data?";
  console.log(`Query: "${query}"\n`);

  console.log("--- Original Results ---");
  searchResults.forEach((r, i) => {
    console.log(
      `${i + 1}. [${r.score.toFixed(2)}] ${r.text.substring(0, 50)}...`,
    );
  });

  // Simple reranking (no LLM required)
  console.log("\n--- Simple Reranking ---");
  const simpleReranked = await simpleRerank(searchResults, query, { topK: 3 });
  simpleReranked.forEach((r, i) => {
    console.log(
      `${i + 1}. [${r.score.toFixed(2)}] ${r.text.substring(0, 50)}...`,
    );
  });

  // Using reranker factory
  console.log("\n--- Factory Reranker ---");
  const reranker = await createReranker("simple", {
    topK: 5,
  });
  const factoryReranked = await reranker.rerank(searchResults, query);
  factoryReranked.forEach((r, i) => {
    console.log(
      `${i + 1}. [${r.score.toFixed(2)}] ${r.text.substring(0, 50)}...`,
    );
  });
}

rerankingExample().catch(console.error);
```

Run it:

```bash
npx tsx examples/reranking-example.ts
```

### 3.5 Graph RAG

Create `examples/graph-rag-example.ts`:

```typescript
import { GraphRAG } from "../src/lib/rag/index.js";

async function graphRAGExample() {
  console.log("=== Graph RAG Example ===\n");

  // Create Graph RAG with 3-dimensional vectors (for demo)
  const graphRag = new GraphRAG({
    dimension: 3,
    threshold: 0.7, // Similarity threshold for creating edges
  });

  // Sample chunks with mock embeddings
  const chunks = [
    { text: "Machine learning fundamentals", metadata: { topic: "ml-basics" } },
    {
      text: "Neural network architecture",
      metadata: { topic: "deep-learning" },
    },
    {
      text: "Supervised learning algorithms",
      metadata: { topic: "ml-basics" },
    },
    { text: "Backpropagation training", metadata: { topic: "deep-learning" } },
    { text: "Data preprocessing techniques", metadata: { topic: "data-prep" } },
  ];

  // Mock embeddings (in practice, use real embedding model)
  const embeddings = [
    { vector: [0.9, 0.1, 0.0] }, // ML basics
    { vector: [0.8, 0.9, 0.1] }, // Deep learning
    { vector: [0.85, 0.15, 0.0] }, // ML basics (similar to first)
    { vector: [0.75, 0.95, 0.15] }, // Deep learning (similar to second)
    { vector: [0.3, 0.2, 0.9] }, // Data prep (different topic)
  ];

  // Build the graph
  graphRag.createGraph(chunks, embeddings);

  // Get graph statistics
  const stats = graphRag.getStats();
  console.log("Graph Statistics:");
  console.log(`  Nodes: ${stats.nodeCount}`);
  console.log(`  Edges: ${stats.edgeCount}`);
  console.log(`  Avg Degree: ${stats.avgDegree.toFixed(2)}`);
  console.log(`  Similarity Threshold: ${stats.threshold}`);
  console.log("");

  // Query the graph
  const queryEmbedding = [0.88, 0.12, 0.0]; // Similar to ML basics
  console.log("Query embedding:", queryEmbedding);
  console.log("");

  const results = graphRag.query({
    query: queryEmbedding,
    topK: 3,
    randomWalkSteps: 50,
    restartProb: 0.15,
  });

  console.log("--- Query Results ---");
  results.forEach((result, i) => {
    console.log(`${i + 1}. "${result.chunk.text}"`);
    console.log(`   Score: ${result.score.toFixed(4)}`);
    console.log(`   Topic: ${result.chunk.metadata.topic}`);
  });

  // Add a new node
  console.log("\n--- Adding New Node ---");
  const newId = graphRag.addNode(
    { text: "Gradient descent optimization", metadata: { topic: "ml-basics" } },
    { vector: [0.87, 0.13, 0.0] },
  );
  console.log(`Added node: ${newId}`);

  const newStats = graphRag.getStats();
  console.log(`New node count: ${newStats.nodeCount}`);
  console.log(`New edge count: ${newStats.edgeCount}`);
}

graphRAGExample().catch(console.error);
```

Run it:

```bash
npx tsx examples/graph-rag-example.ts
```

### 3.6 Full RAG Pipeline with generate() (Requires API Key)

Create `examples/rag-with-generate.ts`:

```typescript
import {
  NeuroLink,
  createVectorQueryTool,
  InMemoryVectorStore,
} from "../src/lib/index.js";
import { createChunker, MDocument } from "../src/lib/rag/index.js";
import { readFileSync } from "fs";

async function ragWithGenerateExample() {
  console.log("=== RAG with generate() Example ===\n");

  // Check for API key
  if (!process.env.GOOGLE_API_KEY) {
    console.log("Note: Set GOOGLE_API_KEY for full functionality");
    console.log("Example: export GOOGLE_API_KEY=your-key\n");
  }

  // 1. Load and chunk document
  console.log("1. Loading and chunking document...");
  const content = readFileSync("test/fixtures/rag/sample-document.md", "utf-8");
  const chunker = await createChunker("markdown", {
    maxSize: 500,
    overlap: 50,
  });
  const chunks = await chunker.chunk(content);
  console.log(`   Created ${chunks.length} chunks\n`);

  // 2. Create mock embeddings (in production, use real embedding API)
  console.log("2. Creating mock vector store...");
  const vectorStore = new InMemoryVectorStore();

  // Mock 10-dimensional embeddings
  const mockEmbeddings = chunks.map((_, i) => {
    const vec = new Array(10).fill(0).map(() => Math.random());
    // Normalize
    const norm = Math.sqrt(vec.reduce((a, b) => a + b * b, 0));
    return vec.map((v) => v / norm);
  });

  await vectorStore.upsert(
    "knowledge-base",
    chunks.map((chunk, i) => ({
      id: `chunk-${i}`,
      vector: mockEmbeddings[i],
      metadata: {
        text: chunk.text,
        ...chunk.metadata,
      },
    })),
  );
  console.log(`   Indexed ${chunks.length} chunks\n`);

  // 3. Create RAG tool
  console.log("3. Creating RAG tool...");
  const ragTool = createVectorQueryTool(
    {
      id: "knowledge-search",
      description:
        "Search the knowledge base for information about RAG and document processing",
      indexName: "knowledge-base",
      topK: 3,
    },
    vectorStore,
  );
  console.log("   RAG tool created\n");

  // 4. Use with NeuroLink generate()
  console.log("4. Generating response with RAG context...\n");

  try {
    const neurolink = new NeuroLink();
    const result = await neurolink.generate({
      input: { text: "What are the different chunking strategies available?" },
      tools: [ragTool],
      provider: "vertex",
      model: "gemini-2.5-flash",
      systemPrompt: `You are a helpful assistant that answers questions about RAG document processing. 
        Use the knowledge-search tool to find relevant information before answering.`,
    });

    console.log("--- Response ---");
    console.log(result.content);

    if (result.toolExecutions?.length) {
      console.log("\n--- Tool Executions ---");
      result.toolExecutions.forEach((exec) => {
        console.log(`Tool: ${exec.toolName}`);
        console.log(`Results: ${JSON.stringify(exec.result, null, 2)}`);
      });
    }
  } catch (error) {
    if (error.message?.includes("API key")) {
      console.log("Error: Google API key required");
      console.log("Set: export GOOGLE_API_KEY=your-key");
    } else {
      throw error;
    }
  }
}

ragWithGenerateExample().catch(console.error);
```

Run it:

```bash
# With API key
export GOOGLE_API_KEY=your-key
npx tsx examples/rag-with-generate.ts

# Without API key (will show setup instructions)
npx tsx examples/rag-with-generate.ts
```

---

## Part 4: Quick Reference

### Chunking Strategy Comparison

| Strategy    | Best For         | Example Command                                        |
| ----------- | ---------------- | ------------------------------------------------------ |
| `recursive` | General text     | `neurolink rag chunk file.txt -s recursive`            |
| `markdown`  | Docs, READMEs    | `neurolink rag chunk file.md -s markdown`              |
| `html`      | Web content      | `neurolink rag chunk file.html -s html`                |
| `json`      | API responses    | `neurolink rag chunk file.json -s json`                |
| `latex`     | Academic papers  | `neurolink rag chunk file.tex -s latex`                |
| `sentence`  | Q&A content      | `neurolink rag chunk file.txt -s sentence`             |
| `token`     | LLM optimization | `neurolink rag chunk file.txt -s token`                |
| `character` | Simple splitting | `neurolink rag chunk file.txt -s character`            |
| `semantic`  | Context-aware    | `neurolink rag chunk file.txt -s semantic` (needs API) |

### Output Formats

```bash
# Text output (default, human readable)
neurolink rag chunk file.md --format text

# JSON output (for programmatic use)
neurolink rag chunk file.md --format json

# Table output (quick overview)
neurolink rag chunk file.md --format table

# Save to file
neurolink rag chunk file.md --format json --output chunks.json
```

### Common Workflows

```bash
# 1. Quick document preview
neurolink rag chunk README.md -s markdown --format table

# 2. Prepare for embedding (process multiple files with shell loop)
for file in docs/*.md; do neurolink rag chunk "$file" -s markdown -m 512 --overlap 50 --format json; done > chunks.json

# 3. Academic paper processing
neurolink rag chunk paper.tex -s latex -m 1000 --format json

# 4. Web content processing
neurolink rag chunk page.html -s html -m 800 --format json

# 5. API response processing
neurolink rag chunk response.json -s json --format json
```

---

## Troubleshooting

### CLI not found

```bash
pnpm run build:cli
pnpm link --global
```

### API key errors

```bash
# Google/Vertex AI
export GOOGLE_API_KEY=your-key
```

### Permission errors

```bash
# Make CLI executable
chmod +x dist/cli/index.js
```
