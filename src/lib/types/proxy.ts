/**
 * Proxy type definitions for NeuroLink
 *
 * Consolidates all proxy-related types from:
 * - src/lib/proxy/claudeFormat.ts (Claude API types, SSE types, internal result)
 * - src/lib/proxy/cloaking/types.ts (cloaking pipeline types)
 * - src/lib/proxy/cloaking/plugins/ (plugin option types)
 * - src/lib/proxy/modelRouter.ts (routing types)
 * - src/lib/proxy/proxyConfig.ts (config file types)
 * - src/lib/proxy/requestLogger.ts (log entry type)
 * - src/lib/proxy/usageStats.ts (stats types)
 * - src/lib/proxy/tokenRefresh.ts (refresh types)
 * - src/lib/proxy/accountQuota.ts (quota type)
 * - src/lib/server/routes/claudeProxyRoutes.ts (runtime state, deps)
 */

import type { Counter, Histogram, Span } from "@opentelemetry/api";
import type { Hono } from "hono";
import type { Ora } from "ora";
import type { MCPToolRegistry } from "../mcp/toolRegistry.js";
import type { ProxyTracer } from "../proxy/proxyTracer.js";
import type {
  FallbackEntry,
  ProxyRoutingConfig,
  CloakingConfig,
} from "./subscription.js";
import type { RouteDeprecation } from "./server.js";

/**
 * Type describing the ModelRouter contract.
 * Defined here to avoid a circular dependency between types and implementation.
 */
export type ModelRouterInterface = {
  resolve(requestedModel: string): RouteResult;
  isClaudeTarget(requestedModel: string): boolean;
  getFallbackChain(): FallbackEntry[];
};

// =============================================================================
// CLAUDE API TYPES (from claudeFormat.ts)
// =============================================================================

/** A single text block in a Claude content array. */
export type ClaudeTextBlock = {
  type: "text";
  text: string;
};

/** A single image block in a Claude content array. */
export type ClaudeImageBlock = {
  type: "image";
  source: {
    type: "base64" | "url";
    media_type?: string;
    data?: string;
    url?: string;
  };
};

/** Tool-use block returned by Claude in assistant messages. */
export type ClaudeToolUseBlock = {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
};

/** Tool-result block sent back by the caller. */
export type ClaudeToolResultBlock = {
  type: "tool_result";
  tool_use_id: string;
  content: string | ClaudeContentBlock[];
};

/** A thinking/reasoning block in a Claude content array. */
export type ClaudeThinkingBlock = {
  type: "thinking";
  thinking: string;
};

export type ClaudeContentBlock =
  | ClaudeTextBlock
  | ClaudeImageBlock
  | ClaudeToolUseBlock
  | ClaudeToolResultBlock
  | ClaudeThinkingBlock;

/** A single message in a Claude conversation. */
export type ClaudeMessage = {
  role: "user" | "assistant";
  content: string | ClaudeContentBlock[];
};

/** Tool definition in the Claude Messages API format. */
export type ClaudeTool = {
  name: string;
  description?: string;
  input_schema: Record<string, unknown>;
};

/** Metadata attached to a Claude Messages API request. */
export type ClaudeMetadata = {
  user_id?: string;
};

/**
 * Inbound Claude Messages API request body.
 * Matches POST /v1/messages.
 */
export type ClaudeRequest = {
  model: string;
  messages: ClaudeMessage[];
  max_tokens: number;
  system?: string | Array<{ type: "text"; text: string }>;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  stop_sequences?: string[];
  stream?: boolean;
  tools?: ClaudeTool[];
  tool_choice?:
    | { type: "auto" | "any" | "none" }
    | { type: "tool"; name: string };
  thinking?: { type: string; budget_tokens?: number };
  metadata?: ClaudeMetadata;
};

// =============================================================================
// CLAUDE RESPONSE TYPES (from claudeFormat.ts)
// =============================================================================

/** Usage counters returned in a Claude response. */
export type ClaudeUsage = {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
};

/** Non-streaming response matching the Claude Messages API. */
export type ClaudeResponse = {
  id: string;
  type: "message";
  role: "assistant";
  content: ClaudeContentBlock[];
  model: string;
  stop_reason: string | null;
  stop_sequence: string | null;
  usage: ClaudeUsage;
};

/** Claude API error envelope. */
export type ClaudeErrorResponse = {
  type: "error";
  error: {
    type: string;
    message: string;
  };
};

// =============================================================================
// SSE EVENT TYPES (from claudeFormat.ts)
// =============================================================================

/** Content block descriptor for content_block_start events. */
export type SSEContentBlockDescriptor =
  | { type: "text"; text: "" }
  | { type: "thinking"; thinking: "" }
  | { type: "tool_use"; id: string; name: string; input: "" };

