# NeuroLink Factory Patterns - Complete Implementation Guide

## Overview

The NeuroLink Factory Infrastructure provides a comprehensive, domain-agnostic framework for enhancing AI interactions with configurable patterns. This Phase 1 implementation delivers a complete factory system that works seamlessly with any domain (healthcare, finance, analytics, etc.) while maintaining 100% backward compatibility.

## Quick Start

### Basic Domain Enhancement

```typescript
import { DomainConfigurationFactory } from "@juspay/neurolink";

// Enhance any GenerateOptions with domain configuration
const enhancedOptions = DomainConfigurationFactory.enhanceWithDomain(
  {
    input: { text: "Analyze patient vital signs trends" },
    provider: "google-ai",
  },
  {
    domainType: "healthcare",
    validationEnabled: true,
  },
);

// Use with NeuroLink SDK
const sdk = new NeuroLink();
const result = await sdk.generate(enhancedOptions);
```

### Advanced Enhancement Utilities

```typescript
import { OptionsEnhancer } from "@juspay/neurolink";

// Domain configuration enhancement
const domainResult = OptionsEnhancer.enhanceWithDomain(baseOptions, {
  domainType: "analytics",
  validationEnabled: true,
});

// Streaming optimization enhancement
const streamingResult = OptionsEnhancer.enhanceForStreaming(baseOptions, {
  chunkSize: 512,
  enableProgress: true,
});

// Legacy business context migration
const migrationResult = OptionsEnhancer.migrateFromLegacy(
  baseOptions,
  legacyBusinessContext,
  "ecommerce",
);
```

## Core Components

### 1. Domain Configuration Factory

The `DomainConfigurationFactory` provides domain-specific configuration management:

```typescript
// Register custom domain template
DomainConfigurationFactory.registerDomainTemplate({
  templateName: "financial-analysis",
  baseConfig: {
    domainName: "financial-analysis",
    domainDescription: "Expert in financial analysis and reporting",
    keyTerms: ["revenue", "profit", "ROI", "market analysis"],
    failurePatterns: ["insufficient financial data", "incomplete analysis"],
    successPatterns: ["financial insights show", "analysis indicates"],
    evaluationCriteria: {
      relevanceThreshold: 9,
      accuracyThreshold: 10,
      completenessThreshold: 9,
      alertSeverityMapping: {
        low: { relevanceRange: [9, 10], accuracyRange: [10, 10] },
        medium: { relevanceRange: [7, 8], accuracyRange: [8, 9] },
        high: { relevanceRange: [0, 6], accuracyRange: [0, 7] },
      },
    },
    toolPreferences: ["financial_calculator", "market_data_analyzer"],
  },
  requiredFields: ["domainName", "domainDescription", "keyTerms"],
  optionalFields: ["evaluationCriteria", "toolPreferences"],
});

// Use the registered template
const financialConfig = DomainConfigurationFactory.createDomainConfig({
  domainType: "financial-analysis",
  validationEnabled: true,
});
```

### 2. Options Enhancement Utilities

The `OptionsEnhancer` provides intelligent enhancement of `GenerateOptions`:

```typescript
// Enhanced workflow example
const baseOptions = {
  input: { text: "Analyze healthcare compliance requirements" },
  provider: "anthropic",
  model: "claude-3",
};

// Step 1: Apply domain enhancement
const domainEnhanced = OptionsEnhancer.enhanceWithDomain(baseOptions, {
  domainType: "healthcare",
  validationEnabled: true,
});

// Step 2: Apply streaming optimization
const fullyEnhanced = OptionsEnhancer.enhanceForStreaming(
  domainEnhanced.options,
  {
    chunkSize: 256,
    enableProgress: true,
  },
);

// Result includes comprehensive metadata
console.log(fullyEnhanced.metadata);
// {
//   enhancementApplied: true,
//   enhancementType: "streaming-optimization",
//   processingTime: 5,
//   configurationUsed: { chunkSize: 256, enableProgress: true },
//   warnings: [],
//   recommendations: ["Monitor streaming performance..."]
// }
```

### 3. Context Conversion Utilities

The `ContextConverter` provides migration from legacy business contexts:

```typescript
import { ContextConverter } from "@juspay/neurolink";

// Convert legacy business context
const legacyContext = {
  sessionId: "business-session-123",
  userId: "user-456",
  juspayToken: "token-789",
  shopUrl: "https://shop.example.com",
  shopId: "shop-123",
  merchantId: "merchant-456",
  customBusinessData: "legacy-value",
};

const executionContext = ContextConverter.convertBusinessContext(
  legacyContext,
  "ecommerce",
  {
    preserveLegacyFields: true,
    validateDomainData: true,
    includeMetadata: true,
  },
);

// Create clean domain context
const domainContext = ContextConverter.createDomainContext(
  "analytics",
  {
    analyticsEngine: "advanced",
    dataSources: ["database", "api"],
    processingMode: "realtime",
  },
  {
    sessionId: "analytics-session",
    userId: "analyst-user",
  },
);
```

