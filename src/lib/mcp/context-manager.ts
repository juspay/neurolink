/**
 * NeuroLink MCP Context Management System
 * Unified context creation and management for all tool executions
 * Ensures rich context flows through tool chain with session tracking
 */

import type { NeuroLinkExecutionContext } from "./factory.js";

/**
 * Context creation request interface
 */
export interface ContextRequest {
  // Session Management
  sessionId?: string;
  userId?: string;

  // AI Provider Context
  aiProvider?: string;
  modelId?: string;
  temperature?: number;
  maxTokens?: number;

  // Business Context
  organizationId?: string;
  projectId?: string;
  environmentType?: "development" | "staging" | "production";

  // Framework Context
  frameworkType?: "react" | "vue" | "svelte" | "next" | "nuxt" | "sveltekit";

  // Security & Permissions
  permissions?: string[];
  securityLevel?: "public" | "private" | "organization";

  // Custom context extensions
  [key: string]: any;
}

/**
 * Context manager for creating and managing execution contexts
 * Provides rich context for all tool executions with session tracking
 */
export class ContextManager {
  private sessionCounter: number = 0;
  private activeContexts: Map<string, NeuroLinkExecutionContext> = new Map();

  /**
   * Create a new execution context with rich information
   *
   * @param request Context creation request with optional fields
   * @returns Complete execution context ready for tool chain
   */
  createContext(request: ContextRequest = {}): NeuroLinkExecutionContext {
    // Generate session ID if not provided
    const sessionId = request.sessionId || this.generateSessionId();

    // Create comprehensive context
    const context: NeuroLinkExecutionContext = {
      // Session Management
      sessionId,
      userId: request.userId || "unknown-user",

      // Required ExecutionContext properties
      secureFS: {
        readFile: async (path: string, encoding?: string) => {
          const fs = await import("fs/promises");
          if (encoding) {
            return fs.readFile(path, { encoding: encoding as BufferEncoding });
          } else {
            return fs.readFile(path);
          }
        },
        writeFile: async (path: string, content: string | Buffer) => {
          const fs = await import("fs/promises");
          return fs.writeFile(path, content);
        },
        readdir: async (path: string) => {
          const fs = await import("fs/promises");
          return fs.readdir(path);
        },
        stat: async (path: string) => {
          const fs = await import("fs/promises");
          return fs.stat(path);
        },
        mkdir: async (path: string, options?: any) => {
          const fs = await import("fs/promises");
          await fs.mkdir(path, options);
        },
        exists: async (path: string) => {
          const fs = await import("fs/promises");
          try {
            await fs.access(path);
            return true;
          } catch {
            return false;
          }
        },
      },
      path: {
        join: (...paths: string[]) => {
          const path = require("path");
          return path.join(...paths);
        },
        resolve: (...paths: string[]) => {
          const path = require("path");
          return path.resolve(...paths);
        },
        relative: (from: string, to: string) => {
          const path = require("path");
          return path.relative(from, to);
        },
        dirname: (path: string) => {
          const pathModule = require("path");
          return pathModule.dirname(path);
        },
        basename: (path: string, ext?: string) => {
          const pathModule = require("path");
          return pathModule.basename(path, ext);
        },
      },
      grantedPermissions: request.permissions || [],
      log: (
        level: "debug" | "info" | "warn" | "error",
        message: string,
        data?: any,
      ) => {
        // Use logger if available, otherwise console
        try {
          const { logger } = require("../utils/logger.js");
          logger[level](message, data);
        } catch {
          console[level === "debug" ? "log" : level](message, data);
        }
      },

      // AI Provider Context (from existing NeuroLink)
      aiProvider: request.aiProvider,
      modelId: request.modelId,
      temperature: request.temperature,
      maxTokens: request.maxTokens,

      // Business Context (new for MCP)
      organizationId: request.organizationId,
      projectId: request.projectId,
      environmentType: request.environmentType || "development",

      // Framework Context (new for MCP)
      frameworkType: request.frameworkType,

      // Tool Execution Context (initialized empty)
      toolChain: [],
      parentToolId: undefined,

      // Security & Permissions
      permissions: request.permissions || [],
      securityLevel: request.securityLevel || "private",

      // Copy any additional custom fields
      ...this.extractCustomFields(request),
    };

    // Store context for session management
    this.activeContexts.set(sessionId, context);

    return context;
  }

  /**
   * Add a tool to the execution chain
   *
   * @param context Execution context to modify
   * @param toolName Name of the tool being executed
   */
  addToToolChain(context: NeuroLinkExecutionContext, toolName: string): void {
    if (!context.toolChain) {
      context.toolChain = [];
    }

    context.toolChain.push(toolName);

    // Update the active context
    this.activeContexts.set(context.sessionId, context);
  }

  /**
   * Get the current tool chain for a context
   *
   * @param context Execution context
   * @returns Array of tool names in execution order
   */
  getToolChain(context: NeuroLinkExecutionContext): string[] {
    return context.toolChain || [];
  }

  /**
   * Set parent tool for nested tool execution
   *
   * @param context Execution context to modify
   * @param parentToolId ID of the parent tool
   */
  setParentTool(
    context: NeuroLinkExecutionContext,
    parentToolId: string,
  ): void {
    context.parentToolId = parentToolId;
    this.activeContexts.set(context.sessionId, context);
  }

