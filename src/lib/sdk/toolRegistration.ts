/**
 * NeuroLink SDK Tool Registration API
 * Simple interface for developers to register custom tools
 */

import { z } from "zod";
import { logger } from "../utils/logger.js";
import type { MCPServerInfo, MCPServerCategory } from "../types/mcpTypes.js";
import type {
  ToolArgs,
  SimpleTool as CoreSimpleTool,
  ZodUnknownSchema,
  SDKToolContext,
} from "../types/tools.js";
import type { JsonValue } from "../types/common.js";
import { createMCPServerInfo } from "../utils/mcpDefaults.js";
import {
  validateToolName,
  validateToolDescription,
} from "../utils/parameterValidation.js";
import {
  convertZodToJsonSchema,
  isZodSchema,
} from "../utils/schemaConversion.js";

/**
 * Configuration constants for tool validation
 */
const envDescValue = parseInt(
  process.env.NEUROLINK_TOOL_DESCRIPTION_MAX_LENGTH || "200",
  10,
);
// Allow 0 to mean unlimited (no length restriction)
const DEFAULT_DESCRIPTION_MAX_LENGTH =
  Number.isInteger(envDescValue) && envDescValue >= 0 ? envDescValue : 200;

const envNameValue = parseInt(
  process.env.NEUROLINK_TOOL_NAME_MAX_LENGTH || "50",
  10,
);
// Allow 0 to mean unlimited (no length restriction)
const DEFAULT_NAME_MAX_LENGTH =
  Number.isInteger(envNameValue) && envNameValue >= 0 ? envNameValue : 50;

/**
 * Enhanced validation configuration
 */
const VALIDATION_CONFIG = {
  // Tool name constraints
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: DEFAULT_NAME_MAX_LENGTH,

  // Description constraints
  DESCRIPTION_MIN_LENGTH: 10,
  DESCRIPTION_MAX_LENGTH: DEFAULT_DESCRIPTION_MAX_LENGTH,

  // Reserved tool names that cannot be used
  RESERVED_NAMES: new Set([
    "system",
    "internal",
    "core",
    "ai",
    "assistant",
    "help",
    "debug",
    "test",
    "mock",
    "default",
    "config",
    "admin",
    "root",
    "neurolink",
  ]),

  // Recommended tool name patterns
  RECOMMENDED_PATTERNS: [
    "get_data",
    "fetch_info",
    "calculate_value",
    "send_message",
    "create_item",
    "update_record",
    "delete_file",
    "validate_input",
  ],

  // Pre-compiled regex patterns for performance optimization
  COMPILED_PATTERN_REGEXES: [
    "get_data",
    "fetch_info",
    "calculate_value",
    "send_message",
    "create_item",
    "update_record",
    "delete_file",
    "validate_input",
  ].map((pattern) => new RegExp(pattern.replace(/_/g, "[_-]"), "i")),
} as const;

/**
 * Context provided to tools during execution
 * Type alias for backward compatibility
 */
export type ToolContext = SDKToolContext;

/**
 * Simple tool interface for SDK users
 * Extends the core SimpleTool with specific types
 */
export type SimpleTool<TArgs = ToolArgs, TResult = JsonValue> = Omit<
  CoreSimpleTool<TArgs, TResult>,
  "execute"
> & {
  /**
   * Tool description that helps AI understand when to use it
   */
  description: string;

  /**
   * Parameters schema using Zod (optional)
   */
  parameters?: ZodUnknownSchema;

  /**
   * Tool execution function
   */
  execute: (params: TArgs, context?: ToolContext) => Promise<TResult>;

  /**
   * Optional metadata
   */
  metadata?: {
    category?: string;
    version?: string;
    author?: string;
    tags?: string[];
    documentation?: string;
    [key: string]: JsonValue | undefined;
  };
};

/**
 * Creates a MCPServerInfo from a set of tools
 */
