/**
 * Enhanced Tool Discovery Service
 *
 * Extends the base tool discovery service with additional features:
 * - Tool annotation support
 * - Multi-server coordination
 * - Advanced filtering and search
 * - Tool versioning and compatibility checking
 *
 * @module mcp/enhancedToolDiscovery
 * @since 8.39.0
 */

import { EventEmitter } from "events";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { ExternalMCPToolInfo } from "../types/externalMcp.js";
import type { MCPServerInfo, ToolDiscoveryResult } from "../types/mcpTypes.js";
import type { JsonObject } from "../types/common.js";
import { logger } from "../utils/logger.js";
import { withTimeout } from "../utils/async/withTimeout.js";
import { ErrorFactory } from "../utils/errorHandling.js";
import {
  inferAnnotations,
  type MCPToolAnnotations,
} from "./toolAnnotations.js";
import { MultiServerManager, type UnifiedTool } from "./multiServerManager.js";

/**
 * Enhanced tool info with annotations
 */
export type EnhancedToolInfo = ExternalMCPToolInfo & {
  annotations?: MCPToolAnnotations;
  version?: string;
  compatibleWith?: string[];
  aliases?: string[];
  examples?: Array<{
    name: string;
    description: string;
    params: JsonObject;
  }>;
};

/**
 * Tool search criteria
 */
export type ToolSearchCriteria = {
  /**
   * Search by name (partial match)
   */
  name?: string;

  /**
   * Search by description (keyword match)
   */
  description?: string;

  /**
   * Filter by server IDs
   */
  serverIds?: string[];

  /**
   * Filter by category
   */
  category?: string;

  /**
   * Filter by tags
   */
  tags?: string[];

  /**
   * Filter by annotation flags
   */
  annotations?: Partial<MCPToolAnnotations>;

  /**
   * Include unavailable tools
   */
  includeUnavailable?: boolean;

  /**
   * Maximum results
   */
  limit?: number;

  /**
   * Sort by field
   */
  sortBy?: "name" | "calls" | "successRate" | "avgExecutionTime";

  /**
   * Sort direction
   */
  sortDirection?: "asc" | "desc";
};

/**
 * Tool search result
 */
export type ToolSearchResult = {
  tools: EnhancedToolInfo[];
  totalCount: number;
  criteria: ToolSearchCriteria;
  executionTime: number;
};

/**
 * Tool compatibility check result
 */
export type CompatibilityCheckResult = {
  compatible: boolean;
  issues: string[];
  warnings: string[];
  recommendations: string[];
};

/**
 * Enhanced Tool Discovery Service
 *
 * Provides advanced tool discovery features including annotation support,
 * multi-server coordination, and powerful search capabilities.
 *
 * @example
 * ```typescript
 * const discovery = new EnhancedToolDiscovery();
 *
 * // Discover tools with annotation inference
 * const result = await discovery.discoverToolsWithAnnotations(
 *   "github-server",
 *   client,
 * );
 *
 * // Search for tools
 * const searchResult = await discovery.searchTools({
 *   category: "file-system",
 *   annotations: { readOnlyHint: true },
 *   limit: 10,
 * });
 *
 * // Get tools by safety level
 * const safeTools = discovery.getToolsBySafetyLevel("safe");
 * ```
 */
export class EnhancedToolDiscovery extends EventEmitter {
  private toolRegistry: Map<string, EnhancedToolInfo> = new Map();
  private serverToolsMap: Map<string, Set<string>> = new Map();
  private multiServerManager: MultiServerManager;
  private discoveryInProgress: Set<string> = new Set();

  constructor(multiServerManager?: MultiServerManager) {
    super();
    this.multiServerManager = multiServerManager ?? new MultiServerManager();
  }