## Integration Examples

### CLI Integration

Factory patterns work seamlessly with the NeuroLink CLI:

```bash
# Basic usage (unchanged)
neurolink generate "Analyze data trends" --provider google-ai

# Enhanced with analytics
neurolink generate "Healthcare analysis" --enable-analytics --evaluation-domain healthcare

# Context integration
neurolink generate "Custom analysis" --context '{"domain":"finance","userId":"analyst123"}'

# Streaming with domain awareness
neurolink stream "Real-time analytics" --enable-evaluation --evaluation-domain analytics
```

### SDK Integration

```typescript
import {
  NeuroLink,
  DomainConfigurationFactory,
  OptionsEnhancer,
} from "@juspay/neurolink";

const sdk = new NeuroLink();

// Method 1: Direct domain enhancement
const result1 = await sdk.generate(
  DomainConfigurationFactory.enhanceWithDomain(
    { input: { text: "Medical diagnosis analysis" } },
    { domainType: "healthcare", validationEnabled: true },
  ),
);

// Method 2: Using OptionsEnhancer workflow
const enhanced = OptionsEnhancer.enhanceWithDomain(
  {
    input: { text: "Financial market trends" },
    enableAnalytics: true,
    enableEvaluation: true,
  },
  { domainType: "analytics", validationEnabled: true },
);

const result2 = await sdk.generate(enhanced.options);

// Method 3: Streaming with factory patterns
const streamResult = await sdk.stream(
  OptionsEnhancer.enhanceForStreaming(
    DomainConfigurationFactory.enhanceWithDomain(
      { input: { text: "Live data processing" } },
      { domainType: "analytics" },
    ),
    { chunkSize: 512, enableProgress: true },
  ).options,
);
```

### Evaluation and Analytics Integration

```typescript
// Enhanced evaluation with domain awareness
const evaluationContext = {
  userQuery: "What are the symptoms of hypertension?",
  aiResponse: "Hypertension symptoms include headaches and dizziness...",
  primaryDomain: "healthcare",
  context: {
    domainType: "healthcare",
    domainConfig: healthcareDomainConfig,
  },
  assistantRole: "healthcare assistant",
};

const evaluation = await generateUnifiedEvaluation(evaluationContext);

// Enhanced analytics with factory metadata
const analytics = createAnalytics(
  "google-ai",
  "gemini-2.5-flash",
  result,
  responseTime,
  {
    domainType: "healthcare",
    enhancementType: "domain-configuration",
    factoryMetadata: {
      enhancementApplied: true,
      processingTime: 5,
    },
  },
);
```

## Domain Configuration Reference

### Pre-registered Domains

#### Healthcare Domain

```typescript
{
  domainName: "healthcare",
  domainDescription: "Healthcare and medical information expert",
  keyTerms: ["healthcare", "medical", "patient", "treatment", "diagnosis", "clinical"],
  failurePatterns: [
    "medical information unavailable",
    "cannot provide medical advice",
    "insufficient patient data"
  ],
  successPatterns: [
    "clinical analysis shows",
    "medical data indicates",
    "patient outcomes demonstrate"
  ],
  evaluationCriteria: {
    relevanceThreshold: 9,
    accuracyThreshold: 10,
    completenessThreshold: 9
  },
  toolPreferences: ["medical_analyzer", "patient_data_processor"]
}
```

#### Analytics Domain

```typescript
{
  domainName: "analytics",
  domainDescription: "Data analytics and business intelligence expert",
  keyTerms: ["analytics", "metrics", "data", "trends", "insights", "performance"],
  failurePatterns: [
    "no data available",
    "insufficient metrics",
    "data incomplete"
  ],
  successPatterns: [
    "analysis shows",
    "data indicates",
    "metrics reveal",
    "trend analysis"
  ],
  evaluationCriteria: {
    relevanceThreshold: 8,
    accuracyThreshold: 9,
    completenessThreshold: 8
  },
  toolPreferences: ["data_analyzer", "metrics_calculator"]
}
```

### Custom Domain Creation