/** Delta descriptor for content_block_delta events. */
export type SSEDeltaDescriptor =
  | { type: "text_delta"; text: string }
  | { type: "thinking_delta"; thinking: string }
  | { type: "input_json_delta"; partial_json: string };

export type SSEMessageStart = {
  type: "message_start";
  message: Omit<ClaudeResponse, "content"> & { content: [] };
};

export type SSEContentBlockStart = {
  type: "content_block_start";
  index: number;
  content_block: SSEContentBlockDescriptor;
};

export type SSEContentBlockDelta = {
  type: "content_block_delta";
  index: number;
  delta: SSEDeltaDescriptor;
};

export type SSEContentBlockStop = {
  type: "content_block_stop";
  index: number;
};

export type SSEMessageDelta = {
  type: "message_delta";
  delta: { stop_reason: string | null; stop_sequence: string | null };
  usage: { output_tokens: number };
};

export type SSEMessageStop = {
  type: "message_stop";
};

export type SSEPing = {
  type: "ping";
};

export type SSEEvent =
  | SSEMessageStart
  | SSEContentBlockStart
  | SSEContentBlockDelta
  | SSEContentBlockStop
  | SSEMessageDelta
  | SSEMessageStop
  | SSEPing;

// =============================================================================
// INTERNAL RESULT TYPE (from claudeFormat.ts)
// =============================================================================

/**
 * Minimal subset of NeuroLink's GenerateResult that the proxy layer consumes.
 * Kept intentionally narrow so the proxy layer does not depend on every
 * field of the full type.
 */
export type InternalResult = {
  content: string;
  model?: string;
  finishReason?: string;
  /** Thinking/reasoning text from provider (Anthropic thinking blocks, Gemini thought parts) */
  reasoning?: string;
  usage?: {
    input: number;
    output: number;
    total: number;
    cacheCreationTokens?: number;
    cacheReadTokens?: number;
  };
  toolCalls?: Array<{
    toolCallId: string;
    toolName: string;
    args: Record<string, unknown>;
  }>;
};

/**
 * Parsed representation of a Claude request, ready for NeuroLink's
 * generate() / stream() pipeline.
 */
export type ParsedClaudeRequest = {
  model: string;
  maxTokens: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  systemPrompt?: string | Array<{ type: string; text: string }>;
  stream: boolean;

  /** Flat prompt string derived from the last user message. */
  prompt: string;

  /** Images extracted from content blocks (base64 data URIs or URLs). */
  images: string[];

  /**
   * Full conversation history converted to NeuroLink's ChatMessage shape.
   * Includes all messages, not just the last one.
   */
  conversationMessages: Array<{ role: string; content: string }>;

  /** Tools translated to AI SDK-compatible shape for provider fallback. */
  tools: Record<
    string,
    {
      description?: string;
      inputSchema: unknown;
      execute?: (...args: unknown[]) => unknown;
    }
  >;

  /**
   * Tool choice mapping from Claude format.
   * - "auto" -> let the model decide
   * - "required" -> force tool use (any tool)
   * - "none" -> no tool use
   */
  toolChoice?: "auto" | "required" | "none";

  /** When toolChoice came from `{type: "tool", name: "..."}`, the tool name. */
  toolChoiceName?: string;

  /** Thinking configuration parsed from the request. */
  thinkingConfig?: {
    enabled: boolean;
    budgetTokens?: number;
    thinkingLevel?: "minimal" | "low" | "medium" | "high";
  };

  /** Original request metadata (if any). */
  metadata?: ClaudeMetadata;

  /** Stop sequences from the original request. */
  stopSequences?: string[];
};

/** Lifecycle state for the SSE serializer. */
export type StreamLifecycleState = "idle" | "streaming" | "done" | "error";

/** The type of content block currently being streamed. */
export type ContentBlockType = "text" | "thinking" | "tool_use" | null;

// =============================================================================
// CLOAKING PIPELINE TYPES (from cloaking/types.ts)
// =============================================================================

/** Minimal account shape needed by the cloaking pipeline. */
export type CloakingAccount = {
  id: string;
  type: "api_key" | "oauth";
  status: "healthy" | "quota_exceeded" | "error";
  consecutiveFailures: number;
  requestCount: number;
  lastUsed: number;
  apiKey?: string;
};

/** Request envelope for cloaking pipeline. */
export type CloakingRequest = {
  headers: Record<string, string | undefined>;
  body: {
    messages: Array<{
      role: string;
      content: string | Array<Record<string, unknown>>;
    }>;
    system?: string | Array<{ type: string; text: string }>;
    metadata?: Record<string, unknown>;
    [key: string]: unknown;
  };
  url: string;
};

