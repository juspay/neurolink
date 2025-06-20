/**
 * NeuroLink MCP Tool Registry System
 * Central registry for managing MCP servers and tools with execution capabilities
 * Supports tool discovery, registration, and orchestrated execution
 */

import type {
  NeuroLinkMCPServer,
  NeuroLinkMCPTool,
  NeuroLinkExecutionContext,
  ToolResult,
} from "./factory.js";
import { ContextManager, ContextValidator } from "./context-manager.js";
import { registryLogger, mcpLogger } from "./logging.js";

/**
 * Tool registration information
 */
export interface ToolRegistration {
  tool: NeuroLinkMCPTool;
  serverId: string;
  serverTitle: string;
  serverCategory?: string;
  qualifiedName: string; // serverId.toolName
  simpleName: string; // toolName
  registeredAt: number;
}

/**
 * Tool execution options
 */
export interface ToolExecutionOptions {
  validateInput?: boolean;
  validatePermissions?: boolean;
  trackMetrics?: boolean;
  timeoutMs?: number;
}

/**
 * Tool search criteria
 */
export interface ToolSearchCriteria {
  name?: string;
  category?: string;
  serverId?: string;
  serverCategory?: string;
  permissions?: string[];
  implemented?: boolean;
}

/**
 * Registry statistics
 */
export interface RegistryStats {
  totalServers: number;
  totalTools: number;
  toolsByCategory: Record<string, number>;
  serversByCategory: Record<string, number>;
  executionCount: number;
  averageExecutionTime: number;
  errorRate: number;
}

/**
 * Central MCP Tool Registry
 * Manages all MCP servers and their tools with advanced execution capabilities
 */
export class MCPToolRegistry {
  private servers: Map<string, NeuroLinkMCPServer> = new Map();
  private tools: Map<string, ToolRegistration> = new Map();
  private contextManager: ContextManager;

  // Execution tracking
  private executionCount: number = 0;
  private totalExecutionTime: number = 0;
  private errorCount: number = 0;

  constructor(contextManager?: ContextManager) {
    this.contextManager = contextManager || new ContextManager();
  }

  /**
   * Register an MCP server and all its tools
   *
   * @param server MCP server to register
   * @throws Error if server ID already exists
   */
  async registerServer(server: NeuroLinkMCPServer): Promise<void> {
    // Check for duplicate server ID - if already registered, skip silently
    if (this.servers.has(server.id)) {
      mcpLogger.debug(
        `Server with ID '${server.id}' is already registered, skipping registration`,
      );
      return;
    }

    // Register the server
    this.servers.set(server.id, server);

    // Register all tools from the server
    for (const [toolName, tool] of Object.entries(server.tools)) {
      await this.registerToolFromServer(server, toolName, tool);
    }

    registryLogger.debug(
      `Registered server '${server.id}' with ${Object.keys(server.tools).length} tools`,
    );
  }

  /**
   * Register a single tool from a server
   *
   * @param server Source server
   * @param toolName Tool name
   * @param tool Tool implementation
   */
  private async registerToolFromServer(
    server: NeuroLinkMCPServer,
    toolName: string,
    tool: NeuroLinkMCPTool,
  ): Promise<void> {
    const qualifiedName = `${server.id}.${toolName}`;
    const simpleName = toolName;

    const registration: ToolRegistration = {
      tool,
      serverId: server.id,
      serverTitle: server.title,
      serverCategory: server.category,
      qualifiedName,
      simpleName,
      registeredAt: Date.now(),
    };

    // Register with both qualified and simple names
    this.tools.set(qualifiedName, registration);

    // Only register simple name if it doesn't conflict
    if (!this.tools.has(simpleName)) {
      this.tools.set(simpleName, registration);
    } else {
      registryLogger.warn(
        `Tool name conflict: '${simpleName}' already exists, use qualified name '${qualifiedName}'`,
      );
    }
  }

