---
title: ScaleDown Provider Guide
description: A hosted decision provider — typed judgments with probabilities from ScaleDown's Classify models, reached at api.scaledown.xyz with SCALEDOWN_API_KEY
keywords: scaledown, classify, classify-1, decide, decision model, confidence, probabilities, system one, x-api-key
---

# ScaleDown Provider Guide

**A provider of `decide`** — the same typed `boolean` / `choice` / `score`
answers as [TypeSafe's Jev](typesafe.md), [Laya](laya.md), [XOR](xor.md),
[SubQ](subq.md), [Perplexity](perplexity-decider.md),
[Cloudflare Clef](cloudflare-clef.md) and
[OpenAI Decisions](openai-decisions.md), from ScaleDown's hosted Classify
models. It emits no text at all.

> **Where the facts about ScaleDown come from.** Everything this guide says about
> ScaleDown's endpoint comes from ScaleDown's own documentation and from probes
> that the marketing session made on 2026-10-15. NeuroLink's project did not
> probe it: no request to ScaleDown was made in building this provider, and the
> 200 replies in NeuroLink's tests are stand-ins written from the documented
> shape, and the error texts in the mocked tests are the ones the marketing
> session reported.
> The passages on the 402, the 422, the default timeout and the billing of
> options also use a live test of this provider that the marketing session ran on
> 2026-10-20 (301 `decide()` calls, 295 answered); each says so where it does.
> Each item that nobody measured is listed under
> [Not measured](#not-measured).

---

## Overview

`classify-1` is ScaleDown's decision model. You send one `state` plus named,
typed questions. The model answers every question in a single request and
returns a typed answer for each, with a probability instead of a sentence.
ScaleDown speaks the same System One wire as TypeSafe, so NeuroLink describes it
with one catalog file, `src/lib/providers/catalog/scaledown.json`, and no
provider code of its own. NeuroLink calls ScaleDown's public endpoint, so a key
alone configures it: there is no base URL to set.

### Key Facts

|                       |                                                                                                                                                                                     |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Provider id           | `scaledown`; the alias `scaledown-classify` names it too                                                                                                                            |
| Inference type        | `decide` only                                                                                                                                                                       |
| Models                | `classify-1` (the default) and `classify`, which ScaleDown describes as its latest Classify model. Any other name is refused by ScaleDown with HTTP 422. `SCALEDOWN_MODEL` sets one |
| Key                   | `SCALEDOWN_API_KEY`, or `credentials.scaledown.apiKey`. The variable is ScaleDown's own: no text provider reads it                                                                  |
| Key header            | `x-api-key: <key>`. NeuroLink never sends `Authorization: Bearer` to ScaleDown                                                                                                      |
| Endpoint              | `POST https://api.scaledown.xyz/v1/scaledown`; `SCALEDOWN_BASE_URL` or `credentials.scaledown.baseURL` can name another base URL (see [Base URL](#base-url))                        |
| State                 | text only: a string goes out unchanged, any other value as its JSON text; see [How the state is sent](#how-the-state-is-sent)                                                       |
| Questions per request | no cap declared                                                                                                                                                                     |
| State window          | none declared, so nothing is refused locally on size; ScaleDown's input ceiling is not measured                                                                                     |
| Media                 | none. Images and video attached to a `decide()` call are refused before any request; see [Images and video](#images-and-video)                                                      |
| Default timeout       | 30 seconds per attempt, declared in the entry; `timeoutMs` or `--timeout` replaces it; see [Timeouts](#timeouts)                                                                    |
| Cost                  | priced per input token, input only; see [Cost](#cost) for the rate, its source and its date                                                                                         |
| Precedence            | the last of the eight: used automatically only when none of TypeSafe, Laya, XOR, SubQ, Perplexity, Cloudflare Clef or OpenAI Decisions is configured                                |
| Status                | NeuroLink lists both models as `preview`                                                                                                                                            |

---

## Quick Start

### 1. Get a key

Create an account and an API key by following
[ScaleDown's documentation](https://docs.scaledown.ai). Sign-up gives a free
allowance; its expiry is not established. ScaleDown's documentation says a
request made with no credit left returns HTTP 402, and a live test saw it return
402 for a key it does not recognise too (see [Errors](#errors)).

### 2. Configure

Set the key in the environment:

```bash
export SCALEDOWN_API_KEY=...                       # the key from ScaleDown
export SCALEDOWN_MODEL=classify-1                  # optional
export SCALEDOWN_BASE_URL=https://api.scaledown.xyz  # optional; see "Base URL"
```

or in the config passed to the SDK, exactly as for any other provider. Values
passed per call override the constructor's, which override the environment:

```typescript
// For the whole instance
const neurolink = new NeuroLink({
  credentials: {
    scaledown: { apiKey: process.env.MY_SCALEDOWN_KEY },
  },
});

// Or for one call
await neurolink.decide({
  provider: "scaledown",
  credentials: {
    scaledown: { apiKey: process.env.MY_SCALEDOWN_KEY },
  },
  state: "We were billed twice for March. Please refund it today.",
  questions: {
    urgent: { type: "boolean", instructions: "Is this urgent?" },
  },
});
```

`credentials.scaledown` is its own slice (`apiKey` and `baseURL`). A blank
`SCALEDOWN_API_KEY` or `credentials.scaledown.apiKey` counts as no key.

### Base URL

`SCALEDOWN_BASE_URL` and `credentials.scaledown.baseURL` name the part of the URL
in front of `/v1/scaledown`. It can be an origin, such as
`https://api.scaledown.xyz`, or an origin with a path prefix, such as a gateway
that forwards `https://gateway.example.com/scaledown` to ScaleDown. NeuroLink
drops trailing slashes and appends `/v1/scaledown`, so a value that already ends
in `/v1` would send the request to `/v1/v1/scaledown`. A blank value is no
override. NeuroLink checks nothing else about the value before the request.

### 3. Use it

```typescript
import { NeuroLink, readDecisionChoice } from "@juspay/neurolink";

const neurolink = new NeuroLink();
const result = await neurolink.decide({
  provider: "scaledown",
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
    severity: {
      type: "score",
      instructions: "How severe is the problem?",
      criteria: ["Cosmetic", "Inconvenient", "Customer is blocked"],
    },
  },
});
const team = readDecisionChoice(result.answers, "team");
```

`result.model` is the model ScaleDown's reply names, which can differ from the
one you asked for (`classify` is ScaleDown's name for its latest Classify model).
`result.usage.inputTokens` is the reply's `usage.input_tokens`.

### From the CLI

```bash
neurolink decide "We were billed twice for March." --provider scaledown \
  --questions '{"urgent":{"type":"boolean","instructions":"Is this urgent?"}}'
```

The text output ends with a `Cost:` line, priced from the input tokens the reply
reports (see [Cost](#cost)).

---

## How a request is sent

ScaleDown's wire is System One's, so you write the same questions as for any
other decide provider.

| NeuroLink | Sent to `/v1/scaledown`                                                                                    |
| --------- | ---------------------------------------------------------------------------------------------------------- |
| the key   | the header `x-api-key: <key>`, beside `Content-Type: application/json`; there is no `Authorization` header |
| the model | `model` in the body (`classify-1` unless you set another)                                                  |
| `state`   | `state`, always a string; see below                                                                        |
| `boolean` | a `noul` question with its `instructions`                                                                  |
| `choice`  | a `choice` question; `criteria` maps each option name to its description                                   |
| `score`   | a `score` question; `criteria` is an ordered list of level descriptions                                    |

The reply has the System One shape, an `answers` object keyed by question id,
plus `model` and `usage` (`input_tokens`, `output_tokens` and a `cost` in USD).
A `boolean` answer carries a probability. A `choice` or `score` answer carries
the confidence the reply reports and a probability for each option or level; when
a reply omits the confidence, NeuroLink uses the highest probability in that
answer's distribution instead. Whether ScaleDown's confidence is calibrated is
not established, so tune a threshold on it against your own labelled data.

ScaleDown's documentation describes a `score` question's `criteria` as an ordered
list of 2 to 10 level descriptions. NeuroLink does not enforce that; ScaleDown
does: a list of 11 levels was refused with HTTP 422 in the live test of
2026-10-20 (`'criteria' must have between 2 and 10 levels, got 11`).

### How the state is sent

ScaleDown's documentation says it reads only the `text` and `document` fields of
the state, and treats a string state as shorthand for `{ "text": <the string> }`.
NeuroLink therefore sends the state as a string, whatever you pass:

| You pass                                  | ScaleDown receives                              |
| ----------------------------------------- | ----------------------------------------------- |
| a string                                  | the string, unchanged (not trimmed)             |
| an object, an array, a number, a boolean  | its JSON text, as one string (`JSON.stringify`) |
| `{}` or `[]`                              | the two-character text `{}` or `[]`             |
| a string that is empty or only whitespace | nothing: refused locally, before any request    |

Two consequences:

- **An object state is classified as text.** ScaleDown does not read an object's
  other keys, so `{ "title": "...", "review": "..." }` reaches it as the JSON text
  of that object, and an object that has a `text` field is not unwrapped either.
  If you want it to read plain prose, pass a string.
- **`{}` and `[]` are not refused.** They are non-blank text, so they are sent
  and ScaleDown classifies the literal characters. ScaleDown itself answers HTTP
  422 (`'state.text' or 'state.document' must be provided`) to an empty or
  text-less state object, as the marketing session saw on 2026-10-15, but
  NeuroLink never sends one. Check for an empty container yourself if you want it
  refused.

A blank string is refused as an `invalid_request`, with a message that names
ScaleDown and the rule (`needs non-blank state text`) and never repeats the state.
`decide()` rejects with it, `tryDecide()` returns `null`, and no request is made.
This is a catalog setting, `decide.stateEncoding`: see
[How the catalog entry says this](#how-the-catalog-entry-says-this).

### Choice options and billing

ScaleDown's documentation says every option of a `choice` question is scored by
a separate internal call. The input tokens a request was charged for did not
grow with the number of options times the length of the state when that was
measured. In the live test of 2026-10-20 one `choice` question, whose options
each had a description of about 20 characters, was sent three times with the
same 20,000-character state:

| Options | Input tokens charged | If charged as options times state length, scaled from 3 options |
| ------- | -------------------- | --------------------------------------------------------------- |
| 3       | 2,966                | 2,966                                                           |
| 6       | 3,024                | 5,932                                                           |
| 12      | 3,137                | 11,864                                                          |

That is the state once, plus about 19 tokens for each option added to the three
(58 for three more, 171 for nine more). The same 12 options on a 55-character
state were charged 436 tokens.

**Not known:** how ScaleDown counts these tokens, and so what the internal call
per option adds to the count; whether the amount per option depends on the text
of the options, the number of questions or the model; and whether the count holds
beyond 12 options or 20,000 characters. The marketing session's figures from
2026-10-15, about 1,829 input tokens for a 20-option choice and about 13,059 for
a 255-option choice, each on a one-sentence state, were not measured again and
are not reconciled with the line above.

NeuroLink declares no cap on options. A probe by the marketing session saw a
255-option choice answered and a 300-option choice refused with HTTP 502; the
limit between them is not mapped. When ScaleDown answers a request with HTTP 502,
as it did to the 300-option probe, NeuroLink reports a `server` error, retries
once, and every built-in consumer then treats the decision as failed and falls
back. Whether a refused request is charged is not established. Keep the number of
options of a `choice` question modest, and see [Cost](#cost).

---

## When NeuroLink uses it

Every built-in consumer of `decide` — model routing, relevance-driven
compaction, tool routing and RAG planning — asks for the default decision
provider. That is the first one that is configured, in the environment or in
the `credentials` passed to the SDK, in the order TypeSafe, [Laya](laya.md),
[XOR](xor.md), [SubQ](subq.md), [Perplexity](perplexity-decider.md),
[Cloudflare Clef](cloudflare-clef.md), [OpenAI Decisions](openai-decisions.md),
then ScaleDown. ScaleDown counts with its key alone. So:

- **Only a ScaleDown key:** built-in features use ScaleDown, and each of their
  decisions is then a paid request (see [Cost](#cost)) that still falls back to
  what NeuroLink did before on any failure.
- **A ScaleDown key, plus any earlier provider's key:** built-in features use
  that earlier provider. ScaleDown runs only where a caller asks for
  `provider: "scaledown"`.
- **A blank `SCALEDOWN_API_KEY`:** no key. ScaleDown is not configured.
- **`provider: "scaledown"` with no key:** an `authentication` error and no
  request.

**ScaleDown is last on purpose, and its key is not shared.** Apart from ScaleDown, the providers that
come after SubQ in the order are the ones whose key is also read by a text
provider (Perplexity's, the Cloudflare pair and OpenAI's), placed behind it so
that a key set only for a text provider cannot displace a decision provider a
host set up on purpose. That reasoning does not cover ScaleDown, whose key
belongs to no other provider: it was placed last, after OpenAI Decisions, as a
deliberate choice and not by that rule. The effect is that an ambient `OPENAI_API_KEY`, `PERPLEXITY_API_KEY` or
Cloudflare pair in the environment outranks a `SCALEDOWN_API_KEY` set on purpose.
The one exception is a gateway's key: an `OPENAI_API_KEY` found only in the
environment is skipped for the default while `OPENAI_BASE_URL`, `OPENAI_API_BASE`
or `credentials.openai.baseURL` names a host other than `https://api.openai.com`,
so with nothing earlier configured ScaleDown is the default. That skip does not
apply when `OPENAI_DECISIONS_BASE_URL` is set or `credentials.openaiDecisions`
supplies a key or a base URL; OpenAI Decisions then outranks ScaleDown again (see
[A gateway's key](openai-decisions.md#a-gateways-key-is-never-used-for-the-default)).
A host that wants ScaleDown for the built-in features must not have the earlier
providers configured, or must name it in its own calls.

The classifier router's `auto` strategy counts `SCALEDOWN_API_KEY` too: with
only that key set, `auto` resolves to `jev` and ScaleDown answers.

---

## How the catalog entry says this

`scaledown.json` needed two optional keys in its `decide` block that no earlier
entry set, both read by the shared catalog engine for any entry that sets them.
An entry that omits them behaves exactly as before.

| Key             | Value         | What it does                                                                                                                                                                                                                                                                                   |
| --------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `authHeader`    | `"x-api-key"` | The API key is sent as `x-api-key: <key>` and no `Authorization` header is sent at all. `"bearer"`, the default when the key is omitted, sends `Authorization: Bearer <key>`. This is the decide request's own setting; `quirks.authHeaderStyle` belongs to the chat path and is not read here |
| `stateEncoding` | `"text"`      | The state that goes out is always a string: a string is sent unchanged (not trimmed), any other value as its JSON text, and a state that is blank after trimming is refused before any request as an `invalid_request`. Omitted means the state goes out as given                              |

The rest of the entry is the same kind of data every decide entry carries: the
`system-one` dialect, order 8, the endpoint `{baseURL}/v1/scaledown`, the model in
the body, trailing slashes dropped from the base URL, and the error rules in the
table below. The fields are also described in the generated API reference, under
`DecideBlock`.

---

## Images and video

ScaleDown's endpoint reads text only, and the catalog entry declares no media. An
image or a video attached to a `decide()` call for ScaleDown is refused before any
request, as an `invalid_request`, and the catalog marks both models
`vision: false`. This refusal comes before the blank-state check, so a call that
carries media is always refused for the media. To decide over images today, use
[XOR](xor.md), [Perplexity](perplexity-decider.md),
[Cloudflare Clef](cloudflare-clef.md) or [OpenAI Decisions](openai-decisions.md).

---

## Timeouts

The default is 30,000 ms per attempt. The entry declares it (`timeouts.decideMs`
in `scaledown.json`). It is not the 5,000 ms of `DEFAULT_DECISION_TIMEOUT_MS`:
that constant comes after the provider's own default timeout, which is 30,000 ms
on the provider base class, so it is never reached. A provider that wants a
shorter limit declares one, as TypeSafe, Laya and XOR declare 5,000 ms.

30 seconds is not derived from a measurement of ScaleDown, but a 5-second limit
would have cut answers off. In the live test of 2026-10-20, with no `timeoutMs`, 10 identical
265-token requests were answered in 0.3 to 9.8 s, and two of them (6.1 s and
9.8 s) took longer than 5 s. A choice question is scored once per option, and the
marketing session saw one ScaleDown 504 (`Endpoint request timed out`) after
about 29 seconds. ScaleDown's own latency is otherwise not measured here, so a
caller with many options or a long state should pass `timeoutMs`.

A 504 that ScaleDown sends is classified `timeout` and is not retried. A timeout
raised by NeuroLink's own clock is retried once, so a request that never answers
fails after about twice the limit (a loopback stand-in, not ScaleDown, that did
not answer in 30 s was cut off at 30,000 ms and retried, 60.4 s in all).

---

## Cost

**List price:** USD 0.05 per million input tokens, with output tokens not
charged, from ScaleDown's launch post and from the `usage.cost` in a response, as
reported to this project by the marketing session on 2026-10-15. This project has
not priced a call itself and has not checked the rate since, so check ScaleDown's
dashboard for the current one.

NeuroLink prices a decision from the input tokens the reply reports, at that one
rate, and counts output tokens at nothing. It does not read the reply's
`usage.cost`. `result.usage` and the CLI's `Cost:` line are therefore an estimate
from the list price, not a bill. A reply that reports no usage is priced at zero.
The sign-up allowance is a free allowance whose expiry is not established.

---

## Errors

ScaleDown's documentation lists HTTP 402 (insufficient credits), 422 (invalid),
502 (model service error) and 504 (timeout). The marketing session also saw, on
2026-10-15, a 429 `Max queue length has been reached` (no rate-limit headers; it
cleared after a few seconds) and a 504 `Endpoint request timed out`, and each
was answered when it retried by hand. NeuroLink shows the `detail` text of an
error body, whether it is a plain string, an object with a `message`, or a list
of validation errors. A list, which is the form both 422 bodies took in the live
test of 2026-10-20, is shown as `Request failed validation — <where>: <reason>`,
for up to five entries and without the `input` each entry echoes back (that is
the request, state included). A body in any other form gives only
`ScaleDown request failed with HTTP <status>`; the kind and the retry behaviour
do not change.

| Reply                                                | Kind                                                                      | Retried   |
| ---------------------------------------------------- | ------------------------------------------------------------------------- | --------- |
| 401                                                  | `authentication` — the provider instance stops retrying                   | no        |
| 402                                                  | `invalid_request` — no credit left, or a key ScaleDown does not recognise | no        |
| 422                                                  | `invalid_request`, with ScaleDown's reason when the body shows one        | no        |
| 429                                                  | `rate_limit`                                                              | yes, once |
| 502                                                  | `server`                                                                  | yes, once |
| 504                                                  | `timeout`                                                                 | no        |
| other 5xx                                            | `server`                                                                  | yes, once |
| any other status                                     | `invalid_request`                                                         | no        |
| no response within the timeout                       | `timeout`                                                                 | yes, once |
| the request fails before any reply (DNS, connection) | `network`                                                                 | yes, once |
| a blank string state (local)                         | `invalid_request`, with no network call                                   | no        |
| an image or a video (local)                          | `invalid_request`, with no network call                                   | no        |
| no key configured (local)                            | `authentication`, with no network call                                    | no        |

**A 402 does not tell an empty account from an unrecognised key.** In the live
test of 2026-10-20 a made-up key was answered HTTP 402
`{"detail":"Insufficient credits"}` both times it was tried, and a real key was
answered 200 immediately before and after each try, so the account had credit.
ScaleDown documents the same status for an account with no credit left, and the
body text is the same, so the status cannot say which it is. NeuroLink keeps the
kind `invalid_request` and adds the ambiguity to the message:

```text
Insufficient credits — ScaleDown answers HTTP 402 both when the account has no credit left and when it does not recognise the API key; check SCALEDOWN_API_KEY first.
```

It does not call a 402 `authentication`: that would stop a provider instance you
keep, and an empty account is fixed by adding credit, not by changing the key.
The 401 the marketing session saw on 2026-10-15
(`x-api-key header is required`) answered a request that sent the key as a Bearer
token, so it carried no `x-api-key` header; NeuroLink always sends that header,
and a missing key is refused before any request.

Only a 401 stops the instance, because a bad key does not fix itself: after the
first rejection that instance sends no more requests, and a new `NeuroLink`
instance asks again. Because `neurolink.decide()` and `neurolink.tryDecide()`
build a fresh provider for every call, the latch holds only for a provider
instance you keep, not across public calls. A 402 and a 422 do not latch: after
you add credit, correct the key or fix the request, the same instance works
again.

An error message never carries the API key. Before the message of an error reply
reaches a log or an error, NeuroLink removes the configured key (if ScaleDown
echoes it in a body), anything shaped like a key beginning `sk-`, long hex runs
and embedded `data:` URLs.

---

## Data retention

NeuroLink has not read ScaleDown's data-handling terms. The state and the questions
of every request go to `api.scaledown.xyz`, including the ones the built-in
consumers send for model routing, compaction, tool routing and RAG planning
whenever ScaleDown is the default decision provider. Read ScaleDown's terms before
sending anything sensitive.

---

## Not measured

Each item below is **not measured** by NeuroLink: nothing it was built or tested
from says what the endpoint does beyond the marketing session's probes, and no
request was made to ScaleDown for this project.

1. **Context size and input ceiling**, for either model. The catalog records a
   `contextWindow` of 128000 and a `maxOutputTokens` of 1 for `classify-1`, and
   both are placeholders the catalog schema requires. 128000 is NeuroLink's own
   default window for a model it knows nothing about, and 1 is the figure SubQ's
   entry uses for a model that returns no text. Neither is a ScaleDown statement,
   and the entry declares no `decisionLimits`, so nothing is refused locally on
   the size of a state.
2. **Latency**, for any size of state or number of options. The 30-second default
   is declared in the entry, not derived from a measurement of ScaleDown. The live
   test of 2026-10-20 saw 265-token requests answered in 0.3 to 9.8 s and states of
   20,000 to 150,000 characters (3 options) answered in under 1.3 s.
3. **Rate limits.** A 429 `Max queue length has been reached`, with no
   rate-limit headers, was seen by the marketing session on 2026-10-15; no limit
   is mapped.
4. **The maximum number of options in a `choice`, and of questions per request.**
   (A `score` with 11 levels was refused with HTTP 422 and one with 3 was
   answered; the rest of the range was not probed.)
5. **Whether `classify` moves** to a newer model, and what that would change in an
   answer.
6. **Accuracy** of its answers against any other decide provider, and whether its
   confidences are calibrated.
7. **How long the free allowance lasts.** Its expiry is not established.
8. **Whether a request ScaleDown refuses** (an HTTP 502, 422 or 504) **is charged.**
9. **ScaleDown's data-retention terms.**

---

## What has and has not been checked

- **Read or probed by the marketing session on 2026-10-15, not by this project:**
  ScaleDown's documentation (the endpoint, the model names, the question kinds,
  the documented error statuses and the price); a request that sent the key as a
  Bearer token answered HTTP 401 `{"detail":"x-api-key header is required"}`; a
  model name other than `classify` or `classify-1` answered HTTP 422; a state with
  no `text` or `document` answered HTTP 422; the 255-option and 300-option choice
  requests above; the 429 and the 504 above.
- **Live test by the marketing session, 2026-10-20:** 301 `decide()` calls
  through this provider (295 answered). It found the 402 for an unrecognised key,
  the list-shaped 422 body, the default timeout and the billing of options
  described above. Its two 422 bodies and the 402 text are what the mocked tests
  for those cases use.
- **In this project:** the whole behaviour of the entry is tested against stand-in
  replies, except for the bodies just named: the mocked provider suite (the
  request headers, body and URL, every status above, the state rules, the order),
  the decide provider contract (`test/fixtures/decide/scaledown/contract.json`,
  whose rows are all stand-ins and none claims to have been seen live), and a CLI
  run against a local server on 127.0.0.1. None of them reaches ScaleDown.
- **Not recorded in the catalog entry:** a live matrix. `evidence.liveMatrix` is
  still empty.

---

## Troubleshooting

- **`ScaleDown requires an API key`** — set `SCALEDOWN_API_KEY`, or pass
  `credentials.scaledown.apiKey`. A blank value counts as unset.
- **A 401** — ScaleDown rejected the key, and the message carries its text. Check
  the key. `neurolink.decide()` builds a fresh provider for every call, so the
  next call asks again; only a provider instance you keep stops sending after a
  rejection.
- **A 402** — either no credit is left or ScaleDown does not recognise the key:
  both arrive as HTTP 402 `Insufficient credits`, and the message says so. Check
  `SCALEDOWN_API_KEY` (or the key you passed in `credentials.scaledown.apiKey`)
  first, then the balance. Fix whichever it is and call again; the same instance
  works again.
- **A 422** — ScaleDown refused the request, and the message carries its reason.
  Two were recorded: a model name other than `classify` or `classify-1`, and a
  `score` question with more than 10 levels. For a `score` question the reason
  is the last of several entries; the ones before it are ScaleDown rejecting the
  other question types.
- **`ScaleDown needs non-blank state text`** — the state was an empty string or
  only whitespace. Nothing was sent.
- **`ScaleDown does not accept images or video`** — ScaleDown reads text only. Use
  a decision provider that reads images.
- **A 502 on a `choice` question with very many options** — a probe by the
  marketing session saw a 300-option choice refused this way. Send fewer options.
- **A 504 / `timeout`** — see [Timeouts](#timeouts). Pass a larger `timeoutMs`.
- **A request to `/v1/v1/scaledown`** — `SCALEDOWN_BASE_URL` ends in `/v1`. Drop it.
- **Built-in routing never uses ScaleDown** — an earlier provider is also
  configured and takes precedence (see [When NeuroLink uses it](#when-neurolink-uses-it)),
  or no key is set.
- **A question is missing from `result.answers`** — the reply left it out, or its
  answer could not be read. An answer that could not be read is logged as a
  warning that names the question and never quotes the reply; a question the
  reply leaves out entirely is not logged, so look for it in `result.answers`.

---

## See also

- [The `decide` inference type](../../features/decide-inference-type.md)
- [TypeSafe (Jev) Provider Guide](typesafe.md)
- [Laya Provider Guide](laya.md)
- [XOR Provider Guide](xor.md)
- [SubQ Provider Guide](subq.md)
- [Perplexity Decisions Provider Guide](perplexity-decider.md)
- [Cloudflare Clef Provider Guide](cloudflare-clef.md)
- [OpenAI Decisions Provider Guide](openai-decisions.md)
- [ScaleDown's documentation](https://docs.scaledown.ai)
