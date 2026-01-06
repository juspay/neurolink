---
title: Multi-Region Deployment Guide
description: Global AI deployment with optimal latency, compliance, and disaster recovery
keywords: multi-region, global deployment, latency optimization, disaster recovery, geo-routing
---

# Multi-Region Deployment Guide

**Deploy AI applications globally with optimal latency, compliance, and reliability**

---

## Overview

Multi-region deployment distributes your AI application across geographic locations to minimize latency for global users, meet data residency requirements, and ensure high availability. This guide covers architecture patterns, routing strategies, and production deployment.

### Key Benefits

- **⚡ Lower Latency**: Serve users from nearest region (50-200ms improvement)
- **🌍 Data Residency**: Meet GDPR/compliance requirements
- **🔒 High Availability**: Failover between regions
- **📊 Load Distribution**: Balance traffic globally
- **💰 Cost Optimization**: Use cheapest region per location
- **🚀 Performance**: Parallel processing across regions

### Typical Latency Improvements

```
Single Region (US-East):
- US East users:    50ms   ✅
- US West users:    80ms   ⚠️
- EU users:         150ms  ❌
- Asia users:       250ms  ❌

Multi-Region:
- US East users:    50ms   ✅ (us-east-1)
- US West users:    45ms   ✅ (us-west-2)
- EU users:         35ms   ✅ (eu-west-1)
- Asia users:       40ms   ✅ (ap-southeast-1)
```

---

## Quick Start

### Basic Multi-Region Setup

```typescript
import { NeuroLink } from "@juspay/neurolink";

const ai = new NeuroLink({
  providers: [
    // US East
    {
      name: "openai-us-east",
      region: "us-east-1",
      priority: 1,
      config: { apiKey: process.env.OPENAI_KEY },
      condition: (req) => req.userRegion === "us-east",
    },

    // US West
    {
      name: "openai-us-west",
      region: "us-west-2",
      priority: 1,
      config: { apiKey: process.env.OPENAI_KEY },
      condition: (req) => req.userRegion === "us-west",
    },

    // Europe
    {
      name: "mistral-eu",
      region: "eu-west-1",
      priority: 1,
      config: { apiKey: process.env.MISTRAL_KEY },
      condition: (req) => req.userRegion === "eu",
    },

    // Asia Pacific
    {
      name: "vertex-asia",
      region: "asia-southeast1",
      priority: 1,
      config: {
        projectId: process.env.GCP_PROJECT_ID,
        location: "asia-southeast1",
      },
      condition: (req) => req.userRegion === "asia",
    },

    // Global fallback
    {
      name: "openai-global",
      region: "us-east-1",
      priority: 2,
    },
  ],
});

// Detect user region and route accordingly
const result = await ai.generate({
  input: { text: "Your prompt" },
  metadata: {
    userRegion: detectRegion(req.ip), // us-east, us-west, eu, asia
  },
});

console.log(`Routed to: ${result.provider} in ${result.region}`);
```

---

## Region Detection

### IP-Based Geolocation

```typescript
import geoip from "geoip-lite";

type RegionInfo = {
  region: string;
  country: string;
  city: string;
  latitude: number;
  longitude: number;
};

function detectRegion(ip: string): string {
  const geo = geoip.lookup(ip);

  if (!geo) return "us-east"; // Default fallback

  // Map country to region
  const countryToRegion: Record<string, string> = {
    // North America
    US: getNearestUSRegion(geo.ll[0], geo.ll[1]),
    CA: "us-east",
    MX: "us-west",

    // Europe
    GB: "eu-west",
    DE: "eu-central",
    FR: "eu-west",
    IT: "eu-south",
    ES: "eu-west",
    NL: "eu-west",
    SE: "eu-north",
    PL: "eu-central",

    // Asia Pacific
    JP: "asia-northeast",
    SG: "asia-southeast",
    IN: "asia-south",
    AU: "asia-southeast",
    KR: "asia-northeast",
    CN: "asia-east",

    // South America
    BR: "sa-east",
    AR: "sa-east",
    CL: "sa-east",
  };

  return countryToRegion[geo.country] || "us-east";
}

function getNearestUSRegion(lat: number, lon: number): string {
  // Coordinates of US regions
  const regions = [
    { name: "us-east", lat: 39.0, lon: -77.5 }, // Virginia
    { name: "us-west", lat: 45.5, lon: -122.7 }, // Oregon
    { name: "us-central", lat: 41.3, lon: -95.9 }, // Iowa
  ];

  // Find nearest region using Haversine distance
  let nearest = regions[0];
  let minDistance = haversineDistance(lat, lon, nearest.lat, nearest.lon);

  for (const region of regions.slice(1)) {
    const distance = haversineDistance(lat, lon, region.lat, region.lon);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = region;
    }
  }

  return nearest.name;
}

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
```

