---
title: SubQ Provider Guide
description: A hosted decision provider — typed judgments with probabilities from Subquadratic's SubQ Snap Preview, reached at api.subq.ai with SUBQ_API_KEY
keywords: subq, subquadratic, subq-snap, subq-snap-preview, decide, decision model, confidence, probabilities, system one
---

# SubQ Provider Guide

**A provider of `decide`** — the same typed `boolean` / `choice` / `score`
answers as [TypeSafe's Jev](typesafe.md), [Laya](laya.md), [XOR](xor.md),
[Perplexity](perplexity-decider.md) and [Cloudflare Clef](cloudflare-clef.md),
from Subquadratic's hosted SubQ Snap. It emits no text at all.

---

## Overview

`subq-snap-preview` is Subquadratic's decision model, in public preview. You
send one `state` plus named, typed questions. The model answers every question
in a single pass and returns a typed answer for each, with a probability
instead of a sentence. SubQ speaks the same System One wire as TypeSafe, so
NeuroLink describes it with one catalog file,
`src/lib/providers/catalog/subq.json`, and no provider code of its own. NeuroLink
calls SubQ's public endpoint, so a key alone configures it: there is no base
URL to set.

### Key Facts

|                       |                                                                                                                                                                                    |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Provider id           | `subq`; the aliases `subquadratic` and `subq-snap` name it too                                                                                                                     |
| Inference type        | `decide` only                                                                                                                                                                      |
| Model                 | `subq-snap-preview`, the only model on SubQ's Decisions endpoint. `SUBQ_MODEL` sets it                                                                                             |
| Key                   | `SUBQ_API_KEY`, or `credentials.subq.apiKey`. Keys come from [console.subq.ai](https://console.subq.ai); the console shows one only once                                           |
| Endpoint              | `https://api.subq.ai/v1/systemone`; `SUBQ_BASE_URL` or `credentials.subq.baseURL` can name another origin                                                                          |
| Questions per request | no cap declared                                                                                                                                                                    |
| State window          | 376,000 estimated tokens, advisory: reported by `decisionLimits()`, never enforced. SubQ's own 400 response states a maximum model length of 393,216 tokens; see [Limits](#limits) |
| Media                 | none. Images attached to a `decide()` call are refused before any request; see [Images](#images)                                                                                   |
| Default timeout       | 30 seconds per attempt; `timeoutMs` or `--timeout` replaces it                                                                                                                     |
| Precedence            | used automatically unless TypeSafe, Laya or XOR is configured; it comes ahead of Perplexity, Cloudflare Clef, OpenAI Decisions and ScaleDown                                       |

---

## Quick Start

### 1. Get a key

Sign up at [console.subq.ai](https://console.subq.ai) and create an API key. The
console shows it once, so copy it then. SubQ answers HTTP 402 to a request made
with no credits left.

### 2. Configure

Set the key in the environment:

```bash
export SUBQ_API_KEY=...                           # the key from the console
export SUBQ_MODEL=subq-snap-preview               # optional
export SUBQ_BASE_URL=https://api.subq.ai          # optional; an origin, without /v1
```

or in the config passed to the SDK, exactly as for any other provider. Values
passed per call override the constructor's, which override the environment:

```typescript
const neurolink = new NeuroLink({
  credentials: {
    subq: { apiKey: process.env.MY_SUBQ_KEY },
  },
});
```

`SUBQ_BASE_URL` and `credentials.subq.baseURL` name an origin. NeuroLink appends
`/v1/systemone` and drops any trailing slashes, so a value that already ends in
`/v1` would send the request to `/v1/v1/systemone`.

### 3. Use it

```typescript
import { NeuroLink, readDecisionChoice } from "@juspay/neurolink";

const neurolink = new NeuroLink();
const result = await neurolink.decide({
  provider: "subq",
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
neurolink decide "We were billed twice for March." --provider subq \
  --questions '{"urgent":{"type":"boolean","instructions":"Is this urgent?"}}'
```

---

## When NeuroLink uses it

Every built-in consumer of `decide` — model routing, relevance-driven
compaction, tool routing and RAG planning — asks for the default decision
provider. That is the first one that is configured, in the environment or in
the `credentials` passed to the SDK, in the order TypeSafe, [Laya](laya.md),
[XOR](xor.md), SubQ, [Perplexity](perplexity-decider.md),
[Cloudflare Clef](cloudflare-clef.md), [OpenAI Decisions](openai-decisions.md),
then [ScaleDown](scaledown.md). SubQ counts with its key alone. It sits
ahead of Perplexity, Clef and OpenAI Decisions because its key belongs to no other
provider, so setting it can only be meant for SubQ, whereas theirs are shared
with text providers and must not displace it. ScaleDown, whose key is also its
own, was placed last on purpose. So:

- **Only a SubQ key:** built-in features use SubQ.
- **A SubQ key, plus a Perplexity key, the Cloudflare pair, `OPENAI_API_KEY` or
  `SCALEDOWN_API_KEY`:** built-in features use SubQ; Perplexity, Cloudflare Clef,
  OpenAI Decisions and ScaleDown run only where a caller asks for
  `provider: "perplexity-decider"`, `provider: "cloudflare-clef"`,
  `provider: "openai-decisions"` or `provider: "scaledown"`.
- **A SubQ key, plus TypeSafe's key, or Laya's or XOR's key and base URL:**
  built-in features use TypeSafe, Laya or XOR, in that order, whichever is
  configured; SubQ runs only where a caller asks for `provider: "subq"`.
- **A blank `SUBQ_API_KEY`:** no key. SubQ is not configured.

---

## Limits

**The state window is advisory.** `decisionLimits()` reports 376,000 estimated
state tokens, and the catalog records a model `contextWindow` of 393,216. Both
come from one live observation made on 2026-10-13 for NeuroLink (not by this
change): SubQ refused a request of 399,795 tokens with HTTP 400, and the message
names a maximum model length of 393,216 tokens; the largest request it answered
had 376,180 input tokens. So 393,216 is the maximum model length SubQ's own 400
response states, and 376,000 is a margin under the largest request it answered.
Both are advisory: a longer state is sent, the server decides, and neither
figure is a guarantee. The 376,000 counts NeuroLink's estimated tokens, which can
differ from the tokens SubQ counts, so a state near it can still be refused.

SubQ answers an over-length request with HTTP 400 and a `validation_error` body
(`The decoder prompt (length 399795) is longer than the maximum model length of
393216 ...`). NeuroLink reports it as `invalid_request`, not retried; it is not
reported as `max_tokens_exceeded`.

**No question cap is declared.** SubQ's documentation gives no count; a `choice`
question takes 2 to 255 options, a `score` question 2 to 10 levels, and a
question name up to 100 characters. SubQ refuses a request outside those with
HTTP 422, which NeuroLink reports as `invalid_request`, with SubQ's reason when
the body is the documented object form.

**Timeout.** The default is 30 seconds per attempt. SubQ's catalog entry declares
no `timeouts.decideMs`, so the 30 seconds of the provider base class applies; it
is not the 5 seconds that TypeSafe, Laya and XOR declare. A timeout raised by
NeuroLink's own clock before any response arrives is retried once, so a request
that never answers fails after about twice the limit (a loopback stand-in, not
SubQ, that never answered was cut off at 30,000 ms and again after the retry,
60.3 to 60.5 s in all, in three runs). A 200 whose body then stalls past the
limit is not retried: the body read is cut off, the payload is empty, and the
call fails after one limit with a `server` error for a response without an
answers map; an error status whose body stalls follows that status's usual retry
rule. That is read from the code, not measured. SubQ's own latency is not
measured here. A state near the window
takes longer to read than a short one, so size `timeoutMs` for the states you
send.

**Price.** SubQ's documentation gives $0.05 per million input tokens and no
charge for output tokens (read on 2026-10-13; check the console for the current
rate). Each response carries `usage.input_tokens`, which `decide()` returns as
`usage.inputTokens`.

### Images

SubQ's documentation describes image input: up to 4 images per request, each an
object with a `mediaType` and a one-line `base64` string, with no `data:`
prefix. NeuroLink's `decide()` prepares images as `data:` URLs, and a catalog
entry cannot yet describe the object form, so SubQ's entry declares no media.
An image attached to a `decide()` call for SubQ is refused before any request,
as `invalid_request`, and the catalog marks the model `vision: false`. To
decide over images today, use [XOR](xor.md), [Perplexity](perplexity-decider.md)
or [Cloudflare Clef](cloudflare-clef.md).

---

## Errors

SubQ's documentation gives an error body of `{"detail": {"error_type": "…",
"message": "…"}}`. NeuroLink shows the `message`, or a `detail` that is a plain
string. A body in any other form, such as a `detail` that is an array, gives only
`SubQ request failed with HTTP <status>`; the kind and the retry behaviour do not
change.

| Reply | Kind                                                                                       | Retried |
| ----- | ------------------------------------------------------------------------------------------ | ------- |
| 401   | `authentication` — the provider instance stops retrying                                    | no      |
| 402   | `invalid_request` — the account has no credits                                             | no      |
| 403   | `invalid_request` — the key cannot use the model                                           | no      |
| 400   | `invalid_request`, with SubQ's reason (for example a prompt past the maximum model length) | no      |
| 422   | `invalid_request`, with SubQ's reason (documented body form)                               | no      |
| 429   | `rate_limit`                                                                               | yes     |
| 503   | `overloaded`                                                                               | yes     |
| 5xx   | `server`                                                                                   | yes     |
| other | `invalid_request`                                                                          | no      |
| image | `invalid_request`, with no network call (see [Images](#images))                            | no      |

Only a 401 stops the instance. A 402 is not treated as a rejected key on
purpose: after you add credit, the same instance works again, with no restart.
An error message never carries the API key; if SubQ echoes it, NeuroLink
replaces it before the message reaches a log or an error.

---

## Data retention

Check [SubQ's data retention page](https://docs.subq.ai/using-the-api/data-retention/)
before sending anything sensitive. SubQ's documentation, as read on 2026-10-13
(a reading made before this page was written, and not repeated for it), says
that prompts are kept indefinitely unless the organization sets otherwise, and
that Decisions are unaffected by zero data retention. Check the page for the
current terms.

---

## What has and has not been checked

- **Read on 2026-10-13, before this page was written and not repeated for it:**
  SubQ's documentation (the endpoint, the error body shape, the limits on
  questions and images, the price and the retention terms), and an
  unauthenticated `GET https://api.subq.ai/v1/models` that listed
  `subq-snap-preview`.
- **One decision was captured:** a single request from SubQ's documentation,
  answered HTTP 200. Its body is the contract fixture's success body,
  `test/fixtures/decide/subq/contract.json`.
- **Observed live on 2026-10-13, in a run made for NeuroLink and not repeated
  for this page:** the over-length 400 above (its body is in the fixture as a
  `seen-live` row; the saved text of the message stops after "number of text
  token") and the largest request answered, 376,180 input tokens.
- **Not captured:** any other error body. Every other error in that fixture is a
  stand-in written from the shape the documentation describes, and is labelled
  so. Whether a 422 ever carries an array `detail` is unknown.
- **Not measured:** a question cap, and what an image costs. The catalog entry
  records no live matrix.

---

## Troubleshooting

- **`SubQ requires an API key`** — set `SUBQ_API_KEY`, or pass
  `credentials.subq.apiKey`. A blank value counts as unset.
- **`Authentication failed`** — SubQ answered 401. Check the key in the console,
  then build a new `NeuroLink` instance: an instance does not retry after a
  rejection.
- **A 402** — the account has no credits. The message says so; add credit and
  call again.
- **A 403** — the key cannot use the model. The message says why.
- **A request to `/v1/v1/systemone`** — `SUBQ_BASE_URL` ends in `/v1`. It should
  be the origin, `https://api.subq.ai`.
- **Built-in routing never uses SubQ** — another decision provider is also
  configured and takes precedence.

---

## See also

- [The `decide` inference type](../../features/decide-inference-type.md)
- [TypeSafe (Jev) Provider Guide](typesafe.md)
- [Laya Provider Guide](laya.md)
- [XOR Provider Guide](xor.md)
- [Perplexity Decisions Provider Guide](perplexity-decider.md)
- [Cloudflare Clef Provider Guide](cloudflare-clef.md)
- [OpenAI Decisions Provider Guide](openai-decisions.md)
- [ScaleDown Provider Guide](scaledown.md)
- [SubQ's Decisions API](https://docs.subq.ai/endpoints/decisions-api/)
