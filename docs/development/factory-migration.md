# Factory Pattern Migration Guide

Comprehensive guide for migrating to NeuroLink's factory pattern architecture, ensuring consistent provider management and scalable implementation.

## 🏭 Factory Pattern Overview

### Why Factory Patterns

The factory pattern in NeuroLink provides:

- **Consistent Provider Creation**: Standardized instantiation across all AI providers
- **Centralized Configuration**: Single source of truth for provider settings
- **Lifecycle Management**: Proper initialization, caching, and cleanup
- **Type Safety**: Full TypeScript support with compile-time validation
- **Extensibility**: Easy addition of new providers without code changes

### Core Factory Components

```typescript
interface ProviderFactory {
  createProvider(type: ProviderType, config: ProviderConfig): Provider;
  getProvider(type: ProviderType): Provider;
  configureProvider(type: ProviderType, config: ProviderConfig): void;
  destroyProvider(type: ProviderType): void;
  listProviders(): Provider[];
}

interface Provider {
  readonly name: string;
  readonly type: ProviderType;
  readonly capabilities: ProviderCapabilities;

  generate(request: GenerationRequest): Promise<GenerationResponse>;
  stream(request: StreamRequest): AsyncIterable<StreamChunk>;
  checkHealth(): Promise<HealthStatus>;
  getMetrics(): Promise<ProviderMetrics>;
}
```

## 🔄 Migration Steps

### Step 1: Assess Current Implementation

**Pre-Migration Checklist:**

```typescript
// Legacy implementation assessment
interface LegacyAnalysis {
  currentProviderInstantiation: "direct" | "singleton" | "mixed";
  configurationMethod: "hardcoded" | "environment" | "config-file";
  errorHandling: "basic" | "comprehensive" | "inconsistent";
  typeSupport: "none" | "partial" | "full";
  testCoverage: number; // percentage
}

// Assessment tool
class MigrationAssessment {
  analyzeCodebase(projectPath: string): LegacyAnalysis {
    // Scan existing codebase for patterns
    return {
      currentProviderInstantiation: this.detectInstantiationPattern(),
      configurationMethod: this.detectConfigMethod(),
      errorHandling: this.assessErrorHandling(),
      typeSupport: this.checkTypeScript(),
      testCoverage: this.calculateTestCoverage(),
    };
  }

  generateMigrationPlan(analysis: LegacyAnalysis): MigrationPlan {
    // Create step-by-step migration roadmap
    return {
      complexity: this.assessComplexity(analysis),
      estimatedEffort: this.calculateEffort(analysis),
      riskFactors: this.identifyRisks(analysis),
      prerequisites: this.listPrerequisites(analysis),
      steps: this.generateSteps(analysis),
    };
  }
}
```

### Step 2: Install and Configure NeuroLink

```bash
# Install NeuroLink with factory support
npm install @juspay/neurolink@latest

# Verify installation
npx @juspay/neurolink --version
npx @juspay/neurolink status
```

**Initial Configuration:**

```typescript
// neurolink.config.ts
import { NeuroLinkConfig } from "@juspay/neurolink";

export const config: NeuroLinkConfig = {
  factory: {
    enableCaching: true,
    healthCheckInterval: 30000,
    retryConfiguration: {
      maxRetries: 3,
      backoffMultiplier: 2,
      initialDelay: 1000,
    },
  },
  providers: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      defaultModel: "gpt-4",
      timeout: 30000,
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,
      defaultModel: "claude-3-sonnet-20240229",
      timeout: 30000,
    },
    "google-ai": {
      apiKey: process.env.GOOGLE_AI_API_KEY,
      defaultModel: "gemini-2.5-pro",
      timeout: 30000,
    },
  },
  analytics: {
    enabled: true,
    trackUsage: true,
    trackPerformance: true,
  },
};
```

### Step 3: Refactor Provider Instantiation

**Before (Legacy Pattern):**

```typescript
// ❌ Legacy direct instantiation
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

class LegacyService {
  private openai: OpenAI;
  private anthropic: Anthropic;

  constructor() {
    // Direct instantiation - hard to manage
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async generateText(prompt: string, provider: string) {
    // Manual provider selection and handling
    if (provider === "openai") {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
      });
      return response.choices[0].message.content;
    } else if (provider === "anthropic") {
      const response = await this.anthropic.messages.create({
        model: "claude-3-sonnet-20240229",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      });
      return response.content[0].text;
    }
    throw new Error("Unsupported provider");
  }
}
```

**After (Factory Pattern):**

