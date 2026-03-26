/**
 * Scheduler Tools - AI-callable tools for task management
 */

import { tool } from "ai";
import { z } from "zod";
import type { TaskScheduler } from "./taskScheduler.js";
import type { SessionMode } from "./types.js";

export function createSchedulerTools(
  getScheduler: () => TaskScheduler | undefined,
) {
  return {
    createScheduledTask: tool({
      description:
        "Create a scheduled task to run an AI prompt. " +
        'Types: "at" (one-time), "every" (interval), "cron" (cron expression).',
      inputSchema: z.object({
        scheduleType: z.enum(["at", "every", "cron"]),
        scheduleValue: z
          .string()
          .describe(
            'For "at": ISO timestamp (e.g., "2024-12-25T09:00:00Z"). ' +
              'For "every": interval like "30s", "5m", "1h". ' +
              'For "cron": expression like "*/5 * * * *"',
          ),
        prompt: z.string().describe("The AI prompt to execute"),
        sessionMode: z
          .enum(["isolated", "same-session"])
          .default("isolated")
          .describe(
            '"isolated" = fresh context each run, "same-session" = shared context',
          ),
        taskName: z.string().optional(),
        provider: z
          .string()
          .optional()
          .describe("AI provider (e.g., 'openai')"),
        model: z.string().optional().describe("Model (e.g., 'gpt-4o')"),
        maxRuns: z
          .number()
          .optional()
          .describe("Max executions (omit for unlimited)"),
        timezone: z
          .string()
          .optional()
          .describe('Timezone for cron (e.g., "America/New_York")'),
      }),
      execute: async (params) => {
        const scheduler = getScheduler();
        if (!scheduler) {
          return { success: false, error: "Scheduler not initialized" };
        }

        try {
          // Parse value
          let value: string | number = params.scheduleValue;
          if (params.scheduleType === "every") {
            const num = Number(params.scheduleValue);
            if (!isNaN(num)) {
              value = num;
            }
          }

          const task = await scheduler.createTask({
            schedule: {
              type: params.scheduleType,
              value,
              timezone: params.timezone,
            },
            prompt: params.prompt,
            sessionMode: params.sessionMode as SessionMode,
            name: params.taskName,
            provider: params.provider,
            model: params.model,
            maxRuns: params.maxRuns,
          });

          return {
            success: true,
            taskId: task.id,
            name: task.name,
            scheduleType: task.schedule.type,
            scheduleValue: String(task.schedule.value),
            message: `Task "${task.name}" created with ID: ${task.id}`,
          };
        } catch (err) {
          return {
            success: false,
            error: err instanceof Error ? err.message : String(err),
          };
        }
      },
    }),

    listScheduledTasks: tool({
      description: "List all scheduled tasks",
      inputSchema: z.object({}),
      execute: async () => {
        const scheduler = getScheduler();
        if (!scheduler) {
          return { success: false, error: "Scheduler not initialized" };
        }

        const tasks = await scheduler.listTasks();
        return {
          success: true,
          count: tasks.length,
          tasks: tasks.map((t) => ({
            taskId: t.id,
            name: t.name,
            scheduleType: t.schedule.type,
            scheduleValue: String(t.schedule.value),
            status: t.status,
            runCount: t.runs.length,
            maxRuns: t.maxRuns,
            lastRun: t.runs[0]?.status,
          })),
        };
      },
    }),

    cancelScheduledTask: tool({
      description: "Cancel a scheduled task by ID",
      inputSchema: z.object({
        taskId: z.string().describe("The task ID to cancel"),
      }),
      execute: async ({ taskId }) => {
        const scheduler = getScheduler();
        if (!scheduler) {
          return { success: false, error: "Scheduler not initialized" };
        }

        const cancelled = await scheduler.cancelTask(taskId);
        return cancelled
          ? { success: true, message: `Task ${taskId} cancelled` }
          : { success: false, error: `Task ${taskId} not found` };
      },
    }),

    getScheduledTaskStatus: tool({
      description: "Get detailed status of a task including run history",
      inputSchema: z.object({
        taskId: z.string(),
        includeRuns: z.boolean().default(true),
      }),
      execute: async ({ taskId, includeRuns }) => {
        const scheduler = getScheduler();
        if (!scheduler) {
          return { success: false, error: "Scheduler not initialized" };
        }

        const task = scheduler.getTask(taskId);
        if (!task) {
          return { success: false, error: `Task ${taskId} not found` };
        }

        const result: Record<string, unknown> = {
          success: true,
          taskId: task.id,
          name: task.name,
          status: task.status,
          scheduleType: task.schedule.type,
          scheduleValue: String(task.schedule.value),
          sessionMode: task.sessionMode,
          runCount: task.runs.length,
          maxRuns: task.maxRuns,
          createdAt: new Date(task.createdAt).toISOString(),
        };

        if (includeRuns) {
          result.recentRuns = task.runs.slice(0, 5).map((r) => ({
            runId: r.runId,
            status: r.status,
            startedAt: new Date(r.startedAt).toISOString(),
            completedAt: r.completedAt
              ? new Date(r.completedAt).toISOString()
              : undefined,
            response: r.response?.slice(0, 200),
            error: r.error,
          }));
        }

        return result;
      },
    }),
  };
}
