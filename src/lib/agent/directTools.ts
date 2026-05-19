import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { execFile } from "child_process";
import { logger } from "../utils/logger.js";
import { VertexAI } from "@google-cloud/vertexai";
import { CSVProcessor } from "../utils/csvProcessor.js";
import { shouldEnableBashTool } from "../utils/toolUtils.js";
import type {
  AllToolsMap,
  BasicToolsMap,
  FilesystemToolsMap,
  Tool,
  UtilityToolsMap,
} from "../types/index.js";
import { tool } from "../utils/tool.js";

const MAX_OUTPUT_BYTES = 102400; // 100KB

function truncateOutput(output: string): string {
  if (output.length > MAX_OUTPUT_BYTES) {
    return (
      output.slice(0, MAX_OUTPUT_BYTES) + "\n... [output truncated at 100KB]"
    );
  }
  return output;
}

// Runtime Google Search tool creation - bypasses TypeScript strict typing
function createGoogleSearchTools() {
  const searchTool = {};
  // Dynamically assign google_search property at runtime
  Object.defineProperty(searchTool, "google_search", {
    value: {},
    enumerable: true,
    configurable: true,
  });
  return [searchTool];
}
/**
 * Direct tool definitions that work immediately with Gemini/AI SDK
 * These bypass MCP complexity and provide reliable agent functionality
 */
