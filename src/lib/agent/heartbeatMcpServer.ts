/**
 * Heartbeat MCP Server
 *
 * Standalone MCP server that exposes heartbeat loop control tools.
 * Can be used via stdio (for Claude Desktop) or HTTP (for remote access).
 *
 * @example Start with stdio transport
 * ```bash
 * npx tsx src/lib/agent/heartbeatMcpServer.ts
 * ```
 *
 * @example Start with HTTP transport
 * ```bash
 * npx tsx src/lib/agent/heartbeatMcpServer.ts --transport http --port 3002
 * ```
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { fileURLToPath } from "url";
import path from "path";
import dotenv from "dotenv";
import { logger } from "../utils/logger.js";

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

// Import heartbeat components
import { HeartbeatLoop } from "./heartbeatLoop.js";
import { FileCheckpointStore } from "./checkpoints/fileCheckpoint.js";
import type { HeartbeatLoopConfig } from "./loopTypes.js";
// import type { GenerateResult } from "../types/generateTypes.js";

// Import NeuroLink for AI generation
import { NeuroLink } from "../neurolink.js";

// Registry of active loops
const activeLoops = new Map<string, HeartbeatLoop>();

// NeuroLink instance for the server
let neurolink: NeuroLink | null = null;

/**
 * Initialize NeuroLink instance
 */
function getNeuroLink(): NeuroLink {
  if (!neurolink) {
    neurolink = new NeuroLink();
  }
  return neurolink;
}

/**
 * Parse timeout string to milliseconds
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
 * Create the MCP server with heartbeat tools
 */
function createServer(): McpServer {
  const server = new McpServer({
    name: "neurolink-heartbeat",
    version: "1.0.0",
  });

  // Tool: start_heartbeat
  server.tool(
    "start_heartbeat",
    "Start a new autonomous heartbeat loop that works toward a goal over multiple iterations. " +
      "The loop runs generate() calls repeatedly with tool access, evaluates progress, " +
      "and checkpoints state. Returns the loop ID for status queries and control.",
    {
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
    },
    async (params) => {
      try {
        const nl = getNeuroLink();

        const config: HeartbeatLoopConfig = {
          goal: params.goal,
          maxIterations: params.max_iterations,
          maxDurationMs: params.max_duration
            ? parseTimeout(params.max_duration)
            : undefined,
          maxTotalCostUsd: params.max_cost_usd,
          trigger: params.trigger_interval
            ? {
                type: "timer",
                intervalMs: parseTimeout(params.trigger_interval),
              }
            : undefined,
          contextMode: params.context_mode
            ? { type: params.context_mode }
            : undefined,
          stepOptions: {
            ...(params.provider && { provider: params.provider }),
            ...(params.model && { model: params.model }),
          },
          checkpointStore: new FileCheckpointStore(),
        };

        const loop = new HeartbeatLoop(nl, config);
        const loopId = loop.getSnapshot().loopId;
        activeLoops.set(loopId, loop);

        // Listen for completion
        loop.on("complete", () => {
          // Keep in registry for status queries, clean up after 1 hour
          setTimeout(() => activeLoops.delete(loopId), 3600_000);
        });

        // Run in background
        loop.run().catch((err) => {
          logger.error(`[HeartbeatServer] Loop ${loopId} error:`, err);
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  loopId,
                  status: "running",
                  message: `Heartbeat loop started for goal: "${params.goal}"`,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ success: false, error: message }, null, 2),
            },
          ],
          isError: true,
        };
      }
    },
  );

  // Tool: get_heartbeat_status
  server.tool(
    "get_heartbeat_status",
    "Get the current status and progress of a running heartbeat loop. " +
      "Returns iteration count, cost, goal progress, and error information.",
    {
      loop_id: z.string().describe("The loop ID returned by start_heartbeat"),
    },
    async (params) => {
      try {
        const loop = activeLoops.get(params.loop_id);
        if (!loop) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    success: false,
                    error: `No active loop found with ID: ${params.loop_id}`,
                  },
                  null,
                  2,
                ),
              },
            ],
            isError: true,
          };
        }

        const snapshot = loop.getSnapshot();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  status: snapshot.status,
                  iteration: snapshot.iteration,
                  goalProgress: snapshot.goalProgress,
                  goalConfidence: snapshot.goalConfidence,
                  totalCostUsd: snapshot.totalCostUsd,
                  totalTokensUsed: snapshot.totalTokensUsed,
                  elapsedMs: snapshot.elapsedMs,
                  consecutiveErrors: snapshot.consecutiveErrors,
                  lastAssistantMessage:
                    snapshot.lastAssistantMessage?.substring(0, 500),
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ success: false, error: message }, null, 2),
            },
          ],
          isError: true,
        };
      }
    },
  );

  // Tool: stop_heartbeat
  server.tool(
    "stop_heartbeat",
    "Stop a running heartbeat loop. Can be paused (resumable) or cancelled (permanent).",
    {
      loop_id: z.string().describe("The loop ID to stop"),
      action: z
        .enum(["pause", "cancel"])
        .describe("Pause (resumable) or cancel (permanent)"),
    },
    async (params) => {
      try {
        const loop = activeLoops.get(params.loop_id);
        if (!loop) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    success: false,
                    error: `No active loop found with ID: ${params.loop_id}`,
                  },
                  null,
                  2,
                ),
              },
            ],
            isError: true,
          };
        }

        const snapshot =
          params.action === "pause" ? await loop.pause() : await loop.cancel();

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  status: snapshot.status,
                  iteration: snapshot.iteration,
                  message: `Loop ${params.action === "pause" ? "paused" : "cancelled"} at iteration ${snapshot.iteration}`,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ success: false, error: message }, null, 2),
            },
          ],
          isError: true,
        };
      }
    },
  );

  // Tool: list_heartbeats
  server.tool(
    "list_heartbeats",
    "List all active and recently completed heartbeat loops with their status.",
    {},
    async () => {
      try {
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

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                { success: true, loops, count: loops.length },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ success: false, error: message }, null, 2),
            },
          ],
          isError: true,
        };
      }
    },
  );

  // Tool: resume_heartbeat
  server.tool(
    "resume_heartbeat",
    "Resume a paused heartbeat loop from its last checkpoint.",
    {
      loop_id: z.string().describe("The loop ID to resume"),
    },
    async (params) => {
      try {
        const loop = activeLoops.get(params.loop_id);
        if (!loop) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    success: false,
                    error: `No active loop found with ID: ${params.loop_id}`,
                  },
                  null,
                  2,
                ),
              },
            ],
            isError: true,
          };
        }

        const snapshot = loop.getSnapshot();
        if (snapshot.status !== "paused") {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    success: false,
                    error: `Loop is ${snapshot.status}, not paused`,
                  },
                  null,
                  2,
                ),
              },
            ],
            isError: true,
          };
        }

        // Run in background
        loop.run().catch((err) => {
          logger.error(`[HeartbeatServer] Loop ${params.loop_id} error:`, err);
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  loopId: params.loop_id,
                  status: "running",
                  resumedAtIteration: snapshot.iteration,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ success: false, error: message }, null, 2),
            },
          ],
          isError: true,
        };
      }
    },
  );

  return server;
}

