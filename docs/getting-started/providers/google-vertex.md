---
title: Google Vertex AI Provider Guide
description: Enterprise AI on Google Cloud with Gemini, Claude, and advanced IAM/VPC security
keywords: google vertex ai, gcp, gemini, claude, enterprise AI, IAM, VPC
---

# Google Vertex AI Provider Guide

**Enterprise AI on Google Cloud with Claude, Gemini, and custom models**

---

## Overview

Google Vertex AI is Google Cloud's unified ML platform providing access to Google's Gemini models, Anthropic's Claude models, and custom model deployments. Perfect for enterprise deployments requiring GCP integration, advanced MLOps, and scalability.

### Key Benefits

- **🤖 Multiple Models**: Gemini, Claude, and custom models
- **🏢 Enterprise SLA**: 99.95% uptime guarantee
- **🌍 Global Regions**: 30+ GCP regions worldwide
- **🔒 GCP Integration**: IAM, VPC, Cloud Logging
- **📊 MLOps**: Model monitoring, versioning, A/B testing
- **💰 Pay-as-you-go**: No minimum fees
- **🔐 Security**: VPC-SC, CMEK, Private Service Connect

### Use Cases

- **Enterprise AI**: Production ML workloads at scale
- **Multi-Model**: Access Gemini and Claude from one platform
- **Custom Models**: Deploy your own models
- **MLOps**: Full ML lifecycle management
- **GCP Ecosystem**: Integration with BigQuery, Cloud Storage, etc.

---

## Quick Start

### 1. Create GCP Project

```bash
# Create project
gcloud projects create my-ai-project --name="My AI Project"

# Set project
gcloud config set project my-ai-project

# Enable Vertex AI API
gcloud services enable aiplatform.googleapis.com
```

### 2. Setup Authentication

**Option A: Service Account (Production)**

```bash
# Create service account
gcloud iam service-accounts create vertex-ai-sa \
  --display-name="Vertex AI Service Account"

# Grant Vertex AI User role
gcloud projects add-iam-policy-binding my-ai-project \
  --member="serviceAccount:vertex-ai-sa@my-ai-project.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

# Create key file
gcloud iam service-accounts keys create vertex-key.json \
  --iam-account=vertex-ai-sa@my-ai-project.iam.gserviceaccount.com

# Set environment variable
export GOOGLE_APPLICATION_CREDENTIALS="$(pwd)/vertex-key.json"
```

**Option B: Application Default Credentials (Development)**

```bash
# Login with your Google account
gcloud auth application-default login
```

**Option C: Workload Identity (GKE)**

```bash
# Bind Kubernetes service account to GCP service account
gcloud iam service-accounts add-iam-policy-binding \
  vertex-ai-sa@my-ai-project.iam.gserviceaccount.com \
  --role roles/iam.workloadIdentityUser \
  --member "serviceAccount:my-ai-project.svc.id.goog[default/my-ksa]"
```

### 3. Configure NeuroLink

```bash
# .env
GOOGLE_VERTEX_PROJECT_ID=my-ai-project
GOOGLE_VERTEX_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=/path/to/vertex-key.json
```

```typescript
import { NeuroLink } from "@juspay/neurolink";

const ai = new NeuroLink({
  providers: [
    {
      name: "vertex",
      config: {
        projectId: process.env.GOOGLE_VERTEX_PROJECT_ID,
        location: process.env.GOOGLE_VERTEX_LOCATION,
        credentials: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      },
    },
  ],
});

const result = await ai.generate({
  input: { text: "Hello from Vertex AI!" },
  provider: "vertex",
  model: "gemini-2.0-flash",
});

console.log(result.content);
```

---

## Regional Deployment

### Available Regions

