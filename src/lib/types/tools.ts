/**
 * Type definitions for NeuroLink tool system, including parameter schemas,
 * argument patterns, execution metadata, context, and result types.
 */

import { z } from "zod";
import type {
  ErrorInfo,
  JsonObject,
  JsonValue,
  Result,
  UnknownRecord,
} from "./common.js";
import type {
  StandardRecord,
  StringArray,
  ZodUnknownSchema,
} from "./aliases.js";
import type { ValidationError } from "../utils/parameterValidation.js";
import type { MCPToolAnnotations } from "./mcp.js";
import type { Logger } from "./utilities.js";
import type { HITLExecutionState } from "./hitl.js";

// Tool + schema primitives. Today these resolve through the upstream generation
// library; consumers should import via the package barrel.
import type { Tool } from "ai";
export type {
  Tool,
  ToolSet,
  ToolChoice,
  ToolCallOptions,
  ToolExecuteFunction,
  ToolApprovalRequest,
  ToolApprovalResponse,
  InferToolInput,
  InferToolOutput,
  Schema,
  FlexibleSchema,
  InferSchema,
} from "ai";

/**
 * Commonly used Zod schema type aliases for cleaner type declarations
 */
export type { ZodUnknownSchema, ZodToJsonSchemaInput } from "./aliases.js";
export type ZodAnySchema = z.ZodSchema<unknown>;
export type ZodObjectSchema = z.ZodObject<z.ZodRawShape>;
export type ZodStringSchema = z.ZodString;

/**
 * Tool parameter schema types
 */
export type ToolParameterSchema = ZodUnknownSchema | Record<string, JsonValue>;

/**
 * Standard tool input parameters
 */
export type BaseToolArgs = {
  [key: string]: JsonValue | undefined;
};

/**
 * Tool execution arguments with specific common patterns
 */
export type ToolArgs = BaseToolArgs & {
  // Common parameter patterns
  input?: JsonValue;
  data?: JsonValue;
  options?: JsonValue;
};

/**
 * Generic execution context for MCP operations
 * Moved from src/lib/mcp/contracts/mcpContract.ts
 */
export type ExecutionContext<T = StandardRecord> = {
  // Core identifiers (optional)
  sessionId?: string; // Session/request identifier
  userId?: string; // User identifier

  // Generic extensibility (industry standard)
  config?: T; // Generic configuration payload
  metadata?: StandardRecord; // Flexible metadata

  // Performance & resilience (standard patterns)
  cacheOptions?: CacheOptions;
  fallbackOptions?: FallbackOptions;
  timeoutMs?: number;
  maxRetries?: number;
  startTime?: number;
  hitlState?: HITLExecutionState;
};

/**
 * Cache configuration options
 * Moved from src/lib/mcp/contracts/mcpContract.ts
 */
export type CacheOptions = {
  enabled?: boolean;
  ttlMs?: number; // Time to live (milliseconds)
  strategy?: "memory" | "writeThrough" | "cacheAside";
};

/**
 * Fallback configuration options
 * Moved from src/lib/mcp/contracts/mcpContract.ts
 */
export type FallbackOptions = {
  enabled?: boolean;
  maxAttempts?: number;
  delayMs?: number;
  circuitBreaker?: boolean;
};

/**
 * Tool information with extensibility
 * Moved from src/lib/mcp/contracts/mcpContract.ts
 */
export type ToolInfo = {
  name: string;
  description?: string;
  category?: string;
  serverId?: string;
  inputSchema?: StandardRecord;
  outputSchema?: StandardRecord;
  /** MCP tool annotations (safety hints, metadata). Auto-inferred when mcp.annotations.autoInfer is enabled. */
  annotations?: MCPToolAnnotations;
  /** Per-tool timeout in milliseconds, set at registration time */
  timeoutMs?: number;
  maxRetries?: number;
  [key: string]: unknown; // Generic extensibility
};

/**
 * Tool Implementation type for MCP tool registry
 * Extracted from toolRegistry.ts for centralized type management
 */
