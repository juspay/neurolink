# NeuroLink

[![npm version](https://img.shields.io/npm/v/@juspay/neurolink?label=npm&color=blue)](https://www.npmjs.com/package/@juspay/neurolink)
[![npm downloads](https://img.shields.io/npm/dm/@juspay/neurolink?label=downloads)](https://www.npmjs.com/package/@juspay/neurolink)
[![GitHub Stars](https://img.shields.io/github/stars/juspay/neurolink?style=flat)](https://github.com/juspay/neurolink/stargazers)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/juspay/neurolink/ci.yml?label=CI)](https://github.com/juspay/neurolink/actions/workflows/ci.yml)

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

// Or skip text entirely: a calibrated decision, not a token stream
const decision = await pipe.tryDecide({
  // null if no decision provider is set
  state: { ticket: "Refund request, $42, first occurrence" },
  questions: {
    autoApprove: {
      type: "boolean",
      instructions: "Approve without human review.",
    },
  },
});
// decision?.answers.autoApprove.probability -> 0.91
```

**[→ Docs](https://docs.neurolink.ink) · [→ Quick Start](https://docs.neurolink.ink/docs/getting-started/quick-start) · [→ npm](https://www.npmjs.com/package/@juspay/neurolink) · [→ Blog](https://blog.neurolink.ink)**

---

## 🧠 What is NeuroLink?

**NeuroLink is the pipe layer of an AI nervous system.** Providers — OpenAI, Anthropic, Google, AWS, Azure, Mistral, local runtimes like Ollama, and dozens more — are the neurons: each generates a different kind of intelligence, at a different cost and latency. NeuroLink is the vascular layer that carries that intelligence, as a stream, to the applications — the organs — that consume it, across three inference types: `generate` and `stream` produce text, `decide` produces a calibrated `boolean`/`choice`/`score` judgment instead. A curated model registry (64 models, 132 aliases) backs metadata, routing, and context-window checks out of the box, and hundreds more models are reachable through aggregator providers — 100+ via LiteLLM, 300+ via OpenRouter.

Extracted from production systems at Juspay, NeuroLink provides a practical, TypeScript-first way to plug any application into that nervous system. Switch which neuron answers a request with a single parameter change — OpenAI, Anthropic, Google, AWS Bedrock, Azure, a local runtime, or any provider you add. `decide` is the third inference type — a typed, calibrated judgment instead of text — for the model-routing and gating decisions `generate`/`stream` were never meant to make, powered by a purpose-built decision model (TypeSafe Jev) rather than a general-purpose LLM: routing decisions land in ~400ms for about $0.00002, instead of a full generation call.

**Why NeuroLink?** Three genuine inference types, not one dressed up three ways — `generate` and `stream` produce text; `decide` produces a calibrated `boolean`/`choice`/`score` judgment, and which types a provider serves is declared per-provider via `inferenceKinds` rather than inferred from behavior. Every neuron plugs into the same pipe, including 3 fully local runtimes (Ollama, LM Studio, llama.cpp) with per-request credential overrides, and MCP support covers all 4 transports (stdio, HTTP, SSE, WebSocket). Every AI-driven optimization the pipe performs — model routing, context compaction, tool selection — fails open: no key configured behaves exactly like NeuroLink without it, and routing uses asymmetric confidence thresholds (upgrade at 0.3, downgrade at 0.6) rather than a single cutoff, because a wrong downgrade costs more than a wrong upgrade. Switch providers with a single parameter change, leverage built-in tools plus any MCP-compliant tool server, deploy with confidence using enterprise features like Redis memory and multi-provider failover, and optimize costs automatically with intelligent routing. Use it via our professional CLI or TypeScript SDK—whichever fits your workflow.

**Where we're headed:** We're building for the future of AI—edge-first execution and continuous streaming architectures that make AI practically free and universally available. **[Read our vision →](docs/about/vision.md)**

**[Get Started in <5 Minutes →](docs/getting-started/quick-start.md)**

---

## What's New

| Feature                                                 | Version           | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Guide                                                                                                                                   |
| ------------------------------------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **`decide` Inference Type + TypeSafe Jev**              | next              | A third inference type alongside `generate`/`stream`: typed, calibrated judgments (`boolean`, `choice`, `score`) via `neurolink.decide()` / `tryDecide()`, one parallel pass, ~400ms and ~$0.00002/decision. First provider is TypeSafe Jev (`TYPESAFE_API_KEY`, also reachable via the Vercel AI Gateway). Used internally for model routing, context budgeting, relevance compaction and tool routing — fail-open and a no-op without a key. Per-query RAG planning is opt-in via `RAGPipeline`. | [Decide Guide](docs/features/decide-inference-type.md)                                                                                  |
| **7 More Catalog Providers**                            | v12.11.0–v12.16.0 | Baseten, GMI Cloud, Inception Labs, io.net Intelligence, Mancer, Upstage and API Route onboarded as Tier-2 catalog entries — one JSON file each, roster live-verified against the provider's own `/v1/models`.                                                                                                                                                                                                                                                                                     | [Tier 2 Onboarding](docs/provider-integration/tiers/tier-2-catalog-entry.md)                                                            |
| **Claude-on-Vertex Proxy Fallback**                     | v12.18.0          | The Anthropic proxy pool can fall back to Claude served on Google Vertex, so an agentic turn survives losing its primary backend mid-conversation instead of failing the turn.                                                                                                                                                                                                                                                                                                                     | [Claude Proxy](docs/features/claude-proxy.md)                                                                                           |
| **Native-Loop V3 Conversation Reclaim**                 | v12.17.0          | Reclaims V3 conversations without splitting tool-call/tool-result pairs — the pairing a provider rejects the whole request over.                                                                                                                                                                                                                                                                                                                                                                   | [Claude Proxy Architecture](docs/features/claude-proxy-architecture.md)                                                                 |
| **Multi-Modal Embeddings**                              | v12.15.0          | `embed()` / `embedMany()` accept images alongside text on providers whose embedding models are multi-modal, for cross-modal retrieval in RAG and custom vector search.                                                                                                                                                                                                                                                                                                                             | [Embeddings Guide](docs/features/embeddings.md)                                                                                         |
| **Grok Build Auto-Configuration**                       | v12.14.0          | The proxy configures Grok Build automatically, deriving context windows and backends from the model catalog rather than hardcoded values.                                                                                                                                                                                                                                                                                                                                                          | [Proxy CLI Onboarding](docs/features/proxy-cli-onboarding.md)                                                                           |
| **Anthropic Execution-Control Contract**                | v12.13.0          | Truthful stream termination plus an opt-in execution-control contract, so a stream that stopped early reports why instead of looking like a clean finish.                                                                                                                                                                                                                                                                                                                                          | [Claude Proxy](docs/features/claude-proxy.md)                                                                                           |
| **Catalog Tool Declarations Honoured at Runtime**       | v12.12.0          | A Tier-2 catalog entry declaring `tools: false` (e.g. Mancer) no longer has tools offered to it at runtime — the JSON declaration is enforced, not just documented.                                                                                                                                                                                                                                                                                                                                | [Tier 2 Onboarding](docs/provider-integration/tiers/tier-2-catalog-entry.md)                                                            |
| **Artifact Stores: Redis, Custom, Range Reads, Search** | v12.10.0          | Artifacts can be backed by Redis or a custom store, read by byte range, and searched — instead of being held only in process memory.                                                                                                                                                                                                                                                                                                                                                               | [Claude Proxy](docs/features/claude-proxy.md)                                                                                           |
| **Local CLI Spend Reading**                             | v12.6.0–v12.9.0   | Reads token usage directly from other coding CLIs' own local stores — Cursor, Grok Build, Hermes Agent and three more — and names them in proxy traffic, so spend is attributed per client.                                                                                                                                                                                                                                                                                                        | [Proxy CLI Onboarding](docs/features/proxy-cli-onboarding.md)                                                                           |
| **Native OpenAI Audio Streaming**                       | v12.7.0           | OpenAI TTS audio streams natively rather than being buffered to completion first.                                                                                                                                                                                                                                                                                                                                                                                                                  | [TTS Guide](docs/features/tts.md)                                                                                                       |
| **HITL Pending-Confirmation State**                     | v12.5.0           | Exposes whether a human-in-the-loop confirmation is still outstanding, so a caller can distinguish 'waiting on a human' from 'finished'.                                                                                                                                                                                                                                                                                                                                                           | [Task Manager](docs/features/task-manager.md)                                                                                           |
| **OpenCode + Gemini CLI Proxy Clients**                 | v12.4.0           | OpenCode's generated config is actually loadable, and Gemini CLI is onboarded as a proxy client.                                                                                                                                                                                                                                                                                                                                                                                                   | [OpenCode Proxy](docs/features/opencode-proxy-support.md) \| [Proxy CLI Onboarding](docs/features/proxy-cli-onboarding.md)              |
| **SambaNova Provider**                                  | v12.3.0           | RDU-accelerated open-weight flagships: Llama 3.3 70B (default), GPT-OSS 120B, DeepSeek V3.x, MiniMax, Gemma 4 (vision) — OpenAI-compatible Tier 2 catalog entry. Note: new SambaNova accounts require purchased credits.                                                                                                                                                                                                                                                                           | [SambaNova Guide](docs/getting-started/providers/sambanova.md)                                                                          |
| **Cerebras Provider**                                   | v12.1.0           | Wafer-scale inference at ~3000 tok/s: GPT-OSS 120B (default) + Gemma 4 31B, OpenAI-compatible Tier 2 catalog entry, live-verified end to end (generate, stream, tools, structured output).                                                                                                                                                                                                                                                                                                         | [Cerebras Guide](docs/getting-started/providers/cerebras.md)                                                                            |
| **Avatar / Music Modalities + 12 Providers**            | v9.65.0           | New `output: { mode: "avatar" \| "music" }` dispatch with handlers for D-ID, HeyGen, Replicate-MuseTalk (avatar) and Beatoven, ElevenLabs Music, Lyria, Replicate-MusicGen (music). Plus Fish Audio TTS, Kling/Runway/Replicate video, xAI/Groq/Cohere/Together/Fireworks/Perplexity/Cloudflare LLMs, Voyage/Jina embeddings, Stability/Ideogram/Recraft/Replicate image-gen.                                                                                                                      | [Provider Integration](docs/provider-integration/)                                                                                      |
| **Multi-Provider Voice (TTS/STT)**                      | v9.62.0           | 6 TTS providers (OpenAI TTS, ElevenLabs, Google TTS, Azure TTS, Fish Audio, Cartesia) + 4 STT providers (Whisper, Deepgram, Azure STT, Google STT) + 2 realtime APIs (OpenAI Realtime, Gemini Live).                                                                                                                                                                                                                                                                                               | [TTS Guide](docs/features/tts.md) \| [STT Guide](docs/features/audio-input.md) \| [Realtime Guide](docs/features/real-time-services.md) |
| **4 New Providers**                                     | v9.60.0           | DeepSeek (V3/R1), NVIDIA NIM (400+ catalog), LM Studio (local), llama.cpp (GGUF local).                                                                                                                                                                                                                                                                                                                                                                                                            | [Provider Setup](docs/getting-started/provider-setup.md)                                                                                |
| **ModelAccessDeniedError**                              | v9.59.0           | Typed `ModelAccessDeniedError` + `sdk.checkCredentials()` API for proactive credential validation before first call.                                                                                                                                                                                                                                                                                                                                                                               | [Error Reference](docs/reference/troubleshooting.md)                                                                                    |
| **Provider Fallback Policy**                            | v9.58.0           | `providerFallback` callback + `modelChain` config for centralized multi-provider fallback logic.                                                                                                                                                                                                                                                                                                                                                                                                   | [Advanced Guide](docs/advanced/index.md)                                                                                                |
| **Per-Request Credentials**                             | v9.52.0           | Pass credentials per-call or per-instance for all providers. Per-call overrides instance; instance overrides env vars.                                                                                                                                                                                                                                                                                                                                                                             | [Credentials Guide](docs/features/per-request-credentials.md)                                                                           |
| **AutoResearch**                                        | v9.53.0           | Autonomous AI experiment engine: proposes code changes, runs experiments, evaluates metrics — unattended for hours.                                                                                                                                                                                                                                                                                                                                                                                | [AutoResearch Guide](docs/features/autoresearch.md)                                                                                     |
| **Gemini 3 Multi-turn Tool Fix**                        | v9.49.0           | Fixed multi-step agentic tool calling on Vertex AI Gemini 3. Correct `thoughtSignature` replay, `stepIndex` grouping, `executionId` session isolation, 5-min timeout.                                                                                                                                                                                                                                                                                                                              | [Vertex AI Guide](docs/getting-started/providers/google-vertex.md)                                                                      |
| **MCP Enhancements**                                    | v9.16.0           | Tool routing (6 strategies), result caching (LRU/FIFO/LFU), request batching, annotations, elicitation protocol, multi-server management.                                                                                                                                                                                                                                                                                                                                                          | [MCP Enhancements Guide](docs/features/mcp-enhancements.md)                                                                             |
| **Memory**                                              | v9.12.0           | Per-user condensed memory across conversations. LLM-powered condensation with S3, Redis, or SQLite.                                                                                                                                                                                                                                                                                                                                                                                                | [Memory Guide](docs/features/memory.md)                                                                                                 |
| **Context Window Management**                           | v9.2.0            | 5-stage compaction pipeline with budget gate at 80% usage, per-provider token estimation.                                                                                                                                                                                                                                                                                                                                                                                                          | [Context Compaction Guide](docs/features/context-compaction.md)                                                                         |
| **Tool Execution Control**                              | v9.3.0            | `prepareStep` and `toolChoice` for per-step tool enforcement in multi-step agentic loops.                                                                                                                                                                                                                                                                                                                                                                                                          | [API Reference](docs/api/type-aliases/GenerateOptions.md#preparestep)                                                                   |
| **File Processor System**                               | v9.1.0            | 17+ file type processors with ProcessorRegistry, security sanitization, SVG text injection.                                                                                                                                                                                                                                                                                                                                                                                                        | [File Processors Guide](docs/features/file-processors.md)                                                                               |
| **RAG with generate()/stream()**                        | v9.2.0            | Pass `rag: { files }` for automatic document chunking, embedding, and AI-powered search. 10 chunking strategies, hybrid search, reranking, and a choice of 4 vector stores (in-memory, Chroma, PgVector, Pinecone).                                                                                                                                                                                                                                                                                | [RAG Guide](docs/features/rag.md)                                                                                                       |

```typescript
// decide() — a third inference type: calibrated judgments, not text (next)
// Enable with TYPESAFE_API_KEY (or AI_GATEWAY_API_KEY via Vercel AI Gateway).
import { NeuroLink, readDecisionChoice } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.tryDecide({
  // null if no decision provider is configured
  state: ticketText,
  questions: {
    team: {
      type: "choice",
      instructions: "Which team should handle this?",
      criteria: { billing: "Payments", technical: "Bugs", sales: "Pricing" },
    },
    urgent: { type: "boolean", instructions: "Is this urgent?" },
  },
});
const team = result && readDecisionChoice(result.answers, "team");
if (team && team.confidence > 0.7) {
  route(team.choice); // "billing" | "technical" | "sales", plus a full ranking
}

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
<summary><strong>Previous Updates</strong></summary>

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

## Decide: Calibrated Judgments, Not Text

**NeuroLink now supports decision models — a third inference type, and the first
provider for it ships today.**

`decide` sits alongside `generate` and `stream`. Instead of tokens, a decision
model takes one `state` plus a map of named typed questions and returns one
typed, **calibrated** answer per question, all in a single parallel pass — no
text output anywhere, so nothing has to be parsed back out of prose.

Public API: `neurolink.decide()` and the fail-open `neurolink.tryDecide()`
(returns `null` instead of throwing). This is a **TypeScript SDK surface** —
there is no `neurolink decide` CLI command today.

| Primitive | Answer shape                                                                           | Use it for                                                          |
| --------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `boolean` | A probability, 0–1 (no confidence of its own — gate on distance from 0.5)              | Yes/no gates: approve, drop, include, flag                          |
| `choice`  | An option + the full probability distribution + a confidence                           | Routing to one of N options — the distribution also **ranks** all N |
| `score`   | A probability-weighted index into an ordered rubric + a confidence, **and a `legend`** | Position on a scale: severity, priority, quality tier               |

A `score` is probability-weighted, so it can land **between** rubric levels —
useful for sorting a queue, not just bucketing it.

### What you can build with it

The model is fast, cheap and calibrated, but ~68% accurate (see the trade-off
below). That combination fits work that is **batched, gated and reversible** —
where a wrong answer is caught by a threshold or a human, not shipped to a user.

| Use case                           | Primitive                        | Why it fits                                                                  |
| ---------------------------------- | -------------------------------- | ---------------------------------------------------------------------------- |
| **Ticket / helpdesk triage**       | `choice` team + `score` priority | `ranked` gives a fallback team order; a human still sees the ticket          |
| **Content moderation, first pass** | one `boolean` per item           | Only a confident "yes" auto-hides; everything else escalates                 |
| **Lead or severity queues**        | `score` over an ordered rubric   | The between-levels score sorts a queue rather than bucketing it              |
| **Shortlisting & reranking**       | one `choice` over N candidates   | One request ranks the whole catalogue — SKUs, canned replies, search results |
| **Your own model-tier gate**       | `boolean` or `choice`            | Decide cheap-vs-capable per message before you call a text model             |
| **Spam / fraud pre-screen**        | `boolean` with asymmetric bars   | A high bar to auto-reject, a lower one to flag for review                    |

**Do not use it for** a final answer a user reads, an irreversible action with no
confirmation step, or anything needing a rationale — a decision carries a
probability, never an explanation. Those belong to `generate`.

### Enabling it

Set `TYPESAFE_API_KEY` — that one env var is the whole switch.
[TypeSafe Jev](https://console.typesafe.ai/keys) is the first decision provider
(`AIProviderName.TYPESAFE`, aliases `jev` / `typesafe-ai`). It is also reachable
through the **Vercel AI Gateway** via `AI_GATEWAY_API_KEY`; force one transport
with `TYPESAFE_TRANSPORT=direct|gateway`. Per-request credentials work as they do
for every other provider.

```typescript
import {
  NeuroLink,
  readDecisionChoice,
  gateDecisionBoolean,
} from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.tryDecide({
  state: { ticket: "Customer reports a failed $42 payment, first occurrence." },
  questions: {
    team: {
      type: "choice",
      instructions: "Which team should handle this?",
      criteria: { billing: "Payments", technical: "Bugs", sales: "Pricing" },
    },
    autoRefund: {
      type: "boolean",
      instructions: "Approve the refund without human review.",
    },
  },
});

const team = result && readDecisionChoice(result.answers, "team");
if (team && team.confidence > 0.7) {
  route(team.choice); // team.ranked is the full ordering, not just the winner
}

// A boolean has no confidence of its own, so gate on BOTH the probability and
// its distance from a coin flip. `undefined` means "not sure" — not "no".
const refund = result && gateDecisionBoolean(result.answers, "autoRefund");
if (refund === true) autoRefund();
else queueForHuman();
```

### Where NeuroLink uses it itself

**Five `decide()` calls across the codebase**, each fail-open and a no-op
without a key — so nothing changes in its absence:

| #   | Call site                         | What it asks                                                                                                              | Guide                                                                                                                                                                    |
| --- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `routing/classifierStrategies.ts` | Difficulty, required capabilities, risk, how much context is needed, **and** which model to pick — all in **one** request | [routing](docs/features/classifier-router-jev-strategy.md) · [catalogue](docs/features/classifier-router-catalog.md) · [context budget](docs/features/context-budget.md) |
| 2   | `context/contextDecision.ts`      | One yes/no per earlier message: is this still needed for the current request?                                             | [relevance compaction](docs/features/relevance-compaction.md)                                                                                                            |
| 3   | `context/contextDecision.ts`      | Does this generated summary preserve every decision and open question?                                                    | [relevance compaction](docs/features/relevance-compaction.md)                                                                                                            |
| 4   | `core/toolRoutingDecision.ts`     | One yes/no per MCP server: does the request need it? Drops only on a confident "no"                                       | [tool routing](docs/features/tool-routing-decision-model.md)                                                                                                             |
| 5   | `rag/retrieval/searchDecision.ts` | Per query: `topK` breadth, and whether to use hybrid / graph / rerank                                                     | [RAG planning](docs/features/rag-retrieval-planning.md)                                                                                                                  |

Worth being precise about two of these, because the grouping is easy to
misread:

- **Call 1 is a single request that does the work of three features.** Model
  routing, the registry-derived catalogue and the per-request
  `compactionThreshold` all read different answers out of the _same_ call —
  the context budget is not a second round trip, and `modelCatalog.ts` never
  calls `decide()` at all; it renders the candidate lines that call 1's model
  question chooses between. That is the batch-never-fan-out rule applied to
  NeuroLink's own code.
- **Call 5 is opt-in wiring, not automatic.** Per-query planning lives in
  `RAGPipeline`, which the `rag: { files }` shortcut on `generate()`/`stream()`
  does not construct. Build a `RAGPipeline` yourself and pass a decide function
  to get it; the shortcut path is unchanged.

Every one goes through the same `decide()` / `tryDecide()` core, so each gets
telemetry **even on failure** — a dedicated `model.decision` span, never folded
into generation metrics. That matters because a decision path that has silently
stopped working (rate-limited, timed out, provider down) would otherwise look
identical to one that was never configured; the span is what tells the two
apart.

### What it costs, and its limits

Measured against the live API — don't extrapolate past these:

- Latency is flat in question count: 1 question ~393ms, 400 questions ~465ms. Concurrent requests **queue**, so batch every question into one call — never fan out.
- ~$0.042 per million input tokens, output reported but billed at zero — about **$0.00002 per decision**.
- Two input ceilings: `state` + the longest single question ≈ 33,000 tokens; `state` + all questions ≈ 64,000 tokens.
- **Accuracy is the trade-off**: ~68% on TypeSafe's own 711-case benchmark vs. ~73% for a frontier model (TypeSafe's published figures, not our measurement). Use it for decisions that are **gated and reversible** — routing, dropping, budgeting — never for a final answer a user will see.

**[Decide Guide](docs/features/decide-inference-type.md)** · **[TypeSafe Provider Guide](docs/getting-started/providers/typesafe.md)**

## Enterprise Security: Human-in-the-Loop (HITL)

NeuroLink includes a **HITL (Human-in-the-Loop) system** for regulated industries and high-stakes AI operations:

| Capability                  | Description                                                             | Use Case                                   |
| --------------------------- | ----------------------------------------------------------------------- | ------------------------------------------ |
| **Tool Approval Workflows** | Require human approval before AI executes sensitive tools               | Financial transactions, data modifications |
| **Output Validation**       | Route AI outputs through human review pipelines                         | Medical diagnosis, legal documents         |
| **Confidence Thresholds**   | Automatically trigger human review below confidence level               | Critical business decisions                |
| **Complete Audit Trail**    | Audit logging to support your compliance program (HIPAA / SOC 2 / GDPR) | Regulated industries                       |

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

NeuroLink works with every major AI provider — and local runtimes that need no API key at all. You'll need at least one to get started:

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
- **[Provider Setup Guide](docs/getting-started/provider-setup.md)** - Configure any provider
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

NeuroLink is a comprehensive AI development platform. Every feature below is shipped and documented.

### 🤖 AI Provider Integration

**Every provider neuron behind one API** - Switch providers with a single parameter change. Nearly all serve `generate`/`stream`; TypeSafe Jev alone serves `decide`. Tool support: 29 native tool-calling, 3 model-dependent, 8 that serve no tools at all (embedding-, media- and decision-only). 3 are fully local runtimes (Ollama, LM Studio, llama.cpp) and 4 need zero configuration to start (those three plus LiteLLM) — no cloud account, no API key. 9 providers (OpenAI, Google AI Studio, Google Vertex, Amazon Bedrock, Cohere, Ollama, LiteLLM, Voyage, Jina) expose `embed()`/`embedMany()` natively for RAG and custom vector search.

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
| **OpenRouter**        | 300+ models via OpenRouter                                                 | Varies          | ✅ Full      | ✅ Production | [Setup Guide](docs/getting-started/providers/openrouter.md)                                                                   |
| **DeepSeek**          | deepseek-chat (V3), deepseek-reasoner (R1)                                 | ❌              | ✅ Full      | ✅ Production | [Setup Guide](docs/getting-started/provider-setup.md#deepseek)                                                                |
| **NVIDIA NIM**        | Llama 3.3 70B, 400+ catalog models                                         | ❌              | ✅ Full      | ✅ Production | [Setup Guide](docs/getting-started/provider-setup.md#nvidia-nim)                                                              |
| **LM Studio**         | Any model loaded in LM Studio (local)                                      | ✅ Free (Local) | ✅ Full      | ✅ Production | [Setup Guide](docs/getting-started/provider-setup.md#lm-studio)                                                               |
| **llama.cpp**         | Any GGUF model served by llama-server (local)                              | ✅ Free (Local) | ✅ Full      | ✅ Production | [Setup Guide](docs/getting-started/provider-setup.md#llamacpp)                                                                |
| **OpenAI TTS**        | TTS-1, TTS-1-HD, GPT-4o Audio                                              | ❌              | N/A          | ✅ Production | [Setup Guide](docs/getting-started/provider-setup.md#openai-tts)                                                              |
| **ElevenLabs**        | Multilingual v2, Turbo v2.5, Flash v2.5                                    | ✅ Free Tier    | N/A          | ✅ Production | [Setup Guide](docs/getting-started/provider-setup.md#elevenlabs)                                                              |
| **Deepgram**          | Nova-3, Nova-2, Enhanced, Base (STT)                                       | ✅ Free Tier    | N/A          | ✅ Production | [Setup Guide](docs/getting-started/provider-setup.md#deepgram)                                                                |
| **Azure Speech**      | Azure Cognitive Services TTS + STT                                         | ❌              | N/A          | ✅ Production | [Setup Guide](docs/getting-started/provider-setup.md#azure-speech)                                                            |

**The other 23 providers**, each with its own setup guide:

**Hosted inference (OpenAI-wire compatible)** — [Groq](docs/getting-started/providers/groq.md) — default `openai/gpt-oss-120b` (`GROQ_API_KEY`) · [Cerebras](docs/getting-started/providers/cerebras.md) — default `gpt-oss-120b` (`CEREBRAS_API_KEY`) · [SambaNova](docs/getting-started/providers/sambanova.md) — default `Meta-Llama-3.3-70B-Instruct` (`SAMBANOVA_API_KEY`) · [Together AI](docs/getting-started/providers/together-ai.md) — default `meta-llama/Llama-3.3-70B-Instruct-Turbo` (`TOGETHER_API_KEY`) · [Fireworks AI](docs/getting-started/providers/fireworks.md) — default `accounts/fireworks/models/kimi-k2p6` (`FIREWORKS_API_KEY`) · [Perplexity](docs/getting-started/providers/perplexity.md) — default `sonar` (`PERPLEXITY_API_KEY`) · [Cloudflare Workers AI](docs/getting-started/providers/cloudflare.md) — default `@cf/meta/llama-3.3-70b-instruct-fp8-fast` (`CLOUDFLARE_API_KEY`) · [xAI Grok](docs/getting-started/providers/xai.md) — default `grok-4.6` (`XAI_API_KEY`) · [API Route](docs/getting-started/providers/api-route.md) — default `claude-sonnet-4-6` (`API_ROUTE_API_KEY`) · [Baseten](docs/getting-started/providers/baseten.md) — default `zai-org/GLM-5.3-Flash` (`BASETEN_API_KEY`) · [GMI Cloud](docs/getting-started/providers/gmicloud.md) — default `MiniMaxAI/MiniMax-M3` (`GMICLOUD_API_KEY`) · [Inception Labs](docs/getting-started/providers/inception-labs.md) — default `mercury-2` (`INCEPTION_LABS_API_KEY`) · [io.net Intelligence](docs/getting-started/providers/io-intelligence.md) — default `meta-llama/Llama-3.3-70B-Instruct` (`IO_INTELLIGENCE_API_KEY`) · [Mancer](docs/getting-started/providers/mancer.md) — default `deepseek-v4-flash`; **no tool calling** (`MANCER_API_KEY`) · [Upstage](docs/getting-started/providers/upstage.md) — default `solar-pro4` (`UPSTAGE_API_KEY`)

**Embeddings & reranking** — [Cohere](docs/getting-started/providers/cohere.md) (`COHERE_API_KEY`) · [Voyage AI](docs/getting-started/providers/voyage.md) (`VOYAGE_API_KEY`) · [Jina AI](docs/getting-started/providers/jina.md) (`JINA_API_KEY`)

**Media generation** — [Replicate](docs/getting-started/providers/replicate.md) (`REPLICATE_API_TOKEN`) · [Stability AI](docs/getting-started/providers/stability.md) (`STABILITY_API_KEY`) · [Ideogram](docs/getting-started/providers/ideogram.md) (`IDEOGRAM_API_KEY`) · [Recraft](docs/getting-started/providers/recraft.md) (`RECRAFT_API_KEY`)

**Decision** — [TypeSafe Jev](docs/getting-started/providers/typesafe.md) (`TYPESAFE_API_KEY`, or `AI_GATEWAY_API_KEY` via the Vercel AI Gateway) — the only provider serving `decide` rather than `generate`/`stream`.

**Decision-only provider:** **TypeSafe Jev** (`TYPESAFE_API_KEY`) does not appear in the table above because it does not serve `generate`/`stream` — it is the first provider for the `decide` inference type. See [Decide: Calibrated Judgments, Not Text](#decide-calibrated-judgments-not-text).

**[📖 Provider Comparison Guide](docs/reference/provider-comparison.md)** - Detailed feature matrix and selection criteria
**[🔬 Provider Feature Compatibility](docs/reference/provider-feature-compatibility.md)** - Test-based compatibility reference for all 19 features across every provider

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

**External MCP servers** — connect any MCP-compliant server via `neurolink mcp add`; 9 popular servers (GitHub, PostgreSQL, SQLite, Filesystem, Git, Brave Search, Puppeteer, Memory, Bitbucket) ship with ready-made configs:

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

| Category      | Supported Types                                                                        | Processing                                                          |
| ------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| **Documents** | Excel (`.xlsx`, `.xls`), Word (`.docx`), PowerPoint (`.pptx`), RTF, OpenDocument       | Sheet extraction, text extraction, slide + speaker-notes extraction |
| **Data**      | JSON, YAML, XML                                                                        | Validation, syntax highlighting                                     |
| **Markup**    | HTML, SVG, Markdown, Text                                                              | OWASP-compliant sanitization                                        |
| **Code**      | 50+ languages (TypeScript, Python, Java, Go, etc.)                                     | Language detection, syntax metadata                                 |
| **Config**    | `.env`, `.ini`, `.toml`, `.cfg`                                                        | Secure parsing                                                      |
| **Media**     | Images (PNG, JPEG, WebP, GIF), PDFs, CSV                                               | Provider-specific formatting                                        |
| **Audio**     | `.mp3`, `.wav`, `.m4a`, `.ogg`, `.flac`, `.webm`                                       | Automatic transcription + duration metadata                         |
| **Video**     | `.mp4`, `.webm`, `.mov`, `.mkv`, `.avi`                                                | Keyframe extraction, metadata, embedded subtitles                   |
| **Archive**   | `.zip`, `.tar`, `.gz`, `.tgz`, `.bz2`, `.tbz2`, `.jar`, `.xz`, `.txz`, `.zst`, `.tzst` | Entry listing, nested text extraction                               |

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

Audio and video attach the same way. Audio is transcribed automatically before
the model sees it; video is reduced to keyframes plus metadata and any embedded
subtitle track:

```typescript
const result = await neurolink.generate({
  input: {
    text: "What was decided in this meeting, and who owns each action item?",
    files: [
      "./standup.mp3", // transcribed, then folded into the prompt
      "./demo.mp4", // keyframes + duration/codec metadata + subtitles
      "./deck.pptx", // slides and speaker notes
    ],
  },
});
```

```bash
# Same thing from the CLI
neurolink generate "Summarize this recording" --file ./standup.mp3
neurolink generate "Describe what happens" --file ./demo.mp4
```

> Audio transcription needs a provider with a speech model configured (OpenAI
> Whisper by default). Video keyframe extraction requires `ffmpeg` — install it
> separately or rely on the bundled `ffmpeg-static`.

**Key Features:**

- **ProcessorRegistry** - Priority-based processor selection with fallback
- **OWASP Security** - HTML/SVG sanitization prevents XSS attacks
- **Auto-detection** - FileDetector identifies file types by extension and content
- **Provider-agnostic** - All processors work across every AI provider

**[📖 File Processors Guide](docs/features/file-processors.md)** - Complete reference for all file types

---

### 🏢 Enterprise & Production Features

**Capabilities for regulated industries:**

| Feature                     | Description                                                                                                                                                                                                                                                                               | Use Case                  | Documentation                                               |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ----------------------------------------------------------- |
| **Enterprise Proxy**        | Corporate proxy support                                                                                                                                                                                                                                                                   | Behind firewalls          | [Proxy Setup](docs/enterprise-proxy-setup.md)               |
| **Redis Memory**            | Distributed conversation state                                                                                                                                                                                                                                                            | Multi-instance deployment | [Redis Guide](docs/getting-started/provider-setup.md#redis) |
| **Memory**                  | Per-user condensed memory (S3/Redis/SQLite)                                                                                                                                                                                                                                               | Long-term user context    | [Memory Guide](docs/features/memory.md)                     |
| **Cost Optimization**       | Automatic cheapest model selection                                                                                                                                                                                                                                                        | Budget control            | [Cost Guide](docs/advanced/index.md)                        |
| **Multi-Provider Failover** | Automatic provider switching                                                                                                                                                                                                                                                              | High availability         | [Failover Guide](docs/advanced/index.md)                    |
| **Telemetry & Monitoring**  | OpenTelemetry integration, 9 exporters (Arize, Braintrust, Datadog, Laminar, Langfuse, LangSmith, OTel, PostHog, Sentry), OTel GenAI semantic conventions, and a dedicated `model.decision` span type with its own cost attribution so decision calls never distort generation dashboards | Observability             | [Telemetry Guide](docs/telemetry-guide.md)                  |
| **Security Hardening**      | Credential management, auditing                                                                                                                                                                                                                                                           | Compliance                | [Security Guide](docs/advanced/enterprise.md)               |
| **Custom Model Hosting**    | SageMaker integration                                                                                                                                                                                                                                                                     | Private models            | [SageMaker Guide](docs/sagemaker-integration.md)            |
| **Load Balancing**          | LiteLLM proxy integration                                                                                                                                                                                                                                                                 | Scale & routing           | [Load Balancing](docs/litellm-integration.md)               |

**Security & Compliance:**

- ✅ Deployable within SOC 2 Type II environments — NeuroLink itself is not audited or certified
- ✅ Deployable on ISO 27001-certified infrastructure — the certification is your infrastructure's, not NeuroLink's
- ✅ Supports GDPR-conscious data handling (EU-region providers selectable; you own compliance)
- ✅ Deployable in HIPAA-aligned configurations — you are responsible for a compliant setup
- ✅ Hardened OS verified (SELinux, AppArmor)
- ✅ Zero credential logging
- ✅ Encrypted configuration storage
- ✅ Automatic context window management with 5-stage compaction pipeline and 80% budget gate

**[📖 Enterprise Deployment Guide](docs/advanced/enterprise.md)** - Complete production checklist

---

## Enterprise Persistence: Redis Memory

Distributed conversation state for multi-instance deployments:

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

Run AI-powered workflows directly in GitHub Actions with support for every provider and automatic PR/issue commenting.

```yaml
- uses: juspay/neurolink@v1
  with:
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
    prompt: "Review this PR for security issues and code quality"
    post_comment: true
```

| Feature                | Description                                                                               |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| **Multi-Provider**     | Every provider behind one unified interface                                               |
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

| Capability               | Highlights                                                                                                                                                                                                                                                                                                     |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Provider unification** | Every provider neuron behind one API, with automatic fallback, cost-aware routing, `providerFallback` policy, `modelChain` config.                                                                                                                                                                             |
| **Decision inference**   | Third inference type (`decide`) alongside generate/stream: calibrated `boolean`/`choice`/`score` judgments via TypeSafe Jev, ~400ms flat, ~$0.00002/decision. Used internally for model routing, context budgeting, relevance compaction and tool routing; per-query RAG planning is opt-in via `RAGPipeline`. |
| **Multimodal pipeline**  | Stream images + CSV data + PDF documents across providers with local/remote assets. Auto-detection for mixed file types.                                                                                                                                                                                       |
| **Voice pipeline**       | TTS (6 providers: Google, OpenAI, ElevenLabs, Azure, Fish Audio, Cartesia) + STT (4 providers) + realtime voice APIs (OpenAI Realtime, Gemini Live).                                                                                                                                                           |
| **Quality & governance** | Auto-evaluation engine (14 scorers), guardrails middleware, HITL workflows, audit logging.                                                                                                                                                                                                                     |
| **Memory & context**     | Per-user condensed memory (S3/Redis/SQLite), Redis session export, 5-stage context compaction.                                                                                                                                                                                                                 |
| **CLI tooling**          | 34 commands: loop sessions, setup wizard, config validation, Redis auto-detect, JSON output, TTS/STT flags.                                                                                                                                                                                                    |
| **Enterprise ops**       | Claude proxy, OTLP observability, OpenObserve dashboard, regional routing, credential management.                                                                                                                                                                                                              |
| **Tool ecosystem**       | MCP auto discovery, HTTP/stdio/SSE/WebSocket transports, LiteLLM hub access, SageMaker custom deployment, web search.                                                                                                                                                                                          |
| **Engineering rigor**    | 129 end-to-end test suites (every suite drives the public `generate`/`stream`/`decide`/CLI surface, never internals), 13 custom ESLint rules enforcing the architecture (no `interface`, unique type names, barrel-only type imports) — all AST-based, no regex heuristics.                                    |

## Documentation Map

| Area            | When to Use                                               | Link                                                                               |
| --------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Getting started | Install, configure, run first prompt                      | [`docs/getting-started/index.md`](docs/getting-started/index.md)                   |
| Feature guides  | Understand new functionality front-to-back                | [`docs/features/index.md`](docs/features/index.md)                                 |
| Decide          | Calibrated judgments (boolean/choice/score), not text     | [`docs/features/decide-inference-type.md`](docs/features/decide-inference-type.md) |
| CLI reference   | Command syntax, flags, loop sessions                      | [`docs/cli/index.md`](docs/cli/index.md)                                           |
| SDK reference   | Classes, methods, options                                 | [`docs/sdk/index.md`](docs/sdk/index.md)                                           |
| RAG             | Document chunking, hybrid search, reranking, `rag:{}` API | [`docs/features/rag.md`](docs/features/rag.md)                                     |
| Integrations    | LiteLLM, SageMaker, MCP                                   | [`docs/litellm-integration.md`](docs/litellm-integration.md)                       |
| Advanced        | Middleware, architecture, streaming patterns              | [`docs/advanced/index.md`](docs/advanced/index.md)                                 |
| Cookbook        | Practical recipes for common patterns                     | [`docs/cookbook/index.md`](docs/cookbook/index.md)                                 |
| Guides          | Migration, Redis, troubleshooting, provider selection     | [`docs/guides/index.md`](docs/guides/index.md)                                     |
| Operations      | Configuration, troubleshooting, provider matrix           | [`docs/reference/index.md`](docs/reference/index.md)                               |

### New in 2026: Enhanced Documentation

**Enterprise Features:**

- [Enterprise HITL Guide](docs/features/enterprise-hitl.md) - Approval workflows for high-stakes operations
- [Interactive CLI Guide](docs/features/interactive-cli.md) - AI development environment
- [MCP Tools Showcase](docs/features/mcp-tools-showcase.md) - 6 built-in tools & connecting external MCP servers

**Decision Inference:**

- [Decide Guide](docs/features/decide-inference-type.md) - The `decide` inference type: boolean/choice/score primitives, TypeSafe Jev setup, measured latency/cost

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
- [Redis Configuration](docs/guides/redis-configuration.md) - Production deployment setup
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

- Real-time chat and community → [Discord](https://discord.gg/cZa8DrDhSR)
- Bug reports and feature requests → [GitHub Issues](https://github.com/juspay/neurolink/issues)
- New here? Start with a [good first issue](https://github.com/juspay/neurolink/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)
- Questions and discussions → [GitHub Discussions](https://github.com/juspay/neurolink/discussions)
- Development workflow, testing, and pull request guidelines → [`docs/development/contributing.md`](docs/development/contributing.md)
- Documentation improvements → open a PR referencing the [documentation matrix](docs/tracking/FEATURE-DOC-MATRIX.md).

## Acknowledgements

NeuroLink is made possible by the vibrant open-source AI ecosystem. We gratefully acknowledge the teams behind [OpenAI](https://openai.com/), [Anthropic](https://www.anthropic.com/), [Google AI](https://ai.google.dev/), [Mistral](https://mistral.ai/), and the many other providers and open-source projects that power this platform. Special thanks to every contributor who has filed issues, submitted pull requests, or shared feedback — your input drives NeuroLink forward.

---

NeuroLink is built with ❤️ by Juspay. Contributions, questions, and production feedback are always welcome.
