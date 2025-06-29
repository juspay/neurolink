/**
 * MCP Abstract Contract - The Foundation of NeuroLink's Plugin Ecosystem
 * Based on research blueprint for extensible MCP architecture
 */

import type { ZodSchema } from "zod";

/**
 * Metadata structure for MCP plugins following manifest-based discovery
 */
export interface MCPMetadata {
  /** Unique NPM-style package name */
  name: string;
  /** Semantic version */
  version: string;
  /** Entry point path */
  main: string;
  /** Compatible NeuroLink version range */
  engine?: {
    neurolink: string;
  };
  /** Human-readable description */
  description?: string;
  /** Author/tool that configured this */
  author?: string;
  /** Category/type of plugin */
  category?: string;
  /** Declarative permissions array for security */
  permissions: string[];
  /** JSON Schema for configuration validation */
  configSchema?: ZodSchema | object;
}

/**
 * Execution Context - Security Sandbox for MCP Operations
 * Provides sandboxed access to system resources with permission checking
 */
export interface ExecutionContext {
  /** Session identifier for tracking */
  sessionId: string;
  /** User identifier for permissions */
  userId: string;
  /** Sandboxed filesystem operations */
  secureFS: {
    readFile: (path: string, encoding?: string) => Promise<string | Buffer>;
    writeFile: (path: string, content: string | Buffer) => Promise<void>;
    readdir: (path: string) => Promise<string[]>;
    stat: (path: string) => Promise<any>;
    mkdir: (path: string, options?: any) => Promise<void>;
    exists: (path: string) => Promise<boolean>;
  };
  /** Sandboxed path operations */
  path: {
    join: (...paths: string[]) => string;
    resolve: (...paths: string[]) => string;
    relative: (from: string, to: string) => string;
    dirname: (path: string) => string;
    basename: (path: string, ext?: string) => string;
  };
  /** Sandboxed network operations (future) */
  secureNet?: {
    fetch: (url: string, options?: any) => Promise<Response>;
  };
  /** Plugin-specific permissions granted */
  grantedPermissions: string[];
  /** Log function for debugging */
  log: (
    level: "debug" | "info" | "warn" | "error",
    message: string,
    data?: any,
  ) => void;
  /** Plugin instance reference (for plugin bridge compatibility) */
  plugin?: any;
}

/**
 * MCP Abstract Class - The Core Contract for All Plugins
 * Uses TypeScript generics for type-safe configuration
 */
export abstract class MCP<TConfig = any, TArgs = any, TResult = any> {
  /** Static metadata loaded from manifest */
  abstract readonly metadata: MCPMetadata;

  /** Configuration state - accessible to child classes */
  public config?: TConfig;

  /** Initialization flag */
  protected initialized = false;

  /**
   * Initialize the MCP with user-provided configuration
   * @param config - Plugin-specific configuration object
   */
  abstract initialize(config: TConfig): Promise<void>;

  /**
   * Execute the MCP's primary functionality
   * @param context - Sandboxed execution context
   * @param args - Operation-specific arguments
   * @returns Plugin-specific result
   */
  abstract execute(context: ExecutionContext, args: TArgs): Promise<TResult>;

  /**
   * Graceful shutdown and resource cleanup
   */
  abstract dispose(): Promise<void>;

  /**
   * Get the current configuration
   */
  getConfig(): TConfig | undefined {
    return this.config;
  }

  /**
   * Check if the MCP is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get plugin metadata
   */
  getMetadata(): MCPMetadata {
    return this.metadata;
  }

  /**
   * Validate that the MCP is ready for execution
   */
  protected ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error(
        `MCP ${this.metadata.name} is not initialized. Call initialize() first.`,
      );
    }
  }

  /**
   * Helper method for logging with context
   */
  protected log(
    context: ExecutionContext,
    level: "debug" | "info" | "warn" | "error",
    message: string,
    data?: any,
  ): void {
    context.log(level, `[${this.metadata.name}] ${message}`, data);
  }
}

/**
 * Type definitions for plugin registry
 */
export type MCPConstructor<T extends MCP = MCP> = new () => T;
export type MCPInstance<T extends MCP = MCP> = T;

/**
 * Plugin discovery result
 */
export interface DiscoveredMCP {
  metadata: MCPMetadata;
  entryPath: string;
  source: "core" | "project" | "installed";
  constructor?: MCPConstructor;
  external?: {
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    transport?: "stdio" | "sse";
    url?: string;
    cwd?: string;
    tool?: string;
    type?: "global" | "workspace";
  };
}

/**
 * Plugin load result
 */
export interface PluginLoadResult {
  success: boolean;
  plugin?: MCP;
  error?: string;
}

/**
 * Plugin discovery result
 */
export interface PluginDiscoveryResult {
  total: number;
  loaded: number;
  failed: number;
  plugins: DiscoveredMCP[];
}

/**
 * Plugin execution result
 */
export interface PluginExecutionResult<T = any> {
  success: boolean;
  result?: T;
  error?: string;
  executionTime?: number;
}

/**
 * MCP Category for organization
 */
export enum MCPCategory {
  FILESYSTEM = "filesystem",
  NETWORK = "network",
  DATABASE = "database",
  AI = "ai",
  UTILITY = "utility",
  INTEGRATION = "integration",
}