export type ToolImplementation = {
  execute: (
    params: unknown,
    context?: ExecutionContext,
  ) => Promise<unknown> | unknown;
  description?: string;
  inputSchema?: unknown;
  outputSchema?: unknown;
  category?: string;
  permissions?: string[];
  /** Per-tool timeout in milliseconds, set at registration time */
  timeoutMs?: number;
  maxRetries?: number;
};

/**
 * Tool execution options for enhanced control
 * Extracted from toolRegistry.ts for centralized type management
 */
export type ToolExecutionOptions = {
  /**
   * Caller-specified execution timeout in milliseconds.
   * Used by executeTool() callers to override the default timeout for a
   * single invocation. Takes precedence over `timeoutMs` when both are set.
   */
  timeout?: number;
  retries?: number;
  context?: unknown;
  preferredSource?: string;
  fallbackEnabled?: boolean;
  validateBeforeExecution?: boolean;
  /**
   * Per-tool timeout in milliseconds, copied from ToolInfo at registration
   * time. Acts as the tool-level default; overridden by `timeout` when the
   * caller supplies an explicit value.
   * @deprecated Prefer using `timeout` for caller-specified overrides.
   *             This field exists for internal forwarding from ToolInfo and
   *             may be consolidated in a future release.
   */
  timeoutMs?: number;
  maxRetries?: number;
};

/**
 * Options for tool registration via registerTool()
 *
 * These options configure per-tool execution behavior. When not provided,
 * the SDK's global defaults are used (30s timeout, 2 retries), preserving
 * backward compatibility with existing production systems.
 *
 * @example
 * // Register with custom timeout and no retries
 * sdk.registerTool("myTool", tool, { timeout: 5000, maxRetries: 0 });
 *
 * // Register with defaults (same as before — no behavior change)
 * sdk.registerTool("myTool", tool);
 */
export type ToolRegistrationOptions = {
  /** Per-tool execution timeout in milliseconds. Only applied when explicitly set.
   *  When omitted, the SDK's global default (30s) is used. */
  timeout?: number;
  /** Maximum retry attempts on failure. Only applied when explicitly set.
   *  When omitted, the SDK's global default (2 retries) is used.
   *  Set to 0 to disable retries for this tool. */
  maxRetries?: number;
};

/**
 * Tool execution result
 * Moved from src/lib/mcp/contracts/mcpContract.ts
 */
export type ToolExecutionResult<T = unknown> = {
  result: T;
  context?: ExecutionContext; // Updated context after execution
  performance?: {
    duration: number;
    tokensUsed?: number;
    cost?: number;
  };
  validation?: ValidationResult; // Runtime validation results
  cached?: boolean; // Whether result came from cache
  fallback?: boolean; // Whether result came from fallback
};

/**
 * Validation result for runtime checks
 * Moved from src/lib/mcp/contracts/mcpContract.ts
 */
export type ValidationResult = {
  valid: boolean;
  missing: string[];
  warnings: string[];
  recommendations: string[];
};

/**
 * Tool execution metadata
 */
export type ToolExecutionMetadata = {
  requestId?: string;
  startTime?: number;
  version?: string;
  [key: string]: JsonValue | undefined;
};

/**
 * Tool execution context
 */
export type ToolContext = {
  sessionId?: string;
  userId?: string;
  aiProvider?: string;
  metadata?: ToolExecutionMetadata;
};

/**
 * SDK-specific tool context with additional fields for SDK usage
 * Extends the base ToolContext with session management, provider info, and logging
 */
export type SDKToolContext = ToolContext & {
  /**
   * Current session ID (required for SDK context)
   */
  sessionId: string;

  /**
   * AI provider being used
   */
  provider?: string;

  /**
   * Model being used
   */
  model?: string;

  /**
   * Call another tool
   */
  callTool?: (name: string, params: ToolArgs) => Promise<ToolResult>;

  /**
   * Logger instance
   */
  logger: Logger;
};

/**
 * Tool execution result metadata
 */
export type ToolResultMetadata = {
  toolName?: string;
  executionTime?: number;
  timestamp?: number;
  source?: string;
  version?: string;
  serverId?: string;
  sessionId?: string;
  blocked?: boolean;
  [key: string]: JsonValue | undefined;
};

