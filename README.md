# 🧠 NeuroLink

[![NPM Version](https://img.shields.io/npm/v/@juspay/neurolink)](https://www.npmjs.com/package/@juspay/neurolink)
[![Downloads](https://img.shields.io/npm/dm/@juspay/neurolink)](https://www.npmjs.com/package/@juspay/neurolink)
[![GitHub Stars](https://img.shields.io/github/stars/juspay/neurolink)](https://github.com/juspay/neurolink/stargazers)
[![License](https://img.shields.io/npm/l/@juspay/neurolink)](https://github.com/juspay/neurolink/blob/release/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue)](https://www.typescriptlang.org/)
[![CI](https://github.com/juspay/neurolink/workflows/CI/badge.svg)](https://github.com/juspay/neurolink/actions)

Enterprise AI development platform with unified provider access, production-ready tooling, and an opinionated factory architecture. NeuroLink ships as both a TypeScript SDK and a professional CLI so teams can build, operate, and iterate on AI features quickly.

## 🧠 What is NeuroLink?

**NeuroLink is the universal AI integration platform that unifies 13 major AI providers and 100+ models under one consistent API.**

Extracted from production systems at Juspay and battle-tested at enterprise scale, NeuroLink provides a production-ready solution for integrating AI into any application. Whether you're building with OpenAI, Anthropic, Google, AWS Bedrock, Azure, or any of our 13 supported providers, NeuroLink gives you a single, consistent interface that works everywhere.

**Why NeuroLink?** Switch providers with a single parameter change, leverage 64+ built-in tools and MCP servers, deploy with confidence using enterprise features like Redis memory and multi-provider failover, and optimize costs automatically with intelligent routing. Use it via our professional CLI or TypeScript SDK—whichever fits your workflow.

**Where we're headed:** We're building for the future of AI—edge-first execution and continuous streaming architectures that make AI practically free and universally available. **[Read our vision →](docs/about/vision.md)**

**[Get Started in <5 Minutes →](docs/getting-started/quick-start.md)**

---

## What's New (Q4 2025)

- 🧠 **Gemini 3 Preview Support** - Full support for gemini-3-flash-preview and gemini-3-pro-preview with extended thinking capabilities
- **Structured Output with Zod Schemas** – Type-safe JSON generation with automatic validation using `schema` + `output.format: "json"` in `generate()`. → [Structured Output Guide](docs/features/structured-output.md)
- **CSV File Support** – Attach CSV files to prompts for AI-powered data analysis with auto-detection. → [CSV Guide](docs/features/multimodal-chat.md#csv-file-support)
- **PDF File Support** – Process PDF documents with native visual analysis for Vertex AI, Anthropic, Bedrock, AI Studio. → [PDF Guide](docs/features/pdf-support.md)
- **LiteLLM Integration** – Access 100+ AI models from all major providers through unified interface. → [Setup Guide](docs/LITELLM-INTEGRATION.md)
- **SageMaker Integration** – Deploy and use custom trained models on AWS infrastructure. → [Setup Guide](docs/SAGEMAKER-INTEGRATION.md)
- **OpenRouter Integration** – Access 300+ models from OpenAI, Anthropic, Google, Meta, and more through a single unified API. → [Setup Guide](docs/getting-started/providers/openrouter.md)
- **Human-in-the-loop workflows** – Pause generation for user approval/input before tool execution. → [HITL Guide](docs/features/hitl.md)
- **Guardrails middleware** – Block PII, profanity, and unsafe content with built-in filtering. → [Guardrails Guide](docs/features/guardrails.md)
- **Context summarization** – Automatic conversation compression for long-running sessions. → [Summarization Guide](docs/CONTEXT-SUMMARIZATION.md)
- **Redis conversation export** – Export full session history as JSON for analytics and debugging. → [History Guide](docs/features/conversation-history.md)

> **Q3 highlights** (multimodal chat, auto-evaluation, loop sessions, orchestration) are now in [Platform Capabilities](#platform-capabilities-at-a-glance) below.

## Get Started in Two Steps

```bash
# 1. Run the interactive setup wizard (select providers, validate keys)
pnpm dlx @juspay/neurolink setup

# 2. Start generating with automatic provider selection
npx @juspay/neurolink generate "Write a launch plan for multimodal chat"
```

Need a persistent workspace? Launch loop mode with `npx @juspay/neurolink loop` - [Learn more →](docs/features/cli-loop-sessions.md)

## 🌟 Complete Feature Set

NeuroLink is a comprehensive AI development platform. Every feature below is production-ready and fully documented.

### 🤖 AI Provider Integration

**13 providers unified under one API** - Switch providers with a single parameter change.

| Provider              | Models                             | Free Tier       | Tool Support | Status        | Documentation                                                           |
| --------------------- | ---------------------------------- | --------------- | ------------ | ------------- | ----------------------------------------------------------------------- |
| **OpenAI**            | GPT-4o, GPT-4o-mini, o1            | ❌              | ✅ Full      | ✅ Production | [Setup Guide](docs/getting-started/provider-setup.md#openai)            |
| **Anthropic**         | Claude 3.5/3.7 Sonnet, Opus        | ❌              | ✅ Full      | ✅ Production | [Setup Guide](docs/getting-started/provider-setup.md#anthropic)         |
| **Google AI Studio**  | Gemini 2.5 Flash/Pro               | ✅ Free Tier    | ✅ Full      | ✅ Production | [Setup Guide](docs/getting-started/provider-setup.md#google-ai)         |
| **AWS Bedrock**       | Claude, Titan, Llama, Nova         | ❌              | ✅ Full      | ✅ Production | [Setup Guide](docs/getting-started/provider-setup.md#bedrock)           |
| **Google Vertex**     | Gemini 3/2.5 (gemini-3-\*-preview) | ❌              | ✅ Full      | ✅ Production | [Setup Guide](docs/getting-started/provider-setup.md#vertex)            |
| **Azure OpenAI**      | GPT-4, GPT-4o, o1                  | ❌              | ✅ Full      | ✅ Production | [Setup Guide](docs/getting-started/provider-setup.md#azure)             |
| **LiteLLM**           | 100+ models unified                | Varies          | ✅ Full      | ✅ Production | [Setup Guide](docs/LITELLM-INTEGRATION.md)                              |
| **OpenRouter**        | 300+ models unified                | Varies          | ✅ Full      | ✅ Production | [Setup Guide](docs/getting-started/provider-setup.md#openrouter)        |
| **AWS SageMaker**     | Custom deployed models             | ❌              | ✅ Full      | ✅ Production | [Setup Guide](docs/SAGEMAKER-INTEGRATION.md)                            |
| **Mistral AI**        | Mistral Large, Small               | ✅ Free Tier    | ✅ Full      | ✅ Production | [Setup Guide](docs/getting-started/provider-setup.md#mistral)           |
| **Hugging Face**      | 100,000+ models                    | ✅ Free         | ⚠️ Partial   | ✅ Production | [Setup Guide](docs/getting-started/provider-setup.md#huggingface)       |
| **Ollama**            | Local models (Llama, Mistral)      | ✅ Free (Local) | ⚠️ Partial   | ✅ Production | [Setup Guide](docs/getting-started/provider-setup.md#ollama)            |
| **OpenAI Compatible** | Any OpenAI-compatible endpoint     | Varies          | ✅ Full      | ✅ Production | [Setup Guide](docs/getting-started/provider-setup.md#openai-compatible) |

**[📖 Provider Comparison Guide](docs/reference/provider-comparison.md)** - Detailed feature matrix and selection criteria
**[🔬 Provider Feature Compatibility](docs/reference/provider-feature-compatibility.md)** - Test-based compatibility reference for all 19 features across 11 providers

---

### 🔧 Built-in Tools & MCP Integration

**6 Core Tools** (work across all providers, zero configuration):

| Tool                 | Purpose                  | Auto-Available          | Documentation                                             |
| -------------------- | ------------------------ | ----------------------- | --------------------------------------------------------- |
| `getCurrentTime`     | Real-time clock access   | ✅                      | [Tool Reference](docs/sdk/custom-tools.md#getCurrentTime) |
| `readFile`           | File system reading      | ✅                      | [Tool Reference](docs/sdk/custom-tools.md#readFile)       |
| `writeFile`          | File system writing      | ✅                      | [Tool Reference](docs/sdk/custom-tools.md#writeFile)      |
| `listDirectory`      | Directory listing        | ✅                      | [Tool Reference](docs/sdk/custom-tools.md#listDirectory)  |
| `calculateMath`      | Mathematical operations  | ✅                      | [Tool Reference](docs/sdk/custom-tools.md#calculateMath)  |
| `websearchGrounding` | Google Vertex web search | ⚠️ Requires credentials | [Tool Reference](docs/sdk/custom-tools.md#websearch)      |

**58+ External MCP Servers** supported (GitHub, PostgreSQL, Google Drive, Slack, and more):

```typescript
// Add any MCP server dynamically
await neurolink.addExternalMCPServer("github", {
  command: "npx",
  args: ["-y", "@modelcontextprotocol/server-github"],
  transport: "stdio",
  env: { GITHUB_TOKEN: process.env.GITHUB_TOKEN },
});

// Tools automatically available to AI
const result = await neurolink.generate({
  input: { text: 'Create a GitHub issue titled "Bug in auth flow"' },
});
```

**[📖 MCP Integration Guide](docs/advanced/mcp-integration.md)** - Setup external servers

---

### 💻 Developer Experience Features

**SDK-First Design** with TypeScript, IntelliSense, and type safety:

| Feature                     | Description                                                   | Documentation                                             |
| --------------------------- | ------------------------------------------------------------- | --------------------------------------------------------- |
| **Auto Provider Selection** | Intelligent provider fallback                                 | [SDK Guide](docs/sdk/index.md#auto-selection)             |
| **Streaming Responses**     | Real-time token streaming                                     | [Streaming Guide](docs/advanced/streaming.md)             |
| **Conversation Memory**     | Automatic context management                                  | [Memory Guide](docs/sdk/index.md#memory)                  |
| **Full Type Safety**        | Complete TypeScript types                                     | [Type Reference](docs/sdk/api-reference.md)               |
| **Error Handling**          | Graceful provider fallback                                    | [Error Guide](docs/reference/troubleshooting.md)          |
| **Analytics & Evaluation**  | Usage tracking, quality scores                                | [Analytics Guide](docs/advanced/analytics.md)             |
| **Middleware System**       | Request/response hooks                                        | [Middleware Guide](docs/CUSTOM-MIDDLEWARE-GUIDE.md)       |
| **Framework Integration**   | Next.js, SvelteKit, Express                                   | [Framework Guides](docs/sdk/framework-integration.md)     |
| **Extended Thinking**       | Native thinking/reasoning mode for Gemini 3 and Claude models | [Thinking Guide](docs/features/thinking-configuration.md) |

---

### 🏢 Enterprise & Production Features

**Production-ready capabilities for regulated industries:**

| Feature                     | Description                        | Use Case                  | Documentation                                               |
| --------------------------- | ---------------------------------- | ------------------------- | ----------------------------------------------------------- |
| **Enterprise Proxy**        | Corporate proxy support            | Behind firewalls          | [Proxy Setup](docs/ENTERPRISE-PROXY-SETUP.md)               |
| **Redis Memory**            | Distributed conversation state     | Multi-instance deployment | [Redis Guide](docs/getting-started/provider-setup.md#redis) |
| **Cost Optimization**       | Automatic cheapest model selection | Budget control            | [Cost Guide](docs/advanced/index.md)                        |
| **Multi-Provider Failover** | Automatic provider switching       | High availability         | [Failover Guide](docs/advanced/index.md)                    |
| **Telemetry & Monitoring**  | OpenTelemetry integration          | Observability             | [Telemetry Guide](docs/TELEMETRY-GUIDE.md)                  |
| **Security Hardening**      | Credential management, auditing    | Compliance                | [Security Guide](docs/advanced/enterprise.md)               |
| **Custom Model Hosting**    | SageMaker integration              | Private models            | [SageMaker Guide](docs/SAGEMAKER-INTEGRATION.md)            |
| **Load Balancing**          | LiteLLM proxy integration          | Scale & routing           | [Load Balancing](docs/LITELLM-INTEGRATION.md)               |

**Security & Compliance:**

- ✅ SOC2 Type II compliant deployments
- ✅ ISO 27001 certified infrastructure compatible
- ✅ GDPR-compliant data handling (EU providers available)
- ✅ HIPAA compatible (with proper configuration)
- ✅ Hardened OS verified (SELinux, AppArmor)
- ✅ Zero credential logging
- ✅ Encrypted configuration storage

**[📖 Enterprise Deployment Guide](docs/advanced/enterprise.md)** - Complete production checklist

---

### 🎨 Professional CLI

**15+ commands** for every workflow:

| Command    | Purpose                            | Example                    | Documentation                             |
| ---------- | ---------------------------------- | -------------------------- | ----------------------------------------- |
| `setup`    | Interactive provider configuration | `neurolink setup`          | [Setup Guide](docs/cli/index.md)          |
| `generate` | Text generation                    | `neurolink gen "Hello"`    | [Generate](docs/cli/commands.md#generate) |
| `stream`   | Streaming generation               | `neurolink stream "Story"` | [Stream](docs/cli/commands.md#stream)     |
| `status`   | Provider health check              | `neurolink status`         | [Status](docs/cli/commands.md#status)     |
| `loop`     | Interactive session                | `neurolink loop`           | [Loop](docs/cli/commands.md#loop)         |
| `mcp`      | MCP server management              | `neurolink mcp discover`   | [MCP CLI](docs/cli/commands.md#mcp)       |
| `models`   | Model listing                      | `neurolink models`         | [Models](docs/cli/commands.md#models)     |
| `eval`     | Model evaluation                   | `neurolink eval`           | [Eval](docs/cli/commands.md#eval)         |

**[📖 Complete CLI Reference](docs/cli/commands.md)** - All commands and options

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

## ✨ Interactive Loop Mode

NeuroLink features a powerful **interactive loop mode** that transforms the CLI into a persistent, stateful session. This allows you to run multiple commands, set session-wide variables, and maintain conversation history without restarting.

### Start the Loop

```bash
npx @juspay/neurolink loop
```

### Example Session

```bash
# Start the interactive session
$ npx @juspay/neurolink loop

neurolink » /set provider google-ai
✓ provider set to google-ai

neurolink » /set temperature 0.8
✓ temperature set to 0.8

neurolink » Tell me a fun fact about space

The quietest place on Earth is an anechoic chamber at Microsoft's headquarters in Redmond, Washington. The background noise is so low that it's measured in negative decibels, and you can hear your own heartbeat.

# Use "/" for CLI commands
neurolink » /generate "Draft a haiku"
...

# Use "//" to escape prompts starting with "/"
neurolink » //what is /usr/bin used for?
...

# Exit the session
neurolink » exit
```

### Conversation Memory in Loop Mode

Start the loop with conversation memory to have the AI remember the context of your previous commands.

```bash
npx @juspay/neurolink loop --enable-conversation-memory
```

Skip the wizard and configure manually? See [`docs/getting-started/provider-setup.md`](docs/getting-started/provider-setup.md).

## CLI & SDK Essentials

`neurolink` CLI mirrors the SDK so teams can script experiments and codify them later.

```bash
# Discover available providers and models
npx @juspay/neurolink status
npx @juspay/neurolink models list --provider google-ai

# Route to a specific provider/model
npx @juspay/neurolink generate "Summarize customer feedback" \
  --provider azure --model gpt-4o-mini

# Turn on analytics + evaluation for observability
npx @juspay/neurolink generate "Draft release notes" \
  --enable-analytics --enable-evaluation --format json
```

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink({
  conversationMemory: {
    enabled: true,
    store: "redis",
  },
  enableOrchestration: true,
});

const result = await neurolink.generate({
  input: {
    text: "Create a comprehensive analysis",
    files: [
      "./sales_data.csv", // Auto-detected as CSV
      "examples/data/invoice.pdf", // Auto-detected as PDF
      "./diagrams/architecture.png", // Auto-detected as image
    ],
  },
  provider: "vertex", // PDF-capable provider (see docs/features/pdf-support.md)
  enableEvaluation: true,
  region: "us-east-1",
});

console.log(result.content);
console.log(result.evaluation?.overallScore);
```

### Gemini 3 with Extended Thinking

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Use Gemini 3 with extended thinking for complex reasoning
const result = await neurolink.generate({
  input: {
    text: "Solve this step by step: What is the optimal strategy for...",
  },
  provider: "vertex",
  model: "gemini-3-flash-preview",
  thinkingLevel: "medium", // Options: "minimal", "low", "medium", "high"
});

console.log(result.content);
```

Full command and API breakdown lives in [`docs/cli/commands.md`](docs/cli/commands.md) and [`docs/sdk/api-reference.md`](docs/sdk/api-reference.md).

## Platform Capabilities at a Glance

| Capability               | Highlights                                                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| **Provider unification** | 13+ providers with automatic fallback, cost-aware routing, provider orchestration (Q3).                                  |
| **Multimodal pipeline**  | Stream images + CSV data + PDF documents across providers with local/remote assets. Auto-detection for mixed file types. |
| **Quality & governance** | Auto-evaluation engine (Q3), guardrails middleware (Q4), HITL workflows (Q4), audit logging.                             |
| **Memory & context**     | Conversation memory, Mem0 integration, Redis history export (Q4), context summarization (Q4).                            |
| **CLI tooling**          | Loop sessions (Q3), setup wizard, config validation, Redis auto-detect, JSON output.                                     |
| **Enterprise ops**       | Proxy support, regional routing (Q3), telemetry hooks, configuration management.                                         |
| **Tool ecosystem**       | MCP auto discovery, LiteLLM hub access, SageMaker custom deployment, web search.                                         |

## Documentation Map

| Area            | When to Use                                     | Link                                                             |
| --------------- | ----------------------------------------------- | ---------------------------------------------------------------- |
| Getting started | Install, configure, run first prompt            | [`docs/getting-started/index.md`](docs/getting-started/index.md) |
| Feature guides  | Understand new functionality front-to-back      | [`docs/features/index.md`](docs/features/index.md)               |
| CLI reference   | Command syntax, flags, loop sessions            | [`docs/cli/index.md`](docs/cli/index.md)                         |
| SDK reference   | Classes, methods, options                       | [`docs/sdk/index.md`](docs/sdk/index.md)                         |
| Integrations    | LiteLLM, SageMaker, MCP, Mem0                   | [`docs/LITELLM-INTEGRATION.md`](docs/LITELLM-INTEGRATION.md)     |
| Operations      | Configuration, troubleshooting, provider matrix | [`docs/reference/index.md`](docs/reference/index.md)             |
| Visual demos    | Screens, GIFs, interactive tours                | [`docs/demos/index.md`](docs/demos/index.md)                     |

## Integrations

- **LiteLLM 100+ model hub** – Unified access to third-party models via LiteLLM routing. → [`docs/LITELLM-INTEGRATION.md`](docs/LITELLM-INTEGRATION.md)
- **Amazon SageMaker** – Deploy and call custom endpoints directly from NeuroLink CLI/SDK. → [`docs/SAGEMAKER-INTEGRATION.md`](docs/SAGEMAKER-INTEGRATION.md)
- **Mem0 conversational memory** – Persistent semantic memory with vector store support. → [`docs/MEM0_INTEGRATION.md`](docs/MEM0_INTEGRATION.md)
- **Enterprise proxy & security** – Configure outbound policies and compliance posture. → [`docs/ENTERPRISE-PROXY-SETUP.md`](docs/ENTERPRISE-PROXY-SETUP.md)
- **Configuration automation** – Manage environments, regions, and credentials safely. → [`docs/CONFIGURATION-MANAGEMENT.md`](docs/CONFIGURATION-MANAGEMENT.md)
- **MCP tool ecosystem** – Auto-discover Model Context Protocol tools and extend workflows. → [`docs/advanced/mcp-integration.md`](docs/advanced/mcp-integration.md)

## Contributing & Support

- Bug reports and feature requests → [GitHub Issues](https://github.com/juspay/neurolink/issues)
- Development workflow, testing, and pull request guidelines → [`docs/development/contributing.md`](docs/development/contributing.md)
- Documentation improvements → open a PR referencing the [documentation matrix](docs/tracking/FEATURE-DOC-MATRIX.md).

---

NeuroLink is built with ❤️ by Juspay. Contributions, questions, and production feedback are always welcome.
