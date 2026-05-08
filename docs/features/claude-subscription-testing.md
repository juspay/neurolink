---
title: Claude Subscription Testing Guide
description: Comprehensive testing guide for Claude subscription features including authentication methods, subscription tiers, and beta features
keywords: claude, testing, oauth, api key, subscription, tiers, integration tests
---

# Claude Subscription Testing Guide

This document provides comprehensive testing commands and examples for the Claude subscription feature in NeuroLink, covering API key authentication, OAuth authentication for Pro/Max subscribers, subscription tier validation, and beta features.

## 1. Prerequisites

### Environment Setup

Before testing, ensure you have the required environment configured:

```bash
# Navigate to project directory
cd /path/to/neurolink

# Install dependencies
pnpm install

# Build the project (SDK + CLI)
pnpm run build

# Or build CLI only for faster testing
pnpm run build:cli
```

### Required API Keys

Depending on your testing scenario, you will need one of the following:

| Authentication Method | Required Credential | Where to Get                                                         |
| --------------------- | ------------------- | -------------------------------------------------------------------- |
| API Key               | `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com/settings/keys) |
| OAuth (Pro/Max)       | Claude subscription | [claude.ai](https://claude.ai)                                       |

### Build Commands Reference

```bash
# Full build (SDK + CLI)
pnpm run build

# CLI only (faster for testing CLI commands)
pnpm run build:cli

# Complete build with validation
pnpm run build:complete

# Type checking
pnpm run check

# Lint and format
pnpm run lint && pnpm run format
```

---

## 2. CLI Testing Commands

**Important:** All CLI commands require the `--` separator between the npm script and the CLI arguments.

### API Key Authentication

#### Basic Setup

```bash
# Set your API key in the environment
export ANTHROPIC_API_KEY="sk-ant-api03-your-key-here"

# Verify the key is set
echo $ANTHROPIC_API_KEY | head -c 20
# Expected: sk-ant-api03-xxxx
```

#### Basic Generation Test

```bash
# Simple generation with default model (Claude 3.5 Sonnet)
pnpm run cli -- generate "Hello, Claude! What is 2+2?" --provider anthropic

# With explicit model selection
pnpm run cli -- generate "Explain quantum computing briefly" \
  --provider anthropic \
  --model claude-3-5-sonnet-20241022

# With temperature and max tokens
pnpm run cli -- generate "Write a haiku about coding" \
  --provider anthropic \
  --temperature 0.8 \
  --max-tokens 100
```

#### Testing Different Models

```bash
# Claude 3.5 Haiku (fast, cost-effective)
pnpm run cli -- generate "Summarize: AI is transforming industries" \
  --provider anthropic \
  --model claude-3-5-haiku-20241022

# Claude 3.5 Sonnet (balanced)
pnpm run cli -- generate "Analyze this code pattern: const x = () => {}" \
  --provider anthropic \
  --model claude-3-5-sonnet-20241022

# Claude Sonnet 4 (latest Sonnet)
pnpm run cli -- generate "Complex reasoning task" \
  --provider anthropic \
  --model claude-sonnet-4-20250514

# Claude Opus 4 (flagship model - requires Max tier or API)
pnpm run cli -- generate "Solve this complex problem..." \
  --provider anthropic \
  --model claude-opus-4-20250514
```

---

### OAuth Authentication (Pro/Max)

#### Interactive Login

```bash
# Start OAuth authentication flow
pnpm run cli -- auth login anthropic

# This will:
# 1. Open your browser to Anthropic's OAuth page
# 2. Request authorization for NeuroLink
# 3. Store tokens securely after authorization
```

#### Explicit OAuth Method

```bash
# Explicitly use OAuth method
pnpm run cli -- auth login anthropic --method oauth

# For non-interactive environments, API key method
pnpm run cli -- auth login anthropic --method api-key
```

#### Check Authentication Status

```bash
# Check status for Anthropic
pnpm run cli -- auth status anthropic

# Expected output for OAuth:
# Anthropic [Authenticated]
#   Method: oauth
#   Subscription: pro
#   Token Expires: 2026-02-10T12:00:00
#   Refresh Token: Available

# Expected output for API key:
# Anthropic [Authenticated]
#   Method: api-key
```

#### Token Management

```bash
# Refresh OAuth tokens (usually automatic)
pnpm run cli -- auth refresh anthropic

