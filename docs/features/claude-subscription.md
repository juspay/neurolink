---
title: Claude Subscription Support
description: Complete guide to using Claude subscription tiers (Free, Pro, Max, API) with NeuroLink including OAuth and API key authentication
keywords: claude, subscription, oauth, api key, anthropic, pro, max, authentication, tokens, quota
---

# Claude Subscription Support

NeuroLink provides flexible access to Anthropic's Claude models through multiple subscription tiers and authentication methods. This guide covers setup, configuration, and best practices for each tier.

## Overview

Claude is available through different subscription tiers, each offering varying levels of access, rate limits, and model availability:

| Tier     | Access Method     | Rate Limits      | Best For                                |
| -------- | ----------------- | ---------------- | --------------------------------------- |
| **Free** | claude.ai account | Limited messages | Exploration, personal use               |
| **Pro**  | OAuth + claude.ai | 5x Free tier     | Professional use, higher volume         |
| **Max**  | OAuth + claude.ai | Unlimited        | Heavy production, no rate limit worries |
| **API**  | API Key           | Pay-per-token    | Production systems, programmatic access |

### Subscription Tiers

The `ClaudeSubscriptionTier` type (defined in `src/lib/types/subscriptionTypes.ts`) supports these values:

- `"free"` -- Free tier with basic access and limited usage
- `"pro"` -- Professional tier with higher limits and priority access
- `"max"` -- Maximum tier with highest limits (alias for max_5)
- `"max_5"` -- Max 5x usage tier
- `"max_20"` -- Max 20x usage tier
- `"api"` -- Direct API access tier for developers and enterprises

**Free Tier:**

- Basic access to Claude via claude.ai
- Limited message quota per day
- Access to Claude 3 Haiku and Claude 3.5 Haiku models only
- Good for exploring Claude's capabilities

**Pro Subscription ($20/month):**

- Higher usage limits than Free tier
- Priority access during peak times
- Access to Haiku and Sonnet model families (Claude 3 Haiku, Claude 3.5 Haiku, Claude 3.5 Sonnet, Claude 3.5 Sonnet V2, Claude Sonnet 4)
- No access to Opus models

**Max Subscription ($100/month):**

- Highest usage limits
- All models available, including Opus
- Available in Max, Max 5x, and Max 20x usage multiplier variants

**API Access (Pay-per-use):**

- Direct programmatic access
- No monthly subscription required
- Pay only for tokens used
- Full model selection (all models)
- Production-ready SLAs

## Authentication Methods

NeuroLink supports two authentication methods for Claude access, defined by the `AnthropicAuthMethod` type:

- `"api_key"` -- Traditional API key authentication
- `"oauth"` -- OAuth 2.0 authentication for subscription-based access

### API Key Authentication (Recommended for Production)

The standard method using Anthropic API keys. Best for:

- Production deployments
- Server-side applications
- Predictable billing (pay-per-token)
- Full API control

### OAuth Authentication (Claude Pro/Max)

OAuth authentication allows you to use your existing Claude Pro or Max subscription through NeuroLink. This is ideal for:

- Personal development using your existing Pro/Max subscription
- CLI usage without additional API costs
- Leveraging your subscription's included usage quota

When you authenticate with OAuth, you are redirected to claude.ai to sign in with your Claude account. After authorizing, you receive an authorization code to paste back into the CLI. NeuroLink then securely stores your tokens for future requests.

## Setup Guide

### API Key Setup (Standard)

#### Step 1: Get Your API Key

1. Visit [console.anthropic.com](https://console.anthropic.com)
2. Sign in or create an account
3. Navigate to **API Keys** section
4. Click **Create Key**
5. Copy your new API key (starts with `sk-ant-`)

#### Step 2: Configure Environment

Set the API key in your environment:

```bash
# Required: Your Anthropic API key
export ANTHROPIC_API_KEY="sk-ant-api03-your-key-here"

# Optional: Default model
export ANTHROPIC_MODEL="claude-sonnet-4-20250514"
```

#### Step 3: Verify Configuration

```bash
# Using the CLI
pnpm run cli -- generate "Hello, Claude" --provider anthropic

# Or use the installed binary
neurolink generate "Hello, Claude" --provider anthropic
```

#### Step 4: SDK Usage

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain machine learning in simple terms" },
  provider: "anthropic",
  model: "claude-sonnet-4-20250514",
  temperature: 0.7,
  maxTokens: 1000,
});

