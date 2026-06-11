/**
 * Provider-specific token limit utilities
 * Provides safe maxTokens values based on provider and model capabilities
 */

import { PROVIDER_MAX_TOKENS } from "../core/constants.js";
import { logger } from "./logger.js";
import {
  hasRestrictedOutputLimit,
  RESTRICTED_OUTPUT_TOKEN_LIMIT,
} from "./modelDetection.js";

// Restricted-model detection (Gemini 3.x + image-gen models capped at 32768
// output tokens) lives in modelDetection.ts. Importing the canonical helper
// keeps both call sites on one definition; the previous local copy used
// case-sensitive substring matches and could miss identifiers like
// "Gemini-3-Pro" which the canonical anchored, case-insensitive regex matches.

/**
 * Get the safe maximum tokens for a provider and model
 */
export function getSafeMaxTokens(
  provider: keyof typeof PROVIDER_MAX_TOKENS | string,
  model?: string,
  requestedMaxTokens?: number,
): number | undefined {
  // CRITICAL: Gemini 3 models AND image generation models have a hard limit of 32768 output tokens
  // This check must happen FIRST, before any other logic, because these models
  // will reject requests with maxOutputTokens > 32768
  const isRestrictedModel = model ? hasRestrictedOutputLimit(model) : false;
  if (isRestrictedModel) {
    // Explicit undefined/null check so a caller-supplied 0 is preserved
    // (truthy guards would treat 0 as "unset" and silently fall back to the cap).
    if (
      requestedMaxTokens !== undefined &&
      requestedMaxTokens !== null &&
      requestedMaxTokens > RESTRICTED_OUTPUT_TOKEN_LIMIT
    ) {
      logger.warn(
        `Requested maxTokens ${requestedMaxTokens} exceeds ${model} limit of ${RESTRICTED_OUTPUT_TOKEN_LIMIT}. Using ${RESTRICTED_OUTPUT_TOKEN_LIMIT} instead.`,
      );
      return RESTRICTED_OUTPUT_TOKEN_LIMIT;
    }
    // If no maxTokens specified, use the restricted limit as default
    if (requestedMaxTokens === undefined || requestedMaxTokens === null) {
      return RESTRICTED_OUTPUT_TOKEN_LIMIT;
    }
    // Otherwise, use the requested value (it's within limits, including 0)
    return requestedMaxTokens;
  }

  // Get provider-specific limits
  const providerLimits =
    PROVIDER_MAX_TOKENS[provider as keyof typeof PROVIDER_MAX_TOKENS];

  if (!providerLimits) {
    logger.warn(`Unknown provider ${provider}, no token limits enforced`);
    // Explicit undefined/null check so a caller-supplied 0 is preserved
    // (truthy guard would silently drop 0 here as it does in the restricted branch).
    if (requestedMaxTokens === undefined || requestedMaxTokens === null) {
      return undefined;
    }
    return requestedMaxTokens;
  }

  // Get model-specific limit or provider default
  let maxLimit: number;
  if (
    model &&
    typeof providerLimits === "object" &&
    (providerLimits as Record<string, number>)[model]
  ) {
    maxLimit = (providerLimits as Record<string, number>)[model];
  } else if (
    typeof providerLimits === "object" &&
    (providerLimits as Record<string, number>).default
  ) {
    maxLimit = (providerLimits as Record<string, number>).default;
  } else if (typeof providerLimits === "number") {
    maxLimit = providerLimits;
  } else {
    maxLimit = PROVIDER_MAX_TOKENS.default;
  }

  // If no specific maxTokens requested, return the provider limit.
  // Use explicit undefined/null so a caller-supplied 0 is preserved
  // (matches the restricted-model branch above).
  if (requestedMaxTokens === undefined || requestedMaxTokens === null) {
    return maxLimit;
  }

  // If requested maxTokens exceeds the limit, use the limit and warn
  if (requestedMaxTokens > maxLimit) {
    logger.warn(
      `Requested maxTokens ${requestedMaxTokens} exceeds ${provider}/${model} limit of ${maxLimit}. Using ${maxLimit} instead.`,
    );
    return maxLimit;
  }

  // Use the requested value if it's within limits
  return requestedMaxTokens;
}

/**
 * Maximum output tokens supported by a given Anthropic Claude model.
 *
 * The native Vertex+Claude and native Anthropic message paths send `max_tokens`
 * straight to the Anthropic API, which returns 400 if the value exceeds the
 * model's published output ceiling. (The AI-SDK path clamps automatically;
 * these native paths do not.) This table lets those paths default to the
 * model's real ceiling — 64K for Sonnet/Haiku 4.x, 32K for Opus 4.x — instead of
 * the legacy 4096 that silently truncated large structured responses.
 *
 * Unknown identifiers fall back to a safe modern floor (8192).
 */