# Logout / clear credentials
pnpm run cli -- auth logout anthropic
```

---

### Subscription Tiers

The subscription tier affects which models are available and rate limits:

| Tier     | Models Available            | Default Model             |
| -------- | --------------------------- | ------------------------- |
| `free`   | Haiku only                  | claude-3-5-haiku-20241022 |
| `pro`    | Haiku + Sonnet              | claude-sonnet-4-20250514  |
| `max`    | All models (including Opus) | claude-opus-4-20250514    |
| `max_5`  | All models (5x usage)       | claude-opus-4-20250514    |
| `max_20` | All models (20x usage)      | claude-opus-4-20250514    |
| `api`    | All models                  | claude-sonnet-4-20250514  |

#### Testing with Subscription Tiers

```bash
# Set subscription tier via environment variable
export ANTHROPIC_SUBSCRIPTION_TIER="pro"

# Free tier (Haiku only)
export ANTHROPIC_SUBSCRIPTION_TIER="free"
pnpm run cli -- generate "Hello" --provider anthropic
# Uses: claude-3-5-haiku-20241022

# Pro tier (Haiku + Sonnet)
export ANTHROPIC_SUBSCRIPTION_TIER="pro"
pnpm run cli -- generate "Hello" --provider anthropic --model claude-sonnet-4-20250514

# Max tier (all models including Opus)
export ANTHROPIC_SUBSCRIPTION_TIER="max"
pnpm run cli -- generate "Complex task" --provider anthropic --model claude-opus-4-20250514

# API tier (direct API access - all models)
export ANTHROPIC_SUBSCRIPTION_TIER="api"
pnpm run cli -- generate "Hello" --provider anthropic --model claude-opus-4-20250514
```

#### Model Access Validation

```bash
# Attempting to use a model not available for tier will fall back to recommended model
export ANTHROPIC_SUBSCRIPTION_TIER="free"
pnpm run cli -- generate "Hello" --provider anthropic --model claude-opus-4-20250514
# Warning: Model not available for subscription tier, using recommended model
# Uses: claude-3-5-haiku-20241022
```

---

### Beta Features

#### Extended Thinking Mode

Extended thinking is supported by Claude Sonnet 4 and Claude Opus 4:

```bash
# Enable extended thinking with thinking level
pnpm run cli -- generate "Solve this complex mathematical proof..." \
  --provider anthropic \
  --model claude-sonnet-4-20250514 \
  --thinking-level high

# Thinking levels: minimal, low, medium, high
pnpm run cli -- generate "Analyze this code for security issues" \
  --provider anthropic \
  --model claude-opus-4-20250514 \
  --thinking-level medium
```

#### Streaming with Beta Features

```bash
# Stream response with extended thinking
pnpm run cli -- stream "Explain the theory of relativity step by step" \
  --provider anthropic \
  --model claude-sonnet-4-20250514 \
  --thinking-level high
```

---

## 3. SDK Testing

### Basic API Key Authentication

```typescript
import { NeuroLink } from "@juspay/neurolink";

// Environment variable: ANTHROPIC_API_KEY
const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Hello, Claude!" },
  provider: "anthropic",
  model: "claude-3-5-sonnet-20241022",
});

console.log(result.content);
console.log("Input tokens:", result.usage?.inputTokens);
console.log("Output tokens:", result.usage?.outputTokens);
```

### OAuth Token Authentication

```typescript
// Import from the main package entry point
import { NeuroLink } from "@juspay/neurolink";

// Or when working within the codebase, use relative paths:
// import { AnthropicProvider } from "../lib/providers/anthropic.js";

// Using OAuth token from environment
// Set ANTHROPIC_OAUTH_TOKEN as JSON: {"accessToken": "...", "refreshToken": "..."}
// Or as plain access token string

// You can also instantiate the provider directly with config:
// Note: AnthropicProvider is not a separate package export.
// Import it via relative path within the codebase.
import { AnthropicProvider } from "../../src/lib/providers/anthropic.js";

const provider = new AnthropicProvider("claude-sonnet-4-20250514", undefined, {
  authMethod: "oauth",
  oauthToken: {
    accessToken: "your-oauth-access-token",
    refreshToken: "your-refresh-token",
    expiresAt: Date.now() + 3600000, // 1 hour from now (Unix milliseconds)
  },
  subscriptionTier: "pro",
});

