/**
 * Security Manager - Permission-Based Sandbox for MCP Operations
 * Implements the research blueprint's security-by-design principles
 */

import * as fs from "fs/promises";
import * as path from "path";
import { mcpLogger } from "./logging.js";
import type { ExecutionContext } from "./contracts/mcp-contract.js";

/**
 * Security levels for plugin execution
 */
export type SecurityLevel = "strict" | "moderate" | "permissive";

/**
 * Permission types supported by the security system
 */
export interface Permission {
  type: "fs" | "net" | "process" | "env";
  action: string;
  resource: string;
}

/**
 * Security Manager implementing permission-based sandbox
 */
export class SecurityManager {
  private securityLevel: SecurityLevel;
  private allowedBasePaths: Set<string>;
  private deniedPaths: Set<string>;

  constructor(securityLevel: SecurityLevel = "moderate") {
    this.securityLevel = securityLevel;
    this.allowedBasePaths = new Set();
    this.deniedPaths = new Set();

    // Initialize default security boundaries
    this.initializeSecurityBoundaries();
  }

  /**
   * Initialize default security boundaries based on level
   */
  private initializeSecurityBoundaries(): void {
    const cwd = process.cwd();

    switch (this.securityLevel) {
      case "strict":
        // Only allow current working directory
        this.allowedBasePaths.add(cwd);
        this.deniedPaths.add(path.join(cwd, "node_modules"));
        this.deniedPaths.add("/etc");
        this.deniedPaths.add("/usr");
        this.deniedPaths.add("/var");
        break;

      case "moderate":
        // Allow project directory and some system reads
        this.allowedBasePaths.add(cwd);
        this.allowedBasePaths.add(
          path.join(process.env.HOME || "/", "Downloads"),
        );
        this.deniedPaths.add("/etc/passwd");
        this.deniedPaths.add("/etc/shadow");
        break;

      case "permissive":
        // Allow broader access with minimal restrictions
        this.allowedBasePaths.add("/");
        this.deniedPaths.add("/etc/passwd");
        this.deniedPaths.add("/etc/shadow");
        break;
    }
  }

  /**
   * Validate permissions array from manifest
   */
  validatePermissions(permissions: string[]): boolean {
    try {
      for (const permission of permissions) {
        const parsed = this.parsePermission(permission);
        if (!this.isPermissionAllowed(parsed)) {
          mcpLogger.warn(`[SecurityManager] Permission denied: ${permission}`);
          return false;
        }
      }
      return true;
    } catch (error) {
      mcpLogger.error("[SecurityManager] Permission validation failed:", error);
      return false;
    }
  }

  /**
   * Parse permission string into structured format
   */
  private parsePermission(permission: string): Permission {
    const parts = permission.split(":");
    if (parts.length !== 3) {
      throw new Error(`Invalid permission format: ${permission}`);
    }

    return {
      type: parts[0] as Permission["type"],
      action: parts[1],
      resource: parts[2],
    };
  }

  /**
   * Check if a permission is allowed based on security level
   */
  private isPermissionAllowed(permission: Permission): boolean {
    switch (permission.type) {
      case "fs":
        return this.isFileSystemPermissionAllowed(permission);
      case "net":
        return this.isNetworkPermissionAllowed(permission);
      case "process":
        return this.isProcessPermissionAllowed(permission);
      case "env":
        return this.isEnvironmentPermissionAllowed(permission);
      default:
        return false;
    }
  }

  /**
   * Validate filesystem permissions
   */
  private isFileSystemPermissionAllowed(permission: Permission): boolean {
    const { action, resource } = permission;
    const resolvedPath = path.resolve(resource);

    // Check if path is explicitly denied
    for (const deniedPath of this.deniedPaths) {
      if (resolvedPath.startsWith(deniedPath)) {
        return false;
      }
    }

    // Check if path is within allowed base paths
    for (const basePath of this.allowedBasePaths) {
      if (resolvedPath.startsWith(basePath)) {
        return this.isFileSystemActionAllowed(action);
      }
    }

    return false;
  }

