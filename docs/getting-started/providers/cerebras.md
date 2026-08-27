---
title: Cerebras Provider Guide
description: Wafer-scale inference at ~3000 tokens/s — GPT-OSS 120B and Gemma 4 31B via the Cerebras Inference API
keywords: cerebras, wafer-scale, wse, gpt-oss-120b, gemma-4-31b, fast inference, low-latency
---

# Cerebras Provider Guide

**The fastest hosted generation available (~3000 tokens/s on GPT-OSS
120B) via Cerebras' Wafer-Scale Engine — best for throughput-hungry
workloads**

---

## Overview

Cerebras serves open-weight models on its Wafer-Scale Engine (WSE), a
single wafer-sized chip whose on-die memory bandwidth yields generation
speeds an order of magnitude above GPU clouds. NeuroLink wraps
`api.cerebras.ai/v1` (OpenAI-compatible, zero-quirk Tier 2 catalog
entry) so the standard generate / stream contract applies.

The roster below was verified against a live authenticated `/v1/models`
on 2026-08-27 — Cerebras retires models aggressively, and previously
documented llama/qwen ids now return 404:

- **`gpt-oss-120b`** (default) — OpenAI's open-weight 120B reasoning model, ~3000 tok/s
- **`gemma-4-31b`** — Google Gemma 4 31B, ~1850 tok/s

### Key Facts

- **Protocol**: OpenAI-compatible (`/v1/chat/completions`)
- **Default base URL**: `https://api.cerebras.ai/v1`
- **Default model**: `gpt-oss-120b`
- **Context window**: 65K tokens on the free tier, 131K on paid tiers (both
  models). NeuroLink budgets context against the 65K free-tier floor — the
  account tier isn't knowable from the key, and compacting early on a paid
  tier is safe while overrunning a 65K window is not.
- **Max output**: 32K free / 40K paid
- **Vision**: No (text-only roster)
- **Streaming**: Supported
- **Tool calling**: Supported (native)
- **Structured output**: Supported — but **not combined with tools in one
  request**: the API rejects `tools` + `response_format` together with
  400 `wrong_api_format` ("tools" is incompatible with "response_format").
  NeuroLink handles this the same way as Groq: with tools active the
  schema is enforced post-hoc on the final text instead of on the wire.
- **Reasoning trace**: `gpt-oss-120b` emits `reasoning` deltas before
  content — see Troubleshooting for the `maxTokens` implication.
- **Billing**: no keyless free tier. Even the one-time $5 promotional
  credit requires saving a payment method ("you won't be charged now").
  Pay-as-you-go starts at $10.
- **Pricing** (per million tokens, checked 2026-08-27): `gpt-oss-120b`
  $0.35 in / $0.75 out; `gemma-4-31b` $0.99 in / $1.49 out.

---

## Quick Start

### 1. Get an API Key

Sign up at [https://cloud.cerebras.ai](https://cloud.cerebras.ai) (Google
OAuth works), claim the $5 free credit under **Billing → Credits** (a
payment card must be saved — no charge is made), and create an API key
(prefix `csk-`).

### 2. Configure Environment

```bash
# Required
CEREBRAS_API_KEY=csk-...

# Optional: override the default model (default: gpt-oss-120b)
CEREBRAS_MODEL=gemma-4-31b

# Optional: override the base URL
# CEREBRAS_BASE_URL=https://api.cerebras.ai/v1
```

### 3. Generate Your First Response

```typescript
import { NeuroLink } from "@juspay/neurolink";

const ai = new NeuroLink();

const result = await ai.generate({
  provider: "cerebras",
  input: { text: "What is the Cerebras wafer-scale engine?" },
});

console.log(result.content);
```

---

## SDK Usage

### Basic Generation

```typescript
const result = await ai.generate({
  provider: "cerebras",
  input: { text: "Write a haiku about silicon wafers." },
});
```

### Streaming

```typescript
const stream = await ai.stream({
  provider: "cerebras",
  input: { text: "Explain how B-trees work, step by step." },
});

for await (const chunk of stream.stream) {
  if ("content" in chunk && chunk.content) process.stdout.write(chunk.content);
}
```

### Tool Calling

```typescript
const ai = new NeuroLink();
ai.registerTool("getTime", {
  name: "getTime",
  description: "Returns the current UTC time",
  inputSchema: { type: "object", properties: {} },
  execute: async () => ({ utc: new Date().toISOString() }),
});

const result = await ai.generate({
  provider: "cerebras",
  input: { text: "What is the current UTC time? Use the tool." },
  enabledToolNames: ["getTime"],
});
```

