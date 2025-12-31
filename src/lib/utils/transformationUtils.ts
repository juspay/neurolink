/**
 * Object Transformation Utilities
 * Centralizes repeated object transformation patterns to improve code reuse and maintainability
 */

import type { UnknownRecord } from "../types/common.js";
import type { StandardRecord, StringArray } from "../types/typeAliases.js";
import { logger } from "./logger.js";
import { inlineJsonSchema } from "./schemaConversion.js";

// ============================================================================
// TOOL EXECUTION TRANSFORMATIONS
// ============================================================================

/**
 * Transform tool execution results from AI SDK format to NeuroLink GenerateResult format
 * Handles both single execution and array formats with robust type checking
 *
 * @param toolExecutions - Array of tool execution results from AI SDK (optional)
 * @returns Array of standardized tool execution objects with name, input, output, and duration
 *
 * @example
 * ```typescript
 * const executions = transformToolExecutions([
 *   { name: "calculator", input: { a: 5, b: 3 }, output: 8, duration: 150 }
 * ]);
 * // Returns: [{ name: "calculator", input: { a: 5, b: 3 }, output: 8, duration: 150 }]
 * ```
 */
export function transformToolExecutions(toolExecutions?: unknown[]): Array<{
  name: string;
  input: StandardRecord;
  output: unknown;
  duration: number;
}> {
  if (!toolExecutions || !Array.isArray(toolExecutions)) {
    return [];
  }

  return toolExecutions.map((te, index) => {
    const teRecord = te as UnknownRecord;

    // Enhanced tool name extraction with multiple fallback strategies
    let toolName =
      (teRecord.name as string) ||
      (teRecord.toolName as string) ||
      (teRecord.tool as string) ||
      "";

    // If still no name, try to extract from nested objects
    if (
      !toolName &&
      teRecord.toolCall &&
      typeof teRecord.toolCall === "object"
    ) {
      const toolCall = teRecord.toolCall as UnknownRecord;
      toolName =
        (toolCall.name as string) || (toolCall.toolName as string) || "";
    }

    // Last resort: use index-based fallback to avoid "Unknown Tool"
    if (!toolName) {
      toolName = `tool_execution_${index}`;
    }

    // Enhanced tool parameter extraction with structured logging
    const parameterExtractionData = {
      executionIndex: index,
      toolNameExtracted: toolName,
      primarySources: {
        hasInput: !!teRecord.input,
        hasParameters: !!teRecord.parameters,
        hasArgs: !!teRecord.args,
        inputType: typeof teRecord.input,
        parametersType: typeof teRecord.parameters,
        argsType: typeof teRecord.args,
      },
      rawRecordKeys: Object.keys(teRecord),
    };

    logger.debug(
      "[TransformationUtils] Tool parameter extraction analysis",
      parameterExtractionData,
    );

    // Enhanced input extraction
    let input =
      (teRecord.input as StandardRecord) ||
      (teRecord.parameters as StandardRecord) ||
      (teRecord.args as StandardRecord) ||
      {};

    const primaryExtractionResult = {
      keysCount: Object.keys(input).length,
      keys: Object.keys(input),
      extractionSuccessful: Object.keys(input).length > 0,
      extractionSource: teRecord.input
        ? "input"
        : teRecord.parameters
          ? "parameters"
          : teRecord.args
            ? "args"
            : "empty",
    };

    logger.debug(
      "[TransformationUtils] Primary parameter extraction result",
      primaryExtractionResult,
    );

    // Extract input from nested toolCall if available
    if (
      Object.keys(input).length === 0 &&
      teRecord.toolCall &&
      typeof teRecord.toolCall === "object"
    ) {
      const toolCall = teRecord.toolCall as UnknownRecord;

      const nestedExtractionData = {
        reason: "Primary extraction failed, checking nested toolCall",
        nestedSources: {
          hasInput: !!toolCall.input,
          hasParameters: !!toolCall.parameters,
          hasArgs: !!toolCall.args,
        },
        toolCallKeys: Object.keys(toolCall),
      };

      logger.debug(
        "[TransformationUtils] Nested parameter extraction attempt",
        nestedExtractionData,
      );

      input =
        (toolCall.input as StandardRecord) ||
        (toolCall.parameters as StandardRecord) ||
        (toolCall.args as StandardRecord) ||
        {};

      const nestedExtractionResult = {
        keysCount: Object.keys(input).length,
        keys: Object.keys(input),
        extractionSuccessful: Object.keys(input).length > 0,
        extractionSource: toolCall.input
          ? "toolCall.input"
          : toolCall.parameters
            ? "toolCall.parameters"
            : toolCall.args
              ? "toolCall.args"
              : "empty",
      };

      logger.debug(
        "[TransformationUtils] Nested parameter extraction result",
        nestedExtractionResult,
      );
    }

    // Target tool parameter analysis for critical tools
    if (
      toolName &&
      (toolName.includes("SuccessRateSRByTime") ||
        toolName.includes("juspay-analytics"))
    ) {
      const targetToolAnalysis = {
        toolName,
        inputKeys: Object.keys(input),
        keysCount: Object.keys(input).length,
        hasStartTime: "startTime" in input,
        hasEndTime: "endTime" in input,
        startTimeValue: input.startTime || "MISSING",
        endTimeValue: input.endTime || "MISSING",
        extractionStatus:
          Object.keys(input).length === 0 ? "FAILED" : "SUCCESS",
      };

      logger.debug(
        "[TransformationUtils] Target tool parameter analysis",
        targetToolAnalysis,
      );

      if (Object.keys(input).length === 0) {
        logger.error(
          "[TransformationUtils] Critical: Target tool parameter extraction failed",
          {
            toolName,
            reason:
              "Both primary and nested extraction returned empty parameters",
            impact: "AI response did not contain expected parameter structure",
          },
        );
      }
    }

    // Final parameter extraction summary
    const finalExtractionSummary = {
      toolName,
      inputKeysCount: Object.keys(input).length,
      inputKeys: Object.keys(input),
      hasParameters: Object.keys(input).length > 0,
      duration:
        (teRecord.duration as number) ??
        (teRecord.executionTime as number) ??
        (teRecord.responseTime as number) ??
        0,
      hasOutput: !!(teRecord.output || teRecord.result || teRecord.response),
    };

    logger.debug(
      "[TransformationUtils] Final parameter extraction result",
      finalExtractionSummary,
    );

    // Enhanced output extraction with success indication
    const output =
      (teRecord.output as unknown) ||
      (teRecord.result as unknown) ||
      (teRecord.response as unknown) ||
      "success";

    // Enhanced duration extraction
    const duration =
      (teRecord.duration as number) ??
      (teRecord.executionTime as number) ??
      (teRecord.responseTime as number) ??
      0;

    return {
      name: toolName,
      input: input,
      output: output,
      duration: duration,
    };
  });
}

