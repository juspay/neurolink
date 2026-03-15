/**
 * Sampling Strategies
 * Control which spans are exported for production optimization
 */

import type { SamplerConfig, SamplingRule } from "../types/exporterTypes.js";
import type { SpanData } from "../types/spanTypes.js";
import { SpanStatus } from "../types/spanTypes.js";

/**
 * Sampler interface for controlling which spans are exported
 */
export interface Sampler {
  /** Sampler name for identification */
  readonly name: string;

  /** Determine if a span should be sampled */
  shouldSample(span: SpanData): boolean;

  /** Get sampling decision description */
  getDescription(): string;
}

/**
 * Always sample all spans
 */
export class AlwaysSampler implements Sampler {
  readonly name = "always";

  shouldSample(_span: SpanData): boolean {
    return true;
  }

  getDescription(): string {
    return "Samples 100% of spans";
  }
}

/**
 * Never sample any spans
 */
export class NeverSampler implements Sampler {
  readonly name = "never";

  shouldSample(_span: SpanData): boolean {
    return false;
  }

  getDescription(): string {
    return "Samples 0% of spans";
  }
}

/**
 * Sample spans based on a probability ratio
 */
export class RatioSampler implements Sampler {
  readonly name = "ratio";
  private readonly ratio: number;

  constructor(ratio: number) {
    if (ratio < 0 || ratio > 1) {
      throw new Error("Ratio must be between 0 and 1");
    }
    this.ratio = ratio;
  }

  shouldSample(_span: SpanData): boolean {
    return Math.random() < this.ratio;
  }

  getDescription(): string {
    return `Samples ${this.ratio * 100}% of spans`;
  }
}

/**
 * Sample based on trace ID for consistent sampling across a trace
 */
export class TraceIdRatioSampler implements Sampler {
  readonly name = "trace-id-ratio";
  private readonly ratio: number;
  private readonly upperBound: number;

  constructor(ratio: number) {
    if (ratio < 0 || ratio > 1) {
      throw new Error("Ratio must be between 0 and 1");
    }
    this.ratio = ratio;
    this.upperBound = Math.floor(ratio * 0xffffffff);
  }

  shouldSample(span: SpanData): boolean {
    // Use first 8 chars of trace ID as hash
    const hash = parseInt(span.traceId.substring(0, 8), 16);
    return !isNaN(hash) && hash < this.upperBound;
  }

  getDescription(): string {
    return `Samples ${this.ratio * 100}% of traces (consistent per trace)`;
  }
}

/**
 * Sample based on span attributes (e.g., errors, specific providers)
 */
export class AttributeBasedSampler implements Sampler {
  readonly name = "attribute-based";
  private readonly rules: SamplingRule[];
  private readonly defaultSampler: Sampler;

  constructor(
    rules: SamplingRule[],
    defaultSampler: Sampler = new RatioSampler(0.1),
  ) {
    // Sort rules by priority (higher first)
    this.rules = [...rules].sort(
      (a, b) => (b.priority ?? 0) - (a.priority ?? 0),
    );
    this.defaultSampler = defaultSampler;
  }

  shouldSample(span: SpanData): boolean {
    for (const rule of this.rules) {
      if (this.matchesRule(span, rule)) {
        return rule.sample;
      }
    }
    return this.defaultSampler.shouldSample(span);
  }

  private matchesRule(span: SpanData, rule: SamplingRule): boolean {
    for (const [key, value] of Object.entries(rule.conditions)) {
      const spanValue = span.attributes[key];
      // Support wildcard matching
      if (value === "*" && spanValue !== undefined) {
        continue;
      }
      if (spanValue !== value) {
        return false;
      }
    }
    return true;
  }

  getDescription(): string {
    return `Attribute-based sampling with ${this.rules.length} rules`;
  }
}

/**
 * Priority-based sampler - always sample high-priority spans
 */
export class PrioritySampler implements Sampler {
  readonly name = "priority";
  private readonly highPriorityTypes: string[];
  private readonly fallbackSampler: Sampler;

  constructor(
    highPriorityTypes: string[] = ["model.generation", "tool.call"],
    fallbackSampler: Sampler = new RatioSampler(0.1),
  ) {
    this.highPriorityTypes = highPriorityTypes;
    this.fallbackSampler = fallbackSampler;
  }

  shouldSample(span: SpanData): boolean {
    // Always sample errors
    if (span.status === SpanStatus.ERROR) {
      return true;
    }

    // Always sample high-priority span types
    if (this.highPriorityTypes.includes(span.type)) {
      return true;
    }

    return this.fallbackSampler.shouldSample(span);
  }

  getDescription(): string {
    return `Priority sampling for ${this.highPriorityTypes.join(", ")} spans`;
  }
}

/**
 * Error-only sampler - only sample error spans
 */
export class ErrorOnlySampler implements Sampler {
  readonly name = "error-only";

  shouldSample(span: SpanData): boolean {
    return span.status === SpanStatus.ERROR;
  }

  getDescription(): string {
    return "Samples only error spans";
  }
}

/**
 * Composite sampler that combines multiple samplers
 */
export class CompositeSampler implements Sampler {
  readonly name = "composite";
  private readonly samplers: Array<{ sampler: Sampler; weight: number }>;
  private readonly totalWeight: number;

  constructor(samplers: Array<{ sampler: Sampler; weight: number }>) {
    this.samplers = samplers;
    this.totalWeight = samplers.reduce((sum, s) => sum + s.weight, 0);
  }

  shouldSample(span: SpanData): boolean {
    let random = Math.random() * this.totalWeight;

    for (const { sampler, weight } of this.samplers) {
      random -= weight;
      if (random <= 0) {
        return sampler.shouldSample(span);
      }
    }

    return this.samplers[this.samplers.length - 1].sampler.shouldSample(span);
  }

  getDescription(): string {
    return `Composite of ${this.samplers.length} samplers`;
  }
}

/**
 * Custom sampler that uses a user-provided function
 */
export class CustomSampler implements Sampler {
  readonly name = "custom";
  private readonly sampleFn: (span: SpanData) => boolean;
  private readonly description: string;

  constructor(
    sampleFn: (span: SpanData) => boolean,
    description: string = "Custom sampling function",
  ) {
    this.sampleFn = sampleFn;
    this.description = description;
  }

  shouldSample(span: SpanData): boolean {
    return this.sampleFn(span);
  }

  getDescription(): string {
    return this.description;
  }
}

/**
 * Factory for creating samplers from configuration
 */
export class SamplerFactory {
  static create(config: SamplerConfig): Sampler {
    switch (config.type) {
      case "always":
        return new AlwaysSampler();
      case "never":
        return new NeverSampler();
      case "ratio":
        return new RatioSampler(config.ratio ?? 0.1);
      case "trace-id-ratio":
        return new TraceIdRatioSampler(config.ratio ?? 0.1);
      case "attribute-based":
        return new AttributeBasedSampler(
          config.rules ?? [],
          config.defaultRatio !== undefined
            ? new RatioSampler(config.defaultRatio)
            : undefined,
        );
      case "priority":
        return new PrioritySampler();
      case "error-only":
        return new ErrorOnlySampler();
      default:
        return new RatioSampler(0.1);
    }
  }
}
