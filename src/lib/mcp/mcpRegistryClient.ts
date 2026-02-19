/**
 * MCP Registry Client
 *
 * Client for discovering MCP servers from centralized registries.
 * Supports multiple registry sources including:
 * - Official MCP Registry
 * - NPM packages
 * - GitHub repositories
 * - Custom registries
 *
 * @module mcp/mcpRegistryClient
 * @since 8.39.0
 */

import { EventEmitter } from "events";
import type { MCPServerInfo, MCPTransportType } from "../types/mcpTypes.js";
import type { JsonObject } from "../types/common.js";

/**
 * Registry source types
 */
export type RegistrySourceType =
  | "official" // Official MCP registry
  | "npm" // NPM packages
  | "github" // GitHub repositories
  | "custom"; // Custom registry URL

/**
 * Registry entry for an MCP server
 */
export type RegistryEntry = {
  /**
   * Unique identifier
   */
  id: string;

  /**
   * Server name
   */
  name: string;

  /**
   * Server description
   */
  description: string;

  /**
   * Server version
   */
  version: string;

  /**
   * Author or maintainer
   */
  author?: string;

  /**
   * License
   */
  license?: string;

  /**
   * Homepage URL
   */
  homepage?: string;

  /**
   * Repository URL
   */
  repository?: string;

  /**
   * NPM package name (if applicable)
   */
  npmPackage?: string;

  /**
   * Installation command
   */
  installCommand?: string;

  /**
   * Command to run the server
   */
  command?: string;

  /**
   * Command arguments
   */
  args?: string[];

  /**
   * Required environment variables
   */
  requiredEnvVars?: string[];

  /**
   * Supported transport types
   */
  transports?: MCPTransportType[];

  /**
   * Server categories
   */
  categories?: string[];

  /**
   * Server tags
   */
  tags?: string[];

  /**
   * Tool names provided by the server
   */
  tools?: string[];

  /**
   * Download count (popularity metric)
   */
  downloads?: number;

  /**
   * Star count (if from GitHub)
   */
  stars?: number;

  /**
   * Last updated date
   */
  lastUpdated?: string;

  /**
   * Verification status
   */
  verified?: boolean;

  /**
   * Custom metadata
   */
  metadata?: JsonObject;
};

/**
 * Registry configuration
 */
export type RegistryConfig = {
  /**
   * Registry type
   */
  type: RegistrySourceType;

  /**
   * Registry URL or identifier
   */
  url?: string;

  /**
   * Authentication token
   */
  authToken?: string;

  /**
   * Request timeout in milliseconds
   */
  timeout?: number;

  /**
   * Enable caching
   */
  enableCache?: boolean;

  /**
   * Cache TTL in milliseconds
   */
  cacheTTL?: number;
};

/**
 * Search options for registry queries
 */
export type RegistrySearchOptions = {
  /**
   * Search query (name, description, tags)
   */
  query?: string;

  /**
   * Filter by categories
   */
  categories?: string[];

  /**
   * Filter by tags
   */
  tags?: string[];

  /**
   * Filter by transport type
   */
  transport?: MCPTransportType;

  /**
   * Only verified servers
   */
  verifiedOnly?: boolean;

  /**
   * Sort by field
   */
  sortBy?: "name" | "downloads" | "stars" | "lastUpdated";

  /**
   * Sort direction
   */
  sortDirection?: "asc" | "desc";

  /**
   * Maximum results
   */
  limit?: number;

  /**
   * Offset for pagination
   */
  offset?: number;
};

/**
 * Search result
 */
