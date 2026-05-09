/**
 * Claude Subscription Types for NeuroLink
 *
 * Type definitions for Claude subscription tiers, authentication methods,
 * and usage tracking for Anthropic API access.
 */

// =============================================================================
// STORED OAUTH TOKENS (canonical location: authTypes.ts — re-exported here
// for backward compatibility)
// =============================================================================

import type { StoredOAuthTokens } from "./auth.js";

export type {
  StoredOAuthTokens,
  TokenRefresher,
  TokenStorageData,
  StoredProviderTokens,
} from "./auth.js";

// =============================================================================
// SUBSCRIPTION TIER TYPES
// =============================================================================

/**
 * Claude subscription tier levels
 *
 * @description Represents the different subscription tiers available for Claude:
 * - "free": Free tier with basic access and limited usage
 * - "pro": Professional tier with higher limits and priority access
 * - "max": Maximum tier with highest limits and advanced features (alias for max_5)
 * - "max_5": Max 5x usage tier
 * - "max_20": Max 20x usage tier
 * - "api": Direct API access tier for developers and enterprises
 */
export type ClaudeSubscriptionTier =
  | "free"
  | "pro"
  | "max"
  | "max_5"
  | "max_20"
  | "api";

// =============================================================================
// AUTHENTICATION TYPES
// =============================================================================

/**
 * Authentication methods supported for Anthropic API access
 *
 * @description Defines the available authentication methods:
 * - "api_key": Traditional API key authentication for direct API access
 * - "oauth": OAuth 2.0 authentication for subscription-based access
 */
export type AnthropicAuthMethod = "api_key" | "oauth";

/**
 * OAuth token structure for Claude subscriptions
 *
 * @description Contains the OAuth token information for authenticated sessions
 */
export type OAuthToken = {
  /**
   * The access token for API requests
   */
  accessToken: string;

  /**
   * The refresh token for obtaining new access tokens
   */
  refreshToken?: string;

  /**
   * Token expiration timestamp (Unix milliseconds, i.e. Date.now() scale)
   */
  expiresAt?: number;

  /**
   * Token type (typically "Bearer")
   */
  tokenType?: string;

  /**
   * Scopes granted to this token
   */
  scopes?: string[];
};

/**
 * Rate limit information parsed from Anthropic API response headers
 *
 * @see https://docs.anthropic.com/en/api/rate-limits
 */
export type AnthropicRateLimitInfo = {
  /**
   * Maximum number of requests allowed in the current window
   */
  requestsLimit?: number;

  /**
   * Number of requests remaining in the current window
   */
  requestsRemaining?: number;

  /**
   * Time when the request limit resets (ISO 8601 timestamp)
   */
  requestsReset?: string;

  /**
   * Maximum number of tokens allowed in the current window
   */
  tokensLimit?: number;

  /**
   * Number of tokens remaining in the current window
   */
  tokensRemaining?: number;

  /**
   * Time when the token limit resets (ISO 8601 timestamp)
   */
  tokensReset?: string;

  /**
   * Retry-After header value in seconds (present on 429 responses)
   */
  retryAfter?: number;
};

/**
 * Response metadata including rate limit information
 *
 * @description Contains metadata from Anthropic API responses
 */
export type AnthropicResponseMetadata = {
  /**
   * Rate limit information from response headers
   */
  rateLimit?: AnthropicRateLimitInfo;

  /**
   * Request ID for debugging
   */
  requestId?: string;

  /**
   * Server timing information
   */
  serverTiming?: string;
};

/**
 * Anthropic authentication configuration
 *
 * @description Configuration interface for authenticating with Anthropic services.
 * Supports both API key and OAuth authentication methods.
 */
