/**
 * HTTP/WebSocket Client Library
 *
 * Core client for accessing the NeuroLink API with built-in authentication,
 * retry logic, and middleware support. Supports both browser and Node.js environments.
 *
 * @module @neurolink/client
 */

import type {
  ClientConfig,
  ClientRequestOptions,
  ClientApiResponse,
  ClientApiError,
  ClientRetryConfig,
  ClientMiddleware,
  ClientMiddlewareRequest,
  ClientMiddlewareResponse,
  ClientMiddlewareContext,
  ClientStreamCallbacks,
  ClientStreamEvent,
  ClientStreamResult,
  ClientGenerateRequestOptions,
  ClientGenerateResponse,
  ClientStreamRequestOptions,
  ClientAgentExecuteOptions,
  ClientAgentExecuteResult,
  ClientAgentInfo,
  ClientWorkflowExecuteOptions,
  ClientWorkflowExecuteResult,
  ClientWorkflowInfo,
  ClientToolInfo,
  ClientProviderStatus,
  ClientWebSocketOptions,
  ClientWebSocketState,
  ClientWebSocketMessageHandler,
  ErrorCodeType,
  UnknownRecord,
} from "../types/index.js";
import { HttpError, ClientNetworkError, ClientTimeoutError } from "./errors.js";
import { logger } from "../utils/logger.js";

// =============================================================================
// Shared Utilities
// =============================================================================

/**
 * Combine multiple AbortSignals into a single signal.
 * Aborts as soon as any input signal is aborted.
 */
export function combineSignals(...signals: AbortSignal[]): AbortSignal {
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

/**
 * Promise-based delay utility.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Default request timeout in milliseconds (30 seconds)
 */
const DEFAULT_TIMEOUT = 30_000;

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: ClientRetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  retryOnNetworkError: true,
};

// Re-export error classes so existing consumers importing from httpClient still work
export {
  HttpError as NeuroLinkApiError,
  ClientNetworkError,
  ClientTimeoutError,
};

// =============================================================================
// HTTP Client Class
// =============================================================================

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
 *
 * @example With middleware
 * ```typescript
 * const client = createClient({ baseUrl: 'https://api.example.com' });
 *
 * client.use(async (request, next) => {
 *   console.log('Request:', request.url);
 *   const response = await next();
 *   console.log('Response:', response.status);
 *   return response;
 * });
 * ```
 */
export class NeuroLinkClient {
  private config: Required<ClientConfig>;
  private middlewares: ClientMiddleware[] = [];
  private wsConnection: WebSocket | null = null;
  private wsState: ClientWebSocketState = "disconnected";
  private wsMessageHandlers: Map<string, Set<ClientWebSocketMessageHandler>> =
    new Map();

  constructor(config: ClientConfig) {
    // Validate required config
    if (!config.baseUrl) {
      throw new Error("baseUrl is required in client configuration");
    }

    this.config = {
      baseUrl: config.baseUrl.replace(/\/$/, ""),
      apiKey: config.apiKey ?? "",
      token: config.token ?? "",
      timeout: config.timeout ?? DEFAULT_TIMEOUT,
      headers: config.headers ?? {},
      retry: { ...DEFAULT_RETRY_CONFIG, ...config.retry },
      debug: config.debug ?? false,
      fetch: config.fetch ?? this.getDefaultFetch(),
      wsUrl:
        config.wsUrl ??
        config.baseUrl.replace(/^http/, "ws").replace(/\/$/, ""),
    };
  }

  /**
   * Get default fetch implementation
   */
  private getDefaultFetch(): typeof fetch {
    if (typeof globalThis.fetch === "function") {
      return globalThis.fetch.bind(globalThis);
    }
    throw new Error(
      "No fetch implementation available. Please provide a custom fetch function in the client configuration.",
    );
  }

  // ===========================================================================
  // ClientMiddleware Methods
  // ===========================================================================

  /**
   * Add middleware to the client
   *
   * @param middleware - ClientMiddleware function
   * @returns Client instance for chaining
   */
  use(middleware: ClientMiddleware): this {
    this.middlewares.push(middleware);
    return this;
  }

