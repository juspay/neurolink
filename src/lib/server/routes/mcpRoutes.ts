/**
 * MCP Routes
 * Endpoints for MCP server management
 */

import { z } from "zod";
import type {
  MCPServerStatusResponse,
  RouteGroup,
  ServerContext,
} from "../types.js";
import {
  createErrorResponse,
  ServerNameParamSchema,
  ToolArgumentsSchema,
  validateParams,
  validateRequest,
} from "../utils/validation.js";

/**
 * MCP tool execution params schema
 */
const MCPToolExecuteParamsSchema = z.object({
  name: z.string().min(1, "Server name is required"),
  toolName: z.string().min(1, "Tool name is required"),
});

/**
 * Handler: List all MCP servers
 */
async function handleListServers(ctx: ServerContext) {
  const manager = ctx.externalServerManager;

  if (!manager) {
    return {
      servers: [],
      total: 0,
      message: "External server manager not available",
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: ctx.requestId,
      },
    };
  }

  const serverInfos = manager.listServers();
  const statuses = manager.getServerStatuses();

  // Create a map of statuses by serverId for quick lookup
  const statusMap = new Map(statuses.map((s) => [s.serverId, s]));

  const servers: MCPServerStatusResponse[] = serverInfos.map((info) => {
    const status = statusMap.get(info.name);
    return {
      serverId: info.name,
      name: info.name,
      status: status?.status || "disconnected",
      toolCount: status?.toolCount || 0,
      lastHealthCheck: status?.checkedAt?.toISOString(),
      error: status?.issues?.[0],
    };
  });

  return {
    servers,
    total: servers.length,
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: ctx.requestId,
    },
  };
}

/**
 * Handler: Get MCP server status
 */
async function handleGetServer(ctx: ServerContext) {
  // Validate params
  const paramValidation = validateParams(
    ServerNameParamSchema,
    ctx.params,
    ctx.requestId,
  );

  if (!paramValidation.success) {
    return paramValidation.error;
  }

  const { name } = paramValidation.data;
  const manager = ctx.externalServerManager;

  if (!manager) {
    return createErrorResponse(
      "MCP_UNAVAILABLE",
      "External server manager not available",
      undefined,
      ctx.requestId,
    );
  }

  const serverInfos = manager.listServers();
  const serverInfo = serverInfos.find((s) => s.name === name);

  if (!serverInfo) {
    return createErrorResponse(
      "SERVER_NOT_FOUND",
      `MCP server '${name}' not found`,
      undefined,
      ctx.requestId,
    );
  }

  const statuses = manager.getServerStatuses();
  const status = statuses.find((s) => s.serverId === name);

  // Get tools for this server
  const tools = await ctx.toolRegistry.listTools();
  const serverTools = tools.filter((t) => t.source === name);

  return {
    serverId: name,
    name,
    status: status?.status || "disconnected",
    toolCount: status?.toolCount || 0,
    tools: serverTools.map((t) => ({
      name: t.name,
      description: t.description,
    })),
    lastHealthCheck: status?.checkedAt?.toISOString(),
    error: status?.issues?.[0],
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: ctx.requestId,
    },
  };
}

/**
 * Handler: Reconnect to an MCP server
 */
async function handleReconnectServer(ctx: ServerContext) {
  // Validate params
  const paramValidation = validateParams(
    ServerNameParamSchema,
    ctx.params,
    ctx.requestId,
  );

  if (!paramValidation.success) {
    return paramValidation.error;
  }

  const { name } = paramValidation.data;
  const manager = ctx.externalServerManager;

  if (!manager) {
    return createErrorResponse(
      "MCP_UNAVAILABLE",
      "External server manager not available",
      undefined,
      ctx.requestId,
    );
  }

  try {
    // To reconnect, we need to get the existing config and re-add
    const serverInfos = manager.listServers();
    const serverInfo = serverInfos.find((s) => s.name === name);

    if (!serverInfo) {
      return createErrorResponse(
        "SERVER_NOT_FOUND",
        `Server '${name}' not found`,
        undefined,
        ctx.requestId,
      );
    }

    // Note: Full reconnect would require storing config
    // For now, return the current status
    const statuses = manager.getServerStatuses();
    const status = statuses.find((s) => s.serverId === name);

    return {
      success: true,
      server: {
        serverId: name,
        name,
        status: status?.status || "disconnected",
        toolCount: status?.toolCount || 0,
      },
      message:
        "Server status retrieved (full reconnect requires server restart)",
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: ctx.requestId,
      },
    };
  } catch (error) {
    return createErrorResponse(
      "RECONNECT_FAILED",
      error instanceof Error ? error.message : String(error),
      undefined,
      ctx.requestId,
    );
  }
}

/**
 * Handler: Remove an MCP server
 */
async function handleRemoveServer(ctx: ServerContext) {
  // Validate params
  const paramValidation = validateParams(
    ServerNameParamSchema,
    ctx.params,
    ctx.requestId,
  );

  if (!paramValidation.success) {
    return paramValidation.error;
  }

  const { name } = paramValidation.data;
  const manager = ctx.externalServerManager;

  if (!manager) {
    return createErrorResponse(
      "MCP_UNAVAILABLE",
      "External server manager not available",
      undefined,
      ctx.requestId,
    );
  }

  try {
    const result = await manager.removeServer(name);

    if (!result.success) {
      return createErrorResponse(
        "REMOVE_FAILED",
        result.error || "Failed to remove server",
        undefined,
        ctx.requestId,
      );
    }

    return {
      success: true,
      message: `Server '${name}' removed`,
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: ctx.requestId,
      },
    };
  } catch (error) {
    return createErrorResponse(
      "REMOVE_FAILED",
      error instanceof Error ? error.message : String(error),
      undefined,
      ctx.requestId,
    );
  }
}

