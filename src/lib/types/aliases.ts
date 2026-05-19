/**
 * Comprehensive Type Alias Library
 * Centralizes commonly used complex types to improve readability and maintainability
 */

import type { ZodTypeAny } from "zod";
import type { JsonValue, Result, AsyncFunction } from "./common.js";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { Schema } from "./tools.js";

// ============================================================================
// ZOD TYPE ALIASES
// ============================================================================

/**
 * Type alias for complex Zod schema type to improve readability
 * Used across providers and validation systems
 * Using ZodTypeAny to prevent infinite type recursion in zod-to-json-schema
 */
export type ZodUnknownSchema = ZodTypeAny;

/**
 * Bridges Zod 4 schema types to the zod-to-json-schema library which still
 * types against Zod 3 (`zod/v3`). Zod 4 schemas are structurally compatible
 * at runtime but not assignable at the type level, so call sites must cast
 * through `unknown` to this type at the third-party boundary.
 */
export type ZodToJsonSchemaInput = Parameters<typeof zodToJsonSchema>[0];

/**
 * Dialects accepted by Zod 4's native `z.toJSONSchema(schema, { target })`.
 * Note the `.` in `"openapi-3.0"`: this differs from the `zod-to-json-schema`
 * package's `"openApi3"` form. The schemaConversion helper maps between the
 * two so internal call sites can use a single `"openApi3"` identifier.
 */
export type Zod4NativeTarget = "draft-07" | "openapi-3.0";

/**
 * Subset of Zod 4's `ToJSONSchemaParams` we forward through. Kept minimal so
 * the type stays stable even if Zod 4 grows the surface in future releases.
 */
export type Zod4NativeParams = { target?: Zod4NativeTarget };

/**
 * Union type for schema validation (Zod or AI SDK schema)
 * Commonly used in provider interfaces and validation functions
 */
export type ValidationSchema = ZodUnknownSchema | Schema<unknown>;

/**
 * Optional validation schema type
 * Used in optional schema parameters across the codebase
 */
export type OptionalValidationSchema = ValidationSchema | undefined;

// ============================================================================
// RECORD AND OBJECT TYPE ALIASES
// ============================================================================

/**
 * Standard unknown record type for flexible object structures
 * Most commonly used record type across the codebase
 */
export type StandardRecord = Record<string, unknown>;

/**
 * String-valued record for configuration and metadata
 * Common in environment variables and config objects
 */
export type StringRecord = Record<string, string>;

/**
 * Number-valued record for metrics and counters
 * Used in performance monitoring and statistics
 */
export type NumberRecord = Record<string, number>;

/**
 * Boolean-valued record for feature flags and settings
 * Common in configuration and capability objects
 */
export type BooleanRecord = Record<string, boolean>;

/**
 * Mixed primitive record for configuration objects
 * Allows string, number, boolean values
 */
export type PrimitiveRecord = Record<string, string | number | boolean>;

/**
 * JSON-safe record type for API communication
 * Ensures values are JSON-serializable
 */
export type JsonRecord = Record<string, JsonValue>;

/**
 * Optional record types for flexible parameters
 */
export type OptionalStandardRecord = StandardRecord | undefined;
export type OptionalStringRecord = StringRecord | undefined;
export type OptionalJsonRecord = JsonRecord | undefined;

// ============================================================================
// FUNCTION TYPE ALIASES
// ============================================================================

/**
 * Tool execution function with context
 * Standard pattern for MCP tool execution
 */
export type ToolExecutionFunction<TParams = unknown, TResult = unknown> = (
  params: TParams,
  context?: StandardRecord,
) => Promise<TResult>;

/**
 * Event handler function type
 * Common in event-driven architectures
 */
export type EventHandler<TEvent = unknown> = (
  event: TEvent,
) => void | Promise<void>;

/**
 * Async event handler function type
 */
export type AsyncEventHandler<TEvent = unknown> = (
  event: TEvent,
) => Promise<void>;

/**
 * Validation function type
 * Common pattern for input validation
 */
