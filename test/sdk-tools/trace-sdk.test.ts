import { describe, it, expect } from "vitest";
import { NeuroLink } from "../../src/lib/neurolink.js";
import { createTool } from "../../src/lib/sdk/tool-registration.js";
import { AIProviderFactory } from "../../src/lib/core/factory.js";

describe("Trace SDK Passing", () => {
  it("should trace SDK through the call chain", async () => {
    const sdk = new NeuroLink();

    // Add a marker to the SDK to trace it
    (sdk as any).__testMarker = "TEST_SDK_INSTANCE";

    // Register a tool
    sdk.registerTool(
      "traceTool",
      createTool({
        description: "Tool for tracing",
        execute: () => ({ traced: true }),
      }),
    );

    // Check SDK has tools
    const servers = sdk.getInMemoryServers();
    console.log("SDK has servers:", servers.size);

    // Manually create a provider to test
    console.log("\n=== Creating provider manually ===");
    const provider = await AIProviderFactory.createProvider(
      "google-ai",
      undefined,
      true,
      sdk,
    );
    console.log("Provider created");

    // Check if provider has SDK
    console.log(
      "Provider has SDK marker:",
      (provider as any).sdk?.__testMarker,
    );
    console.log("Provider SDK type:", typeof (provider as any).sdk);

    // Now test through generate
    console.log("\n=== Testing through generate ===");
    const result = await sdk.generate({
      input: { text: "Just say hello" },
      provider: "google-ai",
      maxTokens: 50,
      disableTools: false,
    });

    console.log("Generate completed");
    expect(result.content).toBeDefined();
  });
});
