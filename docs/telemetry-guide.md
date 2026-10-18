# 📊 Enterprise Telemetry Guide

**Advanced OpenTelemetry Integration for NeuroLink**

## 📋 Overview

NeuroLink includes optional OpenTelemetry integration for enterprise monitoring and observability. The telemetry system provides insights into AI operations, performance metrics, and system health. Nothing is exported until Langfuse keys or an OTLP endpoint are configured, although importing the main package entry, or the `./rag`, `./workflow`, `./evaluation`, `./processors` or `./autoresearch` entry, already loads the OpenTelemetry SDK (see [Initialisation](./features/observability.md#initialisation)).

## 🚀 Key Features

- **✅ Off by Default** - Nothing is exported unless explicitly configured
- **🤖 AI Operation Tracking** - Monitor text generation, token usage, costs, and response times
- **🔧 MCP Tool Monitoring** - Track tool calls, execution time, and success rates
- **📈 Performance Metrics** - Response times and throughput; error counts for proxied traffic
- **🔍 Distributed Tracing** - Full request tracing across AI providers and services
- **📊 Custom Dashboards** - Grafana, Jaeger, and Prometheus integration
- **🎯 Production Ready** - Enterprise-grade monitoring for production deployments

---

## Langfuse Integration

Set `LANGFUSE_PUBLIC_KEY` and `LANGFUSE_SECRET_KEY` and NeuroLink exports every AI operation to [Langfuse](https://langfuse.com/). Pass `observability: { langfuse: false }` to disable. Full input and output are captured by default; use `mask` for sensitive data.

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();
await neurolink.generate({
  input: { text: "Hello" },
  context: { userId: "user-123", sessionId: "session-456", tags: ["support"] },
});
```

If your application already registers an OpenTelemetry `TracerProvider`, NeuroLink creates no provider (and ignores `OTEL_EXPORTER_OTLP_ENDPOINT`, so add an OTLP exporter to your own providers) but registers its Langfuse exporter when keys are configured; add `createExporterSpanProcessor()` to your provider (recommended), or add `new LangfuseSpanProcessor()` from `@langfuse/otel` with its own keys (no custom filter is needed because every NeuroLink observation span carries `gen_ai.observation.type` and infrastructure spans are not exported; NeuroLink's `mask`, chunking and retry do not apply to it). In serverless, call `flushOpenTelemetry()` before exit.

The full guide, including the migration table for removed fields and exports, is [Observability](./features/observability.md).

---

## Basic Setup

### Environment Variables

| Variable                      | Description                                                                                                                                                                                                        | Default                                        |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| `LANGFUSE_PUBLIC_KEY`         | Langfuse public key; with the secret key, enables it                                                                                                                                                               | -                                              |
| `LANGFUSE_SECRET_KEY`         | Langfuse secret key                                                                                                                                                                                                | -                                              |
| `LANGFUSE_BASE_URL`           | Langfuse host                                                                                                                                                                                                      | Langfuse Cloud                                 |
| `LANGFUSE_ENABLED`            | `false`, `0`, `off` or `no` keeps Langfuse off while the keys are in the environment, in the proxy and for options that leave the keys there; `langfuse: true`, `enabled: true` or keys passed in code win over it | -                                              |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP collector base URL for traces and metrics, only when NeuroLink owns the tracer provider (ignored beside a host provider)                                                                                      | -                                              |
| `OTEL_SERVICE_NAME`           | Service name                                                                                                                                                                                                       | `ai-service` (`neurolink-proxy` for the proxy) |
| `NEUROLINK_TELEMETRY_ENABLED` | `true` records NeuroLink's metrics whatever else is set; a registered `MeterProvider` or an OTLP endpoint already turns them on                                                                                    | -                                              |

The metric names, labels and when each one records are in [Metrics](./features/observability.md#metrics).

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

**Provider reuse:** If a global `TracerProvider` is already registered (e.g., by the host application), NeuroLink registers nothing and uses it, avoiding "already registered" errors. `OTEL_EXPORTER_OTLP_ENDPOINT` then still receives the proxy's request logs, but not its traces or metrics, which go to the host's providers.

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
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4318
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
      - "4318:4318" # OTLP HTTP
      - "4317:4317" # OTLP gRPC
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

`OTEL_EXPORTER_OTLP_ENDPOINT` is the collector's base URL: NeuroLink appends `/v1/traces` and `/v1/metrics` itself. Jaeger stores the traces only, so send the metrics to an OpenTelemetry Collector or another backend that accepts OTLP metrics.

---

## 📊 Key Metrics to Track

### AI Operation Metrics

- **Request volume**: `ai_requests_total`, by `provider` and `model`
- **Response time**: `ai_request_duration_ms`, a histogram in milliseconds
- **Token usage**: `ai_tokens_used_total`, total tokens per request
- **Cost tracking**: `ai_cost_usd_total`, for models with known pricing
- **MCP tool calls**: `mcp_tool_calls_total`, by `tool`, `success` and duration bucket

NeuroLink records no AI error-rate or connection metric: `ai_provider_errors_total`, `connections_total` and `response_time_ms` exist as instruments, but nothing in the package records them, and there is no active-connection gauge. For proxied traffic use the proxy's own metrics, such as `proxy_errors_total`; see [Claude Proxy Observability](./features/claude-proxy-observability.md).

### Sample Prometheus Queries

The names below are the metric names NeuroLink creates; through an OTLP-to-Prometheus pipeline the histogram appears as `_bucket`, `_sum` and `_count` series.

```promql
# Average AI request duration (ms) over 5 minutes, by provider
sum by (provider) (rate(ai_request_duration_ms_sum[5m])) / sum by (provider) (rate(ai_request_duration_ms_count[5m]))

# Requests per second by provider and model
sum by (provider, model) (rate(ai_requests_total[5m]))

# Token usage by provider
sum by (provider) (rate(ai_tokens_used_total[5m]))

# Cost per hour by provider (USD)
sum by (provider) (increase(ai_cost_usd_total[1h]))

# Share of MCP tool calls that failed, by tool
sum by (tool) (rate(mcp_tool_calls_total{success="false"}[5m])) / sum by (tool) (rate(mcp_tool_calls_total[5m]))
```

---

## 🚀 Getting Started Checklist

### ✅ Quick Setup (5 minutes)

1. **Set the service name**

   ```bash
   export OTEL_SERVICE_NAME=my-ai-app
   ```

2. **Start Jaeger (Local Development)**

   ```bash
   docker run -d \
     -p 16686:16686 \
     -p 4318:4318 \
     -e COLLECTOR_OTLP_ENABLED=true \
     jaegertracing/all-in-one:latest
   ```

3. **Configure Endpoint** (the base URL; NeuroLink appends `/v1/traces` and `/v1/metrics`)

   ```bash
   export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
   ```

4. **Run your app**

   No initialization call is needed. Tracing starts at `new NeuroLink({ observability })`, at the first `generate`, `stream` or `decide` call, or at the first NeuroLink span; a plain `new NeuroLink()` starts nothing by itself. See [Initialisation](./features/observability.md#initialisation).

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
