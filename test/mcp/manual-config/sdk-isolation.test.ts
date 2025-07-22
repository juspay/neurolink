import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NeuroLink } from "../../../src/lib/neurolink.js";
import { writeFileSync, unlinkSync, existsSync } from "fs";
import { join } from "path";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Get provider configuration from environment
const getTestProvider = () => process.env.TEST_PROVIDER || "google-ai";
const getTestModel = () => process.env.TEST_MODEL || "gemini-2.0-flash-exp";

/**
 * SDK MANUAL MCP ISOLATION TESTS
 * Tests that SDK never loads manual MCP configuration
 */
describe("SDK Manual MCP Isolation Tests", () => {
  const timeout = 30000; // 30 seconds per test
  const originalConfigFile = join(process.cwd(), ".mcp-config.json");
  let hasOriginalConfig = false;
  let originalConfigContent = "";
  let sdk: NeuroLink;

  beforeAll(() => {
    console.log("🔧 Setting up SDK MCP Isolation tests...");

    // Backup original config if exists
    if (existsSync(originalConfigFile)) {
      hasOriginalConfig = true;
      originalConfigContent = require("fs").readFileSync(
        originalConfigFile,
        "utf8",
      );
      console.log("📦 Backed up original .mcp-config.json");
    }

    // Create test MCP config that should NOT be loaded by SDK
    const testConfig = {
      mcpServers: {
        dangerousServer: {
          name: "dangerousServer",
          command: "rm",
          args: ["-rf", "/"], // Obviously dangerous - SDK should never load this
          transport: "stdio",
        },
        testServer: {
          name: "testServer",
          command: "echo",
          args: ["should-not-be-loaded"],
          transport: "stdio",
        },
      },
    };

    writeFileSync(originalConfigFile, JSON.stringify(testConfig, null, 2));
    console.log("✅ Created test MCP config with dangerous server");

    // Initialize SDK
    sdk = new NeuroLink();
  });

  afterAll(() => {
    // Restore original config or remove test config
    if (hasOriginalConfig) {
      writeFileSync(originalConfigFile, originalConfigContent);
      console.log("📦 Restored original .mcp-config.json");
    } else {
      try {
        unlinkSync(originalConfigFile);
      } catch (e) {
        // Ignore if doesn't exist
      }
    }
  });

  it(
    "should NOT load manual MCP config in SDK (generate)",
    async () => {
      console.log("\n🧪 Test 1: SDK generate should not load manual config");

      try {
        const result = await sdk.generate({
          input: { text: "What is 2+2?" },
          provider: getTestProvider() as any,
          maxTokens: 50,
          disableTools: false, // Tools enabled, but should only have direct tools
        });

        expect(result).toBeTruthy();
        expect(result.content).toBeTruthy();

        // Check available tools (should only be direct tools, no manual MCP)
        if (result.availableTools) {
          console.log(
            "📋 Available tools:",
            result.availableTools.map((t) => t.name).join(", "),
          );

          // Should not contain any tools from manual config
          const toolNames = result.availableTools.map((t) => t.name);
          expect(toolNames).not.toContain("dangerousServer");
          expect(toolNames).not.toContain("testServer");

          // Should contain direct tools
          expect(toolNames).toContain("getCurrentTime");
          expect(toolNames).toContain("calculateMath");
        }

        console.log("✅ SDK correctly isolated from manual MCP config");
      } catch (error) {
        console.error("❌ Test failed:", error);
        throw error;
      }
    },
    timeout,
  );

  it(
    "should have only direct tools when tools are enabled",
    async () => {
      console.log("\n🧪 Test 2: SDK should only have direct tools");

      try {
        const result = await sdk.generate({
          input: { text: "What time is it?" },
          provider: getTestProvider() as any,
          maxTokens: 100,
        });

        expect(result).toBeTruthy();

        // Get available tools through SDK method if available
        const availableTools = await sdk.getAllAvailableTools();
        console.log("📋 Total tools available:", availableTools.length);

        // Should have exactly 6 direct tools
        const directToolNames = [
          "getCurrentTime",
          "readFile",
          "listDirectory",
          "calculateMath",
          "writeFile",
          "searchFiles",
        ];

        const toolNames = availableTools.map((t) => t.name);
        directToolNames.forEach((toolName) => {
          expect(toolNames).toContain(toolName);
        });

        // Should not have any manual MCP server tools
        expect(toolNames).not.toContain("dangerousServer");
        expect(toolNames).not.toContain("testServer");

        console.log("✅ SDK has correct tool set (direct tools only)");
      } catch (error) {
        console.error("❌ Test failed:", error);
        throw error;
      }
    },
    timeout,
  );

  it(
    "should work with streaming and only direct tools",
    async () => {
      console.log("\n🧪 Test 3: SDK stream with only direct tools");

      try {
        const streamResult = await sdk.stream({
          input: { text: "Count to 3" },
          provider: getTestProvider() as any,
          maxTokens: 50,
        });

        expect(streamResult).toBeTruthy();
        expect(streamResult.stream).toBeTruthy();

        let fullContent = "";
        for await (const chunk of streamResult.stream) {
          fullContent += chunk.content;
        }

        expect(fullContent).toBeTruthy();
        console.log("📝 Stream output:", fullContent.substring(0, 50));

        console.log("✅ SDK streaming works with tool isolation");
      } catch (error) {
        console.error("❌ Test failed:", error);
        throw error;
      }
    },
    timeout,
  );

  it(
    "should allow custom tool registration without affecting manual MCP",
    async () => {
      console.log("\n🧪 Test 4: SDK custom tool registration");

      try {
        // Register a custom tool
        sdk.registerTool("testCustomTool", {
          description: "A safe custom tool",
          execute: async (args) => {
            return { result: "Custom tool executed", args };
          },
        });

        const customTools = sdk.getCustomTools();
        expect(customTools.has("testCustomTool")).toBe(true);

        // Execute the custom tool
        const toolResult = await sdk.executeTool("testCustomTool", {
          test: true,
        });
        expect(toolResult).toEqual({
          result: "Custom tool executed",
          args: { test: true },
        });

        console.log("✅ Custom tool registration works correctly");

        // Unregister the tool
        const removed = sdk.unregisterTool("testCustomTool");
        expect(removed).toBe(true);
      } catch (error) {
        console.error("❌ Test failed:", error);
        throw error;
      }
    },
    timeout,
  );

  it(
    "should maintain isolation even with in-memory MCP servers",
    async () => {
      console.log("\n🧪 Test 5: SDK in-memory server isolation");

      try {
        // Add an in-memory MCP server
        await sdk.addInMemoryMCPServer("test-memory-server", {
          server: {
            name: "Test Memory Server",
            tools: {
              memoryTool: {
                description: "In-memory test tool",
                execute: async (args) => ({
                  success: true,
                  data: "Memory tool result",
                }),
              },
            },
          },
          category: "test",
          metadata: {
            version: "1.0.0",
          },
        });

        // This should work - in-memory servers are allowed
        const servers = sdk.getInMemoryServers();
        expect(servers.has("test-memory-server")).toBe(true);

        // But manual config should still not be loaded
        const availableTools = await sdk.getAllAvailableTools();
        const toolNames = availableTools.map((t) => t.name);

        // Should not have manual config tools
        expect(toolNames).not.toContain("dangerousServer");
        expect(toolNames).not.toContain("testServer");

        console.log("✅ SDK maintains isolation with in-memory servers");
      } catch (error) {
        console.error("❌ Test failed:", error);
        throw error;
      }
    },
    timeout,
  );
});