| Region                   | Location       | Models Available | Latency              |
| ------------------------ | -------------- | ---------------- | -------------------- |
| **us-central1**          | Iowa, USA      | All models       | Low (US)             |
| **us-east1**             | South Carolina | All models       | Low (US East)        |
| **us-west1**             | Oregon, USA    | All models       | Low (US West)        |
| **europe-west1**         | Belgium        | All models       | Low (EU)             |
| **europe-west2**         | London, UK     | All models       | Low (UK)             |
| **europe-west4**         | Netherlands    | All models       | Low (EU)             |
| **asia-northeast1**      | Tokyo, Japan   | All models       | Low (Asia)           |
| **asia-southeast1**      | Singapore      | All models       | Low (Southeast Asia) |
| **asia-south1**          | Mumbai, India  | All models       | Low (India)          |
| **australia-southeast1** | Sydney         | All models       | Low (Australia)      |

### Multi-Region Setup

```typescript
const ai = new NeuroLink({
  providers: [
    // US deployment
    {
      name: "vertex-us",
      config: {
        projectId: process.env.GOOGLE_VERTEX_PROJECT_ID,
        location: "us-central1",
        credentials: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      },
      region: "us",
      priority: 1,
      condition: (req) => req.userRegion === "us",
    },

    // EU deployment
    {
      name: "vertex-eu",
      config: {
        projectId: process.env.GOOGLE_VERTEX_PROJECT_ID,
        location: "europe-west1",
        credentials: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      },
      region: "eu",
      priority: 1,
      condition: (req) => req.userRegion === "eu",
    },

    // Asia deployment
    {
      name: "vertex-asia",
      config: {
        projectId: process.env.GOOGLE_VERTEX_PROJECT_ID,
        location: "asia-southeast1",
        credentials: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      },
      region: "asia",
      priority: 1,
      condition: (req) => req.userRegion === "asia",
    },
  ],
  failoverConfig: { enabled: true },
});
```

---

## Available Models

### Gemini Models (Google)

| Model                      | Description               | Context    | Best For                 | Pricing                          |
| -------------------------- | ------------------------- | ---------- | ------------------------ | -------------------------------- |
| **gemini-3-pro-preview**   | Latest, extended thinking | 1M tokens  | Deep reasoning, analysis | Preview                          |
| **gemini-3-flash-preview** | Fast with thinking        | 1M tokens  | Balanced speed/quality   | Preview                          |
| **gemini-2.0-flash**       | Fast model                | 1M tokens  | Speed, real-time         | $0.075/1M input, $0.30/1M output |
| **gemini-1.5-pro**         | Most capable              | 2M tokens  | Complex reasoning        | $1.25/1M in                      |
| **gemini-1.5-flash**       | Balanced                  | 1M tokens  | General tasks            | $0.075/1M in                     |
| **gemini-1.0-pro**         | Stable version            | 32K tokens | Production               | $0.50/1M in                      |

> **Note:** Gemini 3 models (`gemini-3-pro-preview`, `gemini-3-flash-preview`) are preview models and may have stricter rate limits than production models. Monitor your usage and expect potential API changes during the preview period.

### Claude Models (Anthropic via Vertex)

| Model                 | Description      | Context     | Best For        | Pricing     |
| --------------------- | ---------------- | ----------- | --------------- | ----------- |
| **claude-3-5-sonnet** | Latest Anthropic | 200K tokens | Complex tasks   | $3/1M in    |
| **claude-3-opus**     | Most capable     | 200K tokens | Highest quality | $15/1M in   |
| **claude-3-haiku**    | Fast, affordable | 200K tokens | High-volume     | $0.25/1M in |

### Model Selection Examples

```typescript
// Use Gemini for speed
const fast = await ai.generate({
  input: { text: "Quick query" },
  provider: "vertex",
  model: "gemini-2.0-flash",
});

// Use Gemini Pro for complex reasoning
const complex = await ai.generate({
  input: { text: "Detailed analysis..." },
  provider: "vertex",
  model: "gemini-1.5-pro",
});

// Use Claude for highest quality
const premium = await ai.generate({
  input: { text: "Critical task..." },
  provider: "vertex",
  model: "claude-3-5-sonnet",
});
```

