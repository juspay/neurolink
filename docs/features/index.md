---
title: Feature Guides
description: In-depth guides for NeuroLink's latest capabilities and platform features
keywords: features, capabilities, guides, tutorials, how-to, q3 2025, q4 2025, q1 2026, image generation, gemini, http transport, mcp, audio input
---

# Feature Guides

Comprehensive guides for all NeuroLink features organized by category. Each guide includes setup, usage patterns, configuration, and troubleshooting.

---

## Latest Features (Q1 2026)

| Feature                                                                                            | Description                                                                                                                                                                                                          |
| -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| :material-tools: **[MCP Enhancements](mcp-enhancements.md)**                                       | Advanced MCP features: ToolRouter for intelligent multi-server routing, ToolCache for result caching, RequestBatcher for efficient batching, tool annotations, elicitation protocol, and custom MCP server creation. |
| :material-presentation: **[PPT Generation](ppt-generation.md)**                                    | Generate professional PowerPoint presentations from text prompts with 35 slide types, 5 themes, and optional AI images.                                                                                              |
| :material-video: **Video Generation** :material-clock-outline:{ .coming-soon title="Coming Soon" } | Generate videos from text prompts using RunwayML (ML5, ML6 Turbo models). _Coming Soon_                                                                                                                              |
| :material-image-plus: **[Image Generation with Gemini](../image-generation-streaming.md)**         | Native image generation using Gemini 2.0 Flash Experimental with imagen-3.0-generate-002 model.                                                                                                                      |
| :material-web: **[HTTP/Streamable HTTP Transport for MCP](../mcp-http-transport.md)**              | Connect to remote MCP servers via HTTP with authentication, rate limiting, retry support, and session management.                                                                                                    |
| :material-microphone: **[Audio Input](audio-input.md)**                                            | Real-time voice conversations with Gemini Live and audio streaming capabilities.                                                                                                                                     |
| :material-server: **[Server Adapters](../guides/server-adapters/index.md)**                        | Expose NeuroLink AI agents as HTTP APIs with Hono, Express, Fastify, and Koa. Production-ready with auth, rate limiting, and streaming.                                                                              |
| :material-database-search: **[RAG Document Processing](rag.md)**                                   | Comprehensive document chunking (10 strategies), hybrid search (BM25 + vector), and reranking (5 types) for retrieval-augmented generation.                                                                          |
| :material-compress-arrows: **[Context Compaction](context-compaction.md)**                         | 4-stage context compaction pipeline with automatic budget management, per-provider token estimation, and non-destructive message tagging.                                                                            |
| :material-brain: **[Memory](memory.md)**                                                           | Per-user condensed memory that persists across conversations. LLM-powered condensation with S3, Redis, or SQLite storage backends.                                                                                   |
| :material-account-key: **[Claude Subscription Support](claude-subscription.md)**                   | Multiple authentication methods for Claude (API key, OAuth) with support for Free, Pro, Max, and API tiers.                                                                                                          |

**Q1 2026 Highlights:**

- **MCP Enhancements**: Advanced MCP features including intelligent tool routing (round-robin, least-loaded, capability-based), result caching with LRU/FIFO/LFU eviction, request batching, tool annotations with safety levels, elicitation protocol for interactive input, MCPServerBase for custom servers, and multi-server management with load balancing
- **PPT Generation**: Create AI-powered PowerPoint presentations with 35 slide types (title, content, charts, timelines, dashboards, composite layouts), 5 built-in themes, optional AI-generated images, and multi-provider support (Vertex, OpenAI, Anthropic, Google AI, Azure, Bedrock)
- **Video Generation** _(Coming Soon)_: Create AI-generated videos with RunwayML integration supporting ML5 and ML6 Turbo models, customizable duration (5-10s), and watermark control
- **Gemini Image Generation**: Native support for Google's imagen-3.0-generate-002 model through Gemini 2.0 Flash Experimental for high-quality image synthesis
- **Remote MCP Servers**: HTTP/Streamable HTTP transport enables connecting to cloud-hosted MCP servers with Bearer token authentication, configurable rate limits, automatic retry with exponential backoff, and session management via `Mcp-Session-Id` header
- **Audio Input**: Real-time voice conversations with Gemini Live API enabling bidirectional audio streaming for interactive voice-based AI experiences
- **Server Adapters**: Deploy NeuroLink as production HTTP APIs with support for Hono (recommended), Express, Fastify, and Koa frameworks. Includes built-in authentication, rate limiting, caching, validation middleware, and SSE streaming support.
- **RAG Document Processing**: Full-featured retrieval-augmented generation with 10 chunking strategies (character, recursive, sentence, token, markdown, html, json, latex, semantic, semantic-markdown), hybrid search combining BM25 and vector similarity, 5 reranking types (simple, LLM, batch, cross-encoder, Cohere), and integration with Pinecone, Weaviate, and Chroma vector stores.
- **Claude Subscription Support**: Flexible authentication supporting API keys and OAuth for Claude Pro/Max subscribers, with model availability tracking and quota management

