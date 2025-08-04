# Basic Usage Examples

Simple examples to get started with NeuroLink in different scenarios and programming languages.

## 🚀 Quick Start Examples

### Simple Text Generation

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Basic text generation
const result = await neurolink.generate({
  input: { text: "Explain TypeScript in simple terms" }
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
      provider: "auto",  // Auto-select best provider
      temperature: 0.7
    });
    
    return result.content;
  }
  
  async summarizeText(text: string): Promise<string> {
    const result = await this.neurolink.generate({
      input: { 
        text: `Summarize this text in 2-3 sentences: ${text}` 
      },
      maxTokens: 150
    });
    
    return result.content;
  }
}

// Usage
const assistant = new AIAssistant();
const response = await assistant.generateResponse("How do I deploy a Node.js app?");
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
      provider: provider
    });
    
    res.json({
      success: true,
      content: result.content,
      provider: result.provider,
      usage: result.usage
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Text summarization endpoint
app.post("/api/summarize", async (req, res) => {
  try {
    const { text, maxLength = 150 } = req.body;
    
    const result = await neurolink.generate({
      input: { 
        text: `Provide a concise summary of this text: ${text}` 
      },
      maxTokens: maxLength,
      temperature: 0.3  // Lower temperature for factual summarization
    });
    
    res.json({
      success: true,
      summary: result.content,
      originalLength: text.length,
      summaryLength: result.content.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
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
      text: `Write ${language} code for: ${description}. Include comments and error handling.`
    },
    provider: "anthropic",  // Claude is great for code
    temperature: 0.3        // Lower temperature for precise code
  });
  
  return result.content;
}

// Usage
const pythonCode = await generateCode(
  "function to calculate compound interest", 
  "Python"
);
console.log(pythonCode);
```

### Content Creation

```typescript
async function createBlogPost(topic: string, audience: string) {
  const result = await neurolink.generate({
    input: { 
      text: `Write a blog post about ${topic} for ${audience}. 
             Include: introduction, main points, conclusion, and call-to-action.`
    },
    provider: "openai",
    temperature: 0.8,  // Higher temperature for creative content
    maxTokens: 1500
  });
  
  return result.content;
}

// Usage
const blogPost = await createBlogPost(
  "AI automation in business", 
  "small business owners"
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
             ${dataString}`
    },
    provider: "google-ai",
    maxTokens: 800
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
  "What trends do you see in the sales data?"
);
```

## 🔧 Configuration Examples

### Environment-based Configuration

```typescript
import { NeuroLink } from "@juspay/neurolink";

// Development configuration
const devNeuroLink = new NeuroLink({
  defaultProvider: "google-ai",  // Free tier available
  timeout: 30000,
  retryAttempts: 1,
  analytics: { enabled: false }
});

// Production configuration
const prodNeuroLink = new NeuroLink({
  defaultProvider: "auto",       // Auto-select best provider
  timeout: 15000,
  retryAttempts: 3,
  analytics: { 
    enabled: true,
    endpoint: process.env.ANALYTICS_ENDPOINT
  }
});

// Use appropriate instance
const neurolink = process.env.NODE_ENV === "production" ? prodNeuroLink : devNeuroLink;
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
        timeout: 10000
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
        text: `Translate this text to ${targetLanguage}: ${text}` 
      },
      temperature: 0.2
    });
    
    return result.content;
  }
  
  async improveWriting(text: string): Promise<string> {
    const result = await this.neurolink.generate({
      input: { 
        text: `Improve the clarity and readability of this text: ${text}` 
      },
      temperature: 0.4
    });
    
    return result.content;
  }
  
  async extractKeyPoints(text: string): Promise<string[]> {
    const result = await this.neurolink.generate({
      input: { 
        text: `Extract the key points from this text as a bullet list: ${text}` 
      },
      temperature: 0.3
    });
    
    // Parse bullet points from response
    return result.content
      .split("\n")
      .filter(line => line.trim().startsWith("•") || line.trim().startsWith("-"))
      .map(line => line.replace(/^[•\-]\s*/, "").trim());
  }
}

// Usage
const processor = new TextProcessor();
const improvedText = await processor.improveWriting("This text needs improvement.");
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
        provider: "auto"
      });
    });
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Rate limiting delay
    if (i + batchSize < prompts.length) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  return results;
}

// Usage
const prompts = [
  "Explain machine learning",
  "What is blockchain?",
  "How does quantum computing work?"
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