import { createAnthropic } from "@ai-sdk/anthropic";
import { type LanguageModelV1, streamText, type Tool } from "ai";
import { type AIProviderName, AnthropicModels } from "../constants/enums.js";
import { BaseProvider } from "../core/baseProvider.js";
import { DEFAULT_MAX_STEPS } from "../core/constants.js";
import type { NeuroLink } from "../neurolink.js";
import { createProxyFetch } from "../proxy/proxyFetch.js";
import type { JsonValue, UnknownRecord } from "../types/common.js";
import {
  AuthenticationError,
  NetworkError,
  ProviderError,
  RateLimitError,
} from "../types/errors.js";
import type {
  TextGenerationOptions,
  EnhancedGenerateResult,
} from "../types/generateTypes.js";
import type { StreamOptions, StreamResult } from "../types/streamTypes.js";
import type { ValidationSchema } from "../types/typeAliases.js";
import { logger } from "../utils/logger.js";
import {
  createAnthropicConfig,
  getProviderModel,
  validateApiKey,
} from "../utils/providerConfig.js";
import {
  composeAbortSignals,
  createTimeoutController,
  TimeoutError,
} from "../utils/timeout.js";
import type {
  ClaudeSubscriptionTier,
  AnthropicAuthMethod,
  OAuthToken,
  AnthropicRateLimitInfo,
  AnthropicResponseMetadata,
  ClaudeUsageInfo,
} from "../types/subscriptionTypes.js";
import type { AnthropicProviderConfig } from "../types/providers.js";
import {
  isModelAvailableForTier,
  getRecommendedModelForTier,
  getModelCapabilities,
} from "../models/anthropicModels.js";
import {
  CLAUDE_CLI_USER_AGENT,
  CLAUDE_CODE_CLIENT_ID,
  ANTHROPIC_TOKEN_URL,
  MCP_TOOL_PREFIX,
} from "../auth/anthropicOAuth.js";
import { homedir } from "os";
import {
  readFileSync,
  existsSync,
  writeFileSync,
  mkdirSync,
  renameSync,
} from "fs";
import { join } from "path";
import { TOKEN_EXPIRY_BUFFER_MS } from "../constants/enums.js";

/**
 * Beta headers for Claude Code integration.
 * These enable experimental features:
 * - claude-code-20250219: Claude Code specific features
 * - interleaved-thinking-2025-05-14: Interleaved thinking mode
 * - fine-grained-tool-streaming-2025-05-14: Fine-grained tool streaming
 */
const ANTHROPIC_BETA_HEADERS = {
  "anthropic-beta": [
    "claude-code-20250219",
    "interleaved-thinking-2025-05-14",
    "fine-grained-tool-streaming-2025-05-14",
  ].join(","),
};

/**
 * Creates a custom fetch function for OAuth-authenticated requests.
 * This wrapper applies all required transformations for OAuth mode:
 * - Uses Authorization: Bearer header (NOT x-api-key)
 * - Adds OAuth-required beta headers (oauth-2025-04-20 is critical)
 * - Sets User-Agent to Claude CLI
 * - Adds ?beta=true query parameter to /v1/messages
 * - Prefixes tool names with mcp_
 * - Strips mcp_ prefix from tool names in responses
 *
 * Accepts a getter function instead of a static token so that refreshed
 * tokens are picked up automatically on each request.
 */
