/**
 * MCP Client Factory
 * Creates and manages MCP clients for external servers
 * Supports stdio, SSE, and WebSocket transports
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { WebSocketClientTransport } from "@modelcontextprotocol/sdk/client/websocket.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type {
  ClientCapabilities,
  Implementation,
} from "@modelcontextprotocol/sdk/types.js";
import { spawn, ChildProcess } from "child_process";
import { mcpLogger } from "../utils/logger.js";
import {
  MCPCircuitBreaker,
  globalCircuitBreakerManager,
} from "./mcpCircuitBreaker.js";
import type {
  ExternalMCPServerConfig,
  ExternalMCPServerInstance,
  MCPTransportType,
} from "../types/externalMcp.js";

/**
 * MCP client creation result
 */
export interface MCPClientResult {
  /** Whether client creation was successful */
  success: boolean;

  /** Created client instance */
  client?: Client;

  /** Created transport instance */
  transport?: Transport;

  /** Created process (for stdio transport) */
  process?: ChildProcess;

  /** Error message if failed */
  error?: string;

  /** Creation duration in milliseconds */
  duration: number;

  /** Server capabilities reported during handshake */
  capabilities?: ClientCapabilities;
}

/**
 * Transport creation options
 */
interface TransportOptions {
  config: ExternalMCPServerConfig;
  timeout?: number;
}

/**
 * MCPClientFactory
 * Factory class for creating MCP clients with different transports
 */
export class MCPClientFactory {
  private static readonly NEUROLINK_IMPLEMENTATION: Implementation = {
    name: "neurolink-sdk",
    version: "1.0.0",
  };

  private static readonly DEFAULT_CAPABILITIES: ClientCapabilities = {
    tools: {},
    resources: {},
    prompts: {},
    sampling: {},
    roots: {
      listChanged: false,
    },
  };