export type AnthropicAuthConfig = {
  /**
   * Authentication method to use
   * @see AnthropicAuthMethod
   */
  method: AnthropicAuthMethod;

  /**
   * API key for API key authentication method
   * @description Required when method is "api_key"
   */
  apiKey?: string;

  /**
   * OAuth token object for OAuth authentication method
   * @description Full OAuth token with access, refresh, and expiry information
   */
  oauthToken?: OAuthToken;

  /**
   * OAuth access token for OAuth authentication method
   * @description Required when method is "oauth", obtained through OAuth flow
   * @deprecated Use oauthToken.accessToken instead
   */
  accessToken?: string;

  /**
   * OAuth refresh token for obtaining new access tokens
   * @description Optional for OAuth method, enables automatic token refresh
   * @deprecated Use oauthToken.refreshToken instead
   */
  refreshToken?: string;

  /**
   * Token expiry timestamp in milliseconds (Unix epoch)
   * @description Used to determine when access token needs to be refreshed
   * @deprecated Use oauthToken.expiresAt instead
   */
  tokenExpiry?: number;

  /**
   * User's subscription tier
   * @description Determines rate limits, features, and capabilities available
   */
  subscriptionTier?: ClaudeSubscriptionTier;

  /**
   * Whether to automatically refresh OAuth tokens
   * @description When true, tokens will be refreshed before expiry
   */
  autoRefresh?: boolean;
};

/**
 * Subscription information for Claude API access
 *
 * @description Contains subscription tier and related metadata
 * for providers that support subscription-based access
 */
export type SubscriptionInfo = {
  /**
   * The subscription tier
   */
  tier: ClaudeSubscriptionTier;

  /**
   * Whether the subscription is active
   */
  isActive: boolean;

  /**
   * Subscription start date (ISO 8601 timestamp)
   */
  startDate?: string;

  /**
   * Subscription renewal date (ISO 8601 timestamp)
   */
  renewalDate?: string;

  /**
   * Current rate limit information
   */
  rateLimit?: AnthropicRateLimitInfo;

  /**
   * Features available with this subscription
   */
  features?: SubscriptionFeatures;
};

// =============================================================================
// QUOTA AND USAGE TRACKING TYPES
// =============================================================================

/**
 * Claude quota information for tracking usage limits
 *
 * @description Represents the quota limits for a Claude subscription,
 * including message limits, token limits, and model access restrictions.
 */
export type ClaudeQuotaInfo = {
  /**
   * Maximum messages allowed per time period
   * @description Number of messages the user can send within the reset period
   */
  maxMessagesPerPeriod: number;

  /**
   * Maximum tokens allowed per time period
   * @description Total tokens (input + output) allowed within the reset period
   */
  maxTokensPerPeriod: number;

  /**
   * Maximum tokens per individual request
   * @description Limit on tokens for a single API request
   */
  maxTokensPerRequest: number;

  /**
   * Time period for quota reset in milliseconds
   * @description Duration after which quota counters reset (e.g., 3600000 for 1 hour)
   */
  resetPeriodMs: number;

  /**
   * Timestamp when quota will reset (Unix epoch in milliseconds)
   * @description Next quota reset time
   */
  nextResetTimestamp: number;

  /**
   * List of models accessible with current subscription
   * @description Model identifiers the user has access to based on tier
   */
  availableModels: string[];

  /**
   * Whether priority queue access is enabled
   * @description Priority access reduces wait times during high traffic
   */
  hasPriorityAccess: boolean;

  /**
   * Maximum concurrent requests allowed
   * @description Number of simultaneous API requests permitted
   */
  maxConcurrentRequests: number;

  /**
   * Whether extended thinking is available
   * @description Access to extended thinking/reasoning capabilities
   */
  hasExtendedThinking: boolean;

  /**
   * Maximum context window size in tokens
   * @description Maximum context length supported for the subscription tier
   */
  maxContextWindow: number;
};

/**
 * Claude usage information for tracking current consumption
 *
 * @description Represents the current usage state within a billing period,
 * tracking messages sent, tokens consumed, and remaining quotas.
 */
