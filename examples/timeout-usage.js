#!/usr/bin/env node

/**
 * NeuroLink Timeout Usage Example
 *
 * This example demonstrates:
 * - Using different timeout formats
 * - Handling timeout errors
 * - Provider-specific timeout behavior
 * - Environment variable configuration
 */

import { createBestAIProvider, AIProviderFactory } from "@juspay/neurolink";

async function timeoutExamples() {
  console.log("⏱️  NeuroLink Timeout Usage Examples\n");

  try {
    // 1. Basic timeout usage with auto-selected provider
    console.log("1. Basic timeout with auto-selected provider:");
    const provider = createBestAIProvider();

    const quickResult = await provider.generate({
      input: { text: "Say hello" },
      timeout: "10s", // 10 seconds
      maxTokens: 50,
    });

    console.log("✅ Quick response:", quickResult.text);
    console.log(`   Provider: ${quickResult.provider}`);
    console.log(`   Response time: ${quickResult.responseTime}ms\n`);

    // 2. Different timeout formats
    console.log("2. Different timeout formats:");

    // Milliseconds
    const msResult = await provider.generate({
      input: { text: "Count to 3" },
      timeout: 5000, // 5000ms = 5 seconds
      maxTokens: 50,
    });
    console.log("✅ Millisecond timeout (5000ms):", msResult.text);

    // Human-readable formats
    const humanFormats = ["30s", "1m", "2m30s"];
    console.log("   Supported formats:", humanFormats.join(", "));
    console.log();

    // 3. Provider-specific timeouts
    console.log("3. Provider-specific timeout defaults:");
    const providerTimeouts = {
      openai: "30s",
      bedrock: "45s",
      vertex: "60s",
      "google-ai": "30s",
      ollama: "5m",
      mistral: "30s",
      huggingface: "30s",
    };

    for (const [providerName, defaultTimeout] of Object.entries(
      providerTimeouts,
    )) {
      console.log(`   ${providerName}: ${defaultTimeout}`);
    }
    console.log();

    // 4. Handling timeout errors
    console.log("4. Handling timeout errors:");
    try {
      const shortTimeoutProvider = AIProviderFactory.createProvider("openai");
      await shortTimeoutProvider.generate({
        input: { text: "Write a 10000 word essay on the history of computing" },
        timeout: "1s", // Very short timeout to trigger error
        maxTokens: 10000,
      });
    } catch (error) {
      if (error.name === "TimeoutError") {
        console.log("⏱️  Caught TimeoutError!");
        console.log(`   Message: ${error.message}`);
        console.log(`   Timeout: ${error.timeout}`);
        console.log(`   Provider: ${error.provider}`);
      } else {
        console.log("❌ Different error:", error.message);
      }
    }
    console.log();

    // 5. Environment variable configuration
    console.log("5. Environment variable configuration:");
    console.log("   Set provider-specific timeouts:");
    console.log("   export OPENAI_TIMEOUT='45s'");
    console.log("   export BEDROCK_TIMEOUT='1m'");
    console.log("   export VERTEX_TIMEOUT='90s'");
    console.log("   export OLLAMA_TIMEOUT='10m'");
    console.log();

    // 6. Streaming with timeouts
    console.log("6. Streaming with timeouts:");
    const streamResult = await provider.stream({
      input: { text: "Count from 1 to 5 slowly" },
      timeout: "30s", // Timeout for the entire stream
    });

    console.log("✅ Streaming with timeout:");
    for await (const chunk of streamResult.stream) {
      process.stdout.write(chunk.content);
    }
    console.log("\n");

    // 7. Complex prompt with extended timeout
    console.log("7. Complex prompt with extended timeout:");
    const complexResult = await provider.generate({
      input: {
        text: `Analyze the following data and provide insights:
        - Revenue: $1.2M (Q1), $1.5M (Q2), $1.8M (Q3), $2.1M (Q4)
        - Customer growth: 15% YoY
        - Market share: 12%
        
        Provide a detailed analysis with recommendations.`,
      },
      timeout: "2m", // 2 minutes for complex analysis
      maxTokens: 1000,
      temperature: 0.3,
    });

    console.log("✅ Complex analysis completed");
    console.log(`   Response length: ${complexResult.text.length} characters`);
    console.log(`   Time taken: ${complexResult.responseTime}ms`);
  } catch (error) {
    console.error("❌ Error:", error.message);

    if (error.name === "TimeoutError") {
      console.log("\n💡 Timeout Tips:");
      console.log("- Increase timeout for complex prompts");
      console.log("- Use streaming for long responses");
      console.log("- Consider provider-specific limits");
      console.log("- Check network connectivity");
    }
  }
}

// Run the example
import { fileURLToPath } from "url";
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  timeoutExamples().catch(console.error);
}

export { timeoutExamples };
