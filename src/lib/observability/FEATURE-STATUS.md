# Observability - Status

**Completion:** Beta (Stream token counts and memory trace hierarchy pending verification)
**Last Updated:** March 9, 2026

## Exporters (9/9)

- Langfuse
- LangSmith
- Datadog
- Sentry
- Braintrust
- Arize
- PostHog
- Laminar
- OTel (OpenTelemetry)

## Core Components

| Component          | Status   | Notes                                                                                           |
| ------------------ | -------- | ----------------------------------------------------------------------------------------------- |
| ExporterRegistry   | Complete | Circuit breaker protection, multi-exporter support                                              |
| OtelBridge         | Complete | Bidirectional context propagation                                                               |
| TokenTracker       | Complete | Multi-provider pricing, custom pricing support                                                  |
| MetricsAggregator  | Complete | Full percentile support (p50, p75, p90, p95, p99)                                               |
| SpanSerializer     | Complete | Langfuse, LangSmith, OTel format conversion                                                     |
| Samplers (9 types) | Complete | Always, Never, Ratio, TraceIdRatio, AttributeBased, Priority, ErrorOnly, Composite, Custom      |
| SpanProcessor      | Complete | 7 processors: PassThrough, AttributeEnrichment, Filter, Redaction, Truncation, Composite, Batch |
| RetryPolicy        | Complete | 5 policies: Exponential, Linear, Fixed, NoRetry, CircuitBreakerAware + RetryExecutor            |
| CLI Commands       | Complete | status, metrics, exporters, costs subcommands                                                   |
| Tests              | Complete | 100+ test cases across unit and integration                                                     |

## Sampler Types

1. **AlwaysSampler** - Samples 100% of spans
2. **NeverSampler** - Samples 0% of spans
3. **RatioSampler** - Probabilistic sampling by ratio
4. **TraceIdRatioSampler** - Consistent sampling per trace
5. **AttributeBasedSampler** - Rule-based sampling with priorities
6. **PrioritySampler** - Always sample errors and high-priority span types
7. **ErrorOnlySampler** - Only sample error spans
8. **CompositeSampler** - Weighted combination of multiple samplers
9. **CustomSampler** - User-provided sampling function

## Span Processor Types

1. **PassThroughProcessor** - Passes spans unchanged
2. **AttributeEnrichmentProcessor** - Adds static/dynamic attributes
3. **FilterProcessor** - Drops spans based on predicates
4. **RedactionProcessor** - Removes sensitive data from spans
5. **TruncationProcessor** - Truncates large attribute values
6. **CompositeProcessor** - Chains multiple processors together
7. **BatchProcessor** - Collects spans for batch processing

## Retry Policy Types

1. **ExponentialBackoffPolicy** - Delay increases exponentially (2^n)
2. **LinearBackoffPolicy** - Delay increases linearly
3. **FixedDelayPolicy** - Same delay for all retries
4. **NoRetryPolicy** - Never retries
5. **CircuitBreakerAwarePolicy** - Integrates with circuit breaker state

## Architecture

### Span Processing Pipeline

```
Span Creation → SpanProcessor(s) → Sampler → Exporter(s)
                     ↓                           ↓
              Enrichment/Filter          RetryPolicy + CircuitBreaker
```

### Retry Strategy

The `BaseExporter` abstract class provides basic retry via `withRetry()`. For advanced scenarios, use the `RetryExecutor` with configurable policies:

```typescript
import { RetryExecutor, RetryPolicyFactory } from "neurolink/observability";

const executor = new RetryExecutor(
  RetryPolicyFactory.createWithCircuitBreaker(),
);

await executor.execute(() => exporter.exportBatch(spans), "export-batch");
```

### Span Processing

Use `SpanProcessorFactory` for pre-configured pipelines:

```typescript
import { SpanProcessorFactory } from "neurolink/observability";

const pipeline = SpanProcessorFactory.createProductionPipeline({
  serviceName: "my-service",
  environment: "production",
});

const processedSpan = pipeline.process(span);
```

## Pattern Compliance

**Score:** 100/100

### Compliant Patterns