console.log(result.content);
```

### OAuth Setup (Claude Pro/Max)

OAuth authentication allows you to use your Claude Pro or Max subscription through NeuroLink, leveraging your subscription quota instead of API billing.

OAuth authentication is designed for personal and development use. For production deployments, use API key authentication for better reliability and SLA guarantees.

#### Step 1: Start OAuth Authentication

Use the CLI to initiate the OAuth flow:

```bash
# Start OAuth authentication (interactive -- choose method)
pnpm run cli -- auth login anthropic

# Start OAuth authentication directly
pnpm run cli -- auth login anthropic --method oauth

# Or create an API key via OAuth (recommended for Pro/Max users)
pnpm run cli -- auth login anthropic --method create-api-key
```

The CLI supports three authentication methods for Anthropic:

| Method           | Description                                        |
| ---------------- | -------------------------------------------------- |
| `api-key`        | Traditional API key authentication (pay-per-use)   |
| `oauth`          | Direct OAuth for Claude Pro/Max subscriptions      |
| `create-api-key` | Create a real API key via OAuth using your account |

#### Step 2: Authorize in Browser

1. Sign in to your Claude account in the browser (claude.ai)
2. Review the requested permissions
3. Click **Authorize** to grant access
4. **Copy the authorization code** shown on the page

#### Step 3: Complete Authentication

Paste the authorization code back into the CLI when prompted:

```
Paste the authorization code: <paste-your-code-here>
```

The CLI will exchange the code for tokens and store them securely.

#### Step 4: Verify Authentication

```bash
# Check authentication status
pnpm run cli -- auth status

# Check status for a specific provider
pnpm run cli -- auth status anthropic

# Output example:
# Anthropic [Authenticated]
#   Method: oauth
#   Subscription: pro
#   Token Expires: 2026-02-10T12:00:00Z
#   Refresh Token: Available
```

#### Token Management

OAuth tokens are managed automatically by NeuroLink:

```bash
# View token information
pnpm run cli -- auth status

# Refresh tokens manually (usually automatic)
pnpm run cli -- auth refresh anthropic

# Revoke authentication
pnpm run cli -- auth logout anthropic
```

**Token Storage Location:**

Credentials are stored at `~/.neurolink/tokens.json` with `0o600` file permissions (via the `TokenStore` class). Legacy CLI-saved credentials may also exist at `~/.neurolink/anthropic-credentials.json`. The file format is:

```json
{
  "type": "oauth",
  "oauth": {
    "accessToken": "...",
    "refreshToken": "...",
    "expiresAt": 1740000000000,
    "tokenType": "Bearer",
    "scope": "user:profile user:inference"
  },
  "provider": "anthropic",
  "subscriptionTier": "pro",
  "createdAt": 1739000000000,
  "updatedAt": 1739000000000
}
```

Note: `expiresAt` is stored as Unix milliseconds (`Date.now()` scale), not seconds.

The `TokenStore` class (at `src/lib/auth/tokenStore.ts`) provides multi-provider token storage with XOR-based obfuscation at `~/.neurolink/tokens.json`.

#### SDK OAuth Usage

To use OAuth authentication in the SDK, pass `authMethod: "oauth"` and an `oauthToken` object to the Anthropic provider constructor via the NeuroLink configuration:

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink({
  provider: "anthropic",
  model: "claude-sonnet-4-20250514",
  authMethod: "oauth",
  oauthToken: {
    accessToken: "your-access-token",
    refreshToken: "your-refresh-token",
    expiresAt: Date.now() + 3600000, // milliseconds (Date.now() scale)
  },
});

const result = await neurolink.generate({
  prompt: "Hello, Claude!",
});
```

Alternatively, the provider auto-detects OAuth credentials from:

1. Stored credentials file (`~/.neurolink/tokens.json` or legacy `~/.neurolink/anthropic-credentials.json`) -- highest priority
2. Environment variables `ANTHROPIC_OAUTH_TOKEN` or `CLAUDE_OAUTH_TOKEN`

If either source provides a valid OAuth token, the provider automatically switches to OAuth mode without any explicit `authMethod` configuration.

#### AnthropicProvider Direct Usage

For advanced use cases, you can instantiate `AnthropicProvider` directly with `AnthropicProviderConfig`:

```typescript
import AnthropicProvider from "./lib/providers/anthropic.js";

const provider = new AnthropicProvider(
  "claude-sonnet-4-20250514", // model name
  undefined, // SDK instance (optional)
  {
    authMethod: "oauth",
    oauthToken: {
      accessToken: "your-token",
      refreshToken: "your-refresh-token",
      expiresAt: Date.now() + 3600000,
    },
    subscriptionTier: "pro",
    enableBetaFeatures: true, // default: true
  },
);
```

The `AnthropicProviderConfig` interface accepts:

| Property             | Type                     | Default       | Description                                    |
| -------------------- | ------------------------ | ------------- | ---------------------------------------------- |
| `authMethod`         | `"api_key" \| "oauth"`   | Auto-detected | Authentication method                          |
| `subscriptionTier`   | `ClaudeSubscriptionTier` | Auto-detected | Subscription tier for model access validation  |
| `enableBetaFeatures` | `boolean`                | `true`        | Include beta headers for experimental features |
| `oauthToken`         | `OAuthToken`             | Auto-detected | OAuth token for OAuth authentication           |
| `apiKey`             | `string`                 | From env      | API key for API key authentication             |

## Auto-Refresh Behavior

The Anthropic provider automatically refreshes expired OAuth tokens before every `generate()` and `stream()` call via the `refreshAuthIfNeeded()` method. This happens transparently and requires no user intervention.

**How auto-refresh works:**

1. Before each API call, the provider checks the `expiresAt` timestamp on the OAuth token
2. If the token is expired or within 5 minutes of expiring, a refresh is attempted
3. The refresh request is sent to `https://console.anthropic.com/v1/oauth/token` using the stored refresh token
4. The refreshed token is stored both in-memory (mutated in-place on the same object reference so the fetch wrapper picks it up) and persisted to `~/.neurolink/anthropic-credentials.json`
5. If no refresh token is available and the token is expired, an `AuthenticationError` is thrown

The `createOAuthFetch()` function accepts a getter function `() => string` that is called on each request to retrieve the current access token. Since `refreshAuthIfNeeded()` mutates `oauthToken.accessToken` in-place (rather than replacing the object), the getter — `() => tokenRef.accessToken` — returns the refreshed value automatically on subsequent requests without needing to re-create the fetch wrapper.

**Manual refresh via CLI:**

```bash
pnpm run cli -- auth refresh anthropic
```

## Configuration

### Environment Variables

| Variable                      | Description                        | Default                      | Required |
| ----------------------------- | ---------------------------------- | ---------------------------- | -------- |
| `ANTHROPIC_API_KEY`           | API key for authentication         | --                           | Yes\*    |
| `ANTHROPIC_MODEL`             | Default model to use               | `claude-3-5-sonnet-20241022` | No       |
| `ANTHROPIC_OAUTH_TOKEN`       | OAuth token (JSON or plain string) | --                           | No       |
| `CLAUDE_OAUTH_TOKEN`          | OAuth token (fallback env var)     | --                           | No       |
| `ANTHROPIC_SUBSCRIPTION_TIER` | Explicit subscription tier         | Auto-detected                | No       |

\*Required for API key authentication. Not required when using OAuth.

### Subscription Tier Detection

The provider detects the subscription tier in this priority order:

1. Explicit `subscriptionTier` passed in `AnthropicProviderConfig`
2. `ANTHROPIC_SUBSCRIPTION_TIER` environment variable (valid values: `free`, `pro`, `max`, `max_5`, `max_20`, `api`)
3. Inferred from OAuth token scopes (if present)
4. Default: `"pro"` when OAuth token is present, `"api"` when using API key

### CLI Options

```bash
# Specify provider and model
pnpm run cli -- generate "Your prompt" --provider anthropic --model claude-sonnet-4-20250514

# Set temperature and max tokens
pnpm run cli -- generate "Your prompt" --provider anthropic --temperature 0.7 --max-tokens 2000

# Use streaming output
pnpm run cli -- stream "Tell me a story" --provider anthropic

# Specify auth method and subscription tier
pnpm run cli -- generate "Your prompt" \
  --provider anthropic \
  --authMethod oauth \
  --subscriptionTier pro
```

The CLI also supports `anthropic-subscription` as a provider alias that indicates subscription tier support.

## Beta Features

Anthropic regularly releases new features in beta. NeuroLink includes beta headers automatically when `enableBetaFeatures` is true (the default).

### Beta Headers

For API key authentication, the following beta headers are included:

```
anthropic-beta: claude-code-20250219,interleaved-thinking-2025-05-14,fine-grained-tool-streaming-2025-05-14
```

These correspond to the `AnthropicBetaFeature` enum values in `src/lib/constants/enums.ts`:

| Enum Value               | Header Value                             |
| ------------------------ | ---------------------------------------- |
| `CLAUDE_CODE`            | `claude-code-20250219`                   |
| `INTERLEAVED_THINKING`   | `interleaved-thinking-2025-05-14`        |
| `FINE_GRAINED_STREAMING` | `fine-grained-tool-streaming-2025-05-14` |

For OAuth authentication, the fetch wrapper uses different beta headers:

```
anthropic-beta: oauth-2025-04-20,interleaved-thinking-2025-05-14
```

The `oauth-2025-04-20` header is required for OAuth-authenticated requests. The `claude-code-20250219` header is conditionally included only if the original request headers already contain it.

## Model Availability by Tier

### Model Access Matrix

Model access is defined in `MODEL_TIER_ACCESS` in `src/lib/models/anthropicModels.ts`:

| Model                                                  | Free | Pro | Max/Max_5/Max_20 | API |
| ------------------------------------------------------ | ---- | --- | ---------------- | --- |
| `claude-3-haiku-20240307` (Claude 3 Haiku)             | Yes  | Yes | Yes              | Yes |
| `claude-3-5-haiku-20241022` (Claude 3.5 Haiku)         | Yes  | Yes | Yes              | Yes |
| `claude-3-5-sonnet-20241022` (Claude 3.5 Sonnet)       | No   | Yes | Yes              | Yes |
| `claude-3-5-sonnet-v2-20241022` (Claude 3.5 Sonnet V2) | No   | Yes | Yes              | Yes |
| `claude-sonnet-4-20250514` (Claude Sonnet 4)           | No   | Yes | Yes              | Yes |
| `claude-3-opus-20240229` (Claude 3 Opus)               | No   | No  | Yes              | Yes |
| `claude-opus-4-20250514` (Claude Opus 4)               | No   | No  | Yes              | Yes |

Key observations:

- **Free** tier only gets Haiku models (Claude 3 Haiku and Claude 3.5 Haiku)
- **Pro** tier gets Haiku and Sonnet models, but **not Opus**
- **Max** tiers (max, max_5, max_20) and **API** have access to all models (wildcard `"*"`)

### Default Models by Tier

Each tier has a recommended default model (from `DEFAULT_MODELS_BY_TIER`):

| Tier   | Default Model               |
| ------ | --------------------------- |
| Free   | `claude-3-5-haiku-20241022` |
| Pro    | `claude-sonnet-4-20250514`  |
| Max    | `claude-opus-4-20250514`    |
| Max_5  | `claude-opus-4-20250514`    |
| Max_20 | `claude-opus-4-20250514`    |
| API    | `claude-sonnet-4-20250514`  |

### Model Tier Enforcement

When the provider detects that the requested model is not available for the user's subscription tier, it automatically falls back to the recommended model for that tier and logs a warning:

```typescript
// If a Pro user requests an Opus model:
// - The provider logs a warning
// - Falls back to claude-sonnet-4-20250514 (the Pro default)
```

You can validate model access programmatically:

```typescript
import {
  isModelAvailableForTier,
  getRecommendedModelForTier,
  getModelCapabilities,
  ModelAccessError,
} from "./lib/providers/anthropic.js";

// Check if a model is available
const available = isModelAvailableForTier("claude-opus-4-20250514", "pro");
// Returns: false (Opus requires max or api tier)

// Get recommended model for a tier
const recommended = getRecommendedModelForTier("pro");
// Returns: "claude-sonnet-4-20250514"

// Get model metadata
const capabilities = getModelCapabilities("claude-sonnet-4-20250514");
// Returns: { displayName: "Claude Sonnet 4", contextWindow: 200000, maxOutputTokens: 64000, ... }
```

### Choosing the Right Model

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// For quick, cost-effective responses (Free tier compatible)
const quickResult = await neurolink.generate({
  input: { text: "Summarize this text..." },
  provider: "anthropic",
  model: "claude-3-5-haiku-20241022",
});

// For balanced performance (Pro tier and above)
const balancedResult = await neurolink.generate({
  input: { text: "Analyze this code..." },
  provider: "anthropic",
  model: "claude-sonnet-4-20250514",
});

// For complex reasoning tasks (Max/API tier only)
const complexResult = await neurolink.generate({
  input: { text: "Solve this complex problem..." },
  provider: "anthropic",
  model: "claude-opus-4-20250514",
});
```

## Usage Tracking

### Rate Limit Tracking

The Anthropic provider tracks rate limit information from API response headers. After each request, you can query usage info:

```typescript
const provider = new AnthropicProvider("claude-sonnet-4-20250514");

const result = await provider.generate("Hello");

// Get usage information
const usage = provider.getUsageInfo();
if (usage) {
  console.log("Requests made:", usage.requestCount);
  console.log("Tokens used:", usage.tokensUsed);
  console.log("Message quota %:", usage.messageQuotaPercent);
  console.log("Token quota %:", usage.tokenQuotaPercent);
  console.log("Rate limited:", usage.isRateLimited);
}

