import { describe, it, expect, beforeEach } from "vitest";
import { NeuroLink } from "../../src/lib/neurolink";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

/**
 * STREAMING PERFORMANCE BENCHMARKING TESTS
 * Measures token generation rates and streaming performance across providers
 */
import { PROVIDERS_TO_BENCHMARK } from "../config/providers";

describe("Streaming Performance Benchmarking", () => {
  let sdk: NeuroLink;
  const timeout = 60000;

  // Providers to benchmark (filter by available credentials)

  beforeEach(() => {
    sdk = new NeuroLink();
    console.log(
      "\n📊 Benchmarking providers:",
      PROVIDERS_TO_BENCHMARK.join(", "),
    );
  });

  describe("Time to First Token (TTFT)", () => {
    it(
      "should measure TTFT across providers",
      async () => {
        const results: Record<string, number> = {};

        for (const provider of PROVIDERS_TO_BENCHMARK) {
          console.log(`\n⏱️ Measuring TTFT for ${provider}...`);

          try {
            const startTime = Date.now();
            let firstTokenTime = 0;

            const result = await sdk.stream({
              input: { text: "Write a 100-word story about space" },
              provider: provider as any,
              disableTools: true,
              maxTokens: 200,
            });

            for await (const chunk of result.stream) {
              if (chunk.content && !firstTokenTime) {
                firstTokenTime = Date.now();
                break; // We only need the first token
              }
            }

            const ttft = firstTokenTime - startTime;
            results[provider] = ttft;
            console.log(`✓ ${provider} TTFT: ${ttft}ms`);

            // TTFT should be under 5 seconds
            expect(ttft).toBeLessThan(5000);
          } catch (error) {
            console.log(`✗ ${provider} failed:`, error.message);
            results[provider] = -1;
          }
        }

        // Display results summary
        console.log("\n📊 TTFT Summary:");
        Object.entries(results)
          .filter(([_, time]) => time > 0)
          .sort(([_a, a], [_b, b]) => a - b)
          .forEach(([provider, time]) => {
            console.log(`  ${provider}: ${time}ms`);
          });
      },
      timeout,
    );
  });

  describe("Token Generation Rate", () => {
    it(
      "should measure tokens per second across providers",
      async () => {
        const results: Record<
          string,
          { tokensPerSecond: number; totalTokens: number; duration: number }
        > = {};

        for (const provider of PROVIDERS_TO_BENCHMARK) {
          console.log(`\n⚡ Measuring token rate for ${provider}...`);

          try {
            const startTime = Date.now();
            let tokenCount = 0;
            let fullContent = "";

            const result = await sdk.stream({
              input: {
                text: "Write a detailed 200-word explanation of artificial intelligence",
              },
              provider: provider as any,
              disableTools: true,
              maxTokens: 400,
            });

            for await (const chunk of result.stream) {
              if (chunk.content) {
                tokenCount++;
                fullContent += chunk.content;
              }
            }

            const duration = Date.now() - startTime;
            const tokensPerSecond = (tokenCount / duration) * 1000;

            results[provider] = {
              tokensPerSecond: Math.round(tokensPerSecond * 10) / 10,
              totalTokens: tokenCount,
              duration,
            };

            console.log(
              `✓ ${provider}: ${results[provider].tokensPerSecond} tokens/sec (${tokenCount} tokens in ${duration}ms)`,
            );

            // Should generate at least some tokens
            expect(tokenCount).toBeGreaterThan(0);
          } catch (error) {
            console.log(`✗ ${provider} failed:`, error.message);
          }
        }

        // Display results summary
        console.log("\n📊 Token Rate Summary:");
        Object.entries(results)
          .sort(([_a, a], [_b, b]) => b.tokensPerSecond - a.tokensPerSecond)
          .forEach(([provider, stats]) => {
            console.log(`  ${provider}: ${stats.tokensPerSecond} tokens/sec`);
          });
      },
      timeout * 2,
    );
  });

  describe("Streaming vs Non-Streaming Performance", () => {
    it(
      "should compare streaming vs generate performance",
      async () => {
        const provider = PROVIDERS_TO_BENCHMARK[0]; // Test with first available provider
        if (!provider) {
          console.log("⚠️ No providers configured, skipping comparison");
          return;
        }

        console.log(`\n🔄 Comparing streaming vs generate for ${provider}...`);

        const prompt = "Write a 150-word analysis of renewable energy";

        // Test streaming
        const streamStartTime = Date.now();
        let streamFirstToken = 0;
        let streamContent = "";

        const streamResult = await sdk.stream({
          input: { text: prompt },
          provider: provider as any,
          disableTools: true,
          maxTokens: 300,
        });

        for await (const chunk of streamResult.stream) {
          if (chunk.content) {
            if (!streamFirstToken) {
              streamFirstToken = Date.now() - streamStartTime;
            }
            streamContent += chunk.content;
          }
        }

        const streamTotalTime = Date.now() - streamStartTime;

        // Test generate
        const generateStartTime = Date.now();
        const generateResult = await sdk.generate({
          input: { text: prompt },
          provider: provider as any,
          disableTools: true,
          maxTokens: 300,
        });
        const generateTotalTime = Date.now() - generateStartTime;

        console.log("\n📊 Performance Comparison:");
        console.log(`  Streaming:`);
        console.log(`    - Time to first token: ${streamFirstToken}ms`);
        console.log(`    - Total time: ${streamTotalTime}ms`);
        console.log(`    - Content length: ${streamContent.length} chars`);
        console.log(`  Generate:`);
        console.log(`    - Total time: ${generateTotalTime}ms`);
        console.log(
          `    - Content length: ${generateResult.content.length} chars`,
        );
        console.log(
          `  Streaming advantage: First token ${Math.round(((generateTotalTime - streamFirstToken) / generateTotalTime) * 100)}% faster`,
        );

        // Streaming should provide first token faster than generate completes
        expect(streamFirstToken).toBeLessThan(generateTotalTime);
      },
      timeout,
    );
  });

  describe("Large Content Streaming Performance", () => {
    it(
      "should handle large content generation efficiently",
      async () => {
        const provider = PROVIDERS_TO_BENCHMARK[0];
        if (!provider) {
          console.log(
            "⚠️ No providers configured, skipping large content test",
          );
          return;
        }

        console.log(`\n📚 Testing large content streaming for ${provider}...`);

        const startTime = Date.now();
        let chunkCount = 0;
        let totalContent = "";
        let firstChunkTime = 0;
        let lastChunkTime = 0;

        const result = await sdk.stream({
          input: {
            text: "Write a comprehensive 500-word essay about the history and future of space exploration",
          },
          provider: provider as any,
          disableTools: true,
          maxTokens: 1000,
        });

        for await (const chunk of result.stream) {
          if (chunk.content) {
            chunkCount++;
            totalContent += chunk.content;

            if (!firstChunkTime) {
              firstChunkTime = Date.now() - startTime;
            }
            lastChunkTime = Date.now() - startTime;
          }
        }

        const wordCount = totalContent
          .split(/\s+/)
          .filter((w) => w.length > 0).length;
        const avgChunkInterval =
          chunkCount > 1
            ? (lastChunkTime - firstChunkTime) / (chunkCount - 1)
            : 0;

        console.log("\n📊 Large Content Results:");
        console.log(`  Total chunks: ${chunkCount}`);
        console.log(`  Total words: ${wordCount}`);
        console.log(`  Total time: ${lastChunkTime}ms`);
        console.log(`  Time to first chunk: ${firstChunkTime}ms`);
        console.log(
          `  Average chunk interval: ${Math.round(avgChunkInterval)}ms`,
        );
        console.log(
          `  Words per second: ${Math.round(wordCount / (lastChunkTime / 1000))}`,
        );

        // Should stream many chunks for large content
        expect(chunkCount).toBeGreaterThan(10);
        expect(wordCount).toBeGreaterThan(200);
      },
      timeout * 2,
    );
  });

  describe("Concurrent Streaming Performance", () => {
    it(
      "should handle multiple concurrent streams",
      async () => {
        const provider = PROVIDERS_TO_BENCHMARK[0];
        if (!provider) {
          console.log("⚠️ No providers configured, skipping concurrent test");
          return;
        }

        console.log(`\n🔀 Testing concurrent streaming for ${provider}...`);

        const prompts = [
          "Write 50 words about technology",
          "Write 50 words about nature",
          "Write 50 words about history",
        ];

        const startTime = Date.now();

        // Start all streams concurrently
        const streamPromises = prompts.map(async (prompt, index) => {
          const streamStartTime = Date.now();
          let firstTokenTime = 0;
          let content = "";

          const result = await sdk.stream({
            input: { text: prompt },
            provider: provider as any,
            disableTools: true,
            maxTokens: 100,
          });

          for await (const chunk of result.stream) {
            if (chunk.content) {
              if (!firstTokenTime) {
                firstTokenTime = Date.now() - streamStartTime;
              }
              content += chunk.content;
            }
          }

          const totalTime = Date.now() - streamStartTime;

          return {
            index,
            prompt: prompt.substring(0, 30) + "...",
            firstTokenTime,
            totalTime,
            contentLength: content.length,
          };
        });

        const results = await Promise.all(streamPromises);
        const totalTime = Date.now() - startTime;

        console.log("\n📊 Concurrent Streaming Results:");
        results.forEach((r) => {
          console.log(
            `  Stream ${r.index + 1}: TTFT=${r.firstTokenTime}ms, Total=${r.totalTime}ms, Length=${r.contentLength}`,
          );
        });
        console.log(`  Total concurrent time: ${totalTime}ms`);
        console.log(
          `  Average per stream: ${Math.round(totalTime / prompts.length)}ms`,
        );

        // All streams should complete
        expect(results).toHaveLength(prompts.length);
        results.forEach((r) => {
          expect(r.contentLength).toBeGreaterThan(0);
        });
      },
      timeout * 2,
    );
  });
});