---

## Core Features (Q4 2025)

| Feature                                                                             | Description                                                                                        |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| :material-image: **[Image Generation](../image-generation-streaming.md)**           | Generate images from text prompts using Gemini models via Vertex AI or Google AI Studio.           |
| :material-security: **[Enterprise HITL](enterprise-hitl.md)**                       | Production-ready HITL with approval workflows, confidence thresholds, and enterprise patterns.     |
| :material-console-line: **[Interactive CLI](interactive-cli.md)**                   | AI development environment with loop mode, session variables, and conversation memory.             |
| :material-tools: **[MCP Tools Showcase](mcp-tools-showcase.md)**                    | Complete guide to 6 built-in tools and 58+ external MCP servers across 6 categories.               |
| :material-hand-pointing-up: **[Human-in-the-Loop (HITL)](hitl.md)**                 | Pause AI tool execution for user approval before risky operations like file deletion or API calls. |
| :material-shield-check: **[Guardrails Middleware](guardrails.md)**                  | Content filtering, PII detection, and safety checks for AI outputs with zero configuration.        |
| :material-database-export: **[Redis Conversation Export](conversation-history.md)** | Export complete session history as JSON for analytics, debugging, and compliance auditing.         |
| :material-brain-circuit: **[Context Compaction](context-compaction.md)**            | Automatic conversation compression for long-running sessions to stay within token limits.          |
| :material-server-network: **[LiteLLM Integration](../litellm-integration.md)**      | Access 100+ AI models from all major providers through unified LiteLLM routing interface.          |
| :material-aws: **[SageMaker Integration](../sagemaker-integration.md)**             | Deploy and use custom trained models on AWS SageMaker infrastructure with full control.            |

---

## Core Features (Q3 2025)

| Feature                                                                        | Description                                                                                      |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| :material-image-text: **[Multimodal Chat Experiences](multimodal-chat.md)**    | Stream text and images together with automatic provider fallbacks and format conversion.         |
| :material-table-large: **[CSV File Support](csv-support.md)**                  | Process CSV files for data analysis with automatic format conversion. Works with all providers.  |
| :material-file-pdf-box: **[PDF File Support](pdf-support.md)**                 | Process PDF documents for visual analysis and content extraction. Native provider support.       |
| :material-file-word: **[Office Documents](office-documents.md)**               | Process DOCX, PPTX, XLSX files for document analysis. Native Bedrock, Vertex, Anthropic support. |
| :material-chart-line: **[Auto Evaluation Engine](auto-evaluation.md)**         | Automated quality scoring and metrics export for AI response validation using LLM-as-judge.      |
| :material-console: **[CLI Loop Sessions](cli-loop-sessions.md)**               | Persistent interactive mode with conversation memory and session state for prompt engineering.   |
| :material-earth: **[Regional Streaming Controls](regional-streaming.md)**      | Region-specific model deployment and routing for compliance and latency optimization.            |
| :material-brain: **[Provider Orchestration Brain](provider-orchestration.md)** | Adaptive provider and model selection with intelligent fallbacks based on task classification.   |

---

## Platform Capabilities at a Glance