- Factory + Registry pattern (ExporterRegistry)
- Abstract base class pattern (BaseExporter, BaseRetryPolicy)
- Singleton pattern (global registry, token tracker, metrics aggregator)
- Strategy pattern (Sampler interface, RetryPolicy interface, SpanProcessor interface)
- Builder pattern (SpanSerializer helpers, SpanProcessorFactory)
- Composite pattern (CompositeProcessor, CompositeSampler)
- Circuit breaker pattern (ExporterRegistry, CircuitBreakerAwarePolicy)
- Chain of responsibility pattern (SpanProcessor pipeline)

## Files

```
src/lib/observability/
├── index.ts                    # Main exports
├── exporterRegistry.ts         # Multi-exporter management
├── otelBridge.ts               # OpenTelemetry bridge
├── tokenTracker.ts             # Token usage and cost tracking
├── metricsAggregator.ts        # Metrics with percentiles
├── spanProcessor.ts            # Span processing pipeline (NEW)
├── retryPolicy.ts              # Configurable retry strategies (NEW)
├── FEATURE-STATUS.md           # This file
├── exporters/
│   ├── index.ts
│   ├── baseExporter.ts         # Abstract base class
│   ├── langfuseExporter.ts
│   ├── langsmithExporter.ts
│   ├── datadogExporter.ts
│   ├── sentryExporter.ts
│   ├── braintrustExporter.ts
│   ├── arizeExporter.ts
│   ├── posthogExporter.ts
│   ├── laminarExporter.ts
│   └── otelExporter.ts
├── sampling/
│   ├── index.ts
│   └── samplers.ts             # 9 sampler implementations
├── types/
│   ├── index.ts
│   ├── exporterTypes.ts
│   └── spanTypes.ts
└── utils/
    ├── index.ts
    └── spanSerializer.ts
```

## CLI Commands

```bash
# Status overview
neurolink observability status

# Metrics summary
neurolink observability metrics
neurolink obs metrics --detailed

# List exporters
neurolink observability exporters
neurolink obs exp --format json

# Cost breakdown
neurolink observability costs
neurolink obs costs --by-model --by-provider
```

## Usage Example

```typescript
import {
  ExporterRegistry,
  LangfuseExporter,
  OtelExporter,
  RatioSampler,
  SpanProcessorFactory,
  RetryPolicyFactory,
  RetryExecutor,
  SpanSerializer,
  SpanType,
} from "neurolink/observability";

// Create exporters
const langfuse = new LangfuseExporter({
  enabled: true,
  publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
  secretKey: process.env.LANGFUSE_SECRET_KEY!,
});

const otel = new OtelExporter({
  enabled: true,
  endpoint: "https://otel-collector.example.com",
});

// Setup registry with sampling
const registry = new ExporterRegistry();
registry.register(langfuse);
registry.register(otel);
registry.setSampler(new RatioSampler(0.1)); // 10% sampling

// Create span processor pipeline
const processor = SpanProcessorFactory.createProductionPipeline({
  serviceName: "my-ai-service",
  environment: "production",
});

// Create retry executor for resilience
const retryExecutor = new RetryExecutor(
  RetryPolicyFactory.createWithCircuitBreaker({
    failureThreshold: 5,
    resetTimeoutMs: 30000,
  }),
);

// Initialize
await registry.initializeAll();

// Create and export spans
const span = SpanSerializer.createGenerationSpan({
  provider: "openai",
  model: "gpt-4o",
  userId: "user-123",
});

// ... perform AI operation ...

const endedSpan = SpanSerializer.endSpan(span);

// Process span before export
const processedSpan = processor.process(endedSpan);

if (processedSpan) {
  // Export with retry
  await retryExecutor.execute(
    () => registry.exportToAll(processedSpan),
    "export-span",
  );
}
```

## Migration from 91% to 100%

### New Components Added (January 31, 2026)

1. **SpanProcessor** (`spanProcessor.ts`)
   - Fills the SpanProcessor gap identified in pattern compliance
   - 7 processor types for different use cases
   - Factory for production/development pipelines

2. **RetryPolicy** (`retryPolicy.ts`)
   - Addresses "more sophisticated retry policies" gap
   - 5 policy types with full configuration
   - Circuit breaker integration
   - RetryExecutor for easy usage

### Breaking Changes

None - all new components are additive.

### Recommended Upgrades

For production deployments, consider upgrading to use:

1. `SpanProcessorFactory.createProductionPipeline()` for automatic redaction and enrichment
2. `RetryPolicyFactory.createWithCircuitBreaker()` for resilient exports
