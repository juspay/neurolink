---
title: Monitoring & Observability Guide
description: Production monitoring with Prometheus, Grafana, CloudWatch for AI applications
keywords: monitoring, observability, prometheus, grafana, cloudwatch, metrics, alerts
---

# Monitoring & Observability Guide

**Comprehensive monitoring for AI applications with Prometheus, Grafana, and cloud-native tools**

---

## Overview

Production AI applications require robust monitoring to track performance, costs, errors, and usage patterns. This guide covers implementing comprehensive observability using industry-standard tools and cloud-native services.

### Key Metrics to Track

- **📊 Request Metrics**: Count, rate, latency percentiles
- **💰 Cost Tracking**: Token usage, per-model costs
- **❌ Error Rates**: Failures, rate limits, timeouts
- **⚡ Performance**: Latency, throughput, queue depth
- **🎯 Model Usage**: Distribution across providers/models
- **👥 User Analytics**: Per-user costs, quotas

### Monitoring Stack

- **Prometheus**: Metrics collection and storage
- **Grafana**: Visualization and dashboards
- **CloudWatch**: AWS-native monitoring
- **Application Insights**: Azure monitoring
- **Cloud Logging**: Google Cloud logging

---

## Quick Start

### 1. Setup Prometheus

```bash
# Docker Compose setup
cat > docker-compose.yml <<EOF
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    volumes:
      - grafana-data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin

volumes:
  prometheus-data:
  grafana-data:
EOF

# Start services
docker-compose up -d
```

### 2. Configure Prometheus

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: "neurolink-api"
    static_configs:
      - targets: ["localhost:3001"] # Your API metrics endpoint
```

### 3. Add Metrics to Application

```bash
npm install prom-client
```

```typescript
// metrics.ts
import { Registry, Counter, Histogram, Gauge } from "prom-client";

export const register = new Registry();

// Request counters
export const aiRequestsTotal = new Counter({
  name: "ai_requests_total",
  help: "Total AI requests",
  labelNames: ["provider", "model", "status"],
  registers: [register],
});

// Latency histogram
export const aiRequestDuration = new Histogram({
  name: "ai_request_duration_seconds",
  help: "AI request duration in seconds",
  labelNames: ["provider", "model"],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [register],
});

// Token usage counter
export const aiTokensUsed = new Counter({
  name: "ai_tokens_used_total",
  help: "Total tokens consumed",
  labelNames: ["provider", "model", "type"],
  registers: [register],
});

// Cost tracking
export const aiCostTotal = new Counter({
  name: "ai_cost_total_usd",
  help: "Total AI cost in USD",
  labelNames: ["provider", "model"],
  registers: [register],
});

// Active requests gauge
export const aiRequestsActive = new Gauge({
  name: "ai_requests_active",
  help: "Currently active AI requests",
  labelNames: ["provider"],
  registers: [register],
});

// Error counter
export const aiErrorsTotal = new Counter({
  name: "ai_errors_total",
  help: "Total AI request errors",
  labelNames: ["provider", "model", "error_type"],
  registers: [register],
});
```

### 4. Instrument NeuroLink

```typescript
// app.ts
import { NeuroLink } from "@juspay/neurolink";
import {
  register,
  aiRequestsTotal,
  aiRequestDuration,
  aiTokensUsed,
  aiCostTotal,
  aiRequestsActive,
  aiErrorsTotal,
} from "./metrics";