/**
 * Start server with stdio transport
 */
async function startStdio(server: McpServer): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("[HeartbeatServer] Connected via stdio transport");
}

/**
 * Start server with HTTP transport
 */
async function startHttp(server: McpServer, port: number): Promise<void> {
  const { StreamableHTTPServerTransport } = await import(
    "@modelcontextprotocol/sdk/server/streamableHttp.js"
  );
  const http = await import("http");

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
  });

  await server.connect(transport);

  const httpServer = http.createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.url === "/mcp" && req.method === "POST") {
      try {
        await transport.handleRequest(req, res);
      } catch (err) {
        logger.error("[HeartbeatServer] MCP transport error:", err);
        if (!res.headersSent) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Internal server error" }));
        }
      }
    } else if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: "ok",
          activeLoops: activeLoops.size,
        }),
      );
    } else {
      res.writeHead(404);
      res.end("Not Found");
    }
  });

  const host = process.env.BIND_HOST || "127.0.0.1";
  await new Promise<void>((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(port, host, () => {
      httpServer.removeListener("error", reject);
      logger.info(`[HeartbeatServer] Listening on http://${host}:${port}/mcp`);
      logger.info(
        `[HeartbeatServer] Health check: http://${host}:${port}/health`,
      );
    });
  });
}

/**
 * Start the heartbeat MCP server
 */
export async function startHeartbeatServer(args: {
  transport?: "stdio" | "http";
  port?: number;
}): Promise<void> {
  const server = createServer();
  const transport = args.transport || "stdio";
  const port = args.port || 3002;

  logger.info(`[HeartbeatServer] Starting with ${transport} transport`);

  if (transport === "http") {
    await startHttp(server, port);
  } else {
    await startStdio(server);
  }
}

// Direct execution check
const isDirectExecution =
  typeof process !== "undefined" &&
  process.argv[1] &&
  fileURLToPath(import.meta.url) === process.argv[1];

if (isDirectExecution) {
  const args = process.argv.slice(2);
  const transportFlag = args.includes("--transport")
    ? args[args.indexOf("--transport") + 1]
    : "stdio";

  if (transportFlag !== "stdio" && transportFlag !== "http") {
    logger.error(
      `[HeartbeatServer] Invalid transport "${transportFlag}". Must be "stdio" or "http".`,
    );
    process.exit(1);
  }

  const portRaw = args.includes("--port")
    ? parseInt(args[args.indexOf("--port") + 1], 10)
    : 3002;
  const portFlag =
    Number.isNaN(portRaw) || portRaw < 1 || portRaw > 65535 ? 3002 : portRaw;

  startHeartbeatServer({
    transport: transportFlag as "stdio" | "http",
    port: portFlag,
  }).catch((err) => {
    logger.error("[HeartbeatServer] Failed to start:", err);
    process.exit(1);
  });
}
