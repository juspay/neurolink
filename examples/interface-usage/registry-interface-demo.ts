#!/usr/bin/env node

/**
 * Registry Interface Demo
 * Demonstrates advanced registry patterns with optional methods
 */

import { MCPToolRegistry } from "@juspay/neurolink";
import { fileURLToPath } from "url";

async function registryInterfaceDemo() {
  console.log("🔧 Registry Interface Demo");
  console.log("==========================\n");

  try {
    console.log("1. Creating MCP registry with optional methods...");
    const registry = new MCPToolRegistry();

    console.log("2. Testing optional method patterns...");

    // Safe method calls with optional chaining
    if (registry.registerServer) {
      await registry.registerServer?.("demo-server", {
        type: "utility",
        config: { timeout: 30000 },
      });
      console.log("✅ Server registered using optional method");
    }

    const result = await registry.executeTool?.(
      "demo-tool",
      {
        input: "test data",
      },
      {
        sessionId: "demo-session",
        userId: "demo-user",
        timeout: 15000,
      },
    );

    if (result) {
      console.log("📊 Tool execution result:");
      console.log(`   Success: ${result.success}`);
      console.log(`   Data: ${result.data}`);
      console.log(`   Timestamp: ${new Date(result.timestamp).toISOString()}`);
    }

    console.log("\n3. Registry statistics and monitoring...");

    // Get registry statistics
    const stats = registry.getStats?.();
    if (stats) {
      console.log("📈 Registry Statistics:");
      Object.entries(stats).forEach(([tool, metrics]: [string, unknown]) => {
        const m = metrics as { count: number; averageTime: number };
        console.log(
          `   ${tool}: ${m.count} executions, avg ${m.averageTime}ms`,
        );
      });
    }

    console.log("\n4. Tool discovery and listing...");

    const tools = await registry.listTools?.({
      permissions: ["read", "execute"],
      metadata: { category: "utility" },
    });

    if (tools) {
      console.log(`🔍 Discovered ${tools.length} tools:`);
      tools.forEach(
        (tool: {
          name: string;
          description?: string;
          category?: string;
          lastUsed?: string;
        }) => {
          console.log(
            `   - ${tool.name}: ${tool.description || "No description"}`,
          );
          if (tool.category) {
            console.log(`     Category: ${tool.category}`);
          }
          if (tool.lastUsed) {
            console.log(`     Last used: ${tool.lastUsed}`);
          }
        },
      );
    }

    console.log("\n5. Server management...");

    // Get server information
    const serverInfo = await registry.getServerInfo?.("demo-server");
    if (serverInfo) {
      console.log("🖥️  Server Information:");
      console.log(`   ${JSON.stringify(serverInfo, null, 2)}`);
    }

    // Unregister server when done
    await registry.unregisterServer?.("demo-server");
    console.log("🔄 Server unregistered");

    console.log("\n6. Error handling patterns...");

    try {
      // Attempt to call non-existent tool
      await registry.executeTool?.("non-existent-tool", {});
    } catch (error) {
      console.log(
        "❌ Expected error handled gracefully:",
        (error as Error).message,
      );
    }

    console.log("\n🎉 Registry interface demo completed!");
    console.log("\n💡 Key Benefits Demonstrated:");
    console.log("   - Optional methods provide maximum flexibility");
    console.log("   - Generic type support for type safety");
    console.log("   - Rich context flows through all operations");
    console.log("   - Comprehensive error handling");
    console.log("   - Statistics and monitoring capabilities");
  } catch (error) {
    console.error("❌ Demo failed:", (error as Error).message);
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  registryInterfaceDemo();
}

export { registryInterfaceDemo };
