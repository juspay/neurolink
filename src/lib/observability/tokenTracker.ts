/**
 * Token Usage Tracker
 * Aggregates token usage and cost across spans
 */

import type {
  ObservabilityModelPricing,
  SpanAttributes,
  SpanData,
  TokenUsageStats,
} from "../types/index.js";

/**
 * Built-in model pricing database (approximate, subject to change)
 */
const MODEL_PRICING: Record<string, ObservabilityModelPricing> = {
  // OpenAI
  "gpt-4o": {
    inputPricePerMillion: 2.5,
    outputPricePerMillion: 10.0,
    cachedInputPricePerMillion: 1.25,
  },
  "gpt-4o-mini": {
    inputPricePerMillion: 0.15,
    outputPricePerMillion: 0.6,
    cachedInputPricePerMillion: 0.075,
  },
  o1: {
    inputPricePerMillion: 15.0,
    outputPricePerMillion: 60.0,
    cachedInputPricePerMillion: 7.5,
  },
  "o1-mini": {
    inputPricePerMillion: 3.0,
    outputPricePerMillion: 12.0,
    cachedInputPricePerMillion: 1.5,
  },
  // Anthropic
  "claude-sonnet-4-20250514": {
    inputPricePerMillion: 3.0,
    outputPricePerMillion: 15.0,
    cachedInputPricePerMillion: 0.3,
  },
  "claude-3-5-sonnet-20241022": {
    inputPricePerMillion: 3.0,
    outputPricePerMillion: 15.0,
    cachedInputPricePerMillion: 0.3,
  },
  "claude-3-5-haiku-20241022": {
    inputPricePerMillion: 0.8,
    outputPricePerMillion: 4.0,
    cachedInputPricePerMillion: 0.08,
  },
  // Google
  "gemini-2.5-flash": {
    inputPricePerMillion: 0.15,
    outputPricePerMillion: 0.6,
  },
  "gemini-2.5-pro": {
    inputPricePerMillion: 1.25,
    outputPricePerMillion: 10.0,
  },
  "gemini-2.0-flash-exp": {
    inputPricePerMillion: 0.15,
    outputPricePerMillion: 0.6,
  },
  // Mistral
  "mistral-large-latest": {
    inputPricePerMillion: 2.0,
    outputPricePerMillion: 6.0,
  },
  "mistral-small-latest": {
    inputPricePerMillion: 0.2,
    outputPricePerMillion: 0.6,
  },
};

/**
 * Token tracker for aggregating usage across spans
 */
export class TokenTracker {
  private stats: TokenUsageStats = {
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalTokens: 0,
    cacheReadTokens: 0,
    cacheCreationTokens: 0,
    reasoningTokens: 0,
    totalCost: 0,
    byProvider: new Map(),
    byModel: new Map(),
    bySpanType: new Map(),
  };

  private customPricing: Map<string, ObservabilityModelPricing> = new Map();

  /**
   * Set custom pricing for a single model
   * @param modelName - The model name (e.g., "gpt-4o", "claude-3-5-sonnet")
   * @param pricing - The pricing information
   */
  setObservabilityModelPricing(
    modelName: string,
    pricing: ObservabilityModelPricing,
  ): void {
    this.customPricing.set(modelName, pricing);
  }

  /**
   * Update pricing for an existing model (alias for setObservabilityModelPricing)
   * @param model - The model name
   * @param pricing - The new pricing information
   */
  updatePricing(model: string, pricing: ObservabilityModelPricing): void {
    this.customPricing.set(model, pricing);
  }

  /**
   * Load pricing configuration from a config object
   * Useful for loading pricing from environment or config files
   * @param config - Record of model names to pricing information
   */
  loadPricingFromConfig(
    config: Record<string, ObservabilityModelPricing>,
  ): void {
    for (const [model, pricing] of Object.entries(config)) {
      this.customPricing.set(model, pricing);
    }
  }

  /**
   * Get pricing for a specific model
   * @param model - The model name
   * @returns The pricing information or undefined if not found
   */
  getModelPricing(model: string): ObservabilityModelPricing | undefined {
    return this.customPricing.get(model) ?? MODEL_PRICING[model];
  }

  /**
   * Get all available model pricing (custom + built-in)
   * @returns Record of all model pricing
   */
  getAllPricing(): Record<string, ObservabilityModelPricing> {
    const allPricing: Record<string, ObservabilityModelPricing> = {
      ...MODEL_PRICING,
    };
    // Custom pricing takes precedence
    const customPricingEntries = Array.from(this.customPricing.entries());
    for (const [model, pricing] of customPricingEntries) {
      allPricing[model] = pricing;
    }
    return allPricing;
  }

  /**
   * Remove custom pricing for a model (falls back to built-in)
   * @param model - The model name to remove custom pricing for
   */
  removeCustomPricing(model: string): boolean {
    return this.customPricing.delete(model);
  }

