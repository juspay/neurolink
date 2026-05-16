---
title: Voyage AI Provider Guide
description: Top-tier RAG embeddings via Voyage AI — voyage-3.5, voyage-3-large, voyage-code-3, plus domain-tuned variants
keywords: voyage, voyage-ai, embeddings, rag, voyage-3-large, voyage-code-3, retrieval
---

# Voyage AI Provider Guide

**Top-tier RAG embeddings — text-only provider exposing `embed()` and
`embedMany()` (chat / streaming intentionally not supported)**

---

## Overview

Voyage AI provides some of the highest-accuracy text embeddings available
today, particularly strong on retrieval and reranking benchmarks. NeuroLink
wraps `api.voyageai.com/v1/embeddings` so the same `embed()` / `embedMany()`
contract used by every other embedding-capable provider works for Voyage.

- **`voyage-3.5`** — latest general-purpose (default)
- **`voyage-3-large`** — flagship; highest accuracy
- **`voyage-3.5-lite`** — smaller / cheaper
- **`voyage-code-3`** — code-tuned (best for code retrieval)
- **`voyage-finance-2`**, **`voyage-law-2`** — domain-tuned
- **`voyage-multilingual-2`** — non-English / cross-lingual

### Key Facts

- **Protocol**: Native REST API (`/embeddings` only — not OpenAI-compat
  for chat)
- **Default base URL**: `https://api.voyageai.com/v1`
- **Default model**: `voyage-3.5`
- **Max input tokens**: 32K (16K on `voyage-law-2`)
- **Streaming / chat / tool calling**: NOT supported (embedding-only;
  `executeStream` and `getAISDKModel` throw a friendly error)
- **Pricing**: Per-million input tokens; output dimension is the
  embedding vector, not generated tokens

---

## Quick Start

### 1. Get an API Key

