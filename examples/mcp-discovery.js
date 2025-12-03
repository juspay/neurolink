#!/usr/bin/env node

/**
 * NeuroLink MCP Discovery Example
 *
 * This example demonstrates:
 * - External MCP server discovery (v1.7.1)
 * - Cross-platform configuration parsing
 * - Discovery across all major AI tools
 * - Output formatting options
 */

import { exec } from "child_process";
import { promisify } from "util";
import { fileURLToPath } from "url";

const execAsync = promisify(exec);

async function mcpDiscoveryExample() {
  console.log("🔍 NeuroLink MCP Discovery Example (v1.7.1)\n");

  try {
    // 1. Basic discovery
    console.log("1. Basic MCP server discovery...");
    const { stdout: tableOutput } = await execAsync(
      "npx @juspay/neurolink mcp discover --format table",
    );
    console.log("✅ Table format:");
    console.log(tableOutput);

    // 2. JSON format discovery
    console.log("\n2. JSON format discovery...");
    const { stdout: jsonOutput } = await execAsync(
      "npx @juspay/neurolink mcp discover --format json",
    );
    const discoveryData = JSON.parse(jsonOutput);

    console.log("✅ Discovery results:");
    console.log(
      `📊 Total servers found: ${discoveryData.servers?.length || 0}`,
    );
    console.log(`📊 AI tools scanned: ${discoveryData.sources?.length || 0}`);

    if (discoveryData.servers && discoveryData.servers.length > 0) {
      console.log("\n📋 Top 5 discovered servers:");
      discoveryData.servers.slice(0, 5).forEach((server, index) => {
        console.log(
          `   ${index + 1}. ${server.name} (${server.source || "unknown source"})`,
        );
      });
    }

    // 3. Source analysis
    if (discoveryData.sources) {
      console.log("\n📍 Discovery sources:");
      discoveryData.sources.forEach((source) => {
        console.log(`   - ${source.name}: ${source.serversFound || 0} servers`);
      });
    }

    // 4. YAML format (if needed)
    console.log("\n3. YAML format discovery...");
    const { stdout: yamlOutput } = await execAsync(
      "npx @juspay/neurolink mcp discover --format yaml",
    );
    console.log("✅ YAML format available");
    // Show a sample of YAML output
    console.log("   Sample output:");
    console.log(yamlOutput.split("\n").slice(0, 5).join("\n"));

    console.log("\n📊 Summary:");
    console.log("- External discovery: ✅ Working");
    console.log("- Cross-platform support: ✅ Working");
    console.log("- Multiple AI tools: ✅ Supported");
    console.log("- Output formats: ✅ Table, JSON, YAML");
    console.log("- Server activation: 🔧 In development (v1.8.0)");
  } catch (error) {
    console.error("❌ Error:", error.message);

    if (error.message.includes("command not found")) {
      console.log("\n💡 Setup help:");
      console.log("Install NeuroLink first:");
      console.log("npm install -g @juspay/neurolink");
      console.log("Or use npx: npx @juspay/neurolink mcp discover");
    }
  }
}

async function analyzeDiscoveredServers() {
  console.log("\n🔬 Analyzing discovered servers...");

  try {
    const { stdout } = await execAsync(
      "npx @juspay/neurolink mcp discover --format json",
    );
    const data = JSON.parse(stdout);

    if (!data.servers || data.servers.length === 0) {
      console.log("📭 No servers discovered. This might be normal if:");
      console.log("   - No AI tools with MCP configs are installed");
      console.log("   - Configurations are in non-standard locations");
      return;
    }

    // Analyze by source
    const bySource = {};
    data.servers.forEach((server) => {
      const source = server.source || "unknown";
      bySource[source] = (bySource[source] || 0) + 1;
    });

    console.log("\n📊 Servers by source:");
    Object.entries(bySource).forEach(([source, count]) => {
      console.log(`   ${source}: ${count} servers`);
    });

    // Analyze by type
    const serverTypes = {};
    data.servers.forEach((server) => {
      const name = server.name?.toLowerCase() || "unknown";
      let type = "other";

      if (name.includes("filesystem") || name.includes("file")) {
        type = "filesystem";
      } else if (name.includes("github") || name.includes("git")) {
        type = "git";
      } else if (
        name.includes("database") ||
        name.includes("postgres") ||
        name.includes("sql")
      ) {
        type = "database";
      } else if (
        name.includes("web") ||
        name.includes("browser") ||
        name.includes("puppeteer")
      ) {
        type = "web";
      } else if (name.includes("search")) {
        type = "search";
      }

      serverTypes[type] = (serverTypes[type] || 0) + 1;
    });

    console.log("\n📊 Servers by type:");
    Object.entries(serverTypes).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} servers`);
    });
  } catch (error) {
    console.log("❌ Analysis failed:", error.message);
  }
}

// Run the example
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  mcpDiscoveryExample()
    .then(() => analyzeDiscoveredServers())
    .catch(console.error);
}

export { mcpDiscoveryExample, analyzeDiscoveredServers };
