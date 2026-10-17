/**
 * OpenAPI JSON Schema Definitions
 * JSON Schema definitions for all NeuroLink server API types
 * Compliant with OpenAPI 3.1 / JSON Schema 2020-12
 */

import type { JsonObject } from "../../types/index.js";

// ============================================
// Common Schemas
// ============================================

/**
 * Error response schema
 */
export const ErrorResponseSchema: JsonObject = {
  type: "object",
  required: ["error"],
  properties: {
    error: {
      type: "object",
      required: ["code", "message"],
      properties: {
        code: {
          type: "string",
          description: "Error code identifier",
          example: "VALIDATION_ERROR",
        },
        message: {
          type: "string",
          description: "Human-readable error message",
          example: "Invalid request body",
        },
        details: {
          type: "object",
          description: "Additional error details",
          additionalProperties: true,
        },
      },
    },
    metadata: {
      type: "object",
      properties: {
        timestamp: {
          type: "string",
          format: "date-time",
          description: "Error timestamp",
        },
        requestId: {
          type: "string",
          description: "Request identifier for tracing",
        },
      },
    },
  },
};

/**
 * Token usage schema
 */
export const TokenUsageSchema: JsonObject = {
  type: "object",
  properties: {
    input: {
      type: "integer",
      description: "Number of input/prompt tokens",
      minimum: 0,
    },
    output: {
      type: "integer",
      description: "Number of output/completion tokens",
      minimum: 0,
    },
    total: {
      type: "integer",
      description: "Total tokens used",
      minimum: 0,
    },
    cacheCreationTokens: {
      type: "integer",
      description: "Tokens used for cache creation",
      minimum: 0,
    },
    cacheReadTokens: {
      type: "integer",
      description: "Tokens read from cache",
      minimum: 0,
    },
    reasoning: {
      type: "integer",
      description: "Tokens used for reasoning",
      minimum: 0,
    },
    cacheSavingsPercent: {
      type: "number",
      description: "Percentage of cache savings",
      minimum: 0,
      maximum: 100,
    },
  },
};

// ============================================
// Agent Schemas
// ============================================

/**
 * Agent input schema (can be string or object)
 */
export const AgentInputSchema: JsonObject = {
  oneOf: [
    {
      type: "string",
      description: "Simple text input",
    },
    {
      type: "object",
      required: ["text"],
      properties: {
        text: {
          type: "string",
          description: "Text content",
        },
        images: {
          type: "array",
          items: { type: "string" },
          description:
            "Array of images, each a data: URI, an https URL the server downloads (public hosts only, no redirects) or a path under a directory the server allows (allowedInputRoots; with none set every local path is refused with 403). Bare base64 is not accepted, and http:// or any other scheme is refused with 400. A request is limited in attachment count and total bytes (413).",
        },
        files: {
          type: "array",
          items: { type: "string" },
          description:
            "Array of files, each a data: URI, an https URL the server downloads (public hosts only, no redirects) or a path under a directory the server allows (allowedInputRoots; with none set every local path is refused with 403). http:// or any other scheme is refused with 400. A request is limited in attachment count and total bytes (413), images and files together.",
        },
      },
    },
  ],
};

/**
 * Agent execute request schema
 */
export const AgentExecuteRequestSchema: JsonObject = {
  type: "object",
  required: ["input"],
  properties: {
    input: AgentInputSchema,
    provider: {
      type: "string",
      description: "AI provider to use (e.g., openai, anthropic, google-ai)",
      example: "openai",
    },
    model: {
      type: "string",
      description: "Specific model to use",
      example: "gpt-4o",
    },
    systemPrompt: {
      type: "string",
      description: "System prompt to guide AI behavior",
    },
    temperature: {
      type: "number",
      minimum: 0,
      maximum: 2,
      description: "Sampling temperature (0-2)",
      default: 0.7,
    },
    maxTokens: {
      type: "integer",
      minimum: 1,
      description: "Maximum tokens to generate",
      default: 1000,
    },
    tools: {
      type: "array",
      items: { type: "string" },
      description: "Tool names to enable for this request",
    },
    stream: {
      type: "boolean",
      description: "Enable streaming response",
      default: false,
    },
    sessionId: {
      type: "string",
      description: "Session ID for conversation memory",
    },
    userId: {
      type: "string",
      description: "User ID for context",
    },
  },
};

/**
 * Tool call schema
 */
export const ToolCallSchema: JsonObject = {
  type: "object",
  required: ["name", "arguments"],
  properties: {
    name: {
      type: "string",
      description: "Tool name",
    },
    arguments: {
      type: "object",
      additionalProperties: true,
      description: "Tool arguments",
    },
    result: {
      description: "Tool execution result",
    },
  },
};

/**
 * Agent execute response schema
 */
