---
title: Hugging Face Provider Guide
description: Complete setup guide for Hugging Face Inference API with 100,000+ open-source models
keywords: hugging face, inference api, open source, AI models, provider setup
---

# Hugging Face Provider Guide

**Access 100,000+ open-source AI models through Hugging Face's free inference API**

---

## Overview

Hugging Face is the world's largest platform for open-source AI models, hosting over 100,000 models spanning text generation, code generation, translation, summarization, and more. NeuroLink's Hugging Face provider gives you free access to this vast ecosystem through a unified interface.

:::tip[Free Tier Advantage]
Hugging Face's inference API is completely free for most models, with a generous daily cap (~1,000 requests/day per model). Perfect for development, testing, and low-to-medium production workloads without any cost concerns.
:::

### Key Benefits

- **🆓 Free Access**: No API costs - completely free to use
- **🌍 100,000+ Models**: Largest collection of open-source models
- **🔓 Open Source**: All models are open and transparent
- **⚡ Quick Start**: No credit card required
- **🎯 Specialized Models**: Models fine-tuned for specific tasks
- **🔬 Research-Friendly**: Access to latest research models

### Use Cases

- **Experimentation**: Try different models without cost concerns
- **Research**: Access cutting-edge research models
- **Budget-Constrained**: Production usage without API costs
- **Specialized Tasks**: Fine-tuned models for specific domains
- **Learning**: Perfect for students and developers learning AI

---

## Quick Start

### 1. Get Your API Token

