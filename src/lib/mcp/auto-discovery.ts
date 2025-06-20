/**
 * NeuroLink MCP Auto-Discovery System
 * Automatically discovers MCP servers from common configuration locations across different tools
 * Supports VS Code, Cursor, Claude Desktop, Windsurf, Roo Code, and generic configurations
 */

import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import type { NeuroLinkMCPServer, MCPServerCategory } from "./factory.js";
import { MCPToolRegistry } from "./registry.js";
import { autoDiscoveryLogger } from "./logging.js";

/**
 * Discovered MCP server configuration
 */
export interface DiscoveredMCPServer {
  id: string;
  title: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  source: DiscoverySource;
  configPath: string;
  rawConfig: any;
}

/**
 * Discovery source information
 */
export interface DiscoverySource {
  tool: string; // VS Code, Cursor, Claude Desktop, etc.
  type: "global" | "workspace" | "project";
  priority: number; // Higher priority = more trusted source
  description: string;
}

/**
 * Discovery configuration options
 */
export interface DiscoveryOptions {
  searchWorkspace?: boolean; // Search workspace/project configs
  searchGlobal?: boolean; // Search global configs
  searchCommonPaths?: boolean; // Search common file locations
  followSymlinks?: boolean; // Follow symbolic links
  maxDepth?: number; // Maximum directory traversal depth
  includeInactive?: boolean; // Include servers that might not be active
  preferredTools?: string[]; // Prioritize specific tools
}

/**
 * Discovery result
 */
export interface DiscoveryResult {
  discovered: DiscoveredMCPServer[];
  sources: DiscoverySource[];
  errors: string[];
  stats: {
    configFilesFound: number;
    serversDiscovered: number;
    duplicatesRemoved: number;
    executionTime: number;
  };
}

/**
 * MCP Configuration Parser interface
 */
interface MCPConfigParser {
  canParse(filePath: string, content: any): boolean;
  parse(
    filePath: string,
    content: any,
    source: DiscoverySource,
  ): DiscoveredMCPServer[];
}

/**
 * Claude Desktop configuration parser
 */
class ClaudeDesktopParser implements MCPConfigParser {
  canParse(filePath: string, content: any): boolean {
    return (
      filePath.includes("claude_desktop_config.json") &&
      content &&
      typeof content === "object" &&
      (content.mcpServers || content.mcp_servers)
    );
  }

  parse(
    filePath: string,
    content: any,
    source: DiscoverySource,
  ): DiscoveredMCPServer[] {
    const servers: DiscoveredMCPServer[] = [];
    const mcpServers = content.mcpServers || content.mcp_servers || {};

    for (const [serverId, serverConfig] of Object.entries(mcpServers)) {
      if (typeof serverConfig === "object" && serverConfig !== null) {
        const config = serverConfig as any;
        servers.push({
          id: serverId,
          title: config.title || serverId,
          command: config.command || "node",
          args: config.args || [],
          env: config.env || {},
          cwd: config.cwd,
          source,
          configPath: filePath,
          rawConfig: config,
        });
      }
    }

    return servers;
  }
}

/**
 * VS Code configuration parser
 */
class VSCodeParser implements MCPConfigParser {
  canParse(filePath: string, content: any): boolean {
    return (
      (filePath.includes(".vscode/mcp.json") ||
        filePath.includes("settings.json")) &&
      content &&
      typeof content === "object"
    );
  }

  parse(
    filePath: string,
    content: any,
    source: DiscoverySource,
  ): DiscoveredMCPServer[] {
    const servers: DiscoveredMCPServer[] = [];

    // Handle .vscode/mcp.json format
    if (filePath.includes("mcp.json")) {
      const mcpServers = content.mcpServers || content.servers || {};
      for (const [serverId, serverConfig] of Object.entries(mcpServers)) {
        if (typeof serverConfig === "object" && serverConfig !== null) {
          const config = serverConfig as any;
          servers.push({
            id: serverId,
            title: config.title || serverId,
            command: config.command || "node",
            args: config.args || [],
            env: config.env || {},
            cwd: config.cwd,
            source,
            configPath: filePath,
            rawConfig: config,
          });
        }
      }
    }

    // Handle settings.json with MCP configuration
    if (filePath.includes("settings.json") && content.mcp) {
      const mcpConfig = content.mcp;
      if (mcpConfig.servers) {
        for (const [serverId, serverConfig] of Object.entries(
          mcpConfig.servers,
        )) {
          if (typeof serverConfig === "object" && serverConfig !== null) {
            const config = serverConfig as any;
            servers.push({
              id: serverId,
              title: config.title || serverId,
              command: config.command || "node",
              args: config.args || [],
              env: config.env || {},
              cwd: config.cwd,
              source,
              configPath: filePath,
              rawConfig: config,
            });
          }
        }
      }
    }

    return servers;
  }
}