Sign up at [https://www.voyageai.com/](https://www.voyageai.com/) and
create an API key at
[https://dash.voyageai.com/api-keys](https://dash.voyageai.com/api-keys).

### 2. Configure Environment

```bash
# Required
VOYAGE_API_KEY=pa-...

# Optional: override the default model (default: voyage-3.5)
VOYAGE_MODEL=voyage-3-large

# Optional: override the base URL
# VOYAGE_BASE_URL=https://api.voyageai.com/v1
```

### 3. Generate Your First Embedding

```typescript
import { NeuroLink } from "@juspay/neurolink";

const ai = new NeuroLink();

const vector = await ai.embed("The quick brown fox jumps over the lazy dog", {
  provider: "voyage",
});

console.log(`Vector length: ${vector.length}`); // 1024 for voyage-3.5
```

---

## SDK Usage

### Single Embedding

```typescript
const vector = await ai.embed("Why is the sky blue?", {
  provider: "voyage",
  model: "voyage-3.5",
});
// vector: number[]
```

### Batch Embeddings

```typescript
const vectors = await ai.embedMany(
  ["Document 1 content...", "Document 2 content...", "Document 3 content..."],
  { provider: "voyage", model: "voyage-3-large" },
);
// vectors: number[][]
```

### Code Embeddings

```typescript
const codeVector = await ai.embed(
  `function fibonacci(n) { return n < 2 ? n : fibonacci(n-1) + fibonacci(n-2); }`,
  { provider: "voyage", model: "voyage-code-3" },
);
```

### Per-Call Credentials

```typescript
const vector = await ai.embed("text", {
  provider: "voyage",
  credentials: { voyage: { apiKey: "user-specific-key" } },
});
```

### Use with NeuroLink RAG

Voyage embeddings plug into NeuroLink's RAG pipeline. Configure the RAG
embedder to use Voyage:

```typescript
const result = await ai.generate({
  provider: "openai", // any chat-capable provider for the LLM half
  prompt: "What are the key features?",
  rag: {
    files: ["./docs/guide.md"],
    embedder: { provider: "voyage", model: "voyage-3.5" },
  },
});
```

---

## CLI Usage

Voyage is embedding-only — there is no `cli generate` flow because
generate is a chat-completion path. Use the SDK directly, or use Voyage
as the embedder behind a RAG-enabled `cli generate`:

```bash
pnpm run cli generate "What does the README say?" \
  --provider openai \
  --rag-files ./README.md \
  --rag-embedder voyage:voyage-3.5
```

---

## Provider Aliases

| Alias       | Example                |
| ----------- | ---------------------- |
| `voyage`    | `--provider voyage`    |
| `voyage-ai` | `--provider voyage-ai` |

(Note: aliases are mostly relevant for RAG embedder routing; standalone
chat use is not supported.)

---

## Configuration Reference

| Environment Variable | Required | Default                       | Description             |
| -------------------- | -------- | ----------------------------- | ----------------------- |
| `VOYAGE_API_KEY`     | Yes      | —                             | Voyage AI API key       |
| `VOYAGE_MODEL`       | No       | `voyage-3.5`                  | Default embedding model |
| `VOYAGE_BASE_URL`    | No       | `https://api.voyageai.com/v1` | Base URL                |

---

## Model Reference

Per the [Voyage embeddings docs](https://docs.voyageai.com/docs/embeddings):

| Model                   | Default dim | Tokens | Best For                   |
| ----------------------- | ----------- | ------ | -------------------------- |
| `voyage-3.5`            | 1024        | 32K    | General-purpose (default)  |
| `voyage-3.5-lite`       | 1024        | 32K    | Smaller / cheaper          |
| `voyage-3-large`        | 1024        | 32K    | Flagship; highest accuracy |
| `voyage-code-3`         | 1024        | 32K    | Code retrieval             |
| `voyage-finance-2`      | 1024        | 32K    | Finance domain             |
| `voyage-law-2`          | 1024        | 16K    | Legal domain               |
| `voyage-multilingual-2` | unspecified | 32K    | Cross-lingual              |

**Matryoshka flexible dimensions:** `voyage-3.5`, `voyage-3.5-lite`,
`voyage-3-large`, and `voyage-code-3` all support flexible output dimensions
of **256 / 512 / 1024 / 2048** via the `output_dimension` parameter on the
Voyage API. The default (and what NeuroLink currently returns) is 1024.
`voyage-finance-2`, `voyage-law-2`, and `voyage-multilingual-2` only emit
the default dimension. See the FAQ below for how to request a smaller
dimension explicitly.

---

## Feature Support Matrix

| Feature         | voyage-3.5           | voyage-3-large | voyage-code-3 |
| --------------- | -------------------- | -------------- | ------------- |
| Embeddings      | Yes                  | Yes            | Yes           |
| Single embed    | Yes                  | Yes            | Yes           |
| Batch embed     | Yes (128 inputs/req) | Yes            | Yes           |
| Text generation | No                   | No             | No            |
| Streaming       | No                   | No             | No            |
| Tool calling    | No                   | No             | No            |
| Vision          | No                   | No             | No            |

---

## Troubleshooting

### "Invalid Voyage AI API key"

```bash
echo $VOYAGE_API_KEY
export VOYAGE_API_KEY=pa-...
```

Get / rotate at
[https://dash.voyageai.com/api-keys](https://dash.voyageai.com/api-keys).

### "Voyage AI rate limit exceeded"

Voyage has per-minute and daily limits per tier. Free-tier is generous
for development; production usage typically requires the paid tier.
Implement exponential backoff or use `embedMany` (batched) instead of
many single `embed` calls.

### "embed() / embedMany() not available"

Voyage IS embedding-only — these methods work. If you see "not supported"
errors, verify you're using `provider: "voyage"` and the API key is set.
For chat / streaming on Voyage, you can't — pick a different provider
(xAI / Groq / OpenAI / etc.).

### "voyage-3.5 returns 1024-dim, but I want 512"

Use `voyage-3.5-lite` (native 512-dim) instead. Voyage doesn't currently
expose a `dimensions` parameter on the standard models — pick the right
model for the dimension you need.

### "How do I rerank with Voyage?"

Voyage doesn't expose rerank through this provider class today. For
reranking, use the Jina AI provider (see `src/lib/providers/jina.ts`)
which exposes `rerank()` directly.

---

## See Also

- Jina AI — sibling embedding-only provider with reranking support (no setup doc yet; see `src/lib/providers/jina.ts`)
- [RAG Integration](/docs/features/rag) — how to use Voyage embeddings in the RAG pipeline
- [Adding a new LLM provider](/docs/provider-integration/15-adding-llm-provider) — covers the embedding-only override pattern in §H

---

**Need Help?** Open a [GitHub Discussion](https://github.com/juspay/neurolink/discussions) or [issue](https://github.com/juspay/neurolink/issues).
