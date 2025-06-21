/**
 * Plugin Demo - Example MCP Plugin Usage
 */

import { mcpEcosystem } from "../ecosystem.js";
import { FileSystemMCP } from "../plugins/core/filesystem-mcp.js";
import type { ExecutionContext } from "../contracts/mcp-contract.js";
import {
  QuickPluginFactory,
  executePlugin,
} from "../adapters/plugin-bridge.js";
import { mcpLogger } from "../logging.js";

/**
 * Demo plugin functionality
 */
export class PluginDemo {
  /**
   * Demonstrate filesystem plugin
   */
  static async demonstrateFileSystem(): Promise<void> {
    try {
      // Create filesystem plugin instance
      const fsPlugin = new FileSystemMCP();
      await fsPlugin.initialize({ basePath: process.cwd() });

      mcpLogger.info("FileSystem plugin demonstration started");

      // This would normally be done through the ecosystem
      // but we're demonstrating direct usage
      const result = await mcpEcosystem.filesystem({
        action: "listFiles",
        path: ".",
        basePath: process.cwd(),
      });

      mcpLogger.info("File listing result:", result);
    } catch (error) {
      mcpLogger.error("Demo failed:", error);
    }
  }

  /**
   * Demonstrate plugin execution via ecosystem
   */
  static async demonstrateEcosystem(): Promise<void> {
    try {
      await mcpEcosystem.initialize();

      const stats = await mcpEcosystem.getStats();
      mcpLogger.info("MCP Ecosystem stats:", stats);

      // Try to read a file
      const fsPlugin = new FileSystemMCP();
      await fsPlugin.initialize({ basePath: process.cwd() });

      const result = await executePlugin(
        fsPlugin,
        createMockContext(),
        "listFiles",
        ".",
      );

      mcpLogger.info("Plugin execution result:", result);
    } catch (error) {
      mcpLogger.error("Ecosystem demo failed:", error);
    }
  }

  /**
   * Demonstrate quick plugin factory
   */
  static async demonstrateQuickFactory(): Promise<void> {
    try {
      const fsPlugin = new FileSystemMCP();
      await fsPlugin.initialize({ basePath: process.cwd() });

      const quickPlugin = await QuickPluginFactory.create("demo-plugin", {
        basePath: process.cwd(),
      });

      mcpLogger.info("Quick plugin created:", quickPlugin);
    } catch (error) {
      mcpLogger.error("Quick factory demo failed:", error);
    }
  }
}

/**
 * Create a mock execution context for testing
 */
function createMockContext(): ExecutionContext {
  return {
    sessionId: "demo-session",
    userId: "demo-user",
    grantedPermissions: ["fs:read:./**/*", "fs:write:./temp/**/*"],
    secureFS: {
      async readFile(path: string, encoding?: string) {
        return `Mock content from ${path}`;
      },
      async writeFile(path: string, content: string | Buffer) {
        mcpLogger.info(`Mock write to ${path}`);
      },
      async readdir(path: string) {
        return ["file1.txt", "file2.json", "subdir"];
      },
      async stat(path: string) {
        return {
          size: 1024,
          mtime: new Date(),
          isDirectory: () => false,
          isFile: () => true,
        };
      },
      async mkdir(path: string, options?: any) {
        mcpLogger.info(`Mock mkdir: ${path}`);
      },
      async exists(path: string) {
        return true;
      },
    },
    path: {
      join: (...paths: string[]) => paths.join("/"),
      resolve: (...paths: string[]) => "/" + paths.join("/"),
      relative: (from: string, to: string) => to,
      dirname: (path: string) => path.split("/").slice(0, -1).join("/"),
      basename: (path: string, ext?: string) => {
        const name = path.split("/").pop() || "";
        return ext ? name.replace(ext, "") : name;
      },
    },
    log: (level, message, data) => {
      mcpLogger[level](`[MockContext] ${message}`, data);
    },
  };
}
