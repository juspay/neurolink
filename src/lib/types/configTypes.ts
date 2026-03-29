/**
 * NeuroLink Configuration Types
 * Centralized configuration type definitions following the established architecture pattern
 */

import { MCPToolRegistry } from "../mcp/toolRegistry.js";
import type { TaskManagerConfig } from "./taskTypes.js";
import type { HITLConfig } from "../types/hitlTypes.js";
import type { ConversationMemoryConfig } from "./conversation.js";
import type { ObservabilityConfig } from "./observability.js";
import type { RoutingStrategy } from "../mcp/routing/index.js";
import type { CacheStrategy } from "../mcp/caching/index.js";
import type { ToolMiddleware } from "../mcp/toolIntegration.js";
import type {
  MastraAuthProvider,
  AuthProviderType,
  AuthProviderConfig,
  Auth0Config,
  ClerkConfig,
  FirebaseConfig,
  SupabaseConfig,
  WorkOSConfig,
  BetterAuthConfig,
  JWTConfig,
  OAuth2Config,
  CognitoConfig,
  KeycloakConfig,
  AuthenticatedContext,
} from "./authTypes.js";

/**
 * Main NeuroLink configuration type
 */
export type NeuroLinkConfig = {
  providers?: Record<string, ProviderConfig>;
  performance?: PerformanceConfig;
  analytics?: AnalyticsConfig;
  tools?: ToolConfig;
  lastUpdated?: number;
  configVersion?: string;
  [key: string]: unknown; // Extensibility for existing config
};

/**
 * Configuration object for NeuroLink constructor.
 */
export type NeurolinkConstructorConfig = {
  conversationMemory?: Partial<ConversationMemoryConfig>;
  enableOrchestration?: boolean;
  hitl?: HITLConfig;
  toolRegistry?: MCPToolRegistry;
  observability?: ObservabilityConfig;
  modelAliasConfig?: import("./generateTypes.js").ModelAliasConfig;
  /** MCP enhancement modules configuration (cache, router, batcher, annotations, middleware) */
  mcp?: MCPEnhancementsConfig;
  /** Authentication provider configuration */
  auth?: NeuroLinkAuthConfig;
  /** TaskManager configuration (scheduled and self-running tasks) */
  tasks?: TaskManagerConfig;
};

/**
 * Configuration for MCP enhancement modules wired into generate()/stream() paths.
 *
 * These modules are automatically applied during tool execution when configured:
 * - cache: Tool result caching (disabled by default)
 * - annotations: Auto-infer tool safety metadata (enabled by default)
 * - router: Multi-server tool routing (auto-activates with 2+ servers)
 * - batcher: Batch programmatic tool calls (disabled by default)
 * - discovery: Enhanced tool search and filtering (enabled by default)
 * - middleware: Global tool execution middleware chain (empty by default)
 */
export type MCPEnhancementsConfig = {
  /** Tool result caching. Default: disabled. Enable to cache read-only tool results. */
  cache?: {
    enabled?: boolean;
    /** Cache TTL in milliseconds. Default: 300000 (5 min) */
    ttl?: number;
    /** Maximum cache entries. Default: 500 */
    maxSize?: number;
    /** Eviction strategy. Default: 'lru' */
    strategy?: CacheStrategy;
  };
  /** Tool annotation auto-inference. Default: enabled. */
  annotations?: {
    enabled?: boolean;
    /** Auto-infer annotations from tool name/description. Default: true */
    autoInfer?: boolean;
  };
  /** Tool routing for multi-server environments. Auto-activates when 2+ external servers exist. */
  router?: {
    enabled?: boolean;
    /** Routing strategy. Default: 'least-loaded' */
    strategy?: RoutingStrategy;
    /** Enable session affinity. Default: false */
    enableAffinity?: boolean;
  };
  /** Request batching for programmatic executeTool() calls. Default: disabled. */
  batcher?: {
    enabled?: boolean;
    /** Max requests per batch. Default: 10 */
    maxBatchSize?: number;
    /** Max wait before flushing batch in ms. Default: 100 */
    maxWaitMs?: number;
  };
  /** Enhanced tool discovery. Default: enabled. */
  discovery?: {
    enabled?: boolean;
  };
  /** Global tool middleware applied to every tool execution. Default: empty. */
  middleware?: ToolMiddleware[];
};