function createOAuthFetch(
  getToken: () => string,
  includeOptionalBetas = true,
): typeof fetch {
  return async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    // Build the URL
    let requestUrl: URL | null = null;

    try {
      if (typeof input === "string" || input instanceof URL) {
        requestUrl = new URL(input.toString());
      } else if (input instanceof Request) {
        requestUrl = new URL(input.url);
      }
    } catch {
      requestUrl = null;
    }

    // Add ?beta=true to /v1/messages endpoint
    if (
      requestUrl &&
      requestUrl.pathname === "/v1/messages" &&
      !requestUrl.searchParams.has("beta")
    ) {
      requestUrl.searchParams.set("beta", "true");
    }

    // Build new headers
    const requestHeaders = new Headers();

    // Copy headers from Request object if present
    if (input instanceof Request) {
      input.headers.forEach((value, key) => {
        requestHeaders.set(key, value);
      });
    }

    // Copy headers from init if present
    if (init?.headers) {
      if (init.headers instanceof Headers) {
        init.headers.forEach((value, key) => {
          requestHeaders.set(key, value);
        });
      } else if (Array.isArray(init.headers)) {
        for (const [key, value] of init.headers) {
          if (typeof value !== "undefined") {
            requestHeaders.set(key, String(value));
          }
        }
      } else {
        for (const [key, value] of Object.entries(init.headers)) {
          if (typeof value !== "undefined") {
            requestHeaders.set(key, String(value));
          }
        }
      }
    }

    // Check if claude-code beta was requested
    const incomingBeta = requestHeaders.get("anthropic-beta") || "";
    const incomingBetasList = incomingBeta
      .split(",")
      .map((b) => b.trim())
      .filter(Boolean);
    const includeClaudeCode = incomingBetasList.includes(
      "claude-code-20250219",
    );

    // Merge beta headers — oauth-2025-04-20 is always required for OAuth;
    // optional betas (interleaved-thinking) gated on includeOptionalBetas.
    const mergedBetas = [
      "oauth-2025-04-20",
      ...(includeOptionalBetas ? ["interleaved-thinking-2025-05-14"] : []),
      ...(includeClaudeCode ? ["claude-code-20250219"] : []),
    ].join(",");

    // Set OAuth authorization (Bearer token, NOT x-api-key)
    // Call getToken() each time so refreshed tokens are used automatically.
    requestHeaders.set("authorization", `Bearer ${getToken()}`);
    requestHeaders.set("anthropic-beta", mergedBetas);
    requestHeaders.set("user-agent", CLAUDE_CLI_USER_AGENT);
    requestHeaders.delete("x-api-key");

    logger.debug("[createOAuthFetch] Making OAuth request:", {
      url: requestUrl?.toString() || input.toString(),
      hasAuthorization: requestHeaders.has("authorization"),
      authType: "Bearer",
      anthropicBeta: requestHeaders.get("anthropic-beta"),
      userAgent: requestHeaders.get("user-agent"),
    });

    // Add mcp_ prefix to tool names in request body
    let body = init?.body;
    if (body && typeof body === "string") {
      try {
        const parsed = JSON.parse(body);

        // Add prefix to tools definitions
        if (parsed.tools && Array.isArray(parsed.tools)) {
          parsed.tools = parsed.tools.map(
            (tool: { name?: string; [key: string]: unknown }) => ({
              ...tool,
              name: tool.name ? `${MCP_TOOL_PREFIX}${tool.name}` : tool.name,
            }),
          );
        }

        // Add prefix to tool_use blocks in messages
        if (parsed.messages && Array.isArray(parsed.messages)) {
          parsed.messages = parsed.messages.map(
            (msg: { content?: unknown; [key: string]: unknown }) => {
              if (msg.content && Array.isArray(msg.content)) {
                msg.content = msg.content.map((block: unknown) => {
                  const b = block as {
                    type?: string;
                    name?: string;
                    [key: string]: unknown;
                  };
                  if (b.type === "tool_use" && b.name) {
                    return {
                      ...b,
                      name: `${MCP_TOOL_PREFIX}${b.name}`,
                    };
                  }
                  return block;
                });
              }
              return msg;
            },
          );
        }

        body = JSON.stringify(parsed);
      } catch {
        // Ignore JSON parse errors
      }
    }

    // Make the request
    const response = await fetch(
      requestUrl?.toString() ||
        (input instanceof Request ? input.url : input.toString()),
      {
        ...init,
        body,
        headers: requestHeaders,
      },
    );

    // Transform streaming response to rename tools back (remove mcp_ prefix).
    // Uses a small carry buffer to handle cross-chunk boundary splits of
    // `"name": "mcp_..."` patterns.
    if (response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const encoder = new TextEncoder();
      // Carry tail covers the longest possible partial match: `"name": "mcp_`
      const CARRY_TAIL = 24;
      let carry = "";

      const stream = new ReadableStream({
        async pull(controller) {
          const { done, value } = await reader.read();
          if (done) {
            // Flush any remaining carry
            if (carry) {
              const flushed = carry.replace(
                /"name"\s*:\s*"mcp_([^"]+)"/g,
                '"name": "$1"',
              );
              controller.enqueue(encoder.encode(flushed));
              carry = "";
            }
            controller.close();
            return;
          }

          const chunkText = decoder.decode(value, { stream: true });
          const combined = carry + chunkText;
          const replaced = combined.replace(
            /"name"\s*:\s*"mcp_([^"]+)"/g,
            '"name": "$1"',
          );
          // Keep a small tail as carry to cover partial matches at chunk boundary
          const safeLen = Math.max(0, replaced.length - CARRY_TAIL);
          carry = replaced.slice(safeLen);
          const toEmit = replaced.slice(0, safeLen);
          if (toEmit) {
            controller.enqueue(encoder.encode(toEmit));
          }
        },
      });

      return new Response(stream, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    }

    return response;
  };
}

// AnthropicProviderConfig is imported from types/providers.ts
// Re-export for backward compatibility
export type { AnthropicProviderConfig } from "../types/providers.js";

// Configuration helpers - now using consolidated utility
const getAnthropicApiKey = (): string => {
  return validateApiKey(createAnthropicConfig());
};

const getDefaultAnthropicModel = (): string => {
  return getProviderModel("ANTHROPIC_MODEL", AnthropicModels.CLAUDE_3_5_SONNET);
};

