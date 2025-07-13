#!/usr/bin/env node
/**
 * Factory Patterns Demo - Optimized for Small Teams
 *
 * Shows how to use NeuroLink's factory patterns efficiently:
 * - Simple provider creation
 * - Provider switching
 * - Fallback strategies
 * - Performance optimization
 */

import dotenv from "dotenv";
dotenv.config();

import { AIProviderFactory } from "@juspay/neurolink";

async function factoryPatternsDemo() {
  console.log("🏭 Factory Patterns Demo (Small Team Optimized)");
  console.log("=============================================\n");

  try {
    // 1. Simple Factory Usage
    console.log("1. 📦 Simple Provider Creation");

    const provider = await AIProviderFactory.createProvider(
      "google-ai",
      "gemini-2.5-pro",
    );
    if (provider) {
      console.log("   ✅ Google AI provider created");

      const result = await provider.generate({
        input: { text: "What is a factory pattern?" },
      });
      console.log(`   📝 Response: "${result.text}"\n`);
    }

    // 2. Provider Switching (Small Team Pattern)
    console.log("2. 🔄 Provider Switching Strategy");

    const providers = [
      { name: "google-ai", model: "gemini-2.5-flash" },
      { name: "openai", model: "gpt-4o-mini" },
      { name: "anthropic", model: "claude-3-haiku" },
    ];

    for (const config of providers) {
      try {
        const testProvider = await AIProviderFactory.createProvider(
          config.name,
          config.model,
        );
        if (testProvider) {
          console.log(`   ✅ ${config.name}/${config.model} available`);
        } else {
          console.log(`   ⚠️  ${config.name}/${config.model} not configured`);
        }
      } catch (error) {
        console.log(
          `   ❌ ${config.name}/${config.model} failed: ${error.message}`,
        );
      }
    }
    console.log();

    // 3. Fallback Strategy (Essential for Small Teams)
    console.log("3. 🛡️ Fallback Strategy");

    const fallbackOrder = ["google-ai", "openai", "anthropic"];
    let workingProvider = null;

    for (const providerName of fallbackOrder) {
      try {
        workingProvider = await AIProviderFactory.createProvider(providerName);
        if (workingProvider) {
          console.log(`   ✅ Using fallback provider: ${providerName}`);
          break;
        }
      } catch (error) {
        console.log(`   ⏭️  ${providerName} unavailable, trying next...`);
      }
    }

    if (workingProvider) {
      const result = await workingProvider.generate({
        input: { text: "Test fallback response" },
      });
      console.log(`   📝 Fallback response: "${result.text}"\n`);
    }

    console.log("🎉 Factory Patterns Demo Complete!");
  } catch (error) {
    console.error("❌ Factory demo failed:", error.message);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  factoryPatternsDemo().catch(console.error);
}

export { factoryPatternsDemo };
