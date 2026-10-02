---
title: Perplexity Decisions Provider Guide
description: A hosted decision provider that also reads images — typed judgments with probabilities from Perplexity's pplx-decider-v1-27b, reached at api.perplexity.ai with the same PERPLEXITY_API_KEY as the Sonar text provider
keywords: perplexity, perplexity-decider, pplx-decider-v1-27b, decide, decision model, images, confidence, probabilities, decisions api
---

# Perplexity Decisions Provider Guide

**A provider of `decide`** — the same typed `boolean` / `choice` / `score`
answers as [TypeSafe's Jev](typesafe.md), [Laya](laya.md) and [XOR](xor.md),
from Perplexity's hosted Decisions API, and it also reads images. It emits no
text at all.

> This is not the [Perplexity text provider](perplexity.md) (`perplexity`, the
> Sonar models), which serves `generate()` and `stream()`. The two share one API
> key, which has a consequence worth reading before you set it. See
> [What is sent to Perplexity](#what-is-sent-to-perplexity) and
> [One key, two providers](#one-key-two-providers).

---

## Overview

`pplx-decider-v1-27b` is Perplexity's decision model. You send one `state`
plus named, typed questions, and optionally images. The model answers every
question in a single batched pass and returns a typed answer for each, with a
probability instead of a sentence. NeuroLink calls Perplexity's public endpoint,
so a key alone configures it: there is no base URL to set.

### Key Facts

|                          |                                                                                                                   |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Provider id              | `perplexity-decider` (no aliases) — distinct from `perplexity`, the Sonar text provider                           |
| Inference type           | `decide` only                                                                                                     |
| Model                    | `pplx-decider-v1-27b`; the API answers 400 to a missing or unknown model. `PERPLEXITY_DECIDER_MODEL` sets it      |
| Key                      | `PERPLEXITY_API_KEY`, shared with the Perplexity text provider, or `credentials.perplexityDecider.apiKey`         |
| Endpoint                 | `https://api.perplexity.ai/v1/decisions`; `PERPLEXITY_DECIDER_BASE_URL` can name another origin                   |
| Media                    | images (PNG, JPEG or WebP), up to 8 per request; no video                                                         |
| Questions per request    | up to 128                                                                                                         |
| Server input ceiling     | under 262,144 tokens (state and questions); more is refused with an explicit 400, never cut off silently          |
| Images and that ceiling  | billed as input tokens (measured); that they count toward the ceiling is assumed, not measured                    |
| NeuroLink's state window | 100,000 estimated tokens: a deliberate local limit, not the server's                                              |
| Cost                     | $0.04 per million input tokens (image tokens included); output tokens are free. Perplexity's documented price     |
| Default timeout          | 10 seconds plus 100 ms for each question (10.1 s for one, 22.8 s for 128); `timeoutMs` or `--timeout` replaces it |
| Precedence               | used automatically when TypeSafe, Laya and XOR are not configured                                                 |

Each limit, token rate and latency in this guide is either **measured on a real
account in October 2026** or taken from Perplexity's documentation, and says
which where it appears. Measured: the 128-question and 8-image caps, the
262,144-token input ceiling for the state and the questions (nothing is cut off
silently), characters per token for each kind of text, latency by input size and
by question count, what an image costs, which image sizes stall, and how the API
answers a burst of requests. Documented and not tested: the 32 MiB request body,
the price, and the option and level counts. Perplexity documents a limit of 10
requests per second for the account's tier (every organization, on every plan,
with a token limit on large bursts), and a burst test on the one account tested
saw the request limit act. The 2,048-tile image rule is Perplexity's documented
rule, checked at three image sizes (see [Images](#images)). One thing is assumed,
not measured: that images count toward the 262,144-token ceiling. They are billed
as input tokens, which was measured, but no request put images next to the
ceiling.

---

## Quick Start

### 1. Get a key

Create one in the [Perplexity console](https://console.perplexity.ai). Any
Perplexity API key works.

### 2. Configure

Set the key in the environment:

```bash
export PERPLEXITY_API_KEY=pplx-...                      # the key; see "One key, two providers"
export PERPLEXITY_DECIDER_MODEL=pplx-decider-v1-27b     # optional
export PERPLEXITY_DECIDER_BASE_URL=https://api.perplexity.ai   # optional; an origin
```

or in the config passed to the SDK, exactly as for any other provider. Values
passed per call override the constructor's, which override the environment:

```typescript
// For the whole instance
const neurolink = new NeuroLink({
  credentials: {
    perplexityDecider: { apiKey: process.env.MY_PERPLEXITY_KEY },
  },
});

// Or for one call
await neurolink.decide({
  provider: "perplexity-decider",
  credentials: {
    perplexityDecider: { apiKey: process.env.MY_PERPLEXITY_KEY },
  },
  state: "The headphones sound great, but the battery died after two weeks.",
  questions: {
    defect: { type: "boolean", instructions: "Is a defect reported?" },
  },
});
```

`credentials.perplexityDecider` is its own slice. A key passed as
`credentials.perplexity` belongs to the text provider and does not configure
this one. `PERPLEXITY_BASE_URL`, which moves the text provider, is not read here;
the override for this provider is `PERPLEXITY_DECIDER_BASE_URL`, and a trailing
`/v1` on it is accepted.

### 3. Use it

```typescript
import { NeuroLink, readDecisionChoice } from "@juspay/neurolink";

const neurolink = new NeuroLink();
const result = await neurolink.decide({
  provider: "perplexity-decider",
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

NeuroLink's `boolean` question is sent to the API as its `noul` type, and the
answer is read back as a `boolean`. A `boolean` answer carries a probability and
no confidence of its own; a `choice` or `score` answer carries the confidence the
API reports, which Perplexity describes as the model's own certainty estimate,
not the top probability. Perplexity's API reference and quickstart do not call
that confidence calibrated, and NeuroLink did not measure whether it is, so tune
a threshold on it against your own labelled data. (The Hugging Face model card
for the open-weights model describes its output as calibrated probabilities.)
Perplexity also notes that identical requests occasionally differ in the second
decimal place. Repeating a request returned the same numbers in NeuroLink's
probe, but leave some margin when you set a threshold anyway.

### From the CLI

The CLI reads the same environment variables:

```bash
neurolink decide "The battery stopped charging after two weeks." \
  --provider perplexity-decider \
  --questions '{"defect":{"type":"boolean","instructions":"Is a defect reported?"}}'
```

The text output ends with a `Cost:` line, priced from the input tokens the API
reports.

---

## Images

Perplexity reads images alongside the `state`. TypeSafe and Laya do not read
media. XOR reads images and a video; Perplexity reads images only. In the probe
the model did read an image: asked red versus blue about one, it answered
correctly at about 0.98 confidence.

```typescript
import { readFile } from "node:fs/promises";
import { NeuroLink, readDecisionChoice } from "@juspay/neurolink";

const neurolink = new NeuroLink();
const result = await neurolink.decide({
  provider: "perplexity-decider",
  state: "A product photo from a listing.",
  // Any mix of a file path, a Buffer and a data: URL
  images: ["./front.png", await readFile("./back.webp")],
  questions: {
    color: {
      type: "choice",
      instructions: "What color is the product?",
      criteria: { red: "Mostly red", blue: "Mostly blue" },
    },
  },
});
const color = readDecisionChoice(result.answers, "color");
console.log(result.mediaBytes); // encoded size of the images sent
```

From the CLI, pass `--image <path>`, repeated for several:

```bash
neurolink decide "What color is the square?" --provider perplexity-decider \
  --image ./square.png \
  --questions '{"color":{"type":"choice","instructions":"What color is the square?","criteria":{"red":"A red square","blue":"A blue square","green":"A green square"}}}'
```

On the wire the images go inside `state`: NeuroLink sends `state` as an array,
your state first and then one OpenAI-style `image_url` part per image, each a
base64 data URL. The API has no separate images field and rejects unknown
fields. An image can also be the whole input (an image-only `state` was
accepted in the probe); from the SDK, pass an empty string as `state` with
`images`. The CLI always needs a state.

The rules:

- **Up to 8 images** per request. Measured: 8 images with three questions were
  accepted, and 9 images with one question were refused with a 400 whose message
  words the cap as "per question". NeuroLink applies the 8 to the request as a
  whole.
- **PNG, JPEG or WebP only.** The type comes from the bytes, not the file
  extension. A GIF, or a `data:` URL of another type, is refused before any
  request, as a non-retryable `invalid_request`. The API refuses a GIF with a 400
  too.
- **Each is a Buffer, a local file path or a `data:` URL.** An `http(s)` URL is
  refused locally and never fetched. The API does not fetch URLs either: an
  `https` image URL returned a 400 in the probe.
- **Each image may be at most 2,048 tiles of 32 × 32 pixels.** Round the width
  and the height to the nearest multiple of 32 and keep (width / 32) ×
  (height / 32) at or under 2,048: by that count 1440 × 1440 (2,025 tiles) and
  2048 × 1024 (2,048) fit, and 1600 × 1310 (2,050) does not. Perplexity documents
  this rule. The probe tried three sizes, and all three agree with it:
  1920 × 1080 (2,040 tiles) was answered in 1.1 seconds, while 2048 × 2048
  (4,096 tiles, tried twice) and 4000 × 3000 (11,750 tiles) stalled for about
  56 seconds and came back as an HTML 504. No size just past the limit was tried,
  so the edge itself rests on the documentation. The trigger is pixel count, not
  file size: the 2048 × 2048 image was a 60 KB PNG. An oversized image is not
  refused with a 400, so NeuroLink reads each image's dimensions from its header
  and refuses it before any request, naming its size. An image whose dimensions
  cannot be read is sent as given.
- **The whole request body may be at most 32 MiB**, Perplexity's documented
  limit, which the probe did not check. The limit applies to the encoded body,
  so the base64 form counts. A file over it is refused from its size, before it
  is read.
- **No video.** `video` and `--video` are refused before any request with
  `Perplexity does not accept video.`
- **Images are billed as input tokens.** Measured: about one input token for
  each 32 × 32 tile (1,024 pixels) plus about 95 for the image, billed like text.
  That is a fit to three sizes, not a documented rate: 1920 × 1080 (2,040 tiles)
  cost about 2,135 tokens, 1024 × 1024 (1,024 tiles) about 1,119 and 512 × 512
  (256 tiles) about 351. That they count toward the 262,144-token input ceiling
  was not measured and is assumed from the billing; by the fit, eight images at
  the 2,048-tile cap add at most about 17,000 tokens. NeuroLink's local window
  checks the state's text only, not the images or the questions, so a request
  that passes it can still be refused by the API for being over its input
  ceiling.
- **The result carries `mediaBytes`**, the encoded size of the images sent. The
  `decide` spans carry `decision.images.count` and `decision.media.bytes`, and
  never any base64.

---

## When NeuroLink uses it

Every built-in consumer of `decide` asks for the default decision provider. That
is the first one that is configured, in the environment or in the `credentials`
passed to the SDK, in the order TypeSafe, Laya, XOR, Perplexity. TypeSafe counts
with either of its keys, `TYPESAFE_API_KEY` or `AI_GATEWAY_API_KEY`. Laya and XOR
each count only with both their key and their base URL. Perplexity counts with
its key alone, a non-blank `PERPLEXITY_API_KEY` or
`credentials.perplexityDecider.apiKey`. A caller can always name it with
`provider: "perplexity-decider"`. So:

- **Only a Perplexity key:** built-in features use Perplexity.
- **A Perplexity key, plus TypeSafe's key, or Laya's or XOR's key and base
  URL:** built-in features use TypeSafe, Laya or XOR, in that order, whichever
  is configured. Perplexity runs only where a caller asks for
  `provider: "perplexity-decider"`.
- **A key for the text provider only:** the same as the first case. The key is
  shared, so the text provider's key also configures this one. See
  [One key, two providers](#one-key-two-providers).
- **None of TypeSafe, Laya, XOR or Perplexity configured:** everything behaves
  exactly as it did without a decision model.

The classifier router's `auto` gate reads the credentials given to the
`NeuroLink` constructor and the environment, not credentials passed on a single
call, so a per-call `credentials.perplexityDecider` does not influence it. The
other consumers NeuroLink wires itself (compaction and tool routing) call
`tryDecide` without credentials too.

Where the built-in consumers use the default provider (what each one sends is
listed in [What is sent to Perplexity](#what-is-sent-to-perplexity)):

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
working is visible rather than indistinguishable from one never configured.

Calling it yourself is the other use. It suits the same work as any decision
model: routing, classifying and grading against a rubric, gating an action on a
threshold, and the same questions about an image. It is wrong for a final answer
a user reads, or anything that needs a rationale: a decision carries a
probability, never an explanation. See [the `decide` inference
type](../../features/decide-inference-type.md).

---

## What is sent to Perplexity

Perplexity receives the `state` and the questions of every decision made on
your behalf. The questions are NeuroLink's fixed wording, plus text from your own
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

So model routing, tool routing and RAG planning need an opt-in, and relevance
compaction and the summary gate need none. A call you make yourself to
`neurolink.decide()` sends the `state`, `questions` and `images` you pass, to the
provider you name or to the default one.

Two consumers can ask more questions in one request than Perplexity takes:
relevance compaction asks about up to 300 messages and tool routing about up to
200 servers, against 128 here. Past 128, NeuroLink refuses the request before it
leaves the machine, the consumer carries on as it did without a decision model,
and nothing is sent.

Treat each request like any hosted provider call for data handling and
retention: it is a request to `api.perplexity.ai` made with your key.

Besides the body, each request to `api.perplexity.ai` carries one identifying
header, `X-Pplx-Integration: neurolink`: the same attribution the Perplexity text
provider sends, and one Perplexity asks integrations to send on its own host. A
`PERPLEXITY_DECIDER_BASE_URL` that points anywhere else gets no such header.

---

## One key, two providers

`PERPLEXITY_API_KEY` is the variable the
[Perplexity text provider](perplexity.md) reads to serve `generate()` and
`stream()`. It is also the variable that configures this provider. Nothing else
needs to be set, so a host that set the key only to use Sonar has also
configured `decide`:

- **With none of TypeSafe, Laya or XOR configured, the texts listed in
  [What is sent to Perplexity](#what-is-sent-to-perplexity) go to Perplexity's
  Decisions API.** Context compaction needs no other opt-in, so a host with long
  conversations starts sending conversation text the first time one outgrows its
  budget. Model routing, tool routing and RAG planning do so only where you have
  turned them on. No code changes: the key is the switch.
- **It is fail-open, and TypeSafe, Laya and XOR take precedence.** If you have
  configured any of them, the shared key changes nothing for the built-in
  consumers, and a Perplexity failure leaves behaviour as it was.
- **With no decision provider configured at all, nothing is sent.**

An unedited copy of `.env.example` does not set the key, because its
`PERPLEXITY_API_KEY` line is commented out.

A key in a `.env` file counts as a key in the environment. Importing the SDK
loads the `.env` in the current working directory, and the CLI does the same at
start; when `DOTENV_CONFIG_PATH` is set, that file is loaded instead. A key that
sits in `.env` therefore configures `decide` exactly as one exported in the
shell does.

To keep a key that was set for Sonar from activating decisions, use one of
these:

1. **Hand the key to the text provider through the SDK, not the environment, and
   keep it out of `.env`.**
   `new NeuroLink({ credentials: { perplexity: { apiKey } } })` configures the
   text provider and not this one, because NeuroLink looks for this provider's
   key in `PERPLEXITY_API_KEY` and in `credentials.perplexityDecider`, never in
   `credentials.perplexity`. The key must also be absent from `.env`: remove the
   `PERPLEXITY_API_KEY` line from that file as well as from the shell, or point
   `DOTENV_CONFIG_PATH` at a file that does not have it. With no
   `PERPLEXITY_API_KEY` in the environment or in a loaded `.env`, Perplexity
   decisions are not configured. **Not verified:** that the text provider reads
   `credentials.perplexity.apiKey` was read from the code, and was not run
   against the live Sonar API. The CLI reads only the environment and the `.env`
   it loads, so a CLI run that has the variable set in either place has
   decisions configured; set it only for the commands that need it.
2. **Configure TypeSafe, Laya or XOR.** One of them then answers every built-in
   consumer, and Perplexity runs only where a caller names it. The same texts go
   to that provider instead.
3. **Switch off the opt-in consumers, or pin the router's strategy.**
   `classifierRouter: { classifier: "heuristic" }` keeps routing in-process
   (`"llm"` sends the prompt to the classifier model instead). Leave
   `toolRouting.enabled` unset, and do not pass `decide` to a `RAGPipeline`.
   This does not cover compaction.

Compaction's relevance stage and summary gate have no switch of their own while
a decision provider is configured, and there is no switch that turns this
provider off while the key is set.

---

## Limits

### Measured on a real account, October 2026

NeuroLink probed the live API from an account limited to 10 requests per second.
These figures were observed, not taken from Perplexity's documentation:

| What                  | Measured                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Questions per request | 128 accepted (128 answers in 8.9 s, 11,904 input tokens); 129 is refused with a 400. An extra minimal question adds about 92 input tokens, and a one-character state with one question bills 116.                                                                                                                                                                                                                                                             |
| Images per request    | 8 accepted (with three questions); 9 refused with a 400 (with one question; the message says "per question").                                                                                                                                                                                                                                                                                                                                                 |
| Input ceiling         | Input of 262,144 tokens or more is refused with an explicit 400 (`Input length (262144) exceeds or equals model's maximum context length (262144)`). The state and the questions count toward it; that images count too is assumed, not measured. Nothing is cut off silently: needles at the head and at the tail of a state were both found at 900,000 characters, and a tail needle at 1.55 million characters (251,350 input tokens, answered in 22.9 s). |
| Tokens per character  | By kind of text, in the table below. Other scripts: CJK about 0.46 tokens per character, Devanagari 0.44, emoji 2.6 per code point.                                                                                                                                                                                                                                                                                                                           |
| Latency               | Grows faster than linearly with input: 3.9 s at 65,000 tokens, 10 s at 146,000 and 22.9 s at 251,000, about 17,000, 15,000 and 11,000 tokens per second. One question on a short state took 0.3 to 1.1 s, and each question after the first added about 65 ms (128 minimal questions took 8.9 s on 11,904 input tokens).                                                                                                                                      |
| Image cost            | About one input token for each 32 × 32 tile plus about 95 for the image, a fit to three sizes: 1920 × 1080 (2,040 tiles) cost about 2,135 tokens, 1024 × 1024 (1,024 tiles) about 1,119 and 512 × 512 (256 tiles) about 351.                                                                                                                                                                                                                                  |
| Image size            | Three sizes were tried: 1920 × 1080 (2,040 tiles) answered in 1.1 s; 2048 × 2048 (4,096 tiles, tried twice) and 4000 × 3000 (11,750 tiles) stalled for about 56 seconds and returned an HTML 504. The 2048 × 2048 image was a 60 KB PNG, so the trigger is pixel count, not file size.                                                                                                                                                                        |
| Rate limit            | 10 requests per second: a burst of 14 parallel requests got 10 answers and 4 replies of 429, and capacity returned within about 3 seconds. A 429 carries `Retry-After: 1`, in seconds.                                                                                                                                                                                                                                                                        |

Characters per token, by kind of text. Each sample was 40,000 characters, sent
as the state of a one-question request, with the cost of the bare question
subtracted:

| Sample                                                       | Characters per token |
| ------------------------------------------------------------ | -------------------- |
| English prose (sentences from NeuroLink's own provider docs) | 4.34                 |
| TypeScript (four of NeuroLink's provider files)              | 3.84                 |
| Minified JSON (the provider catalog files)                   | 3.36                 |
| Log lines (timestamps, hex ids, counters)                    | 1.35                 |
| JSON arrays of integers                                      | 1.16                 |
| Repeated text (one phrase, or one letter)                    | 4.9 to 8.0           |

Two more behaviours from the probe. A `choice` with a single option answers at
once with confidence 1.0 and bills no tokens, so it carries no information. An
empty string is accepted as a `state`.

### What Perplexity documents and the probe did not check

- **The request body:** 32 MiB, refused with a 413.
- **Names, options and levels:** every question needs a non-empty name; 1 to 255
  options on a `choice`; 1 to 10 levels on a `score`.
- **The price:** $0.04 per million input tokens, image tokens included, output
  free.
- **The rate:** 10 requests per second for the account's tier, and a token limit
  that also applies to large bursts; either answers 429. The burst test above saw
  the request limit act on the one account tested, and the token limit was not
  tested.
- **Not verified:** the status the API returns for an account with no credit. A
  key with no balance could not be created for the probe. Whatever comes back is
  classified by the table under [Errors](#errors): a 401 disables the provider
  instance, a 429 is retried once, and any other 4xx is an `invalid_request`.

### What NeuroLink refuses before any request

These are NeuroLink's own limits, set from the measurements above. A request
over any of them fails locally, with no network call, and every built-in
consumer treats that as "carry on as before".

- **A state estimated above 100,000 tokens** is refused with
  `max_tokens_exceeded`. The window is a deliberate local limit, **not a server
  limit**: the server reads up to 262,144 tokens in all. It is set lower because
  latency grows faster than linearly with input (3.9 s at 65,000 tokens, 10 s at
  146,000), so a state of 100,000 tokens takes about 7 seconds of the 10-second
  allowance, an interpolation between those two measurements and not a
  measurement of its own, and a much larger one would likely time out and be
  retried into the same wait. The estimate is 3.81 characters per token for
  ASCII text (four, with a 5% margin), which is about 381,000 characters at the
  window, and half a token per non-ASCII character, near the measured rate for
  CJK (about 0.46) and Devanagari (0.44). It covers the text of the state only,
  not the questions or the images.
- **The estimate is a guard, not a promise of acceptance.** Against the measured
  characters per token, it over-counts English prose (4.34) and is close for
  TypeScript (3.84). It under-counts minified JSON (3.36) by about 13%, which
  does not matter at the window: 380,000 characters of JSON, estimated at 100,000
  tokens, are about 113,000 real tokens, far under the 262,144 the server reads.
  Log lines (1.35) are under-counted by about 2.8 times and arrays of integers
  (1.16) by about 3.3 times, and a state of either kind can pass the window and
  still be refused by the server for being over its ceiling: 380,000 characters
  of log lines are about 281,000 real tokens, and of integer arrays about
  328,000. Text that is mostly emoji (2.6 tokens per code point, against the half
  token it charges) can be refused the same way. That refusal is reported as
  `max_tokens_exceeded` too, and is not retried.
- **A state estimated above the window needs a smaller state, or another
  provider.** There is no setting that raises the window, so a larger state that
  would fit the server's ceiling can be sent only through a decision provider
  with a larger window.
- **More than 128 questions** is refused with `max_tokens_exceeded`, the cap the
  API enforces.
- **More than 8 images**, an image that is not PNG, JPEG or WebP, an image over
  2,048 tiles of 32 × 32 pixels, a remote image URL, a video, or a body over
  32 MiB is refused with `invalid_request`.

A request that passes the local checks can still be refused by the API, for
example because the questions push the input past 262,144 tokens (or the images
do, if they count toward the ceiling as assumed). A 400 that says the input
exceeds or equals the model's maximum context length arrives as
`max_tokens_exceeded`, and any other 400 as an `invalid_request` carrying the
API's own message. Neither is retried.

### Latency and the timeout

**The default timeout is 10 seconds plus 100 ms for each question**: 10.1
seconds for one question and 22.8 seconds for the 128-question maximum. A
`timeoutMs` you pass, or `--timeout` on the CLI, is used exactly as given, with
nothing added. The 10 seconds are the allowance for reading the input. Latency
grows faster than linearly with input (3.9 s at 65,000 tokens, 10 s at 146,000
and 22.9 s at 251,000), so a state of 100,000 tokens takes about 7 s, an
interpolation between the 65,000- and 146,000-token measurements, and a larger
one needs a larger `timeoutMs`. The 100 ms follows what a question costs: each
one after the first added about 65 ms, and 128 minimal questions took 8.9 s on
11,904 input tokens, so a flat 10 seconds would have been nearly spent on the
questions alone. Images count as input tokens too (see [Images](#images)).

A timeout is retried once, so a request that stalls can take about twice the
timeout plus a quarter to half a second before it fails: about 20 seconds at the
default for one question. Pass a larger `timeoutMs` for a state of more than
about 100,000 real tokens, which log lines and arrays of numbers reach well
inside the window (see
[What NeuroLink refuses](#what-neurolink-refuses-before-any-request)). A model
that does not answer in time returns an HTML 504 after about a minute;
NeuroLink's shorter timeout fires first, so it arrives as `timeout`, retried
once.

Each built-in consumer takes its timeout from where it is configured:

- **Model routing** (with the model catalogue and the context budget, which share
  its request): `classifierRouter.timeoutMs` in the `NeuroLink` config, passed to
  the decision request when set.
- **Relevance compaction:** `contextRelevance.timeoutMs` in the `NeuroLink`
  config.
- **Summary-quality gate:** no setting. The `NeuroLink` config has none for it.
- **Tool / MCP routing:** no setting for the decision request.
  `toolRouting.timeoutMs` bounds the generative router only.
- **RAG planning:** no setting in the pipeline config. The pipeline calls the
  `decide` function you give it, so set `timeoutMs` in the call that function
  makes.

Where there is no setting, or `timeoutMs` is left unset, the default above
applies.

### Rate limits

The account measured allows 10 requests per second. A 429 is retried once, after
the wait its `Retry-After` header asks for. NeuroLink honours that header on any
retried reply that carries it, and only as a whole number of seconds above zero
or as an HTTP date in the future; anything else (zero, a negative number, a hex
or exponent spelling, a fraction, a date already past) is ignored, and the
default backoff of a quarter to half a second is used instead. A wait longer
than what is left of the attempt's timeout is not taken: the error is thrown at
once so a fail-open consumer is not held for the length of a cooldown, and a
caller's abort signal ends a wait immediately.

---

## Errors

| Reply                                                                     | Kind                                                    | Retried                        |
| ------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------ |
| 401                                                                       | `authentication` — the provider instance stops retrying | no                             |
| 413                                                                       | `max_tokens_exceeded` (the body is over 32 MiB)         | no                             |
| 400 saying the input exceeds or equals the model's maximum context length | `max_tokens_exceeded`                                   | no                             |
| any other 4xx (for example another 400, 403, 404)                         | `invalid_request`, with Perplexity's own message        | no                             |
| 429                                                                       | `rate_limit`                                            | yes, once, after `Retry-After` |
| 503                                                                       | `overloaded`                                            | yes, once                      |
| other 5xx (500, 502, 504)                                                 | `server`                                                | yes, once                      |
| no response within the timeout                                            | `timeout`                                               | yes, once                      |
| the request fails before any reply (connection refused, DNS failure)      | `network`                                               | yes, once                      |
| the caller's own `signal` aborts the request                              | `network`                                               | no                             |
| state or questions over the limit (local)                                 | `max_tokens_exceeded`, with no network call             | no                             |
| unusable images, or a video (local)                                       | `invalid_request`, with no network call                 | no                             |
| no key configured (local)                                                 | `authentication`, with no network call                  | no                             |
| a base URL that cannot work (local)                                       | `invalid_request`, with no network call                 | no                             |

Only a 401 disables the provider instance, because a bad key does not fix
itself: after the first rejection the instance stops sending requests. A 4xx
that is not a 401, a 413, an over-length 400 or a 429 is something a caller or an
account owner can fix without a restart, so it is `invalid_request` rather than a
latch. Perplexity checks the key before it validates anything else, so a bad key
answers 401 whatever else is wrong with the request.

Perplexity answers with three error envelopes, each an `error` object that
always has a `message` and a `type`. A 401 adds `code` as a number and no
`param`. The gateway layer, which answered the 429 and the 400s for an unknown
model or a bad field in testing, adds a null `code` and a null `param`. The model
server, which answered the other 400s seen in testing (rules on questions, images
and input length), adds `code` as a string, may add `model`, and sends no
`param`. So `code` is a number, null or a string, and NeuroLink classifies by
HTTP status first. It reads `message` (and `param`, when it names a field the
message does not) and ignores `code`, which Perplexity says not to branch on. A
405 returned an empty body in testing; Perplexity documents an empty body for a
404 as well, which was not tested. The 504 arrives as an HTML page. A body that is
not that envelope, empty or HTML, falls back to a short
`Perplexity request failed with HTTP <status>`, and the HTML is never echoed. The
request id comes from the `x-request-id` header. Perplexity documents that a 401,
a 404 and a 504 carry none, and a 401 was confirmed in testing, so those leave it
undefined.

Before the message of an HTTP error reply reaches a log or an error, the provider
removes the configured key, anything shaped like a Perplexity key (`pplx-`
followed by 30 or more characters, so a model name such as
`pplx-decider-v1-27b-latest` stays readable), long hex runs and embedded `data:`
URLs. The message of a failure with no reply (the `network` and `timeout` kinds)
goes through the same scrub except for the Perplexity-key shape: it loses the
configured key, long hex runs and embedded `data:` URLs, and any URL in it is cut
to its scheme, host and path.

---

## Troubleshooting

- **`Perplexity requires an API key`** — set `PERPLEXITY_API_KEY`, or pass
  `credentials.perplexityDecider.apiKey`. A key passed as
  `credentials.perplexity` does not count.
- **A 401, `Invalid API key provided`** — Perplexity rejected the key, and it
  checks the key before anything else. The provider instance stops retrying
  after a rejection, so fix the key and construct a new one.
- **A 400 naming the model** — `PERPLEXITY_DECIDER_MODEL`, or a per-call
  `model`, names something other than `pplx-decider-v1-27b`.
- **`The Perplexity base URL must not carry credentials…`** — the override has a
  user name, a password, a query string or a fragment. Set it to the origin only,
  or leave it unset for `https://api.perplexity.ai`.
- **`The Perplexity base URL must start with https:// or http://`** — the value
  parses as a URL with another scheme: an explicit one such as `ftp://`, or a host
  name and port with no scheme, such as `localhost:8080`, which reads as the
  scheme `localhost:`. Put `https://` or `http://` in front.
- **`The Perplexity base URL is not a valid absolute URL`** — the value does not
  parse as a URL at all: a bare host name such as `api.perplexity.ai` (the likely
  mistake), an IP address and port such as `127.0.0.1:8080`, a path, or a scheme
  with no host. Write the origin with its scheme.
- **A refused base URL in the debug log** — it is not there. A base URL that
  NeuroLink refuses (credentials, a query string, a fragment, a scheme other than
  http or https, or not a URL at all) is never written to the debug log: the line
  shows `(invalid)` in its place, because such a value can carry a secret.
- **`Image N is not a PNG, JPEG or WebP image`** — Perplexity reads only those
  three. Convert the image first.
- **`Image N is … pixels; Perplexity reads at most 2048 tiles`** — resize the
  image to fit, for example 1440 × 1440 or 2048 × 1024.
- **A request with an image stalls until it times out, or fails as `server` with
  `HTTP 504` when the timeout is longer than a minute** — an image over the tile
  cap does this. NeuroLink refuses those before any request, but sends an image
  whose dimensions it cannot read as given. Resize the image.
- **`Perplexity does not accept video`** — send images, or use a decision
  provider that reads video.
- **`max_tokens_exceeded`** — the state is estimated above 100,000 tokens, the
  request has more than 128 questions, or the server refused input of 262,144
  tokens or more. Shorten the state, split it or the questions across requests,
  or use a decision provider with a larger window.
- **`timeout`** — the request took longer than the timeout, 10 seconds plus
  100 ms for each question by default, and a timeout is retried once, so the
  error arrives after about twice that. Raise `timeoutMs` for a state of more
  than about 100,000 real tokens, or send fewer or smaller images.
- **`rate_limit`** — the account is over its request rate, 10 per second on the
  one measured. NeuroLink retries once after `Retry-After`. Batch every question
  into one request rather than fanning out.
- **Built-in routing never uses Perplexity** — TypeSafe, Laya or XOR is also
  configured and takes precedence, no key is set, or the router's `auto` gate did
  not see the key: it reads the constructor's credentials and the environment,
  not per-call credentials.
- **State is being sent to Perplexity and I only set the key for Sonar** — see
  [What is sent to Perplexity](#what-is-sent-to-perplexity) and
  [One key, two providers](#one-key-two-providers). Check the `.env` your process
  loads as well as the shell: a key in either place configures `decide`.

---

## See also

- [The `decide` inference type](../../features/decide-inference-type.md)
- [TypeSafe (Jev) Provider Guide](typesafe.md)
- [Laya Provider Guide](laya.md)
- [XOR Provider Guide](xor.md)
- [Perplexity text provider](perplexity.md)
- [Perplexity Decisions API reference](https://docs.perplexity.ai/api-reference/decisions-post)