  /**
   * Create an MCP client for the given server configuration
   */
  static async createClient(
    config: ExternalMCPServerConfig,
    timeout = 10000,
  ): Promise<MCPClientResult> {
    const startTime = Date.now();

    try {
      mcpLogger.info(`[MCPClientFactory] Creating client for ${config.id}`, {
        transport: config.transport,
        command: config.command,
      });

      // Create circuit breaker for this server
      const circuitBreaker = globalCircuitBreakerManager.getBreaker(
        `mcp-client-${config.id}`,
        {
          failureThreshold: 3,
          resetTimeout: 30000,
          operationTimeout: timeout,
        },
      );

      // Create client with circuit breaker protection
      const result = await circuitBreaker.execute(async () => {
        return await this.createClientInternal(config, timeout);
      });

      mcpLogger.info(
        `[MCPClientFactory] Client created successfully for ${config.id}`,
        {
          duration: Date.now() - startTime,
          capabilities: result.capabilities,
        },
      );

      return {
        ...result,
        success: true,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      mcpLogger.error(
        `[MCPClientFactory] Failed to create client for ${config.id}:`,
        error,
      );

      return {
        success: false,
        error: errorMessage,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Internal client creation logic
   */
  private static async createClientInternal(
    config: ExternalMCPServerConfig,
    timeout: number,
  ): Promise<Omit<MCPClientResult, "success" | "duration">> {
    // Create transport
    const { transport, process } = await this.createTransport(config);

    try {
      // Create client
      const client = new Client(this.NEUROLINK_IMPLEMENTATION, {
        capabilities: this.DEFAULT_CAPABILITIES,
      });

      // Connect with timeout
      await Promise.race([
        client.connect(transport),
        this.createTimeoutPromise(
          timeout,
          `Client connection timeout for ${config.id}`,
        ),
      ]);

      // Perform handshake to get server capabilities
      const serverCapabilities = await this.performHandshake(client, timeout);

      mcpLogger.debug(
        `[MCPClientFactory] Handshake completed for ${config.id}`,
        {
          capabilities: serverCapabilities,
        },
      );

      return {
        client,
        transport,
        process,
        capabilities: serverCapabilities,
      };
    } catch (error) {
      // Clean up on failure
      try {
        await transport.close();
      } catch (closeError) {
        mcpLogger.debug(
          `[MCPClientFactory] Error closing transport during cleanup:`,
          closeError,
        );
      }

      if (process && !process.killed) {
        process.kill("SIGTERM");
      }

      throw error;
    }
  }

  /**
   * Create transport based on configuration
   */
  private static async createTransport(
    config: ExternalMCPServerConfig,
  ): Promise<{ transport: Transport; process?: ChildProcess }> {
    switch (config.transport) {
      case "stdio":
        return this.createStdioTransport(config);

      case "sse":
        return this.createSSETransport(config);

      case "websocket":
        return this.createWebSocketTransport(config);

      default:
        throw new Error(`Unsupported transport type: ${config.transport}`);
    }
  }

  /**
   * Create stdio transport with process spawning
   */
  private static async createStdioTransport(
    config: ExternalMCPServerConfig,
  ): Promise<{ transport: Transport; process: ChildProcess }> {
    mcpLogger.debug(
      `[MCPClientFactory] Creating stdio transport for ${config.id}`,
      {
        command: config.command,
        args: config.args,
      },
    );

    // Spawn the process
    const childProcess = spawn(config.command, config.args, {
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...process.env,
        ...config.env,
      },
      cwd: config.cwd,
    });

    // Handle process errors
    const processErrorPromise = new Promise<never>((_, reject) => {
      childProcess.on("error", (error: Error) => {
        reject(new Error(`Process spawn error: ${error.message}`));
      });

      childProcess.on(
        "exit",
        (code: number | null, signal: NodeJS.Signals | null) => {
          if (code !== 0) {
            reject(
              new Error(`Process exited with code ${code}, signal ${signal}`),
            );
          }
        },
      );
    });

    // Wait for process to be ready or fail
    await Promise.race([
      new Promise((resolve) => setTimeout(resolve, 1000)), // Give process time to start
      processErrorPromise,
    ]);

    // Check if process is still running
    if (childProcess.killed || childProcess.exitCode !== null) {
      throw new Error("Process failed to start or exited immediately");
    }

    // Create transport
    const transport = new StdioClientTransport({
      command: config.command,
      args: config.args,
      env: Object.fromEntries(
        Object.entries({
          ...process.env,
          ...config.env,
        }).filter(([, value]) => value !== undefined),
      ) as Record<string, string>,
      cwd: config.cwd,
    });

    return { transport, process: childProcess };
  }

  /**
   * Create SSE transport
   */
  private static async createSSETransport(
    config: ExternalMCPServerConfig,
  ): Promise<{ transport: Transport }> {
    if (!config.url) {
      throw new Error("URL is required for SSE transport");
    }

    mcpLogger.debug(
      `[MCPClientFactory] Creating SSE transport for ${config.id}`,
      {
        url: config.url,
      },
    );

    try {
      const url = new URL(config.url);
      const transport = new SSEClientTransport(url);

      return { transport };
    } catch (error) {
      throw new Error(
        `Invalid SSE URL: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Create WebSocket transport
   */
  private static async createWebSocketTransport(
    config: ExternalMCPServerConfig,
  ): Promise<{ transport: Transport }> {
    if (!config.url) {
      throw new Error("URL is required for WebSocket transport");
    }

    mcpLogger.debug(
      `[MCPClientFactory] Creating WebSocket transport for ${config.id}`,
      {
        url: config.url,
      },
    );

    try {
      const url = new URL(config.url);
      const transport = new WebSocketClientTransport(url);

      return { transport };
    } catch (error) {
      throw new Error(
        `Invalid WebSocket URL: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Perform MCP handshake and get server capabilities
   */
  private static async performHandshake(
    client: Client,
    timeout: number,
  ): Promise<ClientCapabilities> {
    try {
      // The MCP SDK handles the handshake automatically during connect()
      // We can request server info to verify the connection
      const serverInfo = await Promise.race([
        this.getServerInfo(client),
        this.createTimeoutPromise(timeout, "Handshake timeout"),
      ]);

      // Extract capabilities from server info
      return this.extractCapabilities(serverInfo);
    } catch (error) {
      mcpLogger.warn(
        "[MCPClientFactory] Handshake failed, but connection may still be valid:",
        error,
      );

      // Return default capabilities if handshake fails
      // The connection might still work for basic operations
      return this.DEFAULT_CAPABILITIES;
    }
  }

  /**
   * Get server information
   */
  private static async getServerInfo(client: Client): Promise<any> {
    try {
      // Try to list tools to verify server is responding
      const toolsResult = await client.listTools();
      return {
        tools: toolsResult.tools || [],
        capabilities: this.DEFAULT_CAPABILITIES,
      };
    } catch (error) {
      // If listing tools fails, try a simpler ping
      mcpLogger.debug(
        "[MCPClientFactory] Tool listing failed, server may not support tools yet",
      );
      return {
        tools: [],
        capabilities: this.DEFAULT_CAPABILITIES,
      };
    }
  }

  /**
   * Extract capabilities from server info
   */
  private static extractCapabilities(serverInfo: any): ClientCapabilities {
    // For now, return default capabilities
    // This can be enhanced when MCP servers provide more detailed capability info
    return {
      ...this.DEFAULT_CAPABILITIES,
      tools: serverInfo.tools ? {} : undefined,
    };
  }

  /**
   * Create a timeout promise
   */
  private static createTimeoutPromise<T>(
    timeout: number,
    message: string,
  ): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(message));
      }, timeout);
    });
  }

