# 🧠 NeuroLink

[![npm version](https://badge.fury.io/js/%40juspay%2Fneurolink.svg)](https://badge.fury.io/js/%40juspay%2Fneurolink)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Universal AI toolkit with 5+ provider support, automatic fallback, and both CLI + SDK interfaces. Production-ready with TypeScript support.

**NeuroLink** unifies OpenAI, Bedrock, Vertex AI, Google AI Studio, Anthropic, and Azure OpenAI with intelligent fallback and streaming support. Available as both a **programmatic SDK** and **professional CLI tool**. Extracted from production use at Juspay.

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
import { createBestAIProvider } from '@juspay/neurolink';

// Auto-selects best available provider
const provider = createBestAIProvider();
const result = await provider.generateText({
  prompt: "Write a haiku about programming"
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

- 🔄 **5+ AI Providers** - OpenAI, Bedrock, Vertex AI, Google AI Studio, Anthropic, Azure
- ⚡ **Automatic Fallback** - Never fail when providers are down
- 🖥️ **CLI + SDK** - Use from command line or integrate programmatically
- 🛡️ **Production Ready** - TypeScript, error handling, extracted from production
- 🔧 **MCP Integration** - Model Context Protocol support for extensibility
- 🤖 **AI Analysis Tools** - Built-in optimization and workflow assistance

## 💻 Essential Examples

### CLI Commands

```bash
# Text generation with provider selection
npx @juspay/neurolink generate-text "Explain quantum computing" --provider openai

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

- **Real AI Integration**: All 5 providers functional with live generation
- **Complete Use Cases**: Business, creative, and developer scenarios
- **Performance Metrics**: Live provider analytics and response times

### 🖥️ CLI Demonstrations
- **[CLI Help & Commands](./docs/visual-content/cli-videos/cli-01-cli-help.mp4)** - Complete command reference
- **[Provider Status Check](./docs/visual-content/cli-videos/cli-02-provider-status.mp4)** - Connectivity verification
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
- **[🧠 AI Analysis Tools](./docs/AI-ANALYSIS-TOOLS.md)** - Usage optimization and benchmarking
- **[🛠️ AI Workflow Tools](./docs/AI-WORKFLOW-TOOLS.md)** - Development lifecycle assistance
- **[🎬 Visual Demos](./docs/VISUAL-DEMOS.md)** - Screenshots and videos

### Reference
- **[📚 API Reference](./docs/API-REFERENCE.md)** - Complete TypeScript API
- **[🔗 Framework Integration](./docs/FRAMEWORK-INTEGRATION.md)** - SvelteKit, Next.js, Express.js

## 🏗️ Supported Providers & Models

| Provider | Models | Auth Method | Free Tier |
|----------|--------|-------------|-----------|
| **OpenAI** | GPT-4o, GPT-4o-mini | API Key | ❌ |
| **Google AI Studio** | Gemini 1.5/2.0 Flash/Pro | API Key | ✅ |
| **Amazon Bedrock** | Claude 3.5/3.7 Sonnet | AWS Credentials | ❌ |
| **Google Vertex AI** | Gemini 2.5 Flash | Service Account | ❌ |
| **Anthropic** | Claude 3.5 Sonnet | API Key | ❌ |
| **Azure OpenAI** | GPT-4, GPT-3.5 | API Key + Endpoint | ❌ |

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
pnpm test
pnpm build
```

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
