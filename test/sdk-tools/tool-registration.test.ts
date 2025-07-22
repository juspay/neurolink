import { describe, it, expect, beforeEach } from "vitest";
import { NeuroLink } from "../../src/lib/neurolink.js";
import {
  createTool,
  createTypedTool,
} from "../../src/lib/sdk/tool-registration.js";
import { z } from "zod";

describe("SDK Tool Registration - Phase 1", () => {
  let sdk: NeuroLink;

  beforeEach(() => {
    sdk = new NeuroLink();
  });

  describe("Basic Tool Registration", () => {
    it("should register a simple tool", () => {
      const tool = createTool({
        description: "Test tool",
        execute: () => "test result",
      });

      expect(() => sdk.registerTool("testTool", tool)).not.toThrow();

      const customTools = sdk.getCustomTools();
      expect(customTools.has("testTool")).toBe(true);
    });

    it("should register a tool with parameters", () => {
      const tool = createTypedTool({
        description: "Math tool",
        parameters: z.object({
          a: z.number(),
          b: z.number(),
          operation: z.enum(["add", "subtract"]),
        }),
        execute: ({ a, b, operation }) => {
          return operation === "add" ? a + b : a - b;
        },
      });

      expect(() => sdk.registerTool("mathTool", tool)).not.toThrow();

      const customTools = sdk.getCustomTools();
      expect(customTools.has("mathTool")).toBe(true);
    });

    it("should register multiple tools at once", () => {
      const tools = {
        tool1: createTool({
          description: "Tool 1",
          execute: () => "result 1",
        }),
        tool2: createTool({
          description: "Tool 2",
          execute: () => "result 2",
        }),
      };

      sdk.registerTools(tools);

      const customTools = sdk.getCustomTools();
      expect(customTools.size).toBe(2);
      expect(customTools.has("tool1")).toBe(true);
      expect(customTools.has("tool2")).toBe(true);
    });

    it("should unregister a tool", () => {
      const tool = createTool({
        description: "Test tool",
        execute: () => "test result",
      });

      sdk.registerTool("testTool", tool);
      expect(sdk.getCustomTools().has("testTool")).toBe(true);

      const removed = sdk.unregisterTool("testTool");
      expect(removed).toBe(true);
      expect(sdk.getCustomTools().has("testTool")).toBe(false);
    });

    it("should validate tool configuration", () => {
      // Tool without description should fail
      expect(() =>
        sdk.registerTool("invalidTool", {
          description: "",
          execute: () => {},
        }),
      ).toThrow("must have a description");

      // Tool without execute function should fail
      expect(() =>
        sdk.registerTool("invalidTool", {
          description: "Test",
          execute: null as any,
        }),
      ).toThrow("must have an execute function");
    });
  });

  describe("In-Memory MCP Server Registration", () => {
    it("should create in-memory MCP server from tools", () => {
      const tool = createTool({
        description: "Test tool",
        execute: () => "test result",
      });

      sdk.registerTool("testTool", tool);

      const inMemoryServers = sdk.getInMemoryServers();
      expect(inMemoryServers.size).toBe(1);
      expect(inMemoryServers.has("custom-tool-testTool")).toBe(true);

      const serverConfig = inMemoryServers.get("custom-tool-testTool");
      expect(serverConfig?.server.title).toBe("Custom Tool: testTool");
      expect(serverConfig?.server.tools).toHaveProperty("testTool");
    });

    it("should add custom MCP server directly", async () => {
      const serverConfig = {
        server: {
          title: "Test Server",
          tools: {
            customTool: {
              description: "Custom MCP tool",
              execute: async (params: any) => ({
                success: true,
                data: { message: "Hello from MCP" },
              }),
            },
          },
        },
        category: "test",
      };

      await sdk.addInMemoryMCPServer("test-server", serverConfig);

      const inMemoryServers = sdk.getInMemoryServers();
      expect(inMemoryServers.has("test-server")).toBe(true);
    });
  });

  describe("Tool Execution", () => {
    it("should execute a registered tool directly", async () => {
      const tool = createTool({
        description: "Echo tool",
        execute: (args: { message: string }) => `Echo: ${args.message}`,
      });

      sdk.registerTool("echoTool", tool);

      const result = await sdk.executeTool("echoTool", { message: "Hello" });
      expect(result).toBe("Echo: Hello");
    });

    it("should execute a tool with parameters", async () => {
      const tool = createTypedTool({
        description: "Calculator",
        parameters: z.object({
          a: z.number(),
          b: z.number(),
        }),
        execute: ({ a, b }) => a + b,
      });

      sdk.registerTool("calculator", tool);

      const result = await sdk.executeTool("calculator", { a: 5, b: 3 });
      expect(result).toBe(8);
    });

    it("should execute MCP server tools", async () => {
      await sdk.addInMemoryMCPServer("math-server", {
        server: {
          title: "Math Server",
          tools: {
            multiply: {
              description: "Multiply two numbers",
              execute: async ({ a, b }: { a: number; b: number }) => ({
                success: true,
                data: a * b,
              }),
            },
          },
        },
      });

      const result = await sdk.executeTool("multiply", { a: 4, b: 7 });
      expect(result).toBe(28);
    });

    it("should return error for non-existent tool", async () => {
      const result = await sdk.executeTool("nonExistentTool");
      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
      expect(result.error).toContain("not found");
    });
  });

  describe("Tool Discovery", () => {
    it("should list all available tools", async () => {
      // Register custom tools
      sdk.registerTool(
        "tool1",
        createTool({
          description: "Tool 1",
          execute: () => {},
        }),
      );

      sdk.registerTool(
        "tool2",
        createTool({
          description: "Tool 2",
          execute: () => {},
        }),
      );

      // Add MCP server
      await sdk.addInMemoryMCPServer("test-server", {
        server: {
          title: "Test Server",
          tools: {
            serverTool: {
              description: "Server tool",
              execute: async () => ({ success: true, data: {} }),
            },
          },
        },
      });

      const tools = await sdk.getAllAvailableTools();

      // Should have both custom tools and server tools
      const toolNames = tools.map((t) => t.toolName);
      expect(toolNames).toContain("tool1");
      expect(toolNames).toContain("tool2");
      expect(toolNames).toContain("serverTool");
    });
  });
});