export type ClaudeUsageInfo = {
  /**
   * Messages sent in current period
   * @description Count of messages sent since last quota reset
   */
  messagesUsed: number;

  /**
   * Messages remaining in current period
   * @description Calculated as maxMessagesPerPeriod - messagesUsed
   */
  messagesRemaining: number;

  /**
   * Tokens consumed in current period
   * @description Total tokens (input + output) used since last reset
   */
  tokensUsed: number;

  /**
   * Tokens remaining in current period
   * @description Calculated as maxTokensPerPeriod - tokensUsed
   */
  tokensRemaining: number;

  /**
   * Input tokens consumed in current period
   * @description Prompt/input tokens used since last reset
   */
  inputTokensUsed: number;

  /**
   * Output tokens consumed in current period
   * @description Response/output tokens used since last reset
   */
  outputTokensUsed: number;

  /**
   * Timestamp of last API request (Unix epoch in milliseconds)
   * @description When the last successful request was made
   */
  lastRequestTimestamp: number;

  /**
   * Current rate limit status
   * @description Whether the user is currently rate limited
   */
  isRateLimited: boolean;

  /**
   * Timestamp when rate limit expires (Unix epoch in milliseconds)
   * @description When rate limiting will be lifted, if applicable
   */
  rateLimitExpiresAt?: number;

  /**
   * Total requests made in current period
   * @description Count of all API requests since last reset
   */
  requestCount: number;

  /**
   * Usage percentage of message quota
   * @description Percentage of message quota consumed (0-100)
   */
  messageQuotaPercent: number;

  /**
   * Usage percentage of token quota
   * @description Percentage of token quota consumed (0-100)
   */
  tokenQuotaPercent: number;
};

// =============================================================================
// SUBSCRIPTION FEATURES TYPES
// =============================================================================

/**
 * Subscription features defining capabilities per tier
 *
 * @description Defines what features and capabilities are available
 * for each subscription tier. Used to determine access to specific
 * functionality and feature gating.
 */
export type SubscriptionFeatures = {
  /**
   * Subscription tier this feature set belongs to
   */
  tier: ClaudeSubscriptionTier;

  /**
   * Whether chat/conversation access is enabled
   * @description Basic chat functionality with Claude
   */
  hasChat: boolean;

  /**
   * Whether API access is enabled
   * @description Programmatic access to Claude via API
   */
  hasApiAccess: boolean;

  /**
   * Whether extended thinking/reasoning is enabled
   * @description Access to extended thinking capabilities for complex reasoning
   */
  hasExtendedThinking: boolean;

  /**
   * Whether priority queue access is enabled
   * @description Faster response times during high traffic periods
   */
  hasPriorityAccess: boolean;

  /**
   * Whether vision/image analysis is enabled
   * @description Ability to analyze images and visual content
   */
  hasVision: boolean;

  /**
   * Whether file/document analysis is enabled
   * @description Ability to process PDFs, documents, and other files
   */
  hasFileAnalysis: boolean;

  /**
   * Whether code execution is enabled
   * @description Access to code execution/analysis features
   */
  hasCodeExecution: boolean;

  /**
   * Whether MCP (Model Context Protocol) tools are enabled
   * @description Access to external tool integrations via MCP
   */
  hasMcpTools: boolean;

  /**
   * Whether computer use capability is enabled
   * @description Access to computer use/automation features
   */
  hasComputerUse: boolean;

  /**
   * Whether web search is enabled
   * @description Access to web search capabilities
   */
  hasWebSearch: boolean;

  /**
   * Maximum context window size in tokens
   * @description Limit on context/conversation length
   */
  maxContextWindow: number;

  /**
   * Maximum output tokens per request
   * @description Limit on response length per request
   */
  maxOutputTokens: number;

  /**
   * List of accessible model identifiers
   * @description Which Claude models are available for this tier
   */
  availableModels: string[];

  /**
   * Daily message limit
   * @description Maximum messages per day, -1 for unlimited
   */
  dailyMessageLimit: number;

  /**
   * Monthly token limit
   * @description Maximum tokens per month, -1 for unlimited
   */
  monthlyTokenLimit: number;

  /**
   * Whether usage analytics are available
   * @description Access to detailed usage statistics and analytics
   */
  hasUsageAnalytics: boolean;

  /**
   * Whether team/organization features are enabled
   * @description Access to team management and collaboration features
   */
  hasTeamFeatures: boolean;

  /**
   * Custom feature flags for extensibility
   * @description Additional feature flags for future capabilities
   */
  customFeatures?: Record<string, boolean>;
};

// =============================================================================
// HELPER TYPES
// =============================================================================

/**
 * Subscription tier comparison result
 *
 * @description Result of comparing two subscription tiers
 */
