/**
 * External MCP Server Manager
 * Handles lifecycle management of external MCP servers including:
 * - Process spawning and management
 * - Health monitoring and automatic restart
 * - Connection management and cleanup
 * - Tool discovery and registration
 */

import { EventEmitter } from "events";
import { mcpLogger } from "../utils/logger.js";
import { MCPClientFactory } from "./mcpClientFactory.js";
import { ToolDiscoveryService } from "./toolDiscoveryService.js";
import { toolRegistry } from "./toolRegistry.js";
import type { HITLManager } from "../types/hitlTypes.js";
import { HITLUserRejectedError, HITLTimeoutError } from "../hitl/hitlErrors.js";
import type {
  ExternalMCPServerInstance,
  ExternalMCPServerStatus,
  ExternalMCPServerHealth,
  ExternalMCPConfigValidation,
  ExternalMCPOperationResult,
  ExternalMCPServerEvents,
  ExternalMCPManagerConfig,
  ExternalMCPToolInfo,
  RuntimeMCPServerInfo,
} from "../types/externalMcp.js";
import type {
  MCPServerInfo,
  MCPServerCategory,
  MCPTransportType,
} from "../types/mcpTypes.js";
import type { JsonValue, JsonObject, UnknownRecord } from "../types/common.js";
import { detectCategory } from "../utils/mcpDefaults.js";
import type { ServerLoadResult } from "../types/typeAliases.js";
import { isObject, isNonNullObject } from "../utils/typeUtils.js";

/**
 * Recursively substitute environment variables in strings
 * Replaces ${VAR_NAME} with the value from process.env.VAR_NAME
 * @param value - Value to process (string, object, array, or primitive)
 * @returns Processed value with environment variables substituted
 */
function substituteEnvVariables<T>(value: T): T {
  if (typeof value === "string") {
    // Replace ${VAR_NAME} with process.env.VAR_NAME
    return value.replace(/\$\{([^}]+)\}/g, (match, varName) => {
      const envValue = process.env[varName.trim()];
      if (envValue === undefined) {
        mcpLogger.warn(
          `[ExternalServerManager] Environment variable ${varName} is not defined, using empty string`,
        );
        return "";
      }
      return envValue;
    }) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => substituteEnvVariables(item)) as T;
  }

  if (isNonNullObject(value)) {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[key] = substituteEnvVariables(val);
    }
    return result as T;
  }

  return value;
}

/**
 * Type guard to validate if an object can be safely used as Record<string, JsonValue>
 */