// Check authentication method
console.log("Auth method:", provider.getAuthMethod()); // "oauth"
console.log("Subscription tier:", provider.getSubscriptionTier()); // "pro"
```

**Important:** The `expiresAt` field in `OAuthToken` uses Unix milliseconds (i.e., `Date.now()` scale), not Unix seconds. For example, 1 hour from now is `Date.now() + 3600000`.

### Subscription Tier Configuration

```typescript
// Import from the codebase using relative paths (not package sub-path exports)
import {
  isModelAvailableForTier,
  getDefaultModelForTier,
  getAvailableModelsForTier,
} from "../../src/lib/models/anthropicModels.js";

// Check model availability for a tier
const canUseOpus = isModelAvailableForTier("claude-opus-4-20250514", "pro");
console.log("Pro can use Opus:", canUseOpus); // false

const canUseOpusMax = isModelAvailableForTier("claude-opus-4-20250514", "max");
console.log("Max can use Opus:", canUseOpusMax); // true

// Get default model for tier
const defaultFree = getDefaultModelForTier("free");
console.log("Free default:", defaultFree); // "claude-3-5-haiku-20241022"

const defaultMax = getDefaultModelForTier("max");
console.log("Max default:", defaultMax); // "claude-opus-4-20250514"

// Get all available models for a tier
const proModels = getAvailableModelsForTier("pro");
console.log("Pro tier models:", proModels);
// ["claude-3-haiku-20240307", "claude-3-5-haiku-20241022",
//  "claude-3-5-sonnet-20241022", "claude-3-5-sonnet-v2-20241022",
//  "claude-sonnet-4-20250514"]
```

### Beta Features in SDK

```typescript
import { AnthropicProvider } from "../../src/lib/providers/anthropic.js";

// Create provider with beta features enabled (default)
const provider = new AnthropicProvider("claude-opus-4-20250514", undefined, {
  enableBetaFeatures: true,
  subscriptionTier: "max",
});

// Check if beta features are enabled
console.log("Beta features:", provider.areBetaFeaturesEnabled()); // true

// Get model capabilities (alias for getModelMetadata)
const capabilities = provider.getModelCapabilities();
console.log(
  "Supports extended thinking:",
  capabilities?.supportsExtendedThinking,
);
console.log("Supports vision:", capabilities?.supportsVision);

// Use extended thinking via NeuroLink SDK
const neurolink = new NeuroLink();
const result = await neurolink.generate({
  input: { text: "Solve this complex problem with reasoning..." },
  provider: "anthropic",
  model: "claude-opus-4-20250514",
  thinkingLevel: "high",
});

console.log(result.content);
```

### Model Access Validation in SDK

```typescript
import { AnthropicProvider } from "../../src/lib/providers/anthropic.js";

// Provider automatically validates model access based on tier
const provider = new AnthropicProvider("claude-opus-4-20250514", undefined, {
  subscriptionTier: "pro", // Pro tier
});

// This returns false - Opus not available for Pro
const hasAccess = provider.validateModelAccess("claude-opus-4-20250514");
console.log("Pro has Opus access:", hasAccess); // false

// Sonnet is available for Pro
const hasSonnetAccess = provider.validateModelAccess(
  "claude-sonnet-4-20250514",
);
console.log("Pro has Sonnet access:", hasSonnetAccess); // true
```

### Usage Tracking

```typescript
import { AnthropicProvider } from "../../src/lib/providers/anthropic.js";

const provider = new AnthropicProvider();

// After making requests, check usage info
const usage = provider.getUsageInfo();
if (usage) {
  console.log("Messages used:", usage.messagesUsed);
  console.log("Tokens used:", usage.tokensUsed);
  console.log("Input tokens:", usage.inputTokensUsed);
  console.log("Output tokens:", usage.outputTokensUsed);
  console.log("Rate limited:", usage.isRateLimited);
  console.log("Message quota %:", usage.messageQuotaPercent);
  console.log("Token quota %:", usage.tokenQuotaPercent);
}

// Check rate limit metadata from last response
const metadata = provider.getLastResponseMetadata();
if (metadata?.rateLimit) {
  console.log("Requests remaining:", metadata.rateLimit.requestsRemaining);
  console.log("Tokens remaining:", metadata.rateLimit.tokensRemaining);
}
```

---

## 4. Credential & Subscription Tests

### Running the Tests

Anthropic subscription scenarios — OAuth, API key, tier validation — are exercised by the `test:credentials` suite:

```bash
# Run the credentials suite (includes Claude subscription scenarios)
pnpm run test:credentials