// Get last response metadata including rate limits
const metadata = provider.getLastResponseMetadata();
if (metadata?.rateLimit) {
  console.log("Requests remaining:", metadata.rateLimit.requestsRemaining);
  console.log("Tokens remaining:", metadata.rateLimit.tokensRemaining);
}
```

The `ClaudeUsageInfo` type tracks:

| Field                 | Type      | Description                              |
| --------------------- | --------- | ---------------------------------------- |
| `messagesUsed`        | `number`  | Messages sent in current period          |
| `messagesRemaining`   | `number`  | Messages remaining (-1 if unknown)       |
| `tokensUsed`          | `number`  | Total tokens consumed                    |
| `tokensRemaining`     | `number`  | Tokens remaining (-1 if unknown)         |
| `inputTokensUsed`     | `number`  | Input/prompt tokens consumed             |
| `outputTokensUsed`    | `number`  | Output/response tokens consumed          |
| `requestCount`        | `number`  | Total API requests made                  |
| `isRateLimited`       | `boolean` | Whether currently rate limited           |
| `rateLimitExpiresAt`  | `number?` | When rate limit expires (ms timestamp)   |
| `messageQuotaPercent` | `number`  | Percentage of message quota used (0-100) |
| `tokenQuotaPercent`   | `number`  | Percentage of token quota used (0-100)   |

### Rate Limit Handling

The provider automatically logs warnings when approaching rate limits:

- When fewer than 5 requests remain in the current window
- When token usage exceeds 90% of the token limit

Rate limit information is parsed from these Anthropic response headers:

- `anthropic-ratelimit-requests-limit`
- `anthropic-ratelimit-requests-remaining`
- `anthropic-ratelimit-requests-reset`
- `anthropic-ratelimit-tokens-limit`
- `anthropic-ratelimit-tokens-remaining`
- `anthropic-ratelimit-tokens-reset`
- `retry-after`

### Monitoring API Usage

For API key authentication, monitor token usage from generate results:

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Your prompt" },
  provider: "anthropic",
});

// Access usage information from the result
console.log("Input tokens:", result.usage?.inputTokens);
console.log("Output tokens:", result.usage?.outputTokens);
console.log("Total tokens:", result.usage?.totalTokens);
```

## OAuth Implementation Details

### OAuth Flow

NeuroLink's OAuth implementation follows the same approach used by the official Claude Code CLI. The `AnthropicOAuth` class in `src/lib/auth/anthropicOAuth.ts` implements:

1. **PKCE Flow (S256)**: Uses Proof Key for Code Exchange with SHA-256 code challenge method
2. **Authorization Endpoint**: `https://claude.ai/oauth/authorize`
3. **Token Endpoint**: `https://console.anthropic.com/v1/oauth/token`
4. **Redirect URI**: `https://console.anthropic.com/oauth/code/callback`
5. **Default Scopes**: `org:create_api_key`, `user:profile`, `user:inference`

### OAuth Constants

Key constants from `src/lib/auth/anthropicOAuth.ts`:

| Constant                 | Value                                               |
| ------------------------ | --------------------------------------------------- |
| `CLAUDE_CODE_CLIENT_ID`  | `9d1c250a-e61b-44d9-88ed-5944d1962f5e`              |
| `ANTHROPIC_AUTH_URL`     | `https://claude.ai/oauth/authorize`                 |
| `ANTHROPIC_TOKEN_URL`    | `https://console.anthropic.com/v1/oauth/token`      |
| `ANTHROPIC_REDIRECT_URI` | `https://console.anthropic.com/oauth/code/callback` |
| `CLAUDE_CLI_USER_AGENT`  | `claude-cli/2.1.2 (external, cli)`                  |
| `MCP_TOOL_PREFIX`        | `mcp_`                                              |

### API Request Requirements for OAuth

When using OAuth tokens, the `createOAuthFetch()` wrapper automatically applies these transformations:

```typescript
// Required headers applied by the OAuth fetch wrapper
headers: {
  "Authorization": `Bearer ${accessToken}`,  // NOT x-api-key
  "anthropic-beta": "oauth-2025-04-20,interleaved-thinking-2025-05-14",
  "User-Agent": "claude-cli/2.1.2 (external, cli)"
}

// URL modified for /v1/messages endpoint
url: "https://api.anthropic.com/v1/messages?beta=true"
```

Additionally, the OAuth fetch wrapper:

- Prefixes tool names with `mcp_` in outgoing requests (both tool definitions and `tool_use` blocks in messages)
- Strips the `mcp_` prefix from tool names in streaming responses
- Removes the `x-api-key` header (OAuth uses `Authorization: Bearer` instead)

### OAuthToken Type

