# Streaming Responses

Real-time streaming capabilities for interactive AI applications with built-in analytics, evaluation, and enterprise-grade features.

## 🌊 Overview

NeuroLink supports real-time streaming for immediate response feedback, perfect for chat interfaces, live content generation, and interactive applications. Streaming works with all supported providers and includes advanced enterprise features:

- **Multi-Model Streaming**: Intelligent load balancing across multiple SageMaker endpoints
- **Rate Limiting & Backpressure**: Enterprise-grade request management
- **Advanced Caching**: Semantic caching with partial response matching
- **Real-time Analytics**: Comprehensive monitoring and alerting
- **Security & Validation**: Prompt injection detection, content filtering, and compliance
- **Tool Calling**: Streaming function calls with structured output parsing
- **Error Recovery**: Automatic failover and retry mechanisms
- **Performance Optimization**: Adaptive rate limiting and circuit breakers

## 🚀 Basic Streaming

### SDK Streaming

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Basic streaming
const stream = await neurolink.stream({
  input: { text: "Tell me a story about AI" },
  provider: "openai",
});

for await (const chunk of stream) {
  console.log(chunk.content); // Incremental content
  process.stdout.write(chunk.content);
}
```

### Basic Streaming (Ready to Use)

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Basic streaming (works immediately)
const result = await neurolink.stream({
  input: { text: "Generate a business analysis" },
});

for await (const chunk of result) {
  process.stdout.write(chunk.content || "");
}
```

### Streaming with Built-in Tools

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Streaming with tools automatically available
const result = await neurolink.stream({
  input: { text: "What's the current time and weather in New York?" },
});

for await (const chunk of result) {
  if (chunk.type === "text") {
    process.stdout.write(chunk.content);
  } else if (chunk.type === "tool_use") {
    console.log(`\n🔧 Using tool: ${chunk.tool}`);
  }
}
```

### Simple Configuration

```typescript
import { NeuroLink } from "@juspay/neurolink";

// NeuroLink automatically chooses the best available provider
const neurolink = new NeuroLink();

// Streaming works with any configured provider
const result = await neurolink.stream({
  input: { text: "Analyze quarterly performance" },
  maxTokens: 1000,
  temperature: 0.7,
});

for await (const chunk of result) {
  process.stdout.write(chunk.content || "");
}
```

### CLI Streaming

```bash
# Basic streaming with automatic provider selection
npx @juspay/neurolink stream "Tell me a story"

# With specific provider (optional)
npx @juspay/neurolink stream "Explain quantum computing" --provider google-ai

# With debug output to see provider selection
npx @juspay/neurolink stream "Write a poem" --debug

# JSON format streaming (future-ready)
npx @juspay/neurolink stream "Create structured data" --format json --provider google-ai
# Streaming with tools enabled
npx @juspay/neurolink stream "What's the weather in New York?" --enable-tools

# Specify streaming parameters
npx @juspay/neurolink stream "Analyze market trends" \
  --max-tokens 500 \
  --temperature 0.7 \
  --stream
```

## 🔧 Advanced Features

### Error Handling with Retry

```typescript
import { NeuroLink } from "@juspay/neurolink";

class StreamingWithRetry {
  private neurolink = new NeuroLink();

  async streamWithRetry(prompt: string, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // NeuroLink automatically selects best available provider
        const result = await this.neurolink.stream({
          input: { text: prompt },
          maxTokens: 500,
        });

        // Success - return the stream
        return result;
      } catch (error) {
        console.warn(`Attempt ${attempt} failed: ${error.message}`);

        if (attempt < maxRetries) {
          // Wait before retry
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        } else {
          throw error; // Final attempt failed
        }
      }
    }
  }
}

// Usage
const service = new StreamingWithRetry();
const stream = await service.streamWithRetry("Explain quantum computing");

for await (const chunk of stream) {
  process.stdout.write(chunk.content || "");
}
```

### Timeout Handling

```typescript
async function streamWithTimeout(prompt: string, timeoutMs = 30000) {
  const neurolink = new NeuroLink();

  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error("Stream timeout")), timeoutMs);
  });

  const streamPromise = neurolink.stream({
    input: { text: prompt },
  });

  const result = await Promise.race([streamPromise, timeoutPromise]);
  return result;
}

// Usage with 45 second timeout
const stream = await streamWithTimeout("Write a detailed report", 45000);
```

### Collecting Full Response

```typescript
async function collectFullResponse(prompt: string) {
  const neurolink = new NeuroLink();

  const result = await neurolink.stream({
    input: { text: prompt },
  });

  const chunks: string[] = [];
  for await (const chunk of result) {
    if (chunk.content) {
      chunks.push(chunk.content);
    }
  }

  return {
    fullText: chunks.join(""),
    chunkCount: chunks.length,
  };
}

// Usage
const response = await collectFullResponse("Analyze market trends");
console.log(`Response: ${response.fullText}`);
console.log(`Stats: ${response.chunkCount} chunks`);
```

### Automatic Provider Selection

```typescript
import { NeuroLink } from "@juspay/neurolink";

// NeuroLink automatically handles provider fallback
async function smartStreaming(prompt: string) {
  const neurolink = new NeuroLink();

  // NeuroLink automatically selects the best available provider
  // and falls back to alternatives if the primary fails
  const result = await neurolink.stream({
    input: { text: prompt },
    maxTokens: 500,
  });

  return result;
}

// Usage - NeuroLink handles all provider logic internally
const stream = await smartStreaming("Explain machine learning");

for await (const chunk of stream) {
  process.stdout.write(chunk.content || "");
}
```

### Manual Provider Selection (Optional)

```typescript
import { NeuroLink } from "@juspay/neurolink";

// You can optionally specify a provider preference
async function streamWithPreference(
  prompt: string,
  preferredProvider?: string,
) {
  const neurolink = new NeuroLink();

  const result = await neurolink.stream({
    input: { text: prompt },
    provider: preferredProvider, // Optional - NeuroLink will choose if not specified
    maxTokens: 500,
  });

  return result;
}