```typescript
// Define custom domain template
const customDomain: DomainTemplate = {
  templateName: "legal-analysis",
  baseConfig: {
    domainName: "legal-analysis",
    domainDescription: "Legal document analysis and compliance expert",
    keyTerms: ["legal", "compliance", "regulation", "contract", "law"],
    failurePatterns: [
      "insufficient legal context",
      "cannot provide legal advice",
    ],
    successPatterns: ["legal analysis indicates", "compliance review shows"],
    evaluationCriteria: {
      relevanceThreshold: 10,
      accuracyThreshold: 10,
      completenessThreshold: 9,
      alertSeverityMapping: {
        low: { relevanceRange: [9, 10], accuracyRange: [10, 10] },
        medium: { relevanceRange: [7, 8], accuracyRange: [8, 9] },
        high: { relevanceRange: [0, 6], accuracyRange: [0, 7] },
      },
    },
    toolPreferences: ["legal_analyzer", "compliance_checker"],
    customRules: {
      disclaimerRequired: true,
      confidentialityLevel: "high",
    },
  },
  requiredFields: ["domainName", "domainDescription", "keyTerms"],
  optionalFields: ["evaluationCriteria", "toolPreferences", "customRules"],
  validationRules: [
    {
      field: "domainName",
      validator: (value) => typeof value === "string" && value.length > 0,
      errorMessage: "Domain name is required",
    },
  ],
};

// Register and use
DomainConfigurationFactory.registerDomainTemplate(customDomain);
const legalOptions = DomainConfigurationFactory.enhanceWithDomain(baseOptions, {
  domainType: "legal-analysis",
  validationEnabled: true,
});
```

## Advanced Usage Patterns

### Batch Enhancement

```typescript
import { batchEnhance } from "@juspay/neurolink";

const enhancements = [
  {
    enhancementType: "domain-configuration" as const,
    domainOptions: { domainType: "healthcare" as const },
  },
  {
    enhancementType: "streaming-optimization" as const,
    streamingOptions: { enabled: true, chunkSize: 256 },
  },
];

const result = batchEnhance(baseOptions, enhancements);
```

### Legacy Migration Workflow

```typescript
// Complete legacy migration example
const legacyBusinessContext = {
  sessionId: "legacy-session-123",
  userId: "business-user-456",
  juspayToken: "legacy-token",
  shopUrl: "https://legacy-shop.com",
  customBusinessField: "legacy-value",
};

// Step 1: Migrate legacy context
const migrationResult = OptionsEnhancer.migrateFromLegacy(
  {
    input: { text: "Analyze business performance" },
    enableAnalytics: true,
    enableEvaluation: true,
  },
  legacyBusinessContext,
  "ecommerce",
);

// Step 2: Optional streaming enhancement
const finalOptions = OptionsEnhancer.enhanceForStreaming(
  migrationResult.options,
  { chunkSize: 512 },
);

// Step 3: Execute with full enhancement metadata
const result = await sdk.generate(finalOptions.options);
```

### Performance Optimization

```typescript
// Monitor enhancement performance
const startTime = Date.now();

const enhanced = OptionsEnhancer.enhanceWithDomain(baseOptions, {
  domainType: "analytics",
  validationEnabled: true,
});

console.log(`Enhancement time: ${enhanced.metadata.processingTime}ms`);

// Track enhancement statistics
const stats = OptionsEnhancer.getStatistics();
console.log(`Total enhancements: ${stats.enhancementCount}`);

// Reset statistics for new session
OptionsEnhancer.resetStatistics();
```

## Error Handling and Validation

### Graceful Degradation

```typescript
try {
  const enhanced = DomainConfigurationFactory.enhanceWithDomain(options, {
    domainType: "custom-domain",
    validationEnabled: true,
  });
} catch (error) {
  // Factory patterns never break core functionality
  console.log("Enhancement failed, using original options");
  const result = await sdk.generate(options);
}
```

### Validation and Warnings

```typescript
const result = OptionsEnhancer.enhance(options, enhancementOptions);

// Check for warnings
if (result.metadata.warnings.length > 0) {
  console.log("Warnings:", result.metadata.warnings);
}

// Check recommendations
if (result.metadata.recommendations.length > 0) {
  console.log("Recommendations:", result.metadata.recommendations);
}
```

## Testing and Quality Assurance

### Test Coverage

The factory infrastructure includes comprehensive test suites:

- **Domain Configuration Tests**: 13 test suites, 50+ tests
- **Integration Tests**: 11 test suites covering all interfaces
- **Streaming Tests**: 11 additional test suites with factory integration
- **CLI Integration Tests**: 14 test suites validating zero breaking changes
- **Evaluation Integration**: 6 test suites with domain-aware evaluation
- **Analytics Integration**: 6 test suites with factory metadata tracking

### Performance Benchmarks