/** Response envelope for cloaking pipeline. */
export type CloakingResponse = {
  headers: Record<string, string | undefined>;
  body: Record<string, unknown>;
  status: number;
};

/** Cloaking mode configuration. */
export type CloakingMode = "auto" | "always" | "never";

/** Context passed through the cloaking pipeline. */
export type CloakingContext = {
  request: CloakingRequest;
  account: CloakingAccount;
  config: {
    mode: CloakingMode;
    plugins: Record<string, unknown>;
  };
  response?: { headers: Record<string, string>; body: unknown };
};

/** Plugin interface for cloaking pipeline. */
export type CloakingPlugin = {
  /** Human-readable name for logging / debugging. */
  name: string;

  /** Execution order -- lower numbers run first in processRequest. */
  order: number;

  /** Whether this plugin is active. Disabled plugins are skipped. */
  enabled: boolean;

  /**
   * Transform the outgoing request before it reaches the upstream API.
   * Must return a (possibly mutated) context.
   */
  transformRequest: (ctx: CloakingContext) => Promise<CloakingContext>;

  /**
   * Transform the incoming response before it reaches the client.
   * Optional -- plugins that only touch requests can skip this.
   */
  transformResponse?: (ctx: CloakingContext) => Promise<CloakingContext>;
};

// =============================================================================
// CLOAKING PLUGIN OPTIONS (from cloaking/plugins/)
// =============================================================================

/** Options for the HeaderScrubber cloaking plugin. */
export type HeaderScrubberOptions = {
  /** Additional header names (lower-cased) to strip. */
  extraHeaders?: string[];
};

/** Options for the SystemPromptInjector cloaking plugin. */
export type SystemPromptInjectorOptions = {
  /** IDE name to inject (default: "vscode"). */
  ide?: string;
  /** IDE version (default: "1.96.2"). */
  ideVersion?: string;
  /** Platform string (default: "darwin"). */
  platform?: string;
  /** Working directory to inject (default: "/home/user/project"). */
  cwd?: string;
  /** Extra preamble to prepend. */
  preamble?: string;
};

/** Options for the TlsFingerprint cloaking plugin. */
export type TlsFingerprintOptions = {
  /** Target fingerprint profile (e.g. "chrome-131", "node-22", "claude-code"). */
  profile?: string;
  /** Whether the stub should log a warning that it is a no-op. */
  warnOnUse?: boolean;
};

// =============================================================================
// PROXY MODE
// =============================================================================

/**
 * Proxy operating mode:
 * - "full"        — managed accounts, retry, rotation, polyfill (default)
 * - "passthrough" — no polyfill/retry/rotation, but body is still parsed and re-serialized
 * - "transparent" — zero-mutation byte relay: raw body forwarded as-is, minimal header filtering,
 *                   SSE interceptor for cache metrics only (bytes pass through unmodified)
 */
export type ProxyMode = "full" | "passthrough" | "transparent";

// =============================================================================
// MODEL ROUTER TYPES (from modelRouter.ts)
// =============================================================================

export type RouteResult = {
  provider: string | null;
  model: string;
};

// =============================================================================
// PROXY CONFIG TYPES (from proxyConfig.ts)
// =============================================================================

/** Individual account configuration within a proxy config file. */
export type ProxyAccountConfig = {
  /** Human-readable name for the account */
  name: string;
  /** API key or token (may contain env var references) */
  apiKey: string;
  /** Base URL override for the provider endpoint */
  baseUrl?: string;
  /** Organization ID (e.g., OpenAI orgs) */
  orgId?: string;
  /** Weight for weighted round-robin selection (default: 1) */
  weight?: number;
  /** Whether this account is currently enabled (default: true) */
  enabled?: boolean;
  /** Maximum requests per minute for this account */
  rateLimit?: number;
  /** Arbitrary metadata attached to the account */
  metadata?: Record<string, unknown>;
};

/** Top-level proxy configuration structure. */
export type ProxyConfigFile = {
  /** Configuration schema version */
  version?: number;
  /** Default provider name to apply when not specified per-account */
  defaultProvider?: string;
  /** Default base URL applied to accounts that omit baseUrl */
  defaultBaseUrl?: string;
  /** Map of provider names to their account lists */
  accounts: Record<string, ProxyAccountConfig[]>;
  /** Routing configuration (strategy, model mappings, fallback chain) */
  routing?: Partial<ProxyRoutingConfig>;
  /** Cloaking plugin configuration */
  cloaking?: CloakingConfig;
};

