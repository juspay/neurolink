/**
 * MCP Protocol Handler - Implements proper JSON-RPC 2.0 communication with MCP servers
 * Handles initialize, tools/list, and tools/call requests according to MCP specification
 */

import { EventEmitter } from 'events';
import { mcpLogger } from './logging.js';
import {
  MCPServerInstance,
  MCPRequest,
  MCPResponse,
  MCPError,
  MCPInitializeParams,
  MCPInitializeResult,
  MCPTool,
  MCPToolListResult,
  MCPToolCallParams,
  MCPToolResult,
  MCPCapabilities,
  MCPProtocolError,
  MCPTimeoutError,
  MCP_PROTOCOL_VERSION,
  MCP_JSONRPC_VERSION,
  MCP_METHODS,
  MCP_ERROR_CODES,
} from './types/mcp-protocol.js';

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
  method: string;
  serverName: string; // Track which server this request belongs to
}

interface ProtocolHandlerOptions {
  requestTimeout?: number; // Default: 30 seconds
  initializeTimeout?: number; // Default: 10 seconds
  maxRetries?: number; // Default: 3
}

export class MCPProtocolHandler extends EventEmitter {
  private pendingRequests = new Map<number, PendingRequest>();
  private nextRequestId = 1;
  private options: Required<ProtocolHandlerOptions>;

  constructor(options: ProtocolHandlerOptions = {}) {
    super();
    this.options = {
      requestTimeout: options.requestTimeout ?? 30000, // 30 seconds
      initializeTimeout: options.initializeTimeout ?? 10000, // 10 seconds
      maxRetries: options.maxRetries ?? 3,
    };
  }

  /**
   * Initialize MCP server with proper handshake
   */
  async initialize(server: MCPServerInstance): Promise<MCPInitializeResult> {
    mcpLogger.info(`[MCPProtocolHandler] Initializing server: ${server.name}`);

    if (!server.process) {
      throw new MCPProtocolError(
        MCP_ERROR_CODES.INTERNAL_ERROR,
        'Server process not available'
      );
    }

    // Set up data handlers for this server
    this.setupServerDataHandlers(server);

    const initParams: MCPInitializeParams = {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
        logging: {},
      },
      clientInfo: {
        name: 'neurolink-cli',
        version: '1.0.0',
      },
    };