export type TierComparisonResult = {
  /** Whether the first tier is higher than the second */
  isHigher: boolean;
  /** Whether the first tier is lower than the second */
  isLower: boolean;
  /** Whether the tiers are equal */
  isEqual: boolean;
  /** Numeric difference between tier levels (positive = first is higher) */
  levelDifference: number;
};

/**
 * Authentication state for tracking auth status
 *
 * @description Represents the current authentication state
 */
export type AuthenticationState = {
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** Current authentication method in use */
  method?: AnthropicAuthMethod;
  /** Current subscription tier */
  tier?: ClaudeSubscriptionTier;
  /** Whether tokens need to be refreshed */
  needsRefresh: boolean;
  /** Error message if authentication failed */
  error?: string;
  /** Timestamp of last successful authentication */
  lastAuthenticatedAt?: number;
};

/**
 * Quota check result for determining if an operation can proceed
 *
 * @description Result of checking whether quota allows an operation
 */
export type QuotaCheckResult = {
  /** Whether the operation is allowed within quota */
  allowed: boolean;
  /** Reason if operation is not allowed */
  reason?: string;
  /** Estimated tokens required for the operation */
  estimatedTokens?: number;
  /** Tokens remaining after operation (if allowed) */
  tokensRemainingAfter?: number;
  /** Suggested wait time in ms if rate limited */
  suggestedWaitMs?: number;
};

// =============================================================================
// OAUTH TYPES
// =============================================================================

/**
 * OAuth tokens structure for Claude subscription authentication
 *
 * @description Contains OAuth token information for authenticated sessions.
 * This is the preferred type for OAuth token storage.
 */
// OAuthTokens — canonical definition in auth.ts

/**
 * OAuth configuration for Claude subscription authentication
 *
 * @description Configuration for OAuth 2.0 authentication flow with Claude/Anthropic.
 * Used to configure the OAuth client for subscription-based access.
 */
export type OAuthConfig = {
  /**
   * OAuth client ID for the application
   * @description Obtained from Anthropic developer console
   */
  clientId: string;

  /**
   * OAuth redirect URI for the callback
   * @description Must match the registered redirect URI in Anthropic console
   */
  redirectUri: string;

  /**
   * OAuth scopes to request
   * @description Array of scope strings defining requested permissions
   */
  scopes: string[];

  /**
   * OAuth client secret (optional, for confidential clients)
   * @description Only used for server-side OAuth flows
   */
  clientSecret?: string;

  /**
   * OAuth authorization endpoint URL
   * @description Anthropic's OAuth authorization URL
   */
  authorizationEndpoint?: string;

  /**
   * OAuth token endpoint URL
   * @description Anthropic's OAuth token exchange URL
   */
  tokenEndpoint?: string;

  /**
   * PKCE code verifier (for public clients)
   * @description Used with PKCE flow for enhanced security
   */
  codeVerifier?: string;

  /**
   * State parameter for CSRF protection
   * @description Random string to prevent CSRF attacks
   */
  state?: string;
};

// =============================================================================
// USAGE QUOTA TYPES
// =============================================================================

/**
 * Usage quota for tracking Claude subscription usage
 *
 * @description Simplified quota tracking structure for monitoring
 * subscription usage against limits. Used for real-time quota monitoring.
 */
export type UsageQuota = {
  /**
   * Current subscription tier
   */
  tier: ClaudeSubscriptionTier;

  /**
   * Daily tokens used in current period
   */
  dailyTokensUsed: number;

  /**
   * Daily token limit for current tier
   */
  dailyTokensLimit: number;

  /**
   * Messages used in current period
   */
  messagesUsed: number;

  /**
   * Message limit for current tier
   */
  messagesLimit: number;

  /**
   * Time when usage counters will reset
   */
  resetTime: Date;

  /**
   * Current requests used in rate limit window
   */
  requestsUsed?: number;

  /**
   * Request limit for rate limit window
   */
  requestsLimit?: number;

  /**
   * Whether quota is currently exceeded
   */
  isExceeded?: boolean;

  /**
   * Percentage of quota used (0-100)
   */
  usagePercent?: number;
};

// =============================================================================
// ANTHROPIC BETA FEATURES TYPES
// =============================================================================

