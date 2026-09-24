---
title: TypeSafe (Jev) Provider Guide
description: The decision provider — typed, calibrated judgments instead of text, via TypeSafe's Jev model on either the direct API or the Vercel AI Gateway
keywords: typesafe, jev, decide, decision model, calibrated confidence, routing, system one
---

# TypeSafe (Jev) Provider Guide

**The only provider that serves `decide` rather than `generate`/`stream`** — it
returns typed, calibrated judgments and emits no text at all.

---

## Overview

TypeSafe's **Jev** is a "System One" model. You send one `state` plus a map of
named, typed questions; it returns one typed answer per question, all evaluated
in a single parallel pass. Nothing has to be parsed back out of prose, and every
`choice`/`score` answer carries a **calibrated** confidence rather than a
self-reported one.

Because it emits no text, `generate()` and `stream()` are not available and
`getAISDKModel()` throws — the same shape Voyage and Jina already use for
embedding-only providers. Its descriptor declares `inferenceKinds: ["decide"]`,
which keeps it out of auto-select and the health sweep, so those throws are
unreachable in normal use.

> This is not [`neurolink.evaluate()`](/docs/features/auto-evaluation), which
> scores an already-generated response with RAGAS scorers. Different feature,
> different word.

### Key Facts

- **Provider id**: `typesafe` (aliases: `jev`, `typesafe-ai`)
- **Inference kinds**: `decide` only — the single provider of the 40 that does
- **Tool calling**: none (`toolSupport: "none"`) — a decision model calls nothing
- **Health check**: `env-only`; it is never probed with a live generation
- **Default decide timeout**: 5000 ms (`timeouts.decideMs`)
- **Latency**: flat in question count — 1 question ~393 ms, 400 questions
  ~465 ms. Concurrent _requests_ queue instead, so batch every question into one
  call rather than fanning out.
- **Cost**: ~$0.042 per million input tokens, output billed at zero — about
  **$0.00002 per decision**. Output tokens _are_ reported — measured 21 for a
  single question, converging to ~17.5 per question in a batch of eight — they
  are simply not charged.
- **Accuracy is the trade**: 67.8% on TypeSafe's own 711-case benchmark against
  Opus 5's 73.1%. Right for decisions that are gated and reversible; wrong for
  final answers.

---

## Quick Start

### 1. Get an API key

