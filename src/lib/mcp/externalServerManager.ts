/**
 * External MCP Server Manager
 * Handles lifecycle management of external MCP servers including:
 * - Process spawning and management
 * - Health monitoring and automatic restart
 * - Connection management and cleanup
 * - Tool discovery and registration
 */

import { EventEmitter } from "events";
import { spawn, ChildProcess } from "child_process";
import { mcpLogger } from "../utils/logger.js";
import { MCPClientFactory } from "./mcpClientFactory.js";
import { ToolDiscoveryService } from "./toolDiscoveryService.js";
import type {
  ExternalMCPServerConfig,
  ExternalMCPServerInstance,
  ExternalMCPServerStatus,
  ExternalMCPServerHealth,
  ExternalMCPConfigValidation,
  ExternalMCPOperationResult,
  ExternalMCPServerEvents,
  ExternalMCPManagerConfig,
  ExternalMCPToolInfo,
} from "../types/externalMcp.js";
import type { JsonValue } from "../types/common.js";

/**
 * ExternalServerManager
 * Core class for managing external MCP servers
 */
export class ExternalServerManager extends EventEmitter {
  private servers: Map<string, ExternalMCPServerInstance> = new Map();
  private config: Required<ExternalMCPManagerConfig>;
  private isShuttingDown = false;
  private toolDiscovery: ToolDiscoveryService;

  constructor(config: ExternalMCPManagerConfig = {}) {
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
   * Validate external MCP server configuration
   */
  validateConfig(config: ExternalMCPServerConfig): ExternalMCPConfigValidation {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Required fields validation
    if (!config.id || typeof config.id !== "string") {
      errors.push("Server ID is required and must be a string");
    }

    if (!config.command || typeof config.command !== "string") {
      errors.push("Command is required and must be a string");
    }

    if (!Array.isArray(config.args)) {
      errors.push("Args must be an array");
    }

    if (!["stdio", "sse", "websocket"].includes(config.transport)) {
      errors.push("Transport must be one of: stdio, sse, websocket");
    }

    // URL validation for non-stdio transports
    if (
      (config.transport === "sse" || config.transport === "websocket") &&
      !config.url
    ) {
      errors.push(`URL is required for ${config.transport} transport`);
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
   * Add a new external MCP server
   */
  async addServer(
    serverId: string,
    config: ExternalMCPServerConfig,
  ): Promise<ExternalMCPOperationResult<ExternalMCPServerInstance>> {
    const startTime = Date.now();

    try {
      // Check server limit
      if (this.servers.size >= this.config.maxServers) {
        return {
          success: false,
          error: `Maximum number of servers (${this.config.maxServers}) reached`,
          serverId,
          duration: Date.now() - startTime,
        };
      }

      // Validate configuration
      const validation = this.validateConfig(config);
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
        command: config.command,
        transport: config.transport,
      });

      // Create server instance
      const instance: ExternalMCPServerInstance = {
        config: { ...config, id: serverId },
        process: null,
        client: null,
        transport: null,
        status: "initializing",
        reconnectAttempts: 0,
        maxReconnectAttempts: this.config.maxRestartAttempts,
        tools: new Map(),
        metrics: {
          totalConnections: 0,
          totalDisconnections: 0,
          totalErrors: 0,
          totalToolCalls: 0,
          averageResponseTime: 0,
          lastResponseTime: 0,
        },
      };

      // Store the instance
      this.servers.set(serverId, instance);

      // Start the server
      await this.startServer(serverId);

      const finalInstance = this.servers.get(serverId)!;

      return {
        success: true,
        data: finalInstance,
        serverId,
        duration: Date.now() - startTime,
        metadata: {
          timestamp: Date.now(),
          operation: "addServer",
          toolsDiscovered: finalInstance.tools.size,
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
      instance.transport = clientResult.transport;
      instance.process = clientResult.process || null;
      instance.capabilities = clientResult.capabilities as
        | Record<string, JsonValue>
        | undefined;
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

      // Start health monitoring
      this.startHealthMonitoring(serverId);

      // Emit connected event
      this.emit("connected", {
        serverId,
        toolCount: instance.tools.size,
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

      // Clear server tools from discovery service
      this.toolDiscovery.clearServerTools(serverId);

      // Close MCP client using factory cleanup
      if (instance.client && instance.transport) {
        try {
          await MCPClientFactory.closeClient(
            instance.client,
            instance.transport,
            instance.process || undefined,
          );
        } catch (error) {
          mcpLogger.debug(
            `[ExternalServerManager] Error closing client for ${serverId}:`,
            error,
          );
        }

        instance.client = null;
        instance.transport = null;
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
    instance.status = newStatus;

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
        toolCount: instance.tools.size,
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
   * Get server instance
   */
  getServer(serverId: string): ExternalMCPServerInstance | undefined {
    return this.servers.get(serverId);
  }

  /**
   * Get all servers
   */
  getAllServers(): Map<string, ExternalMCPServerInstance> {
    return new Map(this.servers);
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
        toolCount: instance.tools.size,
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

      totalTools += instance.tools.size;
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
        this.config.defaultTimeout,
      );

      if (discoveryResult.success) {
        // Update instance tools
        instance.tools.clear();
        for (const tool of discoveryResult.tools) {
          instance.tools.set(tool.name, tool);
        }

        mcpLogger.info(
          `[ExternalServerManager] Discovered ${discoveryResult.toolCount} tools for ${serverId}`,
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
   * Execute a tool on a specific server
   */
  async executeTool(
    serverId: string,
    toolName: string,
    parameters: Record<string, any>,
    options?: { timeout?: number },
  ): Promise<any> {
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

    const startTime = Date.now();

    try {
      // Execute tool through discovery service
      const result = await this.toolDiscovery.executeTool(
        toolName,
        serverId,
        instance.client,
        parameters,
        {
          timeout: options?.timeout || this.config.defaultTimeout,
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
      const duration = Date.now() - startTime;
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