### CloudFlare Workers Integration

```typescript
// Cloudflare Workers automatically provide geolocation
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const country = request.cf?.country || "US";
    const city = request.cf?.city || "Unknown";
    const region = mapCountryToRegion(country);

    const result = await ai.generate({
      input: { text: await request.text() },
      metadata: {
        userRegion: region,
        country,
        city,
      },
    });

    return new Response(JSON.stringify(result));
  },
};
```

---

## Provider-Specific Multi-Region

### OpenAI Multi-Region

OpenAI doesn't have explicit region selection, but uses global load balancing.

```typescript
// Load balance across multiple OpenAI accounts for better distribution
const ai = new NeuroLink({
  providers: [
    {
      name: "openai-account-1",
      config: { apiKey: process.env.OPENAI_KEY_1 },
      weight: 1,
    },
    {
      name: "openai-account-2",
      config: { apiKey: process.env.OPENAI_KEY_2 },
      weight: 1,
    },
    {
      name: "openai-account-3",
      config: { apiKey: process.env.OPENAI_KEY_3 },
      weight: 1,
    },
  ],
  loadBalancing: "round-robin",
});
```

### Google Cloud Vertex AI (Multi-Region)

Vertex AI supports explicit region selection.

```typescript
const ai = new NeuroLink({
  providers: [
    // US regions
    {
      name: "vertex-us-east1",
      region: "us-east1",
      config: {
        projectId: process.env.GCP_PROJECT,
        location: "us-east1",
      },
    },
    {
      name: "vertex-us-west1",
      region: "us-west1",
      config: {
        projectId: process.env.GCP_PROJECT,
        location: "us-west1",
      },
    },

    // EU regions
    {
      name: "vertex-eu-west1",
      region: "eu-west1",
      config: {
        projectId: process.env.GCP_PROJECT,
        location: "europe-west1",
      },
    },

    // Asia regions
    {
      name: "vertex-asia-southeast1",
      region: "asia-southeast1",
      config: {
        projectId: process.env.GCP_PROJECT,
        location: "asia-southeast1",
      },
    },
  ],
});
```

### Mistral AI (European Provider)

Mistral AI is EU-based, perfect for European users.

```typescript
const ai = new NeuroLink({
  providers: [
    {
      name: "mistral-eu",
      region: "eu",
      priority: 1,
      condition: (req) => req.userRegion === "eu",
      config: { apiKey: process.env.MISTRAL_KEY },
    },
  ],
});
```

---

## Deployment Patterns

### Pattern 1: Edge Deployment

Deploy at edge locations (Cloudflare Workers, Vercel Edge).

```typescript
// vercel.json - Edge configuration
{
  "regions": ["iad1", "sfo1", "fra1", "sin1"]
}
```

```typescript
// pages/api/ai/generate.ts - Vercel Edge Function
import { NeuroLink } from "@juspay/neurolink";

export const config = {
  runtime: "edge",
  regions: ["iad1", "sfo1", "fra1", "sin1"],
};

const ai = new NeuroLink({
  providers: [
    /* ... */
  ],
});

export default async function handler(req: Request) {
  const { geolocation } = req;
  const region = mapGeoToRegion(geolocation);

  const result = await ai.generate({
    input: { text: await req.text() },
    metadata: { userRegion: region },
  });

  return new Response(JSON.stringify(result));
}
```

### Pattern 2: Kubernetes Multi-Region

Deploy across multiple Kubernetes clusters.

```yaml
# k8s/deployment-us-east.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: neurolink-us-east
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: neurolink
      region: us-east-1
  template:
    metadata:
      labels:
        app: neurolink
        region: us-east-1
    spec:
      containers:
        - name: neurolink
          image: your-registry/neurolink:latest
          env:
            - name: REGION
              value: "us-east-1"
            - name: OPENAI_API_KEY
              valueFrom:
                secretKeyRef:
                  name: ai-keys
                  key: openai-key
---
# Repeat for us-west-2, eu-west-1, asia-southeast-1
```

### Pattern 3: Multi-Cloud Deployment

Distribute across AWS, GCP, Azure.

```typescript
const ai = new NeuroLink({
  providers: [
    // AWS Bedrock (US)
    {
      name: "bedrock-us",
      region: "us-east-1",
      cloud: "aws",
      config: {
        region: "us-east-1",
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_KEY,
      },
    },

    // Google Vertex (EU)
    {
      name: "vertex-eu",
      region: "eu-west-1",
      cloud: "gcp",
      config: {
        projectId: process.env.GCP_PROJECT,
        location: "europe-west1",
      },
    },

    // Azure OpenAI (Asia)
    {
      name: "azure-asia",
      region: "asia-southeast",
      cloud: "azure",
      config: {
        endpoint: process.env.AZURE_ENDPOINT_ASIA,
        apiKey: process.env.AZURE_KEY,
      },
    },
  ],
});
```