- **Enhancement Processing**: <10ms per operation
- **Memory Overhead**: <5MB additional
- **CLI Startup Time**: No impact (2-3s maintained)
- **Streaming Performance**: <1% overhead
- **Batch Operations**: Linear scaling with minimal overhead

## Migration Guide

### From Legacy Business Context

```typescript
// Before (legacy business-specific code)
const businessContext = {
  juspayToken: "token",
  shopUrl: "https://shop.com",
  // ... other business fields
};

// After (generic domain pattern)
const domainContext = ContextConverter.convertBusinessContext(
  businessContext,
  "ecommerce",
  { preserveLegacyFields: true },
);

const enhanced = DomainConfigurationFactory.enhanceWithDomain(options, {
  domainType: "ecommerce",
});
```

### Adopting Factory Patterns Gradually

1. **Phase 1**: Add optional analytics

   ```typescript
   const result = await sdk.generate({
     ...existingOptions,
     enableAnalytics: true,
   });
   ```

2. **Phase 2**: Add domain awareness

   ```typescript
   const enhanced = DomainConfigurationFactory.enhanceWithDomain(
     existingOptions,
     { domainType: "your-domain" },
   );
   ```

3. **Phase 3**: Full factory workflow
   ```typescript
   const result = OptionsEnhancer.enhanceWithDomain(existingOptions, {
     domainType: "your-domain",
     validationEnabled: true,
   });
   ```

## Best Practices

### Domain Design

1. **Use Descriptive Domain Names**: Choose clear, specific domain names
2. **Define Comprehensive Key Terms**: Include domain-specific terminology
3. **Set Appropriate Thresholds**: Adjust evaluation criteria for domain requirements
4. **Include Tool Preferences**: Specify domain-relevant tools

### Performance Optimization

1. **Cache Domain Configurations**: Reuse domain configs across requests
2. **Monitor Enhancement Time**: Track processing time in production
3. **Use Batch Enhancements**: Combine multiple enhancements efficiently
4. **Enable Analytics Selectively**: Only when needed for performance

### Error Handling

1. **Always Handle Enhancement Failures**: Factory patterns should never break core functionality
2. **Log Enhancement Metadata**: Track enhancement success/failure for monitoring
3. **Use Validation Judiciously**: Enable validation in development, consider disabling in production for performance

## API Reference

### DomainConfigurationFactory

```typescript
class DomainConfigurationFactory {
  static registerDomainTemplate(template: DomainTemplate): void;
  static createDomainConfig(options: DomainConfigOptions): DomainConfig;
  static enhanceWithDomain(
    options: GenerateOptions,
    domainOptions: DomainConfigOptions,
  ): GenerateOptions;
  static getDomainEvaluationCriteria(
    domainType: DomainType,
  ): DomainEvaluationCriteria;
  static getAvailableDomains(): string[];
  static isDomainRegistered(domainType: string): boolean;
}
```

### OptionsEnhancer

```typescript
class OptionsEnhancer {
  static enhance(
    options: GenerateOptions,
    enhancementOptions: EnhancementOptions,
  ): EnhancementResult;
  static enhanceWithDomain(
    options: GenerateOptions,
    domainOptions: DomainConfigOptions,
  ): EnhancementResult;
  static enhanceForStreaming(
    options: GenerateOptions,
    streamingConfig?: StreamingConfig,
  ): EnhancementResult;
  static migrateFromLegacy(
    options: GenerateOptions,
    legacyContext: Record<string, unknown>,
    domainType: string,
  ): EnhancementResult;
  static validateEnhancement(
    options: GenerateOptions,
    enhancementOptions: EnhancementOptions,
  ): ValidationResult;
  static getStatistics(): EnhancementStatistics;
  static resetStatistics(): void;
}
```

### ContextConverter

```typescript
class ContextConverter {
  static convertBusinessContext(
    legacyContext: Record<string, unknown>,
    domainType: string,
    options?: ContextConversionOptions,
  ): ExecutionContext;
  static createDomainContext(
    domainType: string,
    domainData: Record<string, unknown>,
    sessionInfo?: SessionInfo,
  ): ExecutionContext;
}
```

## Conclusion

The NeuroLink Factory Infrastructure provides a comprehensive, production-ready framework for domain-agnostic AI enhancement. With zero breaking changes, extensive test coverage, and flexible enhancement patterns, it enables powerful domain-specific AI interactions while maintaining the simplicity and reliability of the existing NeuroLink SDK.

The factory patterns scale from simple domain configuration to complex multi-enhancement workflows, making them suitable for any application from basic chatbots to enterprise AI systems requiring sophisticated domain expertise and analytics tracking.
