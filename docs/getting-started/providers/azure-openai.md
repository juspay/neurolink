---
title: Azure OpenAI Provider Guide
description: Enterprise-grade OpenAI models with Microsoft Azure compliance and global deployment
keywords: azure openai, microsoft azure, enterprise AI, compliance, SOC2, HIPAA
---

# Azure OpenAI Provider Guide

**Enterprise-grade OpenAI models with Microsoft Azure infrastructure and compliance**

---

## Overview

Azure OpenAI Service provides REST API access to OpenAI's models including GPT-4, GPT-3.5, and embeddings through Microsoft's global Azure infrastructure. Perfect for enterprise deployments requiring compliance, data residency, and SLA guarantees.

:::warning[Enterprise-Only Access]
Azure OpenAI requires application approval and Azure subscription. Approval can take 1-2 weeks. Use Google AI Studio or Hugging Face for instant access during development.
:::

### Key Benefits

- **🏢 Enterprise SLA**: 99.9% uptime guarantee with Azure support
- **🌍 Global Regions**: 30+ Azure regions worldwide
- **🔒 Compliance**: SOC 2, HIPAA, ISO 27001, FedRAMP
- **🔐 Azure Integration**: Azure AD, Key Vault, Private Link
- **💰 Enterprise Billing**: Consolidated Azure billing
- **🛡️ Data Residency**: Control where data is processed
- **📊 Azure Monitor**: Built-in observability and logging

### Use Cases

- **Enterprise Applications**: SLA-backed production workloads
- **Regulated Industries**: Healthcare, finance, government
- **Hybrid Cloud**: Integration with existing Azure infrastructure
- **Multi-Region**: Global deployments with data residency
- **Compliance Requirements**: GDPR, HIPAA, SOC 2

---

## Quick Start

### 1. Create Azure OpenAI Resource

```bash
# Via Azure CLI
az cognitiveservices account create \
  --name my-openai-resource \
  --resource-group my-resource-group \
  --location eastus \
  --kind OpenAI \
  --sku S0
```