```typescript
// ✅ Modern factory-based approach
import { NeuroLink, ProviderFactory } from "@juspay/neurolink";

class ModernService {
  private neurolink: NeuroLink;
  private factory: ProviderFactory;

  constructor() {
    // Factory-managed instantiation
    this.neurolink = new NeuroLink();
    this.factory = this.neurolink.getProviderFactory();
  }

  async generateText(prompt: string, providerType?: string) {
    // Unified interface across all providers
    return await this.neurolink.generate({
      input: { text: prompt },
      provider: providerType as any, // Auto-selection if not specified
      temperature: 0.7,
      maxTokens: 1000,
    });
  }

  async generateWithMultipleProviders(prompt: string, providers: string[]) {
    // Easy multi-provider comparison
    const results = await Promise.allSettled(
      providers.map((provider) =>
        this.neurolink.generate({
          input: { text: prompt },
          provider: provider as any,
        }),
      ),
    );

    return results.map((result, index) => ({
      provider: providers[index],
      success: result.status === "fulfilled",
      content: result.status === "fulfilled" ? result.value.content : null,
      error: result.status === "rejected" ? result.reason : null,
    }));
  }
}
```

### Step 4: Migrate Configuration Management

**Before (Environment Variables):**

```typescript
// ❌ Scattered configuration
const config = {
  openaiKey: process.env.OPENAI_API_KEY,
  anthropicKey: process.env.ANTHROPIC_API_KEY,
  googleKey: process.env.GOOGLE_AI_API_KEY,
  defaultModel: process.env.DEFAULT_MODEL || "gpt-4",
  timeout: parseInt(process.env.TIMEOUT || "30000"),
};
```

**After (Centralized Configuration):**

```typescript
// ✅ Centralized factory configuration
import { NeuroLinkConfig } from "@juspay/neurolink";

const config: NeuroLinkConfig = {
  providers: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY!,
      defaultModel: "gpt-4",
      timeout: 30000,
      rateLimiting: {
        requestsPerMinute: 60,
        tokensPerMinute: 40000,
      },
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY!,
      defaultModel: "claude-3-sonnet-20240229",
      timeout: 30000,
      rateLimiting: {
        requestsPerMinute: 50,
        tokensPerMinute: 100000,
      },
    },
  },
  routing: {
    strategy: "least_loaded", // or 'round_robin', 'fastest'
    fallbackEnabled: true,
    healthCheckInterval: 60000,
  },
};

export default config;
```

### Step 5: Update Error Handling

**Before (Manual Error Handling):**

```typescript
// ❌ Provider-specific error handling
async function handleOpenAIRequest(prompt: string) {
  try {
    const response = await openai.chat.completions.create({...});
    return response.choices[0].message.content;
  } catch (error) {
    if (error.status === 429) {
      // Rate limiting logic
      await new Promise(resolve => setTimeout(resolve, 1000));
      return handleOpenAIRequest(prompt); // Retry
    } else if (error.status === 401) {
      throw new Error('OpenAI API key invalid');
    }
    throw error;
  }
}
```

**After (Factory-Managed Error Handling):**

```typescript
// ✅ Unified error handling
async function handleRequest(prompt: string) {
  try {
    const response = await neurolink.generate({
      input: { text: prompt },
      retryConfig: {
        maxRetries: 3,
        backoffMultiplier: 2,
        retryableErrors: ["rate_limit", "timeout", "temporary_failure"],
      },
    });
    return response.content;
  } catch (error) {
    // Factory handles provider-specific errors automatically
    // You only handle business logic errors
    if (error instanceof NeuroLinkError) {
      console.error("Generation failed:", error.message);
      return null;
    }
    throw error;
  }
}
```

## 🧪 Testing Migration

### Unit Tests for Factory Pattern

```typescript
// test/factory-migration.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NeuroLink, ProviderFactory } from "@juspay/neurolink";

describe("Factory Pattern Migration", () => {
  let neurolink: NeuroLink;
  let factory: ProviderFactory;

  beforeEach(() => {
    neurolink = new NeuroLink({
      providers: {
        openai: { apiKey: "test-key" },
        anthropic: { apiKey: "test-key" },
      },
    });
    factory = neurolink.getProviderFactory();
  });

  it("should create providers consistently", () => {
    const openaiProvider = factory.getProvider("openai");
    const anthropicProvider = factory.getProvider("anthropic");

    expect(openaiProvider.type).toBe("openai");
    expect(anthropicProvider.type).toBe("anthropic");
    expect(openaiProvider.name).toBeDefined();
    expect(anthropicProvider.name).toBeDefined();
  });

  it("should handle provider failures gracefully", async () => {
    // Mock provider failure
    vi.spyOn(factory, "getProvider").mockImplementation((type) => {
      if (type === "openai") {
        throw new Error("Provider unavailable");
      }
      return factory.getProvider("anthropic");
    });

    const result = await neurolink.generate({
      input: { text: "test prompt" },
      provider: "openai", // Will fail and fallback
      fallbackProvider: "anthropic",
    });

    expect(result.provider).toBe("anthropic");
    expect(result.content).toBeDefined();
  });

  it("should maintain provider instances", () => {
    const provider1 = factory.getProvider("openai");
    const provider2 = factory.getProvider("openai");

    // Should return same instance (singleton pattern)
    expect(provider1).toBe(provider2);
  });
});
```