/**
 * Authentication configuration for NeuroLink SDK
 */
export type NeuroLinkAuthConfig =
  | MastraAuthProvider
  | { provider: MastraAuthProvider }
  | { type: "auth0"; config: Auth0Config }
  | { type: "clerk"; config: ClerkConfig }
  | { type: "firebase"; config: FirebaseConfig }
  | { type: "supabase"; config: SupabaseConfig }
  | { type: "workos"; config: WorkOSConfig }
  | { type: "better-auth"; config: BetterAuthConfig }
  | { type: "jwt"; config: JWTConfig }
  | { type: "oauth2"; config: OAuth2Config }
  | { type: "cognito"; config: CognitoConfig }
  | { type: "keycloak"; config: KeycloakConfig }
  | { type: AuthProviderType; config: AuthProviderConfig };

/**
 * Re-export auth types for convenience
 */
export type {
  MastraAuthProvider,
  AuthProviderType,
  AuthProviderConfig,
  AuthenticatedContext,
};

/**
 * Provider-specific configuration
 */
export type ProviderConfig = {
  model?: string;
  available?: boolean;
  lastCheck?: number;
  reason?: string;
  apiKey?: string;
  endpoint?: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
  costPerToken?: number;
  features?: string[]; // ['streaming', 'functionCalling', 'vision']
  [key: string]: unknown; // Provider-specific extensions
};

/**
 * Performance and caching configuration
 */
export type PerformanceConfig = {
  cache?: CacheConfig;
  fallback?: FallbackConfig;
  timeoutMs?: number;
  maxConcurrency?: number;
  retryConfig?: RetryConfig;
};

/**
 * Cache configuration
 */
export type CacheConfig = {
  enabled?: boolean;
  ttlMs?: number; // Time to live (milliseconds)
  strategy?: "memory" | "writeThrough" | "cacheAside";
  maxSize?: number; // Maximum cache entries
  persistToDisk?: boolean;
  diskPath?: string;
};

/**
 * Fallback configuration
 */
export type FallbackConfig = {
  enabled?: boolean;
  maxAttempts?: number;
  delayMs?: number;
  circuitBreaker?: boolean;
  commonResponses?: Record<string, string>; // Common fallback responses
  localFallbackPath?: string; // Path to local fallback file
  degradedMode?: boolean; // Allow degraded functionality
};

/**
 * Retry configuration
 */
export type RetryConfig = {
  enabled?: boolean;
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  exponentialBackoff?: boolean;
  retryConditions?: string[]; // Error types to retry on
};

/**
 * Analytics configuration
 */
export type AnalyticsConfig = {
  enabled?: boolean;
  trackTokens?: boolean;
  trackCosts?: boolean;
  trackPerformance?: boolean;
  trackErrors?: boolean;
  exportFormat?: "json" | "csv" | "prometheus";
  exportPath?: string;
  retention?: {
    days?: number;
    maxEntries?: number;
  };
};

/**
 * Tool configuration
 */
export type ToolConfig = {
  /** Whether built-in tools should be disabled */
  disableBuiltinTools?: boolean;
  /** Whether custom tools are allowed */
  allowCustomTools?: boolean;
  /** Maximum number of tools per provider */
  maxToolsPerProvider?: number;
  /** Whether MCP tools should be enabled */
  enableMCPTools?: boolean;
  /** Whether the bash command execution tool should be enabled (opt-in, defaults to false) */
  enableBashTool?: boolean;
};

/**
 * Backup metadata information
 */
export type BackupInfo = {
  filename: string;
  path: string;
  metadata: BackupMetadata;
  config: NeuroLinkConfig;
};

/**
 * Backup metadata
 */
export type BackupMetadata = {
  reason: string;
  timestamp: number;
  version: string;
  originalPath: string;
  hash?: string; // Config hash for verification
  size?: number; // File size in bytes
  createdBy?: string; // Who/what created the backup
};

/**
 * Configuration validation result
 */
export type ConfigValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
};

/**
 * Configuration update options
 */
