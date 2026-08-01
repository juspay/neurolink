import type {
  FallbackEntry,
  ModelMapping,
  ProxyRoutingConfig,
  RouteResult,
} from "../types/index.js";

/** Default and accepted range for concurrent upstream requests per OAuth account. */
export const MIN_MAX_INFLIGHT_PER_ACCOUNT = 1;
export const MAX_MAX_INFLIGHT_PER_ACCOUNT = 20;
export const DEFAULT_MAX_INFLIGHT_PER_ACCOUNT = 2;

export class ModelRouter {
  private readonly mappings: Map<string, ModelMapping>;
  private readonly passthrough: Set<string>;
  private readonly fallback: FallbackEntry[];
  private readonly autoFallback: boolean;
  private readonly maxInflightPerAccount: number;

  constructor(config: ProxyRoutingConfig) {
    this.mappings = new Map(config.modelMappings.map((m) => [m.from, m]));
    this.passthrough = new Set(config.passthroughModels ?? []);
    this.fallback = config.fallbackChain;
    this.autoFallback = config.autoFallback === true;
    this.maxInflightPerAccount =
      config.maxInflightPerAccount ?? DEFAULT_MAX_INFLIGHT_PER_ACCOUNT;
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

  /** Maximum concurrent upstream requests admitted for each OAuth account. */
  getMaxInflightPerAccount(): number {
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