### Integration Tests

```typescript
// test/integration/migration.test.ts
describe("End-to-End Migration", () => {
  it("should handle real provider requests", async () => {
    const neurolink = new NeuroLink({
      providers: {
        openai: { apiKey: process.env.OPENAI_API_KEY },
        anthropic: { apiKey: process.env.ANTHROPIC_API_KEY },
      },
    });

    const prompt = "Write a haiku about coding";

    // Test each provider
    const openaiResult = await neurolink.generate({
      input: { text: prompt },
      provider: "openai",
    });

    const anthropicResult = await neurolink.generate({
      input: { text: prompt },
      provider: "anthropic",
    });

    expect(openaiResult.content).toBeDefined();
    expect(anthropicResult.content).toBeDefined();
    expect(openaiResult.provider).toBe("openai");
    expect(anthropicResult.provider).toBe("anthropic");
  });

  it("should provide analytics data", async () => {
    const neurolink = new NeuroLink({
      analytics: { enabled: true },
    });

    await neurolink.generate({
      input: { text: "test prompt" },
    });

    const analytics = await neurolink.getAnalytics();
    expect(analytics.totalRequests).toBeGreaterThan(0);
    expect(analytics.providers).toBeDefined();
  });
});
```

## 📊 Performance Optimization

### Caching Strategy

```typescript
// Implement smart caching
const neurolink = new NeuroLink({
  factory: {
    enableCaching: true,
    cacheConfig: {
      // Provider instance caching
      providerTTL: 3600000, // 1 hour

      // Response caching
      responseTTL: 300000, // 5 minutes
      maxCacheSize: 1000,

      // Cache key strategy
      keyStrategy: "content-based", // or 'time-based'

      // Cache invalidation
      invalidateOnError: true,
      backgroundRefresh: true,
    },
  },
});
```

### Load Balancing

```typescript
// Configure intelligent load balancing
const config: NeuroLinkConfig = {
  routing: {
    strategy: "adaptive",
    loadBalancing: {
      algorithm: "least_loaded",
      healthWeighting: 0.4,
      latencyWeighting: 0.3,
      costWeighting: 0.3,
    },
    circuitBreaker: {
      failureThreshold: 5,
      timeout: 60000,
      monitoringPeriod: 300000,
    },
  },
};
```

## 🔍 Monitoring and Observability

### Migration Metrics

```typescript
// Track migration success metrics
interface MigrationMetrics {
  beforeMigration: {
    averageResponseTime: number;
    errorRate: number;
    providerUtilization: Record<string, number>;
    maintenanceOverhead: number;
  };
  afterMigration: {
    averageResponseTime: number;
    errorRate: number;
    providerUtilization: Record<string, number>;
    maintenanceOverhead: number;
  };
  improvements: {
    performanceGain: number;
    reliabilityImprovement: number;
    maintainabilityIncrease: number;
    costOptimization: number;
  };
}

class MigrationMonitor {
  trackMetrics(): MigrationMetrics {
    return {
      beforeMigration: this.getBaselineMetrics(),
      afterMigration: this.getCurrentMetrics(),
      improvements: this.calculateImprovements(),
    };
  }

  generateReport(): string {
    const metrics = this.trackMetrics();
    return `
Migration Success Report:
- Performance improved by ${metrics.improvements.performanceGain}%
- Error rate reduced by ${metrics.improvements.reliabilityImprovement}%
- Maintenance overhead reduced by ${metrics.improvements.maintainabilityIncrease}%
- Cost optimized by ${metrics.improvements.costOptimization}%
    `;
  }
}
```

### Logging and Debugging

```typescript
// Enhanced logging for migration
const neurolink = new NeuroLink({
  logging: {
    level: "debug", // during migration
    includeRequestDetails: true,
    includeResponseMetadata: true,
    logProviderSelection: true,
    logFailovers: true,
  },
  debugging: {
    enableTracing: true,
    traceProviderCalls: true,
    trackPerformanceMetrics: true,
  },
});
```

## 🚀 Advanced Migration Patterns

### Gradual Migration Strategy

