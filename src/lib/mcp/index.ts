/**
 * MCP Ecosystem - Main Export
 * Universal AI Development Platform with Extensible Plugin Architecture
 * Implementation based on research blueprint
 */

// Core contracts and types
export { MCP } from "./contracts/mcp-contract.js";
export type {
  MCPMetadata,
  ExecutionContext,
  MCPConstructor,
  MCPInstance,
  DiscoveredMCP,
} from "./contracts/mcp-contract.js";

// Main ecosystem interface
export { MCPEcosystem, mcpEcosystem } from "./ecosystem.js";

// Plugin management
export { PluginManager, pluginManager } from "./plugin-manager.js";

// Security
export { SecurityManager } from "./security-manager.js";

// Logging
export { mcpLogger } from "./logging.js";
export type { LogLevel } from "./logging.js";

// Core plugins
export { FileSystemMCP } from "./plugins/core/filesystem-mcp.js";

/**
 * Quick access functions for common MCP operations
 */

// Import the ecosystem singleton
import { mcpEcosystem } from "./ecosystem.js";
import type { MCPMetadata } from "./contracts/mcp-contract.js";

/**
 * Initialize the MCP ecosystem
 */
export async function initializeMCPEcosystem(): Promise<void> {
  return mcpEcosystem.initialize();
}

/**
 * List available MCPs
 */
export async function listMCPs(): Promise<MCPMetadata[]> {
  return mcpEcosystem.list();
}

/**
 * Execute an MCP operation
 */
export async function executeMCP<T = any>(
  name: string,
  config: any,
  args: any,
  context?: {
    sessionId?: string;
    userId?: string;
  },
): Promise<T> {
  return mcpEcosystem.execute<T>(name, config, args, context);
}

/**
 * Quick filesystem operations
 */
export async function readFile(path: string, basePath?: string): Promise<any> {
  return mcpEcosystem.filesystem({
    action: "readFile",
    path,
    basePath,
  });
}

export async function writeFile(
  path: string,
  content: string,
  basePath?: string,
): Promise<any> {
  return mcpEcosystem.filesystem({
    action: "writeFile",
    path,
    content,
    basePath,
  });
}

export async function listFiles(path: string, basePath?: string): Promise<any> {
  return mcpEcosystem.filesystem({
    action: "listFiles",
    path,
    basePath,
  });
}

export async function createDirectory(
  path: string,
  basePath?: string,
): Promise<any> {
  return mcpEcosystem.filesystem({
    action: "createDir",
    path,
    basePath,
  });
}

/**
 * Get MCP ecosystem statistics
 */
export async function getMCPStats(): Promise<{
  initialized: boolean;
  pluginsDiscovered: number;
  pluginsBySource: Record<string, number>;
  availablePlugins: string[];
}> {
  return mcpEcosystem.getStats();
}
