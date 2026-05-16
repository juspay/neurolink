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

## See Also

- [Together AI Provider](/docs/getting-started/providers/together-ai)
- [Fireworks Provider](/docs/getting-started/providers/fireworks)
