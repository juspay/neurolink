/**
 * MCP tools → Gemini function tools bridge (realtime mode).
 *
 * In speech-to-speech mode Gemini owns the tool loop, so an external MCP
 * server's tools are registered as LiveKit/Gemini function tools rather than
 * NeuroLink tools. This connects to the MCP server as the calling user
 * (`x-auth-token` + base64 `x-context`), sanitizes each tool's schema into the
 * Gemini-safe subset, wires WRITE-labeled (destructive) tools through a HITL
 * confirmation, and forwards tool start/result events to the browser bridge.
 *
 * `@livekit/agents` and `@modelcontextprotocol/sdk` are imported dynamically so
 * the core package does not require them unless the realtime agent is used.
 *
 * See docs/features/livekit-voice-agent.md.
 */

import { z } from "zod";
import type { llm as llmNs } from "@livekit/agents";
import { logger } from "../../utils/logger.js";
import { findSchemaIssue, sanitizeToolParameters } from "./schemaSanitizer.js";
import type { BuildRealtimeMcpToolsParams } from "../../types/index.js";

/**
 * Default hard cap per MCP tool call.
 *
 * Chosen to sit well inside a conversational turn: a realtime voice user is
 * waiting in silence while a tool runs, so a call that has not returned in
 * 30s has already failed as far as the conversation is concerned.
 */
const DEFAULT_TOOL_TIMEOUT_MS = 30_000;

/**
 * The fields of an MCP tool result we render: text content parts and the error
 * flag. The result crosses a network boundary from an external MCP server, so it
 * is decoded with a schema (other content kinds — image, resource — are dropped).
 */
const toolResultSchema = z.object({
  isError: z.boolean().optional(),
  content: z
    .array(
      z.object({ type: z.string().optional(), text: z.string().optional() }),
    )
    .optional(),
});

/** Flatten an MCP tool result's text content into a single string for the model. */
export function mcpResultToText(result: unknown): string {
  const decoded = toolResultSchema.safeParse(result);
  if (!decoded.success) {
    return "Tool returned no content.";
  }
  const text = (decoded.data.content ?? [])
    .map((part) => (part.type === "text" && part.text ? part.text : ""))
    .filter(Boolean)
    .join("\n")
    .trim();
  if (decoded.data.isError) {
    return `Tool error: ${text || "unknown error"}`;
  }
  return text || "Tool returned no content.";
}

/**
 * The function-result text returned to Gemini when the user rejects a HITL tool.
 * Scope the rejection to THIS attempt — a "never retry" wording made the model
 * refuse the tool permanently even when the user later asked for it again.
 */
function buildHitlDeclineMessage(toolName: string): string {
  return (
    `The user reviewed the request to run "${toolName}" and chose to reject it, ` +
    `so it was NOT executed this time. Do not run it right now. Briefly let the user know ` +
    `you didn't proceed because they declined, and ask if there's anything else. ` +
    `If the user later asks for "${toolName}" again or says to go ahead, you may run it then — ` +
    `this rejection applies only to this request, not to all future requests.`
  );
}

/**
 * Register a tool handler under the name variants the model might call:
 *   1. the Gemini-safe full name (hyphens → underscores; Gemini rewrites these
 *      itself, so the rewritten form must be registered or the round-trip fails)
 *   2. the bare short name (the model often drops the server prefix)
 * First registration wins, so a unique full name is never shadowed by a generic
 * short name. Returns the aliases actually registered.
 */
function registerToolAliases(
  toolContext: llmNs.ToolContext,
  mcpToolName: string,
  handler: llmNs.ToolContext[string],
): string[] {
  const safeFullName = mcpToolName.replace(/[^a-zA-Z0-9_]/g, "_");
  const shortName = safeFullName.includes("_")
    ? safeFullName.slice(safeFullName.lastIndexOf("_") + 1)
    : safeFullName;
  const candidates = [safeFullName, shortName].filter(
    (name, index, all) => name.length > 0 && all.indexOf(name) === index,
  );
  const registered: string[] = [];
  for (const alias of candidates) {
    if (alias in toolContext) {
      continue; // taken by another tool — don't clobber
    }
    toolContext[alias] = handler;
    registered.push(alias);
  }
  return registered;
}

/**
 * Connect to the MCP server as the calling user and bridge every tool into a
 * LiveKit `ToolContext`. Returns the tool map + the client (close on shutdown).
 * The server already scopes the tool list by `x-context`, so no client-side
 * filtering is needed.
 */