The `OAuthToken` type (from `src/lib/types/subscriptionTypes.ts`) used across the provider:

```typescript
type OAuthToken = {
  accessToken: string; // Required: access token for API requests
  refreshToken?: string; // Optional: for obtaining new access tokens
  expiresAt?: number; // Optional: Unix milliseconds (Date.now() scale)
  tokenType?: string; // Optional: typically "Bearer"
  scopes?: string[]; // Optional: granted scopes
};
```

Note: `expiresAt` is stored in **milliseconds** (matching `Date.now()`), not seconds.

### Known Limitations

OAuth tokens obtained through this flow may have model access restrictions enforced by Anthropic. Some users report that certain models return "This credential is only authorized for use with Claude Code" errors.

**Current limitations observed:**

| Model Family     | OAuth Access | Notes                           |
| ---------------- | ------------ | ------------------------------- |
| Claude 3 Haiku   | Works        | Reliable access                 |
| Claude 3.5 Haiku | Works        | Reliable access                 |
| Claude Sonnet 4  | Varies       | May return authorization errors |
| Claude Opus 4    | Varies       | May return authorization errors |

**Workarounds:**

1. **Use API Key Authentication**: For production use, API key authentication is more reliable
2. **Create API Key via OAuth**: Use `pnpm run cli -- auth login anthropic --method create-api-key` to create a real API key through `https://api.anthropic.com/api/oauth/claude_cli/create_api_key` (requires `org:create_api_key` scope)
3. **Use Haiku Models**: Haiku models appear to have more consistent OAuth access

## Troubleshooting

### Common Issues and Solutions

#### Authentication Errors

**Issue: "Invalid API key" error**

```
Error: Invalid Anthropic API key. Please check your ANTHROPIC_API_KEY environment variable.
```

**Solution:**