| Category                 | Features                                                                                                           | Documentation                                                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Provider unification** | 14+ providers with automatic failover, cost-aware routing, provider orchestration (Q3)                             | [Provider Setup](../getting-started/provider-setup.md)                                                                                   |
| **Multimodal pipeline**  | Stream images + CSV data + PDF documents + Office files across providers with auto-detection for mixed file types. | [Multimodal Guide](multimodal-chat.md), [CSV Support](csv-support.md), [PDF Support](pdf-support.md), [Office Docs](office-documents.md) |
| **Quality & governance** | Auto-evaluation engine (Q3), guardrails middleware (Q4), HITL workflows (Q4), audit logging                        | [Auto Evaluation](auto-evaluation.md), [Guardrails](guardrails.md), [HITL](hitl.md)                                                      |
| **Memory & context**     | Conversation memory, per-user memory, Mem0 integration, Redis history export (Q4), context summarization (Q4)      | [Conversation Memory](../conversation-memory.md), [Memory](memory.md), [Redis Export](conversation-history.md)                           |
| **CLI tooling**          | Loop sessions (Q3), setup wizard, config validation, Redis auto-detect, JSON output                                | [CLI Loop](cli-loop-sessions.md), [CLI Commands](../cli/commands.md)                                                                     |
| **Enterprise ops**       | Proxy support, regional routing (Q3), telemetry hooks, configuration management                                    | [Enterprise Proxy](../enterprise-proxy-setup.md), [Observability](observability.md)                                                      |
| **Tool ecosystem**       | MCP auto discovery, LiteLLM hub access, SageMaker custom deployment, web search                                    | [MCP Integration](../advanced/mcp-integration.md), [MCP Catalog](../guides/mcp/server-catalog.md)                                        |

---

## AI Provider Integration

NeuroLink supports **14+ AI providers** with unified API access:

| Provider              | Key Features                       | Free Tier       | Tool Support | Status        | Documentation                                                                                               |
| --------------------- | ---------------------------------- | --------------- | ------------ | ------------- | ----------------------------------------------------------------------------------------------------------- |
| **OpenAI**            | GPT-4o, GPT-4o-mini, o1 models     | ❌              | ✅ Full      | ✅ Production | [Setup Guide](../getting-started/provider-setup.md#openai)                                                  |
| **Anthropic**         | Claude 4.5/4.0 Sonnet, Opus, Haiku | ❌              | ✅ Full      | ✅ Production | [Setup Guide](../getting-started/provider-setup.md#anthropic), [Subscription Guide](claude-subscription.md) |
| **Google AI**         | Gemini 2.5 Flash/Pro               | ✅ Free Tier    | ✅ Full      | ✅ Production | [Setup Guide](../getting-started/provider-setup.md#google-ai)                                               |
| **AWS Bedrock**       | Claude, Titan, Llama, Nova         | ❌              | ✅ Full      | ✅ Production | [Setup Guide](../getting-started/provider-setup.md#bedrock)                                                 |
| **Google Vertex**     | Gemini via GCP                     | ❌              | ✅ Full      | ✅ Production | [Setup Guide](../getting-started/provider-setup.md#vertex)                                                  |
| **Azure OpenAI**      | GPT-4, GPT-4o, o1                  | ❌              | ✅ Full      | ✅ Production | [Setup Guide](../getting-started/provider-setup.md#azure)                                                   |
| **LiteLLM**           | 100+ models unified                | Varies          | ✅ Full      | ✅ Production | [Integration Guide](../litellm-integration.md)                                                              |
| **AWS SageMaker**     | Custom deployed models             | ❌              | ✅ Full      | ✅ Production | [Integration Guide](../sagemaker-integration.md)                                                            |
| **Mistral AI**        | Mistral Large, Small               | ✅ Free Tier    | ✅ Full      | ✅ Production | [Setup Guide](../getting-started/provider-setup.md#mistral)                                                 |
| **Hugging Face**      | 100,000+ models                    | ✅ Free         | ⚠️ Partial   | ✅ Production | [Setup Guide](../getting-started/provider-setup.md#huggingface)                                             |
| **Ollama**            | Local models                       | ✅ Free (Local) | ⚠️ Partial   | ✅ Production | [Setup Guide](../getting-started/provider-setup.md#ollama)                                                  |
| **OpenAI Compatible** | Any compatible endpoint            | Varies          | ✅ Full      | ✅ Production | [Setup Guide](../getting-started/provider-setup.md#openai-compatible)                                       |
| **OpenRouter**        | 300+ models via unified API        | ✅ Free Tier    | ✅ Full      | ✅ Production | [Setup Guide](../getting-started/provider-setup.md#openrouter)                                              |

**[📖 Provider Comparison Guide](../reference/provider-comparison.md)** - Full feature matrix

---

## Advanced CLI Capabilities

### Interactive Setup Wizard

NeuroLink includes a revolutionary **interactive setup wizard** that guides users through provider configuration in 2-3 minutes:

```bash
# Launch interactive setup wizard
npx @juspay/neurolink setup

# Provider-specific guided setup
npx @juspay/neurolink setup --provider openai
npx @juspay/neurolink setup --provider bedrock
```

**Wizard Features:**

- 🔐 Secure credential collection with validation
- ✅ Real-time authentication testing
- 📝 Automatic `.env` file creation
- 🎯 Recommended model selection
- 📘 Quick-start command examples
- 🔍 Interactive provider discovery

### 15+ CLI Commands

Complete command-line toolkit for every workflow:

| Command          | Description              | Key Features                              |
| ---------------- | ------------------------ | ----------------------------------------- |
| **generate/gen** | Text generation          | Multimodal input, tool support, streaming |
| **stream**       | Real-time streaming      | Live token output, evaluation             |
| **loop**         | Interactive session      | Persistent variables, conversation memory |
| **setup**        | Guided configuration     | Provider wizard, validation               |
| **status**       | Health monitoring        | Provider health, latency checks           |
| **models list**  | Model discovery          | Capability filtering, availability        |
| **config**       | Configuration management | Init, validate, export, reset             |
| **memory**       | Conversation management  | Export, import, stats, clear              |
| **mcp**          | MCP server management    | List, discover, connect, status           |
| **provider**     | Provider operations      | List, test, health dashboard              |
| **ollama**       | Ollama management        | Model download, list, remove              |
| **sagemaker**    | SageMaker operations     | Status, endpoint management               |
| **vertex**       | Vertex AI operations     | Auth status, quota checks                 |
| **completion**   | Shell completion         | Bash and Zsh support                      |
| **validate**     | Config validation        | Environment verification                  |

### Shell Integration

**Bash and Zsh completions** for faster command-line workflows:

```bash
# Install Bash completion
neurolink completion bash >> ~/.bashrc

# Install Zsh completion
neurolink completion zsh >> ~/.zshrc
```

**Learn more:** [Complete CLI Reference](../cli/commands.md)

---

## Built-in Tools & MCP Integration

### 8 Core Built-in Agent Tools

Complete autonomous agent foundation with security and validation:

| Tool                 | Function           | Capabilities                                      | Security   | Status |
| -------------------- | ------------------ | ------------------------------------------------- | ---------- | ------ |
| `getCurrentTime`     | Time access        | Date/time with timezone support                   | Safe       | ✅     |
| `readFile`           | File reading       | Secure file system access with path validation    | Sandboxed  | ✅     |
| `writeFile`          | File writing       | File creation and modification with safety checks | HITL       | ✅     |
| `listFiles`          | Directory listing  | Directory navigation and listing                  | Restricted | ✅     |
| `createDirectory`    | Directory creation | Directory creation with permission checks         | Validated  | ✅     |
| `deleteFile`         | File deletion      | File and directory deletion with confirmation     | HITL       | ✅     |
| `executeCommand`     | Command execution  | System command execution with safety limits       | HITL       | ✅     |
| `websearchGrounding` | Web search         | Google Vertex web search integration              | API-based  | ✅     |

**Tool Management System:**

- ✅ Dynamic tool registration and validation
- ✅ Secure execution with sandboxing
- ✅ Result processing and error recovery
- ✅ Tool discovery and availability tracking

**[📖 Custom Tools Guide](../sdk/custom-tools.md)** - Create your own tools

---

### Model Context Protocol (MCP) - Enterprise-Grade Ecosystem

#### 5 Built-in MCP Servers

NeuroLink includes **5 production-ready MCP servers** for enterprise agent deployment:

| Server           | Purpose                | Tools Provided                          | Status         |
| ---------------- | ---------------------- | --------------------------------------- | -------------- |
| **AI Core**      | Provider orchestration | generate, select-provider, check-status | ✅ Operational |
| **AI Analysis**  | Analytics capabilities | analyze-usage, performance-metrics      | ✅ Operational |
| **AI Workflow**  | Workflow automation    | execute-workflow, batch-process         | ✅ Operational |
| **Direct Tools** | Agent integration      | file-ops, web-search, execute           | ✅ Operational |
| **Utilities**    | General utilities      | time, calculations, formatting          | ✅ Operational |

#### Advanced MCP Infrastructure

| Component                   | Capabilities                              | Status    |
| --------------------------- | ----------------------------------------- | --------- |
| **Tool Registry**           | Tool registration, execution, statistics  | ✅ Active |
| **External Server Manager** | Lifecycle management, health monitoring   | ✅ Active |
| **Tool Discovery Service**  | Automatic tool discovery and registration | ✅ Active |
| **MCP Factory**             | Lighthouse-compatible server creation     | ✅ Active |
| **Flexible Tool Validator** | Universal safety validation               | ✅ Active |
| **Context Manager**         | Rich context with 15+ fields              | ✅ Active |
| **Tool Orchestrator**       | Sequential pipelines, error handling      | ✅ Active |

#### Lighthouse MCP Compatibility

- ✅ **Factory Pattern**: `createMCPServer()` fully compatible with Lighthouse architecture
- ✅ **Transport Mechanisms**: stdio, SSE, WebSocket support (99% compatibility)
- ✅ **Tool Standards**: Full MCP specification compliance
- ✅ **Context Passing**: Rich context with sessionId, userId, permissions (15+ fields)

#### 58+ External MCP Servers

Supported for extended functionality:

**Categories:**

- **Development**: GitHub, GitLab, filesystem access
- **Databases**: PostgreSQL, MySQL, SQLite
- **Cloud Storage**: Google Drive, AWS S3
- **Communication**: Slack, email
- **And many more...**

**Quick Example:**

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

**[📖 MCP Integration Guide](../advanced/mcp-integration.md)** - Setup and usage
**[📖 MCP Server Catalog](../guides/mcp/server-catalog.md)** - Complete server list (58+)

---

## Developer Experience Features

### SDK Features

| Feature                     | Description                    | Documentation                                       |
| --------------------------- | ------------------------------ | --------------------------------------------------- |
| **Auto Provider Selection** | Intelligent provider fallback  | [SDK Guide](../sdk/index.md#auto-selection)         |
| **Streaming Responses**     | Real-time token streaming      | [Streaming Guide](../advanced/streaming.md)         |
| **Conversation Memory**     | Automatic context management   | [Memory Guide](../sdk/index.md#memory)              |
| **Full Type Safety**        | Complete TypeScript types      | [Type Reference](../sdk/api-reference.md)           |
| **Error Handling**          | Graceful provider fallback     | [Error Guide](../reference/troubleshooting.md)      |
| **Analytics & Evaluation**  | Usage tracking, quality scores | [Analytics Guide](../advanced/analytics.md)         |
| **Middleware System**       | Request/response hooks         | [Middleware Guide](../custom-middleware-guide.md)   |
| **Framework Integration**   | Next.js, SvelteKit, Express    | [Framework Guides](../sdk/framework-integration.md) |

---

### CLI Features

| Feature                 | Description                       | Documentation                                   |
| ----------------------- | --------------------------------- | ----------------------------------------------- |
| **Interactive Setup**   | Guided provider configuration     | [Setup Guide](../cli/index.md)                  |
| **Text Generation**     | CLI-based generation              | [Generate Command](../cli/commands.md#generate) |
| **Streaming**           | Real-time streaming output        | [Stream Command](../cli/commands.md#stream)     |
| **Loop Sessions**       | Persistent interactive mode       | [Loop Sessions](cli-loop-sessions.md)           |
| **Provider Management** | Health checks and status          | [CLI Guide](../cli/commands.md)                 |
| **Model Evaluation**    | Automated testing                 | [Eval Command](../cli/commands.md#eval)         |
| **MCP Management**      | Server discovery and installation | [MCP CLI](../cli/commands.md)                   |

**15+ Commands** for every workflow - see [Complete CLI Reference](../cli/commands.md)

---

## Smart Model Selection & Cost Optimization

### Cost Optimization Features

- **💰 Automatic Cost Optimization**: Selects cheapest models for simple tasks
- **🔄 LiteLLM Model Routing**: Access 100+ models with automatic load balancing
- **🔍 Capability-Based Selection**: Find models with specific features (vision, function calling)
- **⚡ Intelligent Fallback**: Seamless switching when providers fail

**CLI Examples:**

```bash
# Cost optimization - automatically use cheapest model
npx @juspay/neurolink generate "Hello" --optimize-cost

# LiteLLM specific model selection
npx @juspay/neurolink generate "Complex analysis" --provider litellm --model "anthropic/claude-3-5-sonnet"

# Auto-select best available provider
npx @juspay/neurolink generate "Write code" # Automatically chooses optimal provider
```

**Learn more:** [Provider Orchestration Guide](provider-orchestration.md)

---

## Interactive Loop Mode

NeuroLink features a powerful **interactive loop mode** that transforms the CLI into a persistent, stateful session.

### Key Capabilities

- Run any CLI command without restarting session
- Persistent session variables: `set provider openai`, `set temperature 0.9`
- Conversation memory: AI remembers previous turns within session
- Redis auto-detection: Automatically connects if `REDIS_URL` is set
- Export session history as JSON for analytics

### Quick Start

```bash
# Start loop with Redis-backed conversation memory
npx @juspay/neurolink loop --enable-conversation-memory --auto-redis

# Start loop without Redis auto-detection
npx @juspay/neurolink loop --enable-conversation-memory --no-auto-redis
```

### Example Session

```bash
# Start the interactive session
$ npx @juspay/neurolink loop

neurolink » set provider google-ai
✓ provider set to google-ai

neurolink » set temperature 0.8
✓ temperature set to 0.8

neurolink » generate "Tell me a fun fact about space"
The quietest place on Earth is an anechoic chamber at Microsoft's headquarters...

# Exit the session
neurolink » exit
```

**[📖 Complete Loop Guide](cli-loop-sessions.md)** - Full documentation with all commands

---

## Enterprise & Production Features

### Production Capabilities

| Feature                      | Description                         | Use Case                     | Documentation                                                     |
| ---------------------------- | ----------------------------------- | ---------------------------- | ----------------------------------------------------------------- |
| **Enterprise Proxy**         | Corporate proxy support             | Behind firewalls             | [Proxy Setup](../enterprise-proxy-setup.md)                       |
| **Redis Memory**             | Distributed conversation state      | Multi-instance deployment    | [Redis Guide](../getting-started/provider-setup.md#redis)         |
| **Cost Optimization**        | Automatic cheapest model selection  | Budget control               | [Cost Guide](../guides/enterprise/cost-optimization.md)           |
| **Multi-Provider Failover**  | Automatic provider switching        | High availability            | [Failover Guide](../guides/enterprise/multi-provider-failover.md) |
| **Telemetry & Monitoring**   | OpenTelemetry integration           | Observability                | [Observability Guide](observability.md)                           |
| **Security Hardening**       | Credential management, auditing     | Compliance                   | [Security Guide](../guides/enterprise/compliance.md)              |
| **Custom Model Hosting**     | SageMaker integration               | Private models               | [SageMaker Guide](../sagemaker-integration.md)                    |
| **Load Balancing**           | LiteLLM proxy integration           | Scale & routing              | [Load Balancing Guide](../guides/enterprise/load-balancing.md)    |
| **Audit Trails**             | Comprehensive logging               | Compliance                   | [Audit Guide](../guides/enterprise/audit-trails.md)               |
| **Configuration Management** | Environment & credential management | Multi-environment deployment | [Config Guide](../configuration-management.md)                    |

### Advanced Security Features

#### Human-in-the-Loop (HITL) Policy Engine

Enterprise-grade approval system for sensitive operations:

```typescript
// HITL Policy Configuration
type HITLPolicy = {
  requireApprovalFor: string[]; // Tool-specific policies
  autoApprove: string[]; // Safe operation whitelist
  alwaysDeny: string[]; // Blacklist operations
  timeoutBehavior: "deny" | "approve"; // Timeout handling
};
```

**HITL Capabilities:**

- ✅ User consent for dangerous operations
- ✅ Configurable policy engine
- ✅ Comprehensive audit trail logging
- ✅ Timeout handling
- ✅ Bulk approval for batch operations

#### Advanced Proxy Support

Corporate network compatibility:

| Proxy Type           | Support | Features                             |
| -------------------- | ------- | ------------------------------------ |
| **AWS Proxy**        | ✅ Full | AWS-specific proxy configuration     |
| **HTTP/HTTPS Proxy** | ✅ Full | Universal proxy across all providers |
| **No-Proxy Bypass**  | ✅ Full | Bypass configuration and utilities   |

#### Enhanced Guardrails

AI-powered content security:

- ✅ **Content Filtering**: Automatic content screening
- ✅ **Toxicity Detection**: Toxic content filtering
- ✅ **PII Redaction**: Privacy protection and PII detection
- ✅ **Custom Rules**: Configurable policy rules
- ✅ **Security Reporting**: Detailed security event reporting

### Security & Compliance Certifications

- ✅ SOC2 Type II compliant deployments
- ✅ ISO 27001 certified infrastructure compatible
- ✅ GDPR-compliant data handling (EU providers available)
- ✅ HIPAA compatible (with proper configuration)
- ✅ Hardened OS verified (SELinux, AppArmor)
- ✅ Zero credential logging
- ✅ Encrypted configuration storage

**[📖 Enterprise Deployment Guide](../guides/enterprise/multi-provider-failover.md)** - Complete production patterns

---

## Middleware & Extension System

### Advanced Middleware Architecture

Pluggable request/response processing for custom workflows:

#### Built-in Middleware

| Middleware          | Purpose                     | Features                                            | Status    |
| ------------------- | --------------------------- | --------------------------------------------------- | --------- |
| **Analytics**       | Usage tracking & monitoring | Token counting, timing, performance metrics         | ✅ Active |
| **Guardrails**      | Content security            | Content policies, toxicity detection, PII filtering | ✅ Active |
| **Auto Evaluation** | Quality scoring             | LLM-as-judge, accuracy metrics, safety validation   | ✅ Active |

#### Middleware System Capabilities

```typescript
// Middleware Configuration
type MiddlewareFactoryOptions = {
  middleware?: NeuroLinkMiddleware[]; // Custom middleware registration
  enabledMiddleware?: string[]; // Selective activation
  disabledMiddleware?: string[]; // Selective deactivation
  middlewareConfig?: Record<string, MiddlewareConfig>; // Per-middleware configuration
  preset?: string; // Preset configurations
  global?: {
    // Global settings
    maxExecutionTime?: number;
    continueOnError?: boolean;
  };
};
```

**Middleware Features:**

- ✅ Dynamic middleware registration
- ✅ Pipeline execution with performance tracking
- ✅ Runtime configuration changes
- ✅ Error handling and graceful recovery
- ✅ Priority-based execution order
- ✅ Detailed execution statistics

**[📖 Custom Middleware Guide](../custom-middleware-guide.md)** - Build your own middleware

---

## Performance & Optimization

### Intelligent Cost Optimization

- **💰 Model Resolver**: Cost optimization algorithms and intelligent routing
- **⚡ Performance Routing**: Speed-optimized provider selection
- **🔄 Concurrent Initialization**: Reduced latency through parallel loading
- **💾 Caching Strategies**: Intelligent response and configuration caching

### Advanced SageMaker Features

Beyond basic integration - enterprise-grade custom model deployment:

| Feature                      | Description                                          | Status         |
| ---------------------------- | ---------------------------------------------------- | -------------- |
| **Adaptive Semaphore**       | Dynamic concurrency control for optimal throughput   | ✅ Implemented |
| **Structured Output Parser** | Complex response parsing and validation              | ✅ Implemented |
| **Capability Detection**     | Automatic endpoint capability discovery              | ✅ Implemented |
| **Batch Inference**          | Efficient batch processing for high-volume workloads | ✅ Implemented |
| **Diagnostics System**       | Real-time endpoint monitoring and debugging          | ✅ Implemented |

### Error Handling & Resilience

Production-grade fault tolerance:

- ✅ **MCP Circuit Breaker**: Fault tolerance with state management
- ✅ **Error Hierarchies**: Comprehensive error types for HITL, providers, and MCP
- ✅ **Graceful Degradation**: Intelligent fallback strategies
- ✅ **Retry Logic**: Configurable retry with exponential backoff

**[📖 Performance Optimization Guide](../performance-optimization.md)** - Complete optimization strategies

---

## Advanced Integrations

| Integration                                                                    | Description                                                                             |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| :material-server-network: **[LiteLLM Integration](../litellm-integration.md)** | Access 100+ models from all major providers via LiteLLM routing with unified interface. |
| :material-aws: **[SageMaker Integration](../sagemaker-integration.md)**        | Deploy and call custom endpoints directly from NeuroLink CLI/SDK with full control.     |
| :material-brain-circuit: **[Mem0 Integration](../mem0-integration.md)**        | Persistent semantic memory with vector store support for long-term conversations.       |
| :material-brain: **[Memory](memory.md)**                                       | Per-user condensed memory with S3/Redis/SQLite storage and LLM-powered condensation.    |
| :material-shield-lock: **[Enterprise Proxy](../enterprise-proxy-setup.md)**    | Configure outbound policies and compliance posture for corporate environments.          |
| :material-cog: **[Configuration Management](../configuration-management.md)**  | Manage environments, regions, and credentials safely across deployments.                |

---

## Advanced Features

| Feature                                                                                   | Description                                                                        |
| ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| :material-factory: **[Factory Pattern Architecture](../factory-pattern-architecture.md)** | Unified provider interface with automatic fallbacks and type-safe implementations. |
| :material-database-cog: **[Conversation Memory](../conversation-memory.md)**              | Deep dive into memory management, Redis integration, and Mem0 support.             |
| :material-middleware: **[Custom Middleware](../custom-middleware-guide.md)**              | Build request/response hooks for logging, filtering, and custom processing.        |
| :material-speedometer: **[Performance Optimization](../performance-optimization.md)**     | Caching, connection pooling, and latency optimization strategies.                  |
| :material-chart-timeline: **[Telemetry & Observability](observability.md)**               | OpenTelemetry integration for distributed tracing and monitoring.                  |
| :material-test-tube: **[Testing Guide](../testing.md)**                                   | Provider-agnostic testing, mocking, and quality assurance strategies.              |
| :material-chart-box: **[Analytics & Evaluation](../advanced/analytics.md)**               | Usage tracking, cost monitoring, and quality scoring for AI responses.             |
| :material-flash: **[Streaming](../advanced/streaming.md)**                                | Real-time token streaming with provider-specific optimizations.                    |
| :material-head-cog: **[Thinking Configuration](thinking-configuration.md)**               | Configure extended thinking levels for supported models (Anthropic, Gemini 2.5+).  |
| :material-code-json: **[Structured Output](structured-output.md)**                        | JSON schema-based structured output with provider-specific formatting.             |
| :material-text-to-speech: **[Text-to-Speech (TTS)](tts.md)**                              | Basic TTS support via Google Cloud TTS (Neural2, Wavenet, Standard voices).        |

---

## See Also

- **[Getting Started](../getting-started/index.md)** - Quick start and installation
- **[CLI Reference](../cli/commands.md)** - Command-line interface documentation
- **[SDK Reference](../sdk/api-reference.md)** - TypeScript API documentation
- **[Enterprise Guides](../guides/enterprise/multi-provider-failover.md)** - Production deployment patterns
- **[Tutorials](../tutorials/index.md)** - Step-by-step implementation guides
- **[Examples](../examples/index.md)** - Real-world code samples
