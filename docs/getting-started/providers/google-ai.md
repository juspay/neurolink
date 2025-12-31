---
title: Google AI Studio Provider Guide
description: Free tier access to Google's Gemini models with 1,500 requests per day
keywords: google ai studio, gemini, free tier, google AI, generative AI
---

# Google AI Studio Provider Guide

**Direct access to Google's Gemini models with generous free tier and simple API key authentication**

---

## Overview

Google AI Studio (formerly MakerSuite) provides direct access to Google's Gemini AI models with simple API key authentication and one of the most generous free tiers available. Perfect for development, prototyping, and low-volume production workloads.

!!! tip "Best Free Tier for Production"
Google AI Studio offers one of the most generous free tiers: 1,500 requests/day with Gemini 2.0 Flash. Perfect for startups and small projects to run in production at zero cost.

### Key Benefits

- **🆓 Generous Free Tier**: 15 requests/minute, 1M tokens/minute, 1500 requests/day
- **⚡ Fast Setup**: Single API key, no service accounts required
- **🎯 Gemini Models**: Access to Gemini 3 (with Extended Thinking), Gemini 2.0 Flash, Gemini 1.5 Pro, and more
- **💰 Cost-Effective**: Free tier covers most development needs
- **🔧 Simple Auth**: No complex GCP setup needed
- **📊 Multimodal**: Text, images, video, and audio support

### Use Cases

- **Rapid Prototyping**: Quick AI integration without GCP complexity
- **Development**: Free tier perfect for development and testing
- **Low-Volume Production**: Small apps within free tier limits
- **Multimodal Applications**: Image, video, and audio processing
- **Cost-Sensitive Projects**: Generous free tier reduces costs

---

## Quick Start

### 1. Get Your API Key

