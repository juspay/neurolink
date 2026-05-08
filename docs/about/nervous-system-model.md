---
id: nervous-system-model
title: The Nervous System Model
sidebar_label: Nervous System Model
---

# The Nervous System Model

NeuroLink is built around a biological metaphor — not as decoration, but as a structural model that governs every architectural decision.

## The Three Components

### Neurons — LLM Providers

Neurons are where intelligence is generated. In NeuroLink, neurons are the 21+ AI providers: Anthropic, OpenAI, Google (AI Studio + Vertex), AWS (Bedrock + SageMaker), Azure, Mistral, LiteLLM, OpenRouter, Ollama, Hugging Face, DeepSeek, NVIDIA NIM, LM Studio, llama.cpp, OpenAI-compatible endpoints — plus voice neurons (OpenAI TTS, ElevenLabs, Google TTS, Azure TTS, Whisper, Deepgram, Azure STT, Google STT) and realtime neurons (OpenAI Realtime, Gemini Live).

Each provider is a different type of neuron — different capabilities, different costs, different latency profiles. NeuroLink's ProviderRegistry gives you access to all of them through one interface, switchable with a single line.

### The Pipe — NeuroLink

The pipe is the vascular layer that carries streams between neurons and organs. This is NeuroLink itself.

What the pipe does every time you call `generate()` or `stream()`:

1. **Context Building** — RAG retrieval, memory lookup, file processing merge into the prompt
2. **Budget Check** — BudgetChecker validates the assembled context fits the model's window
3. **Provider Dispatch** — ProviderRegistry routes to the correct neuron
4. **Stream Emission** — Tokens flow as an async iterable
5. **Tool Interception** — When the model calls a tool, the stream pauses, MCP tool executes, result injects, stream continues
6. **Observability** — Every stage emits OpenTelemetry spans

### Organs — Connectors

Organs are the applications that consume the pipe. They connect to the vascular layer and open a gateway — a specific way for people or systems to interact with AI.

Every application built on NeuroLink is an organ. Production organs today:

- **[Automatic](../connectors/automatic)** — Shopify operations hub: address intelligence, RTO risk scoring
- **[Tara](../connectors/tara)** — Slack engineering assistant: conversational AI with MCP tool access
- **[Yama](../connectors/yama)** — Code review judge: automated PR analysis and governance

## Why This Model Works

The metaphor enforces good architecture:

**Separation of concerns:** Neurons (generation) and organs (consumption) are completely decoupled. Changing AI provider doesn't touch the application. Changing the application doesn't touch the provider.

**Single flow direction:** Intelligence flows one way — neuron → pipe → organ. There's no confusion about where logic lives.

**Observable by default:** A vascular system you can't monitor is dangerous. Every stage of the pipe emits telemetry by design.

**Composable:** Multiple organs can share the same pipe. One NeuroLink instance serves many connectors.

## Extending the System

The nervous system model scales in three directions:

- **Add neurons** — New AI provider? Register it in ProviderRegistry.
- **Extend the pipe** — New capability (chunking strategy, reranker, compaction stage)? Add it to the pipeline.
- **Build organs** — New application? Import NeuroLink, connect to the pipe, open your gateway.

See [Pipe Architecture →](/docs/about/pipe-architecture) for the technical implementation.