---

## Extended Thinking (Gemini 3)

Gemini 3 models support **Extended Thinking**, which enables the model to perform deeper reasoning before generating responses. This is ideal for complex analysis, multi-step problem solving, and tasks requiring careful deliberation.

### Thinking Levels

| Level       | Description                        | Use Case                           | Latency Impact |
| ----------- | ---------------------------------- | ---------------------------------- | -------------- |
| **minimal** | Near-zero thinking (Flash only)    | Simple queries requiring speed     | Minimal        |
| **low**     | Minimal thinking, faster responses | Simple queries, quick answers      | Low            |
| **medium**  | Balanced thinking and speed        | General tasks, moderate complexity | Moderate       |
| **high**    | Deep reasoning, thorough analysis  | Complex problems, critical tasks   | Higher         |

### Basic Usage

```typescript
import { NeuroLink } from "@juspay/neurolink";

const ai = new NeuroLink({
  providers: [
    {
      name: "vertex",
      config: {
        projectId: process.env.GOOGLE_VERTEX_PROJECT_ID,
        location: process.env.GOOGLE_VERTEX_LOCATION,
      },
    },
  ],
});

// Enable extended thinking with Gemini 3
const result = await ai.generate({
  input: {
    text: "Analyze the trade-offs between microservices and monolithic architecture for a startup with 5 engineers.",
  },
  provider: "vertex",
  model: "gemini-3-pro-preview",
  thinkingLevel: "high", // 'minimal' | 'low' | 'medium' | 'high'
});

console.log(result.content);
```

### Thinking Level Examples

```typescript
// Low thinking - Quick responses for simple queries
const quick = await ai.generate({
  input: { text: "What is the capital of France?" },
  provider: "vertex",
  model: "gemini-3-flash-preview",
  thinkingLevel: "low",
});

// Medium thinking - Balanced for everyday tasks
const balanced = await ai.generate({
  input: { text: "Summarize the key points of this article..." },
  provider: "vertex",
  model: "gemini-3-flash-preview",
  thinkingLevel: "medium",
});

// High thinking - Deep analysis for complex problems
const deep = await ai.generate({
  input: {
    text: `Given the following codebase architecture, identify potential
           security vulnerabilities and suggest remediation strategies...`,
  },
  provider: "vertex",
  model: "gemini-3-pro-preview",
  thinkingLevel: "high",
});
```

### Streaming with Extended Thinking

```typescript
// Stream responses with thinking enabled
const stream = await ai.stream({
  input: {
    text: "Design a distributed caching strategy for a high-traffic e-commerce platform.",
  },
  provider: "vertex",
  model: "gemini-3-pro-preview",
  thinkingLevel: "high",
});

for await (const chunk of stream) {
  process.stdout.write(chunk.content);
}
```

### Best Practices for Extended Thinking

1. **Match thinking level to task complexity**: Use `low` for simple queries, `high` for complex analysis
2. **Consider latency requirements**: Higher thinking levels increase response time
3. **Use with complex prompts**: Extended thinking shines with multi-step reasoning tasks
4. **Monitor token usage**: Thinking processes consume additional tokens

> **Important:** Extended Thinking is only available on Gemini 3 models (`gemini-3-pro-preview`, `gemini-3-flash-preview`). Using `thinkingLevel` with other models will be ignored.

---

## IAM & Permissions

### Required IAM Roles

```bash
# Minimum roles for Vertex AI
roles/aiplatform.user           # Use Vertex AI services
roles/serviceusage.serviceUsageConsumer  # Use GCP APIs

# Additional roles for specific features
roles/aiplatform.admin          # Manage models and endpoints
roles/storage.objectViewer      # Read from Cloud Storage
roles/bigquery.dataViewer       # Read from BigQuery
```

### Service Account Setup

