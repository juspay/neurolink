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

/**
 * Type describing the ModelRouter contract.
 * Defined here to avoid a circular dependency between types and implementation.
 */
export type ModelRouterInterface = {
  resolve(requestedModel: string): RouteResult;
  isClaudeTarget(requestedModel: string): boolean;
  getFallbackChain(): import("./subscriptionTypes.js").FallbackEntry[];
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
      inputSchema?: unknown;
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
  routing?: Partial<import("./subscriptionTypes.js").ProxyRoutingConfig>;
  /** Cloaking plugin configuration */
  cloaking?: import("./subscriptionTypes.js").CloakingConfig;
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
  currentBackoffLevel: number;
  coolingUntil?: number;
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
  coolingUntil?: number;
  backoffLevel: number;
  consecutiveRefreshFailures: number;
  permanentlyDisabled: boolean;
  lastToken?: string;
  lastRefreshToken?: string;
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
  deprecation: import("../server/types.js").RouteDeprecation;
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
