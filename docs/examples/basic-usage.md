# Basic Usage Examples

Simple examples to get started with NeuroLink in different scenarios and programming languages.

**Prerequisites**: Before running these examples, ensure you have configured at least one AI provider. See [Provider Configuration Guide](../getting-started/provider-setup.md) for setup instructions.

## 🚀 Quick Start Examples

### Simple Text Generation

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Basic text generation
const result = await neurolink.generate({
  input: { text: "Explain TypeScript in simple terms" },
});

console.log(result.content);
```

### CLI Basic Usage

```bash
# Simple generation
npx @juspay/neurolink gen "Write a haiku about programming"

# With specific provider
npx @juspay/neurolink gen "Explain quantum computing" --provider google-ai

# Save to file
npx @juspay/neurolink gen "Create a README template" > README.md
```

## 🔧 SDK Integration Examples

### Node.js Application

```typescript
import { NeuroLink } from "@juspay/neurolink";

class AIAssistant {
  private neurolink: NeuroLink;

  constructor() {
    this.neurolink = new NeuroLink();
  }

  async generateResponse(userMessage: string): Promise<string> {
    const result = await this.neurolink.generate({
      input: { text: userMessage },
      provider: "auto", // Auto-select best provider
      temperature: 0.7,
    });

    return result.content;
  }

  async summarizeText(text: string): Promise<string> {
    const result = await this.neurolink.generate({
      input: {
        text: `Summarize this text in 2-3 sentences: ${text}`,
      },
      maxTokens: 150,
    });

    return result.content;
  }
}

// Usage
const assistant = new AIAssistant();
const response = await assistant.generateResponse(
  "How do I deploy a Node.js app?",
);
console.log(response);
```

### Express.js API

```typescript
import express from "express";
import { NeuroLink } from "@juspay/neurolink";

const app = express();
const neurolink = new NeuroLink();

app.use(express.json());

