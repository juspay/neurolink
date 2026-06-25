import Anthropic from "@anthropic-ai/sdk";
import { SpanKind, trace } from "@opentelemetry/api";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "fs";
import { homedir } from "os";
import { join } from "path";
import {
  ANTHROPIC_TOKEN_URL,
  CLAUDE_CLI_USER_AGENT,
  CLAUDE_CODE_CLIENT_ID,
  CLAUDE_CODE_OAUTH_BETAS,
} from "../auth/anthropicOAuth.js";
import {
  type AIProviderName,
  AnthropicModels,
  TOKEN_EXPIRY_BUFFER_MS,
} from "../constants/enums.js";
import { BaseProvider } from "../core/baseProvider.js";
import { DEFAULT_MAX_STEPS } from "../core/constants.js";
import {
  getModelCapabilities,
  getRecommendedModelForTier,
  isModelAvailableForTier,
} from "../models/anthropicModels.js";
import type { NeuroLink } from "../neurolink.js";
import { createOAuthFetch } from "../proxy/oauthFetch.js";
import { createProxyFetch } from "../proxy/proxyFetch.js";
import type {
  UnknownRecord,
  AnthropicProviderConfig,
  StreamOptions,
  StreamResult,
  ValidationSchema,
  EnhancedGenerateResult,
  TextGenerationOptions,
  AnthropicAuthMethod,
  AnthropicRateLimitInfo,
  AnthropicResponseMetadata,
  ClaudeSubscriptionTier,
  ClaudeUsageInfo,
  OAuthToken,
} from "../types/index.js";
import {
  AuthenticationError,
  NetworkError,
  ProviderError,
  RateLimitError,
} from "../types/index.js";
import { logger } from "../utils/logger.js";
import { redactUrlCredentials } from "../utils/logSanitize.js";
import { calculateCost } from "../utils/pricing.js";
import {
  createAnthropicConfig,
  getProviderModel,
  validateApiKey,
} from "../utils/providerConfig.js";
import {
  composeAbortSignals,
  createTimeoutController,
  mergeAbortSignals,
  TimeoutError,
} from "../utils/timeout.js";
import { resolveToolChoice } from "../utils/toolChoice.js";
import { emitToolEndFromStepFinish } from "../utils/toolEndEmitter.js";
import type { LanguageModel, Tool } from "../types/index.js";
import { NoOutputGeneratedError } from "../utils/generationErrors.js";
import {
  buildNoOutputSentinel,
  stampNoOutputSpan,
} from "../utils/noOutputSentinel.js";
import { convertZodToJsonSchema } from "../utils/schemaConversion.js";
import { resolveClaudeMaxTokens } from "../utils/tokenLimits.js";
import {
  toAnthropicImageBlock,
  fileToAnthropicBlock,
} from "./anthropicImageBlocks.js";
import { modelDeprecatesTemperature } from "../core/modules/structuredOutputPolicy.js";
import {
  createChunkQueue,
  createDeferredAnalytics,
  stringifyToolInput,
} from "./openaiChatCompletionsClient.js";

/**
 * Beta headers for Claude Code integration.
 * These enable experimental features:
 * - claude-code-20250219: Claude Code specific features
 * - fine-grained-tool-streaming-2025-05-14: Fine-grained tool streaming
 *
 * Note: interleaved-thinking-2025-05-14 was removed — it was claude-3-7-sonnet
 * specific and causes invalid_request_error (HTTP 400) on claude-4 models
 * (claude-opus-4-6, claude-sonnet-4-6) which handle thinking via the
 * `thinking` request body parameter instead.
 */
const ANTHROPIC_BETA_HEADERS = {
  "anthropic-beta": [
    "claude-code-20250219",
    "fine-grained-tool-streaming-2025-05-14",
  ].join(","),
};

// AnthropicProviderConfig is imported from types/providers.ts
// Re-export for backward compatibility

// Configuration helpers - now using consolidated utility
const getAnthropicApiKey = (): string => {
  return validateApiKey(createAnthropicConfig());
};

const getDefaultAnthropicModel = (): string => {
  return getProviderModel("ANTHROPIC_MODEL", AnthropicModels.CLAUDE_SONNET_4_6);
};

const streamTracer = trace.getTracer("neurolink.provider.anthropic");

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

// ───────────────────────────────────────────────────────────────────────────
// Native Messages-API conversion helpers (NeuroLink/V3 shapes → Anthropic)
// ───────────────────────────────────────────────────────────────────────────

/**
 * Read an Anthropic cache breakpoint from a message/part/tool carrier.
 * MessageBuilder marks system messages (and GenerationHandler marks the last
 * tool definition) with `providerOptions.anthropic.cacheControl` — the
 * AI-SDK-era prompt-caching contract this native path must keep honoring.
 */
const cacheControlOf = (
  carrier: unknown,
): Anthropic.Messages.CacheControlEphemeral | undefined => {
  const cc = (
    carrier as {
      providerOptions?: { anthropic?: { cacheControl?: { type?: string } } };
    }
  )?.providerOptions?.anthropic?.cacheControl;
  return cc?.type === "ephemeral" ? { type: "ephemeral" } : undefined;
};

/** Serialize a tool-result `output` into text for a tool_result block. */
const stringifyAnthropicToolOutput = (output: unknown): string => {
  if (output === null || output === undefined) {
    return "";
  }
  if (typeof output === "string") {
    return output;
  }
  const o = output as { type?: string; value?: unknown };
  if (o.type === "text" && typeof o.value === "string") {
    return o.value;
  }
  if (o.type === "json" || o.type === "error-json") {
    try {
      return JSON.stringify(o.value);
    } catch {
      return String(o.value);
    }
  }
  try {
    return JSON.stringify(output);
  } catch {
    return String(output);
  }
};

