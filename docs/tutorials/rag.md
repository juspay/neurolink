---
title: Build a RAG System
description: Tutorial - Build a Retrieval-Augmented Generation system with vector embeddings and MCP
keywords: tutorial, RAG, vector embeddings, retrieval, semantic search, pinecone, MCP
---

# Build a RAG System

**Step-by-step tutorial for building a Retrieval-Augmented Generation system with NeuroLink and Model Context Protocol (MCP)**

---

## What You'll Build

A production-ready RAG (Retrieval-Augmented Generation) system featuring:

- 📚 **Document ingestion** from multiple formats (PDF, MD, TXT)
- 🔍 **Semantic search** with vector embeddings
- 🤖 **AI-powered Q&A** with source citations
- 🔧 **MCP integration** for file system access
- 💾 **Vector storage** with Pinecone/in-memory
- 🎯 **Context-aware** responses
- 📊 **Relevance scoring** and ranking

**Tech Stack:**

- Next.js 14+
- TypeScript
- NeuroLink with MCP
- OpenAI Embeddings
- Pinecone (or in-memory vector store)
- PDF parsing libraries

**Time to Complete**: 60-90 minutes

---

## Prerequisites

- Node.js 18+
- OpenAI API key (for embeddings)
- Anthropic API key (for generation)
- Pinecone account (optional, free tier)
- Sample documents to index

---

## Understanding RAG

RAG combines retrieval and generation:

```
User Question
    ↓
1. Convert to embedding
    ↓
2. Search vector database
    ↓
3. Retrieve relevant documents
    ↓
4. Generate answer using documents as context
    ↓
Answer with Sources
```

**Why RAG?**

- ✅ Access to custom/private data
- ✅ Up-to-date information
- ✅ Reduced hallucinations
- ✅ Source attribution
- ✅ Cost-effective (smaller context windows)

---

## Step 1: Project Setup

### Initialize Project

```bash
npx create-next-app@latest rag-system
cd rag-system
```

**Options:**

- TypeScript: Yes
- Tailwind CSS: Yes
- App Router: Yes

### Install Dependencies

```bash
# Core dependencies
npm install @raisahai/neurolink @anthropic-ai/sdk

# Vector store (choose one)
npm install @pinecone-database/pinecone  # Hosted
# OR
npm install hnswlib-node  # Local

# Document processing
npm install pdf-parse mammoth  # PDF and DOCX
npm install gray-matter        # Markdown frontmatter
```

### Environment Setup

Create `.env.local`:

```env
# AI Providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Vector Store (if using Pinecone)
PINECONE_API_KEY=...
PINECONE_ENVIRONMENT=us-east-1-aws
PINECONE_INDEX=rag-docs

# Application
DOCS_PATH=./docs
```

---

## Step 2: Document Processing

### Create Document Parser

Create `src/lib/document-parser.ts`:

```typescript
import fs from "fs/promises";
import path from "path";
import pdf from "pdf-parse";
import matter from "gray-matter";

export type Document = {
  id: string;
  content: string;
  metadata: {
    title: string;
    source: string;
    type: "pdf" | "md" | "txt";
    path: string;
    createdAt: Date;
  };
};

export class DocumentParser {
  async parseDirectory(dirPath: string): Promise<Document[]> {
    const documents: Document[] = [];
    const files = await this.getAllFiles(dirPath);

    for (const filePath of files) {
      try {
        const doc = await this.parseFile(filePath);
        if (doc) {
          documents.push(doc);
        }
      } catch (error) {
        console.error(`Failed to parse ${filePath}:`, error);
      }
    }

    return documents;
  }

  private async getAllFiles(dirPath: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        const subFiles = await this.getAllFiles(fullPath);
        files.push(...subFiles);
      } else if (this.isSupportedFile(entry.name)) {
        files.push(fullPath);
      }
    }

    return files;
  }

  private isSupportedFile(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    return [".pdf", ".md", ".txt"].includes(ext);
  }

  private async parseFile(filePath: string): Promise<Document | null> {
    const ext = path.extname(filePath).toLowerCase();
    const stats = await fs.stat(filePath);

    switch (ext) {
      case ".pdf":
        return this.parsePDF(filePath, stats.birthtime);

      case ".md":
        return this.parseMarkdown(filePath, stats.birthtime);

      case ".txt":
        return this.parseText(filePath, stats.birthtime);

      default:
        return null;
    }
  }

  private async parsePDF(filePath: string, createdAt: Date): Promise<Document> {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdf(dataBuffer);

    return {
      id: this.generateId(filePath),
      content: data.text,
      metadata: {
        title: path.basename(filePath, ".pdf"),
        source: filePath,
        type: "pdf",
        path: filePath,
        createdAt,
      },
    };
  }

  private async parseMarkdown(
    filePath: string,
    createdAt: Date,
  ): Promise<Document> {
    const content = await fs.readFile(filePath, "utf-8");
    const { data: frontmatter, content: markdown } = matter(content);

    return {
      id: this.generateId(filePath),
      content: markdown,
      metadata: {
        title: frontmatter.title || path.basename(filePath, ".md"),
        source: filePath,
        type: "md",
        path: filePath,
        createdAt: frontmatter.date || createdAt,
      },
    };
  }

  private async parseText(
    filePath: string,
    createdAt: Date,
  ): Promise<Document> {
    const content = await fs.readFile(filePath, "utf-8");

    return {
      id: this.generateId(filePath),
      content,
      metadata: {
        title: path.basename(filePath, ".txt"),
        source: filePath,
        type: "txt",
        path: filePath,
        createdAt,
      },
    };
  }

  private generateId(filePath: string): string {
    return Buffer.from(filePath).toString("base64");
  }
}
```

---

## Step 3: Text Chunking

Create `src/lib/text-chunker.ts`:

```typescript
export type Chunk = {
  id: string;
  documentId: string;
  content: string;
  metadata: any;
  chunkIndex: number;
};

export class TextChunker {
  constructor(
    private chunkSize: number = 1000,
    private overlap: number = 200,
  ) {}

  chunk(document: Document): Chunk[] {
    const chunks: Chunk[] = [];
    const text = document.content;
    let start = 0;
    let chunkIndex = 0;

    while (start < text.length) {
      const end = Math.min(start + this.chunkSize, text.length);
      const chunkText = text.slice(start, end);

      if (chunkText.trim().length > 0) {
        chunks.push({
          id: `${document.id}-chunk-${chunkIndex}`,
          documentId: document.id,
          content: chunkText,
          metadata: {
            ...document.metadata,
            chunkIndex,
            totalChunks: 0,
          },
          chunkIndex,
        });

        chunkIndex++;
      }

      start += this.chunkSize - this.overlap;
    }

    chunks.forEach((chunk) => {
      chunk.metadata.totalChunks = chunks.length;
    });

    return chunks;
  }

  chunkAll(documents: Document[]): Chunk[] {
    return documents.flatMap((doc) => this.chunk(doc));
  }
}
```

---

## Step 4: Embedding Service

Create `src/lib/embeddings.ts`:

```typescript
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export class EmbeddingService {
  async createEmbedding(text: string): Promise<number[]> {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });

    return response.data[0].embedding;
  }

  async createEmbeddings(texts: string[]): Promise<number[][]> {
    const BATCH_SIZE = 100;
    const embeddings: number[][] = [];

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);

      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: batch,
      });

      embeddings.push(...response.data.map((d) => d.embedding));

      console.log(
        `Embedded ${Math.min(i + BATCH_SIZE, texts.length)}/${texts.length} chunks`,
      );
    }

    return embeddings;
  }

  cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
```

---

## Step 5: Vector Store (In-Memory)

Create `src/lib/vector-store.ts`:

```typescript
import { Chunk } from "./text-chunker";
import { EmbeddingService } from "./embeddings";

type VectorEntry = {
  // (1)!
  id: string;
  embedding: number[];
  chunk: Chunk;
};

export class InMemoryVectorStore {
  private vectors: VectorEntry[] = []; // (2)!
  private embeddingService: EmbeddingService;

  constructor() {
    this.embeddingService = new EmbeddingService();
  }

  async addChunks(chunks: Chunk[]): Promise<void> {
    // (3)!
    console.log(`Creating embeddings for ${chunks.length} chunks...`);

    const texts = chunks.map((c) => c.content);
    const embeddings = await this.embeddingService.createEmbeddings(texts); // (4)!

    for (let i = 0; i < chunks.length; i++) {
      this.vectors.push({
        id: chunks[i].id,
        embedding: embeddings[i],
        chunk: chunks[i],
      });
    }

    console.log(`Indexed ${chunks.length} chunks`);
  }

  async search(
    query: string,
    topK: number = 5,
  ): Promise<
    Array<{
      // (5)!
      chunk: Chunk;
      score: number;
    }>
  > {
    const queryEmbedding = await this.embeddingService.createEmbedding(query); // (6)!

    const results = this.vectors.map((entry) => ({
      // (7)!
      chunk: entry.chunk,
      score: this.embeddingService.cosineSimilarity(
        queryEmbedding,
        entry.embedding,
      ),
    }));

    results.sort((a, b) => b.score - a.score); // (8)!

    return results.slice(0, topK); // (9)!
  }

  size(): number {
    return this.vectors.length;
  }

  clear(): void {
    this.vectors = [];
  }
}
```

