# NeuroLink

**The pipe layer for the AI nervous system.**

AI intelligence flows as streams — tokens, tool calls, memory, voice, documents.
NeuroLink is the vascular layer that carries these streams from where they are
generated (LLM providers: the neurons) to where they are needed (connectors: the organs).

```typescript
import { NeuroLink } from "@juspay/neurolink";

const pipe = new NeuroLink({ defaultProvider: "anthropic" });

// Everything is a stream
for await (const token of pipe.stream({ prompt: "Hello" })) {
  process.stdout.write(token);
}
```

**[→ Docs](https://docs.neurolink.ink) · [→ Quick Start](https://docs.neurolink.ink/docs/getting-started/quick-start) · [→ npm](https://www.npmjs.com/package/@juspay/neurolink)**

---

## 🧠 What is NeuroLink?

**NeuroLink is the universal AI integration platform that unifies 13 major AI providers and 100+ models under one consistent API.**

Extracted from production systems at Juspay and battle-tested at enterprise scale, NeuroLink provides a production-ready solution for integrating AI into any application. Whether you're building with OpenAI, Anthropic, Google, AWS Bedrock, Azure, or any of our 13 supported providers, NeuroLink gives you a single, consistent interface that works everywhere.

**Why NeuroLink?** Switch providers with a single parameter change, leverage 64+ built-in tools and MCP servers, deploy with confidence using enterprise features like Redis memory and multi-provider failover, and optimize costs automatically with intelligent routing. Use it via our professional CLI or TypeScript SDK—whichever fits your workflow.

**Where we're headed:** We're building for the future of AI—edge-first execution and continuous streaming architectures that make AI practically free and universally available. **[Read our vision →](docs/about/vision.md)**

**[Get Started in <5 Minutes →](docs/getting-started/quick-start.md)**

---

## What's New (Q1 2026)

| Feature                             | Version | Description                                                                                                                                                   | Guide                                                                 |
| ----------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| **MCP Enhancements**                | v9.16.0 | Advanced MCP features: tool routing, result caching, request batching, annotations, elicitation, custom server base, multi-server management                  | [MCP Enhancements Guide](docs/features/mcp-enhancements.md)           |
| **Memory**                          | v9.12.0 | Per-user condensed memory that persists across conversations. LLM-powered condensation with S3, Redis, or SQLite backends.                                    | [Memory Guide](docs/features/memory.md)                               |
| **Context Window Management**       | v9.2.0  | 4-stage compaction pipeline with auto-detection, budget gate at 80% usage, per-provider token estimation                                                      | [Context Compaction Guide](docs/features/context-compaction.md)       |
| **Tool Execution Control**          | v9.3.0  | `prepareStep` and `toolChoice` support for per-step tool enforcement in multi-step agentic loops. API-level control over tool calls.                          | [API Reference](docs/api/type-aliases/GenerateOptions.md#preparestep) |
| **File Processor System**           | v9.1.0  | 17+ file type processors with ProcessorRegistry, security sanitization, SVG text injection                                                                    | [File Processors Guide](docs/features/file-processors.md)             |
| **RAG with generate()/stream()**    | v9.2.0  | Pass `rag: { files }` to generate/stream for automatic document chunking, embedding, and AI-powered search. 10 chunking strategies, hybrid search, reranking. | [RAG Guide](docs/features/rag.md)                                     |
| **External TracerProvider Support** | v8.43.0 | Integrate NeuroLink with existing OpenTelemetry instrumentation. Prevents duplicate registration conflicts.                                                   | [Observability Guide](docs/features/observability.md)                 |
| **Server Adapters**                 | v8.43.0 | Multi-framework HTTP server with Hono, Express, Fastify, Koa support. Full CLI for server management with foreground/background modes.                        | [Server Adapters Guide](docs/guides/server-adapters/index.md)         |
| **Title Generation Events**         | v8.38.0 | Emit `conversation:titleGenerated` event when conversation title is generated. Supports custom title prompts via `NEUROLINK_TITLE_PROMPT`.                    | [Conversation Memory Guide](docs/conversation-memory.md)              |
| **Video Generation with Veo**       | v8.32.0 | Video generation using Veo 3.1 (`veo-3.1`). Realistic video generation with many parameter options                                                            | [Video Generation Guide](docs/features/video-generation.md)           |
| **Image Generation with Gemini**    | v8.31.0 | Native image generation using Gemini 2.0 Flash Experimental (`imagen-3.0-generate-002`). High-quality image synthesis directly from Google AI.                | [Image Generation Guide](docs/image-generation-streaming.md)          |
| **HTTP/Streamable HTTP Transport**  | v8.29.0 | Connect to remote MCP servers via HTTP with authentication headers, automatic retry with exponential backoff, and configurable rate limiting.                 | [HTTP Transport Guide](docs/mcp-http-transport.md)                    |

- **Memory** – Per-user condensed memory that persists across all conversations. Automatically retrieves and stores memory on each `generate()`/`stream()` call. Supports S3, Redis, and SQLite storage with LLM-powered condensation. → [Memory Guide](docs/features/memory.md)
- **External TracerProvider Support** – Integrate NeuroLink with applications that already have OpenTelemetry instrumentation. Supports auto-detection and manual configuration. → [Observability Guide](docs/features/observability.md)
- **Server Adapters** – Deploy NeuroLink as an HTTP API server with your framework of choice (Hono, Express, Fastify, Koa). Full CLI support with `serve` and `server` commands for foreground/background modes, route management, and OpenAPI generation. → [Server Adapters Guide](docs/guides/server-adapters/index.md)
- **Title Generation Events** – Emit real-time events when conversation titles are auto-generated. Listen to `conversation:titleGenerated` for session tracking. → [Conversation Memory Guide](docs/conversation-memory.md#title-generation-events)
- **Custom Title Prompts** – Customize conversation title generation with `NEUROLINK_TITLE_PROMPT` environment variable. Use `${userMessage}` placeholder for dynamic prompts. → [Conversation Memory Guide](docs/conversation-memory.md#customizing-the-title-prompt)
- **Video Generation** – Transform images into 8-second videos with synchronized audio using Google Veo 3.1 via Vertex AI. Supports 720p/1080p resolutions, portrait/landscape aspect ratios. → [Video Generation Guide](docs/features/video-generation.md)
- **PPT Generation** – Create professional PowerPoint presentations from text prompts with 35 slide types (title, content, charts, timelines, dashboards, composite layouts), 5 themes, and optional AI-generated images. Works with Vertex AI, OpenAI, Anthropic, Google AI, Azure, and Bedrock. → [PPT Generation Guide](docs/features/ppt-generation.md)
- **Image Generation** – Generate images from text prompts using Gemini models via Vertex AI or Google AI Studio. Supports streaming mode with automatic file saving. → [Image Generation Guide](docs/image-generation-streaming.md)
- **RAG with generate()/stream()** – Just pass `rag: { files: ["./docs/guide.md"] }` to `generate()` or `stream()`. NeuroLink auto-chunks, embeds, and creates a search tool the AI can invoke. 10 chunking strategies, hybrid search, 5 reranker types. → [RAG Guide](docs/features/rag.md)
- **HTTP/Streamable HTTP Transport for MCP** – Connect to remote MCP servers via HTTP with authentication headers, retry logic, and rate limiting. → [HTTP Transport Guide](docs/mcp-http-transport.md)
- 🧠 **Gemini 3 Preview Support** - Full support for gemini-3-flash-preview and gemini-3-pro-preview with extended thinking capabilities
- 🎯 **Tool Execution Control** – Use `prepareStep` to enforce specific tool calls, change the LLM models per step in multi-step agentic executions. Prevents LLMs from skipping required tools. Use `toolChoice` for static control, or `prepareStep` for dynamic per-step logic. → [GenerateOptions Reference](docs/api/type-aliases/GenerateOptions.md#preparestep)
- **Structured Output with Zod Schemas** – Type-safe JSON generation with automatic validation using `schema` + `output.format: "json"` in `generate()`. → [Structured Output Guide](docs/features/structured-output.md)
- **CSV File Support** – Attach CSV files to prompts for AI-powered data analysis with auto-detection. → [CSV Guide](docs/features/multimodal-chat.md#csv-file-support)
- **PDF File Support** – Process PDF documents with native visual analysis for Vertex AI, Anthropic, Bedrock, AI Studio. → [PDF Guide](docs/features/pdf-support.md)
- **50+ File Types** – Process Excel, Word, RTF, JSON, YAML, XML, HTML, SVG, Markdown, and 50+ code languages with intelligent content extraction. → [File Processors Guide](docs/features/file-processors.md)
- **LiteLLM Integration** – Access 100+ AI models from all major providers through unified interface. → [Setup Guide](docs/litellm-integration.md)
- **SageMaker Integration** – Deploy and use custom trained models on AWS infrastructure. → [Setup Guide](docs/sagemaker-integration.md)
- **OpenRouter Integration** – Access 300+ models from OpenAI, Anthropic, Google, Meta, and more through a single unified API. → [Setup Guide](docs/getting-started/providers/openrouter.md)
- **Human-in-the-loop workflows** – Pause generation for user approval/input before tool execution. → [HITL Guide](docs/features/hitl.md)
- **Guardrails middleware** – Block PII, profanity, and unsafe content with built-in filtering. → [Guardrails Guide](docs/features/guardrails.md)
- **Context summarization** – Automatic conversation compression for long-running sessions. → [Summarization Guide](docs/context-summarization.md)
- **MCP Enhancements** – 14 production-grade modules: tool routing (6 strategies), result caching (LRU/FIFO/LFU), request batching, tool annotations with auto-inference, middleware chain, elicitation protocol, multi-server management, and more. → [MCP Enhancements Guide](docs/features/mcp-enhancements.md)
- **Redis conversation export** – Export full session history as JSON for analytics and debugging. → [History Guide](docs/features/conversation-history.md)

```typescript
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

- **Image Generation** – Generate images from text prompts using Gemini models via Vertex AI or Google AI Studio. → [Guide](docs/image-generation-streaming.md)
- **Gemini 3 Preview Support** - Full support for `gemini-3-flash-preview` and `gemini-3-pro-preview` with extended thinking
- **Structured Output with Zod Schemas** – Type-safe JSON generation with automatic validation. → [Guide](docs/features/structured-output.md)
- **CSV & PDF File Support** – Attach CSV/PDF files to prompts with auto-detection. → [CSV](docs/features/multimodal-chat.md#csv-file-support) | [PDF](docs/features/pdf-support.md)
- **LiteLLM & SageMaker** – Access 100+ models via LiteLLM, deploy custom models on SageMaker. → [LiteLLM](docs/litellm-integration.md) | [SageMaker](docs/sagemaker-integration.md)
- **OpenRouter Integration** – Access 300+ models through a single unified API. → [Guide](docs/getting-started/providers/openrouter.md)
- **HITL & Guardrails** – Human-in-the-loop approval workflows and content filtering middleware. → [HITL](docs/features/hitl.md) | [Guardrails](docs/features/guardrails.md)
- **Redis & Context Management** – Session export, conversation history, and automatic summarization. → [History](docs/features/conversation-history.md)

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

**[Enterprise HITL Guide](docs/features/enterprise-hitl.md)** | **[Quick Start](docs/features/hitl.md)**

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

| Provider              | Models                                             | Free Tier       | Tool Support | Status        | Documentation                                                                                                                 |
| --------------------- | -------------------------------------------------- | --------------- | ------------ | ------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **OpenAI**            | GPT-4o, GPT-4o-mini, o1                            | ❌              | ✅ Full      | ✅ Production | [Setup Guide](docs/getting-started/provider-setup.md#openai)                                                                  |
| **Anthropic**         | Claude 4.5 Opus/Sonnet/Haiku, Claude 4 Opus/Sonnet | ❌              | ✅ Full      | ✅ Production | [Setup Guide](docs/getting-started/provider-setup.md#anthropic) \| [Subscription Guide](docs/features/claude-subscription.md) |
| **Google AI Studio**  | Gemini 3 Flash/Pro, Gemini 2.5 Flash/Pro           | ✅ Free Tier    | ✅ Full      | ✅ Production | [Setup Guide](docs/getting-started/provider-setup.md#google-ai)                                                               |
| **AWS Bedrock**       | Claude, Titan, Llama, Nova                         | ❌              | ✅ Full      | ✅ Production | [Setup Guide](docs/getting-started/provider-setup.md#bedrock)                                                                 |
| **Google Vertex**     | Gemini 3/2.5 (gemini-3-\*-preview)                 | ❌              | ✅ Full      | ✅ Production | [Setup Guide](docs/getting-started/provider-setup.md#vertex)                                                                  |
| **Azure OpenAI**      | GPT-4, GPT-4o, o1                                  | ❌              | ✅ Full      | ✅ Production | [Setup Guide](docs/getting-started/provider-setup.md#azure)                                                                   |
| **LiteLLM**           | 100+ models unified                                | Varies          | ✅ Full      | ✅ Production | [Setup Guide](docs/litellm-integration.md)                                                                                    |
| **AWS SageMaker**     | Custom deployed models                             | ❌              | ✅ Full      | ✅ Production | [Setup Guide](docs/sagemaker-integration.md)                                                                                  |
| **Mistral AI**        | Mistral Large, Small                               | ✅ Free Tier    | ✅ Full      | ✅ Production | [Setup Guide](docs/getting-started/provider-setup.md#mistral)                                                                 |
| **Hugging Face**      | 100,000+ models                                    | ✅ Free         | ⚠️ Partial   | ✅ Production | [Setup Guide](docs/getting-started/provider-setup.md#huggingface)                                                             |
| **Ollama**            | Local models (Llama, Mistral)                      | ✅ Free (Local) | ⚠️ Partial   | ✅ Production | [Setup Guide](docs/getting-started/provider-setup.md#ollama)                                                                  |
| **OpenAI Compatible** | Any OpenAI-compatible endpoint                     | Varies          | ✅ Full      | ✅ Production | [Setup Guide](docs/getting-started/provider-setup.md#openai-compatible)                                                       |
| **OpenRouter**        | 200+ Models via OpenRouter                         | Varies          | ✅ Full      | ✅ Production | [Setup Guide](docs/getting-started/providers/openrouter.md)                                                                   |

**[📖 Provider Comparison Guide](docs/reference/provider-comparison.md)** - Detailed feature matrix and selection criteria
**[🔬 Provider Feature Compatibility](docs/reference/provider-feature-compatibility.md)** - Test-based compatibility reference for all 19 features across 13 providers

---

### 🔧 Built-in Tools & MCP Integration

**6 Core Tools** (work across all providers, zero configuration):

| Tool                 | Purpose                  | Auto-Available          | Documentation                              |
| -------------------- | ------------------------ | ----------------------- | ------------------------------------------ |
| `getCurrentTime`     | Real-time clock access   | ✅                      | [Tool Reference](docs/sdk/custom-tools.md) |
| `readFile`           | File system reading      | ✅                      | [Tool Reference](docs/sdk/custom-tools.md) |
| `writeFile`          | File system writing      | ✅                      | [Tool Reference](docs/sdk/custom-tools.md) |
| `listDirectory`      | Directory listing        | ✅                      | [Tool Reference](docs/sdk/custom-tools.md) |
| `calculateMath`      | Mathematical operations  | ✅                      | [Tool Reference](docs/sdk/custom-tools.md) |
| `websearchGrounding` | Google Vertex web search | ⚠️ Requires credentials | [Tool Reference](docs/sdk/custom-tools.md) |

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

**[📖 MCP Integration Guide](docs/advanced/mcp-integration.md)** - Setup external servers
**[📖 HTTP Transport Guide](docs/mcp-http-transport.md)** - Remote MCP server configuration

---

### 🔌 MCP Enhancements

**Production-grade MCP capabilities** for managing tool calls at scale across multi-server environments:

| Module                        | Purpose                                                    |
| ----------------------------- | ---------------------------------------------------------- |
| **Tool Router**               | Intelligent routing across servers with 6 strategies       |
| **Tool Cache**                | Result caching with LRU, FIFO, and LFU eviction            |
| **Request Batcher**           | Automatic batching of tool calls for throughput            |
| **Tool Annotations**          | Safety metadata and behavior hints for MCP tools           |
| **Tool Converter**            | Bidirectional conversion between NeuroLink and MCP formats |
| **Elicitation Protocol**      | Interactive user input during tool execution (HITL)        |
| **Multi-Server Manager**      | Load balancing and failover across server groups           |
| **MCP Server Base**           | Abstract base class for building custom MCP servers        |
| **Enhanced Tool Discovery**   | Advanced search and filtering across servers               |
| **Agent & Workflow Exposure** | Expose agents and workflows as MCP tools                   |
| **Server Capabilities**       | Resource and prompt management per MCP spec                |
| **Registry Client**           | Discover and connect to MCP servers from registries        |
| **Tool Integration**          | End-to-end tool lifecycle with middleware chain            |
| **Elicitation Manager**       | Manages elicitation flows with validation and timeouts     |

```typescript
import { ToolRouter, ToolCache, RequestBatcher } from "@juspay/neurolink";

// Route tool calls across multiple MCP servers
const router = new ToolRouter({
  strategy: "capability-based",
  servers: [
    { name: "github", url: "https://mcp-github.example.com" },
    { name: "db", url: "https://mcp-postgres.example.com" },
  ],
});

// Cache repeated tool results (LRU, FIFO, or LFU)
const cache = new ToolCache({ strategy: "lru", maxSize: 500, ttl: 60_000 });

// Batch concurrent tool calls for throughput
const batcher = new RequestBatcher({ maxBatchSize: 10, maxWaitMs: 50 });
```

**[📖 MCP Enhancements Guide](docs/features/mcp-enhancements.md)** - Full reference for all 14 modules

---

### 💻 Developer Experience Features

**SDK-First Design** with TypeScript, IntelliSense, and type safety:

| Feature                     | Description                                                                       | Documentation                                             |
| --------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------- |
| **Auto Provider Selection** | Intelligent provider fallback                                                     | [SDK Guide](docs/sdk/index.md#auto-selection)             |
| **Streaming Responses**     | Real-time token streaming                                                         | [Streaming Guide](docs/advanced/streaming.md)             |
| **Conversation Memory**     | Automatic context management with embedded per-user memory                        | [Memory Guide](docs/sdk/index.md#memory)                  |
| **Full Type Safety**        | Complete TypeScript types                                                         | [Type Reference](docs/sdk/api-reference.md)               |
| **Error Handling**          | Graceful provider fallback                                                        | [Error Guide](docs/reference/troubleshooting.md)          |
| **Analytics & Evaluation**  | Usage tracking, quality scores                                                    | [Analytics Guide](docs/advanced/analytics.md)             |
| **Middleware System**       | Request/response hooks                                                            | [Middleware Guide](docs/custom-middleware-guide.md)       |
| **Framework Integration**   | Next.js, SvelteKit, Express                                                       | [Framework Guides](docs/sdk/framework-integration.md)     |
| **Extended Thinking**       | Native thinking/reasoning mode for Gemini 3 and Claude models                     | [Thinking Guide](docs/features/thinking-configuration.md) |
| **RAG Document Processing** | `rag: { files }` on generate/stream with 10 chunking strategies and hybrid search | [RAG Guide](docs/features/rag.md)                         |

---

### 📁 Multimodal & File Processing

**17+ file categories supported** (50+ total file types including code languages) with intelligent content extraction and provider-agnostic processing:

| Category      | Supported Types                                            | Processing                          |
| ------------- | ---------------------------------------------------------- | ----------------------------------- |
| **Documents** | Excel (`.xlsx`, `.xls`), Word (`.docx`), RTF, OpenDocument | Sheet extraction, text extraction   |
| **Data**      | JSON, YAML, XML                                            | Validation, syntax highlighting     |
| **Markup**    | HTML, SVG, Markdown, Text                                  | OWASP-compliant sanitization        |
| **Code**      | 50+ languages (TypeScript, Python, Java, Go, etc.)         | Language detection, syntax metadata |
| **Config**    | `.env`, `.ini`, `.toml`, `.cfg`                            | Secure parsing                      |
| **Media**     | Images (PNG, JPEG, WebP, GIF), PDFs, CSV                   | Provider-specific formatting        |

```typescript
// Process any supported file type
const result = await neurolink.generate({
  input: {
    text: "Analyze this data and code",
    files: [
      "./data.xlsx", // Excel spreadsheet
      "./config.yaml", // YAML configuration
      "./diagram.svg", // SVG (injected as sanitized text)
      "./main.py", // Python source code
    ],
  },
});

// CLI: Use --file for any supported type
// neurolink generate "Analyze this" --file ./report.xlsx --file ./config.json
```

**Key Features:**

- **ProcessorRegistry** - Priority-based processor selection with fallback
- **OWASP Security** - HTML/SVG sanitization prevents XSS attacks
- **Auto-detection** - FileDetector identifies file types by extension and content
- **Provider-agnostic** - All processors work across all 13 AI providers

**[📖 File Processors Guide](docs/features/file-processors.md)** - Complete reference for all file types

---

### 🏢 Enterprise & Production Features

**Production-ready capabilities for regulated industries:**

| Feature                     | Description                                 | Use Case                  | Documentation                                               |
| --------------------------- | ------------------------------------------- | ------------------------- | ----------------------------------------------------------- |
| **Enterprise Proxy**        | Corporate proxy support                     | Behind firewalls          | [Proxy Setup](docs/enterprise-proxy-setup.md)               |
| **Redis Memory**            | Distributed conversation state              | Multi-instance deployment | [Redis Guide](docs/getting-started/provider-setup.md#redis) |
| **Memory**                  | Per-user condensed memory (S3/Redis/SQLite) | Long-term user context    | [Memory Guide](docs/features/memory.md)                     |
| **Cost Optimization**       | Automatic cheapest model selection          | Budget control            | [Cost Guide](docs/advanced/index.md)                        |
| **Multi-Provider Failover** | Automatic provider switching                | High availability         | [Failover Guide](docs/advanced/index.md)                    |
| **Telemetry & Monitoring**  | OpenTelemetry integration                   | Observability             | [Telemetry Guide](docs/telemetry-guide.md)                  |
| **Security Hardening**      | Credential management, auditing             | Compliance                | [Security Guide](docs/advanced/enterprise.md)               |
| **Custom Model Hosting**    | SageMaker integration                       | Private models            | [SageMaker Guide](docs/sagemaker-integration.md)            |
| **Load Balancing**          | LiteLLM proxy integration                   | Scale & routing           | [Load Balancing](docs/litellm-integration.md)               |

**Security & Compliance:**

- ✅ SOC2 Type II compliant deployments
- ✅ ISO 27001 certified infrastructure compatible
- ✅ GDPR-compliant data handling (EU providers available)
- ✅ HIPAA compatible (with proper configuration)
- ✅ Hardened OS verified (SELinux, AppArmor)
- ✅ Zero credential logging
- ✅ Encrypted configuration storage
- ✅ Automatic context window management with 4-stage compaction pipeline and 80% budget gate

**[📖 Enterprise Deployment Guide](docs/advanced/enterprise.md)** - Complete production checklist

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
const neurolinkExplicit = new NeuroLink({
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

**[Redis Setup Guide](docs/getting-started/redis-quickstart.md)** | **[Production Configuration](docs/guides/redis-configuration.md)** | **[Migration Patterns](docs/guides/redis-migration.md)**

---

### 🎨 Professional CLI

**15+ commands** for every workflow:

| Command          | Purpose                              | Example                    | Documentation                             |
| ---------------- | ------------------------------------ | -------------------------- | ----------------------------------------- |
| `setup`          | Interactive provider configuration   | `neurolink setup`          | [Setup Guide](docs/cli/index.md)          |
| `generate`       | Text generation                      | `neurolink gen "Hello"`    | [Generate](docs/cli/commands.md#generate) |
| `stream`         | Streaming generation                 | `neurolink stream "Story"` | [Stream](docs/cli/commands.md#stream)     |
| `status`         | Provider health check                | `neurolink status`         | [Status](docs/cli/commands.md#status)     |
| `loop`           | Interactive session                  | `neurolink loop`           | [Loop](docs/cli/commands.md#loop)         |
| `mcp`            | MCP server management                | `neurolink mcp discover`   | [MCP CLI](docs/cli/commands.md#mcp)       |
| `models`         | Model listing                        | `neurolink models`         | [Models](docs/cli/commands.md#models)     |
| `eval`           | Model evaluation                     | `neurolink eval`           | [Eval](docs/cli/commands.md#eval)         |
| `serve`          | Start HTTP server in foreground mode | `neurolink serve`          | [Serve](docs/cli/commands.md#serve)       |
| `server start`   | Start HTTP server in background mode | `neurolink server start`   | [Server](docs/cli/commands.md#server)     |
| `server stop`    | Stop running background server       | `neurolink server stop`    | [Server](docs/cli/commands.md#server)     |
| `server status`  | Show server status information       | `neurolink server status`  | [Server](docs/cli/commands.md#server)     |
| `server routes`  | List all registered API routes       | `neurolink server routes`  | [Server](docs/cli/commands.md#server)     |
| `server config`  | View or modify server configuration  | `neurolink server config`  | [Server](docs/cli/commands.md#server)     |
| `server openapi` | Generate OpenAPI specification       | `neurolink server openapi` | [Server](docs/cli/commands.md#server)     |
| `rag chunk`      | Chunk documents for RAG              | `neurolink rag chunk f.md` | [RAG CLI](docs/cli/commands.md#rag)       |

**RAG flags** are available on `generate` and `stream`: `--rag-files`, `--rag-strategy`, `--rag-chunk-size`, `--rag-chunk-overlap`, `--rag-top-k`

**[📖 Complete CLI Reference](docs/cli/commands.md)** - All commands and options

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

| Feature                | Description                                                                               |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| **Multi-Provider**     | 13 providers with unified interface                                                       |
| **PR/Issue Comments**  | Auto-post AI responses with intelligent updates                                           |
| **Multimodal Support** | Attach images, PDFs, CSVs, Excel, Word, JSON, YAML, XML, HTML, SVG, code files to prompts |
| **Cost Tracking**      | Built-in analytics and quality evaluation                                                 |
| **Extended Thinking**  | Deep reasoning with thinking tokens                                                       |

**[📖 GitHub Action Guide](docs/guides/github-action.md)** - Complete setup and examples

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

**[Interactive CLI Guide](docs/features/interactive-cli.md)** | **[CLI Reference](docs/cli/commands.md)**

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

# RAG: Ask questions about your docs (auto-chunks, embeds, searches)
npx @juspay/neurolink generate "What are the key features?" \
  --rag-files ./docs/guide.md ./docs/api.md --rag-strategy markdown
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
      "./report.xlsx", // Auto-detected as Excel
      "./config.json", // Auto-detected as JSON
      "./diagram.svg", // Auto-detected as SVG (injected as text)
      "./app.ts", // Auto-detected as TypeScript code
    ],
  },
  provider: "vertex", // PDF-capable provider (see docs/features/pdf-support.md)
  enableEvaluation: true,
  region: "us-east-1",
});

console.log(result.content);
console.log(result.evaluation?.overallScore);

// RAG: Ask questions about your documents
const answer = await neurolink.generate({
  prompt: "What are the main architectural decisions?",
  rag: {
    files: ["./docs/architecture.md", "./docs/decisions.md"],
    strategy: "markdown",
    topK: 5,
  },
});
console.log(answer.content); // AI searches your docs and answers
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
| **Tool ecosystem**       | MCP auto discovery, HTTP/stdio/SSE/WebSocket transports, LiteLLM hub access, SageMaker custom deployment, web search.    |

## Documentation Map

| Area            | When to Use                                               | Link                                                             |
| --------------- | --------------------------------------------------------- | ---------------------------------------------------------------- |
| Getting started | Install, configure, run first prompt                      | [`docs/getting-started/index.md`](docs/getting-started/index.md) |
| Feature guides  | Understand new functionality front-to-back                | [`docs/features/index.md`](docs/features/index.md)               |
| CLI reference   | Command syntax, flags, loop sessions                      | [`docs/cli/index.md`](docs/cli/index.md)                         |
| SDK reference   | Classes, methods, options                                 | [`docs/sdk/index.md`](docs/sdk/index.md)                         |
| RAG             | Document chunking, hybrid search, reranking, `rag:{}` API | [`docs/features/rag.md`](docs/features/rag.md)                   |
| Integrations    | LiteLLM, SageMaker, MCP, Mem0                             | [`docs/litellm-integration.md`](docs/litellm-integration.md)     |
| Advanced        | Middleware, architecture, streaming patterns              | [`docs/advanced/index.md`](docs/advanced/index.md)               |
| Cookbook        | Practical recipes for common patterns                     | [`docs/cookbook/index.md`](docs/cookbook/index.md)               |
| Guides          | Migration, Redis, troubleshooting, provider selection     | [`docs/guides/index.md`](docs/guides/index.md)                   |
| Operations      | Configuration, troubleshooting, provider matrix           | [`docs/reference/index.md`](docs/reference/index.md)             |

### New in 2026: Enhanced Documentation

**Enterprise Features:**

- [Enterprise HITL Guide](docs/features/enterprise-hitl.md) - Production-ready approval workflows
- [Interactive CLI Guide](docs/features/interactive-cli.md) - AI development environment
- [MCP Tools Showcase](docs/features/mcp-tools-showcase.md) - 58+ external tools & 6 built-in tools

**Provider Intelligence:**

- [Provider Capabilities Audit](docs/reference/provider-capabilities-audit.md) - Technical capabilities matrix
- [Provider Selection Guide](docs/guides/provider-selection.md) - Interactive decision wizard
- [Provider Comparison](docs/reference/provider-comparison.md) - Feature & cost comparison

**Middleware System:**

- [Middleware Architecture](docs/advanced/middleware-architecture.md) - Complete lifecycle & patterns
- [Built-in Middleware](docs/advanced/builtin-middleware.md) - Analytics, Guardrails, Evaluation
- [Custom Middleware Guide](docs/custom-middleware-guide.md) - Build your own

**Redis & Persistence:**

- [Redis Quick Start](docs/getting-started/redis-quickstart.md) - 5-minute setup
- [Redis Configuration](docs/guides/redis-configuration.md) - Production-ready setup
- [Redis Migration](docs/guides/redis-migration.md) - Migration patterns

**Migration Guides:**

- [From LangChain](docs/guides/migration/from-langchain.md) - Complete migration guide
- [From Vercel AI SDK](docs/guides/migration/from-vercel-ai-sdk.md) - Next.js focused

**Developer Experience:**

- [Cookbook](docs/cookbook/index.md) - 10 practical recipes
- [Troubleshooting Guide](docs/guides/troubleshooting.md) - Common issues & solutions

## Integrations

- **LiteLLM 100+ model hub** – Unified access to third-party models via LiteLLM routing. → [`docs/litellm-integration.md`](docs/litellm-integration.md)
- **Amazon SageMaker** – Deploy and call custom endpoints directly from NeuroLink CLI/SDK. → [`docs/sagemaker-integration.md`](docs/sagemaker-integration.md)
- **Mem0 conversational memory** – Persistent semantic memory with vector store support. → [`docs/mem0-integration.md`](docs/mem0-integration.md)
- **Enterprise proxy & security** – Configure outbound policies and compliance posture. → [`docs/enterprise-proxy-setup.md`](docs/enterprise-proxy-setup.md)
- **Configuration automation** – Manage environments, regions, and credentials safely. → [`docs/configuration-management.md`](docs/configuration-management.md)
- **MCP tool ecosystem** – Auto-discover Model Context Protocol tools and extend workflows. → [`docs/advanced/mcp-integration.md`](docs/advanced/mcp-integration.md)
- **Remote MCP via HTTP** – Connect to HTTP-based MCP servers with authentication, retries, and rate limiting. → [`docs/mcp-http-transport.md`](docs/mcp-http-transport.md)

## Contributing & Support

- Bug reports and feature requests → [GitHub Issues](https://github.com/juspay/neurolink/issues)
- Development workflow, testing, and pull request guidelines → [`docs/development/contributing.md`](docs/development/contributing.md)
- Documentation improvements → open a PR referencing the [documentation matrix](docs/tracking/FEATURE-DOC-MATRIX.md).

---

NeuroLink is built with ❤️ by Juspay. Contributions, questions, and production feedback are always welcome.
