---
title: Cohere Provider Guide
description: Use Cohere Command R+ chat and Embed v3 through NeuroLink
keywords: cohere, command-r, command-r-plus, embed-v3, rerank, embeddings
---

# Cohere Provider Guide

**Command R chat + Embed v3 embeddings via the Cohere API**

---

## Overview

[Cohere](https://docs.cohere.com/) offers a production-grade chat
catalog (Command R / R+ / R7B) plus top-tier embeddings (Embed v3) and
reranking (Rerank v3). NeuroLink wraps chat via the OpenAI-compatible
endpoint and embeddings via the native `/v2/embed` endpoint.

### Key Facts

- **Protocol**: OpenAI-compatible chat at `/compatibility/v1`,
  native embed at `/v2/embed`
- **Default base URL**: `https://api.cohere.com/compatibility/v1`
- **Default chat model**: `command-r-plus-08-2024`
- **Default embed model**: `embed-english-v3.0`
- **Streaming**: Yes
- **Tool calling**: Yes (Command R / R+)

---

## Quick Start

### 1. Get an API Key

[https://dashboard.cohere.com/api-keys](https://dashboard.cohere.com/api-keys)

### 2. Configure

```bash
COHERE_API_KEY=your-key
COHERE_MODEL=command-r-plus-08-2024
```

### 3. Generate Text

```typescript
import { NeuroLink } from "@juspay/neurolink";
const ai = new NeuroLink();
const result = await ai.generate({
  provider: "cohere",
  input: { text: "Summarise the BM25 retrieval algorithm." },
});
console.log(result.content);
```

### 4. Generate Embeddings

```typescript
const provider = await ai.getProvider("cohere");
const vec = await provider.embed("How does CRISPR work?");
console.log(vec.length); // 1024 for embed-english-v3.0
```

---

## Supported Models

| Model ID                      | Family           | Notes                    |
| ----------------------------- | ---------------- | ------------------------ |
| `command-r-plus-08-2024`      | Chat (default)   | Flagship                 |
| `command-r-08-2024`           | Chat             | Mid-tier                 |
| `command-r7b-12-2024`         | Chat             | Most compact             |
| `command-a-reasoning-08-2025` | Reasoning        | Reasoning traces         |
| `embed-english-v3.0`          | Embeddings (def) | 1024 dim, English        |
| `embed-multilingual-v3.0`     | Embeddings       | 1024 dim, 100+ languages |

---

## CLI Usage

```bash
pnpm run cli generate "Explain RAG in 3 sentences" --provider cohere
```

---

## Configuration Reference

| Environment Variable | Required | Default                                   |
| -------------------- | -------- | ----------------------------------------- |
| `COHERE_API_KEY`     | Yes      | —                                         |
| `COHERE_MODEL`       | No       | `command-r-plus-08-2024`                  |
| `COHERE_BASE_URL`    | No       | `https://api.cohere.com/compatibility/v1` |

---

## Feature Support Matrix

| Feature           | Support      |
| ----------------- | ------------ |
| Text generation   | Yes          |
| Streaming         | Yes          |
| Tool calling      | Yes          |
| Structured output | Yes          |
| Vision            | No           |
| Embeddings        | Yes (native) |
| Reranking         | Yes          |

---

## Troubleshooting

- **`Not Found`** — the chosen model may not be available on your tier.
  Try `command-r-plus-08-2024` or `command-r-08-2024`.

---

## See Also

- [Voyage Provider](/docs/getting-started/providers/voyage)
- [Jina Provider](/docs/getting-started/providers/jina)