```bash
# Create service account with minimal permissions
gcloud iam service-accounts create vertex-readonly \
  --display-name="Vertex AI Read-Only"

# Grant only necessary permissions
gcloud projects add-iam-policy-binding my-ai-project \
  --member="serviceAccount:vertex-readonly@my-ai-project.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

# For production, use custom role with least privilege
gcloud iam roles create vertexAIInference \
  --project=my-ai-project \
  --title="Vertex AI Inference Only" \
  --permissions=aiplatform.endpoints.predict,aiplatform.endpoints.get
```

### Workload Identity for GKE

```yaml
# kubernetes-sa.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: vertex-ai-sa
  namespace: default
  annotations:
    iam.gke.io/gcp-service-account: vertex-ai-sa@my-ai-project.iam.gserviceaccount.com
```

```bash
# Bind Kubernetes SA to GCP SA
gcloud iam service-accounts add-iam-policy-binding \
  vertex-ai-sa@my-ai-project.iam.gserviceaccount.com \
  --role roles/iam.workloadIdentityUser \
  --member "serviceAccount:my-ai-project.svc.id.goog[default/vertex-ai-sa]"
```

---

## VPC & Private Connectivity

### Private Service Connect

```bash
# Create Private Service Connect endpoint
gcloud compute addresses create vertex-psc-ip \
  --region=us-central1 \
  --subnet=my-subnet

gcloud compute forwarding-rules create vertex-psc-endpoint \
  --region=us-central1 \
  --network=my-vpc \
  --address=vertex-psc-ip \
  --target-service-attachment=projects/my-project/regions/us-central1/serviceAttachments/vertex-ai
```

### VPC Service Controls

```bash
# Create access policy
gcloud access-context-manager policies create \
  --title="Vertex AI Access Policy"

# Create perimeter
gcloud access-context-manager perimeters create vertex_perimeter \
  --title="Vertex AI Perimeter" \
  --resources=projects/my-ai-project \
  --restricted-services=aiplatform.googleapis.com \
  --policy=POLICY_ID
```

---

## Custom Model Deployment

### Deploy Custom Model

```python
# Python example for custom model deployment
from google.cloud import aiplatform

aiplatform.init(project='my-ai-project', location='us-central1')

# Upload model
model = aiplatform.Model.upload(
    display_name='my-custom-model',
    artifact_uri='gs://my-bucket/model/',
    serving_container_image_uri='gcr.io/my-project/serving-image:latest'
)

# Create endpoint
endpoint = aiplatform.Endpoint.create(
    display_name='my-model-endpoint'
)

# Deploy model to endpoint
model.deploy(
    endpoint=endpoint,
    machine_type='n1-standard-4',
    min_replica_count=1,
    max_replica_count=3
)
```

### Use Custom Endpoint with NeuroLink

```typescript
const ai = new NeuroLink({
  providers: [
    {
      name: "vertex-custom",
      config: {
        projectId: process.env.GOOGLE_VERTEX_PROJECT_ID,
        location: "us-central1",
        credentials: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        endpoint: "projects/my-project/locations/us-central1/endpoints/12345",
      },
    },
  ],
});

const result = await ai.generate({
  input: { text: "Your prompt" },
  provider: "vertex-custom",
});
```

---

## Monitoring & Logging

### Cloud Logging Integration

```typescript
import { Logging } from "@google-cloud/logging";

const logging = new Logging({
  projectId: process.env.GOOGLE_VERTEX_PROJECT_ID,
});

const log = logging.log("vertex-ai-requests");

const ai = new NeuroLink({
  providers: [
    {
      name: "vertex",
      config: {
        projectId: process.env.GOOGLE_VERTEX_PROJECT_ID,
        location: "us-central1",
      },
    },
  ],
  onSuccess: async (result) => {
    // Log to Cloud Logging
    const metadata = {
      resource: { type: "global" },
      severity: "INFO",
    };

    const entry = log.entry(metadata, {
      event: "ai_generation_success",
      provider: result.provider,
      model: result.model,
      tokens: result.usage.totalTokens,
      cost: result.cost,
      latency: result.latency,
    });

    await log.write(entry);
  },
});
```

