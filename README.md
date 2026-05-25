# NeuroLink

**The pipe layer for the AI nervous system.**

AI intelligence flows as streams — tokens, tool calls, memory, voice, documents.
NeuroLink is the vascular layer that carries these streams from where they are
generated (LLM providers: the neurons) to where they are needed (connectors: the organs).

```typescript
import { NeuroLink } from "@juspay/neurolink";

const pipe = new NeuroLink();

// Everything is a stream
const result = await pipe.stream({ input: { text: "Hello" } });
for await (const chunk of result.stream) {
  if ("content" in chunk) {
    process.stdout.write(chunk.content);
  }
}
```

**[→ Docs](https://docs.neurolink.ink) · [→ Quick Start](https://docs.neurolink.ink/docs/getting-started/quick-start) · [→ npm](https://www.npmjs.com/package/@juspay/neurolink)**

---

## 🧠 What is NeuroLink?

**NeuroLink is the universal AI integration platform that unifies 21+ AI providers and 100+ models under one consistent API.**

Extracted from production systems at Juspay and battle-tested at enterprise scale, NeuroLink provides a production-ready solution for integrating AI into any application. Whether you're building with OpenAI, Anthropic, Google, AWS Bedrock, Azure, or any of our 21+ supported providers, NeuroLink gives you a single, consistent interface that works everywhere.

**Why NeuroLink?** Switch providers with a single parameter change, leverage 64+ built-in tools and MCP servers, deploy with confidence using enterprise features like Redis memory and multi-provider failover, and optimize costs automatically with intelligent routing. Use it via our professional CLI or TypeScript SDK—whichever fits your workflow.

**Where we're headed:** We're building for the future of AI—edge-first execution and continuous streaming architectures that make AI practically free and universally available. **[Read our vision →](docs/about/vision.md)**

**[Get Started in <5 Minutes →](docs/getting-started/quick-start.md)**

---

## What's New (Q1 2026)

| Feature                                      | Version | Description                                                                                                                                                                                                                                                                                                                                                                   | Guide                                                                                                                                   |
| -------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Avatar / Music Modalities + 12 Providers** | next    | New `output: { mode: "avatar" \| "music" }` dispatch with handlers for D-ID, HeyGen, Replicate-MuseTalk (avatar) and Beatoven, ElevenLabs Music, Lyria, Replicate-MusicGen (music). Plus Fish Audio TTS, Kling/Runway/Replicate video, xAI/Groq/Cohere/Together/Fireworks/Perplexity/Cloudflare LLMs, Voyage/Jina embeddings, Stability/Ideogram/Recraft/Replicate image-gen. | [Provider Integration](docs/provider-integration/)                                                                                      |
| **Multi-Provider Voice (TTS/STT)**           | v9.62.0 | 6 TTS providers (OpenAI TTS, ElevenLabs, Google TTS, Azure TTS, Fish Audio, Cartesia) + 4 STT providers (Whisper, Deepgram, Azure STT, Google STT) + 2 realtime APIs (OpenAI Realtime, Gemini Live).                                                                                                                                                                          | [TTS Guide](docs/features/tts.md) \| [STT Guide](docs/features/audio-input.md) \| [Realtime Guide](docs/features/real-time-services.md) |
| **4 New Providers**                          | v9.60.0 | DeepSeek (V3/R1), NVIDIA NIM (400+ catalog), LM Studio (local), llama.cpp (GGUF local).                                                                                                                                                                                                                                                                                       | [Provider Setup](docs/getting-started/provider-setup.md)                                                                                |
| **ModelAccessDeniedError**                   | v9.59.0 | Typed `ModelAccessDeniedError` + `sdk.checkCredentials()` API for proactive credential validation before first call.                                                                                                                                                                                                                                                          | [Error Reference](docs/reference/troubleshooting.md)                                                                                    |
| **Provider Fallback Policy**                 | v9.58.0 | `providerFallback` callback + `modelChain` config for centralized multi-provider fallback logic.                                                                                                                                                                                                                                                                              | [Advanced Guide](docs/advanced/index.md)                                                                                                |
| **Per-Request Credentials**                  | v9.52.0 | Pass credentials per-call or per-instance for all providers. Per-call overrides instance; instance overrides env vars.                                                                                                                                                                                                                                                        | [Credentials Guide](docs/features/per-request-credentials.md)                                                                           |
| **AutoResearch**                             | v9.53.0 | Autonomous AI experiment engine: proposes code changes, runs experiments, evaluates metrics — unattended for hours.                                                                                                                                                                                                                                                           | [AutoResearch Guide](docs/features/autoresearch.md)                                                                                     |
| **Gemini 3 Multi-turn Tool Fix**             | v9.49.0 | Fixed multi-step agentic tool calling on Vertex AI Gemini 3. Correct `thoughtSignature` replay, `stepIndex` grouping, `executionId` session isolation, 5-min timeout.                                                                                                                                                                                                         | [Vertex AI Guide](docs/getting-started/providers/google-vertex.md)                                                                      |
| **MCP Enhancements**                         | v9.16.0 | Tool routing (6 strategies), result caching (LRU/FIFO/LFU), request batching, annotations, elicitation protocol, multi-server management.                                                                                                                                                                                                                                     | [MCP Enhancements Guide](docs/features/mcp-enhancements.md)                                                                             |
| **Memory**                                   | v9.12.0 | Per-user condensed memory across conversations. LLM-powered condensation with S3, Redis, or SQLite.                                                                                                                                                                                                                                                                           | [Memory Guide](docs/features/memory.md)                                                                                                 |
| **Context Window Management**                | v9.2.0  | 4-stage compaction pipeline with budget gate at 80% usage, per-provider token estimation.                                                                                                                                                                                                                                                                                     | [Context Compaction Guide](docs/features/context-compaction.md)                                                                         |
| **Tool Execution Control**                   | v9.3.0  | `prepareStep` and `toolChoice` for per-step tool enforcement in multi-step agentic loops.                                                                                                                                                                                                                                                                                     | [API Reference](docs/api/type-aliases/GenerateOptions.md#preparestep)                                                                   |
| **File Processor System**                    | v9.1.0  | 17+ file type processors with ProcessorRegistry, security sanitization, SVG text injection.                                                                                                                                                                                                                                                                                   | [File Processors Guide](docs/features/file-processors.md)                                                                               |
| **RAG with generate()/stream()**             | v9.2.0  | Pass `rag: { files }` for automatic document chunking, embedding, and AI-powered search. 10 chunking strategies, hybrid search, reranking.                                                                                                                                                                                                                                    | [RAG Guide](docs/features/rag.md)                                                                                                       |

```typescript
// Multi-Provider Voice (v9.62.0) — TTS + STT
// Voice is configured via the `tts` / `stt` options on generate() / stream(),
// not via dedicated synthesizeSpeech / transcribeAudio methods.

// Text in, audio out (TTS)
const result = await neurolink.generate({
  input: { text: "Hello from NeuroLink" },
  provider: "vertex",
  tts: {
    enabled: true,
    voice: "en-US-Neural2-C",
    format: "mp3",
    output: "./output.mp3", // optional: save to disk
    provider: "elevenlabs", // optional override: openai-tts | elevenlabs | google-ai | vertex | azure-tts | fish-audio | cartesia
  },
});
// result.audio: { buffer: Buffer, format: "mp3", ... }

// Audio in (STT), text out
const transcript = await neurolink.generate({
  input: { text: "Transcribe and summarize" },
  provider: "openai",
  stt: {
    enabled: true,
    audio: audioBuffer, // Buffer of the audio file
    provider: "whisper", // whisper | deepgram | google-stt | azure-stt
    language: "en-US",
  },
});

// Real-time bidirectional voice (OpenAI Realtime / Gemini Live)
import { RealtimeProcessor } from "@juspay/neurolink";

await RealtimeProcessor.connect(
  "openai-realtime",
  { provider: "openai-realtime", model: "gpt-4o-realtime-preview" },
  { onAudio, onTranscript, onError, onFunctionCall },
);

// AutoResearch — autonomous experiment loop (v9.53.0)
import { resolveConfig, ResearchWorker } from "@juspay/neurolink/autoresearch";

const config = resolveConfig({
  repoPath: "/path/to/repo",
  mutablePaths: ["train.py"],
  runCommand: "python3 train.py",
  metric: {
    name: "val_bpb",
    direction: "lower",
    pattern: "^val_bpb:\\s+([\\d.]+)",
  },
});
const worker = new ResearchWorker(config);
await worker.initialize("experiment-1");
const result = await worker.runExperimentCycle("Try lower learning rate");

// Provider Fallback Policy (v9.58.0) — fires only on ModelAccessDeniedError
import { NeuroLink, ModelAccessDeniedError } from "@juspay/neurolink";

const neurolink = new NeuroLink({
  // Async callback. Single error arg. Return null to give up,
  // or { provider?, model? } to retry with a substitute.
  providerFallback: async (error) => {
    if (
      error instanceof ModelAccessDeniedError &&
      error.allowedModels?.length
    ) {
      return { model: error.allowedModels[0] };
    }
    return null;
  },
  // Sugar over providerFallback: if no callback is set, NeuroLink walks this list
  // on each access denial. modelChain is `string[]` only (model names; same provider).
  modelChain: ["claude-opus-4-7", "claude-sonnet-4-6", "gpt-4o"],
});
```

---

<details>
<summary><strong>Previous Updates (Q3–Q4 2025)</strong></summary>

- **Sharp image compression** (v9.50.0) – Automatic image compression for AI providers via the sharp library; reduces upload bandwidth and bypasses provider size limits.
- **Redis URL/TLS** (v9.49.0) – Redis URL-based connections with TLS support for secure conversation memory in production.
- **TaskManager** (v9.41.0) – Scheduled and self-running AI tasks; cron-style execution with state checkpointing.
- **Multi-user memory retrieval** (v9.40.0) – Per-user memory storage and retrieval with customizable prompts.
- **Evaluation Scoring (14 scorers)** (v9.37.0) – Modular evaluation system with 14 scorers, pipelines, and CLI for offline quality assessment.
- **Browser-compatible bundle** (v9.34.0) – Client-side SDK bundle for browser use; no Node.js dependency for the core API.
- **Per-call memory control** (v9.33.0) – Read/write memory control per `generate()` and `stream()` call.
- **Server Adapters** (v8.43.0) – HTTP server with Hono, Express, Fastify, Koa. Foreground/background modes, route management, OpenAPI generation. → [Guide](docs/guides/server-adapters/index.md)
- **External TracerProvider** (v8.43.0) – Integrate NeuroLink with existing OpenTelemetry setups. → [Guide](docs/features/observability.md)
- **Title Generation Events** (v8.38.0) – `conversation:titleGenerated` event + `NEUROLINK_TITLE_PROMPT` custom titles. → [Guide](docs/conversation-memory.md)
- **Video Generation with Veo** (v8.32.0) – Video generation via Google Veo 3.1 on Vertex AI. 720p/1080p, portrait/landscape. → [Guide](docs/features/video-generation.md)
- **Image Generation** (v8.31.0) – Native image generation with Gemini and Imagen models. → [Guide](docs/image-generation-streaming.md)
- **HTTP/Streamable HTTP Transport** (v8.29.0) – Remote MCP servers via HTTP with auth headers, retry, rate limiting. → [Guide](docs/mcp-http-transport.md)
- **PPT Generation** – 35 slide types, 5 themes, optional AI-generated images. Works across all major providers. → [Guide](docs/features/ppt-generation.md)
- **Structured Output with Zod** – Type-safe JSON via `schema` + `output.format: "json"`. → [Guide](docs/features/structured-output.md)
- **CSV & PDF File Support** – Attach CSV/PDF with auto-detection. PDF: native visual analysis on Vertex, Anthropic, Bedrock, AI Studio. → [CSV](docs/features/multimodal-chat.md#csv-file-support) | [PDF](docs/features/pdf-support.md)
- **LiteLLM, SageMaker & OpenRouter** – 100+ models via LiteLLM, custom endpoints on SageMaker, 300+ via OpenRouter. → [LiteLLM](docs/litellm-integration.md) | [SageMaker](docs/sagemaker-integration.md)
- **HITL & Guardrails** – Human-in-the-loop approval workflows and content filtering. → [HITL](docs/features/hitl.md) | [Guardrails](docs/features/guardrails.md)
- **Redis Conversation Export** – Export full session history as JSON for analytics and audit. → [Guide](docs/features/conversation-history.md)

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

## 📚 Quick Start Guide

This guide will have you generating AI responses in under 5 minutes using either the SDK or CLI.

### Installation

Choose your preferred package manager:

```bash
# npm
npm install @juspay/neurolink

# pnpm (recommended)
pnpm add @juspay/neurolink

# yarn
yarn add @juspay/neurolink

# CLI only (no installation needed)
npx @juspay/neurolink --help
```

### Configuration

NeuroLink works with 21+ AI providers. You'll need at least one API key to get started:

**Option 1: Interactive Setup (Recommended)**

```bash
# Run the setup wizard to configure providers
pnpm dlx @juspay/neurolink setup
```

The wizard will guide you through:

- Selecting your preferred AI providers
- Validating API keys
- Setting up configuration files

**Option 2: Manual Configuration**

Create a `.env` file in your project root:

```bash
# Choose one or more providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=...
```

**Free Tier Options:**

- **Google AI Studio**: Get a free API key at [aistudio.google.com](https://aistudio.google.com)
- **Mistral AI**: Free tier available at [console.mistral.ai](https://console.mistral.ai)
- **Ollama**: 100% free local models (requires [Ollama installation](https://ollama.ai))

### Your First API Call (SDK)

**Basic Text Generation:**

```typescript
import { NeuroLink } from "@juspay/neurolink";

// Initialize (auto-selects best available provider from your .env)
const neurolink = new NeuroLink();

// Generate a response
const result = await neurolink.generate({
  input: { text: "Explain quantum computing in simple terms" },
});

console.log(result.content);
```

**Streaming Responses:**

```typescript
// Stream tokens in real-time
const stream = await neurolink.stream({
  input: { text: "Write a haiku about code" },
});
for await (const chunk of stream.stream) {
  if ("content" in chunk) process.stdout.write(chunk.content);
}
```

**Multimodal Input (Images + Text):**

```typescript
const result = await neurolink.generate({
  input: {
    text: "What's in this image?",
    images: ["./photo.jpg"],
  },
});
```

**Using Tools:**

```typescript
// Built-in tools are automatically available
const result = await neurolink.generate({
  input: {
    text: "What time is it and what files are in the current directory?",
  },
  // AI can call getCurrentTime and listDirectory tools
});
```

### Your First API Call (CLI)

**Basic Generation:**

```bash
# Simple text generation
npx @juspay/neurolink generate "Explain TypeScript generics"

# Specify provider and model
npx @juspay/neurolink generate "Hello!" --provider openai --model gpt-4o

# Stream responses
npx @juspay/neurolink stream "Write a story about AI" --provider anthropic
```

**Multimodal Input:**

```bash
# Analyze images
npx @juspay/neurolink generate "Describe this image" --image photo.jpg

# Process PDFs
npx @juspay/neurolink generate "Summarize this document" --pdf report.pdf

# Combine multiple file types
npx @juspay/neurolink generate "Analyze this data" --file data.xlsx --file config.json
```

**Interactive Loop Mode:**

```bash
# Start an interactive session with persistent context
npx @juspay/neurolink loop

# Inside loop mode:
> set provider anthropic
> set model claude-opus-4
> generate "Hello, Claude!"
> history  # View conversation history
> exit
```

### Common Use Cases

**RAG (Retrieval-Augmented Generation):**

```typescript
// Automatically chunk, embed, and search documents
const result = await neurolink.generate({
  input: { text: "What are the key features mentioned in the documentation?" },
  rag: {
    files: ["./docs/guide.md", "./docs/api.md"],
    chunkSize: 512,
    topK: 5,
  },
});
```

**Structured Output with Zod:**

```typescript
import { z } from "zod";

const schema = z.object({
  name: z.string(),
  age: z.number(),
  email: z.string().email(),
});

const result = await neurolink.generate({
  input: {
    text: "Extract user info: John Doe, 30 years old, john@example.com",
  },
  schema,
  output: { format: "json" },
});

// Parse the structured JSON from result.content
const parsed = schema.parse(JSON.parse(result.content));
console.log(parsed); // { name: "John Doe", age: 30, email: "john@example.com" }
```

**External MCP Servers (GitHub, Slack, etc.):**

```typescript
// Connect to GitHub MCP server
await neurolink.addExternalMCPServer("github", {
  command: "npx",
  args: ["-y", "@modelcontextprotocol/server-github"],
  transport: "stdio",
  env: { GITHUB_TOKEN: process.env.GITHUB_TOKEN },
});

// AI can now interact with GitHub
const result = await neurolink.generate({
  input: { text: 'Create an issue titled "Bug: login fails"' },
});
```

### Next Steps

- **[Complete Documentation](https://docs.neurolink.ink)** - Comprehensive guides and API reference
- **[Provider Setup Guide](docs/getting-started/provider-setup.md)** - Configure all 33+ providers
- **[SDK API Reference](docs/sdk/api-reference.md)** - Full TypeScript API documentation
- **[CLI Command Reference](docs/cli/commands.md)** - Complete CLI documentation
- **[Example Projects](docs/examples/index.md)** - Real-world integration examples
- **[Advanced Features](docs/advanced/index.md)** - Middleware, observability, workflows

### Troubleshooting

**Issue: "Provider not configured"**

- Run `npx @juspay/neurolink setup` or add provider API key to `.env`

**Issue: Rate limit errors**

- Configure multiple providers for redundancy — NeuroLink auto-selects the best available
- Use `provider: "litellm"` with LiteLLM to proxy across many providers

**Issue: Large context overflows**

- Enable conversation memory with compaction: `new NeuroLink({ conversationMemory: { enabled: true } })`
- Use `rag` option to search documents instead of sending full content

Need help? Check our [Troubleshooting Guide](docs/reference/troubleshooting.md) or [open an issue](https://github.com/juspay/neurolink/issues).

---

## 🌟 Complete Feature Set

NeuroLink is a comprehensive AI development platform. Every feature below is production-ready and fully documented.

### 🤖 AI Provider Integration

**33+ providers unified under one API** - Switch providers with a single parameter change.

| Provider              | Models                                                                     | Free Tier       | Tool Support | Status        | Documentation                                                                                                                 |
| --------------------- | -------------------------------------------------------------------------- | --------------- | ------------ | ------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **OpenAI**            | GPT-4o, GPT-4o-mini, o1                                                    | ❌              | ✅ Full      | ✅ Production | [Setup Guide](docs/getting-started/provider-setup.md#openai)                                                                  |
| **Anthropic**         | Claude 4.6 Opus/Sonnet, Claude 4.5 Opus/Sonnet/Haiku, Claude 4 Opus/Sonnet | ❌              | ✅ Full      | ✅ Production | [Setup Guide](docs/getting-started/provider-setup.md#anthropic) \| [Subscription Guide](docs/features/claude-subscription.md) |
| **Google AI Studio**  | Gemini 3 Flash/Pro, Gemini 2.5 Flash/Pro                                   | ✅ Free Tier    | ✅ Full      | ✅ Production | [Setup Guide](docs/getting-started/provider-setup.md#google-ai)                                                               |
| **AWS Bedrock**       | Claude, Titan, Llama, Nova                                                 | ❌              | ✅ Full      | ✅ Production | [Setup Guide](docs/getting-started/provider-setup.md#bedrock)                                                                 |
| **Google Vertex**     | Gemini 3/2.5 (gemini-3-\*-preview)                                         | ❌              | ✅ Full      | ✅ Production | [Setup Guide](docs/getting-started/provider-setup.md#vertex)                                                                  |
| **Azure OpenAI**      | GPT-4, GPT-4o, o1                                                          | ❌              | ✅ Full      | ✅ Production | [Setup Guide](docs/getting-started/provider-setup.md#azure)                                                                   |
| **LiteLLM**           | 100+ models unified                                                        | Varies          | ✅ Full      | ✅ Production | [Setup Guide](docs/litellm-integration.md)                                                                                    |
| **AWS SageMaker**     | Custom deployed models                                                     | ❌              | ✅ Full      | ✅ Production | [Setup Guide](docs/sagemaker-integration.md)                                                                                  |
| **Mistral AI**        | Mistral Large, Small                                                       | ✅ Free Tier    | ✅ Full      | ✅ Production | [Setup Guide](docs/getting-started/provider-setup.md#mistral)                                                                 |
| **Hugging Face**      | 100,000+ models                                                            | ✅ Free         | ⚠️ Partial   | ✅ Production | [Setup Guide](docs/getting-started/provider-setup.md#huggingface)                                                             |
| **Ollama**            | Local models (Llama, Mistral)                                              | ✅ Free (Local) | ⚠️ Partial   | ✅ Production | [Setup Guide](docs/getting-started/provider-setup.md#ollama)                                                                  |
| **OpenAI Compatible** | Any OpenAI-compatible endpoint                                             | Varies          | ✅ Full      | ✅ Production | [Setup Guide](docs/getting-started/provider-setup.md#openai-compatible)                                                       |
| **OpenRouter**        | 200+ Models via OpenRouter                                                 | Varies          | ✅ Full      | ✅ Production | [Setup Guide](docs/getting-started/providers/openrouter.md)                                                                   |
| **DeepSeek**          | deepseek-chat (V3), deepseek-reasoner (R1)                                 | ❌              | ✅ Full      | ✅ Production | [Setup Guide](docs/getting-started/provider-setup.md#deepseek)                                                                |
| **NVIDIA NIM**        | Llama 3.3 70B, 400+ catalog models                                         | ❌              | ✅ Full      | ✅ Production | [Setup Guide](docs/getting-started/provider-setup.md#nvidia-nim)                                                              |
| **LM Studio**         | Any model loaded in LM Studio (local)                                      | ✅ Free (Local) | ✅ Full      | ✅ Production | [Setup Guide](docs/getting-started/provider-setup.md#lm-studio)                                                               |
| **llama.cpp**         | Any GGUF model served by llama-server (local)                              | ✅ Free (Local) | ✅ Full      | ✅ Production | [Setup Guide](docs/getting-started/provider-setup.md#llamacpp)                                                                |
| **OpenAI TTS**        | TTS-1, TTS-1-HD, GPT-4o Audio                                              | ❌              | N/A          | ✅ Production | [Setup Guide](docs/getting-started/provider-setup.md#openai-tts)                                                              |
| **ElevenLabs**        | Multilingual v2, Turbo v2.5, Flash v2.5                                    | ✅ Free Tier    | N/A          | ✅ Production | [Setup Guide](docs/getting-started/provider-setup.md#elevenlabs)                                                              |
| **Deepgram**          | Nova-3, Nova-2, Enhanced, Base (STT)                                       | ✅ Free Tier    | N/A          | ✅ Production | [Setup Guide](docs/getting-started/provider-setup.md#deepgram)                                                                |
| **Azure Speech**      | Azure Cognitive Services TTS + STT                                         | ❌              | N/A          | ✅ Production | [Setup Guide](docs/getting-started/provider-setup.md#azure-speech)                                                            |

**[📖 Provider Comparison Guide](docs/reference/provider-comparison.md)** - Detailed feature matrix and selection criteria
**[🔬 Provider Feature Compatibility](docs/reference/provider-feature-compatibility.md)** - Test-based compatibility reference for all 19 features across 21+ providers

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
- **Provider-agnostic** - All processors work across all 21+ AI providers

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
    enableSummarization: true,
  },
});

// Or explicit Redis configuration
const neurolinkExplicit = new NeuroLink({
  conversationMemory: {
    enabled: true,
    redisConfig: {
      host: "redis.example.com",
      port: 6379,
      password: process.env.REDIS_PASSWORD,
      ttl: 86400, // 24-hour session expiration (seconds)
    },
  },
});

// Retrieve conversation history for analytics
const history = await neurolink.getConversationHistory("session-id");
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

Run AI-powered workflows directly in GitHub Actions with 21+ provider support and automatic PR/issue commenting.

```yaml
- uses: juspay/neurolink@v1
  with:
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
    prompt: "Review this PR for security issues and code quality"
    post_comment: true
```

| Feature                | Description                                                                               |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| **Multi-Provider**     | 21+ providers with unified interface                                                      |
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
npx @juspay/neurolink generate "Complex analysis" --provider litellm --model "anthropic/claude-sonnet-4-6"

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

# Claude proxy + local OpenObserve dashboard
npx @juspay/neurolink proxy setup
npx @juspay/neurolink proxy telemetry setup
npx @juspay/neurolink proxy status --format json
```

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink({
  conversationMemory: {
    enabled: true,
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
  input: { text: "What are the main architectural decisions?" },
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
  thinkingConfig: {
    thinkingLevel: "medium", // Options: "minimal", "low", "medium", "high"
  },
});

console.log(result.content);
```

Full command and API breakdown lives in [`docs/cli/commands.md`](docs/cli/commands.md) and [`docs/sdk/api-reference.md`](docs/sdk/api-reference.md).

## Platform Capabilities at a Glance

| Capability               | Highlights                                                                                                                                           |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Provider unification** | 21+ providers with automatic fallback, cost-aware routing, `providerFallback` policy, `modelChain` config.                                           |
| **Multimodal pipeline**  | Stream images + CSV data + PDF documents across providers with local/remote assets. Auto-detection for mixed file types.                             |
| **Voice pipeline**       | TTS (6 providers: Google, OpenAI, ElevenLabs, Azure, Fish Audio, Cartesia) + STT (4 providers) + realtime voice APIs (OpenAI Realtime, Gemini Live). |
| **Quality & governance** | Auto-evaluation engine (14 scorers), guardrails middleware, HITL workflows, audit logging.                                                           |
| **Memory & context**     | Per-user condensed memory (S3/Redis/SQLite), Redis session export, 4-stage context compaction.                                                       |
| **CLI tooling**          | Loop sessions, setup wizard, config validation, Redis auto-detect, JSON output, TTS/STT flags.                                                       |
| **Enterprise ops**       | Claude proxy, OTLP observability, OpenObserve dashboard, regional routing, credential management.                                                    |
| **Tool ecosystem**       | MCP auto discovery, HTTP/stdio/SSE/WebSocket transports, LiteLLM hub access, SageMaker custom deployment, web search.                                |

## Documentation Map

| Area            | When to Use                                               | Link                                                             |
| --------------- | --------------------------------------------------------- | ---------------------------------------------------------------- |
| Getting started | Install, configure, run first prompt                      | [`docs/getting-started/index.md`](docs/getting-started/index.md) |
| Feature guides  | Understand new functionality front-to-back                | [`docs/features/index.md`](docs/features/index.md)               |
| CLI reference   | Command syntax, flags, loop sessions                      | [`docs/cli/index.md`](docs/cli/index.md)                         |
| SDK reference   | Classes, methods, options                                 | [`docs/sdk/index.md`](docs/sdk/index.md)                         |
| RAG             | Document chunking, hybrid search, reranking, `rag:{}` API | [`docs/features/rag.md`](docs/features/rag.md)                   |
| Integrations    | LiteLLM, SageMaker, MCP                                   | [`docs/litellm-integration.md`](docs/litellm-integration.md)     |
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
- **Enterprise proxy & security** – Configure outbound policies and compliance posture. → [`docs/enterprise-proxy-setup.md`](docs/enterprise-proxy-setup.md)
- **Configuration automation** – Manage environments, regions, and credentials safely. → [`docs/configuration-management.md`](docs/configuration-management.md)
- **MCP tool ecosystem** – Auto-discover Model Context Protocol tools and extend workflows. → [`docs/advanced/mcp-integration.md`](docs/advanced/mcp-integration.md)
- **Remote MCP via HTTP** – Connect to HTTP-based MCP servers with authentication, retries, and rate limiting. → [`docs/mcp-http-transport.md`](docs/mcp-http-transport.md)

## Contributing & Support

- Bug reports and feature requests → [GitHub Issues](https://github.com/juspay/neurolink/issues)
- Questions and discussions → [GitHub Discussions](https://github.com/juspay/neurolink/discussions)
- Development workflow, testing, and pull request guidelines → [`docs/development/contributing.md`](docs/development/contributing.md)
- Documentation improvements → open a PR referencing the [documentation matrix](docs/tracking/FEATURE-DOC-MATRIX.md).

---

NeuroLink is built with ❤️ by Juspay. Contributions, questions, and production feedback are always welcome.
