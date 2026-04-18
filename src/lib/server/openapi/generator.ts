/**
 * OpenAPI 3.1 Specification Generator
 * Generates OpenAPI documentation from NeuroLink server routes
 */

import type {
  JsonObject,
  OpenAPIGeneratorConfig,
  OpenAPISpec,
  RouteDefinition,
  ServerAdapterConfig,
} from "../../types/index.js";
import { OpenAPISchemas } from "./schemas.js";
import {
  CommonParameters,
  createDeleteOperation,
  createGetOperation,
  createPostOperation,
  createStreamingPostOperation,
  createSuccessResponse as _createSuccessResponse,
  DefaultServers,
  NeuroLinkApiInfo,
  StandardErrorResponses,
  StandardTags,
  BearerSecurityScheme,
  ApiKeySecurityScheme,
} from "./templates.js";

// ============================================
// OpenAPI Generator Class
// ============================================

/**
 * OpenAPI specification generator
 * Generates OpenAPI 3.1 compliant documentation from route definitions
 */
export class OpenAPIGenerator {
  private config: OpenAPIGeneratorConfig;
  private routes: RouteDefinition[] = [];

  constructor(config: OpenAPIGeneratorConfig = {}) {
    this.config = {
      includeSecurity: true,
      basePath: "/api",
      ...config,
    };

    // Initialize routes from config if provided
    if (config.routes) {
      this.routes = [...config.routes];
    }
  }

  /**
   * Add routes to the generator
   */
  addRoutes(routes: RouteDefinition[]): void {
    this.routes.push(...routes);
  }

  /**
   * Add a single route
   */
  addRoute(route: RouteDefinition): void {
    this.routes.push(route);
  }

  /**
   * Generate the OpenAPI specification
   */
  generate(): OpenAPISpec {
    const spec: OpenAPISpec = {
      openapi: "3.1.0",
      info: this.generateInfo(),
      servers: this.generateServers(),
      tags: this.generateTags(),
      paths: this.generatePaths(),
      components: this.generateComponents(),
    };

    if (this.config.includeSecurity) {
      spec.security = [{ bearerAuth: [] }, { apiKeyAuth: [] }];
    }

    return spec;
  }

  /**
   * Generate OpenAPI spec as JSON string
   */
  toJSON(pretty: boolean = true): string {
    const spec = this.generate();
    return pretty ? JSON.stringify(spec, null, 2) : JSON.stringify(spec);
  }

  /**
   * Generate OpenAPI spec as YAML string
   * Note: For full YAML support, use a YAML library
   */
  toYAML(): string {
    const spec = this.generate();
    return this.jsonToYaml(spec);
  }

  // ============================================
  // Private Methods
  // ============================================

  private generateInfo(): JsonObject {
    const baseInfo = { ...NeuroLinkApiInfo };

    if (this.config.info?.title) {
      baseInfo.title = this.config.info.title;
    }
    if (this.config.info?.version) {
      baseInfo.version = this.config.info.version;
    }
    if (this.config.info?.description) {
      baseInfo.description = this.config.info.description;
    }

    return baseInfo;
  }

  private generateServers(): JsonObject[] {
    if (this.config.servers && this.config.servers.length > 0) {
      return this.config.servers.map((server) => ({
        url: server.url,
        description: server.description ?? "Server",
      }));
    }
    return DefaultServers;
  }

  private generateTags(): JsonObject[] {
    const tags = [...StandardTags];

    if (this.config.additionalTags) {
      tags.push(
        ...this.config.additionalTags.map((tag) => ({
          name: tag.name,
          description: tag.description,
        })),
      );
    }

    return tags;
  }

  private generatePaths(): Record<string, JsonObject> {
    const paths: Record<string, JsonObject> = {};

    // Generate paths from registered routes
    for (const route of this.routes) {
      const openApiPath = this.convertPath(route.path);

      if (!paths[openApiPath]) {
        paths[openApiPath] = {};
      }

      const method = route.method.toLowerCase();
      paths[openApiPath][method] = this.generateOperation(route);
    }

    // Add default API paths if no routes registered
    if (Object.keys(paths).length === 0) {
      return this.generateDefaultPaths();
    }

    return paths;
  }

