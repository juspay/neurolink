#!/usr/bin/env node
/**
 * MCP Integration Demo - HTTP Transport with NeuroLink
 * Shows how to use NeuroLink's MCP system with remote HTTP servers
 *
 * This example demonstrates:
 * - NeuroLink SDK setup
 * - Adding external MCP servers with HTTP transport
 * - AI generation with MCP tool access
 * - Proper MCPServerInfo structure (flat, no nesting)
 */

import dotenv from "dotenv";
dotenv.config();

import { NeuroLink } from "@juspay/neurolink";

async function mcpIntegrationDemo() {
  console.log("MCP Integration Demo");
  console.log("====================\n");

  try {
    // 1. Create NeuroLink instance
    console.log("1. Creating NeuroLink instance");

    const neurolink = new NeuroLink();
    console.log("   NeuroLink instance created successfully\n");

    // 2. Add External MCP Server with HTTP Transport
    console.log("2. Adding External MCP Server (HTTP Transport)");

    // MCPServerInfo uses a FLAT structure - no nested server/config wrappers
    // This is the correct pattern for adding remote MCP servers
    try {
      await neurolink.addExternalMCPServer("github-copilot", {
        id: "github-copilot",
        name: "GitHub Copilot MCP",
        description: "GitHub Copilot MCP API for code assistance",
        transport: "http",
        status: "initializing",
        tools: [],
        url: "https://api.githubcopilot.com/mcp",
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_COPILOT_TOKEN || "YOUR_TOKEN"}`,
          "Content-Type": "application/json",
        },
      });
      console.log("   GitHub Copilot MCP server added successfully\n");
    } catch (error) {
      console.log(
        "   Note: GitHub Copilot MCP requires valid token:",
        error.message,
        "\n",
      );
    }

    // 3. Add another example HTTP MCP server
    console.log("3. Adding Custom HTTP MCP Server");

    try {
      await neurolink.addExternalMCPServer("custom-api", {
        id: "custom-api",
        name: "Custom API Server",
        description: "Custom HTTP MCP server for domain-specific tools",
        transport: "http",
        status: "initializing",
        tools: [],
        url: "https://api.example.com/mcp",
        headers: {
          Authorization: `Bearer ${process.env.API_TOKEN || "YOUR_TOKEN"}`,
          "X-Custom-Header": "custom-value",
        },
      });
      console.log("   Custom API MCP server added successfully\n");
    } catch (error) {
      console.log(
        "   Note: Custom API demo (expected in demo mode):",
        error.message,
        "\n",
      );
    }

    // 4. AI Generation with MCP Tools
    console.log("4. AI Generation with MCP Integration");

    // Check if we have a valid API key for generation
    const hasGoogleKey = !!process.env.GOOGLE_AI_API_KEY;
    const hasOpenAIKey = !!process.env.OPENAI_API_KEY;

    if (hasGoogleKey || hasOpenAIKey) {
      const provider = hasGoogleKey ? "google-ai" : "openai";
      const model = hasGoogleKey ? "gemini-2.5-flash" : "gpt-4o-mini";

      console.log(`   Using provider: ${provider} with model: ${model}`);

      const result = await neurolink.generate({
        input: { text: "What tools do you have available? List them briefly." },
        provider: provider,
        model: model,
      });

      console.log("   AI Response:", result.text?.substring(0, 200) + "...\n");
    } else {
      console.log("   Skipping AI generation (no API key configured)");
      console.log(
        "   Set GOOGLE_AI_API_KEY or OPENAI_API_KEY to test generation\n",
      );
    }

    // 5. Display MCPServerInfo Structure Reference
    console.log("5. MCPServerInfo Structure Reference");
    console.log("   The correct FLAT structure for addExternalMCPServer:\n");

    const exampleServerInfo = {
      id: "server-id",
      name: "Server Name",
      description: "Server description",
      transport: "http", // or "stdio" or "sse"
      status: "initializing", // or "connected" or "error"
      tools: [], // Array of available tools
      url: "https://api.example.com/mcp", // Required for HTTP transport
      headers: {
        // Optional headers for authentication
        Authorization: "Bearer TOKEN",
      },
    };

    console.log(JSON.stringify(exampleServerInfo, null, 4));
    console.log();

    // Summary
    console.log("MCP Integration Demo Complete!\n");
    console.log("Key Points:");
    console.log("  - Use NeuroLink class directly (not AIProviderFactory)");
    console.log("  - Use addExternalMCPServer() for remote MCP servers");
    console.log(
      "  - MCPServerInfo uses FLAT structure (no server/config wrappers)",
    );
    console.log("  - HTTP transport requires url and optional headers");
    console.log("  - Use neurolink.generate() for AI interactions");

    console.log("\nTransport Types:");
    console.log("  stdio  - Local CLI tools (npx, node, python commands)");
    console.log("  sse    - Server-Sent Events (legacy web servers)");
    console.log("  http   - HTTP/REST APIs (recommended for remote servers)");
  } catch (error) {
    console.error("MCP demo failed:", error.message);
    console.log("\nTroubleshooting:");
    console.log("  1. Ensure NeuroLink is properly installed");
    console.log("  2. Check API keys are set in environment");
    console.log("  3. Verify MCP server URLs are accessible");
    console.log("  4. Check authentication headers are correct");
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  mcpIntegrationDemo().catch(console.error);
}

export { mcpIntegrationDemo };
