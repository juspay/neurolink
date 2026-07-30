import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { AnthropicModels } from "../../constants/enums.js";
import { logger } from "../../utils/logger.js";
import {
  createAnthropicConfig,
  getProviderModel,
  validateApiKey,
} from "../../utils/providerConfig.js";
import type {
  AnthropicAuthMethod,
  AnthropicRateLimitInfo,
  ClaudeSubscriptionTier,
  OAuthToken,
} from "../../types/index.js";

export const getAnthropicApiKey = (): string => {
  return validateApiKey(createAnthropicConfig());
};

export const getDefaultAnthropicModel = (): string => {
  return getProviderModel("ANTHROPIC_MODEL", AnthropicModels.CLAUDE_SONNET_4_6);
};

export const getOAuthToken = (): OAuthToken | null => {
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

export const detectSubscriptionTier = (
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

export const detectAuthMethod = (
  oauthToken: OAuthToken | null,
): AnthropicAuthMethod => {
  // Explicit env var takes highest precedence — allows forcing api_key mode
  // even when OAuth credentials exist (e.g., when using a proxy that handles auth)
  const explicit = process.env.ANTHROPIC_AUTH_METHOD?.toLowerCase();
  if (explicit === "api_key" || explicit === "apikey") {
    logger.debug(
      "[detectAuthMethod] Forced to api_key by ANTHROPIC_AUTH_METHOD env var",
    );
    return "api_key";
  }
  if (explicit === "oauth") {
    if (oauthToken) {
      logger.debug(
        "[detectAuthMethod] Forced to oauth by ANTHROPIC_AUTH_METHOD env var",
      );
      return "oauth";
    }
    logger.warn(
      "[detectAuthMethod] ANTHROPIC_AUTH_METHOD=oauth but no OAuth token found; falling through to auto-detection",
    );
  } else if (explicit) {
    logger.warn(
      "[detectAuthMethod] Unrecognized ANTHROPIC_AUTH_METHOD value; falling through to auto-detection",
      {
        value: explicit,
      },
    );
  }
  // Auto-detect: OAuth takes precedence if available
  const method: AnthropicAuthMethod = oauthToken ? "oauth" : "api_key";
  logger.debug("[detectAuthMethod] Auth method resolved", {
    method,
    hasOAuthToken: !!oauthToken,
  });
  return method;
};

export const parseRateLimitHeaders = (
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