// Usage
const stream = await streamWithPreference(
  "Explain quantum computing",
  "google-ai",
);

for await (const chunk of stream) {
  process.stdout.write(chunk.content || "");
}
```

### Simple Rate Limiting

```typescript
import { NeuroLink } from "@juspay/neurolink";

class ThrottledStreaming {
  private neurolink = new NeuroLink();
  private lastRequest = 0;
  private minInterval = 1000; // 1 second between requests

  async throttledStream(prompt: string) {
    // Wait if needed
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;

    if (timeSinceLastRequest < this.minInterval) {
      const waitTime = this.minInterval - timeSinceLastRequest;
      console.log(`Waiting ${waitTime}ms...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.lastRequest = Date.now();

    return await this.neurolink.stream({
      input: { text: prompt },
    });
  }
}

// Usage
const throttled = new ThrottledStreaming();
const result = await throttled.throttledStream("Explain quantum computing");

for await (const chunk of result) {
  process.stdout.write(chunk.content || "");
}
```

### Batch Processing

```typescript
async function processBatch(prompts: string[], maxConcurrent = 2) {
  const neurolink = new NeuroLink();
  const results = [];

  // Process in chunks
  for (let i = 0; i < prompts.length; i += maxConcurrent) {
    const batch = prompts.slice(i, i + maxConcurrent);

    const batchPromises = batch.map(async (prompt, index) => {
      // Stagger requests to avoid overwhelming providers
      await new Promise((resolve) => setTimeout(resolve, index * 500));

      return await neurolink.stream({
        input: { text: prompt },
      });
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    console.log(`Completed batch ${Math.floor(i / maxConcurrent) + 1}`);

    // Pause between batches
    if (i + maxConcurrent < prompts.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return results;
}

// Usage
const prompts = ["Explain AI", "Explain ML", "Explain deep learning"];
const results = await processBatch(prompts, 2);
console.log(`Processed ${results.length} requests`);
```

### Simple Caching Pattern

```typescript
import { NeuroLink } from "@juspay/neurolink";

class SimpleCache {
  private neurolink = new NeuroLink();
  private cache = new Map<string, { response: string; timestamp: number }>();
  private cacheTTL = 60 * 60 * 1000; // 1 hour

  private isExpired(timestamp: number) {
    return Date.now() - timestamp > this.cacheTTL;
  }

  async streamWithCache(prompt: string) {
    const cached = this.cache.get(prompt);

    // Check cache first
    if (cached && !this.isExpired(cached.timestamp)) {
      console.log("⚡ Cache hit!");

      // Return cached response as simulated stream
      const words = cached.response.split(" ");
      return {
        async *stream() {
          for (const word of words) {
            await new Promise((resolve) => setTimeout(resolve, 50));
            yield { content: word + " " };
          }
        },
        fromCache: true,
      };
    }

    console.log("🎯 Cache miss. Generating...");

    // Generate new response using NeuroLink's automatic provider selection
    const result = await this.neurolink.stream({
      input: { text: prompt },
    });

    // Collect response while streaming for caching
    const chunks: string[] = [];
    const responseStream = {
      async *stream() {
        for await (const chunk of result) {
          if (chunk.content) {
            chunks.push(chunk.content);
            yield chunk;
          }
        }

        // Cache after streaming completes
        const fullResponse = chunks.join("");
        this.cache.set(prompt, {
          response: fullResponse,
          timestamp: Date.now(),
        });
        console.log(`💾 Cached response`);
      },
    };

    return {
      stream: responseStream.stream(),
      fromCache: false,
    };
  }
}

// Usage
const cache = new SimpleCache();

// First request (cache miss)
const result1 = await cache.streamWithCache("Explain renewable energy");
for await (const chunk of result1.stream) {
  process.stdout.write(chunk.content || "");
}
console.log(`\nFrom cache: ${result1.fromCache}`);

// Second identical request (cache hit)
const result2 = await cache.streamWithCache("Explain renewable energy");
for await (const chunk of result2.stream) {
  process.stdout.write(chunk.content || "");
}
console.log(`\nFrom cache: ${result2.fromCache}`);
```

### Custom Configuration

```typescript
const stream = await neurolink.stream({
  input: { text: "Generate comprehensive analysis" },
  provider: "anthropic",
  temperature: 0.7,
  maxTokens: 2000,
  output: {
    format: "json", // Future-ready JSON streaming
    streaming: {
      chunkSize: 256,
      bufferSize: 1024,
      enableProgress: true,
    },
  },
});
```

### JSON Streaming Support

```typescript
// Structured data streaming (future-ready)
const jsonStream = await neurolink.stream({
  input: { text: "Create a detailed project plan with milestones" },
  output: {
    format: "structured",
    streaming: {
      chunkSize: 512,
      enableProgress: true,
    },
  },
  schema: {
    type: "object",
    properties: {
      projectName: { type: "string" },
      phases: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            duration: { type: "string" },
            tasks: { type: "array", items: { type: "string" } },
          },
        },
      },
    },
  },
});

let structuredData = "";
for await (const chunk of jsonStream.stream) {
  structuredData += chunk.content;

  // Try to parse partial JSON
  try {
    const partial = JSON.parse(structuredData);
    console.log("Partial structure:", partial);
  } catch {
    // Still building complete JSON
  }
}
```

### Error Handling & Recovery

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// NeuroLink provides built-in error recovery and automatic provider fallback
async function robustStreaming(prompt: string) {
  const maxRetries = 3;
  let attempts = 0;

  while (attempts < maxRetries) {
    try {
      const result = await neurolink.stream({
        input: { text: prompt },
        provider: "auto", // Auto-fallback to working provider
      });

      for await (const chunk of result.stream) {
        if (chunk.error) {
          throw new Error(chunk.error);
        }
        process.stdout.write(chunk.content || "");
      }

      return; // Success
    } catch (error) {
      attempts++;
      console.warn(`Attempt ${attempts} failed:`, error.message);

      if (attempts < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempts));
      } else {
        throw new Error(`Streaming failed after ${maxRetries} attempts`);
      }
    }
  }
}

// Usage with automatic error recovery
try {
  await robustStreaming("Generate a comprehensive analysis");
  console.log("Stream completed successfully");
} catch (error) {
  console.error("All retry attempts failed:", error.message);
}
```

### Security & Validation

````typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// NeuroLink includes built-in security and validation features
async function secureStreaming(prompt: string, userId: string) {
  // Basic input validation
  if (!prompt || prompt.length > 50000) {
    throw new Error("Invalid prompt: too long or empty");
  }

  // Basic user authentication check
  if (!userId || userId.length < 3) {
    throw new Error("Invalid user ID");
  }

  try {
    const result = await neurolink.stream({
      input: { text: prompt },
      provider: "auto", // NeuroLink automatically selects secure providers
      context: {
        userId,
        sessionId: `session-${Date.now()}`,
        securityLevel: "standard",
      },
    });

    const chunks: string[] = [];
    for await (const chunk of result.stream) {
      // Basic output filtering
      const content = chunk.content || "";

      // Filter out potential PII (basic example)
      const sanitizedContent = content
        .replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[SSN-REDACTED]")
        .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, "[EMAIL-REDACTED]");

      chunks.push(sanitizedContent);
      process.stdout.write(sanitizedContent);
    }

    console.log(`\nSecure streaming completed for user: ${userId}`);
    console.log(`Total chunks processed: ${chunks.length}`);

    return chunks.join("");

  } catch (error) {
    console.error(`Secure streaming failed for user ${userId}:`, error.message);
    throw error;
  }
}

// Usage with built-in security
try {
  await secureStreaming("Generate a privacy-compliant financial report", "user-123");
} catch (error) {
  console.error("Secure streaming error:", error.message);
}

## 📊 Streaming with Analytics

### Built-in Analytics Support

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// NeuroLink provides built-in analytics tracking
async function streamWithAnalytics(prompt: string) {
  const startTime = Date.now();
  let chunkCount = 0;
  let tokenCount = 0;

  try {
    const result = await neurolink.stream({
      input: { text: prompt },
      enableAnalytics: true, // Enable built-in analytics
      context: {
        userId: "user-123",
        sessionId: "session-456",
        requestType: "interactive",
      },
    });

    console.log("📊 Streaming with analytics enabled...");

    for await (const chunk of result.stream) {
      const content = chunk.content || "";
      chunkCount++;
      tokenCount += Math.ceil(content.length / 4); // Rough token estimation

      process.stdout.write(content);

      // Access built-in analytics if available
      if (chunk.analytics) {
        console.log(`\n📈 Real-time: ${chunk.analytics.tokensPerSecond} tokens/sec`);
      }
    }

    const totalTime = Date.now() - startTime;

    // Display session analytics
    console.log(`\n\n📊 Session Analytics:`);
    console.log(`Total Time: ${totalTime}ms`);
    console.log(`Chunks Processed: ${chunkCount}`);
    console.log(`Estimated Tokens: ${tokenCount}`);
    console.log(`Throughput: ${(tokenCount / (totalTime / 1000)).toFixed(2)} tokens/sec`);
    console.log(`Provider: ${result.provider || "auto-selected"}`);

    // Access result analytics if available
    if (result.analytics) {
      console.log(`Cost Estimate: $${result.analytics.estimatedCost || "N/A"}`);
      console.log(`Model Used: ${result.analytics.model || "N/A"}`);
    }

    return {
      totalTime,
      chunkCount,
      tokenCount,
      provider: result.provider,
      analytics: result.analytics,
    };

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`\n❌ Analytics Error: ${error.message}`);
    console.log(`Failed after: ${totalTime}ms, ${chunkCount} chunks`);
    throw error;
  }
}

// Usage with analytics
streamWithAnalytics("Generate a comprehensive business analysis")
  .then((analytics) => {
    console.log("\n✅ Streaming completed with analytics:", analytics);
  })
  .catch((error) => {
    console.error("Streaming failed:", error.message);
  });
````

### Real-time Analytics

```typescript
const stream = await neurolink.stream({
  input: { text: "Generate business report" },
  analytics: {
    enabled: true,
    realTime: true,
    context: {
      userId: "user123",
      sessionId: "session456",
      feature: "report_generation",
    },
  },
});

for await (const chunk of stream) {
  console.log(chunk.content);

  // Access real-time analytics
  if (chunk.analytics) {
    console.log(`Tokens so far: ${chunk.analytics.tokensUsed}`);
    console.log(`Cost so far: $${chunk.analytics.estimatedCost}`);
  }
}
```

### CLI Streaming with Analytics

```bash
# Streaming with analytics
npx @juspay/neurolink stream "Create documentation" \
  --enable-analytics \
  --context '{"project":"docs","team":"engineering"}' \
  --debug

# With evaluation
npx @juspay/neurolink stream "Write production code" \
  --enable-analytics \
  --enable-evaluation \
  --evaluation-domain "Senior Developer" \
  --debug
```

## 🎯 Use Cases

### Chat Interface

```typescript
import React, { useState, useEffect } from "react";
import { NeuroLink } from "@juspay/neurolink";

function ChatComponent() {
  const [messages, setMessages] = useState([]);
  const [currentResponse, setCurrentResponse] = useState("");
  const neurolink = new NeuroLink();

  const sendMessage = async (userMessage) => {
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setCurrentResponse("");

    const stream = await neurolink.stream({
      input: { text: userMessage },
      provider: "google-ai"
    });

    for await (const chunk of stream) {
      setCurrentResponse(prev => prev + chunk.content);
    }

    setMessages(prev => [...prev, { role: "assistant", content: currentResponse }]);
    setCurrentResponse("");
  };

  return (
    <div className="chat-interface">
      {messages.map((msg, i) => (
        <div key={i} className={`message ${msg.role}`}>
          {msg.content}
        </div>
      ))}
      {currentResponse && (
        <div className="message assistant streaming">
          {currentResponse}
          <span className="cursor">|</span>
        </div>
      )}
    </div>
  );
}
```

### Live Content Generation

```typescript
// Real-time blog post generation
async function generateBlogPost(topic: string) {
  const stream = await neurolink.stream({
    input: {
      text: `Write a comprehensive blog post about ${topic}. Include introduction, main points, and conclusion.`,
    },
    provider: "anthropic",
    maxTokens: 3000,
    analytics: { enabled: true },
  });

  const sections = [];
  let currentSection = "";

  for await (const chunk of stream) {
    currentSection += chunk.content;

    // Update UI in real-time
    updateBlogPostPreview(currentSection);

    // Detect section breaks
    if (chunk.content.includes("\n\n## ")) {
      sections.push(currentSection);
      currentSection = "";
    }
  }

  return sections;
}
```

### Interactive Documentation

```bash
#!/bin/bash
# Interactive documentation generator

echo "📚 Interactive Documentation Generator"
echo "Enter topic (or 'quit' to exit):"

while read -r topic; do
  if [ "$topic" = "quit" ]; then
    break
  fi

  echo "🔄 Generating documentation for: $topic"
  npx @juspay/neurolink stream "
  Create comprehensive technical documentation for: $topic

  Include:
  - Overview and purpose
  - Installation/setup instructions
  - Usage examples
  - Best practices
  - Troubleshooting
  " --provider google-ai --enable-analytics

  echo -e "\n\n📝 Documentation complete! Enter next topic:"
done
```

## ⚙️ Enterprise Configuration

### Provider Configuration

```typescript
import { NeuroLink } from "@juspay/neurolink";

// Configure multiple providers for intelligent routing
const neurolink = new NeuroLink();

const providerConfigs = [
  {
    modelId: "llama-3-70b",
    modelName: "LLaMA 3 70B",
    modelType: "llama",
    weight: 3,
    specializations: ["reasoning", "analysis"],
    config: {
      maxTokens: 4000,
      temperature: 0.7,
      specializations: ["reasoning", "analysis"],
    },
    thresholds: {
      maxLatency: 5000,
      maxErrorRate: 2,
      minThroughput: 20,
    },
  },
  {
    modelId: "claude-3-5-sonnet",
    modelName: "Claude 3.5 Sonnet",
    modelType: "anthropic",
    weight: 4,
    specializations: ["function_calling", "structured_output"],
    config: {
      maxTokens: 8000,
      temperature: 0.6,
      specializations: ["function_calling", "structured_output"],
    },
    thresholds: {
      maxLatency: 3000,
      maxErrorRate: 1,
      minThroughput: 25,
    },
  },
  {
    modelId: "gemini-2-flash",
    modelName: "Gemini 2.0 Flash",
    modelType: "google",
    weight: 2,
    specializations: ["speed", "general"],
    config: {
      maxTokens: 2000,
      temperature: 0.8,
      specializations: ["speed", "general"],
    },
    thresholds: {
      maxLatency: 1500,
      maxErrorRate: 3,
      minThroughput: 40,
    },
  },
], {
  loadBalancingStrategy: "performance_based",
  autoFailover: {
    enabled: true,
    maxRetries: 3,
    fallbackStrategies: ["model_switch", "endpoint_switch", "provider_switch"],
    circuitBreakerThreshold: 5,
    circuitBreakerTimeout: 60000,
  },
  healthCheck: {
    enabled: true,
    interval: 30000,
    timeout: 5000,
    retryOnFailure: 2,
  },
  monitoring: {
    enabled: true,
    metricsInterval: 15000,
    detailedMetrics: true,
    performanceThresholds: {
      responseTime: 3000,
      errorRate: 2,
      throughput: 20,
    },
  },
});
```

### Production Environment Variables

For production deployments, configure these environment variables:

```bash
# Basic SageMaker Streaming
export AWS_REGION="us-east-1"
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export SAGEMAKER_DEFAULT_ENDPOINT="your-endpoint-name"

# Streaming Configuration
export NEUROLINK_STREAMING_ENABLED="true"
export NEUROLINK_STREAMING_TIMEOUT="30000"
export NEUROLINK_STREAMING_MAX_TOKENS="2000"

# Optional: Performance Settings
export NEUROLINK_STREAMING_BUFFER_SIZE="1024"
export NEUROLINK_STREAMING_FLUSH_INTERVAL="100"
export NEUROLINK_STREAMING_ENABLE_ANALYTICS="true"
```

### Production Configuration File

Create `neurolink.config.js` in your project root:

```javascript
// neurolink.config.js
module.exports = {
  providers: {
    sagemaker: {
      region: process.env.AWS_REGION || "us-east-1",
      endpointName: process.env.SAGEMAKER_DEFAULT_ENDPOINT,
      timeout: 30000,
      maxRetries: 3,
      streaming: {
        enabled: true,
        bufferSize: 1024,
        timeout: 60000,
      },
    },
  },
  streaming: {
    defaultProvider: "sagemaker",
    enableAnalytics: true,
    maxTokens: 2000,
    temperature: 0.7,
  },
};
```

### Simple Production Usage

```typescript
import { NeuroLink } from "@juspay/neurolink";

// Production service class
class AIStreamingService {
  private neurolink: NeuroLink;