### Cloud Monitoring Metrics

```typescript
import { MetricServiceClient } from "@google-cloud/monitoring";

const client = new MetricServiceClient();

async function writeMetric(tokens: number, cost: number) {
  const projectId = process.env.GOOGLE_VERTEX_PROJECT_ID;
  const projectPath = client.projectPath(projectId);

  const dataPoint = {
    interval: {
      endTime: { seconds: Date.now() / 1000 },
    },
    value: { doubleValue: tokens },
  };

  const timeSeriesData = {
    metric: {
      type: "custom.googleapis.com/vertex_ai/tokens_used",
      labels: { model: "gemini-1.5-pro" },
    },
    resource: {
      type: "global",
      labels: { project_id: projectId },
    },
    points: [dataPoint],
  };

  const request = {
    name: projectPath,
    timeSeries: [timeSeriesData],
  };

  await client.createTimeSeries(request);
}
```

---

## Cost Management

### Pricing Overview

```
Gemini Pricing (per 1M tokens):
- gemini-2.0-flash:  $0.075 input, $0.30 output
- gemini-1.5-pro:    $1.25 input, $5.00 output
- gemini-1.5-flash:  $0.075 input, $0.30 output

Claude on Vertex (per 1M tokens):
- claude-3-5-sonnet: $3 input, $15 output
- claude-3-opus:     $15 input, $75 output
- claude-3-haiku:    $0.25 input, $1.25 output

Custom Model: Based on compute (n1-standard-4: ~$0.19/hour)
```

### Budget Alerts

```bash
# Set budget alert
gcloud billing budgets create \
  --billing-account=BILLING_ACCOUNT_ID \
  --display-name="Vertex AI Budget" \
  --budget-amount=1000 \
  --threshold-rule=percent=50 \
  --threshold-rule=percent=90 \
  --threshold-rule=percent=100
```

### Cost Tracking

```typescript
class VertexCostTracker {
  private monthlyCost = 0;

  calculateCost(
    model: string,
    inputTokens: number,
    outputTokens: number,
  ): number {
    const pricing: Record<string, { input: number; output: number }> = {
      "gemini-2.0-flash": { input: 0.075, output: 0.3 },
      "gemini-1.5-pro": { input: 1.25, output: 5.0 },
      "claude-3-5-sonnet": { input: 3.0, output: 15.0 },
    };

    const rates = pricing[model] || pricing["gemini-2.0-flash"];
    const cost =
      (inputTokens / 1_000_000) * rates.input +
      (outputTokens / 1_000_000) * rates.output;

    this.monthlyCost += cost;
    return cost;
  }

  getMonthlyTotal(): number {
    return this.monthlyCost;
  }
}

const costTracker = new VertexCostTracker();

const result = await ai.generate({
  input: { text: "Your prompt" },
  provider: "vertex",
  model: "gemini-1.5-pro",
  enableAnalytics: true,
});

const cost = costTracker.calculateCost(
  result.model,
  result.usage.promptTokens,
  result.usage.completionTokens,
);

console.log(`Request cost: $${cost.toFixed(4)}`);
console.log(`Monthly total: $${costTracker.getMonthlyTotal().toFixed(2)}`);
```

---

## Production Patterns

### Pattern 1: Multi-Model Strategy

```typescript
const ai = new NeuroLink({
  providers: [
    // Fast, cheap for simple queries
    {
      name: "vertex-flash",
      config: {
        projectId: process.env.GOOGLE_VERTEX_PROJECT_ID,
        location: "us-central1",
      },
      model: "gemini-2.0-flash",
      condition: (req) => req.complexity === "low",
    },

    // Balanced for medium complexity
    {
      name: "vertex-pro",
      config: {
        projectId: process.env.GOOGLE_VERTEX_PROJECT_ID,
        location: "us-central1",
      },
      model: "gemini-1.5-pro",
      condition: (req) => req.complexity === "medium",
    },

    // Premium for critical tasks
    {
      name: "vertex-claude",
      config: {
        projectId: process.env.GOOGLE_VERTEX_PROJECT_ID,
        location: "us-central1",
      },
      model: "claude-3-5-sonnet",
      condition: (req) => req.complexity === "high",
    },
  ],
});
```

