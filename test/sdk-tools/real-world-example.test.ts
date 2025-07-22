import { describe, it, expect } from "vitest";
import { NeuroLink } from "../../src/lib/neurolink.js";
import { createTypedTool } from "../../src/lib/sdk/tool-registration.js";
import { z } from "zod";

describe("Real-World SDK Tool Examples", () => {
  it("should create a task management assistant", async () => {
    const sdk = new NeuroLink();

    // In-memory task storage
    const tasks: Array<{
      id: number;
      title: string;
      completed: boolean;
      priority: string;
    }> = [];
    // Use a unique ID generator to avoid collisions in concurrent tests
    const generateTaskId = () =>
      `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    // Register task management tools
    sdk.registerTools({
      addTask: createTypedTool({
        description: "Add a new task to the list",
        parameters: z.object({
          title: z.string().describe("Task title"),
          priority: z
            .enum(["low", "medium", "high"])
            .optional()
            .default("medium"),
        }),
        execute: ({ title, priority }) => {
          const task = {
            id: generateTaskId(),
            title,
            completed: false,
            priority,
          };
          tasks.push(task);
          return { success: true, task };
        },
      }),

      listTasks: createTypedTool({
        description: "List all tasks or filter by status",
        parameters: z.object({
          filter: z
            .enum(["all", "completed", "pending"])
            .optional()
            .default("all"),
        }),
        execute: ({ filter }) => {
          let filtered = tasks;
          if (filter === "completed") {
            filtered = tasks.filter((t) => t.completed);
          } else if (filter === "pending") {
            filtered = tasks.filter((t) => !t.completed);
          }
          return { tasks: filtered, count: filtered.length };
        },
      }),

      completeTask: createTypedTool({
        description: "Mark a task as completed",
        parameters: z.object({
          taskId: z.string().describe("ID of the task to complete"),
        }),
        execute: ({ taskId }) => {
          const task = tasks.find((t) => t.id === taskId);
          if (!task) {
            return { success: false, error: "Task not found" };
          }
          task.completed = true;
          return { success: true, task };
        },
      }),
    });

    // Test the task assistant
    const result1 = await sdk.generate({
      input: {
        text: "Add three tasks: buy groceries (high priority), call mom, and finish report (high priority)",
      },
      provider: "google-ai",
      maxTokens: 500,
      disableTools: false,
    });

    expect(result1.content).toBeDefined();
    expect(tasks.length).toBe(3);

    const result2 = await sdk.generate({
      input: { text: "Show me all my pending high priority tasks" },
      provider: "google-ai",
      maxTokens: 300,
      disableTools: false,
    });

    expect(result2.content).toBeDefined();
    expect(result2.content.toLowerCase()).toContain("high");

    // Clean up
    sdk.unregisterTool("addTask");
    sdk.unregisterTool("listTasks");
    sdk.unregisterTool("completeTask");
  }, 60000);

  it("should create a data analysis assistant", async () => {
    const sdk = new NeuroLink();

    // Sample data
    const salesData = [
      { month: "Jan", revenue: 45000, units: 120 },
      { month: "Feb", revenue: 52000, units: 145 },
      { month: "Mar", revenue: 48000, units: 130 },
      { month: "Apr", revenue: 61000, units: 175 },
      { month: "May", revenue: 58000, units: 165 },
      { month: "Jun", revenue: 67000, units: 190 },
    ];

    sdk.registerTools({
      analyzeSales: createTypedTool({
        description: "Analyze sales data and provide insights",
        parameters: z.object({
          metric: z
            .enum(["revenue", "units", "both"])
            .optional()
            .default("both"),
          calculation: z
            .enum(["sum", "average", "max", "min", "trend"])
            .optional()
            .default("sum"),
        }),
        execute: ({ metric, calculation }) => {
          const revenues = salesData.map((d) => d.revenue);
          const units = salesData.map((d) => d.units);

          const calculate = (data: number[]) => {
            switch (calculation) {
              case "sum":
                return data.reduce((a, b) => a + b, 0);
              case "average":
                return data.reduce((a, b) => a + b, 0) / data.length;
              case "max":
                return Math.max(...data);
              case "min":
                return Math.min(...data);
              case "trend": {
                const firstHalf =
                  data.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
                const secondHalf = data.slice(3).reduce((a, b) => a + b, 0) / 3;
                return {
                  firstHalfAvg: firstHalf,
                  secondHalfAvg: secondHalf,
                  growth:
                    (((secondHalf - firstHalf) / firstHalf) * 100).toFixed(1) +
                    "%",
                };
              }
            }
          };

          const result: any = {
            period: "Jan-Jun",
            calculation,
          };

          if (metric === "revenue" || metric === "both") {
            result.revenue = calculate(revenues);
          }
          if (metric === "units" || metric === "both") {
            result.units = calculate(units);
          }

          return result;
        },
      }),

      compareMonths: createTypedTool({
        description: "Compare sales between two months",
        parameters: z.object({
          month1: z.string().describe("First month"),
          month2: z.string().describe("Second month"),
        }),
        execute: ({ month1, month2 }) => {
          const data1 = salesData.find(
            (d) => d.month.toLowerCase() === month1.toLowerCase(),
          );
          const data2 = salesData.find(
            (d) => d.month.toLowerCase() === month2.toLowerCase(),
          );

          if (!data1 || !data2) {
            return { error: "Month not found" };
          }

          return {
            [month1]: data1,
            [month2]: data2,
            comparison: {
              revenueDiff: data2.revenue - data1.revenue,
              revenueChange:
                (
                  ((data2.revenue - data1.revenue) / data1.revenue) *
                  100
                ).toFixed(1) + "%",
              unitsDiff: data2.units - data1.units,
              unitsChange:
                (((data2.units - data1.units) / data1.units) * 100).toFixed(1) +
                "%",
            },
          };
        },
      }),
    });

    // Test analysis
    const analysis = await sdk.generate({
      input: { text: "Analyze the sales trend and tell me if we are growing" },
      provider: "google-ai",
      maxTokens: 400,
      disableTools: false,
    });

    expect(analysis.content).toBeDefined();
    expect(analysis.content.toLowerCase()).toContain("growth");

    const comparison = await sdk.generate({
      input: { text: "Compare the sales between January and June" },
      provider: "google-ai",
      maxTokens: 400,
      disableTools: false,
    });

    expect(comparison.content).toBeDefined();
    expect(comparison.content).toContain("Jan");
    expect(comparison.content).toContain("Jun");

    // Clean up
    sdk.unregisterTool("analyzeSales");
    sdk.unregisterTool("compareMonths");
  }, 60000);

  it("should create a file operations assistant", async () => {
    const sdk = new NeuroLink();

    // Mock file system
    const files = new Map<string, string>([
      ["readme.txt", "This is a sample readme file"],
      ["data.json", JSON.stringify({ name: "Test", value: 42 })],
      ["config.yml", "debug: true\nport: 3000"],
    ]);

    sdk.registerTools({
      readFile: createTypedTool({
        description: "Read contents of a file",
        parameters: z.object({
          filename: z.string().describe("Name of the file to read"),
        }),
        execute: ({ filename }) => {
          const content = files.get(filename);
          if (!content) {
            return { success: false, error: "File not found" };
          }
          return { success: true, filename, content };
        },
      }),

      writeFile: createTypedTool({
        description: "Write content to a file",
        parameters: z.object({
          filename: z.string().describe("Name of the file to write"),
          content: z.string().describe("Content to write"),
        }),
        execute: ({ filename, content }) => {
          files.set(filename, content);
          return { success: true, filename, size: content.length };
        },
      }),

      listFiles: createTypedTool({
        description: "List all available files",
        parameters: z.object({}),
        execute: () => {
          const fileList = Array.from(files.entries()).map(
            ([name, content]) => ({
              name,
              size: content.length,
              type: name.split(".").pop(),
            }),
          );
          return { files: fileList, count: fileList.length };
        },
      }),
    });

    // Test file operations
    const list = await sdk.generate({
      input: { text: "List all files and their sizes" },
      provider: "google-ai",
      maxTokens: 300,
      disableTools: false,
    });

    expect(list.content).toBeDefined();
    expect(list.content).toContain("readme.txt");
    expect(list.content).toContain("data.json");

    const read = await sdk.generate({
      input: {
        text: "Read the config.yml file and tell me what port is configured",
      },
      provider: "google-ai",
      maxTokens: 300,
      disableTools: false,
    });

    expect(read.content).toBeDefined();
    expect(read.content).toContain("3000");

    // Clean up
    sdk.unregisterTool("readFile");
    sdk.unregisterTool("writeFile");
    sdk.unregisterTool("listFiles");
  }, 60000);
});