### Structured Output

```typescript
import { z } from "zod";

const result = await ai.generate({
  provider: "cerebras",
  input: { text: "Name three fast chips as JSON." },
  schema: z.object({ chips: z.array(z.string()) }),
  maxTokens: 1000,
});

console.log(result.structuredData); // parsed, schema-shaped object
```

Combining `schema` with active tools works, but the schema is enforced
post-hoc rather than on the wire (see Key Facts) — expect
`structuredData` to be best-effort in that combination, exactly as with
Groq.

### Per-Call Credentials

```typescript
const result = await ai.generate({
  provider: "cerebras",
  input: { text: "..." },
  credentials: { cerebras: { apiKey: "user-key" } },
});
```

---

## CLI Usage

```bash
# Default model (gpt-oss-120b)
pnpm run cli generate "Quick question" --provider cerebras

# Explicit model
pnpm run cli generate "Hi" --provider cerebras --model gemma-4-31b

# Streaming
pnpm run cli stream "Count to ten" --provider cerebras

# Loop / chat
pnpm run cli loop --provider cerebras
```

---

## Provider Aliases

| Alias      | Example               |
| ---------- | --------------------- |
| `cerebras` | `--provider cerebras` |

---

## Configuration Reference

| Environment Variable | Required | Default                      | Description      |
| -------------------- | -------- | ---------------------------- | ---------------- |
| `CEREBRAS_API_KEY`   | Yes      | —                            | Cerebras API key |
| `CEREBRAS_MODEL`     | No       | `gpt-oss-120b`               | Default model    |
| `CEREBRAS_BASE_URL`  | No       | `https://api.cerebras.ai/v1` | Base URL         |

---

## Feature Support Matrix

| Feature                   | gpt-oss-120b | gemma-4-31b |
| ------------------------- | ------------ | ----------- |
| Text generation           | Yes          | Yes         |
| Streaming                 | Yes          | Yes         |
| Tool calling              | Yes          | Yes         |
| Structured output         | Yes          | Yes         |
| Structured output + tools | Post-hoc     | Post-hoc    |
| Vision                    | No           | No          |
| Embeddings                | No           | No          |
| Context window            | 65K/131K     | 65K/131K    |

---

## Troubleshooting

### "Invalid Cerebras API key"

```bash
# Presence check without printing the secret (terminal capture, CI logs
# and shell transcripts retain echoed values):
test -n "$CEREBRAS_API_KEY" && echo "CEREBRAS_API_KEY is set" || echo "CEREBRAS_API_KEY is missing"
export CEREBRAS_API_KEY=csk-...
```

Get / rotate at [https://cloud.cerebras.ai](https://cloud.cerebras.ai).
A bad key returns 401 with `"code": "wrong_api_key"`, which NeuroLink
maps to this message.

### 402 payment_required on every call

The account has no balance. Cerebras has no keyless free tier: open
**Billing → Credits → ADD CREDITS** in the console, choose "Start with
limited free credits", and save a payment card — the $5 promo credit
activates with no charge. Skipping the claim step during onboarding
("SKIP TO CONSOLE") leaves the balance at $0.00.

### Empty content with small `maxTokens` on gpt-oss-120b

`gpt-oss-120b` is a reasoning model: it spends its first tokens on a
`reasoning` channel before emitting `content`. With a tight budget
(e.g. `maxTokens: 50`) the entire budget goes to reasoning,
`finish_reason` is `length`, and content is empty. Give reasoning
prompts a few hundred tokens of headroom.

### 404 "model not found" for llama/qwen models

Those models are retired. The live roster is `gpt-oss-120b` and
`gemma-4-31b` only — verify with an authenticated
`GET https://api.cerebras.ai/v1/models`.

---

## See Also

- [Groq Provider](/docs/getting-started/providers/groq) — sibling speed-focused OpenAI-compat provider
- [xAI Grok Provider](/docs/getting-started/providers/xai) — sibling OpenAI-compat with Grok 3
- [Tier 2 catalog entry guide](/docs/provider-integration/tiers/tier-2-catalog-entry) — how this provider is wired internally

---

**Need Help?** Open a [GitHub Discussion](https://github.com/juspay/neurolink/discussions) or [issue](https://github.com/juspay/neurolink/issues).
