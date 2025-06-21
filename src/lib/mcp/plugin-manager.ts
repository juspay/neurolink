/**
 * PluginManager - Central Orchestrator for MCP Lifecycle
 * Implements generic factory pattern with manifest-based discovery
 * Based on research blueprint for extensible plugin architecture
 */

import * as fs from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

// ES Module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { MCP } from "./contracts/mcp-contract.js";
import type {
  MCPConstructor,
  MCPMetadata,
  DiscoveredMCP,
  ExecutionContext,
} from "./contracts/mcp-contract.js";
import { SecurityManager } from "./security-manager.js";
import { mcpLogger } from "./logging.js";

/**
 * Plugin Manager Configuration
 */
interface PluginManagerConfig {
  /** Enable/disable plugin discovery */
  enableDiscovery?: boolean;
  /** Custom plugin directories */
  pluginDirectories?: string[];
  /** Security level for plugins */
  securityLevel?: "strict" | "moderate" | "permissive";
  /** Maximum plugins to load */
  maxPlugins?: number;
}

/**
 * Central Plugin Manager implementing the research blueprint
 */
export class PluginManager {
  private static instance: PluginManager;
  private mcpConstructors = new Map<string, MCPConstructor>();
  private mcpInstances = new Map<string, MCP>();
  private discoveredMCPs = new Map<string, DiscoveredMCP>();
  private securityManager: SecurityManager;
  private initialized = false;
  private config: PluginManagerConfig;

  private constructor(config: PluginManagerConfig = {}) {
    this.config = {
      enableDiscovery: true,
      pluginDirectories: [],
      securityLevel: "moderate",
      maxPlugins: 50,
      ...config,
    };
    this.securityManager = new SecurityManager(this.config.securityLevel!);
  }

  /**
   * Get the singleton instance
   */
  static getInstance(config?: PluginManagerConfig): PluginManager {
    if (!PluginManager.instance) {
      PluginManager.instance = new PluginManager(config);
    }
    return PluginManager.instance;
  }

  /**
   * Initialize the plugin manager with discovery
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    mcpLogger.info("[PluginManager] Initializing plugin discovery...");

    if (this.config.enableDiscovery) {
      await this.discoverPlugins();
    }

    this.initialized = true;
    mcpLogger.info(
      `[PluginManager] Initialized with ${this.discoveredMCPs.size} discovered plugins`,
    );
  }

  /**
   * Discover plugins following research blueprint priority:
   * 1. Core plugins (bundled)
   * 2. Project plugins (./neurolink-mcp/)
   * 3. Installed plugins (node_modules)
   */
  private async discoverPlugins(): Promise<void> {
    const functionTag = "PluginManager.discoverPlugins";

    try {
      // 1. Discover core plugins
      await this.discoverCorePlugins();

      // 2. Discover project plugins
      await this.discoverProjectPlugins();

      // 3. Discover installed plugins
      await this.discoverInstalledPlugins();

      mcpLogger.debug(`[${functionTag}] Discovery completed`, {
        total: this.discoveredMCPs.size,
        bySource: this.getDiscoveryStats(),
      });
    } catch (error) {
      mcpLogger.error(`[${functionTag}] Discovery failed:`, error);
    }
  }

  /**
   * Discover core plugins bundled with NeuroLink
   */
  private async discoverCorePlugins(): Promise<void> {
    // Correctly resolve path from 'dist' to 'src'
    const corePluginsPath = path.resolve(
      __dirname,
      "../../src/lib/mcp/plugins/core",
    );
    await this.discoverPluginsInDirectory(corePluginsPath, "core");
  }

  /**
   * Discover project-local plugins
   */
  private async discoverProjectPlugins(): Promise<void> {
    const projectPluginsPath = path.join(process.cwd(), "neurolink-mcp");
    await this.discoverPluginsInDirectory(projectPluginsPath, "project");
  }

  /**
   * Discover installed plugins from node_modules
   */
  private async discoverInstalledPlugins(): Promise<void> {
    const nodeModulesPath = path.join(process.cwd(), "node_modules");

    try {
      const packages = await fs.readdir(nodeModulesPath);

      for (const pkg of packages) {
        if (pkg.startsWith(".")) {
          continue;
        }

        const packagePath = path.join(nodeModulesPath, pkg);
        const packageJsonPath = path.join(packagePath, "package.json");

        try {
          const packageJson = JSON.parse(
            await fs.readFile(packageJsonPath, "utf-8"),
          );

          // Check for neurolink-mcp keyword
          if (packageJson.keywords?.includes("neurolink-mcp")) {
            await this.discoverPluginsInDirectory(packagePath, "installed");
          }
        } catch {
          // Skip invalid packages
        }
      }
    } catch {
      // node_modules doesn't exist or not accessible
    }
  }

