#!/usr/bin/env node
/**
 * Batch Processing Demo - Efficient Operations for Small Teams
 * Shows how to process multiple requests efficiently
 */

import dotenv from "dotenv";
dotenv.config();

import { AIProviderFactory } from "@juspay/neurolink";

async function batchProcessingDemo() {
  console.log("📦 Batch Processing Demo");
  console.log("========================\n");

  try {
    const provider = await AIProviderFactory.createProvider(
      "google-ai",
      "gemini-2.5-flash",
      {
        enableAnalytics: true,
      },
    );

    if (!provider) {
      console.log("❌ No provider available");
      return;
    }

    // 1. Sequential Processing (Slow)
    console.log("1. 🐌 Sequential Processing");
    const prompts = [
      "What is React?",
      "What is Node.js?",
      "What is TypeScript?",
    ];

    const sequentialStart = Date.now();
    const sequentialResults = [];

    for (const prompt of prompts) {
      const result = await provider.generate({
        input: { text: prompt },
        enableAnalytics: true,
      });
      sequentialResults.push(result);
    }

    const sequentialTime = Date.now() - sequentialStart;
    console.log(`   ⏱️  Sequential time: ${sequentialTime}ms`);
    console.log();

    // 2. Parallel Processing (Fast)
    console.log("2. 🚀 Parallel Processing");

    const parallelStart = Date.now();
    const parallelResults = await Promise.all(
      prompts.map((prompt) =>
        provider.generate({ input: { text: prompt }, enableAnalytics: true }),
      ),
    );

    const parallelTime = Date.now() - parallelStart;
    console.log(`   ⚡ Parallel time: ${parallelTime}ms`);
    console.log(
      `   📈 Speedup: ${Math.round(sequentialTime / parallelTime)}x faster`,
    );
    console.log();

    // 3. Batch with Rate Limiting (Production Safe)
    console.log("3. 🛡️ Rate-Limited Batch Processing");

    async function processBatch(items, batchSize = 3, delayMs = 100) {
      const results = [];

      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map((item) =>
            provider.generate({
              input: { text: item },
              enableAnalytics: true,
            }),
          ),
        );
        results.push(...batchResults);

        // Rate limiting delay
        if (i + batchSize < items.length) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }

      return results;
    }

    const largeBatch = [
      "Explain APIs",
      "What is REST?",
      "Define microservices",
      "What is GraphQL?",
      "Explain Docker",
      "What is Kubernetes?",
    ];

    const rateLimitedStart = Date.now();
    const rateLimitedResults = await processBatch(largeBatch, 2, 50);
    const rateLimitedTime = Date.now() - rateLimitedStart;

    console.log(
      `   📊 Processed ${largeBatch.length} requests in ${rateLimitedTime}ms`,
    );
    console.log(
      `   ⚡ Average: ${Math.round(rateLimitedTime / largeBatch.length)}ms per request`,
    );
    console.log();

    // 4. Cost-Optimized Batch Processing
    console.log("4. 💰 Cost-Optimized Processing");

    let totalCost = 0;
    let totalTokens = 0;

    parallelResults.forEach((result, index) => {
      if (result.analytics) {
        totalCost += result.analytics.cost || 0;
        totalTokens += result.analytics.tokens.total;
        console.log(
          `   ${index + 1}. "${prompts[index]}" - $${(result.analytics.cost || 0).toFixed(6)}`,
        );
      }
    });

    console.log(`   💰 Total cost: $${totalCost.toFixed(6)}`);
    console.log(`   🎯 Total tokens: ${totalTokens}`);
    console.log(
      `   📈 Cost per request: $${(totalCost / prompts.length).toFixed(6)}`,
    );
    console.log();

    // 5. Error-Resilient Batch Processing
    console.log("5. 🛡️ Error-Resilient Processing");

    async function resilientBatch(prompts) {
      const results = await Promise.allSettled(
        prompts.map(async (prompt, index) => {
          try {
            const result = await provider.generate({ input: { text: prompt } });
            return { index, prompt, result: result.text, status: "success" };
          } catch (error) {
            return { index, prompt, error: error.message, status: "failed" };
          }
        }),
      );

      const successful = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;

      console.log(`   ✅ Successful: ${successful}`);
      console.log(`   ❌ Failed: ${failed}`);
      console.log(
        `   📊 Success rate: ${Math.round((successful / results.length) * 100)}%`,
      );

      return results;
    }

    await resilientBatch(prompts.slice(0, 3));
    console.log();

    console.log("🎉 Batch Processing Demo Complete!");
    console.log("\n💡 Small Team Best Practices:");
    console.log("   - Use parallel processing for speed");
    console.log("   - Implement rate limiting for production");
    console.log("   - Monitor costs with analytics");
    console.log("   - Use error-resilient patterns");
    console.log("   - Batch similar requests together");
  } catch (error) {
    console.error("❌ Batch demo failed:", error.message);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  batchProcessingDemo().catch(console.error);
}

export { batchProcessingDemo };
