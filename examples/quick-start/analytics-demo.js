#!/usr/bin/env node
/**
 * Analytics Demo - Small Team Performance Tracking
 * Shows usage tracking, cost estimation, performance metrics
 */

import dotenv from "dotenv";
dotenv.config();

import { AIProviderFactory } from "@juspay/neurolink";

async function analyticsDemo() {
  console.log("📊 Analytics Demo - Performance Tracking");
  console.log("=======================================\n");

  try {
    const provider = await AIProviderFactory.createProvider(
      "google-ai",
      "gemini-2.5-pro",
      {
        enableAnalytics: true,
      },
    );

    if (!provider) {
      console.log("❌ No provider available (check API keys)");
      return;
    }

    // 1. Basic Analytics Tracking
    console.log("1. 📈 Basic Analytics");
    const result = await provider.generate({
      input: { text: "Explain APIs in one sentence" },
      enableAnalytics: true,
      context: { team: "development", feature: "api-docs" },
    });

    if (result.analytics) {
      console.log(`   Provider: ${result.analytics.provider}`);
      console.log(`   Model: ${result.analytics.model}`);
      console.log(
        `   Tokens: ${result.analytics.tokens.input} → ${result.analytics.tokens.output}`,
      );
      console.log(`   Time: ${result.analytics.responseTime}ms`);
      if (result.analytics.cost) {
        console.log(`   Cost: $${result.analytics.cost.toFixed(6)}`);
      }
    }
    console.log();

    // 2. Performance Comparison
    console.log("2. ⚡ Performance Comparison");
    const models = ["gemini-2.5-pro", "gemini-2.5-flash"];
    const prompt = "What is Node.js?";

    for (const model of models) {
      const testProvider = await AIProviderFactory.createProvider(
        "google-ai",
        model,
        {
          enableAnalytics: true,
        },
      );

      if (testProvider) {
        const result = await testProvider.generate({
          input: { text: prompt },
          enableAnalytics: true,
        });

        console.log(`   ${model}:`);
        console.log(`     Time: ${result.analytics?.responseTime}ms`);
        console.log(`     Tokens: ${result.analytics?.tokens.total}`);
        console.log(
          `     Cost: $${result.analytics?.cost?.toFixed(6) || "N/A"}`,
        );
      }
    }
    console.log();

    // 3. Cost Tracking (Small Team Budget)
    console.log("3. 💰 Cost Tracking");
    let totalCost = 0;
    let totalRequests = 0;

    const testPrompts = [
      "Hello world",
      "What is TypeScript?",
      "Explain REST APIs",
    ];

    for (const testPrompt of testPrompts) {
      const result = await provider.generate({
        input: { text: testPrompt },
        enableAnalytics: true,
      });

      if (result.analytics?.cost) {
        totalCost += result.analytics.cost;
      }
      totalRequests++;
    }

    console.log(`   Total Requests: ${totalRequests}`);
    console.log(`   Total Cost: $${totalCost.toFixed(6)}`);
    console.log(`   Average Cost: $${(totalCost / totalRequests).toFixed(6)}`);
    console.log(
      `   Daily Estimate (100 requests): $${((totalCost / totalRequests) * 100).toFixed(2)}`,
    );
    console.log();

    console.log("✅ Analytics tracking working!");
    console.log("\n💡 Small Team Tips:");
    console.log("   - Use gemini-2.5-flash for development (faster/cheaper)");
    console.log("   - Track costs daily to stay within budget");
    console.log("   - Monitor response times for performance");
    console.log("   - Use context tracking for feature analysis");
  } catch (error) {
    console.error("❌ Analytics demo failed:", error.message);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  analyticsDemo().catch(console.error);
}

export { analyticsDemo };