export const directAgentTools = {
  getCurrentTime: tool({
    description: "Get the current date and time",
    inputSchema: z.object({
      timezone: z
        .string()
        .optional()
        .describe(
          'Timezone (e.g., "America/New_York", "Asia/Kolkata"). Defaults to system local time.',
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
    inputSchema: z.object({
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
    description: "List files and directories in a specified directory",
    inputSchema: z.object({
      path: z
        .string()
        .describe("Directory path to list (relative or absolute)"),
      includeHidden: z
        .boolean()
        .optional()
        .default(false)
        .describe("Include hidden files (starting with .)"),
    }),
    execute: async ({ path: dirPath, includeHidden }) => {
      try {
        const resolvedPath = path.resolve(dirPath);
        const items = fs.readdirSync(resolvedPath);

        const filteredItems = includeHidden
          ? items
          : items.filter((item) => !item.startsWith("."));

        const itemDetails = filteredItems.map((item) => {
          const itemPath = path.join(resolvedPath, item);
          const stats = fs.statSync(itemPath);

          return {
            name: item,
            type: stats.isDirectory() ? "directory" : "file",
            size: stats.isFile() ? stats.size : undefined,
            lastModified: stats.mtime.toISOString(),
          };
        });

        return {
          success: true,
          path: resolvedPath,
          items: itemDetails,
          count: itemDetails.length,
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
    inputSchema: z.object({
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

          // Remove remaining non-safe characters except Math functions
          const mathSafe =
            /^[0-9+\-*/().\s]|Math\.(abs|ceil|floor|round|sqrt|pow|sin|cos|tan|log|exp|PI|E)/g;
          if (
            !safeExpression
              .split("")
              .every(
                (char: string) =>
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
    inputSchema: z.object({
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

  // NOTE: searchFiles was removed to avoid naming conflict with external MCP 'search_files' tool
  // from @modelcontextprotocol/server-filesystem which provides the same functionality
  // with parameters {path, pattern, excludePatterns}

  analyzeCSV: tool({
    description:
      "Analyze CSV file for accurate counting, aggregation, and statistical analysis. Use this for precise data operations like counting rows by column, calculating sums/averages, finding min/max values, etc. The tool reads the file directly - do NOT pass CSV content.",
    inputSchema: z.object({
      filePath: z
        .string()
        .refine(
          (inputPath) => {
            const resolvedPath = path.resolve(inputPath);
            const normalizedPath = resolvedPath
              .toLowerCase()
              .replace(/\\/g, "/");

            const sensitivePatterns = [
              "/etc/",
              "/sys/",
              "/proc/",
              "/dev/",
              "/root/",
              "/.ssh/",
              "/private/etc/",
              "/private/var/",
              "c:/windows/",
              "c:/program files/",
              "c:/programdata/",
            ];

            return !sensitivePatterns.some((pattern) =>
              normalizedPath.startsWith(pattern),
            );
          },
          {
            message:
              "Invalid file path: access to system directories is not allowed",
          },
        )
        .describe(
          "Path to the CSV file to analyze (e.g., 'test/data.csv' or '/absolute/path/file.csv')",
        ),
      operation: z
        .enum([
          "count_by_column",
          "sum_by_column",
          "average_by_column",
          "min_max_by_column",
          "describe",
        ])
        .describe("Type of analysis to perform"),
      column: z
        .string()
        .optional()
        .default("")
        .describe(
          "Column name for the operation (required for most operations)",
        ),
      maxRows: z
        .number()
        .optional()
        .default(1000)
        .describe("Maximum rows to process (default: 1000)"),
    }),
    execute: async ({ filePath, operation, column, maxRows = 1000 }) => {
      const startTime = Date.now();
      logger.info(
        `[analyzeCSV] 🚀 START: file=${filePath}, operation=${operation}, column=${column}, maxRows=${maxRows}`,
      );

      try {
        // Resolve file path
        logger.debug(`[analyzeCSV] Resolving file: ${filePath}`);
        const path = await import("path");

        // Resolve path (support both relative and absolute)
        const resolvedPath = path.isAbsolute(filePath)
          ? filePath
          : path.resolve(process.cwd(), filePath);

        logger.debug(`[analyzeCSV] Resolved path: ${resolvedPath}`);

        // Parse CSV using streaming from disk (memory efficient)
        logger.info(
          `[analyzeCSV] Starting CSV parsing (max ${maxRows} rows)...`,
        );
        const rows = (await CSVProcessor.parseCSVFile(
          resolvedPath,
          maxRows,
        )) as Array<Record<string, string>>;
        logger.info(
          `[analyzeCSV] ✅ CSV parsing complete: ${rows.length} rows`,
        );

        if (rows.length === 0) {
          logger.warn(`[analyzeCSV] No data rows found`);
          return {
            success: false,
            error: "No data rows found in CSV",
          };
        }

        // Log column names
        const columnNames = rows.length > 0 ? Object.keys(rows[0]) : [];
        logger.info(
          `[analyzeCSV] Found ${rows.length} rows with columns:`,
          columnNames,
        );
        logger.info(`[analyzeCSV] Executing operation: ${operation}`);
        let result: unknown;

        switch (operation) {
          case "count_by_column": {
            logger.info(`[analyzeCSV] count_by_column: column=${column}`);
            if (!column) {
              return {
                success: false,
                error: "Column name required for count_by_column operation",
              };
            }

            // Count occurrences of each value in the column
            const counts: Record<string, number> = {};
            logger.debug(`[analyzeCSV] Counting rows...`);
            for (const row of rows) {
              const value = row[column];
              if (value !== undefined) {
                counts[value] = (counts[value] || 0) + 1;
              }
            }
            logger.debug(
              `[analyzeCSV] Found ${Object.keys(counts).length} unique values`,
            );

            // Sort by count descending
            logger.debug(`[analyzeCSV] Sorting results...`);
            result = Object.fromEntries(
              Object.entries(counts).sort(([, a], [, b]) => b - a),
            );
            logger.info(
              `[analyzeCSV] ✅ count_by_column complete. Result:`,
              result,
            );
            break;
          }

          case "sum_by_column": {
            logger.info(`[analyzeCSV] sum_by_column: column=${column}`);
            if (!column) {
              return {
                success: false,
                error: "Column name required for sum_by_column operation",
              };
            }

            // Sum numeric values from the target column itself for each group
            const groups: Record<string, number> = {};
            logger.debug(
              `[analyzeCSV] Grouping and summing ${rows.length} rows...`,
            );
            let processedRows = 0;
            let totalNumericValuesFound = 0;

            for (const row of rows) {
              const key = row[column];
              if (!key) {
                continue;
              }

              // Parse numeric value from the target column
              const value = row[column];
              if (value === undefined || value === null || value === "") {
                continue;
              }

              const num = parseFloat(value);
              if (isNaN(num)) {
                continue;
              }

              if (!groups[key]) {
                groups[key] = 0;
              }
              groups[key] += num;
              totalNumericValuesFound++;

              processedRows++;
              if (processedRows % 10 === 0) {
                logger.debug(
                  `[analyzeCSV] Processed ${processedRows}/${rows.length} rows`,
                );
              }
            }

            // Fail fast if no numeric data found in the requested column
            if (totalNumericValuesFound === 0) {
              return {
                success: false,
                error: `No numeric data found in column "${column}" for sum_by_column operation`,
              };
            }

            logger.debug(
              `[analyzeCSV] Calculated sums for ${Object.keys(groups).length} groups (${totalNumericValuesFound} numeric values)`,
            );

            result = groups;
            logger.info(`[analyzeCSV] ✅ sum_by_column complete`);
            break;
          }

          case "average_by_column": {
            logger.info(`[analyzeCSV] average_by_column: column=${column}`);
            if (!column) {
              return {
                success: false,
                error: "Column name required for average_by_column operation",
              };
            }

            // Average numeric values from the target column itself for each group
            const groups: Record<string, { sum: number; count: number }> = {};
            logger.debug(
              `[analyzeCSV] Grouping and averaging ${rows.length} rows...`,
            );
            let processedRows = 0;
            let totalNumericValuesFound = 0;

            for (const row of rows) {
              const key = row[column];
              if (!key) {
                continue;
              }

              // Parse numeric value from the target column
              const value = row[column];
              if (value === undefined || value === null || value === "") {
                continue;
              }

              const num = parseFloat(value);
              if (isNaN(num)) {
                continue;
              }

              if (!groups[key]) {
                groups[key] = { sum: 0, count: 0 };
              }
              groups[key].sum += num;
              groups[key].count++;
              totalNumericValuesFound++;

              processedRows++;
              if (processedRows % 10 === 0) {
                logger.debug(
                  `[analyzeCSV] Processed ${processedRows}/${rows.length} rows`,
                );
              }
            }

            // Fail fast if no numeric data found in the requested column
            if (totalNumericValuesFound === 0) {
              return {
                success: false,
                error: `No numeric data found in column "${column}" for average_by_column operation`,
              };
            }

            logger.debug(
              `[analyzeCSV] Calculated averages for ${Object.keys(groups).length} groups (${totalNumericValuesFound} numeric values)`,
            );

            result = Object.fromEntries(
              Object.entries(groups).map(([k, v]) => [
                k,
                v.count > 0 ? v.sum / v.count : 0,
              ]),
            );
            logger.info(`[analyzeCSV] ✅ average_by_column complete`);
            break;
          }

          case "min_max_by_column": {
            if (!column) {
              return {
                success: false,
                error: "Column name required for min_max_by_column operation",
              };
            }

            const values = rows
              .map((row) => row[column])
              .filter((v) => v !== undefined && v !== "");

            const numericValues = values
              .map((v) => parseFloat(v))
              .filter((n) => !isNaN(n));

            if (numericValues.length === 0) {
              return {
                success: false,
                error: `No numeric data found in column "${column}" for min_max_by_column operation`,
              };
            }

            result = {
              min: Math.min(...numericValues),
              max: Math.max(...numericValues),
              numericCount: numericValues.length,
              totalCount: values.length,
            };
            break;
          }

          case "describe": {
            const columnNames = rows.length > 0 ? Object.keys(rows[0]) : [];
            result = {
              total_rows: rows.length,
              columns: columnNames,
              column_count: columnNames.length,
            };
            break;
          }

          default:
            return {
              success: false,
              error: `Unknown operation: ${operation}`,
            };
        }

        const duration = Date.now() - startTime;
        logger.info(
          `[analyzeCSV] 🏁 COMPLETE: ${operation} took ${duration}ms`,
        );

        const response = {
          success: true,
          operation,
          column,
          result: JSON.stringify(result, null, 2),
          rowCount: rows.length,
        };

        logger.debug(
          `[analyzeCSV] 📤 RETURNING TO LLM:`,
          JSON.stringify(response, null, 2),
        );
        return response;
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          operation,
          column,
        };
      }
    },
  }),

  // NOTE: executeBashCommand was moved to a separate opt-in export (bashTool) for security.
  // It is only included in directAgentTools when NEUROLINK_ENABLE_BASH_TOOL=true or
  // toolConfig.enableBashTool is explicitly set to true. See shouldEnableBashTool() in toolUtils.ts.

  websearchGrounding: tool({
    description:
      "Performs a Google Search and returns a summarized answer with source citations. Always check the current date before constructing the query. Use whenever the answer depends on time-sensitive facts or requires verification against real-world sources.",
    inputSchema: z.object({
      query: z
        .string()
        .trim()
        .min(1, { message: "must be a non-empty search string" })
        .refine((v) => v.toLowerCase() !== "undefined", {
          message:
            'must not be the literal string "undefined" — pass a real search query',
        })
        .describe("The search query string to look up on the web."),
      maxResults: z
        .number()
        .optional()
        .default(3)
        .describe("Maximum number of search results to return (1-5)"),
      maxWords: z
        .number()
        .optional()
        .default(50)
        .describe("Maximum number of words in the response 50"),
    }),
    execute: async ({ query, maxResults = 3, maxWords = 50 }) => {
      try {
        const hasCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        const hasProjectId = process.env.GOOGLE_VERTEX_PROJECT;
        const projectLocation =
          process.env.GOOGLE_VERTEX_LOCATION || "us-central1";

        if (!hasCredentials || !hasProjectId) {
          return {
            success: false,
            error:
              "Google Vertex AI credentials not configured. Please set GOOGLE_APPLICATION_CREDENTIALS and GOOGLE_VERTEX_PROJECT environment variables.",
            requiredEnvVars: [
              "GOOGLE_APPLICATION_CREDENTIALS",
              "GOOGLE_VERTEX_PROJECT",
            ],
          };
        }

        const limitedResults = Math.min(Math.max(maxResults, 1), 5);
        const vertex_ai = new VertexAI({
          project: hasProjectId,
          location: projectLocation,
        });

        const websearchModel =
          process.env.NEUROLINK_WEBSEARCH_MODEL?.trim() ||
          "gemini-2.5-flash-lite";

        const model = vertex_ai.getGenerativeModel({
          model: websearchModel,
          tools: createGoogleSearchTools(),
        });

        // Search query with word limit constraint
        const searchPrompt = `Search for: "${query}". Provide a concise summary in no more than ${maxWords} words.`;

        const startTime = Date.now();
        const response = await model.generateContent({
          contents: [
            {
              role: "user",
              parts: [{ text: searchPrompt }],
            },
          ],
        });

        const responseTime = Date.now() - startTime;

        // Extract grounding metadata and search results
        const result = response.response;
        const candidates = result.candidates;

        if (!candidates || candidates.length === 0) {
          return {
            success: false,
            error: "No search results returned",
            query,
          };
        }

        const content = candidates[0].content;
        if (!content || !content.parts || content.parts.length === 0) {
          return {
            success: false,
            error: "No search content found",
            query,
          };
        }

        // Extract raw search content
        const searchContent = content.parts[0].text || "";

        // Extract grounding sources if available
        const groundingMetadata = candidates[0]?.groundingMetadata;
        const searchResults = [];

        if (groundingMetadata?.groundingChunks) {
          for (const chunk of groundingMetadata.groundingChunks.slice(
            0,
            limitedResults,
          )) {
            if (chunk.web) {
              searchResults.push({
                title: chunk.web.title || "No title",
                url: chunk.web.uri || "",
                snippet: searchContent, // Use full content since maxWords already limits length
                domain: chunk.web.uri
                  ? new URL(chunk.web.uri).hostname
                  : "unknown",
              });
            }
          }
        }

        // If no grounding metadata, create basic result structure
        if (searchResults.length === 0) {
          searchResults.push({
            title: `Search results for: ${query}`,
            url: "",
            snippet: searchContent,
            domain: "google-search",
          });
        }

        return {
          success: true,
          query,
          searchResults,
          rawContent: searchContent,
          totalResults: searchResults.length,
          provider: "google-search-grounding",
          model: websearchModel,
          responseTime,
          timestamp: startTime,
          grounded: true,
        };
      } catch (error) {
        logger.error("Web search grounding error:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          query,
          provider: "google-search-grounding",
        };
      }
    },
  }),
};

/**
 * Bash command execution tool - exported separately for opt-in use.
 *
 * SECURITY: This tool is NOT included in directAgentTools by default.
 * It must be explicitly enabled via:
 *   - Environment variable: NEUROLINK_ENABLE_BASH_TOOL=true
 *   - Config: toolConfig.enableBashTool = true
 *
 * Import this directly when you need bash execution capabilities:
 *   import { bashTool } from '../agent/directTools.js';
 */
export const bashTool: Tool = tool({
  description:
    "Execute a bash/shell command and return stdout, stderr, and exit code. Supports full shell syntax including pipes, redirects, and variable expansion. Requires HITL confirmation when enabled.",
  inputSchema: z.object({
    command: z
      .string()
      .describe(
        "The shell command to execute (supports pipes, redirects, etc.)",
      ),
    timeout: z
      .number()
      .optional()
      .default(30000)
      .describe("Timeout in milliseconds (default: 30000, max: 120000)"),
    cwd: z
      .string()
      .optional()
      .describe("Working directory (defaults to process.cwd())"),
  }),
  execute: async ({ command, timeout = 30000, cwd }) => {
    try {
      const effectiveTimeout = Math.min(Math.max(timeout, 100), 120000);
      const resolvedCwd = cwd ? path.resolve(cwd) : process.cwd();
      const currentCwd = process.cwd();

      // Verify cwd exists before resolving symlinks
      if (
        !fs.existsSync(resolvedCwd) ||
        !fs.statSync(resolvedCwd).isDirectory()
      ) {
        return {
          success: false,
          code: -1,
          stdout: "",
          stderr: "",
          error: `Directory does not exist: ${resolvedCwd}`,
        };
      }

      // Security: resolve symlinks and prevent execution outside current directory
      try {
        const realCwd = fs.realpathSync(currentCwd);
        const realResolvedCwd = fs.realpathSync(resolvedCwd);
        if (!realResolvedCwd.startsWith(realCwd)) {
          return {
            success: false,
            code: -1,
            stdout: "",
            stderr: "",
            error:
              "Access denied: Cannot execute commands outside current directory",
          };
        }
      } catch {
        return {
          success: false,
          code: -1,
          stdout: "",
          stderr: "",
          error: "Access denied: Cannot resolve directory path",
        };
      }

      // Use /bin/bash -c to support full shell syntax (pipes, redirects, etc.)
      return await new Promise((resolve) => {
        execFile(
          "/bin/bash",
          ["-c", command],
          {
            timeout: effectiveTimeout,
            cwd: resolvedCwd,
            maxBuffer: MAX_OUTPUT_BYTES,
          },
          (error, stdout, stderr) => {
            if (error) {
              const exitCode = typeof error.code === "number" ? error.code : 1;
              resolve({
                success: false,
                code: exitCode,
                stdout: truncateOutput(stdout || ""),
                stderr: truncateOutput(stderr || error.message),
                error: error.killed ? "Command timed out" : error.message,
              });
            } else {
              resolve({
                success: true,
                code: 0,
                stdout: truncateOutput(stdout),
                stderr: truncateOutput(stderr),
              });
            }
          },
        );
      });
    } catch (error) {
      return {
        success: false,
        code: -1,
        stdout: "",
        stderr: "",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});

// Conditionally inject executeBashCommand into directAgentTools when opted in.
// This ensures the tool is only available to SDK consumers who explicitly enable it.
if (shouldEnableBashTool()) {
  (directAgentTools as Record<string, unknown>).executeBashCommand = bashTool;
}

/**
 * Get a subset of tools for specific use cases with improved type safety
 */

export function getToolsForCategory(category: "basic"): BasicToolsMap;
// eslint-disable-next-line no-redeclare
export function getToolsForCategory(category: "filesystem"): FilesystemToolsMap;
// eslint-disable-next-line no-redeclare
export function getToolsForCategory(category: "utility"): UtilityToolsMap;
// eslint-disable-next-line no-redeclare
export function getToolsForCategory(category: "all"): AllToolsMap;
// eslint-disable-next-line no-redeclare
export function getToolsForCategory(
  category: "basic" | "filesystem" | "utility" | "all" = "all",
): BasicToolsMap | FilesystemToolsMap | UtilityToolsMap | AllToolsMap {
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
      };
    case "utility":
      return {
        getCurrentTime: directAgentTools.getCurrentTime,
        calculateMath: directAgentTools.calculateMath,
        listDirectory: directAgentTools.listDirectory,
      };
    case "all":
    default:
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
        logger.error(`❌ Tool ${name} missing description`);
        return false;
      }
      const toolRecord = tool as Record<string, unknown>;
      if (!toolRecord.parameters && !toolRecord.inputSchema) {
        logger.error(`Tool ${name} missing parameters/inputSchema`);
        return false;
      }
      if (!tool.execute || typeof tool.execute !== "function") {
        logger.error(`❌ Tool ${name} missing execute function`);
        return false;
      }
    }
    logger.info("✅ All tools have valid structure");
    return true;
  } catch (error) {
    logger.error("❌ Tool validation failed:", error);
    return false;
  }
}
