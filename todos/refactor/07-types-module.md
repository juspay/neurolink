# Types Module Refactoring

**Status**: `[ ]` Not started  
**Priority**: 🔴 High  
**Estimated Effort**: 3-4 hours  
**Prerequisites**: 01-global-imports.md must be completed

## Objective

Refactor the types module (`src/lib/types/`) to achieve strict TypeScript compliance, consolidate type definitions, eliminate duplicate types, and create a comprehensive type system that serves as the foundation for all other modules.

## Files to Modify

### Core Type Files

- `src/lib/types/common.ts` - Common utility types
- `src/lib/types/ai.ts` - AI-related types
- `src/lib/types/conversation.ts` - Conversation types
- `src/lib/types/analytics.ts` - Analytics types
- `src/lib/types/index.ts` - Type exports

### New Type Files to Create

- `src/lib/types/errors.ts` - Error handling types
- `src/lib/types/events.ts` - Event system types

## Step-by-Step Instructions

### Step 1: Backup and Setup

```bash
# Create feature branch
git checkout -b refactor/types-module
git add -A
git commit -m "Backup before types module refactor"
```

### Step 2: Create Common Utility Types

**File**: `src/lib/types/common.ts`

```typescript
// Core utility types that other modules depend on

// JSON-safe value types
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;
export type JsonObject = { [Key in string]?: JsonValue };
export type JsonArray = Array<JsonValue>;

// Flexible record types
export type UnknownRecord = Record<string, unknown>;
export type StringRecord = Record<string, string>;
export type AnyRecord = Record<string, any>; // Use sparingly, prefer UnknownRecord

// Async utilities
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;
export type Result<T, E = Error> =
  | { success: true; data: T; error?: never }
  | { success: false; data?: never; error: E };

// Callback types
export type Callback<T = void> = (value: T) => void;
export type AsyncCallback<T = void> = (value: T) => Promise<void>;
export type ErrorCallback = (error: Error) => void;

// Utility types for object manipulation
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type Required<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type Nullable<T> = T | null;
export type Maybe<T> = T | undefined;

// ID types
export type ID = string;
export type UUID = string;
export type Timestamp = number;

// Status and state types
export type Status = "idle" | "loading" | "success" | "error";
export type ReadyState = "connecting" | "open" | "closing" | "closed";

// HTTP-related types
export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "DELETE"
  | "PATCH"
  | "HEAD"
  | "OPTIONS";
export type HttpStatusCode = number;
export type HttpHeaders = Record<string, string>;

// Environment types
export type Environment = "development" | "staging" | "production" | "test";
export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

// Feature flags and configuration
export type FeatureFlag = boolean;
export type FeatureFlags = Record<string, FeatureFlag>;

// Pagination types
export type PaginationParams = {
  page: number;
  limit: number;
  offset?: number;
};

export type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
};

// Validation types
export type ValidationRule<T = unknown> = (value: T) => boolean | string;
export type ValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

// Time and duration types
export type Duration = number; // milliseconds
export type TimeUnit = "ms" | "s" | "m" | "h" | "d";

// File and path types
export type FilePath = string;
export type FileExtension = string;
export type MimeType = string;

// Configuration types
export type ConfigValue =
  | string
  | number
  | boolean
  | ConfigObject
  | ConfigArray;
export type ConfigObject = { [key: string]: ConfigValue };
export type ConfigArray = ConfigValue[];

// Event types (basic)
export type EventHandler<T = unknown> = (event: T) => void;
export type AsyncEventHandler<T = unknown> = (event: T) => Promise<void>;

// Metrics and monitoring
export type MetricValue = number;
export type MetricType = "counter" | "gauge" | "histogram" | "summary";
export type MetricLabels = Record<string, string>;

// Version and compatibility
export type SemanticVersion = string; // e.g., "1.2.3"
export type ApiVersion = string; // e.g., "v1", "2023-10-01"

// Generic utility functions
export type Predicate<T> = (value: T) => boolean;
export type Transform<T, U> = (value: T) => U;
export type Mapper<T, U> = (value: T, index: number) => U;
export type Reducer<T, U> = (accumulator: U, current: T, index: number) => U;

// Type guards helpers
export type TypeGuard<T> = (value: unknown) => value is T;
export type AssertionFunction<T> = (value: unknown) => asserts value is T;

// Branding types (for nominal typing)
export type Brand<T, B> = T & { readonly __brand: B };

// Common branded types
export type UserId = Brand<string, "UserId">;
export type SessionId = Brand<string, "SessionId">;
export type ApiKey = Brand<string, "ApiKey">;
export type Token = Brand<string, "Token">;

// Function utilities
export type AnyFunction = (...args: any[]) => any;
export type VoidFunction = () => void;
export type AsyncVoidFunction = () => Promise<void>;

// Class utilities
export type Constructor<T = {}> = new (...args: any[]) => T;
export type AbstractConstructor<T = {}> = abstract new (...args: any[]) => T;

// Deep utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

// Array utilities
export type NonEmptyArray<T> = [T, ...T[]];
export type ArrayElement<T> = T extends readonly (infer U)[] ? U : never;

// Object key utilities
export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

export type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];

export type OptionalKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? K : never;
}[keyof T];

// Union utilities
export type UnionToIntersection<U> = (
  U extends any ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;

export type IsUnion<T> = [T] extends [UnionToIntersection<T>] ? false : true;

// Conditional utilities
export type If<C extends boolean, T, F> = C extends true ? T : F;
export type Not<T extends boolean> = T extends true ? false : true;
export type And<A extends boolean, B extends boolean> = A extends true
  ? B extends true
    ? true
    : false
  : false;
export type Or<A extends boolean, B extends boolean> = A extends true
  ? true
  : B extends true
    ? true
    : false;

// String utilities
export type Trim<S extends string> = S extends ` ${infer R}`
  ? Trim<R>
  : S extends `${infer L} `
    ? Trim<L>
    : S;

export type Split<
  S extends string,
  D extends string,
> = S extends `${infer L}${D}${infer R}` ? [L, ...Split<R, D>] : [S];

// Tuple utilities
export type Head<T extends readonly unknown[]> = T extends readonly [
  infer H,
  ...unknown[],
]
  ? H
  : never;
export type Tail<T extends readonly unknown[]> = T extends readonly [
  unknown,
  ...infer Rest,
]
  ? Rest
  : [];
export type Length<T extends readonly unknown[]> = T["length"];

// Function argument utilities
export type Parameters<T extends AnyFunction> = T extends (
  ...args: infer P
) => any
  ? P
  : never;
export type ReturnType<T extends AnyFunction> = T extends (
  ...args: any[]
) => infer R
  ? R
  : any;

// Promise utilities
export type Awaited<T> = T extends Promise<infer U> ? Awaited<U> : T;
export type PromiseType<T> = T extends Promise<infer U> ? U : T;

// Error handling
export type ErrorInfo = {
  message: string;
  code: string;
  details?: UnknownRecord;
  stack?: string;
  cause?: Error;
};

export type ErrorWithContext = Error & {
  context?: UnknownRecord;
  code?: string;
};

// Type assertion utilities
export function assertType<T>(
  value: unknown,
  guard: TypeGuard<T>,
): asserts value is T {
  if (!guard(value)) {
    throw new Error(`Type assertion failed`);
  }
}

export function isNonNull<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

export function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

export function isString(value: unknown): value is string {
  return typeof value === "string";
}

export function isNumber(value: unknown): value is number {
  return typeof value === "number" && !isNaN(value);
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

export function isObject(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

export function isFunction(value: unknown): value is AnyFunction {
  return typeof value === "function";
}
```

