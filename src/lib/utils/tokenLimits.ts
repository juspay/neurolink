/**
 * Provider-specific token limit utilities
 * Provides safe maxTokens values based on provider and model capabilities
 */

import { PROVIDER_MAX_TOKENS, DEFAULT_MAX_TOKENS } from "../core/constants.js";
import { logger } from "./logger.js";

/**
 * Get the safe maximum tokens for a provider and model
 */
export function getSafeMaxTokens(
  provider: keyof typeof PROVIDER_MAX_TOKENS | string,
  model?: string,
  requestedMaxTokens?: number,
): number {
  // Get provider-specific limits
  const providerLimits =
    PROVIDER_MAX_TOKENS[provider as keyof typeof PROVIDER_MAX_TOKENS];

  if (!providerLimits) {
    logger.warn(`Unknown provider ${provider}, using default maxTokens limit`);
    return Math.min(
      requestedMaxTokens || DEFAULT_MAX_TOKENS,
      PROVIDER_MAX_TOKENS.default,
    );
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

  // If no specific maxTokens requested, return the provider limit
  if (!requestedMaxTokens) {
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
 * Validate if maxTokens is safe for a provider/model combination
 */
export function validateMaxTokens(
  provider: keyof typeof PROVIDER_MAX_TOKENS | string,
  model?: string,
  maxTokens?: number,
): { isValid: boolean; recommendedMaxTokens: number; warning?: string } {
  const safeMaxTokens = getSafeMaxTokens(provider, model, maxTokens);

  if (!maxTokens) {
    return {
      isValid: true,
      recommendedMaxTokens: safeMaxTokens,
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