// AI generation endpoint
app.post("/api/generate", async (req, res) => {
  try {
    const { prompt, provider = "auto" } = req.body;

    const result = await neurolink.generate({
      input: { text: prompt },
      provider: provider,
    });

    res.json({
      success: true,
      content: result.content,
      provider: result.provider,
      usage: result.usage,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Text summarization endpoint
app.post("/api/summarize", async (req, res) => {
  try {
    const { text, maxLength = 150 } = req.body;

    const result = await neurolink.generate({
      input: {
        text: `Provide a concise summary of this text: ${text}`,
      },
      maxTokens: maxLength,
      temperature: 0.3, // Lower temperature for factual summarization
    });

    res.json({
      success: true,
      summary: result.content,
      originalLength: text.length,
      summaryLength: result.content.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.listen(3000, () => {
  console.log("AI API server running on port 3000");
});
```

## ⚛️ React Integration

### Basic React Component

```typescript
import React, { useState } from "react";
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

function AIChat() {
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setLoading(true);
    try {
      const result = await neurolink.generate({
        input: { text: message },
        provider: "google-ai"
      });

      setResponse(result.content);
    } catch (error) {
      setResponse(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-chat">
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ask me anything..."
          disabled={loading}
        />
        <button type="submit" disabled={loading}>
          {loading ? "Generating..." : "Send"}
        </button>
      </form>

      {response && (
        <div className="response">
          <h3>Response:</h3>
          <p>{response}</p>
        </div>
      )}
    </div>
  );
}

export default AIChat;
```

### React Hook for AI

```typescript
import { useState, useCallback } from "react";
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

export function useAI() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (prompt: string, options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const result = await neurolink.generate({
        input: { text: prompt },
        ...options
      });

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { generate, loading, error };
}

// Usage in component
function MyComponent() {
  const { generate, loading, error } = useAI();
  const [result, setResult] = useState("");

  const handleGenerate = async () => {
    try {
      const response = await generate("Explain React hooks");
      setResult(response.content);
    } catch (err) {
      console.error("Generation failed:", err);
    }
  };

  return (
    <div>
      <button onClick={handleGenerate} disabled={loading}>
        {loading ? "Generating..." : "Generate"}
      </button>
      {error && <p style={{ color: "red" }}>Error: {error}</p>}
      {result && <div>{result}</div>}
    </div>
  );
}
```

## 🎯 Common Use Cases

### Code Generation

```typescript
async function generateCode(description: string, language: string) {
  const result = await neurolink.generate({
    input: {
      text: `Write ${language} code for: ${description}. Include comments and error handling.`,
    },
    provider: "anthropic", // Claude is great for code
    temperature: 0.3, // Lower temperature for precise code
  });

  return result.content;
}

// Usage
const pythonCode = await generateCode(
  "function to calculate compound interest",
  "Python",
);
console.log(pythonCode);
```

### Content Creation

```typescript
async function createBlogPost(topic: string, audience: string) {
  const result = await neurolink.generate({
    input: {
      text: `Write a blog post about ${topic} for ${audience}. 
             Include: introduction, main points, conclusion, and call-to-action.`,
    },
    provider: "openai",
    temperature: 0.8, // Higher temperature for creative content
    maxTokens: 1500,
  });

  return result.content;
}

// Usage
const blogPost = await createBlogPost(
  "AI automation in business",
  "small business owners",
);
```

### Data Analysis

```typescript
async function analyzeData(data: any[], question: string) {
  const dataString = JSON.stringify(data, null, 2);

  const result = await neurolink.generate({
    input: {
      text: `Analyze this data and answer: ${question}
             
             Data:
             ${dataString}`,
    },
    provider: "google-ai",
    maxTokens: 800,
  });

  return result.content;
}

// Usage
const salesData = [
  { month: "Jan", sales: 10000, region: "North" },
  { month: "Feb", sales: 12000, region: "North" },
  // ... more data
];

const analysis = await analyzeData(
  salesData,
  "What trends do you see in the sales data?",
);
```

### Multi-Model Access with LiteLLM

```typescript
async function compareResponses(prompt: string) {
  const models = [
    "openai/gpt-4o",
    "anthropic/claude-3-5-sonnet",
    "google/gemini-2.0-flash",
  ];

  const comparisons = await Promise.all(
    models.map(async (model) => {
      const result = await neurolink.generate({
        input: { text: prompt },
        provider: "litellm",
        model: model,
        temperature: 0.7,
      });

      return {
        model: model,
        response: result.content,
        provider: result.provider,
      };
    }),
  );

  return comparisons;
}

// Usage
const prompt = "Explain the benefits of renewable energy";
const responses = await compareResponses(prompt);

responses.forEach(({ model, response }) => {
  console.log(`\n${model}:`);
  console.log(response);
});
```

### Custom Model Access with SageMaker

```typescript
async function useCustomSageMakerModel(prompt: string, endpoint?: string) {
  const result = await neurolink.generate({
    input: { text: prompt },
    provider: "sagemaker",
    model: endpoint || "my-custom-model", // Use specific endpoint or default
    temperature: 0.7,
    timeout: "45s", // Longer timeout for custom models
  });

  return {
    response: result.content,
    endpoint: result.model,
    provider: result.provider,
    usage: result.usage,
  };
}

// Usage with default endpoint
const defaultResult = await useCustomSageMakerModel(
  "Analyze this customer feedback for sentiment",
);

// Usage with specific endpoint
const specificResult = await useCustomSageMakerModel(
  "Generate domain-specific recommendations",
  "my-domain-expert-model-endpoint",
);

console.log("Default model response:", defaultResult.response);
console.log("Domain model response:", specificResult.response);
```

### SageMaker Model Comparison

```typescript
async function compareSageMakerModels(prompt: string) {
  const endpoints = [
    "general-purpose-model",
    "domain-specific-model",
    "fine-tuned-customer-model",
  ];

  const comparisons = await Promise.all(
    endpoints.map(async (endpoint) => {
      try {
        const result = await neurolink.generate({
          input: { text: prompt },
          provider: "sagemaker",
          model: endpoint,
          temperature: 0.7,
          timeout: "30s",
        });

        return {
          endpoint: endpoint,
          response: result.content,
          success: true,
          responseTime: result.responseTime,
        };
      } catch (error) {
        return {
          endpoint: endpoint,
          error: error.message,
          success: false,
        };
      }
    }),
  );

  return comparisons;
}

// Usage
const prompt = "Provide recommendations for improving customer satisfaction";
const modelComparisons = await compareSageMakerModels(prompt);

modelComparisons.forEach(({ endpoint, response, success, error }) => {
  console.log(`\n${endpoint}:`);
  if (success) {
    console.log(response);
  } else {
    console.log(`❌ Error: ${error}`);
  }
});
```

### Production SageMaker Integration

```typescript
class SageMakerModelManager {
  private neurolink: NeuroLink;
  private defaultEndpoint: string;

  constructor(defaultEndpoint: string) {
    this.neurolink = new NeuroLink();
    this.defaultEndpoint = defaultEndpoint;
  }

  async predict(
    input: string,
    options: {
      endpoint?: string;
      temperature?: number;
      maxTokens?: number;
      timeout?: string;
    } = {},
  ) {
    const {
      endpoint = this.defaultEndpoint,
      temperature = 0.7,
      maxTokens = 1000,
      timeout = "30s",
    } = options;

    try {
      const result = await this.neurolink.generate({
        input: { text: input },
        provider: "sagemaker",
        model: endpoint,
        temperature,
        maxTokens,
        timeout,
      });

      return {
        success: true,
        prediction: result.content,
        endpoint: endpoint,
        usage: result.usage,
        responseTime: result.responseTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        endpoint: endpoint,
      };
    }
  }

  async batchPredict(inputs: string[], endpoint?: string) {
    const results = [];

    for (const input of inputs) {
      const result = await this.predict(input, { endpoint });
      results.push(result);

      // Rate limiting between requests
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return results;
  }

  async healthCheck(endpoint?: string): Promise<boolean> {
    try {
      const result = await this.predict("test", {
        endpoint,
        timeout: "10s",
      });
      return result.success;
    } catch {
      return false;
    }
  }
}

// Usage
const modelManager = new SageMakerModelManager("production-model-endpoint");

// Single prediction
const prediction = await modelManager.predict(
  "Analyze this business scenario and provide recommendations",
);

// Batch predictions
const inputs = [
  "Predict market trends for Q4",
  "Analyze customer churn risk",
  "Recommend product improvements",
];
const batchResults = await modelManager.batchPredict(inputs);

// Health check
const isHealthy = await modelManager.healthCheck();
console.log(`Model endpoint healthy: ${isHealthy}`);
```

### Multi-Provider Strategy with SageMaker

```typescript
async function hybridModelStrategy(prompt: string, useCase: string) {
  const strategies = {
    general: {
      primary: { provider: "google-ai", model: "gemini-2.5-flash" },
      fallback: { provider: "openai", model: "gpt-4o-mini" },
    },
    "domain-specific": {
      primary: { provider: "sagemaker", model: "domain-expert-model" },
      fallback: { provider: "anthropic", model: "claude-3-haiku" },
    },
    "code-generation": {
      primary: { provider: "anthropic", model: "claude-3-5-sonnet" },
      fallback: { provider: "sagemaker", model: "code-specialized-model" },
    },
  };

  const strategy = strategies[useCase] || strategies["general"];

  try {
    // Try primary model
    const result = await neurolink.generate({
      input: { text: prompt },
      provider: strategy.primary.provider,
      model: strategy.primary.model,
      timeout: "30s",
    });

    return {
      ...result,
      modelUsed: "primary",
      strategy: strategy.primary,
    };
  } catch (primaryError) {
    console.log(`Primary model failed, trying fallback...`);

    try {
      // Fallback to secondary model
      const result = await neurolink.generate({
        input: { text: prompt },
        provider: strategy.fallback.provider,
        model: strategy.fallback.model,
        timeout: "30s",
      });

      return {
        ...result,
        modelUsed: "fallback",
        strategy: strategy.fallback,
        primaryError: primaryError.message,
      };
    } catch (fallbackError) {
      throw new Error(
        `Both models failed. Primary: ${primaryError.message}, Fallback: ${fallbackError.message}`,
      );
    }
  }
}

// Usage
const generalResult = await hybridModelStrategy(
  "Explain artificial intelligence",
  "general",
);

const domainResult = await hybridModelStrategy(
  "Provide industry-specific analysis for healthcare",
  "domain-specific",
);

const codeResult = await hybridModelStrategy(
  "Generate a Python function for data processing",
  "code-generation",
);

console.log("General query result:", generalResult.content);
console.log("Used model:", generalResult.strategy);
```

## 🔧 Configuration Examples

### Environment-based Configuration

```typescript
import { NeuroLink } from "@juspay/neurolink";

// Development configuration
const devNeuroLink = new NeuroLink({
  defaultProvider: "google-ai", // Free tier available
  timeout: 30000,
  retryAttempts: 1,
  analytics: { enabled: false },
});

// Production configuration
const prodNeuroLink = new NeuroLink({
  defaultProvider: "auto", // Auto-select best provider
  timeout: 15000,
  retryAttempts: 3,
  analytics: {
    enabled: true,
    endpoint: process.env.ANALYTICS_ENDPOINT,
  },
});

// Use appropriate instance
const neurolink =
  process.env.NODE_ENV === "production" ? prodNeuroLink : devNeuroLink;
```

### Provider Fallback

```typescript
async function generateWithFallback(prompt: string) {
  const providers = ["google-ai", "openai", "anthropic"];

  for (const provider of providers) {
    try {
      const result = await neurolink.generate({
        input: { text: prompt },
        provider: provider,
        timeout: 10000,
      });

      console.log(`✅ Success with ${provider}`);
      return result;
    } catch (error) {
      console.warn(`❌ ${provider} failed:`, error.message);
    }
  }

  throw new Error("All providers failed");
}
```

## 🛠️ Utility Functions

### Text Processing Helpers

```typescript
class TextProcessor {
  private neurolink: NeuroLink;

  constructor() {
    this.neurolink = new NeuroLink();
  }

  async translate(text: string, targetLanguage: string): Promise<string> {
    const result = await this.neurolink.generate({
      input: {
        text: `Translate this text to ${targetLanguage}: ${text}`,
      },
      temperature: 0.2,
    });

    return result.content;
  }

  async improveWriting(text: string): Promise<string> {
    const result = await this.neurolink.generate({
      input: {
        text: `Improve the clarity and readability of this text: ${text}`,
      },
      temperature: 0.4,
    });

    return result.content;
  }

  async extractKeyPoints(text: string): Promise<string[]> {
    const result = await this.neurolink.generate({
      input: {
        text: `Extract the key points from this text as a bullet list: ${text}`,
      },
      temperature: 0.3,
    });

    // Parse bullet points from response
    return result.content
      .split("\n")
      .filter(
        (line) => line.trim().startsWith("•") || line.trim().startsWith("-"),
      )
      .map((line) => line.replace(/^[•\-]\s*/, "").trim());
  }
}

// Usage
const processor = new TextProcessor();
const improvedText = await processor.improveWriting(
  "This text needs improvement.",
);
const keyPoints = await processor.extractKeyPoints(longArticle);
```

### Batch Processing

```typescript
async function batchProcess(prompts: string[], batchSize = 3) {
  const results = [];

  for (let i = 0; i < prompts.length; i += batchSize) {
    const batch = prompts.slice(i, i + batchSize);

    // Process batch in parallel
    const batchPromises = batch.map(async (prompt) => {
      return await neurolink.generate({
        input: { text: prompt },
        provider: "auto",
      });
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Rate limiting delay
    if (i + batchSize < prompts.length) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  return results;
}

// Usage
const prompts = [
  "Explain machine learning",
  "What is blockchain?",
  "How does quantum computing work?",
];

const results = await batchProcess(prompts);
results.forEach((result, i) => {
  console.log(`Response ${i + 1}:`, result.content);
});
```

## 📚 Related Documentation

- [CLI Examples](../cli/examples.md) - Command-line usage examples
- [Advanced Examples](advanced.md) - Complex integration patterns
- [Framework Integration](../sdk/framework-integration.md) - Specific framework guides
- [Provider Setup](../getting-started/provider-setup.md) - API key configuration