/**
 * Handler: List tools from a specific MCP server
 */
async function handleListServerTools(ctx: ServerContext) {
  // Validate params
  const paramValidation = validateParams(
    ServerNameParamSchema,
    ctx.params,
    ctx.requestId,
  );

  if (!paramValidation.success) {
    return paramValidation.error;
  }

  const { name } = paramValidation.data;

  // Get tools from this specific server
  const tools = await ctx.toolRegistry.listTools();
  const serverTools = tools.filter((t) => t.source === name);

  if (serverTools.length === 0) {
    // Check if server exists
    const manager = ctx.externalServerManager;
    if (manager) {
      const serverInfos = manager.listServers();
      const serverInfo = serverInfos.find((s) => s.name === name);
      if (!serverInfo) {
        return createErrorResponse(
          "SERVER_NOT_FOUND",
          `MCP server '${name}' not found`,
          undefined,
          ctx.requestId,
        );
      }
    }
  }

  return {
    serverId: name,
    tools: serverTools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
    total: serverTools.length,
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: ctx.requestId,
    },
  };
}

/**
 * Handler: Execute a tool from a specific MCP server
 */
async function handleExecuteTool(ctx: ServerContext) {
  // Validate params
  const paramValidation = validateParams(
    MCPToolExecuteParamsSchema,
    ctx.params,
    ctx.requestId,
  );

  if (!paramValidation.success) {
    return paramValidation.error;
  }

  const { name, toolName } = paramValidation.data;

  // Validate body (tool arguments)
  const bodyValidation = validateRequest(
    ToolArgumentsSchema,
    ctx.body || {},
    ctx.requestId,
  );

  if (!bodyValidation.success) {
    return bodyValidation.error;
  }

  const args = bodyValidation.data;
  const startTime = Date.now();

  try {
    // Verify tool exists for this server
    const tools = await ctx.toolRegistry.listTools();
    const tool = tools.find((t) => t.name === toolName && t.source === name);

    if (!tool) {
      return createErrorResponse(
        "TOOL_NOT_FOUND",
        `Tool '${toolName}' not found on server '${name}'`,
        undefined,
        ctx.requestId,
      );
    }

    // Execute the tool
    const result = await ctx.toolRegistry.executeTool(toolName, args);

    return {
      success: true,
      data: result,
      duration: Date.now() - startTime,
      metadata: {
        server: name,
        toolName,
        timestamp: new Date().toISOString(),
        requestId: ctx.requestId,
      },
    };
  } catch (error) {
    return createErrorResponse(
      "EXECUTION_FAILED",
      error instanceof Error ? error.message : String(error),
      { duration: Date.now() - startTime },
      ctx.requestId,
    );
  }
}

/**
 * Handler: Health check for all MCP servers
 */
async function handleMCPHealth(ctx: ServerContext) {
  const manager = ctx.externalServerManager;

  if (!manager) {
    return {
      healthy: false,
      message: "External server manager not available",
      servers: [],
    };
  }

  const statuses = manager.getServerStatuses();
  const serverStatuses = statuses.map((s) => ({
    name: s.serverId,
    healthy: s.isHealthy,
    error: s.issues?.[0],
  }));

  const allHealthy = serverStatuses.every((s) => s.healthy);
  const someHealthy = serverStatuses.some((s) => s.healthy);

  return {
    healthy: serverStatuses.length === 0 || allHealthy,
    status:
      serverStatuses.length === 0
        ? "no_servers"
        : allHealthy
          ? "all_healthy"
          : someHealthy
            ? "degraded"
            : "unhealthy",
    servers: serverStatuses,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create MCP server management routes
 */
export function createMCPRoutes(basePath: string = "/api"): RouteGroup {
  return {
    prefix: `${basePath}/mcp`,
    routes: [
      {
        method: "GET",
        path: `${basePath}/mcp/servers`,
        handler: handleListServers,
        description: "List all MCP servers",
        tags: ["mcp"],
      },
      {
        method: "GET",
        path: `${basePath}/mcp/servers/:name`,
        handler: handleGetServer,
        description: "Get MCP server status",
        tags: ["mcp"],
      },
      {
        method: "POST",
        path: `${basePath}/mcp/servers/:name/reconnect`,
        handler: handleReconnectServer,
        description: "Reconnect to an MCP server",
        tags: ["mcp"],
      },
      {
        method: "DELETE",
        path: `${basePath}/mcp/servers/:name`,
        handler: handleRemoveServer,
        description: "Remove an MCP server",
        tags: ["mcp"],
      },
      {
        method: "GET",
        path: `${basePath}/mcp/servers/:name/tools`,
        handler: handleListServerTools,
        description: "List tools from a specific MCP server",
        tags: ["mcp", "tools"],
      },
      {
        method: "POST",
        path: `${basePath}/mcp/servers/:name/tools/:toolName/execute`,
        handler: handleExecuteTool,
        description: "Execute a tool from a specific MCP server",
        tags: ["mcp", "tools"],
      },
      {
        method: "GET",
        path: `${basePath}/mcp/health`,
        handler: handleMCPHealth,
        description: "Health check for all MCP servers",
        tags: ["mcp", "health"],
      },
    ],
  };
}