1. Visit [Hugging Face](https://huggingface.co/)
2. Create a free account (no credit card required)
3. Go to [Settings → Access Tokens](https://huggingface.co/settings/tokens)
4. Click "New token"
5. Give it a name (e.g., "NeuroLink")
6. Select "Read" permissions
7. Copy the token (starts with `hf_...`)

### 2. Configure NeuroLink

Add to your `.env` file:

```bash
HUGGINGFACE_API_KEY=hf_your_token_here
```

:::warning[Security Best Practice]
Never commit your API token to version control. Always use environment variables and add `.env` to your `.gitignore` file.
:::

### 3. Test the Setup

```bash
# CLI - Test with default model
npx @juspay/neurolink generate "Hello from Hugging Face!" --provider huggingface

# CLI - Use specific model
npx @juspay/neurolink generate "Write a poem" --provider huggingface --model "Qwen/Qwen2.5-72B-Instruct"

# SDK
node -e "
const { NeuroLink } = require('@juspay/neurolink');
(async () => {
  const ai = new NeuroLink();
  const result = await ai.generate({
    input: { text: 'Hello from Hugging Face!' },
    provider: 'huggingface'
  });
  console.log(result.content);
})();
"
```

---

## Model Selection Guide

### Popular Models by Category

#### 1. **General Text Generation**

| Model                                           | Size    | Description                          | Best For                        |
| ----------------------------------------------- | ------- | ------------------------------------ | ------------------------------- |
| `Qwen/Qwen2.5-72B-Instruct`                     | 72B     | Qwen 2.5 instruction-tuned (default) | General tasks, high quality     |
| `Qwen/Qwen3-235B-A22B`                          | 235B    | Latest Qwen 3 MoE flagship           | Complex reasoning, multilingual |
| `Qwen/Qwen3-32B`                                | 32B     | Qwen 3 dense model                   | Balanced quality and speed      |
| `Qwen/Qwen3-8B`                                 | 8B      | Qwen 3 efficient model               | Fast responses, low cost        |
| `meta-llama/Llama-3.3-70B-Instruct`             | 70B     | Meta Llama 3.3 instruction-tuned     | Conversational AI, reasoning    |
| `meta-llama/Llama-4-Scout-17B-16E-Instruct`     | 17B MoE | Meta Llama 4 Scout                   | Efficient multimodal tasks      |
| `meta-llama/Llama-4-Maverick-17B-128E-Instruct` | 17B MoE | Meta Llama 4 Maverick                | Advanced multimodal reasoning   |
| `deepseek-ai/DeepSeek-R1`                       | 671B    | DeepSeek reasoning model             | Math, logic, step-by-step       |
| `deepseek-ai/DeepSeek-V3-0324`                  | 671B    | DeepSeek V3 general-purpose          | General tasks, coding           |
| `mistralai/Mistral-Large-2501`                  | 123B    | Mistral Large 3                      | Enterprise, multilingual        |
| `mistralai/Mistral-Small-3.1-24B-Instruct`      | 24B     | Mistral Small 3.1                    | Fast, cost-effective            |
| `google/gemma-3-27b-it`                         | 27B     | Google Gemma 3 instruction-tuned     | General tasks, research         |
| `google/gemma-3-12b-it`                         | 12B     | Google Gemma 3 mid-size              | Balanced performance            |
| `google/gemma-3-4b-it`                          | 4B      | Google Gemma 3 lightweight           | Edge deployment, fast           |
| `microsoft/phi-4`                               | 14B     | Microsoft Phi-4                      | Reasoning, STEM tasks           |
| `microsoft/Phi-4-mini-instruct`                 | 3.8B    | Microsoft Phi-4-mini                 | Lightweight, on-device          |

#### 2. **Code Generation**

| Model                               | Description                       | Best For               |
| ----------------------------------- | --------------------------------- | ---------------------- |
| `mistralai/Devstral-Small-2507`     | Mistral Devstral 2 code model     | Code generation, IDE   |
| `Qwen/Qwen2.5-Coder-32B-Instruct`   | Qwen 2.5 code specialist          | Complex coding tasks   |
| `deepseek-ai/DeepSeek-V3-0324`      | DeepSeek V3 with strong code perf | Full-stack development |
| `meta-llama/Llama-3.3-70B-Instruct` | Llama 3.3 with code capabilities  | Code review, refactor  |

#### 3. **Summarization**

| Model                     | Description               | Best For             |
| ------------------------- | ------------------------- | -------------------- |
| `facebook/bart-large-cnn` | News summarization        | Articles, news       |
| `Qwen/Qwen3-8B`           | Qwen 3 with summarization | General summaries    |
| `google/pegasus-xsum`     | Extreme summarization     | Very brief summaries |

#### 4. **Translation**

| Model                                      | Languages      | Best For                   |
| ------------------------------------------ | -------------- | -------------------------- |
| `facebook/mbart-large-50-many-to-many-mmt` | 50 languages   | Multi-language translation |
| `Helsinki-NLP/opus-mt-*`                   | Language pairs | Specific language pairs    |

#### 5. **Question Answering**

| Model                         | Description         | Best For       |
| ----------------------------- | ------------------- | -------------- |
| `deepset/roberta-base-squad2` | SQuAD-trained       | Factual Q&A    |
| `Qwen/Qwen2.5-72B-Instruct`   | General QA via chat | Open-ended Q&A |

### Model Selection by Use Case

```typescript
// General conversation
const general = await ai.generate({
  input: { text: "Explain quantum computing" },
  provider: "huggingface",
  model: "Qwen/Qwen2.5-72B-Instruct",
});

// Code generation
const code = await ai.generate({
  input: { text: "Write a Python function to sort a list" },
  provider: "huggingface",
  model: "mistralai/Devstral-Small-2507",
});

// Summarization
const summary = await ai.generate({
  input: { text: "Summarize: [long article text]" },
  provider: "huggingface",
  model: "facebook/bart-large-cnn",
});

// Translation
const translation = await ai.generate({
  input: { text: "Translate to French: Hello, how are you?" },
  provider: "huggingface",
  model: "facebook/mbart-large-50-many-to-many-mmt",
});
```

---

## Free Tier Details

### What's Included

- ✅ **Unlimited requests** to public models
- ✅ **No cost** - completely free
- ✅ **No credit card** required
- ✅ **Rate limits**: 1,000 requests/day per model (generous)
- ✅ **Access to 100,000+** public models

### Rate Limits

- **Per Model**: ~1,000 requests/day
- **Strategy**: Use different models to scale
- **Best Practice**: Combine with other providers for production

```typescript
// Rate limit friendly approach
const ai = new NeuroLink({
  providers: [
    { name: "huggingface", priority: 1 }, // Free tier first
    { name: "google-ai", priority: 2 }, // Fallback to Google AI
  ],
});
```

### Limitations

⚠️ **Free Tier Constraints:**

- Models load on-demand (first request may be slow)
- Rate limits per model (use multiple models to scale)
- No guaranteed uptime (community infrastructure)
- Some popular models may have queues

💡 **For Production:**

- Use Hugging Face for experimentation
- Consider paid inference for critical workloads
- Combine with other providers for reliability

---

## SDK Integration

### Basic Usage

```typescript
import { NeuroLink } from "@juspay/neurolink";

const ai = new NeuroLink();

// Simple generation
const result = await ai.generate({
  input: { text: "Write a haiku about coding" },
  provider: "huggingface",
});

console.log(result.content);
```

### With Specific Model

```typescript
// Use Qwen 2.5 for instruction following
const qwen = await ai.generate({
  input: { text: "Explain Docker in simple terms" },
  provider: "huggingface",
  model: "Qwen/Qwen2.5-72B-Instruct",
});

// Use Qwen Coder for code generation
const coder = await ai.generate({
  input: { text: "Create a REST API endpoint in Express.js" },
  provider: "huggingface",
  model: "Qwen/Qwen2.5-Coder-32B-Instruct",
});
```

### Multi-Model Strategy

```typescript
// Try multiple models for best results
const models = [
  "Qwen/Qwen2.5-72B-Instruct",
  "meta-llama/Llama-3.3-70B-Instruct",
  "google/gemma-3-27b-it",
];

for (const model of models) {
  try {
    const result = await ai.generate({
      input: { text: "Your prompt here" },
      provider: "huggingface",
      model,
    });
    console.log(`${model}: ${result.content}`);
  } catch (error) {
    console.log(`${model} failed, trying next...`);
  }
}
```

### With Streaming

```typescript
// Stream responses for better UX
const result = await ai.stream({
  input: { text: "Write a long story about space exploration" },
  provider: "huggingface",
  model: "Qwen/Qwen2.5-72B-Instruct",
});

for await (const chunk of result.stream) {
  process.stdout.write(chunk.content);
}
```

### With Error Handling

```typescript
try {
  const result = await ai.generate({
    input: { text: "Your prompt" },
    provider: "huggingface",
    maxTokens: 500,
    temperature: 0.7,
  });
  console.log(result.content);
} catch (error) {
  if (error.message.includes("rate limit")) {
    console.log("Rate limited - try another model or wait");
  } else if (error.message.includes("loading")) {
    console.log("Model is loading - try again in a moment");
  } else {
    console.error("Error:", error.message);
  }
}
```

---

## CLI Usage

### Basic Commands

```bash
# Generate with default model
npx @juspay/neurolink generate "Hello world" --provider huggingface

# Use specific model
npx @juspay/neurolink gen "Write code" --provider huggingface --model "Qwen/Qwen2.5-Coder-32B-Instruct"

# Stream response
npx @juspay/neurolink stream "Tell a story" --provider huggingface

# Check available models
npx @juspay/neurolink models --provider huggingface
```

### Advanced Usage

```bash
# With temperature control
npx @juspay/neurolink gen "Creative story" \
  --provider huggingface \
  --model "Qwen/Qwen2.5-72B-Instruct" \
  --temperature 0.9 \
  --max-tokens 1000

# Save output to file
npx @juspay/neurolink gen "Technical documentation" \
  --provider huggingface \
  --model "google/gemma-3-27b-it" \
  > output.txt

# Interactive mode
npx @juspay/neurolink loop --provider huggingface
```

### Model Comparison

```bash
# Compare different models
for model in "Qwen/Qwen2.5-72B-Instruct" \
             "meta-llama/Llama-3.3-70B-Instruct" \
             "google/gemma-3-27b-it"; do
  echo "Testing $model:"
  npx @juspay/neurolink gen "What is AI?" \
    --provider huggingface \
    --model "$model"
  echo "---"
done
```

---

## Configuration Options

### Environment Variables

```bash
# Required
HUGGINGFACE_API_KEY=hf_your_token_here

# Optional
HUGGINGFACE_BASE_URL=https://api-inference.huggingface.co  # Custom endpoint
HUGGINGFACE_MODEL=Qwen/Qwen2.5-72B-Instruct  # Default model
HUGGINGFACE_TIMEOUT=60000  # Request timeout (ms)
```

### Programmatic Configuration

```typescript
const ai = new NeuroLink({
  providers: [
    {
      name: "huggingface",
      config: {
        apiKey: process.env.HUGGINGFACE_API_KEY,
        defaultModel: "Qwen/Qwen2.5-72B-Instruct",
        timeout: 60000,
      },
    },
  ],
});
```

---

## Troubleshooting

### Common Issues

#### 1. "Model is currently loading"

**Problem**: Model hasn't been used recently and needs to load.

**Solution**:

```bash
# Wait 20-30 seconds and retry
# Or use a popular model that's always loaded
npx @juspay/neurolink gen "test" \
  --provider huggingface \
  --model "Qwen/Qwen2.5-72B-Instruct"
```

#### 2. "Rate limit exceeded"

**Problem**: Hit the ~1,000 requests/day limit for a model.

**Solution**:

```typescript
// Switch to a different model
const alternativeModels = [
  "Qwen/Qwen2.5-72B-Instruct",
  "google/gemma-3-27b-it",
  "meta-llama/Llama-3.3-70B-Instruct",
];

// Or use multi-provider fallback
const ai = new NeuroLink({
  providers: [
    { name: "huggingface", priority: 1 },
    { name: "google-ai", priority: 2 }, // Fallback
  ],
});
```

#### 3. "Invalid API token"

**Problem**: Token is incorrect or expired.

**Solution**:

1. Verify token at https://huggingface.co/settings/tokens
2. Ensure token has "Read" permissions
3. Check for typos in `.env` file
4. Token should start with `hf_`

#### 4. "Model not found"

**Problem**: Model name is incorrect or private.

**Solution**:

```bash
# Verify model exists at huggingface.co
# Use exact model ID: username/model-name
npx @juspay/neurolink gen "test" \
  --provider huggingface \
  --model "Qwen/Qwen2.5-72B-Instruct"  # ✅ Correct format
```

#### 5. Slow Response Times

**Problem**: Model is loading or under high load.

**Solution**:

- Use popular models (always loaded)
- Add timeout handling
- Consider caching results
- Use streaming for long responses

```typescript
const result = await ai.generate({
  input: { text: "Your prompt" },
  provider: "huggingface",
  timeout: 120000, // 2 minute timeout
});
```

---

## Best Practices

### 1. Model Selection

```typescript
// ✅ Good: Use appropriate model for task
const code = await ai.generate({
  input: { text: "Write a function" },
  model: "Qwen/Qwen2.5-Coder-32B-Instruct", // Code specialist
});

// ❌ Avoid: Using a task-specific model for unrelated tasks
const badCode = await ai.generate({
  input: { text: "Write a function" },
  model: "facebook/bart-large-cnn", // Summarization model, not for code
});
```

### 2. Rate Limit Management

```typescript
// ✅ Good: Rotate between models
const models = [
  "Qwen/Qwen2.5-72B-Instruct",
  "google/gemma-3-27b-it",
  "meta-llama/Llama-3.3-70B-Instruct",
];

let requestCount = 0; // Track the number of requests
const modelIndex = requestCount % models.length;
const result = await ai.generate({
  input: { text: prompt },
  provider: "huggingface",
  model: models[modelIndex],
});
requestCount++; // Increment after each request
```

### 3. Error Handling

```typescript
// ✅ Good: Handle model loading gracefully
async function generateWithRetry(prompt, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await ai.generate({
        input: { text: prompt },
        provider: "huggingface",
      });
    } catch (error) {
      if (error.message.includes("loading") && i < maxRetries - 1) {
        console.log("Model loading, waiting 30s...");
        await new Promise((resolve) => setTimeout(resolve, 30000));
      } else {
        throw error;
      }
    }
  }
}
```

### 4. Production Deployment

```typescript
// ✅ Good: Use Hugging Face with fallback
const ai = new NeuroLink({
  providers: [
    {
      name: "huggingface",
      priority: 1,
      config: {
        defaultModel: "Qwen/Qwen2.5-72B-Instruct",
      },
    },
    {
      name: "google-ai", // Free tier fallback
      priority: 2,
    },
    {
      name: "anthropic", // Paid fallback for critical
      priority: 3,
    },
  ],
});
```

---

## Performance Optimization

### 1. Model Warm-Up

```typescript
// Keep popular models warm with periodic requests
setInterval(async () => {
  await ai.generate({
    input: { text: "ping" },
    provider: "huggingface",
    model: "Qwen/Qwen2.5-72B-Instruct",
    maxTokens: 1,
  });
}, 300000); // Every 5 minutes
```

### 2. Caching

```typescript
// Cache responses for repeated queries
const cache = new Map();

async function cachedGenerate(prompt) {
  if (cache.has(prompt)) {
    return cache.get(prompt);
  }

  const result = await ai.generate({
    input: { text: prompt },
    provider: "huggingface",
  });

  cache.set(prompt, result);
  return result;
}
```

### 3. Parallel Requests

```typescript
// Use different models in parallel to avoid rate limits
const prompts = ["prompt1", "prompt2", "prompt3"];
const models = [
  "Qwen/Qwen2.5-72B-Instruct",
  "google/gemma-3-27b-it",
  "meta-llama/Llama-3.3-70B-Instruct",
];

const results = await Promise.all(
  prompts.map((prompt, i) =>
    ai.generate({
      input: { text: prompt },
      provider: "huggingface",
      model: models[i],
    }),
  ),
);
```

---

## Related Documentation

- **[Provider Setup Guide](../provider-setup.md)** - General provider configuration
- **[SDK API Reference](../../sdk/api-reference.md)** - Complete API documentation
- **[CLI Commands](../../cli/commands.md)** - CLI reference
- **[Multi-Provider Failover](../../guides/enterprise/multi-provider-failover.md)** - Enterprise patterns

---

## Additional Resources

- **[Hugging Face Models](https://huggingface.co/models)** - Browse all models
- **[Hugging Face Inference API](https://huggingface.co/docs/api-inference/index)** - API documentation
- **[Model Cards](https://huggingface.co/docs/hub/model-cards)** - Understanding model capabilities
- **[Hugging Face Hub](https://huggingface.co/docs/hub/index)** - Platform documentation

---

**Need Help?** Join our [GitHub Discussions](https://github.com/juspay/neurolink/discussions) or open an [issue](https://github.com/juspay/neurolink/issues).