/**
 * Cursor configuration parser
 */
class CursorParser implements MCPConfigParser {
  canParse(filePath: string, content: any): boolean {
    return (
      filePath.includes(".cursor/mcp.json") ||
      (filePath.includes("mcp.json") && content && typeof content === "object")
    );
  }

  parse(
    filePath: string,
    content: any,
    source: DiscoverySource,
  ): DiscoveredMCPServer[] {
    const servers: DiscoveredMCPServer[] = [];
    const mcpServers = content.mcpServers || content.servers || {};

    for (const [serverId, serverConfig] of Object.entries(mcpServers)) {
      if (typeof serverConfig === "object" && serverConfig !== null) {
        const config = serverConfig as any;
        servers.push({
          id: serverId,
          title: config.title || serverId,
          command: config.command || "node",
          args: config.args || [],
          env: config.env || {},
          cwd: config.cwd,
          source,
          configPath: filePath,
          rawConfig: config,
        });
      }
    }

    return servers;
  }
}

/**
 * Windsurf configuration parser
 */
class WindsurfParser implements MCPConfigParser {
  canParse(filePath: string, content: any): boolean {
    return (
      filePath.includes("windsurf/mcp_config.json") &&
      content &&
      typeof content === "object"
    );
  }

  parse(
    filePath: string,
    content: any,
    source: DiscoverySource,
  ): DiscoveredMCPServer[] {
    const servers: DiscoveredMCPServer[] = [];
    const mcpServers = content.mcpServers || content.servers || {};

    for (const [serverId, serverConfig] of Object.entries(mcpServers)) {
      if (typeof serverConfig === "object" && serverConfig !== null) {
        const config = serverConfig as any;
        servers.push({
          id: serverId,
          title: config.title || serverId,
          command: config.command || "node",
          args: config.args || [],
          env: config.env || {},
          cwd: config.cwd,
          source,
          configPath: filePath,
          rawConfig: config,
        });
      }
    }

    return servers;
  }
}

/**
 * Cline AI Coder configuration parser
 */
class ClineParser implements MCPConfigParser {
  canParse(filePath: string, content: any): boolean {
    return (
      filePath.includes("cline_mcp_settings.json") &&
      content &&
      typeof content === "object" &&
      (content.mcpServers || content.servers)
    );
  }

  parse(
    filePath: string,
    content: any,
    source: DiscoverySource,
  ): DiscoveredMCPServer[] {
    const servers: DiscoveredMCPServer[] = [];
    const mcpServers = content.mcpServers || content.servers || {};

    for (const [serverId, serverConfig] of Object.entries(mcpServers)) {
      if (typeof serverConfig === "object" && serverConfig !== null) {
        const config = serverConfig as any;
        servers.push({
          id: serverId,
          title: config.title || serverId,
          command: config.command || "node",
          args: config.args || [],
          env: config.env || {},
          cwd: config.cwd,
          source,
          configPath: filePath,
          rawConfig: config,
        });
      }
    }

    return servers;
  }
}

/**
 * Continue Dev configuration parser
 */
class ContinueParser implements MCPConfigParser {
  canParse(filePath: string, content: any): boolean {
    return (
      (filePath.includes("continue/config.json") ||
        filePath.includes(".continue/config.json")) &&
      content &&
      typeof content === "object" &&
      (content.mcpServers || content.contextProviders?.mcp)
    );
  }

