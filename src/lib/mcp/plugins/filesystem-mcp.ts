/**
 * Enhanced FileSystem MCP Plugin
 * Implements the new MCP contract with security sandbox
 * Based on research document recommendations
 */

import path from "path";
import {
  MCP,
  type MCPMetadata,
  type ExecutionContext,
  MCPCategory,
} from "../contracts/mcp-contract.js";

/**
 * FileSystem MCP Configuration
 */
export interface FileSystemConfig {
  basePath: string;
  allowedExtensions?: string[];
  maxFileSize?: number;
  readOnly?: boolean;
}

/**
 * FileSystem Operation Arguments
 */
export interface FileSystemArgs {
  operation: "readFile" | "writeFile" | "listFiles" | "getFileInfo";
  path: string;
  content?: string;
  encoding?: string;
}

/**
 * Enhanced FileSystem MCP Plugin
 */
export class FileSystemMCP extends MCP<FileSystemConfig> {
  declare public config: FileSystemConfig;

  readonly metadata: MCPMetadata = {
    name: "@neurolink-mcp/filesystem",
    version: "1.0.0",
    main: "./dist/filesystem-mcp.js",
    engine: { neurolink: ">=1.9.0 <2.0.0" },
    description:
      "Secure file system operations with permission-based access control",
    permissions: ["fs:read:./**/*", "fs:write:./output/**/*"],
  };

  async initialize(config: FileSystemConfig): Promise<void> {
    this.config = {
      allowedExtensions: [".txt", ".md", ".json", ".js", ".ts"],
      maxFileSize: 10 * 1024 * 1024,
      readOnly: false,
      ...config,
    };
  }

  async execute(context: ExecutionContext, args: FileSystemArgs): Promise<any> {
    const resolvedPath = this.resolvePath(args.path);

    switch (args.operation) {
      case "readFile":
        return await context.secureFS.readFile(
          resolvedPath,
          args.encoding || "utf-8",
        );
      case "listFiles":
        return await context.secureFS.readdir(resolvedPath);
      case "getFileInfo":
        return await context.secureFS.stat(resolvedPath);
      default:
        throw new Error(`Unsupported operation: ${args.operation}`);
    }
  }

  private resolvePath(inputPath: string): string {
    const resolved = path.resolve(this.config.basePath, inputPath);
    if (!resolved.startsWith(this.config.basePath)) {
      throw new Error(`Path outside allowed directory: ${inputPath}`);
    }
    return resolved;
  }

  async dispose(): Promise<void> {
    // Cleanup resources
  }
}

export function createFileSystemMCP(): FileSystemMCP {
  return new FileSystemMCP();
}