/**
 * Tool result usage information
 */
export type ToolResultUsage = {
  executionTime?: number;
  tokensUsed?: number;
  cost?: number;
  [key: string]: JsonValue | undefined;
};

/**
 * Tool execution result
 */
export type ToolResult<T = JsonValue | unknown> = Result<
  T,
  ErrorInfo | string
> & {
  success: boolean;
  data?: T | null;
  error?: ErrorInfo | string;
  usage?: ToolResultUsage;
  metadata?: ToolResultMetadata;
};

/**
 * Tool metadata for registration
 */
export type ToolMetadata = {
  category?: string;
  version?: string;
  author?: string;
  tags?: string[];
  documentation?: string;
  [key: string]: JsonValue | undefined;
};

/**
 * Tool call object type for type-safe access to tool call properties
 */
export type ToolCallObject = UnknownRecord & {
  toolName?: string;
  name?: string;
  toolCallId?: string;
  id?: string;
  args?: UnknownRecord;
  arguments?: UnknownRecord;
};

/**
 * Tool execution context for tracking
 */
export type ToolExecutionContext = {
  executionId: string;
  tool: string;
  startTime: number;
  endTime?: number;
  result?: unknown;
  error?: string;
  metadata?: JsonObject;
};

/**
 * NeuroLink Native Event System Types
 */

/**
 * Tool execution event for real-time streaming
 */
export type ToolExecutionEvent = {
  type: "tool:start" | "tool:end";
  tool: string;
  /** Compatibility alias for older consumers that expect `toolName`. */
  toolName?: string;
  input?: unknown;
  result?: unknown;
  error?: string;
  timestamp: number;
  duration?: number;
  executionId: string;
};

/**
 * Payload emitted for tool:start and tool:end events.
 * Always includes both `tool` and `toolName` for backward compatibility.
 */
export type ToolEventPayload = {
  tool: string;
  toolName: string;
  input?: unknown;
  result?: unknown;
  error?: string;
  success?: boolean;
  responseTime?: number;
  timestamp?: number;
  duration?: number;
  executionId?: string;
};

/**
 * Tool execution summary for completed executions
 */
export type ToolExecutionSummary = {
  tool: string;
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  result?: unknown;
  error?: string;
  executionId: string;
  metadata?: {
    serverId?: string;
    toolCategory?: "direct" | "custom" | "mcp";
    isExternal?: boolean;
  };
};

/**
 * Tool definition type
 */
export type ToolDefinition<TArgs = ToolArgs, TResult = JsonValue> = {
  description: string;
  parameters?: ToolParameterSchema;
  metadata?: ToolMetadata;
  execute: (
    params: TArgs,
    context?: ToolContext,
  ) => Promise<ToolResult<TResult>> | ToolResult<TResult>;
};

/**
 * Simple tool type (for SDK)
 */
export type SimpleTool<TArgs = ToolArgs, TResult = JsonValue> = {
  description: string;
  parameters?: ZodUnknownSchema;
  metadata?: ToolMetadata;
  execute: (params: TArgs, context?: ToolContext) => Promise<TResult>;
};

/**
 * Simple tool type accepted by the SDK registerTool() helper. Uses
 * SDKToolContext (richer tool context with request metadata).
 */
export type SdkSimpleTool<TArgs = ToolArgs, TResult = JsonValue> = Omit<
  SimpleTool<TArgs, TResult>,
  "execute"
> & {
  description: string;
  parameters?: ZodUnknownSchema;
  execute: (params: TArgs, context?: SDKToolContext) => Promise<TResult>;
  metadata?: {
    category?: string;
    version?: string;
    author?: string;
    tags?: string[];
    documentation?: string;
    [key: string]: JsonValue | undefined;
  };
};

// =============================================================================
// DIRECT TOOLS CATEGORIES (from agent/directTools.ts)
// =============================================================================

/** Subset of directAgentTools exposing only the "basic" category. */
export type BasicToolsMap = {
  getCurrentTime: Tool;
  calculateMath: Tool;
};

