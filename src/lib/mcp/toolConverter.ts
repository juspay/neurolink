/**
 * Tool Converter Utilities
 *
 * Converts between NeuroLink tool format and MCP tool format.
 * Enables seamless interoperability between NeuroLink's internal
 * tool representation and the MCP protocol specification.
 *
 * @module mcp/toolConverter
 * @since 8.39.0
 */

import type { JsonObject, JsonValue } from "../types/common.js";
import type {
  NeuroLinkExecutionContext,
  ToolResult,
} from "../types/mcpTypes.js";
import type { MCPServerTool, MCPToolAnnotations } from "./toolAnnotations.js";
import { inferAnnotations } from "./toolAnnotations.js";
import { withTimeout } from "../utils/async/withTimeout.js";

/**
 * NeuroLink internal tool format
 */
export type NeuroLinkTool = {
  /**
   * Tool name
   */
  name: string;

  /**
   * Tool description
   */
  description: string;

  /**
   * Input parameters schema
   */
  parameters?: JsonObject;

  /**
   * Tool execution function
   */
  execute: (
    params: unknown,
    context?: NeuroLinkExecutionContext,
  ) => Promise<ToolResult | unknown>;

  /**
   * Category for organization
   */
  category?: string;

  /**
   * Tags for filtering
   */
  tags?: string[];

  /**
   * Whether the tool is async
   */
  isAsync?: boolean;

  /**
   * Custom metadata
   */
  metadata?: Record<string, JsonValue>;
};

/**
 * MCP protocol tool format (from @modelcontextprotocol/sdk)
 */
export type MCPProtocolTool = {
  /**
   * Tool name
   */
  name: string;

  /**
   * Tool description
   */
  description?: string;

  /**
   * JSON Schema for input
   */
  inputSchema: {
    type: "object";
    properties?: Record<string, JsonObject>;
    required?: string[];
  };

  /**
   * Optional annotations (MCP 2024-11-05+)
   */
  annotations?: {
    title?: string;
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
  };
};

/**
 * Tool converter options
 */
export type ToolConverterOptions = {
  /**
   * Automatically infer annotations from tool definition
   */
  inferAnnotations?: boolean;

  /**
   * Default annotations to apply
   */
  defaultAnnotations?: MCPToolAnnotations;

  /**
   * Whether to preserve original metadata
   */
  preserveMetadata?: boolean;

  /**
   * Namespace prefix for tool names
   */
  namespacePrefix?: string;
};

/**
 * Convert NeuroLink tool to MCP server tool format
 */
export function neuroLinkToolToMCP(
  tool: NeuroLinkTool,
  options: ToolConverterOptions = {},
): MCPServerTool {
  const {
    inferAnnotations: shouldInfer = true,
    defaultAnnotations = {},
    preserveMetadata = true,
    namespacePrefix,
  } = options;

  // Apply namespace prefix if provided
  const toolName = namespacePrefix
    ? `${namespacePrefix}_${tool.name}`
    : tool.name;

  // Infer annotations from tool definition
  const inferredAnnotations = shouldInfer
    ? inferAnnotations({ name: tool.name, description: tool.description })
    : {};

  // Build annotations
  const annotations: MCPToolAnnotations = {
    ...defaultAnnotations,
    ...inferredAnnotations,
  };

  // Add tags if present
  if (tool.tags?.length) {
    annotations.tags = [
      ...new Set([...(annotations.tags ?? []), ...tool.tags]),
    ];
  }

  // Build input schema
  const inputSchema: JsonObject = tool.parameters ?? {
    type: "object",
    properties: {},
  };

  // Build metadata
  const metadata: Record<string, unknown> = preserveMetadata
    ? { ...tool.metadata }
    : {};

  if (tool.category) {
    metadata.category = tool.category;
  }

  if (tool.isAsync !== undefined) {
    metadata.isAsync = tool.isAsync;
  }

  return {
    name: toolName,
    description: tool.description,
    inputSchema,
    annotations,
    execute: tool.execute,
    metadata,
  };
}

/**
 * Convert MCP server tool to NeuroLink tool format
 */
export function mcpToolToNeuroLink(
  tool: MCPServerTool,
  options: { removeNamespacePrefix?: string } = {},
): NeuroLinkTool {
  const { removeNamespacePrefix } = options;

  // Remove namespace prefix if provided
  let toolName = tool.name;
  if (
    removeNamespacePrefix &&
    tool.name.startsWith(`${removeNamespacePrefix}_`)
  ) {
    toolName = tool.name.slice(removeNamespacePrefix.length + 1);
  }

  return {
    name: toolName,
    description: tool.description,
    parameters: tool.inputSchema,
    execute: tool.execute,
    category: tool.metadata?.category as string | undefined,
    tags: tool.annotations?.tags,
    metadata: tool.metadata as Record<string, JsonValue> | undefined,
  };
}

/**
 * Convert MCP protocol tool to MCPServerTool
 * (For tools received from external MCP servers)
 */