  /**
   * Close an MCP client and clean up resources
   */
  static async closeClient(
    client: Client,
    transport: Transport,
    process?: ChildProcess,
  ): Promise<void> {
    const errors: string[] = [];

    // Close client
    try {
      await client.close();
    } catch (error) {
      errors.push(
        `Client close error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    // Close transport
    try {
      await transport.close();
    } catch (error) {
      errors.push(
        `Transport close error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    // Kill process if exists
    if (process && !process.killed) {
      try {
        process.kill("SIGTERM");

        // Force kill after 5 seconds
        setTimeout(() => {
          if (!process.killed) {
            mcpLogger.warn("[MCPClientFactory] Force killing process");
            process.kill("SIGKILL");
          }
        }, 5000);
      } catch (error) {
        errors.push(
          `Process kill error: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    if (errors.length > 0) {
      mcpLogger.warn(
        "[MCPClientFactory] Errors during client cleanup:",
        errors,
      );
    }
  }

  /**
   * Test connection to an MCP server
   */
  static async testConnection(
    config: ExternalMCPServerConfig,
    timeout = 5000,
  ): Promise<{
    success: boolean;
    error?: string;
    capabilities?: ClientCapabilities;
  }> {
    let client: Client | undefined;
    let transport: Transport | undefined;
    let process: ChildProcess | undefined;

    try {
      const result = await this.createClient(config, timeout);

      if (!result.success) {
        return { success: false, error: result.error };
      }

      client = result.client;
      transport = result.transport;
      process = result.process;

      // Try to list tools as a connectivity test
      if (client) {
        try {
          await client.listTools();
        } catch (error) {
          // Tool listing failure doesn't necessarily mean connection failure
          mcpLogger.debug(
            "[MCPClientFactory] Tool listing failed during test, but connection may be valid",
          );
        }
      }

      return {
        success: true,
        capabilities: result.capabilities,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    } finally {
      // Clean up test connection
      if (client && transport) {
        try {
          await this.closeClient(client, transport, process);
        } catch (error) {
          mcpLogger.debug(
            "[MCPClientFactory] Error cleaning up test connection:",
            error,
          );
        }
      }
    }
  }

  /**
   * Validate MCP server configuration for client creation
   */
  static validateClientConfig(config: ExternalMCPServerConfig): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Basic validation
    if (!config.command) {
      errors.push("Command is required");
    }

    if (!config.transport) {
      errors.push("Transport is required");
    }

    if (!["stdio", "sse", "websocket"].includes(config.transport)) {
      errors.push("Transport must be stdio, sse, or websocket");
    }

    // Transport-specific validation
    if (config.transport === "sse" || config.transport === "websocket") {
      if (!config.url) {
        errors.push(`URL is required for ${config.transport} transport`);
      } else {
        try {
          new URL(config.url);
        } catch {
          errors.push(`Invalid URL for ${config.transport} transport`);
        }
      }
    }

    if (config.transport === "stdio") {
      if (!Array.isArray(config.args)) {
        errors.push("Args array is required for stdio transport");
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get supported transport types
   */
  static getSupportedTransports(): MCPTransportType[] {
    return ["stdio", "sse", "websocket"];
  }

  /**
   * Get default client capabilities
   */
  static getDefaultCapabilities(): ClientCapabilities {
    return { ...this.DEFAULT_CAPABILITIES };
  }
}
