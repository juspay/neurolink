/**
 * NeuroLink Dynamic Orchestrator Tests
 * Comprehensive test suite for AI-driven dynamic tool chains
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  DynamicOrchestrator,
  type ToolDecision,
  type DynamicToolChainResult,
} from "../lib/mcp/dynamic-orchestrator.js";
import { MCPToolRegistry } from "../lib/mcp/tool-registry.js";
import { ContextManager } from "../lib/mcp/context-manager.js";
import { SemaphoreManager } from "../lib/mcp/semaphore-manager.js";
import { SessionManager } from "../lib/mcp/session-manager.js";
import {
  ErrorManager,
  ErrorCategory,
  ErrorSeverity,
} from "../lib/mcp/error-manager.js";
import { aiCoreServer } from "../lib/mcp/servers/ai-providers/ai-core-server.js";

describe("DynamicOrchestrator", () => {
  let dynamicOrchestrator: DynamicOrchestrator;
  let mockRegistry: MCPToolRegistry;
  let mockContextManager: ContextManager;
  let mockSemaphoreManager: SemaphoreManager;
  let mockSessionManager: SessionManager;
  let mockErrorManager: ErrorManager;
  let originalTools: any;

  beforeEach(() => {
    mockRegistry = new MCPToolRegistry();
    mockContextManager = new ContextManager();
    mockSemaphoreManager = new SemaphoreManager();
    mockSessionManager = new SessionManager();
    mockErrorManager = new ErrorManager();

    // Mock registry methods
    vi.spyOn(mockRegistry, "registerServer").mockResolvedValue();
    vi.spyOn(mockRegistry, "listTools").mockResolvedValue([
      {
        name: "search-code",
        description: "Search code files",
        serverId: "dev-tools",
        category: "search",
      },
      {
        name: "read-file",
        description: "Read file contents",
        serverId: "dev-tools",
        category: "file",
      },
      {
        name: "analyze-code",
        description: "Analyze code quality",
        serverId: "dev-tools",
        category: "analysis",
      },
    ]);

    vi.spyOn(mockRegistry, "executeTool").mockImplementation(
      async (toolName, args) => {
        // Mock tool execution results
        switch (toolName) {
          case "search-code":
            return { matches: ["file1.js:10", "file2.js:25"], count: 2 };
          case "read-file":
            return { content: "function calculateTotal() { return 42; }" };
          case "analyze-code":
            return { quality: "good", issues: 0 };
          default:
            throw new Error(`Unknown tool: ${toolName}`);
        }
      },
    );

    // Mock AI Core Server's generate tool
    const mockGenerate = {
      name: "generate",
      description: "Generate text using AI",
      category: "text-generation",
      inputSchema: {} as any,
      isImplemented: true,
      execute: vi.fn().mockImplementation(async (params) => {
        // Simulate AI decisions based on prompt
        if (params.prompt.includes("Select the next tool")) {
          // Return different decisions based on previous results
          const previousResults = params.systemPrompt || "";
          console.log(
            "Mock called with systemPrompt:",
            previousResults.slice(0, 200),
          );

          // Track iteration based on result content
          const iterationCount = (previousResults.match(/Result \d+:/g) || [])
            .length;
          console.log("Iteration count:", iterationCount);

          if (iterationCount === 0) {
            // First iteration - search for code
            return {
              success: true,
              data: {
                text: JSON.stringify({
                  toolName: "search-code",
                  args: { query: "calculateTotal", path: "/src" },
                  reasoning: "Need to find the calculateTotal function first",
                  confidence: 0.9,
                  shouldContinue: true,
                }),
              },
            };
          } else if (iterationCount === 1) {
            // Second iteration - read the file
            return {
              success: true,
              data: {
                text: JSON.stringify({
                  toolName: "read-file",
                  args: { path: "file1.js" },
                  reasoning: "Found matches, now reading the file",
                  confidence: 0.85,
                  shouldContinue: true,
                }),
              },
            };
          } else if (iterationCount === 2) {
            // Third iteration - analyze the code
            return {
              success: true,
              data: {
                text: JSON.stringify({
                  toolName: "analyze-code",
                  args: { path: "file1.js" },
                  reasoning: "Now analyzing the code quality",
                  confidence: 0.8,
                  shouldContinue: false,
                }),
              },
            };
          } else {
            // Default case - should not happen but stop execution
            return {
              success: true,
              data: {
                text: JSON.stringify({
                  toolName: "list-tools",
                  args: {},
                  reasoning: "No more actions needed",
                  confidence: 0.5,
                  shouldContinue: false,
                }),
              },
            };
          }
        }

        // Final summary generation
        return {
          success: true,
          data: {
            text: "Found and analyzed the calculateTotal function. It returns 42 and has good code quality.",
          },
        };
      }),
    };

    // Mock context manager methods
    vi.spyOn(mockContextManager, "createContext").mockResolvedValue({
      sessionId: "test-session-123",
      userId: "test-user",
      aiProvider: "test-provider",
    } as any);

    vi.spyOn(mockContextManager, "getContext").mockReturnValue({
      sessionId: "test-session-123",
      userId: "test-user",
      aiProvider: "test-provider",
    } as any);

    // Mock session manager methods
    vi.spyOn(mockSessionManager, "createSession").mockResolvedValue({
      id: "test-session-123",
      context: {
        sessionId: "test-session-123",
        userId: "test-user",
        aiProvider: "test-provider",
      },
      toolHistory: [],
      state: new Map(),
      createdAt: Date.now(),
      lastActivity: Date.now(),
    } as any);

    // Store original tools to restore later
    originalTools = aiCoreServer.tools;
    // Mock the AI core server tools
    aiCoreServer.tools = {
      generate: mockGenerate as any,
    };

    // Mock error manager methods
    vi.spyOn(mockErrorManager, "recordError").mockImplementation(async () => ({
      id: "test-error",
      timestamp: Date.now(),
      error: new Error("test error"),
      category: "TOOL_ERROR" as any,
      severity: "HIGH" as any,
      context: {},
    }));

    // Create dynamic orchestrator with all managers
    dynamicOrchestrator = new DynamicOrchestrator(
      mockRegistry,
      mockContextManager,
      mockSemaphoreManager,
      mockSessionManager,
      mockErrorManager,
    );
  });

  afterEach(() => {
    // Restore original tools to prevent side effects
    aiCoreServer.tools = originalTools;
    vi.restoreAllMocks();
  });

  describe("Dynamic Tool Chain Execution", () => {
    it("should execute a complete tool chain based on AI decisions", async () => {
      let result;
      try {
        result = await dynamicOrchestrator.executeDynamicToolChain(
          "Find and analyze the calculateTotal function",
        );

        // Debug logging
        if (!result.success) {
          console.error("Test failed with error:", result.error?.message);
          console.error("Results:", result.results);
          console.error("Decisions:", result.decisions);
        }

        expect(result.success).toBe(true);
        expect(result.iterations).toBe(3);
        expect(result.results).toHaveLength(3);
        expect(result.decisions).toHaveLength(3);
        expect(result.finalOutput).toContain("calculateTotal");
        expect(result.finalOutput).toContain("42");
      } catch (error) {
        console.error("Test threw error:", error);
        throw error;
      }

      // Verify tool execution order
      expect(result.results[0].metadata?.toolName).toBe("search-code");
      expect(result.results[1].metadata?.toolName).toBe("read-file");
      expect(result.results[2].metadata?.toolName).toBe("analyze-code");

      // Verify decisions
      expect(result.decisions[0].toolName).toBe("search-code");
      expect(result.decisions[0].confidence).toBe(0.9);
      expect(result.decisions[1].toolName).toBe("read-file");
      expect(result.decisions[2].shouldContinue).toBe(false);
    });

    it("should stop execution on low confidence", async () => {
      // Mock low confidence response
      const mockGenerate = aiCoreServer.tools["generate"];
      vi.mocked(mockGenerate.execute).mockResolvedValueOnce({
        success: true,
        data: {
          text: JSON.stringify({
            toolName: "unknown-tool",
            args: {},
            reasoning: "Not sure what to do",
            confidence: 0.3, // Below default threshold
            shouldContinue: true,
          }),
        },
      });

      const result = await dynamicOrchestrator.executeDynamicToolChain(
        "Do something unclear",
        {},
        { requireConfidence: 0.7, includeReasoning: false },
      );

      expect(result.success).toBe(true);
      expect(result.iterations).toBe(1);
      expect(result.results).toHaveLength(0); // No tools executed
      expect(result.decisions).toHaveLength(0); // Decision not added when includeReasoning is false
    });

    it("should handle tool execution errors gracefully", async () => {
      // Make a tool fail
      vi.spyOn(mockRegistry, "executeTool").mockRejectedValueOnce(
        new Error("Tool failed"),
      );

      const result = await dynamicOrchestrator.executeDynamicToolChain(
        "Find and analyze code",
      );

      expect(result.success).toBe(true);
      expect(result.iterations).toBeGreaterThan(0);

      // Should have an error result
      const errorResult = result.results.find((r) => !r.success);
      expect(errorResult).toBeDefined();
      expect(errorResult?.error).toBeInstanceOf(Error);
      expect((errorResult?.error as Error)?.message).toBe("Tool failed");
    });

    it("should respect max iterations limit", async () => {
      // Mock AI to always continue
      const mockGenerate = aiCoreServer.tools["generate"];
      vi.mocked(mockGenerate.execute).mockResolvedValue({
        success: true,
        data: {
          text: JSON.stringify({
            toolName: "search-code",
            args: { query: "test" },
            reasoning: "Keep searching",
            confidence: 0.8,
            shouldContinue: true, // Always continue
          }),
        },
      });

      const result = await dynamicOrchestrator.executeDynamicToolChain(
        "Keep searching forever",
        {},
        { maxIterations: 3 },
      );

      expect(result.success).toBe(true);
      expect(result.iterations).toBe(3);
      expect(result.results).toHaveLength(3);
    });

    it("should handle AI decision parsing errors", async () => {
      // Mock invalid AI response
      const mockGenerate = aiCoreServer.tools["generate"];
      vi.mocked(mockGenerate.execute).mockResolvedValueOnce({
        success: true,
        data: {
          text: "This is not valid JSON",
        },
      });

      const result = await dynamicOrchestrator.executeDynamicToolChain(
        "Test invalid response",
        {},
        { includeReasoning: true, requireConfidence: 0.4 },
      );

      console.log("Result:", JSON.stringify(result, null, 2));

      // Should fall back to default tool
      expect(result.success).toBe(true);
      expect(result.decisions[0]?.toolName).toBe("list-tools");
      expect(result.decisions[0]?.confidence).toBe(0.5);
      expect(result.decisions[0]?.shouldContinue).toBe(false);
    });

    it("should include reasoning when enabled", async () => {
      const result = await dynamicOrchestrator.executeDynamicToolChain(
        "Test with reasoning",
        {},
        { includeReasoning: true },
      );

      expect(result.decisions.length).toBeGreaterThan(0);
      result.decisions.forEach((decision) => {
        expect(decision.reasoning).toBeDefined();
        expect(decision.reasoning.length).toBeGreaterThan(0);
      });
    });

    it("should exclude reasoning when disabled", async () => {
      const result = await dynamicOrchestrator.executeDynamicToolChain(
        "Test without reasoning",
        {},
        { includeReasoning: false },
      );

      expect(result.decisions).toHaveLength(0);
    });
  });

  describe("Parallel Dynamic Chains", () => {
    it("should execute multiple chains in parallel when enabled", async () => {
      const prompts = ["Find function A", "Find function B", "Find function C"];

      const results = await dynamicOrchestrator.executeParallelDynamicChains(
        prompts,
        {},
        { allowParallel: true, maxIterations: 2 },
      );

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.success).toBe(true);
        expect(result.iterations).toBeGreaterThan(0);
      });
    });

    it("should throw error when parallel not enabled", async () => {
      await expect(
        dynamicOrchestrator.executeParallelDynamicChains(
          ["prompt1", "prompt2"],
          {},
          { allowParallel: false },
        ),
      ).rejects.toThrow("Parallel execution not enabled");
    });
  });

  describe("Custom System Prompts", () => {
    it("should use custom system prompt when provided", async () => {
      const customPrompt =
        "You are a specialized code analyzer. Always select analyze-code first.";

      // Mock to verify custom prompt is used
      const mockGenerate = aiCoreServer.tools["generate"] as any;
      const executeSpy = vi.mocked(mockGenerate.execute);

      await dynamicOrchestrator.executeDynamicToolChain(
        "Analyze something",
        {},
        { customSystemPrompt: customPrompt },
      );

      // Verify custom prompt was passed
      expect(executeSpy).toHaveBeenCalled();
      const call = executeSpy.mock.calls[0];
      expect(call[0].systemPrompt).toContain(customPrompt);
    });
  });

  describe("Error Handling", () => {
    it("should handle orchestrator-level errors", async () => {
      // Reset any previous mocks
      vi.restoreAllMocks();

      // Mock context creation failure
      vi.spyOn(mockContextManager, "createContext").mockRejectedValueOnce(
        new Error("Context creation failed"),
      );

      const result =
        await dynamicOrchestrator.executeDynamicToolChain("Test error");

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe("Context creation failed");
      expect(result.iterations).toBe(0);
    });

    it("should record errors in error manager", async () => {
      // Mock error manager
      const recordErrorSpy = vi.spyOn(
        dynamicOrchestrator["errorManager"],
        "recordError",
      );

      // Force an error
      vi.spyOn(mockRegistry, "listTools").mockRejectedValueOnce(
        new Error("Registry error"),
      );

      await dynamicOrchestrator.executeDynamicToolChain("Test error recording");

      expect(recordErrorSpy).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          category: ErrorCategory.TOOL_ERROR,
          severity: ErrorSeverity.HIGH,
          toolName: "dynamic-orchestrator",
        }),
      );
    });
  });

  describe("Statistics", () => {
    it("should include dynamic orchestrator features in stats", () => {
      const stats = dynamicOrchestrator.getStats();

      expect(stats.dynamicOrchestrator).toBeDefined();
      expect(stats.dynamicOrchestrator.features).toEqual({
        aiToolSelection: true,
        iterativeExecution: true,
        parallelSupport: true,
        reasoningCapture: true,
      });
    });
  });
});
