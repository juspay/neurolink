import type {
  ClaudeProxyModelTier,
  ClaudeProxyRequestClass,
  ClaudeProxyRequestProfile,
  CooldownScope,
  CooldownSkippedAccount,
  FallbackEligibilityDecision,
  FallbackEntry,
  ParsedClaudeRequest,
  ProxyTranslationAttempt,
  ProxyTranslationPlan,
  RuntimeAccountState,
} from "../types/index.js";

export type {
  ClaudeProxyModelTier,
  ClaudeProxyRequestClass,
  ClaudeProxyRequestProfile,
  CooldownScope,
  CooldownSkippedAccount,
  FallbackEligibilityDecision,
  ProxyTranslationAttempt,
  ProxyTranslationPlan,
};

const STREAMING_CONVERSATIONAL_TOOL_THRESHOLD = 4;
const STRONG_TOOL_FIDELITY_THRESHOLD = 8;
const HIGH_TOOL_COUNT_THRESHOLD = 24;
const DEFAULT_COOLDOWN_FLOOR_MS = 1_000;
const HIGH_TOOL_COUNT_COOLDOWN_FLOOR_MS = 10_000;
const HIGH_FIDELITY_COOLDOWN_FLOOR_MS = 300_000;

export function inferClaudeProxyModelTier(
  modelName: string,
): ClaudeProxyModelTier {
  const normalized = modelName.toLowerCase();
  if (normalized.includes("opus")) {
    return "opus";
  }
  if (normalized.includes("sonnet")) {
    return "sonnet";
  }
  if (normalized.includes("haiku")) {
    return "haiku";
  }
  return "other";
}

function detectToolHistory(parsed: ParsedClaudeRequest): boolean {
  return parsed.conversationMessages.some((message) => {
    return (
      message.content.includes("[tool_use:") ||
      message.content.includes("[tool_result:")
    );
  });
}

export function classifyClaudeProxyRequest(
  requestedModel: string,
  parsed: ParsedClaudeRequest,
): ClaudeProxyRequestProfile {
  const toolCount = Object.keys(parsed.tools).length;
  const hasImages = parsed.images.length > 0;
  const hasThinking = !!parsed.thinkingConfig?.enabled;
  const hasToolHistory = detectToolHistory(parsed);
  const requiresSpecificTool = !!parsed.toolChoiceName;
  const requiresToolUse =
    parsed.toolChoice === "required" || requiresSpecificTool || hasToolHistory;
  const requiresStrongToolFidelity =
    toolCount >= STRONG_TOOL_FIDELITY_THRESHOLD ||
    requiresSpecificTool ||
    hasToolHistory;
  const isHighToolCountNonStream =
    !parsed.stream && toolCount >= HIGH_TOOL_COUNT_THRESHOLD;
  const isStreamingConversational =
    parsed.stream &&
    !hasImages &&
    toolCount <= STREAMING_CONVERSATIONAL_TOOL_THRESHOLD &&
    !requiresStrongToolFidelity;

  const classes: ClaudeProxyRequestClass[] = [];
  if (hasImages) {
    classes.push("multimodal");
  }
  if (isHighToolCountNonStream) {
    classes.push("high-tool-count-non-stream-structured");
  }
  if (requiresStrongToolFidelity) {
    classes.push("strong-tool-fidelity");
  }
  if (isStreamingConversational) {
    classes.push("streaming-conversational");
  }
  if (classes.length === 0) {
    classes.push("standard");
  }

  return {
    requestedModel,
    modelTier: inferClaudeProxyModelTier(requestedModel),
    primaryClass: classes[0],
    classes,
    stream: parsed.stream,
    toolCount,
    hasImages,
    hasThinking,
    hasToolHistory,
    requiresToolUse,
    requiresSpecificTool,
    requiresStrongToolFidelity,
    isHighToolCountNonStream,
    isStreamingConversational,
    isMultimodal: hasImages,
  };
}

export function getRequestClassCooldownKey(
  profile: ClaudeProxyRequestProfile,
): string {
  return `${profile.primaryClass}:${profile.requestedModel.toLowerCase()}`;
}

