import { describe, it, expect } from "vitest";
import { NeuroLink } from "../../src/lib/neurolink.js";
import { createTool } from "../../src/lib/sdk/tool-registration.js";
import { AIProviderFactory } from "../../src/lib/core/factory.js";

describe("Debug Provider Tool Loading", () => {
  it("should check if SDK is passed to provider correctly", async () => {
    const sdk = new NeuroLink();

    // Register a tool
    sdk.registerTool(
      "debugTool",
      createTool({
        description: "Debug tool for testing",
        execute: () => ({ message: "Debug tool executed" }),
      }),
    );

    // Check if SDK has the method
    console.log(
      "SDK has getInMemoryServers:",
      typeof sdk.getInMemoryServers === "function",
    );
    console.log("In-memory servers:", sdk.getInMemoryServers());

    // Create a provider using the factory
    const factory = new AIProviderFactory();
    const provider = factory.createProvider("google-ai", undefined, sdk);

    // Check if SDK was passed
    console.log(
      "Provider has SDK:",
      Object.prototype.hasOwnProperty.call(provider, "sdk"),
    );
    console.log("Provider SDK type:", typeof (provider as any).sdk);

    // Get tools from provider
    const tools = await provider.getTools();
    console.log("Provider tools:", Object.keys(tools));

    // The custom tool should be in the tools list
    expect(Object.keys(tools)).toContain("debugTool");
  });

  it("should trace tool loading in BaseProvider", async () => {
    const sdk = new NeuroLink();

    // Register a tool
    sdk.registerTool(
      "traceTool",
      createTool({
        description: "Tool for tracing",
        execute: () => ({ traced: true }),
      }),
    );

    // Use the provider through SDK's generate method
    const result = await sdk.generate({
      input: { text: "Just say hello" },
      provider: "google-ai",
      maxTokens: 50,
      disableTools: false,
    });

    console.log("Generate result:", result);

    // Check if the provider used has access to tools
    expect(result.content).toBeDefined();
  });
});