  /**
   * Execute a tool with comprehensive error handling and context tracking
   *
   * @param toolName Tool name (simple or qualified)
   * @param params Tool parameters
   * @param context Execution context
   * @param options Execution options
   * @returns Tool execution result
   */
  async executeTool(
    toolName: string,
    params: any,
    context: NeuroLinkExecutionContext,
    options: ToolExecutionOptions = {},
  ): Promise<ToolResult> {
    const startTime = Date.now();
    const {
      validateInput = true,
      validatePermissions = true,
      trackMetrics = true,
      timeoutMs = 30000,
    } = options;

    try {
      // Find the tool
      const registration = this.tools.get(toolName);
      if (!registration) {
        throw new Error(`Tool not found: ${toolName}`);
      }

      const { tool, serverId, serverTitle } = registration;

      // Validate context
      if (validatePermissions) {
        const contextValidation = ContextValidator.validateContext(context);
        if (!contextValidation.isValid) {
          throw new Error(
            `Context validation failed: ${contextValidation.errors.join(", ")}`,
          );
        }

        // Check tool permissions
        if (
          tool.permissions &&
          !ContextValidator.hasPermissions(context, tool.permissions)
        ) {
          throw new Error(
            `Insufficient permissions for tool '${toolName}'. Required: ${tool.permissions.join(", ")}`,
          );
        }
      }

      // Validate input parameters if schema provided
      if (validateInput && tool.inputSchema) {
        try {
          tool.inputSchema.parse(params);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          throw new Error(
            `Input validation failed for tool '${toolName}': ${errorMessage}`,
          );
        }
      }

      // Add tool to execution chain
      this.contextManager.addToToolChain(context, toolName);

      // Execute tool with timeout
      const executeWithTimeout = this.createTimeoutPromise(
        tool.execute(params, context),
        timeoutMs,
        `Tool '${toolName}' execution timeout`,
      );

      const result = await executeWithTimeout;

      // Add execution metadata
      const executionTime = Date.now() - startTime;
      const enhancedResult: ToolResult = {
        ...result,
        metadata: {
          ...result.metadata,
          toolName,
          serverId,
          serverTitle,
          sessionId: context.sessionId,
          timestamp: Date.now(),
          executionTime,
        },
      };

      // Track metrics
      if (trackMetrics) {
        this.updateExecutionMetrics(executionTime, result.success);
      }

      // Validate output if schema provided
      if (tool.outputSchema && result.success) {
        try {
          tool.outputSchema.parse(result.data);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          registryLogger.warn(
            `Output validation warning for tool '${toolName}': ${errorMessage}`,
          );
        }
      }

      registryLogger.debug(
        `Executed tool '${toolName}' in ${executionTime}ms - ${result.success ? "SUCCESS" : "FAILED"}`,
      );

      return enhancedResult;
    } catch (error) {
      const executionTime = Date.now() - startTime;

      // Track error metrics
      if (trackMetrics) {
        this.updateExecutionMetrics(executionTime, false);
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorResult: ToolResult = {
        success: false,
        error: errorMessage,
        metadata: {
          toolName,
          sessionId: context.sessionId,
          timestamp: Date.now(),
          executionTime,
        },
      };

      registryLogger.error(
        `Tool execution failed '${toolName}': ${errorMessage}`,
      );

      return errorResult;
    }
  }

  /**
   * List all available tools with optional filtering
   *
   * @param criteria Search criteria for filtering tools
   * @returns Array of tool information
   */
  listTools(criteria: ToolSearchCriteria = {}): {
    name: string;
    qualifiedName: string;
    description: string;
    server: string;
    serverTitle: string;
    category?: string;
    serverCategory?: string;
    permissions?: string[];
    isImplemented?: boolean;
  }[] {
    const tools = [];

    // Get unique tools (prefer qualified names over simple names)
    const uniqueTools = new Map<string, ToolRegistration>();

    for (const [name, registration] of this.tools) {
      if (name.includes(".")) {
        // Qualified name
        uniqueTools.set(registration.qualifiedName, registration);
      } else if (!uniqueTools.has(registration.qualifiedName)) {
        uniqueTools.set(registration.qualifiedName, registration);
      }
    }

    for (const registration of uniqueTools.values()) {
      const {
        tool,
        serverId,
        serverTitle,
        serverCategory,
        qualifiedName,
        simpleName,
      } = registration;

      // Apply filters
      if (
        criteria.name &&
        !simpleName.toLowerCase().includes(criteria.name.toLowerCase())
      ) {
        continue;
      }

      if (criteria.category && tool.category !== criteria.category) {
        continue;
      }

      if (criteria.serverId && serverId !== criteria.serverId) {
        continue;
      }

      if (
        criteria.serverCategory &&
        serverCategory !== criteria.serverCategory
      ) {
        continue;
      }

      if (
        criteria.implemented !== undefined &&
        tool.isImplemented !== criteria.implemented
      ) {
        continue;
      }

      if (criteria.permissions && criteria.permissions.length > 0) {
        const toolPermissions = tool.permissions || [];
        const hasAllPermissions = criteria.permissions.every((p) =>
          toolPermissions.includes(p),
        );
        if (!hasAllPermissions) {
          continue;
        }
      }

      tools.push({
        name: simpleName,
        qualifiedName,
        description: tool.description,
        server: serverId,
        serverTitle,
        category: tool.category,
        serverCategory,
        permissions: tool.permissions,
        isImplemented: tool.isImplemented,
      });
    }

    return tools.sort((a, b) => a.qualifiedName.localeCompare(b.qualifiedName));
  }

  /**
   * Get detailed information about a specific tool
   *
   * @param toolName Tool name (simple or qualified)
   * @returns Detailed tool information or undefined if not found
   */
  getToolInfo(toolName: string):
    | {
        tool: NeuroLinkMCPTool;
        server: NeuroLinkMCPServer;
        registration: ToolRegistration;
      }
    | undefined {
    const registration = this.tools.get(toolName);
    if (!registration) {
      return undefined;
    }

    const server = this.servers.get(registration.serverId);
    if (!server) {
      return undefined;
    }

    return {
      tool: registration.tool,
      server,
      registration,
    };
  }

  /**
   * Get registry statistics
   *
   * @returns Comprehensive registry statistics
   */
  getStats(): RegistryStats {
    const toolsByCategory: Record<string, number> = {};
    const serversByCategory: Record<string, number> = {};

    // Count tools by category
    for (const registration of this.tools.values()) {
      const category = registration.tool.category || "uncategorized";
      toolsByCategory[category] = (toolsByCategory[category] || 0) + 1;
    }

    // Count servers by category
    for (const server of this.servers.values()) {
      const category = server.category || "uncategorized";
      serversByCategory[category] = (serversByCategory[category] || 0) + 1;
    }

    return {
      totalServers: this.servers.size,
      totalTools: new Set(
        Array.from(this.tools.values()).map((r) => r.qualifiedName),
      ).size,
      toolsByCategory,
      serversByCategory,
      executionCount: this.executionCount,
      averageExecutionTime:
        this.executionCount > 0
          ? this.totalExecutionTime / this.executionCount
          : 0,
      errorRate:
        this.executionCount > 0 ? this.errorCount / this.executionCount : 0,
    };
  }

  /**
   * Unregister a server and all its tools
   *
   * @param serverId Server ID to unregister
   * @returns Whether server was found and removed
   */
  unregisterServer(serverId: string): boolean {
    const server = this.servers.get(serverId);
    if (!server) {
      return false;
    }

    // Remove all tools from this server
    const toolsToRemove = [];
    for (const [name, registration] of this.tools) {
      if (registration.serverId === serverId) {
        toolsToRemove.push(name);
      }
    }

    for (const toolName of toolsToRemove) {
      this.tools.delete(toolName);
    }

    // Remove the server
    this.servers.delete(serverId);

    registryLogger.debug(
      `Unregistered server '${serverId}' and ${toolsToRemove.length} tools`,
    );

    return true;
  }

  /**
   * Clear all servers and tools
   */
  clear(): void {
    this.servers.clear();
    this.tools.clear();
    this.executionCount = 0;
    this.totalExecutionTime = 0;
    this.errorCount = 0;

    registryLogger.debug("Cleared all servers and tools");
  }

  /**
   * Create timeout promise wrapper
   *
   * @param promise Promise to wrap
   * @param timeoutMs Timeout in milliseconds
   * @param timeoutMessage Error message for timeout
   * @returns Promise that rejects on timeout
   */
  private createTimeoutPromise<T>(
    promise: Promise<T>,
    timeoutMs: number,
    timeoutMessage: string,
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
      }),
    ]);
  }

  /**
   * Update execution metrics
   *
   * @param executionTime Execution time in milliseconds
   * @param success Whether execution was successful
   */
  private updateExecutionMetrics(
    executionTime: number,
    success: boolean,
  ): void {
    this.executionCount++;
    this.totalExecutionTime += executionTime;

    if (!success) {
      this.errorCount++;
    }
  }
}

/**
 * Default registry instance
 * Can be used across the application for consistent tool management
 */
export const defaultToolRegistry = new MCPToolRegistry();

/**
 * Utility function to register server with default registry
 *
 * @param server MCP server to register
 */
export async function registerServer(
  server: NeuroLinkMCPServer,
): Promise<void> {
  return defaultToolRegistry.registerServer(server);
}

/**
 * Utility function to execute tool with default registry
 *
 * @param toolName Tool name to execute
 * @param params Tool parameters
 * @param context Execution context
 * @param options Execution options
 * @returns Tool execution result
 */
export async function executeTool(
  toolName: string,
  params: any,
  context: NeuroLinkExecutionContext,
  options?: ToolExecutionOptions,
): Promise<ToolResult> {
  return defaultToolRegistry.executeTool(toolName, params, context, options);
}

/**
 * Utility function to list tools with default registry
 *
 * @param criteria Search criteria
 * @returns Array of tool information
 */
export function listTools(criteria?: ToolSearchCriteria) {
  return defaultToolRegistry.listTools(criteria);
}
