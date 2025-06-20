#!/usr/bin/env node

/**
 * NeuroLink Basic Usage Example
 *
 * This example demonstrates:
 * - Basic text generation
 * - Provider selection
 * - Environment setup
 * - Error handling
 */

import { createBestAIProvider } from "@juspay/neurolink";

async function basicUsageExample() {
  console.log("🧠 NeuroLink Basic Usage Example\n");

  try {
    // 1. Create provider (auto-selects best available)
    console.log("1. Creating AI provider...");
    const provider = createBestAIProvider();

    // 2. Basic text generation
    console.log("2. Generating text...");
    const result = await provider.generateText({
      prompt: "Write a short haiku about artificial intelligence",
    });

    console.log("✅ Generated text:");
    console.log(result.text);
    console.log(`\n📊 Provider used: ${result.provider}`);
    console.log(`📊 Tokens used: ${result.usage?.totalTokens || "unknown"}`);
  } catch (error) {
    console.error("❌ Error:", error.message);

    if (error.message.includes("API key")) {
      console.log("\n💡 Setup help:");
      console.log("Set up an API key (Google AI is free):");
      console.log('export GOOGLE_AI_API_KEY="AIza-your-key"');
      console.log("Or set up OpenAI:");
      console.log('export OPENAI_API_KEY="sk-your-key"');
    }
  }
}

// Run the example
import { fileURLToPath } from "url";
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  basicUsageExample().catch(console.error);
}

export { basicUsageExample };