### Pattern 2: A/B Testing

```typescript
// Deploy two model versions for A/B testing
const ai = new NeuroLink({
  providers: [
    {
      name: "vertex-model-a",
      config: {
        /*...*/
      },
      model: "gemini-1.5-pro",
      weight: 1, // 50% traffic
      tags: ["experiment-a"],
    },
    {
      name: "vertex-model-b",
      config: {
        /*...*/
      },
      model: "claude-3-5-sonnet",
      weight: 1, // 50% traffic
      tags: ["experiment-b"],
    },
  ],
  loadBalancing: "weighted-round-robin",
  onSuccess: (result) => {
    // Track A/B test metrics
    analytics.track({
      experiment: result.tags[0],
      model: result.model,
      latency: result.latency,
      quality: result.quality,
    });
  },
});
```

---

## Best Practices

### 1. ✅ Use Service Accounts with Minimal Permissions

```bash
# ✅ Good: Least privilege
gcloud iam roles create vertexInferenceOnly \
  --permissions=aiplatform.endpoints.predict
```

### 2. ✅ Enable Private Service Connect

```bash
# ✅ Good: Private connectivity
gcloud compute forwarding-rules create vertex-psc
```

### 3. ✅ Monitor Costs

```typescript
// ✅ Good: Track every request
const cost = costTracker.calculateCost(model, inputTokens, outputTokens);
```

### 4. ✅ Use Multi-Region for HA

```typescript
// ✅ Good: Regional failover
providers: [
  { name: "vertex-us", region: "us-central1", priority: 1 },
  { name: "vertex-eu", region: "europe-west1", priority: 2 },
];
```

### 5. ✅ Log to Cloud Logging

```typescript
// ✅ Good: Centralized logging
await log.write(entry);
```

---

## Troubleshooting

### Common Issues

#### 1. "Permission Denied"

**Problem**: Missing IAM permissions.

**Solution**:

```bash
# Grant required role
gcloud projects add-iam-policy-binding my-ai-project \
  --member="serviceAccount:vertex-ai-sa@my-ai-project.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"
```

#### 2. "Quota Exceeded"

**Problem**: Exceeded API quota.

**Solution**:

```bash
# Request quota increase
gcloud services enable serviceusage.googleapis.com
gcloud alpha services quota update \
  --service=aiplatform.googleapis.com \
  --consumer=projects/my-ai-project \
  --metric=aiplatform.googleapis.com/online_prediction_requests \
  --value=10000
```

#### 3. "Model Not Found"

**Problem**: Model not available in region.

**Solution**:

```bash
# Check available models in region
gcloud ai models list --region=us-central1

# Use different region
GOOGLE_VERTEX_LOCATION=europe-west1
```

---

## Known Limitations

### Tools + JSON Schema Cannot Be Used Simultaneously (Gemini Models)

**Google API Limitation:** All Google Gemini models on Vertex AI (including Gemini 3 preview models) cannot combine function calling (tools) with structured output (JSON schema) in the same request. This is a fundamental Google API constraint.

**Affected models:** All Gemini models including `gemini-3-pro-preview`, `gemini-3-flash-preview`, `gemini-2.0-flash`, `gemini-1.5-pro`, `gemini-1.5-flash`

**Note:** This limitation ONLY affects Gemini models. Anthropic Claude models via Vertex AI do NOT have this limitation.

**Error:**

```
Function calling with a response mime type: 'application/json' is unsupported
```

**Solution for Gemini models:**