export type ValidationFunction<T = unknown> = (value: T) => boolean;

/**
 * Transformation function type
 * Common in data processing pipelines
 */
export type TransformFunction<TInput = unknown, TOutput = unknown> = (
  input: TInput,
) => TOutput;

/**
 * Async transformation function type
 */
export type AsyncTransformFunction<TInput = unknown, TOutput = unknown> = (
  input: TInput,
) => Promise<TOutput>;

// ============================================================================
// ARRAY AND COLLECTION TYPE ALIASES
// ============================================================================

/**
 * Array of standard records
 * Common in data collections
 */
export type RecordArray = StandardRecord[];

/**
 * String array type
 * Very common for lists of identifiers, names, etc.
 */
export type StringArray = string[];

/**
 * Number array type
 * Common for metrics, coordinates, etc.
 */
export type NumberArray = number[];

/**
 * Optional array types
 */
export type OptionalStringArray = StringArray | undefined;
export type OptionalRecordArray = RecordArray | undefined;

// ============================================================================
// PROVIDER AND API TYPE ALIASES
// ============================================================================

// ProviderConfig removed — use ProviderRuntimeConfig (config.ts) or IndividualProviderConfig (providers.ts)

/**
 * API response structure
 * Standard response format across providers
 */
export type ApiResponse<TData = unknown> = {
  success: boolean;
  data?: TData;
  error?: string;
  metadata?: StandardRecord;
};

/**
 * Async API response type
 */
export type AsyncApiResponse<TData = unknown> = Promise<ApiResponse<TData>>;

/**
 * Paginated response structure
 * Common in list APIs
 */
export type PaginatedResponse<TData = unknown> = ApiResponse<TData> & {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
  };
};

// ============================================================================
// EXECUTION CONTEXT TYPE ALIASES
// ============================================================================

/**
 * Basic execution context
 * Minimal context for tool execution
 */
export type BasicContext = {
  sessionId?: string;
  userId?: string;
  timestamp?: number;
};

/**
 * Enhanced execution context
 * Extended context with additional metadata
 */
export type EnhancedContext = BasicContext & {
  requestId?: string;
  metadata?: StandardRecord;
  timeout?: number;
};

// ToolContext removed — use ToolContext from tools.ts (canonical)

// ============================================================================
// ERROR AND RESULT TYPE ALIASES
// ============================================================================

/**
 * Standard error structure
 * Consistent error format across the codebase
 */
export type StandardError = {
  message: string;
  code?: string;
  details?: StandardRecord;
  stack?: string;
};

/**
 * Async result type
 */
export type AsyncResult<TData = unknown, TError = StandardError> = Promise<
  Result<TData, TError>
>;

/**
 * Operation result with metadata
 * Enhanced result type with additional context
 */
export type OperationResult<TData = unknown> = Result<TData> & {
  duration?: number;
  metadata?: StandardRecord;
};

// ============================================================================
// UTILITY TYPE ALIASES
// ============================================================================

/**
 * Nullable type alias
 * Common pattern for optional values
 */
export type Nullable<T> = T | null;

/**
 * Optional type alias (more explicit than T | undefined)
 */
export type Optional<T> = T | undefined;

/**
 * Maybe type (combines null and undefined)
 */
export type Maybe<T> = T | null | undefined;

/**
 * Non-empty string type
 * Useful for validated string inputs
 */
export type NonEmptyString = string & { readonly __brand: unique symbol };

/**
 * Positive number type
 * Useful for validated numeric inputs
 */
export type PositiveNumber = number & { readonly __brand: unique symbol };

/**
 * Timestamp type (number representing milliseconds since epoch)
 */
export type Timestamp = number & { readonly __brand: unique symbol };

/**
 * ID type for entity identifiers
 */
export type EntityId = string & { readonly __brand: unique symbol };

// ============================================================================
// CONFIGURATION TYPE ALIASES
// ============================================================================

/**
 * Feature flag configuration
 * Common structure for feature toggles
 */
export type FeatureConfig = BooleanRecord & {
  enabled?: boolean;
  metadata?: StandardRecord;
};