export type RegistrySearchResult = {
  entries: RegistryEntry[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

/**
 * Registry client configuration
 */
export type MCPRegistryClientConfig = {
  /**
   * Default registries to use
   */
  registries?: RegistryConfig[];

  /**
   * Enable automatic caching
   */
  enableCache?: boolean;

  /**
   * Default cache TTL
   */
  defaultCacheTTL?: number;

  /**
   * Request timeout
   */
  timeout?: number;

  /**
   * User agent string
   */
  userAgent?: string;
};

/**
 * Well-known MCP servers catalog
 */
const WELL_KNOWN_SERVERS: RegistryEntry[] = [
  {
    id: "filesystem",
    name: "Filesystem",
    description:
      "File system operations - read, write, create, list directories",
    version: "1.0.0",
    npmPackage: "@modelcontextprotocol/server-filesystem",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-filesystem"],
    transports: ["stdio"],
    categories: ["file-system"],
    tags: ["files", "directories", "read", "write"],
    tools: ["read_file", "write_file", "list_directory", "create_directory"],
    verified: true,
  },
  {
    id: "github",
    name: "GitHub",
    description: "GitHub repository management and file operations",
    version: "1.0.0",
    npmPackage: "@modelcontextprotocol/server-github",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-github"],
    requiredEnvVars: ["GITHUB_PERSONAL_ACCESS_TOKEN"],
    transports: ["stdio"],
    categories: ["version-control", "api"],
    tags: ["github", "git", "repositories", "issues", "pull-requests"],
    tools: [
      "create_repository",
      "list_commits",
      "create_issue",
      "create_pull_request",
    ],
    verified: true,
  },
  {
    id: "postgres",
    name: "PostgreSQL",
    description: "PostgreSQL database query and management",
    version: "1.0.0",
    npmPackage: "@modelcontextprotocol/server-postgres",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-postgres"],
    requiredEnvVars: ["DATABASE_URL"],
    transports: ["stdio"],
    categories: ["database"],
    tags: ["postgres", "postgresql", "sql", "database", "query"],
    tools: ["query", "list_tables", "describe_table"],
    verified: true,
  },
  {
    id: "sqlite",
    name: "SQLite",
    description: "SQLite database operations and queries",
    version: "1.0.0",
    npmPackage: "@modelcontextprotocol/server-sqlite",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-sqlite"],
    transports: ["stdio"],
    categories: ["database"],
    tags: ["sqlite", "sql", "database", "local"],
    tools: ["query", "list_tables", "describe_table"],
    verified: true,
  },
  {
    id: "brave-search",
    name: "Brave Search",
    description: "Web search using Brave Search API",
    version: "1.0.0",
    npmPackage: "@modelcontextprotocol/server-brave-search",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-brave-search"],
    requiredEnvVars: ["BRAVE_API_KEY"],
    transports: ["stdio"],
    categories: ["search", "api"],
    tags: ["search", "web", "brave", "internet"],
    tools: ["web_search", "local_search"],
    verified: true,
  },
  {
    id: "puppeteer",
    name: "Puppeteer",
    description: "Web scraping and browser automation",
    version: "1.0.0",
    npmPackage: "@modelcontextprotocol/server-puppeteer",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-puppeteer"],
    transports: ["stdio"],
    categories: ["automation", "web"],
    tags: ["browser", "scraping", "automation", "puppeteer"],
    tools: ["navigate", "screenshot", "click", "type", "get_content"],
    verified: true,
  },
  {
    id: "git",
    name: "Git",
    description: "Git repository operations and version control",
    version: "1.0.0",
    npmPackage: "@modelcontextprotocol/server-git",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-git"],
    transports: ["stdio"],
    categories: ["version-control"],
    tags: ["git", "vcs", "commits", "branches"],
    tools: ["git_status", "git_log", "git_diff", "git_commit"],
    verified: true,
  },
  {
    id: "memory",
    name: "Memory",
    description: "Persistent memory and knowledge storage",
    version: "1.0.0",
    npmPackage: "@modelcontextprotocol/server-memory",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-memory"],
    transports: ["stdio"],
    categories: ["memory", "storage"],
    tags: ["memory", "knowledge", "storage", "persistent"],
    tools: ["store", "retrieve", "search", "delete"],
    verified: true,
  },
  {
    id: "slack",
    name: "Slack",
    description: "Slack workspace integration",
    version: "1.0.0",
    npmPackage: "@modelcontextprotocol/server-slack",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-slack"],
    requiredEnvVars: ["SLACK_BOT_TOKEN"],
    transports: ["stdio"],
    categories: ["communication", "api"],
    tags: ["slack", "messaging", "chat", "team"],
    tools: ["send_message", "list_channels", "get_channel_history"],
    verified: true,
  },
  {
    id: "google-drive",
    name: "Google Drive",
    description: "Google Drive file management",
    version: "1.0.0",
    npmPackage: "@modelcontextprotocol/server-gdrive",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-gdrive"],
    transports: ["stdio"],
    categories: ["file-system", "api"],
    tags: ["google", "drive", "files", "cloud"],
    tools: ["list_files", "read_file", "create_file", "search_files"],
    verified: true,
  },
];

/**
 * MCP Registry Client
 *
 * Provides methods to discover and install MCP servers from registries.
 *
 * @example
 * ```typescript
 * const client = new MCPRegistryClient();
 *
 * // Search for servers
 * const results = await client.search({ query: "database" });
 *
 * // Get server details
 * const entry = await client.getEntry("postgres");
 *
 * // Convert to MCPServerInfo
 * const serverInfo = client.toServerInfo(entry);
 * ```
 */
export class MCPRegistryClient extends EventEmitter {
  private config: Required<MCPRegistryClientConfig>;
  private cache: Map<string, { data: unknown; timestamp: number }> = new Map();
  private customEntries: Map<string, RegistryEntry> = new Map();

  constructor(config: MCPRegistryClientConfig = {}) {
    super();

    this.config = {
      registries: config.registries ?? [
        { type: "official", enableCache: true },
      ],
      enableCache: config.enableCache ?? true,
      defaultCacheTTL: config.defaultCacheTTL ?? 3600000, // 1 hour
      timeout: config.timeout ?? 10000,
      userAgent: config.userAgent ?? "NeuroLink-MCP-Registry-Client/1.0",
    };
  }

  /**
   * Search the registry
   */
  async search(
    options: RegistrySearchOptions = {},
  ): Promise<RegistrySearchResult> {
    const {
      query,
      categories,
      tags,
      transport,
      verifiedOnly = false,
      sortBy = "downloads",
      sortDirection = "desc",
      limit: rawLimit = 25,
      offset: rawOffset = 0,
    } = options;

    const limit = Math.max(1, rawLimit);
    const offset = Math.max(0, rawOffset);

    // Get all entries (from cache or fetch)
    let entries = await this.getAllEntries();

    // Apply filters
    if (query) {
      const searchLower = query.toLowerCase();
      entries = entries.filter(
        (e) =>
          e.name.toLowerCase().includes(searchLower) ||
          e.description.toLowerCase().includes(searchLower) ||
          e.tags?.some((t) => t.toLowerCase().includes(searchLower)),
      );
    }

    if (categories?.length) {
      entries = entries.filter((e) =>
        e.categories?.some((c) => categories.includes(c)),
      );
    }

    if (tags?.length) {
      entries = entries.filter((e) => e.tags?.some((t) => tags.includes(t)));
    }

    if (transport) {
      entries = entries.filter((e) => e.transports?.includes(transport));
    }

    if (verifiedOnly) {
      entries = entries.filter((e) => e.verified);
    }

    // Sort
    entries.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "downloads":
          comparison = (a.downloads ?? 0) - (b.downloads ?? 0);
          break;
        case "stars":
          comparison = (a.stars ?? 0) - (b.stars ?? 0);
          break;
        case "lastUpdated":
          comparison = (a.lastUpdated ?? "").localeCompare(b.lastUpdated ?? "");
          break;
      }

      return sortDirection === "desc" ? -comparison : comparison;
    });

    const totalCount = entries.length;

    // Apply pagination
    entries = entries.slice(offset, offset + limit);

    return {
      entries,
      totalCount,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
      hasMore: offset + entries.length < totalCount,
    };
  }

  /**
   * Get a specific entry by ID
   */
  async getEntry(id: string): Promise<RegistryEntry | undefined> {
    // Check custom entries first
    if (this.customEntries.has(id)) {
      return this.customEntries.get(id);
    }

    // Check well-known servers
    const wellKnown = WELL_KNOWN_SERVERS.find((s) => s.id === id);
    if (wellKnown) {
      return wellKnown;
    }

    // TODO: Fetch from remote registry
    return undefined;
  }

  /**
   * Get all available entries
   */
  async getAllEntries(): Promise<RegistryEntry[]> {
    const cacheKey = "all-entries";

    // Check cache
    if (this.config.enableCache) {
      const cached = this.cache.get(cacheKey);
      if (
        cached &&
        Date.now() - cached.timestamp < this.config.defaultCacheTTL
      ) {
        return cached.data as RegistryEntry[];
      }
    }

    // Combine well-known servers and custom entries, deduplicating by ID.
    // Custom entries take precedence over well-known servers.
    const customIds = new Set(this.customEntries.keys());
    const allEntries = [
      ...WELL_KNOWN_SERVERS.filter((entry) => !customIds.has(entry.id)),
      ...Array.from(this.customEntries.values()),
    ];

    // Cache the result
    if (this.config.enableCache) {
      this.cache.set(cacheKey, { data: allEntries, timestamp: Date.now() });
    }

    return allEntries;
  }

  /**
   * Get entries by category
   */
  async getByCategory(category: string): Promise<RegistryEntry[]> {
    const entries = await this.getAllEntries();
    return entries.filter((e) => e.categories?.includes(category));
  }

  /**
   * Get entries by tag
   */
  async getByTag(tag: string): Promise<RegistryEntry[]> {
    const entries = await this.getAllEntries();
    return entries.filter((e) => e.tags?.includes(tag));
  }

  /**
   * Get all categories
   */
  async getCategories(): Promise<string[]> {
    const entries = await this.getAllEntries();
    const categories = new Set<string>();

    for (const entry of entries) {
      for (const category of entry.categories ?? []) {
        categories.add(category);
      }
    }

    return Array.from(categories).sort();
  }

  /**
   * Get all tags
   */
  async getTags(): Promise<string[]> {
    const entries = await this.getAllEntries();
    const tags = new Set<string>();

    for (const entry of entries) {
      for (const tag of entry.tags ?? []) {
        tags.add(tag);
      }
    }

    return Array.from(tags).sort();
  }

  /**
   * Convert registry entry to MCPServerInfo
   */
  toServerInfo(entry: RegistryEntry): MCPServerInfo {
    return {
      id: entry.id,
      name: entry.name,
      description: entry.description,
      command: entry.command,
      args: entry.args,
      transport: entry.transports?.[0] ?? "stdio",
      status: "stopped",
      tools:
        entry.tools?.map((name) => ({
          name,
          description: `Tool: ${name}`,
        })) ?? [],
      metadata: {
        ...entry.metadata,
        version: entry.version,
        author: entry.author,
        license: entry.license,
        homepage: entry.homepage,
        repository: entry.repository,
        npmPackage: entry.npmPackage,
        requiredEnvVars: entry.requiredEnvVars,
        categories: entry.categories,
        tags: entry.tags,
        verified: entry.verified,
      },
    };
  }

  /**
   * Add a custom registry entry
   */
  addCustomEntry(entry: RegistryEntry): void {
    this.customEntries.set(entry.id, entry);
    this.clearCache();
    this.emit("entryAdded", { entry });
  }

  /**
   * Remove a custom registry entry
   */
  removeCustomEntry(id: string): boolean {
    const removed = this.customEntries.delete(id);
    if (removed) {
      this.clearCache();
      this.emit("entryRemoved", { id });
    }
    return removed;
  }

  /**
   * Add a registry configuration
   */
  addRegistry(config: RegistryConfig): void {
    this.config.registries.push(config);
    this.clearCache();
    const { authToken: _, ...safeConfig } = config;
    this.emit("registryAdded", { config: safeConfig });
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
    this.emit("cacheCleared");
  }

  /**
   * Check if required environment variables are set
   */
  checkRequiredEnvVars(entry: RegistryEntry): {
    ready: boolean;
    missing: string[];
  } {
    const missing: string[] = [];

    for (const envVar of entry.requiredEnvVars ?? []) {
      if (!process.env[envVar]) {
        missing.push(envVar);
      }
    }

    return {
      ready: missing.length === 0,
      missing,
    };
  }

  /**
   * Get installation command for an entry
   */
  getInstallCommand(entry: RegistryEntry): string | undefined {
    if (entry.installCommand) {
      return entry.installCommand;
    }

    if (entry.npmPackage) {
      return `npx -y ${entry.npmPackage}`;
    }

    return undefined;
  }

  /**
   * Get popular servers
   */
  async getPopularServers(limit = 10): Promise<RegistryEntry[]> {
    const result = await this.search({
      sortBy: "downloads",
      sortDirection: "desc",
      limit,
    });

    return result.entries;
  }

  /**
   * Get verified servers
   */
  async getVerifiedServers(): Promise<RegistryEntry[]> {
    const result = await this.search({
      verifiedOnly: true,
    });

    return result.entries;
  }

  /**
   * Get statistics
   */
  async getStatistics(): Promise<{
    totalEntries: number;
    verifiedEntries: number;
    categories: number;
    tags: number;
    customEntries: number;
  }> {
    const entries = await this.getAllEntries();
    const categories = await this.getCategories();
    const tags = await this.getTags();

    return {
      totalEntries: entries.length,
      verifiedEntries: entries.filter((e) => e.verified).length,
      categories: categories.length,
      tags: tags.length,
      customEntries: this.customEntries.size,
    };
  }
}

/**
 * Global MCP registry client instance
 */
export const globalMCPRegistryClient = new MCPRegistryClient();

/**
 * Quick lookup function for well-known servers
 */
export function getWellKnownServer(id: string): RegistryEntry | undefined {
  return WELL_KNOWN_SERVERS.find((s) => s.id === id);
}

/**
 * Get all well-known servers
 */
export function getAllWellKnownServers(): RegistryEntry[] {
  return [...WELL_KNOWN_SERVERS];
}