export const AgentExecuteResponseSchema: JsonObject = {
  type: "object",
  required: ["content", "provider", "model"],
  properties: {
    content: {
      type: "string",
      description: "Generated text content",
    },
    provider: {
      type: "string",
      description: "Provider that handled the request",
    },
    model: {
      type: "string",
      description: "Model that generated the response",
    },
    usage: TokenUsageSchema,
    toolCalls: {
      type: "array",
      items: ToolCallSchema,
      description: "Tool calls made during generation",
    },
    finishReason: {
      type: "string",
      description: "Reason for completion",
      enum: ["stop", "length", "tool_calls", "content_filter"],
    },
    metadata: {
      type: "object",
      additionalProperties: true,
      description: "Additional response metadata",
    },
  },
};

/**
 * Provider info schema
 */
export const ProviderInfoSchema: JsonObject = {
  type: "object",
  required: ["providers", "total"],
  properties: {
    providers: {
      type: "array",
      items: {
        type: "string",
      },
      description: "List of available provider names",
    },
    total: {
      type: "integer",
      description: "Total number of providers",
    },
  },
};

// ============================================
// Tool Schemas
// ============================================

/**
 * Tool parameter schema
 */
export const ToolParameterSchema: JsonObject = {
  type: "object",
  properties: {
    type: {
      type: "string",
      description: "Parameter type",
    },
    description: {
      type: "string",
      description: "Parameter description",
    },
    required: {
      type: "boolean",
      description: "Whether parameter is required",
    },
    default: {
      description: "Default value",
    },
    enum: {
      type: "array",
      description: "Allowed values",
    },
  },
};

/**
 * Tool definition schema
 */
export const ToolDefinitionSchema: JsonObject = {
  type: "object",
  required: ["name"],
  properties: {
    name: {
      type: "string",
      description: "Tool name",
    },
    description: {
      type: "string",
      description: "Tool description",
    },
    source: {
      type: "string",
      description: "Tool source (builtin, external, custom)",
    },
    parameters: {
      type: "object",
      additionalProperties: ToolParameterSchema,
      description: "Tool parameters schema",
    },
  },
};

/**
 * Tool list response schema
 */
export const ToolListResponseSchema: JsonObject = {
  type: "object",
  required: ["tools", "total"],
  properties: {
    tools: {
      type: "array",
      items: ToolDefinitionSchema,
      description: "List of available tools",
    },
    total: {
      type: "integer",
      description: "Total number of tools",
    },
  },
};

/**
 * Tool execute request schema
 */
export const ToolExecuteRequestSchema: JsonObject = {
  type: "object",
  required: ["name"],
  properties: {
    name: {
      type: "string",
      description: "Tool name to execute",
    },
    arguments: {
      type: "object",
      additionalProperties: true,
      description: "Tool arguments",
      default: {},
    },
    sessionId: {
      type: "string",
      description: "Session context",
    },
    userId: {
      type: "string",
      description: "User context",
    },
  },
};

/**
 * Tool execute response schema
 */
export const ToolExecuteResponseSchema: JsonObject = {
  type: "object",
  required: ["success", "duration"],
  properties: {
    success: {
      type: "boolean",
      description: "Whether execution was successful",
    },
    data: {
      description: "Result data",
    },
    error: {
      type: "string",
      description: "Error message if failed",
    },
    duration: {
      type: "number",
      description: "Execution duration in milliseconds",
    },
    metadata: {
      type: "object",
      additionalProperties: true,
      description: "Additional metadata",
    },
  },
};

// ============================================
// MCP Server Schemas
// ============================================

/**
 * MCP server tool schema
 */
export const MCPServerToolSchema: JsonObject = {
  type: "object",
  properties: {
    name: {
      type: "string",
      description: "Tool name",
    },
    description: {
      type: "string",
      description: "Tool description",
    },
  },
};

/**
 * MCP server status schema
 */
export const MCPServerStatusSchema: JsonObject = {
  type: "object",
  required: ["serverId", "name", "status", "toolCount"],
  properties: {
    serverId: {
      type: "string",
      description: "Server ID",
    },
    name: {
      type: "string",
      description: "Server name",
    },
    status: {
      type: "string",
      enum: ["connected", "disconnected", "error", "connecting"],
      description: "Connection status",
    },
    toolCount: {
      type: "integer",
      description: "Number of available tools",
    },
    lastHealthCheck: {
      type: "string",
      format: "date-time",
      description: "Last health check timestamp",
    },
    error: {
      type: "string",
      description: "Error message if in error state",
    },
  },
};

/**
 * MCP servers list response schema
 */
export const MCPServersListResponseSchema: JsonObject = {
  type: "object",
  required: ["servers", "total"],
  properties: {
    servers: {
      type: "array",
      items: MCPServerStatusSchema,
      description: "List of MCP servers",
    },
    total: {
      type: "integer",
      description: "Total number of servers",
    },
  },
};

// ============================================
// Memory Schemas
// ============================================

/**
 * Conversation message schema
 */