```typescript
// Phase 1: Parallel execution (comparison mode)
class GradualMigration {
  private legacy: LegacyService;
  private modern: NeuroLink;
  private comparisonMode = true;

  async generate(prompt: string, provider: string) {
    if (this.comparisonMode) {
      // Run both systems and compare
      const [legacyResult, modernResult] = await Promise.allSettled([
        this.legacy.generateText(prompt, provider),
        this.modern.generate({
          input: { text: prompt },
          provider: provider as any,
        }),
      ]);

      // Log comparison results
      this.logComparison(legacyResult, modernResult);

      // Return legacy result during transition
      return legacyResult.status === "fulfilled"
        ? legacyResult.value
        : modernResult.value?.content;
    }

    // Phase 2: Full migration
    return await this.modern.generate({
      input: { text: prompt },
      provider: provider as any,
    });
  }

  private logComparison(legacy: any, modern: any) {
    // Track differences and performance
    console.log("Migration comparison:", {
      legacySuccess: legacy.status === "fulfilled",
      modernSuccess: modern.status === "fulfilled",
      contentSimilarity: this.calculateSimilarity(
        legacy.value,
        modern.value?.content,
      ),
    });
  }
}
```

### Feature Flag Integration

```typescript
// Use feature flags for safe migration
import { FeatureFlag } from "@your-org/feature-flags";

class FeatureFlagMigration {
  private neurolink: NeuroLink;
  private legacy: LegacyService;

  async generate(prompt: string, provider: string, userId: string) {
    const useFactoryPattern = await FeatureFlag.isEnabled(
      "neurolink-factory-pattern",
      userId,
    );

    if (useFactoryPattern) {
      return await this.neurolink.generate({
        input: { text: prompt },
        provider: provider as any,
      });
    }

    return await this.legacy.generateText(prompt, provider);
  }
}
```

## 📋 Migration Checklist

### Pre-Migration

- [ ] Audit existing provider usage patterns
- [ ] Identify all provider instantiation points
- [ ] Document current configuration management
- [ ] Assess error handling strategies
- [ ] Measure baseline performance metrics
- [ ] Plan rollback strategy

### During Migration

- [ ] Install NeuroLink with factory support
- [ ] Configure provider factory settings
- [ ] Refactor provider instantiation code
- [ ] Update configuration management
- [ ] Implement unified error handling
- [ ] Add comprehensive testing
- [ ] Enable monitoring and logging

### Post-Migration

- [ ] Verify all provider functionality
- [ ] Confirm performance improvements
- [ ] Validate error handling behavior
- [ ] Test failover scenarios
- [ ] Monitor production metrics
- [ ] Document new patterns for team
- [ ] Clean up legacy code

### Validation Tests

```typescript
// Comprehensive validation suite
describe("Migration Validation", () => {
  test("All providers are accessible", async () => {
    const providers = ["openai", "anthropic", "google-ai"];
    for (const provider of providers) {
      const result = await neurolink.generate({
        input: { text: "test" },
        provider: provider as any,
      });
      expect(result.content).toBeDefined();
    }
  });

  test("Fallback mechanisms work", async () => {
    // Test with intentionally failed primary provider
    const result = await neurolink.generate({
      input: { text: "test" },
      provider: "unavailable-provider" as any,
      fallbackProvider: "openai",
    });
    expect(result.provider).toBe("openai");
  });

  test("Performance meets requirements", async () => {
    const start = Date.now();
    await neurolink.generate({
      input: { text: "performance test" },
    });
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(5000); // 5 second max
  });
});
```

## 🎯 Success Metrics

### Key Performance Indicators

```typescript
interface MigrationKPIs {
  technical: {
    codeReusability: number; // % of shared code
    maintainabilityIndex: number; // 0-100 scale
    testCoverage: number; // % coverage
    bugReduction: number; // % reduction in bugs
  };
  operational: {
    deploymentFrequency: number; // deployments per week
    leadTime: number; // hours from commit to production
    meanTimeToRecovery: number; // minutes
    changeFailureRate: number; // % of deployments causing issues
  };
  business: {
    developerProductivity: number; // story points per sprint
    timeToMarket: number; // weeks for new features
    customerSatisfaction: number; // NPS score
    operationalCosts: number; // $ monthly
  };
}
```

This comprehensive migration guide ensures a smooth transition to NeuroLink's factory pattern architecture, maximizing the benefits of standardized provider management while minimizing migration risks.

## 📚 Related Documentation

- [System Architecture](architecture.md) - Overall system design
- [Testing Strategy](testing.md) - Quality assurance approaches
- [Contributing Guide](contributing.md) - Development workflow
- [Advanced Patterns](../advanced/factory-patterns.md) - Factory implementation details
