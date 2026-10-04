---
title: Cloudflare Workers AI Provider Guide
description: Run open-model inference on Cloudflare's global edge via Workers AI
keywords: cloudflare, workers-ai, llama, edge inference, gpu cluster
---

# Cloudflare Workers AI Provider Guide

**Open-model inference at the edge via Cloudflare Workers AI**

---

## Overview

[Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/)
serves Meta Llama, Mistral, and other open models from Cloudflare's
global GPU cluster. NeuroLink talks to the OpenAI-compatible endpoint.

### Key Facts

- **Protocol**: OpenAI-compatible (`/v1/chat/completions`)
- **Default base URL**: `https://api.cloudflare.com/client/v4/accounts/{accountId}/ai/v1`
- **Default model**: `@cf/meta/llama-3.3-70b-instruct-fp8-fast`
- **Streaming**: Yes
- **Tool calling**: Limited (model-dependent)

---

## Quick Start

### 1. Get Credentials

You need both:

- A Cloudflare **Account ID** (Cloudflare dashboard → right sidebar)
- A Workers AI **API token** with the `Workers AI Read & Write`
  permission (Profile → API Tokens → Create Token)

### 2. Configure

```bash
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_API_KEY=your-workers-ai-token
CLOUDFLARE_MODEL=@cf/meta/llama-3.3-70b-instruct-fp8-fast
```

### 3. Generate

```typescript
import { NeuroLink } from "@juspay/neurolink";
const ai = new NeuroLink();
const result = await ai.generate({
  provider: "cloudflare",
  input: { text: "Why is Cloudflare's edge network significant?" },
});
console.log(result.content);
```

---

## Supported Models (sample)

| Model ID                                   | Notes          |
| ------------------------------------------ | -------------- |
| `@cf/meta/llama-3.3-70b-instruct-fp8-fast` | Default        |
| `@cf/meta/llama-3.1-70b-instruct`          | Llama 3.1 70B  |
| `@cf/meta/llama-3.1-8b-instruct`           | Fast tier      |
| `@cf/meta/llama-3.2-11b-vision-instruct`   | Vision-capable |

Browse: [https://developers.cloudflare.com/workers-ai/models](https://developers.cloudflare.com/workers-ai/models)

---

## CLI Usage

```bash
pnpm run cli generate "..." --provider cloudflare
```

---

## Provider Aliases

| Alias        | Example                 |
| ------------ | ----------------------- |
| `cloudflare` | `--provider cloudflare` |
| `cf`         | `--provider cf`         |

---

## Configuration Reference

| Environment Variable    | Required | Default                                    |
| ----------------------- | -------- | ------------------------------------------ |
| `CLOUDFLARE_ACCOUNT_ID` | Yes      | —                                          |
| `CLOUDFLARE_API_KEY`    | Yes      | —                                          |
| `CLOUDFLARE_MODEL`      | No       | `@cf/meta/llama-3.3-70b-instruct-fp8-fast` |

---

## Also configures decisions

`CLOUDFLARE_API_KEY` and `CLOUDFLARE_ACCOUNT_ID` also configure a separate
provider, the [Cloudflare Clef provider](cloudflare-clef.md) (`cloudflare-clef`),
which serves `decide()` and emits no text. It is the last decision provider
NeuroLink falls back to: built-in features that call `decide()` use the first one
configured, in the order TypeSafe, Laya, XOR, Perplexity, then Clef. So a host
that set these two variables only for this text provider, and has no other
decision provider configured, has Clef as its default decision provider, and no
switch turns that off while they are set.

`credentials.cloudflare` does **not** configure `decide`; Clef reads its own
slice, `credentials.cloudflareClef`. The text provider itself is unchanged: it
still serves `generate()` and `stream()` with the same variables, models and base
URL. See
[One token, two providers](cloudflare-clef.md#one-token-two-providers).

---

## See Also

- [Cloudflare Clef Provider](cloudflare-clef.md) — typed `decide()` judgments on the same token and account id
- [Together AI Provider](/docs/getting-started/providers/together-ai)
- [Fireworks Provider](/docs/getting-started/providers/fireworks)
