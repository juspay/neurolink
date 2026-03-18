---
title: Mistral AI Provider Guide
description: Complete setup guide for Mistral AI with GDPR compliance and EU data residency
keywords: mistral ai, GDPR, EU compliance, european AI, privacy
---

# Mistral AI Provider Guide

**European AI excellence with GDPR compliance and competitive free tier**

---

## Overview

Mistral AI is a European AI company offering powerful open-source and proprietary models with built-in GDPR compliance, European data residency, and competitive pricing. Perfect for EU-based companies and privacy-conscious applications.

:::tip[GDPR Compliance Built-In]
Mistral AI is EU-based with European data residency by default. Ideal for GDPR-compliant applications without additional configuration required.
:::

### Key Benefits

- **🇪🇺 European Company**: GDPR-compliant by design
- **🆓 Free Tier**: Generous free tier for experimentation
- **🚀 High Performance**: Competitive with GPT-4 and Claude
- **💰 Cost-Effective**: Lower pricing than major US providers
- **🔓 Open Source**: Mistral 7B model fully open-source
- **⚡ Fast Inference**: Optimized for low latency

### Use Cases

- **EU Compliance**: GDPR-compliant AI for European companies
- **Cost Optimization**: Lower costs than OpenAI/Anthropic
- **Code Generation**: Excellent coding capabilities (Codestral)
- **Enterprise**: Production-ready with EU data residency
- **Research**: Open-source models for experimentation

---

## Quick Start

### 1. Get Your API Key