export type ConfigUpdateOptions = {
  createBackup?: boolean;
  validate?: boolean;
  merge?: boolean; // Merge with existing vs replace
  reason?: string; // Reason for the update
  silent?: boolean; // Skip console output
};

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: NeuroLinkConfig = {
  providers: {
    googleAi: {
      model: "gemini-2.5-pro",
      available: true,
      features: ["streaming", "functionCalling"],
    },
  },
  performance: {
    cache: {
      enabled: true,
      ttlMs: 300000, // 5 minutes
      strategy: "memory",
      maxSize: 1000,
    },
    fallback: {
      enabled: true,
      maxAttempts: 3,
      delayMs: 1000,
      circuitBreaker: true,
    },
    timeoutMs: 30000, // 30 seconds
    maxConcurrency: 5,
  },
  analytics: {
    enabled: true,
    trackTokens: true,
    trackCosts: true,
    trackPerformance: true,
    retention: {
      days: 30,
      maxEntries: 10000,
    },
  },
  tools: {
    disableBuiltinTools: false,
    allowCustomTools: true,
    maxToolsPerProvider: 100,
    enableMCPTools: true,
  },
  configVersion: "3.0.1",
};

// =============================================================================
// CONSTANTS-DERIVED TYPES (moved from constants/index.ts)
// =============================================================================

import {
  TOOL_TIMEOUTS,
  BACKOFF_CONFIG,
  PERFORMANCE_PROFILES,
  PROVIDER_OPERATION_CONFIGS,
  MCP_OPERATION_CONFIGS,
} from "../constants/index.js";

/** Timeout category keys from TOOL_TIMEOUTS. */
export type TimeoutCategory = keyof typeof TOOL_TIMEOUTS;

/** Retry strategy keys from BACKOFF_CONFIG. */
export type RetryStrategy = keyof typeof BACKOFF_CONFIG;

/** Performance profile keys from PERFORMANCE_PROFILES. */
export type PerformanceProfile = keyof typeof PERFORMANCE_PROFILES;

/** Provider-specific operation config. */
export type ProviderOperationConfig =
  (typeof PROVIDER_OPERATION_CONFIGS)[keyof typeof PROVIDER_OPERATION_CONFIGS];

/** MCP-specific operation config. */
export type McpOperationConfig =
  (typeof MCP_OPERATION_CONFIGS)[keyof typeof MCP_OPERATION_CONFIGS];

// =============================================================================
// RATE LIMITER CONFIG (moved from utils/rateLimiter.ts)
// =============================================================================

/** Configuration options for the token bucket rate limiter. */
export type RateLimiterConfig = {
  /** Maximum tokens (downloads) allowed per interval */
  maxTokens: number;
  /** Refill interval in milliseconds */
  refillIntervalMs: number;
  /** Number of tokens to add per refill interval */
  tokensPerRefill: number;
  /** Maximum queue size for pending requests */
  maxQueueSize: number;
  /** Timeout for queued requests in milliseconds */
  queueTimeoutMs: number;
};

// =============================================================================
// THINKING CONFIG TYPES (moved from utils/thinkingConfig.ts)
// =============================================================================

/** ThinkingLevel type for Gemini 3 models. */
export type ThinkingLevel = "minimal" | "low" | "medium" | "high";

/** ThinkingConfig matching the SDK's expected structure. */
export type ThinkingConfig = {
  enabled?: boolean;
  type?: "enabled" | "disabled";
  /** Token budget for thinking (Anthropic models: 5000-100000) */
  budgetTokens?: number;
  /** Thinking level for Gemini 3 models */
  thinkingLevel?: ThinkingLevel;
};

/** Options for creating a thinkingConfig from CLI-style options. */
export type CreateThinkingConfigOptions = {
  /** Enable thinking mode */
  thinking?: boolean;
  /** Token budget for thinking (defaults to 10000) */
  thinkingBudget?: number;
  /** Thinking level for Gemini 3 models */
  thinkingLevel?: ThinkingLevel;
};

/** Native SDK thinkingConfig structure for Gemini native SDK. */
export type NativeThinkingConfig = {
  includeThoughts: boolean;
  thinkingLevel: ThinkingLevel;
};
