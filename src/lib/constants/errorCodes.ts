/**
 * Comprehensive Error Codes for NeuroLink
 *
 * Standard Format: CATEGORY_SPECIFIC_ERROR
 *
 * Each error code follows a consistent naming convention:
 * - UPPERCASE with underscores
 * - Category prefix followed by specific error description
 * - Clear, descriptive names for easy identification
 *
 * Categories and their purposes:
 *
 * @example TOOL_* - Tool execution and discovery errors
 * ```typescript
 * throw new NeuroLinkError({ code: ERROR_CODES.TOOL_NOT_FOUND, message: "Tool 'myTool' not found" });
 * ```
 *
 * @example PROVIDER_* - AI provider specific errors
 * ```typescript
 * throw new NeuroLinkError({ code: ERROR_CODES.PROVIDER_AUTH_FAILED, message: "Invalid API key" });
 * ```
 *
 * @example NETWORK_* - Network and connectivity errors
 * ```typescript
 * throw new NeuroLinkError({ code: ERROR_CODES.NETWORK_TIMEOUT, message: "Request timed out" });
 * ```
 *
 * @example AUTH_* - Authentication and authorization errors
 * ```typescript
 * throw new NeuroLinkError({ code: ERROR_CODES.AUTH_INVALID_CREDENTIALS, message: "Invalid credentials" });
 * ```
 *
 * @example VALIDATION_* - Input validation errors
 * ```typescript
 * throw new NeuroLinkError({ code: ERROR_CODES.VALIDATION_INVALID_PARAMETERS, message: "Invalid params" });
 * ```
 *
 * @example CONFIG_* - Configuration errors
 * ```typescript
 * throw new NeuroLinkError({ code: ERROR_CODES.CONFIG_MISSING, message: "Missing config field" });
 * ```
 *
 * @example MCP_* - MCP protocol errors
 * ```typescript
 * throw new NeuroLinkError({ code: ERROR_CODES.MCP_SERVER_NOT_FOUND, message: "MCP server not found" });
 * ```
 *
 * @example HITL_* - Human-in-the-loop errors
 * ```typescript
 * throw new NeuroLinkError({ code: ERROR_CODES.HITL_USER_REJECTED, message: "User rejected action" });
 * ```
 *
 * @example SYSTEM_* - System-level errors
 * ```typescript
 * throw new NeuroLinkError({ code: ERROR_CODES.SYSTEM_INTERNAL_ERROR, message: "Internal error" });
 * ```
 *
 * @example MEMORY_* - Memory management errors
 * ```typescript
 * throw new NeuroLinkError({ code: ERROR_CODES.MEMORY_EXHAUSTED, message: "Memory exhausted" });
 * ```
 *
 * Each error code has associated metadata in ERROR_CODE_METADATA including:
 * - category: Error classification (validation, execution, network, etc.)
 * - retriable: Whether the operation can be retried automatically
 * - severity: Priority level (low, medium, high, critical)
 * - httpStatusCode: Corresponding HTTP status code (when applicable)
 *
 * @see ERROR_CODE_METADATA for complete metadata definitions
 * @see ErrorFactory for convenient error creation methods
 * @see NeuroLinkError for the error class that uses these codes
 */