/**
 * Service configuration
 * Standard structure for service settings
 */
export type ServiceConfig = {
  enabled?: boolean;
  timeout?: number;
  retries?: number;
  endpoint?: string;
  apiKey?: string;
  metadata?: StandardRecord;
};

// RateLimitConfig removed — use TokenBucketRateLimitConfig (mcp.ts) or ServerRateLimitConfig (server.ts)

// ============================================================================
// SPECIFIC RETURN TYPE PATTERNS
// ============================================================================

/**
 * Simple success/error result (different from generic OperationResult)
 * Used for basic operation feedback without data payload
 */
export type SimpleResult = {
  success: boolean;
  error?: string;
};

/**
 * Connectivity test result for providers
 * Standard format for testing provider connections
 */
export type ConnectivityResult = {
  success: boolean;
  error?: string;
};

/**
 * Connection result with latency information
 * Used for detailed connection testing with performance metrics
 */
export type ConnectionResult = {
  connected: boolean;
  latency?: number;
  error?: string;
};

/**
 * Provider pair result for fallback configurations
 * Used when creating primary/fallback provider setups
 */
export type ProviderPairResult<T = unknown> = {
  primary: T;
  fallback: T;
};

/**
 * Tool execution result with enhanced prompt
 * Common pattern in tool orchestration scenarios
 */
export type OrchestrationResult = {
  toolResults: unknown[];
  enhancedPrompt: string;
};

/**
 * Batch operation result with count and errors
 * Standard pattern for operations that process multiple items
 */
export type BatchOperationResult = {
  success: boolean;
  error?: string;
  toolCount?: number;
};

/**
 * Server loading result with detailed feedback
 * Used when loading multiple servers with error tracking
 */
export type ServerLoadResult = {
  serversLoaded: number;
  errors: string[];
};

/**
 * Transport connection result for MCP operations
 * Standard format for MCP transport establishment
 * Note: Using proper types instead of unknown to fix TypeScript compilation
 */
export type TransportResult = {
  transport: unknown; // MCP Transport type - using unknown to avoid circular imports
  process?: unknown; // Node.js ChildProcess type - using unknown to avoid circular imports
};

/**
 * Transport result with required process (for stdio transport)
 * Used when process is guaranteed to be present
 */
export type TransportWithProcessResult = {
  transport: unknown;
  process: unknown;
};

/**
 * Transport result without process (for network transports)
 * Used for SSE and WebSocket transports that don't spawn processes
 */
export type NetworkTransportResult = {
  transport: unknown;
};

// ============================================================================
// EXPORTS FOR BACKWARDS COMPATIBILITY
// ============================================================================

/**
 * Re-export commonly used types from other modules
 * Provides one-stop shop for type imports
 */
export type { JsonValue, JsonObject } from "./common.js";

// ============================================================================
// TYPE GUARDS AND UTILITIES
// ============================================================================

/**
 * Type guard for checking if value is a StandardRecord
 *
 * @param value - Value to check
 * @returns True if value is a non-null object (but not an array)
 *
 * @example
 * ```typescript
 * if (isStandardRecord(data)) {
 *   // TypeScript now knows data is Record<string, unknown>
 *   console.log(data.someProperty);
 * }
 * ```
 */
export function isStandardRecord(value: unknown): value is StandardRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Type guard for checking if value is a JsonRecord
 */
export function isJsonRecord(value: unknown): value is JsonRecord {
  return (
    isStandardRecord(value) &&
    Object.values(value).every(
      (val) =>
        val === null ||
        typeof val === "string" ||
        typeof val === "number" ||
        typeof val === "boolean" ||
        Array.isArray(val) ||
        isJsonRecord(val),
    )
  );
}

/**
 * Type guard for checking if value is a StringArray
 */
export function isStringArray(value: unknown): value is StringArray {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

/**
 * Type guard for checking if value is an AsyncFunction
 */
export function isAsyncFunction(value: unknown): value is AsyncFunction {
  return typeof value === "function";
}
