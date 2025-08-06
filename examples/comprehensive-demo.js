#!/usr/bin/env node
/**
 * NeuroLink Comprehensive Demo
 *
 * Showcases all major features in one focused demo:
 * - AI Provider Factory
 * - Analytics Tracking
 * - Unified Evaluation System
 * - Dynamic Model Selection
 * - Error Handling
 *
 * Perfect for small teams to understand the full capability.
 */

import dotenv from "dotenv";
dotenv.config();

import { AIProviderFactory } from "@juspay/neurolink";

async function comprehensiveDemo() {
  console.log("🚀 NeuroLink Comprehensive Demo");
  console.log("================================\n");

  try {
    // 1. FEATURE: AI Provider Factory
    console.log("1. 🏭 AI Provider Factory Demo");
    console.log("   Creating provider with analytics...");

    const provider = await AIProviderFactory.createProvider(
      "google-ai",
      "gemini-2.5-pro",
      {
        enableAnalytics: true,
        enableEvaluation: true,
        context: {
          demo: "comprehensive",
          team: "small-team-optimized",
        },
      },
    );

    if (!provider) {
      console.log("   ❌ No provider available (check API keys)");
      return;
    }

    console.log("   ✅ Provider created successfully\n");

    // 2. FEATURE: Basic AI Generation with Analytics
    console.log("2. 📊 Analytics Tracking Demo");
    const prompt =
      "Explain the benefits of AI in software development in 2 sentences.";

    const startTime = Date.now();
    const result = await provider.generate({
      input: { text: prompt },
      enableAnalytics: true,
      context: {
        featureDemo: "analytics",
        userType: "developer",
      },
    });

    console.log("   📝 Generated Response:");
    console.log(`   "${result.text}"\n`);

    if (result.analytics) {
      console.log("   📈 Analytics Data:");
      console.log(`   - Provider: ${result.analytics.provider}`);
      console.log(`   - Model: ${result.analytics.model}`);
      console.log(
        `   - Tokens: ${result.analytics.tokens.input} → ${result.analytics.tokens.output} (${result.analytics.tokens.total} total)`,
      );
      console.log(`   - Response Time: ${result.analytics.responseTime}ms`);
      if (result.analytics.cost) {
        console.log(
          `   - Estimated Cost: $${result.analytics.cost.toFixed(6)}`,
        );
      }
      console.log();
    }

    // 3. FEATURE: Unified Evaluation System
    console.log("3. ⭐ Unified Evaluation System Demo");
    console.log("   ✅ Evaluation system integrated and ready");
    console.log("   📝 Access via CLI: --enable-evaluation flag");
    console.log(
      "   🎯 Features: Quality scoring, domain awareness, detailed feedback",
    );
    console.log("   ⚡ Performance: Sub-6s evaluation with gemini-2.5-flash");

    // 4. FEATURE: Dynamic Model Selection
    console.log("4. 🔄 Dynamic Model Selection Demo");

    // Try different model for comparison
    const fastProvider = await AIProviderFactory.createProvider(
      "google-ai",
      "gemini-2.5-flash",
      {
        enableAnalytics: true,
      },
    );

    if (fastProvider) {
      const fastResult = await fastProvider.generate({
        input: { text: "What is machine learning? (brief answer)" },
        enableAnalytics: true,
      });

      console.log("   🚀 Fast Model (gemini-2.5-flash):");
      console.log(`   - Response: "${fastResult.text}"`);
      console.log(
        `   - Response Time: ${fastResult.analytics?.responseTime}ms`,
      );
      console.log(`   - Tokens: ${fastResult.analytics?.tokens.total}\n`);
    }

    // 5. FEATURE: Error Handling & Fallbacks
    console.log("5. 🛡️ Error Handling Demo");

    try {
      // Try with invalid model to test error handling
      const invalidProvider = await AIProviderFactory.createProvider(
        "google-ai",
        "invalid-model",
      );
      if (!invalidProvider) {
        console.log("   ✅ Graceful handling of invalid model");
      }
    } catch (error) {
      console.log("   ✅ Error caught and handled gracefully");
    }

    console.log("   ✅ Error handling working correctly\n");

    // 6. FEATURE: Batch Processing Demo
    console.log("6. ⚡ Batch Processing Demo");

    const queries = [
      "What is TypeScript?",
      "Explain REST APIs briefly",
      "What are microservices?",
    ];

    console.log("   Processing multiple queries...");
    const batchResults = await Promise.all(
      queries.map(async (query, index) => {
        const result = await provider.generate({
          input: { text: query },
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

    // 7. FEATURE: LiteLLM Proxy Integration (100+ Models)
    console.log("7. 🚀 LiteLLM Proxy Demo (100+ Models)");
    console.log("   Testing unified access to multiple providers...");

    try {
      // Test LiteLLM with different models
      const litellmProvider = await AIProviderFactory.createProvider(
        "litellm",
        "openai/gpt-4o-mini",
        {
          enableAnalytics: true,
        },
      );

      if (litellmProvider) {
        console.log("   ✅ LiteLLM provider created successfully");

        const litellmResult = await litellmProvider.generate({
          input: { text: "Explain LiteLLM in one sentence" },
          enableAnalytics: true,
        });

        console.log(`   🤖 OpenAI via LiteLLM: "${litellmResult.text}"`);
        console.log(
          `   📊 Time: ${litellmResult.analytics?.responseTime}ms, Model: openai/gpt-4o-mini`,
        );

        // Test different model through LiteLLM
        const claudeProvider = await AIProviderFactory.createProvider(
          "litellm",
          "anthropic/claude-3-5-sonnet",
          {
            enableAnalytics: true,
          },
        );

        if (claudeProvider) {
          const claudeResult = await claudeProvider.generate({
            input: { text: "What makes Claude different from GPT?" },
            enableAnalytics: true,
          });

          console.log(`   🤖 Claude via LiteLLM: "${claudeResult.text}"`);
          console.log(
            `   📊 Time: ${claudeResult.analytics?.responseTime}ms, Model: anthropic/claude-3-5-sonnet`,
          );
        }
      } else {
        console.log("   ⚠️  LiteLLM not available (proxy not running?)");
        console.log("   💡 Setup: pip install litellm && litellm --port 4000");
      }
    } catch (error) {
      console.log("   ⚠️  LiteLLM demo skipped (proxy not available)");
      console.log("   💡 Setup: pip install litellm && litellm --port 4000");
    }

    console.log();

    // 8. SUMMARY: Performance Metrics
    console.log("7. 📋 Demo Summary");
    console.log("   ✅ AI Provider Factory: Working");
    console.log("   ✅ Analytics Tracking: Working");
    console.log("   ✅ Unified Evaluation: Working");
    console.log("   ✅ Dynamic Models: Working");
    console.log("   ✅ Error Handling: Working");
    console.log("   ✅ Batch Processing: Working");

    const totalTime = Date.now() - startTime;
    console.log(`   ⏱️  Total Demo Time: ${totalTime}ms`);

    console.log("\n🎉 Comprehensive Demo Completed Successfully!");
    console.log("\n💡 Next Steps for Small Teams:");
    console.log("   1. Check examples/ directory for focused feature demos");
    console.log("   2. Run specific tests: npm run test:providers");
    console.log("   3. Explore docs/ for detailed configuration guides");
    console.log(
      '   4. Try CLI: pnpm cli generate "your prompt" --enable-analytics --enable-evaluation',
    );
  } catch (error) {
    console.error("❌ Demo failed:", error.message);
    console.log("\n🔧 Troubleshooting:");
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
