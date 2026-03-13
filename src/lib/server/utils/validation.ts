/**
 * Request Validation Utilities
 * Provides Zod schemas and validation helpers for server routes
 */

import { z } from "zod";

// ============================================
// Validation Schemas
// ============================================

/**
 * Agent execute request schema
 */
export const AgentExecuteRequestSchema = z.object({
  input: z.union([
    z.string(),
    z.object({
      text: z.string(),
      images: z.array(z.string()).optional(),
      files: z.array(z.string()).optional(),
    }),
  ]),
  provider: z.string().optional(),
  model: z.string().optional(),
  systemPrompt: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
  tools: z.array(z.string()).optional(),
  stream: z.boolean().optional(),
  sessionId: z.string().optional(),
  userId: z.string().optional(),
});

/**
 * Tool execute request schema
 */
export const ToolExecuteRequestSchema = z.object({
  name: z.string().min(1, "Tool name is required"),
  arguments: z.record(z.unknown()).default({}),
  sessionId: z.string().optional(),
  userId: z.string().optional(),
});

/**
 * Tool arguments schema (for direct tool execution)
 */
export const ToolArgumentsSchema = z.record(z.unknown());

/**
 * Memory session ID parameter schema
 */
export const SessionIdParamSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
});

/**
 * MCP server name parameter schema
 */
export const ServerNameParamSchema = z.object({
  name: z.string().min(1, "Server name is required"),
});

/**
 * Tool name parameter schema
 */
export const ToolNameParamSchema = z.object({
  name: z.string().min(1, "Tool name is required"),
});

/**
 * Tool search query schema
 */
export const ToolSearchQuerySchema = z.object({
  q: z.string().optional(),
  source: z.string().optional(),
  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().positive().max(100))
    .optional(),
});

/**
 * Generic ID parameter schema (for session endpoints using :id)
 */
export const IdParamSchema = z.object({
  id: z.string().min(1, "Session ID is required"),
});

/**
 * Sessions list query schema (with optional pagination and filtering)
 */
export const SessionsListQuerySchema = z.object({
  userId: z.string().optional(),
  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().positive().max(100))
    .optional(),
  offset: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().nonnegative())
    .optional(),
});

/**
 * Session messages query schema (for pagination)
 */
export const SessionMessagesQuerySchema = z.object({
  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().positive().max(100))
    .optional(),
  offset: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().nonnegative())
    .optional(),
});

/**
 * Embed request schema (single text)
 */
export const EmbedRequestSchema = z.object({
  text: z.string().min(1, "Text is required"),
  provider: z.string().optional(),
  model: z.string().optional(),
});

/**
 * Embed many request schema (batch texts)
 */
export const EmbedManyRequestSchema = z.object({
  texts: z
    .array(z.string().min(1))
    .min(1, "At least one text is required")
    .max(2048, "Maximum 2048 texts per batch"),
  provider: z.string().optional(),
  model: z.string().optional(),
});

// ============================================
// Error Response Types
// ============================================

/**
 * Standardized error response format
 */
export type ErrorResponse = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  metadata?: {
    timestamp: string;
    requestId?: string;
  };
  httpStatus?: number;
};

/**
 * Type guard to check if a value is an ErrorResponse
 */
export function isErrorResponse(value: unknown): value is ErrorResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof (value as ErrorResponse).error === "object" &&
    (value as ErrorResponse).error !== null &&
    "code" in (value as ErrorResponse).error &&
    "message" in (value as ErrorResponse).error
  );
}

/**
 * Get default HTTP status code based on error code
 */
function getDefaultHttpStatus(code: string): number {
  const statusMap: Record<string, number> = {
    VALIDATION_ERROR: 400,
    SCHEMA_ERROR: 400,
    TOOL_NOT_FOUND: 404,
    SERVER_NOT_FOUND: 404,
    SESSION_NOT_FOUND: 404,
    NOT_FOUND: 404,
    AUTH_REQUIRED: 401,
    AUTH_INVALID: 401,
    FORBIDDEN: 403,
    RATE_LIMIT_EXCEEDED: 429,
    MCP_UNAVAILABLE: 503,
    MEMORY_UNAVAILABLE: 503,
    EXECUTION_FAILED: 500,
    INTERNAL_ERROR: 500,
  };
  return statusMap[code] ?? 500;
}

// ============================================
// Validation Helpers
// ============================================

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  code: string,
  message: string,
  details?: unknown,
  requestId?: string,
  httpStatus?: number,
): ErrorResponse {
  return {
    error: {
      code,
      message,
      details,
    },
    metadata: {
      timestamp: new Date().toISOString(),
      requestId,
    },
    httpStatus: httpStatus ?? getDefaultHttpStatus(code),
  };
}

/**
 * Validation result type
 */
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: ErrorResponse };

/**
 * Validate request body against a Zod schema
 */
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  requestId?: string,
): ValidationResult<T> {
  const result = schema.safeParse(data);

  if (!result.success) {
    return {
      success: false,
      error: createErrorResponse(
        "VALIDATION_ERROR",
        "Invalid request body",
        result.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
          code: issue.code,
        })),
        requestId,
      ),
    };
  }

  return {
    success: true,
    data: result.data,
  };
}

/**
 * Validate query parameters against a Zod schema
 */
export function validateQuery<T>(
  schema: z.ZodSchema<T>,
  query: Record<string, string>,
  requestId?: string,
): ValidationResult<T> {
  const result = schema.safeParse(query);

  if (!result.success) {
    return {
      success: false,
      error: createErrorResponse(
        "VALIDATION_ERROR",
        "Invalid query parameters",
        result.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
          code: issue.code,
        })),
        requestId,
      ),
    };
  }

  return {
    success: true,
    data: result.data,
  };
}

/**
 * Validate path parameters against a Zod schema
 */
export function validateParams<T>(
  schema: z.ZodSchema<T>,
  params: Record<string, string>,
  requestId?: string,
): ValidationResult<T> {
  const result = schema.safeParse(params);

  if (!result.success) {
    return {
      success: false,
      error: createErrorResponse(
        "VALIDATION_ERROR",
        "Invalid path parameters",
        result.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
          code: issue.code,
        })),
        requestId,
      ),
    };
  }

  return {
    success: true,
    data: result.data,
  };
}
