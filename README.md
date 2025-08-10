# 🧠 NeuroLink

[![NPM Version](https://img.shields.io/npm/v/@juspay/neurolink)](https://www.npmjs.com/package/@juspay/neurolink)
[![Downloads](https://img.shields.io/npm/dm/@juspay/neurolink)](https://www.npmjs.com/package/@juspay/neurolink)
[![GitHub Stars](https://img.shields.io/github/stars/juspay/neurolink)](https://github.com/juspay/neurolink/stargazers)
[![License](https://img.shields.io/npm/l/@juspay/neurolink)](https://github.com/juspay/neurolink/blob/release/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue)](https://www.typescriptlang.org/)
[![CI](https://github.com/juspay/neurolink/workflows/CI/badge.svg)](https://github.com/juspay/neurolink/actions)

> **Enterprise AI Development Platform** with universal provider support, factory pattern architecture, and **access to 100+ AI models** through LiteLLM integration. Production-ready with TypeScript support.

**NeuroLink** is an Enterprise AI Development Platform that unifies **10 major AI providers** with intelligent fallback and built-in tool support. Available as both a **programmatic SDK** and **professional CLI tool**. Features LiteLLM integration for **100+ models**, plus 6 core tools working across all providers. Extracted from production use at Juspay.

## 🎉 **NEW: LiteLLM Integration - Access 100+ AI Models**

**NeuroLink now supports LiteLLM**, providing unified access to **100+ AI models** from all major providers through a single interface:

- **🔄 Universal Access**: OpenAI, Anthropic, Google, Mistral, Meta, and more
- **🎯 Unified Interface**: OpenAI-compatible API for all models
- **💰 Cost Optimization**: Automatic routing to cost-effective models
- **⚡ Load Balancing**: Automatic failover and load distribution
- **📊 Analytics**: Built-in usage tracking and monitoring

```bash
# Quick start with LiteLLM
pip install litellm && litellm --port 4000

# Use any of 100+ models through one interface
npx @juspay/neurolink generate "Hello" --provider litellm --model "openai/gpt-4o"
npx @juspay/neurolink generate "Hello" --provider litellm --model "anthropic/claude-3-5-sonnet"
npx @juspay/neurolink generate "Hello" --provider litellm --model "google/gemini-2.0-flash"
```

**[📖 Complete LiteLLM Integration Guide](./docs/LITELLM-INTEGRATION.md)** - Setup, configuration, and 100+ model access

## 🚀 Enterprise Platform Features

- **🏭 Factory Pattern Architecture** - Unified provider management through BaseProvider inheritance
- **🔧 Tools-First Design** - All providers include built-in tool support without additional configuration
- **🔗 LiteLLM Integration** - **100+ models** from all major providers through unified interface
- **🏗️ Enterprise Architecture** - Production-ready with clean abstractions
- **🔄 Configuration Management** - Flexible provider configuration with automatic backups
- **✅ Type Safety** - Industry-standard TypeScript interfaces
- **⚡ Performance** - Fast response times with streaming support and 68% improved status checks
- **🛡️ Error Recovery** - Graceful failures with provider fallback and retry logic
- **📊 Analytics & Evaluation** - Built-in usage tracking and AI-powered quality assessment
- **🔧 MCP Integration** - Model Context Protocol with 6 built-in tools and 58+ discoverable servers
- **🚀 Lighthouse Integration** - Unified tool registration API supporting both object and array formats for seamless Lighthouse tool import

---

## 🚀 Quick Start

### Install & Run (2 minutes)

```bash
# Option 1: LiteLLM - Access 100+ models through one interface
pip install litellm && litellm --port 4000
export LITELLM_BASE_URL="http://localhost:4000"
export LITELLM_API_KEY="sk-anything"

# Use any of 100+ models
npx @juspay/neurolink generate "Hello, AI" --provider litellm --model "openai/gpt-4o"
npx @juspay/neurolink generate "Hello, AI" --provider litellm --model "anthropic/claude-3-5-sonnet"

# Option 2: OpenAI Compatible - Use any OpenAI-compatible endpoint with auto-discovery
export OPENAI_COMPATIBLE_BASE_URL="https://api.openrouter.ai/api/v1"
export OPENAI_COMPATIBLE_API_KEY="sk-or-v1-your-api-key"
# Auto-discovers available models via /v1/models endpoint
npx @juspay/neurolink generate "Hello, AI" --provider openai-compatible

# Or specify a model explicitly
export OPENAI_COMPATIBLE_MODEL="claude-3-5-sonnet"
npx @juspay/neurolink generate "Hello, AI" --provider openai-compatible

# Option 3: Direct Provider - Quick setup with Google AI Studio (free tier)
export GOOGLE_AI_API_KEY="AIza-your-google-ai-api-key"
npx @juspay/neurolink generate "Hello, AI" --provider google-ai

# CLI Commands - No installation required
npx @juspay/neurolink generate "Explain AI"  # Auto-selects best provider
npx @juspay/neurolink gen "Write code"       # Shortest form
npx @juspay/neurolink stream "Tell a story" # Real-time streaming
npx @juspay/neurolink status                # Check all providers
```

```bash
# SDK Installation for using in your typescript projects
npm install @juspay/neurolink
```

### Basic Usage

```typescript
import { NeuroLink, AIProviderFactory } from "@juspay/neurolink";

// LiteLLM - Access 100+ models through unified interface
const litellmProvider = await AIProviderFactory.createProvider(
  "litellm",
  "openai/gpt-4o",
);
const result = await litellmProvider.generate({
  input: { text: "Write a haiku about programming" },
});

// Compare multiple models simultaneously
const models = [
  "openai/gpt-4o",
  "anthropic/claude-3-5-sonnet",
  "google/gemini-2.0-flash",
];
const comparisons = await Promise.all(
  models.map(async (model) => {
    const provider = await AIProviderFactory.createProvider("litellm", model);
    const result = await provider.generate({
      input: { text: "Explain quantum computing" },
    });
    return { model, response: result.content, provider: result.provider };
  }),
);

// Auto-select best available provider
const neurolink = new NeuroLink();
const autoResult = await neurolink.generate({
  input: { text: "Write a business email" },
  provider: "google-ai", // or let it auto-select
  timeout: "30s",
});

console.log(result.content);
console.log(`Used: ${result.provider}`);
```

#### 🔗 CLI-SDK Consistency (NEW! ✨)

Method aliases that match CLI command names:

```typescript
// All three methods are equivalent:
const result1 = await provider.generate({ input: { text: "Hello" } }); // Original
const result2 = await provider.generate({ input: { text: "Hello" } }); // Matches CLI 'generate'
const result3 = await provider.gen({ input: { text: "Hello" } }); // Matches CLI 'gen'

// Use whichever style you prefer:
const provider = createBestAIProvider();

// Detailed method name
const story = await provider.generate({
  input: { text: "Write a short story about AI" },
  maxTokens: 200,
});

// CLI-style method names
const poem = await provider.generate({ input: { text: "Write a poem" } });
const joke = await provider.gen({ input: { text: "Tell me a joke" } });
```

### Enhanced Features

#### CLI with Analytics & Evaluation

```bash
# Basic AI generation with auto-provider selection
npx @juspay/neurolink generate "Write a business email"

# LiteLLM with specific model
npx @juspay/neurolink generate "Write code" --provider litellm --model "anthropic/claude-3-5-sonnet"

# With analytics and evaluation
npx @juspay/neurolink generate "Write a proposal" --enable-analytics --enable-evaluation --debug

# Streaming with tools (default behavior)
npx @juspay/neurolink stream "What time is it and write a file with the current date"
```

#### SDK with LiteLLM and Enhancement Features

```typescript
import { NeuroLink, AIProviderFactory } from "@juspay/neurolink";

// LiteLLM multi-model comparison
const models = [
  "openai/gpt-4o",
  "anthropic/claude-3-5-sonnet",
  "google/gemini-2.0-flash",
];
const comparisons = await Promise.all(
  models.map(async (model) => {
    const provider = await AIProviderFactory.createProvider("litellm", model);
    return await provider.generate({
      input: { text: "Explain the benefits of renewable energy" },
      enableAnalytics: true,
      enableEvaluation: true,
    });
  }),
);

// Enhanced generation with analytics
const neurolink = new NeuroLink();
const result = await neurolink.generate({
  input: { text: "Write a business proposal" },
  enableAnalytics: true, // Get usage & cost data
  enableEvaluation: true, // Get AI quality scores
  context: { project: "Q1-sales" },
});

console.log("📊 Usage:", result.analytics);
console.log("⭐ Quality:", result.evaluation);
console.log("Response:", result.content);
```

### Environment Setup

```bash
# Create .env file (automatically loaded by CLI)
echo 'OPENAI_API_KEY="sk-your-openai-key"' > .env
echo 'GOOGLE_AI_API_KEY="AIza-your-google-ai-key"' >> .env
echo 'AWS_ACCESS_KEY_ID="your-aws-access-key"' >> .env

# Test configuration
npx @juspay/neurolink status
```

### JSON Format Support (Complete)

NeuroLink provides comprehensive JSON input/output support for both CLI and SDK:

```bash
# CLI JSON Output - Structured data for scripts
npx @juspay/neurolink generate "Summary of AI trends" --format json
npx @juspay/neurolink gen "Create a user profile" --format json --provider google-ai

# Example JSON Output:
{
  "content": "AI trends include increased automation...",
  "provider": "google-ai",
  "model": "gemini-2.5-flash",
  "usage": {
    "promptTokens": 15,
    "completionTokens": 127,
    "totalTokens": 142
  },
  "responseTime": 1234
}
```

```typescript
// SDK JSON Input/Output - Full TypeScript support
import { createBestAIProvider } from "@juspay/neurolink";

const provider = createBestAIProvider();

// Structured input
const result = await provider.generate({
  input: { text: "Create a product specification" },
  schema: {
    type: "object",
    properties: {
      name: { type: "string" },
      price: { type: "number" },
      features: { type: "array", items: { type: "string" } },
    },
  },
});

// Access structured response
const productData = JSON.parse(result.content);
console.log(productData.name, productData.price, productData.features);
```

**📖 [Complete Setup Guide](./docs/PROVIDER-CONFIGURATION.md)** - All providers with detailed instructions

## ✨ Key Features

- 🔗 **LiteLLM Integration** - **Access 100+ AI models** from all major providers through unified interface
- 🔍 **Smart Model Auto-Discovery** - OpenAI Compatible provider automatically detects available models via `/v1/models` endpoint
- 🏭 **Factory Pattern Architecture** - Unified provider management with BaseProvider inheritance
- 🔧 **Tools-First Design** - All providers automatically include 6 direct tools (getCurrentTime, readFile, listDirectory, calculateMath, writeFile, searchFiles)
- 🔄 **11 AI Providers** - OpenAI, Bedrock, Vertex AI, Google AI Studio, Anthropic, Azure, **LiteLLM**, **OpenAI Compatible**, Hugging Face, Ollama, Mistral AI
- 💰 **Cost Optimization** - Automatic selection of cheapest models and LiteLLM routing
- ⚡ **Automatic Fallback** - Never fail when providers are down, intelligent provider switching
- 🖥️ **CLI + SDK** - Use from command line or integrate programmatically with TypeScript support
- 🛡️ **Production Ready** - Enterprise-grade error handling, performance optimization, extracted from production
- ✅ **MCP Integration** - Model Context Protocol with working built-in tools and 58+ discoverable external servers
- 🔍 **Smart Model Resolution** - Fuzzy matching, aliases, and capability-based search across all providers
- 🏠 **Local AI Support** - Run completely offline with Ollama or through LiteLLM proxy
- 🌍 **Universal Model Access** - Direct providers + 100,000+ models via Hugging Face + 100+ models via LiteLLM
- 📊 **Analytics & Evaluation** - Built-in usage tracking and AI-powered quality assessment

## 🛠️ MCP Integration Status ✅ **BUILT-IN TOOLS WORKING**

| Component           | Status             | Description                                              |
| ------------------- | ------------------ | -------------------------------------------------------- |
| Built-in Tools      | ✅ **Working**     | 6 core tools fully functional across all providers       |
| SDK Custom Tools    | ✅ **Working**     | Register custom tools programmatically                   |
| External Discovery  | 🔍 **Discovery**   | 58+ MCP servers discovered from AI tools ecosystem       |
| Tool Execution      | ✅ **Working**     | Real-time AI tool calling with built-in tools            |
| **External Tools**  | 🚧 **Development** | Manual config needs one-line fix, activation in progress |
| **CLI Integration** | ✅ **READY**       | **Production-ready with built-in tools**                 |
| External Activation | 🔧 **Development** | Discovery complete, activation protocol in progress      |

### ✅ Quick MCP Test (v1.7.1)

```bash
# Test built-in tools (works immediately)
npx @juspay/neurolink generate "What time is it?" --debug

# Disable tools for pure text generation
npx @juspay/neurolink generate "Write a poem" --disable-tools

# Discover available MCP servers
npx @juspay/neurolink mcp discover --format table

# Install popular MCP servers (NEW: Bitbucket support added!)
npx @juspay/neurolink mcp install filesystem
npx @juspay/neurolink mcp install github
npx @juspay/neurolink mcp install bitbucket  # 🆕 NEW
```

### 🔧 SDK Custom Tool Registration (NEW!)

Register your own tools programmatically with the SDK:

```typescript
import { NeuroLink } from "@juspay/neurolink";
const neurolink = new NeuroLink();

// Register a simple tool
neurolink.registerTool("weatherLookup", {
  description: "Get current weather for a city",
  parameters: z.object({
    city: z.string().describe("City name"),
    units: z.enum(["celsius", "fahrenheit"]).optional(),
  }),
  execute: async ({ city, units = "celsius" }) => {
    // Your implementation here
    return {
      city,
      temperature: 22,
      units,
      condition: "sunny",
    };
  },
});

// Use it in generation
const result = await neurolink.generate({
  input: { text: "What's the weather in London?" },
  provider: "google-ai",
});

// Register multiple tools - Object format (existing)
neurolink.registerTools({
  stockPrice: {
    description: "Get stock price",
    execute: async () => ({ price: 150.25 }),
  },
  calculator: {
    description: "Calculate math",
    execute: async () => ({ result: 42 }),
  },
});

// Register multiple tools - Array format (Lighthouse compatible)
neurolink.registerTools([
  {
    name: "lighthouseTool1",
    tool: {
      description: "Lighthouse analytics tool",
      parameters: z.object({
        merchantId: z.string(),
        dateRange: z.string().optional(),
      }),
      execute: async ({ merchantId, dateRange }) => {
        // Lighthouse tool implementation with Zod schema
        return { data: "analytics result" };
      },
    },
  },
  {
    name: "lighthouseTool2",
    tool: {
      description: "Payment processing tool",
      execute: async () => ({ status: "processed" }),
    },
  },
]);
```

## 💰 Smart Model Selection

NeuroLink features intelligent model selection and cost optimization:

### Cost Optimization Features

- **💰 Automatic Cost Optimization**: Selects cheapest models for simple tasks
- **🔄 LiteLLM Model Routing**: Access 100+ models with automatic load balancing
- **🔍 Capability-Based Selection**: Find models with specific features (vision, function calling)
- **⚡ Intelligent Fallback**: Seamless switching when providers fail

```bash
# Cost optimization - automatically use cheapest model
npx @juspay/neurolink generate "Hello" --optimize-cost

# LiteLLM specific model selection
npx @juspay/neurolink generate "Complex analysis" --provider litellm --model "anthropic/claude-3-5-sonnet"

# Auto-select best available provider
npx @juspay/neurolink generate "Write code" # Automatically chooses optimal provider
```

## 💻 Essential Examples

### CLI Commands

```bash
# Text generation with automatic MCP tool detection (default)
npx @juspay/neurolink generate "What time is it?"

# Alternative short form
npx @juspay/neurolink gen "What time is it?"

# Disable tools for training-data-only responses
npx @juspay/neurolink generate "What time is it?" --disable-tools

# With custom timeout for complex prompts
npx @juspay/neurolink generate "Explain quantum computing in detail" --timeout 1m

# Real-time streaming with agent support (default)
npx @juspay/neurolink stream "What time is it?"

# Streaming without tools (traditional mode)
npx @juspay/neurolink stream "Tell me a story" --disable-tools

# Streaming with extended timeout
npx @juspay/neurolink stream "Write a long story" --timeout 5m

# Provider diagnostics
npx @juspay/neurolink status --verbose

# Batch processing
echo -e "Write a haiku\nExplain gravity" > prompts.txt
npx @juspay/neurolink batch prompts.txt --output results.json

# Batch with custom timeout per request
npx @juspay/neurolink batch prompts.txt --timeout 45s --output results.json
```

### SDK Integration

```typescript
// SvelteKit API route with timeout handling
export const POST: RequestHandler = async ({ request }) => {
  const { message } = await request.json();
  const provider = createBestAIProvider();

  try {
    // NEW: Primary streaming method (recommended)
    const result = await provider.stream({
      input: { text: message },
      timeout: "2m", // 2 minutes for streaming
    });

    // Process stream
    for await (const chunk of result.stream) {
      // Handle streaming content
      console.log(chunk.content);
    }

    // LEGACY: Backward compatibility (still works)
    const legacyResult = await provider.stream({ input: { text:
      prompt: message,
      timeout: "2m", // 2 minutes for streaming
    });
    return new Response(result.toReadableStream());
  } catch (error) {
    if (error.name === "TimeoutError") {
      return new Response("Request timed out", { status: 408 });
    }
    throw error;
  }
};

// Next.js API route with timeout
export async function POST(request: NextRequest) {
  const { prompt } = await request.json();
  const provider = createBestAIProvider();

  const result = await provider.generate({
    prompt,
    timeout: process.env.AI_TIMEOUT || "30s", // Configurable timeout
  });

  return NextResponse.json({ text: result.content });
}
```

## 🎬 See It In Action

**No installation required!** Experience NeuroLink through comprehensive visual documentation:

### 📱 Interactive Web Demo

```bash
cd neurolink-demo && node server.js
# Visit http://localhost:9876 for live demo
```

- **Real AI Integration**: All 9 providers functional with live generation
- **Complete Use Cases**: Business, creative, and developer scenarios
- **Performance Metrics**: Live provider analytics and response times
- **Privacy Options**: Test local AI with Ollama

### 🖥️ CLI Demonstrations

- **[CLI Help & Commands](./docs/visual-content/cli-videos/cli-01-cli-help.mp4)** - Complete command reference
- **[Provider Status Check](./docs/visual-content/cli-videos/cli-02-provider-status.mp4)** - Connectivity verification (now with authentication and model availability checks)
- **[Text Generation](./docs/visual-content/cli-videos/cli-03-text-generation.mp4)** - Real AI content creation

### 🌐 Web Interface Videos

- **[Business Use Cases](./neurolink-demo/videos/business-use-cases.mp4)** - Professional applications
- **[Developer Tools](./neurolink-demo/videos/developer-tools.mp4)** - Code generation and APIs
- **[Creative Tools](./neurolink-demo/videos/creative-tools.mp4)** - Content creation

**[📖 Complete Visual Documentation](./docs/VISUAL-DEMOS.md)** - All screenshots and videos

## 📚 Documentation

### Getting Started

- **[🔧 Provider Setup](./docs/PROVIDER-CONFIGURATION.md)** - Complete environment configuration
- **[🖥️ CLI Guide](./docs/CLI-GUIDE.md)** - All commands and options
- **[🏗️ SDK Integration](./docs/FRAMEWORK-INTEGRATION.md)** - Next.js, SvelteKit, React
- **[⚙️ Environment Variables](./docs/ENVIRONMENT-VARIABLES.md)** - Full configuration guide

### Advanced Features

- **[🏭 Factory Pattern Migration](./docs/FACTORY-PATTERN-MIGRATION.md)** - Guide to the new unified provider architecture
- **[🔄 MCP Foundation](./docs/MCP-FOUNDATION.md)** - Model Context Protocol architecture
- **[⚡ Dynamic Models](./docs/DYNAMIC-MODELS.md)** - Self-updating model configurations and cost optimization
- **[🧠 AI Analysis Tools](./docs/AI-ANALYSIS-TOOLS.md)** - Usage optimization and benchmarking
- **[🛠️ AI Workflow Tools](./docs/AI-WORKFLOW-TOOLS.md)** - Development lifecycle assistance
- **[🎬 Visual Demos](./docs/VISUAL-DEMOS.md)** - Screenshots and videos

### Reference

- **[📚 API Reference](./docs/API-REFERENCE.md)** - Complete TypeScript API
- **[🔗 Framework Integration](./docs/FRAMEWORK-INTEGRATION.md)** - SvelteKit, Next.js, Express.js

## 🏗️ Supported Providers & Models

| Provider                    | Models                             | Auth Method        | Free Tier | Tool Support | Key Benefit                      |
| --------------------------- | ---------------------------------- | ------------------ | --------- | ------------ | -------------------------------- |
| **🔗 LiteLLM** 🆕           | **100+ Models** (All Providers)    | Proxy Server       | Varies    | ✅ Full      | **Universal Access**             |
| **🔗 OpenAI Compatible** 🆕 | **Any OpenAI-compatible endpoint** | API Key + Base URL | Varies    | ✅ Full      | **Auto-Discovery + Flexibility** |
| **Google AI Studio**        | Gemini 2.5 Flash/Pro               | API Key            | ✅        | ✅ Full      | Free Tier Available              |
| **OpenAI**                  | GPT-4o, GPT-4o-mini                | API Key            | ❌        | ✅ Full      | Industry Standard                |
| **Anthropic**               | Claude 3.5 Sonnet                  | API Key            | ❌        | ✅ Full      | Advanced Reasoning               |
| **Amazon Bedrock**          | Claude 3.5/3.7 Sonnet              | AWS Credentials    | ❌        | ✅ Full\*    | Enterprise Scale                 |
| **Google Vertex AI**        | Gemini 2.5 Flash                   | Service Account    | ❌        | ✅ Full      | Enterprise Google                |
| **Azure OpenAI**            | GPT-4, GPT-3.5                     | API Key + Endpoint | ❌        | ✅ Full      | Microsoft Ecosystem              |
| **Ollama** 🆕               | Llama 3.2, Gemma, Mistral (Local)  | None (Local)       | ✅        | ⚠️ Partial   | Complete Privacy                 |
| **Hugging Face** 🆕         | 100,000+ open source models        | API Key            | ✅        | ⚠️ Partial   | Open Source                      |
| **Mistral AI** 🆕           | Tiny, Small, Medium, Large         | API Key            | ✅        | ✅ Full      | European/GDPR                    |

**Tool Support Legend:**

- ✅ Full: All tools working correctly
- ⚠️ Partial: Tools visible but may not execute properly
- ❌ Limited: Issues with model or configuration
- \* Bedrock requires valid AWS credentials, Ollama requires specific models like gemma3n for tool support

**✨ Auto-Selection**: NeuroLink automatically chooses the best available provider based on speed, reliability, and configuration.

### 🔍 Smart Model Auto-Discovery (OpenAI Compatible)

The OpenAI Compatible provider includes intelligent model discovery that automatically detects available models from any endpoint:

```bash
# Setup - no model specified
export OPENAI_COMPATIBLE_BASE_URL="https://api.your-endpoint.ai/v1"
export OPENAI_COMPATIBLE_API_KEY="your-api-key"

# Auto-discovers and uses first available model
npx @juspay/neurolink generate "Hello!" --provider openai-compatible
# → 🔍 Auto-discovered model: claude-sonnet-4 from 3 available models

# Or specify explicitly to skip discovery
export OPENAI_COMPATIBLE_MODEL="gemini-2.5-pro"
npx @juspay/neurolink generate "Hello!" --provider openai-compatible
```

**How it works:**

- Queries `/v1/models` endpoint to discover available models
- Automatically selects the first available model when none specified
- Falls back gracefully if discovery fails
- Works with any OpenAI-compatible service (OpenRouter, vLLM, LiteLLM, etc.)

## 🎯 Production Features

### Enterprise-Grade Reliability

- **Automatic Failover**: Seamless provider switching on failures
- **Error Recovery**: Comprehensive error handling and logging
- **Performance Monitoring**: Built-in analytics and metrics
- **Type Safety**: Full TypeScript support with IntelliSense

### AI Platform Capabilities

- **MCP Foundation**: Universal AI development platform with 10+ specialized tools
- **Analysis Tools**: Usage optimization, performance benchmarking, parameter tuning
- **Workflow Tools**: Test generation, code refactoring, documentation, debugging
- **Extensibility**: Connect external tools and services via MCP protocol
- **🆕 Dynamic Server Management**: Programmatically add MCP servers at runtime

### 🔧 Programmatic MCP Server Management [Coming Soon]

**Note**: External MCP server activation is in development. Currently available:

- ✅ 6 built-in tools working across all providers
- ✅ SDK custom tool registration
- 🔍 MCP server discovery (58+ servers found)
- 🚧 External server activation (one-line fix pending)

Manual MCP configuration (`.mcp-config.json`) support coming soon.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](./CONTRIBUTING.md) for details.

### Development Setup

```bash
git clone https://github.com/juspay/neurolink
cd neurolink
pnpm install
pnpm setup:complete  # One-command setup with all automation
pnpm test:adaptive   # Intelligent testing
pnpm build:complete  # Full build pipeline
```

### New Developer Experience (v2.0)

NeuroLink now features **enterprise-grade automation** with 72+ commands:

```bash
# Environment & Setup (2-minute initialization)
pnpm setup:complete        # Complete project setup
pnpm env:setup             # Safe .env configuration
pnpm env:backup            # Environment backup

# Testing & Quality (60-80% faster)
pnpm test:adaptive         # Intelligent test selection
pnpm test:providers        # AI provider validation
pnpm quality:check         # Full quality pipeline

# Documentation & Content
pnpm docs:sync             # Cross-file documentation sync
pnpm content:generate      # Automated content creation

# Build & Deployment
pnpm build:complete        # 7-phase enterprise pipeline
pnpm dev:health            # System health monitoring
```

**[📖 Complete Automation Guide](./docs/CLI-GUIDE.md)** - All 72+ commands and automation features

## 📄 License

MIT © [Juspay Technologies](https://juspay.in)

## 🔗 Related Projects

- [Vercel AI SDK](https://github.com/vercel/ai) - Underlying provider implementations
- [SvelteKit](https://kit.svelte.dev) - Web framework used in this project
- [Model Context Protocol](https://modelcontextprotocol.io) - Tool integration standard

---

<p align="center">
  <strong>Built with ❤️ by <a href="https://juspay.in">Juspay Technologies</a></strong>
</p>
# Force fresh deployment after GitHub Pages source change
