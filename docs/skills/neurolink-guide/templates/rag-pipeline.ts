/**
 * NeuroLink RAG Pipeline Template
 *
 * This template demonstrates Retrieval-Augmented Generation (RAG)
 * for document-grounded AI responses.
 */

import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// ============================================
// Simple RAG (Recommended)
// ============================================

async function simpleRAG(): Promise<void> {
  console.log("=== Simple RAG ===\n");

  // Just pass files - NeuroLink handles everything
  const result = await neurolink.generate({
    prompt: "What are the main features described in the documentation?",
    rag: {
      files: ["./README.md"],
    },
  });

  console.log("Answer:", result.content);
}

// ============================================
// RAG with Options
// ============================================

async function ragWithOptions(): Promise<void> {
  console.log("\n=== RAG with Options ===\n");

  const result = await neurolink.generate({
    prompt: "How do I configure authentication?",
    rag: {
      files: ["./docs/setup.md", "./docs/configuration.md"],

      // Chunking options
      strategy: "markdown", // Markdown-aware chunking
      chunkSize: 512, // Characters per chunk
      chunkOverlap: 50, // Overlap between chunks

      // Retrieval options
      topK: 5, // Number of chunks to retrieve

      // Tool customization
      toolName: "search_docs",
      toolDescription: "Search the project documentation",
    },
  });

  console.log("Answer:", result.content);
}

// ============================================
// RAG with Streaming
// ============================================

async function ragWithStreaming(): Promise<void> {
  console.log("\n=== RAG with Streaming ===\n");

  const result = await neurolink.stream({
    prompt: "Explain the architecture in detail",
    rag: {
      files: ["./docs/architecture.md"],
      strategy: "markdown",
      topK: 10,
    },
  });

  for await (const chunk of result.stream) {
    if ("content" in chunk) {
      process.stdout.write(chunk.content);
    }
  }
  console.log("\n");
}

// ============================================
// RAG with Different Strategies
// ============================================

async function ragStrategies(): Promise<void> {
  console.log("\n=== RAG Strategies ===\n");

  const strategies = [
    { strategy: "character", description: "Fixed character chunks" },
    { strategy: "recursive", description: "Hierarchical by separators" },
    { strategy: "sentence", description: "Sentence boundaries" },
    { strategy: "markdown", description: "Markdown-aware" },
  ] as const;

  for (const { strategy, description } of strategies) {
    console.log(`\n--- ${strategy}: ${description} ---`);

    try {
      const result = await neurolink.generate({
        prompt: "What is the main purpose of this project?",
        rag: {
          files: ["./README.md"],
          strategy,
          chunkSize: 500,
        },
      });

      console.log("Answer:", result.content.slice(0, 200) + "...");
    } catch (error) {
      console.log("Error:", (error as Error).message);
    }
  }
}

// ============================================
// RAG with Custom Embedding
// ============================================

async function ragWithCustomEmbedding(): Promise<void> {
  console.log("\n=== RAG with Custom Embedding ===\n");

  const result = await neurolink.generate({
    prompt: "What testing approaches are used?",
    rag: {
      files: ["./docs/testing.md"],

      // Use specific embedding provider
      embeddingProvider: "openai",
      embeddingModel: "text-embedding-3-small",
    },
  });

  console.log("Answer:", result.content);
}

// ============================================
// RAG for Code
// ============================================

async function ragForCode(): Promise<void> {
  console.log("\n=== RAG for Code ===\n");

  const result = await neurolink.generate({
    prompt: "How is the NeuroLink class implemented?",
    rag: {
      files: ["./src/lib/neurolink.ts"],
      strategy: "recursive", // Good for code
      chunkSize: 1000, // Larger chunks for code context
      chunkOverlap: 100,
    },
  });

  console.log("Answer:", result.content);
}

// ============================================
// RAG for JSON/API Docs
// ============================================

async function ragForJSON(): Promise<void> {
  console.log("\n=== RAG for JSON ===\n");

  const result = await neurolink.generate({
    prompt: "What dependencies are required?",
    rag: {
      files: ["./package.json"],
      strategy: "json", // JSON-aware chunking
    },
  });

  console.log("Answer:", result.content);
}

// ============================================
// Multi-Document RAG
// ============================================

async function multiDocumentRAG(): Promise<void> {
  console.log("\n=== Multi-Document RAG ===\n");

  const result = await neurolink.generate({
    prompt: "Compare the setup process across different deployment methods",
    rag: {
      files: [
        "./docs/setup.md",
        "./docs/deployment/docker.md",
        "./docs/deployment/kubernetes.md",
        "./docs/deployment/serverless.md",
      ],
      strategy: "markdown",
      topK: 15, // More results for multi-doc
    },
  });

  console.log("Answer:", result.content);
}

// ============================================
// CLI Equivalent Examples
// ============================================

function showCLIExamples(): void {
  console.log("\n=== CLI Equivalents ===\n");

  const examples = [
    {
      description: "Basic RAG",
      command:
        'neurolink generate "What features exist?" --rag-files ./README.md',
    },
    {
      description: "With strategy",
      command:
        'neurolink generate "Explain" --rag-files ./docs/guide.md --rag-strategy markdown',
    },
    {
      description: "With options",
      command:
        'neurolink generate "Query" --rag-files ./docs/*.md --rag-chunk-size 512 --rag-top-k 10',
    },
    {
      description: "Streaming",
      command:
        'neurolink stream "Detail the process" --rag-files ./docs/process.md',
    },
  ];

  for (const { description, command } of examples) {
    console.log(`${description}:`);
    console.log(`  ${command}\n`);
  }
}

// ============================================
// Main
// ============================================

async function main(): Promise<void> {
  // Check if README.md exists for demo
  const fs = await import("fs/promises");
  try {
    await fs.access("./README.md");
  } catch {
    console.log("Note: Create README.md to run these examples\n");
  }

  await simpleRAG();
  await ragWithOptions();
  // await ragWithStreaming();
  // await ragStrategies();
  // await ragForCode();
  // await ragForJSON();

  showCLIExamples();
}

main().catch(console.error);