/** Options for loadProxyConfig. */
export type LoadProxyConfigOptions = {
  /** Resolve environment variables in string values (default: true) */
  resolveEnv?: boolean;
  /** Custom environment object (defaults to process.env) */
  env?: Record<string, string | undefined>;
};

// =============================================================================
// REQUEST LOGGER TYPES (from requestLogger.ts)
// =============================================================================

export type RequestLogEntry = {
  timestamp: string;
  requestId: string;
  method: string;
  path: string;
  model: string;
  stream: boolean;
  toolCount: number;
  account: string;
  accountType: string;
  responseStatus: number;
  responseTimeMs: number;
  errorType?: string;
  errorMessage?: string;
  inputTokens?: number;
  outputTokens?: number;
  cacheCreationTokens?: number;
  cacheReadTokens?: number;
  /** OTel trace ID for correlation with distributed traces */
  traceId?: string;
  /** OTel span ID for correlation with distributed traces */
  spanId?: string;
};

export type RequestAttemptLogEntry = {
  timestamp: string;
  requestId: string;
  attempt: number;
  method: string;
  path: string;
  model: string;
  stream: boolean;
  toolCount: number;
  account: string;
  accountType: string;
  responseStatus: number;
  responseTimeMs: number;
  errorType?: string;
  errorMessage?: string;
  inputTokens?: number;
  outputTokens?: number;
  cacheCreationTokens?: number;
  cacheReadTokens?: number;
  /** OTel trace ID for correlation with distributed traces */
  traceId?: string;
  /** OTel span ID for correlation with distributed traces */
  spanId?: string;
};

export type ProxyBodyCaptureInput = {
  phase: string;
  headers?: Record<string, string>;
  body?: unknown;
  bodySize?: number;
  contentType?: string;
  responseStatus?: number;
  durationMs?: number;
  account?: string;
  accountType?: string;
  attempt?: number;
  metadata?: Record<string, unknown>;
};

export type ProxyBodyCaptureLogger = (capture: ProxyBodyCaptureInput) => void;

export type ClaudeFinalRequestLogger = (
  status: number,
  accountLabel: string,
  accountType: string,
  errorType?: string,
  errorMessage?: string,
  extra?: {
    inputTokens?: number;
    outputTokens?: number;
    cacheCreationTokens?: number;
    cacheReadTokens?: number;
  },
) => void;

export type ClaudeLoggedErrorBuilder = (
  status: number,
  message: string,
  errorType?: string,
  extra?: {
    account?: string;
    accountType?: string;
    attempt?: number;
  },
) => ClaudeErrorResponse;

export type ClaudeRequestRuntimeContext = {
  tracer?: ProxyTracer;
  requestStartTime: number;
  logProxyBody: ProxyBodyCaptureLogger;
  logFinalRequest: ClaudeFinalRequestLogger;
  buildLoggedClaudeError: ClaudeLoggedErrorBuilder;
};

export type AnthropicAttemptLogger = (
  status: number,
  errorType?: string,
  errorMessage?: string,
  extra?: {
    inputTokens?: number;
    outputTokens?: number;
    cacheCreationTokens?: number;
    cacheReadTokens?: number;
  },
) => void;

export type AnthropicLoopState = {
  lastError: unknown;
  sawRateLimit: boolean;
  sawNetworkError: boolean;
  sawTransientFailure: boolean;
  invalidRequestFailure: {
    status: number;
    body: string;
    contentType?: string;
  } | null;
  authFailureMessage: string | null;
  attemptNumber: number;
};

export type AnthropicUpstreamBody = {
  bodyStr: string;
  sessionId?: string;
};

export type AnthropicUpstreamBodyBuilder = (
  token: string,
) => AnthropicUpstreamBody;

export type LoadedClaudeAccountContext = {
  accounts: ProxyPassthroughAccount[];
  enabledAccounts: ProxyPassthroughAccount[];
  orderedAccounts: ProxyPassthroughAccount[];
  bodyStr: string;
  requestStart: number;
  toolCount: number;
  url: string;
  clientHeaders: Record<string, string | undefined>;
  isClaudeClientRequest: boolean;
};

export type AnthropicSuccessResult =
  | { retryNextAccount: true }
  | { response: Response | unknown };

export type AnthropicAuthRetryResult = {
  response?: Response | unknown;
  continueLoop: boolean;
  lastError: unknown;
  authFailureMessage: string | null;
  sawRateLimit: boolean;
  sawTransientFailure: boolean;
  sawNetworkError: boolean;
  upstreamSpan?: Span;
};

