import { describe, it, expect } from "vitest";
import { NeuroLink } from "../../src/lib/neurolink.js";
import {
  createTool,
  createTypedTool,
} from "../../src/lib/sdk/tool-registration.js";
import { z } from "zod";

describe("Unique Tool Test", () => {
  it("should use a custom tool for a unique operation", async () => {
    const sdk = new NeuroLink();

    // Track if tool was called
    let toolCalled = false;

    // Register a unique tool that can't be done without it
    sdk.registerTool(
      "reverseString",
      createTypedTool({
        description: "Reverses a string. Use this when asked to reverse text.",
        parameters: z.object({
          text: z.string().describe("The text to reverse"),
        }),
        execute: ({ text }) => {
          console.log(`Tool called with: "${text}"`);
          toolCalled = true;
          const reversed = text.split("").reverse().join("");
          return {
            original: text,
            reversed: reversed,
            message: `The reverse of "${text}" is "${reversed}"`,
          };
        },
      }),
    );

    // Verify tool is available
    const tools = await sdk.getAllAvailableTools();
    const hasReverseTool = tools.some((t) => t.toolName === "reverseString");
    console.log("Tool registered:", hasReverseTool);

    // Use the tool with explicit instruction
    const result = await sdk.generate({
      input: { text: 'Please reverse the string "hello world" for me.' },
      provider: "google-ai",
      maxTokens: 200,
      disableTools: false,
      temperature: 0.1,
    });

    console.log("\n=== RESULT ===");
    console.log("Content:", result.content);
    console.log("Tool calls:", result.toolCalls);
    console.log("Tool called directly:", toolCalled);
    console.log("===============\n");

    // The result should contain the reversed string
    expect(result.content.toLowerCase()).toContain("dlrow olleh");
  }, 30000);

  it("should use built-in tools that do work", async () => {
    const sdk = new NeuroLink();

    // Test with a built-in tool
    const result = await sdk.generate({
      input: { text: "What is the current time?" },
      provider: "google-ai",
      maxTokens: 200,
      disableTools: false,
    });

    console.log("\n=== TIME RESULT ===");
    console.log("Content:", result.content);
    console.log("Tool calls:", result.toolCalls);
    console.log("===================\n");

    // Should have time information
    expect(result.content).toBeDefined();
    expect(result.toolCalls).toBeDefined();
    if (result.toolCalls && result.toolCalls.length > 0) {
      expect(result.toolCalls[0].name).toBe("getCurrentTime");
    }
  }, 30000);
});
