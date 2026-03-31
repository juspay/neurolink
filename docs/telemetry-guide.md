# 📊 Enterprise Telemetry Guide

**Advanced OpenTelemetry Integration for NeuroLink**

## 📋 Overview

NeuroLink includes optional OpenTelemetry integration for enterprise monitoring and observability. The telemetry system provides comprehensive insights into AI operations, performance metrics, and system health with **zero overhead when disabled**.

## 🚀 Key Features

- **✅ Zero Overhead by Default** - Telemetry disabled unless explicitly configured
- **🤖 AI Operation Tracking** - Monitor text generation, token usage, costs, and response times
- **🔧 MCP Tool Monitoring** - Track tool calls, execution time, and success rates
- **📈 Performance Metrics** - Response times, error rates, throughput monitoring
- **🔍 Distributed Tracing** - Full request tracing across AI providers and services
- **📊 Custom Dashboards** - Grafana, Jaeger, and Prometheus integration
- **🎯 Production Ready** - Enterprise-grade monitoring for production deployments

---

## 🎯 Langfuse Integration

NeuroLink provides native integration with [Langfuse](https://langfuse.com/) for LLM-specific observability.

### Quick Setup

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink({
  observability: {
    langfuse: {
      enabled: true,
      publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
      secretKey: process.env.LANGFUSE_SECRET_KEY!,
      baseUrl: "https://cloud.langfuse.com", // or self-hosted URL
      environment: "production",
      release: "1.0.0",
    },
  },
});
```

### Context Enrichment

Add user, session, and custom metadata to your traces:

```typescript
import { setLangfuseContext, getLangfuseContext } from "@juspay/neurolink";

// Set context with all available fields
await setLangfuseContext({
  userId: "user-123",
  sessionId: "session-456",
  conversationId: "conv-789",
  requestId: "req-abc",
  traceName: "customer-support-chat",
  metadata: {
    feature: "support",
    tier: "premium",
    region: "us-east-1",
  },
});

// Read current context
const context = getLangfuseContext();
console.log(context?.conversationId);
```

### Custom Spans

Create your own spans for detailed tracing:

```typescript
import { getTracer, setLangfuseContext } from "@juspay/neurolink";

const tracer = getTracer("my-app");

await setLangfuseContext({ userId: "user-123" }, async () => {
  const span = tracer.startSpan("process-request");
  try {
    const result = await neurolink.generate("Hello");
    span.setAttribute("tokens.total", result.usage?.totalTokens);
    return result;
  } finally {
    span.end();
  }
});
```

### External TracerProvider Mode

If your application already has OpenTelemetry instrumentation, use external provider mode:

```typescript
import { NeuroLink, getSpanProcessors } from "@juspay/neurolink";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";

// Initialize NeuroLink without creating its own TracerProvider
const neurolink = new NeuroLink({
  observability: {
    langfuse: {
      enabled: true,
      publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
      secretKey: process.env.LANGFUSE_SECRET_KEY!,
      useExternalTracerProvider: true, // Don't create TracerProvider
    },
  },
});

// Create your existing exporter wrapped in BatchSpanProcessor
const exporter = new OTLPTraceExporter({
  url: "http://localhost:4318/v1/traces",
});

// Add NeuroLink's processors to your existing OTEL setup
const sdk = new NodeSDK({
  spanProcessors: [
    new BatchSpanProcessor(exporter),
    ...getSpanProcessors(), // [ContextEnricher, LangfuseSpanProcessor]
  ],
});
sdk.start();
```

### Vercel AI SDK Integration

NeuroLink automatically captures GenAI semantic convention attributes from Vercel AI SDK:

```typescript
import { generateText } from "ai";
import { setLangfuseContext } from "@juspay/neurolink";

await setLangfuseContext({ userId: "user-123" }, async () => {
  const result = await generateText({
    model: openai("gpt-4"),
    prompt: "Hello",
    experimental_telemetry: { isEnabled: true },
  });
  // Token usage and model info automatically captured
});
```

---

## 🔧 Basic Setup

### Environment Configuration

```bash
# Enable telemetry
NEUROLINK_TELEMETRY_ENABLED=true

# OpenTelemetry endpoint (Jaeger, OTLP collector, etc.)
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318

# Service identification
OTEL_SERVICE_NAME=my-ai-application
OTEL_SERVICE_VERSION=1.0.0

# Optional: Resource attributes
OTEL_RESOURCE_ATTRIBUTES="service.name=my-ai-app,service.version=1.0.0,deployment.environment=production"

# Optional: Sampling configuration
OTEL_TRACES_SAMPLER=traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1  # Sample 10% of traces
```

### Programmatic Initialization

```typescript
import { initializeTelemetry, getTelemetryStatus } from "@juspay/neurolink";

// Configuration is done via environment variables:
// NEUROLINK_TELEMETRY_ENABLED=true
// OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
// OTEL_SERVICE_NAME=my-ai-application
// OTEL_SERVICE_VERSION=1.0.0

// Initialize telemetry (reads from environment variables)
const success = await initializeTelemetry();
// Returns: Promise<boolean>

if (success) {
  console.log("Telemetry initialized successfully");
}

// Check telemetry status
const status = await getTelemetryStatus();
// Returns: { enabled: boolean, initialized: boolean, endpoint?: string, service?: string, version?: string }

console.log("Telemetry enabled:", status.enabled);
console.log("Endpoint:", status.endpoint);
```

### Environment Variables

| Variable                      | Description              | Default        |
| ----------------------------- | ------------------------ | -------------- |
| `NEUROLINK_TELEMETRY_ENABLED` | Enable/disable telemetry | `false`        |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP endpoint URL        | -              |
| `OTEL_SERVICE_NAME`           | Service name             | `neurolink-ai` |
| `OTEL_SERVICE_VERSION`        | Service version          | `3.0.1`        |

---

## 🔭 Proxy Telemetry (OTLP Triple-Signal Export)

When running the NeuroLink proxy (`neurolink proxy start`), OpenTelemetry is automatically initialized. If `OTEL_EXPORTER_OTLP_ENDPOINT` is set, the proxy exports three signal types via OTLP HTTP:

| Signal  | Endpoint                                  | What it captures                                                   |
| ------- | ----------------------------------------- | ------------------------------------------------------------------ |
| Traces  | `$OTEL_EXPORTER_OTLP_ENDPOINT/v1/traces`  | Per-request spans: receive → account selection → upstream → stream |
| Metrics | `$OTEL_EXPORTER_OTLP_ENDPOINT/v1/metrics` | Request counters, latency histograms, token usage gauges           |
| Logs    | `$OTEL_EXPORTER_OTLP_ENDPOINT/v1/logs`    | Structured request log records with traceId/spanId correlation     |

**Configuration:** Set `OTEL_EXPORTER_OTLP_ENDPOINT` (e.g., `http://localhost:4318`) before starting the proxy. The proxy defaults to `service.name=neurolink-proxy`.

**Trace correlation:** Every JSONL request log entry includes `traceId` and `spanId` fields, enabling cross-signal correlation in backends like Jaeger, Grafana Tempo, or OpenObserve.

**Caller trace linkage:** When a calling SDK already has an active trace, NeuroLink forwards W3C `traceparent`/`tracestate` headers and `x-neurolink-session-id` / `x-neurolink-user-id` / `x-neurolink-conversation-id` headers into the proxy so proxy spans can attach to the caller trace and preserve session-level attribution.

**TelemetryService reuse:** If a global `TracerProvider` is already registered (e.g., by the host application), `TelemetryService` will reuse it instead of creating a duplicate — avoiding "already registered" errors.

**OpenObserve dashboard:** The maintained proxy dashboard definition lives in `docs/assets/dashboards/neurolink-proxy-observability-dashboard.json`. For how to read that dashboard and which streams it should use, see [Claude Proxy Observability](./features/claude-proxy-observability.md).

### Local OpenObserve Setup For The Proxy

For a new local setup, use the repo-owned files in `scripts/observability/` so the proxy dashboard does not depend on the Curator repo.

1. Optional: copy `scripts/observability/proxy-observability.env.example` to `scripts/observability/proxy-observability.env` if the default ports or credentials clash with your machine.
2. Start OpenObserve, start the OTEL collector, and import the dashboard:

```bash
neurolink proxy telemetry setup
```

3. Start the proxy with the collector endpoint printed by the setup script. With the defaults, that is:

```bash
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

4. Open the UI at `http://localhost:5080` and sign in with the configured OpenObserve credentials.

Useful follow-up commands:

```bash
neurolink proxy telemetry start
neurolink proxy telemetry stop
neurolink proxy telemetry status
neurolink proxy telemetry logs
neurolink proxy telemetry import-dashboard
```

When you are working from a local checkout instead of an installed CLI, `pnpm run proxy:observability:*` provides the same actions as repo shortcuts.

What is machine-specific:

- OpenObserve URL, credentials, ports, container names, and volume names
- Compose project name if you intentionally run more than one local stack
- Dashboard IDs and owners generated by OpenObserve when the dashboard is imported

The dashboard import helper strips `dashboardId`, `owner`, and `created` from the checked-in JSON before it calls the OpenObserve API, so those metadata fields do not need manual editing on a fresh machine.

What is not machine-specific:

- The dashboard query logic
- The active streams `neurolink_proxy` and `proxy_*`
- The proxy OTEL service name `neurolink-proxy`
- The proxy log fields used for trace correlation and token analysis

### Proxy Log Conventions In OpenObserve

- Final request-summary rows are exported to the `neurolink_proxy` log stream and are the rows dashboard request panels should use.
- Raw body captures share that same log stream with `event.name=proxy.body_capture`, so log-backed request panels should filter to request-summary rows, for example `http_method IS NOT NULL`.
- Per-upstream-attempt diagnostics stay local in `~/.neurolink/logs/proxy-attempts-*.jsonl`; they are useful for debugging retries but are intentionally not part of the main dashboard counts.
- Additional proxy OTEL metrics may appear when relevant traffic exists, including model-substitution counters and response-body histograms alongside the cache, request, retry, duration, and cost metrics already used by the dashboard.

---

## 🐳 Production Deployment

### Docker Compose with Jaeger

```yaml
# docker-compose.yml
version: "3.8"
services:
  my-ai-app:
    build: .
    environment:
      - NEUROLINK_TELEMETRY_ENABLED=true
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:14268/api/traces
      - OTEL_SERVICE_NAME=my-ai-application
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      - jaeger
    ports:
      - "3000:3000"

  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686" # Jaeger UI
      - "14268:14268" # OTLP HTTP
      - "14250:14250" # OTLP gRPC
    environment:
      - COLLECTOR_OTLP_ENABLED=true
      - LOG_LEVEL=debug

  # Optional: Prometheus for metrics
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  # Optional: Grafana for dashboards
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-storage:/var/lib/grafana

volumes:
  grafana-storage:
```

---

## 📊 Key Metrics to Track

### AI Operation Metrics

- **Response Time**: Time to generate AI responses
- **Token Usage**: Input/output tokens by provider and model
- **Cost Tracking**: Estimated costs per operation
- **Error Rates**: Failed AI requests by provider
- **Provider Performance**: Success rates and latency by provider

### Sample Prometheus Queries

```promql
# Average AI response time over 5 minutes
rate(neurolink_ai_duration_sum[5m]) / rate(neurolink_ai_duration_count[5m])

# Token usage by provider
sum by (provider) (rate(neurolink_tokens_total[5m]))

# Error rate percentage
rate(neurolink_errors_total[5m]) / rate(neurolink_requests_total[5m]) * 100

# Cost per hour by provider
sum by (provider) (rate(neurolink_cost_total[1h]))

# Active WebSocket connections
neurolink_websocket_connections_active
```

---

## 🚀 Getting Started Checklist

### ✅ Quick Setup (5 minutes)

1. **Enable Telemetry**

   ```bash
   export NEUROLINK_TELEMETRY_ENABLED=true
   export OTEL_SERVICE_NAME=my-ai-app
   ```

2. **Start Jaeger (Local Development)**

   ```bash
   docker run -d \
     -p 16686:16686 \
     -p 14268:14268 \
     jaegertracing/all-in-one:latest
   ```

3. **Configure Endpoint**

   ```bash
   export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:14268/api/traces
   ```

4. **Initialize in Code**

   ```typescript
   import { initializeTelemetry } from "@juspay/neurolink";
   await initializeTelemetry();
   ```

5. **View Traces**
   - Open http://localhost:16686
   - Generate some AI requests
   - Search for traces in Jaeger UI

---

## 📚 Additional Resources

- **[API Reference](sdk/api-reference.md)** - Complete telemetry API documentation
- **[Real-time Services](./real-time-services.md)** - WebSocket infrastructure guide
- **[Performance Optimization](./performance-optimization.md)** - Optimization strategies

**Ready for enterprise-grade AI monitoring with NeuroLink! 📊**