export type AnthropicNonOkResult = {
  response?: Response | unknown;
  continueLoop: boolean;
  retrySameAccount?: boolean;
  lastError: unknown;
  authFailureMessage: string | null;
  sawTransientFailure: boolean;
  invalidRequestFailure: {
    status: number;
    body: string;
    contentType?: string;
  } | null;
  upstreamSpan?: Span;
};

export type PreparedAnthropicAccountAttempt = {
  continueLoop: boolean;
  lastError: unknown;
  authFailureMessage: string | null;
  headers?: Record<string, string>;
  buildUpstreamBody?: AnthropicUpstreamBodyBuilder;
  finalBodyStr?: string;
  fetchStartMs?: number;
  upstreamSpan?: Span;
};

export type AnthropicUpstreamFetchResult = {
  continueLoop: boolean;
  retrySameAccount?: boolean;
  /** When set, the caller should wait this many ms before retrying (from upstream retry-after). */
  retryAfterMs?: number;
  response?: Response;
  lastError: unknown;
  sawRateLimit: boolean;
  sawNetworkError: boolean;
  upstreamSpan?: Span;
};

// =============================================================================
// USAGE STATS TYPES (from usageStats.ts)
// =============================================================================

export type AccountStats = {
  label: string;
  type: string;
  attemptCount: number;
  successCount: number;
  errorCount: number;
  rateLimitCount: number;
  lastAttemptAt: number;
  lastErrorAt?: number;
};

export type ProxyStats = {
  startedAt: number;
  totalAttempts: number;
  totalRequests: number;
  totalSuccess: number;
  totalErrors: number;
  totalRateLimits: number;
  accounts: Record<string, AccountStats>;
};

// =============================================================================
// TOKEN REFRESH TYPES (from tokenRefresh.ts)
// =============================================================================

export type RefreshableAccount = {
  token: string;
  refreshToken?: string;
  expiresAt?: number;
  label: string;
};

export type RefreshResult = {
  success: boolean;
  error?: string;
  status?: number;
};

export type TokenPersistTarget =
  | string
  | { credPath: string }
  | { providerKey: string };

// =============================================================================
// ACCOUNT QUOTA TYPES (from accountQuota.ts)
// =============================================================================

export type AccountQuota = {
  /** 0.0-1.0  (from unified-5h-utilization) */
  sessionUsed: number;
  /** "allowed" | "throttled" | "rejected" */
  sessionStatus: string;
  /** Unix timestamp (seconds) when the 5h window resets */
  sessionResetAt: number;
  /** 0.0-1.0  (from unified-7d-utilization) */
  weeklyUsed: number;
  /** "allowed" | "throttled" | "rejected" */
  weeklyStatus: string;
  /** Unix timestamp (seconds) when the 7d window resets */
  weeklyResetAt: number;
  /** 0.0-1.0  (from fallback-percentage) */
  fallbackPercentage: number;
  /** "allowed" | "rejected" */
  overageStatus: string;
  /** Epoch ms when we last captured this data */
  lastUpdated: number;
};

// =============================================================================
// CLAUDE PROXY ROUTE TYPES (from claudeProxyRoutes.ts)
// =============================================================================

/** Runtime state for a proxy account. */
export type RuntimeAccountState = {
  consecutiveRefreshFailures: number;
  permanentlyDisabled: boolean;
  lastToken?: string;
  lastRefreshToken?: string;
  /** Epoch-ms timestamp until which the account should not be used for new
   *  requests (set after 429 retries are exhausted). Other requests arriving
   *  during this window will skip the account rather than hammering it again. */
  coolingUntil?: number;
};

/** A passthrough account used in the proxy route handler. */
export type ProxyPassthroughAccount = {
  key: string;
  label: string;
  token: string;
  refreshToken?: string;
  expiresAt?: number;
  type: "oauth" | "api_key";
  persistTarget?: TokenPersistTarget;
};

/** Dependencies for creating Claude proxy routes. */
export type ClaudeProxyDeps = {
  modelRouter?: ModelRouterInterface;
};

// =============================================================================
// SERVER ADAPTER TYPES
// =============================================================================

/** Rate limit store entry (Koa adapter). */
export type KoaRateLimitEntry = {
  count: number;
  resetAt: number;
};

/** Rate limit context (Fastify adapter). */
export type FastifyRateLimitContext = {
  ttl: number;
  ban?: boolean;
};

/** Rate limit store entry (Hono adapter). */
export type HonoRateLimitEntry = {
  count: number;
  resetAt: number;
};

/** Information about a deprecated route. */
export type DeprecatedRouteInfo = {
  method: string;
  path: string;
  deprecation: RouteDeprecation;
};

/** Cache entry for response caching middleware. */
export type ResponseCacheEntry<T = unknown> = {
  value: T;
  expiresAt: number;
};

