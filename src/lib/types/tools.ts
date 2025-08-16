/**
 * Type definitions for NeuroLink tool system, including parameter schemas,
 * argument patterns, execution metadata, context, and result types.
 */

import { z } from "zod";
import type {
  Result,
  FunctionParameters,
  UnknownRecord,
  JsonValue,
  ErrorInfo,
} from "./common.js";

/**
 * Commonly used Zod schema type aliases for cleaner type declarations
 */
import type { ZodUnknownSchema } from "./typeAliases.js";
export type { ZodUnknownSchema } from "./typeAliases.js";
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
export interface BaseToolArgs {
  [key: string]: JsonValue | undefined;
}

/**
 * Tool execution arguments with specific common patterns
 */
export interface ToolArgs extends BaseToolArgs {
  // Common parameter patterns
  input?: JsonValue;
  data?: JsonValue;
  options?: JsonValue;
}

/**
 * Tool execution metadata
 */
export interface ToolExecutionMetadata {
  requestId?: string;
  startTime?: number;
  version?: string;
  [key: string]: JsonValue | undefined;
}

/**
 * Tool execution context
 */
export interface ToolContext {
  sessionId?: string;
  userId?: string;
  aiProvider?: string;
  metadata?: ToolExecutionMetadata;
}

/**
 * Tool execution result metadata
 */
export interface ToolResultMetadata {
  toolName?: string;
  executionTime?: number;
  timestamp?: number;
  source?: string;
  version?: string;
  serverId?: string;
}

/**
 * Tool execution result
 */
export interface ToolResult<T = JsonValue> extends Result<T, ErrorInfo> {
  success: boolean;
  data?: T;
  error?: ErrorInfo;
  metadata?: ToolResultMetadata;
}

/**
 * Tool metadata for registration
 */
export interface ToolMetadata {
  category?: string;
  version?: string;
  author?: string;
  tags?: string[];
  documentation?: string;
  [key: string]: JsonValue | undefined;
}

/**
 * Tool definition interface
 */
export interface ToolDefinition<TArgs = ToolArgs, TResult = JsonValue> {
  description: string;
  parameters?: ToolParameterSchema;
  metadata?: ToolMetadata;
  execute: (
    params: TArgs,
    context?: ToolContext,
  ) => Promise<ToolResult<TResult>> | ToolResult<TResult>;
}

/**
 * Simple tool interface (for SDK)
 */
export interface SimpleTool<TArgs = ToolArgs, TResult = JsonValue> {
  description: string;
  parameters?: ZodUnknownSchema;
  metadata?: ToolMetadata;
  execute: (params: TArgs, context?: ToolContext) => Promise<TResult>;
}

/**
 * Tool registry entry
 */
export interface ToolRegistryEntry {
  name: string;
  description: string;
  serverId?: string;
  isImplemented?: boolean;
  parameters?: ToolParameterSchema;
  execute?: ToolDefinition["execute"];
}

/**
 * Tool execution information
 */
export interface ToolExecution {
  toolName: string;
  params: ToolArgs;
  result: ToolResult;
  executionTime: number;
  timestamp: number;
}

/**
 * Available tool information
 */
export interface AvailableTool {
  name: string;
  description: string;
  serverId?: string;
  toolName?: string;
  parameters?: ToolParameterSchema;
}

/**
 * Tool validation options
 */
export interface ToolValidationOptions {
  customValidator?: (
    toolName: string,
    params: ToolArgs,
  ) => boolean | Promise<boolean>;
  validateSchema?: boolean;
  allowUnknownProperties?: boolean;
}

/**
 * Tool call information (for AI SDK integration)
 */
export interface ToolCall {
  toolName: string;
  parameters: ToolArgs;
  id?: string;
}

/**
 * AI SDK Tool Call format (from Vercel AI SDK)
 */
export interface AiSdkToolCall {
  type: "tool-call";
  toolCallId: string;
  toolName: string;
  params: ToolArgs;
}

/**
 * Tool call result (for AI SDK integration)
 */
export interface ToolCallResult {
  id?: string;
  result: ToolResult;
  formattedForAI: string;
}

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