1. Visit [Mistral AI Console](https://console.mistral.ai/)
2. Create a free account
3. Go to "API Keys" section
4. Click "Create new key"
5. Copy the key (format: `xxx...`)

### 2. Configure NeuroLink

Add to your `.env` file:

```bash
MISTRAL_API_KEY=your_api_key_here
```

### 3. Test the Setup

```bash
# CLI - Test with default model
npx @juspay/neurolink generate "Bonjour! Comment allez-vous?" --provider mistral

# CLI - Use specific model
npx @juspay/neurolink generate "Explain quantum physics" --provider mistral --model "mistral-large-latest"

# SDK
node -e "
const { NeuroLink } = require('@juspay/neurolink');
(async () => {
  const ai = new NeuroLink();
  const result = await ai.generate({
    input: { text: 'Hello from Mistral AI!' },
    provider: 'mistral'
  });
  console.log(result.content);
})();
"
```

---

## Model Selection Guide

### Available Models

| Model                  | Model ID                  | Context | Vision | Use Case                                                 |
| ---------------------- | ------------------------- | ------- | ------ | -------------------------------------------------------- |
| **Mistral Large 3**    | `mistral-large-latest`    | 256K    | Yes    | Flagship, agentic — native vision replaces Pixtral Large |
| **Mistral Medium 3.1** | `mistral-medium-latest`   | 128K    | Yes    | Balanced performance/cost                                |
| **Mistral Small 4**    | `mistral-small-latest`    | 128K    | Yes    | MoE architecture, strong reasoning at low cost           |
| **Magistral Medium**   | `magistral-medium-latest` | 128K    | Yes    | Reasoning-focused                                        |
| **Magistral Small**    | `magistral-small-latest`  | 128K    | Yes    | Reasoning (Apache 2.0 license)                           |
| **Codestral**          | `codestral-latest`        | 256K    | No     | Code generation and review                               |
| **Devstral 2**         | `devstral-2512`           | 256K    | No     | Agentic coding workflows                                 |
| **Pixtral Large**      | `pixtral-large`           | 128K    | Yes    | Vision (deprecated — use Mistral Large 3)                |
| **Mistral Embed**      | `mistral-embed`           | —       | —      | Embeddings (1024 dimensions)                             |
| **Codestral Embed**    | `codestral-embed`         | —       | —      | Code embeddings                                          |

:::info[Pixtral Large Superseded]
Pixtral Large has been superseded by **Mistral Large 3**, which includes native vision capabilities alongside its flagship text performance. New projects should use `mistral-large-latest` for both text and vision tasks. The `pixtral-large` model ID remains available but is considered deprecated.
:::

### Free Tier Details

✅ **What's Included:**

- **$5 free credits** for new users
- **No time limit** on free credits
- **All models available** on free tier
- **No credit card** required for signup

💡 **Free Tier Estimate:**

- ~2.5M tokens with mistral-small
- ~625K tokens with mistral-large
- ~5M tokens with codestral

### Model Selection by Use Case

```typescript
// Complex reasoning and analysis
const complex = await ai.generate({
  input: { text: "Analyze this business strategy..." },
  provider: "mistral",
  model: "mistral-large-latest",
});

// General production workloads
const general = await ai.generate({
  input: { text: "Customer support query" },
  provider: "mistral",
  model: "mistral-small-latest",
});

// Code generation and review
const code = await ai.generate({
  input: { text: "Write a REST API in Python" },
  provider: "mistral",
  model: "codestral-latest",
});

// Embeddings for RAG
const embeddings = await ai.generateEmbeddings({
  texts: ["Document 1", "Document 2"],
  provider: "mistral",
  model: "mistral-embed",
});
```

---

## GDPR Compliance & European Deployment

### Why Mistral for EU Companies

**Built-in GDPR Compliance:**

- ✅ European company (France-based)
- ✅ EU data centers
- ✅ GDPR-compliant by design
- ✅ No data sent to US servers
- ✅ Data residency in Europe

### Data Residency Configuration

```typescript
// Ensure EU data residency via environment variables
// Set MISTRAL_API_KEY in your .env file
// Set MISTRAL_REGION=eu to explicitly use EU endpoints
const ai = new NeuroLink();

const result = await ai.generate({
  input: { text: "Your prompt" },
  provider: "mistral",
});
```

### GDPR Compliance Checklist

```typescript
// ✅ GDPR-compliant setup
// Configure via environment variables:
//   MISTRAL_API_KEY=your-key
//   MISTRAL_REGION=eu
const gdprAI = new NeuroLink();

// Document data processing
const result = await gdprAI.generate({
  input: { text: userQuery },
  provider: "mistral",
  metadata: {
    userId: "anonymized-id",
    purpose: "customer-support",
    legalBasis: "consent",
  },
});
```

### Compliance Features

| Feature              | Mistral AI        | Other Providers |
| -------------------- | ----------------- | --------------- |
| **EU Data Centers**  | ✅ Yes            | ⚠️ Limited      |
| **GDPR Compliance**  | ✅ Built-in       | ⚠️ Varies       |
| **Data Residency**   | ✅ EU-only option | ⚠️ Often US     |
| **Privacy Controls** | ✅ Granular       | ⚠️ Limited      |
| **Audit Logs**       | ✅ Available      | ⚠️ Varies       |

---

## SDK Integration

### Basic Usage

```typescript
import { NeuroLink } from "@juspay/neurolink";

const ai = new NeuroLink();

// Simple generation
const result = await ai.generate({
  input: { text: "Explain artificial intelligence" },
  provider: "mistral",
});

console.log(result.content);
```

### With Specific Model

```typescript
// Use Mistral Large for complex tasks
const large = await ai.generate({
  input: { text: "Analyze this complex business scenario..." },
  provider: "mistral",
  model: "mistral-large-latest",
  temperature: 0.7,
  maxTokens: 2000,
});

// Use Codestral for code generation
const code = await ai.generate({
  input: { text: "Create a FastAPI application with authentication" },
  provider: "mistral",
  model: "codestral-latest",
});
```

### Streaming Responses

```typescript
// Stream long responses for better UX
for await (const chunk of ai.stream({
  input: { text: "Write a detailed technical article about microservices" },
  provider: "mistral",
  model: "mistral-large-latest",
})) {
  process.stdout.write(chunk.content);
}
```

### Multi-Language Support

```typescript
// Mistral excels at European languages
const languages = [
  { lang: "French", prompt: "Expliquez la blockchain" },
  { lang: "Spanish", prompt: "Explica la inteligencia artificial" },
  { lang: "German", prompt: "Erkläre maschinelles Lernen" },
  { lang: "Italian", prompt: "Spiega il deep learning" },
];

for (const { lang, prompt } of languages) {
  const result = await ai.generate({
    input: { text: prompt },
    provider: "mistral",
  });
  console.log(`${lang}: ${result.content}`);
}
```

### Cost Tracking

```typescript
// Track costs with analytics
const result = await ai.generate({
  input: { text: "Your prompt" },
  provider: "mistral",
  model: "mistral-small-latest",
  enableAnalytics: true,
});

// Calculate cost (mistral-small: €2/1M tokens)
const cost = (result.usage.total / 1_000_000) * 2;
console.log(`Cost: €${cost.toFixed(4)}`);
console.log(`Tokens used: ${result.usage.total}`);
```

---

## CLI Usage

### Basic Commands

```bash
# Generate with default model
npx @juspay/neurolink generate "Hello Mistral" --provider mistral

# Use specific model
npx @juspay/neurolink gen "Write code" --provider mistral --model "codestral-latest"

# Stream response
npx @juspay/neurolink stream "Tell a story" --provider mistral

# Check status
npx @juspay/neurolink status --provider mistral
```

### Advanced Usage

```bash
# With temperature and max tokens
npx @juspay/neurolink gen "Creative writing" \
  --provider mistral \
  --model "mistral-large-latest" \
  --temperature 0.9 \
  --max-tokens 2000

# Code generation with Codestral
npx @juspay/neurolink gen "Create a React component" \
  --provider mistral \
  --model "codestral-latest" \
  > component.tsx

# Interactive mode
npx @juspay/neurolink loop --provider mistral --model "mistral-large-latest"
```

### Cost-Effective Workflows

```bash
# Use mistral-small for production (cheaper)
npx @juspay/neurolink gen "Customer query: How do I reset my password?" \
  --provider mistral \
  --model "mistral-small-latest"

# Use mistral-large only for complex tasks
npx @juspay/neurolink gen "Analyze quarterly financial performance" \
  --provider mistral \
  --model "mistral-large-latest"
```

---

## Configuration Options

### Environment Variables

```bash
# Required
MISTRAL_API_KEY=your_api_key_here

# Optional
MISTRAL_BASE_URL=https://api.mistral.ai  # Custom endpoint
MISTRAL_DEFAULT_MODEL=mistral-small-latest  # Default model
MISTRAL_TIMEOUT=60000  # Request timeout (ms)
MISTRAL_REGION=eu  # Enforce EU endpoints
```

### Programmatic Configuration

```typescript
// Configure via environment variables:
//   MISTRAL_API_KEY=your-key
//   MISTRAL_DEFAULT_MODEL=mistral-small-latest
//   MISTRAL_REGION=eu
//   MISTRAL_TIMEOUT=60000
const ai = new NeuroLink();

const result = await ai.generate({
  input: { text: "Your prompt" },
  provider: "mistral",
});
```

---

## Enterprise Deployment

### Production Setup

```typescript
// Enterprise-grade Mistral configuration via environment variables:
//   MISTRAL_API_KEY=your-key
//   MISTRAL_REGION=eu
//   MISTRAL_TIMEOUT=120000
const enterpriseAI = new NeuroLink({
  enableOrchestration: true, // Enable provider orchestration/failover
});

// Use Mistral as primary, with Anthropic as fallback
const result = await enterpriseAI.generate({
  input: { text: "Enterprise query" },
  provider: "mistral",
});
```

### Multi-Region Deployment

```typescript
// Serve EU and global users
// Configure MISTRAL_REGION=eu in your environment
const multiRegionAI = new NeuroLink();

// Route EU users to Mistral (EU data residency)
async function handleRequest(userRegion: string, prompt: string) {
  const provider = userRegion === "EU" ? "mistral" : "openai";
  return multiRegionAI.generate({
    input: { text: prompt },
    provider,
  });
}
```

### Cost Optimization

```typescript
// Smart model selection based on complexity
async function generateWithCostOptimization(prompt: string) {
  const complexity = estimateComplexity(prompt);

  const model =
    complexity > 0.7
      ? "mistral-large-latest" // Complex: €8/1M
      : "mistral-small-latest"; // Simple: €2/1M

  return await ai.generate({
    input: { text: prompt },
    provider: "mistral",
    model,
  });
}

function estimateComplexity(prompt: string): number {
  // Complexity scoring constants (0-1 scale)
  const LENGTH_WEIGHT = 0.3; // Characters per 1000
  const CODE_COMPLEXITY_WEIGHT = 0.4; // Technical implementation tasks
  const ANALYSIS_COMPLEXITY_WEIGHT = 0.5; // Deep analysis/reasoning tasks
  const LENGTH_SCALE = 1000; // Normalize character count

  const length = prompt.length;
  const hasCodeKeywords = /function|class|api|database/i.test(prompt);
  const hasAnalysisKeywords = /analyze|compare|evaluate|assess/i.test(prompt);

  return (
    (length / LENGTH_SCALE) * LENGTH_WEIGHT +
    (hasCodeKeywords ? CODE_COMPLEXITY_WEIGHT : 0) +
    (hasAnalysisKeywords ? ANALYSIS_COMPLEXITY_WEIGHT : 0)
  );
}
```

---

## Troubleshooting

### Common Issues

#### 1. "Invalid API Key"

**Problem**: API key is incorrect or expired.

**Solution**:

```bash
# Verify key at console.mistral.ai
# Ensure no extra spaces in .env
MISTRAL_API_KEY=your_key_here  # ✅ Correct
MISTRAL_API_KEY= your_key_here # ❌ Extra space
```

#### 2. "Rate Limit Exceeded"

**Problem**: Exceeded free tier or paid tier limits.

**Solution**:

```typescript
// Implement exponential backoff
async function generateWithBackoff(prompt, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await ai.generate({
        input: { text: prompt },
        provider: "mistral",
      });
    } catch (error) {
      if (error.message.includes("rate limit")) {
        const delay = Math.pow(2, i) * 1000;
        await new Promise((r) => setTimeout(r, delay));
      } else {
        throw error;
      }
    }
  }
}
```

#### 3. "Insufficient Credits"

**Problem**: Free tier exhausted.

**Solution**:

- Add payment method in Mistral console
- Use fallback provider
- Monitor usage:

```typescript
// Track usage to avoid surprises
const result = await ai.generate({
  input: { text: prompt },
  provider: "mistral",
  enableAnalytics: true,
});

console.log(`Tokens used: ${result.usage.total}`);
console.log(`Estimated cost: €${(result.usage.total / 1_000_000) * 2}`);
```

#### 4. Slow Response Times

**Problem**: Model or network latency.

**Solution**:

```typescript
// Use streaming for immediate feedback
for await (const chunk of ai.stream({
  input: { text: "Long prompt requiring detailed response" },
  provider: "mistral",
})) {
  // Display partial results immediately
  console.log(chunk.content);
}
```

---

## Best Practices

### 1. GDPR-Compliant Usage

```typescript
// ✅ Good: Anonymize user data
const result = await ai.generate({
  input: { text: sanitizeUserInput(userQuery) },
  provider: "mistral",
  metadata: {
    userId: hashUserId(userId), // Hash, don't store raw
    timestamp: new Date().toISOString(),
    purpose: "customer-support",
  },
});

// Document processing
await auditLog.record({
  action: "ai-generation",
  provider: "mistral",
  legalBasis: "legitimate-interest",
  dataRetention: "30-days",
});
```

### 2. Cost Optimization

```typescript
// ✅ Good: Use appropriate model for task
const customerSupport = await ai.generate({
  input: { text: "How do I reset my password?" },
  provider: "mistral",
  model: "mistral-small-latest", // €2/1M vs €8/1M
});

// ✅ Good: Cache common queries
const cache = new Map();
const cacheKey = `mistral:${userQuery}`;

if (cache.has(cacheKey)) {
  return cache.get(cacheKey);
}

const result = await ai.generate({
  input: { text: userQuery },
  provider: "mistral",
});

cache.set(cacheKey, result);
```

### 3. Multi-Language Support

```typescript
// ✅ Good: Leverage Mistral's multilingual strength
const supportedLanguages = ["en", "fr", "es", "de", "it"];

async function generateInLanguage(prompt, language) {
  const languagePrompt =
    language !== "en" ? `[Respond in ${language}] ${prompt}` : prompt;

  return await ai.generate({
    input: { text: languagePrompt },
    provider: "mistral", // Excellent European language support
  });
}
```

---

## Related Documentation

- **[Provider Setup Guide](../provider-setup.md)** - General provider configuration
- **[GDPR Compliance Guide](../../guides/enterprise/compliance.md)** - GDPR implementation
- **[Cost Optimization](../../guides/enterprise/cost-optimization.md)** - Reduce AI costs
- **[Multi-Region Deployment](../../guides/enterprise/multi-region.md)** - Geographic distribution

---

## Additional Resources

- **[Mistral AI Console](https://console.mistral.ai/)** - API keys and billing
- **[Mistral AI Documentation](https://docs.mistral.ai/)** - Official docs
- **[Mistral Models](https://docs.mistral.ai/models/)** - Model capabilities
- **[Pricing](https://mistral.ai/pricing/)** - Current pricing

---

**Need Help?** Join our [GitHub Discussions](https://github.com/juspay/neurolink/discussions) or open an [issue](https://github.com/juspay/neurolink/issues).
