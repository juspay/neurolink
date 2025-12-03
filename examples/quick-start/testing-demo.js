#!/usr/bin/env node
/**
 * Testing Demo - Small Team Testing Strategies
 * Shows how to test NeuroLink features efficiently
 */

import dotenv from "dotenv";
dotenv.config();

import { AIProviderFactory } from "@juspay/neurolink";
import { evaluateResponse } from "../../dist/lib/core/evaluation.js";

async function testingDemo() {
  console.log("🧪 Testing Demo - Small Team Strategies");
  console.log("=====================================\n");

  const results = {
    passed: 0,
    failed: 0,
    tests: [],
  };

  function test(name, assertion) {
    try {
      if (assertion) {
        console.log(`   ✅ ${name}`);
        results.passed++;
        results.tests.push({ name, status: "PASS" });
      } else {
        console.log(`   ❌ ${name}`);
        results.failed++;
        results.tests.push({ name, status: "FAIL" });
      }
    } catch (error) {
      console.log(`   💥 ${name}: ${error.message}`);
      results.failed++;
      results.tests.push({ name, status: "ERROR", error: error.message });
    }
  }

  try {
    // 1. Provider Creation Tests
    console.log("1. 🏭 Provider Creation Tests");

    const provider = await AIProviderFactory.createProvider(
      "google-ai",
      "gemini-2.5-flash",
    );
    test("Provider creation succeeds", provider !== null);

    if (provider) {
      const result = await provider.generate({ input: { text: "Test" } });
      test("Basic text generation works", result && result.text);
      test("Response is string", typeof result.text === "string");
      test("Response is not empty", result.text.length > 0);
    }
    console.log();

    // 2. Analytics Tests
    console.log("2. 📊 Analytics Tests");

    if (provider) {
      const analyticsResult = await provider.generate({
        input: { text: "Short test" },
        enableAnalytics: true,
      });

      test("Analytics enabled", analyticsResult.analytics !== undefined);
      if (analyticsResult.analytics) {
        test("Has provider info", analyticsResult.analytics.provider);
        test("Has model info", analyticsResult.analytics.model);
        test("Has token count", analyticsResult.analytics.tokens?.total > 0);
        test("Has response time", analyticsResult.analytics.responseTime > 0);
      }
    }
    console.log();

    // 3. Evaluation Tests
    console.log("3. ⭐ Evaluation Tests");

    const evalResult = await performUnifiedEvaluation({
      userQuery: "What is 2+2?",
      aiResponse: "2+2 equals 4",
      mode: "simple",
    });

    test("Evaluation runs", evalResult !== null);
    test("Has relevance score", typeof evalResult.relevanceScore === "number");
    test("Has accuracy score", typeof evalResult.accuracyScore === "number");
    test(
      "Scores in valid range",
      evalResult.relevanceScore >= 0 && evalResult.relevanceScore <= 10,
    );
    console.log();

    // 4. Error Handling Tests
    console.log("4. 🛡️ Error Handling Tests");

    try {
      const invalidProvider =
        await AIProviderFactory.createProvider("invalid-provider");
      test("Invalid provider handled gracefully", invalidProvider === null);
    } catch (error) {
      test("Invalid provider throws expected error", true);
    }

    try {
      const invalidModel = await AIProviderFactory.createProvider(
        "google-ai",
        "invalid-model",
      );
      test("Invalid model handled gracefully", invalidModel === null);
    } catch (error) {
      test("Invalid model throws expected error", true);
    }
    console.log();

    // 5. Performance Tests
    console.log("5. ⚡ Performance Tests");

    if (provider) {
      const startTime = Date.now();
      const perfResult = await provider.generate({
        input: { text: "Quick response test" },
      });
      const responseTime = Date.now() - startTime;

      test("Response under 10 seconds", responseTime < 10000);
      test("Response under 5 seconds (good)", responseTime < 5000);
      test("Response under 2 seconds (excellent)", responseTime < 2000);
    }
    console.log();

    // Summary
    console.log("📋 Test Summary");
    console.log(`   Total Tests: ${results.passed + results.failed}`);
    console.log(`   Passed: ${results.passed}`);
    console.log(`   Failed: ${results.failed}`);
    console.log(
      `   Success Rate: ${Math.round((results.passed / (results.passed + results.failed)) * 100)}%`,
    );

    if (results.failed === 0) {
      console.log("\n🎉 All tests passed! NeuroLink is working correctly.");
    } else {
      console.log("\n⚠️  Some tests failed. Check configuration and API keys.");
    }

    console.log("\n💡 Small Team Testing Tips:");
    console.log("   - Run this script daily to catch issues early");
    console.log("   - Add custom tests for your specific use cases");
    console.log("   - Monitor performance trends over time");
    console.log("   - Test with multiple providers for reliability");
  } catch (error) {
    console.error("❌ Testing demo failed:", error.message);
    console.log("\n🔧 Troubleshooting:");
    console.log("   1. Check API keys in .env file");
    console.log("   2. Verify internet connection");
    console.log("   3. Try different provider/model");
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testingDemo().catch(console.error);
}

export { testingDemo };
