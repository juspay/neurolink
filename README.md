# 🧠 NeuroLink

[![npm version](https://badge.fury.io/js/%40juspay%2Fneurolink.svg)](https://badge.fury.io/js/%40juspay%2Fneurolink)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Production-ready AI toolkit with multi-provider support, automatic fallback, and full TypeScript integration.

**NeuroLink** provides a unified interface for AI providers (OpenAI, Amazon Bedrock, Google Vertex AI) with intelligent fallback, streaming support, and type-safe APIs. Extracted from production use at Juspay.

## Quick Start

```bash
npm install @juspay/neurolink ai @ai-sdk/amazon-bedrock @ai-sdk/openai @ai-sdk/google-vertex zod
```

```typescript
import { createBestAIProvider } from '@juspay/neurolink';

// Auto-selects best available provider
const provider = createBestAIProvider();
const result = await provider.generateText({
  prompt: "Hello, AI!"
});

console.log(result.text);
```

## 🎬 Visual Demo & Documentation

**No installation required!** Experience NeuroLink's capabilities through our comprehensive visual content:

### 📸 Screenshots
- **6 Professional Screenshots** showing all features in action
- **Real AI-generated content** displayed in the interface
- **Complete feature coverage** across all use cases

### 🎥 Demo Videos
- **5 Complete demonstration videos** with actual AI generation
- **5,681+ tokens** of real AI content generated during recording
- **Professional quality** 1920x1080 recordings

### 💻 Live Interactive Demo
- **Working Express.js server** with real API integration
- **All 3 providers functional** (OpenAI, Bedrock, Vertex AI)
- **15+ use cases** demonstrated across business, creative, and developer tools

[View complete visual documentation](./neurolink-demo/) including screenshots, videos, and interactive examples.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Framework Integration](#framework-integration)
  - [SvelteKit](#sveltekit)
  - [Next.js](#nextjs)
  - [Express.js](#expressjs)
  - [React Hook](#react-hook)
- [API Reference](#api-reference)
- [Provider Configuration](#provider-configuration)
- [Advanced Patterns](#advanced-patterns)
- [Error Handling](#error-handling)
- [Performance](#performance)
- [Contributing](#contributing)

## Features

🔄 **Multi-Provider Support** - OpenAI, Amazon Bedrock, Google Vertex AI
⚡ **Automatic Fallback** - Seamless provider switching on failures
📡 **Streaming & Non-Streaming** - Real-time responses and standard generation
🎯 **TypeScript First** - Full type safety and IntelliSense support
🛡️ **Production Ready** - Extracted from proven production systems
🔧 **Zero Config** - Works out of the box with environment variables

## Installation

### Package Installation
```bash
# npm
npm install @juspay/neurolink ai @ai-sdk/amazon-bedrock @ai-sdk/openai @ai-sdk/google-vertex zod

# yarn
yarn add @juspay/neurolink ai @ai-sdk/amazon-bedrock @ai-sdk/openai @ai-sdk/google-vertex zod

# pnpm (recommended)
pnpm add @juspay/neurolink ai @ai-sdk/amazon-bedrock @ai-sdk/openai @ai-sdk/google-vertex zod
```

### Environment Setup
```bash
# Choose one or more providers
export OPENAI_API_KEY="sk-your-openai-key"
export AWS_ACCESS_KEY_ID="your-aws-key"
export AWS_SECRET_ACCESS_KEY="your-aws-secret"
export GOOGLE_APPLICATION_CREDENTIALS="path/to/service-account.json"
```

## Basic Usage

### Simple Text Generation
```typescript
import { createBestAIProvider } from '@juspay/neurolink';

const provider = createBestAIProvider();

// Basic generation
const result = await provider.generateText({
  prompt: "Explain TypeScript generics",
  temperature: 0.7,
  maxTokens: 500
});

console.log(result.text);
console.log(`Used: ${result.provider}`);
```

### Streaming Responses
```typescript
import { createBestAIProvider } from '@juspay/neurolink';

const provider = createBestAIProvider();

const result = await provider.streamText({
  prompt: "Write a story about AI",
  temperature: 0.8,
  maxTokens: 1000
});

// Handle streaming chunks
for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}
```

### Provider Selection
```typescript
import { AIProviderFactory } from '@juspay/neurolink';

// Use specific provider
const openai = AIProviderFactory.createProvider('openai', 'gpt-4o');
const bedrock = AIProviderFactory.createProvider('bedrock', 'claude-3-7-sonnet');

// With fallback
const { primary, fallback } = AIProviderFactory.createProviderWithFallback(
  'bedrock', 'openai'
);
```

## Framework Integration

### SvelteKit

#### API Route (`src/routes/api/chat/+server.ts`)
```typescript
import { createBestAIProvider } from '@juspay/neurolink';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { message } = await request.json();

    const provider = createBestAIProvider();
    const result = await provider.streamText({
      prompt: message,
      temperature: 0.7,
      maxTokens: 1000
    });

    return new Response(result.toReadableStream(), {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
```

#### Svelte Component (`src/routes/chat/+page.svelte`)
```svelte
<script lang="ts">
  let message = '';
  let response = '';
  let isLoading = false;

  async function sendMessage() {
    if (!message.trim()) return;

    isLoading = true;
    response = '';

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });

      if (!res.body) throw new Error('No response');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        response += decoder.decode(value, { stream: true });
      }
    } catch (error) {
      response = `Error: ${error.message}`;
    } finally {
      isLoading = false;
    }
  }
</script>

<div class="chat">
  <input bind:value={message} placeholder="Ask something..." />
  <button on:click={sendMessage} disabled={isLoading}>
    {isLoading ? 'Sending...' : 'Send'}
  </button>

  {#if response}
    <div class="response">{response}</div>
  {/if}
</div>
```

### Next.js

#### App Router API (`app/api/ai/route.ts`)
```typescript
import { createBestAIProvider } from '@juspay/neurolink';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { prompt, ...options } = await request.json();

    const provider = createBestAIProvider();
    const result = await provider.generateText({
      prompt,
      temperature: 0.7,
      maxTokens: 1000,
      ...options
    });

    return NextResponse.json({
      text: result.text,
      provider: result.provider,
      usage: result.usage
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

#### React Component (`components/AIChat.tsx`)
```typescript
'use client';
import { useState } from 'react';

export default function AIChat() {
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!prompt.trim()) return;

    setLoading(true);
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      const data = await response.json();
      setResult(data.text);
    } catch (error) {
      setResult(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter your prompt..."
          className="flex-1 p-2 border rounded"
        />
        <button
          onClick={generate}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Generate'}
        </button>
      </div>

      {result && (
        <div className="p-4 bg-gray-100 rounded">
          {result}
        </div>
      )}
    </div>
  );
}
```

### Express.js

```typescript
import express from 'express';
import { createBestAIProvider, AIProviderFactory } from '@juspay/neurolink';

const app = express();
app.use(express.json());

// Simple generation endpoint
app.post('/api/generate', async (req, res) => {
  try {
    const { prompt, options = {} } = req.body;

    const provider = createBestAIProvider();
    const result = await provider.generateText({
      prompt,
      ...options
    });

    res.json({
      success: true,
      text: result.text,
      provider: result.provider
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Streaming endpoint
app.post('/api/stream', async (req, res) => {
  try {
    const { prompt } = req.body;

    const provider = createBestAIProvider();
    const result = await provider.streamText({ prompt });

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Cache-Control', 'no-cache');

    for await (const chunk of result.textStream) {
      res.write(chunk);
    }
    res.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
```

### React Hook

```typescript
import { useState, useCallback } from 'react';

interface AIOptions {
  temperature?: number;
  maxTokens?: number;
  provider?: string;
}

export function useAI() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (
    prompt: string,
    options: AIOptions = {}
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, ...options })
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.text;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { generate, loading, error };
}

// Usage
function MyComponent() {
  const { generate, loading, error } = useAI();

  const handleClick = async () => {
    const result = await generate("Explain React hooks", {
      temperature: 0.7,
      maxTokens: 500
    });
    console.log(result);
  };

  return (
    <button onClick={handleClick} disabled={loading}>
      {loading ? 'Generating...' : 'Generate'}
    </button>
  );
}
```

## API Reference

### Core Functions

#### `createBestAIProvider(requestedProvider?, modelName?)`
Creates the best available AI provider based on environment configuration.

```typescript
const provider = createBestAIProvider();
const provider = createBestAIProvider('openai'); // Prefer OpenAI
const provider = createBestAIProvider('bedrock', 'claude-3-7-sonnet');
```

#### `createAIProviderWithFallback(primary, fallback, modelName?)`
Creates a provider with automatic fallback.

```typescript
const { primary, fallback } = createAIProviderWithFallback('bedrock', 'openai');

try {
  const result = await primary.generateText({ prompt });
} catch {
  const result = await fallback.generateText({ prompt });
}
```

### AIProviderFactory

#### `createProvider(providerName, modelName?)`
Creates a specific provider instance.

```typescript
const openai = AIProviderFactory.createProvider('openai', 'gpt-4o');
const bedrock = AIProviderFactory.createProvider('bedrock', 'claude-3-7-sonnet');
const vertex = AIProviderFactory.createProvider('vertex', 'gemini-2.5-flash');
```

### Provider Interface

All providers implement the same interface:

```typescript
interface AIProvider {
  generateText(options: GenerateTextOptions): Promise<GenerateTextResult>;
  streamText(options: StreamTextOptions): Promise<StreamTextResult>;
}

interface GenerateTextOptions {
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

interface GenerateTextResult {
  text: string;
  provider: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}
```

### Supported Models

#### OpenAI
- `gpt-4o` (default)
- `gpt-4o-mini`
- `gpt-4-turbo`

#### Amazon Bedrock
- `claude-3-7-sonnet` (default)
- `claude-3-5-sonnet`
- `claude-3-haiku`

#### Google Vertex AI
- `gemini-2.5-flash` (default)
- `claude-4.0-sonnet`

## Provider Configuration

### OpenAI Setup
```bash
export OPENAI_API_KEY="sk-your-key-here"
```

### Amazon Bedrock Setup

**⚠️ CRITICAL: Anthropic Models Require Inference Profile ARN**

For Anthropic Claude models in Bedrock, you **MUST** use the full inference profile ARN, not simple model names:

```bash
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_REGION="us-east-2"

# ✅ CORRECT: Use full inference profile ARN for Anthropic models
export BEDROCK_MODEL="arn:aws:bedrock:us-east-2:<account_id>:inference-profile/us.anthropic.claude-3-7-sonnet-20250219-v1:0"

# ❌ WRONG: Simple model names cause "not authorized to invoke this API" errors
# export BEDROCK_MODEL="anthropic.claude-3-sonnet-20240229-v1:0"
```

#### Why Inference Profiles?
- **Cross-Region Access**: Faster access across AWS regions
- **Better Performance**: Optimized routing and response times
- **Higher Availability**: Improved model availability and reliability
- **Different Permissions**: Separate permission model from base models

#### Available Inference Profile ARNs
```bash
# Claude 3.7 Sonnet (Latest - Recommended)
BEDROCK_MODEL="arn:aws:bedrock:us-east-2:<account_id>:inference-profile/us.anthropic.claude-3-7-sonnet-20250219-v1:0"

# Claude 3.5 Sonnet
BEDROCK_MODEL="arn:aws:bedrock:us-east-2:<account_id>:inference-profile/us.anthropic.claude-3-5-sonnet-20241022-v2:0"

# Claude 3 Haiku
BEDROCK_MODEL="arn:aws:bedrock:us-east-2:<account_id>:inference-profile/us.anthropic.claude-3-haiku-20240307-v1:0"
```

#### Session Token Support
For temporary credentials (common in development):
```bash
export AWS_SESSION_TOKEN="your-session-token"  # Required for temporary credentials
```

### Google Vertex AI Setup

NeuroLink supports **three authentication methods** for Google Vertex AI:

#### Method 1: Service Account File (Recommended for Production)
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"
export GOOGLE_VERTEX_PROJECT="your-project-id"
export GOOGLE_VERTEX_LOCATION="us-central1"
```

#### Method 2: Service Account JSON String (Good for Containers/Cloud)
```bash
export GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"your-project",...}'
export GOOGLE_VERTEX_PROJECT="your-project-id"
export GOOGLE_VERTEX_LOCATION="us-central1"
```

#### Method 3: Individual Environment Variables (Good for CI/CD)
```bash
export GOOGLE_AUTH_CLIENT_EMAIL="service-account@project.iam.gserviceaccount.com"
export GOOGLE_AUTH_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE..."
export GOOGLE_VERTEX_PROJECT="your-project-id"
export GOOGLE_VERTEX_LOCATION="us-central1"
```

### Complete Environment Variables Reference

#### OpenAI Configuration
```bash
# Required
OPENAI_API_KEY="sk-your-openai-api-key"

# Optional
OPENAI_MODEL="gpt-4o"                    # Default model to use
```

#### Amazon Bedrock Configuration
```bash
# Required
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"

# Optional
AWS_REGION="us-east-2"                   # Default: us-east-2
AWS_SESSION_TOKEN="your-session-token"   # Required for temporary credentials
BEDROCK_MODEL_ID="anthropic.claude-3-7-sonnet-20250219-v1:0"  # Default model
```

#### Google Vertex AI Configuration
```bash
# Required (choose one authentication method)
# Method 1: Service Account File
GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"

# Method 2: Service Account JSON String
GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'

# Method 3: Individual Environment Variables
GOOGLE_AUTH_CLIENT_EMAIL="service-account@project.iam.gserviceaccount.com"
GOOGLE_AUTH_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE..."

# Required for all methods
GOOGLE_VERTEX_PROJECT="your-gcp-project-id"

# Optional
GOOGLE_VERTEX_LOCATION="us-east5"        # Default: us-east5
VERTEX_MODEL_ID="claude-sonnet-4@20250514"  # Default model
```

#### General Configuration
```bash
# Provider Selection (optional)
DEFAULT_PROVIDER="bedrock"               # Primary provider preference
FALLBACK_PROVIDER="openai"               # Fallback provider

# Application Settings
PUBLIC_APP_ENVIRONMENT="dev"             # dev, staging, production
ENABLE_STREAMING="true"                  # Enable streaming responses
ENABLE_FALLBACK="true"                   # Enable automatic fallback

# Debug and Logging
NEUROLINK_DEBUG="true"                   # Enable debug logging
LOG_LEVEL="info"                         # error, warn, info, debug
```

#### Environment File Example (.env)
```bash
# Copy this to your .env file and fill in your credentials

# OpenAI
OPENAI_API_KEY=sk-your-openai-key-here
OPENAI_MODEL=gpt-4o

# Amazon Bedrock
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-2
BEDROCK_MODEL_ID=anthropic.claude-3-7-sonnet-20250219-v1:0

# Google Vertex AI (choose one method)
# Method 1: File path
GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/service-account.json

# Method 2: JSON string (uncomment to use)
# GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"your-project",...}

# Method 3: Individual variables (uncomment to use)
# GOOGLE_AUTH_CLIENT_EMAIL=service-account@your-project.iam.gserviceaccount.com
# GOOGLE_AUTH_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----"

# Required for all Google Vertex AI methods
GOOGLE_VERTEX_PROJECT=your-gcp-project-id
GOOGLE_VERTEX_LOCATION=us-east5
VERTEX_MODEL_ID=claude-sonnet-4@20250514

# Application Settings
DEFAULT_PROVIDER=auto
ENABLE_STREAMING=true
ENABLE_FALLBACK=true
NEUROLINK_DEBUG=false
```

## Advanced Patterns

### Custom Configuration
```typescript
import { AIProviderFactory } from '@juspay/neurolink';

// Environment-based provider selection
const isDev = process.env.NODE_ENV === 'development';
const provider = isDev
  ? AIProviderFactory.createProvider('openai', 'gpt-4o-mini') // Cheaper for dev
  : AIProviderFactory.createProvider('bedrock', 'claude-3-7-sonnet'); // Production

// Multiple providers for different use cases
const providers = {
  creative: AIProviderFactory.createProvider('openai', 'gpt-4o'),
  analytical: AIProviderFactory.createProvider('bedrock', 'claude-3-7-sonnet'),
  fast: AIProviderFactory.createProvider('vertex', 'gemini-2.5-flash')
};

async function generateCreativeContent(prompt: string) {
  return await providers.creative.generateText({
    prompt,
    temperature: 0.9,
    maxTokens: 2000
  });
}
```

### Response Caching
```typescript
const cache = new Map<string, { text: string; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function cachedGenerate(prompt: string) {
  const key = prompt.toLowerCase().trim();
  const cached = cache.get(key);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return { ...cached, fromCache: true };
  }

  const provider = createBestAIProvider();
  const result = await provider.generateText({ prompt });

  cache.set(key, { text: result.text, timestamp: Date.now() });
  return { text: result.text, fromCache: false };
}
```

### Batch Processing
```typescript
async function processBatch(prompts: string[]) {
  const provider = createBestAIProvider();
  const chunkSize = 5;
  const results = [];

  for (let i = 0; i < prompts.length; i += chunkSize) {
    const chunk = prompts.slice(i, i + chunkSize);

    const chunkResults = await Promise.allSettled(
      chunk.map(prompt => provider.generateText({ prompt, maxTokens: 500 }))
    );

    results.push(...chunkResults);

    // Rate limiting
    if (i + chunkSize < prompts.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results.map((result, index) => ({
    prompt: prompts[index],
    success: result.status === 'fulfilled',
    result: result.status === 'fulfilled' ? result.value : result.reason
  }));
}
```

## Error Handling

### Troubleshooting Common Issues

#### AWS Credentials and Authorization
```
ValidationException: Your account is not authorized to invoke this API operation.
```
- **Cause**: The AWS account doesn't have access to Bedrock or the specific model
- **Solution**:
  - Verify your AWS account has Bedrock enabled
  - Check model availability in your AWS region
  - Ensure your IAM role has `bedrock:InvokeModel` permissions

#### Missing or Invalid Credentials
```
Error: Cannot find API key for OpenAI provider
```
- **Cause**: The environment variable for API credentials is missing
- **Solution**: Set the appropriate environment variable (OPENAI_API_KEY, etc.)

#### Google Vertex Import Issues
```
Cannot find package '@google-cloud/vertexai' imported from...
```
- **Cause**: Missing Google Vertex AI peer dependency
- **Solution**: Install the package with `npm install @google-cloud/vertexai`

#### Session Token Expired
```
The security token included in the request is expired
```
- **Cause**: AWS session token has expired
- **Solution**: Generate new AWS credentials with a fresh session token

### Comprehensive Error Handling
```typescript
import { createBestAIProvider } from '@juspay/neurolink';

async function robustGenerate(prompt: string, maxRetries = 3) {
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const provider = createBestAIProvider();
      return await provider.generateText({ prompt });
    } catch (error) {
      attempt++;
      console.error(`Attempt ${attempt} failed:`, error.message);

      if (attempt >= maxRetries) {
        throw new Error(`Failed after ${maxRetries} attempts: ${error.message}`);
      }

      // Exponential backoff
      await new Promise(resolve =>
        setTimeout(resolve, Math.pow(2, attempt) * 1000)
      );
    }
  }
}
```

### Provider Fallback
```typescript
async function generateWithFallback(prompt: string) {
  const providers = ['bedrock', 'openai', 'vertex'];

  for (const providerName of providers) {
    try {
      const provider = AIProviderFactory.createProvider(providerName);
      return await provider.generateText({ prompt });
    } catch (error) {
      console.warn(`${providerName} failed:`, error.message);

      if (error.message.includes('API key') || error.message.includes('credentials')) {
        console.log(`${providerName} not configured, trying next...`);
        continue;
      }
    }
  }

  throw new Error('All providers failed or are not configured');
}
```

### Common Error Types
```typescript
// Provider not configured
if (error.message.includes('API key')) {
  console.error('Provider API key not set');
}

// Rate limiting
if (error.message.includes('rate limit')) {
  console.error('Rate limit exceeded, implement backoff');
}

// Model not available
if (error.message.includes('model')) {
  console.error('Requested model not available');
}

// Network issues
if (error.message.includes('network') || error.message.includes('timeout')) {
  console.error('Network connectivity issue');
}
```

## Performance

### Optimization Tips

1. **Choose Right Models for Use Case**
   ```typescript
   // Fast responses for simple tasks
   const fast = AIProviderFactory.createProvider('vertex', 'gemini-2.5-flash');

   // High quality for complex tasks
   const quality = AIProviderFactory.createProvider('bedrock', 'claude-3-7-sonnet');

   // Cost-effective for development
   const dev = AIProviderFactory.createProvider('openai', 'gpt-4o-mini');
   ```

2. **Streaming for Long Responses**
   ```typescript
   // Use streaming for better UX on long content
   const result = await provider.streamText({
     prompt: "Write a detailed article...",
     maxTokens: 2000
   });
   ```

3. **Appropriate Token Limits**
   ```typescript
   // Set reasonable limits to control costs
   const result = await provider.generateText({
     prompt: "Summarize this text",
     maxTokens: 150 // Just enough for a summary
   });
   ```

### Provider Limits
- **OpenAI**: Rate limits based on tier (TPM/RPM)
- **Bedrock**: Regional quotas and model availability
- **Vertex AI**: Project-based quotas and rate limits

## Contributing

We welcome contributions! Here's how to get started:

### Development Setup
```bash
git clone https://github.com/juspay/neurolink
cd neurolink
pnpm install
```

### Running Tests
```bash
pnpm test        # Run all tests
pnpm test:watch  # Watch mode
pnpm test:coverage # Coverage report
```

### Building
```bash
pnpm build       # Build the library
pnpm check       # Type checking
pnpm lint        # Lint code
```

### Guidelines
- Follow existing TypeScript patterns
- Add tests for new features
- Update documentation
- Ensure all providers work consistently

## License

MIT © [Juspay Technologies](https://juspay.in)

## Related Projects

- [Vercel AI SDK](https://github.com/vercel/ai) - Underlying provider implementations
- [SvelteKit](https://kit.svelte.dev) - Web framework
- [Lighthouse](https://github.com/juspay/lighthouse) - Original source project

---

<p align="center">
  <strong>Built with ❤️ by <a href="https://juspay.in">Juspay Technologies</a></strong>
</p>
