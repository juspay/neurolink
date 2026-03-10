/**
 * Heartbeat Tools
 *
 * MCP tool definitions for controlling heartbeat loops.
 * These tools enable AI agents and external systems to start, stop,
 * query, and resume autonomous heartbeat loops programmatically.
 */

import { z } from "zod";
import type { HeartbeatLoop } from "./heartbeatLoop.js";
import type { HeartbeatLoopConfig, LoopSnapshot } from "./loopTypes.js";
// import { TriggerRegistry } from "./triggers/triggerRegistry.js";

/**
 * Type for a tool definition compatible with MCP.
 */
export interface MCPToolDefinition {
  name: string;
  description: string;
  parameters: z.ZodObject<z.ZodRawShape>;
  execute: (params: unknown) => Promise<unknown>;
}

/**
 * Type for tool execution result.
 */
export interface ToolResult {
  success: boolean;
  error?: string;
  [key: string]: unknown;
}

/**
 * Registry of active loops - keyed by loopId.
 */
const activeLoops = new Map<string, HeartbeatLoop>();

/**
 * Parse timeout string to milliseconds.
 * Supports formats like "5s", "1m", "2h", "30s".
 */
function parseTimeout(timeout: string | number): number {
  if (typeof timeout === "number") {
    return timeout;
  }

  const match = timeout.match(/^(\d+(?:\.\d+)?)(s|m|h)?$/);
  if (!match) {
    throw new Error(`Invalid timeout format: ${timeout}`);
  }

  const value = parseFloat(match[1]);
  const unit = match[2] || "s";

  switch (unit) {
    case "s":
      return value * 1000;
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    default:
      return value;
  }
}

/**
 * Create heartbeat MCP tools bound to a NeuroLink instance.
 *
 * @param neurolink - The NeuroLink instance to use for generating
 * @returns Object containing all heartbeat tool definitions
 *
 * @example
 * ```typescript
 * const tools = createHeartbeatTools(neurolink);
 * neurolink.registerTool("start_heartbeat", tools.start_heartbeat);
 * ```
 */
