/**
 * Tool Routes
 * Endpoints for tool listing, discovery, and execution
 */

import { SpanStatusCode } from "@opentelemetry/api";
import type {
  RouteGroup,
  ServerContext,
  ToolExecuteRequest,
  ToolExecuteResponse,
} from "../../types/index.js";
import { withSpan } from "../../telemetry/withSpan.js";
import { tracers } from "../../telemetry/tracers.js";
import {
  createErrorResponse,
  ToolArgumentsSchema,
  ToolExecuteRequestSchema,
  ToolNameParamSchema,
  validateParams,
  validateRequest,
} from "../utils/validation.js";

/**
 * Create tool routes
 */
export function createToolRoutes(basePath: string = "/api"): RouteGroup {
  return {
    prefix: `${basePath}/tools`,
    // IMPORTANT: Route ordering matters for proper matching!
    // Routes are matched in order, so literal/exact paths MUST come before
    // parameterized paths (e.g., :name) to prevent the parameter from
    // matching literal path segments like "search" or "execute".
    // Order: exact paths first, then paths with nested segments, then parameterized paths last.
    routes: [
      // 1. GET /api/tools - List all tools (exact match, must be first)
      {
        method: "GET",
        path: `${basePath}/tools`,
        handler: async (ctx: ServerContext) =>
          withSpan(
            {
              name: "neurolink.http.tools.list",
              tracer: tracers.http,
              attributes: { "http.route": `${basePath}/tools` },
            },
            async (span) => {
              const tools = await ctx.toolRegistry.listTools();
              span.setAttribute("tools.count", tools.length);

              return {
                tools: tools.map((tool) => ({
                  name: tool.name,
                  description: tool.description,
                  inputSchema: tool.inputSchema,
                  source: tool.source || "built-in",
                })),
                total: tools.length,
              };
            },
          ),
        description: "List all available tools",
        tags: ["tools"],
      },
      // 2. GET /api/tools/search - Search tools (literal path segment)
      {
        method: "GET",
        path: `${basePath}/tools/search`,
        handler: async (ctx: ServerContext) =>
          withSpan(
            {
              name: "neurolink.http.tools.search",
              tracer: tracers.http,
              attributes: {
                "http.route": `${basePath}/tools/search`,
                "tools.search.query": (ctx.query.q as string) ?? "",
              },
            },
            async () => {
              const { q, source, limit } = ctx.query;
              const tools = await ctx.toolRegistry.listTools();

              let filtered = tools;

              // Filter by search query
              if (q) {
                const query = q.toLowerCase();
                filtered = filtered.filter(
                  (tool) =>
                    tool.name.toLowerCase().includes(query) ||
                    (tool.description &&
                      tool.description.toLowerCase().includes(query)),
                );
              }

              // Filter by source
              if (source) {
                filtered = filtered.filter(
                  (tool) => (tool.source || "built-in") === source,
                );
              }

              // Apply limit
              const maxResults = limit ? parseInt(limit, 10) : 50;
              filtered = filtered.slice(0, maxResults);

              return {
                tools: filtered.map((tool) => ({
                  name: tool.name,
                  description: tool.description,
                  source: tool.source || "built-in",
                })),
                total: filtered.length,
                query: q || null,
              };
            },
          ),
        description: "Search tools by name or description",
        tags: ["tools"],
      },
      // 3. POST /api/tools/execute - Execute tool by name in body (literal path segment)
      {
        method: "POST",
        path: `${basePath}/tools/execute`,
        handler: async (
          ctx: ServerContext,
        ): Promise<
          ToolExecuteResponse | ReturnType<typeof createErrorResponse>
        > => {
          // Validate request body
          const validation = validateRequest(
            ToolExecuteRequestSchema,
            ctx.body,
            ctx.requestId,
          );

          if (!validation.success) {
            return validation.error;
          }

          const request = validation.data as ToolExecuteRequest;

          return withSpan(
            {
              name: "neurolink.http.tools.execute",
              tracer: tracers.http,
              attributes: {
                "http.route": `${basePath}/tools/execute`,
                "tool.name": request.name,
              },
            },
            async (span) => {
              const startTime = Date.now();

              try {
                // Get tool from registry
                const tools = await ctx.toolRegistry.listTools();
                const tool = tools.find((t) => t.name === request.name);

                if (!tool) {
                  span.setAttribute("tool.found", false);
                  span.setStatus({
                    code: SpanStatusCode.ERROR,
                    message: `Tool '${request.name}' not found`,
                  });
                  return {
                    success: false,
                    error: `Tool '${request.name}' not found`,
                    duration: Date.now() - startTime,
                  };
                }

                // Execute the tool
                const result = await ctx.toolRegistry.executeTool(
                  request.name,
                  request.arguments,
                );

                span.setAttribute("tool.success", true);
                return {
                  success: true,
                  data: result,
                  duration: Date.now() - startTime,
                  metadata: {
                    toolName: request.name,
                    sessionId: request.sessionId || null,
                  },
                };
              } catch (error) {
                const errorMessage =
                  error instanceof Error ? error.message : String(error);
                span.setAttribute("tool.success", false);
                span.setStatus({
                  code: SpanStatusCode.ERROR,
                  message: errorMessage,
                });
                span.recordException(
                  error instanceof Error ? error : new Error(errorMessage),
                );
                return {
                  success: false,
                  error: errorMessage,
                  duration: Date.now() - startTime,
                };
              }
            },
          );
        },
        description: "Execute a tool with arguments",
        tags: ["tools"],
      },
      // 4. POST /api/tools/:name/execute - Execute specific tool (parameterized with nested segment)
      {
        method: "POST",
        path: `${basePath}/tools/:name/execute`,
        handler: async (
          ctx: ServerContext,
        ): Promise<
          ToolExecuteResponse | ReturnType<typeof createErrorResponse>
        > => {
          // Validate params
          const paramValidation = validateParams(
            ToolNameParamSchema,
            ctx.params,
            ctx.requestId,
          );

          if (!paramValidation.success) {
            return paramValidation.error;
          }

          const { name } = paramValidation.data;

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

          return withSpan(
            {
              name: "neurolink.http.tools.executeByName",
              tracer: tracers.http,
              attributes: {
                "http.route": `${basePath}/tools/:name/execute`,
                "tool.name": name,
              },
            },
            async (span) => {
              const startTime = Date.now();

              try {
                // Get tool from registry
                const tools = await ctx.toolRegistry.listTools();
                const tool = tools.find((t) => t.name === name);

                if (!tool) {
                  span.setAttribute("tool.found", false);
                  span.setStatus({
                    code: SpanStatusCode.ERROR,
                    message: `Tool '${name}' not found`,
                  });
                  return {
                    success: false,
                    error: `Tool '${name}' not found`,
                    duration: Date.now() - startTime,
                  };
                }

                // Execute the tool
                const result = await ctx.toolRegistry.executeTool(name, args);

                span.setAttribute("tool.success", true);
                return {
                  success: true,
                  data: result,
                  duration: Date.now() - startTime,
                  metadata: {
                    toolName: name,
                  },
                };
              } catch (error) {
                const errorMessage =
                  error instanceof Error ? error.message : String(error);
                span.setAttribute("tool.success", false);
                span.setStatus({
                  code: SpanStatusCode.ERROR,
                  message: errorMessage,
                });
                span.recordException(
                  error instanceof Error ? error : new Error(errorMessage),
                );
                return {
                  success: false,
                  error: errorMessage,
                  duration: Date.now() - startTime,
                };
              }
            },
          );
        },
        description: "Execute a specific tool by name",
        tags: ["tools"],
      },
      // 5. GET /api/tools/:name - Get tool details (parameterized, MUST BE LAST)
      {
        method: "GET",
        path: `${basePath}/tools/:name`,
        handler: async (ctx: ServerContext) => {
          // Validate params
          const paramValidation = validateParams(
            ToolNameParamSchema,
            ctx.params,
            ctx.requestId,
          );

          if (!paramValidation.success) {
            return paramValidation.error;
          }

          const { name } = paramValidation.data;

          return withSpan(
            {
              name: "neurolink.http.tools.get",
              tracer: tracers.http,
              attributes: {
                "http.route": `${basePath}/tools/:name`,
                "tool.name": name,
              },
            },
            async (span) => {
              const tools = await ctx.toolRegistry.listTools();
              const tool = tools.find((t) => t.name === name);

              if (!tool) {
                span.setAttribute("tool.found", false);
                span.setStatus({
                  code: SpanStatusCode.ERROR,
                  message: `Tool '${name}' not found`,
                });
                return createErrorResponse(
                  "TOOL_NOT_FOUND",
                  `Tool '${name}' not found`,
                  undefined,
                  ctx.requestId,
                );
              }

              span.setAttribute("tool.found", true);

              return {
                name: tool.name,
                description: tool.description,
                inputSchema: tool.inputSchema,
                source: tool.source || "built-in",
              };
            },
          );
        },
        description: "Get tool details by name",
        tags: ["tools"],
      },
    ],
  };
}
