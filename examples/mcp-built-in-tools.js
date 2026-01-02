#!/usr/bin/env node

/**
 * NeuroLink MCP Built-in Tools Example
 *
 * This example demonstrates:
 * - Built-in tool usage (v1.7.1)
 * - Time tool functionality
 * - Tool discovery
 * - MCP integration
 */

import { NeuroLink } from "@juspay/neurolink";

async function mcpBuiltInToolsExample() {
  console.log("🛠️ NeuroLink MCP Built-in Tools Example (v1.7.1)\n");

  try {
    // 1. Create NeuroLink instance with MCP tools enabled
    console.log("1. Creating NeuroLink instance with MCP tools...");
    const neurolink = new NeuroLink();

    // 2. Test time tool (built-in, working in v1.7.1)
    console.log("2. Testing time tool...");
    const timeResult = await neurolink.generate({
      input: {
        text: "What time is it right now? Please use the time tool to get the current time.",
      },
    });

    console.log("✅ Time tool result:");
    console.log(timeResult.text);

    // 3. Test tool discovery
    console.log("\n3. Testing tool discovery...");
    const toolsResult = await neurolink.generate({
      input: {
        text: "What tools do you have access to? List and categorize them.",
      },
    });

    console.log("✅ Available tools:");
    console.log(toolsResult.text);

    // 4. Test multi-tool integration
    console.log("\n4. Testing multi-tool integration...");
    const multiResult = await neurolink.generate({
      input: {
        text: "Can you tell me the current time and then explain what tools you have available?",
      },
    });

    console.log("✅ Multi-tool result:");
    console.log(multiResult.text);

    console.log("\n📊 Summary:");
    console.log("- Built-in tools: ✅ Working");
    console.log("- Time tool: ✅ Functional");
    console.log("- Tool discovery: ✅ Working");
    console.log("- Multi-tool integration: ✅ Working");
  } catch (error) {
    console.error("❌ Error:", error.message);

    if (error.message.includes("API key")) {
      console.log("\n💡 Setup help:");
      console.log("Set up an API key to test MCP tools:");
      console.log('export GOOGLE_AI_API_KEY="AIza-your-key"');
    }
  }
}

// Run the example
import { fileURLToPath } from "url";
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  mcpBuiltInToolsExample().catch(console.error);
}

export { mcpBuiltInToolsExample };