  private generateDefaultPaths(): Record<string, JsonObject> {
    const basePath = this.config.basePath ?? "/api";

    return {
      // Agent endpoints
      [`${basePath}/agent/execute`]: {
        post: createPostOperation(
          "Execute agent",
          "Execute an AI agent with the specified input and configuration",
          ["agent"],
          "AgentExecuteRequest",
          "AgentExecuteResponse",
        ),
      },
      [`${basePath}/agent/stream`]: {
        post: createStreamingPostOperation(
          "Stream agent response",
          "Execute an AI agent and stream the response in real-time",
          ["agent", "streaming"],
          "AgentExecuteRequest",
        ),
      },
      [`${basePath}/agent/providers`]: {
        get: createGetOperation(
          "List providers",
          "Get list of available AI providers",
          ["agent"],
          "ProviderInfo",
        ),
      },

      // Tool endpoints
      [`${basePath}/tools`]: {
        get: createGetOperation(
          "List tools",
          "Get list of all available tools",
          ["tools"],
          "ToolListResponse",
          [CommonParameters.limitQuery, CommonParameters.searchQuery],
        ),
      },
      [`${basePath}/tools/{name}`]: {
        get: createGetOperation(
          "Get tool",
          "Get details of a specific tool",
          ["tools"],
          "ToolDefinition",
          [CommonParameters.toolName],
        ),
      },
      [`${basePath}/tools/{name}/execute`]: {
        post: createPostOperation(
          "Execute tool",
          "Execute a specific tool with provided arguments",
          ["tools"],
          "ToolExecuteRequest",
          "ToolExecuteResponse",
          [CommonParameters.toolName],
        ),
      },

      // MCP endpoints
      [`${basePath}/mcp/servers`]: {
        get: createGetOperation(
          "List MCP servers",
          "Get list of all configured MCP servers",
          ["mcp"],
          "MCPServersListResponse",
        ),
      },
      [`${basePath}/mcp/servers/{name}`]: {
        get: createGetOperation(
          "Get MCP server",
          "Get details of a specific MCP server",
          ["mcp"],
          "MCPServerStatus",
          [CommonParameters.serverName],
        ),
      },
      [`${basePath}/mcp/servers/{name}/tools`]: {
        get: createGetOperation(
          "List MCP server tools",
          "Get tools available from a specific MCP server",
          ["mcp", "tools"],
          "ToolListResponse",
          [CommonParameters.serverName],
        ),
      },

      // Memory endpoints
      [`${basePath}/memory/sessions`]: {
        get: createGetOperation(
          "List sessions",
          "Get list of all conversation sessions",
          ["memory"],
          "SessionsListResponse",
          [CommonParameters.limitQuery, CommonParameters.offsetQuery],
        ),
      },
      [`${basePath}/memory/sessions/{sessionId}`]: {
        get: createGetOperation(
          "Get session",
          "Get a specific conversation session",
          ["memory"],
          "Session",
          [CommonParameters.sessionId],
        ),
        delete: createDeleteOperation(
          "Delete session",
          "Delete a conversation session",
          ["memory"],
          [CommonParameters.sessionId],
        ),
      },

      // Health endpoints
      [`${basePath}/health`]: {
        get: createGetOperation(
          "Health check",
          "Check server health status",
          ["health"],
          "HealthResponse",
        ),
      },
      [`${basePath}/ready`]: {
        get: createGetOperation(
          "Readiness check",
          "Check if server is ready to accept requests",
          ["health"],
          "ReadyResponse",
        ),
      },
      [`${basePath}/metrics`]: {
        get: createGetOperation(
          "Get metrics",
          "Get server metrics and statistics",
          ["health"],
          "MetricsResponse",
        ),
      },
    };
  }