/** Subset of directAgentTools exposing only the "filesystem" category. */
export type FilesystemToolsMap = {
  readFile: Tool;
  listDirectory: Tool;
  writeFile: Tool;
};

/** Subset of directAgentTools exposing the "utility" category. */
export type UtilityToolsMap = {
  getCurrentTime: Tool;
  calculateMath: Tool;
  listDirectory: Tool;
};

/** Full directAgentTools map, with the opt-in bashTool appended. */
export type AllToolsMap = {
  getCurrentTime: Tool;
  calculateMath: Tool;
  readFile: Tool;
  listDirectory: Tool;
  writeFile: Tool;
  executeBashCommand?: Tool;
};

/**
 * Tool registry entry
 */
export type ToolRegistryEntry = {
  name: string;
  description: string;
  serverId?: string;
  isImplemented?: boolean;
  parameters?: ToolParameterSchema;
  execute?: ToolDefinition["execute"];
};

/**
 * Tool execution information
 */
export type ToolExecution = {
  toolName: string;
  params: ToolArgs;
  result: ToolResult;
  executionTime: number;
  timestamp: number;
};

/**
 * Pending tool execution type for Redis memory manager
 * Temporary storage for tool execution data to avoid race conditions
 */
export type PendingToolExecution = {
  toolCalls: Array<{
    toolCallId?: string;
    toolName?: string;
    args?: Record<string, unknown>;
    timestamp?: Date;
    thoughtSignature?: string;
    stepIndex?: number;
    [key: string]: unknown;
  }>;
  toolResults: Array<{
    toolCallId?: string;
    toolName?: string;
    output?: unknown;
    result?: unknown;
    error?: string;
    timestamp?: Date;
    stepIndex?: number;
    [key: string]: unknown;
  }>;
  timestamp: number;
};

/**
 * Available tool information
 */
export type AvailableTool = {
  name: string;
  description: string;
  serverId?: string;
  toolName?: string;
  parameters?: ToolParameterSchema;
};

/**
 * Tool validation options
 */
export type ToolValidationOptions = {
  customValidator?: (
    toolName: string,
    params: ToolArgs,
  ) => boolean | Promise<boolean>;
  validateSchema?: boolean;
  allowUnknownProperties?: boolean;
};

/**
 * Tool call information (for AI SDK integration)
 */
export type ToolCall = {
  toolName: string;
  parameters: ToolArgs;
  id?: string;
};

/**
 * AI SDK Tool Call format (from Vercel AI SDK)
 */
export type AiSdkToolCall = {
  type: "tool-call";
  toolCallId: string;
  toolName: string;
  params: ToolArgs;
};

/**
 * Tool call result (for AI SDK integration)
 */
export type ToolCallResult = {
  id?: string;
  result: ToolResult;
  formattedForAI: string;
};

/**
 * Result of a validation operation
 * Contains validation status, errors, warnings, and suggestions for improvement
 */
export type EnhancedValidationResult = {
  /** Whether the validation passed without errors */
  isValid: boolean;
  /** Array of validation errors that must be fixed */
  errors: ValidationError[];
  /** Array of warning messages that should be addressed */
  warnings: string[];
  /** Array of suggestions to improve the validated object */
  suggestions: StringArray;
};

/**
 * Type guard for tool result
 */
export function isToolResult(value: unknown): value is ToolResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    typeof (value as ToolResult).success === "boolean"
  );
}

/**
 * Type guard for tool definition
 */
export function isToolDefinition(value: unknown): value is ToolDefinition {
  return (
    typeof value === "object" &&
    value !== null &&
    "description" in value &&
    "execute" in value &&
    typeof (value as ToolDefinition).description === "string" &&
    typeof (value as ToolDefinition).execute === "function"
  );
}

/**
 * Result shape returned by the built-in `bashTool` execute function in
 * `src/lib/agent/directTools.ts`. Centralised here per CLAUDE.md rule 2
 * so callers (incl. the mcp-bash test suite) don't need to declare a
 * local re-shaping of the runtime contract.
 */
export type BashToolResult = {
  success: boolean;
  code: number;
  stdout: string;
  stderr: string;
  error?: string;
};
