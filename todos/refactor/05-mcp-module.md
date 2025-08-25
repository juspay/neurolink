# MCP Module Refactoring

**Status**: `[ ]` Not started  
**Priority**: 🟡 Medium  
**Estimated Effort**: 6-8 hours  
**Prerequisites**: 01-global-imports.md, 02-core-module.md must be completed

## Objective

Refactor the MCP (Model Context Protocol) module to achieve strict TypeScript compliance, improve type safety for plugin architecture, standardize server implementations, and ensure proper contract definitions.

## Files to Modify

### Core MCP Files

- `src/lib/mcp/index.ts` - Main MCP ecosystem exports
- `src/lib/mcp/registry.ts` - MCP server registration
- `src/lib/mcp/toolRegistry.ts` - Tool registration and execution
- `src/lib/mcp/mcpClientFactory.ts` - MCP client creation
- `src/lib/mcp/externalServerManager.ts` - External server management
- `src/lib/mcp/mcpCircuitBreaker.ts` - Circuit breaker implementation
- `src/lib/mcp/toolDiscoveryService.ts` - Tool discovery

### MCP Contracts

- `src/lib/mcp/contracts/mcpContract.ts` - Protocol contracts and types

### MCP Server Implementations

- `src/lib/mcp/servers/agent/` - Agent server implementation
- `src/lib/mcp/servers/*/` - Other server implementations

### Factory Pattern

- `src/lib/mcp/factory.ts` - MCP factory implementation

## Step-by-Step Instructions

### Step 1: Backup and Setup

```bash
# Create feature branch
git checkout -b refactor/mcp-module
git add -A
git commit -m "Backup before MCP module refactor"
```

### Step 2: Enhance MCP Contract Types

**File**: `src/lib/mcp/contracts/mcpContract.ts`

```typescript
import type { UnknownRecord, JsonValue, JsonObject } from "../../types/common";

// Core MCP Protocol Types
export type MCPVersion = "1.0.0" | "2.0.0";

export type MCPMessage = {
  id: string;
  type: MCPMessageType;
  timestamp: number;
  version: MCPVersion;
  payload: JsonObject;
};

export type MCPMessageType =
  | "request"
  | "response"
  | "notification"
  | "error"
  | "heartbeat";

export type MCPRequest = MCPMessage & {
  type: "request";
  method: string;
  params?: JsonObject;
};

export type MCPResponse = MCPMessage & {
  type: "response";
  requestId: string;
  result?: JsonValue;
  error?: MCPError;
};

export type MCPError = {
  code: MCPErrorCode;
  message: string;
  details?: UnknownRecord;
};

export type MCPErrorCode =
  | "INVALID_REQUEST"
  | "METHOD_NOT_FOUND"
  | "INVALID_PARAMS"
  | "INTERNAL_ERROR"
  | "SERVER_ERROR"
  | "TIMEOUT"
  | "NETWORK_ERROR"
  | "AUTHENTICATION_ERROR"
  | "AUTHORIZATION_ERROR";

// MCP Server Metadata
export type McpMetadata = {
  name: string;
  version: string;
  description: string;
  capabilities: MCPCapability[];
  tools: ToolInfo[];
  status: MCPServerStatus;
  health: MCPServerHealth;
  configuration?: MCPServerConfiguration;
};

export type MCPCapability =
  | "tools"
  | "prompts"
  | "resources"
  | "logging"
  | "sampling"
  | "completion";

export type MCPServerStatus =
  | "initializing"
  | "connected"
  | "ready"
  | "error"
  | "disconnected"
  | "timeout";

export type MCPServerHealth = {
  status: "healthy" | "degraded" | "unhealthy";
  lastCheck: number;
  latency?: number;
  errors: number;
  consecutiveErrors: number;
};

export type MCPServerConfiguration = {
  timeout: number;
  retries: number;
  circuitBreakerThreshold: number;
  healthCheckInterval: number;
  logLevel: "debug" | "info" | "warn" | "error";
};

// Tool Information
export type ToolInfo = {
  name: string;
  description: string;
  inputSchema: JsonObject;
  outputSchema?: JsonObject;
  category?: string;
  tags?: string[];
  examples?: ToolExample[];
};

export type ToolExample = {
  name: string;
  description: string;
  input: JsonObject;
  expectedOutput: JsonValue;
};

// Execution Context
export type ExecutionContext = {
  sessionId: string;
  userId?: string;
  timestamp: number;
  environment: "development" | "staging" | "production";
  metadata: UnknownRecord;
};

// Tool Execution
export type ToolExecutionRequest = {
  toolName: string;
  parameters: JsonObject;
  context: ExecutionContext;
  timeout?: number;
};

export type ToolExecutionResult = {
  success: boolean;
  result?: JsonValue;
  error?: MCPError;
  executionTime: number;
  metadata: ToolExecutionMetadata;
};

export type ToolExecutionMetadata = {
  toolName: string;
  serverId: string;
  executionId: string;
  startTime: number;
  endTime: number;
  retryCount: number;
};

// Discovered MCP Servers
export type DiscoveredMcp = {
  id: string;
  name: string;
  version: string;
  endpoint: string;
  transport: MCPTransportType;
  metadata: McpMetadata;
  discovered: number;
  lastSeen: number;
};

export type MCPTransportType = "stdio" | "sse" | "websocket" | "http";

// Log Level (re-export for convenience)
export type LogLevel = "debug" | "info" | "warn" | "error";
```