1. **Vector entry structure**: Each entry stores the chunk's embedding vector, metadata, and a reference to the original chunk.
2. **In-memory storage**: All vectors are stored in RAM. For production with large datasets (>10K docs), use Pinecone or another vector database.
3. **Batch embedding**: Process all chunks together for efficiency. OpenAI allows up to 100 texts per API call.
4. **Convert text to vectors**: Each chunk is converted to a 1536-dimensional embedding vector (using OpenAI's `text-embedding-3-small` model).
5. **Semantic search**: Find the most relevant chunks by comparing vector similarity, not keyword matching.
6. **Query embedding**: Convert the user's question into the same vector space as the document chunks.
7. **Calculate similarity**: Compute cosine similarity between query vector and all document vectors. Score ranges from -1 to 1 (higher = more similar).
8. **Rank by relevance**: Sort results by similarity score in descending order (most relevant first).
9. **Return top results**: Return only the `topK` most relevant chunks to use as context for the AI.

---

## Step 6: Alternative: Pinecone Vector Store

Create `src/lib/pinecone-store.ts`:

```typescript
import { Pinecone } from "@pinecone-database/pinecone";
import { Chunk } from "./text-chunker";
import { EmbeddingService } from "./embeddings";

export class PineconeVectorStore {
  private client: Pinecone;
  private indexName: string;
  private embeddingService: EmbeddingService;

  constructor() {
    this.client = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });

    this.indexName = process.env.PINECONE_INDEX || "rag-docs";
    this.embeddingService = new EmbeddingService();
  }

  async initialize(): Promise<void> {
    const indexes = await this.client.listIndexes();

    if (!indexes.indexes?.find((i) => i.name === this.indexName)) {
      await this.client.createIndex({
        name: this.indexName,
        dimension: 1536,
        metric: "cosine",
        spec: {
          serverless: {
            cloud: "aws",
            region: "us-east-1",
          },
        },
      });

      console.log(`Created Pinecone index: ${this.indexName}`);
    }
  }

  async addChunks(chunks: Chunk[]): Promise<void> {
    const index = this.client.index(this.indexName);

    const BATCH_SIZE = 100;

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const texts = batch.map((c) => c.content);
      const embeddings = await this.embeddingService.createEmbeddings(texts);

      const vectors = batch.map((chunk, idx) => ({
        id: chunk.id,
        values: embeddings[idx],
        metadata: {
          documentId: chunk.documentId,
          content: chunk.content,
          ...chunk.metadata,
        },
      }));

      await index.upsert(vectors);

      console.log(
        `Indexed ${Math.min(i + BATCH_SIZE, chunks.length)}/${chunks.length} chunks`,
      );
    }
  }

  async search(
    query: string,
    topK: number = 5,
  ): Promise<
    Array<{
      chunk: Chunk;
      score: number;
    }>
  > {
    const index = this.client.index(this.indexName);
    const queryEmbedding = await this.embeddingService.createEmbedding(query);

    const results = await index.query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
    });

    return (
      results.matches?.map((match) => ({
        chunk: {
          id: match.id,
          documentId: match.metadata?.documentId as string,
          content: match.metadata?.content as string,
          metadata: match.metadata,
          chunkIndex: match.metadata?.chunkIndex as number,
        },
        score: match.score || 0,
      })) || []
    );
  }
}
```

---

## Step 7: RAG Service

Create `src/lib/rag-service.ts`:

```typescript
import { NeuroLink } from "@raisahai/neurolink";
import { InMemoryVectorStore } from "./vector-store";
import { DocumentParser } from "./document-parser";
import { TextChunker } from "./text-chunker";

export type RAGResult = {
  answer: string;
  sources: Array<{
    title: string;
    content: string;
    score: number;
    path: string;
  }>;
};

export class RAGService {
  private ai: NeuroLink;
  private vectorStore: InMemoryVectorStore;
  private documentParser: DocumentParser;
  private textChunker: TextChunker;

  constructor() {
    this.ai = new NeuroLink({
      // (1)!
      providers: [
        {
          name: "anthropic",
          config: {
            apiKey: process.env.ANTHROPIC_API_KEY!,
            model: "claude-3-5-sonnet-20241022",
          },
        },
      ],
    });

    this.vectorStore = new InMemoryVectorStore();
    this.documentParser = new DocumentParser();
    this.textChunker = new TextChunker(1000, 200); // (2)!
  }

  async indexDocuments(docsPath: string): Promise<number> {
    // (3)!
    console.log(`Indexing documents from: ${docsPath}`);

    const documents = await this.documentParser.parseDirectory(docsPath);
    console.log(`Found ${documents.length} documents`);

    const chunks = this.textChunker.chunkAll(documents); // (4)!
    console.log(`Created ${chunks.length} chunks`);

    await this.vectorStore.addChunks(chunks); // (5)!

    return chunks.length;
  }

  async query(question: string, topK: number = 5): Promise<RAGResult> {
    // (6)!
    const results = await this.vectorStore.search(question, topK); // (7)!

    const context = results // (8)!
      .map(
        (r, i) =>
          `[Source ${i + 1}: ${r.chunk.metadata.title}]\n${r.chunk.content}`,
      )
      .join("\n\n---\n\n");

    const prompt = `You are a helpful AI assistant. Answer the user's question based on the provided context. // (9)!

Context from knowledge base:
${context}

User Question: ${question}

Instructions:
1. Answer based primarily on the provided context
2. If the context doesn't contain enough information, say so
3. Cite specific sources by number when using information
4. Be concise but comprehensive

Answer:`;

    const response = await this.ai.generate({
      // (10)!
      input: { text: prompt },
      provider: "anthropic",
    });

    return {
      answer: response.content,
      sources: results.map((r, i) => ({
        title: r.chunk.metadata.title,
        content: r.chunk.content.substring(0, 200) + "...",
        score: r.score,
        path: r.chunk.metadata.path,
      })),
    };
  }

  getIndexSize(): number {
    return this.vectorStore.size();
  }

  clearIndex(): void {
    this.vectorStore.clear();
  }
}
```

1. **Use Claude for generation**: Claude 3.5 Sonnet excels at following instructions and citing sources accurately in RAG applications.
2. **Chunk configuration**: 1000 characters per chunk with 200 character overlap to maintain context across chunk boundaries.
3. **Indexing pipeline**: Parse documents → chunk text → create embeddings → store in vector database. Run this once when documents change.
4. **Text chunking**: Split documents into smaller chunks. Large documents can't fit in context windows, and smaller chunks improve retrieval precision.
5. **Create embeddings**: Convert each chunk to a vector representation. This is the most expensive operation (OpenAI API costs ~$0.02/1M tokens).
6. **RAG query flow**: Retrieve relevant chunks → build context → generate answer with citations.
7. **Semantic search**: Find the 5 most relevant chunks using vector similarity (not keyword matching).
8. **Build augmented context**: Format retrieved chunks with source labels to enable the AI to cite sources in its answer.
9. **Structured prompt**: Clear instructions help the AI stay grounded in the provided context and cite sources properly.
10. **Generate final answer**: NeuroLink sends the question + context to Claude, which generates an answer based on the retrieved information.

---

## Step 8: API Routes

### Index Documents API

Create `src/app/api/index/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { RAGService } from "@/lib/rag-service";

const ragService = new RAGService();

export async function POST(request: NextRequest) {
  try {
    const { docsPath } = await request.json();

    const path = docsPath || process.env.DOCS_PATH || "./docs";

    const chunksIndexed = await ragService.indexDocuments(path);

    return NextResponse.json({
      success: true,
      chunksIndexed,
      message: `Indexed ${chunksIndexed} chunks from ${path}`,
    });
  } catch (error) {
    console.error("Index error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const size = ragService.getIndexSize();

    return NextResponse.json({
      indexed: size,
      ready: size > 0,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### Query API

Create `src/app/api/query/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { RAGService } from "@/lib/rag-service";

const ragService = new RAGService();

export async function POST(request: NextRequest) {
  try {
    const { question, topK } = await request.json();

    if (!question) {
      return NextResponse.json(
        { error: "Question is required" },
        { status: 400 },
      );
    }

    if (ragService.getIndexSize() === 0) {
      return NextResponse.json(
        { error: "No documents indexed. Please index documents first." },
        { status: 400 },
      );
    }

    const result = await ragService.query(question, topK || 5);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Query error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

---

## Step 9: Frontend Interface

Create `src/app/page.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';

type Source = {
  title: string;
  content: string;
  score: number;
  path: string;
};

export default function Home() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(false);
  const [indexStatus, setIndexStatus] = useState({ indexed: 0, ready: false });
  const [indexing, setIndexing] = useState(false);

  useEffect(() => {
    checkIndexStatus();
  }, []);

  async function checkIndexStatus() {
    const response = await fetch('/api/index');
    const data = await response.json();
    setIndexStatus(data);
  }

  async function handleIndex() {
    setIndexing(true);
    try {
      const response = await fetch('/api/index', { method: 'POST' });
      const data = await response.json();

      if (data.success) {
        alert(data.message);
        await checkIndexStatus();
      }
    } catch (error) {
      alert('Failed to index documents');
    } finally {
      setIndexing(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!question.trim()) return;

    setLoading(true);
    setAnswer('');
    setSources([]);

    try {
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      });

      const data = await response.json();

      if (data.error) {
        alert(data.error);
        return;
      }

      setAnswer(data.answer);
      setSources(data.sources);

    } catch (error) {
      alert('Failed to query');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">RAG Knowledge Base</h1>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Index Status</h2>
          <p className="mb-4">
            {indexStatus.indexed} chunks indexed
            {indexStatus.ready ? ' ✅' : ' ⚠️ No documents indexed'}
          </p>
          <button
            onClick={handleIndex}
            disabled={indexing}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
          >
            {indexing ? 'Indexing...' : 'Index Documents'}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Ask a Question</h2>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What would you like to know?"
            className="w-full p-3 border rounded-lg mb-4 h-24"
            disabled={!indexStatus.ready || loading}
          />
          <button
            type="submit"
            disabled={!indexStatus.ready || loading || !question.trim()}
            className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300"
          >
            {loading ? 'Searching...' : 'Ask'}
          </button>
        </form>

        {answer && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Answer</h2>
            <div className="prose max-w-none">
              <p className="whitespace-pre-wrap">{answer}</p>
            </div>
          </div>
        )}

        {sources.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Sources</h2>
            <div className="space-y-4">
              {sources.map((source, i) => (
                <div key={i} className="border-l-4 border-blue-500 pl-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold">{source.title}</h3>
                    <span className="text-sm text-gray-500">
                      {(source.score * 100).toFixed(1)}% relevant
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{source.content}</p>
                  <p className="text-xs text-gray-400">{source.path}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Step 10: Testing

### Prepare Test Documents

Create `docs/` folder with sample files:

**docs/introduction.md:**

```markdown
---
title: Introduction to RAG
---

# Retrieval-Augmented Generation

RAG combines retrieval with AI generation for more accurate, source-backed answers.
```

**docs/architecture.md:**

```markdown
---
title: RAG Architecture
---

# System Architecture

The RAG system consists of three main components:

1. Document ingestion and chunking
2. Vector embedding and storage
3. Retrieval and generation
```

### Index Documents

1. Start dev server: `npm run dev`
2. Click "Index Documents"
3. Wait for completion

### Test Queries

Try these questions:

```
What is RAG?
How does the RAG system work?
What are the main components?
```

Verify:

- Relevant sources retrieved
- Answer cites sources
- Relevance scores make sense

---

## Step 11: Production Enhancements

### Add Streaming Responses

```typescript
export async function POST(request: NextRequest) {
  const { question } = await request.json();

  const results = await ragService.search(question);
  const context = formatContext(results);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of ai.stream({ input: { text: prompt } })) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`),
        );
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream" },
  });
}
```

### Add Document Upload

```typescript
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File;

  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(`./docs/${file.name}`, buffer);

  await ragService.indexDocuments("./docs");

  return NextResponse.json({ success: true });
}
```

### Add Metadata Filtering

```typescript
async search(
  query: string,
  filters?: { type?: string; dateFrom?: Date }
): Promise<SearchResult[]> {
  let results = await this.vectorStore.search(query, 10);

  if (filters?.type) {
    results = results.filter(r => r.chunk.metadata.type === filters.type);
  }

  if (filters?.dateFrom) {
    results = results.filter(r =>
      new Date(r.chunk.metadata.createdAt) >= filters.dateFrom!
    );
  }

  return results.slice(0, 5);
}
```

---

## Step 12: MCP Integration (Advanced)

Using Model Context Protocol for file access:

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function queryWithMCP(question: string) {
  const response = await client.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Search the documentation and answer: ${question}`,
      },
    ],
    tools: [
      {
        name: "read_file",
        description: "Read documentation files",
        input_schema: {
          type: "object",
          properties: {
            path: { type: "string" },
          },
          required: ["path"],
        },
      },
    ],
  });

  return response.content;
}
```

---

## Troubleshooting

### Embeddings API Errors

```typescript
// Add retry logic
async createEmbedding(text: string, retries = 3): Promise<number[]> {
  for (let i = 0; i < retries; i++) {
    try {
      return await this.createEmbeddingInternal(text);
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
    }
  }
}
```

### Memory Issues with Large Documents

```typescript
// Process in batches
const CHUNK_BATCH_SIZE = 100;

for (let i = 0; i < chunks.length; i += CHUNK_BATCH_SIZE) {
  const batch = chunks.slice(i, i + CHUNK_BATCH_SIZE);
  await this.vectorStore.addChunks(batch);
}
```

### Poor Retrieval Quality

```typescript
// Adjust chunk size and overlap
const chunker = new TextChunker(
  500, // Smaller chunks
  100, // More overlap
);

// Increase topK
const results = await vectorStore.search(query, 10);
```

---

## Related Documentation

**Feature Guides:**

- [Auto Evaluation](../features/auto-evaluation.md) - Automated quality scoring for RAG responses
- [Guardrails](../features/guardrails.md) - Content filtering for generated answers
- [Multimodal Chat](../features/multimodal-chat.md) - Add image/PDF processing to RAG

**Tutorials & Examples:**

- [Chat App Tutorial](./chat-app.md) - Build a chat interface
- [Document Analysis Use Case](../guides/examples/use-cases.md)
- [MCP Server Catalog](../guides/mcp/server-catalog.md) - MCP servers for data retrieval

---

## Summary

You've built a production-ready RAG system with:

✅ Multi-format document ingestion (PDF, MD, TXT)
✅ Text chunking with overlap
✅ Vector embeddings (OpenAI)
✅ Semantic search
✅ AI-powered Q&A with source citations
✅ Relevance scoring
✅ Modern web interface

**Cost Analysis:**

- Embedding: ~$0.02 per 1M tokens
- Generation: ~$3 per 1M input tokens (Claude 3.5 Sonnet)
- 1000 documents → ~$0.50 to index
- 1000 queries → ~$2

**Next Steps:**

1. Add authentication
2. Implement caching
3. Add document versioning
4. Deploy to production