/**
 * Convert NeuroLink/V3-shaped messages (the shape produced by
 * buildMessagesForStream and by the AI-SDK prompt on the V3 doGenerate path)
 * into the Anthropic Messages payload: a top-level `system` string plus
 * alternating user/assistant messages with typed content blocks.
 */
const messagesToAnthropic = (
  msgs: ReadonlyArray<{
    role: string;
    content: unknown;
    toolCallId?: string;
  }>,
): {
  system?: string | Anthropic.Messages.TextBlockParam[];
  messages: Anthropic.Messages.MessageParam[];
} => {
  const systemBlocks: Anthropic.Messages.TextBlockParam[] = [];
  const messages: Anthropic.Messages.MessageParam[] = [];

  const partsOf = (content: unknown): unknown[] =>
    Array.isArray(content) ? content : [content];

  // Message-level cache breakpoints apply to the message's LAST content
  // block (the AI-SDK convention MessageBuilder relies on).
  const applyMessageCacheControl = (
    blocks: Anthropic.Messages.ContentBlockParam[],
    msg: unknown,
  ): void => {
    const cc = cacheControlOf(msg);
    if (cc && blocks.length > 0) {
      const last = blocks[blocks.length - 1] as { cache_control?: unknown };
      last.cache_control = cc;
    }
  };

  for (const msg of msgs) {
    switch (msg.role) {
      case "system": {
        const text =
          typeof msg.content === "string"
            ? msg.content
            : partsOf(msg.content)
                .map((p) =>
                  typeof p === "string"
                    ? p
                    : String((p as { text?: string })?.text ?? ""),
                )
                .join("\n");
        const cc = cacheControlOf(msg);
        systemBlocks.push({
          type: "text",
          text,
          ...(cc ? { cache_control: cc } : {}),
        });
        break;
      }
      case "user": {
        const blocks: Anthropic.Messages.ContentBlockParam[] = [];
        for (const part of partsOf(msg.content)) {
          if (typeof part === "string") {
            if (part.length > 0) {
              blocks.push({ type: "text", text: part });
            }
            continue;
          }
          const p = part as {
            type?: string;
            text?: string;
            image?: unknown;
            data?: unknown;
            url?: unknown;
          };
          if (p?.type === "text" && typeof p.text === "string") {
            const cc = cacheControlOf(p);
            blocks.push({
              type: "text",
              text: p.text,
              ...(cc ? { cache_control: cc } : {}),
            });
          } else if (p?.type === "image" || p?.type === "image_url") {
            const img = toAnthropicImageBlock(p.image ?? p.data ?? p.url);
            if (img) {
              const cc = cacheControlOf(p);
              blocks.push(cc ? { ...img, cache_control: cc } : img);
            }
          } else if (p?.type === "file") {
            // AI-SDK v6 encodes images AND PDFs as `type:"file"` parts in the
            // LanguageModel prompt that `doGenerate` receives. Without this
            // branch the image is dropped on the tool-using generate path and
            // the model never sees it ("no image detected").
            const block = fileToAnthropicBlock(
              p as { mediaType?: string; data?: unknown },
            );
            if (block) {
              const cc = cacheControlOf(p);
              if (cc) {
                // block is a fresh object from fileToAnthropicBlock; mutate in
                // place to keep the discriminated-union type (a spread widens it
                // past ContentBlockParam).
                (
                  block as {
                    cache_control?: Anthropic.Messages.CacheControlEphemeral;
                  }
                ).cache_control = cc;
              }
              blocks.push(block);
            }
          }
        }
        if (blocks.length > 0) {
          applyMessageCacheControl(blocks, msg);
          messages.push({ role: "user", content: blocks });
        }
        break;
      }
      case "assistant": {
        const blocks: Anthropic.Messages.ContentBlockParam[] = [];
        for (const part of partsOf(msg.content)) {
          if (typeof part === "string") {
            if (part.length > 0) {
              blocks.push({ type: "text", text: part });
            }
            continue;
          }
          const p = part as {
            type?: string;
            text?: string;
            toolCallId?: string;
            toolName?: string;
            input?: unknown;
          };
          if (p?.type === "text" && typeof p.text === "string") {
            if (p.text.length > 0) {
              const cc = cacheControlOf(p);
              blocks.push({
                type: "text",
                text: p.text,
                ...(cc ? { cache_control: cc } : {}),
              });
            }
          } else if (p?.type === "tool-call") {
            let input: unknown = p.input;
            if (typeof input === "string") {
              try {
                input = JSON.parse(input);
              } catch {
                input = {};
              }
            }
            blocks.push({
              type: "tool_use",
              id: p.toolCallId ?? "",
              name: p.toolName ?? "",
              input: input ?? {},
            });
          }
        }
        if (blocks.length > 0) {
          applyMessageCacheControl(blocks, msg);
          messages.push({ role: "assistant", content: blocks });
        }
        break;
      }
      case "tool": {
        // Tool results are user-role messages with tool_result blocks.
        const blocks: Anthropic.Messages.ContentBlockParam[] = [];
        if (Array.isArray(msg.content)) {
          for (const part of msg.content) {
            const p = part as {
              type?: string;
              toolCallId?: string;
              output?: unknown;
            };
            if (p?.type === "tool-result") {
              blocks.push({
                type: "tool_result",
                tool_use_id: p.toolCallId ?? "",
                content: stringifyAnthropicToolOutput(p.output),
              });
            }
          }
        } else if (typeof msg.content === "string") {
          blocks.push({
            type: "tool_result",
            tool_use_id: msg.toolCallId ?? "",
            content: msg.content,
          });
        }
        if (blocks.length > 0) {
          messages.push({ role: "user", content: blocks });
        }
        break;
      }
    }
  }

  // Plain-string system when no cache breakpoints are present (matches the
  // previous wire shape); block form only when cache_control must ride along.
  const system =
    systemBlocks.length === 0
      ? undefined
      : systemBlocks.some((b) => b.cache_control)
        ? systemBlocks
        : systemBlocks.map((b) => b.text).join("\n\n");

  return {
    ...(system !== undefined ? { system } : {}),
    messages,
  };
};