1. Visit [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account (no GCP project needed)
3. Click **Get API Key** in the top navigation
4. Click **Create API Key**
5. Copy the generated key (starts with `AIza`)

### 2. Configure NeuroLink

Add to your `.env` file:

```bash
GOOGLE_AI_API_KEY=AIza-your-api-key-here
```

### 3. Test the Setup

```bash
# CLI - Test with default model
npx @juspay/neurolink generate "Hello from Google AI!" --provider google-ai

# CLI - Use specific Gemini model
npx @juspay/neurolink generate "Explain quantum physics" \
  --provider google-ai \
  --model "gemini-2.0-flash"

# SDK
node -e "
const { NeuroLink } = require('@juspay/neurolink');
(async () => {
  const ai = new NeuroLink();
  const result = await ai.generate({
    input: { text: 'Hello from Gemini!' },
    provider: 'google-ai'
  });
  console.log(result.content);
})();
"
```

---

## Free Tier Details

### Current Limits (Updated 2025)

| Resource                      | Free Tier Limit | Notes                            |
| ----------------------------- | --------------- | -------------------------------- |
| **Requests per Minute (RPM)** | 15 RPM          | Per API key                      |
| **Tokens per Minute (TPM)**   | 1M TPM          | Combined input + output          |
| **Requests per Day (RPD)**    | 1,500 RPD       | Rolling 24-hour window           |
| **Concurrent Requests**       | 15              | Max simultaneous requests        |
| **Context Length**            | Up to 2M tokens | Model-dependent (Gemini 1.5 Pro) |

### Free Tier Capacity Estimate

```
Daily Capacity:
- 1,500 requests/day × 500 tokens/request = 750K tokens/day
- Equivalent to ~300 pages of text per day
- Or ~150 detailed conversations

Monthly Capacity (30 days):
- 45,000 requests/month
- ~22.5M tokens/month
- Covers most small-medium applications
```

### When to Upgrade

You should consider upgrading to **Vertex AI** when:

- ✅ Exceeding 1,500 requests/day consistently
- ✅ Need for SLA guarantees
- ✅ Enterprise compliance requirements (HIPAA, SOC2)
- ✅ Multi-region deployment
- ✅ Advanced security features (VPC, customer-managed encryption)
- ✅ Fine-tuning custom models

---

## Model Selection Guide

### Available Gemini Models

| Model                      | Description                   | Context    | Best For                             | Free Tier |
| -------------------------- | ----------------------------- | ---------- | ------------------------------------ | --------- |
| **gemini-3-pro-preview**   | Latest flagship with thinking | 2M tokens  | Complex reasoning, extended thinking | ✅ Yes    |
| **gemini-3-flash-preview** | Fast model with thinking      | 1M tokens  | Speed + reasoning, real-time         | ✅ Yes    |
| **gemini-2.0-flash**       | Production fast model         | 1M tokens  | Speed, real-time apps                | ✅ Yes    |
| **gemini-1.5-pro**         | Proven capable model          | 2M tokens  | Complex reasoning, analysis          | ✅ Yes    |
| **gemini-1.5-flash**       | Balanced model                | 1M tokens  | General tasks                        | ✅ Yes    |
| **gemini-1.0-pro**         | Legacy stable model           | 32K tokens | Production stability                 | ✅ Yes    |

### Model Selection by Use Case

```typescript
// Extended thinking for complex problems (Gemini 3)
const deepReasoning = await ai.generate({
  input: { text: "Solve this complex mathematical proof..." },
  provider: "google-ai",
  model: "gemini-3-pro-preview", // Best reasoning with thinking
  thinkingLevel: "high", // Enable extended thinking
});

// Fast reasoning with thinking (Gemini 3 Flash)
const fastReasoning = await ai.generate({
  input: { text: "Analyze this code and find bugs" },
  provider: "google-ai",
  model: "gemini-3-flash-preview", // Fast + reasoning
  thinkingLevel: "medium",
});

// Real-time applications (speed priority)
const realtime = await ai.generate({
  input: { text: "Quick customer query" },
  provider: "google-ai",
  model: "gemini-2.0-flash", // Fastest response
});

// Complex reasoning (quality priority)
const complex = await ai.generate({
  input: { text: "Analyze this complex business scenario..." },
  provider: "google-ai",
  model: "gemini-1.5-pro", // Most capable, 2M context
});

// Multimodal processing
const multimodal = await ai.generate({
  input: {
    text: "Describe this image",
    images: ["data:image/jpeg;base64,..."],
  },
  provider: "google-ai",
  model: "gemini-1.5-pro", // Best for multimodal
});

// Cost-optimized general tasks
const general = await ai.generate({
  input: { text: "General customer support query" },
  provider: "google-ai",
  model: "gemini-1.5-flash", // Balanced performance/cost
});
```

### Context Length Comparison

```
Model Context Limits:
- gemini-3-pro-preview:   2,000,000 tokens (1000 novels)
- gemini-3-flash-preview: 1,000,000 tokens (500 novels)
- gemini-2.0-flash:       1,000,000 tokens (500 novels)
- gemini-1.5-pro:         2,000,000 tokens (1000 novels)
- gemini-1.5-flash:       1,000,000 tokens (500 novels)
- gemini-1.0-pro:            32,000 tokens (16 novels)

For comparison:
- GPT-4 Turbo:          128,000 tokens
- Claude 3.5 Sonnet:    200,000 tokens
```

---

## Extended Thinking (Gemini 3)

Gemini 3 models introduce **Extended Thinking**, a feature that allows the model to "think" more deeply before responding. This improves reasoning quality for complex tasks like mathematical proofs, code analysis, and multi-step problem solving.

### Thinking Levels

| Level       | Description                        | Use Case                            | Token Budget |
| ----------- | ---------------------------------- | ----------------------------------- | ------------ |
| **minimal** | Basic reasoning with minimal usage | Quick decisions, simple queries     | ~500 tokens  |
| **low**     | Quick reasoning, minimal overhead  | Simple analysis, quick decisions    | ~1K tokens   |
| **medium**  | Balanced thinking depth            | Code review, moderate complexity    | ~8K tokens   |
| **high**    | Deep reasoning, maximum thinking   | Complex proofs, architecture design | ~24K tokens  |

### Configuration

```typescript
import { NeuroLink } from "@juspay/neurolink";

const ai = new NeuroLink();

// Enable extended thinking with thinkingLevel
const result = await ai.generate({
  input: { text: "Prove that the square root of 2 is irrational" },
  provider: "google-ai",
  model: "gemini-3-pro-preview",
  thinkingLevel: "high", // 'minimal' | 'low' | 'medium' | 'high'
});

console.log(result.content);
```

### Extended Thinking Examples

```typescript
// Mathematical reasoning with high thinking
const mathProof = await ai.generate({
  input: {
    text: "Prove the Pythagorean theorem using at least three different methods",
  },
  provider: "google-ai",
  model: "gemini-3-pro-preview",
  thinkingLevel: "high",
});

// Code architecture analysis
const codeReview = await ai.generate({
  input: {
    text: `Review this code for potential issues and suggest improvements:

    ${codeSnippet}`,
  },
  provider: "google-ai",
  model: "gemini-3-flash-preview",
  thinkingLevel: "medium",
});

// Quick analysis with minimal thinking overhead
const quickAnalysis = await ai.generate({
  input: { text: "What's the time complexity of binary search?" },
  provider: "google-ai",
  model: "gemini-3-flash-preview",
  thinkingLevel: "low",
});
```

### CLI Usage with Thinking

```bash
# Use Gemini 3 with extended thinking
npx @juspay/neurolink generate "Solve this logic puzzle..." \
  --provider google-ai \
  --model "gemini-3-pro-preview" \
  --thinking-level high

# Fast reasoning with medium thinking
npx @juspay/neurolink generate "Analyze this code pattern" \
  --provider google-ai \
  --model "gemini-3-flash-preview" \
  --thinking-level medium
```

### Best Practices for Extended Thinking

1. **Match thinking level to task complexity**: Use `low` for simple queries, `high` for complex reasoning
2. **Consider latency**: Higher thinking levels increase response time
3. **Token budget awareness**: Thinking tokens count toward your quota
4. **Streaming recommended**: Use streaming for high thinking levels to see progress

```typescript
// Stream thinking responses for better UX
for await (const chunk of ai.stream({
  input: { text: "Design a distributed caching system" },
  provider: "google-ai",
  model: "gemini-3-pro-preview",
  thinkingLevel: "high",
})) {
  process.stdout.write(chunk.content);
}
```

---

## Rate Limiting and Quotas

### Understanding Rate Limits

Google AI Studio enforces **three types of limits**:

1. **RPM (Requests Per Minute)**: 15 requests in any 60-second window
2. **TPM (Tokens Per Minute)**: 1M tokens in any 60-second window
3. **RPD (Requests Per Day)**: 1,500 requests in any 24-hour window

### Rate Limit Handling

```typescript
// ✅ Good: Implement exponential backoff
async function generateWithBackoff(prompt: string, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await ai.generate({
        input: { text: prompt },
        provider: "google-ai",
      });
    } catch (error) {
      if (error.message.includes("429") || error.message.includes("quota")) {
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        console.log(`Rate limited, retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
  throw new Error("Max retries exceeded");
}
```

### Quota Monitoring

```typescript
// Track quota usage
class QuotaTracker {
  private requestsToday = 0;
  private requestsThisMinute = 0;
  private tokensThisMinute = 0;
  private minuteStart = Date.now();
  private dayStart = Date.now();