  /**
   * Check if filesystem action is allowed
   */
  private isFileSystemActionAllowed(action: string): boolean {
    const allowedActions = {
      strict: ["read"],
      moderate: ["read", "write"],
      permissive: ["read", "write", "delete", "execute"],
    };

    return allowedActions[this.securityLevel].includes(action);
  }

  /**
   * Validate network permissions
   */
  private isNetworkPermissionAllowed(permission: Permission): boolean {
    if (this.securityLevel === "strict") {
      return false; // No network access in strict mode
    }

    const { resource } = permission;

    // Only allow HTTPS in moderate mode
    if (this.securityLevel === "moderate") {
      return resource.startsWith("https://");
    }

    // Permissive allows both HTTP and HTTPS
    return resource.startsWith("http://") || resource.startsWith("https://");
  }

  /**
   * Validate process permissions
   */
  private isProcessPermissionAllowed(permission: Permission): boolean {
    // Only permissive mode allows process operations
    return this.securityLevel === "permissive";
  }

  /**
   * Validate environment permissions
   */
  private isEnvironmentPermissionAllowed(permission: Permission): boolean {
    const { action, resource } = permission;

    // Reading environment variables is generally safe
    if (action === "read") {
      return true;
    }

    // Writing environment variables requires higher permissions
    return this.securityLevel === "permissive";
  }

  /**
   * Create a secure filesystem interface for ExecutionContext
   */
  createSecureFS(grantedPermissions: string[], basePath?: string) {
    const self = this;
    const CWD = process.cwd();

    const resolveSecurePath = (p: string) => {
      // Resolve the path. If basePath is provided, use it, otherwise use the current working directory.
      const resolved = path.resolve(basePath || CWD, p);

      // If a basePath is specified, ensure the resolved path is within that base path.
      // This is a security measure to prevent path traversal attacks (e.g., using '../').
      if (basePath) {
        const relative = path.relative(path.resolve(basePath), resolved);
        if (relative.startsWith("..") || path.isAbsolute(relative)) {
          throw new Error(
            `Path traversal detected. Attempted to access ${resolved} which is outside of the allowed base path ${basePath}`,
          );
        }
      }
      return resolved;
    };

    return {
      async readFile(
        filePath: string,
        encoding?: string,
      ): Promise<string | Buffer> {
        const resolvedPath = resolveSecurePath(filePath);
        self.checkFileSystemPermission(
          "read",
          resolvedPath,
          grantedPermissions,
          basePath,
        );

        try {
          return await fs.readFile(resolvedPath, encoding as any);
        } catch (error) {
          mcpLogger.error(
            `[SecurityManager] Failed to read file ${filePath}:`,
            error,
          );
          throw error;
        }
      },

      async writeFile(
        filePath: string,
        content: string | Buffer,
      ): Promise<void> {
        const resolvedPath = resolveSecurePath(filePath);
        self.checkFileSystemPermission(
          "write",
          resolvedPath,
          grantedPermissions,
          basePath,
        );

        try {
          // Ensure directory exists
          await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
          await fs.writeFile(resolvedPath, content);
        } catch (error) {
          mcpLogger.error(
            `[SecurityManager] Failed to write file ${filePath}:`,
            error,
          );
          throw error;
        }
      },

      async readdir(dirPath: string): Promise<string[]> {
        const resolvedPath = resolveSecurePath(dirPath);
        self.checkFileSystemPermission(
          "read",
          resolvedPath,
          grantedPermissions,
          basePath,
        );

        try {
          return await fs.readdir(resolvedPath);
        } catch (error) {
          mcpLogger.error(
            `[SecurityManager] Failed to read directory ${dirPath}:`,
            error,
          );
          throw error;
        }
      },

      async stat(filePath: string): Promise<any> {
        const resolvedPath = resolveSecurePath(filePath);
        self.checkFileSystemPermission(
          "read",
          resolvedPath,
          grantedPermissions,
          basePath,
        );

        try {
          return await fs.stat(resolvedPath);
        } catch (error) {
          mcpLogger.error(
            `[SecurityManager] Failed to stat ${filePath}:`,
            error,
          );
          throw error;
        }
      },

      async mkdir(dirPath: string, options?: any): Promise<void> {
        const resolvedPath = resolveSecurePath(dirPath);
        self.checkFileSystemPermission(
          "write",
          resolvedPath,
          grantedPermissions,
          basePath,
        );

        try {
          await fs.mkdir(resolvedPath, options);
        } catch (error) {
          mcpLogger.error(
            `[SecurityManager] Failed to create directory ${dirPath}:`,
            error,
          );
          throw error;
        }
      },

      async exists(filePath: string): Promise<boolean> {
        const resolvedPath = resolveSecurePath(filePath);
        self.checkFileSystemPermission(
          "read",
          resolvedPath,
          grantedPermissions,
          basePath,
        );

        try {
          await fs.access(resolvedPath);
          return true;
        } catch {
          return false;
        }
      },
    };
  }