1. Verify your API key starts with `sk-ant-`
2. Check for extra spaces or characters
3. Ensure the key is active in [console.anthropic.com](https://console.anthropic.com)

```bash
# Verify environment variable is set correctly
echo $ANTHROPIC_API_KEY | head -c 20
# Should output: sk-ant-api03-xxxx...
```

#### OAuth Token Expired

**Issue: "OAuth token expired and no refresh token available" error**

**Solution:**

```bash
# Refresh the token
pnpm run cli -- auth refresh anthropic

# Or re-authenticate
pnpm run cli -- auth login anthropic
```

Note: If a refresh token is available, the provider will automatically refresh expired tokens before each `generate()` or `stream()` call. Manual refresh is only needed if automatic refresh fails.

#### Rate Limit Exceeded

**Issue: "Rate limit exceeded" (429) errors**

**Solution:**

1. For Free tier: Upgrade to Pro or Max for higher limits
2. For API: Request a rate limit increase from Anthropic
3. Monitor rate limit headers via `provider.getUsageInfo()` and `provider.getLastResponseMetadata()`

#### Model Access Denied

**Issue: Model falls back to a different model than requested**

The provider logs a warning when the requested model is not available for the detected subscription tier and automatically falls back to the recommended model. To fix:

1. Check your subscription tier supports the model (see [Model Access Matrix](#model-access-matrix))
2. Set the correct tier via `ANTHROPIC_SUBSCRIPTION_TIER` environment variable
3. For Opus models, a Max or API tier is required

#### OAuth Callback Failure

**Issue: OAuth callback never completes**

**Solution:**

1. Ensure no browser extensions are blocking redirects
2. The CLI uses the code-based redirect flow (code is shown on the page for you to copy)
3. Try a different browser
4. Check the authorization code has not expired (codes are single-use and time-limited)

### Debugging Tips

Enable debug logging for detailed information:

```bash
# Enable debug mode
export NEUROLINK_DEBUG=true

# Or for verbose output
export NEUROLINK_LOG_LEVEL=debug

# Run your command
pnpm run cli -- generate "Test prompt" --provider anthropic
```

The provider logs detailed debug information for:

- Auth method detection
- OAuth token refresh attempts
- Rate limit warnings
- Model tier fallback decisions

### Getting Help

If issues persist:

1. Check the [NeuroLink troubleshooting guide](../troubleshooting.md)
2. Visit [Anthropic's documentation](https://docs.anthropic.com)
3. Open an issue on [GitHub](https://github.com/juspay/neurolink/issues)

## Best Practices

### Security

- **Never commit API keys** to version control
- Use environment variables or secrets management
- Rotate API keys periodically
- OAuth credentials are stored with `0o600` permissions in `~/.neurolink/`

```bash
# Use .env file (not committed to git)
echo "ANTHROPIC_API_KEY=sk-ant-..." >> .env

# Add to .gitignore
echo ".env" >> .gitignore
```

### Cost Optimization

1. **Use Haiku for simple tasks**: Cheapest model, available on all tiers
2. **Set appropriate maxTokens**: Avoid unnecessary generation
3. **Monitor usage**: Check `provider.getUsageInfo()` for quota tracking

### Reliability

1. **Use timeouts**: Prevent hanging requests
2. **Consider fallbacks**: Configure alternative providers

```typescript
import { NeuroLink, createAIProviderWithFallback } from "@juspay/neurolink";

// Configure with fallback to another provider
const { primary, fallback } = await createAIProviderWithFallback(
  "anthropic",
  "openai",
);
```

## Exported Types and Utilities

### From `src/lib/types/subscriptionTypes.ts`

- `ClaudeSubscriptionTier` -- Union type: `"free" | "pro" | "max" | "max_5" | "max_20" | "api"`
- `AnthropicAuthMethod` -- Union type: `"api_key" | "oauth"`
- `OAuthToken` -- OAuth token structure with `accessToken`, `refreshToken?`, `expiresAt?`, `tokenType?`, `scopes?`
- `AnthropicRateLimitInfo` -- Rate limit data parsed from response headers
- `AnthropicResponseMetadata` -- Response metadata including rate limits, request ID, server timing
- `ClaudeUsageInfo` -- Usage tracking with messages, tokens, quotas
- `ClaudeQuotaInfo` -- Quota limits per tier
- `SubscriptionFeatures` -- Per-tier feature capabilities
- `AnthropicBetaFeatures` -- Beta feature flag configuration type

### From `src/lib/models/anthropicModels.ts`

- `AnthropicModel` -- Enum of model identifiers
- `MODEL_TIER_ACCESS` -- Model access by tier
- `MODEL_METADATA` -- Model metadata (context window, capabilities, etc.)
- `isModelAvailableForTier(model, tier)` -- Check model availability
- `getAvailableModelsForTier(tier)` -- List all models for a tier
- `getDefaultModelForTier(tier)` / `getRecommendedModelForTier(tier)` -- Get default model
- `getModelMetadata(model)` / `getModelCapabilities(model)` -- Get model metadata
- `validateModelAccess(model, tier)` -- Throws `ModelAccessError` if access denied
- `getMinimumTierForModel(model)` -- Get minimum tier required
- `ModelAccessError` -- Error class for denied model access

### From `src/lib/constants/enums.ts`

- `ClaudeSubscriptionTier` enum (FREE, PRO, MAX, API)
- `AnthropicAuthMethod` enum (API_KEY, OAUTH)
- `AnthropicBetaFeature` enum (CLAUDE_CODE, INTERLEAVED_THINKING, FINE_GRAINED_STREAMING)
- `TOKEN_EXPIRY_BUFFER_MS` -- 5-minute buffer constant (300000ms)

### From `src/lib/auth/index.ts`

- `AnthropicOAuth` -- OAuth 2.0 flow implementation class
- `TokenStore` / `tokenStore` -- Secure token storage
- `OAuthError` and subclasses -- OAuth error types
- `createAnthropicOAuth()` -- Factory function
- `performOAuthFlow()` -- Complete OAuth flow helper
- `startCallbackServer()` / `stopCallbackServer()` -- Local callback server

### From `src/lib/providers/anthropic.ts`

- `AnthropicProvider` -- Provider class with OAuth support
- `AnthropicProviderConfig` -- Configuration interface
- `ANTHROPIC_BETA_HEADERS` -- Beta headers constant
- Re-exports: `ModelAccessError`, `isModelAvailableForTier`, `getRecommendedModelForTier`, `getModelCapabilities`

## SDK Programmatic API

### OAuth Flow (Programmatic)

Use the `AnthropicOAuth` class to run the OAuth 2.0 + PKCE flow programmatically:

```typescript
import { AnthropicOAuth, createAnthropicOAuth } from "@juspay/neurolink";

// Create OAuth client with defaults (uses Claude Code's official client ID)
const oauth = createAnthropicOAuth();

// Generate PKCE values
const pkce = await AnthropicOAuth.generatePKCE();
// pkce = { codeVerifier: "...", codeChallenge: "..." }

// Build authorization URL — user visits this in their browser
const authUrl = oauth.generateAuthUrl({
  codeChallenge: pkce.codeChallenge,
  state: pkce.codeVerifier, // state=verifier pattern (OpenCode convention)
});
console.log("Visit:", authUrl);

// After user authorizes, exchange the code for tokens
const tokens = await oauth.exchangeCodeForTokens(code, pkce.codeVerifier);
// tokens = { accessToken, tokenType, expiresAt (Date), refreshToken?, scopes[] }

// Refresh when token expires
const newTokens = await oauth.refreshAccessToken(tokens.refreshToken);

// Validate a token
const validation = await oauth.validateAccessToken(tokens.accessToken);
// validation = { valid: true } or { valid: false, error: "..." }

// Revoke a token
await oauth.revokeToken(tokens.accessToken, "access_token");
```

### Token Store API

The `defaultTokenStore` provides secure, file-based token persistence at `~/.neurolink/tokens.json`:

```typescript
import { defaultTokenStore } from "@juspay/neurolink";

// Save tokens for a provider
await defaultTokenStore.saveTokens("anthropic", {
  accessToken: "...",
  refreshToken: "...",
  expiresAt: Date.now() + 3600000, // Unix ms
  tokenType: "Bearer",
});

// Load tokens (returns null if not found)
const tokens = await defaultTokenStore.loadTokens("anthropic");

// Get valid token with auto-refresh (refreshes if expired)
const validToken = await defaultTokenStore.getValidToken("anthropic");

// Check if tokens exist
const hasTokens = await defaultTokenStore.hasTokens("anthropic");

// List providers with stored tokens
const providers = await defaultTokenStore.listProviders();

// Clear tokens for a provider
await defaultTokenStore.clearTokens("anthropic");

// Clear all stored tokens
await defaultTokenStore.clearAllTokens();

// Register auto-refresh callback
defaultTokenStore.setTokenRefresher("anthropic", async (refreshToken) => {
  const oauth = createAnthropicOAuth();
  return await oauth.refreshAccessToken(refreshToken);
});
```

### Model Tier Validation API

Query model availability and tier access programmatically:

```typescript
import {
  isModelAvailableForTier,
  getDefaultModelForTier,
  getAvailableModelsForTier,
  getMinimumTierForModel,
  getModelMetadata,
  validateModelAccess,
  compareTiers,
} from "@juspay/neurolink";

// Check model availability for a tier
isModelAvailableForTier("claude-opus-4-20250514", "pro"); // false
isModelAvailableForTier("claude-opus-4-20250514", "max"); // true

// Get recommended model for a tier
getDefaultModelForTier("free"); // "claude-3-5-haiku-20241022"
getDefaultModelForTier("pro"); // "claude-sonnet-4-20250514"
getDefaultModelForTier("max"); // "claude-opus-4-20250514"

// List all models for a tier
getAvailableModelsForTier("pro");
// ["claude-3-haiku-20240307", "claude-3-5-haiku-20241022", "claude-sonnet-4-20250514", ...]

// Find the minimum tier required for a model
getMinimumTierForModel("claude-opus-4-20250514"); // "max"

// Get model metadata (context window, capabilities, etc.)
const meta = getModelMetadata("claude-sonnet-4-20250514");
// { contextWindow: 200000, maxOutputTokens: 64000, supportsVision: true, ... }

// Compare tiers (returns -1, 0, or 1)
compareTiers("pro", "max"); // -1 (pro < max)

// Full validation with error on failure
validateModelAccess("claude-opus-4-20250514", "pro");
// throws ModelAccessError: "Model claude-opus-4-20250514 requires max tier (current: pro)"
```

### Provider Instance API

Access subscription features on the Anthropic provider instance:

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();
const provider = await neurolink.getProvider("anthropic");

// Check subscription state
provider.getSubscriptionTier(); // "pro" | "max" | "api" | ...
provider.getAuthMethod(); // "oauth" | "api_key"
provider.areBetaFeaturesEnabled(); // true | false

// Validate model access before generation
if (provider.validateModelAccess("claude-opus-4-20250514")) {
  // Model is available for the current tier
}

// Manual token refresh (usually automatic)
await provider.refreshAuthIfNeeded();

// Usage tracking (populated after API calls)
const usage = provider.getUsageInfo();
// { messagesUsed, tokensUsed, inputTokensUsed, outputTokensUsed,
//   lastRequestTokens, tokenQuotaPercent, ... }

// Rate limit info from last response
const metadata = provider.getLastResponseMetadata();
// { rateLimits: { requestsRemaining, tokensRemaining, ... }, requestId }

// Get auth headers (for custom integrations)
const headers = provider.getAuthHeaders();
// { "anthropic-beta": "...", "x-subscription-tier": "pro" }
```

## See Also

- [Provider Setup Guide](../getting-started/providers/index.md)
- [Extended Thinking Configuration](thinking-configuration.md)
- [MCP Integration Guide](../mcp-integration.md)
