---
title: Flatkey Provider Guide
description: Access 100+ AI models through Flatkey's OpenAI-compatible gateway with a single API key and one shared balance
keywords: flatkey, openai-compatible, multi-provider, unified gateway, ai models
---

# Flatkey Provider Guide

**One API key and one balance across 100+ supported AI models**

---

## Overview

[Flatkey](https://flatkey.ai) is a unified gateway that exposes
100+ AI models behind a single OpenAI-compatible endpoint. One API key
and one balance cover every supported model, so switching models does not require
new accounts, new keys, or new billing setup.

Because Flatkey implements the OpenAI chat-completions specification, it works with
NeuroLink's existing `openai-compatible` provider — no new provider
implementation is required.

### Key Facts

- **Protocol**: OpenAI-compatible (`/v1/chat/completions`)
- **Base URL**: `https://router.flatkey.ai/v1`
- **API keys**: [https://console.flatkey.ai/keys](https://console.flatkey.ai/keys)
- **Model catalog**: [https://flatkey.ai/models](https://flatkey.ai/models)
- **Auto-discovery**: models are listed via `GET /v1/models`

---

## Quick Start

### 1. Get an API Key

Create a key at [https://console.flatkey.ai/keys](https://console.flatkey.ai/keys).

### 2. Configure Environment

Add to `.env`:

```bash
OPENAI_COMPATIBLE_BASE_URL=https://router.flatkey.ai/v1
OPENAI_COMPATIBLE_API_KEY=sk-fk-your-key
OPENAI_COMPATIBLE_MODEL=gpt-4o-mini
```

### 3. Verify the Connection

```bash
curl https://router.flatkey.ai/v1/models \
  -H "Authorization: Bearer $FLATKEY_API_KEY"
```

### 4. Generate

```typescript
import { NeuroLink } from "@juspay/neurolink";

const ai = new NeuroLink();
const result = await ai.generate({
  provider: "openai-compatible",
  input: { text: "Explain vector databases in two sentences." },
});
console.log(result.content);
```

```bash
npx @juspay/neurolink generate "Hello from Flatkey!" --provider openai-compatible --model "gpt-4o-mini"
```

---

## Model Discovery

Flatkey exposes its catalog through the standard endpoint, so NeuroLink's
auto-discovery works without extra configuration:

```bash
npx @juspay/neurolink models --provider openai-compatible
```

The full catalog is also browsable at [https://flatkey.ai/models](https://flatkey.ai/models).

---

## Configuration Reference

| Variable                     | Required | Description                                                 |
| ---------------------------- | -------- | ----------------------------------------------------------- |
| `OPENAI_COMPATIBLE_BASE_URL` | Yes      | Flatkey endpoint — `https://router.flatkey.ai/v1`           |
| `OPENAI_COMPATIBLE_API_KEY`  | Yes      | API key from [the console](https://console.flatkey.ai/keys) |
| `OPENAI_COMPATIBLE_MODEL`    | No       | Default model; overridable per request                      |

Flatkey routes to upstream providers, so per-model availability follows the live
catalog rather than a fixed list. A machine-readable integration summary is
published at [https://flatkey.ai/SKILL.md](https://flatkey.ai/SKILL.md).

---

## Troubleshooting

**401 Unauthorized**
The key is missing or malformed. Keys start with `sk-fk-` and are
issued at [https://console.flatkey.ai/keys](https://console.flatkey.ai/keys). Confirm the value is exported in
the environment NeuroLink runs in.

**404 on chat completions**
Check that `OPENAI_COMPATIBLE_BASE_URL` ends with `/v1`. The gateway follows the
OpenAI path layout, so the version segment is part of the base URL.

**Model not found**
Model IDs must match the live catalog exactly. List what your key can reach:

```bash
npx @juspay/neurolink models --provider openai-compatible
```

**Empty or truncated responses**
Upstream providers apply their own limits. Try a different model from the
catalog to isolate whether the behaviour is model-specific.

---

## See Also

- [OpenAI-Compatible Providers Guide](openai-compatible.md)
- [OpenRouter Provider Guide](openrouter.md)
- [LiteLLM Provider Guide](litellm.md)