const ai = new NeuroLink({
  providers: [
    { name: "openai", config: { apiKey: process.env.OPENAI_API_KEY } },
    { name: "anthropic", config: { apiKey: process.env.ANTHROPIC_API_KEY } },
  ],
  onRequest: (req) => {
    aiRequestsActive.inc({ provider: req.provider });
  },
  onSuccess: (result) => {
    // Record request
    aiRequestsTotal.inc({
      provider: result.provider,
      model: result.model,
      status: "success",
    });

    // Record latency
    aiRequestDuration.observe(
      { provider: result.provider, model: result.model },
      result.latency / 1000, // Convert ms to seconds
    );

    // Record tokens
    aiTokensUsed.inc(
      { provider: result.provider, model: result.model, type: "input" },
      result.usage.promptTokens,
    );
    aiTokensUsed.inc(
      { provider: result.provider, model: result.model, type: "output" },
      result.usage.completionTokens,
    );

    // Record cost
    aiCostTotal.inc(
      { provider: result.provider, model: result.model },
      result.cost,
    );

    // Decrement active
    aiRequestsActive.dec({ provider: result.provider });
  },
  onError: (error, provider, model) => {
    // Record error
    aiErrorsTotal.inc({
      provider,
      model: model || "unknown",
      error_type: error.message.includes("rate limit")
        ? "rate_limit"
        : error.message.includes("timeout")
          ? "timeout"
          : "other",
    });

    // Record failed request
    aiRequestsTotal.inc({
      provider,
      model: model || "unknown",
      status: "error",
    });

    // Decrement active
    aiRequestsActive.dec({ provider });
  },
});