/**
 * Get OAuth token from stored credentials file or environment.
 * Priority:
 * 1. Stored credentials file (~/.neurolink/anthropic-credentials.json)
 * 2. Environment variables (ANTHROPIC_OAUTH_TOKEN or CLAUDE_OAUTH_TOKEN)
 */
const getOAuthToken = (): OAuthToken | null => {
  // First, check stored credentials file (highest priority)
  try {
    const credentialsPath = join(
      homedir(),
      ".neurolink",
      "anthropic-credentials.json",
    );
    if (existsSync(credentialsPath)) {
      const credentialsContent = readFileSync(credentialsPath, "utf-8");
      const credentials = JSON.parse(credentialsContent);
      if (credentials.type === "oauth" && credentials.oauth?.accessToken) {
        logger.debug(
          "[AnthropicProvider] Using OAuth token from stored credentials file",
        );
        return credentials.oauth as OAuthToken;
      }
    }
  } catch (error) {
    logger.debug(
      "[AnthropicProvider] Failed to read stored credentials:",
      error,
    );
  }

  // Fallback to environment variables
  const tokenString =
    process.env.ANTHROPIC_OAUTH_TOKEN || process.env.CLAUDE_OAUTH_TOKEN;
  if (!tokenString) {
    return null;
  }

  // Try to parse as JSON (for full token object with refresh token and expiry)
  try {
    const parsed = JSON.parse(tokenString);
    if (typeof parsed === "object" && parsed.accessToken) {
      return parsed as OAuthToken;
    }
    // If it's a simple string in JSON, use it as access token
    if (typeof parsed === "string") {
      return { accessToken: parsed };
    }
  } catch {
    // Not JSON, treat as plain access token string
  }

  // Treat as plain access token string
  return { accessToken: tokenString };
};

/**
 * Detect subscription tier from environment or token.
 * Environment variable ANTHROPIC_SUBSCRIPTION_TIER takes precedence.
 */
const detectSubscriptionTier = (
  oauthToken: OAuthToken | null,
): ClaudeSubscriptionTier => {
  // Check explicit environment variable first
  const envTier = process.env.ANTHROPIC_SUBSCRIPTION_TIER?.toLowerCase();
  if (envTier) {
    const validTiers: ClaudeSubscriptionTier[] = [
      "free",
      "pro",
      "max",
      "max_5",
      "max_20",
      "api",
    ];
    if (validTiers.includes(envTier as ClaudeSubscriptionTier)) {
      logger.debug("[detectSubscriptionTier] Using environment override", {
        tier: envTier,
      });
      return envTier as ClaudeSubscriptionTier;
    }
    logger.warn(
      "[detectSubscriptionTier] Invalid ANTHROPIC_SUBSCRIPTION_TIER",
      {
        value: envTier,
        validTiers,
      },
    );
  }

  // If using OAuth, default to 'pro' (most common subscription tier)
  if (oauthToken) {
    // Check if token scopes indicate tier (future-proofing)
    const scopes = oauthToken.scopes ?? [];
    let detectedTier: ClaudeSubscriptionTier = "pro";
    if (scopes.includes("max_20")) {
      detectedTier = "max_20";
    } else if (scopes.includes("max_5")) {
      detectedTier = "max_5";
    } else if (scopes.includes("max")) {
      detectedTier = "max";
    }
    logger.debug("[detectSubscriptionTier] Detected from OAuth token", {
      tier: detectedTier,
      scopes,
    });
    return detectedTier;
  }

  // Default to 'api' for API key authentication
  logger.debug(
    "[detectSubscriptionTier] No OAuth token, defaulting to API tier",
  );
  return "api";
};

/**
 * Determine authentication method based on available credentials.
 * OAuth takes precedence over API key if both are available.
 */
const detectAuthMethod = (
  oauthToken: OAuthToken | null,
): AnthropicAuthMethod => {
  // OAuth takes precedence if available
  const method: AnthropicAuthMethod = oauthToken ? "oauth" : "api_key";
  logger.debug("[detectAuthMethod] Auth method resolved", {
    method,
    hasOAuthToken: !!oauthToken,
  });
  return method;
};

/**
 * Parse rate limit information from Anthropic API response headers.
 * @param headers - Response headers from Anthropic API
 * @returns Parsed rate limit information
 */
const parseRateLimitHeaders = (
  headers: Headers | Record<string, string>,
): AnthropicRateLimitInfo => {
  const getHeader = (name: string): string | null => {
    if (headers instanceof Headers) {
      return headers.get(name);
    }
    return headers[name] || headers[name.toLowerCase()] || null;
  };

  const parseNumber = (value: string | null): number | undefined => {
    if (!value) {
      return undefined;
    }
    const num = parseInt(value, 10);
    return isNaN(num) ? undefined : num;
  };

  return {
    requestsLimit: parseNumber(getHeader("anthropic-ratelimit-requests-limit")),
    requestsRemaining: parseNumber(
      getHeader("anthropic-ratelimit-requests-remaining"),
    ),
    requestsReset: getHeader("anthropic-ratelimit-requests-reset") || undefined,
    tokensLimit: parseNumber(getHeader("anthropic-ratelimit-tokens-limit")),
    tokensRemaining: parseNumber(
      getHeader("anthropic-ratelimit-tokens-remaining"),
    ),
    tokensReset: getHeader("anthropic-ratelimit-tokens-reset") || undefined,
    retryAfter: parseNumber(getHeader("retry-after")),
  };
};