  /**
   * Clear all middleware
   */
  clearMiddleware(): this {
    this.middlewares = [];
    return this;
  }

  // ===========================================================================
  // Internal Request Methods
  // ===========================================================================

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Calculate delay for exponential backoff
   */
  private calculateDelay(attempt: number, config: ClientRetryConfig): number {
    const delay =
      config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt);
    const jitter = Math.random() * 0.1 * delay;
    return Math.min(delay + jitter, config.maxDelayMs);
  }

  /**
   * Delay utility — delegates to shared sleep()
   */
  private delay(ms: number): Promise<void> {
    return sleep(ms);
  }

  /**
   * Combine multiple abort signals — delegates to shared combineSignals()
   */
  private combineSignals(...signals: AbortSignal[]): AbortSignal {
    return combineSignals(...signals);
  }

  /**
   * Debug logging via the unified NeuroLink logger.
   * Guarded by `logger.shouldLog("debug")` so expensive serialization is
   * skipped when debug output is disabled.
   */
  private log(message: string, data?: unknown): void {
    if (logger.shouldLog("debug")) {
      logger.debug(`[HttpClient] ${message}`, data);
    }
  }

  /**
   * Execute HTTP request with middleware and retry logic
   */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options?: ClientRequestOptions,
  ): Promise<ClientApiResponse<T>> {
    const url = `${this.config.baseUrl}${path}`;
    const requestId = this.generateRequestId();
    const { retry } = this.config;
    const skipRetry = options?.skipRetry ?? false;

    const context: ClientMiddlewareContext = {
      startTime: Date.now(),
      requestId,
      retryCount: 0,
    };

    const middlewareRequest: ClientMiddlewareRequest = {
      url,
      method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Request-ID": requestId,
        ...(this.config.apiKey ? { "X-API-Key": this.config.apiKey } : {}),
        ...(this.config.token
          ? { Authorization: `Bearer ${this.config.token}` }
          : {}),
        ...this.config.headers,
        ...options?.headers,
      },
      body,
      context,
    };

    /**
     * Execute the actual HTTP request
     */
    const executeRequest = async (): Promise<ClientMiddlewareResponse> => {
      const controller = new AbortController();
      const timeoutMs = options?.timeout ?? this.config.timeout;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const signal = options?.signal
          ? this.combineSignals(options.signal, controller.signal)
          : controller.signal;

        this.log(`${method} ${url}`);

        const response = await this.config.fetch(url, {
          method,
          headers: middlewareRequest.headers,
          body: body ? JSON.stringify(body) : undefined,
          signal,
        });

        clearTimeout(timeoutId);

        let responseBody: unknown;
        const contentType = response.headers.get("content-type") ?? "";

        if (contentType.includes("application/json")) {
          responseBody = await response.json();
        } else {
          responseBody = await response.text();
        }

        const headers: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          headers[key] = value;
        });

        this.log(`Response ${response.status}`, {
          duration: Date.now() - context.startTime,
        });

        return {
          status: response.status,
          headers,
          body: responseBody,
          context,
        };
      } catch (error) {
        clearTimeout(timeoutId);

        if ((error as Error).name === "AbortError") {
          throw new ClientTimeoutError(timeoutMs);
        }

        throw new ClientNetworkError(
          `Network request failed: ${(error as Error).message}`,
          { cause: error as Error },
        );
      }
    };

    /**
     * Execute request with retry logic
     */
    const executeWithRetry = async (): Promise<ClientMiddlewareResponse> => {
      let lastError: Error | undefined;

      for (let attempt = 0; attempt < retry.maxAttempts; attempt++) {
        try {
          const response = await executeRequest();

          // Check if response status is retryable
          if (
            !skipRetry &&
            retry.retryableStatusCodes?.includes(response.status)
          ) {
            if (attempt < retry.maxAttempts - 1) {
              const delayMs = this.calculateDelay(attempt, retry);
              this.log(`Retrying after ${delayMs}ms (attempt ${attempt + 1})`);
              await this.delay(delayMs);
              context.retryCount = attempt + 1;
              continue;
            }
          }

          return response;
        } catch (error) {
          lastError = error as Error;

          // Check if network error and should retry
          if (
            !skipRetry &&
            retry.retryOnNetworkError &&
            error instanceof ClientNetworkError &&
            attempt < retry.maxAttempts - 1
          ) {
            const delayMs = this.calculateDelay(attempt, retry);
            this.log(`Retrying after network error (attempt ${attempt + 1})`);
            await this.delay(delayMs);
            context.retryCount = attempt + 1;
            continue;
          }

          throw error;
        }
      }

      throw lastError ?? new Error("Max retries exceeded");
    };

    // Execute with middleware chain
    let index = 0;
    const next = async (): Promise<ClientMiddlewareResponse> => {
      if (index < this.middlewares.length) {
        const middleware = this.middlewares[index++];
        return middleware(middlewareRequest, next);
      }
      return executeWithRetry();
    };

    const response = await next();

    // Check for error responses
    if (response.status >= 400) {
      // Server may wrap errors as { error: { code, message }, metadata: {...} }
      const rawBody = response.body as Record<string, unknown>;
      const errorPayload =
        rawBody && typeof rawBody === "object" && "error" in rawBody
          ? (rawBody.error as ClientApiError)
          : (rawBody as ClientApiError);
      throw new HttpError(
        errorPayload?.message ?? `HTTP ${response.status}`,
        response.status,
        {
          code: errorPayload?.code as ErrorCodeType | undefined,
          details: errorPayload?.details,
          requestId,
        },
      );
    }

    // Unwrap server response envelope if present
    // The NeuroLink server wraps responses as { data: <payload>, metadata: {...} }
    const responseBody = response.body as Record<string, unknown>;
    const unwrapped =
      responseBody &&
      typeof responseBody === "object" &&
      "data" in responseBody &&
      "metadata" in responseBody
        ? (responseBody.data as T)
        : (response.body as T);

    return {
      data: unwrapped,
      status: response.status,
      headers: response.headers,
      duration: Date.now() - context.startTime,
      requestId,
    };
  }

  // ===========================================================================
  // Generation API
  // ===========================================================================

  /**
   * Generate text using AI models
   *
   * @example
   * ```typescript
   * const response = await client.generate({
   *   input: { text: 'Write a poem about coding' },
   *   provider: 'openai',
   *   model: 'gpt-4o',
   *   temperature: 0.7,
   * });
   * console.log(response.data.content);
   * ```
   */
  async generate(
    options: ClientGenerateRequestOptions,
    requestOptions?: ClientRequestOptions,
  ): Promise<ClientApiResponse<ClientGenerateResponse>> {
    return this.request("POST", "/api/agent/execute", options, requestOptions);
  }

  /**
   * Stream text generation
   *
   * @example
   * ```typescript
   * await client.stream(
   *   { input: { text: 'Tell me a story' }, provider: 'openai' },
   *   {
   *     onText: (text) => process.stdout.write(text),
   *     onDone: (result) => console.log('\nDone!', result.usage),
   *   }
   * );
   * ```
   */
  async stream(
    options: ClientStreamRequestOptions | ClientGenerateRequestOptions,
    callbacks?: ClientStreamCallbacks,
    requestOptions?: ClientRequestOptions,
  ): Promise<ClientStreamResult> {
    const url = `${this.config.baseUrl}/api/agent/stream`;
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
      const rawBody = (await response.json()) as Record<string, unknown>;
      // Server may wrap errors as { error: { code, message }, metadata: {...} }
      const errorPayload =
        rawBody && typeof rawBody === "object" && "error" in rawBody
          ? (rawBody.error as ClientApiError)
          : (rawBody as ClientApiError);
      throw new HttpError(
        errorPayload?.message ?? `HTTP ${response.status}`,
        response.status,
        {
          code: errorPayload?.code as ErrorCodeType | undefined,
          details: errorPayload?.details,
          requestId,
        },
      );
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Response body is not readable");
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let fullContent = "";
    const toolCalls: unknown[] = [];
    const toolResults: unknown[] = [];

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              const result: ClientStreamResult = {
                content: fullContent,
                toolCalls: toolCalls as ClientStreamResult["toolCalls"],
                toolResults: toolResults as ClientStreamResult["toolResults"],
              };
              callbacks?.onDone?.(result);
              return result;
            }

            try {
              const event = JSON.parse(data) as ClientStreamEvent;
              this.handleStreamEvent(event, callbacks, {
                onText: (text) => {
                  fullContent += text;
                },
                onToolCall: (toolCall) => {
                  toolCalls.push(toolCall);
                },
                onToolResult: (toolResult) => {
                  toolResults.push(toolResult);
                },
              });
            } catch {
              // Ignore parse errors for malformed events
              this.log("Failed to parse stream event", data);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return {
      content: fullContent,
      toolCalls: toolCalls as ClientStreamResult["toolCalls"],
      toolResults: toolResults as ClientStreamResult["toolResults"],
    };
  }

  /**
   * Handle individual stream events
   */
  private handleStreamEvent(
    event: ClientStreamEvent,
    callbacks?: ClientStreamCallbacks,
    internalCallbacks?: {
      onText?: (text: string) => void;
      onToolCall?: (toolCall: unknown) => void;
      onToolResult?: (toolResult: unknown) => void;
    },
  ): void {
    switch (event.type) {
      case "text":
        if (event.content) {
          callbacks?.onText?.(event.content);
          internalCallbacks?.onText?.(event.content);
        }
        break;
      case "tool-call":
        if (event.toolCall) {
          callbacks?.onToolCall?.(event.toolCall);
          internalCallbacks?.onToolCall?.(event.toolCall);
        }
        break;
      case "tool-result":
        if (event.toolResult) {
          callbacks?.onToolResult?.(event.toolResult);
          internalCallbacks?.onToolResult?.(event.toolResult);
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
      case "audio":
        if (event.audio) {
          callbacks?.onAudio?.(event.audio);
        }
        break;
      case "thinking":
        if (event.thinking) {
          callbacks?.onThinking?.(event.thinking);
        }
        break;
    }
  }

  // ===========================================================================
  // Agent API
  // ===========================================================================

  /**
   * Execute an agent
   *
   * @example
   * ```typescript
   * const result = await client.executeAgent({
   *   agentId: 'customer-support',
   *   input: 'I need help with my order',
   *   sessionId: 'user-123',
   * });
   * console.log(result.data.content);
   * ```
   */
  async executeAgent(
    options: ClientAgentExecuteOptions,
    requestOptions?: ClientRequestOptions,
  ): Promise<ClientApiResponse<ClientAgentExecuteResult>> {
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
    options: ClientAgentExecuteOptions,
    callbacks?: ClientStreamCallbacks,
    requestOptions?: ClientRequestOptions,
  ): Promise<ClientStreamResult> {
    return this.stream(
      {
        input: { text: options.input },
        context: options.context,
        ...(options.tools ? { tools: options.tools.enabled } : {}),
      } as ClientGenerateRequestOptions,
      callbacks,
      requestOptions,
    );
  }

  /**
   * List available agents
   */
  async listAgents(
    requestOptions?: ClientRequestOptions,
  ): Promise<ClientApiResponse<ClientAgentInfo[]>> {
    return this.request("GET", "/api/agents", undefined, requestOptions);
  }

  /**
   * Get agent details
   */
  async getAgent(
    agentId: string,
    requestOptions?: ClientRequestOptions,
  ): Promise<ClientApiResponse<ClientAgentInfo>> {
    return this.request(
      "GET",
      `/api/agents/${agentId}`,
      undefined,
      requestOptions,
    );
  }

  // ===========================================================================
  // Workflow API
  // ===========================================================================

  /**
   * Execute a workflow
   *
   * @example
   * ```typescript
   * const result = await client.executeWorkflow({
   *   workflowId: 'data-pipeline',
   *   input: { data: [...] },
   * });
   *
   * if (result.data.status === 'running') {
   *   // Poll for completion
   *   const status = await client.getWorkflowStatus(
   *     'data-pipeline',
   *     result.data.runId
   *   );
   * }
   * ```
   */
  async executeWorkflow(
    options: ClientWorkflowExecuteOptions,
    requestOptions?: ClientRequestOptions,
  ): Promise<ClientApiResponse<ClientWorkflowExecuteResult>> {
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
    resumeData?: UnknownRecord,
    requestOptions?: ClientRequestOptions,
  ): Promise<ClientApiResponse<ClientWorkflowExecuteResult>> {
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
    requestOptions?: ClientRequestOptions,
  ): Promise<ClientApiResponse<ClientWorkflowExecuteResult>> {
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
    requestOptions?: ClientRequestOptions,
  ): Promise<ClientApiResponse<{ success: boolean }>> {
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
    requestOptions?: ClientRequestOptions,
  ): Promise<ClientApiResponse<ClientWorkflowInfo[]>> {
    return this.request("GET", "/api/workflows", undefined, requestOptions);
  }

  /**
   * Get workflow details
   */
  async getWorkflow(
    workflowId: string,
    requestOptions?: ClientRequestOptions,
  ): Promise<ClientApiResponse<ClientWorkflowInfo>> {
    return this.request(
      "GET",
      `/api/workflows/${workflowId}`,
      undefined,
      requestOptions,
    );
  }

  // ===========================================================================
  // Tools API
  // ===========================================================================

  /**
   * List available tools
   *
   * @example
   * ```typescript
   * const tools = await client.listTools({ category: 'data' });
   * console.log(tools.data);
   * ```
   */
  async listTools(
    options?: { category?: string; serverId?: string },
    requestOptions?: ClientRequestOptions,
  ): Promise<ClientApiResponse<ClientToolInfo[]>> {
    const params = new URLSearchParams();
    if (options?.category) {
      params.set("category", options.category);
    }
    if (options?.serverId) {
      params.set("serverId", options.serverId);
    }

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
    params: UnknownRecord,
    requestOptions?: ClientRequestOptions,
  ): Promise<ClientApiResponse<unknown>> {
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
    requestOptions?: ClientRequestOptions,
  ): Promise<ClientApiResponse<ClientToolInfo>> {
    return this.request(
      "GET",
      `/api/tools/${toolName}`,
      undefined,
      requestOptions,
    );
  }

  // ===========================================================================
  // Provider API
  // ===========================================================================

  /**
   * List available providers
   */
  async listProviders(
    requestOptions?: ClientRequestOptions,
  ): Promise<ClientApiResponse<ClientProviderStatus[]>> {
    return this.request("GET", "/api/providers", undefined, requestOptions);
  }

  /**
   * Get provider status
   */
  async getProviderStatus(
    providerName: string,
    requestOptions?: ClientRequestOptions,
  ): Promise<ClientApiResponse<ClientProviderStatus>> {
    return this.request(
      "GET",
      `/api/providers/${providerName}/status`,
      undefined,
      requestOptions,
    );
  }

  // ===========================================================================
  // Health API
  // ===========================================================================

  /**
   * Health check
   */
  async health(
    requestOptions?: ClientRequestOptions,
  ): Promise<ClientApiResponse<{ status: string; version: string }>> {
    return this.request("GET", "/api/health", undefined, requestOptions);
  }

  // ===========================================================================
  // WebSocket Methods
  // ===========================================================================

  /**
   * Connect to WebSocket for real-time communication
   *
   * @example
   * ```typescript
   * client.connectWebSocket({
   *   url: 'wss://api.example.com/ws',
   *   autoReconnect: true,
   * });
   *
   * client.onWebSocketMessage('chat', (data) => {
   *   console.log('Chat message:', data);
   * });
   * ```
   */
  connectWebSocket(options?: Partial<ClientWebSocketOptions>): void {
    if (typeof WebSocket === "undefined") {
      throw new Error(
        "WebSocket is not available in this environment. Please use a polyfill.",
      );
    }

    const wsUrl = options?.url ?? `${this.config.wsUrl}/ws`;
    const protocols = options?.protocols;

    this.wsState = "connecting";
    this.wsConnection = new WebSocket(wsUrl, protocols);

    this.wsConnection.onopen = () => {
      this.wsState = "connected";
      this.log("WebSocket connected");

      // Send auth if configured
      if (this.config.apiKey || this.config.token) {
        this.sendWebSocketMessage({
          type: "auth",
          apiKey: this.config.apiKey,
          token: this.config.token,
        });
      }
    };

    this.wsConnection.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const messageType = data.type ?? "message";

        const handlers = this.wsMessageHandlers.get(messageType);
        if (handlers) {
          handlers.forEach((handler) => handler(data));
        }

        // Also notify general message handlers
        const allHandlers = this.wsMessageHandlers.get("*");
        if (allHandlers) {
          allHandlers.forEach((handler) => handler(data));
        }
      } catch {
        this.log("Failed to parse WebSocket message", event.data);
      }
    };

    this.wsConnection.onclose = () => {
      this.wsState = "disconnected";
      this.log("WebSocket disconnected");

      if (options?.autoReconnect) {
        const interval = options.reconnectInterval ?? 5000;
        setTimeout(() => {
          if (this.wsState === "disconnected") {
            this.connectWebSocket(options);
          }
        }, interval);
      }
    };

    this.wsConnection.onerror = (error) => {
      this.log("WebSocket error", error);
    };
  }

  /**
   * Disconnect WebSocket
   */
  disconnectWebSocket(): void {
    if (this.wsConnection) {
      this.wsState = "disconnecting";
      this.wsConnection.close();
      this.wsConnection = null;
    }
  }

  /**
   * Send message over WebSocket
   */
  sendWebSocketMessage(data: unknown): void {
    if (this.wsConnection?.readyState === WebSocket.OPEN) {
      this.wsConnection.send(JSON.stringify(data));
    } else {
      throw new Error("WebSocket is not connected");
    }
  }

  /**
   * Register WebSocket message handler
   */
  onWebSocketMessage(
    messageType: string,
    handler: ClientWebSocketMessageHandler,
  ): () => void {
    if (!this.wsMessageHandlers.has(messageType)) {
      this.wsMessageHandlers.set(messageType, new Set());
    }
    const handlers = this.wsMessageHandlers.get(messageType);
    if (handlers) {
      handlers.add(handler);
    }

    // Return unsubscribe function
    return () => {
      this.wsMessageHandlers.get(messageType)?.delete(handler);
    };
  }

  /**
   * Get WebSocket connection state
   */
  getWebSocketState(): ClientWebSocketState {
    return this.wsState;
  }

  // ===========================================================================
  // Configuration Methods
  // ===========================================================================

  /**
   * Update client configuration
   */
  updateConfig(config: Partial<ClientConfig>): void {
    if (config.baseUrl) {
      this.config.baseUrl = config.baseUrl.replace(/\/$/, "");
    }
    if (config.apiKey !== undefined) {
      this.config.apiKey = config.apiKey;
    }
    if (config.token !== undefined) {
      this.config.token = config.token;
    }
    if (config.timeout !== undefined) {
      this.config.timeout = config.timeout;
    }
    if (config.headers) {
      this.config.headers = { ...this.config.headers, ...config.headers };
    }
    if (config.retry) {
      this.config.retry = { ...this.config.retry, ...config.retry };
    }
    if (config.debug !== undefined) {
      this.config.debug = config.debug;
    }
  }

  /**
   * Get current configuration (readonly)
   */
  getConfig(): Readonly<ClientConfig> {
    return { ...this.config };
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a new NeuroLink client instance
 *
 * @example
 * ```typescript
 * import { createClient } from '@neurolink/client';
 *
 * const client = createClient({
 *   baseUrl: 'https://api.neurolink.example.com',
 *   apiKey: process.env.NEUROLINK_API_KEY,
 *   debug: true,
 * });
 * ```
 */
export function createClient(config: ClientConfig): NeuroLinkClient {
  return new NeuroLinkClient(config);
}
