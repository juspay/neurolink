#!/usr/bin/env node
/**
 * Testing Demo - Small Team Testing Strategies
 * Shows how to test NeuroLink features efficiently
 */

import dotenv from "dotenv";
dotenv.config();

import { NeuroLink } from "@juspay/neurolink";

async function testingDemo() {
  console.log("Testing Demo - Small Team Strategies");
  console.log("=====================================\n");

  const results = {
    passed: 0,
    failed: 0,
    tests: [],
  };

  function test(name, assertion) {
    try {
      if (assertion) {
        console.log(`   [PASS] ${name}`);
        results.passed++;
        results.tests.push({ name, status: "PASS" });
      } else {
        console.log(`   [FAIL] ${name}`);
        results.failed++;
        results.tests.push({ name, status: "FAIL" });
      }
    } catch (error) {
      console.log(`   [ERROR] ${name}: ${error.message}`);
      results.failed++;
      results.tests.push({ name, status: "ERROR", error: error.message });
    }
  }

  try {
    // 1. NeuroLink Initialization Tests
    console.log("1. NeuroLink Initialization Tests");

    const neurolink = new NeuroLink();
    test("NeuroLink instance created", neurolink !== null);
    console.log();

    // 2. Basic Generation Tests
    console.log("2. Basic Generation Tests");

    const result = await neurolink.generate({
      input: { text: "Test" },
      provider: "google-ai",
      model: "gemini-2.5-flash",
    });

    test("Basic text generation works", result && result.text);
    test("Response is string", typeof result.text === "string");
    test("Response is not empty", result.text.length > 0);
    console.log();

    // 3. Analytics Tests
    console.log("3. Analytics Tests");

    const analyticsResult = await neurolink.generate({
      input: { text: "Short test" },
      provider: "google-ai",
      model: "gemini-2.5-flash",
      enableAnalytics: true,
    });

    test("Analytics enabled", analyticsResult.analytics !== undefined);
    if (analyticsResult.analytics) {
      test("Has provider info", analyticsResult.analytics.provider);
      test("Has model info", analyticsResult.analytics.model);
      test("Has token count", analyticsResult.analytics.tokens?.total > 0);
      test("Has response time", analyticsResult.analytics.responseTime > 0);
    }
    console.log();

    // 4. Response Quality Tests
    console.log("4. Response Quality Tests");

    const qualityResult = await neurolink.generate({
      input: { text: "What is 2+2? Reply with just the number." },
      provider: "google-ai",
      model: "gemini-2.5-flash",
    });

    test("Quality response received", qualityResult.text !== null);
    test("Response contains expected answer", qualityResult.text.includes("4"));
    test("Response is concise", qualityResult.text.length < 100);
    console.log();

    // 5. Error Handling Tests
    console.log("5. Error Handling Tests");

    try {
      await neurolink.generate({
        input: { text: "Test" },
        provider: "invalid-provider",
      });
      test("Invalid provider handled gracefully", false);
    } catch (error) {
      test("Invalid provider throws expected error", true);
    }
    console.log();

    // 6. Performance Tests
    console.log("6. Performance Tests");

    const startTime = Date.now();
    const perfResult = await neurolink.generate({
      input: { text: "Quick response test" },
      provider: "google-ai",
      model: "gemini-2.5-flash",
    });
    const responseTime = Date.now() - startTime;

    test("Response received", perfResult.text !== null);
    test("Response under 10 seconds", responseTime < 10000);
    test("Response under 5 seconds (good)", responseTime < 5000);
    test("Response under 2 seconds (excellent)", responseTime < 2000);
    console.log();

    // Summary
    console.log("Test Summary");
    console.log(`   Total Tests: ${results.passed + results.failed}`);
    console.log(`   Passed: ${results.passed}`);
    console.log(`   Failed: ${results.failed}`);
    console.log(
      `   Success Rate: ${Math.round((results.passed / (results.passed + results.failed)) * 100)}%`,
    );

    if (results.failed === 0) {
      console.log("\nAll tests passed! NeuroLink is working correctly.");
    } else {
      console.log("\nSome tests failed. Check configuration and API keys.");
    }

    console.log("\nSmall Team Testing Tips:");
    console.log("   - Run this script daily to catch issues early");
    console.log("   - Add custom tests for your specific use cases");
    console.log("   - Monitor performance trends over time");
    console.log("   - Test with multiple providers for reliability");
  } catch (error) {
    console.error("Testing demo failed:", error.message);
    console.log("\nTroubleshooting:");
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
