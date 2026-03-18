#!/usr/bin/env node

/**
 * NeuroLink Embeddings Example
 *
 * This example demonstrates:
 * - Creating an AI provider with `AIProviderFactory.createProvider()`
 * - Generating a single embedding with `provider.embed()`
 * - Generating batch embeddings with `provider.embedMany()`
 * - Inspecting embedding dimensions
 *
 * Supported embedding providers and their defaults:
 *   - OpenAI:           text-embedding-3-small
 *   - Google AI Studio: gemini-embedding-001
 *   - Google Vertex:    text-embedding-004
 *   - Amazon Bedrock:   amazon.titan-embed-text-v2:0
 *
 * Usage:
 *   npx tsx examples/embeddings.ts
 *
 * Prerequisites:
 *   - OPENAI_API_KEY set (or another embedding-capable provider key)
 */

import { AIProviderFactory } from "@juspay/neurolink";

async function embeddingsExample() {
  console.log("NeuroLink Embeddings Example\n");

  try {
    // --- Example 1: Single text embedding with OpenAI ---
    console.log("--- Example 1: Single text embedding ---\n");

    const provider = await AIProviderFactory.createProvider("openai");
    console.log("Created OpenAI provider for embeddings.\n");

    const singleText = "The quick brown fox jumps over the lazy dog.";
    const embedding = await provider.embed(singleText);

    console.log(`Input: "${singleText}"`);
    console.log(`Embedding dimensions: ${embedding.length}`);
    console.log(
      `First 5 values: [${embedding
        .slice(0, 5)
        .map((v: number) => v.toFixed(6))
        .join(", ")}]`,
    );

    // --- Example 2: Batch embeddings with embedMany ---
    console.log("\n--- Example 2: Batch embeddings ---\n");

    const texts = [
      "Machine learning is a subset of artificial intelligence.",
      "Deep learning uses neural networks with many layers.",
      "Natural language processing deals with human language.",
      "Computer vision enables machines to interpret images.",
    ];

    const embeddings = await provider.embedMany(texts);

    console.log(`Embedded ${embeddings.length} texts:`);
    for (let i = 0; i < texts.length; i++) {
      console.log(
        `  [${i}] "${texts[i].substring(0, 50)}..." → ${embeddings[i].length} dimensions`,
      );
    }

    // --- Example 3: Comparing similarity via dot product ---
    console.log("\n--- Example 3: Cosine similarity between embeddings ---\n");

    const similar1 = "Dogs are loyal pets.";
    const similar2 = "Canines make faithful companions.";
    const different = "The stock market closed higher today.";

    const [emb1, emb2, emb3] = await provider.embedMany([
      similar1,
      similar2,
      different,
    ]);

    function cosineSimilarity(a: number[], b: number[]): number {
      let dot = 0;
      let normA = 0;
      let normB = 0;
      for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
      }
      return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    const simSimilar = cosineSimilarity(emb1, emb2);
    const simDifferent = cosineSimilarity(emb1, emb3);

    console.log(`"${similar1}" vs "${similar2}"`);
    console.log(`  Similarity: ${simSimilar.toFixed(4)}`);
    console.log();
    console.log(`"${similar1}" vs "${different}"`);
    console.log(`  Similarity: ${simDifferent.toFixed(4)}`);
    console.log();
    console.log(
      simSimilar > simDifferent
        ? "As expected, semantically similar sentences have higher similarity."
        : "Unexpected result — similarity scores may vary by model.",
    );
  } catch (error) {
    const err = error as Error;
    console.error("Error:", err.message);

    if (err.message.includes("API key") || err.message.includes("embed")) {
      console.log("\nSetup help:");
      console.log("Embeddings require a provider that supports them.");
      console.log('export OPENAI_API_KEY="sk-your-key"');
      console.log("Or use Google AI Studio:");
      console.log('export GOOGLE_AI_API_KEY="AIza-your-key"');
    }
  }

  console.log("\nDone!");
}

// Run the example
import { fileURLToPath } from "url";
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  embeddingsExample().catch(console.error);
}

export { embeddingsExample };