export async function buildRealtimeMcpTools(
  params: BuildRealtimeMcpToolsParams,
): Promise<{
  tools: llmNs.ToolContext;
  client: { close: () => Promise<void> };
}> {
  const {
    mcpUrl,
    authToken,
    xContext,
    publishEvent,
    requestConfirmation,
    toolTimeoutMs = DEFAULT_TOOL_TIMEOUT_MS,
  } = params;

  const { llm } = await import("@livekit/agents");
  const { Client: McpClient } =
    await import("@modelcontextprotocol/sdk/client/index.js");
  const { StreamableHTTPClientTransport } =
    await import("@modelcontextprotocol/sdk/client/streamableHttp.js");

  const transport = new StreamableHTTPClientTransport(new URL(mcpUrl), {
    requestInit: {
      headers: { "x-auth-token": authToken, "x-context": xContext },
    },
  });
  const client = new McpClient(
    { name: "neurolink-realtime-voice", version: "1.0.0" },
    { capabilities: {} },
  );
  logger.info("realtime.mcp.connecting", {
    mcpUrl,
    hasAuthToken: authToken !== "",
    hasContext: xContext !== "",
  });
  await client.connect(transport);

  try {
    const { tools: mcpTools } = await client.listTools();
    logger.info("realtime.mcp.toolsListed", { count: mcpTools.length });
    const toolContext: llmNs.ToolContext = {};
    const skipped: string[] = [];

    for (const mcpTool of mcpTools) {
      const parameters = sanitizeToolParameters(mcpTool.inputSchema);
      const issue = findSchemaIssue(parameters);
      if (issue) {
        skipped.push(mcpTool.name);
        logger.warn("realtime.mcp.toolSkipped", {
          tool: mcpTool.name,
          issue,
          rawInputSchema: JSON.stringify(mcpTool.inputSchema),
        });
        continue;
      }

      const requiresConfirmation =
        mcpTool.annotations?.destructiveHint === true;

      const handler = llm.tool({
        description: mcpTool.description ?? mcpTool.name,
        parameters,
        execute: async (args: Record<string, unknown>) => {
          if (requiresConfirmation) {
            const approved = await requestConfirmation(
              mcpTool.name,
              args ?? {},
            );
            if (!approved) {
              logger.info("realtime.tool.hitlRejected", {
                tool: mcpTool.name,
              });
              return buildHitlDeclineMessage(mcpTool.name);
            }
            logger.info("realtime.tool.hitlApproved", { tool: mcpTool.name });
          }
          logger.info("realtime.tool.invoke", {
            tool: mcpTool.name,
            args: args ?? {},
          });
          publishEvent("tool-start", { name: mcpTool.name });
          const startedAt = Date.now();
          try {
            // Third argument is RequestOptions; the SDK aborts the in-flight
            // request when `timeout` elapses. Without it a stalled server holds
            // the turn open indefinitely — Gemini blocks on the function
            // result, so the user hears nothing at all rather than an error.
            const result = await client.callTool(
              {
                name: mcpTool.name,
                arguments: args ?? {},
              },
              undefined,
              { timeout: toolTimeoutMs },
            );
            const text = mcpResultToText(result);
            logger.info("realtime.tool.result", {
              tool: mcpTool.name,
              isError: result.isError === true,
              chars: text.length,
              ms: Date.now() - startedAt,
            });
            // Forward the RAW result so the client can extract a
            // chart/UIComponent and clear the in-progress indicator.
            publishEvent("tool-result", { name: mcpTool.name, result });
            return text;
          } catch (error) {
            logger.error("realtime.tool.error", {
              tool: mcpTool.name,
              ms: Date.now() - startedAt,
              error: error instanceof Error ? error.message : String(error),
            });
            publishEvent("tool-result", { name: mcpTool.name, result: null });
            return `Tool ${mcpTool.name} failed: ${String(error)}`;
          }
        },
      });

      const aliases = registerToolAliases(toolContext, mcpTool.name, handler);
      logger.info("realtime.mcp.toolRegistered", {
        tool: mcpTool.name,
        aliases,
        hitl: requiresConfirmation,
      });
    }

    logger.info("realtime.mcp.connected", {
      registered: Object.keys(toolContext).length,
      skipped: skipped.length,
      skippedTools: skipped,
    });
    return { tools: toolContext, client };
  } catch (error) {
    await client.close().catch((closeError) => {
      logger.warn("realtime.mcp.closeFailed", {
        error:
          closeError instanceof Error ? closeError.message : String(closeError),
      });
    });
    throw error;
  }
}