/**
 * Transform tool execution results from AI SDK format to internal format (for MCP generation)
 * Used in tryMCPGeneration method
 */
export function transformToolExecutionsForMCP(
  toolExecutions?: unknown[],
): Array<{
  toolName: string;
  executionTime: number;
  success: boolean;
  serverId?: string;
}> {
  if (!toolExecutions || !Array.isArray(toolExecutions)) {
    return [];
  }

  return toolExecutions.map((te, index) => {
    const teRecord = te as UnknownRecord;

    // Enhanced tool name extraction matching the main function
    let toolName =
      (teRecord.name as string) ||
      (teRecord.toolName as string) ||
      (teRecord.tool as string) ||
      "";

    // Try nested toolCall extraction
    if (
      !toolName &&
      teRecord.toolCall &&
      typeof teRecord.toolCall === "object"
    ) {
      const toolCall = teRecord.toolCall as UnknownRecord;
      toolName =
        (toolCall.name as string) || (toolCall.toolName as string) || "";
    }

    // Fallback to avoid empty names
    if (!toolName) {
      toolName = `mcp_tool_execution_${index}`;
    }

    // Enhanced execution time extraction
    const executionTime =
      (teRecord.duration as number) ??
      (teRecord.executionTime as number) ??
      (teRecord.responseTime as number) ??
      0;

    // Enhanced success detection - check for actual success indicators
    let success = true; // Default to true

    // Check for explicit success/error indicators
    if (teRecord.success !== undefined) {
      success = Boolean(teRecord.success);
    } else if (teRecord.error !== undefined) {
      success = false;
    } else if (teRecord.status !== undefined) {
      const status = String(teRecord.status).toLowerCase().trim();
      success = !["error", "failed", "failure", "fail"].includes(status);
    }

    // Enhanced server ID extraction
    let serverId =
      (teRecord.serverId as string) ||
      (teRecord.server as string) ||
      (teRecord.source as string) ||
      undefined;

    // Try to extract from nested structures
    if (
      !serverId &&
      teRecord.toolCall &&
      typeof teRecord.toolCall === "object"
    ) {
      const toolCall = teRecord.toolCall as UnknownRecord;
      serverId =
        (toolCall.serverId as string) ||
        (toolCall.server as string) ||
        undefined;
    }

    return {
      toolName: toolName,
      executionTime: executionTime,
      success: success,
      serverId: serverId,
    };
  });
}

