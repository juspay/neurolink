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
  ACCOUNT_COOLING_REASONS,
  PROXY_ACCOUNT_TYPES,
  PROXY_ACCOUNT_ROUTING_MODES,
  PROXY_ACCOUNT_ROUTING_REASONS,
  PROXY_ACCOUNT_ROUTING_STRATEGIES,
} from "../proxy/routingEvidence.js";
import type {
  FallbackEntry,
  ModelMapping,
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
  isAutoFallbackEnabled?(): boolean;
  getMaxInflightPerAccount?(): number | undefined;
  getModelMappings?: () => ModelMapping[];
  getPassthroughModels?: () => string[];
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

export type ProxyAccountRoutingStrategy =
  (typeof PROXY_ACCOUNT_ROUTING_STRATEGIES)[number];

export type ProxyAccountRoutingMode =
  (typeof PROXY_ACCOUNT_ROUTING_MODES)[number];

export type ProxyAccountRoutingReason =
  (typeof PROXY_ACCOUNT_ROUTING_REASONS)[number];

export type ProxyAccountType = (typeof PROXY_ACCOUNT_TYPES)[number];

export type ProxyAccountRoutingCandidate = {
  account: string;
  accountType: ProxyAccountType;
  sourceIndex: number;
  rank: number;
  configuredPrimary: boolean;
  usable: boolean;
  saturated: boolean;
  quotaObserved: boolean;
  quotaLastUpdated: number | null;
  quotaAgeMs: number | null;
  coolingActive: boolean;
  coolingReason: AccountCoolingReason | null;
  coolingUntil: number | null;
  unifiedStatus: string | null;
  fallbackStatus?: string | null;
  upgradePaths?: string | null;
  overageEligible?: boolean;
  overageStatus: string | null;
  sessionStatus: string | null;
  sessionUsed: number | null;
  sessionResetAt: number | null;
  sessionResetBucket: number | null;
  weeklyStatus: string | null;
  weeklyUsed: number | null;
  weeklyResetAt: number | null;
};

export type ProxyAccountRoutingDecision = {
  schemaVersion: 1;
  evaluatedAt: string;
  strategy: ProxyAccountRoutingStrategy;
  mode: ProxyAccountRoutingMode;
  selectionReason: ProxyAccountRoutingReason;
  quotaRoutingEnabled: boolean;
  quotaInputsUsed: boolean;
  sessionSoftLimit: number;
  sessionResetToleranceMs: number;
  configuredPrimaryAccount: string | null;
  configuredPrimaryMatched: boolean;
  rotationOffset: number;
  initialAccount: string;
  candidates: ProxyAccountRoutingCandidate[];
};

export type ProxyAccountSortMetrics = {
  usable: boolean;
  saturated: boolean;
  hasQuota: boolean;
  quotaLastUpdated: number | null;
  quotaAgeMs: number | null;
  coolingActive: boolean;
  coolingReason: AccountCoolingReason | null;
  coolingUntil: number;
  unifiedStatus: string | null;
  fallbackStatus?: string | null;
  upgradePaths?: string | null;
  overageEligible?: boolean;
  overageStatus: string | null;
  sessionStatus: string | null;
  sessionUsed: number | null;
  sessionResetBucket: number;
  sessionReset: number;
  weeklyStatus: string | null;
  weeklyReset: number;
  weeklyUsed: number | null;
  weeklyUsedForSort: number;
};

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
  /** Low-level transport code such as ETIMEDOUT or EADDRNOTAVAIL. */
  errorCode?: string;
  inputTokens?: number;
  outputTokens?: number;
  cacheCreationTokens?: number;
  cacheReadTokens?: number;
  /** OTel trace ID for correlation with distributed traces */
  traceId?: string;
  /** OTel span ID for correlation with distributed traces */
  spanId?: string;
  /** Exact secret-free inputs and result of initial account selection. */
  routingDecision?: ProxyAccountRoutingDecision;
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
  /** End-to-end request age when this attempt completed. */
  responseTimeMs: number;
  /** Time spent in this specific account attempt. */
  attemptDurationMs?: number;
  errorType?: string;
  errorMessage?: string;
  /** Low-level transport code such as ETIMEDOUT or EADDRNOTAVAIL. */
  errorCode?: string;
  /** Whether this failed attempt may be retried without changing the request. */
  retryable?: boolean;
  /** Distinguishes short-lived admission throttles from exhausted quota windows. */
  rateLimitKind?: "transient" | "quota";
  /** Reset-aware cooldown reason selected for a rate-limited attempt. */
  cooldownReason?: "transient" | "session" | "weekly" | "unified";
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

export type RoutedClaudeRequestRuntimeContext = ClaudeRequestRuntimeContext & {
  setRoutingDecision: (decision: ProxyAccountRoutingDecision) => void;
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
    retryable?: boolean;
    /** Low-level transport code such as ETIMEDOUT or EADDRNOTAVAIL. */
    errorCode?: string;
    rateLimitKind?: "transient" | "quota";
    cooldownReason?: "transient" | "session" | "weekly" | "unified";
    /** Override for nested retries whose attempt starts after this logger. */
    attemptDurationMs?: number;
    /** Override used when one account selection performs an OAuth retry fetch. */
    attempt?: number;
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
  authCooldownMessage: string | null;
  fallbackFailureMessage?: string;
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
  | {
      retryNextAccount: true;
      failure?: { message: string; rateLimit: boolean };
    }
  | { response: Response | unknown; holdsAccountAdmission?: boolean };

/** A release handle for one in-flight request admitted to an OAuth account. */
export type AccountAdmissionLease = { release(): void };

/** A cancellable queued request for per-account admission capacity. */
export type QueuedAccountAdmission = {
  accountKey: string;
  promise: Promise<AccountAdmissionLease>;
  cancel(): void;
};

/** One queued request waiting for per-account admission capacity. */
export type AccountAdmissionWaiter = {
  capacity: number;
  resolve: (lease: AccountAdmissionLease) => void;
};

/** In-process request admission state for an OAuth account. */
export type AccountAdmissionState = {
  active: number;
  waiters: AccountAdmissionWaiter[];
};

/** Result of buffering only enough upstream SSE to make a retry-safe decision. */
export type AnthropicStreamPreflightResult =
  | { kind: "ready"; chunks: Uint8Array[] }
  | { kind: "empty"; chunks: Uint8Array[] }
  | { kind: "transport_error"; chunks: Uint8Array[]; error: unknown }
  | {
      kind: "sse_error";
      chunks: Uint8Array[];
      errorType: string;
      message: string;
    };

/** One complete Server-Sent Event extracted from an incremental buffer. */
export type ParsedSSEEvent = { event: string; data: string };

/** Complete SSE events plus the trailing partial frame. */
export type ParsedSSEBuffer = {
  events: ParsedSSEEvent[];
  remainder: string;
};

export type AnthropicAuthRetryResult = {
  response?: Response | unknown;
  holdsAccountAdmission?: boolean;
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

/** How to cool an account after a genuine (non-anti-abuse) 429, derived from
 *  the response's quota headers + retry-after. */
export type RateLimitCoolingReason = Exclude<AccountCoolingReason, "auth">;

export type AccountCooldownPlan = {
  reason: RateLimitCoolingReason;
  /** Epoch-ms until which the account should not be used. */
  coolingUntil: number;
  /** When true (unified/5h/7d rejected), rotate immediately — retrying the
   *  same account is futile until its window resets. When false (transient
   *  burst), a small number of jittered same-account retries is allowed first. */
  rotateImmediately: boolean;
};

export type ProxyQuotaCooldownUpdate =
  | {
      kind: "cooled";
      coolingUntil: number;
      coolingReason: AccountCoolingReason;
    }
  | { kind: "cleared"; coolingUntil: number }
  | null;

export type TransientRateLimitRetryBudget = {
  coolingUntil: number;
  retriesClaimed: number;
};

export type AnthropicUpstreamFetchResult = {
  continueLoop: boolean;
  retrySameAccount?: boolean;
  /** When set, the caller should wait this many ms before retrying (from upstream retry-after). */
  retryAfterMs?: number;
  /** Set on a genuine 429: how long / why to cool this account before rotating. */
  cooldownPlan?: AccountCooldownPlan;
  /** Quota snapshot parsed from the response headers (429 or success), if present. */
  quota?: AccountQuota;
  /** A terminal upstream rejection already captured and classified by the
   *  fetch layer. The route must finalize it directly instead of feeding it
   *  through the generic non-OK handler a second time. */
  terminalError?: {
    status: number;
    body: string;
    headers: Record<string, string>;
    errorType: "construction_rejection";
  };
  response?: Response;
  lastError: unknown;
  sawRateLimit: boolean;
  sawNetworkError: boolean;
  upstreamSpan?: Span;
};

// =============================================================================
// USAGE STATS TYPES (from usageStats.ts)
// =============================================================================

export type ProxyTerminalErrorCategory =
  | "authentication"
  | "client_cancelled"
  | "fallback_exhausted"
  | "invalid_request"
  | "proxy_error"
  | "rate_limit"
  | "stream_error"
  | "unclassified"
  | "upstream_error"
  | "other";

/** Compact, redacted terminal failure retained independently of body logs. */
export type ProxyTerminalErrorSummary = {
  id: string;
  at: number;
  status: number;
  category: ProxyTerminalErrorCategory;
  requestId?: string;
  account?: string;
  accountType?: string;
  errorType?: string;
  errorCode?: string;
  terminalOutcome?: string;
  message?: string;
};

/** Optional terminal context supplied when a final request error is recorded. */
export type ProxyTerminalErrorDetails = {
  requestId?: string;
  errorType?: string;
  errorCode?: string;
  terminalOutcome?: string;
  message?: string;
};

export type AccountStats = {
  label: string;
  type: string;
  attemptCount: number;
  /** Failed upstream attempts, including retries that later recovered. */
  attemptErrorCount: number;
  /** Final requests successfully completed by this account. */
  successCount: number;
  /** Final requests that terminated as errors on this account. */
  errorCount: number;
  /** All upstream attempts that returned 429. */
  rateLimitCount: number;
  transientRateLimitCount: number;
  quotaRateLimitCount: number;
  lastAttemptAt: number;
  lastErrorAt?: number;
};

export type ProxyStats = {
  startedAt: number;
  totalAttempts: number;
  totalAttemptErrors: number;
  totalRequests: number;
  totalSuccess: number;
  totalErrors: number;
  totalRateLimits: number;
  totalTransientRateLimits: number;
  totalQuotaRateLimits: number;
  accounts: Record<string, AccountStats>;
};

/** Bounded terminal-error state stored separately from counters and body logs. */
export type ProxyTerminalErrorJournal = {
  startedAt: number;
  totalErrors: number;
  counts: Record<ProxyTerminalErrorCategory, number>;
  recent: ProxyTerminalErrorSummary[];
};

export type ProxyUsageStatsSnapshot = {
  stats: ProxyStats;
  statsVersion: number;
  terminalErrors: ProxyTerminalErrorJournal;
  terminalErrorsVersion: number;
};

/** Durability and reconciliation state for the proxy usage counters. */
export type ProxyStatsPersistenceStatus = {
  enabled: boolean;
  filePath: string | null;
  revision: number;
  pendingMutations: number;
  inFlightMutations: number;
  unpersistedMutations: number;
  lastFlushedAt: number | null;
  lastReconciledAt: number | null;
  lastRecoveryAt: number | null;
  lastError: string | null;
  terminalErrorsFilePath?: string | null;
  terminalErrorsRevision?: number;
  terminalErrorsPending?: number;
  terminalErrorsInFlight?: number;
  terminalErrorsUnpersisted?: number;
  terminalErrorsLastFlushedAt?: number | null;
  terminalErrorsLastRecoveryAt?: number | null;
  terminalErrorsLastError?: string | null;
};

/** Versioned on-disk snapshot shared by overlapping proxy workers. */
export type PersistedProxyStatsSnapshot = {
  schemaVersion: 1;
  revision: number;
  updatedAt: number;
  stats: ProxyStats;
};

/** Versioned terminal-error snapshot isolated from rolling-worker counter writes. */
export type PersistedProxyTerminalErrorSnapshot = {
  schemaVersion: 1;
  revision: number;
  updatedAt: number;
  journal: ProxyTerminalErrorJournal;
};

/** Ownership metadata for the proxy statistics cross-process lock. */
export type ProxyStatsLockOwner = {
  token: string;
  pid: number;
  acquiredAt: number;
};

/** Construction options for an isolated proxy statistics store. */
export type ProxyUsageStatsStoreOptions = {
  filePath?: string;
  terminalErrorsFilePath?: string;
  flushIntervalMs?: number;
  lockTimeoutMs?: number;
  staleLockMs?: number;
  now?: () => number;
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

/** Result shared by callers waiting on the same rotating refresh token. */
export type SharedRefreshResult = {
  result: RefreshResult;
  token: string;
  refreshToken?: string;
  expiresAt?: number;
};

export type TokenPersistTarget =
  | string
  | { credPath: string }
  | { providerKey: string };

// =============================================================================
// ACCOUNT QUOTA TYPES (from accountQuota.ts)
// =============================================================================

export type AccountQuota = {
  /** Top-level unified status. A rejected value can be authoritative even
   *  while both 5h and 7d sub-window statuses still report allowed. */
  unifiedStatus?: string;
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
  /** Provider fallback availability, for example "available". */
  fallbackStatus?: string;
  /** Comma-separated provider upgrade paths, for example "overage". */
  upgradePaths?: string;
  /** "allowed" | "rejected" */
  overageStatus: string;
  /** Epoch ms when we last captured this data */
  lastUpdated: number;
};

// =============================================================================
// CLAUDE PROXY ROUTE TYPES (from claudeProxyRoutes.ts)
// =============================================================================

/** Why an account is currently cooling. Drives cooldown duration and logging.
 *  - "weekly"    : 7d unified limit rejected — cool until the weekly reset.
 *  - "session"   : 5h unified limit rejected — cool until the session reset.
 *  - "unified"   : top-level unified limit rejected — cool for retry-after.
 *  - "transient" : short per-minute/burst 429 — cool for retry-after only.
 *  - "auth"      : transient refresh failure with bounded backoff. */
export type AccountCoolingReason = (typeof ACCOUNT_COOLING_REASONS)[number];

/** Restart-safe cooldown snapshot for one account. */
export type PersistedAccountCooldown = {
  coolingUntil: number;
  reason: AccountCoolingReason;
  updatedAt: number;
};

/** Normalized Anthropic account keys eligible for proxy routing. */
export type AccountAllowlist = ReadonlySet<string>;

/** Runtime state for a proxy account. */
export type RuntimeAccountState = {
  consecutiveRefreshFailures: number;
  permanentlyDisabled: boolean;
  lastToken?: string;
  lastRefreshToken?: string;
  /** Epoch-ms timestamp until which the account should not be used for new
   *  requests. Set from the actual Anthropic reset/retry window or from
   *  bounded refresh backoff. Other requests arriving during this window skip
   *  the account rather than hammering it. */
  coolingUntil?: number;
  /** Why the account is cooling (set alongside coolingUntil). */
  coolingReason?: AccountCoolingReason;
  /** Latest quota snapshot parsed from Anthropic `anthropic-ratelimit-unified-*`
   *  headers on ANY response (success or 429). Drives proactive, reset-aware
   *  selection so we don't have to eat a 429 to discover an account is spent. */
  quota?: AccountQuota;
};

/** A passthrough account used in the proxy route handler. */
export type ProxyPassthroughAccount = {
  key: string;
  label: string;
  token: string;
  refreshToken?: string;
  expiresAt?: number;
  type: ProxyAccountType;
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
  /** True only while the updater is draining inference traffic. */
  drainingForUpdate: boolean;
  readyAtMs?: number;
};

/** Structured response returned by the proxy /health endpoint. */
export type ProxyHealthResponse = {
  status: "ok" | "starting";
  ready: boolean;
  acceptingConnections: boolean;
  drainingForUpdate: boolean;
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
  /** account-cooldowns.json — restart-safe account cooldown state */
  cooldownFile: string;
  /** proxy-usage-stats.json — restart- and handoff-safe usage counters */
  statsFile?: string;
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
  /** Names of the tools advertised in the request (what the caller exposed). */
  toolNames?: string[];
  sessionId?: string;
  userAgent?: string;
  clientApp?: string;
};

/** Response-side details parsed from the upstream reply (model, finish, tools). */
export type ResponseInfoContext = {
  responseModel?: string;
  finishReason?: string;
  stopSequence?: string;
  /** Names of the tools the model actually invoked (tool_use blocks). */
  toolCalls?: string[];
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

/** In-process proxy request activity used to protect streaming restarts. */
export type ProxyActivitySnapshot = {
  activeRequests: number;
  lastActivityAt: Date | null;
};

/** Activity payload exposed by the running proxy status endpoint. */
export type ProxyRuntimeActivity = {
  activeRequests: number;
  lastActivityAt: string | null;
};

/** Terminal state observed while the HTTP adapter relays a response body. */
export type ProxyResponseTerminalOutcome =
  | "completed"
  | "bodyless"
  | "client_cancelled"
  | "stream_error";

/** Non-blocking callbacks for response lifecycle metadata. */
export type ProxyResponseTrackingObserver = {
  onFirstChunk?: (details: {
    /** Decoded response-body bytes observed by the adapter. */
    observedBodyBytes: number;
    responseChunks: 1;
  }) => void;
  onTerminal?: (details: {
    outcome: ProxyResponseTerminalOutcome;
    /** Decoded response-body bytes observed by the adapter. */
    observedBodyBytes: number;
    responseChunks: number;
  }) => void;
};

/** Versioned lifecycle event names persisted by the proxy adapter. */
export type ProxyLifecycleEventName =
  | "request_accepted"
  | "response_headers"
  | "response_first_chunk"
  | "request_terminal";

/** Client-facing terminal classifications recorded by lifecycle metadata. */
export type ProxyLifecycleTerminalOutcome =
  | ProxyResponseTerminalOutcome
  | "handler_error";

/** Content-free lifecycle event accepted by the bounded metadata logger. */
export type ProxyLifecycleEventInput = {
  event: ProxyLifecycleEventName;
  requestId: string;
  method: string;
  path: string;
  model?: string;
  stream?: boolean;
  toolCount?: number;
  sessionHash?: string;
  requestBytes?: number;
  responseStatus?: number;
  /** Decoded response-body bytes observed by the adapter. */
  observedBodyBytes?: number;
  responseChunks?: number;
  elapsedMs?: number;
  terminalOutcome?: ProxyLifecycleTerminalOutcome;
  errorType?: string;
  errorCode?: string;
  timestampMs?: number;
  monotonicMs?: number;
};

/** Data-quality counters for the bounded lifecycle metadata sink. */
export type ProxyLifecycleLoggerSnapshot = {
  enabled: boolean;
  schemaVersion: number;
  processInstanceId: string;
  nextSequence: number;
  attempted: number;
  enqueued: number;
  written: number;
  dropped: number;
  queueDrops: number;
  invalidDrops: number;
  writeDrops: number;
  writeFailures: number;
  pending: number;
  inFlight: number;
  flushing: boolean;
};

/** Lifecycle logger configuration. Queue overrides are used by stress tests. */
export type ProxyLifecycleLoggerOptions = {
  enabled: boolean;
  logDir?: string;
  queueCapacity?: number;
  batchSize?: number;
  flushIntervalMs?: number;
};

/** Serialized lifecycle line awaiting a bounded batch write. */
export type QueuedProxyLifecycleEvent = {
  logDir: string;
  date: string;
  record: Record<string, unknown>;
};

/** Percentile summary used by offline proxy log analysis. */
export type ProxyLatencySummary = {
  count: number;
  p50: number | null;
  p95: number | null;
  p99: number | null;
  max: number | null;
};

/** Per-account request and rate-limit totals reconstructed from JSONL logs. */
export type ProxyAnalysisAccount = {
  account: string;
  accountType: string;
  attempts: number;
  attemptErrors: number;
  finalRequests: number;
  finalErrors: number;
  transientRateLimits: number;
  quotaRateLimits: number;
  unclassifiedRateLimits: number;
};

/** Offline report generated from proxy request, attempt, and lifecycle logs. */
export type ProxyAnalysisStreamName =
  | "lifecycle"
  | "requests"
  | "attempts"
  | "debug";

export type ProxyAnalysisReport = {
  generatedAt: string;
  since: string;
  until: string;
  logsDir: string;
  files: {
    lifecycle: number;
    requests: number;
    attempts: number;
    debug: number;
  };
  coverage: {
    lifecycle: boolean;
    finalRequests: boolean;
    attempts: boolean;
    attemptLatency: boolean;
    cacheUsage: boolean;
    routingDecisions: boolean;
  };
  dataQuality: {
    linesRead: number;
    malformedLines: number;
    unsupportedLifecycleLines: number;
    lifecycleSequenceGaps: number;
    lifecycleSequenceDuplicates: number;
    streams: Record<
      ProxyAnalysisStreamName,
      {
        observedFrom: string | null;
        observedTo: string | null;
        startsAtOrBeforeRequestedWindow: boolean;
      }
    >;
    bodyArtifacts: {
      capturesIndexed: number;
      artifactsReferenced: number;
      artifactsPresent: number;
      artifactsMissing: number;
      invalidPaths: number;
      writeFailures: number;
      truncatedCaptures: number;
    };
    routingDecisions: {
      valid: number;
      invalid: number;
      absent: number;
    };
  };
  lifecycle: {
    accepted: number;
    headers: number;
    firstChunks: number;
    terminal: number;
    unsettled: number;
    terminalOutcomes: Record<string, number>;
    errorTypes: Record<string, number>;
    errorCodes: Record<string, number>;
  };
  requests: {
    completed: number;
    success: number;
    errors: number;
    finalRateLimits: number;
    recoveredAfterRetry: number;
    errorTypes: Record<string, number>;
    errorCodes: Record<string, number>;
  };
  attempts: {
    total: number;
    errors: number;
    errorTypes: Record<string, number>;
    errorCodes: Record<string, number>;
  };
  rateLimits: {
    attemptRateLimits: number;
    transient: number;
    quota: number;
    unclassified: number;
  };
  latencyMs: {
    headers: ProxyLatencySummary;
    firstChunk: ProxyLatencySummary;
    terminal: ProxyLatencySummary;
    finalRequest: ProxyLatencySummary;
    attempt: ProxyLatencySummary;
    singleAttemptDelta: ProxyLatencySummary;
  };
  cache: {
    requestsWithUsage: number;
    requestsWithCacheRead: number;
    cacheReadTokens: number;
    cacheCreationTokens: number;
    inputTokens: number;
    requestHitRate: number | null;
  };
  routing: {
    modes: Record<string, number>;
    selectionReasons: Record<string, number>;
    initialAccounts: Record<string, number>;
    finalAccountChanges: number;
    finalOutsideCandidateSet: number;
    /** Number of routing decisions aggregated before sampling records. */
    totalRecords: number;
    /** Most recent bounded sample retained for offline inspection. */
    records: ProxyAnalysisRoutingRecord[];
  };
  accounts: ProxyAnalysisAccount[];
};

/** Inputs for the offline proxy JSONL analyzer. */
export type ProxyAnalysisOptions = {
  logsDir?: string;
  since?: string;
  until?: string;
  nowMs?: number;
};

/** Attempt timing retained while joining offline proxy log records. */
export type ProxyAnalysisAttemptRecord = {
  count: number;
  hadError: boolean;
  totalDurationMs: number;
  durationCount: number;
};

/** Final request fields retained while joining offline proxy log records. */
export type ProxyAnalysisFinalRequestRecord = {
  timestamp: string;
  status: number;
  durationMs: number | null;
  account: string;
  accountType: string;
  inputTokens: number | null;
  cacheReadTokens: number | null;
  cacheCreationTokens: number | null;
  errorType: string | null;
  errorCode: string | null;
  routingDecision: ProxyAccountRoutingDecision | null;
};

/** Validated account-routing evidence joined to a final request log. */
export type ProxyAnalysisRoutingRecord = {
  requestId: string;
  timestamp: string;
  responseStatus: number;
  finalAccount: string;
  finalAccountType: string;
  decision: ProxyAccountRoutingDecision;
};

/** Request metadata retained by the HTTP adapter for terminal error logging. */
export type RuntimeRequestMetadata = {
  requestId: string;
  method: string;
  path: string;
  startedAt: number;
  model: string;
  stream: boolean;
  toolCount: number;
  /** Admission decision captured before an updater drain can race the route. */
  rejectForUpdate?: boolean;
  terminalErrorType?: string;
  terminalErrorCode?: string;
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

/** JSON object retained in deterministic proxy replay artifacts. */
export type ProxyReplayJsonRecord = Record<string, unknown>;

/** One verified body-capture record in a proxy replay bundle. */
export type ProxyReplayCapture = {
  timestamp: string;
  phase: string;
  attempt: number | null;
  model: string | null;
  stream: boolean | null;
  account: string | null;
  accountType: string | null;
  responseStatus: number | null;
  durationMs: number | null;
  contentType: string | null;
  headers: Record<string, string>;
  body: string | null;
  bodySha256: string | null;
  bodyTruncated: boolean;
  observedBodyBytes: number | null;
  metadata: ProxyReplayJsonRecord | null;
  source: {
    indexFile: string;
    indexLine: number;
    artifactPath: string | null;
  };
  issues: string[];
};

/** Deterministic, redacted reconstruction of one captured proxy request. */
export type ProxyReplayBundle = {
  schemaVersion: 1;
  kind: "neurolink.proxy.replay-bundle";
  requestId: string;
  selectedAttempt: number;
  source: {
    logsDirectory: string;
    indexFiles: string[];
  };
  completeness: {
    captures: number;
    phasesPresent: string[];
    missingRequiredPhases: string[];
    truncatedCaptures: number;
    artifactsWithIssues: number;
    replayable: boolean;
    blockers: string[];
  };
  request: {
    method: string;
    url: string | null;
    headers: Record<string, string>;
    requiredHeaderInputs: string[];
    body: string | null;
    bodySha256: string | null;
    bodyTruncated: boolean;
    contentType: string | null;
    account: string | null;
    accountType: string | null;
    model: string | null;
    stream: boolean | null;
  };
  capturedResponse: ProxyReplayCapture | null;
  captures: ProxyReplayCapture[];
};

/** Redacted direct-upstream response and comparison with captured evidence. */
export type ProxyReplayComparison = {
  schemaVersion: 1;
  kind: "neurolink.proxy.replay-comparison";
  requestId: string;
  selectedAttempt: number;
  endpoint: string;
  request: {
    method: string;
    headers: Record<string, string>;
    bodySha256: string;
    bodyBytes: number;
    usedBodyOverride: boolean;
  };
  captured: {
    status: number | null;
    contentType: string | null;
    bodySha256: string | null;
    bodyBytes: number | null;
    bodyTruncated: boolean;
    jsonShape: string[] | null;
  } | null;
  direct: {
    status: number;
    headers: Record<string, string>;
    contentType: string | null;
    body: string;
    bodySha256: string;
    observedBodyBytes: number;
    storedBodyBytes: number;
    bodyTruncated: boolean;
    timeToHeadersMs: number;
    totalMs: number;
    jsonShape: string[] | null;
  };
  comparison: {
    statusMatches: boolean | null;
    contentTypeMatches: boolean | null;
    bodyHashMatches: boolean | null;
    jsonShapeMatches: boolean | null;
  };
};

/** Inputs for deterministic proxy replay bundle export. */
export type ExportProxyReplayOptions = {
  requestId: string;
  logsDir?: string;
  attempt?: number;
};

/** Inputs for an explicitly authorized direct-upstream comparison. */
export type CompareProxyReplayOptions = {
  execute: boolean;
  headerValues?: Record<string, string>;
  bodyOverride?: string;
  urlOverride?: string;
  timeoutMs?: number;
  now?: () => number;
  fetchImpl?: typeof fetch;
};

/** Persisted artifact produced when a body is stored to disk. */
export type StoredBodyArtifact = {
  bodyPath?: string;
  bodySha256?: string;
  redactedBodyBytes?: number;
  storedFileBytes?: number;
  redactedBody?: string;
  bodyTruncated?: boolean;
  bodyWriteFailed?: boolean;
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
  /** Error carried as a terminal SSE `event: error`, if one was observed. */
  streamErrorMessage?: string;
  rawText?: string;
};

/** Terminal outcome of a response body after the HTTP headers were sent. */
export type StreamTerminalOutcome =
  | { kind: "completed" }
  | { kind: "upstream_error"; message: string }
  | { kind: "client_cancelled" };

/** First-writer-wins tracker for an upstream streaming response. */
export type StreamTerminalOutcomeTracker = {
  outcome: Promise<StreamTerminalOutcome>;
  complete: () => void;
  fail: (message: string) => void;
  cancel: () => void;
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
  streamErrorMessage?: string;
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
  /**
   * Last package version whose stable trampoline was successfully validated.
   *
   * Optional because `UpdateState` is part of the published type surface and a
   * required addition would break every downstream object literal — and because
   * state files written before this field existed legitimately omit it.
   * `loadUpdateState()` always materializes it, so runtime readers see a value.
   */
  installedVersion?: string | null;
  lastUpdateAt: string | null;
  lastUpdateVersion: string | null;
  /** Installed by the updater but not yet confirmed as the running version. */
  pendingRestartVersion: string | null;
  /** Why an available update has not yet reached a safe install/restart boundary. */
  deferredUpdate: {
    version: string;
    since: string;
    updatedAt: string;
    reason:
      | "waiting_for_quiet"
      | "draining"
      | "drain_timeout"
      | "drain_unavailable"
      | "activity_unavailable";
    activeRequests: number | null;
  } | null;
  /** Last updater failure, retained until a successful update or replacement. */
  lastFailure: {
    at: string;
    version: string;
    stage: "check" | "install" | "validation" | "restart" | "health";
    message: string;
  } | null;
};

/** Result from waiting for a non-disruptive updater execution window. */
export type ProxyUpdateWindowResult = {
  ready: boolean;
  draining: boolean;
  reason?: "stopping" | "parent_stopped" | "drain_failed" | "drain_timeout";
};

/** Dependencies and timing controls for the updater's safe-window coordinator. */
export type ProxyUpdateWindowOptions = {
  quietThresholdMs: number;
  quietWaitMs: number;
  drainWaitMs: number;
  pollIntervalMs: number;
  getActivity: () => Promise<ProxyRuntimeActivity | null>;
  setDraining: (draining: boolean) => Promise<boolean>;
  isStopping: () => boolean;
  isParentAlive: () => boolean;
  onPhase?: (
    phase: "waiting_for_quiet" | "draining" | "drain_timeout",
    activity: ProxyRuntimeActivity | null,
  ) => void;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
};

/** Result of validating a newly installed CLI through the stable trampoline. */
export type InstalledVersionValidation = {
  version?: string;
  attempts: number;
  failure?: string;
};

/** Supported global package managers for proxy self-updates. */
export type GlobalInstallerKind = "npm" | "pnpm";

/** Result of probing one global package-manager executable. */
export type GlobalInstallerProbe = {
  kind: GlobalInstallerKind;
  bin: string;
  version?: string;
  globalRoot?: string;
  globalBinDir?: string;
  working: boolean;
  installable: boolean;
  matchesCurrentInstall: boolean;
  reason?: string;
};

/** Selected package manager plus all candidates considered. */
export type GlobalInstallerResolution = {
  installer?: GlobalInstallerProbe;
  tried: GlobalInstallerProbe[];
};

/** Injectable command runner used by global-installer tests. */
export type GlobalInstallerExecFile =
  typeof import("node:child_process").execFileSync;

/** Overrides used while resolving the global package manager. */
export type ResolveGlobalInstallerOptions = {
  entryScript?: string;
  env?: NodeJS.ProcessEnv;
  homeDir?: string;
  execFileSync?: GlobalInstallerExecFile;
};

/** Options for validating a newly installed CLI through its stable executable. */
export type ValidateInstalledVersionOptions = {
  binPath: string;
  expectedVersion: string;
  maxAttempts?: number;
  delayMs?: number;
  timeoutMs?: number;
  execFileSync?: GlobalInstallerExecFile;
  sleep?: (ms: number) => Promise<void>;
};

/** Dependencies and callbacks used to supervise the updater worker process. */
export type UpdaterWorkerSupervisorOptions = {
  spawnWorker: () => number | undefined;
  isProcessRunning: (pid: number) => boolean;
  stopWorker: (pid: number) => void;
  onPidChange?: (pid: number | undefined) => void;
  log?: (message: string) => void;
  intervalMs?: number;
};

/** Handle used by the proxy process to inspect and stop updater supervision. */
export type UpdaterWorkerSupervisor = {
  currentPid: () => number | undefined;
  checkNow: () => number | undefined;
  stop: () => void;
};

// =============================================================================
// ROLLING PROXY WORKER HANDOFF
// =============================================================================

export type ProxyWorkerControlMessage =
  | { type: "proxy-worker:activate"; generation: number }
  | { type: "proxy-worker:drain"; generation: number }
  | { type: "proxy-worker:shutdown"; generation: number }
  | {
      type: "proxy-worker:socket-commit";
      generation: number;
      socketId: string;
    }
  | {
      type: "proxy-worker:socket-cancel";
      generation: number;
      socketId: string;
    };

export type ProxyWorkerStatusMessage =
  | {
      type: "proxy-worker:ready";
      generation: number;
      pid: number;
      version: string;
    }
  | {
      type: "proxy-worker:drained";
      generation: number;
      pid: number;
    }
  | {
      type: "proxy-worker:activated";
      generation: number;
      pid: number;
    }
  | {
      type: "proxy-worker:fatal";
      generation: number;
      pid: number;
      message: string;
    }
  | {
      type: "proxy-worker:socket-accepted";
      generation: number;
      pid: number;
      socketId: string;
    }
  | {
      type: "proxy-worker:replacement-requested";
      generation: number;
      pid: number;
      reason: "environment";
    };

export type ProxyWorkerSocketMessage = {
  type: "proxy-worker:socket";
  generation: number;
  socketId: string;
};

export type ProxyWorkerIpcMessage =
  | ProxyWorkerControlMessage
  | ProxyWorkerStatusMessage
  | ProxyWorkerSocketMessage;

export type TransferableProxySocket = Pick<
  import("node:net").Socket,
  "destroy" | "end" | "pause" | "resume" | "once"
>;

/** A transferred socket whose temporary handoff listeners can be detached. */
export type DetachableTransferableProxySocket = TransferableProxySocket &
  Pick<import("node:net").Socket, "off">;

export type RollingWorkerHandle = {
  pid: number;
  sendControl: (message: ProxyWorkerControlMessage) => void;
  sendSocket: (
    generation: number,
    socket: TransferableProxySocket,
    callback: (error?: Error | null) => void,
  ) => void;
  terminate: (signal?: NodeJS.Signals) => void;
  onMessage: (
    listener: (message: ProxyWorkerStatusMessage) => void,
  ) => () => void;
  onExit: (
    listener: (code: number | null, signal: string | null) => void,
  ) => () => void;
};

export type SpawnProxySocketWorkerOptions = {
  generation: number;
  expectedVersion: string;
  command: string;
  args: string[];
  env?: NodeJS.ProcessEnv;
  stdout?: "inherit" | "ignore";
  stderr?: "inherit" | "ignore";
  socketAckTimeoutMs?: number;
};

export type RollingWorkerFailureDetails = {
  workerPid?: number;
  workerExitCode?: number | null;
  workerExitSignal?: string | null;
  supervisorAction?: "none" | "sigkill_after_transfer_failure";
};

export type RollingWorkerSupervisorSnapshot = {
  generation: number;
  active: { pid: number; version: string; generation: number } | null;
  candidate: {
    pid: number;
    expectedVersion: string;
    generation: number;
  } | null;
  draining: Array<{ pid: number; version: string; generation: number }>;
  queuedSockets: number;
  rejectedSockets: number;
  failedTransfers: number;
  lastFailure:
    | ({
        at: string;
        generation: number;
        version: string;
        phase: "startup" | "activation" | "runtime" | "transfer";
        message: string;
      } & RollingWorkerFailureDetails)
    | null;
};

export type RollingWorkerSupervisorOptions = {
  spawnWorker: (
    generation: number,
    expectedVersion: string,
  ) => RollingWorkerHandle;
  readyTimeoutMs?: number;
  socketQueueLimit?: number;
  socketQueueTimeoutMs?: number;
  shutdownTimeoutMs?: number;
  onStateChange?: (snapshot: RollingWorkerSupervisorSnapshot) => void;
  onReplacementRequested?: (request: {
    generation: number;
    pid: number;
    reason: "environment";
  }) => void;
  log?: (message: string) => void;
};

export type RollingProxyServerOptions = {
  host: string;
  port: number;
  initialVersion: string;
  spawnWorker: (
    generation: number,
    expectedVersion: string,
  ) => RollingWorkerHandle;
  readyTimeoutMs?: number;
  socketQueueLimit?: number;
  socketQueueTimeoutMs?: number;
  shutdownTimeoutMs?: number;
  recoveryDelayMs?: number;
  maxRecoveryDelayMs?: number;
  onStateChange?: (snapshot: RollingWorkerSupervisorSnapshot) => void;
  log?: (message: string) => void;
};

export type RollingProxyServer = {
  address: { host: string; port: number };
  replace: (
    expectedVersion: string,
  ) => Promise<RollingWorkerSupervisorSnapshot>;
  snapshot: () => RollingWorkerSupervisorSnapshot;
  close: () => Promise<void>;
};

export type RollingManagedWorker = {
  handle: RollingWorkerHandle;
  generation: number;
  version: string;
  dispose: () => void;
  pendingTransfers: number;
  drainRequested: boolean;
};

export type RollingCandidateWorker = RollingManagedWorker & {
  expectedVersion: string;
  activationRequested: boolean;
  settle: (error?: Error) => void;
};

export type RollingQueuedSocket = {
  socket: TransferableProxySocket;
  timeout: NodeJS.Timeout;
};

export type SocketWorkerRuntime = {
  acceptSocket: (socket: TransferableProxySocket) => void;
  drain: () => void;
  close: () => void;
  snapshot: () => {
    draining: boolean;
    sockets: number;
    activeRequests: number;
    drained: boolean;
  };
};

export type SocketWorkerRuntimeOptions = {
  onDrained?: () => void;
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

/** Routing values captured once when a proxy request begins. */
export type ProxyRequestRoutingSnapshot = {
  generation: number;
  strategy: ProxyStartStrategy;
  modelRouter?: ModelRouterInterface;
  passthrough: boolean;
  primaryAccountKey?: string;
  accountAllowlist?: ReadonlySet<string>;
  quotaRoutingEnabled: boolean;
  sessionSoftLimit: number;
  sessionResetToleranceMs: number;
};

/** Immutable last-known-good proxy configuration published at runtime. */
export type ProxyRuntimeConfigSnapshot = ProxyRequestRoutingSnapshot & {
  loadedAt: string;
  configHash: string;
  proxyConfig: LoadedProxyConfig | null;
};

/** Source that requested a runtime configuration reload. */
export type ProxyRuntimeConfigReloadSource =
  | "startup"
  | "watch"
  | "sighup"
  | "manual";

/** Result returned after a serialized runtime configuration reload attempt. */
export type ProxyRuntimeConfigReloadResult = {
  applied: boolean;
  changed: boolean;
  generation: number;
  environmentChanged?: boolean;
  error?: string;
};

/** Safe runtime configuration diagnostics exposed through proxy status. */
export type ProxyRuntimeConfigStatus = {
  configPath: string;
  envFilePath?: string;
  generation: number;
  loadedAt: string;
  configHash: string;
  watching: boolean;
  lastReloadAttemptAt?: string;
  lastReloadAt?: string;
  lastReloadSource?: ProxyRuntimeConfigReloadSource;
  lastReloadError?: string;
  consecutiveFailures: number;
};

/** Constructor options for the proxy runtime configuration store. */
export type ProxyRuntimeConfigStoreOptions = {
  configPath: string;
  configRequired: boolean;
  envFilePath?: string;
  envFileRequired?: boolean;
  baseEnv: Record<string, string | undefined>;
  strategyOverride?: ProxyStartStrategy;
  passthrough: boolean;
  watchIntervalMs?: number;
  watchDebounceMs?: number;
};

/** Runtime configuration provider captured by route factories. */
export type ProxyRuntimeConfigProvider = () => ProxyRequestRoutingSnapshot;

/** Optional runtime configuration wiring for Claude proxy route factories. */
export type ClaudeProxyRouteRuntimeOptions = {
  accountAllowlist?: AccountAllowlist;
  runtimeConfigProvider: ProxyRuntimeConfigProvider;
};

/** Listener invoked after a new configuration generation is published. */
export type ProxyRuntimeConfigListener = (
  snapshot: ProxyRuntimeConfigSnapshot,
) => void;

/** Listener invoked after every successful or rejected reload attempt. */
export type ProxyRuntimeConfigReloadListener = (
  result: ProxyRuntimeConfigReloadResult,
  status: ProxyRuntimeConfigStatus,
) => void;

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
  startedAt?: number;
  totalAttempts?: number;
  totalAttemptErrors?: number;
  totalRequests: number;
  totalSuccess: number;
  totalErrors: number;
  totalRateLimits: number;
  totalTransientRateLimits?: number;
  totalQuotaRateLimits?: number;
  terminalErrors?: ProxyTerminalErrorJournal;
  lastTerminalError?: ProxyTerminalErrorSummary | null;
  terminalErrorDetailsComparable?: boolean;
  terminalErrorDetailsMissing?: number;
  terminalErrorDetailsExcess?: number;
  accounts?: {
    label: string;
    type: string;
    attempts?: number;
    requests?: number;
    success?: number;
    errors?: number;
    attemptErrors?: number;
    rateLimits?: number;
    transientRateLimits?: number;
    quotaRateLimits?: number;
    cooling: boolean;
    allowed?: boolean;
    expired?: boolean;
    status?:
      | "active"
      | "cooling"
      | "disabled"
      | "expired"
      | "excluded"
      | "removed"
      | "internal"
      | "unattributed";
  }[];
  persistence?: ProxyStatsPersistenceStatus;
};

/** Sub-action of the `proxy telemetry` CLI command. */
export type ProxyTelemetryAction =
  | "setup"
  | "start"
  | "stop"
  | "status"
  | "logs"
  | "import-dashboard";

// =============================================================================
// PROXY FORMAT (from proxy/proxyTranslationEngine.ts)
// =============================================================================

/** Wire format a proxy request is using. */
export type ProxyFormat = "claude" | "openai";

/**
 * Common adapter interface that hides the differences between
 * Claude and OpenAI stream serializers from the unified translation engine.
 */
export type StreamSerializerAdapter = {
  start(): Iterable<string>;
  pushDelta(text: string): Iterable<string>;
  pushToolUse(id: string, name: string, input: unknown): Iterable<string>;
  finish(
    finishReason: string,
    usage: { input: number; output: number; total: number },
  ): Iterable<string>;
  emitError(message: string): Iterable<string>;
};

// =============================================================================
// OPENAI CHAT COMPLETIONS TYPES (for OpenCode proxy support)
// =============================================================================

/** OpenAI content part in a user message. */
export type OpenAIContentPartText = { type: "text"; text: string };
export type OpenAIContentPartImage = {
  type: "image_url";
  image_url: { url: string; detail?: "auto" | "low" | "high" };
};
export type OpenAIContentPart = OpenAIContentPartText | OpenAIContentPartImage;

/** OpenAI message types. */
export type OpenAISystemMessage = { role: "system"; content: string };
export type OpenAIUserMessage = {
  role: "user";
  content: string | OpenAIContentPart[];
};
export type OpenAIAssistantMessage = {
  role: "assistant";
  content?: string | null;
  tool_calls?: OpenAIToolCall[];
};
export type OpenAIToolMessage = {
  role: "tool";
  tool_call_id: string;
  content: string;
};
export type OpenAIMessage =
  | OpenAISystemMessage
  | OpenAIUserMessage
  | OpenAIAssistantMessage
  | OpenAIToolMessage;

/** OpenAI tool call (in assistant messages and responses). */
export type OpenAIToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string }; // arguments is stringified JSON
};

/** OpenAI tool definition. */
export type OpenAIToolDef = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters: Record<string, unknown>;
  };
};

/** OpenAI tool_choice options. */
export type OpenAIToolChoice =
  | "auto"
  | "required"
  | "none"
  | { type: "function"; function: { name: string } };

/** OpenAI Chat Completions request body. */
export type OpenAICompletionRequest = {
  model: string;
  messages: OpenAIMessage[];
  tools?: OpenAIToolDef[];
  tool_choice?: OpenAIToolChoice;
  stream?: boolean;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  max_completion_tokens?: number;
  stop?: string | string[];
  n?: number;
  response_format?: {
    type: "text" | "json_object" | "json_schema";
    json_schema?: unknown;
  };
  stream_options?: { include_usage?: boolean };
};

/** OpenAI usage counters. */
export type OpenAIUsage = {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
};

/** OpenAI non-streaming response. */
export type OpenAICompletionResponse = {
  id: string;
  object: "chat.completion";
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: "assistant";
      content: string | null;
      tool_calls?: OpenAIToolCall[];
    };
    finish_reason: "stop" | "tool_calls" | "length" | "content_filter" | null;
  }>;
  usage: OpenAIUsage;
};

/** OpenAI streaming chunk. */
export type OpenAIStreamChunk = {
  id: string;
  object: "chat.completion.chunk";
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: "assistant";
      content?: string;
      tool_calls?: Array<{
        index: number;
        id?: string;
        type?: "function";
        function?: { name?: string; arguments?: string };
      }>;
    };
    finish_reason: string | null;
  }>;
  usage?: OpenAIUsage;
};

/** OpenAI error response. */
export type OpenAIErrorResponse = {
  error: { message: string; type: string; code: string | null };
};

/** Parsed OpenAI request — intermediate form for NeuroLink pipeline. */
export type ParsedOpenAIRequest = {
  model: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  systemPrompt?: string;
  stream: boolean;
  prompt: string;
  images: string[];
  conversationMessages: Array<{ role: string; content: string }>;
  tools: Record<
    string,
    {
      description?: string;
      inputSchema: unknown;
      execute?: (...args: unknown[]) => unknown;
    }
  >;
  toolChoice?: "auto" | "required" | "none";
  toolChoiceName?: string;
  stopSequences?: string[];
  responseFormat?: { type: string; jsonSchema?: unknown };
};