### Step 3: Refactor MCP Index

**File**: `src/lib/mcp/index.ts`

```typescript
/**
 * MCP Ecosystem - Main Export with Enhanced Types
 */

// Core contracts and types
export type {
  McpMetadata,
  ExecutionContext,
  DiscoveredMcp,
  ToolInfo,
  ToolExecutionResult,
  MCPMessage,
  MCPRequest,
  MCPResponse,
  MCPError,
  MCPServerStatus,
  MCPServerHealth,
  ToolExecutionRequest,
  ToolExecutionMetadata,
  MCPTransportType,
} from "./contracts/mcpContract";

// Logger re-export
export { mcpLogger } from "../utils/logger";
export type { LogLevel } from "../utils/logger";

// MCP Management Types
export type MCPEcosystemConfig = {
  enabled: boolean;
  discoveryEnabled: boolean;
  healthCheckInterval: number;
  defaultTimeout: number;
  maxRetries: number;
  circuitBreakerThreshold: number;
};

export type MCPEcosystemStats = {
  initialized: boolean;
  pluginsDiscovered: number;
  pluginsBySource: Record<string, number>;
  availablePlugins: string[];
  connectedServers: number;
  totalTools: number;
  healthyServers: number;
  errors: MCPError[];
};

// Enhanced MCP initialization
export async function initializeMCPEcosystem(
  config?: Partial<MCPEcosystemConfig>,
): Promise<boolean> {
  const defaultConfig: MCPEcosystemConfig = {
    enabled: false, // Disabled by default for now
    discoveryEnabled: false,
    healthCheckInterval: 30000,
    defaultTimeout: 10000,
    maxRetries: 3,
    circuitBreakerThreshold: 5,
  };

  const finalConfig = { ...defaultConfig, ...config };

  if (!finalConfig.enabled) {
    return false;
  }

  // Future: Initialize MCP ecosystem
  return Promise.resolve(false);
}

// Enhanced MCP listing
export async function listMCPs(): Promise<McpMetadata[]> {
  // Future: Return actual MCP server list
  return [];
}

// Enhanced MCP execution with proper typing
export async function executeMCP<T = JsonValue>(
  name: string,
  config: ToolExecutionRequest,
  context?: ExecutionContext,
): Promise<ToolExecutionResult & { result: T }> {
  throw new Error(
    "MCP execution not available - ecosystem not fully implemented",
  );
}

// Enhanced MCP statistics
export async function getMCPStats(): Promise<MCPEcosystemStats> {
  return {
    initialized: false,
    pluginsDiscovered: 0,
    pluginsBySource: {},
    availablePlugins: [],
    connectedServers: 0,
    totalTools: 0,
    healthyServers: 0,
    errors: [],
  };
}

// Server management functions
export async function registerMCPServer(
  metadata: McpMetadata,
): Promise<boolean> {
  // Future implementation
  return false;
}

export async function unregisterMCPServer(serverId: string): Promise<boolean> {
  // Future implementation
  return false;
}

export async function getMCPServerHealth(
  serverId: string,
): Promise<MCPServerHealth | null> {
  // Future implementation
  return null;
}
```

