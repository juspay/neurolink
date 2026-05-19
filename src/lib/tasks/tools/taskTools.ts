import { z } from "zod";
import { logger } from "../../utils/logger.js";
import { TaskError } from "../errors.js";
import type { TaskManager } from "../taskManager.js";
import type { TaskSchedule, Tool } from "../../types/index.js";
import { tool } from "../../utils/tool.js";

/**
 * Parse a schedule object from tool input.
 * Accepts: { type: "cron", expression } | { type: "interval", every } | { type: "once", at }
 */
function parseSchedule(input: Record<string, unknown>): TaskSchedule {
  const type = input.type as string;

  if (type === "cron") {
    if (!input.expression || typeof input.expression !== "string") {
      throw TaskError.create(
        "SCHEDULE_FAILED",
        "Cron schedule requires an 'expression' field",
      );
    }
    return {
      type: "cron",
      expression: input.expression as string,
      ...(input.timezone ? { timezone: input.timezone as string } : {}),
    };
  }

  if (type === "interval") {
    if (
      typeof input.every !== "number" ||
      !isFinite(input.every) ||
      input.every <= 0
    ) {
      throw TaskError.create(
        "SCHEDULE_FAILED",
        "Interval schedule requires a positive 'every' field (milliseconds)",
      );
    }
    return { type: "interval", every: input.every as number };
  }

  if (type === "once") {
    if (!input.at) {
      throw TaskError.create(
        "SCHEDULE_FAILED",
        "Once schedule requires an 'at' field (ISO 8601 date string)",
      );
    }
    return { type: "once", at: input.at as string };
  }

  throw TaskError.create(
    "SCHEDULE_FAILED",
    `Invalid schedule type: "${type}". Must be "cron", "interval", or "once".`,
  );
}

/**
 * Create task management tools bound to a TaskManager instance.
 *
 * These tools follow the same factory pattern as `createFileTools()` in
 * `src/lib/files/fileTools.ts`. The `manager` is captured via closure,
 * eliminating the need for module-level singleton state.
 *
 * @param manager - The TaskManager instance to bind to
 * @returns Record of tool name to tool definition
 *
 * @example
 * ```typescript
 * const manager = new TaskManager(neurolink, config);
 * const tools = createTaskTools(manager);
 * // tools.createTask, tools.listTasks, tools.getTaskRuns, etc.
 * ```
 */
export function createTaskTools(manager: TaskManager): Record<string, Tool> {
  return {
    createTask: tool({
      description:
        'Schedule a recurring or one-shot task that runs a prompt on a schedule. Use schedule type "cron" for calendar-based (e.g. "0 9 * * *"), "interval" for fixed frequency (every N milliseconds), or "once" for a single future execution.',
      inputSchema: z.object({
        name: z.string().describe("Human-readable task name"),
        prompt: z.string().describe("The prompt to execute on each run"),
        schedule: z
          .object({
            type: z.enum(["cron", "interval", "once"]),
            expression: z
              .string()
              .optional()
              .describe('Cron expression (for type "cron"), e.g. "0 9 * * *"'),
            timezone: z
              .string()
              .optional()
              .describe('IANA timezone for cron, e.g. "America/New_York"'),
            every: z
              .number()
              .optional()
              .describe('Interval in milliseconds (for type "interval")'),
            at: z
              .string()
              .optional()
              .describe('ISO 8601 timestamp (for type "once")'),
          })
          .describe("When to run the task"),
        mode: z
          .enum(["isolated", "continuation"])
          .optional()
          .describe(
            'Execution mode. "isolated" = fresh context per run (default). "continuation" = preserves conversation history across runs.',
          ),
      }),
      execute: async ({ name, prompt, schedule, mode }) => {
        try {
          const parsedSchedule = parseSchedule(
            schedule as unknown as Record<string, unknown>,
          );
          const task = await manager.create({
            name,
            prompt,
            schedule: parsedSchedule,
            mode: mode as "isolated" | "continuation" | undefined,
          });
          return {
            success: true,
            taskId: task.id,
            name: task.name,
            status: task.status,
            mode: task.mode,
            nextRunAt: task.nextRunAt,
            schedule: task.schedule,
          };
        } catch (error) {
          logger.error("[taskTools] createTask failed", {
            error: String(error),
          });
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
    }),

    listTasks: tool({
      description: "List all scheduled tasks and their current status.",
      inputSchema: z.object({
        status: z
          .enum([
            "active",
            "paused",
            "completed",
            "failed",
            "cancelled",
            "pending",
          ])
          .optional()
          .describe("Filter by task status"),
      }),
      execute: async ({ status }) => {
        try {
          const tasks = await manager.list(
            status
              ? {
                  status: status as
                    | "active"
                    | "paused"
                    | "completed"
                    | "failed"
                    | "cancelled"
                    | "pending",
                }
              : undefined,
          );
          return {
            success: true,
            count: tasks.length,
            tasks: tasks.map((t) => ({
              taskId: t.id,
              name: t.name,
              status: t.status,
              mode: t.mode,
              schedule: t.schedule,
              runCount: t.runCount,
              lastRunAt: t.lastRunAt,
              nextRunAt: t.nextRunAt,
            })),
          };
        } catch (error) {
          logger.error("[taskTools] listTasks failed", {
            error: String(error),
          });
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
    }),

    getTaskRuns: tool({
      description:
        "Get the run history of a scheduled task, showing recent executions and their results.",
      inputSchema: z.object({
        taskId: z.string().describe("The task ID"),
        limit: z
          .number()
          .optional()
          .describe("Max results to return (default: 10)"),
      }),
      execute: async ({ taskId, limit }) => {
        try {
          const runs = await manager.runs(taskId, { limit: limit ?? 10 });
          return {
            success: true,
            taskId,
            count: runs.length,
            runs: runs.map((r) => ({
              runId: r.runId,
              status: r.status,
              output: r.output
                ? r.output.length > 500
                  ? r.output.slice(0, 500) + "..."
                  : r.output
                : undefined,
              durationMs: r.durationMs,
              timestamp: r.timestamp,
              error: r.error,
            })),
          };
        } catch (error) {
          logger.error("[taskTools] getTaskRuns failed", {
            error: String(error),
          });
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
    }),

    deleteTask: tool({
      description: "Cancel and permanently remove a scheduled task.",
      inputSchema: z.object({
        taskId: z.string().describe("The task ID to delete"),
      }),
      execute: async ({ taskId }) => {
        try {
          const task = await manager.get(taskId);
          if (!task) {
            return { success: false, error: `Task not found: ${taskId}` };
          }
          await manager.delete(taskId);
          return { success: true, deletedTask: task.name, taskId };
        } catch (error) {
          logger.error("[taskTools] deleteTask failed", {
            error: String(error),
          });
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
    }),

    runTaskNow: tool({
      description:
        "Immediately execute a scheduled task outside of its normal schedule. Returns the run result.",
      inputSchema: z.object({
        taskId: z.string().describe("The task ID to run"),
      }),
      execute: async ({ taskId }) => {
        try {
          const result = await manager.run(taskId);
          return {
            success: true,
            runId: result.runId,
            status: result.status,
            output: result.output
              ? result.output.length > 1000
                ? result.output.slice(0, 1000) + "..."
                : result.output
              : undefined,
            durationMs: result.durationMs,
            error: result.error,
          };
        } catch (error) {
          logger.error("[taskTools] runTaskNow failed", {
            error: String(error),
          });
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
    }),
  };
}
