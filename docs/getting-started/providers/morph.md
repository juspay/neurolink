---
title: Morph Provider Guide
description: Morph on NeuroLink — OpenAI-compatible Tier-2 catalog provider, default model `morph-v3-large`
keywords: morph, morphllm, openai-compatible, tier 2, provider setup, fast apply
---

# Morph Provider Guide

Morph is a **Tier-2 catalog provider**: OpenAI-wire-compatible with one
documented quirk, so its entire integration is one JSON file
(`src/lib/providers/catalog/morph.json`) rather than hand-written code. That
file is the source of truth for everything on this page.

---

## Key Facts

- **Provider id**: `morph` (alias: `morphllm`)
- **Protocol**: OpenAI-compatible (`/chat/completions`)
- **Base URL**: `https://api.morphllm.com/v1`
- **Default model**: `morph-v3-large`
- **Models in catalog**: 2
- **Streaming**: supported
- **Tool calling**: **not supported** — Morph's catalog entry declares
  `tools: false`. `morph-v3-large` echoes a literal `<tool_call>...` block as
  plain text instead of a structured tool call, and `morph-v3-fast` ignores
  the `tools` parameter entirely.
- **Structured output**: supported (`response_format: json_object`/schema)
- **Embeddings**: not supported
- **Quirk — `messageContentFormat: "string"`**: Morph rejects the OpenAI
  content-parts array format (and the `null` content OpenAI sends on an
  assistant message with tool calls) with HTTP 500. NeuroLink's
  `ConfiguredOpenAICompatProvider` normalizes every message to a plain string
  before sending, so this should not surface as an error in normal use.
- **Billing**: free-with-card — a payment method must be on file; until one is
  added, calls are rate-limited to 5 requests/minute
- **Key format**: none declared

---

## Quick Start

### 1. Get an API key

1. Visit: https://morphllm.com/dashboard and sign in
2. Add a payment method (required to lift the 5 req/min limit)
3. Generate an API key from the dashboard
4. Set `MORPH_API_KEY` in your .env file

### 2. Configure

```bash
export MORPH_API_KEY=your-api-key
export MORPH_MODEL=morph-v3-large      # optional — overrides the default model
export MORPH_BASE_URL=https://api.morphllm.com/v1   # optional — self-hosted or proxy
```

### 3. Use it

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Summarize the following diff." },
  provider: "morph",
  model: "morph-v3-large",
});

console.log(result.content);
```

```bash
# CLI
npx @juspay/neurolink generate "Hello" --provider morph
```

Per-request credentials work as they do for every provider:

```typescript
await neurolink.generate({
  input: { text: "Hello" },
  provider: "morph",
  credentials: { morph: { apiKey: process.env.MORPH_API_KEY } },
});
```

---

## Models

| Model               | Context | Vision | $/M in · out | Notes                                                                                                                        |
| ------------------- | ------- | ------ | ------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `morph-v3-large` ⭐ | 262K    | no     | $0.9 / $1.9  | Recommended default; a "Fast Apply" code-editing model. Emits tool-call syntax as literal text rather than a real tool call. |
| `morph-v3-fast`     | 262K    | no     | $0.8 / $1.2  | Faster/cheaper sibling; silently ignores the `tools` parameter if one is sent.                                               |

Both models share a 262,144-token context window and a 131,072-token max
output, per the catalog default.

**Fallback order** when the default is unavailable: `morph-v3-fast`.

---

## Verification status

Tier-2 onboarding requires evidence before a provider is accepted, and
`pnpm run verify:provider-onboarding` gates it in CI. This is what the
catalog records for Morph:

| Probe                 | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roster                | authenticated GET /v1/models, HTTP 200, 2026-09-05                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Auth rejection        | HTTP 401, 2026-09-05                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Live capability sweep | 2026-09-05, probed against both models. Plain chat and streaming worked on each. Sending OpenAI's content-parts array format returned HTTP 500 (confirming the need for `messageContentFormat: "string"`). Tool-call requests did not produce a real tool call on either model — `morph-v3-large` echoed `<tool_call>` syntax as text content, `morph-v3-fast` returned a normal text answer as if no `tools` had been sent. `response_format: json_object` succeeded on both models. |

---

## Troubleshooting

| Symptom                                 | Cause                                                         | Fix                                                                                                                                 |
| --------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `Invalid Morph API key`                 | `MORPH_API_KEY` unset or wrong                                | Check the key at https://morphllm.com/dashboard                                                                                     |
| Tools silently absent or echoed as text | Morph declares `tools: false` and doesn't honor the parameter | Use a tool-capable provider for agentic work — see [provider feature compatibility](/docs/reference/provider-feature-compatibility) |
| Stuck at 5 requests/minute              | No payment method on file yet                                 | Add a card in the [Morph dashboard](https://morphllm.com/dashboard) to lift the limit                                               |
| Model not found                         | The roster changed since 2026-09-05                           | Use `morph-v3-large` or `morph-v3-fast` — Morph's catalog only lists these two                                                      |

---

## See also

- [Provider setup overview](/docs/getting-started/provider-setup)
- [All providers](/docs/getting-started/providers/)
- [Tier-2 onboarding](/docs/provider-integration/tiers/tier-2-catalog-entry) — how quirks like `messageContentFormat` work
- [Provider feature compatibility](/docs/reference/provider-feature-compatibility)
