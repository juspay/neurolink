/**
 * Agent and Workflow Exposure as MCP Tools
 *
 * Enables exposing NeuroLink agents and workflows as MCP tools,
 * allowing external MCP clients to invoke complex AI operations
 * through the standardized MCP protocol.
 *
 * @module mcp/agentExposure
 * @since 8.39.0
 */

import type { JsonObject } from "../types/common.js";
import type {
  NeuroLinkExecutionContext,
  ToolResult,
} from "../types/mcpTypes.js";
import type { MCPServerTool, MCPToolAnnotations } from "./toolAnnotations.js";
import { logger } from "../utils/logger.js";
import { withTimeout } from "../utils/async/withTimeout.js";
import { ErrorFactory } from "../utils/errorHandling.js";

/**
 * Agent definition for MCP exposure
 */
export type ExposableAgent = {
  /**
   * Unique agent identifier
   */
  id: string;

  /**
   * Human-readable agent name
   */
  name: string;

  /**
   * Agent description for AI models
   */
  description: string;

  /**
   * Input schema for the agent
   */
  inputSchema?: JsonObject;

  /**
   * Output schema for the agent
   */
  outputSchema?: JsonObject;

  /**
   * Agent execution function
   */
  execute: (
    input: unknown,
    context?: NeuroLinkExecutionContext,
  ) => Promise<unknown>;

  /**
   * Additional agent metadata
   */
  metadata?: {
    version?: string;
    author?: string;
    category?: string;
    tags?: string[];
    estimatedDuration?: number;
    costHint?: number;
  };
};

/**
 * Workflow definition for MCP exposure
 */
export type ExposableWorkflow = {
  /**
   * Unique workflow identifier
   */
  id: string;

  /**
   * Human-readable workflow name
   */
  name: string;

  /**
   * Workflow description
   */
  description: string;

  /**
   * Workflow steps (for documentation)
   */
  steps?: Array<{
    id: string;
    name: string;
    description?: string;
  }>;

  /**
   * Input schema for the workflow
   */
  inputSchema?: JsonObject;

  /**
   * Output schema for the workflow
   */
  outputSchema?: JsonObject;

  /**
   * Workflow execution function
   */
  execute: (
    input: unknown,
    context?: NeuroLinkExecutionContext,
  ) => Promise<unknown>;

  /**
   * Workflow metadata
   */
  metadata?: {
    version?: string;
    author?: string;
    category?: string;
    tags?: string[];
    estimatedDuration?: number;
    retriable?: boolean;
    idempotent?: boolean;
  };
};

/**
 * Options for exposing agents/workflows as MCP tools
 */
export type ExposureOptions = {
  /**
   * Prefix for tool names
   */
  prefix?: string;

  /**
   * Default annotations for all exposed tools
   */
  defaultAnnotations?: MCPToolAnnotations;

  /**
   * Whether to include metadata in tool description
   */
  includeMetadataInDescription?: boolean;

  /**
   * Custom name transformer
   */
  nameTransformer?: (name: string) => string;

  /**
   * Add execution context wrapper
   */
  wrapWithContext?: boolean;

  /**
   * Timeout for agent/workflow execution (ms)
   */
  executionTimeout?: number;

  /**
   * Enable execution logging
   */
  enableLogging?: boolean;
};

/**
 * Exposure result
 */
export type ExposureResult = {
  /**
   * Generated MCP tool
   */
  tool: MCPServerTool;

  /**
   * Original source type
   */
  sourceType: "agent" | "workflow";

  /**
   * Original source ID
   */
  sourceId: string;

  /**
   * Generated tool name
   */
  toolName: string;
};

/**
 * Expose an agent as an MCP tool
 */