export function getClaudeMaxOutputTokens(model: string | undefined): number {
  const m = (model ?? "").toLowerCase();
  // Claude 4.x family: Opus 4.x = 32K, Sonnet/Haiku 4.x = 64K.
  if (/opus[-_.]?4/.test(m)) {
    return 32000;
  }
  if (/sonnet[-_.]?4/.test(m) || /haiku[-_.]?4/.test(m)) {
    return 64000;
  }
  // Claude 3.7 Sonnet supports 64K output.
  if (/3[-_.]?7[-_.]?sonnet/.test(m)) {
    return 64000;
  }
  // Claude 3.5 Sonnet / Haiku → 8192.
  if (/3[-_.]?5[-_.]?(sonnet|haiku)/.test(m)) {
    return 8192;
  }
  // Claude 3 Opus / Sonnet / Haiku → 4096.
  if (/claude-3-(opus|sonnet|haiku)/.test(m) || /3[-_.]?opus/.test(m)) {
    return 4096;
  }
  // Bare family aliases (latest of a family) → assume the modern ceiling.
  if (m.includes("opus")) {
    return 32000;
  }
  if (m.includes("sonnet") || m.includes("haiku")) {
    return 64000;
  }
  return 8192;
}

/**
 * Resolve the `max_tokens` to send on a native Anthropic/Claude request: honour
 * the caller's value but clamp it to the model's published ceiling, and default
 * to that ceiling when the caller did not specify one. Prevents both silent
 * truncation (the legacy 4096 default) and 400s from over-large requests.
 */
export function resolveClaudeMaxTokens(
  model: string | undefined,
  requested?: number,
): number {
  const ceiling = getClaudeMaxOutputTokens(model);
  if (requested !== undefined && requested !== null && requested > 0) {
    return Math.min(requested, ceiling);
  }
  return ceiling;
}

/**
 * Validate if maxTokens is safe for a provider/model combination
 */
export function validateMaxTokens(
  provider: keyof typeof PROVIDER_MAX_TOKENS | string,
  model?: string,
  maxTokens?: number,
): { isValid: boolean; recommendedMaxTokens?: number; warning?: string } {
  const safeMaxTokens = getSafeMaxTokens(provider, model, maxTokens);

  if (!maxTokens) {
    return {
      isValid: true,
      recommendedMaxTokens: safeMaxTokens,
    };
  }

  // If no limits are defined, validation always passes
  if (safeMaxTokens === undefined) {
    return {
      isValid: true,
      recommendedMaxTokens: maxTokens,
    };
  }

  const isValid = maxTokens <= safeMaxTokens;

  return {
    isValid,
    recommendedMaxTokens: safeMaxTokens,
    warning: !isValid
      ? `maxTokens ${maxTokens} exceeds ${provider}/${model} limit of ${safeMaxTokens}`
      : undefined,
  };
}

/**
 * Get provider-specific token limit recommendations
 */
export function getTokenLimitRecommendations(provider: string): {
  conservative: number;
  balanced: number;
  maximum: number;
  models: Record<string, number>;
} {
  const providerLimits =
    PROVIDER_MAX_TOKENS[provider as keyof typeof PROVIDER_MAX_TOKENS];

  if (!providerLimits || typeof providerLimits === "number") {
    const limit =
      typeof providerLimits === "number"
        ? providerLimits
        : PROVIDER_MAX_TOKENS.default;
    return {
      conservative: Math.floor(limit * 0.5),
      balanced: Math.floor(limit * 0.75),
      maximum: limit,
      models: {},
    };
  }

  const modelLimits = Object.entries(providerLimits)
    .filter(([key]) => key !== "default")
    .map(([_, limit]) => limit as number);

  const maxLimit = Math.max(...modelLimits, providerLimits.default || 0);
  const minLimit = Math.min(...modelLimits, providerLimits.default || maxLimit);

  return {
    conservative: Math.floor(minLimit * 0.5),
    balanced: Math.floor(((minLimit + maxLimit) / 2) * 0.75),
    maximum: maxLimit,
    models: Object.fromEntries(
      Object.entries(providerLimits).filter(([key]) => key !== "default"),
    ) as Record<string, number>,
  };
}

/**
 * Get all provider limits summary
 */
export function getAllProviderLimits(): Record<
  string,
  { default: number; models: Record<string, number> }
> {
  const result: Record<
    string,
    { default: number; models: Record<string, number> }
  > = {};

  for (const [provider, limits] of Object.entries(PROVIDER_MAX_TOKENS)) {
    if (provider === "default") {
      continue;
    }

    if (typeof limits === "number") {
      result[provider] = {
        default: limits,
        models: {},
      };
    } else {
      const { default: defaultLimit, ...models } = limits;
      result[provider] = {
        default: defaultLimit || PROVIDER_MAX_TOKENS.default,
        models: models as Record<string, number>,
      };
    }
  }

  return result;
}
