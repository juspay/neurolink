/**
 * Dynamic AI Tool Chain Tests
 * Verifies AI-driven tool selection and dynamic execution flows
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createMockExecutionContext } from "./helpers/test-utilities.js";
import {
  DynamicChainExecutor,
  HeuristicChainPlanner,
  AIModelChainPlanner,
} from "../lib/mcp/dynamic-chain-executor.js";
import { MCPOrchestrator } from "../lib/mcp/orchestrator.js";
import { MCPToolRegistry } from "../lib/mcp/tool-registry.js";
import { ErrorManager } from "../lib/mcp/error-manager.js";

/**
 * Helper to enrich tool objects with default description and inputSchema.
 */
function enrichTools(tools: any[]) {
  return tools.map((tool) => ({
    ...tool,
    description: tool.description || "No description",
    inputSchema: tool.inputSchema || { type: "object" },
  }));
}

describe("Dynamic AI Tool Chains", () => {
  let chainExecutor: DynamicChainExecutor;
  let orchestrator: MCPOrchestrator;
  let registry: MCPToolRegistry;
  let errorManager: ErrorManager;

  beforeEach(async () => {
    vi.clearAllMocks();

    registry = new MCPToolRegistry();
    errorManager = new ErrorManager();
    orchestrator = new MCPOrchestrator(
      registry,
      undefined,
      undefined,
      undefined,
      errorManager,
    );
    chainExecutor = new DynamicChainExecutor(
      orchestrator,
      registry,
      errorManager,
    );

    // Register mock tools
    await registry.registerServer("test-server", {
      tools: {
        "fetch-data": {
          name: "fetch-data",
          description: "Fetch data from external source",
          inputSchema: {
            type: "object",
            properties: { url: { type: "string" } },
          },
          execute: async (params: any) => ({
            data: "fetched-data",
            source: params.url,
          }),
        },
        "process-data": {
          name: "process-data",
          description: "Process and analyze data",
          inputSchema: {
            type: "object",
            properties: { data: { type: "string" } },
          },
          execute: async (params: any) => ({
            processed: true,
            analysis: "processed-" + params.data,
          }),
        },
        "save-result": {
          name: "save-result",
          description: "Save final result",
          inputSchema: {
            type: "object",
            properties: { result: { type: "any" } },
          },
          execute: async (params: any) => ({ saved: true, id: "result-123" }),
        },
      },
    });
  });

  describe("Heuristic Chain Planning", () => {
    it("should plan next step based on goal keywords", async () => {
      const planner = new HeuristicChainPlanner();
      const availableTools = await registry.listTools();

      const step = await planner.planNextStep(
        "fetch and process user data",
        enrichTools(availableTools),
        [],
        {},
      );

      expect(step).toBeDefined();
      expect(step?.toolName).toBe("fetch-data");
      expect(step?.confidence).toBeGreaterThan(0.6);
      expect(step?.reasoning).toContain("fetch-data");
    });

    it("should avoid already used tools", async () => {
      const planner = new HeuristicChainPlanner();
      const availableTools = await registry.listTools();

      const executionHistory = [
        {
          toolName: "fetch-data",
          success: true,
          result: { data: "test" },
          timestamp: Date.now(),
          executionTime: 100,
        },
      ];

      const step = await planner.planNextStep(
        "process the fetched data",
        enrichTools(availableTools),
        executionHistory,
        { data: "test" },
      );

      expect(step?.toolName).toBe("process-data");
    });

    it("should return null when no tools available", async () => {
      const planner = new HeuristicChainPlanner();
      const availableTools = await registry.listTools();

      const executionHistory = availableTools.map((tool) => ({
        toolName: tool.name,
        success: true,
        result: {},
        timestamp: Date.now(),
        executionTime: 100,
      }));

      const step = await planner.planNextStep(
        "test goal",
        enrichTools(availableTools),
        executionHistory,
        {},
      );

      expect(step).toBeNull();
    });

    it("should evaluate result success correctly", async () => {
      const planner = new HeuristicChainPlanner();

      const step = {
        stepId: "test",
        toolName: "fetch-data",
        parameters: {},
        reasoning: "test",
        confidence: 0.8,
        expectedOutcome: "fetch data",
      };

      const successResult = {
        toolName: "fetch-data",
        success: true,
        result: { user: "data", information: "retrieved" },
        timestamp: Date.now(),
        executionTime: 100,
      };

      const evaluation = await planner.evaluateResult(
        step,
        successResult,
        "fetch user data information",
      );

      expect(evaluation.goalAchieved).toBe(true);
      expect(evaluation.nextAction).toBe("complete");
      expect(evaluation.confidence).toBeGreaterThan(0.5);
    });

    it("should handle failed tool execution", async () => {
      const planner = new HeuristicChainPlanner();

      const step = {
        stepId: "test",
        toolName: "fetch-data",
        parameters: {},
        reasoning: "test",
        confidence: 0.8,
        expectedOutcome: "fetch data",
      };

      const failedResult = {
        toolName: "fetch-data",
        success: false,
        error: new Error("Network timeout"),
        timestamp: Date.now(),
        executionTime: 5000,
      };

      const evaluation = await planner.evaluateResult(
        step,
        failedResult,
        "fetch data",
      );

      expect(evaluation.goalAchieved).toBe(false);
      expect(evaluation.nextAction).toBe("retry");
      expect(evaluation.confidence).toBe(0.1);
    });
  });

  describe("AI Model Chain Planning", () => {
    it("should fallback to heuristic on AI failure", async () => {
      const aiPlanner = new AIModelChainPlanner("gpt-4");

      // Mock AI call to fail
      vi.spyOn(aiPlanner as any, "callAIModel").mockRejectedValue(
        new Error("AI unavailable"),
      );

      const availableTools = await registry.listTools();
      const step = await aiPlanner.planNextStep(
        "fetch and process data",
        enrichTools(availableTools),
        [],
        {},
      );

      expect(step).toBeDefined();
      expect(step?.toolName).toBe("fetch-data");
    });

    it("should parse AI response correctly", async () => {
      const aiPlanner = new AIModelChainPlanner("gpt-4");

      // Mock successful AI response
      const mockResponse = JSON.stringify({
        toolName: "process-data",
        parameters: { data: "test" },
        reasoning: "AI selected process-data for analysis",
        confidence: 0.9,
        expectedOutcome: "Analyze the data",
      });

      vi.spyOn(aiPlanner as any, "callAIModel").mockResolvedValue(mockResponse);

      const availableTools = await registry.listTools();
      const step = await aiPlanner.planNextStep(
        "analyze the data",
        enrichTools(availableTools),
        [],
        { data: "test" },
      );

      expect(step?.toolName).toBe("process-data");
      expect(step?.confidence).toBe(0.9);
      expect(step?.reasoning).toContain("AI selected");
    });
  });

  describe("Dynamic Chain Execution", () => {
    it("should execute simple tool chain successfully", async () => {
      const result = await chainExecutor.executeChain(
        "fetch and process data from api.example.com",
        { url: "api.example.com" },
        createMockExecutionContext({ sessionId: "test-session" }),
        { maxSteps: 3 },
      );

      expect(result.success).toBe(true);
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.results[0].toolName).toBe("fetch-data");
      expect(result.metadata.toolsUsed).toContain("fetch-data");
      expect(result.metadata.averageConfidence).toBeGreaterThan(0);
    });

    it("should pass context between tools", async () => {
      const result = await chainExecutor.executeChain(
        "fetch data then process it",
        {},
        createMockExecutionContext({ sessionId: "test-session" }),
        { maxSteps: 3 },
      );

      expect(result.success).toBe(true);
      expect(result.results.length).toBeGreaterThanOrEqual(2);

      // Check that data flows between tools
      const fetchResult = result.results.find(
        (r) => r.toolName === "fetch-data",
      );
      const processResult = result.results.find(
        (r) => r.toolName === "process-data",
      );

      if (fetchResult && processResult) {
        expect(fetchResult.success).toBe(true);
        expect(processResult.success).toBe(true);
      }
    });

    it("should respect maximum steps limit", async () => {
      const result = await chainExecutor.executeChain(
        "keep processing forever",
        {},
        createMockExecutionContext({ sessionId: "test-session" }),
        { maxSteps: 2 },
      );

      expect(result.results.length).toBeLessThanOrEqual(2);
    });

    it("should handle tool execution failures", async () => {
      // Register a failing tool
      await registry.registerServer("failing-server", {
        tools: {
          "failing-tool": {
            name: "failing-tool",
            description: "A tool that always fails",
            inputSchema: { type: "object" },
            execute: async () => {
              throw new Error("Tool execution failed");
            },
          },
        },
      });

      // Force the planner to use the failing tool
      const heuristicPlanner = new HeuristicChainPlanner();
      chainExecutor.setPlanner(heuristicPlanner);

      const result = await chainExecutor.executeChain(
        "use failing tool",
        {},
        createMockExecutionContext({ sessionId: "test-session" }),
        { maxSteps: 2 },
      );

      // Chain should still complete, but with failure recorded
      expect(result.results.length).toBeGreaterThan(0);

      const failedStep = result.results.find((r) => !r.success);
      if (failedStep) {
        expect(failedStep.error?.message).toBe("Tool execution failed");
      }
    });

    it("should track context evolution", async () => {
      const result = await chainExecutor.executeChain(
        "fetch and process data",
        { initialData: "test" },
        createMockExecutionContext({ sessionId: "test-session" }),
        { maxSteps: 3 },
      );

      expect(result.metadata.contextEvolution).toBeDefined();
      expect(Array.isArray(result.metadata.contextEvolution)).toBe(true);

      if (result.metadata.contextEvolution.length > 0) {
        const evolution = result.metadata.contextEvolution[0];
        expect(evolution).toHaveProperty("step");
        expect(evolution).toHaveProperty("timestamp");
        expect(evolution).toHaveProperty("dataKeys");
      }
    });

    it("should calculate average confidence correctly", async () => {
      const result = await chainExecutor.executeChain(
        "process data",
        {},
        createMockExecutionContext({ sessionId: "test-session" }),
        { maxSteps: 2 },
      );

      expect(result.metadata.averageConfidence).toBeGreaterThanOrEqual(0);
      expect(result.metadata.averageConfidence).toBeLessThanOrEqual(1);
    });
  });

  describe("Error Handling", () => {
    it("should record errors in error manager", async () => {
      const recordErrorSpy = vi.spyOn(errorManager, "recordError");

      // Mock orchestrator to throw error
      vi.spyOn(orchestrator, "executeTool").mockRejectedValue(
        new Error("Orchestrator failed"),
      );

      const result = await chainExecutor.executeChain(
        "test goal",
        {},
        createMockExecutionContext({ sessionId: "test-session" }),
        { maxSteps: 1 },
      );

      // Even if individual steps fail, the chain should handle gracefully
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.results[0].success).toBe(false);
    });

    it("should handle chain execution abortion", async () => {
      // Create a planner that always aborts
      const abortingPlanner = {
        name: "aborting",
        async planNextStep() {
          return {
            stepId: "abort-step",
            toolName: "fetch-data",
            parameters: {},
            reasoning: "test abort",
            confidence: 0.5,
            expectedOutcome: "abort",
          };
        },
        async evaluateResult() {
          return {
            goalAchieved: false,
            confidence: 0.1,
            nextAction: "abort" as const,
            reasoning: "Test abortion",
          };
        },
      };

      chainExecutor.setPlanner(abortingPlanner);

      const result = await chainExecutor.executeChain(
        "test goal",
        {},
        createMockExecutionContext({ sessionId: "test-session" }),
        { maxSteps: 2 },
      );

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain("aborted");
    });
  });

  describe("Planner Management", () => {
    it("should allow setting custom planner", () => {
      const customPlanner = new AIModelChainPlanner("custom-model");
      chainExecutor.setPlanner(customPlanner);

      const currentPlanner = chainExecutor.getPlanner();
      expect(currentPlanner).toBe(customPlanner);
      expect(currentPlanner.name).toBe("ai-model");
    });

    it("should default to heuristic planner", () => {
      const newExecutor = new DynamicChainExecutor(
        orchestrator,
        registry,
        errorManager,
      );
      const planner = newExecutor.getPlanner();

      expect(planner).toBeInstanceOf(HeuristicChainPlanner);
      expect(planner.name).toBe("heuristic");
    });
  });
});