Or use [Azure Portal](https://portal.azure.com/#create/Microsoft.CognitiveServicesOpenAI):

1. Search for "Azure OpenAI"
2. Click "Create"
3. Select subscription and resource group
4. Choose region (eastus, westeurope, etc.)
5. Name your resource
6. Click "Review + Create"

### 2. Deploy a Model

```bash
# Deploy GPT-4o model
az cognitiveservices account deployment create \
  --name my-openai-resource \
  --resource-group my-resource-group \
  --deployment-name gpt-4o-deployment \
  --model-name gpt-4o \
  --model-version "2024-08-06" \
  --model-format OpenAI \
  --sku-capacity 10 \
  --sku-name "Standard"
```

Or via Azure Portal:

1. Open your Azure OpenAI resource
2. Go to "Deployments" → "Create new deployment"
3. Select model (gpt-4o, gpt-4, gpt-35-turbo, etc.)
4. Name deployment
5. Set capacity (TPM quota)

### 3. Get Credentials

```bash
# Get endpoint
az cognitiveservices account show \
  --name my-openai-resource \
  --resource-group my-resource-group \
  --query "properties.endpoint" --output tsv

# Get API key
az cognitiveservices account keys list \
  --name my-openai-resource \
  --resource-group my-resource-group \
  --query "key1" --output tsv
```

### 4. Configure NeuroLink

```bash
# .env
AZURE_OPENAI_API_KEY=your_api_key_here
AZURE_OPENAI_ENDPOINT=https://my-resource.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT=gpt-4o-deployment
```

```typescript
import { NeuroLink } from "@juspay/neurolink";

const ai = new NeuroLink({
  providers: [
    {
      name: "azure-openai",
      config: {
        apiKey: process.env.AZURE_OPENAI_API_KEY,
        endpoint: process.env.AZURE_OPENAI_ENDPOINT,
        deployment: process.env.AZURE_OPENAI_DEPLOYMENT,
      },
    },
  ],
});

const result = await ai.generate({
  input: { text: "Hello from Azure OpenAI!" },
  provider: "azure-openai",
});

console.log(result.content);
```

---

## Regional Deployment

### Available Regions

| Region                | Location      | Models Available | Data Residency |
| --------------------- | ------------- | ---------------- | -------------- |
| **East US**           | Virginia, USA | All models       | USA            |
| **East US 2**         | Virginia, USA | All models       | USA            |
| **South Central US**  | Texas, USA    | All models       | USA            |
| **West Europe**       | Netherlands   | All models       | EU             |
| **North Europe**      | Ireland       | All models       | EU             |
| **UK South**          | London, UK    | All models       | UK             |
| **France Central**    | Paris, France | All models       | EU             |
| **Switzerland North** | Zurich        | All models       | Switzerland    |
| **Sweden Central**    | Stockholm     | All models       | EU             |
| **Australia East**    | Sydney        | All models       | Australia      |
| **Japan East**        | Tokyo         | All models       | Japan          |
| **Canada East**       | Quebec        | All models       | Canada         |

### Multi-Region Setup

```typescript
const ai = new NeuroLink({
  providers: [
    // US deployments
    {
      name: "azure-us-east",
      config: {
        apiKey: process.env.AZURE_US_EAST_KEY,
        endpoint: "https://my-us-east.openai.azure.com/",
        deployment: "gpt-4o-deployment",
      },
      region: "us-east",
      priority: 1,
      condition: (req) => req.userRegion === "us",
    },

    // EU deployments
    {
      name: "azure-eu-west",
      config: {
        apiKey: process.env.AZURE_EU_WEST_KEY,
        endpoint: "https://my-eu-west.openai.azure.com/",
        deployment: "gpt-4o-deployment",
      },
      region: "eu-west",
      priority: 1,
      condition: (req) => req.userRegion === "eu",
    },

    // Asia deployments
    {
      name: "azure-japan",
      config: {
        apiKey: process.env.AZURE_JAPAN_KEY,
        endpoint: "https://my-japan.openai.azure.com/",
        deployment: "gpt-4o-deployment",
      },
      region: "japan",
      priority: 1,
      condition: (req) => req.userRegion === "asia",
    },
  ],
  failoverConfig: { enabled: true },
});
```

---

## Model Deployments

### Available Models

| Model                      | Deployment Name        | Context | Vision | Best For                    | TPM Quota |
| -------------------------- | ---------------------- | ------- | ------ | --------------------------- | --------- |
| **GPT-5.4**                | gpt-5.4                | 1,050K  | Yes    | Latest flagship             | 10K - 1M  |
| **GPT-5.4 Mini**           | gpt-5.4-mini           | 400K    | Yes    | Fast, cost-effective        | 10K - 10M |
| **GPT-5.4 Nano**           | gpt-5.4-nano           | 400K    | Yes    | Ultra-lightweight           | 10K - 10M |
| **GPT-5**                  | gpt-5                  | 400K    | Yes    | Advanced reasoning          | 10K - 1M  |
| **GPT-5 Mini**             | gpt-5-mini             | 400K    | Yes    | Balanced cost/perf          | 10K - 10M |
| **GPT-4.1**                | gpt-4.1                | 1,047K  | Yes    | Long-context tasks          | 10K - 1M  |
| **GPT-4.1 Mini**           | gpt-4.1-mini           | 1,047K  | Yes    | Long-context, affordable    | 10K - 10M |
| **GPT-4.1 Nano**           | gpt-4.1-nano           | 1,047K  | Yes    | Long-context, lightweight   | 10K - 10M |
| **o3**                     | o3                     | 200K    | Yes    | Deep reasoning              | 10K - 1M  |
| **o3-mini**                | o3-mini                | 200K    | No     | Reasoning, cost-effective   | 10K - 10M |
| **o4-mini**                | o4-mini                | 200K    | Yes    | Latest reasoning, efficient | 10K - 10M |
| **GPT-4o**                 | gpt-4o                 | 128K    | Yes    | Complex reasoning           | 10K - 1M  |
| **GPT-4o-mini**            | gpt-4o-mini            | 128K    | Yes    | General tasks               | 10K - 10M |
| **GPT-4-turbo**            | gpt-4-turbo            | 128K    | Yes    | Advanced tasks              | 10K - 1M  |
| **GPT-4**                  | gpt-4                  | 8K      | No     | Production (legacy)         | 10K - 1M  |
| **GPT-3.5-turbo**          | gpt-35-turbo           | 16K     | No     | High-volume                 | 10K - 10M |
| **text-embedding-ada-002** | text-embedding-ada-002 | 8K      | —      | Vector search               | 10K - 10M |
| **text-embedding-3-small** | text-embedding-3-small | 8K      | —      | Efficient search            | 10K - 10M |
| **text-embedding-3-large** | text-embedding-3-large | 8K      | —      | Accuracy                    | 10K - 10M |

:::warning[GPT-4o-mini Retirement]
GPT-4o-mini is retiring on Azure: **Standard deployments retire March 31, 2026**; **Provisioned and Global deployments retire October 1, 2026**. Migrate to `gpt-4.1-mini` or `gpt-5-mini` as a replacement.
:::

### Deployment Quotas (TPM)

```
Standard Tier Quotas (Tokens Per Minute):
- gpt-4o:              10K - 1M TPM
- gpt-4o-mini:         10K - 10M TPM
- gpt-4-turbo:         10K - 1M TPM
- gpt-35-turbo:        10K - 10M TPM
- embeddings:          10K - 10M TPM

Request quota increase via Azure Portal if needed.
```

### Multiple Model Deployments

```typescript
const ai = new NeuroLink({
  providers: [
    // GPT-4o for complex tasks
    {
      name: "azure-gpt4o",
      config: {
        apiKey: process.env.AZURE_API_KEY,
        endpoint: process.env.AZURE_ENDPOINT,
        deployment: "gpt-4o-deployment",
      },
      model: "gpt-4o",
    },

    // GPT-4o-mini for general tasks
    {
      name: "azure-gpt4o-mini",
      config: {
        apiKey: process.env.AZURE_API_KEY,
        endpoint: process.env.AZURE_ENDPOINT,
        deployment: "gpt-4o-mini-deployment",
      },
      model: "gpt-4o-mini",
    },

    // GPT-3.5-turbo for high-volume
    {
      name: "azure-gpt35",
      config: {
        apiKey: process.env.AZURE_API_KEY,
        endpoint: process.env.AZURE_ENDPOINT,
        deployment: "gpt-35-turbo-deployment",
      },
      model: "gpt-35-turbo",
    },
  ],
});

// Route based on task complexity
const complexTask = await ai.generate({
  input: { text: "Complex analysis..." },
  provider: "azure-gpt4o",
});

const simpleTask = await ai.generate({
  input: { text: "Simple query..." },
  provider: "azure-gpt4o-mini",
});
```

---

## Azure AD Authentication

### Managed Identity (Recommended)

```typescript
import { DefaultAzureCredential } from "@azure/identity";

const credential = new DefaultAzureCredential();

const ai = new NeuroLink({
  providers: [
    {
      name: "azure-openai",
      config: {
        credential, // Use Azure AD instead of API key
        endpoint: process.env.AZURE_OPENAI_ENDPOINT,
        deployment: process.env.AZURE_OPENAI_DEPLOYMENT,
      },
    },
  ],
});
```

### Service Principal

```typescript
import { ClientSecretCredential } from "@azure/identity";

const credential = new ClientSecretCredential(
  process.env.AZURE_TENANT_ID!,
  process.env.AZURE_CLIENT_ID!,
  process.env.AZURE_CLIENT_SECRET!,
);

const ai = new NeuroLink({
  providers: [
    {
      name: "azure-openai",
      config: {
        credential,
        endpoint: process.env.AZURE_OPENAI_ENDPOINT,
        deployment: process.env.AZURE_OPENAI_DEPLOYMENT,
      },
    },
  ],
});
```

### User-Assigned Managed Identity

```typescript
import { ManagedIdentityCredential } from "@azure/identity";

const credential = new ManagedIdentityCredential({
  clientId: process.env.AZURE_CLIENT_ID,
});

const ai = new NeuroLink({
  providers: [
    {
      name: "azure-openai",
      config: {
        credential,
        endpoint: process.env.AZURE_OPENAI_ENDPOINT,
        deployment: process.env.AZURE_OPENAI_DEPLOYMENT,
      },
    },
  ],
});
```

---

## Private Endpoint & VNet Integration

### Configure Private Endpoint

```bash
# Create private endpoint
az network private-endpoint create \
  --name my-openai-pe \
  --resource-group my-resource-group \
  --vnet-name my-vnet \
  --subnet my-subnet \
  --private-connection-resource-id "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.CognitiveServices/accounts/my-openai" \
  --group-id account \
  --connection-name my-openai-connection
```

### Private DNS Zone

```bash
# Create private DNS zone
az network private-dns zone create \
  --resource-group my-resource-group \
  --name privatelink.openai.azure.com

# Link to VNet
az network private-dns link vnet create \
  --resource-group my-resource-group \
  --zone-name privatelink.openai.azure.com \
  --name my-openai-dns-link \
  --virtual-network my-vnet \
  --registration-enabled false
```

### VNet Integration in Code

```typescript
// No code changes needed - just use private endpoint URL
const ai = new NeuroLink({
  providers: [
    {
      name: "azure-openai",
      config: {
        apiKey: process.env.AZURE_API_KEY,
        endpoint: "https://my-openai.privatelink.openai.azure.com/", // Private endpoint
        deployment: "gpt-4o-deployment",
      },
    },
  ],
});
```

---

## Compliance & Security

### Data Residency

```typescript
// Ensure EU data stays in EU
const ai = new NeuroLink({
  providers: [
    {
      name: "azure-eu",
      config: {
        apiKey: process.env.AZURE_EU_KEY,
        endpoint: "https://my-eu-resource.openai.azure.com/",
        deployment: "gpt-4o-deployment",
        region: "westeurope", // EU region
      },
      condition: (req) => req.userRegion === "EU",
      compliance: ["GDPR", "ISO27001", "SOC2"],
    },
  ],
});
```

### Customer-Managed Keys (CMK)

```bash
# Enable CMK with Azure Key Vault
az cognitiveservices account update \
  --name my-openai-resource \
  --resource-group my-resource-group \
  --encryption KeyVault \
  --encryption-key-name my-key \
  --encryption-key-source Microsoft.KeyVault \
  --encryption-key-vault https://my-vault.vault.azure.net/
```

### Disable Public Network Access

```bash
# Restrict to private endpoint only
az cognitiveservices account update \
  --name my-openai-resource \
  --resource-group my-resource-group \
  --public-network-access Disabled
```

---

## Monitoring & Logging

### Azure Monitor Integration

```typescript
import { ApplicationInsights } from "@azure/monitor-opentelemetry";

const appInsights = new ApplicationInsights({
  connectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING,
});

appInsights.start();

const ai = new NeuroLink({
  providers: [
    {
      name: "azure-openai",
      config: {
        apiKey: process.env.AZURE_API_KEY,
        endpoint: process.env.AZURE_OPENAI_ENDPOINT,
        deployment: process.env.AZURE_OPENAI_DEPLOYMENT,
      },
    },
  ],
  onSuccess: (result) => {
    // Log to Application Insights
    appInsights.trackEvent({
      name: "AI_Generation_Success",
      properties: {
        provider: result.provider,
        model: result.model,
        tokens: result.usage.totalTokens,
        cost: result.cost,
        latency: result.latency,
      },
    });
  },
  onError: (error, provider) => {
    // Log errors
    appInsights.trackException({
      exception: error,
      properties: { provider },
    });
  },
});
```

### Diagnostic Logs

```bash
# Enable diagnostic logs
az monitor diagnostic-settings create \
  --name my-diagnostic-settings \
  --resource "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.CognitiveServices/accounts/my-openai" \
  --logs '[{"category":"Audit","enabled":true},{"category":"RequestResponse","enabled":true}]' \
  --workspace "/subscriptions/{sub}/resourceGroups/{rg}/providers/microsoft.operationalinsights/workspaces/my-workspace"
```

---

## Cost Management

### Pricing Model

```
Azure OpenAI Pricing (as of 2025):

GPT-4o:
- Input:  $2.50 per 1M tokens
- Output: $10.00 per 1M tokens

GPT-4o-mini:
- Input:  $0.15 per 1M tokens
- Output: $0.60 per 1M tokens

GPT-4-turbo:
- Input:  $10.00 per 1M tokens
- Output: $30.00 per 1M tokens

GPT-3.5-turbo:
- Input:  $0.50 per 1M tokens
- Output: $1.50 per 1M tokens

Embeddings (ada-002):
- $0.10 per 1M tokens
```

### Cost Tracking

```typescript
class AzureCostTracker {
  private dailyCost = 0;
  private monthlyCost = 0;

  recordUsage(result: any) {
    const inputTokens = result.usage.promptTokens;
    const outputTokens = result.usage.completionTokens;

    // Calculate cost based on model
    let cost = 0;
    if (result.model === "gpt-4o") {
      cost =
        (inputTokens / 1_000_000) * 2.5 + (outputTokens / 1_000_000) * 10.0;
    } else if (result.model === "gpt-4o-mini") {
      cost =
        (inputTokens / 1_000_000) * 0.15 + (outputTokens / 1_000_000) * 0.6;
    }

    this.dailyCost += cost;
    this.monthlyCost += cost;

    return cost;
  }

  getStats() {
    return {
      daily: this.dailyCost,
      monthly: this.monthlyCost,
    };
  }
}

const costTracker = new AzureCostTracker();

const result = await ai.generate({
  input: { text: "Your prompt" },
  provider: "azure-openai",
  enableAnalytics: true,
});

const cost = costTracker.recordUsage(result);
console.log(`Request cost: $${cost.toFixed(4)}`);
```

### Budget Alerts

```bash
# Create budget in Azure
az consumption budget create \
  --budget-name openai-monthly-budget \
  --amount 1000 \
  --time-grain Monthly \
  --start-date 2025-01-01 \
  --end-date 2025-12-31 \
  --resource-group my-resource-group
```

---

## Production Patterns

### Pattern 1: High Availability Setup

```typescript
const ai = new NeuroLink({
  providers: [
    // Primary region
    {
      name: "azure-primary",
      priority: 1,
      config: {
        apiKey: process.env.AZURE_PRIMARY_KEY,
        endpoint: process.env.AZURE_PRIMARY_ENDPOINT,
        deployment: "gpt-4o-deployment",
      },
    },

    // Failover region
    {
      name: "azure-secondary",
      priority: 2,
      config: {
        apiKey: process.env.AZURE_SECONDARY_KEY,
        endpoint: process.env.AZURE_SECONDARY_ENDPOINT,
        deployment: "gpt-4o-deployment",
      },
    },
  ],
  failoverConfig: {
    enabled: true,
    maxAttempts: 3,
    retryDelay: 1000,
  },
  healthCheck: {
    enabled: true,
    interval: 60000,
  },
});
```

### Pattern 2: Load Balancing Across Deployments

```typescript
const ai = new NeuroLink({
  providers: [
    {
      name: "azure-deployment-1",
      config: {
        apiKey: process.env.AZURE_API_KEY,
        endpoint: process.env.AZURE_ENDPOINT,
        deployment: "gpt-4o-deployment-1",
      },
      weight: 1,
    },
    {
      name: "azure-deployment-2",
      config: {
        apiKey: process.env.AZURE_API_KEY,
        endpoint: process.env.AZURE_ENDPOINT,
        deployment: "gpt-4o-deployment-2",
      },
      weight: 1,
    },
    {
      name: "azure-deployment-3",
      config: {
        apiKey: process.env.AZURE_API_KEY,
        endpoint: process.env.AZURE_ENDPOINT,
        deployment: "gpt-4o-deployment-3",
      },
      weight: 1,
    },
  ],
  loadBalancing: "round-robin",
});
```

### Pattern 3: Quota Management

```typescript
class QuotaManager {
  private tokensThisMinute = 0;
  private minuteStart = Date.now();
  private quotaLimit = 100000; // 100K TPM

  async checkQuota(estimatedTokens: number): Promise<boolean> {
    const now = Date.now();

    // Reset if new minute
    if (now - this.minuteStart > 60000) {
      this.tokensThisMinute = 0;
      this.minuteStart = now;
    }

    // Check if within quota
    return this.tokensThisMinute + estimatedTokens <= this.quotaLimit;
  }

  recordUsage(tokens: number) {
    this.tokensThisMinute += tokens;
  }

  getRemaining(): number {
    return Math.max(0, this.quotaLimit - this.tokensThisMinute);
  }
}

const quotaManager = new QuotaManager();

async function generateWithQuota(prompt: string) {
  const estimated = prompt.length / 4; // Rough estimate

  if (!(await quotaManager.checkQuota(estimated))) {
    throw new Error("Quota exceeded, please wait");
  }

  const result = await ai.generate({
    input: { text: prompt },
    provider: "azure-openai",
    enableAnalytics: true,
  });

  quotaManager.recordUsage(result.usage.totalTokens);
  return result;
}
```

---

## Troubleshooting

### Common Issues

#### 1. "Deployment Not Found"

**Problem**: Incorrect deployment name.

**Solution**:

```bash
# List all deployments
az cognitiveservices account deployment list \
  --name my-openai-resource \
  --resource-group my-resource-group

# Use exact deployment name in config
AZURE_OPENAI_DEPLOYMENT=gpt-4o-deployment  # ✅ Exact name
```

#### 2. "Rate Limit Exceeded (429)"

**Problem**: Exceeded TPM quota for deployment.

**Solution**:

```bash
# Increase quota via Azure Portal:
# 1. Go to resource → Deployments
# 2. Edit deployment
# 3. Increase TPM capacity
# Or request quota increase via support ticket
```

#### 3. "Resource Not Found"

**Problem**: Incorrect endpoint or resource deleted.

**Solution**:

```bash
# Verify resource exists
az cognitiveservices account show \
  --name my-openai-resource \
  --resource-group my-resource-group

# Check endpoint format
AZURE_OPENAI_ENDPOINT=https://my-resource.openai.azure.com/  # ✅ With trailing slash
```

#### 4. "Invalid API Key"

**Problem**: API key rotated or incorrect.

**Solution**:

```bash
# Regenerate key
az cognitiveservices account keys regenerate \
  --name my-openai-resource \
  --resource-group my-resource-group \
  --key-name key1

# Update environment variable
```

---

## Best Practices

### 1. ✅ Use Managed Identity in Azure

```typescript
// ✅ Good: Managed identity (no keys to manage)
const credential = new DefaultAzureCredential();

const ai = new NeuroLink({
  providers: [
    {
      name: "azure-openai",
      config: { credential, endpoint, deployment },
    },
  ],
});
```

### 2. ✅ Deploy Multiple Regions for HA

```typescript
// ✅ Good: Multi-region failover
providers: [
  { name: "azure-us", priority: 1 },
  { name: "azure-eu", priority: 2 },
];
```

### 3. ✅ Use Private Endpoints for Security

```bash
# ✅ Good: Private endpoint + disable public access
az cognitiveservices account update \
  --public-network-access Disabled
```

### 4. ✅ Monitor Costs with Budgets

```bash
# ✅ Good: Set budget alerts
az consumption budget create \
  --amount 1000 \
  --time-grain Monthly
```

### 5. ✅ Enable Diagnostic Logging

```bash
# ✅ Good: Enable audit logs
az monitor diagnostic-settings create \
  --logs '[{"category":"Audit","enabled":true}]'
```

---

## Related Documentation

- **[Provider Setup Guide](../provider-setup.md)** - General provider configuration
- **[Multi-Region Deployment](../../guides/enterprise/multi-region.md)** - Geographic distribution
- **[Compliance Guide](../../guides/enterprise/compliance.md)** - Security and compliance
- **[Cost Optimization](../../guides/enterprise/cost-optimization.md)** - Reduce costs

---

## Additional Resources

- **[Azure OpenAI Documentation](https://learn.microsoft.com/azure/cognitive-services/openai/)** - Official docs
- **[Azure OpenAI Pricing](https://azure.microsoft.com/pricing/details/cognitive-services/openai-service/)** - Pricing details
- **[Azure Portal](https://portal.azure.com/)** - Manage resources
- **[Azure CLI Reference](https://learn.microsoft.com/cli/azure/cognitiveservices)** - CLI commands

---

**Need Help?** Join our [GitHub Discussions](https://github.com/juspay/neurolink/discussions) or open an [issue](https://github.com/juspay/neurolink/issues).