/** Convert a NeuroLink tool record into Anthropic tool definitions. */
const toolsToAnthropic = (
  tools: Record<string, Tool>,
): Anthropic.Messages.Tool[] | undefined => {
  const entries = Object.entries(tools);
  if (entries.length === 0) {
    return undefined;
  }
  return entries.map(([name, tool]) => {
    const t = tool as {
      description?: string;
      inputSchema?: unknown;
      parameters?: unknown;
    };
    const rawSchema = t.inputSchema ?? t.parameters;
    const input_schema = (
      rawSchema
        ? convertZodToJsonSchema(rawSchema as never)
        : { type: "object", properties: {} }
    ) as Anthropic.Messages.Tool.InputSchema;
    // GenerationHandler marks the last tool definition with a cache
    // breakpoint when prompt caching is active — keep honoring it.
    const cc = cacheControlOf(tool);
    return {
      name,
      ...(t.description ? { description: t.description } : {}),
      input_schema,
      ...(cc ? { cache_control: cc } : {}),
    };
  });
};

/** Map a NeuroLink tool choice onto Anthropic's tool_choice shape. */
const toolChoiceToAnthropic = (
  choice: unknown,
): Anthropic.Messages.MessageCreateParams["tool_choice"] => {
  if (!choice || choice === "auto") {
    return undefined; // Anthropic defaults to auto when tools are present
  }
  if (choice === "none") {
    return { type: "none" };
  }
  if (choice === "required") {
    return { type: "any" };
  }
  if (typeof choice === "object") {
    const c = choice as { type?: string; toolName?: string };
    if (c.type === "tool" && c.toolName) {
      return { type: "tool", name: c.toolName };
    }
  }
  return undefined;
};

/** Map Anthropic stop_reason onto the V3 unified finish reason. */
const mapAnthropicStopReason = (
  raw: string | null | undefined,
): "stop" | "length" | "tool-calls" | "content-filter" => {
  switch (raw) {
    case "max_tokens":
      return "length";
    case "tool_use":
      return "tool-calls";
    case "refusal":
      return "content-filter";
    default:
      return "stop";
  }
};

// Anthropic's Messages API requires max_tokens on every request. When the
// caller omits it, default to the model's real output ceiling via
// resolveClaudeMaxTokens (e.g. 64K for Sonnet 4.x) instead of the legacy 4096,
// which silently truncated large structured responses mid-JSON.
//
// Client-level request timeout. The Anthropic SDK throws "Streaming is required
// for long requests" from a NON-streaming `messages.create` when `max_tokens`
// is large AND no client-level timeout is configured (it can't estimate a safe
// timeout). Setting an explicit client timeout — equal to the SDK's own default
// for the non-throwing path — suppresses that pre-flight throw so large
// max_tokens (our model-ceiling default) works. Per-request duration is still
// bounded by the abort signal NeuroLink composes for each call.
const ANTHROPIC_CLIENT_TIMEOUT_MS = 600_000;

/**
 * Anthropic Provider v2 - BaseProvider Implementation
 * Enhanced with OAuth support, subscription tiers, and beta headers for Claude Code integration.
 */