  /**
   * Discover plugins in a specific directory
   */
  private async discoverPluginsInDirectory(
    dirPath: string,
    source: "core" | "project" | "installed",
  ): Promise<void> {
    try {
      const manifestPath = path.join(dirPath, "neurolink-mcp.json");
      const manifestExists = await fs
        .access(manifestPath)
        .then(() => true)
        .catch(() => false);

      if (!manifestExists) {
        return;
      }

      const manifest: unknown = JSON.parse(
        await fs.readFile(manifestPath, "utf-8"),
      );

      // Validate manifest
      if (!this.validateManifest(manifest)) {
        mcpLogger.warn(`[PluginManager] Invalid manifest in ${dirPath}`);
        return;
      }

      // Now we know manifest is MCPMetadata due to type guard
      const validatedManifest = manifest as MCPMetadata;

      const entryPath = path
        .resolve(dirPath, validatedManifest.main)
        .replace(`${process.cwd()}/src/lib`, `${process.cwd()}/dist`);

      this.discoveredMCPs.set(validatedManifest.name, {
        metadata: validatedManifest,
        entryPath,
        source,
        constructor: undefined, // Will be loaded on demand
      });

      mcpLogger.debug(
        `[PluginManager] Discovered ${validatedManifest.name} from ${source}`,
      );
    } catch (error) {
      mcpLogger.debug(
        `[PluginManager] Failed to discover plugin in ${dirPath}:`,
        error,
      );
    }
  }

  /**
   * Validate manifest structure
   */
  private validateManifest(manifest: unknown): manifest is MCPMetadata {
    if (!manifest || typeof manifest !== "object") {
      return false;
    }

    const obj = manifest as any;
    return (
      typeof obj.name === "string" &&
      typeof obj.version === "string" &&
      typeof obj.main === "string" &&
      obj.engine?.neurolink &&
      typeof obj.description === "string" &&
      Array.isArray(obj.permissions)
    );
  }

  /**
   * Generic Factory Method - Creates type-safe MCP instances
   * Core implementation of the research blueprint
   */
  async createInstance<T extends MCP>(
    name: string,
    config: unknown,
  ): Promise<T> {
    const functionTag = "PluginManager.createInstance";

    if (!this.initialized) {
      await this.initialize();
    }

    // Check if already instantiated
    const existingInstance = this.mcpInstances.get(name);
    if (existingInstance) {
      mcpLogger.debug(
        `[${functionTag}] Returning existing instance of ${name}`,
      );
      return existingInstance as T;
    }

    // Get constructor (load if necessary)
    const Constructor = await this.getConstructor(name);
    if (!Constructor) {
      throw new Error(
        `MCP with name "${name}" is not registered or failed validation.`,
      );
    }

    // Security check
    const discovered = this.discoveredMCPs.get(name);
    if (
      discovered &&
      !this.securityManager.validatePermissions(discovered.metadata.permissions)
    ) {
      throw new Error(`Security validation failed for MCP "${name}"`);
    }

    try {
      // Instantiate the class
      const instance = new Constructor() as T;

      // Initialize with config
      await instance.initialize(config);

      // Store instance
      this.mcpInstances.set(name, instance);

      mcpLogger.info(`[${functionTag}] Created and initialized ${name}`);
      return instance;
    } catch (error) {
      mcpLogger.error(
        `[${functionTag}] Failed to create instance of ${name}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get or load constructor for an MCP
   */
  private async getConstructor(name: string): Promise<MCPConstructor | null> {
    // Check if already loaded
    const existingConstructor = this.mcpConstructors.get(name);
    if (existingConstructor) {
      return existingConstructor;
    }

    // Load from discovered plugins
    const discovered = this.discoveredMCPs.get(name);
    if (!discovered) {
      return null;
    }

    try {
      // Dynamic import of the plugin
      const module = await import(discovered.entryPath);
      const Constructor = module.default || module[discovered.metadata.name];

      if (typeof Constructor !== "function") {
        throw new Error(`Invalid export from ${discovered.entryPath}`);
      }

      // Store constructor
      this.mcpConstructors.set(name, Constructor);

      return Constructor;
    } catch (error) {
      mcpLogger.error(
        `[PluginManager] Failed to load ${name} from ${discovered.entryPath}:`,
        error,
      );
      return null;
    }
  }

  /**
   * List all discovered MCPs
   */
  listDiscovered(): MCPMetadata[] {
    return Array.from(this.discoveredMCPs.values()).map((d) => d.metadata);
  }

  /**
   * Get metadata for a specific MCP
   */
  getMetadata(name: string): MCPMetadata | null {
    const discovered = this.discoveredMCPs.get(name);
    return discovered ? discovered.metadata : null;
  }

  /**
   * Get discovery statistics
   */
  getDiscoveryStats(): Record<string, number> {
    const stats = { core: 0, project: 0, installed: 0 };

    for (const discovered of this.discoveredMCPs.values()) {
      stats[discovered.source]++;
    }

    return stats;
  }

  /**
   * Dispose of all instances and cleanup
   */
  async dispose(): Promise<void> {
    mcpLogger.info("[PluginManager] Disposing all MCP instances...");

    for (const [name, instance] of this.mcpInstances) {
      try {
        await instance.dispose();
        mcpLogger.debug(`[PluginManager] Disposed ${name}`);
      } catch (error) {
        mcpLogger.error(`[PluginManager] Failed to dispose ${name}:`, error);
      }
    }

    this.mcpInstances.clear();
    this.mcpConstructors.clear();
    this.initialized = false;
  }
}

/**
 * Export singleton instance getter
 */
export const pluginManager = PluginManager.getInstance();