/**
 * Anthropic beta feature flags for beta header configuration
 *
 * @description Defines available beta features that can be enabled via
 * the anthropic-beta header. Each feature enables specific beta functionality.
 *
 * @see https://docs.anthropic.com/en/api/versioning#beta-headers
 */
export type AnthropicBetaFeatures = {
  /**
   * Enable computer use capability
   * @description Allows Claude to interact with computer interfaces
   * Header value: "computer-use-2024-10-22"
   */
  computerUse?: boolean;

  /**
   * Enable extended thinking/reasoning
   * @description Allows extended thinking for complex reasoning tasks
   * Header value: "extended-thinking-2025-01-24"
   */
  extendedThinking?: boolean;

  /**
   * Enable prompt caching
   * @description Allows caching of prompts for reduced latency
   * Header value: "prompt-caching-2024-07-31"
   */
  promptCaching?: boolean;

  /**
   * Enable token counting
   * @description Allows pre-counting tokens before generation
   * Header value: "token-counting-2024-11-01"
   */
  tokenCounting?: boolean;

  /**
   * Enable message batches
   * @description Allows batch processing of multiple messages
   * Header value: "message-batches-2024-09-24"
   */
  messageBatches?: boolean;

  /**
   * Enable PDF support
   * @description Allows processing PDF documents
   * Header value: "pdfs-2024-09-25"
   */
  pdfs?: boolean;

  /**
   * Enable max tokens override (for higher output limits)
   * @description Allows requesting more output tokens than default
   * Header value: "max-tokens-3-5-sonnet-2024-07-15"
   */
  maxTokensOverride?: boolean;

  /**
   * Enable interleaved thinking (for multi-turn reasoning)
   * @description Allows interleaved thinking in conversations
   * Header value: "interleaved-thinking-2025-01-24"
   */
  interleavedThinking?: boolean;

  /**
   * Enable files API
   * @description Allows using the Files API for document processing
   * Header value: "files-api-2025-01-15"
   */
  filesApi?: boolean;

  /**
   * Enable MCP connectors
   * @description Allows using MCP connectors for tool integrations
   * Header value: "mcp-connectors-2025-01-01"
   */
  mcpConnectors?: boolean;

  /**
   * Enable code execution
   * @description Allows Claude to execute code
   * Header value: "code-execution-2025-01-24"
   */
  codeExecution?: boolean;

  /**
   * Custom beta features as raw strings
   * @description For beta features not yet added to this type
   */
  custom?: string[];
};

/**
 * Anthropic beta header string values
 *
 * @description The actual string values used in the anthropic-beta header.
 * Use AnthropicBetaFeatures for configuration, this is for internal use.
 */
export type AnthropicBetaHeader =
  | "computer-use-2024-10-22"
  | "extended-thinking-2025-01-24"
  | "prompt-caching-2024-07-31"
  | "token-counting-2024-11-01"
  | "message-batches-2024-09-24"
  | "pdfs-2024-09-25"
  | "max-tokens-3-5-sonnet-2024-07-15"
  | "interleaved-thinking-2025-01-24"
  | "files-api-2025-01-15"
  | "mcp-connectors-2025-01-01"
  | "code-execution-2025-01-24"
  | string; // Allow custom beta headers

/**
 * Subscription information summary for display purposes
 *
 * @description Extended subscription information including human-readable
 * tier descriptions and usage data. Use for UI display and status reporting.
 * For basic subscription state, see SubscriptionInfo.
 */
export type SubscriptionInfoSummary = {
  /** Current subscription tier */
  tier: ClaudeSubscriptionTier;
  /** Human-readable tier name */
  tierName: string;
  /** Human-readable tier description */
  description: string;
  /** Messages allowed per day (-1 for unlimited) */
  messagesPerDay: number | "unlimited";
  /** Maximum context window size in tokens */
  contextWindow: number;
  /** Whether the user has priority access */
  priorityAccess: boolean;
  /** Whether the subscription is active */
  isActive: boolean;
  /** Subscription expiration date (if applicable) */
  expiresAt?: number;
  /** Current usage information */
  usage?: ClaudeUsageInfo;
  /** Available features for this tier */
  features?: SubscriptionFeatures;
};

