---
title: Jina AI Provider Guide
description: Use Jina embeddings, reranking, and reader APIs through NeuroLink
keywords: jina, embeddings, jina-embeddings-v3, reranker, vector search
---

# Jina AI Provider Guide

**Multilingual embeddings + reranking through the Jina AI API**

---

## Overview

[Jina AI](https://jina.ai/) ships the `jina-embeddings-v3` family — a
state-of-the-art multilingual embedding model that supports 89 languages
out of the box. NeuroLink exposes the embedding endpoint via the standard
`embed()` / `embedMany()` provider contract.

### Key Facts

- **Protocol**: REST (`/v1/embeddings`)
- **Default base URL**: `https://api.jina.ai/v1`
- **Default embedding model**: `jina-embeddings-v3`
- **Multilingual**: 89 languages
- **Text generation**: No (embeddings-only provider)

---

## Quick Start

### 1. Get an API Key

Sign up at [https://jina.ai/](https://jina.ai/) and grab a key from the
dashboard.

### 2. Configure Environment

```bash
JINA_API_KEY=your-jina-api-key
# Optional: override the default model
JINA_MODEL=jina-embeddings-v3
```

### 3. Generate Embeddings

```typescript
import { NeuroLink } from "@juspay/neurolink";

const ai = new NeuroLink();

const provider = await ai.getProvider("jina");
const vector = await provider.embed("How does CRISPR-Cas9 work?");
console.log(vector.length); // 1024
```

---

## Supported Models

| Model ID                             | Family     | Dim  | Notes                                 |
| ------------------------------------ | ---------- | ---- | ------------------------------------- |
| `jina-embeddings-v3`                 | Embeddings | 1024 | Default; multilingual, 8K context     |
| `jina-embeddings-v2-base-en`         | Embeddings | 768  | English, 8K context                   |
| `jina-embeddings-v2-base-code`       | Embeddings | 768  | Code-specialised                      |
| `jina-reranker-v2-base-multilingual` | Reranking  | n/a  | Multilingual reranker (RAG pipelines) |

---

## CLI Usage

```bash
# Generate an embedding via CLI (uses the SDK under the hood)
pnpm run cli embed "What is photosynthesis?" --provider jina
```

---

## Provider Aliases

| Alias  | Example           |
| ------ | ----------------- |
| `jina` | `--provider jina` |

---

## Configuration Reference

| Environment Variable | Required | Default                  | Description       |
| -------------------- | -------- | ------------------------ | ----------------- |
| `JINA_API_KEY`       | Yes      | —                        | Jina AI API key   |
| `JINA_MODEL`         | No       | `jina-embeddings-v3`     | Default model     |
| `JINA_BASE_URL`      | No       | `https://api.jina.ai/v1` | Base URL override |

---

## Feature Support Matrix

| Feature         | Support                        |
| --------------- | ------------------------------ |
| Text generation | No                             |
| Streaming       | No                             |
| Tool calling    | No                             |
| Embeddings      | Yes — `embed()`, `embedMany()` |
| Reranking       | Yes (via Jina Reranker model)  |

---

## Troubleshooting

- **`401 Unauthorized`** — check `JINA_API_KEY`.
- **`429 Too Many Requests`** — Jina's free tier has tight per-minute caps.
  Add exponential backoff or upgrade your plan.

---

## See Also

- [Voyage Provider](/docs/getting-started/providers/voyage)
- [Cohere Provider](/docs/getting-started/providers/cohere)