export function getModelTierCooldownKey(
  profile: ClaudeProxyRequestProfile,
): string {
  return profile.modelTier;
}

function getQualityGuardReason(
  profile: ClaudeProxyRequestProfile,
  provider?: string,
  _model?: string,
): string | null {
  // Only gate auto-provider fallback (no explicit provider).
  // Configured fallback-chain entries are always allowed through —
  // let them attempt the request and fail naturally if the provider
  // cannot handle it.
  if (!provider) {
    if (
      profile.modelTier === "opus" ||
      profile.requiresStrongToolFidelity ||
      profile.isHighToolCountNonStream
    ) {
      return "auto-provider fallback is disabled for requests that require contract preservation";
    }
    return null;
  }

  return null;
}

export function evaluateFallbackEligibility(
  profile: ClaudeProxyRequestProfile,
  candidate: {
    provider?: string;
    model?: string;
  },
): FallbackEligibilityDecision {
  const policyBlockReason = getQualityGuardReason(
    profile,
    candidate.provider,
    candidate.model,
  );
  if (policyBlockReason) {
    return {
      provider: candidate.provider,
      model: candidate.model,
      eligible: false,
      reason: policyBlockReason,
    };
  }

  return {
    provider: candidate.provider,
    model: candidate.model,
    eligible: true,
    reason: "eligible",
  };
}

export function buildProxyTranslationPlan(
  primary: { provider: string; model?: string },
  fallbackChain: FallbackEntry[],
  requestedModel: string,
  parsed: ParsedClaudeRequest,
): ProxyTranslationPlan {
  const profile = classifyClaudeProxyRequest(requestedModel, parsed);
  const attempts: ProxyTranslationAttempt[] = [
    {
      provider: primary.provider,
      model: primary.model,
      label: `${primary.provider}/${primary.model ?? "unknown"}`,
    },
  ];
  const skipped: FallbackEligibilityDecision[] = [];

  for (const fallback of fallbackChain) {
    if (
      fallback.provider === primary.provider &&
      fallback.model === primary.model
    ) {
      continue;
    }

    const decision = evaluateFallbackEligibility(profile, fallback);
    if (!decision.eligible) {
      skipped.push(decision);
      continue;
    }

    attempts.push({
      provider: fallback.provider,
      model: fallback.model,
      label: `${fallback.provider}/${fallback.model}`,
    });
  }

  if (fallbackChain.length === 0) {
    const autoDecision = evaluateFallbackEligibility(profile, {});
    if (autoDecision.eligible) {
      attempts.push({ label: "auto-provider" });
    } else {
      skipped.push(autoDecision);
    }
  }

  return {
    profile,
    attempts,
    skipped,
  };
}

export function summarizeSkippedFallbacks(
  plan: Pick<ProxyTranslationPlan, "profile" | "skipped">,
): string | null {
  if (plan.skipped.length === 0) {
    return null;
  }

  const summary = plan.skipped
    .map((decision) => {
      const label = decision.provider
        ? `${decision.provider}/${decision.model ?? "unknown"}`
        : "auto-provider";
      return `${label}: ${decision.reason}`;
    })
    .join("; ");

  return `Fallback policy preserved the requested ${plan.profile.primaryClass} contract by skipping ineligible targets. ${summary}`;
}

export function getActiveCooldownScope(
  state: RuntimeAccountState,
  profile: ClaudeProxyRequestProfile,
  now: number = Date.now(),
): CooldownScope | null {
  let longest: CooldownScope | null = null;

  const requestClassKey = getRequestClassCooldownKey(profile);
  const requestClassUntil =
    state.requestClassCooldowns?.[requestClassKey] ?? undefined;
  if (requestClassUntil && requestClassUntil > now) {
    longest = {
      scope: "request_class",
      key: requestClassKey,
      until: requestClassUntil,
    };
  }

  const modelTierKey = getModelTierCooldownKey(profile);
  const modelTierUntil = state.modelTierCooldowns?.[modelTierKey] ?? undefined;
  if (
    modelTierUntil &&
    modelTierUntil > now &&
    modelTierUntil > (longest?.until ?? 0)
  ) {
    longest = {
      scope: "model_tier",
      key: modelTierKey,
      until: modelTierUntil,
    };
  }

  if (
    state.coolingUntil &&
    state.coolingUntil > now &&
    state.coolingUntil > (longest?.until ?? 0)
  ) {
    longest = {
      scope: "generic",
      key: "generic",
      until: state.coolingUntil,
    };
  }

  return longest;
}

