import type {
  FallbackEntry,
  ModelMapping,
  ProxyRoutingConfig,
  RouteResult,
} from "../types/index.js";

/** Accepted range for an explicitly configured OAuth account admission cap. */
export const MIN_MAX_INFLIGHT_PER_ACCOUNT = 1;
export const MAX_MAX_INFLIGHT_PER_ACCOUNT = 20;

/**
 * The single definition of "a usable admission cap": an integer inside the
 * accepted range. Anything else — `0`, `1.5`, `21`, `NaN` — means unlimited.
 *
 * `parseProxyConfig()` already drops invalid YAML values, but `ProxyRoutingConfig`
 * is an exported type, so a programmatic caller can hand `ModelRouter` a value
 * that never passed through it. Without this, `getMaxInflightPerAccount()` would
 * report a bound (`0`, `21`) that the admission path ignores as unlimited, and
 * the two would disagree about whether the account is capped.
 */
export function normalizeMaxInflightPerAccount(
  capacity: number | undefined,
): number | undefined {
  return typeof capacity === "number" &&
    Number.isInteger(capacity) &&
    capacity >= MIN_MAX_INFLIGHT_PER_ACCOUNT &&
    capacity <= MAX_MAX_INFLIGHT_PER_ACCOUNT
    ? capacity
    : undefined;
}

export class ModelRouter {
  private readonly mappings: Map<string, ModelMapping>;
  private readonly passthrough: Set<string>;
  private readonly fallback: FallbackEntry[];
  private readonly autoFallback: boolean;
  private readonly maxInflightPerAccount: number | undefined;

  constructor(config: ProxyRoutingConfig) {
    this.mappings = new Map(config.modelMappings.map((m) => [m.from, m]));
    this.passthrough = new Set(config.passthroughModels ?? []);
    this.fallback = config.fallbackChain;
    this.autoFallback = config.autoFallback === true;
    this.maxInflightPerAccount = normalizeMaxInflightPerAccount(
      config.maxInflightPerAccount,
    );
  }

  resolve(requestedModel: string): RouteResult {
    const mapping = this.mappings.get(requestedModel);
    if (mapping) {
      return { provider: mapping.provider, model: mapping.to };
    }
    if (this.passthrough.has(requestedModel)) {
      return { provider: "anthropic", model: requestedModel };
    }
    if (requestedModel.startsWith("gemini-")) {
      return { provider: "vertex", model: requestedModel };
    }
    if (requestedModel.startsWith("claude-")) {
      return { provider: "anthropic", model: requestedModel };
    }
    return { provider: null, model: requestedModel };
  }

  isClaudeTarget(requestedModel: string): boolean {
    return this.resolve(requestedModel).provider === "anthropic";
  }

  getFallbackChain(): FallbackEntry[] {
    return this.fallback;
  }

  /** Whether translation-layer auto-provider fallback is explicitly enabled. */
  isAutoFallbackEnabled(): boolean {
    return this.autoFallback;
  }

  /** Explicit per-account admission cap, or undefined when admission is unlimited. */
  getMaxInflightPerAccount(): number | undefined {
    return this.maxInflightPerAccount;
  }

  /** Return the raw model mapping entries (used by /v1/models). */
  getModelMappings(): ModelMapping[] {
    return Array.from(this.mappings.values());
  }

  /** Return models configured for passthrough (used by /v1/models). */
  getPassthroughModels(): string[] {
    return Array.from(this.passthrough);
  }
}