/**
 * Anthropic Provider v2 - BaseProvider Implementation
 * Enhanced with OAuth support, subscription tiers, and beta headers for Claude Code integration.
 */
export class AnthropicProvider extends BaseProvider {
  private model: LanguageModelV1;
  private readonly authMethod: AnthropicAuthMethod;
  private readonly subscriptionTier: ClaudeSubscriptionTier;
  private readonly enableBetaFeatures: boolean;
  private oauthToken: OAuthToken | null;
  private lastResponseMetadata: AnthropicResponseMetadata | null = null;
  private usageInfo: ClaudeUsageInfo | null = null;
  private refreshPromise?: Promise<void>;

  /**
   * Create a new Anthropic provider instance.
   *
   * @param modelName - Optional model name to use (defaults to CLAUDE_3_5_SONNET)
   * @param sdk - Optional NeuroLink SDK instance
   * @param config - Optional configuration options for auth, subscription tier, and beta features
   */
  constructor(
    modelName?: string,
    sdk?: unknown,
    config?: AnthropicProviderConfig,
  ) {
    // Pre-compute effective model with tier validation before calling super
    const oauthToken = config?.oauthToken ?? getOAuthToken();
    const subscriptionTier =
      config?.subscriptionTier ?? detectSubscriptionTier(oauthToken);
    const targetModel = modelName || getDefaultAnthropicModel();

    // Determine effective model based on tier access
    let effectiveModel = targetModel;
    if (
      subscriptionTier !== "api" &&
      !isModelAvailableForTier(targetModel, subscriptionTier)
    ) {
      effectiveModel = getRecommendedModelForTier(subscriptionTier);
      logger.warn(
        "Model not available for subscription tier, using recommended model",
        {
          requestedModel: targetModel,
          subscriptionTier,
          recommendedModel: effectiveModel,
        },
      );
    }

    super(
      effectiveModel,
      "anthropic" as AIProviderName,
      sdk as NeuroLink | undefined,
    );

    // Apply configuration with defaults
    this.enableBetaFeatures = config?.enableBetaFeatures ?? true;

    // Store computed values
    this.oauthToken = oauthToken;
    this.subscriptionTier = subscriptionTier;

    // Determine auth method - config takes precedence, then auto-detect
    this.authMethod = config?.authMethod ?? detectAuthMethod(this.oauthToken);

    // Build headers based on auth method and subscription tier
    const headers: Record<string, string> = this.getAuthHeaders();

    // Create Anthropic instance based on auth method
    let anthropic: ReturnType<typeof createAnthropic>;

    logger.debug("[AnthropicProvider] Constructor - checking OAuth:", {
      authMethod: this.authMethod,
      hasOAuthToken: !!this.oauthToken,
      hasAccessToken: !!this.oauthToken?.accessToken,
    });

    if (this.authMethod === "oauth" && this.oauthToken) {
      // OAuth authentication - use custom fetch wrapper that handles:
      // - Bearer token authorization
      // - OAuth beta headers (oauth-2025-04-20, NOT claude-code-20250219)
      // - User-Agent spoofing
      // - ?beta=true query param
      // - Tool name prefixing/stripping
      logger.debug("[AnthropicProvider] Creating OAuth fetch wrapper...");
      // Pass a getter so the fetch wrapper always uses the current token,
      // even after an automatic token refresh.
      // oauthToken is guaranteed non-null here (checked by the enclosing if-guard).
      const tokenRef = this.oauthToken;
      const oauthFetch = createOAuthFetch(
        () => tokenRef.accessToken,
        this.enableBetaFeatures,
      );

      // For OAuth, we use a dummy API key since our fetch wrapper handles auth
      // IMPORTANT: Do NOT pass beta headers here - our fetch wrapper handles them
      // The claude-code-20250219 beta header triggers "credential only for Claude Code" error
      anthropic = createAnthropic({
        apiKey: "oauth-authenticated", // Placeholder, actual auth is in fetch wrapper
        // Note: No headers passed - fetch wrapper sets oauth-2025-04-20 beta header
        fetch: oauthFetch,
      });
      logger.debug(
        "[AnthropicProvider] Anthropic SDK created with OAuth fetch wrapper",
      );

      logger.debug("Anthropic Provider initialized with OAuth", {
        modelName: this.modelName,
        provider: this.providerName,
        authMethod: this.authMethod,
        subscriptionTier: this.subscriptionTier,
        enableBetaFeatures: this.enableBetaFeatures,
        hasRefreshToken: !!this.oauthToken.refreshToken,
        tokenExpiry: this.oauthToken.expiresAt
          ? new Date(this.oauthToken.expiresAt).toISOString()
          : "none",
      });
    } else {
      // Traditional API key authentication
      const apiKeyToUse = config?.apiKey ?? getAnthropicApiKey();

      anthropic = createAnthropic({
        apiKey: apiKeyToUse,
        headers,
        fetch: createProxyFetch(),
      });

      logger.debug("Anthropic Provider initialized with API key", {
        modelName: this.modelName,
        provider: this.providerName,
        authMethod: this.authMethod,
        subscriptionTier: this.subscriptionTier,
        enableBetaFeatures: this.enableBetaFeatures,
      });
    }

    // Initialize Anthropic model with configured instance
    this.model = anthropic(this.modelName || getDefaultAnthropicModel());

    // Initialize usage tracking
    this.usageInfo = {
      messagesUsed: 0,
      messagesRemaining: -1, // Unknown until we get rate limit headers
      tokensUsed: 0,
      tokensRemaining: -1,
      inputTokensUsed: 0,
      outputTokensUsed: 0,
      lastRequestTimestamp: 0,
      isRateLimited: false,
      requestCount: 0,
      messageQuotaPercent: 0,
      tokenQuotaPercent: 0,
    };

    logger.debug("Anthropic Provider v2 initialized", {
      modelName: this.modelName,
      provider: this.providerName,
      authMethod: this.authMethod,
      subscriptionTier: this.subscriptionTier,
      enableBetaFeatures: this.enableBetaFeatures,
      betaFeatures: this.enableBetaFeatures
        ? ANTHROPIC_BETA_HEADERS["anthropic-beta"]
        : "disabled",
    });
  }