  constructor() {
    this.neurolink = new NeuroLink({
      providers: {
        sagemaker: {
          endpointName: process.env.SAGEMAKER_ENDPOINT,
          region: process.env.AWS_REGION,
        },
      },
    });
  }

  async streamResponse(prompt: string, options: any = {}) {
    const result = await this.neurolink.generate({
      input: { text: prompt },
      provider: "sagemaker",
      stream: true,
      maxTokens: options.maxTokens || 500,
      temperature: options.temperature || 0.7,
    });

    return result.stream;
  }

  async getFullResponse(prompt: string) {
    const stream = await this.streamResponse(prompt);
    const chunks: string[] = [];

    for await (const chunk of stream) {
      if (chunk.content) {
        chunks.push(chunk.content);
      }
    }

    return chunks.join("");
  }
}

// Usage
const aiService = new AIStreamingService();
const response = await aiService.getFullResponse("Explain machine learning");
console.log(response);
```

### Stream Settings

```typescript
interface StreamConfig {
  bufferSize?: number; // Chunk buffer size (default: 1024)
  flushInterval?: number; // Flush interval in ms (default: 100)
  timeout?: number; // Stream timeout in ms (default: 60000)
  enableChunking?: boolean; // Enable smart chunking (default: true)
  retryAttempts?: number; // Retry attempts on failure (default: 3)
  reconnectDelay?: number; // Reconnection delay in ms (default: 1000)
}

const stream = await neurolink.stream({
  input: { text: "Your prompt" },
  stream: {
    bufferSize: 2048,
    flushInterval: 50,
    timeout: 120000,
    enableChunking: true,
    retryAttempts: 5,
  },
});
```

### Provider-Specific Options

```typescript
// OpenAI streaming
const openaiStream = await neurolink.stream({
  input: { text: "Generate content" },
  provider: "openai",
  model: "gpt-4o",
  stream: {
    enableChunking: true,
    bufferSize: 1024,
  },
});

// Google AI streaming
const googleStream = await neurolink.stream({
  input: { text: "Generate content" },
  provider: "google-ai",
  model: "gemini-2.5-pro",
  stream: {
    enableChunking: false, // Google AI handles chunking internally
    flushInterval: 50,
  },
});
```

## 🔍 Enterprise Monitoring & Debugging

### Real-time Monitoring Dashboard

```typescript
import { NeuroLink } from "@juspay/neurolink";

// Built-in monitoring with NeuroLink
class EnterpriseStreamingMonitor {
  private neurolink: NeuroLink;

