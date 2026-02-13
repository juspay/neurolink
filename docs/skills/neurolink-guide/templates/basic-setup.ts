/**
 * NeuroLink Basic Setup Template
 *
 * This template demonstrates the basic usage of the NeuroLink SDK
 * for text generation with AI providers.
 */

import { NeuroLink } from "@juspay/neurolink";
import type { GenerateOptions, GenerateResult } from "@juspay/neurolink";

// Initialize with default settings
// Auto-selects best available provider based on environment variables
const neurolink = new NeuroLink();

// Or with specific configuration
const neurolinkWithConfig = new NeuroLink({
  conversationMemory: { enabled: true },
  enableOrchestration: true,
});

async function basicGeneration(): Promise<void> {
  // Simple string prompt
  const result = await neurolink.generate(
    "Explain quantum computing in simple terms",
  );
  console.log("Response:", result.content);
  console.log("Tokens used:", result.usage?.total);
}

async function generationWithOptions(): Promise<void> {
  const options: GenerateOptions = {
    input: {
      text: "Write a function to calculate fibonacci numbers in TypeScript",
    },
    provider: "openai", // or 'anthropic', 'vertex', 'bedrock', etc.
    model: "gpt-4o",
    temperature: 0.3, // Lower for more deterministic output
    maxTokens: 500,
    systemPrompt:
      "You are an expert TypeScript developer. Write clean, typed code.",
  };

  const result = await neurolink.generate(options);
  console.log("Generated code:\n", result.content);
}

async function checkProviders(): Promise<void> {
  // Get available providers
  const providers = await neurolink.getAvailableProviders();
  console.log("Available providers:", providers);

  // Get best provider
  const best = await neurolink.getBestProvider();
  console.log("Best available provider:", best);

  // Get detailed status
  const status = await neurolink.getProviderStatus();
  console.log("Provider status:", status);
}

async function withEventListeners(): Promise<void> {
  const emitter = neurolink.getEventEmitter();

  // Listen for generation events
  emitter.on("generation:start", (event) => {
    console.log(`[START] Provider: ${event.provider}`);
  });

  emitter.on("generation:end", (event) => {
    console.log(`[END] Completed in ${event.duration}ms`);
  });

  emitter.on("error", (event) => {
    console.error("[ERROR]", event.error);
  });

  // Now generate
  const result = await neurolink.generate("Hello, world!");
  console.log(result.content);
}

async function main(): Promise<void> {
  console.log("=== Basic Generation ===");
  await basicGeneration();

  console.log("\n=== Generation with Options ===");
  await generationWithOptions();

  console.log("\n=== Check Providers ===");
  await checkProviders();

  console.log("\n=== With Event Listeners ===");
  await withEventListeners();
}

main().catch(console.error);