export function createMCPServerFromTools(
  serverId: string,
  tools: Record<string, SimpleTool>,
  metadata?: {
    title?: string;
    description?: string;
    category?: MCPServerCategory;
    version?: string;
    author?: string;
    [key: string]: JsonValue | undefined;
  },
): MCPServerInfo {
  const mcpTools: Array<{
    name: string;
    description: string;
    inputSchema?: object;
  }> = [];

  for (const [name, tool] of Object.entries(tools)) {
    mcpTools.push({
      name,
      description: tool.description || name,
      inputSchema: tool.parameters
        ? convertSchemaToJsonSchema(tool.parameters)
        : {},
    });
  }

  // SMART DEFAULTS: Use utility to eliminate manual MCPServerInfo creation
  return createMCPServerInfo({
    id: serverId,
    name: metadata?.title || serverId,
    tools: mcpTools,
    description: metadata?.description || serverId,
    category: metadata?.category,
    // Detect category based on context if not provided
    isExternal: metadata?.category === "external",
    isBuiltIn: metadata?.category === "built-in",
    isCustomTool: false,
  });
}

/**
 * Helper to convert schema parameters to JSON Schema format
 */
function convertSchemaToJsonSchema(schema: unknown): object {
  if (isZodSchema(schema)) {
    return convertZodToJsonSchema(schema as ZodUnknownSchema);
  }

  // If it's already a JSON Schema object, return as-is
  if (schema && typeof schema === "object") {
    return schema as object;
  }

  // Return empty object if no schema
  return {};
}

/**
 * Helper to create a tool with type safety
 */
export function createTool(config: SimpleTool): SimpleTool {
  return config;
}

/**
 * Helper to create a validated tool with suggested improvements
 */