  async checkQuota() {
    const now = Date.now();

    // Reset minute counters
    if (now - this.minuteStart > 60000) {
      this.requestsThisMinute = 0;
      this.tokensThisMinute = 0;
      this.minuteStart = now;
    }

    // Reset day counter
    if (now - this.dayStart > 86400000) {
      this.requestsToday = 0;
      this.dayStart = now;
    }

    // Check limits
    if (this.requestsThisMinute >= 15) {
      throw new Error("RPM limit reached (15/min)");
    }
    if (this.tokensThisMinute >= 1000000) {
      throw new Error("TPM limit reached (1M/min)");
    }
    if (this.requestsToday >= 1500) {
      throw new Error("RPD limit reached (1500/day)");
    }
  }

  recordUsage(tokens: number) {
    this.requestsThisMinute++;
    this.requestsToday++;
    this.tokensThisMinute += tokens;
  }
}

// Usage
const tracker = new QuotaTracker();

async function generate(prompt: string) {
  await tracker.checkQuota();

  const result = await ai.generate({
    input: { text: prompt },
    provider: "google-ai",
    enableAnalytics: true,
  });

  tracker.recordUsage(result.usage.totalTokens);
  return result;
}
```

### Rate Limiting Best Practices

```typescript
// ✅ Good: Request queuing for high-volume apps
class RequestQueue {
  private queue: Array<{
    prompt: string;
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];
  private processing = false;
  private requestsThisMinute = 0;
  private minuteStart = Date.now();

