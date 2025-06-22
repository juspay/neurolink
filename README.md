# 🧠 NeuroLink

[![NPM Version](https://img.shields.io/npm/v/@juspay/neurolink)](https://www.npmjs.com/package/@juspay/neurolink)
[![Downloads](https://img.shields.io/npm/dm/@juspay/neurolink)](https://www.npmjs.com/package/@juspay/neurolink)
[![GitHub Stars](https://img.shields.io/github/stars/juspay/neurolink)](https://github.com/juspay/neurolink/stargazers)
[![License](https://img.shields.io/npm/l/@juspay/neurolink)](https://github.com/juspay/neurolink/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue)](https://www.typescriptlang.org/)
[![CI](https://github.com/juspay/neurolink/workflows/CI/badge.svg)](https://github.com/juspay/neurolink/actions)

> Universal AI toolkit with multiple provider support, automatic fallback, and both CLI + SDK interfaces. Production-ready with TypeScript support.

**NeuroLink** unifies OpenAI, Bedrock, Vertex AI, Google AI Studio, Anthropic, Azure OpenAI, Hugging Face, Ollama, and Mistral AI with intelligent fallback and streaming support. Available as both a **programmatic SDK** and **professional CLI tool**. Extracted from production use at Juspay.

## 🔥 **Latest Breakthrough: Full MCP Tool Integration Operational** (June 21, 2025)

**MAJOR SUCCESS**: All blocking TypeScript compilation errors resolved + Complete CLI MCP integration achieved!

✅ **Function Calling Ready**: AI can now execute real filesystem operations, data analysis, and system commands
✅ **Production Validated**: 23,230+ token MCP context loading confirmed via comprehensive CLI testing
✅ **Zero Build Errors**: Clean TypeScript compilation after resolving all 13 blocking errors
✅ **CLI Tool Integration**: Both `generate-text` and `agent-generate` commands use full MCP capabilities
✅ **Backward Compatible**: Tools enabled by default with opt-out flag for traditional usage

```bash
# NEW: AI can now access your filesystem and execute tools
npx @juspay/neurolink generate-text "List files in this directory" --provider google-ai
# Result: AI uses listDirectory tool and returns actual file listing
```

## 🚀 Quick Start

### Install & Run (2 minutes)

```bash
# Quick setup with Google AI Studio (free tier available)
export GOOGLE_AI_API_KEY="AIza-your-google-ai-api-key"

# CLI - No installation required
npx @juspay/neurolink generate-text "Hello, AI"
npx @juspay/neurolink status
```

```bash
# SDK Installation for using in your typescript projects
npm install @juspay/neurolink
```

### Basic Usage

```typescript
import { createBestAIProvider } from "@juspay/neurolink";

// Auto-selects best available provider
const provider = createBestAIProvider();
const result = await provider.generateText({
  prompt: "Write a haiku about programming",
});

console.log(result.text);
console.log(`Used: ${result.provider}`);
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

## 🛠️ MCP Integration Status (v1.11.1) ✅ **PRODUCTION READY**

| Component           | Status             | Description                                         |
| ------------------- | ------------------ | --------------------------------------------------- |
| Built-in Tools      | ✅ **Working**     | Time tool, utilities - fully functional             |
| External Discovery  | ✅ **Working**     | 58+ MCP servers auto-discovered from all AI tools   |
| Tool Execution      | ✅ **Working**     | Real-time AI tool calling with built-in tools       |
| **External Tools**  | ✅ **SOLVED**      | **Two-step tool calling fixed - human-readable responses** |
| **CLI Integration** | ✅ **READY**       | **Production-ready AI assistant with external tools** |
| External Activation | 🔧 **Development** | Discovery complete, activation protocol in progress |

### ✅ Quick MCP Test (v1.7.1)

```bash
# Test built-in tools (works immediately)
npx @juspay/neurolink generate-text "What time is it?" --debug
# Returns: "The current time is Friday, December 13, 2024 at 10:30:45 AM PST"

# Test tool discovery
npx @juspay/neurolink generate-text "What tools do you have access to?" --debug
# AI will list 5+ built-in tools and 58+ discovered external servers

# Test external server discovery
npx @juspay/neurolink mcp discover --format table
# Shows all discovered MCP servers from Claude, VS Code, Cursor, etc.
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
npx @juspay/neurolink generate-text "Hello" --optimize-cost

# Capability search - find models with specific features
npx @juspay/neurolink generate-text "Describe this image" --capability vision

# Model aliases - use friendly names
npx @juspay/neurolink generate-text "Write code" --model best-coding

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
npx @juspay/neurolink generate-text "What time is it?"
# AI automatically uses time tool for real-time data

# Disable tools for training-data-only responses
npx @juspay/neurolink generate-text "What time is it?" --disable-tools

# Real-time streaming
npx @juspay/neurolink stream "Tell me a story about robots"

# Provider diagnostics
npx @juspay/neurolink status --verbose

# Batch processing
echo -e "Write a haiku\nExplain gravity" > prompts.txt
npx @juspay/neurolink batch prompts.txt --output results.json
```

### SDK Integration

```typescript
// SvelteKit API route
export const POST: RequestHandler = async ({ request }) => {
  const { message } = await request.json();
  const provider = createBestAIProvider();
  const result = await provider.streamText({ prompt: message });
  return new Response(result.toReadableStream());
};

// Next.js API route
export async function POST(request: NextRequest) {
  const { prompt } = await request.json();
  const provider = createBestAIProvider();
  const result = await provider.generateText({ prompt });
  return NextResponse.json({ text: result.text });
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

- **[🔄 MCP Foundation](./docs/MCP-FOUNDATION.md)** - Model Context Protocol architecture
- **[⚡ Dynamic Models](./docs/DYNAMIC-MODELS.md)** - Self-updating model configurations and cost optimization
- **[🧠 AI Analysis Tools](./docs/AI-ANALYSIS-TOOLS.md)** - Usage optimization and benchmarking
- **[🛠️ AI Workflow Tools](./docs/AI-WORKFLOW-TOOLS.md)** - Development lifecycle assistance
- **[🎬 Visual Demos](./docs/VISUAL-DEMOS.md)** - Screenshots and videos

### Reference

- **[📚 API Reference](./docs/API-REFERENCE.md)** - Complete TypeScript API
- **[🔗 Framework Integration](./docs/FRAMEWORK-INTEGRATION.md)** - SvelteKit, Next.js, Express.js

## 🏗️ Supported Providers & Models

| Provider             | Models                       | Auth Method        | Free Tier |
| -------------------- | ---------------------------- | ------------------ | --------- |
| **OpenAI**           | GPT-4o, GPT-4o-mini          | API Key            | ❌        |
| **Google AI Studio** | Gemini 1.5/2.0 Flash/Pro     | API Key            | ✅        |
| **Amazon Bedrock**   | Claude 3.5/3.7 Sonnet        | AWS Credentials    | ❌        |
| **Google Vertex AI** | Gemini 2.5 Flash             | Service Account    | ❌        |
| **Anthropic**        | Claude 3.5 Sonnet            | API Key            | ❌        |
| **Azure OpenAI**     | GPT-4, GPT-3.5               | API Key + Endpoint | ❌        |
| **Hugging Face** 🆕  | 100,000+ models              | API Key            | ✅        |
| **Ollama** 🆕        | Llama 2, Code Llama, Mistral | None (Local)       | ✅        |
| **Mistral AI** 🆕    | Tiny, Small, Medium, Large   | API Key            | ✅        |

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
