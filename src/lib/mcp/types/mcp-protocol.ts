/**
 * MCP Protocol Types - Complete type definitions for Model Context Protocol
 * Based on MCP specification 2024-11-05
 */

import { ChildProcess } from 'child_process';

// Core MCP Protocol Types
export interface MCPRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: any;
}

export interface MCPResponse {
  jsonrpc: '2.0';
  id: number;
  result?: any;
  error?: MCPError;
}

export interface MCPError {
  code: number;
  message: string;
  data?: any;
}

export interface MCPNotification {
  jsonrpc: '2.0';
  method: string;
  params?: any;
}

// MCP Capabilities
export interface MCPCapabilities {
  tools?: {
    listChanged?: boolean;
  };
  resources?: {
    subscribe?: boolean;
    listChanged?: boolean;
  };
  prompts?: {
    listChanged?: boolean;
  };
  logging?: {};
}

export interface MCPClientInfo {
  name: string;
  version: string;
}

export interface MCPServerInfo {
  name: string;
  version: string;
}

// Initialize request/response
export interface MCPInitializeParams {
  protocolVersion: string;
  capabilities: MCPCapabilities;
  clientInfo: MCPClientInfo;
}

export interface MCPInitializeResult {
  protocolVersion: string;
  capabilities: MCPCapabilities;
  serverInfo: MCPServerInfo;
  instructions?: string;
}

// Tools
export interface MCPTool {
  name: string;
  description?: string;
  inputSchema: {
    type: 'object';
    properties?: Record<string, any>;
    required?: string[];
    additionalProperties?: boolean;
  };
}

export interface MCPToolListResult {
  tools: MCPTool[];
}

export interface MCPToolCallParams {
  name: string;
  arguments?: Record<string, any>;
}

export interface MCPToolResult {
  content: MCPContent[];
  isError?: boolean;
}

export interface MCPContent {
  type: 'text' | 'image' | 'resource' | 'audio' | 'resource_link' | 'prompt_reference';
  text?: string;
  data?: string;
  mimeType?: string;
  uri?: string;
  name?: string;
  title?: string;
  description?: string;
  resource?: {
    uri: string;
    mimeType?: string;
    text?: string;
    blob?: string;
  };
  _meta?: Record<string, unknown>;
}

// Server configuration and management
export interface ExternalMCPServerConfig {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  transport: 'stdio' | 'sse';
  url?: string;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface MCPServerInstance {
  id: string;
  name: string;
  config: ExternalMCPServerConfig;
  process?: ChildProcess;
  status: 'starting' | 'initializing' | 'ready' | 'error' | 'terminated';
  capabilities?: MCPCapabilities;
  tools: MCPTool[];
  lastUsed: number;
  errorCount: number;
  maxErrors: number;
}

export interface ConnectedServer {
  name: string;
  instance: MCPServerInstance;
  toolCount: number;
  status: 'connected' | 'connecting' | 'error' | 'disconnected';
  lastError?: string;
}

// Protocol execution context
export interface MCPExecutionContext {
  sessionId: string;
  userId: string;
  timeout?: number;
  retries?: number;
}

// Error types
export class MCPProtocolError extends Error {
  constructor(
    public code: number,
    message: string,
    public data?: any
  ) {
    super(message);
    this.name = 'MCPProtocolError';
  }
}

export class MCPConnectionError extends Error {
  constructor(
    message: string,
    public serverName: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'MCPConnectionError';
  }
}

export class MCPTimeoutError extends Error {
  constructor(
    message: string,
    public timeout: number
  ) {
    super(message);
    this.name = 'MCPTimeoutError';
  }
}

// Tool execution result
export interface MCPToolExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata: {
    serverName: string;
    toolName: string;
    executionTime: number;
    timestamp: number;
  };
}

// Protocol constants
export const MCP_PROTOCOL_VERSION = '2024-11-05';
export const MCP_JSONRPC_VERSION = '2.0';

export const MCP_METHODS = {
  INITIALIZE: 'initialize',
  INITIALIZED: 'initialized',
  TOOLS_LIST: 'tools/list',
  TOOLS_CALL: 'tools/call',
  SHUTDOWN: 'shutdown',
} as const;

export const MCP_ERROR_CODES = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  SERVER_ERROR_START: -32099,
  SERVER_ERROR_END: -32000,
} as const;

export type MCPMethod = typeof MCP_METHODS[keyof typeof MCP_METHODS];