  constructor() {
    this.neurolink = new NeuroLink();
  }

  async getComprehensiveDashboard() {
    // NeuroLink provides built-in monitoring and analytics
    const dashboard = {
      timestamp: Date.now(),
      system: {
        health: "healthy", // Built-in health checks
        performance: await this.getPerformanceMetrics(),
        providers: await this.getProviderStatus(),
      },
      streaming: {
        activeStreams: 0, // Built-in tracking
        totalRequests: 0,
        averageLatency: 0,
      },
    };

    return dashboard;
  }

  async generateAlerts() {
    const alerts = [];
    const dashboard = await this.getComprehensiveDashboard();

    // System health alerts
    if (dashboard.system.health.status === "unhealthy") {
      alerts.push({
        severity: "critical",
        type: "system_health",
        message: "System health is critical",
        details: dashboard.system.health,
      });
    }

    // Performance alerts
    if (dashboard.system.performance.averageResponseTime > 5000) {
      alerts.push({
        severity: "warning",
        type: "performance",
        message: "High response times detected",
        details: {
          responseTime: dashboard.system.performance.averageResponseTime,
        },
      });
    }

    // Security alerts
    if (dashboard.security.stats.recentEvents > 10) {
      alerts.push({
        severity: "high",
        type: "security",
        message: "High security event volume",
        details: dashboard.security.stats,
      });
    }

    // Cache performance alerts
    if (dashboard.cache.stats.hitMiss.hitRate < 70) {
      alerts.push({
        severity: "info",
        type: "cache_performance",
        message: "Low cache hit rate",
        details: { hitRate: dashboard.cache.stats.hitMiss.hitRate },
      });
    }

    return alerts;
  }