/** Close handler for data stream writers. */
export type CloseHandler = () => void;

// =============================================================================
// SESSION IDENTITY TYPES (from cloaking/plugins/sessionIdentity.ts)
// =============================================================================

/** Cached session entry with TTL for the SessionIdentity cloaking plugin. */
export type CachedSession = {
  userId: string;
  expiresAt: number;
};

// =============================================================================
// PROXY ROUTING POLICY TYPES (from routingPolicy.ts)
// =============================================================================

/** Model tier classification for proxy routing decisions. */
export type ClaudeProxyModelTier = "opus" | "sonnet" | "haiku" | "other";

/** A single provider attempt in the proxy translation plan. */
export type ProxyTranslationAttempt = {
  provider?: string;
  model?: string;
  label: string;
};

/** Ordered plan of provider attempts for a proxy request. */
export type ProxyTranslationPlan = {
  requestedModel: string;
  modelTier: ClaudeProxyModelTier;
  attempts: ProxyTranslationAttempt[];
  skipped: never[];
};

// =============================================================================
// PROXY HEALTH / READINESS TYPES (from proxyHealth.ts)
// =============================================================================

/** Mutable readiness state tracked by the proxy process. */
export type ProxyReadinessState = {
  startTimeMs: number;
  acceptingConnections: boolean;
  ready: boolean;
  readyAtMs?: number;
};

/** Structured response returned by the proxy /health endpoint. */
export type ProxyHealthResponse = {
  status: "ok" | "starting";
  ready: boolean;
  acceptingConnections: boolean;
  strategy: string;
  passthrough: boolean;
  version: string;
  startedAt: string;
  readyAt: string | null;
  uptime: number;
  healthPath: "/health";
  statusPath: "/status";
};

export type ProxyPaths = {
  /** Base directory for proxy state files */
  stateDir: string;
  /** logs/ — request/response logs */
  logsDir: string;
  /** account-quotas.json — per-account rate limit state */
  quotaFile: string;
  /** Whether this is a dev-mode isolated instance */
  isDev: boolean;
};

// =============================================================================
// PROXY TRACER TYPES (from proxy/proxyTracer.ts)
// =============================================================================

/** OTel metric instruments used by the proxy tracer. */
export type ProxyMetrics = {
  requestsTotal: Counter;
  requestDuration: Histogram;
  tokensInput: Counter;
  tokensOutput: Counter;
  tokensCacheRead: Counter;
  tokensCacheCreation: Counter;
  tokensReasoning: Counter;
  costTotal: Counter;
  errorsTotal: Counter;
  retriesTotal: Counter;
  modelSubstitutionTotal: Counter;
  requestBodySize: Histogram;
  responseBodySize: Histogram;
  fallbackAttemptsTotal: Counter;
  fallbackSuccessTotal: Counter;
  fallbackFailureTotal: Counter;
};

/** Context for a proxy request at the root span level. */
export type ProxyRequestContext = {
  requestId: string;
  method: string;
  path: string;
  model: string;
  stream: boolean;
  toolCount: number;
  sessionId?: string;
  userAgent?: string;
  clientApp?: string;
};

/** Context recorded when an account is selected for a proxy request. */
export type AccountSelectionContext = {
  strategy: string;
  accountsTotal: number;
  accountsHealthy: number;
  selectedAccount: string;
  accountType: string;
  rateLimitBefore5h?: number;
  rateLimitBefore7d?: number;
};

/** Context for a single upstream attempt (one per retry). */
export type UpstreamAttemptContext = {
  attempt: number;
  account: string;
  polyfillHeaders: boolean;
  polyfillBody: boolean;
  upstreamUrl: string;
};

/** Token usage and rate-limit utilisation recorded at end of request. */
export type UsageContext = {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  reasoningTokens?: number;
  rateLimitAfter5h?: number;
  rateLimitAfter7d?: number;
};

// =============================================================================
// PROXY ENV TYPES (from proxy/proxyEnv.ts)
// =============================================================================

/** Where a proxy env file path was sourced from. */
export type ProxyEnvSource = "cli" | "environment" | "default" | "none";

/** Result of resolving which proxy env file to load. */
export type ProxyEnvResolution = {
  path?: string;
  source: ProxyEnvSource;
  required: boolean;
};

/** Result of loading the proxy env file. */
export type ProxyEnvLoadResult = {
  loaded: boolean;
  path?: string;
  source: ProxyEnvSource;
};

/** Options controlling proxy env file resolution. */
export type ProxyEnvOptions = {
  explicitEnvFile?: string;
  env?: NodeJS.ProcessEnv;
  homeDir?: string;
};

