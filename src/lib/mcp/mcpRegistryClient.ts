/**
 * MCP Registry Client
 *
 * Client for discovering MCP servers. It always knows a built-in catalog of
 * well-known servers plus any custom entries. When remote lookup is enabled
 * (`remoteLookup: true`, off by default) it also consults:
 * - the official MCP Registry (https://registry.modelcontextprotocol.io)
 * - custom registries that serve the same `/v0.1` API
 *
 * `npm` and `github` registry sources are accepted in configuration but not
 * queried.
 *
 * @module mcp/mcpRegistryClient
 * @since 8.39.0
 */

import { EventEmitter } from "events";
import type {
  MCPServerInfo,
  MCPRegistryClientConfig,
  RegistryConfig,
  RegistrySearchOptions,
  RegistrySearchResult,
  McpRegistryEntry,
  RemoteRegistryTarget,
} from "../types/index.js";
import { mcpLogger } from "../utils/logger.js";
import {
  mapRemoteRecord,
  parseRemotePage,
  parseRemoteRecord,
  resolveRemoteTarget,
} from "./mcpRegistryRemote.js";

const REMOTE_PAGE_SIZE = 100;
const REMOTE_DEFAULT_MAX_PAGES = 5;
// A list page of 100 servers is well under 2 MiB; the cap only stops a hostile
// or broken registry from filling memory within the timeout.
const REMOTE_MAX_RESPONSE_BYTES = 8 * 1024 * 1024;
const CACHE_MAX_ENTRIES = 500;

/**
 * Well-known MCP servers catalog
 */
