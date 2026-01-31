/**
 * Entry Discovery - Scans project for NeuroLink entry files
 *
 * Follows automatic discovery patterns:
 * - Main entry (index.ts or neurolink.ts)
 * - Tool definitions (tools/*.ts)
 * - Configuration (neurolink.config.ts)
 * - Custom routes (routes/*.ts)
 *
 * @packageDocumentation
 * @module @juspay/neurolink/deployer
 * @category Deployment
 */

import fs from "node:fs";
import path from "node:path";
import { glob } from "glob";
import { logger } from "../../utils/logger.js";
import type { EntryFile, DiscoveredEntries, DeployConfig } from "../types.js";

/**
 * Entry Discovery - Scans project for NeuroLink entry files
 *
 * @example
 * ```typescript
 * const discovery = new EntryDiscovery('./src/neurolink');
 * const entries = await discovery.discover();
 *
 * console.log('Main entry:', entries.main?.path);
 * console.log('Tools found:', entries.tools.length);
 * ```
 */
export class EntryDiscovery {
  private rootDir: string;

  constructor(rootDir: string) {
    this.rootDir = rootDir;
  }

  /**
   * Discover all entry files in the project
   */
  async discover(): Promise<DiscoveredEntries> {
    logger.debug(`Scanning for entries in: ${this.rootDir}`);

    const [main, tools, configFile, routes] = await Promise.all([
      this.discoverMainEntry(),
      this.discoverTools(),
      this.discoverConfig(),
      this.discoverRoutes(),
    ]);

    const entries: DiscoveredEntries = {
      main,
      tools,
      config: configFile,
      routes,
    };

    logger.info("Entry discovery complete", {
      hasMain: !!main,
      toolCount: tools.length,
      hasConfig: !!configFile,
      routeCount: routes.length,
    });

    return entries;
  }

  /**
   * Discover main entry file
   * Looks for: index.ts, index.js, neurolink.ts, neurolink.js
   */
  private async discoverMainEntry(): Promise<EntryFile | undefined> {
    const candidates = [
      "index.ts",
      "index.js",
      "neurolink.ts",
      "neurolink.js",
      "main.ts",
      "main.js",
    ];

    for (const candidate of candidates) {
      const filePath = path.join(this.rootDir, candidate);

      if (fs.existsSync(filePath)) {
        const exports = await this.extractExports(filePath);

        logger.debug(`Found main entry: ${filePath}`, { exports });

        return {
          path: filePath,
          type: "main",
          exports,
        };
      }
    }

    logger.warn("No main entry file found");
    return undefined;
  }

  /**
   * Discover tool definition files
   * Pattern: tools/*.{ts,js}
   * Excludes: *.test.ts, *.spec.ts, *.d.ts
   */
  private async discoverTools(): Promise<EntryFile[]> {
    const toolsDir = path.join(this.rootDir, "tools");

    if (!fs.existsSync(toolsDir)) {
      logger.debug("No tools directory found");
      return [];
    }

    const pattern = path.join(toolsDir, "**/*.{ts,js}");
    const files = await glob(pattern, {
      ignore: ["**/*.test.{ts,js}", "**/*.spec.{ts,js}", "**/*.d.ts"],
    });

    const tools: EntryFile[] = [];

    for (const file of files) {
      const exports = await this.extractExports(file);

      // Only include files that export tools
      if (this.hasToolExports(exports)) {
        tools.push({
          path: file,
          type: "tools",
          exports,
        });
      }
    }

    logger.debug(`Discovered ${tools.length} tool files`);
    return tools;
  }

  /**
   * Discover configuration file
   * Looks for: neurolink.config.ts, neurolink.config.js
   */
  private async discoverConfig(): Promise<EntryFile | undefined> {
    const candidates = [
      path.join(this.rootDir, "neurolink.config.ts"),
      path.join(this.rootDir, "neurolink.config.js"),
      path.join(process.cwd(), "neurolink.config.ts"),
      path.join(process.cwd(), "neurolink.config.js"),
    ];

    for (const filePath of candidates) {
      if (fs.existsSync(filePath)) {
        const exports = await this.extractExports(filePath);

        return {
          path: filePath,
          type: "config",
          exports,
        };
      }
    }

    return undefined;
  }

  /**
   * Discover custom route files
   * Pattern: routes/*.{ts,js}
   */
  private async discoverRoutes(): Promise<EntryFile[]> {
    const routesDir = path.join(this.rootDir, "routes");

    if (!fs.existsSync(routesDir)) {
      return [];
    }

    const pattern = path.join(routesDir, "**/*.{ts,js}");
    const files = await glob(pattern, {
      ignore: ["**/*.test.{ts,js}", "**/*.spec.{ts,js}", "**/*.d.ts"],
    });

    const routes: EntryFile[] = [];

    for (const file of files) {
      const exports = await this.extractExports(file);
      routes.push({
        path: file,
        type: "routes",
        exports,
      });
    }

    return routes;
  }

  /**
   * Extract export names from a TypeScript/JavaScript file
   * Uses regex-based parsing for simplicity
   */
  private async extractExports(filePath: string): Promise<string[]> {
    const exports: string[] = [];

    try {
      const content = fs.readFileSync(filePath, "utf-8");

      // Match: export const/let/var name
      const constExports = content.matchAll(
        /export\s+(?:const|let|var)\s+(\w+)/g
      );
      for (const match of constExports) {
        exports.push(match[1]);
      }

      // Match: export function name
      const funcExports = content.matchAll(
        /export\s+(?:async\s+)?function\s+(\w+)/g
      );
      for (const match of funcExports) {
        exports.push(match[1]);
      }

      // Match: export class name
      const classExports = content.matchAll(/export\s+class\s+(\w+)/g);
      for (const match of classExports) {
        exports.push(match[1]);
      }

      // Match: export { name1, name2 }
      const namedExports = content.matchAll(/export\s*\{([^}]+)\}/g);
      for (const match of namedExports) {
        const names = match[1].split(",").map((n) => {
          // Handle: name as alias
          const parts = n.trim().split(/\s+as\s+/);
          return parts[parts.length - 1].trim();
        });
        exports.push(...names.filter((n) => n));
      }

      // Match: export default
      if (
        /export\s+default\s+/.test(content) ||
        /export\s*\{\s*\w+\s+as\s+default\s*\}/.test(content)
      ) {
        exports.push("default");
      }
    } catch (error) {
      logger.warn(`Failed to parse exports from ${filePath}:`, error);
    }

    return [...new Set(exports)]; // Remove duplicates
  }

  /**
   * Check if exports contain tool definitions
   */
  private hasToolExports(exports: string[]): boolean {
    const toolPatterns = [/Tool$/, /tool$/, /^create/, /^define/, "default"];

    return exports.some((exp) =>
      toolPatterns.some((pattern) =>
        typeof pattern === "string" ? exp === pattern : pattern.test(exp)
      )
    );
  }

  /**
   * Get root directory
   */
  getRootDir(): string {
    return this.rootDir;
  }
}

export default EntryDiscovery;