  async exportMetrics(format: "prometheus" | "cloudwatch" | "json") {
    const dashboard = await this.getComprehensiveDashboard();

    switch (format) {
      case "prometheus":
        return this.convertToPrometheus(dashboard);
      case "cloudwatch":
        return this.sendToCloudWatch(dashboard);
      case "json":
        return JSON.stringify(dashboard, null, 2);
    }
  }

  private convertToPrometheus(dashboard: any): string {
    const metrics = [];

    // System metrics
    metrics.push(
      `neurolink_streaming_active_requests ${dashboard.system.capacity.activeRequests}`,
    );
    metrics.push(
      `neurolink_streaming_queue_size ${dashboard.rateLimiting.stats.queuedRequests}`,
    );
    metrics.push(
      `neurolink_streaming_response_time_ms ${dashboard.system.performance.averageResponseTime}`,
    );
    metrics.push(
      `neurolink_streaming_error_rate ${dashboard.system.performance.errorRate}`,
    );

    // Model metrics
    for (const [modelId, health] of dashboard.models.health) {
      metrics.push(
        `neurolink_model_health{model="${modelId}"} ${health.status === "healthy" ? 1 : 0}`,
      );
      metrics.push(
        `neurolink_model_latency_ms{model="${modelId}"} ${health.metrics.averageLatency}`,
      );
      metrics.push(
        `neurolink_model_throughput{model="${modelId}"} ${health.metrics.throughput}`,
      );
    }

    // Cache metrics
    metrics.push(
      `neurolink_cache_hit_rate ${dashboard.cache.stats.hitMiss.hitRate}`,
    );
    metrics.push(
      `neurolink_cache_size_mb ${dashboard.cache.stats.storage.currentSizeMB}`,
    );

    // Security metrics
    metrics.push(
      `neurolink_security_events_total ${dashboard.security.stats.totalEvents}`,
    );
    metrics.push(
      `neurolink_security_threats_recent ${dashboard.security.stats.recentEvents}`,
    );

    return metrics.join("\n");
  }
}

// Usage
const monitor = new EnterpriseStreamingMonitor();

// Real-time dashboard
setInterval(async () => {
  const dashboard = await monitor.getComprehensiveDashboard();
  console.log("Dashboard Update:", JSON.stringify(dashboard, null, 2));

  // Check for alerts
  const alerts = await monitor.generateAlerts();
  if (alerts.length > 0) {
    console.log("🚨 ALERTS:", alerts);
  }
}, 30000); // Every 30 seconds

// Export metrics to monitoring systems
setInterval(async () => {
  await monitor.exportMetrics("prometheus");
  await monitor.exportMetrics("cloudwatch");
}, 60000); // Every minute
```

### CLI Monitoring Commands

```bash
# Real-time streaming monitor
npx @juspay/neurolink sagemaker stream-monitor \
  --endpoint production-endpoint \
  --duration 3600 \
  --alerts \
  --export prometheus \
  --export cloudwatch

# System health check
npx @juspay/neurolink sagemaker diagnose \
  --endpoint production-endpoint \
  --check-models \
  --check-cache \
  --check-security \
  --check-rate-limits

# Performance benchmarking
npx @juspay/neurolink sagemaker stream-benchmark \
  --endpoint production-endpoint \
  --concurrent 50 \
  --requests 1000 \
  --duration 300 \
  --enable-analytics \
  --enable-caching \
  --model-selection performance_based

# Security audit
npx @juspay/neurolink sagemaker security-audit \
  --endpoint production-endpoint \
  --hours 24 \
  --export-report \
  --include-recommendations

# Cache analysis
npx @juspay/neurolink sagemaker cache-analyze \
  --endpoint production-endpoint \
  --strategy semantic \
  --optimize \
  --report
```

### Stream Debugging

```bash
# Enable verbose streaming debug
npx @juspay/neurolink stream "Debug this response" \
  --provider openai \
  --debug \
  --timeout 30000

# Monitor stream performance
npx @juspay/neurolink stream "Performance test" \
  --enable-analytics \
  --debug \
  --provider google-ai

# Debug streaming with the unified NeuroLink API
npx @juspay/neurolink stream "Complex analysis task" \
  --provider sagemaker \
  --debug \
  --max-tokens 500 \
  --temperature 0.7
```

### Advanced Performance Monitoring

```typescript
import { NeuroLink } from "@juspay/neurolink";

class PerformanceMonitor {
  private neurolink: NeuroLink;
  private startTime: number;
  private metrics: {
    tokenCount: number;
    chunkCount: number;
    responseTime: number;
    throughput: number;
    latencyDistribution: number[];
    errorCount: number;
  } = {
    tokenCount: 0,
    chunkCount: 0,
    responseTime: 0,
    throughput: 0,
    latencyDistribution: [],
    errorCount: 0,
  };