  async enqueue(prompt: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.queue.push({ prompt, resolve, reject });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      // Check rate limit (15 RPM)
      const now = Date.now();
      if (now - this.minuteStart > 60000) {
        this.requestsThisMinute = 0;
        this.minuteStart = now;
      }

      if (this.requestsThisMinute >= 15) {
        // Wait until minute resets
        await new Promise((resolve) => setTimeout(resolve, 4000)); // 4s delay
        continue;
      }

      const item = this.queue.shift()!;

      try {
        const result = await ai.generate({
          input: { text: item.prompt },
          provider: "google-ai",
        });
        this.requestsThisMinute++;
        item.resolve(result);
      } catch (error) {
        item.reject(error);
      }
    }

    this.processing = false;
  }
}

// Usage
const queue = new RequestQueue();
const result = await queue.enqueue("Your prompt");
```

---

## SDK Integration

### Basic Usage

```typescript
import { NeuroLink } from "@juspay/neurolink";

const ai = new NeuroLink();

// Simple generation
const result = await ai.generate({
  input: { text: "Explain machine learning" },
  provider: "google-ai",
});

console.log(result.content);
```

### Multimodal Capabilities

```typescript
// Image analysis
const imageAnalysis = await ai.generate({
  input: {
    text: "Describe what you see in this image",
    images: ["data:image/jpeg;base64,/9j/4AAQSkZJRg..."],
  },
  provider: "google-ai",
  model: "gemini-1.5-pro",
});

// Video analysis (Gemini 1.5 Pro)
const videoAnalysis = await ai.generate({
  input: {
    text: "Summarize the key events in this video",
    videos: ["data:video/mp4;base64,..."],
  },
  provider: "google-ai",
  model: "gemini-1.5-pro",
});

// Audio transcription and analysis
const audioAnalysis = await ai.generate({
  input: {
    text: "Transcribe and analyze the sentiment",
    audio: ["data:audio/mp3;base64,..."],
  },
  provider: "google-ai",
  model: "gemini-1.5-pro",
});
```

### Streaming Responses

```typescript
// Stream long responses for better UX
for await (const chunk of ai.stream({
  input: { text: "Write a detailed article about AI" },
  provider: "google-ai",
  model: "gemini-1.5-pro",
})) {
  process.stdout.write(chunk.content);
}
```

### Large Context Handling

```typescript
// Leverage 2M token context window (Gemini 1.5 Pro)
const largeDocument = readFileSync("large-document.txt", "utf-8");

const analysis = await ai.generate({
  input: {
    text: `Analyze this entire document and provide key insights:\n\n${largeDocument}`,
  },
  provider: "google-ai",
  model: "gemini-1.5-pro", // 2M context window
});
```

### Tool/Function Calling

```typescript
// Function calling (supported in Gemini models)
const tools = [
  {
    name: "get_weather",
    description: "Get current weather for a location",
    parameters: {
      type: "object",
      properties: {
        location: { type: "string", description: "City name" },
      },
      required: ["location"],
    },
  },
];

const result = await ai.generate({
  input: { text: "What's the weather in London?" },
  provider: "google-ai",
  model: "gemini-1.5-pro",
  tools,
});

console.log(result.toolCalls); // Function calls to execute
```

---

## CLI Usage

### Basic Commands

```bash
# Generate with default model
npx @juspay/neurolink generate "Hello Gemini" --provider google-ai

# Use specific model
npx @juspay/neurolink gen "Write code" \
  --provider google-ai \
  --model "gemini-2.0-flash"

# Stream response
npx @juspay/neurolink stream "Tell a story" --provider google-ai

# Check provider status
npx @juspay/neurolink status --provider google-ai
```

### Advanced Usage

```bash
# With temperature and max tokens
npx @juspay/neurolink gen "Creative writing prompt" \
  --provider google-ai \
  --model "gemini-1.5-pro" \
  --temperature 0.9 \
  --max-tokens 2000

# Interactive mode
npx @juspay/neurolink loop --provider google-ai --model "gemini-2.0-flash"

# Multimodal: Image analysis (requires image file)
npx @juspay/neurolink gen "Describe this image" \
  --provider google-ai \
  --model "gemini-1.5-pro" \
  --image ./photo.jpg
