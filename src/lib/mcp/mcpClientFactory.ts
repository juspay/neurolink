/**
 * MCP Client Factory
 * Creates and manages MCP clients for external servers
 * Supports stdio, SSE, WebSocket, and HTTP transports
 * Enhanced with retry, rate limiting, and OAuth 2.1 support
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { WebSocketClientTransport } from "@modelcontextprotocol/sdk/client/websocket.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type {
  ClientCapabilities,
  Implementation,
} from "@modelcontextprotocol/sdk/types.js";
import { spawn, type ChildProcess } from "child_process";
import { mcpLogger } from "../utils/logger.js";
import { globalCircuitBreakerManager } from "./mcpCircuitBreaker.js";
import {
  withHTTPRetry,
  DEFAULT_HTTP_RETRY_CONFIG,
} from "./httpRetryHandler.js";
import { globalRateLimiterManager } from "./httpRateLimiter.js";
import { NeuroLinkOAuthProvider, InMemoryTokenStorage } from "./auth/index.js";
import type { MCPOAuthConfig } from "../types/mcpTypes.js";
import type { MCPTransportType } from "../types/externalMcp.js";
import type { MCPServerInfo, MCPClientResult } from "../types/mcpTypes.js";
import type {
  TransportResult,
  TransportWithProcessResult,
  NetworkTransportResult,
} from "../types/typeAliases.js";

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
    sampling: {},
    roots: {
      listChanged: false,
    },
  };

  /**
   * Create an MCP client for the given server configuration
   * Enhanced with retry logic, rate limiting, and circuit breaker protection
   */
  static async createClient(
    config: MCPServerInfo,
    timeout = 10000,
  ): Promise<MCPClientResult> {
    const startTime = Date.now();

    try {
      mcpLogger.info(`[MCPClientFactory] Creating client for ${config.id}`, {
        transport: config.transport,
        command: config.command,
        hasRetryConfig: !!config.retryConfig,
        hasRateLimiting: !!config.rateLimiting,
        hasAuth: !!config.auth,
      });

      // Acquire rate limit token if rate limiting is configured for HTTP transport
      if (
        (config.transport === "http" || config.transport === "sse") &&
        config.rateLimiting
      ) {
        const rateLimiter = globalRateLimiterManager.getLimiter(config.id, {
          requestsPerWindow: config.rateLimiting.requestsPerMinute ?? 60,
          windowMs: 60000,
          maxBurst: config.rateLimiting.maxBurst ?? 10,
          useTokenBucket: config.rateLimiting.useTokenBucket ?? true,
          refillRate: (config.rateLimiting.requestsPerMinute ?? 60) / 60,
        });

        await rateLimiter.acquire();
        mcpLogger.debug(
          `[MCPClientFactory] Rate limit token acquired for ${config.id}`,
        );
      }

      // Create circuit breaker for this server
      const circuitBreaker = globalCircuitBreakerManager.getBreaker(
        `mcp-client-${config.id}`,
        {
          failureThreshold: 3,
          resetTimeout: 30000,
          operationTimeout: timeout,
        },
      );

      // Define the client creation operation
      const createClientOperation = async (): Promise<
        Omit<MCPClientResult, "success" | "duration">
      > => {
        return await circuitBreaker.execute(async () => {
          return await this.createClientInternal(config, timeout);
        });
      };

      // Wrap with retry logic if retry config is provided for HTTP transport
      let result: Omit<MCPClientResult, "success" | "duration">;

      if (
        (config.transport === "http" || config.transport === "sse") &&
        config.retryConfig
      ) {
        mcpLogger.debug(
          `[MCPClientFactory] Using retry logic for ${config.id}`,
          {
            maxAttempts:
              config.retryConfig.maxAttempts ??
              DEFAULT_HTTP_RETRY_CONFIG.maxAttempts,
          },
        );

        result = await withHTTPRetry(createClientOperation, {
          maxAttempts:
            config.retryConfig.maxAttempts ??
            DEFAULT_HTTP_RETRY_CONFIG.maxAttempts,
          initialDelay:
            config.retryConfig.initialDelay ??
            DEFAULT_HTTP_RETRY_CONFIG.initialDelay,
          maxDelay:
            config.retryConfig.maxDelay ?? DEFAULT_HTTP_RETRY_CONFIG.maxDelay,
          backoffMultiplier:
            config.retryConfig.backoffMultiplier ??
            DEFAULT_HTTP_RETRY_CONFIG.backoffMultiplier,
        });
      } else {
        result = await createClientOperation();
      }

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
    config: MCPServerInfo,
    timeout: number,
  ): Promise<Omit<MCPClientResult, "success" | "duration">> {
    // Create transport
    const transportResult = await this.createTransport(config);

    // Extract transport and process with necessary type assertions
    // Note: Type assertions required due to TransportResult using 'unknown' to avoid circular imports
    const transport = transportResult.transport as Transport;
    const process = transportResult.process as ChildProcess | undefined;

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

  /**
   * Create stdio transport with process spawning
   */
  private static async createStdioTransport(
    config: MCPServerInfo,
  ): Promise<TransportWithProcessResult> {
    mcpLogger.debug(
      `[MCPClientFactory] Creating stdio transport for ${config.id}`,
      {
        command: config.command,
        args: config.args,
      },
    );

    // Validate command is present
    if (!config.command) {
      throw new Error(`Command is required for stdio transport`);
    }

    // Spawn the process
    const childProcess = spawn(config.command, config.args || [], {
      stdio: ["pipe", "pipe", "pipe"],
      env: Object.fromEntries(
        Object.entries({
          ...process.env,
          ...config.env,
        })
          .filter(([, value]) => value !== undefined)
          .map(([k, v]) => [k, String(v)]),
      ) as Record<string, string>,
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

    // Wait for process to be ready or fail using AbortController for better async patterns
    const processStartupController = new AbortController();
    const processStartupTimeout = setTimeout(() => {
      processStartupController.abort();
    }, 1000);

    try {
      await Promise.race([
        new Promise<void>((resolve) => {
          const checkReady = () => {
            if (processStartupController.signal.aborted) {
              resolve(); // Timeout reached, continue
            } else {
              setTimeout(checkReady, 100);
            }
          };
          checkReady();
        }),
        processErrorPromise,
      ]);
    } finally {
      clearTimeout(processStartupTimeout);
    }

    // Check if process is still running
    if (childProcess.killed || childProcess.exitCode !== null) {
      throw new Error("Process failed to start or exited immediately");
    }

    // Create transport
    if (!config.command) {
      throw new Error(`Command is required for stdio transport`);
    }

    const transport = new StdioClientTransport({
      command: config.command,
      args: config.args || [],
      env: Object.fromEntries(
        Object.entries({
          ...process.env,
          ...config.env,
        })
          .filter(([, value]) => value !== undefined)
          .map(([key, value]) => [key, String(value)]),
      ),
      cwd: config.cwd,
      stderr: "ignore", // Suppress MCP server startup messages
    });

    return { transport, process: childProcess };
  }

  /**
   * Create SSE transport
   */
  private static async createSSETransport(
    config: MCPServerInfo,
  ): Promise<NetworkTransportResult> {
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
    config: MCPServerInfo,
  ): Promise<NetworkTransportResult> {
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
   * Create HTTP transport (Streamable HTTP)
   * Enhanced with OAuth 2.1, rate limiting, and configurable timeouts
   */
  private static async createHTTPTransport(
    config: MCPServerInfo,
  ): Promise<NetworkTransportResult> {
    if (!config.url) {
      throw new Error("URL is required for HTTP transport");
    }

    // Extract HTTP options with defaults
    const httpOptions = {
      connectionTimeout: config.httpOptions?.connectionTimeout ?? 30000,
      requestTimeout: config.httpOptions?.requestTimeout ?? 60000,
      idleTimeout: config.httpOptions?.idleTimeout ?? 120000,
      keepAliveTimeout: config.httpOptions?.keepAliveTimeout ?? 30000,
    };

    mcpLogger.debug(
      `[MCPClientFactory] Creating HTTP transport for ${config.id}`,
      {
        url: config.url,
        hasHeaders: !!config.headers,
        hasAuth: !!config.auth,
        authType: config.auth?.type,
        httpOptions,
      },
    );

    try {
      const url = new URL(config.url);

      // Set up OAuth provider if configured
      const oauthProvider = await this.setupAuthProvider(config);

      // Build headers including authentication
      const headers: Record<string, string> = {
        ...(config.headers ?? {}),
      };

      // Add authentication headers based on auth type
      if (config.auth) {
        const authHeader = await this.getAuthorizationHeader(
          config,
          oauthProvider,
        );
        if (authHeader) {
          headers["Authorization"] = authHeader;
        }
      }

      // Create custom fetch wrapper with timeout and rate limiting support
      const fetchWithEnhancements = this.createEnhancedFetch(
        config,
        httpOptions.requestTimeout,
        oauthProvider,
      );

      // Create request init with custom headers
      const requestInit: RequestInit = {
        headers: Object.keys(headers).length > 0 ? headers : undefined,
      };

      const transport = new StreamableHTTPClientTransport(url, {
        requestInit,
        fetch: fetchWithEnhancements,
      });

      return { transport };
    } catch (error) {
      throw new Error(
        `Invalid HTTP URL: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Create a fetch wrapper with timeout support
   */
  private static createFetchWithTimeout(timeoutMs: number): typeof fetch {
    return async (input: RequestInfo | URL, init?: RequestInit) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        return await fetch(input, { ...init, signal: controller.signal });
      } finally {
        clearTimeout(timeoutId);
      }
    };
  }

  /**
   * Create an enhanced fetch function with timeout and optional retry
   */
  private static createEnhancedFetch(
    config: MCPServerInfo,
    timeoutMs: number,
    oauthProvider?: NeuroLinkOAuthProvider,
  ): typeof fetch {
    const fetchWithTimeout = this.createFetchWithTimeout(timeoutMs);

    return async (input: RequestInfo | URL, init?: RequestInit) => {
      // If OAuth is configured, ensure we have valid tokens
      if (oauthProvider && config.auth?.type === "oauth2") {
        try {
          const authHeader = await oauthProvider.getAuthorizationHeader(
            config.id,
          );
          if (authHeader) {
            const existingHeaders = init?.headers ?? {};
            const headers = new Headers(existingHeaders);
            headers.set("Authorization", authHeader);

            init = {
              ...init,
              headers,
            };
          }
        } catch (error) {
          mcpLogger.warn(
            `[MCPClientFactory] OAuth token refresh failed for ${config.id}:`,
            error instanceof Error ? error.message : String(error),
          );
          // Continue without auth - let the request fail naturally
        }
      }

      return fetchWithTimeout(input, init);
    };
  }

  /**
   * Set up OAuth provider if configured
   */
  private static async setupAuthProvider(
    config: MCPServerInfo,
  ): Promise<NeuroLinkOAuthProvider | undefined> {
    if (config.auth?.type === "oauth2" && config.auth.oauth) {
      const tokenStorage = new InMemoryTokenStorage();
      const oauthConfig: MCPOAuthConfig = {
        clientId: config.auth.oauth.clientId,
        clientSecret: config.auth.oauth.clientSecret,
        authorizationUrl: config.auth.oauth.authorizationUrl,
        tokenUrl: config.auth.oauth.tokenUrl,
        redirectUrl: config.auth.oauth.redirectUrl,
        scope: config.auth.oauth.scope,
        usePKCE: config.auth.oauth.usePKCE ?? true,
      };

      const provider = new NeuroLinkOAuthProvider(oauthConfig, tokenStorage);

      mcpLogger.debug(
        `[MCPClientFactory] OAuth provider created for ${config.id}`,
        {
          clientId: oauthConfig.clientId,
          usePKCE: oauthConfig.usePKCE,
        },
      );

      return provider;
    }

    return undefined;
  }

  /**
   * Get authorization header based on auth configuration
   */
  private static async getAuthorizationHeader(
    config: MCPServerInfo,
    oauthProvider?: NeuroLinkOAuthProvider,
  ): Promise<string | undefined> {
    if (!config.auth) {
      return undefined;
    }

    switch (config.auth.type) {
      case "oauth2":
        if (oauthProvider) {
          const header = await oauthProvider.getAuthorizationHeader(config.id);
          return header ?? undefined;
        }
        return undefined;

      case "bearer":
        if (config.auth.token) {
          return `Bearer ${config.auth.token}`;
        }
        return undefined;

      case "api-key":
        // API key is typically sent as a custom header, not Authorization
        // But if needed, we can return it here
        return undefined;

      default:
        return undefined;
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
      const serverInfo = await Promise.race<Record<string, unknown>>([
        this.getServerInfo(client),
        this.createTimeoutPromise<never>(timeout, "Handshake timeout"),
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
  private static async getServerInfo(
    client: Client,
  ): Promise<Record<string, unknown>> {
    try {
      // Try to list tools to verify server is responding
      const toolsResult = await client.listTools();
      return {
        tools: toolsResult.tools || [],
        capabilities: this.DEFAULT_CAPABILITIES,
      };
    } catch {
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
  private static extractCapabilities(
    serverInfo: Record<string, unknown>,
  ): ClientCapabilities {
    // For now, return default capabilities
    // This can be enhanced when MCP servers provide more detailed capability info
    return {
      ...this.DEFAULT_CAPABILITIES,
      ...(serverInfo.tools ? { tools: {} } : {}),
    };
  }

  /**
   * Create a timeout promise with AbortController support
   * Provides consistent async timeout patterns across the factory
   */
  private static createTimeoutPromise<T>(
    timeout: number,
    message: string,
    abortSignal?: AbortSignal,
  ): Promise<T> {
    return new Promise((_, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(message));
      }, timeout);

      // Support abortion for better async cleanup
      if (abortSignal) {
        abortSignal.addEventListener("abort", () => {
          clearTimeout(timeoutId);
          reject(new Error(`Operation aborted: ${message}`));
        });
      }
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

    // Kill process if exists with proper async cleanup
    if (process && !process.killed) {
      try {
        process.kill("SIGTERM");

        // Use Promise-based approach for force kill timeout
        await new Promise<void>((resolve) => {
          const forceKillTimeout = setTimeout(() => {
            if (!process.killed) {
              mcpLogger.warn("[MCPClientFactory] Force killing process");
              try {
                process.kill("SIGKILL");
              } catch (killError) {
                mcpLogger.debug(
                  "[MCPClientFactory] Error in force kill:",
                  killError,
                );
              }
            }
            resolve();
          }, 5000);

          // If process exits gracefully before timeout, clear the force kill
          process.on("exit", () => {
            clearTimeout(forceKillTimeout);
            resolve();
          });
        });
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
    config: MCPServerInfo,
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
        } catch {
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
  static validateClientConfig(config: MCPServerInfo): {
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

    if (!["stdio", "sse", "websocket", "http"].includes(config.transport)) {
      errors.push("Transport must be stdio, sse, websocket, or http");
    }

    // Transport-specific validation
    if (
      config.transport === "sse" ||
      config.transport === "websocket" ||
      config.transport === "http"
    ) {
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
    return ["stdio", "sse", "websocket", "http"];
  }

  /**
   * Get default client capabilities
   */
  static getDefaultCapabilities(): ClientCapabilities {
    return { ...this.DEFAULT_CAPABILITIES };
  }
}