// ============================================================================
// AVAILABLE TOOLS TRANSFORMATIONS
// ============================================================================

/**
 * Transform available tools from internal format to GenerateResult format
 * Ensures consistent tool information structure across the API with schema normalization
 *
 * @param availableTools - Array of tool definitions from various sources (MCP servers, builtin tools, etc.)
 * @returns Array of normalized tool descriptions with consistent schema format
 *
 * @example
 * ```typescript
 * const tools = transformAvailableTools([
 *   { name: "calculator", description: "Math tool", server: "builtin", inputSchema: {...} }
 * ]);
 * // Returns: [{ name: "calculator", description: "Math tool", serverId: "builtin", schema: {...} }]
 * ```
 */
export function transformAvailableTools(
  availableTools?: Array<{
    name: string;
    description: string;
    server: string;
    category?: string;
    inputSchema?: StandardRecord;
    parameters?: StandardRecord;
    schema?: StandardRecord;
  }>,
): Array<{
  name: string;
  description: string;
  server: string;
  parameters: StandardRecord;
}> {
  if (!availableTools || !Array.isArray(availableTools)) {
    return [];
  }

  return availableTools.map((tool) => {
    const toolRecord = tool as UnknownRecord;

    let extractedParameters: StandardRecord = {};

    const inputSchema = toolRecord.inputSchema as StandardRecord;
    const directParameters = toolRecord.parameters as StandardRecord;
    const fallbackSchema = toolRecord.schema as StandardRecord;

    if (inputSchema && typeof inputSchema === "object") {
      // Use shared inlineJsonSchema for recursive $ref resolution
      const inlinedSchema = inlineJsonSchema(
        inputSchema as Record<string, unknown>,
      ) as StandardRecord;

      if (inlinedSchema.properties) {
        extractedParameters = {
          type: inlinedSchema.type || "object",
          properties: inlinedSchema.properties,
          required: inlinedSchema.required || [],
          ...inlinedSchema,
        };
      } else if (inlinedSchema.type === "object") {
        extractedParameters = inlinedSchema;
      } else {
        extractedParameters = inlinedSchema;
      }
    } else if (directParameters && typeof directParameters === "object") {
      // Also inline $ref for direct parameters if present
      extractedParameters = inlineJsonSchema(
        directParameters as Record<string, unknown>,
      ) as StandardRecord;
    } else if (fallbackSchema && typeof fallbackSchema === "object") {
      // Also inline $ref for fallback schema if present
      extractedParameters = inlineJsonSchema(
        fallbackSchema as Record<string, unknown>,
      ) as StandardRecord;
    }

    if (!extractedParameters || typeof extractedParameters !== "object") {
      extractedParameters = {};
    }

    if (
      extractedParameters &&
      !extractedParameters.type &&
      extractedParameters.properties
    ) {
      extractedParameters.type = "object";
    }

    return {
      name: tool.name || "",
      description: tool.description || "",
      server: tool.server || "",
      parameters: extractedParameters,
    };
  });
}

/**
 * Transform tools for MCP generation format
 * Simple transformation for internal MCP tool lists
 */