---

## Latency Optimization

### Measure Latency by Region

```typescript
class RegionLatencyTracker {
  private latencies = new Map<string, number[]>();

  recordLatency(region: string, latency: number) {
    if (!this.latencies.has(region)) {
      this.latencies.set(region, []);
    }

    const arr = this.latencies.get(region)!;
    arr.push(latency);

    // Keep last 100 measurements
    if (arr.length > 100) {
      arr.shift();
    }
  }

  getAverageLatency(region: string): number {
    const arr = this.latencies.get(region) || [];
    if (arr.length === 0) return Infinity;

    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  getP95Latency(region: string): number {
    const arr = this.latencies.get(region) || [];
    if (arr.length === 0) return Infinity;

    const sorted = arr.slice().sort((a, b) => a - b);
    const index = Math.floor(sorted.length * 0.95);
    return sorted[index];
  }

  getFastestRegion(regions: string[]): string {
    let fastest = regions[0];
    let lowestLatency = this.getAverageLatency(fastest);

    for (const region of regions) {
      const latency = this.getAverageLatency(region);
      if (latency < lowestLatency) {
        lowestLatency = latency;
        fastest = region;
      }
    }

    return fastest;
  }

  getStats() {
    const stats = [];

    for (const [region, latencies] of this.latencies.entries()) {
      stats.push({
        region,
        avg: this.getAverageLatency(region),
        p95: this.getP95Latency(region),
        samples: latencies.length,
      });
    }

    return stats.sort((a, b) => a.avg - b.avg);
  }
}

// Usage
const latencyTracker = new RegionLatencyTracker();

const ai = new NeuroLink({
  providers: [
    /* ... */
  ],
  onSuccess: (result) => {
    latencyTracker.recordLatency(result.region, result.latency);
  },
});

// View latency stats
console.table(latencyTracker.getStats());
/*
┌─────────┬───────────────────┬──────┬──────┬─────────┐
│ (index) │      region       │ avg  │ p95  │ samples │
├─────────┼───────────────────┼──────┼──────┼─────────┤
│    0    │   'eu-west-1'     │  35  │  45  │   100   │
│    1    │  'us-east-1'      │  50  │  70  │   100   │
│    2    │  'us-west-2'      │  55  │  75  │   100   │
│    3    │ 'asia-southeast1' │  60  │  80  │   100   │
└─────────┴───────────────────┴──────┴──────┴─────────┘
*/
```

### Dynamic Region Selection

Route to fastest region based on real-time latency.

```typescript
const latencyTracker = new RegionLatencyTracker();

const ai = new NeuroLink({
  providers: [
    { name: "provider-us-east", region: "us-east-1" },
    { name: "provider-us-west", region: "us-west-2" },
    { name: "provider-eu-west", region: "eu-west-1" },
  ],
  loadBalancing: {
    strategy: "custom",
    selector: (providers, req) => {
      // Get available regions
      const regions = providers.map((p) => p.region);

      // Select fastest region
      const fastest = latencyTracker.getFastestRegion(regions);

      // Return provider for that region
      return providers.find((p) => p.region === fastest) || providers[0];
    },
  },
});
```

---

## Data Residency & Compliance

### GDPR-Compliant Regional Routing

```typescript
// Ensure EU data stays in EU
const ai = new NeuroLink({
  providers: [
    // EU providers (GDPR-compliant)
    {
      name: "mistral-eu",
      region: "eu-west-1",
      compliance: ["GDPR"],
      priority: 1,
      condition: (req) => req.userRegion === "eu",
    },
    {
      name: "vertex-eu",
      region: "europe-west1",
      compliance: ["GDPR"],
      priority: 2,
      condition: (req) => req.userRegion === "eu",
    },

    // US providers (for non-EU users)
    {
      name: "openai-us",
      region: "us-east-1",
      priority: 1,
      condition: (req) => req.userRegion !== "eu",
    },
  ],
  compliance: {
    enforceDataResidency: true, // Block cross-region data flow
    rejectNonCompliant: true, // Only use compliant providers
  },
});

// Usage
const result = await ai.generate({
  input: { text: euUserData },
  metadata: {
    userRegion: "eu",
    gdprCompliant: true,
  },
});
// Guaranteed to use EU provider
```

### Region-Specific Data Storage

