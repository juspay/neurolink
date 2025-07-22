/**
 * Google AI Provider Validation Test
 *
 * This test validates that the Google AI provider passes ALL features
 * using the universal provider test suite.
 *
 * This test MUST pass 100% before any refactoring can begin.
 */

import { UniversalProviderTest } from "./universal-provider-test.js";

describe("Google AI Provider Validation", () => {
  const hasApiKey = !!(
    process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
  );

  beforeAll(() => {
    if (!hasApiKey) {
      console.warn("⚠️  Skipping Google AI validation - no API key found");
      console.warn(
        "   Set GOOGLE_AI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY to run validation",
      );
    }
  });

  it("should pass ALL universal provider tests", async () => {
    if (!hasApiKey) {
      console.log("⏭️  Skipping - no API key available");
      return;
    }

    console.log("\n🚀 Running complete validation for Google AI provider...");

    const results = await UniversalProviderTest.runCompleteTest("google-ai");

    // Strict assertions - ALL tests must pass
    expect(results.overall.success).toBe(true);
    expect(results.overall.failed).toBe(0);
    expect(results.overall.passed).toBeGreaterThan(0);

    // Verify specific critical tests
    const criticalTests = [
      "SDK Basic Generation",
      "SDK Streaming",
      "SDK Parameter Handling",
      "CLI Basic Generation",
    ];

    criticalTests.forEach((testName) => {
      const test = results.tests.find((t) => t.name === testName);
      expect(test?.success).toBe(true);
    });

    console.log("\n✅ Google AI provider validation COMPLETE!");
    console.log("   Provider is ready for production use.");
  }, 60000); // 60 second timeout for comprehensive testing
});
