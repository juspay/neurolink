---
title: Cloudflare Clef Provider Guide
description: Cloudflare's Clef decision models on Workers AI that also read images — typed judgments with probabilities, reached with the same CLOUDFLARE_API_KEY and CLOUDFLARE_ACCOUNT_ID as the Workers AI text provider, and limited to about 2,048 tokens of state
keywords: cloudflare, cloudflare-clef, clef, clef-flash, workers ai, decide, decision model, images, confidence, probabilities
---

# Cloudflare Clef Provider Guide

**A provider of `decide`** — the same typed `boolean` / `choice` / `score`
answers as [TypeSafe's Jev](typesafe.md), [Laya](laya.md), [XOR](xor.md) and
[Perplexity](perplexity-decider.md), from Cloudflare's Clef models on Workers
AI, and it also reads images. It emits no text at all.

> This is not the [Cloudflare Workers AI text provider](cloudflare.md)
> (`cloudflare`, which runs chat models). The two are separate providers that
> read the same `CLOUDFLARE_API_KEY` and `CLOUDFLARE_ACCOUNT_ID`; see
> [One token, two providers](#one-token-two-providers).

> **Read [Limits](#limits) before you rely on it.** Workers AI reads only about
> the first 2,048 tokens of the state, far less than the 64K context Cloudflare
> documents, and ignores text past that point without an error (hosted service
> or model: unknown). NeuroLink refuses a state it
> estimates as longer than that rather than let a decision be made on text the
> model never saw.

## Overview

Clef is a decision model: it reads a state and a set of typed questions and
returns a probability for every allowed answer, with no free-form text and no
reasoning tokens to wait for. Cloudflare publishes two sizes, `clef` (27B) and
`clef-flash` (9B), and says it is releasing their weights under the Apache 2.0
license. Both answered in about a second from a developer machine. Cloudflare's
pages call them available, and do not say whether they are generally available
or in beta.

### Key Facts

|                         |                                                                                                                                     |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Provider id             | `cloudflare-clef`                                                                                                                   |
| Models                  | `clef` (27B, the default) and `clef-flash` (9B). `@cf/cloudflare/clef` and `@cf/cloudflare/clef-flash` are accepted too             |
| Question types          | `boolean` (sent as `noul`), `choice` (2 to 255 options), `score` (2 to 10 levels)                                                   |
| Questions per request   | 64                                                                                                                                  |
| Images                  | up to 4 per request: PNG, JPEG or WebP. No video                                                                                    |
| State                   | Workers AI reads about the first 2,048 tokens; NeuroLink refuses a state it estimates at more than 1,500                            |
| Request size            | 256,000 bytes in NeuroLink, base64 image data included                                                                              |
| Endpoint                | `https://api.cloudflare.com/client/v4/accounts/<account id>/ai/run/@cf/cloudflare/<model>`                                          |
| Credentials             | an API token with Workers AI permission, and the account id                                                                         |
| Price                   | $0.24 per million input tokens for `clef`, $0.09 for `clef-flash`; no output price is listed (Cloudflare's Workers AI pricing page) |
| Measured latency        | 2026-10-03: 0.3 to 1.0 s for a small request; 64 questions: 1.1 s (`clef-flash`), 1.3 s (`clef`); 2026-10-04: 1.5 s / 2.3 s         |
| Default decide provider | last, after TypeSafe, Laya, XOR and Perplexity                                                                                      |
| Verified live           | 2026-10-03 and 2026-10-04, with a real account (see [Limits](#limits))                                                              |

## Quick Start

### 1. Get a token and your account id

Create an API token with the **Workers AI: Read + Write** permission at
[dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens), and copy your account id from
the dashboard URL or the "Account ID" panel.

### 2. Configure

```bash
export CLOUDFLARE_API_KEY=your-workers-ai-token
export CLOUDFLARE_ACCOUNT_ID=your-account-id

# Optional
export CLOUDFLARE_CLEF_MODEL=clef-flash                          # default: clef
export CLOUDFLARE_CLEF_BASE_URL=https://api.cloudflare.com/client/v4   # default
```

Or pass them in code, which wins over the environment:

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink({
  credentials: {
    cloudflareClef: { apiKey: "…", accountId: "…" }, // baseURL is optional
  },
});
```

Both the token and the account id are needed: the account id is part of the
route, so a token alone does not count as configured.

### 3. Use it

```typescript
const result = await neurolink.decide({
  provider: "cloudflare-clef",
  state: "Checkout has been failing for every customer for the last hour.",
  questions: {
    urgent: {
      type: "boolean",
      instructions: "Is this support request urgent?",
    },
    team: {
      type: "choice",
      instructions: "Which team should handle this request?",
      criteria: {
        billing: "Payments, invoices, and refunds",
        technical: "Outages, errors, and configuration",
        sales: "Plans and upgrades",
      },
    },
    severity: {
      type: "score",
      instructions: "How severe is the customer impact?",
      criteria: ["No impact", "Minor", "Major", "Critical"],
    },
  },
});

result.answers.urgent; // { type: "boolean", probability: 0.99 }
result.answers.team; // { type: "choice", choice: "technical", probabilities: {…}, confidence: 0.53 }
result.answers.severity; // { type: "score", score: 2.96, legend: {…}, probabilities: {…}, confidence: 0.92 }
```

The figures in the comments are what a live call to `clef` returned for this
example on 2026-10-03, rounded; `clef-flash` answered the same example with
0.96, 0.82 and 0.50, 2.72. Pick the faster model for one call with
`model: "clef-flash"`.

### From the CLI

```bash
neurolink decide "Checkout has been failing for every customer for the last hour." \
  --provider cloudflare-clef \
  --questions '{"urgent":{"type":"boolean","instructions":"Is this support request urgent?"}}'
```

## Images

Pass up to four images beside the state, as a Buffer, a file path or a
`data:image/…;base64,` URL; an `http(s)` URL is refused. PNG, JPEG and WebP are
read; `image/jpg` is accepted as a JPEG alias and sent as `image/jpeg`. Other formats are refused before they are sent.

```typescript
await neurolink.decide({
  provider: "cloudflare-clef",
  state: "Look at the attached image.",
  images: ["./photo.png"],
  questions: {
    color: {
      type: "choice",
      instructions: "What colour is the image?",
      criteria: { red: "red", blue: "blue" },
    },
  },
});
```

- **They travel in their own `images` array**, not inside the state. Cloudflare
  places them before the state.
- **The Workers AI API accepts no video.** Its model page says it does, but the API refuses
  a video and has no field for one, so NeuroLink refuses a `video` too.
- **Pixels:** Cloudflare documents 16 megapixels an image. 16.00 megapixels were
  accepted (4096 × 3900 at 15.97 MP, 8000 × 2000 and 16000 × 1000 at 16.00 MP);
  16.38 megapixels (4096 × 4000) were refused with a 422. The limit is on the
  pixel count, not on either side.
- **Cost:** an image costs at most about 1,000 input tokens however large it is.
  A test request with one 512 × 512 image counted 389 input tokens in all, one
  with a 1,024 × 1,024 image counted 1,157, and larger images up to the pixel
  limit counted between 1,125 and 1,157.
- **How many:** exactly four tiny PNG/JPEG/WebP images succeeded on both models
  on 2026-10-04; a fifth was refused with a 422. Four is also NeuroLink's limit.
- **NeuroLink's size limit is 256,000 bytes** for the encoded request body,
  including base64 image data. A 195 KB PNG encodes to about 260,000 characters
  and is refused locally. **Resize or compress a photo to well under 190 KB first.**
  The 2026-10-03 API probe accepted a 195 KB PNG and refused a 202 KB one.
  That boundary has since moved: on 2026-10-05 both models accepted PNG
  requests with encoded bodies up to 492,485 bytes and refused 532,505 bytes
  (`clef-flash`) and 532,499 (`clef`) (see below), so the 195/202 KB figures are historical and NeuroLink's cap is
  the stricter limit.

## When NeuroLink uses it

Built-in features that call `decide()` pick the first decision provider that is
configured, in this order: TypeSafe, Laya, XOR, Perplexity, then Clef. A host
with none of the first four, but with `CLOUDFLARE_API_KEY` and
`CLOUDFLARE_ACCOUNT_ID` set for the Workers AI text provider, therefore has Clef
as its default decision provider. Naming `provider: "cloudflare-clef"` reaches it
whatever else is configured.

Because of the state window below, a built-in feature whose state is longer than
about 1,500 estimated tokens gets a refusal from Clef, which each of them treats
as "carry on as before". Clef suits short decisions: routing a request, a
guardrail on one action, classifying one message or one picture.

## What is sent to Cloudflare

```json
POST https://api.cloudflare.com/client/v4/accounts/<account id>/ai/run/@cf/cloudflare/clef
Authorization: Bearer <token>

{
  "model": "clef",
  "state": "Checkout has been failing for every customer for the last hour.",
  "questions": {
    "urgent": { "type": "noul", "instructions": "Is this support request urgent?" }
  },
  "images": ["data:image/png;base64,…"]
}
```

`boolean` is the SDK's name for the wire's `noul`. `model` is sent although the
path already names it: Cloudflare's schema marks it required, and a body whose
`model` differs from the path is refused. A request with no `model` was accepted
live and answered by `clef-flash`, so sending it matters only for following the
schema. Cloudflare wraps every answer in its own
envelope, and NeuroLink reads the answers out of it:

```json
{
  "result": {
    "model": "clef",
    "answers": { "urgent": { "type": "noul", "noul": 0.9551 } },
    "usage": { "input_tokens": 346, "output_tokens": 0 }
  },
  "success": true,
  "errors": [],
  "messages": []
}
```

The request id is the `cf-ai-req-id` response header; where that is absent (a
rejected token never reaches the model) it is the edge's `cf-ray`.

## One token, two providers

`cloudflare-clef` and `cloudflare` read the same two variables, but each has its
own credentials slice, so the two cannot be mixed up:

|                 | `cloudflare` (text)         | `cloudflare-clef` (decide)   |
| --------------- | --------------------------- | ---------------------------- |
| Token           | `CLOUDFLARE_API_KEY`        | `CLOUDFLARE_API_KEY`         |
| Account id      | `CLOUDFLARE_ACCOUNT_ID`     | `CLOUDFLARE_ACCOUNT_ID`      |
| SDK credentials | `credentials.cloudflare`    | `credentials.cloudflareClef` |
| Serves          | `generate()` and `stream()` | `decide()` only              |

`credentials.cloudflare` does **not** configure `decide`. Setting the two
variables for the text provider also lets `decide()` use Clef when no other
decision provider is configured, and no switch turns that off while the two
variables are set in the environment. A host that wants the Workers AI text
provider without Clef can give the text provider its token and account id only
through `credentials.cloudflare`, and leave the environment variables unset.

## Limits

### Measured on a real account, October 2026

The Workers AI endpoint ignores text past about 2,048 tokens, far below
Cloudflare's documented 64K context (hosted service or model: unknown). Request-size refusals also changed between two measurement dates.
The original measurements were on 2026-10-03; the bounded follow-up campaign
used 133 probe calls on 2026-10-04, with one request at a time.

**Which model:** on both `clef-flash` and `clef`, the follow-up still read the
fact at the 2026-10-03 `clef-flash` lower bound for logs, number lists, digit
arrays and compact JSON, and did not read it 2.5% to 3.1% further on. English prose and
random CJK had already matched on both models. It also checked the question
count, pixel and four/five-image boundaries on both models, the id, option,
score-level and PNG/JPEG/WebP boundaries on `clef`, and the `image/jpg` case on
both models. Natural-script
prose was measured on `clef`; a reworked many-key object probe matched on both.
TypeScript, minified JSON and synthetic Devanagari/emoji cuts remain 9B-only
measurements. Historical latency, billing and burst figures retain their dates.

| Limit              | Documented                                                                                                          | Measured                                                                                                                              |
| ------------------ | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| State              | a 65,536-token context window; the schema adds that long text "is truncated to fit the model's token limit"         | **text past about 2,048 tokens is ignored without an error; hosted service or model: unknown**                                        |
| Request size       | 4 MiB an image, 8 MiB in all, 13 MiB for the body                                                                   | 2026-10-04, both models: 520,000 text characters accepted, 525,000 refused with 413/code 5021; NeuroLink retains its 256,000-byte cap |
| Questions          | 1 to 64                                                                                                             | 64 sent, the 65th refused with a 422                                                                                                  |
| Question ids       | letters, digits, `_`, `.`, `-`, up to 100                                                                           | the same; 101 characters and a space refused                                                                                          |
| Options and levels | 2 to 255 options, 2 to 10 levels                                                                                    | the same; 256 and 11 refused                                                                                                          |
| Images             | up to 4, 16 megapixels each                                                                                         | 4 tiny images accepted, 5 refused; PNG/JPEG/WebP and image/jpg accepted; 16.00 MP accepted, 16.38 MP refused on both models           |
| Video              | the model page says it reads video                                                                                  | refused: no field, and not accepted in `images`                                                                                       |
| Rate               | not documented on the model page; the pricing page links a limits page and a free allowance of 10,000 neurons a day | 60 requests sent at once: 56 answered, 4 refused with a 429                                                                           |

**The state window (2026-10-03 and 2026-10-04; see [the change of 2026-10-07](#the-state-window-changed-on-2026-10-07)).** A fact placed past about 2,048 tokens of state was ignored
(a 75-character sentence repeated for 60,000 characters: the fact was used at
10,500 characters and ignored from 12,000), a question about the end of a long
text was answered from its beginning, and the reported input tokens stayed at
about 2,190 for any longer text, which is also what is billed. The cut falls at a
different character count for each kind of text. The first five rows are real
text; the last three are **synthetic**, built from cycled code points, so natural
text in those scripts may tokenise differently:

| Text                                       | Characters before the cut | Per token                              |
| ------------------------------------------ | ------------------------- | -------------------------------------- |
| English prose (Cloudflare's launch post)   | 7,517                     | 3.7 characters                         |
| TypeScript (this repository's providers)   | 8,768                     | 4.3 characters                         |
| Minified JSON (a documentation index)      | 9,900                     | 4.8 characters                         |
| Log lines (generated)                      | 2,863                     | 1.4 characters                         |
| A list of numbers (generated)              | 2,040                     | 1.0 characters (each digit is a token) |
| A JSON array of single digits (generated)  | 2,043                     | 1.0 characters (commas count as well)  |
| Four-digit numbers, space separated        | 2,039                     | 1.0 characters                         |
| Records as an object array or compact JSON | 5,141 (97 records)        | 2.5 characters                         |
| The same records, pretty-printed JSON text | 4,055 (49 records)        | 2.0 characters                         |
| Random CJK ideographs (synthetic)          | 1,170                     | 1.75 tokens a character                |
| Cycled Devanagari (synthetic)              | 1,791                     | 1.14 tokens a character                |
| Cycled emoji (synthetic)                   | 707                       | 2.9 tokens a character                 |

An array of records passed as `state` was cut at the same place as compact
JSON text. On both models, the follow-up still read the fact at the
2026-10-03 `clef-flash` lower bound and did not read it 2.5% to 3.1% further on:
2,863–2,935 characters for logs, 2,040–2,091 for number lists, 2,043–2,095 for
digit arrays, and 97–100 records for compact JSON. These two-point checks
do not establish exact tokenizer boundaries.

The many-key object control failed three times, then passed after an explicit
field-name question and zero-padded keys were introduced together. On both models the hidden field stopped being
read between 128 and 134 preceding keys. The lower bound is 4,883 characters of
compact JSON and 2,299 tokens from the provider's estimator, above the local
1,500-token cap. This verifies the tested object shape; it does not establish
that every structured state is serialized identically by Workers AI.

Natural samples were composed as about 3,000 code points of ordinary prose and
repeated to 12,000 to find a cut. The intervals below are on `clef` (27B);
the estimate is evaluated at the lower, still-visible bound.

| Sample                          | Characters before cut, lower–upper | NeuroLink estimate at lower bound |
| ------------------------------- | ---------------------------------- | --------------------------------- |
| Chinese prose                   | 3,749–4,499                        | 5,584                             |
| Japanese prose                  | 3,749–4,499                        | 5,588                             |
| Korean prose                    | 4,499–5,249                        | 5,309                             |
| Hindi prose                     | 2,999–3,749                        | 3,751                             |
| Emoji-rich English conversation | 5,249–5,999                        | 2,396                             |

All exceed 1,500 estimated tokens before the observed cut, so no estimator rate
changed. The mixed emoji conversation is not a measurement of every emoji or
multi-code-point sequence.

**The request size changed.** On 2026-10-03, `clef-flash` accepted 262,000
text characters and refused 270,000; a 195 KB PNG was accepted and a 202 KB
one refused. The 250,000-character request was first tested on 2026-10-04.
On that date both models accepted 270,000, 500,000, 510,000 and 520,000 text
characters, then refused 525,000, 530,000 and 1,000,000 with 413/code 5021.

The refusal estimate is the encoded body bytes / 4: it equals that figure rounded
up in seven of the eight refusals measured on 2026-10-04 and 2026-10-05, and is one
lower in the eighth (a 532,505-byte body gave 133,126). What changed was the refusal threshold: on 2026-10-03, `clef-flash` accepted an
estimate of 65,527 and refused 67,527; on 2026-10-04, both models accepted
130,026 (`clef`) / 130,027 (`clef-flash`) and refused 131,276 / 131,277. The error still
prints a 65,536-token context. **Inference:** the new interval contains 131,072,
twice the printed figure; the reason is unknown. The observed text ceiling is
between 520,000 and 525,000 characters, not a stable API guarantee.

**Images, 2026-10-05.** The image boundary was measured with one request at a time
and incompressible PNGs. `clef-flash` accepted bodies of 252,365, 268,377, 400,441
and 492,485 bytes (one image of about 190, 202, 300 and 370 KB) and refused 532,505
bytes (about 400 KB) with 413/code 5021, estimate 133,126. `clef` accepted a 300 KB
image (400,435 bytes) and four 75 KB images together (400,758 bytes), and refused
the 400 KB image (532,499 bytes, estimate 133,125). Text and images therefore reach
a refusal at about the same body size, between 520,108 and 525,102 bytes for text
and between 492,485 and 532,499 for images. **Inference:** both intervals contain
524,288 bytes (131,072 x 4); the reason the limit moved is unknown.

NeuroLink keeps the 256,000-byte encoded-body cap. It remains below the accepted
request sizes, text and images alike. Live case 19.14 sends an image request just
under the cap through NeuroLink; live canary 19.11 checks the text-only service
ceiling on `clef-flash`.

### The state window changed on 2026-10-07

> **The window described above no longer applies.** On 2026-10-07 the Workers AI
> endpoint read the whole state. This section records what was measured; the
> numbers above stay as the record of 2026-10-03 and 2026-10-04.

Measured with one request at a time between 07:24 and 08:12 UTC, with a fact
placed at the end of the state (the part a cut would drop) and the question "what
colour does the text say the vault code is?". A fact counts as read when the
answer's probability for its colour is at least 0.8.

| State                             | Model        | Characters | Input tokens billed | Fact read (probability) | Time   |
| --------------------------------- | ------------ | ---------- | ------------------- | ----------------------- | ------ |
| Prose, fact at 55,000             | `clef-flash` | 60,032     | 10,555              | yes (0.980)             | 0.8 s  |
| Prose, fact at 55,000             | `clef`       | 60,032     | 10,555              | yes (0.996)             | 2.0 s  |
| Prose, no fact (control)          | `clef-flash` | 60,000     | 10,547              | no (0.297)              | 1.1 s  |
| Prose, no fact (control)          | `clef`       | 60,000     | 10,547              | no (0.170)              | 2.0 s  |
| Prose, fact at 200,000            | `clef-flash` | 240,032    | 41,755              | yes (0.978)             | 3.0 s  |
| Prose, fact at the end            | `clef-flash` | 300,031    | 52,154              | yes (0.984)             | 4.9 s  |
| Prose, fact at the end            | `clef`       | 300,031    | 52,154              | yes (0.996)             | 11.8 s |
| Prose, fact at the end            | `clef-flash` | 500,031    | 86,819              | yes (0.985)             | 19.2 s |
| JSON array of digits, fact at end | `clef-flash` | 115,031    | 115,153             | yes (0.986)             | 11.3 s |
| JSON array of digits, fact at end | `clef-flash` | 158,031    | 158,153             | yes (0.987)             | 30.9 s |
| JSON array of digits, fact at end | `clef-flash` | 190,031    | 190,153             | yes (0.986)             | 39.0 s |
| JSON array of digits, fact at end | `clef`       | 190,031    | none                | HTTP 529, code 5012     | 15.2 s |

The billed input tokens now follow the text (on 2026-10-03 and 2026-10-04 they
stayed at about 2,190 for any longer state), and the largest states tried on
`clef-flash` were read in full: no upper bound was found below 190,153 tokens,
past the 65,536-token context the model page documents. The `clef` (27B) model
read a 52,154-token state, and answered **HTTP 529, code 5012, "Clef inference
failed"** after 15 s for the 190,153-token array; it was not tried between those
sizes. That 529 is the first server-side error seen from this API.

Latency grows with the input: 1.7 to 1.9 s for 20,954 tokens on `clef-flash`,
about 0.2 s per 1,000 input tokens from 50,000 tokens up on both models (11.8 s
for 52,154 tokens on `clef`), and the first request after a pause can be much
slower (19.7 s for 30,153 tokens). Another session reported, from its own saved
benchmark, that `clef` answered 22 of 2,000 short questions differently on
2026-10-07 than on 2026-10-05; that was not verified here.

This is one day of data, from a service whose behaviour changed between 2026-10-03,
2026-10-04, 2026-10-05 and 2026-10-07. Cloudflare was not asked why. NeuroLink's
local limit is unchanged by this section (see [What NeuroLink refuses before any
request](#what-neurolink-refuses-before-any-request)): it now refuses states the
service would read.

### What NeuroLink refuses before any request

| Refused                                                               | Limit                                                                                                        | Error kind                            |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------- |
| A state estimated over 1,500 tokens                                   | digits 1 token each, punctuation 0.75, emoji 3, other non-ASCII text 1.5, letters about 4 characters a token | `max_tokens_exceeded`                 |
| More than 64 questions in one `decide()`                              | 64                                                                                                           | `max_tokens_exceeded`                 |
| A request body over 256,000 bytes                                     | 256,000                                                                                                      | `invalid_request`                     |
| More than 4 images, a video, or a format other than PNG, JPEG or WebP |                                                                                                              | `invalid_request`                     |
| A model name that is not a plain name, such as `clef/../x`            |                                                                                                              | `invalid_request`                     |
| A missing token or account id, or a base URL that cannot work         |                                                                                                              | `authentication` or `invalid_request` |

`NeuroLink.tryDecide()`, which every built-in feature calls, splits a question
map at 64 and runs up to four batches at once, so only a direct `decide()` meets
the 64-question refusal.

**Why 1,500 and not 2,048.** The limit is an estimate in NeuroLink's own tokens,
not the model's, and it was chosen so that for every kind of text in the table
above the estimate reaches 1,500 before the endpoint ignores the remaining state. A rate for
digits alone was not enough: a JSON array of single digits, whose commas are
tokens too, passed with 15% of its length ignored without an error, which is why punctuation
is charged 0.75 and emoji 3. The price is a state of ordinary text uses only
about 60% of the window before it is refused: English prose is refused at about
1,500 estimated tokens, which is about 1,200 of the model's (the estimate runs a
few percent low for prose, and about 12% high for code), and compact JSON at
half the window. The natural samples above also reached the local cap before their observed
cuts. The estimates remain conservative measurements for those samples, rather
than a guarantee for every script or emoji sequence.

### What is not verified

- The status Cloudflare returns for a token without Workers AI permission. No
  such token was available. A 403 is treated as an ordinary `invalid_request`,
  not `authentication`, so that if it does mean a missing permission, fixing it
  in the dashboard works at once, without restarting the process.
- Any 5xx other than one 529. Cloudflare answered a single server error, HTTP 529
  with code 5012 ("Clef inference failed"), to a 190,153-token state on `clef` on
  2026-10-07; the retry and classification of 500, 502, 503 and 504 rest on
  ordinary HTTP conventions.
- What a Workers Paid account that has run out of credit gets. Only the Free plan's
  daily allocation running out was seen (HTTP 429, code 4006, 2026-10-05); it is
  not retried. Cloudflare documents a reset at 00:00 UTC, but this account was
  still refused at 02:38 and 04:12 UTC on 2026-10-06 and answered again at
  07:24 UTC on 2026-10-07, so when the allowance returns here is not verified.
- The 27B TypeScript, minified-JSON and synthetic Devanagari/emoji cuts; see the
  model coverage above.
- The rate limit. Only a burst of 60 was tried.
- Whether Cloudflare's service is generally available or in beta.
- Whether the state window (about 2,048 tokens until 2026-10-04, none found by
  2026-10-07) and the changing request-size limit belong to the hosted service or
  to the model itself. The open weights on Hugging Face
  were not run.
- Whether either limit changes again. The live decide suite carries three canary
  cases that fail with an instruction to re-measure: 19.10 and 19.10b send a
  prose state and a digit array just under NeuroLink's own limit, with a fact at
  the very end, to both models, and fail if the service stops reading below that
  limit; 19.11 checks both sides of the text-only request ceiling on `clef-flash`.
  None of them notices a service that reads more than the limit allows.

### Latency and the timeout

On 2026-10-03, a small request answered in 0.3 to 1.0 s from a developer
machine; 64 questions took 1.1 s on `clef-flash` and 1.3 s on `clef`; the
slowest of 60 requests sent at once took 2.2 s. On 2026-10-04, a
64-question request with the same questions and a shorter state took 1.5 s on `clef-flash` and 2.3 s on `clef`. The default timeout is 5 s. Pass `timeoutMs` to change it for
one call.

## Errors

Cloudflare answers with its own envelope, `{ "success": false, "errors": [{ "code",
"message" }] }`, and a refusal from the model nests a second envelope, with a
trailing request id, inside `message`. NeuroLink flattens both to one line and
takes the request id out of the text.

| Status | Code  | Seen for                                                                                  | Kind                                | Retried                        |
| ------ | ----- | ----------------------------------------------------------------------------------------- | ----------------------------------- | ------------------------------ |
| 401    | 10000 | a token Cloudflare does not know                                                          | `authentication`                    | no; trips the breaker          |
| 403    |       | never seen; a token without Workers AI permission may draw it                             | `invalid_request`                   | no; does not trip the breaker  |
| 400    | 5006  | no questions; an unknown question type                                                    | `invalid_request`                   | no                             |
| 400    | 7000  | a model path that does not exist ("No route for that URI")                                | `invalid_request`                   | no                             |
| 400    | 6003  | a body that is not JSON                                                                   | `invalid_request`                   | no                             |
| 422    | 5012  | a validation failure: 65 questions, a fifth image, an unknown field, an empty instruction | `invalid_request`                   | no                             |
| 413    | 5021  | a request past the estimate above                                                         | `max_tokens_exceeded`               | no                             |
| 429    | 3040  | "Capacity temporarily exceeded"; no `Retry-After`                                         | `rate_limit`                        | yes, after the default backoff |
| 429    | 4006  | "you have used up your daily free allocation of 10,000 neurons"; no `Retry-After`         | `rate_limit`                        | no                             |
| 529    | 5012  | "Clef inference failed", seen once (`clef`, a 190,153-token state, after 15 s)            | `server`                            | yes, once                      |
| 5xx    |       | any other 5xx: never seen from Cloudflare                                                 | `server`, or `overloaded` for a 503 | yes, once                      |

Only a 401 is `authentication`. After one, that provider instance refuses further
calls without sending anything; construct a new one with a working token. "Yes"
means one retry, after about 250 to 500 ms; the base class retries once.

## Troubleshooting

- **"requires the account id"** — set `CLOUDFLARE_ACCOUNT_ID` or
  `credentials.cloudflareClef.accountId`.
- **"The state is ~N tokens; Cloudflare's … model reads at most 1500"** — shorten
  the state, or send only the part the question is about. Cloudflare would have
  cut the rest without telling you.
- **"No route for that URI"** — the model name or the base URL is wrong. Clef is
  served as `clef` and `clef-flash`, and the base URL must end in `/client/v4`.
- **A 429 "Capacity temporarily exceeded"** — retried for you; if it keeps
  happening, send fewer requests at once.
- **A 429 "you have used up your daily free allocation of 10,000 neurons"** — the
  Free plan's allowance for the day is gone. It is not retried, because nothing
  changes until the allowance returns (Cloudflare documents a reset at 00:00 UTC; on
  this account it came back later, see "What is not verified"); upgrade to Workers Paid or wait.
  Built-in features that use Clef as their default fall back as on any failure.
- **An image is refused as "The request is N bytes; Cloudflare accepts at most
  256000"** — Cloudflare counts the base64 text of the image, so NeuroLink
  refuses it locally under the retained conservative cap. Resize or compress it
  to well under 190 KB; a 195 KB PNG, which Cloudflare accepted, is about 260,000
  characters in base64 and is refused here.
- **`decide()` uses Clef although you never chose it** — you have the Workers AI
  token and account id set and no other decision provider; see
  [When NeuroLink uses it](#when-neurolink-uses-it).

## See also

- [The `decide` inference type](../../features/decide-inference-type.md)
- [TypeSafe (Jev) Provider Guide](typesafe.md)
- [Laya Provider Guide](laya.md)
- [XOR Provider Guide](xor.md)
- [Perplexity Decisions Provider Guide](perplexity-decider.md)
- [Cloudflare Workers AI text provider](cloudflare.md)
- [Clef on Workers AI](https://developers.cloudflare.com/workers-ai/models/clef/)
- [Introducing Clef: our open-source decision models, and new RL fine-tuning platform](https://blog.cloudflare.com/clef-decision-models/) (Cloudflare Blog)
