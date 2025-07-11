/**
 * Semaphore Integration Tests
 * Verifies that concurrent tool executions are properly serialized
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { MCPOrchestrator } from "../lib/mcp/orchestrator.js";
import { MCPToolRegistry } from "../lib/mcp/tool-registry.js";
import { SemaphoreManager } from "../lib/mcp/semaphore-manager.js";
import type { ToolResult } from "../lib/mcp/factory.js";

describe("Semaphore Integration", () => {
  let orchestrator: MCPOrchestrator;
  let toolRegistry: MCPToolRegistry;
  let executionOrder: string[] = [];

  beforeEach(() => {
    executionOrder = [];
    toolRegistry = new MCPToolRegistry();
    orchestrator = new MCPOrchestrator(toolRegistry);
  });

  it("should prevent race conditions for the same tool", async () => {
    // Register a slow tool that tracks execution order
    await toolRegistry.registerServer("test-server", {
      tools: {
        "slow-tool": {
          name: "slow-tool",
          description: "A tool that takes time to execute",
          inputSchema: { type: "object", properties: {} },
          execute: async (args: any) => {
            const id = args.id || "default";
            executionOrder.push(`start-${id}`);

            // Simulate work
            await new Promise((resolve) => setTimeout(resolve, 100));

            executionOrder.push(`end-${id}`);
            return {
              success: true,
              data: { executed: id },
              usage: { executionTime: 100 },
            };
          },
        },
      },
    });

    // Execute the same tool multiple times concurrently
    const promises = [
      orchestrator.executeTool("slow-tool", { id: "1" }),
      orchestrator.executeTool("slow-tool", { id: "2" }),
      orchestrator.executeTool("slow-tool", { id: "3" }),
    ];

    await Promise.all(promises);

    // Verify serialized execution - no interleaving
    expect(executionOrder).toEqual([
      "start-1",
      "end-1",
      "start-2",
      "end-2",
      "start-3",
      "end-3",
    ]);
  });

  it("should allow parallel execution of different tools", async () => {
    // Register multiple different tools
    const tools: any = {};
    ["tool-a", "tool-b", "tool-c"].forEach((toolName) => {
      tools[toolName] = {
        name: toolName,
        description: `Test tool ${toolName}`,
        inputSchema: { type: "object", properties: {} },
        execute: async () => {
          executionOrder.push(`start-${toolName}`);
          await new Promise((resolve) => setTimeout(resolve, 50));
          executionOrder.push(`end-${toolName}`);
          return {
            success: true,
            data: { tool: toolName },
            usage: { executionTime: 50 },
          };
        },
      };
    });

    await toolRegistry.registerServer("parallel-test-server", { tools });

    // Execute different tools concurrently
    const startTime = Date.now();
    await Promise.all([
      orchestrator.executeTool("tool-a", {}),
      orchestrator.executeTool("tool-b", {}),
      orchestrator.executeTool("tool-c", {}),
    ]);
    const totalTime = Date.now() - startTime;

    // Should execute in parallel (< 150ms total)
    expect(totalTime).toBeLessThan(100);

    // All tools should have started before any finished
    const startIndices = executionOrder
      .map((e, i) => (e.startsWith("start-") ? i : -1))
      .filter((i) => i >= 0);
    const endIndices = executionOrder
      .map((e, i) => (e.startsWith("end-") ? i : -1))
      .filter((i) => i >= 0);

    expect(Math.max(...startIndices)).toBeLessThan(Math.min(...endIndices));
  });

  it("should handle errors gracefully with semaphores", async () => {
    let callCount = 0;

    await toolRegistry.registerServer("error-test-server", {
      tools: {
        "error-tool": {
          name: "error-tool",
          description: "A tool that sometimes fails",
          inputSchema: { type: "object", properties: {} },
          execute: async () => {
            callCount++;
            if (callCount === 2) {
              throw new Error("Simulated error");
            }
            return {
              success: true,
              data: { call: callCount },
              usage: {},
            };
          },
        },
      },
    });

    // Execute multiple times
    const results = await Promise.allSettled([
      orchestrator.executeTool("error-tool", {}),
      orchestrator.executeTool("error-tool", {}),
      orchestrator.executeTool("error-tool", {}),
    ]);

    // First should succeed
    expect(results[0].status).toBe("fulfilled");
    if (results[0].status === "fulfilled") {
      expect(results[0].value.success).toBe(true);
    }

    // Second should fail
    expect(results[1].status).toBe("fulfilled");
    if (results[1].status === "fulfilled") {
      expect(results[1].value.success).toBe(false);
    }

    // Third should succeed
    expect(results[2].status).toBe("fulfilled");
    if (results[2].status === "fulfilled") {
      expect(results[2].value.success).toBe(true);
    }
  });

  it("should track semaphore statistics", async () => {
    const semaphoreManager = new SemaphoreManager();
    const customOrchestrator = new MCPOrchestrator(
      toolRegistry,
      undefined,
      semaphoreManager,
    );

    // Register a tool
    await toolRegistry.registerServer("stats-test-server", {
      tools: {
        "stats-tool": {
          name: "stats-tool",
          description: "Tool for testing stats",
          inputSchema: { type: "object", properties: {} },
          execute: async () => {
            await new Promise((resolve) => setTimeout(resolve, 50));
            return { success: true, data: {}, usage: {} };
          },
        },
      },
    });

    // Execute multiple times
    await Promise.all([
      customOrchestrator.executeTool("stats-tool", {}),
      customOrchestrator.executeTool("stats-tool", {}),
      customOrchestrator.executeTool("stats-tool", {}),
    ]);

    // Check statistics
    const stats = semaphoreManager.getStats("tool:stats-tool");
    expect(stats.totalOperations).toBe(3);
    expect(stats.activeOperations).toBe(0);
    expect(stats.averageWaitTime).toBeGreaterThan(0);
  });
});