// Metrics endpoint
app.get("/metrics", async (req, res) => {
  res.setHeader("Content-Type", register.contentType);
  res.send(await register.metrics());
});
```

---

## Grafana Dashboards

### Create Dashboard

```json
{
  "dashboard": {
    "title": "NeuroLink Monitoring",
    "panels": [
      {
        "title": "Requests Per Second",
        "targets": [
          {
            "expr": "rate(ai_requests_total[5m])",
            "legendFormat": "{{provider}} - {{model}}"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Average Latency",
        "targets": [
          {
            "expr": "rate(ai_request_duration_seconds_sum[5m]) / rate(ai_request_duration_seconds_count[5m])",
            "legendFormat": "{{provider}} - {{model}}"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(ai_errors_total[5m])",
            "legendFormat": "{{provider}} - {{error_type}}"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Hourly Cost",
        "targets": [
          {
            "expr": "rate(ai_cost_total_usd[1h]) * 3600",
            "legendFormat": "{{provider}}"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Token Usage",
        "targets": [
          {
            "expr": "rate(ai_tokens_used_total[5m])",
            "legendFormat": "{{provider}} - {{type}}"
          }
        ],
        "type": "graph"
      }
    ]
  }
}
```

### Key Dashboard Panels

**1. Request Rate**

```promql
rate(ai_requests_total[5m])
```

**2. P95 Latency**

```promql
histogram_quantile(0.95, rate(ai_request_duration_seconds_bucket[5m]))
```

**3. Success Rate**

```promql
sum(rate(ai_requests_total{status="success"}[5m])) / sum(rate(ai_requests_total[5m])) * 100
```

**4. Cost Per Hour**

```promql
rate(ai_cost_total_usd[1h]) * 3600
```

**5. Tokens Per Request**

```promql
rate(ai_tokens_used_total[5m]) / rate(ai_requests_total[5m])
```

---

## Cloud-Native Monitoring

### AWS CloudWatch

```typescript
import { CloudWatch } from "@aws-sdk/client-cloudwatch";

const cloudwatch = new CloudWatch({ region: "us-east-1" });

async function publishMetrics(result: any) {
  await cloudwatch.putMetricData({
    Namespace: "NeuroLink/AI",
    MetricData: [
      {
        MetricName: "Requests",
        Value: 1,
        Unit: "Count",
        Dimensions: [
          { Name: "Provider", Value: result.provider },
          { Name: "Model", Value: result.model },
        ],
        Timestamp: new Date(),
      },
      {
        MetricName: "Latency",
        Value: result.latency,
        Unit: "Milliseconds",
        Dimensions: [{ Name: "Provider", Value: result.provider }],
        Timestamp: new Date(),
      },
      {
        MetricName: "TokensUsed",
        Value: result.usage.totalTokens,
        Unit: "Count",
        Dimensions: [
          { Name: "Provider", Value: result.provider },
          { Name: "Model", Value: result.model },
        ],
        Timestamp: new Date(),
      },
      {
        MetricName: "Cost",
        Value: result.cost,
        Unit: "None",
        Dimensions: [{ Name: "Provider", Value: result.provider }],
        Timestamp: new Date(),
      },
    ],
  });
}

const ai = new NeuroLink({
  providers: [
    /* ... */
  ],
  onSuccess: async (result) => {
    await publishMetrics(result);
  },
});
```

### Azure Application Insights

```typescript
import { ApplicationInsights } from "@azure/monitor-opentelemetry";

const appInsights = new ApplicationInsights({
  connectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING,
});

appInsights.start();

const ai = new NeuroLink({
  providers: [
    /* ... */
  ],
  onSuccess: (result) => {
    appInsights.trackEvent({
      name: "AI_Request",
      properties: {
        provider: result.provider,
        model: result.model,
        tokens: result.usage.totalTokens,
        cost: result.cost,
      },
      measurements: {
        latency: result.latency,
        tokensUsed: result.usage.totalTokens,
        cost: result.cost,
      },
    });

    appInsights.trackMetric({
      name: "AI_Latency",
      value: result.latency,
      properties: { provider: result.provider },
    });
  },
  onError: (error, provider) => {
    appInsights.trackException({
      exception: error,
      properties: { provider },
    });
  },
});
```

### Google Cloud Operations

```typescript
import { Logging } from "@google-cloud/logging";
import { MetricServiceClient } from "@google-cloud/monitoring";

const logging = new Logging();
const log = logging.log("neurolink-requests");

const metrics = new MetricServiceClient();

const ai = new NeuroLink({
  providers: [
    /* ... */
  ],
  onSuccess: async (result) => {
    // Log to Cloud Logging
    await log.write(
      log.entry(
        {
          resource: { type: "global" },
          severity: "INFO",
        },
        {
          event: "ai_request",
          provider: result.provider,
          model: result.model,
          tokens: result.usage.totalTokens,
          latency: result.latency,
          cost: result.cost,
        },
      ),
    );

    // Send to Cloud Monitoring
    await metrics.createTimeSeries({
      name: metrics.projectPath(process.env.GCP_PROJECT_ID!),
      timeSeries: [
        {
          metric: {
            type: "custom.googleapis.com/neurolink/latency",
            labels: { provider: result.provider },
          },
          resource: { type: "global" },
          points: [
            {
              interval: { endTime: { seconds: Date.now() / 1000 } },
              value: { doubleValue: result.latency },
            },
          ],
        },
      ],
    });
  },
});
```

---

## Alerting

### Prometheus Alerts

```yaml
# alerts.yml
groups:
  - name: neurolink_alerts
    interval: 30s
    rules:
      # High error rate
      - alert: HighAIErrorRate
        expr: rate(ai_errors_total[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High AI error rate detected"
          description: "Error rate is {{ $value }} errors/sec for {{ $labels.provider }}"

      # High latency
      - alert: HighAILatency
        expr: histogram_quantile(0.95, rate(ai_request_duration_seconds_bucket[5m])) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High AI latency detected"
          description: "P95 latency is {{ $value }}s for {{ $labels.provider }}"

      # High cost
      - alert: HighAICost
        expr: rate(ai_cost_total_usd[1h]) * 3600 > 100
        for: 15m
        labels:
          severity: critical
        annotations:
          summary: "High AI costs detected"
          description: "Hourly cost is ${{ $value }}"

      # Provider down
      - alert: AIProviderDown
        expr: up{job="neurolink-api"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "AI provider is down"
          description: "{{ $labels.instance }} has been down for 2 minutes"
```

### Alertmanager Configuration

```yaml
# alertmanager.yml
global:
  slack_api_url: "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

route:
  group_by: ["alertname", "provider"]
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: "slack-notifications"

receivers:
  - name: "slack-notifications"
    slack_configs:
      - channel: "#ai-alerts"
        title: "{{ .GroupLabels.alertname }}"
        text: "{{ range .Alerts }}{{ .Annotations.description }}{{ end }}"

  - name: "pagerduty"
    pagerduty_configs:
      - service_key: "YOUR_PAGERDUTY_KEY"
```

---

## Custom Monitoring Dashboards

### Real-Time Cost Dashboard

```typescript
class CostDashboard {
  private costs = new Map<string, number>();
  private hourlySnapshot: number[] = [];

  recordCost(provider: string, cost: number) {
    const current = this.costs.get(provider) || 0;
    this.costs.set(provider, current + cost);
  }

  takeHourlySnapshot() {
    const total = Array.from(this.costs.values()).reduce(
      (sum, cost) => sum + cost,
      0,
    );

    this.hourlySnapshot.push(total);

    // Keep last 24 hours
    if (this.hourlySnapshot.length > 24) {
      this.hourlySnapshot.shift();
    }
  }

  getDashboardData() {
    return {
      totalToday: Array.from(this.costs.values()).reduce(
        (sum, cost) => sum + cost,
        0,
      ),
      byProvider: Object.fromEntries(this.costs),
      hourlyTrend: this.hourlySnapshot,
      projectedMonthly: this.hourlySnapshot.reduce((a, b) => a + b, 0) * 30,
    };
  }
}

// Usage
const dashboard = new CostDashboard();

const ai = new NeuroLink({
  providers: [
    /* ... */
  ],
  onSuccess: (result) => {
    dashboard.recordCost(result.provider, result.cost);
  },
});

// Snapshot every hour
setInterval(() => dashboard.takeHourlySnapshot(), 3600000);

// API endpoint
app.get("/dashboard/costs", (req, res) => {
  res.json(dashboard.getDashboardData());
});
```

---

## Best Practices

### 1. ✅ Track All Key Metrics

```typescript
// ✅ Good: Comprehensive tracking
onSuccess: (result) => {
  metrics.recordLatency(result.latency);
  metrics.recordTokens(result.usage.totalTokens);
  metrics.recordCost(result.cost);
  metrics.recordProvider(result.provider);
};
```

### 2. ✅ Set Up Alerts

```yaml
# ✅ Good: Proactive alerting
- alert: HighCosts
  expr: rate(ai_cost_total_usd[1h]) * 3600 > 100
```

### 3. ✅ Use Histograms for Latency

```typescript
// ✅ Good: Percentile tracking
const latencyHistogram = new Histogram({
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
});
```

### 4. ✅ Monitor Error Rates

```typescript
// ✅ Good: Error categorization
aiErrorsTotal.inc({
  provider,
  error_type: categorizeError(error),
});
```

### 5. ✅ Dashboard for Stakeholders

```typescript
// ✅ Good: Business-friendly dashboard
app.get("/dashboard/summary", (req, res) => {
  res.json({
    requestsToday: getRequestCount(),
    costToday: getTotalCost(),
    avgLatency: getAvgLatency(),
    errorRate: getErrorRate(),
  });
});
```

---

## Related Documentation

**Feature Guides:**

- **[Auto Evaluation](../../features/auto-evaluation.md)** - Automated quality scoring and metrics export
- **[Provider Orchestration](../../features/provider-orchestration.md)** - Intelligent routing decisions to monitor
- **[Redis Conversation Export](../../features/conversation-history.md)** - Export session data for analysis

**Enterprise Guides:**

- **[Cost Optimization](./cost-optimization.md)** - Reduce AI costs
- **[Multi-Provider Failover](./multi-provider-failover.md)** - High availability
- **[Audit Trails](./audit-trails.md)** - Compliance logging
- **[Compliance](./compliance.md)** - Security and compliance

---

## Additional Resources

- **[Prometheus Docs](https://prometheus.io/docs/)** - Prometheus documentation
- **[Grafana Docs](https://grafana.com/docs/)** - Grafana documentation
- **[CloudWatch Docs](https://docs.aws.amazon.com/cloudwatch/)** - AWS CloudWatch
- **[Application Insights](https://docs.microsoft.com/azure/azure-monitor/)** - Azure monitoring

---

**Need Help?** Join our [GitHub Discussions](https://github.com/juspay/neurolink/discussions) or open an [issue](https://github.com/juspay/neurolink/issues).