### Step 4: Refactor MCP Registry

**File**: `src/lib/mcp/registry.ts`

```typescript
import type {
  McpMetadata,
  MCPServerStatus,
  MCPServerHealth,
  MCPError,
  DiscoveredMcp,
} from "./contracts/mcpContract";
import type { UnknownRecord } from "../types/common";
import { logger } from "../utils/logger";

export type MCPRegistryEntry = {
  id: string;
  metadata: McpMetadata;
  registered: number;
  lastUsed?: number;
  usage: MCPUsageStats;
};

export type MCPUsageStats = {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  averageLatency: number;
  lastError?: MCPError;
};

export type MCPRegistryConfig = {
  maxServers: number;
  healthCheckInterval: number;
  cleanupInterval: number;
  retainUnusedDays: number;
};

export class MCPRegistry {
  private servers = new Map<string, MCPRegistryEntry>();
  private config: MCPRegistryConfig;
  private healthCheckTimer?: NodeJS.Timeout;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config?: Partial<MCPRegistryConfig>) {
    this.config = {
      maxServers: 50,
      healthCheckInterval: 30000,
      cleanupInterval: 300000, // 5 minutes
      retainUnusedDays: 7,
      ...config,
    };
  }

  async register(metadata: McpMetadata): Promise<boolean> {
    try {
      if (this.servers.size >= this.config.maxServers) {
        await this.cleanup();
      }

      const entry: MCPRegistryEntry = {
        id: this.generateServerId(metadata),
        metadata,
        registered: Date.now(),
        usage: {
          totalCalls: 0,
          successfulCalls: 0,
          failedCalls: 0,
          averageLatency: 0,
        },
      };

      this.servers.set(entry.id, entry);

      logger.info(`MCP server registered: ${metadata.name} (${entry.id})`);
      return true;
    } catch (error) {
      logger.error(
        `Failed to register MCP server: ${(error as Error).message}`,
      );
      return false;
    }
  }

  async unregister(serverId: string): Promise<boolean> {
    try {
      const removed = this.servers.delete(serverId);
      if (removed) {
        logger.info(`MCP server unregistered: ${serverId}`);
      }
      return removed;
    } catch (error) {
      logger.error(
        `Failed to unregister MCP server: ${(error as Error).message}`,
      );
      return false;
    }
  }

  getServer(serverId: string): MCPRegistryEntry | undefined {
    return this.servers.get(serverId);
  }

  getAllServers(): MCPRegistryEntry[] {
    return Array.from(this.servers.values());
  }

  getServersByStatus(status: MCPServerStatus): MCPRegistryEntry[] {
    return this.getAllServers().filter(
      (entry) => entry.metadata.status === status,
    );
  }

  updateServerUsage(
    serverId: string,
    success: boolean,
    latency: number,
    error?: MCPError,
  ): void {
    const entry = this.servers.get(serverId);
    if (!entry) return;

    entry.usage.totalCalls++;
    entry.lastUsed = Date.now();

    if (success) {
      entry.usage.successfulCalls++;
    } else {
      entry.usage.failedCalls++;
      if (error) {
        entry.usage.lastError = error;
      }
    }

    // Update average latency (simple moving average)
    const totalSuccessful = entry.usage.successfulCalls;
    entry.usage.averageLatency =
      (entry.usage.averageLatency * (totalSuccessful - 1) + latency) /
      totalSuccessful;
  }

  async startHealthChecks(): Promise<void> {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(
      () => this.performHealthChecks(),
      this.config.healthCheckInterval,
    );
  }

  async stopHealthChecks(): Promise<void> {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }
  }

  private generateServerId(metadata: McpMetadata): string {
    return `${metadata.name}-${metadata.version}-${Date.now()}`;
  }

  private async performHealthChecks(): Promise<void> {
    const servers = this.getAllServers();

    for (const entry of servers) {
      try {
        // Placeholder for actual health check implementation
        const health = await this.checkServerHealth(entry.id);
        entry.metadata.health = health;
      } catch (error) {
        logger.warn(
          `Health check failed for server ${entry.id}: ${(error as Error).message}`,
        );
      }
    }
  }

  private async checkServerHealth(serverId: string): Promise<MCPServerHealth> {
    // Placeholder implementation
    return {
      status: "healthy",
      lastCheck: Date.now(),
      errors: 0,
      consecutiveErrors: 0,
    };
  }

  private async cleanup(): Promise<void> {
    const cutoffTime =
      Date.now() - this.config.retainUnusedDays * 24 * 60 * 60 * 1000;

    for (const [serverId, entry] of this.servers.entries()) {
      if (!entry.lastUsed || entry.lastUsed < cutoffTime) {
        this.servers.delete(serverId);
        logger.info(`Cleaned up unused MCP server: ${serverId}`);
      }
    }
  }
}

// Singleton registry instance
export const mcpRegistry = new MCPRegistry();
```