### Step 3: Create Error Types

**File**: `src/lib/types/errors.ts`

```typescript
import type { UnknownRecord, ErrorInfo } from "./common";

// Base error types
export type NeuroLinkErrorType =
  | "CONFIG_ERROR"
  | "PROVIDER_ERROR"
  | "NETWORK_ERROR"
  | "VALIDATION_ERROR"
  | "AUTH_ERROR"
  | "RATE_LIMIT_ERROR"
  | "TIMEOUT_ERROR"
  | "PARSE_ERROR"
  | "FILE_ERROR"
  | "PERMISSION_ERROR"
  | "INITIALIZATION_ERROR"
  | "INTERNAL_ERROR"
  | "USER_ERROR";

export type NeuroLinkErrorCode =
  // Configuration errors
  | "CONFIG_NOT_FOUND"
  | "CONFIG_INVALID"
  | "CONFIG_PARSE_ERROR"
  | "CONFIG_VALIDATION_FAILED"

  // Provider errors
  | "PROVIDER_NOT_FOUND"
  | "PROVIDER_DISABLED"
  | "PROVIDER_AUTH_FAILED"
  | "PROVIDER_RATE_LIMITED"
  | "PROVIDER_TIMEOUT"
  | "PROVIDER_UNAVAILABLE"
  | "MODEL_NOT_FOUND"
  | "MODEL_DEPRECATED"

  // Network errors
  | "NETWORK_UNREACHABLE"
  | "DNS_RESOLUTION_FAILED"
  | "CONNECTION_REFUSED"
  | "SSL_ERROR"
  | "PROXY_ERROR"

  // Validation errors
  | "REQUIRED_FIELD_MISSING"
  | "INVALID_TYPE"
  | "INVALID_FORMAT"
  | "OUT_OF_RANGE"
  | "DEPENDENCY_NOT_MET"

  // Authentication errors
  | "INVALID_API_KEY"
  | "TOKEN_EXPIRED"
  | "INSUFFICIENT_PERMISSIONS"
  | "AUTH_PROVIDER_ERROR"

  // Rate limiting
  | "QUOTA_EXCEEDED"
  | "RATE_LIMIT_EXCEEDED"
  | "CONCURRENT_LIMIT_EXCEEDED"

  // Timeouts
  | "REQUEST_TIMEOUT"
  | "RESPONSE_TIMEOUT"
  | "CONNECTION_TIMEOUT"

  // Parsing errors
  | "JSON_PARSE_ERROR"
  | "XML_PARSE_ERROR"
  | "YAML_PARSE_ERROR"
  | "RESPONSE_PARSE_ERROR"

  // File operations
  | "FILE_NOT_FOUND"
  | "FILE_READ_ERROR"
  | "FILE_WRITE_ERROR"
  | "DIRECTORY_NOT_FOUND"
  | "DISK_FULL"

  // Permissions
  | "ACCESS_DENIED"
  | "PERMISSION_DENIED"
  | "UNAUTHORIZED"
  | "FORBIDDEN"

  // Internal errors
  | "INITIALIZATION_FAILED"
  | "INTERNAL_STATE_ERROR"
  | "MEMORY_ERROR"
  | "THREAD_ERROR"
  | "UNKNOWN_ERROR";

export type NeuroLinkErrorSeverity = "low" | "medium" | "high" | "critical";

export type NeuroLinkErrorCategory =
  | "user_error" // User can fix
  | "config_error" // Configuration issue
  | "system_error" // System/environment issue
  | "service_error" // External service issue
  | "internal_error"; // NeuroLink bug

// Enhanced error information
export type NeuroLinkErrorInfo = ErrorInfo & {
  type: NeuroLinkErrorType;
  code: NeuroLinkErrorCode;
  severity: NeuroLinkErrorSeverity;
  category: NeuroLinkErrorCategory;
  timestamp: number;
  retryable: boolean;
  retryAfter?: number; // seconds
  helpUrl?: string;
  suggestions?: string[];
  context?: ErrorContext;
};

export type ErrorContext = {
  operation: string;
  component: string;
  provider?: string;
  model?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  environment: string;
  version: string;
  additionalInfo?: UnknownRecord;
};

// Specific error types for different modules
export type ConfigError = NeuroLinkErrorInfo & {
  type: "CONFIG_ERROR";
  configPath?: string;
  fieldPath?: string;
  validationErrors?: string[];
};

export type ProviderError = NeuroLinkErrorInfo & {
  type: "PROVIDER_ERROR";
  provider: string;
  model?: string;
  endpoint?: string;
  statusCode?: number;
  responseBody?: string;
  rateLimitInfo?: RateLimitInfo;
};

export type NetworkError = NeuroLinkErrorInfo & {
  type: "NETWORK_ERROR";
  endpoint: string;
  method: string;
  statusCode?: number;
  headers?: Record<string, string>;
  timeout?: number;
};

export type ValidationError = NeuroLinkErrorInfo & {
  type: "VALIDATION_ERROR";
  field: string;
  value: unknown;
  constraint: string;
  expectedType?: string;
};

export type AuthError = NeuroLinkErrorInfo & {
  type: "AUTH_ERROR";
  authMethod: string;
  provider?: string;
  tokenType?: string;
};

export type RateLimitInfo = {
  limit: number;
  remaining: number;
  resetAt: number;
  resetAfter: number;
  retryAfter: number;
};

// Error recovery types
export type ErrorRecoveryStrategy =
  | "retry"
  | "fallback"
  | "circuit_breaker"
  | "ignore"
  | "escalate"
  | "manual";

export type ErrorRecoveryAction = {
  strategy: ErrorRecoveryStrategy;
  maxRetries?: number;
  retryDelay?: number;
  backoffMultiplier?: number;
  fallbackProvider?: string;
  circuitBreakerThreshold?: number;
  escalationLevel?: "warn" | "error" | "critical";
};

export type ErrorRecoveryResult = {
  recovered: boolean;
  strategy: ErrorRecoveryStrategy;
  attempts: number;
  finalError?: NeuroLinkErrorInfo;
  recoveryTime: number;
};

// Error reporting types
export type ErrorReport = {
  id: string;
  timestamp: number;
  error: NeuroLinkErrorInfo;
  userAgent?: string;
  environment: string;
  version: string;
  frequency: number;
  firstOccurrence: number;
  lastOccurrence: number;
  affectedUsers: number;
  metadata?: UnknownRecord;
};

export type ErrorAggregation = {
  errorCode: NeuroLinkErrorCode;
  count: number;
  frequency: number;
  severity: NeuroLinkErrorSeverity;
  examples: ErrorReport[];
  trend: "increasing" | "decreasing" | "stable";
  impact: "low" | "medium" | "high" | "critical";
};

// Error handler types
export type ErrorHandler<T = unknown> = (
  error: NeuroLinkErrorInfo,
  context?: T,
) => void;
export type AsyncErrorHandler<T = unknown> = (
  error: NeuroLinkErrorInfo,
  context?: T,
) => Promise<void>;

export type ErrorHandlerOptions = {
  includeStack: boolean;
  logLevel: "debug" | "info" | "warn" | "error";
  reportToService: boolean;
  maxReports: number;
  aggregationWindow: number; // milliseconds
};

// Error factory functions
export type ErrorFactory = {
  createConfigError(
    message: string,
    details?: Partial<ConfigError>,
  ): ConfigError;
  createProviderError(
    message: string,
    details?: Partial<ProviderError>,
  ): ProviderError;
  createNetworkError(
    message: string,
    details?: Partial<NetworkError>,
  ): NetworkError;
  createValidationError(
    message: string,
    details?: Partial<ValidationError>,
  ): ValidationError;
  createAuthError(message: string, details?: Partial<AuthError>): AuthError;
  createInternalError(
    message: string,
    details?: Partial<NeuroLinkErrorInfo>,
  ): NeuroLinkErrorInfo;
};

// Error boundary types (for UI components)
export type ErrorBoundaryState = {
  hasError: boolean;
  error?: NeuroLinkErrorInfo;
  errorId?: string;
  retryCount: number;
};

export type ErrorBoundaryProps = {
  fallback?: React.ComponentType<ErrorBoundaryFallbackProps>;
  onError?: ErrorHandler;
  maxRetries?: number;
  resetOnPropsChange?: boolean;
};

export type ErrorBoundaryFallbackProps = {
  error: NeuroLinkErrorInfo;
  retry: () => void;
  canRetry: boolean;
};
```