  /**
   * Get authentication headers based on current auth method and configuration.
   *
   * @returns Headers object containing auth and beta feature headers
   */
  public getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};

    // Add beta headers if enabled
    if (this.enableBetaFeatures) {
      headers["anthropic-beta"] = ANTHROPIC_BETA_HEADERS["anthropic-beta"];
    }

    // Add subscription-specific headers if applicable
    if (this.subscriptionTier !== "api") {
      headers["x-subscription-tier"] = this.subscriptionTier;
    }

    return headers;
  }

  /**
   * Validate if a model is accessible with the current subscription tier.
   *
   * @param model - The model ID to validate
   * @returns true if the model is accessible, false otherwise
   *
   * @example
   * ```typescript
   * const provider = new AnthropicProvider();
   * if (provider.validateModelAccess("claude-opus-4-5-20251101")) {
   *   // Use the model
   * } else {
   *   // Fall back to a different model or show upgrade prompt
   * }
   * ```
   */
  public validateModelAccess(model: string): boolean {
    // API tier has access to all models
    if (this.subscriptionTier === "api") {
      return true;
    }

    const hasAccess = isModelAvailableForTier(model, this.subscriptionTier);
    if (!hasAccess) {
      logger.debug("[validateModelAccess] Model not available for tier", {
        model,
        tier: this.subscriptionTier,
      });
    }
    return hasAccess;
  }

  /**
   * Get current usage information.
   *
   * Returns usage tracking data including messages sent, tokens consumed,
   * and remaining quotas. This information is updated after each API request.
   *
   * @returns Current usage info or null if no requests have been made
   *
   * @example
   * ```typescript
   * const usage = provider.getUsageInfo();
   * if (usage && usage.tokenQuotaPercent > 80) {
   *   console.warn("Approaching token quota limit");
   * }
   * ```
   */
  public getUsageInfo(): ClaudeUsageInfo | null {
    return this.usageInfo;
  }

  /**
   * Check if beta features are enabled for this provider instance.
   *
   * @returns true if beta features are enabled
   */
  public areBetaFeaturesEnabled(): boolean {
    return this.enableBetaFeatures;
  }

  /**
   * Get model capabilities for the current model.
   *
   * @returns The model capabilities or undefined if not found
   */
  public getModelCapabilities() {
    return getModelCapabilities(this.modelName || this.getDefaultModel());
  }

  /**
   * Get the current subscription tier.
   * @returns The detected or configured subscription tier
   */
  public getSubscriptionTier(): ClaudeSubscriptionTier {
    return this.subscriptionTier;
  }

  /**
   * Get the authentication method being used.
   * @returns The current authentication method
   */
  public getAuthMethod(): AnthropicAuthMethod {
    return this.authMethod;
  }

  /**
   * Refresh OAuth token if needed and possible.
   * This method checks if the token is expired or about to expire,
   * and attempts to refresh it using the refresh token if available.
   *
   * @returns Promise that resolves when refresh is complete (or not needed)
   * @throws Error if refresh is needed but fails
   */
  public async refreshAuthIfNeeded(): Promise<void> {
    // Only applicable for OAuth authentication
    if (this.authMethod !== "oauth" || !this.oauthToken) {
      logger.debug("Token refresh not applicable for API key authentication");
      return;
    }

    // Check if token has expiry information
    if (!this.oauthToken.expiresAt) {
      logger.debug("Token has no expiry information, assuming valid");
      return;
    }

    // expiresAt is stored as Unix milliseconds (matching how auth status/refresh stores it).
    // Compare against Date.now() so both sides are in milliseconds.
    const now = Date.now();
    const isExpired = this.oauthToken.expiresAt <= now;
    const isExpiringSoon =
      this.oauthToken.expiresAt <= now + TOKEN_EXPIRY_BUFFER_MS;

    if (!isExpired && !isExpiringSoon) {
      logger.debug("OAuth token is still valid", {
        expiresInMs: this.oauthToken.expiresAt - now,
      });
      return;
    }

    // Check if we have a refresh token
    if (!this.oauthToken.refreshToken) {
      if (isExpired) {
        throw new AuthenticationError(
          "OAuth token expired and no refresh token available. Please re-authenticate.",
          this.providerName,
        );
      }
      logger.warn("OAuth token expiring soon but no refresh token available", {
        expiresInMs: this.oauthToken.expiresAt - now,
      });
      return;
    }

    // Serialize concurrent refresh attempts — if a refresh is already in flight,
    // wait for it rather than issuing a duplicate request.
    if (this.refreshPromise) {
      await this.refreshPromise;
      return;
    }

    // Attempt to refresh the token using the correct Anthropic token endpoint.
    logger.info("Refreshing OAuth token", {
      isExpired,
      expiresInMs: this.oauthToken.expiresAt - now,
    });

    // Capture the token reference before entering the async IIFE;
    // the enclosing guards already verified both fields are non-null.
    const tokenRef = this.oauthToken;
    const refreshToken = tokenRef.refreshToken as string;

    this.refreshPromise = (async () => {
      const REFRESH_TIMEOUT_MS = 30_000;
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        REFRESH_TIMEOUT_MS,
      );

      const response = await fetch(ANTHROPIC_TOKEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": CLAUDE_CLI_USER_AGENT,
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: CLAUDE_CODE_CLIENT_ID,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new AuthenticationError(
          `Failed to refresh OAuth token: ${response.status} ${errorText}`,
          this.providerName,
        );
      }

      const newToken = (await response.json()) as {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
        token_type?: string;
        scope?: string;
      };

      // Mutate the existing oauthToken object in-place so that the fetch wrapper
      // closure (which captured the object reference, not a copy) picks up the
      // new accessToken automatically on the next request.
      // Store expiresAt as milliseconds to match the format used by auth status/refresh.
      tokenRef.accessToken = newToken.access_token;
      tokenRef.refreshToken = newToken.refresh_token || tokenRef.refreshToken;
      tokenRef.expiresAt = newToken.expires_in
        ? Date.now() + newToken.expires_in * 1000
        : undefined;
      tokenRef.tokenType = newToken.token_type || "Bearer";
      const updatedToken = tokenRef;

      // Persist the refreshed token to disk atomically (tmp + rename) so
      // subsequent provider instances and the CLI pick up the new credentials.
      try {
        const credentialsDir = join(homedir(), ".neurolink");
        if (!existsSync(credentialsDir)) {
          mkdirSync(credentialsDir, { recursive: true });
        }
        const credentialsPath = join(
          credentialsDir,
          "anthropic-credentials.json",
        );
        const tmpPath = `${credentialsPath}.tmp`;
        const existingRaw = existsSync(credentialsPath)
          ? JSON.parse(readFileSync(credentialsPath, "utf-8"))
          : {};
        const updated = {
          ...existingRaw,
          type: "oauth",
          oauth: updatedToken,
          updatedAt: Date.now(),
        };
        writeFileSync(tmpPath, JSON.stringify(updated, null, 2), {
          mode: 0o600,
        });
        renameSync(tmpPath, credentialsPath);
        logger.debug("Refreshed OAuth credentials persisted to disk");
      } catch (persistError) {
        // Non-fatal: in-memory token is already updated; next CLI start will
        // need a manual refresh but the current session will work.
        logger.warn("Failed to persist refreshed OAuth token to disk", {
          error:
            persistError instanceof Error
              ? persistError.message
              : String(persistError),
        });
      }

      logger.info("OAuth token refreshed successfully", {
        hasNewRefreshToken: !!newToken.refresh_token,
        expiresIn: newToken.expires_in,
      });
    })();

    try {
      await this.refreshPromise;
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new AuthenticationError(
        `Failed to refresh OAuth token: ${error instanceof Error ? error.message : String(error)}`,
        this.providerName,
      );
    } finally {
      this.refreshPromise = undefined;
    }
  }

  /**
   * Get the last response metadata including rate limit information.
   * @returns The last response metadata or null if no request has been made
   */
  public getLastResponseMetadata(): AnthropicResponseMetadata | null {
    return this.lastResponseMetadata;
  }

  /**
   * Update response metadata from API response headers.
   * This should be called after each API request to track rate limits.
   * @param headers - Response headers from the API
   * @param requestId - Optional request ID
   */
  protected updateResponseMetadata(
    headers: Headers | Record<string, string>,
    requestId?: string,
    usageUpdate?: { inputTokens?: number; outputTokens?: number },
  ): void {
    this.lastResponseMetadata = {
      rateLimit: parseRateLimitHeaders(headers),
      requestId:
        requestId ||
        (headers instanceof Headers
          ? headers.get("x-request-id") || undefined
          : headers["x-request-id"]),
      serverTiming:
        headers instanceof Headers
          ? headers.get("server-timing") || undefined
          : headers["server-timing"],
    };

    // Update usage tracking
    const rateLimit = this.lastResponseMetadata.rateLimit;
    if (this.usageInfo) {
      this.usageInfo.requestCount++;
      this.usageInfo.messagesUsed++;
      this.usageInfo.lastRequestTimestamp = Date.now();

      // Update token usage if provided
      if (usageUpdate) {
        if (usageUpdate.inputTokens !== undefined) {
          this.usageInfo.inputTokensUsed += usageUpdate.inputTokens;
          this.usageInfo.tokensUsed += usageUpdate.inputTokens;
        }
        if (usageUpdate.outputTokens !== undefined) {
          this.usageInfo.outputTokensUsed += usageUpdate.outputTokens;
          this.usageInfo.tokensUsed += usageUpdate.outputTokens;
        }
      }

      // Update remaining quotas from rate limit headers
      if (rateLimit?.requestsRemaining !== undefined) {
        this.usageInfo.messagesRemaining = rateLimit.requestsRemaining;
      }
      if (rateLimit?.tokensRemaining !== undefined) {
        this.usageInfo.tokensRemaining = rateLimit.tokensRemaining;
      }

      // Calculate quota percentages
      if (rateLimit?.requestsLimit && rateLimit.requestsLimit > 0) {
        this.usageInfo.messageQuotaPercent = Math.round(
          ((rateLimit.requestsLimit - (rateLimit.requestsRemaining ?? 0)) /
            rateLimit.requestsLimit) *
            100,
        );
      }
      if (rateLimit?.tokensLimit && rateLimit.tokensLimit > 0) {
        this.usageInfo.tokenQuotaPercent = Math.round(
          ((rateLimit.tokensLimit - (rateLimit.tokensRemaining ?? 0)) /
            rateLimit.tokensLimit) *
            100,
        );
      }

      // Check for rate limiting
      if (rateLimit?.retryAfter !== undefined) {
        this.usageInfo.isRateLimited = true;
        this.usageInfo.rateLimitExpiresAt =
          Date.now() + rateLimit.retryAfter * 1000;
      } else {
        this.usageInfo.isRateLimited = false;
        this.usageInfo.rateLimitExpiresAt = undefined;
      }
    }

    // Log rate limit warnings if approaching limits
    if (rateLimit?.requestsRemaining !== undefined) {
      if (rateLimit.requestsRemaining <= 5) {
        logger.warn("Approaching Anthropic request rate limit", {
          remaining: rateLimit.requestsRemaining,
          limit: rateLimit.requestsLimit,
          reset: rateLimit.requestsReset,
        });
      }
    }
    if (rateLimit?.tokensRemaining !== undefined) {
      if (
        rateLimit.tokensLimit &&
        rateLimit.tokensRemaining < rateLimit.tokensLimit * 0.1
      ) {
        logger.warn("Approaching Anthropic token rate limit", {
          remaining: rateLimit.tokensRemaining,
          limit: rateLimit.tokensLimit,
          reset: rateLimit.tokensReset,
        });
      }
    }
  }

  public getProviderName(): AIProviderName {
    return "anthropic" as AIProviderName;
  }

  public getDefaultModel(): string {
    return getDefaultAnthropicModel();
  }

  /**
   * Returns the Vercel AI SDK model instance for Anthropic
   */
  public getAISDKModel(): LanguageModelV1 {
    return this.model;
  }

  protected formatProviderError(error: unknown): Error {
    if (error instanceof TimeoutError) {
      return new NetworkError(
        `Request timed out after ${error.timeout}ms`,
        this.providerName,
      );
    }

    const errorRecord = error as UnknownRecord;
    const message =
      typeof errorRecord?.message === "string"
        ? errorRecord.message
        : "Unknown error";

    if (
      message.includes("API_KEY_INVALID") ||
      message.includes("Invalid API key")
    ) {
      return new AuthenticationError(
        "Invalid Anthropic API key. Please check your ANTHROPIC_API_KEY environment variable.",
        this.providerName,
      );
    }

    if (
      message.includes("rate limit") ||
      message.includes("too_many_requests") ||
      message.includes("429")
    ) {
      return new RateLimitError(
        "Anthropic rate limit exceeded. Please try again later.",
        this.providerName,
      );
    }

    if (
      message.includes("ECONNRESET") ||
      message.includes("ENOTFOUND") ||
      message.includes("ECONNREFUSED") ||
      message.includes("network") ||
      message.includes("connection")
    ) {
      return new NetworkError(
        `Connection error: ${message}`,
        this.providerName,
      );
    }

    if (
      message.includes("500") ||
      message.includes("502") ||
      message.includes("503") ||
      message.includes("504") ||
      message.includes("server error")
    ) {
      return new ProviderError(`Server error: ${message}`, this.providerName);
    }

    return new ProviderError(`Anthropic error: ${message}`, this.providerName);
  }

  // executeGenerate removed - BaseProvider handles all generation with tools

  /**
   * Override generate to refresh the OAuth token before delegating to
   * BaseProvider so that expired tokens are renewed automatically.
   */
  override async generate(
    optionsOrPrompt: TextGenerationOptions | string,
    analysisSchema?: ValidationSchema,
  ): Promise<EnhancedGenerateResult | null> {
    await this.refreshAuthIfNeeded();
    return super.generate(optionsOrPrompt, analysisSchema);
  }

  protected async executeStream(
    options: StreamOptions,
    _analysisSchema?: ValidationSchema,
  ): Promise<StreamResult> {
    // Refresh OAuth token if needed before making any API request.
    await this.refreshAuthIfNeeded();
    this.validateStreamOptions(options);

    const timeout = this.getTimeout(options);
    const timeoutController = createTimeoutController(
      timeout,
      this.providerName,
      "stream",
    );

    try {
      // Get tools - options.tools is pre-merged by BaseProvider.stream() with
      // base tools (MCP/built-in) + user-provided tools (RAG, etc.)
      const shouldUseTools = !options.disableTools && this.supportsTools();
      const tools = shouldUseTools
        ? (options.tools as Record<string, Tool>) || (await this.getAllTools())
        : {};

      // Build message array from options with multimodal support
      // Using protected helper from BaseProvider to eliminate code duplication
      const messages = await this.buildMessagesForStream(options);
      const model = await this.getAISDKModelWithMiddleware(options);
      const result = await streamText({
        model: model,
        messages: messages,
        temperature: options.temperature,
        maxTokens: options.maxTokens, // No default limit - unlimited unless specified
        tools,
        maxSteps: options.maxSteps || DEFAULT_MAX_STEPS,
        toolChoice: shouldUseTools ? "auto" : "none",
        abortSignal: composeAbortSignals(
          options.abortSignal,
          timeoutController?.controller.signal,
        ),
        experimental_telemetry:
          this.telemetryHandler.getTelemetryConfig(options),
        onStepFinish: ({ toolCalls, toolResults }) => {
          this.handleToolExecutionStorage(
            toolCalls,
            toolResults,
            options,
            new Date(),
          ).catch((error: unknown) => {
            logger.warn("[AnthropicProvider] Failed to store tool executions", {
              provider: this.providerName,
              error: error instanceof Error ? error.message : String(error),
            });
          });
        },
      });

      timeoutController?.cleanup();

      const transformedStream = this.createTextStream(result);

      // ✅ Note: Vercel AI SDK's streamText() method limitations with tools
      // The streamText() function doesn't provide the same tool result access as generateText()
      // Full tool support is now available with real streaming
      const toolCalls: Array<{
        toolCallId: string;
        toolName: string;
        args: Record<string, unknown>;
      }> = [];

      const toolResults: Array<{
        toolName: string;
        status: "success" | "failure";
        output?: JsonValue;
        id: string;
      }> = [];

      return {
        stream: transformedStream,
        provider: this.providerName,
        model: this.modelName,
        toolCalls, // ✅ Include tool calls in stream result
        toolResults, // ✅ Include tool results in stream result
        // Note: omit usage/finishReason to avoid blocking streaming; compute asynchronously if needed.
      };
    } catch (error: unknown) {
      timeoutController?.cleanup();
      throw this.handleProviderError(error);
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Check OAuth token first
      const oauthToken = getOAuthToken();
      if (oauthToken) {
        return true;
      }
      // Fall back to API key check
      getAnthropicApiKey();
      return true;
    } catch {
      return false;
    }
  }

  getModel(): LanguageModelV1 {
    return this.model;
  }
}

// Re-export types and utilities for convenience
export {
  ModelAccessError,
  isModelAvailableForTier,
  getRecommendedModelForTier,
  getModelCapabilities,
} from "../models/anthropicModels.js";

// Export beta headers constant for external use
export { ANTHROPIC_BETA_HEADERS };

export default AnthropicProvider;