export function transformToolsForMCP(
  availableTools: Array<{
    name: string;
    description: string;
    server: string;
    category?: string;
  }>,
): Array<{
  name: string;
  description: string;
  server: string;
  category?: string;
}> {
  return availableTools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    server: tool.server,
    category: tool.category,
  }));
}

/**
 * Transform tools to expected format with required properties
 * Used in getAllAvailableTools method for final output
 */
export function transformToolsToExpectedFormat(
  tools: Array<{
    name: string;
    description?: string;
    serverId?: string;
    category?: string;
    inputSchema?: StandardRecord;
  }>,
): Array<{
  name: string;
  description: string;
  server: string;
  category?: string;
  inputSchema?: StandardRecord;
}> {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description || "No description available",
    server: tool.serverId || "unknown",
    category: tool.category,
    inputSchema: tool.inputSchema,
  }));
}

// ============================================================================
// STRING AND ARRAY TRANSFORMATIONS
// ============================================================================

/**
 * Extract tool names from tool objects
 * Common pattern for creating arrays of tool names
 */
export function extractToolNames<T extends { name: string }>(
  tools: T[],
): StringArray {
  return tools.map((tool) => tool.name);
}

/**
 * Extract object keys as a comma-separated string
 * Common pattern for logging and debugging
 */
export function getKeysAsString(
  obj: StandardRecord,
  fallback = "none",
): string {
  const keys = Object.keys(obj);
  return keys.length > 0 ? keys.join(", ") : fallback;
}

/**
 * Count object properties
 * Common pattern for metrics and logging
 */
export function getKeyCount(obj: StandardRecord): number {
  return Object.keys(obj).length;
}

// ============================================================================
// SCHEMA TRANSFORMATIONS
// ============================================================================

/**
 * Transform schema properties to parameter descriptions
 * Used in tool-aware system prompt generation
 */
export function transformSchemaToParameterDescription(schema: {
  properties?: StandardRecord;
  required?: string[];
}): string {
  if (!schema?.properties) {
    return "";
  }

  const requiredParams = new Set(schema.required || []);
  return Object.entries(schema.properties)
    .map(([key, value]: [string, unknown]) => {
      const typedValue = value as StandardRecord;
      const required = requiredParams.has(key) ? " (required)" : "";
      const description = typedValue.description
        ? ` - ${typedValue.description}`
        : "";
      return `  - ${key}: ${typedValue.type || "unknown"}${required}${description}`;
    })
    .join("\n");
}

/**
 * Transform tools to tool descriptions for system prompts
 * Consolidated pattern for creating tool-aware prompts
 */
export function transformToolsToDescriptions(
  availableTools: Array<{
    name: string;
    description: string;
    server: string;
    inputSchema?: StandardRecord;
  }>,
): string {
  return availableTools
    .map((tool) => {
      const schema = tool.inputSchema as {
        properties?: StandardRecord;
        required?: string[];
      };

      let params = "";
      if (schema?.properties) {
        params = transformSchemaToParameterDescription(schema);
      }

      return `- ${tool.name}: ${tool.description} (from ${tool.server})\n${params}`;
    })
    .join("\n\n");
}

// ============================================================================
// VALIDATION TRANSFORMATIONS
// ============================================================================

/**
 * Transform parameters for validation
 * Common pattern when logging or checking parameter structures
 */
export function transformParamsForLogging(params: unknown): string {
  if (!params || typeof params !== "object") {
    return String(params);
  }

  const record = params as StandardRecord;
  return `${Object.keys(record).length} params`;
}

/**
 * Safe property extraction from unknown objects
 * Common pattern for safely accessing properties from unknown structures
 */
export function safeExtractProperty<T = unknown>(
  obj: unknown,
  key: string,
  fallback: T,
): T {
  if (!obj || typeof obj !== "object" || obj === null) {
    return fallback;
  }

  const record = obj as StandardRecord;
  const value = record[key];

  return value !== undefined ? (value as T) : fallback;
}

/**
 * Safe extraction of string properties
 * Specialized version for string properties with fallback
 */
export function safeExtractString(
  obj: unknown,
  key: string,
  fallback = "",
): string {
  const value = safeExtractProperty(obj, key, fallback);
  return typeof value === "string" ? value : fallback;
}

/**
 * Safe extraction of number properties
 * Specialized version for number properties with fallback
 */