# Or run the underlying tsx file directly with extra logging
DEBUG=1 npx tsx test/continuous-test-suite-credentials.ts
```

> **Note:** NeuroLink does not use vitest; all tests are tsx scripts orchestrated via the `continuous-test-suite-*.ts` files. There is no `test:coverage` / `test:integration` / `test:subscription` script — see [`test/TESTING_SCRIPTS.md`](https://github.com/juspay/neurolink/blob/main/test/TESTING_SCRIPTS.md) for the full list of available suites.

### Test Coverage

The credentials suite (`test/continuous-test-suite-credentials.ts`) covers the scenarios below. The numbered list is illustrative of the OAuth/API-key/tier dimensions tested; consult the source for the authoritative inventory.

#### 1. OAuth Flow Tests (21 tests)

Tests the `AnthropicOAuth` class from `src/lib/auth/anthropicOAuth.ts`.

| Sub-describe                       | Tests | What It Covers                                                                                                |
| ---------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------- |
| OAuth URL Generation with PKCE     | 5     | Auth URL parameters, custom scopes, PKCE code challenge inclusion, unique state for CSRF, additional params   |
| Code Verifier/Challenge Generation | 2     | Cryptographic verifier uniqueness and length, S256 challenge generation and base64url encoding                |
| Token Exchange (Mocked HTTP)       | 5     | Code-for-token exchange, error on failed exchange, empty code rejection, client secret inclusion, PKCE verify |
| Token Refresh (Mocked HTTP)        | 3     | Refresh token exchange, missing refresh token error, server error handling                                    |
| Token Validation                   | 4     | Valid token with details, expired token detection, empty token rejection, expiration buffer checking          |

Mock pattern: `vi.mock("open", ...)` for browser, global `fetch` replaced with `vi.fn()`.

#### 2. Token Storage Tests (18 tests)

Tests two storage implementations:

- `InMemoryTokenStorage` from `src/lib/mcp/auth/tokenStorage.ts` (the MCP OAuth token storage)
- `TokenStore` from `src/lib/auth/tokenStore.ts` (file-based multi-provider token store)

| Sub-describe                    | Tests | What It Covers                                                                                |
| ------------------------------- | ----- | --------------------------------------------------------------------------------------------- |
| Saving Tokens to Storage        | 3     | Save to in-memory storage, update existing, handle multiple providers                         |
| Loading Tokens from Storage     | 4     | Null for non-existent, complete object retrieval, hasTokens check, list server IDs            |
| Clearing Tokens                 | 3     | Clear specific provider, clear all, handle non-existent gracefully                            |
| Token Expiry Detection          | 5     | Expired tokens, valid tokens, buffer time, tokens without expiration, calculateExpiresAt      |
| TokenStore (File-based Storage) | 4     | Default path (`.neurolink/tokens.json`), custom path, validation before save, token refresher |

Mock pattern: `vi.mock("fs/promises", ...)` for file operations.

**Note:** The `TokenStore` stores tokens at `~/.neurolink/tokens.json` (not `~/.config/neurolink/`). The `expiresAt` values throughout the codebase use Unix milliseconds (`Date.now()` scale).

#### 3. Model Tier Access Tests (19 tests)

Tests functions from `src/lib/models/anthropicModels.ts`.

| Sub-describe                    | Tests | What It Covers                                                                               |
| ------------------------------- | ----- | -------------------------------------------------------------------------------------------- |
| isModelAvailableForTier         | 6     | Free (Haiku only), Pro (Haiku+Sonnet), Max (all), max_5/max_20 (all), API (all), invalid IDs |
| getAvailableModelsForTier       | 4     | Free returns 2 Haiku models, Pro includes Sonnet, Max returns all 7+, API matches Max        |
| getDefaultModelForTier          | 4     | Free=Haiku, Pro=Sonnet 4, Max/max_5/max_20=Opus 4, API=Sonnet 4                              |
| Model Metadata and Capabilities | 4     | Metadata for Opus 4 and Haiku, undefined for unknown, minimum tier, validateModelAccess      |
| Tier Comparison                 | 1     | compareTiers ordering (free < pro < max < api)                                               |

The `AnthropicModel` enum in `src/lib/models/anthropicModels.ts` defines these models (different from the `AnthropicModels` enum in `src/lib/constants/enums.ts` which includes newer models like Claude 4.5):

| Enum Value           | Model ID                      |
| -------------------- | ----------------------------- |
| CLAUDE_3_HAIKU       | claude-3-haiku-20240307       |
| CLAUDE_3_5_HAIKU     | claude-3-5-haiku-20241022     |
| CLAUDE_3_5_SONNET    | claude-3-5-sonnet-20241022    |
| CLAUDE_3_5_SONNET_V2 | claude-3-5-sonnet-v2-20241022 |
| CLAUDE_SONNET_4      | claude-sonnet-4-20250514      |
| CLAUDE_3_OPUS        | claude-3-opus-20240229        |
| CLAUDE_OPUS_4        | claude-opus-4-20250514        |

#### 4. Provider Integration Tests (16 tests)

Tests the `AnthropicProvider` class from `src/lib/providers/anthropic.ts`.

| Sub-describe                             | Tests | What It Covers                                                                      |
| ---------------------------------------- | ----- | ----------------------------------------------------------------------------------- |
| Provider Initialization with API Key     | 4     | Valid API key init, default model, custom model, default "api" tier                 |
| Provider Initialization with OAuth Token | 4     | JSON token parsing from env, plain string token, tier from scopes, default pro tier |
| Beta Headers Inclusion                   | 2     | Beta header content verification, getAuthHeaders with beta features                 |
| Model Access Validation                  | 1     | API tier has access to all models                                                   |
| Backward Compatibility                   | 2     | Works with existing ANTHROPIC_API_KEY, isAvailable check                            |
| Error Handling                           | 4     | Auth errors, rate limit errors, network errors (ECONNREFUSED), server errors (500)  |
| Usage Tracking                           | 1     | Initializes with zeroed usage info                                                  |

Mock pattern: `vi.mock("@ai-sdk/anthropic", ...)`, `vi.mock("../../src/lib/utils/providerConfig.js", ...)`, `vi.mock("fs", ...)` (sync fs operations mocked to prevent reading real `~/.neurolink/anthropic-credentials.json`).

#### 5. Configuration Tests (11 tests)

Tests environment variable detection, config loading, and credential handling.

| Sub-describe                   | Tests | What It Covers                                                                             |
| ------------------------------ | ----- | ------------------------------------------------------------------------------------------ |
| Environment Variable Detection | 7     | ANTHROPIC_API_KEY, ANTHROPIC_OAUTH_CLIENT_ID, ANTHROPIC_SUBSCRIPTION_TIER, ANTHROPIC_MODEL |
| Config File Loading            | 1     | createAnthropicOAuthConfig structure                                                       |
| Default Values                 | 3     | OAuth endpoints (claude.ai/oauth/authorize), default scopes, default redirect URI          |
| Credential Masking             | 2     | API key masking preserving prefix/suffix, short credential handling                        |

#### 6. Rate Limit Header Parsing Tests (4 tests)

Tests parsing of Anthropic rate limit response headers.

| Sub-describe             | Tests | What It Covers                                             |
| ------------------------ | ----- | ---------------------------------------------------------- |
| Parse Rate Limit Headers | 4     | All headers, missing headers, retry-after, partial headers |

The tests construct `Headers` objects manually and parse `anthropic-ratelimit-*` headers.

#### 7. CLI Auth Command Tests (5 tests)

Tests CLI-level authentication validation and status detection.

| Sub-describe          | Tests | What It Covers                                                         |
| --------------------- | ----- | ---------------------------------------------------------------------- |
| API Key Validation    | 2     | Valid API key format (sk-ant- prefix, length > 20), invalid key format |
| Auth Status Detection | 3     | API key presence, API key absence, model configuration                 |
| Command Options       | 2     | check-only mode, non-interactive mode                                  |

### Writing New Tests

When adding new tests to this file, follow these patterns from the existing test suite:

#### Dynamic Imports

All module imports inside test cases use dynamic `await import(...)` to get fresh module instances after environment variable changes:

```typescript
it("should do something", async () => {
  process.env.ANTHROPIC_API_KEY = "sk-ant-test-key-12345678901234567890";

  const { AnthropicProvider } =
    await import("../../src/lib/providers/anthropic.js");

  const provider = new AnthropicProvider();
  expect(provider).toBeDefined();
});
```

#### Environment Variable Management

Each describe block saves/restores `process.env`:

```typescript
describe("My Tests", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  // tests here...
});
```

Provider Integration Tests also call `vi.resetModules()` in `beforeEach` to ensure fresh module loading.

#### Mocked HTTP (fetch)

For testing OAuth token exchange and refresh:

```typescript
let mockFetch: Mock<typeof fetch>;

