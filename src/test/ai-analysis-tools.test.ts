/**
 * NeuroLink AI Analysis Tools Test Suite
 * Comprehensive testing for AI analysis and optimization tools
 * Tests: analyze-ai-usage, benchmark-provider-performance, optimize-prompt-parameters
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MCPToolRegistry } from "../lib/mcp/registry.js";
import {
  ContextManager,
  createExecutionContext,
} from "../lib/mcp/context-manager.js";
import { aiCoreServer } from "../lib/mcp/servers/ai-providers/ai-core-server.js";

describe("AI Analysis Tools Tests", () => {
  let registry: MCPToolRegistry;
  let contextManager: ContextManager;

  beforeEach(async () => {
    registry = new MCPToolRegistry();
    contextManager = new ContextManager();

    // Register AI Core Server with new tools (check if not already registered)
    try {
      await registry.registerServer(aiCoreServer);
    } catch (error) {
      // Server already registered, which is fine for testing
      if (
        !(error instanceof Error) ||
        !error.message?.includes("already registered")
      ) {
        throw error;
      }
    }
  });

  afterEach(() => {
    registry.clear();
    contextManager.clearAllContexts();
  });

  describe("AI Usage Analysis Tool", () => {
    it("should analyze AI usage patterns with default parameters", async () => {
      const context = createExecutionContext({
        userId: "test-user",
        environmentType: "development",
        permissions: ["read", "analytics"],
      });

      const result = await registry.executeTool(
        "analyze-ai-usage",
        {},
        context,
      );

      expect(result.success).toBe(true);
      expect(result.data.analysis).toBeDefined();
      expect(result.data.analysis.timeRange).toBe("24h"); // Default
      expect(result.data.analysis.totalRequests).toBeGreaterThan(0);
      expect(result.data.analysis.totalTokens).toBeGreaterThan(0);
      expect(result.data.analysis.providers).toBeDefined();
      expect(result.data.insights).toBeDefined();
      expect(result.data.insights.recommendations).toBeInstanceOf(Array);
      expect(result.metadata?.toolName).toBe("analyze-ai-usage");
      expect(result.metadata?.executionTime).toBeGreaterThanOrEqual(0);
    });

    it("should analyze specific provider usage", async () => {
      const context = createExecutionContext({
        aiProvider: "openai",
        permissions: ["read", "analytics"],
      });

      const result = await registry.executeTool(
        "analyze-ai-usage",
        {
          provider: "openai",
          timeRange: "7d",
          includeTokenBreakdown: true,
          includeCostEstimation: true,
        },
        context,
      );

      expect(result.success).toBe(true);
      expect(result.data.analysis.timeRange).toBe("7d");
      expect(result.data.analysis.providers.openai).toBeDefined();
      expect(result.data.analysis.providers.openai.requests).toBeGreaterThan(0);
      expect(result.data.analysis.providers.openai.tokens).toBeGreaterThan(0);
      expect(result.data.analysis.providers.openai.cost).toBeGreaterThanOrEqual(
        0,
      );
      expect(result.data.insights.avgCostPerToken).toBeGreaterThan(0);
    });

    it("should handle different time ranges", async () => {
      const context = createExecutionContext({
        permissions: ["read", "analytics"],
      });

      const timeRanges = ["1h", "24h", "7d", "30d"];

      for (const timeRange of timeRanges) {
        const result = await registry.executeTool(
          "analyze-ai-usage",
          { timeRange },
          context,
        );

        expect(result.success).toBe(true);
        expect(result.data.analysis.timeRange).toBe(timeRange);
      }
    });

    it("should validate input schema", async () => {
      const context = createExecutionContext({
        permissions: ["read", "analytics"],
      });

      // Test invalid provider
      const result = await registry.executeTool(
        "analyze-ai-usage",
        { provider: "invalid-provider" },
        context,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid enum value");
    });
  });

  describe("Provider Performance Benchmarking Tool", () => {
    it("should benchmark all available providers", async () => {
      const context = createExecutionContext({
        environmentType: "development",
        permissions: ["read", "benchmark"],
      });

      const result = await registry.executeTool(
        "benchmark-provider-performance",
        {
          iterations: 2,
          metrics: ["latency", "quality"],
        },
        context,
      );

      expect(result.success).toBe(true);
      expect(result.data.results).toBeInstanceOf(Array);
      expect(result.data.results.length).toBeGreaterThan(0);

      // Check first provider result structure
      const firstProvider = result.data.results[0];
      expect(firstProvider.provider).toBeDefined();
      expect(firstProvider.metrics.avgLatency).toBeGreaterThanOrEqual(0);
      expect(firstProvider.metrics.successRate).toBeGreaterThanOrEqual(0);
      expect(firstProvider.metrics.qualityScore).toBeGreaterThanOrEqual(0);
      expect(firstProvider.testResults).toBeInstanceOf(Array);

      // Check analysis
      expect(result.data.analysis.fastestProvider).toBeDefined();
      expect(result.data.analysis.mostCostEffective).toBeDefined();
      expect(result.data.analysis.highestQuality).toBeDefined();
      expect(result.data.analysis.recommendations).toBeInstanceOf(Array);

      expect(result.metadata?.toolName).toBe("benchmark-provider-performance");
    });

    it("should benchmark specific providers with custom prompts", async () => {
      const context = createExecutionContext({
        permissions: ["read", "benchmark"],
      });

      const result = await registry.executeTool(
        "benchmark-provider-performance",
        {
          providers: ["openai", "vertex"],
          testPrompts: ["Test prompt 1", "Test prompt 2"],
          iterations: 1,
          maxTokens: 50,
        },
        context,
      );

      expect(result.success).toBe(true);
      expect(result.data.results).toHaveLength(2);
      expect(result.data.testConfiguration.providers).toEqual([
        "openai",
        "vertex",
      ]);
      expect(result.data.testConfiguration.testPrompts).toBe(2);
      expect(result.data.testConfiguration.iterations).toBe(1);
    });

    it("should handle benchmark execution timing", async () => {
      const context = createExecutionContext({
        permissions: ["read", "benchmark"],
      });
      const startTime = Date.now();

      const result = await registry.executeTool(
        "benchmark-provider-performance",
        {
          providers: ["openai"],
          iterations: 1,
        },
        context,
      );

      const executionTime = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(result.usage?.executionTime).toBeGreaterThanOrEqual(0);
      expect(executionTime).toBeGreaterThan(0);

      // Should include test timing data
      const providerResult = result.data.results[0];
      expect(providerResult.testResults[0].latency).toBeGreaterThan(0);
    });

    it("should validate benchmark parameters", async () => {
      const context = createExecutionContext({
        permissions: ["read", "benchmark"],
      });

      // Test invalid provider
      const result = await registry.executeTool(
        "benchmark-provider-performance",
        { providers: ["invalid-provider"] },
        context,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid enum value");
    });
  });

  describe("Prompt Parameter Optimization Tool", () => {
    it("should optimize parameters for balanced style", async () => {
      const context = createExecutionContext({
        aiProvider: "openai",
        permissions: ["read", "optimize"],
      });

      const result = await registry.executeTool(
        "optimize-prompt-parameters",
        {
          prompt: "Write a short story about AI",
          style: "balanced",
          optimizeFor: "quality",
          iterations: 3,
        },
        context,
      );

      expect(result.success).toBe(true);
      expect(result.data.optimization.originalPrompt).toBe(
        "Write a short story about AI",
      );
      expect(result.data.optimization.style).toBe("balanced");
      expect(result.data.optimization.optimizeFor).toBe("quality");

      // Check optimization results
      expect(result.data.results).toHaveLength(3);
      expect(
        result.data.results[0].parameters.temperature,
      ).toBeGreaterThanOrEqual(0.5);
      expect(result.data.results[0].parameters.temperature).toBeLessThanOrEqual(
        0.8,
      );
      expect(
        result.data.results[0].parameters.maxTokens,
      ).toBeGreaterThanOrEqual(100);
      expect(result.data.results[0].parameters.maxTokens).toBeLessThanOrEqual(
        300,
      );

      // Check recommendations
      expect(result.data.recommendations.optimal).toBeDefined();
      expect(result.data.recommendations.optimal.temperature).toBeGreaterThan(
        0,
      );
      expect(result.data.recommendations.optimal.maxTokens).toBeGreaterThan(0);
      expect(result.data.recommendations.improvements).toBeInstanceOf(Array);
      expect(result.data.recommendations.alternatives).toHaveLength(2);

      expect(result.metadata?.toolName).toBe("optimize-prompt-parameters");
    });

    it("should optimize for different styles", async () => {
      const context = createExecutionContext({
        permissions: ["read", "optimize"],
      });
      const styles = ["creative", "balanced", "precise", "factual"];

      for (const style of styles) {
        const result = await registry.executeTool(
          "optimize-prompt-parameters",
          {
            prompt: "Test optimization",
            style,
            iterations: 2,
          },
          context,
        );

        expect(result.success).toBe(true);
        expect(result.data.optimization.style).toBe(style);
        expect(result.data.strategy.style).toBe(style);
        expect(result.data.strategy.focus).toBeDefined();

        // Verify parameters are within expected ranges for each style
        const optimal = result.data.recommendations.optimal;
        if (style === "creative") {
          expect(optimal.temperature).toBeGreaterThanOrEqual(0.7);
        } else if (style === "precise") {
          expect(optimal.temperature).toBeLessThanOrEqual(0.4);
        }
      }
    });

    it("should optimize for different targets", async () => {
      const context = createExecutionContext({
        permissions: ["read", "optimize"],
      });
      const targets = ["speed", "quality", "cost", "tokens"];

      for (const optimizeFor of targets) {
        const result = await registry.executeTool(
          "optimize-prompt-parameters",
          {
            prompt: "Test prompt",
            optimizeFor,
            iterations: 2,
          },
          context,
        );

        expect(result.success).toBe(true);
        expect(result.data.optimization.optimizeFor).toBe(optimizeFor);
      }
    });

    it("should validate optimization parameters", async () => {
      const context = createExecutionContext({
        permissions: ["read", "optimize"],
      });

      // Test invalid style
      const result1 = await registry.executeTool(
        "optimize-prompt-parameters",
        {
          prompt: "Test",
          style: "invalid-style",
        },
        context,
      );

      expect(result1.success).toBe(false);
      expect(result1.error).toContain("Invalid enum value");

      // Test missing prompt
      const result2 = await registry.executeTool(
        "optimize-prompt-parameters",
        {},
        context,
      );

      expect(result2.success).toBe(false);
      expect(result2.error).toContain("Required");
    });

    it("should track optimization performance", async () => {
      const context = createExecutionContext({
        permissions: ["read", "optimize"],
      });

      const result = await registry.executeTool(
        "optimize-prompt-parameters",
        {
          prompt: "Performance test prompt",
          iterations: 2,
        },
        context,
      );

      expect(result.success).toBe(true);
      expect(result.usage?.executionTime).toBeGreaterThanOrEqual(0);

      // Check that all iterations have performance metrics
      result.data.results.forEach((iteration: any) => {
        expect(iteration.metrics.qualityScore).toBeGreaterThanOrEqual(0.7);
        expect(iteration.metrics.relevanceScore).toBeGreaterThanOrEqual(0.8);
        expect(iteration.metrics.coherenceScore).toBeGreaterThanOrEqual(0.75);
        expect(iteration.metrics.efficiencyScore).toBeGreaterThanOrEqual(0.7);
        expect(iteration.metrics.estimatedCost).toBeGreaterThan(0);
        expect(iteration.metrics.estimatedLatency).toBeGreaterThan(0);
      });
    });
  });

  describe("Integration Tests: AI Analysis Tools", () => {
    it("should verify all AI analysis tools are registered in AI Core Server", () => {
      const toolNames = Object.keys(aiCoreServer.tools);

      // Original tools
      expect(toolNames).toContain("generate-text");
      expect(toolNames).toContain("select-provider");
      expect(toolNames).toContain("check-provider-status");

      // AI analysis tools
      expect(toolNames).toContain("analyze-ai-usage");
      expect(toolNames).toContain("benchmark-provider-performance");
      expect(toolNames).toContain("optimize-prompt-parameters");

      // Verify total count (3 original + 3 new = 6 tools)
      expect(toolNames).toHaveLength(6);
    });

    it("should execute all AI analysis tools through registry", async () => {
      const context = createExecutionContext({
        userId: "integration-test",
        environmentType: "development",
        permissions: ["read", "analytics", "benchmark", "optimize"],
      });

      // Test analyze-ai-usage
      const usageResult = await registry.executeTool(
        "analyze-ai-usage",
        { timeRange: "1h" },
        context,
      );
      expect(usageResult.success).toBe(true);

      // Test benchmark-provider-performance
      const benchmarkResult = await registry.executeTool(
        "benchmark-provider-performance",
        { iterations: 1 },
        context,
      );
      expect(benchmarkResult.success).toBe(true);

      // Test optimize-prompt-parameters
      const optimizeResult = await registry.executeTool(
        "optimize-prompt-parameters",
        { prompt: "Integration test prompt", iterations: 2 },
        context,
      );
      expect(optimizeResult.success).toBe(true);

      console.log("✅ All AI Analysis Tools executed successfully");
    });

    it("should verify tool schemas and metadata", () => {
      const tools = [
        "analyze-ai-usage",
        "benchmark-provider-performance",
        "optimize-prompt-parameters",
      ];

      tools.forEach((toolName) => {
        const toolInfo = registry.getToolInfo(toolName);
        expect(toolInfo).toBeDefined();
        expect(toolInfo?.tool.name).toBe(toolName);
        expect(toolInfo?.tool.description).toBeDefined();
        expect(toolInfo?.tool.inputSchema).toBeDefined();
        expect(toolInfo?.tool.isImplemented).toBe(true);
        expect(toolInfo?.tool.permissions).toBeDefined();
        expect(toolInfo?.tool.version).toBe("1.0.0");
        expect(toolInfo?.server.id).toBe("neurolink-ai-core");
      });
    });

    it("should validate Phase 1.1 performance requirements", async () => {
      const context = createExecutionContext({
        permissions: ["read", "analytics", "benchmark", "optimize"],
      });
      const startTime = Date.now();

      // Execute all three tools and measure total performance
      const results = await Promise.all([
        registry.executeTool("analyze-ai-usage", {}, context),
        registry.executeTool(
          "benchmark-provider-performance",
          { iterations: 1 },
          context,
        ),
        registry.executeTool(
          "optimize-prompt-parameters",
          { prompt: "Performance test", iterations: 2 },
          context,
        ),
      ]);

      const totalExecutionTime = Date.now() - startTime;

      // Verify all tools executed successfully
      results.forEach((result) => {
        expect(result.success).toBe(true);
        expect(result.metadata?.executionTime).toBeLessThan(10000); // Under 10 seconds per tool
      });

      // Total execution should be reasonable for development workflow
      expect(totalExecutionTime).toBeLessThan(30000); // Under 30 seconds total

      console.log(
        `✅ Phase 1.1 performance validation: ${totalExecutionTime}ms total execution time`,
      );
    });
  });

  describe("Error Handling and Edge Cases", () => {
    it("should handle tool execution errors gracefully", async () => {
      const context = createExecutionContext({
        permissions: ["read", "benchmark"],
      });

      // Test with invalid input that might cause internal errors
      const result = await registry.executeTool(
        "benchmark-provider-performance",
        { iterations: 0 }, // Invalid: below minimum
        context,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.metadata?.toolName).toBe("benchmark-provider-performance");
    });

    it("should validate all required permissions", () => {
      const expectedPermissions = {
        "analyze-ai-usage": ["read", "analytics"],
        "benchmark-provider-performance": ["read", "benchmark"],
        "optimize-prompt-parameters": ["read", "optimize"],
      };

      Object.entries(expectedPermissions).forEach(([toolName, permissions]) => {
        const toolInfo = registry.getToolInfo(toolName);
        expect(toolInfo?.tool.permissions).toEqual(permissions);
      });
    });

    it("should maintain backward compatibility", () => {
      // Verify original AI Core tools still work
      const originalTools = [
        "generate-text",
        "select-provider",
        "check-provider-status",
      ];

      originalTools.forEach((toolName) => {
        const toolInfo = registry.getToolInfo(toolName);
        expect(toolInfo).toBeDefined();
        expect(toolInfo?.tool.isImplemented).toBe(true);
      });

      // Verify server structure remains compatible
      expect(aiCoreServer.id).toBe("neurolink-ai-core");
      expect(aiCoreServer.title).toBe("NeuroLink AI Core");
      expect(aiCoreServer.category).toBe("ai-providers");
    });
  });
});