export function exposeAgentAsTool(
  agent: ExposableAgent,
  options: ExposureOptions = {},
): ExposureResult {
  const {
    prefix = "agent",
    defaultAnnotations = {},
    includeMetadataInDescription = true,
    nameTransformer = (name) => name.toLowerCase().replace(/\s+/g, "_"),
    wrapWithContext = true,
    executionTimeout = 300000, // 5 minutes default
    enableLogging = true,
  } = options;

  // Generate tool name
  const baseName = nameTransformer(agent.name);
  const toolName = prefix ? `${prefix}_${baseName}` : baseName;

  // Build description
  let description = agent.description;
  if (includeMetadataInDescription && agent.metadata) {
    const metaParts: string[] = [];
    if (agent.metadata.version) {
      metaParts.push(`v${agent.metadata.version}`);
    }
    if (agent.metadata.category) {
      metaParts.push(`category: ${agent.metadata.category}`);
    }
    if (agent.metadata.estimatedDuration) {
      metaParts.push(`~${agent.metadata.estimatedDuration}ms`);
    }
    if (metaParts.length > 0) {
      description += ` [${metaParts.join(", ")}]`;
    }
  }

  // Build annotations
  const annotations: MCPToolAnnotations = {
    ...defaultAnnotations,
    complexity: defaultAnnotations.complexity ?? "complex",
    estimatedDuration:
      agent.metadata?.estimatedDuration ?? defaultAnnotations.estimatedDuration,
    costHint: agent.metadata?.costHint ?? defaultAnnotations.costHint,
    tags: [
      ...(defaultAnnotations.tags ?? []),
      "agent",
      ...(agent.metadata?.tags ?? []),
    ],
  };

  // Build input schema with agent context
  const inputSchema: JsonObject = agent.inputSchema ?? {
    type: "object",
    properties: {},
  };

  // Create execution wrapper
  const execute = async (
    params: unknown,
    context?: NeuroLinkExecutionContext,
  ): Promise<ToolResult> => {
    const startTime = Date.now();

    if (enableLogging) {
      logger.debug(
        `[AgentExposure] Executing agent '${agent.id}' as tool '${toolName}'`,
      );
    }

    try {
      // Execute agent with context wrapper if enabled
      const existingConfig =
        context?.config && typeof context.config === "object"
          ? (context.config as Record<string, unknown>)
          : {};
      const executionContext: NeuroLinkExecutionContext = wrapWithContext
        ? {
            ...context,
            config: {
              ...existingConfig,
              sourceType: "mcp-exposed-agent",
              agentId: agent.id,
              toolName,
            },
          }
        : (context ?? {});

      const result = await withTimeout(
        agent.execute(params, executionContext),
        executionTimeout,
      );

      const duration = Date.now() - startTime;

      if (enableLogging) {
        logger.debug(
          `[AgentExposure] Agent '${agent.id}' completed in ${duration}ms`,
        );
      }

      return {
        success: true,
        data: result,
        metadata: {
          agentId: agent.id,
          toolName,
          executionTime: duration,
          sourceType: "agent",
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const agentError =
        error instanceof Error
          ? error
          : ErrorFactory.toolExecutionFailed(
              toolName,
              new Error(String(error)),
            );

      if (enableLogging) {
        logger.error(
          `[AgentExposure] Agent '${agent.id}' failed after ${duration}ms: ${agentError.message}`,
        );
      }

      return {
        success: false,
        error: agentError.message,
        metadata: {
          agentId: agent.id,
          toolName,
          executionTime: duration,
          sourceType: "agent",
        },
      };
    }
  };

  const tool: MCPServerTool = {
    name: toolName,
    description,
    inputSchema,
    outputSchema: agent.outputSchema,
    annotations,
    execute,
    metadata: {
      sourceType: "agent",
      sourceId: agent.id,
      originalName: agent.name,
      ...agent.metadata,
    },
  };

  return {
    tool,
    sourceType: "agent",
    sourceId: agent.id,
    toolName,
  };
}

/**
 * Expose a workflow as an MCP tool
 */
export function exposeWorkflowAsTool(
  workflow: ExposableWorkflow,
  options: ExposureOptions = {},
): ExposureResult {
  const {
    prefix = "workflow",
    defaultAnnotations = {},
    includeMetadataInDescription = true,
    nameTransformer = (name) => name.toLowerCase().replace(/\s+/g, "_"),
    wrapWithContext = true,
    executionTimeout = 600000, // 10 minutes default for workflows
    enableLogging = true,
  } = options;

  // Generate tool name
  const baseName = nameTransformer(workflow.name);
  const toolName = prefix ? `${prefix}_${baseName}` : baseName;

  // Build description
  let description = workflow.description;
  if (includeMetadataInDescription) {
    const metaParts: string[] = [];
    if (workflow.metadata?.version) {
      metaParts.push(`v${workflow.metadata.version}`);
    }
    if (workflow.steps?.length) {
      metaParts.push(`${workflow.steps.length} steps`);
    }
    if (workflow.metadata?.estimatedDuration) {
      metaParts.push(`~${workflow.metadata.estimatedDuration}ms`);
    }
    if (metaParts.length > 0) {
      description += ` [${metaParts.join(", ")}]`;
    }
  }

  // Build annotations
  const annotations: MCPToolAnnotations = {
    ...defaultAnnotations,
    complexity: defaultAnnotations.complexity ?? "complex",
    estimatedDuration:
      workflow.metadata?.estimatedDuration ??
      defaultAnnotations.estimatedDuration,
    idempotentHint:
      workflow.metadata?.idempotent ?? defaultAnnotations.idempotentHint,
    tags: [
      ...(defaultAnnotations.tags ?? []),
      "workflow",
      ...(workflow.metadata?.tags ?? []),
    ],
  };

  // Build input schema
  const inputSchema: JsonObject = workflow.inputSchema ?? {
    type: "object",
    properties: {},
  };

  // Create execution wrapper
  const execute = async (
    params: unknown,
    context?: NeuroLinkExecutionContext,
  ): Promise<ToolResult> => {
    const startTime = Date.now();

    if (enableLogging) {
      logger.debug(
        `[WorkflowExposure] Executing workflow '${workflow.id}' as tool '${toolName}'`,
      );
    }

    try {
      // Execute workflow with context wrapper if enabled
      const existingConfig =
        context?.config && typeof context.config === "object"
          ? (context.config as Record<string, unknown>)
          : {};
      const executionContext: NeuroLinkExecutionContext = wrapWithContext
        ? {
            ...context,
            config: {
              ...existingConfig,
              sourceType: "mcp-exposed-workflow",
              workflowId: workflow.id,
              toolName,
            },
          }
        : (context ?? {});

      const result = await withTimeout(
        workflow.execute(params, executionContext),
        executionTimeout,
      );

      const duration = Date.now() - startTime;

      if (enableLogging) {
        logger.debug(
          `[WorkflowExposure] Workflow '${workflow.id}' completed in ${duration}ms`,
        );
      }

      return {
        success: true,
        data: result,
        metadata: {
          workflowId: workflow.id,
          toolName,
          executionTime: duration,
          sourceType: "workflow",
          stepsCount: workflow.steps?.length,
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const workflowError =
        error instanceof Error
          ? error
          : ErrorFactory.toolExecutionFailed(
              toolName,
              new Error(String(error)),
            );

      if (enableLogging) {
        logger.error(
          `[WorkflowExposure] Workflow '${workflow.id}' failed after ${duration}ms: ${workflowError.message}`,
        );
      }

      return {
        success: false,
        error: workflowError.message,
        metadata: {
          workflowId: workflow.id,
          toolName,
          executionTime: duration,
          sourceType: "workflow",
        },
      };
    }
  };

  const tool: MCPServerTool = {
    name: toolName,
    description,
    inputSchema,
    outputSchema: workflow.outputSchema,
    annotations,
    execute,
    metadata: {
      sourceType: "workflow",
      sourceId: workflow.id,
      originalName: workflow.name,
      steps: workflow.steps,
      ...workflow.metadata,
    },
  };

  return {
    tool,
    sourceType: "workflow",
    sourceId: workflow.id,
    toolName,
  };
}

/**
 * Batch expose agents as MCP tools
 */
export function exposeAgentsAsTools(
  agents: ExposableAgent[],
  options: ExposureOptions = {},
): ExposureResult[] {
  return agents.map((agent) => exposeAgentAsTool(agent, options));
}

/**
 * Batch expose workflows as MCP tools
 */
export function exposeWorkflowsAsTools(
  workflows: ExposableWorkflow[],
  options: ExposureOptions = {},
): ExposureResult[] {
  return workflows.map((workflow) => exposeWorkflowAsTool(workflow, options));
}

/**
 * Agent Exposure Manager
 *
 * Manages the lifecycle of exposed agents and workflows,
 * providing registration, lookup, and invocation capabilities.
 */
export class AgentExposureManager {
  private exposedTools: Map<string, ExposureResult> = new Map();
  private options: ExposureOptions;

  constructor(options: ExposureOptions = {}) {
    this.options = options;
  }

  /**
   * Expose an agent and register it
   */
  exposeAgent(agent: ExposableAgent): MCPServerTool {
    const result = exposeAgentAsTool(agent, this.options);
    this.exposedTools.set(result.toolName, result);
    return result.tool;
  }

  /**
   * Expose a workflow and register it
   */
  exposeWorkflow(workflow: ExposableWorkflow): MCPServerTool {
    const result = exposeWorkflowAsTool(workflow, this.options);
    this.exposedTools.set(result.toolName, result);
    return result.tool;
  }

  /**
   * Get all exposed tools
   */
  getExposedTools(): MCPServerTool[] {
    return Array.from(this.exposedTools.values()).map((r) => r.tool);
  }

  /**
   * Get exposed tool by name
   */
  getExposedTool(toolName: string): MCPServerTool | undefined {
    return this.exposedTools.get(toolName)?.tool;
  }

  /**
   * Get exposure result by tool name
   */
  getExposureResult(toolName: string): ExposureResult | undefined {
    return this.exposedTools.get(toolName);
  }

  /**
   * Get tools by source type
   */
  getToolsBySourceType(sourceType: "agent" | "workflow"): MCPServerTool[] {
    return Array.from(this.exposedTools.values())
      .filter((r) => r.sourceType === sourceType)
      .map((r) => r.tool);
  }

  /**
   * Remove exposed tool
   */
  unexpose(toolName: string): boolean {
    return this.exposedTools.delete(toolName);
  }

  /**
   * Clear all exposed tools
   */
  clear(): void {
    this.exposedTools.clear();
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalExposed: number;
    exposedAgents: number;
    exposedWorkflows: number;
    toolNames: string[];
  } {
    const results = Array.from(this.exposedTools.values());
    return {
      totalExposed: results.length,
      exposedAgents: results.filter((r) => r.sourceType === "agent").length,
      exposedWorkflows: results.filter((r) => r.sourceType === "workflow")
        .length,
      toolNames: results.map((r) => r.toolName),
    };
  }
}

/**
 * Global agent exposure manager instance
 */
export const globalAgentExposureManager = new AgentExposureManager();
