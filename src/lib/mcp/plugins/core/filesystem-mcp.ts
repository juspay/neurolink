/**
 * FileSystemMCP - Proof of Concept Plugin
 * Demonstrates the research blueprint implementation
 */

import { MCP } from "../../contracts/mcp-contract.js";
import type {
  MCPMetadata,
  ExecutionContext,
} from "../../contracts/mcp-contract.js";
import * as path from "path";

interface FileSystemConfig {
  basePath: string;
  allowedExtensions?: string[];
}

interface FileSystemArgs {
  operation: "readFile" | "writeFile" | "listFiles" | "createDir";
  path: string;
  content?: string;
  options?: any;
}

interface FileSystemResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * FileSystem MCP implementing the abstract contract
 */
export class FileSystemMCP extends MCP<
  FileSystemConfig,
  FileSystemArgs,
  FileSystemResult
> {
  readonly metadata: MCPMetadata = {
    name: "@neurolink-mcp/filesystem",
    version: "1.0.0",
    main: "./filesystem-mcp.js",
    engine: {
      neurolink: ">=1.9.0 <2.0.0",
    },
    description: "Provides secure file system operations for NeuroLink agents",
    permissions: [
      "fs:read:./**/*",
      "fs:write:./output/**/*",
      "fs:write:./temp/**/*",
    ],
  };

  async initialize(config: FileSystemConfig): Promise<void> {
    if (!config.basePath) {
      throw new Error("basePath is required in FileSystemMCP configuration");
    }

    this.config = {
      allowedExtensions: [".txt", ".json", ".md", ".js", ".ts"],
      ...config,
    };

    this.initialized = true;
  }

  async execute(
    context: ExecutionContext,
    args: FileSystemArgs,
  ): Promise<FileSystemResult> {
    this.log(context, "info", "Executing FileSystemMCP", { args });
    this.log(context, "info", "Executing FileSystemMCP", { args });
    this.log(context, "info", "Executing FileSystemMCP", { args });
    this.ensureInitialized();

    try {
      if (!args.path) {
        // This is a configuration call, not an operation
        return { success: true, data: { configured: true } };
      }
      const fullPath = path.isAbsolute(args.path)
        ? args.path
        : context.path.join(this.config!.basePath, args.path);

      switch (args.operation) {
        case "readFile":
          return await this.readFile(context, fullPath);
        case "writeFile":
          return await this.writeFile(context, fullPath, args.content!);
        case "listFiles":
          return await this.listFiles(context, fullPath);
        case "createDir":
          return await this.createDirectory(context, fullPath);
        default:
          throw new Error(`Unsupported operation: ${args.operation}`);
      }
    } catch (error) {
      this.log(context, "error", "Operation failed", {
        operation: args.operation,
        error,
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async readFile(
    context: ExecutionContext,
    filePath: string,
  ): Promise<FileSystemResult> {
    const content = await context.secureFS.readFile(filePath, "utf-8");
    const stats = await context.secureFS.stat(filePath);

    return {
      success: true,
      data: {
        content,
        size: stats.size,
        lastModified: stats.mtime,
        path: filePath,
      },
    };
  }

  private async writeFile(
    context: ExecutionContext,
    filePath: string,
    content: string,
  ): Promise<FileSystemResult> {
    await context.secureFS.writeFile(filePath, content);

    return {
      success: true,
      data: {
        path: filePath,
        size: content.length,
        written: true,
      },
    };
  }

  private async listFiles(
    context: ExecutionContext,
    dirPath: string,
  ): Promise<FileSystemResult> {
    const items = await context.secureFS.readdir(dirPath);
    const itemDetails = [];

    for (const item of items) {
      const itemPath = context.path.join(dirPath, item);
      try {
        const stats = await context.secureFS.stat(itemPath);
        itemDetails.push({
          name: item,
          type: stats.isDirectory() ? "directory" : "file",
          size: stats.isFile() ? stats.size : undefined,
          lastModified: stats.mtime,
        });
      } catch {
        // Skip inaccessible items
      }
    }

    return {
      success: true,
      data: {
        path: dirPath,
        items: itemDetails,
        count: itemDetails.length,
      },
    };
  }

  private async createDirectory(
    context: ExecutionContext,
    dirPath: string,
  ): Promise<FileSystemResult> {
    await context.secureFS.mkdir(dirPath, { recursive: true });

    return {
      success: true,
      data: {
        path: dirPath,
        created: true,
      },
    };
  }

  async dispose(): Promise<void> {
    this.initialized = false;
    this.config = undefined;
  }
}

// Export as default for dynamic import
export default FileSystemMCP;
