# MCP Enhancements Implementation Guide

This document provides a comprehensive implementation guide for enhancing NeuroLink's MCP (Model Context Protocol) capabilities with Mastra-style features, including MCPServerBase class, advanced tool annotations, elicitation protocol, and enhanced multi-server management.

## Table of Contents

1. [Current NeuroLink MCP Analysis](#current-neurolink-mcp-analysis)
2. [Gap Analysis vs Mastra](#gap-analysis-vs-mastra)
3. [MCPServerBase Class](#mcpserverbase-class)
4. [MCP Server Features](#mcp-server-features)
5. [Transport Protocols](#transport-protocols)
6. [MCP Client Enhancements](#mcp-client-enhancements)
7. [Elicitation Protocol](#elicitation-protocol)
8. [Enhanced Type Definitions](#enhanced-type-definitions)
9. [Implementation Plan](#implementation-plan)
10. [Migration Guide](#migration-guide)
11. [MCP Specification Updates 2025](#mcp-specification-updates-2025)
12. [Lessons from NeuroLink MCP Evolution](#lessons-from-neurolink-mcp-evolution)
13. [Security Best Practices](#security-best-practices)
14. [MCP Registry Integration](#mcp-registry-integration)
15. [Updated Implementation Approach](#updated-implementation-approach)
16. [References](#references)

---

## Current NeuroLink MCP Analysis

### Existing Architecture

NeuroLink already has a robust MCP implementation with the following components:

#### Core Components

| Component               | File                                    | Purpose                                                |
| ----------------------- | --------------------------------------- | ------------------------------------------------------ |
| `MCPToolRegistry`       | `/src/lib/mcp/toolRegistry.ts`          | Central registry for tool management with HITL support |
| `MCPClientFactory`      | `/src/lib/mcp/mcpClientFactory.ts`      | Creates MCP clients for all transport types            |
| `ExternalServerManager` | `/src/lib/mcp/externalServerManager.ts` | Lifecycle management of external MCP servers           |
| `ToolDiscoveryService`  | `/src/lib/mcp/toolDiscoveryService.ts`  | Automatic tool discovery and registration              |
| `MCPCircuitBreaker`     | `/src/lib/mcp/mcpCircuitBreaker.ts`     | Fault tolerance and failure protection                 |
| `HTTPRateLimiter`       | `/src/lib/mcp/httpRateLimiter.ts`       | Token bucket rate limiting for HTTP transport          |
| `createMCPServer`       | `/src/lib/mcp/factory.ts`               | Factory function for creating MCP servers              |

#### Supported Transport Protocols

```typescript
// Current MCPTransportType from /src/lib/types/mcpTypes.ts
export type MCPTransportType =
  | "stdio" // Local subprocess via stdin/stdout
  | "sse" // Server-Sent Events
  | "websocket" // WebSocket connections
  | "http" // HTTP/Streamable HTTP
  | "ws" // WebSocket alias
  | "tcp" // TCP connections
  | "unix"; // Unix sockets
```

#### Current Authentication Support

```typescript
// From MCPServerInfo in /src/lib/types/mcpTypes.ts
auth?: {
  type: "oauth2" | "bearer" | "api-key";
  oauth?: {
    clientId: string;
    clientSecret?: string;
    authorizationUrl: string;
    tokenUrl: string;
    redirectUrl: string;
    scope?: string;
    usePKCE?: boolean;
  };
  token?: string;
  apiKey?: string;
  apiKeyHeader?: string;
};
```

#### Current Tool Registry Features

- **Direct tool registration**: Built-in tools registered automatically
- **Server registration**: External MCP servers with tool discovery
- **HITL integration**: Human-in-the-loop confirmation for dangerous operations
- **Execution statistics**: Performance tracking per tool
- **Flexible validation**: Universal safety checks for tool registration

### Current Strengths

1. **Multi-transport support**: stdio, HTTP, SSE, WebSocket all supported
2. **Circuit breaker pattern**: Prevents cascading failures
3. **Token bucket rate limiting**: Sophisticated rate limiting for HTTP transport
4. **OAuth 2.1 support**: Full OAuth flow with PKCE
5. **Health monitoring**: Automatic health checks and restart
6. **HITL safety**: Tool execution confirmation for dangerous operations
7. **Parallel server loading**: Concurrent MCP configuration loading

---

## Existing NeuroLink Features

> **Important Note**: NeuroLink already has a comprehensive MCP implementation that rivals or exceeds many features described in this document. Before implementing any "new" features, verify they do not already exist in the codebase.

### Complete MCP Stack Already Implemented

NeuroLink's MCP implementation is production-ready with the following existing components:

| Feature                     | File                                       | Status                                         |
| --------------------------- | ------------------------------------------ | ---------------------------------------------- |
| **4 Transport Protocols**   | `/src/lib/mcp/mcpClientFactory.ts`         | Complete (stdio, http, sse, websocket)         |
| **Circuit Breaker**         | `/src/lib/mcp/mcpCircuitBreaker.ts`        | Complete (fault tolerance, failure protection) |
| **Rate Limiting**           | `/src/lib/mcp/httpRateLimiter.ts`          | Complete (token bucket algorithm)              |
| **OAuth 2.0 with PKCE**     | `/src/lib/mcp/auth/oauthClientProvider.ts` | Complete (full OAuth flow)                     |
| **Tool Registry**           | `/src/lib/mcp/toolRegistry.ts`             | Complete (centralized tool management)         |
| **External Server Manager** | `/src/lib/mcp/externalServerManager.ts`    | Complete (lifecycle management)                |
| **Tool Discovery**          | `/src/lib/mcp/toolDiscoveryService.ts`     | Complete (automatic registration)              |
| **Health Monitoring**       | `/src/lib/mcp/externalServerManager.ts`    | Complete (auto health checks)                  |

### Transport Protocol Support

```typescript
// Already supported in MCPTransportType
export type MCPTransportType =
  | "stdio" // Local subprocess via stdin/stdout
  | "sse" // Server-Sent Events
  | "websocket" // WebSocket connections
  | "http" // HTTP/Streamable HTTP
  | "ws" // WebSocket alias
  | "tcp" // TCP connections
  | "unix"; // Unix sockets
```

### Authentication Support Already Implemented

```typescript
// From MCPServerInfo in /src/lib/types/mcpTypes.ts
auth?: {
  type: "oauth2" | "bearer" | "api-key";
  oauth?: {
    clientId: string;
    clientSecret?: string;
    authorizationUrl: string;
    tokenUrl: string;
    redirectUrl: string;
    scope?: string;
    usePKCE?: boolean;  // PKCE support included
  };
  token?: string;
  apiKey?: string;
  apiKeyHeader?: string;
};
```

### What This Document Proposes vs What Exists

| Proposed Feature        | Existing Implementation                          | Action Required                         |
| ----------------------- | ------------------------------------------------ | --------------------------------------- |
| Multi-transport support | Already complete in `mcpClientFactory.ts`        | None - already implemented              |
| Circuit breaker         | Already complete in `mcpCircuitBreaker.ts`       | None - already implemented              |
| Rate limiting           | Already complete in `httpRateLimiter.ts`         | None - already implemented              |
| OAuth 2.1               | Mostly complete in `auth/oauthClientProvider.ts` | Add Resource Indicators (RFC 8707) only |
| MCPServerBase class     | Not implemented                                  | New feature needed                      |
| Tool annotations        | Partial (HITL patterns exist)                    | Extend existing patterns                |
| Agent/Workflow exposure | Not implemented                                  | New feature needed                      |
| Elicitation protocol    | Not implemented                                  | New feature needed                      |

---

## Gap Analysis vs Mastra

### Features Mastra Has That NeuroLink Needs

| Feature                    | Mastra                            | NeuroLink Current     | Gap                     |
| -------------------------- | --------------------------------- | --------------------- | ----------------------- |
| MCPServerBase class        | Abstract base class for servers   | Factory function only | Need base class         |
| Tool annotations           | readOnly, destructive, idempotent | HITL danger patterns  | Need annotation system  |
| Agent as tool exposure     | Full support                      | Not available         | Need implementation     |
| Workflow as tool exposure  | Full support                      | Not available         | Need implementation     |
| Elicitation protocol       | Interactive user input            | CLI-only via HITL     | Need SDK support        |
| Tool conversion helpers    | toTool() method                   | Manual registration   | Need conversion helpers |
| Server resource management | Unified resources API             | Per-server only       | Need unification        |

### Implementation Priority

1. **High Priority**: MCPServerBase class, Tool annotations, Elicitation protocol
2. **Medium Priority**: Agent/Workflow exposure, Tool conversion helpers
3. **Lower Priority**: Unified resource management, Advanced caching

---

## MCPServerBase Class

### Design Goals

- Provide abstract base class for creating custom MCP servers
- Enable consistent tool exposure patterns
- Support both SDK and CLI usage
- Integrate with existing NeuroLink patterns

### Interface Design

````typescript
// /src/lib/mcp/mcpServerBase.ts

import { EventEmitter } from "events";
import type { JsonObject, JsonValue } from "../types/common.js";
import type {
  MCPServerInfo,
  MCPTransportType,
  MCPServerCategory,
  NeuroLinkMCPTool,
  NeuroLinkExecutionContext,
  ToolResult,
} from "../types/mcpTypes.js";

/**
 * Tool annotation metadata for MCP tools
 * Provides hints to AI models about tool behavior and safety
 */
export type MCPToolAnnotations = {
  /**
   * Human-readable title for the tool
   */
  title?: string;

  /**
   * Whether the tool only reads data without side effects
   * When true, AI models may call more freely for information gathering
   */
  readOnlyHint?: boolean;

  /**
   * Whether the tool performs destructive operations
   * When true, requires additional confirmation before execution
   */
  destructiveHint?: boolean;

  /**
   * Whether the tool can be safely retried without side effects
   * When true, automatic retry is safe on failure
   */
  idempotentHint?: boolean;

  /**
   * Whether the tool requires user confirmation before execution
   * When true, triggers HITL confirmation flow
   */
  requiresConfirmation?: boolean;

  /**
   * Custom tags for categorization and filtering
   */
  tags?: string[];

  /**
   * Estimated execution time in milliseconds
   */
  estimatedDuration?: number;

  /**
   * Rate limit hint (calls per minute)
   */
  rateLimitHint?: number;
};

/**
 * Enhanced tool definition with annotations
 */
export type MCPServerTool = NeuroLinkMCPTool & {
  /**
   * Tool behavior annotations
   */
  annotations?: MCPToolAnnotations;

  /**
   * Output schema for result validation
   */
  outputSchema?: JsonObject;
};

/**
 * MCPServerBase configuration
 */
export type MCPServerBaseConfig = {
  /**
   * Unique server identifier
   */
  id: string;

  /**
   * Human-readable server name
   */
  name: string;

  /**
   * Server description
   */
  description?: string;

  /**
   * Server version
   */
  version?: string;

  /**
   * Server category for organization
   */
  category?: MCPServerCategory;

  /**
   * Transport protocol preference
   */
  transport?: MCPTransportType;

  /**
   * Custom metadata
   */
  metadata?: Record<string, JsonValue>;

  /**
   * Global tool annotations applied to all tools
   */
  defaultAnnotations?: MCPToolAnnotations;
};

/**
 * Server lifecycle events
 */
export type MCPServerEvents = {
  toolRegistered: { toolName: string; tool: MCPServerTool };
  toolExecuted: { toolName: string; duration: number; success: boolean };
  toolError: { toolName: string; error: Error };
  serverReady: { tools: string[] };
  serverStopped: { reason?: string };
};

/**
 * Abstract base class for MCP servers
 *
 * Provides a foundation for creating custom MCP servers with consistent
 * patterns for tool registration, execution, and lifecycle management.
 *
 * @example
 * ```typescript
 * class MyCustomServer extends MCPServerBase {
 *   constructor() {
 *     super({
 *       id: "my-custom-server",
 *       name: "My Custom Server",
 *       description: "Provides custom functionality",
 *       category: "custom",
 *     });
 *
 *     // Register tools in constructor or init
 *     this.registerTool({
 *       name: "myTool",
 *       description: "Does something useful",
 *       annotations: {
 *         readOnlyHint: true,
 *         idempotentHint: true,
 *       },
 *       execute: async (params, context) => {
 *         return { success: true, data: "result" };
 *       },
 *     });
 *   }
 * }
 * ```
 */
export abstract class MCPServerBase extends EventEmitter {
  protected readonly config: Required<MCPServerBaseConfig>;
  protected readonly tools: Map<string, MCPServerTool> = new Map();
  protected isInitialized = false;
  protected isRunning = false;

  constructor(config: MCPServerBaseConfig) {
    super();

    // Apply defaults
    this.config = {
      id: config.id,
      name: config.name,
      description: config.description ?? "",
      version: config.version ?? "1.0.0",
      category: config.category ?? "custom",
      transport: config.transport ?? "stdio",
      metadata: config.metadata ?? {},
      defaultAnnotations: config.defaultAnnotations ?? {},
    };
  }

  /**
   * Initialize the server
   * Override in subclasses for async initialization
   */
  async init(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    await this.onInit();
    this.isInitialized = true;

    this.emit("serverReady", {
      tools: Array.from(this.tools.keys()),
    });
  }

  /**
   * Hook for subclass initialization
   * Override to perform async setup
   */
  protected async onInit(): Promise<void> {
    // Override in subclasses
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    if (!this.isInitialized) {
      await this.init();
    }

    if (this.isRunning) {
      return;
    }

    await this.onStart();
    this.isRunning = true;
  }

  /**
   * Hook for subclass start logic
   */
  protected async onStart(): Promise<void> {
    // Override in subclasses
  }

  /**
   * Stop the server
   */
  async stop(reason?: string): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    await this.onStop();
    this.isRunning = false;

    this.emit("serverStopped", { reason });
  }

  /**
   * Hook for subclass stop logic
   */
  protected async onStop(): Promise<void> {
    // Override in subclasses
  }

  /**
   * Register a tool with the server
   */
  registerTool(tool: MCPServerTool): this {
    // Validate tool
    this.validateTool(tool);

    // Merge with default annotations
    const mergedTool: MCPServerTool = {
      ...tool,
      annotations: {
        ...this.config.defaultAnnotations,
        ...tool.annotations,
      },
    };

    this.tools.set(tool.name, mergedTool);

    this.emit("toolRegistered", {
      toolName: tool.name,
      tool: mergedTool,
    });

    return this;
  }

  /**
   * Register multiple tools at once
   */
  registerTools(tools: MCPServerTool[]): this {
    for (const tool of tools) {
      this.registerTool(tool);
    }
    return this;
  }

  /**
   * Validate tool configuration
   */
  protected validateTool(tool: MCPServerTool): void {
    if (!tool.name || typeof tool.name !== "string") {
      throw new Error("Tool name is required and must be a string");
    }

    if (tool.name.length > 64) {
      throw new Error("Tool name must be 64 characters or less");
    }

    if (!/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(tool.name)) {
      throw new Error(
        "Tool name must start with a letter or underscore and contain only alphanumeric characters, underscores, and hyphens",
      );
    }

    if (!tool.description || typeof tool.description !== "string") {
      throw new Error("Tool description is required and must be a string");
    }

    if (typeof tool.execute !== "function") {
      throw new Error("Tool execute function is required");
    }

    if (this.tools.has(tool.name)) {
      throw new Error(`Tool '${tool.name}' is already registered`);
    }
  }

  /**
   * Execute a tool by name
   */
  async executeTool(
    toolName: string,
    params: unknown,
    context?: NeuroLinkExecutionContext,
  ): Promise<ToolResult> {
    const tool = this.tools.get(toolName);

    if (!tool) {
      return {
        success: false,
        error: `Tool '${toolName}' not found on server '${this.config.id}'`,
        metadata: {
          toolName,
          serverId: this.config.id,
        },
      };
    }

    const startTime = Date.now();

    try {
      // Check if confirmation is required
      if (tool.annotations?.requiresConfirmation) {
        // This would integrate with HITL manager
        // For now, just log the requirement
        console.log(`Tool '${toolName}' requires confirmation`);
      }

      const result = await tool.execute(params, context ?? {});
      const duration = Date.now() - startTime;

      this.emit("toolExecuted", {
        toolName,
        duration,
        success: true,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.emit("toolError", {
        toolName,
        error: error instanceof Error ? error : new Error(String(error)),
      });

      this.emit("toolExecuted", {
        toolName,
        duration,
        success: false,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          toolName,
          serverId: this.config.id,
          executionTime: duration,
        },
      };
    }
  }

  /**
   * Get all registered tools
   */
  getTools(): MCPServerTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get a specific tool by name
   */
  getTool(name: string): MCPServerTool | undefined {
    return this.tools.get(name);
  }

  /**
   * Check if a tool exists
   */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Remove a tool
   */
  removeTool(name: string): boolean {
    return this.tools.delete(name);
  }

  /**
   * Get server info in MCPServerInfo format
   */
  toServerInfo(): MCPServerInfo {
    return {
      id: this.config.id,
      name: this.config.name,
      description: this.config.description,
      transport: this.config.transport,
      status: this.isRunning ? "connected" : "stopped",
      tools: this.getTools().map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema as object | undefined,
        execute: tool.execute,
      })),
      metadata: {
        ...this.config.metadata,
        category: this.config.category,
        version: this.config.version,
      },
    };
  }

  /**
   * Get tools filtered by annotations
   */
  getToolsByAnnotation(
    annotation: keyof MCPToolAnnotations,
    value: boolean | string | number | string[],
  ): MCPServerTool[] {
    return this.getTools().filter((tool) => {
      const annotationValue = tool.annotations?.[annotation];
      if (Array.isArray(value) && Array.isArray(annotationValue)) {
        return value.some((v) => annotationValue.includes(v));
      }
      return annotationValue === value;
    });
  }

  /**
   * Get read-only tools
   */
  getReadOnlyTools(): MCPServerTool[] {
    return this.getToolsByAnnotation("readOnlyHint", true);
  }

  /**
   * Get destructive tools
   */
  getDestructiveTools(): MCPServerTool[] {
    return this.getToolsByAnnotation("destructiveHint", true);
  }

  /**
   * Get idempotent tools
   */
  getIdempotentTools(): MCPServerTool[] {
    return this.getToolsByAnnotation("idempotentHint", true);
  }

  /**
   * Server identification
   */
  get id(): string {
    return this.config.id;
  }

  get name(): string {
    return this.config.name;
  }

  get description(): string {
    return this.config.description;
  }

  get version(): string {
    return this.config.version;
  }

  get category(): MCPServerCategory {
    return this.config.category;
  }
}
````

### Usage Example

```typescript
import { MCPServerBase, MCPServerTool } from "../mcp/mcpServerBase.js";

/**
 * Example: Database operations MCP server
 */
class DatabaseMCPServer extends MCPServerBase {
  private db: DatabaseConnection;

  constructor(connectionString: string) {
    super({
      id: "database-server",
      name: "Database Operations",
      description: "Provides database query and manipulation tools",
      category: "data",
      defaultAnnotations: {
        requiresConfirmation: false,
      },
    });

    this.db = new DatabaseConnection(connectionString);
  }

  protected async onInit(): Promise<void> {
    await this.db.connect();

    // Register read-only query tool
    this.registerTool({
      name: "query",
      description: "Execute a read-only SQL query",
      inputSchema: {
        type: "object",
        properties: {
          sql: { type: "string", description: "SQL query to execute" },
          params: { type: "array", description: "Query parameters" },
        },
        required: ["sql"],
      },
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        title: "Execute Query",
      },
      execute: async (params) => {
        const { sql, params: queryParams } = params as {
          sql: string;
          params?: unknown[];
        };
        const results = await this.db.query(sql, queryParams);
        return { success: true, data: results };
      },
    });

    // Register destructive mutation tool
    this.registerTool({
      name: "execute",
      description: "Execute a SQL statement that modifies data",
      inputSchema: {
        type: "object",
        properties: {
          sql: { type: "string", description: "SQL statement to execute" },
          params: { type: "array", description: "Statement parameters" },
        },
        required: ["sql"],
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        requiresConfirmation: true,
        title: "Execute Statement",
      },
      execute: async (params) => {
        const { sql, params: stmtParams } = params as {
          sql: string;
          params?: unknown[];
        };
        const result = await this.db.execute(sql, stmtParams);
        return { success: true, data: result };
      },
    });
  }

  protected async onStop(): Promise<void> {
    await this.db.disconnect();
  }
}
```

---

## MCP Server Features

### Tool Conversion and Exposure

#### Converting NeuroLink Tools to MCP Format

```typescript
// /src/lib/mcp/toolConverter.ts

import type { ToolDefinition, ToolResult, ToolArgs } from "../types/tools.js";
import type { MCPServerTool, MCPToolAnnotations } from "./mcpServerBase.js";
import type { NeuroLinkExecutionContext } from "../types/mcpTypes.js";

/**
 * Options for converting a NeuroLink tool to MCP format
 */
export type ToolConversionOptions = {
  /**
   * Override the tool name
   */
  name?: string;

  /**
   * Override the description
   */
  description?: string;

  /**
   * Tool annotations to apply
   */
  annotations?: MCPToolAnnotations;

  /**
   * Server ID this tool belongs to
   */
  serverId?: string;
};

/**
 * Convert a NeuroLink tool definition to MCP server tool format
 */
export function toMCPTool(
  tool: ToolDefinition,
  name: string,
  options: ToolConversionOptions = {},
): MCPServerTool {
  return {
    name: options.name ?? name,
    description: options.description ?? tool.description,
    inputSchema: convertSchema(tool.parameters),
    annotations: options.annotations ?? inferAnnotations(tool),
    execute: async (params: unknown, context?: NeuroLinkExecutionContext) => {
      const result = await tool.execute(params as ToolArgs, {
        sessionId: context?.sessionId,
        userId: context?.userId,
        aiProvider: context?.aiProvider,
      });
      return result;
    },
    metadata: {
      serverId: options.serverId,
      convertedFrom: "neurolink-tool",
    },
  };
}

/**
 * Convert Zod schema to JSON Schema for MCP
 */
function convertSchema(parameters: unknown): object | undefined {
  if (!parameters) {
    return undefined;
  }

  // If it's already JSON Schema, return as-is
  if (
    typeof parameters === "object" &&
    parameters !== null &&
    "type" in parameters
  ) {
    return parameters as object;
  }

  // If it's a Zod schema, convert it
  // This requires zod-to-json-schema or similar
  try {
    const { zodToJsonSchema } = require("zod-to-json-schema");
    return zodToJsonSchema(parameters);
  } catch {
    // Fallback: return undefined if conversion fails
    return undefined;
  }
}

/**
 * Infer annotations from tool definition
 */
function inferAnnotations(tool: ToolDefinition): MCPToolAnnotations {
  const description = tool.description.toLowerCase();

  return {
    // Infer read-only from description
    readOnlyHint:
      description.includes("get") ||
      description.includes("list") ||
      description.includes("read") ||
      description.includes("fetch") ||
      description.includes("query"),

    // Infer destructive from description
    destructiveHint:
      description.includes("delete") ||
      description.includes("remove") ||
      description.includes("drop") ||
      description.includes("destroy") ||
      description.includes("clear"),

    // Infer idempotent from description
    idempotentHint:
      description.includes("set") ||
      description.includes("update") ||
      description.includes("put") ||
      (description.includes("get") && !description.includes("create")),
  };
}

/**
 * Convert multiple tools at once
 */
export function toMCPTools(
  tools: Record<string, ToolDefinition>,
  serverId?: string,
): MCPServerTool[] {
  return Object.entries(tools).map(([name, tool]) =>
    toMCPTool(tool, name, { serverId }),
  );
}
```

### Agent Exposure as Tools

````typescript
// /src/lib/mcp/agentExposure.ts

import type { Agent } from "../agent/types.js";
import type { MCPServerTool, MCPToolAnnotations } from "./mcpServerBase.js";
import type {
  NeuroLinkExecutionContext,
  ToolResult,
} from "../types/mcpTypes.js";

/**
 * Options for exposing an agent as an MCP tool
 */
export type AgentExposureOptions = {
  /**
   * Tool name (defaults to agent name)
   */
  name?: string;

  /**
   * Tool description (defaults to agent description)
   */
  description?: string;

  /**
   * Custom annotations
   */
  annotations?: MCPToolAnnotations;

  /**
   * Maximum execution time in milliseconds
   */
  maxExecutionTime?: number;

  /**
   * Whether to include agent's tool results in output
   */
  includeToolResults?: boolean;
};

/**
 * Expose a NeuroLink agent as an MCP tool
 *
 * This allows agents to be used as tools by other agents or workflows,
 * enabling hierarchical agent architectures.
 *
 * @example
 * ```typescript
 * const researchAgent = new Agent({
 *   name: "researcher",
 *   instructions: "Research topics thoroughly",
 *   tools: [webSearchTool, readFileTool],
 * });
 *
 * const researchTool = exposeAgentAsTool(researchAgent, {
 *   name: "research",
 *   description: "Delegate research tasks to a specialized agent",
 *   annotations: {
 *     readOnlyHint: true,
 *     estimatedDuration: 30000,
 *   },
 * });
 *
 * // Use in another agent
 * const orchestratorAgent = new Agent({
 *   name: "orchestrator",
 *   tools: [researchTool, writingTool],
 * });
 * ```
 */
export function exposeAgentAsTool(
  agent: Agent,
  options: AgentExposureOptions = {},
): MCPServerTool {
  const toolName = options.name ?? `agent_${agent.name}`;
  const description =
    options.description ??
    `Delegate to ${agent.name} agent: ${agent.description ?? "Specialized agent for complex tasks"}`;

  return {
    name: toolName,
    description,
    inputSchema: {
      type: "object",
      properties: {
        task: {
          type: "string",
          description: "The task or question to delegate to the agent",
        },
        context: {
          type: "object",
          description: "Additional context for the agent",
          additionalProperties: true,
        },
        maxSteps: {
          type: "number",
          description: "Maximum steps the agent can take",
          default: 10,
        },
      },
      required: ["task"],
    },
    annotations: {
      readOnlyHint: true, // Agents typically gather information
      idempotentHint: false, // Agent behavior may vary
      estimatedDuration: options.maxExecutionTime ?? 60000,
      ...options.annotations,
    },
    execute: async (
      params: unknown,
      context?: NeuroLinkExecutionContext,
    ): Promise<ToolResult> => {
      const {
        task,
        context: taskContext,
        maxSteps,
      } = params as {
        task: string;
        context?: Record<string, unknown>;
        maxSteps?: number;
      };

      const startTime = Date.now();

      try {
        const result = await agent.run({
          prompt: task,
          context: taskContext,
          maxSteps: maxSteps ?? 10,
          sessionId: context?.sessionId,
        });

        return {
          success: true,
          data: {
            response: result.response,
            toolResults: options.includeToolResults
              ? result.toolExecutions
              : undefined,
            steps: result.steps,
          },
          metadata: {
            agentName: agent.name,
            executionTime: Date.now() - startTime,
            toolName,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          metadata: {
            agentName: agent.name,
            executionTime: Date.now() - startTime,
            toolName,
          },
        };
      }
    },
    metadata: {
      agentName: agent.name,
      exposedAs: "tool",
    },
  };
}

/**
 * Expose multiple agents as tools
 */
export function exposeAgentsAsTools(
  agents: Agent[],
  defaultOptions?: Partial<AgentExposureOptions>,
): MCPServerTool[] {
  return agents.map((agent) =>
    exposeAgentAsTool(agent, {
      ...defaultOptions,
    }),
  );
}
````

### Workflow Exposure as Tools

````typescript
// /src/lib/mcp/workflowExposure.ts

import type { Workflow, WorkflowResult } from "../workflow/types.js";
import type { MCPServerTool, MCPToolAnnotations } from "./mcpServerBase.js";
import type {
  NeuroLinkExecutionContext,
  ToolResult,
} from "../types/mcpTypes.js";

/**
 * Options for exposing a workflow as an MCP tool
 */
export type WorkflowExposureOptions = {
  /**
   * Tool name (defaults to workflow name)
   */
  name?: string;

  /**
   * Tool description (defaults to workflow description)
   */
  description?: string;

  /**
   * Custom annotations
   */
  annotations?: MCPToolAnnotations;

  /**
   * Whether to include intermediate step results
   */
  includeStepResults?: boolean;

  /**
   * Input parameter mapping from tool params to workflow trigger data
   */
  inputMapping?: (params: unknown) => Record<string, unknown>;

  /**
   * Output mapping from workflow result to tool result
   */
  outputMapping?: (result: WorkflowResult) => unknown;
};

/**
 * Expose a NeuroLink workflow as an MCP tool
 *
 * This enables complex multi-step processes to be invoked as simple tools,
 * hiding workflow complexity from consuming agents.
 *
 * @example
 * ```typescript
 * const dataProcessingWorkflow = new Workflow({
 *   name: "data-processing",
 *   steps: [
 *     { name: "fetch", action: fetchDataAction },
 *     { name: "validate", action: validateDataAction },
 *     { name: "transform", action: transformDataAction },
 *     { name: "store", action: storeDataAction },
 *   ],
 * });
 *
 * const processTool = exposeWorkflowAsTool(dataProcessingWorkflow, {
 *   name: "processData",
 *   description: "Process and store data from a source",
 *   annotations: {
 *     destructiveHint: true, // stores data
 *     idempotentHint: false,
 *   },
 * });
 * ```
 */
export function exposeWorkflowAsTool(
  workflow: Workflow,
  options: WorkflowExposureOptions = {},
): MCPServerTool {
  const toolName = options.name ?? `workflow_${workflow.name}`;
  const description =
    options.description ??
    `Execute ${workflow.name} workflow: ${workflow.description ?? "Multi-step automated process"}`;

  // Build input schema from workflow trigger schema or default
  const inputSchema = workflow.triggerSchema ?? {
    type: "object",
    properties: {
      data: {
        type: "object",
        description: "Input data for the workflow",
        additionalProperties: true,
      },
    },
    required: ["data"],
  };

  return {
    name: toolName,
    description,
    inputSchema,
    annotations: {
      idempotentHint: false, // Workflows typically have side effects
      estimatedDuration: calculateEstimatedDuration(workflow),
      ...options.annotations,
    },
    execute: async (
      params: unknown,
      context?: NeuroLinkExecutionContext,
    ): Promise<ToolResult> => {
      const startTime = Date.now();

      try {
        // Map input parameters
        const triggerData = options.inputMapping
          ? options.inputMapping(params)
          : (params as Record<string, unknown>);

        // Execute workflow
        const result = await workflow.execute({
          trigger: {
            type: "tool",
            data: triggerData,
          },
          context: {
            sessionId: context?.sessionId,
            userId: context?.userId,
          },
        });

        // Map output
        const outputData = options.outputMapping
          ? options.outputMapping(result)
          : result.output;

        return {
          success: result.success,
          data: {
            output: outputData,
            stepResults: options.includeStepResults
              ? result.stepResults
              : undefined,
            duration: result.duration,
          },
          metadata: {
            workflowName: workflow.name,
            executionTime: Date.now() - startTime,
            toolName,
            stepsExecuted: result.stepsExecuted,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          metadata: {
            workflowName: workflow.name,
            executionTime: Date.now() - startTime,
            toolName,
          },
        };
      }
    },
    metadata: {
      workflowName: workflow.name,
      stepCount: workflow.steps.length,
      exposedAs: "tool",
    },
  };
}

/**
 * Calculate estimated duration based on workflow steps
 */
function calculateEstimatedDuration(workflow: Workflow): number {
  // Default to 5 seconds per step
  const perStepEstimate = 5000;
  return workflow.steps.length * perStepEstimate;
}
````

---

## Transport Protocols

### Current Implementation Analysis

NeuroLink already has comprehensive transport support in `/src/lib/mcp/mcpClientFactory.ts`:

```typescript
// Current transport creation in MCPClientFactory

private static async createTransport(
  config: MCPServerInfo,
): Promise<TransportResult> {
  switch (config.transport) {
    case "stdio":
      return this.createStdioTransport(config);
    case "sse":
      return this.createSSETransport(config);
    case "websocket":
      return this.createWebSocketTransport(config);
    case "http":
      return this.createHTTPTransport(config);
    default:
      throw new Error(`Unsupported transport type: ${config.transport}`);
  }
}
```

### Enhanced Transport Configuration

```typescript
// /src/lib/types/mcpTransportTypes.ts

import type { MCPServerInfo } from "./mcpTypes.js";

/**
 * Enhanced stdio transport configuration
 */
export type StdioTransportConfig = {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  /**
   * Suppress stderr output (default: true)
   */
  suppressStderr?: boolean;
  /**
   * Shell to use for command execution
   */
  shell?: boolean | string;
  /**
   * Signal to use for process termination
   */
  killSignal?: NodeJS.Signals;
};

/**
 * Enhanced HTTP transport configuration
 */
export type HTTPTransportConfig = {
  url: string;
  headers?: Record<string, string>;
  /**
   * Connection timeout in milliseconds
   */
  connectionTimeout?: number;
  /**
   * Request timeout in milliseconds
   */
  requestTimeout?: number;
  /**
   * Idle timeout for connection pool
   */
  idleTimeout?: number;
  /**
   * Keep-alive timeout
   */
  keepAliveTimeout?: number;
  /**
   * Enable compression
   */
  compression?: boolean;
  /**
   * TLS/SSL options
   */
  tls?: {
    rejectUnauthorized?: boolean;
    ca?: string;
    cert?: string;
    key?: string;
  };
};

/**
 * Enhanced SSE transport configuration
 */
export type SSETransportConfig = {
  url: string;
  headers?: Record<string, string>;
  /**
   * Reconnect delay in milliseconds
   */
  reconnectDelay?: number;
  /**
   * Maximum reconnect attempts
   */
  maxReconnectAttempts?: number;
  /**
   * Event types to listen for
   */
  eventTypes?: string[];
};

/**
 * Enhanced WebSocket transport configuration
 */
export type WebSocketTransportConfig = {
  url: string;
  headers?: Record<string, string>;
  /**
   * Ping interval in milliseconds
   */
  pingInterval?: number;
  /**
   * Pong timeout in milliseconds
   */
  pongTimeout?: number;
  /**
   * Maximum payload size in bytes
   */
  maxPayloadSize?: number;
  /**
   * Enable per-message deflate compression
   */
  perMessageDeflate?: boolean;
};

/**
 * Unified transport configuration
 */
export type TransportConfig =
  | { type: "stdio"; config: StdioTransportConfig }
  | { type: "http"; config: HTTPTransportConfig }
  | { type: "sse"; config: SSETransportConfig }
  | { type: "websocket"; config: WebSocketTransportConfig };

/**
 * Create MCPServerInfo from transport config
 */
export function createServerInfoFromTransport(
  id: string,
  name: string,
  transport: TransportConfig,
): MCPServerInfo {
  const base: Partial<MCPServerInfo> = {
    id,
    name,
    description: `MCP Server: ${name}`,
    status: "initializing",
    tools: [],
  };

  switch (transport.type) {
    case "stdio":
      return {
        ...base,
        transport: "stdio",
        command: transport.config.command,
        args: transport.config.args,
        env: transport.config.env,
        cwd: transport.config.cwd,
      } as MCPServerInfo;

    case "http":
      return {
        ...base,
        transport: "http",
        url: transport.config.url,
        headers: transport.config.headers,
        httpOptions: {
          connectionTimeout: transport.config.connectionTimeout,
          requestTimeout: transport.config.requestTimeout,
          idleTimeout: transport.config.idleTimeout,
          keepAliveTimeout: transport.config.keepAliveTimeout,
        },
      } as MCPServerInfo;

    case "sse":
      return {
        ...base,
        transport: "sse",
        url: transport.config.url,
        headers: transport.config.headers,
      } as MCPServerInfo;

    case "websocket":
      return {
        ...base,
        transport: "websocket",
        url: transport.config.url,
        headers: transport.config.headers,
      } as MCPServerInfo;
  }
}
```

---

## MCP Client Enhancements

### Multi-Server Manager

```typescript
// /src/lib/mcp/multiServerManager.ts

import { EventEmitter } from "events";
import type { MCPServerInfo, MCPToolInfo } from "../types/mcpTypes.js";
import type { MCPServerTool } from "./mcpServerBase.js";
import { ExternalServerManager } from "./externalServerManager.js";
import { MCPToolRegistry } from "./toolRegistry.js";
import { mcpLogger } from "../utils/logger.js";

/**
 * Server group for logical organization
 */
export type ServerGroup = {
  name: string;
  description?: string;
  serverIds: string[];
  priority?: number;
};

/**
 * Tool routing configuration
 */
export type ToolRoutingConfig = {
  /**
   * Prefer tools from specific servers
   */
  preferredServers?: string[];

  /**
   * Exclude tools from specific servers
   */
  excludedServers?: string[];

  /**
   * Route by tool category
   */
  categoryRouting?: Record<string, string[]>;

  /**
   * Load balancing strategy
   */
  loadBalancing?: "round-robin" | "least-connections" | "random" | "priority";
};

/**
 * Multi-server manager events
 */
export type MultiServerManagerEvents = {
  serverAdded: { serverId: string; serverInfo: MCPServerInfo };
  serverRemoved: { serverId: string };
  toolsUpdated: { serverId: string; tools: MCPToolInfo[] };
  healthCheckCompleted: { healthy: string[]; unhealthy: string[] };
  loadBalanceUpdated: { serverId: string; connections: number };
};

/**
 * Enhanced multi-server manager with advanced routing and load balancing
 */
export class MultiServerManager extends EventEmitter {
  private externalManager: ExternalServerManager;
  private toolRegistry: MCPToolRegistry;
  private serverGroups: Map<string, ServerGroup> = new Map();
  private routingConfig: ToolRoutingConfig = {};
  private serverConnections: Map<string, number> = new Map();
  private roundRobinIndex = 0;

  constructor(
    externalManager?: ExternalServerManager,
    toolRegistry?: MCPToolRegistry,
  ) {
    super();
    this.externalManager = externalManager ?? new ExternalServerManager();
    this.toolRegistry = toolRegistry ?? new MCPToolRegistry();

    this.setupEventForwarding();
  }

  private setupEventForwarding(): void {
    this.externalManager.on("connected", (event) => {
      this.emit("serverAdded", {
        serverId: event.serverId,
        serverInfo: this.externalManager.getServer(event.serverId)!,
      });
      this.serverConnections.set(event.serverId, 0);
    });

    this.externalManager.on("disconnected", (event) => {
      this.emit("serverRemoved", { serverId: event.serverId });
      this.serverConnections.delete(event.serverId);
    });
  }

  /**
   * Add a server to the manager
   */
  async addServer(
    serverId: string,
    config: MCPServerInfo,
    groupName?: string,
  ): Promise<void> {
    const result = await this.externalManager.addServer(serverId, config);

    if (!result.success) {
      throw new Error(`Failed to add server ${serverId}: ${result.error}`);
    }

    // Add to group if specified
    if (groupName) {
      this.addServerToGroup(serverId, groupName);
    }

    mcpLogger.info(`[MultiServerManager] Added server: ${serverId}`);
  }

  /**
   * Remove a server from the manager
   */
  async removeServer(serverId: string): Promise<void> {
    await this.externalManager.removeServer(serverId);

    // Remove from all groups
    for (const group of this.serverGroups.values()) {
      const index = group.serverIds.indexOf(serverId);
      if (index !== -1) {
        group.serverIds.splice(index, 1);
      }
    }

    mcpLogger.info(`[MultiServerManager] Removed server: ${serverId}`);
  }

  /**
   * Create a server group
   */
  createGroup(
    name: string,
    description?: string,
    priority?: number,
  ): ServerGroup {
    const group: ServerGroup = {
      name,
      description,
      serverIds: [],
      priority: priority ?? 0,
    };

    this.serverGroups.set(name, group);
    return group;
  }

  /**
   * Add a server to a group
   */
  addServerToGroup(serverId: string, groupName: string): void {
    let group = this.serverGroups.get(groupName);

    if (!group) {
      group = this.createGroup(groupName);
    }

    if (!group.serverIds.includes(serverId)) {
      group.serverIds.push(serverId);
    }
  }

  /**
   * Set tool routing configuration
   */
  setRoutingConfig(config: ToolRoutingConfig): void {
    this.routingConfig = config;
  }

  /**
   * Get best server for a tool based on routing config
   */
  getBestServerForTool(toolName: string): string | undefined {
    const availableServers = this.getServersWithTool(toolName);

    if (availableServers.length === 0) {
      return undefined;
    }

    // Apply routing rules
    let candidates = availableServers;

    // Filter by preferred servers
    if (this.routingConfig.preferredServers?.length) {
      const preferred = candidates.filter((s) =>
        this.routingConfig.preferredServers!.includes(s),
      );
      if (preferred.length > 0) {
        candidates = preferred;
      }
    }

    // Filter by excluded servers
    if (this.routingConfig.excludedServers?.length) {
      candidates = candidates.filter(
        (s) => !this.routingConfig.excludedServers!.includes(s),
      );
    }

    if (candidates.length === 0) {
      return availableServers[0]; // Fallback to first available
    }

    // Apply load balancing
    return this.selectServerByLoadBalancing(candidates);
  }

  private selectServerByLoadBalancing(candidates: string[]): string {
    const strategy = this.routingConfig.loadBalancing ?? "round-robin";

    switch (strategy) {
      case "round-robin":
        const server = candidates[this.roundRobinIndex % candidates.length];
        this.roundRobinIndex++;
        return server;

      case "least-connections":
        let minConnections = Infinity;
        let bestServer = candidates[0];
        for (const candidate of candidates) {
          const connections = this.serverConnections.get(candidate) ?? 0;
          if (connections < minConnections) {
            minConnections = connections;
            bestServer = candidate;
          }
        }
        return bestServer;

      case "random":
        return candidates[Math.floor(Math.random() * candidates.length)];

      case "priority":
        // Sort by group priority
        const serverPriorities = new Map<string, number>();
        for (const [, group] of this.serverGroups) {
          for (const serverId of group.serverIds) {
            const currentPriority = serverPriorities.get(serverId) ?? 0;
            serverPriorities.set(
              serverId,
              Math.max(currentPriority, group.priority ?? 0),
            );
          }
        }
        return candidates.sort(
          (a, b) =>
            (serverPriorities.get(b) ?? 0) - (serverPriorities.get(a) ?? 0),
        )[0];

      default:
        return candidates[0];
    }
  }

  /**
   * Get all servers that provide a specific tool
   */
  getServersWithTool(toolName: string): string[] {
    const servers: string[] = [];

    for (const [serverId, server] of this.externalManager.getAllServers()) {
      if (server.tools.has(toolName)) {
        servers.push(serverId);
      }
    }

    return servers;
  }

  /**
   * Execute a tool with automatic server selection
   */
  async executeTool(
    toolName: string,
    params: unknown,
    options?: {
      preferredServer?: string;
      timeout?: number;
    },
  ): Promise<unknown> {
    const serverId =
      options?.preferredServer ?? this.getBestServerForTool(toolName);

    if (!serverId) {
      throw new Error(`No server available for tool: ${toolName}`);
    }

    // Track connection
    const currentConnections = this.serverConnections.get(serverId) ?? 0;
    this.serverConnections.set(serverId, currentConnections + 1);

    try {
      const result = await this.externalManager.executeTool(
        serverId,
        toolName,
        params,
        { timeout: options?.timeout },
      );

      this.emit("loadBalanceUpdated", {
        serverId,
        connections: currentConnections + 1,
      });

      return result;
    } finally {
      // Release connection
      const updatedConnections = this.serverConnections.get(serverId) ?? 1;
      this.serverConnections.set(serverId, Math.max(0, updatedConnections - 1));
    }
  }

  /**
   * Get all available tools across all servers
   */
  getAllTools(): MCPToolInfo[] {
    return this.externalManager.getAllTools().map((tool) => ({
      name: tool.name,
      description: tool.description,
      serverId: tool.serverId,
      isExternal: true,
      inputSchema: tool.inputSchema,
    }));
  }

  /**
   * Health check all servers
   */
  async healthCheckAll(): Promise<{
    healthy: string[];
    unhealthy: string[];
  }> {
    const statuses = this.externalManager.getServerStatuses();

    const healthy: string[] = [];
    const unhealthy: string[] = [];

    for (const status of statuses) {
      if (status.isHealthy) {
        healthy.push(status.serverId);
      } else {
        unhealthy.push(status.serverId);
      }
    }

    this.emit("healthCheckCompleted", { healthy, unhealthy });

    return { healthy, unhealthy };
  }

  /**
   * Shutdown all servers
   */
  async shutdown(): Promise<void> {
    await this.externalManager.shutdown();
    this.serverGroups.clear();
    this.serverConnections.clear();
    this.roundRobinIndex = 0;
  }
}
```

---

## Elicitation Protocol

### Overview

The elicitation protocol enables MCP tools to request interactive user input during execution. This is essential for tools that need clarification, confirmation, or additional information mid-execution.

### Interface Design

```typescript
// /src/lib/mcp/elicitation/types.ts

import type { JsonValue, JsonObject } from "../../types/common.js";

/**
 * Elicitation request types
 */
export type ElicitationType =
  | "confirmation" // Yes/no confirmation
  | "text" // Free text input
  | "select" // Single selection from options
  | "multiselect" // Multiple selection from options
  | "form" // Structured form input
  | "file" // File selection/upload
  | "secret"; // Sensitive input (passwords, tokens)

/**
 * Base elicitation request
 */
export type ElicitationRequest = {
  /**
   * Unique request identifier
   */
  id: string;

  /**
   * Type of elicitation
   */
  type: ElicitationType;

  /**
   * Message to display to user
   */
  message: string;

  /**
   * Tool requesting the elicitation
   */
  toolName: string;

  /**
   * Server ID of the requesting tool
   */
  serverId?: string;

  /**
   * Request timeout in milliseconds
   */
  timeout?: number;

  /**
   * Whether the request can be skipped
   */
  optional?: boolean;

  /**
   * Default value if skipped or timed out
   */
  defaultValue?: JsonValue;

  /**
   * Additional context for the request
   */
  context?: JsonObject;
};

/**
 * Confirmation elicitation
 */
export type ConfirmationElicitation = ElicitationRequest & {
  type: "confirmation";
  /**
   * Confirm button label
   */
  confirmLabel?: string;
  /**
   * Cancel button label
   */
  cancelLabel?: string;
};

/**
 * Text input elicitation
 */
export type TextElicitation = ElicitationRequest & {
  type: "text";
  /**
   * Input placeholder
   */
  placeholder?: string;
  /**
   * Minimum length
   */
  minLength?: number;
  /**
   * Maximum length
   */
  maxLength?: number;
  /**
   * Validation regex pattern
   */
  pattern?: string;
  /**
   * Whether to allow multiline input
   */
  multiline?: boolean;
};

/**
 * Selection option
 */
export type SelectOption = {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
};

/**
 * Select elicitation
 */
export type SelectElicitation = ElicitationRequest & {
  type: "select";
  options: SelectOption[];
};

/**
 * Multi-select elicitation
 */
export type MultiSelectElicitation = ElicitationRequest & {
  type: "multiselect";
  options: SelectOption[];
  minSelections?: number;
  maxSelections?: number;
};

/**
 * Form field definition
 */
export type FormField = {
  name: string;
  label: string;
  type: "text" | "number" | "boolean" | "select" | "date";
  required?: boolean;
  defaultValue?: JsonValue;
  options?: SelectOption[]; // For select type
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
};

/**
 * Form elicitation
 */
export type FormElicitation = ElicitationRequest & {
  type: "form";
  fields: FormField[];
  submitLabel?: string;
};

/**
 * File elicitation
 */
export type FileElicitation = ElicitationRequest & {
  type: "file";
  /**
   * Accepted file types (MIME types or extensions)
   */
  accept?: string[];
  /**
   * Allow multiple files
   */
  multiple?: boolean;
  /**
   * Maximum file size in bytes
   */
  maxSize?: number;
};

/**
 * Secret elicitation
 */
export type SecretElicitation = ElicitationRequest & {
  type: "secret";
  /**
   * Hint about what secret is needed
   */
  hint?: string;
};

/**
 * Union of all elicitation types
 */
export type Elicitation =
  | ConfirmationElicitation
  | TextElicitation
  | SelectElicitation
  | MultiSelectElicitation
  | FormElicitation
  | FileElicitation
  | SecretElicitation;

/**
 * Elicitation response
 */
export type ElicitationResponse = {
  /**
   * Request ID this responds to
   */
  requestId: string;

  /**
   * Whether the user provided a response
   */
  responded: boolean;

  /**
   * The user's response value
   */
  value?: JsonValue;

  /**
   * Whether the request was cancelled
   */
  cancelled?: boolean;

  /**
   * Whether the request timed out
   */
  timedOut?: boolean;

  /**
   * Error message if response failed
   */
  error?: string;

  /**
   * Response timestamp
   */
  timestamp: number;
};
```

### Elicitation Manager

````typescript
// /src/lib/mcp/elicitation/elicitationManager.ts

import { EventEmitter } from "events";
import { randomUUID } from "crypto";
import type {
  Elicitation,
  ElicitationResponse,
  ElicitationType,
} from "./types.js";
import type { JsonValue } from "../../types/common.js";
import { mcpLogger } from "../../utils/logger.js";

/**
 * Elicitation handler function type
 */
export type ElicitationHandler = (
  request: Elicitation,
) => Promise<ElicitationResponse>;

/**
 * Elicitation manager configuration
 */
export type ElicitationManagerConfig = {
  /**
   * Default timeout for elicitation requests
   */
  defaultTimeout?: number;

  /**
   * Whether to allow elicitation (can be disabled for automated environments)
   */
  enabled?: boolean;

  /**
   * Handler for processing elicitation requests
   */
  handler?: ElicitationHandler;

  /**
   * Fallback behavior when no handler is available
   */
  fallbackBehavior?: "timeout" | "default" | "error";
};

/**
 * Manager for handling elicitation requests during tool execution
 *
 * The elicitation protocol allows MCP tools to request interactive user input
 * mid-execution. This is useful for:
 * - Confirming destructive operations
 * - Requesting missing information
 * - Getting user preferences
 * - Handling authentication challenges
 *
 * @example
 * ```typescript
 * const elicitationManager = new ElicitationManager({
 *   defaultTimeout: 60000,
 *   handler: async (request) => {
 *     // Implement UI prompt based on request type
 *     if (request.type === "confirmation") {
 *       const confirmed = await showConfirmDialog(request.message);
 *       return {
 *         requestId: request.id,
 *         responded: true,
 *         value: confirmed,
 *         timestamp: Date.now(),
 *       };
 *     }
 *     // Handle other types...
 *   },
 * });
 *
 * // Use in a tool
 * const response = await elicitationManager.request({
 *   type: "confirmation",
 *   message: "Are you sure you want to delete this file?",
 *   toolName: "deleteFile",
 * });
 *
 * if (response.value === true) {
 *   // Proceed with deletion
 * }
 * ```
 */
export class ElicitationManager extends EventEmitter {
  private config: Required<ElicitationManagerConfig>;
  private pendingRequests: Map<
    string,
    {
      request: Elicitation;
      resolve: (response: ElicitationResponse) => void;
      timer?: NodeJS.Timeout;
    }
  > = new Map();

  constructor(config: ElicitationManagerConfig = {}) {
    super();

    this.config = {
      defaultTimeout: config.defaultTimeout ?? 60000,
      enabled: config.enabled ?? true,
      handler: config.handler ?? this.defaultHandler.bind(this),
      fallbackBehavior: config.fallbackBehavior ?? "timeout",
    };
  }

  /**
   * Set the elicitation handler
   */
  setHandler(handler: ElicitationHandler): void {
    this.config.handler = handler;
  }

  /**
   * Enable or disable elicitation
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;

    if (!enabled) {
      // Resolve all pending requests with timeout/default
      for (const [requestId, pending] of this.pendingRequests) {
        this.handleDisabled(pending.request, pending.resolve);
        if (pending.timer) {
          clearTimeout(pending.timer);
        }
        this.pendingRequests.delete(requestId);
      }
    }
  }

  /**
   * Check if elicitation is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Request user input
   */
  async request(
    elicitation: Omit<Elicitation, "id">,
  ): Promise<ElicitationResponse> {
    const request: Elicitation = {
      ...elicitation,
      id: randomUUID(),
    } as Elicitation;

    // If disabled, handle according to fallback behavior
    if (!this.config.enabled) {
      return this.handleDisabledRequest(request);
    }

    const timeout = request.timeout ?? this.config.defaultTimeout;

    return new Promise<ElicitationResponse>((resolve) => {
      // Set up timeout
      const timer = setTimeout(() => {
        this.handleTimeout(request, resolve);
      }, timeout);

      // Store pending request
      this.pendingRequests.set(request.id, {
        request,
        resolve,
        timer,
      });

      // Emit request event
      this.emit("elicitationRequested", request);

      // Call handler
      this.config
        .handler(request)
        .then((response) => {
          clearTimeout(timer);
          this.pendingRequests.delete(request.id);
          this.emit("elicitationResponded", response);
          resolve(response);
        })
        .catch((error) => {
          clearTimeout(timer);
          this.pendingRequests.delete(request.id);
          const errorResponse: ElicitationResponse = {
            requestId: request.id,
            responded: false,
            error: error instanceof Error ? error.message : String(error),
            timestamp: Date.now(),
          };
          this.emit("elicitationError", { request, error });
          resolve(errorResponse);
        });
    });
  }

  /**
   * Convenience method for confirmation requests
   */
  async confirm(
    message: string,
    options?: {
      toolName?: string;
      serverId?: string;
      confirmLabel?: string;
      cancelLabel?: string;
      timeout?: number;
    },
  ): Promise<boolean> {
    const response = await this.request({
      type: "confirmation",
      message,
      toolName: options?.toolName ?? "unknown",
      serverId: options?.serverId,
      confirmLabel: options?.confirmLabel,
      cancelLabel: options?.cancelLabel,
      timeout: options?.timeout,
    });

    return response.value === true;
  }

  /**
   * Convenience method for text input
   */
  async getText(
    message: string,
    options?: {
      toolName?: string;
      placeholder?: string;
      defaultValue?: string;
      timeout?: number;
    },
  ): Promise<string | undefined> {
    const response = await this.request({
      type: "text",
      message,
      toolName: options?.toolName ?? "unknown",
      placeholder: options?.placeholder,
      defaultValue: options?.defaultValue,
      timeout: options?.timeout,
    });

    return response.value as string | undefined;
  }

  /**
   * Convenience method for selection
   */
  async select<T extends string>(
    message: string,
    options: Array<{ value: T; label: string }>,
    config?: {
      toolName?: string;
      timeout?: number;
    },
  ): Promise<T | undefined> {
    const response = await this.request({
      type: "select",
      message,
      toolName: config?.toolName ?? "unknown",
      options,
      timeout: config?.timeout,
    });

    return response.value as T | undefined;
  }

  /**
   * Cancel a pending request
   */
  cancel(requestId: string, reason?: string): void {
    const pending = this.pendingRequests.get(requestId);

    if (pending) {
      if (pending.timer) {
        clearTimeout(pending.timer);
      }

      const response: ElicitationResponse = {
        requestId,
        responded: false,
        cancelled: true,
        error: reason,
        timestamp: Date.now(),
      };

      pending.resolve(response);
      this.pendingRequests.delete(requestId);
      this.emit("elicitationCancelled", { requestId, reason });
    }
  }

  /**
   * Default handler when none is provided
   */
  private async defaultHandler(
    request: Elicitation,
  ): Promise<ElicitationResponse> {
    mcpLogger.warn(
      `[ElicitationManager] No handler for elicitation request: ${request.id}`,
    );

    // If there's a default value, use it
    if (request.defaultValue !== undefined) {
      return {
        requestId: request.id,
        responded: true,
        value: request.defaultValue,
        timestamp: Date.now(),
      };
    }

    // Otherwise, return not responded
    return {
      requestId: request.id,
      responded: false,
      error: "No elicitation handler configured",
      timestamp: Date.now(),
    };
  }

  /**
   * Handle timeout
   */
  private handleTimeout(
    request: Elicitation,
    resolve: (response: ElicitationResponse) => void,
  ): void {
    this.pendingRequests.delete(request.id);

    const response: ElicitationResponse = {
      requestId: request.id,
      responded: false,
      timedOut: true,
      value: request.defaultValue,
      timestamp: Date.now(),
    };

    this.emit("elicitationTimeout", { request });
    resolve(response);
  }

  /**
   * Handle disabled elicitation
   */
  private handleDisabled(
    request: Elicitation,
    resolve: (response: ElicitationResponse) => void,
  ): void {
    resolve(this.handleDisabledRequest(request));
  }

  /**
   * Handle disabled request based on fallback behavior
   */
  private handleDisabledRequest(request: Elicitation): ElicitationResponse {
    switch (this.config.fallbackBehavior) {
      case "default":
        return {
          requestId: request.id,
          responded: request.defaultValue !== undefined,
          value: request.defaultValue,
          timestamp: Date.now(),
        };

      case "error":
        return {
          requestId: request.id,
          responded: false,
          error: "Elicitation is disabled",
          timestamp: Date.now(),
        };

      case "timeout":
      default:
        return {
          requestId: request.id,
          responded: false,
          timedOut: true,
          value: request.defaultValue,
          timestamp: Date.now(),
        };
    }
  }

  /**
   * Get pending request count
   */
  getPendingCount(): number {
    return this.pendingRequests.size;
  }

  /**
   * Clear all pending requests
   */
  clearPending(reason?: string): void {
    for (const [requestId] of this.pendingRequests) {
      this.cancel(requestId, reason ?? "Cleared");
    }
  }
}

/**
 * Global elicitation manager instance
 */
export const globalElicitationManager = new ElicitationManager();
````

### Integration with Tool Execution

```typescript
// /src/lib/mcp/elicitation/toolIntegration.ts

import type { ToolResult } from "../../types/tools.js";
import type { NeuroLinkExecutionContext } from "../../types/mcpTypes.js";
import {
  ElicitationManager,
  globalElicitationManager,
} from "./elicitationManager.js";
import type { Elicitation, ElicitationResponse } from "./types.js";

/**
 * Tool execution context with elicitation support
 */
export type ElicitationContext = NeuroLinkExecutionContext & {
  /**
   * Elicitation manager for interactive input
   */
  elicitation: {
    /**
     * Request user confirmation
     */
    confirm: (
      message: string,
      options?: { confirmLabel?: string; cancelLabel?: string },
    ) => Promise<boolean>;

    /**
     * Request text input
     */
    getText: (
      message: string,
      options?: { placeholder?: string; defaultValue?: string },
    ) => Promise<string | undefined>;

    /**
     * Request selection
     */
    select: <T extends string>(
      message: string,
      options: Array<{ value: T; label: string }>,
    ) => Promise<T | undefined>;

    /**
     * Request multiple selections
     */
    multiSelect: <T extends string>(
      message: string,
      options: Array<{ value: T; label: string }>,
    ) => Promise<T[] | undefined>;

    /**
     * Request form input
     */
    form: <T extends Record<string, unknown>>(
      message: string,
      fields: Array<{
        name: keyof T;
        label: string;
        type: "text" | "number" | "boolean" | "select";
        required?: boolean;
      }>,
    ) => Promise<T | undefined>;

    /**
     * Request raw elicitation
     */
    request: (
      elicitation: Omit<Elicitation, "id">,
    ) => Promise<ElicitationResponse>;
  };
};

/**
 * Create an elicitation-enabled context
 */
export function createElicitationContext(
  baseContext: NeuroLinkExecutionContext,
  toolName: string,
  serverId?: string,
  elicitationManager: ElicitationManager = globalElicitationManager,
): ElicitationContext {
  return {
    ...baseContext,
    elicitation: {
      confirm: (message, options) =>
        elicitationManager.confirm(message, {
          toolName,
          serverId,
          ...options,
        }),

      getText: (message, options) =>
        elicitationManager.getText(message, {
          toolName,
          ...options,
        }),

      select: (message, options) =>
        elicitationManager.select(message, options, {
          toolName,
        }),

      multiSelect: async (message, options) => {
        const response = await elicitationManager.request({
          type: "multiselect",
          message,
          toolName,
          serverId,
          options,
        });
        return response.value as string[] | undefined;
      },

      form: async (message, fields) => {
        const response = await elicitationManager.request({
          type: "form",
          message,
          toolName,
          serverId,
          fields: fields.map((f) => ({
            name: String(f.name),
            label: f.label,
            type: f.type,
            required: f.required,
          })),
        });
        return response.value as Record<string, unknown> | undefined;
      },

      request: (elicitation) =>
        elicitationManager.request({
          ...elicitation,
          toolName,
          serverId,
        }),
    },
  };
}
```

---

## Enhanced Type Definitions

### Updated MCP Types

```typescript
// Additions to /src/lib/types/mcpTypes.ts

import type { MCPToolAnnotations } from "../mcp/mcpServerBase.js";

/**
 * Enhanced tool definition with annotations
 */
export type MCPEnhancedTool = {
  name: string;
  description: string;
  inputSchema?: object;
  outputSchema?: object;
  annotations?: MCPToolAnnotations;
  execute?: (params: unknown, context?: unknown) => Promise<unknown> | unknown;
};

/**
 * Server capabilities for MCP 2024-11-05 spec
 */
export type MCPServerCapabilities = {
  /**
   * Supported tool annotations
   */
  toolAnnotations?: {
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
  };

  /**
   * Elicitation support
   */
  elicitation?: {
    supported: boolean;
    types?: string[];
    timeout?: number;
  };

  /**
   * Resource support
   */
  resources?: {
    supported: boolean;
    subscriptions?: boolean;
  };

  /**
   * Prompt support
   */
  prompts?: {
    supported: boolean;
  };

  /**
   * Logging support
   */
  logging?: {
    supported: boolean;
    levels?: string[];
  };
};

/**
 * MCP server info with capabilities
 */
export type MCPServerInfoWithCapabilities = MCPServerInfo & {
  capabilities?: MCPServerCapabilities;
};
```

---

## Implementation Plan

### Phase 1: MCPServerBase Class (Week 1-2)

1. **Create base class** (`/src/lib/mcp/mcpServerBase.ts`)
   - Implement `MCPServerBase` abstract class
   - Add tool annotation support
   - Add lifecycle hooks

2. **Create tool conversion utilities** (`/src/lib/mcp/toolConverter.ts`)
   - `toMCPTool()` function
   - Schema conversion helpers
   - Annotation inference

3. **Update type definitions**
   - Add `MCPToolAnnotations` type
   - Add `MCPServerTool` type
   - Update `MCPServerInfo` with capabilities

4. **Add tests**
   - Unit tests for MCPServerBase
   - Integration tests with existing registry

### Phase 2: Agent/Workflow Exposure (Week 3-4)

1. **Implement agent exposure** (`/src/lib/mcp/agentExposure.ts`)
   - `exposeAgentAsTool()` function
   - Agent execution wrapper
   - Result formatting

2. **Implement workflow exposure** (`/src/lib/mcp/workflowExposure.ts`)
   - `exposeWorkflowAsTool()` function
   - Workflow execution wrapper
   - Step result handling

3. **Add tests**
   - Agent exposure tests
   - Workflow exposure tests

### Phase 3: Elicitation Protocol (Week 5-6)

1. **Create elicitation types** (`/src/lib/mcp/elicitation/types.ts`)
   - All elicitation request types
   - Response types

2. **Implement ElicitationManager** (`/src/lib/mcp/elicitation/elicitationManager.ts`)
   - Request handling
   - Timeout management
   - Event emission

3. **Integrate with tool execution**
   - Update `MCPToolRegistry.executeTool()`
   - Update `ExternalServerManager.executeTool()`
   - Add context helpers

4. **CLI integration**
   - Implement CLI elicitation handler
   - Terminal prompts for different types

5. **Add tests**
   - Unit tests for ElicitationManager
   - Integration tests with tool execution

### Phase 4: Multi-Server Enhancements (Week 7-8)

1. **Implement MultiServerManager** (`/src/lib/mcp/multiServerManager.ts`)
   - Server groups
   - Load balancing
   - Tool routing

2. **Update existing managers**
   - Enhance `ExternalServerManager`
   - Update `MCPToolRegistry`

3. **Add documentation**
   - Update CLAUDE.md
   - Add usage examples
   - API documentation

4. **Add tests**
   - Multi-server tests
   - Load balancing tests
   - Routing tests

### Phase 5: Integration and Polish (Week 9-10)

1. **Integration testing**
   - End-to-end tests
   - Performance testing
   - Memory leak testing

2. **Documentation**
   - Update all docs
   - Add migration guide
   - Add examples

3. **Code review and refinement**
   - Address feedback
   - Optimize performance
   - Clean up code

---

## Migration Guide

### Migrating from Current MCP to Enhanced MCP

#### 1. Updating Tool Registration

**Before:**

```typescript
toolRegistry.registerServer({
  id: "my-server",
  name: "My Server",
  description: "Server description",
  transport: "stdio",
  status: "connected",
  tools: [
    {
      name: "myTool",
      description: "Does something",
      inputSchema: { type: "object" },
      execute: async (params) => ({ success: true, data: result }),
    },
  ],
});
```

**After:**

```typescript
import { MCPServerBase } from "@juspay/neurolink/mcp";

class MyServer extends MCPServerBase {
  constructor() {
    super({
      id: "my-server",
      name: "My Server",
      description: "Server description",
    });

    this.registerTool({
      name: "myTool",
      description: "Does something",
      inputSchema: { type: "object" },
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
      },
      execute: async (params) => ({ success: true, data: result }),
    });
  }
}

const server = new MyServer();
await server.init();
toolRegistry.registerServer(server.toServerInfo());
```

#### 2. Adding Tool Annotations

```typescript
// Add annotations to existing tools
this.registerTool({
  name: "deleteFile",
  description: "Delete a file",
  annotations: {
    destructiveHint: true,
    idempotentHint: false,
    requiresConfirmation: true,
    title: "Delete File",
  },
  execute: async (params, context) => {
    // Implementation
  },
});
```

#### 3. Using Elicitation

```typescript
this.registerTool({
  name: "deployApp",
  description: "Deploy application to production",
  annotations: {
    destructiveHint: true,
    requiresConfirmation: true,
  },
  execute: async (params, context) => {
    // Use elicitation for confirmation
    if (context?.elicitation) {
      const confirmed = await context.elicitation.confirm(
        `Deploy ${params.appName} to production?`,
        { confirmLabel: "Deploy", cancelLabel: "Cancel" },
      );

      if (!confirmed) {
        return { success: false, error: "Deployment cancelled by user" };
      }
    }

    // Proceed with deployment
    return { success: true, data: { deployed: true } };
  },
});
```

#### 4. Exposing Agents as Tools

```typescript
import { exposeAgentAsTool } from "@juspay/neurolink/mcp";

// Create your agent
const researchAgent = new Agent({
  name: "researcher",
  instructions: "Research topics thoroughly",
  tools: [webSearchTool],
});

// Expose as tool
const researchTool = exposeAgentAsTool(researchAgent, {
  name: "research",
  description: "Delegate research tasks",
  annotations: {
    readOnlyHint: true,
    estimatedDuration: 30000,
  },
});

// Use in another agent or server
server.registerTool(researchTool);
```

---

## MCP Specification Updates 2025

### Protocol Version Evolution

The MCP specification has evolved significantly since its introduction. The latest version is **2025-11-25**, released on the one-year anniversary of MCP.

| Date           | Milestone             | Key Changes                                |
| -------------- | --------------------- | ------------------------------------------ |
| November 2024  | Initial Release       | Basic tools, resources, prompts            |
| March 2025     | OpenAI Adoption       | ChatGPT desktop MCP support                |
| May 2025       | Microsoft Integration | Azure AI Agent Service                     |
| June 2025      | Security Update       | OAuth 2.1, structured outputs, elicitation |
| September 2025 | Registry Launch       | Official MCP Registry preview              |
| November 2025  | Anniversary Release   | Spec 2025-11-25, Linux Foundation donation |

### Latest Specification Features (2025-11-25)

#### 1. Streamable HTTP Transport (Replaces SSE)

The June 2025 spec introduced **Streamable HTTP** as the modern standard for remote MCP servers, deprecating the legacy SSE transport:

```typescript
// Modern Streamable HTTP configuration
{
  "transport": "http",
  "url": "https://api.example.com/mcp",
  "headers": {
    "Authorization": "Bearer YOUR_TOKEN"
  },
  "timeout": 15000,
  "retries": 5
}
```

**Key characteristics**:

- Single URL path for all MCP communication
- HTTP POST for client-to-server messages
- Optional SSE for server-to-client streaming
- Session IDs via `Mcp-Session-Id` header
- Resumable connections with Event IDs
- Standard HTTP authentication

#### 2. OAuth 2.1 Resource Server Classification

MCP servers are now officially classified as **OAuth 2.0 Resource Servers**:

```typescript
// Servers must serve this endpoint
GET /.well-known/oauth-protected-resource
```

#### 3. Structured Outputs

Tools can now return structured, validated outputs:

```typescript
type ToolResult = {
  content: ContentBlock[];
  structuredOutput?: {
    schema: JSONSchema;
    data: unknown;
  };
  isError?: boolean;
};
```

#### 4. Elicitation Protocol

Servers can request interactive user input mid-execution:

```typescript
type ElicitationRequest = {
  type: "form" | "url";
  message: string;
  schema?: JSONSchema; // For form elicitation
  url?: string; // For URL elicitation
};
```

#### 5. Enhanced Capability Negotiation

```typescript
// Client sends initialize request
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2025-11-25",
    "capabilities": {
      "sampling": {},
      "roots": { "listChanged": true },
      "elicitation": true,
      "structuredOutputs": true
    },
    "clientInfo": {
      "name": "NeuroLink",
      "version": "8.37.0"
    }
  }
}
```

### Industry Adoption (Late 2025)

| Metric                    | Value                |
| ------------------------- | -------------------- |
| Monthly SDK Downloads     | 97M+                 |
| Active Public MCP Servers | 10,000+              |
| MCP Clients               | 300+                 |
| Enterprise Adoption       | 79% of organizations |

---

## Lessons from NeuroLink MCP Evolution

Based on git history analysis from June 2025 to January 2026, NeuroLink's MCP implementation provides valuable lessons for future enhancements.

### Phased Implementation Approach

NeuroLink implemented MCP over 8 months in distinct phases:

| Phase | Timeline                   | Focus                                         |
| ----- | -------------------------- | --------------------------------------------- |
| 1     | June 2025                  | Foundation - Factory pattern, tool registry   |
| 2     | June-July 2025             | Auto-discovery and tool integration           |
| 3     | July-August 2025           | External server support with circuit breakers |
| 4     | September-October 2025     | Type consolidation and error handling         |
| 5     | December 2025-January 2026 | HTTP transport with OAuth and rate limiting   |

### Patterns That Worked

#### 1. Factory Pattern with Dynamic Imports

Breaking circular dependencies through lazy loading:

```typescript
ProviderFactory.registerProvider(
  AIProviderName.GOOGLE_AI,
  async (modelName?, _providerName?, sdk?) => {
    const { GoogleAIStudioProvider } = await import(
      "../providers/googleAiStudio.js"
    );
    return new GoogleAIStudioProvider(modelName, sdk as NeuroLink | undefined);
  },
  GoogleAIModels.GEMINI_2_5_FLASH,
  ["googleAiStudio", "google", "gemini", "google-ai"],
);
```

**Why it works**: Avoids circular dependency issues that plagued early implementations.

#### 2. Circuit Breaker Pattern

Fault tolerance for external MCP operations:

```typescript
export type CircuitBreakerState = "closed" | "open" | "half-open";

export type CircuitBreakerConfig = {
  failureThreshold: number; // Failures before opening
  resetTimeout: number; // Time before half-open
  halfOpenMaxCalls: number; // Test calls in half-open
  operationTimeout: number; // Per-operation timeout
  minimumCallsBeforeCalculation: number;
  statisticsWindowSize: number;
};
```

**Why it works**: Prevents cascading failures when MCP servers become unresponsive.

#### 3. Token Bucket Rate Limiting

Production-grade rate limiting for HTTP transport:

```typescript
// Token bucket algorithm with:
- Configurable requests per minute
- Burst allowance (maxBurst)
- Automatic token refill
- Queue management for excess requests
```

**Why it works**: Prevents overwhelming MCP servers while allowing burst traffic.

#### 4. Centralized Type Definitions

Type consolidation to `src/lib/types/mcpTypes.ts` (763 lines) with 25+ interfaces:

**Why it works**: Single source of truth for types, easier maintenance, better IDE support.

### Critical Lessons Learned

| Lesson                    | Details                                                             |
| ------------------------- | ------------------------------------------------------------------- |
| **Type Safety**           | Eliminating `any` types prevented runtime errors                    |
| **Memory Management**     | Circuit breaker memory leak fix showed importance of proper cleanup |
| **Error Handling**        | Return structured errors instead of throwing exceptions             |
| **Incremental Transport** | Add stdio first, then HTTP/SSE/WebSocket, finally OAuth             |
| **Test Coverage**         | 400-1000+ lines per feature ensures stability                       |

### Growth Metrics

| Date       | MCP Files | Lines (approx) |
| ---------- | --------- | -------------- |
| 2025-06-10 | 6         | ~2,500         |
| 2025-06-22 | 25        | ~12,000        |
| 2025-07-09 | 40        | ~25,000        |
| 2025-08-14 | 50        | ~35,000        |
| 2026-01-02 | 60+       | ~45,000        |

---

## Security Best Practices

### Five Layers of MCP Security

Based on the June 2025 specification updates and OWASP guidelines:

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: Agent Identity                                      │
│ - Each agent needs distinct, traceable identity              │
├─────────────────────────────────────────────────────────────┤
│ Layer 2: Delegator Authentication                            │
│ - User authenticates and consents to agent permissions       │
├─────────────────────────────────────────────────────────────┤
│ Layer 3: Consent from Delegator to Agent                     │
│ - Define what agent can do (scope minimization)              │
├─────────────────────────────────────────────────────────────┤
│ Layer 4: Access to MCP Server                                │
│ - Agent authenticates to MCP server (OAuth 2.1)              │
├─────────────────────────────────────────────────────────────┤
│ Layer 5: Access to Upstream Services                         │
│ - Tools honor agent identity and delegator permissions       │
└─────────────────────────────────────────────────────────────┘
```

### OAuth 2.1 Implementation

NeuroLink's OAuth implementation in `/src/lib/mcp/auth/oauthClientProvider.ts`:

```typescript
type OAuth21Config = {
  clientId: string;
  authorizationServer: string;
  scopes: string[];
  resourceIndicator?: string; // RFC 8707
  usePKCE?: boolean; // Default: true
};

// PKCE (Proof Key for Code Exchange) is mandatory
// - Prevents authorization code interception attacks
// - Required for public clients
```

### Resource Indicators (RFC 8707)

Combat "token mis-redemption" by explicitly stating intended recipient:

```typescript
// Token request with resource indicator
{
  "resource": "https://mcp-server.example.com",
  "grant_type": "authorization_code",
  "code": "authorization_code_here"
}
```

**Why it matters**: Without resource indicators, tokens issued for one MCP server could be used at another.

### MCP Server Security Requirements

```typescript
// MCP Servers MUST:
- NOT use sessions for authentication
- Use secure, non-deterministic session IDs
- Generate session IDs with secure random number generators
- Implement Resource Indicators (RFC 8707)
```

### Authorization Models

| Model     | Use Case           | Example                                       |
| --------- | ------------------ | --------------------------------------------- |
| **RBAC**  | Role-based access  | Admin can use all tools, User only read tools |
| **ReBAC** | Relationship-based | User can access files they created            |
| **ABAC**  | Attribute-based    | Access based on time, location, risk score    |

### Scope Minimization

```typescript
// Start with minimal scope
const initialScopes = ["mcp:tools-basic"];

// Elevate via WWW-Authenticate challenge when needed
// Response: 401 with
// WWW-Authenticate: Bearer scope="mcp:tools-admin"
```

### Known Attack Vectors (OWASP MCP Guidelines)

| Vector            | Mitigation                                       |
| ----------------- | ------------------------------------------------ |
| Tool Poisoning    | Validate tool definitions, sign server manifests |
| Prompt Injection  | Input sanitization, output validation            |
| Memory Poisoning  | Secure resource access, audit logs               |
| Tool Interference | Isolate tool execution, sandbox environments     |
| Confused Deputy   | Resource indicators, token scoping               |
| DNS Rebinding     | Validate Origin headers for local servers        |

### HTTP Transport Security

```typescript
// From NeuroLink's mcpClientFactory.ts
{
  // Validate Origin headers
  validateOrigin: true,

  // Enforce authentication
  requireAuth: true,

  // Bind to localhost in development
  host: process.env.NODE_ENV === 'development' ? '127.0.0.1' : '0.0.0.0',

  // Rate limiting
  rateLimit: {
    windowMs: 60000,
    max: 100
  }
}
```

### Security Checklist

- [ ] Multi-factor authentication enabled
- [ ] Role-based access control implemented
- [ ] API key rotation policies established
- [ ] OAuth 2.1 with PKCE integration configured
- [ ] Encryption at rest and in transit
- [ ] Network segmentation implemented
- [ ] Comprehensive logging enabled
- [ ] Input sanitization for all tool parameters
- [ ] Rate limiting implemented (token bucket)
- [ ] DNS rebinding protection for local servers
- [ ] Circuit breaker pattern for fault tolerance
- [ ] Tool blocklist capability enabled

---

## MCP Registry Integration

### Official MCP Registry

Launched September 2025: [registry.modelcontextprotocol.io](https://registry.modelcontextprotocol.io/)

**Features**:

- Authoritative single source of truth
- Community-owned (Anthropic, GitHub, Microsoft, PulseMCP)
- Server discovery and metadata
- Version tracking
- API for programmatic access

### Registry API (v0.1)

```typescript
// API Endpoints
GET /api/v1/servers              // List all servers
GET /api/v1/servers/{name}       // Get server details
GET /api/v1/search?q={query}     // Search servers
```

### Proposed Registry Client for NeuroLink

```typescript
// /src/lib/mcp/registry/mcpRegistryClient.ts

type MCPServerMetadata = {
  name: string;
  version: string;
  description: string;
  author: string;
  repository: string;
  transport: MCPTransportType[];
  tools: string[];
  categories: string[];
  downloads: number;
  rating: number;
  verified: boolean;
};

class MCPRegistryClient {
  private baseUrl = "https://registry.modelcontextprotocol.io/api/v1";

  /**
   * Search for servers by query
   */
  async searchServers(
    query: string,
    options?: {
      category?: string;
      transport?: MCPTransportType;
      verified?: boolean;
      limit?: number;
    },
  ): Promise<MCPServerMetadata[]> {
    const params = new URLSearchParams({ q: query, ...options });
    const response = await fetch(`${this.baseUrl}/search?${params}`);
    return response.json();
  }

  /**
   * Get detailed server information
   */
  async getServer(name: string): Promise<MCPServerMetadata> {
    const response = await fetch(`${this.baseUrl}/servers/${name}`);
    return response.json();
  }

  /**
   * Install server from registry
   */
  async installFromRegistry(
    name: string,
    options?: { version?: string },
  ): Promise<MCPServerInfo> {
    const metadata = await this.getServer(name);

    // Determine transport and configuration
    const transport = metadata.transport[0];

    if (transport === "stdio") {
      return {
        id: name,
        name: metadata.name,
        description: metadata.description,
        transport: "stdio",
        command: "npx",
        args: ["-y", `${metadata.name}@${options?.version ?? "latest"}`],
        status: "initializing",
        tools: [],
      };
    }

    // For HTTP transport, return URL-based config
    return {
      id: name,
      name: metadata.name,
      description: metadata.description,
      transport: "http",
      url: metadata.repository, // Would need actual URL from registry
      status: "initializing",
      tools: [],
    };
  }

  /**
   * Get popular servers by category
   */
  async getPopularByCategory(
    category: string,
    limit = 10,
  ): Promise<MCPServerMetadata[]> {
    return this.searchServers("", { category, limit });
  }

  /**
   * Verify server authenticity
   */
  async verifyServer(name: string): Promise<{
    verified: boolean;
    signature?: string;
    publisher?: string;
  }> {
    const response = await fetch(`${this.baseUrl}/servers/${name}/verify`);
    return response.json();
  }
}
```

### GitHub MCP Registry

Also available at: [GitHub MCP Registry](https://github.blog/ai-and-ml/github-copilot/meet-the-github-mcp-registry-the-fastest-way-to-discover-mcp-servers/)

**Features**:

- Integrated with GitHub ecosystem
- Self-publishing for developers
- Automatic sync with community registry
- Discovery via GitHub Copilot

### Curated Server Lists

| Source              | URL                                     | Servers          |
| ------------------- | --------------------------------------- | ---------------- |
| Official Registry   | registry.modelcontextprotocol.io        | Verified         |
| GitHub Registry     | github.com/mcp-registry                 | GitHub-published |
| PulseMCP Directory  | pulsemcp.com/servers                    | 7,900+           |
| awesome-mcp-servers | github.com/punkpeye/awesome-mcp-servers | Curated          |

### Integration Strategy for NeuroLink

```typescript
// Proposed usage in NeuroLink SDK
const neurolink = new NeuroLink();

// Option 1: Install from registry by name
await neurolink.addServerFromRegistry("github-mcp-server");

// Option 2: Search and select
const servers = await neurolink.searchRegistry("database");
await neurolink.addServerFromRegistry(servers[0].name);

// Option 3: Install with specific version
await neurolink.addServerFromRegistry("postgres-mcp", { version: "2.0.0" });

// Option 4: Bulk install popular servers
await neurolink.addPopularServers("development", { limit: 5 });
```

---

## Updated Implementation Approach

Based on research findings, here is the updated implementation approach for MCP enhancements:

### Priority Matrix (Revised)

| Priority     | Feature                     | Effort | Impact | Research Basis             |
| ------------ | --------------------------- | ------ | ------ | -------------------------- |
| **Critical** | Protocol Version 2025-11-25 | Low    | High   | Required for compatibility |
| **Critical** | OAuth 2.1 with PKCE         | Medium | High   | Security specification     |
| **High**     | MCPServerBase Class         | Medium | High   | Mastra parity              |
| **High**     | Tool Annotations            | Medium | Medium | Mastra parity              |
| **High**     | Registry Integration        | Medium | High   | Ecosystem access           |
| **Medium**   | Elicitation Protocol        | Medium | Medium | Spec feature               |
| **Medium**   | Structured Outputs          | Low    | Medium | Spec feature               |
| **Lower**    | Agent/Workflow Exposure     | High   | Medium | Mastra parity              |

### Phase 1: Protocol Compliance (Week 1)

```typescript
// 1. Update protocol version in MCPClientFactory
const initParams = {
  protocolVersion: "2025-11-25",  // Updated from 2024-11-05
  capabilities: {
    sampling: {},
    roots: { listChanged: true },
    elicitation: true,            // New capability
    structuredOutputs: true       // New capability
  }
};

// 2. Verify OAuth 2.1 compliance
// NeuroLink already has oauthClientProvider.ts with PKCE
// Need to add: Resource Indicators (RFC 8707)

// 3. Add well-known endpoint support
GET /.well-known/oauth-protected-resource
```

### Phase 2: MCPServerBase Class (Week 2-3)

As designed in earlier sections, but with updated spec compliance:

```typescript
// Add 2025-11-25 spec features
export type MCPServerCapabilities2025 = {
  tools?: {
    listChanged?: boolean;
    annotations?: {
      readOnlyHint?: boolean;
      destructiveHint?: boolean;
      idempotentHint?: boolean;
    };
  };
  resources?: {
    subscribe?: boolean;
  };
  prompts?: {
    listChanged?: boolean;
  };
  elicitation?: {
    supported: boolean;
    types?: ("form" | "url")[];
  };
  structuredOutputs?: {
    supported: boolean;
  };
};
```

### Phase 3: Registry Integration (Week 4)

```typescript
// /src/lib/mcp/registry/index.ts
export { MCPRegistryClient } from "./mcpRegistryClient.js";
export { GitHubRegistryClient } from "./githubRegistryClient.js";

// Integration with NeuroLink class
class NeuroLink {
  private registryClient = new MCPRegistryClient();

  async addServerFromRegistry(
    name: string,
    options?: RegistryInstallOptions,
  ): Promise<void> {
    const serverInfo = await this.registryClient.installFromRegistry(
      name,
      options,
    );
    await this.addExternalMCPServer(name, serverInfo);
  }

  async searchRegistry(query: string): Promise<MCPServerMetadata[]> {
    return this.registryClient.searchServers(query);
  }
}
```

### Phase 4: Security Enhancements (Week 5)

```typescript
// /src/lib/mcp/security/mcpSecurityMiddleware.ts

class MCPSecurityMiddleware {
  // Resource indicators for OAuth
  private resourceIndicators: Map<string, string> = new Map();

  // Tool-level permissions (RBAC/ABAC)
  private permissions: ToolPermissionManager;

  // Rate limiting per server
  private rateLimiter: TokenBucketRateLimiter;

  async validateToolCall(
    serverId: string,
    toolName: string,
    args: unknown,
    context: SecurityContext,
  ): Promise<ValidationResult> {
    // 1. Check rate limits
    if (!(await this.rateLimiter.allowRequest(serverId))) {
      return { allowed: false, reason: "Rate limit exceeded" };
    }

    // 2. Check permissions
    if (!(await this.permissions.canExecute(context.userId, toolName))) {
      return { allowed: false, reason: "Permission denied" };
    }

    // 3. Sanitize arguments
    const sanitized = await this.sanitizeArguments(toolName, args);

    // 4. Check for blocked tools
    if (await this.isToolBlocked(serverId, toolName)) {
      return { allowed: false, reason: "Tool blocked by policy" };
    }

    return { allowed: true, sanitizedArgs: sanitized };
  }
}
```

### Phase 5: Elicitation and Structured Outputs (Week 6-7)

Already designed in earlier sections. Key additions from research:

```typescript
// Support both form and URL elicitation (2025 spec)
type ElicitationRequest2025 = {
  type: "form" | "url";
  message: string;
  schema?: JSONSchema; // For form
  url?: string; // For URL
  timeout?: number;
};

// Structured outputs support
type StructuredToolResult = {
  content: ContentBlock[];
  structuredOutput?: {
    schema: JSONSchema;
    data: unknown;
    validated: boolean;
  };
  isError?: boolean;
};
```

### Phase 6: Testing and Documentation (Week 8)

```typescript
// Test matrix
- Unit tests for all new components
- Integration tests with official reference servers
- Security testing against OWASP guidelines
- Performance testing for registry operations
- Compatibility testing with spec 2025-11-25
```

### Updated File Structure

```
src/lib/mcp/
├── auth/
│   ├── index.ts
│   ├── oauthClientProvider.ts    (existing)
│   ├── tokenStorage.ts           (existing)
│   └── resourceIndicators.ts     (new)
├── registry/
│   ├── index.ts                  (new)
│   ├── mcpRegistryClient.ts      (new)
│   └── githubRegistryClient.ts   (new)
├── security/
│   ├── index.ts                  (new)
│   ├── mcpSecurityMiddleware.ts  (new)
│   └── toolPermissionManager.ts  (new)
├── elicitation/
│   ├── types.ts                  (as designed)
│   ├── elicitationManager.ts     (as designed)
│   └── toolIntegration.ts        (as designed)
├── mcpServerBase.ts              (new)
├── toolConverter.ts              (new)
├── agentExposure.ts              (new)
├── workflowExposure.ts           (new)
├── multiServerManager.ts         (as designed)
└── ... (existing files)
```

---

## References

- **Current MCP Implementation**: `/src/lib/mcp/`
- **Type Definitions**: `/src/lib/types/mcpTypes.ts`
- **External MCP Types**: `/src/lib/types/externalMcp.ts`
- **Tool Types**: `/src/lib/types/tools.ts`
- **MCP Client Factory**: `/src/lib/mcp/mcpClientFactory.ts`
- **External Server Manager**: `/src/lib/mcp/externalServerManager.ts`
- **Tool Registry**: `/src/lib/mcp/toolRegistry.ts`
- **HITL Implementation**: `/src/lib/hitl/`

### Official MCP Resources

- **MCP Specification 2025-11-25**: https://modelcontextprotocol.io/specification/2025-11-25
- **Official MCP Registry**: https://registry.modelcontextprotocol.io/
- **MCP GitHub Organization**: https://github.com/modelcontextprotocol
- **MCP Blog**: http://blog.modelcontextprotocol.io/

### Security Resources

- **MCP Security Best Practices**: https://modelcontextprotocol.io/specification/draft/basic/security_best_practices
- **OWASP MCP Security Guide**: https://genai.owasp.org/resource/cheatsheet-a-practical-guide-for-securely-using-third-party-mcp-servers-1-0/
- **OAuth 2.1 Specification**: https://oauth.net/2.1/
- **PKCE RFC**: https://tools.ietf.org/html/rfc7636
- **Resource Indicators RFC 8707**: https://tools.ietf.org/html/rfc8707

### SDK Documentation

- **TypeScript SDK**: https://github.com/modelcontextprotocol/typescript-sdk
- **Python SDK**: https://github.com/modelcontextprotocol/python-sdk

### Research Documents

- **NeuroLink MCP Evolution**: `/docs/mastra-features-implementation/research/git-history/02-mcp-evolution.md`
- **MCP Protocol Research**: `/docs/mastra-features-implementation/research/online/06-mcp-protocol-research.md`