// =============================================================================
// PROXY FETCH TYPES (from proxy/proxyFetch.ts)
// =============================================================================

/** Snapshot of proxy-related environment variables captured at startup. */
export type ProxyEnvironmentSnapshot = {
  httpsProxy?: string;
  httpProxy?: string;
  allProxy?: string;
  socksProxy?: string;
  noProxy?: string;
};

// =============================================================================
// QUIET DETECTOR (from proxy/quietDetector.ts)
// =============================================================================

/** Result of a traffic-quiet check. */
export type QuietStatus = {
  isQuiet: boolean;
  lastActivityAt: Date | null;
  silenceDurationMs: number;
};

// =============================================================================
// RAW STREAM CAPTURE (from proxy/rawStreamCapture.ts)
// =============================================================================

/** Accumulated upstream body capture from a raw stream. */
export type RawStreamCapture = {
  totalBytes: number;
  text: string;
  truncated: boolean;
};

/** Transformed stream pair used to capture upstream bodies without buffering. */
export type RawStreamCaptureResult = {
  stream: TransformStream<Uint8Array, Uint8Array>;
  capture: Promise<RawStreamCapture>;
};

// =============================================================================
// REQUEST LOGGER (from proxy/requestLogger.ts)
// =============================================================================

/** Single captured body/headers entry written to disk by the proxy logger. */
export type ProxyBodyCaptureEntry = {
  timestamp: string;
  requestId: string;
  phase: string;
  model: string;
  stream: boolean;
  headers?: Record<string, string>;
  body?: unknown;
  bodySize?: number;
  contentType?: string;
  responseStatus?: number;
  durationMs?: number;
  account?: string;
  accountType?: string;
  attempt?: number;
  traceId?: string;
  spanId?: string;
  metadata?: Record<string, unknown>;
};

/** Persisted artifact produced when a body is stored to disk. */
export type StoredBodyArtifact = {
  bodyPath?: string;
  bodySha256?: string;
  redactedBodyBytes?: number;
  storedFileBytes?: number;
  redactedBody?: string;
  bodyTruncated?: boolean;
};

/** File the proxy logger tracks for rotation and cleanup. */
export type ManagedLogFile = {
  path: string;
  mtime: number;
  size: number;
};

// =============================================================================
// SSE INTERCEPTOR (from proxy/sseInterceptor.ts)
// =============================================================================

/** Individual content block observed during an SSE stream. */
export type SSEContentBlock = {
  index: number;
  type: "text" | "thinking" | "tool_use" | "tool_result";
  /** Accumulated text for text blocks. Capped at MAX_BLOCK_CONTENT_BYTES. */
  text?: string;
  /** Accumulated thinking content. Capped at MAX_BLOCK_CONTENT_BYTES. */
  thinking?: string;
  /** Tool name for tool_use blocks. */
  toolName?: string;
  /** Tool call id for tool_use blocks. */
  toolId?: string;
  /** Accumulated partial JSON input for tool_use blocks. Capped at MAX_BLOCK_CONTENT_BYTES. */
  toolInput?: string;
};

/** Aggregated telemetry resolved when an SSE stream completes. */
export type SSETelemetry = {
  messageId: string;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cacheCreationInputTokens: number;
    cacheReadInputTokens: number;
    totalTokens: number;
  };
  contentBlocks: SSEContentBlock[];
  stopReason: string | null;
  stopSequence: string | null;
  eventCount: number;
  streamDurationMs: number;
  totalBytesReceived: number;
  events: Array<{ type: string; timestamp: number; data: string }>;
  rawText?: string;
};

/** Mutable accumulator the SSE interceptor uses internally. */
export type TelemetryAccumulator = {
  messageId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens: number;
  cacheReadInputTokens: number;
  contentBlocks: SSEContentBlock[];
  blockByteCounts: Map<number, number>;
  stopReason: string | null;
  stopSequence: string | null;
  eventCount: number;
  startTime: number;
  totalBytesReceived: number;
  events: Array<{ type: string; timestamp: number; data: string }>;
  rawTextChunks?: string[];
  rawTextBytes: number;
  rawTextTruncated: boolean;
  eventLogTruncated: boolean;
};

/** Result of createSSEInterceptor: the pass-through stream and a telemetry promise. */
export type SSEInterceptorResult = {
  stream: TransformStream<Uint8Array, Uint8Array>;
  telemetry: Promise<SSETelemetry>;
};

/** Options for createSSEInterceptor. */
export type SSEInterceptorOptions = {
  captureRawText?: boolean;
};

// =============================================================================
// UPDATE CHECKER (from proxy/updateChecker.ts, proxy/updateState.ts)
// =============================================================================

