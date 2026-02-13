/**
 * NeuroLink Streaming Template
 *
 * This template demonstrates streaming responses from AI providers
 * for real-time output display.
 */

import { NeuroLink } from "@juspay/neurolink";
import type { StreamOptions } from "@juspay/neurolink";

const neurolink = new NeuroLink();

async function basicStreaming(): Promise<void> {
  console.log("Generating story...\n");

  const result = await neurolink.stream({
    input: { text: "Write a short story about a robot learning to paint" },
    temperature: 0.8,
  });

  // Stream text chunks to stdout
  for await (const chunk of result.stream) {
    if ("content" in chunk) {
      process.stdout.write(chunk.content);
    }
  }

  console.log("\n\n--- Complete ---");
  console.log("Total tokens:", result.usage?.total);
}

async function streamingWithOptions(): Promise<void> {
  const options: StreamOptions = {
    input: { text: "Explain the theory of relativity step by step" },
    provider: "anthropic",
    model: "claude-3-5-sonnet-20241022",
    temperature: 0.5,
    maxTokens: 1000,
    systemPrompt: "You are a physics teacher explaining concepts to students.",
  };

  const result = await neurolink.stream(options);

  let charCount = 0;
  for await (const chunk of result.stream) {
    if ("content" in chunk) {
      process.stdout.write(chunk.content);
      charCount += chunk.content.length;
    }
  }

  console.log(`\n\nStreamed ${charCount} characters`);
  console.log("Input tokens:", result.usage?.input);
  console.log("Output tokens:", result.usage?.output);
}

async function streamingWithProgress(): Promise<void> {
  const result = await neurolink.stream({
    input: { text: "List 10 interesting facts about space" },
  });

  let chunkCount = 0;
  const startTime = Date.now();

  for await (const chunk of result.stream) {
    if ("content" in chunk) {
      process.stdout.write(chunk.content);
      chunkCount++;

      // Show progress every 10 chunks
      if (chunkCount % 10 === 0) {
        const elapsed = Date.now() - startTime;
        const chunksPerSecond = (chunkCount / elapsed) * 1000;
        process.stderr.write(
          `\r[${chunkCount} chunks, ${chunksPerSecond.toFixed(1)} chunks/s]`,
        );
      }
    }
  }

  const totalTime = Date.now() - startTime;
  console.log(`\n\nCompleted in ${totalTime}ms`);
}

async function streamingWithTimeout(): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    console.log("\nTimeout reached, aborting...");
    controller.abort();
  }, 10000); // 10 second timeout

  try {
    const result = await neurolink.stream({
      input: { text: "Write a very long essay about artificial intelligence" },
      abortSignal: controller.signal,
    });

    for await (const chunk of result.stream) {
      if ("content" in chunk) {
        process.stdout.write(chunk.content);
      }
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.log("\nStream was aborted");
    } else {
      throw error;
    }
  } finally {
    clearTimeout(timeout);
  }
}

async function streamingCollectFull(): Promise<void> {
  const result = await neurolink.stream({
    input: { text: "Write a haiku about programming" },
  });

  // Collect text chunks manually
  const chunks: string[] = [];
  for await (const chunk of result.stream) {
    if ("content" in chunk) {
      chunks.push(chunk.content);
      process.stdout.write(chunk.content);
    }
  }
  const fullContent = chunks.join("");

  console.log("\n\nFull content from chunks:", fullContent);
}

async function streamingMultipleProviders(): Promise<void> {
  const providers = ["openai", "anthropic", "vertex"];
  const prompt = "What is machine learning in one sentence?";

  for (const provider of providers) {
    console.log(`\n--- ${provider} ---`);

    try {
      const result = await neurolink.stream({
        input: { text: prompt },
        provider,
      });

      for await (const chunk of result.stream) {
        if ("content" in chunk) {
          process.stdout.write(chunk.content);
        }
      }
      console.log();
    } catch (error) {
      console.log(`Provider ${provider} not available`);
    }
  }
}

async function main(): Promise<void> {
  console.log("=== Basic Streaming ===\n");
  await basicStreaming();

  console.log("\n\n=== Streaming with Options ===\n");
  await streamingWithOptions();

  console.log("\n\n=== Streaming with Progress ===\n");
  await streamingWithProgress();

  console.log("\n\n=== Streaming with Timeout ===\n");
  await streamingWithTimeout();

  console.log("\n\n=== Collect Full Response ===\n");
  await streamingCollectFull();

  console.log("\n\n=== Multiple Providers ===\n");
  await streamingMultipleProviders();
}

main().catch(console.error);