```typescript
// ✅ Correct approach with Gemini (including Gemini 3)
const result = await neurolink.generate({
  input: { text: "Analyze this data" },
  schema: MyZodSchema,
  output: { format: "json" },
  provider: "vertex",
  model: "gemini-3-pro-preview", // or any Gemini model
  disableTools: true, // Required for ALL Gemini models when using schema
});
```

**With Extended Thinking (Gemini 3):**

```typescript
// ✅ Using schema with Gemini 3 Extended Thinking
const result = await neurolink.generate({
  input: { text: "Analyze this complex data and provide structured insights" },
  schema: MyZodSchema,
  output: { format: "json" },
  provider: "vertex",
  model: "gemini-3-pro-preview",
  thinkingLevel: "high",
  disableTools: true, // Still required even with thinking enabled
});
```

**Claude models work without restriction:**

```typescript
// ✅ Claude via Vertex AI supports both
const result = await neurolink.generate({
  input: { text: "Analyze this data" },
  schema: MyZodSchema,
  output: { format: "json" },
  provider: "vertex",
  model: "claude-3-5-sonnet-20241022",
  // No disableTools needed - Claude supports both
});
```

**Industry Context:**

- This limitation affects ALL frameworks using Gemini (LangChain, Vercel AI SDK, Agno, Instructor)
- All use the same workaround: disable tools when using schemas
- Future Gemini versions may support both - check official Google Cloud documentation for updates

### Preview Model Rate Limits (Gemini 3)

**Preview models** (`gemini-3-pro-preview`, `gemini-3-flash-preview`) have stricter rate limits than production models:

- Lower requests per minute (RPM) quotas
- Lower tokens per minute (TPM) quotas
- Potential for API changes without notice
- Not recommended for production workloads without fallback

**Recommended pattern for production:**

```typescript
const ai = new NeuroLink({
  providers: [
    // Primary: Gemini 3 preview
    {
      name: "vertex-gemini3",
      config: {
        projectId: process.env.GOOGLE_VERTEX_PROJECT_ID,
        location: "us-central1",
      },
      model: "gemini-3-pro-preview",
      priority: 1,
    },
    // Fallback: Stable Gemini 2
    {
      name: "vertex-gemini2",
      config: {
        projectId: process.env.GOOGLE_VERTEX_PROJECT_ID,
        location: "us-central1",
      },
      model: "gemini-2.0-flash",
      priority: 2,
    },
  ],
  failoverConfig: { enabled: true },
});
```

### Complex Schema Limitations

**"Too many states for serving" Error:**

When using complex Zod schemas with Gemini, you may encounter:

```
Error: 9 FAILED_PRECONDITION: Too many states for serving
```

**Solutions:**

1. Simplify schema (reduce nesting, array sizes)
2. Use `disableTools: true` (reduces state count)
3. Use Claude models via Vertex AI (no such limitation)

See [Troubleshooting Guide](../../TROUBLESHOOTING.md#google-gemini-too-many-states-for-serving-error) for details.

---

## Related Documentation

- **[Provider Setup Guide](../provider-setup.md)** - General configuration
- **[Multi-Region Deployment](../../guides/enterprise/multi-region.md)** - Geographic distribution
- **[Cost Optimization](../../guides/enterprise/cost-optimization.md)** - Reduce costs
- **[Compliance Guide](../../guides/enterprise/compliance.md)** - Security

---

## Additional Resources

- **[Vertex AI Documentation](https://cloud.google.com/vertex-ai/docs)** - Official docs
- **[Vertex AI Pricing](https://cloud.google.com/vertex-ai/pricing)** - Pricing calculator
- **[GCP Console](https://console.cloud.google.com/)** - Manage resources
- **[gcloud CLI](https://cloud.google.com/sdk/gcloud)** - Command-line tool

---

**Need Help?** Join our [GitHub Discussions](https://github.com/juspay/neurolink/discussions) or open an [issue](https://github.com/juspay/neurolink/issues).