  /**
   * Track token usage from a span
   */
  trackSpan(span: SpanData): void {
    const attrs = span.attributes;

    const inputTokens = (attrs["ai.tokens.input"] as number) ?? 0;
    const outputTokens = (attrs["ai.tokens.output"] as number) ?? 0;
    const totalTokens =
      (attrs["ai.tokens.total"] as number) ?? inputTokens + outputTokens;
    const cacheRead = (attrs["ai.tokens.cache_read"] as number) ?? 0;
    const cacheCreation = (attrs["ai.tokens.cache_creation"] as number) ?? 0;
    const reasoning = (attrs["ai.tokens.reasoning"] as number) ?? 0;
    const cost =
      (attrs["ai.cost.total"] as number) ??
      this.calculateCost(attrs, inputTokens, outputTokens, cacheRead);

    // Update totals
    this.stats.totalInputTokens += inputTokens;
    this.stats.totalOutputTokens += outputTokens;
    this.stats.totalTokens += totalTokens;
    this.stats.cacheReadTokens += cacheRead;
    this.stats.cacheCreationTokens += cacheCreation;
    this.stats.reasoningTokens += reasoning;
    this.stats.totalCost += cost;

    // Update by provider
    const provider = attrs["ai.provider"] as string;
    if (provider) {
      const existing = this.stats.byProvider.get(provider) ?? {
        provider,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        cost: 0,
        requestCount: 0,
      };
      existing.inputTokens += inputTokens;
      existing.outputTokens += outputTokens;
      existing.totalTokens += totalTokens;
      existing.cost += cost;
      existing.requestCount += 1;
      this.stats.byProvider.set(provider, existing);
    }

    // Update by model
    const model = attrs["ai.model"] as string;
    if (model) {
      const existing = this.stats.byModel.get(model) ?? {
        model,
        provider: provider ?? "unknown",
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        cost: 0,
        requestCount: 0,
        avgTokensPerRequest: 0,
      };
      existing.inputTokens += inputTokens;
      existing.outputTokens += outputTokens;
      existing.totalTokens += totalTokens;
      existing.cost += cost;
      existing.requestCount += 1;
      existing.avgTokensPerRequest =
        existing.totalTokens / existing.requestCount;
      this.stats.byModel.set(model, existing);
    }

    // Update by span type
    const currentTypeTotal = this.stats.bySpanType.get(span.type) ?? 0;
    this.stats.bySpanType.set(span.type, currentTypeTotal + totalTokens);
  }

  /**
   * Calculate cost from token counts and provider/model
   */
  private calculateCost(
    attrs: SpanAttributes,
    inputTokens: number,
    outputTokens: number,
    cacheReadTokens: number = 0,
  ): number {
    const model = attrs["ai.model"] as string;
    if (!model) {
      return 0;
    }

    // Check custom pricing first, then fall back to built-in
    const pricing = this.customPricing.get(model) ?? MODEL_PRICING[model];
    if (!pricing) {
      return 0;
    }

    const regularInputTokens = inputTokens - cacheReadTokens;
    const regularCost =
      (regularInputTokens / 1_000_000) * pricing.inputPricePerMillion;
    const cachedCost =
      (cacheReadTokens / 1_000_000) *
      (pricing.cachedInputPricePerMillion ?? pricing.inputPricePerMillion);
    const outputCost =
      (outputTokens / 1_000_000) * pricing.outputPricePerMillion;

    return regularCost + cachedCost + outputCost;
  }

