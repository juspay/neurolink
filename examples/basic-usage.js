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
    const result = await provider.generate({
      input: { text: "Write a short haiku about artificial intelligence" },
    });

    console.log("✅ Generated text:");
    console.log(result.content);
    console.log(`\n📊 Provider used: ${result.provider}`);
    console.log(`📊 Tokens used: ${result.usage?.totalTokens || "unknown"}`);

    // 3. Using custom timeout (new in v1.12.0)
    console.log("\n3. Generating with custom timeout...");
    const timeoutResult = await provider.generate({
      input: { text: "Explain quantum computing in simple terms" },
      timeout: "45s", // 45 seconds timeout
      maxTokens: 300,
    });

    console.log("✅ Generated with timeout:");
    console.log(timeoutResult.text);
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