  parse(
    filePath: string,
    content: any,
    source: DiscoverySource,
  ): DiscoveredMCPServer[] {
    const servers: DiscoveredMCPServer[] = [];

    // Continue may have MCP servers in contextProviders.mcp or directly in mcpServers
    const mcpServers =
      content.mcpServers || content.contextProviders?.mcp || {};

    for (const [serverId, serverConfig] of Object.entries(mcpServers)) {
      if (typeof serverConfig === "object" && serverConfig !== null) {
        const config = serverConfig as any;
        servers.push({
          id: serverId,
          title: config.title || serverId,
          command: config.command || "node",
          args: config.args || [],
          env: config.env || {},
          cwd: config.cwd,
          source,
          configPath: filePath,
          rawConfig: config,
        });
      }
    }

    return servers;
  }
}

/**
 * Aider configuration parser
 */
class AiderParser implements MCPConfigParser {
  canParse(filePath: string, content: any): boolean {
    return (
      (filePath.includes(".aider") || filePath.includes("aider.conf")) &&
      content &&
      typeof content === "object" &&
      content.mcp_servers
    );
  }

  parse(
    filePath: string,
    content: any,
    source: DiscoverySource,
  ): DiscoveredMCPServer[] {
    const servers: DiscoveredMCPServer[] = [];
    const mcpServers = content.mcp_servers || {};

    for (const [serverId, serverConfig] of Object.entries(mcpServers)) {
      if (typeof serverConfig === "object" && serverConfig !== null) {
        const config = serverConfig as any;
        servers.push({
          id: serverId,
          title: config.title || serverId,
          command: config.command || "node",
          args: config.args || [],
          env: config.env || {},
          cwd: config.cwd,
          source,
          configPath: filePath,
          rawConfig: config,
        });
      }
    }

    return servers;
  }
}

/**
 * Generic MCP configuration parser
 */
class GenericParser implements MCPConfigParser {
  canParse(filePath: string, content: any): boolean {
    return (
      (filePath.includes("mcp.json") ||
        filePath.includes("mcp-config.json") ||
        filePath.includes("mcp_config.json")) &&
      content &&
      typeof content === "object"
    );
  }

  parse(
    filePath: string,
    content: any,
    source: DiscoverySource,
  ): DiscoveredMCPServer[] {
    const servers: DiscoveredMCPServer[] = [];
    const mcpServers = content.mcpServers || content.servers || content;

    for (const [serverId, serverConfig] of Object.entries(mcpServers)) {
      if (typeof serverConfig === "object" && serverConfig !== null) {
        const config = serverConfig as any;
        servers.push({
          id: serverId,
          title: config.title || serverId,
          command: config.command || "node",
          args: config.args || [],
          env: config.env || {},
          cwd: config.cwd,
          source,
          configPath: filePath,
          rawConfig: config,
        });
      }
    }

    return servers;
  }
}

/**
 * MCP Auto-Discovery Engine
 */
export class MCPAutoDiscovery {
  private parsers: MCPConfigParser[] = [
    new ClaudeDesktopParser(),
    new ClineParser(), // Move Cline parser before VSCode parser
    new VSCodeParser(),
    new CursorParser(),
    new WindsurfParser(),
    new ContinueParser(),
    new AiderParser(),
    new GenericParser(),
  ];

