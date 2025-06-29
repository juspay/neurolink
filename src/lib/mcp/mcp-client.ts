/**
 * MCP Client Implementation using Official SDK
 * Follows Cline's proven pattern for 100% reliability
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport, getDefaultEnvironment } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {
  CallToolResultSchema,
  ListToolsResultSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { mcpLogger } from './logging.js';
import type { MCPClient, MCPTransport } from './mcp-hub.js';
import type {
  MCPTool,
  MCPToolResult,
} from './types/mcp-protocol.js';

interface MCPClientOptions {
  timeout?: number;
  command?: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
  type?: 'stdio' | 'sse' | 'streamableHttp';
}

type Transport = StdioClientTransport | SSEClientTransport | StreamableHTTPClientTransport;

export class StandardMCPClient implements MCPClient {
  private _status: 'initializing' | 'ready' | 'error' | 'closed' = 'initializing';
  private client: Client;
  private transport: Transport;
  private readonly options: MCPClientOptions;

  constructor(
    private serverName: string,
    options: MCPClientOptions = {}
  ) {
    this.options = {
      timeout: options.timeout ?? 60000, // 60s for sequential thinking
      type: options.type ?? 'stdio',
      ...options,
    };

    // Create client following Cline's pattern
    this.client = new Client(
      {
        name: 'neurolink-cli',
        version: '1.11.3',
      },
      {
        capabilities: {},
      }
    );

    // Create transport based on type
    this.transport = this.createTransport();
  }

  get status() {
    return this._status;
  }

  async initialize(): Promise<void> {
    if (this._status !== 'initializing') {
      throw new Error(`Client already initialized for ${this.serverName}`);
    }

    mcpLogger.debug(`[MCPClient] Initializing client for ${this.serverName}`);

    try {
      // Set up error handlers following Cline's pattern
      this.transport.onerror = (error) => {
        mcpLogger.error(`[MCPClient] Transport error for ${this.serverName}:`, error);
        this._status = 'error';
      };

      this.transport.onclose = () => {
        mcpLogger.info(`[MCPClient] Transport closed for ${this.serverName}`);
        if (this._status !== 'closed') {
          this._status = 'error';
        }
      };

      // Connect client to transport following Cline's exact pattern
      // Note: client.connect() automatically starts the transport
      await this.client.connect(this.transport);
      
      this._status = 'ready';
      
      mcpLogger.info(`[MCPClient] Client initialized for ${this.serverName}`);
    } catch (error) {
      this._status = 'error';
      mcpLogger.error(`[MCPClient] Initialization failed for ${this.serverName}:`, error);
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this._status === 'closed') {
      return;
    }

    mcpLogger.debug(`[MCPClient] Closing client for ${this.serverName}`);

    try {
      // Close client connection
      await this.client.close();
      
      // Close transport
      if ('close' in this.transport) {
        await this.transport.close();
      }
    } catch (error) {
      mcpLogger.warn(`[MCPClient] Failed to close cleanly for ${this.serverName}:`, error);
    }

    this._status = 'closed';
    
    mcpLogger.debug(`[MCPClient] Client closed for ${this.serverName}`);
  }

  async listTools(): Promise<MCPTool[]> {
    this.ensureReady();
    
    mcpLogger.debug(`[MCPClient] Listing tools for ${this.serverName}`);

    try {
      // Use official SDK with schema validation following Cline's pattern
      const result = await this.client.request(
        {
          method: 'tools/list',
          params: {},
        },
        ListToolsResultSchema
      );

      const tools = result.tools || [];
      mcpLogger.debug(`[MCPClient] Found ${tools.length} tools for ${this.serverName}`);
      return tools;
    } catch (error) {
      mcpLogger.error(`[MCPClient] Failed to list tools for ${this.serverName}:`, error);
      throw error;
    }
  }

  async callTool(name: string, args: Record<string, any> = {}): Promise<MCPToolResult> {
    this.ensureReady();
    
    mcpLogger.debug(`[MCPClient] Calling tool ${name} on ${this.serverName}`);

    try {
      // Use official SDK with schema validation following Cline's exact pattern
      const result = await this.client.request(
        {
          method: 'tools/call',
          params: {
            name,
            arguments: args,
          },
        },
        CallToolResultSchema,
        {
          timeout: this.options.timeout,
        }
      );

      mcpLogger.debug(`[MCPClient] Tool call successful: ${name} on ${this.serverName}`);
      mcpLogger.debug(`[MCPClient] Raw result structure:`, JSON.stringify(result, null, 2));
      
      // Extract and log content for debugging
      const content = result.content || [];
      if (Array.isArray(content)) {
        mcpLogger.debug(`[MCPClient] Extracted ${content.length} content items:`, 
          content.map((c: any) => ({ type: c.type, textLength: c.text?.length, hasData: !!c.data }))
        );
      }
      
      // Return result following Cline's pattern
      return {
        ...result,
        content: result.content ?? [],
      };
    } catch (error) {
      mcpLogger.error(`[MCPClient] Tool call failed: ${name} on ${this.serverName}:`, error);
      throw error;
    }
  }

  // Private methods

  private createTransport(): Transport {
    const { type } = this.options;

    switch (type) {
      case 'stdio': {
        return new StdioClientTransport({
          command: this.options.command!,
          args: this.options.args,
          cwd: this.options.cwd,
          env: {
            ...getDefaultEnvironment(),
            ...(this.options.env || {}),
          },
          stderr: 'pipe',
        });
      }
      case 'sse': {
        return new SSEClientTransport(new URL(this.options.url!), {
          requestInit: {
            headers: this.options.headers,
          },
        });
      }
      case 'streamableHttp': {
        return new StreamableHTTPClientTransport(new URL(this.options.url!), {
          requestInit: {
            headers: this.options.headers,
          },
        });
      }
      default:
        throw new Error(`Unknown transport type: ${type}`);
    }
  }

  async request(method: string, params: any, timeout?: number): Promise<any> {
    this.ensureReady();
    
    // Use the official SDK client's request method without schema validation
    return await (this.client as any).request(
      {
        method,
        params,
      },
      {
        timeout: timeout || this.options.timeout,
      }
    );
  }

  private ensureReady(): void {
    if (this._status !== 'ready') {
      throw new Error(`Client not ready for ${this.serverName} (status: ${this._status})`);
    }
  }
}