### Step 4: Create Event Types

**File**: `src/lib/types/events.ts`

```typescript
import type {
  UnknownRecord,
  Timestamp,
  ID,
  Duration,
  EventHandler,
  AsyncEventHandler,
} from "./common";
import type { NeuroLinkErrorInfo } from "./errors";

// Base event types
export type EventType =
  // System events
  | "system.startup"
  | "system.shutdown"
  | "system.config_changed"
  | "system.error"

  // Provider events
  | "provider.registered"
  | "provider.enabled"
  | "provider.disabled"
  | "provider.health_check"
  | "provider.rate_limited"
  | "provider.error"

  // Model events
  | "model.request_started"
  | "model.request_completed"
  | "model.request_failed"
  | "model.token_usage"

  // Conversation events
  | "conversation.started"
  | "conversation.message_added"
  | "conversation.ended"
  | "conversation.context_updated"

  // MCP events
  | "mcp.server_connected"
  | "mcp.server_disconnected"
  | "mcp.tool_executed"
  | "mcp.tool_error"

  // Analytics events
  | "analytics.tracked"
  | "analytics.batch_sent"
  | "analytics.error";

// Base event structure
export type BaseEvent = {
  id: ID;
  type: EventType;
  timestamp: Timestamp;
  source: string;
  version: string;
  metadata?: UnknownRecord;
};

// Specific event types
export type SystemStartupEvent = BaseEvent & {
  type: "system.startup";
  data: {
    version: string;
    environment: string;
    configPath: string;
    pid: number;
    startupTime: Duration;
  };
};

export type SystemShutdownEvent = BaseEvent & {
  type: "system.shutdown";
  data: {
    reason: "graceful" | "forced" | "error";
    uptime: Duration;
    activeConnections: number;
  };
};

export type SystemConfigChangedEvent = BaseEvent & {
  type: "system.config_changed";
  data: {
    changes: Array<{
      path: string;
      oldValue: unknown;
      newValue: unknown;
    }>;
    source: "file" | "api" | "cli";
    automatic: boolean;
  };
};

export type SystemErrorEvent = BaseEvent & {
  type: "system.error";
  data: {
    error: NeuroLinkErrorInfo;
    component: string;
    recoverable: boolean;
  };
};

export type ProviderRegisteredEvent = BaseEvent & {
  type: "provider.registered";
  data: {
    provider: string;
    models: string[];
    capabilities: string[];
    priority: number;
  };
};

export type ProviderHealthCheckEvent = BaseEvent & {
  type: "provider.health_check";
  data: {
    provider: string;
    status: "healthy" | "degraded" | "unhealthy";
    responseTime: Duration;
    error?: NeuroLinkErrorInfo;
  };
};

export type ModelRequestStartedEvent = BaseEvent & {
  type: "model.request_started";
  data: {
    requestId: ID;
    provider: string;
    model: string;
    userId?: string;
    sessionId?: string;
    promptTokens: number;
    parameters: UnknownRecord;
  };
};

export type ModelRequestCompletedEvent = BaseEvent & {
  type: "model.request_completed";
  data: {
    requestId: ID;
    provider: string;
    model: string;
    userId?: string;
    sessionId?: string;
    duration: Duration;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost?: number;
    cacheHit: boolean;
  };
};

export type ModelRequestFailedEvent = BaseEvent & {
  type: "model.request_failed";
  data: {
    requestId: ID;
    provider: string;
    model: string;
    userId?: string;
    sessionId?: string;
    duration: Duration;
    error: NeuroLinkErrorInfo;
    retryAttempt: number;
    fallbackUsed: boolean;
  };
};

export type ConversationStartedEvent = BaseEvent & {
  type: "conversation.started";
  data: {
    conversationId: ID;
    userId?: string;
    provider: string;
    model: string;
    initialPrompt?: string;
  };
};

export type ConversationMessageAddedEvent = BaseEvent & {
  type: "conversation.message_added";
  data: {
    conversationId: ID;
    messageId: ID;
    role: "user" | "assistant" | "system";
    content: string;
    tokens: number;
    userId?: string;
  };
};

export type MCPServerConnectedEvent = BaseEvent & {
  type: "mcp.server_connected";
  data: {
    serverId: ID;
    serverName: string;
    transport: "stdio" | "sse" | "websocket";
    capabilities: string[];
    tools: Array<{
      name: string;
      description: string;
    }>;
  };
};

export type MCPToolExecutedEvent = BaseEvent & {
  type: "mcp.tool_executed";
  data: {
    serverId: ID;
    toolName: string;
    duration: Duration;
    success: boolean;
    userId?: string;
    parameters: UnknownRecord;
    result?: unknown;
  };
};

export type AnalyticsTrackedEvent = BaseEvent & {
  type: "analytics.tracked";
  data: {
    category: string;
    action: string;
    label?: string;
    value?: number;
    userId?: string;
    sessionId?: string;
    properties?: UnknownRecord;
  };
};

// Union type of all events
export type NeuroLinkEvent =
  | SystemStartupEvent
  | SystemShutdownEvent
  | SystemConfigChangedEvent
  | SystemErrorEvent
  | ProviderRegisteredEvent
  | ProviderHealthCheckEvent
  | ModelRequestStartedEvent
  | ModelRequestCompletedEvent
  | ModelRequestFailedEvent
  | ConversationStartedEvent
  | ConversationMessageAddedEvent
  | MCPServerConnectedEvent
  | MCPToolExecutedEvent
  | AnalyticsTrackedEvent;

// Event emitter types
export type EventListener<T extends NeuroLinkEvent = NeuroLinkEvent> =
  EventHandler<T>;
export type AsyncEventListener<T extends NeuroLinkEvent = NeuroLinkEvent> =
  AsyncEventHandler<T>;

export type EventListenerOptions = {
  once?: boolean;
  priority?: number;
  async?: boolean;
  timeout?: Duration;
};

export type EventEmitterOptions = {
  maxListeners?: number;
  captureRejections?: boolean;
  async?: boolean;
};

// Event subscription types
export type EventSubscription = {
  id: ID;
  eventType: EventType;
  listener: EventListener | AsyncEventListener;
  options: EventListenerOptions;
  createdAt: Timestamp;
  callCount: number;
};

export type EventFilter = {
  type?: EventType | EventType[];
  source?: string | string[];
  since?: Timestamp;
  until?: Timestamp;
  metadata?: UnknownRecord;
};

// Event storage and replay types
export type EventStore = {
  append(event: NeuroLinkEvent): Promise<void>;
  query(filter: EventFilter): Promise<NeuroLinkEvent[]>;
  replay(filter: EventFilter, handler: EventListener): Promise<void>;
  prune(before: Timestamp): Promise<number>;
};

export type EventStoreOptions = {
  maxEvents?: number;
  maxAge?: Duration;
  compression?: boolean;
  encryption?: boolean;
  persistence?: boolean;
};

// Event aggregation types
export type EventMetric = {
  type: EventType;
  count: number;
  rate: number; // events per second
  avgDuration?: Duration;
  errorRate?: number;
  lastSeen: Timestamp;
};

export type EventAggregation = {
  period: Duration;
  startTime: Timestamp;
  endTime: Timestamp;
  metrics: EventMetric[];
  totalEvents: number;
  uniqueSources: number;
};

// Event middleware types
export type EventMiddleware = (
  event: NeuroLinkEvent,
  next: (event: NeuroLinkEvent) => void,
) => void;

export type AsyncEventMiddleware = (
  event: NeuroLinkEvent,
  next: (event: NeuroLinkEvent) => Promise<void>,
) => Promise<void>;

// Event bus types
export type EventBus = {
  emit<T extends NeuroLinkEvent>(event: T): Promise<void>;
  on<T extends NeuroLinkEvent>(
    type: T["type"],
    listener: EventListener<T>,
    options?: EventListenerOptions,
  ): EventSubscription;
  off(subscription: EventSubscription | ID): void;
  removeAllListeners(type?: EventType): void;
  listenerCount(type?: EventType): number;
  use(middleware: EventMiddleware | AsyncEventMiddleware): void;
};

// Event patterns
export type EventPattern = {
  type: EventType | RegExp;
  source?: string | RegExp;
  condition?: (event: NeuroLinkEvent) => boolean;
};

export type EventCorrelation = {
  id: ID;
  patterns: EventPattern[];
  timeout: Duration;
  handler: (events: NeuroLinkEvent[]) => void;
  createdAt: Timestamp;
};

// Event analytics
export type EventAnalytics = {
  getTrends(type: EventType, period: Duration): Promise<EventMetric[]>;
  getErrorRates(period: Duration): Promise<Record<EventType, number>>;
  getTopSources(
    period: Duration,
  ): Promise<Array<{ source: string; count: number }>>;
  getLatency(
    type: EventType,
    period: Duration,
  ): Promise<{ avg: number; p95: number; p99: number }>;
};
```