function isValidJsonRecord(value: unknown): value is Record<string, JsonValue> {
  if (!isObject(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return Object.values(record).every((val) => {
    // JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }
    if (
      val === null ||
      typeof val === "string" ||
      typeof val === "number" ||
      typeof val === "boolean"
    ) {
      return true;
    }
    if (Array.isArray(val)) {
      return val.every(
        (item) =>
          isValidJsonRecord(item) ||
          typeof item === "string" ||
          typeof item === "number" ||
          typeof item === "boolean" ||
          item === null,
      );
    }
    if (isNonNullObject(val)) {
      return isValidJsonRecord(val);
    }
    return false;
  });
}

/**
 * Safely converts unknown metadata to Record<string, JsonValue> or returns undefined
 */
function safeMetadataConversion(
  metadata: unknown,
): Record<string, JsonValue> | undefined {
  return isValidJsonRecord(metadata) ? metadata : undefined;
}

/**
 * Type guard to validate external MCP server configuration
 * Supports both stdio transport (requires command) and HTTP transport (requires url)
 */
function isValidExternalMCPServerConfig(
  config: unknown,
): config is UnknownRecord {
  if (!isNonNullObject(config)) {
    return false;
  }
  const record = config as UnknownRecord;

  // Validate blockedTools array contains only strings
  if (record.blockedTools !== undefined) {
    if (!Array.isArray(record.blockedTools)) {
      return false;
    }
    if (!record.blockedTools.every((item) => typeof item === "string")) {
      return false;
    }
  }

  // Must have either command (for stdio) or url (for HTTP/SSE transport)
  const hasCommand = typeof record.command === "string";
  const hasUrl = typeof record.url === "string";

  if (!hasCommand && !hasUrl) {
    return false;
  }

  return (
    (record.command === undefined || typeof record.command === "string") &&
    (record.args === undefined || Array.isArray(record.args)) &&
    (record.env === undefined || isNonNullObject(record.env)) &&
    (record.transport === undefined || typeof record.transport === "string") &&
    (record.timeout === undefined || typeof record.timeout === "number") &&
    (record.retries === undefined || typeof record.retries === "number") &&
    (record.healthCheckInterval === undefined ||
      typeof record.healthCheckInterval === "number") &&
    (record.autoRestart === undefined ||
      typeof record.autoRestart === "boolean") &&
    (record.cwd === undefined || typeof record.cwd === "string") &&
    (record.url === undefined || typeof record.url === "string") &&
    (record.headers === undefined || isNonNullObject(record.headers)) &&
    (record.httpOptions === undefined || isNonNullObject(record.httpOptions)) &&
    (record.retryConfig === undefined || isNonNullObject(record.retryConfig)) &&
    (record.rateLimiting === undefined ||
      isNonNullObject(record.rateLimiting)) &&
    (record.metadata === undefined || isNonNullObject(record.metadata))
  );
}

/**
 * ExternalServerManager
 * Core class for managing external MCP servers
 */
export class ExternalServerManager extends EventEmitter {
  private servers: Map<string, RuntimeMCPServerInfo> = new Map();
  private config: Required<ExternalMCPManagerConfig>;
  private isShuttingDown = false;
  private toolDiscovery: ToolDiscoveryService;
  private enableMainRegistryIntegration: boolean;
  private hitlManager?: HITLManager; // Optional HITL manager for safety mechanisms

  constructor(
    config: ExternalMCPManagerConfig = {},
    options: { enableMainRegistryIntegration?: boolean } = {},
  ) {
    super();

    // Set defaults for configuration
    this.config = {
      maxServers: config.maxServers ?? 10,
      defaultTimeout: config.defaultTimeout ?? 10000,
      defaultHealthCheckInterval: config.defaultHealthCheckInterval ?? 30000,
      enableAutoRestart: config.enableAutoRestart ?? true,
      maxRestartAttempts: config.maxRestartAttempts ?? 3,
      restartBackoffMultiplier: config.restartBackoffMultiplier ?? 2,
      enablePerformanceMonitoring: config.enablePerformanceMonitoring ?? true,
      logLevel: config.logLevel ?? "info",
    };

    // Disable main tool registry integration by default to prevent automatic tool execution
    this.enableMainRegistryIntegration =
      options.enableMainRegistryIntegration ?? false;

    // Initialize tool discovery service
    this.toolDiscovery = new ToolDiscoveryService();

    // Forward tool discovery events
    this.toolDiscovery.on("toolRegistered", (event) => {
      this.emit("toolDiscovered", event);
    });

    this.toolDiscovery.on("toolUnregistered", (event) => {
      this.emit("toolRemoved", event);
    });

    // Handle process cleanup
    process.on("SIGINT", () => this.shutdown());
    process.on("SIGTERM", () => this.shutdown());
    process.on("beforeExit", () => this.shutdown());
  }

  /**
   * Set HITL manager for human-in-the-loop safety mechanisms
   * @param hitlManager - HITL manager instance (optional, can be undefined to disable)
   */
  setHITLManager(hitlManager?: HITLManager): void {
    this.hitlManager = hitlManager;
    if (hitlManager && hitlManager.isEnabled()) {
      mcpLogger.info(
        "[ExternalServerManager] HITL safety mechanisms enabled for external tool execution",
      );
    } else {
      mcpLogger.debug(
        "[ExternalServerManager] HITL safety mechanisms disabled or not configured",
      );
    }
  }

  /**
   * Get current HITL manager
   */
  getHITLManager(): HITLManager | undefined {
    return this.hitlManager;
  }

  /**
   * Load MCP server configurations from .mcp-config.json file with parallel loading support
   * Automatically registers servers found in the configuration
   * @param configPath Optional path to config file (defaults to .mcp-config.json in cwd)
   * @param options Loading options including parallel support
   * @returns Promise resolving to { serversLoaded, errors }
   */
  async loadMCPConfiguration(
    configPath?: string,
    options: { parallel?: boolean } = {},
  ): Promise<ServerLoadResult> {
    if (options.parallel) {
      return this.loadMCPConfigurationParallel(configPath);
    }
    return this.loadMCPConfigurationSequential(configPath);
  }

  /**
   * Load MCP servers in parallel for improved performance
   * @param configPath Optional path to config file (defaults to .mcp-config.json in cwd)
   * @returns Promise resolving to batch operation result
   */
  async loadMCPConfigurationParallel(
    configPath?: string | null,
  ): Promise<ServerLoadResult> {
    const fs = await import("fs");
    const path = await import("path");

    const finalConfigPath =
      configPath || path.join(process.cwd(), ".mcp-config.json");

    if (!fs.existsSync(finalConfigPath)) {
      mcpLogger.debug(
        `[ExternalServerManager] No MCP config found at ${finalConfigPath}`,
      );
      return { serversLoaded: 0, errors: [] };
    }

    mcpLogger.debug(
      `[ExternalServerManager] Loading MCP configuration in PARALLEL mode from ${finalConfigPath}`,
    );

    try {
      const configContent = fs.readFileSync(finalConfigPath, "utf8");
      const config = JSON.parse(configContent);

      if (!config.mcpServers || typeof config.mcpServers !== "object") {
        mcpLogger.debug(
          "[ExternalServerManager] No mcpServers found in configuration",
        );
        return { serversLoaded: 0, errors: [] };
      }

      // Create promises for all servers to start them concurrently
      const serverPromises = Object.entries(config.mcpServers).map(
        async ([serverId, serverConfig]) => {
          try {
            // Validate and convert config format to MCPServerInfo
            if (!isValidExternalMCPServerConfig(serverConfig)) {
              throw new Error(
                `Invalid server config for ${serverId}: missing required properties or wrong types`,
              );
            }

            const externalConfig: MCPServerInfo = {
              id: serverId,
              name: serverId,
              description:
                typeof serverConfig.description === "string"
                  ? serverConfig.description
                  : `External MCP server: ${serverId}`,
              transport:
                typeof serverConfig.transport === "string"
                  ? (serverConfig.transport as MCPTransportType)
                  : "stdio",
              status: "initializing" as const,
              tools: [],
              command:
                typeof serverConfig.command === "string"
                  ? serverConfig.command
                  : undefined,
              args: Array.isArray(serverConfig.args)
                ? (serverConfig.args as string[])
                : [],
              env: isNonNullObject(serverConfig.env)
                ? substituteEnvVariables(
                    serverConfig.env as Record<string, string>,
                  )
                : {},
              timeout:
                typeof serverConfig.timeout === "number"
                  ? serverConfig.timeout
                  : undefined,
              retries:
                typeof serverConfig.retries === "number"
                  ? serverConfig.retries
                  : undefined,
              healthCheckInterval:
                typeof serverConfig.healthCheckInterval === "number"
                  ? serverConfig.healthCheckInterval
                  : undefined,
              autoRestart:
                typeof serverConfig.autoRestart === "boolean"
                  ? serverConfig.autoRestart
                  : undefined,
              cwd:
                typeof serverConfig.cwd === "string"
                  ? serverConfig.cwd
                  : undefined,
              url:
                typeof serverConfig.url === "string"
                  ? serverConfig.url
                  : undefined,
              // HTTP transport-specific fields
              headers: isNonNullObject(serverConfig.headers)
                ? substituteEnvVariables(
                    serverConfig.headers as Record<string, string>,
                  )
                : undefined,
              httpOptions: isNonNullObject(serverConfig.httpOptions)
                ? (serverConfig.httpOptions as MCPServerInfo["httpOptions"])
                : undefined,
              retryConfig: isNonNullObject(serverConfig.retryConfig)
                ? (serverConfig.retryConfig as MCPServerInfo["retryConfig"])
                : undefined,
              rateLimiting: isNonNullObject(serverConfig.rateLimiting)
                ? (serverConfig.rateLimiting as MCPServerInfo["rateLimiting"])
                : undefined,
              blockedTools: Array.isArray(serverConfig.blockedTools)
                ? (serverConfig.blockedTools as string[])
                : undefined,
              metadata: safeMetadataConversion(serverConfig.metadata),
            };

            const result = await this.addServer(serverId, externalConfig);
            return { serverId, result };
          } catch (error) {
            const errorMsg = `Failed to load MCP server ${serverId}: ${
              error instanceof Error ? error.message : String(error)
            }`;
            mcpLogger.warn(`[ExternalServerManager] ${errorMsg}`);
            return { serverId, error: errorMsg };
          }
        },
      );

      // Start all servers concurrently and wait for completion
      const results = await Promise.allSettled(serverPromises);

      // Process results to count successes and collect errors
      let serversLoaded = 0;
      const errors: string[] = [];

      for (const result of results) {
        if (result.status === "fulfilled") {
          const { serverId, result: serverResult, error } = result.value;
          if (serverResult && serverResult.success) {
            serversLoaded++;
            mcpLogger.debug(
              `[ExternalServerManager] Successfully loaded MCP server in parallel: ${serverId}`,
            );
          } else if (error) {
            errors.push(error);
          } else if (serverResult && !serverResult.success) {
            const errorMsg = `Failed to load server ${serverId}: ${serverResult.error}`;
            errors.push(errorMsg);
            mcpLogger.warn(`[ExternalServerManager] ${errorMsg}`);
          }
        } else {
          // Promise.allSettled rejected - this shouldn't happen with our error handling
          const errorMsg = `Unexpected error during parallel loading: ${result.reason}`;
          errors.push(errorMsg);
          mcpLogger.error(`[ExternalServerManager] ${errorMsg}`);
        }
      }

      mcpLogger.info(
        `[ExternalServerManager] PARALLEL MCP configuration loading complete: ${serversLoaded} servers loaded, ${errors.length} errors`,
      );

      return { serversLoaded, errors };
    } catch (error) {
      const errorMsg = `Failed to load MCP configuration in parallel mode: ${
        error instanceof Error ? error.message : String(error)
      }`;
      mcpLogger.error(`[ExternalServerManager] ${errorMsg}`);
      return { serversLoaded: 0, errors: [errorMsg] };
    }
  }

  /**
   * Load MCP servers sequentially (original implementation for backward compatibility)
   * @param configPath Optional path to config file (defaults to .mcp-config.json in cwd)
   * @returns Promise resolving to batch operation result
   */
  async loadMCPConfigurationSequential(
    configPath?: string,
  ): Promise<ServerLoadResult> {
    const fs = await import("fs");
    const path = await import("path");

    const finalConfigPath =
      configPath || path.join(process.cwd(), ".mcp-config.json");

    if (!fs.existsSync(finalConfigPath)) {
      mcpLogger.debug(
        `[ExternalServerManager] No MCP config found at ${finalConfigPath}`,
      );
      return { serversLoaded: 0, errors: [] };
    }

    mcpLogger.debug(
      `[ExternalServerManager] Loading MCP configuration from ${finalConfigPath}`,
    );

    try {
      const configContent = fs.readFileSync(finalConfigPath, "utf8");
      const config = JSON.parse(configContent);

      if (!config.mcpServers || typeof config.mcpServers !== "object") {
        mcpLogger.debug(
          "[ExternalServerManager] No mcpServers found in configuration",
        );
        return { serversLoaded: 0, errors: [] };
      }

      let serversLoaded = 0;
      const errors: string[] = [];

      for (const [serverId, serverConfig] of Object.entries(
        config.mcpServers,
      )) {
        try {
          // Validate and convert config format to MCPServerInfo
          if (!isValidExternalMCPServerConfig(serverConfig)) {
            throw new Error(
              `Invalid server config for ${serverId}: missing required properties or wrong types`,
            );
          }
          const externalConfig: MCPServerInfo = {
            id: serverId,
            name: serverId,
            description:
              typeof serverConfig.description === "string"
                ? serverConfig.description
                : `External MCP server: ${serverId}`,
            transport:
              typeof serverConfig.transport === "string"
                ? (serverConfig.transport as MCPTransportType)
                : "stdio",
            status: "initializing" as const,
            tools: [],
            command:
              typeof serverConfig.command === "string"
                ? serverConfig.command
                : undefined,
            args: Array.isArray(serverConfig.args)
              ? (serverConfig.args as string[])
              : [],
            env: isNonNullObject(serverConfig.env)
              ? substituteEnvVariables(
                  serverConfig.env as Record<string, string>,
                )
              : {},
            timeout:
              typeof serverConfig.timeout === "number"
                ? serverConfig.timeout
                : undefined,
            retries:
              typeof serverConfig.retries === "number"
                ? serverConfig.retries
                : undefined,
            healthCheckInterval:
              typeof serverConfig.healthCheckInterval === "number"
                ? serverConfig.healthCheckInterval
                : undefined,
            autoRestart:
              typeof serverConfig.autoRestart === "boolean"
                ? serverConfig.autoRestart
                : undefined,
            cwd:
              typeof serverConfig.cwd === "string"
                ? serverConfig.cwd
                : undefined,
            url:
              typeof serverConfig.url === "string"
                ? serverConfig.url
                : undefined,
            // HTTP transport-specific fields
            headers: isNonNullObject(serverConfig.headers)
              ? substituteEnvVariables(
                  serverConfig.headers as Record<string, string>,
                )
              : undefined,
            httpOptions: isNonNullObject(serverConfig.httpOptions)
              ? (serverConfig.httpOptions as MCPServerInfo["httpOptions"])
              : undefined,
            retryConfig: isNonNullObject(serverConfig.retryConfig)
              ? (serverConfig.retryConfig as MCPServerInfo["retryConfig"])
              : undefined,
            rateLimiting: isNonNullObject(serverConfig.rateLimiting)
              ? (serverConfig.rateLimiting as MCPServerInfo["rateLimiting"])
              : undefined,
            blockedTools: Array.isArray(serverConfig.blockedTools)
              ? (serverConfig.blockedTools as string[])
              : undefined,
            metadata: safeMetadataConversion(serverConfig.metadata),
          };

          const result = await this.addServer(serverId, externalConfig);

          if (result.success) {
            serversLoaded++;
            mcpLogger.debug(
              `[ExternalServerManager] Successfully loaded MCP server: ${serverId}`,
            );
          } else {
            const error = `Failed to load server ${serverId}: ${result.error}`;
            errors.push(error);
            mcpLogger.warn(`[ExternalServerManager] ${error}`);
          }
        } catch (error) {
          const errorMsg = `Failed to load MCP server ${serverId}: ${
            error instanceof Error ? error.message : String(error)
          }`;
          errors.push(errorMsg);
          mcpLogger.warn(`[ExternalServerManager] ${errorMsg}`);
          // Continue with other servers - don't let one failure break everything
        }
      }

      mcpLogger.info(
        `[ExternalServerManager] MCP configuration loading complete: ${serversLoaded} servers loaded, ${errors.length} errors`,
      );

      return { serversLoaded, errors };
    } catch (error) {
      const errorMsg = `Failed to load MCP configuration: ${
        error instanceof Error ? error.message : String(error)
      }`;
      mcpLogger.error(`[ExternalServerManager] ${errorMsg}`);
      return { serversLoaded: 0, errors: [errorMsg] };
    }
  }

  /**
   * Validate external MCP server configuration
   */
  validateConfig(config: MCPServerInfo): ExternalMCPConfigValidation {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Required fields validation
    if (!config.id || typeof config.id !== "string") {
      errors.push("Server ID is required and must be a string");
    }

    if (!["stdio", "sse", "websocket", "http"].includes(config.transport)) {
      errors.push("Transport must be one of: stdio, sse, websocket, http");
    }

    // Transport-specific validation
    if (config.transport === "stdio") {
      // stdio transport requires command
      if (!config.command || typeof config.command !== "string") {
        errors.push(
          "Command is required and must be a string for stdio transport",
        );
      }
      if (!Array.isArray(config.args)) {
        errors.push("Args must be an array");
      }
    } else if (
      config.transport === "sse" ||
      config.transport === "websocket" ||
      config.transport === "http"
    ) {
      // HTTP-based transports require URL
      if (!config.url || typeof config.url !== "string") {
        errors.push(`URL is required for ${config.transport} transport`);
      }
    }

    // Warnings for common issues
    if (config.timeout && config.timeout < 5000) {
      warnings.push("Timeout less than 5 seconds may cause connection issues");
    }

    if (config.retries && config.retries > 5) {
      warnings.push("High retry count may slow down error recovery");
    }

    // Suggestions for optimization
    if (!config.healthCheckInterval) {
      suggestions.push(
        "Consider setting a health check interval for better reliability",
      );
    }

    if (config.autoRestart === undefined) {
      suggestions.push("Consider enabling auto-restart for production use");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  }

  /**
   * Convert MCPServerInfo format (keeping for backward compatibility)
   * Helper function for transitioning to zero-conversion architecture
   */
  private convertConfigToMCPServerInfo(
    serverId: string,
    config: MCPServerInfo,
  ): MCPServerInfo {
    return {
      id: serverId,
      name: String(config.metadata?.title || serverId),
      description: `External MCP server (${config.transport})`,
      status: "initializing" as const,
      transport: config.transport,
      command: config.command,
      args: config.args,
      env: config.env,
      tools: [], // Will be populated after server connection
      blockedTools: config.blockedTools,
      metadata: {
        category: "external" as MCPServerCategory,
        // Store additional ExternalMCPServerConfig fields in metadata
        timeout: config.timeout,
        retries: config.retries,
        healthCheckInterval: config.healthCheckInterval,
        autoRestart: config.autoRestart,
        cwd: config.cwd,
        url: config.url,
        ...(safeMetadataConversion(config.metadata) || {}),
      },
    };
  }

  /**
   * Add a new external MCP server - Backward compatibility overload
   */
  async addServer(
    serverId: string,
    config: MCPServerInfo,
  ): Promise<ExternalMCPOperationResult<ExternalMCPServerInstance>>;

  /**
   * Add a new external MCP server - Updated to accept MCPServerInfo
   */
  async addServer(
    serverId: string,
    serverInfo: MCPServerInfo,
  ): Promise<ExternalMCPOperationResult<ExternalMCPServerInstance>>;

  async addServer(
    serverId: string,
    configOrServerInfo: MCPServerInfo,
  ): Promise<ExternalMCPOperationResult<ExternalMCPServerInstance>> {
    const startTime = Date.now();

    try {
      // Use MCPServerInfo directly (zero-conversion architecture)
      const serverInfo: MCPServerInfo =
        "transport" in configOrServerInfo &&
        "command" in configOrServerInfo &&
        !("tools" in configOrServerInfo)
          ? this.convertConfigToMCPServerInfo(
              serverId,
              configOrServerInfo as MCPServerInfo,
            )
          : (configOrServerInfo as MCPServerInfo);

      // Check server limit
      if (this.servers.size >= this.config.maxServers) {
        return {
          success: false,
          error: `Maximum number of servers (${this.config.maxServers}) reached`,
          serverId,
          duration: Date.now() - startTime,
        };
      }

      // Validate configuration (for backward compatibility, create temporary config)
      const tempConfig: MCPServerInfo = {
        id: serverId,
        name: serverInfo.name,
        description: serverInfo.description,
        transport: serverInfo.transport,
        status: serverInfo.status,
        tools: serverInfo.tools,
        command: serverInfo.command || "",
        args: serverInfo.args || [],
        env: serverInfo.env || {},
        timeout: serverInfo.timeout,
        retries: serverInfo.retries,
        healthCheckInterval: serverInfo.healthCheckInterval,
        autoRestart: serverInfo.autoRestart,
        cwd: serverInfo.cwd,
        url: serverInfo.url,
        blockedTools: serverInfo.blockedTools,
        metadata: safeMetadataConversion(serverInfo.metadata),
        // HTTP transport-specific fields
        headers: serverInfo.headers,
        httpOptions: serverInfo.httpOptions,
        retryConfig: serverInfo.retryConfig,
        rateLimiting: serverInfo.rateLimiting,
      };

      const validation = this.validateConfig(tempConfig);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Configuration validation failed: ${validation.errors.join(", ")}`,
          serverId,
          duration: Date.now() - startTime,
        };
      }

      // Check for duplicate server ID
      if (this.servers.has(serverId)) {
        return {
          success: false,
          error: `Server with ID '${serverId}' already exists`,
          serverId,
          duration: Date.now() - startTime,
        };
      }

      mcpLogger.info(`[ExternalServerManager] Adding server: ${serverId}`, {
        command: serverInfo.command,
        transport: serverInfo.transport,
      });

      // Create server instance as RuntimeMCPServerInfo (transition to zero-conversion)
      const instance: RuntimeMCPServerInfo = {
        ...serverInfo,
        process: null,
        client: null,
        transportInstance: null,
        status: "initializing",
        reconnectAttempts: 0,
        maxReconnectAttempts: this.config.maxRestartAttempts,
        toolsMap: new Map(),
        metrics: {
          totalConnections: 0,
          totalDisconnections: 0,
          totalErrors: 0,
          totalToolCalls: 0,
          averageResponseTime: 0,
          lastResponseTime: 0,
        },
        config: tempConfig,
      };

      // Store the instance
      this.servers.set(serverId, instance);

      // Start the server
      await this.startServer(serverId);

      const finalInstance = this.servers.get(serverId);
      if (!finalInstance) {
        throw new Error(`Server ${serverId} not found after registration`);
      }

      // Convert RuntimeMCPServerInfo to ExternalMCPServerInstance for return
      const convertedInstance: ExternalMCPServerInstance = {
        config: finalInstance.config,
        process: finalInstance.process,
        client: finalInstance.client,
        transport: finalInstance.transportInstance,
        status: finalInstance.status as ExternalMCPServerStatus,
        lastError: finalInstance.lastError,
        startTime: finalInstance.startTime,
        lastHealthCheck: finalInstance.lastHealthCheck,
        reconnectAttempts: finalInstance.reconnectAttempts,
        maxReconnectAttempts: finalInstance.maxReconnectAttempts,
        tools: finalInstance.toolsMap,
        toolsArray: finalInstance.toolsArray,
        capabilities: finalInstance.capabilities,
        healthTimer: finalInstance.healthTimer,
        restartTimer: finalInstance.restartTimer,
        metrics: finalInstance.metrics,
      } as ExternalMCPServerInstance;

      return {
        success: true,
        data: convertedInstance,
        serverId,
        duration: Date.now() - startTime,
        metadata: {
          timestamp: Date.now(),
          operation: "addServer",
          toolsDiscovered: finalInstance.tools.length,
        },
      };
    } catch (error) {
      mcpLogger.error(
        `[ExternalServerManager] Failed to add server ${serverId}:`,
        error,
      );

      // Clean up if instance was created
      this.servers.delete(serverId);

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        serverId,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Remove an external MCP server
   */
  async removeServer(
    serverId: string,
  ): Promise<ExternalMCPOperationResult<void>> {
    const startTime = Date.now();

    try {
      const instance = this.servers.get(serverId);
      if (!instance) {
        return {
          success: false,
          error: `Server '${serverId}' not found`,
          serverId,
          duration: Date.now() - startTime,
        };
      }

      mcpLogger.info(`[ExternalServerManager] Removing server: ${serverId}`);

      // Stop the server
      await this.stopServer(serverId);

      // Remove from registry
      this.servers.delete(serverId);

      // Emit event
      this.emit("disconnected", {
        serverId,
        reason: "Manually removed",
        timestamp: new Date(),
      } satisfies ExternalMCPServerEvents["disconnected"]);

      return {
        success: true,
        serverId,
        duration: Date.now() - startTime,
        metadata: {
          timestamp: Date.now(),
          operation: "removeServer",
        },
      };
    } catch (error) {
      mcpLogger.error(
        `[ExternalServerManager] Failed to remove server ${serverId}:`,
        error,
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        serverId,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Start an external MCP server
   */
  private async startServer(serverId: string): Promise<void> {
    const instance = this.servers.get(serverId);
    if (!instance) {
      throw new Error(`Server '${serverId}' not found`);
    }

    const config = instance.config;

    try {
      this.updateServerStatus(serverId, "connecting");

      mcpLogger.debug(`[ExternalServerManager] Starting server: ${serverId}`, {
        command: config.command,
        args: config.args,
        transport: config.transport,
      });

      // Create MCP client using the factory
      const clientResult = await MCPClientFactory.createClient(
        config,
        config.timeout || this.config.defaultTimeout,
      );

      if (
        !clientResult.success ||
        !clientResult.client ||
        !clientResult.transport
      ) {
        throw new Error(`Failed to create MCP client: ${clientResult.error}`);
      }

      // Store client components
      instance.client = clientResult.client;
      instance.transportInstance = clientResult.transport;
      instance.process = clientResult.process || null;
      instance.capabilities = safeMetadataConversion(clientResult.capabilities);
      instance.startTime = new Date();
      instance.lastHealthCheck = new Date();
      instance.metrics.totalConnections++;

      // Handle process events if there's a process
      if (instance.process) {
        instance.process.on("error", (error) => {
          mcpLogger.error(
            `[ExternalServerManager] Process error for ${serverId}:`,
            error,
          );
          this.handleServerError(serverId, error);
        });

        instance.process.on("exit", (code, signal) => {
          mcpLogger.warn(
            `[ExternalServerManager] Process exited for ${serverId}`,
            {
              code,
              signal,
            },
          );
          this.handleServerDisconnection(
            serverId,
            `Process exited with code ${code}`,
          );
        });

        // Log stderr for debugging
        instance.process.stderr?.on("data", (data) => {
          const message = data.toString().trim();
          if (message) {
            mcpLogger.debug(
              `[ExternalServerManager] ${serverId} stderr:`,
              message,
            );
          }
        });
      }

      this.updateServerStatus(serverId, "connected");

      // Discover tools from the server
      await this.discoverServerTools(serverId);

      // Register tools with main registry if integration is enabled
      if (this.enableMainRegistryIntegration) {
        await this.registerServerToolsWithMainRegistry(serverId);
      }

      // Start health monitoring
      this.startHealthMonitoring(serverId);

      // Emit connected event
      this.emit("connected", {
        serverId,
        toolCount: instance.toolsMap.size,
        timestamp: new Date(),
      } satisfies ExternalMCPServerEvents["connected"]);

      mcpLogger.info(
        `[ExternalServerManager] Server started successfully: ${serverId}`,
      );
    } catch (error) {
      mcpLogger.error(
        `[ExternalServerManager] Failed to start server ${serverId}:`,
        error,
      );
      this.updateServerStatus(serverId, "failed");
      instance.lastError =
        error instanceof Error ? error.message : String(error);
      throw error;
    }
  }

  /**
   * Stop an external MCP server
   */
  private async stopServer(serverId: string): Promise<void> {
    const instance = this.servers.get(serverId);
    if (!instance) {
      return;
    }

    try {
      this.updateServerStatus(serverId, "stopping");

      // Clear timers
      if (instance.healthTimer) {
        clearInterval(instance.healthTimer);
        instance.healthTimer = undefined;
      }

      if (instance.restartTimer) {
        clearTimeout(instance.restartTimer);
        instance.restartTimer = undefined;
      }

      // Unregister tools from main registry if integration is enabled
      if (this.enableMainRegistryIntegration) {
        this.unregisterServerToolsFromMainRegistry(serverId);
      }

      // Clear server tools from discovery service
      this.toolDiscovery.clearServerTools(serverId);

      // Close MCP client using factory cleanup
      if (instance.client && instance.transportInstance) {
        try {
          await MCPClientFactory.closeClient(
            instance.client,
            instance.transportInstance,
            instance.process || undefined,
          );
        } catch (error) {
          mcpLogger.debug(
            `[ExternalServerManager] Error closing client for ${serverId}:`,
            error,
          );
        }

        instance.client = null;
        instance.transportInstance = null;
        instance.process = null;
      }
      this.updateServerStatus(serverId, "stopped");

      mcpLogger.info(`[ExternalServerManager] Server stopped: ${serverId}`);
    } catch (error) {
      mcpLogger.error(
        `[ExternalServerManager] Error stopping server ${serverId}:`,
        error,
      );
      this.updateServerStatus(serverId, "failed");
    }
  }

  /**
   * Update server status and emit events
   */
  private updateServerStatus(
    serverId: string,
    newStatus: ExternalMCPServerStatus,
  ): void {
    const instance = this.servers.get(serverId);
    if (!instance) {
      return;
    }

    const oldStatus = instance.status;
    // Map ExternalMCPServerStatus to MCPServerInfo status
    const mappedStatus: MCPServerInfo["status"] =
      newStatus === "connecting" || newStatus === "restarting"
        ? "initializing"
        : newStatus === "stopping" || newStatus === "stopped"
          ? "stopping"
          : newStatus === "connected"
            ? "connected"
            : newStatus === "disconnected"
              ? "disconnected"
              : "failed";

    instance.status = mappedStatus;

    // Emit status change event
    this.emit("statusChanged", {
      serverId,
      oldStatus,
      newStatus,
      timestamp: new Date(),
    } satisfies ExternalMCPServerEvents["statusChanged"]);

    mcpLogger.debug(
      `[ExternalServerManager] Status changed for ${serverId}: ${oldStatus} -> ${newStatus}`,
    );
  }

  /**
   * Handle server errors
   */
  private handleServerError(serverId: string, error: Error): void {
    const instance = this.servers.get(serverId);
    if (!instance) {
      return;
    }

    instance.lastError = error.message;
    instance.metrics.totalErrors++;

    mcpLogger.error(
      `[ExternalServerManager] Server error for ${serverId}:`,
      error,
    );

    // Emit failed event
    this.emit("failed", {
      serverId,
      error: error.message,
      timestamp: new Date(),
    } satisfies ExternalMCPServerEvents["failed"]);

    // Attempt restart if enabled
    if (this.config.enableAutoRestart && !this.isShuttingDown) {
      this.scheduleRestart(serverId);
    } else {
      this.updateServerStatus(serverId, "failed");
    }
  }

  /**
   * Handle server disconnection
   */
  private handleServerDisconnection(serverId: string, reason: string): void {
    const instance = this.servers.get(serverId);
    if (!instance) {
      return;
    }

    instance.metrics.totalDisconnections++;

    mcpLogger.warn(
      `[ExternalServerManager] Server disconnected ${serverId}: ${reason}`,
    );

    // Emit disconnected event
    this.emit("disconnected", {
      serverId,
      reason,
      timestamp: new Date(),
    } satisfies ExternalMCPServerEvents["disconnected"]);

    // Attempt restart if enabled
    if (this.config.enableAutoRestart && !this.isShuttingDown) {
      this.scheduleRestart(serverId);
    } else {
      this.updateServerStatus(serverId, "disconnected");
    }
  }

  /**
   * Schedule server restart with exponential backoff
   */
  private scheduleRestart(serverId: string): void {
    const instance = this.servers.get(serverId);
    if (!instance) {
      return;
    }

    if (instance.reconnectAttempts >= instance.maxReconnectAttempts) {
      mcpLogger.error(
        `[ExternalServerManager] Max restart attempts reached for ${serverId}`,
      );
      this.updateServerStatus(serverId, "failed");
      return;
    }

    instance.reconnectAttempts++;
    this.updateServerStatus(serverId, "restarting");

    const delay = Math.min(
      1000 *
        Math.pow(
          this.config.restartBackoffMultiplier,
          instance.reconnectAttempts - 1,
        ),
      30000, // Max 30 seconds
    );

    mcpLogger.info(
      `[ExternalServerManager] Scheduling restart for ${serverId} in ${delay}ms (attempt ${instance.reconnectAttempts})`,
    );

    if (instance.restartTimer) {
      return;
    } // already scheduled
    instance.restartTimer = setTimeout(async () => {
      try {
        await this.stopServer(serverId);
        await this.startServer(serverId);

        // Reset restart attempts on successful restart
        instance.reconnectAttempts = 0;
      } catch (error) {
        mcpLogger.error(
          `[ExternalServerManager] Restart failed for ${serverId}:`,
          error,
        );
        this.scheduleRestart(serverId); // Try again
      }
    }, delay);
  }

  /**
   * Start health monitoring for a server
   */
  private startHealthMonitoring(serverId: string): void {
    const instance = this.servers.get(serverId);
    if (!instance || !this.config.enablePerformanceMonitoring) {
      return;
    }

    const interval =
      instance.config.healthCheckInterval ??
      this.config.defaultHealthCheckInterval;

    instance.healthTimer = setInterval(async () => {
      await this.performHealthCheck(serverId);
    }, interval);
  }

  /**
   * Perform health check on a server
   */
  private async performHealthCheck(serverId: string): Promise<void> {
    const instance = this.servers.get(serverId);
    if (!instance || instance.status !== "connected") {
      return;
    }

    const startTime = Date.now();

    try {
      // For now, simple process check
      let isHealthy = true;
      const issues: string[] = [];

      if (instance.process && instance.process.killed) {
        isHealthy = false;
        issues.push("Process is killed");
      }

      const responseTime = Date.now() - startTime;
      instance.lastHealthCheck = new Date();

      const health: ExternalMCPServerHealth = {
        serverId,
        isHealthy,
        status: instance.status,
        checkedAt: new Date(),
        responseTime,
        toolCount: instance.toolsMap.size,
        issues,
        performance: {
          uptime: instance.startTime
            ? Date.now() - instance.startTime.getTime()
            : 0,
          averageResponseTime: instance.metrics.averageResponseTime,
        },
      };

      // Emit health check event
      this.emit("healthCheck", {
        serverId,
        health,
        timestamp: new Date(),
      } satisfies ExternalMCPServerEvents["healthCheck"]);

      if (!isHealthy) {
        mcpLogger.warn(
          `[ExternalServerManager] Health check failed for ${serverId}:`,
          issues,
        );
        this.handleServerError(
          serverId,
          new Error(`Health check failed: ${issues.join(", ")}`),
        );
      }
    } catch (error) {
      mcpLogger.error(
        `[ExternalServerManager] Health check error for ${serverId}:`,
        error,
      );
      this.handleServerError(
        serverId,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  /**
   * Get server instance - converted to ExternalMCPServerInstance for compatibility
   */
  getServer(serverId: string): ExternalMCPServerInstance | undefined {
    const runtime = this.servers.get(serverId);
    if (!runtime) {
      return undefined;
    }

    return {
      config: runtime.config,
      process: runtime.process,
      client: runtime.client,
      transport: runtime.transportInstance,
      status: runtime.status as ExternalMCPServerStatus,
      lastError: runtime.lastError,
      startTime: runtime.startTime,
      lastHealthCheck: runtime.lastHealthCheck,
      reconnectAttempts: runtime.reconnectAttempts,
      maxReconnectAttempts: runtime.maxReconnectAttempts,
      tools: runtime.toolsMap,
      toolsArray: runtime.toolsArray,
      capabilities: runtime.capabilities,
      healthTimer: runtime.healthTimer,
      restartTimer: runtime.restartTimer,
      metrics: runtime.metrics,
    } as ExternalMCPServerInstance;
  }

  /**
   * Get all servers - converted to ExternalMCPServerInstance for compatibility
   */
  getAllServers(): Map<string, ExternalMCPServerInstance> {
    const converted = new Map<string, ExternalMCPServerInstance>();
    for (const [serverId, runtime] of this.servers.entries()) {
      converted.set(serverId, {
        config: runtime.config,
        process: runtime.process,
        client: runtime.client,
        transport: runtime.transportInstance,
        status: runtime.status as ExternalMCPServerStatus,
        lastError: runtime.lastError,
        startTime: runtime.startTime,
        lastHealthCheck: runtime.lastHealthCheck,
        reconnectAttempts: runtime.reconnectAttempts,
        maxReconnectAttempts: runtime.maxReconnectAttempts,
        tools: runtime.toolsMap,
        toolsArray: runtime.toolsArray,
        capabilities: runtime.capabilities,
        healthTimer: runtime.healthTimer,
        restartTimer: runtime.restartTimer,
        metrics: runtime.metrics,
      } as ExternalMCPServerInstance);
    }
    return converted;
  }

  /**
   * List servers as MCPServerInfo - ZERO conversion needed
   */
  listServers(): MCPServerInfo[] {
    return Array.from(this.servers.values()) as MCPServerInfo[];
  }

  /**
   * Get server statuses
   */
  getServerStatuses(): ExternalMCPServerHealth[] {
    const statuses: ExternalMCPServerHealth[] = [];

    for (const [serverId, instance] of Array.from(this.servers.entries())) {
      const uptime = instance.startTime
        ? Date.now() - instance.startTime.getTime()
        : 0;

      statuses.push({
        serverId,
        isHealthy: instance.status === "connected",
        status: instance.status,
        checkedAt: instance.lastHealthCheck || new Date(),
        toolCount: instance.toolsMap.size,
        issues: instance.lastError ? [instance.lastError] : [],
        performance: {
          uptime,
          averageResponseTime: instance.metrics.averageResponseTime,
        },
      });
    }

    return statuses;
  }

  /**
   * Shutdown all servers
   */
  async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    mcpLogger.info("[ExternalServerManager] Shutting down all servers...");

    const shutdownPromises = Array.from(this.servers.keys()).map((serverId) =>
      this.stopServer(serverId).catch((error) => {
        mcpLogger.error(
          `[ExternalServerManager] Error shutting down ${serverId}:`,
          error,
        );
      }),
    );

    await Promise.all(shutdownPromises);
    this.servers.clear();

    mcpLogger.info("[ExternalServerManager] All servers shut down");
  }

  /**
   * Get manager statistics
   */
  getStatistics(): {
    totalServers: number;
    connectedServers: number;
    failedServers: number;
    totalTools: number;
    totalConnections: number;
    totalErrors: number;
  } {
    let connectedServers = 0;
    let failedServers = 0;
    let totalTools = 0;
    let totalConnections = 0;
    let totalErrors = 0;

    for (const instance of Array.from(this.servers.values())) {
      if (instance.status === "connected") {
        connectedServers++;
      } else if (instance.status === "failed") {
        failedServers++;
      }

      totalTools += instance.toolsMap.size;
      totalConnections += instance.metrics.totalConnections;
      totalErrors += instance.metrics.totalErrors;
    }

    return {
      totalServers: this.servers.size,
      connectedServers,
      failedServers,
      totalTools,
      totalConnections,
      totalErrors,
    };
  }

  /**
   * Discover tools from a server
   */
  private async discoverServerTools(serverId: string): Promise<void> {
    const instance = this.servers.get(serverId);
    if (!instance || !instance.client) {
      throw new Error(`Server '${serverId}' not found or not connected`);
    }

    try {
      mcpLogger.debug(
        `[ExternalServerManager] Discovering tools for server: ${serverId}`,
      );

      const discoveryResult = await this.toolDiscovery.discoverTools(
        serverId,
        instance.client,
        instance.config.timeout || this.config.defaultTimeout,
      );

      if (discoveryResult.success) {
        instance.toolsMap.clear();
        instance.toolsArray = undefined;
        instance.tools = [];

        const blockedTools = instance.blockedTools || [];
        let blockedCount = 0;

        for (const tool of discoveryResult.tools) {
          // Check if tool is blocked
          if (blockedTools.includes(tool.name)) {
            mcpLogger.info(
              `[ExternalServerManager] Blocking tool '${tool.name}' from server '${serverId}' (configured in blockedTools)`,
            );
            blockedCount++;
            continue; // Skip blocked tools
          }

          instance.toolsMap.set(tool.name, tool);
          instance.tools.push({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
          });
        }

        mcpLogger.info(
          `[ExternalServerManager] Discovered ${discoveryResult.toolCount} tools for ${serverId} (${blockedCount} blocked, ${instance.toolsMap.size} available)`,
        );
      } else {
        mcpLogger.warn(
          `[ExternalServerManager] Tool discovery failed for ${serverId}: ${discoveryResult.error}`,
        );
      }
    } catch (error) {
      mcpLogger.error(
        `[ExternalServerManager] Tool discovery error for ${serverId}:`,
        error,
      );
    }
  }

  /**
   * Register server tools with main tool registry for unified access
   * This enables external MCP tools to be accessed via the main toolRegistry.executeTool()
   */
  private async registerServerToolsWithMainRegistry(
    serverId: string,
  ): Promise<void> {
    const instance = this.servers.get(serverId);
    if (!instance) {
      throw new Error(`Server '${serverId}' not found`);
    }

    try {
      mcpLogger.debug(
        `[ExternalServerManager] Registering ${instance.toolsMap.size} tools with main registry for server: ${serverId}`,
      );

      const registrations: Array<Promise<unknown>> = [];
      for (const [toolName, tool] of instance.toolsMap.entries()) {
        const toolId = `${serverId}.${toolName}`;

        const toolInfo = {
          name: toolName,
          description: tool.description || toolName,
          inputSchema: tool.inputSchema || {},
          serverId: serverId,
          category: detectCategory({ isExternal: true, serverId }),
        };

        try {
          registrations.push(
            toolRegistry.registerTool(toolId, toolInfo, {
              execute: async (params: unknown, _context?: unknown) => {
                // Execute tool via ExternalServerManager for proper lifecycle management
                return await this.executeTool(
                  serverId,
                  toolName,
                  params as JsonObject,
                  {
                    timeout:
                      instance.config.timeout || this.config.defaultTimeout,
                  },
                );
              },
            }),
          );

          mcpLogger.debug(
            `[ExternalServerManager] Registered tool with main registry: ${toolId}`,
          );
        } catch (registrationError) {
          mcpLogger.warn(
            `[ExternalServerManager] Failed to register tool ${toolId} with main registry:`,
            registrationError,
          );
        }
      }

      const results = await Promise.allSettled(registrations);
      const ok = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.length - ok;
      mcpLogger.info(
        `[ExternalServerManager] Registered ${ok}/${results.length} tools with main registry for ${serverId}${failed ? ` (${failed} failed)` : ""}`,
      );
    } catch (error) {
      mcpLogger.error(
        `[ExternalServerManager] Failed to register tools with main registry for ${serverId}:`,
        error,
      );
    }
  }

  /**
   * Unregister server tools from main tool registry
   */
  private unregisterServerToolsFromMainRegistry(serverId: string): void {
    const instance = this.servers.get(serverId);
    if (!instance || !this.enableMainRegistryIntegration) {
      return;
    }

    try {
      mcpLogger.debug(
        `[ExternalServerManager] Unregistering tools from main registry for server: ${serverId}`,
      );

      for (const [toolName] of instance.toolsMap.entries()) {
        const toolId = `${serverId}.${toolName}`;
        try {
          toolRegistry.removeTool(toolId);
          mcpLogger.debug(
            `[ExternalServerManager] Unregistered tool from main registry: ${toolId}`,
          );
        } catch (error) {
          mcpLogger.debug(
            `[ExternalServerManager] Failed to unregister tool ${toolId}:`,
            error,
          );
        }
      }

      mcpLogger.debug(
        `[ExternalServerManager] Completed unregistering tools from main registry for ${serverId}`,
      );
    } catch (error) {
      mcpLogger.error(
        `[ExternalServerManager] Error unregistering tools from main registry for ${serverId}:`,
        error,
      );
    }
  }

  /**
   * Execute a tool on a specific server
   */
  async executeTool(
    serverId: string,
    toolName: string,
    parameters: JsonObject,
    options?: { timeout?: number },
  ): Promise<unknown> {
    const instance = this.servers.get(serverId);
    if (!instance) {
      throw new Error(`Server '${serverId}' not found`);
    }

    if (!instance.client) {
      throw new Error(`Server '${serverId}' is not connected`);
    }

    if (instance.status !== "connected") {
      throw new Error(
        `Server '${serverId}' is not in connected state: ${instance.status}`,
      );
    }

    // Check if tool is blocked
    const blockedTools = instance.blockedTools || [];
    if (blockedTools.includes(toolName)) {
      throw new Error(
        `Tool '${toolName}' is blocked on server '${serverId}' by configuration`,
      );
    }

    const startTime = Date.now();

    try {
      // HITL Safety Check: Request confirmation if required
      let finalParameters = parameters;
      if (this.hitlManager && this.hitlManager.isEnabled()) {
        const requiresConfirmation = this.hitlManager.requiresConfirmation(
          toolName,
          parameters,
        );

        if (requiresConfirmation) {
          mcpLogger.info(
            `[ExternalServerManager] External tool '${toolName}' on server '${serverId}' requires HITL confirmation`,
          );

          try {
            const confirmationResult =
              await this.hitlManager.requestConfirmation(toolName, parameters, {
                serverId: serverId,
                sessionId: `external-${serverId}-${Date.now()}`,
                userId: undefined, // External tools don't have user context by default
              });

            if (!confirmationResult.approved) {
              // User rejected the tool execution
              throw new HITLUserRejectedError(
                `External tool execution rejected by user: ${confirmationResult.reason || "No reason provided"}`,
                toolName,
                confirmationResult.reason,
              );
            }

            // User approved - use modified arguments if provided
            if (confirmationResult.modifiedArguments !== undefined) {
              finalParameters =
                confirmationResult.modifiedArguments as JsonObject;
              mcpLogger.info(
                `[ExternalServerManager] External tool '${toolName}' arguments modified by user`,
              );
            }

            mcpLogger.info(
              `[ExternalServerManager] External tool '${toolName}' approved for execution (response time: ${confirmationResult.responseTime}ms)`,
            );
          } catch (error) {
            if (error instanceof HITLTimeoutError) {
              // Timeout occurred - user didn't respond in time
              mcpLogger.warn(
                `[ExternalServerManager] External tool '${toolName}' execution timed out waiting for user confirmation`,
              );
              throw error;
            } else if (error instanceof HITLUserRejectedError) {
              // User explicitly rejected
              mcpLogger.info(
                `[ExternalServerManager] External tool '${toolName}' execution rejected by user`,
              );
              throw error;
            } else {
              // Other HITL error (configuration, system error, etc.)
              mcpLogger.error(
                `[ExternalServerManager] HITL confirmation failed for external tool '${toolName}':`,
                error,
              );
              throw new Error(
                `HITL confirmation failed: ${error instanceof Error ? error.message : String(error)}`,
              );
            }
          }
        } else {
          mcpLogger.debug(
            `[ExternalServerManager] External tool '${toolName}' does not require HITL confirmation`,
          );
        }
      }

      // Execute tool through discovery service (with potentially modified parameters)
      const result = await this.toolDiscovery.executeTool(
        toolName,
        serverId,
        instance.client,
        finalParameters,
        {
          timeout:
            options?.timeout ||
            instance.config.timeout ||
            this.config.defaultTimeout,
        },
      );

      const duration = Date.now() - startTime;

      // Update metrics
      instance.metrics.totalToolCalls++;
      instance.metrics.lastResponseTime = duration;

      // Update average response time
      const totalTime =
        instance.metrics.averageResponseTime *
          (instance.metrics.totalToolCalls - 1) +
        duration;
      instance.metrics.averageResponseTime =
        totalTime / instance.metrics.totalToolCalls;

      if (result.success) {
        mcpLogger.debug(
          `[ExternalServerManager] Tool executed successfully: ${toolName} on ${serverId}`,
          {
            duration,
          },
        );
        return result.data;
      } else {
        throw new Error(result.error || "Tool execution failed");
      }
    } catch (error) {
      instance.metrics.totalErrors++;

      mcpLogger.error(
        `[ExternalServerManager] Tool execution failed: ${toolName} on ${serverId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get all tools from all servers
   */
  getAllTools(): ExternalMCPToolInfo[] {
    return this.toolDiscovery.getAllTools();
  }

  /**
   * Get tools for a specific server
   */
  getServerTools(serverId: string): ExternalMCPToolInfo[] {
    return this.toolDiscovery.getServerTools(serverId);
  }

  /**
   * Get tool discovery service
   */
  getToolDiscovery(): ToolDiscoveryService {
    return this.toolDiscovery;
  }
}
