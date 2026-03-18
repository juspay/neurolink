#!/usr/bin/env node

/**
 * NeuroLink Basic Streaming Example
 *
 * This example demonstrates:
 * - Creating a NeuroLink instance
 * - Streaming a response with `stream({ input: { text: "..." } })`
 * - Iterating over `result.stream` to print text chunks as they arrive
 * - Printing final usage statistics after the stream completes
 *
 * Usage:
 *   npx tsx examples/streaming-basic.ts
 *
 * Prerequisites:
 *   - At least one provider API key set (e.g., GOOGLE_AI_API_KEY, OPENAI_API_KEY)
 */

import { NeuroLink } from "@juspay/neurolink";

async function streamingBasicExample() {
  console.log("NeuroLink Basic Streaming Example\n");

  const neurolink = new NeuroLink();

  try {
    // --- Example 1: Simple streaming ---
    console.log("--- Example 1: Simple streaming response ---\n");

    const result = await neurolink.stream({
      input: { text: "Explain how neural networks learn, step by step." },
      maxTokens: 500,
    });

    // Iterate over the async stream and print each text chunk as it arrives
    let totalChars = 0;
    for await (const chunk of result.stream) {
      if ("content" in chunk) {
        process.stdout.write(chunk.content);
        totalChars += chunk.content.length;
      }
    }

    console.log("\n");
    console.log(`Provider: ${result.provider || "default"}`);
    console.log(`Model: ${result.model || "default"}`);
    console.log(`Total characters streamed: ${totalChars}`);

    // Usage stats are available after the stream completes
    if (result.usage) {
      console.log(`Prompt tokens: ${result.usage.promptTokens ?? "unknown"}`);
      console.log(
        `Completion tokens: ${result.usage.completionTokens ?? "unknown"}`,
      );
      console.log(`Total tokens: ${result.usage.totalTokens ?? "unknown"}`);
    }

    // --- Example 2: Streaming with a specific provider and system prompt ---
    console.log(
      "\n--- Example 2: Streaming with provider and system prompt ---\n",
    );

    const result2 = await neurolink.stream({
      input: { text: "What are the three laws of thermodynamics?" },
      systemPrompt:
        "You are a concise physics tutor. Keep answers under 200 words.",
      temperature: 0.3,
      maxTokens: 300,
    });

    for await (const chunk of result2.stream) {
      if ("content" in chunk) {
        process.stdout.write(chunk.content);
      }
    }

    console.log("\n");
    if (result2.usage) {
      console.log(
        `Total tokens used: ${result2.usage.totalTokens ?? "unknown"}`,
      );
    }

    // --- Example 3: Handling stream metadata ---
    console.log("--- Example 3: Stream metadata ---\n");

    const result3 = await neurolink.stream({
      input: { text: "Write a haiku about streaming data." },
    });

    for await (const chunk of result3.stream) {
      if ("content" in chunk) {
        process.stdout.write(chunk.content);
      }
    }

    console.log("\n");
    if (result3.metadata) {
      console.log(`Stream ID: ${result3.metadata.streamId ?? "N/A"}`);
      console.log(
        `Response time: ${result3.metadata.responseTime ?? "N/A"} ms`,
      );
    }
  } catch (error) {
    const err = error as Error;
    console.error("Error:", err.message);

    if (err.message.includes("API key")) {
      console.log("\nSetup help:");
      console.log('export GOOGLE_AI_API_KEY="AIza-your-key"');
      console.log("Or:");
      console.log('export OPENAI_API_KEY="sk-your-key"');
    }
  }

  await neurolink.shutdown();
  console.log("\nDone!");
}

// Run the example
import { fileURLToPath } from "url";
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  streamingBasicExample().catch(console.error);
}

export { streamingBasicExample };
