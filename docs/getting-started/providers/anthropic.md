---
title: Anthropic Provider Guide
description: Direct access to Claude models with API key or OAuth authentication for subscription users
keywords: anthropic, claude, api key, oauth, subscription, pro, max, sonnet, opus, haiku
---

# Anthropic Provider Guide

**Direct access to Claude models with flexible authentication options**

---

## Overview

Anthropic provides direct API access to Claude, one of the most capable AI model families available. NeuroLink supports both API key authentication for production deployments and OAuth authentication for Claude Pro/Max subscription users.

:::tip[Claude Subscription Users]
If you have a Claude Pro or Max subscription, you can use OAuth authentication to leverage your subscription quota directly. See [OAuth Setup](#oauth-setup-claude-promax) below.
:::

### Key Benefits

- **Claude Sonnet 4.6**: Latest balanced model — fast, capable, and cost-effective
- **Claude Opus 4.6**: Latest flagship model for advanced reasoning
- **1M Context Window**: Claude 4.6 models support 1,000,000-token context windows GA (no beta header needed)
- **Extended Thinking**: Deep reasoning mode on Claude 3.7+ models (Sonnet 4, Opus 4)
- **Multimodal**: Vision capabilities for image analysis across all models
- **Tool Use**: Function calling for agent workflows

### Authentication Options

| Method      | Best For                               | Billing            |
| ----------- | -------------------------------------- | ------------------ |
| **API Key** | Production, server-side apps           | Pay-per-token      |
| **OAuth**   | Personal dev with Pro/Max subscription | Subscription quota |

---

## Quick Start

### 1. Get Your API Key

1. Visit [console.anthropic.com](https://console.anthropic.com)
2. Sign in or create an account
3. Navigate to **API Keys** section
4. Click **Create Key**
5. Copy your new API key (starts with `sk-ant-`)

### 2. Configure Environment

Add to your `.env` file:

```bash
# Required: Your Anthropic API key
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here

# Optional: Override default model (defaults to claude-sonnet-4-6)
ANTHROPIC_MODEL=claude-sonnet-4-6
```

### 3. Test the Setup

=== "SDK Usage"

    ```typescript
    import { NeuroLink } from "@juspay/neurolink";

    const ai = new NeuroLink();

    const result = await ai.generate({
      input: { text: "Explain quantum computing in simple terms" },
      provider: "anthropic",
      model: "claude-sonnet-4-6",
    });

    console.log(result.content);
    ```

=== "CLI Usage"

    ```bash
    # Quick generation
    pnpm run cli -- generate "Hello from Claude!" \
      --provider anthropic

    # Use specific model
    pnpm run cli -- generate "Write a haiku about AI" \
      --provider anthropic \
      --model "claude-sonnet-4-6"

    # Interactive loop mode
    pnpm run cli -- loop \
      --provider anthropic \
      --model "claude-sonnet-4-6"
    ```

---

## Supported Models

### Available Models (from `AnthropicModels` enum)

| Enum Key            | Model ID                     | Family | Context | Max Output | Vision | Extended Thinking | Deprecated |
| ------------------- | ---------------------------- | ------ | ------- | ---------- | ------ | ----------------- | ---------- |
| `CLAUDE_OPUS_4_6`   | `claude-opus-4-6`            | Opus   | 1M      | 128,000    | Yes    | Yes               | No         |
| `CLAUDE_SONNET_4_6` | `claude-sonnet-4-6`          | Sonnet | 1M      | 64,000     | Yes    | Yes               | No         |
| `CLAUDE_OPUS_4_5`   | `claude-opus-4-5-20251101`   | Opus   | 200K    | 64,000     | Yes    | Yes               | No         |
| `CLAUDE_SONNET_4_5` | `claude-sonnet-4-5-20250929` | Sonnet | 200K    | 64,000     | Yes    | Yes               | No         |
| `CLAUDE_4_5_HAIKU`  | `claude-haiku-4-5-20251001`  | Haiku  | 200K    | 64,000     | Yes    | Yes               | No         |
| `CLAUDE_OPUS_4_1`   | `claude-opus-4-1-20250805`   | Opus   | 200K    | 32,000     | Yes    | Yes               | No         |
| `CLAUDE_OPUS_4_0`   | `claude-opus-4-20250514`     | Opus   | 200K    | 64,000     | Yes    | Yes               | No         |
| `CLAUDE_SONNET_4_0` | `claude-sonnet-4-20250514`   | Sonnet | 200K    | 64,000     | Yes    | Yes               | No         |
| `CLAUDE_SONNET_3_7` | `claude-3-7-sonnet-20250219` | Sonnet | 200K    | 8,192      | Yes    | Yes               | **Yes**    |
| `CLAUDE_3_5_SONNET` | `claude-3-5-sonnet-20241022` | Sonnet | 200K    | 8,192      | Yes    | No                | **Yes**    |
| `CLAUDE_3_5_HAIKU`  | `claude-3-5-haiku-20241022`  | Haiku  | 200K    | 8,192      | No     | No                | **Yes**    |
| `CLAUDE_3_SONNET`   | `claude-3-sonnet-20240229`   | Sonnet | 200K    | 4,096      | Yes    | No                | **Yes**    |
| `CLAUDE_3_OPUS`     | `claude-3-opus-20240229`     | Opus   | 200K    | 4,096      | Yes    | No                | **Yes**    |
| `CLAUDE_3_HAIKU`    | `claude-3-haiku-20240307`    | Haiku  | 200K    | 4,096      | Yes    | No                | **Yes**    |

:::note[1M Context Window]
Claude 4.6 models (`claude-opus-4-6` and `claude-sonnet-4-6`) support a 1,000,000-token context window at general availability — no beta header is required.
:::

The detailed capabilities (context window, max output, vision, etc.) are defined in `MODEL_METADATA` within `src/lib/models/anthropicModels.ts`.

### Default Model

The default model when no model is specified is `claude-sonnet-4-6` (set via `AnthropicModels.CLAUDE_SONNET_4_6`). This can be overridden with the `ANTHROPIC_MODEL` environment variable.

### Model Selection by Use Case

```typescript
import { NeuroLink } from "@juspay/neurolink";

const ai = new NeuroLink();

// Fast, cost-effective responses
const quickResult = await ai.generate({
  input: { text: "Summarize this text..." },
  provider: "anthropic",
  model: "claude-haiku-4-5-20251001",
});

// Balanced performance (recommended default)
const balancedResult = await ai.generate({
  input: { text: "Analyze this code..." },
  provider: "anthropic",
  model: "claude-sonnet-4-6",
});

// Latest Sonnet with extended thinking
const sonnet46Result = await ai.generate({
  input: { text: "Design a distributed caching system" },
  provider: "anthropic",
  model: "claude-sonnet-4-6",
  thinkingLevel: "high",
});

// Latest flagship for advanced reasoning (1M context)
const opusResult = await ai.generate({
  input: { text: "Solve this complex problem..." },
  provider: "anthropic",
  model: "claude-opus-4-6",
});
```

---

## Claude Subscription Tiers

Anthropic offers different access tiers, each with varying rate limits and model access:

| Tier                 | Access Method     | Models Available                      | Best For                        |
| -------------------- | ----------------- | ------------------------------------- | ------------------------------- |
| **Free**             | claude.ai account | Haiku only (3 Haiku, 3.5 Haiku)       | Exploration, personal use       |
| **Pro** ($20/month)  | OAuth + claude.ai | Haiku + Sonnet (3.5 Sonnet, Sonnet 4) | Professional use, higher volume |
| **Max** ($100/month) | OAuth + claude.ai | All models (including Opus)           | Heavy use, all model access     |
| **Max 5x**           | OAuth + claude.ai | All models                            | 5x usage multiplier             |
| **Max 20x**          | OAuth + claude.ai | All models                            | 20x usage multiplier            |
| **API**              | API Key           | All models                            | Production, programmatic access |

### Model Access by Tier (`MODEL_TIER_ACCESS`)

| Model                           | Free | Pro | Max / Max 5x / Max 20x | API |
| ------------------------------- | ---- | --- | ---------------------- | --- |
| `claude-3-haiku-20240307`       | Yes  | Yes | Yes                    | Yes |
| `claude-3-5-haiku-20241022`     | Yes  | Yes | Yes                    | Yes |
| `claude-3-5-sonnet-20241022`    | No   | Yes | Yes                    | Yes |
| `claude-3-5-sonnet-v2-20241022` | No   | Yes | Yes                    | Yes |
| `claude-sonnet-4-20250514`      | No   | Yes | Yes                    | Yes |
| `claude-sonnet-4-6`             | No   | Yes | Yes                    | Yes |
| `claude-3-opus-20240229`        | No   | No  | Yes                    | Yes |
| `claude-opus-4-20250514`        | No   | No  | Yes                    | Yes |
| `claude-opus-4-6`               | No   | No  | Yes                    | Yes |

### Default Models by Tier (`DEFAULT_MODELS_BY_TIER`)

| Tier    | Default Model               |
| ------- | --------------------------- |
| Free    | `claude-3-5-haiku-20241022` |
| Pro     | `claude-sonnet-4-20250514`  |
| Max     | `claude-opus-4-20250514`    |
| Max 5x  | `claude-opus-4-20250514`    |
| Max 20x | `claude-opus-4-20250514`    |
| API     | `claude-sonnet-4-20250514`  |

**Note:** The global provider default (when no subscription tier is active) is `claude-sonnet-4-6`. The tier defaults above only apply when a subscription tier is configured. When a requested model is not available for the user's subscription tier, the provider automatically falls back to the recommended default model for that tier and logs a warning.

---

## Authentication Methods

### API Key Authentication (Recommended for Production)

The standard method using Anthropic API keys. Best for:

- Production deployments
- Server-side applications
- Predictable billing (pay-per-token)
- Full API control

#### Environment Variables

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here

# Optional: Override default model
ANTHROPIC_MODEL=claude-sonnet-4-6
```

The provider reads the API key via `ANTHROPIC_API_KEY`. The key format is validated against the pattern `sk-ant-*`.

#### SDK Configuration

```typescript
import { NeuroLink } from "@juspay/neurolink";

const ai = new NeuroLink();

const result = await ai.generate({
  input: { text: "Analyze this code for bugs" },
  provider: "anthropic",
  model: "claude-sonnet-4-6",
  temperature: 0.7,
  maxTokens: 2000,
});
```

#### Direct Provider Configuration

The `AnthropicProvider` constructor accepts an optional `AnthropicProviderConfig`:

```typescript
// Note: AnthropicProvider is not a top-level package export.
// Use relative imports within the codebase or access via the NeuroLink SDK.
import { AnthropicProvider } from "../src/lib/providers/anthropic.js";

const provider = new AnthropicProvider(
  "claude-sonnet-4-6", // modelName
  undefined, // sdk instance
  {
    authMethod: "api_key",
    apiKey: process.env.ANTHROPIC_API_KEY,
    enableBetaFeatures: true,
  },
);
```

### OAuth Setup (Claude Pro/Max)

OAuth authentication allows you to use your Claude Pro or Max subscription through NeuroLink, leveraging your subscription quota instead of API billing.

:::warning[OAuth Limitations]
OAuth authentication is designed for personal/development use. For production deployments, use API key authentication for better reliability and SLA guarantees.
:::

#### CLI Authentication

The `auth` command uses subcommands with the provider as a positional argument:

```bash
# Start interactive OAuth authentication (choose method)
pnpm run cli -- auth login anthropic

# Specify method directly
pnpm run cli -- auth login anthropic --method oauth

# Create API key via OAuth (recommended for Claude Pro/Max users)
pnpm run cli -- auth login anthropic --method create-api-key

# Traditional API key authentication
pnpm run cli -- auth login anthropic --method api-key
```

The login flow will:

1. Open your default browser to `https://claude.ai/oauth/authorize`
2. Prompt you to sign in to your Claude account
3. Request authorization with scopes: `user:profile`, `user:inference`
4. Exchange the authorization code for tokens using PKCE
5. Store tokens securely in `~/.neurolink/anthropic-credentials.json`

#### Token Management

```bash
# Check authentication status
pnpm run cli -- auth status

# Check status for a specific provider
pnpm run cli -- auth status anthropic

# Refresh tokens manually
pnpm run cli -- auth refresh anthropic

# Clear credentials (logout)
pnpm run cli -- auth logout anthropic
```

#### Token Storage

Tokens are stored at `~/.neurolink/anthropic-credentials.json` with `0o600` file permissions (owner read/write only). The file format is:

```json
{
  "type": "oauth",
  "oauth": {
    "accessToken": "...",
    "refreshToken": "...",
    "expiresAt": 1740000000000,
    "tokenType": "Bearer"
  },
  "provider": "anthropic",
  "updatedAt": 1739900000000
}
```

The `expiresAt` field is stored as **Unix milliseconds** (i.e., `Date.now()` scale).

The `TokenStore` class (used for multi-provider token storage) stores tokens at `~/.neurolink/tokens.json` with XOR-based obfuscation.

#### Token Resolution Priority

When the `AnthropicProvider` is initialized, it resolves OAuth tokens in this order:

1. `config.oauthToken` (passed directly to the constructor)
2. Stored credentials file at `~/.neurolink/anthropic-credentials.json`
3. Environment variables: `ANTHROPIC_OAUTH_TOKEN` or `CLAUDE_OAUTH_TOKEN`

Environment variable tokens can be either:

- A plain access token string
- A JSON object with `accessToken`, `refreshToken`, and `expiresAt` fields

#### Auto-Refresh Behavior

Token refresh happens **automatically on every `generate()` and `stream()` call**. Before each API request, `refreshAuthIfNeeded()` is called, which:

1. Checks if the token has expiry information
2. If the token is expired or will expire within 5 minutes, attempts refresh
3. Sends a refresh request to `https://console.anthropic.com/v1/oauth/token` using the Claude Code client ID
4. Mutates the token object in-place so the fetch wrapper picks up the new access token automatically
5. Persists the refreshed token to `~/.neurolink/anthropic-credentials.json` on disk

If the token is expired and no refresh token is available, an `AuthenticationError` is thrown.

#### OAuth Environment Variables

```bash
# Set an OAuth token directly (plain string or JSON)
ANTHROPIC_OAUTH_TOKEN=your-access-token-here

# Or use CLAUDE_OAUTH_TOKEN as an alternative
CLAUDE_OAUTH_TOKEN=your-access-token-here

# Set subscription tier explicitly (auto-detected if not set)
ANTHROPIC_SUBSCRIPTION_TIER=pro
```

#### OAuth SDK Configuration

```typescript
// Note: AnthropicProvider is not a top-level package export.
// Use relative imports within the codebase or access via the NeuroLink SDK.
import { AnthropicProvider } from "../src/lib/providers/anthropic.js";

const provider = new AnthropicProvider("claude-sonnet-4-6", undefined, {
  authMethod: "oauth",
  oauthToken: {
    accessToken: "your-access-token",
    refreshToken: "your-refresh-token",
    expiresAt: Date.now() + 3600 * 1000, // Unix milliseconds
    tokenType: "Bearer",
  },
  subscriptionTier: "pro",
  enableBetaFeatures: true,
});
```

---

## Extended Thinking

All active Claude models (4.0 and above) support extended thinking, allowing the model to reason more deeply before responding. This includes Claude 4.6, 4.5, 4.1, and 4.0 variants.

### Thinking Levels

| Level       | Description       | Use Case                            |
| ----------- | ----------------- | ----------------------------------- |
| **minimal** | Basic reasoning   | Quick decisions                     |
| **low**     | Quick reasoning   | Simple analysis                     |
| **medium**  | Balanced thinking | Code review, moderate complexity    |
| **high**    | Deep reasoning    | Complex proofs, architecture design |

### Configuration

```typescript
// Enable extended thinking
const result = await ai.generate({
  input: { text: "Design a distributed caching system" },
  provider: "anthropic",
  model: "claude-sonnet-4-6",
  thinkingLevel: "high",
});
```

### CLI Usage

```bash
pnpm run cli -- generate "Solve this logic puzzle..." \
  --provider anthropic \
  --model "claude-sonnet-4-6" \
  --thinking-level high
```

---

## Beta Features

The Anthropic provider supports beta features via the `anthropic-beta` header. The following beta headers are included by default when `enableBetaFeatures` is `true`:

- `claude-code-20250219` -- Claude Code specific features
- `interleaved-thinking-2025-05-14` -- Interleaved thinking mode
- `fine-grained-tool-streaming-2025-05-14` -- Fine-grained tool streaming

These correspond to the `AnthropicBetaFeature` enum values in `src/lib/constants/enums.ts`:

```typescript
enum AnthropicBetaFeature {
  CLAUDE_CODE = "claude-code-20250219",
  INTERLEAVED_THINKING = "interleaved-thinking-2025-05-14",
  FINE_GRAINED_STREAMING = "fine-grained-tool-streaming-2025-05-14",
}
```

For OAuth mode, the beta headers are different: `oauth-2025-04-20` and `interleaved-thinking-2025-05-14` are sent (the `claude-code-20250219` header is only included if it was present in the original request headers, as it can trigger authorization errors with OAuth tokens).

---

## Multimodal Capabilities

Claude models with vision support can analyze images.

### Image Analysis

```typescript
const result = await ai.generate({
  input: {
    text: "Describe what you see in this image",
    images: ["data:image/jpeg;base64,..."],
  },
  provider: "anthropic",
  model: "claude-sonnet-4-6",
});
```

```bash
# From file path (CLI)
pnpm run cli -- generate "Describe this image" \
  --provider anthropic \
  --image ./photo.jpg
```

### PDF Processing

```typescript
const result = await ai.generate({
  input: {
    text: "Summarize the key points in this document",
    pdfs: ["./document.pdf"],
  },
  provider: "anthropic",
  model: "claude-sonnet-4-6",
});
```

---

## Tool Use / Function Calling

Claude supports tool use for building agent workflows. All models with `supportsToolUse: true` in `MODEL_METADATA` support this feature.

```typescript
const tools = [
  {
    name: "get_weather",
    description: "Get current weather for a location",
    parameters: {
      type: "object",
      properties: {
        location: { type: "string", description: "City name" },
      },
      required: ["location"],
    },
  },
];

const result = await ai.generate({
  input: { text: "What's the weather in Tokyo?" },
  provider: "anthropic",
  model: "claude-sonnet-4-6",
  tools,
});

console.log(result.toolCalls);
```

:::note[OAuth Tool Name Prefixing]
When using OAuth authentication, tool names are automatically prefixed with `mcp_` in API requests and the prefix is stripped from responses. This is handled transparently by the OAuth fetch wrapper.
:::

---

## Streaming Responses

```typescript
const stream = await ai.stream({
  input: { text: "Write a detailed article about AI" },
  provider: "anthropic",
  model: "claude-sonnet-4-6",
});
```

OAuth token refresh also happens automatically before `stream()` calls.

---

## Rate Limit Handling

The Anthropic provider tracks rate limit information from API response headers. The following headers are parsed after each request:

- `anthropic-ratelimit-requests-limit` / `anthropic-ratelimit-requests-remaining`
- `anthropic-ratelimit-tokens-limit` / `anthropic-ratelimit-tokens-remaining`
- `anthropic-ratelimit-requests-reset` / `anthropic-ratelimit-tokens-reset`
- `retry-after` (on 429 responses)

You can access this information programmatically:

```typescript
const provider = new AnthropicProvider();

// After making a request...
const metadata = provider.getLastResponseMetadata();
console.log(metadata?.rateLimit?.requestsRemaining);
console.log(metadata?.rateLimit?.tokensRemaining);

// Usage tracking
const usage = provider.getUsageInfo();
if (usage) {
  console.log("Requests made:", usage.requestCount);
  console.log("Message quota used:", usage.messageQuotaPercent + "%");
  console.log("Token quota used:", usage.tokenQuotaPercent + "%");
  console.log("Rate limited:", usage.isRateLimited);
}
```

Warnings are logged automatically when:

- Remaining requests drops to 5 or fewer
- Remaining tokens drops below 10% of the limit

---

## Configuration Reference

### Environment Variables

| Variable                      | Description                                                                                                   | Default             | Required |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------- | -------- |
| `ANTHROPIC_API_KEY`           | API key for authentication                                                                                    | -                   | Yes\*    |
| `ANTHROPIC_MODEL`             | Default model to use                                                                                          | `claude-sonnet-4-6` | No       |
| `ANTHROPIC_SUBSCRIPTION_TIER` | Subscription tier: `free`, `pro`, `max`, `max_5`, `max_20`, `api`                                             | Auto-detected       | No       |
| `ANTHROPIC_OAUTH_TOKEN`       | OAuth token (plain access token string, or JSON `{"accessToken":"...","refreshToken":"...","expiresAt":...}`) | -                   | No\*\*   |
| `CLAUDE_OAUTH_TOKEN`          | Alternative OAuth token env var (same format as above)                                                        | -                   | No\*\*   |

\*Required for API key authentication. Not required when using OAuth.
\*\*Used when `authMethod` is `oauth` and no stored credentials file exists. The `expiresAt` field uses Unix milliseconds (`Date.now()` scale).

### `AnthropicProviderConfig` Interface

```typescript
interface AnthropicProviderConfig {
  /** Auth method: "api_key" or "oauth". Auto-detected if not set. */
  authMethod?: AnthropicAuthMethod;

  /** Subscription tier. Auto-detected from environment or "api" for API key auth. */
  subscriptionTier?: ClaudeSubscriptionTier;

  /** Whether to enable beta features. Defaults to true. */
  enableBetaFeatures?: boolean;

  /** OAuth token for OAuth authentication. */
  oauthToken?: OAuthToken;

  /** API key for API key authentication. Read from env if not provided. */
  apiKey?: string;
}
```

### CLI Provider Options

The `--provider` flag accepts `anthropic` (or `anthropic-subscription`, which is automatically mapped to `anthropic` with subscription mode enabled). Additional flags for subscription features:

| Flag                  | Values                                         | Description            |
| --------------------- | ---------------------------------------------- | ---------------------- |
| `--provider` / `-p`   | `anthropic`                                    | Use Anthropic provider |
| `--auth-method`       | `api-key`, `oauth`                             | Authentication method  |
| `--subscription-tier` | `free`, `pro`, `max`, `max_5`, `max_20`, `api` | Subscription tier      |
| `--enable-beta`       | (boolean)                                      | Enable beta features   |
| `--model` / `-m`      | model ID string                                | Specific model to use  |

Example:

```bash
pnpm run cli -- generate "Hello" \
  --provider anthropic \
  --auth-method oauth \
  --subscription-tier pro
```

---

## Error Handling

The Anthropic provider maps errors to specific error types:

| Error Type            | Condition                                                  |
| --------------------- | ---------------------------------------------------------- |
| `AuthenticationError` | Invalid API key, expired OAuth token, failed token refresh |
| `RateLimitError`      | Rate limit exceeded (429 responses)                        |
| `NetworkError`        | Connection failures, timeouts                              |
| `ProviderError`       | Server errors (5xx), other provider-side failures          |

### Common Issues

#### "Invalid API key"

```bash
# Verify key format (should start with sk-ant-)
echo $ANTHROPIC_API_KEY | head -c 20
# Expected: sk-ant-api03-xxxx...

# Get new key at https://console.anthropic.com
```

#### "OAuth token expired"

OAuth tokens are auto-refreshed before each request. If refresh fails:

```bash
# Refresh manually
pnpm run cli -- auth refresh anthropic

# Or re-authenticate
pnpm run cli -- auth login anthropic
```

#### "Model access denied" / Model unavailable for tier

When a model is not available for your subscription tier, the provider automatically falls back to the recommended model for your tier. To use a specific model, ensure your tier supports it (see [Model Access by Tier](#model-access-by-tier-model_tier_access)).

```typescript
// Check model access programmatically
const provider = new AnthropicProvider();
if (provider.validateModelAccess("claude-opus-4-20250514")) {
  // Model is accessible
} else {
  // Falls back to tier default
}
```

#### "Rate limit exceeded" (429)

1. For Free tier: Upgrade to Pro or Max
2. For API: Request a rate limit increase
3. Check `provider.getUsageInfo()` for current quota usage

---

## Helper Functions

The `src/lib/models/anthropicModels.ts` module exports utility functions for working with models and tiers:

```typescript
import {
  isModelAvailableForTier,
  getRecommendedModelForTier, // alias for getDefaultModelForTier
  getModelCapabilities, // alias for getModelMetadata
  getAvailableModelsForTier,
  getMinimumTierForModel,
  getModelsWithCapability,
  getModelsByFamily,
  getLatestModelsByFamily,
  validateModelAccess,
  compareTiers,
  ModelAccessError,
} from "@juspay/neurolink";

// Check if a model is available for a tier
isModelAvailableForTier("claude-opus-4-20250514", "pro"); // false
isModelAvailableForTier("claude-opus-4-20250514", "max"); // true

// Get the minimum tier required
getMinimumTierForModel("claude-opus-4-20250514"); // "max"

// Get all models with extended thinking
getModelsWithCapability("supportsExtendedThinking");
// ["claude-sonnet-4-20250514", "claude-opus-4-20250514"]

// Get latest non-deprecated model per family
getLatestModelsByFamily();
// { haiku: "claude-3-5-haiku-20241022", sonnet: "claude-sonnet-4-20250514", opus: "claude-opus-4-20250514" }
```

---

## Best Practices

### Security

- **Never commit API keys** to version control
- Use environment variables or secrets management
- Rotate API keys periodically
- OAuth tokens are stored with `0o600` permissions (owner read/write only)

```bash
# Use .env file (not committed to git)
echo "ANTHROPIC_API_KEY=sk-ant-..." >> .env

# Add to .gitignore
echo ".env" >> .gitignore
```

### Rate Limiting

The provider tracks rate limits automatically and logs warnings when approaching limits. Monitor usage via `getUsageInfo()` and `getLastResponseMetadata()`.

---

## Related Documentation

- **[Provider Setup Guide](../provider-setup.md)** - General provider configuration
- **[Extended Thinking Configuration](../../features/thinking-configuration.md)** - Thinking modes

---

## Additional Resources

- **[Anthropic Console](https://console.anthropic.com)** - Manage API keys
- **[Anthropic Documentation](https://docs.anthropic.com)** - Official API docs
- **[Claude.ai](https://claude.ai)** - Claude web interface
- **[Anthropic Pricing](https://anthropic.com/pricing)** - Pricing details