export const ERROR_CODES = {
  // ============================================================================
  // TOOL ERRORS (TOOL_*)
  // ============================================================================
  TOOL_NOT_FOUND: "TOOL_NOT_FOUND",
  TOOL_EXECUTION_FAILED: "TOOL_EXECUTION_FAILED",
  TOOL_TIMEOUT: "TOOL_TIMEOUT",
  TOOL_VALIDATION_FAILED: "TOOL_VALIDATION_FAILED",
  TOOL_DISCOVERY_FAILED: "TOOL_DISCOVERY_FAILED",
  TOOL_REGISTRATION_FAILED: "TOOL_REGISTRATION_FAILED",
  TOOL_DISABLED: "TOOL_DISABLED",
  TOOL_PARAMETER_INVALID: "TOOL_PARAMETER_INVALID",

  // ============================================================================
  // PROVIDER ERRORS (PROVIDER_*)
  // ============================================================================
  PROVIDER_NOT_AVAILABLE: "PROVIDER_NOT_AVAILABLE",
  PROVIDER_NOT_FOUND: "PROVIDER_NOT_FOUND",
  PROVIDER_AUTH_FAILED: "PROVIDER_AUTH_FAILED",
  PROVIDER_QUOTA_EXCEEDED: "PROVIDER_QUOTA_EXCEEDED",
  PROVIDER_RATE_LIMIT: "PROVIDER_RATE_LIMIT",
  PROVIDER_MODEL_INVALID: "PROVIDER_MODEL_INVALID",
  PROVIDER_MODEL_NOT_FOUND: "PROVIDER_MODEL_NOT_FOUND",
  PROVIDER_REQUEST_FAILED: "PROVIDER_REQUEST_FAILED",
  PROVIDER_RESPONSE_INVALID: "PROVIDER_RESPONSE_INVALID",
  PROVIDER_ENDPOINT_NOT_FOUND: "PROVIDER_ENDPOINT_NOT_FOUND",
  PROVIDER_SERVICE_UNAVAILABLE: "PROVIDER_SERVICE_UNAVAILABLE",
  PROVIDER_INTERNAL_ERROR: "PROVIDER_INTERNAL_ERROR",
  PROVIDER_THROTTLING: "PROVIDER_THROTTLING",

  // ============================================================================
  // NETWORK ERRORS (NETWORK_*)
  // ============================================================================
  NETWORK_ERROR: "NETWORK_ERROR",
  NETWORK_TIMEOUT: "NETWORK_TIMEOUT",
  NETWORK_CONNECTION_FAILED: "NETWORK_CONNECTION_FAILED",
  NETWORK_DNS_FAILED: "NETWORK_DNS_FAILED",
  NETWORK_UNREACHABLE: "NETWORK_UNREACHABLE",

  // ============================================================================
  // AUTHENTICATION/AUTHORIZATION ERRORS (AUTH_*)
  // ============================================================================
  AUTH_INVALID_CREDENTIALS: "AUTH_INVALID_CREDENTIALS",
  AUTH_MISSING_CREDENTIALS: "AUTH_MISSING_CREDENTIALS",
  AUTH_TOKEN_EXPIRED: "AUTH_TOKEN_EXPIRED",
  AUTH_TOKEN_INVALID: "AUTH_TOKEN_INVALID",
  AUTH_PERMISSION_DENIED: "AUTH_PERMISSION_DENIED",
  AUTH_UNAUTHORIZED: "AUTH_UNAUTHORIZED",

  // ============================================================================
  // VALIDATION ERRORS (VALIDATION_*)
  // ============================================================================
  VALIDATION_INVALID_PARAMETERS: "VALIDATION_INVALID_PARAMETERS",
  VALIDATION_MISSING_REQUIRED_PARAM: "VALIDATION_MISSING_REQUIRED_PARAM",
  VALIDATION_SCHEMA_ERROR: "VALIDATION_SCHEMA_ERROR",
  VALIDATION_TYPE_MISMATCH: "VALIDATION_TYPE_MISMATCH",
  VALIDATION_OUT_OF_RANGE: "VALIDATION_OUT_OF_RANGE",
  VALIDATION_INVALID_FORMAT: "VALIDATION_INVALID_FORMAT",

  // ============================================================================
  // CONFIGURATION ERRORS (CONFIG_*)
  // ============================================================================
  CONFIG_INVALID: "CONFIG_INVALID",
  CONFIG_MISSING: "CONFIG_MISSING",
  CONFIG_PARSE_ERROR: "CONFIG_PARSE_ERROR",
  CONFIG_FIELD_INVALID: "CONFIG_FIELD_INVALID",
  CONFIG_FIELD_MISSING: "CONFIG_FIELD_MISSING",

  // ============================================================================
  // MCP ERRORS (MCP_*)
  // ============================================================================
  MCP_SERVER_NOT_FOUND: "MCP_SERVER_NOT_FOUND",
  MCP_SERVER_CONNECTION_FAILED: "MCP_SERVER_CONNECTION_FAILED",
  MCP_SERVER_NOT_CONNECTED: "MCP_SERVER_NOT_CONNECTED",
  MCP_SERVER_REGISTRATION_FAILED: "MCP_SERVER_REGISTRATION_FAILED",
  MCP_CLIENT_CREATION_FAILED: "MCP_CLIENT_CREATION_FAILED",
  MCP_TRANSPORT_UNSUPPORTED: "MCP_TRANSPORT_UNSUPPORTED",
  MCP_TRANSPORT_CONFIG_INVALID: "MCP_TRANSPORT_CONFIG_INVALID",
  MCP_PROTOCOL_ERROR: "MCP_PROTOCOL_ERROR",

  // ============================================================================
  // HITL ERRORS (HITL_*)
  // ============================================================================
  HITL_USER_REJECTED: "HITL_USER_REJECTED",
  HITL_TIMEOUT: "HITL_TIMEOUT",
  HITL_CONFIGURATION_INVALID: "HITL_CONFIGURATION_INVALID",
  HITL_CONFIRMATION_FAILED: "HITL_CONFIRMATION_FAILED",

  // ============================================================================
  // SYSTEM ERRORS (SYSTEM_*)
  // ============================================================================
  SYSTEM_INTERNAL_ERROR: "SYSTEM_INTERNAL_ERROR",
  SYSTEM_OPERATION_FAILED: "SYSTEM_OPERATION_FAILED",
  SYSTEM_RESOURCE_EXHAUSTED: "SYSTEM_RESOURCE_EXHAUSTED",
  SYSTEM_TIMEOUT: "SYSTEM_TIMEOUT",

  // ============================================================================
  // MEMORY ERRORS (MEMORY_*)
  // ============================================================================
  MEMORY_EXHAUSTED: "MEMORY_EXHAUSTED",
  MEMORY_ALLOCATION_FAILED: "MEMORY_ALLOCATION_FAILED",
  MEMORY_STORAGE_FAILED: "MEMORY_STORAGE_FAILED",
  MEMORY_RETRIEVAL_FAILED: "MEMORY_RETRIEVAL_FAILED",

  // ============================================================================
  // GENERAL ERRORS
  // ============================================================================
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
  NOT_IMPLEMENTED: "NOT_IMPLEMENTED",
} as const;