  /**
   * Check filesystem permission against granted permissions
   */
  private checkFileSystemPermission(
    action: string,
    filePath: string,
    grantedPermissions: string[],
    basePath?: string,
  ): void {
    const requiredPermission = `fs:${action}:${filePath}`;

    for (const permissionString of grantedPermissions) {
      const parsedPermission = this.parsePermission(permissionString);

      if (
        parsedPermission.type === "fs" &&
        (parsedPermission.action === action ||
          parsedPermission.action === "read-write")
      ) {
        // Handle relative paths with wildcards properly
        let grantedPath: string;

        if (!path.isAbsolute(parsedPermission.resource)) {
          // For relative paths, resolve them relative to basePath if provided
          if (basePath) {
            // Handle wildcard patterns specially
            if (parsedPermission.resource.includes("*")) {
              // For patterns like './**/*', convert to absolute pattern
              const resolvedBase = path.resolve(basePath);
              if (parsedPermission.resource.startsWith("./")) {
                grantedPath = path.join(
                  resolvedBase,
                  parsedPermission.resource.substring(2),
                );
              } else {
                grantedPath = path.join(
                  resolvedBase,
                  parsedPermission.resource,
                );
              }
            } else {
              grantedPath = path.resolve(basePath, parsedPermission.resource);
            }
          } else {
            grantedPath = path.resolve(parsedPermission.resource);
          }
        } else {
          grantedPath = parsedPermission.resource;
        }

        if (this.matchesWildcardPermission(filePath, grantedPath)) {
          return; // Permission granted
        }
      }
    }

    throw new Error(`Permission denied: ${requiredPermission}`);
  }

  /**
   * Check if permission matches wildcard pattern
   */
  private matchesWildcardPermission(
    required: string,
    granted: string,
  ): boolean {
    // Handle patterns that end with /** or /**/* (recursive directory access)
    if (granted.endsWith("/**") || granted.endsWith("/**/*")) {
      const basePath = granted.endsWith("/**/*")
        ? granted.slice(0, -5) // Remove /**/*
        : granted.slice(0, -3); // Remove /**

      // Check if required path is the base path itself or a subdirectory/file within it.
      return required === basePath || required.startsWith(basePath + "/");
    }

    if (!granted.includes("*")) {
      return required === granted;
    }

    // Convert wildcard to regex for other cases
    const regexPattern = granted
      .replace(/[.+?^${}()|[\]\\]/g, "\\$&") // Escape special regex characters
      .replace(/\*\*/g, ".*") // This is a greedy match, use with caution
      .replace(/\*/g, "[^/]*"); // Handle single wildcard (any characters except slashes)

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(required);
  }

  /**
   * Create execution context with security sandbox
   */
  createExecutionContext(
    sessionId: string,
    userId: string,
    grantedPermissions: string[],
    basePath?: string,
  ): ExecutionContext {
    return {
      sessionId,
      userId,
      grantedPermissions,
      secureFS: this.createSecureFS(grantedPermissions, basePath),
      path: {
        join: path.join,
        resolve: path.resolve,
        relative: path.relative,
        dirname: path.dirname,
        basename: path.basename,
      },
      log: (level, message, data) => {
        mcpLogger[level](`[ExecutionContext:${sessionId}] ${message}`, data);
      },
    };
  }
}
