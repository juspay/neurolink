import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import { NeuroLink } from "../../src/lib/neurolink.js";
import {
  createTool,
  createTypedTool,
} from "../../src/lib/sdk/tool-registration.js";
import { z } from "zod";

// Test with multiple providers
import { PROVIDERS_TO_BENCHMARK as TEST_PROVIDERS } from "../config/providers";

describe("SDK Tool Integration with AI Providers", () => {
  let sdk: NeuroLink;

  beforeAll(() => {
    // Set up test tools
    sdk = new NeuroLink();

    // Register a simple tool
    sdk.registerTool(
      "getCurrentTime",
      createTool({
        description: "Get the current time",
        execute: () => {
          const now = new Date();
          return {
            time: now.toISOString(),
            timestamp: now.getTime(),
            formatted: now.toLocaleString(),
          };
        },
      }),
    );

    // Register a parameterized tool
    sdk.registerTool(
      "calculator",
      createTypedTool({
        description: "Perform mathematical calculations",
        parameters: z.object({
          a: z.number().describe("First number"),
          b: z.number().describe("Second number"),
          operation: z
            .enum(["add", "subtract", "multiply", "divide"])
            .describe("Math operation"),
        }),
        execute: ({ a, b, operation }) => {
          switch (operation) {
            case "add":
              return { result: a + b, operation: `${a} + ${b}` };
            case "subtract":
              return { result: a - b, operation: `${a} - ${b}` };
            case "multiply":
              return { result: a * b, operation: `${a} × ${b}` };
            case "divide":
              return { result: a / b, operation: `${a} ÷ ${b}` };
          }
        },
      }),
    );

    // Register a weather tool (mock)
    sdk.registerTool(
      "getWeather",
      createTypedTool({
        description: "Get weather information for a location",
        parameters: z.object({
          location: z.string().describe("City name or coordinates"),
          units: z
            .enum(["celsius", "fahrenheit"])
            .optional()
            .default("celsius"),
        }),
        execute: ({ location, units }) => {
          // Mock weather data
          const temp = 22; // celsius
          const tempF = (temp * 9) / 5 + 32;

          return {
            location,
            temperature: units === "fahrenheit" ? tempF : temp,
            units,
            condition: "sunny",
            humidity: 65,
            wind: { speed: 10, direction: "NW" },
          };
        },
      }),
    );
  });

  describe.each(TEST_PROVIDERS)("Provider: %s", (provider) => {
    describe("Basic Tool Usage", () => {
      it("should use custom tool when asked about time", async () => {
        const result = await sdk.generate({
          input: { text: "What time is it right now?" },
          provider,
          maxTokens: 200,
        });

        expect(result.content).toBeDefined();
        expect(result.provider).toBe(provider);

        // Check if tool was used
        if (result.toolCalls && result.toolCalls.length > 0) {
          expect(result.toolCalls[0].name).toBe("getCurrentTime");
        }

        // Content should mention time-related information
        const content = result.content.toLowerCase();
        expect(
          content.includes("time") ||
            content.includes("clock") ||
            content.includes(":") ||
            /\d{1,2}:\d{2}/.test(content),
        ).toBe(true);
      }, 30000);

      it("should use calculator tool for math", async () => {
        const result = await sdk.generate({
          input: { text: "Calculate 15 multiplied by 7" },
          provider,
          maxTokens: 200,
        });

        expect(result.content).toBeDefined();

        // Should contain the result (105)
        expect(result.content).toContain("105");

        // Check tool usage
        if (result.toolCalls && result.toolCalls.length > 0) {
          expect(result.toolCalls[0].name).toBe("calculator");
          expect(result.toolCalls[0].arguments).toMatchObject({
            a: 15,
            b: 7,
            operation: "multiply",
          });
        }
      }, 30000);

      it("should use weather tool for weather queries", async () => {
        const result = await sdk.generate({
          input: { text: "What is the weather in Paris?" },
          provider,
          maxTokens: 200,
        });

        expect(result.content).toBeDefined();

        // Should mention Paris and weather conditions
        const content = result.content.toLowerCase();
        expect(content).toContain("paris");
        expect(
          content.includes("sunny") ||
            content.includes("weather") ||
            content.includes("temperature"),
        ).toBe(true);
      }, 30000);
    });

    describe("Complex Tool Scenarios", () => {
      it("should handle multiple tool calls in one request", async () => {
        const result = await sdk.generate({
          input: {
            text: "What time is it and what is 25 plus 30?",
          },
          provider,
          maxTokens: 300,
        });

        expect(result.content).toBeDefined();

        // Should contain both time info and calculation result (55)
        expect(result.content).toContain("55");

        // Both tools might be called
        if (result.toolCalls && result.toolCalls.length > 1) {
          const toolNames = result.toolCalls.map((tc) => tc.name);
          expect(toolNames).toContain("getCurrentTime");
          expect(toolNames).toContain("calculator");
        }
      }, 30000);

      it("should work with streaming", async () => {
        const streamResult = await sdk.stream({
          input: { text: "Calculate 12 divided by 4" },
          provider,
          maxTokens: 200,
        });

        expect(streamResult.stream).toBeDefined();

        let fullContent = "";
        for await (const chunk of streamResult.stream) {
          if (chunk.content) {
            fullContent += chunk.content;
          }
        }

        // Should contain the result (3)
        expect(fullContent).toContain("3");
      }, 30000);
    });

    describe("Error Handling", () => {
      it("should handle tool errors gracefully", async () => {
        // Register a tool that throws an error
        sdk.registerTool(
          "errorTool",
          createTool({
            description: "A tool that always errors",
            execute: () => {
              throw new Error("Tool execution failed");
            },
          }),
        );

        const result = await sdk.generate({
          input: { text: "Use the error tool" },
          provider,
          maxTokens: 200,
        });

        // Should still get a response
        expect(result.content).toBeDefined();
        expect(result.provider).toBe(provider);

        // Clean up
        sdk.unregisterTool("errorTool");
      }, 30000);
    });
  });

  describe("Tool Visibility", () => {
    it("should list all available custom tools", async () => {
      const tools = await sdk.getAllAvailableTools();

      const customToolNames = tools
        .filter((t) => t.serverId.startsWith("custom-tool-"))
        .map((t) => t.toolName);

      expect(customToolNames).toContain("getCurrentTime");
      expect(customToolNames).toContain("calculator");
      expect(customToolNames).toContain("getWeather");
    });
  });

  describe("Direct Tool Execution", () => {
    it("should execute tools directly without AI", async () => {
      const timeResult = await sdk.executeTool("getCurrentTime");
      expect(timeResult).toHaveProperty("time");
      expect(timeResult).toHaveProperty("timestamp");

      const calcResult = await sdk.executeTool("calculator", {
        a: 10,
        b: 5,
        operation: "add",
      });
      expect(calcResult).toHaveProperty("result", 15);

      const weatherResult = await sdk.executeTool("getWeather", {
        location: "London",
        units: "celsius",
      });
      expect(weatherResult).toHaveProperty("location", "London");
      expect(weatherResult).toHaveProperty("temperature", 22);
    });
  });
});