  /**
   * Discover tools with automatic annotation inference
   */
  async discoverToolsWithAnnotations(
    serverId: string,
    client: Client,
    timeout = 10000,
  ): Promise<ToolDiscoveryResult> {
    const startTime = Date.now();

    if (this.discoveryInProgress.has(serverId)) {
      return {
        success: false,
        error: `Discovery already in progress for server: ${serverId}`,
        toolCount: 0,
        tools: [],
        duration: Date.now() - startTime,
        serverId,
      };
    }

    this.discoveryInProgress.add(serverId);

    try {
      logger.info(
        `[EnhancedToolDiscovery] Starting discovery with annotations for: ${serverId}`,
      );

      // List tools from server
      const listResult = await withTimeout(
        client.listTools(),
        timeout,
        "Discovery timeout",
      );

      if (!listResult?.tools) {
        throw ErrorFactory.toolExecutionFailed(
          "discoverTools",
          new Error("No tools returned from server"),
          serverId,
        );
      }

      // Clear existing tools for this server
      this.clearServerTools(serverId);

      const registeredTools: ExternalMCPToolInfo[] = [];

      for (const tool of listResult.tools) {
        const enhancedTool = this.createEnhancedToolInfo(serverId, tool);
        const toolKey = this.createToolKey(serverId, tool.name);

        this.toolRegistry.set(toolKey, enhancedTool);

        // Track server tools
        let serverTools = this.serverToolsMap.get(serverId);
        if (!serverTools) {
          serverTools = new Set();
          this.serverToolsMap.set(serverId, serverTools);
        }
        serverTools.add(tool.name);

        registeredTools.push(enhancedTool);

        this.emit("toolDiscovered", {
          serverId,
          toolName: tool.name,
          annotations: enhancedTool.annotations,
          timestamp: new Date(),
        });
      }

      logger.info(
        `[EnhancedToolDiscovery] Discovered ${registeredTools.length} tools with annotations from ${serverId}`,
      );

      return {
        success: true,
        toolCount: registeredTools.length,
        tools: registeredTools,
        duration: Date.now() - startTime,
        serverId,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      logger.error(
        `[EnhancedToolDiscovery] Discovery failed for ${serverId}:`,
        error,
      );

      return {
        success: false,
        error: errorMessage,
        toolCount: 0,
        tools: [],
        duration: Date.now() - startTime,
        serverId,
      };
    } finally {
      this.discoveryInProgress.delete(serverId);
    }
  }

  /**
   * Create enhanced tool info with annotations
   */
  private createEnhancedToolInfo(
    serverId: string,
    tool: Tool,
  ): EnhancedToolInfo {
    // Infer annotations from tool definition
    const annotations = inferAnnotations({
      name: tool.name,
      description: tool.description ?? "",
    });

    return {
      name: tool.name,
      description: tool.description ?? "No description provided",
      serverId,
      inputSchema: tool.inputSchema as JsonObject,
      isAvailable: true,
      annotations,
      version: "1.0.0",
      stats: {
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        averageExecutionTime: 0,
        lastExecutionTime: 0,
      },
      metadata: {
        category: this.inferCategory(tool),
        deprecated: false,
      },
    };
  }

  /**
   * Infer category from tool definition
   */
  private inferCategory(tool: Tool): string {
    const name = tool.name.toLowerCase();
    const desc = (tool.description ?? "").toLowerCase();

    if (name.includes("git") || desc.includes("git")) {
      return "version-control";
    }
    if (
      name.includes("file") ||
      name.includes("read") ||
      name.includes("write")
    ) {
      return "file-system";
    }
    if (name.includes("api") || name.includes("http")) {
      return "api";
    }
    if (name.includes("data") || name.includes("query")) {
      return "data";
    }
    if (name.includes("auth") || name.includes("login")) {
      return "authentication";
    }
    if (name.includes("deploy") || name.includes("build")) {
      return "deployment";
    }

    return "general";
  }

  /**
   * Search tools with advanced criteria
   */
  searchTools(criteria: ToolSearchCriteria): ToolSearchResult {
    const startTime = Date.now();
    let results = Array.from(this.toolRegistry.values());

    // Filter by name
    if (criteria.name) {
      const searchName = criteria.name.toLowerCase();
      results = results.filter((tool) =>
        tool.name.toLowerCase().includes(searchName),
      );
    }

    // Filter by description
    if (criteria.description) {
      const keywords = criteria.description.toLowerCase().split(/\s+/);
      results = results.filter((tool) => {
        const desc = tool.description.toLowerCase();
        return keywords.some((keyword) => desc.includes(keyword));
      });
    }

    // Filter by server IDs
    if (criteria.serverIds?.length) {
      const serverIds = criteria.serverIds;
      results = results.filter((tool) => serverIds.includes(tool.serverId));
    }

    // Filter by category
    if (criteria.category) {
      results = results.filter(
        (tool) => tool.metadata?.category === criteria.category,
      );
    }

    // Filter by tags
    if (criteria.tags?.length) {
      const tags = criteria.tags;
      results = results.filter((tool) => {
        const toolTags = tool.annotations?.tags ?? [];
        return tags.some((tag) => toolTags.includes(tag));
      });
    }

    // Filter by annotations
    if (criteria.annotations) {
      const annotations = criteria.annotations;
      results = results.filter((tool) => {
        if (!tool.annotations) {
          return false;
        }

        for (const [key, value] of Object.entries(annotations)) {
          const annotationKey = key as keyof MCPToolAnnotations;
          if (tool.annotations[annotationKey] !== value) {
            return false;
          }
        }
        return true;
      });
    }

    // Filter unavailable
    if (!criteria.includeUnavailable) {
      results = results.filter((tool) => tool.isAvailable);
    }

    // Sort results
    if (criteria.sortBy) {
      const direction = criteria.sortDirection === "desc" ? -1 : 1;

      results.sort((a, b) => {
        let comparison = 0;

        switch (criteria.sortBy) {
          case "name":
            comparison = a.name.localeCompare(b.name);
            break;
          case "calls":
            comparison = a.stats.totalCalls - b.stats.totalCalls;
            break;
          case "successRate": {
            const rateA =
              a.stats.totalCalls > 0
                ? a.stats.successfulCalls / a.stats.totalCalls
                : 0;
            const rateB =
              b.stats.totalCalls > 0
                ? b.stats.successfulCalls / b.stats.totalCalls
                : 0;
            comparison = rateA - rateB;
            break;
          }
          case "avgExecutionTime":
            comparison =
              a.stats.averageExecutionTime - b.stats.averageExecutionTime;
            break;
        }

        return comparison * direction;
      });
    }

    // Apply limit
    const totalCount = results.length;
    if (criteria.limit && criteria.limit > 0) {
      results = results.slice(0, criteria.limit);
    }

    return {
      tools: results,
      totalCount,
      criteria,
      executionTime: Date.now() - startTime,
    };
  }

  /**
   * Get tools by safety level
   */
  getToolsBySafetyLevel(
    level: "safe" | "moderate" | "dangerous",
  ): EnhancedToolInfo[] {
    return Array.from(this.toolRegistry.values()).filter((tool) => {
      const annotations = tool.annotations ?? {};

      switch (level) {
        case "dangerous":
          return annotations.destructiveHint === true;
        case "safe":
          return annotations.readOnlyHint === true;
        case "moderate":
          return !annotations.destructiveHint && !annotations.readOnlyHint;
        default:
          return false;
      }
    });
  }

  /**
   * Get tools requiring confirmation
   */
  getToolsRequiringConfirmation(): EnhancedToolInfo[] {
    return Array.from(this.toolRegistry.values()).filter(
      (tool) =>
        tool.annotations?.requiresConfirmation === true ||
        tool.annotations?.destructiveHint === true,
    );
  }

  /**
   * Get read-only tools
   */
  getReadOnlyTools(): EnhancedToolInfo[] {
    return Array.from(this.toolRegistry.values()).filter(
      (tool) => tool.annotations?.readOnlyHint === true,
    );
  }

  /**
   * Get unified tools from all servers
   */
  getUnifiedTools(): UnifiedTool[] {
    return this.multiServerManager.getUnifiedTools();
  }

  /**
   * Register a server with the multi-server manager
   */
  registerServer(server: MCPServerInfo): void {
    this.multiServerManager.addServer(server);
  }

  /**
   * Update tool annotations
   */
  updateToolAnnotations(
    serverId: string,
    toolName: string,
    annotations: Partial<MCPToolAnnotations>,
  ): boolean {
    const toolKey = this.createToolKey(serverId, toolName);
    const tool = this.toolRegistry.get(toolKey);

    if (!tool) {
      return false;
    }

    tool.annotations = {
      ...tool.annotations,
      ...annotations,
    };

    this.emit("annotationsUpdated", {
      serverId,
      toolName,
      annotations: tool.annotations,
      timestamp: new Date(),
    });

    return true;
  }

  /**
   * Check tool compatibility
   */
  checkCompatibility(
    toolName: string,
    serverId: string,
    targetVersion?: string,
  ): CompatibilityCheckResult {
    const toolKey = this.createToolKey(serverId, toolName);
    const tool = this.toolRegistry.get(toolKey);

    const issues: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    if (!tool) {
      return {
        compatible: false,
        issues: [`Tool '${toolName}' not found on server '${serverId}'`],
        warnings: [],
        recommendations: [],
      };
    }

    // Check version compatibility
    if (targetVersion && tool.version) {
      const toolVersion = tool.version.split(".").map(Number);
      const target = targetVersion.split(".").map(Number);

      if (toolVersion.some(isNaN) || target.some(isNaN)) {
        warnings.push(
          `Non-standard version format: tool=${tool.version}, target=${targetVersion}`,
        );
      } else if (toolVersion[0] !== target[0]) {
        issues.push(
          `Major version mismatch: tool is v${tool.version}, target is v${targetVersion}`,
        );
      } else if (toolVersion[1] < target[1]) {
        warnings.push(
          `Minor version mismatch: tool is v${tool.version}, target is v${targetVersion}`,
        );
      }
    }

    // Check if tool is deprecated
    if (tool.metadata?.deprecated) {
      warnings.push("This tool is marked as deprecated");
      recommendations.push("Consider using an alternative tool if available");
    }

    // Check if tool requires authentication
    if (tool.annotations?.securityLevel === "restricted") {
      recommendations.push("This tool requires elevated permissions");
    }

    return {
      compatible: issues.length === 0,
      issues,
      warnings,
      recommendations,
    };
  }

  /**
   * Get tool by key
   */
  getTool(serverId: string, toolName: string): EnhancedToolInfo | undefined {
    return this.toolRegistry.get(this.createToolKey(serverId, toolName));
  }

  /**
   * Get all tools
   */
  getAllTools(): EnhancedToolInfo[] {
    return Array.from(this.toolRegistry.values());
  }

  /**
   * Get tools for a server
   */
  getServerTools(serverId: string): EnhancedToolInfo[] {
    const toolNames = this.serverToolsMap.get(serverId);
    if (!toolNames) {
      return [];
    }

    return Array.from(toolNames)
      .map((name) => this.getTool(serverId, name))
      .filter((tool): tool is EnhancedToolInfo => tool !== undefined);
  }

  /**
   * Clear tools for a server
   */
  clearServerTools(serverId: string): void {
    const toolNames = this.serverToolsMap.get(serverId);

    if (toolNames) {
      for (const toolName of toolNames) {
        this.toolRegistry.delete(this.createToolKey(serverId, toolName));
      }
      this.serverToolsMap.delete(serverId);
    }
  }

  /**
   * Create tool key
   */
  private createToolKey(serverId: string, toolName: string): string {
    return `${serverId}:${toolName}`;
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalTools: number;
    toolsByServer: Record<string, number>;
    toolsByCategory: Record<string, number>;
    toolsBySafetyLevel: Record<string, number>;
    toolsWithAnnotations: number;
    deprecatedTools: number;
  } {
    const toolsByServer: Record<string, number> = {};
    const toolsByCategory: Record<string, number> = {};
    const toolsBySafetyLevel: Record<string, number> = {
      safe: 0,
      moderate: 0,
      dangerous: 0,
    };
    let toolsWithAnnotations = 0;
    let deprecatedTools = 0;

    for (const tool of this.toolRegistry.values()) {
      // By server
      toolsByServer[tool.serverId] = (toolsByServer[tool.serverId] ?? 0) + 1;

      // By category
      const category = (tool.metadata?.category as string) ?? "general";
      toolsByCategory[category] = (toolsByCategory[category] ?? 0) + 1;

      // By safety level
      if (tool.annotations?.destructiveHint) {
        toolsBySafetyLevel.dangerous++;
      } else if (tool.annotations?.readOnlyHint) {
        toolsBySafetyLevel.safe++;
      } else {
        toolsBySafetyLevel.moderate++;
      }

      // Count annotations
      if (tool.annotations && Object.keys(tool.annotations).length > 0) {
        toolsWithAnnotations++;
      }

      // Count deprecated
      if (tool.metadata?.deprecated) {
        deprecatedTools++;
      }
    }

    return {
      totalTools: this.toolRegistry.size,
      toolsByServer,
      toolsByCategory,
      toolsBySafetyLevel,
      toolsWithAnnotations,
      deprecatedTools,
    };
  }
}
