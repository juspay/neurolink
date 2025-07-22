import { describe, it, expect } from "vitest";
import { NeuroLink } from "../../src/lib/neurolink.js";
import { createTool } from "../../src/lib/sdk/tool-registration.js";

describe("Simple Tool Test", () => {
  it("should register and use a simple tool", async () => {
    const sdk = new NeuroLink();

    // Register a very simple tool
    sdk.registerTool(
      "simpleAdd",
      createTool({
        description: "Adds two numbers",
        execute: ({ a = 0, b = 0 }) => {
          console.log(`Tool executing: ${a} + ${b}`);
          return a + b;
        },
      }),
    );

    // Check if tool is registered
    const tools = await sdk.getAllAvailableTools();
    const simpleTool = tools.find((t) => t.toolName === "simpleAdd");
    console.log("Found tool:", simpleTool);

    // Use with a direct request
    const result = await sdk.generate({
      input: { text: "What is 5 plus 3?" },
      provider: "google-ai",
      maxTokens: 100,
      disableTools: false,
    });

    console.log("Result:", result.content);
    console.log("Tool calls:", result.toolCalls);

    expect(result.content).toContain("8");
  }, 30000);
});