export class AnthropicProvider extends BaseProvider {
  private client: Anthropic;
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
    credentials?: { apiKey?: string; oauthToken?: string },
  ) {
    // Pre-compute effective model with tier validation before calling super.
    //
    // When per-request credentials supply an apiKey (without oauthToken),
    // force api_key auth — skip OAuth detection entirely so the caller's
    // key is used rather than a stale OAuth token from ~/.neurolink/.
    const forceApiKey = !!(credentials?.apiKey && !credentials?.oauthToken);
    const oauthToken = forceApiKey
      ? null
      : ((credentials?.oauthToken
          ? { accessToken: credentials.oauthToken }
          : null) ??
        config?.oauthToken ??
        getOAuthToken());
    // Resolve auth method FIRST so that tier detection uses the chosen method.
    // If ANTHROPIC_AUTH_METHOD=api_key wins over an existing OAuth token, the
    // tier must reflect api_key mode (full model access) rather than the OAuth
    // token's subscription level.
    const authMethod = forceApiKey
      ? ("api_key" as AnthropicAuthMethod)
      : (config?.authMethod ?? detectAuthMethod(oauthToken));
    const subscriptionTier =
      config?.subscriptionTier ??
      (authMethod === "oauth" ? detectSubscriptionTier(oauthToken) : "api");
    const targetModel = modelName || getDefaultAnthropicModel();

    // Determine effective model based on tier access.
    // Skip tier validation when a proxy is in use (ANTHROPIC_BASE_URL is set)
    // — the proxy handles model access and auth, so the SDK should pass
    // the requested model through without downgrading.
    let effectiveModel = targetModel;
    const usingProxy = !!process.env.ANTHROPIC_BASE_URL;
    if (
      !usingProxy &&
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

    // Use the auth method already resolved above (before tier computation)
    this.authMethod = authMethod;

    // Build headers based on auth method and subscription tier
    const headers: Record<string, string> = this.getAuthHeaders();

    // Create the official Anthropic SDK client based on auth method
    let client: Anthropic;

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
      // skipBodyTransform=true: For the SDK client path, body transforms ARE
      // intentionally skipped because the official Anthropic SDK builds its
      // own request format (system prompts, metadata, tool definitions). The
      // billing header, agent block, user_id injection, and mcp_ tool-name
      // prefixing are only needed for proxy passthrough of raw Claude API
      // requests where we must make the request look like it came from
      // Claude Code / CLIProxyAPI.
      const oauthFetch = createOAuthFetch(
        () => tokenRef.accessToken,
        this.enableBetaFeatures,
        false, // No mcp_ prefix — tool names pass through as-is (matches CLIProxyAPI)
        true, // skipBodyTransform — see comment above
      );

      // For OAuth, we use a dummy API key since our fetch wrapper handles auth
      // IMPORTANT: Do NOT pass beta headers here - our fetch wrapper handles them
      // The claude-code-20250219 beta header triggers "credential only for Claude Code" error
      client = new Anthropic({
        apiKey: "oauth-authenticated", // Placeholder, actual auth is in fetch wrapper
        // Note: No headers passed - fetch wrapper sets oauth-2025-04-20 beta header
        fetch: oauthFetch as unknown as typeof globalThis.fetch,
        timeout: ANTHROPIC_CLIENT_TIMEOUT_MS,
      });
      logger.debug(
        "[AnthropicProvider] Anthropic SDK client created with OAuth fetch wrapper",
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
      const apiKeyToUse =
        credentials?.apiKey ?? config?.apiKey ?? getAnthropicApiKey();

      // The official Anthropic SDK builds `${baseURL}/v1/messages` itself, so
      // a version-suffixed base URL — the form the previous @ai-sdk/anthropic
      // implementation REQUIRED (`https://api.anthropic.com/v1`) — would
      // double up as `/v1/v1/messages`. Normalize the inverse way now: strip
      // a trailing `/vN` segment when present so both historical forms of
      // ANTHROPIC_BASE_URL keep working.
      const normalizedBaseURL = (() => {
        const raw = process.env.ANTHROPIC_BASE_URL;
        if (!raw) {
          return undefined;
        }
        const trimmed = raw.replace(/\/+$/, "");
        const stripped = trimmed.replace(/\/v\d+$/, "");
        if (stripped !== trimmed) {
          logger.debug(
            "[AnthropicProvider] Stripping the version suffix from " +
              "ANTHROPIC_BASE_URL — the official Anthropic SDK appends /v1 " +
              "to the base URL itself.",
            {
              baseURL: redactUrlCredentials(raw),
              rewrittenTo: redactUrlCredentials(stripped),
            },
          );
        }
        return stripped;
      })();

      client = new Anthropic({
        apiKey: apiKeyToUse,
        defaultHeaders: headers,
        ...(normalizedBaseURL && { baseURL: normalizedBaseURL }),
        fetch: createProxyFetch() as unknown as typeof globalThis.fetch,
        timeout: ANTHROPIC_CLIENT_TIMEOUT_MS,
      });

      logger.debug("Anthropic Provider initialized with API key", {
        modelName: this.modelName,
        provider: this.providerName,
        authMethod: this.authMethod,
        subscriptionTier: this.subscriptionTier,
        enableBetaFeatures: this.enableBetaFeatures,
      });
    }

    this.client = client;

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

    // When routing through proxy (ANTHROPIC_BASE_URL set), use the full
    // OAuth beta set so the proxy forwards them upstream. Without these,
    // Anthropic treats the request with tighter non-subscription rate limits.
    const usingProxy = !!process.env.ANTHROPIC_BASE_URL;

    if (this.enableBetaFeatures) {
      if (usingProxy) {
        // The 1M-context beta requires a plan upgrade on most accounts;
        // surfacing it by default forces a "The long context beta is not
        // yet available for this subscription." failure for everyone else.
        // Gate behind ANTHROPIC_ENABLE_LONG_CONTEXT_BETA=1 so default-tier
        // accounts (and CI) can use the proxy without the gated feature.
        const longContextOptIn =
          process.env.ANTHROPIC_ENABLE_LONG_CONTEXT_BETA === "1" ||
          process.env.ANTHROPIC_ENABLE_LONG_CONTEXT_BETA === "true";
        const betas = [
          ...CLAUDE_CODE_OAUTH_BETAS,
          "fine-grained-tool-streaming-2025-05-14",
          "interleaved-thinking-2025-05-14",
          "redact-thinking-2026-02-12",
        ];
        if (longContextOptIn) {
          betas.push("context-1m-2025-08-07");
        }
        headers["anthropic-beta"] = betas.join(",");
      } else {
        headers["anthropic-beta"] = ANTHROPIC_BETA_HEADERS["anthropic-beta"];
      }
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
    // Proxy mode: bypass tier validation entirely — the proxy handles model
    // access. Log at debug level so users can tell why an unknown model name
    // "validated" when their proxy may not actually expose it.
    if (process.env.ANTHROPIC_BASE_URL) {
      logger.debug(
        "[validateModelAccess] Bypassing tier check (ANTHROPIC_BASE_URL set — proxy enforces access)",
        { model },
      );
      return true;
    }

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

      // User-Agent is set to CLAUDE_CLI_USER_AGENT so the refresh request
      // matches what the official Claude CLI / CLIProxyAPI sends. Anthropic
      // gates parts of the OAuth flow on this UA (the same `client_id` is
      // rejected by `ANTHROPIC_TOKEN_URL` if the UA looks like a generic
      // SDK), so this is required for OAuth refresh to succeed — not a
      // cosmetic choice. If Anthropic ever publishes a separate UA for
      // third-party OAuth clients, switch to that. See `auth/anthropicOAuth.ts`
      // for the source of `CLAUDE_CLI_USER_AGENT` / `CLAUDE_CODE_CLIENT_ID`.
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
   * Returns a V3-shaped delegating model whose `doGenerate` drives the
   * official Anthropic Messages API directly. BaseProvider's `generate()`
   * path (and its middleware wrapping) keeps working unchanged; the
   * streaming path bypasses this entirely via `executeStream`.
   */
  public getAISDKModel(): LanguageModel {
    const client = this.client;
    const providerName = this.providerName;
    const modelId = this.modelName || getDefaultAnthropicModel();
    const getTimeoutForOptions = (
      opts: Record<string, unknown> | undefined,
    ): number => this.getTimeout((opts ?? {}) as never);
    const refreshAuth = () => this.refreshAuthIfNeeded();

    return {
      specificationVersion: "v3",
      provider: providerName,
      modelId,
      supportedUrls: {},
      doGenerate: async (
        options: {
          prompt: unknown[];
          abortSignal?: AbortSignal;
          maxOutputTokens?: number;
          temperature?: number;
          topP?: number;
          stopSequences?: string[];
          tools?: Array<{
            type: string;
            name: string;
            description?: string;
            inputSchema?: unknown;
          }>;
          toolChoice?: { type: string; toolName?: string };
          responseFormat?: {
            type: "text" | "json";
            schema?: Record<string, unknown>;
            name?: string;
            description?: string;
          };
          providerOptions?: Record<string, Record<string, unknown>>;
        } & Record<string, unknown>,
      ) => {
        await refreshAuth();
        const { system, messages } = messagesToAnthropic(
          options.prompt as Array<{ role: string; content: unknown }>,
        );

        let tools: Anthropic.Messages.Tool[] | undefined = (options.tools ?? [])
          .filter((t) => t.type === "function")
          .map((t) => {
            // GenerationHandler marks the last tool definition with a cache
            // breakpoint when prompt caching is active — keep honoring it.
            const cc = cacheControlOf(t);
            return {
              name: t.name,
              ...(t.description ? { description: t.description } : {}),
              input_schema: (t.inputSchema ?? {
                type: "object",
                properties: {},
              }) as Anthropic.Messages.Tool.InputSchema,
              ...(cc ? { cache_control: cc } : {}),
            };
          });
        if (tools && tools.length === 0) {
          tools = undefined;
        }
        let toolChoice = options.toolChoice
          ? toolChoiceToAnthropic(
              options.toolChoice.type === "tool"
                ? { type: "tool", toolName: options.toolChoice.toolName }
                : options.toolChoice.type,
            )
          : undefined;

        // JSON/structured output: Anthropic has no response_format — emulate
        // with a forced synthetic tool whose input IS the JSON payload (the
        // same object-tool strategy @ai-sdk/anthropic used).
        let jsonTool: string | undefined;
        if (options.responseFormat?.type === "json") {
          jsonTool = options.responseFormat.name ?? "json";
          const schema = (options.responseFormat.schema ?? {
            type: "object",
          }) as Anthropic.Messages.Tool.InputSchema;
          tools = [
            {
              name: jsonTool,
              description:
                options.responseFormat.description ??
                "Respond by calling this tool with the answer as its input.",
              input_schema: schema,
            },
          ];
          toolChoice = { type: "tool", name: jsonTool };
        }

        // Extended thinking passthrough (providerOptions.anthropic.thinking).
        const thinking = options.providerOptions?.anthropic?.thinking as
          | { type: "enabled"; budget_tokens: number }
          | undefined;

        const params: Anthropic.Messages.MessageCreateParamsNonStreaming = {
          model: modelId,
          messages,
          max_tokens: resolveClaudeMaxTokens(modelId, options.maxOutputTokens),
          ...(system ? { system } : {}),
          ...(options.temperature !== undefined &&
          options.temperature !== null &&
          !modelDeprecatesTemperature(modelId)
            ? { temperature: options.temperature }
            : {}),
          ...(options.topP !== undefined && options.topP !== null
            ? { top_p: options.topP }
            : {}),
          ...(options.stopSequences && options.stopSequences.length > 0
            ? { stop_sequences: options.stopSequences }
            : {}),
          ...(tools ? { tools } : {}),
          ...(toolChoice ? { tool_choice: toolChoice } : {}),
          ...(thinking ? { thinking } : {}),
        };

        // The 60s anthropic generate default was tuned for the old ~4096
        // max_tokens. Now that the default ceiling is the model's real max,
        // a large structured response needs more wall-clock to be produced —
        // otherwise the inner controller aborts mid-generation (the AI-SDK
        // doGenerate layer doesn't see the caller's `timeout`). Raise the
        // floor to 5 min when a large output budget is in play — but only
        // when the caller did NOT set an explicit timeout: an explicit value
        // is a contract and must never be silently extended. The abort
        // signal stays the real bound.
        const callerTimeout = (options as { timeout?: number | string })
          .timeout;
        const callerSpecifiedTimeout =
          callerTimeout !== undefined && callerTimeout !== null;
        const generateTimeoutMs =
          params.max_tokens > 8192 && !callerSpecifiedTimeout
            ? Math.max(getTimeoutForOptions(options), 300_000)
            : getTimeoutForOptions(options);
        const timeoutController = createTimeoutController(
          generateTimeoutMs,
          providerName,
          "generate",
        );
        let response: Anthropic.Messages.Message;
        try {
          response = await client.messages.create(params, {
            signal: composeAbortSignals(
              options.abortSignal,
              timeoutController?.controller.signal,
            ),
          });
        } finally {
          timeoutController?.cleanup();
        }

        const content: Array<{ type: string } & Record<string, unknown>> = [];
        for (const block of response.content) {
          if (block.type === "thinking") {
            content.push({ type: "reasoning", text: block.thinking });
          } else if (block.type === "text") {
            // In forced-json mode the payload arrives via the tool input, not
            // text — pass text through only in normal mode.
            if (!jsonTool) {
              content.push({ type: "text", text: block.text });
            }
          } else if (block.type === "tool_use") {
            if (jsonTool && block.name === jsonTool) {
              // Unwrap the synthetic tool call back into text JSON.
              content.push({
                type: "text",
                text: stringifyToolInput(block.input),
              });
            } else {
              content.push({
                type: "tool-call",
                toolCallId: block.id,
                toolName: block.name,
                input: stringifyToolInput(block.input),
              });
            }
          }
        }

        const cacheRead = response.usage.cache_read_input_tokens ?? 0;
        const cacheWrite = response.usage.cache_creation_input_tokens ?? 0;
        return {
          content,
          finishReason: {
            unified: mapAnthropicStopReason(response.stop_reason),
            raw: response.stop_reason ?? "stop",
          },
          usage: {
            inputTokens: {
              total: response.usage.input_tokens + cacheRead + cacheWrite,
              noCache: response.usage.input_tokens,
              cacheRead,
              cacheWrite,
            },
            outputTokens: {
              total: response.usage.output_tokens,
              text: response.usage.output_tokens,
              reasoning: undefined,
            },
          },
          warnings: [],
          request: { body: params },
          response: {
            id: response.id,
            modelId: response.model,
            headers: {},
            body: response,
          },
        };
      },
      doStream: () => {
        throw new Error(
          `${providerName}: doStream is not implemented on the delegating model — the streaming path uses executeStream directly.`,
        );
      },
    } as unknown as LanguageModel;
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
    // Consumer-driven abort: fires when the async iterator is closed early
    // (caller breaks out of `for await`) so the background loop stops
    // reading SSE and running tools.
    const consumerAbortController = new AbortController();
    const abortSignal = mergeAbortSignals([
      options.abortSignal,
      timeoutController?.controller.signal,
      consumerAbortController.signal,
    ]).signal;

    let toolsRecord: Record<string, Tool>;
    let anthropicTools: Anthropic.Messages.Tool[] | undefined;
    let payload: {
      system?: string | Anthropic.Messages.TextBlockParam[];
      messages: Anthropic.Messages.MessageParam[];
    };
    let shouldUseTools: boolean;
    try {
      // options.tools is pre-merged by BaseProvider.stream() with base tools
      // (MCP/built-in) + user-provided tools (RAG, etc.)
      shouldUseTools = !options.disableTools && this.supportsTools();
      toolsRecord = shouldUseTools
        ? (options.tools as Record<string, Tool>) || (await this.getAllTools())
        : {};
      anthropicTools = shouldUseTools
        ? toolsToAnthropic(toolsRecord)
        : undefined;
      // Build message array from options with multimodal support, then
      // convert to the Anthropic Messages payload (system + content blocks).
      const built = await this.buildMessagesForStream(options);
      payload = messagesToAnthropic(
        built as Array<{ role: string; content: unknown }>,
      );
    } catch (setupErr) {
      timeoutController?.cleanup();
      throw this.handleProviderError(setupErr);
    }

    const modelId = this.modelName || getDefaultAnthropicModel();
    const anthropicToolChoice =
      shouldUseTools && anthropicTools && anthropicTools.length > 0
        ? toolChoiceToAnthropic(
            resolveToolChoice(options, toolsRecord, shouldUseTools),
          )
        : undefined;

    // Extended thinking: enabled when the caller supplies an explicit token
    // budget (mirrors the previous experimental_thinking gating). Thinking
    // deltas stream out on the `reasoning` chunk channel.
    const thinking =
      options.thinkingConfig?.enabled && options.thinkingConfig.budgetTokens
        ? {
            type: "enabled" as const,
            budget_tokens: options.thinkingConfig.budgetTokens,
          }
        : undefined;

    // Wrap the native stream in an OTel span to capture provider-level
    // latency and token usage (same span name as the pre-migration path so
    // dashboards stay continuous).
    const streamSpan = streamTracer.startSpan("neurolink.provider.streamText", {
      kind: SpanKind.CLIENT,
      attributes: {
        "gen_ai.system": "anthropic",
        "gen_ai.request.model": modelId,
      },
    });

    const maxSteps = options.maxSteps || DEFAULT_MAX_STEPS;
    const emitter = this.neurolink?.getEventEmitter();
    const { pushChunk, nextChunk } = createChunkQueue();
    const { usagePromise, finishPromise, resolveUsage, resolveFinish } =
      createDeferredAnalytics();

    usagePromise
      .then((usage) => {
        streamSpan.setAttribute(
          "gen_ai.usage.input_tokens",
          usage.promptTokens || 0,
        );
        streamSpan.setAttribute(
          "gen_ai.usage.output_tokens",
          usage.completionTokens || 0,
        );
        const cost = calculateCost(this.providerName, this.modelName, {
          input: usage.promptTokens || 0,
          output: usage.completionTokens || 0,
          total: usage.totalTokens || 0,
        });
        if (cost && cost > 0) {
          streamSpan.setAttribute("neurolink.cost", cost);
        }
      })
      .catch(() => {
        // usage may never resolve if the stream is aborted before completion
      });
    finishPromise
      .then((reason) => {
        streamSpan.setAttribute(
          "gen_ai.response.finish_reason",
          reason || "unknown",
        );
        streamSpan.end();
      })
      .catch(() => {
        streamSpan.end();
      });

    let capturedProviderError: unknown;
    const client = this.client;
    const toolsUsed: string[] = [];

    const runLoop = async (): Promise<void> => {
      const conversation = payload.messages.slice();
      let totalInput = 0;
      let totalOutput = 0;
      let lastStop: string | null = null;

      for (let step = 0; step < maxSteps; step++) {
        const params: Anthropic.Messages.MessageCreateParamsStreaming = {
          model: modelId,
          messages: conversation,
          max_tokens: resolveClaudeMaxTokens(modelId, options.maxTokens),
          stream: true,
          ...(payload.system ? { system: payload.system } : {}),
          ...(options.temperature !== undefined &&
          options.temperature !== null &&
          !modelDeprecatesTemperature(modelId)
            ? { temperature: options.temperature }
            : {}),
          ...(anthropicTools && anthropicTools.length > 0
            ? { tools: anthropicTools }
            : {}),
          ...(anthropicToolChoice ? { tool_choice: anthropicToolChoice } : {}),
          ...(thinking ? { thinking } : {}),
        };
        const events = await client.messages.create(params, {
          signal: abortSignal ?? undefined,
        });

        // Per-step accumulators, keyed by content-block index so blocks are
        // replayed to the conversation in order (thinking blocks must be
        // passed back with their signatures when tool use continues a turn).
        const blockTypes = new Map<number, string>();
        const textAcc = new Map<number, string>();
        const thinkingAcc = new Map<
          number,
          { text: string; signature: string }
        >();
        const toolAcc = new Map<
          number,
          { id: string; name: string; inputJson: string }
        >();
        let stopReason: string | null = null;

        for await (const event of events) {
          if (event.type === "message_start") {
            totalInput += event.message.usage.input_tokens ?? 0;
            totalOutput += event.message.usage.output_tokens ?? 0;
          } else if (event.type === "content_block_start") {
            blockTypes.set(event.index, event.content_block.type);
            if (event.content_block.type === "tool_use") {
              toolAcc.set(event.index, {
                id: event.content_block.id,
                name: event.content_block.name,
                inputJson: "",
              });
            }
          } else if (event.type === "content_block_delta") {
            const delta = event.delta;
            if (delta.type === "text_delta") {
              textAcc.set(
                event.index,
                (textAcc.get(event.index) ?? "") + delta.text,
              );
              pushChunk({ content: delta.text });
            } else if (delta.type === "thinking_delta") {
              const acc = thinkingAcc.get(event.index) ?? {
                text: "",
                signature: "",
              };
              acc.text += delta.thinking;
              thinkingAcc.set(event.index, acc);
              // Reasoning rides the dedicated chunk channel; `content` stays
              // an always-present string so plain-text consumers are safe.
              pushChunk({ content: "", reasoning: delta.thinking });
            } else if (delta.type === "signature_delta") {
              const acc = thinkingAcc.get(event.index) ?? {
                text: "",
                signature: "",
              };
              acc.signature += delta.signature;
              thinkingAcc.set(event.index, acc);
            } else if (delta.type === "input_json_delta") {
              const acc = toolAcc.get(event.index);
              if (acc) {
                acc.inputJson += delta.partial_json;
              }
            }
          } else if (event.type === "message_delta") {
            stopReason = event.delta.stop_reason ?? stopReason;
            totalOutput += event.usage?.output_tokens ?? 0;
          }
        }
        lastStop = stopReason;

        if (stopReason !== "tool_use" || toolAcc.size === 0) {
          break;
        }

        // Replay this assistant turn (thinking + text + tool_use blocks, in
        // block order) then execute the requested tools and append their
        // results as a user turn — the native multi-step tool loop.
        const assistantBlocks: Anthropic.Messages.ContentBlockParam[] = [];
        const orderedIndexes = [...blockTypes.keys()].sort((a, b) => a - b);
        for (const idx of orderedIndexes) {
          const type = blockTypes.get(idx);
          if (type === "thinking") {
            const acc = thinkingAcc.get(idx);
            if (acc && acc.text.length > 0) {
              assistantBlocks.push({
                type: "thinking",
                thinking: acc.text,
                signature: acc.signature,
              });
            }
          } else if (type === "text") {
            const text = textAcc.get(idx);
            if (text && text.length > 0) {
              assistantBlocks.push({ type: "text", text });
            }
          } else if (type === "tool_use") {
            const acc = toolAcc.get(idx);
            if (acc) {
              let input: unknown;
              try {
                input = acc.inputJson ? JSON.parse(acc.inputJson) : {};
              } catch {
                input = {};
              }
              assistantBlocks.push({
                type: "tool_use",
                id: acc.id,
                name: acc.name,
                input,
              });
            }
          }
        }
        conversation.push({ role: "assistant", content: assistantBlocks });

        const resultBlocks: Anthropic.Messages.ToolResultBlockParam[] = [];
        const toolCallsForStorage: Array<{
          type: string;
          toolCallId: string;
          toolName: string;
          args: unknown;
        }> = [];
        const toolResultsForStorage: Array<{
          type: string;
          toolCallId: string;
          toolName: string;
          result?: unknown;
          error?: string;
        }> = [];

        for (const acc of toolAcc.values()) {
          let args: Record<string, unknown>;
          try {
            args = acc.inputJson
              ? (JSON.parse(acc.inputJson) as Record<string, unknown>)
              : {};
          } catch {
            args = {};
          }
          toolCallsForStorage.push({
            type: "tool-call",
            toolCallId: acc.id,
            toolName: acc.name,
            args,
          });
          toolsUsed.push(acc.name);

          const tool = toolsRecord[acc.name] as
            | {
                execute?: (
                  input: Record<string, unknown>,
                  ctx: { toolCallId: string; messages: unknown[] },
                ) => Promise<unknown>;
              }
            | undefined;
          try {
            if (!tool?.execute) {
              throw new Error(`Tool not found: ${acc.name}`);
            }
            const result = await tool.execute(args, {
              toolCallId: acc.id,
              messages: [],
            });
            toolResultsForStorage.push({
              type: "tool-result",
              toolCallId: acc.id,
              toolName: acc.name,
              result,
            });
            resultBlocks.push({
              type: "tool_result",
              tool_use_id: acc.id,
              content: stringifyAnthropicToolOutput(result),
            });
          } catch (toolErr) {
            const message =
              toolErr instanceof Error ? toolErr.message : String(toolErr);
            toolResultsForStorage.push({
              type: "tool-result",
              toolCallId: acc.id,
              toolName: acc.name,
              error: message,
            });
            resultBlocks.push({
              type: "tool_result",
              tool_use_id: acc.id,
              content: `Error: ${message}`,
              is_error: true,
            });
          }
        }

        // Emit tool:end events for Pipeline B and persist tool executions —
        // the same hooks the streamText onStepFinish callback used to drive.
        emitToolEndFromStepFinish(
          emitter,
          toolResultsForStorage.map((tr) => ({
            toolName: tr.toolName,
            result: tr.result,
            error: tr.error,
          })),
        );
        this.handleToolExecutionStorage(
          toolCallsForStorage,
          toolResultsForStorage,
          options,
          new Date(),
        ).catch((storageErr: unknown) => {
          logger.warn("[AnthropicProvider] Failed to store tool executions", {
            provider: this.providerName,
            error:
              storageErr instanceof Error
                ? storageErr.message
                : String(storageErr),
          });
        });

        conversation.push({ role: "user", content: resultBlocks });
      }

      resolveUsage({
        promptTokens: totalInput,
        completionTokens: totalOutput,
        totalTokens: totalInput + totalOutput,
      });
      resolveFinish(lastStop ?? "stop");
    };

    const loopPromise = runLoop()
      // Parameter named `error` so the compiled `capturedProviderError = error`
      // assignment matches the regression-grep in test:context 6.14.
      .catch((error: unknown) => {
        capturedProviderError = error;
        logger.error("Anthropic: Stream error", {
          error: error instanceof Error ? error.message : String(error),
        });
        resolveFinish("error");
        throw this.formatProviderError(error);
      })
      .finally(() => {
        timeoutController?.cleanup();
        pushChunk({ done: true });
      });
    loopPromise.catch(() => {
      // Swallowed by design: the generator below surfaces loop errors after
      // draining the queue; this guard only prevents an unhandled-rejection
      // crash when the consumer abandons the stream early.
    });

    const providerName = this.providerName;
    const transformedStream = async function* () {
      let contentYielded = 0;
      try {
        for (;;) {
          const chunk = await nextChunk();
          if ("done" in chunk) {
            break;
          }
          if (
            "content" in chunk &&
            typeof chunk.content === "string" &&
            chunk.content.length > 0
          ) {
            contentYielded++;
          }
          yield chunk;
        }
        // Surface any error the loop threw after draining the queue.
        await loopPromise;
        // No-output path: stream completed normally but yielded zero text.
        if (contentYielded === 0 && toolsUsed.length === 0) {
          logger.warn(
            `${providerName}: Stream produced no output — emitting enriched sentinel`,
          );
          const fauxNoOutput = new NoOutputGeneratedError({
            message: "Stream produced no output",
          });
          const sentinel = await buildNoOutputSentinel(
            fauxNoOutput,
            undefined,
            capturedProviderError,
          );
          stampNoOutputSpan(sentinel);
          yield sentinel as { content: string };
        }
      } catch (streamError) {
        const sentinel = await buildNoOutputSentinel(
          streamError,
          undefined,
          capturedProviderError,
        );
        stampNoOutputSpan(sentinel);
        yield sentinel as { content: string };
        if (!NoOutputGeneratedError.isInstance(streamError)) {
          throw streamError;
        }
      } finally {
        if (!consumerAbortController.signal.aborted) {
          consumerAbortController.abort();
        }
      }
    };

    return {
      stream: transformedStream(),
      provider: this.providerName,
      model: this.modelName,
      toolCalls: [],
      toolResults: [],
    };
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

  getModel(): LanguageModel {
    return this.getAISDKModel();
  }
}

// Re-export types and utilities for convenience
export {
  getModelCapabilities,
  getRecommendedModelForTier,
  isModelAvailableForTier,
  ModelAccessError,
} from "../models/anthropicModels.js";

// Export beta headers constant for external use
export { ANTHROPIC_BETA_HEADERS };