### Step 5: Refactor Tool Registry

**File**: `src/lib/mcp/toolRegistry.ts`

```typescript
import type {
  ToolInfo,
  ToolExecutionRequest,
  ToolExecutionResult,
  ExecutionContext,
  MCPError,
} from "./contracts/mcpContract";
import type { JsonObject, JsonValue } from "../types/common";
import { logger } from "../utils/logger";

export type ToolRegistration = {
  tool: ToolInfo;
  serverId: string;
  registered: number;
  lastUsed?: number;
  usage: ToolUsageStats;
};

export type ToolUsageStats = {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  lastError?: MCPError;
};

export type ToolExecutor = {
  execute: (request: ToolExecutionRequest) => Promise<ToolExecutionResult>;
  validate?: (parameters: JsonObject) => boolean;
  metadata: ToolInfo;
};

export class ToolRegistry {
  private tools = new Map<string, ToolRegistration>();
  private executors = new Map<string, ToolExecutor>();

  registerTool(
    tool: ToolInfo,
    serverId: string,
    executor: ToolExecutor,
  ): boolean {
    try {
      const registration: ToolRegistration = {
        tool,
        serverId,
        registered: Date.now(),
        usage: {
          totalExecutions: 0,
          successfulExecutions: 0,
          failedExecutions: 0,
          averageExecutionTime: 0,
        },
      };

      this.tools.set(tool.name, registration);
      this.executors.set(tool.name, executor);

      logger.info(`Tool registered: ${tool.name} from server ${serverId}`);
      return true;
    } catch (error) {
      logger.error(
        `Failed to register tool ${tool.name}: ${(error as Error).message}`,
      );
      return false;
    }
  }

  unregisterTool(toolName: string): boolean {
    try {
      const removed =
        this.tools.delete(toolName) && this.executors.delete(toolName);
      if (removed) {
        logger.info(`Tool unregistered: ${toolName}`);
      }
      return removed;
    } catch (error) {
      logger.error(
        `Failed to unregister tool ${toolName}: ${(error as Error).message}`,
      );
      return false;
    }
  }

  getTool(toolName: string): ToolRegistration | undefined {
    return this.tools.get(toolName);
  }

  getAllTools(): ToolRegistration[] {
    return Array.from(this.tools.values());
  }

  getToolsByServer(serverId: string): ToolRegistration[] {
    return this.getAllTools().filter(
      (registration) => registration.serverId === serverId,
    );
  }

  getToolsByCategory(category: string): ToolRegistration[] {
    return this.getAllTools().filter(
      (registration) => registration.tool.category === category,
    );
  }

  async executeTool(
    toolName: string,
    parameters: JsonObject,
    context: ExecutionContext,
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const registration = this.tools.get(toolName);
    const executor = this.executors.get(toolName);

    if (!registration || !executor) {
      const error: MCPError = {
        code: "METHOD_NOT_FOUND",
        message: `Tool not found: ${toolName}`,
      };

      return {
        success: false,
        error,
        executionTime: Date.now() - startTime,
        metadata: {
          toolName,
          serverId: "unknown",
          executionId: this.generateExecutionId(),
          startTime,
          endTime: Date.now(),
          retryCount: 0,
        },
      };
    }

    try {
      // Validate parameters if validator exists
      if (executor.validate && !executor.validate(parameters)) {
        const error: MCPError = {
          code: "INVALID_PARAMS",
          message: `Invalid parameters for tool: ${toolName}`,
        };

        this.updateToolUsage(toolName, false, Date.now() - startTime, error);

        return {
          success: false,
          error,
          executionTime: Date.now() - startTime,
          metadata: {
            toolName,
            serverId: registration.serverId,
            executionId: this.generateExecutionId(),
            startTime,
            endTime: Date.now(),
            retryCount: 0,
          },
        };
      }

      // Execute tool
      const request: ToolExecutionRequest = {
        toolName,
        parameters,
        context,
      };

      const result = await executor.execute(request);
      const executionTime = Date.now() - startTime;

      this.updateToolUsage(
        toolName,
        result.success,
        executionTime,
        result.error,
      );

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const mcpError: MCPError = {
        code: "INTERNAL_ERROR",
        message: (error as Error).message,
        details: { stack: (error as Error).stack },
      };

      this.updateToolUsage(toolName, false, executionTime, mcpError);

      return {
        success: false,
        error: mcpError,
        executionTime,
        metadata: {
          toolName,
          serverId: registration.serverId,
          executionId: this.generateExecutionId(),
          startTime,
          endTime: Date.now(),
          retryCount: 0,
        },
      };
    }
  }

  private updateToolUsage(
    toolName: string,
    success: boolean,
    executionTime: number,
    error?: MCPError,
  ): void {
    const registration = this.tools.get(toolName);
    if (!registration) return;

    registration.usage.totalExecutions++;
    registration.lastUsed = Date.now();

    if (success) {
      registration.usage.successfulExecutions++;
    } else {
      registration.usage.failedExecutions++;
      if (error) {
        registration.usage.lastError = error;
      }
    }

    // Update average execution time
    const totalSuccessful = registration.usage.successfulExecutions;
    if (totalSuccessful > 0) {
      registration.usage.averageExecutionTime =
        (registration.usage.averageExecutionTime * (totalSuccessful - 1) +
          executionTime) /
        totalSuccessful;
    }
  }

  private generateExecutionId(): string {
    return `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton tool registry instance