  /**
   * Discover MCP servers from all common locations
   *
   * @param options Discovery configuration options
   * @returns Discovery result with found servers
   */
  async discoverServers(
    options: DiscoveryOptions = {},
  ): Promise<DiscoveryResult> {
    const startTime = Date.now();
    const discovered: DiscoveredMCPServer[] = [];
    const sources: DiscoverySource[] = [];
    const errors: string[] = [];
    let configFilesFound = 0;

    const {
      searchWorkspace = true,
      searchGlobal = true,
      searchCommonPaths = true,
      followSymlinks = false,
      maxDepth = 3,
      includeInactive = true,
      preferredTools = [],
    } = options;

    // Define search paths based on options
    const searchPaths = this.getSearchPaths({
      searchWorkspace,
      searchGlobal,
      searchCommonPaths,
    });

    autoDiscoveryLogger.debug(
      `Starting discovery with ${searchPaths.length} search paths`,
    );

    // Search each path
    for (const searchPath of searchPaths) {
      try {
        const pathResults = await this.searchPath(
          searchPath,
          maxDepth,
          followSymlinks,
          includeInactive,
        );

        discovered.push(...pathResults.servers);
        sources.push(...pathResults.sources);
        configFilesFound += pathResults.configFilesFound;

        if (pathResults.errors.length > 0) {
          errors.push(...pathResults.errors);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        errors.push(`Error searching path ${searchPath.path}: ${errorMessage}`);
      }
    }

    // Remove duplicates and apply prioritization
    const uniqueServers = this.deduplicateServers(discovered, preferredTools);
    const duplicatesRemoved = discovered.length - uniqueServers.length;

    const executionTime = Date.now() - startTime;

    autoDiscoveryLogger.debug(
      `Discovery completed in ${executionTime}ms: ` +
        `${uniqueServers.length} servers found, ${duplicatesRemoved} duplicates removed`,
    );

    return {
      discovered: uniqueServers,
      sources: [...new Set(sources)], // Remove duplicate sources
      errors,
      stats: {
        configFilesFound,
        serversDiscovered: uniqueServers.length,
        duplicatesRemoved,
        executionTime,
      },
    };
  }

  /**
   * Auto-register discovered servers with a registry
   *
   * @param registry Target MCP registry
   * @param options Discovery options
   * @returns Registration results
   */
  async autoRegisterServers(
    registry: MCPToolRegistry,
    options: DiscoveryOptions = {},
  ): Promise<{
    registered: string[];
    failed: string[];
    errors: string[];
  }> {
    const discoveryResult = await this.discoverServers(options);
    const registered: string[] = [];
    const failed: string[] = [];
    const errors: string[] = [...discoveryResult.errors];

    for (const server of discoveryResult.discovered) {
      try {
        // Convert discovered server to NeuroLink MCP server format
        const mcpServer = await this.convertToMCPServer(server);

        // Attempt to register
        await registry.registerServer(mcpServer);
        registered.push(server.id);

        autoDiscoveryLogger.info(
          `Successfully registered server '${server.id}' from ${server.source.tool}`,
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        failed.push(server.id);
        errors.push(
          `Failed to register server '${server.id}': ${errorMessage}`,
        );

        autoDiscoveryLogger.error(
          `Failed to register server '${server.id}': ${errorMessage}`,
        );
      }
    }

    return { registered, failed, errors };
  }

  /**
   * Get standard search paths for MCP configurations
   */
  private getSearchPaths(options: {
    searchWorkspace: boolean;
    searchGlobal: boolean;
    searchCommonPaths: boolean;
  }) {
    const paths: Array<{
      path: string;
      source: DiscoverySource;
      patterns: string[];
    }> = [];

    const homeDir = os.homedir();
    const currentDir = process.cwd();

    // Global configurations
    if (options.searchGlobal) {
      // Claude Desktop
      paths.push({
        path: path.join(homeDir, "Library", "Application Support", "Claude"),
        source: {
          tool: "Claude Desktop",
          type: "global",
          priority: 9,
          description: "Claude Desktop global configuration",
        },
        patterns: ["claude_desktop_config.json"],
      });

      // Cursor global
      paths.push({
        path: path.join(homeDir, ".cursor"),
        source: {
          tool: "Cursor",
          type: "global",
          priority: 8,
          description: "Cursor global configuration",
        },
        patterns: ["mcp.json"],
      });

      // Windsurf global
      paths.push({
        path: path.join(homeDir, ".codeium", "windsurf"),
        source: {
          tool: "Windsurf",
          type: "global",
          priority: 8,
          description: "Windsurf global configuration",
        },
        patterns: ["mcp_config.json"],
      });

      // VS Code global
      const vscodeGlobalPaths = [
        path.join(homeDir, "Library", "Application Support", "Code", "User"), // macOS
        path.join(homeDir, ".config", "Code", "User"), // Linux
        path.join(homeDir, "AppData", "Roaming", "Code", "User"), // Windows
      ];

      for (const vscodeGlobalPath of vscodeGlobalPaths) {
        paths.push({
          path: vscodeGlobalPath,
          source: {
            tool: "VS Code",
            type: "global",
            priority: 7,
            description: "VS Code global configuration",
          },
          patterns: ["settings.json"],
        });
      }

      // Cline AI Coder - stored in VS Code extension globalStorage
      const clineGlobalPaths = [
        path.join(
          homeDir,
          "Library",
          "Application Support",
          "Code",
          "User",
          "globalStorage",
          "saoudrizwan.claude-dev",
          "settings",
        ), // macOS
        path.join(
          homeDir,
          ".config",
          "Code",
          "User",
          "globalStorage",
          "saoudrizwan.claude-dev",
          "settings",
        ), // Linux
        path.join(
          homeDir,
          "AppData",
          "Roaming",
          "Code",
          "User",
          "globalStorage",
          "saoudrizwan.claude-dev",
          "settings",
        ), // Windows
        // VS Code Insiders
        path.join(
          homeDir,
          "Library",
          "Application Support",
          "Code - Insiders",
          "User",
          "globalStorage",
          "saoudrizwan.claude-dev",
          "settings",
        ), // macOS
        path.join(
          homeDir,
          ".config",
          "Code - Insiders",
          "User",
          "globalStorage",
          "saoudrizwan.claude-dev",
          "settings",
        ), // Linux
        path.join(
          homeDir,
          "AppData",
          "Roaming",
          "Code - Insiders",
          "User",
          "globalStorage",
          "saoudrizwan.claude-dev",
          "settings",
        ), // Windows
      ];

      for (const clineGlobalPath of clineGlobalPaths) {
        paths.push({
          path: clineGlobalPath,
          source: {
            tool: "Cline AI Coder",
            type: "global",
            priority: 8,
            description: "Cline AI Coder extension configuration",
          },
          patterns: ["cline_mcp_settings.json"],
        });
      }

      // Continue Dev global configuration
      paths.push({
        path: path.join(homeDir, ".continue"),
        source: {
          tool: "Continue Dev",
          type: "global",
          priority: 7,
          description: "Continue Dev global configuration",
        },
        patterns: ["config.json"],
      });

      // Aider global configuration
      paths.push({
        path: path.join(homeDir, ".aider"),
        source: {
          tool: "Aider",
          type: "global",
          priority: 7,
          description: "Aider global configuration",
        },
        patterns: ["config.json", "aider.conf"],
      });
    }

    // Workspace/project configurations
    if (options.searchWorkspace) {
      // VS Code workspace
      paths.push({
        path: path.join(currentDir, ".vscode"),
        source: {
          tool: "VS Code",
          type: "workspace",
          priority: 9,
          description: "VS Code workspace configuration",
        },
        patterns: ["mcp.json", "settings.json"],
      });

      // Cursor project
      paths.push({
        path: path.join(currentDir, ".cursor"),
        source: {
          tool: "Cursor",
          type: "project",
          priority: 9,
          description: "Cursor project configuration",
        },
        patterns: ["mcp.json"],
      });
    }

    // Common file locations
    if (options.searchCommonPaths) {
      paths.push({
        path: currentDir,
        source: {
          tool: "Generic",
          type: "project",
          priority: 6,
          description: "Generic project configuration",
        },
        patterns: [
          "mcp.json",
          ".mcp-config.json",
          "mcp_config.json",
          ".mcp-servers.json",
        ],
      });
    }

    return paths;
  }

  /**
   * Search a specific path for MCP configurations
   */
  private async searchPath(
    searchConfig: {
      path: string;
      source: DiscoverySource;
      patterns: string[];
    },
    maxDepth: number,
    followSymlinks: boolean,
    includeInactive: boolean,
  ): Promise<{
    servers: DiscoveredMCPServer[];
    sources: DiscoverySource[];
    configFilesFound: number;
    errors: string[];
  }> {
    const servers: DiscoveredMCPServer[] = [];
    const sources: DiscoverySource[] = [];
    const errors: string[] = [];
    let configFilesFound = 0;

    try {
      // Check if path exists
      await fs.access(searchConfig.path);
      autoDiscoveryLogger.debug(`Searching path: ${searchConfig.path}`);
    } catch {
      // Path doesn't exist, skip silently
      autoDiscoveryLogger.debug(`Path does not exist: ${searchConfig.path}`);
      return { servers, sources, configFilesFound, errors };
    }

    // Search for each pattern
    for (const pattern of searchConfig.patterns) {
      const filePath = path.join(searchConfig.path, pattern);

      try {
        await fs.access(filePath);
        autoDiscoveryLogger.debug(`Found config file: ${filePath}`);

        // Read and parse the file with resilient JSON parsing
        const content = await fs.readFile(filePath, "utf-8");
        const parsedContent = this.parseJsonResilient(content, filePath);

        configFilesFound++;

        // Try to parse with available parsers
        let parsed = false;
        for (const parser of this.parsers) {
          if (parser.canParse(filePath, parsedContent)) {
            autoDiscoveryLogger.debug(
              `Using parser for ${searchConfig.source.tool}: ${parser.constructor.name}`,
            );
            const parsedServers = parser.parse(
              filePath,
              parsedContent,
              searchConfig.source,
            );
            autoDiscoveryLogger.debug(
              `Parsed ${parsedServers.length} servers from ${filePath}`,
            );
            servers.push(...parsedServers);
            sources.push(searchConfig.source);
            parsed = true;
            break;
          }
        }

        if (!parsed) {
          autoDiscoveryLogger.debug(`No parser could handle ${filePath}`);
        }
      } catch (error) {
        if ((error as any).code !== "ENOENT") {
          // File exists but couldn't be parsed
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errors.push(`Error parsing ${filePath}: ${errorMessage}`);
          autoDiscoveryLogger.debug(
            `Error parsing ${filePath}: ${errorMessage}`,
          );
        }
      }
    }

    return { servers, sources, configFilesFound, errors };
  }

  /**
   * Parse JSON with resilience to common syntax issues
   */
  private parseJsonResilient(content: string, filePath: string): any {
    try {
      // First, try standard JSON parsing
      return JSON.parse(content);
    } catch (error) {
      const originalError =
        error instanceof Error ? error.message : String(error);

      try {
        // Attempt to fix common JSON issues
        let fixedContent = content;

        // Remove trailing commas before closing braces and brackets
        fixedContent = fixedContent.replace(/,(\s*[}\]])/g, "$1");

        // Remove single-line comments (// comments)
        fixedContent = fixedContent.replace(/\/\/.*$/gm, "");

        // Remove multi-line comments (/* comments */)
        fixedContent = fixedContent.replace(/\/\*[\s\S]*?\*\//g, "");

        // Remove trailing commas after the last property in objects
        fixedContent = fixedContent.replace(/,(\s*})/g, "$1");

        // Remove trailing commas after the last element in arrays
        fixedContent = fixedContent.replace(/,(\s*])/g, "$1");

        // Fix unescaped control characters in strings
        fixedContent = fixedContent.replace(/("(?:[^"\\]|\\.)+")/g, (match) => {
          try {
            // Try to parse the string to see if it's valid
            JSON.parse(`{${match}}`);
            return match;
          } catch {
            // If invalid, escape common control characters
            return match
              .replace(/\n/g, "\\n")
              .replace(/\r/g, "\\r")
              .replace(/\t/g, "\\t")
              .replace(/\f/g, "\\f")
              .replace(/\b/g, "\\b");
          }
        });