export function createValidatedTool(
  name: string,
  config: SimpleTool,
  options: { strict?: boolean; suggestions?: boolean } = {},
): SimpleTool {
  const { strict = true, suggestions = true } = options;

  try {
    // Validate the tool
    validateTool(name, config);

    // Provide helpful suggestions if enabled
    if (suggestions) {
      provideToolSuggestions(name, config);
    }

    logger.debug(`Tool '${name}' created and validated successfully`);
    return config;
  } catch (error) {
    if (strict) {
      throw error;
    }

    // Log warning but continue in non-strict mode
    logger.warn(`Tool '${name}' validation failed in non-strict mode`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return config;
  }
}

/**
 * Provide helpful suggestions for tool improvement
 */
function provideToolSuggestions(name: string, tool: SimpleTool): void {
  const suggestions: string[] = [];

  // Check for common improvements
  if (!tool.parameters) {
    suggestions.push(
      "Consider adding a parameters schema using Zod for better type safety and validation",
    );
  }

  if (!tool.metadata?.category) {
    suggestions.push(
      "Adding a category in metadata helps organize tools: { metadata: { category: 'data' } }",
    );
  }

  if (!tool.metadata?.version) {
    suggestions.push(
      "Adding a version helps track tool updates: { metadata: { version: '1.0.0' } }",
    );
  }

  // Check description quality
  const description = tool.description.toLowerCase();
  if (!description.includes("return") && !description.includes("result")) {
    suggestions.push(
      "Consider describing what the tool returns for better AI understanding",
    );
  }

  if (suggestions.length > 0) {
    logger.debug(`Tool '${name}' suggestions for improvement:`, {
      suggestions: suggestions.slice(0, 3), // Limit to avoid spam
    });
  }
}

/**
 * Helper to create a tool with typed parameters
 */
export function createTypedTool<TParams extends ZodUnknownSchema>(
  config: Omit<SimpleTool, "execute"> & {
    parameters: TParams;
    execute: (
      params: z.infer<TParams>,
      context?: ToolContext,
    ) => Promise<JsonValue> | JsonValue;
  },
): SimpleTool {
  return config as SimpleTool;
}

/**
 * Enhanced tool name validation using centralized utilities
 */
function validateToolNameLegacy(name: string): void {
  const error = validateToolName(name);
  if (error) {
    throw error;
  }

  // Additional legacy-specific validations
  const trimmedName = name.trim();

  // Naming convention suggestions using pre-compiled patterns for performance
  const hasGoodPattern = VALIDATION_CONFIG.COMPILED_PATTERN_REGEXES.some(
    (patternRegex) => {
      return patternRegex.test(trimmedName);
    },
  );

  if (!hasGoodPattern && trimmedName.length > 10) {
    logger.debug(
      `Tool name '${name}' could follow recommended patterns for better clarity. ` +
        `Consider patterns like: ${VALIDATION_CONFIG.RECOMMENDED_PATTERNS.slice(0, 4).join(", ")}`,
    );
  }
}

/**
 * Enhanced description validation using centralized utilities
 */
function validateToolDescriptionLegacy(
  name: string,
  description: string,
): void {
  const error = validateToolDescription(description);
  if (error) {
    throw new Error(`Tool '${name}': ${error.message}`);
  }

  // Additional legacy-specific validations
  const trimmedDescription = description.trim();

  // Quality suggestions
  const hasActionWord =
    /^(get|fetch|calculate|send|create|update|delete|validate|process|generate|parse|convert)/i.test(
      trimmedDescription,
    );
  if (!hasActionWord) {
    logger.debug(
      `Tool '${name}' description could start with an action word (get, fetch, calculate, etc.) for better clarity: "${trimmedDescription.substring(0, 30)}..."`,
    );
  }
}

/**
 * Validate tool configuration with detailed error messages
 */
export function validateTool(name: string, tool: SimpleTool): void {
  // Enhanced tool name validation using centralized utilities
  validateToolNameLegacy(name);

  // Validate tool object
  if (!tool || typeof tool !== "object") {
    throw new Error(
      `Tool '${name}' must be an object with description and execute properties. Received: ${typeof tool}. ` +
        `Expected format: { description: "Tool description", execute: async (params) => { ... } }`,
    );
  }

  // Enhanced description validation using centralized utilities
  validateToolDescriptionLegacy(name, tool.description);

  // Validate execute function with signature guidance
  if (typeof tool.execute !== "function") {
    throw new Error(
      `Tool '${name}' must have an execute function. ` +
        `Expected signature: async (params?: ToolArgs) => Promise<unknown>. ` +
        `Received: ${typeof tool.execute}. ` +
        `Example: { execute: async (params) => { return { success: true, data: result }; } }`,
    );
  }

  // Check for common mistake: using 'schema' instead of 'parameters'
  if ("schema" in tool && !("parameters" in tool)) {
    throw new Error(
      `Tool '${name}' uses 'schema' property, but NeuroLink expects 'parameters'. ` +
        `Please change 'schema' to 'parameters' and use a Zod schema: ` +
        `{ parameters: z.object({ ... }), execute: ... } ` +
        `See documentation: https://docs.neurolink.com/tools`,
    );
  }

  // Validate parameters schema if provided - support both Zod and custom schemas
  if (tool.parameters) {
    if (typeof tool.parameters !== "object") {
      throw new Error(
        `Tool '${name}' parameters must be an object. ` +
          `Received: ${typeof tool.parameters}`,
      );
    }

    // Check for common schema validation methods (Zod uses 'parse', others might use 'validate')
    const params = tool.parameters as unknown as Record<string, unknown>;
    const hasValidationMethod =
      typeof params.parse === "function" ||
      typeof params.validate === "function" ||
      "_def" in params; // Zod schemas have _def property

    // Check for plain JSON schema objects (common mistake)
    if ("type" in params && "properties" in params && !hasValidationMethod) {
      throw new Error(
        `Tool '${name}' appears to use a plain JSON schema object as parameters. ` +
          `NeuroLink requires a Zod schema for proper type validation and tool integration. ` +
          `Please change from:\n` +
          `  { type: 'object', properties: { ... } }\n` +
          `To:\n` +
          `  z.object({ fieldName: z.string() })\n` +
          `Import Zod with: import { z } from 'zod'`,
      );
    }

    if (!hasValidationMethod) {
      const errorMessage =
        typeof params.parse === "function" || "_def" in params
          ? `Tool '${name}' has a Zod-like schema but validation failed. Ensure it's a valid Zod schema: z.object({ ... })`
          : typeof params.validate === "function"
            ? `Tool '${name}' has a validate method but it may not be callable. Ensure: { parameters: { validate: (data) => { ... } } }`
            : `Tool '${name}' parameters must be a schema object with validation. ` +
              `Supported formats:\n` +
              `• Zod schema: { parameters: z.object({ value: z.string() }) }\n` +
              `• Custom schema: { parameters: { validate: (data) => { ... } } }\n` +
              `• Custom schema: { parameters: { parse: (data) => { ... } } }`;

      throw new Error(errorMessage);
    }
  }

  // Validate metadata if provided
  if (tool.metadata) {
    if (typeof tool.metadata !== "object" || Array.isArray(tool.metadata)) {
      throw new Error(
        `Tool '${name}' metadata must be an object. Received: ${typeof tool.metadata}. ` +
          `Example: { category: "data", version: "1.0.0", author: "team@company.com" }`,
      );
    }

    // Validate metadata fields
    if (tool.metadata.version && typeof tool.metadata.version !== "string") {
      throw new Error(
        `Tool '${name}' metadata.version must be a string. Received: ${typeof tool.metadata.version}. ` +
          `Example: "1.0.0", "2.1.3-beta"`,
      );
    }

    if (tool.metadata.category && typeof tool.metadata.category !== "string") {
      throw new Error(
        `Tool '${name}' metadata.category must be a string. Received: ${typeof tool.metadata.category}. ` +
          `Example: "data", "communication", "utility"`,
      );
    }

    if (tool.metadata.tags && !Array.isArray(tool.metadata.tags)) {
      throw new Error(
        `Tool '${name}' metadata.tags must be an array of strings. Received: ${typeof tool.metadata.tags}. ` +
          `Example: ["api", "external", "web"]`,
      );
    }
  }

  // Success feedback for debugging
  logger.debug(`Tool '${name}' validation passed`, {
    nameLength: name.length,
    descriptionLength: tool.description.length,
    hasParameters: !!tool.parameters,
    hasMetadata: !!tool.metadata,
  });
}

/**
 * Utility to validate multiple tools at once
 */
export function validateTools(tools: Record<string, SimpleTool>): {
  valid: string[];
  invalid: Array<{ name: string; error: string }>;
} {
  const valid: string[] = [];
  const invalid: Array<{ name: string; error: string }> = [];

  for (const [name, tool] of Object.entries(tools)) {
    try {
      validateTool(name, tool);
      valid.push(name);
    } catch (error) {
      invalid.push({
        name,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  logger.debug(`Bulk validation completed`, {
    validCount: valid.length,
    invalidCount: invalid.length,
    totalTools: Object.keys(tools).length,
  });

  return { valid, invalid };
}

/**
 * Get validation configuration for external inspection
 */
export function getValidationConfig(): typeof VALIDATION_CONFIG {
  return { ...VALIDATION_CONFIG };
}

/**
 * Check if a tool name is available (not reserved)
 */
export function isToolNameAvailable(name: string): boolean {
  if (!name || typeof name !== "string") {
    return false;
  }

  const trimmedName = name.trim().toLowerCase();
  return (
    trimmedName.length >= VALIDATION_CONFIG.NAME_MIN_LENGTH &&
    trimmedName.length <= VALIDATION_CONFIG.NAME_MAX_LENGTH &&
    !VALIDATION_CONFIG.RESERVED_NAMES.has(trimmedName) &&
    /^[a-zA-Z0-9_-]+$/.test(trimmedName)
  );
}

/**
 * Suggest alternative tool names if the provided name is invalid
 */
export function suggestToolNames(baseName: string): string[] {
  if (!baseName || typeof baseName !== "string") {
    return VALIDATION_CONFIG.RECOMMENDED_PATTERNS.slice(0, 3);
  }

  const cleanBase = baseName.toLowerCase().replace(/[^a-z0-9]/g, "_");
  const suggestions: string[] = [];

  // Add suffixes if the name is reserved
  if (VALIDATION_CONFIG.RESERVED_NAMES.has(cleanBase)) {
    suggestions.push(
      `${cleanBase}_tool`,
      `custom_${cleanBase}`,
      `${cleanBase}_helper`,
    );
  }

  // Add pattern-based suggestions
  const patterns = ["get_", "fetch_", "create_", "update_"];
  patterns.forEach((pattern) => {
    if (!cleanBase.startsWith(pattern.slice(0, -1))) {
      suggestions.push(`${pattern}${cleanBase}`);
    }
  });

  // Add recommended patterns if no good suggestions
  if (suggestions.length === 0) {
    suggestions.push(...VALIDATION_CONFIG.RECOMMENDED_PATTERNS.slice(0, 3));
  }

  return suggestions.slice(0, 5); // Limit to 5 suggestions
}