  private generateOperation(route: RouteDefinition): JsonObject {
    const operation: JsonObject = {
      summary: route.description ?? `${route.method} ${route.path}`,
      tags: route.tags ?? ["general"],
    };

    // Only include description if defined
    if (route.description) {
      operation.description = route.description;
    }

    // Add parameters from path
    const pathParams = this.extractPathParameters(route.path);
    if (pathParams.length > 0) {
      operation.parameters = pathParams;
    }

    // Add request body for POST/PUT/PATCH
    if (["POST", "PUT", "PATCH"].includes(route.method)) {
      if (route.requestSchema) {
        operation.requestBody = {
          required: true,
          content: {
            "application/json": {
              schema: route.requestSchema,
            },
          },
        };
      }
    }

    // Add responses
    if (route.streaming?.enabled) {
      operation.responses = {
        "200": {
          description: "Streaming response",
          content: {
            "text/event-stream": {
              schema: {
                type: "string",
              },
            },
          },
        },
        ...StandardErrorResponses,
      };
    } else {
      operation.responses = {
        "200": route.responseSchema
          ? {
              description: "Success",
              content: {
                "application/json": {
                  schema: route.responseSchema,
                },
              },
            }
          : {
              description: "Success",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                  },
                },
              },
            },
        ...StandardErrorResponses,
      };
    }

    // Add security if route requires auth
    if (route.auth) {
      operation.security = [{ bearerAuth: [] }, { apiKeyAuth: [] }];
    }

    return operation;
  }

  private generateComponents(): OpenAPISpec["components"] {
    const components: OpenAPISpec["components"] = {
      schemas: {
        ...OpenAPISchemas,
        ...this.config.customSchemas,
      },
    };

    if (this.config.includeSecurity) {
      components.securitySchemes = {
        bearerAuth: BearerSecurityScheme,
        apiKeyAuth: ApiKeySecurityScheme,
      };
    }

    // Add common parameters
    components.parameters = {
      sessionId: CommonParameters.sessionId,
      serverName: CommonParameters.serverName,
      toolName: CommonParameters.toolName,
      limit: CommonParameters.limitQuery,
      offset: CommonParameters.offsetQuery,
      search: CommonParameters.searchQuery,
    };

    return components;
  }

  private convertPath(path: string): string {
    // Convert Express-style :param to OpenAPI {param}
    return path.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, "{$1}");
  }

  private extractPathParameters(path: string): JsonObject[] {
    const params: JsonObject[] = [];
    const paramRegex = /:([a-zA-Z_][a-zA-Z0-9_]*)/g;
    let match;

    while ((match = paramRegex.exec(path)) !== null) {
      params.push({
        name: match[1],
        in: "path",
        required: true,
        schema: {
          type: "string",
        },
      });
    }

    return params;
  }

  /**
   * Simple JSON to YAML converter
   * For production use, consider using a proper YAML library
   */
  private jsonToYaml(obj: unknown, indent: number = 0): string {
    const spaces = "  ".repeat(indent);

    if (obj === null || obj === undefined) {
      return "null";
    }

    if (typeof obj === "boolean" || typeof obj === "number") {
      return String(obj);
    }

    if (typeof obj === "string") {
      // Check if string needs quotes
      if (
        obj.includes("\n") ||
        obj.includes(":") ||
        obj.includes("#") ||
        obj.includes("'") ||
        obj.includes('"') ||
        obj.startsWith(" ") ||
        obj.endsWith(" ")
      ) {
        // Use block scalar for multiline
        if (obj.includes("\n")) {
          const lines = obj.split("\n");
          return `|\n${lines.map((line) => spaces + "  " + line).join("\n")}`;
        }
        return `"${obj.replace(/"/g, '\\"')}"`;
      }
      return obj;
    }

    if (Array.isArray(obj)) {
      if (obj.length === 0) {
        return "[]";
      }
      return obj
        .map((item) => {
          const itemYaml = this.jsonToYaml(item, indent + 1);
          if (typeof item === "object" && item !== null) {
            return `${spaces}- ${itemYaml
              .trim()
              .replace(/^\s+/gm, (match) => spaces + "  " + match.trim() + "\n")
              .trim()}`;
          }
          return `${spaces}- ${itemYaml}`;
        })
        .join("\n");
    }

    if (typeof obj === "object") {
      const entries = Object.entries(obj);
      if (entries.length === 0) {
        return "{}";
      }
      return entries
        .map(([key, value]) => {
          const valueYaml = this.jsonToYaml(value, indent + 1);
          if (
            typeof value === "object" &&
            value !== null &&
            !Array.isArray(value)
          ) {
            return `${spaces}${key}:\n${valueYaml}`;
          }
          if (Array.isArray(value)) {
            return `${spaces}${key}:\n${valueYaml}`;
          }
          return `${spaces}${key}: ${valueYaml}`;
        })
        .join("\n");
    }

    return String(obj);
  }
}

// ============================================
// Factory Functions
// ============================================

/**
 * Create an OpenAPI generator with default configuration
 */
export function createOpenAPIGenerator(
  config?: OpenAPIGeneratorConfig,
): OpenAPIGenerator {
  return new OpenAPIGenerator(config);
}

/**
 * Generate OpenAPI spec from routes
 */
export function generateOpenAPISpec(
  routes: RouteDefinition[],
  config?: OpenAPIGeneratorConfig,
): OpenAPISpec {
  const generator = new OpenAPIGenerator(config);
  generator.addRoutes(routes);
  return generator.generate();
}

/**
 * Generate OpenAPI spec from server adapter configuration
 */
export function generateOpenAPIFromConfig(
  serverConfig: ServerAdapterConfig,
  routes?: RouteDefinition[],
): OpenAPISpec {
  const generator = new OpenAPIGenerator({
    basePath: serverConfig.basePath ?? "/api",
    servers: [
      {
        url: `http://${serverConfig.host ?? "localhost"}:${serverConfig.port ?? 3000}`,
        description: "Configured server",
      },
    ],
  });

  if (routes) {
    generator.addRoutes(routes);
  }

  return generator.generate();
}
