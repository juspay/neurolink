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

import { NeuroLink } from "@juspay/neurolink";

async function timeoutExamples() {
  console.log("NeuroLink Timeout Usage Examples\n");

  const neurolink = new NeuroLink();

  try {
    // 1. Basic timeout usage
    console.log("1. Basic timeout with generate:");

    const quickResult = await neurolink.generate({
      input: { text: "Say hello" },
      provider: "openai",
      model: "gpt-4o",
      timeout: 10000, // 10 seconds in milliseconds
      maxTokens: 50,
    });

    console.log("Quick response:", quickResult.text);
    console.log(`   Provider: ${quickResult.provider}`);
    console.log(`   Response time: ${quickResult.responseTime}ms\n`);

    // 2. Different timeout values
    console.log("2. Different timeout values:");

    // Short timeout for quick responses
    const msResult = await neurolink.generate({
      input: { text: "Count to 3" },
      provider: "openai",
      model: "gpt-4o",
      timeout: 5000, // 5 seconds
      maxTokens: 50,
    });
    console.log("Short timeout (5000ms):", msResult.text);

    // Longer timeout for more complex requests
    console.log("   Recommended timeouts:");
    console.log("   - Quick responses: 5000-10000ms");
    console.log("   - Standard requests: 30000ms");
    console.log("   - Complex analysis: 60000-120000ms");
    console.log();

    // 3. Provider-specific timeout recommendations
    console.log("3. Provider-specific timeout recommendations:");
    const providerTimeouts = {
      openai: 30000,
      anthropic: 30000,
      bedrock: 45000,
      vertex: 60000,
      "google-ai": 30000,
      ollama: 300000, // Local models may need more time
      mistral: 30000,
      huggingface: 30000,
    };

    for (const [providerName, defaultTimeout] of Object.entries(
      providerTimeouts,
    )) {
      console.log(`   ${providerName}: ${defaultTimeout}ms`);
    }
    console.log();

    // 4. Handling timeout errors
    console.log("4. Handling timeout errors:");
    try {
      await neurolink.generate({
        input: { text: "Write a 10000 word essay on the history of computing" },
        provider: "openai",
        model: "gpt-4o",
        timeout: 1000, // Very short timeout to trigger error
        maxTokens: 10000,
      });
    } catch (error) {
      if (error.name === "TimeoutError") {
        console.log("Caught TimeoutError!");
        console.log(`   Message: ${error.message}`);
        console.log(`   Timeout: ${error.timeout}`);
        console.log(`   Provider: ${error.provider}`);
      } else {
        console.log("Different error:", error.message);
      }
    }
    console.log();

    // 5. Environment variable configuration
    console.log("5. Environment variable configuration:");
    console.log("   Set provider-specific timeouts:");
    console.log("   export OPENAI_TIMEOUT=45000");
    console.log("   export BEDROCK_TIMEOUT=60000");
    console.log("   export VERTEX_TIMEOUT=90000");
    console.log("   export OLLAMA_TIMEOUT=600000");
    console.log();

    // 6. Streaming with timeouts
    console.log("6. Streaming with timeouts:");
    const streamResult = await neurolink.stream({
      input: { text: "Count from 1 to 5 slowly" },
      provider: "openai",
      model: "gpt-4o",
      timeout: 30000, // Timeout for the entire stream
    });

    console.log("Streaming with timeout:");
    for await (const chunk of streamResult.stream) {
      process.stdout.write(chunk.content);
    }
    console.log("\n");

    // 7. Complex prompt with extended timeout
    console.log("7. Complex prompt with extended timeout:");
    const complexResult = await neurolink.generate({
      input: {
        text: `Analyze the following data and provide insights:
        - Revenue: $1.2M (Q1), $1.5M (Q2), $1.8M (Q3), $2.1M (Q4)
        - Customer growth: 15% YoY
        - Market share: 12%

        Provide a detailed analysis with recommendations.`,
      },
      provider: "openai",
      model: "gpt-4o",
      timeout: 120000, // 2 minutes for complex analysis
      maxTokens: 1000,
      temperature: 0.3,
    });

    console.log("Complex analysis completed");
    console.log(`   Response length: ${complexResult.text.length} characters`);
    console.log(`   Time taken: ${complexResult.responseTime}ms`);
  } catch (error) {
    console.error("Error:", error.message);

    if (error.name === "TimeoutError") {
      console.log("\nTimeout Tips:");
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
