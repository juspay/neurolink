# Client SDKs Implementation Guide

This document provides a comprehensive implementation guide for adding Mastra-style client SDKs to NeuroLink. The client SDK system enables type-safe API access from JavaScript/TypeScript applications and React applications with hooks for agents, workflows, and real-time streaming.

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Architecture Design](#2-architecture-design)
3. [Type System Design](#3-type-system-design)
4. [JavaScript/TypeScript Client](#4-javascripttypescript-client)
5. [React Client](#5-react-client)
6. [AI SDK Integration](#6-ai-sdk-integration)
7. [Client Features](#7-client-features)
8. [Package Structure](#8-package-structure)
9. [Implementation Plan](#9-implementation-plan)
10. [Code Examples](#10-code-examples)

---

## 1. Current State Analysis

### 1.1 Existing NeuroLink Capabilities

NeuroLink currently has a robust SDK implementation that can serve as the foundation for client SDKs:

#### Core SDK

- **NeuroLink Class** (`src/lib/neurolink.ts`): Main SDK class with generate/stream methods
- **Type System** (`src/lib/types/`): Comprehensive TypeScript types for all operations
- **Provider System**: Factory pattern with dynamic provider registration

#### Generation and Streaming

- **GenerateOptions/GenerateResult** (`src/lib/types/generateTypes.ts`): Type-safe generation
- **StreamOptions/StreamResult** (`src/lib/types/streamTypes.ts`): Streaming with tool support
- **Event System** (`src/lib/types/common.ts`): TypedEventEmitter for real-time events

#### Tool System

- **MCPToolRegistry** (`src/lib/mcp/toolRegistry.ts`): Tool registration and execution
- **ExternalServerManager** (`src/lib/mcp/externalServerManager.ts`): External MCP server management

### 1.2 Gaps to Address

| Feature              | Current State | Required for Client SDKs          |
| -------------------- | ------------- | --------------------------------- |
| HTTP API Client      | None          | REST client with all endpoints    |
| React Hooks          | None          | useAgent, useChat, useWorkflow    |
| Streaming Protocol   | Internal only | SSE/WebSocket client support      |
| AI SDK Compatibility | Partial       | Full Vercel AI SDK integration    |
| Authentication       | None          | API key/token management          |
| Request Interceptors | None          | Middleware for requests/responses |
| Retry Logic          | Internal only | Client-side retry with backoff    |
| Error Handling       | SDK errors    | HTTP error classification         |

---

## 2. Architecture Design

### 2.1 High-Level Architecture

```
+-------------------------------------------------------------------------+
|                        NeuroLink Client SDK System                       |
+-------------------------------------------------------------------------+
|                                                                         |
|  +----------------------+    +----------------------+    +------------+ |
|  | @neurolink/client    |    | @neurolink/react     |    | @neurolink | |
|  | (JS/TS Client)       |    | (React Hooks)        |    | /ai-sdk    | |
|  +----------------------+    +----------------------+    +------------+ |
|           |                           |                        |        |
|           v                           v                        v        |
|  +----------------------------------------------------------------------+|
|  |                        Core Client Layer                              ||
|  |  +---------------+  +---------------+  +---------------+             ||
|  |  | HTTP Client   |  | WebSocket     |  | SSE Client    |             ||
|  |  | (fetch-based) |  | Client        |  | (EventSource) |             ||
|  |  +---------------+  +---------------+  +---------------+             ||
|  +----------------------------------------------------------------------+|
|           |                           |                        |        |
|  +----------------------------------------------------------------------+|
|  |                      Middleware Layer                                 ||
|  |  +-------------+  +-------------+  +-------------+  +-------------+  ||
|  |  | Auth        |  | Retry       |  | Logging     |  | Transform   |  ||
|  |  | Middleware  |  | Middleware  |  | Middleware  |  | Middleware  |  ||
|  |  +-------------+  +-------------+  +-------------+  +-------------+  ||
|  +----------------------------------------------------------------------+|
|                                                                         |
+-------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
|                        NeuroLink Server API                              |
|  /api/generate  /api/stream  /api/agents  /api/workflows  /api/tools    |
+-------------------------------------------------------------------------+
```

### 2.2 Design Principles

1. **Factory Pattern Consistency**: Follow NeuroLink's existing factory + registry pattern
2. **Type Safety**: Full TypeScript types with Zod schema validation
3. **Framework Agnostic**: Core client works without React
4. **Streaming First**: Native support for SSE and WebSocket streaming
5. **AI SDK Compatible**: Drop-in compatibility with Vercel AI SDK
6. **Modular Packages**: Separate packages for core, React, and AI SDK

---

## 3. Type System Design

### 3.1 Core Client Types

```typescript
// src/lib/types/clientTypes.ts

import type { GenerateOptions, GenerateResult } from "./generateTypes.js";
import type {
  StreamOptions,
  StreamResult,
  ToolCall,
  ToolResult,
} from "./streamTypes.js";
import type { JsonValue, JsonObject, UnknownRecord } from "./common.js";

/**
 * Client configuration options
 */
export type ClientConfig = {
  /** Base URL for the NeuroLink API */
  baseUrl: string;
  /** API key for authentication */
  apiKey?: string;
  /** Bearer token for authentication */
  token?: string;
  /** Default timeout in milliseconds */
  timeout?: number;
  /** Default headers to include in all requests */
  headers?: Record<string, string>;
  /** Retry configuration */
  retry?: RetryConfig;
  /** Enable debug logging */
  debug?: boolean;
  /** Custom fetch implementation */
  fetch?: typeof fetch;
};

/**
 * Retry configuration for failed requests
 */
export type RetryConfig = {
  /** Maximum number of retry attempts */
  maxAttempts: number;
  /** Initial delay in milliseconds */
  initialDelayMs: number;
  /** Maximum delay in milliseconds */
  maxDelayMs: number;
  /** Backoff multiplier */
  backoffMultiplier: number;
  /** HTTP status codes to retry on */
  retryableStatusCodes?: number[];
  /** Whether to retry on network errors */
  retryOnNetworkError?: boolean;
};

/**
 * Request options for API calls
 */
export type RequestOptions = {
  /** Request timeout override */
  timeout?: number;
  /** Signal for request cancellation */
  signal?: AbortSignal;
  /** Additional headers for this request */
  headers?: Record<string, string>;
  /** Skip retry for this request */
  skipRetry?: boolean;
};

/**
 * Response wrapper with metadata
 */
export type ApiResponse<T> = {
  /** Response data */
  data: T;
  /** HTTP status code */
  status: number;
  /** Response headers */
  headers: Record<string, string>;
  /** Request duration in milliseconds */
  duration: number;
  /** Request ID for tracing */
  requestId?: string;
};

/**
 * Error response from API
 */
export type ApiError = {
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** HTTP status code */
  status: number;
  /** Additional error details */
  details?: JsonObject;
  /** Whether the error is retryable */
  retryable?: boolean;
  /** Request ID for tracing */
  requestId?: string;
};

/**
 * Stream event types for real-time communication
 */
export type StreamEventType =
  | "text"
  | "tool-call"
  | "tool-result"
  | "error"
  | "done"
  | "metadata";

/**
 * Stream event from SSE/WebSocket
 */
export type StreamEvent = {
  /** Event type */
  type: StreamEventType;
  /** Text content (for text events) */
  content?: string;
  /** Tool call data (for tool-call events) */
  toolCall?: ToolCall;
  /** Tool result data (for tool-result events) */
  toolResult?: ToolResult;
  /** Error data (for error events) */
  error?: ApiError;
  /** Metadata (for metadata events) */
  metadata?: JsonObject;
  /** Event timestamp */
  timestamp: number;
};

/**
 * Streaming callback handlers
 */
export type StreamCallbacks = {
  /** Called for each text chunk */
  onText?: (text: string) => void;
  /** Called for each tool call */
  onToolCall?: (toolCall: ToolCall) => void;
  /** Called for each tool result */
  onToolResult?: (toolResult: ToolResult) => void;
  /** Called on stream error */
  onError?: (error: ApiError) => void;
  /** Called when stream completes */
  onDone?: (result: StreamResult) => void;
  /** Called for metadata updates */
  onMetadata?: (metadata: JsonObject) => void;
};

/**
 * Agent execution options
 */
export type AgentExecuteOptions = {
  /** Agent ID */
  agentId: string;
  /** Input message */
  input: string;
  /** Session ID for conversation continuity */
  sessionId?: string;
  /** User context */
  context?: UnknownRecord;
  /** Stream the response */
  stream?: boolean;
  /** Tool execution options */
  tools?: {
    /** Enabled tools */
    enabled?: string[];
    /** Disabled tools */
    disabled?: string[];
    /** Tool execution mode */
    mode?: "auto" | "manual" | "confirm";
  };
};

/**
 * Agent execution result
 */
export type AgentExecuteResult = {
  /** Response content */
  content: string;
  /** Agent ID */
  agentId: string;
  /** Session ID */
  sessionId: string;
  /** Tools used */
  toolsUsed?: string[];
  /** Tool executions */
  toolExecutions?: Array<{
    name: string;
    input: UnknownRecord;
    output: unknown;
    duration: number;
  }>;
  /** Token usage */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** Response metadata */
  metadata?: JsonObject;
};

/**
 * Workflow execution options
 */
export type WorkflowExecuteOptions = {
  /** Workflow ID */
  workflowId: string;
  /** Workflow input data */
  input: UnknownRecord;
  /** Session ID for state persistence */
  sessionId?: string;
  /** Resume from a suspended state */
  resumeToken?: string;
  /** Callback URL for async completion */
  callbackUrl?: string;
};

/**
 * Workflow execution result
 */
export type WorkflowExecuteResult = {
  /** Workflow run ID */
  runId: string;
  /** Workflow ID */
  workflowId: string;
  /** Execution status */
  status: "running" | "completed" | "failed" | "suspended";
  /** Output data (if completed) */
  output?: UnknownRecord;
  /** Error information (if failed) */
  error?: ApiError;
  /** Suspend token (if suspended) */
  suspendToken?: string;
  /** Step results */
  steps?: Array<{
    stepId: string;
    status: "completed" | "failed" | "skipped";
    output?: unknown;
    duration: number;
  }>;
  /** Total execution duration */
  duration?: number;
};

/**
 * Middleware function type
 */
export type Middleware = (
  request: MiddlewareRequest,
  next: () => Promise<MiddlewareResponse>,
) => Promise<MiddlewareResponse>;

/**
 * Middleware request object
 */
export type MiddlewareRequest = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: unknown;
  context: MiddlewareContext;
};

/**
 * Middleware response object
 */
export type MiddlewareResponse = {
  status: number;
  headers: Record<string, string>;
  body: unknown;
  context: MiddlewareContext;
};

/**
 * Middleware context for passing data between middleware
 */
export type MiddlewareContext = {
  startTime: number;
  requestId: string;
  retryCount: number;
  [key: string]: unknown;
};
```

### 3.2 React Hook Types

```typescript
// src/lib/types/reactClientTypes.ts

import type {
  AgentExecuteOptions,
  AgentExecuteResult,
  WorkflowExecuteOptions,
  WorkflowExecuteResult,
  StreamCallbacks,
  ApiError,
} from "./clientTypes.js";
import type { ToolCall, ToolResult } from "./streamTypes.js";
import type { UnknownRecord, JsonObject } from "./common.js";

/**
 * Chat message for useChat hook
 */
export type ChatMessage = {
  /** Unique message ID */
  id: string;
  /** Message role */
  role: "user" | "assistant" | "system" | "tool";
  /** Message content */
  content: string;
  /** Tool calls in this message */
  toolCalls?: ToolCall[];
  /** Tool results in this message */
  toolResults?: ToolResult[];
  /** Message timestamp */
  createdAt: Date;
  /** Additional metadata */
  metadata?: JsonObject;
};

/**
 * useChat hook options
 */
export type UseChatOptions = {
  /** API endpoint for chat */
  api?: string;
  /** Agent ID to use */
  agentId?: string;
  /** Initial messages */
  initialMessages?: ChatMessage[];
  /** Session ID for conversation continuity */
  sessionId?: string;
  /** System prompt */
  systemPrompt?: string;
  /** Called when response starts */
  onResponse?: (response: Response) => void | Promise<void>;
  /** Called when response finishes */
  onFinish?: (message: ChatMessage) => void;
  /** Called on error */
  onError?: (error: ApiError) => void;
  /** Called for each tool call */
  onToolCall?: (toolCall: ToolCall) => void;
  /** Request body customization */
  body?: UnknownRecord;
  /** Request headers */
  headers?: Record<string, string>;
  /** Credentials mode */
  credentials?: RequestCredentials;
  /** Generate message ID */
  generateId?: () => string;
};

/**
 * useChat hook return type
 */
export type UseChatReturn = {
  /** Chat messages */
  messages: ChatMessage[];
  /** Current input value */
  input: string;
  /** Set input value */
  setInput: (input: string) => void;
  /** Handle input change */
  handleInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  /** Submit message */
  handleSubmit: (
    e?: React.FormEvent<HTMLFormElement>,
    options?: { data?: UnknownRecord },
  ) => void;
  /** Append a message */
  append: (
    message: Omit<ChatMessage, "id" | "createdAt">,
  ) => Promise<string | null | undefined>;
  /** Reload the last message */
  reload: () => Promise<string | null | undefined>;
  /** Stop generation */
  stop: () => void;
  /** Set messages directly */
  setMessages: (messages: ChatMessage[]) => void;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: ApiError | null;
  /** Clear error */
  clearError: () => void;
  /** Current tool calls being executed */
  toolCalls: ToolCall[];
};

/**
 * useAgent hook options
 */
export type UseAgentOptions = {
  /** Agent ID */
  agentId: string;
  /** Initial session ID */
  sessionId?: string;
  /** Called on agent response */
  onResponse?: (result: AgentExecuteResult) => void;
  /** Called on error */
  onError?: (error: ApiError) => void;
  /** Called when tool is called */
  onToolCall?: (toolCall: ToolCall) => void;
  /** Auto-execute on mount with initial input */
  initialInput?: string;
};

/**
 * useAgent hook return type
 */
export type UseAgentReturn = {
  /** Execute the agent */
  execute: (
    input: string,
    options?: Partial<AgentExecuteOptions>,
  ) => Promise<AgentExecuteResult>;
  /** Stream execution */
  stream: (input: string, callbacks?: StreamCallbacks) => Promise<void>;
  /** Current session ID */
  sessionId: string | null;
  /** Set session ID */
  setSessionId: (sessionId: string | null) => void;
  /** Loading state */
  isLoading: boolean;
  /** Streaming state */
  isStreaming: boolean;
  /** Last result */
  result: AgentExecuteResult | null;
  /** Error state */
  error: ApiError | null;
  /** Clear error */
  clearError: () => void;
  /** Abort current execution */
  abort: () => void;
};

/**
 * useWorkflow hook options
 */
export type UseWorkflowOptions = {
  /** Workflow ID */
  workflowId: string;
  /** Called on workflow completion */
  onComplete?: (result: WorkflowExecuteResult) => void;
  /** Called on workflow error */
  onError?: (error: ApiError) => void;
  /** Called on step completion */
  onStepComplete?: (step: {
    stepId: string;
    status: string;
    output?: unknown;
  }) => void;
  /** Poll interval for status updates (ms) */
  pollInterval?: number;
};

/**
 * useWorkflow hook return type
 */
export type UseWorkflowReturn = {
  /** Execute the workflow */
  execute: (
    input: UnknownRecord,
    options?: Partial<WorkflowExecuteOptions>,
  ) => Promise<WorkflowExecuteResult>;
  /** Resume a suspended workflow */
  resume: (
    resumeToken: string,
    resumeData?: UnknownRecord,
  ) => Promise<WorkflowExecuteResult>;
  /** Get workflow status */
  getStatus: (runId: string) => Promise<WorkflowExecuteResult>;
  /** Cancel workflow execution */
  cancel: (runId: string) => Promise<void>;
  /** Current run ID */
  runId: string | null;
  /** Execution status */
  status: WorkflowExecuteResult["status"] | null;
  /** Loading state */
  isLoading: boolean;
  /** Last result */
  result: WorkflowExecuteResult | null;
  /** Error state */
  error: ApiError | null;
  /** Clear error */
  clearError: () => void;
};

/**
 * useTools hook options
 */
export type UseToolsOptions = {
  /** Filter tools by category */
  category?: string;
  /** Filter tools by server */
  serverId?: string;
  /** Auto-refresh interval (ms) */
  refreshInterval?: number;
};

/**
 * Tool information for useTools hook
 */
export type ToolInfo = {
  /** Tool name */
  name: string;
  /** Tool description */
  description: string;
  /** Tool category */
  category?: string;
  /** Server ID */
  serverId: string;
  /** Input schema */
  inputSchema: JsonObject;
  /** Whether tool requires confirmation */
  requiresConfirmation?: boolean;
};

/**
 * useTools hook return type
 */
export type UseToolsReturn = {
  /** Available tools */
  tools: ToolInfo[];
  /** Execute a tool */
  execute: (toolName: string, params: UnknownRecord) => Promise<unknown>;
  /** Refresh tool list */
  refresh: () => Promise<void>;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: ApiError | null;
};

/**
 * useStream hook options
 */
export type UseStreamOptions = {
  /** API endpoint */
  api?: string;
  /** Stream callbacks */
  callbacks?: StreamCallbacks;
};

/**
 * useStream hook return type
 */
export type UseStreamReturn = {
  /** Start streaming */
  start: (options: { prompt: string } & UnknownRecord) => void;
  /** Stop streaming */
  stop: () => void;
  /** Current text content */
  text: string;
  /** All events received */
  events: import("./clientTypes.js").StreamEvent[];
  /** Streaming state */
  isStreaming: boolean;
  /** Error state */
  error: ApiError | null;
};
```

---

## 4. JavaScript/TypeScript Client

### 4.1 Core HTTP Client

````typescript
// packages/client/src/client.ts

import type {
  ClientConfig,
  RequestOptions,
  ApiResponse,
  ApiError,
  RetryConfig,
  Middleware,
  MiddlewareRequest,
  MiddlewareResponse,
  MiddlewareContext,
} from "./types.js";

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  retryOnNetworkError: true,
};

/**
 * HTTP Client for NeuroLink API
 *
 * Provides type-safe access to all NeuroLink API endpoints with
 * built-in authentication, retry logic, and middleware support.
 *
 * @example Basic usage
 * ```typescript
 * import { createClient } from '@neurolink/client';
 *
 * const client = createClient({
 *   baseUrl: 'https://api.neurolink.example.com',
 *   apiKey: 'your-api-key',
 * });
 *
 * const result = await client.generate({
 *   input: { text: 'Hello, world!' },
 *   provider: 'openai',
 * });
 * ```
 */
export class NeuroLinkClient {
  private config: Required<ClientConfig>;
  private middlewares: Middleware[] = [];

  constructor(config: ClientConfig) {
    this.config = {
      baseUrl: config.baseUrl.replace(/\/$/, ""),
      apiKey: config.apiKey ?? "",
      token: config.token ?? "",
      timeout: config.timeout ?? 30000,
      headers: config.headers ?? {},
      retry: { ...DEFAULT_RETRY_CONFIG, ...config.retry },
      debug: config.debug ?? false,
      fetch: config.fetch ?? globalThis.fetch.bind(globalThis),
    };

    // Add default middleware
    this.use(this.authMiddleware());
    this.use(this.loggingMiddleware());
    this.use(this.retryMiddleware());
  }

  /**
   * Add middleware to the client
   */
  use(middleware: Middleware): this {
    this.middlewares.push(middleware);
    return this;
  }

  /**
   * Authentication middleware
   */
  private authMiddleware(): Middleware {
    return async (request, next) => {
      if (this.config.apiKey) {
        request.headers["X-API-Key"] = this.config.apiKey;
      }
      if (this.config.token) {
        request.headers["Authorization"] = `Bearer ${this.config.token}`;
      }
      return next();
    };
  }

  /**
   * Logging middleware for debug mode
   */
  private loggingMiddleware(): Middleware {
    return async (request, next) => {
      if (!this.config.debug) {
        return next();
      }

      const startTime = Date.now();
      console.log(`[NeuroLink] ${request.method} ${request.url}`);

      try {
        const response = await next();
        const duration = Date.now() - startTime;
        console.log(`[NeuroLink] ${response.status} (${duration}ms)`);
        return response;
      } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`[NeuroLink] Error (${duration}ms):`, error);
        throw error;
      }
    };
  }

  /**
   * Retry middleware with exponential backoff
   */
  private retryMiddleware(): Middleware {
    return async (request, next) => {
      const { retry } = this.config;
      let lastError: Error | undefined;

      for (let attempt = 0; attempt < retry.maxAttempts; attempt++) {
        try {
          const response = await next();

          // Check if response status is retryable
          if (retry.retryableStatusCodes?.includes(response.status)) {
            if (attempt < retry.maxAttempts - 1) {
              await this.delay(this.calculateDelay(attempt, retry));
              request.context.retryCount = attempt + 1;
              continue;
            }
          }

          return response;
        } catch (error) {
          lastError = error as Error;

          // Check if network error and should retry
          if (retry.retryOnNetworkError && attempt < retry.maxAttempts - 1) {
            await this.delay(this.calculateDelay(attempt, retry));
            request.context.retryCount = attempt + 1;
            continue;
          }

          throw error;
        }
      }

      throw lastError ?? new Error("Max retries exceeded");
    };
  }

  /**
   * Calculate delay for exponential backoff
   */
  private calculateDelay(attempt: number, config: RetryConfig): number {
    const delay =
      config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt);
    const jitter = Math.random() * 0.1 * delay;
    return Math.min(delay + jitter, config.maxDelayMs);
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Execute HTTP request with middleware
   */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<ApiResponse<T>> {
    const url = `${this.config.baseUrl}${path}`;
    const requestId = this.generateRequestId();

    const context: MiddlewareContext = {
      startTime: Date.now(),
      requestId,
      retryCount: 0,
    };

    const middlewareRequest: MiddlewareRequest = {
      url,
      method,
      headers: {
        "Content-Type": "application/json",
        "X-Request-ID": requestId,
        ...this.config.headers,
        ...options?.headers,
      },
      body,
      context,
    };

    // Build middleware chain
    const executeRequest = async (): Promise<MiddlewareResponse> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        options?.timeout ?? this.config.timeout,
      );

      try {
        const signal = options?.signal
          ? this.combineSignals(options.signal, controller.signal)
          : controller.signal;

        const response = await this.config.fetch(url, {
          method,
          headers: middlewareRequest.headers,
          body: body ? JSON.stringify(body) : undefined,
          signal,
        });

        clearTimeout(timeoutId);

        const responseBody = await response.json();
        const headers: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          headers[key] = value;
        });

        return {
          status: response.status,
          headers,
          body: responseBody,
          context,
        };
      } finally {
        clearTimeout(timeoutId);
      }
    };

    // Execute with middleware chain
    let index = 0;
    const next = async (): Promise<MiddlewareResponse> => {
      if (index < this.middlewares.length) {
        const middleware = this.middlewares[index++];
        return middleware(middlewareRequest, next);
      }
      return executeRequest();
    };

    const response = await next();

    // Check for error responses
    if (response.status >= 400) {
      const error = response.body as ApiError;
      throw new NeuroLinkApiError(error);
    }

    return {
      data: response.body as T,
      status: response.status,
      headers: response.headers,
      duration: Date.now() - context.startTime,
      requestId,
    };
  }

  /**
   * Combine multiple abort signals
   */
  private combineSignals(...signals: AbortSignal[]): AbortSignal {
    const controller = new AbortController();
    for (const signal of signals) {
      if (signal.aborted) {
        controller.abort();
        break;
      }
      signal.addEventListener("abort", () => controller.abort());
    }
    return controller.signal;
  }

  // ==========================================================================
  // Generation API
  // ==========================================================================

  /**
   * Generate text using AI models
   */
  async generate(
    options: import("./types.js").GenerateOptions,
    requestOptions?: RequestOptions,
  ): Promise<ApiResponse<import("./types.js").GenerateResult>> {
    return this.request("POST", "/api/generate", options, requestOptions);
  }

  /**
   * Stream text generation
   */
  async stream(
    options: import("./types.js").StreamOptions,
    callbacks?: import("./types.js").StreamCallbacks,
    requestOptions?: RequestOptions,
  ): Promise<void> {
    const url = `${this.config.baseUrl}/api/stream`;
    const requestId = this.generateRequestId();

    const response = await this.config.fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        "X-Request-ID": requestId,
        ...(this.config.apiKey ? { "X-API-Key": this.config.apiKey } : {}),
        ...(this.config.token
          ? { Authorization: `Bearer ${this.config.token}` }
          : {}),
        ...this.config.headers,
        ...requestOptions?.headers,
      },
      body: JSON.stringify(options),
      signal: requestOptions?.signal,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new NeuroLinkApiError(error);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Response body is not readable");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              callbacks?.onDone?.(
                undefined as unknown as import("./types.js").StreamResult,
              );
              return;
            }

            try {
              const event = JSON.parse(
                data,
              ) as import("./types.js").StreamEvent;
              this.handleStreamEvent(event, callbacks);
            } catch {
              // Ignore parse errors for malformed events
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Handle individual stream events
   */
  private handleStreamEvent(
    event: import("./types.js").StreamEvent,
    callbacks?: import("./types.js").StreamCallbacks,
  ): void {
    switch (event.type) {
      case "text":
        callbacks?.onText?.(event.content ?? "");
        break;
      case "tool-call":
        if (event.toolCall) {
          callbacks?.onToolCall?.(event.toolCall);
        }
        break;
      case "tool-result":
        if (event.toolResult) {
          callbacks?.onToolResult?.(event.toolResult);
        }
        break;
      case "error":
        if (event.error) {
          callbacks?.onError?.(event.error);
        }
        break;
      case "metadata":
        if (event.metadata) {
          callbacks?.onMetadata?.(event.metadata);
        }
        break;
    }
  }

  // ==========================================================================
  // Agent API
  // ==========================================================================

  /**
   * Execute an agent
   */
  async executeAgent(
    options: import("./types.js").AgentExecuteOptions,
    requestOptions?: RequestOptions,
  ): Promise<ApiResponse<import("./types.js").AgentExecuteResult>> {
    return this.request(
      "POST",
      `/api/agents/${options.agentId}/execute`,
      options,
      requestOptions,
    );
  }

  /**
   * Stream agent execution
   */
  async streamAgent(
    options: import("./types.js").AgentExecuteOptions,
    callbacks?: import("./types.js").StreamCallbacks,
    requestOptions?: RequestOptions,
  ): Promise<void> {
    return this.stream(
      {
        input: { text: options.input },
        context: options.context,
        // Map agent options to stream options
      } as import("./types.js").StreamOptions,
      callbacks,
      requestOptions,
    );
  }

  /**
   * List available agents
   */
  async listAgents(
    requestOptions?: RequestOptions,
  ): Promise<
    ApiResponse<Array<{ id: string; name: string; description: string }>>
  > {
    return this.request("GET", "/api/agents", undefined, requestOptions);
  }

  /**
   * Get agent details
   */
  async getAgent(
    agentId: string,
    requestOptions?: RequestOptions,
  ): Promise<
    ApiResponse<{
      id: string;
      name: string;
      description: string;
      tools: string[];
    }>
  > {
    return this.request(
      "GET",
      `/api/agents/${agentId}`,
      undefined,
      requestOptions,
    );
  }

  // ==========================================================================
  // Workflow API
  // ==========================================================================

  /**
   * Execute a workflow
   */
  async executeWorkflow(
    options: import("./types.js").WorkflowExecuteOptions,
    requestOptions?: RequestOptions,
  ): Promise<ApiResponse<import("./types.js").WorkflowExecuteResult>> {
    return this.request(
      "POST",
      `/api/workflows/${options.workflowId}/execute`,
      options,
      requestOptions,
    );
  }

  /**
   * Resume a suspended workflow
   */
  async resumeWorkflow(
    workflowId: string,
    resumeToken: string,
    resumeData?: import("./types.js").UnknownRecord,
    requestOptions?: RequestOptions,
  ): Promise<ApiResponse<import("./types.js").WorkflowExecuteResult>> {
    return this.request(
      "POST",
      `/api/workflows/${workflowId}/resume`,
      { resumeToken, resumeData },
      requestOptions,
    );
  }

  /**
   * Get workflow execution status
   */
  async getWorkflowStatus(
    workflowId: string,
    runId: string,
    requestOptions?: RequestOptions,
  ): Promise<ApiResponse<import("./types.js").WorkflowExecuteResult>> {
    return this.request(
      "GET",
      `/api/workflows/${workflowId}/runs/${runId}`,
      undefined,
      requestOptions,
    );
  }

  /**
   * Cancel workflow execution
   */
  async cancelWorkflow(
    workflowId: string,
    runId: string,
    requestOptions?: RequestOptions,
  ): Promise<ApiResponse<{ success: boolean }>> {
    return this.request(
      "POST",
      `/api/workflows/${workflowId}/runs/${runId}/cancel`,
      undefined,
      requestOptions,
    );
  }

  /**
   * List available workflows
   */
  async listWorkflows(
    requestOptions?: RequestOptions,
  ): Promise<
    ApiResponse<
      Array<{ id: string; name: string; description: string; version: string }>
    >
  > {
    return this.request("GET", "/api/workflows", undefined, requestOptions);
  }

  // ==========================================================================
  // Tools API
  // ==========================================================================

  /**
   * List available tools
   */
  async listTools(
    options?: { category?: string; serverId?: string },
    requestOptions?: RequestOptions,
  ): Promise<ApiResponse<import("./types.js").ToolInfo[]>> {
    const params = new URLSearchParams();
    if (options?.category) params.set("category", options.category);
    if (options?.serverId) params.set("serverId", options.serverId);

    const query = params.toString();
    return this.request(
      "GET",
      `/api/tools${query ? `?${query}` : ""}`,
      undefined,
      requestOptions,
    );
  }

  /**
   * Execute a tool
   */
  async executeTool(
    toolName: string,
    params: import("./types.js").UnknownRecord,
    requestOptions?: RequestOptions,
  ): Promise<ApiResponse<unknown>> {
    return this.request(
      "POST",
      `/api/tools/${toolName}/execute`,
      { params },
      requestOptions,
    );
  }

  /**
   * Get tool details
   */
  async getTool(
    toolName: string,
    requestOptions?: RequestOptions,
  ): Promise<ApiResponse<import("./types.js").ToolInfo>> {
    return this.request(
      "GET",
      `/api/tools/${toolName}`,
      undefined,
      requestOptions,
    );
  }

  // ==========================================================================
  // Provider API
  // ==========================================================================

  /**
   * List available providers
   */
  async listProviders(
    requestOptions?: RequestOptions,
  ): Promise<
    ApiResponse<Array<{ name: string; status: string; models: string[] }>>
  > {
    return this.request("GET", "/api/providers", undefined, requestOptions);
  }

  /**
   * Get provider status
   */
  async getProviderStatus(
    providerName: string,
    requestOptions?: RequestOptions,
  ): Promise<ApiResponse<import("./types.js").ProviderStatus>> {
    return this.request(
      "GET",
      `/api/providers/${providerName}/status`,
      undefined,
      requestOptions,
    );
  }

  // ==========================================================================
  // Health API
  // ==========================================================================

  /**
   * Health check
   */
  async health(
    requestOptions?: RequestOptions,
  ): Promise<ApiResponse<{ status: string; version: string }>> {
    return this.request("GET", "/api/health", undefined, requestOptions);
  }
}

/**
 * Custom error class for API errors
 */
export class NeuroLinkApiError extends Error {
  code: string;
  status: number;
  details?: import("./types.js").JsonObject;
  retryable: boolean;
  requestId?: string;

  constructor(error: import("./types.js").ApiError) {
    super(error.message);
    this.name = "NeuroLinkApiError";
    this.code = error.code;
    this.status = error.status;
    this.details = error.details;
    this.retryable = error.retryable ?? false;
    this.requestId = error.requestId;
  }
}

/**
 * Create a new NeuroLink client instance
 */
export function createClient(config: ClientConfig): NeuroLinkClient {
  return new NeuroLinkClient(config);
}
````

---

## 5. React Client

### 5.1 useChat Hook

````typescript
// packages/react/src/hooks/useChat.ts

import { useState, useCallback, useRef, useEffect } from "react";
import type { UseChatOptions, UseChatReturn, ChatMessage } from "./types.js";
import type { ApiError, ToolCall } from "@neurolink/client";

/**
 * React hook for chat interactions with NeuroLink agents
 *
 * Provides a chat interface with support for streaming responses,
 * tool calls, and conversation history management.
 *
 * @example Basic usage
 * ```tsx
 * function ChatComponent() {
 *   const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
 *     api: '/api/chat',
 *     agentId: 'my-agent',
 *   });
 *
 *   return (
 *     <div>
 *       {messages.map(m => (
 *         <div key={m.id} className={m.role}>
 *           {m.content}
 *         </div>
 *       ))}
 *       <form onSubmit={handleSubmit}>
 *         <input value={input} onChange={handleInputChange} />
 *         <button type="submit" disabled={isLoading}>Send</button>
 *       </form>
 *     </div>
 *   );
 * }
 * ```
 */
export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const {
    api = "/api/chat",
    agentId,
    initialMessages = [],
    sessionId: initialSessionId,
    systemPrompt,
    onResponse,
    onFinish,
    onError,
    onToolCall,
    body,
    headers,
    credentials,
    generateId = () =>
      `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  } = options;

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const sessionIdRef = useRef<string | undefined>(initialSessionId);

  /**
   * Handle input change
   */
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setInput(e.target.value);
    },
    [],
  );

  /**
   * Append a message and get response
   */
  const append = useCallback(
    async (
      message: Omit<ChatMessage, "id" | "createdAt">,
    ): Promise<string | null | undefined> => {
      const userMessage: ChatMessage = {
        id: generateId(),
        createdAt: new Date(),
        ...message,
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setError(null);
      setToolCalls([]);

      // Create abort controller
      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch(api, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
            ...headers,
          },
          credentials,
          body: JSON.stringify({
            messages: [...messages, userMessage].map((m) => ({
              role: m.role,
              content: m.content,
            })),
            agentId,
            sessionId: sessionIdRef.current,
            systemPrompt,
            ...body,
          }),
          signal: abortControllerRef.current.signal,
        });

        await onResponse?.(response);

        if (!response.ok) {
          const errorData = await response.json();
          throw errorData;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("Response body is not readable");
        }

        const decoder = new TextDecoder();
        let buffer = "";
        let assistantContent = "";
        const assistantId = generateId();
        const currentToolCalls: ToolCall[] = [];

        // Add placeholder for assistant message
        const assistantMessage: ChatMessage = {
          id: assistantId,
          role: "assistant",
          content: "",
          createdAt: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") {
                break;
              }

              try {
                const event = JSON.parse(data);

                if (event.type === "text" && event.content) {
                  assistantContent += event.content;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? { ...m, content: assistantContent }
                        : m,
                    ),
                  );
                } else if (event.type === "tool-call" && event.toolCall) {
                  currentToolCalls.push(event.toolCall);
                  setToolCalls([...currentToolCalls]);
                  onToolCall?.(event.toolCall);
                } else if (event.type === "tool-result" && event.toolResult) {
                  // Update tool calls with results
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? {
                            ...m,
                            toolCalls: currentToolCalls,
                            toolResults: [
                              ...(m.toolResults ?? []),
                              event.toolResult,
                            ],
                          }
                        : m,
                    ),
                  );
                } else if (event.type === "metadata" && event.sessionId) {
                  sessionIdRef.current = event.sessionId;
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
        }

        reader.releaseLock();

        // Final message update
        const finalMessage: ChatMessage = {
          id: assistantId,
          role: "assistant",
          content: assistantContent,
          toolCalls: currentToolCalls.length > 0 ? currentToolCalls : undefined,
          createdAt: new Date(),
        };

        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? finalMessage : m)),
        );

        onFinish?.(finalMessage);
        return assistantId;
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          return null;
        }
        const apiError = err as ApiError;
        setError(apiError);
        onError?.(apiError);
        return null;
      } finally {
        setIsLoading(false);
        setToolCalls([]);
        abortControllerRef.current = null;
      }
    },
    [
      api,
      agentId,
      messages,
      systemPrompt,
      body,
      headers,
      credentials,
      generateId,
      onResponse,
      onFinish,
      onError,
      onToolCall,
    ],
  );

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    (
      e?: React.FormEvent<HTMLFormElement>,
      submitOptions?: { data?: Record<string, unknown> },
    ) => {
      e?.preventDefault();

      if (!input.trim()) return;

      const message: Omit<ChatMessage, "id" | "createdAt"> = {
        role: "user",
        content: input,
        metadata: submitOptions?.data,
      };

      setInput("");
      append(message);
    },
    [input, append],
  );

  /**
   * Reload the last assistant message
   */
  const reload = useCallback(async (): Promise<string | null | undefined> => {
    const lastUserMessageIndex = messages.findLastIndex(
      (m) => m.role === "user",
    );
    if (lastUserMessageIndex === -1) return null;

    const lastUserMessage = messages[lastUserMessageIndex];

    // Remove messages after the last user message
    setMessages((prev) => prev.slice(0, lastUserMessageIndex));

    return append({
      role: "user",
      content: lastUserMessage.content,
    });
  }, [messages, append]);

  /**
   * Stop streaming
   */
  const stop = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return {
    messages,
    input,
    setInput,
    handleInputChange,
    handleSubmit,
    append,
    reload,
    stop,
    setMessages,
    isLoading,
    error,
    clearError,
    toolCalls,
  };
}
````

### 5.2 useAgent Hook

````typescript
// packages/react/src/hooks/useAgent.ts

import { useState, useCallback, useRef, useEffect } from "react";
import { useNeuroLinkClient } from "./useNeuroLinkClient.js";
import type { UseAgentOptions, UseAgentReturn } from "./types.js";
import type {
  AgentExecuteOptions,
  AgentExecuteResult,
  StreamCallbacks,
  ApiError,
} from "@neurolink/client";

/**
 * React hook for interacting with NeuroLink agents
 *
 * Provides methods for executing agents with both streaming
 * and non-streaming responses, with session management.
 *
 * @example Basic usage
 * ```tsx
 * function AgentComponent() {
 *   const { execute, isLoading, result, error } = useAgent({
 *     agentId: 'my-agent',
 *     onResponse: (result) => console.log('Agent responded:', result),
 *   });
 *
 *   return (
 *     <div>
 *       <button onClick={() => execute('Hello!')}>
 *         {isLoading ? 'Thinking...' : 'Ask Agent'}
 *       </button>
 *       {result && <p>{result.content}</p>}
 *       {error && <p className="error">{error.message}</p>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useAgent(options: UseAgentOptions): UseAgentReturn {
  const {
    agentId,
    sessionId: initialSessionId,
    onResponse,
    onError,
    onToolCall,
    initialInput,
  } = options;

  const client = useNeuroLinkClient();
  const [sessionId, setSessionId] = useState<string | null>(
    initialSessionId ?? null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [result, setResult] = useState<AgentExecuteResult | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Execute agent (non-streaming)
   */
  const execute = useCallback(
    async (
      input: string,
      executeOptions?: Partial<AgentExecuteOptions>,
    ): Promise<AgentExecuteResult> => {
      setIsLoading(true);
      setError(null);

      abortControllerRef.current = new AbortController();

      try {
        const response = await client.executeAgent(
          {
            agentId,
            input,
            sessionId: sessionId ?? undefined,
            ...executeOptions,
          },
          { signal: abortControllerRef.current.signal },
        );

        const agentResult = response.data;
        setResult(agentResult);
        setSessionId(agentResult.sessionId);
        onResponse?.(agentResult);

        return agentResult;
      } catch (err) {
        const apiError = err as ApiError;
        setError(apiError);
        onError?.(apiError);
        throw err;
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [client, agentId, sessionId, onResponse, onError],
  );

  /**
   * Stream agent execution
   */
  const stream = useCallback(
    async (input: string, callbacks?: StreamCallbacks): Promise<void> => {
      setIsStreaming(true);
      setIsLoading(true);
      setError(null);

      abortControllerRef.current = new AbortController();

      try {
        await client.streamAgent(
          {
            agentId,
            input,
            sessionId: sessionId ?? undefined,
            stream: true,
          },
          {
            ...callbacks,
            onToolCall: (toolCall) => {
              callbacks?.onToolCall?.(toolCall);
              onToolCall?.(toolCall);
            },
            onDone: (streamResult) => {
              callbacks?.onDone?.(streamResult);
              setIsStreaming(false);
            },
            onError: (apiError) => {
              callbacks?.onError?.(apiError);
              setError(apiError);
              onError?.(apiError);
            },
          },
          { signal: abortControllerRef.current.signal },
        );
      } catch (err) {
        const apiError = err as ApiError;
        setError(apiError);
        onError?.(apiError);
      } finally {
        setIsLoading(false);
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [client, agentId, sessionId, onToolCall, onError],
  );

  /**
   * Abort current execution
   */
  const abort = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsLoading(false);
    setIsStreaming(false);
  }, []);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Auto-execute on mount if initialInput is provided
  useEffect(() => {
    if (initialInput) {
      execute(initialInput);
    }

    return () => {
      abortControllerRef.current?.abort();
    };
  }, []); // Only run on mount

  return {
    execute,
    stream,
    sessionId,
    setSessionId,
    isLoading,
    isStreaming,
    result,
    error,
    clearError,
    abort,
  };
}
````

### 5.3 useWorkflow Hook

````typescript
// packages/react/src/hooks/useWorkflow.ts

import { useState, useCallback, useRef, useEffect } from "react";
import { useNeuroLinkClient } from "./useNeuroLinkClient.js";
import type { UseWorkflowOptions, UseWorkflowReturn } from "./types.js";
import type {
  WorkflowExecuteOptions,
  WorkflowExecuteResult,
  ApiError,
  UnknownRecord,
} from "@neurolink/client";

/**
 * React hook for executing NeuroLink workflows
 *
 * Provides methods for executing, resuming, and monitoring workflows
 * with automatic status polling and suspension handling.
 *
 * @example Basic usage
 * ```tsx
 * function WorkflowComponent() {
 *   const { execute, status, result, isLoading, error } = useWorkflow({
 *     workflowId: 'data-processing-workflow',
 *     onComplete: (result) => console.log('Workflow completed:', result),
 *     onStepComplete: (step) => console.log('Step completed:', step.stepId),
 *   });
 *
 *   return (
 *     <div>
 *       <button onClick={() => execute({ data: inputData })}>
 *         Run Workflow
 *       </button>
 *       {status && <p>Status: {status}</p>}
 *       {result?.output && <pre>{JSON.stringify(result.output, null, 2)}</pre>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useWorkflow(options: UseWorkflowOptions): UseWorkflowReturn {
  const {
    workflowId,
    onComplete,
    onError,
    onStepComplete,
    pollInterval = 2000,
  } = options;

  const client = useNeuroLinkClient();
  const [runId, setRunId] = useState<string | null>(null);
  const [status, setStatus] = useState<WorkflowExecuteResult["status"] | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<WorkflowExecuteResult | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousStepsRef = useRef<Set<string>>(new Set());

  /**
   * Stop polling
   */
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  /**
   * Poll for workflow status
   */
  const pollStatus = useCallback(
    async (currentRunId: string) => {
      try {
        const response = await client.getWorkflowStatus(
          workflowId,
          currentRunId,
        );
        const workflowResult = response.data;

        setStatus(workflowResult.status);
        setResult(workflowResult);

        // Check for newly completed steps
        if (workflowResult.steps && onStepComplete) {
          for (const step of workflowResult.steps) {
            if (
              step.status === "completed" &&
              !previousStepsRef.current.has(step.stepId)
            ) {
              previousStepsRef.current.add(step.stepId);
              onStepComplete(step);
            }
          }
        }

        // Handle completion
        if (workflowResult.status === "completed") {
          stopPolling();
          setIsLoading(false);
          onComplete?.(workflowResult);
        } else if (workflowResult.status === "failed") {
          stopPolling();
          setIsLoading(false);
          if (workflowResult.error) {
            setError(workflowResult.error);
            onError?.(workflowResult.error);
          }
        } else if (workflowResult.status === "suspended") {
          stopPolling();
          setIsLoading(false);
        }
      } catch (err) {
        stopPolling();
        setIsLoading(false);
        const apiError = err as ApiError;
        setError(apiError);
        onError?.(apiError);
      }
    },
    [client, workflowId, onComplete, onError, onStepComplete, stopPolling],
  );

  /**
   * Start polling for workflow status
   */
  const startPolling = useCallback(
    (currentRunId: string) => {
      stopPolling();
      pollIntervalRef.current = setInterval(
        () => pollStatus(currentRunId),
        pollInterval,
      );
    },
    [pollInterval, pollStatus, stopPolling],
  );

  /**
   * Execute workflow
   */
  const execute = useCallback(
    async (
      input: UnknownRecord,
      executeOptions?: Partial<WorkflowExecuteOptions>,
    ): Promise<WorkflowExecuteResult> => {
      setIsLoading(true);
      setError(null);
      setStatus(null);
      setResult(null);
      previousStepsRef.current.clear();

      try {
        const response = await client.executeWorkflow({
          workflowId,
          input,
          ...executeOptions,
        });

        const workflowResult = response.data;
        setRunId(workflowResult.runId);
        setStatus(workflowResult.status);
        setResult(workflowResult);

        // Start polling if workflow is running
        if (workflowResult.status === "running") {
          startPolling(workflowResult.runId);
        } else if (workflowResult.status === "completed") {
          setIsLoading(false);
          onComplete?.(workflowResult);
        } else if (workflowResult.status === "failed") {
          setIsLoading(false);
          if (workflowResult.error) {
            setError(workflowResult.error);
            onError?.(workflowResult.error);
          }
        }

        return workflowResult;
      } catch (err) {
        setIsLoading(false);
        const apiError = err as ApiError;
        setError(apiError);
        onError?.(apiError);
        throw err;
      }
    },
    [client, workflowId, onComplete, onError, startPolling],
  );

  /**
   * Resume suspended workflow
   */
  const resume = useCallback(
    async (
      resumeToken: string,
      resumeData?: UnknownRecord,
    ): Promise<WorkflowExecuteResult> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await client.resumeWorkflow(
          workflowId,
          resumeToken,
          resumeData,
        );

        const workflowResult = response.data;
        setRunId(workflowResult.runId);
        setStatus(workflowResult.status);
        setResult(workflowResult);

        // Start polling if workflow is running
        if (workflowResult.status === "running") {
          startPolling(workflowResult.runId);
        } else if (workflowResult.status === "completed") {
          setIsLoading(false);
          onComplete?.(workflowResult);
        }

        return workflowResult;
      } catch (err) {
        setIsLoading(false);
        const apiError = err as ApiError;
        setError(apiError);
        onError?.(apiError);
        throw err;
      }
    },
    [client, workflowId, onComplete, onError, startPolling],
  );

  /**
   * Get workflow status
   */
  const getStatus = useCallback(
    async (statusRunId: string): Promise<WorkflowExecuteResult> => {
      const response = await client.getWorkflowStatus(workflowId, statusRunId);
      return response.data;
    },
    [client, workflowId],
  );

  /**
   * Cancel workflow execution
   */
  const cancel = useCallback(
    async (cancelRunId: string): Promise<void> => {
      stopPolling();
      await client.cancelWorkflow(workflowId, cancelRunId);
      setStatus("failed");
      setIsLoading(false);
    },
    [client, workflowId, stopPolling],
  );

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    execute,
    resume,
    getStatus,
    cancel,
    runId,
    status,
    isLoading,
    result,
    error,
    clearError,
  };
}
````

### 5.4 Provider Component

````typescript
// packages/react/src/provider.tsx

import React, { createContext, useContext, useMemo } from 'react';
import { createClient, NeuroLinkClient, ClientConfig } from '@neurolink/client';

/**
 * Context for NeuroLink client
 */
const NeuroLinkContext = createContext<NeuroLinkClient | null>(null);

/**
 * Props for NeuroLinkProvider
 */
export type NeuroLinkProviderProps = {
  /** Client configuration */
  config: ClientConfig;
  /** Child components */
  children: React.ReactNode;
};

/**
 * Provider component for NeuroLink client
 *
 * Wraps your application to provide the NeuroLink client to all hooks.
 *
 * @example
 * ```tsx
 * import { NeuroLinkProvider } from '@neurolink/react';
 *
 * function App() {
 *   return (
 *     <NeuroLinkProvider
 *       config={{
 *         baseUrl: 'https://api.neurolink.example.com',
 *         apiKey: process.env.NEUROLINK_API_KEY,
 *       }}
 *     >
 *       <YourApp />
 *     </NeuroLinkProvider>
 *   );
 * }
 * ```
 */
export function NeuroLinkProvider({
  config,
  children,
}: NeuroLinkProviderProps): JSX.Element {
  const client = useMemo(() => createClient(config), [config]);

  return (
    <NeuroLinkContext.Provider value={client}>
      {children}
    </NeuroLinkContext.Provider>
  );
}

/**
 * Hook to access the NeuroLink client
 *
 * Must be used within a NeuroLinkProvider.
 *
 * @throws Error if used outside of NeuroLinkProvider
 */
export function useNeuroLinkClient(): NeuroLinkClient {
  const client = useContext(NeuroLinkContext);

  if (!client) {
    throw new Error(
      'useNeuroLinkClient must be used within a NeuroLinkProvider',
    );
  }

  return client;
}
````

---

## 6. AI SDK Integration

### 6.1 Vercel AI SDK Compatibility

````typescript
// packages/ai-sdk/src/provider.ts

import type {
  LanguageModelV1,
  LanguageModelV1StreamPart,
  LanguageModelV1CallOptions,
  LanguageModelV1FinishReason,
} from "@ai-sdk/provider";
import { createClient, NeuroLinkClient, ClientConfig } from "@neurolink/client";

/**
 * NeuroLink provider for Vercel AI SDK
 *
 * Implements the LanguageModelV1 interface for seamless integration
 * with Vercel AI SDK's useChat, useCompletion, and other hooks.
 *
 * @example With Vercel AI SDK useChat
 * ```tsx
 * import { useChat } from 'ai/react';
 * import { createNeuroLinkProvider } from '@neurolink/ai-sdk';
 *
 * const neurolink = createNeuroLinkProvider({
 *   baseUrl: 'https://api.neurolink.example.com',
 *   apiKey: 'your-api-key',
 * });
 *
 * function Chat() {
 *   const { messages, input, handleInputChange, handleSubmit } = useChat({
 *     api: '/api/chat',
 *     // Use NeuroLink as the provider
 *   });
 *
 *   // ... render chat UI
 * }
 * ```
 */
export class NeuroLinkProvider implements LanguageModelV1 {
  readonly specificationVersion = "v1" as const;
  readonly provider = "neurolink";
  readonly modelId: string;
  readonly defaultObjectGenerationMode = "json" as const;

  private client: NeuroLinkClient;
  private agentId?: string;

  constructor(
    config: ClientConfig & {
      modelId?: string;
      agentId?: string;
    },
  ) {
    this.client = createClient(config);
    this.modelId = config.modelId ?? "default";
    this.agentId = config.agentId;
  }

  /**
   * Generate text (non-streaming)
   */
  async doGenerate(options: LanguageModelV1CallOptions): Promise<{
    text?: string;
    toolCalls?: Array<{
      toolCallType: "function";
      toolCallId: string;
      toolName: string;
      args: string;
    }>;
    finishReason: LanguageModelV1FinishReason;
    usage: {
      promptTokens: number;
      completionTokens: number;
    };
    rawCall: {
      rawPrompt: unknown;
      rawSettings: Record<string, unknown>;
    };
  }> {
    const prompt = this.buildPrompt(options);

    const response = await this.client.generate({
      input: { text: prompt },
      provider: this.modelId.split(":")[0],
      model: this.modelId.split(":")[1],
      temperature: options.temperature,
      maxTokens: options.maxTokens,
    });

    const result = response.data;

    return {
      text: result.content,
      toolCalls: result.toolCalls?.map((tc) => ({
        toolCallType: "function" as const,
        toolCallId: tc.toolCallId,
        toolName: tc.toolName,
        args: JSON.stringify(tc.args),
      })),
      finishReason: "stop",
      usage: {
        promptTokens: result.usage?.promptTokens ?? 0,
        completionTokens: result.usage?.completionTokens ?? 0,
      },
      rawCall: {
        rawPrompt: prompt,
        rawSettings: {
          temperature: options.temperature,
          maxTokens: options.maxTokens,
        },
      },
    };
  }

  /**
   * Stream text generation
   */
  async doStream(options: LanguageModelV1CallOptions): Promise<{
    stream: ReadableStream<LanguageModelV1StreamPart>;
    rawCall: {
      rawPrompt: unknown;
      rawSettings: Record<string, unknown>;
    };
  }> {
    const prompt = this.buildPrompt(options);

    const stream = new ReadableStream<LanguageModelV1StreamPart>({
      start: async (controller) => {
        try {
          await this.client.stream(
            {
              input: { text: prompt },
              provider: this.modelId.split(":")[0],
              model: this.modelId.split(":")[1],
              temperature: options.temperature,
              maxTokens: options.maxTokens,
            },
            {
              onText: (text) => {
                controller.enqueue({
                  type: "text-delta",
                  textDelta: text,
                });
              },
              onToolCall: (toolCall) => {
                controller.enqueue({
                  type: "tool-call",
                  toolCallType: "function",
                  toolCallId: toolCall.toolCallId ?? toolCall.id ?? "",
                  toolName: toolCall.toolName,
                  args: JSON.stringify(
                    toolCall.args ?? toolCall.parameters ?? {},
                  ),
                });
              },
              onDone: (result) => {
                controller.enqueue({
                  type: "finish",
                  finishReason: "stop",
                  usage: {
                    promptTokens: result?.usage?.promptTokens ?? 0,
                    completionTokens: result?.usage?.completionTokens ?? 0,
                  },
                });
                controller.close();
              },
              onError: (error) => {
                controller.enqueue({
                  type: "error",
                  error: new Error(error.message),
                });
                controller.close();
              },
            },
          );
        } catch (error) {
          controller.enqueue({
            type: "error",
            error: error as Error,
          });
          controller.close();
        }
      },
    });

    return {
      stream,
      rawCall: {
        rawPrompt: prompt,
        rawSettings: {
          temperature: options.temperature,
          maxTokens: options.maxTokens,
        },
      },
    };
  }

  /**
   * Build prompt from options
   */
  private buildPrompt(options: LanguageModelV1CallOptions): string {
    const { prompt } = options;

    if (typeof prompt === "string") {
      return prompt;
    }

    // Handle message array format
    return prompt
      .map((message) => {
        if (typeof message.content === "string") {
          return `${message.role}: ${message.content}`;
        }
        // Handle content parts
        return `${message.role}: ${message.content
          .filter(
            (part): part is { type: "text"; text: string } =>
              part.type === "text",
          )
          .map((part) => part.text)
          .join("\n")}`;
      })
      .join("\n\n");
  }
}

/**
 * Create a NeuroLink provider for Vercel AI SDK
 */
export function createNeuroLinkProvider(
  config: ClientConfig & {
    modelId?: string;
    agentId?: string;
  },
): NeuroLinkProvider {
  return new NeuroLinkProvider(config);
}

/**
 * Create a NeuroLink model instance
 *
 * Convenience function for creating provider instances with specific models.
 *
 * @example
 * ```typescript
 * import { neurolink } from '@neurolink/ai-sdk';
 * import { generateText } from 'ai';
 *
 * const result = await generateText({
 *   model: neurolink('openai:gpt-4o'),
 *   prompt: 'Hello, world!',
 * });
 * ```
 */
export function neurolink(
  modelId: string,
  config?: Omit<ClientConfig, "baseUrl"> & { baseUrl?: string },
): NeuroLinkProvider {
  return new NeuroLinkProvider({
    baseUrl:
      config?.baseUrl ??
      process.env.NEUROLINK_API_URL ??
      "http://localhost:3000",
    apiKey: config?.apiKey ?? process.env.NEUROLINK_API_KEY,
    modelId,
    ...config,
  });
}
````

---

## 7. Client Features

### 7.1 Authentication Handling

````typescript
// packages/client/src/auth.ts

import type { Middleware, MiddlewareRequest } from "./types.js";

/**
 * Authentication configuration options
 */
export type AuthConfig = {
  /** API key for X-API-Key header */
  apiKey?: string;
  /** Bearer token for Authorization header */
  token?: string;
  /** Custom authentication function */
  getToken?: () => Promise<string>;
  /** Token refresh function */
  refreshToken?: () => Promise<string>;
  /** Token storage key */
  storageKey?: string;
};

/**
 * Create authentication middleware
 *
 * Supports multiple authentication methods:
 * - API Key (X-API-Key header)
 * - Bearer Token (Authorization header)
 * - Custom token function (async)
 * - Token refresh on 401 responses
 *
 * @example API Key authentication
 * ```typescript
 * const authMiddleware = createAuthMiddleware({
 *   apiKey: 'your-api-key',
 * });
 * ```
 *
 * @example Dynamic token with refresh
 * ```typescript
 * const authMiddleware = createAuthMiddleware({
 *   getToken: async () => localStorage.getItem('token'),
 *   refreshToken: async () => {
 *     const newToken = await refreshAuthToken();
 *     localStorage.setItem('token', newToken);
 *     return newToken;
 *   },
 * });
 * ```
 */
export function createAuthMiddleware(config: AuthConfig): Middleware {
  let currentToken: string | undefined = config.token;

  return async (request, next) => {
    // Add API key if provided
    if (config.apiKey) {
      request.headers["X-API-Key"] = config.apiKey;
    }

    // Get token (static or dynamic)
    if (config.getToken) {
      currentToken = await config.getToken();
    }

    // Add bearer token if available
    if (currentToken) {
      request.headers["Authorization"] = `Bearer ${currentToken}`;
    }

    try {
      const response = await next();

      // Handle 401 with token refresh
      if (response.status === 401 && config.refreshToken) {
        try {
          currentToken = await config.refreshToken();
          request.headers["Authorization"] = `Bearer ${currentToken}`;
          return next();
        } catch {
          // Refresh failed, return original 401
          return response;
        }
      }

      return response;
    } catch (error) {
      throw error;
    }
  };
}

/**
 * OAuth2 token manager for client credentials flow
 */
export class OAuth2TokenManager {
  private token: string | null = null;
  private tokenExpiry: number | null = null;
  private refreshPromise: Promise<string> | null = null;

  constructor(
    private readonly config: {
      tokenUrl: string;
      clientId: string;
      clientSecret: string;
      scope?: string;
    },
  ) {}

  /**
   * Get a valid access token
   */
  async getToken(): Promise<string> {
    // Return cached token if still valid
    if (
      this.token &&
      this.tokenExpiry &&
      Date.now() < this.tokenExpiry - 60000
    ) {
      return this.token;
    }

    // Avoid concurrent token requests
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.fetchToken();

    try {
      const token = await this.refreshPromise;
      return token;
    } finally {
      this.refreshPromise = null;
    }
  }

  /**
   * Fetch a new token from the OAuth2 server
   */
  private async fetchToken(): Promise<string> {
    const params = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
    });

    if (this.config.scope) {
      params.set("scope", this.config.scope);
    }

    const response = await fetch(this.config.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error(`OAuth2 token request failed: ${response.status}`);
    }

    const data = await response.json();
    this.token = data.access_token;
    this.tokenExpiry = Date.now() + data.expires_in * 1000;

    return this.token;
  }

  /**
   * Clear cached token
   */
  clearToken(): void {
    this.token = null;
    this.tokenExpiry = null;
  }
}
````

### 7.2 Error Handling

```typescript
// packages/client/src/errors.ts

import type { ApiError, JsonObject } from "./types.js";

/**
 * Error codes for NeuroLink API errors
 */
export enum ErrorCode {
  // Authentication errors
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  INVALID_API_KEY = "INVALID_API_KEY",
  TOKEN_EXPIRED = "TOKEN_EXPIRED",

  // Request errors
  BAD_REQUEST = "BAD_REQUEST",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  NOT_FOUND = "NOT_FOUND",
  CONFLICT = "CONFLICT",

  // Rate limiting
  RATE_LIMITED = "RATE_LIMITED",
  QUOTA_EXCEEDED = "QUOTA_EXCEEDED",

  // Server errors
  INTERNAL_ERROR = "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
  GATEWAY_TIMEOUT = "GATEWAY_TIMEOUT",

  // Provider errors
  PROVIDER_ERROR = "PROVIDER_ERROR",
  MODEL_NOT_AVAILABLE = "MODEL_NOT_AVAILABLE",
  CONTEXT_LENGTH_EXCEEDED = "CONTEXT_LENGTH_EXCEEDED",

  // Client errors
  NETWORK_ERROR = "NETWORK_ERROR",
  TIMEOUT = "TIMEOUT",
  ABORTED = "ABORTED",

  // Unknown
  UNKNOWN = "UNKNOWN",
}

/**
 * Base error class for NeuroLink client errors
 */
export class NeuroLinkError extends Error {
  readonly code: ErrorCode;
  readonly status?: number;
  readonly details?: JsonObject;
  readonly retryable: boolean;
  readonly requestId?: string;

  constructor(
    message: string,
    code: ErrorCode,
    options?: {
      status?: number;
      details?: JsonObject;
      retryable?: boolean;
      requestId?: string;
      cause?: Error;
    },
  ) {
    super(message);
    this.name = "NeuroLinkError";
    this.code = code;
    this.status = options?.status;
    this.details = options?.details;
    this.retryable = options?.retryable ?? false;
    this.requestId = options?.requestId;

    if (options?.cause) {
      this.cause = options.cause;
    }
  }

  /**
   * Check if error is of a specific type
   */
  is(code: ErrorCode): boolean {
    return this.code === code;
  }

  /**
   * Convert to API error format
   */
  toApiError(): ApiError {
    return {
      code: this.code,
      message: this.message,
      status: this.status ?? 500,
      details: this.details,
      retryable: this.retryable,
      requestId: this.requestId,
    };
  }
}

/**
 * Create error from API response
 */
export function createErrorFromResponse(
  response: Response,
  body?: unknown,
): NeuroLinkError {
  const status = response.status;
  const apiError = body as Partial<ApiError>;

  let code: ErrorCode;
  let retryable = false;

  switch (status) {
    case 400:
      code = ErrorCode.BAD_REQUEST;
      break;
    case 401:
      code = ErrorCode.UNAUTHORIZED;
      break;
    case 403:
      code = ErrorCode.FORBIDDEN;
      break;
    case 404:
      code = ErrorCode.NOT_FOUND;
      break;
    case 409:
      code = ErrorCode.CONFLICT;
      break;
    case 429:
      code = ErrorCode.RATE_LIMITED;
      retryable = true;
      break;
    case 500:
      code = ErrorCode.INTERNAL_ERROR;
      retryable = true;
      break;
    case 502:
    case 503:
      code = ErrorCode.SERVICE_UNAVAILABLE;
      retryable = true;
      break;
    case 504:
      code = ErrorCode.GATEWAY_TIMEOUT;
      retryable = true;
      break;
    default:
      code = ErrorCode.UNKNOWN;
  }

  return new NeuroLinkError(apiError?.message ?? `HTTP ${status}`, code, {
    status,
    details: apiError?.details,
    retryable,
    requestId: apiError?.requestId,
  });
}

/**
 * Create error from network failure
 */
export function createNetworkError(error: Error): NeuroLinkError {
  if (error.name === "AbortError") {
    return new NeuroLinkError("Request was aborted", ErrorCode.ABORTED, {
      cause: error,
    });
  }

  if (error.name === "TimeoutError" || error.message.includes("timeout")) {
    return new NeuroLinkError("Request timed out", ErrorCode.TIMEOUT, {
      retryable: true,
      cause: error,
    });
  }

  return new NeuroLinkError(
    error.message || "Network error",
    ErrorCode.NETWORK_ERROR,
    { retryable: true, cause: error },
  );
}

/**
 * Type guard for NeuroLinkError
 */
export function isNeuroLinkError(error: unknown): error is NeuroLinkError {
  return error instanceof NeuroLinkError;
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (isNeuroLinkError(error)) {
    return error.retryable;
  }

  // Network errors are generally retryable
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return true;
  }

  return false;
}
```

### 7.3 Request/Response Interceptors

```typescript
// packages/client/src/interceptors.ts

import type {
  Middleware,
  MiddlewareRequest,
  MiddlewareResponse,
} from "./types.js";

/**
 * Request interceptor function type
 */
export type RequestInterceptor = (
  request: MiddlewareRequest,
) => MiddlewareRequest | Promise<MiddlewareRequest>;

/**
 * Response interceptor function type
 */
export type ResponseInterceptor = (
  response: MiddlewareResponse,
  request: MiddlewareRequest,
) => MiddlewareResponse | Promise<MiddlewareResponse>;

/**
 * Error interceptor function type
 */
export type ErrorInterceptor = (
  error: Error,
  request: MiddlewareRequest,
) => Error | Promise<Error>;

/**
 * Interceptor manager for managing request/response interceptors
 */
export class InterceptorManager {
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private errorInterceptors: ErrorInterceptor[] = [];

  /**
   * Add a request interceptor
   */
  addRequestInterceptor(interceptor: RequestInterceptor): () => void {
    this.requestInterceptors.push(interceptor);
    return () => {
      const index = this.requestInterceptors.indexOf(interceptor);
      if (index !== -1) {
        this.requestInterceptors.splice(index, 1);
      }
    };
  }

  /**
   * Add a response interceptor
   */
  addResponseInterceptor(interceptor: ResponseInterceptor): () => void {
    this.responseInterceptors.push(interceptor);
    return () => {
      const index = this.responseInterceptors.indexOf(interceptor);
      if (index !== -1) {
        this.responseInterceptors.splice(index, 1);
      }
    };
  }

  /**
   * Add an error interceptor
   */
  addErrorInterceptor(interceptor: ErrorInterceptor): () => void {
    this.errorInterceptors.push(interceptor);
    return () => {
      const index = this.errorInterceptors.indexOf(interceptor);
      if (index !== -1) {
        this.errorInterceptors.splice(index, 1);
      }
    };
  }

  /**
   * Create middleware from interceptors
   */
  createMiddleware(): Middleware {
    return async (request, next) => {
      // Run request interceptors
      let modifiedRequest = request;
      for (const interceptor of this.requestInterceptors) {
        modifiedRequest = await interceptor(modifiedRequest);
      }

      try {
        let response = await next();

        // Run response interceptors
        for (const interceptor of this.responseInterceptors) {
          response = await interceptor(response, modifiedRequest);
        }

        return response;
      } catch (error) {
        // Run error interceptors
        let modifiedError = error as Error;
        for (const interceptor of this.errorInterceptors) {
          modifiedError = await interceptor(modifiedError, modifiedRequest);
        }
        throw modifiedError;
      }
    };
  }
}

/**
 * Create a logging interceptor for debugging
 */
export function createLoggingInterceptor(options?: {
  logRequest?: boolean;
  logResponse?: boolean;
  logErrors?: boolean;
  logger?: typeof console;
}): {
  requestInterceptor: RequestInterceptor;
  responseInterceptor: ResponseInterceptor;
  errorInterceptor: ErrorInterceptor;
} {
  const {
    logRequest = true,
    logResponse = true,
    logErrors = true,
    logger = console,
  } = options ?? {};

  return {
    requestInterceptor: (request) => {
      if (logRequest) {
        logger.log(`[NeuroLink Request] ${request.method} ${request.url}`, {
          headers: request.headers,
          body: request.body,
        });
      }
      return request;
    },
    responseInterceptor: (response, request) => {
      if (logResponse) {
        logger.log(
          `[NeuroLink Response] ${request.method} ${request.url} - ${response.status}`,
          {
            headers: response.headers,
            body: response.body,
            duration: Date.now() - request.context.startTime,
          },
        );
      }
      return response;
    },
    errorInterceptor: (error, request) => {
      if (logErrors) {
        logger.error(`[NeuroLink Error] ${request.method} ${request.url}`, {
          error: error.message,
          stack: error.stack,
        });
      }
      return error;
    },
  };
}

/**
 * Create a header injection interceptor
 */
export function createHeaderInterceptor(
  headers: Record<string, string | (() => string | Promise<string>)>,
): RequestInterceptor {
  return async (request) => {
    for (const [key, value] of Object.entries(headers)) {
      if (typeof value === "function") {
        request.headers[key] = await value();
      } else {
        request.headers[key] = value;
      }
    }
    return request;
  };
}

/**
 * Create a request transformation interceptor
 */
export function createTransformInterceptor<T, U>(
  transformRequest?: (body: T) => U,
  transformResponse?: (body: unknown) => unknown,
): {
  requestInterceptor?: RequestInterceptor;
  responseInterceptor?: ResponseInterceptor;
} {
  return {
    requestInterceptor: transformRequest
      ? (request) => ({
          ...request,
          body: transformRequest(request.body as T),
        })
      : undefined,
    responseInterceptor: transformResponse
      ? (response, request) => ({
          ...response,
          body: transformResponse(response.body),
        })
      : undefined,
  };
}
```

---

## 8. Package Structure

### 8.1 Monorepo Structure

```
packages/
  client/                          # @neurolink/client
    src/
      index.ts                     # Main exports
      client.ts                    # HTTP client implementation
      types.ts                     # Type definitions
      auth.ts                      # Authentication utilities
      errors.ts                    # Error handling
      interceptors.ts              # Request/response interceptors
      streaming.ts                 # Streaming utilities
    package.json
    tsconfig.json
    README.md

  react/                           # @neurolink/react
    src/
      index.ts                     # Main exports
      provider.tsx                 # NeuroLinkProvider component
      hooks/
        index.ts                   # Hook exports
        useChat.ts                 # Chat hook
        useAgent.ts                # Agent hook
        useWorkflow.ts             # Workflow hook
        useTools.ts                # Tools hook
        useStream.ts               # Streaming hook
        useNeuroLinkClient.ts      # Client access hook
      types.ts                     # React-specific types
    package.json
    tsconfig.json
    README.md

  ai-sdk/                          # @neurolink/ai-sdk
    src/
      index.ts                     # Main exports
      provider.ts                  # Vercel AI SDK provider
      types.ts                     # AI SDK types
    package.json
    tsconfig.json
    README.md
```

### 8.2 Package Dependencies

```json
// packages/client/package.json
{
  "name": "@neurolink/client",
  "version": "1.0.0",
  "description": "JavaScript/TypeScript client for NeuroLink API",
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsup src/index.ts --format cjs,esm --dts",
    "dev": "tsup src/index.ts --format cjs,esm --dts --watch",
    "test": "vitest run",
    "lint": "eslint src/",
    "typecheck": "tsc --noEmit"
  },
  "peerDependencies": {},
  "devDependencies": {
    "@types/node": "^20.0.0",
    "tsup": "^8.0.0",
    "typescript": "^5.3.0",
    "vitest": "^1.0.0"
  }
}
```

```json
// packages/react/package.json
{
  "name": "@neurolink/react",
  "version": "1.0.0",
  "description": "React hooks for NeuroLink",
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsup src/index.ts --format cjs,esm --dts --external react",
    "dev": "tsup src/index.ts --format cjs,esm --dts --watch --external react",
    "test": "vitest run",
    "lint": "eslint src/",
    "typecheck": "tsc --noEmit"
  },
  "peerDependencies": {
    "react": "^18.0.0"
  },
  "dependencies": {
    "@neurolink/client": "workspace:*"
  },
  "devDependencies": {
    "@testing-library/react": "^14.0.0",
    "@types/react": "^18.0.0",
    "react": "^18.0.0",
    "tsup": "^8.0.0",
    "typescript": "^5.3.0",
    "vitest": "^1.0.0"
  }
}
```

```json
// packages/ai-sdk/package.json
{
  "name": "@neurolink/ai-sdk",
  "version": "1.0.0",
  "description": "Vercel AI SDK provider for NeuroLink",
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsup src/index.ts --format cjs,esm --dts",
    "dev": "tsup src/index.ts --format cjs,esm --dts --watch",
    "test": "vitest run",
    "lint": "eslint src/",
    "typecheck": "tsc --noEmit"
  },
  "peerDependencies": {
    "ai": "^3.0.0"
  },
  "dependencies": {
    "@neurolink/client": "workspace:*"
  },
  "devDependencies": {
    "@ai-sdk/provider": "^0.0.1",
    "ai": "^3.0.0",
    "tsup": "^8.0.0",
    "typescript": "^5.3.0",
    "vitest": "^1.0.0"
  }
}
```

---

## 9. Implementation Plan

### Phase 1: Core Client (Week 1-2)

| Task              | Description                           | Priority |
| ----------------- | ------------------------------------- | -------- |
| HTTP Client       | Implement base HTTP client with fetch | High     |
| Type Definitions  | Create comprehensive TypeScript types | High     |
| Authentication    | API key and token authentication      | High     |
| Error Handling    | Error classification and handling     | High     |
| Retry Logic       | Exponential backoff with jitter       | Medium   |
| Middleware System | Request/response interceptors         | Medium   |

### Phase 2: API Endpoints (Week 2-3)

| Task         | Description                  | Priority |
| ------------ | ---------------------------- | -------- |
| Generate API | Text generation endpoint     | High     |
| Stream API   | SSE streaming support        | High     |
| Agent API    | Agent execution endpoints    | High     |
| Workflow API | Workflow execution endpoints | Medium   |
| Tools API    | Tool listing and execution   | Medium   |
| Provider API | Provider status endpoints    | Low      |

### Phase 3: React Client (Week 3-4)

| Task               | Description               | Priority |
| ------------------ | ------------------------- | -------- |
| Provider Component | NeuroLinkProvider context | High     |
| useChat Hook       | Chat interface hook       | High     |
| useAgent Hook      | Agent execution hook      | High     |
| useWorkflow Hook   | Workflow execution hook   | Medium   |
| useTools Hook      | Tool management hook      | Medium   |
| useStream Hook     | Generic streaming hook    | Medium   |

### Phase 4: AI SDK Integration (Week 4-5)

| Task               | Description                   | Priority |
| ------------------ | ----------------------------- | -------- |
| LanguageModelV1    | Implement provider interface  | High     |
| Streaming Protocol | AI SDK streaming support      | High     |
| Tool Calling       | Function calling support      | Medium   |
| Structured Output  | JSON schema support           | Medium   |
| Testing            | Integration tests with AI SDK | Medium   |

### Phase 5: Documentation and Testing (Week 5-6)

| Task              | Description                        | Priority |
| ----------------- | ---------------------------------- | -------- |
| API Documentation | JSDoc for all exports              | High     |
| Usage Examples    | Code examples for common use cases | High     |
| Unit Tests        | Test coverage for all modules      | High     |
| Integration Tests | End-to-end testing                 | Medium   |
| Migration Guide   | Upgrade guide from existing SDKs   | Medium   |

---

## 10. Code Examples

### 10.1 Basic Client Usage

```typescript
import { createClient } from "@neurolink/client";

// Create client
const client = createClient({
  baseUrl: "https://api.neurolink.example.com",
  apiKey: process.env.NEUROLINK_API_KEY,
  timeout: 30000,
  retry: {
    maxAttempts: 3,
    initialDelayMs: 1000,
  },
});

// Generate text
const result = await client.generate({
  input: { text: "Explain quantum computing in simple terms" },
  provider: "openai",
  model: "gpt-4o",
  temperature: 0.7,
});

console.log(result.data.content);
```

### 10.2 Streaming with Callbacks

```typescript
import { createClient } from "@neurolink/client";

const client = createClient({
  baseUrl: "https://api.neurolink.example.com",
  apiKey: process.env.NEUROLINK_API_KEY,
});

// Stream with callbacks
await client.stream(
  {
    input: { text: "Write a short story about a robot" },
    provider: "anthropic",
    model: "claude-3-5-sonnet",
  },
  {
    onText: (text) => {
      process.stdout.write(text);
    },
    onToolCall: (toolCall) => {
      console.log("\nTool called:", toolCall.toolName);
    },
    onDone: (result) => {
      console.log("\nStream completed");
      console.log("Tokens used:", result?.usage?.totalTokens);
    },
    onError: (error) => {
      console.error("Stream error:", error.message);
    },
  },
);
```

### 10.3 React Chat Component

```tsx
import { useChat } from "@neurolink/react";

function ChatComponent() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } =
    useChat({
      api: "/api/chat",
      agentId: "customer-support-agent",
      onFinish: (message) => {
        console.log("Response received:", message.content);
      },
    });

  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map((message) => (
          <div key={message.id} className={`message ${message.role}`}>
            <div className="content">{message.content}</div>
            {message.toolCalls?.map((tc) => (
              <div key={tc.toolCallId} className="tool-call">
                Called: {tc.toolName}
              </div>
            ))}
          </div>
        ))}
        {isLoading && <div className="loading">Thinking...</div>}
      </div>

      {error && <div className="error">Error: {error.message}</div>}

      <form onSubmit={handleSubmit} className="input-form">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Type a message..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
```

### 10.4 Workflow Execution

```tsx
import { useWorkflow } from "@neurolink/react";

function DataProcessingWorkflow() {
  const { execute, status, result, isLoading, error } = useWorkflow({
    workflowId: "data-processing-pipeline",
    onComplete: (result) => {
      console.log("Workflow completed:", result.output);
    },
    onStepComplete: (step) => {
      console.log(`Step ${step.stepId} completed`);
    },
  });

  const handleProcess = async () => {
    await execute({
      data: { source: "uploaded-file.csv" },
      options: { parallel: true },
    });
  };

  return (
    <div className="workflow-panel">
      <button onClick={handleProcess} disabled={isLoading}>
        {isLoading ? "Processing..." : "Start Processing"}
      </button>

      {status && <p>Status: {status}</p>}

      {result?.steps && (
        <ul>
          {result.steps.map((step) => (
            <li key={step.stepId}>
              {step.stepId}: {step.status}
            </li>
          ))}
        </ul>
      )}

      {error && <p className="error">{error.message}</p>}
    </div>
  );
}
```

### 10.5 Vercel AI SDK Integration

```tsx
import { useChat } from "ai/react";
import { neurolink } from "@neurolink/ai-sdk";

// In your API route (app/api/chat/route.ts)
import { streamText } from "ai";

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = await streamText({
    model: neurolink("openai:gpt-4o"),
    messages,
  });

  return result.toAIStreamResponse();
}

// In your React component
function ChatWithAISDK() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: "/api/chat",
  });

  return (
    <div>
      {messages.map((m) => (
        <div key={m.id}>
          {m.role}: {m.content}
        </div>
      ))}
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}
```

### 10.6 Custom Middleware

```typescript
import { createClient, Middleware } from "@neurolink/client";

// Custom analytics middleware
const analyticsMiddleware: Middleware = async (request, next) => {
  const startTime = Date.now();

  try {
    const response = await next();

    // Track successful request
    analytics.track("api_request", {
      endpoint: request.url,
      method: request.method,
      status: response.status,
      duration: Date.now() - startTime,
    });

    return response;
  } catch (error) {
    // Track failed request
    analytics.track("api_error", {
      endpoint: request.url,
      method: request.method,
      error: (error as Error).message,
      duration: Date.now() - startTime,
    });

    throw error;
  }
};

// Create client with custom middleware
const client = createClient({
  baseUrl: "https://api.neurolink.example.com",
  apiKey: process.env.NEUROLINK_API_KEY,
});

client.use(analyticsMiddleware);
```

---

## Summary

This implementation guide provides a comprehensive framework for building Mastra-style client SDKs for NeuroLink, including:

1. **JavaScript/TypeScript Client** (`@neurolink/client`)
   - Type-safe HTTP client with middleware support
   - Authentication handling (API key, Bearer token, OAuth2)
   - Retry logic with exponential backoff
   - Request/response interceptors
   - Full API coverage (generate, stream, agents, workflows, tools)

2. **React Client** (`@neurolink/react`)
   - `useChat` hook for chat interfaces
   - `useAgent` hook for agent execution
   - `useWorkflow` hook for workflow management
   - `useTools` hook for tool discovery and execution
   - `NeuroLinkProvider` for client context

3. **AI SDK Integration** (`@neurolink/ai-sdk`)
   - Vercel AI SDK LanguageModelV1 provider
   - Streaming protocol support
   - Drop-in compatibility with useChat, useCompletion

The implementation follows NeuroLink's established patterns (factory, registry, typed events) while providing a modern, type-safe developer experience for both server and client applications.
