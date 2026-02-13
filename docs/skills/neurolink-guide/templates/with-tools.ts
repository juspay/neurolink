/**
 * NeuroLink Tool Integration Template
 *
 * This template demonstrates how to use built-in tools,
 * register custom tools, and integrate MCP servers.
 */

import { NeuroLink } from "@juspay/neurolink";
import type { ToolInfo } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// ============================================
// Built-in Tools
// ============================================

async function useBuiltInTools(): Promise<void> {
  console.log("=== Using Built-in Tools ===\n");

  // Use getCurrentTime tool
  const timeResult = await neurolink.generate({
    input: { text: "What is the current date and time?" },
    tools: ["getCurrentTime"],
  });
  console.log("Time result:", timeResult.content);
  console.log("Tool calls:", timeResult.toolCalls);

  // Use readFile tool
  const fileResult = await neurolink.generate({
    input: { text: "Read the package.json file and tell me the project name" },
    tools: ["readFile"],
  });
  console.log("\nFile result:", fileResult.content);

  // Use calculateMath tool
  const mathResult = await neurolink.generate({
    input: { text: "Calculate 1234 * 5678 + 91011" },
    tools: ["calculateMath"],
  });
  console.log("\nMath result:", mathResult.content);
}

// ============================================
// Custom Tool Registration
// ============================================

async function registerCustomTools(): Promise<void> {
  console.log("\n=== Registering Custom Tools ===\n");

  // Register a weather tool
  neurolink.registerTool("getWeather", {
    name: "getWeather",
    description: "Get current weather information for a location",
    inputSchema: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description:
            "City name or coordinates (e.g., 'Tokyo' or '35.6762,139.6503')",
        },
        units: {
          type: "string",
          enum: ["celsius", "fahrenheit"],
          default: "celsius",
          description: "Temperature units",
        },
      },
      required: ["location"],
    },
    execute: async ({ location, units = "celsius" }) => {
      // Simulated weather API response
      const weatherData = {
        location,
        temperature: units === "celsius" ? 22 : 72,
        units,
        condition: "Partly cloudy",
        humidity: 65,
        windSpeed: 12,
        windDirection: "NW",
      };
      return weatherData;
    },
  });

  // Register a database query tool
  neurolink.registerTool("queryDatabase", {
    name: "queryDatabase",
    description: "Execute a read-only database query",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "SQL SELECT query to execute",
        },
        database: {
          type: "string",
          enum: ["users", "orders", "products"],
          description: "Database to query",
        },
      },
      required: ["query", "database"],
    },
    execute: async ({ query, database }) => {
      // Simulated database response
      console.log(`Executing query on ${database}: ${query}`);
      return {
        rows: [
          { id: 1, name: "John Doe", email: "john@example.com" },
          { id: 2, name: "Jane Smith", email: "jane@example.com" },
        ],
        rowCount: 2,
        executionTime: "45ms",
      };
    },
  });

  // Use custom tools
  const result = await neurolink.generate({
    input: { text: "What's the weather like in Tokyo?" },
    tools: ["getWeather"],
  });

  console.log("Weather result:", result.content);
  console.log("Tool results:", result.toolResults);
}

// ============================================
// MCP Server Integration
// ============================================

async function addMCPServers(): Promise<void> {
  console.log("\n=== MCP Server Integration ===\n");

  // Add GitHub MCP server (stdio transport)
  if (process.env.GITHUB_TOKEN) {
    try {
      await neurolink.addExternalMCPServer("github", {
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-github"],
        transport: "stdio",
        env: {
          GITHUB_TOKEN: process.env.GITHUB_TOKEN,
        },
      });
      console.log("GitHub MCP server connected");

      // Use GitHub tools
      const result = await neurolink.generate({
        input: { text: "Search for popular TypeScript repositories" },
        tools: ["search_repositories"],
      });
      console.log("GitHub search result:", result.content);
    } catch (error) {
      console.log("GitHub MCP server not available");
    }
  }

  // Add HTTP-based MCP server
  // await neurolink.addExternalMCPServer('my-api', {
  //   transport: 'http',
  //   url: 'https://api.example.com/mcp',
  //   headers: {
  //     'Authorization': `Bearer ${process.env.API_TOKEN}`
  //   },
  //   timeout: 15000,
  //   retries: 3
  // });
}

// ============================================
// List and Inspect Tools
// ============================================

async function inspectTools(): Promise<void> {
  console.log("\n=== Inspecting Available Tools ===\n");

  const tools = await neurolink.getAllAvailableTools();

  console.log(`Total tools available: ${tools.length}\n`);

  // Group by category
  const byCategory: Record<string, ToolInfo[]> = {};
  for (const tool of tools) {
    const category = tool.category || "uncategorized";
    if (!byCategory[category]) {
      byCategory[category] = [];
    }
    byCategory[category].push(tool);
  }

  for (const [category, categoryTools] of Object.entries(byCategory)) {
    console.log(`${category.toUpperCase()}:`);
    for (const tool of categoryTools) {
      console.log(`  - ${tool.name}: ${tool.description || "No description"}`);
    }
    console.log();
  }
}

// ============================================
// Tool Events
// ============================================

async function toolEvents(): Promise<void> {
  console.log("\n=== Tool Events ===\n");

  const emitter = neurolink.getEventEmitter();

  emitter.on("tool:start", (event) => {
    console.log(`[TOOL START] ${event.toolName}`);
    console.log(`  Input: ${JSON.stringify(event.input)}`);
  });

  emitter.on("tool:end", (event) => {
    const status = event.success ? "SUCCESS" : "FAILED";
    console.log(`[TOOL ${status}] ${event.toolName} (${event.responseTime}ms)`);
    if (event.result) {
      console.log(`  Result: ${JSON.stringify(event.result).slice(0, 100)}...`);
    }
  });

  // Trigger tool execution
  await neurolink.generate({
    input: { text: "What time is it and what is 42 * 42?" },
    tools: ["getCurrentTime", "calculateMath"],
  });
}

// ============================================
// Direct Tool Execution
// ============================================

async function directToolExecution(): Promise<void> {
  console.log("\n=== Direct Tool Execution ===\n");

  // Execute tool directly (without AI)
  const result = await neurolink.executeTool("calculateMath", {
    expression: "(100 + 200) * 3",
  });

  console.log("Direct calculation result:", result);

  // With options
  const resultWithOptions = await neurolink.executeTool(
    "readFile",
    { path: "./package.json" },
    { timeout: 5000, maxRetries: 2 },
  );

  console.log("File content length:", String(resultWithOptions).length);
}

// ============================================
// Main
// ============================================

async function main(): Promise<void> {
  await useBuiltInTools();
  await registerCustomTools();
  await inspectTools();
  await toolEvents();
  await directToolExecution();

  // Uncomment to test MCP servers
  // await addMCPServers();
}

main().catch(console.error);