/** Outcome of a proxy auto-update version check against npm. */
export type UpdateCheckResult = {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
};

/** Parsed major.minor.patch components of a semver string. */
export type SemVer = {
  major: number;
  minor: number;
  patch: number;
};

/** Entry describing a version suppressed from auto-update. */
export type SuppressedVersion = {
  suppressedAt: string;
  reason: string;
};

/** Persisted state for the proxy auto-update feature. */
export type UpdateState = {
  lastCheckAt: string;
  lastCheckVersion: string;
  suppressedVersions: Record<string, SuppressedVersion>;
  lastUpdateAt: string | null;
  lastUpdateVersion: string | null;
};

// =============================================================================
// YAML LOADER (from proxy/proxyConfig.ts)
// =============================================================================

/** Shape of the dynamically-imported js-yaml module. `dump` is optional —
 *  read-only consumers (proxy config loader) only need `load`; writers
 *  (CLI primary-account commands) check `dump` before calling. */
export type YamlModule = {
  load(content: string): unknown;
  dump?: (obj: unknown, opts?: Record<string, unknown>) => string;
  default?: {
    load(content: string): unknown;
    dump?: (obj: unknown, opts?: Record<string, unknown>) => string;
  };
};

/** Snapshot of a parsed proxy config file used by CLI primary-account
 *  read/edit/write helpers. Tracks the original format and whether comments
 *  were present (so the CLI can warn that comments will not round-trip). */
export type CliProxyConfigDoc = {
  data: Record<string, unknown>;
  format: "yaml" | "json";
  hadComments: boolean;
};

/** Primary-account info exposed by the proxy `/status` endpoint.
 *  `source` is "configured" when the operator's `routing.primaryAccount` is
 *  authenticated and enabled, otherwise "fallback" — either no primary set
 *  or the configured one is missing/disabled. */
export type ProxyStatusPrimaryAccount = {
  configured: string | null;
  key: string | null;
  label: string | null;
  source: "configured" | "fallback";
};

// =============================================================================
// CLAUDE SNAPSHOT (from server/routes/claudeProxyRoutes.ts)
// =============================================================================

/** Parsed fields captured from a Claude Code client request body. */
export type ClaudeSnapshotBody = {
  metadataUserId?: string;
  billingHeader?: string;
  agentBlock?: string;
  sessionId?: string;
};

/** Snapshot of headers and body from a Claude Code request, used for polyfill. */
export type ClaudeSnapshot = {
  accountKey: string;
  capturedAt: string;
  source: "claude-code";
  headers: Record<string, string>;
  body?: ClaudeSnapshotBody;
};

/** Parsed shape of a Claude API error body. */
export type ParsedClaudeError = {
  errorType?: string;
  message?: string;
};

// =============================================================================
// PROXY CLI COMMAND TYPES (from cli/commands/proxy.ts)
// =============================================================================

/** ora spinner instance held by proxy CLI commands, nullable when --quiet. */
export type ProxySpinner = Ora | null;

/** Load-balancing strategy used by the proxy across accounts. */
export type ProxyStartStrategy = "round-robin" | "fill-first";

/** Alias for the model router's constructor configuration. */
export type ProxyModelRouterConfig = ProxyRoutingConfig;

/** Partial proxy config consumed by the start command. */
export type LoadedProxyConfig = {
  routing?: Partial<ProxyModelRouterConfig> & {
    strategy?: ProxyStartStrategy;
  };
};

/**
 * Handle for a NeuroLink runtime created by the proxy start command.
 * The `neurolink` field is typed structurally (only the method used by the
 * proxy layer is exposed) so types/proxy.ts does not depend on the full
 * NeuroLink class.
 */
export type ProxyNeurolinkRuntime = {
  neurolink: {
    getToolRegistry(): MCPToolRegistry;
  };
  cleanupLogs: (daysToKeep?: number, maxFiles?: number) => void;
};

/** Hono app + readiness state created by the proxy start command. */
export type ProxyStartApp = {
  app: Hono;
  readiness: ProxyReadinessState;
};

/** Stats shape consumed by the proxy status printer. */
export type StatusStats = {
  totalAttempts?: number;
  totalRequests: number;
  totalSuccess: number;
  totalErrors: number;
  totalRateLimits: number;
  accounts?: {
    label: string;
    type: string;
    attempts?: number;
    requests?: number;
    success?: number;
    errors?: number;
    rateLimits?: number;
    cooling: boolean;
  }[];
};

/** Sub-action of the `proxy telemetry` CLI command. */
export type ProxyTelemetryAction =
  | "setup"
  | "start"
  | "stop"
  | "status"
  | "logs"
  | "import-dashboard";
