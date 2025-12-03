#!/usr/bin/env node

/**
 * NeuroLink Dynamic MCP Server Management Examples
 * Demonstrates programmatic addition of MCP servers at runtime
 */

import { NeuroLink } from "@juspay/neurolink";

async function demonstrateDynamicServers() {
  console.log("🔧 NeuroLink Dynamic MCP Server Management Demo");
  console.log("===============================================\n");

  const neurolink = new NeuroLink();

  // Example 1: Bitbucket Integration
  console.log("📋 Example 1: Adding Bitbucket Integration");
  try {
    await neurolink.addInMemoryMCPServer("bitbucket", {
      server: {
        title: "Bitbucket MCP Server",
        description:
          "Bitbucket repository management and development workflows",
        tools: {}, // External MCP server - tools discovered at runtime
      },
      metadata: {
        command: "npx",
        args: ["-y", "@nexus2520/bitbucket-mcp-server"],
        env: {
          BITBUCKET_USERNAME: process.env.BITBUCKET_USERNAME || "demo-user",
          BITBUCKET_TOKEN: process.env.BITBUCKET_TOKEN || "demo-token",
          BITBUCKET_BASE_URL:
            process.env.BITBUCKET_BASE_URL || "https://api.bitbucket.org/2.0",
        },
        transport: "stdio",
      },
    });
    console.log("✅ Bitbucket server added successfully");
  } catch (error) {
    console.log("❌ Failed to add Bitbucket server:", error.message);
  }

  // Example 2: Custom Database Connector
  console.log("\n📋 Example 2: Adding Custom Database Connector");
  try {
    await neurolink.addInMemoryMCPServer("database-analytics", {
      server: {
        title: "Database Analytics MCP Server",
        description: "Custom database analytics and reporting server",
        tools: {},
      },
      metadata: {
        command: "node",
        args: ["./custom-db-mcp-server.js"],
        env: {
          DATABASE_URL:
            process.env.DATABASE_URL || "postgresql://localhost:5432/demo",
          DB_POOL_SIZE: "10",
        },
        transport: "stdio",
        cwd: process.cwd(),
      },
    });
    console.log("✅ Database analytics server added successfully");
  } catch (error) {
    console.log("❌ Failed to add database server:", error.message);
  }

  // Example 3: Slack Integration
  console.log("\n📋 Example 3: Adding Slack Integration");
  try {
    await neurolink.addInMemoryMCPServer("slack-bot", {
      server: {
        title: "Slack Bot MCP Server",
        description: "Slack integration for messaging and notifications",
        tools: {},
      },
      metadata: {
        command: "npx",
        args: ["-y", "@slack/mcp-server"],
        env: {
          SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN || "xoxb-demo-token",
          SLACK_SIGNING_SECRET:
            process.env.SLACK_SIGNING_SECRET || "demo-secret",
        },
        transport: "stdio",
      },
    });
    console.log("✅ Slack bot server added successfully");
  } catch (error) {
    console.log("❌ Failed to add Slack server:", error.message);
  }

  // Example 4: Check Status
  console.log("\n📊 Current MCP Status:");
  const status = await neurolink.getMCPStatus();
  console.log(`  Total Servers: ${status.totalServers}`);
  console.log(`  Available Servers: ${status.availableServers}`);
  console.log(`  Total Tools: ${status.totalTools}`);

  // Example 5: List All Servers
  console.log("\n📋 Registered Servers:");
  const registry = neurolink.getUnifiedRegistry();
  const servers = registry.listServers();
  servers.forEach((server, index) => {
    console.log(`  ${index + 1}. ${server}`);
  });

  console.log("\n🎉 Dynamic MCP server management demo completed!");
  console.log("\n💡 Next Steps:");
  console.log("   - Set environment variables for real integrations");
  console.log("   - Use neurolink.generate() to leverage new tools");
  console.log("   - Build custom MCP servers for your specific needs");
}

// Error handling
process.on("unhandledRejection", (error) => {
  console.error("\n💥 Unhandled promise rejection:", error.message);
  process.exit(1);
});

// Run the demonstration
demonstrateDynamicServers().catch((error) => {
  console.error("\n❌ Demo failed:", error.message);
  process.exit(1);
});
