# MCP (Model Context Protocol) Implementation Patterns

This document provides a comprehensive analysis of NeuroLink's MCP implementation patterns, serving as a reference for understanding the architecture, extending functionality, and building similar systems.

> **Note: NeuroLink's Existing MCP Implementation**
>
> NeuroLink already has a comprehensive MCP implementation with the following capabilities:
>
> - **4 Transport Protocols**: stdio (local process), HTTP/Streamable HTTP (remote), SSE (Server-Sent Events), and WebSocket
> - **Circuit Breakers**: Automatic failure detection with configurable thresholds, half-open testing, and recovery
> - **Rate Limiting**: Token bucket algorithm with configurable burst limits, queue management, and retry-after handling
> - **Retry Handler**: Exponential backoff with jitter, configurable retry counts, and retryable error detection
>
> The patterns documented below describe this existing implementation in detail.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Directory Structure](#directory-structure)
3. [Transport Implementation Patterns](#transport-implementation-patterns)
4. [Tool Registration Patterns](#tool-registration-patterns)
5. [Server Management Patterns](#server-management-patterns)
6. [Error Handling Patterns](#error-handling-patterns)
7. [Resilience Patterns](#resilience-patterns)
8. [Authentication Patterns](#authentication-patterns)
9. [Best Practices](#best-practices)
10. [Extension Guidelines](#extension-guidelines)

---

## Architecture Overview

NeuroLink's MCP implementation follows a **layered architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────────┐
│                     Application Layer                            │
│  (NeuroLink SDK / CLI - src/lib/neurolink.ts)                   │
├─────────────────────────────────────────────────────────────────┤
│                     Tool Registry Layer                          │
│  (MCPToolRegistry - src/lib/mcp/toolRegistry.ts)                │
├─────────────────────────────────────────────────────────────────┤
│                     Server Management Layer                      │
│  (ExternalServerManager - src/lib/mcp/externalServerManager.ts) │
├─────────────────────────────────────────────────────────────────┤
│                     Client Factory Layer                         │
│  (MCPClientFactory - src/lib/mcp/mcpClientFactory.ts)           │
├─────────────────────────────────────────────────────────────────┤
│                     Resilience Layer                             │
│  (Circuit Breaker, Rate Limiter, Retry Handler)                 │
├─────────────────────────────────────────────────────────────────┤
│                     Transport Layer                              │
│  (stdio, HTTP, SSE, WebSocket)                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Key Design Principles

1. **Zero-Conversion Architecture**: MCPServerInfo is the universal type that flows through the system without conversion
2. **Factory Pattern**: Centralized client creation through MCPClientFactory
3. **Registry Pattern**: Unified tool management through MCPToolRegistry
4. **Event-Driven**: Server lifecycle events via EventEmitter
5. **Fault Tolerance**: Circuit breaker, rate limiting, and retry mechanisms

---

## Directory Structure

```
src/lib/mcp/
├── index.ts                    # Main exports and ecosystem initialization
├── registry.ts                 # Base MCPRegistry class
├── toolRegistry.ts             # Extended MCPToolRegistry with tool management
├── mcpClientFactory.ts         # MCP client creation for all transports
├── externalServerManager.ts    # External server lifecycle management
├── toolDiscoveryService.ts     # Automatic tool discovery from servers
├── flexibleToolValidator.ts    # Universal safety validation for tools
├── mcpCircuitBreaker.ts        # Circuit breaker pattern implementation
├── httpRateLimiter.ts          # Token bucket rate limiting
├── httpRetryHandler.ts         # Exponential backoff retry logic
├── factory.ts                  # MCP server factory for creating servers
├── auth/                       # Authentication modules
│   ├── index.ts               # Auth module exports
│   ├── oauthClientProvider.ts # OAuth 2.1 implementation with PKCE
│   └── tokenStorage.ts        # Token storage implementations
└── servers/                    # Built-in MCP servers
    ├── agent/                 # Agent tools
    ├── aiProviders/           # AI provider tools
    └── utilities/             # Utility tools
```

---

## Transport Implementation Patterns

### Supported Transports

NeuroLink supports four MCP transport protocols:

| Transport     | Use Case                               | Configuration                   |
| ------------- | -------------------------------------- | ------------------------------- |
| **stdio**     | Local MCP servers via process spawning | `command`, `args`, `env`, `cwd` |
| **http**      | Remote Streamable HTTP servers         | `url`, `headers`, `httpOptions` |
| **sse**       | Server-Sent Events connections         | `url`, `headers`                |
| **websocket** | WebSocket connections                  | `url`, `headers`                |

### Transport Type Definition

```typescript
// From src/lib/types/mcpTypes.ts
export type MCPTransportType =
  | "stdio"
  | "sse"
  | "websocket"
  | "http"
  | "ws"
  | "tcp"
  | "unix";
```

### MCPClientFactory Pattern

The `MCPClientFactory` is a static factory class responsible for creating MCP clients across all transport types:

```typescript
// Pattern: Static Factory with Transport Polymorphism
export class MCPClientFactory {
  // Factory identification for SDK compatibility
  private static readonly NEUROLINK_IMPLEMENTATION: Implementation = {
    name: "neurolink-sdk",
    version: "1.0.0",
  };

  // Default capabilities for client negotiation
  private static readonly DEFAULT_CAPABILITIES: ClientCapabilities = {
    sampling: {},
    roots: { listChanged: false },
  };

  // Main factory method - single entry point
  static async createClient(
    config: MCPServerInfo,
    timeout = 10000,
  ): Promise<MCPClientResult> {
    // 1. Rate limiting check (for HTTP transports)
    // 2. Circuit breaker wrapping
    // 3. Retry logic wrapping
    // 4. Internal client creation
    // 5. Return standardized result
  }

  // Transport-specific creation methods
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
}
```

### stdio Transport Pattern

Process-based communication with local MCP servers:

```typescript
private static async createStdioTransport(
  config: MCPServerInfo,
): Promise<TransportWithProcessResult> {
  // Validate command is present
  if (!config.command) {
    throw new Error(`Command is required for stdio transport`);
  }

  // Spawn the process with proper stdio configuration
  const childProcess = spawn(config.command, config.args || [], {
    stdio: ["pipe", "pipe", "pipe"],
    env: Object.fromEntries(
      Object.entries({ ...process.env, ...config.env })
        .filter(([, value]) => value !== undefined)
        .map(([k, v]) => [k, String(v)]),
    ),
    cwd: config.cwd,
  });

  // Handle process errors and exit events
  const processErrorPromise = new Promise<never>((_, reject) => {
    childProcess.on("error", (error) => {
      reject(new Error(`Process spawn error: ${error.message}`));
    });
    childProcess.on("exit", (code, signal) => {
      if (code !== 0) {
        reject(new Error(`Process exited with code ${code}, signal ${signal}`));
      }
    });
  });

  // Create MCP SDK transport
  const transport = new StdioClientTransport({
    command: config.command,
    args: config.args || [],
    env: { ...process.env, ...config.env },
    cwd: config.cwd,
    stderr: "ignore", // Suppress startup messages
  });

  return { transport, process: childProcess };
}
```

### HTTP Transport Pattern

Enhanced HTTP transport with OAuth, rate limiting, and custom timeouts:

```typescript
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

  // Set up OAuth provider if configured
  const oauthProvider = await this.setupAuthProvider(config);

  // Build headers including authentication
  const headers: Record<string, string> = { ...(config.headers ?? {}) };
  if (config.auth) {
    const authHeader = await this.getAuthorizationHeader(config, oauthProvider);
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }
  }

  // Create enhanced fetch with timeout and OAuth refresh
  const fetchWithEnhancements = this.createEnhancedFetch(
    config,
    httpOptions.requestTimeout,
    oauthProvider,
  );

  // Create Streamable HTTP transport
  const transport = new StreamableHTTPClientTransport(new URL(config.url), {
    requestInit: { headers },
    fetch: fetchWithEnhancements,
  });

  return { transport };
}
```

---

## Tool Registration Patterns

### MCPToolRegistry Class

The `MCPToolRegistry` extends the base `MCPRegistry` with comprehensive tool management:

```typescript
export class MCPToolRegistry extends MCPRegistry {
  private tools: Map<string, ToolInfo> = new Map();
  private toolImplementations: Map<string, ToolImplementation> = new Map();
  private toolExecutionStats: Map<
    string,
    { count: number; totalTime: number }
  > = new Map();
  private builtInServerInfos: MCPServerInfo[] = [];
  private hitlManager?: HITLManager;

  constructor() {
    super();
    // Auto-register direct tools if not disabled
    if (!shouldDisableBuiltinTools()) {
      this.registerDirectTools();
    }
  }
}
```

### Tool Registration Pattern

```typescript
// Pattern: Server-to-Tool Registration
async registerServer(serverInfo: MCPServerInfo): Promise<void> {
  const serverId = serverInfo.id;

  // Build tool implementations from server tools array
  const toolsObject: Record<string, ToolImplementation> = {};
  for (const tool of serverInfo.tools) {
    toolsObject[tool.name] = {
      execute: tool.execute || (async () => {
        throw new Error(`Tool ${tool.name} has no execute function`);
      }),
      description: tool.description,
      inputSchema: tool.inputSchema,
      category: detectCategory({
        existingCategory: serverInfo.metadata?.category,
        serverId: serverInfo.id,
      }),
    };
  }

  // Create plugin for parent registry
  const plugin: DiscoveredMcp = {
    metadata: {
      name: serverInfo.name,
      description: serverInfo.description,
      category: detectCategory({...}),
    },
    tools: toolsObject,
    configuration: {},
  };

  this.register(plugin);

  // Register individual tools with fully-qualified IDs
  for (const tool of serverInfo.tools) {
    const isCustomTool = serverId.startsWith("custom-tool-");
    const toolId = isCustomTool ? tool.name : `${serverId}.${tool.name}`;

    const toolInfo = {
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      serverId,
      category: detectCategory({...}),
    };

    this.tools.set(toolId, toolInfo);
    this.toolImplementations.set(toolId, {...});
  }
}
```

### Tool Execution Pattern

```typescript
// Pattern: Execution with HITL, Stats, and Result Wrapping
async executeTool<T = unknown>(
  toolName: string,
  args?: unknown,
  context?: ExecutionContext,
): Promise<T> {
  const startTime = Date.now();

  try {
    // 1. Tool lookup (fully-qualified first, then by name)
    let tool = this.tools.get(toolName);
    let toolId = toolName;
    if (!tool) {
      for (const [candidateToolId, toolInfo] of this.tools.entries()) {
        if (toolInfo.name === toolName) {
          tool = toolInfo;
          toolId = candidateToolId;
          break;
        }
      }
    }

    if (!tool) {
      throw new Error(`Tool '${toolName}' not found in registry`);
    }

    // 2. HITL Safety Check (Human-in-the-Loop)
    let finalArgs = args;
    if (this.hitlManager?.isEnabled()) {
      if (this.hitlManager.requiresConfirmation(toolName, args)) {
        const confirmation = await this.hitlManager.requestConfirmation(
          toolName, args, { serverId: tool.serverId, ... }
        );
        if (!confirmation.approved) {
          throw new HITLUserRejectedError(...);
        }
        if (confirmation.modifiedArguments !== undefined) {
          finalArgs = confirmation.modifiedArguments;
        }
      }
    }

    // 3. Execute the tool
    const toolImpl = this.toolImplementations.get(toolId);
    const toolResult = await toolImpl.execute(finalArgs, execContext);

    // 4. Wrap result in standard ToolResult format
    const result: ToolResult = {
      success: true,
      data: toolResult,
      usage: { executionTime: Date.now() - startTime },
      metadata: { toolName, serverId: tool.serverId, ... },
    };

    // 5. Update statistics
    this.updateStats(toolName, Date.now() - startTime);

    return result as T;
  } catch (error) {
    // Return error in ToolResult format
    return {
      success: false,
      data: null,
      error: error.message,
      usage: { executionTime: Date.now() - startTime },
      metadata: { toolName },
    } as T;
  }
}
```

### FlexibleToolValidator Pattern

Minimal validation following MCP specification's intentionally flexible tool naming:

```typescript
export class FlexibleToolValidator {
  private static readonly MAX_TOOL_NAME_LENGTH = 1000;
  private static readonly MIN_TOOL_NAME_LENGTH = 1;

  static validateToolName(toolId: string): FlexibleValidationResult {
    const warnings: string[] = [];

    // Safety Check 1: Empty or whitespace-only names
    if (!toolId || typeof toolId !== "string") {
      return {
        isValid: false,
        error: "Tool name is required and must be a string",
      };
    }

    // Safety Check 2: Control characters (dangerous C0 characters only)
    const hasControlCharacters = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(
      toolId,
    );
    if (hasControlCharacters) {
      return { isValid: false, error: "Tool name contains control characters" };
    }

    const trimmedName = toolId.trim();
    if (trimmedName.length === 0) {
      return {
        isValid: false,
        error: "Tool name cannot be empty or whitespace-only",
      };
    }

    // Safety Check 3: Length limits
    if (trimmedName.length > this.MAX_TOOL_NAME_LENGTH) {
      return { isValid: false, error: `Tool name exceeds maximum length` };
    }

    return {
      isValid: true,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }
}
```

---

## Server Management Patterns

### ExternalServerManager Pattern

The `ExternalServerManager` handles the complete lifecycle of external MCP servers:

```typescript
export class ExternalServerManager extends EventEmitter {
  private servers: Map<string, RuntimeMCPServerInfo> = new Map();
  private config: Required<ExternalMCPManagerConfig>;
  private isShuttingDown = false;
  private toolDiscovery: ToolDiscoveryService;
  private hitlManager?: HITLManager;

  constructor(config: ExternalMCPManagerConfig = {}) {
    super();
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

    this.toolDiscovery = new ToolDiscoveryService();

    // Process cleanup handlers
    process.on("SIGINT", () => this.shutdown());
    process.on("SIGTERM", () => this.shutdown());
    process.on("beforeExit", () => this.shutdown());
  }
}
```

### Server Lifecycle States

```typescript
export type ExternalMCPServerStatus =
  | "initializing" // Server is being started
  | "connecting" // Attempting to connect
  | "connected" // Successfully connected and ready
  | "disconnected" // Cleanly disconnected
  | "failed" // Connection failed
  | "restarting" // Server is being restarted
  | "stopping" // Server is being stopped
  | "stopped"; // Server has been stopped
```

### Configuration Loading Pattern

Supports both sequential and parallel loading:

```typescript
// Pattern: Parallel Server Loading for Performance
async loadMCPConfigurationParallel(configPath?: string): Promise<ServerLoadResult> {
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

  // Create promises for all servers
  const serverPromises = Object.entries(config.mcpServers).map(
    async ([serverId, serverConfig]) => {
      try {
        const externalConfig: MCPServerInfo = {
          id: serverId,
          name: serverId,
          transport: serverConfig.transport ?? "stdio",
          command: serverConfig.command,
          args: serverConfig.args ?? [],
          env: substituteEnvVariables(serverConfig.env ?? {}),
          // ... other fields
        };

        const result = await this.addServer(serverId, externalConfig);
        return { serverId, result };
      } catch (error) {
        return { serverId, error: error.message };
      }
    }
  );

  // Start all servers concurrently
  const results = await Promise.allSettled(serverPromises);

  // Aggregate results
  let serversLoaded = 0;
  const errors: string[] = [];
  for (const result of results) {
    if (result.status === "fulfilled" && result.value.result?.success) {
      serversLoaded++;
    } else {
      errors.push(result.value?.error || "Unknown error");
    }
  }

  return { serversLoaded, errors };
}
```

### Environment Variable Substitution

```typescript
// Pattern: Recursive Environment Variable Substitution
function substituteEnvVariables<T>(value: T): T {
  if (typeof value === "string") {
    return value.replace(/\$\{([^}]+)\}/g, (match, varName) => {
      const envValue = process.env[varName.trim()];
      if (envValue === undefined) {
        mcpLogger.warn(`Environment variable ${varName} is not defined`);
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
    for (const [key, val] of Object.entries(value)) {
      result[key] = substituteEnvVariables(val);
    }
    return result as T;
  }

  return value;
}
```

### Health Monitoring Pattern

```typescript
// Pattern: Periodic Health Monitoring with Metrics
private startHealthMonitoring(serverId: string): void {
  const instance = this.servers.get(serverId);
  if (!instance || !this.config.enablePerformanceMonitoring) return;

  const interval = instance.config.healthCheckInterval ??
                   this.config.defaultHealthCheckInterval;

  instance.healthTimer = setInterval(async () => {
    await this.performHealthCheck(serverId);
  }, interval);
}

private async performHealthCheck(serverId: string): Promise<void> {
  const instance = this.servers.get(serverId);
  if (!instance || instance.status !== "connected") return;

  const startTime = Date.now();
  let isHealthy = true;
  const issues: string[] = [];

  // Check process health (for stdio)
  if (instance.process && instance.process.killed) {
    isHealthy = false;
    issues.push("Process is killed");
  }

  const health: ExternalMCPServerHealth = {
    serverId,
    isHealthy,
    status: instance.status,
    checkedAt: new Date(),
    responseTime: Date.now() - startTime,
    toolCount: instance.toolsMap.size,
    issues,
    performance: {
      uptime: instance.startTime ? Date.now() - instance.startTime.getTime() : 0,
      averageResponseTime: instance.metrics.averageResponseTime,
    },
  };

  this.emit("healthCheck", { serverId, health, timestamp: new Date() });

  if (!isHealthy) {
    this.handleServerError(serverId, new Error(`Health check failed: ${issues.join(", ")}`));
  }
}
```

### Auto-Restart Pattern with Exponential Backoff

```typescript
// Pattern: Exponential Backoff Restart
private scheduleRestart(serverId: string): void {
  const instance = this.servers.get(serverId);
  if (!instance) return;

  if (instance.reconnectAttempts >= instance.maxReconnectAttempts) {
    mcpLogger.error(`Max restart attempts reached for ${serverId}`);
    this.updateServerStatus(serverId, "failed");
    return;
  }

  instance.reconnectAttempts++;
  this.updateServerStatus(serverId, "restarting");

  // Calculate delay with exponential backoff (capped at 30 seconds)
  const delay = Math.min(
    1000 * Math.pow(this.config.restartBackoffMultiplier, instance.reconnectAttempts - 1),
    30000
  );

  mcpLogger.info(`Scheduling restart for ${serverId} in ${delay}ms (attempt ${instance.reconnectAttempts})`);

  instance.restartTimer = setTimeout(async () => {
    try {
      await this.stopServer(serverId);
      await this.startServer(serverId);
      instance.reconnectAttempts = 0; // Reset on success
    } catch (error) {
      this.scheduleRestart(serverId); // Retry
    }
  }, delay);
}
```

---

## Error Handling Patterns

### Standardized Error Response

All tool executions return a consistent `ToolResult` format:

```typescript
type ToolResult = {
  success: boolean;
  data?: unknown;
  error?: string;
  usage?: {
    executionTime?: number;
    [key: string]: unknown;
  };
  metadata?: {
    toolName?: string;
    serverId?: string;
    sessionId?: string;
    executionTime?: number;
    [key: string]: unknown;
  };
};
```

### HITL Error Types

```typescript
// From src/lib/hitl/hitlErrors.ts
export class HITLUserRejectedError extends Error {
  constructor(message: string, toolName: string, reason?: string) {
    super(message);
    this.name = "HITLUserRejectedError";
  }
}

export class HITLTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HITLTimeoutError";
  }
}
```

### Configuration Validation Pattern

```typescript
// Pattern: Comprehensive Configuration Validation
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
    if (!config.command) {
      errors.push("Command is required for stdio transport");
    }
  } else if (["sse", "websocket", "http"].includes(config.transport)) {
    if (!config.url) {
      errors.push(`URL is required for ${config.transport} transport`);
    }
  }

  // Warnings for common issues
  if (config.timeout && config.timeout < 5000) {
    warnings.push("Timeout less than 5 seconds may cause connection issues");
  }

  // Optimization suggestions
  if (!config.healthCheckInterval) {
    suggestions.push("Consider setting a health check interval for reliability");
  }

  return { isValid: errors.length === 0, errors, warnings, suggestions };
}
```

---

## Resilience Patterns

### Circuit Breaker Pattern

The circuit breaker prevents cascading failures:

```typescript
export class MCPCircuitBreaker extends EventEmitter {
  private state: CircuitBreakerState = "closed"; // closed | open | half-open
  private config: CircuitBreakerConfig;
  private callHistory: CallRecord[] = [];
  private lastFailureTime = 0;
  private halfOpenCalls = 0;

  constructor(name: string, config: Partial<CircuitBreakerConfig> = {}) {
    super();
    this.config = {
      failureThreshold: config.failureThreshold ?? 5,
      resetTimeout: config.resetTimeout ?? 60000,
      halfOpenMaxCalls: config.halfOpenMaxCalls ?? 3,
      operationTimeout: config.operationTimeout ?? 30000,
      minimumCallsBeforeCalculation: config.minimumCallsBeforeCalculation ?? 10,
      statisticsWindowSize: config.statisticsWindowSize ?? 300000,
    };
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === "open") {
      if (Date.now() - this.lastFailureTime < this.config.resetTimeout) {
        throw new Error(`Circuit breaker '${this.name}' is open`);
      }
      this.changeState("half-open", "Reset timeout reached");
    }

    // Check half-open call limit
    if (
      this.state === "half-open" &&
      this.halfOpenCalls >= this.config.halfOpenMaxCalls
    ) {
      throw new Error(
        `Circuit breaker '${this.name}' half-open call limit reached`,
      );
    }

    try {
      // Execute with timeout
      const result = await Promise.race([
        operation(),
        this.timeoutPromise<T>(this.config.operationTimeout),
      ]);

      this.recordCall(true, duration);

      // Handle half-open success
      if (this.state === "half-open") {
        this.halfOpenCalls++;
        if (this.halfOpenCalls >= this.config.halfOpenMaxCalls) {
          this.changeState("closed", "Half-open test successful");
        }
      }

      return result;
    } catch (error) {
      this.recordCall(false, duration);

      if (this.state === "half-open") {
        this.changeState("open", `Half-open test failed`);
      } else if (this.state === "closed") {
        this.checkFailureThreshold();
      }

      throw error;
    }
  }
}
```

### Global Circuit Breaker Manager

```typescript
export class CircuitBreakerManager {
  private breakers = new Map<string, MCPCircuitBreaker>();

  getBreaker(name: string, config?: Partial<CircuitBreakerConfig>): MCPCircuitBreaker {
    if (!this.breakers.has(name)) {
      const breaker = new MCPCircuitBreaker(name, config);
      this.breakers.set(name, breaker);
    }
    return this.breakers.get(name)!;
  }

  getHealthSummary(): {
    totalBreakers: number;
    closedBreakers: number;
    openBreakers: number;
    halfOpenBreakers: number;
    unhealthyBreakers: string[];
  } { ... }

  destroyAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.destroy();
    }
    this.breakers.clear();
  }
}

export const globalCircuitBreakerManager = new CircuitBreakerManager();
```

### Token Bucket Rate Limiter

```typescript
export class HTTPRateLimiter {
  private tokens: number;
  private lastRefill: number;
  private config: RateLimitConfig;
  private waitQueue: Array<{
    resolve: () => void;
    reject: (error: Error) => void;
  }> = [];

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = {
      requestsPerWindow: config.requestsPerWindow ?? 60,
      windowMs: config.windowMs ?? 60000,
      useTokenBucket: config.useTokenBucket ?? true,
      refillRate: config.refillRate ?? 1, // tokens per second
      maxBurst: config.maxBurst ?? 10,
    };
    this.tokens = this.config.maxBurst;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    if (this.tryAcquire()) return;

    // Add to wait queue
    return new Promise<void>((resolve, reject) => {
      this.waitQueue.push({ resolve, reject });
      if (!this.processingQueue) {
        this.processQueue();
      }
    });
  }

  private refillTokens(): void {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastRefill) / 1000;
    const tokensToAdd = elapsedSeconds * this.config.refillRate;

    if (tokensToAdd >= 1) {
      this.tokens = Math.min(this.config.maxBurst, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }

  handleRateLimitResponse(headers: Headers): number {
    // Parse Retry-After header
    const retryAfter = headers.get("Retry-After");
    if (retryAfter) {
      const seconds = parseInt(retryAfter, 10);
      if (!isNaN(seconds)) return seconds * 1000;
    }

    // Parse X-RateLimit-Reset header
    const rateLimitReset = headers.get("X-RateLimit-Reset");
    if (rateLimitReset) {
      const resetTimestamp = parseInt(rateLimitReset, 10);
      const resetTime =
        resetTimestamp > 1e12 ? resetTimestamp : resetTimestamp * 1000;
      return Math.max(0, resetTime - Date.now());
    }

    return 0;
  }
}

export const globalRateLimiterManager = new RateLimiterManager();
```

### HTTP Retry Handler

```typescript
export const DEFAULT_HTTP_RETRY_CONFIG: HTTPRetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
};

export function isRetryableHTTPError(
  error: unknown,
  config = DEFAULT_HTTP_RETRY_CONFIG,
): boolean {
  // Check timeout/abort errors
  if (error.name === "TimeoutError" || error.name === "AbortError") return true;

  // Check network errors
  if (
    ["ECONNRESET", "ENOTFOUND", "ECONNREFUSED", "ETIMEDOUT"].includes(
      error.code,
    )
  )
    return true;

  // Check HTTP status codes
  if (typeof error.status === "number") {
    return config.retryableStatusCodes.includes(error.status);
  }

  return false;
}

export async function withHTTPRetry<T>(
  operation: () => Promise<T>,
  config: Partial<HTTPRetryConfig> = {},
): Promise<T> {
  const mergedConfig = { ...DEFAULT_HTTP_RETRY_CONFIG, ...config };
  let lastError: unknown;

  for (let attempt = 1; attempt <= mergedConfig.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt === mergedConfig.maxAttempts) break;
      if (!isRetryableHTTPError(error, mergedConfig)) break;

      // Calculate delay with jitter
      const delay = calculateBackoffDelay(
        attempt,
        mergedConfig.initialDelay,
        mergedConfig.backoffMultiplier,
        mergedConfig.maxDelay,
        true, // Enable jitter
      );

      await sleep(delay);
    }
  }

  throw lastError;
}
```

---

## Authentication Patterns

### OAuth 2.1 Provider

```typescript
export class NeuroLinkOAuthProvider {
  private config: MCPOAuthConfig;
  private storage: TokenStorage;
  private pendingChallenges: Map<string, PKCEChallenge> = new Map();
  private pendingStates: Set<string> = new Set();

  constructor(config: MCPOAuthConfig, storage?: TokenStorage) {
    this.config = {
      ...config,
      usePKCE: config.usePKCE ?? true, // PKCE enabled by default
    };
    this.storage = storage ?? new InMemoryTokenStorage();
  }

  // Generate authorization URL with PKCE
  redirectToAuthorization(serverId: string): AuthorizationUrlResult {
    const state = this.generateState();
    this.pendingStates.add(state);

    const url = new URL(this.config.authorizationUrl);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", this.config.clientId);
    url.searchParams.set("redirect_uri", this.config.redirectUrl);
    url.searchParams.set("state", state);

    let codeVerifier: string | undefined;
    if (this.config.usePKCE) {
      const pkce = this.generatePKCE();
      codeVerifier = pkce.codeVerifier;
      this.pendingChallenges.set(state, pkce);
      url.searchParams.set("code_challenge", pkce.codeChallenge);
      url.searchParams.set("code_challenge_method", "S256");
    }

    return { url: url.toString(), state, codeVerifier };
  }

  // PKCE generation
  private generatePKCE(): PKCEChallenge {
    const codeVerifier = randomBytes(32).toString("base64url");
    const codeChallenge = createHash("sha256")
      .update(codeVerifier)
      .digest("base64url");

    return { codeVerifier, codeChallenge, codeChallengeMethod: "S256" };
  }

  // Token exchange
  async exchangeCode(
    serverId: string,
    request: TokenExchangeRequest,
  ): Promise<OAuthTokens> {
    // Validate state
    if (!this.pendingStates.has(request.state)) {
      throw new Error("Invalid or expired state parameter");
    }
    this.pendingStates.delete(request.state);

    // Get PKCE verifier
    let codeVerifier = request.codeVerifier;
    if (this.config.usePKCE && !codeVerifier) {
      const pkce = this.pendingChallenges.get(request.state);
      if (pkce) {
        codeVerifier = pkce.codeVerifier;
        this.pendingChallenges.delete(request.state);
      }
    }

    // Exchange code for tokens
    const body = new URLSearchParams();
    body.set("grant_type", "authorization_code");
    body.set("code", request.code);
    body.set("redirect_uri", this.config.redirectUrl);
    body.set("client_id", this.config.clientId);
    if (codeVerifier) body.set("code_verifier", codeVerifier);

    const response = await fetch(this.config.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    const tokenResponse = await response.json();
    const tokens: OAuthTokens = {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresAt: tokenResponse.expires_in
        ? calculateExpiresAt(tokenResponse.expires_in)
        : undefined,
      tokenType: tokenResponse.token_type ?? "Bearer",
    };

    await this.saveTokens(serverId, tokens);
    return tokens;
  }
}
```

### Token Storage Implementations

```typescript
// In-Memory Storage (for development)
export class InMemoryTokenStorage implements TokenStorage {
  private tokens: Map<string, OAuthTokens> = new Map();

  async getTokens(serverId: string): Promise<OAuthTokens | null> {
    return this.tokens.get(serverId) ?? null;
  }

  async saveTokens(serverId: string, tokens: OAuthTokens): Promise<void> {
    this.tokens.set(serverId, tokens);
  }

  async deleteTokens(serverId: string): Promise<void> {
    this.tokens.delete(serverId);
  }
}

// File-Based Storage (for persistence)
export class FileTokenStorage implements TokenStorage {
  constructor(private filePath: string) {}

  async getTokens(serverId: string): Promise<OAuthTokens | null> {
    const data = await this.readFile();
    return data[serverId] ?? null;
  }

  async saveTokens(serverId: string, tokens: OAuthTokens): Promise<void> {
    const data = await this.readFile();
    data[serverId] = tokens;
    await this.writeFile(data);
  }
}
```

---

## Best Practices

### 1. Use MCPServerInfo as the Universal Type

```typescript
// Good: Use MCPServerInfo everywhere
const serverConfig: MCPServerInfo = {
  id: "my-server",
  name: "My MCP Server",
  description: "Example server",
  transport: "stdio",
  status: "initializing",
  tools: [],
  command: "npx",
  args: ["-y", "@modelcontextprotocol/server-example"],
};

// Bad: Creating custom types for server configuration
type MyServerConfig = { ... };  // Avoid this
```

### 2. Always Wrap External Operations with Resilience Patterns

```typescript
// Good: Use circuit breaker and retry
const circuitBreaker = globalCircuitBreakerManager.getBreaker(
  `mcp-${serverId}`,
);
const result = await circuitBreaker.execute(async () => {
  return await withHTTPRetry(
    async () => {
      return await client.callTool({ name, arguments: params });
    },
    { maxAttempts: 3 },
  );
});
```

### 3. Implement Proper Cleanup

```typescript
// Good: Clean up resources on shutdown
async shutdown(): Promise<void> {
  if (this.isShuttingDown) return;
  this.isShuttingDown = true;

  const shutdownPromises = Array.from(this.servers.keys()).map(
    (serverId) => this.stopServer(serverId).catch(() => {})
  );

  await Promise.all(shutdownPromises);
  this.servers.clear();
  globalCircuitBreakerManager.destroyAll();
  globalRateLimiterManager.destroyAll();
}
```

### 4. Emit Events for Observability

```typescript
// Good: Emit events for lifecycle changes
this.emit("connected", { serverId, toolCount, timestamp: new Date() });
this.emit("healthCheck", { serverId, health, timestamp: new Date() });
this.emit("statusChanged", {
  serverId,
  oldStatus,
  newStatus,
  timestamp: new Date(),
});
```

### 5. Validate Configuration Early

```typescript
// Good: Validate before attempting connection
const validation = this.validateConfig(config);
if (!validation.isValid) {
  return {
    success: false,
    error: `Configuration validation failed: ${validation.errors.join(", ")}`,
  };
}
```

### 6. Use Fully-Qualified Tool IDs

```typescript
// Good: Prevent collisions with namespaced tool IDs
const toolId = `${serverId}.${tool.name}`; // e.g., "github.create_issue"

// Exception: Custom tools registered directly
const isCustomTool = serverId.startsWith("custom-tool-");
const toolId = isCustomTool ? tool.name : `${serverId}.${tool.name}`;
```

---

## Extension Guidelines

### Adding a New Transport

1. **Add transport type** to `MCPTransportType` in `src/lib/types/mcpTypes.ts`
2. **Implement transport creation** in `MCPClientFactory.createTransport()`
3. **Add validation** in `MCPClientFactory.validateClientConfig()`
4. **Update documentation**

```typescript
// Example: Adding Unix socket transport
case "unix":
  return this.createUnixTransport(config);

private static async createUnixTransport(config: MCPServerInfo): Promise<NetworkTransportResult> {
  if (!config.url) {
    throw new Error("Socket path (url) is required for unix transport");
  }
  // Implementation using unix domain sockets
}
```

### Adding Custom Resilience Patterns

1. Create a new pattern in `src/lib/mcp/`
2. Export from `src/lib/mcp/index.ts`
3. Integrate into `MCPClientFactory.createClient()`

```typescript
// Example: Adding a bulkhead pattern
export class Bulkhead {
  private concurrent = 0;
  private queue: Array<{ resolve: () => void }> = [];

  constructor(private maxConcurrent: number) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await operation();
    } finally {
      this.release();
    }
  }
}
```

### Adding New Tool Validation Rules

Extend `FlexibleToolValidator` while maintaining MCP compatibility:

```typescript
// Add warnings, not errors, for non-critical issues
static validateToolInfo(toolId: string, toolInfo: { description?: string }): FlexibleValidationResult {
  const nameValidation = this.validateToolName(toolId);
  if (!nameValidation.isValid) return nameValidation;

  const warnings = [...(nameValidation.warnings || [])];

  // Add custom warnings (not errors)
  if (!toolInfo.description) {
    warnings.push("Tool has no description - consider adding one");
  }

  return { isValid: true, warnings };
}
```

### Creating Custom MCP Servers

Use the factory pattern:

```typescript
import { createMCPServer } from "@juspay/neurolink";

const myServer = createMCPServer({
  id: "my-custom-server",
  title: "My Custom Server",
  description: "Custom tools for my application",
  category: "custom",
});

myServer.registerTool({
  name: "my_tool",
  description: "Does something useful",
  inputSchema: z.object({
    input: z.string(),
  }),
  execute: async (params, context) => {
    // Implementation
    return { success: true, data: result };
  },
});
```

---

## Summary

NeuroLink's MCP implementation provides a robust, extensible foundation for integrating with Model Context Protocol servers. Key characteristics include:

1. **Unified Type System**: MCPServerInfo as the single source of truth
2. **Multi-Transport Support**: stdio, HTTP, SSE, WebSocket with consistent interfaces
3. **Resilience First**: Circuit breaker, rate limiting, and retry built-in
4. **Event-Driven Architecture**: Full lifecycle observability
5. **OAuth 2.1 Support**: Modern authentication with PKCE
6. **Flexible Tool Validation**: Following MCP specification's intentional flexibility
7. **Human-in-the-Loop**: Optional safety mechanisms for sensitive operations

The patterns documented here can be used as templates for extending the MCP functionality or building similar systems in other contexts.