export function partitionAccountsByCooldown<T extends { key: string }>(
  accounts: T[],
  getState: (account: T) => RuntimeAccountState,
  profile: ClaudeProxyRequestProfile,
  now: number = Date.now(),
): {
  eligible: T[];
  skipped: CooldownSkippedAccount<T>[];
} {
  const eligible: T[] = [];
  const skipped: CooldownSkippedAccount<T>[] = [];

  for (const account of accounts) {
    const cooldown = getActiveCooldownScope(getState(account), profile, now);
    if (cooldown) {
      skipped.push({ account, cooldown });
      continue;
    }
    eligible.push(account);
  }

  return {
    eligible,
    skipped,
  };
}

export function applyRateLimitCooldownScope(args: {
  state: RuntimeAccountState;
  profile: ClaudeProxyRequestProfile;
  retryAfterMs?: number;
  now?: number;
  capMs: number;
}): {
  backoffMs: number;
  requestClassKey: string;
  modelTierKey: string;
} {
  const now = args.now ?? Date.now();
  const requestClassKey = getRequestClassCooldownKey(args.profile);
  const modelTierKey = getModelTierCooldownKey(args.profile);

  const rcBackoffLevels = args.state.requestClassBackoffLevels ?? {};
  const mtBackoffLevels = args.state.modelTierBackoffLevels ?? {};
  const scopedBackoffLevel = Math.max(
    rcBackoffLevels[requestClassKey] ?? 0,
    mtBackoffLevels[modelTierKey] ?? 0,
  );

  // High-tool-count-non-stream gets its own (lower) floor so that requests
  // recover faster once proper OAuth betas are forwarded. Check it first
  // because every >=24-tool request also satisfies requiresStrongToolFidelity
  // (threshold 8), which would otherwise shadow this branch.
  const floorMs = args.profile.isHighToolCountNonStream
    ? HIGH_TOOL_COUNT_COOLDOWN_FLOOR_MS
    : args.profile.modelTier === "opus" ||
        args.profile.requiresStrongToolFidelity
      ? HIGH_FIDELITY_COOLDOWN_FLOOR_MS
      : DEFAULT_COOLDOWN_FLOOR_MS;
  const baseCooldownMs = Math.max(args.retryAfterMs ?? 0, floorMs);
  const backoffMs = Math.min(
    baseCooldownMs * 2 ** scopedBackoffLevel,
    args.capMs,
  );
  const until = now + backoffMs;

  args.state.requestClassCooldowns = {
    ...(args.state.requestClassCooldowns ?? {}),
    [requestClassKey]: Math.max(
      args.state.requestClassCooldowns?.[requestClassKey] ?? 0,
      until,
    ),
  };
  args.state.modelTierCooldowns = {
    ...(args.state.modelTierCooldowns ?? {}),
    [modelTierKey]: Math.max(
      args.state.modelTierCooldowns?.[modelTierKey] ?? 0,
      until,
    ),
  };

  args.state.requestClassBackoffLevels = {
    ...rcBackoffLevels,
    [requestClassKey]: (rcBackoffLevels[requestClassKey] ?? 0) + 1,
  };
  args.state.modelTierBackoffLevels = {
    ...mtBackoffLevels,
    [modelTierKey]: (mtBackoffLevels[modelTierKey] ?? 0) + 1,
  };

  args.state.backoffLevel += 1;

  return {
    backoffMs,
    requestClassKey,
    modelTierKey,
  };
}
