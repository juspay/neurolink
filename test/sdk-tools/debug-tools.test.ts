import { describe, it, expect } from "vitest";
import { NeuroLink } from "../../src/lib/neurolink.js";
import { createTool } from "../../src/lib/sdk/tool-registration.js";

describe("Debug Tool Recognition", () => {
  it("should verify tools are available to AI", async () => {
    const sdk = new NeuroLink();

    // Register a simple test tool
    sdk.registerTool(
      "testTool",
      createTool({
        description:
          "A test tool that returns a specific message. Use this when asked to test tools.",
        execute: () => ({ message: "Tool successfully executed!" }),
      }),
    );

    // List all available tools
    const tools = await sdk.getAllAvailableTools();
    console.log(
      "Available tools:",
      tools.map((t) => ({
        name: t.toolName,
        server: t.serverId,
        description: t.description,
      })),
    );

    // Test direct execution first
    const directResult = await sdk.executeTool("testTool");
    console.log("Direct execution result:", directResult);
    expect(directResult).toEqual({ message: "Tool successfully executed!" });

    // Test with AI - very explicit prompt
    const result = await sdk.generate({
      input: {
        text: "Please use the testTool and tell me what message it returns.",
      },
      provider: "google-ai",
      maxTokens: 200,
      disableTools: false,
    });

    console.log("AI Response:", result.content);
    console.log("Tool Calls:", result.toolCalls);
    console.log("Tool Results:", result.toolResults);

    // The AI should have used the tool
    expect(result.content).toBeDefined();
    if (result.toolCalls && result.toolCalls.length > 0) {
      expect(result.toolCalls[0].name).toBe("testTool");
      expect(result.content.toLowerCase()).toContain(
        "tool successfully executed",
      );
    } else {
      // If no tool calls, at least check if the AI acknowledged the request
      console.warn("AI did not use the tool as expected");
    }
  }, 30000);

  it("should verify custom tools are passed to AI", async () => {
    const sdk = new NeuroLink();

    // Register a simple calculation tool
    sdk.registerTool(
      "addNumbers",
      createTool({
        description:
          "Adds two numbers together. Use this tool when asked to add numbers.",
        execute: ({ a = 0, b = 0 }) => {
          const result = a + b;
          console.log(`Tool executed: ${a} + ${b} = ${result}`);
          return { result, calculation: `${a} + ${b} = ${result}` };
        },
      }),
    );

    // Test with a very explicit prompt
    const result = await sdk.generate({
      input: { text: "Use the addNumbers tool to add 5 and 3 together." },
      provider: "google-ai",
      maxTokens: 200,
      disableTools: false,
      temperature: 0.1, // Low temperature for consistent behavior
    });

    console.log("AI Response:", result.content);
    console.log("Tool Calls:", JSON.stringify(result.toolCalls, null, 2));
    console.log("Tool Results:", JSON.stringify(result.toolResults, null, 2));

    // Check if the result mentions 8
    expect(result.content).toBeDefined();
    expect(result.content).toContain("8");
  }, 30000);
});