export function safeExtractNumber(
  obj: unknown,
  key: string,
  fallback = 0,
): number {
  const value = safeExtractProperty(obj, key, fallback);
  return typeof value === "number" ? value : fallback;
}

/**
 * Safe extraction of boolean properties
 * Specialized version for boolean properties with fallback
 */
export function safeExtractBoolean(
  obj: unknown,
  key: string,
  fallback = false,
): boolean {
  const value = safeExtractProperty(obj, key, fallback);
  return typeof value === "boolean" ? value : fallback;
}

// ============================================================================
// COLLECTION TRANSFORMATIONS
// ============================================================================

/**
 * Transform Map to array of values
 * Common pattern for converting tool maps to arrays
 */
export function mapToArray<T>(map: Map<string, T>): T[] {
  return Array.from(map.values());
}

/**
 * Transform Map to array of key-value pairs
 * Common pattern for processing map entries
 */
export function mapToEntries<T>(map: Map<string, T>): Array<[string, T]> {
  return Array.from(map.entries());
}

/**
 * Group array items by a key
 * Common pattern for organizing tools or other objects by category
 */
export function groupBy<T>(
  items: T[],
  keyFn: (item: T) => string,
): Map<string, T[]> {
  const groups = new Map<string, T[]>();

  for (const item of items) {
    const key = keyFn(item);
    const existing = groups.get(key) || [];
    existing.push(item);
    groups.set(key, existing);
  }

  return groups;
}

/**
 * Remove undefined properties from objects
 * Common pattern for cleaning up object structures
 */
export function removeUndefinedProperties<T extends StandardRecord>(obj: T): T {
  const cleaned = {} as T;

  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      (cleaned as StandardRecord)[key] = value;
    }
  }

  return cleaned;
}

/**
 * Merge objects with undefined handling
 * Common pattern for combining configuration objects
 */
export function mergeWithUndefinedHandling<T extends StandardRecord>(
  target: T,
  ...sources: Partial<T>[]
): T {
  const result = { ...target };

  for (const source of sources) {
    for (const [key, value] of Object.entries(source)) {
      if (value !== undefined) {
        (result as StandardRecord)[key] = value;
      }
    }
  }

  return result;
}

// ============================================================================
// TOOL OPTIMIZATION UTILITIES
// ============================================================================

/**
 * Optimize tool information for collection with minimal object creation
 * Consolidates repeated optimization patterns across different tool sources
 *
 * @param tool - Tool information to optimize
 * @param defaults - Default values to apply if missing
 * @returns Optimized tool with minimal object creation
 *
 * @example
 * ```typescript
 * const optimized = optimizeToolForCollection(tool, {
 *   serverId: "builtin",
 *   category: "math"
 * });
 * ```
 */
export function optimizeToolForCollection<T extends Record<string, unknown>>(
  tool: T,
  defaults: {
    description?: string;
    serverId?: string;
    category?: string;
    inputSchema?: StandardRecord;
  },
): T {
  // Check what properties actually need modification
  const needsDescription = !tool.description && defaults.description;
  const needsServerId = !tool.serverId && defaults.serverId;
  const needsCategory = !tool.category && defaults.category;
  const needsInputSchema = !tool.inputSchema && defaults.inputSchema;
  const hasParametersConflict = tool.inputSchema && "parameters" in tool;

  // Only create new object if modifications are actually needed
  if (
    !needsDescription &&
    !needsServerId &&
    !needsCategory &&
    !needsInputSchema &&
    !hasParametersConflict
  ) {
    return tool; // Return original tool without modification
  }

  // Create optimized tool with only necessary changes
  const optimizedTool = {
    ...tool,
    ...(needsDescription && { description: defaults.description }),
    ...(needsServerId && { serverId: defaults.serverId }),
    ...(needsCategory && { category: defaults.category }),
    ...(needsInputSchema && { inputSchema: defaults.inputSchema }),
  };

  // Clean up schema conflicts if present
  if (hasParametersConflict) {
    const cleanedTool = { ...optimizedTool };
    delete (cleanedTool as StandardRecord).parameters;
    return cleanedTool;
  }

  return optimizedTool;
}
