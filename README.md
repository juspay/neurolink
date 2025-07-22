# 🧠 NeuroLink

[![NPM Version](https://img.shields.io/npm/v/@juspay/neurolink)](https://www.npmjs.com/package/@juspay/neurolink)
[![Downloads](https://img.shields.io/npm/dm/@juspay/neurolink)](https://www.npmjs.com/package/@juspay/neurolink)
[![GitHub Stars](https://img.shields.io/github/stars/juspay/neurolink)](https://github.com/juspay/neurolink/stargazers)
[![License](https://img.shields.io/npm/l/@juspay/neurolink)](https://github.com/juspay/neurolink/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue)](https://www.typescriptlang.org/)
[![CI](https://github.com/juspay/neurolink/workflows/CI/badge.svg)](https://github.com/juspay/neurolink/actions)

> Enterprise AI Development Platform with built-in tools, universal provider support, and factory pattern architecture. Production-ready with TypeScript support.

**NeuroLink** is an Enterprise AI Development Platform that unifies 9 major AI providers with intelligent fallback and built-in tool support. Available as both a **programmatic SDK** and **professional CLI tool**. Features 6 core tools working across all providers plus SDK custom tool registration. Extracted from production use at Juspay.

## 🚀 Enterprise Platform Features

- **🏭 Factory Pattern Architecture** - Unified provider management through BaseProvider inheritance
- **🔧 Tools-First Design** - All providers include built-in tool support without additional configuration
- **🌐 Real-time WebSocket Infrastructure** - [Coming Soon - Broken in migration, being fixed]
- **📊 Advanced Telemetry** - [Coming Soon - Broken in migration, being fixed]
- **💬 Enhanced Chat Services** - [Coming Soon - Broken in migration, being fixed]
- **🏗️ Enterprise Architecture** - Production-ready with clean abstractions
- **🔄 Configuration Management** - Flexible provider configuration
- **✅ Type Safety** - Industry-standard TypeScript interfaces
- **⚡ Performance** - Fast response times with streaming support
- **🛡️ Error Recovery** - Graceful failures with provider fallback

## ✅ LATEST UPDATE: Factory Pattern Refactoring Complete (2025-01-20)

**NeuroLink now features a unified factory pattern architecture with automatic tool support for all providers.**

- ✅ **Unified Architecture**: All providers inherit from BaseProvider with built-in tool support
- ✅ **Direct Tools**: Six core tools available across all providers (getCurrentTime, readFile, listDirectory, calculateMath, writeFile, searchFiles)
- ✅ **Simplified Providers**: Removed duplicate code - providers now focus only on model-specific logic
- ✅ **Better Testing**: 78% of providers fully working with tools (7/9 providers), 22% partial support
- ✅ **Zero Breaking Changes**: All existing code continues working (backward compatibility)
- ✅ **SDK Custom Tools**: Register your own tools programmatically with the SDK

> **Factory Pattern**: NeuroLink uses BaseProvider inheritance to provide consistent tool support across all AI providers without code duplication.

## ✅ Stream Function Migration Complete (2025-01-12)

**NeuroLink uses `stream()` as the primary streaming function with future-ready multi-modal interface.**

- ✅ **New Primary Streaming**: `stream()` with multi-modal ready interface
- ✅ **Enhanced Generation**: `generate()` as primary generation function
- ✅ **Factory Enhanced**: Better provider management across all methods
- ✅ **Zero Breaking Changes**: All existing code continues working (backward compatibility)

> **Enhanced API**: NeuroLink uses `stream()` and `generate()` as primary functions with multi-modal ready interfaces and improved factory patterns.

---

## 🚀 Quick Start

### Install & Run (2 minutes)

```bash
# Quick setup with Google AI Studio (free tier available)
export GOOGLE_AI_API_KEY="AIza-your-google-ai-api-key"

# CLI - No installation required
npx @juspay/neurolink generate "Hello, AI"
npx @juspay/neurolink gen "Hello, AI"        # Shortest form

# ✨ Primary Method (generate) - Recommended
npx @juspay/neurolink generate "Explain AI" --provider google-ai
npx @juspay/neurolink gen "Write code" --provider openai       # Shortest form

# 🆕 AI Enhancement Features
npx @juspay/neurolink generate "Explain AI" --enable-analytics --debug
npx @juspay/neurolink generate "Write code" --enable-evaluation --debug
npx @juspay/neurolink generate "Help me" --context '{"userId":"123"}' --debug

npx @juspay/neurolink status
```

```bash
# SDK Installation for using in your typescript projects
npm install @juspay/neurolink
```

### Basic Usage

```typescript
import { NeuroLink } from "@juspay/neurolink";

// NEW: Primary method (recommended)
const neurolink = new NeuroLink();
const result = await neurolink.generate({
  input: { text: "Write a haiku about programming" },
  provider: "google-ai",
  timeout: "30s", // Optional: Set custom timeout (default: 30s)
});
// Alternative: Auto-selects best available provider
import { createBestAIProvider } from "@juspay/neurolink";
const provider = createBestAIProvider();
const providerResult = await provider.generate({
  input: { text: "Write a haiku about programming" },
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

### 🆕 Enhanced Usage (NEW! ✨)

#### Enhanced CLI with Analytics & Evaluation

```bash
# Basic AI generation
npx @juspay/neurolink generate "Write a business email"

# With analytics and evaluation (NEW!)
npx @juspay/neurolink generate "Write a business email" --enable-analytics --enable-evaluation --debug

# See detailed usage data:
# 📊 Analytics: Provider usage, token costs, response times
# ⭐ Response Evaluation: AI-powered quality scores

# With custom context
npx @juspay/neurolink generate "Create a proposal" --context '{"company":"TechCorp"}' --debug
```

#### Enhanced SDK with Analytics & Evaluation

```typescript
import { NeuroLink } from "@juspay/neurolink";
const neurolink = new NeuroLink();

// Basic usage
const result = await neurolink.generate({ input: { text: "Write a story" } });

// With enhancements (NEW!)
const enhancedResult = await neurolink.generate({
  input: { text: "Write a business proposal" },
  enableAnalytics: true, // Get usage & cost data
  enableEvaluation: true, // Get AI quality scores
  context: { project: "Q1-sales" }, // Custom context
});

// Access enhancement data
console.log("📊 Usage:", enhancedResult.analytics);
console.log("⭐ Quality:", enhancedResult.evaluation);
console.log("Response:", enhancedResult.content);

// Enhanced evaluation included when enableEvaluation is true
// Returns basic quality scores for the generated content
```

### 🌐 Enterprise Real-time Features (NEW! 🚀)

#### Real-time WebSocket Chat

```typescript
import {
  createEnhancedChatService,
  NeuroLinkWebSocketServer,
} from "@juspay/neurolink";

// Enhanced chat with WebSocket support
const chatService = createEnhancedChatService({
  provider: await createBestAIProvider(),
  enableWebSocket: true,
  enableSSE: true,
  streamingConfig: {
    bufferSize: 8192,
    compressionEnabled: true,
  },
});

// WebSocket server for real-time applications
const wsServer = new NeuroLinkWebSocketServer({
  port: 8080,
  maxConnections: 1000,
  enableCompression: true,
});

// Handle real-time chat
wsServer.on("chat-message", async ({ connectionId, message }) => {
  await chatService.streamChat({
    prompt: message.data.prompt,
    onChunk: (chunk) => {
      wsServer.sendMessage(connectionId, {
        type: "ai-chunk",
        data: { chunk },
      });
    },
  });
});
```

#### Enterprise Telemetry Integration

```typescript
import { initializeTelemetry, getTelemetryStatus } from "@juspay/neurolink";

// Optional enterprise monitoring (zero overhead when disabled)
const telemetry = initializeTelemetry({
  serviceName: "my-ai-app",
  endpoint: "http://localhost:4318",
  enableTracing: true,
  enableMetrics: true,
  enableLogs: true,
});

// Check telemetry status
const status = await getTelemetryStatus();
console.log("Telemetry enabled:", status.enabled);
console.log("Service:", status.service);
console.log("Version:", status.version);

// All AI operations are now automatically monitored
const provider = await createBestAIProvider();
const result = await provider.generate({
  prompt: "Generate business report",
});
// Telemetry automatically tracks: response time, token usage, cost, errors
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

**📖 [Complete Setup Guide](./docs/PROVIDER-CONFIGURATION.md)** - All providers with detailed instructions

## ✨ Key Features

- 🏭 **Factory Pattern Architecture** - Unified provider management with BaseProvider inheritance
- 🔧 **Tools-First Design** - All providers automatically include direct tool support (getCurrentTime, readFile, listDirectory, calculateMath, writeFile, searchFiles)
- 🔄 **9 AI Providers** - OpenAI, Bedrock, Vertex AI, Google AI Studio, Anthropic, Azure, Hugging Face, Ollama, Mistral AI
- ⚡ **Dynamic Model System** - Self-updating model configurations without code changes
- 💰 **Cost Optimization** - Automatic selection of cheapest models for tasks
- 🔍 **Smart Model Resolution** - Fuzzy matching, aliases, and capability-based search
- ⚡ **Automatic Fallback** - Never fail when providers are down
- 🖥️ **CLI + SDK** - Use from command line or integrate programmatically
- 🛡️ **Production Ready** - TypeScript, error handling, extracted from production
- ✅ **MCP Integration** - Model Context Protocol with working built-in tools and 58+ external servers
- 🔍 **MCP Auto-Discovery** - Zero-config discovery across VS Code, Claude, Cursor, Windsurf
- ⚙️ **Built-in Tools** - Time, date calculations, and number formatting ready to use
- 🤖 **AI Analysis Tools** - Built-in optimization and workflow assistance
- 🏠 **Local AI Support** - Run completely offline with Ollama
- 🌍 **Open Source Models** - Access 100,000+ models via Hugging Face
- 🇪🇺 **GDPR Compliance** - European data processing with Mistral AI

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

// Register multiple tools at once
neurolink.registerTools({
  stockPrice: {
    /* tool definition */
  },
  calculator: {
    /* tool definition */
  },
});
```

## ⚡ Dynamic Model System (v1.8.0)

NeuroLink now features a revolutionary dynamic model configuration system that eliminates hardcoded model lists and enables automatic cost optimization.

### ✅ Key Benefits

- **🔄 Self-Updating**: New models automatically available without code updates
- **💰 Cost-Optimized**: Automatic selection of cheapest models for tasks
- **🔍 Smart Search**: Find models by capabilities (function-calling, vision, etc.)
- **🏷️ Alias Support**: Use friendly names like "claude-latest" or "best-coding"
- **📊 Real-Time Pricing**: Always current model costs and performance data

### 🚀 Quick Examples

```bash
# Cost optimization - automatically use cheapest model
npx @juspay/neurolink generate "Hello" --optimize-cost

# Capability search - find models with specific features
npx @juspay/neurolink generate "Describe this image" --capability vision

# Model aliases - use friendly names
npx @juspay/neurolink gen "Write code" --model best-coding

# Test dynamic model server
npm run model-server  # Starts config server on localhost:3001
npm run test:dynamic-models  # Comprehensive test suite
```

### 📊 Current Model Inventory (Auto-Updated)

- **10 active models** across 4 providers
- **Cheapest**: Gemini 2.0 Flash ($0.000075/1K tokens)
- **Most capable**: Claude 3 Opus (function-calling + vision + analysis)
- **Best for coding**: Claude 3 Opus, Gemini 2.0 Flash
- **1 deprecated model** automatically excluded

**[📖 Complete Dynamic Models Guide](./docs/DYNAMIC-MODELS.md)** - Setup, configuration, and advanced usage

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

| Provider             | Models                     | Auth Method        | Free Tier | Tool Support |
| -------------------- | -------------------------- | ------------------ | --------- | ------------ |
| **OpenAI**           | GPT-4o, GPT-4o-mini        | API Key            | ❌        | ✅ Full      |
| **Google AI Studio** | Gemini 2.5 Flash/Pro       | API Key            | ✅        | ✅ Full      |
| **Amazon Bedrock**   | Claude 3.5/3.7 Sonnet      | AWS Credentials    | ❌        | ✅ Full\*    |
| **Google Vertex AI** | Gemini 2.5 Flash           | Service Account    | ❌        | ✅ Full      |
| **Anthropic**        | Claude 3.5 Sonnet          | API Key            | ❌        | ✅ Full      |
| **Azure OpenAI**     | GPT-4, GPT-3.5             | API Key + Endpoint | ❌        | ✅ Full      |
| **Hugging Face** 🆕  | 100,000+ models            | API Key            | ✅        | ⚠️ Partial   |
| **Ollama** 🆕        | Llama 3.2, Gemma, Mistral  | None (Local)       | ✅        | ⚠️ Partial   |
| **Mistral AI** 🆕    | Tiny, Small, Medium, Large | API Key            | ✅        | ✅ Full      |

**Tool Support Legend:**

- ✅ Full: All tools working correctly
- ⚠️ Partial: Tools visible but may not execute properly
- ❌ Limited: Issues with model or configuration
- \* Bedrock requires valid AWS credentials, Ollama requires specific models like gemma3n for tool support

**✨ Auto-Selection**: NeuroLink automatically chooses the best available provider based on speed, reliability, and configuration.

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