// =============================================================================
// OAUTH FLOW TYPES (moved from auth/anthropicOAuth.ts)
// =============================================================================

/**
 * OAuth 2.0 token response from Anthropic (raw API response shape)
 */
export type OAuthTokenResponse = {
  /** The access token for API authentication */
  access_token: string;
  /** Token type (typically "Bearer") */
  token_type: string;
  /** Token expiration time in seconds */
  expires_in: number;
  /** Refresh token for obtaining new access tokens */
  refresh_token?: string;
  /** Granted scopes (space-separated) */
  scope?: string;
};

/**
 * Parsed OAuth tokens from a fresh OAuth flow.
 * Uses Date for expiresAt (vs number in OAuthTokens for storage).
 */
export type OAuthFlowTokens = {
  /** The access token for API authentication */
  accessToken: string;
  /** Token type (typically "Bearer") */
  tokenType: string;
  /** Expiration timestamp (Date object) */
  expiresAt: Date;
  /** Refresh token for obtaining new access tokens */
  refreshToken?: string;
  /** Granted scopes as an array */
  scopes: string[];
};

/**
 * Token validation result
 */
export type ClaudeTokenValidationResult = {
  /** Whether the token is valid */
  isValid: boolean;
  /** Remaining time in seconds until expiration */
  expiresIn?: number;
  /** Scopes associated with the token */
  scopes?: string[];
  /** User information if available */
  user?: {
    id: string;
    email?: string;
    subscription?: string;
  };
  /** Error message if validation failed */
  error?: string;
};

/**
 * OAuth configuration options for AnthropicOAuth class
 */
export type AnthropicOAuthConfig = {
  /** OAuth client ID (optional, uses env var if not provided) */
  clientId?: string;
  /** OAuth client secret (optional, for confidential clients) */
  clientSecret?: string;
  /** Redirect URI for OAuth callback */
  redirectUri?: string;
  /** OAuth scopes to request */
  scopes?: string[];
  /** Custom authorization endpoint URL */
  authorizationUrl?: string;
  /** Custom token endpoint URL */
  tokenUrl?: string;
  /** Custom token validation endpoint URL */
  validationUrl?: string;
  /** Custom token revocation endpoint URL */
  revocationUrl?: string;
};

/**
 * PKCE (Proof Key for Code Exchange) parameters
 */
export type PKCEParams = {
  /** Code verifier - random string used to generate challenge */
  codeVerifier: string;
  /** Code challenge - SHA-256 hash of verifier, base64url encoded */
  codeChallenge: string;
  /** Code challenge method - always "S256" */
  codeChallengeMethod: "S256";
};

/**
 * Callback server result containing the authorization code
 */
export type CallbackResult = {
  /** Authorization code from OAuth callback */
  code: string;
  /** State parameter for CSRF verification */
  state?: string;
};

// =============================================================================
// PROVIDER CONFIG TYPES (moved from utils/providerConfig.ts)
// =============================================================================

/**
 * Anthropic authentication configuration result for providerConfig
 * Extended version with OAuth token details for configuration detection
 */
export type AnthropicAuthConfigResult = {
  method: AnthropicAuthMethod;
  tier: ClaudeSubscriptionTier;
  apiKey?: string;
  accessToken?: string;
  refreshToken?: string;
  isConfigured: boolean;
  error?: string;
};

// =============================================================================
// AUTH MODULE TYPES (moved from auth/index.ts)
// =============================================================================

/**
 * Unified authentication options for NeuroLink
 *
 * Supports both direct API key authentication and OAuth-based authentication
 * for Claude Pro/Max subscriptions.
 */
export type NeuroLinkAuthOptions = {
  /**
   * Authentication method to use
   * - "api-key": Use ANTHROPIC_API_KEY environment variable
   * - "oauth": Use OAuth 2.0 flow for Claude Pro/Max subscriptions
   */
  method: "api-key" | "oauth";

  /**
   * OAuth configuration (required when method is "oauth")
   */
  oauth?: {
    /** OAuth client ID */
    clientId?: string;
    /** OAuth redirect URI */
    redirectUri?: string;
    /** Custom scopes to request */
    scopes?: string[];
  };

  /**
   * Token storage configuration (optional, defaults to file-based storage)
   */
  tokenStorage?: {
    /** Enable encryption for stored tokens */
    encryptionEnabled?: boolean;
    /** Custom storage path */
    customStoragePath?: string;
  };
};