  /**
   * Create child context for nested tool execution
   *
   * @param parentContext Parent execution context
   * @param childToolName Name of the child tool
   * @returns New child context with inherited properties
   */
  createChildContext(
    parentContext: NeuroLinkExecutionContext,
    childToolName: string,
  ): NeuroLinkExecutionContext {
    const childContext: NeuroLinkExecutionContext = {
      // Inherit all parent context
      ...parentContext,

      // Create new session ID for child
      sessionId: this.generateSessionId(),

      // Set parent tool reference
      parentToolId:
        parentContext.toolChain?.[parentContext.toolChain.length - 1],

      // Reset tool chain for child (will be populated as child executes tools)
      toolChain: [],
    };

    // Store child context
    this.activeContexts.set(childContext.sessionId, childContext);

    return childContext;
  }

  /**
   * Get context by session ID
   *
   * @param sessionId Session identifier
   * @returns Execution context or undefined if not found
   */
  getContext(sessionId: string): NeuroLinkExecutionContext | undefined {
    return this.activeContexts.get(sessionId);
  }

  /**
   * Update context with new information
   *
   * @param sessionId Session identifier
   * @param updates Partial context updates
   */
  updateContext(
    sessionId: string,
    updates: Partial<NeuroLinkExecutionContext>,
  ): void {
    const context = this.activeContexts.get(sessionId);
    if (context) {
      const updatedContext = { ...context, ...updates };
      this.activeContexts.set(sessionId, updatedContext);
    }
  }

  /**
   * Store context directly (used when session ID changes)
   *
   * @param context Complete execution context to store
   */
  storeContext(context: NeuroLinkExecutionContext): void {
    this.activeContexts.set(context.sessionId, context);
  }

  /**
   * Remove context from active tracking
   *
   * @param sessionId Session identifier
   */
  removeContext(sessionId: string): void {
    this.activeContexts.delete(sessionId);
  }

  /**
   * Get all active contexts (for debugging/monitoring)
   *
   * @returns Array of all active contexts
   */
  getActiveContexts(): NeuroLinkExecutionContext[] {
    return Array.from(this.activeContexts.values());
  }

  /**
   * Clear all active contexts
   */
  clearAllContexts(): void {
    this.activeContexts.clear();
    this.sessionCounter = 0;
  }

  /**
   * Get context statistics
   *
   * @returns Context usage statistics
   */
  getStats(): {
    activeContexts: number;
    totalSessionsCreated: number;
    averageToolChainLength: number;
  } {
    const contexts = Array.from(this.activeContexts.values());
    const totalToolChainLength = contexts.reduce(
      (sum, ctx) => sum + (ctx.toolChain?.length || 0),
      0,
    );

    return {
      activeContexts: contexts.length,
      totalSessionsCreated: this.sessionCounter,
      averageToolChainLength:
        contexts.length > 0 ? totalToolChainLength / contexts.length : 0,
    };
  }

  /**
   * Generate unique session ID
   *
   * @returns Unique session identifier
   */
  private generateSessionId(): string {
    this.sessionCounter++;
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `nlmcp-${timestamp}-${this.sessionCounter}-${random}`;
  }

  /**
   * Extract custom fields from request (excluding known fields)
   *
   * @param request Context creation request
   * @returns Custom fields object
   */
  private extractCustomFields(request: ContextRequest): Record<string, any> {
    const knownFields = new Set([
      "sessionId",
      "userId",
      "aiProvider",
      "modelId",
      "temperature",
      "maxTokens",
      "organizationId",
      "projectId",
      "environmentType",
      "frameworkType",
      "permissions",
      "securityLevel",
    ]);

    const customFields: Record<string, any> = {};

    for (const [key, value] of Object.entries(request)) {
      if (!knownFields.has(key)) {
        customFields[key] = value;
      }
    }

    return customFields;
  }
}

/**
 * Default context manager instance
 * Can be used across the application for consistent context management
 */
export const defaultContextManager = new ContextManager();

/**
 * Utility function to create context with defaults
 *
 * @param request Optional context request
 * @returns Execution context with sensible defaults
 */
export function createExecutionContext(
  request: ContextRequest = {},
): NeuroLinkExecutionContext {
  return defaultContextManager.createContext(request);
}

/**
 * Utility function to add tool to default context manager
 *
 * @param context Execution context
 * @param toolName Tool name to add
 */
export function addToolToChain(
  context: NeuroLinkExecutionContext,
  toolName: string,
): void {
  defaultContextManager.addToToolChain(context, toolName);
}

/**
 * Context validation utilities
 */
export class ContextValidator {
  /**
   * Validate context has required fields for tool execution
   *
   * @param context Execution context to validate
   * @returns Validation result with details
   */
  static validateContext(context: NeuroLinkExecutionContext): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required field validation
    if (!context.sessionId) {
      errors.push("sessionId is required");
    }

    // Optional field validation with warnings
    if (!context.environmentType) {
      warnings.push("environmentType not specified, defaulting to development");
    }

    if (!context.securityLevel) {
      warnings.push("securityLevel not specified, defaulting to private");
    }

    // Tool chain validation
    if (context.toolChain && context.toolChain.length > 10) {
      warnings.push(
        "Tool chain is getting long (>10 tools), consider breaking into smaller workflows",
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate context permissions for tool execution
   *
   * @param context Execution context
   * @param requiredPermissions Permissions required by tool
   * @returns Whether context has required permissions
   */
  static hasPermissions(
    context: NeuroLinkExecutionContext,
    requiredPermissions: string[],
  ): boolean {
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const contextPermissions = context.permissions || [];

    // Check if context has all required permissions
    return requiredPermissions.every(
      (permission) =>
        contextPermissions.includes(permission) ||
        contextPermissions.includes("*"), // Wildcard permission
    );
  }
}
