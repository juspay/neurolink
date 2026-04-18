/**
 * Health Routes
 * Endpoints for health checks and system status
 */

import type {
  HealthResponse,
  ReadyResponse,
  RouteGroup,
  ServerContext,
} from "../../types/index.js";
import { withSpan } from "../../telemetry/withSpan.js";
import { tracers } from "../../telemetry/tracers.js";

/**
 * Wrap a health-route handler with an OTel span that records the route,
 * request id, and overall health status.
 */
function tracedHealthHandler<T>(
  name: string,
  route: string,
  fn: (ctx: ServerContext) => Promise<T>,
): (ctx: ServerContext) => Promise<T> {
  return (ctx: ServerContext) =>
    withSpan(
      {
        name,
        tracer: tracers.http,
        attributes: {
          "http.route": route,
          "http.request.id": ctx.requestId ?? "",
        },
      },
      () => fn(ctx),
    );
}

/**
 * Create health check routes
 */
export function createHealthRoutes(basePath: string = "/api"): RouteGroup {
  return {
    prefix: `${basePath}/health`,
    routes: [
      {
        method: "GET",
        path: `${basePath}/health`,
        handler: tracedHealthHandler(
          "neurolink.http.health.check",
          `${basePath}/health`,
          async (): Promise<HealthResponse> => {
            return {
              status: "ok",
              timestamp: new Date().toISOString(),
              uptime: process.uptime() * 1000,
              version: process.env.npm_package_version || "unknown",
            };
          },
        ),
        description: "Basic health check",
        tags: ["health"],
      },
      {
        method: "GET",
        path: `${basePath}/health/live`,
        handler: tracedHealthHandler(
          "neurolink.http.health.live",
          `${basePath}/health/live`,
          async (): Promise<{ status: string; timestamp: string }> => {
            // Liveness probe - just checks if the server is running
            return {
              status: "alive",
              timestamp: new Date().toISOString(),
            };
          },
        ),
        description: "Kubernetes liveness probe",
        tags: ["health"],
      },
      {
        method: "GET",
        path: `${basePath}/health/ready`,
        handler: (ctx: ServerContext): Promise<ReadyResponse> =>
          withSpan(
            {
              name: "neurolink.http.health.ready",
              tracer: tracers.http,
              attributes: {
                "http.route": `${basePath}/health/ready`,
                "http.request.id": ctx.requestId ?? "",
              },
            },
            async (span) => {
              // Readiness probe - checks if all dependencies are ready
              const tools = await ctx.toolRegistry.listTools();
              const hasTools = tools.length > 0;
              const hasExternalManager = !!ctx.externalServerManager;

              // Check external servers if available
              let externalServersReady = true;
              if (ctx.externalServerManager) {
                const statuses = ctx.externalServerManager.getServerStatuses();
                for (const status of statuses) {
                  if (status.status !== "connected") {
                    externalServersReady = false;
                    break;
                  }
                }
              }

              const isReady =
                hasTools || !hasExternalManager || externalServersReady;

              span.setAttribute("health.ready", isReady);
              span.setAttribute("health.tools_count", tools.length);
              span.setAttribute(
                "health.external_servers_ready",
                externalServersReady,
              );

              return {
                ready: isReady,
                timestamp: new Date().toISOString(),
                services: {
                  neurolink: true,
                  tools: hasTools,
                  externalServers: externalServersReady,
                },
              };
            },
          ),
        description: "Kubernetes readiness probe",
        tags: ["health"],
      },
      {
        method: "GET",
        path: `${basePath}/health/startup`,
        handler: (ctx: ServerContext) =>
          withSpan(
            {
              name: "neurolink.http.health.startup",
              tracer: tracers.http,
              attributes: {
                "http.route": `${basePath}/health/startup`,
                "http.request.id": ctx.requestId ?? "",
              },
            },
            async (span) => {
              // Startup probe - checks if the application has started successfully
              const tools = await ctx.toolRegistry.listTools();
              span.setAttribute("health.tools_count", tools.length);

              return {
                started: true,
                timestamp: new Date().toISOString(),
                services: {
                  neurolink: true,
                  toolsLoaded: tools.length,
                  externalServerManager: !!ctx.externalServerManager,
                },
              };
            },
          ),
        description: "Kubernetes startup probe",
        tags: ["health"],
      },
      {
        method: "GET",
        path: `${basePath}/health/detailed`,
        handler: (ctx: ServerContext) =>
          withSpan(
            {
              name: "neurolink.http.health.detailed",
              tracer: tracers.http,
              attributes: {
                "http.route": `${basePath}/health/detailed`,
                "http.request.id": ctx.requestId ?? "",
              },
            },
            async (span) => {
              const tools = await ctx.toolRegistry.listTools();

              // Group tools by source
              const toolsBySource: Record<string, number> = {};
              for (const tool of tools) {
                const source =
                  typeof tool.source === "string"
                    ? tool.source
                    : tool.serverId || "built-in";
                toolsBySource[source] = (toolsBySource[source] || 0) + 1;
              }

              // Get external server statuses
              const externalServers: Array<{
                name: string;
                status: string;
                toolCount: number;
              }> = [];
              if (ctx.externalServerManager) {
                const statuses = ctx.externalServerManager.getServerStatuses();
                for (const status of statuses) {
                  externalServers.push({
                    name: status.serverId,
                    status: status.status,
                    toolCount: status.toolCount,
                  });
                }
              }

              // Memory status
              const memory = ctx.neurolink.conversationMemory;
              const memoryStatus = {
                available: !!memory,
                type: memory?.constructor.name || "none",
              };

              // Build the base health response
              const healthResponse: Record<string, unknown> = {
                status: "ok",
                timestamp: new Date().toISOString(),
                uptime: process.uptime() * 1000,
                version: process.env.npm_package_version || "unknown",
                node: {
                  version: process.version,
                  platform: process.platform,
                  arch: process.arch,
                },
                memory: {
                  ...memoryStatus,
                  process: {
                    heapUsed: Math.round(
                      process.memoryUsage().heapUsed / 1024 / 1024,
                    ),
                    heapTotal: Math.round(
                      process.memoryUsage().heapTotal / 1024 / 1024,
                    ),
                    rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
                    external: Math.round(
                      process.memoryUsage().external / 1024 / 1024,
                    ),
                  },
                },
                tools: {
                  total: tools.length,
                  bySource: toolsBySource,
                },
                externalServers: {
                  count: externalServers.length,
                  servers: externalServers,
                },
              };

              // Add proxy account pool status when proxy mode is active
              if (ctx.metadata?.accountPool) {
                const pool = ctx.metadata.accountPool as {
                  getAllAccounts: () => Array<{
                    id: string;
                    label?: string;
                    status: string;
                    requestCount: number;
                    subscriptionTier?: string;
                  }>;
                  getHealthyCount: () => number;
                  getStrategy: () => string;
                };
                const allAccounts = pool.getAllAccounts();
                const statusCounts: Record<string, number> = {};
                for (const a of allAccounts) {
                  statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
                }
                healthResponse.proxy = {
                  totalAccounts: allAccounts.length,
                  statusDistribution: statusCounts,
                  healthyCount: pool.getHealthyCount(),
                  strategy: pool.getStrategy(),
                };
                span.setAttribute("health.proxy.accounts", allAccounts.length);
                span.setAttribute(
                  "health.proxy.healthy",
                  pool.getHealthyCount(),
                );
              }

              span.setAttribute("health.tools_count", tools.length);
              span.setAttribute(
                "health.external_servers_count",
                externalServers.length,
              );
              span.setAttribute(
                "health.memory.heap_mb",
                Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
              );

              return healthResponse;
            },
          ),
        description: "Detailed health information",
        tags: ["health"],
      },
      {
        method: "GET",
        path: `${basePath}/version`,
        handler: tracedHealthHandler(
          "neurolink.http.version",
          `${basePath}/version`,
          async () => {
            return {
              name: "@juspay/neurolink",
              version: process.env.npm_package_version || "unknown",
              node: process.version,
              timestamp: new Date().toISOString(),
            };
          },
        ),
        description: "Get version information",
        tags: ["health", "version"],
      },
    ],
  };
}
