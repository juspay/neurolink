---
title: OpenAI Decisions Provider Guide
description: A hosted decision provider that also reads images — typed judgments with probabilities from OpenAI's Decisions API (public beta), reached at api.openai.com with the same OPENAI_API_KEY as the OpenAI chat provider
keywords: openai, openai-decisions, gpt-6-luna, decide, decision model, images, confidence, probabilities, decisions api, public beta
---

# OpenAI Decisions Provider Guide

**A provider of `decide`** — the same typed `boolean` / `choice` / `score`
answers as [TypeSafe's Jev](typesafe.md), [Laya](laya.md), [XOR](xor.md),
[Perplexity](perplexity-decider.md) and [Cloudflare Clef](cloudflare-clef.md),
from OpenAI's Decisions API, and it also reads images. It emits no text at all.

> This is not the [OpenAI chat provider](openai.md) (`openai`), which serves
> `generate()` and `stream()`. The two share one API key, which has a
> consequence worth reading before you set it. See
> [What is sent to OpenAI](#what-is-sent-to-openai) and
> [One key, two providers](#one-key-two-providers).

> **Public beta.** OpenAI documents the Decisions API as a public beta, so its
> wire may change before general availability. NeuroLink lists its one model as
> `preview`. Much about the endpoint is not established: see
> [What is not established](#what-is-not-established). No request in this
> guide, or in NeuroLink's tests, records a reply from the live endpoint; the
> replies in the tests are stand-ins built from OpenAI's published examples.

---

## Overview

`gpt-6-luna` is the one model OpenAI's Decisions guide lists for the endpoint.
You send one `input` plus named, typed questions, and optionally images. The
endpoint returns a typed answer for each question, with a probability instead of
a sentence. NeuroLink calls OpenAI's public endpoint, so a key alone configures
it: there is no base URL to set.

### Key Facts

|                       |                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Provider id           | `openai-decisions` (no aliases) — distinct from `openai`, the chat provider                                                                                                                                                                                                                                                                                                                                                             |
| Inference type        | `decide` only                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Model                 | `gpt-6-luna`; `OPENAI_DECISIONS_MODEL` or a per-call `model` sets it                                                                                                                                                                                                                                                                                                                                                                    |
| Key                   | `OPENAI_API_KEY`, shared with the OpenAI chat provider, or `credentials.openaiDecisions.apiKey`                                                                                                                                                                                                                                                                                                                                         |
| Endpoint              | `https://api.openai.com/v1/decisions`; `OPENAI_DECISIONS_BASE_URL` can name another origin                                                                                                                                                                                                                                                                                                                                              |
| Media                 | images as inline data URLs, up to 8 per request (NeuroLink's own allowance, not OpenAI's); the endpoint has no video part                                                                                                                                                                                                                                                                                                               |
| Request body cap      | 32 MiB on the encoded request, NeuroLink's own allowance, not OpenAI's                                                                                                                                                                                                                                                                                                                                                                  |
| State window          | 922,000 tokens is reported as an advisory figure (the model page's input figure); NeuroLink never refuses on it                                                                                                                                                                                                                                                                                                                         |
| Questions per request | 200, the figure in OpenAI's Python SDK, read from documentation on 2026-10-17 and not tried against the live endpoint; `tryDecide()` splits a longer set into requests of at most 200, and a direct `decide()` is not refused locally                                                                                                                                                                                                   |
| Default timeout       | 10 seconds for any number of questions; `timeoutMs` or `--timeout` replaces it. A starting point, not a measurement                                                                                                                                                                                                                                                                                                                     |
| Cost                  | priced per input token, input only; see [Cost](#cost) for the rate, its source and its date                                                                                                                                                                                                                                                                                                                                             |
| Precedence            | used automatically only when none of TypeSafe, Laya, XOR, SubQ, Perplexity or Cloudflare Clef is configured: the seventh of eight, ahead of only [ScaleDown](scaledown.md). Its environment key is skipped for this while `OPENAI_BASE_URL`, `OPENAI_API_BASE` or `credentials.openai.baseURL` names a host other than `https://api.openai.com` (a gateway's key); see [A gateway's key](#a-gateways-key-is-never-used-for-the-default) |
| Status                | public beta; NeuroLink's model status is `preview`                                                                                                                                                                                                                                                                                                                                                                                      |

---

## Quick Start

### 1. Get a key

Create one in the [OpenAI dashboard](https://platform.openai.com/api-keys). It is
the same kind of key the OpenAI chat provider uses.

### 2. Configure

Set the key in the environment:

```bash
export OPENAI_API_KEY=sk-...                              # the key; see "One key, two providers"
export OPENAI_DECISIONS_MODEL=gpt-6-luna                  # optional
export OPENAI_DECISIONS_BASE_URL=https://api.openai.com   # optional; an origin
```

or in the config passed to the SDK, exactly as for any other provider. Values
passed per call override the constructor's, which override the environment:

```typescript
// For the whole instance
const neurolink = new NeuroLink({
  credentials: {
    openaiDecisions: { apiKey: process.env.MY_OPENAI_DECISIONS_KEY },
  },
});

// Or for one call
await neurolink.decide({
  provider: "openai-decisions",
  credentials: {
    openaiDecisions: { apiKey: process.env.MY_OPENAI_DECISIONS_KEY },
  },
  state: "The headphones sound great, but the battery died after two weeks.",
  questions: {
    defect: { type: "boolean", instructions: "Is a defect reported?" },
  },
});
```

`credentials.openaiDecisions` is its own slice (`apiKey` and `baseURL`). A key
passed as `credentials.openai` belongs to the chat provider and does not
configure this one. `OPENAI_BASE_URL`, which moves the chat provider, never
routes a decision, and neither does `OPENAI_MODEL` pick its model; the overrides
for this provider are `OPENAI_DECISIONS_BASE_URL` and `OPENAI_DECISIONS_MODEL`.
`OPENAI_BASE_URL`, `OPENAI_API_BASE` and the SDK's `credentials.openai.baseURL`
are read for one purpose only: to tell whether the environment key is OpenAI's
own, so that a gateway's key is not used for the default; see
[A gateway's key](#a-gateways-key-is-never-used-for-the-default).

### 3. Use it

```typescript
import { NeuroLink, readDecisionChoice } from "@juspay/neurolink";

const neurolink = new NeuroLink();
const result = await neurolink.decide({
  provider: "openai-decisions",
  state: {
    title: "Battery died after two weeks",
    review:
      "The headphones sound great, but the battery stopped charging after two weeks.",
  },
  questions: {
    defect: {
      type: "boolean",
      instructions: "Does the review report a defect?",
    },
    sentiment: {
      type: "choice",
      instructions: "What is the overall sentiment of the review?",
      criteria: {
        positive: "Mostly satisfied",
        mixed: "Praise and complaints in one review",
        negative: "Mostly dissatisfied",
      },
    },
    severity: {
      type: "score",
      instructions: "How severe is the reported problem?",
      criteria: ["Cosmetic", "Inconvenient", "Product unusable"],
    },
  },
});
const sentiment = readDecisionChoice(result.answers, "sentiment");
```

A `boolean` answer carries a probability and no confidence of its own. A `choice`
or `score` answer carries the confidence the endpoint reports; when a reply
omits it, NeuroLink uses the highest probability in that answer's distribution
instead. Whether the endpoint's confidence is calibrated is not established, so
tune a threshold on it against your own labelled data.

### From the CLI

The CLI reads the same environment variables:

```bash
neurolink decide "The battery stopped charging after two weeks." \
  --provider openai-decisions \
  --questions '{"defect":{"type":"boolean","instructions":"Is a defect reported?"}}'
```

The text output ends with a `Cost:` line, priced from the input tokens the
endpoint reports.

---

## How a question is sent

OpenAI's wire differs from the one the other decide providers share, so
NeuroLink translates both ways. You write the same `boolean`, `choice` and
`score` questions as for any provider.

| NeuroLink           | Sent to `/v1/decisions`                                                                               |
| ------------------- | ----------------------------------------------------------------------------------------------------- |
| `state` (text)      | `input`, the text as given                                                                            |
| `state` (an object) | `input`, the object as JSON text                                                                      |
| `state` with images | `input` as one user message: an `input_text` part, then one `input_image` part per image              |
| question id         | the question's `name`, echoed back on its answer                                                      |
| `boolean`           | `type: "predicate"` with `instructions`                                                               |
| `choice`            | `type: "choice"` with `choices`: one `{ value, description }` per option, in the order you wrote them |
| `score`             | `type: "score"` with `levels`: one `{ label, description }` per level, lowest first                   |
| the model           | `model` in the body (`gpt-6-luna` unless you set another)                                             |

A `boolean` question has no per-side text on this wire, so each side you give in
`criteria` is appended to its `instructions`, with fixed wording:

```
<instructions>

Answer true when: <criteria.true>
Answer false when: <criteria.false>
```

Either line is left out when you did not give that side. A `choice` option whose
text is `null` is sent without a `description`. For a `score`, the `label` is the
level's index (`"0"`, `"1"`, ...) and the rubric text goes in `description`, so a
returned level and its label cannot disagree about which level it is. Option names
that look like integers (`"1"`, `"2"`) are reordered by JavaScript's key order, as
for every decide provider.

### Worked example

These are the three examples from
[OpenAI's Decisions guide](https://developers.openai.com/api/docs/guides/decisions)
(saved 2026-10-07), as NeuroLink sends and reads them. The questions:

```typescript
const result = await neurolink.decide({
  provider: "openai-decisions",
  state: "Customer photo and complaint text go here.",
  questions: {
    visible_damage: {
      type: "boolean",
      instructions:
        "Does the product have visible damage, such as a crack, tear, or dent? Ignore shadows and damage to the packaging.",
    },
    department: {
      type: "choice",
      instructions: "Which department should handle this complaint?",
      criteria: {
        billing: "Payments, invoices, and refunds.",
        technical: "Problems using the product.",
        shipping: "Delivery and tracking.",
        other: "Requests outside these categories.",
      },
    },
    severity: {
      type: "score",
      instructions: "How severe is this issue?",
      criteria: [
        "Appearance only; no lost functionality.",
        "A task fails, but another way works.",
        "A task fails with no workaround.",
      ],
    },
  },
});
```

go out as:

```json
{
  "model": "gpt-6-luna",
  "input": "Customer photo and complaint text go here.",
  "questions": [
    {
      "type": "predicate",
      "name": "visible_damage",
      "instructions": "Does the product have visible damage, such as a crack, tear, or dent? Ignore shadows and damage to the packaging."
    },
    {
      "type": "choice",
      "name": "department",
      "instructions": "Which department should handle this complaint?",
      "choices": [
        {
          "value": "billing",
          "description": "Payments, invoices, and refunds."
        },
        { "value": "technical", "description": "Problems using the product." },
        { "value": "shipping", "description": "Delivery and tracking." },
        {
          "value": "other",
          "description": "Requests outside these categories."
        }
      ]
    },
    {
      "type": "score",
      "name": "severity",
      "instructions": "How severe is this issue?",
      "levels": [
        {
          "label": "0",
          "description": "Appearance only; no lost functionality."
        },
        {
          "label": "1",
          "description": "A task fails, but another way works."
        },
        { "label": "2", "description": "A task fails with no workaround." }
      ]
    }
  ]
}
```

The guide's example answers, read back by `name`:

| Question         | Answer in the guide                                                                       | `result.answers[name]`                                                                                                                       |
| ---------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `visible_damage` | `probability` 0.92                                                                        | `{ type: "boolean", probability: 0.92 }`                                                                                                     |
| `department`     | `choice` `billing`; probabilities 0.95 / 0.02 / 0.01 / 0.02; `confidence` 0.93            | `{ type: "choice", choice: "billing", confidence: 0.93, probabilities: { billing: 0.95, technical: 0.02, shipping: 0.01, other: 0.02 } }`    |
| `severity`       | `score` 1.1; probabilities `0.1` / `0.7` / `0.2` for levels 0, 1 and 2; `confidence` 0.55 | `{ type: "score", score: 1.1, confidence: 0.55, probabilities: { "0": 0.1, "1": 0.7, "2": 0.2 }, legend: { "0": "Appearance only; …", … } }` |

The score is the probability-weighted average of the level indices (0 × 0.1 +
1 × 0.7 + 2 × 0.2 = 1.1), the same meaning as NeuroLink's score everywhere. The
endpoint returns no legend, so NeuroLink builds `legend` from the rubric you
sent, keyed by level index, and a level with no text has the empty string. A
level `label` in the reply is not read: the integer `value` identifies the level.

### What a reply must look like

NeuroLink checks each answer against the question it asked and drops an answer
that fails any check, with a warning that names the question and never quotes the
reply. It does not repair or default an answer, and the other answers in the same
reply survive. An answer is dropped when:

- it has no `name`, or a `name` NeuroLink did not ask, or the same `name` appears
  more than once (every answer under a repeated name is dropped);
- its `type` is not the type asked (`predicate`, `choice` or `score`);
- a probability is not a number from 0 to 1;
- a `choice`'s `choice` is not one of the options asked, or its `probabilities` do
  not list each asked option exactly once;
- a `score`'s `probabilities` do not list each level index exactly once as an
  integer `value`, or its `score` is not a number from 0 to the highest index;
- its `confidence` is a number outside 0 to 1 (a missing or non-numeric one is
  replaced by the highest probability in the distribution);
- its probabilities do not sum to 1, within a tolerance of 0.01 (with a rounding
  slack of 1e-9 for floating point). Whether OpenAI rounds the probabilities it
  returns, and by how much, is not established; an answer whose rounding drifts
  past the tolerance is dropped like any other.

A `refusal` answer (`type: "refusal"`) means the model declined that question.
NeuroLink has no refusal answer type: the question is simply absent from
`result.answers`, and a warning records `the model declined to answer "<id>"`.
A question the reply never mentions is absent too, without a warning. Every
internal consumer treats an absent answer as no decision. A reply whose `answers`
is not an array fails as a `server` error.

---

## Images

OpenAI's Decisions API reads images, and no video part exists. Pass them as for
any decide provider that reads images:

```typescript
await neurolink.decide({
  provider: "openai-decisions",
  state: "A product photo from a listing.",
  images: ["./photo.png"],
  questions: {
    damaged: {
      type: "boolean",
      instructions: "Is the product visibly damaged?",
    },
  },
});
```

or `neurolink decide ... --provider openai-decisions --image ./photo.png` from the
CLI. An image can be a `Buffer`, a file path or a `data:` URL; a remote `http(s)`
URL is not fetched for you. Every image is sent inline as a base64 data URL in an
`input_image` part. The endpoint takes no hosted URL and no file id, and
NeuroLink sets no `detail`.

NeuroLink refuses these before any request, as a non-retried `invalid_request`:

- more than 8 images, which is NeuroLink's own allowance (the same number it
  allows XOR and Perplexity), not a limit OpenAI documents;
- a video, because the endpoint has no video part;
- an image NeuroLink cannot recognise from its bytes, a file that cannot be read,
  or an encoded request body over 32 MiB (also NeuroLink's own number).

The accepted image formats, the per-request image limit and the body cap on
OpenAI's side are not established. NeuroLink does not check the format against a
list of OpenAI's, because it has none to check against.

---

## When NeuroLink uses it

Every built-in consumer of `decide` asks for the default decision provider. That
is the first one that is configured, in the environment or in the `credentials`
passed to the SDK, in the order TypeSafe, Laya, XOR, [SubQ](subq.md), Perplexity,
[Cloudflare Clef](cloudflare-clef.md), OpenAI Decisions, then
[ScaleDown](scaledown.md). TypeSafe counts
with either of its keys, `TYPESAFE_API_KEY` or `AI_GATEWAY_API_KEY`. Laya and XOR
each count only with both their key and their base URL. Perplexity counts with
its key alone. Cloudflare Clef counts only with both `CLOUDFLARE_API_KEY` and
`CLOUDFLARE_ACCOUNT_ID`. OpenAI Decisions counts with its key alone, a non-blank
`OPENAI_API_KEY` or `credentials.openaiDecisions.apiKey`, except that a key found
only in the environment does not count while `OPENAI_BASE_URL`,
`OPENAI_API_BASE` or `credentials.openai.baseURL` names a host other than `https://api.openai.com`: see
[A gateway's key is never used for the default](#a-gateways-key-is-never-used-for-the-default).
ScaleDown counts with its key alone, `SCALEDOWN_API_KEY`, which no other provider
reads. A caller can always name it with `provider: "openai-decisions"`. So:

- **Only an OpenAI key, and no base URL for another host:** built-in features use
  OpenAI Decisions.
- **An OpenAI key beside `OPENAI_BASE_URL`, `OPENAI_API_BASE` or `credentials.openai.baseURL` naming a gateway:**
  the key is taken to be the gateway's, and built-in features behave exactly as
  they did without a decision model, unless `OPENAI_DECISIONS_BASE_URL` is set or
  a `credentials.openaiDecisions` key or base URL is passed.
- **An OpenAI key, plus any key or credentials that configure an earlier provider:**
  built-in features use the earlier provider, in the order above. OpenAI
  Decisions runs only where a caller asks for `provider: "openai-decisions"`.
- **An OpenAI key, plus `SCALEDOWN_API_KEY`:** built-in features use OpenAI
  Decisions, which comes ahead of ScaleDown. ScaleDown runs only where a caller
  asks for `provider: "scaledown"`.
- **A key for the chat provider only:** the same as the first case. The key is
  shared, so the chat provider's key also configures this one. See
  [One key, two providers](#one-key-two-providers).
- **None of TypeSafe, Laya, XOR, SubQ, Perplexity, Cloudflare Clef, OpenAI Decisions
  or ScaleDown configured:** everything behaves exactly as it did without a decision model.

The classifier router's `auto` gate counts the credentials given to the
`NeuroLink` constructor, the environment and the request's own per-call
credentials, so a `credentials.openaiDecisions` passed on a single call can make
`auto` pick `jev`. The decision goes to that account only when no provider ahead
of OpenAI Decisions is configured; otherwise it goes to the earlier provider, as
in the cases above, because per-call credentials add a provider and do not pin
one. The other
consumers NeuroLink wires itself that run inside a `generate()` or `stream()`
call (tool routing and compaction) forward that call's `credentials` to the
decision too. Compaction triggered by `compactSession()`, which has no request,
uses the constructor's credentials and the environment.

Where the built-in consumers use the default provider (what each one sends is
listed in [What is sent to OpenAI](#what-is-sent-to-openai)):

| Area                                                             | What the decision replaces                                      |
| ---------------------------------------------------------------- | --------------------------------------------------------------- |
| [Model routing](/docs/features/classifier-router-jev-strategy)   | difficulty + capabilities + risk + model pick in one round trip |
| [Model catalogue](/docs/features/classifier-router-catalog)      | one `choice` over the registry ranks all N candidates at once   |
| [Context budget](/docs/features/context-budget)                  | a rubric-placed scope reading lowers the compaction threshold   |
| [Relevance compaction](/docs/features/relevance-compaction)      | per-message keep/drop, plus a gate on the generated summary     |
| [Tool / MCP routing](/docs/features/tool-routing-decision-model) | one `boolean` per server, replacing a 15s LLM call              |
| [RAG retrieval](/docs/features/rag-retrieval-planning)           | per-query `topK` / hybrid / graph / rerank planning             |

Each is fail-open: any refusal, timeout or error leaves behaviour as it was.
Each also records a `model.decision` span, so a decision path that has stopped
working is visible rather than indistinguishable from one never configured. The
speech-to-text correction check also asks for the default decision provider, for
a host that passes a dictionary to `transcribe()`; see below.

Calling it yourself is the other use. It suits the same work as any decision
model: routing, classifying and grading against a rubric, gating an action on a
threshold, and the same questions about an image. It is wrong for a final answer
a user reads, or anything that needs a rationale: a decision carries a
probability, never an explanation. See [the `decide` inference
type](../../features/decide-inference-type.md).

---

## What is sent to OpenAI

OpenAI receives the `state` and the questions of every decision made on your
behalf. The questions are NeuroLink's fixed wording, plus text from your own
conversation where a consumer quotes it; the `state` is where your text goes.
This is what each built-in consumer sends and what turns it on, read from the
code:

- **Model routing.** One request behind the router, the model catalogue and the
  per-request context budget.
  - _Sends:_ the first 8,000 characters of the prompt of the call being routed,
    plus whether tools are available, whether the request includes images, the
    estimated input tokens, the requested thinking level, whether a session is
    bound and how many prior messages the caller passed in. When the pool has
    more than one model, the questions carry the ids and descriptions of the
    models in it. The images, the session id and the conversation itself are not
    sent.
  - _Turned on by:_ `classifierRouter.enabled` with a `pool`: **an opt-in.** With
    the default `classifier: "auto"`, a configured decision provider selects the
    decision strategy. `classifier: "heuristic"` or `"llm"` never calls a
    decision provider. A call that pins both `provider` and `model` is not
    routed.
- **Relevance compaction.** Stage 0 of context compaction.
  - _Sends:_ the current request (first 4,000 characters) and, for each earlier
    user or assistant message that is plain text (not a tool call or result, a
    summary or a pinned skill), its role and its first 1,200 characters. That
    text travels twice, once in the state and once in the message's question. By
    default the six most recent messages are never sent
    (`contextRelevance.protectRecent`), and at most 300 are asked about.
  - _Turned on by:_ **nothing beyond a configured decision provider.** It runs
    inside context compaction, which starts when a conversation outgrows its
    context budget.
- **Summary-quality gate.** Guards the summarization stage of compaction.
  - _Sends:_ the generated summary (first 12,000 characters) and the last 60
    messages it replaced, each with its role and its first 1,200 characters.
  - _Turned on by:_ **nothing beyond a configured decision provider.** It runs
    after the summarization stage has written a summary.
- **Tool / MCP routing.**
  - _Sends:_ the routing query, at most 10,000 characters: the current query,
    preceded by up to the six most recent user and assistant text turns. Also,
    for each routable server, its name, its description (or its tool names, when
    it has none) and its tool count. One question per server, up to 200,
    quotes the same.
  - _Turned on by:_ `toolRouting.enabled` with a `servers` catalogue and at least
    two routable servers: **an opt-in.**
- **RAG retrieval planning.**
  - _Sends:_ the search query (first 4,000 characters). The retrieved passages
    are not sent.
  - _Turned on by:_ passing a `decide` function to `RAGPipeline` or
    `createRAGPipeline`: **an opt-in, by wiring.** The `rag: { files }`
    shortcut on `generate()` and `stream()` never does.
- **Speech-to-text correction.** The dictionary guard of
  [`transcribe()`](../../features/transcribe.md).
  - _Sends:_ the first 4,000 characters of the transcript, the caller's one-line
    `context` (or a fixed default), and, per dictionary candidate, the heard word
    and the dictionary term and its `meaning`.
  - _Turned on by:_ passing a `correction` dictionary to `transcribe()` or
    `transcribeStream()` with `guard` left at its default, `"decide"`. A host
    that sets `OPENAI_API_KEY` only for Whisper (the speech-to-text provider,
    which reads the same variable) and passes a dictionary therefore sends the
    transcript text to a second OpenAI endpoint. `guard: "none"` never calls a
    decision provider.

So model routing, tool routing and RAG planning need an opt-in, and relevance
compaction, the summary gate and (with a dictionary) the transcript guard need
none. A call you make yourself to `neurolink.decide()` sends the `state`,
`questions` and `images` you pass, to the provider you name or to the default
one.

NeuroLink declares a cap of 200 questions per request for this provider. The
figure is from OpenAI's Python SDK, whose type for the `questions` field reads
"Ask 1–200 questions about the input" (`src/openai/types/decision_create_params.py`
in `openai/openai-python`, read on 2026-10-17); OpenAI's Decisions guide states
no number. `tryDecide()`, which every built-in consumer calls, therefore splits a
longer set into requests of at most 200 questions, keeps the questions in the
order given, runs up to four requests at a time and joins the answers. The state
(and any images) travels with every request, so a split set pays for the state's
input tokens once for each request. Relevance compaction can ask about up to 300
messages, which goes out as one request of 200 questions and one of the rest;
tool routing asks about up to 200 servers, which fits in one. A request the
endpoint refuses loses only its own questions, and the consumer carries on
without that decision. Questions a host adds through `decisionHooks` are capped at
200 minus NeuroLink's own count, dropped from the end with a warning.

The row is advisory (see [Key Facts](#key-facts)), so the cap is reported by
`decisionLimits()` and used to split in `tryDecide()`, but a direct
`neurolink.decide()` with more than 200 questions is not refused locally: it is
sent whole and the server answers it. **Going over 200 was not tried against the
live endpoint**, so what the endpoint does with 201 is not established; the 200
rests on the SDK's wording alone.

Treat each request like any hosted provider call for data handling and
retention: it is a request to `api.openai.com` made with your key. Besides the
body, each request carries two headers, `Authorization: Bearer <key>` and
`Content-Type: application/json`, and no other.

---

## One key, two providers

`OPENAI_API_KEY` is the variable the [OpenAI chat provider](openai.md) reads to
serve `generate()` and `stream()`. It is also the variable that configures this
provider, and nothing else needs to be set. **This changes what a host with only
an OpenAI key does by default.** A host that set the key only to use OpenAI chat
has also configured `decide`:

- **With none of TypeSafe, Laya, XOR, SubQ, Perplexity or Cloudflare Clef configured,
  the texts listed in [What is sent to OpenAI](#what-is-sent-to-openai) go to
  OpenAI's Decisions API, and each decision is a paid call.** Context compaction
  needs no other opt-in, so a host with long conversations starts sending
  conversation text the first time one outgrows its budget. Model routing, tool
  routing and RAG planning do so only where you have turned them on. A host that
  passes a transcription dictionary also sends transcript text. No code changes:
  the key is the switch.
- **It is fail-open, and the six providers ahead of it take precedence.** If you
  have configured any of them, the shared key changes nothing for the built-in
  consumers. A failure here leaves behaviour as it was, so a key the Decisions
  endpoint does not accept costs requests, not correctness.
- **A rejected key is not remembered across calls.** A 401 stops one provider
  instance from retrying, but `neurolink.decide()` and `neurolink.tryDecide()`
  build a fresh provider for every call, so the breaker never latches across
  them. A host whose key the endpoint rejects makes one failing request for each
  decision site that runs, every time it runs.
- **With no decision provider configured at all, nothing is sent.**

### A gateway's key is never used for the default

`OPENAI_API_KEY` is also the key of every OpenAI-compatible gateway (LiteLLM,
vLLM, LM Studio and the like), and a host that points the chat provider at one
sets `OPENAI_BASE_URL` (or, in LangChain-style setups, `OPENAI_API_BASE`), or an SDK
host passes `credentials.openai.baseURL`, to it. The chat provider prefers the
credentials field over the variable.
That key belongs to the gateway, and the decision text belongs on the gateway's
side of the wire, so NeuroLink does not take such a key to be OpenAI's: **while
`OPENAI_BASE_URL`, `OPENAI_API_BASE` or `credentials.openai.baseURL` names a host other than
`https://api.openai.com`, the environment key is not used to pick OpenAI Decisions
as the default.** The built-in consumers send nothing to `api.openai.com` for it:
each behaves as it did without a decision model, and the "no decision provider"
error says why the key is ignored. Only a call that names the provider reaches
OpenAI, as described below.

The check reads each value's origin, that is scheme, host and port, compared
without regard to case. A path, a trailing slash and `/v1` do not matter.

| `OPENAI_BASE_URL` / `OPENAI_API_BASE` / `credentials.openai.baseURL`                | The environment key is used for the default |
| ----------------------------------------------------------------------------------- | ------------------------------------------- |
| unset, empty or blank                                                               | yes                                         |
| `https://api.openai.com`, `https://api.openai.com/v1/`, `https://API.openai.com`    | yes                                         |
| `https://gateway.example/v1`, `http://127.0.0.1:4000/v1`, `http://localhost:11434`  | no                                          |
| `https://eu.api.openai.com`, `http://api.openai.com`, `https://api.openai.com:8443` | no: another host, scheme or port            |
| `api.openai.com` (no scheme), `not a url`, `ftp://...`                              | no: not an http(s) URL                      |

Any one of the three naming another host is enough, even if another names OpenAI:
the check errs on the side of keeping the key at home. The credentials field is
read from the credentials the call is given, which is the instance's merged with
the call's field by field, so a per-call `credentials.openai.baseURL` replaces the
instance's. A value that is not text, or not a URL, is another host. A regional
OpenAI host such as `https://eu.api.openai.com` is also "another host" here: set
`OPENAI_DECISIONS_BASE_URL` (or `credentials.openaiDecisions.baseURL`) to it, which
routes this provider there on purpose.

The check does **not** apply, and the key is used for the default, when you have
routed this provider on purpose:

- `OPENAI_DECISIONS_BASE_URL` is set to a non-blank value, whatever
  `OPENAI_BASE_URL` or `credentials.openai.baseURL` says; decisions then go to that
  URL, never to the chat host;
- `credentials.openaiDecisions` supplies a key, which always counts, or a base
  URL, which routes this provider on purpose so the environment key stands.

It never applies to a call that names the provider. A call with
`provider: "openai-decisions"` (or `--provider openai-decisions` on the CLI) uses
the key from the environment even beside a gateway `OPENAI_BASE_URL` or
`credentials.openai.baseURL`, and sends it to `https://api.openai.com` unless
`OPENAI_DECISIONS_BASE_URL` or `credentials.openaiDecisions.baseURL` says
otherwise. Naming the provider is intent, so a host whose `OPENAI_API_KEY` is a
gateway's must not name it: it routes this provider on purpose with
`OPENAI_DECISIONS_BASE_URL` or `credentials.openaiDecisions` (a key and a base
URL), or does not use it.

The check is data on the catalog entry (`decide.ambientKeyGuard`, with the
variables to read and the origins to trust) and is read by the default resolution
only. It applies to this provider alone: TypeSafe, Laya, XOR, SubQ, Perplexity and
Cloudflare Clef resolve as before.

Unlike the Perplexity and Cloudflare lines, `.env.example` ships its
`OPENAI_API_KEY` line active, with the placeholder `sk-your-openai-api-key-here`
for the chat provider. NeuroLink's check for a configured provider does not recognise a placeholder, so an unedited
copy of that file configures this provider with a key OpenAI will not accept: each
decision site that runs then makes a failing request, and the consumers fail open.
Replace the placeholder with your key, or remove the line.

A key in a `.env` file counts as a key in the environment. Importing the SDK
loads the `.env` in the current working directory, and the CLI does the same at
start; when `DOTENV_CONFIG_PATH` is set, that file is loaded instead. A key that
sits in `.env` therefore configures `decide` exactly as one exported in the
shell does.

To keep a key that was set for OpenAI chat from activating decisions, use one of
these:

1. **Hand the key to the chat provider through the SDK, not the environment, and
   keep it out of `.env`.**
   `new NeuroLink({ credentials: { openai: { apiKey } } })` configures the chat
   provider and not this one, because NeuroLink looks for this provider's key in
   `OPENAI_API_KEY` and in `credentials.openaiDecisions`, never in
   `credentials.openai`. The key must also be absent from `.env`: remove the
   `OPENAI_API_KEY` line from that file as well as from the shell, or point
   `DOTENV_CONFIG_PATH` at a file that does not have it. With no
   `OPENAI_API_KEY` in the environment or in a loaded `.env`, OpenAI Decisions is
   not configured. The CLI reads only the environment and the `.env` it loads, so
   a CLI run that has the variable set in either place has decisions configured;
   set it only for the commands that need it.
2. **Configure an earlier provider.** TypeSafe, Laya, XOR, SubQ, Perplexity or
   Cloudflare Clef then answers every built-in consumer, and OpenAI Decisions
   runs only where a caller names it. The same texts go to that provider
   instead.
3. **Switch off the opt-in consumers, or pin the router's strategy.**
   `classifierRouter: { classifier: "heuristic" }` keeps routing in-process
   (`"llm"` sends the prompt to the classifier model instead). Leave
   `toolRouting.enabled` unset, and do not pass `decide` to a `RAGPipeline`. Pass
   `guard: "none"` in a transcription `correction`. This does not cover
   compaction.

Compaction's relevance stage and summary gate have no switch of their own while a
decision provider is configured, and there is no switch that turns this provider
off while the key is set, short of a gateway `OPENAI_BASE_URL` (which also moves the
chat provider; see [A gateway's key](#a-gateways-key-is-never-used-for-the-default)).

A test that asserts the "nothing configured" path must blank `OPENAI_API_KEY` as
well as the other decision keys, or it will find this provider.

---

## What is not established

Each item below is **not measured**: nothing NeuroLink was built or tested from
says what the endpoint does, and no live request was made. Where NeuroLink had
to choose, it chose to send only documented fields, to refuse nothing locally on
OpenAI's behalf, and to drop a bad answer rather than guess.

1. Whether `/v1/decisions` uses OpenAI's general error envelope, and the status
   and text of a refusal for an over-length input. NeuroLink reads an error's
   `error.message` when there is one, and classifies by HTTP status.
2. The maximum number of choices per question (the benchmarks NeuroLink has in
   mind need 77 and 151; OpenAI's Python SDK documents 2 to 255, which NeuroLink
   does not enforce) and of levels per score, and what a question `name` may
   contain. The question maximum is documented (200, see
   [What is sent to OpenAI](#what-is-sent-to-openai)), but what the endpoint
   does with more than 200 was not tried live.
3. The endpoint's input ceiling (the model page gives 922,000 input tokens for the
   model in general), the number of images per request, the request body cap and
   the accepted image formats.
4. Whether `probabilities` always covers every supplied option, in what order, and
   how the numbers are rounded. NeuroLink reads each distribution by key, not by
   position, and requires each asked option exactly once.
5. The endpoint's rate limits. The model page lists limits for the model, not for
   this endpoint.
6. How long a request takes, for any size. The 10-second default timeout is a
   starting point.
7. Whether a regional host such as `https://eu.api.openai.com` serves this
   endpoint with the same request. The base URL can be changed to try one.

---

## Cost

$0.10 per 1M input tokens, input only, from
[OpenAI's Decisions guide](https://developers.openai.com/api/docs/guides/decisions)
as read on 2026-10-07. Regional and long-context multipliers are not modelled.
NeuroLink prices a decision from the input tokens the reply reports and counts
output tokens at nothing, so `result.usage` and the CLI's `Cost:` line are an
estimate from that one rate, not a bill. A reply that reports no usage is priced
at zero.

---

## Errors

| Reply                                                                | Kind                                                    | Retried                                  |
| -------------------------------------------------------------------- | ------------------------------------------------------- | ---------------------------------------- |
| 401                                                                  | `authentication` — the provider instance stops retrying | no                                       |
| 429 (every one)                                                      | `rate_limit`                                            | no                                       |
| 503                                                                  | `overloaded`                                            | yes, once (after `Retry-After`, if sent) |
| other 5xx (500, 502, 504)                                            | `server`                                                | yes, once                                |
| any other status, including 400, 402, 403 and 404                    | `invalid_request`, with the reply's own message         | no                                       |
| a 200 whose `answers` is not an array                                | `server`                                                | no                                       |
| no response within the timeout                                       | `timeout`                                               | yes, once                                |
| the request fails before any reply (connection refused, DNS failure) | `network`                                               | yes, once                                |
| the caller's own `signal` aborts the request                         | `network`                                               | no                                       |
| more than 8 images, a video, or an unusable image (local)            | `invalid_request`, with no network call                 | no                                       |
| an encoded request over 32 MiB (local)                               | `invalid_request`, with no network call                 | no                                       |
| no key configured (local)                                            | `authentication`, with no network call                  | no                                       |
| a base URL that cannot work (local)                                  | `invalid_request`, with no network call                 | no                                       |

Only a 401 disables the provider instance, because a bad key does not fix
itself: after the first rejection that instance stops sending requests. A 403 is
not an authentication failure here: OpenAI uses it for an unsupported country, an
account-level condition, so it is an `invalid_request` and does not latch. Every
429 is non-retryable, because OpenAI's general error documentation says that
retrying a billing, spend or quota error cannot restore access and nothing
NeuroLink has says which kind of 429 a given reply is. Because `neurolink.decide()`
and `neurolink.tryDecide()` build a fresh provider per call, the 401 latch holds
only for a provider instance you keep, not across public calls.

NeuroLink has no rule for an over-length input: its refusal is not established, so
it arrives as `invalid_request` with whatever message OpenAI sent. The request id
comes from the `x-request-id` header.

Before the message of an HTTP error reply reaches a log or an error, the provider
removes the configured key, anything shaped like a key beginning `sk-`, long hex
runs and embedded `data:` URLs. The message of a failure with no reply (the
`network` and `timeout` kinds) goes through the same scrub, and any URL in it is
cut to its scheme, host and path.

---

## Base URL

`OPENAI_DECISIONS_BASE_URL`, or `credentials.openaiDecisions.baseURL`, replaces
`https://api.openai.com`. It is an origin:

- trailing slashes and one trailing `/v1` are stripped, so
  `https://api.openai.com/v1/` and `https://api.openai.com` are the same;
- `http://` is accepted only for `localhost`, `127.0.0.1` and `[::1]`, because the
  request carries the key and the state. Any other host needs `https://`; `0.0.0.0`
  and the rest of `127.0.0.0/8` do not count as this machine;
- a user name or password, a query string, a fragment, a scheme other than
  `http` or `https`, `http://` to a host other than those three, or a value that
  is not an absolute URL is refused before any request, with a message that never
  repeats the value;
- a redirect from the endpoint is refused rather than followed, so the decision is
  never replayed at an address the server chooses;
- the request goes to `<origin>/v1/decisions`.

---

## Troubleshooting

- **`No decision provider is configured` although `OPENAI_API_KEY` is set** —
  `OPENAI_BASE_URL`, `OPENAI_API_BASE` or `credentials.openai.baseURL` names a host other than
  `https://api.openai.com`, so the key is taken to be a gateway's. See
  [A gateway's key](#a-gateways-key-is-never-used-for-the-default): set
  `OPENAI_DECISIONS_BASE_URL` or pass `credentials.openaiDecisions` to route this
  provider on purpose. Naming the provider in a call is not a way out when the key
  is a gateway's: a named call sends the environment key to `api.openai.com`.
- **`OpenAI Decisions requires an API key`** — set `OPENAI_API_KEY`, or pass
  `credentials.openaiDecisions.apiKey`. A key passed as `credentials.openai` does
  not count.
- **A 401** — OpenAI rejected the key. The provider instance stops retrying after
  a rejection, so fix the key and construct a new one.
- **A 403** — OpenAI's general error documentation lists a 403 for an unsupported
  country; what this endpoint's own 403s mean is not established. It does not latch
  the instance, so a change on the account side works at once.
- **A 400 naming the model** — `OPENAI_DECISIONS_MODEL`, or a per-call `model`,
  names something other than a model the endpoint supports.
- **`The OpenAI Decisions base URL must not carry credentials…`** — the override
  has a user name, a password, a query string or a fragment. Set it to the origin
  only, or leave it unset for `https://api.openai.com`.
- **`The OpenAI Decisions base URL must start with https:// or http://`** — the
  value parses as a URL with another scheme, or is a host name and port with no
  scheme, such as `localhost:8080`, which reads as the scheme `localhost:`. Put
  `https://` in front, or `http://` for a server on this machine.
- **`The OpenAI Decisions base URL must use https:// unless it points at this machine`** —
  the override is an `http://` URL whose host is not `localhost`, `127.0.0.1` or
  `[::1]`. A plain-http request would send the key and the state unencrypted. Use
  `https://`, or reach the server through a port-forward to `localhost`.
- **`OpenAI Decisions answered with a redirect`** — the endpoint replied 301, 302,
  307 or 308. The provider does not follow it and does not retry. Set the base URL to
  the address the redirect leads to.
- **`The OpenAI Decisions base URL is not a valid absolute URL`** — the value does
  not parse as a URL at all, for example a bare host name. Write the origin with
  its scheme.
- **`OpenAI Decisions accepts at most 8 images per request`** — NeuroLink's own
  allowance. Send fewer, or use a decision provider with a higher one.
- **`OpenAI Decisions does not accept video`** — the endpoint has no video part.
  Send images, or use XOR.
- **A question is missing from `result.answers`** — the model declined it (look
  for the warning), the reply left it out, or its answer failed one of the checks
  in [What a reply must look like](#what-a-reply-must-look-like). The warning names
  the question and never quotes the reply.
- **Built-in routing never uses OpenAI Decisions** — an earlier provider is also
  configured and takes precedence, no key is set where the router's `auto` gate
  looks (it counts the constructor's credentials, the environment and the
  request's own per-call credentials), or the environment key is a gateway's,
  which the default skips (see
  [A gateway's key](#a-gateways-key-is-never-used-for-the-default)).
- **State is being sent to OpenAI and I only set the key for chat** — see
  [What is sent to OpenAI](#what-is-sent-to-openai) and
  [One key, two providers](#one-key-two-providers). Check the `.env` your process
  loads as well as the shell: a key in either place configures `decide`.

---

## See also

- [The `decide` inference type](../../features/decide-inference-type.md)
- [TypeSafe (Jev) Provider Guide](typesafe.md)
- [Laya Provider Guide](laya.md)
- [XOR Provider Guide](xor.md)
- [Perplexity Decisions Provider Guide](perplexity-decider.md)
- [Cloudflare Clef Provider Guide](cloudflare-clef.md)
- [ScaleDown Provider Guide](scaledown.md)
- [OpenAI chat provider](openai.md)
- [OpenAI's Decisions guide](https://developers.openai.com/api/docs/guides/decisions)
