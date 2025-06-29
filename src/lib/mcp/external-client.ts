/**
 * NeuroLink External MCP Client
 * Connects to external MCP servers via stdio transport following MCP specification
 * Bridges external tools into NeuroLink's factory pattern ecosystem
 */

import { spawn, ChildProcess } from "child_process";
import { EventEmitter } from "events";
import type {
  NeuroLinkMCPTool,
  NeuroLinkExecutionContext,
  ToolResult,
} from "./factory.js";
import { mcpLogger as logger } from "./logging.js";

/**
 * External MCP Server Configuration
 */
export interface ExternalMCPServerConfig {
  name: string;
  command: string;
  args?: string[];
  transport?: "stdio" | "sse";
  env?: Record<string, string>;
  timeout?: number;
  retryAttempts?: number;
  url?: string; // For SSE transport
  cwd?: string; // Working directory for the spawned process
}

/**
 * MCP Protocol Message Types
 */
interface MCPMessage {
  jsonrpc: "2.0";
  id?: string | number;
  method?: string;
  params?: any;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

/**
 * MCP Tool Information
 */
interface MCPToolInfo {
  name: string;
  description?: string;
  inputSchema?: any;
}

/**
 * External MCP Client for stdio transport
 */
export class ExternalMCPClient extends EventEmitter {
  private config: ExternalMCPServerConfig;
  private process: ChildProcess | null = null;
  private isConnected = false;
  private messageId = 0;
  private pendingRequests = new Map<
    string | number,
    {
      resolve: (value: any) => void;
      reject: (error: Error) => void;
      timeout: NodeJS.Timeout;
    }
  >();
  private tools = new Map<string, MCPToolInfo>();
  private buffer = "";

  constructor(config: ExternalMCPServerConfig) {
    super();
    this.config = {
      timeout: 30000,
      retryAttempts: 3,
      args: [],
      transport: "stdio",
      ...config,
    };
  }

  /**
   * Connect to the external MCP server
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      logger.debug(`[External MCP] Already connected to ${this.config.name}`);
      return;
    }

    try {
      logger.info(`[External MCP] Connecting to ${this.config.name}...`);

      if (this.config.transport === "sse") {
        await this.connectSSE();
      } else {
        await this.connectStdio();
      }

      // Initialize MCP session
      await this.initialize();

      // Discover available tools
      await this.discoverTools();

      this.isConnected = true;
      logger.info(
        `[External MCP] Connected to ${this.config.name} with ${this.tools.size} tools`,
      );
      this.emit("connected");
    } catch (error) {
      logger.error(
        `[External MCP] Failed to connect to ${this.config.name}:`,
        error,
      );
      await this.disconnect();
      throw error;
    }
  }

  /**
   * Connect via stdio transport
   */
  private async connectStdio(): Promise<void> {
    // Spawn the MCP server process
    this.process = spawn(this.config.command, this.config.args || [], {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, ...this.config.env },
      cwd: this.config.cwd,
    });

    if (!this.process.stdout || !this.process.stdin || !this.process.stderr) {
      throw new Error("Failed to create stdio pipes");
    }

    // Setup stdout handler for receiving messages
    this.process.stdout.on("data", (data: Buffer) => {
      this.handleMessage(data.toString());
    });

    // Setup stderr handler for debugging
    this.process.stderr.on("data", (data: Buffer) => {
      logger.debug(
        `[External MCP] ${this.config.name} stderr:`,
        data.toString().trim(),
      );
    });

    // Handle process exit
    this.process.on("exit", (code, signal) => {
      logger.warn(`[External MCP] ${this.config.name} process exited`, {
        code,
        signal,
      });
      this.isConnected = false;
      this.emit("disconnected", { code, signal });
    });

    // Handle process errors
    this.process.on("error", (error) => {
      logger.error(
        `[External MCP] ${this.config.name} process error:`,
        error,
      );
      this.emit("error", error);
    });
  }

  /**
   * Connect via SSE transport
   */
  private async connectSSE(): Promise<void> {
    if (!this.config.url) {
      throw new Error("SSE transport requires a URL");
    }

    // For now, throw an error as SSE is not fully implemented
    throw new Error("SSE transport is not yet implemented. Please use stdio transport.");

    // TODO: Implement SSE transport
    // This would involve:
    // 1. Creating an EventSource connection to this.config.url
    // 2. Setting up message handlers for SSE events
    // 3. Implementing a way to send requests via HTTP POST
    // 4. Adapting the message handling to work with SSE format
  }

