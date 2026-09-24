---
title: Laya Provider Guide
description: An open-weights decision provider — typed, calibrated judgments from Convai Innovations' Laya, at any Laya server or LiteLLM proxy route you configure
keywords: laya, decide, decision model, open weights, litellm, calibrated confidence, system one
---

# Laya Provider Guide

**The second provider of `decide`** — the same typed `boolean` / `choice` /
`score` answers as [TypeSafe's Jev](typesafe.md), from an open-weights model
you can run yourself. It emits no text at all.

---

## Overview

Laya is Convai Innovations' Apache-2.0 "System One" decision model. You send
one `state` plus named, typed questions; an encoder answers every question in a
single forward pass and returns a probability distribution for each. NeuroLink
calls whatever base URL you configure — a Laya server, or a LiteLLM proxy with a
pass-through route to one. There is no built-in endpoint.

### Key Facts

|                       |                                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------- |
| Inference type        | `decide` only                                                                                     |
| Checkpoints           | `typed-decisions` (default, fine-tuned for typed decisions), `multilingual`, `english`, or `auto` |
| Input window          | 1,024 tokens (`typed-decisions`, `multilingual`); 512 (`english`)                                 |
| Questions per request | up to 64                                                                                          |
| Endpoint              | `<base URL>/predict`; the base URL is required, with no default                                   |
| Precedence            | used automatically when its key and base URL are set and no TypeSafe key is                       |

---

## Quick Start

### 1. Get an endpoint and a key

Run a Laya server (see [below](#running-your-own-laya-server)), or use a LiteLLM
proxy with a pass-through route to one. On LiteLLM, create a virtual key and add
the route's `/predict` path (and `/health`, if you want to probe it) to the
key's **Allowed Routes**; a key without them is refused with a 403
`Key/team not allowed to access passthrough route`.

### 2. Configure

Both the base URL and the key are required. Set them in the environment:

```bash
export LAYA_BASE_URL=https://your-proxy.example.com/laya  # NeuroLink calls <base>/predict
export LAYA_API_KEY=sk-...                                # the key your endpoint accepts
export LAYA_MODEL=typed-decisions                         # optional
```

or in the config passed to the SDK, exactly as for any other provider. Values
passed per call override the constructor's, which override the environment:

```typescript
const neurolink = new NeuroLink({
  credentials: {
    laya: {
      baseURL: "https://your-proxy.example.com/laya",
      apiKey: process.env.MY_LAYA_KEY,
    },
  },
});
```

### 3. Use it

```typescript
import { NeuroLink, readDecisionChoice } from "@juspay/neurolink";

const neurolink = new NeuroLink();
const result = await neurolink.decide({
  provider: "laya",
  state: "We were billed twice for March. Please refund it today.",
  questions: {
    team: {
      type: "choice",
      instructions: "Which team should handle this?",
      criteria: {
        billing: "Payments and refunds",
        technical: "Bugs",
        sales: "Pricing",
      },
    },
    urgent: { type: "boolean", instructions: "Is this urgent?" },
  },
});
const team = readDecisionChoice(result.answers, "team");
```

### From the CLI

```bash
neurolink decide "We were billed twice for March." --provider laya \
  --questions '{"urgent":{"type":"boolean","instructions":"Is this urgent?"}}'
```

---

## When NeuroLink uses it

Every built-in consumer of `decide` — model routing, relevance-driven
compaction, tool routing and RAG planning — asks for the default decision
provider. That is the first one that is configured — in the environment or in
the `credentials` passed to the SDK — and TypeSafe comes first. TypeSafe has two
keys, `TYPESAFE_API_KEY` and `AI_GATEWAY_API_KEY` (its Vercel AI Gateway
route), and either one counts. Laya counts only with both its key and its base
URL. So:

- **A TypeSafe key, plus Laya's key and base URL:** built-in features use
  TypeSafe; Laya runs only where a caller asks for `provider: "laya"`.
- **Only Laya's key and base URL:** built-in features use Laya.
- **A Laya key with no base URL:** Laya is not configured. Built-in features
  ignore it, and `provider: "laya"` fails with `Laya requires a base URL`.
- **None of them:** everything behaves exactly as it did without a decision
  model.

---

## Limits

**The window is small.** Laya's encoders read 1,024 tokens, and 512 on the
`english` checkpoint, against roughly 33,000 for Jev. Part of that is reserved
for each question and its options, so NeuroLink allows about 768 tokens of
state on `typed-decisions` and `multilingual`, and 320 on `english`, `auto` and
any model name it does not recognise. Laya's server does not refuse a longer
state — it answers from the start of it and says nothing — so NeuroLink
refuses it instead, before any network call, with `max_tokens_exceeded`.

The size is an estimate, not Laya's tokenizer: about four characters per token
for ASCII text, and 1.5 tokens per character for other scripts (0.6 on
`multilingual`), calibrated against a live Laya 0.3.5 server. It errs toward refusing. Built-in
consumers treat a refusal as "carry on as before", which means long-prompt
model routing usually falls back to the heuristic when Laya is the only
decision provider.

**Many options degrade it.** A `choice`'s options share a fixed token budget,
so accuracy drops past about 20 options; some Laya servers also reject a
question whose options overflow the budget, as `invalid_request`.

**Pick the checkpoint deliberately.** Laya's own benchmark puts its general
`english` and `multilingual` checkpoints close to chance on typed decisions
without fine-tuning; `typed-decisions` is the fine-tuned one, which is why it is
the default.

---

## Errors

| Reply                                           | Kind                                                    | Retried |
| ----------------------------------------------- | ------------------------------------------------------- | ------- |
| 401 / 403 from the proxy                        | `authentication` — the provider instance stops retrying | no      |
| 400 / 422 from Laya                             | `invalid_request`, with Laya's reason                   | no      |
| 413 from Laya                                   | `max_tokens_exceeded`                                   | no      |
| 429                                             | `rate_limit`                                            | yes     |
| 503                                             | `overloaded`                                            | yes     |
| other 5xx                                       | `server`                                                | yes     |
| more questions or state than Laya reads (local) | `max_tokens_exceeded`, with no network call             | no      |
| no base URL configured (local)                  | `invalid_request`, with no network call                 | no      |

LiteLLM's 401 text echoes a masked copy of the rejected key and its hash; the
provider drops that part before the message reaches a log or an error.

---

## Running your own Laya server

Laya's example server exposes the same `/predict` route. Point
`LAYA_BASE_URL` at it:

```bash
pip install "laya[serve]"
python examples/server.py            # from the Laya repository; serves :8000
export LAYA_BASE_URL=http://127.0.0.1:8000
```

---

## Troubleshooting

- **`Laya requires a base URL`** — set `LAYA_BASE_URL`, or pass
  `credentials.laya.baseURL`. There is no default endpoint.
- **`Authentication failed`** — the proxy rejected the key. Check it in the
  LiteLLM Dashboard, including its Allowed Routes. The provider instance does
  not retry after a rejection.
- **A 403 with `error code: 1010`** — Cloudflare in front of your proxy blocked
  the client by its signature. Node's `fetch` is accepted; a proxy or agent that
  rewrites the user agent may not be.
- **`exceeded the provider's token limit`** — the state is larger than Laya
  reads. Shorten it, or configure TypeSafe for long inputs.
- **Built-in routing never uses Laya** — a TypeSafe key is also set and takes
  precedence, or Laya has no base URL.

---

## See also

- [The `decide` inference type](../../features/decide-inference-type.md)
- [TypeSafe (Jev) Provider Guide](typesafe.md)
- [Laya on GitHub](https://github.com/NandhaKishorM/laya)