    try {
      const result = await this.sendRequest<MCPInitializeResult>(
        server,
        MCP_METHODS.INITIALIZE,
        initParams,
        this.options.initializeTimeout
      );

      // Store capabilities and server info
      server.capabilities = result.capabilities;

      mcpLogger.info(`[MCPProtocolHandler] Server initialized: ${server.name}, protocol: ${result.protocolVersion}`);

      // Send initialized notification
      await this.sendNotification(server, MCP_METHODS.INITIALIZED, {});

      return result;

    } catch (error) {
      mcpLogger.error(`[MCPProtocolHandler] Initialization failed for ${server.name}:`, error);
      throw error;
    }
  }

  /**
   * List available tools from MCP server
   */
  async listTools(server: MCPServerInstance): Promise<MCPTool[]> {
    mcpLogger.debug(`[MCPProtocolHandler] Listing tools for server: ${server.name}`);

    try {
      const result = await this.sendRequest<MCPToolListResult>(
        server,
        MCP_METHODS.TOOLS_LIST,
        {}
      );

      const tools = result.tools || [];
      server.tools = tools;

      mcpLogger.debug(`[MCPProtocolHandler] Found ${tools.length} tools for ${server.name}`);
      return tools;

    } catch (error) {
      mcpLogger.error(`[MCPProtocolHandler] Failed to list tools for ${server.name}:`, error);
      throw error;
    }
  }

  /**
   * Call a specific tool on the MCP server
   */
  async callTool(
    server: MCPServerInstance,
    toolName: string,
    args: Record<string, any> = {}
  ): Promise<MCPToolResult> {
    mcpLogger.debug(`[MCPProtocolHandler] Calling tool ${toolName} on server: ${server.name}`);

    const params: MCPToolCallParams = {
      name: toolName,
      arguments: args,
    };

    try {
      const result = await this.sendRequest<MCPToolResult>(
        server,
        MCP_METHODS.TOOLS_CALL,
        params
      );

      mcpLogger.debug(`[MCPProtocolHandler] Tool call successful: ${toolName} on ${server.name}`);
      return result;

    } catch (error) {
      mcpLogger.error(`[MCPProtocolHandler] Tool call failed: ${toolName} on ${server.name}:`, error);
      throw error;
    }
  }

  /**
   * Send a JSON-RPC request to the server
   */
  private async sendRequest<T>(
    server: MCPServerInstance,
    method: string,
    params: any,
    timeoutMs?: number
  ): Promise<T> {
    if (!server.process || server.status === 'terminated') {
      throw new MCPProtocolError(
        MCP_ERROR_CODES.INTERNAL_ERROR,
        'Server process not available or terminated'
      );
    }

    const requestId = this.nextRequestId++;
    const timeout = timeoutMs || this.options.requestTimeout;

    const request: MCPRequest = {
      jsonrpc: MCP_JSONRPC_VERSION,
      id: requestId,
      method,
      params,
    };

    return new Promise<T>((resolve, reject) => {
      // Set up timeout
      const timeoutHandle = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new MCPTimeoutError(
          `Request timeout after ${timeout}ms: ${method}`,
          timeout
        ));
      }, timeout);

      // Store pending request
      this.pendingRequests.set(requestId, {
        resolve: resolve as (value: any) => void,
        reject,
        timeout: timeoutHandle,
        method,
        serverName: server.name, // Track which server this request belongs to
      });

      // Send request
      try {
        const requestJson = JSON.stringify(request) + '\n';
        mcpLogger.debug(`[MCPProtocolHandler] Sending request to ${server.name}: ${method}`);
        
        if (!server.process?.stdin) {
          this.pendingRequests.delete(requestId);
          clearTimeout(timeoutHandle);
          reject(new MCPProtocolError(
            MCP_ERROR_CODES.INTERNAL_ERROR,
            'Server stdin not available'
          ));
          return;
        }

        server.process.stdin.write(requestJson, (error) => {
          if (error) {
            this.pendingRequests.delete(requestId);
            clearTimeout(timeoutHandle);
            reject(new MCPProtocolError(
              MCP_ERROR_CODES.INTERNAL_ERROR,
              `Failed to write request: ${error.message}`
            ));
          }
        });

      } catch (error) {
        this.pendingRequests.delete(requestId);
        clearTimeout(timeoutHandle);
        reject(new MCPProtocolError(
          MCP_ERROR_CODES.INTERNAL_ERROR,
          `Failed to send request: ${error instanceof Error ? error.message : String(error)}`
        ));
      }
    });
  }

  /**
   * Send a JSON-RPC notification (no response expected)
   */
  private async sendNotification(
    server: MCPServerInstance,
    method: string,
    params: any
  ): Promise<void> {
    if (!server.process || !server.process.stdin) {
      throw new MCPProtocolError(
        MCP_ERROR_CODES.INTERNAL_ERROR,
        'Server process not available'
      );
    }

    const notification = {
      jsonrpc: MCP_JSONRPC_VERSION,
      method,
      params,
    };

    return new Promise<void>((resolve, reject) => {
      const notificationJson = JSON.stringify(notification) + '\n';
      
      server.process!.stdin!.write(notificationJson, (error) => {
        if (error) {
          reject(new MCPProtocolError(
            MCP_ERROR_CODES.INTERNAL_ERROR,
            `Failed to write notification: ${error.message}`
          ));
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Set up data handlers for server stdout
   */
  private setupServerDataHandlers(server: MCPServerInstance): void {
    if (!server.process || !server.process.stdout) {
      throw new Error('Server process or stdout not available');
    }

    let buffer = '';

    server.process.stdout.on('data', (data: Buffer) => {
      buffer += data.toString();
      
      // Process complete lines (JSON-RPC messages are line-delimited)
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.trim()) {
          this.handleServerResponse(server, line.trim());
        }
      }
    });

    server.process.on('error', (error) => {
      mcpLogger.error(`[MCPProtocolHandler] Server process error: ${server.name}:`, error);
      this.rejectAllPendingRequests(server, error);
    });

    server.process.on('exit', (code, signal) => {
      mcpLogger.info(`[MCPProtocolHandler] Server process exited: ${server.name}, code: ${code}, signal: ${signal}`);
      this.rejectAllPendingRequests(server, new Error(`Process exited: code=${code}, signal=${signal}`));
    });
  }

  /**
   * Handle response from server
   */
  private handleServerResponse(server: MCPServerInstance, responseJson: string): void {
    try {
      const response = JSON.parse(responseJson) as MCPResponse;
      
      mcpLogger.debug(`[MCPProtocolHandler] Received response from ${server.name}: ${JSON.stringify(response).substring(0, 200)}`);

      // Check if this is a response to a pending request
      if (typeof response.id === 'number') {
        const pending = this.pendingRequests.get(response.id);
        if (pending) {
          this.pendingRequests.delete(response.id);
          clearTimeout(pending.timeout);

          if (response.error) {
            const error = new MCPProtocolError(
              response.error.code,
              response.error.message,
              response.error.data
            );
            pending.reject(error);
          } else {
            pending.resolve(response.result);
          }
        } else {
          mcpLogger.warn(`[MCPProtocolHandler] Received response for unknown request ID: ${response.id}`);
        }
      } else {
        // This might be a notification - log it
        mcpLogger.debug(`[MCPProtocolHandler] Received notification from ${server.name}: ${responseJson}`);
      }

    } catch (error) {
      mcpLogger.error(`[MCPProtocolHandler] Failed to parse response from ${server.name}: ${responseJson}`, error);
    }
  }

  /**
   * Reject pending requests for a specific server only (e.g., when process dies)
   */
  private rejectAllPendingRequests(server: MCPServerInstance, error: Error): void {
    // CRITICAL FIX: Only reject requests that belong to this specific server
    const serverRequests = Array.from(this.pendingRequests.entries()).filter(([id, pending]) => {
      return pending.serverName === server.name;
    });
    
    mcpLogger.debug(`[MCPProtocolHandler] Rejecting ${serverRequests.length} pending requests for server: ${server.name}`);
    
    for (const [id, pending] of serverRequests) {
      clearTimeout(pending.timeout);
      this.pendingRequests.delete(id);
      pending.reject(new MCPProtocolError(
        MCP_ERROR_CODES.INTERNAL_ERROR,
        `Server ${server.name} failed: ${error.message}`,
        error
      ));
    }
  }

  /**
   * Shutdown communication with a server
   */
  async shutdown(server: MCPServerInstance): Promise<void> {
    mcpLogger.info(`[MCPProtocolHandler] Shutting down server: ${server.name}`);

    try {
      // Send shutdown notification if possible
      if (server.process && server.status === 'ready') {
        await this.sendNotification(server, MCP_METHODS.SHUTDOWN, {});
      }
    } catch (error) {
      mcpLogger.warn(`[MCPProtocolHandler] Failed to send shutdown notification to ${server.name}:`, error);
    }

    // Reject any pending requests for this server
    this.rejectAllPendingRequests(server, new Error('Server shutdown'));
  }

  /**
   * Clean up all pending requests
   */
  cleanup(): void {
    mcpLogger.info('[MCPProtocolHandler] Cleaning up all pending requests');

    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Protocol handler cleanup'));
    }

    this.pendingRequests.clear();
    this.removeAllListeners();
  }
}