```

---

## Configuration Options

### Environment Variables

```bash
# Required
GOOGLE_AI_API_KEY=AIza-your-key-here

# Optional
GOOGLE_AI_MODEL=gemini-2.0-flash  # Default model
GOOGLE_AI_TIMEOUT=60000  # Request timeout (ms)
GOOGLE_AI_MAX_RETRIES=3  # Retry attempts on rate limits
```

### Programmatic Configuration

```typescript
const ai = new NeuroLink({
  providers: [
    {
      name: "google-ai",
      config: {
        apiKey: process.env.GOOGLE_AI_API_KEY,
        defaultModel: "gemini-2.0-flash",
        timeout: 60000,
        maxRetries: 3,
        retryDelay: 1000,
      },
    },
  ],
});
```

---

## Google AI Studio vs Vertex AI

### When to Use Google AI Studio

✅ **Choose Google AI Studio when:**

- Development and prototyping
- Low-volume production (<1,500 requests/day)
- Simple authentication needed
- No GCP infrastructure
- Cost sensitivity (free tier)
- Quick POCs and demos

### When to Use Vertex AI

✅ **Choose Vertex AI when:**

- High-volume production (>1,500 requests/day)
- Enterprise compliance (HIPAA, SOC2)
- SLA guarantees required
- Multi-region deployment
- VPC/private networking
- Custom model fine-tuning
- Advanced security controls

### Feature Comparison

| Feature              | Google AI Studio          | Vertex AI              |
| -------------------- | ------------------------- | ---------------------- |
| **Authentication**   | API key                   | Service account (GCP)  |
| **Free Tier**        | ✅ Yes (15 RPM, 1.5K RPD) | ❌ No                  |
| **Rate Limits**      | 15 RPM, 1M TPM            | Custom quotas          |
| **SLA**              | ❌ No                     | ✅ Yes (99.9%)         |
| **Compliance**       | Basic                     | HIPAA, SOC2, ISO       |
| **Regions**          | Global                    | Multi-region choice    |
| **VPC Support**      | ❌ No                     | ✅ Yes                 |
| **Setup Complexity** | Low (1 API key)           | High (GCP project)     |
| **Best For**         | Development, POCs         | Production, enterprise |

### Migration Path

```typescript
// Start with Google AI Studio for development
const devAI = new NeuroLink({
  providers: [
    {
      name: "google-ai",
      config: {
        apiKey: process.env.GOOGLE_AI_API_KEY,
      },
    },
  ],
});

// Migrate to Vertex AI for production
const prodAI = new NeuroLink({
  providers: [
    {
      name: "vertex",
      config: {
        projectId: "your-gcp-project",
        location: "us-central1",
        credentials: "/path/to/service-account.json",
      },
    },
  ],
});

// Hybrid: Use both with failover
const hybridAI = new NeuroLink({
  providers: [
    {
      name: "vertex",
      priority: 1, // Prefer Vertex for production
      condition: (req) => req.env === "production",
    },
    {
      name: "google-ai",
      priority: 2, // Fallback to AI Studio
      condition: (req) => req.env !== "production",
    },
  ],
});
```

---

## Troubleshooting

### Common Issues

#### 1. "API key not valid"

**Problem**: API key is incorrect or expired.

**Solution**:

```bash
# Verify key format (should start with AIza)
echo $GOOGLE_AI_API_KEY

# Regenerate key at https://aistudio.google.com/
# Ensure no extra spaces in .env
GOOGLE_AI_API_KEY=AIza-your-key  # ✅ Correct
GOOGLE_AI_API_KEY= AIza-your-key # ❌ Extra space
```

#### 2. "429 Too Many Requests"

**Problem**: Exceeded rate limits (15 RPM, 1M TPM, or 1500 RPD).

**Solution**:

```typescript
// Implement backoff strategy (see Rate Limiting section above)
// Or reduce request frequency
// Monitor quota usage

// Check current quota status
const status = await ai.checkStatus("google-ai");
console.log("Rate limit status:", status);
```

#### 3. "Resource Exhausted" (Quota)

**Problem**: Exceeded daily quota (1,500 requests/day).

**Solution**:

- Wait for quota reset (24-hour rolling window)
- Upgrade to Vertex AI for higher quotas
- Implement request caching:

```typescript
// Cache frequent queries
const cache = new Map<string, any>();