### Step 5: Update Type Exports

**File**: `src/lib/types/index.ts`

```typescript
// Export all types from the types module
export * from "./common";
export * from "./ai";
export * from "./conversation";
export * from "./analytics";
export * from "./errors";
export * from "./events";

// Re-export commonly used types for convenience
export type {
  // Common utilities
  JsonValue,
  JsonObject,
  UnknownRecord,
  Result,
  AsyncResult,
  Optional,
  Required as RequiredFields,
  Nullable,
  Maybe,
  ID,
  UUID,
  Timestamp,
  Duration,
  Environment,

  // Error handling
  ErrorInfo,
  NeuroLinkErrorInfo,
  NeuroLinkErrorType,
  NeuroLinkErrorCode,
  ErrorContext,

  // Events
  NeuroLinkEvent,
  EventType,
  EventListener,
  EventBus,

  // Type guards
  TypeGuard,
  AssertionFunction,
} from "./common";

// Version and compatibility
export const TYPES_VERSION = "1.0.0";
export const COMPATIBLE_VERSIONS = ["1.0.0"];

// Type utilities for runtime validation
export {
  assertType,
  isNonNull,
  isDefined,
  isString,
  isNumber,
  isBoolean,
  isObject,
  isArray,
  isFunction,
} from "./common";
```

