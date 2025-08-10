/**
 * Unified Tool Registration Tests
 * Test the unified registerTools() method supporting both object and array formats
 */

import { describe, test, expect, beforeEach } from "vitest";
import { NeuroLink } from "../src/lib/neurolink.js";
import { z } from "zod";

describe("Unified Tool Registration", () => {
  let neurolink: NeuroLink;

  beforeEach(() => {
    neurolink = new NeuroLink();
  });

  test("should register tools from array format using unified method", async () => {
    const toolsArray = [
      {
        name: "test_tool_1",
        tool: {
          description: "First test tool",
          execute: async () => "result1",
        },
      },
      {
        name: "test_tool_2",
        tool: {
          description: "Second test tool",
          execute: async () => "result2",
        },
      },
    ];

    neurolink.registerTools(toolsArray);

    const customTools = neurolink.getCustomTools();
    expect(customTools.size).toBe(2);
    expect(customTools.has("test_tool_1")).toBe(true);
    expect(customTools.has("test_tool_2")).toBe(true);
  });

  test("should register tools from object format using unified method", async () => {
    const toolsObject = {
      test_tool_1: {
        description: "First test tool",
        execute: async () => "result1",
      },
      test_tool_2: {
        description: "Second test tool",
        execute: async () => "result2",
      },
    };

    neurolink.registerTools(toolsObject);

    const customTools = neurolink.getCustomTools();
    expect(customTools.size).toBe(2);
    expect(customTools.has("test_tool_1")).toBe(true);
    expect(customTools.has("test_tool_2")).toBe(true);
  });

  test("should execute array-registered tools correctly", async () => {
    const toolsArray = [
      {
        name: "calculator",
        tool: {
          description: "Simple calculator",
          parameters: z.object({
            a: z.number(),
            b: z.number(),
            op: z.string(),
          }),
          execute: async (params: { a: number; b: number; op: string }) => {
            const { a, b, op } = params;
            if (op === "add") {
              return a + b;
            }
            if (op === "multiply") {
              return a * b;
            }
            return 0;
          },
        },
      },
    ];

    neurolink.registerTools(toolsArray);

    const addResult = await neurolink.executeTool("calculator", {
      a: 5,
      b: 3,
      op: "add",
    });
    expect(addResult).toBe(8);

    const multiplyResult = await neurolink.executeTool("calculator", {
      a: 4,
      b: 6,
      op: "multiply",
    });
    expect(multiplyResult).toBe(24);
  });

  test("should handle empty array registration", () => {
    neurolink.registerTools([]);

    const customTools = neurolink.getCustomTools();
    expect(customTools.size).toBe(0);
  });

  test("should handle empty object registration", () => {
    neurolink.registerTools({});

    const customTools = neurolink.getCustomTools();
    expect(customTools.size).toBe(0);
  });

  test("should maintain tool registration after mixed format registration", async () => {
    // Register individual tool first
    neurolink.registerTool("individual_tool", {
      description: "Individual tool",
      execute: async () => "individual",
    });

    // Register array of tools using unified method
    const toolsArray = [
      {
        name: "array_tool",
        tool: {
          description: "Array tool",
          execute: async () => "array",
        },
      },
    ];
    neurolink.registerTools(toolsArray);

    // Register object of tools using unified method
    neurolink.registerTools({
      object_tool: {
        description: "Object tool",
        execute: async () => "object",
      },
    });

    // All three should be available
    const customTools = neurolink.getCustomTools();
    expect(customTools.size).toBe(3);
    expect(customTools.has("individual_tool")).toBe(true);
    expect(customTools.has("array_tool")).toBe(true);
    expect(customTools.has("object_tool")).toBe(true);

    // All should be executable
    const individualResult = await neurolink.executeTool("individual_tool", {});
    const arrayResult = await neurolink.executeTool("array_tool", {});
    const objectResult = await neurolink.executeTool("object_tool", {});

    expect(individualResult).toBe("individual");
    expect(arrayResult).toBe("array");
    expect(objectResult).toBe("object");
  });

  test("should show array-registered tools in getAllAvailableTools", async () => {
    const toolsArray = [
      {
        name: "visible_tool",
        tool: {
          description: "Should be visible in tool list",
          execute: async () => "visible",
        },
      },
    ];

    neurolink.registerTools(toolsArray);

    const allTools = await neurolink.getAllAvailableTools();
    const visibleTool = allTools.find((tool) => tool.name === "visible_tool");

    expect(visibleTool).toBeDefined();
    expect(visibleTool?.description).toBe("Should be visible in tool list");
    expect(visibleTool?.category).toBe("user-defined");
  });

  test("should support Lighthouse tools with Zod schemas (Lighthouse compatibility)", async () => {
    // Simulate Lighthouse tool format with Zod schemas
    const lighthouseTools = [
      {
        name: "juspay-analytics",
        tool: {
          description: "Analyze Juspay merchant payment data",
          parameters: z.object({
            merchantId: z.string().describe("Merchant identifier"),
            dateRange: z.object({
              start: z.string().datetime(),
              end: z.string().datetime(),
            }),
            metrics: z
              .array(z.enum(["volume", "success_rate", "avg_amount"]))
              .optional(),
          }),
          execute: async ({
            merchantId,
            dateRange,
            metrics,
          }: {
            merchantId: string;
            dateRange: { start: string; end: string };
            metrics?: string[];
          }) => {
            return {
              merchantId,
              period: dateRange,
              analytics: {
                totalVolume: 125000,
                successRate: 0.987,
                avgAmount: 45.67,
              },
            };
          },
        },
      },
      {
        name: "payment-processor",
        tool: {
          description: "Process payment transactions",
          parameters: z.object({
            amount: z.number().positive(),
            currency: z.string().length(3),
            paymentMethod: z.enum(["card", "upi", "wallet"]),
          }),
          execute: async ({
            amount,
            currency,
            paymentMethod,
          }: {
            amount: number;
            currency: string;
            paymentMethod: string;
          }) => {
            return {
              transactionId: `txn_${Date.now()}`,
              status: "success",
              amount,
              currency,
              method: paymentMethod,
            };
          },
        },
      },
    ];

    // Register Lighthouse tools using unified API
    neurolink.registerTools(lighthouseTools);

    // Verify tools are registered
    const customTools = neurolink.getCustomTools();
    expect(customTools.size).toBe(2);
    expect(customTools.has("juspay-analytics")).toBe(true);
    expect(customTools.has("payment-processor")).toBe(true);

    // Test Zod parameter validation and execution
    const analyticsResult = await neurolink.executeTool("juspay-analytics", {
      merchantId: "MERCH123",
      dateRange: {
        start: "2023-01-01T00:00:00.000Z",
        end: "2023-01-07T23:59:59.999Z",
      },
      metrics: ["volume", "success_rate"],
    });

    expect(analyticsResult).toEqual({
      merchantId: "MERCH123",
      period: {
        start: "2023-01-01T00:00:00.000Z",
        end: "2023-01-07T23:59:59.999Z",
      },
      analytics: {
        totalVolume: 125000,
        successRate: 0.987,
        avgAmount: 45.67,
      },
    });

    const paymentResult = await neurolink.executeTool("payment-processor", {
      amount: 100.5,
      currency: "USD",
      paymentMethod: "card",
    });

    expect(paymentResult).toMatchObject({
      status: "success",
      amount: 100.5,
      currency: "USD",
      method: "card",
    });
    expect((paymentResult as { transactionId: string }).transactionId).toMatch(
      /^txn_\d+$/,
    );
  });
});
