#!/usr/bin/env node

/**
 * NeuroLink Provider Switching Example
 *
 * This example demonstrates:
 * - Generating content with different providers using the same API
 * - Switching between OpenAI, Anthropic, and Google AI Studio
 * - Comparing responses, usage, and latency across providers
 * - How NeuroLink's unified interface makes provider switching trivial
 *
 * NeuroLink supports 12+ providers through a single `generate()` call.
 * Switching providers is a one-line change: just update the `provider` field.
 *
 * Usage:
 *   npx tsx examples/provider-switching.ts
 *
 * Prerequisites:
 *   - API keys for the providers you want to test, e.g.:
 *     export OPENAI_API_KEY="sk-..."
 *     export ANTHROPIC_API_KEY="sk-ant-..."
 *     export GOOGLE_AI_API_KEY="AIza..."
 */

import { NeuroLink } from "@juspay/neurolink";

async function providerSwitchingExample() {
  console.log("NeuroLink Provider Switching Example\n");
  console.log("Same prompt, different providers — unified API.\n");

  const neurolink = new NeuroLink();

  const prompt = "In one paragraph, explain what makes a good API design.";

  // List of providers to try. Each entry includes the provider name
  // and an optional model override.
  const providers: Array<{ name: string; model?: string }> = [
    { name: "openai", model: "gpt-4o-mini" },
    { name: "anthropic", model: "claude-sonnet-4-20250514" },
    { name: "google-ai", model: "gemini-2.5-flash" },
  ];

  const results: Array<{
    provider: string;
    model?: string;
    content: string;
    tokens?: number;
    responseTime?: number;
    error?: string;
  }> = [];

  for (const { name, model } of providers) {
    console.log(`--- Provider: ${name}${model ? ` (${model})` : ""} ---\n`);

    try {
      const start = Date.now();

      const result = await neurolink.generate({
        input: { text: prompt },
        provider: name,
        ...(model ? { model } : {}),
        maxTokens: 300,
        temperature: 0.7,
      });

      const elapsed = Date.now() - start;

      console.log(result.content);
      console.log();
      console.log(`  Provider: ${result.provider ?? name}`);
      console.log(`  Model: ${result.model ?? model ?? "default"}`);
      console.log(`  Tokens: ${result.usage?.totalTokens ?? "unknown"}`);
      console.log(`  Response time: ${elapsed} ms`);
      console.log();

      results.push({
        provider: name,
        model: result.model ?? model,
        content: result.content,
        tokens: result.usage?.totalTokens,
        responseTime: elapsed,
      });
    } catch (error) {
      const err = error as Error;
      console.log(`  Skipped: ${err.message}\n`);
      results.push({
        provider: name,
        model,
        content: "",
        error: err.message,
      });
    }
  }

  // --- Summary comparison ---
  console.log("=== Summary ===\n");
  console.log(
    "Provider         | Model                   | Tokens | Time (ms) | Status",
  );
  console.log(
    "---------------- | ----------------------- | ------ | --------- | ------",
  );
  for (const r of results) {
    const status = r.error ? "FAILED" : "OK";
    const modelStr = (r.model ?? "default").padEnd(23);
    const tokenStr = (r.tokens?.toString() ?? "-").padStart(6);
    const timeStr = (r.responseTime?.toString() ?? "-").padStart(9);
    console.log(
      `${r.provider.padEnd(16)} | ${modelStr} | ${tokenStr} | ${timeStr} | ${status}`,
    );
  }

  await neurolink.shutdown();
  console.log("\nDone!");
}

// Run the example
import { fileURLToPath } from "url";
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  providerSwitchingExample().catch(console.error);
}

export { providerSwitchingExample };
