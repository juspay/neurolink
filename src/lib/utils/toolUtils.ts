/**
 * Tool Utilities - Centralized tool configuration access
 *
 * Consolidates environment variable access to avoid scattered process.env calls
 */

import type { ToolConfig } from "../types/configTypes.js";

/**
 * Check if built-in tools should be disabled
 * Centralized function to replace direct process.env access
 *
 * @param toolConfig - Optional tool configuration (if available from config)
 * @returns true if built-in tools should be disabled
 */
export function shouldDisableBuiltinTools(toolConfig?: ToolConfig): boolean {
  // Priority: explicit config > environment variable > default (false)
  if (toolConfig?.disableBuiltinTools !== undefined) {
    return toolConfig.disableBuiltinTools;
  }

  // Single source of truth for environment variable access
  return process.env.NEUROLINK_DISABLE_BUILTIN_TOOLS === "true";
}

/**
 * Check if custom tools should be allowed
 * @param toolConfig - Optional tool configuration
 * @returns true if custom tools should be allowed
 */
export function shouldAllowCustomTools(toolConfig?: ToolConfig): boolean {
  if (toolConfig?.allowCustomTools !== undefined) {
    return toolConfig.allowCustomTools;
  }

  return process.env.NEUROLINK_DISABLE_CUSTOM_TOOLS !== "true";
}

/**
 * Check if MCP tools should be enabled
 * @param toolConfig - Optional tool configuration
 * @returns true if MCP tools should be enabled
 */
export function shouldEnableMCPTools(toolConfig?: ToolConfig): boolean {
  if (toolConfig?.enableMCPTools !== undefined) {
    return toolConfig.enableMCPTools;
  }

  return process.env.NEUROLINK_DISABLE_MCP_TOOLS !== "true";
}

/**
 * Get maximum tools per provider
 * @param toolConfig - Optional tool configuration
 * @returns maximum number of tools per provider
 */
export function getMaxToolsPerProvider(toolConfig?: ToolConfig): number {
  if (toolConfig?.maxToolsPerProvider !== undefined) {
    return toolConfig.maxToolsPerProvider;
  }

  const envMax = process.env.NEUROLINK_MAX_TOOLS_PER_PROVIDER;
  if (envMax) {
    const parsed = parseInt(envMax, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return 100; // Default
}