beforeEach(() => {
  mockFetch = vi.fn();
  global.fetch = mockFetch as unknown as typeof fetch;
});

it("should exchange code for tokens", async () => {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      access_token: "test-access-token",
      token_type: "Bearer",
      expires_in: 3600,
      refresh_token: "test-refresh-token",
    }),
  } as Response);

  // ... test code
});
```

#### Global Mocks (top of file)

The test file defines these top-level mocks that apply to all tests:

```typescript
// Browser opening
vi.mock("open", () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

// Logger (silences output)
vi.mock("../../src/lib/utils/logger.js", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    always: vi.fn(),
  },
}));

// Async fs operations
vi.mock("fs/promises", () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
  unlink: vi.fn(),
  access: vi.fn(),
  chmod: vi.fn(),
  rename: vi.fn(),
}));

// Sync fs operations (prevents reading real credentials from disk)
vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs")>();
  return {
    ...actual,
    existsSync: vi.fn(() => false),
    readFileSync: vi.fn(() => {
      throw Object.assign(new Error("ENOENT: no such file or directory"), {
        code: "ENOENT",
      });
    }),
  };
});

// Proxy fetch
vi.mock("../../src/lib/proxy/proxyFetch.js", () => ({
  createProxyFetch: vi.fn(() => fetch),
}));

