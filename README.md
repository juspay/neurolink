# 🧠 NeuroLink

[![NPM Version](https://img.shields.io/npm/v/@juspay/neurolink)](https://www.npmjs.com/package/@juspay/neurolink)
[![Downloads](https://img.shields.io/npm/dm/@juspay/neurolink)](https://www.npmjs.com/package/@juspay/neurolink)
[![GitHub Stars](https://img.shields.io/github/stars/juspay/neurolink)](https://github.com/juspay/neurolink/stargazers)
[![License](https://img.shields.io/npm/l/@juspay/neurolink)](https://github.com/juspay/neurolink/blob/release/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue)](https://www.typescriptlang.org/)
[![CI](https://github.com/juspay/neurolink/workflows/CI/badge.svg)](https://github.com/juspay/neurolink/actions)

> **Enterprise AI Development Platform** - Universal AI provider integration with intelligent fallback, built-in tools, and Model Context Protocol (MCP) support. Production-ready with TypeScript.

**NeuroLink** is a unified platform that connects **12+ AI providers** through a single interface, featuring automatic failover, built-in tools, and comprehensive MCP integration. Available as both CLI and SDK for developers building AI-powered applications.

## 🚀 **Latest Release: v7.46.0** (September 2025)

**🎯 NEW: Auto-Evaluation for LLM Responses** - Automatic quality assessment and scoring for AI-generated content with built-in evaluation metrics.

**What's New:**

- **[Auto-Evaluation](./docs/AI-ENHANCEMENTS.md#auto-evaluation)**: Intelligent quality scoring for AI responses
- **[Enhanced Analytics](./docs/AI-ANALYSIS-TOOLS.md)**: Comprehensive usage tracking and cost optimization
- **[Mem0 Integration](./docs/MEM0_INTEGRATION.md)**: Advanced context management and memory capabilities
- **[Redis Support](./docs/CONVERSATION-MEMORY.md#redis-support)**: Auto-detection and enablement for conversation memory
- **[Guardrails Enhancement](./docs/GUARDRAILS-AI-INTEGRATION.md)**: Robust content filtering and safety measures

**[📋 View Complete Changelog](./CHANGELOG.md)** | **[📖 Release Notes](https://github.com/juspay/neurolink/releases/tag/v7.46.0)**

---

## ✨ Core Operations

NeuroLink provides unified access to AI capabilities through four key operational areas:

### 🤖 **AI Provider Integration**

- **12 Major Providers**: [OpenAI](./docs/CONFIGURATION.md#ai-provider-configuration), [Anthropic](./docs/CONFIGURATION.md#ai-provider-configuration), [Google AI](./docs/CONFIGURATION.md#minimal-setup-google-ai), [AWS Bedrock](./docs/CONFIGURATION.md#ai-provider-configuration), [Azure](./docs/CONFIGURATION.md#ai-provider-configuration), [LiteLLM](./docs/LITELLM-INTEGRATION.md), [Ollama](./docs/OLLAMA-SETUP.md), [Hugging Face](./docs/CONFIGURATION.md#ai-provider-configuration), and more
- **Intelligent Fallback**: Automatic provider switching when services are unavailable
- **Cost Optimization**: Smart model selection based on task complexity and budget
- **100+ Models**: Access through [LiteLLM proxy integration](./docs/LITELLM-INTEGRATION.md)

**[📖 Provider Setup Guide](./docs/CONFIGURATION.md#ai-provider-configuration)** | **[📖 Provider Comparison](./docs/PROVIDER-COMPARISON.md)** | **[📖 Provider Monitoring](./docs/PROVIDER-STATUS-MONITORING.md)**

### 🔧 **Built-in Tools & MCP Integration**

- **6 Core Tools**: [File operations, time, math, search, web grounding](./docs/API-REFERENCE.md#built-in-tools)
- **External MCP Servers**: Connect to [58+ discoverable MCP servers](./docs/MCP-INTEGRATION.md#external-mcp-servers) (GitHub, databases, filesystems)
- **Custom Tools**: [Register your own tools programmatically](./docs/SDK-CUSTOM-TOOLS.md)
- **Tool Auto-Discovery**: [Automatic detection and registration](./docs/MCP-INTEGRATION.md#tool-discovery) of available tools

**[📖 MCP Integration Guide](./docs/MCP-INTEGRATION.md)** | **[📖 MCP Testing Guide](./docs/MCP-TESTING-GUIDE.md)** | **[📖 Custom Tools](./docs/SDK-CUSTOM-TOOLS.md)**

### 🖥️ **CLI & SDK Interface**

- **Professional CLI**: [72+ commands](./docs/CLI-GUIDE.md) for development, testing, and deployment
- **TypeScript SDK**: [Full type safety](./docs/API-REFERENCE.md) with IntelliSense support
- **Interactive Mode**: [Persistent sessions](./docs/CLI-GUIDE.md#interactive-loop-mode) with [conversation memory](./docs/CONVERSATION-MEMORY.md)
- **Streaming Support**: [Real-time AI responses](./docs/API-REFERENCE.md#streaming-support) with tool integration

**[📖 CLI Command Reference](./docs/CLI-GUIDE.md)** | **[📖 SDK API Reference](./docs/API-REFERENCE.md)** | **[📖 Framework Integration](./docs/FRAMEWORK-INTEGRATION.md)**

### 🏢 **Enterprise Features**

- **Production Ready**: Extracted from Juspay's production systems - [Health Monitoring](./docs/HEALTH-MONITORING-GUIDE.md)
- **Analytics & Evaluation**: [Built-in usage tracking](./docs/AI-ENHANCEMENTS.md) and [quality assessment](./docs/AI-ANALYSIS-TOOLS.md)
- **Enterprise Proxy**: [Corporate network compatibility](./docs/ENTERPRISE-PROXY-SETUP.md)
- **Framework Integration**: [SvelteKit, Next.js, Express.js support](./docs/FRAMEWORK-INTEGRATION.md)

**[📖 Framework Integration](./docs/FRAMEWORK-INTEGRATION.md)** | **[📖 Enterprise Setup](./docs/CONFIGURATION.md)** | **[📖 Performance Optimization](./docs/PERFORMANCE-OPTIMIZATION.md)**

---

## 🚀 Quick Start

### Installation & Setup

```bash
# Install NeuroLink
npm install @juspay/neurolink

# Quick setup with interactive wizard - see all options in CLI Guide
npx @juspay/neurolink setup

# Test your configuration - monitor provider status
npx @juspay/neurolink status
```

**Setup Help**: [📖 Installation Guide](./docs/CONFIGURATION.md#installation) | [📖 Provider Setup](./docs/CONFIGURATION.md#ai-provider-configuration) | [📖 Environment Variables](./docs/getting-started/environment-variables.md)

### Basic Usage

```typescript
import { NeuroLink } from "@juspay/neurolink";

// Initialize with auto-provider selection - see provider configuration
const neurolink = new NeuroLink();

// Generate content with built-in tools - see analytics and evaluation docs
const result = await neurolink.generate({
  input: { text: "What time is it and what files are in my project?" },
  enableAnalytics: true,    // See AI-ENHANCEMENTS.md
  enableEvaluation: true,   // See AI-ANALYSIS-TOOLS.md
});

console.log(result.content);
console.log("Quality Score:", result.evaluation?.overallScore);
```

```bash
# CLI usage with automatic tool detection - see all CLI commands
npx @juspay/neurolink generate "Analyze the current project structure"

# Interactive mode with conversation memory - see loop mode guide
npx @juspay/neurolink loop --enable-conversation-memory

# Stream responses in real-time - see streaming documentation
npx @juspay/neurolink stream "Write a technical document"
```

**More Examples**: [📖 CLI Commands](./docs/CLI-GUIDE.md) | [📖 SDK Examples](./docs/API-REFERENCE.md#examples) | [📖 Framework Integration](./docs/FRAMEWORK-INTEGRATION.md)

**[📖 Complete Setup Guide](./docs/getting-started/environment-variables.md)** | **[📖 Usage Examples](./docs/FRAMEWORK-INTEGRATION.md)**

---

## 📚 Comprehensive Documentation

### 🚀 Getting Started

- **[📖 Quick Start Guide](./docs/getting-started/environment-variables.md)** - Environment setup and first steps
- **[⚙️ Provider Configuration](./docs/PROVIDER-CONFIGURATION.md)** - Complete setup for all 12 AI providers
- **[🖥️ CLI Reference](./docs/CLI-GUIDE.md)** - 72+ commands and interactive features
- **[🔧 Configuration Management](./docs/CONFIGURATION.md)** - Advanced settings and optimization

### 🤖 AI Integration

- **[🏭 Provider Architecture](./docs/FACTORY-PATTERN-ARCHITECTURE.md)** - Factory pattern and unified provider system
- **[🔗 LiteLLM Integration](./docs/LITELLM-INTEGRATION.md)** - Access 100+ models through unified interface
- **[🏗️ SageMaker Integration](./docs/SAGEMAKER-INTEGRATION.md)** - Deploy and use custom AI models
- **[🤖 Provider Comparison](./docs/PROVIDER-COMPARISON.md)** - Feature matrix and selection guide

### 🔧 MCP & Tools

- **[🔧 MCP Integration](./docs/MCP-INTEGRATION.md)** - Model Context Protocol setup and external servers
- **[🧪 MCP Testing Guide](./docs/MCP-TESTING-GUIDE.md)** - Testing strategies and validation
- **[🛠️ SDK Custom Tools](./docs/SDK-CUSTOM-TOOLS.md)** - Register and use custom tools programmatically
- **[🚀 Lighthouse Integration](./docs/LIGHTHOUSE-UNIFIED-INTEGRATION.md)** - Import 60+ production-ready e-commerce tools

### 🏢 Enterprise & Advanced

- **[🏢 Enterprise Features](./docs/ENTERPRISE-PROXY-SETUP.md)** - Corporate proxy and security setup
- **[📊 Analytics & Evaluation](./docs/AI-ENHANCEMENTS.md)** - Usage tracking and quality assessment
- **[🧠 Conversation Memory](./docs/CONVERSATION-MEMORY.md)** - Session management and context preservation
- **[⚡ Performance Optimization](./docs/PERFORMANCE-OPTIMIZATION.md)** - Speed and efficiency improvements

### 🔨 Development & Integration

- **[📚 SDK API Reference](./docs/API-REFERENCE.md)** - Complete TypeScript API documentation
- **[🏗️ Framework Integration](./docs/FRAMEWORK-INTEGRATION.md)** - SvelteKit, Next.js, Express.js examples
- **[🧪 Testing Guide](./docs/TESTING.md)** - Comprehensive testing strategies
- **[🤝 Contributing](./CONTRIBUTING.md)** - Development setup and contribution guidelines

### 📊 Analysis & Monitoring

- **[🔍 Usage Analytics](./docs/AI-ANALYSIS-TOOLS.md)** - Usage optimization and cost analysis
- **[⚙️ Workflow Tools](./docs/AI-WORKFLOW-TOOLS.md)** - Development lifecycle automation
- **[📈 Health Monitoring](./docs/HEALTH-MONITORING-GUIDE.md)** - System monitoring and diagnostics
- **[🛠️ Troubleshooting](./docs/TROUBLESHOOTING.md)** - Common issues and solutions

**[📚 Documentation Hub](./docs/README.md)** - Complete index of all documentation files

---

## 🏗️ Supported Providers & Models

| Provider                    | Models                             | Auth Method        | Free Tier | Tool Support | Key Benefit                      |
| --------------------------- | ---------------------------------- | ------------------ | --------- | ------------ | -------------------------------- |
| **[🔗 LiteLLM](./docs/LITELLM-INTEGRATION.md)** 🆕 | **100+ Models** (All Providers) | Proxy Server | Varies | ✅ Full | **Universal Access** |
| **[🔗 OpenAI Compatible](./docs/CONFIGURATION.md#openai-compatible-configuration)** 🆕 | **Any OpenAI-compatible endpoint** | API Key + Base URL | Varies | ✅ Full | **Auto-Discovery + Flexibility** |
| **[Google AI Studio](./docs/CONFIGURATION.md#minimal-setup-google-ai)** | [Gemini 2.5 Flash/Pro](./docs/API-REFERENCE.md#google-ai-studio-models) | API Key | ✅ | ✅ Full | Free Tier Available |
| **[OpenAI](./docs/CONFIGURATION.md#ai-provider-configuration)** | [GPT-4o, GPT-4o-mini](./docs/API-REFERENCE.md#openai-models) | API Key | ❌ | ✅ Full | Industry Standard |
| **[Anthropic](./docs/CONFIGURATION.md#ai-provider-configuration)** | [Claude 3.5 Sonnet](./docs/API-REFERENCE.md#amazon-bedrock-models) | API Key | ❌ | ✅ Full | Advanced Reasoning |
| **[Amazon Bedrock](./docs/CONFIGURATION.md#ai-provider-configuration)** | [Claude 3.5/3.7 Sonnet](./docs/API-REFERENCE.md#amazon-bedrock-models) | AWS Credentials | ❌ | ✅ Full\* | Enterprise Scale |
| **[Google Vertex AI](./docs/CONFIGURATION.md#ai-provider-configuration)** | [Gemini 2.5 Flash](./docs/API-REFERENCE.md#google-vertex-ai-models) | Service Account | ❌ | ✅ Full | Enterprise Google |
| **[Azure OpenAI](./docs/CONFIGURATION.md#ai-provider-configuration)** | [GPT-4, GPT-3.5](./docs/API-REFERENCE.md#azure-openai-models) | API Key + Endpoint | ❌ | ✅ Full | Microsoft Ecosystem |
| **[Ollama](./docs/OLLAMA-SETUP.md)** 🆕 | [Llama 3.2, Gemma, Mistral (Local)](./docs/API-REFERENCE.md#ollama-models) | None (Local) | ✅ | ⚠️ Partial | Complete Privacy |
| **[Hugging Face](./docs/CONFIGURATION.md#ai-provider-configuration)** | [100,000+ open source models](./docs/API-REFERENCE.md#hugging-face-models) | API Key | ✅ | ⚠️ Partial | Open Source |
| **[Mistral AI](./docs/CONFIGURATION.md#ai-provider-configuration)** | [Tiny, Small, Medium, Large](./docs/API-REFERENCE.md#mistral-ai-models) | API Key | ✅ | ✅ Full | European/GDPR |
| **[Amazon SageMaker](./docs/SAGEMAKER-INTEGRATION.md)** 🆕 | [Custom Models (Your Endpoints)](./docs/CONFIGURATION.md#amazon-sagemaker-configuration-custom-models) | AWS Credentials | ❌ | ✅ Full | Custom Model Hosting |

**Tool Support Legend:**

- ✅ Full: All tools working correctly
- ⚠️ Partial: Tools visible but may not execute properly
- ❌ Limited: Issues with model or configuration
- \* Bedrock requires valid AWS credentials, Ollama requires specific models like gemma3n for tool support

**✨ Auto-Selection**: NeuroLink automatically chooses the best available provider based on speed, reliability, and configuration.

---

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

---

### Enterprise-Grade Reliability

- **Automatic Failover**: Seamless provider switching on failures
- **Error Recovery**: Comprehensive error handling and logging
- **Performance Monitoring**: Built-in analytics and metrics
- **Type Safety**: Full TypeScript support with IntelliSense

---

## 🎯 Production Features

### Enterprise-Grade Reliability

- **Automatic Failover**: Seamless provider switching when services are unavailable
- **Error Recovery**: Comprehensive error handling and logging with detailed diagnostics
- **Performance Monitoring**: Built-in analytics, metrics, and real-time health checks
- **Type Safety**: Full TypeScript support with IntelliSense and strict type validation

### AI Platform Capabilities

- **MCP Foundation**: Universal AI development platform with 10+ specialized built-in tools
- **Analysis Tools**: Usage optimization, performance benchmarking, and parameter tuning
- **Workflow Tools**: Test generation, code refactoring, documentation automation, and debugging
- **Extensibility**: Connect external tools and services via Model Context Protocol (MCP)
- **Dynamic Server Management**: Programmatically add and manage MCP servers at runtime

### External MCP Server Integration ✅ **PRODUCTION READY**

**Full external MCP integration with comprehensive server management:**

```typescript
// Complete external MCP server API
const neurolink = new NeuroLink();

// Server management
await neurolink.addExternalMCPServer(serverId, config);
await neurolink.removeExternalMCPServer(serverId);
const servers = neurolink.listExternalMCPServers();
const server = neurolink.getExternalMCPServer(serverId);

// Tool management
const tools = neurolink.getExternalMCPTools();
const serverTools = neurolink.getExternalMCPServerTools(serverId);

// Direct tool execution
const result = await neurolink.executeExternalMCPTool(
  serverId,
  toolName,
  params,
);

// Statistics and monitoring
const stats = neurolink.getExternalMCPStatistics();
await neurolink.shutdownExternalMCPServers();
```

**Features:**

- ✅ 6 built-in tools working across all providers
- ✅ SDK custom tool registration
- ✅ External MCP server management (add, remove, list, test)
- ✅ Dynamic tool discovery and registration
- ✅ Multi-provider support (external tools work with all AI providers)
- ✅ Streaming integration (external tools work with real-time streaming)
- ✅ Enhanced tracking (proper parameter extraction and execution logging)

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](./CONTRIBUTING.md) for details.

### Development Setup

```bash
git clone https://github.com/juspay/neurolink
cd neurolink
pnpm install
npx husky install          # Setup git hooks for build rule enforcement
pnpm setup:complete        # One-command setup with all automation
pnpm test:adaptive         # Intelligent testing
pnpm build:complete       # Full build pipeline
```

### Enterprise Developer Experience

NeuroLink features **enterprise-grade build rule enforcement** with comprehensive quality validation:

```bash
# Quality & Validation (required for all commits)
pnpm run validate:all      # Run all validation checks
pnpm run validate:security # Security scanning with gitleaks
pnpm run validate:env      # Environment consistency checks
pnpm run quality:metrics   # Generate quality score report

# Development Workflow
pnpm run check:all         # Pre-commit validation simulation
pnpm run format           # Auto-fix code formatting
pnpm run lint             # ESLint validation with zero-error tolerance

# Environment & Setup (2-minute initialization)
pnpm setup:complete        # Complete project setup
pnpm env:setup             # Safe .env configuration
pnpm env:backup            # Environment backup

# Testing (60-80% faster)
pnpm test:adaptive         # Intelligent test selection
pnpm test:providers        # AI provider validation

# Documentation & Content
pnpm docs:sync             # Cross-file documentation sync
pnpm content:generate      # Automated content creation

# Build & Deployment
pnpm build:complete        # 7-phase enterprise pipeline
pnpm dev:health            # System health monitoring
```

**Build Rule Enforcement:** All commits automatically validated with pre-commit hooks. See [Contributing Guidelines](./CONTRIBUTING.md) for complete requirements.

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
