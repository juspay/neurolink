# Human-in-the-Loop (HITL) Implementation for NeuroLink

## Technical Specification and Implementation Guide

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Core Components](#core-components)
4. [Implementation Strategy](#implementation-strategy)
5. [Integration Points](#integration-points)
6. [Event Communication System](#event-communication-system)
7. [Configuration Management](#configuration-management)
8. [Code Implementation Details](#code-implementation-details)
9. [Security Considerations](#security-considerations)
10. [Testing Strategy](#testing-strategy)
11. [Deployment Guide](#deployment-guide)
12. [Migration Path](#migration-path)

---

## 1. Executive Summary

### What is Human-in-the-Loop (HITL)?

Human-in-the-Loop (HITL) is a safety mechanism that requires explicit human approval before executing potentially dangerous AI tool operations. Instead of allowing AI to perform destructive actions automatically, HITL pauses execution and requests user confirmation.

### Why NeuroLink Needs HITL

NeuroLink integrates with external MCP (Model Context Protocol) servers that can provide tools for:

- Database operations (DELETE, UPDATE queries)
- File system modifications (file deletion, permission changes)
- API calls (user account deletion, payment processing)
- System administration (service restarts, configuration changes)

Without HITL, a misconfigured prompt could lead to catastrophic data loss or security breaches.

### Our Implementation Approach

We will implement a **registry-level interception pattern** that:

- ✅ Intercepts ALL tool executions at the `toolRegistry.executeTool()` level
- ✅ Uses event-based communication for real-time user interaction
- ✅ Supports argument modification during approval process
- ✅ Maintains 100% backward compatibility
- ✅ Works with all tool types (internal, external MCP, custom tools)

---

## 2. Architecture Overview

### Current NeuroLink Tool Execution Flow

```
User Request → LLM → Tool Selection → toolRegistry.executeTool() → Tool Execution → Response
```

### HITL-Enhanced Tool Execution Flow

```
User Request → LLM → Tool Selection → toolRegistry.executeTool()
    ↓
[HITL Interception Point]
    ↓
Dangerous Tool? → YES → Request User Confirmation → User Approves?
    ↓                                                      ↓
   NO                                               YES → Execute Tool
    ↓                                                      ↓
Execute Tool ←─────────────────────────────────────────────┘
    ↓
Response
```

### Key Architectural Decisions

1. **Single Interception Point**: `toolRegistry.executeTool()` is the natural chokepoint
2. **Event-Based Communication**: Real-time frontend integration via EventEmitter
3. **Configuration-Driven**: Enterprises can customize which tools require approval
4. **Non-Blocking**: User interfaces remain responsive during confirmation
5. **Argument Modification**: Users can edit tool parameters before approval

---

## 3. Core Components

### 3.1 HITLManager Class

The central orchestrator for all confirmation workflows.

**Responsibilities:**

- Generate unique confirmation IDs for tracking
- Send confirmation requests via events
- Wait for user responses with timeout handling
- Process approval/rejection decisions
- Handle argument modifications from users

**Key Methods:**

```typescript
async requestConfirmation(toolName: string, arguments: unknown): Promise<ConfirmationResult>
requiresConfirmation(toolName: string): boolean
generateConfirmationId(): string
processUserResponse(confirmationId: string, response: ConfirmationResponse): void
```

### 3.2 HITL Configuration System

Enterprise-grade configuration management for HITL policies.

**Configuration Structure:**

```typescript
interface HITLConfig {
  enabled: boolean; // Master enable/disable
  dangerousActions: string[]; // Keywords that trigger HITL
  timeout: number; // Confirmation timeout (default: 30s)
  confirmationMethod: "event"; // Communication method
  allowArgumentModification: boolean; // Can users edit parameters?
  auditLogging: boolean; // Log all HITL decisions
  customRules?: HITLRule[]; // Advanced custom rules
}
```

### 3.3 Event Communication Layer

Real-time bidirectional communication between NeuroLink and frontend applications.

**Event Types:**

- `hitl:confirmation-request` - Sent when tool needs approval
- `hitl:confirmation-response` - User's approval/rejection decision
- `hitl:timeout` - Confirmation timed out
- `hitl:cancelled` - Confirmation cancelled by system

### 3.4 Tool Registry Integration

Seamless integration with existing tool registry without breaking changes.

**Integration Pattern:**

- Wrap the existing `executeTool()` method
- Check HITL requirements before execution
- Maintain original method signatures
- Preserve error handling patterns

---

## 4. Implementation Strategy

### Phase 1: Core HITL Infrastructure

1. Create HITLManager class
2. Define configuration interfaces
3. Implement event communication system
4. Add basic dangerous action detection

### Phase 2: Tool Registry Integration

1. Modify `toolRegistry.executeTool()` method
2. Add HITL interception logic
3. Implement confirmation flow
4. Add timeout handling

### Phase 3: NeuroLink Integration

1. Add HITL configuration to NeuroLink constructor
2. Integrate HITLManager with main event emitter
3. Add external MCP server HITL support
4. Implement comprehensive error handling

### Phase 4: Enterprise Features

1. Advanced configuration options
2. Audit logging system
3. Custom rule engine
4. Performance optimizations

### Phase 5: Testing & Documentation

1. Unit tests for all components
2. Integration tests with real MCP servers
3. Frontend integration examples
4. Comprehensive documentation

---

## 5. Integration Points

### 5.1 NeuroLink Constructor Integration

```typescript
// Enhanced constructor signature
constructor(config?: {
  hitl?: HITLConfig;
  conversationMemory?: Partial<ConversationMemoryConfig>;
  enableOrchestration?: boolean;
}) {
  // Initialize HITL if enabled
  if (config?.hitl?.enabled) {
    this.hitlManager = new HITLManager(config.hitl);

    // Inject HITL manager into tool registry
    toolRegistry.setHITLManager(this.hitlManager);

    // Forward HITL events to main emitter
    this.setupHITLEventForwarding();
  }
}
```

### 5.2 Tool Registry Interception

```typescript
// Modified executeTool method in toolRegistry.ts
async executeTool<T = unknown>(
  toolName: string,
  args?: unknown,
  context?: ExecutionContext,
): Promise<T> {
  // NEW: HITL interception logic
  if (this.hitlManager?.requiresConfirmation(toolName)) {
    const confirmationResult = await this.hitlManager.requestConfirmation(
      toolName,
      args,
      context
    );

    if (!confirmationResult.approved) {
      throw new HITLUserRejectedError(
        `User rejected execution of tool: ${toolName}`,
        toolName,
        confirmationResult.reason
      );
    }

    // Use modified arguments if provided by user
    args = confirmationResult.modifiedArguments || args;
  }

  // Continue with original execution logic
  return this.executeToolInternal(toolName, args, context);
}
```

### 5.3 External MCP Server Integration

```typescript
// Modified executeTool in externalServerManager.ts
async executeTool(
  serverId: string,
  toolName: string,
  parameters: JsonObject,
  options?: { timeout?: number },
): Promise<unknown> {
  // Check HITL before executing external tools
  if (this.hitlManager?.requiresConfirmation(toolName)) {
    const confirmationResult = await this.hitlManager.requestConfirmation(
      `${serverId}.${toolName}`,
      parameters,
      { serverId }
    );

    if (!confirmationResult.approved) {
      throw new HITLUserRejectedError(
        `User rejected external tool: ${toolName}`,
        toolName,
        confirmationResult.reason
      );
    }

    parameters = confirmationResult.modifiedArguments || parameters;
  }

  // Continue with external tool execution
  return this.executeExternalToolInternal(serverId, toolName, parameters, options);
}
```

---

## 6. Event Communication System

### 6.1 Confirmation Request Event

```typescript
interface ConfirmationRequestEvent {
  type: "hitl:confirmation-request";
  payload: {
    confirmationId: string; // Unique ID for tracking
    toolName: string; // Name of the tool
    serverId?: string; // MCP server ID (if external tool)
    actionType: string; // Human-readable action description
    arguments: unknown; // Tool parameters (for user review)
    metadata: {
      timestamp: string; // ISO timestamp
      sessionId?: string; // User session
      userId?: string; // User identifier
      dangerousKeywords: string[]; // Triggered keywords
    };
    timeoutMs: number; // Confirmation timeout
    allowModification: boolean; // Can user edit arguments?
  };
}
```

### 6.2 Confirmation Response Event

```typescript
interface ConfirmationResponseEvent {
  type: "hitl:confirmation-response";
  payload: {
    confirmationId: string; // Matching request ID
    approved: boolean; // User decision
    reason?: string; // Optional rejection reason
    modifiedArguments?: unknown; // User-edited parameters
    metadata: {
      timestamp: string; // Response timestamp
      responseTime: number; // Time taken to respond
      userId?: string; // User who responded
    };
  };
}
```

### 6.3 Frontend Integration Example

```typescript
// Frontend event handling
const neurolink = new NeuroLink({
  hitl: { enabled: true, dangerousActions: ["delete", "remove"] },
});

const emitter = neurolink.getEventEmitter();

// Listen for confirmation requests
emitter.on("hitl:confirmation-request", (event) => {
  // Show confirmation dialog to user
  showConfirmationDialog({
    title: `Confirm ${event.payload.actionType}`,
    message: `AI wants to execute: ${event.payload.toolName}`,
    arguments: event.payload.arguments,
    onApprove: (modifiedArgs) => {
      emitter.emit("hitl:confirmation-response", {
        type: "hitl:confirmation-response",
        payload: {
          confirmationId: event.payload.confirmationId,
          approved: true,
          modifiedArguments: modifiedArgs,
          metadata: {
            timestamp: new Date().toISOString(),
            responseTime: Date.now() - event.payload.metadata.timestamp,
            userId: getCurrentUserId(),
          },
        },
      });
    },
    onReject: (reason) => {
      emitter.emit("hitl:confirmation-response", {
        type: "hitl:confirmation-response",
        payload: {
          confirmationId: event.payload.confirmationId,
          approved: false,
          reason,
          metadata: {
            timestamp: new Date().toISOString(),
            responseTime: Date.now() - event.payload.metadata.timestamp,
            userId: getCurrentUserId(),
          },
        },
      });
    },
  });
});
```

---

## 7. Configuration Management

### 7.1 Basic Configuration

```typescript
// Simple HITL setup
const neurolink = new NeuroLink({
  hitl: {
    enabled: true,
    dangerousActions: ["delete", "remove", "update", "drop"],
    timeout: 30000, // 30 seconds
    allowArgumentModification: true,
  },
});
```

### 7.2 Advanced Enterprise Configuration

```typescript
// Enterprise HITL setup with custom rules
const neurolink = new NeuroLink({
  hitl: {
    enabled: true,
    dangerousActions: ["delete", "remove", "update", "drop", "truncate"],
    timeout: 60000, // 60 seconds for enterprise
    allowArgumentModification: true,
    auditLogging: true,
    customRules: [
      {
        name: "database-operations",
        condition: (toolName: string, args: any) =>
          toolName.includes("sql") &&
          args.query?.toLowerCase().includes("drop"),
        requiresConfirmation: true,
        customMessage: "This will permanently delete database data!",
      },
      {
        name: "user-management",
        condition: (toolName: string, args: any) =>
          toolName.includes("user") && args.action === "delete",
        requiresConfirmation: true,
        customMessage: "This will delete a user account!",
      },
    ],
  },
});
```

### 7.3 Environment-Based Configuration

```bash
# .env file
NEUROLINK_HITL_ENABLED=true
NEUROLINK_HITL_TIMEOUT=30000
NEUROLINK_HITL_DANGEROUS_ACTIONS=delete,remove,update,drop,truncate
NEUROLINK_HITL_AUDIT_LOGGING=true
NEUROLINK_HITL_ALLOW_MODIFICATION=true
```

---

## 8. Code Implementation Details

### 8.1 HITLManager Implementation

```typescript
// src/lib/hitl/hitlManager.ts
import { EventEmitter } from "events";
import { randomUUID } from "crypto";

export interface HITLConfig {
  enabled: boolean;
  dangerousActions: string[];
  timeout: number;
  confirmationMethod: "event";
  allowArgumentModification: boolean;
  auditLogging?: boolean;
  customRules?: HITLRule[];
}

export interface HITLRule {
  name: string;
  condition: (toolName: string, args: unknown) => boolean;
  requiresConfirmation: boolean;
  customMessage?: string;
}

export interface ConfirmationRequest {
  confirmationId: string;
  toolName: string;
  arguments: unknown;
  timestamp: number;
  timeoutHandle: NodeJS.Timeout;
  resolve: (result: ConfirmationResult) => void;
  reject: (error: Error) => void;
}

export interface ConfirmationResult {
  approved: boolean;
  reason?: string;
  modifiedArguments?: unknown;
  responseTime: number;
}

export class HITLManager extends EventEmitter {
  private config: HITLConfig;
  private pendingConfirmations: Map<string, ConfirmationRequest> = new Map();

  constructor(config: HITLConfig) {
    super();
    this.config = config;
    this.setupEventHandlers();
  }

  /**
   * Check if a tool requires confirmation based on configuration
   */
  requiresConfirmation(toolName: string, args?: unknown): boolean {
    if (!this.config.enabled) {
      return false;
    }

    // Check dangerous actions keywords
    const lowerToolName = toolName.toLowerCase();
    for (const action of this.config.dangerousActions) {
      if (lowerToolName.includes(action.toLowerCase())) {
        return true;
      }
    }

    // Check custom rules
    if (this.config.customRules) {
      for (const rule of this.config.customRules) {
        if (rule.requiresConfirmation && rule.condition(toolName, args)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Request confirmation for a tool execution
   */
  async requestConfirmation(
    toolName: string,
    arguments_: unknown,
    context?: { serverId?: string; sessionId?: string; userId?: string },
  ): Promise<ConfirmationResult> {
    const confirmationId = this.generateConfirmationId();
    const startTime = Date.now();

    return new Promise<ConfirmationResult>((resolve, reject) => {
      // Set up timeout
      const timeoutHandle = setTimeout(() => {
        this.handleTimeout(confirmationId);
      }, this.config.timeout);

      // Store pending confirmation
      const request: ConfirmationRequest = {
        confirmationId,
        toolName,
        arguments: arguments_,
        timestamp: startTime,
        timeoutHandle,
        resolve,
        reject,
      };

      this.pendingConfirmations.set(confirmationId, request);

      // Emit confirmation request event
      this.emit("hitl:confirmation-request", {
        type: "hitl:confirmation-request",
        payload: {
          confirmationId,
          toolName,
          serverId: context?.serverId,
          actionType: this.generateActionDescription(toolName, arguments_),
          arguments: arguments_,
          metadata: {
            timestamp: new Date(startTime).toISOString(),
            sessionId: context?.sessionId,
            userId: context?.userId,
            dangerousKeywords: this.getTriggeredKeywords(toolName),
          },
          timeoutMs: this.config.timeout,
          allowModification: this.config.allowArgumentModification,
        },
      });

      // Log audit trail if enabled
      if (this.config.auditLogging) {
        this.logAuditEvent("confirmation-requested", {
          confirmationId,
          toolName,
          userId: context?.userId,
          timestamp: startTime,
        });
      }
    });
  }

  /**
   * Process user response to confirmation request
   */
  processUserResponse(
    confirmationId: string,
    response: {
      approved: boolean;
      reason?: string;
      modifiedArguments?: unknown;
      responseTime?: number;
      userId?: string;
    },
  ): void {
    const request = this.pendingConfirmations.get(confirmationId);
    if (!request) {
      console.warn(`No pending confirmation found for ID: ${confirmationId}`);
      return;
    }

    // Clear timeout
    clearTimeout(request.timeoutHandle);

    // Remove from pending
    this.pendingConfirmations.delete(confirmationId);

    // Calculate response time
    const responseTime =
      response.responseTime || Date.now() - request.timestamp;

    // Create result
    const result: ConfirmationResult = {
      approved: response.approved,
      reason: response.reason,
      modifiedArguments: response.modifiedArguments,
      responseTime,
    };

    // Log audit trail if enabled
    if (this.config.auditLogging) {
      this.logAuditEvent("confirmation-responded", {
        confirmationId,
        approved: response.approved,
        reason: response.reason,
        userId: response.userId,
        responseTime,
      });
    }

    // Resolve the promise
    request.resolve(result);
  }

  /**
   * Handle confirmation timeout
   */
  private handleTimeout(confirmationId: string): void {
    const request = this.pendingConfirmations.get(confirmationId);
    if (!request) {
      return;
    }

    // Remove from pending
    this.pendingConfirmations.delete(confirmationId);

    // Log audit trail if enabled
    if (this.config.auditLogging) {
      this.logAuditEvent("confirmation-timeout", {
        confirmationId,
        toolName: request.toolName,
        timeout: this.config.timeout,
      });
    }

    // Emit timeout event
    this.emit("hitl:timeout", {
      type: "hitl:timeout",
      payload: {
        confirmationId,
        toolName: request.toolName,
        timeout: this.config.timeout,
      },
    });

    // Reject with timeout error
    request.reject(
      new HITLTimeoutError(
        `Confirmation timeout for tool: ${request.toolName}`,
        confirmationId,
        this.config.timeout,
      ),
    );
  }

  /**
   * Set up event handlers for processing responses
   */
  private setupEventHandlers(): void {
    this.on("hitl:confirmation-response", (event) => {
      if (event.payload?.confirmationId) {
        this.processUserResponse(event.payload.confirmationId, {
          approved: event.payload.approved,
          reason: event.payload.reason,
          modifiedArguments: event.payload.modifiedArguments,
          responseTime: event.payload.metadata?.responseTime,
          userId: event.payload.metadata?.userId,
        });
      }
    });
  }

  /**
   * Generate unique confirmation ID
   */
  private generateConfirmationId(): string {
    return `hitl-${Date.now()}-${randomUUID()}`;
  }

  /**
   * Generate human-readable action description
   */
  private generateActionDescription(toolName: string, args: unknown): string {
    const lowerToolName = toolName.toLowerCase();

    if (lowerToolName.includes("delete")) return "Delete Operation";
    if (lowerToolName.includes("remove")) return "Remove Operation";
    if (lowerToolName.includes("update")) return "Update Operation";
    if (lowerToolName.includes("create")) return "Create Operation";
    if (lowerToolName.includes("drop")) return "Drop Operation";

    return `Execute ${toolName}`;
  }

  /**
   * Get keywords that triggered HITL
   */
  private getTriggeredKeywords(toolName: string): string[] {
    const triggered: string[] = [];
    const lowerToolName = toolName.toLowerCase();

    for (const action of this.config.dangerousActions) {
      if (lowerToolName.includes(action.toLowerCase())) {
        triggered.push(action);
      }
    }

    return triggered;
  }

  /**
   * Log audit events
   */
  private logAuditEvent(eventType: string, data: Record<string, any>): void {
    console.log(`[HITL Audit] ${eventType}:`, {
      timestamp: new Date().toISOString(),
      eventType,
      ...data,
    });
  }

  /**
   * Get statistics about HITL usage
   */
  getStatistics(): {
    totalRequests: number;
    pendingRequests: number;
    averageResponseTime: number;
  } {
    return {
      totalRequests: 0, // Would be tracked in real implementation
      pendingRequests: this.pendingConfirmations.size,
      averageResponseTime: 0, // Would be calculated from audit logs
    };
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    // Clear all pending confirmations
    for (const [confirmationId, request] of this.pendingConfirmations) {
      clearTimeout(request.timeoutHandle);
      request.reject(
        new Error(`HITL cleanup: confirmation ${confirmationId} cancelled`),
      );
    }
    this.pendingConfirmations.clear();
  }
}
```

### 8.2 Error Classes

```typescript
// src/lib/hitl/hitlErrors.ts
export class HITLError extends Error {
  constructor(
    message: string,
    public readonly confirmationId?: string,
  ) {
    super(message);
    this.name = "HITLError";
  }
}

export class HITLUserRejectedError extends HITLError {
  constructor(
    message: string,
    public readonly toolName: string,
    public readonly reason?: string,
    confirmationId?: string,
  ) {
    super(message);
    this.name = "HITLUserRejectedError";
  }
}

export class HITLTimeoutError extends HITLError {
  constructor(
    message: string,
    confirmationId: string,
    public readonly timeout: number,
  ) {
    super(message);
    this.name = "HITLTimeoutError";
    this.confirmationId = confirmationId;
  }
}

export class HITLConfigurationError extends HITLError {
  constructor(message: string) {
    super(message);
    this.name = "HITLConfigurationError";
  }
}
```

### 8.3 Tool Registry Integration

```typescript
// Modifications to src/lib/mcp/toolRegistry.ts
import { HITLManager } from "../hitl/hitlManager.js";
import { HITLUserRejectedError } from "../hitl/hitlErrors.js";

export class MCPToolRegistry extends MCPRegistry {
  // ... existing properties ...
  private hitlManager?: HITLManager;

  /**
   * Set HITL manager for tool execution interception
   */
  setHITLManager(hitlManager: HITLManager): void {
    this.hitlManager = hitlManager;
    registryLogger.info("HITL manager configured for tool registry");
  }

  /**
   * Execute a tool with HITL interception
   */
  async executeTool<T = unknown>(
    toolName: string,
    args?: unknown,
    context?: ExecutionContext,
  ): Promise<T> {
    const startTime = Date.now();

    try {
      registryLogger.info(`Executing tool with HITL check: ${toolName}`);

      // HITL INTERCEPTION POINT
      if (this.hitlManager?.requiresConfirmation(toolName, args)) {
        registryLogger.info(`Tool requires HITL confirmation: ${toolName}`);

        try {
          const confirmationResult = await this.hitlManager.requestConfirmation(
            toolName,
            args,
            {
              sessionId: context?.sessionId,
              userId: context?.userId,
            },
          );

          if (!confirmationResult.approved) {
            throw new HITLUserRejectedError(
              `User rejected execution of tool: ${toolName}`,
              toolName,
              confirmationResult.reason,
            );
          }

          // Use modified arguments if provided by user
          if (confirmationResult.modifiedArguments !== undefined) {
            args = confirmationResult.modifiedArguments;
            registryLogger.info(
              `Using user-modified arguments for tool: ${toolName}`,
            );
          }

          registryLogger.info(
            `HITL confirmation approved for tool: ${toolName}`,
          );
        } catch (error) {
          registryLogger.warn(
            `HITL confirmation failed for tool: ${toolName}`,
            error,
          );
          throw error;
        }
      }

      // Continue with original execution logic
      return await this.executeToolOriginal(toolName, args, context);
    } catch (error) {
      registryLogger.error(`Tool execution failed: ${toolName}`, error);
      throw error;
    }
  }

  /**
   * Original tool execution logic (renamed to avoid recursion)
   */
  private async executeToolOriginal<T = unknown>(
    toolName: string,
    args?: unknown,
    context?: ExecutionContext,
  ): Promise<T> {
    // ... existing executeTool implementation ...
    // This contains all the original logic from the current executeTool method
  }
}
```

---

## 9. Security Considerations

### 9.1 Authentication & Authorization

```typescript
// Extend HITLConfig for security
interface HITLSecurityConfig {
  requireAuthentication: boolean;
  allowedUsers?: string[];
  allowedRoles?: string[];
  adminOverride?: boolean;
  sessionValidation?: boolean;
}
```

### 9.2 Audit Logging

All HITL decisions should be logged for compliance:

```typescript
interface HITLAuditLog {
  timestamp: string;
  eventType:
    | "confirmation-requested"
    | "confirmation-approved"
    | "confirmation-rejected"
    | "confirmation-timeout";
  toolName: string;
  userId?: string;
  sessionId?: string;
  arguments: unknown;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
  responseTime?: number;
}
```

### 9.3 Argument Sanitization

When users modify arguments, sanitize inputs:

```typescript
function sanitizeUserArguments(
  originalArgs: unknown,
  modifiedArgs: unknown,
): unknown {
  // Prevent injection attacks
  // Validate data types
  // Check against schema
  // Log modifications
  return modifiedArgs;
}
```

---

## 10. Testing Strategy

### 10.1 Unit Tests

```typescript
// tests/hitl/hitlManager.test.ts
describe("HITLManager", () => {
  it("should require confirmation for dangerous tools", () => {
    const hitl = new HITLManager({
      enabled: true,
      dangerousActions: ["delete"],
      timeout: 30000,
      confirmationMethod: "event",
      allowArgumentModification: true,
    });

    expect(hitl.requiresConfirmation("deleteUser")).toBe(true);
    expect(hitl.requiresConfirmation("getUser")).toBe(false);
  });

  it("should handle user approval correctly", async () => {
    const hitl = new HITLManager(defaultConfig);

    // Start confirmation request
    const confirmationPromise = hitl.requestConfirmation("deleteFile", {
      path: "/test.txt",
    });

    // Simulate user approval
    setTimeout(() => {
      hitl.processUserResponse("test-id", {
        approved: true,
        responseTime: 1000,
      });
    }, 100);

    const result = await confirmationPromise;
    expect(result.approved).toBe(true);
  });

  it("should handle timeout correctly", async () => {
    const hitl = new HITLManager({
      ...defaultConfig,
      timeout: 100, // Very short timeout
    });

    await expect(
      hitl.requestConfirmation("deleteFile", { path: "/test.txt" }),
    ).rejects.toThrow(HITLTimeoutError);
  });
});
```

### 10.2 Integration Tests

```typescript
// tests/integration/hitl-integration.test.ts
describe('HITL Integration with LLM-Driven Tool Usage', () => {
  it('should intercept dangerous tools during AI generation', async () => {
    // Setup NeuroLink with HITL and file management tools available
    const neurolink = new NeuroLink({
      hitl: {
        enabled: true,
        dangerousActions: ['delete', 'remove', 'drop'],
        timeout: 30000,
        confirmationMethod: 'event',
        allowArgumentModification: true,
        auditLogging: true
      }
    });

    // Configure environment with external MCP server containing file tools
    // (This simulates real-world setup where dangerous tools come from MCP servers)
    
    let hitlTriggered = false;
    let toolName = '';
    let toolArgs = {};

    // Setup HITL event handling
    const emitter = neurolink.getEventEmitter();
    emitter.on('hitl:confirmation-request', (event) => {
      hitlTriggered = true;
      toolName = event.payload.toolName;
      toolArgs = event.payload.arguments;

      // Simulate user approval after reviewing the request
      setTimeout(() => {
        emitter.emit('hitl:confirmation-response', {
          type: 'hitl:confirmation-response',
          payload: {
            confirmationId: event.payload.confirmationId,
            approved: true,
            metadata: {
              timestamp: new Date().toISOString(),
              responseTime: 2000,
              userId: 'test-user'
            }
          }
        });
      }, 100);
    });

    // REALISTIC SCENARIO: AI generation that naturally leads to tool usage
    const response = await neurolink.generate({
      prompt: "I need to clean up my project by removing all temporary files ending with .tmp in the current directory. Please delete them for me.",
      enableToolUse: true,
      maxTokens: 500,
      provider: 'google-vertex'
    });

    // Verify HITL was triggered when LLM tried to use dangerous file deletion tools
    expect(hitlTriggered).toBe(true);
    expect(toolName).toMatch(/delete|remove|clean/i);
    expect(toolArgs).toBeDefined();
    expect(response).toContain('file'); // Response should mention file operations
    expect(response.length).toBeGreaterThan(10); // Should have substantial response
  });

  it('should handle external MCP server tools through generate', async () => {
    const neurolink = new NeuroLink({
      hitl: {
        enabled: true,
        dangerousActions: ['sql', 'drop', 'delete', 'truncate'],
        timeout: 30000,
        confirmationMethod: 'event',
        allowArgumentModification: true
      }
    });

    let hitlIntercepted = false;
    let sqlQuery = '';

    const emitter = neurolink.getEventEmitter();
    emitter.on('hitl:confirmation-request', (event) => {
      hitlIntercepted = true;
      sqlQuery = event.payload.arguments?.query || '';

      // User reviews and modifies the dangerous SQL query
      const saferQuery = sqlQuery.replace('DROP TABLE', 'SELECT * FROM');
      
      emitter.emit('hitl:confirmation-response', {
        type: 'hitl:confirmation-response',
        payload: {
          confirmationId: event.payload.confirmationId,
          approved: true,
          modifiedArguments: {
            ...event.payload.arguments,
            query: saferQuery
          },
          metadata: {
            timestamp: new Date().toISOString(),
            responseTime: 3500,
            userId: 'admin-user'
          }
        }
      });
    });

    // REALISTIC SCENARIO: Database management request
    const response = await neurolink.generate({
      prompt: "I want to remove all user data from the users table in the database. Execute the necessary SQL command.",
      enableToolUse: true,
      maxTokens: 300,
      provider: 'google-vertex'
    });

    expect(hitlIntercepted).toBe(true);
    expect(sqlQuery).toMatch(/drop|delete|truncate/i);
    expect(response).toContain('database'); // Response should mention database operations
    expect(response.length).toBeGreaterThan(20); // Should have meaningful response
  });

  it('should work with streaming AI responses and tool calls', async () => {
    const neurolink = new NeuroLink({
      hitl: {
        enabled: true,
        dangerousActions: ['restart', 'stop', 'kill', 'shutdown'],
        timeout: 45000,
        confirmationMethod: 'event',
        allowArgumentModification: false
      }
    });

    let hitlEvents = [];
    const emitter = neurolink.getEventEmitter();
    
    emitter.on('hitl:confirmation-request', (event) => {
      hitlEvents.push(event);
      
      // Simulate thoughtful user decision after reviewing system impact
      setTimeout(() => {
        emitter.emit('hitl:confirmation-response', {
          type: 'hitl:confirmation-response',
          payload: {
            confirmationId: event.payload.confirmationId,
            approved: event.payload.toolName.includes('restart'), // Allow restart, deny others
            reason: event.payload.toolName.includes('restart') ? 
              'Restart approved for maintenance' : 
              'System shutdown denied - too risky',
            metadata: {
              timestamp: new Date().toISOString(),
              responseTime: 5000,
              userId: 'system-admin'
            }
          }
        });
      }, 200);
    });

    // REALISTIC SCENARIO: System administration through streaming
    const stream = await neurolink.stream({
      prompt: "The server is experiencing high memory usage. Please restart the web service and stop any non-essential background processes to optimize performance.",
      enableToolUse: true,
      maxTokens: 600,
      provider: 'google-vertex'
    });

    let finalResponse = '';
    for await (const chunk of stream) {
      finalResponse += chunk.content || '';
    }

    expect(hitlEvents.length).toBeGreaterThan(0);
    expect(finalResponse).toContain('server'); // Response should mention server operations
    expect(finalResponse.length).toBeGreaterThan(50); // Should have detailed response about server management
  });

  it('should prevent unauthorized AI actions without user approval', async () => {
    const neurolink = new NeuroLink({
      hitl: {
        enabled: true,
        dangerousActions: ['payment', 'charge', 'refund', 'transfer'],
        timeout: 20000,
        confirmationMethod: 'event',
        allowArgumentModification: true
      }
    });

    let hitlRequestReceived = false;
    
    const emitter = neurolink.getEventEmitter();
    emitter.on('hitl:confirmation-request', (event) => {
      hitlRequestReceived = true;
      
      // Simulate user rejection of financial transaction
      setTimeout(() => {
        emitter.emit('hitl:confirmation-response', {
          type: 'hitl:confirmation-response',
          payload: {
            confirmationId: event.payload.confirmationId,
            approved: false,
            reason: 'Financial transactions require explicit authorization',
            metadata: {
              timestamp: new Date().toISOString(),
              responseTime: 1500,
              userId: 'finance-user'
            }
          }
        });
      }, 100);
    });

    // REALISTIC SCENARIO: AI tries to process payment - should be blocked
    await expect(
      neurolink.generate({
        prompt: "Customer account shows unpaid balance. Please charge their credit card $299.99 for the monthly subscription.",
        enableToolUse: true,
        maxTokens: 400,
        provider: 'google-vertex'
      })
    ).rejects.toThrow(/rejected|denied/i);

    expect(hitlRequestReceived).toBe(true);
  });

  it('should handle custom rules for complex tool scenarios', async () => {
    const neurolink = new NeuroLink({
      hitl: {
        enabled: true,
        dangerousActions: ['email'],
        timeout: 30000,
        confirmationMethod: 'event',
        allowArgumentModification: true,
        customRules: [
          {
            name: 'bulk-email-protection',
            condition: (toolName, args) => 
              toolName.includes('email') && 
              Array.isArray(args?.recipients) && 
              args.recipients.length > 10,
            requiresConfirmation: true,
            customMessage: 'This will send emails to more than 10 recipients!'
          },
          {
            name: 'external-email-protection', 
            condition: (toolName, args) =>
              toolName.includes('email') &&
              args?.recipients?.some(email => !email.includes('@company.com')),
            requiresConfirmation: true,
            customMessage: 'This will send emails to external recipients!'
          }
        ]
      }
    });

    let hitlCustomRuleTriggered = false;
    let customMessage = '';

    const emitter = neurolink.getEventEmitter();
    emitter.on('hitl:confirmation-request', (event) => {
      hitlCustomRuleTriggered = true;
      customMessage = event.payload.customMessage || '';
      
      emitter.emit('hitl:confirmation-response', {
        type: 'hitl:confirmation-response',
        payload: {
          confirmationId: event.payload.confirmationId,
          approved: true,
          modifiedArguments: {
            ...event.payload.arguments,
            recipients: event.payload.arguments.recipients.filter(email => 
              email.includes('@company.com')
            )
          },
          metadata: {
            timestamp: new Date().toISOString(),
            responseTime: 4000,
            userId: 'marketing-manager'
          }
        }
      });
    });

    // REALISTIC SCENARIO: Bulk email campaign with external recipients
    await neurolink.generate({
      prompt: "Send a product announcement email to all users in our customer database, including external partners and clients.",
      enableToolUse: true,
      maxTokens: 500,
      provider: 'google-vertex'
    });

    expect(hitlCustomRuleTriggered).toBe(true);
    expect(customMessage).toContain('external recipients');
    expect(response).toContain('email'); // Response should mention email operations
    expect(response.length).toBeGreaterThan(30); // Should have meaningful email-related response
  });
});

describe('HITL Real-World Integration Scenarios', () => {
  it('should handle code deployment scenarios', async () => {
    const neurolink = new NeuroLink({
      hitl: {
        enabled: true,
        dangerousActions: ['deploy', 'release', 'publish', 'push'],
        timeout: 60000, // Longer timeout for deployment decisions
        confirmationMethod: 'event',
        allowArgumentModification: true
      }
    });

    let deploymentDetails = {};
    
    const emitter = neurolink.getEventEmitter();
    emitter.on('hitl:confirmation-request', (event) => {
      deploymentDetails = event.payload.arguments;
      
      // Simulate code review and approval
      setTimeout(() => {
        emitter.emit('hitl:confirmation-response', {
          type: 'hitl:confirmation-response',
          payload: {
            confirmationId: event.payload.confirmationId,
            approved: true,
            modifiedArguments: {
              ...event.payload.arguments,
              environment: 'staging', // Change from production to staging
              runTests: true
            },
            metadata: {
              timestamp: new Date().toISOString(),
              responseTime: 8000,
              userId: 'dev-lead'
            }
          }
        });
      }, 300);
    });

    // REALISTIC SCENARIO: AI-driven deployment management
    await neurolink.generate({
      prompt: "The latest code changes are ready. Please deploy the application to production with the new features enabled.",
      enableToolUse: true,
      maxTokens: 400,
      provider: 'google-vertex'
    });

    expect(deploymentDetails).toBeDefined();
    expect(deploymentDetails).toHaveProperty('environment'); // Should have environment details
    expect(typeof deploymentDetails.environment).toBe('string');
    expect(response).toContain('deploy'); // Response should mention deployment
    expect(response.length).toBeGreaterThan(40); // Should have detailed deployment response
  });
});
```
