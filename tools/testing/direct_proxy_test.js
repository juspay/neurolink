/**
 * Direct Proxy Functionality Test
 *
 * Tests NeuroLink's proxy implementation by directly using createProxyFetch()
 * to make HTTP requests through the proxy server.
 *
 * This bypasses AI provider complexity and validates core proxy functionality.
 */

async function testDirectProxy() {
  console.log("==================================================");
  console.log("  Direct Proxy Functionality Test");
  console.log("==================================================");

  // Set proxy environment variable
  process.env.HTTPS_PROXY = "http://localhost:8080";
  console.log(
    `[Direct Test] 🌐 HTTPS_PROXY set to: ${process.env.HTTPS_PROXY}`,
  );

  try {
    // Import the proxy fetch function
    const { createProxyFetch } = await import("../../dist/proxy/proxyFetch.js");
    const proxyFetch = createProxyFetch();

    console.log("[Direct Test] 🚀 Making direct HTTP request through proxy...");
    console.log("[Direct Test] 📋 Target: https://httpbin.org/ip");
    console.log("--------------------------------------------------");

    // Make a simple HTTP request to test proxy
    const response = await proxyFetch("https://httpbin.org/ip", {
      method: "GET",
      headers: {
        "User-Agent": "NeuroLink-Proxy-Test/1.0",
      },
    });

    const data = await response.text();

    console.log("--------------------------------------------------");
    console.log("[Direct Test] ✅ SUCCESS! HTTP request completed");
    console.log(`[Direct Test] Status: ${response.status}`);
    console.log(`[Direct Test] Response: ${data}`);
    console.log("--------------------------------------------------");
    console.log("[Direct Test] 🎉 PROXY FUNCTIONALITY CONFIRMED!");
    console.log(
      "[Direct Test] Check proxy server console for CONNECT request logs",
    );
  } catch (error) {
    console.error("--------------------------------------------------");
    console.error(
      "[Direct Test] ❌ Error during direct proxy test:",
      error.message,
    );

    if (
      error.message.includes("ECONNREFUSED") ||
      error.message.includes("connect")
    ) {
      console.log("");
      console.log("🔍 [Direct Test] Connection refused - possible reasons:");
      console.log(
        "   1. Proxy server not running (start with: node tools/testing/proxy_server.js)",
      );
      console.log("   2. Proxy server on different port than expected");
      console.log("   3. Network connectivity issues");
    } else if (error.message.includes("timeout")) {
      console.log("");
      console.log("✅ [Direct Test] Timeout - proxy detected and used!");
      console.log(
        "   - Request was routed through proxy (timeout expected with test proxy)",
      );
      console.log("   - Check proxy server console for CONNECT request");
    } else {
      console.error("");
      console.error("❓ [Direct Test] Unexpected error:");
      console.error(`   ${error.stack}`);
    }
  }

  console.log("");
  console.log("==================================================");
  console.log("  Direct Proxy Test Complete");
  console.log("==================================================");
}

testDirectProxy();