// Anthropic SDK
vi.mock("@ai-sdk/anthropic", () => ({
  createAnthropic: vi.fn(() =>
    vi.fn(() => ({
      modelName: "claude-3-5-sonnet-20241022",
      provider: "anthropic",
    })),
  ),
}));

// Provider config
vi.mock("../../src/lib/utils/providerConfig.js", () => ({
  validateApiKey: vi.fn(() => "sk-ant-test-key-valid"),
  createAnthropicConfig: vi.fn(() => ({
    envVarName: "ANTHROPIC_API_KEY",
    providerName: "Anthropic",
  })),
  getProviderModel: vi.fn(
    (_envVar: string, defaultModel: string) => defaultModel,
  ),
}));
```

### Auto-Refresh Testing

The `AnthropicProvider.refreshAuthIfNeeded()` method handles automatic OAuth token refresh. Key behaviors tested through the provider integration tests:

- **Token expiry uses milliseconds:** `expiresAt` is compared against `Date.now()` (both in milliseconds).
- **5-minute buffer:** Tokens are refreshed when they expire within 5 minutes (`5 * 60 * 1000` ms).
- **In-place mutation:** The provider mutates the `oauthToken` object in-place so the `createOAuthFetch` closure picks up the new `accessToken` automatically.
- **Disk persistence:** After refreshing, the new token is written to `~/.neurolink/anthropic-credentials.json`.
- **Called before every request:** Both `generate()` and `executeStream()` call `refreshAuthIfNeeded()` before making API calls.

The refresh flow in the provider calls `ANTHROPIC_TOKEN_URL` (`https://console.anthropic.com/v1/oauth/token`) with `grant_type=refresh_token`, `client_id`, and the refresh token.

---

## 5. Environment Variables Reference

### Authentication Variables

| Variable                | Description                     | Required  | Example                 |
| ----------------------- | ------------------------------- | --------- | ----------------------- |
| `ANTHROPIC_API_KEY`     | API key for API key auth        | Yes\*     | `sk-ant-api03-...`      |
| `ANTHROPIC_OAUTH_TOKEN` | OAuth token (JSON or string)    | For OAuth | `{"accessToken":"..."}` |
| `CLAUDE_OAUTH_TOKEN`    | Alternative OAuth token env var | For OAuth | `access-token-string`   |

\*Required for API key authentication only.

### Configuration Variables

| Variable                      | Description          | Default                      | Example                                        |
| ----------------------------- | -------------------- | ---------------------------- | ---------------------------------------------- |
| `ANTHROPIC_MODEL`             | Default model to use | `claude-3-5-sonnet-20241022` | `claude-opus-4-20250514`                       |
| `ANTHROPIC_SUBSCRIPTION_TIER` | Subscription tier    | Auto-detected                | `free`, `pro`, `max`, `max_5`, `max_20`, `api` |

### OAuth Configuration Variables