export function createHeartbeatTools(neurolink: {
  generate: (options: {
    input: { text: string };
    conversationId?: string;
    maxSteps?: number;
    provider?: string;
    model?: string;
  }) => Promise<{ content: string }>;
  emit: (event: string, ...args: unknown[]) => boolean;
}): Record<string, MCPToolDefinition> {
  return {
    start_heartbeat: {
      name: "start_heartbeat",
      description:
        "Start a new autonomous heartbeat loop that works toward a goal over multiple iterations. " +
        "The loop runs generate() calls repeatedly with tool access, evaluates progress, " +
        "and checkpoints state. Returns the loop ID for status queries and control.",
      parameters: z.object({
        goal: z
          .string()
          .describe("Natural language goal for the loop to achieve"),
        max_iterations: z
          .number()
          .optional()
          .describe("Maximum iterations (default: 1000)"),
        max_duration: z
          .string()
          .optional()
          .describe("Max duration like '2h', '30m' (default: 4h)"),
        max_cost_usd: z.number().optional().describe("Maximum cost in USD"),
        trigger_interval: z
          .string()
          .optional()
          .describe(
            "Interval between iterations like '0s', '5s', '1m' (default: 0 = back-to-back)",
          ),
        provider: z.string().optional().describe("AI provider for iterations"),
        model: z.string().optional().describe("Model for iterations"),
        context_mode: z
          .enum(["continuation", "isolated"])
          .optional()
          .describe("Context mode (default: continuation)"),
      }),
      execute: async (params: unknown): Promise<unknown> => {
        const p = params as {
          goal: string;
          max_iterations?: number;
          max_duration?: string;
          max_cost_usd?: number;
          trigger_interval?: string;
          provider?: string;
          model?: string;
          context_mode?: "continuation" | "isolated";
        };
        // Dynamically import to avoid circular dependencies
        const { HeartbeatLoop } = await import("./heartbeatLoop.js");

        const config: HeartbeatLoopConfig = {
          goal: p.goal,
          maxIterations: p.max_iterations,
          maxDurationMs: p.max_duration
            ? parseTimeout(p.max_duration)
            : undefined,
          maxTotalCostUsd: p.max_cost_usd,
          trigger: p.trigger_interval
            ? {
                type: "timer",
                intervalMs: parseTimeout(p.trigger_interval),
              }
            : undefined,
          contextMode: p.context_mode ? { type: p.context_mode } : undefined,
          stepOptions: {
            ...(p.provider && { provider: p.provider }),
            ...(p.model && { model: p.model }),
          },
        };

        const loop = new HeartbeatLoop(neurolink, config);
        const loopId = loop.getSnapshot().loopId;
        activeLoops.set(loopId, loop);

        // Run in background - don't await
        loop.run().finally(() => {
          // Keep in registry for status queries, clean up after 1 hour
          setTimeout(() => activeLoops.delete(loopId), 3600_000);
        });

        return {
          success: true,
          loopId,
          status: "running",
          message: `Heartbeat loop started for goal: "${p.goal}"`,
        };
      },
    },

    get_heartbeat_status: {
      name: "get_heartbeat_status",
      description:
        "Get the current status and progress of a running heartbeat loop. " +
        "Returns iteration count, cost, goal progress, and error information.",
      parameters: z.object({
        loop_id: z.string().describe("The loop ID returned by start_heartbeat"),
      }),
      execute: async (params: unknown): Promise<unknown> => {
        const p = params as { loop_id: string };
        const loop = activeLoops.get(p.loop_id);
        if (!loop) {
          return {
            success: false,
            error: `No active loop found with ID: ${p.loop_id}`,
          };
        }

        const snapshot = loop.getSnapshot();
        return {
          success: true,
          status: snapshot.status,
          iteration: snapshot.iteration,
          goalProgress: snapshot.goalProgress,
          goalConfidence: snapshot.goalConfidence,
          totalCostUsd: snapshot.totalCostUsd,
          totalTokensUsed: snapshot.totalTokensUsed,
          elapsedMs: snapshot.elapsedMs,
          consecutiveErrors: snapshot.consecutiveErrors,
          lastAssistantMessage: snapshot.lastAssistantMessage?.substring(
            0,
            500,
          ),
        };
      },
    },

    stop_heartbeat: {
      name: "stop_heartbeat",
      description:
        "Stop a running heartbeat loop. Can be paused (resumable) or cancelled (permanent).",
      parameters: z.object({
        loop_id: z.string().describe("The loop ID to stop"),
        action: z
          .enum(["pause", "cancel"])
          .describe("Pause (resumable) or cancel (permanent)"),
      }),
      execute: async (params: unknown): Promise<unknown> => {
        const p = params as { loop_id: string; action: "pause" | "cancel" };
        const loop = activeLoops.get(p.loop_id);
        if (!loop) {
          return {
            success: false,
            error: `No active loop found with ID: ${p.loop_id}`,
          };
        }

        const snapshot =
          p.action === "pause" ? await loop.pause() : await loop.cancel();

        return {
          success: true,
          status: snapshot.status,
          iteration: snapshot.iteration,
          message: `Loop ${p.action === "pause" ? "paused" : "cancelled"} at iteration ${snapshot.iteration}`,
        };
      },
    },

    list_heartbeats: {
      name: "list_heartbeats",
      description:
        "List all active and recently completed heartbeat loops with their status.",
      parameters: z.object({}),
      execute: async (): Promise<ToolResult> => {
        const loops = Array.from(activeLoops.entries()).map(([id, loop]) => {
          const s = loop.getSnapshot();
          return {
            loopId: id,
            goal: s.goalText.substring(0, 100),
            status: s.status,
            iteration: s.iteration,
            costUsd: s.totalCostUsd,
            elapsedMs: s.elapsedMs,
          };
        });
        return { success: true, loops, count: loops.length };
      },
    },

    resume_heartbeat: {
      name: "resume_heartbeat",
      description: "Resume a paused heartbeat loop from its last checkpoint.",
      parameters: z.object({
        loop_id: z.string().describe("The loop ID to resume"),
      }),
      execute: async (params: unknown): Promise<unknown> => {
        const p = params as { loop_id: string };
        const loop = activeLoops.get(p.loop_id);
        if (!loop) {
          return {
            success: false,
            error: `No active loop found with ID: ${p.loop_id}`,
          };
        }

        const snapshot = loop.getSnapshot();
        if (snapshot.status !== "paused") {
          return {
            success: false,
            error: `Loop is ${snapshot.status}, not paused`,
          };
        }

        // Run in background
        loop.run().finally(() => {
          setTimeout(() => activeLoops.delete(p.loop_id), 3600_000);
        });

        return {
          success: true,
          loopId: p.loop_id,
          status: "running",
          resumedAtIteration: snapshot.iteration,
        };
      },
    },
  };
}

/**
 * Get an active loop by ID.
 */
export function getActiveLoop(loopId: string): HeartbeatLoop | undefined {
  return activeLoops.get(loopId);
}

/**
 * List all active loops.
 */
export function listActiveLoops(): Array<{
  loopId: string;
  snapshot: LoopSnapshot;
}> {
  return Array.from(activeLoops.entries()).map(([loopId, loop]) => ({
    loopId,
    snapshot: loop.getSnapshot(),
  }));
}

/**
 * Clear inactive loops from the registry.
 */
export function cleanupInactiveLoops(maxAgeMs: number = 3600_000): number {
  const now = Date.now();
  let removed = 0;

  for (const [loopId, loop] of activeLoops.entries()) {
    const snapshot = loop.getSnapshot();
    const lastActivity = new Date(snapshot.lastIterationAt).getTime();

    if (snapshot.status !== "running" && now - lastActivity > maxAgeMs) {
      activeLoops.delete(loopId);
      removed++;
    }
  }

  return removed;
}

// Export types
export type { HeartbeatLoop, LoopSnapshot };