Create one at [console.typesafe.ai/keys](https://console.typesafe.ai/keys).

### 2. Configure

```bash
export TYPESAFE_API_KEY=apikey_...      # the only switch
export TYPESAFE_MODEL=jev-latest        # optional
export TYPESAFE_BASE_URL=https://api.typesafe.ai  # optional
```

### 3. Use it

```typescript
import { NeuroLink, readDecisionChoice } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.tryDecide({
  state: ticketText, // a string OR structured JSON
  questions: {
    team: {
      type: "choice",
      instructions: "Which team should handle this?",
      criteria: {
        billing: "Payments, invoicing, refunds",
        technical: "Bugs, outages, integrations",
        sales: "Pricing, upgrades, new accounts",
      },
    },
    urgent: { type: "boolean", instructions: "Does this express urgency?" },
  },
});

const team = result && readDecisionChoice(result.answers, "team");
if (team && team.confidence >= 0.7) {
  assignTo(team.choice);
} else {
  assignToHumanTriage(); // low confidence is a signal, not an error
}
```

`tryDecide()` returns `null` on any failure. Use `decide()` when you want the
failure to surface; it throws a `ProviderError` whose `cause` carries a typed
`kind`.

### From the CLI

```bash
npx @juspay/neurolink decide "Refund request for a damaged item" \
  --questions '{"urgent":{"type":"boolean","instructions":"Is this urgent?"}}'
```

`neurolink decide [state]` calls `decide()` under the hood and reads
`TYPESAFE_API_KEY` from the environment like every other CLI command. See the
[CLI command reference](../../cli/commands.md#decide).

---

## The degradation contract

**Setting the key is the entire switch, and removing it is a complete undo.**
Every internal consumer of `decide` fails open: with no decision provider
configured, model routing, context budgeting, relevance compaction, tool routing
and RAG planning all behave exactly as they did before. There is no
configuration in which a missing, invalid, slow or unreachable decision model
changes NeuroLink's observable behaviour.

A credential the service does not accept disables that provider instance rather
than paying a round trip on every later call to be told so again.

---

## Two transports

The same model is reachable two ways, and the choice is made once in the
constructor.

|                     | Direct              | Vercel AI Gateway                             |
| ------------------- | ------------------- | --------------------------------------------- |
| Key                 | `TYPESAFE_API_KEY`  | `AI_GATEWAY_API_KEY`                          |
| Endpoint            | `api.typesafe.ai`   | `ai-gateway.vercel.sh/v4/ai/evaluation-model` |
| Endpoint override   | `TYPESAFE_BASE_URL` | `TYPESAFE_GATEWAY_URL`                        |
| Model named in      | request body        | `ai-model-id` header                          |
| Question vocabulary | `noul`              | `boolean`                                     |
| `confidence`        | on each answer      | on `providerMetadata`                         |
| Billed by           | TypeSafe            | Vercel                                        |

**Holding both keys keeps the direct transport**, so the confidence figures a
host already sees do not shift underneath it when a second key appears. Force
one with `TYPESAFE_TRANSPORT=direct|gateway` or
`credentials.typesafe.transport`. Either endpoint can be moved without a
release: `credentials.typesafe.baseURL` / `TYPESAFE_BASE_URL` for the direct
one, `credentials.typesafe.gatewayURL` / `TYPESAFE_GATEWAY_URL` for the
gateway route.

⚠️ **The gateway refuses every request — free credits included — until the
Vercel team has a credit card on file**, returning `403
customer_verification_required`. That is an account state, not a bad key, and it
arrives _before_ the model id is validated.

Full detail, including the measured error table and why the distribution peak is
not a substitute for the reported confidence, is in
[The `decide` inference type](/docs/features/decide-inference-type#two-transports).

---

## What NeuroLink uses it for

| Area                                                             | What the decision replaces                                      |
| ---------------------------------------------------------------- | --------------------------------------------------------------- |
| [Model routing](/docs/features/classifier-router-jev-strategy)   | difficulty + capabilities + risk + model pick in one round trip |
| [Model catalogue](/docs/features/classifier-router-catalog)      | one `choice` over the registry ranks all N candidates at once   |
| [Context budget](/docs/features/context-budget)                  | a rubric-placed scope reading lowers the compaction threshold   |
| [Relevance compaction](/docs/features/relevance-compaction)      | per-message keep/drop, plus a gate on the generated summary     |
| [Tool / MCP routing](/docs/features/tool-routing-decision-model) | one `boolean` per server, replacing a 15s LLM call at ~400 ms   |
| [RAG retrieval](/docs/features/rag-retrieval-planning)           | per-query `topK` / hybrid / graph / rerank planning             |

---

## Limits and gotchas

- **Two input ceilings**, both enforced by the service: `state` plus the longest
  single question ≈ **33,000 tokens**, and `state` plus _all_ questions ≈
  **64,000**. Exceeding either returns `max_tokens_exceeded` **with no message
  at all** — the provider supplies a real sentence in its place.
- **Batch, never fan out.** Latency is flat in question count but concurrent
  requests queue, so a second round trip costs far more than a hundred extra
  questions.
- **A `boolean` carries no confidence of its own.** Use
  `decisionBooleanConfidence(p)` — distance from a coin flip, so 0.5 → 0 and
  0/1 → 1.
- **403 vs 401 are inverted** on the direct API, and from TypeSafe's own docs: a
  _missing_ `Authorization` header returns **403**, an _invalid_ key returns
  **401**. The gateway does not share this quirk.

---

## Troubleshooting

| Symptom                              | Cause                                                                 | Fix                                                                           |
| ------------------------------------ | --------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `tryDecide()` always returns `null`  | No key, or the key was rejected once and the instance disabled itself | Check `TYPESAFE_API_KEY`; construct a new instance after fixing it            |
| `max_tokens_exceeded`                | One of the two input ceilings                                         | Shorten `state`, or split questions across calls — but prefer shrinking state |
| `403 customer_verification_required` | Gateway transport, no card on the Vercel team                         | Add a payment method, or use the direct transport                             |
| Routing never changes                | A `modelPool` is configured, which owns selection outright            | See [Provider Orchestration](/docs/features/provider-orchestration)           |

---

## See also

- [The `decide` inference type](/docs/features/decide-inference-type) — the full reference
- [Model routing with a decision model](/docs/features/classifier-router-jev-strategy)
- [Provider setup overview](/docs/getting-started/provider-setup)
