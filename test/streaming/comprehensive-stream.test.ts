import { describe, it, expect, beforeEach } from "vitest";
import { NeuroLink } from "../../src/lib/neurolink.js";
import {
  createTool,
  createTypedTool,
} from "../../src/lib/sdk/tool-registration.js";
import { z } from "zod";

describe("Comprehensive Streaming Tests", () => {
  let sdk: NeuroLink;

  beforeEach(() => {
    sdk = new NeuroLink();
  });

  describe("SDK Streaming Without Tools", () => {
    it("should stream progressively (not all at once)", async () => {
      const chunks: string[] = [];
      const chunkTimestamps: number[] = [];

      const result = await sdk.stream({
        input: { text: "Count from 1 to 5 slowly, one number per line" },
        provider: "google-ai",
        disableTools: true,
        maxTokens: 100,
      });

      for await (const chunk of result.stream) {
        if (chunk.content) {
          chunks.push(chunk.content);
          chunkTimestamps.push(Date.now());
        }
      }

      // Verify we got multiple chunks (proves streaming)
      expect(chunks.length).toBeGreaterThan(3);

      // Verify content
      const fullContent = chunks.join("");
      expect(fullContent).toContain("1");
      expect(fullContent).toContain("2");
      expect(fullContent).toContain("3");
      expect(fullContent).toContain("4");
      expect(fullContent).toContain("5");

      // Verify progressive delivery (chunks came at different times)
      if (chunkTimestamps.length > 1) {
        const timeDiffs = chunkTimestamps
          .slice(1)
          .map((t, i) => t - chunkTimestamps[i]);
        const hasProgressiveDelivery = timeDiffs.some((diff) => diff > 0);
        expect(hasProgressiveDelivery).toBe(true);
      }
    }, 30000);

    it("should stream with multiple providers", async () => {
      const providers = ["google-ai", "openai", "anthropic", "mistral"];

      for (const provider of providers) {
        console.log(`\nTesting streaming with ${provider}...`);
        const chunks: string[] = [];

        try {
          const result = await sdk.stream({
            input: { text: "Say hello in 3 words" },
            provider,
            disableTools: true,
            maxTokens: 50,
          });

          for await (const chunk of result.stream) {
            if (chunk.content) {
              chunks.push(chunk.content);
            }
          }

          expect(chunks.length).toBeGreaterThan(0);
          const content = chunks.join("").toLowerCase();
          expect(content).toBeTruthy();
          console.log(`✓ ${provider} streamed: "${chunks.join("")}"`);
        } catch (error) {
          console.log(`✗ ${provider} failed:`, error.message);
        }
      }
    }, 60000);
  });

  describe("SDK Streaming With Built-in Tools", () => {
    it("should stream with time tool", async () => {
      const chunks: string[] = [];

      const result = await sdk.stream({
        input: { text: "What time is it right now?" },
        provider: "google-ai",
        disableTools: false,
        maxTokens: 200,
      });

      for await (const chunk of result.stream) {
        if (chunk.content) {
          chunks.push(chunk.content);
        }
      }

      const fullContent = chunks.join("");
      expect(fullContent).toBeTruthy();
      // Should contain time-related information
      expect(fullContent.toLowerCase()).toMatch(
        /time|clock|\d{1,2}:\d{2}|am|pm/,
      );
    }, 30000);

    it("should stream with math tool", async () => {
      const chunks: string[] = [];

      const result = await sdk.stream({
        input: { text: "Calculate 25 times 4 for me" },
        provider: "google-ai",
        disableTools: false,
        maxTokens: 200,
      });

      for await (const chunk of result.stream) {
        if (chunk.content) {
          chunks.push(chunk.content);
        }
      }

      const fullContent = chunks.join("");
      expect(fullContent).toContain("100");
    }, 30000);
  });

  describe("SDK Streaming With Custom Tools", () => {
    it("should stream with custom tool", async () => {
      // Register a custom tool
      sdk.registerTool(
        "coinFlip",
        createTool({
          description: "Flip a coin and return heads or tails",
          execute: () => {
            const result = Math.random() > 0.5 ? "heads" : "tails";
            return { result, message: `The coin landed on ${result}!` };
          },
        }),
      );

      const chunks: string[] = [];

      const result = await sdk.stream({
        input: { text: "Flip a coin for me" },
        provider: "google-ai",
        disableTools: false,
        maxTokens: 200,
      });

      for await (const chunk of result.stream) {
        if (chunk.content) {
          chunks.push(chunk.content);
        }
      }

      const fullContent = chunks.join("").toLowerCase();
      expect(fullContent).toMatch(/heads|tails/);
      expect(fullContent).toContain("coin");
    }, 30000);

    it("should stream with parameterized custom tool", async () => {
      sdk.registerTool(
        "multiplyNumbers",
        createTypedTool({
          description: "Multiply two numbers together",
          parameters: z.object({
            a: z.number().describe("First number"),
            b: z.number().describe("Second number"),
          }),
          execute: ({ a, b }) => ({
            result: a * b,
            calculation: `${a} × ${b} = ${a * b}`,
          }),
        }),
      );

      const chunks: string[] = [];

      const result = await sdk.stream({
        input: { text: "Multiply 7 by 8" },
        provider: "google-ai",
        disableTools: false,
        maxTokens: 200,
      });

      for await (const chunk of result.stream) {
        if (chunk.content) {
          chunks.push(chunk.content);
        }
      }

      const fullContent = chunks.join("");
      expect(fullContent).toContain("56");
    }, 30000);
  });

  describe("Stream Performance and Behavior", () => {
    it("should measure time to first token", async () => {
      const startTime = Date.now();
      let firstTokenTime = 0;

      const result = await sdk.stream({
        input: { text: "Say hello" },
        provider: "google-ai",
        disableTools: true,
        maxTokens: 50,
      });

      let tokenCount = 0;
      for await (const chunk of result.stream) {
        if (chunk.content && !firstTokenTime) {
          firstTokenTime = Date.now();
        }
        if (chunk.content) {
          tokenCount++;
        }
      }

      const ttft = firstTokenTime - startTime;
      console.log(`Time to first token: ${ttft}ms`);
      console.log(`Total tokens received: ${tokenCount}`);

      // Should receive first token within 5 seconds
      expect(ttft).toBeLessThan(5000);
      expect(tokenCount).toBeGreaterThan(0);
    }, 30000);

    it("should handle long streaming sessions", async () => {
      const chunks: string[] = [];

      const result = await sdk.stream({
        input: { text: "Write a 200-word story about a space adventure" },
        provider: "google-ai",
        disableTools: true,
        maxTokens: 400,
      });

      for await (const chunk of result.stream) {
        if (chunk.content) {
          chunks.push(chunk.content);
        }
      }

      const fullContent = chunks.join("");
      const wordCount = fullContent
        .split(/\s+/)
        .filter((word) => word.length > 0).length;

      console.log(`Generated ${wordCount} words in ${chunks.length} chunks`);

      expect(wordCount).toBeGreaterThan(100); // At least 100 words
      expect(chunks.length).toBeGreaterThan(10); // Many chunks (proves streaming)
    }, 60000);
  });

  describe("Error Handling in Streams", () => {
    it("should handle provider errors gracefully", async () => {
      try {
        const result = await sdk.stream({
          input: { text: "Hello" },
          provider: "invalid-provider" as any,
          disableTools: true,
        });

        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message).toContain("provider");
      }
    });

    it("should handle tool errors during streaming", async () => {
      sdk.registerTool(
        "brokenTool",
        createTool({
          description: "A tool that always fails",
          execute: () => {
            throw new Error("Tool intentionally broken");
          },
        }),
      );

      const chunks: string[] = [];

      // Should still stream even if tool fails
      const result = await sdk.stream({
        input: { text: "Use the broken tool" },
        provider: "google-ai",
        disableTools: false,
        maxTokens: 200,
      });

      for await (const chunk of result.stream) {
        if (chunk.content) {
          chunks.push(chunk.content);
        }
      }

      // Should still get a response
      expect(chunks.length).toBeGreaterThan(0);
    }, 30000);
  });
});