export const ConversationMessageSchema: JsonObject = {
  type: "object",
  required: ["role", "content"],
  properties: {
    role: {
      type: "string",
      enum: ["user", "assistant", "system"],
      description: "Message role",
    },
    content: {
      type: "string",
      description: "Message content",
    },
    timestamp: {
      type: "string",
      format: "date-time",
      description: "Message timestamp",
    },
  },
};

/**
 * Session schema
 */
export const SessionSchema: JsonObject = {
  type: "object",
  required: ["sessionId"],
  properties: {
    sessionId: {
      type: "string",
      description: "Session identifier",
    },
    messages: {
      type: "array",
      items: ConversationMessageSchema,
      description: "Conversation messages",
    },
    metadata: {
      type: "object",
      additionalProperties: true,
      description: "Session metadata",
    },
    createdAt: {
      type: "string",
      format: "date-time",
      description: "Session creation time",
    },
    updatedAt: {
      type: "string",
      format: "date-time",
      description: "Last update time",
    },
  },
};

/**
 * Sessions list response schema
 */
export const SessionsListResponseSchema: JsonObject = {
  type: "object",
  required: ["sessions", "total"],
  properties: {
    sessions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          sessionId: { type: "string" },
          messageCount: { type: "integer" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      description: "List of sessions",
    },
    total: {
      type: "integer",
      description: "Total number of sessions",
    },
  },
};

// ============================================
// Health Schemas
// ============================================

/**
 * Health check response schema
 */
export const HealthResponseSchema: JsonObject = {
  type: "object",
  required: ["status", "timestamp", "uptime", "version"],
  properties: {
    status: {
      type: "string",
      enum: ["ok", "degraded", "unhealthy"],
      description: "Health status",
    },
    timestamp: {
      type: "string",
      format: "date-time",
      description: "Check timestamp",
    },
    uptime: {
      type: "integer",
      description: "Server uptime in milliseconds",
    },
    version: {
      type: "string",
      description: "Server version",
    },
  },
};

/**
 * Ready check response schema
 */
export const ReadyResponseSchema: JsonObject = {
  type: "object",
  required: ["ready", "timestamp", "services"],
  properties: {
    ready: {
      type: "boolean",
      description: "Overall readiness status",
    },
    timestamp: {
      type: "string",
      format: "date-time",
      description: "Check timestamp",
    },
    services: {
      type: "object",
      properties: {
        neurolink: {
          type: "boolean",
          description: "NeuroLink SDK status",
        },
        tools: {
          type: "boolean",
          description: "Tool registry status",
        },
        externalServers: {
          type: "boolean",
          description: "External MCP servers status",
        },
      },
      description: "Service status breakdown",
    },
  },
};

/**
 * Metrics response schema
 */
export const MetricsResponseSchema: JsonObject = {
  type: "object",
  required: ["server", "process", "timestamp"],
  properties: {
    server: {
      type: "object",
      properties: {
        running: { type: "boolean" },
        uptime: { type: "integer" },
        routes: { type: "integer" },
        middlewares: { type: "integer" },
      },
    },
    process: {
      type: "object",
      properties: {
        memoryUsage: {
          type: "object",
          properties: {
            heapUsed: { type: "integer" },
            heapTotal: { type: "integer" },
            external: { type: "integer" },
            rss: { type: "integer" },
          },
        },
        cpuUsage: {
          type: "object",
          properties: {
            user: { type: "integer" },
            system: { type: "integer" },
          },
        },
        pid: { type: "integer" },
      },
    },
    timestamp: {
      type: "string",
      format: "date-time",
    },
  },
};

// ============================================
// Schema Registry
// ============================================

/**
 * All schemas indexed by name for OpenAPI components
 */
export const OpenAPISchemas: Record<string, JsonObject> = {
  // Common
  ErrorResponse: ErrorResponseSchema,
  TokenUsage: TokenUsageSchema,

  // Agent
  AgentInput: AgentInputSchema,
  AgentExecuteRequest: AgentExecuteRequestSchema,
  AgentExecuteResponse: AgentExecuteResponseSchema,
  ToolCall: ToolCallSchema,
  ProviderInfo: ProviderInfoSchema,

  // Tools
  ToolParameter: ToolParameterSchema,
  ToolDefinition: ToolDefinitionSchema,
  ToolListResponse: ToolListResponseSchema,
  ToolExecuteRequest: ToolExecuteRequestSchema,
  ToolExecuteResponse: ToolExecuteResponseSchema,

  // MCP
  MCPServerTool: MCPServerToolSchema,
  MCPServerStatus: MCPServerStatusSchema,
  MCPServersListResponse: MCPServersListResponseSchema,

  // Memory
  ConversationMessage: ConversationMessageSchema,
  Session: SessionSchema,
  SessionsListResponse: SessionsListResponseSchema,

  // Health
  HealthResponse: HealthResponseSchema,
  ReadyResponse: ReadyResponseSchema,
  MetricsResponse: MetricsResponseSchema,
};
