---
title: XOR Provider Guide
description: An open-weights decision provider that also reads images and video — typed, calibrated judgments from Juspay's XOR, at any deployment or LiteLLM proxy route you configure
keywords: xor, decide, decision model, open weights, images, video, litellm, calibrated confidence, system one
---

# XOR Provider Guide

**A provider of `decide`** — the same typed `boolean` / `choice` /
`score` answers as [TypeSafe's Jev](typesafe.md) and [Laya](laya.md), from
Juspay's open-weights model, and the one that also reads images and a video. It
emits no text at all.

---

## Overview

XOR is Juspay's Apache-2.0 decision model, post-trained from Qwen3.6-35B-A3B;
its model id is `xor-1.1`. You send one `state` plus named, typed questions, and
optionally images or a video. XOR answers every question in a single batched
pass and returns a typed answer for each. NeuroLink calls whatever base URL you
configure — a deployment of the model, or a LiteLLM proxy with a route to one.
There is no built-in endpoint. The weights and setup instructions are at
[huggingface.co/juspay/xor](https://huggingface.co/juspay/xor).

### Key Facts

|                       |                                                                      |
| --------------------- | -------------------------------------------------------------------- |
| Inference type        | `decide` only                                                        |
| Model                 | `xor-1.1` by default; `XOR_MODEL` overrides it                       |
| Media                 | up to 8 images and one video; the whole request body at most 8 MB    |
| Input window          | about 200,000 estimated tokens of state                              |
| Questions per request | no cap in NeuroLink; a `choice` or `score` takes 2 to 255 options    |
| Endpoint              | `<base URL>/v1/systemone`; the base URL is required, with no default |
| Precedence            | used automatically only when TypeSafe and Laya are not configured    |

---

## Quick Start

### 1. Get an endpoint and a key

Run a deployment of XOR (see
[huggingface.co/juspay/xor](https://huggingface.co/juspay/xor)), or use a
LiteLLM proxy with a route to one. NeuroLink posts to `<base URL>/v1/systemone`.
The base URL is the origin of the deployment or of the proxy route, and a
trailing `/v1` is accepted. On a LiteLLM proxy the key's team must be allowed
the `xor-1.1` model; otherwise the proxy answers 403 `team_model_access_denied`.

### 2. Configure

Both the base URL and the key are required. Set them in the environment:

```bash
export XOR_BASE_URL=https://your-proxy.example.com  # NeuroLink calls <base>/v1/systemone
export XOR_API_KEY=sk-...                           # the key your endpoint accepts
export XOR_MODEL=xor-1.1                            # optional
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

## Images and video

XOR reads images and one video alongside the `state`. TypeSafe and Laya do not.

```typescript
import { readFile } from "node:fs/promises";
import {
  NeuroLink,
  readDecisionBoolean,
  readDecisionChoice,
} from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Images: any mix of a file path, a Buffer and a data: URL
const photo = await neurolink.decide({
  provider: "xor",
  state: "A product photo from a listing.",
  images: ["./front.png", await readFile("./back.jpg")],
  questions: {
    color: {
      type: "choice",
      instructions: "What color is the product?",
      criteria: { red: "Mostly red", blue: "Mostly blue" },
    },
  },
});
const color = readDecisionChoice(photo.answers, "color");
console.log(photo.mediaBytes); // encoded size of the images sent

// A video, in a request of its own
const clip = await neurolink.decide({
  provider: "xor",
  state: "A clip from a doorbell camera.",
  video: "./clip.mp4",
  questions: {
    person: { type: "boolean", instructions: "Is a person in view?" },
  },
});
const person = readDecisionBoolean(clip.answers, "person");
```

From the CLI, pass `--image <path>` (repeatable) and `--video <path>`:

```bash
neurolink decide "A product photo from a listing." --provider xor \
  --image ./front.png --image ./back.jpg \
  --questions '{"color":{"type":"choice","instructions":"What color is the product?","criteria":{"red":"Mostly red","blue":"Mostly blue"}}}'
```

The rules:

- **Up to 8 images and one video** per request, in `images` and `video`.
- **Each is a Buffer, a local file path or a `data:` URL.** An `http(s)` URL is
  refused: NeuroLink does not fetch media for you.
- **The type comes from the bytes, not the file extension**: PNG, JPEG, WebP
  and GIF images, and MP4, MOV and WebM video. NeuroLink
  sends a Buffer or a file to XOR as a `data:` URL. A `data:` URL you pass
  yourself must hold base64 image or video content, and is sent as given.
- **The whole request body may be at most 8 MB.** The limit applies to the
  encoded body, so the base64 form counts, not the size of the files on disk. A
  file over the limit is refused from its size, before it is read.
- **What can be checked locally is refused before any request**, as a
  non-retryable `invalid_request`: a missing file, a directory, an empty Buffer
  or file, bytes that are not a recognised image or video, a remote URL or any
  other URL scheme, a string that is not a path or a `data:` URL, more than 8
  images, or a body over 8 MB. Bytes with the right signature that the model
  cannot decode are sent, and the server's refusal comes back as a `server`
  error, retried once.
- **TypeSafe and Laya refuse media too**, before any request, and the error
  names the providers that accept it.
- **Images and a video can be sent together** (up to 8 images and one video),
  but the model does not reliably tell the two apart.
- **The result carries `mediaBytes`**, the encoded size of the media sent. The
  `decide` spans carry `decision.images.count` and `decision.media.bytes`, and
  never any base64.

---

## When NeuroLink uses it

Every built-in consumer of `decide` — model routing, relevance-driven
compaction, tool routing and RAG planning — asks for the default decision
provider. That is the first one that is configured, in the environment or in the
`credentials` passed to the SDK, in the order TypeSafe, Laya, XOR. TypeSafe
counts with either of its keys, `TYPESAFE_API_KEY` or `AI_GATEWAY_API_KEY`. Laya
and XOR each count only with both their key and their base URL. A caller can
always name XOR with `provider: "xor"`. So:

- **A TypeSafe key, or Laya's key and base URL, plus XOR's key and base URL:**
  built-in features use TypeSafe or Laya, in that order; XOR runs only where a
  caller asks for `provider: "xor"`.
- **Only XOR's key and base URL:** built-in features use XOR.
- **An XOR key with no base URL:** XOR is not configured. Built-in features
  ignore it, and `provider: "xor"` fails with `XOR requires a base URL`.
- **None of them:** everything behaves exactly as it did without a decision
  model.

---

## Limits

**The window is large, but shared.** NeuroLink allows about 200,000 estimated
tokens of state, and refuses more before any network call, with
`max_tokens_exceeded`. The size is an estimate, not XOR's tokenizer: about four
characters per token for ASCII text, and one token per character for other
scripts, which errs toward refusing. The 200,000 figure is a conservative
default under the deployment's 250,000-token prefill, and that prefill is shared
by the state, the questions and any media. It has not been measured against a
live deployment. A state near the limit, or a lot of media, can therefore still
be refused by the server as too long. That arrives as `max_tokens_exceeded`
(not retried) when the status is 413 or the message says the context was too
long, and otherwise as `server` (retried once). Built-in consumers treat a
refusal as "carry on as before".

**No question cap.** NeuroLink sets none. A `choice` or `score` takes 2 to 255
options, which the server enforces.

**The default timeout is 5 seconds.** Override it per call with `timeoutMs`, or
with `--timeout` on the CLI.

---

## Errors

| Reply                                                        | Kind                                                      | Retried   |
| ------------------------------------------------------------ | --------------------------------------------------------- | --------- |
| 401                                                          | `authentication` — the provider instance stops retrying   | no        |
| 403 / 402                                                    | `invalid_request` — fixable; the instance is not disabled | no        |
| 413, or a 5xx other than 503 saying the context was exceeded | `max_tokens_exceeded`                                     | no        |
| any other 4xx (for example 422, 404)                         | `invalid_request`                                         | no        |
| 429                                                          | `rate_limit`                                              | yes, once |
| 503                                                          | `overloaded`                                              | yes, once |
| other 5xx                                                    | `server`                                                  | yes, once |
| state over the window (local)                                | `max_tokens_exceeded`, with no network call               | no        |
| unusable media (local)                                       | `invalid_request`, with no network call                   | no        |
| no base URL configured (local)                               | `invalid_request`, with no network call                   | no        |

A 403 or 402 is deliberately not `authentication`. On a LiteLLM proxy a 403
means the key's team does not allow `xor-1.1` (`team_model_access_denied`), and
a 402 means the team has no budget. An admin can fix either, so the provider
instance keeps working once it is fixed and is not disabled. A 401 does disable
the instance: it stops sending requests after the first rejection, because a bad
key does not fix itself.

"Unusable media" covers a missing file, a directory, an empty Buffer or file,
something that is not an image or a video, a remote URL, more than 8 images and
a request body over 8 MB.

A proxy's error text can echo the key. Before a message reaches a log or an
error, the provider removes the configured key, anything shaped like a LiteLLM
key, long hex runs and embedded `data:` URLs.

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
  `https://` or `http://`.
- **`The XOR base URL is not a valid absolute URL`** — the value cannot be
  parsed as a URL. Set it to an absolute origin.
- **`XOR requires an API key`** — set `XOR_API_KEY`, or pass
  `credentials.xor.apiKey`.
- **A 401** — the endpoint rejected the key. The provider instance stops
  retrying after a rejection, so fix the key and construct a new one.
- **A 403 with `team_model_access_denied`** — the LiteLLM proxy's team for this
  key does not allow `xor-1.1`. Add the model to the team; the instance works
  again without a restart.
- **`max_tokens_exceeded`** — the state is over about 200,000 estimated tokens,
  or the state, the questions and the media together are more than the
  deployment's prefill. Shorten the state, or send fewer or smaller images or a
  shorter video.
- **Images seem to be ignored** — a deployment started without
  `OPENJEV_IMAGES=1` answers 200 and silently ignores images, and NeuroLink
  cannot detect that. Send a red image and a blue image and check that the two
  answers differ. Video is not affected.
- **Built-in routing never uses XOR** — a TypeSafe key, or Laya's key and base
  URL, is also set and takes precedence, or XOR has no base URL.

---

## See also

- [TypeSafe (Jev) Provider Guide](typesafe.md)
- [Laya Provider Guide](laya.md)
- [The `decide` inference type](../../features/decide-inference-type.md)
- [XOR on Hugging Face](https://huggingface.co/juspay/xor)
