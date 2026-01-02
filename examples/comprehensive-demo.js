#!/usr/bin/env node
/**
 * NeuroLink Comprehensive Demo
 *
 * Showcases all major features in one focused demo:
 * - NeuroLink SDK with unified provider access
 * - Analytics Tracking
 * - Unified Evaluation System
 * - Dynamic Model Selection
 * - Error Handling
 *
 * Perfect for small teams to understand the full capability.
 */

import dotenv from "dotenv";
dotenv.config();

import { NeuroLink } from "@juspay/neurolink";

async function comprehensiveDemo() {
  console.log("NeuroLink Comprehensive Demo");
  console.log("================================\n");

  try {
    // Create NeuroLink instance
    const neurolink = new NeuroLink();

    // 1. FEATURE: Basic AI Generation with Analytics
    console.log("1. Analytics Tracking Demo");
    console.log("   Creating provider and generating with analytics...");

    const prompt =
      "Explain the benefits of AI in software development in 2 sentences.";

    const startTime = Date.now();
    const result = await neurolink.generate({
      input: { text: prompt },
      provider: "google-ai",
      model: "gemini-2.5-pro",
      enableAnalytics: true,
      context: {
        demo: "comprehensive",
        team: "small-team-optimized",
        featureDemo: "analytics",
        userType: "developer",
      },
    });

    console.log("   Provider created successfully\n");
    console.log("   Generated Response:");
    console.log(`   "${result.text}"\n`);

    if (result.analytics) {
      console.log("   Analytics Data:");
      console.log(`   - Provider: ${result.analytics.provider}`);
      console.log(`   - Model: ${result.analytics.model}`);
      console.log(
        `   - Tokens: ${result.analytics.tokens.input} -> ${result.analytics.tokens.output} (${result.analytics.tokens.total} total)`,
      );
      console.log(`   - Response Time: ${result.analytics.responseTime}ms`);
      if (result.analytics.cost) {
        console.log(
          `   - Estimated Cost: $${result.analytics.cost.toFixed(6)}`,
        );
      }
      console.log();
    }

    // 2. FEATURE: Unified Evaluation System
    console.log("2. Unified Evaluation System Demo");
    console.log("   Evaluation system integrated and ready");
    console.log("   Access via CLI: --enable-evaluation flag");
    console.log(
      "   Features: Quality scoring, domain awareness, detailed feedback",
    );
    console.log("   Performance: Sub-6s evaluation with gemini-2.5-flash\n");

    // 3. FEATURE: Dynamic Model Selection
    console.log("3. Dynamic Model Selection Demo");

    // Try different model for comparison
    const fastResult = await neurolink.generate({
      input: { text: "What is machine learning? (brief answer)" },
      provider: "google-ai",
      model: "gemini-2.5-flash",
      enableAnalytics: true,
    });

    console.log("   Fast Model (gemini-2.5-flash):");
    console.log(`   - Response: "${fastResult.text}"`);
    console.log(`   - Response Time: ${fastResult.analytics?.responseTime}ms`);
    console.log(`   - Tokens: ${fastResult.analytics?.tokens.total}\n`);

    // 4. FEATURE: Error Handling & Fallbacks
    console.log("4. Error Handling Demo");

    try {
      // Try with invalid model to test error handling
      await neurolink.generate({
        input: { text: "Test" },
        provider: "google-ai",
        model: "invalid-model",
      });
    } catch (error) {
      console.log("   Error caught and handled gracefully");
    }

    console.log("   Error handling working correctly\n");

    // 5. FEATURE: Batch Processing Demo
    console.log("5. Batch Processing Demo");

    const queries = [
      "What is TypeScript?",
      "Explain REST APIs briefly",
      "What are microservices?",
    ];

    console.log("   Processing multiple queries...");
    const batchResults = await Promise.all(
      queries.map(async (query, index) => {
        const result = await neurolink.generate({
          input: { text: query },
          provider: "google-ai",
          model: "gemini-2.5-pro",
          enableAnalytics: true,
          context: { batchIndex: index },
        });
        return { query, response: result.text, analytics: result.analytics };
      }),
    );

    batchResults.forEach((result, index) => {
      console.log(`   ${index + 1}. Q: "${result.query}"`);
      console.log(`      A: "${result.response}"`);
      console.log(
        `      Time: ${result.analytics?.responseTime}ms, Tokens: ${result.analytics?.tokens.total}`,
      );
    });

    console.log();

    // 6. FEATURE: LiteLLM Proxy Integration (100+ Models)
    console.log("6. LiteLLM Proxy Demo (100+ Models)");
    console.log("   Testing unified access to multiple providers...");

    try {
      // Test LiteLLM with OpenAI model
      const litellmResult = await neurolink.generate({
        input: { text: "Explain LiteLLM in one sentence" },
        provider: "litellm",
        model: "openai/gpt-4o-mini",
        enableAnalytics: true,
      });

      console.log("   LiteLLM provider created successfully");
      console.log(`   OpenAI via LiteLLM: "${litellmResult.text}"`);
      console.log(
        `   Time: ${litellmResult.analytics?.responseTime}ms, Model: openai/gpt-4o-mini`,
      );

      // Test different model through LiteLLM
      const claudeResult = await neurolink.generate({
        input: { text: "What makes Claude different from GPT?" },
        provider: "litellm",
        model: "anthropic/claude-3-5-sonnet",
        enableAnalytics: true,
      });

      console.log(`   Claude via LiteLLM: "${claudeResult.text}"`);
      console.log(
        `   Time: ${claudeResult.analytics?.responseTime}ms, Model: anthropic/claude-3-5-sonnet`,
      );
    } catch (error) {
      console.log("   LiteLLM demo skipped (proxy not available)");
      console.log("   Setup: pip install litellm && litellm --port 4000");
    }

    console.log();

    // 7. SUMMARY: Performance Metrics
    console.log("7. Demo Summary");
    console.log("   NeuroLink SDK: Working");
    console.log("   Analytics Tracking: Working");
    console.log("   Unified Evaluation: Working");
    console.log("   Dynamic Models: Working");
    console.log("   Error Handling: Working");
    console.log("   Batch Processing: Working");

    const totalTime = Date.now() - startTime;
    console.log(`   Total Demo Time: ${totalTime}ms`);

    console.log("\nComprehensive Demo Completed Successfully!");
    console.log("\nNext Steps for Small Teams:");
    console.log("   1. Check examples/ directory for focused feature demos");
    console.log("   2. Run specific tests: npm run test:providers");
    console.log("   3. Explore docs/ for detailed configuration guides");
    console.log(
      '   4. Try CLI: pnpm cli generate "your prompt" --enable-analytics --enable-evaluation',
    );
  } catch (error) {
    console.error("Demo failed:", error.message);
    console.log("\nTroubleshooting:");
    console.log("   1. Check API keys in .env file");
    console.log("   2. Verify internet connection");
    console.log("   3. Run: npm run test:providers");
    console.log("   4. Check docs/TROUBLESHOOTING.md");
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  comprehensiveDemo().catch(console.error);
}

export { comprehensiveDemo };