async function cachedGenerate(prompt: string) {
  if (cache.has(prompt)) {
    console.log("Cache hit");
    return cache.get(prompt);
  }

  const result = await ai.generate({
    input: { text: prompt },
    provider: "google-ai",
  });

  cache.set(prompt, result);
  return result;
}
```

#### 4. Slow Response Times

**Problem**: Network latency or model processing time.

**Solution**:

```typescript
// Use streaming for immediate feedback
for await (const chunk of ai.stream({
  input: { text: "Your prompt" },
  provider: "google-ai",
  model: "gemini-2.0-flash", // Fastest model
})) {
  // Display partial results immediately
  console.log(chunk.content);
}
```

#### 5. "Model not found"

**Problem**: Invalid or deprecated model name.

**Solution**:

```typescript
// Use current model names
const validModels = [
  "gemini-3-pro-preview", // ✅ Latest with thinking
  "gemini-3-flash-preview", // ✅ Fast with thinking
  "gemini-2.0-flash", // ✅ Production stable
  "gemini-1.5-pro", // ✅ Current
  "gemini-1.5-flash", // ✅ Current
  "gemini-pro", // ❌ Use gemini-1.0-pro instead
];

const result = await ai.generate({
  input: { text: "test" },
  provider: "google-ai",
  model: "gemini-3-flash-preview", // Use latest
});
```

---

## Best Practices

### 1. Quota Management

```typescript
// ✅ Good: Implement quota tracking
class GoogleAIClient {
  private dailyRequests = 0;
  private dayStart = Date.now();

  async generate(prompt: string) {
    // Reset daily counter
    if (Date.now() - this.dayStart > 86400000) {
      this.dailyRequests = 0;
      this.dayStart = Date.now();
    }

    // Check quota
    if (this.dailyRequests >= 1450) {
      // Buffer before hard limit
      console.warn("Approaching daily quota limit");
      // Switch to backup provider or queue request
    }

    const result = await ai.generate({
      input: { text: prompt },
      provider: "google-ai",
    });

    this.dailyRequests++;
    return result;
  }
}
```

### 2. Error Handling

```typescript
// ✅ Good: Comprehensive error handling
async function robustGenerate(prompt: string) {
  try {
    return await ai.generate({
      input: { text: prompt },
      provider: "google-ai",
    });
  } catch (error) {
    if (error.message.includes("429")) {
      // Rate limit - implement backoff
      await new Promise((r) => setTimeout(r, 2000));
      return robustGenerate(prompt);
    } else if (error.message.includes("quota")) {
      // Quota exhausted - switch provider
      return await ai.generate({
        input: { text: prompt },
        provider: "openai", // Fallback
      });
    } else if (error.message.includes("timeout")) {
      // Timeout - retry with shorter timeout
      return await ai.generate({
        input: { text: prompt },
        provider: "google-ai",
        timeout: 30000,
      });
    } else {
      throw error;
    }
  }
}
```

### 3. Model Selection

```typescript
// ✅ Good: Choose appropriate model for task
function selectModel(task: string, needsThinking: boolean = false): string {
  const taskType = analyzeTask(task);

  // Use Gemini 3 for tasks requiring deep reasoning
  if (needsThinking || /prove|reason|analyze deeply|architecture/.test(task)) {
    return taskType === "realtime"
      ? "gemini-3-flash-preview" // Fast thinking
      : "gemini-3-pro-preview"; // Deep thinking
  }

  switch (taskType) {
    case "simple":
      return "gemini-1.5-flash"; // Fast, cost-effective
    case "complex":
      return "gemini-3-pro-preview"; // High capability with thinking
    case "realtime":
      return "gemini-2.0-flash"; // Lowest latency
    case "multimodal":
      return "gemini-1.5-pro"; // Best multimodal
    default:
      return "gemini-2.0-flash"; // Default
  }
}

function analyzeTask(task: string): string {
  if (task.length < 100) return "simple";
  if (/analyze|complex|detailed|prove|reason/.test(task)) return "complex";
  if (/image|video|audio/.test(task)) return "multimodal";
  return "realtime";
}
```

### 4. Caching Strategy

```typescript
// ✅ Good: Implement response caching
import { createHash } from "crypto";