        // Fix unquoted object keys
        fixedContent = fixedContent.replace(
          /([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g,
          '$1"$2":',
        );

        // Try parsing the fixed content
        const result = JSON.parse(fixedContent);

        autoDiscoveryLogger.debug(
          `Successfully repaired JSON syntax issues in ${filePath}`,
        );
        return result;
      } catch (secondError) {
        // If we still can't parse it, try one more time with aggressive fixes
        try {
          let aggressiveFixedContent = content;

          // Remove any non-printable characters except standard whitespace
          aggressiveFixedContent = aggressiveFixedContent.replace(
            // eslint-disable-next-line no-control-regex
            /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,
            "",
          );

          // Apply all previous fixes
          aggressiveFixedContent = aggressiveFixedContent.replace(
            /,(\s*[}\]])/g,
            "$1",
          );
          aggressiveFixedContent = aggressiveFixedContent.replace(
            /\/\/.*$/gm,
            "",
          );
          aggressiveFixedContent = aggressiveFixedContent.replace(
            /\/\*[\s\S]*?\*\//g,
            "",
          );
          aggressiveFixedContent = aggressiveFixedContent.replace(
            /,(\s*})/g,
            "$1",
          );
          aggressiveFixedContent = aggressiveFixedContent.replace(
            /,(\s*])/g,
            "$1",
          );

          const result = JSON.parse(aggressiveFixedContent);

          autoDiscoveryLogger.debug(
            `Successfully repaired JSON with aggressive fixes in ${filePath}`,
          );
          return result;
        } catch (thirdError) {
          // If all attempts fail, throw a comprehensive error but don't crash the discovery
          const secondErrorMessage =
            secondError instanceof Error
              ? secondError.message
              : String(secondError);
          const thirdErrorMessage =
            thirdError instanceof Error
              ? thirdError.message
              : String(thirdError);

          autoDiscoveryLogger.warn(
            `Unable to repair JSON in ${filePath}. ` +
              `Original: ${originalError}. After basic repair: ${secondErrorMessage}. ` +
              `After aggressive repair: ${thirdErrorMessage}`,
          );

          // Return empty object so discovery can continue
          return {};
        }
      }
    }
  }

  /**
   * Remove duplicate servers and apply prioritization
   */
  private deduplicateServers(
    servers: DiscoveredMCPServer[],
    preferredTools: string[],
  ): DiscoveredMCPServer[] {
    const serverMap = new Map<string, DiscoveredMCPServer>();

    // Sort by priority (higher priority first)
    const sortedServers = servers.sort((a, b) => {
      // Preferred tools get highest priority
      const aPreferred = preferredTools.includes(a.source.tool);
      const bPreferred = preferredTools.includes(b.source.tool);

      if (aPreferred && !bPreferred) {
        return -1;
      }
      if (!aPreferred && bPreferred) {
        return 1;
      }

      // Then by source priority
      return b.source.priority - a.source.priority;
    });

    // Keep the highest priority version of each server
    for (const server of sortedServers) {
      const key = server.id;
      if (!serverMap.has(key)) {
        serverMap.set(key, server);
      }
    }

    return Array.from(serverMap.values());
  }

  /**
   * Map tool names to valid MCP server categories
   */
  private mapToolToCategory(toolName: string): MCPServerCategory {
    const normalizedTool = toolName.toLowerCase().replace(/\s+/g, "-");

    // Map known tools to appropriate categories
    const categoryMap: Record<string, MCPServerCategory> = {
      "claude-desktop": "ai-providers",
      "vs-code": "development",
      cursor: "development",
      windsurf: "development",
      "roo-code": "development",
      generic: "integrations",
    };

    return categoryMap[normalizedTool] || "custom";
  }

  /**
   * Convert discovered server to NeuroLink MCP server format
   */
  private async convertToMCPServer(
    server: DiscoveredMCPServer,
  ): Promise<NeuroLinkMCPServer> {
    // This is a simplified conversion
    // In a real implementation, you might want to actually spawn the server
    // and discover its tools via MCP protocol

    const mcpServer: NeuroLinkMCPServer = {
      id: server.id,
      title: server.title,
      category: this.mapToolToCategory(server.source.tool),
      tools: {
        // Placeholder - would be populated by actual MCP discovery
        [`${server.id}-placeholder`]: {
          name: `${server.id}-placeholder`,
          description: `Placeholder tool for discovered server ${server.id}`,
          category: "discovered",
          isImplemented: false,
          execute: async (params: any, context: any) => {
            return {
              success: false,
              error:
                "This is a placeholder tool. Actual server discovery not yet implemented.",
            };
          },
        },
      },
      registerTool(tool: any): NeuroLinkMCPServer {
        // Check for duplicate tool names
        if (this.tools[tool.name]) {
          throw new Error(
            `Tool '${tool.name}' already exists in discovered server '${this.id}'`,
          );
        }

        // Register the tool
        this.tools[tool.name] = {
          ...tool,
          // Add server metadata to tool
          metadata: {
            ...tool.metadata,
            serverId: this.id,
            serverCategory: this.category,
            registeredAt: Date.now(),
          },
        };

        return this;
      },
      metadata: {
        source: server.source.tool,
        configPath: server.configPath,
        command: server.command,
        args: server.args,
        env: server.env,
        cwd: server.cwd,
        discoveredAt: Date.now(),
      },
    };

    return mcpServer;
  }
}

/**
 * Default auto-discovery instance
 */
export const defaultAutoDiscovery = new MCPAutoDiscovery();

/**
 * Utility function to discover servers with default instance
 */
export async function discoverMCPServers(
  options?: DiscoveryOptions,
): Promise<DiscoveryResult> {
  return defaultAutoDiscovery.discoverServers(options);
}

/**
 * Utility function to auto-register discovered servers
 */
export async function autoRegisterMCPServers(
  registry: MCPToolRegistry,
  options?: DiscoveryOptions,
): Promise<{
  registered: string[];
  failed: string[];
  errors: string[];
}> {
  return defaultAutoDiscovery.autoRegisterServers(registry, options);
}
