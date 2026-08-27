---
title: SambaNova Provider Guide
description: RDU-accelerated inference — Llama 3.3, GPT-OSS 120B, DeepSeek V3.x, MiniMax, Gemma 4 via SambaNova Cloud
keywords: sambanova, rdu, llama-3.3, gpt-oss-120b, deepseek, minimax, gemma, fast inference
---

# SambaNova Provider Guide

**Open-weight flagships (Llama 3.3 70B, GPT-OSS 120B, DeepSeek V3.x,
MiniMax, Gemma 4) on SambaNova's RDU-accelerated cloud**

---

## Overview

SambaNova Cloud serves open-weight models on its Reconfigurable Dataflow
Units. NeuroLink wraps `api.sambanova.ai/v1` (OpenAI-compatible,
zero-quirk Tier 2 catalog entry) so the standard generate / stream
contract applies.

Roster verified against a live authenticated `/v1/models` on 2026-08-27:

- **`Meta-Llama-3.3-70B-Instruct`** (default) — production, 128K context
- **`gpt-oss-120b`** — production, 128K context
- **`DeepSeek-V3.1`** — production reasoning model, 128K context
- **`DeepSeek-V3.2`** — vendor preview, 32K context
- **`MiniMax-M2.7`** — production, 192K context
- **`MiniMax-M3`** — vision-capable per the vendor dashboard
- **`gemma-4-31B-it`** — vendor preview; vision (text + image + video)

### Key Facts

- **Protocol**: OpenAI-compatible (`/v1/chat/completions`)
- **Default base URL**: `https://api.sambanova.ai/v1`
- **Default model**: `Meta-Llama-3.3-70B-Instruct`
- **Vision**: `gemma-4-31B-it` (image + video) and `MiniMax-M3`
- **Streaming / tool calling**: per the OpenAI-compatible contract
- **⚠️ Billing (probed live 2026-08-27)**: new accounts have **no free
  allowance** — every call returns 402 `PAYMENT_METHOD_REQUIRED`
  (`balance_units: 0`) until a payment method is added and credits are
  purchased at [cloud.sambanova.ai/plans/billing](https://cloud.sambanova.ai/plans/billing).
  The onboarding wizard's payment step may show "temporarily
  unavailable" — use the Billing page instead.
- **Pricing** (per million tokens, vendor pricing page 2026-08-27):
  Llama-3.3-70B $0.60/$1.20 · gpt-oss-120b $0.22/$0.59 ·
  DeepSeek-V3.x $3.00/$4.50 · MiniMax $0.60/$2.40 ·
  gemma-4-31B-it $0.38/$1.15
- **API keys are bare UUIDs** (no `sk-`-style prefix) — keep them out of
  logs; NeuroLink's Authorization-header redaction covers them.

---

## Quick Start

### 1. Get an API Key

Sign up at [https://cloud.sambanova.ai](https://cloud.sambanova.ai)
(Google/Microsoft OAuth), complete the profile step, add a payment
method + credits under **Plans → Billing**, and create a key under
**API Keys**.

### 2. Configure Environment

```bash
# Required
SAMBANOVA_API_KEY=...

# Optional: override the default model
SAMBANOVA_MODEL=gpt-oss-120b

# Optional: override the base URL
# SAMBANOVA_BASE_URL=https://api.sambanova.ai/v1
```

### 3. Generate Your First Response

```typescript
import { NeuroLink } from "@juspay/neurolink";

const ai = new NeuroLink();

const result = await ai.generate({
  provider: "sambanova",
  input: { text: "What is a reconfigurable dataflow unit?" },
});

console.log(result.content);
```

---

## CLI Usage

```bash
pnpm run cli generate "Quick question" --provider sambanova
pnpm run cli stream "Count to ten" --provider sambanova
pnpm run cli generate "Hi" --provider sambanova --model gpt-oss-120b
```

---

## Configuration Reference

| Environment Variable | Required | Default                       | Description       |
| -------------------- | -------- | ----------------------------- | ----------------- |
| `SAMBANOVA_API_KEY`  | Yes      | —                             | SambaNova API key |
| `SAMBANOVA_MODEL`    | No       | `Meta-Llama-3.3-70B-Instruct` | Default model     |
| `SAMBANOVA_BASE_URL` | No       | `https://api.sambanova.ai/v1` | Base URL          |

---

## Troubleshooting

### 402 on every call / "PAYMENT_METHOD_REQUIRED"

The account has no credits — new accounts have no free allowance.
Add a payment method and purchase credits at
[cloud.sambanova.ai/plans/billing](https://cloud.sambanova.ai/plans/billing).

### "Invalid SambaNova API key"

```bash
test -n "$SAMBANOVA_API_KEY" && echo "SAMBANOVA_API_KEY is set" || echo "SAMBANOVA_API_KEY is missing"
```

Rotate at [cloud.sambanova.ai/apis](https://cloud.sambanova.ai/apis). A
bad key returns an OpenAI-shaped 401 with `"code": "invalid_api_key"`.

### 404 for a model that used to exist

Preview models (`DeepSeek-V3.2`, `gemma-4-31B-it`) "may be removed at
short notice" per the vendor. Verify with an authenticated
`GET https://api.sambanova.ai/v1/models`.

---

## See Also

- [Cerebras Provider](/docs/getting-started/providers/cerebras) — sibling wafer-scale speed provider
- [Groq Provider](/docs/getting-started/providers/groq) — sibling LPU speed provider
- [Tier 2 catalog entry guide](/docs/provider-integration/tiers/tier-2-catalog-entry) — internal wiring

---

**Need Help?** Open a [GitHub Discussion](https://github.com/juspay/neurolink/discussions) or [issue](https://github.com/juspay/neurolink/issues).