export function mcpProtocolToolToServerTool(
  protocolTool: MCPProtocolTool,
  executor: (
    params: unknown,
    context?: NeuroLinkExecutionContext,
  ) => Promise<ToolResult | unknown>,
  options: ToolConverterOptions = {},
): MCPServerTool {
  const { inferAnnotations: shouldInfer = true, defaultAnnotations = {} } =
    options;

  // Convert protocol annotations to our format
  const protocolAnnotations = protocolTool.annotations ?? {};

  // Infer additional annotations
  const inferredAnnotations = shouldInfer
    ? inferAnnotations({
        name: protocolTool.name,
        description: protocolTool.description ?? "",
      })
    : {};

  // Merge annotations with precedence: protocol > inferred > defaults
  const annotations: MCPToolAnnotations = {
    ...defaultAnnotations,
    ...inferredAnnotations,
    title:
      protocolAnnotations.title ??
      inferredAnnotations.title ??
      defaultAnnotations.title,
    readOnlyHint:
      protocolAnnotations.readOnlyHint ??
      inferredAnnotations.readOnlyHint ??
      defaultAnnotations.readOnlyHint,
    destructiveHint:
      protocolAnnotations.destructiveHint ??
      inferredAnnotations.destructiveHint ??
      defaultAnnotations.destructiveHint,
    idempotentHint:
      protocolAnnotations.idempotentHint ??
      inferredAnnotations.idempotentHint ??
      defaultAnnotations.idempotentHint,
    openWorldHint:
      protocolAnnotations.openWorldHint ??
      inferredAnnotations.openWorldHint ??
      defaultAnnotations.openWorldHint,
  };

  return {
    name: protocolTool.name,
    description: protocolTool.description ?? "No description provided",
    inputSchema: protocolTool.inputSchema as JsonObject,
    annotations,
    execute: executor,
  };
}

/**
 * Convert MCPServerTool to MCP protocol tool format
 * (For exposing tools to external MCP clients)
 */
export function serverToolToMCPProtocol(tool: MCPServerTool): MCPProtocolTool {
  // Build protocol annotations
  const annotations: MCPProtocolTool["annotations"] = {};

  if (tool.annotations?.title) {
    annotations.title = tool.annotations.title;
  }

  if (tool.annotations?.readOnlyHint !== undefined) {
    annotations.readOnlyHint = tool.annotations.readOnlyHint;
  }

  if (tool.annotations?.destructiveHint !== undefined) {
    annotations.destructiveHint = tool.annotations.destructiveHint;
  }

  if (tool.annotations?.idempotentHint !== undefined) {
    annotations.idempotentHint = tool.annotations.idempotentHint;
  }

  if (tool.annotations?.openWorldHint !== undefined) {
    annotations.openWorldHint = tool.annotations.openWorldHint;
  }

  // Build input schema
  const inputSchema = tool.inputSchema ?? {
    type: "object" as const,
    properties: {},
  };

  return {
    name: tool.name,
    description: tool.description,
    inputSchema: {
      type: "object",
      properties: (inputSchema.properties ?? {}) as Record<string, JsonObject>,
      required: ("required" in inputSchema
        ? inputSchema.required
        : undefined) as string[] | undefined,
    },
    annotations: Object.keys(annotations).length > 0 ? annotations : undefined,
  };
}

/**
 * Batch convert NeuroLink tools to MCP format
 */
export function batchConvertToMCP(
  tools: NeuroLinkTool[],
  options: ToolConverterOptions = {},
): MCPServerTool[] {
  return tools.map((tool) => neuroLinkToolToMCP(tool, options));
}

/**
 * Batch convert MCP tools to NeuroLink format
 */
export function batchConvertToNeuroLink(
  tools: MCPServerTool[],
  options: { removeNamespacePrefix?: string } = {},
): NeuroLinkTool[] {
  return tools.map((tool) => mcpToolToNeuroLink(tool, options));
}

/**
 * Create a tool from a function with automatic schema inference
 */
export function createToolFromFunction<TParams extends Record<string, unknown>>(
  name: string,
  description: string,
  fn: (
    params: TParams,
    context?: NeuroLinkExecutionContext,
  ) => Promise<unknown>,
  options?: {
    parameters?: JsonObject;
    annotations?: MCPToolAnnotations;
    metadata?: Record<string, unknown>;
  },
): MCPServerTool {
  const inferredAnnotations = inferAnnotations({ name, description });

  return {
    name,
    description,
    inputSchema: options?.parameters ?? { type: "object", properties: {} },
    annotations: {
      ...inferredAnnotations,
      ...options?.annotations,
    },
    execute: async (params, context) => {
      const toolTimeoutMs = 30_000;
      const result = await withTimeout(
        fn(params as TParams, context),
        toolTimeoutMs,
        `Tool '${name}' execution timed out after ${toolTimeoutMs}ms`,
      );
      return result;
    },
    metadata: options?.metadata,
  };
}

/**
 * Validate tool name according to MCP specification
 */
export function validateToolName(name: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!name || typeof name !== "string") {
    errors.push("Tool name is required and must be a string");
  } else {
    if (name.length > 64) {
      errors.push("Tool name must be 64 characters or less");
    }

    if (!/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(name)) {
      errors.push(
        "Tool name must start with a letter or underscore and contain only alphanumeric characters, underscores, and hyphens",
      );
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Sanitize tool name for MCP compatibility
 */
export function sanitizeToolName(name: string): string {
  // Replace invalid characters with underscores
  let sanitized = name.replace(/[^a-zA-Z0-9_-]/g, "_");

  // Ensure starts with letter or underscore
  if (!/^[a-zA-Z_]/.test(sanitized)) {
    sanitized = `_${sanitized}`;
  }

  // Truncate to 64 characters
  if (sanitized.length > 64) {
    sanitized = sanitized.slice(0, 64);
  }

  return sanitized;
}

/**
 * Tool compatibility matrix
 */
export const TOOL_COMPATIBILITY = {
  /**
   * Features supported by MCP 2024-11-05 specification
   */
  MCP_2024_11_05: {
    annotations: true,
    inputSchema: true,
    outputSchema: false,
    streamingResults: false,
    batchExecution: false,
  },

  /**
   * Features supported by NeuroLink
   */
  NEUROLINK: {
    annotations: true,
    inputSchema: true,
    outputSchema: true,
    streamingResults: true,
    batchExecution: true,
    categories: true,
    tags: true,
  },
} as const;