/**
 * Type for error code values
 */
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/**
 * Error code metadata for categorization and handling
 */
export interface ErrorCodeMetadata {
  code: ErrorCode;
  category: string;
  retriable: boolean;
  severity: "low" | "medium" | "high" | "critical";
  httpStatusCode?: number;
}

/**
 * Mapping of error codes to their metadata
 */
export const ERROR_CODE_METADATA: Record<ErrorCode, ErrorCodeMetadata> = {
  // Tool errors
  TOOL_NOT_FOUND: {
    code: "TOOL_NOT_FOUND",
    category: "validation",
    retriable: false,
    severity: "medium",
    httpStatusCode: 404,
  },
  TOOL_EXECUTION_FAILED: {
    code: "TOOL_EXECUTION_FAILED",
    category: "execution",
    retriable: true,
    severity: "high",
  },
  TOOL_TIMEOUT: {
    code: "TOOL_TIMEOUT",
    category: "timeout",
    retriable: true,
    severity: "high",
  },
  TOOL_VALIDATION_FAILED: {
    code: "TOOL_VALIDATION_FAILED",
    category: "validation",
    retriable: false,
    severity: "medium",
  },
  TOOL_DISCOVERY_FAILED: {
    code: "TOOL_DISCOVERY_FAILED",
    category: "execution",
    retriable: true,
    severity: "medium",
  },
  TOOL_REGISTRATION_FAILED: {
    code: "TOOL_REGISTRATION_FAILED",
    category: "configuration",
    retriable: true,
    severity: "high",
  },
  TOOL_DISABLED: {
    code: "TOOL_DISABLED",
    category: "configuration",
    retriable: false,
    severity: "low",
  },
  TOOL_PARAMETER_INVALID: {
    code: "TOOL_PARAMETER_INVALID",
    category: "validation",
    retriable: false,
    severity: "medium",
  },

  // Provider errors
  PROVIDER_NOT_AVAILABLE: {
    code: "PROVIDER_NOT_AVAILABLE",
    category: "configuration",
    retriable: false,
    severity: "high",
    httpStatusCode: 503,
  },
  PROVIDER_NOT_FOUND: {
    code: "PROVIDER_NOT_FOUND",
    category: "configuration",
    retriable: false,
    severity: "high",
    httpStatusCode: 404,
  },
  PROVIDER_AUTH_FAILED: {
    code: "PROVIDER_AUTH_FAILED",
    category: "permission",
    retriable: false,
    severity: "critical",
    httpStatusCode: 401,
  },
  PROVIDER_QUOTA_EXCEEDED: {
    code: "PROVIDER_QUOTA_EXCEEDED",
    category: "resource",
    retriable: true,
    severity: "high",
    httpStatusCode: 429,
  },
  PROVIDER_RATE_LIMIT: {
    code: "PROVIDER_RATE_LIMIT",
    category: "resource",
    retriable: true,
    severity: "medium",
    httpStatusCode: 429,
  },
  PROVIDER_MODEL_INVALID: {
    code: "PROVIDER_MODEL_INVALID",
    category: "validation",
    retriable: false,
    severity: "medium",
    httpStatusCode: 400,
  },
  PROVIDER_MODEL_NOT_FOUND: {
    code: "PROVIDER_MODEL_NOT_FOUND",
    category: "validation",
    retriable: false,
    severity: "medium",
    httpStatusCode: 404,
  },
  PROVIDER_REQUEST_FAILED: {
    code: "PROVIDER_REQUEST_FAILED",
    category: "execution",
    retriable: true,
    severity: "high",
  },
  PROVIDER_RESPONSE_INVALID: {
    code: "PROVIDER_RESPONSE_INVALID",
    category: "execution",
    retriable: false,
    severity: "high",
  },
  PROVIDER_ENDPOINT_NOT_FOUND: {
    code: "PROVIDER_ENDPOINT_NOT_FOUND",
    category: "configuration",
    retriable: false,
    severity: "high",
    httpStatusCode: 404,
  },
  PROVIDER_SERVICE_UNAVAILABLE: {
    code: "PROVIDER_SERVICE_UNAVAILABLE",
    category: "network",
    retriable: true,
    severity: "high",
    httpStatusCode: 503,
  },
  PROVIDER_INTERNAL_ERROR: {
    code: "PROVIDER_INTERNAL_ERROR",
    category: "system",
    retriable: true,
    severity: "critical",
    httpStatusCode: 500,
  },
  PROVIDER_THROTTLING: {
    code: "PROVIDER_THROTTLING",
    category: "resource",
    retriable: true,
    severity: "medium",
    httpStatusCode: 429,
  },

  // Network errors
  NETWORK_ERROR: {
    code: "NETWORK_ERROR",
    category: "network",
    retriable: true,
    severity: "high",
  },
  NETWORK_TIMEOUT: {
    code: "NETWORK_TIMEOUT",
    category: "timeout",
    retriable: true,
    severity: "high",
    httpStatusCode: 408,
  },
  NETWORK_CONNECTION_FAILED: {
    code: "NETWORK_CONNECTION_FAILED",
    category: "network",
    retriable: true,
    severity: "high",
  },
  NETWORK_DNS_FAILED: {
    code: "NETWORK_DNS_FAILED",
    category: "network",
    retriable: true,
    severity: "high",
  },
  NETWORK_UNREACHABLE: {
    code: "NETWORK_UNREACHABLE",
    category: "network",
    retriable: true,
    severity: "high",
  },

  // Auth errors
  AUTH_INVALID_CREDENTIALS: {
    code: "AUTH_INVALID_CREDENTIALS",
    category: "permission",
    retriable: false,
    severity: "critical",
    httpStatusCode: 401,
  },
  AUTH_MISSING_CREDENTIALS: {
    code: "AUTH_MISSING_CREDENTIALS",
    category: "permission",
    retriable: false,
    severity: "critical",
    httpStatusCode: 401,
  },
  AUTH_TOKEN_EXPIRED: {
    code: "AUTH_TOKEN_EXPIRED",
    category: "permission",
    retriable: false,
    severity: "high",
    httpStatusCode: 401,
  },
  AUTH_TOKEN_INVALID: {
    code: "AUTH_TOKEN_INVALID",
    category: "permission",
    retriable: false,
    severity: "high",
    httpStatusCode: 401,
  },
  AUTH_PERMISSION_DENIED: {
    code: "AUTH_PERMISSION_DENIED",
    category: "permission",
    retriable: false,
    severity: "high",
    httpStatusCode: 403,
  },
  AUTH_UNAUTHORIZED: {
    code: "AUTH_UNAUTHORIZED",
    category: "permission",
    retriable: false,
    severity: "high",
    httpStatusCode: 401,
  },

  // Validation errors
  VALIDATION_INVALID_PARAMETERS: {
    code: "VALIDATION_INVALID_PARAMETERS",
    category: "validation",
    retriable: false,
    severity: "medium",
    httpStatusCode: 400,
  },
  VALIDATION_MISSING_REQUIRED_PARAM: {
    code: "VALIDATION_MISSING_REQUIRED_PARAM",
    category: "validation",
    retriable: false,
    severity: "medium",
    httpStatusCode: 400,
  },
  VALIDATION_SCHEMA_ERROR: {
    code: "VALIDATION_SCHEMA_ERROR",
    category: "validation",
    retriable: false,
    severity: "medium",
    httpStatusCode: 400,
  },
  VALIDATION_TYPE_MISMATCH: {
    code: "VALIDATION_TYPE_MISMATCH",
    category: "validation",
    retriable: false,
    severity: "medium",
    httpStatusCode: 400,
  },
  VALIDATION_OUT_OF_RANGE: {
    code: "VALIDATION_OUT_OF_RANGE",
    category: "validation",
    retriable: false,
    severity: "medium",
    httpStatusCode: 400,
  },
  VALIDATION_INVALID_FORMAT: {
    code: "VALIDATION_INVALID_FORMAT",
    category: "validation",
    retriable: false,
    severity: "medium",
    httpStatusCode: 400,
  },

  // Config errors
  CONFIG_INVALID: {
    code: "CONFIG_INVALID",
    category: "configuration",
    retriable: false,
    severity: "high",
    httpStatusCode: 400,
  },
  CONFIG_MISSING: {
    code: "CONFIG_MISSING",
    category: "configuration",
    retriable: false,
    severity: "high",
    httpStatusCode: 400,
  },
  CONFIG_PARSE_ERROR: {
    code: "CONFIG_PARSE_ERROR",
    category: "configuration",
    retriable: false,
    severity: "high",
    httpStatusCode: 400,
  },
  CONFIG_FIELD_INVALID: {
    code: "CONFIG_FIELD_INVALID",
    category: "configuration",
    retriable: false,
    severity: "medium",
    httpStatusCode: 400,
  },
  CONFIG_FIELD_MISSING: {
    code: "CONFIG_FIELD_MISSING",
    category: "configuration",
    retriable: false,
    severity: "medium",
    httpStatusCode: 400,
  },

  // MCP errors
  MCP_SERVER_NOT_FOUND: {
    code: "MCP_SERVER_NOT_FOUND",
    category: "configuration",
    retriable: false,
    severity: "medium",
    httpStatusCode: 404,
  },
  MCP_SERVER_CONNECTION_FAILED: {
    code: "MCP_SERVER_CONNECTION_FAILED",
    category: "network",
    retriable: true,
    severity: "high",
  },
  MCP_SERVER_NOT_CONNECTED: {
    code: "MCP_SERVER_NOT_CONNECTED",
    category: "network",
    retriable: true,
    severity: "high",
  },
  MCP_SERVER_REGISTRATION_FAILED: {
    code: "MCP_SERVER_REGISTRATION_FAILED",
    category: "execution",
    retriable: true,
    severity: "high",
  },
  MCP_CLIENT_CREATION_FAILED: {
    code: "MCP_CLIENT_CREATION_FAILED",
    category: "execution",
    retriable: true,
    severity: "high",
  },
  MCP_TRANSPORT_UNSUPPORTED: {
    code: "MCP_TRANSPORT_UNSUPPORTED",
    category: "configuration",
    retriable: false,
    severity: "high",
    httpStatusCode: 400,
  },
  MCP_TRANSPORT_CONFIG_INVALID: {
    code: "MCP_TRANSPORT_CONFIG_INVALID",
    category: "configuration",
    retriable: false,
    severity: "high",
    httpStatusCode: 400,
  },
  MCP_PROTOCOL_ERROR: {
    code: "MCP_PROTOCOL_ERROR",
    category: "execution",
    retriable: false,
    severity: "high",
  },

  // HITL errors
  HITL_USER_REJECTED: {
    code: "HITL_USER_REJECTED",
    category: "execution",
    retriable: false,
    severity: "low",
  },
  HITL_TIMEOUT: {
    code: "HITL_TIMEOUT",
    category: "timeout",
    retriable: false,
    severity: "medium",
  },
  HITL_CONFIGURATION_INVALID: {
    code: "HITL_CONFIGURATION_INVALID",
    category: "configuration",
    retriable: false,
    severity: "high",
    httpStatusCode: 400,
  },
  HITL_CONFIRMATION_FAILED: {
    code: "HITL_CONFIRMATION_FAILED",
    category: "execution",
    retriable: false,
    severity: "medium",
  },

  // System errors
  SYSTEM_INTERNAL_ERROR: {
    code: "SYSTEM_INTERNAL_ERROR",
    category: "system",
    retriable: true,
    severity: "critical",
    httpStatusCode: 500,
  },
  SYSTEM_OPERATION_FAILED: {
    code: "SYSTEM_OPERATION_FAILED",
    category: "system",
    retriable: true,
    severity: "high",
  },
  SYSTEM_RESOURCE_EXHAUSTED: {
    code: "SYSTEM_RESOURCE_EXHAUSTED",
    category: "resource",
    retriable: false,
    severity: "critical",
  },
  SYSTEM_TIMEOUT: {
    code: "SYSTEM_TIMEOUT",
    category: "timeout",
    retriable: true,
    severity: "high",
    httpStatusCode: 408,
  },

  // Memory errors
  MEMORY_EXHAUSTED: {
    code: "MEMORY_EXHAUSTED",
    category: "resource",
    retriable: false,
    severity: "critical",
  },
  MEMORY_ALLOCATION_FAILED: {
    code: "MEMORY_ALLOCATION_FAILED",
    category: "resource",
    retriable: false,
    severity: "critical",
  },
  MEMORY_STORAGE_FAILED: {
    code: "MEMORY_STORAGE_FAILED",
    category: "execution",
    retriable: true,
    severity: "high",
  },
  MEMORY_RETRIEVAL_FAILED: {
    code: "MEMORY_RETRIEVAL_FAILED",
    category: "execution",
    retriable: true,
    severity: "medium",
  },

  // General errors
  UNKNOWN_ERROR: {
    code: "UNKNOWN_ERROR",
    category: "system",
    retriable: false,
    severity: "high",
    httpStatusCode: 500,
  },
  NOT_IMPLEMENTED: {
    code: "NOT_IMPLEMENTED",
    category: "system",
    retriable: false,
    severity: "medium",
    httpStatusCode: 501,
  },
};
