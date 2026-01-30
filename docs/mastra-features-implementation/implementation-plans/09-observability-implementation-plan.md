# Observability Integrations Implementation Plan

**Feature**: Mastra-style Multi-Platform Observability System
**Document Version**: 1.0.0
**Created**: January 2026
**Status**: Implementation Plan
**Priority**: High
**Complexity**: High
**Estimated Total Effort**: 8-10 weeks

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Prerequisites and Dependencies](#prerequisites-and-dependencies)
3. [Phase 1: Telemetry Core Interface](#phase-1-telemetry-core-interface)
4. [Phase 2: OpenTelemetry Integration](#phase-2-opentelemetry-integration)
5. [Phase 3: Langfuse Integration](#phase-3-langfuse-integration)
6. [Phase 4: LangSmith Integration](#phase-4-langsmith-integration)
7. [Phase 5: Datadog/Sentry Integration](#phase-5-datadogsentry-integration)
8. [Phase 6: Custom Exporter API](#phase-6-custom-exporter-api)
9. [Phase 7: Dashboard and Metrics](#phase-7-dashboard-and-metrics)
10. [Estimated Effort Per Phase](#estimated-effort-per-phase)
11. [Performance Impact Assessment](#performance-impact-assessment)
12. [Risk Assessment](#risk-assessment)
13. [Success Metrics](#success-metrics)
14. [Appendix: File Structure](#appendix-file-structure)
15. [Platform Comparison Insights](#platform-comparison-insights)
16. [OpenTelemetry GenAI Conventions](#opentelemetry-genai-conventions)
17. [LLM Gateway Patterns](#llm-gateway-patterns)
18. [Cost Tracking Implementation](#cost-tracking-implementation)
19. [Updated Integration Priority](#updated-integration-priority)

---

## Executive Summary

This implementation plan details the phased approach to adding Mastra-style observability integrations to NeuroLink. The goal is to create a unified, extensible observability system that supports multiple platforms while maintaining backward compatibility with the existing OpenTelemetry and Langfuse integrations.

### Key Objectives

1. **Unified Exporter Interface**: Abstract base class for all observability exporters following NeuroLink's factory pattern
2. **Multi-Platform Support**: Langfuse, LangSmith, Datadog, Sentry, Braintrust, Arize, PostHog, Laminar
3. **OpenTelemetry Bridge**: Bidirectional context propagation with OTel for distributed tracing
4. **Flexible Sampling**: Multiple sampling strategies for production workloads (ratio, trace-based, attribute-based)
5. **Token Usage Tracking**: Comprehensive cost and usage analytics across all providers
6. **Zero-Overhead When Disabled**: NO-OP behavior pattern consistent with existing telemetry service

### Current State Analysis

NeuroLink currently has:

- **TelemetryService** (`src/lib/telemetry/telemetryService.ts`): OpenTelemetry-based metrics and tracing
- **Langfuse Integration** (`src/lib/services/server/ai/observability/instrumentation.ts`): Existing Langfuse via OTel
- **TelemetryHandler** (`src/lib/core/modules/TelemetryHandler.ts`): Provider-specific telemetry
- **ObservabilityConfig** (`src/lib/types/observability.ts`): Current config types for Langfuse and OTel

### Current Limitations to Address

1. Single platform focus (Langfuse only fully integrated)
2. No abstraction layer for exporters
3. Limited span types without AI-specific categorization
4. No sampling control (all-or-nothing tracing)
5. Missing platforms (LangSmith, Datadog, Sentry, etc.)

---

## Prerequisites and Dependencies

### Required Before Implementation

#### 1. Technical Prerequisites

| Prerequisite              | Description                                | Status     |
| ------------------------- | ------------------------------------------ | ---------- |
| Node.js 18+               | Required for ES modules and async features | Available  |
| OpenTelemetry SDK         | Base for OTel integration                  | Installed  |
| TypeScript 5.0+           | For advanced type features                 | Available  |
| Existing TelemetryService | Foundation to build upon                   | Production |

#### 2. Package Dependencies (New)

```json
{
  "dependencies": {
    "@opentelemetry/api": "^1.8.0",
    "@opentelemetry/sdk-node": "^0.49.0",
    "@opentelemetry/semantic-conventions": "^1.22.0",
    "langfuse": "^3.0.0",
    "posthog-node": "^4.0.0",
    "@sentry/node": "^8.0.0",
    "nanoid": "^5.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0"
  }
}
```

#### 3. Architectural Prerequisites

- Understanding of NeuroLink's Factory + Registry pattern
- Familiarity with existing TelemetryService implementation
- Knowledge of OpenTelemetry concepts (spans, traces, context propagation)

#### 4. External Service Prerequisites

| Service    | Required For        | Auth Method         |
| ---------- | ------------------- | ------------------- |
| Langfuse   | LLM observability   | Public/Secret keys  |
| LangSmith  | LangChain ecosystem | API key             |
| Datadog    | Enterprise APM      | API key + App key   |
| Sentry     | Error tracking      | DSN                 |
| Braintrust | AI evaluation       | API key             |
| Arize      | ML monitoring       | Space key + API key |
| PostHog    | Product analytics   | API key             |
| Laminar    | LLM tracing         | API key             |

### Dependency Graph

```
Phase 1 (Core Interface)
    │
    ├──> Phase 2 (OpenTelemetry)
    │         │
    │         └──> Phase 3 (Langfuse) ─┬──> Phase 5 (Datadog/Sentry)
    │                                   │
    │         └──> Phase 4 (LangSmith)─┘
    │
    └──> Phase 6 (Custom Exporter API)
              │
              └──> Phase 7 (Dashboard & Metrics)
```

---

## Phase 1: Telemetry Core Interface

**Duration**: 2 weeks
**Priority**: Critical (Foundation)
**Dependencies**: None

### 1.1 Objectives

- Create unified span data types for AI operations
- Implement abstract BaseExporter class
- Build ExporterRegistry for multi-exporter management
- Implement span serialization utilities

### 1.2 Deliverables

#### 1.2.1 Span Types (`src/lib/observability/types/spanTypes.ts`)

```typescript
// AI-specific span type enumeration
export enum SpanType {
  AGENT_RUN = "agent.run",
  WORKFLOW_STEP = "workflow.step",
  TOOL_CALL = "tool.call",
  MODEL_GENERATION = "model.generation",
  EMBEDDING = "embedding",
  RETRIEVAL = "retrieval",
  MEMORY = "memory",
  CUSTOM = "custom",
}

// Standard span status codes
export enum SpanStatus {
  UNSET = 0,
  OK = 1,
  ERROR = 2,
}

// Complete span data structure
export type SpanData = {
  spanId: string;
  traceId: string;
  parentSpanId?: string;
  type: SpanType;
  name: string;
  startTime: string;
  endTime?: string;
  durationMs?: number;
  status: SpanStatus;
  statusMessage?: string;
  attributes: SpanAttributes;
  events: SpanEvent[];
  links: SpanLink[];
};
```

#### 1.2.2 Exporter Types (`src/lib/observability/types/exporterTypes.ts`)

```typescript
export type ExporterConfig = {
  enabled: boolean;
  maxBufferSize?: number;
  flushIntervalMs?: number;
  timeoutMs?: number;
  retries?: number;
  headers?: Record<string, string>;
  environment?: string;
  version?: string;
};

export type ExportResult = {
  success: boolean;
  exportedCount: number;
  failedCount: number;
  errors?: ExportError[];
  durationMs: number;
};

export type ExporterHealthStatus = {
  healthy: boolean;
  name: string;
  latencyMs?: number;
  lastExportTime?: number;
  pendingSpans: number;
  errors?: string[];
};
```

#### 1.2.3 BaseExporter Abstract Class (`src/lib/observability/exporters/baseExporter.ts`)

Key methods:

- `initialize(): Promise<void>`
- `exportSpan(span: SpanData): Promise<ExportResult>`
- `exportBatch(spans: SpanData[]): Promise<ExportResult>`
- `flush(): Promise<void>`
- `shutdown(): Promise<void>`
- `healthCheck(): Promise<ExporterHealthStatus>`

#### 1.2.4 ExporterRegistry (`src/lib/observability/exporterRegistry.ts`)

Key methods:

- `register(exporter: BaseExporter): void`
- `unregister(name: string): boolean`
- `get(name: string): BaseExporter | undefined`
- `exportToAll(span: SpanData): Promise<Map<string, ExportResult>>`
- `initializeAll(): Promise<void>`
- `shutdownAll(): Promise<void>`
- `healthCheckAll(): Promise<Map<string, ExporterHealthStatus>>`

### 1.3 Implementation Tasks

| Task                                  | Effort | Priority |
| ------------------------------------- | ------ | -------- |
| Create span type definitions          | 2 days | Critical |
| Implement SpanAttributes interface    | 1 day  | Critical |
| Create ExporterConfig types           | 1 day  | Critical |
| Implement BaseExporter abstract class | 3 days | Critical |
| Build ExporterRegistry                | 2 days | Critical |
| Implement SpanSerializer utility      | 2 days | High     |
| Write unit tests                      | 3 days | High     |

### 1.4 Acceptance Criteria

- [ ] All span types defined with AI-specific attributes
- [ ] BaseExporter handles buffering and flush intervals
- [ ] ExporterRegistry supports multi-exporter export
- [ ] SpanSerializer can convert to multiple formats
- [ ] 90%+ test coverage for core types
- [ ] NO-OP behavior when disabled (zero overhead)

### 1.5 Files to Create

```
src/lib/observability/
├── types/
│   ├── spanTypes.ts
│   ├── exporterTypes.ts
│   └── index.ts
├── exporters/
│   ├── baseExporter.ts
│   └── index.ts
├── utils/
│   ├── spanSerializer.ts
│   └── index.ts
├── exporterRegistry.ts
└── index.ts
```

---

## Phase 2: OpenTelemetry Integration

**Duration**: 1.5 weeks
**Priority**: High
**Dependencies**: Phase 1 complete

### 2.1 Objectives

- Create OTel-native exporter using OTLP protocol
- Implement bidirectional context propagation bridge
- Support HTTP, gRPC, and Zipkin protocols
- Enable distributed tracing correlation

### 2.2 Deliverables

#### 2.2.1 OtelExporter (`src/lib/observability/exporters/otelExporter.ts`)

```typescript
export type OtelProtocol = "http" | "grpc" | "zipkin";

export type OtelExporterConfig = ExporterConfig & {
  endpoint: string;
  protocol?: OtelProtocol;
  serviceName?: string;
  serviceVersion?: string;
  resourceAttributes?: Record<string, string>;
  compression?: "gzip" | "none";
};
```

Features:

- OTLP/HTTP and OTLP/gRPC protocol support
- Zipkin format compatibility
- Resource attribute propagation
- Gzip compression support

#### 2.2.2 OtelBridge (`src/lib/observability/otelBridge.ts`)

Key methods:

- `extractContext(headers: Record<string, string>): SpanContext | null`
- `injectContext(headers: Record<string, string>): Record<string, string>`
- `createSpanFromOtelContext(spanContext, type, name): SpanData`
- `wrapWithTracing<T>(name, type, fn, onSpanEnd?): Promise<T>`
- `exportToOtel(span: SpanData): void`
- `getCurrentTraceContext(): { traceId, spanId } | null`

### 2.3 Implementation Tasks

| Task                           | Effort | Priority |
| ------------------------------ | ------ | -------- |
| Implement OtelExporter         | 3 days | Critical |
| Add HTTP/OTLP protocol support | 1 day  | Critical |
| Add gRPC protocol support      | 1 day  | High     |
| Add Zipkin protocol support    | 1 day  | Medium   |
| Implement OtelBridge           | 2 days | High     |
| Context propagation tests      | 2 days | High     |

### 2.4 Acceptance Criteria

- [ ] OtelExporter successfully exports to OTLP endpoint
- [ ] W3C trace context propagation works bidirectionally
- [ ] Spans can be converted between NeuroLink and OTel formats
- [ ] Gzip compression reduces payload size by 60%+
- [ ] Integration tests pass with Jaeger/Tempo

### 2.5 Integration Points

```typescript
// Update existing TelemetryService to use new OtelExporter
// src/lib/telemetry/telemetryService.ts

private otelExporter?: OtelExporter;

private async initializeOtelExporter(): Promise<void> {
  if (this.config.openTelemetry?.enabled) {
    this.otelExporter = new OtelExporter({
      enabled: true,
      endpoint: this.config.openTelemetry.endpoint!,
      serviceName: this.config.openTelemetry.serviceName,
      serviceVersion: this.config.openTelemetry.serviceVersion
    });
    await this.otelExporter.initialize();
  }
}
```

---

## Phase 3: Langfuse Integration

**Duration**: 1 week
**Priority**: High
**Dependencies**: Phase 1 complete

### 3.1 Objectives

- Enhance existing Langfuse integration with new exporter interface
- Support trace, span, generation, and score export
- Maintain backward compatibility with current setup
- Add user/session attribution

### 3.2 Deliverables

#### 3.2.1 LangfuseExporter (`src/lib/observability/exporters/langfuseExporter.ts`)

```typescript
export type LangfuseExporterConfig = ExporterConfig & {
  publicKey: string;
  secretKey: string;
  baseUrl?: string;
  release?: string;
};
```

Features:

- Native Langfuse SDK integration
- Automatic trace/generation type detection
- Token usage and cost tracking
- User/session attribution from span attributes
- Batch flushing for performance

#### 3.2.2 Langfuse Span Serialization

```typescript
// SpanSerializer.toLangfuseFormat(span)
{
  id: span.spanId,
  traceId: span.traceId,
  parentObservationId: span.parentSpanId,
  name: span.name,
  startTime: span.startTime,
  endTime: span.endTime,
  metadata: span.attributes,
  level: span.status === SpanStatus.ERROR ? 'ERROR' : 'DEFAULT',
  usage: {
    promptTokens: span.attributes['ai.tokens.input'],
    completionTokens: span.attributes['ai.tokens.output'],
    totalTokens: span.attributes['ai.tokens.total']
  }
}
```

### 3.3 Implementation Tasks

| Task                                | Effort | Priority |
| ----------------------------------- | ------ | -------- |
| Implement LangfuseExporter          | 2 days | Critical |
| Add Langfuse span serialization     | 1 day  | Critical |
| Implement generation type detection | 1 day  | High     |
| Add score export support            | 1 day  | Medium   |
| Migration from existing integration | 1 day  | High     |
| Write integration tests             | 1 day  | High     |

### 3.4 Migration Path

```typescript
// Before: Direct Langfuse usage in instrumentation.ts
const langfuse = new Langfuse({ publicKey, secretKey });

// After: Via ExporterRegistry
const langfuseExporter = new LangfuseExporter({
  enabled: true,
  publicKey,
  secretKey,
});
registry.register(langfuseExporter);
```

### 3.5 Acceptance Criteria

- [ ] Existing Langfuse config continues to work unchanged
- [ ] New LangfuseExporter produces identical traces
- [ ] Generation spans show token usage and cost
- [ ] User/session attribution works correctly
- [ ] Batch flush interval configurable

---

## Phase 4: LangSmith Integration

**Duration**: 1 week
**Priority**: High
**Dependencies**: Phase 1 complete

### 4.1 Objectives

- Implement LangSmith-native exporter for LangChain ecosystem
- Support run creation with proper type mapping
- Enable project-based organization
- Add batch export support

### 4.2 Deliverables

#### 4.2.1 LangSmithExporter (`src/lib/observability/exporters/langsmithExporter.ts`)

```typescript
export type LangSmithExporterConfig = ExporterConfig & {
  apiKey: string;
  projectName?: string;
  endpoint?: string;
};
```

Features:

- LangSmith REST API integration
- Run type mapping (llm, chain, tool, retriever, embedding)
- Project-based run organization
- Batch run creation for performance
- Tag extraction from span attributes

#### 4.2.2 LangSmith Span Serialization

```typescript
// SpanSerializer.toLangSmithFormat(span)
{
  id: span.spanId,
  trace_id: span.traceId,
  parent_run_id: span.parentSpanId,
  name: span.name,
  run_type: mapSpanTypeToLangSmithRunType(span.type),
  start_time: span.startTime,
  end_time: span.endTime,
  extra: span.attributes,
  inputs: span.attributes['input'],
  outputs: span.attributes['output'],
  tags: extractTags(span.attributes)
}
```

### 4.3 Implementation Tasks

| Task                        | Effort | Priority |
| --------------------------- | ------ | -------- |
| Implement LangSmithExporter | 2 days | Critical |
| Add run type mapping        | 1 day  | Critical |
| Implement batch export API  | 1 day  | High     |
| Add LangSmith serialization | 1 day  | High     |
| Write integration tests     | 1 day  | High     |

### 4.4 Run Type Mapping

| SpanType         | LangSmith Run Type |
| ---------------- | ------------------ |
| AGENT_RUN        | chain              |
| WORKFLOW_STEP    | chain              |
| TOOL_CALL        | tool               |
| MODEL_GENERATION | llm                |
| EMBEDDING        | embedding          |
| RETRIEVAL        | retriever          |
| MEMORY           | chain              |
| CUSTOM           | chain              |

### 4.5 Acceptance Criteria

- [ ] Runs appear correctly in LangSmith dashboard
- [ ] Run types map correctly for filtering
- [ ] Batch API reduces network calls by 80%+
- [ ] Tags enable filtering by provider/model/environment
- [ ] Error runs show error message and stack trace

---

## Phase 5: Datadog/Sentry Integration

**Duration**: 1.5 weeks
**Priority**: Medium-High
**Dependencies**: Phase 1 complete

### 5.1 Objectives

- Implement Datadog exporter for enterprise APM integration
- Implement Sentry exporter for error tracking and performance
- Support trace correlation between platforms
- Enable AI-specific custom metrics

### 5.2 Deliverables

#### 5.2.1 DatadogExporter (`src/lib/observability/exporters/datadogExporter.ts`)

```typescript
export type DatadogExporterConfig = ExporterConfig & {
  apiKey: string;
  appKey?: string;
  site?: string; // us1, us3, us5, eu1, ap1
  service?: string;
  source?: string;
};
```

Features:

- Datadog Logs API integration
- Trace correlation via `dd.trace_id` and `dd.span_id`
- AI-specific attributes in log structure
- Custom tag building for faceted search
- Multi-region site support

#### 5.2.2 SentryExporter (`src/lib/observability/exporters/sentryExporter.ts`)

```typescript
export type SentryExporterConfig = ExporterConfig & {
  dsn: string;
  tracesSampleRate?: number;
  profilesSampleRate?: number;
  release?: string;
};
```

Features:

- Sentry SDK integration
- Error span capture as exceptions
- Performance transaction creation
- AI context enrichment
- User context from span attributes

### 5.3 Implementation Tasks

| Task                        | Effort | Priority |
| --------------------------- | ------ | -------- |
| Implement DatadogExporter   | 3 days | High     |
| Add Datadog log formatting  | 1 day  | High     |
| Implement SentryExporter    | 2 days | High     |
| Add Sentry error capture    | 1 day  | High     |
| Implement trace correlation | 1 day  | Medium   |
| Write integration tests     | 2 days | High     |

### 5.4 Datadog Log Format

```typescript
{
  ddsource: 'neurolink-ai',
  ddtags: 'env:production,ai_provider:openai,ai_model:gpt-4o',
  hostname: process.env.HOSTNAME,
  message: 'model.generation: generate_text',
  service: 'my-ai-service',
  status: 'info',
  timestamp: Date.now(),
  dd: {
    trace_id: span.traceId,
    span_id: span.spanId
  },
  ai: {
    provider: 'openai',
    model: 'gpt-4o',
    tokens: { input: 100, output: 50, total: 150 },
    cost: 0.0015,
    duration_ms: 1234
  }
}
```

### 5.5 Acceptance Criteria

- [ ] Datadog logs appear with correct trace correlation
- [ ] Sentry errors show AI context (provider, model, tokens)
- [ ] Performance transactions capture latency correctly
- [ ] Custom facets enable filtering by AI attributes
- [ ] Both exporters handle high volume (1000+ spans/minute)

---

## Phase 6: Custom Exporter API

**Duration**: 1.5 weeks
**Priority**: Medium
**Dependencies**: Phases 1-5 complete

### 6.1 Objectives

- Provide public API for custom exporter development
- Implement additional platform exporters (Braintrust, Arize, PostHog, Laminar)
- Create exporter plugin system
- Document exporter development guide

### 6.2 Deliverables

#### 6.2.1 Additional Exporters

| Exporter           | Platform   | Key Features                         |
| ------------------ | ---------- | ------------------------------------ |
| BraintrustExporter | Braintrust | AI evaluation, scoring, project logs |
| ArizeExporter      | Arize      | ML monitoring, prediction logs       |
| PostHogExporter    | PostHog    | Product analytics, user events       |
| LaminarExporter    | Laminar    | LLM tracing, pipeline tracking       |

#### 6.2.2 Exporter Plugin API

```typescript
// Public API for custom exporters
export type ExporterPlugin = {
  name: string;
  version: string;
  create(config: ExporterConfig): BaseExporter;
};

// Registration
ExporterRegistry.registerPlugin(plugin: ExporterPlugin): void;

// Usage
const customExporter = registry.createFromPlugin('my-exporter', {
  enabled: true,
  customOption: 'value'
});
```

#### 6.2.3 Sampling Strategies

```typescript
// Sampler types
export type Sampler = {
  name: string;
  shouldSample(span: SpanData): boolean;
  getDescription(): string;
};

// Built-in samplers
- AlwaysSampler: 100% sampling
- NeverSampler: 0% sampling
- RatioSampler: Configurable percentage
- TraceIdRatioSampler: Consistent per-trace sampling
- AttributeBasedSampler: Rule-based sampling
- CompositeSampler: Weighted combination
- CustomSampler: User-provided function

// Factory
SamplerFactory.create(config: SamplerConfig): Sampler;
```

### 6.3 Implementation Tasks

| Task                         | Effort | Priority |
| ---------------------------- | ------ | -------- |
| Implement BraintrustExporter | 2 days | Medium   |
| Implement ArizeExporter      | 2 days | Medium   |
| Implement PostHogExporter    | 2 days | Medium   |
| Implement LaminarExporter    | 2 days | Medium   |
| Create plugin API            | 1 day  | Medium   |
| Implement all samplers       | 2 days | High     |
| Write documentation          | 1 day  | Medium   |

### 6.4 Acceptance Criteria

- [ ] All 4 additional exporters functional
- [ ] Plugin API allows third-party exporter creation
- [ ] All sampling strategies work correctly
- [ ] Attribute-based sampling supports complex rules
- [ ] Documentation includes exporter development guide

---

## Phase 7: Dashboard and Metrics

**Duration**: 1.5 weeks
**Priority**: Medium
**Dependencies**: Phases 1-6 complete

### 7.1 Objectives

- Implement TokenTracker for usage analytics
- Create aggregated metrics dashboard data
- Add cost calculation utilities
- Build health monitoring for exporters

### 7.2 Deliverables

#### 7.2.1 TokenTracker (`src/lib/observability/tokenTracker.ts`)

```typescript
export type TokenUsageStats = {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  reasoningTokens: number;
  totalCost: number;
  byProvider: Map<string, ProviderTokenStats>;
  byModel: Map<string, ModelTokenStats>;
  bySpanType: Map<string, number>;
};
```

Features:

- Real-time token aggregation
- Provider/model breakdown
- Cost calculation using model config
- Time-window statistics
- JSON export for dashboards

#### 7.2.2 Metrics Aggregator

```typescript
export type MetricsSnapshot = {
  timestamp: number;
  period: "minute" | "hour" | "day";
  requestCount: number;
  errorCount: number;
  errorRate: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  tokenUsage: TokenUsageStats;
  exporterHealth: Map<string, ExporterHealthStatus>;
};
```

#### 7.2.3 CLI Dashboard Command

```bash
# View real-time observability metrics
neurolink observability status

# Output:
Observability Status
====================
Active Exporters: 3/3 healthy
  - langfuse: healthy (latency: 45ms)
  - datadog: healthy (latency: 23ms)
  - sentry: healthy (latency: 12ms)

Token Usage (last hour):
  Input: 125,432 tokens ($0.12)
  Output: 45,231 tokens ($0.09)
  Total: 170,663 tokens ($0.21)

Top Models:
  1. gpt-4o: 89,234 tokens (52%)
  2. claude-sonnet-4: 45,123 tokens (26%)
  3. gemini-2.5-flash: 36,306 tokens (22%)
```

### 7.3 Implementation Tasks

| Task                                   | Effort | Priority |
| -------------------------------------- | ------ | -------- |
| Implement TokenTracker                 | 2 days | High     |
| Add cost calculation from model config | 1 day  | High     |
| Implement MetricsAggregator            | 2 days | Medium   |
| Build latency percentile calculation   | 1 day  | Medium   |
| Create CLI dashboard command           | 2 days | Medium   |
| Add exporter health monitoring         | 1 day  | High     |
| Write integration tests                | 1 day  | High     |

### 7.4 Acceptance Criteria

- [ ] TokenTracker accurately aggregates usage
- [ ] Cost calculation matches provider pricing
- [ ] Metrics include p50/p95/p99 latencies
- [ ] CLI command shows useful dashboard
- [ ] Health monitoring detects exporter failures

---

## Estimated Effort Per Phase

| Phase     | Description                | Duration     | Team Size | Total Days  |
| --------- | -------------------------- | ------------ | --------- | ----------- |
| 1         | Telemetry Core Interface   | 2 weeks      | 1 dev     | 10 days     |
| 2         | OpenTelemetry Integration  | 1.5 weeks    | 1 dev     | 7.5 days    |
| 3         | Langfuse Integration       | 1 week       | 1 dev     | 5 days      |
| 4         | LangSmith Integration      | 1 week       | 1 dev     | 5 days      |
| 5         | Datadog/Sentry Integration | 1.5 weeks    | 1 dev     | 7.5 days    |
| 6         | Custom Exporter API        | 1.5 weeks    | 1 dev     | 7.5 days    |
| 7         | Dashboard and Metrics      | 1.5 weeks    | 1 dev     | 7.5 days    |
| **Total** |                            | **10 weeks** |           | **50 days** |

### Parallelization Opportunities

With 2 developers, the following can run in parallel:

- Phase 3 (Langfuse) and Phase 4 (LangSmith)
- Phase 5 (Datadog/Sentry) and Phase 6 (Custom Exporter API)

**Optimized Timeline with 2 developers**: 6-7 weeks

### Resource Requirements

| Resource                    | Requirement           |
| --------------------------- | --------------------- |
| Senior TypeScript Developer | 1-2                   |
| Code Review Time            | 20% of implementation |
| QA Testing                  | 15% of implementation |
| Documentation               | 10% of implementation |

---

## Performance Impact Assessment

### 7.1 Baseline Performance (No Observability)

| Metric                    | Value |
| ------------------------- | ----- |
| Generate latency overhead | 0ms   |
| Memory overhead           | 0 MB  |
| CPU overhead              | 0%    |

### 7.2 Expected Performance with Observability Enabled

#### Single Exporter (Langfuse)

| Metric                   | Value   | Notes                 |
| ------------------------ | ------- | --------------------- |
| Span creation overhead   | <0.5ms  | Async, non-blocking   |
| Memory per buffered span | ~2 KB   | JSON serialization    |
| Buffer flush latency     | 10-50ms | Network dependent     |
| CPU overhead             | <1%     | Minimal serialization |

#### Multi-Exporter (3 exporters)

| Metric                   | Value    | Notes                  |
| ------------------------ | -------- | ---------------------- |
| Span creation overhead   | <0.5ms   | Same as single         |
| Memory per buffered span | ~6 KB    | 3x buffer              |
| Buffer flush latency     | 30-150ms | Parallel export        |
| CPU overhead             | <2%      | Parallel serialization |

### 7.3 Mitigation Strategies

#### 7.3.1 Buffering

```typescript
// Default buffer configuration
const DEFAULT_BUFFER_SIZE = 100;
const DEFAULT_FLUSH_INTERVAL_MS = 5000;

// Adaptive buffering based on load
if (currentLoad > highLoadThreshold) {
  bufferSize = Math.min(bufferSize * 2, maxBufferSize);
  flushInterval = Math.min(flushInterval * 1.5, maxFlushInterval);
}
```

#### 7.3.2 Sampling in Production

```typescript
// Recommended production sampling
{
  sampling: {
    type: 'attribute-based',
    rules: [
      // Always sample errors
      { name: 'errors', conditions: { 'error': true }, sample: true, priority: 100 },
      // Always sample expensive models
      { name: 'gpt-4', conditions: { 'ai.model': 'gpt-4o' }, sample: true, priority: 90 },
      // Sample 10% of other requests
    ],
    defaultRatio: 0.1
  }
}
```

#### 7.3.3 Async Export

All exports are async and non-blocking:

```typescript
// Export does not block AI generation
async exportSpan(span: SpanData): Promise<ExportResult> {
  this.bufferSpan(span); // Immediate return
  return { success: true, exportedCount: 0, failedCount: 0, durationMs: 0 };
}

// Flush happens in background
private async backgroundFlush(): Promise<void> {
  const batch = [...this.buffer];
  this.buffer = [];
  await this.exportBatch(batch); // Async, non-blocking
}
```

### 7.4 Benchmarks to Implement

| Benchmark                    | Target         | Method           |
| ---------------------------- | -------------- | ---------------- |
| Span creation time           | <1ms           | Microbenchmark   |
| 1000 spans/second throughput | No degradation | Load test        |
| Memory growth over 1 hour    | <50MB          | Memory profiling |
| Export failure recovery      | <5s            | Chaos testing    |
| Cold start with exporters    | <500ms         | Integration test |

### 7.5 Performance Testing Plan

1. **Microbenchmarks**: Span creation, serialization
2. **Load Testing**: 100-1000 concurrent generations
3. **Memory Profiling**: 1-hour sustained load
4. **Network Simulation**: Latency, packet loss
5. **Chaos Testing**: Exporter failures, timeouts

---

## Risk Assessment

### High Risk

| Risk                                   | Impact | Mitigation                                    |
| -------------------------------------- | ------ | --------------------------------------------- |
| Breaking existing Langfuse integration | High   | Comprehensive migration testing, feature flag |
| Performance degradation in hot path    | High   | Async export, NO-OP when disabled, sampling   |
| Memory leaks from unbounded buffers    | High   | Max buffer size, automatic flush              |

### Medium Risk

| Risk                                    | Impact | Mitigation                        |
| --------------------------------------- | ------ | --------------------------------- |
| Platform API changes                    | Medium | Version pinning, adapter pattern  |
| Authentication failures                 | Medium | Retry logic, circuit breaker      |
| Inconsistent span data across exporters | Medium | Unified serialization, validation |

### Low Risk

| Risk               | Impact | Mitigation                           |
| ------------------ | ------ | ------------------------------------ |
| New exporter bugs  | Low    | Isolated per exporter, health checks |
| Documentation gaps | Low    | Auto-generated API docs              |

---

## Success Metrics

### Functional Metrics

| Metric            | Target        | Measurement                    |
| ----------------- | ------------- | ------------------------------ |
| Exporter count    | 8+ platforms  | Count of implemented exporters |
| API compatibility | 100% backward | Existing tests pass            |
| Test coverage     | 90%+          | Jest coverage report           |

### Performance Metrics

| Metric                   | Target | Measurement       |
| ------------------------ | ------ | ----------------- |
| Span creation overhead   | <1ms   | Microbenchmark    |
| Memory overhead per span | <5KB   | Memory profiling  |
| Export success rate      | >99%   | Health monitoring |
| Export latency p99       | <200ms | Metrics dashboard |

### Adoption Metrics

| Metric                   | Target          | Measurement            |
| ------------------------ | --------------- | ---------------------- |
| Multi-exporter usage     | 30%+ users      | Configuration analysis |
| Sampling adoption        | 50%+ production | Configuration analysis |
| Custom exporter creation | 2+ third-party  | GitHub tracking        |

---

## Appendix: File Structure

### Complete Directory Structure

```
src/lib/observability/
├── types/
│   ├── spanTypes.ts           # SpanData, SpanType, SpanStatus
│   ├── exporterTypes.ts       # ExporterConfig, ExportResult
│   └── index.ts               # Type exports
├── exporters/
│   ├── baseExporter.ts        # Abstract BaseExporter class
│   ├── otelExporter.ts        # OpenTelemetry OTLP exporter
│   ├── langfuseExporter.ts    # Langfuse platform exporter
│   ├── langsmithExporter.ts   # LangSmith platform exporter
│   ├── datadogExporter.ts     # Datadog APM exporter
│   ├── sentryExporter.ts      # Sentry error tracking exporter
│   ├── braintrustExporter.ts  # Braintrust evaluation exporter
│   ├── arizeExporter.ts       # Arize ML monitoring exporter
│   ├── posthogExporter.ts     # PostHog analytics exporter
│   ├── laminarExporter.ts     # Laminar LLM tracing exporter
│   └── index.ts               # Exporter exports
├── sampling/
│   ├── samplers.ts            # All sampler implementations
│   ├── samplerFactory.ts      # Sampler factory
│   └── index.ts               # Sampling exports
├── utils/
│   ├── spanSerializer.ts      # Span format conversion
│   └── index.ts               # Utility exports
├── exporterRegistry.ts        # Multi-exporter registry
├── otelBridge.ts              # OTel context propagation
├── tokenTracker.ts            # Token usage aggregation
├── metricsAggregator.ts       # Metrics and latency tracking
└── index.ts                   # Main observability exports

src/lib/types/
├── observability.ts           # Updated ObservabilityConfig (extend)

src/lib/telemetry/
├── telemetryService.ts        # Update to use new exporters

test/
├── observability/
│   ├── exporters/
│   │   ├── baseExporter.test.ts
│   │   ├── otelExporter.test.ts
│   │   ├── langfuseExporter.test.ts
│   │   ├── langsmithExporter.test.ts
│   │   ├── datadogExporter.test.ts
│   │   └── sentryExporter.test.ts
│   ├── sampling/
│   │   └── samplers.test.ts
│   ├── exporterRegistry.test.ts
│   ├── otelBridge.test.ts
│   └── tokenTracker.test.ts
```

### Integration Points

```typescript
// src/lib/neurolink.ts
import { ExporterRegistry, ObservabilityManager } from "./observability";

export class NeuroLink {
  private observabilityManager?: ObservabilityManager;

  constructor(config: NeuroLinkConfig) {
    if (config.observability) {
      this.observabilityManager = new ObservabilityManager(
        config.observability,
      );
    }
  }

  async exportSpan(span: SpanData): Promise<void> {
    await this.observabilityManager?.exportSpan(span);
  }
}

// src/lib/core/modules/TelemetryHandler.ts
// Update to create SpanData and export via ObservabilityManager
```

---

---

## Platform Comparison Insights

Based on comprehensive research of the LLM observability landscape in 2024-2025, here are key insights for platform selection:

### Langfuse vs LangSmith vs Others

| Criteria           | Langfuse                             | LangSmith           | Datadog              | Braintrust       | Helicone          |
| ------------------ | ------------------------------------ | ------------------- | -------------------- | ---------------- | ----------------- |
| **Best For**       | Self-hosted/data control             | LangChain ecosystem | Enterprise APM users | CI/CD evaluation | Cost optimization |
| **Open Source**    | Yes (MIT)                            | No                  | No                   | No               | Yes               |
| **Self-Hosting**   | Full features                        | Enterprise only     | No                   | No               | Yes               |
| **OTel Support**   | Native (SDK v3)                      | Limited             | Native GenAI         | Via OTel         | Via OTel          |
| **Pricing**        | 50K events free, self-host unlimited | $39/user/mo         | $8/10K requests      | $249/mo          | $39/user/mo       |
| **Agent Support**  | Good                                 | Excellent           | Excellent            | Good             | Basic             |
| **Eval Framework** | Good                                 | Excellent           | Basic                | Excellent        | Basic             |
| **Built-in Cache** | No                                   | No                  | No                   | No               | Yes               |

### Strategic Recommendations

**Primary Integration: Langfuse**

- Open-source, self-hostable (critical for enterprise data control)
- Strong OpenTelemetry support (SDK v3 is OTel-native)
- Good fit for NeuroLink's multi-provider architecture
- ClickHouse acquisition strengthens analytical capabilities
- MIT license aligns with NeuroLink's enterprise positioning

**Secondary Integration: OpenTelemetry Exporter**

- Enables any OTel-compatible backend (Jaeger, Tempo, SigNoz)
- Future-proofs against vendor changes
- CNCF-backed standard

**Tertiary Integration: Datadog**

- For enterprise users already on Datadog platform
- Unified LLM + APM + infrastructure monitoring
- Native GenAI semantic convention support (v1.37+)

**Optional Integrations:**

- **LangSmith**: For teams heavily invested in LangChain
- **Braintrust**: For teams prioritizing CI/CD-integrated evaluations
- **Helicone**: As gateway layer for caching + cost tracking

### When NOT to Use Each Platform

| Platform   | Avoid When                                    |
| ---------- | --------------------------------------------- |
| Langfuse   | Need built-in caching (pair with Helicone)    |
| LangSmith  | Not using LangChain, need self-hosting        |
| Datadog    | LLM-only use case (expensive), startup budget |
| Braintrust | Need self-hosting, basic tracing only         |
| Helicone   | Need deep evaluation features                 |

---

## OpenTelemetry GenAI Conventions

### Latest Standards (2025)

The OpenTelemetry GenAI Observability SIG has established standardized semantic conventions that NeuroLink should adopt:

**URL:** https://opentelemetry.io/docs/specs/semconv/gen-ai/

### Core Semantic Attributes

```typescript
// Recommended attribute names following OTel GenAI conventions
export const GENAI_ATTRIBUTES = {
  // System and model identification
  GEN_AI_SYSTEM: "gen_ai.system", // e.g., 'openai', 'anthropic'
  GEN_AI_REQUEST_MODEL: "gen_ai.request.model",
  GEN_AI_RESPONSE_MODEL: "gen_ai.response.model",

  // Token usage
  GEN_AI_USAGE_INPUT_TOKENS: "gen_ai.usage.input_tokens",
  GEN_AI_USAGE_OUTPUT_TOKENS: "gen_ai.usage.output_tokens",
  GEN_AI_USAGE_TOTAL_TOKENS: "gen_ai.usage.total_tokens",

  // Request parameters
  GEN_AI_REQUEST_TEMPERATURE: "gen_ai.request.temperature",
  GEN_AI_REQUEST_TOP_P: "gen_ai.request.top_p",
  GEN_AI_REQUEST_MAX_TOKENS: "gen_ai.request.max_tokens",
  GEN_AI_REQUEST_STOP_SEQUENCES: "gen_ai.request.stop_sequences",

  // Response metadata
  GEN_AI_RESPONSE_FINISH_REASON: "gen_ai.response.finish_reasons",
  GEN_AI_RESPONSE_ID: "gen_ai.response.id",

  // Tool/function calling
  GEN_AI_TOOL_NAME: "gen_ai.tool.name",
  GEN_AI_TOOL_CALL_ID: "gen_ai.tool.call_id",

  // Prompts and completions (optional, privacy-sensitive)
  GEN_AI_PROMPT: "gen_ai.prompt",
  GEN_AI_COMPLETION: "gen_ai.completion",
} as const;
```

### Agent-Specific Conventions (2025 Development)

The GenAI SIG is actively developing agent-specific conventions based on Google's AI agent white paper:

```typescript
// Agent observability attributes (emerging standard)
export const AGENT_ATTRIBUTES = {
  AGENT_NAME: "gen_ai.agent.name",
  AGENT_STEP_TYPE: "gen_ai.agent.step_type", // 'plan', 'execute', 'reflect'
  AGENT_TOOL_CALLS: "gen_ai.agent.tool_calls",
  AGENT_MEMORY_ACCESS: "gen_ai.agent.memory_access",
  AGENT_REASONING_TRACE: "gen_ai.agent.reasoning_trace",
} as const;
```

### Technology-Specific Extensions

| Provider    | Specific Conventions         |
| ----------- | ---------------------------- |
| OpenAI      | `gen_ai.openai.*` namespace  |
| Azure AI    | `gen_ai.azure.*` namespace   |
| AWS Bedrock | `gen_ai.bedrock.*` namespace |

### Key Projects to Leverage

1. **OpenLLMetry** - Open-source observability for GenAI
   - Hub: LLM gateway with centralized OTel spans
   - MCP server for bridging production telemetry to dev tools
   - GitHub: https://github.com/traceloop/openllmetry

2. **OpenInference** - Instrumentation standard by Arize
   - Framework-agnostic tracing
   - Compatible with Phoenix and other backends

### Implementation Approach

```typescript
// NeuroLink span creation following GenAI conventions
function createGenerationSpan(params: GenerationParams): SpanData {
  return {
    name: `gen_ai.${params.provider}.chat`,
    type: SpanType.MODEL_GENERATION,
    attributes: {
      [GENAI_ATTRIBUTES.GEN_AI_SYSTEM]: params.provider,
      [GENAI_ATTRIBUTES.GEN_AI_REQUEST_MODEL]: params.model,
      [GENAI_ATTRIBUTES.GEN_AI_REQUEST_TEMPERATURE]: params.temperature,
      [GENAI_ATTRIBUTES.GEN_AI_REQUEST_MAX_TOKENS]: params.maxTokens,
      // ... additional attributes
    },
    // ...
  };
}
```

---

## LLM Gateway Patterns

### Gateway Architecture Overview

Based on research, LLM gateways are becoming central to observability strategy:

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
│  (NeuroLink SDK/CLI, User Applications)                     │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                   LLM Gateway Layer                          │
│  - Unified API across providers                              │
│  - Intelligent routing (latency, cost, health)               │
│  - Automatic fallbacks                                       │
│  - Semantic caching                                          │
│  - Rate limiting                                             │
│  - Centralized observability                                 │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┬───────────────┐
         ▼               ▼               ▼               ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   OpenAI    │  │  Anthropic  │  │   Bedrock   │  │   Vertex    │
└─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘
```

### Top Gateway Options (2025)

| Gateway        | Key Strength                        | Performance              | Integration Style      |
| -------------- | ----------------------------------- | ------------------------ | ---------------------- |
| **Helicone**   | Rust-based, high performance        | 8ms P50 latency          | Proxy (baseURL change) |
| **LiteLLM**    | 100+ models, comprehensive          | Python SDK + proxy       | SDK or proxy           |
| **Portkey**    | 100+ models, built-in observability | Comprehensive            | SDK or proxy           |
| **Bifrost**    | Fastest gateway                     | ~11μs overhead at 5K RPS | Proxy                  |
| **OpenRouter** | Managed, simple                     | Good                     | Proxy                  |

### Gateway + Observability Pattern

**Recommended Architecture:**

```typescript
// Pattern 1: Gateway for operations, Observability for quality
// Helicone (Gateway) + Langfuse (Observability)

const openai = new OpenAI({
  baseURL: "https://oai.helicone.ai/v1",
  defaultHeaders: {
    "Helicone-Auth": `Bearer ${process.env.HELICONE_API_KEY}`,
    // Pass Langfuse trace ID for correlation
    "Helicone-Property-TraceId": langfuseTraceId,
  },
});

// Helicone handles: caching, cost tracking, routing, fallbacks
// Langfuse handles: evaluations, prompt management, quality metrics
```

### NeuroLink Gateway Integration

Given NeuroLink already has multi-provider support, consider:

**Option A: Integrate with External Gateway**

- Use Helicone or LiteLLM as proxy layer
- NeuroLink provides SDK-level tracing to observability platforms
- Gateway handles operational concerns (caching, routing)

**Option B: Build Gateway Capabilities into NeuroLink**

- Add caching layer (semantic caching)
- Add cost-based routing
- Add automatic fallbacks (already exists via ModelRouter)
- Add rate limiting (already exists via HTTPRateLimiter)

**Recommendation:** Hybrid approach

1. Document integration with Helicone/LiteLLM for users who want gateway features
2. Enhance NeuroLink's existing routing/failover for native experience
3. Ensure observability works with or without gateway layer

### Gateway Observability Hooks

```typescript
// Interface for gateway observability integration
type GatewayObservabilityHooks = {
  onRequest(request: GatewayRequest): void;
  onResponse(response: GatewayResponse): void;
  onCacheHit(cacheKey: string, savedTokens: number): void;
  onFallback(
    originalProvider: string,
    fallbackProvider: string,
    reason: string,
  ): void;
  onRateLimit(provider: string, waitTime: number): void;
};

// Example implementation
class NeuroLinkGatewayObserver implements GatewayObservabilityHooks {
  constructor(private exporterRegistry: ExporterRegistry) {}

  onCacheHit(cacheKey: string, savedTokens: number): void {
    this.exporterRegistry.exportEvent({
      type: "cache.hit",
      attributes: {
        "cache.key": cacheKey,
        "cache.saved_tokens": savedTokens,
        "cache.cost_savings": this.calculateCostSavings(savedTokens),
      },
    });
  }

  onFallback(original: string, fallback: string, reason: string): void {
    this.exporterRegistry.exportEvent({
      type: "gateway.fallback",
      attributes: {
        "gateway.original_provider": original,
        "gateway.fallback_provider": fallback,
        "gateway.fallback_reason": reason,
      },
    });
  }
}
```

---

## Cost Tracking Implementation

### Why Cost Tracking is Critical

- **Token is the primary unit of cost** - all LLM costs derive from token usage
- **Attribution is the primary challenge** - who/what incurred the cost?
- **Optimization potential: 30-90%** - significant savings through intelligent management
- **Enterprise requirement** - showback/chargeback for multi-team organizations

### Key Metrics to Track

| Metric Category | Metrics                                 | Purpose            |
| --------------- | --------------------------------------- | ------------------ |
| **Usage**       | Tokens per request, by provider/model   | Benchmark patterns |
| **Cost**        | Cost per request, per user/team/feature | Attribution        |
| **Efficiency**  | Cache hit ratio, wasted tokens          | Optimization       |
| **Anomalies**   | Cost spikes, unusual patterns           | Detection          |
| **Quality**     | Cost per successful completion          | ROI measurement    |

### Cost Tracking Architecture

```typescript
// src/lib/observability/cost/costTracker.ts

export type CostTrackingConfig = {
  // Attribution dimensions
  attributionKeys: string[]; // ['userId', 'teamId', 'feature', 'environment']

  // Budget management
  budgetAlerts: BudgetAlert[];

  // Pricing configuration
  pricingSource: "builtin" | "custom" | "helicone";
  pricingOverrides?: Record<string, ModelPricing>;

  // Aggregation
  aggregationWindow: "minute" | "hour" | "day";
  retentionDays: number;
};

export type ModelPricing = {
  inputPricePerMillion: number; // $ per million input tokens
  outputPricePerMillion: number; // $ per million output tokens
  cachedInputPricePerMillion?: number; // For providers with cache pricing
};

export type CostEntry = {
  timestamp: Date;
  traceId: string;
  spanId: string;

  // Model info
  provider: string;
  model: string;

  // Token usage
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens?: number;
  reasoningTokens?: number;

  // Calculated cost
  inputCost: number;
  outputCost: number;
  totalCost: number;

  // Attribution
  attributions: Record<string, string>; // userId, teamId, feature, etc.
};
```

### Built-in Pricing Database

```typescript
// src/lib/observability/cost/modelPricing.ts

export const MODEL_PRICING: Record<string, ModelPricing> = {
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

  // Anthropic
  "claude-sonnet-4-20250514": {
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

  // Continue for all supported models...
};
```

### Cost Attribution Implementation

```typescript
// Cost attribution middleware
export class CostAttributionMiddleware {
  constructor(
    private costTracker: CostTracker,
    private config: CostTrackingConfig,
  ) {}

  // Middleware hook for generation completion
  async onGenerationComplete(
    span: SpanData,
    usage: TokenUsage,
    attributions: Record<string, string>,
  ): Promise<void> {
    const model = span.attributes["gen_ai.request.model"] as string;
    const provider = span.attributes["gen_ai.system"] as string;

    const pricing = this.getPricing(model);

    const costEntry: CostEntry = {
      timestamp: new Date(),
      traceId: span.traceId,
      spanId: span.spanId,
      provider,
      model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      cachedInputTokens: usage.cachedInputTokens,
      reasoningTokens: usage.reasoningTokens,
      inputCost: this.calculateInputCost(usage, pricing),
      outputCost: this.calculateOutputCost(usage, pricing),
      totalCost: this.calculateTotalCost(usage, pricing),
      attributions,
    };

    await this.costTracker.recordCost(costEntry);
    await this.checkBudgetAlerts(costEntry, attributions);
  }

  private calculateInputCost(usage: TokenUsage, pricing: ModelPricing): number {
    const regularInputTokens =
      usage.inputTokens - (usage.cachedInputTokens || 0);
    const regularCost =
      (regularInputTokens / 1_000_000) * pricing.inputPricePerMillion;
    const cachedCost =
      ((usage.cachedInputTokens || 0) / 1_000_000) *
      (pricing.cachedInputPricePerMillion || pricing.inputPricePerMillion);
    return regularCost + cachedCost;
  }
}
```

### Budget Alerts

```typescript
export type BudgetAlert = {
  name: string;
  dimension: string; // 'userId', 'teamId', 'feature', or 'total'
  dimensionValue?: string; // Specific value, or undefined for all
  threshold: number; // In dollars
  period: "hour" | "day" | "week" | "month";
  action: "notify" | "warn" | "throttle" | "block";
};

// Example configuration
const budgetAlerts: BudgetAlert[] = [
  // Global daily limit
  {
    name: "Daily Global Limit",
    dimension: "total",
    threshold: 1000,
    period: "day",
    action: "notify",
  },
  // Per-user limit
  {
    name: "User Daily Limit",
    dimension: "userId",
    threshold: 50,
    period: "day",
    action: "throttle",
  },
  // Expensive model alert
  {
    name: "GPT-4 Usage Alert",
    dimension: "model",
    dimensionValue: "gpt-4o",
    threshold: 100,
    period: "day",
    action: "warn",
  },
];
```

### Cost Optimization Strategies to Enable

| Strategy                | Implementation             | Expected Savings |
| ----------------------- | -------------------------- | ---------------- |
| **Caching**             | Semantic cache integration | 15-30%           |
| **Model routing**       | Cost-based model selection | 20-50%           |
| **Prompt optimization** | Token usage analytics      | 10-30%           |
| **Batch processing**    | Request batching           | 10-20%           |

---

## Updated Integration Priority

Based on research findings and NeuroLink's architecture, here is the updated integration priority:

### Priority 1: Core Infrastructure (Weeks 1-3)

| Component                      | Rationale                              | Dependencies     |
| ------------------------------ | -------------------------------------- | ---------------- |
| **Telemetry Core Interface**   | Foundation for all exporters           | None             |
| **OpenTelemetry Integration**  | Industry standard, enables any backend | Core Interface   |
| **GenAI Semantic Conventions** | Future-proof, interoperability         | OTel Integration |

### Priority 2: Primary Platform (Weeks 4-5)

| Component                | Rationale                               | Dependencies   |
| ------------------------ | --------------------------------------- | -------------- |
| **Langfuse Integration** | Open-source, self-hostable, OTel-native | Core Interface |
| **Cost Tracking Core**   | Essential for enterprise                | Core Interface |
| **Token Attribution**    | Required for showback/chargeback        | Cost Tracking  |

### Priority 3: Enterprise Platforms (Weeks 6-7)

| Component               | Rationale                     | Dependencies   |
| ----------------------- | ----------------------------- | -------------- |
| **Datadog Integration** | Large enterprise install base | Core Interface |
| **Sentry Integration**  | Error tracking complement     | Core Interface |
| **Budget Alerts**       | Cost governance               | Cost Tracking  |

### Priority 4: Evaluation & Quality (Week 8)

| Component                 | Rationale                | Dependencies     |
| ------------------------- | ------------------------ | ---------------- |
| **LangSmith Integration** | LangChain ecosystem      | Core Interface   |
| **Evaluation Hooks**      | Quality monitoring       | Core Interface   |
| **Human Feedback API**    | Quality improvement loop | Evaluation Hooks |

### Priority 5: Advanced Features (Weeks 9-10)

| Component                       | Rationale                  | Dependencies   |
| ------------------------------- | -------------------------- | -------------- |
| **Custom Exporter API**         | Extensibility              | All exporters  |
| **Sampling Strategies**         | Production optimization    | Core Interface |
| **Gateway Observability Hooks** | For Helicone/LiteLLM users | Core Interface |
| **Dashboard & CLI**             | User visibility            | All components |

### Deprioritized (Future Releases)

| Component                     | Rationale                              |
| ----------------------------- | -------------------------------------- |
| **Braintrust Integration**    | Smaller user base, CI/CD focus         |
| **Arize/Phoenix Integration** | ML-focused, less relevant for LLM-only |
| **PostHog Integration**       | Product analytics, not LLM-specific    |
| **Laminar Integration**       | Smaller market presence                |
| **W&B Weave Integration**     | ML-focused platform                    |

### Integration with NeuroLink's Error Handling

Based on the error handling evolution research, observability should integrate with:

1. **Error Classification**
   - Export errors with `ErrorCategory` and `ErrorSeverity`
   - Include error codes from `ERROR_CODES` constant
   - Preserve context from `NeuroLinkError.context`

2. **Retry Tracking**
   - Record retry attempts in spans
   - Track circuit breaker state changes
   - Monitor rate limiter behavior

3. **HTTP Error Correlation**
   - Leverage `HTTPRetryHandler` error classification
   - Track `isRetryableHTTPError` decisions
   - Export `Retry-After` header parsing results

```typescript
// Integration example with existing error handling
async function exportWithErrorContext(
  span: SpanData,
  error?: NeuroLinkError,
): Promise<void> {
  if (error) {
    span.status = SpanStatus.ERROR;
    span.attributes["error.code"] = error.code;
    span.attributes["error.category"] = error.category;
    span.attributes["error.severity"] = error.severity;
    span.attributes["error.retriable"] = error.retriable;
    span.attributes["error.context"] = JSON.stringify(error.context);
  }

  await exporterRegistry.exportToAll(span);
}
```

---

## Document History

| Version | Date         | Author         | Changes                                                                                                                                                      |
| ------- | ------------ | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1.0.0   | January 2026 | NeuroLink Team | Initial implementation plan                                                                                                                                  |
| 1.1.0   | January 2026 | NeuroLink Team | Added research-based sections: Platform Comparison, OTel GenAI Conventions, LLM Gateway Patterns, Cost Tracking Implementation, Updated Integration Priority |

---

**Next Steps**:

1. Review and approve implementation plan
2. Create feature branch: `feature/observability-v2`
3. Begin Phase 1 implementation
4. Schedule weekly progress reviews