const WELL_KNOWN_SERVERS: McpRegistryEntry[] = [
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
 *
 * // Opt in to the official MCP Registry (remote entries are never `verified`)
 * const remote = new MCPRegistryClient({ remoteLookup: true });
 * const found = await remote.getEntry("io.github.example/my-server");
 * ```
 */
export class MCPRegistryClient extends EventEmitter {
  private config: Required<MCPRegistryClientConfig>;
  private cache: Map<string, { data: unknown; timestamp: number }> = new Map();
  private customEntries: Map<string, McpRegistryEntry> = new Map();

  constructor(config: MCPRegistryClientConfig = {}) {
    super();

    this.config = {
      registries: [
        ...(config.registries ?? [{ type: "official", enableCache: true }]),
      ],
      remoteLookup: config.remoteLookup ?? false,
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

    // Get all entries (from cache or fetch). Copy: the sort below must not
    // reorder the cached list.
    const listed = query
      ? await this.collectEntries(query)
      : await this.getAllEntries();
    let entries = [...listed];

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
   * Get a specific entry by ID.
   *
   * Checks custom entries, then the built-in catalog. Only when remote
   * lookup is enabled does a miss fall through to the configured registries
   * (first hit wins); a registry that fails or answers with something
   * unreadable is skipped, so the result is `undefined` rather than an error.
   */
  async getEntry(id: string): Promise<McpRegistryEntry | undefined> {
    // Check custom entries first
    if (this.customEntries.has(id)) {
      return this.customEntries.get(id);
    }

    // Check well-known servers
    const wellKnown = WELL_KNOWN_SERVERS.find((s) => s.id === id);
    if (wellKnown) {
      return wellKnown;
    }

    if (!this.config.remoteLookup) {
      return undefined;
    }

    // An empty id, "." and ".." are path segments: URL normalisation would
    // turn them into a different registry endpoint, so they are a miss.
    if (id === "" || id === "." || id === "..") {
      return undefined;
    }

    for (const target of this.getRemoteTargets()) {
      const entry = await this.fetchRemoteEntry(target, id);
      if (entry) {
        return entry;
      }
    }

    return undefined;
  }

  /**
   * Get all available entries.
   *
   * Lists the built-in catalog, then the custom entries (a custom entry
   * replaces a built-in one with the same id), then, when remote lookup is
   * enabled, the servers of each configured registry. A remote entry never
   * replaces a local one. A registry that cannot be read contributes nothing.
   */
  async getAllEntries(): Promise<McpRegistryEntry[]> {
    return this.collectEntries();
  }

  /**
   * Collect local entries and, when remote lookup is on, each registry's
   * servers. `query` narrows the remote lists with the registry's own
   * `search` parameter (substring match on server name); `search()` still
   * applies its full filter afterwards.
   *
   * The merged list is cached only when every registry answered, so a
   * transient failure is not pinned for the whole TTL.
   */
  private async collectEntries(query?: string): Promise<McpRegistryEntry[]> {
    // Without remote lookup the query changes nothing, so share one entry.
    const cacheKey =
      query === undefined || !this.config.remoteLookup
        ? "all-entries"
        : `all-entries:${query.toLowerCase()}`;

    // The merged list must not outlive the shortest-lived registry cache, and
    // is not cached at all if any registry has caching switched off.
    const targets = this.config.remoteLookup ? this.getRemoteTargets() : [];
    const cacheable =
      this.config.enableCache &&
      targets.every((t) => this.isRemoteCacheEnabled(t));
    const ttl = Math.min(
      this.config.defaultCacheTTL,
      ...targets.map((t) => t.config.cacheTTL ?? this.config.defaultCacheTTL),
    );

    // Check cache
    const cached = cacheable
      ? this.readCache<McpRegistryEntry[]>(cacheKey, ttl)
      : undefined;
    if (cached) {
      return cached;
    }

    // Combine well-known servers and custom entries, deduplicating by ID.
    // Custom entries take precedence over well-known servers.
    const customIds = new Set(this.customEntries.keys());
    const localEntries = [
      ...WELL_KNOWN_SERVERS.filter((entry) => !customIds.has(entry.id)),
      ...Array.from(this.customEntries.values()),
    ];

    let allEntries = localEntries;
    let complete = true;

    if (this.config.remoteLookup) {
      const lists = await Promise.all(
        targets.map((target) => this.fetchRemoteList(target, query)),
      );
      const seen = new Set(localEntries.map((entry) => entry.id));
      const remoteEntries: McpRegistryEntry[] = [];
      for (const list of lists) {
        complete = complete && list.ok;
        for (const entry of list.entries) {
          if (!seen.has(entry.id)) {
            seen.add(entry.id);
            remoteEntries.push(entry);
          }
        }
      }
      allEntries = [...localEntries, ...remoteEntries];
    }

    // Cache the result
    if (cacheable && complete) {
      this.writeCache(cacheKey, allEntries);
    }

    return allEntries;
  }

  /**
   * Registries the client may query: `official` and `custom` sources with a
   * usable URL. Other sources are skipped.
   */
  private getRemoteTargets(): RemoteRegistryTarget[] {
    return this.config.registries.flatMap((registry) => {
      const target = resolveRemoteTarget(registry);
      if (target === undefined) {
        mcpLogger.debug(
          `[MCPRegistryClient] Skipping registry of type "${registry.type}": not queryable (unsupported type, missing or unusable URL, or a bearer token on plain http to a non-loopback host)`,
        );
        return [];
      }
      return [target];
    });
  }

  private async fetchRemoteEntry(
    target: RemoteRegistryTarget,
    id: string,
  ): Promise<McpRegistryEntry | undefined> {
    const cacheKey = `remote-entry:${target.apiBase}:${id}`;
    const cached = this.readRemoteCache<McpRegistryEntry>(cacheKey, target);
    if (cached) {
      return cached;
    }

    try {
      const response = await this.requestJson(
        target,
        `/servers/${encodeURIComponent(id)}/versions/latest`,
      );
      if (response.body === undefined) {
        return undefined;
      }

      const record = parseRemoteRecord(response.body);
      if (
        record === undefined ||
        record.status === "deleted" ||
        record.server.name.toLowerCase() !== id.toLowerCase()
      ) {
        throw new Error("registry returned no record for the requested server");
      }

      const entry = mapRemoteRecord(record, target.apiBase);
      this.writeRemoteCache(cacheKey, entry, target);
      return entry;
    } catch (error) {
      this.reportRemoteError(target, "getEntry", error);
      return undefined;
    }
  }

  private async fetchRemoteList(
    target: RemoteRegistryTarget,
    query?: string,
  ): Promise<{ entries: McpRegistryEntry[]; ok: boolean }> {
    const cacheKey = `remote-list:${target.apiBase}:${(query ?? "").toLowerCase()}`;
    const cached = this.readRemoteCache<McpRegistryEntry[]>(cacheKey, target);
    if (cached) {
      return { entries: cached, ok: true };
    }

    try {
      const configuredPages = target.config.maxPages;
      const maxPages =
        configuredPages !== undefined && Number.isFinite(configuredPages)
          ? Math.max(1, Math.floor(configuredPages))
          : REMOTE_DEFAULT_MAX_PAGES;
      const entries: McpRegistryEntry[] = [];
      const seenCursors = new Set<string>();
      let cursor: string | undefined;

      for (let page = 0; page < maxPages; page++) {
        const params = new URLSearchParams({
          version: "latest",
          limit: String(REMOTE_PAGE_SIZE),
        });
        if (query) {
          params.set("search", query);
        }
        if (cursor) {
          params.set("cursor", cursor);
        }

        const response = await this.requestJson(target, "/servers", params);
        const { records, nextCursor } = parseRemotePage(response.body);
        entries.push(
          ...records
            .filter((record) => record.status !== "deleted")
            .map((record) => mapRemoteRecord(record, target.apiBase)),
        );

        if (nextCursor === undefined || seenCursors.has(nextCursor)) {
          break;
        }
        if (page === maxPages - 1) {
          mcpLogger.debug(
            `[MCPRegistryClient] ${target.apiBase}: stopped after ${maxPages} page(s); more servers are available`,
          );
          break;
        }
        seenCursors.add(nextCursor);
        cursor = nextCursor;
      }

      this.writeRemoteCache(cacheKey, entries, target);
      return { entries, ok: true };
    } catch (error) {
      this.reportRemoteError(target, "list", error);
      return { entries: [], ok: false };
    }
  }

  /**
   * GET a JSON document from a registry, bounded by its timeout. A 404
   * resolves with an undefined body (a normal "not found"); any other
   * non-2xx status, a network error, a timeout or a body that is not JSON
   * rejects.
   */
  private async requestJson(
    target: RemoteRegistryTarget,
    path: string,
    params?: URLSearchParams,
  ): Promise<{ body: unknown }> {
    const url = new URL(`${target.apiBase}${path}`);
    params?.forEach((value, key) => url.searchParams.set(key, value));

    const headers: Record<string, string> = {
      Accept: "application/json",
      "User-Agent": this.config.userAgent,
      ...(target.config.authToken
        ? { Authorization: `Bearer ${target.config.authToken}` }
        : {}),
    };

    const response = await globalThis.fetch(url, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(target.config.timeout ?? this.config.timeout),
    });

    if (response.status === 404) {
      await response.body?.cancel();
      return { body: undefined };
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(`registry responded with HTTP ${response.status}`);
    }

    return { body: await this.readBoundedJson(response) };
  }

  /**
   * Parse a JSON body, refusing to buffer more than
   * `REMOTE_MAX_RESPONSE_BYTES`. The request timeout bounds duration, not
   * memory, so the size is checked while reading.
   */
  private async readBoundedJson(response: Response): Promise<unknown> {
    const chunks: Uint8Array[] = [];
    let size = 0;
    if (response.body) {
      const reader = response.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        size += value.byteLength;
        if (size > REMOTE_MAX_RESPONSE_BYTES) {
          await reader.cancel();
          throw new Error(
            `registry response exceeds ${REMOTE_MAX_RESPONSE_BYTES} bytes`,
          );
        }
        chunks.push(value);
      }
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  }

  private reportRemoteError(
    target: RemoteRegistryTarget,
    operation: "getEntry" | "list",
    error: unknown,
  ): void {
    const baseMessage = error instanceof Error ? error.message : String(error);
    // fetch() reports every connection failure as "fetch failed"; the code
    // (ECONNREFUSED, ENOTFOUND, ...) sits on the cause.
    const cause = error instanceof Error ? error.cause : undefined;
    const causeCode =
      typeof cause === "object" && cause !== null && "code" in cause
        ? String(cause.code)
        : undefined;
    const message =
      causeCode === undefined ? baseMessage : `${baseMessage} (${causeCode})`;

    mcpLogger.debug(
      `[MCPRegistryClient] ${operation} failed for ${target.apiBase}: ${message}`,
    );
    try {
      this.emit("registryError", {
        registry: target.apiBase,
        operation,
        message,
      });
    } catch (listenerError) {
      // A throwing listener must not turn a degraded lookup into an error.
      mcpLogger.debug(
        `[MCPRegistryClient] registryError listener threw: ${String(listenerError)}`,
      );
    }
  }

  private readCache<T>(key: string, ttl: number): T | undefined {
    const cached = this.cache.get(key);
    // Each key is written with one shape only, so the cast matches the writer.
    return cached && Date.now() - cached.timestamp < ttl
      ? (cached.data as T)
      : undefined;
  }

  private readRemoteCache<T>(
    key: string,
    target: RemoteRegistryTarget,
  ): T | undefined {
    return this.isRemoteCacheEnabled(target)
      ? this.readCache<T>(
          key,
          target.config.cacheTTL ?? this.config.defaultCacheTTL,
        )
      : undefined;
  }

  private writeRemoteCache(
    key: string,
    data: unknown,
    target: RemoteRegistryTarget,
  ): void {
    if (this.isRemoteCacheEnabled(target)) {
      this.writeCache(key, data);
    }
  }

  /**
   * The client-wide `enableCache: false` is a ceiling: a registry can switch
   * its own caching off but cannot turn it back on.
   */
  private isRemoteCacheEnabled(target: RemoteRegistryTarget): boolean {
    return this.config.enableCache && (target.config.enableCache ?? true);
  }

  private writeCache(key: string, data: unknown): void {
    // Bound the cache: a long-lived client that searches many different
    // queries must not grow without limit. Map iterates oldest first.
    if (!this.cache.has(key) && this.cache.size >= CACHE_MAX_ENTRIES) {
      const oldest = this.cache.keys().next();
      if (!oldest.done) {
        this.cache.delete(oldest.value);
      }
    }
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * Get entries by category
   */
  async getByCategory(category: string): Promise<McpRegistryEntry[]> {
    const entries = await this.getAllEntries();
    return entries.filter((e) => e.categories?.includes(category));
  }

  /**
   * Get entries by tag
   */
  async getByTag(tag: string): Promise<McpRegistryEntry[]> {
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
  toServerInfo(entry: McpRegistryEntry): MCPServerInfo {
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
  addCustomEntry(entry: McpRegistryEntry): void {
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
   * Turn remote lookup on or off at runtime, e.g. on the client returned by
   * `NeuroLink.getMCPRegistryClient()`. Off is the default. Clears the cache
   * so the next lookup reflects the new setting.
   */
  setRemoteLookup(enabled: boolean): void {
    this.config.remoteLookup = enabled;
    this.clearCache();
    this.emit("remoteLookupChanged", { enabled });
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
  checkRequiredEnvVars(entry: McpRegistryEntry): {
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
  getInstallCommand(entry: McpRegistryEntry): string | undefined {
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
  async getPopularServers(limit = 10): Promise<McpRegistryEntry[]> {
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
  async getVerifiedServers(): Promise<McpRegistryEntry[]> {
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
export function getWellKnownServer(id: string): McpRegistryEntry | undefined {
  return WELL_KNOWN_SERVERS.find((s) => s.id === id);
}

/**
 * Get all well-known servers
 */
export function getAllWellKnownServers(): McpRegistryEntry[] {
  return [...WELL_KNOWN_SERVERS];
}
