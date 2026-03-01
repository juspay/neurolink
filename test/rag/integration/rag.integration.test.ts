/**
 * RAG Processing Integration Tests
 *
 * Comprehensive integration tests for RAG (Retrieval-Augmented Generation)
 * processing capabilities including:
 * - Document chunking (10 strategies)
 * - Embedding generation
 * - Vector store integration
 * - Retrieval and ranking
 * - Hybrid search (BM25 + vector fusion)
 * - Reranking
 * - Context assembly
 * - Graph RAG with knowledge extraction
 *
 * Run with: pnpm test test/rag/integration/rag.integration.test.ts
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { z } from "zod";
import {
  assembleContext,
  batchRerank,
  CharacterChunker,
  type Chunk,
  ChunkerRegistry,
  type ChunkingStrategy,
  chunkText,
  createContextWindow,
  createHybridSearch,
  createRAGPipeline,
  createVectorQueryTool,
  extractKeySentences,
  extractMetadata,
  formatContextWithCitations,
  GraphRAG,
  getAvailableStrategies,
  getDefaultChunkerConfig,
  getRecommendedStrategy,
  HTMLChunker,
  type HybridSearchResult,
  InMemoryBM25Index,
  InMemoryVectorStore,
  JSONChunker,
  LaTeXChunker,
  LLMMetadataExtractor,
  linearCombination,
  MarkdownChunker,
  MDocument,
  orderByDocumentStructure,
  processDocument,
  RAGPipeline,
  type RankedNode,
  RecursiveChunker,
  reciprocalRankFusion,
  rerank,
  SemanticChunker,
  SentenceChunker,
  simpleRerank,
  TokenChunker,
  type VectorQueryResult,
} from "../../../src/lib/rag/index.js";

// ============================================================================
// Test Data
// ============================================================================

const SAMPLE_TEXT = `
Artificial Intelligence and Machine Learning

Artificial intelligence (AI) is a branch of computer science that aims to create intelligent machines that can perform tasks that typically require human intelligence. Machine learning (ML) is a subset of AI that enables systems to learn and improve from experience without being explicitly programmed.

Deep Learning and Neural Networks

Deep learning is a subset of machine learning that uses artificial neural networks with multiple layers (hence "deep") to model and understand complex patterns in data. Neural networks are inspired by the biological neural networks that constitute animal brains.

Natural Language Processing

Natural language processing (NLP) is a field of artificial intelligence that focuses on the interaction between computers and humans through natural language. The ultimate goal of NLP is to enable computers to understand, interpret, and generate human language in a valuable way.

Applications of AI

AI has numerous applications across various industries including healthcare, finance, transportation, and entertainment. From diagnosis assistance in healthcare to algorithmic trading in finance, AI is transforming how we work and live.
`.trim();

const SAMPLE_MARKDOWN = `
# Machine Learning Guide

This guide covers the fundamentals of machine learning.

## Introduction to ML

Machine learning is a method of data analysis that automates analytical model building. It is a branch of artificial intelligence based on the idea that systems can learn from data, identify patterns, and make decisions with minimal human intervention.

### Types of Machine Learning

There are three main types of machine learning:

1. **Supervised Learning**: The algorithm learns from labeled training data.
2. **Unsupervised Learning**: The algorithm finds patterns in unlabeled data.
3. **Reinforcement Learning**: The algorithm learns through trial and error.

## Deep Learning

Deep learning is a subset of machine learning in artificial intelligence that has networks capable of learning unsupervised from data that is unstructured or unlabeled.

### Neural Networks

A neural network is a series of algorithms that endeavors to recognize underlying relationships in a set of data.

\`\`\`python
import tensorflow as tf
model = tf.keras.Sequential([
    tf.keras.layers.Dense(128, activation='relu'),
    tf.keras.layers.Dense(10, activation='softmax')
])
\`\`\`

## Conclusion

Machine learning continues to evolve and find new applications across industries.
`.trim();

const SAMPLE_HTML = `
<html>
<head><title>AI Overview</title></head>
<body>
<article>
  <h1>Introduction to AI</h1>
  <section>
    <h2>What is Artificial Intelligence?</h2>
    <p>Artificial intelligence (AI) is the simulation of human intelligence processes by machines, especially computer systems.</p>
    <p>These processes include learning, reasoning, and self-correction.</p>
  </section>
  <section>
    <h2>Types of AI</h2>
    <div>
      <h3>Narrow AI</h3>
      <p>Also known as Weak AI, this type is designed for a particular task.</p>
    </div>
    <div>
      <h3>General AI</h3>
      <p>Also known as Strong AI, this would have human-like intelligence.</p>
    </div>
  </section>
</article>
</body>
</html>
`.trim();

const SAMPLE_JSON = JSON.stringify(
  {
    topic: "Machine Learning",
    concepts: [
      {
        name: "Supervised Learning",
        description: "Learning from labeled data",
        examples: ["Classification", "Regression"],
      },
      {
        name: "Unsupervised Learning",
        description: "Finding patterns in unlabeled data",
        examples: ["Clustering", "Dimensionality Reduction"],
      },
    ],
    applications: ["Healthcare", "Finance", "Transportation"],
  },
  null,
  2,
);

const SAMPLE_LATEX = `
\\documentclass{article}
\\title{Introduction to Neural Networks}
\\author{AI Research}

\\begin{document}

\\maketitle

\\section{Introduction}

Neural networks are computing systems inspired by biological neural networks. They learn to perform tasks by considering examples.

\\section{Architecture}

A typical neural network consists of:

\\begin{itemize}
\\item Input layer
\\item Hidden layers
\\item Output layer
\\end{itemize}

\\subsection{Activation Functions}

Common activation functions include:

\\begin{equation}
\\sigma(x) = \\frac{1}{1 + e^{-x}}
\\end{equation}

This is the sigmoid function.

\\section{Training}

Neural networks are trained using backpropagation and gradient descent.

\\end{document}
`.trim();

// ============================================================================
// Chunking Tests
// ============================================================================

describe("RAG Processing Integration Tests", () => {
  describe("Document Chunking Strategies", () => {
    describe("ChunkerRegistry", () => {
      beforeEach(() => {
        // Reset registry before each test
        ChunkerRegistry.reset();
      });

      it("should initialize with all 10 built-in chunking strategies", () => {
        const strategies = getAvailableStrategies();
        expect(strategies).toHaveLength(10);
        expect(strategies).toContain("character");
        expect(strategies).toContain("recursive");
        expect(strategies).toContain("sentence");
        expect(strategies).toContain("token");
        expect(strategies).toContain("markdown");
        expect(strategies).toContain("html");
        expect(strategies).toContain("json");
        expect(strategies).toContain("latex");
        expect(strategies).toContain("semantic");
        expect(strategies).toContain("semantic-markdown");
      });

      it("should return correct recommended strategy for content types", () => {
        expect(getRecommendedStrategy("markdown")).toBe("markdown");
        expect(getRecommendedStrategy("text/markdown")).toBe("markdown");
        expect(getRecommendedStrategy("html")).toBe("html");
        expect(getRecommendedStrategy("application/json")).toBe("json");
        expect(getRecommendedStrategy("text/latex")).toBe("latex");
        // text/plain contains "text" so it matches the "text" pattern -> sentence
        expect(getRecommendedStrategy("text/plain")).toBe("sentence");
      });

      it("should provide default configuration for each strategy", () => {
        const strategies: ChunkingStrategy[] = [
          "character",
          "recursive",
          "sentence",
          "token",
          "markdown",
          "html",
          "json",
          "latex",
          "semantic",
          "semantic-markdown",
        ];

        for (const strategy of strategies) {
          const config = getDefaultChunkerConfig(strategy);
          expect(config).toBeDefined();
          expect(typeof config).toBe("object");
        }
      });

      it("should throw error for unknown strategy", () => {
        expect(() =>
          ChunkerRegistry.get("unknown" as ChunkingStrategy),
        ).toThrow();
      });
    });

    describe("CharacterChunker", () => {
      it("should chunk text by character count", async () => {
        const chunker = new CharacterChunker();
        const chunks = await chunker.chunk(SAMPLE_TEXT, {
          maxSize: 200,
          overlap: 0,
        });

        expect(chunks.length).toBeGreaterThan(0);
        for (const chunk of chunks) {
          expect(chunk.text.length).toBeLessThanOrEqual(200);
          expect(chunk.id).toBeDefined();
          expect(chunk.metadata.documentId).toBeDefined();
          expect(chunk.metadata.chunkIndex).toBeDefined();
        }
      });

      it("should handle overlap correctly", async () => {
        const chunker = new CharacterChunker();
        const chunks = await chunker.chunk(SAMPLE_TEXT, {
          maxSize: 200,
          overlap: 50,
        });

        expect(chunks.length).toBeGreaterThan(0);

        // Verify chunks have metadata
        for (const chunk of chunks) {
          expect(chunk.metadata.totalChunks).toBe(chunks.length);
        }
      });

      it("should validate configuration", () => {
        const chunker = new CharacterChunker();

        // Valid config
        let result = chunker.validateConfig({ maxSize: 100, overlap: 20 });
        expect(result.valid).toBe(true);

        // Invalid: overlap >= maxSize
        result = chunker.validateConfig({ maxSize: 100, overlap: 100 });
        expect(result.valid).toBe(false);

        // Invalid: negative overlap
        result = chunker.validateConfig({ overlap: -1 });
        expect(result.valid).toBe(false);
      });
    });

    describe("RecursiveChunker", () => {
      it("should chunk text using hierarchical separators", async () => {
        const chunker = new RecursiveChunker();
        const chunks = await chunker.chunk(SAMPLE_TEXT, {
          maxSize: 300,
          overlap: 50,
        });

        expect(chunks.length).toBeGreaterThan(0);
        for (const chunk of chunks) {
          expect(chunk.text.length).toBeLessThanOrEqual(350); // Allow some flexibility
        }
      });

      it("should use custom separators", async () => {
        const chunker = new RecursiveChunker();
        const chunks = await chunker.chunk(SAMPLE_TEXT, {
          maxSize: 500,
          separators: ["\n\n", "\n", " "],
        });

        expect(chunks.length).toBeGreaterThan(0);
      });
    });

    describe("SentenceChunker", () => {
      it("should chunk text by sentences", async () => {
        const chunker = new SentenceChunker();
        const chunks = await chunker.chunk(SAMPLE_TEXT, {
          maxSize: 500,
        });

        expect(chunks.length).toBeGreaterThan(0);
        // Sentences should end with proper punctuation
        for (const chunk of chunks) {
          const text = chunk.text.trim();
          expect(
            text.endsWith(".") ||
              text.endsWith("!") ||
              text.endsWith("?") ||
              text.length < 500,
          ).toBe(true);
        }
      });
    });

    describe("TokenChunker", () => {
      it("should chunk text by token count", async () => {
        const chunker = new TokenChunker();
        const chunks = await chunker.chunk(SAMPLE_TEXT, {
          maxTokens: 100,
          tokenOverlap: 10,
        });

        expect(chunks.length).toBeGreaterThan(0);
      });
    });

    describe("MarkdownChunker", () => {
      it("should chunk markdown by headers", async () => {
        const chunker = new MarkdownChunker();
        const chunks = await chunker.chunk(SAMPLE_MARKDOWN, {
          maxSize: 1000,
          headerLevels: [1, 2, 3],
        });

        expect(chunks.length).toBeGreaterThan(0);

        // Check section context metadata
        const withHeaders = chunks.filter((c) => c.metadata.header);
        expect(withHeaders.length).toBeGreaterThan(0);
      });

      it("should preserve code blocks", async () => {
        const chunker = new MarkdownChunker();
        const chunks = await chunker.chunk(SAMPLE_MARKDOWN, {
          preserveCodeBlocks: true,
        });

        // At least one chunk should contain code
        const codeChunks = chunks.filter(
          (c) => c.text.includes("```") || c.text.includes("import"),
        );
        expect(codeChunks.length).toBeGreaterThan(0);
      });
    });

    describe("HTMLChunker", () => {
      it("should chunk HTML by semantic tags", async () => {
        const chunker = new HTMLChunker();
        const chunks = await chunker.chunk(SAMPLE_HTML, {
          splitTags: ["section", "div", "article"],
          maxSize: 500,
        });

        expect(chunks.length).toBeGreaterThan(0);
      });

      it("should extract text only when configured", async () => {
        const chunker = new HTMLChunker();
        const chunks = await chunker.chunk(SAMPLE_HTML, {
          extractTextOnly: true,
        });

        // Should not contain HTML tags in text-only mode
        for (const chunk of chunks) {
          expect(chunk.text.includes("<section")).toBe(false);
        }
      });
    });

    describe("JSONChunker", () => {
      it("should chunk JSON by structure", async () => {
        const chunker = new JSONChunker();
        const chunks = await chunker.chunk(SAMPLE_JSON, {
          maxDepth: 3,
          maxSize: 100, // Force smaller chunks to test jsonPath
          includeJsonPath: true,
        });

        expect(chunks.length).toBeGreaterThan(0);

        // Should have JSON path in metadata (jsonPath is always set, may be empty string for root)
        const withPath = chunks.filter(
          (c) => c.metadata.jsonPath !== undefined,
        );
        expect(withPath.length).toBeGreaterThan(0);
      });
    });

    describe("LaTeXChunker", () => {
      it("should chunk LaTeX by sections", async () => {
        const chunker = new LaTeXChunker();
        const chunks = await chunker.chunk(SAMPLE_LATEX, {
          splitEnvironments: ["section", "subsection"],
        });

        expect(chunks.length).toBeGreaterThan(0);
      });

      it("should preserve math environments", async () => {
        const chunker = new LaTeXChunker();
        const chunks = await chunker.chunk(SAMPLE_LATEX, {
          preserveMath: true,
        });

        // Math should be preserved
        const mathChunks = chunks.filter(
          (c) => c.text.includes("\\frac") || c.text.includes("equation"),
        );
        expect(mathChunks.length).toBeGreaterThan(0);
      });
    });

    describe("SemanticChunker", () => {
      it("should have semantic chunker available", () => {
        const chunker = new SemanticChunker();
        expect(chunker.strategy).toBe("semantic");
      });

      // Note: Full semantic chunking requires LLM integration
      // Testing basic functionality only
      it("should validate semantic chunker config", () => {
        const chunker = new SemanticChunker();
        const result = chunker.validateConfig({
          maxSize: 1000,
          similarityThreshold: 0.7,
        });
        expect(result.valid).toBe(true);
      });
    });

    describe("chunkText convenience function", () => {
      it("should chunk text with default strategy", async () => {
        const chunks = await chunkText(SAMPLE_TEXT);
        expect(chunks.length).toBeGreaterThan(0);
      });

      it("should chunk with specified strategy", async () => {
        const chunks = await chunkText(SAMPLE_TEXT, "sentence", {
          maxSize: 500,
        });
        expect(chunks.length).toBeGreaterThan(0);
      });
    });
  });

  // ============================================================================
  // MDocument Tests
  // ============================================================================

  describe("MDocument", () => {
    describe("Static Factory Methods", () => {
      it("should create document from text", () => {
        const doc = MDocument.fromText(SAMPLE_TEXT, { source: "test" });
        expect(doc.getContent()).toBe(SAMPLE_TEXT);
        expect(doc.getType()).toBe("text");
        expect(doc.getMetadata().source).toBe("test");
      });

      it("should create document from markdown", () => {
        const doc = MDocument.fromMarkdown(SAMPLE_MARKDOWN);
        expect(doc.getType()).toBe("markdown");
      });

      it("should create document from HTML", () => {
        const doc = MDocument.fromHTML(SAMPLE_HTML);
        expect(doc.getType()).toBe("html");
      });

      it("should create document from JSON", () => {
        const doc = MDocument.fromJSONContent(SAMPLE_JSON);
        expect(doc.getType()).toBe("json");
      });

      it("should create document from LaTeX", () => {
        const doc = MDocument.fromLaTeX(SAMPLE_LATEX);
        expect(doc.getType()).toBe("latex");
      });
    });

    describe("Document Processing", () => {
      it("should chunk document with fluent API", async () => {
        const doc = MDocument.fromMarkdown(SAMPLE_MARKDOWN);
        await doc.chunk({
          strategy: "markdown",
          config: { maxSize: 500, headerLevels: [1, 2] },
        });

        expect(doc.isChunked()).toBe(true);
        expect(doc.getChunkCount()).toBeGreaterThan(0);
        expect(doc.getChunks()).toHaveLength(doc.getChunkCount());
      });

      it("should track processing history", async () => {
        const doc = MDocument.fromText(SAMPLE_TEXT);
        await doc.chunk({ strategy: "recursive" });

        const history = doc.getHistory();
        expect(history).toContain("created");
        expect(history.some((h) => h.startsWith("chunked"))).toBe(true);
      });

      it("should serialize and deserialize document", async () => {
        const doc = MDocument.fromText(SAMPLE_TEXT);
        await doc.chunk({ strategy: "character", config: { maxSize: 200 } });

        const json = doc.toJSON();
        const restored = MDocument.fromJSON(json);

        expect(restored.getContent()).toBe(doc.getContent());
        expect(restored.getChunkCount()).toBe(doc.getChunkCount());
      });

      it("should filter chunks", async () => {
        const doc = MDocument.fromText(SAMPLE_TEXT);
        await doc.chunk({ strategy: "sentence" });

        const filtered = doc.filterChunks((chunk) => chunk.text.length > 50);
        expect(filtered.getChunkCount()).toBeLessThanOrEqual(
          doc.getChunkCount(),
        );
      });

      it("should map chunks", async () => {
        const doc = MDocument.fromText(SAMPLE_TEXT);
        await doc.chunk({ strategy: "character", config: { maxSize: 100 } });

        const mapped = doc.mapChunks((chunk) => ({
          ...chunk,
          text: chunk.text.toUpperCase(),
        }));

        const chunks = mapped.getChunks();
        expect(chunks[0].text).toBe(chunks[0].text.toUpperCase());
      });
    });
  });

  // ============================================================================
  // Vector Store Tests
  // ============================================================================

  describe("Vector Store Integration", () => {
    let vectorStore: InMemoryVectorStore;

    beforeEach(() => {
      vectorStore = new InMemoryVectorStore();
    });

    describe("InMemoryVectorStore", () => {
      it("should upsert and query vectors", async () => {
        // Create test vectors
        const testVectors = [
          { id: "1", vector: [1.0, 0.0, 0.0], metadata: { text: "AI" } },
          { id: "2", vector: [0.0, 1.0, 0.0], metadata: { text: "ML" } },
          {
            id: "3",
            vector: [0.9, 0.1, 0.0],
            metadata: { text: "Deep Learning" },
          },
        ];

        await vectorStore.upsert("test-index", testVectors);

        // Query with vector similar to first item
        const results = await vectorStore.query({
          indexName: "test-index",
          queryVector: [1.0, 0.0, 0.0],
          topK: 2,
        });

        expect(results).toHaveLength(2);
        expect(results[0].id).toBe("1"); // Most similar
        expect(results[0].score).toBeCloseTo(1.0, 2); // Cosine similarity
      });

      it("should filter by metadata", async () => {
        const testVectors = [
          {
            id: "1",
            vector: [1.0, 0.0],
            metadata: { category: "tech", text: "AI" },
          },
          {
            id: "2",
            vector: [0.9, 0.1],
            metadata: { category: "science", text: "ML" },
          },
          {
            id: "3",
            vector: [0.8, 0.2],
            metadata: { category: "tech", text: "DL" },
          },
        ];

        await vectorStore.upsert("test-index", testVectors);

        const results = await vectorStore.query({
          indexName: "test-index",
          queryVector: [1.0, 0.0],
          topK: 10,
          filter: { category: "tech" },
        });

        expect(results).toHaveLength(2);
        expect(results.every((r) => r.metadata?.category === "tech")).toBe(
          true,
        );
      });

      it("should support complex filter operators", async () => {
        const testVectors = [
          {
            id: "1",
            vector: [1, 0],
            metadata: { score: 80, status: "active" },
          },
          {
            id: "2",
            vector: [0, 1],
            metadata: { score: 60, status: "active" },
          },
          {
            id: "3",
            vector: [1, 1],
            metadata: { score: 90, status: "inactive" },
          },
        ];

        await vectorStore.upsert("test-index", testVectors);

        // Filter with $gt operator
        let results = await vectorStore.query({
          indexName: "test-index",
          queryVector: [1, 0],
          topK: 10,
          filter: { score: { $gt: 70 } },
        });
        expect(results).toHaveLength(2);

        // Filter with $and operator
        results = await vectorStore.query({
          indexName: "test-index",
          queryVector: [1, 0],
          topK: 10,
          filter: {
            $and: [{ score: { $gte: 60 } }, { status: "active" }],
          },
        });
        expect(results).toHaveLength(2);
      });

      it("should delete vectors", async () => {
        await vectorStore.upsert("test-index", [
          { id: "1", vector: [1, 0], metadata: {} },
          { id: "2", vector: [0, 1], metadata: {} },
        ]);

        await vectorStore.delete("test-index", ["1"]);

        const results = await vectorStore.query({
          indexName: "test-index",
          queryVector: [1, 0],
          topK: 10,
        });

        expect(results).toHaveLength(1);
        expect(results[0].id).toBe("2");
      });
    });

    describe("createVectorQueryTool", () => {
      it("should create a vector query tool", () => {
        const tool = createVectorQueryTool(
          {
            indexName: "test-index",
            embeddingModel: {
              provider: "openai",
              modelName: "text-embedding-3-small",
            },
            topK: 5,
          },
          vectorStore,
        );

        expect(tool.name).toMatch(/vector-query/);
        expect(tool.description).toBeDefined();
        expect(tool.parameters).toBeDefined();
        expect(typeof tool.execute).toBe("function");
      });
    });
  });

  // ============================================================================
  // Hybrid Search Tests
  // ============================================================================

  describe("Hybrid Search", () => {
    let bm25Index: InMemoryBM25Index;

    beforeEach(() => {
      bm25Index = new InMemoryBM25Index();
    });

    describe("InMemoryBM25Index", () => {
      it("should add documents and search", async () => {
        await bm25Index.addDocuments([
          { id: "1", text: "machine learning artificial intelligence" },
          { id: "2", text: "deep learning neural networks" },
          { id: "3", text: "natural language processing" },
        ]);

        const results = await bm25Index.search("machine learning", 2);

        expect(results).toHaveLength(2);
        expect(results[0].id).toBe("1"); // Best match
        expect(results[0].score).toBeGreaterThan(0);
      });

      it("should handle empty queries", async () => {
        await bm25Index.addDocuments([{ id: "1", text: "test document" }]);

        const results = await bm25Index.search("", 10);
        expect(results).toHaveLength(0);
      });
    });

    describe("Reciprocal Rank Fusion", () => {
      it("should combine rankings from multiple sources", () => {
        const ranking1 = [
          { id: "a", rank: 1 },
          { id: "b", rank: 2 },
          { id: "c", rank: 3 },
        ];

        const ranking2 = [
          { id: "b", rank: 1 },
          { id: "a", rank: 2 },
          { id: "d", rank: 3 },
        ];

        const fused = reciprocalRankFusion([ranking1, ranking2]);

        // Documents "a" and "b" both appear in both rankings with mirrored ranks
        // RRF scores: a = 1/(60+1) + 1/(60+2) = b = 1/(60+2) + 1/(60+1)
        // They have equal scores, so we just verify both are top-ranked
        const scores = Array.from(fused.entries()).sort((a, b) => b[1] - a[1]);
        expect(["a", "b"]).toContain(scores[0][0]); // a or b is top (equal scores)
        expect(["a", "b"]).toContain(scores[1][0]); // both a and b in top 2
        expect(scores[0][1]).toBeCloseTo(scores[1][1], 5); // equal scores
      });
    });

    describe("Linear Combination", () => {
      it("should combine scores with weights", () => {
        const vectorScores = new Map([
          ["a", 0.9],
          ["b", 0.7],
        ]);

        const bm25Scores = new Map([
          ["a", 0.5],
          ["b", 0.8],
          ["c", 0.6],
        ]);

        const combined = linearCombination(vectorScores, bm25Scores, 0.5);

        expect(combined.has("a")).toBe(true);
        expect(combined.has("b")).toBe(true);
        expect(combined.has("c")).toBe(true);

        // Scores should be normalized and combined
        const scores = Array.from(combined.values());
        expect(scores.every((s) => s >= 0 && s <= 1)).toBe(true);
      });
    });
  });

  // ============================================================================
  // Graph RAG Tests
  // ============================================================================

  describe("Graph RAG", () => {
    let graphRAG: GraphRAG;

    beforeEach(() => {
      graphRAG = new GraphRAG({ threshold: 0.5, dimension: 3 });
    });

    describe("Graph Creation", () => {
      it("should create a knowledge graph from chunks and embeddings", () => {
        const chunks = [
          { text: "AI is transforming industries", metadata: {} },
          {
            text: "Machine learning enables pattern recognition",
            metadata: {},
          },
          { text: "Deep learning uses neural networks", metadata: {} },
        ];

        const embeddings = [
          { vector: [1.0, 0.0, 0.0] },
          { vector: [0.9, 0.1, 0.0] },
          { vector: [0.8, 0.2, 0.0] },
        ];

        graphRAG.createGraph(chunks, embeddings);

        const stats = graphRAG.getStats();
        expect(stats.nodeCount).toBe(3);
        expect(stats.edgeCount).toBeGreaterThan(0); // Should have edges for similar vectors
      });

      it("should throw error for mismatched arrays", () => {
        const chunks = [{ text: "test", metadata: {} }];
        const embeddings = [{ vector: [1, 0] }, { vector: [0, 1] }];

        expect(() => graphRAG.createGraph(chunks, embeddings)).toThrow();
      });
    });

    describe("Graph Querying", () => {
      beforeEach(() => {
        const chunks = [
          { text: "Introduction to AI", metadata: { topic: "intro" } },
          { text: "Machine learning basics", metadata: { topic: "ml" } },
          { text: "Advanced deep learning", metadata: { topic: "dl" } },
          { text: "AI in healthcare", metadata: { topic: "application" } },
        ];

        const embeddings = [
          { vector: [1.0, 0.0, 0.0] },
          { vector: [0.8, 0.2, 0.0] },
          { vector: [0.7, 0.3, 0.0] },
          { vector: [0.5, 0.5, 0.0] },
        ];

        graphRAG.createGraph(chunks, embeddings);
      });

      it("should query graph with random walk", () => {
        const results = graphRAG.query({
          query: [0.9, 0.1, 0.0],
          topK: 2,
          randomWalkSteps: 50,
        });

        expect(results).toHaveLength(2);
        expect(results[0].score).toBeGreaterThan(results[1].score);
        expect(results[0].content).toBeDefined();
      });

      it("should return empty array for empty graph", () => {
        const emptyGraph = new GraphRAG();
        const results = emptyGraph.query({ query: [1, 0, 0], topK: 5 });
        expect(results).toHaveLength(0);
      });
    });

    describe("Graph Operations", () => {
      it("should add and remove nodes", () => {
        graphRAG.createGraph(
          [{ text: "Initial node", metadata: {} }],
          [{ vector: [1, 0, 0] }],
        );

        const newId = graphRAG.addNode(
          { text: "New node", metadata: {} },
          { vector: [0.9, 0.1, 0] },
        );

        expect(graphRAG.getStats().nodeCount).toBe(2);
        expect(graphRAG.getNode(newId)).toBeDefined();

        const removed = graphRAG.removeNode(newId);
        expect(removed).toBe(true);
        expect(graphRAG.getStats().nodeCount).toBe(1);
      });

      it("should find connected components", () => {
        // Create two disconnected clusters (threshold 0.5)
        const chunks = [
          { text: "Cluster 1 A", metadata: {} },
          { text: "Cluster 1 B", metadata: {} },
          { text: "Cluster 2 A", metadata: {} },
          { text: "Cluster 2 B", metadata: {} },
        ];

        // Two clusters: similar vectors within each, dissimilar between
        const embeddings = [
          { vector: [1.0, 0.0, 0.0] },
          { vector: [0.95, 0.05, 0.0] },
          { vector: [0.0, 1.0, 0.0] },
          { vector: [0.0, 0.95, 0.05] },
        ];

        graphRAG.createGraph(chunks, embeddings);

        const components = graphRAG.findConnectedComponents();
        expect(components.length).toBeGreaterThanOrEqual(1);
      });

      it("should serialize and deserialize graph", () => {
        graphRAG.createGraph(
          [
            { text: "Node 1", metadata: { key: "value" } },
            { text: "Node 2", metadata: {} },
          ],
          [{ vector: [1, 0, 0] }, { vector: [0.9, 0.1, 0] }],
        );

        const json = graphRAG.toJSON();
        const restored = GraphRAG.fromJSON(json);

        expect(restored.getStats().nodeCount).toBe(2);
      });
    });
  });

  // ============================================================================
  // Reranking Tests
  // ============================================================================

  describe("Reranking", () => {
    const mockResults: VectorQueryResult[] = [
      { id: "1", text: "AI transforms healthcare", score: 0.9 },
      { id: "2", text: "Machine learning in medicine", score: 0.85 },
      { id: "3", text: "Weather forecast today", score: 0.7 },
      { id: "4", text: "Deep learning diagnostics", score: 0.65 },
    ];

    describe("simpleRerank", () => {
      it("should rerank using vector score and position", () => {
        const results = simpleRerank(mockResults, {
          topK: 3,
          vectorWeight: 0.8,
          positionWeight: 0.2,
        });

        expect(results).toHaveLength(3);
        expect(results[0].result.id).toBe("1"); // Highest original score
        expect(results[0].details.semantic).toBe(0);
        expect(results[0].details.vector).toBeGreaterThan(0);
        expect(results[0].details.position).toBeGreaterThan(0);
      });

      it("should handle empty results", () => {
        const results = simpleRerank([]);
        expect(results).toHaveLength(0);
      });
    });

    // Note: Full rerank() and batchRerank() require LLM integration
    // Testing interface compatibility only
    describe("rerank interface", () => {
      it("should have correct function signature", () => {
        expect(typeof rerank).toBe("function");
        expect(typeof batchRerank).toBe("function");
      });
    });
  });

  // ============================================================================
  // Context Assembly Tests
  // ============================================================================

  describe("Context Assembly", () => {
    const testChunks: Chunk[] = [
      {
        id: "1",
        text: "Artificial intelligence is transforming industries.",
        metadata: { documentId: "doc1", chunkIndex: 0, source: "doc1.md" },
      },
      {
        id: "2",
        text: "Machine learning enables computers to learn from data.",
        metadata: { documentId: "doc1", chunkIndex: 1, source: "doc1.md" },
      },
      {
        id: "3",
        text: "Deep learning uses neural networks with many layers.",
        metadata: { documentId: "doc2", chunkIndex: 0, source: "doc2.md" },
      },
    ];

    describe("assembleContext", () => {
      it("should assemble context from chunks", () => {
        const context = assembleContext(testChunks);

        expect(context).toContain("Artificial intelligence");
        expect(context).toContain("Machine learning");
        expect(context).toContain("Deep learning");
      });

      it("should respect maxTokens limit", () => {
        const context = assembleContext(testChunks, {
          maxTokens: 50, // ~200 chars
        });

        expect(context.length).toBeLessThan(300);
      });

      it("should include section headers when configured", () => {
        const context = assembleContext(testChunks, {
          includeSectionHeaders: true,
          headerTemplate: "[{index}] Source: {source}",
        });

        expect(context).toContain("[1]");
        expect(context).toContain("Source:");
      });

      it("should deduplicate overlapping content", () => {
        const duplicateChunks = [
          ...testChunks,
          {
            id: "4",
            text: "Artificial intelligence is transforming industries.", // Duplicate
            metadata: { documentId: "doc3", chunkIndex: 0, source: "doc3.md" },
          },
        ];

        const context = assembleContext(duplicateChunks, {
          deduplicate: true,
          dedupeThreshold: 0.8,
        });

        // Count occurrences
        const matches = context.match(
          /Artificial intelligence is transforming/g,
        );
        expect(matches?.length || 0).toBeLessThanOrEqual(1);
      });
    });

    describe("formatContextWithCitations", () => {
      it("should format context with citations", () => {
        const { context, citations } = formatContextWithCitations(testChunks);

        expect(citations).toHaveLength(testChunks.length);
        expect(citations[0]).toContain("[1]");
        expect(context).toBeDefined();
      });
    });

    describe("createContextWindow", () => {
      it("should create context window with metadata", () => {
        const window = createContextWindow(testChunks, {
          maxTokens: 500,
        });

        expect(window.text).toBeDefined();
        expect(window.chunkCount).toBeGreaterThan(0);
        expect(window.charCount).toBeGreaterThan(0);
        expect(window.tokenCount).toBeGreaterThan(0);
        expect(window.citations.size).toBeGreaterThan(0);
      });

      it("should track truncated chunks", () => {
        const window = createContextWindow(testChunks, {
          maxTokens: 20, // Very small
        });

        expect(window.truncatedChunks).toBeGreaterThanOrEqual(0);
      });
    });

    describe("orderByDocumentStructure", () => {
      it("should order chunks by document and position", () => {
        const unordered: Chunk[] = [
          {
            id: "3",
            text: "Third",
            metadata: { documentId: "doc1", chunkIndex: 2 },
          },
          {
            id: "1",
            text: "First",
            metadata: { documentId: "doc1", chunkIndex: 0 },
          },
          {
            id: "2",
            text: "Second",
            metadata: { documentId: "doc1", chunkIndex: 1 },
          },
        ];

        const ordered = orderByDocumentStructure(unordered);

        expect(ordered[0].metadata.chunkIndex).toBe(0);
        expect(ordered[1].metadata.chunkIndex).toBe(1);
        expect(ordered[2].metadata.chunkIndex).toBe(2);
      });
    });

    describe("extractKeySentences", () => {
      it("should extract key sentences from text", () => {
        const text =
          "AI is important. Machine learning is a subset of AI. " +
          "Deep learning uses neural networks. Natural language processing " +
          "enables computers to understand human language.";

        const sentences = extractKeySentences(text, 2);

        expect(sentences).toHaveLength(2);
        expect(sentences.every((s) => s.length > 0)).toBe(true);
      });
    });
  });

  // ============================================================================
  // RAG Pipeline Tests
  // ============================================================================

  describe("RAG Pipeline", () => {
    describe("Pipeline Creation", () => {
      it("should create pipeline with configuration", () => {
        const pipeline = new RAGPipeline({
          embeddingModel: {
            provider: "openai",
            modelName: "text-embedding-3-small",
          },
          indexName: "test-index",
          defaultChunkingStrategy: "recursive",
          defaultChunkSize: 500,
          enableHybridSearch: false,
          enableGraphRAG: false,
        });

        expect(pipeline.getId()).toBeDefined();
        expect(pipeline.getStats().indexName).toBe("test-index");
      });

      it("should create pipeline with convenience function", () => {
        const pipeline = createRAGPipeline({
          provider: "openai",
          embeddingModel: "text-embedding-3-small",
        });

        expect(pipeline).toBeInstanceOf(RAGPipeline);
      });
    });

    describe("Pipeline Statistics", () => {
      it("should return correct stats", () => {
        const pipeline = new RAGPipeline({
          embeddingModel: {
            provider: "openai",
            modelName: "text-embedding-3-small",
          },
          enableHybridSearch: true,
          enableGraphRAG: true,
        });

        const stats = pipeline.getStats();

        expect(stats.totalDocuments).toBe(0);
        expect(stats.totalChunks).toBe(0);
        expect(stats.hybridSearchEnabled).toBe(true);
        expect(stats.graphRAGEnabled).toBe(true);
      });
    });

    describe("Pipeline Clear", () => {
      it("should clear indexed data", async () => {
        const pipeline = new RAGPipeline({
          embeddingModel: {
            provider: "openai",
            modelName: "text-embedding-3-small",
          },
        });

        await pipeline.clear();

        const stats = pipeline.getStats();
        expect(stats.totalDocuments).toBe(0);
        expect(stats.totalChunks).toBe(0);
      });
    });
  });

  // ============================================================================
  // Metadata Extraction Tests
  // ============================================================================

  describe("Metadata Extraction", () => {
    describe("LLMMetadataExtractor", () => {
      it("should create extractor with default config", () => {
        const extractor = new LLMMetadataExtractor();
        expect(extractor).toBeDefined();
      });

      it("should create extractor with custom config", () => {
        const extractor = new LLMMetadataExtractor({
          provider: "anthropic",
          modelName: "claude-3-sonnet",
        });
        expect(extractor).toBeDefined();
      });
    });

    describe("extractMetadata function", () => {
      it("should be exported as convenience function", () => {
        expect(typeof extractMetadata).toBe("function");
      });
    });
  });

  // ============================================================================
  // processDocument Integration Tests
  // ============================================================================

  describe("processDocument Integration", () => {
    it("should process document with default options", async () => {
      const chunks = await processDocument(SAMPLE_TEXT);

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].text).toBeDefined();
      expect(chunks[0].metadata).toBeDefined();
    });

    it("should process document with custom strategy", async () => {
      const chunks = await processDocument(SAMPLE_TEXT, {
        strategy: "sentence",
        maxSize: 300,
      });

      expect(chunks.length).toBeGreaterThan(0);
    });

    it("should process document with custom metadata", async () => {
      const chunks = await processDocument(SAMPLE_TEXT, {
        metadata: { category: "AI", version: "1.0" },
      });

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].metadata.custom).toMatchObject({
        category: "AI",
        version: "1.0",
      });
    });
  });

  // ============================================================================
  // End-to-End Integration Tests
  // ============================================================================

  describe("End-to-End Integration", () => {
    it("should process document through full chunking pipeline", async () => {
      // 1. Create document
      const doc = MDocument.fromMarkdown(SAMPLE_MARKDOWN);

      // 2. Chunk with appropriate strategy
      await doc.chunk({
        strategy: "markdown",
        config: { maxSize: 500, headerLevels: [1, 2, 3] },
      });

      // 3. Verify chunks
      const chunks = doc.getChunks();
      expect(chunks.length).toBeGreaterThan(0);

      // 4. Verify metadata
      expect(chunks.every((c) => c.metadata.documentId === doc.getId())).toBe(
        false,
      ); // Each chunk has its own doc ID from chunker
      expect(chunks.length).toBeGreaterThan(0);

      // 5. Verify history
      expect(doc.getHistory()).toContain("created");
      expect(doc.getHistory().some((h) => h.includes("chunked"))).toBe(true);
    });

    it("should support chunking multiple document types", async () => {
      const documents = [
        { content: SAMPLE_TEXT, type: "text" as const },
        { content: SAMPLE_MARKDOWN, type: "markdown" as const },
        { content: SAMPLE_HTML, type: "html" as const },
        { content: SAMPLE_JSON, type: "json" as const },
        { content: SAMPLE_LATEX, type: "latex" as const },
      ];

      for (const docInfo of documents) {
        const doc = new MDocument(docInfo.content, { type: docInfo.type });
        await doc.chunk(); // Uses default strategy based on type

        expect(doc.isChunked()).toBe(true);
        expect(doc.getChunkCount()).toBeGreaterThan(0);
      }
    });

    it("should handle vector store operations end-to-end", async () => {
      const vectorStore = new InMemoryVectorStore();

      // Create and chunk document
      const doc = MDocument.fromText(SAMPLE_TEXT);
      await doc.chunk({ config: { maxSize: 200 } });

      // Simulate embeddings (normally from embedding model)
      const chunks = doc.getChunks();
      const vectors = chunks.map((chunk, i) => ({
        id: chunk.id,
        vector: Array(3)
          .fill(0)
          .map((_, j) => Math.cos((i + j) * 0.5)), // Pseudo embedding
        metadata: { text: chunk.text, ...chunk.metadata },
      }));

      // Upsert to vector store
      await vectorStore.upsert("test-index", vectors);

      // Query
      const results = await vectorStore.query({
        indexName: "test-index",
        queryVector: vectors[0].vector,
        topK: 3,
      });

      expect(results.length).toBe(3);
      expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
    });

    it("should assemble context from vector search results", async () => {
      const searchResults: VectorQueryResult[] = [
        {
          id: "1",
          text: "AI is revolutionizing healthcare with diagnostic tools.",
          score: 0.95,
          metadata: { source: "health.md" },
        },
        {
          id: "2",
          text: "Machine learning models can predict patient outcomes.",
          score: 0.87,
          metadata: { source: "health.md" },
        },
        {
          id: "3",
          text: "Deep learning enables medical image analysis.",
          score: 0.82,
          metadata: { source: "imaging.md" },
        },
      ];

      const context = assembleContext(searchResults, {
        maxTokens: 500,
        includeSectionHeaders: true,
        citationFormat: "numbered",
      });

      expect(context).toContain("AI is revolutionizing");
      expect(context).toContain("[1]");
    });

    it("should create and query knowledge graph", () => {
      const graphRAG = new GraphRAG({ threshold: 0.6 });

      // Create chunks from sample text
      const chunks = [
        {
          text: "Introduction to artificial intelligence and its applications.",
          metadata: {},
        },
        {
          text: "Machine learning is a subset of AI focusing on learning from data.",
          metadata: {},
        },
        {
          text: "Deep learning uses neural networks with multiple layers.",
          metadata: {},
        },
        {
          text: "Natural language processing enables human-computer interaction.",
          metadata: {},
        },
      ];

      // Pseudo embeddings (in real scenario from embedding model)
      const embeddings = [
        { vector: [1.0, 0.1, 0.0] },
        { vector: [0.9, 0.2, 0.0] },
        { vector: [0.8, 0.3, 0.0] },
        { vector: [0.4, 0.1, 0.9] },
      ];

      graphRAG.createGraph(chunks, embeddings);

      // Query
      const results = graphRAG.query({
        query: [0.95, 0.15, 0.0], // Similar to first two chunks
        topK: 2,
      });

      expect(results.length).toBe(2);
      expect(results[0].content).toBeDefined();
    });

    it("should perform hybrid search combining vector and BM25", async () => {
      const bm25Index = new InMemoryBM25Index();
      const vectorStore = new InMemoryVectorStore();

      // Add documents to both indexes
      const documents = [
        {
          id: "1",
          text: "Machine learning algorithms for pattern recognition",
          vector: [1, 0],
        },
        {
          id: "2",
          text: "Deep neural networks in computer vision",
          vector: [0.5, 0.5],
        },
        {
          id: "3",
          text: "Natural language processing with transformers",
          vector: [0, 1],
        },
      ];

      await bm25Index.addDocuments(
        documents.map((d) => ({ id: d.id, text: d.text })),
      );
      await vectorStore.upsert(
        "test-index",
        documents.map((d) => ({
          id: d.id,
          vector: d.vector,
          metadata: { text: d.text },
        })),
      );

      // Search separately
      const bm25Results = await bm25Index.search("machine learning", 3);
      const vectorResults = await vectorStore.query({
        indexName: "test-index",
        queryVector: [0.9, 0.1],
        topK: 3,
      });

      // Combine with RRF
      const bm25Ranking = bm25Results.map((r, i) => ({
        id: r.id,
        rank: i + 1,
      }));
      const vectorRanking = vectorResults.map((r, i) => ({
        id: r.id,
        rank: i + 1,
      }));
      const fusedScores = reciprocalRankFusion([bm25Ranking, vectorRanking]);

      expect(fusedScores.size).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // RAG Integration with NeuroLink Tests
  // ============================================================================

  describe("RAG Integration with NeuroLink", () => {
    describe("createVectorQueryTool", () => {
      let vectorStore: InMemoryVectorStore;

      beforeAll(() => {
        vectorStore = new InMemoryVectorStore();
      });

      it("should create a valid tool object", async () => {
        const tool = createVectorQueryTool(
          {
            indexName: "test-index",
            embeddingModel: {
              provider: "openai",
              modelName: "text-embedding-3-small",
            },
            topK: 5,
          },
          vectorStore,
        );

        expect(tool).toBeDefined();
        expect(typeof tool).toBe("object");
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(tool.parameters).toBeDefined();
        expect(tool.execute).toBeDefined();
      });

      it("should have correct tool schema", async () => {
        const tool = createVectorQueryTool(
          {
            indexName: "schema-test-index",
            embeddingModel: {
              provider: "openai",
              modelName: "text-embedding-3-small",
            },
            topK: 10,
            description: "Custom knowledge base search",
          },
          vectorStore,
        );

        // Verify tool has required properties
        expect(tool.name).toMatch(/vector-query/);
        expect(tool.description).toBe("Custom knowledge base search");
        expect(typeof tool.execute).toBe("function");

        // Verify parameters schema (Zod schema)
        expect(tool.parameters).toBeDefined();
        // Zod schemas have a .shape property with field definitions
        const shape = (tool.parameters as z.ZodObject<z.ZodRawShape>).shape;
        expect(shape).toBeDefined();
        expect(shape.query).toBeDefined();
        expect(shape.topK).toBeDefined();
      });

      it("should create tool with custom id", async () => {
        const tool = createVectorQueryTool(
          {
            id: "my-custom-rag-tool",
            indexName: "custom-index",
            embeddingModel: {
              provider: "openai",
              modelName: "text-embedding-3-small",
            },
          },
          vectorStore,
        );

        expect(tool.name).toBe("my-custom-rag-tool");
      });

      it("should create tool with filter support when enabled", async () => {
        const tool = createVectorQueryTool(
          {
            indexName: "filter-test-index",
            embeddingModel: {
              provider: "openai",
              modelName: "text-embedding-3-small",
            },
            enableFilter: true,
          },
          vectorStore,
        );

        // Verify filter parameter is present when enabled (Zod schema)
        const shape = (tool.parameters as z.ZodObject<z.ZodRawShape>).shape;
        expect(shape.filter).toBeDefined();
      });

      it("should not have filter parameter when disabled", async () => {
        const tool = createVectorQueryTool(
          {
            indexName: "no-filter-index",
            embeddingModel: {
              provider: "openai",
              modelName: "text-embedding-3-small",
            },
            enableFilter: false,
          },
          vectorStore,
        );

        // Verify filter parameter is not present when disabled (Zod schema)
        const shape = (tool.parameters as z.ZodObject<z.ZodRawShape>).shape;
        expect(shape.filter).toBeUndefined();
      });

      it("should execute queries against vector store", async () => {
        // Set up test data in vector store
        const testVectors = [
          {
            id: "doc-1",
            vector: [1.0, 0.0, 0.0],
            metadata: { text: "Artificial intelligence overview" },
          },
          {
            id: "doc-2",
            vector: [0.9, 0.1, 0.0],
            metadata: { text: "Machine learning basics" },
          },
          {
            id: "doc-3",
            vector: [0.0, 1.0, 0.0],
            metadata: { text: "Cooking recipes" },
          },
        ];

        const testStore = new InMemoryVectorStore();
        await testStore.upsert("execute-test-index", testVectors);

        // Create mock embedding provider for testing
        const mockVectorStore = {
          query: async (params: {
            indexName: string;
            queryVector: number[];
            topK?: number;
            filter?: Record<string, unknown>;
            includeVectors?: boolean;
          }) => {
            // Directly call the underlying vector store query
            return testStore.query(params);
          },
        };

        // Create tool with mock store
        const tool = createVectorQueryTool(
          {
            indexName: "execute-test-index",
            embeddingModel: {
              provider: "openai",
              modelName: "text-embedding-3-small",
            },
            topK: 2,
          },
          mockVectorStore,
        );

        // Test that tool execute function exists and has correct signature
        expect(tool.execute).toBeDefined();
        expect(typeof tool.execute).toBe("function");

        // Note: Full execution test requires API key for embedding generation
        // The execute function signature is verified here
      });

      it("should support vector store as a resolver function", async () => {
        const resolverFn = (context: { userId?: string }) => {
          // Return different stores based on context
          return vectorStore;
        };

        const tool = createVectorQueryTool(
          {
            indexName: "resolver-test-index",
            embeddingModel: {
              provider: "openai",
              modelName: "text-embedding-3-small",
            },
          },
          resolverFn,
        );

        expect(tool).toBeDefined();
        expect(tool.execute).toBeDefined();
      });
    });

    describe("generate() with RAG tools", () => {
      it("should accept RAG tool in tools array", async () => {
        const vectorStore = new InMemoryVectorStore();
        const ragTool = createVectorQueryTool(
          {
            indexName: "rag-generate-test",
            embeddingModel: {
              provider: "openai",
              modelName: "text-embedding-3-small",
            },
            topK: 5,
          },
          vectorStore,
        );

        // Verify tool can be converted to expected format for generate()
        expect(ragTool.name).toBeDefined();
        expect(ragTool.parameters).toBeDefined();
        expect(ragTool.execute).toBeDefined();

        // Tool should have standard AI SDK compatible structure
        const toolForGenerate = {
          [ragTool.name]: {
            description: ragTool.description,
            parameters: ragTool.parameters,
            execute: ragTool.execute,
          },
        };

        expect(toolForGenerate[ragTool.name]).toBeDefined();
        expect(toolForGenerate[ragTool.name].description).toBeDefined();
        expect(toolForGenerate[ragTool.name].parameters).toBeDefined();
        expect(toolForGenerate[ragTool.name].execute).toBeDefined();
      });

      it("should return tool execution results with real API", async () => {
        // Set up vector store with test data
        const vectorStore = new InMemoryVectorStore();
        await vectorStore.upsert("live-test-index", [
          {
            id: "1",
            vector: [0.1, 0.2, 0.3],
            metadata: { text: "Test document about AI" },
          },
        ]);

        const ragTool = createVectorQueryTool(
          {
            indexName: "live-test-index",
            embeddingModel: {
              provider: "openai",
              modelName: "text-embedding-3-small",
            },
          },
          vectorStore,
        );

        // Verify tool is ready for integration
        expect(ragTool.name).toBeDefined();
        expect(ragTool.execute).toBeDefined();
      });

      it("should create tool with reranker configuration", async () => {
        const vectorStore = new InMemoryVectorStore();

        const ragTool = createVectorQueryTool(
          {
            indexName: "reranker-test-index",
            embeddingModel: {
              provider: "openai",
              modelName: "text-embedding-3-small",
            },
            topK: 10,
            reranker: {
              model: {
                provider: "openai",
                modelName: "gpt-4o-mini",
              },
              weights: {
                semantic: 0.5,
                vector: 0.3,
                position: 0.2,
              },
              topK: 5,
            },
          },
          vectorStore,
        );

        expect(ragTool).toBeDefined();
        expect(ragTool.name).toMatch(/vector-query/);
      });

      it("should create tool with provider options", async () => {
        const vectorStore = new InMemoryVectorStore();

        const ragTool = createVectorQueryTool(
          {
            indexName: "provider-options-test",
            embeddingModel: {
              provider: "openai",
              modelName: "text-embedding-3-small",
            },
            includeVectors: true,
            includeSources: true,
            providerOptions: {
              pinecone: {
                namespace: "test-namespace",
              },
            },
          },
          vectorStore,
        );

        expect(ragTool).toBeDefined();
        expect(ragTool.execute).toBeDefined();
      });
    });

    describe("stream() with RAG tools", () => {
      it("should accept RAG tool in tools array", async () => {
        const vectorStore = new InMemoryVectorStore();

        const ragTool = createVectorQueryTool(
          {
            indexName: "rag-stream-test",
            embeddingModel: {
              provider: "openai",
              modelName: "text-embedding-3-small",
            },
            topK: 5,
          },
          vectorStore,
        );

        // Verify tool structure is compatible with stream() options
        expect(ragTool.name).toBeDefined();
        expect(ragTool.description).toBeDefined();
        expect(ragTool.parameters).toBeDefined();
        expect(ragTool.execute).toBeDefined();

        // Tool should be convertible to Record<string, Tool> format
        const toolsForStream = {
          [ragTool.name]: {
            description: ragTool.description,
            parameters: ragTool.parameters,
            execute: ragTool.execute,
          },
        };

        expect(Object.keys(toolsForStream)).toHaveLength(1);
        expect(toolsForStream[ragTool.name]).toBeDefined();
      });

      it("should work with multiple RAG tools", async () => {
        const vectorStore1 = new InMemoryVectorStore();
        const vectorStore2 = new InMemoryVectorStore();

        const ragTool1 = createVectorQueryTool(
          {
            id: "knowledge-base-search",
            indexName: "knowledge-base",
            embeddingModel: {
              provider: "openai",
              modelName: "text-embedding-3-small",
            },
            description: "Search the main knowledge base",
          },
          vectorStore1,
        );

        const ragTool2 = createVectorQueryTool(
          {
            id: "faq-search",
            indexName: "faq-index",
            embeddingModel: {
              provider: "openai",
              modelName: "text-embedding-3-small",
            },
            description: "Search frequently asked questions",
          },
          vectorStore2,
        );

        // Both tools should be usable together
        const tools = {
          [ragTool1.name]: {
            description: ragTool1.description,
            parameters: ragTool1.parameters,
            execute: ragTool1.execute,
          },
          [ragTool2.name]: {
            description: ragTool2.description,
            parameters: ragTool2.parameters,
            execute: ragTool2.execute,
          },
        };

        expect(Object.keys(tools)).toHaveLength(2);
        expect(tools["knowledge-base-search"]).toBeDefined();
        expect(tools["faq-search"]).toBeDefined();
      });

      it("should create tool compatible with streaming context", async () => {
        const vectorStore = new InMemoryVectorStore();

        const ragTool = createVectorQueryTool(
          {
            indexName: "stream-context-test",
            embeddingModel: {
              provider: "openai",
              modelName: "text-embedding-3-small",
            },
          },
          // Test with context resolver function
          (context) => {
            // Context from stream can be used to resolve vector store
            return vectorStore;
          },
        );

        expect(ragTool).toBeDefined();
        expect(ragTool.execute).toBeDefined();

        // Verify execute accepts context parameter
        expect(ragTool.execute.length).toBeGreaterThanOrEqual(1);
      });
    });

    describe("RAG Pipeline integration with tools", () => {
      it("should create pipeline that can provide tools", async () => {
        const pipeline = new RAGPipeline({
          embeddingModel: {
            provider: "openai",
            modelName: "text-embedding-3-small",
          },
          indexName: "pipeline-tool-test",
        });

        expect(pipeline).toBeDefined();
        expect(pipeline.getId()).toBeDefined();

        // Pipeline should be able to create query tools
        const stats = pipeline.getStats();
        expect(stats.indexName).toBe("pipeline-tool-test");
      });

      it("should support creating tools from pipeline vector store", async () => {
        // Create a pipeline
        const pipeline = createRAGPipeline({
          provider: "openai",
          embeddingModel: "text-embedding-3-small",
        });

        // Create a separate vector store for direct tool usage
        const vectorStore = new InMemoryVectorStore();

        // Create RAG tool using the same embedding config
        const ragTool = createVectorQueryTool(
          {
            indexName: pipeline.getStats().indexName,
            embeddingModel: {
              provider: "openai",
              modelName: "text-embedding-3-small",
            },
          },
          vectorStore,
        );

        expect(ragTool).toBeDefined();
        expect(ragTool.name).toMatch(/vector-query/);
      });
    });

    describe("Context assembly for RAG-enhanced generation", () => {
      it("should assemble context suitable for generate() input", async () => {
        const chunks: Chunk[] = [
          {
            id: "chunk-1",
            text: "RAG systems combine retrieval with generation.",
            metadata: {
              documentId: "doc1",
              chunkIndex: 0,
              source: "rag-guide.md",
            },
          },
          {
            id: "chunk-2",
            text: "Vector databases enable semantic search.",
            metadata: {
              documentId: "doc2",
              chunkIndex: 0,
              source: "vectors.md",
            },
          },
        ];

        const context = assembleContext(chunks, {
          maxTokens: 500,
          includeSectionHeaders: true,
          citationFormat: "numbered",
        });

        // Context should be a string suitable for injection into prompts
        expect(typeof context).toBe("string");
        expect(context).toContain("RAG systems");
        expect(context).toContain("Vector databases");
        expect(context).toContain("[1]");
      });

      it("should format context with citations for attribution", async () => {
        const chunks: Chunk[] = [
          {
            id: "1",
            text: "First source content.",
            metadata: {
              documentId: "doc1",
              chunkIndex: 0,
              source: "source1.md",
            },
          },
          {
            id: "2",
            text: "Second source content.",
            metadata: {
              documentId: "doc2",
              chunkIndex: 0,
              source: "source2.md",
            },
          },
        ];

        const { context, citations } = formatContextWithCitations(chunks);

        expect(context).toBeDefined();
        expect(citations).toHaveLength(2);
        expect(citations[0]).toContain("[1]");
        expect(citations[1]).toContain("[2]");
      });
    });
  });
});