  constructor() {
    this.neurolink = new NeuroLink();
    this.startTime = Date.now();
  }

  async monitorStream(stream: AsyncIterable<any>, requestId: string) {
    const chunkTimes: number[] = [];
    let firstChunkTime: number | null = null;
    let lastChunkTime: number = Date.now();

    for await (const chunk of stream) {
      const chunkTime = Date.now();

      if (!firstChunkTime) {
        firstChunkTime = chunkTime;
        console.log(
          `⏱️  Time to first chunk: ${firstChunkTime - this.startTime}ms`,
        );
      }

      if (chunk.type === "text-delta") {
        this.metrics.tokenCount += this.estimateTokens(chunk.textDelta);
        this.metrics.chunkCount++;
        chunkTimes.push(chunkTime - lastChunkTime);

        // Built-in metrics are automatically tracked by NeuroLink

        // Real-time throughput calculation
        const elapsed = (chunkTime - this.startTime) / 1000;
        this.metrics.throughput = this.metrics.tokenCount / elapsed;

        // Display real-time metrics every 10 chunks
        if (this.metrics.chunkCount % 10 === 0) {
          console.log(
            `📊 Tokens: ${this.metrics.tokenCount}, Throughput: ${this.metrics.throughput.toFixed(2)} t/s`,
          );
        }
      } else if (chunk.type === "error") {
        this.metrics.errorCount++;
        console.error(
          `❌ Stream error at chunk ${this.metrics.chunkCount}: ${chunk.error}`,
        );
      } else if (chunk.type === "finish") {
        this.metrics.responseTime = chunkTime - this.startTime;

        // Calculate latency statistics
        this.metrics.latencyDistribution = chunkTimes;
        const avgChunkLatency =
          chunkTimes.reduce((a, b) => a + b, 0) / chunkTimes.length;
        const p95ChunkLatency = this.percentile(chunkTimes, 95);
        const p99ChunkLatency = this.percentile(chunkTimes, 99);

        // Final metrics
        console.log(`\n📈 Performance Summary:`);
        console.log(`   Total Response Time: ${this.metrics.responseTime}ms`);
        console.log(
          `   Time to First Chunk: ${firstChunkTime! - this.startTime}ms`,
        );
        console.log(`   Total Tokens: ${this.metrics.tokenCount}`);
        console.log(`   Total Chunks: ${this.metrics.chunkCount}`);
        console.log(
          `   Average Throughput: ${this.metrics.throughput.toFixed(2)} tokens/sec`,
        );
        console.log(
          `   Average Chunk Latency: ${avgChunkLatency.toFixed(2)}ms`,
        );
        console.log(`   P95 Chunk Latency: ${p95ChunkLatency.toFixed(2)}ms`);
        console.log(`   P99 Chunk Latency: ${p99ChunkLatency.toFixed(2)}ms`);
        console.log(`   Error Count: ${this.metrics.errorCount}`);
        console.log(
          `   Success Rate: ${(((this.metrics.chunkCount - this.metrics.errorCount) / this.metrics.chunkCount) * 100).toFixed(2)}%`,
        );

        // Complete tracking
        this.analytics.completeRequestTracking(
          requestId,
          chunk.usage || {
            promptTokens: 0,
            completionTokens: this.metrics.tokenCount,
            totalTokens: this.metrics.tokenCount,
          },
          this.metrics.errorCount === 0,
        );
      }

      lastChunkTime = chunkTime;
    }

    return this.metrics;
  }

  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  private percentile(arr: number[], p: number): number {
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  async generatePerformanceReport() {
    const dashboardMetrics = this.analytics.getDashboardMetrics();
    const report = this.analytics.generateReport(
      Date.now() - 60 * 60 * 1000, // Last hour
      Date.now(),
    );

    return {
      timestamp: Date.now(),
      currentSession: this.metrics,
      hourlyReport: report,
      systemHealth: dashboardMetrics.systemHealth,
      trends: dashboardMetrics.trends,
      recommendations: this.generateRecommendations(report),
    };
  }

  private generateRecommendations(report: any): string[] {
    const recommendations: string[] = [];

    if (report.performance.averageDuration > 5000) {
      recommendations.push(
        "Consider using faster models or increasing instance sizes",
      );
    }

    if (report.performance.p95Duration > 10000) {
      recommendations.push(
        "High latency variance detected - review load balancing strategy",
      );
    }

    if (report.requests.successRate < 99) {
      recommendations.push(
        "Error rate is elevated - review error handling and retry policies",
      );
    }

    if (
      report.features.cacheHits /
        (report.features.cacheHits + report.features.cacheMisses) <
      0.7
    ) {
      recommendations.push(
        "Cache hit rate is low - consider adjusting cache strategy",
      );
    }

    return recommendations;
  }
}

// Usage
const performanceMonitor = new PerformanceMonitor();
const requestId = "perf-test-" + Date.now();

const stream = await neurolink.stream({
  input: { text: "Performance test with comprehensive monitoring" },
  provider: "sagemaker",
  analytics: {
    enabled: true,
    metrics: ["latency", "throughput", "token_rate", "error_rate"],
  },
});

const metrics = await performanceMonitor.monitorStream(stream, requestId);
const report = await performanceMonitor.generatePerformanceReport();

console.log("\n📊 Full Performance Report:", JSON.stringify(report, null, 2));
```

## 🛠️ Integration Examples

### Express.js Streaming API

```typescript
import express from "express";
import { NeuroLink } from "@juspay/neurolink";

const app = express();
const neurolink = new NeuroLink();

app.post("/api/stream", async (req, res) => {
  res.setHeader("Content-Type", "text/plain");
  res.setHeader("Transfer-Encoding", "chunked");

  try {
    const stream = await neurolink.stream({
      input: { text: req.body.prompt },
      provider: "google-ai",
    });

    for await (const chunk of stream) {
      res.write(chunk.content);
    }

    res.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### WebSocket Streaming

```typescript
import WebSocket from "ws";
import { NeuroLink } from "@juspay/neurolink";

const wss = new WebSocket.Server({ port: 8080 });
const neurolink = new NeuroLink();

wss.on("connection", (ws) => {
  ws.on("message", async (message) => {
    const { prompt } = JSON.parse(message.toString());

    try {
      const stream = await neurolink.stream({
        input: { text: prompt },
        analytics: { enabled: true },
      });

      for await (const chunk of stream) {
        ws.send(
          JSON.stringify({
            type: "chunk",
            content: chunk.content,
            analytics: chunk.analytics,
          }),
        );
      }

      ws.send(JSON.stringify({ type: "complete" }));
    } catch (error) {
      ws.send(JSON.stringify({ type: "error", error: error.message }));
    }
  });
});
```

### Server-Sent Events (SSE)

```typescript
app.get("/api/stream-sse", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const stream = await neurolink.stream({
    input: { text: req.query.prompt as string },
  });

  for await (const chunk of stream) {
    res.write(
      `data: ${JSON.stringify({
        content: chunk.content,
        finished: chunk.finished,
      })}\n\n`,
    );
  }

  res.end();
});
```

## 🚨 Error Handling

### Robust Error Handling

```typescript
async function robustStreaming(prompt: string) {
  const maxRetries = 3;
  let attempts = 0;

  while (attempts < maxRetries) {
    try {
      const stream = await neurolink.stream({
        input: { text: prompt },
        provider: "auto", // Auto-fallback to working provider
      });

      for await (const chunk of stream) {
        if (chunk.error) {
          throw new Error(chunk.error);
        }

        console.log(chunk.content);
      }

      return; // Success
    } catch (error) {
      attempts++;
      console.warn(`Attempt ${attempts} failed:`, error.message);

      if (attempts < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempts));
      } else {
        throw new Error(`Streaming failed after ${maxRetries} attempts`);
      }
    }
  }
}
```

## 🏢 Enterprise Use Cases

### Financial Services Streaming

```typescript
// High-frequency trading analysis with built-in compliance
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

async function analyzeMarketData(marketData: string, userId: string) {
  const result = await neurolink.stream({
    provider: "anthropic", // Choose best provider for financial analysis
    input: {
      text: `Analyze this market data and provide risk assessment: ${marketData}`,
    },
    maxTokens: 1000,
    temperature: 0.2, // Low temperature for precise financial analysis
    tools: [
      { name: "risk_calculator", enabled: true },
      { name: "compliance_checker", enabled: true },
    ],
  });

  // Audit trail for compliance
  console.log(`Financial analysis requested by user: ${userId}`);
  console.log(`Model selected: ${result.selectedModel.modelId}`);

  return result;
}
```

### Healthcare AI with HIPAA Compliance

```typescript
// HIPAA-compliant medical AI streaming with NeuroLink
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Configuration for HIPAA compliance
const healthcareConfig = {
  provider: "anthropic", // Choose provider with strong security
  maxTokens: 1000,
  temperature: 0.1, // Low temperature for medical accuracy
  // Built-in security and compliance features
};

async function processMedicalQuery(
  query: string,
  patientId: string,
  providerId: string,
) {
  // Basic validation for medical queries
  if (!query || !patientId || !providerId) {
    throw new Error("Missing required parameters for medical query");
  }

  // Audit logging for HIPAA compliance
  console.log(
    `Medical query requested by provider: ${providerId} for patient: ${patientId}`,
  );

  const stream = await neurolink.stream({
    ...healthcareConfig,
    input: { text: query },
    tools: [
      { name: "medical_knowledge", enabled: true },
      { name: "drug_interaction_check", enabled: true },
    ],
  });

  const sanitizedChunks = [];
  for await (const chunk of stream) {
    // Basic content filtering for sensitive data
    if (chunk.type === "text-delta") {
      // Apply basic PII filtering here if needed
      sanitizedChunks.push(chunk);
    } else if (chunk.type === "finish") {
      console.log(`Medical query completed for patient: ${patientId}`);
      sanitizedChunks.push(chunk);
    }
  }

  return sanitizedChunks;
}
```

### E-commerce Recommendation Engine

```typescript
// High-throughput e-commerce streaming with NeuroLink
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

async function generatePersonalizedRecommendations(
  userId: string,
  browsingHistory: any[],
  preferences: any,
) {
  const result = await neurolink.stream({
    prompt: `Generate personalized product recommendations for user with browsing history: ${JSON.stringify(browsingHistory)} and preferences: ${JSON.stringify(preferences)}`,
    tools: [
      { name: "product_search", enabled: true },
      { name: "price_comparison", enabled: true },
      { name: "inventory_check", enabled: true },
    ],
    modelSelection: {
      requiredCapabilities: ["product_recommendations"],
      requestType: "completion",
    },
  });

  const recommendations = [];
  for await (const chunk of result.stream) {
    if (
      chunk.type === "tool-result" &&
      chunk.toolResult.name === "product_search"
    ) {
      recommendations.push(JSON.parse(chunk.toolResult.content));
    }
  }

  return {
    recommendations,
    model: result.selectedModel.modelId,
    performance: result.performance,
  };
}
```

## 📁 Configuration Files

### Enterprise Configuration Template

```yaml
# neurolink-enterprise-streaming.yaml
streaming:
  sagemaker:
    endpoints:
      production:
        name: "production-multi-model"
        models:
          - id: "llama-3-70b"
            name: "LLaMA 3 70B"
            type: "llama"
            weight: 3
            specializations: ["reasoning", "analysis"]
            thresholds:
              max_latency: 5000
              max_error_rate: 2
              min_throughput: 20
          - id: "claude-3-5-sonnet"
            name: "Claude 3.5 Sonnet"
            type: "anthropic"
            weight: 4
            specializations: ["function_calling", "structured_output"]
            thresholds:
              max_latency: 3000
              max_error_rate: 1
              min_throughput: 25

        load_balancing:
          strategy: "performance_based"
          health_check:
            enabled: true
            interval: 30000
            timeout: 5000

        failover:
          enabled: true
          max_retries: 3
          strategies: ["model_switch", "endpoint_switch"]
          circuit_breaker:
            threshold: 5
            timeout: 60000

    rate_limiting:
      preset: "enterprise"
      requests_per_second: 100
      burst_capacity: 200
      adaptive: true
      target_response_time: 1000
      strategy: "queue"
      max_queue_size: 1000
      priority_queue: true

    caching:
      preset: "enterprise"
      storage: "hybrid"
      max_size_mb: 5000
      ttl: 21600000 # 6 hours
      strategy: "fuzzy"
      compression:
        enabled: true
        algorithm: "brotli"
      partial_hits: true
      warming: "scheduled"

    security:
      preset: "enterprise"
      input_validation:
        enabled: true
        max_prompt_length: 100000
        injection_detection: true
        content_policy: true
      output_filtering:
        enabled: true
        pii_redaction: true
        toxicity_filtering: true
        compliance: true
      access_control:
        enabled: true
        authentication: true
        api_key_validation: true
      monitoring:
        enabled: true
        real_time_alerts: true
        threat_detection: true
      compliance:
        gdpr: true
        hipaa: false
        soc2: true
        audit_logging: true

    analytics:
      preset: "enterprise"
      sampling_rate: 1.0
      retention_days: 365
      real_time_monitoring:
        enabled: true
        update_interval: 10000
        alert_thresholds:
          error_rate: 1
          response_time: 1500
          queue_size: 100
      export:
        enabled: true
        formats: ["prometheus", "cloudwatch"]
        interval: 60000
        destinations:
          - type: "cloudwatch"
            config:
              namespace: "NeuroLink/Enterprise"
              region: "us-east-1"
          - type: "prometheus"
            config:
              pushgateway: "prometheus:9091"
```

## 📚 Related Documentation

- [CLI Commands](../cli/commands.md) - Streaming CLI commands
- [SDK Reference](../sdk/api-reference.md) - Complete streaming API
- [Analytics](analytics.md) - Streaming analytics features
- [Dynamic Models](dynamic-models.md) - Multi-model endpoint setup
- [Enterprise Features](enterprise.md) - Enterprise security features
- [Performance Optimization](../PERFORMANCE-OPTIMIZATION.md) - Optimization strategies
- [Analytics & Monitoring](analytics.md) - Comprehensive monitoring
- [Provider Setup](../getting-started/provider-setup.md) - Provider configuration
- [Development Guide](../development/index.md) - Development and deployment guide

## 🎆 What's Next

With Phase 2 complete, NeuroLink now offers enterprise-grade streaming capabilities:

- **✅ Multi-Model Streaming**: Intelligent load balancing and automatic failover
- **✅ Enterprise Security**: Comprehensive validation, filtering, and compliance
- **✅ Advanced Caching**: Semantic caching with partial response matching
- **✅ Real-time Analytics**: Complete monitoring and alerting system
- **✅ Rate Limiting**: Sophisticated backpressure handling and circuit breakers
- **✅ Tool Integration**: Streaming function calls with structured output

Upcoming in Phase 3:

- **Multi-Provider Streaming**: Seamless streaming across different AI providers
- **Edge Deployment**: CDN-based streaming for global latency optimization
- **Advanced Tool Orchestration**: Complex multi-step tool workflows
- **Custom Model Integration**: Support for proprietary and fine-tuned models