```typescript
class RegionalDataStore {
  private stores = {
    "us-east": createS3Client("us-east-1"),
    "us-west": createS3Client("us-west-2"),
    "eu-west": createS3Client("eu-west-1"),
    "asia-southeast": createS3Client("ap-southeast-1"),
  };

  async store(region: string, userId: string, data: any) {
    const store = this.stores[region];

    if (!store) {
      throw new Error(`No storage configured for region: ${region}`);
    }

    await store.putObject({
      Bucket: `neurolink-data-${region}`,
      Key: `users/${userId}/ai-data.json`,
      Body: JSON.stringify(data),
      ServerSideEncryption: "AES256",
    });
  }

  async retrieve(region: string, userId: string) {
    const store = this.stores[region];
    const result = await store.getObject({
      Bucket: `neurolink-data-${region}`,
      Key: `users/${userId}/ai-data.json`,
    });

    return JSON.parse(result.Body.toString());
  }
}
```

---

## Monitoring Multi-Region

### Regional Metrics Dashboard

```typescript
class RegionalMetrics {
  private metrics = new Map<
    string,
    {
      requests: number;
      errors: number;
      totalLatency: number;
      totalCost: number;
    }
  >();

  recordRequest(region: string, latency: number, cost: number, error: boolean) {
    if (!this.metrics.has(region)) {
      this.metrics.set(region, {
        requests: 0,
        errors: 0,
        totalLatency: 0,
        totalCost: 0,
      });
    }

    const metric = this.metrics.get(region)!;
    metric.requests++;
    metric.totalLatency += latency;
    metric.totalCost += cost;

    if (error) {
      metric.errors++;
    }
  }

  getStats() {
    const stats = [];

    for (const [region, metric] of this.metrics.entries()) {
      stats.push({
        region,
        requests: metric.requests,
        errorRate: (metric.errors / metric.requests) * 100,
        avgLatency: metric.totalLatency / metric.requests,
        totalCost: metric.totalCost,
        avgCost: metric.totalCost / metric.requests,
      });
    }

    return stats.sort((a, b) => b.requests - a.requests);
  }

  exportPrometheus() {
    let output = "";

    for (const [region, metric] of this.metrics.entries()) {
      output += `neurolink_requests_total{region="${region}"} ${metric.requests}\n`;
      output += `neurolink_errors_total{region="${region}"} ${metric.errors}\n`;
      output += `neurolink_latency_sum{region="${region}"} ${metric.totalLatency}\n`;
      output += `neurolink_cost_sum{region="${region}"} ${metric.totalCost}\n`;
    }

    return output;
  }
}

// Usage
const regionalMetrics = new RegionalMetrics();

app.get("/metrics", (req, res) => {
  res.set("Content-Type", "text/plain");
  res.send(regionalMetrics.exportPrometheus());
});
```

---

## Best Practices

### 1. ✅ Always Have Regional Fallbacks

```typescript
// ✅ Good: Fallback to other regions
const ai = new NeuroLink({
  providers: [
    { name: "primary-eu", region: "eu-west-1", priority: 1 },
    { name: "fallback-us", region: "us-east-1", priority: 2 },
  ],
  failoverConfig: { enabled: true },
});
```

### 2. ✅ Monitor Latency by Region

```typescript
// ✅ Track latency for each region
const latencyTracker = new RegionLatencyTracker();
// Alert if latency exceeds threshold
```

### 3. ✅ Enforce Data Residency

```typescript
// ✅ For GDPR compliance
compliance: {
  enforceDataResidency: true,
  rejectNonCompliant: true
}
```

### 4. ✅ Test Failover Between Regions

```typescript
// ✅ Test regional failover
describe("Regional Failover", () => {
  it("should failover to another region", async () => {
    // Simulate EU region failure
    mockProvider("mistral-eu").mockRejectedValue(new Error("503"));

    const result = await ai.generate({
      input: { text: "test" },
      metadata: { userRegion: "eu" },
    });

    // Should failover to another EU provider
    expect(result.region).toMatch(/^eu-/);
  });
});
```

### 5. ✅ Cache Regionally

```typescript
// ✅ Cache responses in each region
const cache = {
  "us-east": new Redis("redis-us-east.example.com"),
  "eu-west": new Redis("redis-eu-west.example.com"),
  "asia-southeast": new Redis("redis-asia.example.com"),
};
```

---

## Related Documentation

- **[Multi-Provider Failover](./multi-provider-failover.md)** - Automatic failover
- **[Load Balancing](./load-balancing.md)** - Distribution strategies
- **[Compliance Guide](./compliance.md)** - GDPR data residency
- **[Monitoring](./monitoring.md)** - Regional monitoring

---

## Additional Resources

- **[AWS Global Infrastructure](https://aws.amazon.com/about-aws/global-infrastructure/)** - AWS regions
- **[GCP Locations](https://cloud.google.com/about/locations)** - Google Cloud regions
- **[Cloudflare Network Map](https://www.cloudflare.com/network/)** - Edge locations

---

**Need Help?** Join our [GitHub Discussions](https://github.com/juspay/neurolink/discussions) or open an [issue](https://github.com/juspay/neurolink/issues).
