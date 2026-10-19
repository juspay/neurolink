---
title: XOR Provider Guide
description: An open-weights decision provider that also reads an image and audio and extracts typed values — calibrated judgments from Juspay's XOR, at any deployment or LiteLLM proxy route you configure
keywords: xor, decide, decision model, open weights, images, audio, value extraction, litellm, calibrated confidence, system one
---

# XOR Provider Guide

**A provider of `decide`** — the same typed `boolean` / `choice` /
`score` answers as [TypeSafe's Jev](typesafe.md) and [Laya](laya.md), plus
`value` extraction and a `choice` with an `unknown` option, from Juspay's
open-weights model, which also reads an image and an audio clip. It emits no
text at all.

---

## Overview

XOR is Juspay's Apache-2.0 decision model, post-trained from Qwen3.6-35B-A3B.
It is asked for by one of two aliases: `xor-latest`, the text model, and
`xor-omni`, the multimodal one, which also reads an image and audio. You send
one `state` plus named, typed questions, and optionally an image or a clip. XOR
answers every question in a single batched pass and returns a typed answer for
each; the result's `model` is the id that served the request (for example
`xor-text-1`), not the alias you asked for. NeuroLink calls whatever base URL
you configure — a deployment of the model, or a LiteLLM proxy with a route to
one. There is no built-in endpoint. The weights and setup instructions are at
[huggingface.co/juspay/xor](https://huggingface.co/juspay/xor).

### Key Facts

|                       |                                                                                               |
| --------------------- | --------------------------------------------------------------------------------------------- |
| Inference type        | `decide` only                                                                                 |
| Model                 | `xor-latest` by default, `xor-omni` for media and `value`; `XOR_MODEL` sets your proxy's name |
| Question types        | `boolean`, `choice` (optionally with `unknown`), `score` and `value`                          |
| Media                 | one image and one audio clip (first 30 seconds heard); no video; body at most 25 MB           |
| Input window          | 120,000 estimated tokens of state on `xor-latest`, 28,000 on `xor-omni`                       |
| Questions per request | 128 (`tryDecide()` splits more); a `choice` takes 2 to 64 options, a `score` 2 to 10 levels   |
| Endpoint              | `<base URL>/v1/decisions`; the base URL is required, with no default                          |
| Precedence            | used automatically only when TypeSafe and Laya are not configured                             |

---

## Quick Start

### 1. Get an endpoint and a key

Run a deployment of XOR (see
[huggingface.co/juspay/xor](https://huggingface.co/juspay/xor)), or use a
LiteLLM proxy with a route to one. NeuroLink posts to `<base URL>/v1/decisions`.
The base URL is the origin of the deployment or of the proxy route, and a
trailing `/v1` is accepted. It must be `https://`; `http://` is accepted only for
`localhost`, `127.0.0.1` and `[::1]`, because every request carries the key and the
state. A deployment reachable only over plain http inside a network needs an
`https://` front, or a port-forward to `localhost`. On a LiteLLM proxy the key's team must be allowed
the model you ask for (`xor-latest` by default, `xor-omni` for media); otherwise the proxy answers 403
`team_model_access_denied`. A proxy may serve XOR under a name of its own: set
`XOR_MODEL` to that name.

### 2. Configure

Both the base URL and the key are required. Set them in the environment:

```bash
export XOR_BASE_URL=https://your-proxy.example.com  # NeuroLink calls <base>/v1/decisions
export XOR_API_KEY=sk-...                           # the key your endpoint accepts
export XOR_MODEL=xor-latest                         # optional; the default
```

or in the config passed to the SDK, exactly as for any other provider. Values
passed per call override the constructor's, which override the environment:

```typescript
const neurolink = new NeuroLink({
  credentials: {
    xor: {
      baseURL: "https://your-proxy.example.com",
      apiKey: process.env.MY_XOR_KEY,
    },
  },
});
```

### 3. Use it

```typescript
import { NeuroLink, readDecisionChoice } from "@juspay/neurolink";

const neurolink = new NeuroLink();
const result = await neurolink.decide({
  provider: "xor",
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

The CLI reads the same environment variables:

```bash
neurolink decide "We were billed twice for March." --provider xor \
  --questions '{"urgent":{"type":"boolean","instructions":"Is this urgent?"}}'
```

---

## Extracting values

A `value` question pulls one typed field out of the state. `dtype` is `string`
(the default), `int` or `float`, and an optional `pattern` is a regular
expression the extracted text must match. A field the state does not hold comes
back as `value: null` with `unknown: true`:

```typescript
import { NeuroLink, readDecisionValue } from "@juspay/neurolink";

const result = await new NeuroLink().decide({
  provider: "xor",
  model: "xor-omni",
  state: "Invoice INV-2024-0892 for 18,275.50 rupees, due on 15 September.",
  questions: {
    amount: { type: "value", dtype: "float", instructions: "Invoice amount?" },
    ref: {
      type: "value",
      instructions: "Invoice reference?",
      pattern: "INV-[0-9]{4}-[0-9]{4}",
    },
    phone: { type: "value", instructions: "Customer phone number?" },
  },
});
readDecisionValue(result.answers, "amount"); // { value: 18275.5, confidence: 0.99, unknown: false }
readDecisionValue(result.answers, "phone"); // { value: null, confidence: 0.82, unknown: true }
```

`xor-omni` answers `value`. When nobody chose a model — the call names none and
`XOR_MODEL` is unset — a request with a `value` question goes to `xor-omni`
directly and is checked against its 28,000-token window, since `xor-latest`
cannot answer it (a LiteLLM gateway would hand it to `xor-omni` behind your back,
past a window NeuroLink never checked). A model you name is always the one sent:
asked of `xor-latest` explicitly, a gateway with that fallback still answers it,
and a deployment without one refuses it with a 422 that arrives as
`invalid_request`. Every other decision provider refuses a `value` question
before any request.

A `choice` with `unknown: true` adds an option named `unknown`, picked when none
of the criteria fits; the answer then carries `unknown: true`. The 64-option cap
counts it, and no option may itself be named `unknown`.

---

## Images, audio and video

XOR reads **one image** and **one audio clip** alongside the `state`, through the
`xor-omni` model. A request carrying either goes there by itself when nobody
chose a model, as a `value` question does; name it (`model: "xor-omni"`, or
`--model xor-omni` on the CLI) if `XOR_MODEL` points elsewhere. It does **not**
read video: the gateway drops a
video and the model answers without it (a solid red clip was answered exactly as
garbage bytes were), so NeuroLink refuses one before any request rather than
return a blind answer. TypeSafe, Laya, [SubQ](subq.md) and
[ScaleDown](scaledown.md) do not read media, and [Perplexity](perplexity-decider.md),
[Cloudflare Clef](cloudflare-clef.md) and [OpenAI Decisions](openai-decisions.md)
read images only.

```typescript
import { readFile } from "node:fs/promises";
import { NeuroLink, readDecisionChoice } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// One image: a file path, a Buffer or a data: URL
const photo = await neurolink.decide({
  provider: "xor",
  model: "xor-omni",
  state: "A product photo from a listing.",
  images: [await readFile("./front.jpg")],
  questions: {
    color: {
      type: "choice",
      instructions: "What color is the product?",
      criteria: { red: "Mostly red", blue: "Mostly blue" },
    },
  },
});
const color = readDecisionChoice(photo.answers, "color");
console.log(photo.mediaBytes); // encoded size of the media sent

// An audio clip; the state may be empty
const call = await neurolink.decide({
  provider: "xor",
  model: "xor-omni",
  state: "",
  audio: "./call.wav",
  questions: {
    language: {
      type: "choice",
      instructions: "Which language is spoken?",
      criteria: { english: "English", hindi: "Hindi" },
    },
  },
});
```

From the CLI, pass `--image <path>` or `--audio <path>`; with `--audio` the state
may be left out:

```bash
neurolink decide --provider xor --model xor-omni --audio ./call.wav \
  --questions '{"language":{"type":"choice","instructions":"Which language is spoken?","criteria":{"english":"English","hindi":"Hindi"}}}'
```

The rules:

- **One image and one audio clip** per request, in `images` and `audio`; a
  second image is refused before any request.
- **Each is a Buffer, a local file path or a `data:` URL.** An `http(s)` URL is
  refused: NeuroLink does not fetch media for you.
- **The type comes from the bytes, not the file extension**: PNG, JPEG, WebP
  and GIF images, and WAV, FLAC, Ogg (Vorbis or Opus) and MP3 audio, each of
  which was heard with speech in testing (English identified at 0.9999). An image
  goes to XOR as a `data:` URL and a clip as `{ data, format }`. An image costs
  about 600 input tokens whatever its resolution.
- **The model hears the first 30 seconds of a clip**, at about 25 input tokens a
  second, and drops the rest without a word. A WAV, FLAC or Ogg (Opus or Vorbis)
  clip that runs longer is refused before any request, its length read from the
  file; an MP3's length is not read, so only its first 30 seconds count.
  **AAC/M4A is refused**: it was
  measured decoding to nothing while the request was still answered. A WAV
  without a complete `fmt` and `data` chunk is refused as well.
- **The whole request body may be at most 25 MB** (the server's own cap is
  24 MiB). The limit applies to the encoded body, so the base64 form counts. A
  file over the limit is refused from its size, before it is read.
- **What can be checked locally is refused before any request**, as a
  non-retryable `invalid_request`: a missing file, a directory, an empty Buffer
  or file, bytes that are not a recognised image or clip, a remote URL or any
  other URL scheme, more than one image, a video, a clip that is too long, or a
  body over 25 MB. An image or clip with the right signature that the model
  cannot decode is sent, and the server's refusal (a 502 wrapping the backend's 400) comes back as `invalid_request`, not retried.
- **The result carries `mediaBytes`**, the encoded size of the media sent. The
  `decide` spans carry `decision.images.count`, `decision.audio.count` and
  `decision.media.bytes`, and
  never any base64.

---

## When NeuroLink uses it

Every built-in consumer of `decide` — model routing, relevance-driven
compaction, tool routing and RAG planning — asks for the default decision
provider. That is the first one that is configured, in the environment or in the
`credentials` passed to the SDK, in the order TypeSafe, Laya, XOR,
[SubQ](subq.md), [Perplexity](perplexity-decider.md), [Cloudflare Clef](cloudflare-clef.md),
[OpenAI Decisions](openai-decisions.md), then [ScaleDown](scaledown.md). TypeSafe counts with either of its keys,
`TYPESAFE_API_KEY` or `AI_GATEWAY_API_KEY`. Laya and XOR each count only with
both their key and their base URL. SubQ counts with its key alone. Perplexity
counts with its key alone, which is shared with Perplexity's text provider. Cloudflare Clef counts only with both
`CLOUDFLARE_API_KEY` and `CLOUDFLARE_ACCOUNT_ID`, the same two variables the
Workers AI text provider reads. OpenAI Decisions counts with its key alone,
`OPENAI_API_KEY`, which the OpenAI chat provider reads too. ScaleDown counts with
its key alone, `SCALEDOWN_API_KEY`, which no other provider reads. A caller can
always name XOR with `provider: "xor"`. So:

- **A TypeSafe key, or Laya's key and base URL, plus XOR's key and base URL:**
  built-in features use TypeSafe or Laya, in that order; XOR runs only where a
  caller asks for `provider: "xor"`.
- **XOR's key and base URL, plus `SUBQ_API_KEY`:** built-in features use XOR;
  SubQ runs only where a caller asks for `provider: "subq"`.
- **XOR's key and base URL, plus `SCALEDOWN_API_KEY`:** built-in features use XOR;
  ScaleDown runs only where a caller asks for `provider: "scaledown"`.
- **XOR's key and base URL, plus a Perplexity key:** built-in features use XOR;
  Perplexity runs only where a caller asks for
  `provider: "perplexity-decider"`.
- **XOR's key and base URL, plus `CLOUDFLARE_API_KEY` and
  `CLOUDFLARE_ACCOUNT_ID`:** built-in features use XOR; Cloudflare Clef runs
  only where a caller asks for `provider: "cloudflare-clef"`.
- **Only XOR's key and base URL:** built-in features use XOR.
- **An XOR key with no base URL:** XOR is not configured. Built-in features
  ignore it, and `provider: "xor"` fails with `XOR requires a base URL`.
- **None of TypeSafe, Laya, XOR, SubQ, Perplexity, Cloudflare Clef, OpenAI
  Decisions or ScaleDown:** everything behaves exactly as it did without a decision model.

---

## Limits

The figures below were measured through a LiteLLM gateway in October 2026.

**Each model has its own window.** `xor-latest` read a needle at the end of
120,076 input tokens and refused 200,076 as longer than its 131,072-token
context; `xor-omni` refuses past 32,768. NeuroLink allows 120,000 estimated
tokens of state on `xor-latest` and 28,000 on `xor-omni` (and on any other model
name), leaving room for the questions, an image and a clip, and refuses more
before any network call, with `max_tokens_exceeded`. The size is an estimate,
not XOR's tokenizer: about four characters per token for ASCII text, and one
token per character for other scripts. It over-counts English prose, and
under-counts dense JSON and digits, so a dense state estimated under the limit
can still be longer than the server's context.

A state near the limit can therefore still be refused by the server as too long.
A 413, or a 5xx other than 503 whose message says the context was too long,
arrives as `max_tokens_exceeded` and is not retried; every other reply is
classified as in the Errors table below. Built-in consumers treat a refusal as
"carry on as before".

**A proxy may cap parallel requests.** On that route the key allowed 5 at a
time. After a burst of rejected requests (403 and 422 replies), every request
was answered 429 for about half an hour. That order was observed; the rejected
requests were not confirmed as the cause. NeuroLink retries a 429 once.

**128 questions per request.** The gateway refuses more, so `decide()` refuses
a longer map before any request, and `tryDecide()` (what every built-in consumer
uses) splits it into batches of 128 and joins the answers. A `choice` takes 2 to
64 options, counting `unknown` (64 plus `unknown` crashed the server with a 500),
and a `score` 2 to 10 levels (the gateway refuses 11); past either cap the
request is refused before any request, as `invalid_request`. Score levels must
be strings, objects or lists: numbers are refused by the gateway. A level that is
not a string comes back in the answer's `legend` as its JSON text.

**The timeout grows with the state.** 5 seconds, plus 150 ms for every full
1,000 estimated tokens of state, because a 120,000-token state took about 18
seconds to answer. Override it per call with `timeoutMs`, or with `--timeout` on
the CLI.

---

## Errors

| Reply                                                        | Kind                                                      | Retried   |
| ------------------------------------------------------------ | --------------------------------------------------------- | --------- |
| 401                                                          | `authentication` — the provider instance stops retrying   | no        |
| 403 / 402                                                    | `invalid_request` — fixable; the instance is not disabled | no        |
| 413, or a 5xx other than 503 saying the context was exceeded | `max_tokens_exceeded`                                     | no        |
| a 5xx wrapping the backend's 4xx (`backend 400: …`)          | `invalid_request` — an image or clip it could not open    | no        |
| any other 4xx (for example 422, 404)                         | `invalid_request`                                         | no        |
| 429                                                          | `rate_limit`                                              | yes, once |
| 503                                                          | `overloaded`                                              | yes, once |
| other 5xx                                                    | `server`                                                  | yes, once |
| state over the window (local)                                | `max_tokens_exceeded`, with no network call               | no        |
| unusable media, or a question it cannot answer (local)       | `invalid_request`, with no network call                   | no        |
| no base URL configured (local)                               | `invalid_request`, with no network call                   | no        |

A 403 or 402 is deliberately not `authentication`. On a LiteLLM proxy a 403
means the key's team does not allow the model you asked for
(`team_model_access_denied`), and
a 402 means the team has no budget. An admin can fix either, so the provider
instance keeps working once it is fixed and is not disabled. A 401 does disable
the instance: it stops sending requests after the first rejection, because a bad
key does not fix itself.

"Unusable media" covers a missing file, a directory, an empty Buffer or file,
something that is not an image or a recognised clip, a remote URL, more than one
image, any video, a clip over 30 seconds or in AAC/M4A, and a request body over
25 MB. "A question it cannot answer" is a choice or score past its cap, or a
choice naming an option `unknown` beside `unknown: true`.

A proxy's error text can echo the key and the request. Before a message reaches
a log or an error, the provider removes the configured key, anything shaped like
a LiteLLM key, long hex runs, embedded `data:` URLs, the request content pydantic
quotes back (`input_value=…`) and LiteLLM's table of fallback model groups.

---

## Troubleshooting

- **`XOR requires a base URL`** — set `XOR_BASE_URL`, or pass
  `credentials.xor.baseURL`. There is no default endpoint.
- **`The XOR base URL must not carry credentials…`** — the base URL has a user
  name, a password, a query string or a fragment. Set it to the origin only, for
  example `https://your-proxy.example.com`, and give the key through
  `XOR_API_KEY` or `credentials.xor.apiKey`.
- **`The XOR base URL must start with https:// or http://`** — the value has no
  scheme (for example `xor.internal:8080`) or uses another scheme. Add
  `https://`, or `http://` for a server on this machine.
- **`The XOR base URL must use https:// unless it points at this machine`** — the
  value is an `http://` URL whose host is not `localhost`, `127.0.0.1` or `[::1]`.
  A plain-http request would send the key and the state unencrypted. Put an
  `https://` front on the deployment, or reach it through a port-forward to
  `localhost`.
- **`XOR answered with a redirect`** — the endpoint replied 301, 302, 307 or 308.
  The provider does not follow it and does not retry. Set the base URL to the
  address the redirect leads to.
- **`The XOR base URL is not a valid absolute URL`** — the value cannot be
  parsed as a URL. Set it to an absolute origin.
- **`XOR requires an API key`** — set `XOR_API_KEY`, or pass
  `credentials.xor.apiKey`.
- **A 401** — the endpoint rejected the key. The provider instance stops
  retrying after a rejection, so fix the key and construct a new one.
- **A 403 with `team_model_access_denied`** — the LiteLLM proxy's team for this
  key does not allow the model you asked for (`XOR_MODEL`, or `xor-latest` by
  default; `xor-omni` for media). Add the model to the team; the instance works again without a
  restart.
- **`max_tokens_exceeded`** — the state is over the model's window (120,000
  estimated tokens on `xor-latest`, 28,000 on `xor-omni`), the request has more
  than 128 questions, or the state, the questions and the media together are
  more than the model's context. Shorten the state, or use `tryDecide()` to split
  the questions.
- **`XOR cannot answer question "…"`** — a choice with more than 64 options
  (counting `unknown`), a score with more than 10 levels, or a choice naming an
  option `unknown` beside `unknown: true`.
- **`XOR does not accept video`** — see [Images, audio and video](#images-audio-and-video).
  Send frames as images instead, one per request.
- **Images seem to be ignored** — a deployment started without
  `OPENJEV_IMAGES=1` answers 200 and silently ignores images, and NeuroLink
  cannot detect that. Send a red image and a blue image and check that the two
  answers differ.
- **Built-in routing never uses XOR** — a TypeSafe key, or Laya's key and base
  URL, is also set and takes precedence, or XOR has no base URL.

---

## See also

- [TypeSafe (Jev) Provider Guide](typesafe.md)
- [Laya Provider Guide](laya.md)
- [Perplexity Decisions Provider Guide](perplexity-decider.md)
- [Cloudflare Clef Provider Guide](cloudflare-clef.md)
- [SubQ Provider Guide](subq.md)
- [OpenAI Decisions Provider Guide](openai-decisions.md)
- [ScaleDown Provider Guide](scaledown.md)
- [The `decide` inference type](../../features/decide-inference-type.md)
- [XOR on Hugging Face](https://huggingface.co/juspay/xor)
