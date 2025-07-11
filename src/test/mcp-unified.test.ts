/**
 * NeuroLink Unified MCP System Tests
 * Comprehensive test suite for the unified MCP system combining internal and external servers
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import {
  UnifiedMCPSystem,
  initializeMCP,
  getMCPSystem,
  MCPUtils,
  createMCPServer,
  ExternalMCPClient,
  createExternalMCPClient,
} from "../lib/mcp/index.js";
import type {
  NeuroLinkExecutionContext,
  ExternalMCPServerConfig,
} from "../lib/mcp/index.js";
import { writeFile, unlink } from "fs/promises";
import { resolve } from "path";

// Test configuration
const TEST_CONFIG_PATH = ".mcp-config.test.json";
const TEST_SESSION_ID = "test-session-unified";

// Mock MCP config for testing
const TEST_MCP_CONFIG = {
  mcpServers: {
    filesystem: {
      name: "filesystem",
      command: "echo",
      args: [
        '{"jsonrpc":"2.0","result":{"tools":[{"name":"read_file","description":"Read a file"}]}}',
      ],
      transport: "stdio" as const,
    },
  },
  autoDiscovery: {
    enabled: false,
    autoRegister: false,
  },
  defaultRegistry: {
    enabled: true,
    includeBuiltInTools: true,
  },
};

// Test context
const testContext: NeuroLinkExecutionContext = {
  sessionId: TEST_SESSION_ID,
  userId: "test-user",
  aiProvider: "openai",
  modelId: "gpt-4",
  timestamp: Date.now(),
};

describe("Unified MCP System", () => {
  let unifiedSystem: UnifiedMCPSystem;

  beforeAll(async () => {
    // Create test config file
    await writeFile(
      resolve(TEST_CONFIG_PATH),
      JSON.stringify(TEST_MCP_CONFIG, null, 2),
    );
  });

  afterAll(async () => {
    // Cleanup
    try {
      await unlink(resolve(TEST_CONFIG_PATH));
    } catch (error) {
      // Ignore cleanup errors
    }

    // Shutdown unified system
    if (unifiedSystem) {
      await unifiedSystem.shutdown();
    }
  });

  beforeEach(() => {
    // Reset system for each test
    unifiedSystem = new UnifiedMCPSystem({
      configPath: TEST_CONFIG_PATH,
      enableExternalServers: false, // Disable for most tests
      enableInternalServers: true,
      autoInitialize: false,
    });
  });

  describe("System Initialization", () => {
    it("should initialize with internal servers only", async () => {
      await unifiedSystem.initialize();

      expect(unifiedSystem.isSystemInitialized()).toBe(true);

      const status = unifiedSystem.getStatus();
      expect(status.isInitialized).toBe(true);
      expect(status.internalServers.count).toBeGreaterThan(0);
      expect(status.internalServers.tools).toBeGreaterThan(0);
      expect(status.totalTools).toBeGreaterThan(0);
    });

    it("should list internal tools correctly", async () => {
      await unifiedSystem.initialize();

      const tools = unifiedSystem.listTools();
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);

      // Should have AI core server tools
      const aiTools = tools.filter(
        (tool) => tool.server === "neurolink-ai-core",
      );
      expect(aiTools.length).toBeGreaterThan(0);

      // Check for specific AI tools
      const generateTextTool = tools.find(
        (tool) => tool.name === "generate-text",
      );
      expect(generateTextTool).toBeDefined();
      expect(generateTextTool?.description).toContain("Generate text");
    });

    it("should execute internal tools successfully", async () => {
      await unifiedSystem.initialize();

      // Test provider selection tool (should work without actual AI providers)
      const result = await unifiedSystem.executeTool(
        "select-provider",
        { preferred: "openai" },
        testContext,
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.metadata?.toolName).toBe("select-provider");
      expect(result.metadata?.serverId).toBe("neurolink-ai-core");
    });
  });

  describe("Factory Pattern Integration", () => {
    it("should create custom MCP servers", () => {
      const customServer = createMCPServer({
        id: "test-server",
        title: "Test Server",
        description: "Server for testing",
        category: "custom",
      });

      expect(customServer.id).toBe("test-server");
      expect(customServer.title).toBe("Test Server");
      expect(customServer.category).toBe("custom");
      expect(Object.keys(customServer.tools)).toHaveLength(0);
    });

    it("should register custom tools with servers", async () => {
      const customServer = createMCPServer({
        id: "test-custom",
        title: "Custom Test Server",
        category: "custom",
      });

      customServer.register({
        name: "test-tool",
        description: "A test tool",
        execute: async (params, context) => ({
          success: true,
          data: {
            message: "Test successful",
            params,
            sessionId: context.sessionId,
          },
        }),
        isImplemented: true,
      });

      expect(Object.keys(customServer.tools)).toHaveLength(1);
      expect(customServer.tools["test-tool"]).toBeDefined();

      // Test tool execution
      const result = await customServer.tools["test-tool"].execute(
        { input: "test" },
        testContext,
      );

      expect(result.success).toBe(true);
      expect(result.data.message).toBe("Test successful");
      expect(result.data.sessionId).toBe(TEST_SESSION_ID);
    });
  });

  describe("Registry Integration", () => {
    it("should register and execute tools through registry", async () => {
      await unifiedSystem.initialize();

      const registry = unifiedSystem.getRegistry();
      expect(registry).toBeDefined();

      const stats = registry.getStats();
      expect(stats.totalServers).toBeGreaterThan(0);
      expect(stats.totalTools).toBeGreaterThan(0);
    });

    it("should find tools by different criteria", async () => {
      await unifiedSystem.initialize();

      // Find tools by server
      const aiTools = unifiedSystem.listTools({
        serverId: "neurolink-ai-core",
      });
      expect(aiTools.length).toBeGreaterThan(0);

      // Find tools by category
      const providerTools = unifiedSystem.listTools({
        category: "provider-management",
      });
      expect(providerTools.length).toBeGreaterThan(0);

      // Find specific tool
      const toolInfo = unifiedSystem.getToolInfo("generate-text");
      expect(toolInfo).toBeDefined();
      expect(toolInfo?.tool.name).toBe("generate-text");
    });
  });

  describe("MCPUtils Integration", () => {
    it("should initialize ecosystem successfully", async () => {
      const result = await MCPUtils.initializeEcosystem(TEST_CONFIG_PATH);

      expect(result.success).toBe(true);
      expect(result.system).toBeDefined();
      expect(result.status.isInitialized).toBe(true);
      expect(result.message).toContain("tools");

      // Store system for later tests
      unifiedSystem = result.system;
    });

    it("should get ecosystem status", () => {
      const status = MCPUtils.getEcosystemStatus();

      expect(status.isInitialized).toBe(true);
      expect(status.totalTools).toBeGreaterThan(0);
      expect(status.internalServers.count).toBeGreaterThan(0);
    });

    it("should list all available tools", () => {
      const result = MCPUtils.getAllAvailableTools();

      expect(result.totalTools).toBeGreaterThan(0);
      expect(result.servers).toContain("neurolink-ai-core");
      expect(result.toolsByServer["neurolink-ai-core"]).toBeDefined();
      expect(result.toolsByServer["neurolink-ai-core"].length).toBeGreaterThan(
        0,
      );
    });

    it("should test connectivity successfully", async () => {
      const result = await MCPUtils.testConnectivity();

      expect(result.status).toBe("ok");
      expect(result.message).toContain("tools");
      expect(result.details.internal.count).toBeGreaterThan(0);
    });

    it("should execute tools through utils", async () => {
      const result = await MCPUtils.executeTool(
        "check-provider-status",
        { includeCapabilities: true },
        { sessionId: "utils-test" },
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.metadata?.toolName).toBe("check-provider-status");
    });

    it("should get comprehensive statistics", () => {
      const stats = MCPUtils.getStatistics();

      expect(stats.ecosystem.initialized).toBe(true);
      expect(stats.ecosystem.totalTools).toBeGreaterThan(0);
      expect(stats.internal.count).toBeGreaterThan(0);
      expect(stats.tools.byServer).toBeDefined();
      expect(stats.registry).toBeDefined();
    });

    it("should create sessions with MCP support", async () => {
      const session = await MCPUtils.createSession("test-session", {
        userId: "test-user",
        aiProvider: "openai",
      });

      expect(session.sessionId).toBe("test-session");
      expect(session.context.userId).toBe("test-user");
      expect(session.availableTools).toBeGreaterThan(0);
      expect(typeof session.execute).toBe("function");

      // Test session execution
      const result = await session.execute("check-provider-status", {});
      expect(result.success).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle missing tools gracefully", async () => {
      await unifiedSystem.initialize();

      const result = await unifiedSystem.executeTool(
        "non-existent-tool",
        {},
        testContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("should handle invalid tool parameters", async () => {
      await unifiedSystem.initialize();

      // Test with invalid parameters
      const result = await unifiedSystem.executeTool(
        "generate-text",
        {}, // Missing required 'prompt' parameter
        testContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should handle system not initialized", async () => {
      const result = await MCPUtils.testConnectivity();

      if (!unifiedSystem?.isSystemInitialized()) {
        expect(result.status).toBe("not_initialized");
        expect(result.message).toContain("not initialized");
      }
    });
  });

  describe("External MCP Client (Unit Tests)", () => {
    it("should create external MCP client configuration", () => {
      const config: ExternalMCPServerConfig = {
        name: "test-external",
        command: "echo",
        args: ["test"],
        transport: "stdio",
      };

      const client = createExternalMCPClient(config);
      expect(client).toBeDefined();
      expect(client.getServerInfo().name).toBe("test-external");
      expect(client.getServerInfo().command).toBe("echo");
      expect(client.getServerInfo().transport).toBe("stdio");
    });

    it("should handle external client initialization", () => {
      const client = createExternalMCPClient({
        name: "test-client",
        command: "echo",
        args: ["hello"],
        transport: "stdio",
      });

      expect(client.isConnectedToServer()).toBe(false);

      const info = client.getServerInfo();
      expect(info.name).toBe("test-client");
      expect(info.isConnected).toBe(false);
      expect(info.toolCount).toBe(0);
    });
  });

  describe("System Lifecycle", () => {
    it("should shutdown gracefully", async () => {
      await unifiedSystem.initialize();
      expect(unifiedSystem.isSystemInitialized()).toBe(true);

      await unifiedSystem.shutdown();
      expect(unifiedSystem.isSystemInitialized()).toBe(false);
    });

    it("should handle multiple initializations", async () => {
      await unifiedSystem.initialize();
      const status1 = unifiedSystem.getStatus();

      // Initialize again - should not cause issues
      await unifiedSystem.initialize();
      const status2 = unifiedSystem.getStatus();

      expect(status1.totalTools).toBe(status2.totalTools);
      expect(status1.internalServers.count).toBe(status2.internalServers.count);
    });
  });
});

/**
 * Integration test for the default unified MCP system
 */
describe("Default Unified MCP System Integration", () => {
  it("should access default system", () => {
    const system = getMCPSystem();
    expect(system).toBeDefined();
    expect(system).toBeInstanceOf(UnifiedMCPSystem);
  });

  it("should initialize default system through initializeMCP", async () => {
    const system = await initializeMCP({
      configPath: TEST_CONFIG_PATH,
      enableExternalServers: false,
      enableInternalServers: true,
    });

    expect(system.isSystemInitialized()).toBe(true);
    const status = system.getStatus();
    expect(status.totalTools).toBeGreaterThan(0);

    // Cleanup
    await system.shutdown();
  });
});