export const toolRegistry = new ToolRegistry();
```

### Step 6: Refactor Circuit Breaker

**File**: `src/lib/mcp/mcpCircuitBreaker.ts`

```typescript
import { logger } from "../utils/logger";

export type CircuitBreakerState = "closed" | "open" | "half-open";

export type CircuitBreakerConfig = {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
  minimumCalls: number;
};

export type CircuitBreakerStats = {
  state: CircuitBreakerState;
  failures: number;
  successes: number;
  totalCalls: number;
  lastFailure?: number;
  nextRetryTime?: number;
};

export class MCPCircuitBreaker {
  private state: CircuitBreakerState = "closed";
  private failures = 0;
  private successes = 0;
  private totalCalls = 0;
  private lastFailure?: number;
  private nextRetryTime?: number;

  constructor(
    private config: CircuitBreakerConfig,
    private name: string,
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (!this.canAttemptRetry()) {
        throw new Error(`Circuit breaker is open for ${this.name}`);
      }
      this.state = "half-open";
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.successes++;
    this.totalCalls++;

    if (this.state === "half-open") {
      this.state = "closed";
      this.failures = 0;
      logger.info(`Circuit breaker closed for ${this.name}`);
    }
  }

  private onFailure(): void {
    this.failures++;
    this.totalCalls++;
    this.lastFailure = Date.now();

    if (this.shouldOpenCircuit()) {
      this.state = "open";
      this.nextRetryTime = Date.now() + this.config.recoveryTimeout;
      logger.warn(
        `Circuit breaker opened for ${this.name} after ${this.failures} failures`,
      );
    }
  }