## Validation Checklist

### Type Safety Checks

- [ ] All common types properly defined
- [ ] Error types comprehensive and categorized
- [ ] Event types cover all system events
- [ ] No circular dependencies between type files
- [ ] All types exported correctly

### Integration Checks

- [ ] Core module uses new types
- [ ] Configuration module compatible
- [ ] Provider modules use error types
- [ ] Event system uses event types

### Validation Checks

- [ ] Type guards work correctly
- [ ] Error factories create proper types
- [ ] Event emitter types function

## Verification Commands

```bash
# TypeScript compilation
npx tsc --noEmit src/lib/types/*.ts

# Test type imports
node -e "
const types = require('./dist/lib/types/index.js');
console.log('Types loaded:', Object.keys(types).length);
"

# Test type guards
node -e "
const { isString, isNumber, isObject } = require('./dist/lib/types/index.js');
console.log('isString test:', isString('hello'));
console.log('isNumber test:', isNumber(42));
console.log('isObject test:', isObject({}));
"
```

## Success Criteria

- ✅ All utility types properly defined
- ✅ Error type system comprehensive
- ✅ Event type system complete
- ✅ Type guards function correctly
- ✅ No circular dependencies
- ✅ Integration with all modules works
- ✅ Type exports properly organized

## Next Steps

After completing this refactor:

1. **08-utils-module.md** - Refactor utilities with new types
2. Update core module to use new error types
3. Update providers to use new event types
4. Update configuration to use validation types

## Impact Assessment

**High Impact**:

- Foundation for all other type-safe refactoring
- Error handling becomes consistent
- Event system becomes type-safe

**Medium Impact**:

- Runtime validation improves
- Type safety across all modules

**Low Impact**:

- Bundle size (minimal increase)
- Runtime performance (minimal overhead)