class CachedGoogleAI {
  private cache = new Map<string, { result: any; timestamp: number }>();
  private TTL = 3600000; // 1 hour

  async generate(prompt: string, options: any = {}) {
    const cacheKey = this.getCacheKey(prompt, options);
    const cached = this.cache.get(cacheKey);

    // Return cached if fresh
    if (cached && Date.now() - cached.timestamp < this.TTL) {
      console.log("Cache hit");
      return cached.result;
    }

    // Generate fresh result
    const result = await ai.generate({
      input: { text: prompt },
      provider: "google-ai",
      ...options,
    });

    // Store in cache
    this.cache.set(cacheKey, {
      result,
      timestamp: Date.now(),
    });

    return result;
  }

  private getCacheKey(prompt: string, options: any): string {
    const hash = createHash("sha256");
    hash.update(JSON.stringify({ prompt, options }));
    return hash.digest("hex");
  }
}
```

---

## Known Limitations

### Tools + JSON Schema Cannot Be Used Together

!!! warning "Critical Limitation"
Gemini models (including Gemini 3) cannot use function calling (tools) and JSON schema output simultaneously. You must choose one or the other.

**Google API Limitation:** Google AI Studio (all Gemini models including Gemini 3) cannot combine function calling with structured output (JSON schema). This is a fundamental Google API constraint documented in the [Gemini API documentation](https://ai.google.dev/gemini-api/docs/).

**Error:**

```
Function calling with a response mime type: 'application/json' is unsupported
```

**Solution:**

```typescript
// ❌ This will fail - tools + schema together
const badResult = await neurolink.generate({
  input: { text: "Analyze this data" },
  schema: MyZodSchema,
  provider: "google-ai",
  model: "gemini-3-pro-preview",
  tools: myTools, // Cannot use tools with schema!
});

// ✅ Correct approach - disable tools when using schema
const result = await neurolink.generate({
  input: { text: "Analyze this data" },
  schema: MyZodSchema,
  output: { format: "json" },
  provider: "google-ai",
  model: "gemini-3-pro-preview",
  disableTools: true, // Required for schemas
});

// ✅ Alternative - use tools without schema
const toolResult = await neurolink.generate({
  input: { text: "What's the weather in London?" },
  provider: "google-ai",
  model: "gemini-3-flash-preview",
  tools: myTools, // Works fine without schema
});
```

**Industry Context:**

- This limitation affects ALL frameworks using Gemini (LangChain, Vercel AI SDK, Agno, Instructor)
- All use the same workaround: disable tools when using schemas
- This applies to all Gemini versions including Gemini 3 preview models
- Check official Google AI Studio documentation for future updates

**Alternative Approaches:**

1. Use OpenAI or Anthropic providers (support both simultaneously)
2. Use Vertex AI with Claude models (via Anthropic integration)
3. Choose between tools OR schemas for Gemini models
4. Chain requests: first call with tools, second call with schema

### Complex Schema Limitations

**"Too many states for serving" Error:**

When using complex Zod schemas, you may encounter:

```
Error: 9 FAILED_PRECONDITION: Too many states for serving
```

**Solutions:**

1. Simplify schema (reduce nesting, array sizes)
2. Use `disableTools: true` (reduces state count)
3. Split complex operations into multiple simpler calls

See [Troubleshooting Guide](../../TROUBLESHOOTING.md#google-gemini-too-many-states-for-serving-error) for details.

---

## Related Documentation

- **[Provider Setup Guide](../provider-setup.md)** - General provider configuration
- **[Google Vertex AI Guide](./google-vertex.md)** - Enterprise Vertex AI setup
- **[Cost Optimization](../../guides/enterprise/cost-optimization.md)** - Reduce AI costs
- **[Cost Optimization](../../guides/enterprise/cost-optimization.md)** - Handle quotas and rate limits

---

## Additional Resources

- **[Google AI Studio](https://aistudio.google.com/)** - Get API keys
- **[Gemini API Documentation](https://ai.google.dev/docs)** - Official API docs
- **[Gemini Models](https://ai.google.dev/models/gemini)** - Model capabilities
- **[Pricing](https://ai.google.dev/pricing)** - Free tier and paid pricing

---

**Need Help?** Join our [GitHub Discussions](https://github.com/juspay/neurolink/discussions) or open an [issue](https://github.com/juspay/neurolink/issues).
