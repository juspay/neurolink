#!/usr/bin/env node
/**
 * MCP Integration Demo - Small Team MCP Usage
 * Shows how to use NeuroLink's MCP system effectively
 */

import dotenv from "dotenv";
dotenv.config();

import { AIProviderFactory } from "@juspay/neurolink";
import { createMCPClient } from "../../dist/lib/mcp/factory.js";

async function mcpIntegrationDemo() {
  console.log("🔧 MCP Integration Demo");
  console.log("======================\n");

  try {
    // 1. MCP Factory Creation
    console.log("1. 🏭 MCP Factory Setup");

    const mcpClient = await MCPFactory.createClient({
      enableLogging: true,
      enableSecurity: true,
      enableCaching: true,
    });

    if (mcpClient) {
      console.log("   ✅ MCP client created successfully");
    } else {
      console.log("   ⚠️  MCP client creation failed");
      return;
    }
    console.log();

    // 2. Tool Registration
    console.log("2. 🛠️ Tool Registration");

    // Register a custom tool
    await mcpClient.registerTool("text-analyzer", {
      description: "Analyzes text for sentiment and keywords",
      parameters: {
        text: { type: "string", required: true },
        mode: { type: "string", default: "sentiment" },
      },
      handler: async (params) => {
        // Simple text analysis example
        const { text, mode } = params;
        if (mode === "sentiment") {
          const positive = ["good", "great", "excellent", "amazing"].some(
            (word) => text.toLowerCase().includes(word),
          );
          return {
            sentiment: positive ? "positive" : "neutral",
            confidence: 0.8,
          };
        }
        return { words: text.split(" ").length, characters: text.length };
      },
    });

    console.log("   ✅ Custom tool registered: text-analyzer");
    console.log();

    // 3. Tool Execution
    console.log("3. ⚡ Tool Execution");

    const analysisResult = await mcpClient.executeTool("text-analyzer", {
      text: "This is a great example of MCP integration!",
      mode: "sentiment",
    });

    console.log("   📊 Analysis Result:", analysisResult);
    console.log();

    // 4. AI + MCP Integration
    console.log("4. 🤝 AI + MCP Integration");

    const aiProvider = await AIProviderFactory.createProvider(
      "google-ai",
      "gemini-2.5-flash",
    );

    if (aiProvider) {
      // Use AI with MCP tool context
      const prompt = `Analyze this text using available tools: "NeuroLink MCP system is excellent!"`;

      const aiResult = await aiProvider.generate({
        input: { text: prompt },
        context: {
          availableTools: ["text-analyzer"],
          mcpEnabled: true,
        },
      });

      console.log("   🤖 AI Response:", aiResult.text);

      // Execute the tool based on AI suggestion
      const toolResult = await mcpClient.executeTool("text-analyzer", {
        text: "NeuroLink MCP system is excellent!",
        mode: "sentiment",
      });

      console.log("   🔧 Tool Result:", toolResult);
    }
    console.log();

    // 5. Batch Tool Operations
    console.log("5. 📦 Batch Operations");

    const texts = [
      "This is amazing!",
      "Not sure about this.",
      "Absolutely fantastic work!",
    ];

    const batchResults = await Promise.all(
      texts.map((text) =>
        mcpClient.executeTool("text-analyzer", { text, mode: "sentiment" }),
      ),
    );

    batchResults.forEach((result, index) => {
      console.log(
        `   ${index + 1}. "${texts[index]}" → ${result.sentiment} (${result.confidence})`,
      );
    });
    console.log();

    console.log("🎉 MCP Integration Demo Complete!");
    console.log("\n💡 Small Team MCP Best Practices:");
    console.log("   - Register custom tools for domain-specific tasks");
    console.log("   - Use batch operations for efficiency");
    console.log("   - Combine AI + MCP for enhanced capabilities");
    console.log("   - Enable caching for repeated tool calls");
    console.log("   - Use security manager for production");
  } catch (error) {
    console.error("❌ MCP demo failed:", error.message);
    console.log("\n🔧 MCP Troubleshooting:");
    console.log("   1. Check MCP configuration in .mcp-config.json");
    console.log("   2. Verify tool registration permissions");
    console.log("   3. Check MCP server connectivity");
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  mcpIntegrationDemo().catch(console.error);
}

export { mcpIntegrationDemo };
