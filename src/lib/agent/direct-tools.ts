/**
 * Direct Tool Definitions for NeuroLink CLI Agent
 * Simple, reliable tools that work immediately with Vercel AI SDK
 */

import { tool } from "ai";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";

/**
 * Direct tool definitions that work immediately with Gemini/AI SDK
 * These bypass MCP complexity and provide reliable agent functionality
 */
export const directAgentTools = {
  getCurrentTime: tool({
    description: "Get the current date and time",
    parameters: z.object({
      timezone: z
        .string()
        .optional()
        .describe(
          'Timezone (e.g., "America/New_York", "Asia/Kolkata"). Defaults to local time.',
        ),
    }),
    execute: async ({ timezone }) => {
      try {
        const now = new Date();
        if (timezone) {
          return {
            success: true,
            time: now.toLocaleString("en-US", { timeZone: timezone }),
            timezone: timezone,
            iso: now.toISOString(),
          };
        }
        return {
          success: true,
          time: now.toLocaleString(),
          iso: now.toISOString(),
          timestamp: now.getTime(),
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  }),

  readFile: tool({
    description: "Read the contents of a file from the filesystem",
    parameters: z.object({
      path: z.string().describe("File path to read (relative or absolute)"),
    }),
    execute: async ({ path: filePath }) => {
      try {
        // Security check - prevent reading outside current directory for relative paths
        const resolvedPath = path.resolve(filePath);
        const cwd = process.cwd();

        if (!resolvedPath.startsWith(cwd) && !path.isAbsolute(filePath)) {
          return {
            success: false,
            error: `Access denied: Cannot read files outside current directory`,
          };
        }

        const content = fs.readFileSync(resolvedPath, "utf-8");
        const stats = fs.statSync(resolvedPath);

        return {
          success: true,
          content,
          size: stats.size,
          path: resolvedPath,
          lastModified: stats.mtime.toISOString(),
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          path: filePath,
        };
      }
    },
  }),

  listDirectory: tool({
    description: "List files in a directory",
    parameters: z.object({
      path: z.string().describe("Directory path"),
    }),
    execute: async ({ path: dirPath }) => {
      try {
        const resolvedPath = path.resolve(dirPath || ".");
        
        // Simple async file listing with 3-second timeout
        const items = await Promise.race([
          fs.promises.readdir(resolvedPath),
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Directory read timeout')), 3000);
          })
        ]);

        // Simple processing without stat calls to avoid additional timeouts
        const filteredItems = items
          .filter((item) => !item.startsWith("."))
          .slice(0, 20) // Limit to first 20 items for performance
          .map(item => ({
            name: item,
            type: "file", // Simplified - assume all are files for now
            size: undefined,
          }));

        return {
          success: true,
          path: resolvedPath,
          items: filteredItems,
          count: filteredItems.length,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          path: dirPath,
        };
      }
    },
  }),

  calculateMath: tool({
    description: "Perform mathematical calculations safely",
    parameters: z.object({
      expression: z
        .string()
        .describe(
          'Mathematical expression to evaluate (e.g., "2 + 2", "Math.sqrt(16)")',
        ),
      precision: z
        .number()
        .optional()
        .describe("Number of decimal places for result")
        .default(2),
    }),
    execute: async ({ expression, precision }) => {
      try {
        // Simple safe evaluation - only allow basic math operations
        const sanitizedExpression = expression.replace(/[^0-9+\-*/().\s]/g, "");

        if (sanitizedExpression !== expression) {
          // Try Math functions for more complex operations
          const allowedMathFunctions = [
            "Math.abs",
            "Math.ceil",
            "Math.floor",
            "Math.round",
            "Math.sqrt",
            "Math.pow",
            "Math.sin",
            "Math.cos",
            "Math.tan",
            "Math.log",
            "Math.exp",
            "Math.PI",
            "Math.E",
          ];

          let safeExpression = expression;
          for (const func of allowedMathFunctions) {
            safeExpression = safeExpression.replace(
              new RegExp(func, "g"),
              func,
            );
          }

          // Remove any remaining non-safe characters except Math functions
          const mathSafe =
            /^[0-9+\-*/().\s]|Math\.(abs|ceil|floor|round|sqrt|pow|sin|cos|tan|log|exp|PI|E)/g;
          if (
            !safeExpression
              .split("")
              .every(
                (char) =>
                  mathSafe.test(char) ||
                  char === "(" ||
                  char === ")" ||
                  char === "," ||
                  char === " ",
              )
          ) {
            return {
              success: false,
              error: `Unsafe expression: Only basic math operations and Math functions are allowed`,
            };
          }
        }

        // Use Function constructor for safe evaluation
        const result = new Function(`'use strict'; return (${expression})`)();
        const roundedResult =
          typeof result === "number"
            ? Number(result.toFixed(precision))
            : result;

        return {
          success: true,
          expression,
          result: roundedResult,
          type: typeof result,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          expression,
        };
      }
    },
  }),

  writeFile: tool({
    description: "Write content to a file (use with caution)",
    parameters: z.object({
      path: z.string().describe("File path to write to"),
      content: z.string().describe("Content to write to the file"),
      mode: z
        .enum(["create", "overwrite", "append"])
        .default("create")
        .describe("Write mode"),
    }),
    execute: async ({ path: filePath, content, mode }) => {
      try {
        const resolvedPath = path.resolve(filePath);
        const cwd = process.cwd();

        // Security check
        if (!resolvedPath.startsWith(cwd) && !path.isAbsolute(filePath)) {
          return {
            success: false,
            error: `Access denied: Cannot write files outside current directory`,
          };
        }

        // Check if file exists for create mode
        if (mode === "create" && fs.existsSync(resolvedPath)) {
          return {
            success: false,
            error: `File already exists. Use 'overwrite' or 'append' mode to modify existing files.`,
          };
        }

        let finalContent = content;
        if (mode === "append" && fs.existsSync(resolvedPath)) {
          const existingContent = fs.readFileSync(resolvedPath, "utf-8");
          finalContent = existingContent + content;
        }

        fs.writeFileSync(resolvedPath, finalContent, "utf-8");
        const stats = fs.statSync(resolvedPath);

        return {
          success: true,
          path: resolvedPath,
          mode,
          size: stats.size,
          written: content.length,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          path: filePath,
        };
      }
    },
  }),

  searchFiles: tool({
    description: "Search for files by name pattern in a directory",
    parameters: z.object({
      directory: z.string().describe("Directory to search in"),
      pattern: z
        .string()
        .describe(
          "File name pattern to search for (supports wildcards like *.js)",
        ),
      recursive: z
        .boolean()
        .optional()
        .default(true)
        .describe("Search recursively in subdirectories"),
    }),
    execute: async ({ directory, pattern, recursive }) => {
      try {
        const resolvedDir = path.resolve(directory);

        if (!fs.existsSync(resolvedDir)) {
          return {
            success: false,
            error: `Directory does not exist: ${resolvedDir}`,
          };
        }

        const matches: Array<{
          name: string;
          path: string;
          size: number;
          lastModified: string;
        }> = [];

        const searchDir = (dir: string, depth = 0) => {
          if (!recursive && depth > 0) {
            return;
          }

          const items = fs.readdirSync(dir);

          for (const item of items) {
            const itemPath = path.join(dir, item);
            const stats = fs.statSync(itemPath);

            if (stats.isDirectory()) {
              if (recursive && depth < 10) {
                // Prevent infinite recursion
                searchDir(itemPath, depth + 1);
              }
            } else if (stats.isFile()) {
              // Simple pattern matching (convert * to regex)
              const regexPattern = pattern
                .replace(/\*/g, ".*")
                .replace(/\?/g, ".");
              const regex = new RegExp(`^${regexPattern}$`, "i");

              if (regex.test(item)) {
                matches.push({
                  name: item,
                  path: itemPath,
                  size: stats.size,
                  lastModified: stats.mtime.toISOString(),
                });
              }
            }
          }
        };

        searchDir(resolvedDir);

        return {
          success: true,
          directory: resolvedDir,
          pattern,
          matches,
          count: matches.length,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          directory,
          pattern,
        };
      }
    },
  }),
};

/**
 * Get a subset of tools for specific use cases
 */
export function getToolsForCategory(
  category: "basic" | "filesystem" | "utility" | "all" = "all",
) {
  switch (category) {
    case "basic":
      return {
        getCurrentTime: directAgentTools.getCurrentTime,
        calculateMath: directAgentTools.calculateMath,
      };
    case "filesystem":
      return {
        readFile: directAgentTools.readFile,
        listDirectory: directAgentTools.listDirectory,
        writeFile: directAgentTools.writeFile,
        searchFiles: directAgentTools.searchFiles,
      };
    case "utility":
      return {
        getCurrentTime: directAgentTools.getCurrentTime,
        calculateMath: directAgentTools.calculateMath,
        listDirectory: directAgentTools.listDirectory,
      };
    case "all":
    default:
      // All tools re-enabled with fixed listDirectory
      return directAgentTools;
  }
}

/**
 * Get tool names for validation
 */
export function getAvailableToolNames(): string[] {
  return Object.keys(directAgentTools);
}

/**
 * Validate that all tools have proper structure
 */
export function validateToolStructure(): boolean {
  try {
    for (const [name, tool] of Object.entries(directAgentTools)) {
      if (!tool.description || typeof tool.description !== "string") {
        console.error(`❌ Tool ${name} missing description`);
        return false;
      }
      if (!tool.parameters) {
        console.error(`❌ Tool ${name} missing parameters`);
        return false;
      }
      if (!tool.execute || typeof tool.execute !== "function") {
        console.error(`❌ Tool ${name} missing execute function`);
        return false;
      }
    }
    console.log("✅ All tools have valid structure");
    return true;
  } catch (error) {
    console.error("❌ Tool validation failed:", error);
    return false;
  }
}
