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

// Initialize telemetry with configuration
const telemetry = initializeTelemetry({
  serviceName: "my-ai-application",
  endpoint: "http://localhost:4318",
  enableTracing: true,
  enableMetrics: true,
  enableLogs: true,
  samplingRate: 0.1, // Sample 10% of traces for performance
});

if (telemetry.success) {
  console.log("✅ Telemetry initialized successfully");
  console.log("📊 Tracing enabled:", telemetry.tracingEnabled);
  console.log("📈 Metrics enabled:", telemetry.metricsEnabled);
  console.log("📝 Logs enabled:", telemetry.logsEnabled);
} else {
  console.error("❌ Telemetry initialization failed:", telemetry.error);
}

// Check telemetry status
const status = await getTelemetryStatus();
console.log("Telemetry status:", status);
```

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
   initializeTelemetry({ serviceName: "my-ai-app" });
   ```

5. **View Traces**
   - Open http://localhost:16686
   - Generate some AI requests
   - Search for traces in Jaeger UI

---

## 📚 Additional Resources

- **[API Reference](sdk/api-reference.md)** - Complete telemetry API documentation
- **[Real-time Services](./REAL-TIME-SERVICES.md)** - WebSocket infrastructure guide
- **[Performance Optimization](./PERFORMANCE-OPTIMIZATION.md)** - Optimization strategies

**Ready for enterprise-grade AI monitoring with NeuroLink! 📊**
