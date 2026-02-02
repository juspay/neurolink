<div align="center">
  <h1>🧠 NeuroLink</h1>
  <p><strong>The Enterprise AI SDK for Production Applications</strong></p>
  <p>12 Providers | 58+ MCP Tools | HITL Security | Redis Persistence</p>
</div>

<div align="center">

[![npm version](https://badge.fury.io/js/%40juspay%2Fneurolink.svg)](https://www.npmjs.com/package/@juspay/neurolink)
[![npm downloads](https://img.shields.io/npm/dw/@juspay/neurolink)](https://www.npmjs.com/package/@juspay/neurolink)
[![Build Status](https://github.com/juspay/neurolink/actions/workflows/ci.yml/badge.svg)](https://github.com/juspay/neurolink/actions/workflows/ci.yml)
[![Coverage Status](https://coveralls.io/repos/github/juspay/neurolink/badge.svg?branch=main)](https://coveralls.io/github/juspay/neurolink?branch=main)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![GitHub Stars](https://img.shields.io/github/stars/juspay/neurolink)](https://github.com/juspay/neurolink/stargazers)
[![Discord](https://img.shields.io/discord/DISCORD_SERVER_ID?label=Discord&logo=discord)](https://discord.gg/neurolink)

</div>

Enterprise AI development platform with unified provider access, production-ready tooling, and an opinionated factory architecture. NeuroLink ships as both a TypeScript SDK and a professional CLI so teams can build, operate, and iterate on AI features quickly.

## 🧠 What is NeuroLink?

**NeuroLink is the universal AI integration platform that unifies 13 major AI providers and 100+ models under one consistent API.**

Extracted from production systems at Juspay and battle-tested at enterprise scale, NeuroLink provides a production-ready solution for integrating AI into any application. Whether you're building with OpenAI, Anthropic, Google, AWS Bedrock, Azure, or any of our 13 supported providers, NeuroLink gives you a single, consistent interface that works everywhere.

**Why NeuroLink?** Switch providers with a single parameter change, leverage 64+ built-in tools and MCP servers, deploy with confidence using enterprise features like Redis memory and multi-provider failover, and optimize costs automatically with intelligent routing. Use it via our professional CLI or TypeScript SDK—whichever fits your workflow.

**Where we're headed:** We're building for the future of AI—edge-first execution and continuous streaming architectures that make AI practically free and universally available. **[Read our vision →](about/vision.md)**

**[Get Started in <5 Minutes →](getting-started/quick-start.md)**

---

## What's New (Q1 2026)

| Feature                            | Version | Description                                                                                                                                          | Guide                                                                            |
| ---------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **Workflow Engine**                | v8.42.0 | Multi-model orchestration with consensus, multi-judge, fallback, and adaptive workflows. Ensemble execution with intelligent scoring and evaluation. | [Workflow HLD](WORKFLOW-ENGINE-HLD.md) \| [Workflow LLD](WORKFLOW-ENGINE-LLD.md) |
| **Docusaurus Documentation**       | v8.41.0 | Migrated from MkDocs to Docusaurus v3 with enhanced search, versioning, and modern UI. Automated doc syncing and LLM-friendly documentation.         | [Documentation Site](https://docs.neurolink.ink)                                 |
| **Image Generation with Gemini**   | v8.31.0 | Native image generation using Gemini 2.0 Flash Experimental (`imagen-3.0-generate-002`). High-quality image synthesis directly from Google AI.       | [Image Generation Guide](image-generation-streaming.md)                          |
| **HTTP/Streamable HTTP Transport** | v8.29.0 | Connect to remote MCP servers via HTTP with authentication headers, automatic retry with exponential backoff, and configurable rate limiting.        | [HTTP Transport Guide](mcp-http-transport.md)                                    |

```typescript
// Multi-Model Workflow Engine (v8.42.0)
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Run a consensus workflow with multiple models
const result = await neurolink.runConsensusWorkflow({
  prompt: "Explain quantum computing",
  models: [
    { provider: "anthropic", modelId: "claude-3-5-sonnet-20241022" },
    { provider: "openai", modelId: "gpt-4" },
    { provider: "google-ai", modelId: "gemini-2.0-flash-exp" },
  ],
  judgeModel: { provider: "anthropic", modelId: "claude-3-5-sonnet-20241022" },
  options: { temperature: 0.7 },
});

console.log(result.response); // Best response selected by judge
console.log(result.score); // Quality score (0-100)
console.log(result.metrics); // Detailed performance metrics

// Image Generation with Gemini (v8.31.0)
const image = await neurolink.generateImage({
  prompt: "A futuristic cityscape",
  provider: "google-ai",
  model: "imagen-3.0-generate-002",
});

// HTTP Transport for Remote MCP (v8.29.0)
await neurolink.addExternalMCPServer("remote-tools", {
  transport: "http",
  url: "https://mcp.example.com/v1",
  headers: { Authorization: "Bearer token" },
  retries: 3,
  timeout: 15000,
});
```

---

<details>
<summary><strong>Previous Updates (Q4 2025)</strong></summary>

- **Image Generation** – Generate images from text prompts using Gemini models via Vertex AI or Google AI Studio. → [Guide](image-generation-streaming.md)
- **Gemini 3 Preview Support** - Full support for `gemini-3-flash-preview` and `gemini-3-pro-preview` with extended thinking
- **Structured Output with Zod Schemas** – Type-safe JSON generation with automatic validation. → [Guide](features/structured-output.md)
- **CSV & PDF File Support** – Attach CSV/PDF files to prompts with auto-detection. → [CSV](features/multimodal-chat.md#csv-file-support) | [PDF](features/pdf-support.md)
- **LiteLLM & SageMaker** – Access 100+ models via LiteLLM, deploy custom models on SageMaker. → [LiteLLM](litellm-integration.md) | [SageMaker](sagemaker-integration.md)
- **OpenRouter Integration** – Access 300+ models through a single unified API. → [Guide](getting-started/providers/openrouter.md)
- **HITL & Guardrails** – Human-in-the-loop approval workflows and content filtering middleware. → [HITL](features/hitl.md) | [Guardrails](features/guardrails.md)
- **Redis & Context Management** – Session export, conversation history, and automatic summarization. → [History](features/conversation-history.md)

</details>

## Enterprise Security: Human-in-the-Loop (HITL)

NeuroLink includes a **production-ready HITL system** for regulated industries and high-stakes AI operations:

| Capability                  | Description                                               | Use Case                                   |
| --------------------------- | --------------------------------------------------------- | ------------------------------------------ |
| **Tool Approval Workflows** | Require human approval before AI executes sensitive tools | Financial transactions, data modifications |
| **Output Validation**       | Route AI outputs through human review pipelines           | Medical diagnosis, legal documents         |
| **Confidence Thresholds**   | Automatically trigger human review below confidence level | Critical business decisions                |
| **Complete Audit Trail**    | Full audit logging for compliance (HIPAA, SOC2, GDPR)     | Regulated industries                       |

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink({
  hitl: {
    enabled: true,
    requireApproval: ["writeFile", "executeCode", "sendEmail"],
    confidenceThreshold: 0.85,
    reviewCallback: async (action, context) => {
      // Custom review logic - integrate with your approval system
      return await yourApprovalSystem.requestReview(action);
    },
  },
});

// AI pauses for human approval before executing sensitive tools
const result = await neurolink.generate({
  input: { text: "Send quarterly report to stakeholders" },
});
```

**[Enterprise HITL Guide](features/enterprise-hitl.md)** | **[Quick Start](features/hitl.md)**

## Get Started in Two Steps

```bash
# 1. Run the interactive setup wizard (select providers, validate keys)
pnpm dlx @juspay/neurolink setup

# 2. Start generating with automatic provider selection
npx @juspay/neurolink generate "Write a launch plan for multimodal chat"
```

Need a persistent workspace? Launch loop mode with `npx @juspay/neurolink loop` - [Learn more →](features/cli-loop-sessions.md)

## 🌟 Complete Feature Set

NeuroLink is a comprehensive AI development platform. Every feature below is production-ready and fully documented.

### 🤖 AI Provider Integration

**13 providers unified under one API** - Switch providers with a single parameter change.

| Provider              | Models                             | Free Tier       | Tool Support | Status        | Documentation                                                      |
| --------------------- | ---------------------------------- | --------------- | ------------ | ------------- | ------------------------------------------------------------------ |
| **OpenAI**            | GPT-4o, GPT-4o-mini, o1            | ❌              | ✅ Full      | ✅ Production | [Setup Guide](getting-started/provider-setup.md#openai)            |
| **Anthropic**         | Claude 3.5/3.7 Sonnet, Opus        | ❌              | ✅ Full      | ✅ Production | [Setup Guide](getting-started/provider-setup.md#anthropic)         |
| **Google AI Studio**  | Gemini 2.5 Flash/Pro               | ✅ Free Tier    | ✅ Full      | ✅ Production | [Setup Guide](getting-started/provider-setup.md#google-ai)         |
| **AWS Bedrock**       | Claude, Titan, Llama, Nova         | ❌              | ✅ Full      | ✅ Production | [Setup Guide](getting-started/provider-setup.md#bedrock)           |
| **Google Vertex**     | Gemini 3/2.5 (gemini-3-\*-preview) | ❌              | ✅ Full      | ✅ Production | [Setup Guide](getting-started/provider-setup.md#vertex)            |
| **Azure OpenAI**      | GPT-4, GPT-4o, o1                  | ❌              | ✅ Full      | ✅ Production | [Setup Guide](getting-started/provider-setup.md#azure)             |
| **LiteLLM**           | 100+ models unified                | Varies          | ✅ Full      | ✅ Production | [Setup Guide](litellm-integration.md)                              |
| **AWS SageMaker**     | Custom deployed models             | ❌              | ✅ Full      | ✅ Production | [Setup Guide](sagemaker-integration.md)                            |
| **Mistral AI**        | Mistral Large, Small               | ✅ Free Tier    | ✅ Full      | ✅ Production | [Setup Guide](getting-started/provider-setup.md#mistral)           |
| **Hugging Face**      | 100,000+ models                    | ✅ Free         | ⚠️ Partial   | ✅ Production | [Setup Guide](getting-started/provider-setup.md#huggingface)       |
| **Ollama**            | Local models (Llama, Mistral)      | ✅ Free (Local) | ⚠️ Partial   | ✅ Production | [Setup Guide](getting-started/provider-setup.md#ollama)            |
| **OpenAI Compatible** | Any OpenAI-compatible endpoint     | Varies          | ✅ Full      | ✅ Production | [Setup Guide](getting-started/provider-setup.md#openai-compatible) |

**[📖 Provider Comparison Guide](reference/provider-comparison.md)** - Detailed feature matrix and selection criteria
**[🔬 Provider Feature Compatibility](reference/provider-feature-compatibility.md)** - Test-based compatibility reference for all 19 features across 13 providers

---

### 🔧 Built-in Tools & MCP Integration

**6 Core Tools** (work across all providers, zero configuration):

| Tool                 | Purpose                  | Auto-Available          | Documentation                         |
| -------------------- | ------------------------ | ----------------------- | ------------------------------------- |
| `getCurrentTime`     | Real-time clock access   | ✅                      | [Tool Reference](sdk/custom-tools.md) |
| `readFile`           | File system reading      | ✅                      | [Tool Reference](sdk/custom-tools.md) |
| `writeFile`          | File system writing      | ✅                      | [Tool Reference](sdk/custom-tools.md) |
| `listDirectory`      | Directory listing        | ✅                      | [Tool Reference](sdk/custom-tools.md) |
| `calculateMath`      | Mathematical operations  | ✅                      | [Tool Reference](sdk/custom-tools.md) |
| `websearchGrounding` | Google Vertex web search | ⚠️ Requires credentials | [Tool Reference](sdk/custom-tools.md) |

**58+ External MCP Servers** supported (GitHub, PostgreSQL, Google Drive, Slack, and more):

```typescript
// stdio transport - local MCP servers via command execution
await neurolink.addExternalMCPServer("github", {
  command: "npx",
  args: ["-y", "@modelcontextprotocol/server-github"],
  transport: "stdio",
  env: { GITHUB_TOKEN: process.env.GITHUB_TOKEN },
});

// HTTP transport - remote MCP servers via URL
await neurolink.addExternalMCPServer("github-copilot", {
  transport: "http",
  url: "https://api.githubcopilot.com/mcp",
  headers: { Authorization: "Bearer YOUR_COPILOT_TOKEN" },
  timeout: 15000,
  retries: 5,
});

// Tools automatically available to AI
const result = await neurolink.generate({
  input: { text: 'Create a GitHub issue titled "Bug in auth flow"' },
});
```

**MCP Transport Options:**

| Transport   | Use Case       | Key Features                                    |
| ----------- | -------------- | ----------------------------------------------- |
| `stdio`     | Local servers  | Command execution, environment variables        |
| `http`      | Remote servers | URL-based, auth headers, retries, rate limiting |
| `sse`       | Event streams  | Server-Sent Events, real-time updates           |
| `websocket` | Bi-directional | Full-duplex communication                       |

**[📖 MCP Integration Guide](advanced/mcp-integration.md)** - Setup external servers
**[📖 HTTP Transport Guide](mcp-http-transport.md)** - Remote MCP server configuration

---

### 💻 Developer Experience Features

**SDK-First Design** with TypeScript, IntelliSense, and type safety:

| Feature                     | Description                                                   | Documentation                                        |
| --------------------------- | ------------------------------------------------------------- | ---------------------------------------------------- |
| **Auto Provider Selection** | Intelligent provider fallback                                 | [SDK Guide](sdk/index.md#auto-selection)             |
| **Streaming Responses**     | Real-time token streaming                                     | [Streaming Guide](advanced/streaming.md)             |
| **Conversation Memory**     | Automatic context management                                  | [Memory Guide](sdk/index.md#memory)                  |
| **Full Type Safety**        | Complete TypeScript types                                     | [Type Reference](sdk/api-reference.md)               |
| **Error Handling**          | Graceful provider fallback                                    | [Error Guide](reference/troubleshooting.md)          |
| **Analytics & Evaluation**  | Usage tracking, quality scores                                | [Analytics Guide](advanced/analytics.md)             |
| **Middleware System**       | Request/response hooks                                        | [Middleware Guide](custom-middleware-guide.md)       |
| **Framework Integration**   | Next.js, SvelteKit, Express                                   | [Framework Guides](sdk/framework-integration.md)     |
| **Extended Thinking**       | Native thinking/reasoning mode for Gemini 3 and Claude models | [Thinking Guide](features/thinking-configuration.md) |

---

### 🏢 Enterprise & Production Features

**Production-ready capabilities for regulated industries:**

| Feature                     | Description                        | Use Case                  | Documentation                                          |
| --------------------------- | ---------------------------------- | ------------------------- | ------------------------------------------------------ |
| **Enterprise Proxy**        | Corporate proxy support            | Behind firewalls          | [Proxy Setup](enterprise-proxy-setup.md)               |
| **Redis Memory**            | Distributed conversation state     | Multi-instance deployment | [Redis Guide](getting-started/provider-setup.md#redis) |
| **Cost Optimization**       | Automatic cheapest model selection | Budget control            | [Cost Guide](advanced/index.md)                        |
| **Multi-Provider Failover** | Automatic provider switching       | High availability         | [Failover Guide](advanced/index.md)                    |
| **Telemetry & Monitoring**  | OpenTelemetry integration          | Observability             | [Telemetry Guide](telemetry-guide.md)                  |
| **Security Hardening**      | Credential management, auditing    | Compliance                | [Security Guide](advanced/enterprise.md)               |
| **Custom Model Hosting**    | SageMaker integration              | Private models            | [SageMaker Guide](sagemaker-integration.md)            |
| **Load Balancing**          | LiteLLM proxy integration          | Scale & routing           | [Load Balancing](litellm-integration.md)               |

**Security & Compliance:**

- ✅ SOC2 Type II compliant deployments
- ✅ ISO 27001 certified infrastructure compatible
- ✅ GDPR-compliant data handling (EU providers available)
- ✅ HIPAA compatible (with proper configuration)
- ✅ Hardened OS verified (SELinux, AppArmor)
- ✅ Zero credential logging
- ✅ Encrypted configuration storage

**[📖 Enterprise Deployment Guide](advanced/enterprise.md)** - Complete production checklist

---

## Enterprise Persistence: Redis Memory

Production-ready distributed conversation state for multi-instance deployments:

### Capabilities

| Feature                | Description                                  | Benefit                     |
| ---------------------- | -------------------------------------------- | --------------------------- |
| **Distributed Memory** | Share conversation context across instances  | Horizontal scaling          |
| **Session Export**     | Export full history as JSON                  | Analytics, debugging, audit |
| **Auto-Detection**     | Automatic Redis discovery from environment   | Zero-config in containers   |
| **Graceful Failover**  | Falls back to in-memory if Redis unavailable | High availability           |
| **TTL Management**     | Configurable session expiration              | Memory management           |

### Quick Setup

```typescript
import { NeuroLink } from "@juspay/neurolink";

// Auto-detect Redis from REDIS_URL environment variable
const neurolink = new NeuroLink({
  conversationMemory: {
    enabled: true,
    store: "redis", // Automatically uses REDIS_URL
    ttl: 86400, // 24-hour session expiration
  },
});

// Or explicit configuration
const neuriolinkExplicit = new NeuroLink({
  conversationMemory: {
    enabled: true,
    store: "redis",
    redis: {
      host: "redis.example.com",
      port: 6379,
      password: process.env.REDIS_PASSWORD,
      tls: true, // Enable for production
    },
  },
});

// Export conversation for analytics
const history = await neurolink.exportConversation({ format: "json" });
await saveToDataWarehouse(history);
```

### Docker Quick Start

```bash
# Start Redis
docker run -d --name neurolink-redis -p 6379:6379 redis:7-alpine

# Configure NeuroLink
export REDIS_URL=redis://localhost:6379

# Start your application
node your-app.js
```

**[Redis Setup Guide](getting-started/redis-quickstart.md)** | **[Production Configuration](guides/redis-configuration.md)** | **[Migration Patterns](guides/redis-migration.md)**

---

### 🎨 Professional CLI

**15+ commands** for every workflow:

| Command    | Purpose                            | Example                    | Documentation                        |
| ---------- | ---------------------------------- | -------------------------- | ------------------------------------ |
| `setup`    | Interactive provider configuration | `neurolink setup`          | [Setup Guide](cli/index.md)          |
| `generate` | Text generation                    | `neurolink gen "Hello"`    | [Generate](cli/commands.md#generate) |
| `stream`   | Streaming generation               | `neurolink stream "Story"` | [Stream](cli/commands.md#stream)     |
| `status`   | Provider health check              | `neurolink status`         | [Status](cli/commands.md#status)     |
| `loop`     | Interactive session                | `neurolink loop`           | [Loop](cli/commands.md#loop)         |
| `mcp`      | MCP server management              | `neurolink mcp discover`   | [MCP CLI](cli/commands.md#mcp)       |
| `models`   | Model listing                      | `neurolink models`         | [Models](cli/commands.md#models)     |
| `eval`     | Model evaluation                   | `neurolink eval`           | [Eval](cli/commands.md#eval)         |

**[📖 Complete CLI Reference](cli/commands.md)** - All commands and options

---

### 🤖 GitHub Action

Run AI-powered workflows directly in GitHub Actions with 13 provider support and automatic PR/issue commenting.

```yaml
- uses: juspay/neurolink@v1
  with:
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
    prompt: "Review this PR for security issues and code quality"
    post_comment: true
```

| Feature                | Description                                     |
| ---------------------- | ----------------------------------------------- |
| **Multi-Provider**     | 13 providers with unified interface             |
| **PR/Issue Comments**  | Auto-post AI responses with intelligent updates |
| **Multimodal Support** | Attach images, PDFs, CSVs to prompts            |
| **Cost Tracking**      | Built-in analytics and quality evaluation       |
| **Extended Thinking**  | Deep reasoning with thinking tokens             |

**[📖 GitHub Action Guide](guides/github-action.md)** - Complete setup and examples

---

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

## Revolutionary Interactive CLI

NeuroLink's CLI goes beyond simple commands - it's a **full AI development environment**:

### Why Interactive Mode Changes Everything

| Feature       | Traditional CLI   | NeuroLink Interactive          |
| ------------- | ----------------- | ------------------------------ |
| Session State | None              | Full persistence               |
| Memory        | Per-command       | Conversation-aware             |
| Configuration | Flags per command | `/set` persists across session |
| Tool Testing  | Manual per tool   | Live discovery & testing       |
| Streaming     | Optional          | Real-time default              |

### Live Demo: Development Session

```bash
$ npx @juspay/neurolink loop --enable-conversation-memory

neurolink > /set provider vertex
✓ provider set to vertex (Gemini 3 support enabled)

neurolink > /set model gemini-3-flash-preview
✓ model set to gemini-3-flash-preview

neurolink > Analyze my project architecture and suggest improvements

✓ Analyzing your project structure...
[AI provides detailed analysis, remembering context]

neurolink > Now implement the first suggestion
[AI remembers previous context and implements suggestion]

neurolink > /mcp discover
✓ Discovered 58 MCP tools:
   GitHub: create_issue, list_repos, create_pr...
   PostgreSQL: query, insert, update...
   [full list]

neurolink > Use the GitHub tool to create an issue for this improvement
✓ Creating issue... (requires HITL approval if configured)

neurolink > /export json > session-2026-01-01.json
✓ Exported 15 messages to session-2026-01-01.json

neurolink > exit
Session saved. Resume with: neurolink loop --session session-2026-01-01.json
```

### Session Commands Reference

| Command              | Purpose                                              |
| -------------------- | ---------------------------------------------------- |
| `/set <key> <value>` | Persist configuration (provider, model, temperature) |
| `/mcp discover`      | List all available MCP tools                         |
| `/export json`       | Export conversation to JSON                          |
| `/history`           | View conversation history                            |
| `/clear`             | Clear context while keeping settings                 |

**[Interactive CLI Guide](features/interactive-cli.md)** | **[CLI Reference](cli/commands.md)**

Skip the wizard and configure manually? See [`docs/getting-started/provider-setup.md`](getting-started/provider-setup.md).

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

Full command and API breakdown lives in [`docs/cli/commands.md`](cli/commands.md) and [`docs/sdk/api-reference.md`](sdk/api-reference.md).

## Platform Capabilities at a Glance

| Capability               | Highlights                                                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| **Provider unification** | 13+ providers with automatic fallback, cost-aware routing, provider orchestration (Q3).                                  |
| **Multimodal pipeline**  | Stream images + CSV data + PDF documents across providers with local/remote assets. Auto-detection for mixed file types. |
| **Quality & governance** | Auto-evaluation engine (Q3), guardrails middleware (Q4), HITL workflows (Q4), audit logging.                             |
| **Memory & context**     | Conversation memory, Mem0 integration, Redis history export (Q4), context summarization (Q4).                            |
| **CLI tooling**          | Loop sessions (Q3), setup wizard, config validation, Redis auto-detect, JSON output.                                     |
| **Enterprise ops**       | Proxy support, regional routing (Q3), telemetry hooks, configuration management.                                         |
| **Tool ecosystem**       | MCP auto discovery, HTTP/stdio/SSE/WebSocket transports, LiteLLM hub access, SageMaker custom deployment, web search.    |

## Documentation Map

| Area            | When to Use                                           | Link                                                        |
| --------------- | ----------------------------------------------------- | ----------------------------------------------------------- |
| Getting started | Install, configure, run first prompt                  | [`docs/getting-started/index.md`](getting-started/index.md) |
| Feature guides  | Understand new functionality front-to-back            | [`docs/features/index.md`](features/index.md)               |
| CLI reference   | Command syntax, flags, loop sessions                  | [`docs/cli/index.md`](cli/index.md)                         |
| SDK reference   | Classes, methods, options                             | [`docs/sdk/index.md`](sdk/index.md)                         |
| Integrations    | LiteLLM, SageMaker, MCP, Mem0                         | [`docs/litellm-integration.md`](litellm-integration.md)     |
| Advanced        | Middleware, architecture, streaming patterns          | [`docs/advanced/index.md`](advanced/index.md)               |
| Cookbook        | Practical recipes for common patterns                 | [`docs/cookbook/index.md`](cookbook/index.md)               |
| Guides          | Migration, Redis, troubleshooting, provider selection | [`docs/guides/index.md`](guides/index.md)                   |
| Operations      | Configuration, troubleshooting, provider matrix       | [`docs/reference/index.md`](reference/index.md)             |

### New in 2026: Enhanced Documentation

**Enterprise Features:**

- [Enterprise HITL Guide](features/enterprise-hitl.md) - Production-ready approval workflows
- [Interactive CLI Guide](features/interactive-cli.md) - AI development environment
- [MCP Tools Showcase](features/mcp-tools-showcase.md) - 58+ external tools & 6 built-in tools

**Provider Intelligence:**

- [Provider Capabilities Audit](reference/provider-capabilities-audit.md) - Technical capabilities matrix
- [Provider Selection Guide](guides/provider-selection.md) - Interactive decision wizard
- [Provider Comparison](reference/provider-comparison.md) - Feature & cost comparison

**Middleware System:**

- [Middleware Architecture](advanced/middleware-architecture.md) - Complete lifecycle & patterns
- [Built-in Middleware](advanced/builtin-middleware.md) - Analytics, Guardrails, Evaluation
- [Custom Middleware Guide](custom-middleware-guide.md) - Build your own

**Redis & Persistence:**

- [Redis Quick Start](getting-started/redis-quickstart.md) - 5-minute setup
- [Redis Configuration](guides/redis-configuration.md) - Production-ready setup
- [Redis Migration](guides/redis-migration.md) - Migration patterns

**Migration Guides:**

- [From LangChain](guides/migration/from-langchain.md) - Complete migration guide
- [From Vercel AI SDK](guides/migration/from-vercel-ai-sdk.md) - Next.js focused

**Developer Experience:**

- [Cookbook](cookbook/index.md) - 10 practical recipes
- [Troubleshooting Guide](guides/troubleshooting.md) - Common issues & solutions

## Integrations

- **LiteLLM 100+ model hub** – Unified access to third-party models via LiteLLM routing. → [`docs/litellm-integration.md`](litellm-integration.md)
- **Amazon SageMaker** – Deploy and call custom endpoints directly from NeuroLink CLI/SDK. → [`docs/sagemaker-integration.md`](sagemaker-integration.md)
- **Mem0 conversational memory** – Persistent semantic memory with vector store support. → [`docs/mem0-integration.md`](mem0-integration.md)
- **Enterprise proxy & security** – Configure outbound policies and compliance posture. → [`docs/enterprise-proxy-setup.md`](enterprise-proxy-setup.md)
- **Configuration automation** – Manage environments, regions, and credentials safely. → [`docs/configuration-management.md`](configuration-management.md)
- **MCP tool ecosystem** – Auto-discover Model Context Protocol tools and extend workflows. → [`docs/advanced/mcp-integration.md`](advanced/mcp-integration.md)
- **Remote MCP via HTTP** – Connect to HTTP-based MCP servers with authentication, retries, and rate limiting. → [`docs/mcp-http-transport.md`](mcp-http-transport.md)

## Contributing & Support

- Bug reports and feature requests → [GitHub Issues](https://github.com/juspay/neurolink/issues)
- Development workflow, testing, and pull request guidelines → [`docs/development/contributing.md`](development/contributing.md)
- Documentation improvements → open a PR referencing the documentation matrix.

---

NeuroLink is built with ❤️ by Juspay. Contributions, questions, and production feedback are always welcome.
