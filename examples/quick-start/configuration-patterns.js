#!/usr/bin/env node
/**
 * NeuroLink Configuration Patterns Demo
 *
 * Shows different ways to configure and use NeuroLink:
 * - Simple generation with provider selection
 * - Provider switching strategies
 * - Fallback strategies for reliability
 * - Reusable configuration patterns
 *
 * All examples use the standard NeuroLink pattern:
 *   const neurolink = new NeuroLink();
 *   await neurolink.generate({ input, provider, model });
 */

import dotenv from "dotenv";
dotenv.config();

import { NeuroLink } from "@juspay/neurolink";

async function configurationPatternsDemo() {
  console.log("NeuroLink Configuration Patterns Demo");
  console.log("======================================\n");

  try {
    // Create a single NeuroLink instance to reuse
    const neurolink = new NeuroLink();

    // 1. Simple Generation with Provider Selection
    console.log("1. Simple Provider Selection");

    const result = await neurolink.generate({
      input: { text: "What is a factory pattern?" },
      provider: "google-ai",
      model: "gemini-2.5-pro",
    });
    console.log("   Google AI provider used successfully");
    console.log(`   Response: "${result.text}"\n`);

    // 2. Provider Switching (Small Team Pattern)
    console.log("2. Provider Switching Strategy");

    const providers = [
      { provider: "google-ai", model: "gemini-2.5-flash" },
      { provider: "openai", model: "gpt-4o-mini" },
      { provider: "anthropic", model: "claude-3-haiku-20240307" },
    ];

    for (const config of providers) {
      try {
        const testResult = await neurolink.generate({
          input: { text: "Hello" },
          provider: config.provider,
          model: config.model,
          maxTokens: 10,
        });
        if (testResult.text) {
          console.log(`   ${config.provider}/${config.model} available`);
        }
      } catch (error) {
        console.log(
          `   ${config.provider}/${config.model} failed: ${error.message}`,
        );
      }
    }
    console.log();

    // 3. Fallback Strategy (Essential for Small Teams)
    console.log("3. Fallback Strategy");

    const fallbackOrder = [
      { provider: "google-ai", model: "gemini-2.5-flash" },
      { provider: "openai", model: "gpt-4o-mini" },
      { provider: "anthropic", model: "claude-3-haiku-20240307" },
    ];

    let fallbackResult = null;
    let usedProvider = null;

    for (const config of fallbackOrder) {
      try {
        fallbackResult = await neurolink.generate({
          input: { text: "Test fallback response" },
          provider: config.provider,
          model: config.model,
        });
        if (fallbackResult.text) {
          usedProvider = config.provider;
          console.log(`   Using fallback provider: ${config.provider}`);
          break;
        }
      } catch (error) {
        console.log(`   ${config.provider} unavailable, trying next...`);
      }
    }

    if (fallbackResult && fallbackResult.text) {
      console.log(`   Fallback response: "${fallbackResult.text}"\n`);
    }

    // 4. Reusable Configuration Pattern
    console.log("4. Reusable Configuration Pattern");

    // Define common configurations for your team
    const teamConfigs = {
      fast: {
        provider: "google-ai",
        model: "gemini-2.5-flash",
        maxTokens: 500,
      },
      smart: { provider: "openai", model: "gpt-4o", maxTokens: 2000 },
      economical: {
        provider: "google-ai",
        model: "gemini-2.5-flash",
        maxTokens: 200,
      },
    };

    // Use a predefined configuration
    const configuredResult = await neurolink.generate({
      input: { text: "Summarize: NeuroLink is a unified AI SDK." },
      ...teamConfigs.fast,
    });
    console.log(`   Fast config result: "${configuredResult.text}"\n`);

    console.log("Configuration Patterns Demo Complete!");
  } catch (error) {
    console.error("Demo failed:", error.message);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  configurationPatternsDemo().catch(console.error);
}

export { configurationPatternsDemo };
