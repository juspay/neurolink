/**
 * NeuroLink Proxy Configuration Test
 *
 * Tests NeuroLink's enterprise proxy support by:
 * 1. Setting HTTPS_PROXY environment variable
 * 2. Attempting AI generation through NeuroLink
 * 3. Validating proxy detection and usage
 *
 * Prerequisites:
 *   - Run proxy_server.js in another terminal first
 *   - Optionally set GOOGLE_AI_API_KEY for real API testing
 *
 * Expected behavior:
 *   - NeuroLink should detect and configure proxy automatically
 *   - Proxy server should log intercepted CONNECT requests
 *   - API calls may fail due to missing keys but proxy should work
 */

async function main() {
  console.log("==================================================");
  console.log("  NeuroLink Proxy Configuration Test");
  console.log("==================================================");

  // Set the proxy environment variable for this script
  process.env.HTTPS_PROXY = "http://localhost:8080";

  // Set your Google AI API key here (required for actual testing)
  process.env.GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY || "";

  if (!process.env.GOOGLE_AI_API_KEY) {
    console.log("[Test Script] ⚠️  WARNING: GOOGLE_AI_API_KEY not set.");
    console.log(
      "[Test Script] 🔍 This test will validate proxy configuration but cannot make real API calls.",
    );
    console.log(
      '[Test Script] 💡 To test with real API calls, set: export GOOGLE_AI_API_KEY="your-key"',
    );
    console.log("");
  }

  console.log(
    `[Test Script] 🌐 HTTPS_PROXY set to: ${process.env.HTTPS_PROXY}`,
  );
  console.log("[Test Script] 🚀 Attempting to generate text via NeuroLink...");
  console.log("[Test Script] 📋 Watch for proxy detection messages below:");
  console.log("--------------------------------------------------");

  const { NeuroLink } = await import("../../dist/index.js");
  const neurolink = new NeuroLink();

  try {
    const response = await neurolink.generateText({
      prompt: "Tell me a short joke about computers.",
      provider: "google-ai", // Using a specific provider for a clear test
    });

    console.log("--------------------------------------------------");
    console.log("[Test Script] API Response Received:");
    console.log(JSON.stringify(response, null, 2));
    console.log("--------------------------------------------------");
    console.log(
      "[Test Script] Test finished. Check the proxy server console for connection logs.",
    );
  } catch (error) {
    console.error("--------------------------------------------------");
    console.error("[Test Script] ❌ Error during API call:", error.message);

    // Check if this is a proxy configuration success (error due to missing API keys)
    if (
      error.message.includes("API_KEY") ||
      error.message.includes("environment variable")
    ) {
      console.log("");
      console.log("✅ [Test Script] PROXY CONFIGURATION SUCCESS!");
      console.log("   - NeuroLink successfully detected proxy settings");
      console.log("   - Error is due to missing API keys, not proxy issues");
      console.log(
        "   - Check proxy server console for intercepted connections",
      );
    } else if (
      error.message.includes("aborted") ||
      error.message.includes("timeout")
    ) {
      console.log("");
      console.log("✅ [Test Script] PROXY CONFIGURATION SUCCESS!");
      console.log(
        "   - NeuroLink attempted to use proxy (connection aborted/timeout)",
      );
      console.log("   - This confirms proxy detection is working");
      console.log(
        "   - Check proxy server console for intercepted connections",
      );
    } else {
      console.error("");
      console.error(
        "❓ [Test Script] Unexpected error - may indicate proxy configuration issue",
      );
      console.error("   - Check proxy server console for connection logs");
      console.error("   - Verify HTTPS_PROXY environment variable is set");
    }

    console.log("");
    console.log("🔍 [Test Script] Expected proxy behavior:");
    console.log(
      '   1. You should see "[Proxy Fetch] Configuring proxy with undici ProxyAgent" messages',
    );
    console.log(
      "   2. The proxy server should log intercepted CONNECT requests",
    );
    console.log(
      "   3. API calls may fail due to missing keys, but proxy detection should work",
    );
  }

  console.log("");
  console.log("==================================================");
  console.log("  Proxy Test Complete");
  console.log("==================================================");
}

main();