  /**
   * Track token usage from a simple usage object
   * This is a convenience method for tracking usage without a full span
   * @param usage - Token usage data
   */
  trackUsage(usage: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    model?: string;
    provider?: string;
  }): void {
    const inputTokens = usage.promptTokens ?? 0;
    const outputTokens = usage.completionTokens ?? 0;
    const totalTokens = usage.totalTokens ?? inputTokens + outputTokens;

    // Update totals
    this.stats.totalInputTokens += inputTokens;
    this.stats.totalOutputTokens += outputTokens;
    this.stats.totalTokens += totalTokens;

    // Calculate cost if model is provided
    let cost = 0;
    if (usage.model) {
      const pricing =
        this.customPricing.get(usage.model) ?? MODEL_PRICING[usage.model];
      if (pricing) {
        cost =
          (inputTokens / 1_000_000) * pricing.inputPricePerMillion +
          (outputTokens / 1_000_000) * pricing.outputPricePerMillion;
      }
    }
    this.stats.totalCost += cost;

    // Update by provider if provided
    if (usage.provider) {
      const existing = this.stats.byProvider.get(usage.provider) ?? {
        provider: usage.provider,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        cost: 0,
        requestCount: 0,
      };
      existing.inputTokens += inputTokens;
      existing.outputTokens += outputTokens;
      existing.totalTokens += totalTokens;
      existing.cost += cost;
      existing.requestCount += 1;
      this.stats.byProvider.set(usage.provider, existing);
    }

    // Update by model if provided
    if (usage.model) {
      const existing = this.stats.byModel.get(usage.model) ?? {
        model: usage.model,
        provider: usage.provider ?? "unknown",
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        cost: 0,
        requestCount: 0,
        avgTokensPerRequest: 0,
      };
      existing.inputTokens += inputTokens;
      existing.outputTokens += outputTokens;
      existing.totalTokens += totalTokens;
      existing.cost += cost;
      existing.requestCount += 1;
      existing.avgTokensPerRequest =
        existing.totalTokens / existing.requestCount;
      this.stats.byModel.set(usage.model, existing);
    }
  }

  /**
   * Get current stats
   */
  getStats(): TokenUsageStats {
    return { ...this.stats };
  }

  /**
   * Get stats for a specific time window of spans
   */
  getStatsForWindow(spans: SpanData[]): TokenUsageStats {
    const tracker = new TokenTracker();
    // Copy custom pricing so windowed calculations use the same rates
    for (const [model, pricing] of this.customPricing) {
      tracker.setObservabilityModelPricing(model, pricing);
    }
    for (const span of spans) {
      tracker.trackSpan(span);
    }
    return tracker.getStats();
  }

  /**
   * Reset all stats
   */
  reset(): void {
    this.stats = {
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalTokens: 0,
      cacheReadTokens: 0,
      cacheCreationTokens: 0,
      reasoningTokens: 0,
      totalCost: 0,
      byProvider: new Map(),
      byModel: new Map(),
      bySpanType: new Map(),
    };
  }

  /**
   * Export stats as JSON
   */
  toJSON(): Record<string, unknown> {
    return {
      totalInputTokens: this.stats.totalInputTokens,
      totalOutputTokens: this.stats.totalOutputTokens,
      totalTokens: this.stats.totalTokens,
      cacheReadTokens: this.stats.cacheReadTokens,
      cacheCreationTokens: this.stats.cacheCreationTokens,
      reasoningTokens: this.stats.reasoningTokens,
      totalCost: this.stats.totalCost,
      byProvider: Object.fromEntries(this.stats.byProvider),
      byModel: Object.fromEntries(this.stats.byModel),
      bySpanType: Object.fromEntries(this.stats.bySpanType),
    };
  }

  /**
   * Format cost as currency string
   */
  formatCost(cost: number, currency: string = "USD"): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 4,
    }).format(cost);
  }

  /**
   * Get a summary string of current stats
   */
  getSummary(): string {
    const stats = this.stats;
    return [
      `Token Usage Summary:`,
      `  Input tokens: ${stats.totalInputTokens.toLocaleString()}`,
      `  Output tokens: ${stats.totalOutputTokens.toLocaleString()}`,
      `  Total tokens: ${stats.totalTokens.toLocaleString()}`,
      `  Total cost: ${this.formatCost(stats.totalCost)}`,
      stats.cacheReadTokens > 0
        ? `  Cache read tokens: ${stats.cacheReadTokens.toLocaleString()}`
        : "",
      stats.reasoningTokens > 0
        ? `  Reasoning tokens: ${stats.reasoningTokens.toLocaleString()}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");
  }
}

/**
 * Enrich span with token usage attributes
 */
export function enrichSpanWithTokenUsage(
  span: SpanData,
  usage: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    cacheCreationTokens?: number;
    cacheReadTokens?: number;
    reasoningTokens?: number;
  },
): SpanData {
  return {
    ...span,
    attributes: {
      ...span.attributes,
      "ai.tokens.input": usage.promptTokens ?? 0,
      "ai.tokens.output": usage.completionTokens ?? 0,
      "ai.tokens.total":
        usage.totalTokens ??
        (usage.promptTokens ?? 0) + (usage.completionTokens ?? 0),
      "ai.tokens.cache_creation": usage.cacheCreationTokens,
      "ai.tokens.cache_read": usage.cacheReadTokens,
      "ai.tokens.reasoning": usage.reasoningTokens,
    },
  };
}

/**
 * Global token tracker instance (singleton pattern from main)
 */
let globalTokenTracker: TokenTracker | null = null;

/**
 * Get the global token tracker instance
 */
export function getTokenTracker(): TokenTracker {
  if (!globalTokenTracker) {
    globalTokenTracker = new TokenTracker();
  }
  return globalTokenTracker;
}

/**
 * Reset the global token tracker (for testing)
 */
export function resetTokenTracker(): void {
  if (globalTokenTracker) {
    globalTokenTracker.reset();
  }
  globalTokenTracker = null;
}