| Variable                        | Description         | Required  | Example                          |
| ------------------------------- | ------------------- | --------- | -------------------------------- |
| `ANTHROPIC_OAUTH_CLIENT_ID`     | OAuth client ID     | For OAuth | `your-client-id`                 |
| `ANTHROPIC_OAUTH_CLIENT_SECRET` | OAuth client secret | Optional  | `your-secret`                    |
| `ANTHROPIC_OAUTH_REDIRECT_URI`  | OAuth redirect URI  | Optional  | `http://localhost:3000/callback` |

### Debug Variables

| Variable              | Description       | Values                           |
| --------------------- | ----------------- | -------------------------------- |
| `NEUROLINK_DEBUG`     | Enable debug mode | `true`, `false`                  |
| `NEUROLINK_LOG_LEVEL` | Logging verbosity | `debug`, `info`, `warn`, `error` |

### Example .env File

```bash
# API Key Authentication
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here

# Optional Configuration
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
ANTHROPIC_SUBSCRIPTION_TIER=api

# Debugging
NEUROLINK_DEBUG=true
NEUROLINK_LOG_LEVEL=debug
```

---

## 6. Model Availability by Tier

### Complete Model Matrix

These are the models defined in the `AnthropicModel` enum in `src/lib/models/anthropicModels.ts`:

| Model                | ID                              | Free | Pro | Max | API | Extended Thinking |
| -------------------- | ------------------------------- | ---- | --- | --- | --- | ----------------- |
| Claude 3 Haiku       | `claude-3-haiku-20240307`       | Yes  | Yes | Yes | Yes | No                |
| Claude 3.5 Haiku     | `claude-3-5-haiku-20241022`     | Yes  | Yes | Yes | Yes | No                |
| Claude 3.5 Sonnet    | `claude-3-5-sonnet-20241022`    | No   | Yes | Yes | Yes | No                |
| Claude 3.5 Sonnet V2 | `claude-3-5-sonnet-v2-20241022` | No   | Yes | Yes | Yes | No                |
| Claude Sonnet 4      | `claude-sonnet-4-20250514`      | No   | Yes | Yes | Yes | Yes               |
| Claude 3 Opus        | `claude-3-opus-20240229`        | No   | No  | Yes | Yes | No                |
| Claude Opus 4        | `claude-opus-4-20250514`        | No   | No  | Yes | Yes | Yes               |

**Note:** The `AnthropicModels` enum in `src/lib/constants/enums.ts` contains additional models (Claude 4.5 series, Claude 4.1, Claude 3.7 Sonnet) used by the main provider registry. The tier access model definitions in `src/lib/models/anthropicModels.ts` use a separate `AnthropicModel` enum.

### Default Models by Tier

| Tier    | Default Model               | Reason                        |
| ------- | --------------------------- | ----------------------------- |
| Free    | `claude-3-5-haiku-20241022` | Only Haiku available          |
| Pro     | `claude-sonnet-4-20250514`  | Best balance for Pro users    |
| Max     | `claude-opus-4-20250514`    | Full flagship access          |
| Max 5x  | `claude-opus-4-20250514`    | Same as Max                   |
| Max 20x | `claude-opus-4-20250514`    | Same as Max                   |
| API     | `claude-sonnet-4-20250514`  | Best cost/performance balance |

### Beta Feature Headers

The `AnthropicBetaFeature` enum (singular) in `src/lib/constants/enums.ts` defines:

| Enum Value               | Header Value                             |
| ------------------------ | ---------------------------------------- |
| `CLAUDE_CODE`            | `claude-code-20250219`                   |
| `INTERLEAVED_THINKING`   | `interleaved-thinking-2025-05-14`        |
| `FINE_GRAINED_STREAMING` | `fine-grained-tool-streaming-2025-05-14` |

The `AnthropicBetaFeatures` type (plural) in `src/lib/types/subscriptionTypes.ts` is a separate configuration interface with boolean flags for beta features like `computerUse`, `extendedThinking`, `promptCaching`, etc.

### Feature Availability

| Feature           | Free    | Pro | Max     | API |
| ----------------- | ------- | --- | ------- | --- |
| Basic Chat        | Yes     | Yes | Yes     | Yes |
| Vision/Images     | Yes     | Yes | Yes     | Yes |
| Tool Use          | Limited | Yes | Yes     | Yes |
| Extended Thinking | No      | Yes | Yes     | Yes |
| 200K Context      | No      | Yes | Yes     | Yes |
| Priority Access   | No      | Yes | Highest | N/A |
| Streaming         | Yes     | Yes | Yes     | Yes |

