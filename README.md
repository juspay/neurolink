# 🧠 NeuroLink

[![npm version](https://badge.fury.io/js/%40juspay%2Fneurolink.svg)](https://badge.fury.io/js/%40juspay%2Fneurolink)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Production-ready AI toolkit with multi-provider support, automatic fallback, and full TypeScript integration. **Now with a professional CLI!**

**NeuroLink** provides a unified interface for AI providers (OpenAI, Amazon Bedrock, Google Vertex AI) with intelligent fallback, streaming support, and type-safe APIs. Available as both a **programmatic SDK** and a **professional CLI tool**. Extracted from production use at Juspay.

## 🚀 Quick Start

### 📦 Installation

```bash
# Install globally for CLI usage
npm install -g @juspay/neurolink

# Or use directly with npx (no installation required)
npx @juspay/neurolink generate-text "Hello, AI!"

# Or install globally
npm install -g @juspay/neurolink
neurolink generate-text "Write a haiku about programming"
neurolink status --verbose
```

### Programmatic Usage
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

## 🎬 Complete Visual Documentation

**No installation required!** Experience NeuroLink's capabilities through our comprehensive visual ecosystem:

### 🌐 Web Demo Screenshots & Videos

#### **📸 Interactive Web Interface Screenshots**
| Feature | Screenshot | Description |
|---------|------------|-------------|
| **Main Interface** | ![Main Interface](./neurolink-demo/screenshots/01-overview/01-main-interface-overview-2025-06-04T13-56-43-628Z.png) | Complete web interface showing all features |
| **AI Generation Results** | ![AI Generation](./neurolink-demo/screenshots/02-basic-examples/02-ai-generation-results-2025-06-04T13-57-13-156Z.png) | Real AI content generation in action |
| **Business Use Cases** | ![Business Cases](./neurolink-demo/screenshots/03-business-use-cases/03-business-use-cases-2025-06-04T13-59-07-846Z.png) | Professional business applications |
| **Creative Tools** | ![Creative Tools](./neurolink-demo/screenshots/04-creative-tools/04-creative-tools-2025-06-04T13-59-24-346Z.png) | Creative content generation |
| **Developer Tools** | ![Developer Tools](./neurolink-demo/screenshots/05-developer-tools/05-developer-tools-2025-06-04T13-59-43-322Z.png) | Code generation and API docs |
| **Analytics & Monitoring** | ![Monitoring](./neurolink-demo/screenshots/06-monitoring/06-monitoring-analytics-2025-06-04T14-00-08-919Z.png) | Real-time provider analytics |

#### **🎥 Complete Demo Videos** *(5,681+ tokens of real AI generation)*
- **[Basic Examples](./neurolink-demo/videos/basic-examples/)** - Text generation, haiku creation, storytelling
- **[Business Use Cases](./neurolink-demo/videos/business-use-cases/)** - Email generation, analysis, summaries
- **[Creative Tools](./neurolink-demo/videos/creative-tools/)** - Stories, translation, creative ideas
- **[Developer Tools](./neurolink-demo/videos/developer-tools/)** - React code, API docs, debugging help
- **[Monitoring & Analytics](./neurolink-demo/videos/monitoring/)** - Live provider status and performance

### 🖥️ CLI Tool Screenshots & Videos

#### **📸 Professional CLI Screenshots**
| Command | Screenshot | Description |
|---------|------------|-------------|
| **CLI Help Overview** | ![CLI Help](./cli-screenshots/01-cli-help-2025-06-04T19-38-12.png) | Complete command reference |
| **Provider Status Check** | ![Provider Status](./cli-screenshots/02-provider-status-2025-06-04T19-38-25.png) | All provider connectivity verified |
| **Text Generation** | ![Text Generation](./cli-screenshots/03-text-generation-2025-06-04T19-38-30.png) | Real AI haiku generation with JSON |
| **Auto Provider Selection** | ![Best Provider](./cli-screenshots/04-best-provider-2025-06-04T19-38-33.png) | Automatic provider selection working |
| **Batch Processing** | ![Batch Results](./cli-screenshots/05-batch-results-2025-06-04T19-38-37.png) | Multi-prompt processing with results |

#### **🎥 CLI Demonstration Videos** *(Real command execution)*
- **[CLI Overview](./cli-videos/cli-overview/)** - Help, status, provider selection commands
- **[Basic Generation](./cli-videos/cli-basic-generation/)** - Text generation with different providers
- **[Batch Processing](./cli-videos/cli-batch-processing/)** - File-based multi-prompt processing
- **[Real-time Streaming](./cli-videos/cli-streaming/)** - Live AI content streaming
- **[Advanced Features](./cli-videos/cli-advanced-features/)** - Verbose diagnostics and provider options

### 💻 Live Interactive Demo
- **Working Express.js server** with real API integration
- **All 3 providers functional** (OpenAI, Bedrock, Vertex AI)
- **15+ use cases** demonstrated across business, creative, and developer tools
- **Real-time provider analytics** with performance metrics

### 🎯 Visual Content Benefits
- ✅ **No Installation Required** - See everything in action before installing
- ✅ **Real AI Content** - All screenshots and videos show actual AI generation
- ✅ **Professional Quality** - 1920x1080 resolution suitable for documentation
- ✅ **Complete Coverage** - Every major feature visually documented
- ✅ **Production Validation** - Demonstrates real-world usage patterns

[📁 View complete visual documentation](./neurolink-demo/) including all screenshots, videos, and interactive examples.

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

## 🖥️ CLI Tool

NeuroLink includes a professional CLI tool that provides all SDK functionality through an elegant command-line interface.

### Installation & Usage

#### Option 1: NPX (No Installation Required)
```bash
# Use directly without installation
npx @juspay/neurolink --help
npx @juspay/neurolink generate-text "Hello, AI!"
npx @juspay/neurolink status
```

#### Option 2: Global Installation
```bash
# Install globally for convenient access
npm install -g @juspay/neurolink

# Then use anywhere
neurolink --help
neurolink generate-text "Write a haiku about programming"
neurolink status --verbose
```

#### Option 3: Local Project Usage
```bash
# Add to project and use via npm scripts
npm install @juspay/neurolink
npx neurolink generate-text "Explain TypeScript"
```

### CLI Commands

#### `generate-text <prompt>` - Core Text Generation
```bash
# Basic text generation
neurolink generate-text "Explain quantum computing"

# With provider selection
neurolink generate-text "Write a story" --provider openai

# With temperature and token control
neurolink generate-text "Creative writing" --temperature 0.9 --max-tokens 1000

# JSON output for scripting
neurolink generate-text "Summary of AI" --format json
```

**Output Example:**
```
🤖 Generating text...
✅ Text generated successfully!
Quantum computing represents a revolutionary approach to information processing...
ℹ️  127 tokens used
```

#### `stream <prompt>` - Real-time Streaming
```bash
# Stream text generation in real-time
neurolink stream "Tell me a story about robots"

# With provider selection
neurolink stream "Explain machine learning" --provider vertex --temperature 0.8
```

**Output Example:**
```
🔄 Streaming from auto provider...

Once upon a time, in a world where technology had advanced beyond...
[text streams in real-time as it's generated]
```

#### `batch <file>` - Process Multiple Prompts
```bash
# Create a file with prompts (one per line)
echo -e "Write a haiku\nExplain gravity\nDescribe the ocean" > prompts.txt

# Process all prompts
neurolink batch prompts.txt

# Save results to JSON file
neurolink batch prompts.txt --output results.json

# Add delay between requests (rate limiting)
neurolink batch prompts.txt --delay 2000
```

**Output Example:**
```
📦 Processing 3 prompts...

✅ 1/3 completed
✅ 2/3 completed
✅ 3/3 completed
✅ Results saved to results.json
```

#### `status` - Provider Diagnostics
```bash
# Check all provider connectivity
neurolink status

# Verbose output with detailed information
neurolink status --verbose
```

**Output Example:**
```
🔍 Checking AI provider status...

✅ openai: ✅ Working (234ms)
✅ bedrock: ✅ Working (456ms)
❌ vertex: ❌ Authentication failed

📊 Summary: 2/3 providers working
```

#### `get-best-provider` - Auto-selection Testing
```bash
# Test which provider would be auto-selected
neurolink get-best-provider
```

**Output Example:**
```
🎯 Finding best provider...
✅ Best provider: bedrock
```

### CLI Options & Arguments

#### Global Options
- `--help, -h` - Show help information
- `--version, -v` - Show version number

#### Generation Options
- `--provider <name>` - Choose provider: `auto` (default), `openai`, `bedrock`, `vertex`
- `--temperature <number>` - Creativity level: `0.0` (focused) to `1.0` (creative), default: `0.7`
- `--max-tokens <number>` - Maximum tokens to generate, default: `500`
- `--format <type>` - Output format: `text` (default) or `json`

#### Batch Processing Options
- `--output <file>` - Save results to JSON file
- `--delay <ms>` - Delay between requests in milliseconds, default: `1000`

#### Status Options
- `--verbose, -v` - Show detailed diagnostic information

### CLI Features

#### ✨ Professional UX
- **Animated Spinners**: Beautiful animations during AI generation
- **Colorized Output**: Green ✅ for success, red ❌ for errors, blue ℹ️ for info
- **Progress Tracking**: Real-time progress for batch operations
- **Smart Error Messages**: Helpful hints for common issues

#### 🛠️ Developer-Friendly
- **Multiple Output Formats**: Text for humans, JSON for scripts
- **Provider Selection**: Test specific providers or use auto-selection
- **Batch Processing**: Handle multiple prompts efficiently
- **Status Monitoring**: Check provider health and connectivity

#### 🔧 Automation Ready
- **Exit Codes**: Standard exit codes for scripting
- **JSON Output**: Structured data for automated workflows
- **Environment Variable**: All SDK environment variables work with CLI
- **Scriptable**: Perfect for CI/CD pipelines and automation

### CLI Usage Examples

#### Creative Writing Workflow
```bash
# Generate creative content with high temperature
neurolink generate-text "Write a sci-fi story opening" \
  --provider openai \
  --temperature 0.9 \
  --max-tokens 1000 \
  --format json > story.json

# Check what was generated
cat story.json | jq '.content'
```

#### Batch Content Processing
```bash
# Create prompts file
cat > content-prompts.txt << EOF
Write a product description for AI software
Create a social media post about technology
Draft an email about our new features
Write a blog post title about machine learning
EOF

# Process all prompts and save results
neurolink batch content-prompts.txt \
  --output content-results.json \
  --provider bedrock \
  --delay 2000

# Extract just the content
cat content-results.json | jq -r '.[].response'
```

#### Provider Health Monitoring
```bash
# Check provider status (useful for monitoring scripts)
neurolink status --format json > status.json

# Parse results in scripts
working_providers=$(cat status.json | jq '[.[] | select(.status == "working")] | length')
echo "Working providers: $working_providers"
```

#### Integration with Shell Scripts
```bash
#!/bin/bash
# AI-powered commit message generator

# Get git diff
diff=$(git diff --cached --name-only)

if [ -z "$diff" ]; then
  echo "No staged changes found"
  exit 1
fi

# Generate commit message
commit_msg=$(neurolink generate-text \
  "Generate a concise git commit message for these changes: $diff" \
  --max-tokens 50 \
  --temperature 0.3)

echo "Suggested commit message:"
echo "$commit_msg"

# Optionally auto-commit
read -p "Use this commit message? (y/N): " -n 1 -r
if [[ $REPLY =~ ^[Yy]$ ]]; then
  git commit -m "$commit_msg"
fi
```

### Environment Setup for CLI

The CLI uses the same environment variables as the SDK:

```bash
# Set up your providers (same as SDK)
export OPENAI_API_KEY="sk-your-key"
export AWS_ACCESS_KEY_ID="your-aws-key"
export AWS_SECRET_ACCESS_KEY="your-aws-secret"
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"

# Test configuration
neurolink status
```

### CLI vs SDK Comparison

| Feature | CLI | SDK |
|---------|-----|-----|
| **Text Generation** | ✅ `generate-text` | ✅ `generateText()` |
| **Streaming** | ✅ `stream` | ✅ `streamText()` |
| **Provider Selection** | ✅ `--provider` flag | ✅ `createProvider()` |
| **Batch Processing** | ✅ `batch` command | ✅ Manual implementation |
| **Status Monitoring** | ✅ `status` command | ✅ Manual testing |
| **JSON Output** | ✅ `--format json` | ✅ Native objects |
| **Automation** | ✅ Perfect for scripts | ✅ Perfect for apps |
| **Learning Curve** | 🟢 Low | 🟡 Medium |

### When to Use CLI vs SDK

#### Use the CLI when:
- 🔧 **Prototyping**: Quick testing of prompts and providers
- 📜 **Scripting**: Shell scripts and automation workflows
- 🔍 **Debugging**: Checking provider status and testing connectivity
- 📊 **Batch Processing**: Processing multiple prompts from files
- 🎯 **One-off Tasks**: Generating content without writing code

#### Use the SDK when:
- 🏗️ **Application Development**: Building web apps, APIs, or services
- 🔄 **Real-time Integration**: Chat interfaces, streaming responses
- ⚙️ **Complex Logic**: Custom provider fallback, error handling
- 🎨 **UI Integration**: React components, Svelte stores
- 📈 **Production Applications**: Full-featured applications

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