  private shouldOpenCircuit(): boolean {
    return (
      this.totalCalls >= this.config.minimumCalls &&
      this.failures >= this.config.failureThreshold
    );
  }

  private canAttemptRetry(): boolean {
    return this.nextRetryTime !== undefined && Date.now() >= this.nextRetryTime;
  }

  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      totalCalls: this.totalCalls,
      lastFailure: this.lastFailure,
      nextRetryTime: this.nextRetryTime,
    };
  }

  reset(): void {
    this.state = "closed";
    this.failures = 0;
    this.successes = 0;
    this.totalCalls = 0;
    this.lastFailure = undefined;
    this.nextRetryTime = undefined;
    logger.info(`Circuit breaker reset for ${this.name}`);
  }
}

// Circuit breaker factory
export class CircuitBreakerFactory {
  private static breakers = new Map<string, MCPCircuitBreaker>();

  static create(
    name: string,
    config?: Partial<CircuitBreakerConfig>,
  ): MCPCircuitBreaker {
    const existing = this.breakers.get(name);
    if (existing) {
      return existing;
    }

    const defaultConfig: CircuitBreakerConfig = {
      failureThreshold: 5,
      recoveryTimeout: 30000,
      monitoringPeriod: 60000,
      minimumCalls: 10,
    };

    const breaker = new MCPCircuitBreaker(
      { ...defaultConfig, ...config },
      name,
    );

    this.breakers.set(name, breaker);
    return breaker;
  }

  static get(name: string): MCPCircuitBreaker | undefined {
    return this.breakers.get(name);
  }

  static remove(name: string): boolean {
    return this.breakers.delete(name);
  }

  static getAll(): MCPCircuitBreaker[] {
    return Array.from(this.breakers.values());
  }
}
```

## Validation Checklist

### Type Safety Checks

- [ ] All MCP contracts properly typed
- [ ] No `any` types in MCP module
- [ ] Proper generic constraints throughout
- [ ] Tool execution properly typed

### Functionality Checks

- [ ] MCP registry functions correctly
- [ ] Tool registry operates properly
- [ ] Circuit breaker works as expected
- [ ] Error handling is comprehensive

### Integration Checks

- [ ] MCP module integrates with core module
- [ ] CLI can use MCP functionality
- [ ] Provider tools work with MCP

## Verification Commands

```bash
# TypeScript compilation
npx tsc --noEmit src/lib/mcp/*.ts

# Test MCP module
pnpm test src/test/mcp/

# Build with MCP
pnpm run build

# Check MCP exports
node -e "
const mcp = require('./dist/lib/mcp/index.js');
console.log('MCP exports:', Object.keys(mcp));
"
```

## Success Criteria

- ✅ All MCP contracts properly typed
- ✅ Registry systems type-safe
- ✅ Tool execution system properly typed
- ✅ Circuit breaker implementation typed
- ✅ Error handling comprehensive
- ✅ Integration with core module works
- ✅ All MCP tests pass

## Next Steps

After completing this refactor:

1. **06-config-module.md** - Refactor configuration module
2. **07-types-module.md** - Enhance type system
3. Consider implementing actual MCP protocol
4. Add more comprehensive MCP server implementations

## Impact Assessment

**High Impact**:

- MCP system becomes type-safe
- Tool execution becomes more reliable
- Error handling improves significantly

**Medium Impact**:

- Development of MCP features becomes easier
- Integration with providers improves

**Low Impact**:

- Core functionality (MCP is optional)
- Build performance (minimal change)