  /**
   * Initialize MCP session
   */
  private async initialize(): Promise<void> {
    const initResponse = await this.sendRequest("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {
        tools: {},
      },
      clientInfo: {
        name: "neurolink-mcp-client",
        version: "1.0.0",
      },
    });

    logger.debug(
      `[External MCP] ${this.config.name} initialized:`,
      initResponse,
    );
  }

  /**
   * Discover available tools from the server
   */
  private async discoverTools(): Promise<void> {
    try {
      const response = await this.sendRequest("tools/list", {});

      if (response.tools && Array.isArray(response.tools)) {
        this.tools.clear();

        for (const tool of response.tools) {
          this.tools.set(tool.name, {
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
          });
        }

        logger.debug(
          `[External MCP] Discovered ${this.tools.size} tools from ${this.config.name}`,
        );
      }
    } catch (error) {
      logger.warn(
        `[External MCP] Failed to discover tools from ${this.config.name}:`,
        error,
      );
    }
  }

  /**
   * Execute a tool on the external server
   */
  async executeTool(
    toolName: string,
    params: any,
    context: NeuroLinkExecutionContext,
  ): Promise<ToolResult> {
    if (!this.isConnected) {
      throw new Error(`Not connected to MCP server: ${this.config.name}`);
    }

    const startTime = Date.now();

    try {
      logger.debug(
        `[External MCP] Executing tool ${toolName} on ${this.config.name}`,
      );

      const response = await this.sendRequest("tools/call", {
        name: toolName,
        arguments: params,
      });

      const executionTime = Date.now() - startTime;

      // Transform MCP response to NeuroLink format
      const result: ToolResult = {
        success: !response.isError,
        data: response.content || response.result || response,
        metadata: {
          toolName,
          serverId: this.config.name,
          serverTitle: this.config.name,
          sessionId: context.sessionId,
          timestamp: Date.now(),
          executionTime,
        },
      };

      if (response.isError) {
        result.error = response.content?.[0]?.text || "Tool execution failed";
      }

      logger.debug(
        `[External MCP] Tool ${toolName} executed in ${executionTime}ms`,
      );
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      logger.error(`[External MCP] Tool execution failed: ${toolName}`, error);

      return {
        success: false,
        error: errorMessage,
        metadata: {
          toolName,
          serverId: this.config.name,
          serverTitle: this.config.name,
          sessionId: context.sessionId,
          timestamp: Date.now(),
          executionTime,
        },
      };
    }
  }

  /**
   * Get available tools as NeuroLink MCP tools
   */
  getNeuroLinkTools(): Record<string, NeuroLinkMCPTool> {
    const neurolinkTools: Record<string, NeuroLinkMCPTool> = {};

    for (const [name, toolInfo] of this.tools) {
      neurolinkTools[name] = {
        name,
        description:
          toolInfo.description || `External tool from ${this.config.name}`,
        category: "external",
        isImplemented: true,
        execute: async (
          params: unknown,
          context: NeuroLinkExecutionContext,
        ) => {
          return this.executeTool(name, params, context);
        },
        inputSchema: toolInfo.inputSchema,
        metadata: {
          serverId: this.config.name,
          serverTitle: this.config.name,
          external: true,
          transport: "stdio",
        },
      };
    }

    return neurolinkTools;
  }

  /**
   * Send a request to the MCP server
   */
  private async sendRequest(method: string, params: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.process?.stdin) {
        reject(new Error("Process not available"));
        return;
      }

      const id = ++this.messageId;
      const message: MCPMessage = {
        jsonrpc: "2.0",
        id,
        method,
        params,
      };

      // Setup timeout
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout: ${method}`));
      }, this.config.timeout);

      // Store request for response handling
      this.pendingRequests.set(id, { resolve, reject, timeout });

      // Send message
      const messageStr = JSON.stringify(message) + "\n";
      this.process.stdin.write(messageStr);

      logger.debug(`[External MCP] Sent request ${id}: ${method}`);
    });
  }

  /**
   * Handle incoming messages from the server
   */
  private handleMessage(data: string): void {
    this.buffer += data;

    let lineEnd;
    while ((lineEnd = this.buffer.indexOf("\n")) !== -1) {
      const line = this.buffer.slice(0, lineEnd);
      this.buffer = this.buffer.slice(lineEnd + 1);

      if (line.trim()) {
        try {
          const message: MCPMessage = JSON.parse(line);
          this.processMessage(message);
        } catch (error) {
          logger.warn(
            `[External MCP] Failed to parse message from ${this.config.name}:`,
            line,
          );
        }
      }
    }
  }

  /**
   * Process a parsed MCP message
   */
  private processMessage(message: MCPMessage): void {
    if (message.id !== undefined && this.pendingRequests.has(message.id)) {
      // Response to our request
      const pending = this.pendingRequests.get(message.id)!;
      this.pendingRequests.delete(message.id);
      clearTimeout(pending.timeout);

      if (message.error) {
        pending.reject(new Error(message.error.message));
      } else {
        pending.resolve(message.result);
      }
    } else if (message.method) {
      // Notification or request from server
      logger.debug(`[External MCP] Received notification: ${message.method}`);
      this.emit("notification", message);
    }
  }

  /**
   * Disconnect from the server
   */
  async disconnect(): Promise<void> {
    if (!this.isConnected && !this.process) {
      return;
    }

    logger.info(`[External MCP] Disconnecting from ${this.config.name}`);

    // Clear pending requests
    for (const pending of this.pendingRequests.values()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error("Connection closed"));
    }
    this.pendingRequests.clear();

    // Close process
    if (this.process) {
      this.process.kill("SIGTERM");

      // Force kill after timeout
      setTimeout(() => {
        if (this.process && !this.process.killed) {
          this.process.kill("SIGKILL");
        }
      }, 5000);

      this.process = null;
    }

    this.isConnected = false;
    this.tools.clear();
    this.emit("disconnected");
  }

  /**
   * Check if connected
   */
  isConnectedToServer(): boolean {
    return this.isConnected && this.process !== null;
  }

  /**
   * Get server information
   */
  getServerInfo() {
    return {
      name: this.config.name,
      command: this.config.command,
      args: this.config.args,
      transport: this.config.transport,
      isConnected: this.isConnected,
      toolCount: this.tools.size,
      tools: Array.from(this.tools.keys()),
    };
  }
}

/**
 * Create an external MCP client
 */
export function createExternalMCPClient(
  config: ExternalMCPServerConfig,
): ExternalMCPClient {
  return new ExternalMCPClient(config);
}