---

## 7. Troubleshooting

### Common Issues and Solutions

#### Issue: "Invalid API key provided"

**Symptoms:**

```
Error: Invalid Anthropic API key. Please check your ANTHROPIC_API_KEY environment variable.
```

**Solutions:**

```bash
# Verify API key format (should start with sk-ant-)
echo $ANTHROPIC_API_KEY | head -c 10
# Expected: sk-ant-api

# Check for whitespace
echo "$ANTHROPIC_API_KEY" | cat -A
# Look for trailing spaces or newlines

# Re-export with fresh key
export ANTHROPIC_API_KEY="sk-ant-api03-your-key-here"
```

#### Issue: "OAuth token expired"

**Symptoms:**

```
Error: OAuth token expired and no refresh token available. Please re-authenticate.
```

**Solutions:**

```bash
# Try refreshing the token
pnpm run cli -- auth refresh anthropic

# If refresh fails, re-authenticate
pnpm run cli -- auth login anthropic --method oauth
```

#### Issue: "Model not available for subscription tier"

**Symptoms:**

```
Warning: Model not available for subscription tier, using recommended model
```

**Solutions:**

```bash
# Check current subscription tier
echo $ANTHROPIC_SUBSCRIPTION_TIER

# Use a model available for your tier
# Free tier: use Haiku models
pnpm run cli -- generate "Hello" --provider anthropic --model claude-3-5-haiku-20241022

# Or upgrade your subscription tier
export ANTHROPIC_SUBSCRIPTION_TIER="max"
```

#### Issue: "Rate limit exceeded"

**Symptoms:**

```
Error: Anthropic rate limit exceeded. Please try again later.
```

**Solutions:**

```bash
# Check rate limit status
pnpm run cli -- auth status anthropic

# Wait for rate limit reset (usually shown in error message)
# Or upgrade to higher tier for increased limits
```

#### Issue: "OAuth callback never completes"

**Solutions:**

1. Check browser extensions that might block redirects
2. Verify firewall allows localhost connections on the callback port (default: 8787)
3. Try a different browser
4. Check if the port is in use: `lsof -i :8787`

### Debug Mode

Enable debug logging for detailed troubleshooting:

```bash
# Enable debug mode
export NEUROLINK_DEBUG=true
export NEUROLINK_LOG_LEVEL=debug

# Run command with debug output
pnpm run cli -- generate "Hello" --provider anthropic

# Debug output includes:
# - Authentication method detection
# - Model selection logic
# - API request details
# - Rate limit information
```

### Validating Environment

```bash
# Full environment validation
pnpm run env:validate

# Check specific configuration
pnpm run cli -- auth status anthropic

# Verify build is current
pnpm run build:cli && pnpm run cli -- --version
```

### Test Connection

```bash
# Simple connectivity test
pnpm run cli -- generate "ping" --provider anthropic --max-tokens 10

# Expected: Short response confirming connection works
```

---

## 8. Key Source Files

| File                                        | Purpose                                                                       |
| ------------------------------------------- | ----------------------------------------------------------------------------- |
| `test/continuous-test-suite-credentials.ts` | Credentials and subscription test suite (run via `pnpm run test:credentials`) |
| `src/lib/providers/anthropic.ts`            | AnthropicProvider with OAuth, tier, beta support                              |
| `src/lib/auth/anthropicOAuth.ts`            | AnthropicOAuth class, PKCE, token exchange/refresh                            |
| `src/lib/auth/tokenStore.ts`                | TokenStore class, file-based multi-provider storage                           |
| `src/lib/mcp/auth/tokenStorage.ts`          | InMemoryTokenStorage, isTokenExpired, calculateExpiresAt                      |
| `src/lib/types/subscription.ts`             | Type definitions (OAuthToken, ClaudeSubscriptionTier, etc.)                   |
| `src/lib/models/anthropicModels.ts`         | AnthropicModel enum, tier access, model metadata                              |
| `src/lib/constants/enums.ts`                | AnthropicModels enum, AnthropicBetaFeature enum                               |

---

## See Also

- [Claude Subscription Support Overview](claude-subscription.md)
- [Provider Setup Guide](../getting-started/providers/anthropic.md)