/**
 * Authentication status result
 */
export type AuthStatus = {
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** Authentication method in use */
  method: "api-key" | "oauth" | "none";
  /** Token expiration time (for OAuth) */
  expiresAt?: Date;
  /** Whether token refresh is needed (for OAuth) */
  needsRefresh?: boolean;
  /** User information (for OAuth) */
  user?: {
    id?: string;
    email?: string;
    subscription?: string;
  };
};

// =============================================================================
// MODEL TYPES (moved from models/anthropicModels.ts)
// =============================================================================

/**
 * Model metadata definition for Anthropic models
 */
export type AnthropicModelMetadata = {
  /** Human-readable display name */
  displayName: string;
  /** Maximum context window size in tokens */
  contextWindow: number;
  /** Maximum output tokens */
  maxOutputTokens: number;
  /** Whether the model supports vision/image input */
  supportsVision: boolean;
  /** Whether the model supports extended thinking mode */
  supportsExtendedThinking: boolean;
  /** Whether the model supports tool/function calling */
  supportsToolUse: boolean;
  /** Whether the model supports streaming */
  supportsStreaming: boolean;
  /** Whether the model is deprecated */
  deprecated: boolean;
  /** Model family (haiku, sonnet, opus) */
  family: "haiku" | "sonnet" | "opus";
  /** Short description of the model */
  description: string;
};

// =============================================================================
// CLAUDE PROXY TYPES
// =============================================================================

/** A single Claude account in the pool */
export type ProxyAccount = {
  id: string;
  label?: string;
  type: "oauth" | "api_key";
  tokens?: StoredOAuthTokens;
  apiKey?: string;
  status: "healthy" | "cooling" | "disabled";
  cooldownUntil?: number;
  consecutiveFailures: number;
  requestCount: number;
  lastUsed: number;
  subscriptionTier?: ClaudeSubscriptionTier;
};

/** Configuration for AccountPool */
export type AccountPoolConfig = {
  strategy: "round-robin" | "fill-first";
  defaultCooldownMs?: number;
  maxCooldownMs?: number;
  maxRetryAccounts?: number;
};

/** A single model mapping entry */
export type ModelMapping = {
  from: string;
  to: string;
  provider: string;
};

/** A fallback chain entry */
export type FallbackEntry = {
  provider: string;
  model: string;
};

/** Full proxy routing config */
export type ProxyRoutingConfig = {
  strategy: "round-robin" | "fill-first";
  modelMappings: ModelMapping[];
  fallbackChain: FallbackEntry[];
  passthroughModels?: string[];
  /** Email/label of the Anthropic account that should be tried first
   *  ("home"). When absent, falls back to insertion-order index 0.
   *  Resolved per-request to a stable key (anthropic:<email>); does not
   *  encode an index. */
  primaryAccount?: string;
};

/** Cloaking plugin config */
export type CloakingConfig = {
  mode: "auto" | "always" | "never";
  plugins: {
    headerScrubber?: boolean;
    sessionIdentity?: boolean;
    systemPromptInjector?: boolean;
    wordObfuscator?: { enabled: boolean; words: string[] };
    tlsFingerprint?: { enabled: boolean };
  };
};

/** Full proxy config (loaded from YAML) */
export type ProxyConfig = {
  host?: string;
  port?: number;
  auth?: "none" | "api-key";
  proxyApiKey?: string;
  /** Provider-keyed account map matching the YAML structure (e.g. accounts.anthropic[0]) */
  accounts?: Record<
    string,
    Array<{
      name: string;
      apiKey?: string;
      weight?: number;
      rateLimit?: number;
      enabled?: boolean;
      baseUrl?: string;
      orgId?: string;
      metadata?: Record<string, unknown>;
    }>
  >;
  routing?: Partial<ProxyRoutingConfig>;
  cloaking?: CloakingConfig;
};

// TokenStorageData and StoredProviderTokens are now in authTypes.ts and
// re-exported at the top of this file for backward compatibility.
