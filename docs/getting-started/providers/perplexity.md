---
title: Perplexity Provider Guide
description: Use Perplexity Sonar (search-augmented LLM) through NeuroLink
keywords: perplexity, sonar, web search, citations, search-augmented generation
---

# Perplexity Provider Guide

**Web-search-augmented generation via Perplexity's Sonar models**

---

## Overview

[Perplexity](https://www.perplexity.ai/) hosts a family of LLMs (Sonar,
Sonar Pro, Sonar Reasoning) that pair the model with a live web search
backend; responses include citations to the documents the model relied on.

### Key Facts

- **Protocol**: OpenAI-compatible (`/chat/completions`)
- **Default base URL**: `https://api.perplexity.ai`
- **Default model**: `sonar`
- **Citations**: Returned via `citations` field on the response
- **Streaming**: Yes
- **Tool calling**: No

---

## Quick Start

### 1. Get an API Key

[https://www.perplexity.ai/settings/api](https://www.perplexity.ai/settings/api)

### 2. Configure

```bash
PERPLEXITY_API_KEY=pplx-your-key
PERPLEXITY_MODEL=sonar
```

> **`PERPLEXITY_API_KEY` also configures decisions.** The same variable configures
> the [Perplexity Decisions provider](perplexity-decider.md) (`perplexity-decider`,
> which serves `decide()`). So setting it for Sonar also lets NeuroLink's built-in
> features send decision requests to Perplexity when no TypeSafe, Laya or XOR
> provider is configured, and context compaction needs no other opt-in to do so.
> To avoid that, pass the key through the SDK as `credentials.perplexity.apiKey`
> instead of the environment, and keep it out of `.env` too: the SDK and the CLI
> load that file into the environment, so a `PERPLEXITY_API_KEY` line like the one
> above would still configure decisions. (That the text provider reads this slice
> is taken from the code and has not been run against the live API.) See
> [What is sent to Perplexity](perplexity-decider.md#what-is-sent-to-perplexity)
> and [One key, two providers](perplexity-decider.md#one-key-two-providers).

### 3. Generate

```typescript
import { NeuroLink } from "@juspay/neurolink";
const ai = new NeuroLink();
const result = await ai.generate({
  provider: "perplexity",
  input: { text: "What did the Fed announce yesterday?" },
});
console.log(result.content);
```

---

## Supported Models

| Model ID          | Notes                               |
| ----------------- | ----------------------------------- |
| `sonar`           | Default; fast search-augmented chat |
| `sonar-pro`       | Larger context, deeper search       |
| `sonar-reasoning` | Chain-of-thought reasoning          |

---

## CLI Usage

```bash
pnpm run cli generate "What were today's tech-stock movers?" --provider perplexity
```

---

## Provider Aliases

| Alias        | Example                 |
| ------------ | ----------------------- |
| `perplexity` | `--provider perplexity` |

---

## Configuration Reference

| Environment Variable  | Required | Default                     |
| --------------------- | -------- | --------------------------- |
| `PERPLEXITY_API_KEY`  | Yes      | —                           |
| `PERPLEXITY_MODEL`    | No       | `sonar`                     |
| `PERPLEXITY_BASE_URL` | No       | `https://api.perplexity.ai` |

---

## Feature Support Matrix

| Feature           | Support      |
| ----------------- | ------------ |
| Text generation   | Yes          |
| Streaming         | Yes          |
| Tool calling      | No           |
| Structured output | Limited      |
| Web search        | Yes (native) |
| Citations         | Yes          |

---

## See Also

- [Perplexity Decisions Provider](/docs/getting-started/providers/perplexity-decider) — typed, calibrated `decide()` judgments on the same key
- [Anthropic Provider](/docs/getting-started/providers/anthropic) — web-search via the `web_search` tool
- [Vertex Provider](/docs/getting-started/providers/google-vertex) — Google search grounding
